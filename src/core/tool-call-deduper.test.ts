import test from 'node:test';
import assert from 'node:assert/strict';
import { isRepeatedSuccessfulWebResearchRequest } from './tool-call-deduper.js';
import type { ToolCallRecord } from '../types/trace.js';

function buildCall(input: unknown): ToolCallRecord {
  return {
    toolName: 'web_research',
    input,
    output: {
      mode: 'summary',
      query: 'site:meteo.pl Wrocław prognoza pogody',
      results: []
    },
    startedAt: '2026-03-15T10:00:00.000Z',
    finishedAt: '2026-03-15T10:00:01.000Z',
    success: true
  };
}

test('detects repeated successful normalized web_research request', () => {
  const result = isRepeatedSuccessfulWebResearchRequest({
    toolName: 'web_research',
    input: {
      query: 'site:meteo.pl Wrocław prognoza pogody',
      depth: 'summary',
      limit: 3
    },
    previousToolCalls: [
      buildCall({
        query: 'site:meteo.pl Wrocław prognoza pogody',
        depth: 'summary',
        limit: 3
      })
    ]
  });

  assert.equal(result, true);
});

test('treats normalized http_fetch rewrite as duplicate when web_research already ran', () => {
  const result = isRepeatedSuccessfulWebResearchRequest({
    toolName: 'http_fetch',
    input: {
      url: 'https://filmweb.pl/news'
    },
    userMessage: 'Pobierz newsy z filmweb.pl',
    previousToolCalls: [
      buildCall({
        query: 'site:filmweb.pl news newsy z filmweb.pl',
        depth: 'summary',
        limit: 3
      })
    ]
  });

  assert.equal(result, true);
});
