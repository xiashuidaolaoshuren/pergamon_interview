import { GoogleGenAI } from "@google/genai";
import {
  extractionResponseSchema,
  proposalSchema,
  type ExtractionResponse,
  type ProposalResponse,
} from "../src/domain/schemas.js";

export type GeminiTransport = (prompt: string) => Promise<string>;

export type GeminiErrorCode =
  | "missing-key"
  | "quota"
  | "auth"
  | "network"
  | "malformed";

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
    "GEMINI_KEY is not configured. Use recorded extraction mode or set GEMINI_KEY.",
    "GEMINI_KEY",
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
  if (status === 429) {
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

  return new GeminiError(
    "malformed",
    error instanceof Error ? error.message : "Gemini request failed.",
  );
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
  const client = new GoogleGenAI({ apiKey });
  return async (prompt: string) => {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    return response.text ?? "";
  };
}

export async function extractCandidates(
  options: GeminiCallOptions,
): Promise<ExtractionResponse> {
  const apiKey = requireApiKey(options.apiKey ?? process.env.GEMINI_KEY);
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
  const apiKey = requireApiKey(options.apiKey ?? process.env.GEMINI_KEY);
  const transport =
    options.transport ?? createDefaultTransport(apiKey);
  const parsed = await requestStructuredJson(options.prompt, transport);
  try {
    return proposalSchema.parse(parsed);
  } catch {
    throw new GeminiError("malformed", "Gemini returned an invalid response.");
  }
}
