import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve } from 'node:path';
import { createId } from '../utils/id.js';
import { loadCurrentConfig, loadProposedConfig, saveProposedConfig } from '../core/config-store.js';
import { loadLongTermMemory } from '../core/memory-store.js';
import { processUserTurn } from '../core/process-user-turn.js';

function printHelp(): void {
  console.log('/help     - show commands');
  console.log('/config   - print current config');
  console.log('/proposed - print proposed config patch');
  console.log('/apply    - apply last proposed patch via auto-apply flow (done automatically after each turn)');
  console.log('/reject   - clear proposed config patch');
  console.log('/memory   - print long-term memory');
  console.log('/exit     - quit');
}

export async function runCli(): Promise<void> {
  const rl = createInterface({ input, output });
  const sessionId = createId('session');
  const workspaceRoot = resolve(process.env.WORKSPACE_ROOT ?? process.cwd());

  try {
    const config = await loadCurrentConfig();
    console.log('Local Agent CLI');
    console.log(`Main model: ${config.routing.defaultMainModel}`);
    console.log(`Meta model: ${config.routing.defaultMetaModel}`);
    printHelp();

    while (true) {
      const line = (await rl.question('\nYou> ')).trim();
      if (!line) {
        continue;
      }

      if (line === '/exit') {
        break;
      }

      if (line === '/help') {
        printHelp();
        continue;
      }

      if (line === '/config') {
        const current = await loadCurrentConfig();
        console.log(JSON.stringify(current, null, 2));
        continue;
      }

      if (line === '/proposed') {
        const proposed = await loadProposedConfig();
        if (!proposed || Object.keys(proposed).length === 0) {
          console.log('Brak oczekujacych zmian (pending).');
          console.log('Uwagi meta mogly zostac juz auto-zastosowane.');
        } else {
          console.log('Oczekujace zmiany (niezastosowane):');
          console.log(JSON.stringify(proposed, null, 2));
        }
        continue;
      }

      if (line === '/reject') {
        await saveProposedConfig({});
        console.log('Proposed patch cleared.');
        continue;
      }

      if (line === '/memory') {
        const memory = await loadLongTermMemory();
        console.log(JSON.stringify(memory, null, 2));
        continue;
      }

      if (line === '/apply') {
        console.log('Safe auto-apply runs automatically after each interaction.');
        continue;
      }

      try {
        const result = await processUserTurn({
          sessionId,
          userMessage: line,
          workspaceRoot
        });
        console.log(`\nAgent> ${result.trace.finalAnswer}`);
        const meta = await result.metaPromise;
        console.log('\nMeta>');
        console.log(`score=${meta.evaluation.score.toFixed(2)} confidence=${meta.evaluation.confidence.toFixed(2)}`);
        if (meta.evaluation.issues.length > 0) {
          console.log(`issues: ${meta.evaluation.issues.join(' | ')}`);
        }
        if (meta.applied.length > 0 || meta.rejected.length > 0) {
          console.log(`applied: ${meta.applied.join(', ') || 'none'}`);
          console.log(`rejected: ${meta.rejected.join(', ') || 'none'}`);
        }
        const pending = await loadProposedConfig();
        console.log(`proposed(raw): ${JSON.stringify(meta.evaluation.proposedChanges)}`);
        console.log(`pending: ${JSON.stringify(pending ?? {})}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown runtime error';
        console.error(`Runtime error: ${message}`);
      }
    }
  } finally {
    rl.close();
  }
}
