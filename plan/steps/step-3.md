# Step 3

Status: done  
Type: hardening  
Updated: 2026-03-12

## Goal

Harden the Telegram transport after the initial integration and document the actual runtime behavior more clearly.

## Acceptance

- [x] Remove live Telegram token from tracked config
- [x] Support env-backed Telegram token loading
- [x] Avoid persisting env-backed token back into tracked config
- [x] Keep Telegram replies user-facing
- [x] Keep meta evaluation in stdout/traces instead of Telegram chat
- [x] Refresh README and Telegram setup docs
- [x] Record this step in the planning artifacts

## Implementation Summary

Step 3 cleaned up the rough edges from the initial Telegram integration:

- bot token is now expected through `TELEGRAM_BOT_TOKEN`
- tracked config contains a placeholder instead of a live secret
- Telegram users receive the assistant reply only
- meta-agent execution still happens, but remains an operator-facing signal
- documentation now reflects the real runtime behavior

## Open Issues / Follow-Ups

- Consider whether future Telegram support should remain single-source only.
- Add tests around config secret override behavior.
- Keep plan/status docs in sync with commits as the repo evolves.

## Relevant Files

- `src/core/config-store.ts`
- `src/app/run-telegram.ts`
- `src/transport/telegram/telegram-dispatcher.ts`
- `.env.example`
- `data/current-config.json`
- `README.md`
- `docs/telegram-setup.md`
