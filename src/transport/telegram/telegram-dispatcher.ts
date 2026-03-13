import { resolve } from 'node:path';
import type { TelegramTransportConfig } from '../../types/config.js';
import type { TelegramInboundMessage } from '../../types/telegram.js';
import { buildMetaStatusReport, runManualMetaReflection } from '../../core/meta-operator.js';
import { processUserTurn } from '../../core/process-user-turn.js';
import { getOrCreateSessionId } from '../../core/session-store.js';
import { sendTelegramMessage } from './telegram-client.js';
import { isAllowedTelegramSource } from './telegram-auth.js';
import { logTelegramConversationTurn } from './telegram-stdout.js';

export interface TelegramDispatcher {
  handleMessage(message: TelegramInboundMessage): Promise<void>;
}

async function handleTelegramCommand(params: {
  config: TelegramTransportConfig;
  message: TelegramInboundMessage;
}): Promise<boolean> {
  const command = params.message.messageText.trim().split(/\s+/, 1)[0]?.toLowerCase();
  if (!command) {
    return false;
  }

  let responseText: string | null = null;
  if (command === '/help') {
    responseText = ['/help', '/meta_status', '/reflect'].join('\n');
  } else if (command === '/meta-status' || command === '/meta_status') {
    responseText = await buildMetaStatusReport();
  } else if (command === '/reflect') {
    responseText = await runManualMetaReflection();
  }

  if (!responseText) {
    return false;
  }

  await sendTelegramMessage({
    botToken: params.config.botToken,
    chatId: params.message.chatId,
    text: responseText,
    replyToMessageId: params.message.messageId
  });
  return true;
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

      if (await handleTelegramCommand({ config: params.config, message })) {
        return;
      }

      const sessionKey = `telegram:chat:${message.chatId}:user:${message.userId}`;
      const sessionId = await getOrCreateSessionId(sessionKey);

      const result = await processUserTurn({
        sessionId,
        userMessage: message.messageText,
        workspaceRoot
      });

      await sendTelegramMessage({
        botToken: params.config.botToken,
        chatId: message.chatId,
        text: result.trace.finalAnswer,
        replyToMessageId: message.messageId
      });

      logTelegramConversationTurn({
        chatId: message.chatId,
        userId: message.userId,
        userMessage: message.messageText,
        assistantMessage: result.trace.finalAnswer,
        traceId: result.trace.traceId
      });

      if (result.metaQueued) {
        console.log(`[telegram] meta queued for deferred run after inactivity (trace=${result.trace.traceId})`);
      }
    }
  };
}
