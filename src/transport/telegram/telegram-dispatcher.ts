import { resolve } from 'node:path';
import type { TelegramTransportConfig } from '../../types/config.js';
import type { TelegramInboundMessage } from '../../types/telegram.js';
import {
  buildCompactMetaHistoryReport,
  buildMetaStatusReport,
  runManualMetaReflection
} from '../../core/meta-operator.js';
import { buildWebResearchStatsReport } from '../../core/web-research-stats.js';
import { formatUserFacingAssistantReply } from '../../core/assistant-response-format.js';
import { processUserTurn } from '../../core/process-user-turn.js';
import { getOrCreateSessionId } from '../../core/session-store.js';
import { sendTelegramMessage } from './telegram-client.js';
import { isAllowedTelegramSource } from './telegram-auth.js';
import { createTelegramProgressMessage } from './telegram-progress.js';
import { logTelegramConversationTurn } from './telegram-stdout.js';

export interface TelegramDispatcher {
  handleMessage(message: TelegramInboundMessage): Promise<void>;
}

async function handleTelegramCommand(params: {
  config: TelegramTransportConfig;
  message: TelegramInboundMessage;
}): Promise<boolean> {
  const rawCommand = params.message.messageText.trim().split(/\s+/, 1)[0]?.toLowerCase();
  const command = rawCommand?.split('@', 1)[0];
  if (!command) {
    return false;
  }

  let responseText: string | null = null;
  if (command === '/help') {
    responseText = ['/help', '/meta_status', '/meta_history', '/web_research_stats', '/reflect'].join('\n');
  } else if (command === '/meta-status' || command === '/meta_status') {
    responseText = await buildMetaStatusReport();
  } else if (command === '/meta-history' || command === '/meta_history') {
    responseText = await buildCompactMetaHistoryReport();
  } else if (command === '/web-research-stats' || command === '/web_research_stats') {
    responseText = await buildWebResearchStatsReport();
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
      const progressMessage = createTelegramProgressMessage({
        botToken: params.config.botToken,
        chatId: message.chatId,
        replyToMessageId: message.messageId
      });

      await progressMessage.start();
      const result = await (async () => {
        try {
          const turnResult = await processUserTurn({
            sessionId,
            userMessage: message.messageText,
            workspaceRoot,
            onProgress: (event) => progressMessage.update(event)
          });

          await sendTelegramMessage({
            botToken: params.config.botToken,
            chatId: message.chatId,
            text: formatUserFacingAssistantReply(turnResult.trace),
            replyToMessageId: message.messageId
          });

          return turnResult;
        } finally {
          await progressMessage.stop();
        }
      })();

      logTelegramConversationTurn({
        chatId: message.chatId,
        userId: message.userId,
        userMessage: message.messageText,
        assistantMessage: formatUserFacingAssistantReply(result.trace),
        traceId: result.trace.traceId
      });

      if (result.metaQueued) {
        console.log(`[telegram] meta queued for deferred run after inactivity (trace=${result.trace.traceId})`);
      }
    }
  };
}
