export interface TelegramInboundMessage {
  updateId: number;
  chatId: string;
  userId: string;
  messageId: number;
  timestamp: string;
  messageText: string;
}

export interface TelegramSendMessageInput {
  chatId: string;
  text: string;
  replyToMessageId?: number;
}

export interface TelegramHealthResponse {
  ok: boolean;
  id?: number;
  username?: string;
}
