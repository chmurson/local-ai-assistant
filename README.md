# Local Agent System (Main Agent + Meta Agent)

TypeScriptowy lokalny system agentowy pod LM Studio (OpenAI-compatible API).

## Status projektu

Aktualny status krokow i plan dalszych prac jest w `plan/README.md`.

## Szybki start

1. Zainstaluj zaleznosci:

```bash
npm install
```

2. Skopiuj env i ustaw parametry:

```bash
cp .env.example .env
```

3. Uruchom CLI:

```bash
npm run dev
```

## Tryb Telegram

1. Utworz bota przez BotFather i ustaw `TELEGRAM_BOT_TOKEN` w `.env`.
2. W `data/current-config.json` ustaw:
   - `app.mode` na `telegram`
   - `telegram.enabled` na `true`
   - `telegram.allowedChatId` (i opcjonalnie `telegram.allowedUserId`)
3. Uruchom `npm run dev`.
4. Agent bedzie odbierac wiadomosci przez long polling i logowac rozmowe do stdout.
5. Szczegoly konfiguracji i smoke test sa w `docs/telegram-setup.md`.

## Co robi system

- Main Agent obsluguje wiadomosc usera i moze uzywac narzedzi.
- Dostepne narzedzia: `read_file`, `write_file`, `list_files`, `http_fetch`, `extract_text` (HTML -> plain text).
- Zapisuje trace do `data/traces/main`.
- Meta Agent analizuje zebrane trace po okresie bezczynnosci i generuje bezpieczny patch konfiguracji.
- Zapisuje ewaluacje do `data/traces/meta` i propozycje do `data/proposed-config.json`.
- Zapisuje historie uruchomien meta do `data/meta-history.json`.
- Safe auto-apply stosuje tylko dozwolone zmiany wg polityk.

## Komendy CLI

- `/help`
- `/config`
- `/proposed`
- `/apply`
- `/reject`
- `/memory`
- `/meta-history`
- `/exit`
