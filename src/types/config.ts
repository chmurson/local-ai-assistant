export type ToolName = 'read_file' | 'write_file' | 'list_files' | 'http_fetch' | 'extract_text';

export interface AgentConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  enabledTools: ToolName[];
}

export interface PolicyConfig {
  allowAutoApplyPromptChanges: boolean;
  allowAutoApplyToolChanges: boolean;
  allowAutoApplyTemperatureChanges: boolean;
  allowAutoApplyModelRoutingChanges: boolean;
  allowAutoApplyCodeChanges: boolean;
  maxToolCallsPerRun: number;
  toolAllowlist: ToolName[];
}

export interface ModelRoutingConfig {
  defaultMainModel: string;
  defaultMetaModel: string;
  taskOverrides?: Record<string, string>;
}

/**
 * Signal transport configuration
 */
export interface SignalTransportConfig {
  /** Whether signal transport is enabled */
  enabled: boolean;
  /** Base URL for the signal-cli-rest-api (e.g., http://127.0.0.1:8080) */
  restBaseUrl: string;
  /** Local Signal number (the agent's own number) */
  localNumber: string;
  /** Allowed remote user number - exactly one allowed sender */
  allowedUserNumber: string;
  /** Port for webhook listener */
  webhookPort: number;
  /** Path for webhook endpoint */
  webhookPath: string;
}

/**
 * App-level configuration (mode selection)
 */
export interface AppConfig {
  app: {
    /** Operating mode: 'cli' or 'signal' */
    mode: 'cli' | 'signal';
  };
  mainAgent: AgentConfig;
  metaAgent: AgentConfig;
  policies: PolicyConfig;
  routing: ModelRoutingConfig;
  signal?: SignalTransportConfig; // Optional for backwards compatibility
}
