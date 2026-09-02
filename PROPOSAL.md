# EvidenceReady — Assessment Proposal

## 1. The problem

Private-label importers often receive supplier specifications and draft manuals that are incomplete, contradictory, or weakly evidenced. A general-purpose model can still turn those files into fluent product prose — but it may conceal gaps, invent certainty, or hide the fact that two documents disagree. Before structured manual authoring begins, someone needs to know what is supported by evidence, what conflicts, and what must still be obtained.

I built **EvidenceReady** as that upstream step: an evidence-intake agent that turns messy supplier documents into a traceable product dossier and reports whether it is **ready for manual authoring**. It does not determine legal compliance or replace a compliance professional.

This problem choice follows what I read on Pergamon's website and LinkedIn. Pergamon's public positioning emphasises that AI should work inside structured, traceable documentation workflows — not as free-form generation from a blank page. Their site describes inputs arriving as specifications, reference documents, and supplier manuals, often incomplete; deterministic structures and rule-based blueprints constraining AI generation; and claims that must remain traceable and suitable for review. They also describe the cost of missing or inconsistent product information: delayed market entry, rejected products, and expensive documentation maintenance.

Pergamon already advertises authoring, translation validation, QR support chat, Digital Product Passport workflows, and production export. Cloning one of those would show less original product thinking. EvidenceReady instead targets a gap their public materials do not clearly solve: preparing a reviewable dossier *before* content generation, with provenance visible at every step.

The bundled demonstration uses an electric kettle because it is understandable without specialist knowledge while still containing meaningful identity, electrical, physical, operational, and safety information.

## 2. What the app does

### Built

- **Intake:** load a bundled ARK-1500 electric-kettle example or upload one to three PDF/TXT documents (max 10 MB each). Image-only PDFs are rejected with an explanation.
- **Extraction modes:** **Recorded extraction** (default) replays a stored extraction response — no API key, always the same conflict, gap, and rejected citation. **Live extraction** sends the same documents to DeepSeek via OpenRouter. The chosen mode is shown in a persistent badge and repeated on the readiness report.
- **Pipeline:** page-aware text extraction → structured candidate extraction → Zod schema validation → exact-quote verification (candidates whose quotes are not found on the cited page become rejected candidates and stay visible) → value-kind normalization → reconciliation into confirmed, conflicting, missing, and unverified fields.
- **Fixed dossier:** fifteen kettle fields defined in a single declarative table (`src/domain/fields.ts`). The model cannot invent fields; importance tiers and question wording come from that table.
- **Adaptive interview:** a deterministic planner asks one question at a time — conflict, missing, or unverified shape — ranked essential before supporting, then conflict before missing before unverified. Conflicts are questions, not a separate click-to-resolve surface. A five-question budget pauses the interview; the user can continue or finish.
- **Answer handling:** deterministic parse first; if the answer is not a clean value, the model proposes field updates. Every proposal is shown for explicit confirmation before it is written. Accepted proposals become user-provided values, never confirmed. A proposal that contradicts a document-confirmed value creates a conflict rather than overwriting it.
- **Readiness report:** deterministic verdict — **ready for manual authoring** or **needs evidence review** — with exact blockers listed. No percentage score and no compliance claim.

The bundled documents produce exactly three essential interview items: a capacity conflict (`1.5 L` vs `1.7 L`), a missing importer contact, and an unverified rated-power value whose citation fails verification.

### Deliberately left unfinished

These were in the implementation plan. I stopped them because of time, not because they were excluded from the product design:


| Planned, not finished           | What I would have done                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full testing beyond the MVP     | Broader component, failure-path, and live-extraction coverage. The recorded kettle smoke and domain unit tests are what I shipped.                                                               |
| UI/UX enhancement and alignment | A second pass against the prototype: spacing, responsive polish, keyboard paths, and copy consistency across screens.                                                                            |
| Detailed code review            | A dedicated review pass after the last feature landed, not only the bugs caught while building.                                                                                                  |
| Model harness                   | A repeatable harness for live extraction and answer interpretation — pin a model, capture fixtures, compare schema-valid output — so vendor swaps are measured rather than discovered in the UI. |


The field table in `src/domain/fields.ts` is the single place to change field set, importance, question text, and readiness behaviour — so a small live edit during the interview is a metadata change, not a refactor.

## 3. How to run it

### Prerequisites

- **Node.js 20+** and **npm**
- Two terminal windows (or tabs)

### Start the app

```bash
git clone https://github.com/xiashuidaolaoshuren/pergamon_interview.git
cd pergamon_interview
npm install
```

**Terminal A — backend**

```bash
npm run dev:server
```

