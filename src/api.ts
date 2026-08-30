import type {
  DossierField,
  ExtractionMode,
  RejectedCandidate,
} from "./domain/types.js";

export interface ExtractionCounts {
  extracted: number;
  rejected: number;
  conflicts: number;
  missing: number;
}

export interface FailedSource {
  id: string;
  filename: string;
  code: string;
  message: string;
}

export interface ExtractResponse {
  mode: ExtractionMode;
  dossier: DossierField[];
  rejected: RejectedCandidate[];
  coverage: "interview" | "insufficient";
  counts: ExtractionCounts;
  failedSources?: FailedSource[];
}

export class ApiError extends Error {
  readonly code: string;
  readonly envVar?: string;

  constructor(code: string, message: string, envVar?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.envVar = envVar;
  }
}

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    envVar?: string;
  };
}

async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body.error?.code && body.error?.message) {
      return new ApiError(body.error.code, body.error.message, body.error.envVar);
    }
  } catch {
    // fall through
  }
  return new ApiError(
    "internal-error",
    "Unexpected server error.",
  );
}

async function postExtract(
  init: RequestInit,
): Promise<ExtractResponse> {
  try {
    const response = await fetch("/api/extract", init);

    if (!response.ok) {
      throw await parseApiError(response);
    }

    return response.json() as Promise<ExtractResponse>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("network", "Network request failed.");
  }
}

export async function extractFixture(
  mode: ExtractionMode,
): Promise<ExtractResponse> {
  return postExtract({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "fixture", mode }),
  });
}

export async function extractUpload(
  files: File[],
): Promise<ExtractResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  return postExtract({
    method: "POST",
    body: form,
  });
}
