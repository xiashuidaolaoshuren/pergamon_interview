import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractPages } from "./pdf.js";

describe("extractPages error mapping", () => {
  it("maps empty TXT to a typed empty error", async () => {
    await expect(
      extractPages({
        id: "empty",
        filename: "empty.txt",
        mediaType: "text/plain",
        buffer: Buffer.from("   \n  "),
      }),
    ).rejects.toMatchObject({ code: "empty" });
  });

  it("maps image-only PDFs to a typed image-only error", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const buffer = Buffer.from(await pdf.save());

    await expect(
      extractPages({
        id: "blank",
        filename: "blank.pdf",
        mediaType: "application/pdf",
        buffer,
      }),
    ).rejects.toMatchObject({ code: "image-only" });
  });
});
