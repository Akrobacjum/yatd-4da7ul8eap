# You are the dungeon: Prototype 1.05 (test)

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
| `tests/` | testy w Playwright z pracy nad prototypem (ścieżki w nich wskazują stary katalog roboczy; przed użyciem trzeba je poprawić); `replay101.py` i `calib101.py` odtwarzają nagrane runy na nowej wersji gry, `ff102.py` i `ff102_real.py` mierzą autoprzyspieszenie na nagranych falach, `lag104.py` i `lag104w1.py` mierzą klatki w czasie rzeczywistym, `start104.py` liczy kradzieże w fali 1 samouczka przy różnych pułapkach startowych, `t105_classes.py` sprawdza skład drużyn (bez powtórzeń klas) i mechaniki barda i barbarzyńcy, `t105_ai.py` szukanie zgubionego (głos drużyny, wołanie barda) i furię barbarzyńcy |
| `archiwum/` | stare wersje v1-v15.2, każda jako jedna strona (lista w `archiwum/README.md`) |

## Jak zbudować i opublikować

```
python3 build.py
node --check dist/check.js
git add -A && git commit -m "..." && git push
```

Strona odświeża się przy każdym pushu na `main`: robi to wbudowane publikowanie GitHub Pages z gałęzi `main`, a workflow `.github/workflows/pages.yml` jest zapasem (gdyby w Settings → Pages ustawiono źródło "GitHub Actions"). Oba publikują te same pliki. Nowa wersja jest na stronie po ok. minucie; postęp widać w zakładce Actions.

## Gdzie lądują wyniki

Po każdej fali gra wysyła przebieg do skryptu z `apps-script/Code.gs`, a ten zapisuje pliki w folderze **"YATD wyniki testów"** na Dysku Google autora:

- `runs_<run>.json`: podsumowanie runu (nadpisywane po każdej fali; pole `device` grupuje runy z jednego telefonu),
- `waves_<run>_<nr>.json`: jedna fala (bohaterowie, układ lochu, oś czasu),
- `survey_<telefon>_<run>.json`: ankieta po pierwszym ukończonym runie (raz na telefon).

Pole `version` rozdziela dane z różnych wersji gry: 43 = Prototype 1.0, 44 = Prototype 1.01, 45 = Prototype 1.02, 46 = Prototype 1.03, 47 = Prototype 1.04 (od 1.04 fala ma pole `perf` z płynnością gry i `errors` z błędami), 48 = Prototype 1.05 (fala ma `cpm`: skill checki na minutę, `frozen`: jaki procent fali świat stał pod checkami, `memFires`: ciosy z zapamiętanego wyniku, `classes`: klasy drużyny; podsumowanie runu ma `tut`: jak daleko doszedł samouczek, które kroki pominięto i jak się skończył). Pliki z testu instalacji (19.10) do pominięcia: `ping.json`, `test_post_check.json` oraz run `mvey7v7bgnbt` (gracz "TEST Claude").
