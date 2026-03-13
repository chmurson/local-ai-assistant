import type { MainAgentTrace } from '../types/trace.js';
import type { MetaRuntimeConfig } from '../types/config.js';
import { runMetaAgent } from './run-meta-agent.js';
import { notifyMetaBatchCompleted } from './meta-notifier.js';

interface MetaSchedulerState {
  config: MetaRuntimeConfig | null;
  pendingTraces: MainAgentTrace[];
  inactivityTimer: ReturnType<typeof setTimeout> | null;
  generation: number;
  running: boolean;
}

const state: MetaSchedulerState = {
  config: null,
  pendingTraces: [],
  inactivityTimer: null,
  generation: 0,
  running: false
};

function clearInactivityTimer(): void {
  if (!state.inactivityTimer) {
    return;
  }
  clearTimeout(state.inactivityTimer);
  state.inactivityTimer = null;
}

function scheduleInactivityTimer(): void {
  if (!state.config?.enabled || state.pendingTraces.length < state.config.minNewTracesBeforeRun) {
    return;
  }

  clearInactivityTimer();
  const scheduledGeneration = state.generation;
  state.inactivityTimer = setTimeout(() => {
    void flushMetaBatch(scheduledGeneration);
  }, state.config.inactivityDelayMs);
}

async function flushMetaBatch(scheduledGeneration: number): Promise<void> {
  state.inactivityTimer = null;

  if (!state.config?.enabled || state.running) {
    return;
  }
  if (scheduledGeneration !== state.generation) {
    return;
  }
  if (state.pendingTraces.length < state.config.minNewTracesBeforeRun) {
    return;
  }

  state.running = true;
  const runGeneration = state.generation;
  const batch = state.pendingTraces.splice(0);

  console.log(`[meta] inactivity window reached; processing ${batch.length} queued trace(s)`);
  const summary = {
    processedTraces: [] as string[],
    completedRuns: 0,
    failedRuns: 0,
    usefulRuns: 0,
    appliedPaths: new Set<string>(),
    rejectedPaths: new Set<string>(),
    interrupted: false
  };

  try {
    for (const [index, trace] of batch.entries()) {
      if (runGeneration !== state.generation) {
        const remaining = batch.slice(index);
        if (remaining.length > 0) {
          state.pendingTraces = [...remaining, ...state.pendingTraces];
        }
        console.log('[meta] new activity arrived; stopping current deferred meta batch');
        summary.interrupted = true;
        break;
      }
      try {
        const result = await runMetaAgent({ trace, trigger: 'inactivity' });
        summary.processedTraces.push(trace.traceId);
        summary.completedRuns += 1;
        if (result.useful) {
          summary.usefulRuns += 1;
        }
        for (const path of result.applied) {
          summary.appliedPaths.add(path);
        }
        for (const path of result.rejected) {
          summary.rejectedPaths.add(path);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown meta error';
        summary.processedTraces.push(trace.traceId);
        summary.failedRuns += 1;
        console.error(`[meta] deferred run failed for ${trace.traceId}: ${message}`);
      }
    }
  } finally {
    state.running = false;
    if (summary.processedTraces.length > 0) {
      try {
        await notifyMetaBatchCompleted({
          processedTraces: summary.processedTraces,
          completedRuns: summary.completedRuns,
          failedRuns: summary.failedRuns,
          usefulRuns: summary.usefulRuns,
          appliedPaths: [...summary.appliedPaths],
          rejectedPaths: [...summary.rejectedPaths],
          interrupted: summary.interrupted
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown notification error';
        console.error(`[meta] completion notification failed: ${message}`);
      }
    }
    if (state.pendingTraces.length >= state.config.minNewTracesBeforeRun) {
      scheduleInactivityTimer();
    }
  }
}

export function configureMetaScheduler(config: MetaRuntimeConfig): void {
  state.config = config;
  if (!config.enabled) {
    clearInactivityTimer();
    state.pendingTraces = [];
    return;
  }
}

export function queueTraceForMeta(trace: MainAgentTrace): boolean {
  if (!state.config?.enabled) {
    return false;
  }

  state.generation += 1;
  clearInactivityTimer();

  if (!state.pendingTraces.some((candidate) => candidate.traceId === trace.traceId)) {
    state.pendingTraces.push(trace);
  }

  if (state.running) {
    console.log('[meta] queued new activity while deferred meta is running');
  } else {
    console.log(
      `[meta] queued trace ${trace.traceId} (${state.pendingTraces.length}/${state.config.minNewTracesBeforeRun} before deferred run)`
    );
  }

  scheduleInactivityTimer();
  return true;
}
