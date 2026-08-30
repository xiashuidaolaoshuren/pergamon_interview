import { useEffect, useRef, useState } from "react";

export const EXTRACTION_START_DELAY_MS = 350;
export const EXTRACTION_TICK_INTERVAL_MS = 480;
export const EXTRACTION_OUTCOME_DELAY_MS = 420;

export type ExtractionOutcome = "working" | "failed" | "succeeded";

export function getStepClassName(
  index: number,
  tickCount: number,
  stepCount: number,
  skipAnimation: boolean,
): string {
  if (skipAnimation || tickCount > stepCount) {
    return "step done";
  }
  if (tickCount === 0) {
    return "step pending";
  }
  if (index < tickCount - 1) {
    return "step done";
  }
  if (index === tickCount - 1) {
    return "step";
  }
  return "step pending";
}

export function getStepMark(
  index: number,
  tickCount: number,
  stepCount: number,
  skipAnimation: boolean,
): string {
  if (skipAnimation || tickCount > stepCount || index < tickCount - 1) {
    return "✓";
  }
  return "·";
}

export function useExtractionStepAnimation(
  stepCount: number,
  outcome: ExtractionOutcome,
  animationSession: number,
): { tickCount: number; showOutcome: boolean } {
  const skipAnimation = outcome !== "working";
  const [tickCount, setTickCount] = useState(() =>
    skipAnimation ? stepCount + 1 : 0,
  );
  const [showOutcome, setShowOutcome] = useState(skipAnimation);
  const outcomeRef = useRef(outcome);
  outcomeRef.current = outcome;

  useEffect(() => {
    if (outcome !== "working") {
      return;
    }

    setTickCount(0);
    setShowOutcome(false);

    let current = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) {
        return;
      }
      current += 1;
      setTickCount(current);
      if (current <= stepCount) {
        timer = setTimeout(tick, EXTRACTION_TICK_INTERVAL_MS);
      }
    };

    timer = setTimeout(tick, EXTRACTION_START_DELAY_MS);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [animationSession, stepCount]);

  useEffect(() => {
    if (outcome === "working") {
      return;
    }
    if (tickCount <= stepCount) {
      return;
    }

    const timer = setTimeout(() => {
      setShowOutcome(true);
    }, EXTRACTION_OUTCOME_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [outcome, stepCount, tickCount]);

  return { tickCount, showOutcome };
}
