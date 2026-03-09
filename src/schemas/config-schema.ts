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

const signalTransportConfigSchema = z
  .object({
    enabled: z.boolean(),
    restBaseUrl: z.string().min(1),
    localNumber: z.string().min(1),
    allowedUserNumber: z.string().min(1),
    webhookPort: z.number().int().positive(),
    webhookPath: z.string().min(1)
  })
  .strict();

export const appConfigSchema = z
  .object({
    app: z
      .object({
        mode: z.enum(['cli', 'signal'])
      })
      .strict()
      .default({ mode: 'cli' }),
    mainAgent: agentConfigSchema,
    metaAgent: agentConfigSchema,
    policies: policyConfigSchema,
    routing: modelRoutingConfigSchema,
    signal: signalTransportConfigSchema.optional()
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
