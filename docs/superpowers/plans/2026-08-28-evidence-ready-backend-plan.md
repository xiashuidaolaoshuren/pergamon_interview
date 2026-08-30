# Implementation plan: EvidenceReady backend

**Spec:** [docs/superpowers/specs/2026-08-28-evidence-ready-design.md](../specs/2026-08-28-evidence-ready-design.md)  
**Sibling:** [frontend plan](./2026-08-28-evidence-ready-frontend-plan.md)  
**Created:** 2026-08-29  
**Subsystem scope:** Shared domain (field table, verification, planner, readiness) and the same-repo TypeScript server (PDF parse, Gemini, HTTP).

## Summary

Ship the deterministic control plane and the server that the Vite app calls. The field table is the single source of truth: it generates the extraction schema and prompt, ranks questions, and feeds readiness. Gemini only extracts candidates and interprets messy answers into proposals. TypeScript verifies quotes, reconciles, plans, writes dossier changes, and decides authoring readiness. Out of scope: UI, shadcn, Playwright, hosted deploy, OCR, a database, other product categories.

## Discovery notes

- **Reuse:** `[CONTEXT.md](../../../CONTEXT.md)` vocabulary; spec §6 field table, §8 domain, §9 control boundary, §11 readiness, §12 failures, §14 tests; ADRs 0002–0004; architecture JSON (TypeScript server, `GEMINI_KEY` never leaves the server).
- **Constraints:** No Next.js. One TypeScript repo. Browser must never see the Gemini key. Recorded extraction must work with no key. Prompts delimit document text and free-text answers as untrusted. Logs never contain keys or raw uploads. `/prototype` is gitignored and is not this subsystem.
- **Patterns to follow:** Split files by responsibility (field table vs verify vs reconcile vs plan vs HTTP). Zod at every model/HTTP boundary. Vitest for unit and fixture-pipeline tests.
- **Anti-goals:** No compliance score, no model-supplied confidence, no question phrasing by Gemini, no auto-resolve of conflicts, no extra dossier fields, no drive-by frontend.

**Recommended defaults (change in type-2 if a better library fits):** Node + Hono for HTTP; Vite dev proxy `/api` → that server (wired in the frontend plan); `@google/genai` for Gemini; a page-aware PDF text library for page-bounded extract; Vitest.

## File map



### Subsystem: domain + server


