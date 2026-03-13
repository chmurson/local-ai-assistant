import 'dotenv/config';
import { TELEGRAM_BOT_TOKEN_PLACEHOLDER, loadCurrentConfig } from '../core/config-store.js';
import { getTelegramHealth, setTelegramCommands } from '../transport/telegram/telegram-client.js';
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

  await setTelegramCommands({
    botToken: config.telegram.botToken,
    commands: [
      { command: 'help', description: 'List supported bot commands' },
      { command: 'meta_status', description: 'Show queued meta scheduler status' },
      { command: 'reflect', description: 'Run queued meta reflection now' }
    ]
  });
  console.log('[telegram] bot commands registered');

  const dispatcher = createTelegramDispatcher({ config: config.telegram });
  await startTelegramPolling({
    config: config.telegram,
    dispatcher
  });
}
