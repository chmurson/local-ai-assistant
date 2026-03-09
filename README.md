# Local Agent System (Main Agent + Meta Agent)

TypeScriptowy lokalny system agentowy pod LM Studio (OpenAI-compatible API).

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

## Co robi system

- Main Agent obsluguje wiadomosc usera i moze uzywac narzedzi.
- Dostepne narzedzia: `read_file`, `write_file`, `list_files`, `http_fetch`, `extract_text` (HTML -> plain text).
- Zapisuje trace do `data/traces/main`.
- Meta Agent analizuje trace i generuje bezpieczny patch konfiguracji.
- Zapisuje ewaluacje do `data/traces/meta` i propozycje do `data/proposed-config.json`.
- Safe auto-apply stosuje tylko dozwolone zmiany wg polityk.

## Komendy CLI

- `/help`
- `/config`
- `/proposed`
- `/apply`
- `/reject`
- `/memory`
- `/exit`
