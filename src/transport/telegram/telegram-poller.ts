import type { TelegramTransportConfig } from '../../types/config.js';
import { getLastProcessedUpdateId, setLastProcessedUpdateId } from '../../core/telegram-offset-store.js';
import { getTelegramUpdates } from './telegram-client.js';
import type { TelegramDispatcher } from './telegram-dispatcher.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function startTelegramPolling(params: {
  config: TelegramTransportConfig;
  dispatcher: TelegramDispatcher;
}): Promise<never> {
  let lastProcessedUpdateId = await getLastProcessedUpdateId();
  console.log(
    `[telegram] polling started (timeout=${params.config.pollingTimeoutSec}s interval=${params.config.pollingIntervalMs}ms)`
  );

  while (true) {
    try {
      const offset = typeof lastProcessedUpdateId === 'number' ? lastProcessedUpdateId + 1 : undefined;
      const messages = await getTelegramUpdates({
        botToken: params.config.botToken,
        ...(typeof offset === 'number' ? { offset } : {}),
        timeoutSec: params.config.pollingTimeoutSec,
        limit: params.config.maxUpdatesPerPoll
      });

      if (messages.length === 0) {
        await sleep(params.config.pollingIntervalMs);
        continue;
      }

      for (const message of messages) {
        await params.dispatcher.handleMessage(message);
        if (lastProcessedUpdateId === null || message.updateId > lastProcessedUpdateId) {
          lastProcessedUpdateId = message.updateId;
          await setLastProcessedUpdateId(lastProcessedUpdateId);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown poller error';
      console.error(`[telegram] poller error: ${message}`);
      await sleep(params.config.pollingIntervalMs);
    }
  }
}
