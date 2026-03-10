import { resolve } from 'node:path';
import type { TelegramTransportConfig } from '../../types/config.js';
import type { TelegramInboundMessage } from '../../types/telegram.js';
import { processUserTurn } from '../../core/process-user-turn.js';
import { getOrCreateSessionId } from '../../core/session-store.js';
import { sendTelegramMessage } from './telegram-client.js';
import { isAllowedTelegramSource } from './telegram-auth.js';
import { logTelegramConversationTurn } from './telegram-stdout.js';

export interface TelegramDispatcher {
  handleMessage(message: TelegramInboundMessage): Promise<void>;
}

export function createTelegramDispatcher(params: {
  config: TelegramTransportConfig;
  workspaceRoot?: string;
}): TelegramDispatcher {
  const workspaceRoot = resolve(params.workspaceRoot ?? process.env.WORKSPACE_ROOT ?? process.cwd());

  return {
    async handleMessage(message: TelegramInboundMessage): Promise<void> {
      if (
        !isAllowedTelegramSource({
          chatId: message.chatId,
          userId: message.userId,
          allowedChatId: params.config.allowedChatId,
          ...(params.config.allowedUserId ? { allowedUserId: params.config.allowedUserId } : {})
        })
      ) {
        console.warn(`[telegram] rejected source chat=${message.chatId} user=${message.userId}`);
        return;
      }

      console.log(`[telegram] accepted source chat=${message.chatId} user=${message.userId}`);

      const sessionKey = `telegram:chat:${message.chatId}:user:${message.userId}`;
      const sessionId = await getOrCreateSessionId(sessionKey);

      const result = await processUserTurn({
        sessionId,
        userMessage: message.messageText,
        workspaceRoot,
        channel: 'telegram',
        remoteUserId: message.userId
      });

      await sendTelegramMessage({
        botToken: params.config.botToken,
        chatId: message.chatId,
        text: result.trace.finalAnswer,
        replyToMessageId: message.messageId
      });

      const metaPrefix = '[meta]';
      try {
        const meta = await result.metaPromise;
        const metaParts = [
          `${metaPrefix} score=${meta.evaluation.score.toFixed(2)}`,
          `confidence=${meta.evaluation.confidence.toFixed(2)}`
        ];
        if (meta.evaluation.issues.length > 0) {
          metaParts.push(`issues=${meta.evaluation.issues.join(' | ')}`);
        }
        await sendTelegramMessage({
          botToken: params.config.botToken,
          chatId: message.chatId,
          text: metaParts.join(' '),
          replyToMessageId: message.messageId
        });

        logTelegramConversationTurn({
          chatId: message.chatId,
          userId: message.userId,
          userMessage: message.messageText,
          assistantMessage: result.trace.finalAnswer,
          traceId: result.trace.traceId,
          metaSummary: {
            score: meta.evaluation.score,
            issues: meta.evaluation.issues
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'meta evaluation failed';
        console.error(`[telegram] meta evaluation error: ${errorMessage}`);
        await sendTelegramMessage({
          botToken: params.config.botToken,
          chatId: message.chatId,
          text: `${metaPrefix} meta evaluation unavailable (${errorMessage})`,
          replyToMessageId: message.messageId
        });
        logTelegramConversationTurn({
          chatId: message.chatId,
          userId: message.userId,
          userMessage: message.messageText,
          assistantMessage: result.trace.finalAnswer,
          traceId: result.trace.traceId,
          metaError: errorMessage
        });
      }
    }
  };
}
