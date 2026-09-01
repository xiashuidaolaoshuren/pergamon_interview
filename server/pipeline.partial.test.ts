import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { runExtraction } from "./pipeline.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/kettle",
);

describe("runExtraction partial failure", () => {
  it("retains facts from successful uploads and reports failedSources", async () => {
    const extraction = readFileSync(join(fixtureDir, "recorded-extraction.json"), "utf8");
    const pdf = await PDFDocument.create();
    pdf.addPage();

    const result = await runExtraction({
      mode: "live",
      uploads: [
        {
          id: "ARK-1500_supplier-specification",
          filename: "ARK-1500_supplier-specification.txt",
          mediaType: "text/plain",
          buffer: readFileSync(
            join(fixtureDir, "ARK-1500_supplier-specification.txt"),
          ),
        },
        {
          id: "blank",
          filename: "blank.pdf",
          mediaType: "application/pdf",
          buffer: Buffer.from(await pdf.save()),
        },
      ],
      transport: vi.fn(async () => extraction),
      apiKey: "test-key",
    });

    expect(result.failedSources).toEqual([
      expect.objectContaining({
        filename: "blank.pdf",
        code: "image-only",
      }),
    ]);
    expect(result.dossier.find((field) => field.key === "product-name")?.status).toBe(
      "confirmed",
    );
  });

  it("retains facts when a corrupt PDF fails and reports failedSources", async () => {
    const extraction = readFileSync(join(fixtureDir, "recorded-extraction.json"), "utf8");

    const result = await runExtraction({
      mode: "live",
      uploads: [
        {
          id: "ARK-1500_supplier-specification",
          filename: "ARK-1500_supplier-specification.txt",
          mediaType: "text/plain",
          buffer: readFileSync(
            join(fixtureDir, "ARK-1500_supplier-specification.txt"),
          ),
        },
        {
          id: "corrupt",
          filename: "corrupt.pdf",
          mediaType: "application/pdf",
          buffer: Buffer.from("not a pdf"),
        },
      ],
      transport: vi.fn(async () => extraction),
      apiKey: "test-key",
    });

    expect(result.failedSources).toEqual([
      expect.objectContaining({
        filename: "corrupt.pdf",
        code: "corrupt",
      }),
    ]);
    expect(result.dossier.find((field) => field.key === "product-name")?.status).toBe(
      "confirmed",
    );
  });
});
