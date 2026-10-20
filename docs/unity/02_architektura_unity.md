# 02. Architektura w Unity

Ta sekcja to propozycja techniczna dla wersji w Unity: wersja silnika, pakiety, podział kodu, model symulacji i to, jak przenieść dane z prototypu. Reguły gry są w sekcjach 03-08; tu jest "jak to zbudować", żeby dało się te reguły wiernie odtworzyć i sprawdzić.

## 2.1 Cele techniczne

1. **Wierność prototypowi.** Gra ma zachowywać się jak Prototype 1.12.1 (autor ocenił wygląd, działanie i dźwięk bardzo wysoko). Każda reguła ma odpowiednik w kodzie prototypu, a specyfikacja wskazuje plik i funkcję.
2. **Symulacja oddzielona od wyglądu.** Cała logika (loch, bohaterowie, pułapki, ekonomia, AI) w czystym C# bez MonoBehaviour, sterowana krokiem czasu. Dzięki temu da się ją testować bez edytora (testy EditMode) i odtwarzać zapisane fale.
3. **Dane zamiast kodu.** Elementy, karty, klasy, poziomy i kwestie bohaterów są w JSON wyeksportowanym z prototypu (`data/`). Strojenie liczb nie wymaga zmian w kodzie.
4. **Telefon.** Pion, jedna ręka, płynne 60 klatek na średnim Androidzie, mało alokacji w pętli.
5. **Kod pisze głównie Claude.** Autor ma małe doświadczenie w programowaniu, więc struktura ma być prosta, przewidywalna i dobrze nazwana; każdy moduł ma testy.

## 2.2 Silnik i pakiety

| Co | Wybór | Uwagi |
|---|---|---|
| Silnik | najnowsze Unity 6 LTS (na 20.10.2026: Unity 6.3 LTS, wsparcie do grudnia 2027) | Sprawdź w Unity Hub, czy nie ma nowszego LTS. Unity Personal jest darmowe do 200 tys. USD przychodu. |
| Render | URP (Universal Render Pipeline), scena 3D, kamera ortograficzna | Zgodnie z GDD: modułowe pokoje 3D, postacie 2D. Zmiana nachylenia kamery (55° budowa, 30° fala) to zwykły obrót kamery. |
| Postacie | sprite'y pixel art jako billboardy (zawsze przodem do kamery), filtr Point, bez kompresji | 4 klatki chodu jak w prototypie (sekcja 08). Kierunek patrzenia przez odbicie w poziomie. |
| UI | uGUI (Canvas) + TextMeshPro | Dojrzałe na telefonach, łatwe animacje. Fonty z prototypu: Alegreya Sans, Grenze Gotisch, Jersey 10 (Google Fonts, licencja OFL, wolno je dołączyć); atlas TMP musi mieć polskie znaki. |
| Wejście | Input System (nowy) | Własny rozpoznawacz gestów: stuknięcie, dwa stuknięcia, przytrzymanie, przeciąganie (sekcja 08). |
| Dane | `com.unity.nuget.newtonsoft-json` | Wczytywanie JSON z `data/` (TextAsset). |
| Lokalizacja | Unity Localization | Na start tylko polski, ale wszystkie teksty od razu przez klucze, żeby EN dało się dodać bez przepisywania. |
| Testy | Unity Test Framework (NUnit), testy EditMode dla symulacji, PlayMode dla interfejsu | Sekcja 09: testy wzorcowe i odtwarzanie fal. |
| Dźwięk | AudioMixer (grupy: muzyka, efekty), klipy WAV | Efekty prototypu są syntezowane w przeglądarce; trzeba je nagrać do plików (sekcja 08). |
| Reklamy (później) | LevelPlay (Unity Ads Mediation) + Google UMP (zgody w EOG/UK) | Etap M6, sekcja 10. |
| Zakupy (później) | Unity IAP | Etap M6. |
| Analityka (później) | na testy: ten sam skrypt Google Apps Script co w prototypie; potem Unity Gaming Services Analytics | Sekcja 07 opisuje format danych testowych. |
| Kontrola wersji | Git + Git LFS (grafika, dźwięk), osobne prywatne repo dla projektu Unity | Repo prototypu jest publiczne (GitHub Pages); projekt Unity nie powinien być. |

Jeśli w czacie są dostępne skille z wtyczki Unity dla Claude Code (`unity:new-unity-project`, `unity:unity-cli`, `unity:unity-package-management`, `unity:ui-ugui`, `unity:optimize-text-mesh-pro`, `unity:localization`, `unity:2d-pixel-perfect`, `unity:manage-sprite-atlas`, `unity:audio-setup-mixers`, `unity:optimize-audio`, `unity:urp-postprocessing`, `unity:levelplay-unity-integration`, `unity:implement-in-app-purchases`, `unity:build-live-game`), korzystaj z nich przy odpowiednich etapach. Instalacja wtyczki i Unity CLI: dokument projektu, rozdział 3.

