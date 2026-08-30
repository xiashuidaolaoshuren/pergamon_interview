# Implementation Issues

A learning log of bugs and surprises found while building EvidenceReady. Each entry records what went wrong, why, and what we changed so the lesson sticks.

These three High findings came from the third backend code-review pass (after T7 and two rounds of review-driven fixes). They were reproduced against the live module, not inferred from the spec.

---

## 1. Unmatched adjudication silently confirms candidate 0

**When:** Third backend code review (conflict apply path)  
**Area:** `src/domain/apply.ts` (`applyAdjudicate`)  
**Symptom:** Adjudicating a value that is not one of the conflict candidates still confirmed the field, with an `adjudicated` marker, as if the user had chosen the first candidate.

### What we saw

1. Start with a three-way capacity conflict: `["1.5 L", "1.7 L", "2 L"]`.
2. Apply `{ type: "adjudicate", fieldKey: "capacity", selectedValue: "9 L" }`.
3. Field comes back `confirmed` with value `"1.5 L"` and marker `adjudicated`.
4. The user's actual selection is discarded. The audit trail claims they picked a value they never chose.

An invalid `fieldKey` already no-oped safely. An unmatched `selectedValue` did not.

### Root cause

`applyAdjudicate` treated a missing match as “pick the first candidate”:

```ts
const selectedIndex = normalizedValues.findIndex((value) =>
  normalizedEquals(value, selectedNormalized),
);
const winnerIndex = selectedIndex >= 0 ? selectedIndex : 0;
const loserIndex = winnerIndex === 0 ? 1 : 0;
```

`findIndex` returning `-1` became `winnerIndex = 0`. The field then wrote `confirmed` + `adjudicated` using candidate zero.

The existing test (`apply.test.ts`) only covered a valid two-candidate match, so the fallback never ran.

### Fix

Match against structured `conflictCandidates`. If nothing matches, return the field unchanged — same contract as an unknown field key:

```ts
const winner = field.conflictCandidates.find((candidate) =>
  normalizedEquals(candidate.normalizedValue, selectedNormalized),
);
if (!winner) return field;
```

Regression: `leaves a conflicting field unchanged when the selected value is not a candidate` — adjudicate `"9 L"` against `["1.5 L", "1.7 L"]`, assert status stays `conflicting` and no `adjudicated` marker.

### Lesson

- A fallback index (`>= 0 ? i : 0`) is not a safe default when the missing case is a user error. Prefer **no-op** over guessing a winner.
- Tests that only exercise the happy match hide the `-1` branch. Add the unmatched-selection case whenever a lookup drives a status change.
- Keep related failure modes consistent: unknown field and unknown selected value should both leave the dossier alone.

---

## 2. Three-way conflicts drop losing candidates

**When:** Third backend code review (conflict model)  
**Area:** `src/domain/apply.ts`, `src/domain/types.ts`, `src/domain/reconcile.ts`  
**Symptom:** After a user answered a conflict a second time (now a routine three-candidate list), adjudicating a winner retained only one loser as a string on `resolutionHistory`. Other losing values, citations, and evidence disappeared.

### What we saw

1. Conflict `["1.5 L", "1.7 L", "2 L"]`.
2. Adjudicate `"2.0 L"` (normalizes to `"2 L"`).
3. Field becomes `confirmed` with value `"2 L"`.
4. History records only `adjudicated:1.5 L`. The value `1.7 L` is gone — no citation, no candidate record.

Even in the two-candidate case, the loser survived only as `resolutionHistory[].detail` (a string), with its citation dropped.

This contradicts the spec (`docs/superpowers/specs/2026-08-28-evidence-ready-design.md` §5.4 / §8.5), `CONTEXT.md` (“the losing evidence is retained”), and ADR 0004.

### Root cause

Conflicts were modeled as parallel arrays stuffed into `originalValue` / `normalizedValue`, plus a shared field-level `evidence[]`. Adjudication assumed exactly two candidates:

```ts
const loserIndex = winnerIndex === 0 ? 1 : 0;
```

Commit `969222a` made three-or-more candidates the normal case: answering a `conflicting` field now *appends* a distinct value instead of auto-resolving to `user-provided`. The two-slot loser index did not grow with that change.

