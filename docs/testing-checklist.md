# Testing Checklist

This repo benefits from two different manual test layers:

- `core smoke`: validate the main agent logic directly
- `manual e2e`: validate the real user path through CLI or Telegram

Both are needed. A clean `core smoke` does not guarantee a clean end-to-end behavior.

## 1) Core smoke

Use this when you want to isolate the main agent itself:

```bash
yarn node --input-type=module <<'NODE'
import 'dotenv/config';
import { runMainAgent } from './dist/core/run-main-agent.js';

const trace = await runMainAgent({
  sessionId: `smoke_${Date.now()}`,
  userMessage: 'Who is president of USA ?',
  workspaceRoot: process.cwd()
});

console.log(JSON.stringify({
  traceId: trace.traceId,
  success: trace.success,
  error: trace.error,
  finalAnswer: trace.finalAnswer,
  planSummary: trace.planSummary,
  steps: trace.steps.map((step) => ({ kind: step.kind, content: step.content })),
  toolCalls: trace.toolCalls.map((call) => ({
    toolName: call.toolName,
    success: call.success,
    input: call.input,
    output: call.output
  }))
}, null, 2));
NODE
```

Check:

- `success` is `true`
- `finalAnswer` is user-facing plain text
- no JSON leak, tool-call markup, or placeholder fallback
- tool choice is sensible
- `toolCalls` contain evidence that matches the final answer
- the trace in `data/traces/main` looks coherent

Use `core smoke` when the suspected problem is in:

- prompting
- decision loop
- tool routing
- tool normalization
- final answer grounding
- trace content

## 2) Manual E2E

Use this when you want to validate the real assistant behavior through the actual transport.

CLI checklist:

1. Run the app normally.
2. Send the same prompt through the CLI.
3. Verify the visible response, progress updates, and final formatting.

Telegram checklist:

1. Run the app in Telegram mode.
2. Send the same prompt from the allowed account.
3. Verify the progress bubble content.
4. Verify the final message text and prefix formatting.
5. Verify stdout and the stored trace agree with what appeared in Telegram.

Check:

- the user-visible answer is correct
- progress/status messages are sensible
- final formatting matches the transport contract
- commands, session state, and chat routing behave correctly
- there are no transport-only regressions such as duplicate replies or broken edits

Use `manual e2e` when the suspected problem is in:

- Telegram dispatcher / poller / progress updater
- CLI command handling
- session history or chat state
- final reply formatting
- transport-specific retries or duplication

## 3) How to read failures

If `core smoke` fails:

- the bug is probably in the main agent or tool pipeline

If `core smoke` passes but `manual e2e` fails:

- the bug is probably in transport, formatting, session handling, or integration glue

If both fail:

- start from `core smoke`, fix the agent path first, then re-check end-to-end

## 4) Recommended workflow

For behavior regressions:

1. run `yarn test`
2. run one focused `core smoke`
3. inspect the newest trace in `data/traces/main`
4. run one manual e2e check through the real transport

That order keeps diagnosis short and avoids confusing transport bugs with agent bugs.
