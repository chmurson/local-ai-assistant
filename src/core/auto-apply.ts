import type { AppConfig } from '../types/config.js';
import type { ProposedConfigPatch } from '../types/trace.js';

export function applySafePatch(params: {
  currentConfig: AppConfig;
  patch: ProposedConfigPatch;
}): {
  updatedConfig: AppConfig;
  applied: string[];
  rejected: string[];
} {
  const updatedConfig: AppConfig = JSON.parse(JSON.stringify(params.currentConfig)) as AppConfig;
  const applied: string[] = [];
  const rejected: string[] = [];
  const { policies } = params.currentConfig;

  if (params.patch.mainAgent?.systemPrompt !== undefined) {
    if (policies.allowAutoApplyPromptChanges && params.patch.mainAgent.systemPrompt.trim().length > 0) {
      updatedConfig.mainAgent.systemPrompt = params.patch.mainAgent.systemPrompt;
      applied.push('mainAgent.systemPrompt');
    } else {
      rejected.push('mainAgent.systemPrompt');
    }
  }

  if (params.patch.mainAgent?.temperature !== undefined) {
    const temperature = params.patch.mainAgent.temperature;
    if (policies.allowAutoApplyTemperatureChanges && temperature >= 0 && temperature <= 2) {
      updatedConfig.mainAgent.temperature = temperature;
      applied.push('mainAgent.temperature');
    } else {
      rejected.push('mainAgent.temperature');
    }
  }

  if (params.patch.mainAgent?.enabledTools !== undefined) {
    const tools = params.patch.mainAgent.enabledTools;
    const allAllowed = tools.every((tool) => policies.toolAllowlist.includes(tool));
    if (policies.allowAutoApplyToolChanges && allAllowed) {
      updatedConfig.mainAgent.enabledTools = [...tools];
      applied.push('mainAgent.enabledTools');
    } else {
      rejected.push('mainAgent.enabledTools');
    }
  }

  if (params.patch.mainAgent?.model !== undefined) {
    const model = params.patch.mainAgent.model;
    if (policies.allowAutoApplyModelRoutingChanges && model.trim().length > 0) {
      updatedConfig.mainAgent.model = model;
      updatedConfig.routing.defaultMainModel = model;
      applied.push('mainAgent.model');
    } else {
      rejected.push('mainAgent.model');
    }
  }

  if (params.patch.routing?.defaultMainModel !== undefined) {
    const model = params.patch.routing.defaultMainModel;
    if (policies.allowAutoApplyModelRoutingChanges && model.trim().length > 0) {
      updatedConfig.routing.defaultMainModel = model;
      applied.push('routing.defaultMainModel');
    } else {
      rejected.push('routing.defaultMainModel');
    }
  }

  if (params.patch.routing?.defaultMetaModel !== undefined) {
    const model = params.patch.routing.defaultMetaModel;
    if (policies.allowAutoApplyModelRoutingChanges && model.trim().length > 0) {
      updatedConfig.routing.defaultMetaModel = model;
      updatedConfig.metaAgent.model = model;
      applied.push('routing.defaultMetaModel');
    } else {
      rejected.push('routing.defaultMetaModel');
    }
  }

  return { updatedConfig, applied, rejected };
}
