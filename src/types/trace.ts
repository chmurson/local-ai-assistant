import type { ToolName } from './config.js';

export interface ToolCallRecord {
  toolName: ToolName;
  input: unknown;
  output: unknown;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  error?: string;
}

export interface AgentStepRecord {
  kind: 'reasoning' | 'tool_call' | 'tool_result' | 'final';
  content: string;
  timestamp: string;
}

export interface ProposedConfigPatch {
  mainAgent?:
    | {
        systemPrompt?: string | undefined;
        temperature?: number | undefined;
        enabledTools?: ToolName[] | undefined;
        model?: string | undefined;
      }
    | undefined;
  routing?:
    | {
        defaultMainModel?: string | undefined;
        defaultMetaModel?: string | undefined;
      }
    | undefined;
}

export interface MainAgentTrace {
  traceId: string;
  sessionId: string;
  userMessage: string;
  finalAnswer: string;
  usedModel: string;
  temperature: number;
  systemPromptVersion: string;
  planSummary: string;
  toolCalls: ToolCallRecord[];
  steps: AgentStepRecord[];
  startedAt: string;
  finishedAt: string;
  success: boolean;
  error?: string;
}

export interface MetaAgentEvaluation {
  traceId: string;
  usedModel: string;
  score: number;
  confidence: number;
  issues: string[];
  strengths: string[];
  proposedChanges: ProposedConfigPatch;
  summary: string;
  startedAt: string;
  finishedAt: string;
}

export interface MetaHistoryRecord {
  metaRunId: string;
  traceIds: string[];
  triggeredBy: 'per_turn' | 'inactivity';
  status: 'completed' | 'failed';
  usedModel: string;
  startedAt: string;
  finishedAt: string;
  score?: number | undefined;
  confidence?: number | undefined;
  issues: string[];
  summary: string;
  proposedChanges: ProposedConfigPatch;
  applied: string[];
  rejected: string[];
  useful: boolean;
  error?: string | undefined;
}
