import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractionResponseSchema } from "../../src/domain/schemas.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));

function loadRecordedExtraction(): unknown {
  const raw = readFileSync(
    join(fixtureDir, "recorded-extraction.json"),
    "utf8",
  );
  return JSON.parse(raw);
}

interface RecordedPages {
  documents: Array<{
    id: string;
    filename: string;
    pages: Array<{ pageNumber: number; text: string }>;
  }>;
}

function loadRecordedPages(): RecordedPages {
  const raw = readFileSync(join(fixtureDir, "recorded-pages.json"), "utf8");
  return JSON.parse(raw) as RecordedPages;
}

function pageText(documents: RecordedPages, id: string, pageNumber: number): string {
  const doc = documents.documents.find((item) => item.id === id);
  const page = doc?.pages.find((item) => item.pageNumber === pageNumber);
  if (!page) throw new Error(`Missing page ${pageNumber} for ${id}`);
  return page.text;
}

describe("recorded extraction fixture", () => {
  it("parses with extractionResponseSchema", () => {
    const parsed = extractionResponseSchema.parse(loadRecordedExtraction());
    expect(parsed.candidates.length).toBeGreaterThan(0);
    for (const candidate of parsed.candidates) {
      expect(candidate.fieldKey).toBeTruthy();
      expect(candidate.document).toBeTruthy();
      expect(typeof candidate.page).toBe("number");
      expect(candidate.quote).toBeTruthy();
    }
  });
});

describe("recorded extraction missing-quote", () => {
  it("rejects a candidate missing quote", () => {
    const raw = loadRecordedExtraction() as {
      candidates: Array<Record<string, unknown>>;
    };
    const withoutQuote = {
      candidates: raw.candidates.map((candidate, index) =>
        index === 0 ? { ...candidate, quote: undefined } : candidate,
      ),
    };

    expect(() => extractionResponseSchema.parse(withoutQuote)).toThrow();
  });
});

describe("recorded pages fixture", () => {
  it("contains 1.5 L and 1.7 L on the cited pages", () => {
    const pages = loadRecordedPages();
    expect(pageText(pages, "ARK-1500_supplier-specification", 2)).toContain("1.5 L");
    expect(pageText(pages, "ARK-1500_draft-manual", 2)).toContain("1.7 L");
  });

  it("mirrors the TXT page bodies", () => {
    const pages = loadRecordedPages();
    expect(pages.documents[0]?.pages).toHaveLength(3);
    expect(pages.documents[1]?.pages).toHaveLength(4);

    const specTxt = readFileSync(
      join(fixtureDir, "ARK-1500_supplier-specification.txt"),
      "utf8",
    );
    const manualTxt = readFileSync(
      join(fixtureDir, "ARK-1500_draft-manual.txt"),
      "utf8",
    );
    const split = (raw: string) =>
      raw
        .replace(/\r\n/g, "\n")
        .split(/--- page \d+ ---/)
        .slice(1)
        .map((part) => part.replace(/^\n/, "").replace(/\s+$/, ""));

    expect(pages.documents[0]?.pages.map((page) => page.text)).toEqual(
      split(specTxt),
    );
    expect(pages.documents[1]?.pages.map((page) => page.text)).toEqual(
      split(manualTxt),
    );
  });
});

describe("fabricated rated-power quote", () => {
  it("does not appear on the cited supplier-spec page", () => {
    const pages = loadRecordedPages();
    expect(pageText(pages, "ARK-1500_supplier-specification", 2)).not.toContain("2200 W");
  });

  it("does not appear anywhere in the page corpus", () => {
    const pages = loadRecordedPages();
    for (const document of pages.documents) {
      for (const page of document.pages) {
        expect(page.text).not.toContain("2200 W");
      }
    }
  });
});

describe("kettle txt fixtures", () => {
  it("exist and contain page markers", () => {
    const spec = readFileSync(
      join(fixtureDir, "ARK-1500_supplier-specification.txt"),
      "utf8",
    );
    const manual = readFileSync(
      join(fixtureDir, "ARK-1500_draft-manual.txt"),
      "utf8",
    );
    expect(spec).toContain("--- page 1 ---");
    expect(spec).toContain("--- page 2 ---");
    expect(spec).toContain("--- page 3 ---");
    expect(manual).toContain("--- page 1 ---");
    expect(manual).toContain("--- page 2 ---");
    expect(manual).toContain("--- page 4 ---");
  });
});

describe("kettle pdf fixtures", () => {
  it("exist and are valid PDFs", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const expected = [
      ["ARK-1500_supplier-specification.pdf", 3],
      ["ARK-1500_draft-manual.pdf", 4],
    ] as const;

    for (const [filename, pageCount] of expected) {
      const bytes = readFileSync(join(fixtureDir, filename));
      expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(pageCount);
    }
  });
});

describe("importer-contact fixture", () => {
  it("has no candidate in recorded extraction", () => {
    const parsed = extractionResponseSchema.parse(loadRecordedExtraction());
    expect(
      parsed.candidates.some(
        (candidate) => candidate.fieldKey === "importer-contact",
      ),
    ).toBe(false);
  });
});

describe("recorded extraction quotes", () => {
  it("appear on the cited page except the fabricated power quote", () => {
    const pages = loadRecordedPages();
    const parsed = extractionResponseSchema.parse(loadRecordedExtraction());
    const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

    for (const candidate of parsed.candidates) {
      const cited = pageText(pages, candidate.document, candidate.page);
      if (candidate.fieldKey === "rated-power") {
        expect(collapse(cited)).not.toContain(collapse(candidate.quote));
        continue;
      }
      expect(collapse(cited)).toContain(collapse(candidate.quote));
    }
  });
});

