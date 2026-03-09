import { resolve } from 'node:path';
import type { AppConfig } from '../types/config.js';
import type { ProposedConfigPatch } from '../types/trace.js';
import { appConfigSchema, proposedConfigPatchSchema } from '../schemas/config-schema.js';
import { readJsonFile, writeJsonFile } from '../utils/json.js';

const DATA_DIR = resolve(process.cwd(), 'data');
const CURRENT_CONFIG_PATH = resolve(DATA_DIR, 'current-config.json');
const PROPOSED_CONFIG_PATH = resolve(DATA_DIR, 'proposed-config.json');

export async function loadCurrentConfig(): Promise<AppConfig> {
  const raw = await readJsonFile<unknown>(CURRENT_CONFIG_PATH);
  return appConfigSchema.parse(raw) as AppConfig;
}

export async function saveCurrentConfig(config: AppConfig): Promise<void> {
  const parsed = appConfigSchema.parse(config);
  await writeJsonFile(CURRENT_CONFIG_PATH, parsed);
}

export async function loadProposedConfig(): Promise<ProposedConfigPatch | null> {
  try {
    const raw = await readJsonFile<unknown>(PROPOSED_CONFIG_PATH);
    return proposedConfigPatchSchema.parse(raw) as ProposedConfigPatch;
  } catch {
    return null;
  }
}

export async function saveProposedConfig(patch: ProposedConfigPatch): Promise<void> {
  const parsed = proposedConfigPatchSchema.parse(patch);
  await writeJsonFile(PROPOSED_CONFIG_PATH, parsed);
}
