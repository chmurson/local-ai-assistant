import { resolve } from 'node:path';
import { createId } from '../utils/id.js';
import { readJsonFile, writeJsonFile } from '../utils/json.js';

const SESSIONS_PATH = resolve(process.cwd(), 'data', 'sessions.json');

type SessionMap = Record<string, string>;

async function loadSessionMap(): Promise<SessionMap> {
  try {
    const parsed = await readJsonFile<unknown>(SESSIONS_PATH);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as SessionMap;
  } catch {
    return {};
  }
}

export async function getOrCreateSessionId(key: string): Promise<string> {
  const sessions = await loadSessionMap();
  const existing = sessions[key];
  if (existing) {
    return existing;
  }

  const sessionId = createId('session');
  sessions[key] = sessionId;
  await writeJsonFile(SESSIONS_PATH, sessions);
  return sessionId;
}
