import { deleteTelegramMessage, editTelegramMessage, sendTelegramMessage } from './telegram-client.js';

const STATUS_UPDATE_MIN_INTERVAL_MS = 1000;

export interface TelegramProgressUpdate {
  step: number;
  phase: 'model' | 'tool';
  detail: string;
}

function renderProgressText(update: TelegramProgressUpdate, startedAtMs: number): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsedLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const phaseLabel = update.phase === 'tool' ? 'Czekam na tool' : 'Czekam na model';
  return `Pracuję ${elapsedLabel} · krok ${update.step}\n${phaseLabel}: ${update.detail}`;
}

export function createTelegramProgressMessage(params: {
  botToken: string;
  chatId: string;
  replyToMessageId: number;
}): {
  start: () => Promise<void>;
  update: (update: TelegramProgressUpdate) => Promise<void>;
  stop: () => Promise<void>;
} {
  let messageId: number | undefined;
  let lastSentAt = 0;
  let lastText = '';
  let currentUpdate: TelegramProgressUpdate = {
    step: 1,
    phase: 'model',
    detail: 'startuję'
  };
  let startedAtMs = Date.now();
  let ticker: ReturnType<typeof setInterval> | undefined;

  const clearTicker = (): void => {
    if (ticker) {
      clearInterval(ticker);
      ticker = undefined;
    }
  };

  const flushCurrentText = async (): Promise<void> => {
    if (!messageId) {
      return;
    }

    const text = renderProgressText(currentUpdate, startedAtMs);
    const now = Date.now();
    if (text === lastText || now - lastSentAt < STATUS_UPDATE_MIN_INTERVAL_MS) {
      return;
    }

    await editTelegramMessage({
      botToken: params.botToken,
      chatId: params.chatId,
      messageId,
      text
    }).catch(() => undefined);
    lastText = text;
    lastSentAt = now;
  };

  return {
    async start(): Promise<void> {
      if (messageId) {
        return;
      }

      startedAtMs = Date.now();
      currentUpdate = {
        step: 1,
        phase: 'model',
        detail: 'startuję'
      };
      const text = renderProgressText(currentUpdate, startedAtMs);
      messageId = await sendTelegramMessage({
        botToken: params.botToken,
        chatId: params.chatId,
        text,
        replyToMessageId: params.replyToMessageId
      });
      lastText = text;
      lastSentAt = Date.now();
      ticker = setInterval(() => {
        void flushCurrentText();
      }, STATUS_UPDATE_MIN_INTERVAL_MS);
    },

    async update(update: TelegramProgressUpdate): Promise<void> {
      if (!messageId) {
        await this.start();
      }
      currentUpdate = update;
      await flushCurrentText();
    },

    async stop(): Promise<void> {
      clearTicker();
      if (!messageId) {
        return;
      }

      await deleteTelegramMessage({
        botToken: params.botToken,
        chatId: params.chatId,
        messageId
      }).catch(() => undefined);
      messageId = undefined;
    }
  };
}
