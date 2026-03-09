import type { MetaAgentResult } from '../types/agent.js';
import type { MainAgentTrace } from '../types/trace.js';
import { executeMetaAgent } from '../agents/meta-agent.js';
import { applySafePatch } from './auto-apply.js';
import {
  loadCurrentConfig,
  saveCurrentConfig,
  saveProposedConfig
} from './config-store.js';
import { saveMetaEvaluation } from './trace-store.js';

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

export async function runMetaAgent(params: { trace: MainAgentTrace }): Promise<MetaAgentResult> {
  const config = await loadCurrentConfig();
  const evaluation = await executeMetaAgent({ trace: params.trace, config });

  await saveMetaEvaluation(evaluation);

  const patchResult = applySafePatch({ currentConfig: config, patch: evaluation.proposedChanges });
  const pendingPatch = buildPendingPatch(evaluation.proposedChanges, patchResult.applied);
  await saveProposedConfig(pendingPatch);

  if (patchResult.applied.length > 0) {
    await saveCurrentConfig(patchResult.updatedConfig);
  }

  return {
    evaluation,
    applied: patchResult.applied,
    rejected: patchResult.rejected
  };
}
