import { z } from 'zod';
import { buildMainSystemPrompt } from './prompts/main-system.js';
import { detectInternalDecisionLeak } from './final-answer-guard.js';
import { generateText } from '../core/llm-client.js';
import { pickMainAgentModel } from '../core/model-router.js';
import { runTool } from '../core/tool-runner.js';
import type { AppConfig } from '../types/config.js';
import type { LongTermMemory } from '../types/memory.js';
import type { AgentStepRecord, MainAgentTrace, ToolCallRecord } from '../types/trace.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/now.js';

const decisionSchema = z
  .object({
    planSummary: z.string(),
    shouldUseTool: z.boolean(),
    toolName: z
      .enum(['read_file', 'write_file', 'list_files', 'http_fetch', 'extract_text', 'web_research'])
      .optional(),
    toolInput: z.unknown().optional(),
    finalAnswer: z.string().optional()
  })
  .strict();

function isPlaceholderFinalAnswer(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === 'done' || normalized === 'done.';
}

function buildMemorySummary(memory: LongTermMemory): string {
  const parts = [
    memory.userPreferences.preferredLanguage
      ? `Preferred language: ${memory.userPreferences.preferredLanguage}`
      : null,
    memory.userPreferences.preferredAnswerStyle
      ? `Style: ${memory.userPreferences.preferredAnswerStyle}`
      : null,
    memory.systemLearning.notes.length > 0
      ? `Notes: ${memory.systemLearning.notes.slice(0, 3).join(' | ')}`
      : null
  ];
  return parts.filter(Boolean).join('; ');
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstCurly = trimmed.indexOf('{');
    const lastCurly = trimmed.lastIndexOf('}');
    if (firstCurly >= 0 && lastCurly > firstCurly) {
      return JSON.parse(trimmed.slice(firstCurly, lastCurly + 1));
    }
    throw new Error('Model output is not valid JSON');
  }
}

function tryExtractJsonObject(text: string): unknown | null {
  try {
    return extractJsonObject(text);
  } catch {
    return null;
  }
}

async function getDecisionWithRetry(params: {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  decisionPrompt: string;
}): Promise<z.infer<typeof decisionSchema> | null> {
  const first = await generateText({
    model: params.model,
    temperature: params.temperature,
    maxOutputTokens: params.maxOutputTokens,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.decisionPrompt }
    ]
  });

  const firstJson = tryExtractJsonObject(first.text);
  const firstParsed = decisionSchema.safeParse(firstJson);
  if (firstParsed.success) {
    return firstParsed.data;
  }

  const repairPrompt = [
    'Rewrite your previous answer into strict JSON only.',
    'Schema: {"planSummary":string,"shouldUseTool":boolean,"toolName"?:string,"toolInput"?:object,"finalAnswer"?:string}',
    'If shouldUseTool is false, finalAnswer must contain the user-facing answer.',
    'Return one JSON object, no markdown, no extra text.',
    `Previous output: ${first.text}`
  ].join('\n');

  const second = await generateText({
    model: params.model,
    temperature: Math.min(params.temperature, 0.2),
    maxOutputTokens: params.maxOutputTokens,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: repairPrompt }
    ]
  });

  const secondJson = tryExtractJsonObject(second.text);
  const secondParsed = decisionSchema.safeParse(secondJson);
  return secondParsed.success ? secondParsed.data : null;
}

function pushStep(steps: AgentStepRecord[], kind: AgentStepRecord['kind'], content: string): void {
  steps.push({ kind, content, timestamp: nowIso() });
}

function getHttpBody(output: unknown): string | null {
  if (!output || typeof output !== 'object') {
    return null;
  }
  const maybeBody = (output as Record<string, unknown>).body;
  return typeof maybeBody === 'string' ? maybeBody : null;
}

function looksLikeHtml(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('<html') || lower.includes('<!doctype html') || lower.includes('<body');
}

function getReadFilePath(input: unknown): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const maybePath = (input as Record<string, unknown>).path;
  return typeof maybePath === 'string' ? maybePath : null;
}

function targetsOutsideWorkspace(path: string): boolean {
  return (
    path.startsWith('~/') ||
    path === '~' ||
    path.startsWith('/') ||
    path.startsWith('../') ||
    path === '..' ||
    /^[A-Za-z]:[\\/]/.test(path)
  );
}

function buildOutsideWorkspaceReply(path: string): string {
  return `I can't read \`${path}\` from this workspace-scoped agent. Paste that file here, or copy the relevant SSH config lines into the repo so I can inspect them.`;
}

