// @vitest-environment jsdom
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionPanel } from "./QuestionPanel.js";
import type { DossierField } from "@/domain/types.js";
import type { Question } from "@/domain/planner.js";

function field(overrides: Partial<DossierField> = {}): DossierField {
  return {
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
    conflictCandidates: [
      {
        value: "1.5 L",
        normalizedValue: "1.5 L",
        citation: {
          documentId: "supplier-spec",
          page: 1,
          quote: "Capacity: 1.5 L",
        },
        source: "document",
      },
      {
        value: "1.7 L",
        normalizedValue: "1.7 L",
        citation: {
          documentId: "draft-manual",
          page: 2,
          quote: "Maximum capacity 1.7 L",
        },
        source: "document",
      },
    ],
    adjudicatedLosers: [],
    resolutionHistory: [],
    ...overrides,
  };
}

describe("QuestionPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all conflict candidates as candidate cards", () => {
    const question: Question = { fieldKey: "capacity", shape: "conflict" };

    render(
      <QuestionPanel
        question={question}
        field={field()}
        dossier={[field()]}
        questionNumber={1}
        onAnswer={vi.fn()}
        onLeaveUnresolved={vi.fn()}
        onOpenSource={vi.fn()}
      />,
    );

    expect(screen.getByText("1.5 L")).toBeInTheDocument();
    expect(screen.getByText("1.7 L")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /use 1\.5 l/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /use 1\.7 l/i }),
    ).toBeInTheDocument();
  });

  it("dispatches provide-answer when missing question is submitted with text", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const question: Question = { fieldKey: "importer-contact", shape: "missing" };
    const missingField: DossierField = {
      key: "importer-contact",
      label: "Importer or responsible-party contact",
      group: "Identity and Responsibility",
      tier: "essential",
      valueKind: "prose",
      status: "missing",
      originalValue: null,
      normalizedValue: null,
      markers: [],
      evidence: [],
      rejectedCandidates: [],
      conflictCandidates: [],
      adjudicatedLosers: [],
      resolutionHistory: [],
    };

    render(
      <QuestionPanel
        question={question}
        field={missingField}
        dossier={[missingField]}
        questionNumber={2}
        onAnswer={onAnswer}
        onLeaveUnresolved={vi.fn()}
        onOpenSource={vi.fn()}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: /your answer/i }),
      "Acme Imports Ltd, contact@acme.example",
    );
    await user.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(onAnswer).toHaveBeenCalledWith({
      type: "provide-answer",
      fieldKey: "importer-contact",
      value: "Acme Imports Ltd, contact@acme.example",
    });
  });

  it("dispatches declare-unavailable when missing question is submitted empty", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const question: Question = { fieldKey: "importer-contact", shape: "missing" };
    const missingField: DossierField = {
      key: "importer-contact",
      label: "Importer or responsible-party contact",
      group: "Identity and Responsibility",
      tier: "essential",
      valueKind: "prose",
      status: "missing",
      originalValue: null,
      normalizedValue: null,
      markers: [],
      evidence: [],
      rejectedCandidates: [],
      conflictCandidates: [],
      adjudicatedLosers: [],
      resolutionHistory: [],
    };

    render(
      <QuestionPanel
        question={question}
        field={missingField}
        dossier={[missingField]}
        questionNumber={2}
        onAnswer={onAnswer}
        onLeaveUnresolved={vi.fn()}
        onOpenSource={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(onAnswer).toHaveBeenCalledWith({
      type: "declare-unavailable",
      fieldKey: "importer-contact",
    });
    expect(onAnswer).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "provide-answer" }),
    );
  });
});
