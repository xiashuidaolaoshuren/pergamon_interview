import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { GeminiError } from "./gemini.js";
import { createApp, MAX_UPLOAD_BYTES } from "./http.js";
import type { DossierField } from "../src/domain/types.js";
import type { RunExtractionInput, RunExtractionResult } from "./pipeline.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/kettle",
);

function sampleDossier(): DossierField[] {
  return [
    {
      key: "importer-contact",
      label: "Importer or responsible-party contact",
      group: "Identity and Responsibility",
      tier: "essential",
      valueKind: "prose",
      status: "missing",
      originalValue: null,
      normalizedValue: null,
      markers: [],
      evidence: [],
      rejectedCandidates: [],
      conflictCandidates: [],
      adjudicatedLosers: [],
      resolutionHistory: [],
    },
  ];
}

function liveExtractionResult(
  overrides: Partial<RunExtractionResult> = {},
): RunExtractionResult {
  return {
    mode: "live",
    dossier: sampleDossier(),
    rejected: [],
    coverage: "interview",
    counts: {
      extracted: 0,
      rejected: 0,
      conflicts: 0,
      missing: 1,
    },
    ...overrides,
  };
}

type ExtractResponseBody = {
  mode: string;
  dossier: Array<{ key: string; status: string }>;
  coverage: string;
  counts: { rejected: number };
  failedSources?: unknown[];
};

type InterpretResponseBody = {
  proposals: unknown[];
};

describe("POST /api/extract recorded", () => {
  it("returns dossier snapshot without GEMINI_KEY", async () => {
    delete process.env.GEMINI_KEY;
    const app = createApp({ fixtureDir });

    const response = await app.request("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fixture", mode: "recorded" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ExtractResponseBody;
    expect(body.mode).toBe("recorded");
    expect(body.dossier).toHaveLength(15);
    expect(body.coverage).toBe("interview");
    expect(body.counts.rejected).toBe(1);
    expect(body.dossier.find((field: { key: string }) => field.key === "capacity")?.status).toBe(
      "conflicting",
    );
  });
});

describe("POST /api/extract intake validation", () => {
  it("rejects unsupported type, oversize, and empty uploads before parse", async () => {
    const runExtractionFn = vi.fn();
    const app = createApp({ fixtureDir, runExtractionFn });

    const badType = await app.request("/api/extract", {
      method: "POST",
      body: (() => {
        const form = new FormData();
        form.append("files", new File(["hello"], "notes.docx", { type: "application/msword" }));
        return form;
      })(),
    });
    expect(badType.status).toBe(400);
    expect(await badType.json()).toMatchObject({
      error: { code: "invalid-intake" },
    });

    const oversize = await app.request("/api/extract", {
      method: "POST",
      body: (() => {
        const form = new FormData();
        form.append(
          "files",
          new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.pdf", {
            type: "application/pdf",
          }),
        );
        return form;
      })(),
    });
    expect(oversize.status).toBe(400);

    const none = await app.request("/api/extract", {
      method: "POST",
      body: new FormData(),
    });
    expect(none.status).toBe(400);
    expect(runExtractionFn).not.toHaveBeenCalled();
  });

  it("rejects oversize request bodies before extraction", async () => {
    const runExtractionFn = vi.fn();
    const app = createApp({
      fixtureDir,
      runExtractionFn,
      maxRequestBytes: 64,
    });

    const form = new FormData();
    form.append(
      "files",
      new File(["x".repeat(256)], "notes.txt", { type: "text/plain" }),
    );

    const response = await app.request("/api/extract", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(413);
    expect(runExtractionFn).not.toHaveBeenCalled();
  });
});

describe("POST /api/extract live missing key", () => {
  it("returns a missing-key error naming GEMINI_KEY and recorded mode", async () => {
    delete process.env.GEMINI_KEY;
    const app = createApp({ fixtureDir });

    const response = await app.request("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fixture", mode: "live" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "missing-key",
        envVar: "GEMINI_KEY",
        message: expect.stringContaining("recorded"),
      },
    });
  });
});

