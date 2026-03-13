# Plan Index

This directory now has one source of truth:

- `plan/steps/` holds the step-by-step status and scope.
- `plan/steps/_template.md` is the default structure for all future steps.

## Step Status

| Step | Type | Status | Summary |
|---|---|---|---|
| 1 | capability | done | CLI-first local agent with main/meta flow, tools, traces, config, and memory |
| 2 | capability | done | Telegram transport with long polling, auth gate, offsets, and stdout mirror |
| 3 | hardening | done | Telegram secret handling cleanup, user-facing reply cleanup, and docs refresh |
| 4 | process | done | Rework task and plan management so repo progress is explicit and auditable |
| 5 | capability | done | Rework meta execution so it is measurable, inactivity-driven, and historically traceable |
| 6 | capability | planned | Introduce a scalable retrieval/tool architecture with source-aware fetch behavior and MCP-oriented boundaries |

## Conventions For New Steps

Each step file in `plan/steps/` should contain:

1. Step metadata
2. Goal
3. Acceptance checklist
4. Implementation summary or planned work
5. Open issues / follow-ups
6. Relevant files

Use `plan/steps/_template.md` when creating the next step so the structure stays consistent.

## Current Gaps In Planning

- Status was previously implicit rather than explicit.
- Requirements and implementation summaries were mixed together.
- There was no single index showing which steps were done vs planned.
- Open follow-ups were not tracked consistently.
- Older plan files created noise once the new step structure became the primary workflow.

## Next Direction

Step 4 is reserved for improving repo task management itself, including:

- one clear planning index
- explicit step statuses
- consistent step file structure
- clearer distinction between planned work and completed work
- tracked open follow-ups per step

Step 5 is reserved for improving the meta process itself, including:

- measuring whether meta recommendations are useful
- running meta after inactivity instead of after every turn
- cancelling deferred meta work when new user activity arrives
- keeping a historical log of meta-generated changes and outcomes

Step 6 is reserved for improving retrieval and tool architecture, including:

- deciding what should remain native versus move behind MCP
- introducing source-aware retrieval profiles instead of one-off site hacks
- tightening output budgets and summarization for tool-heavy workflows
- improving the terminal/operator experience for web-heavy tasks
