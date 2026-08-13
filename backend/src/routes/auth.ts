import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";
import { requireUser } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { passwordFromBody, validateNewPassword } from "../services/password-policy.js";
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
  company?: { id: string; name: string } | null;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  company: user.company ?? null,
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const name = requiredString(body, "name");
    const email = normalizedEmail(requiredString(body, "email"));
    const password = passwordFromBody(body);
    if (name.length > 100) throw new ApiError(400, "Name must be 100 characters or fewer.");
    if (!emailPattern.test(email) || email.length > 254) throw new ApiError(400, "Enter a valid email address.");
    await validateNewPassword(password);
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ApiError(409, "An account with this email already exists.");
    }
    const user = await prisma.user.create({ data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "User",
    } });
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
    const password = passwordFromBody(body);
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

authRouter.post("/setup-company", requireUser, async (req, res, next) => {
  try {
    const userId = authenticatedUserId(res);
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
    const password = passwordFromBody(parseBody(req));
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, "Password is incorrect.");
    await prisma.user.delete({ where: { id: userId } });
    res.status(204).send();
  } catch (error) { next(error); }
});
