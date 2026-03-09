import { resolve } from 'node:path';
import type { LongTermMemory } from '../types/memory.js';
import { longTermMemorySchema } from '../schemas/memory-schema.js';
import { readJsonFile, writeJsonFile } from '../utils/json.js';

const MEMORY_PATH = resolve(process.cwd(), 'data', 'long-term-memory.json');

export async function loadLongTermMemory(): Promise<LongTermMemory> {
  const raw = await readJsonFile<unknown>(MEMORY_PATH);
  return longTermMemorySchema.parse(raw) as LongTermMemory;
}

export async function saveLongTermMemory(memory: LongTermMemory): Promise<void> {
  const parsed = longTermMemorySchema.parse(memory);
  await writeJsonFile(MEMORY_PATH, parsed);
}
