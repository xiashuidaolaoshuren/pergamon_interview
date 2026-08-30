import { describe, expect, it, vi } from "vitest";
import {
  extractCandidates,
  GeminiError,
  interpretAnswer,
  type GeminiTransport,
} from "./gemini.js";

const validExtraction = JSON.stringify({
  candidates: [
    {
      fieldKey: "product-name",
      value: "Acme Rapid Kettle",
      document: "supplier-spec",
      page: 1,
      quote: "Acme Rapid Kettle",
    },
  ],
});

const validInterpret = JSON.stringify({
  proposals: [
    {
      fieldKey: "importer-contact",
      proposedValue: "Acme Imports GmbH",
      answerText: "Acme Imports GmbH in Berlin",
    },
  ],
});

function transportReturning(...responses: string[]): GeminiTransport {
  const queue = [...responses];
  return vi.fn(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("unexpected transport call");
    return next;
  });
}

describe("extractCandidates", () => {
  it("parses structured extraction JSON from the transport", async () => {
    const transport = transportReturning(validExtraction);
    const result = await extractCandidates({
      prompt: "extract",
      transport,
      apiKey: "test-key",
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.fieldKey).toBe("product-name");
    expect(transport).toHaveBeenCalledOnce();
  });

  it("retries once with a schema-repair prompt when JSON is malformed", async () => {
    const transport = transportReturning("{not json", validExtraction);
    const result = await extractCandidates({
      prompt: "extract",
      transport,
      apiKey: "test-key",
    });

    expect(result.candidates).toHaveLength(1);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(String(transport.mock.calls[1]?.[0])).toContain("schema repair");
  });

  it("requires GEMINI_KEY for live calls", async () => {
    await expect(
      extractCandidates({
        prompt: "extract",
        transport: transportReturning(validExtraction),
      }),
    ).rejects.toMatchObject({
      code: "missing-key",
      envVar: "GEMINI_KEY",
    });
  });

  it("maps quota, auth, and network failures to typed errors", async () => {
    const quota = vi.fn(async () => {
      throw Object.assign(new Error("quota exceeded"), { status: 429 });
    });
    await expect(
      extractCandidates({ prompt: "extract", transport: quota, apiKey: "k" }),
    ).rejects.toMatchObject({ code: "quota" });

    const auth = vi.fn(async () => {
      throw Object.assign(new Error("unauthorized"), { status: 401 });
    });
    await expect(
      extractCandidates({ prompt: "extract", transport: auth, apiKey: "k" }),
    ).rejects.toMatchObject({ code: "auth" });

    const network = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(
      extractCandidates({ prompt: "extract", transport: network, apiKey: "k" }),
    ).rejects.toMatchObject({ code: "network" });
  });
});

describe("interpretAnswer", () => {
  it("parses structured interpret JSON from the transport", async () => {
    const transport = transportReturning(validInterpret);
    const result = await interpretAnswer({
      prompt: "interpret",
      transport,
      apiKey: "test-key",
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]?.fieldKey).toBe("importer-contact");
  });
});

describe("GeminiError", () => {
  it("names recorded mode for missing-key errors", async () => {
    try {
      await extractCandidates({
        prompt: "extract",
        transport: transportReturning(validExtraction),
      });
      expect.fail("expected missing-key error");
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiError);
      expect(String(error)).toContain("recorded");
    }
  });
});
