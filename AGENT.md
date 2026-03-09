# Local Agent System - Technical Documentation

## Overview

The Local Agent System is a TypeScript-based autonomous coding assistant that operates through an OpenAI-compatible API (compatible with LM Studio). It features two specialized agents - a Main Agent for executing tasks and a Meta Agent for self-improvement through trace analysis.

## Architecture

### Core Components

```
local-agent/
├── src/
│   ├── agents/          # Agent implementations
│   │   ├── main-agent.ts    # Main execution agent
│   │   ├── meta-agent.ts    # Self-improvement agent
│   │   └── prompts/         # System prompt templates
│   ├── app/             # Application entry points
│   │   └── run-cli.ts       # CLI interface
│   ├── core/            # Core infrastructure
│   │   ├── llm-client.ts    # LLM API integration
│   │   ├── model-router.ts  # Model selection logic
│   │   └── tool-runner.ts   # Tool execution engine
│   ├── tools/           # Available tool definitions
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── list-files.ts
│   │   ├── http-fetch.ts
│   │   └── extract-text.ts
│   ├── types/           # TypeScript type definitions
│   │   ├── config.ts
│   │   ├── trace.ts
│   │   └── memory.ts
│   ├── schemas/         # Zod validation schemas
│   └── utils/           # Utility functions
├── data/                # Runtime data and traces
├── plan/                # Planning artifacts
└── dist/                # Compiled output
```

## Agents

### Main Agent

The Main Agent is responsible for processing user requests and executing tools to fulfill them.

**Key Responsibilities:**
- Parse user input and determine required actions
- Select appropriate tools from the registry
- Execute tool calls with retry logic
- Auto-postprocess HTML content (extract plain text)
- Generate final responses after tool execution

**Tool Iteration Strategy:**
- Maximum 3 tool calls per run (configurable via `policies.maxToolCallsPerRun`)
- Iterative decision-making with JSON schema validation
- Automatic repair attempts for invalid JSON output

**Tools Available:**
| Tool Name | Description |
|-----------|-------------|
| `read_file` | Read file content from workspace |
| `write_file` | Write content to workspace files |
| `list_files` | List directory contents |
| `http_fetch` | Fetch web pages via HTTP |
| `extract_text` | Extract plain text from HTML |

**Configuration:**
```typescript
mainAgent: {
  systemPrompt: string;        // Base prompt for agent behavior
  temperature: number;         // LLM temperature (0-2)
  maxOutputTokens: number;     // Maximum output tokens
  enabledTools: ToolName[];    // Enabled tool list
}
```

### Meta Agent

The Meta Agent analyzes execution traces to evaluate performance and propose configuration improvements.

**Key Responsibilities:**
- Evaluate main agent trace quality (0.0 - 1.0 score)
- Identify issues and strengths in execution
- Propose safe configuration changes
- Generate confidence scores for evaluations

**Allowed Configuration Changes:**
- `mainAgent.systemPrompt`
- `mainAgent.temperature`
- `mainAgent.enabledTools`
- `mainAgent.model`
- `routing.defaultMainModel`
- `routing.defaultMetaModel`

**Evaluation Criteria:**
- Execution success/failure
- Tool call efficiency
- Response quality
- Safety compliance

## Configuration System

### Config Structure (`AppConfig`)

```typescript
{
  mainAgent: {
    systemPrompt: string;
    temperature: number;
    maxOutputTokens: number;
    enabledTools: ToolName[];
  };
  metaAgent: {
    temperature: number;
    maxOutputTokens: number;
  };
  routing: {
    defaultMainModel: string;
    defaultMetaModel: string;
    modelRules?: Array<{
      pattern: RegExp;
      mainModel?: string;
      metaModel?: string;
    }>;
  };
  policies: {
    maxToolCallsPerRun: number;
    toolAllowlist: ToolName[];
  };
}
```

### Model Routing

