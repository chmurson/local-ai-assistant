function looksLikeWeatherMessage(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes('weather') ||
    lowered.includes('forecast') ||
    lowered.includes('pogoda') ||
    lowered.includes('prognoza') ||
    lowered.includes('meteo')
  );
}

function getInputQuery(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const value = (input as Record<string, unknown>).query;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function extractLocationCandidate(message: string): string | null {
  const patterns = [
    /\bweather in ([a-ząćęłńóśźż .-]+)/i,
    /\bforecast for ([a-ząćęłńóśźż .-]+)/i,
    /\b(?:pogoda|prognoza)\s+we?\s+([a-ząćęłńóśźż .-]+)/i,
    /\b(?:pogoda|prognoza)\s+dla\s+([a-ząćęłńóśźż .-]+)/i,
    /\bwe?\s+([a-ząćęłńóśźż .-]+)\s*\?*$/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return value.replace(/[?.!,]+$/, '').trim();
    }
  }

  return null;
}

function extractLocationFromQuery(query: string): string | null {
  const patterns = [
    /site:meteo\.pl\s+([a-ząćęłńóśźż .-]+?)\s+(?:prognoza|pogoda|aktualna)/i,
    /\b([a-ząćęłńóśźż .-]+?)\s+(?:prognoza|pogoda)\b/i
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return value.replace(/[?.!,]+$/, '').trim();
    }
  }

  return null;
}

export function normalizeWeatherWebResearch(params: {
  userMessage?: string;
  input: unknown;
}): {
  input: unknown;
  changed: boolean;
  note?: string;
} {
  if (!params.userMessage || !looksLikeWeatherMessage(params.userMessage)) {
    return { input: params.input, changed: false };
  }

  const currentQuery = getInputQuery(params.input);
  const location =
    extractLocationCandidate(params.userMessage) ??
    (currentQuery ? extractLocationFromQuery(currentQuery) : null) ??
    'Warszawa';
  const query = `site:meteo.pl ${location} prognoza pogody`;

  if (
    currentQuery &&
    currentQuery.trim().toLowerCase() === query.trim().toLowerCase() &&
    typeof params.input === 'object' &&
    params.input !== null &&
    !Array.isArray(params.input)
  ) {
    return { input: params.input, changed: false };
  }

  return {
    input: {
      query,
      depth: 'summary',
      limit: 3
    },
    changed: true,
    note: `Normalized weather lookup to meteo.pl-focused search for ${location}.`
  };
}
