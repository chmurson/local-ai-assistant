import { resolve } from 'node:path';
import { readJsonFile, writeJsonFile } from '../utils/json.js';

const TELEGRAM_OFFSET_PATH = resolve(process.cwd(), 'data', 'telegram-offset.json');

interface TelegramOffsetPayload {
  lastProcessedUpdateId: number;
}

export async function getLastProcessedUpdateId(): Promise<number | null> {
  try {
    const parsed = await readJsonFile<unknown>(TELEGRAM_OFFSET_PATH);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const raw = (parsed as Partial<TelegramOffsetPayload>).lastProcessedUpdateId;
    if (typeof raw === 'number' && Number.isInteger(raw)) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setLastProcessedUpdateId(updateId: number): Promise<void> {
  await writeJsonFile(TELEGRAM_OFFSET_PATH, { lastProcessedUpdateId: updateId });
}
