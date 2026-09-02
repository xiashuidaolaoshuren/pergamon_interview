import { readdirSync, readFileSync, writeFileSync } from "node:fs";
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

function splitTxtPages(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/--- page \d+ ---/)
    .slice(1)
    .map((part) => part.replace(/^\n/, "").replace(/\s+$/, ""));
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

const outDir = dirname(fileURLToPath(import.meta.url));
const txtFiles = readdirSync(outDir).filter((name) => name.endsWith(".txt"));

for (const filename of txtFiles) {
  const pageTexts = splitTxtPages(readFileSync(join(outDir, filename), "utf8"));
  const pdfName = filename.replace(/\.txt$/i, ".pdf");
  writeFileSync(join(outDir, pdfName), await buildPdf(pageTexts));
}
