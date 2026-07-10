import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";

// Prisma Dev's local PostgreSQL proxy is most reliable with one shared TCP
// connection. Serializing through this pool prevents concurrent workspace
// requests from terminating one another mid-query.
let pool: Pool;

const createPrismaClient = () => {
  pool = new Pool({
    connectionString: env.databaseUrl,
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
  });

  return new PrismaClient({ adapter: new PrismaPg(pool) });
};

export let prisma = createPrismaClient();

export const resetPrismaConnection = async () => {
  await prisma.$disconnect().catch(() => undefined);
  await pool.end().catch(() => undefined);
  prisma = createPrismaClient();
};
