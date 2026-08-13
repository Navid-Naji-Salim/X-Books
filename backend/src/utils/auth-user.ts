import type { Response } from "express";
import { ApiError } from "./api-error.js";

export const authenticatedUserId = (res: Response) => {
  const userId = res.locals.userId;
  if (typeof userId !== "string" || !userId) {
    throw new ApiError(401, "Login is required.");
  }

  return userId;
};
