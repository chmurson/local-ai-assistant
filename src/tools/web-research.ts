import { z } from 'zod';
import type { ToolDefinition } from '../types/tool.js';
import { runWebResearchPage, runWebResearchSearch } from '../core/mcp-web-search-client.js';

const inputSchema = z
  .object({
    query: z.string().min(1).optional(),
    url: z.string().url().optional(),
    depth: z.enum(['summary', 'full']).optional(),
    limit: z.number().int().min(1).max(5).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.query && !value.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either query or url'
      });
    }

    if (value.query && value.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide query or url, not both'
      });
    }
  });

export const webResearchTool: ToolDefinition = {
  name: 'web_research',
  description:
    'Search the web or extract a specific webpage via a local external MCP server. Prefer this for general web research instead of raw http_fetch. Use depth=summary by default; use depth=full only when content excerpts are needed.',
  async run(input) {
    const parsed = inputSchema.parse(input);

    if (parsed.url) {
      return runWebResearchPage(parsed.url);
    }

    return runWebResearchSearch({
      query: parsed.query!,
      depth: parsed.depth ?? 'summary',
      limit: parsed.limit ?? 3
    });
  }
};
