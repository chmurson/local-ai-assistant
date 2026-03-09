import { z } from 'zod';
import { proposedConfigPatchSchema } from './config-schema.js';

export const metaOutputSchema = z
  .object({
    score: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    issues: z.array(z.string()),
    strengths: z.array(z.string()),
    summary: z.string(),
    proposedChanges: proposedConfigPatchSchema
  })
  .strict();
