import { fork, spawn, spawnSync } from "node:child_process";
import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (!existsSync(".env")) {
  writeFileSync(".env", readFileSync(".env.example", "utf8").replace("replace-with-a-long-random-secret", randomBytes(32).toString("hex")), { flag: "wx" });
}
dotenv.config();

const projectRoot = process.cwd();
const prismaCli = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let databaseProcess;
let backendProcess;
let frontendProcess;
let stopping = false;
const stopFile = path.join(projectRoot, ".local", "stop-request");
if (process.argv.includes("--background")) {
  setInterval(() => {
    if (existsSync(stopFile)) {
      unlinkSync(stopFile);
      stop(0);
    }
  }, 500);
}

const databaseIsHealthy = async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 1500, query_timeout: 1500 });
  // The embedded server may reset probes while it is still starting. pg emits
  // socket errors separately from the connect/query promise.
  client.on("error", () => {});
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
  frontendProcess?.kill();
  if (databaseProcess?.connected) {
    databaseProcess.send("stop");
    const forcedExit = setTimeout(() => { databaseProcess?.kill(); process.exit(exitCode); }, 10_000);
    databaseProcess.once("exit", () => { clearTimeout(forcedExit); process.exit(exitCode); });
  } else {
    databaseProcess?.kill();
    process.exit(exitCode);
  }
};

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

if (!(await databaseIsHealthy())) {
  databaseProcess = fork(
    path.join(projectRoot, "scripts", "start-dev-db.mjs"),
    [],
    { cwd: projectRoot, stdio: ["inherit", "inherit", "inherit", "ipc"] },
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

  const startupDeadline = Date.now() + 60_000;
  while (Date.now() < startupDeadline && !(await databaseIsHealthy())) {
    await wait(500);
  }
  if (!(await databaseIsHealthy())) {
    console.error("Unable to start the local database: PostgreSQL did not become healthy within 60 seconds.");
    stop(1);
  }
}

console.log("X Books database is ready.");
for (const args of [["generate"], ["db", "push"]]) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    stop(result.status ?? 1);
    await new Promise(() => {});
  }
}
backendProcess = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
  cwd: path.join(projectRoot, "backend"),
  stdio: "inherit",
});
backendProcess.once("error", (error) => { console.error("Unable to start backend:", error); stop(1); });
backendProcess.once("exit", (code) => stop(code ?? 0));
if (!process.argv.includes("--backend-only")) {
  frontendProcess = spawn(process.execPath, [path.join(projectRoot, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--strictPort"], {
    cwd: path.join(projectRoot, "frontend"),
    stdio: "inherit",
  });
  frontendProcess.once("error", (error) => {
    console.error("Unable to start X Books frontend:", error.message);
    stop(1);
  });
  frontendProcess.once("exit", (code) => stop(code ?? 0));
}
