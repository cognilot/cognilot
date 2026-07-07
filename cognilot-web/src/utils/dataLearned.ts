export type DataLearnedMap = Record<string, string[]>;

const normalizeString = (value: unknown): string => String(value ?? '').trim();

export function normalizeOptions(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  const normalized: string[] = [];

  rawValues.forEach((item) => {
    const text = normalizeString(item);
    if (text && !normalized.includes(text)) {
      normalized.push(text);
    }
  });

  return normalized;
}

export function normalizeDataLearned(value: unknown): DataLearnedMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: DataLearnedMap = {};

  Object.entries(value as Record<string, unknown>).forEach(([rawKey, rawValue]) => {
    const key = rawKey.replace(/_\d+$/, '').trim();
    if (!key) return;

    const options = normalizeOptions(rawValue);
    if (options.length === 0) return;

    const existing = normalized[key] || [];
    normalized[key] = [...existing, ...options.filter((option) => !existing.includes(option))];
  });

  return normalized;
}

export function flattenDataLearned(value: unknown): Record<string, string> {
  const normalized = normalizeDataLearned(value);
  return Object.fromEntries(
    Object.entries(normalized)
      .filter(([, options]) => options.length > 0)
      .map(([key, options]) => [key, options[0]])
  );
}

export function promoteLearnedValue(current: unknown, key: string, value: unknown): DataLearnedMap {
  const normalized = normalizeDataLearned(current);
  const text = normalizeString(value);
  if (!key || !text) return normalized;

  const existing = normalized[key] || [];
  normalized[key] = [text, ...existing.filter((item) => item !== text)];
  return normalized;
}

export function parseLearnedTextarea(value: string): string[] {
  return normalizeOptions(
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

export function formatLearnedTextarea(values: unknown): string {
  return normalizeOptions(values).join('\n');
}
