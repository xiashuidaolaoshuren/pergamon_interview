# EvidenceReady Design Specification

**Date:** 2026-08-28  
**Status:** Approved for implementation planning

## 1. Assessment Context

Pergamon Labs asks candidates to build a small, working web application that could advance its goal of bringing an agentic experience to technical documentation. The submission must include working source code, preserved commit history, and a root-level `PROPOSAL.md` explaining the problem choice, scope, architecture, AI-assisted workflow, limitations, next steps, and time spent.

The assessment explicitly favors a focused, well-reasoned application over an ambitious skeleton. EvidenceReady is therefore designed as one complete workflow that can be built and verified within 18 hours.

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
- Preserve document, page, and exact-quote provenance for every extracted fact.
- Reject unsupported citations instead of presenting them as evidence.
- Distinguish confirmed, user-provided, unverified, conflicting, and missing values.
- Ask one high-value question at a time based on the current dossier state.
- Produce a transparent readiness report without a model-generated compliance score.
- Provide a complete bundled example that works reliably during evaluation.
- Make the deterministic and AI-assisted boundaries easy to explain and modify live.

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

## 5. User Journey

### 5.1 Intake

The user either loads the bundled messy kettle example or uploads one to three PDF/TXT documents of no more than 10 MB each. The screen identifies supported files, explains that image-only PDFs are unsupported, and states that document contents will be sent to Gemini for extraction.

### 5.2 Extraction and Verification

The application:

1. Extracts text while preserving page boundaries.
2. Requests structured candidate facts from Gemini.
3. Validates the response against the application schema.
4. Confirms that every cited quote appears in the indicated source page.
5. Normalizes comparable values.
6. Reconciles duplicate candidates into confirmed facts, conflicts, or unresolved fields.

The interface reports operational results such as facts extracted, unsupported citations rejected, conflicts found, and missing fields detected. It does not display hidden chain-of-thought.

### 5.3 Adaptive Interview

The planner chooses the highest-priority unresolved field. The workspace shows:

- One focused question.
- Why the field matters to this authoring workflow.
- Which evidence was already checked.
- An answer field and a source description.
- An explicit option to mark the information unknown.
- The evolving dossier and source citations alongside the question.

After each answer, the application updates provenance and re-runs the planner. The sequence therefore changes according to the extracted evidence and the user's answers.

### 5.4 Readiness Report

The final report shows:

1. Blocking conflicts.
2. Missing high-priority information.
3. Unverified and user-provided values.
4. The complete dossier grouped by topic.
5. Evidence citations for confirmed values.
6. A deterministic authoring-readiness conclusion and its criteria.

The interview ends when high-priority issues are resolved, the user chooses to finish, or five questions have been asked.

## 6. Kettle Dossier

The demonstration uses 15 predefined fields. These are workflow requirements for the prototype, not claims about legal requirements.

### Identity and Responsibility

1. Product name.
2. Model identifier.
3. Manufacturer or supplier.
4. Importer or responsible-party contact.

### Electrical and Physical Information

5. Rated voltage.
6. Rated frequency.
7. Rated power.
8. Capacity.
9. Primary materials.

### Use, Safety, and Maintenance

10. Included components.
11. Intended use.
12. Core operating steps.
13. Automatic shut-off or boil-dry protection.
14. Cleaning and descaling restrictions.
15. Disposal information.

Each field has a predefined group, importance, normalization strategy, question template, and explanation. This metadata controls the planner and prevents the model from inventing new requirements.

### Bundled Evidence

The repository includes two clearly labeled synthetic documents: a supplier specification and a draft manual. They agree on several electrical and operating facts, disagree on capacity (`1.5 L` versus `1.7 L`), and both omit rated frequency. A deterministic extraction fixture mirrors these documents and includes one candidate with a fabricated quote so the verification boundary can be demonstrated without depending on live model behavior.

## 7. Architecture

### 7.1 Application Shape

EvidenceReady is a single Next.js and TypeScript application. Next.js renders the interface and hosts server-only document and Gemini operations. There is no separate API service or database.

Major technical elements:

- Next.js App Router for pages and server endpoints.
- TypeScript for shared domain contracts.
- Gemini for structured extraction and constrained answer interpretation.
- Zod for runtime validation of model and API payloads.
- A server-compatible PDF text parser that preserves page boundaries.
- Browser-local session persistence for the structured dossier and verified excerpts.
- Vitest and React Testing Library for deterministic logic and component tests.
- Playwright for one fixture-based smoke test.

