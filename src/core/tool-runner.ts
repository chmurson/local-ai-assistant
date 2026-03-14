import type { ToolName } from '../types/config.js';
import type { ToolCallRecord } from '../types/trace.js';
import { toolRegistry } from '../tools/index.js';
import { normalizeToolRequest } from './tool-request-normalizer.js';
import { normalizeToolOutput } from './tool-output-normalizer.js';
import { nowIso } from '../utils/now.js';

export async function runTool(params: {
  toolName: ToolName;
  input: unknown;
  userMessage?: string;
  enabledTools: ToolName[];
  policyAllowlist: ToolName[];
  workspaceRoot: string;
  onToolStart?: (toolName: ToolName) => Promise<void> | void;
}): Promise<ToolCallRecord> {
  const startedAt = nowIso();

  const normalizedRequest = normalizeToolRequest({
    toolName: params.toolName,
    input: params.input,
    ...(params.userMessage ? { userMessage: params.userMessage } : {})
  });

  if (!params.enabledTools.includes(normalizedRequest.toolName)) {
    const finishedAt = nowIso();
    return {
      toolName: normalizedRequest.toolName,
      ...(normalizedRequest.toolNormalized ? { originalToolName: params.toolName } : {}),
      input: normalizedRequest.input,
      ...(normalizedRequest.toolNormalized || normalizedRequest.inputNormalized ? { originalInput: params.input } : {}),
      ...(normalizedRequest.toolNormalized ? { toolNormalized: true } : {}),
      ...(normalizedRequest.toolNormalizationNotes.length > 0
        ? { toolNormalizationNotes: normalizedRequest.toolNormalizationNotes }
        : {}),
      ...(normalizedRequest.inputNormalized ? { inputNormalized: true } : {}),
      ...(normalizedRequest.inputNormalizationNotes.length > 0
        ? { inputNormalizationNotes: normalizedRequest.inputNormalizationNotes }
        : {}),
      output: null,
      startedAt,
      finishedAt,
      success: false,
      error: `Tool ${normalizedRequest.toolName} is not enabled`
    };
  }

  if (!params.policyAllowlist.includes(normalizedRequest.toolName)) {
    const finishedAt = nowIso();
    return {
      toolName: normalizedRequest.toolName,
      ...(normalizedRequest.toolNormalized ? { originalToolName: params.toolName } : {}),
      input: normalizedRequest.input,
      ...(normalizedRequest.toolNormalized || normalizedRequest.inputNormalized ? { originalInput: params.input } : {}),
      ...(normalizedRequest.toolNormalized ? { toolNormalized: true } : {}),
      ...(normalizedRequest.toolNormalizationNotes.length > 0
        ? { toolNormalizationNotes: normalizedRequest.toolNormalizationNotes }
        : {}),
      ...(normalizedRequest.inputNormalized ? { inputNormalized: true } : {}),
      ...(normalizedRequest.inputNormalizationNotes.length > 0
        ? { inputNormalizationNotes: normalizedRequest.inputNormalizationNotes }
        : {}),
      output: null,
      startedAt,
      finishedAt,
      success: false,
      error: `Tool ${normalizedRequest.toolName} is not allowed by policy`
    };
  }

  try {
    const effectiveTool = toolRegistry[normalizedRequest.toolName];
    if (!effectiveTool) {
      throw new Error(`Tool ${normalizedRequest.toolName} is not registered`);
    }

    await params.onToolStart?.(normalizedRequest.toolName);

    const rawOutput = await effectiveTool.run(normalizedRequest.input, { workspaceRoot: params.workspaceRoot });
    const { output, outputCapped, outputSummary } = normalizeToolOutput(rawOutput);
    const finishedAt = nowIso();
    return {
      toolName: normalizedRequest.toolName,
      input: normalizedRequest.input,
      ...(normalizedRequest.toolNormalized ? { originalToolName: params.toolName } : {}),
      ...(normalizedRequest.toolNormalized || normalizedRequest.inputNormalized ? { originalInput: params.input } : {}),
      ...(normalizedRequest.toolNormalized ? { toolNormalized: true } : {}),
      ...(normalizedRequest.toolNormalizationNotes.length > 0
        ? { toolNormalizationNotes: normalizedRequest.toolNormalizationNotes }
        : {}),
      ...(normalizedRequest.inputNormalized ? { inputNormalized: true } : {}),
      ...(normalizedRequest.inputNormalizationNotes.length > 0
        ? { inputNormalizationNotes: normalizedRequest.inputNormalizationNotes }
        : {}),
      output,
      ...(outputCapped ? { outputCapped } : {}),
      ...(outputSummary ? { outputSummary } : {}),
      startedAt,
      finishedAt,
      success: true
    };
  } catch (error) {
    const finishedAt = nowIso();
    return {
      toolName: normalizedRequest.toolName,
      input: normalizedRequest.input,
      ...(normalizedRequest.toolNormalized ? { originalToolName: params.toolName } : {}),
      ...(normalizedRequest.toolNormalized || normalizedRequest.inputNormalized ? { originalInput: params.input } : {}),
      ...(normalizedRequest.toolNormalized ? { toolNormalized: true } : {}),
      ...(normalizedRequest.toolNormalizationNotes.length > 0
        ? { toolNormalizationNotes: normalizedRequest.toolNormalizationNotes }
        : {}),
      ...(normalizedRequest.inputNormalized ? { inputNormalized: true } : {}),
      ...(normalizedRequest.inputNormalizationNotes.length > 0
        ? { inputNormalizationNotes: normalizedRequest.inputNormalizationNotes }
        : {}),
      output: null,
      startedAt,
      finishedAt,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown tool error'
    };
  }
}
