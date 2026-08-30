import { useEffect, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { ModeBadge } from "@/components/ModeBadge";
import {
  appReducer,
  initialAppState,
  type AppState,
} from "@/app-state";
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

      <main className="page-wrap flex flex-1 flex-col justify-center py-[var(--gap-xl)]">
        <p className="eyebrow">Evidence intake · Product documentation</p>
        <h1 className="max-w-[18ch]">
          Know what your documents can prove before authoring begins.
        </h1>
        <p className="lead mt-[var(--gap-md)]">
          EvidenceReady extracts a fixed product dossier from your source
          documents, verifies every citation against the page it names, and
          interviews you about whatever conflicts or is still missing.
        </p>
        <div className="mt-[var(--gap-lg)]">
          <Button
            type="button"
            onClick={() => dispatch({ type: "start-extract", mode: "recorded" })}
          >
            Load the bundled example
          </Button>
        </div>
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
