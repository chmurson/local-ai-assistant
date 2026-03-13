import { z } from 'zod';
import { proposedConfigPatchSchema, toolNameSchema } from './config-schema.js';

const toolCallRecordSchema = z.object({
  toolName: toolNameSchema,
  input: z.unknown(),
  originalInput: z.unknown().optional(),
  inputNormalized: z.boolean().optional(),
  inputNormalizationNotes: z.array(z.string()).optional(),
  output: z.unknown(),
  outputCapped: z.boolean().optional(),
  outputSummary: z.string().optional(),
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

export const metaHistoryRecordSchema = z.object({
  metaRunId: z.string().min(1),
  traceIds: z.array(z.string().min(1)).min(1),
  triggeredBy: z.enum(['per_turn', 'inactivity', 'manual']),
  status: z.enum(['completed', 'failed']),
  usedModel: z.string().min(1),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  score: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  issues: z.array(z.string()),
  summary: z.string(),
  proposedChanges: proposedConfigPatchSchema,
  proposedDiff: z
    .array(
      z.object({
        path: z.string().min(1),
        before: z.unknown(),
        after: z.unknown(),
        status: z.enum(['proposed', 'applied', 'rejected'])
      })
    )
    .default([]),
  appliedDiff: z
    .array(
      z.object({
        path: z.string().min(1),
        before: z.unknown(),
        after: z.unknown(),
        status: z.enum(['proposed', 'applied', 'rejected'])
      })
    )
    .default([]),
  rejectedDiff: z
    .array(
      z.object({
        path: z.string().min(1),
        before: z.unknown(),
        after: z.unknown(),
        status: z.enum(['proposed', 'applied', 'rejected'])
      })
    )
    .default([]),
  applied: z.array(z.string()),
  rejected: z.array(z.string()),
  useful: z.boolean(),
  error: z.string().optional()
});

export const metaHistoryFileSchema = z.array(metaHistoryRecordSchema);
