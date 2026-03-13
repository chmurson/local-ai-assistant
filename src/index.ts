import { acquireAgentLock } from './core/agent-lock.js';
import { loadCurrentConfig } from './core/config-store.js';
import { configureMetaScheduler } from './core/meta-scheduler.js';
import { runCli } from './app/run-cli.js';
import { runTelegram } from './app/run-telegram.js';

async function main(): Promise<void> {
  const releaseLock = await acquireAgentLock();
  console.log('[agent-lock] acquired data/agent.lock');
  let lockReleased = false;

  const safeReleaseLock = async (): Promise<void> => {
    if (lockReleased) {
      return;
    }
    lockReleased = true;
    await releaseLock();
  };

  const cleanupAndExit = async (code: number): Promise<never> => {
    await safeReleaseLock();
    process.exit(code);
  };

  process.once('SIGINT', () => {
    void cleanupAndExit(130);
  });
  process.once('SIGTERM', () => {
    void cleanupAndExit(143);
  });
  process.once('beforeExit', () => {
    void safeReleaseLock();
  });
  process.once('exit', () => {
    void safeReleaseLock();
  });

  try {
    const config = await loadCurrentConfig();
    configureMetaScheduler(config.metaRuntime);

    if (config.app.mode === 'telegram') {
      await runTelegram();
      return;
    }

    await runCli();
  } catch (error) {
    await safeReleaseLock();
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
