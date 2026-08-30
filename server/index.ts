import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "./http.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/kettle",
);

const app = createApp({
  fixtureDir,
  apiKey: process.env.GEMINI_KEY,
});

const port = Number(process.env.PORT) || 8787;

serve({
  fetch: app.fetch,
  port,
});

console.log(`EvidenceReady server listening on http://localhost:${port}`);
