# Implementation plan: EvidenceReady frontend

**Spec:** [docs/superpowers/specs/2026-08-28-evidence-ready-design.md](../specs/2026-08-28-evidence-ready-design.md)  
**Sibling:** [backend plan](./2026-08-28-evidence-ready-backend-plan.md)  
**Created:** 2026-08-29  
**Subsystem scope:** Vite + React SPA, Tailwind CSS v4, shadcn/ui, browser session, screens that follow the OpenDesign prototype.

## Summary

Ship the guided-split UI the assessor clicks through. React components rebuild the OpenDesign prototype (not embed its HTML). The SPA imports `src/domain` for planning, applying answers, and readiness; it calls `/api/extract` and `/api/interpret` for live Gemini. Recorded kettle mode must run with no API key. Out of scope: implementing verification/Gemini, a second visual language, login, other product categories, generating manuals.

## Discovery notes

- **Reuse:** Spec §5 journey, §7.2 component map, §10 interface; [`docs/design/opendesign-handoff.md`](../../design/opendesign-handoff.md); local [`prototype/DESIGN.md`](../../../prototype/DESIGN.md) tokens and [`prototype/screens/*.html`](../../../prototype/screens); backend `src/domain` and recorded fixture after backend T2–T5.
- **Constraints:** React + Vite + Tailwind v4 + shadcn/ui. Dossier pane is read-only (ADR 0004). Conflicts are questions. Five statuses + two markers. Verdicts: “Ready for manual authoring” / “Needs evidence review” only. Persistent recorded/live mode badge. No Gemini key in the client bundle.
- **Patterns to follow:** Domain screens compose shadcn primitives (`Badge`, `Sheet`/`Drawer`, `Alert`, `Button`, form `Field`). Semantic tokens from `DESIGN.md` (`--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, `--st-*`). Vite proxy `/api` to the backend server.
- **Anti-goals:** Do not paste prototype markup. Do not use Inter/purple AI chrome. Do not inline-edit the dossier. Do not show a compliance score. Do not call Gemini from the browser.

## File map

### Subsystem: Vite app

| Path | Create/Modify | Responsibility | Public surface |
|------|----------------|----------------|----------------|
| `package.json` | modify | Add Vite, React, Tailwind v4, shadcn, RTL, Playwright. Scripts: `dev`, `dev:server`, `test`, `test:e2e`. | npm scripts |
| `vite.config.ts` | create | React plugin; `/api` proxy to backend; path alias `@`. | Vite config |
| `index.html` | create | SPA shell. | entry |
| `src/main.tsx` | create | Mount, global CSS. | — |
| `src/index.css` | create | Tailwind v4 `@theme` / `:root` bound to `prototype/DESIGN.md` tokens (hex/oklch verbatim). | CSS tokens |
| `components.json` | create | shadcn Vite config. | CLI |
| `src/components/ui/*` | create | Generated shadcn primitives only. | shadcn exports |
| `src/session.ts` | create | Persist dossier + excerpts to `localStorage`; quota failure → in-memory + warning. | `loadSession`, `saveSession` |
| `src/api.ts` | create | `extract`, `interpret` fetch wrappers; never send the key. | `extractFixture`, `extractUpload`, `interpretAnswer` |
| `src/app-state.ts` | create | Phase: intake → extracting → insufficient \| interview → report. | `AppPhase`, reducer |
| `src/App.tsx` | create | Phase switch, chrome (title, product, `ModeBadge`). | root |
| `src/components/ModeBadge.tsx` | create | Persistent recorded/live pill. | `ModeBadge` |
| `src/screens/Intake.tsx` | create | Bundled example + mode radios; upload 1–3 PDF/TXT; privacy + format copy. Follow `intake.html`. | `Intake` |
| `src/screens/ExtractionProgress.tsx` | create | Pipeline steps + counts; recoverable error + retry. Follow `extraction.html`. | `ExtractionProgress` |
| `src/screens/InsufficientEvidence.tsx` | create | What was found; add document / continue anyway. Follow `insufficient.html`. | `InsufficientEvidence` |
| `src/screens/InterviewWorkspace.tsx` | create | Guided split 3fr/2fr; stacks below 980px. Follow `interview.html`. | `InterviewWorkspace` |
| `src/screens/QuestionPanel.tsx` | create | Conflict / missing / unverified shapes; unknown; leave unresolved. | `QuestionPanel` |
| `src/screens/DossierPanel.tsx` | create | Grouped fields, status chips, markers; click opens source, never edits. | `DossierPanel` |
| `src/screens/SourceDrawer.tsx` | create | Quote in captured window; document + page. | `SourceDrawer` |
| `src/screens/ProposalConfirmation.tsx` | create | Accept/dismiss per proposed field. | `ProposalConfirmation` |
| `src/screens/BudgetPause.tsx` | create | After 5 questions: continue or finish. | `BudgetPause` |
| `src/screens/ReadinessReport.tsx` | create | Verdict, blockers, full dossier, mode. Follow `report.html`. | `ReadinessReport` |
| `src/screens/*.test.tsx` | create | Component tests from spec §14 (evidence on confirmed, conflict ≠ confirmed, labels). | RTL |
| `e2e/recorded-kettle.spec.ts` | create | Playwright: intake recorded → conflict → importer → power → report; no live Gemini. | Playwright |
| `.env.example` | modify | Note client needs no key; recorded path works without server env. | — |

### Blast radius

| Path | Why sensitive | Plan mode (before implementation) |
|------|----------------|-----------------------------------|
| `src/index.css` | Visual contract; wrong tokens = parallel design language | medium — bind `DESIGN.md` `:root` verbatim |
| `src/app-state.ts` | All screens read phase/dossier; easy to reintroduce dossier edits | high |
| `src/screens/QuestionPanel.tsx` | Three shapes + proposals; control-plane UX | high |
| `src/screens/DossierPanel.tsx` | Must stay read-only (ADR 0004) | high |
| `vite.config.ts` | Proxy/key leakage if misconfigured | medium — confirm no `GEMINI_KEY` in client define |

## Cross-plan contract

Depends on **backend T1** (package.json), **T2** (types/field table), **T4** (recorded fixture), **T5** (planner/apply/readiness), **T7** (HTTP) for live upload.

Do not duplicate ranking, verification, or readiness in UI helpers — call `src/domain`.

## Workflow (for implementers)

1. **writing-plans** produced this file (type-1 decomposition only).
2. For each subtask: **Plan mode** + **planning-subtasks** → type-2 `.cursor/plans/*.plan.md` when **Plan mode** warrants it.
3. **Agent mode**: **test-driven-development** when **`TDD suitable: yes`** (or the TDD slice of **`partial`**).
4. Update this document if reality diverges; add a **Plan changelog** row.

Suggested order: backend T1–T2, then this T1–T2 (static chrome), backend T4–T5, then this T3–T8.

## Subtasks

### T1 — Vite, Tailwind v4, shadcn

- [ ] **Do:** Scaffold the React SPA on the existing package: Vite, Tailwind v4, shadcn init, `/api` proxy, `dev` script alongside `dev:server`.
- **Blocked by:** backend T1
- **Plan mode:** medium
- **TDD suitable:** no
- **TDD suitable reason:** Generated tooling and declarative config; no product behavior.
- **Verification:** `npm run dev` serves a blank page; shadcn `Button` renders; proxy target documented.

### T2 — Tokens and chrome

- [ ] **Do:** Bind `DESIGN.md` color/type/spacing tokens. App chrome: EvidenceReady, HK-1750 kettle after intake, mode badge, sticky topnav, footer disclaimer. Accent budget: eyebrow + primary CTA only.
- **Blocked by:** T1
- **Plan mode:** skip
- **TDD suitable:** no
- **TDD suitable reason:** Purely visual / token binding; verify against prototype, not pixel unit tests.
- **Verification:** Side-by-side with `prototype/evidenceready-prototype-v2.html` — cream paper, sienna accent, mono citations.

### T3 — Session and phase machine

- [ ] **Do:** Browser session persist (dossier + excerpts); quota fallback; phase reducer intake → extracting → insufficient | interview → report. Extraction mode stored and shown on every post-intake screen.
- **Blocked by:** T1, backend T2
- **Plan mode:** high
- **TDD suitable:** yes
- **Verification:** `npx vitest run src/session src/app-state`

### T4 — Intake

- [ ] **Do:** Bundled kettle CTA with recorded/live radios; upload path with PDF/TXT, 10 MB, no-OCR, Gemini privacy copy. Recorded submit uses fixture JSON via domain pipeline or `POST /api/extract` recorded mode.
- **Blocked by:** T2, T3, backend T4
- **Plan mode:** medium
- **TDD suitable:** partial
- **TDD suitable reason:** TDD file-accept and mode state; layout match to `intake.html` is visual verification.
- **Verification:** RTL: recorded is default; privacy sentence present; `npx vitest run src/screens/Intake`

### T5 — Extraction progress and insufficient evidence

- [ ] **Do:** Observable pipeline + counts + retry. If coverage fails, insufficient screen with add-document / continue-anyway — do not auto-open interview.
- **Blocked by:** T4, backend T3
- **Plan mode:** medium
- **TDD suitable:** partial
- **TDD suitable reason:** TDD “insufficient does not enter interview”; chrome/layout vs prototype is visual.
- **Verification:** `npx vitest run src/screens/ExtractionProgress src/screens/InsufficientEvidence`

### T6 — Interview workspace

- [ ] **Do:** Guided split. Question shapes: capacity conflict, importer missing, unverified power. Source drawer, proposal confirmation, budget pause. Dossier read-only with status chips and markers. Confirming unverified → user-provided.
- **Blocked by:** T5, backend T5
- **Plan mode:** high
- **TDD suitable:** partial
- **TDD suitable reason:** TDD status labels, conflict cannot render as confirmed, proposal requires accept, drawer opens from confirmed row; split/spacing vs `interview.html` is visual.
- **Verification:** `npx vitest run src/screens/QuestionPanel src/screens/DossierPanel src/screens/ProposalConfirmation`

### T7 — Readiness report

- [ ] **Do:** Ready vs needs-evidence-review. Blockers, declared-unavailable vs never-investigated, adjudicated losers retained, rejected candidates, mode badge, criteria copy. No percentage score.
- **Blocked by:** T6, backend T5
- **Plan mode:** medium
- **TDD suitable:** partial
- **TDD suitable reason:** TDD verdict derivation display and forbidden “compliant” copy; report layout vs `report.html` is visual.
- **Verification:** `npx vitest run src/screens/ReadinessReport`

### T8 — Playwright recorded smoke

- [ ] **Do:** One e2e: recorded kettle → progress → adjudicate capacity → importer contact → unverified power → report. No live Gemini. Completes the spec §14 smoke.
- **Blocked by:** T7, backend T4
- **Plan mode:** skip
- **TDD suitable:** yes
- **Verification:** `npx playwright test e2e/recorded-kettle.spec.ts`

## TDD note (Agent mode)

Per subtask, obey **`TDD suitable`**: **`yes`** means strict **test-driven-development** (red/green/refactor); **`partial`** applies it only to the testable slice; **`no`** means do not force test-first—still satisfy **Verification**. UI work here is mostly **`partial`**: lock behavior and labels in RTL; match OpenDesign by eye, not pixel snapshots.

## Plan changelog

| Date | Change |
|------|--------|
| 2026-08-29 | Initial frontend plan |
