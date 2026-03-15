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

## Zewnetrzne MCP Tools

Pierwszy przygotowany setup dla lokalnego, zewnetrznego MCP jest opisany w `docs/web-search-mcp-setup.md`.
Instalacja trafia do nietrackowanego katalogu `.external-tools/`, a bootstrap pozostaje w repo.

## Co robi system

- Main Agent obsluguje wiadomosc usera i moze uzywac narzedzi.
- Dostepne narzedzia: `read_file`, `write_file`, `list_files`, `http_fetch`, `extract_text` (HTML -> plain text), `web_research` (zewnetrzny local MCP-backed web search / page research).
- Zapisuje trace do `data/traces/main`.
- Meta Agent analizuje zebrane trace po okresie bezczynnosci i generuje bezpieczny patch konfiguracji.
- Zapisuje ewaluacje do `data/traces/meta` i propozycje do `data/proposed-config.json`.
- Zapisuje historie uruchomien meta do `data/meta-history.json`.
- Moze wzbogacac dostepne modele o lokalne opisy z `config/model-descriptions.json`, bez ingerowania w live discovery przez `/models`.
- Safe auto-apply stosuje tylko dozwolone zmiany wg polityk.

## Komendy CLI

- `/help`
- `/config`
- `/proposed`
- `/apply`
- `/reject`
- `/memory`
- `/meta-status`
- `/meta-history`
- `/web-research-stats`
- `/reflect`
- `/exit`

Metryki i historia zmian dla `web_research` sa opisane w `docs/web-research-metrics.md`.
Checklist rozdzielajacy `core smoke` od recznego `manual e2e` jest w `docs/testing-checklist.md`.
