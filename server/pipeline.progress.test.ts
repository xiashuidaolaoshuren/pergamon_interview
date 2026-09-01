import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runExtraction, type ExtractionStageId } from "./pipeline.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/kettle",
);

describe("runExtraction progress", () => {
  it("emits all six stages in order on recorded run", async () => {
    const events: Array<{ stage: ExtractionStageId; status: "started" | "done" }> =
      [];

    await runExtraction({
      mode: "recorded",
      fixtureDir,
      onProgress: (stage, status) => {
        events.push({ stage, status });
      },
    });

    expect(events).toEqual([
      { stage: "read-docs", status: "started" },
      { stage: "read-docs", status: "done" },
      { stage: "model-extract", status: "started" },
      { stage: "model-extract", status: "done" },
      { stage: "validate", status: "started" },
      { stage: "validate", status: "done" },
      { stage: "verify", status: "started" },
      { stage: "verify", status: "done" },
      { stage: "reconcile", status: "started" },
      { stage: "reconcile", status: "done" },
      { stage: "coverage", status: "started" },
      { stage: "coverage", status: "done" },
    ]);
  });

  it("emits read-docs then model-extract before verify on live run", async () => {
    const extraction = readFileSync(
      join(fixtureDir, "recorded-extraction.json"),
      "utf8",
    );
    const transport = vi.fn(async () => extraction);
    const supplier = readFileSync(
      join(fixtureDir, "ARK-1500_supplier-specification.txt"),
    );
    const events: Array<{ stage: ExtractionStageId; status: "started" | "done" }> =
      [];

    await runExtraction({
      mode: "live",
      uploads: [
        {
          id: "ARK-1500_supplier-specification",
          filename: "ARK-1500_supplier-specification.txt",
          mediaType: "text/plain",
          buffer: supplier,
        },
      ],
      transport,
      apiKey: "test-key",
      onProgress: (stage, status) => {
        events.push({ stage, status });
      },
    });

    const startedStages = events
      .filter((event) => event.status === "started")
      .map((event) => event.stage);
    expect(startedStages).toEqual([
      "read-docs",
      "model-extract",
      "validate",
      "verify",
      "reconcile",
      "coverage",
    ]);
    expect(events.indexOf({ stage: "read-docs", status: "done" })).toBeLessThan(
      events.findIndex(
        (event) => event.stage === "model-extract" && event.status === "started",
      ),
    );
  });
});
