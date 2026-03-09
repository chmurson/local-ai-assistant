import { z } from 'zod';

export const longTermMemorySchema = z.object({
  userPreferences: z.object({
    preferredLanguage: z.string().optional(),
    preferredAnswerStyle: z.string().optional()
  }),
  systemLearning: z.object({
    successfulPromptPatterns: z.array(z.string()),
    failedPromptPatterns: z.array(z.string()),
    notes: z.array(z.string())
  })
});
