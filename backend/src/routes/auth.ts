import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";
import { requireUser } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import {
  createVerificationCode,
  hashVerificationCode,
  maximumVerificationAttempts,
  sendVerificationEmail,
  verificationCodeLifetimeMs,
  verificationCodeMatches,
  verificationResendCooldownMs,
} from "../services/email-verification.js";
import { ApiError } from "../utils/api-error.js";
import { authenticatedUserId } from "../utils/auth-user.js";
import { parseBody } from "../utils/request.js";
import { requiredString } from "../utils/validation.js";

export const authRouter = Router();

const createToken = (user: { id: string; email: string; name: string; role: string }) =>
  jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, env.jwtSecret, { expiresIn: "8h" });

const normalizedEmail = (value: string) => value.trim().toLowerCase();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (user: {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerifiedAt: Date | null;
  company?: { id: string; name: string } | null;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  emailVerified: Boolean(user.emailVerifiedAt),
  company: user.company ?? null,
});

const issueVerificationCode = async (user: { id: string; email: string }) => {
  const code = createVerificationCode();
  const sentAt = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCodeHash: hashVerificationCode(user.id, code),
      verificationCodeExpiresAt: new Date(sentAt.getTime() + verificationCodeLifetimeMs),
      verificationCodeSentAt: sentAt,
      verificationAttempts: 0,
    },
  });
  await sendVerificationEmail(user.email, code);
};

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const name = requiredString(body, "name");
    const email = normalizedEmail(requiredString(body, "email"));
    const password = requiredString(body, "password");
    if (name.length > 100) throw new ApiError(400, "Name must be 100 characters or fewer.");
    if (!emailPattern.test(email) || email.length > 254) throw new ApiError(400, "Enter a valid email address.");
    if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters.");
    if (password.length > 128) throw new ApiError(400, "Password must be 128 characters or fewer.");
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ApiError(409, "An account with this email already exists.");
    }

    const user = await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: "User" } });
    try {
      await issueVerificationCode(user);
    } catch (error) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw error;
    }
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      next(new ApiError(409, "An account with this email already exists."));
      return;
    }
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const email = normalizedEmail(requiredString(body, "email"));
    const password = requiredString(body, "password");
    const user = await prisma.user.findUnique({ where: { email }, include: { company: { select: { id: true, name: true } } } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, "Invalid email or password.");
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

authRouter.get("/me", requireUser, async (_req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: authenticatedUserId(res) },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!user) throw new ApiError(401, "User account no longer exists.");
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

authRouter.post("/verify-email", requireUser, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(res);
    const code = requiredString(parseBody(req), "code");
    if (!/^\d{6}$/.test(code)) throw new ApiError(400, "Enter the six-digit verification code.");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(401, "User account no longer exists.");
    if (user.emailVerifiedAt) throw new ApiError(400, "This email is already verified.");
    if (!user.verificationCodeHash || !user.verificationCodeExpiresAt) throw new ApiError(400, "Request a new verification code.");
    if (user.verificationCodeExpiresAt <= new Date()) throw new ApiError(400, "This verification code has expired. Request a new code.");
    if (user.verificationAttempts >= maximumVerificationAttempts) throw new ApiError(429, "Too many incorrect attempts. Request a new code.");
    if (!verificationCodeMatches(user.id, code, user.verificationCodeHash)) {
      await prisma.user.update({ where: { id: user.id }, data: { verificationAttempts: { increment: 1 } } });
      throw new ApiError(400, "The verification code is incorrect.");
    }
    const verifiedAt = new Date();
    const result = await prisma.user.updateMany({
      where: { id: user.id, emailVerifiedAt: null, verificationCodeHash: user.verificationCodeHash },
      data: { emailVerifiedAt: verifiedAt, verificationCodeHash: null, verificationCodeExpiresAt: null, verificationCodeSentAt: null, verificationAttempts: 0 },
    });
    if (result.count !== 1) throw new ApiError(400, "This verification code has already been used.");
    res.json({ emailVerified: true });
  } catch (error) { next(error); }
});

authRouter.post("/resend-verification", requireUser, async (_req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: authenticatedUserId(res) } });
    if (!user) throw new ApiError(401, "User account no longer exists.");
    if (user.emailVerifiedAt) throw new ApiError(400, "This email is already verified.");
    const retryAfterMs = user.verificationCodeSentAt
      ? verificationResendCooldownMs - (Date.now() - user.verificationCodeSentAt.getTime())
      : 0;
    if (retryAfterMs > 0) throw new ApiError(429, `Wait ${Math.ceil(retryAfterMs / 1000)} seconds before requesting another code.`);
    await issueVerificationCode(user);
    res.json({ sent: true, retryAfterSeconds: verificationResendCooldownMs / 1000 });
  } catch (error) { next(error); }
});

authRouter.post("/setup-company", requireUser, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(res);
    if (!res.locals.emailVerified) throw new ApiError(403, "Verify your email before setting up your company.");
    const name = requiredString(parseBody(req), "companyName");
    if (name.length > 150) throw new ApiError(400, "Company name must be 150 characters or fewer.");
    const company = await prisma.company.create({ data: { userId, name }, select: { id: true, name: true } });
    res.status(201).json({ company });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      next(new ApiError(409, "Company setup has already been completed."));
      return;
    }
    next(error);
  }
});

authRouter.delete("/account", requireUser, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(res);
    const password = requiredString(parseBody(req), "password");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, "Password is incorrect.");
    await prisma.user.delete({ where: { id: userId } });
    res.status(204).send();
  } catch (error) { next(error); }
});
