import { resolve } from 'node:path';
import type { AppConfig } from '../types/config.js';
import type { ProposedConfigPatch } from '../types/trace.js';
import { appConfigSchema, proposedConfigPatchSchema } from '../schemas/config-schema.js';
import { readJsonFile, writeJsonFile } from '../utils/json.js';

const DATA_DIR = resolve(process.cwd(), 'data');
const CURRENT_CONFIG_PATH = resolve(DATA_DIR, 'current-config.json');
const PROPOSED_CONFIG_PATH = resolve(DATA_DIR, 'proposed-config.json');
export const TELEGRAM_BOT_TOKEN_PLACEHOLDER = '__SET_TELEGRAM_BOT_TOKEN_IN_ENV__';

function applyConfigEnvOverrides(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }

  const config = structuredClone(raw) as Record<string, unknown>;
  const telegram = config.telegram;
  if (!telegram || typeof telegram !== 'object' || Array.isArray(telegram)) {
    return config;
  }

  const envBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!envBotToken) {
    return config;
  }

  config.telegram = {
    ...telegram,
    botToken: envBotToken
  };
  return config;
}

function stripEnvBackedSecrets(config: AppConfig): AppConfig {
  const envBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!envBotToken || !config.telegram || config.telegram.botToken !== envBotToken) {
    return config;
  }

  return {
    ...config,
    telegram: {
      ...config.telegram,
      botToken: TELEGRAM_BOT_TOKEN_PLACEHOLDER
    }
  };
}

export async function loadCurrentConfig(): Promise<AppConfig> {
  const raw = await readJsonFile<unknown>(CURRENT_CONFIG_PATH);
  return appConfigSchema.parse(applyConfigEnvOverrides(raw)) as AppConfig;
}

export async function saveCurrentConfig(config: AppConfig): Promise<void> {
  const parsed = appConfigSchema.parse(stripEnvBackedSecrets(config));
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
