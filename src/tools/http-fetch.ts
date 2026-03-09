import { z } from 'zod';
import type { ToolDefinition } from '../types/tool.js';

const inputSchema = z.object({
  url: z.string().url(),
  method: z.literal('GET').optional()
});

export const httpFetchTool: ToolDefinition = {
  name: 'http_fetch',
  description: 'Fetch a URL via GET and return text response (max 20k chars).',
  async run(input) {
    const parsed = inputSchema.parse(input);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(parsed.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'text/*,application/json;q=0.9,*/*;q=0.8'
        }
      });

      const text = await response.text();
      return {
        url: parsed.url,
        status: response.status,
        ok: response.ok,
        body: text.slice(0, 20_000),
        truncated: text.length > 20_000
      };
    } finally {
      clearTimeout(timeout);
    }
  }
};
