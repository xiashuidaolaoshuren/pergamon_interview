import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runExtraction } from "./pipeline.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/kettle",
);

describe("runExtraction recorded replay", () => {
  it("replays bundled fixtures without OPENROUTER_API_KEY and returns dossier state", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const result = await runExtraction({
      mode: "recorded",
      fixtureDir,
    });

    expect(result.mode).toBe("recorded");
    expect(result.coverage).toBe("interview");
    expect(result.counts.extracted).toBeGreaterThan(0);
    expect(result.counts.rejected).toBe(1);

    const capacity = result.dossier.find((field) => field.key === "capacity");
    const power = result.dossier.find((field) => field.key === "rated-power");
    const importer = result.dossier.find(
      (field) => field.key === "importer-contact",
    );

    expect(capacity?.status).toBe("conflicting");
    expect(power?.status).toBe("unverified");
    expect(importer?.status).toBe("missing");
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.fieldKey).toBe("rated-power");
  });
});
