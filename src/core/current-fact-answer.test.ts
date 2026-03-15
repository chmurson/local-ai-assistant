import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeterministicCurrentFactAnswer } from './current-fact-answer.js';
import type { ToolCallRecord } from '../types/trace.js';

function buildWebResearchCall(results: Array<{ title: string; url: string; description: string }>): ToolCallRecord {
  return {
    toolName: 'web_research',
    input: { query: 'current US president' },
    output: {
      mode: 'summary',
      query: 'current US president',
      results
    },
    startedAt: '2026-03-15T00:00:00.000Z',
    finishedAt: '2026-03-15T00:00:01.000Z',
    success: true
  };
}

test('buildDeterministicCurrentFactAnswer extracts person-role answer from official evidence', () => {
  const answer = buildDeterministicCurrentFactAnswer({
    userMessage: 'Who is president of USA ?',
    toolCalls: [
      buildWebResearchCall([
        {
          title: 'List of presidents of the United States - Wikipedia',
          url: 'https://en.wikipedia.org/wiki/List_of_presidents_of_the_United_States',
          description: 'Historical list of U.S. presidents.'
        },
        {
          title: 'President Donald J. Trump - The White House',
          url: 'https://www.whitehouse.gov/administration/donald-j-trump/',
          description: "Learn about President Trump's achievements and plans for his second term."
        },
        {
          title: 'President Donald Trump - GovTrack.us',
          url: 'https://www.govtrack.us/congress/other-people/donald_trump/412733',
          description:
            "Trump is President of the United States and is a Republican. He has served since Jan. 20, 2025."
        }
      ])
    ]
  });

  assert.equal(
    answer,
    'Current president of USA: Donald J. Trump. Source: https://www.whitehouse.gov/administration/donald-j-trump/'
  );
});

test('buildDeterministicCurrentFactAnswer returns null for non-person-role current fact', () => {
  const answer = buildDeterministicCurrentFactAnswer({
    userMessage: "what's the weather in Ciechocinek ?",
    toolCalls: []
  });

  assert.equal(answer, null);
});

test('buildDeterministicCurrentFactAnswer handles descriptions with inverted role phrasing', () => {
  const answer = buildDeterministicCurrentFactAnswer({
    userMessage: 'Who is president of USA ?',
    toolCalls: [
      buildWebResearchCall([
        {
          title: 'Who Is The President Of The USA? - All About America',
          url: 'https://allaboutamerica.com/united-states/who-is-the-president-of-the-usa.html',
          description:
            'As of 2025, the President of the United States is Donald J. Trump, a real estate mogul and political figure.'
        }
      ])
    ]
  });

  assert.equal(
    answer,
    'Current president of USA: Donald J. Trump. Source: https://allaboutamerica.com/united-states/who-is-the-president-of-the-usa.html'
  );
});

test('buildDeterministicCurrentFactAnswer ignores interrogative pseudo-names and extracts ordinal phrasing', () => {
  const answer = buildDeterministicCurrentFactAnswer({
    userMessage: 'Who is president of USA ?',
    toolCalls: [
      buildWebResearchCall([
        {
          title: 'Donald Trump - Wikipedia',
          url: 'https://en.wikipedia.org/wiki/Donald_Trump',
          description:
            'Donald John Trump is an American politician and businessman who is the 47th president of the United States.'
        },
        {
          title: 'Who Is The President Of The USA? - All About America',
          url: 'https://allaboutamerica.com/united-states/who-is-the-president-of-the-usa.html',
          description:
            'Who Is The President Of The USA? As of 2025, the President of the United States is Donald J. Trump, a real estate mogul and political outsider.'
        }
      ])
    ]
  });

  assert.ok(answer);
  assert.match(answer, /^Current president of USA: Donald (?:J\.|John) Trump\. Source: https?:\/\//);
  assert.doesNotMatch(answer, /Current president of USA: Who\./);
});
