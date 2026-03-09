import { z } from 'zod';
import { proposedConfigPatchSchema, toolNameSchema } from './config-schema.js';

const toolCallRecordSchema = z.object({
  toolName: toolNameSchema,
  input: z.unknown(),
  output: z.unknown(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  success: z.boolean(),
  error: z.string().optional()
});

const agentStepRecordSchema = z.object({
  kind: z.enum(['reasoning', 'tool_call', 'tool_result', 'final']),
  content: z.string(),
  timestamp: z.string().datetime()
});

export const mainAgentTraceSchema = z.object({
  traceId: z.string().min(1),
  sessionId: z.string().min(1),
  userMessage: z.string(),
  finalAnswer: z.string(),
  usedModel: z.string().min(1),
  temperature: z.number().min(0).max(2),
  systemPromptVersion: z.string().min(1),
  planSummary: z.string(),
  toolCalls: z.array(toolCallRecordSchema),
  steps: z.array(agentStepRecordSchema),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  success: z.boolean(),
  error: z.string().optional()
});

export const metaAgentEvaluationSchema = z.object({
  traceId: z.string().min(1),
  usedModel: z.string().min(1),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  issues: z.array(z.string()),
  strengths: z.array(z.string()),
  proposedChanges: proposedConfigPatchSchema,
  summary: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime()
});
