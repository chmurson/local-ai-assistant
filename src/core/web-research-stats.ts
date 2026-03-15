import { loadRecentMainTraces } from './trace-store.js';
import type { MainAgentTrace, ToolCallRecord } from '../types/trace.js';

const DEFAULT_TRACE_LIMIT = 50;

interface WebResearchStats {
  traceWindow: number;
  tracesWithWebResearch: number;
  successfulTraces: number;
  failedTraces: number;
  totalWebResearchCalls: number;
  successfulWebResearchCalls: number;
  failedWebResearchCalls: number;
  pageCalls: number;
  queryCalls: number;
  fallbackPageCalls: number;
  averageStepsPerTrace: number;
  averageWebResearchCallsPerTrace: number;
}

function isWebResearchCall(call: ToolCallRecord): boolean {
  return call.toolName === 'web_research';
}

function getMode(call: ToolCallRecord): 'page' | 'query' | 'unknown' {
  if (!call.output || typeof call.output !== 'object' || Array.isArray(call.output)) {
    return 'unknown';
  }

  const mode = (call.output as Record<string, unknown>).mode;
  if (mode === 'page') {
    return 'page';
  }
  if (mode === 'summary' || mode === 'full') {
    return 'query';
  }
  return 'unknown';
}

function usedFallback(call: ToolCallRecord): boolean {
  if (!call.output || typeof call.output !== 'object' || Array.isArray(call.output)) {
    return false;
  }

  const fallbackQuery = (call.output as Record<string, unknown>).fallbackQuery;
  return typeof fallbackQuery === 'string' && fallbackQuery.trim().length > 0;
}

export function summarizeWebResearchStats(traces: MainAgentTrace[]): WebResearchStats {
  const tracesWithWebResearch = traces.filter((trace) => trace.toolCalls.some(isWebResearchCall));
  const webResearchCalls = tracesWithWebResearch.flatMap((trace) => trace.toolCalls.filter(isWebResearchCall));
  const pageCalls = webResearchCalls.filter((call) => getMode(call) === 'page');
  const queryCalls = webResearchCalls.filter((call) => getMode(call) === 'query');
  const fallbackPageCalls = pageCalls.filter(usedFallback);

  return {
    traceWindow: traces.length,
    tracesWithWebResearch: tracesWithWebResearch.length,
    successfulTraces: tracesWithWebResearch.filter((trace) => trace.success).length,
    failedTraces: tracesWithWebResearch.filter((trace) => !trace.success).length,
    totalWebResearchCalls: webResearchCalls.length,
    successfulWebResearchCalls: webResearchCalls.filter((call) => call.success).length,
    failedWebResearchCalls: webResearchCalls.filter((call) => !call.success).length,
    pageCalls: pageCalls.length,
    queryCalls: queryCalls.length,
    fallbackPageCalls: fallbackPageCalls.length,
    averageStepsPerTrace:
      tracesWithWebResearch.length > 0
        ? tracesWithWebResearch.reduce((sum, trace) => sum + trace.processingStepCount, 0) / tracesWithWebResearch.length
        : 0,
    averageWebResearchCallsPerTrace:
      tracesWithWebResearch.length > 0 ? webResearchCalls.length / tracesWithWebResearch.length : 0
  };
}

function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) {
    return 'n/a';
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function formatWebResearchStatsReport(stats: WebResearchStats): string {
  if (stats.tracesWithWebResearch === 0) {
    return `web_research stats\n- window: last ${stats.traceWindow} traces\n- no traces used web_research yet`;
  }

  return [
    'web_research stats',
    `- window: last ${stats.traceWindow} traces`,
    `- traces using web_research: ${stats.tracesWithWebResearch}`,
    `- trace success rate: ${formatPercent(stats.successfulTraces, stats.tracesWithWebResearch)} (${stats.successfulTraces}/${stats.tracesWithWebResearch})`,
    `- total web_research calls: ${stats.totalWebResearchCalls}`,
    `- tool-call success rate: ${formatPercent(stats.successfulWebResearchCalls, stats.totalWebResearchCalls)} (${stats.successfulWebResearchCalls}/${stats.totalWebResearchCalls})`,
    `- avg steps per trace: ${stats.averageStepsPerTrace.toFixed(1)}`,
    `- avg web_research calls per trace: ${stats.averageWebResearchCallsPerTrace.toFixed(1)}`,
    `- mode split: query=${stats.queryCalls}, page=${stats.pageCalls}`,
    `- page fallback rate: ${formatPercent(stats.fallbackPageCalls, stats.pageCalls)} (${stats.fallbackPageCalls}/${stats.pageCalls})`
  ].join('\n');
}

export async function buildWebResearchStatsReport(limit = DEFAULT_TRACE_LIMIT): Promise<string> {
  const traces = await loadRecentMainTraces(limit);
  const stats = summarizeWebResearchStats(traces);
  return formatWebResearchStatsReport(stats);
}
