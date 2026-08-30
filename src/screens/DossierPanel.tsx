import type { DossierField, Evidence, FieldStatus } from "@/domain/types.js";

export interface DossierPanelProps {
  dossier: DossierField[];
  onOpenSource: (evidence: Evidence, label: string) => void;
  onOpenRejected: (fieldKey: string) => void;
}

const STATUS_LABEL: Record<FieldStatus, string> = {
  confirmed: "Confirmed",
  "user-provided": "User-provided",
  unverified: "Unverified",
  conflicting: "Conflicting",
  missing: "Missing",
};

const STATUS_PILL: Record<FieldStatus, string> = {
  confirmed: "pill-confirmed",
  "user-provided": "pill-user",
  unverified: "pill-unverified",
  conflicting: "pill-conflict",
  missing: "pill-missing",
};

function formatValue(field: DossierField): string {
  const value = field.normalizedValue ?? field.originalValue;
  if (Array.isArray(value)) {
    return value.map(String).join(" ↮ ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function groupOrder(dossier: DossierField[]): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];
  for (const field of dossier) {
    if (!seen.has(field.group)) {
      seen.add(field.group);
      groups.push(field.group);
    }
  }
  return groups;
}

export function DossierPanel({
  dossier,
  onOpenSource,
  onOpenRejected,
}: DossierPanelProps) {
  const groups = groupOrder(dossier);

  return (
    <div className="dossier">
      {groups.map((group) => (
        <div key={group} className="dossier-group">
          <span className="meta">{group}</span>
          {dossier
            .filter((field) => field.group === group)
            .map((field) => (
              <div key={field.key} className="d-row">
                <div className="d-head">
                  <span className="d-label">
                    {field.label}
                    {field.tier === "essential" ? (
                      <span className="tag"> essential</span>
                    ) : null}
                  </span>
                  <span className={`pill ${STATUS_PILL[field.status]}`}>
                    {STATUS_LABEL[field.status]}
                  </span>
                </div>
                {(field.status === "confirmed" ||
                  field.status === "user-provided") && (
                  <>
                    <div className="d-value">{formatValue(field)}</div>
                    {field.markers.includes("adjudicated") ? (
                      <div className="d-sub">
                        <span className="tag">Adjudicated</span> losing candidate
                        retained in report
                      </div>
                    ) : null}
                    {field.status === "user-provided" ? (
                      <div className="d-sub">
                        from the interview · unsupported by any uploaded source
                      </div>
                    ) : null}
                    {field.evidence.length > 0 ? (
                      <div className="d-sub">
                        {field.evidence.map((evidence, index) => (
                          <button
                            key={`${field.key}-${index}`}
                            type="button"
                            className="src-link"
                            onClick={() => onOpenSource(evidence, field.label)}
                          >
                            {evidence.documentId} p.{evidence.page}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
                {field.status === "conflicting" ? (
                  <>
                    <div className="d-value">{formatValue(field)}</div>
                    <div className="d-sub">
                      unadjudicated conflict — asked as a question, never
                      auto-resolved
                    </div>
                  </>
                ) : null}
                {field.status === "missing" ? (
                  <div className="d-sub">
                    {field.markers.includes("declaredUnavailable") ? (
                      <>
                        <span className="tag">Declared unavailable</span> still
                        blocks readiness
                      </>
                    ) : (
                      "no value available"
                    )}
                  </div>
                ) : null}
                {field.status === "unverified" ? (
                  <>
                    <div className="d-value">{formatValue(field)}</div>
                    {field.rejectedCandidates.length > 0 ? (
                      <div className="d-sub">
                        <button
                          type="button"
                          className="src-link"
                          onClick={() => onOpenRejected(field.key)}
                        >
                          citation failed verification
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