Wait for: `EvidenceReady server listening on http://localhost:8787`

**Terminal B — frontend**

```bash
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in a browser. The Vite dev server proxies `/api` to the backend on port 8787.

### Recorded extraction (no API key)

1. On the intake screen, leave **Recorded extraction — default** selected.
2. Click **Start with bundled example**.
3. Follow the interview through the capacity conflict, importer-contact gap, and unverified power value to the readiness report.

This path never calls OpenRouter. It is the path I expect assessors to follow first.

### Live extraction or uploads (API key required)

1. Copy `.env.example` to `.env.local` in the repository root.
2. Set `OPENROUTER_API_KEY` to a valid OpenRouter key. The key is read only by the server and never sent to the browser.
3. Restart `npm run dev:server` so it picks up the new environment.
4. Select **Live extraction** on the bundled example, or upload one to three PDF/TXT files.

Live extraction uses `deepseek/deepseek-v4-flash-vision-exp` via OpenRouter with text-only prompts. Quote verification and the recorded replay path are unchanged.

### Optional verification

```bash
npm test          # Vitest unit and component tests
npm run test:e2e  # Playwright smoke test (starts both servers automatically)
npm run typecheck # TypeScript check
```

## 4. Architecture and key decisions

### Stack


| Layer      | Choice                                                      |
| ---------- | ----------------------------------------------------------- |
| UI         | React 19, Vite 7, Tailwind CSS v4, shadcn/ui                |
| Server     | Hono on Node, same TypeScript repository                    |
| PDF        | `unpdf` with page boundaries preserved                      |
| Validation | Zod at model and HTTP boundaries                            |
| Tests      | Vitest, React Testing Library, one Playwright smoke test    |
| Session    | Browser-local persistence for dossier and evidence excerpts |


The API key stays on the server. Raw uploads are processed in memory and not stored after the request.

### Processing flow

```
Upload or bundled sample (recorded | live)
  → text and page extraction
  → model candidate extraction, or recorded replay
  → schema validation
  → exact-quote verification (rejected candidates retained)
  → normalization and reconciliation
  → essential-coverage check
  → deterministic question planner
  → answer: deterministic parse, else model proposal → explicit confirmation
  → readiness report