describe("POST /api/extract invalid request", () => {
  it("returns invalid-request for malformed JSON bodies", async () => {
    const app = createApp({ fixtureDir });

    const response = await app.request("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid-request" },
    });
  });

  it("returns invalid-request for invalid fixture JSON bodies", async () => {
    const app = createApp({ fixtureDir });

    const response = await app.request("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fixture", mode: "bogus" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid-request" },
    });
  });
});

describe("POST /api/interpret invalid request", () => {
  it("returns invalid-request for malformed JSON bodies", async () => {
    const app = createApp({ fixtureDir, apiKey: "test-key" });

    const response = await app.request("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid-request" },
    });
  });
});

describe("POST /api/extract schema failure", () => {
  it("returns a malformed error envelope when Gemini JSON is structurally invalid", async () => {
    const app = createApp({
      fixtureDir,
      apiKey: "test-key",
      transport: vi.fn(async () => JSON.stringify({ candidates: "nope" })),
    });

    const response = await app.request("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fixture", mode: "live" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "malformed" },
    });
  });
});

describe("POST /api/interpret", () => {
  it("returns proposals without writing the dossier", async () => {
    const interpretAnswerFn = vi.fn(async () => ({
      proposals: [
        {
          fieldKey: "importer-contact",
          proposedValue: "Acme Imports GmbH",
          answerText: "Acme Imports GmbH in Berlin",
        },
      ],
    }));
    const app = createApp({
      fixtureDir,
      apiKey: "test-key",
      interpretAnswerFn,
    });
    const dossier = sampleDossier();

    const response = await app.request("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldKey: "importer-contact",
        answerText: "Acme Imports GmbH in Berlin",
        dossier,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as InterpretResponseBody;
    expect(body.proposals).toHaveLength(1);
    expect(dossier[0]?.status).toBe("missing");
    expect(interpretAnswerFn).toHaveBeenCalledOnce();
  });

  it("returns a rephrase error when interpretation fails", async () => {
    const app = createApp({
      fixtureDir,
      apiKey: "test-key",
      interpretAnswerFn: vi.fn(async () => {
        throw new GeminiError("malformed", "Gemini returned malformed JSON.");
      }),
    });

    const response = await app.request("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldKey: "importer-contact",
        answerText: "???",
        dossier: sampleDossier(),
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "rephrase" },
    });
  });

  it("returns a rephrase error when Gemini JSON is structurally invalid", async () => {
    const app = createApp({
      fixtureDir,
      apiKey: "test-key",
      transport: vi.fn(async () => JSON.stringify({ proposals: "nope" })),
    });

    const response = await app.request("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldKey: "importer-contact",
        answerText: "Acme Imports GmbH in Berlin",
        dossier: sampleDossier(),
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "rephrase" },
    });
  });
});

