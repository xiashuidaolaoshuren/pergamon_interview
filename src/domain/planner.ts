import { KETTLE_FIELDS } from "./fields.js";
import type { DossierField, FieldStatus, InterviewState } from "./types.js";

export const SOFT_CAP = 5;

export type QuestionShape = "conflict" | "missing" | "unverified";

export interface Question {
  fieldKey: string;
  shape: QuestionShape;
}

const UNRESOLVED_STATUSES: FieldStatus[] = [
  "conflicting",
  "missing",
  "unverified",
];

const STATUS_PRIORITY: Record<FieldStatus, number> = {
  conflicting: 0,
  missing: 1,
  unverified: 2,
  confirmed: 3,
  "user-provided": 4,
};

const TIER_PRIORITY = {
  essential: 0,
  supporting: 1,
} as const;

function declarationIndex(fieldKey: string): number {
  return KETTLE_FIELDS.findIndex((field) => field.key === fieldKey);
}

function shapeForStatus(status: FieldStatus): QuestionShape {
  if (status === "conflicting") return "conflict";
  if (status === "missing") return "missing";
  return "unverified";
}

function compareUnresolved(a: DossierField, b: DossierField): number {
  const tierDiff = TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier];
  if (tierDiff !== 0) return tierDiff;

  const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
  if (statusDiff !== 0) return statusDiff;

  return declarationIndex(a.key) - declarationIndex(b.key);
}

function rankUnresolved(dossier: DossierField[]): DossierField[] {
  return dossier
    .filter((field) => UNRESOLVED_STATUSES.includes(field.status))
    .sort(compareUnresolved);
}

export function nextQuestion(
  dossier: DossierField[],
  state: InterviewState,
): Question | null {
  const ranked = rankUnresolved(dossier);
  const unresolvedEssentials = ranked.filter((field) => field.tier === "essential");
  if (unresolvedEssentials.length === 0) return null;

  const unasked = unresolvedEssentials.filter(
    (field) => !state.askedFieldKeys.includes(field.key),
  );
  const candidate = unasked[0] ?? null;
  if (!candidate) return null;

  return {
    fieldKey: candidate.key,
    shape: shapeForStatus(candidate.status),
  };
}

export function shouldPause(state: InterviewState): boolean {
  return state.questionCount >= SOFT_CAP && !state.continuePastBudget;
}
