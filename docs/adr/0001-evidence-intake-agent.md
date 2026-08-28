---
status: accepted
date: 2026-08-28
---

# Choose an evidence-intake agent, not a manual generator or compliance clone

Pergamon already advertises authoring, translation validation, QR support chat, Digital Product Passport workflows, and production export. Cloning those would show less original product thinking. We will build **EvidenceReady**: a bounded agent that turns messy supplier documents into a traceable product dossier before manual authoring starts.

## Considered Options

- **Evidence-intake agent (chosen).** Upload supplier PDFs, extract a fixed kettle dossier, verify citations, interview the user about gaps and conflicts, then emit an authoring-readiness report. Demonstrates a real agent loop (inspect → ask → update → re-plan) on an upstream problem Pergamon’s public site does not clearly solve.
- **Cross-artifact consistency agent.** Compare spec, label, and manual. Strong visual demo and aligned with Pergamon’s “do they line up” message, but closer to a validator unless we also add remediation; severity claims add legal risk.
- **Regulation-change impact planner.** Highest business headline, but the heaviest legal/accuracy risk, more domain data, and overlap with Pergamon’s advertised ongoing-update work.
- **Clone an advertised Pergamon feature.** Generic “chat with a manual,” draft generator, translation checker, or DPP builder. Easy to ship, weak as an interview argument.

## Consequences

The demo must prove messy-input handling, not fluent prose. We will not generate a finished manual, retrieve live regulations, or score legal compliance. The 18-hour stop-building threshold is a complete bundled kettle path with one missing field, one conflict, and an adaptive interview.
