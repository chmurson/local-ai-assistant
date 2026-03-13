import { resolve } from 'node:path';
import { z } from 'zod';
import type { AppConfig } from '../types/config.js';
import { listAvailableModels } from './llm-client.js';
import { readJsonFile } from '../utils/json.js';

export interface ModelRegistryEntry {
  id: string;
  description?: string;
  traits: string[];
  source: 'discovered' | 'config-fallback';
}

export interface ModelRegistry {
  entries: ModelRegistryEntry[];
  discovered: boolean;
}

const MODEL_DESCRIPTION_CATALOG_PATH = resolve(process.cwd(), 'config', 'model-descriptions.json');

const modelDescriptionCatalogSchema = z
  .object({
    models: z.record(
      z
        .object({
          description: z.string().min(1).optional(),
          traits: z.array(z.string()).default([]),
          sources: z.array(z.string().url()).default([])
        })
        .strict()
    )
  })
  .strict();

type ModelDescriptionCatalog = z.infer<typeof modelDescriptionCatalogSchema>;

async function loadModelDescriptionCatalog(): Promise<ModelDescriptionCatalog> {
  try {
    const raw = await readJsonFile<unknown>(MODEL_DESCRIPTION_CATALOG_PATH);
    return modelDescriptionCatalogSchema.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown catalog error';
    console.warn(`[models] description catalog unavailable; continuing without local metadata (${message})`);
    return { models: {} };
  }
}

function buildFallbackModelIds(config: AppConfig): string[] {
  return [
    config.mainAgent.model,
    config.metaAgent.model,
    config.routing.defaultMainModel,
    config.routing.defaultMetaModel,
    ...Object.values(config.routing.taskOverrides ?? {})
  ].filter((value, index, values) => value.trim().length > 0 && values.indexOf(value) === index);
}

function buildRegistryEntries(
  modelIds: string[],
  source: ModelRegistryEntry['source'],
  catalog: ModelDescriptionCatalog
): ModelRegistryEntry[] {
  return modelIds.map((id) => {
    const knownInfo = catalog.models[id];
    const entry: ModelRegistryEntry = {
      id,
      source,
      traits: knownInfo?.traits ?? []
    };
    if (knownInfo?.description) {
      entry.description = knownInfo.description;
    }
    return entry;
  });
}

export function formatModelRegistryForPrompt(registry: ModelRegistry): string {
  return registry.entries
    .map((entry) => {
      const description = entry.description ?? 'No local description available.';
      const traits = entry.traits.length > 0 ? ` Traits: ${entry.traits.join(', ')}.` : '';
      return `- ${entry.id} (${entry.source}): ${description}${traits}`;
    })
    .join('\n');
}

export function buildAvailableModelIdSet(registry: ModelRegistry): Set<string> {
  return new Set(registry.entries.map((entry) => entry.id));
}

export async function loadModelRegistry(config: AppConfig): Promise<ModelRegistry> {
  const catalog = await loadModelDescriptionCatalog();

  try {
    const discoveredIds = await listAvailableModels();
    if (discoveredIds.length > 0) {
      return {
        entries: buildRegistryEntries(discoveredIds, 'discovered', catalog),
        discovered: true
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown model discovery error';
    console.warn(`[models] discovery failed; falling back to configured model ids (${message})`);
  }

  return {
    entries: buildRegistryEntries(buildFallbackModelIds(config), 'config-fallback', catalog),
    discovered: false
  };
}
