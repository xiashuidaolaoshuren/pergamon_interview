# EvidenceReady

Evidence intake for product documentation — turns messy supplier documents into a traceable product dossier and reports authoring readiness.

**Read [PROPOSAL.md](./PROPOSAL.md) first.** It explains the problem, architecture, and assessment context. The brief requires assessors to follow the run instructions there literally.

## Quick start

**Prerequisites:** Node.js 20+ and npm

```bash
npm install
```

**Terminal A**

```bash
npm run dev:server
```

**Terminal B**

```bash
npm run dev
```

Open **http://localhost:5173**. Use **Recorded extraction** on the bundled kettle example — no API key required.

For live extraction or uploads, copy `.env.example` to `.env.local` and set `OPENROUTER_API_KEY`. See [PROPOSAL.md §3](./PROPOSAL.md#3-how-to-run-it) for full instructions.

## Tests

```bash
npm test
npm run test:e2e
npm run typecheck
```
