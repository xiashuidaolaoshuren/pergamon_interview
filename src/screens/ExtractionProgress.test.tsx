// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExtractionProgress } from "./ExtractionProgress.js";

const defaultHandlers = {
  onRetry: vi.fn(),
  onUseRecorded: vi.fn(),
  onBackToIntake: vi.fn(),
  onOpenInterview: vi.fn(),
};

describe("ExtractionProgress", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function renderWorking(mode: "recorded" | "live" = "recorded") {
    return render(
      <ExtractionProgress
        mode={mode}
        outcome="working"
        error={null}
        counts={null}
        failedSources={undefined}
        dossier={[]}
        animationSession={1}
        onRetry={vi.fn()}
        onUseRecorded={vi.fn()}
        onBackToIntake={vi.fn()}
        onOpenInterview={vi.fn()}
      />,
    );
  }

  function stepElements(): HTMLElement[] {
    return Array.from(document.querySelectorAll(".step"));
  }

  it("starts all steps pending, then activates the first after 350ms while working", async () => {
    vi.useFakeTimers();
    renderWorking();

    const steps = stepElements();
    expect(steps.length).toBeGreaterThan(1);
    for (const step of steps) {
      expect(step).toHaveClass("pending");
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    const activeSteps = stepElements();
    expect(activeSteps[0]).not.toHaveClass("pending");
    expect(activeSteps[0]).not.toHaveClass("done");
    for (const step of activeSteps.slice(1)) {
      expect(step).toHaveClass("pending");
    }
  });

  it("marks the first step done and activates the second after 480ms", async () => {
    vi.useFakeTimers();
    renderWorking();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
      await vi.advanceTimersByTimeAsync(480);
    });

    const steps = stepElements();
    expect(steps[0]).toHaveClass("done");
    expect(steps[0]?.querySelector(".step-mark")?.textContent).toBe("✓");
    expect(steps[1]).not.toHaveClass("pending");
    expect(steps[1]).not.toHaveClass("done");
  });

  it("defers summary until step ticks finish plus 420ms after early success", async () => {
    vi.useFakeTimers();
    const counts = {
      extracted: 13,
      rejected: 1,
      conflicts: 1,
      missing: 3,
    };
    const handlers = {
      onRetry: vi.fn(),
      onUseRecorded: vi.fn(),
      onBackToIntake: vi.fn(),
      onOpenInterview: vi.fn(),
    };

    const { rerender } = render(
      <ExtractionProgress
        mode="recorded"
        outcome="working"
        error={null}
        counts={null}
        failedSources={undefined}
        dossier={[]}
        animationSession={1}
        {...handlers}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    rerender(
      <ExtractionProgress
        mode="recorded"
        outcome="succeeded"
        error={null}
        counts={counts}
        failedSources={undefined}
        dossier={[]}
        animationSession={1}
        {...handlers}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /open the interview/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6 * 480);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(420);
    });

    expect(
      screen.getByRole("button", { name: /open the interview/i }),
    ).toBeInTheDocument();
  });

  it("shows missing-key card with env var setup copy, Retry live, and Use recorded", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onUseRecorded = vi.fn();

    render(
      <ExtractionProgress
        mode="live"
        outcome="failed"
        error={{
          code: "missing-key",
          message: "Gemini API key is not configured.",
          envVar: "GEMINI_KEY",
        }}
        counts={null}
        failedSources={undefined}
        dossier={[]}
        animationSession={0}
        onRetry={onRetry}
        onUseRecorded={onUseRecorded}
        onBackToIntake={vi.fn()}
        onOpenInterview={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /live extraction needs a gemini api key/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/GEMINI_KEY=…/)).toBeInTheDocument();
    expect(screen.getByText(/\.env\.local/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry live extraction/i }));
    expect(onRetry).toHaveBeenCalledOnce();

    await user.click(
      screen.getByRole("button", { name: /use recorded extraction instead/i }),
    );
    expect(onUseRecorded).toHaveBeenCalledOnce();
  });

  it("shows server message and Retry for transient network errors", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <ExtractionProgress
        mode="live"
        outcome="failed"
        error={{ code: "network", message: "Network request failed." }}
        counts={null}
        failedSources={undefined}
        dossier={[]}
        animationSession={0}
        onRetry={onRetry}
        onUseRecorded={vi.fn()}
        onBackToIntake={vi.fn()}
        onOpenInterview={vi.fn()}
      />,
    );

    expect(screen.getByText("Network request failed.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^retry$/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows Back to intake for encrypted file errors", async () => {
    const user = userEvent.setup();
    const onBackToIntake = vi.fn();

    render(
      <ExtractionProgress
        mode="live"
        outcome="failed"
        error={{
          code: "encrypted",
          message: "Encrypted PDF — provide an unlocked copy.",
        }}
        counts={null}
        failedSources={undefined}
        dossier={[]}
        animationSession={0}
        onRetry={vi.fn()}
        onUseRecorded={vi.fn()}
        onBackToIntake={onBackToIntake}
        onOpenInterview={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Encrypted PDF — provide an unlocked copy."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /back to intake/i }));
    expect(onBackToIntake).toHaveBeenCalledOnce();
  });

  it("renders summary stats, failedSources, and Open the interview on success", async () => {
    const user = userEvent.setup();
    const onOpenInterview = vi.fn();

    render(
      <ExtractionProgress
        mode="recorded"
        outcome="succeeded"
        error={null}
        counts={{
          extracted: 13,
          rejected: 1,
          conflicts: 1,
          missing: 3,
        }}
        failedSources={[
          {
            id: "doc-b",
            filename: "broken.pdf",
            code: "empty",
            message: "Document contained no extractable text.",
          },
        ]}
        dossier={[
          {
            key: "capacity",
            label: "Capacity",
            group: "Electrical and Physical Information",
            tier: "essential",
            valueKind: "scalar",
            status: "conflicting",
            originalValue: ["1.5 L", "1.7 L"],
            normalizedValue: ["1.5 L", "1.7 L"],
            markers: [],
            evidence: [],
            rejectedCandidates: [],
            conflictCandidates: [],
            adjudicatedLosers: [],
            resolutionHistory: [],
          },
          {
            key: "product-name",
            label: "Product name",
            group: "Identity and Responsibility",
            tier: "essential",
            valueKind: "scalar",
            status: "confirmed",
            originalValue: "AromaSteam Electric Kettle",
            normalizedValue: "AromaSteam Electric Kettle",
            markers: [],
            evidence: [],
            rejectedCandidates: [],
            conflictCandidates: [],
            adjudicatedLosers: [],
            resolutionHistory: [],
          },
        ]}
        animationSession={0}
        onRetry={vi.fn()}
        onUseRecorded={vi.fn()}
        onBackToIntake={vi.fn()}
        onOpenInterview={onOpenInterview}
      />,
    );

    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText(/candidates extracted/i)).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/citations rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/conflicts found/i)).toBeInTheDocument();
    expect(screen.getByText(/fields missing/i)).toBeInTheDocument();
    expect(screen.getByText(/broken\.pdf/)).toBeInTheDocument();
    expect(
      screen.getByText(/1 unresolved essential items · conflicts asked first/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /open the interview/i }),
    );
    expect(onOpenInterview).toHaveBeenCalledOnce();
  });
});
