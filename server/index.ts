import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { loadEnvFile } from "./env.js";
import { createApp } from "./http.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(join(rootDir, ".env.local"));

const fixtureDir = join(rootDir, "fixtures/kettle");

const app = createApp({
  fixtureDir,
  apiKey: process.env.OPENROUTER_API_KEY,
});

const port = Number(process.env.PORT) || 8787;

const server = serve({
  fetch: app.fetch,
  port,
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. On Windows, find the process with:\n` +
        `  netstat -ano | findstr :${port}\n` +
        "Then stop it with:\n" +
        "  taskkill /PID <pid> /F",
    );
    process.exit(1);
  }

  throw error;
});

console.log(`EvidenceReady server listening on http://localhost:${port}`);

function shutdown(signal: string): void {
  console.log(`\n${signal} received, shutting down...`);
  server.close((closeError) => {
    if (closeError) {
      console.error(closeError);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
