import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;

function wrapLine(text, font, maxWidth) {
  if (text.length === 0) return [""];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, FONT_SIZE) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

async function buildPdf(pageTexts) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  for (const pageText of pageTexts) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    const sourceLines = pageText.replace(/\r\n/g, "\n").split("\n");
    for (const sourceLine of sourceLines) {
      const wrapped = wrapLine(sourceLine, font, maxWidth);
      for (const line of wrapped) {
        if (y < MARGIN) break;
        if (line.length > 0) {
          page.drawText(line, {
            x: MARGIN,
            y,
            size: FONT_SIZE,
            font,
          });
        }
        y -= LINE_HEIGHT;
      }
    }
  }

  return Buffer.from(await pdf.save());
}

const corpus = JSON.parse(
  readFileSync(new URL("./recorded-pages.json", import.meta.url), "utf8"),
);
const outDir = dirname(fileURLToPath(import.meta.url));

for (const doc of corpus.documents) {
  const filename =
    doc.id === "supplier-spec" ? "supplier-spec.pdf" : "draft-manual.pdf";
  const texts = doc.pages.map((page) => page.text);
  writeFileSync(join(outDir, filename), await buildPdf(texts));
}
