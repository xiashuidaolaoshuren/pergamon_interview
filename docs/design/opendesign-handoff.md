# OpenDesign handoff — EvidenceReady UI prototype

Build a **clickable HTML product prototype** (not a landing page, not the Next.js app). Visual treatment is yours. Information hierarchy, states, provenance labels, and interaction boundaries are already decided — do not invent new screens, fields, or copy that contradicts the spec.

## Read first

- Product spec: [`docs/superpowers/specs/2026-08-28-evidence-ready-design.md`](../superpowers/specs/2026-08-28-evidence-ready-design.md)  
  Start at **§3 Product Definition**, then **§5 User Journey**, **§6 Kettle Dossier**, **§7.2 Component Boundaries**, **§10 Interface Design**, **§11 Readiness Policy**. Use the bundled kettle data in §6 — do not invent another product.
- Vocabulary: [`CONTEXT.md`](../../CONTEXT.md)  
  Use those terms. Do not substitute chat, compliance, completeness score, mandatory, or hallucination.

## Locked for this prototype

- **Layout:** guided split. Question left (~60%), live dossier + source right (~40%). Dossier is read-only; conflicts are questions, not click-to-resolve rows.
- **Chrome:** product name EvidenceReady, product under review (HK-1750 kettle), persistent **Recorded / Live extraction** badge after intake.
- **Screens:** intake → extraction progress → (insufficient evidence, if needed) → interview (conflict, missing, unverified) → readiness report. Overlays on the interview: source drawer, proposal confirmation, question-budget pause.
- **Statuses:** Confirmed, User-provided, Unverified, Conflicting, Missing. Markers on top: Adjudicated, Declared unavailable. Never render a conflict as confirmed. Never style a rejected candidate as evidence.
- **Verdict copy only:** “Ready for manual authoring” / “Needs evidence review”. No scores. No “EU-compliant.”
- **Feel:** calm B2B evidence workspace (documentation tooling, not a chatbot, not a purple AI landing page). Provenance is the visual story.

## Click-through to prove

Intake (recorded kettle) → progress → capacity conflict → importer-contact missing → unverified rated power → report. A reviewer should immediately see the split, the mode badge, and that the agent asks about disagreement rather than hiding it.

Out of scope: login, settings, other categories, generated manuals, regulation browsers, extra fictional screens.
