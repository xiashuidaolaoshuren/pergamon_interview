import type { ExtractionMode } from "@/domain/types";

const MODE_LABEL: Record<ExtractionMode, string> = {
  recorded: "Recorded extraction",
  live: "Live extraction",
};

export function ModeBadge({ mode }: { mode: ExtractionMode }) {
  return <span className="pill pill-mode">{MODE_LABEL[mode]}</span>;
}
