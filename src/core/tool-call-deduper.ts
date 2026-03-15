import { normalizeToolRequest } from './tool-request-normalizer.js';
import type { ToolName } from '../types/config.js';
import type { ToolCallRecord } from '../types/trace.js';

function stableStringify(value: unknown): string {
  return JSON.stringify(value) ?? 'null';
}

export function isRepeatedSuccessfulWebResearchRequest(params: {
  toolName: ToolName;
  input: unknown;
  userMessage?: string;
  previousToolCalls: ToolCallRecord[];
}): boolean {
  const normalized = normalizeToolRequest({
    toolName: params.toolName,
    input: params.input,
    ...(params.userMessage ? { userMessage: params.userMessage } : {})
  });

  if (normalized.toolName !== 'web_research') {
    return false;
  }

  const normalizedInput = stableStringify(normalized.input);
  return params.previousToolCalls.some(
    (call) =>
      call.success &&
      call.toolName === 'web_research' &&
      stableStringify(call.input) === normalizedInput
  );
}
