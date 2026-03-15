import type { ToolName } from '../../types/config.js';
import { classifyWebIntent, selectWebBehavior } from '../web-intent.js';

function getUrl(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const value = (input as Record<string, unknown>).url;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
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

function buildQueryFromUrlAndMessage(url: string, message: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathTerms = parsed.pathname
      .split('/')
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 3);
    const baseQuery = buildSearchQuery(message);
    return [`site:${host}`, ...pathTerms, baseQuery].filter(Boolean).join(' ').trim();
  } catch {
    return buildSearchQuery(message);
  }
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

  const classification = classifyWebIntent(params.userMessage);
  const behavior = selectWebBehavior(classification);
  if (behavior.preferredTool !== 'web_research') {
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

    if (behavior.retrievalMode === 'query') {
      return {
        toolName: 'web_research',
        input: {
          query: buildQueryFromUrlAndMessage(proposedUrl, params.userMessage),
          depth: 'summary',
          limit: 3
        },
        changed: true,
        note: `Rewrote tool request from http_fetch(${proposedUrl}) to web_research query mode based on classified user intent.`
      };
    }

    return {
      toolName: 'web_research',
      input: {
        url: proposedUrl
      },
      changed: true,
      note: `Rewrote tool request from http_fetch(${proposedUrl}) to web_research page mode based on classified user intent.`
    };
  }

  if (behavior.retrievalMode === 'query') {
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
