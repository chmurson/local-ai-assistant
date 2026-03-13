import { loadCurrentConfig } from './config-store.js';
import { sendTelegramMessage } from '../transport/telegram/telegram-client.js';

export interface MetaBatchSummary {
  processedTraces: string[];
  completedRuns: number;
  failedRuns: number;
  usefulRuns: number;
  appliedPaths: string[];
  rejectedPaths: string[];
  interrupted: boolean;
}

function buildMetaSummaryMessage(summary: MetaBatchSummary): string {
  const lines = [
    '[meta] deferred batch completed',
    `traces=${summary.processedTraces.length} completed=${summary.completedRuns} failed=${summary.failedRuns} useful=${summary.usefulRuns}`,
    `interrupted=${summary.interrupted ? 'yes' : 'no'}`
  ];

  if (summary.appliedPaths.length > 0) {
    lines.push(`applied: ${summary.appliedPaths.join(', ')}`);
  }
  if (summary.rejectedPaths.length > 0) {
    lines.push(`rejected: ${summary.rejectedPaths.join(', ')}`);
  }

  return lines.join('\n');
}

export async function notifyMetaBatchCompleted(summary: MetaBatchSummary): Promise<void> {
  const config = await loadCurrentConfig();
  if (!config.metaRuntime.notifyOnCompletion) {
    return;
  }
  if (config.app.mode !== 'telegram' || !config.telegram?.enabled) {
    return;
  }

  await sendTelegramMessage({
    botToken: config.telegram.botToken,
    chatId: config.telegram.allowedChatId,
    text: buildMetaSummaryMessage(summary)
  });
}
