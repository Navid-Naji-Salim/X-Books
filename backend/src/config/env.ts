import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const projectRoot = [
  process.cwd(),
  path.resolve(process.cwd(), ".."),
  path.resolve(currentDirectory, "../../.."),
  path.resolve(currentDirectory, "../../../.."),
].find((candidate) => (
  fs.existsSync(path.join(candidate, "backend", "package.json"))
  && fs.existsSync(path.join(candidate, "frontend", "package.json"))
));

if (!projectRoot) {
  throw new Error("Unable to locate the X Books project root.");
}

dotenv.config({ path: path.join(projectRoot, ".env") });

const requiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} must be set before starting the server.`);
  }

  return value;
};

export const env = {
  databaseUrl: requiredEnv("DATABASE_URL"),
  frontendPath: path.join(projectRoot, "frontend", "dist"),
  jwtSecret: process.env.JWT_SECRET
    ?? (process.env.NODE_ENV === "production" ? requiredEnv("JWT_SECRET") : "change-this-development-secret"),
  port: Number(process.env.PORT ?? 3000),
};