```

### Three decisions that shaped the build

**1. Deterministic control plane, bounded model role**

The model may extract candidate values into a fixed schema and interpret free-text answers into proposals. TypeScript owns field definitions, citation verification, conflict detection, question ranking, dossier writes, and authoring-readiness derivation. The model may not phrase questions, add fields, confirm unsupported citations, auto-resolve conflicts, or decide readiness.

*Trade-off:* more engineering up front than a chatbot prototype, but every state transition is explainable on camera and testable without a live model. I rejected a no-live-model demo because the brief asks for an agentic experience; recorded replay is the honest fallback when the vendor surface moves.

**2. Authoring readiness, not legal compliance**

The app reports whether the dossier can enter a manual-authoring workflow: no essential field missing, no unadjudicated conflict, and every essential value either confirmed or user-provided. It never claims EU compliance or assigns a completeness percentage.

*Trade-off:* a score would look quantitative in a five-minute demo but overclaims coverage I cannot defend in a prototype.

**3. Conflicts are interview questions; the dossier panel is read-only**

Every disagreement — document versus document or user versus document — is resolved through the same interview surface. The planner ranks conflicts ahead of gaps so the agent visibly prioritises contradictions.

*Trade-off:* slower for an expert who might prefer inline editing, but one resolution path, one question budget, and one set of state transitions. Adjudicated losers are retained with provenance; a traceability tool that deletes the evidence it decided against would argue against itself.

## 5. How you worked with AI

### Tools and workflow

I used **Cursor** throughout, which the brief expects. My workflow:

1. Research Pergamon's public site and LinkedIn; brainstorm problem options.
2. Write a design spec and four short ADRs to lock irreversible decisions before coding.
3. Split implementation into backend and frontend plans; implement the domain control plane with test-driven development (RED → GREEN per behaviour).
4. Build the UI against an OpenDesign prototype so layout and provenance labels stayed fixed while domain logic evolved.
5. MVP testing: Vitest on the control plane and screens, plus one Playwright smoke test of the recorded kettle path — enough to prove the assessable workflow, not a full test suite.

What worked well: treating `src/domain/fields.ts` as the single source of truth; fixture-based extraction so the assessable path never depends on staging a model mistake; scoped test runs (`npm test -- -t "pattern"`) so each behaviour failed before the matching production change.

### When AI coding produced something wrong

During a backend review, I found that adjudicating a conflict with a value that was not one of the candidates still confirmed the field — silently picking candidate zero. The generated `applyAdjudicate` logic used `findIndex(...) >= 0 ? selectedIndex : 0`, so a user error became a false audit trail. I fixed it to no-op when nothing matches (same contract as an unknown field key) and added a regression test. The lesson: a fallback index is not a safe default when the missing case is user error.

A related HTTP-boundary bug: `z.custom<DossierField>()` in a request schema accepted `null` and strings at runtime, so malformed dossier payloads threw plain-text 500s instead of the JSON error envelope the UI expects. I replaced it with a real Zod schema and registered a catch-all error handler.

### When live AI integration failed in development

Live extract showed **Gemini service is temporarily unavailable** even with a key configured. Two distinct causes hid behind the same message:

1. A hardcoded `gemini-2.0-flash` id had been retired by Google (June 2026).
2. After swapping models, a direct API call returned `400 FAILED_PRECONDITION: User location is not supported for the API use.`

I routed live calls through OpenRouter to bypass the geo block, then hit a provider ToS restriction on Gemini from my account. The live path now uses DeepSeek via OpenRouter with text-only prompts; unpdf page text and quote verification are unchanged. Recorded extraction remained the deterministic demo throughout. I did not stage a hallucination for the proposal — unsupported-citation rejection is built into the recorded fixture on purpose.

### What I verified manually

I look at the test results first. Then I walk through the entire app workflow myself — recorded intake, extraction, interview, and readiness report — to see whether anything still breaks the core function of the app.

## 6. Honest limitations

- **Quote verification is syntactic, not semantic.** The system proves the cited text appears on the named page. It does not prove the quote supports the extracted value.
- **No "not applicable."** A field without boil-dry protection reports as missing, not absent. Prose fields never conflict — two different intended-use descriptions show one value and one alternate, not a disagreement to resolve.
- **Live extraction is best-effort.** Vendor model ids, account restrictions, and region policy change. Some distinct API failures still map to the same "temporarily unavailable" copy; Retry is the wrong action for a geo or unknown-model error.
- **Kettle schema only.** Uploads accept any PDF or TXT, but extraction, questions, and readiness all run against one 15-field electric-kettle table (`src/domain/fields.ts`). A toaster spec is still scored as a kettle dossier; fields that do not map are discarded, and thin or off-category documents tend to hit insufficient evidence. No OCR, images, spreadsheets, cross-device persistence, or multi-user review.
- **Minor bugs may remain.** I did not have time for a full test pass beyond the MVP. Domain tests and the recorded smoke path cover the core workflow; edge cases and screens I did not walk every time may still hide small defects.
- **The model harness is weak.** Live extraction and answer interpretation can vary from run to run. There is no pinned-output harness that scores or diffs model results, so quality is judged by schema validation, quote verification, and what I see in the UI.
- **UI may not be aligned.** Screens follow the prototype in structure, but I skipped a second visual pass. Spacing, responsive layout, and copy can still drift from the intended design.
- **Time budget.** I spent about thirty hours rather than the eighteen-hour ceiling I originally targeted. I prioritised a complete bundled path with tests and traceable state over visual polish or optional upload refinements.

## 7. What's next

If I joined Pergamon and had one more month on this idea, I would:

1. Finish testing and UI alignment, and tighten the model harness so live extraction is measured rather than judged by eye.
2. Accept rating-label photos, spreadsheets, and OCR-backed documents.
3. Extend beyond kettles. The control plane is already driven by one declarative field table, so a second product category is mostly a new table — prompts, ranking, and readiness follow. Versioned blueprint metadata can come after the kettle MVP path stays solid.
4. Research the feasibility of handing a ready dossier into Pergamon's authoring workflow, and adjacent PIM, ERP, or supplier systems — before committing to an integration.
5. Re-run evidence checks when a source document or product specification changes.
6. Measure extraction accuracy, unsupported-citation rate, unresolved-field rate, and time to authoring readiness — still without a compliance score.

I would still not encode live market or legal requirements in that month. That needs expert-maintained sources; this prototype only reports authoring readiness.

## 8. Time spent

**Around 30 hours**, rough and honest:


| Phase                                                   | Hours (approx.) |
| ------------------------------------------------------- | --------------- |
| Pergamon research, problem choice, design spec and ADRs | 5               |
| Backend control plane (domain, server, fixtures, tests) | 12              |
| Frontend (screens, session, OpenDesign alignment)       | 8               |
| Live-model integration, bug fixes, e2e smoke            | 3               |
| This proposal and run-instruction verification          | 2               |


The original brief suggested keeping scope within about 24 hours. I went over because I wanted a working recorded path, real tests, and defensible architecture — not an ambitious skeleton.