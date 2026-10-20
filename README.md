# You are the dungeon: Prototype 1.11.1 (test)

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
| `tests/` | testy w Playwright z pracy nad prototypem (ścieżki w nich wskazują stary katalog roboczy; przed użyciem trzeba je poprawić); `replay101.py` i `calib101.py` odtwarzają nagrane runy na nowej wersji gry, `ff102.py` i `ff102_real.py` mierzą autoprzyspieszenie na nagranych falach, `lag104.py` i `lag104w1.py` mierzą klatki w czasie rzeczywistym, `start104.py` liczy kradzieże w fali 1 samouczka przy różnych pułapkach startowych, `t105_classes.py` sprawdza skład drużyn (bez powtórzeń klas) i mechaniki barda i barbarzyńcy, `t105_ai.py` szukanie zgubionego (głos drużyny, wołanie barda) i furię barbarzyńcy, `t107_music.py` muzykę (start po pierwszym dotknięciu, Loch w budowie, Fala w fali, powrót do Loch przy pauzie, wyłączenie), `t108_tray.py` pasek budowy (rusza się razem z kamerą, płótno nie powstaje od nowa w trakcie ruchu, środek mapy stoi, fala wypuszczona z rozwiniętym paskiem czeka) i przyspieszenia (od 1.09 ×1,5 i ×3 także przy starych zapisanych ustawieniach), `t109_mem.py` pamięć wyniku checku między falami (ulepszenie i wyłączenie przez bohaterów kasują, przeniesienie i ponowne postawienie w tym samym miejscu nie), spowolnienie świata pod checkiem i przypięte cele, `t109_walls.py` wysokie ściany (cięcie jak dawniej, w fali kładą się pokoje między kamerą a drużyną, ruch bloczków, powrót po wyjściu drużyny), `t110_orbs.py` orby chciwości i combo (lecą do równania, liczba rośnie, gdy dolatują), `t110_ai.py` rozmowy po kolei (odpowiedź czeka, przekrzykują tylko okrzyki i panika, korytarz też jest w zasięgu słuchu, cała spokojna fala bez mówienia naraz, daleko w osobnych pokojach mówią naraz, Głusza), łup brany po krokach i jeden bohater na skarb, krzywa chciwości, liczba bohaterów w falach, `t110_rooms.py` nowe typy pokoi (Sanktuarium, Zębatki, Głusza, Lodownia) |
| `archiwum/` | stare wersje v1-v15.2 i Prototype 1.0-1.11, każda jako jedna strona (lista w `archiwum/README.md`) |

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

Pole `version` rozdziela dane z różnych wersji gry: 43 = Prototype 1.0, 44 = Prototype 1.01, 45 = Prototype 1.02, 46 = Prototype 1.03, 47 = Prototype 1.04 (od 1.04 fala ma pole `perf` z płynnością gry i `errors` z błędami), 48 = Prototype 1.05 (fala ma `cpm`: skill checki na minutę, `frozen`: jaki procent fali świat stał pod checkami, `memFires`: ciosy z zapamiętanego wyniku, `classes`: klasy drużyny; podsumowanie runu ma `tut`: jak daleko doszedł samouczek, które kroki pominięto i jak się skończył), 49 = Prototype 1.06 (te same pola co 48; zmiana tylko w wyglądzie: bohaterowie jako figurki, jeden przycisk Budowa), 50 = Prototype 1.07 (kamera izometryczna, pasek budowy jako pauza; fala ma `trayPauses`: ile razy rozwinięty pasek zatrzymał grę, a `stats.pauseTime` mówi, jak długo stała), 51 = Prototype 1.08 (te same pola; pasek budowy rusza się tylko po stuknięciu, więc fala wypuszczona z rozwiniętym paskiem zaczyna się w pauzie i ten czas też jest w `stats.pauseTime`; przytrzymanie palca ×5 zamiast ×3), 52 = Prototype 1.09 (wynik checku zostaje przy pułapce między falami: fala ma `stats.memLost`, ile wyników bohaterowie skasowali; `frozen` to teraz udział fali pod checkiem, gdy świat zwalnia do ×0,25, a nie stoi; spokój ×1,5 i przytrzymanie ×3; ściany 2× wyższe), 53 = Prototype 1.10 (4 bohaterów w falach 4-10 plus boss jako piąty; chciwość = √(2 × surowa − 1), więc `greed` i `greedRep` są niższe niż wcześniej przy tym samym łupie; nowe typy pokoi `haven`, `gears`, `hush`, `ice` w układzie lochu; nowe statystyki fali `slips`, `naps`, `hushUnlearned`, `hushLost`; bohaterowie biorą łup częściej, więc `loot` rośnie), 54 = Prototype 1.11 (serce nie zabiera Esencji, tylko sprawdza próg: `hunger.need` = 60 × 1,25^(fala − 2), `hunger.fedAmt` = ile fala dobiła do progu, `hunger.ate` = kryształ zjedzony; `stats.essHeart` już nie ma), 55 = Prototype 1.11.1 (serce znowu zjada swoją porcję, czyli wartość progu; `hunger.need` = 37 × 1,25^(fala − 2), mniej więcej połowa typowej fali; `stats.essHeart` wraca). Pliki z testu instalacji (19.10) do pominięcia: `ping.json`, `test_post_check.json` oraz run `mvey7v7bgnbt` (gracz "TEST Claude").
