import type { ToolName } from './config.js';

export type MetaRunClassification =
  | 'unknown'
  | 'useful_applied'
  | 'useful_operator_signal'
  | 'healthy_no_change'
  | 'not_useful_repeated'
  | 'not_useful_noop'
  | 'not_useful_invalid'
  | 'not_useful_failed';

export interface MetaOperatorReview {
  classification: Exclude<MetaRunClassification, 'unknown'>;
  note?: string;
  reviewedAt: string;
}

export interface ToolCallRecord {
  toolName: ToolName;
  input: unknown;
  originalInput?: unknown;
  inputNormalized?: boolean;
  inputNormalizationNotes?: string[];
  output: unknown;
  outputCapped?: boolean;
  outputSummary?: string;
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
  triggeredBy: 'per_turn' | 'inactivity' | 'manual';
  status: 'completed' | 'failed';
  classification: MetaRunClassification;
  usedModel: string;
  startedAt: string;
  finishedAt: string;
  score?: number | undefined;
  confidence?: number | undefined;
  issues: string[];
  summary: string;
  proposedChanges: ProposedConfigPatch;
  proposedDiff: MetaHistoryDiffEntry[];
  appliedDiff: MetaHistoryDiffEntry[];
  rejectedDiff: MetaHistoryDiffEntry[];
  applied: string[];
  rejected: string[];
  useful: boolean;
  operatorReview?: MetaOperatorReview;
  error?: string | undefined;
}

export interface MetaHistoryDiffEntry {
  path: string;
  before: unknown | undefined;
  after: unknown | undefined;
  status: 'proposed' | 'applied' | 'rejected';
}