| Path                                       | Create/Modify | Responsibility                                                                                                                                     | Public surface                                        |
| ------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `package.json`                             | create        | Scripts: `test`, `dev:server`. Deps for Zod, Vitest, Hono, Gemini, PDF.                                                                            | npm scripts                                           |
| `tsconfig.json`                            | create        | Shared TS config for `src/` and `server/`.                                                                                                         | compiler options                                      |
| `.env.example`                             | create        | Documents `GEMINI_KEY`.                                                                                                                            | env contract                                          |
| `.gitignore`                               | modify        | Add `/dist` (Vite). Keep `/prototype`, `.env*`.                                                                                                    | —                                                     |
| `src/domain/fields.ts`                     | create        | 15 kettle fields: key, label, group, tier, value kind, normalizer id, question text, rationale. Declaration order is the planner tie-break.        | `KETTLE_FIELDS`, `FieldDefinition`, `essentialKeys()` |
| `src/domain/types.ts`                      | create        | Document, Candidate, Citation, Evidence, DossierField, Conflict, Proposal, InterviewState, statuses, markers, extraction mode.                     | domain types                                          |
| `src/domain/schemas.ts`                    | create        | Zod for extraction candidates, interpret proposals, HTTP payloads. Reject candidates missing document, page, or quote.                             | `extractionResponseSchema`, `proposalSchema`          |
| `src/domain/verify.ts`                     | create        | Conservative whitespace normalize; quote-on-page check; capture surrounding window.                                                                | `verifyCitation`, `captureWindow`                     |
| `src/domain/normalize.ts`                  | create        | Per-kind normalize (scalar electrical/capacity; list; prose).                                                                                      | `normalizeValue`                                      |
| `src/domain/reconcile.ts`                  | create        | Merge candidates → dossier: scalar conflict, list union, prose first-source-wins; retain rejected candidates; many-to-one quotes.                  | `reconcileCandidates`                                 |
| `src/domain/coverage.ts`                   | create        | Essential-coverage threshold → insufficient-evidence vs interview.                                                                                 | `assessCoverage`                                      |
| `src/domain/planner.ts`                    | create        | Rank unresolved: essential before supporting; within tier conflict → missing → unverified; then declaration order. Question shapes. Soft cap at 5. | `nextQuestion`, `shouldPause`                         |
| `src/domain/apply.ts`                      | create        | Deterministic answer parse; apply confirmed proposals as user-provided; user-vs-document → conflict; adjudicate; declare unavailable.              | `parseAnswer`, `applyEvent`                           |
| `src/domain/readiness.ts`                  | create        | Ready iff no essential missing (incl. declared unavailable), no unadjudicated conflict, every essential confirmed or user-provided.                | `authoringReadiness`                                  |
| `src/domain/prompt.ts`                     | create        | Build extraction and interpret prompts from the field table; untrusted-input delimiters.                                                           | `extractionPrompt`, `interpretPrompt`                 |
| `src/domain/index.ts`                      | create        | Barrel for frontend + server.                                                                                                                      | re-exports                                            |
| `src/domain/*.test.ts`                     | create        | Unit tests listed in spec §14.                                                                                                                     | Vitest                                                |
| `fixtures/kettle/supplier-spec.pdf`        | create        | Synthetic spec: capacity 1.5 L; no importer contact; no 2200 W on the cited page.                                                                  | fixture bytes                                         |
| `fixtures/kettle/draft-manual.pdf`         | create        | Synthetic manual: capacity 1.7 L; agrees on other essentials.                                                                                      | fixture bytes                                         |
| `fixtures/kettle/recorded-extraction.json` | create        | Stored Gemini-shaped payload: real quotes + one fabricated power quote.                                                                            | recorded extract                                      |
| `fixtures/kettle/recorded-pages.json`      | create        | Page texts for verification without re-parsing PDFs in unit tests.                                                                                 | page corpus                                           |
| `server/pdf.ts`                            | create        | Extract text with page boundaries; detect encrypted / image-only / empty.                                                                          | `extractPages`                                        |
| `server/gemini.ts`                         | create        | Structured extract + interpret; one schema-repair retry; map quota/auth/network errors.                                                            | `extractCandidates`, `interpretAnswer`                |
| `server/pipeline.ts`                       | create        | Parse → extract or replay → validate → verify → normalize → reconcile → coverage. Never persist raw uploads.                                       | `runExtraction`                                       |
| `server/http.ts`                           | create        | Hono (or equivalent): file/type/size checks; JSON errors the UI can render.                                                                        | `app`                                                 |
| `server/index.ts`                          | create        | Listen; load `GEMINI_KEY` from env.                                                                                                                | process entry                                         |
| `server/*.test.ts`                         | create        | Fixture pipeline tests (spec §14).                                                                                                                 | Vitest                                                |




### Blast radius


