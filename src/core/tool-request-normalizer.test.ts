import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeToolRequest } from './tool-request-normalizer.js';

test('normalizes http_fetch news browsing intent into web_research page mode for explicit URLs', () => {
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
    url: 'https://filmweb.pl/news'
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
