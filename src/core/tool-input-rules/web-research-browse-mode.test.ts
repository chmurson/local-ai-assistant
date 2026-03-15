import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWebResearchBrowseMode } from './web-research-browse-mode.js';

test('normalizes browse-style listing URL into query mode', () => {
  const result = normalizeWebResearchBrowseMode({
    userMessage: 'Pobierz newsy z filmweb.pl',
    input: {
      url: 'https://filmweb.pl/news'
    }
  });

  assert.equal(result.changed, true);
  assert.deepEqual(result.input, {
    query: 'site:filmweb.pl news Pobierz newsy z filmweb.pl',
    depth: 'summary',
    limit: 3
  });
});

test('keeps page mode for exact page reading intent', () => {
  const result = normalizeWebResearchBrowseMode({
    userMessage: 'Read the exact page content from this URL',
    input: {
      url: 'https://filmweb.pl/news'
    }
  });

  assert.equal(result.changed, false);
  assert.deepEqual(result.input, {
    url: 'https://filmweb.pl/news'
  });
});
