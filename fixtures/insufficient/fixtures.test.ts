import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const fixtureDir = dirname(fileURLToPath(import.meta.url));

const PAIR = [
  ["thin-lifestyle-flyer.txt", "thin-lifestyle-flyer.pdf", 2],
  ["thin-trade-show-card.txt", "thin-trade-show-card.pdf", 1],
] as const;

const ESSENTIAL_TOKENS = [
  "Acme Rapid Kettle",
  "ARK-1500",
  "230 V",
  "50 Hz",
  "2200 W",
  "1.5 L",
  "1.7 L",
  "importer",
  "manufacturer",
  "rated voltage",
  "rated frequency",
  "rated power",
];

describe("insufficient-evidence txt fixtures", () => {
  it("exist with page markers and omit essential kettle facts", () => {
    for (const [txtName] of PAIR) {
      const text = readFileSync(join(fixtureDir, txtName), "utf8");
      expect(text).toContain("--- page 1 ---");
      const lower = text.toLowerCase();
      for (const token of ESSENTIAL_TOKENS) {
        expect(lower).not.toContain(token.toLowerCase());
      }
    }
  });
});

describe("insufficient-evidence pdf fixtures", () => {
  it("exist and match the TXT page counts", async () => {
    const { PDFDocument } = await import("pdf-lib");

    for (const [txtName, pdfName, pageCount] of PAIR) {
      const txt = readFileSync(join(fixtureDir, txtName), "utf8");
      const markers = [...txt.matchAll(/^--- page \d+ ---$/gm)];
      expect(markers).toHaveLength(pageCount);

      const bytes = readFileSync(join(fixtureDir, pdfName));
      expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(pageCount);
    }
  });
});
