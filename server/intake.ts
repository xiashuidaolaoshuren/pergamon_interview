import type { PipelineUpload } from "./pipeline.js";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_COUNT = 3;

export interface IntakeValidationError {
  code: "invalid-intake";
  message: string;
}

function isAcceptedUpload(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".txt");
}

export function validateIntakeUploads(
  uploads: PipelineUpload[],
): IntakeValidationError | null {
  if (uploads.length === 0) {
    return {
      code: "invalid-intake",
      message: "At least one file is required.",
    };
  }
  if (uploads.length > MAX_UPLOAD_COUNT) {
    return {
      code: "invalid-intake",
      message: `No more than ${MAX_UPLOAD_COUNT} files are allowed.`,
    };
  }
  for (const upload of uploads) {
    if (upload.buffer.byteLength > MAX_UPLOAD_BYTES) {
      return {
        code: "invalid-intake",
        message: `File ${upload.filename} exceeds the 10 MB limit.`,
      };
    }
    if (!isAcceptedUpload(upload.filename)) {
      return {
        code: "invalid-intake",
        message: `Unsupported file type for ${upload.filename}. Use PDF or TXT.`,
      };
    }
  }
  return null;
}
