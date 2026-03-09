import type { ToolName } from './config.js';

export interface ToolContext {
  workspaceRoot: string;
}

export interface ToolDefinition<Input = unknown, Output = unknown> {
  name: ToolName;
  description: string;
  run: (input: Input, context: ToolContext) => Promise<Output>;
}
