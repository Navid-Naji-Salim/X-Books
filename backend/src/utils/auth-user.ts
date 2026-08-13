import type { Response } from "express";
import { ApiError } from "./api-error.js";

export const authenticatedUserId = (res: Response) => {
  const userId = res.locals.userId;
  if (typeof userId !== "string" || !userId) {
    throw new ApiError(401, "Login is required.");
  }

  return userId;
};

export const authenticatedCompanyId = (res: Response) => {
  const companyId = res.locals.companyId;
  if (typeof companyId !== "string" || !companyId) {
    throw new ApiError(403, "Complete company setup before entering X Books.");
  }
  return companyId;
};
