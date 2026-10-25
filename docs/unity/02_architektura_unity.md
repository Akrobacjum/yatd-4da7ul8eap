# 02. Architektura w Unity

Ta sekcja to propozycja techniczna dla wersji w Unity: wersja silnika, pakiety, podział kodu, model symulacji i to, jak przenieść dane z prototypu. Reguły gry są w sekcjach 03-08; tu jest "jak to zbudować", żeby dało się te reguły wiernie odtworzyć i sprawdzić.

## 2.1 Cele techniczne

1. **Wierność prototypowi.** Gra ma zachowywać się jak Prototype 1.24 (specyfikacja pisana na 1.12.1 i uzupełniana do 1.24; autor ocenił wygląd, działanie i dźwięk bardzo wysoko). Każda reguła ma odpowiednik w kodzie prototypu, a specyfikacja wskazuje plik i funkcję.
2. **Symulacja oddzielona od wyglądu.** Cała logika (loch, bohaterowie, pułapki, ekonomia, AI) w czystym C# bez MonoBehaviour, sterowana krokiem czasu. Dzięki temu da się ją testować bez edytora (testy EditMode) i odtwarzać zapisane fale.
3. **Dane zamiast kodu.** Elementy, karty, klasy, poziomy i kwestie bohaterów są w JSON wyeksportowanym z prototypu (`data/`). Strojenie liczb nie wymaga zmian w kodzie.
4. **Telefon.** Pion (od 1.24 prototyp działa też w poziomie), jedna ręka, płynne 60 klatek w fali na średnim Androidzie, 30 w budowie i rysowanie na żądanie w bezczynności (telefony się grzały, 1.24), mało alokacji w pętli.
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
| Lokalizacja | Unity Localization (`com.unity.localization`) | Od 1.27 prototyp jest dwujęzyczny: angielski domyślnie, polski do wyboru w Ustawieniach. Wszystkie teksty od początku przez tabele z kluczami (2.10). |
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

- `yatd_content_1.17.1.json`: wszystkie tabele w jednym pliku (`tables.ITEMS`, `tables.UPGRADES`, `tables.HEROES`...; stan Prototype 1.17.1; tabele zmienione w 1.18-1.24 trzeba wyeksportować na nowo, lista w załączniku A, A.0 i A.9),
- te same tabele osobno (`ITEMS.json`, `UPGRADES.json`, ...),
- `levelStats_1_30.json`: policzone statystyki poziomów 1-30,
- `golden_1.13.1.json`: wartości policzone przez działający prototyp (skład i poziom fal 1-20, głód serca, krzywa chciwości, ceny, koszty narzędzi, domyślne `mods` i `S`).

Funkcje w danych (np. `apply` kart, `req`) są zapisane jako tekst źródłowy z prefiksem `fn: `. W Unity:
- **karty**: przepisz 126 funkcji `apply` (122 karty talii i 4 jednorazowe w 1.24; w 1.17.1 98) na listę operacji (`ModOp { field, op: Add|Mul|Set, value }`) albo, prościej, na `switch (card.id)` w jednym pliku `CardEffects.cs`. Pełna lista z kodem: załącznik B. Karty `instant` (Żarłoczne serce, Zastrzyk Esencji, Hojny kupiec, Pakt) działają na `run` raz, przy kupnie.
- **wymagania kart** (`req`): napis = id elementu, który musi być odblokowany; funkcja = warunek z kilku odblokowań (np. Lepkie kolce: sieć albo pająk) albo, od 1.18, "ta komnata / ten efekt jest w lochu" (`hasRk`, `hasRt`).
- **połączone karty ★** (1.24): moc karty jako `p` kopii (2,5 / 2,75 / 3,125) wymaga, żeby operacje karty dało się nałożyć ułamkowo (mnożenie: `k^p`, dodawanie: `p × krok`); w modelu `ModOp` to proste, w `switch` trzeba dodać parametr mocy (sekcja 03, 3.13).
- **teksty** (`name`, `tag`, `desc`, `more`, `text`, `SAY`, `CHAT_REPLY`, `ONB_STAGES`): do tabel lokalizacji, klucz = id + pole; kwestie bohaterów dostają własne id (2.10). Eksport w `data/` ma teksty polskie, a angielskie pola `en` tylko przy obiektach danych (2.10, załącznik A).

Narzędzie edytora "Import prototype data" powinno umieć wczytać nowszy eksport (gdyby prototyp się jeszcze zmienił) i pokazać różnice. Skrypt eksportu: `docs/unity/tools/dump.js` (node, czyta `src/p1_config.js`), skrypt wartości wzorcowych: `docs/unity/tools/golden.py` (Playwright na zbudowanej stronie).

## 2.6 Odpowiedniki plików prototypu

