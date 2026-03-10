import type { MetaAgentResult } from '../types/agent.js';
import type { MainAgentTrace } from '../types/trace.js';
import { runMainAgent } from './run-main-agent.js';
import { runMetaAgent } from './run-meta-agent.js';

export async function processUserTurn(params: {
  sessionId: string;
  userMessage: string;
  workspaceRoot: string;
  channel: 'cli' | 'telegram';
  remoteUserId: string;
}): Promise<{ trace: MainAgentTrace; metaPromise: Promise<MetaAgentResult> }> {
  const trace = await runMainAgent({
    sessionId: params.sessionId,
    userMessage: params.userMessage,
    workspaceRoot: params.workspaceRoot
  });

  const metaPromise = runMetaAgent({ trace });
  return { trace, metaPromise };
}
