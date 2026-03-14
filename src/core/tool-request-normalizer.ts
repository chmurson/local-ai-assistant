import type { ToolName } from '../types/config.js';
import { normalizeToolInput } from './tool-input-normalizer.js';
import { normalizeHttpFetchToWebResearch } from './tool-request-rules/http-fetch-to-web-research.js';

interface ToolRequestNormalizerResult {
  toolName: ToolName;
  input: unknown;
  changed: boolean;
  note?: string;
}

type ToolRequestNormalizer = (params: {
  toolName: ToolName;
  input: unknown;
  userMessage?: string;
}) => ToolRequestNormalizerResult;

const toolRequestNormalizers: ToolRequestNormalizer[] = [normalizeHttpFetchToWebResearch];

export function normalizeToolRequest(params: {
  toolName: ToolName;
  input: unknown;
  userMessage?: string;
}): {
  toolName: ToolName;
  input: unknown;
  toolNormalized: boolean;
  toolNormalizationNotes: string[];
  inputNormalized: boolean;
  inputNormalizationNotes: string[];
  originalToolName?: ToolName;
  originalInput?: unknown;
} {
  let currentToolName = params.toolName;
  let currentInput = params.input;
  const toolNormalizationNotes: string[] = [];
  let toolNormalized = false;

  for (const normalizer of toolRequestNormalizers) {
    const result = normalizer({
      toolName: currentToolName,
      input: currentInput,
      ...(params.userMessage ? { userMessage: params.userMessage } : {})
    });

    currentToolName = result.toolName;
    currentInput = result.input;
    toolNormalized = toolNormalized || result.changed;
    if (result.note) {
      toolNormalizationNotes.push(result.note);
    }
  }

  const inputNormalization = normalizeToolInput({
    toolName: currentToolName,
    input: currentInput,
    ...(params.userMessage ? { userMessage: params.userMessage } : {})
  });

  return {
    toolName: currentToolName,
    input: inputNormalization.input,
    toolNormalized,
    toolNormalizationNotes,
    inputNormalized: inputNormalization.normalized,
    inputNormalizationNotes: inputNormalization.notes,
    ...(toolNormalized ? { originalToolName: params.toolName } : {}),
    ...(toolNormalized || inputNormalization.normalized ? { originalInput: params.input } : {})
  };
}
