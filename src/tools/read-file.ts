import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { ToolDefinition } from '../types/tool.js';

const inputSchema = z.object({
  path: z.string().min(1)
});

function resolveSafePath(workspaceRoot: string, targetPath: string): string {
  const resolvedRoot = resolve(workspaceRoot);
  const resolvedTarget = resolve(resolvedRoot, targetPath);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error('Path escapes workspaceRoot');
  }
  return resolvedTarget;
}

export const readFileTool: ToolDefinition = {
  name: 'read_file',
  description: 'Read UTF-8 text content from a file path inside workspaceRoot.',
  async run(input, context) {
    const parsed = inputSchema.parse(input);
    const safePath = resolveSafePath(context.workspaceRoot, parsed.path);
    const content = await readFile(safePath, 'utf8');
    return { path: parsed.path, content };
  }
};
