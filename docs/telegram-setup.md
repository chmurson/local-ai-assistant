# Telegram setup

This guide shows how to run Local Agent in Telegram mode using Telegram Bot API with long polling.

## 1) Create a bot

1. Open Telegram and start a chat with `@BotFather`.
2. Run `/newbot`.
3. Save the token (format similar to `123456:ABC-DEF...`).

## 2) Configure the agent

Edit `data/current-config.json`:

```json
{
  "app": { "mode": "telegram" },
  "telegram": {
    "enabled": true,
    "botToken": "<telegram-bot-token>",
    "allowedChatId": "123456789",
    "allowedUserId": "123456789",
    "pollingIntervalMs": 1000,
    "pollingTimeoutSec": 25,
    "maxUpdatesPerPoll": 20
  }
}
```

## 3) Find your chat ID / user ID

1. Start a chat with your bot from your phone.
2. Run the app once with temporary permissive values (for example, set both IDs to your expected account ID if known).
3. If message gets rejected, stdout prints source identifiers:

```text
[telegram] rejected source chat=... user=...
```

Use these values for `allowedChatId` and `allowedUserId`.

## 4) Start the app

```bash
npm run dev
```

Expected startup logs:

```text
[telegram] bot healthy username=@... id=...
[telegram] polling started (timeout=25s interval=1000ms)
```

## 5) Smoke test

1. Send a message from the allowed account.
2. Verify bot reply in Telegram.
3. Verify stdout contains user message, assistant answer, trace ID, and meta score.
4. Send a message from another account/chat and confirm no reply + rejection log.

## Notes

- Long polling does not require public HTTPS.
- Processed offsets are stored in `data/telegram-offset.json` to avoid duplicate processing after restart.
- Session mapping is stored in `data/sessions.json`.
