import type { ToolName } from '../types/config.js';

const allowedToolNames = new Set<ToolName>([
  'read_file',
  'write_file',
  'list_files',
  'http_fetch',
  'extract_text',
  'web_research'
]);

function normalizeToolName(value: unknown): ToolName | null {
  if (typeof value !== 'string') {
    return null;
  }

  return allowedToolNames.has(value as ToolName) ? (value as ToolName) : null;
}

export function tryRecoverDecisionFromToolCallMarkup(text: string): {
  planSummary: string;
  shouldUseTool: true;
  toolName: ToolName;
  toolInput: Record<string, unknown>;
} | null {
  const markerMatch = text.match(/<\|tool_call_start\|>([\s\S]*?)<\|tool_call_end\|>/);
  if (!markerMatch?.[1]) {
    return null;
  }

  try {
    const parsed = JSON.parse(markerMatch[1].trim());
    const firstCall = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!firstCall || typeof firstCall !== 'object') {
      return null;
    }

    const record = firstCall as { name?: unknown; arguments?: unknown };
    const toolName = normalizeToolName(record.name);
    if (!toolName) {
      return null;
    }

    const toolInput =
      record.arguments && typeof record.arguments === 'object' && !Array.isArray(record.arguments)
        ? (record.arguments as Record<string, unknown>)
        : {};

    return {
      planSummary: `Recovered tool request for ${toolName} from raw tool-call markup.`,
      shouldUseTool: true,
      toolName,
      toolInput
    };
  } catch {
    return null;
  }
}
