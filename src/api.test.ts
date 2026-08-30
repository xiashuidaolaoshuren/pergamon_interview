import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, extractFixture, extractUpload } from "./api.js";

describe("extractFixture", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts JSON fixture body and parses success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          mode: "recorded",
          dossier: [],
          rejected: [],
          coverage: "interview",
          counts: { extracted: 0, rejected: 0, conflicts: 0, missing: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractFixture("recorded");

    expect(fetchMock).toHaveBeenCalledWith("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "fixture", mode: "recorded" }),
    });
    expect(result.mode).toBe("recorded");
    expect(result.coverage).toBe("interview");
  });

  it("rejects with ApiError on missing-key including envVar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "missing-key",
              message: "Gemini API key is not configured.",
              envVar: "GEMINI_KEY",
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(extractFixture("live")).rejects.toMatchObject({
      code: "missing-key",
      envVar: "GEMINI_KEY",
    });
    await expect(extractFixture("live")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects with ApiError on 500 internal-error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "internal-error",
              message: "Unexpected server error.",
            },
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(extractFixture("recorded")).rejects.toMatchObject({
      code: "internal-error",
    });
  });

  it("rejects with network code when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(extractFixture("recorded")).rejects.toMatchObject({
      code: "network",
    });
  });
});

describe("extractUpload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts multipart with repeated files field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          mode: "live",
          dossier: [],
          rejected: [],
          coverage: "interview",
          counts: { extracted: 0, rejected: 0, conflicts: 0, missing: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const files = [
      new File(["a"], "one.pdf", { type: "application/pdf" }),
      new File(["b"], "two.txt", { type: "text/plain" }),
    ];

    await extractUpload(files);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.getAll("files")).toHaveLength(2);
    expect((form.getAll("files")[0] as File).name).toBe("one.pdf");
    expect((form.getAll("files")[1] as File).name).toBe("two.txt");
  });
});
