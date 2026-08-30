import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assessCoverage } from "../src/domain/coverage.js";
import { KETTLE_FIELDS } from "../src/domain/fields.js";
import { extractionPrompt } from "../src/domain/prompt.js";
import {
  reconcileCandidates,
  type VerifiedCandidate,
} from "../src/domain/reconcile.js";
import { extractionResponseSchema } from "../src/domain/schemas.js";
import type {
  Candidate,
  DossierField,
  ExtractionMode,
  RejectedCandidate,
} from "../src/domain/types.js";
import { verifyCitation } from "../src/domain/verify.js";
import { extractCandidates, type GeminiTransport } from "./gemini.js";
import { extractPages, PdfExtractError } from "./pdf.js";

interface PageCorpusDocument {
  id: string;
  filename: string;
  pages: Array<{ pageNumber: number; text: string }>;
}

interface PageCorpus {
  documents: PageCorpusDocument[];
}

export interface PipelineUpload {
  id: string;
  filename: string;
  mediaType: string;
  buffer: Buffer;
}

export interface RunExtractionInput {
  mode: ExtractionMode;
  fixtureDir?: string;
  uploads?: PipelineUpload[];
  transport?: GeminiTransport;
  apiKey?: string;
}

export interface FailedSource {
  id: string;
  filename: string;
  code: string;
  message: string;
}

export class AllSourcesFailedError extends Error {
  readonly failedSources: FailedSource[];

  constructor(failedSources: FailedSource[]) {
    super("All uploaded sources failed to parse.");
    this.name = "AllSourcesFailedError";
    this.failedSources = failedSources;
  }
}

export interface RunExtractionResult {
  mode: ExtractionMode;
  dossier: DossierField[];
  rejected: RejectedCandidate[];
  coverage: ReturnType<typeof assessCoverage>;
  counts: {
    extracted: number;
    rejected: number;
    conflicts: number;
    missing: number;
  };
  failedSources?: FailedSource[];
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function buildPageLookup(corpus: PageCorpus): Map<string, Map<number, string>> {
  const lookup = new Map<string, Map<number, string>>();
  for (const document of corpus.documents) {
    const pages = new Map<number, string>();
    for (const page of document.pages) {
      pages.set(page.pageNumber, page.text);
    }
    lookup.set(document.id, pages);
  }
  return lookup;
}

function toCandidate(raw: {
  fieldKey: string;
  value: unknown;
  document: string;
  page: number;
  quote: string;
}): Candidate {
  return {
    fieldKey: raw.fieldKey,
    value: raw.value,
    citation: {
      documentId: raw.document,
      page: raw.page,
      quote: raw.quote,
    },
  };
}

function verifyCandidates(
  candidates: Candidate[],
  pageLookup: Map<string, Map<number, string>>,
): { verified: VerifiedCandidate[]; rejected: RejectedCandidate[] } {
  const verified: VerifiedCandidate[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const candidate of candidates) {
    const pageText =
      pageLookup.get(candidate.citation.documentId)?.get(candidate.citation.page) ??
      "";
    const evidence = verifyCitation(candidate.citation, pageText);
    if (evidence) {
      verified.push({ ...candidate, citation: evidence });
    } else {
      rejected.push({
        ...candidate,
        rejectionReason: "quote not on page",
      });
    }
  }

  return { verified, rejected };
}

function countConflicts(dossier: DossierField[]): number {
  return dossier.filter((field) => field.status === "conflicting").length;
}

function countMissing(dossier: DossierField[]): number {
  return dossier.filter((field) => field.status === "missing").length;
}

async function loadRecordedInputs(fixtureDir: string): Promise<{
  extraction: ReturnType<typeof extractionResponseSchema.parse>;
  corpus: PageCorpus;
}> {
  return {
    extraction: extractionResponseSchema.parse(
      loadJson(join(fixtureDir, "recorded-extraction.json")),
    ),
    corpus: loadJson<PageCorpus>(join(fixtureDir, "recorded-pages.json")),
  };
}

async function loadLiveInputs(
  uploads: PipelineUpload[],
  transport: GeminiTransport | undefined,
  apiKey?: string,
): Promise<{
  extraction: ReturnType<typeof extractionResponseSchema.parse>;
  corpus: PageCorpus;
  failedSources: FailedSource[];
}> {
  const documents: PageCorpusDocument[] = [];
  const failedSources: FailedSource[] = [];

  for (const upload of uploads) {
    try {
      const extracted = await extractPages({
        id: upload.id,
        filename: upload.filename,
        mediaType: upload.mediaType,
        buffer: upload.buffer,
      });
      documents.push({
        id: extracted.id,
        filename: extracted.filename,
        pages: extracted.pages,
      });
    } catch (error) {
      if (error instanceof PdfExtractError) {
        failedSources.push({
          id: upload.id,
          filename: upload.filename,
          code: error.code,
          message: error.message,
        });
        continue;
      }
      throw error;
    }
  }

  if (documents.length === 0) {
    throw new AllSourcesFailedError(failedSources);
  }

  const prompt = extractionPrompt({ documents });
  const extraction = await extractCandidates({
    prompt,
    transport,
    apiKey,
  });

  return {
    extraction,
    corpus: { documents },
    failedSources,
  };
}

export async function runExtraction(
  input: RunExtractionInput,
): Promise<RunExtractionResult> {
  const loaded =
    input.mode === "recorded"
      ? {
          ...(await loadRecordedInputs(input.fixtureDir!)),
          failedSources: [] as FailedSource[],
        }
      : await loadLiveInputs(
          input.uploads ?? [],
          input.transport,
          input.apiKey,
        );

  const { extraction, corpus, failedSources } = loaded;

  const candidates = extraction.candidates.map(toCandidate);
  const pageLookup = buildPageLookup(corpus);
  const { verified, rejected } = verifyCandidates(candidates, pageLookup);
  const dossier = reconcileCandidates({
    evidence: verified,
    rejected,
    fields: KETTLE_FIELDS,
  });
  const coverage = assessCoverage(dossier);

  return {
    mode: input.mode,
    dossier,
    rejected,
    coverage,
    counts: {
      extracted: candidates.length,
      rejected: rejected.length,
      conflicts: countConflicts(dossier),
      missing: countMissing(dossier),
    },
    ...(failedSources.length > 0 ? { failedSources } : {}),
  };
}
