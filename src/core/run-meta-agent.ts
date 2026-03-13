import type { MetaAgentResult } from '../types/agent.js';
import type { MainAgentTrace, MetaHistoryDiffEntry, ProposedConfigPatch } from '../types/trace.js';
import { executeMetaAgent } from '../agents/meta-agent.js';
import { pickMetaAgentModel } from './model-router.js';
import { applySafePatch } from './auto-apply.js';
import {
  loadCurrentConfig,
  saveCurrentConfig,
  saveProposedConfig
} from './config-store.js';
import { loadMetaHistory, saveMetaEvaluation, saveMetaHistoryRecord } from './trace-store.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/now.js';

const PATCH_PATHS = [
  'mainAgent.systemPrompt',
  'mainAgent.temperature',
  'mainAgent.enabledTools',
  'mainAgent.model',
  'routing.defaultMainModel',
  'routing.defaultMetaModel'
] as const;

function buildPendingPatch(
  patch: NonNullable<Parameters<typeof applySafePatch>[0]['patch']>,
  applied: string[]
): NonNullable<Parameters<typeof applySafePatch>[0]['patch']> {
  const pending = JSON.parse(JSON.stringify(patch)) as Record<string, unknown>;
  const appliedSet = new Set(applied);

  if (pending.mainAgent && typeof pending.mainAgent === 'object') {
    const mainAgent = pending.mainAgent as Record<string, unknown>;
    if (appliedSet.has('mainAgent.systemPrompt')) delete mainAgent.systemPrompt;
    if (appliedSet.has('mainAgent.temperature')) delete mainAgent.temperature;
    if (appliedSet.has('mainAgent.enabledTools')) delete mainAgent.enabledTools;
    if (appliedSet.has('mainAgent.model')) delete mainAgent.model;
    if (Object.keys(mainAgent).length === 0) delete pending.mainAgent;
  }

  if (pending.routing && typeof pending.routing === 'object') {
    const routing = pending.routing as Record<string, unknown>;
    if (appliedSet.has('routing.defaultMainModel')) delete routing.defaultMainModel;
    if (appliedSet.has('routing.defaultMetaModel')) delete routing.defaultMetaModel;
    if (Object.keys(routing).length === 0) delete pending.routing;
  }

  return pending;
}

function computeMetaUsefulness(params: {
  priorHistory: Awaited<ReturnType<typeof loadMetaHistory>>;
  proposedChanges: NonNullable<Parameters<typeof applySafePatch>[0]['patch']>;
  applied: string[];
}): boolean {
  const hasProposal = Object.keys(params.proposedChanges).length > 0;
  if (!hasProposal && params.applied.length === 0) {
    return false;
  }

  const proposalKey = JSON.stringify(params.proposedChanges);
  const repeatedProposal = [...params.priorHistory]
    .reverse()
    .some((record) => record.status === 'completed' && JSON.stringify(record.proposedChanges) === proposalKey);

  if (repeatedProposal) {
    return false;
  }

  return params.applied.length > 0 || hasProposal;
}

function getPathValue(source: unknown, path: string): unknown {
  let current = source;
  for (const key of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function collectPatchPaths(patch: ProposedConfigPatch): string[] {
  return PATCH_PATHS.filter((path) => getPathValue(patch, path) !== undefined);
}

function buildDiffEntries(params: {
  beforeSource: unknown;
  afterSource: unknown;
  paths: string[];
  status: MetaHistoryDiffEntry['status'];
}): MetaHistoryDiffEntry[] {
  return params.paths.map((path) => {
    const entry: MetaHistoryDiffEntry = {
      path,
      before: getPathValue(params.beforeSource, path),
      after: getPathValue(params.afterSource, path),
      status: params.status
    };
    return entry;
  });
}

export async function runMetaAgent(params: {
  trace: MainAgentTrace;
  trigger?: 'per_turn' | 'inactivity';
}): Promise<MetaAgentResult> {
  const config = await loadCurrentConfig();
  const metaRunId = createId('meta_run');
  const fallbackStartedAt = nowIso();
  const usedModel = pickMetaAgentModel(config);
  const priorHistory = await loadMetaHistory();

  try {
    const evaluation = await executeMetaAgent({ trace: params.trace, config });

    await saveMetaEvaluation(evaluation);

    const patchResult = applySafePatch({ currentConfig: config, patch: evaluation.proposedChanges });
    const proposedPaths = collectPatchPaths(evaluation.proposedChanges);
    const pendingPatch = buildPendingPatch(evaluation.proposedChanges, patchResult.applied);
    await saveProposedConfig(pendingPatch);

    if (patchResult.applied.length > 0) {
      await saveCurrentConfig(patchResult.updatedConfig);
    }

    await saveMetaHistoryRecord({
      metaRunId,
      traceIds: [params.trace.traceId],
      triggeredBy: params.trigger ?? 'per_turn',
      status: 'completed',
      usedModel: evaluation.usedModel,
      startedAt: evaluation.startedAt,
      finishedAt: evaluation.finishedAt,
      score: evaluation.score,
      confidence: evaluation.confidence,
      issues: evaluation.issues,
      summary: evaluation.summary,
      proposedChanges: evaluation.proposedChanges,
      proposedDiff: buildDiffEntries({
        beforeSource: config,
        afterSource: evaluation.proposedChanges,
        paths: proposedPaths,
        status: 'proposed'
      }),
      appliedDiff: buildDiffEntries({
        beforeSource: config,
        afterSource: patchResult.updatedConfig,
        paths: patchResult.applied,
        status: 'applied'
      }),
      rejectedDiff: buildDiffEntries({
        beforeSource: config,
        afterSource: evaluation.proposedChanges,
        paths: patchResult.rejected,
        status: 'rejected'
      }),
      applied: patchResult.applied,
      rejected: patchResult.rejected,
      useful: computeMetaUsefulness({
        priorHistory,
        proposedChanges: evaluation.proposedChanges,
        applied: patchResult.applied
      })
    });

    return {
      evaluation,
      applied: patchResult.applied,
      rejected: patchResult.rejected,
      useful: computeMetaUsefulness({
        priorHistory,
        proposedChanges: evaluation.proposedChanges,
        applied: patchResult.applied
      })
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown meta error';

    await saveMetaHistoryRecord({
      metaRunId,
      traceIds: [params.trace.traceId],
      triggeredBy: params.trigger ?? 'per_turn',
      status: 'failed',
      usedModel,
      startedAt: fallbackStartedAt,
      finishedAt: nowIso(),
      issues: [],
      summary: 'Meta run failed before producing an evaluation.',
      proposedChanges: {},
      proposedDiff: [],
      appliedDiff: [],
      rejectedDiff: [],
      applied: [],
      rejected: [],
      useful: false,
      error: errorMessage
    });

    throw error;
  }
}