| Prototyp | Zawartość | Unity |
|---|---|---|
| `p1_config.js` | dane i stałe; od 1.27 na początku `LANG`, `L`, `dec`, `enDeep` | `data/*.json` + `Balance.cs` (stałe spoza tabel); teksty do tabel lokalizacji (2.10) |
| `p1e_en.js` (1.27) | angielskie kwestie bohaterów (`DLG_EN`) i podmiana tekstów danych na angielskie | kolumna `en` tabel lokalizacji, wypełniana raz przy imporcie (2.10) |
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
- Tempo klatek (1.24, sekcja 07, 7.10.9): fala najwyżej 60 klatek/s (także na ekranach 90/120 Hz), budowa, pauza i ekrany między falami 30, a bez ruchu i dotyku przez 2 s obraz stoi (rysowany tylko po zmianie) i nieskończone animacje UI się zatrzymują. W Unity: `Application.targetFrameRate` i `OnDemandRendering.renderFrameInterval`, symulacja w stałym kroku niezależnie od rysowania. Pomiar prototypu: bezczynna budowa 125% -> 3% CPU; sama klatka fali przy 100 elementach tylko -9% (dużo drobnych rysunków).
- Animacje 1.24 (sekcja 08, 6.13b) z puli 64 miejsc bez alokacji; w Unity pula efektów.
- Mapa bez ramki (1.24): kamera rysuje cały ekran, UI na wierzchu; kadrowanie kamery liczone dla prostokąta między HUD a szufladą.

## 2.9 Zasady pisania kodu (dla kolejnych czatów)

- Nazwy i komentarze w kodzie po angielsku, teksty dla gracza tylko przez lokalizację (angielski domyślny, polski drugi; 2.10). Żadnego tekstu dla gracza w kodzie C#, także w komunikatach odmowy i napisach nad bohaterami.
- Każda reguła przeniesiona z prototypu ma w komentarzu odnośnik `// proto: p3_flow.js hungerNeed`, a stałe mają te same nazwy co w prototypie (`COMBO_POW`, `BREACH_P`, `CHECK_SLOW`...). Dzięki temu specyfikacja, prototyp i kod Unity dają się porównać wyszukiwaniem.
- Najpierw test, potem kod: dla formuł testy z `golden_1.13.1.json` (od 1.24 `waveBase` fal 1-4 inne, sekcja 09), dla zachowań scenariusze (sekcja 09).
- Nie "poprawiaj" zachowania prototypu po cichu. Błędy i niespójności znalezione przy przenoszeniu wpisuj do sekcji 11 i pytaj autora.
- Ręczne sprawdzenie: prototyp można uruchomić lokalnie (`index.html` z repo w przeglądarce) albo na stronie testowej; w konsoli przeglądarki obiekt `window.__yatd` daje dostęp do stanu (`__yatd.run`, `__yatd.fl`, `__yatd.mods`) i funkcji (pełna lista na końcu `src/p8b_ui.js`).

## 2.10 Lokalizacja (od 1.27)

Od Prototype 1.27 gra jest **domyślnie po angielsku**, a polski jest do wyboru w Ustawieniach (wiersz "Język / Language" na górze, sekcja 08, 3.6). Decyzja autora (25.10.2026): angielski domyślny, polski opcjonalny, polski tekst ma brzmieć naturalnie. Ta część opisuje, jak prototyp to robi, i co z tego przenieść do Unity.

### Jak to działa w prototypie

