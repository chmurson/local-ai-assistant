import test from 'node:test';
import assert from 'node:assert/strict';
import { detectInternalDecisionLeak } from './final-answer-guard.js';

test('detectInternalDecisionLeak detects leaked decision envelope JSON', () => {
  const result = detectInternalDecisionLeak(
    '{"planSummary":"Fix weather query","shouldUseTool":true,"toolName":"web_research","toolInput":{"query":"site:meteo.pl Wrocław prognoza pogody"}}'
  );

  assert.equal(result.leaked, true);
  assert.equal(result.recoveredFinalAnswer, undefined);
});

test('detectInternalDecisionLeak recovers finalAnswer when present', () => {
  const result = detectInternalDecisionLeak(
    '{"planSummary":"Done","shouldUseTool":false,"finalAnswer":"Pogoda we Wrocławiu to 12°C."}'
  );

  assert.equal(result.leaked, true);
  assert.equal(result.recoveredFinalAnswer, 'Pogoda we Wrocławiu to 12°C.');
});
