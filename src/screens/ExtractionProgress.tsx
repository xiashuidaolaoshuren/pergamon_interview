import { Button } from "@/components/ui/button";
import type { ExtractionCounts, FailedSource } from "@/app-state.js";
import { essentialKeys } from "@/domain/fields.js";
import type { DossierField, ExtractionMode } from "@/domain/types.js";
import { errorRecoveryAction } from "./extraction-errors.js";

export interface ExtractionProgressProps {
  mode: ExtractionMode;
  outcome: "working" | "failed" | "succeeded";
  error: { code: string; message: string; envVar?: string } | null;
  counts: ExtractionCounts | null;
  failedSources: FailedSource[] | undefined;
  dossier: DossierField[];
  onRetry: () => void;
  onUseRecorded: () => void;
  onBackToIntake: () => void;
  onOpenInterview: () => void;
}

const RECORDED_STEPS = [
  "Read 2 documents · 5 pages, page boundaries preserved",
  "Replaying recorded extraction — no model call, no API key",
  "Validated candidates against the dossier schema",
  "Verified each cited quote on its named page",
  "Normalized values by value kind · reconciled into dossier state",
  "Essential-coverage check",
];

const LIVE_STEPS = [
  "Read uploaded documents · page boundaries preserved",
  "Sending document text to Gemini for structured extraction…",
  "Validated candidates against the dossier schema",
  "Verified each cited quote on its named page",
  "Normalized values by value kind · reconciled into dossier state",
  "Essential-coverage check",
];

function modeLabel(mode: ExtractionMode): string {
  return mode === "recorded" ? "Recorded extraction" : "Live extraction";
}

function countUnresolvedEssential(dossier: DossierField[]): number {
  const essential = new Set(essentialKeys());
  return dossier.filter(
    (field) =>
      essential.has(field.key) &&
      (field.status === "conflicting" ||
        field.status === "missing" ||
        field.status === "unverified"),
  ).length;
}

const SUMMARY_STATS: Array<{
  key: keyof ExtractionCounts;
  label: string;
}> = [
  { key: "extracted", label: "candidates extracted" },
  { key: "rejected", label: "citations rejected" },
  { key: "conflicts", label: "conflicts found" },
  { key: "missing", label: "fields missing" },
];

export function ExtractionProgress({
  mode,
  outcome,
  error,
  counts,
  failedSources,
  dossier,
  onRetry,
  onUseRecorded,
  onBackToIntake,
  onOpenInterview,
}: ExtractionProgressProps) {
  const steps = mode === "recorded" ? RECORDED_STEPS : LIVE_STEPS;
  const allDone = outcome === "succeeded" || outcome === "failed";
  const recovery =
    outcome === "failed" && error ? errorRecoveryAction(error.code) : null;

  return (
    <section className="screen-pad">
      <div className="mx-auto max-w-[860px]">
        <p className="eyebrow">
          {modeLabel(mode)} · HK-1750 kettle
        </p>
        <h2>Extracting and verifying the dossier</h2>
        <p className="lead">
          Every candidate must name a document, a page, and an exact quote —
          and the quote must be found on the page it names.
        </p>

        <div className="card mt-[var(--gap-lg)]">
          {steps.map((label, index) => (
            <div
              key={label}
              className={`step ${allDone ? "done" : index === 0 ? "" : "pending"}`}
            >
              <span className="step-mark">{allDone ? "✓" : "·"}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {outcome === "failed" && error && recovery === "missing-key" ? (
          <div
            className="card mt-[var(--gap-md)]"
            style={{
              borderColor:
                "color-mix(in oklch, var(--st-conflict) 45%, var(--border))",
            }}
          >
            <h3>Live extraction needs a Gemini API key</h3>
            <p className="note mt-[8px]">
              The key is read on the server only, never in the browser. Add{" "}
              <span className="meta text-[var(--fg)]">
                {error.envVar ?? "GEMINI_KEY"}=…
              </span>{" "}
              to{" "}
              <span className="meta text-[var(--fg)]">.env.local</span> and
              restart the dev server, then retry. Your uploaded files are still
              staged.
            </p>
            <div className="mt-[var(--gap-md)] flex flex-wrap items-center gap-[var(--gap-md)]">
              <Button type="button" variant="secondary" onClick={onRetry}>
                Retry live extraction
              </Button>
              <Button type="button" onClick={onUseRecorded}>
                Use recorded extraction instead
              </Button>
            </div>
          </div>
        ) : null}

        {outcome === "failed" && error && recovery !== "missing-key" ? (
          <div
            className="card mt-[var(--gap-md)]"
            style={{
              borderColor:
                "color-mix(in oklch, var(--st-conflict) 45%, var(--border))",
            }}
          >
            <h3>Extraction could not complete</h3>
            <p className="note mt-[8px]">{error.message}</p>
            <div className="mt-[var(--gap-md)] flex flex-wrap items-center gap-[var(--gap-md)]">
              {recovery === "back-to-intake" ? (
                <Button type="button" variant="secondary" onClick={onBackToIntake}>
                  Back to intake
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={onRetry}>
                  Retry
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {outcome === "succeeded" && counts ? (
          <div className="mt-[var(--gap-lg)]">
            <div className="grid grid-cols-2 gap-[var(--gap-md)] sm:grid-cols-4">
              {SUMMARY_STATS.map(({ key, label }) => (
                <div key={key} className="stat-cell">
                  <div className="stat-num num">{counts[key]}</div>
                  <p className="stat-label">{label}</p>
                </div>
              ))}
            </div>

            {failedSources && failedSources.length > 0 ? (
              <div className="mt-[var(--gap-md)]">
                <p className="meta">Partial document failure</p>
                <ul className="note mt-[6px] list-none p-0">
                  {failedSources.map((source) => (
                    <li key={source.id}>
                      {source.filename} — {source.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-[var(--gap-lg)] flex flex-wrap items-center gap-[var(--gap-md)]">
              <Button type="button" onClick={onOpenInterview}>
                Open the interview
              </Button>
              <span className="meta">
                {countUnresolvedEssential(dossier)} unresolved essential items
                · conflicts asked first
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
