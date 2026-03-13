import type { MainAgentTrace } from '../types/trace.js';
import { runMainAgent } from './run-main-agent.js';
import { queueTraceForMeta } from './meta-scheduler.js';

export async function processUserTurn(params: {
  sessionId: string;
  userMessage: string;
  workspaceRoot: string;
}): Promise<{ trace: MainAgentTrace; metaQueued: boolean }> {
  const trace = await runMainAgent({
    sessionId: params.sessionId,
    userMessage: params.userMessage,
    workspaceRoot: params.workspaceRoot
  });

  const metaQueued = queueTraceForMeta(trace);
  return { trace, metaQueued };
}
