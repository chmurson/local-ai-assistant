import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { ensureDir } from '../utils/json.js';
import type { ToolDefinition } from '../types/tool.js';

const inputSchema = z.object({
  path: z.string().min(1),
  content: z.string()
});

function resolveSafePath(workspaceRoot: string, targetPath: string): string {
  const resolvedRoot = resolve(workspaceRoot);
  const resolvedTarget = resolve(resolvedRoot, targetPath);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error('Path escapes workspaceRoot');
  }
  return resolvedTarget;
}

export const writeFileTool: ToolDefinition = {
  name: 'write_file',
  description: 'Overwrite UTF-8 text content to a file path inside workspaceRoot.',
  async run(input, context) {
    const parsed = inputSchema.parse(input);
    const safePath = resolveSafePath(context.workspaceRoot, parsed.path);
    await ensureDir(dirname(safePath));
    await writeFile(safePath, parsed.content, 'utf8');
    return { path: parsed.path, bytesWritten: Buffer.byteLength(parsed.content, 'utf8') };
  }
};