The Gemini key is configured through `.env.local`, used only on the server, and never returned to the browser.

### 7.2 Component Boundaries

- `Intake`: sample selection, uploads, restrictions, and privacy notice.
- `ExtractionProgress`: observable pipeline events and recoverable errors.
- `InterviewWorkspace`: phase coordination and approved guided-split layout.
- `QuestionPanel`: one question, rationale, evidence checked, and answer controls.
- `DossierPanel`: grouped fields, statuses, conflicts, and citation actions.
- `SourceDrawer`: exact quote, document name, and page context.
- `ReadinessReport`: deterministic summary and complete traceable dossier.

Components consume structured domain data. They never render arbitrary model-generated HTML.

### 7.3 Processing Flow

```text
Upload or fixture
  -> text and page extraction
  -> Gemini candidate extraction
  -> schema validation
  -> exact-quote verification
  -> normalization and reconciliation
  -> dossier state
  -> deterministic question planner
  -> user answer and provenance update
  -> planner re-evaluation
  -> readiness report
```

## 8. Domain Model

### 8.1 Document

Stores a generated identifier, filename, media type, size, and extracted pages. Raw uploaded files are not persisted after processing.

### 8.2 Evidence Reference

Stores the document identifier, page number, exact quote, and quote-verification result. A candidate cannot become document-confirmed evidence unless its quote is found on the referenced page after conservative whitespace normalization.

### 8.3 Dossier Field

Stores:

- Stable field key and display label.
- Group and importance.
- Current status.
- Original and normalized value.
- Provenance.
- Confidence supplied by the extraction response.
- Evidence references.
- Resolution history.

Allowed statuses are:

- `confirmed`: supported by verified document evidence.
- `user-provided`: supplied during the interview but not confirmed by an uploaded source.
- `unverified`: a candidate value whose claimed citation failed verification; it may guide a follow-up question but cannot satisfy readiness.
- `conflicting`: two or more credible sources disagree.
- `missing`: no value is available.

### 8.4 Conflict

Stores the field key and competing candidates with their individual evidence. The model cannot select a winner. Resolution requires the user to select a supported candidate, provide new information, or leave the conflict unresolved.

### 8.5 Interview State

Stores the current phase, current question, asked fields, answered fields, skipped fields, question count, and completion reason.

## 9. Agent Behavior and Control Boundary

The agent is an observable, bounded state loop rather than an unrestricted chatbot.

### AI-Assisted Responsibilities

- Map source text to candidate dossier fields.
- Return values and citations in a constrained schema.
- Interpret short user answers into proposed structured values when necessary.
- Phrase a selected question naturally using only approved field metadata.

### Deterministic Responsibilities

- Define available fields and their importance.
- Validate all model responses.
- Verify cited quotes.
- Normalize values and detect conflicts.
- Rank unresolved fields.
- Select the next field to ask about.
- Apply stop conditions.
- Determine authoring readiness.
- Render report content and provenance.

### Prohibited Model Decisions

The model may not:

- Add dossier fields.
- Claim that a prototype field is legally mandatory.
- Confirm its own unsupported output.
- Hide or auto-resolve a conflict.
- Produce a legal-compliance conclusion.
- Decide that the dossier is ready independently of the deterministic policy.

## 10. Interface Design

The approved layout is **A — Guided split**.

During the interview, the current question occupies the larger left area. The live dossier and selected source evidence remain visible on the right. This gives non-experts a focused task while making the agent's state and traceability clear during a short assessment demo.

The three application states are:

1. A focused intake screen.
2. The guided-split evidence interview.
3. A structured readiness report.

Visual design may be explored in OpenDesign, but the approved information hierarchy, states, provenance labels, and interaction boundaries remain fixed.

## 11. Readiness Policy

The application reports **ready for manual authoring** only when:

- No high-priority field is missing.
- No conflict remains unresolved.
- Every high-priority value is either document-confirmed or explicitly user-provided.

User-provided values remain visibly different from document-confirmed values. Readiness means the prototype dossier can move to authoring; it does not mean the information is legally sufficient or correct.

If the conditions are not met, the report states **needs evidence review** and lists the exact blockers. It does not use a percentage-based compliance score.

