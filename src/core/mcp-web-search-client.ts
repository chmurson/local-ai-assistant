import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface WebResearchQueryResult {
  mode: 'summary' | 'full';
  query: string;
  results: Array<{
    title: string;
    url: string;
    description: string;
    contentPreview?: string;
  }>;
}

export interface WebResearchPageResult {
  mode: 'page';
  url: string;
  contentPreview: string;
  fallbackQuery?: string;
  fallbackResults?: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

export type WebResearchResult = WebResearchQueryResult | WebResearchPageResult;

const MCP_WRAPPER_PATH = resolve(process.cwd(), 'scripts', 'run-web-search-mcp.sh');
const MAX_QUERY_RESULTS = 5;
const MAX_FULL_RESULTS = 3;
const MAX_PAGE_PREVIEW_CHARS = 1500;
const MAX_RESULT_CONTENT_PREVIEW_CHARS = 800;

function clip(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars)}...`;
}

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseSearchResponse(text: string): Array<{
  title: string;
  url: string;
  description: string;
  contentPreview?: string;
}> {
  const blocks = text
    .split(/\n---\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const results: Array<{
    title: string;
    url: string;
    description: string;
    contentPreview?: string;
  }> = [];

  for (const block of blocks) {
    const titleMatch = block.match(/^\*\*\d+\.\s+(.+?)\*\*/m);
    const urlMatch = block.match(/^URL:\s*(.+)$/m);
    const descriptionMatch = block.match(/^Description:\s*([\s\S]*?)(?:\n\*\*(?:Full Content|Content Preview):\*\*|$)/m);
    const contentMatch = block.match(/\*\*(?:Full Content|Content Preview):\*\*\n([\s\S]*)$/m);

    if (!titleMatch || !urlMatch || !descriptionMatch) {
      continue;
    }

    results.push({
      title: normalizeLine(titleMatch[1] ?? ''),
      url: normalizeLine(urlMatch[1] ?? ''),
      description: clip(descriptionMatch[1] ?? '', 400),
      ...(contentMatch?.[1] ? { contentPreview: clip(contentMatch[1], MAX_RESULT_CONTENT_PREVIEW_CHARS) } : {})
    });
  }

  return results;
}

function parseSinglePageResponse(url: string, text: string): WebResearchPageResult {
  const contentMatch = text.match(/\*\*(?:Full Content|Content Preview):\*\*\n([\s\S]*)$/m);
  const preview = clip(contentMatch?.[1] ?? text, MAX_PAGE_PREVIEW_CHARS);

  return {
    mode: 'page',
    url,
    contentPreview: preview
  };
}

function shouldFallbackFromPageResult(result: WebResearchPageResult): boolean {
  const lowered = result.contentPreview.toLowerCase();
  return (
    !result.contentPreview.trim() ||
    lowered.includes('word count:** 0') ||
    lowered.includes('content length:** 0') ||
    lowered.endsWith('**content:**')
  );
}

function buildFallbackQueryFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathSegments = parsed.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .slice(0, 3);

    return [`site:${host}`, ...pathSegments].join(' ').trim();
  } catch {
    return url;
  }
}

async function assertWrapperExists(): Promise<void> {
  await access(MCP_WRAPPER_PATH, constants.X_OK);
}

async function withWebSearchClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  await assertWrapperExists();

  const client = new Client({
    name: 'local-agent-web-research',
    version: '1.0.0'
  });

  const transport = new StdioClientTransport({
    command: MCP_WRAPPER_PATH,
    cwd: process.cwd(),
    stderr: 'inherit'
  });

  try {
    await client.connect(transport);
    return await fn(client);
  } finally {
    await client.close().catch(() => undefined);
    await transport.close().catch(() => undefined);
  }
}

function extractTextContent(result: unknown): string {
  if (!result || typeof result !== 'object' || !('content' in result)) {
    return '';
  }

  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .filter((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const entry = item as { type?: unknown; text?: unknown };
      return entry.type === 'text' && typeof entry.text === 'string';
    })
    .map((item) => (item as { text: string }).text)
    .join('\n')
    .trim();
}

export async function runWebResearchSearch(params: {
  query: string;
  depth: 'summary' | 'full';
  limit: number;
}): Promise<WebResearchQueryResult> {
  return withWebSearchClient(async (client) => {
    const safeLimit = Math.max(1, Math.min(params.limit, params.depth === 'full' ? MAX_FULL_RESULTS : MAX_QUERY_RESULTS));
    const toolName = params.depth === 'full' ? 'full-web-search' : 'get-web-search-summaries';
    const result = await client.callTool({
      name: toolName,
      arguments:
        params.depth === 'full'
          ? {
              query: params.query,
              limit: safeLimit,
              includeContent: true,
              maxContentLength: 2500
            }
          : {
              query: params.query,
              limit: safeLimit
            }
    });

    const rawText = extractTextContent(result);
    const parsedResults = parseSearchResponse(rawText);

    return {
      mode: params.depth,
      query: params.query,
      results: parsedResults
    };
  });
}

export async function runWebResearchPage(url: string): Promise<WebResearchPageResult> {
  return withWebSearchClient(async (client) => {
    const result = await client.callTool({
      name: 'get-single-web-page-content',
      arguments: {
        url,
        maxContentLength: MAX_PAGE_PREVIEW_CHARS
      }
    });

    const rawText = extractTextContent(result);
    const pageResult = parseSinglePageResponse(url, rawText);

    if (!shouldFallbackFromPageResult(pageResult)) {
      return pageResult;
    }

    const fallbackQuery = buildFallbackQueryFromUrl(url);
    const searchResult = await client.callTool({
      name: 'get-web-search-summaries',
      arguments: {
        query: fallbackQuery,
        limit: 3
      }
    });

    const fallbackRawText = extractTextContent(searchResult);
    const fallbackResults = parseSearchResponse(fallbackRawText).map((item) => ({
      title: item.title,
      url: item.url,
      description: item.description
    }));

    return {
      ...pageResult,
      fallbackQuery,
      fallbackResults
    };
  });
}
