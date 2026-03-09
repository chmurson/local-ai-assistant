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
  mainAgent?: Partial<{
    systemPrompt: string;
    temperature: number;
    enabledTools: ToolName[];
    model: string;
  }>;
  routing?: Partial<{
    defaultMainModel: string;
    defaultMetaModel: string;
  }>;
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
