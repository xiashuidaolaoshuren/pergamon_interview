import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_COUNT, validateIntakeUploads } from "./intake.js";

describe("validateIntakeUploads", () => {
  it("rejects empty, oversize, unsupported, and too many uploads", () => {
    expect(validateIntakeUploads([])?.message).toContain("At least one file");

    expect(
      validateIntakeUploads([
        {
          id: "big",
          filename: "big.pdf",
          mediaType: "application/pdf",
          buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
        },
      ])?.message,
    ).toContain("10 MB");

    expect(
      validateIntakeUploads([
        {
          id: "bad",
          filename: "notes.docx",
          mediaType: "application/msword",
          buffer: Buffer.from("x"),
        },
      ])?.message,
    ).toContain("Unsupported file type");

    expect(
      validateIntakeUploads(
        Array.from({ length: MAX_UPLOAD_COUNT + 1 }, (_, index) => ({
          id: `file-${index}`,
          filename: `file-${index}.txt`,
          mediaType: "text/plain",
          buffer: Buffer.from("x"),
        })),
      )?.message,
    ).toContain(String(MAX_UPLOAD_COUNT));
  });
});
