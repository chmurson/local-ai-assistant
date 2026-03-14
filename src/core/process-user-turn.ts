import type { MainAgentTrace } from '../types/trace.js';
import { runMainAgent } from './run-main-agent.js';
import { queueTraceForMeta } from './meta-scheduler.js';

export async function processUserTurn(params: {
  sessionId: string;
  userMessage: string;
  workspaceRoot: string;
  onProgress?: (event: { step: number; phase: 'model' | 'tool'; detail: string }) => Promise<void> | void;
}): Promise<{ trace: MainAgentTrace; metaQueued: boolean }> {
  const trace = await runMainAgent({
    sessionId: params.sessionId,
    userMessage: params.userMessage,
    workspaceRoot: params.workspaceRoot,
    ...(params.onProgress ? { onProgress: params.onProgress } : {})
  });

  const metaQueued = queueTraceForMeta(trace);
  return { trace, metaQueued };
}
