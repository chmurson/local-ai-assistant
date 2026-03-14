import type { ToolName } from '../../types/config.js';

function getUrl(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const value = (input as Record<string, unknown>).url;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function userProvidedExplicitUrl(message: string): boolean {
  return /https?:\/\/\S+/i.test(message);
}

function shouldPreferWebResearch(message: string): boolean {
  const lowered = message.toLowerCase();
  return [
    'search',
    'research',
    'look up',
    'latest',
    'most recent',
    'recent',
    'current',
    'news'
  ].some((phrase) => lowered.includes(phrase));
}

function buildSearchQuery(message: string): string {
  return message
    .trim()
    .replace(/^search (the )?web for\s+/i, '')
    .replace(/^search for\s+/i, '')
    .replace(/^look up\s+/i, '')
    .replace(/^research\s+/i, '')
    .replace(/^find (the )?(latest|current|recent)\s+/i, '')
    .replace(/^find\s+/i, '')
    .replace(/^pobierz\s+/i, '')
    .replace(/^sprawdź\s+/i, '')
    .trim();
}

function isSearchResultUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    return (
      (host.includes('bing.com') && path.startsWith('/search')) ||
      (host.includes('google.') && path.startsWith('/search')) ||
      host === 'duckduckgo.com' ||
      host === 'search.brave.com'
    );
  } catch {
    return false;
  }
}

function isApiLikeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    return host.startsWith('api.') || path.includes('/api/') || path.endsWith('.json');
  } catch {
    return false;
  }
}

function wantsRawFetch(message: string): boolean {
  const lowered = message.toLowerCase();
  return [
    'raw html',
    'html source',
    'source code',
    'response body',
    'status code',
    'headers',
    'api',
    'json',
    'curl',
    'raw response',
    'kod html',
    'źródło strony',
    'zrodlo strony',
    'body odpowiedzi'
  ].some((phrase) => lowered.includes(phrase));
}

export function normalizeHttpFetchToWebResearch(params: {
  toolName: ToolName;
  input: unknown;
  userMessage?: string;
}): {
  toolName: ToolName;
  input: unknown;
  changed: boolean;
  note?: string;
} {
  if (params.toolName !== 'http_fetch' || !params.userMessage) {
    return {
      toolName: params.toolName,
      input: params.input,
      changed: false
    };
  }

  if (wantsRawFetch(params.userMessage)) {
    return {
      toolName: params.toolName,
      input: params.input,
      changed: false
    };
  }

  const proposedUrl = getUrl(params.input);
  if (proposedUrl) {
    if (isSearchResultUrl(proposedUrl) || isApiLikeUrl(proposedUrl)) {
      return {
        toolName: 'web_research',
        input: {
          query: buildSearchQuery(params.userMessage),
          depth: 'summary',
          limit: 3
        },
        changed: true,
        note: `Rewrote tool request from http_fetch(${proposedUrl}) to web_research query mode for browsing/search intent.`
      };
    }

    return {
      toolName: 'web_research',
      input: {
        url: proposedUrl
      },
      changed: true,
      note: `Rewrote tool request from http_fetch(${proposedUrl}) to web_research page mode for browsing/search intent.`
    };
  }

  if (userProvidedExplicitUrl(params.userMessage) || shouldPreferWebResearch(params.userMessage)) {
    return {
      toolName: 'web_research',
      input: {
        query: buildSearchQuery(params.userMessage),
        depth: 'summary',
        limit: 3
      },
      changed: true,
      note: 'Rewrote tool request from http_fetch to web_research query mode for browsing/search intent.'
    };
  }

  return {
    toolName: params.toolName,
    input: params.input,
    changed: false
  };
}
