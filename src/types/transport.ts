/**
 * Transport mode type - determines how the agent receives user input.
 */
export type TransportMode = 'cli' | 'telegram';

/**
 * Telegram transport configuration.
 */
export interface TelegramTransportConfig {
  /** Whether Telegram transport is enabled. */
  enabled: boolean;
  /** Telegram bot token from BotFather. */
  botToken: string;
  /** Exactly one allowed chat identifier. */
  allowedChatId: string;
  /** Optional exact user identifier inside the allowed chat. */
  allowedUserId?: string;
  /** Delay between polling iterations in milliseconds. */
  pollingIntervalMs: number;
  /** Telegram long polling timeout in seconds. */
  pollingTimeoutSec: number;
  /** Maximum updates fetched per polling request. */
  maxUpdatesPerPoll: number;
}

/**
 * Input message from any transport.
 */
export interface TransportInput {
  /** Unique message ID. */
  messageId: string;
  /** Sender identifier (user id for Telegram, empty string for CLI). */
  senderId: string;
  /** Message text content. */
  messageText: string;
}

/**
 * Output message to any transport.
 */
export interface TransportOutput {
  /** Message text to send back. */
  responseText: string;
  /** Session ID associated with this turn. */
  sessionId: string;
}
