import { KETTLE_FIELDS } from "./fields.js";
import { normalizeValue } from "./normalize.js";
import type { DossierField, Proposal, ResolutionEvent } from "./types.js";

export type ApplyEvent =
  | { type: "provide-answer"; fieldKey: string; value: unknown }
  | { type: "declare-unavailable"; fieldKey: string }
  | { type: "adjudicate"; fieldKey: string; selectedValue: unknown }
  | { type: "apply-proposals"; proposals: Proposal[] };

export interface ApplyResult {
  dossier: DossierField[];
}

function fieldDefinition(fieldKey: string) {
  const def = KETTLE_FIELDS.find((field) => field.key === fieldKey);
  if (!def) return null;
  return def;
}

function resolutionEvent(action: string, detail?: string): ResolutionEvent {
  return {
    at: new Date().toISOString(),
    action,
    detail,
  };
}

function updateField(
  dossier: DossierField[],
  fieldKey: string,
  updater: (field: DossierField) => DossierField,
): DossierField[] {
  return dossier.map((field) => (field.key === fieldKey ? updater(field) : field));
}

function normalizedEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyProvideAnswer(
  dossier: DossierField[],
  fieldKey: string,
  value: unknown,
): DossierField[] {
  const def = fieldDefinition(fieldKey);
  if (!def) return dossier;

  return updateField(dossier, fieldKey, (field) => {
    const normalized = normalizeValue(value, def.valueKind);

    if (field.status === "confirmed") {
      return {
        ...field,
        status: "conflicting",
        originalValue: [field.originalValue, value],
        normalizedValue: [field.normalizedValue, normalized],
        resolutionHistory: [
          ...field.resolutionHistory,
          resolutionEvent("user-conflict", String(value)),
        ],
      };
    }

    if (field.status === "conflicting") {
      const originalValues = Array.isArray(field.originalValue)
        ? field.originalValue
        : [field.originalValue];
      const normalizedValues = Array.isArray(field.normalizedValue)
        ? field.normalizedValue
        : [field.normalizedValue];
      const alreadyPresent = normalizedValues.some((existing) =>
        normalizedEquals(existing, normalized),
      );
      if (alreadyPresent) return field;

      return {
        ...field,
        status: "conflicting",
        originalValue: [...originalValues, value],
        normalizedValue: [...normalizedValues, normalized],
        resolutionHistory: [
          ...field.resolutionHistory,
          resolutionEvent("user-conflict", String(value)),
        ],
      };
    }

    return {
      ...field,
      status: "user-provided",
      originalValue: value,
      normalizedValue: normalized,
      resolutionHistory: [
        ...field.resolutionHistory,
        resolutionEvent("user-provided", String(value)),
      ],
    };
  });
}

function applyDeclareUnavailable(
  dossier: DossierField[],
  fieldKey: string,
): DossierField[] {
  if (!fieldDefinition(fieldKey)) return dossier;

  return updateField(dossier, fieldKey, (field) => ({
    ...field,
    status: "missing",
    originalValue: null,
    normalizedValue: null,
    markers: field.markers.includes("declaredUnavailable")
      ? field.markers
      : [...field.markers, "declaredUnavailable"],
    resolutionHistory: [
      ...field.resolutionHistory,
      resolutionEvent("declared-unavailable"),
    ],
  }));
}

function applyAdjudicate(
  dossier: DossierField[],
  fieldKey: string,
  selectedValue: unknown,
): DossierField[] {
  const def = fieldDefinition(fieldKey);
  if (!def) return dossier;

  return updateField(dossier, fieldKey, (field) => {
    if (field.status !== "conflicting") return field;

    const originalValues = Array.isArray(field.originalValue)
      ? field.originalValue
      : [field.originalValue];
    const normalizedValues = Array.isArray(field.normalizedValue)
      ? field.normalizedValue
      : [field.normalizedValue];
    const selectedNormalized = normalizeValue(selectedValue, def.valueKind);

    const selectedIndex = normalizedValues.findIndex((value) =>
      normalizedEquals(value, selectedNormalized),
    );
    const winnerIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    const winnerValue = originalValues[winnerIndex] ?? selectedValue;
    const loserValue = originalValues[loserIndex];

    return {
      ...field,
      status: "confirmed",
      originalValue: winnerValue,
      normalizedValue: normalizedValues[winnerIndex] ?? selectedNormalized,
      markers: field.markers.includes("adjudicated")
        ? field.markers
        : [...field.markers, "adjudicated"],
      resolutionHistory: [
        ...field.resolutionHistory,
        resolutionEvent(
          "adjudicated",
          loserValue === undefined ? undefined : String(loserValue),
        ),
      ],
    };
  });
}

export function parseAnswer(fieldKey: string, answerText: string): ApplyEvent {
  const trimmed = answerText.trim();
  if (trimmed.length === 0) {
    return { type: "declare-unavailable", fieldKey };
  }
  return { type: "provide-answer", fieldKey, value: trimmed };
}

export function applyEvent(
  dossier: DossierField[],
  event: ApplyEvent,
): ApplyResult {
  const copy = structuredClone(dossier);

  if (event.type === "provide-answer") {
    return { dossier: applyProvideAnswer(copy, event.fieldKey, event.value) };
  }

  if (event.type === "declare-unavailable") {
    return { dossier: applyDeclareUnavailable(copy, event.fieldKey) };
  }

  if (event.type === "adjudicate") {
    return {
      dossier: applyAdjudicate(copy, event.fieldKey, event.selectedValue),
    };
  }

  let next = copy;
  for (const proposal of event.proposals) {
    if (!fieldDefinition(proposal.fieldKey)) continue;
    next = applyProvideAnswer(
      next,
      proposal.fieldKey,
      proposal.proposedValue,
    );
  }
  return { dossier: next };
}
