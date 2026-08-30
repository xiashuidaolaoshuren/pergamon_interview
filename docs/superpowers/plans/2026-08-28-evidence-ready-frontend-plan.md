# Implementation plan: EvidenceReady frontend

**Spec:** [docs/superpowers/specs/2026-08-28-evidence-ready-design.md](../specs/2026-08-28-evidence-ready-design.md)  
**Sibling:** [backend plan](./2026-08-28-evidence-ready-backend-plan.md)  
**Created:** 2026-08-29  
**Subsystem scope:** Vite + React SPA, Tailwind CSS v4, shadcn/ui, browser session, screens that follow the OpenDesign prototype.

## Summary

Ship the guided-split UI the assessor clicks through. React components rebuild the OpenDesign prototype (not embed its HTML). The SPA imports `src/domain` for planning, applying answers, and readiness; it calls `POST /api/extract` and `POST /api/interpret` for recorded replay and live Gemini. Recorded kettle mode needs no `GEMINI_KEY` but still uses the Node server. Out of scope: implementing verification/Gemini, a second visual language, login, other product categories, generating manuals.

## Discovery notes

- **Reuse:** Spec §5 journey, §7.2 component map, §10 interface; [`docs/design/opendesign-handoff.md`](../../design/opendesign-handoff.md); local [`prototype/DESIGN.md`](../../../prototype/DESIGN.md) tokens and [`prototype/screens/*.html`](../../../prototype/screens); live `src/domain` (types, planner, apply, readiness, field table) and `server/http.ts` after backend T1–T7.
- **Constraints:** React + Vite + Tailwind v4 + shadcn/ui. Dossier pane is read-only (ADR 0004). Conflicts are questions. Five statuses + two markers. Verdicts: “Ready for manual authoring” / “Needs evidence review” only. Persistent recorded/live mode badge. No Gemini key in the client bundle. Freeze against **implemented** domain/HTTP, not the sibling plan’s original sketch.
- **Patterns to follow:** Domain screens compose shadcn primitives (`Badge`, `Sheet`/`Drawer`, `Alert`, `Button`, form `Field`). Semantic tokens from `DESIGN.md` (`--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, `--st-*`). Vite proxy `/api` to the backend server. Persist and POST the full `DossierField` (including `conflictCandidates` and `adjudicatedLosers`).
- **Anti-goals:** Do not paste prototype markup. Do not use Inter/purple AI chrome. Do not inline-edit the dossier. Do not show a compliance score. Do not call Gemini from the browser. Do not re-run extract/verify/reconcile in the client. Do not render conflicts from `originalValue` arrays or `resolutionHistory` strings.

## File map

### Subsystem: Vite app

| Path | Create/Modify | Responsibility | Public surface |
|------|----------------|----------------|----------------|
| `package.json` | modify | Add Vite, React, Tailwind v4, shadcn, RTL, Playwright. Add `dev` and `test:e2e`; keep existing `dev:server`, `typecheck`, and Vitest covering `src/domain` + `server`. | npm scripts |
| `vite.config.ts` | create | React plugin; `/api` proxy to backend; path alias `@`. | Vite config |
| `index.html` | create | SPA shell. | entry |
| `src/main.tsx` | create | Mount, global CSS. | — |
| `src/index.css` | create | Tailwind v4 `@theme` / `:root` bound to `prototype/DESIGN.md` tokens (hex/oklch verbatim). | CSS tokens |
| `components.json` | create | shadcn Vite config. | CLI |
| `src/components/ui/*` | create | Generated shadcn primitives only. | shadcn exports |
| `src/session.ts` | create | Persist dossier + excerpts + interview/mode to `localStorage`; full `DossierField` including `conflictCandidates` and `adjudicatedLosers`; quota failure → in-memory + warning. | `loadSession`, `saveSession` |
| `src/api.ts` | create | Fetch wrappers for extract/interpret; parse JSON error envelope on every non-2xx (including 500). Never send the key. | `extractFixture`, `extractUpload`, `interpretAnswer` |
| `src/app-state.ts` | create | Phase: intake → extracting → insufficient \| interview → report. Hold `InterviewState`; call domain `nextQuestion` / `applyEvent` / `authoringReadiness`. Never edit dossier fields in the UI. | `AppPhase`, reducer |
| `src/App.tsx` | create | Phase switch, chrome (title, product, `ModeBadge`). | root |
| `src/components/ModeBadge.tsx` | create | Persistent recorded/live pill. | `ModeBadge` |
| `src/screens/Intake.tsx` | create | Bundled example + mode radios; upload 1–3 PDF/TXT; privacy + format copy. Follow `intake.html`. | `Intake` |
| `src/screens/ExtractionProgress.tsx` | create | Pipeline steps + `counts` + recoverable JSON errors + retry; optional `failedSources` on success. Follow `extraction.html`. | `ExtractionProgress` |
| `src/screens/InsufficientEvidence.tsx` | create | What was found; add document / continue anyway. Follow `insufficient.html`. | `InsufficientEvidence` |
| `src/screens/InterviewWorkspace.tsx` | create | Guided split 3fr/2fr; stacks below 980px. Follow `interview.html`. | `InterviewWorkspace` |
| `src/screens/QuestionPanel.tsx` | create | Conflict / missing / unverified shapes from domain `Question.shape`; conflict options from `conflictCandidates`; unknown vs leave-unresolved. | `QuestionPanel` |
| `src/screens/DossierPanel.tsx` | create | Grouped fields, status chips, markers; click opens source, never edits. | `DossierPanel` |
| `src/screens/SourceDrawer.tsx` | create | Quote in captured window; document + page. | `SourceDrawer` |
| `src/screens/ProposalConfirmation.tsx` | create | Accept/dismiss per proposed field; write only via `apply-proposals`. | `ProposalConfirmation` |
| `src/screens/BudgetPause.tsx` | create | After `SOFT_CAP` (5) questions: continue or finish. | `BudgetPause` |
| `src/screens/ReadinessReport.tsx` | create | Verdict from `authoringReadiness`; blockers; `adjudicatedLosers`; rejected candidates; mode. Follow `report.html`. | `ReadinessReport` |
| `src/screens/*.test.tsx` | create | Component tests from spec §14 (evidence on confirmed, conflict ≠ confirmed, labels). | RTL |
| `e2e/recorded-kettle.spec.ts` | create | Playwright: intake recorded → conflict → importer → power → report; no live Gemini. | Playwright |
| `.env.example` | modify | Note client needs no key; recorded extract still requires `dev:server`, not `GEMINI_KEY`. | — |

### Blast radius

| Path | Why sensitive | Plan mode (before implementation) |
|------|----------------|-----------------------------------|
| `src/index.css` | Visual contract; wrong tokens = parallel design language | medium — bind `DESIGN.md` `:root` verbatim |
| `src/app-state.ts` | All screens read phase/dossier; easy to reintroduce dossier edits or duplicate planner/apply | high |
| `src/session.ts` | Slim snapshots drop `conflictCandidates` / `adjudicatedLosers` and break interpret + refresh | high |
| `src/api.ts` | Error envelope and extract/interpret payloads are the UI freeze surface | high |
| `src/screens/QuestionPanel.tsx` | Three shapes + n-way conflict + proposals; control-plane UX | high |
| `src/screens/DossierPanel.tsx` | Must stay read-only (ADR 0004) | high |
| `vite.config.ts` | Proxy/key leakage if misconfigured | medium — confirm no `GEMINI_KEY` in client define |

## Cross-plan contract

Backend T1–T7 are **done**. Import `src/domain`; do not import `server/gemini.ts` or read `GEMINI_KEY`. Do not duplicate ranking, verification, reconciliation, or readiness in UI helpers.

**HTTP** (live `server/http.ts`):

- `POST /api/extract` — JSON `{ source: "fixture", mode: "recorded" \| "live" }` **or** multipart field `files` (1–3 PDF/TXT, ≤10 MB). Recorded and live bundled paths both go through this route — not an in-browser pipeline.
- Extract 200: `{ mode, dossier, rejected, coverage, counts, failedSources? }` where `coverage` is `"interview" \| "insufficient"` and `counts` is `{ extracted, rejected, conflicts, missing }`. Partial parse failure may return 200 with `failedSources`.
- `POST /api/interpret` — `{ fieldKey, answerText, dossier }` with **full** `DossierField[]`. Returns `{ proposals }` or a `rephrase` error. Never writes the dossier.
- Every non-2xx (including 500) is JSON `{ error: { code, message, envVar?, failedSources? } }`. Codes the UI must render: `invalid-intake`, `payload-too-large` (413), `missing-key` (`envVar: "GEMINI_KEY"`), `quota`, `auth`, `network`, `gemini-unavailable` (503), `encrypted`, `image-only`, `empty`, `unsupported`, `corrupt`, `all-sources-failed`, `rephrase`, `invalid-request`, `internal-error`.

**Domain** (live `src/domain`):

- Question copy and grouping from `KETTLE_FIELDS`. Next question: `nextQuestion(dossier, interviewState)` → `{ fieldKey, shape } \| null` (`null` → report, even if blockers remain). Pause: `shouldPause` / `SOFT_CAP`.
- Writes only through `applyEvent`: `provide-answer`, `declare-unavailable`, `adjudicate`, `apply-proposals`. Empty `parseAnswer` is `declare-unavailable` (missing “unknown”), not leave-unresolved.
- Conflict UI reads `field.conflictCandidates` (n-way; each has value, citation, `source`). After adjudication, losers live on `field.adjudicatedLosers`. Unmatched `adjudicate` is a no-op (status stays `conflicting`).
- Readiness: `authoringReadiness` → `{ verdict: "ready" \| "needs-review", blockers }`. Display stored `status` + `markers`; do not re-derive status in the UI.

## Workflow (for implementers)

1. **writing-plans** produced this file (type-1 decomposition only).
2. For each subtask: **Plan mode** + **planning-subtasks** → type-2 `.cursor/plans/*.plan.md` when **Plan mode** warrants it.
3. **Agent mode**: **test-driven-development** when **`TDD suitable: yes`** (or the TDD slice of **`partial`**).
4. Update this document if reality diverges; add a **Plan changelog** row.

Suggested order: **T1–T2** (scaffold + chrome), then **T3–T8**. Backend no longer blocks.

## Subtasks

Dependency notation: `Blocked by: T1` means start after T1 is done.

### T1 — Vite, Tailwind v4, shadcn

- [X] **Do:** Scaffold the React SPA on the existing package: Vite, Tailwind v4, shadcn init, `/api` proxy, `dev` script alongside existing `dev:server`. Keep `npx vitest run` covering domain and server.
- **Blocked by:** —
- **Plan mode:** medium
- **TDD suitable:** no
- **TDD suitable reason:** Generated tooling and declarative config; no product behavior.
- **Verification:** `npm run dev` serves a blank page; shadcn `Button` renders; proxy target documented; existing `npx vitest run` still exits 0.

### T2 — Tokens and chrome

- [X] **Do:** Bind `DESIGN.md` color/type/spacing tokens. App chrome: EvidenceReady, HK-1750 kettle after intake, mode badge, sticky topnav, footer disclaimer. Accent budget: eyebrow + primary CTA only.
- **Blocked by:** T1
- **Plan mode:** skip
- **TDD suitable:** no
- **TDD suitable reason:** Purely visual / token binding; verify against prototype, not pixel unit tests.
- **Verification:** Side-by-side with `prototype/evidenceready-prototype-v2.html` — cream paper, sienna accent, mono citations.

### T3 — Session and phase machine

- [X] **Do:** Persist full dossier (including `conflictCandidates` and `adjudicatedLosers`) plus excerpts and `InterviewState`; quota fallback; phase reducer intake → extracting → insufficient | interview → report. Extraction mode stored and shown on every post-intake screen.
- **Blocked by:** T1
- **Plan mode:** high
- **TDD suitable:** yes
- **Verification:** `npx vitest run src/session src/app-state`

### T4 — Intake

- [X] **Do:** Bundled kettle CTA with recorded/live radios; upload path with PDF/TXT, 10 MB, no-OCR, Gemini privacy copy. Submit recorded/live bundled via `POST /api/extract` JSON fixture body; uploads via multipart `files`. Parse JSON error envelope (including `missing-key`).
- **Blocked by:** T2, T3
- **Plan mode:** medium
- **TDD suitable:** partial
- **TDD suitable reason:** TDD file-accept, mode state, and extract request shape; layout match to `intake.html` is visual verification.
- **Verification:** RTL: recorded is default; privacy sentence present; `npx vitest run src/screens/Intake`

### T5 — Extraction progress and insufficient evidence

- [ ] **Do:** Observable pipeline + `counts` + retry from JSON `{ error.code }`. `coverage === "insufficient"` opens insufficient (add-document / continue-anyway) — do not auto-open interview. Show `failedSources` on partial success. Do not display coverage as a percentage.
- **Blocked by:** T4
- **Plan mode:** medium
- **TDD suitable:** partial
- **TDD suitable reason:** TDD “insufficient does not enter interview”, error-code rendering, and partial `failedSources`; chrome/layout vs prototype is visual.
- **Verification:** `npx vitest run src/screens/ExtractionProgress src/screens/InsufficientEvidence`

### T6 — Interview workspace

- [ ] **Do:** Guided split. Question shapes from `nextQuestion`. Conflict options from `conflictCandidates`; adjudicate only listed values (unmatched apply is a no-op). Leave-unresolved updates `askedFieldKeys` only. Missing unknown → `declare-unavailable`. Confirming unverified → user-provided via `provide-answer`. Source drawer, proposal confirmation (`apply-proposals` after accept), budget pause via `shouldPause`. Dossier read-only with status chips and markers.
- **Blocked by:** T5
- **Plan mode:** high
- **TDD suitable:** partial
- **TDD suitable reason:** TDD status labels, conflict cannot render as confirmed, n-way candidates, proposal requires accept, drawer opens from confirmed row; split/spacing vs `interview.html` is visual.
- **Verification:** `npx vitest run src/screens/QuestionPanel src/screens/DossierPanel src/screens/ProposalConfirmation`

### T7 — Readiness report

- [ ] **Do:** Map `authoringReadiness` `ready` / `needs-review` to the two spec verdicts. Blockers, declared-unavailable vs never-investigated, losers from `adjudicatedLosers`, rejected candidates, mode badge, criteria copy. No percentage score.
- **Blocked by:** T6
- **Plan mode:** medium
- **TDD suitable:** partial
- **TDD suitable reason:** TDD verdict derivation display, loser provenance, and forbidden “compliant” copy; report layout vs `report.html` is visual.
- **Verification:** `npx vitest run src/screens/ReadinessReport`

### T8 — Playwright recorded smoke

- [ ] **Do:** One e2e: recorded kettle → progress → adjudicate capacity → importer contact → unverified power → report. No live Gemini. Completes the spec §14 smoke. Requires `dev` + `dev:server`.
- **Blocked by:** T7
- **Plan mode:** skip
- **TDD suitable:** yes
- **Verification:** `npx playwright test e2e/recorded-kettle.spec.ts`

## TDD note (Agent mode)

Per subtask, obey **`TDD suitable`**: **`yes`** means strict **test-driven-development** (red/green/refactor); **`partial`** applies it only to the testable slice; **`no`** means do not force test-first—still satisfy **Verification**. UI work here is mostly **`partial`**: lock behavior and labels in RTL; match OpenDesign by eye, not pixel snapshots.

## Plan changelog

| Date | Change |
|------|--------|
| 2026-08-29 | Initial frontend plan |
| 2026-08-30 | Align T3–T8 and Cross-plan contract with shipped backend: n-way `conflictCandidates` / `adjudicatedLosers`, unmatched-adjudicate no-op, JSON error envelope, HTTP-only recorded extract. Backend T1–T7 no longer block. |