Model selection is handled by `model-router.ts`:
- Default models configured via `routing.defaultMainModel` and `routing.defaultMetaModel`
- Pattern-based routing for specific tasks
- Fallback to defaults when patterns don't match

## Tool System

### Tool Definition Interface

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (input: unknown) => Promise<ToolResult>;
}
```

### Tool Result Format

```typescript
interface ToolResult {
  toolName: string;
  success: boolean;
  output?: unknown;
  error?: string;
}
```

### Available Tools

#### read_file
Reads content from a file in the workspace.

**Input:**
```json
{
  "path": "/path/to/file"
}
```

#### write_file
Writes content to a file in the workspace.

**Input:**
```json
{
  "path": "/path/to/file",
  "content": "file content"
}
```

#### list_files
Lists contents of a directory.

**Input:**
```json
{
  "path": "/path/to/directory"
}
```

#### http_fetch
Fetches a URL via HTTP.

**Input:**
```json
{
  "url": "https://example.com"
}
```

#### extract_text
Extracts plain text from HTML content.

**Input:**
```json
{
  "html": "<html>...</html>",
  "aggressive": false,
  "maxChars": 20000
}
```

## Trace System

### Main Agent Trace

```typescript
interface MainAgentTrace {
  traceId: string;
  sessionId: string;
  userMessage: string;
  finalAnswer: string;
  usedModel: string;
  temperature: number;
  systemPromptVersion: string;
  planSummary: string;
  toolCalls: ToolCallRecord[];
  steps: AgentStepRecord[];
  startedAt: string;
  finishedAt: string;
  success: boolean;
  error?: string;
}
```

### Meta Agent Evaluation

```typescript
interface MetaAgentEvaluation {
  traceId: string;
  usedModel: string;
  score: number;           // 0.0 - 1.0
  confidence: number;      // 0.0 - 1.0
  issues: string[];
  strengths: string[];
  proposedChanges: ProposedConfigPatch;
  summary: string;
  startedAt: string;
  finishedAt: string;
}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/config` | Display current configuration |
| `/proposed` | Show proposed config changes from meta evaluation |
| `/apply` | Apply safe proposed configuration changes |
| `/reject` | Reject proposed config changes |
| `/memory` | Display long-term memory context |
| `/exit` | Exit the CLI |

## Data Storage

```
data/
├── traces/          # Execution traces
│   ├── main/        # Main agent traces
│   └── meta/        # Meta agent evaluations
└── proposed-config.json  # Proposed configuration changes
```

## Development

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Run (Development)

```bash
npm run dev
```

### Run (Production)

```bash
npm start
```

## Environment Variables

Create a `.env` file with:

```
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=http://localhost:1234/v1  # LM Studio endpoint
```

## Safety & Validation

- All tool calls are validated against `toolAllowlist`
- Maximum tool call iterations per run (default: 3)
- JSON schema validation with automatic repair attempts
- Config changes are applied only when safe (no schema violations)
- All file operations are constrained to workspace root

## Extensibility

### Adding New Tools

1. Create a new file in `src/tools/`
2. Implement the `ToolDefinition` interface
3. Register it in `src/tools/index.ts`
4. Update `ToolName` type in `src/types/config.ts`

### Custom Model Routing

Add rules to the routing configuration:

```typescript
routing: {
  modelRules: [
    {
      pattern: /.* TypeScript.*/i,
      mainModel: 'typescript-specialist-1'
    },
    {
      pattern: /.* Python.*/i,
      mainModel: 'python-specialist-1'
    }
  ];
}
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Invalid JSON output | System automatically attempts repair with lower temperature |
| Tool call limit reached | Increase `policies.maxToolCallsPerRun` |
| Model selection fails | Check `model-router.ts` and ensure models are available in API |

### Debugging

1. Check trace files in `data/traces/main/`
2. Review meta evaluation in `data/traces/meta/`
3. Monitor proposed config changes in `proposed-config.json`

## License

Private - Local Agent System v1.0.0
```
