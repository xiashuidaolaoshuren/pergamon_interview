import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultTransport,
  extractCandidates,
  interpretAnswer,
  ModelError,
  OPENROUTER_MODEL,
} from "./model.js";

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

function transportReturning(...responses: string[]) {
  const queue = [...responses];
  return vi.fn(async (_prompt: string) => {
    const next = queue.shift();
    if (next === undefined) throw new Error("unexpected transport call");
    return next;
  });
}

describe("createDefaultTransport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs OpenRouter chat completions with DeepSeek Vision Exp and json_object", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"candidates":[]}' } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const transport = createDefaultTransport("or-test-key");
    await transport("extract this dossier");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer or-test-key",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("deepseek/deepseek-v4-flash-vision-exp");
    expect(body.model).toBe(OPENROUTER_MODEL);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.reasoning).toBeUndefined();
    expect(body.messages).toEqual([
      { role: "user", content: "extract this dossier" },
    ]);
  });

  it("maps OpenRouter 402 payment required to quota", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("insufficient credits", { status: 402 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      extractCandidates({ prompt: "extract", apiKey: "or-test-key" }),
    ).rejects.toMatchObject({ code: "quota" });
  });
});

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

  it("maps structurally invalid JSON to a malformed ModelError", async () => {
    const transport = transportReturning(JSON.stringify({ candidates: "nope" }));
    await expect(
      extractCandidates({
        prompt: "extract",
        transport,
        apiKey: "test-key",
      }),
    ).rejects.toMatchObject({
      name: "ModelError",
      code: "malformed",
    });
  });

  it("requires OPENROUTER_API_KEY for live calls", async () => {
    await expect(
      extractCandidates({
        prompt: "extract",
        transport: transportReturning(validExtraction),
      }),
    ).rejects.toMatchObject({
      code: "missing-key",
      envVar: "OPENROUTER_API_KEY",
    });
  });

  it("maps unknown transport failures to upstream", async () => {
    const transport = vi.fn(async () => {
      throw new Error("model overloaded");
    });
    await expect(
      extractCandidates({ prompt: "extract", transport, apiKey: "k" }),
    ).rejects.toMatchObject({ code: "upstream" });
  });

  it("maps HTTP 5xx transport failures to upstream", async () => {
    const transport = vi.fn(async () => {
      throw Object.assign(new Error("service unavailable"), { status: 503 });
    });
    await expect(
      extractCandidates({ prompt: "extract", transport, apiKey: "k" }),
    ).rejects.toMatchObject({ code: "upstream" });
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

  it("maps structurally invalid interpret JSON to a malformed ModelError", async () => {
    const transport = transportReturning(JSON.stringify({ proposals: "nope" }));
    await expect(
      interpretAnswer({
        prompt: "interpret",
        transport,
        apiKey: "test-key",
      }),
    ).rejects.toMatchObject({
      name: "ModelError",
      code: "malformed",
    });
  });
});

describe("ModelError", () => {
  it("names recorded mode for missing-key errors", async () => {
    try {
      await extractCandidates({
        prompt: "extract",
        transport: transportReturning(validExtraction),
      });
      expect.fail("expected missing-key error");
    } catch (error) {
      expect(error).toBeInstanceOf(ModelError);
      expect(String(error)).toContain("recorded");
    }
  });
});
