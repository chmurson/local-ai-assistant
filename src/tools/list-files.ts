import { readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { z } from 'zod';
import type { ToolDefinition } from '../types/tool.js';

const inputSchema = z.object({
  path: z.string().optional()
});

async function walk(basePath: string, maxEntries: number): Promise<string[]> {
  const result: string[] = [];
  const queue = [basePath];

  while (queue.length > 0 && result.length < maxEntries) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      result.push(full);
      if (entry.isDirectory() && result.length < maxEntries) {
        queue.push(full);
      }
      if (result.length >= maxEntries) {
        break;
      }
    }
  }

  return result;
}

function resolveSafePath(workspaceRoot: string, targetPath: string): string {
  const resolvedRoot = resolve(workspaceRoot);
  const resolvedTarget = resolve(resolvedRoot, targetPath);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error('Path escapes workspaceRoot');
  }
  return resolvedTarget;
}

export const listFilesTool: ToolDefinition = {
  name: 'list_files',
  description: 'List files and directories recursively in workspaceRoot (up to 300 entries).',
  async run(input, context) {
    const parsed = inputSchema.parse(input);
    const targetPath = parsed.path ?? '.';
    const resolvedRoot = resolve(context.workspaceRoot);
    const safePath = resolveSafePath(context.workspaceRoot, targetPath);
    const entries = await walk(safePath, 300);
    return {
      path: targetPath,
      entries: entries.map((item) => relative(resolvedRoot, item) || '.')
    };
  }
};
