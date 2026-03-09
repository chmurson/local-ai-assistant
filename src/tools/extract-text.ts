import { z } from 'zod';
import type { ToolDefinition } from '../types/tool.js';

const inputSchema = z.object({
  html: z.string().min(1),
  maxChars: z.number().int().min(100).max(100000).optional(),
  aggressive: z.boolean().optional()
});

function decodeHtmlEntities(text: string): string {
  const named = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  return named
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(head|script|style|noscript|svg|canvas|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(article|section|main|h1|h2|h3|h4|h5|h6|p|li|ul|ol|br|div|tr|td|th)>/gi, '\n')
    .replace(/<\/(article|section|main|h1|h2|h3|h4|h5|h6|p|li|ul|ol|br|div|tr|td|th)>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function isMostlySymbols(line: string): boolean {
  const visible = line.replace(/\s+/g, '');
  if (visible.length === 0) return true;
  const symbolCount = (visible.match(/[^a-zA-Z0-9\u00C0-\u017F]/g) ?? []).length;
  return symbolCount / visible.length > 0.45;
}

function pruneLines(text: string): string {
  const blacklist = /(cookie|privacy|regulamin|zaloguj|log in|sign in|newsletter|reklama|advertisement)/i;
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line.length < 4) continue;
    if (blacklist.test(line)) continue;
    if (isMostlySymbols(line)) continue;
    if (seen.has(line.toLowerCase())) continue;
    seen.add(line.toLowerCase());
    lines.push(line);
  }

  return lines.join('\n');
}

export const extractTextTool: ToolDefinition = {
  name: 'extract_text',
  description: 'Extract plain text from raw HTML with strong stripping and cleanup.',
  async run(input) {
    const parsed = inputSchema.parse(input);
    const maxChars = parsed.maxChars ?? 20000;
    const base = decodeHtmlEntities(stripHtml(parsed.html)).replace(/\r/g, '');
    const cleaned = parsed.aggressive ?? true
      ? pruneLines(base)
      : base.replace(/\s+/g, ' ').trim();
    const plain = cleaned.trim();

    return {
      text: plain.slice(0, maxChars),
      truncated: plain.length > maxChars,
      length: plain.length
    };
  }
};
