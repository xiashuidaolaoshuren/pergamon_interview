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

  it("moves to report when nextQuestion is null after an answer", () => {
    const extracting = appReducer(initialAppState, {
      type: "start-extract",
      mode: "recorded",
    });
    const interviewing = appReducer(extracting, {
      type: "extract-success",
      coverage: "interview",
      dossier: [{ ...emptyField("product-name"), status: "missing" }],
      rejected: [],
      counts: { extracted: 0, rejected: 0, conflicts: 0, missing: 1 },
      mode: "recorded",
    });

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
