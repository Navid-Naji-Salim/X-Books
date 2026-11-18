import { spawn } from "node:child_process";
import { mkdirSync, openSync, closeSync, existsSync, unlinkSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const local = path.join(root, ".local");
const pidFile = path.join(local, "app.pid");
const stopFile = path.join(local, "stop-request");
const logFile = path.join(local, "app.log");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const readPid = () => { try { return Number(readFileSync(pidFile, "utf8")); } catch { return 0; } };
const ready = async () => {
  try {
    const health = await fetch("http://127.0.0.1:3000/api/health", { signal: AbortSignal.timeout(1500) });
    const page = await fetch("http://127.0.0.1:5173", { signal: AbortSignal.timeout(1500) });
    return health.ok && (await health.json()).status === "ok" && page.ok;
  } catch { return false; }
};

mkdirSync(local, { recursive: true });
if (process.argv[2] === "stop") {
  const pid = readPid();
  if (!pid || !isAlive(pid)) { console.log("X Books is not running in the background."); process.exit(0); }
  writeFileSync(stopFile, "stop\n");
  for (let attempt = 0; attempt < 40; attempt++) {
    if (!isAlive(pid)) { if (existsSync(pidFile)) unlinkSync(pidFile); console.log("X Books stopped."); process.exit(0); }
    await wait(500);
  }
  console.error("X Books has not stopped yet. Check .local/app.log.");
  process.exit(1);
}

if (await ready()) { console.log("X Books is already running: http://localhost:5173"); process.exit(0); }
let pid = readPid();
if (!pid || !isAlive(pid)) {
  if (existsSync(stopFile)) unlinkSync(stopFile);
  const log = openSync(logFile, "a");
  const child = spawn(process.execPath, [path.join(root, "scripts", "start-dev.mjs"), "--background"], {
    cwd: root, detached: true, windowsHide: true, stdio: ["ignore", log, log],
  });
  await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
  pid = child.pid;
  writeFileSync(pidFile, String(pid));
  child.unref();
  closeSync(log);
}
for (let attempt = 0; attempt < 120; attempt++) {
  if (await ready()) { console.log("X Books is running: http://localhost:5173\nIt will keep running in the background. Stop it with npm stop."); process.exit(0); }
  if (!isAlive(pid)) break;
  await wait(500);
}
console.error("X Books did not become ready. Check .local/app.log for details.");
process.exit(1);
