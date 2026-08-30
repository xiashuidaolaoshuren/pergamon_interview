const TRANSIENT_ERROR_CODES = new Set([
  "network",
  "quota",
  "auth",
  "gemini-unavailable",
  "internal-error",
]);

const FILE_ERROR_CODES = new Set([
  "encrypted",
  "image-only",
  "empty",
  "unsupported",
  "corrupt",
  "invalid-intake",
  "payload-too-large",
  "all-sources-failed",
]);

export type ErrorRecoveryAction = "retry" | "back-to-intake" | "missing-key";

export function errorRecoveryAction(code: string): ErrorRecoveryAction {
  if (code === "missing-key") {
    return "missing-key";
  }
  if (TRANSIENT_ERROR_CODES.has(code)) {
    return "retry";
  }
  if (FILE_ERROR_CODES.has(code)) {
    return "back-to-intake";
  }
  return "retry";
}
