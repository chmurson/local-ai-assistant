const MAX_TOOL_OUTPUT_STRING_CHARS = 12000;
const MAX_TOOL_OUTPUT_ARRAY_ITEMS = 50;
const MAX_TOOL_OUTPUT_OBJECT_KEYS = 80;
const MAX_TOOL_OUTPUT_DEPTH = 5;

function truncateString(value: string): { value: string; capped: boolean } {
  if (value.length <= MAX_TOOL_OUTPUT_STRING_CHARS) {
    return { value, capped: false };
  }

  const omitted = value.length - MAX_TOOL_OUTPUT_STRING_CHARS;
  return {
    value: `${value.slice(0, MAX_TOOL_OUTPUT_STRING_CHARS)}\n...[truncated ${omitted} chars]`,
    capped: true
  };
}

function normalizeRecursive(value: unknown, depth: number): { value: unknown; capped: boolean } {
  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return { value, capped: false };
  }

  if (depth >= MAX_TOOL_OUTPUT_DEPTH) {
    return { value: '[truncated nested value]', capped: true };
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_TOOL_OUTPUT_ARRAY_ITEMS);
    let capped = value.length > MAX_TOOL_OUTPUT_ARRAY_ITEMS;
    const normalizedItems = items.map((item) => {
      const normalized = normalizeRecursive(item, depth + 1);
      capped = capped || normalized.capped;
      return normalized.value;
    });
    return { value: normalizedItems, capped };
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const limitedEntries = entries.slice(0, MAX_TOOL_OUTPUT_OBJECT_KEYS);
    let capped = entries.length > MAX_TOOL_OUTPUT_OBJECT_KEYS;
    const normalizedObject: Record<string, unknown> = {};

    for (const [key, entryValue] of limitedEntries) {
      const normalized = normalizeRecursive(entryValue, depth + 1);
      normalizedObject[key] = normalized.value;
      capped = capped || normalized.capped;
    }

    return { value: normalizedObject, capped };
  }

  return { value: String(value), capped: true };
}

export function normalizeToolOutput(value: unknown): { output: unknown; outputCapped: boolean } {
  const normalized = normalizeRecursive(value, 0);
  return {
    output: normalized.value,
    outputCapped: normalized.capped
  };
}
