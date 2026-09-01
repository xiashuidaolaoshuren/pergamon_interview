import {
  extractionResponseSchema,
  proposalSchema,
  type ExtractionResponse,
  type ProposalResponse,
} from "../src/domain/schemas.js";

export const OPENROUTER_MODEL = "deepseek/deepseek-v4-flash-vision-exp";
export const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export type ModelTransport = (prompt: string) => Promise<string>;

export type ModelErrorCode =
  | "missing-key"
  | "quota"
  | "auth"
  | "network"
  | "malformed"
  | "upstream";

export class ModelError extends Error {
  readonly code: ModelErrorCode;
  readonly envVar?: string;

  constructor(code: ModelErrorCode, message: string, envVar?: string) {
    super(message);
    this.name = "ModelError";
    this.code = code;
    this.envVar = envVar;
  }
}

interface ModelCallOptions {
  prompt: string;
  transport?: ModelTransport;
  apiKey?: string;
}

function requireApiKey(apiKey: string | undefined): string {
  if (apiKey && apiKey.trim().length > 0) return apiKey.trim();
  throw new ModelError(
    "missing-key",
    "OPENROUTER_API_KEY is not configured. Use recorded extraction mode or set OPENROUTER_API_KEY.",
    "OPENROUTER_API_KEY",
  );
}

function mapTransportError(error: unknown): ModelError {
  if (error instanceof ModelError) return error;

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;

  if (status === 401 || status === 403) {
    return new ModelError("auth", "Model authentication failed.");
  }
  if (status === 402 || status === 429) {
    return new ModelError("quota", "Model quota or rate limit exceeded.");
  }
  if (error instanceof TypeError) {
    return new ModelError("network", "Model network request failed.");
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("quota") || message.includes("rate limit")) {
    return new ModelError("quota", "Model quota or rate limit exceeded.");
  }
  if (message.includes("unauthorized") || message.includes("authentication")) {
    return new ModelError("auth", "Model authentication failed.");
  }
  if (message.includes("fetch failed") || message.includes("network")) {
    return new ModelError("network", "Model network request failed.");
  }
  if (status !== undefined && status >= 500) {
    return new ModelError("upstream", "Model service request failed.");
  }

  return new ModelError("upstream", "Model service request failed.");
}

async function callTransport(
  prompt: string,
  transport: ModelTransport,
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
  transport: ModelTransport,
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
      throw new ModelError("malformed", "The model returned malformed JSON.");
    }
  }
}

export function createDefaultTransport(apiKey: string): ModelTransport {
  return async (prompt: string) => {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
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
  options: ModelCallOptions,
): Promise<ExtractionResponse> {
  const apiKey = requireApiKey(options.apiKey ?? process.env.OPENROUTER_API_KEY);
  const transport =
    options.transport ?? createDefaultTransport(apiKey);
  const parsed = await requestStructuredJson(options.prompt, transport);
  try {
    return extractionResponseSchema.parse(parsed);
  } catch {
    throw new ModelError("malformed", "The model returned an invalid response.");
  }
}

export async function interpretAnswer(
  options: ModelCallOptions,
): Promise<ProposalResponse> {
  const apiKey = requireApiKey(options.apiKey ?? process.env.OPENROUTER_API_KEY);
  const transport =
    options.transport ?? createDefaultTransport(apiKey);
  const parsed = await requestStructuredJson(options.prompt, transport);
  try {
    return proposalSchema.parse(parsed);
  } catch {
    throw new ModelError("malformed", "The model returned an invalid response.");
  }
}
