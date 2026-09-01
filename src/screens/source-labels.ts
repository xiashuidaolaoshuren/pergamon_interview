export function sourceDocLabel(documentId: string): string {
  if (/\.[a-z0-9]+$/i.test(documentId)) {
    return documentId;
  }
  return `${documentId}.pdf`;
}

export function formatFieldValue(field: {
  valueKind: string;
  normalizedValue: unknown;
  originalValue: unknown;
}): string {
  const value = field.normalizedValue ?? field.originalValue;
  if (value === null || value === undefined) {
    return "";
  }
  if (field.valueKind === "list" && Array.isArray(value)) {
    return value.map(String).join(" · ");
  }
  return String(value);
}
