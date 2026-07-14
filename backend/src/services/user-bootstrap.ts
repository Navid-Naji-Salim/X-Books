import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export const ensureUser = async () => {
  const configuredUser = await prisma.user.findUnique({
    where: { email: env.userEmail },
  });
  const legacyUser = configuredUser ?? await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  const passwordHash = await bcrypt.hash(env.userPassword, 12);
  const data = {
    email: env.userEmail,
    name: env.userName,
    passwordHash,
    role: env.userRole,
  };

  if (legacyUser) {
    await prisma.user.update({ where: { id: legacyUser.id }, data });
    console.log(`Synchronized user account for ${env.userEmail}`);
    return;
  }

  await prisma.user.create({ data });
  console.log(`Created initial user account for ${env.userEmail}`);
};
