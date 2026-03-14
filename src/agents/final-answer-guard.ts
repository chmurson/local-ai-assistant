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

export function detectInternalDecisionLeak(text: string): {
  leaked: boolean;
  recoveredFinalAnswer?: string;
} {
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
