import type { MainAgentTrace } from '../types/trace.js';

function formatElapsed(startedAt: string, finishedAt: string): string {
  const startedMs = Date.parse(startedAt);
  const finishedMs = Date.parse(finishedAt);

  if (!Number.isFinite(startedMs) || !Number.isFinite(finishedMs) || finishedMs < startedMs) {
    return '?';
  }

  const totalSeconds = Math.max(0, Math.round((finishedMs - startedMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function formatUserFacingAssistantReply(trace: MainAgentTrace): string {
  const elapsed = formatElapsed(trace.startedAt, trace.finishedAt);
  const prefix = `[czas ${elapsed} | kroki ${trace.processingStepCount}]`;
  return `${prefix}\n${trace.finalAnswer}`;
}