| Path                    | Why sensitive                                                               | Plan mode (before implementation)                               |
| ----------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/domain/fields.ts`  | Single source of truth; live interview change target                        | high — confirm 9 essential keys and value kinds against spec §6 |
| `src/domain/schemas.ts` | Model boundary; missing citation must fail validation not become unverified | high                                                            |
| `src/domain/prompt.ts`  | Untrusted-input delimiting; must not imply legal “required”                 | high                                                            |
| `server/gemini.ts`      | Key handling, retries, no logging of documents                              | high                                                            |
| `server/http.ts`        | Public API the frontend freezes against                                     | medium                                                          |




## Cross-plan contract

Frontend may import `src/domain` and `fixtures/kettle/recorded-extraction.json`. It must not import `server/gemini.ts` or read `GEMINI_KEY`.

HTTP (stable enough for the frontend plan):

- `POST /api/extract` — multipart upload (1–3 PDF/TXT, ≤10 MB) **or** `{ source: "fixture", mode: "recorded" | "live" }`. Returns dossier snapshot, rejected candidates, coverage, pipeline counts, `mode`.
- `POST /api/interpret` — `{ fieldKey, answerText, dossier }`. Returns proposals or a rephrase error. Never writes the dossier.
- Missing key on live extract: structured error naming `GEMINI_KEY` and pointing at recorded mode.



## Workflow (for implementers)

1. **writing-plans** produced this file (type-1 decomposition only).
2. For each subtask: **Plan mode** + **planning-subtasks** → type-2 `.cursor/plans/*.plan.md` when **Plan mode** warrants it.
3. **Agent mode**: **test-driven-development** when `TDD suitable: yes` (or the TDD slice of `partial`).
4. Update this document if reality diverges; add a **Plan changelog** row.

Suggested order vs frontend: **T1–T5** before frontend interview wiring; **T4** unblocks the recorded UI path; **T7** unblocks live upload.

## Subtasks

Dependency notation: `Blocked by: T1` means start after T1 is done.

### T1 — Repo and test scaffold

- [x] **Do:** Add `package.json`, TypeScript, Vitest, `.env.example` (`GEMINI_KEY`), and `/dist` in `.gitignore`. No product logic.

- **Blocked by:** —
- **Plan mode:** skip
- **TDD suitable:** no
- **TDD suitable reason:** Wiring and declarative config only; no runtime behavior to lock.
- **Verification:** `npx vitest run` exits 0 on an empty suite; `GEMINI_KEY` is documented in `.env.example`.



### T2 — Field table and domain types

- [x] **Do:** Encode the 15 kettle fields (tier, value kind, question text, rationale, declaration order) and the dossier/candidate/citation types + Zod extraction schema. Schema requires document, page, and quote on every candidate. No confidence field.

- **Blocked by:** T1
- **Plan mode:** high
- **TDD suitable:** yes
- **Verification:** `npx vitest run src/domain`



### T3 — Verify, normalize, reconcile, coverage

- [x] **Do:** Implement quote verification + window capture, value-kind normalization, reconciliation (scalar conflict, list union, prose first-source), rejected-candidate retention, essential-coverage threshold.

- **Blocked by:** T2
- **Plan mode:** high
- **TDD suitable:** yes
- **Verification:** `npx vitest run src/domain/verify src/domain/normalize src/domain/reconcile src/domain/coverage`



### T4 — Bundled kettle fixtures

- [x] **Do:** Author the two synthetic PDFs/TXT + recorded extraction JSON: capacity 1.5 L vs 1.7 L, missing importer contact, fabricated rated-power quote, other essentials confirmed. Recorded answers for the smoke path must parse deterministically (no interpret call).

- **Blocked by:** T2
- **Plan mode:** medium
- **TDD suitable:** partial
- **TDD suitable reason:** Fixture bytes are declarative data; assert pipeline invariants in tests (T3/T6) rather than TDD the PDF files themselves.
- **Verification:** Recorded JSON fails Zod if a candidate lacks a quote; page corpus contains 1.5 L and 1.7 L and does not contain the fabricated power quote on the cited page.



### T5 — Planner, apply, readiness

- [x] **Do:** Rank questions (conflicts first), three question shapes, soft cap pause, deterministic parse then proposal apply, user-vs-document conflict, adjudication marker, declared-unavailable marker, readiness derivation (unavailable still blocks).

- **Blocked by:** T3
- **Plan mode:** high
- **TDD suitable:** yes
- **Verification:** `npx vitest run src/domain/planner src/domain/apply src/domain/readiness`



### T6 — PDF + Gemini + extract pipeline

- [x] **Do:** Page-bounded PDF/TXT extract; Gemini structured extract and interpret using prompts from the field table; one schema-repair retry; `runExtraction` for live and recorded replay. Map encrypted, image-only, empty, quota, and malformed-JSON failures.

- **Blocked by:** T3, T4
- **Plan mode:** high
- **TDD suitable:** partial
- **TDD suitable reason:** Pipeline orchestration, Zod repair, and error mapping are TDD; live Gemini I/O is mocked — do not require a real key for unit tests.
- **Verification:** `npx vitest run server` with recorded replay and mocked Gemini; no `GEMINI_KEY` in logs.



### T7 — HTTP API and intake validation

- [x] **Do:** Expose `POST /api/extract` and `POST /api/interpret`. Reject bad type/size before parse. Missing-key error names `GEMINI_KEY` and recorded mode. Partial multi-document failure retains successful facts.

- **Blocked by:** T6
- **Plan mode:** medium
- **TDD suitable:** yes
- **Verification:** `npx vitest run server/http` (supertest or Hono `app.request`); recorded extract succeeds without env key.



## TDD note (Agent mode)

Per subtask, obey `TDD suitable`: `yes` means strict **test-driven-development** (red/green/refactor); `partial` applies it only to the testable slice; `no` means do not force test-first—still satisfy **Verification**.

## Plan changelog


| Date       | Change                                                                           |
| ---------- | -------------------------------------------------------------------------------- |
| 2026-08-29 | Initial backend plan                                                             |
| 2026-08-29 | T1 complete: package.json, TypeScript, Vitest, `.env.example`, `/dist` gitignore |
| 2026-08-29 | T3 complete: verify, normalize, reconcile, coverage |
| 2026-08-29 | T4 complete: bundled kettle fixtures (TXT, PDF, recorded extraction, page corpus) |
| 2026-08-29 | T5 complete: planner, apply, readiness |
| 2026-08-30 | T6 complete: PDF extract, Gemini client, extract pipeline |
| 2026-08-30 | T7 complete: HTTP API and intake validation |


