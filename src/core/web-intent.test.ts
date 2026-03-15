import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyWebIntent, selectWebBehavior } from './web-intent.js';

test('classifyWebIntent detects current-fact person role queries', () => {
  const result = classifyWebIntent('Who is president of USA ?');

  assert.deepEqual(result, {
    intent: 'current_fact',
    subtype: 'person_role',
    explicitUrl: false
  });
});

test('classifyWebIntent detects weather as current fact', () => {
  const result = classifyWebIntent("what's the weather in Ciechocinek ?");

  assert.deepEqual(result, {
    intent: 'current_fact',
    subtype: 'weather',
    explicitUrl: false
  });
});

test('classifyWebIntent detects news listing requests', () => {
  const result = classifyWebIntent('find top 3 news from hacker news');

  assert.deepEqual(result, {
    intent: 'news_listing',
    explicitUrl: false
  });
});

test('classifyWebIntent detects page reading from explicit URL', () => {
  const result = classifyWebIntent('Summarize this page https://example.com/article');

  assert.deepEqual(result, {
    intent: 'page_read',
    explicitUrl: true
  });
});

test('classifyWebIntent detects raw fetch requests', () => {
  const result = classifyWebIntent('Show raw JSON and status code from this API');

  assert.deepEqual(result, {
    intent: 'raw_fetch',
    explicitUrl: false
  });
});

test('classifyWebIntent falls back to general search', () => {
  const result = classifyWebIntent('search for best keyboard layouts');

  assert.deepEqual(result, {
    intent: 'general_search',
    explicitUrl: false
  });
});

test('selectWebBehavior maps current fact to fresh web research query mode', () => {
  const behavior = selectWebBehavior({
    intent: 'current_fact',
    subtype: 'person_role',
    explicitUrl: false
  });

  assert.deepEqual(behavior, {
    preferredTool: 'web_research',
    retrievalMode: 'query',
    answerStrategy: 'current_fact',
    requireFreshEvidence: true,
    allowGuessing: false
  });
});

test('selectWebBehavior maps explicit page read to page mode', () => {
  const behavior = selectWebBehavior({
    intent: 'page_read',
    explicitUrl: true
  });

  assert.deepEqual(behavior, {
    preferredTool: 'web_research',
    retrievalMode: 'page',
    answerStrategy: 'page_summary',
    requireFreshEvidence: false,
    allowGuessing: false
  });
});

test('selectWebBehavior maps raw fetch to http_fetch', () => {
  const behavior = selectWebBehavior({
    intent: 'raw_fetch',
    explicitUrl: true
  });

  assert.deepEqual(behavior, {
    preferredTool: 'http_fetch',
    retrievalMode: 'raw',
    answerStrategy: 'raw_response',
    requireFreshEvidence: false,
    allowGuessing: false
  });
});

test('selectWebBehavior returns no-web profile for non-web intent', () => {
  const behavior = selectWebBehavior({
    intent: 'none',
    explicitUrl: false
  });

  assert.deepEqual(behavior, {
    preferredTool: 'none',
    retrievalMode: 'none',
    answerStrategy: 'no_web',
    requireFreshEvidence: false,
    allowGuessing: true
  });
});
