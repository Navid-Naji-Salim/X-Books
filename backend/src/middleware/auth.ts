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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, emailVerifiedAt: true, company: { select: { id: true } } },
    });
    if (!user) {
      res.status(401).json({ error: "User account no longer exists." });
      return;
    }

    res.locals.userId = user.id;
    res.locals.emailVerified = Boolean(user.emailVerifiedAt);
    res.locals.companyId = user.company?.id ?? null;
    next();
  } catch {
    res.status(401).json({ error: "Your session is invalid or has expired." });
  }
};

export const requireWorkspaceUser: RequestHandler = (req, res, next) => {
  if (!res.locals.emailVerified) {
    res.status(403).json({ error: "Verify your email before entering X Books.", code: "EMAIL_VERIFICATION_REQUIRED" });
    return;
  }
  if (typeof res.locals.companyId !== "string") {
    res.status(403).json({ error: "Complete company setup before entering X Books.", code: "COMPANY_SETUP_REQUIRED" });
    return;
  }
  next();
};
