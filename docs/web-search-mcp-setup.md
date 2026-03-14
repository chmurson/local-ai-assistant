# web-search-mcp Setup

Ten repo nie ma jeszcze klienta MCP, ale mozemy trzymac lokalny, zewnetrzny serwer MCP obok projektu i odpalac go w sposob odtwarzalny.

## Cel

- instalacja pozostaje lokalna i nietrackowana
- instrukcja i bootstrap pozostaja trackowalne
- zewnetrzne zaleznosci nie zasmiecaja repo

## Lokalizacja

Nietrackowany katalog instalacyjny:

```text
.external-tools/web-search-mcp
```

## Setup

Uruchom:

```bash
./scripts/setup-web-search-mcp.sh
```

Skrypt:

1. klonuje lub aktualizuje `mrkrsl/web-search-mcp`
2. instaluje zaleznosci
3. instaluje przegladarki Playwright
4. buduje projekt

## Uruchomienie

```bash
./scripts/run-web-search-mcp.sh
```

Domyslne ograniczenia runtime w wrapperze sa celowo bardziej konserwatywne niz upstream:

- `MAX_CONTENT_LENGTH=12000`
- `DEFAULT_TIMEOUT=5000`
- `MAX_BROWSERS=2`
- `BROWSER_FALLBACK_THRESHOLD=2`

Mozna je nadpisac lokalnie:

```bash
MAX_CONTENT_LENGTH=8000 DEFAULT_TIMEOUT=4000 ./scripts/run-web-search-mcp.sh
```

## Przykladowa konfiguracja MCP klienta

Przyklad dla klienta MCP uruchamianego po `stdio`:

```json
{
  "mcpServers": {
    "web-search": {
      "command": "/Users/chmurson/Dev/priv/local-agent/scripts/run-web-search-mcp.sh"
    }
  }
}
```

Jesli klient wymaga jawnego `node` + `dist/index.js`, mozna tez wskazac:

```json
{
  "mcpServers": {
    "web-search": {
      "command": "node",
      "args": [
        "/Users/chmurson/Dev/priv/local-agent/.external-tools/web-search-mcp/dist/index.js"
      ],
      "env": {
        "MAX_CONTENT_LENGTH": "12000",
        "DEFAULT_TIMEOUT": "5000",
        "MAX_BROWSERS": "2",
        "BROWSER_FALLBACK_THRESHOLD": "2"
      }
    }
  }
}
```

## Uwagi

- `web-search-mcp` jest lokalny i nie wymaga API key.
- Aplikacja ma juz pierwszy lokalny tool `web_research`, ktory laczy sie z tym serwerem przez MCP `stdio`.
- Biezacy slice uzywa podejscia spawn-per-call przez `scripts/run-web-search-mcp.sh`, zamiast stalego in-process klienta lub brokera.
- Instalacja pozostaje poza gitem, a aplikacja korzysta z niej przez wrapper uruchomieniowy.
