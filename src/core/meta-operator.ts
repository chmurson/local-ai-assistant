import { loadMetaHistory } from './trace-store.js';
import { getMetaSchedulerStatus, runMetaReflectionNow } from './meta-scheduler.js';

function formatTimestamp(value: string | null): string {
  return value ?? 'n/a';
}

export async function buildMetaStatusReport(): Promise<string> {
  const scheduler = getMetaSchedulerStatus();
  const history = await loadMetaHistory();
  const lastRun = [...history].reverse()[0];

  const lines = [
    `[meta] enabled=${scheduler.enabled ? 'yes' : 'no'} running=${scheduler.running ? 'yes' : 'no'}`,
    `pending=${scheduler.pendingCount} threshold=${scheduler.minNewTracesBeforeRun} delayMs=${scheduler.inactivityDelayMs}`,
    `nextScheduledAt=${formatTimestamp(scheduler.nextScheduledAt)}`,
    `lastRun=${lastRun ? `${lastRun.status} trigger=${lastRun.triggeredBy} finishedAt=${lastRun.finishedAt}` : 'none'}`
  ];

  if (scheduler.pendingTraceIds.length > 0) {
    lines.push(`queuedTraceIds=${scheduler.pendingTraceIds.join(', ')}`);
  }

  return lines.join('\n');
}

export async function runManualMetaReflection(): Promise<string> {
  const result = await runMetaReflectionNow();
  const lines = [`[meta] ${result.message}`];

  if (result.processedTraces.length > 0) {
    lines.push(`processed=${result.processedTraces.join(', ')}`);
  }

  return lines.join('\n');
}
