export type WebIntent =
  | 'current_fact'
  | 'news_listing'
  | 'page_read'
  | 'general_search'
  | 'raw_fetch'
  | 'none';

export type CurrentFactSubtype =
  | 'person_role'
  | 'weather'
  | 'time'
  | 'price'
  | 'score_or_winner'
  | 'generic_current_fact';

export interface WebIntentClassification {
  intent: WebIntent;
  subtype?: CurrentFactSubtype;
  explicitUrl: boolean;
}

export interface WebBehaviorProfile {
  preferredTool: 'web_research' | 'http_fetch' | 'none';
  retrievalMode: 'query' | 'page' | 'page_if_url_else_query' | 'raw' | 'none';
  answerStrategy:
    | 'current_fact'
    | 'ranked_listing'
    | 'page_summary'
    | 'search_summary'
    | 'raw_response'
    | 'no_web';
  requireFreshEvidence: boolean;
  allowGuessing: boolean;
}

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ').toLowerCase();
}

function hasExplicitUrl(message: string): boolean {
  return /https?:\/\/\S+/i.test(message);
}

function includesAny(message: string, phrases: string[]): boolean {
  return phrases.some((phrase) => message.includes(phrase));
}

function looksLikeRawFetch(message: string): boolean {
  return includesAny(message, [
    'raw json',
    'raw html',
    'html source',
    'source code',
    'response body',
    'status code',
    'headers',
    'api response',
    'curl',
    'raw response',
    'body odpowiedzi',
    'kod html',
    'zrodlo strony',
    'źródło strony'
  ]);
}

function looksLikePageRead(message: string, explicitUrl: boolean): boolean {
  if (!explicitUrl) {
    return false;
  }

  return includesAny(message, [
    'summarize this page',
    'read this page',
    'read the page',
    'what does this page say',
    'open this url',
    'tej strony',
    'tresc strony',
    'treść strony',
    'przeczytaj stron',
    'podsumuj stron'
  ]);
}

function classifyCurrentFactSubtype(message: string): CurrentFactSubtype {
  if (
    includesAny(message, ['weather', 'forecast', 'pogoda', 'prognoza']) ||
    /\bweather in\b/.test(message)
  ) {
    return 'weather';
  }

  if (includesAny(message, ['what time is it', 'current time', 'time in ', 'godzina', 'ktora godzina'])) {
    return 'time';
  }

  if (
    includesAny(message, ['price of', 'current price', 'stock price', 'btc price', 'eth price', 'kurs', 'cena']) ||
    /\bprice\b/.test(message)
  ) {
    return 'price';
  }

  if (
    includesAny(message, ['who won', 'winner', 'score', 'result', 'wynik', 'kto wygr', 'kto wygra']) ||
    /\bwon\b/.test(message)
  ) {
    return 'score_or_winner';
  }

  if (
    includesAny(message, [
      'president of',
      'prime minister of',
      'ceo of',
      'governor of',
      'mayor of',
      'leader of',
      'king of',
      'queen of',
      'who is president',
      'who is the president',
      'who is ceo',
      'who is the ceo',
      'kto jest prezydentem',
      'kto jest premierem'
    ])
  ) {
    return 'person_role';
  }

  return 'generic_current_fact';
}

function looksLikeCurrentFact(message: string): boolean {
  return (
    includesAny(message, [
      'current',
      'currently',
      'latest',
      'today',
      'now',
      'most recent',
      'obecny',
      'aktualny',
      'dzisiaj',
      'teraz',
      'najnowszy',
      'najnowsza',
      'najnowsze'
    ]) ||
    includesAny(message, [
      'who is president',
      'who is the president',
      'president of',
      'who is ceo',
      'who is the ceo',
      'ceo of',
      'weather',
      'forecast',
      'what time is it',
      'price of',
      'who won',
      'winner',
      'score',
      'wynik',
      'pogoda',
      'prognoza',
      'kto wygr',
      'kto wygra'
    ])
  );
}

function looksLikeNewsListing(message: string): boolean {
  return includesAny(message, [
    'latest news',
    'top news',
    'headlines',
    'top stories',
    'latest stories',
    'hacker news',
    'haker news',
    'news.ycombinator.com',
    'newsy',
    'wiadomosci',
    'wiadomości',
    'najnowsze artykuly',
    'najnowsze artykuły'
  ]);
}

function looksLikeGeneralSearch(message: string): boolean {
  return includesAny(message, [
    'search',
    'research',
    'look up',
    'find',
    'sprawdz',
    'sprawdź',
    'wyszukaj',
    'znajdz',
    'znajdź'
  ]);
}

export function classifyWebIntent(message: string): WebIntentClassification {
  const normalized = normalizeMessage(message);
  const explicitUrl = hasExplicitUrl(normalized);

  if (looksLikeRawFetch(normalized)) {
    return { intent: 'raw_fetch', explicitUrl };
  }

  if (looksLikePageRead(normalized, explicitUrl)) {
    return { intent: 'page_read', explicitUrl };
  }

  if (looksLikeNewsListing(normalized)) {
    return { intent: 'news_listing', explicitUrl };
  }

  if (looksLikeCurrentFact(normalized)) {
    return {
      intent: 'current_fact',
      subtype: classifyCurrentFactSubtype(normalized),
      explicitUrl
    };
  }

  if (explicitUrl) {
    return { intent: 'page_read', explicitUrl: true };
  }

  if (looksLikeGeneralSearch(normalized)) {
    return { intent: 'general_search', explicitUrl };
  }

  return { intent: 'none', explicitUrl };
}

export function selectWebBehavior(classification: WebIntentClassification): WebBehaviorProfile {
  switch (classification.intent) {
    case 'raw_fetch':
      return {
        preferredTool: 'http_fetch',
        retrievalMode: 'raw',
        answerStrategy: 'raw_response',
        requireFreshEvidence: false,
        allowGuessing: false
      };
    case 'page_read':
      return {
        preferredTool: 'web_research',
        retrievalMode: classification.explicitUrl ? 'page' : 'page_if_url_else_query',
        answerStrategy: 'page_summary',
        requireFreshEvidence: false,
        allowGuessing: false
      };
    case 'news_listing':
      return {
        preferredTool: 'web_research',
        retrievalMode: 'query',
        answerStrategy: 'ranked_listing',
        requireFreshEvidence: true,
        allowGuessing: false
      };
    case 'current_fact':
      return {
        preferredTool: 'web_research',
        retrievalMode: 'query',
        answerStrategy: 'current_fact',
        requireFreshEvidence: true,
        allowGuessing: false
      };
    case 'general_search':
      return {
        preferredTool: 'web_research',
        retrievalMode: 'query',
        answerStrategy: 'search_summary',
        requireFreshEvidence: false,
        allowGuessing: false
      };
    case 'none':
    default:
      return {
        preferredTool: 'none',
        retrievalMode: 'none',
        answerStrategy: 'no_web',
        requireFreshEvidence: false,
        allowGuessing: true
      };
  }
}
