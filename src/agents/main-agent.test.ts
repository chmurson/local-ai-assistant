import test from 'node:test';
import assert from 'node:assert/strict';
import { executeMainAgent } from './main-agent.js';
import type { AppConfig } from '../types/config.js';
import type { LongTermMemory } from '../types/memory.js';
import type { ToolCallRecord } from '../types/trace.js';

function buildConfig(): AppConfig {
  return {
    app: { mode: 'cli' },
    mainAgent: {
      model: 'main-model',
      temperature: 0.1,
      maxOutputTokens: 400,
      systemPrompt: 'You are a helpful local assistant.',
      enabledTools: ['web_research']
    },
    metaAgent: {
      model: 'meta-model',
      temperature: 0.1,
      maxOutputTokens: 400,
      systemPrompt: 'meta',
      enabledTools: []
    },
    policies: {
      allowAutoApplyPromptChanges: false,
      allowAutoApplyToolChanges: false,
      allowAutoApplyTemperatureChanges: false,
      allowAutoApplyModelRoutingChanges: false,
      allowAutoApplyCodeChanges: false,
      maxToolCallsPerRun: 3,
      toolAllowlist: ['web_research']
    },
    routing: {
      defaultMainModel: 'main-model',
      defaultMetaModel: 'meta-model'
    },
    metaRuntime: {
      enabled: false,
      inactivityDelayMs: 60000,
      minNewTracesBeforeRun: 1,
      notifyOnCompletion: false
    }
  };
}

function buildMemory(): LongTermMemory {
  return {
    userPreferences: {},
    systemLearning: {
      successfulPromptPatterns: [],
      failedPromptPatterns: [],
      notes: []
    }
  };
}

function buildWebResearchResult(results: Array<{ title: string; url: string; description: string }>): ToolCallRecord {
  return {
    toolName: 'web_research',
    input: { query: 'Who is president of USA ?' },
    output: {
      mode: 'summary',
      query: 'Who is president of USA ?',
      results
    },
    startedAt: '2026-03-15T10:00:01.000Z',
    finishedAt: '2026-03-15T10:00:02.000Z',
    success: true
  };
}

function createTimestampSequence(): () => string {
  let counter = 0;
  return () => {
    const seconds = String(counter).padStart(2, '0');
    counter += 1;
    return `2026-03-15T10:00:${seconds}.000Z`;
  };
}

async function runExecuteMainAgentTest(params: {
  llmTexts: string[];
  toolResult: ToolCallRecord;
}): Promise<{
  trace: Awaited<ReturnType<typeof executeMainAgent>>;
  toolInputs: unknown[];
  llmPrompts: string[];
}> {
  const llmTexts = [...params.llmTexts];
  const toolInputs: unknown[] = [];
  const llmPrompts: string[] = [];

  const trace = await executeMainAgent({
    sessionId: 'test-session',
    userMessage: 'Who is president of USA ?',
    config: buildConfig(),
    memory: buildMemory(),
    workspaceRoot: process.cwd(),
    dependencies: {
      createId: () => 'trace_test',
      nowIso: createTimestampSequence(),
      pickMainAgentModel: () => 'main-model',
      generateText: async ({ messages }) => {
        llmPrompts.push(messages[messages.length - 1]?.content ?? '');
        const text = llmTexts.shift();
        if (typeof text !== 'string') {
          throw new Error('No queued LLM response for test');
        }

        return {
          text,
          model: 'main-model'
        };
      },
      runTool: async ({ input }) => {
        toolInputs.push(input);
        return params.toolResult;
      }
    }
  });

  return { trace, toolInputs, llmPrompts };
}

test('executeMainAgent overrides direct current-fact answer with web evidence and deterministic final answer', async () => {
  const { trace, toolInputs } = await runExecuteMainAgentTest({
    llmTexts: [
      JSON.stringify({
        planSummary: 'The president of the United States is Joe Biden.',
        shouldUseTool: false,
        finalAnswer: 'Joe Biden'
      }),
      JSON.stringify({
        planSummary: 'The president of the United States is Joe Biden.',
        shouldUseTool: false,
        finalAnswer: 'Joe Biden'
      })
    ],
    toolResult: buildWebResearchResult([
      {
        title: 'President Donald J. Trump - The White House',
        url: 'https://www.whitehouse.gov/administration/donald-j-trump/',
        description: "Learn about President Trump's achievements and plans for his second term."
      },
      {
        title: 'Donald Trump - Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Donald_Trump',
        description:
          'Donald John Trump is an American politician and businessman who is the 47th president of the United States.'
      }
    ])
  });

  assert.equal(
    trace.finalAnswer,
    'Current president of USA: Donald J. Trump. Source: https://www.whitehouse.gov/administration/donald-j-trump/'
  );
  assert.equal(trace.success, true);
  assert.equal(trace.error, undefined);
  assert.deepEqual(toolInputs, [{ query: 'Who is president of USA ?' }]);
  assert.equal(trace.toolCalls.length, 1);
  assert.match(
    trace.steps.map((step) => step.content).join('\n'),
    /Overrode direct answer because classified intent current_fact\/person_role requires web evidence first\./
  );
  assert.doesNotMatch(trace.finalAnswer, /Joe Biden|No plan available/i);
});

test('executeMainAgent forces web evidence when decision output is invalid JSON for current fact', async () => {
  const { trace, toolInputs } = await runExecuteMainAgentTest({
    llmTexts: [
      'not valid json at all',
      'still not valid json',
      JSON.stringify({
        planSummary: 'The president of the United States is Joe Biden.',
        shouldUseTool: false,
        finalAnswer: 'Joe Biden'
      })
    ],
    toolResult: buildWebResearchResult([
      {
        title: 'President Donald J. Trump - The White House',
        url: 'https://www.whitehouse.gov/administration/donald-j-trump/',
        description: "Learn about President Trump's achievements and plans for his second term."
      }
    ])
  });

  assert.equal(
    trace.finalAnswer,
    'Current president of USA: Donald J. Trump. Source: https://www.whitehouse.gov/administration/donald-j-trump/'
  );
  assert.equal(trace.success, true);
  assert.deepEqual(toolInputs, [{ query: 'Who is president of USA ?' }]);
  assert.equal(trace.toolCalls.length, 1);
  assert.match(
    trace.steps.map((step) => step.content).join('\n'),
    /Recovered from invalid decision JSON by forcing web_research for classified intent current_fact\/person_role\./
  );
  assert.doesNotMatch(trace.finalAnswer, /No plan available/i);
});
