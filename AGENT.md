# Local Agent System - Technical Reference

## Overview

Local Agent System is a TypeScript agent runtime built around an OpenAI-compatible API such as LM Studio.

The repo currently supports:

- a shared main-agent + meta-agent pipeline
- two transports: `cli` and `telegram`
- local JSON persistence for config, traces, memory, sessions, and Telegram offsets
- step-based planning docs under `plan/`

## Runtime Model

Each accepted user turn follows the same high-level flow:

1. load config and memory
2. run Main Agent
3. persist main trace
4. run Meta Agent
5. persist meta evaluation
6. save proposed config patch
7. apply safe config changes when allowed by policy

The shared orchestration entrypoint is `src/core/process-user-turn.ts`.

## Transports

### CLI

CLI mode is implemented in `src/app/run-cli.ts`.

Supported commands:

- `/help`
- `/config`
- `/proposed`
- `/apply`
- `/reject`
- `/memory`
- `/meta-status`
- `/meta-history`
- `/reflect`
- `/exit`

### Telegram

Telegram mode is implemented through:

- `src/app/run-telegram.ts`
- `src/transport/telegram/telegram-client.ts`
- `src/transport/telegram/telegram-poller.ts`
- `src/transport/telegram/telegram-dispatcher.ts`
- `src/transport/telegram/telegram-auth.ts`
- `src/transport/telegram/telegram-stdout.ts`
- `src/core/telegram-offset-store.ts`

Current Telegram behavior:

- long polling via `getUpdates`
- exact `allowedChatId` gate
- optional exact `allowedUserId` gate
- session reuse per Telegram source
- stdout mirror for observability
- only the assistant reply is sent back to Telegram
- meta evaluation is kept in stdout and traces, not sent to chat
- operator slash commands currently include `/help`, `/meta_status`, `/meta_history`, and `/reflect`

Command parity convention:

- when adding a new operator-facing CLI command, add the Telegram equivalent as well unless there is a clear transport-specific reason not to
- keep Telegram command names Telegram-safe, for example `/meta_status` instead of `/meta-status`

## Agents

### Main Agent

Responsibilities:

- interpret user input
- decide whether tools are needed
- execute allowed tool calls
- build the final answer
- persist an execution trace

Notable behavior:

- max tool calls per run is policy-controlled
- HTML fetched from the web can be postprocessed into plain text
- workspace boundaries are enforced for file access

### Meta Agent

Responsibilities:

- evaluate main-agent traces
- score run quality
- identify issues/strengths
- propose safe config changes

Allowed patch surface:

- `mainAgent.systemPrompt`
- `mainAgent.temperature`
- `mainAgent.enabledTools`
- `mainAgent.model`
- `routing.defaultMainModel`
- `routing.defaultMetaModel`

## Configuration

Primary runtime config lives in `data/current-config.json`.

Top-level config sections:

- `app`
- `mainAgent`
- `metaAgent`
- `policies`
- `routing`
- `telegram`

Important notes:

- `app.mode` selects `cli` or `telegram`
- routing uses `defaultMainModel`, `defaultMetaModel`, and optional `taskOverrides`
- Telegram bot secrets are expected via `TELEGRAM_BOT_TOKEN`
- tracked config keeps a placeholder token instead of a live secret

Config schema is defined in `src/schemas/config-schema.ts`.

## Tools

Built-in tools:

- `read_file`
- `write_file`
- `list_files`
- `http_fetch`
- `extract_text`

Tool registration lives in `src/tools/index.ts`.

## Data Layout

Important runtime files:

- `data/current-config.json`
- `data/proposed-config.json`
- `data/long-term-memory.json`
- `data/sessions.json`
- `data/telegram-offset.json`
- `data/traces/main/*`
- `data/traces/meta/*`

## Environment

Environment variables are documented in `.env.example`.

Current variables:

- `LM_STUDIO_BASE_URL`
- `LM_STUDIO_API_KEY`
- `WORKSPACE_ROOT`
- `TELEGRAM_BOT_TOKEN`

## Development

Node version:

- Node 24 is the supported runtime (`>=24 <25`)
- repo pins this through `package.json`, `.nvmrc`, and `.node-version`

Commands:

```bash
yarn dev
yarn build
yarn start
```

## Planning

Planning is now managed through:

- `plan/README.md` as the status index
- `plan/steps/` as the step source of truth
- `plan/steps/_template.md` for future steps

This replaced the older duplicated step artifacts.

## Repository

GitHub remote:

- `origin`: `https://github.com/chmurson/local-ai-assistant.git`

## Known Direction

The current architecture is transport-oriented and should stay that way:

- shared agent pipeline in core
- thin transport adapters at the edge
- local JSON state as the primary persistence model

If new transports are added, they should reuse the same orchestration flow rather than introduce transport-specific agent logic.
