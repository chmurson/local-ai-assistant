import test from 'node:test';
import assert from 'node:assert/strict';
import { formatWebResearchStatsReport, summarizeWebResearchStats } from './web-research-stats.js';
import type { MainAgentTrace, ToolCallRecord } from '../types/trace.js';

function buildWebResearchCall(params: {
  mode: 'summary' | 'page';
  fallback?: boolean;
}): ToolCallRecord {
  return {
    toolName: 'web_research',
    input: params.mode === 'page' ? { url: 'https://example.com/news' } : { query: 'example news' },
    output:
      params.mode === 'page'
        ? {
            mode: 'page',
            url: 'https://example.com/news',
            contentPreview: 'Example preview',
            ...(params.fallback ? { fallbackQuery: 'site:example.com news', fallbackResults: [] } : {})
          }
        : {
            mode: 'summary',
            query: 'example news',
            results: []
          },
    startedAt: '2026-03-15T00:00:00.000Z',
    finishedAt: '2026-03-15T00:00:01.000Z',
    success: true
  };
}

function buildTrace(params: {
  traceId: string;
  success: boolean;
  processingStepCount: number;
  toolCalls: ToolCallRecord[];
}): MainAgentTrace {
  return {
    traceId: params.traceId,
    sessionId: 'session_test',
    userMessage: 'test message',
    finalAnswer: 'ok',
    processingStepCount: params.processingStepCount,
    usedModel: 'test-model',
    temperature: 0.2,
    systemPromptVersion: 'v1',
    planSummary: 'test',
    toolCalls: params.toolCalls,
    steps: [],
    startedAt: '2026-03-15T00:00:00.000Z',
    finishedAt: '2026-03-15T00:00:02.000Z',
    success: params.success
  };
}

test('summarizeWebResearchStats computes rough metrics across traces', () => {
  const stats = summarizeWebResearchStats([
    buildTrace({
      traceId: 'trace_1',
      success: true,
      processingStepCount: 5,
      toolCalls: [buildWebResearchCall({ mode: 'summary' }), buildWebResearchCall({ mode: 'page', fallback: true })]
    }),
    buildTrace({
      traceId: 'trace_2',
      success: false,
      processingStepCount: 7,
      toolCalls: [buildWebResearchCall({ mode: 'summary' })]
    }),
    buildTrace({
      traceId: 'trace_3',
      success: true,
      processingStepCount: 4,
      toolCalls: []
    })
  ]);

  assert.deepEqual(stats, {
    traceWindow: 3,
    tracesWithWebResearch: 2,
    successfulTraces: 1,
    failedTraces: 1,
    totalWebResearchCalls: 3,
    successfulWebResearchCalls: 3,
    failedWebResearchCalls: 0,
    pageCalls: 1,
    queryCalls: 2,
    fallbackPageCalls: 1,
    averageStepsPerTrace: 6,
    averageWebResearchCallsPerTrace: 1.5
  });
});

test('formatWebResearchStatsReport returns empty-state report', () => {
  const report = formatWebResearchStatsReport({
    traceWindow: 5,
    tracesWithWebResearch: 0,
    successfulTraces: 0,
    failedTraces: 0,
    totalWebResearchCalls: 0,
    successfulWebResearchCalls: 0,
    failedWebResearchCalls: 0,
    pageCalls: 0,
    queryCalls: 0,
    fallbackPageCalls: 0,
    averageStepsPerTrace: 0,
    averageWebResearchCallsPerTrace: 0
  });

  assert.equal(report, 'web_research stats\n- window: last 5 traces\n- no traces used web_research yet');
});
