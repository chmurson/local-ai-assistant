import type { ToolName } from '../types/config.js';
import { normalizeHackerNewsHttpFetch } from './tool-input-rules/http-fetch-hacker-news.js';
import { normalizeHackerNewsWebResearch } from './tool-input-rules/web-research-hacker-news.js';
import { normalizeWeatherWebResearch } from './tool-input-rules/web-research-weather.js';

interface ToolInputNormalizerResult {
  input: unknown;
  changed: boolean;
  note?: string;
}

type ToolInputNormalizer = (params: {
  toolName: ToolName;
  input: unknown;
  userMessage?: string;
}) => ToolInputNormalizerResult;

const toolInputNormalizerRegistry: Partial<Record<ToolName, ToolInputNormalizer[]>> = {
  http_fetch: [
    (params) =>
      normalizeHackerNewsHttpFetch({
        input: params.input,
        ...(params.userMessage ? { userMessage: params.userMessage } : {})
      })
  ],
  web_research: [
    (params) =>
      normalizeWeatherWebResearch({
        input: params.input,
        ...(params.userMessage ? { userMessage: params.userMessage } : {})
      }),
    (params) =>
      normalizeHackerNewsWebResearch({
        input: params.input,
        ...(params.userMessage ? { userMessage: params.userMessage } : {})
      })
  ]
};

export function normalizeToolInput(params: {
  toolName: ToolName;
  input: unknown;
  userMessage?: string;
}): {
  input: unknown;
  normalized: boolean;
  notes: string[];
  originalInput?: unknown;
} {
  const normalizers = toolInputNormalizerRegistry[params.toolName] ?? [];
  let currentInput = params.input;
  const notes: string[] = [];
  let normalized = false;

  for (const normalizer of normalizers) {
    const result = normalizer({
      toolName: params.toolName,
      input: currentInput,
      ...(params.userMessage ? { userMessage: params.userMessage } : {})
    });
    currentInput = result.input;
    normalized = normalized || result.changed;
    if (result.note) {
      notes.push(result.note);
    }
  }

  return {
    input: currentInput,
    normalized,
    notes,
    ...(normalized ? { originalInput: params.input } : {})
  };
}
