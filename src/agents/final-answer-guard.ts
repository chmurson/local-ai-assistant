function tryParseJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstCurly = trimmed.indexOf('{');
    const lastCurly = trimmed.lastIndexOf('}');
    if (firstCurly >= 0 && lastCurly > firstCurly) {
      try {
        return JSON.parse(trimmed.slice(firstCurly, lastCurly + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function looksLikeRawToolCallLeak(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes('<|tool_call_start|>') ||
    normalized.includes('<|tool_call_end|>') ||
    /\[(web_research|web_search|http_fetch|read_file|write_file|list_files|extract_text)\s*\(/i.test(normalized)
  );
}

export function detectInternalDecisionLeak(text: string): {
  leaked: boolean;
  recoveredFinalAnswer?: string;
} {
  if (looksLikeRawToolCallLeak(text)) {
    return { leaked: true };
  }

  const parsed = tryParseJsonObject(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { leaked: false };
  }

  const record = parsed as Record<string, unknown>;
  const decisionKeys = ['planSummary', 'shouldUseTool', 'toolName', 'toolInput', 'finalAnswer'];
  const matchedKeys = decisionKeys.filter((key) => key in record);

  if (matchedKeys.length === 0) {
    return { leaked: false };
  }

  const recoveredFinalAnswer =
    typeof record.finalAnswer === 'string' && record.finalAnswer.trim().length > 0
      ? record.finalAnswer.trim()
      : undefined;

  return {
    leaked: true,
    ...(recoveredFinalAnswer ? { recoveredFinalAnswer } : {})
  };
}
