import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export const requireUser: RequestHandler = async (req, res, next) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Login is required." });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    const userId = payload.sub?.toString();
    if (!userId) {
      res.status(401).json({ error: "Your session is invalid." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      res.status(401).json({ error: "User account no longer exists." });
      return;
    }

    res.locals.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: "Your session is invalid or has expired." });
  }
};
