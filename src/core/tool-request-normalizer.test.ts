import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeToolRequest } from './tool-request-normalizer.js';

test('normalizes http_fetch news browsing intent into web_research query mode for listing URLs', () => {
  const result = normalizeToolRequest({
    toolName: 'http_fetch',
    input: {
      url: 'https://filmweb.pl/news'
    },
    userMessage: 'Pobierz newsy z filmweb.pl'
  });

  assert.equal(result.toolName, 'web_research');
  assert.equal(result.toolNormalized, true);
  assert.equal(result.originalToolName, 'http_fetch');
  assert.deepEqual(result.input, {
    query: 'site:filmweb.pl news newsy z filmweb.pl',
    depth: 'summary',
    limit: 3
  });
});

test('normalizes current-fact http_fetch intent into web_research query mode', () => {
  const result = normalizeToolRequest({
    toolName: 'http_fetch',
    input: {
      url: 'https://example.com/president'
    },
    userMessage: 'Who is president of USA ?'
  });

  assert.equal(result.toolName, 'web_research');
  assert.deepEqual(result.input, {
    query: 'site:example.com president Who is president of USA ?',
    depth: 'summary',
    limit: 3
  });
});

test('keeps explicit page-read intent in web_research page mode', () => {
  const result = normalizeToolRequest({
    toolName: 'http_fetch',
    input: {
      url: 'https://example.com/article'
    },
    userMessage: 'Summarize this page https://example.com/article'
  });

  assert.equal(result.toolName, 'web_research');
  assert.deepEqual(result.input, {
    url: 'https://example.com/article'
  });
});

test('keeps http_fetch for explicit raw technical fetch requests', () => {
  const result = normalizeToolRequest({
    toolName: 'http_fetch',
    input: {
      url: 'https://wttr.in/Wroclaw?format=j1'
    },
    userMessage: 'Pokaż raw JSON i status code z tego API'
  });

  assert.equal(result.toolName, 'http_fetch');
  assert.equal(result.toolNormalized, false);
});
