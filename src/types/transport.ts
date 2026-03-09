/**
 * Transport mode type - determines how the agent receives user input
 */
export type TransportMode = 'cli' | 'signal';

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
 * Input message from any transport
 */
export interface TransportInput {
  /** Unique message ID */
  messageId: string;
  /** Sender identifier (phone number for Signal, empty string for CLI) */
  senderId: string;
  /** Message text content */
  messageText: string;
}

/**
 * Output message to any transport
 */
export interface TransportOutput {
  /** Message text to send back */
  responseText: string;
  /** Session ID associated with this turn */
  sessionId: string;
}

/**
 * Signal inbound message payload structure
 */
export interface SignalInboundMessage {
  /** Unique envelope ID */
  envelopeId: string;
  /** Sender's phone number in E.164 format (e.g., +1234567890) */
  senderNumber: string;
  /** Recipient's phone number (agent's local number) */
  recipientNumber: string;
  /** Timestamp of the message in ISO format */
  timestamp: string;
  /** The actual text content of the message */
  messageText: string;
}

/**
 * Signal send message input
 */
export interface SignalSendMessageInput {
  /** Message text to send */
  message: string;
  /** Recipient phone number in E.164 format */
  recipient: string;
}

/**
 * Signal webhook payload structure
 * Based on signal-cli-rest-api webhook format
 */
export interface SignalWebhookPayload {
  /** Event type (e.g., "message") */
  eventType: string;
  /** Timestamp of the event */
  timestamp: string;
  /** Array of inbound messages */
  messages?: SignalInboundMessage[];
}

/**
 * Signal webhook envelope structure
 */
export interface SignalWebhookEnvelope {
  /** Sender's number */
  source: string;
  /** Timestamp of the message */
  timestamp: number;
  /** Message data object */
  messageData?: {
    /** Base64-encoded content (may need decoding) */
    content: string;
  };
}

/**
 * Signal API response for health check
 */
export interface SignalHealthResponse {
  /** Whether the REST API is healthy */
  ok: boolean;
  /** Version of signal-cli-rest-api */
  version?: string;
  /** Mode of operation (json-rpc or native) */
  mode?: string;
}
