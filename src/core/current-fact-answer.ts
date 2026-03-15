import { classifyWebIntent } from './web-intent.js';
import type { ToolCallRecord } from '../types/trace.js';

interface SearchResultEvidence {
  title: string;
  url: string;
  description: string;
}

interface CandidateScore {
  name: string;
  score: number;
  sourceUrl: string;
}

const NON_NAME_CANDIDATES = new Set(['who', 'what', 'when', 'where', 'why', 'how']);

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cleanExtractedName(value: string): string {
  return normalizeWhitespace(value)
    .replace(/\s+is$/i, '')
    .replace(/[.,;:]+$/g, '')
    .trim();
}

function extractRoleLabel(message: string): string | null {
  const lowered = message.toLowerCase();
  const roles = ['president', 'prime minister', 'ceo', 'governor', 'mayor', 'chancellor', 'king', 'queen'];
  return roles.find((role) => lowered.includes(role)) ?? null;
}

function extractSubjectLabel(message: string): string | null {
  const match = message.match(/\b(?:president|prime minister|ceo|governor|mayor|chancellor|king|queen)\s+of\s+(.+?)[?.!]*$/i);
  const value = match?.[1]?.trim();
  return value ? normalizeWhitespace(value) : null;
}

function resultLooksOfficial(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.gov') || host.includes('whitehouse.gov') || host.includes('govtrack.us');
  } catch {
    return false;
  }
}

function extractNameFromTitle(title: string, roleLabel: string): string | null {
  const escapedRole = roleLabel.replace(/\s+/g, '\\s+');
  const match = title.match(new RegExp(`^${escapedRole}\\s+(.+?)(?:\\s+[\\-|\\|]|$)`, 'i'));
  const value = match?.[1]?.trim();
  return value ? cleanExtractedName(value) : null;
}

function extractNameFromDescription(description: string, roleLabel: string): string | null {
  const escapedRole = roleLabel.replace(/\s+/g, '\\s+');
  const directSubjectMatch = description.match(
    new RegExp(
      `([A-Z][a-z]+(?:\\s+[A-Z][a-z.]+){0,3})(?:[^.]{0,160}?)\\bis\\s+(?:the\\s+)?(?:current\\s+|\\d{1,2}(?:st|nd|rd|th)\\s+)?${escapedRole}\\b`,
      'i'
    )
  );
  const inverseSubjectMatch = description.match(
    new RegExp(`(?:the\\s+)?${escapedRole}\\s+of\\s+.+?\\s+is\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z.]+){0,3})`, 'i')
  );
  const directValue = directSubjectMatch?.[1]?.trim();
  const inverseValue = inverseSubjectMatch?.[1]?.trim();

  for (const candidate of [directValue, inverseValue]) {
    if (!candidate) {
      continue;
    }

    const cleaned = cleanExtractedName(candidate);
    if (isLikelyPersonName(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

function isLikelyPersonName(name: string): boolean {
  const normalized = normalizeWhitespace(name);
  if (!normalized) {
    return false;
  }

  if (NON_NAME_CANDIDATES.has(normalized.toLowerCase())) {
    return false;
  }

  return /[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,3}/.test(normalized);
}

function collectSearchResults(toolCalls: ToolCallRecord[]): SearchResultEvidence[] {
  const results: SearchResultEvidence[] = [];

  for (const call of toolCalls) {
    if (!call.success || call.toolName !== 'web_research') {
      continue;
    }

    if (!call.output || typeof call.output !== 'object' || Array.isArray(call.output)) {
      continue;
    }

    const output = call.output as Record<string, unknown>;
    if (!Array.isArray(output.results)) {
      continue;
    }

    for (const item of output.results) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }

      const record = item as Record<string, unknown>;
      if (
        typeof record.title === 'string' &&
        typeof record.url === 'string' &&
        typeof record.description === 'string'
      ) {
        results.push({
          title: normalizeWhitespace(record.title),
          url: record.url,
          description: normalizeWhitespace(record.description)
        });
      }
    }
  }

  return results;
}

function pickBestPersonRoleCandidate(results: SearchResultEvidence[], roleLabel: string): CandidateScore | null {
  const candidates = new Map<string, CandidateScore>();

  for (const result of results) {
    const titleName = extractNameFromTitle(result.title, roleLabel);
    const descriptionName = extractNameFromDescription(result.description, roleLabel);
    const name = titleName ?? descriptionName;

    if (!name || !isLikelyPersonName(name)) {
      continue;
    }

    const key = name.toLowerCase();
    const current = candidates.get(key) ?? { name, score: 0, sourceUrl: result.url };
    current.score += titleName ? 4 : 2;
    current.score += resultLooksOfficial(result.url) ? 3 : 0;
    current.score += /\b(served since|current term|plans for (?:his|her) second term)\b/i.test(result.description) ? 2 : 0;
    current.score += new RegExp(`\\b${roleLabel.replace(/\s+/g, '\\s+')}\\b`, 'i').test(result.title) ? 1 : 0;

    if (resultLooksOfficial(result.url)) {
      current.sourceUrl = result.url;
    }

    candidates.set(key, current);
  }

  const sorted = [...candidates.values()].sort((left, right) => right.score - left.score);
  const best = sorted[0];
  if (!best || best.score < 3) {
    return null;
  }

  return best;
}

export function buildDeterministicCurrentFactAnswer(params: {
  userMessage: string;
  toolCalls: ToolCallRecord[];
}): string | null {
  const classification = classifyWebIntent(params.userMessage);
  if (classification.intent !== 'current_fact' || classification.subtype !== 'person_role') {
    return null;
  }

  const roleLabel = extractRoleLabel(params.userMessage);
  if (!roleLabel) {
    return null;
  }

  const candidate = pickBestPersonRoleCandidate(collectSearchResults(params.toolCalls), roleLabel);
  if (!candidate) {
    return null;
  }

  const subjectLabel = extractSubjectLabel(params.userMessage);
  const rolePhrase = subjectLabel ? `${roleLabel} of ${subjectLabel}` : roleLabel;
  return `Current ${rolePhrase}: ${candidate.name}. Source: ${candidate.sourceUrl}`;
}