- **Wybór języka** (`p1_config.js`, początek pliku): `LANG` = `localStorage['yatd-lang']` (`'en'` albo `'pl'`), a gdy go nie ma, `window.YATD_LANG_DEFAULT` albo `'en'`. Strona testowa ustawia `YATD_LANG_DEFAULT = 'pl'`, więc testy automatyczne czytają polski. `PL = LANG === 'pl'`; `document.documentElement.lang = LANG`. Zmiana w Ustawieniach zapisuje wybór, w budowie zapisuje run (`saveRun('build')`, gdy są kryształy) i przeładowuje stronę. Język jest więc stały przez całe życie strony.
- **Teksty w kodzie**: każdy napis widoczny dla gracza w `p3`-`p8` (w `p2_state_map.js` takich nie ma) to para `L('pl', 'en')` (`L = (pl, en) => PL || en == null ? pl : en`, ok. 1,4 tys. wywołań, najwięcej w `p8b_ui.js`). `LL` to ta sama funkcja pod inną nazwą, dla funkcji, w których lokalna zmienna `L` (zwykle przywódca drużyny) zasłania pomocnika.
- **Dane**: obiekty w tabelach mają obok pól polskich pole `en: { name, tag, desc, more, text, label, ... }` (np. `ITEMS`, `UPGRADES`, `TABS`, `FAMILIES`, `STATUS`, `REACTIONS`, `HEROES`, `OMENS`, `RT_INFO`, `KIND_INFO`, `ONB_STAGES`, `SLIDERS`, `GAME_SETTINGS`). Po angielsku `enDeep(tabela)` przepisuje pola z `en` na miejsce polskich (rekurencyjnie, do głębokości 5; lista tabel: `EN_TABLES()` w `p1e_en.js`). Proste tablice i słowniki są w całości parą `L([...], [...])` albo `L({...}, {...})` (`RANKS` nazwy, `SLOT_LABEL`, `RARITY_NAME`, `RAR_NAME`, `DMG_TYPES`, `CLASS_RES_TEXT`, `CLASS_SKILL`, `BOSS_NAME`, każdy wpis `TRAITS` i `TRAITS_B`); formy przymiotników `ADJ` są tylko polskie (`PL ? ... : ...`).
- **Kwestie bohaterów** (`p1e_en.js`, nowy plik po `p1_config.js`): `DLG_EN` to jedna mapa "polska kwestia -> angielska" dla `SAY`, `CONVO`, `SOLO`, `LINE_NEEDS` i `CHAT_REPLY` (6368 różnych kwestii). Po angielsku kod przy starcie przepisuje te tabele w miejscu (także klucze `CHAT_REPLY`), pomijając pola meta `CONVO` (`b`, `bt`, `at`, `ac`, `br`, `bv`). Kwestii, której nie ma w mapie, nie tłumaczy (zostaje po polsku).
- **Liczby i daty**: `dec(v)` daje przecinek po polsku i kropkę po angielsku (`f1`, `x1`, `x2`, `fmt2`, `fmtE`, `fmtG` przez nią przechodzą); daty `toLocaleString('pl-PL' | 'en-GB')`; liczebniki porządkowe po angielsku `ordEn` (2nd, 3rd).
- **Imiona i płeć**: imiona bohaterów się nie tłumaczą (Borys, Wanda zostają). Po angielsku nie ma odmiany: `{n}`, `{a}`, `{v}`, `{g}` dają mianownik (`nameFill`, `nameGen`), tak samo `{An}`, `{Aa}`, `{Av}` w rozmowach (`p5_ai.js: convoFill`). Przełączniki płci `{m|f}` i `{A:m|f}` zostają tam, gdzie angielski ich potrzebuje (he/she, his/her); w pozostałych angielskich kwestiach ich nie ma.
- **Słownik** (wiążący): Esencja = Essence, Groza = Dread, Chciwość = Greed, Nasycenie = Satiety, Danina = Tithe, Dar serca = Heart's Gift, Odrost = Regrowth, Ofiara = Offering, komnata = lair (zakładka Komnaty = Lairs), Klimat (efekty pokoi) = Mood, Runa rodu = Family Rune. Pełna lista jest w materiałach roboczych 1.27 (`GLOSSARY.md`, nazwy elementów i kart w `names_en.json`), poza repo.
- **Co zostaje po polsku w obu językach**: odpowiedzi ankiety zapisują wartość polską (wyniki w jednym zbiorze), a dokument ankiety dostaje pole `lang`; starsze wpisy "Co nowego" (sprzed 1.27) są tylko po polsku i po angielsku ich nie widać; eksport `data/` (niżej).

### Zalecenia dla Unity

1. **Pakiet Unity Localization**, dwa locale: `en` (domyślny) i `pl`. Wybór gracza w `PlayerPrefs`; bez wyboru angielski (prototyp nie patrzy na język systemu; czy telefon z polskim systemem ma startować po polsku, to pytanie do autora, sekcja 11). Zmiana języka w Unity nie wymaga restartu: widoki odświeżają się przez `LocalizedString`, ale stan zapisany jako gotowy tekst trzeba wtedy przeliczyć (punkt 6).
2. **Tabele napisów według kategorii**, nie jedna wielka:
   - `UI`: HUD, ekrany, przyciski, okna, komunikaty odmowy, napisy nad bohaterami, kroki przewodnika (`TUT`), karty zasad (`TUT_POP`), Jak grać, Co nowego;
   - `Items`: elementy (`name`, `tag`, `desc`, `more`), cechy poziomu 3 (`TRAITS`, `TRAITS_B`), rodziny, komnaty i efekty pokoi, statusy, reakcje, typy obrażeń, miejsca (`SLOT_LABEL`);
   - `Cards`: karty (`UPGRADES`: `name`, `text`, `tag`), cechy łączenia ★ (`FUSE_TEXT`), nazwy rzadkości;
   - `Dialogue`: wszystkie kwestie bohaterów (`SAY`, `SOLO`, `CONVO`, `CHAT_REPLY`).
   Klasy, cechy charakteru, fobie, ciała, rangi bohaterów, tytuły bossów, przedmioty bohaterów i omeny mogą iść do `Items` albo do osobnej tabeli `Heroes`; ważne, żeby klucze były stałe.
