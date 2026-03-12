import 'dotenv/config';
import { TELEGRAM_BOT_TOKEN_PLACEHOLDER, loadCurrentConfig } from '../core/config-store.js';
import { getTelegramHealth } from '../transport/telegram/telegram-client.js';
import { createTelegramDispatcher } from '../transport/telegram/telegram-dispatcher.js';
import { startTelegramPolling } from '../transport/telegram/telegram-poller.js';

export async function runTelegram(): Promise<void> {
  const config = await loadCurrentConfig();
  if (!config.telegram || !config.telegram.enabled) {
    throw new Error('Telegram mode requires telegram.enabled=true in data/current-config.json');
  }
  if (!config.telegram.botToken || config.telegram.botToken === TELEGRAM_BOT_TOKEN_PLACEHOLDER) {
    throw new Error('Telegram mode requires TELEGRAM_BOT_TOKEN to be set or telegram.botToken to contain a real token');
  }

  const health = await getTelegramHealth(config.telegram.botToken);
  console.log(`[telegram] bot healthy username=@${health.username ?? 'unknown'} id=${health.id ?? 'unknown'}`);

  const dispatcher = createTelegramDispatcher({ config: config.telegram });
  await startTelegramPolling({
    config: config.telegram,
    dispatcher
  });
}
