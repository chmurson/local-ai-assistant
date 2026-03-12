import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { MainAgentTrace, MetaAgentEvaluation, MetaHistoryRecord } from '../types/trace.js';
import {
  mainAgentTraceSchema,
  metaAgentEvaluationSchema,
  metaHistoryFileSchema,
  metaHistoryRecordSchema
} from '../schemas/trace-schema.js';
import { ensureDir, readJsonFile, writeJsonFile } from '../utils/json.js';

const BASE_TRACE_DIR = resolve(process.cwd(), 'data', 'traces');
const MAIN_TRACE_DIR = resolve(BASE_TRACE_DIR, 'main');
const META_TRACE_DIR = resolve(BASE_TRACE_DIR, 'meta');
const META_HISTORY_PATH = resolve(process.cwd(), 'data', 'meta-history.json');

export async function saveMainTrace(trace: MainAgentTrace): Promise<void> {
  const parsed = mainAgentTraceSchema.parse(trace);
  await ensureDir(MAIN_TRACE_DIR);
  await writeJsonFile(resolve(MAIN_TRACE_DIR, `${parsed.traceId}.json`), parsed);
}

export async function saveMetaEvaluation(evaluation: MetaAgentEvaluation): Promise<void> {
  const parsed = metaAgentEvaluationSchema.parse(evaluation);
  await ensureDir(META_TRACE_DIR);
  await writeJsonFile(resolve(META_TRACE_DIR, `${parsed.traceId}.json`), parsed);
}

export async function loadMetaHistory(): Promise<MetaHistoryRecord[]> {
  try {
    const raw = await readJsonFile<unknown>(META_HISTORY_PATH);
    return metaHistoryFileSchema.parse(raw) as MetaHistoryRecord[];
  } catch {
    return [];
  }
}

export async function saveMetaHistoryRecord(record: MetaHistoryRecord): Promise<void> {
  const parsed = metaHistoryRecordSchema.parse(record);
  const history = await loadMetaHistory();
  history.push(parsed);
  await writeJsonFile(META_HISTORY_PATH, history);
}

export async function loadRecentMainTraces(limit: number): Promise<MainAgentTrace[]> {
  await ensureDir(MAIN_TRACE_DIR);
  const files = await readdir(MAIN_TRACE_DIR);
  const jsonFiles = files.filter((file) => file.endsWith('.json')).sort().reverse().slice(0, limit);

  const traces = await Promise.all(
    jsonFiles.map(async (file) => {
      const raw = await readJsonFile<unknown>(resolve(MAIN_TRACE_DIR, file));
      return mainAgentTraceSchema.parse(raw) as MainAgentTrace;
    })
  );

  return traces;
}
