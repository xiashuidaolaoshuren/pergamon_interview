import { applyEvent, type ApplyEvent } from "./domain/apply.js";
import { nextQuestion, shouldPause } from "./domain/planner.js";
import type {
  DossierField,
  ExtractionMode,
  InterviewPhase,
  InterviewState,
  RejectedCandidate,
} from "./domain/types.js";

export type AppPhase = InterviewPhase | "extracted";

export interface FailedSource {
  id: string;
  filename: string;
  code: string;
  message: string;
}

export interface ExtractionCounts {
  extracted: number;
  rejected: number;
  conflicts: number;
  missing: number;
}

export interface AppState {
  phase: AppPhase;
  mode: ExtractionMode;
  dossier: DossierField[];
  rejected: RejectedCandidate[];
  counts: ExtractionCounts | null;
  failedSources: FailedSource[] | undefined;
  interview: InterviewState;
  error: { code: string; message: string; envVar?: string } | null;
}

export type AppAction =
  | { type: "start-extract"; mode: ExtractionMode }
  | { type: "extract-success"; coverage: "interview" | "insufficient"; dossier: DossierField[]; rejected: RejectedCandidate[]; counts: ExtractionCounts; failedSources?: FailedSource[]; mode: ExtractionMode }
  | { type: "extract-failure"; error: { code: string; message: string; envVar?: string } }
  | { type: "open-interview" }
  | { type: "continue-anyway" }
  | { type: "answer"; event: ApplyEvent }
  | { type: "finish" }
  | { type: "restart" };

export const initialInterviewState: InterviewState = {
  phase: "intake",
  currentQuestionFieldKey: null,
  askedFieldKeys: [],
  answeredFieldKeys: [],
  declaredUnavailableFieldKeys: [],
  questionCount: 0,
  continuePastBudget: false,
  completionReason: null,
};

export const initialAppState: AppState = {
  phase: "intake",
  mode: "recorded",
  dossier: [],
  rejected: [],
  counts: null,
  failedSources: undefined,
  interview: initialInterviewState,
  error: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  if (action.type === "start-extract") {
    return {
      ...state,
      phase: "extracting",
      mode: action.mode,
      error: null,
    };
  }

  if (action.type === "extract-success") {
    const interview: InterviewState = {
      ...state.interview,
      phase: action.coverage,
      currentQuestionFieldKey: null,
      askedFieldKeys: [],
      answeredFieldKeys: [],
      declaredUnavailableFieldKeys: [],
      questionCount: 0,
      continuePastBudget: false,
      completionReason: null,
    };
    return {
      ...state,
      phase: action.coverage === "interview" ? "extracted" : action.coverage,
      mode: action.mode,
      dossier: action.dossier,
      rejected: action.rejected,
      counts: action.counts,
      failedSources: action.failedSources,
      interview,
      error: null,
    };
  }

  if (action.type === "extract-failure") {
    return {
      ...state,
      error: action.error,
    };
  }

  if (action.type === "open-interview") {
    return {
      ...state,
      phase: "interview",
      interview: {
        ...state.interview,
        phase: "interview",
      },
    };
  }

  if (action.type === "continue-anyway") {
    return {
      ...state,
      phase: "interview",
      interview: {
        ...state.interview,
        phase: "interview",
      },
    };
  }

  if (action.type === "finish") {
    return {
      ...state,
      phase: "report",
      interview: {
        ...state.interview,
        phase: "report",
        completionReason: state.interview.completionReason ?? "user-finished",
      },
    };
  }

  if (action.type === "restart") {
    return initialAppState;
  }

  if (action.type === "answer") {
    const { dossier } = applyEvent(state.dossier, action.event);
    const fieldKey = "fieldKey" in action.event ? action.event.fieldKey : null;
    const askedFieldKeys =
      fieldKey && !state.interview.askedFieldKeys.includes(fieldKey)
        ? [...state.interview.askedFieldKeys, fieldKey]
        : state.interview.askedFieldKeys;
    const answeredFieldKeys =
      fieldKey && action.event.type !== "declare-unavailable"
        ? [...state.interview.answeredFieldKeys, fieldKey]
        : state.interview.answeredFieldKeys;
    const declaredUnavailableFieldKeys =
      action.event.type === "declare-unavailable" && fieldKey
        ? [...state.interview.declaredUnavailableFieldKeys, fieldKey]
        : state.interview.declaredUnavailableFieldKeys;

    const interview: InterviewState = {
      ...state.interview,
      askedFieldKeys,
      answeredFieldKeys,
      declaredUnavailableFieldKeys,
      questionCount: state.interview.questionCount + 1,
    };

    const question = nextQuestion(dossier, interview);
    if (!question) {
      return {
        ...state,
        phase: "report",
        dossier,
        interview: {
          ...interview,
          phase: "report",
          currentQuestionFieldKey: null,
          completionReason: "resolved",
        },
      };
    }

    if (shouldPause(interview)) {
      return {
        ...state,
        phase: "interview",
        dossier,
        interview: {
          ...interview,
          phase: "interview",
          currentQuestionFieldKey: question.fieldKey,
        },
      };
    }

    return {
      ...state,
      phase: "interview",
      dossier,
      interview: {
        ...interview,
        phase: "interview",
        currentQuestionFieldKey: question.fieldKey,
      },
    };
  }

  return state;
}
