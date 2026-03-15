import { z } from 'zod';
import { buildMainSystemPrompt } from './prompts/main-system.js';
import { detectInternalDecisionLeak } from './final-answer-guard.js';
import { tryRecoverDecisionFromToolCallMarkup } from './tool-call-decision-repair.js';
import { isRepeatedSuccessfulWebResearchRequest } from '../core/tool-call-deduper.js';
import { buildDeterministicCurrentFactAnswer } from '../core/current-fact-answer.js';
import { classifyWebIntent, selectWebBehavior } from '../core/web-intent.js';
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

interface MainAgentDependencies {
  generateText: typeof generateText;
  pickMainAgentModel: typeof pickMainAgentModel;
  runTool: typeof runTool;
  createId: typeof createId;
  nowIso: typeof nowIso;
}

const defaultMainAgentDependencies: MainAgentDependencies = {
  generateText,
  pickMainAgentModel,
  runTool,
  createId,
  nowIso
};

function isPlaceholderFinalAnswer(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === 'done' || normalized === 'done.' || normalized === 'no plan available.';
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

function looksLikeStructuredFinalAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  if (detectInternalDecisionLeak(trimmed).leaked) {
    return true;
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return tryExtractJsonObject(trimmed) !== null;
  }

  return false;
}

async function getDecisionWithRetry(params: {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  decisionPrompt: string;
  generateTextFn: typeof generateText;
}): Promise<z.infer<typeof decisionSchema> | null> {
  const first = await params.generateTextFn({
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

  const recoveredFirst = tryRecoverDecisionFromToolCallMarkup(first.text);
  if (recoveredFirst) {
    return recoveredFirst;
  }

  const repairPrompt = [
    'Rewrite your previous answer into strict JSON only.',
    'Schema: {"planSummary":string,"shouldUseTool":boolean,"toolName"?:string,"toolInput"?:object,"finalAnswer"?:string}',
    'If shouldUseTool is false, finalAnswer must contain the user-facing answer.',
    'Return one JSON object, no markdown, no extra text.',
    `Previous output: ${first.text}`
  ].join('\n');

  const second = await params.generateTextFn({
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
  if (secondParsed.success) {
    return secondParsed.data;
  }

  const recoveredSecond = tryRecoverDecisionFromToolCallMarkup(second.text);
  return recoveredSecond ?? null;
}

async function getPlainTextFinalAnswerWithRetry(params: {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  finalPrompt: string;
  generateTextFn: typeof generateText;
}): Promise<string> {
  const first = await params.generateTextFn({
    model: params.model,
    temperature: params.temperature,
    maxOutputTokens: params.maxOutputTokens,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.finalPrompt }
    ]
  });

  const firstText = first.text.trim();
  if (!looksLikeStructuredFinalAnswer(firstText)) {
    return firstText;
  }

  const repairPrompt = [
    'Rewrite your previous answer into plain natural-language text for the user.',
    'Do not output JSON.',
    'Do not output tool-call markup, XML tags, or function-call syntax.',
    'Do not describe internal planning.',
    'Return only the final user-facing answer as plain text.',
    `Previous output: ${first.text}`
  ].join('\n');

  const second = await params.generateTextFn({
    model: params.model,
    temperature: Math.min(params.temperature, 0.2),
    maxOutputTokens: params.maxOutputTokens,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: repairPrompt }
    ]
  });

  return second.text.trim();
}

async function groundFinalAnswerToEvidence(params: {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  userMessage: string;
  evidenceSummary: string;
  generateTextFn: typeof generateText;
}): Promise<string> {
  const groundingPrompt = [
    `User message: ${params.userMessage}`,
    `Evidence summary:\n${params.evidenceSummary}`,
    'Answer the user using only the evidence summary.',
    'If the evidence is insufficient, say plainly that you could not verify the answer from the available evidence.',
    'Prefer direct/current sources over generic historical pages when they conflict.',
    'Return plain text only.',
    'Do not output JSON or tool-call markup.'
  ].join('\n');

  const response = await params.generateTextFn({
    model: params.model,
    temperature: Math.min(params.temperature, 0.2),
    maxOutputTokens: params.maxOutputTokens,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: groundingPrompt }
    ]
  });

  return response.text.trim();
}

