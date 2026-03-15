export function buildMainSystemPrompt(params: {
  basePrompt: string;
  enabledTools: string[];
  memorySummary?: string;
}): string {
  return [
    params.basePrompt,
    'You are a practical local assistant.',
    'Use tools only when they materially improve the result.',
    'Never invent tool outputs.',
    `Enabled tools: ${params.enabledTools.join(', ') || 'none'}.`,
    params.enabledTools.includes('web_research')
      ? 'Prefer web_research for browsing websites, reading pages, checking news, searching the web, and current/latest information. Use http_fetch only for technical raw fetch cases such as inspecting exact response bodies, HTML, JSON, headers, or status codes. Do not repeat the same tool call with identical input if an earlier result already exists in this run.'
      : null,
    params.memorySummary ? `Memory summary: ${params.memorySummary}` : null,
    'When asked for a tool decision, return strict JSON only.'
  ]
    .filter(Boolean)
    .join('\n');
}
