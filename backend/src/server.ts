import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma, prisma, resetPrismaConnection } from "./lib/prisma.js";

const withStartupTimeout = async <T>(task: Promise<T>, timeoutMs: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(
        new Error(
          "Database is not reachable. Start the development database before running the backend.",
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([task, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const initializeDatabase = async () => {
  const attempts = 12;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await withStartupTimeout(prisma.$queryRaw`SELECT 1`, 7000);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`Database connection unavailable; retrying (${attempt}/${attempts})...`);
        await resetPrismaConnection();
        await wait(1000);
      }
    }
  }

  throw lastError;
};

const startServer = async () => {
  await initializeDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`X Books is running on http://localhost:${env.port}`);
  });

  let isShuttingDown = false;
  const shutDown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`Received ${signal}; shutting down X Books.`);

    const forcedExit = setTimeout(() => {
      console.error("Graceful shutdown timed out.");
      process.exit(1);
    }, 10_000);
    forcedExit.unref();

    server.close(async (error) => {
      await disconnectPrisma();
      clearTimeout(forcedExit);

      if (error) {
        console.error("Failed to close the HTTP server cleanly.", error);
        process.exit(1);
      }

      process.exit(0);
    });
  };

  process.once("SIGTERM", shutDown);
  process.once("SIGINT", shutDown);
};

startServer().catch((error: unknown) => {
  if (
    error instanceof Error &&
    (error.message.includes("Database is not reachable") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("Connection terminated"))
  ) {
    console.error(
      [
        "Failed to initialize the server: the database is not reachable.",
        "Start the development database first:",
        "  open the X Books project directory",
        "  npm run dev:db",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.error("Failed to initialize the server.", error);
  process.exit(1);
});