3. **Klucz = stabilne id, nigdy polski tekst.** Dla danych: id + pole (`item.web.desc`, `item.web.more`, `card.heartcore.text`, `status.burn.name`). Dla UI: nazwa miejsca i sensu (`summary.next_shop`, `shop.free_cards`). Dla kwestii: id nadane przy imporcie (np. `say.trapGeneric.03`, `convo.saw.07.2`, `solo.chat_brave.01`), bo kwestie nie mają dziś żadnego id.
4. **Kwestie: rozpiąć zależność od polskiego tekstu.** W prototypie `DLG_EN` jest kluczowane polskim tekstem i od tego tekstu zależą trzy wyszukiwania: `lineKey` (z której pozycji `SAY` pochodzi kwestia; po niej startuje rozmowa `CONVO`, przez wzorce `LINE_RX` dla kwestii z imionami), `lineTags` (`LINE_NEEDS` to listy dokładnych tekstów, które wolno powiedzieć tylko temu, kto zna tag) i `CHAT_REPLY` (klucz to surowy tekst zaczepki). Przepisanie w miejscu działa tylko dlatego, że ta sama polska kwestia dostaje wszędzie ten sam angielski tekst; poprawka jednej polskiej kwestii bez poprawki klucza w `DLG_EN`, `LINE_NEEDS` i `CHAT_REPLY` cicho urywa tłumaczenie, tagi albo odpowiedzi. W Unity importer powinien nadać każdej kwestii id i zapisać przy niej: klucz `SAY` (zamiast `lineKey`), tagi z `LINE_NEEDS` (zamiast `lineTags`), listę id odpowiedzi (zamiast `CHAT_REPLY` po tekście). Symulacja pracuje wtedy na id, a tekst pobiera dopiero przy wyświetleniu. `DLG_EN` służy raz, do wypełnienia kolumny `en` tabeli `Dialogue`.
5. **Znaczniki w tekstach**: imiona `{n}` `{a}` `{v}` `{g}`, w rozmowach `{An}` `{Aa}` `{Av}` (B, C), płeć `{m|f}` i `{A:m|f}` (załącznik A, A.5). Najprościej zachować składnię prototypu i jedną własną funkcję formatującą po pobraniu tekstu z tabeli (w locale `en` przypadki dają mianownik, jak w `nameFill`); przepisanie 6,4 tys. kwestii na Smart Strings pakietu to duża, ryzykowna zmiana bez zysku dla gry. Odmiana imion zostaje w danych (`NAMES_M`, `NAMES_F`: mianownik, biernik, wołacz; dopełniacz z reguły `nameGen`).
6. **W zapisie trzymać id i parametry, nie gotowy tekst.** Prototyp zapisuje w runie kilka napisów złożonych w chwili powstania (tytuł Nemezis, tekst gildii, powód końca runu); po zmianie języka zostają w starym (sekcja 11). W Unity: `nemesisTitleId`, `guildKind`, `endReason` + liczby, tekst składany przy wyświetleniu.
7. **Liczby**: format przez `CultureInfo` (`pl-PL` przecinek, `en-GB` kropka), zawsze po zaokrągleniu jak w JS (`JsRound`, 2.4).
8. **Fonty**: atlas TMP z polskimi znakami w obu językach (imiona bohaterów są polskie także po angielsku), sekcja 2.2 i skill `unity:optimize-text-mesh-pro`.
9. **Import danych**: `tools/dump.js` od 1.27 wykonuje `p1_config.js` po polsku (`YATD_LANG_DEFAULT = 'pl'`), więc pliki w `data/` mają polskie pola, a angielskie tylko tam, gdzie obiekt ma pole `en` (zostaje w eksporcie jako podobiekt). Tabele w parach `L([...], [...])` eksportują się tylko po polsku, a `DLG_EN` nie jest eksportowany wcale (leży w `p1e_en.js`). Do pełnego importu trzeba albo drugiego przebiegu skryptu z `'en'` (dla par `L`), albo wyciągnąć pary z kodu, plus odczytać `DLG_EN` z `p1e_en.js` (to jeden literał obiektu JSON). Napisy UI z `L('pl', 'en')` w `p3`-`p8` najlepiej wyciągnąć skryptem do CSV i nadać im klucze ręcznie (kontekst jest w kodzie obok).
10. **Testy**: testy EditMode sprawdzają logikę na id, więc nie zależą od języka; testy PlayMode z napisami w obu locale (prototyp testuje tylko polski). Prosty test kompletności: każda pozycja tabeli ma `en` i `pl`, a każdy znacznik `{...}` z jednej wersji jest w drugiej, chyba że to znacznik przypadku albo płci, którego angielski nie potrzebuje.
