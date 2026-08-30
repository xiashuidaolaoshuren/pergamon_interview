import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ApplyEvent } from "@/domain/apply.js";
import { nextQuestion, shouldPause } from "@/domain/planner.js";
import type { DossierField, Evidence, Proposal } from "@/domain/types.js";
import type { InterviewState } from "@/domain/types.js";
import { BudgetPause } from "./BudgetPause.js";
import { DossierPanel } from "./DossierPanel.js";
import { ProposalConfirmation } from "./ProposalConfirmation.js";
import { QuestionPanel } from "./QuestionPanel.js";
import { SourceDrawer } from "./SourceDrawer.js";

export interface InterviewWorkspaceProps {
  dossier: DossierField[];
  interview: InterviewState;
  onAnswer: (event: ApplyEvent) => void;
  onLeaveUnresolved: (fieldKey: string) => void;
  onContinuePastBudget: () => void;
  onFinish: () => void;
}

interface DrawerState {
  kind: string;
  title: string;
  meta: string;
  passage: string;
  quote: string;
  note: string;
}

const EMPTY_DRAWER: DrawerState = {
  kind: "Evidence",
  title: "",
  meta: "",
  passage: "",
  quote: "",
  note: "",
};

function unresolvedEssentialCount(dossier: DossierField[]): number {
  return dossier.filter(
    (field) =>
      field.tier === "essential" &&
      (field.status === "conflicting" ||
        field.status === "missing" ||
        field.status === "unverified"),
  ).length;
}

function dossierCounts(dossier: DossierField[]): string {
  const confirmed = dossier.filter((field) => field.status === "confirmed").length;
  const unresolved = dossier.filter(
    (field) =>
      field.status === "conflicting" ||
      field.status === "missing" ||
      field.status === "unverified",
  ).length;
  return `${confirmed} confirmed · ${unresolved} unresolved`;
}

export function InterviewWorkspace({
  dossier,
  interview,
  onAnswer,
  onLeaveUnresolved,
  onContinuePastBudget,
  onFinish,
}: InterviewWorkspaceProps) {
  const [drawer, setDrawer] = useState<DrawerState>(EMPTY_DRAWER);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingProposals, setPendingProposals] = useState<Proposal[] | null>(
    null,
  );
  const [flashKey, setFlashKey] = useState<string | null>(null);

  const question = useMemo(
    () => nextQuestion(dossier, interview),
    [dossier, interview],
  );

  const currentField = question
    ? dossier.find((field) => field.key === question.fieldKey)
    : undefined;

  const showBudgetPause = shouldPause(interview) && question !== null;

  function openEvidence(evidence: Evidence, label: string) {
    setDrawer({
      kind: "Evidence",
      title: label,
      meta: `${evidence.documentId} · page ${evidence.page}`,
      passage: evidence.surroundingWindow || evidence.quote,
      quote: evidence.quote,
      note: "Captured passage from the same page. Raw uploads are discarded after processing — this excerpt is what traceability survives a refresh on.",
    });
    setDrawerOpen(true);
  }

  function openRejected(fieldKey: string) {
    const field = dossier.find((entry) => entry.key === fieldKey);
    const rejected = field?.rejectedCandidates[0];
    if (!field || !rejected) return;

    setDrawer({
      kind: "Rejected candidate",
      title: field.label,
      meta: `${rejected.citation.documentId} · cited page ${rejected.citation.page}`,
      passage: rejected.citation.quote,
      quote: rejected.citation.quote,
      note: `Rejected: ${rejected.rejectionReason} A rejected candidate is retained and visible, but it can never support a value.`,
    });
    setDrawerOpen(true);
  }

  function handleAnswer(event: ApplyEvent) {
    setFlashKey("fieldKey" in event ? event.fieldKey : null);
    onAnswer(event);
  }

  return (
    <section className="screen-pad screen-enter">
      <div className="mx-auto max-w-[var(--container)]">
        <div className="row-between flex-wrap">
          <div>
            <p className="eyebrow mb-[6px]">Evidence interview</p>
            <h2 className="text-[clamp(24px,2.6vw,32px)]">
              Resolve what the documents can&apos;t.
            </h2>
          </div>
          <div className="row">
            <span className="meta">
              {interview.questionCount} answered ·{" "}
              {unresolvedEssentialCount(dossier)} essential unresolved
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={onFinish}>
              Finish and view report
            </Button>
          </div>
        </div>

        <div className="split mt-[var(--gap-lg)]">
          <div>
            {question && currentField ? (
              <QuestionPanel
                question={question}
                field={currentField}
                dossier={dossier}
                questionNumber={interview.questionCount + 1}
                onAnswer={handleAnswer}
                onLeaveUnresolved={onLeaveUnresolved}
                onOpenSource={openEvidence}
              />
            ) : (
              <div className="banner stack">
                <h3>Every essential field is resolved.</h3>
                <p className="note text-[var(--fg)]">
                  What remains is supporting information — it enriches the dossier
                  and never blocks readiness. Finish to view the readiness report.
                </p>
                <div className="row">
                  <Button type="button" onClick={onFinish}>
                    Finish and view report
                  </Button>
                </div>
              </div>
            )}
          </div>

          <aside className="dossier">
            <div className="row-between mb-[var(--gap-sm)]">
              <span className="meta uppercase tracking-[0.06em]">
                Live dossier · HK-1750
              </span>
              <span className="meta">{dossierCounts(dossier)}</span>
            </div>
            <div className="card px-[22px] py-[18px]">
              <DossierPanel
                dossier={dossier}
                flashKey={flashKey ?? undefined}
                onOpenSource={openEvidence}
                onOpenRejected={openRejected}
              />
            </div>
          </aside>
        </div>
      </div>

      <SourceDrawer
        open={drawerOpen}
        kind={drawer.kind}
        title={drawer.title}
        meta={drawer.meta}
        passage={drawer.passage}
        quote={drawer.quote}
        note={drawer.note}
        onClose={() => setDrawerOpen(false)}
      />

      <BudgetPause
        open={showBudgetPause}
        onContinue={onContinuePastBudget}
        onFinish={onFinish}
      />

      {pendingProposals ? (
        <div className="modal-veil open">
          <ProposalConfirmation
            proposals={pendingProposals}
            onAccept={(proposals) => {
              setPendingProposals(null);
              onAnswer({ type: "apply-proposals", proposals });
            }}
            onDiscard={() => setPendingProposals(null)}
          />
        </div>
      ) : null}

      {flashKey ? (
        <span className="sr-only" aria-live="polite">
          Updated {flashKey}
        </span>
      ) : null}
    </section>
  );
}