## 12. Failure Handling

- Unsupported file type: reject before upload processing and list accepted formats.
- File larger than 10 MB: reject with the size limit.
- Encrypted PDF: explain that an unlocked copy is required.
- Image-only PDF: explain that OCR is outside the prototype scope.
- Empty or unreadable document: retain the intake state and identify the file.
- Missing Gemini key: provide the exact environment variable setup step.
- Authentication, quota, rate-limit, or network failure: show a specific recoverable error and retry action.
- Malformed model response: attempt one schema-repair retry, then preserve the session and report the extraction failure.
- Unsupported citation: reject the citation as evidence, mark the candidate unverified if it is useful for follow-up, count the rejection, and continue with valid facts.
- Partial multi-document failure: retain facts from successful documents and identify failed sources.
- Conflict: require explicit user resolution or preserve it in the final report.

## 13. Privacy and Security

- The intake screen discloses that extracted document content is sent to Gemini.
- The Gemini key remains in the server environment.
- Keys and raw document content are never written to application logs.
- Raw uploads are processed in memory and not stored after the request.
- Browser persistence contains only structured session data and the verified excerpts needed for traceability.
- Model output is rendered as plain structured values, not executable markup.
- File count, file type, and file size are checked before parsing.
- Prompts delimit uploaded text as untrusted source material and instruct Gemini not to follow commands found inside documents.

This is assessment-grade handling, not a claim of production security or enterprise compliance.

## 14. Verification Strategy

### Unit Tests

- Conservative whitespace normalization for evidence quotes.
- Electrical-value and capacity normalization.
- Exact and normalized duplicate reconciliation.
- Conflict detection.
- Unsupported-citation rejection.
- Question priority and tie-breaking.
- Five-question and user-finish stop conditions.
- Readiness derivation.

### Fixture-Based Pipeline Tests

Fixtures cover:

- A valid extraction response.
- Malformed JSON.
- A fabricated or paraphrased quote.
- Conflicting `1.5 L` and `1.7 L` capacities.
- Missing frequency.
- Partial document failure.

### Component Tests

- Every confirmed field exposes evidence.
- User-provided values have a distinct provenance label.
- A conflict cannot render as confirmed.
- The current question changes after state resolution.
- Failure messages preserve retryable state.

### Smoke and Manual Tests

One Playwright smoke test runs the bundled fixture from intake through two answers to the readiness report without a live Gemini call. Manual verification covers live extraction, Gemini failure recovery, refresh behavior, keyboard interaction, responsive layout, and exact clean-clone setup instructions.

## 15. Demonstration Script

The target demonstration lasts about five minutes:

1. Explain that unreliable inputs are an upstream risk to reliable AI authoring.
2. Load the bundled kettle example.
3. Show verified extraction and any rejected unsupported citation.
4. Open the `1.5 L` versus `1.7 L` capacity conflict and its two sources.
5. Answer the missing-frequency question.
6. Show how the next question changes based on the updated dossier.
7. Finish with the readiness report and traceable evidence.
8. State one honest limitation and the one-month evolution path.

The demo must not depend on producing a fresh model mistake. A deterministic fixture demonstrates unsupported-citation rejection; any real AI failure discussed in `PROPOSAL.md` must come from actual development experience.

## 16. Time Budget

- Hours 1–3: project setup, domain schema, kettle fixtures, static vertical slice, and initial proposal notes.
- Hours 4–8: PDF extraction, Gemini structured output, citation verification, and reconciliation.
- Hours 9–11: interview planner and state transitions.
- Hours 12–14: failure states, fixture tests, and smoke test.
- Hours 15–16: approved OpenDesign treatment and responsive polish.
- Hours 17–18: clean-clone run, deployment check, proposal completion, commit-history review, and buffer.

The stop-building threshold is a complete bundled path with traceable facts, one missing field, one conflict, adaptive questions, and a readiness report. Optional upload refinements and visual polish cannot put that path at risk.

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
- The complete path works without a live model call.
- A live Gemini call can extract structured facts from supported documents.
- No document-confirmed value lacks verified evidence.
- The system visibly preserves uncertainty and conflicts.
- The adaptive question sequence is determined by current state.
- The product's relevance to Pergamon can be defended from public research.
- The architecture, limitations, AI workflow, and trade-offs can be explained clearly in a live interview.