describe("POST /api/extract multipart uploads", () => {
  it("passes all uploaded files to the pipeline", async () => {
    const runExtractionFn = vi.fn(
      async (_input: RunExtractionInput): Promise<RunExtractionResult> =>
        liveExtractionResult(),
    );
    const app = createApp({ fixtureDir, runExtractionFn, apiKey: "test-key" });

    const form = new FormData();
    form.append(
      "files",
      new File(["first"], "supplier-spec.txt", { type: "text/plain" }),
    );
    form.append(
      "files",
      new File(["second"], "draft-manual.txt", { type: "text/plain" }),
    );

    const response = await app.request("/api/extract", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    expect(runExtractionFn).toHaveBeenCalledOnce();
    const call = runExtractionFn.mock.calls[0]?.[0];
    expect(call?.uploads?.map((upload: { filename: string }) => upload.filename)).toEqual([
      "supplier-spec.txt",
      "draft-manual.txt",
    ]);
  });

  it("assigns unique ids when basenames collide across extensions", async () => {
    const runExtractionFn = vi.fn(
      async (_input: RunExtractionInput): Promise<RunExtractionResult> =>
        liveExtractionResult(),
    );
    const app = createApp({ fixtureDir, runExtractionFn, apiKey: "test-key" });

    const form = new FormData();
    form.append(
      "files",
      new File(["txt"], "supplier-spec.txt", { type: "text/plain" }),
    );
    form.append(
      "files",
      new File(["pdf"], "supplier-spec.pdf", { type: "application/pdf" }),
    );

    const response = await app.request("/api/extract", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const call = runExtractionFn.mock.calls[0]?.[0];
    expect(call?.uploads?.map((upload: { id: string; filename: string }) => upload.id)).toEqual([
      "supplier-spec",
      "supplier-spec-2",
    ]);
  });

  it("assigns basename-derived ids when filenames include path segments", async () => {
    const runExtractionFn = vi.fn(
      async (_input: RunExtractionInput): Promise<RunExtractionResult> =>
        liveExtractionResult(),
    );
    const app = createApp({ fixtureDir, runExtractionFn, apiKey: "test-key" });

    const form = new FormData();
    form.append(
      "files",
      new File(["pdf"], "dir/evil.pdf", { type: "application/pdf" }),
    );

    const response = await app.request("/api/extract", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const call = runExtractionFn.mock.calls[0]?.[0];
    expect(call?.uploads?.map((upload: { id: string }) => upload.id)).toEqual(["evil"]);
  });
});

describe("POST /api/extract partial multi-document failure", () => {
  it("includes failedSources from the pipeline in the HTTP response", async () => {
    const runExtractionFn = vi.fn(
      async (_input: RunExtractionInput): Promise<RunExtractionResult> =>
        liveExtractionResult({
          counts: {
            extracted: 1,
            rejected: 0,
            conflicts: 0,
            missing: 1,
          },
          failedSources: [
            {
              id: "blank",
              filename: "blank.pdf",
              code: "image-only",
              message: "No extractable text.",
            },
          ],
        }),
    );
    const app = createApp({ fixtureDir, runExtractionFn });

    const form = new FormData();
    form.append(
      "files",
      new File(["ok"], "supplier-spec.txt", { type: "text/plain" }),
    );

    const response = await app.request("/api/extract", {
      method: "POST",
      body: form,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ExtractResponseBody;
    expect(body.failedSources).toEqual([
      expect.objectContaining({
        filename: "blank.pdf",
        code: "image-only",
      }),
    ]);
    expect(runExtractionFn).toHaveBeenCalledOnce();
  });
});

describe("POST /api/interpret dossier validation", () => {
  it("returns invalid-request for malformed dossier members", async () => {
    const interpretAnswerFn = vi.fn();
    const app = createApp({
      fixtureDir,
      apiKey: "test-key",
      interpretAnswerFn,
    });

    const response = await app.request("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldKey: "capacity",
        answerText: "1.7 L",
        dossier: [null],
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid-request" },
    });
    expect(interpretAnswerFn).not.toHaveBeenCalled();
  });
});

describe("HTTP error envelope", () => {
  it("returns JSON internal-error when extraction throws unexpectedly", async () => {
    const app = createApp({
      fixtureDir,
      runExtractionFn: vi.fn(async () => {
        throw new Error("boom");
      }),
    });

    const response = await app.request("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fixture", mode: "recorded" }),
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toMatch(/json/);
    expect(await response.json()).toMatchObject({
      error: { code: "internal-error", message: "Unexpected server error." },
    });
  });

  it("returns JSON internal-error when recorded fixture JSON is corrupt", async () => {
    const dir = mkdtempSync(join(tmpdir(), "evidenceready-"));
    writeFileSync(join(dir, "recorded-extraction.json"), "{");
    writeFileSync(join(dir, "recorded-pages.json"), "{}");
    const app = createApp({ fixtureDir: dir });

    const response = await app.request("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fixture", mode: "recorded" }),
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toMatch(/json/);
    expect(await response.json()).toMatchObject({
      error: { code: "internal-error" },
    });
  });

  it("returns JSON internal-error when the fixture directory is missing", async () => {
    const app = createApp({
      fixtureDir: join(tmpdir(), "evidenceready-missing-fixtures"),
    });

    const response = await app.request("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fixture", mode: "recorded" }),
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toMatch(/json/);
    expect(await response.json()).toMatchObject({
      error: { code: "internal-error" },
    });
  });
});
