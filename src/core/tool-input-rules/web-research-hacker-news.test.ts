import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHackerNewsWebResearch } from './web-research-hacker-news.js';

test('normalizes Haker News typo to official Y Combinator source', () => {
  const result = normalizeHackerNewsWebResearch({
    userMessage: 'Pobierz newsy z Haker News i podaj 10 top',
    input: {
      query: 'haker news top stories'
    }
  });

  assert.equal(result.changed, true);
  assert.deepEqual(result.input, {
    url: 'https://news.ycombinator.com/'
  });
});

test('normalizes newest Hacker News requests to the newest page', () => {
  const result = normalizeHackerNewsWebResearch({
    userMessage: 'What are the newest stories on Hacker News?',
    input: {
      query: 'hacker news newest stories'
    }
  });

  assert.equal(result.changed, true);
  assert.deepEqual(result.input, {
    url: 'https://news.ycombinator.com/newest'
  });
});
