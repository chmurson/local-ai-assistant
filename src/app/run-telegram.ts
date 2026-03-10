import 'dotenv/config';
import { loadCurrentConfig } from '../core/config-store.js';
import { getTelegramHealth } from '../transport/telegram/telegram-client.js';
import { createTelegramDispatcher } from '../transport/telegram/telegram-dispatcher.js';
import { startTelegramPolling } from '../transport/telegram/telegram-poller.js';

export async function runTelegram(): Promise<void> {
  const config = await loadCurrentConfig();
  if (!config.telegram || !config.telegram.enabled) {
    throw new Error('Telegram mode requires telegram.enabled=true in data/current-config.json');
  }

  const health = await getTelegramHealth(config.telegram.botToken);
  console.log(`[telegram] bot healthy username=@${health.username ?? 'unknown'} id=${health.id ?? 'unknown'}`);

  const dispatcher = createTelegramDispatcher({ config: config.telegram });
  await startTelegramPolling({
    config: config.telegram,
    dispatcher
  });
}
