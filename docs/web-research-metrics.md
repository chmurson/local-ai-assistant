# Web Research Metrics

Ten dokument zbiera robocze metryki dla `web_research`, tak zeby nie ginely w trace'ach, commitach albo historii rozmowy.

## Po co to istnieje

Step 6 nie dotyczy tylko "czy tool dziala", ale czy realnie poprawia przebieg trace:

- mniej zbednych krokow
- mniej zbednych wywolan `web_research`
- lepszy wybor `query` vs `page`
- mniej fallbackow po nieudanym `page`

## Biezace zrodla danych

1. Szybki stan z ostatnich trace'ow:

```text
/web-research-stats
```

Dostepne w CLI i w Telegramie jako:

```text
/web_research_stats
```

2. Slice-level porownanie zmian:

- replay historycznych trace'ow przez aktualny normalizer/routing
- opcjonalny live benchmark na stalym cohocie promptow

Replay jest bardziej stabilny, bo izoluje logike routingu i dedupe od losowosci modelu.

## Definicje

- `traces using web_research`: ile trace'ow w oknie uzylo `web_research`
- `trace success rate`: ile z tych trace'ow zakonczylo sie sukcesem
- `total web_research calls`: ile bylo wszystkich wywolan `web_research`
- `tool-call success rate`: ile wywolan `web_research` zakonczylo sie sukcesem
- `avg steps per trace`: srednia `processingStepCount` dla trace'ow uzywajacych `web_research`
- `avg web_research calls per trace`: srednia liczba wywolan `web_research` na trace
- `mode split`: podzial na `query` i `page`
- `page fallback rate`: odsetek `page` calli, ktore musialy dopiac fallback query

## Snapshoty

### 2026-03-14 Baseline

Zrodlo:

- ostatnie trace'y z `web_research`
- raport `/web-research-stats`

Wynik:

- traces using web_research: `8`
- trace success rate: `87.5% (7/8)`
- total web_research calls: `20`
- tool-call success rate: `100.0% (20/20)`
- avg steps per trace: `6.4`
- avg web_research calls per trace: `2.5`
- mode split: `query=15, page=5`
- page fallback rate: `20.0% (1/5)`

### 2026-03-15 Slice 1: browse-mode routing + repeated-call dedupe

Zakres zmiany:

- listing/root/news URL-e sa normalizowane z `page` do `query` tam, gdzie user ma intent browse/search/news
- identyczny, juz-udany `web_research` w tej samej trace jest ucinany

Zmiana w kodzie:

- `src/core/tool-input-rules/web-research-browse-mode.ts`
- `src/core/tool-call-deduper.ts`
- `src/agents/main-agent.ts`

#### Historical replay: full current history

To porownanie izoluje sam slice, przepuszczajac historyczne decyzje toolowe przez nowa logike.

Before:

- traces using web_research: `8`
- trace success rate: `87.5% (7/8)`
- total web_research calls: `20`
- avg steps per trace: `6.4`
- avg web_research calls per trace: `2.5`
- mode split: `query=15, page=5`
- page fallback rate: `20.0% (1/5)`

Projected after:

- traces using web_research: `8`
- trace success rate: `87.5% (7/8)`
- total web_research calls: `11`
- avg steps per trace: `6.4`
- avg web_research calls per trace: `1.4`
- mode split: `query=8, page=3`
- page fallback rate: `0.0% (0/3)`

#### Historical replay: fixed 4-prompt cohort

Cohort:

- `Go to hacker news and summarize 10 most popular new articles`
- `Wejdź na Haker - News I podsumuj mi pięć najlepszych artykułów`
- `Pogoda we Wrocławiu?`
- `What’s the weather in Warsaw?`

Before:

- traces using web_research: `4`
- trace success rate: `75.0% (3/4)`
- total web_research calls: `11`
- avg steps per trace: `7.0`
- avg web_research calls per trace: `2.8`
- mode split: `query=8, page=3`
- page fallback rate: `33.3% (1/3)`

Projected after:

- traces using web_research: `4`
- trace success rate: `75.0% (3/4)`
- total web_research calls: `6`
- avg steps per trace: `7.0`
- avg web_research calls per trace: `1.5`
- mode split: `query=5, page=1`
- page fallback rate: `0.0% (0/1)`

#### Note on live benchmark

Przy pierwszej probie live benchmark agent odpowiedzial bez uzycia `web_research`, wiec ten pomiar nie byl porownywalny z baseline'em. Dlatego dla tego slice'a za kanoniczny zapis uznajemy replay historycznych requestow przez nowa logike.

## Jak aktualizowac ten dokument

Przy kazdym kolejnym slice dotyczacym `web_research`:

1. Zanotuj baseline z `/web-research-stats`.
2. Zrob porownanie slice-level:
   - najpierw replay historycznych trace'ow
   - potem live benchmark tylko jesli agent faktycznie uzywa `web_research`
3. Dopisz nowa sekcje `YYYY-MM-DD Slice N`.
4. Nie nadpisuj starszych wynikow; dopisuj kolejne snapshoty.

## Practical rule

Jesli trzeba szybko sprawdzic "czy Step 6 idzie w dobra strone", patrz w tej kolejnosci:

1. `total web_research calls`
2. `avg web_research calls per trace`
3. `mode split`
4. `page fallback rate`
5. dopiero potem `avg steps per trace`

W praktyce pierwsze cztery metryki sa najbardziej czułe na routing i dedupe. `avg steps per trace` bywa bardziej zaszumione przez zachowanie modelu.
