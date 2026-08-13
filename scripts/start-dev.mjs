import { spawn, spawnSync } from "node:child_process";
import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";

dotenv.config();

const projectRoot = process.cwd();
const prismaCli = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
const useShell = process.platform === "win32";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let databaseProcess;
let backendProcess;
let stopping = false;

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

const stop = (exitCode = 0) => {
  if (stopping) return;
  stopping = true;
  backendProcess?.kill();
  databaseProcess?.kill();
  process.exit(exitCode);
};

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

if (!(await databaseIsHealthy())) {
  spawnSync(process.execPath, [prismaCli, "dev", "stop", "x-books"], {
    cwd: projectRoot,
    stdio: "ignore",
    shell: useShell,
  });
  databaseProcess = spawn(
    process.execPath,
    [prismaCli, "dev", "--name", "x-books", "--port", "51223", "--db-port", "51224", "--shadow-db-port", "51225"],
    { cwd: projectRoot, stdio: "inherit" },
  );
  databaseProcess.once("exit", (code) => {
    databaseProcess = undefined;
    if (!stopping && backendProcess) {
      console.error("X Books database stopped unexpectedly.");
      stop(code ?? 1);
    } else if (!stopping && code && code !== 0) {
      console.error("X Books database failed to start.");
      stop(code);
    }
  });

  const startupDeadline = Date.now() + 30_000;
  while (Date.now() < startupDeadline && !(await databaseIsHealthy())) {
    await wait(500);
  }
  if (!(await databaseIsHealthy())) {
    console.error("Unable to start the local database: PostgreSQL did not become healthy within 30 seconds.");
    stop(1);
  }
}

console.log("X Books database is ready.");
backendProcess = spawn("npm", ["run", "dev", "--workspace", "backend"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: useShell,
});
backendProcess.once("exit", (code) => stop(code ?? 0));
