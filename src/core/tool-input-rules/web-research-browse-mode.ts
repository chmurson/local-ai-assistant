import { classifyWebIntent, selectWebBehavior } from '../web-intent.js';

function getUrl(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const value = (input as Record<string, unknown>).url;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getQuery(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const value = (input as Record<string, unknown>).query;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function urlLooksLikeListingPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname
      .split('/')
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean);

    if (pathSegments.length === 0) {
      return true;
    }

    const listingSegments = new Set([
      'news',
      'newest',
      'latest',
      'recent',
      'top',
      'stories',
      'home',
      'blog',
      'posts',
      'articles',
      'article',
      'category',
      'categories',
      'tag',
      'tags',
      'topics',
      'topic',
      'search'
    ]);

    return pathSegments.every((segment) => listingSegments.has(segment));
  } catch {
    return false;
  }
}

function buildBrowseQuery(url: string, userMessage: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathTerms = parsed.pathname
      .split('/')
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean)
      .flatMap((segment) => segment.split(/[^a-z0-9]+/i))
      .filter(Boolean)
      .slice(0, 3);
    const cleanedMessage = userMessage.replace(/https?:\/\/\S+/gi, ' ').replace(/\s+/g, ' ').trim();

    return [`site:${host}`, ...pathTerms, cleanedMessage].filter(Boolean).join(' ').trim();
  } catch {
    return userMessage.trim();
  }
}

export function normalizeWebResearchBrowseMode(params: {
  userMessage?: string;
  input: unknown;
}): {
  input: unknown;
  changed: boolean;
  note?: string;
} {
  const currentQuery = getQuery(params.input);
  const currentUrl = getUrl(params.input);

  if (!params.userMessage || currentQuery || !currentUrl) {
    return { input: params.input, changed: false };
  }

  const classification = classifyWebIntent(params.userMessage);
  const behavior = selectWebBehavior(classification);

  if (behavior.preferredTool !== 'web_research' || behavior.retrievalMode !== 'query') {
    return { input: params.input, changed: false };
  }

  if (!urlLooksLikeListingPage(currentUrl)) {
    return { input: params.input, changed: false };
  }

  return {
    input: {
      query: buildBrowseQuery(currentUrl, params.userMessage),
      depth: 'summary',
      limit: 3
    },
    changed: true,
    note: `Normalized web research from page mode to query mode for browse/listing URL ${currentUrl}.`
  };
}
