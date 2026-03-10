import { open, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ensureDir } from '../utils/json.js';

const DATA_DIR = resolve(process.cwd(), 'data');
const LOCK_PATH = resolve(DATA_DIR, 'agent.lock');

export interface LockFilePayload {
  pid: number;
  createdAt: string;
}

export class AgentLockError extends Error {
  constructor(message: string, readonly payload?: LockFilePayload | null) {
    super(message);
    this.name = 'AgentLockError';
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ESRCH') {
      return false;
    }
    return true;
  }
}

async function readLockPayload(): Promise<LockFilePayload | null> {
  try {
    const raw = await readFile(LOCK_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LockFilePayload>;
    if (typeof parsed.pid !== 'number' || typeof parsed.createdAt !== 'string') {
      return null;
    }
    return {
      pid: parsed.pid,
      createdAt: parsed.createdAt
    };
  } catch {
    return null;
  }
}

function formatLockMessage(payload: LockFilePayload | null): string {
  if (!payload) {
    return `Another agent process is already running (lock file: ${LOCK_PATH}).`;
  }

  return `Another agent process is already running (pid=${payload.pid}, since=${payload.createdAt}, lock file: ${LOCK_PATH}).`;
}

async function removeLockIfStale(): Promise<boolean> {
  const payload = await readLockPayload();
  if (!payload || isProcessAlive(payload.pid)) {
    return false;
  }

  await rm(LOCK_PATH, { force: true });
  console.warn(`[agent-lock] removed stale lock from pid=${payload.pid}`);
  return true;
}

export async function acquireAgentLock(): Promise<() => Promise<void>> {
  await ensureDir(DATA_DIR);

  try {
    const handle = await open(LOCK_PATH, 'wx');
    const payload: LockFilePayload = {
      pid: process.pid,
      createdAt: new Date().toISOString()
    };
    await handle.writeFile(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await handle.close();

    let released = false;
    return async () => {
      if (released) {
        return;
      }
      released = true;
      await rm(LOCK_PATH, { force: true });
    };
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'EEXIST') {
      throw error;
    }

    const removedStaleLock = await removeLockIfStale();
    if (removedStaleLock) {
      return acquireAgentLock();
    }

    const payload = await readLockPayload();
    throw new AgentLockError(formatLockMessage(payload), payload);
  }
}
