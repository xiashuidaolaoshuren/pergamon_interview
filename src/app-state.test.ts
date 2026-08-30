import { describe, expect, it } from "vitest";
import { appReducer, initialAppState } from "./app-state.js";
import type { DossierField } from "./domain/types.js";

function emptyField(key: string): DossierField {
  return {
    key,
    label: key,
    group: "Identity and Responsibility",
    tier: "essential",
    valueKind: "scalar",
    status: "missing",
    originalValue: null,
    normalizedValue: null,
    markers: [],
    evidence: [],
    rejectedCandidates: [],
    conflictCandidates: [],
    adjudicatedLosers: [],
    resolutionHistory: [],
  };
}

describe("appReducer", () => {
  it("transitions intake to extracting on start-extract", () => {
    const next = appReducer(initialAppState, {
      type: "start-extract",
      mode: "recorded",
    });

    expect(next.phase).toBe("extracting");
    expect(next.mode).toBe("recorded");
  });

  it("parks on extracted when extract coverage is interview", () => {
    const extracting = appReducer(initialAppState, {
      type: "start-extract",
      mode: "recorded",
    });

    const next = appReducer(extracting, {
      type: "extract-success",
      coverage: "interview",
      dossier: [{ ...emptyField("product-name"), status: "missing" }],
      rejected: [],
      counts: { extracted: 1, rejected: 0, conflicts: 0, missing: 1 },
      mode: "recorded",
    });

    expect(next.phase).toBe("extracted");
    expect(next.interview.phase).toBe("interview");
  });

  it("opens interview from extracted summary via open-interview", () => {
    const extracting = appReducer(initialAppState, {
      type: "start-extract",
      mode: "recorded",
    });
    const extracted = appReducer(extracting, {
      type: "extract-success",
      coverage: "interview",
      dossier: [{ ...emptyField("product-name"), status: "missing" }],
      rejected: [],
      counts: { extracted: 1, rejected: 0, conflicts: 0, missing: 1 },
      mode: "recorded",
    });

    const next = appReducer(extracted, { type: "open-interview" });

    expect(next.phase).toBe("interview");
  });

  it("sets insufficient when extract coverage is insufficient", () => {
    const extracting = appReducer(initialAppState, {
      type: "start-extract",
      mode: "live",
    });

    const next = appReducer(extracting, {
      type: "extract-success",
      coverage: "insufficient",
      dossier: [emptyField("product-name")],
      rejected: [],
      counts: { extracted: 0, rejected: 0, conflicts: 0, missing: 1 },
      mode: "live",
    });

    expect(next.phase).toBe("insufficient");
    expect(next.dossier).toHaveLength(1);
  });

  it("continues to interview from insufficient via continue-anyway", () => {
    const insufficient = appReducer(initialAppState, {
      type: "start-extract",
      mode: "live",
    });
    const afterExtract = appReducer(insufficient, {
      type: "extract-success",
      coverage: "insufficient",
      dossier: [emptyField("product-name")],
      rejected: [],
      counts: { extracted: 0, rejected: 0, conflicts: 0, missing: 1 },
      mode: "live",
    });

    const next = appReducer(afterExtract, { type: "continue-anyway" });

    expect(next.phase).toBe("interview");
    expect(next.interview.phase).toBe("interview");
  });

  it("preserves envVar on extract-failure", () => {
    const extracting = appReducer(initialAppState, {
      type: "start-extract",
      mode: "live",
    });

    const next = appReducer(extracting, {
      type: "extract-failure",
      error: {
        code: "missing-key",
        message: "Gemini API key is not configured.",
        envVar: "GEMINI_KEY",
      },
    });

    expect(next.error?.envVar).toBe("GEMINI_KEY");
  });

  it("moves to report when nextQuestion is null after an answer", () => {
    const extracting = appReducer(initialAppState, {
      type: "start-extract",
      mode: "recorded",
    });
    const extracted = appReducer(extracting, {
      type: "extract-success",
      coverage: "interview",
      dossier: [{ ...emptyField("product-name"), status: "missing" }],
      rejected: [],
      counts: { extracted: 0, rejected: 0, conflicts: 0, missing: 1 },
      mode: "recorded",
    });
    const interviewing = appReducer(extracted, { type: "open-interview" });

    const next = appReducer(interviewing, {
      type: "answer",
      event: {
        type: "provide-answer",
        fieldKey: "product-name",
        value: "AromaSteam Electric Kettle",
      },
    });

    expect(next.phase).toBe("report");
    expect(next.dossier[0]?.status).toBe("user-provided");
  });
});
