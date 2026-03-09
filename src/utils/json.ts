import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf8');
  return JSON.parse(content) as T;
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
