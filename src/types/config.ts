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

export interface MetaRuntimeConfig {
  enabled: boolean;
  inactivityDelayMs: number;
  minNewTracesBeforeRun: number;
  notifyOnCompletion: boolean;
}

/**
 * Telegram transport configuration
 */
export interface TelegramTransportConfig {
  /** Whether Telegram transport is enabled */
  enabled: boolean;
  /** Telegram bot token from BotFather */
  botToken: string;
  /** Exactly one allowed chat identifier */
  allowedChatId: string;
  /** Optional exact user identifier inside the allowed chat */
  allowedUserId?: string;
  /** Delay between polling iterations in milliseconds */
  pollingIntervalMs: number;
  /** Telegram long polling timeout in seconds */
  pollingTimeoutSec: number;
  /** Maximum updates fetched per polling request */
  maxUpdatesPerPoll: number;
}

/**
 * App-level configuration (mode selection)
 */
export interface AppConfig {
  app: {
    /** Operating mode: 'cli' or 'telegram' */
    mode: 'cli' | 'telegram';
  };
  mainAgent: AgentConfig;
  metaAgent: AgentConfig;
  policies: PolicyConfig;
  routing: ModelRoutingConfig;
  metaRuntime: MetaRuntimeConfig;
  telegram?: TelegramTransportConfig;
}
