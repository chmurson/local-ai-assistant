import type { MetaHistoryRecord, MetaRunClassification } from '../types/trace.js';
import { loadMetaHistory } from './trace-store.js';
import { getMetaSchedulerStatus, runMetaReflectionNow } from './meta-scheduler.js';

function formatTimestamp(value: string | null): string {
  return value ?? 'n/a';
}

function formatClassificationCounts(records: MetaHistoryRecord[]): string {
  const counts = new Map<MetaRunClassification, number>();
  for (const record of records) {
    counts.set(record.classification, (counts.get(record.classification) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([classification, count]) => `${classification}:${count}`)
    .join(' ');
}

function formatUsefulRate(records: MetaHistoryRecord[]): string {
  if (records.length === 0) {
    return '0/0';
  }

  const usefulCount = records.filter((record) => record.useful).length;
  return `${usefulCount}/${records.length}`;
}

export async function buildMetaStatusReport(): Promise<string> {
  const scheduler = getMetaSchedulerStatus();
  const history = await loadMetaHistory();
  const lastRun = [...history].reverse()[0];
  const classifiedHistory = history.filter((record) => record.classification !== 'unknown');
  const recentWindow = classifiedHistory.slice(-10);

  const lines = [
    `[meta] enabled=${scheduler.enabled ? 'yes' : 'no'} running=${scheduler.running ? 'yes' : 'no'}`,
    `pending=${scheduler.pendingCount} threshold=${scheduler.minNewTracesBeforeRun} delayMs=${scheduler.inactivityDelayMs}`,
    `nextScheduledAt=${formatTimestamp(scheduler.nextScheduledAt)}`,
    `lastRun=${lastRun ? `${lastRun.status} trigger=${lastRun.triggeredBy} classification=${lastRun.classification} finishedAt=${lastRun.finishedAt}` : 'none'}`,
    `classifiedRuns=${classifiedHistory.length} usefulRate=${formatUsefulRate(classifiedHistory)}`,
    `classifications=${classifiedHistory.length > 0 ? formatClassificationCounts(classifiedHistory) : 'none'}`,
    `recent10UsefulRate=${formatUsefulRate(recentWindow)}`,
    `recent10Classifications=${recentWindow.length > 0 ? formatClassificationCounts(recentWindow) : 'none'}`
  ];

  if (scheduler.pendingTraceIds.length > 0) {
    lines.push(`queuedTraceIds=${scheduler.pendingTraceIds.join(', ')}`);
  }

  return lines.join('\n');
}

export async function buildCompactMetaHistoryReport(): Promise<string> {
  const history = await loadMetaHistory();
  if (history.length === 0) {
    return '[meta] no history yet';
  }

  const recent = history.slice(-5).reverse();
  const lines = ['[meta] recent history'];

  for (const record of recent) {
    lines.push(
      `${record.metaRunId} ${record.status} ${record.triggeredBy} ${record.classification} useful=${record.useful ? 'yes' : 'no'}`
    );
    lines.push(`trace=${record.traceIds.join(', ')} finishedAt=${record.finishedAt}`);
    if (record.applied.length > 0) {
      lines.push(`applied=${record.applied.join(', ')}`);
    }
    if (record.rejected.length > 0) {
      lines.push(`rejected=${record.rejected.join(', ')}`);
    }
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
