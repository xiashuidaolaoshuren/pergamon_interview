// Client-side mirror of server/intake.ts validation rules.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_COUNT = 3;

function isAcceptedUpload(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".txt");
}

export function validateUploadFiles(files: File[]): string | null {
  if (files.length === 0) {
    return "At least one file is required.";
  }
  if (files.length > MAX_UPLOAD_COUNT) {
    return `No more than ${MAX_UPLOAD_COUNT} files are allowed.`;
  }
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return `File ${file.name} exceeds the 10 MB limit.`;
    }
    if (!isAcceptedUpload(file.name)) {
      return `Unsupported file type for ${file.name}. Use PDF or TXT.`;
    }
  }
  return null;
}