## 2.3 Warstwy

```
YATD.Core        (czysty C#, bez UnityEngine)  symulacja: run, fala, loch, elementy, bohaterowie, AI, pułapki,
                                                 ekonomia, checki (logika), losowość, zdarzenia
YATD.Data        (czysty C#)                    klasy danych + wczytanie JSON z prototypu, walidacja
YATD.Game        (Unity)                        widoki: loch 3D, aktorzy, efekty, kamera, dymki, orby
YATD.UI          (Unity)                        HUD, pasek budowy, ekrany, sklep, karty, przewodnik
YATD.Services    (Unity)                        zapis, ustawienia, dźwięk, wibracje, dane testowe, (później) reklamy i zakupy
YATD.Tests       (EditMode/PlayMode)            testy wzorcowe, scenariusze, odtwarzanie fal
```

Każda warstwa to osobny Assembly Definition. `YATD.Core` ma zaznaczone "No Engine References", żeby logika nie zależała od Unity (łatwiejsze testy, szybsza kompilacja). Zależności tylko w dół: UI i Game znają Core, Core nie zna nikogo.

### Jak warstwy rozmawiają

- **Polecenia do symulacji** (z UI i gestów): `PlaceItem(type, x, y)`, `MoveItem(from, to)`, `UpgradeItem(x, y)`, `RemoveItem(x, y)`, `ApplyTool(tool, marker)`, `StartWave()`, `ResolveCheck(p)` (pozycja koralika w chwili stuknięcia), `SetFastForward(bool)`, `SetPaused(bool)`, `BuyOffer(i)`, `Reroll(ad)`, `SellCard(i)`, `ToStash(i)`, `FromStash(i)`. Odpowiadają funkcjom prototypu (`tryPlace`, `moveItem`, `upgradeItem`, `removeItem`, `applyTool`, `startWave`, `resolveCheck`, `shopBuy`, `shopReroll`, `sellCard`, `toStash`, `fromStash`), więc łatwo porównać zachowanie. Każde polecenie zwraca wynik albo powód odmowy (to, co prototyp pokazuje jako `note` przy polu albo `nope` na kafelku).
- **Zdarzenia z symulacji** (do widoków i UI): obrażenia, strach, śmierć, ucieczka, wypłata serii combo, orb (Groza, chciwość, combo), kwestia bohatera, start i koniec checku, odpalenie pułapki, zmiana stanu elementu, kradzież i powrót kryształu, koniec fali. W prototypie te miejsca to wywołania `floatHero`, `addFloat`, `particles`, `orbs`, `say`, `tl(...)` (oś czasu do danych testowych); sekcje 05-08 mówią, co wywołuje każde z nich.
- Widoki **nie zmieniają stanu gry**. Wyjątki z prototypu, które są stanem gry, choć wyglądają na widok: zegar spowolnienia przy checku (`CHECK_SLOW`), autoprzyspieszenie w ciszy (`QUIET`, `autoFF`) i stan przewodnika. Trzymaj je w Core albo w osobnym, testowalnym kontrolerze.

## 2.4 Model symulacji

### Czas

W prototypie (`p6_loop.js: frameBody`) każda klatka liczy `rdt = min(0,05 s, czas klatki)`, mnoży przez `timeScale()` (check ×0,25, przytrzymanie ×3, spokój ×1,5) i dzieli wynik na kroki `step(dt/n)` po najwyżej 0,05 s. Testy i odtworzenia prototypu chodzą krokiem 0,05 s.

W Unity:

```
const float TICK = 1f / 60f;          // krok symulacji (prototyp przy 60 fps robi tyle samo)
accumulator += Time.unscaledDeltaTime * timeScale;   // timeScale liczy Core, jak timeScale() w prototypie
while (accumulator >= TICK) { sim.Step(TICK); accumulator -= TICK; }
// bezpiecznik: najwyżej np. 12 kroków na klatkę (prototyp ogranicza rdt do 0,05 s)
```

Logika nie może zależeć od rozmiaru kroku poniżej 0,05 s (prototyp był testowany w obu reżimach). Rzeczy liczone w czasie rzeczywistym, a nie w czasie gry (np. animacje interfejsu, `realNow`, licznik "Uwaga!" w checku), idą na `unscaledDeltaTime`. Sekcja 07 podaje kolejność operacji w `step` i co jest liczone w którym czasie.

### Losowość

