# Plan Index

This directory now has two layers:

- `plan/steps/` is the current source of truth for step status and scope.
- legacy `step-*-requirements` and `step-*-detailed-plan` files are kept as historical references.
- `plan/steps/_template.md` is the default structure for all future steps.

## Step Status

| Step | Type | Status | Summary |
|---|---|---|---|
| 1 | capability | done | CLI-first local agent with main/meta flow, tools, traces, config, and memory |
| 2 | capability | done | Telegram transport with long polling, auth gate, offsets, and stdout mirror |
| 3 | hardening | done | Telegram secret handling cleanup, user-facing reply cleanup, and docs refresh |
| 4 | process | planned | Rework task and plan management so repo progress is explicit and auditable |

## Conventions For New Steps

Each step file in `plan/steps/` should contain:

1. Step metadata
2. Goal
3. Acceptance checklist
4. Implementation summary or planned work
5. Open issues / follow-ups
6. Relevant files
7. Legacy references if older planning artifacts exist

Use `plan/steps/_template.md` when creating the next step so the structure stays consistent.

## Current Gaps In Planning

- Status was previously implicit rather than explicit.
- Requirements and implementation summaries were mixed together.
- There was no single index showing which steps were done vs planned.
- Open follow-ups were not tracked consistently.

## Next Direction

Step 4 is reserved for improving repo task management itself, including:

- one clear planning index
- explicit step statuses
- consistent step file structure
- clearer distinction between planned work and completed work
- tracked open follow-ups per step
