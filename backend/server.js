import { fileURLToPath } from "node:url";
import { createApp, runStartupTasks } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { attachMessageSocket } from "./realtime/messageSocket.js";

const app = createApp();

let serverInstance = null;
let messageSocket = null;

export async function ensureServer({ port = env.PORT, host = "0.0.0.0" } = {}) {
  await connectDB();
  await runStartupTasks();

  if (!serverInstance) {
    serverInstance = await new Promise((resolve, reject) => {
      const server = app.listen(port, host, () => {
        server.off("error", reject);
        resolve(server);
      });

      server.on("error", reject);
    });
    messageSocket = attachMessageSocket(serverInstance);
  }

  return serverInstance;
}

export async function closeServer() {
  if (!serverInstance) return;

  if (messageSocket) {
    await messageSocket.close();
    messageSocket = null;
  }

  await new Promise((resolve, reject) => {
    serverInstance.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  serverInstance = null;
}

async function start() {
  await ensureServer();
  console.log(`API listening on port ${env.PORT}`);
}

async function stop() {
  await closeServer();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  start().catch((err) => {
    if (err.code !== "EADDRINUSE") {
      console.error("Server start error:", err.message);
      process.exitCode = 1;
    }
  });

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

export default app;
