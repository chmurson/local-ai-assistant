import test from 'node:test';
import assert from 'node:assert/strict';
import { tryRecoverDecisionFromToolCallMarkup } from './tool-call-decision-repair.js';

test('recovers web_research decision from raw tool-call markup', () => {
  const recovered = tryRecoverDecisionFromToolCallMarkup(
    '<|tool_call_start|>[{"name":"web_research","arguments":{"query":"weather Ciechocinek","limit":3}}]<|tool_call_end|>[web_search(query="weather Ciechocinek")]'
  );

  assert.deepEqual(recovered, {
    planSummary: 'Recovered tool request for web_research from raw tool-call markup.',
    shouldUseTool: true,
    toolName: 'web_research',
    toolInput: {
      query: 'weather Ciechocinek',
      limit: 3
    }
  });
});

test('ignores unknown tool names in raw tool-call markup', () => {
  const recovered = tryRecoverDecisionFromToolCallMarkup(
    '<|tool_call_start|>[{"name":"web_search","arguments":{"query":"weather Ciechocinek"}}]<|tool_call_end|>'
  );

  assert.equal(recovered, null);
});
