function mentionsHackerNews(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes('hacker news') ||
    lowered.includes('haker news') ||
    lowered.includes('news.ycombinator.com') ||
    lowered === 'hn' ||
    lowered.includes(' hn ')
  );
}

function wantsNewest(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes('newest') ||
    lowered.includes('new stories') ||
    lowered.includes('new articles') ||
    lowered.includes('najnows') ||
    lowered.includes('nowe')
  );
}

function getUrl(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const value = (input as Record<string, unknown>).url;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function normalizeHackerNewsWebResearch(params: {
  userMessage?: string;
  input: unknown;
}): {
  input: unknown;
  changed: boolean;
  note?: string;
} {
  if (!params.userMessage || !mentionsHackerNews(params.userMessage)) {
    return { input: params.input, changed: false };
  }

  const normalizedUrl = wantsNewest(params.userMessage)
    ? 'https://news.ycombinator.com/newest'
    : 'https://news.ycombinator.com/';

  const currentUrl = getUrl(params.input);
  if (currentUrl === normalizedUrl) {
    return { input: params.input, changed: false };
  }

  return {
    input: { url: normalizedUrl },
    changed: true,
    note: `Normalized web research to official Hacker News source ${normalizedUrl}.`
  };
}
