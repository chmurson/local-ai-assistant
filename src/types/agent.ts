import type { MainAgentTrace, MetaAgentEvaluation } from './trace.js';

export interface MainAgentResult {
  trace: MainAgentTrace;
}

export interface MetaAgentResult {
  evaluation: MetaAgentEvaluation;
  applied: string[];
  rejected: string[];
  useful: boolean;
}
