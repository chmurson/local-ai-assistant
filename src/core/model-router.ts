import type { AppConfig } from '../types/config.js';

export function pickMainAgentModel(config: AppConfig, taskHint?: string): string {
  if (taskHint && config.routing.taskOverrides) {
    const loweredHint = taskHint.toLowerCase();
    for (const [key, model] of Object.entries(config.routing.taskOverrides)) {
      if (loweredHint.includes(key.toLowerCase())) {
        return model;
      }
    }
  }
  return config.routing.defaultMainModel;
}

export function pickMetaAgentModel(config: AppConfig): string {
  return config.routing.defaultMetaModel;
}
