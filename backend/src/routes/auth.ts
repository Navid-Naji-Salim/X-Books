import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { requireUser } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { parseBody } from "../utils/request.js";
import { requiredString } from "../utils/validation.js";

export const authRouter = Router();

const createToken = (user: { id: string; email: string; name: string; role: string }) =>
  jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, env.jwtSecret, {
    expiresIn: "8h",
  });

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const email = requiredString(body, "email").toLowerCase();
    const password = requiredString(body, "password");
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password.");
    }

    res.json({
      token: createToken(user),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireUser, async (req, res, next) => {
  try {
    const [, token] = req.headers.authorization?.split(" ") ?? [];
    const payload = jwt.verify(token ?? "", env.jwtSecret) as jwt.JwtPayload;
    const userId = payload.sub?.toString();
    if (!userId) {
      throw new ApiError(401, "Your session is invalid.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new ApiError(401, "User account no longer exists.");
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});
