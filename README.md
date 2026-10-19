# You are the dungeon: Prototype 1.0 (test)

Prototyp gry mobilnej (roguelite: jesteś lochem). Ta strona służy do testów ze znajomymi. Link nie jest reklamowany, a strona prosi wyszukiwarki o pominięcie.

## Co tu jest

| Ścieżka | Co to |
|---|---|
| `index.html` | gra w wersji web (GitHub Pages): pełny ekran, instalacja na telefonie, zapis wyników na Dysk Google |
| `src/` | źródła gry w częściach: `p0` style, `p0b` HTML, `p1`-`p8` skrypt (konfiguracja, mapa, przebieg, pułapki, AI, pętla, rysowanie, ikony, interfejs) |
| `build.py` | składa `src/` w `index.html` i `dist/artifact.html` (wersja do artefaktu w Claude) |
| `web_config.json` | adres skryptu Google i znacznik, którym gra podpisuje wysyłane wyniki |
| `apps-script/Code.gs` | skrypt Google Apps Script (aplikacja internetowa), który zapisuje wyniki jako pliki JSON |
| `manifest.webmanifest`, `sw.js`, ikony | instalacja na telefonie i tryb pełnoekranowy |
| `tests/` | testy w Playwright z pracy nad prototypem (ścieżki w nich wskazują stary katalog roboczy; przed użyciem trzeba je poprawić) |

## Jak zbudować i opublikować

```
python3 build.py
node --check dist/check.js
git add -A && git commit -m "..." && git push
```

Publikację robi workflow `.github/workflows/pages.yml` przy każdym pushu na `main` (w ustawieniach repo: Settings → Pages → Source: **GitHub Actions**). Po pushu nowa wersja jest na stronie po ok. minucie; postęp widać w zakładce Actions.

## Gdzie lądują wyniki

Po każdej fali gra wysyła przebieg do skryptu z `apps-script/Code.gs`, a ten zapisuje pliki w folderze **"YATD wyniki testów"** na Dysku Google autora:

- `runs_<run>.json`: podsumowanie runu (nadpisywane po każdej fali; pole `device` grupuje runy z jednego telefonu),
- `waves_<run>_<nr>.json`: jedna fala (bohaterowie, układ lochu, oś czasu),
- `survey_<telefon>_<run>.json`: ankieta po pierwszym ukończonym runie (raz na telefon).

Pole `version` (obecnie 43) rozdziela dane z różnych wersji gry. Pliki z testu instalacji (19.10) do pominięcia: `ping.json`, `test_post_check.json` oraz run `mvey7v7bgnbt` (gracz "TEST Claude").
