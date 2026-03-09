import { executeMainAgent } from '../agents/main-agent.js';
import type { MainAgentTrace } from '../types/trace.js';
import { loadCurrentConfig } from './config-store.js';
import { loadLongTermMemory } from './memory-store.js';
import { saveMainTrace } from './trace-store.js';

export async function runMainAgent(params: {
  sessionId: string;
  userMessage: string;
  workspaceRoot: string;
}): Promise<MainAgentTrace> {
  const config = await loadCurrentConfig();
  const memory = await loadLongTermMemory();

  const trace = await executeMainAgent({
    sessionId: params.sessionId,
    userMessage: params.userMessage,
    config,
    memory,
    workspaceRoot: params.workspaceRoot
  });

  await saveMainTrace(trace);
  return trace;
}
