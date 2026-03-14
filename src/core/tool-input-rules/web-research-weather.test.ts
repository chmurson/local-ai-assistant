import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWeatherWebResearch } from './web-research-weather.js';

test('weather normalizer keeps Wrocław instead of defaulting to Warszawa', () => {
  const result = normalizeWeatherWebResearch({
    userMessage: 'Pogoda we Wrocławiu?',
    input: {
      query: 'pogoda we Wrocławiu aktualna'
    }
  });

  assert.equal(result.changed, true);
  assert.deepEqual(result.input, {
    query: 'site:meteo.pl Wrocławiu prognoza pogody',
    depth: 'summary',
    limit: 3
  });
});

test('weather normalizer does not rewrite already matching meteo query', () => {
  const result = normalizeWeatherWebResearch({
    userMessage: 'Pogoda we Wrocławiu?',
    input: {
      query: 'site:meteo.pl Wrocławiu prognoza pogody',
      depth: 'summary',
      limit: 3
    }
  });

  assert.equal(result.changed, false);
});
