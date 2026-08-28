---
status: accepted
date: 2026-08-28
---

# Keep Gemini inside a deterministic control plane

Pergamon’s public claim is “structure first, controlled AI second.” A free-form chatbot would contradict that and make the live interview harder to defend. Gemini may extract candidate facts, phrase an approved question, and interpret a short answer. It may not invent dossier fields, confirm unsupported citations, auto-resolve conflicts, or decide readiness.

## Considered Options

- **Deterministic planner + verified extraction (chosen).** Fixed 15-field schema, Zod validation, exact-quote verification, normalization, a ranked question policy, and a five-question cap. Gemini fills structured slots; TypeScript owns state transitions.
- **Give Gemini more planning autonomy.** Faster to prototype, weaker provenance, harder to explain when the model skips a conflict or invents a requirement.
- **No live model.** Safest to run, but fails the “agentic experience” brief unless the whole demo is a fixture playback.

## Consequences

Readiness is derived from dossier status, not model prose. Unsupported quotes are rejected even if the extracted value looks plausible. The bundled fixture must demonstrate citation rejection without depending on a live Gemini mistake. Stack: Next.js App Router, server-only Gemini key, session state in the browser, no database.
