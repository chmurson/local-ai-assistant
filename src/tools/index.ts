import type { ToolName } from '../types/config.js';
import type { ToolDefinition } from '../types/tool.js';
import { extractTextTool } from './extract-text.js';
import { httpFetchTool } from './http-fetch.js';
import { listFilesTool } from './list-files.js';
import { readFileTool } from './read-file.js';
import { writeFileTool } from './write-file.js';

export const toolRegistry: Record<ToolName, ToolDefinition> = {
  read_file: readFileTool,
  write_file: writeFileTool,
  list_files: listFilesTool,
  http_fetch: httpFetchTool,
  extract_text: extractTextTool
};