Prototyp używa `Math.random()` wszędzie. W Unity jedna klasa `Rng` (np. PCG32 albo xorshift128+) z ziarnem zapisanym w runie, z osobnymi strumieniami: generowanie lochu, skład fal, sklep, AI i walka. Wtedy:
- zapisany run da się odtworzyć,
- zmiana w AI nie zmienia oferty sklepu ani składu fal przy tym samym ziarnie,
- testy są powtarzalne.

Nie ma potrzeby zgodności liczb losowych z prototypem (JS i C# i tak losują w innej kolejności); zgodność sprawdzamy statystycznie (sekcja 09).

### Kolekcje i klucze

| Prototyp | Unity |
|---|---|
| `key(x, y)` = napis `"x,y"` | indeks `y * WW + x` (int) |
| `Map` (zachowuje kolejność wstawiania, a kod często iteruje po `fl.items`) | `List<T>` albo słownik plus lista w kolejności dodania. Kolejność ma znaczenie: kto pierwszy odpala, kto pierwszy mówi. `Dictionary` w C# nie gwarantuje kolejności. |
| `Set` | `HashSet<int>` (tam, gdzie kolejność nie ma znaczenia) |
| obiekty bez typu (`run`, `fl`, `h`, `it`) | klasy C# z jawnymi polami; pola z prototypu zachowują nazwy w camelCase po angielsku, żeby dało się szukać w kodzie prototypu |
| `S` (ustawienia i suwaki balansu) | `Settings` (gracz) + `Balance` (stałe z `DEFAULTS` i stałe rozsiane po plikach); suwaki testowe tylko w buildzie deweloperskim |
| `mods` (efekty kart, `freshMods`) | klasa `Mods` z polami o tych samych nazwach i wartościach domyślnych (lista w sekcji 03, wartości domyślne w `data/golden_1.13.1.json` pod `mods`) |

### Liczby zmiennoprzecinkowe

`float` wystarczy (jedna platforma, bez sieci). Formuły przepisuj dosłownie, łącznie z kolejnością zaokrągleń (`Math.round`, `Math.floor`, `Math.ceil` w JS zaokrąglają inaczej niż `Mathf.Round` w C# przy połówkach: `Math.round(2.5) = 3`, a `Mathf.Round(2.5f) = 2`). Używaj własnej funkcji `JsRound(x) = Mathf.Floor(x + 0.5f)`.

## 2.5 Dane z prototypu

Katalog `data/` (w repo: `docs/unity/data/`) zawiera eksport tabel z `src/p1_config.js` (opis plików: załącznik A):

- `yatd_content_1.13.1.json`: wszystkie tabele w jednym pliku (`tables.ITEMS`, `tables.UPGRADES`, `tables.HEROES`...),
- te same tabele osobno (`ITEMS.json`, `UPGRADES.json`, ...),
- `levelStats_1_30.json`: policzone statystyki poziomów 1-30,
- `golden_1.13.1.json`: wartości policzone przez działający prototyp (skład i poziom fal 1-20, głód serca, krzywa chciwości, ceny, koszty narzędzi, domyślne `mods` i `S`).

Funkcje w danych (np. `apply` kart, `req`) są zapisane jako tekst źródłowy z prefiksem `fn: `. W Unity:
- **karty**: przepisz 98 funkcji `apply` na listę operacji (`ModOp { field, op: Add|Mul|Set, value }`) albo, prościej, na `switch (card.id)` w jednym pliku `CardEffects.cs`. Pełna lista z kodem: załącznik B. Karty `instant` (Żarłoczne serce, Zastrzyk Esencji, Hojny kupiec, Pakt) działają na `run` raz, przy kupnie.
- **wymagania kart** (`req`): napis = id elementu, który musi być odblokowany; funkcja = warunek z kilku odblokowań (np. Lepkie kolce: sieć albo pająk).
- **teksty** (`desc`, `text`, `SAY`, `CHAT_REPLY`, `ONB_STAGES`): do tabel lokalizacji, klucz = id + pole.

Narzędzie edytora "Import prototype data" powinno umieć wczytać nowszy eksport (gdyby prototyp się jeszcze zmienił) i pokazać różnice. Skrypt eksportu: `docs/unity/tools/dump.js` (node, czyta `src/p1_config.js`), skrypt wartości wzorcowych: `docs/unity/tools/golden.py` (Playwright na zbudowanej stronie).

## 2.6 Odpowiedniki plików prototypu

| Prototyp | Zawartość | Unity |
|---|---|---|
| `p1_config.js` | dane i stałe | `data/*.json` + `Balance.cs` (stałe spoza tabel) |
| `p2_state_map.js` | ustawienia, stan, mapa, obszary | `Core/Map/*`, `Services/Settings` |
| `p3_flow.js` | run, fala, ekonomia, generowanie bohaterów, obrażenia, strach, rozmowy | `Core/Run/*`, `Core/Economy/*`, `Core/Heroes/HeroFactory`, `Core/Combat/*`, `Core/Speech/*` |
| `p4_traps.js` | odpalanie pułapek i potworów | `Core/Items/*` (jedna klasa zachowania na typ) |
| `p5_ai.js` | AI bohaterów | `Core/AI/*` |
| `p6_loop.js` | krok symulacji, skill checki, rachunek kamery, muzyka | `Core/Sim/Step`, `Core/Checks/*`, `Game/Camera/*`, `Services/Audio/Music` |
| `p7_draw.js` | rysowanie | `Game/View/*` (prefaby, materiały, animacje) |
| `p8a_icons.js` | ikony SVG elementów | sprite'y ikon (sekcja 08: lista) |
| `p8b_ui.js` | ekrany, gesty, sklep, zapis, dane testowe, przewodnik | `UI/*`, `Game/Input/*`, `Services/Save`, `Services/Telemetry`, `UI/Tutorial/*` |
| `p0_head.html` | style (kolory, rozmiary, animacje UI) | style uGUI: paleta, fonty, prefaby przycisków i kart |

Mapa najważniejszych funkcji prototypu z krótkim opisem: załącznik C.

## 2.7 Struktura katalogów projektu

```
Assets/
  _Project/
    Scripts/
      Core/        (asmdef YATD.Core, bez Unity)
        Sim/ Run/ Map/ Items/ Heroes/ AI/ Combat/ Economy/ Checks/ Speech/ Onboarding/ Util/ (Rng, JsMath)
      Data/        (asmdef YATD.Data)
      Game/        (asmdef YATD.Game) View/ Camera/ Input/ Fx/
      UI/          (asmdef YATD.UI) Hud/ Tray/ Screens/ Shop/ Tutorial/ Common/
      Services/    (asmdef YATD.Services) Save/ Settings/ Audio/ Haptics/ Telemetry/ Ads/ Iap/
    Data/          JSON z prototypu (TextAsset)
    Art/           Tiles/ Walls/ Props/ Items/ Heroes/ Monsters/ Fx/ UI/ Icons/ Fonts/
    Audio/         Music/ Sfx/
    Prefabs/  Scenes/ (Boot, Game)  Localization/  Settings/ (URP, Input)
  Tests/
    EditMode/ (asmdef YATD.Tests.EditMode) Golden/ Scenarios/ Replays/
    PlayMode/
```

Jedna scena gry (`Game`) z warstwami: loch 3D, aktorzy, efekty, UI. Ekran startowy i ekrany między falami to nakładki UI w tej samej scenie (w prototypie loch zawsze jest pod spodem, także za ekranem startowym: przykładowy loch). Scena `Boot` tylko wczytuje dane, ustawienia i zapis.

## 2.8 Wydajność

- Loch ma najwyżej kilkadziesiąt elementów i do 6 bohaterów, siatka to `WW × WH` pól (sekcja 07). Wyszukiwanie dróg (BFS z kosztami zagrożenia) liczone na żądanie, nie co klatkę; prototyp trzyma flagi `needPlan`, `threatDirty` (sekcja 06), zachowaj ten sam mechanizm.
- Bez alokacji w `Step`: pule obiektów na pływające liczby, cząsteczki, orby i dymki; listy wielokrotnego użytku dla BFS.
- Prototyp ma liczniki płynności (`PERF`, `perfNote`) i zapisuje je w danych testowych. W Unity: Profiler + własny licznik klatek w danych testowych (sekcja 07).
- Ściany kładące się wokół drużyny (sekcja 08) to animacja skali, nie przebudowa siatki.

## 2.9 Zasady pisania kodu (dla kolejnych czatów)

- Nazwy i komentarze w kodzie po angielsku, teksty dla gracza tylko przez lokalizację (polski bazowy).
- Każda reguła przeniesiona z prototypu ma w komentarzu odnośnik `// proto: p3_flow.js hungerNeed`, a stałe mają te same nazwy co w prototypie (`COMBO_POW`, `BREACH_P`, `CHECK_SLOW`...). Dzięki temu specyfikacja, prototyp i kod Unity dają się porównać wyszukiwaniem.
- Najpierw test, potem kod: dla formuł testy z `golden_1.13.1.json`, dla zachowań scenariusze (sekcja 09).
- Nie "poprawiaj" zachowania prototypu po cichu. Błędy i niespójności znalezione przy przenoszeniu wpisuj do sekcji 11 i pytaj autora.
- Ręczne sprawdzenie: prototyp można uruchomić lokalnie (`index.html` z repo w przeglądarce) albo na stronie testowej; w konsoli przeglądarki obiekt `window.__yatd` daje dostęp do stanu (`__yatd.run`, `__yatd.fl`, `__yatd.mods`) i funkcji (pełna lista na końcu `src/p8b_ui.js`).
