import { Button } from "@/components/ui/button";

export interface SourceDrawerProps {
  open: boolean;
  kind: string;
  title: string;
  meta: string;
  passage: string;
  quote: string;
  note: string;
  onClose: () => void;
}

function highlightPassage(passage: string, quote: string): string {
  if (!quote) return passage;
  const index = passage.indexOf(quote);
  if (index < 0) {
    return `${passage} ${quote}`;
  }
  return (
    passage.slice(0, index) +
    quote +
    passage.slice(index + quote.length)
  );
}

export function SourceDrawer({
  open,
  kind,
  title,
  meta,
  passage,
  quote,
  note,
  onClose,
}: SourceDrawerProps) {
  const highlighted = highlightPassage(passage, quote);
  const parts = highlighted.split(quote);
  const showMark = quote.length > 0 && highlighted.includes(quote);

  return (
    <>
      <div
        className={`drawer-veil ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`drawer ${open ? "open" : ""}`}
        aria-label="Source evidence"
        aria-hidden={!open}
      >
        <div className="row-between">
          <span className="pill pill-mode">{kind}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close ✕
          </Button>
        </div>
        <h3 className="mt-[var(--gap-md)]">{title}</h3>
        <p className="meta mt-[4px]">{meta}</p>
        <div className="passage mt-[var(--gap-md)]">
          {showMark && parts.length > 1
            ? parts.map((part, index) => (
                <span key={index}>
                  {part}
                  {index < parts.length - 1 ? <mark>{quote}</mark> : null}
                </span>
              ))
            : passage}
        </div>
        <p className="note mt-[var(--gap-md)]">{note}</p>
      </aside>
    </>
  );
}
