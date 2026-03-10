import { z } from 'zod';

const toolNames = ['read_file', 'write_file', 'list_files', 'http_fetch', 'extract_text'] as const;

export const toolNameSchema = z.enum(toolNames);

const agentConfigSchema = z
  .object({
    model: z.string().min(1),
    temperature: z.number().min(0).max(2),
    maxOutputTokens: z.number().int().positive(),
    systemPrompt: z.string(),
    enabledTools: z.array(toolNameSchema)
  })
  .strict();

const policyConfigInputSchema = z
  .object({
    allowAutoApplyPromptChanges: z.boolean(),
    allowAutoApplyToolChanges: z.boolean(),
    allowAutoApplyTemperatureChanges: z.boolean(),
    allowAutoApplyModelRoutingChanges: z.boolean().optional(),
    allowAutoAppleModelRoutingChanges: z.boolean().optional(),
    allowAutoApplyCodeChanges: z.boolean(),
    maxToolCallsPerRun: z.number().int().nonnegative(),
    toolAllowlist: z.array(toolNameSchema)
  })
  .strict();

const policyConfigSchema = policyConfigInputSchema.transform((value) => ({
  allowAutoApplyPromptChanges: value.allowAutoApplyPromptChanges,
  allowAutoApplyToolChanges: value.allowAutoApplyToolChanges,
  allowAutoApplyTemperatureChanges: value.allowAutoApplyTemperatureChanges,
  allowAutoApplyModelRoutingChanges:
    value.allowAutoApplyModelRoutingChanges ?? value.allowAutoAppleModelRoutingChanges ?? false,
  allowAutoApplyCodeChanges: value.allowAutoApplyCodeChanges,
  maxToolCallsPerRun: value.maxToolCallsPerRun,
  toolAllowlist: value.toolAllowlist
}));

const modelRoutingConfigSchema = z
  .object({
    defaultMainModel: z.string().min(1),
    defaultMetaModel: z.string().min(1),
    taskOverrides: z.record(z.string()).optional()
  })
  .strict();

const telegramTransportConfigSchema = z
  .object({
    enabled: z.boolean(),
    botToken: z.string().min(1),
    allowedChatId: z.string().min(1),
    allowedUserId: z.string().min(1).optional(),
    pollingIntervalMs: z.number().int().positive(),
    pollingTimeoutSec: z.number().int().positive(),
    maxUpdatesPerPoll: z.number().int().positive()
  })
  .strict();

export const appConfigSchema = z
  .object({
    app: z
      .object({
        mode: z.enum(['cli', 'telegram'])
      })
      .strict()
      .default({ mode: 'cli' }),
    mainAgent: agentConfigSchema,
    metaAgent: agentConfigSchema,
    policies: policyConfigSchema,
    routing: modelRoutingConfigSchema,
    telegram: telegramTransportConfigSchema.optional()
  })
  .strict();

export const proposedConfigPatchSchema = z
  .object({
    mainAgent: z
      .object({
        systemPrompt: z.string().min(1).optional(),
        temperature: z.number().min(0).max(2).optional(),
        enabledTools: z.array(toolNameSchema).optional(),
        model: z.string().min(1).optional()
      })
      .strict()
      .optional(),
    routing: z
      .object({
        defaultMainModel: z.string().min(1).optional(),
        defaultMetaModel: z.string().min(1).optional()
      })
      .strict()
      .optional()
  })
  .strict();