function pushStep(
  steps: AgentStepRecord[],
  kind: AgentStepRecord['kind'],
  content: string,
  timestampNow: () => string
): void {
  steps.push({ kind, content, timestamp: timestampNow() });
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

function extractExplicitUrl(message: string): string | null {
  const match = message.match(/https?:\/\/\S+/i);
  return match?.[0] ?? null;
}

function shouldForceInitialWebEvidence(params: {
  preferredTool: 'web_research' | 'http_fetch' | 'none';
  answerStrategy: 'current_fact' | 'ranked_listing' | 'page_summary' | 'search_summary' | 'raw_response' | 'no_web';
}): boolean {
  return (
    params.preferredTool === 'web_research' &&
    (params.answerStrategy === 'current_fact' ||
      params.answerStrategy === 'ranked_listing' ||
      params.answerStrategy === 'page_summary')
  );
}

function buildForcedToolRequest(params: {
  userMessage: string;
  preferredTool: 'web_research' | 'http_fetch' | 'none';
  retrievalMode: 'query' | 'page' | 'page_if_url_else_query' | 'raw' | 'none';
}): { toolName: 'web_research' | 'http_fetch'; toolInput: Record<string, unknown> } | null {
  if (params.preferredTool === 'none' || params.retrievalMode === 'none') {
    return null;
  }

  if (params.preferredTool === 'web_research') {
    const explicitUrl = extractExplicitUrl(params.userMessage);
    if ((params.retrievalMode === 'page' || params.retrievalMode === 'page_if_url_else_query') && explicitUrl) {
      return {
        toolName: 'web_research',
        toolInput: { url: explicitUrl }
      };
    }

    return {
      toolName: 'web_research',
      toolInput: { query: params.userMessage }
    };
  }

  if (params.preferredTool === 'http_fetch') {
    const explicitUrl = extractExplicitUrl(params.userMessage);
    if (!explicitUrl) {
      return null;
    }

    return {
      toolName: 'http_fetch',
      toolInput: { url: explicitUrl }
    };
  }

  return null;
}

function hasUsableToolEvidence(toolCalls: ToolCallRecord[]): boolean {
  return toolCalls.some((call) => {
    if (!call.success || !call.output || typeof call.output !== 'object' || Array.isArray(call.output)) {
      return false;
    }

    const output = call.output as Record<string, unknown>;

    if (Array.isArray(output.results)) {
      return output.results.length > 0;
    }

    if (typeof output.contentPreview === 'string' && output.contentPreview.trim().length > 0) {
      return true;
    }

    if (typeof output.body === 'string' && output.body.trim().length > 0) {
      return true;
    }

    return false;
  });
}

function summarizeEvidenceText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars)}...`;
}

function buildToolEvidenceSummary(toolCalls: ToolCallRecord[]): string {
  const lines: string[] = [];

  for (const [index, call] of toolCalls.entries()) {
    const prefix = `Tool ${index + 1}: ${call.toolName}`;

    if (!call.success) {
      lines.push(`${prefix} failed: ${call.error ?? 'unknown error'}`);
      continue;
    }

    if (!call.output || typeof call.output !== 'object' || Array.isArray(call.output)) {
      lines.push(`${prefix} returned no structured output.`);
      continue;
    }

    const output = call.output as Record<string, unknown>;

    if ((output.mode === 'summary' || output.mode === 'full') && Array.isArray(output.results)) {
      const results = output.results
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .slice(0, 3) as Array<Record<string, unknown>>;

      lines.push(
        `${prefix} query ${typeof output.query === 'string' ? `"${output.query}"` : ''} returned ${results.length} result(s).`
      );

      for (const result of results) {
        const title = typeof result.title === 'string' ? result.title : 'untitled';
        const url = typeof result.url === 'string' ? result.url : 'unknown url';
        const description =
          typeof result.description === 'string'
            ? summarizeEvidenceText(result.description, 220)
            : 'no description';
        lines.push(`- ${title} | ${url} | ${description}`);
      }
      continue;
    }

    if (output.mode === 'page') {
      const url = typeof output.url === 'string' ? output.url : 'unknown url';
      const preview =
        typeof output.contentPreview === 'string'
          ? summarizeEvidenceText(output.contentPreview, 280)
          : 'no preview';
      lines.push(`${prefix} page ${url} preview: ${preview}`);
      continue;
    }

    lines.push(`${prefix} returned output, but it was not recognized as evidence-bearing.`);
  }

  return lines.join('\n');
}

function selectDisplayedPlanSummary(params: {
  rawPlanSummary: string;
  answerStrategy: 'current_fact' | 'ranked_listing' | 'page_summary' | 'search_summary' | 'raw_response' | 'no_web';
  shouldUseTool: boolean;
  toolCallsCount: number;
}): string {
  if (params.answerStrategy !== 'current_fact') {
    return params.rawPlanSummary;
  }

  if (params.shouldUseTool || params.toolCallsCount === 0) {
    return 'Verify the current fact using fresh web evidence.';
  }

  return 'Answer the current-fact request from verified web evidence.';
}

export async function executeMainAgent(params: {
  sessionId: string;
  userMessage: string;
  config: AppConfig;
  memory: LongTermMemory;
  workspaceRoot: string;
  onProgress?: (event: { step: number; phase: 'model' | 'tool'; detail: string }) => Promise<void> | void;
  dependencies?: Partial<MainAgentDependencies>;
}): Promise<MainAgentTrace> {
  const deps: MainAgentDependencies = {
    ...defaultMainAgentDependencies,
    ...params.dependencies
  };
  const traceId = deps.createId('trace');
  const startedAt = deps.nowIso();
  const steps: AgentStepRecord[] = [];
  const toolCalls: ToolCallRecord[] = [];

  const model = deps.pickMainAgentModel(params.config, params.userMessage);
  const webIntent = classifyWebIntent(params.userMessage);
  const webBehavior = selectWebBehavior(webIntent);
  const systemPrompt = buildMainSystemPrompt({
    basePrompt: params.config.mainAgent.systemPrompt,
    enabledTools: params.config.mainAgent.enabledTools,
    memorySummary: buildMemorySummary(params.memory)
  });
  const decisionSystemPrompt = `${systemPrompt}\nWhen asked for a tool decision, return strict JSON only.`;

  const maxToolIterations = Math.min(params.config.policies.maxToolCallsPerRun, 3);
  let finalAnswer = '';
  let planSummary = '';
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
          ? [
              `Previous tool evidence:\n${buildToolEvidenceSummary(toolCalls)}`,
              'If you answer now, use only this evidence and do not rely on prior knowledge if the evidence says otherwise.',
              'If the evidence is insufficient, do not guess; either use another tool or say you could not verify it.'
            ].join('\n')
          : 'No previous tool results.'
      ].join('\n');

      const decision = await getDecisionWithRetry({
        model,
        temperature: params.config.mainAgent.temperature,
        maxOutputTokens: params.config.mainAgent.maxOutputTokens,
        systemPrompt: decisionSystemPrompt,
        decisionPrompt,
        generateTextFn: deps.generateText
      });
      const forcedInitialToolRequest =
        toolCalls.length === 0 && shouldForceInitialWebEvidence(webBehavior)
          ? buildForcedToolRequest({
              userMessage: params.userMessage,
              preferredTool: webBehavior.preferredTool,
              retrievalMode: webBehavior.retrievalMode
            })
          : null;

      if (!decision && !forcedInitialToolRequest) {
        pushStep(steps, 'reasoning', 'Agent returned invalid decision JSON; skipping tool step.', deps.nowIso);
        break;
      }

      let effectiveDecision =
        decision ??
        ({
          planSummary: `Need ${forcedInitialToolRequest!.toolName} evidence before answering this request.`,
          shouldUseTool: true,
          toolName: forcedInitialToolRequest!.toolName,
          toolInput: forcedInitialToolRequest!.toolInput
        } as z.infer<typeof decisionSchema>);

      if (!decision && forcedInitialToolRequest) {
        pushStep(
          steps,
          'reasoning',
          `Recovered from invalid decision JSON by forcing ${forcedInitialToolRequest.toolName} for classified intent ${webIntent.intent}${webIntent.subtype ? `/${webIntent.subtype}` : ''}.`,
          deps.nowIso
        );
      }

      if (decision && !decision.shouldUseTool && forcedInitialToolRequest) {
        effectiveDecision = {
          planSummary: `Need ${forcedInitialToolRequest.toolName} evidence before answering this request.`,
          shouldUseTool: true,
          toolName: forcedInitialToolRequest.toolName,
          toolInput: forcedInitialToolRequest.toolInput
        };
        pushStep(
          steps,
          'reasoning',
          `Overrode direct answer because classified intent ${webIntent.intent}${webIntent.subtype ? `/${webIntent.subtype}` : ''} requires web evidence first.`,
          deps.nowIso
        );
      }

      lastDecisionJson = JSON.stringify(effectiveDecision);
      planSummary = selectDisplayedPlanSummary({
        rawPlanSummary: effectiveDecision.planSummary,
        answerStrategy: webBehavior.answerStrategy,
        shouldUseTool: effectiveDecision.shouldUseTool,
        toolCallsCount: toolCalls.length
      });
      pushStep(steps, 'reasoning', `Agent decided: ${planSummary}`, deps.nowIso);

      if (!effectiveDecision.shouldUseTool) {
        finalAnswer = effectiveDecision.finalAnswer?.trim() ?? '';
        pushStep(
          steps,
          'final',
          finalAnswer
            ? 'Agent returned a direct final answer without additional tools.'
            : 'Agent skipped tools but did not provide finalAnswer; falling back to final answer generation.',
          deps.nowIso
        );
        break;
      }

      if (!effectiveDecision.toolName) {
        throw new Error('Agent requested tool usage but did not provide toolName');
      }

      if (toolCalls.length >= maxToolIterations) {
        pushStep(steps, 'final', 'Tool limit reached; finalizing response.', deps.nowIso);
        break;
      }

      if (
        isRepeatedSuccessfulWebResearchRequest({
          toolName: effectiveDecision.toolName,
          input: effectiveDecision.toolInput ?? {},
          userMessage: params.userMessage,
          previousToolCalls: toolCalls
        })
      ) {
        pushStep(
          steps,
          'reasoning',
          `Skipped repeated web_research request for ${effectiveDecision.toolName}; identical successful result already exists.`,
          deps.nowIso
        );
        pushStep(steps, 'final', 'Repeated web research request skipped; finalizing from existing results.', deps.nowIso);
        break;
      }

      pushStep(steps, 'tool_call', `Tool ${effectiveDecision.toolName} was invoked.`, deps.nowIso);
      const toolResult = await deps.runTool({
        toolName: effectiveDecision.toolName,
        input: effectiveDecision.toolInput ?? {},
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
          ? `Tool ${toolResult.toolName} finished successfully${toolResult.toolNormalized ? ` after tool normalization from ${effectiveDecision.toolName}` : ''}${toolResult.inputNormalized ? ' after input normalization' : ''}${toolResult.outputCapped ? ' with capped output' : ''}.`
          : `Tool ${toolResult.toolName} failed: ${toolResult.error ?? 'unknown error'}`,
        deps.nowIso
      );
      if (toolResult.toolNormalizationNotes && toolResult.toolNormalizationNotes.length > 0) {
        for (const note of toolResult.toolNormalizationNotes) {
          pushStep(steps, 'reasoning', note, deps.nowIso);
        }
      }
      if (toolResult.inputNormalizationNotes && toolResult.inputNormalizationNotes.length > 0) {
        for (const note of toolResult.inputNormalizationNotes) {
          pushStep(steps, 'reasoning', note, deps.nowIso);
        }
      }

      const readFilePath = effectiveDecision.toolName === 'read_file' ? getReadFilePath(effectiveDecision.toolInput) : null;
      if (
        effectiveDecision.toolName === 'read_file' &&
        !toolResult.success &&
        readFilePath &&
        targetsOutsideWorkspace(readFilePath)
      ) {
        finalAnswer = buildOutsideWorkspaceReply(readFilePath);
        pushStep(
          steps,
          'final',
          `Read of ${readFilePath} is outside workspace scope; asking user to paste the file instead of retrying.`,
          deps.nowIso
        );
        break;
      }

      // Auto-postprocess HTML pages so the model receives readable text from web fetches.
      if (
        effectiveDecision.toolName === 'http_fetch' &&
        toolResult.success &&
        toolCalls.length < maxToolIterations &&
        params.config.mainAgent.enabledTools.includes('extract_text') &&
        params.config.policies.toolAllowlist.includes('extract_text')
      ) {
        const body = getHttpBody(toolResult.output);
        if (body && looksLikeHtml(body)) {
          pushStep(steps, 'tool_call', 'Auto tool extract_text was invoked to clean fetched HTML.', deps.nowIso);
          const extractResult = await deps.runTool({
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
              : `Auto tool extract_text failed: ${extractResult.error ?? 'unknown error'}`,
            deps.nowIso
          );
        }
      }
    }

    if (!finalAnswer) {
      const usableToolEvidence = hasUsableToolEvidence(toolCalls);
      const toolEvidenceSummary = buildToolEvidenceSummary(toolCalls);
      progressStep += 1;
      await params.onProgress?.({
        step: progressStep,
        phase: 'model',
        detail: 'finalizacja odpowiedzi'
      });

      const finalizePrompt = [
        `User message: ${params.userMessage}`,
        planSummary ? `Plan summary: ${planSummary}` : null,
        toolCalls.length > 0 ? `Evidence summary:\n${toolEvidenceSummary}` : 'No tool evidence was collected.',
        usableToolEvidence
          ? 'Use only the evidence summary below when answering. Do not rely on prior knowledge if the evidence says otherwise.'
          : 'The tool results below do not contain enough evidence to verify a concrete answer. Do not guess; say plainly that you could not verify it.',
        'When evidence includes both generic background pages and a more direct or official current source, prefer the more direct/current source.',
        'Provide final answer for user. Be concise and practical.',
        'Return plain text only.',
        'Do not output JSON.',
        'Do not output tool-call markup, function-call syntax, or pseudo-code for tools.',
        'If the available information is insufficient, say so plainly.'
      ]
        .filter(Boolean)
        .join('\n');

      finalAnswer = await getPlainTextFinalAnswerWithRetry({
        model,
        temperature: params.config.mainAgent.temperature,
        maxOutputTokens: params.config.mainAgent.maxOutputTokens,
        systemPrompt,
        finalPrompt: finalizePrompt,
        generateTextFn: deps.generateText
      });
      if (!usableToolEvidence && toolCalls.length > 0) {
        finalAnswer = 'I could not verify the answer from the available tool results.';
      }
      if (!finalAnswer) {
        finalAnswer = 'I could not produce a valid final answer.';
      }
      pushStep(steps, 'final', 'Agent returned a final answer after tool execution.', deps.nowIso);
    }

    const deterministicCurrentFactAnswer = buildDeterministicCurrentFactAnswer({
      userMessage: params.userMessage,
      toolCalls
    });
    if (deterministicCurrentFactAnswer) {
      finalAnswer = deterministicCurrentFactAnswer;
      pushStep(steps, 'final', 'Built deterministic current-fact answer from tool evidence.', deps.nowIso);
    } else if (finalAnswer) {
      const usableToolEvidence = hasUsableToolEvidence(toolCalls);
      if (usableToolEvidence) {
        finalAnswer = await groundFinalAnswerToEvidence({
          model,
          temperature: params.config.mainAgent.temperature,
          maxOutputTokens: params.config.mainAgent.maxOutputTokens,
          systemPrompt,
          userMessage: params.userMessage,
          evidenceSummary: buildToolEvidenceSummary(toolCalls),
          generateTextFn: deps.generateText
        });
      }
    }
  } catch (caughtError) {
    success = false;
    error = caughtError instanceof Error ? caughtError.message : 'Unknown main agent error';
    finalAnswer = 'Przepraszam, wystapil blad podczas realizacji zadania.';
    pushStep(steps, 'final', `Agent failed: ${error}`, deps.nowIso);
  }

  if (success && isPlaceholderFinalAnswer(finalAnswer)) {
    success = false;
    error = 'Final answer fell back to placeholder output.';
    pushStep(steps, 'final', error, deps.nowIso);
    finalAnswer = planSummary || 'I could not produce a valid final answer.';
  }

  const leakedDecision = detectInternalDecisionLeak(finalAnswer);
  if (success && leakedDecision.leaked) {
    if (leakedDecision.recoveredFinalAnswer) {
      finalAnswer = leakedDecision.recoveredFinalAnswer;
      pushStep(steps, 'final', 'Recovered final answer from leaked internal decision JSON.', deps.nowIso);
    } else {
      success = false;
      error = 'Final answer leaked internal decision JSON.';
      pushStep(steps, 'final', error, deps.nowIso);
      finalAnswer = planSummary ?? 'I could not produce a valid final answer.';
    }
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
    finishedAt: deps.nowIso(),
    success,
    ...(error ? { error } : {})
  };

  return trace;
}
