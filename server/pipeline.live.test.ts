import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runExtraction } from "./pipeline.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/kettle",
);

describe("runExtraction live path", () => {
  it("wires pdf extract and mocked gemini without persisting raw uploads", async () => {
    const extraction = readFileSync(
      join(fixtureDir, "recorded-extraction.json"),
      "utf8",
    );
    const transport = vi.fn(async () => extraction);

    const supplier = readFileSync(
      join(fixtureDir, "ARK-1500_supplier-specification.txt"),
    );
    const manual = readFileSync(join(fixtureDir, "ARK-1500_draft-manual.txt"));

    const result = await runExtraction({
      mode: "live",
      uploads: [
        {
          id: "ARK-1500_supplier-specification",
          filename: "ARK-1500_supplier-specification.txt",
          mediaType: "text/plain",
          buffer: supplier,
        },
        {
          id: "ARK-1500_draft-manual",
          filename: "ARK-1500_draft-manual.txt",
          mediaType: "text/plain",
          buffer: manual,
        },
      ],
      transport,
      apiKey: "test-key",
    });

    expect(result.mode).toBe("live");
    expect(result.coverage).toBe("interview");
    expect(transport).toHaveBeenCalledOnce();
    expect(result.counts.rejected).toBe(1);
    expect(result.dossier.find((field) => field.key === "capacity")?.status).toBe(
      "conflicting",
    );
    expect(result.dossier.find((field) => field.key === "rated-power")?.status).toBe(
      "unverified",
    );
  });
});
