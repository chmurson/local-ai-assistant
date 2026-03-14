function getUrl(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const value = (input as Record<string, unknown>).url;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function mentionsHackerNews(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes('hacker news') ||
    lowered.includes('hn ') ||
    lowered === 'hn' ||
    lowered.includes('news.ycombinator.com')
  );
}

function wantsNewest(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes('newest') ||
    lowered.includes('latest submissions') ||
    lowered.includes('recent submissions') ||
    lowered.includes('new submissions')
  );
}

function wantsSearchOrApi(message: string): boolean {
  const lowered = message.toLowerCase();
  return lowered.includes('search') || lowered.includes('algolia') || lowered.includes('api');
}

function isOfficialHackerNewsApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'hacker-news.firebaseio.com' && parsed.pathname.startsWith('/v0/');
  } catch {
    return false;
  }
}

export function normalizeHackerNewsHttpFetch(params: {
  userMessage?: string;
  input: unknown;
}): {
  input: unknown;
  changed: boolean;
  note?: string;
} {
  if (!params.userMessage) {
    return { input: params.input, changed: false };
  }

  const proposedUrl = getUrl(params.input);
  if (!proposedUrl || !mentionsHackerNews(params.userMessage)) {
    return { input: params.input, changed: false };
  }

  if (isOfficialHackerNewsApiUrl(proposedUrl)) {
    return { input: params.input, changed: false };
  }

  if (wantsSearchOrApi(params.userMessage)) {
    return { input: params.input, changed: false };
  }

  const normalizedUrl = wantsNewest(params.userMessage)
    ? 'https://news.ycombinator.com/newest'
    : 'https://news.ycombinator.com/';

  if (proposedUrl === normalizedUrl) {
    return { input: params.input, changed: false };
  }

  return {
    input: {
      ...(typeof params.input === 'object' && params.input !== null && !Array.isArray(params.input)
        ? params.input
        : {}),
      url: normalizedUrl
    },
    changed: true,
    note: `Normalized Hacker News fetch URL from ${proposedUrl} to ${normalizedUrl} based on user intent.`
  };
}
