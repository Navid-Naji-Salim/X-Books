import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const requireUser: RequestHandler = (req, res, next) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Login is required." });
    return;
  }

  try {
    jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired." });
  }
};
