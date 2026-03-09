import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { MainAgentTrace, MetaAgentEvaluation } from '../types/trace.js';
import { mainAgentTraceSchema, metaAgentEvaluationSchema } from '../schemas/trace-schema.js';
import { ensureDir, readJsonFile, writeJsonFile } from '../utils/json.js';

const BASE_TRACE_DIR = resolve(process.cwd(), 'data', 'traces');
const MAIN_TRACE_DIR = resolve(BASE_TRACE_DIR, 'main');
const META_TRACE_DIR = resolve(BASE_TRACE_DIR, 'meta');

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
