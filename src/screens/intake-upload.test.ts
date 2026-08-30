import { describe, expect, it } from "vitest";
import { validateUploadFiles } from "./intake-upload.js";

const TEN_MB = 10 * 1024 * 1024;

function file(name: string, size = 100): File {
  return new File(["x"], name, { type: "application/octet-stream", lastModified: 0 });
}

describe("validateUploadFiles", () => {
  it("rejects when no files are selected", () => {
    expect(validateUploadFiles([])).toMatch(/at least one file/i);
  });

  it("rejects more than three files", () => {
    const files = [
      file("a.pdf"),
      file("b.pdf"),
      file("c.pdf"),
      file("d.pdf"),
    ];
    expect(validateUploadFiles(files)).toMatch(/no more than 3/i);
  });

  it("rejects files over 10 MB", () => {
    const big = file("big.pdf");
    Object.defineProperty(big, "size", { value: TEN_MB + 1 });
    expect(validateUploadFiles([big])).toMatch(/10 MB/i);
  });

  it("rejects unsupported extensions", () => {
    expect(validateUploadFiles([file("notes.docx")])).toMatch(/unsupported/i);
  });

  it("accepts valid PDF and TXT files", () => {
    expect(validateUploadFiles([file("spec.pdf"), file("manual.txt")])).toBeNull();
  });
});
