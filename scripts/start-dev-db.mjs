import { cp, mkdir, mkdtemp, readFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 1500, query_timeout: 1500 });
client.on("error", () => {});
let healthy = false;
try {
  await client.connect();
  await client.query("SELECT 1");
  healthy = true;
} catch {
  // Start the existing persistent database if it is not listening.
} finally {
  await client.end().catch(() => undefined);
}
if (healthy) {
  console.log("X Books database is already healthy.");
  process.exit(0);
}

try {
  // Keep local data with this checkout, independent of the launching terminal's
  // Windows profile or sandbox. Never overwrite an existing project database.
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const storageRoot = path.join(projectRoot, ".local");
  const dataRoot = path.join(storageRoot, "prisma-dev-nodejs", "Data");
  const target = path.join(dataRoot, "x-books");
  if (process.platform === "win32" && process.env.USERPROFILE && !existsSync(target)) {
    const previous = path.join(process.env.USERPROFILE, "AppData", "Local", "prisma-dev-nodejs", "Data", "x-books");
    if (existsSync(path.join(previous, ".pglite"))) {
      let oldPid;
      try { oldPid = JSON.parse(await readFile(path.join(previous, "server.json"), "utf8")).pid; } catch {}
      if (oldPid) {
        let running = false;
        try { process.kill(oldPid, 0); running = true; } catch (error) { if (error.code !== "ESRCH") throw error; }
        if (running) throw new Error("The previous X Books database is still running. Stop its terminal before moving local data.");
      }
      await mkdir(dataRoot, { recursive: true });
      const staging = await mkdtemp(path.join(dataRoot, "x-books-import-"));
      await cp(path.join(previous, ".pglite"), path.join(staging, ".pglite"), { recursive: true, errorOnExist: true, force: false });
      await rename(staging, target);
      console.log("Copied the existing X Books database into .local; the original is preserved.");
    }
  }
  if (process.platform === "win32") process.env.LOCALAPPDATA = storageRoot;
  else process.env.XDG_DATA_HOME = storageRoot;
  const { startPrismaDevServer } = await import("@prisma/dev");
  const options = {
    name: "x-books",
    persistenceMode: "stateful",
    port: 51223,
    databasePort: 51224,
    shadowDatabasePort: 51225,
    debug: process.env.X_BOOKS_DB_DEBUG === "1",
  };
  let server;
  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      server = await startPrismaDevServer(options);
      break;
    } catch (error) {
      if (error.code !== "ELOCKED" || attempt === 6) throw error;
      console.log("Waiting for the previous database lock to expire...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  console.log("X Books database is ready on port 51224.");
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try {
      await server.close();
      process.exit(0);
    } catch (error) {
      console.error("Failed to close the database:", error);
      process.exit(1);
    }
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.on("message", (message) => { if (message === "stop") void stop(); });
  if (process.send) process.on("disconnect", stop);
} catch (error) {
  console.error("Unable to start the X Books database:", error);
  process.exit(1);
}
