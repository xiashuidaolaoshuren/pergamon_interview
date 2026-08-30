import { useCallback, useEffect, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { ModeBadge } from "@/components/ModeBadge";
import {
  appReducer,
  initialAppState,
  type AppState,
} from "@/app-state";
import { ApiError, extractFixture, extractUpload } from "@/api";
import type { ExtractionMode } from "@/domain/types.js";
import { Intake } from "@/screens/Intake";
import { clearSession, loadSession, saveSession } from "@/session";
import type { StoredSession } from "@/session";

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
          error: { code: apiError.code, message: apiError.message },
        });
      }
    },
    [],
  );

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

      <main className="page-wrap flex flex-1 flex-col py-[var(--gap-xl)]">
        {state.phase === "intake" ? (
          <Intake
            onStartBundled={handleStartBundled}
            onStartUpload={handleStartUpload}
          />
        ) : null}

        {state.phase === "extracting" ? (
          <section className="screen-pad">
            <p className="eyebrow">Extracting dossier</p>
            <h2>Extracting and verifying the dossier</h2>
            <p className="lead mt-[var(--gap-sm)]">
              Every candidate must name a document, a page, and an exact quote.
            </p>
            {state.error ? (
              <p className="note mt-[var(--gap-md)] text-[var(--st-conflict)]">
                {state.error.message}
              </p>
            ) : (
              <p className="note mt-[var(--gap-md)]">Working…</p>
            )}
          </section>
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