`Conflict` / `ConflictCandidate` already existed in `types.ts` (and were re-exported) with the right shape — per-candidate value, citation, and `source: "document" | "user"` — but had **zero runtime consumers**. Reconciliation and apply never used them.

### Fix

Add two arrays on `DossierField`:

- `conflictCandidates` — source of truth while `status === "conflicting"`
- `adjudicatedLosers` — every non-winner after adjudication, with source and citation

Keep `originalValue` / `normalizedValue` as the current compatibility view (arrays while unresolved, scalar winner after).

`applyAdjudicate` now:

1. Finds the winner by normalized value.
2. Writes all other candidates to `adjudicatedLosers`.
3. Sets winner evidence from that candidate only (document citation, or `[]` for a user-sourced winner).
4. Clears `conflictCandidates`.

Reconciliation emits `conflictCandidates` for scalar document-vs-document conflicts. `provide-answer` on a confirmed field seeds a document candidate plus a user candidate.

Regression: `retains every non-winner with provenance when adjudicating a three-way conflict`.

### Lesson

- Parallel arrays plus a two-index loser formula **cannot** represent n-way conflicts. When you change “append another candidate” behavior, audit every consumer that assumed `length === 2`.
- Types that match the spec but are unused (`ConflictCandidate`) are a smell: either adopt them or delete them. Dead types hid that the runtime model was still the array hack.
- A traceability product that deletes losing evidence is arguing against itself — store losers as structured candidates, not as a history string.

---

## 3. Unhandled errors return plain-text 500 (broken JSON error envelope)

**When:** Third backend code review (HTTP boundary)  
**Area:** `server/http.ts`, `src/domain/schemas.ts`  
**Symptom:** Failures outside the explicit catch branches returned Hono’s default **500** with `Content-Type: text/plain` and body `Internal Server Error`. The frontend contract is `{ error: { code, message } }`.

### What we saw

```
POST /api/interpret  {"fieldKey":"capacity","answerText":"x","dossier":[null]}
→ 500, body: Internal Server Error
```

A non-object element like `["nope"]` was worse in a quieter way: it passed validation, and `undefined: undefined` was interpolated into the Gemini prompt.

The same envelope gap applied to missing fixture files (`ENOENT` from `readFileSync`) and other unexpected throws.

A related misclassification: corrupt `recorded-extraction.json` threw `SyntaxError` from `JSON.parse` inside the pipeline, and the extract handler treated **all** `SyntaxError` as client `400 invalid-request`.

### Root cause

Two holes stacked:

**1. `z.custom` is not validation.** Interpret used:

```ts
dossier: z.array(z.custom<DossierField>()),
```

`z.custom()` with no predicate accepts `null`, strings, anything. `dossierSummary` then did `field.key` / `field.status` and threw `TypeError`, which was not in the catch list.

**2. No `app.onError`.** Route handlers ended with `throw error`. Hono’s default handler emits plain text. The backend plan required “JSON errors the UI can render.”

`SyntaxError` from `c.req.json()` (client body) and `JSON.parse` of a bundled fixture (server data) are the same JavaScript type, so one catch mapped both to 400.

Existing HTTP tests covered malformed JSON bodies and Gemini errors, not `dossier: [null]`, unexpected throws, or fixture ENOENT.

### Fix

- Export a real `dossierFieldSchema` / `dossierSchema` and wire it into `interpretRequestSchema`. Null and non-object members become **400** `{ error: { code: "invalid-request" } }` before prompt construction.
- Register `app.onError` returning **500** `{ error: { code: "internal-error", message: "Unexpected server error." } }` with no path or stack leak.
- Scope `SyntaxError` to `c.req.json()` only. Fixture parse/ENOENT fall through to `onError` as server faults.

Regressions in `server/http.test.ts`: malformed dossier members; unexpected extraction throw; corrupt recorded JSON; missing fixture directory.

### Lesson

- **Zod at the HTTP boundary means a real schema**, not `z.custom<T>()` for TypeScript-only typing. The type parameter is erased at runtime.
- Catch lists are incomplete by construction — a catch-all `onError` (or equivalent) is what keeps the error *envelope* invariant when a new throw appears.
- Do not key HTTP status off a shared language type (`SyntaxError`, `ZodError`) when the same type can come from the client *or* from server-side files. Catch at the call site that produced the error.
- The UI will parse `error.code`. A plain-text 500 is a contract break, not a generic server failure.

---
