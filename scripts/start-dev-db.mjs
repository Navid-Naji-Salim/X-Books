import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const npx = "npx";
const useShell = process.platform === "win32";

const databaseIsHealthy = async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
};

if (await databaseIsHealthy()) {
  console.log("X Books database is already healthy.");
  process.exit(0);
}

// Prisma Dev can retain a process that reports `running` after its PostgreSQL
// socket has stopped accepting queries. Cycle it only in that unhealthy state;
// restarting a healthy database would invalidate the live backend connection.
spawnSync(npx, ["prisma", "dev", "stop", "x-books"], {
  cwd: process.cwd(),
  stdio: "ignore",
  shell: useShell,
});

const started = spawnSync(
  npx,
  ["prisma", "dev", "--name", "x-books", "--port", "51223", "--db-port", "51224", "--shadow-db-port", "51225", "--detach"],
  { cwd: process.cwd(), stdio: "inherit", shell: useShell },
);

if (started.error) {
  console.error("Unable to start the local database:", started.error.message);
  process.exit(1);
}

if (started.status !== 0) {
  process.exit(started.status ?? 1);
}
