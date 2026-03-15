import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchFallbackQueries, runWebResearchSearchWithClient } from './mcp-web-search-client.js';

function buildSearchToolText(results: Array<{ title: string; url: string; description: string }>): string {
  return results
    .map(
      (result, index) =>
        `**${index + 1}. ${result.title}**\nURL: ${result.url}\nDescription: ${result.description}`
    )
    .join('\n---\n');
}

test('buildSearchFallbackQueries prefers current-fact rewrite before generic role query', () => {
  assert.deepEqual(buildSearchFallbackQueries('Who is president of USA ?'), [
    'current president of USA',
    'president of USA'
  ]);
});

test('runWebResearchSearchWithClient retries with fallback query after empty initial results', async () => {
  const queries: string[] = [];
  const client = {
    async callTool({ arguments: args }: { name: string; arguments: Record<string, unknown> }) {
      const query = String(args.query ?? '');
      queries.push(query);

      const text =
        query === 'current president of USA'
          ? buildSearchToolText([
              {
                title: 'President Donald J. Trump - The White House',
                url: 'https://www.whitehouse.gov/administration/donald-j-trump/',
                description: "Learn about President Trump's achievements and plans for his second term."
              }
            ])
          : '';

      return {
        content: [{ type: 'text' as const, text }],
        toolResult: null
      };
    }
  };

  const result = await runWebResearchSearchWithClient(client, {
    query: 'Who is president of USA ?',
    depth: 'summary',
    limit: 3
  });

  assert.equal(result.query, 'Who is president of USA ?');
  assert.equal(result.fallbackQuery, 'current president of USA');
  assert.equal(result.results.length, 1);
  assert.deepEqual(queries, ['Who is president of USA ?', 'current president of USA']);
});
