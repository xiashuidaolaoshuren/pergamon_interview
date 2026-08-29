import { describe, expect, it } from "vitest";
import {
  assessCoverage,
  captureWindow,
  essentialKeys,
  extractionResponseSchema,
  FIELD_STATUSES,
  KETTLE_FIELDS,
  normalizeValue,
  proposalSchema,
  reconcileCandidates,
  verifyCitation,
} from "./index.js";

describe("domain barrel exports", () => {
  it("re-exports the public surface", () => {
    expect(KETTLE_FIELDS).toHaveLength(15);
    expect(essentialKeys()).toHaveLength(9);
    expect(extractionResponseSchema).toBeDefined();
    expect(proposalSchema).toBeDefined();
    expect(FIELD_STATUSES).toHaveLength(5);
    expect(verifyCitation).toBeTypeOf("function");
    expect(captureWindow).toBeTypeOf("function");
    expect(normalizeValue).toBeTypeOf("function");
    expect(reconcileCandidates).toBeTypeOf("function");
    expect(assessCoverage).toBeTypeOf("function");
  });
});
