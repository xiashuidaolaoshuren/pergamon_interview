import {
  extractionResponseSchema,
  proposalSchema,
  type ExtractionResponse,
  type ProposalResponse,
} from "../src/domain/schemas.js";

export const GEMINI_MODEL = "google/gemini-3.7-flash";
export const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export type GeminiTransport = (prompt: string) => Promise<string>;

export type GeminiErrorCode =
  | "missing-key"
  | "quota"
  | "auth"
  | "network"
  | "malformed"
  | "upstream";

export class GeminiError extends Error {
  readonly code: GeminiErrorCode;
  readonly envVar?: string;

  constructor(code: GeminiErrorCode, message: string, envVar?: string) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.envVar = envVar;
  }
}

interface GeminiCallOptions {
  prompt: string;
  transport?: GeminiTransport;
  apiKey?: string;
}

function requireApiKey(apiKey: string | undefined): string {
  if (apiKey && apiKey.trim().length > 0) return apiKey.trim();
  throw new GeminiError(
    "missing-key",
    "OPENROUTER_API_KEY is not configured. Use recorded extraction mode or set OPENROUTER_API_KEY.",
    "OPENROUTER_API_KEY",
  );
}

function mapTransportError(error: unknown): GeminiError {
  if (error instanceof GeminiError) return error;

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;

  if (status === 401 || status === 403) {
    return new GeminiError("auth", "Gemini authentication failed.");
  }
  if (status === 402 || status === 429) {
    return new GeminiError("quota", "Gemini quota or rate limit exceeded.");
  }
  if (error instanceof TypeError) {
    return new GeminiError("network", "Gemini network request failed.");
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("quota") || message.includes("rate limit")) {
    return new GeminiError("quota", "Gemini quota or rate limit exceeded.");
  }
  if (message.includes("unauthorized") || message.includes("authentication")) {
    return new GeminiError("auth", "Gemini authentication failed.");
  }
  if (message.includes("fetch failed") || message.includes("network")) {
    return new GeminiError("network", "Gemini network request failed.");
  }
  if (status !== undefined && status >= 500) {
    return new GeminiError("upstream", "Gemini service request failed.");
  }

  return new GeminiError("upstream", "Gemini service request failed.");
}

async function callTransport(
  prompt: string,
  transport: GeminiTransport,
): Promise<string> {
  try {
    return await transport(prompt);
  } catch (error) {
    throw mapTransportError(error);
  }
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw);
}

async function requestStructuredJson(
  prompt: string,
  transport: GeminiTransport,
): Promise<unknown> {
  const first = await callTransport(prompt, transport);
  try {
    return parseJson(first);
  } catch {
    const repairPrompt = [
      prompt,
      "",
      "schema repair: return valid JSON only. Do not include markdown fences.",
    ].join("\n");
    const repaired = await callTransport(repairPrompt, transport);
    try {
      return parseJson(repaired);
    } catch {
      throw new GeminiError("malformed", "Gemini returned malformed JSON.");
    }
  }
}

export function createDefaultTransport(apiKey: string): GeminiTransport {
  return async (prompt: string) => {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        reasoning: { effort: "low" },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw Object.assign(new Error(body || response.statusText), {
        status: response.status,
      });
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content ?? "";
  };
}

export async function extractCandidates(
  options: GeminiCallOptions,
): Promise<ExtractionResponse> {
  const apiKey = requireApiKey(options.apiKey ?? process.env.OPENROUTER_API_KEY);
  const transport =
    options.transport ?? createDefaultTransport(apiKey);
  const parsed = await requestStructuredJson(options.prompt, transport);
  try {
    return extractionResponseSchema.parse(parsed);
  } catch {
    throw new GeminiError("malformed", "Gemini returned an invalid response.");
  }
}

export async function interpretAnswer(
  options: GeminiCallOptions,
): Promise<ProposalResponse> {
  const apiKey = requireApiKey(options.apiKey ?? process.env.OPENROUTER_API_KEY);
  const transport =
    options.transport ?? createDefaultTransport(apiKey);
  const parsed = await requestStructuredJson(options.prompt, transport);
  try {
    return proposalSchema.parse(parsed);
  } catch {
    throw new GeminiError("malformed", "Gemini returned an invalid response.");
  }
}
