import type { ToolName } from '../types/config.js';
import type { ToolCallRecord } from '../types/trace.js';
import { toolRegistry } from '../tools/index.js';
import { normalizeToolOutput } from './tool-output-normalizer.js';
import { nowIso } from '../utils/now.js';

export async function runTool(params: {
  toolName: ToolName;
  input: unknown;
  enabledTools: ToolName[];
  policyAllowlist: ToolName[];
  workspaceRoot: string;
}): Promise<ToolCallRecord> {
  const startedAt = nowIso();

  if (!params.enabledTools.includes(params.toolName)) {
    const finishedAt = nowIso();
    return {
      toolName: params.toolName,
      input: params.input,
      output: null,
      startedAt,
      finishedAt,
      success: false,
      error: `Tool ${params.toolName} is not enabled`
    };
  }

  if (!params.policyAllowlist.includes(params.toolName)) {
    const finishedAt = nowIso();
    return {
      toolName: params.toolName,
      input: params.input,
      output: null,
      startedAt,
      finishedAt,
      success: false,
      error: `Tool ${params.toolName} is not allowed by policy`
    };
  }

  const tool = toolRegistry[params.toolName];
  if (!tool) {
    const finishedAt = nowIso();
    return {
      toolName: params.toolName,
      input: params.input,
      output: null,
      startedAt,
      finishedAt,
      success: false,
      error: `Tool ${params.toolName} is not registered`
    };
  }

  try {
    const rawOutput = await tool.run(params.input, { workspaceRoot: params.workspaceRoot });
    const { output, outputCapped, outputSummary } = normalizeToolOutput(rawOutput);
    const finishedAt = nowIso();
    return {
      toolName: params.toolName,
      input: params.input,
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
      toolName: params.toolName,
      input: params.input,
      output: null,
      startedAt,
      finishedAt,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown tool error'
    };
  }
}
