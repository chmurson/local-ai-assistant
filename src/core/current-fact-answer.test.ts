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

test('buildDeterministicCurrentFactAnswer ignores generic office pages from recent USA trace and keeps the person name', () => {
  const answer = buildDeterministicCurrentFactAnswer({
    userMessage: 'Who is president of USA ?',
    toolCalls: [
      buildWebResearchCall([
        {
          title: 'President of the United States - Wikipedia',
          url: 'https://www.bing.com/ck/a?!&&p=c37f7f871e0127d7c0a9cd182c5aa1f018d56eec394ed832e0a3c0d8f1be69a1JmltdHM9MTc3MzUzMjgwMA&ptn=3&ver=2&hsh=4&fclid=0c3603aa-242f-6761-3265-14b7254f6650&u=a1aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvUHJlc2lkZW50X29mX3RoZV9Vbml0ZWRfU3RhdGVz&ntb=1',
          description:
            'The president of the United States (POTUS) is the head of state and head of government of the United States.'
        },
        {
          title: 'Who Is The President Of The USA? - All About America',
          url: 'https://www.bing.com/ck/a?!&&p=02b8543899c35b3decc41982513773efdad730ec7cf9d87c4a3e9bfc80bdd5c6JmltdHM9MTc3MzUzMjgwMA&ptn=3&ver=2&hsh=4&fclid=0c3603aa-242f-6761-3265-14b7254f6650&u=a1aHR0cHM6Ly9hbGxhYm91dGFtZXJpY2EuY29tL3VuaXRlZC1zdGF0ZXMvd2hvLWlzLXRoZS1wcmVzaWRlbnQtb2YtdGhlLXVzYS5odG1s&ntb=1',
          description:
            'Apr 15, 2025 · As of 2025, the President of the United States is Donald J. Trump, a real estate mogul, television personality, and political outsider who reshaped modern American politics.'
        },
        {
          title: 'Donald Trump | Birthday, Age, Education, Biography, Impeachments ...',
          url: 'https://www.britannica.com/biography/Donald-Trump',
          description:
            'Donald Trump (born June 14, 1946, New York, New York, U.S.) 45th president of the United States.'
        }
      ])
    ]
  });

  assert.equal(
    answer,
    'Current president of USA: Donald J. Trump. Source: https://allaboutamerica.com/united-states/who-is-the-president-of-the-usa.html'
  );
});

test('buildDeterministicCurrentFactAnswer extracts person name from official Poland biography title from recent trace', () => {
  const answer = buildDeterministicCurrentFactAnswer({
    userMessage: 'current president of Poland',
    toolCalls: [
      buildWebResearchCall([
        {
          title: 'Wikipedia en.wikipedia.org › wiki › Karol_Nawrocki Karol Nawrocki - Wikipedia',
          url: 'https://en.wikipedia.org/wiki/Karol_Nawrocki',
          description: 'No description available'
        },
        {
          title:
            'President of the Republic of Poland president.pl › home page › biography Karol Nawrocki, PhD. – President of the Republic of Poland \\ President \\ Biography \\ Oficjalna strona Prezydenta Rzeczypospolitej Polskiej',
          url: 'https://www.president.pl/president/biography',
          description: 'No description available'
        },
        {
          title: 'Wikipedia en.wikipedia.org › wiki › President_of_Poland President of Poland - Wikipedia',
          url: 'https://en.wikipedia.org/wiki/President_of_Poland',
          description: 'No description available'
        }
      ])
    ]
  });

  assert.equal(
    answer,
    'Current president of Poland: Karol Nawrocki. Source: https://www.president.pl/president/biography'
  );
});