export async function executeMainAgent(params: {
  sessionId: string;
  userMessage: string;
  config: AppConfig;
  memory: LongTermMemory;
  workspaceRoot: string;
  onProgress?: (event: { step: number; phase: 'model' | 'tool'; detail: string }) => Promise<void> | void;
}): Promise<MainAgentTrace> {
  const traceId = createId('trace');
  const startedAt = nowIso();
  const steps: AgentStepRecord[] = [];
  const toolCalls: ToolCallRecord[] = [];

  const model = pickMainAgentModel(params.config, params.userMessage);
  const systemPrompt = buildMainSystemPrompt({
    basePrompt: params.config.mainAgent.systemPrompt,
    enabledTools: params.config.mainAgent.enabledTools,
    memorySummary: buildMemorySummary(params.memory)
  });

  const maxToolIterations = Math.min(params.config.policies.maxToolCallsPerRun, 3);
  let finalAnswer = '';
  let planSummary = 'No plan available.';
  let lastDecisionJson = '';
  let success = true;
  let error: string | undefined;
  let progressStep = 0;

  try {
    for (let i = 0; i <= maxToolIterations; i += 1) {
      progressStep += 1;
      await params.onProgress?.({
        step: progressStep,
        phase: 'model',
        detail: i === 0 ? 'analiza pytania' : 'kolejny krok planowania'
      });

      const decisionPrompt = [
        'Return JSON only with schema:',
        '{"planSummary":string,"shouldUseTool":boolean,"toolName"?:string,"toolInput"?:object,"finalAnswer"?:string}',
        'If shouldUseTool is false, finalAnswer is required and must contain the user-facing answer.',
        `User message: ${params.userMessage}`,
        `Iteration: ${i + 1}/${maxToolIterations + 1}`,
        toolCalls.length > 0
          ? `Previous tool results JSON: ${JSON.stringify(toolCalls.map((call) => ({
              tool: call.toolName,
              originalTool: call.originalToolName,
              toolNormalized: call.toolNormalized,
              toolNormalizationNotes: call.toolNormalizationNotes,
              success: call.success,
              input: call.input,
              originalInput: call.originalInput,
              inputNormalized: call.inputNormalized,
              inputNormalizationNotes: call.inputNormalizationNotes,
              output: call.output,
              outputCapped: call.outputCapped,
              outputSummary: call.outputSummary,
              error: call.error
            })))}`
          : 'No previous tool results.'
      ].join('\n');

      const decision = await getDecisionWithRetry({
        model,
        temperature: params.config.mainAgent.temperature,
        maxOutputTokens: params.config.mainAgent.maxOutputTokens,
        systemPrompt,
        decisionPrompt
      });
      if (!decision) {
        pushStep(steps, 'reasoning', 'Agent returned invalid decision JSON; skipping tool step.');
        break;
      }
      lastDecisionJson = JSON.stringify(decision);
      planSummary = decision.planSummary;
      pushStep(steps, 'reasoning', `Agent decided: ${decision.planSummary}`);

      if (!decision.shouldUseTool) {
        finalAnswer = decision.finalAnswer?.trim() ?? '';
        pushStep(
          steps,
          'final',
          finalAnswer
            ? 'Agent returned a direct final answer without additional tools.'
            : 'Agent skipped tools but did not provide finalAnswer; falling back to final answer generation.'
        );
        break;
      }

      if (!decision.toolName) {
        throw new Error('Agent requested tool usage but did not provide toolName');
      }

      if (toolCalls.length >= maxToolIterations) {
        pushStep(steps, 'final', 'Tool limit reached; finalizing response.');
        break;
      }

      pushStep(steps, 'tool_call', `Tool ${decision.toolName} was invoked.`);
      const toolResult = await runTool({
        toolName: decision.toolName,
        input: decision.toolInput ?? {},
        userMessage: params.userMessage,
        enabledTools: params.config.mainAgent.enabledTools,
        policyAllowlist: params.config.policies.toolAllowlist,
        workspaceRoot: params.workspaceRoot,
        onToolStart: (toolName) =>
          params.onProgress?.({
            step: ++progressStep,
            phase: 'tool',
            detail: toolName
          })
      });
      toolCalls.push(toolResult);
      pushStep(
        steps,
        'tool_result',
        toolResult.success
          ? `Tool ${toolResult.toolName} finished successfully${toolResult.toolNormalized ? ` after tool normalization from ${decision.toolName}` : ''}${toolResult.inputNormalized ? ' after input normalization' : ''}${toolResult.outputCapped ? ' with capped output' : ''}.`
          : `Tool ${toolResult.toolName} failed: ${toolResult.error ?? 'unknown error'}`
      );
      if (toolResult.toolNormalizationNotes && toolResult.toolNormalizationNotes.length > 0) {
        for (const note of toolResult.toolNormalizationNotes) {
          pushStep(steps, 'reasoning', note);
        }
      }
      if (toolResult.inputNormalizationNotes && toolResult.inputNormalizationNotes.length > 0) {
        for (const note of toolResult.inputNormalizationNotes) {
          pushStep(steps, 'reasoning', note);
        }
      }

      const readFilePath = decision.toolName === 'read_file' ? getReadFilePath(decision.toolInput) : null;
      if (
        decision.toolName === 'read_file' &&
        !toolResult.success &&
        readFilePath &&
        targetsOutsideWorkspace(readFilePath)
      ) {
        finalAnswer = buildOutsideWorkspaceReply(readFilePath);
        pushStep(
          steps,
          'final',
          `Read of ${readFilePath} is outside workspace scope; asking user to paste the file instead of retrying.`
        );
        break;
      }

      // Auto-postprocess HTML pages so the model receives readable text from web fetches.
      if (
        decision.toolName === 'http_fetch' &&
        toolResult.success &&
        toolCalls.length < maxToolIterations &&
        params.config.mainAgent.enabledTools.includes('extract_text') &&
        params.config.policies.toolAllowlist.includes('extract_text')
      ) {
        const body = getHttpBody(toolResult.output);
        if (body && looksLikeHtml(body)) {
          pushStep(steps, 'tool_call', 'Auto tool extract_text was invoked to clean fetched HTML.');
          const extractResult = await runTool({
            toolName: 'extract_text',
            input: { html: body, aggressive: true, maxChars: 20000 },
            userMessage: params.userMessage,
            enabledTools: params.config.mainAgent.enabledTools,
            policyAllowlist: params.config.policies.toolAllowlist,
            workspaceRoot: params.workspaceRoot,
            onToolStart: (toolName) =>
              params.onProgress?.({
                step: ++progressStep,
                phase: 'tool',
                detail: toolName
              })
          });
          toolCalls.push(extractResult);
          pushStep(
            steps,
            'tool_result',
            extractResult.success
              ? `Auto tool extract_text finished successfully${extractResult.outputCapped ? ' with capped output' : ''}.`
              : `Auto tool extract_text failed: ${extractResult.error ?? 'unknown error'}`
          );
        }
      }
    }

    if (!finalAnswer) {
      progressStep += 1;
      await params.onProgress?.({
        step: progressStep,
        phase: 'model',
        detail: 'finalizacja odpowiedzi'
      });

      const finalizePrompt = [
        `User message: ${params.userMessage}`,
        `Decision JSON: ${lastDecisionJson || '{}'}`,
        `Tool results: ${JSON.stringify(toolCalls.map((call) => ({
          toolName: call.toolName,
          originalToolName: call.originalToolName,
          toolNormalized: call.toolNormalized,
          toolNormalizationNotes: call.toolNormalizationNotes,
          success: call.success,
          input: call.input,
          originalInput: call.originalInput,
          inputNormalized: call.inputNormalized,
          inputNormalizationNotes: call.inputNormalizationNotes,
          output: call.output,
          outputCapped: call.outputCapped,
          outputSummary: call.outputSummary,
          error: call.error
        })))}`,
        'Provide final answer for user. Be concise and practical.'
      ].join('\n');

      const finalizeResponse = await generateText({
        model,
        temperature: params.config.mainAgent.temperature,
        maxOutputTokens: params.config.mainAgent.maxOutputTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: finalizePrompt }
        ]
      });

      finalAnswer = finalizeResponse.text.trim();
      if (!finalAnswer) {
        finalAnswer = planSummary || 'I could not produce a final answer.';
      }
      pushStep(steps, 'final', 'Agent returned a final answer after tool execution.');
    }
  } catch (caughtError) {
    success = false;
    error = caughtError instanceof Error ? caughtError.message : 'Unknown main agent error';
    finalAnswer = 'Przepraszam, wystapil blad podczas realizacji zadania.';
    pushStep(steps, 'final', `Agent failed: ${error}`);
  }

  if (success && isPlaceholderFinalAnswer(finalAnswer)) {
    success = false;
    error = 'Final answer fell back to placeholder output.';
    pushStep(steps, 'final', error);
    finalAnswer = planSummary || 'I could not produce a final answer.';
  }

  const leakedDecision = detectInternalDecisionLeak(finalAnswer);
  if (success && leakedDecision.leaked) {
    success = false;
    error = 'Final answer leaked internal decision JSON.';
    pushStep(steps, 'final', error);
    finalAnswer = leakedDecision.recoveredFinalAnswer ?? planSummary ?? 'I could not produce a final answer.';
  }

  const trace: MainAgentTrace = {
    traceId,
    sessionId: params.sessionId,
    userMessage: params.userMessage,
    finalAnswer,
    processingStepCount: progressStep,
    usedModel: model,
    temperature: params.config.mainAgent.temperature,
    systemPromptVersion: 'v1',
    planSummary,
    toolCalls,
    steps,
    startedAt,
    finishedAt: nowIso(),
    success,
    ...(error ? { error } : {})
  };

  return trace;
}
