import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModeBadge } from "@/components/ModeBadge";
import {
  appReducer,
  initialAppState,
  type AppState,
} from "@/app-state";
import { ApiError, extractFixture, extractUpload } from "@/api";
import type { ExtractionMode } from "@/domain/types.js";
import { ExtractionProgress } from "@/screens/ExtractionProgress";
import { InsufficientEvidence } from "@/screens/InsufficientEvidence";
import { Intake } from "@/screens/Intake";
import { clearSession, loadSession, saveSession } from "@/session";
import type { StoredSession } from "@/session";

interface LastExtractRequest {
  mode: ExtractionMode;
  files?: File[];
}

function appStateFromSession(session: StoredSession): AppState {
  return {
    ...initialAppState,
    phase: session.interview.phase,
    mode: session.mode,
    dossier: session.dossier,
    rejected: session.rejected,
    interview: session.interview,
  };
}

function createInitialState(): AppState {
  const session = loadSession();
  return session ? appStateFromSession(session) : initialAppState;
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const lastRequest = useRef<LastExtractRequest | null>(null);
  const [animationSession, setAnimationSession] = useState(0);
  const postIntake = state.phase !== "intake";

  useEffect(() => {
    if (state.phase === "intake") {
      clearSession();
      return;
    }

    saveSession({
      dossier: state.dossier,
      rejected: state.rejected,
      mode: state.mode,
      interview: state.interview,
      excerpts: state.dossier.flatMap((field) => field.evidence),
    });
  }, [state]);

  const startExtraction = useCallback(
    async (mode: ExtractionMode, files?: File[]) => {
      lastRequest.current = { mode, files };
      setAnimationSession((session) => session + 1);
      dispatch({ type: "start-extract", mode });

      try {
        const result = files
          ? await extractUpload(files)
          : await extractFixture(mode);

        dispatch({
          type: "extract-success",
          coverage: result.coverage,
          dossier: result.dossier,
          rejected: result.rejected,
          counts: result.counts,
          failedSources: result.failedSources,
          mode: result.mode,
        });
      } catch (error) {
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError("network", "Network request failed.");
        dispatch({
          type: "extract-failure",
          error: {
            code: apiError.code,
            message: apiError.message,
            envVar: apiError.envVar,
          },
        });
      }
    },
    [],
  );

  const handleRetryExtraction = useCallback(() => {
    const request = lastRequest.current;
    if (!request) {
      return;
    }
    void startExtraction(request.mode, request.files);
  }, [startExtraction]);

  const handleUseRecorded = useCallback(() => {
    void startExtraction("recorded");
  }, [startExtraction]);

  const handleStartBundled = useCallback(
    (mode: ExtractionMode) => {
      void startExtraction(mode);
    },
    [startExtraction],
  );

  const handleStartUpload = useCallback(
    (files: File[]) => {
      void startExtraction("live", files);
    },
    [startExtraction],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="topnav">
        <div className="page-wrap topnav-inner">
          <span className="logo">
            EvidenceReady
            {postIntake ? <span> · HK-1750 kettle</span> : null}
          </span>
          <div className="flex items-center gap-[var(--gap-sm)]">
            {postIntake ? <ModeBadge mode={state.mode} /> : null}
            {postIntake ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: "restart" })}
              >
                Restart session
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="page-wrap flex flex-1 flex-col">
        {state.phase === "intake" ? (
          <Intake
            onStartBundled={handleStartBundled}
            onStartUpload={handleStartUpload}
          />
        ) : null}

        {state.phase === "extracting" || state.phase === "extracted" ? (
          <ExtractionProgress
            mode={state.mode}
            outcome={
              state.phase === "extracted"
                ? "succeeded"
                : state.error
                  ? "failed"
                  : "working"
            }
            error={state.error}
            counts={state.counts}
            failedSources={state.failedSources}
            dossier={state.dossier}
            animationSession={animationSession}
            onRetry={handleRetryExtraction}
            onUseRecorded={handleUseRecorded}
            onBackToIntake={() => dispatch({ type: "restart" })}
            onOpenInterview={() => dispatch({ type: "open-interview" })}
          />
        ) : null}

        {state.phase === "insufficient" ? (
          <InsufficientEvidence
            dossier={state.dossier}
            failedSources={state.failedSources}
            onAddDocument={() => dispatch({ type: "restart" })}
            onContinueAnyway={() => dispatch({ type: "continue-anyway" })}
          />
        ) : null}
      </main>

      <footer className="pagefoot">
        <div className="page-wrap flex flex-col gap-[var(--gap-sm)] sm:flex-row sm:items-center sm:justify-between">
          <span>EvidenceReady · evidence-intake prototype</span>
          <span className="meta">
            Readiness means the dossier can enter authoring — it is not a
            legal-compliance conclusion.
          </span>
        </div>
      </footer>
    </div>
  );
}
