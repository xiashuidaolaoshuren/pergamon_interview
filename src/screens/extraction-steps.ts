export type ExtractionOutcome = "working" | "failed" | "succeeded";

export interface ExtractionProgressState {
  currentStage: number;
  stageStatus: "started" | "done" | null;
}

export function getStepClassName(
  index: number,
  progress: ExtractionProgressState | null,
  stepCount: number,
  outcome: ExtractionOutcome,
): string {
  if (outcome === "succeeded") {
    return "step done";
  }

  if (outcome === "failed") {
    if (!progress) {
      return "step pending";
    }
    const completed =
      index < progress.currentStage ||
      (index === progress.currentStage && progress.stageStatus === "done");
    if (completed) {
      return "step done";
    }
    if (index === progress.currentStage && progress.stageStatus === "started") {
      return "step active";
    }
    return "step pending";
  }

  if (!progress || progress.stageStatus === null) {
    return "step pending";
  }

  if (index < progress.currentStage) {
    return "step done";
  }

  if (index === progress.currentStage) {
    if (progress.stageStatus === "done") {
      return "step done";
    }
    return "step active";
  }

  return "step pending";
}

export function getStepMark(
  index: number,
  progress: ExtractionProgressState | null,
  stepCount: number,
  outcome: ExtractionOutcome,
): string {
  const className = getStepClassName(index, progress, stepCount, outcome);
  if (className.includes("done")) {
    return "✓";
  }
  if (className.includes("active")) {
    return "";
  }
  return "·";
}

export function isActiveStep(
  index: number,
  progress: ExtractionProgressState | null,
  stepCount: number,
  outcome: ExtractionOutcome,
): boolean {
  return getStepClassName(index, progress, stepCount, outcome).includes("active");
}
