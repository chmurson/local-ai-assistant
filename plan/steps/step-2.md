# Step 2

Status: done  
Type: capability  
Updated: 2026-03-12

## Goal

Add Telegram as a transport adapter while preserving the same core agent pipeline used by the CLI.

## Acceptance

- [x] `app.mode` transport switch
- [x] Telegram long polling via Bot API
- [x] Telegram payload parsing and validation
- [x] Single allowed chat gate
- [x] Optional allowed user gate
- [x] Per-conversation session mapping
- [x] Shared main/meta pipeline reuse
- [x] Offset persistence across restarts
- [x] Stdout mirror while running in Telegram mode

## Implementation Summary

Step 2 added the first non-CLI transport:

- `run-telegram.ts` boots Telegram mode
- `telegram-client.ts` talks to the Bot API
- `telegram-poller.ts` handles `getUpdates`
- `telegram-dispatcher.ts` routes accepted inbound messages
- `telegram-auth.ts` enforces the chat/user allowlist
- `telegram-offset-store.ts` persists offsets

Telegram remains a transport layer, not a separate agent implementation.

## Open Issues / Follow-Ups

- Keep auth narrow until there is a clear multi-user model.
- Continue improving docs and operator-facing setup guidance.
- Keep runtime behavior aligned with what the planning docs claim.

## Relevant Files

- `src/index.ts`
- `src/app/run-telegram.ts`
- `src/transport/telegram/telegram-client.ts`
- `src/transport/telegram/telegram-poller.ts`
- `src/transport/telegram/telegram-dispatcher.ts`
- `src/transport/telegram/telegram-auth.ts`
- `src/transport/telegram/telegram-stdout.ts`
- `src/core/telegram-offset-store.ts`
