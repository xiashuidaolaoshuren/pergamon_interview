# EvidenceReady Design Specification

**Date:** 2026-08-28  
**Status:** Approved for implementation planning  
**Revised:** 2026-08-28, after a design review that reworked the model boundary, conflict semantics, field importance, and the bundled fixture.

Domain vocabulary for this specification is defined in [`CONTEXT.md`](../../../CONTEXT.md). Where this document says *candidate*, *citation*, *evidence*, *conflict*, *adjudication* or *proposal*, it means them in the glossary's sense.

## 1. Assessment Context

Pergamon Labs asks candidates to build a small, working web application that could advance its goal of bringing an agentic experience to technical documentation. The submission must include working source code, preserved commit history, and a root-level `PROPOSAL.md` explaining the problem choice, scope, architecture, AI-assisted workflow, limitations, next steps, and time spent.

The assessment explicitly favors a focused, well-reasoned application over an ambitious skeleton. It also states that the interview will involve making a small change to the app live, so the application must be shaped to make its own behavior editable on camera.

## 2. Research Findings

Pergamon turns product specifications and other source material into structured, regulation-grounded product manuals, translations, and production exports. Its public positioning emphasizes:

- Non-experts should be able to create reliable product documentation.
- Inputs may be incomplete and arrive as specifications, reference documents, images, audio, video, or supplier manuals.
- Deterministic structures and rule-based blueprints should constrain AI generation.
- Claims and document content should be traceable and suitable for review.
- Product data, labels, manuals, translations, and regulatory requirements must remain consistent as products and rules change.
- Missing or inconsistent information can delay market entry, cause rejected products, and make documentation expensive to maintain.

EvidenceReady focuses on an upstream gap: source documents may be too incomplete, contradictory, or weakly evidenced to support reliable manual authoring. It prepares a traceable product dossier before content generation begins.

Primary research sources:

