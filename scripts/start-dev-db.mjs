import { spawn, spawnSync } from "node:child_process";
import dotenv from "dotenv";
import path from "node:path";
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

// Prisma Dev's own --detach mode can report success on Windows even when its
// background process exits immediately. Keep this standalone database command
// attached so its process lifetime is explicit and Ctrl+C shuts it down.
const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const started = spawn(
  process.execPath,
  [prismaCli, "dev", "--name", "x-books", "--port", "51223", "--db-port", "51224", "--shadow-db-port", "51225"],
  {
    cwd: process.cwd(),
    stdio: "inherit",
  },
);
started.once("error", (error) => {
  console.error("Unable to start the local database:", error.message);
  process.exit(1);
});
started.once("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => started.kill("SIGINT"));
process.on("SIGTERM", () => started.kill("SIGTERM"));
