import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";

// Prisma Dev's local PostgreSQL proxy is most reliable with one shared TCP
// connection. Serializing through this pool prevents concurrent workspace
// requests from terminating one another mid-query.
const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 0,
  keepAlive: true,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