- [Pergamon home page](https://www.pergamon-labs.com/)
- [Pergamon workflow](https://www.pergamon-labs.com/solutions)
- [Pergamon product features](https://www.pergamon-labs.com/features)
- [Pergamon LinkedIn](https://www.linkedin.com/company/pergamon-labs)
- [EU guidance on technical documentation](https://europa.eu/youreurope/business/product-requirements/compliance/preparing-technical-documentation/index_en.htm)

## 3. Product Definition

### 3.1 Problem

A private-label importer may receive a supplier specification and manual containing missing fields, contradictory values, and unsupported claims. A general-purpose model can turn these files into fluent prose, but it may conceal gaps or invent certainty. The product manager needs to know what is supported, what conflicts, and what must still be obtained before technical authoring starts.

### 3.2 Proposed Solution

EvidenceReady is an evidence-intake agent for product documentation. It extracts a fixed product dossier from uploaded sources, verifies each citation against the source text, identifies gaps and conflicts, and conducts a short adaptive interview. It finishes with a readiness report whose conclusions are derived from visible structured state.

The bundled demonstration uses an electric kettle because it is understandable without specialist knowledge while still containing meaningful identity, electrical, physical, operational, and safety information.

### 3.3 Primary User

A product manager at a private-label importer who receives supplier documents and must hand reliable product information to a technical writer or documentation platform.

### 3.4 Product Claim

EvidenceReady assesses whether a product-information dossier is ready to enter a manual-authoring workflow. It does not determine legal compliance, replace a compliance professional, or certify that a product may enter a market.

## 4. Goals and Non-Goals

### 4.1 Goals

- Turn up to three text-based PDF or TXT documents into a structured kettle dossier.
- Preserve document, page, and exact-quote provenance for every extracted value.
- Reject unsupported citations instead of presenting them as evidence, and keep the rejected candidate visible.
- Distinguish confirmed, user-provided, unverified, conflicting, and missing values.
- Adjudicate disagreement through one interaction, whether it arises between two documents or between a document and the user.
- Ask one high-value question at a time based on the current dossier state.
- Produce a transparent readiness report without a model-generated compliance score.
- Provide a complete bundled example that works reliably during evaluation, with no API key required.
- Keep the field schema a single declarative source of truth, so field set, importance, question text and readiness behavior can be changed live during the interview.

### 4.2 Non-Goals

- Generating the final product manual.
- Retrieving or interpreting live regulations.
- Making legal or regulatory compliance decisions.
- OCR for scanned or image-only PDFs.
- Processing images, audio, video, spreadsheets, or word-processing files.
- Authentication, organizations, roles, or collaborative review.
- A database, cross-device persistence, or production integrations.
- Supporting product categories other than the electric-kettle demonstration schema.
- Translating the dossier or validating translated content.
- Hosted deployment. The deliverable is a repository and `PROPOSAL.md`; a clean clone that starts on the first attempt matters more than a live URL.

## 5. User Journey

### 5.1 Intake

The user either loads the bundled kettle example or uploads one to three PDF/TXT documents of no more than 10 MB each. The screen identifies supported files, explains that image-only PDFs are unsupported, and states that document contents will be sent to Gemini for extraction.

The bundled example offers two modes. **Recorded extraction** is the default: it replays a stored extraction response, needs no API key, and always reproduces the same conflicts, gaps and rejected citation. **Live extraction** sends the same two bundled documents to Gemini. Uploads always run live.

The chosen mode is shown in a persistent badge for the rest of the session and is repeated in the readiness report. A tool whose subject is provenance cannot be ambiguous about the provenance of its own output.

### 5.2 Extraction and Verification

The application:

1. Extracts text while preserving page boundaries.
2. Requests structured candidates from Gemini, or replays the recorded extraction.
3. Validates the response against the application schema. Every candidate must name a document, a page and an exact quote; one missing any of the three fails validation rather than entering the dossier unverified.
4. Verifies that each cited quote appears on the page it names, after conservative whitespace normalization. Candidates that fail become rejected candidates and are retained for display.
5. Normalizes values according to each field's value kind.
6. Reconciles surviving candidates into confirmed values, conflicts, and unresolved fields.
7. Checks essential coverage. If too few essential fields have any candidate, the interview does not open (§5.5).

The interface reports operational results: values extracted, citations rejected, conflicts found, and fields still missing. It does not display hidden chain-of-thought.

### 5.3 Adaptive Interview

The planner selects the highest-ranked unresolved item. Ranking is essential fields before supporting ones; within a tier, conflicts before missing values before unverified values; and declaration order in the field table as the final tie-break. Conflicts are questions, not a separate click-to-resolve surface, so the agent visibly prioritises contradictions over gaps.

Three question shapes exist:

- **Conflict.** The competing candidates side by side, each with its citation and source, and the option to leave the conflict unresolved. This covers both document-versus-document and user-versus-document disagreement.
- **Missing.** The field's question text and rationale, which evidence was already checked, an answer field, a source description, and an explicit option to mark the information unknown.
- **Unverified.** The proposed value, an explanation that its citation could not be located in the source, and the choice to confirm, replace, or reject it. Confirming makes the value user-provided, never confirmed, because no evidence ever supported it.

Question text comes from the field table. The model does not phrase questions: the gain is cosmetic, and a model improvising around field metadata could imply that a prototype field is legally required, which §9 forbids.

Answers are parsed deterministically first. If an answer is not a clean value for the field that was asked, Gemini interprets it into proposed updates, which may touch more than one field. Every proposal is shown for explicit confirmation before it is written, accepted proposals produce user-provided values, and a proposal that contradicts a document-confirmed value creates a conflict rather than overwriting it. Proposals that do not map to a field in the table are discarded.

After each answer the application updates provenance and re-runs the planner. Because a single answer can resolve fields that were never asked about, the remaining sequence changes in response to what the user volunteers.

The interview ends when no essential item is unresolved, or when the user chooses to finish. After five questions the planner pauses and offers to continue or finish; it does not abandon a blocker it has already identified.

### 5.4 Readiness Report

The report shows:

1. Blocking conflicts.
2. Missing essential information, separating fields the user declared unavailable from fields never investigated.
3. Unverified and user-provided values.
4. Adjudicated values, each with the candidate that was not chosen.
5. The complete dossier grouped by topic.
6. Evidence citations for confirmed values, and rejected candidates with the reason they were rejected.
7. A deterministic authoring-readiness conclusion and the criteria that produced it.
8. Whether the session used recorded or live extraction.

### 5.5 Insufficient Evidence

If the documents parse but yield candidates for too few essential fields, the application does not open the interview. It reports what it did find, explains that the documents do not carry enough product information to work from, and offers to add another document or to continue anyway.

Without this state, a marketing PDF turns the agent into a data-entry form that made the user upload a file first. The threshold is a declared constant, not a model judgement.

## 6. Kettle Dossier

The demonstration uses 15 predefined fields. These are workflow requirements for the prototype, not claims about legal requirements.

Each field declares a group, an importance tier, a value kind, a normalization strategy, question text, and a rationale. The table is the single source of truth: it generates the extraction prompt, drives planner ranking, determines readiness, supplies question wording, and groups the dossier view.

**Importance** has two tiers. *Essential* fields must be resolved before the dossier can be authoring-ready. *Supporting* fields enrich it and never block readiness.

**Value kind** decides both normalization and what disagreement means. *Scalar* fields conflict when normalized values differ. *List* fields merge as a union with per-item evidence. *Prose* fields take the first verified source and show other sources as alternates. Without this distinction, two documents describing the same boil sequence in different words would register as a conflict, and the demo would drown its real conflict in noise.

### Identity and Responsibility

| # | Field | Tier | Value kind |
|---|---|---|---|
| 1 | Product name | Essential | Scalar |
| 2 | Model identifier | Essential | Scalar |
| 3 | Manufacturer or supplier | Essential | Scalar |
| 4 | Importer or responsible-party contact | Essential | Prose |

### Electrical and Physical Information

| # | Field | Tier | Value kind |
|---|---|---|---|
| 5 | Rated voltage | Essential | Scalar |
| 6 | Rated frequency | Essential | Scalar |
| 7 | Rated power | Essential | Scalar |
| 8 | Capacity | Essential | Scalar |
| 9 | Primary materials | Supporting | List |

### Use, Safety, and Maintenance

| # | Field | Tier | Value kind |
|---|---|---|---|
| 10 | Included components | Supporting | List |
| 11 | Intended use | Essential | Prose |
| 12 | Core operating steps | Supporting | List |
| 13 | Automatic shut-off or boil-dry protection | Supporting | Prose |
| 14 | Cleaning and descaling restrictions | Supporting | Prose |
| 15 | Disposal information | Supporting | Prose |

Automatic shut-off is deliberately supporting. A kettle that genuinely lacks boil-dry protection would be reported as *missing* rather than *absent*, and the dossier has no way to express "not applicable"; keeping the field out of the essential tier prevents that modelling gap from ever blocking a readiness verdict.

A single quote can support several fields at once, because a rating label commonly carries voltage, frequency and power in one line. Evidence is therefore many-to-one on quotes.

### Bundled Evidence

The repository includes two clearly labeled synthetic documents: a supplier specification and a draft manual. Together they produce exactly three unresolved essential items:

- **Capacity conflicts.** The specification says `1.5 L` and the manual says `1.7 L`, both with verifiable quotes.
- **Importer contact is missing.** Neither document contains it, which is realistic rather than contrived: a supplier does not know who the importer is, because it is the importer's own information. The user answering it is authoritative rather than guessing.
- **Rated power is unverified.** The recorded extraction proposes `2200 W` citing a page where that text does not appear, so verification rejects the citation and the demonstration of that boundary never depends on the live model making a mistake on cue.

Every other essential field is confirmed by the two documents, so the interview runs three questions and can end *ready for manual authoring*.

The recorded answers used by the smoke test parse deterministically, so the automated path never reaches the Gemini answer-interpretation fallback.

## 7. Architecture

### 7.1 Application Shape

EvidenceReady is a single TypeScript repository: a React SPA for the interface and a same-repo Node server for document and Gemini operations. There is no separate API service or database.

Major technical elements:

- React and Vite for the interface.
- Tailwind CSS v4 and shadcn/ui for layout, status chips, forms, drawers, and other primitives. Domain screens (`Intake`, `QuestionPanel`, and the rest of §7.2) compose those primitives; they still consume structured domain data only.
- TypeScript for shared domain contracts.
- A same-repo TypeScript server for PDF text extraction and Gemini calls, so the API key never reaches the browser.
- A single declarative field table as the source of truth for schema, prompt, planning, questions and readiness.
- Gemini for structured extraction and for interpreting free-text answers into proposals.
- Zod for runtime validation of model and API payloads.
- A server-compatible PDF text parser that preserves page boundaries.
- Browser-local session persistence for the structured dossier and captured evidence excerpts.
- Vitest and React Testing Library for deterministic logic and component tests.
- Playwright for one fixture-based smoke test.

The Gemini key is configured through `.env.local`, used only on the server, and never returned to the browser.

### 7.2 Component Boundaries

- `Intake`: sample selection, extraction-mode choice, uploads, restrictions, and privacy notice.
- `ExtractionProgress`: observable pipeline events and recoverable errors.
- `InsufficientEvidence`: the low-coverage outcome and its continue-anyway path.
- `InterviewWorkspace`: phase coordination and approved guided-split layout.
- `QuestionPanel`: one question in its conflict, missing or unverified shape, with rationale, evidence checked, and answer controls.
- `ProposalConfirmation`: model-proposed field updates awaiting explicit acceptance.
- `DossierPanel`: grouped fields, statuses, provenance markers, conflicts, and citation actions.
- `SourceDrawer`: exact quote highlighted within its captured surrounding passage, with document name and page.
- `ReadinessReport`: deterministic summary, extraction mode, and complete traceable dossier.
- `ModeBadge`: persistent recorded-or-live indicator.

Components consume structured domain data. They never render arbitrary model-generated HTML. Visual treatment from the OpenDesign prototype is implemented with Tailwind v4 and shadcn/ui, not by embedding the prototype markup.

### 7.3 Processing Flow

```text
Upload or bundled sample (recorded | live)
  -> text and page extraction
  -> Gemini candidate extraction, or recorded extraction replay
  -> schema validation
  -> exact-quote verification, rejected candidates retained
  -> value-kind normalization and reconciliation
  -> essential-coverage check
  -> dossier state
  -> deterministic question planner
  -> answer: deterministic parse, else Gemini proposal
  -> explicit confirmation and provenance update
  -> planner re-evaluation
  -> readiness report
```

## 8. Domain Model

### 8.1 Document

Stores a generated identifier, filename, media type, size, and extracted pages. Raw uploaded files are not persisted after processing.

### 8.2 Candidate

A proposed value for one field, drawn from one document, before verification and reconciliation. Carries the value, the field key, and a citation. A candidate whose citation fails verification becomes a rejected candidate: retained and displayed, never able to support a value.

The extraction response does not carry a model-supplied confidence score. Verification already answers the question confidence pretends to answer, and much more credibly; a self-reported number would have been the only unverifiable input in a system whose subject is verifiability.

### 8.3 Citation and Evidence

A citation stores the document identifier, page number, and exact quote. It is a claim about provenance. It becomes evidence only once the quote is found on the page it names after conservative whitespace normalization.

Alongside the quote, verification captures a bounded surrounding passage from the same page. This is what the source drawer highlights, and it is what makes traceability survive a page refresh, since raw uploads are discarded after the request and pages are not retained on the server.

### 8.4 Dossier Field

Stores:

- Stable field key and display label.
- Group, importance tier, and value kind.
- Current status.
- Original and normalized value.
- Provenance, including the `adjudicated` and `declared unavailable` markers.
- Evidence references.
- Rejected candidates.
- Resolution history.

Allowed statuses are:

- `confirmed`: supported by evidence.
- `user-provided`: supplied during the interview and unsupported by any uploaded source.
- `unverified`: a candidate value whose citation failed verification; it may shape a follow-up question but cannot satisfy readiness.
- `conflicting`: the field has an unadjudicated conflict.
- `missing`: no value is available.

Status is the readiness axis and stays a five-value enum. Nuance lives in provenance markers rather than in more statuses: an adjudicated value is `confirmed` with a marker, and a field the user declared unavailable is `missing` with a marker. Declaring a field unavailable never unblocks readiness, or a user could answer "I don't know" to every question and reach *ready* with an empty dossier.

### 8.5 Conflict

Stores the field key and the competing candidates with their individual provenance. A candidate may be backed by evidence or asserted by the user, so a product manager correcting a supplier document from a purchase order produces a conflict like any other. Only scalar fields produce conflicts.

The model cannot select a winner. Resolution requires the user to select a candidate, provide new information, or leave the conflict unresolved. Selecting an evidence-backed candidate leaves the field `confirmed` with an `adjudicated` marker; the candidate that lost is retained and shown in the report. A traceability tool that quietly deletes the evidence it decided against is arguing against itself.

### 8.6 Proposal

A field update the model derives from a free-text answer. Stores the target field key, the proposed value, and the answer text it came from. A proposal is never written to the dossier until the user confirms it, can never produce a `confirmed` value, and is discarded if it targets a field outside the table.

### 8.7 Interview State

Stores the current phase, current question, asked fields, answered fields, fields declared unavailable, question count, whether the user elected to continue past the question budget, and the completion reason.

## 9. Agent Behavior and Control Boundary

The agent is an observable, bounded state loop rather than an unrestricted chatbot.

### AI-Assisted Responsibilities

- Map source text to candidate values for fields in the table.
- Return values and citations in a constrained schema.
- Interpret a free-text answer into proposals, which may span more than one field.

### Deterministic Responsibilities

- Define available fields, their importance, and their value kinds.
- Validate all model responses.
- Verify cited quotes and capture their surrounding passages.
- Normalize values and detect conflicts.
- Rank unresolved items and select the next question.
- Supply question wording.
- Apply stop conditions.
- Write every dossier change, including confirmed proposals.
- Determine authoring readiness.
- Render report content and provenance.

### Prohibited Model Decisions

The model may not:

- Add dossier fields.
- Phrase questions.
- Claim that a prototype field is legally mandatory.
- Confirm its own unsupported output.
- Write to the dossier without explicit user confirmation.
- Hide or auto-resolve a conflict.
- Produce a legal-compliance conclusion.
- Decide that the dossier is ready independently of the deterministic policy.

## 10. Interface Design

The approved layout is **A — Guided split**.

During the interview, the current question occupies the larger left area. The live dossier and selected source evidence remain visible on the right. This gives non-experts a focused task while making the agent's state and traceability clear during a short assessment demo.

The application states are:

1. A focused intake screen with extraction-mode choice.
2. An extraction progress view.
3. The insufficient-evidence outcome, where applicable.
4. The guided-split evidence interview.
5. A structured readiness report.

Visual design may be explored in OpenDesign, but the approved information hierarchy, states, provenance labels, and interaction boundaries remain fixed.

## 11. Readiness Policy

The application reports **ready for manual authoring** only when:

- No essential field is missing, including fields the user declared unavailable.
- No conflict remains unadjudicated.
- Every essential value is either confirmed or explicitly user-provided.

An `unverified` value satisfies none of these conditions, because its citation was never located.

User-provided and adjudicated values remain visibly distinct from values confirmed by agreeing sources. Readiness means the prototype dossier can move to authoring; it does not mean the information is legally sufficient or correct.

If the conditions are not met, the report states **needs evidence review** and lists the exact blockers. It does not use a percentage-based compliance score.

## 12. Failure Handling

- Unsupported file type: reject before upload processing and list accepted formats.
- File larger than 10 MB: reject with the size limit.
- Encrypted PDF: explain that an unlocked copy is required.
- Image-only PDF: explain that OCR is outside the prototype scope.
- Empty or unreadable document: retain the intake state and identify the file.
- Readable documents with too little product information: enter the insufficient-evidence state (§5.5).
- Missing Gemini key: provide the exact environment variable setup step, and point to recorded extraction as a no-key path.
- Authentication, quota, rate-limit, or network failure: show a specific recoverable error and retry action.
- Malformed extraction response: attempt one schema-repair retry, then preserve the session and report the extraction failure.
- Unsupported citation: reject the citation as evidence, retain the rejected candidate, mark the field unverified when the value is useful for follow-up, count the rejection, and continue with valid values.
- Answer interpretation failure: store the raw answer against the field that was asked and invite the user to rephrase. The interview never blocks on the model.
- Browser storage quota exceeded: warn that traceability excerpts cannot be persisted, and continue the session in memory.
- Partial multi-document failure: retain values from successful documents and identify failed sources.
- Conflict: require explicit user adjudication or preserve it in the final report.

## 13. Privacy and Security

- The intake screen discloses that extracted document content is sent to Gemini.
- The Gemini key remains in the server environment.
- Keys and raw document content are never written to application logs.
- Raw uploads are processed in memory and not stored after the request.
- Browser persistence contains only structured session data and the captured evidence excerpts needed for traceability.
- Model output is rendered as plain structured values, not executable markup.
- File count, file type, and file size are checked before parsing.
- Prompts delimit both uploaded text and free-text answers as untrusted input, and instruct Gemini not to follow commands found inside them.

This is assessment-grade handling, not a claim of production security or enterprise compliance.

## 14. Verification Strategy

### Unit Tests

- Conservative whitespace normalization for evidence quotes.
- Surrounding-passage capture and its boundaries.
- Electrical-value and capacity normalization.
- Value-kind behavior: scalar conflict detection, list union, prose first-source-wins.
- Duplicate reconciliation on exact and normalized values.
- Conflict detection between two evidence-backed candidates, and between a user assertion and a confirmed value.
- Unsupported-citation rejection and rejected-candidate retention.
- Candidate rejected at validation when a document, page, or quote is absent.
- Question ranking and tie-breaking across tiers and states.
- Question-budget pause, continue, and user-finish stop conditions.
- Essential-coverage threshold for insufficient evidence.
- Readiness derivation, including that a declared-unavailable field still blocks.

### Fixture-Based Pipeline Tests

Fixtures cover:

- A valid extraction response.
- Malformed JSON.
- A fabricated or paraphrased quote.
- Conflicting `1.5 L` and `1.7 L` capacities.
- A missing importer contact.
- A free-text answer producing a multi-field proposal.
- A proposal contradicting a confirmed value.
- Low essential coverage.
- Partial document failure.

### Component Tests

- Every confirmed field exposes its evidence.
- User-provided and adjudicated values carry distinct provenance labels.
- A conflict cannot render as confirmed.
- A rejected candidate is visible and never presented as evidence.
- No proposal reaches the dossier without explicit confirmation.
- The current question changes after state resolution.
- Failure messages preserve retryable state.

### Smoke and Manual Tests

One Playwright smoke test runs the bundled recorded extraction from intake through the capacity conflict, the importer-contact gap and the unverified power value to the readiness report, without a live Gemini call. Manual verification covers live extraction, Gemini failure recovery, refresh behavior, keyboard interaction, responsive layout, and a clean-clone run that follows the README literally.

## 15. Demonstration Script

The target demonstration lasts about five minutes:

1. Explain that unreliable inputs are an upstream risk to reliable AI authoring.
2. Load the bundled kettle example, naming the extraction mode on screen.
3. Show verified extraction and the rejected unsupported citation.
4. Adjudicate the `1.5 L` versus `1.7 L` capacity conflict with both sources open.
5. Answer the missing importer-contact question, and show the value marked user-provided rather than confirmed.
6. Confirm or replace the unverified rated-power value, and show why its citation failed.
7. Show how the question sequence responded to the updated dossier.
8. Finish with the readiness report and traceable evidence.
9. State one honest limitation and the one-month evolution path.

The demo must not depend on producing a fresh model mistake. The recorded extraction demonstrates unsupported-citation rejection deterministically; any real AI failure discussed in `PROPOSAL.md` must come from actual development experience.

## 16. Build Order

Hours are not a binding constraint on this project, so the sequence below is a build order and a scope guard rather than a schedule.

1. Project setup, the declarative field table, and the bundled documents and recorded extraction.
2. A static vertical slice through all five application states.
3. PDF text extraction, Gemini structured output, citation verification, value-kind normalization and reconciliation.
4. The question planner, interview state transitions, proposals and confirmation, and readiness derivation.
5. Failure states, unit and fixture tests, component tests, and the Playwright smoke test.
6. `PROPOSAL.md`, which the brief weighs equally with the code.
7. Visual treatment and responsive polish.
8. A clean-clone run following the README literally, a commit-history review, and a rehearsal of two or three likely live changes.

The stop-building threshold is a complete bundled path with traceable values, one conflict, one gap, one unverified value, adaptive questions, and a readiness report. Optional upload refinements and visual polish cannot put that path at risk.

## 17. Alternatives Considered

### Cross-Artifact Consistency Agent

This would compare a product specification, label, packaging, and manual. It has a strong visual demonstration and aligns with Pergamon's public discussion of consistency. It was not selected because it is closer to a validator than an agent unless remediation scope is added, and severity claims introduce avoidable risk.

### Regulation Change Impact Planner

This would map a regulatory bulletin to affected products and document sections. It has strong business relevance but requires more domain data, carries greater legal-accuracy risk, and overlaps with Pergamon's advertised ongoing-update capabilities.

### Existing Pergamon Feature Clones

A generic manual chatbot, manual generator, translation checker, or Digital Product Passport builder would duplicate features Pergamon already advertises. They would provide weaker evidence of original product thinking.

## 18. One-Month Evolution

If developed beyond the assessment, EvidenceReady would:

1. Add category-specific dossier schemas and versioned blueprint metadata.
2. Accept images, rating-label photos, spreadsheets, and OCR-backed documents.
3. Add human review, approvals, resolution history, and team comments.
4. Connect to PIM, ERP, supplier portals, and Pergamon's authoring workflow.
5. Re-run evidence checks when a source document or product specification changes.
6. Measure extraction accuracy, unsupported-citation rate, unresolved-field rate, and time to authoring readiness.
7. Add policy-backed market and product requirements only with expert-maintained sources and review controls.

## 19. Assessment Success Criteria

The project succeeds when:

- A reviewer can start the bundled example by following the instructions literally.
- The complete path works without a live model call or an API key.
- A live Gemini call can extract structured values from supported documents.
- No confirmed value lacks verified evidence.
- The system visibly preserves uncertainty, conflicts, and rejected candidates.
- The question sequence is determined by current state, including by what the user volunteers.
- A small change to the field set, importance, question text or readiness rule can be made live from one file.
- The product's relevance to Pergamon can be defended from public research.
- The architecture, limitations, AI workflow, and trade-offs can be explained clearly in a live interview.

## 20. Known Modelling Limitations

- A field cannot be marked *not applicable*. A kettle without boil-dry protection reports that field as missing. All affected fields are in the supporting tier, so no readiness verdict depends on the distinction.
- Prose fields never conflict. Two documents describing intended use differently will show one value and one alternate, not a disagreement to resolve.
- Verification proves that a quote exists on the page it names. It does not prove that the quote supports the extracted value.
