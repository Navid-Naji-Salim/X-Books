import { spawnSync } from "node:child_process";

const backendIsHealthy = async () => {
  try {
    const response = await fetch("http://127.0.0.1:3000/api/health", { signal: AbortSignal.timeout(1500) });
    const payload = await response.json();
    return response.ok && payload.status === "ok";
  } catch {
    return false;
  }
};

if (await backendIsHealthy()) {
  console.log("X Books backend is already running on http://127.0.0.1:3000");
  process.exit(0);
}

const npm = "npm";
const started = spawnSync(npm, ["run", "dev", "--workspace", "backend"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (started.error) {
  console.error("Unable to start the X Books backend:", started.error.message);
  process.exit(1);
}

process.exit(started.status ?? 1);
