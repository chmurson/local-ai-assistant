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
    params.memorySummary ? `Memory summary: ${params.memorySummary}` : null,
    'When asked for a tool decision, return strict JSON only.'
  ]
    .filter(Boolean)
    .join('\n');
}
