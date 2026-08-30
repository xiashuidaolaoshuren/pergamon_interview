import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvFile, parseEnvFile } from "./env.js";

describe("parseEnvFile", () => {
  it("parses KEY=value, comments, quotes, and skips blanks", () => {
    const parsed = parseEnvFile(
      [
        "# comment",
        "GEMINI_KEY=abc123",
        "",
        'QUOTED="hello world"',
        "SINGLE='quoted'",
        "INVALID_LINE",
        "PORT=8787",
      ].join("\n"),
    );

    expect(parsed).toEqual({
      GEMINI_KEY: "abc123",
      QUOTED: "hello world",
      SINGLE: "quoted",
      PORT: "8787",
    });
  });
});

describe("loadEnvFile", () => {
  const original = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key];
    }
    Object.assign(process.env, original);
  });

  it("assigns missing keys and does not overwrite existing env", () => {
    process.env.EXISTING_KEY = "keep-me";
    const dir = mkdtempSync(join(tmpdir(), "env-"));
    const path = join(dir, ".env.local");
    writeFileSync(
      path,
      ["EXISTING_KEY=overwrite-me", "NEW_KEY=from-file"].join("\n"),
    );

    loadEnvFile(path);

    expect(process.env.EXISTING_KEY).toBe("keep-me");
    expect(process.env.NEW_KEY).toBe("from-file");
  });

  it("does not overwrite an explicitly empty environment value", () => {
    process.env.EMPTY_KEY = "";
    const dir = mkdtempSync(join(tmpdir(), "env-"));
    const path = join(dir, ".env.local");
    writeFileSync(path, "EMPTY_KEY=from-file\nFILLED_KEY=from-file");

    loadEnvFile(path);

    expect(process.env.EMPTY_KEY).toBe("");
    expect(process.env.FILLED_KEY).toBe("from-file");
  });

  it("does nothing when the file is missing", () => {
    expect(() => loadEnvFile(join(tmpdir(), "missing.env.local"))).not.toThrow();
  });
});
