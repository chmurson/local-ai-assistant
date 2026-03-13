import { buildMetaSystemPrompt } from './prompts/meta-system.js';
import { generateText } from '../core/llm-client.js';
import { formatModelRegistryForPrompt, type ModelRegistry } from '../core/model-registry.js';
import { pickMetaAgentModel } from '../core/model-router.js';
import { proposedConfigPatchSchema } from '../schemas/config-schema.js';
import type { AppConfig } from '../types/config.js';
import type { MainAgentTrace, MetaAgentEvaluation, ProposedConfigPatch } from '../types/trace.js';
import { nowIso } from '../utils/now.js';
import { z } from 'zod';

const metaEnvelopeSchema = z
  .object({
    score: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    issues: z.array(z.string()),
    strengths: z.array(z.string()),
    summary: z.string(),
    proposedChanges: z.unknown()
  })
  .strict();

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
    throw new Error('Meta output is not valid JSON');
  }
}

function tryExtractJsonObject(text: string): unknown | null {
  try {
    return extractJsonObject(text);
  } catch {
    return null;
  }
}

function normalizeProposedChanges(input: unknown): ProposedConfigPatch {
  const source = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  const nestedMain = source.mainAgent;
  if (typeof nestedMain === 'object' && nestedMain !== null) {
    result.mainAgent = nestedMain;
  }
  const nestedRouting = source.routing;
  if (typeof nestedRouting === 'object' && nestedRouting !== null) {
    result.routing = nestedRouting;
  }

  const ensureMain = (): Record<string, unknown> => {
    if (!result.mainAgent || typeof result.mainAgent !== 'object') {
      result.mainAgent = {};
    }
    return result.mainAgent as Record<string, unknown>;
  };

  const ensureRouting = (): Record<string, unknown> => {
    if (!result.routing || typeof result.routing !== 'object') {
      result.routing = {};
    }
    return result.routing as Record<string, unknown>;
  };

  if (typeof source['mainAgent.systemPrompt'] === 'string') {
    ensureMain().systemPrompt = source['mainAgent.systemPrompt'];
  }
  if (typeof source['mainAgent.temperature'] === 'number') {
    ensureMain().temperature = source['mainAgent.temperature'];
  }
  if (Array.isArray(source['mainAgent.enabledTools'])) {
    ensureMain().enabledTools = source['mainAgent.enabledTools'];
  }
  if (Array.isArray(source.enabledTools)) {
    ensureMain().enabledTools = source.enabledTools;
  }
  if (typeof source['mainAgent.model'] === 'string') {
    ensureMain().model = source['mainAgent.model'];
  }
  if (typeof source['routing.defaultMainModel'] === 'string') {
    ensureRouting().defaultMainModel = source['routing.defaultMainModel'];
  }
  if (typeof source['routing.defaultMetaModel'] === 'string') {
    ensureRouting().defaultMetaModel = source['routing.defaultMetaModel'];
  }

  return proposedConfigPatchSchema.parse(result) as ProposedConfigPatch;
}

export async function executeMetaAgent(params: {
  trace: MainAgentTrace;
  config: AppConfig;
  modelRegistry: ModelRegistry;
}): Promise<MetaAgentEvaluation> {
  const startedAt = nowIso();
  const usedModel = pickMetaAgentModel(params.config);

  const prompt = [
    'Evaluate this main-agent trace and return JSON with fields:',
    '{"score":0..1,"confidence":0..1,"issues":string[],"strengths":string[],"summary":string,"proposedChanges":object}',
    'Proposed changes are allowed only for:',
    '- mainAgent.systemPrompt',
    '- mainAgent.temperature',
    '- mainAgent.enabledTools',
    '- mainAgent.model',
    '- routing.defaultMainModel',
    '- routing.defaultMetaModel',
    'Only propose model changes using exact ids from the available model list below.',
    `Allowed tools allowlist: ${params.config.policies.toolAllowlist.join(', ')}`,
    `Available models (${params.modelRegistry.discovered ? 'discovered from /models' : 'fallback from current config'}):`,
    formatModelRegistryForPrompt(params.modelRegistry),
    `Current config JSON: ${JSON.stringify(params.config)}`,
    `Trace JSON: ${JSON.stringify(params.trace)}`
  ].join('\n');

  const response = await generateText({
    model: usedModel,
    temperature: params.config.metaAgent.temperature,
    maxOutputTokens: params.config.metaAgent.maxOutputTokens,
    messages: [
      { role: 'system', content: buildMetaSystemPrompt() },
      { role: 'user', content: prompt }
    ]
  });

  const rawJson = tryExtractJsonObject(response.text);
  const envelope = metaEnvelopeSchema.safeParse(rawJson);
  if (!envelope.success) {
    return {
      traceId: params.trace.traceId,
      usedModel,
      score: 0.5,
      confidence: 0.2,
      issues: ['Meta-agent returned invalid JSON output; fallback evaluation was used.'],
      strengths: [],
      proposedChanges: {},
      summary: 'Meta output format was invalid, so no config changes were proposed.',
      startedAt,
      finishedAt: nowIso()
    };
  }

  let proposedChanges: ProposedConfigPatch = {};
  try {
    proposedChanges = normalizeProposedChanges(envelope.data.proposedChanges);
  } catch {
    proposedChanges = {};
  }

  return {
    traceId: params.trace.traceId,
    usedModel,
    score: envelope.data.score,
    confidence: envelope.data.confidence,
    issues: envelope.data.issues,
    strengths: envelope.data.strengths,
    proposedChanges,
    summary: envelope.data.summary,
    startedAt,
    finishedAt: nowIso()
  };
}
