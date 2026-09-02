import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runExtraction } from "./pipeline.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/insufficient",
);

describe("runExtraction insufficient coverage", () => {
  it("opens insufficient when thin marketing uploads yield no essential candidates", async () => {
    const transport = vi.fn(async () => JSON.stringify({ candidates: [] }));

    const result = await runExtraction({
      mode: "live",
      uploads: [
        {
          id: "thin-lifestyle-flyer",
          filename: "thin-lifestyle-flyer.txt",
          mediaType: "text/plain",
          buffer: readFileSync(join(fixtureDir, "thin-lifestyle-flyer.txt")),
        },
        {
          id: "thin-trade-show-card",
          filename: "thin-trade-show-card.pdf",
          mediaType: "application/pdf",
          buffer: readFileSync(join(fixtureDir, "thin-trade-show-card.pdf")),
        },
      ],
      transport,
      apiKey: "test-key",
    });

    expect(result.coverage).toBe("insufficient");
    expect(result.counts.extracted).toBe(0);
    expect(transport).toHaveBeenCalledOnce();
  });
});
