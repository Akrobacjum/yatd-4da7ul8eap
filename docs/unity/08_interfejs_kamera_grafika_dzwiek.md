# 08. Interfejs, sterowanie, kamera, grafika, dźwięk i samouczek

Wersja źródłowa: Prototype 1.13.4 (`LOG_VERSION = 58`). Pliki: `src/p0_head.html` (CSS), `src/p0b_body.html` (DOM), `src/p6_loop.js` (kamera, skill check, muzyka, efekty dźwiękowe, haptyka), `src/p7_draw.js` (rysowanie na canvasie), `src/p8a_icons.js` (ikony SVG), `src/p8b_ui.js` (HUD, ekrany, wejście, sklep, zapis, samouczek).

Autor jest bardzo zadowolony z wyglądu, odczucia i dźwięku prototypu ("fenomenalna robota"). Wersja Unity ma być **wierną kopią prezentacji**: te same kolory, rozmiary, czasy animacji, dźwięki i zachowanie gestów. Ta sekcja opisuje wyłącznie prezentację i interakcję. Zasady gry są gdzie indziej: przebieg runu, ekonomia, sklep (sekcja 03), generowanie bohaterów (sekcja 04), pułapki, obrażenia, strach i logika skill checku (sekcja 05), AI bohaterów i reguły mówienia (sekcja 06), mapa, reguły stawiania, pętla gry i zapis (sekcja 07).

## Zmiany w 1.12.1 (skrót)

- Bohaterowie stoją na środku swojego pola (jedno pole na bohatera, sekcja 06, 6.2.15); przy mijaniu odchylają się w bok o `0,24 × sin(π × prog)` pola (`p3_flow.js: heroPos`).
- Narady i odpoczynek to scenki z kilkoma dymkami po kolei; drużyna podchodzi do przywódcy i patrzy na niego (sekcja 06, 6.7.5); w ich trakcie bez autoprzyspieszenia.
- Pasek czasu w HUD pokazuje czas cierpliwości `fl.patT` (w scenkach płynie 2 razy wolniej).
- Nowa karta "Wieści z karczmy", komunikaty sklepu nad przyciskiem, poprawki z listy w rozdziale 10.

## 0. Konwencje

- **px** = piksel CSS. Na Androidzie 1 px CSS = 1 dp, więc w Unity przeliczaj wszystkie rozmiary z tej sekcji jako dp (`px_ekranu = dp * Screen.dpi / 160`). Prototyp projektuje pod 390×844 px (telefon w pionie).
- **T** = `cam.s` = ile px ma jedna jednostka widoku (patrz 5.1). Rozmiary rzeczy na mapie podaje się w ułamkach T.
- **realNow** = czas rzeczywisty (animacje UI, kamera), **fl.time** = czas gry (spowalnia pod checkiem, przyspiesza przy przytrzymaniu palca). Każdy czas w tej sekcji jest w sekundach realnych, chyba że napisano inaczej.
- Źródło każdej reguły: `plik: funkcja` albo `plik: selektor CSS`.
- Liczby w UI: polski przecinek dziesiętny. `fmtE` (`p1_config.js`): od 10 w górę liczba całkowita, poniżej jedno miejsce po przecinku bez ",0"; `fmt2` (`p2_state_map.js`): dwa miejsca; `fmtG` (`p8b_ui.js`): Groza poniżej 1 z dwoma miejscami.
- "Tylko prototyp" oznacza rzecz z wersji web/testowej; w tabeli w rozdziale 9 jest jej odpowiednik w Unity.

### Zrzuty ekranu (folder `shots/`, 390×844, DPR 2)

Zrzuty 01-10 zrobione na Prototype 1.12 (interfejs 1.12.1 różni się tylko listą "Co nowego" i komunikatem w sklepie, a 1.13 miejscem checku), 11-12 na 1.13; zapisane w 256 kolorach, żeby ważyły mniej, więc gradienty mogą mieć lekkie pasy.

| Plik | Co pokazuje |
|---|---|
| `01_start.png` | ekran startowy (pierwsze uruchomienie, etap nauki 1) |
| `02_build_tray.png` | budowa, pasek rozwinięty, wybrane Kolce (przerywane ramki wolnych miejsc), widok wysokiej izometrii |
| `03_tile_tip.png` | przytrzymany kafelek Strzały: podpowiedź `#tip` nad paskiem |
| `04_build_folded.png` | budowa, pasek zwinięty: podgląd widoku fali (izometria 2:1) |
| `05_wave_check.png` | fala: baner "Fala 1", skill check (pasek), obwódka pułapki, przyciemnienie; zrzut z 1.12, gdy check był na dole mapy (od 1.13 jest u góry: `11_check_top.png`) |
| `06_wave_play.png` | fala: fioletowe orby Grozy lecące do równania, dymek z nitką, liczby nad bohaterami, serce |
| `07_summary.png` | podsumowanie fali (jeden ekran) |
| `08_shop.png` | sklep (4 oferty, odświeżanie, talia i schowek) |
| `09_hero_card.png` | karta bohatera otwarta w fali (gra stoi) |
| `10_tutorial.png` | samouczek: coach na dole mapy, pulsujący pierścień celu |
| `11_check_top.png` | 1.13: check (spirala) u góry mapy pod ikonami drużyny, dymek zepchnięty pod płytę, pułapka z obwódką i drużyna widoczne niżej |
| `12_check_tutorial.png` | 1.13: pierwszy check w runie z przewodnikiem: karta samouczka u góry (gra stoi), check "Uwaga: strzały!" pod nią |

## 1. Kierunek artystyczny, paleta, fonty

### 1.1 Kierunek (dark fantasy)

Komentarz autora w `p0_head.html` (nagłówek `<style>`), który jest briefem dla grafika: dark fantasy, nie bajkowe fantasy. Zimny popielaty kamień i czarne żelazo, tekst w kolorze kości, krew dla tego, co się naciska, jeden świecący czerwony kolor wyłącznie dla Esencji (życie, które wysysasz), fiolet dla grozy i strachu. Ciepłe światło tylko w małych miejscach: pochodnie na mapie. Małe, ścięte rogi zamiast miękkich pigułek (`--r: 3px`). Jeden ciemny świat, bez jasnego motywu. Bohaterowie i potwory w pixel arcie o przygaszonych kolorach (rozdz. 6.7), meble, pułapki, budowle, łup i serce jako bryły w izometrii.

### 1.2 Paleta (zmienne CSS w `p0_head.html: :root`)

| Zmienna | Hex / wartość | Rola |
|---|---|---|
| `--bg` | `#09090b` | tło strony i ekranów pełnych |
| `--panel` | `#141519` | płyta kamienna (kafelki, karty) |
| `--panel2` | `#1b1d22` | płyta podniesiona (przyciski, panele) |
| `--panel3` | `#25282e` | płyta wciśnięta/wybrana |
| `--line` | `#2b2e34` | zaprawa (obramowania) |
| `--line2` | `#464b53` | żelazna krawędź (karty, ważniejsze ramki) |
| `--edge` | `rgba(210,220,235,0.06)` | światło na górnej krawędzi płyty (inset 0 1px) |
| `--shade` | `rgba(0,0,0,0.55)` | cień |
| `--ink` | `#e6e1d6` | kość: główny tekst |
| `--muted` | `#8e939a` | popiół: tekst pomocniczy |
| `--dim` | `#5d6168` | przygaszone (operatory równania, wyłączone) |
| `--gold` | `#c4a052` | zmatowiały mosiądz: wybór, linki, podświetlenia samouczka |
| `--gold-hi` | `#e6cf94` | jasny mosiądz: przycisk ▼/▲ Budowa, Chciwość |
| `--ember` | `#e0643c` | żar: legendarne, znacznik bossa w pipsach |
| `--blood` | `#8c1a24` | krew: przyciski główne, utracona fala |
| `--blood-hi` | `#cc3640` | ostrzeżenie (mini.warn, kryształy przy alarmie) |
| `--blood-lo` | `#460a10` | ciemna krew |
| `--violet` | `#a08ce8` | groza i strach |
| `--violet-hi` | `#d9ccff` | liczba Grozy w równaniu |
| `--violet-lo` | `#4f3f8f` | obwódka Grozy przy trwającym combo |
| `--ice` | `#a9d4da` | combo i inne mnożniki (Combo, Żyła) |
| `--ess` | `#ff4f5e` | Esencja: JEDEN czerwony wszędzie (licznik, ceny, kulki, wykres) |
| `--ess-hi` | `#ffb0b6` | Esencja rosnąca (licznik "up") |
| `--ess-lo` | `#6e121c` | ciemna Esencja (dół słupków) |
| `--bile` | `#8fb07a` | syte serce, dobre wyniki |
| `--rose` | `#e28da2` | kryształy |
| `--r` | `3px` | promień rogów |
| `--grain` | SVG feTurbulence | ziarno: fractalNoise baseFrequency 0.85, 2 oktawy, kafel 180×180, alfa 0.1, odcień (0.5, 0.52, 0.56) |
| `--font-display` | Grenze Gotisch | nagłówki, przycisk główny, baner |
| `--font-body` | Alegreya Sans | tekst |
| `--font-num` | Jersey 10 | liczby |
| `--top-min`, `--top-extra`, `--safe-top` | 0 / 0 / wzór | górny odstęp (tylko prototyp, patrz rozdz. 9) |

Inne stałe kolory używane w całym UI:

| Grupa | Wartości | Źródło |
|---|---|---|
| Rzadkość kart (ramki) | zwykła `#b6bac1`, rzadka `#7aa6d6`, legendarna `--ember` (tło `#221619`/`#231619`), odblokowanie `--violet` (tekst `#c2b0ff`) | `p0_head.html: .offer`, `.item.dslot` |
| Rzadkość kart (tytuł w karcie talii) | `RAR_COLOR` c `#c9c2d8`, r `#6fb7ff`, l `#ff8a3c` | `p1_config.js` |
| Klasy bohaterów | wojownik `#6f9cff`, złodziej `#6fd64f`, kapłan `#ffd23f`, mag `#b76dff`, bard `#2fd3c4`, barbarzyńca `#ff7a33` | `p1_config.js: HEROES` |
| Poziomy (rangi bohatera) | Nowicjusz `#9be37a`, Weteran `#6fb7ff`, Elita `#c39bff`, Mistrz `#ff8a3c`, Legenda `#ff5a6a`, Mit `#ffe066` | `p1_config.js: TIERS` |
| Przedmioty bohaterów | mikstura `#8be38f`, talizman `#7fb8ff`, amulet `#c3b2ff`, buty `#e8c27a`, bomba `#ff9a3c`, broń `#d9dbe6`, zbroja `#9aa3b8` | `p1_config.js: ITEM_COLOR` |
| Łup (tag kafelka) | monety `#f2b94b`, mikstura `#8be38f`, ekwipunek `#6fb7ff`, relikwia `#ff8a3c`, przeklęty `#b48cff` | `p1_config.js: LOOT_COLOR` |
| Typy pokoi (glif, kolor) | Mgła ≋ `#b9c4d8`, Bagno ~ `#8fbf6a`, Grota ) `#9fb6ff`, Krypta ✝ `#c9b6e8`, Sezam ◆ `#ffd27a`, Sanktuarium ✚ `#f3e2b0`, Zębatki ⚙ `#d6a86a`, Głusza ◌ `#9aa6bb`, Lodownia ❄ `#bfe6ff` | `p1_config.js: RT_INFO` |
| Podłoga pokoi (od wejścia w głąb) | `ROOM_TINT` `#3f4246` → `#43424a` → `#4a3e45` → `#533941` → `#5f3239` (interpolacja po odległości; korytarz × 0,62) | `p1_config.js`, `p2_state_map.js: tint` |
| Skill check | patrz 6.12 (`CK`) | `p7_draw.js: CK` |

### 1.3 Fonty (Google Fonts)

Ładowane z `fonts.googleapis.com` (`p0_head.html`, `<link>`): **Alegreya Sans** 400/500/700, **Grenze Gotisch** 600/700, **Jersey 10** 400. W Unity: dołącz pliki TTF (licencja OFL) jako TextMeshPro Font Assets z polskimi znakami (latin + latin-ext).

| Font | Gdzie | Uwagi |
|---|---|---|
| Grenze Gotisch 700 | "Fala N/10" (21 px), przycisk "Wypuść falę" (21 px), główne przyciski w oknach (22 px), h1 46 px, h2 30 px, nagłówek ekranu 28 px, baner 46 px, nazwa w podpowiedzi kafelka 22 px, tytuł skill checku 17 px, karta w arkuszu sklepu 24 px | gotycki, `text-shadow 0 2px 0 #000` |
| Alegreya Sans 400/500/600/700 | cały tekst, dymki (500 12 px), plakietka pauzy (600 12 px), lista następnej fali (600 10 px) | `font-size` body 15 px |
| Jersey 10 (jedna grubość 400) | liczby w HUD, ceny, wykresy, liczby nad bohaterami, etykiety na mapie | na canvasie `numFont(px) = '400 ' + round(px*1.08) + 'px "Jersey 10"'`, nigdy pogrubiony (`html { font-synthesis: style }`); wybrany w 1.05, bo w Pixelify Sans myliły się 2 i 8 |

### 1.4 Płyta, nity, winieta, ziarno

- **Płyta** (`p0_head.html: .slab, .iconbtn, .item, ...`): tło = gradient 180° `rgba(220,228,240,0.03)` → `rgba(0,0,0,0.14)` + ziarno; obramowanie 1 px `--line`; `inset 0 1px 0 --edge`; cień `0 2px 0 #000`; rogi 3 px. Wciśnięcie: `translateY(1px)` + `inset 0 1px 3px #000` (czas 0,06 s).
- **Karta** (`.card`): tło `--panel`, ramka 1 px `--line2`, promień 4 px, padding 18 px, cień `0 18px 40px rgba(0,0,0,0.75)`; w czterech rogach nity (kropki `#59606a` r 1,5 px, 5 px od krawędzi), poza ekranami pełnymi (`.card:not(.screen)::before`).
- **h1** ma pod spodem ornament: linia `--line2` przerwana kropką `--muted` (`.card h1::after`).
- **Tło strony** (`body`): `--bg` + radialny poblask u góry `rgba(120,135,160,0.10)` + krwawy poblask u dołu `rgba(110,10,20,0.20)` + ziarno.
- **Mapa** (`#stage`): ramka `0 0 0 1px #000, 0 0 0 3px #24272c, 0 0 0 4px #000`, cień `0 6px 18px rgba(0,0,0,0.6)`, promień 4 px. Nad canvasem: **świeca** (`#stage::before`, radialny `rgba(255,150,70,0.045)` z migotaniem `candle` 3,2 s, kroki: 100/75/100/85/60/100/80/100% krycia) i **winieta** (`#stage::after`, `inset 0 0 50px 12px rgba(0,0,0,0.7)` + 1 px `rgba(200,215,235,0.06)`). Tło canvasu `#060709` (`p7_draw.js: draw`).

### 1.5 Ruch i "mniej ruchu"

`@media (prefers-reduced-motion: reduce)` skraca wszystkie animacje CSS do 0,001 s, a kod sprawdza `reduceMotion` (`p8b_ui.js`): licznik Esencji skacze od razu, brak floaterów +N, brak orbów, kamera i pasek przełączają się natychmiast, ściany bez animacji, brak "popów" i kurzu, brak animacji wejścia/wyjścia bohaterów. W Unity: ustawienie "Ogranicz animacje" o tym samym działaniu.

## 2. Układ ekranu (pion)

### 2.1 Szkielet (`p0b_body.html`, `p0_head.html: #app`)

Kolumna flex na całą wysokość (`100dvh`), maks. szerokość 560 px wyśrodkowana, odstęp między rzędami 7 px, padding: góra `max(8px, --safe-top)`, dół `max(10px, safe-area-inset-bottom)`, boki `max(16px, safe-area)`. Od góry:

1. **HUD** (`header.hud`, tylko odczyt, poza równaniem i "Fala").
2. **Mapa** (`#stage`, rośnie, `flex: 1`): canvas `#cv`, baner `#banner`, coach `#coach`.
3. **Szuflada budowy** (`.drawer`): przycisk ▼/▲ Budowa, zakładki, pasek kafelków.
4. **Pasek akcji** (`.actions`): menu, cofnij, duży przycisk.

Wszystko, co się naciska, jest na dole pod kciukiem. Poza `#app`: `#fx` (canvas orbów na cały ekran), `#tip`, `#toast` (martwy), `.overlay` z kartą.

Warstwy (z-index): świeca/winieta 1, baner 2, coach 3, `#fx` 6, `#tip` 8, overlay 10, toast 30. Orby lecą nad wszystkim, ale pod ekranami.

### 2.2 HUD (`p8b_ui.js: updateHud`)

| Rząd | Element (id) | Budowa | Fala | Wygląd |
|---|---|---|---|---|
| 1 lewo | `#h-wave` | "Fala N/10" (po fali 10: "Fala N ∞") | to samo | Grenze 700, 21 px (19 px przy ≤380 px) |
| 1 środek | `#h-score` + `#h-best` | duża liczba = `floor(fl.essence)`; pod nią "Esencja" | pod nią "Esencja · fala +X" (Esencja tej fali razem z porcją serca) | Jersey 26 px (23 px ≤380) w `--ess` z poświatą; `#h-best` 12 px muted; przy ≤440 px kolumna |
| 1 prawo | `#h-cry` | ◆ za każdy kryształ w sercu, ◇ za utracony | ◈ zamiast jednego ◆, gdy złodziej niesie kryształ | 15 px, `--rose`, odstęp 2 px, poświata |
| 2 | `#h-pips` / `#h-barwrap` + `#h-time` | 10 pipsów runu + "budowa" | pasek czasu (`fl.patT / S.waveTime`, od 1.12.1 czas cierpliwości, w scenkach płynie wolniej; mosiądz) + pozostały czas m:ss, "pauza", "szturm!" / "odwrót" (gdy `fl.fearless`) | pips 7 px wysokości, odstęp 3 px; pasek 6 px; czas Jersey 14 px |
| 3 | `#h-hrow`: ♥ `#h-heart`, pasek `#h-hfill`, `#h-hlabel` | etykieta "serce chce N z fali" albo "serce głodne od fali 2" | "serce X/N" → "serce syte" | pasek 9 px; patrz stany niżej |
| 4 | `#h-eq` (równanie) | Groza 0 × Chciwość start × Combo 1 = +0 | żywe wartości serii combo | patrz 2.3 |
| 5 | `#h-rankrow` | "Ranga · Następna za N" albo "ranga: Legenda" | ukryty (równanie potrzebuje miejsca) | 12,5 px muted |

**Pipsy** (`renderPips`): 10 na dziesiątkę fal; zielony `#4d7a3a` = fala utrzymana, krwisty `--blood` = stracony kryształ (skradziony albo zjedzony), mosiądz z pulsowaniem 1,6 s = następna fala, romb `--ember` 5 px nad pipsem co 5 fal (boss).

**Licznik Esencji** (`tickScore`, `floater`): pokazana liczba dąży do prawdziwej o `max(1, ceil(|różnica| * min(1, dt*8)))` na klatkę. Przyrost: klasa `up` (jaśniejszy `--ess-hi`, mocna poświata) przez 420 ms; przyrosty z ostatnich 480 ms łączą się w jeden pływający "+N" (`.floater`, 15 px, 1,1 s, w górę i w prawo); wydatek: klasa `down` (popiół) przez 450 ms i od razu szary "-N" (0,9 s). Najwyżej 4 floatery naraz. Orb, który doleci, "puka" licznik (`scoreHit`: skala 1,12 → 1 w 0,22 s, nie częściej niż co 0,1 s).

**Alarm kryształu** (`crystalAlarm`): gdy liczba kryształów (licząc niesiony jako pół) spadnie poza budową, `#h-cry` trzęsie się 0,9 s (biały → krwisty), a mapa błyska czerwoną winietą (`#stage.alarm`, `inset 0 0 60px 24px rgba(200,20,30,0.75)` → normalna, 0,9 s). Ekran podsumowania z zjedzonym kryształem odpala alarm 900 ms po otwarciu.

**Serce** (`#h-hrow`, stany klas):

| Stan | Warunek | Etykieta | Wygląd |
|---|---|---|---|
| `off` | brak głodu (fala 1) | "serce głodne od fali 2" | ♥ szare `--dim`, bez bicia |
| zwykły | budowa, głód > 0 | "serce chce N z fali" | ♥ `#e0485a`, bicie 1,2 s (skala 1,3 / 1,18) |
| `hungry` | fala/podsumowanie, niesyte | "serce X/N" (różowa `#ff9aa6`) | bicie 0,55 s; pasek czerwony gradient `#e0505c`→`#8a1a28`→`#5c0e16` z połyskiem 2,8 s |
| `fed` | najedzone | "serce syte" (`--bile`) | ♥ `--bile`, bicie 1,8 s, pasek zielony `#b4dc84`→`#557a33`→`#34501f` |

Wypełnienie paska = `fl.fed / need` (animacja szerokości 0,25 s). Orb dolatujący do ♥ powiększa je (`heartHit`, skala 1,55, 0,32 s). Element `#h-hmark` (znacznik progu) jest zawsze ukryty.

### 2.3 Równanie Groza × Chciwość × Combo = Esencja (`updateHud`, `p0_head.html: .eqrow`)

Rząd wyśrodkowany, odstęp 4 px. Pięć pudełek (`.eq`): etykieta 9 px wersalikami muted, wartość Jersey 15 px; minimalna szerokość 48 px, padding 2/7/3 px; operatory `×`, `=` 13 px `--dim`. Kolory wartości: Groza `--violet-hi`, Chciwość `--gold-hi`, Combo i Żyła `--ice`, Esencja `--ess` w pudełku z tłem `#231215` i ramką `#6e1c27`. Przy ≤380 px: odstęp 2 px, min. 44 px, wartość 14 px, etykieta 8,5 px.

| Pudełko | Wartość | Uwagi |
|---|---|---|
| `#eq-g` Groza | w trakcie serii combo "+G" (G = Groza serii minus to, co jeszcze leci w orbach), przez 1,6 s czasu gry po wypłacie G wypłaconej serii, inaczej "0" | |
| `#eq-c` Chciwość | w fali obecna chciwość minus lecące orby złote; poza falą chciwość na start | etykieta "Chciwość" w fali, "Chciwość start" poza |
| `#eq-k` Combo | ×(1 + 0,25 × (krok combo - 1)) minus lecące orby lodowe; w serii jej combo | etykieta "Combo" |
| `#eq-rop`, `#eq-r` Żyła | ×mods.regen | widoczne tylko, gdy karta Żyła esencji (`mods.regen ≠ 1`) |
| `#eq-e` Esencja | "+E" serii (G × Chciwość × Combo × Żyła), po wypłacie "+E" wypłaty, inaczej "+0" | |

Stany całego rzędu: `idle` (nic się nie dzieje: Groza i Esencja w 45% krycia), `chain` (trwa seria: Groza z fioletową ramką `--violet-lo` i poświatą `rgba(160,140,232,0.25)`), `paid` (1,6 s po wypłacie: pudełko Esencji z ramką `#a3263a` i poświatą `rgba(255,70,85,0.45)`). Zmiana wartości w trakcie serii/wypłaty: liczba "pyka" (skala 1,3 → 1 w 0,3 s, nie częściej niż co 220 ms na pudełko). Orb dolatujący do pudełka: błysk ramki w jego kolorze 0,22 s (`gHit`, `cHit`, `kHit`). Stuknięcie rzędu (albo Enter/spacja) otwiera okno "Skąd Esencja" i pauzuje trwającą falę. Zasady liczenia: sekcja 03.

### 2.4 Mapa (`#stage`)

Canvas `#cv` wypełnia `#stage`; `touch-action: none`. Na canvasie, w przestrzeni ekranu (nie świata):

- **Lista drużyny / chipy** (`p7_draw.js: drawChips`, `drawParty`, `drawNextWave`): w lewym górnym rogu (6, 6). Zwinięta (domyślnie): pasek wysokości 30 px, tło `rgba(10,11,13,0.8)`, rogi 3 px; chip co 25 px: krążek r 6,5 px w kolorze klasy z obwódką w kolorze poziomu (boss: `#ff8a3c` 2,4 px), ikona klasy 10,5 px `#1a1424`, poziom 8 px obok. W fali pod krążkiem pasek HP 18×3 px (zielony `#6fd38a`, czerwony `#ff6b6b` ≤35%, martwy `#6b5560`) i strachu 18×2 px (`#b48cff`), nad nim glif stanu (`heroGlyph`: † martwy, » uciekł/ucieka, ↑ wyszedł, ◆ niesie kryształ, ↓ pod lochem, # w klatce, z odpoczywa, ? zgubiony, ! panika, s sam). Na końcu "▾". Kolejność: żywi, potem czekający w kolejce (50% krycia), potem martwi i ci, co wyszli (40%). Rozwinięta (stuknięcie): w fali lista 108 px szeroka, wiersz 19 px (krążek, HP 48×5, strach 48×3, glif, poziom, przedmioty jako kreski 4×3, sakiewka "◉N", klątwa "✶", wiara kapłana). W budowie lista **następnej fali** (szer. 200 px, wiersz 15 px, nagłówek "Fala N/10[ · FINAŁ| · boss]:", wiersz "Imię · poz. L ranga · wraca/łowca/rekrut · boi się: X"). W budowie pod zwiniętymi chipami pigułka wyłomu `rgba(120,20,30,0.85)`: "WYŁOM!" (świeży) albo "WYŁOM otwarty". Stan zwinięcia zapamiętany (`UI.listOpen`).
- **Strzałki poza ekranem** (`drawOffscreen`): bohater poza kadrem = trójkąt w kolorze klasy z czarną obwódką przy krawędzi (12 px od brzegu), skierowany do niego.
- **Plakietka pauzy** (`drawPause`): na górze środka, wys. 24 px, tło `rgba(16,17,20,0.88)`, ramka `#5c4b28`, tekst `#e6cf94` 600 12 px: "Pauza · ▼ Budowa: gramy dalej" (pasek otwarty) albo "Pauza". Ukryta, gdy jest karta samouczka.
- Od 1.13 autoprzyspieszenie w ciszy działa też w trakcie narady drużyny, postoju przed groźnym pokojem i odpoczynku, gdy ktoś siedzi w zapadni i gdy wszyscy są w klatkach (decyzje autora; reguły w 7.10.3). W 1.12.1 było tam wyłączone (`sceneNow`), żeby scenki dało się czytać, ale wtedy przerwy ciągnęły się w zwykłym tempie.
- **Plakietka przyspieszenia** (`drawFF`): auto "▶▶ ×1,5 spokój" (92×22 px, fiolet `#b9a4ff`, Jersey 12) albo trzymany palec "▶▶ ×3" (76×24 px, mosiądz `#f2b94b`, Jersey 14).
- **Baner fali** (`#banner`, `showBanner`): na 34% wysokości mapy, "Fala N" Grenze 46 px z czerwoną poświatą + podpis 14 px ("3 bohaterów", "prowadzi ich czempion", "· wchodzą przez wyłom!"/"· wchodzą drzwiami") na pasie `rgba(6,7,9,0.86)` zanikającym na boki. Animacja 2,1 s: pojawia się do 12%, trzyma do 75%, znika; napis wjeżdża ze skali 1,5, rozstrzelenia 0,3 em i rozmycia 4 px do normy w 18%. Ukrywany po 2,2 s.
- **Coach** samouczka (rozdz. 8.2).

### 2.5 Szuflada budowy (`.drawer`)

**Przycisk ▼/▲ Budowa** (`#tray-toggle`, `#tray-label`): wyśrodkowany, wysokość rzędu 30 px, sam przycisk min. 132 px szer., padding 4/18/5 px, ramka `#5c4b28`, tło `#1b1914`, tekst `--gold-hi` 700 13,5 px. Wygląda tak samo w obu stanach, zmienia się tylko strzałka: rozwinięty "▼ Budowa", zwinięty "▲ Budowa" (1.06). Stuknięcie przełącza (`setTrayOpen(…, true)`); trafienie liczy się tylko na przycisku, nie na całym rzędzie (1.09).

Znaczenie stanu (`setTrayOpen`, `p6_loop.js: wantPitch`):

| Faza | Rozwinięty | Zwinięty |
|---|---|---|
| Budowa | widok budowy (wysoka izometria 55°) | podgląd widoku fali (izometria 2:1, 30°) |
| Fala | **pauza** + widok budowy; można stawiać (rozdz. 4) | gra trwa, widok fali |

Zasady: start fali zawsze zwija (`p3_flow.js: startWave`); start budowy rozwija według ostatniego wyboru gracza w budowie (`UI.trayBuild`) albo zawsze w samouczku. Rozwinięcie w fali pauzuje (`setPaused(true)`), liczy `stats.trayPauses` i (pierwsze 3 razy, poza samouczkiem) wołałoby podpowiedź (martwą w 1.12). Zwinięcie w fali wznawia grę, chyba że wisi karta samouczka. Dopóki pasek jest otwarty, `setPaused(false)` nie wznawia gry. Wyjście z aplikacji w trakcie fali rozwija pasek (gra czeka w pauzie).

**Animacja zwijania** (`trayTick`, `trayPaint`): wysokość ciała szuflady animowana w tym samym czasie co pochylenie kamery (`VIEW.dur` = 0,45 s) i tą samą krzywą smoothstep `t²(3-2t)`; odstęp szuflady (6 px) skaluje się razem. Mapa zajmuje to, co zostaje, a środek widoku mapy stoi w miejscu (rozdz. 5.7).

**Zakładki** (`#tabs`, `p1_config.js: TABS`): Pułapki, Potwory, Łup, Obiekty, Loch, Talia. Równe kolumny, tekst 12,5 px muted (11,5 ≤440 px, 10,5 ≤380, 9,5 ≤340); wybrana: `--ink`, delikatny gradient od dołu i biała kreska 2 px pod spodem (wjeżdża `scaleX` 0,2 s). Talia ma kolor `#d4b878` (wybrana `--gold-hi`). Zakładka, w której w obecnym etapie nauki nic nie ma, jest ukryta (1.12, `onbOk`). Wybrana zakładka i przewinięcie każdej zakładki są zapamiętane (`yatd-tab`, `trayScroll`).

**Pasek kafelków** (`#tray`): jeden rząd przewijany w bok, wysokość 64 px, odstęp 6 px, przyciąganie do początku kafelka (`scroll-snap: x proximity`), bez paska przewijania. Na krawędziach, za którymi jest jeszcze coś, maska zanikania 28 px (`trayFade`). Zmiana zakładki "rozdaje" kafelki: każdy wjeżdża z dołu (10 px, skala 0,94 → 1) w 0,24 s z opóźnieniem 24 ms × indeks (do 9), klasa zdejmowana po 700 ms.

**Anatomia kafelka** (`.item`, 74×60 px, `updateTray`):

| Część | Wygląd | Uwagi |
|---|---|---|
| ikona | SVG 22×22 z `ICONS[typ]` (`p8a_icons.js`, 53 ikony) z cieniem 1 px | lewa górna część rzędu `.top` |
| koszt | Jersey 12 px `--ess`, poprzedzony czerwonym rombem 6 px z poświatą | `costOf` (sekcja 03); tryby bez kosztu |
| nazwa | 12,5 px; nazwy od 9 znaków 11 px (`longnm`) | `ITEMS[t].name` |
| tag | 10,5 px muted; dla łupu kolor `LOOT_COLOR`, dla typów pokoi kolor `RT_INFO` | `ITEMS[t].tag` |
| kłódka | 11 px w prawym górnym rogu, `--dim` | gdy nieodblokowany |
| wybrany | ramka `--gold`, tło `--panel3`, wewnętrzna złota poświata, "pyknięcie" 1,08 → 1 w 0,22 s | `aria-pressed` |
| `off` | 40% krycia, saturacja 0,4 | zablokowany, nie w tej fazie albo za mało Esencji |
| narzędzie | ramka przerywana | zakładka Loch |
| `holding` | skala 0,96 | w trakcie przytrzymania |
| `nope` | drży 0,32 s (±4, ±4, ±2 px), tag zamienia się na powód w `#ff9a9a` na 1,5 s, wibracja 15 ms | patrz 4.5 |

**Zakładka Talia** (`renderDeckTiles`, kafelki 100 px, `.dslot`, górna ramka 3 px w kolorze rzadkości): najpierw kafelek **Sklep** (mosiądz; podpis "wróć do sklepu", "gratis: N" z pulsującą złotą obwódką, gdy są darmowe karty, albo "między falami"; w fali ukryty), potem po jednym kafelku na każde miejsce talii (tag = `u.tag` albo "rośnie: N", nazwa w 2 liniach; puste "wolne miejsce" przerywane), potem miejsca schowka (przerywane, 80% krycia, tag "schowek"; w fali ukryte). Stuknięcie karty otwiera okno karty (w fali pauzuje), stuknięcie schowka otwiera sklep.

**Podpowiedź kafelka** (`#tip`, `showTip`): przytrzymanie kafelka 380 ms (bez ruchu > 10 px) pokazuje płytę nad szufladą (dolna krawędź 6 px nad szufladą, szer. `min(440px, 100% - 32px)`, tło `#16181c`, górna ramka 2 px `#6b7079`, wjazd 0,16 s): nazwa Grenze 22 px + "N Esencji" w `--ess`, tag 11 px wersalikami, opis 14 px (`ITEMS[t].desc`), dla łupu "Każdy kolejny taki łup w lochu: +25% ceny (leży już: n, bazowo c).", dla zablokowanego czerwone "Zablokowany: odblokujesz go kartą ze sklepu.". Wibracja 12 ms. Puszczenie chowa podpowiedź, a koniec przytrzymania nie liczy się jako stuknięcie (`tipEat`). Zrzut: `03_tile_tip.png`.

### 2.6 Pasek akcji (`.actions`, `updateAction`)

| Przycisk | Rozmiar | Działanie |
|---|---|---|
| Menu `#btn-settings` (☰, SVG 22 px) | 48×48 px | otwiera Menu; w trwającej fali najpierw pauza |
| Cofnij `#btn-undo` (strzałka, odznaka z liczbą kroków) | 48×48 px | cofa ostatnią zmianę w budowie (stos 30 kroków: postawienie, ulepszenie, przeniesienie, zdjęcie, kopanie); wyłączony, gdy pusto albo poza budową; ukryty w fali |
| Główny `#btn-action` | `flex: 1`, min. 48 px wys., Grenze 700 21 px, podpis 11,5 px | patrz niżej |

Główny przycisk: tło krwiste (gradient `#ad2a34` → `--blood` → `#5a0f17`, ramka `#3a070c`, tekst `#f2ece2`).

| Faza | Napis | Podpis | Stan |
|---|---|---|---|
| Budowa | "Wypuść falę N" | "K bohaterów" + " · zostało E Esencji" (gdy E ≥ 6) | aktywny, pulsuje żarem 2,6 s (`ready`) → `startWave` |
| Fala, pauza z otwartym paskiem | "Pauza" | "zwiń ▼ Budowa: gramy" | wyłączony |
| Fala | "Fala trwa" | "przytrzymaj mapę: szybciej" | wyłączony (płyta `--panel2`, tekst muted) |
| Inaczej | "Koniec fali" | | wyłączony |

Przycisku pauzy nie ma od 1.07: pauzą jest otwarty pasek budowy.

### 2.7 Punkty przełamania (CSS)

| Warunek | Zmiany |
|---|---|
| szer. ≤ 440 px | `#h-mid` w kolumnie, `#h-best` 11 px, zakładki 11,5 px |
| szer. ≤ 380 px | etykiety HUD ukryte, `#h-score` 23 px, `#h-wave` 19 px, h1 38 px, zakładki 10,5 px, równanie ciaśniej |
| szer. ≤ 340 px | zakładki 9,5 px |
| wys. ≤ 720 px | ekrany: padding 10, nagłówek 24 px, wykres 46-48 px, sloty 29 px, mniejsze kafelki statystyk, ciekawostki w 1 linii |
| wys. ≤ 680 px | wykres 32 px, bez opisów ciekawostek i małych dopisków |
| wys. ≤ 600 px | wszystko o stopień ciaśniej, przycisk główny bez podpisu (19 px), sloty 26 px |
| maks. szer. `#app` | 560 px (tablet: wyśrodkowany) |

W Unity: Canvas Scaler z rozdzielczością referencyjną 390×844, dopasowanie do szerokości; te progi jako warianty układu.

## 3. Ekrany i okna

### 3.1 Mechanika okien (`openModal`, `closeModal`, `queueModal`)

- Jedno okno naraz. `queueModal` dokłada do kolejki, gdy coś jest otwarte; `closeModal` otwiera następne z kolejki, a gdy pusto, wykonuje `run.afterModals`.
- Otwarcie: `ff = false` (koniec przyspieszenia), chowa `#tip`. Gdy okno jest otwarte, czas gry stoi (`timeScale` = 0), mapa nie przyjmuje dotyku.
- Trzy oprawy: **karta** (`.card`, szer. `min(440px, 100%)`, nad przyciemnieniem radialnym `rgba(12,13,16,0.84)` → `rgba(2,2,3,0.95)`, wjazd 0,26 s z 10 px w górę); **ekran pełny** (`.card.screen` dla `wave`, `shop`, `end`: szer. `min(520px,100%)`, pełna wysokość, tło `--bg`, nic się nie przewija; części wjeżdżają kolejno co 0,05 s, wykresy rosną 0,6 s, karty sklepu "rozdawane" 0,34 s z obrotem -1,5°); **arkusz u góry** (`.overlay.top` dla `breach`: karta przy górnej krawędzi, maks. 48% wysokości, reszta mapy widoczna przez gradient).
- Ekrany pełne mają stały układ: nagłówek (`scrHead`: podtytuł wersalikami, tytuł Grenze 28 px, po prawej duża liczba Jersey 28 px `--ess` liczona od 0 w 900 ms z wygaszaniem sześciennym), ciało, stopka. Lista, która się nie mieści, gubi ostatnie wiersze i pisze "+N więcej" (`fitList`). Tekst karty w sklepie zmniejsza się do skutku (`fitText`: 13 → 10 px co 0,5 px, potem nazwa 13 px, potem interlinia 1,15).

### 3.2 Kolejność ekranów

| Moment | Okna (w kolejności) | Źródło |
|---|---|---|
| uruchomienie | start (za nim demonstracyjny loch, nigdy nie zapisywany) | `p8b_ui.js` boot |
| nowy run z nauki, runy 2-4 | karta etapu `onb` | `startGuided` |
| koniec fali | podsumowanie `wave` | `p3_flow.js: finishWave` |
| "Dalej" w podsumowaniu | brak kryształów: `over`; po wczytaniu przy wygranym finale: `victory`; inaczej budowa następnej fali i `shop`, potem nowy wyłom `breach` (fresh), potem w fali 2 `hungerTip` | `afterSummary`, `proceedToBuild` |
| koniec runu | (wersja web, pierwszy run na urządzeniu: `survey`) → `end` | `endRun`, `openModal` |

### 3.3 Start (`renderStart`, zrzut `01_start.png`)

Od góry: podtytuł "Prototype 1.13.4 · 10 fal i finał"; h1 "You are the dungeon"; akapit wstępu; rekordy (jeśli są: "Twój rekord: N Esencji zebranej w runie (ranga: X) · najdalej: fala F · wygrane: W z R."); pole "Kto testuje (opcjonalnie)" (tylko prototyp); przyciski; wiersz web (tylko prototyp); rozwijane **Jak grać** (17 akapitów w tablicy literalnej w `renderStart`, zasady całej gry, do przeniesienia jako tekst lokalizowany) i **Co nowego w Prototype 1.13.4** (97 wpisów dziennika zmian od v14 do 1.13.4, druga tablica w `renderStart`); przycisk "Ustawienia" (dźwięk, wibracje, skill checki).

Przyciski (`startbtns`; `onbStage()` z rozdz. 8.1; `sv` = zapisany run):

| Warunek | Przyciski (pierwszy jest główny, czerwony) |
|---|---|
| jest zapis | "Kontynuuj samouczek" (gdy zapis to samouczek w toku) albo "Kontynuuj run", podpis "fala N [zakończona] · zebrane E Esencji · zapisano dd.mm gg:mm"; pozostałe przyciski dostają " · zapisany run przepadnie" i przestają być główne |
| etap 1-4 | "Samouczek" / "Pierwszy run z przewodnikiem" (etap 1 i samouczek nieukończony) albo "Nowy run" / "Run N z 4: nazwa etapu" → `startGuided`; "Pomiń samouczek" / "Cała gra od razu" → etap 5 i `newRun(false)` |
| etap 5 | "Nowy run" / "Pełna gra" → `newRun(false)`; "Samouczek" / "Nauka od nowa: 4 runy, pierwszy z przewodnikiem" → etap 1, kasuje `yatd-coach` i `yatd-pops`, `startGuided` |

Zapisany run porzucony przez nowy z nauki po fali 5 liczy się jako rozegrany (`onbDone`). Zasady zapisu: sekcja 07.

### 3.4 Karta etapu nauki (`renderOnb`)

Podtytuł "Run s z 4 · nauka", tytuł "Nowe: nazwa", lista `ONB_STAGES[s].news`, notka "Następny run doda: …" albo "To już cała gra…", przycisk "Gramy". Opis etapów: rozdz. 8.

### 3.5 Menu (`renderMenu`)

Otwiera ☰; w trwającej fali najpierw pauza, a zamknięcie wznawia. Podtytuł "Fala N/10 · Esencja E" (albo "Menu"). Przyciski: "Wróć do gry" (główny); "Ustawienia" ("dźwięk, wibracje, pasek elementów, skill checki") → Ustawienia z powrotem do Menu; [tylko prototyp] "Ankieta", "Pełny ekran"/"Wyjdź z pełnego ekranu"; w trwającym runie "Zapisz i wyjdź" (podpis w fali "wrócisz do budowy przed tą falą", inaczej "wrócisz w tym miejscu") → start; gdy jest choć jedna fala: [tylko prototyp] "Pobierz wyniki" i "Zakończ run" (pierwsze stuknięcie zmienia napis na "Na pewno? Stuknij jeszcze raz", drugie → `quitRun`). Pod spodem notka stanu logów (tylko prototyp).

### 3.6 Ustawienia (`renderSettings`, `p1_config.js: GAME_SETTINGS`)

Działają od razu i zapisują się (`yatd12-settings`; w Unity PlayerPrefs). Przycisk "Gotowe" wraca do startu albo Menu.

| Klucz | Etykieta | Zakres / krok | Domyślnie | Format |
|---|---|---|---|---|
| `volume` | Głośność efektów | 0-1 / 0,1 | 0,6 | % |
| `music` | Muzyka | 0-1 / 0,1 | 0,5 | %, 0 = "wyłączona" |
| `haptics` | Wibracje (telefony z Androidem) | przełącznik | 1 | |
| `series` | Seria: jeden skill check na kilka pułapek naraz | przełącznik | 1 | |
| `split` | Dziel ekran, gdy drużyna rozejdzie się za daleko | przełącznik | 1 | |
| `checkDiff` | Trudność skill checków | 0,6-1,8 / 0,1 | 1 | ×1,0 |
| `autoFF` | Auto-przyspieszenie, gdy nic się nie dzieje (1 = wyłączone) | 1-4 / 0,5 | 1,5 | ×1,5 |
| `ffSpeed` | Przyspieszenie (przytrzymanie palca) | 2-6 / 0,5 | 3 | ×3,0 |
| `topPad` | Odstęp od góry ekranu | 0-48 / 4 | 0 | "+N px" / "auto" (tylko prototyp) |

Suwak: etykieta muted 13,5 px + wartość Jersey po prawej, kolor akcentu `--gold`; przełącznik 20×20.

### 3.7 Ustawienia testowe (`renderTests`, tylko prototyp)

Suwaki balansu `SLIDERS` (19 pozycji, `p1_config.js`) i "Przywróć domyślne". W 1.12 **nieosiągalne** z UI (nic nie otwiera typu `tests`). Unity: menu debug / ScriptableObject z balansem.

### 3.8 Podsumowanie fali (`renderWave`, `waveDetails`, zrzut `07_summary.png`)

Nagłówek: podtytuł "Fala N/10 · m:ss", tytuł "Zwycięstwo!" / "Kryształ skradziony" / "Serce zjadło kryształ" / "Fala odparta", duża liczba "+E" "Esencji z fali". Zwycięska karta ma tło `#1c1a16` i złotą ramkę (`.vic`).

Widok główny (ciało):

1. Cztery kafelki statystyk (`statrow`): "masz Esencji" (czerwony), serce ("♥ N" "serce syte" zielony / "zjadło kryształ" różowy, albo "-" "głód od fali 2"), "k/max" "kryształy", "zabici · przestr.".
2. **Rozliczenie** (`reck`, 12,5 px, części wjeżdżają po 0,45 / 0,8 / 1,15 s): "Groza G × m = E", "♥ -N" albo "♥ za mało: -X · kryształ", "dla Ciebie +Y (+P po fali)".
3. Panel "Esencja z fal" (prawy dopisek "kreska: porcja serca"): wykres `waveChart` z miejscem na każdą z 10 fal (przyszłe przerywane), słupek gradient `--ess-hi`→`--ess`→`--ess-lo`, fala ze stratą szara, różowa kreska 2 px = porcja serca, bieżąca fala pełne krycie z poświatą i wartością u stopy słupka (Jersey 11,5 px biały z cieniem), numery fal pod spodem.
4. 2-3 **ciekawostki** (`waveFun`): "Ulubiona pułapka" (zawsze pierwsza, gdy jest), losowo z: "Zabójca fali", "Cichy zabójca/pomocnik", "MVP bohaterów", "Najbardziej przerażony", "Najwyższe combo", "Krytyki", "Zgubieni", "Rozbrojone", "Łup". Etykieta mosiądz 9,5 px wersalikami, wartość 13,5 px, opis 11 px w 2 liniach.
5. Panel **następnej drużyny** "Fala N: k bohaterów, poz. a-b" (prawy dopisek: gildia albo "serce chce X"), wiersze `nextRow`: krążek 26 px z ikoną klasy, imię w kolorze klasy, "Klasa L", plakietki (przepowiednia/czempion mosiądz, charakter, sakiewka łowcy, ↺ powracający fiolet, rekrut), po prawej ikony ekwipunku (`ITEM_GLYPH`, 14 px, z liczbą ładunków), druga linia: umiejętność klasy · "słaby: …" (`#ffb35c`) · "boi się: …" · "? ciało/fobia" (`--dim`). Stuknięcie wiersza otwiera kartę bohatera, a "Wróć" wraca do podsumowania.

Stopka: przy zwycięstwie "Graj dalej" (fale bez końca) i "Zakończ: zwycięstwo"; inaczej "Dalej: sklep przed falą N+1" (albo "Dalej", gdy nie ma kryształów) z podpisem "darmowe karty: k[ (legendarna w ofercie)]". Pod spodem rząd małych przycisków: "Szczegóły" / "‹ Wróć", "Pobierz wyniki" (tylko prototyp), "Zapisz i wyjdź", "Zakończ run" (dwa stuknięcia: "Na pewno?"), oraz notka stanu logów (tylko prototyp).

Widok **Szczegóły**: panel "Skąd Esencja" (prawy dopisek "Groza G × średnio m") z paskiem źródeł 12 px (kolory: Rany `#ff8a7a`, Strach `#c3b2ff`, Ucieczki `#8a6fe0`, Zabici `#d8434f`, Łup `#f2b94b`, Combo `#a9d4da`, Inne `#7d7590`) i legendą 4 największych; zakładki (`seg`, jak zakładki paska): **Co dalej** (lista punktów z rombami: serce, fala następna, gildia, głód, Esencja po fali, plotki, opowieści o skarbach, zabrany łup, co gildia słyszy o chciwości, wyłom, przygotowania, budowle, błądzenie, przedmioty, wiara, saperzy, ranga), **Bohaterowie** (ikona, imię, klasa, los: zginął czerwony, wyniósł kryształ pomarańczowy, uciekł ze strachu fiolet, wyszedł szary), **Elementy** (nazwa, pasek, "E · n traf."), **Liczby** (siatka 2 kolumn: krytyk/draśnięcie/pudło, ciosy z pamięci, najwyższe combo, łup zobaczony/zabrany, rozbrojone/odczynione, plotki, zapadnie/klatki, serce/dla Ciebie, czas/przyspieszenie).

### 3.9 Sklep (`renderShop`, zrzut `08_shop.png`)

Otwiera się na początku każdej budowy od fali 2 (po podsumowaniu) i z kafelka Sklep w Talii (tylko w budowie). Zasady zakupów, cen, schowka i odświeżania: sekcja 03.

- Nagłówek: "Przed falą N", "Sklep", duża liczba = Esencja, podpis "Esencji · darmowe: k".
- **Cztery oferty** w siatce 2×2, zawsze na tych samych miejscach (`.offer`): górna ramka 4 px w kolorze rzadkości (odblokowanie fiolet), linia rodzaju 10 px wersalikami ("odblokowanie", "zwykła · w talii 1", "rzadka · od razu"…), nazwa 14,5 px, opis 12 px `#c4c2bc` z podpowiedzią dopasowania ("Pasuje do Twojego lochu." `#9fd7a0` albo "Brak w lochu: …" `#e0a0a6`, `cardFit`), przycisk kupna (24 px wys., czerwony gradient `#ff7480`→`#d8313f`→`#8e1622`): "Weź za darmo" / "Kup za p Esencji" / wyłączone "Za mało (p)". Kupiona oferta: przerywana, 35% krycia, "Kupione" Grenze 20 px. Za droga: tekst w 60% krycia.
- **Arkusz karty** (`.sheet`, nad ofertami, reszta ekranu się nie rusza): po stuknięciu miejsca talii/schowka; "w talii · rzadkość" albo "w schowku (nie działa) · …", nazwa Grenze 24 px, opis 14 px, przyciski "Do schowka" / "Do talii", "Sprzedaj +s" (drugie stuknięcie "Na pewno? +s", czerwona ramka), "×" (32 px) zamyka.
- Rząd akcji (`.acts`, siatka 3 kolumn): "Odśwież" (koszt "N Esencji" na czerwono albo "gratis") i "Za reklamę" ("odśwież raz" / "już użyte"). Trzecia kolumna pusta.
- Panel "Talia d/rozmiar" (prawy dopisek "schowek s/pojemność (nie działa)"): siatka 4 kolumn slotów 34 px wysokości, górna ramka 3 px w kolorze rzadkości, schowek przerywany, puste "wolne"/"schowek"; wybrany slot ma złotą obwódkę. Nazwa w slocie zmniejsza się do 9 px zamiast ucinać (`fitSlot`).
- Stopka: "Do budowy fali N" z podpisem "darmowe karty poczekają: k" albo "sklep: pierwszy kafelek w Talii" → zamyka.

Komunikaty po akcji (`m.msg`: "W talii: X.", "Za mało Esencji…", "Nowa oferta."…) idą do `setHint`, który w 1.12 nic nie robi (rozdz. 10).

### 3.10 Koniec przegranej fali (`renderOver`)

Karta: "Serce lochu gaśnie", tytuł "Serce zjadło ostatni kryształ" albo "Ostatni kryształ wyniesiony", opis z informacją o reklamie. Raz na run: "Kontynuuj z 1 kryształem" (symulacja reklamy: "Reklama... 3/2/1" co 700 ms, potem 1 kryształ i budowa) oraz "Zakończ run". W Unity: prawdziwa reklama nagradzana (monetyzacja, sekcja 03).

### 3.11 Zwycięstwo po wczytaniu (`renderVictory`)

"Fala 10/10 odparta", "Zwycięstwo!", opis (Esencja, ranga, kryształy), notka o falach bez końca; "Graj dalej" / "Zakończ: zwycięstwo".

### 3.12 Koniec runu (`renderEnd`)

Ekran pełny: "Koniec runu · m:ss", tytuł "Zwycięstwo" / "Run przerwany" / "Loch upadł", duża liczba = Esencja w runie. Ciało: powód (+ fale bez końca), pigułka "Ranga: X" z "następna: Y od Z" i ewentualnie zielone "Nowy rekord!", kafelki (utrzymane fale z polską odmianą `plural`, zabici, przestraszeni, zjedzone kryształy), wykres "Esencja z fal" ("szare: stracony kryształ"), panel "Najlepsze elementy runu" (5 z paskami) + talia + rekordy. Stopka: "Jeszcze raz" (główny; od 1.12.1 w etapach 1-4 `startGuided()`, potem `newRun(false)`), "Menu" (start), "Pobierz wyniki tego runu (.json)" (tylko prototyp). Rekordy urządzenia aktualizują się raz (`yatd15-records`).

### 3.13 Ankieta (`renderSurvey`, tylko prototyp)

Przed pierwszym ekranem końca runu w wersji web: 5 pytań z przyciskami (`SURVEY`) + pole tekstowe, "Wyślij" / "Pomiń ankietę". Unity: pomiń (ewentualnie link do formularza).

### 3.14 Karta bohatera (`renderHero`, zrzut `09_hero_card.png`)

Otwiera: stuknięcie figury w fali, wiersz listy drużyny, wiersz następnej fali. W fali gra się pauzuje i wznawia po zamknięciu. Podtytuł "Klasa · poz. L ranga[ · powracający][ · łowca skarbów][ · rekrut]", imię Grenze w kolorze klasy, kafelki: HP "h/max" (różowy < 35%), strach "%" "strach z N odwagi" (różowy > 60%), wiara kapłana albo liczba przedmiotów; lista: Teraz (stan żywego), Charakter, Umie, Klasa (odporności), Łowca skarbów, Ciało, Fobia (albo "nie wiadomo"), Blizna, Trauma; "Ekwipunek" (lista z mocą, ładunkami, odnowieniem; sakwa); "Ta fala" (rany wg typów, 4 największe źródła strachu); notka o odkrywaniu ciała i fobii; przycisk "Zamknij" albo "Wróć". Treść: sekcje 04 i 06.

### 3.15 Karta elementu (`renderItem`)

Element (sub "Pułapka · poziom l z 3"), co zrobił w ostatniej fali, opis, moc, typ pokoju, przyciski "Ulepsz do poziomu N", "Przenieś", "Zdejmij", "Zamknij". **W 1.12 nieosiągalna** (stuknięcie elementu go podnosi, rozdz. 4.2). Nie trzeba jej robić w Unity, chyba że jako okno pomocy.

### 3.16 Karta talii (`renderCard`)

Z zakładki Talia. "Rzadkość karta · talia d z s", nazwa w kolorze `RAR_COLOR`, opis, kopie, licznik rosnący. W budowie: "Do schowka" ("nie działa, czeka" / "schowek pełny"), "Sprzedaj" (dwa stuknięcia), "Zamknij"; w fali tylko notka "Karty sprzedajesz tylko między falami." i "Zamknij" (otwarcie w fali pauzuje).

### 3.17 Wyłom (`renderBreach`, arkusz u góry)

Otwiera: stuknięcie wyłomu w budowie (≤1,1 pola, nic nie wybrane) albo automatycznie przy nowym wyłomie. Kamera centruje wyłom i przesuwa go niżej (`cam.oy -= ch*0.18`), żeby był widoczny pod arkuszem, oraz uruchamia "ping" (rozdz. 6.13). Treść: "Wyłom · od fali N · na mapie poniżej", "Nowy wyłom!" / "Wyłom w ścianie", opis, "Załataj wyłom" (20 Esencji, wyłączony z "(masz N)"), "Zostaw" ("niech wybierają"). Mapa pod arkuszem nie przyjmuje stuknięć.

### 3.18 Głód serca (`renderHungerTip`)

Raz na run na początku budowy fali 2 (po sklepie): "Fala 2", "Serce jest głodne", akapit z porcją, 4 punkty, "Rozumiem".

### 3.19 Skąd Esencja (`renderEsencja`)

Ze stuknięcia równania (w fali pauzuje). Wzór i objaśnienie, "Groza: co przeżywają bohaterowie" z tabelą wag `GZ`, "Chciwość ×c" z listą dodatków, "Combo ×k" z zasadą (okno combo, +12% na stopień), w fali/podsumowaniu "W tej fali" (źródła i suma). Treść liczb: sekcja 03.

### 3.19a Wieści z karczmy (`renderNews`, od 1.12.1)

Stuknięcie w "Fala X/10" w budowie (`#h-wave`) otwiera kartę: podtytuł "Wieści z karczmy", nagłówek = nazwa fali (`waveName()`), akapity = zdania z `waveHint()` (liczba i poziom bohaterów, boss, głód serca w tej fali, wyłom, gildia, plotki), przycisk "Zamknij" (`#news-close`). Zastępuje dawny komunikat u góry ekranu.

### 3.20 Martwe okna

`upgrade` (`renderUpgrade`, `renderPickSection`, `takeCard`, `renderReplace`, `cardBtn`: stary wybór 1 z 3 kart) nie jest otwierany przez nic w 1.12 (karty wybiera się w sklepie). Nie przenosić.

## 4. Sterowanie

### 4.1 Gesty na mapie (`p8b_ui.js`: zdarzenia `pointerdown/move/up` na `#cv`)

| Gest | Próg | Budowa | Fala |
|---|---|---|---|
| stuknięcie | ruch ≤ 8 px | `handleTap` (4.2) | odpowiedź na check (4.3) albo karta bohatera |
| dwa stuknięcia | ten sam element w < 380 ms (`DOUBLE_TAP_MS`) | ulepszenie (`tapUpgrade`) | - |
| przytrzymanie | 550 ms bez ruchu (`HOLD_DEL`) na elemencie albo meblu | zdjęcie z refundacją (`holdRemove`) | - |
| przytrzymanie | 280 ms bez ruchu, brak pauzy | - | przyspieszenie ×`S.ffSpeed` (3) do puszczenia palca |
| przeciągnięcie | ruch > 8 px | przesuwa kamerę | przesuwa kamerę, przejmuje ją na 4 s (5.5) |
| dwa palce | | przybliżanie (pinch), kamera ręczna 5 s | to samo, kończy przyspieszenie |
| kółko myszy (tylko prototyp) | ×1,15 na ząbek | przybliżanie | przybliżanie |

Stuknięcie w prostokąt listy drużyny (`uiRects.list`) zwija/rozwija ją; przy rozwiniętej stuknięcie wiersza otwiera kartę bohatera (w fali z pauzą).

**Celowanie w izometrii** (`tapWorld`): punkt podłogi pod palcem jest domyślny, ale to, co stoi (pułapka, potwór, mebel) albo wisi na ścianie, rysuje się nad swoim polem, więc stuknięcie w jego obrazek liczy się jak stuknięcie w jego pole. Dla pól od (gx-1, gy-1) do (gx+3, gy+3) sprawdza prostokąty wokół rzutu: rzecz stojąca w (x+0,5, y+0,5, z 0,42) półwymiary 0,4T × 0,55T; rzecz ścienna w swoim punkcie ściany 0,42T × 0,42T; mebel (z 0,4) 0,42T × 0,5T; gdy w ręce jest pułapka ścienna, także lico ściany, na której można ją postawić (0,5T). Wygrywa najbliższy kamerze (głębokość x+y z premią: ścienna +1,2, ściana +1,1, stojąca +1, mebel +0,9), przy remisie najbliższy środek. Przy podzielonym ekranie używa kamery połówki pod palcem (`withTapCam`).

**Bohater pod palcem** (`heroAtScreen`): odległość palca od pionowego odcinka figury (stopy do czubka głowy) < `max(22, 0,45 × wysokość figury)`, najbliższy wygrywa.

W Unity: Input System (Enhanced Touch), własna maszyna stanów gestu z tymi samymi progami w dp; jedna klasa gestu na mapę, osobne zdarzenia UI dla przycisków.

### 4.2 Budowa: co robi stuknięcie (`handleTap`, `buildTap`, `tryPlace`)

Kolejność rozstrzygania:

1. Dwa szybkie stuknięcia w ten sam element: odłóż go (jeśli był w ręce) i ulepsz (`tapUpgrade`, koszt i wynik jako notka przy polu).
2. Coś jest w ręce (`movingKey` element albo `movingObj` mebel):
   - stuknięcie tego samego pola: odłóż;
   - stuknięcie innego elementu: podnieś tamten;
   - stuknięcie miejsca, gdzie element pasuje (najbliższe dozwolone pole w promieniu 1 od palca, `moveTarget`): przenieś za darmo (poziom zostaje, "pyk" i kurz w obu miejscach, napis "Przeniesione");
   - mebel: tylko wolna podłoga pokoju, nie przy drzwiach ani sercu, pokój zostaje spójny (`objTargetOk`); to, co na nim stoi (proch, mimik, pozytywka), jedzie razem;
   - inaczej notka "Tu nie pasuje".
3. Wybrane narzędzie (zakładka Loch) i stuknięcie przy jego znaczniku (< 0,7 pola): narzędzie (krok 5).
4. Stuknięcie elementu: podnieś go. Element w ręce pulsuje fioletową ramką, a wszystkie pola, gdzie może trafić, mają przerywane fioletowe ramki (rozdz. 6.13), nad nim koszt ulepszenia.
5. Wybrany kafelek i wolne pasujące pole w promieniu 1 od palca (`snapTile`): postaw (`tryPlace`). Wybrane narzędzie: najbliższy znacznik w promieniu 1,8 (`applyTool`).
6. Bez wyboru: element obok palca (≤ 0,85 pola, `itemAt`) albo mebel → podnieś. Stuknięcie wyłomu (≤ 1,1 pola, nic nie wybrane) → arkusz wyłomu.

Postawienie: "pyk" (skala 0,55 → 1 z przestrzeleniem w 0,34 s, `popK`), kurz (7 szarych drobin + pierścień 0,15 → 0,85 pola w 0,32 s, `dustAt`), zasięg pułapki jaśniejszy przez 1,4 s (`preview`). Reguły dozwolonych miejsc: sekcja 07.

Wybór kafelka (`updateTray`, kliknięcie): kafelek trybu (Ulepsz/Przenieś) poza budową → nope "między falami"; zablokowany → "zablokowane"; narzędzie lub obiekt budowany w fali → "między falami"; za mało Esencji → "za mało Esencji"; inaczej przełącza wybór (wybór kafelka odkłada to, co w ręce).

### 4.3 Fala: check, przyspieszenie, bohater

- **Odpowiedź na skill check**: dotknięcie **w dowolnym miejscu mapy** (canvasu), gdy check czeka na odpowiedź i gra nie stoi, rozstrzyga go w chwili dotknięcia (`resolveCheck` na `pointerdown`, nie na puszczeniu). W fazie "Uwaga!" (pierwsze 0,5 s) dotknięcie jest pochłaniane i nic nie robi. Gest, który odpowiedział, jest oznaczony jako obsłużony: dalej może tylko przesuwać kamerę, nie otworzy karty bohatera ani nie postawi elementu. Przyciski, pasek i HUD nigdy nie odpowiadają na check.
- **Przytrzymanie** (280 ms): przyspieszenie, dopóki palec leży; w tym czasie nie ma nowych checków, a pułapki biją same (sekcja 05). Ruch palca po starcie przyspieszenia go nie przerywa; puszczenie albo drugi palec kończy. Plakietka "▶▶ ×3".
- **Stuknięcie bohatera**: pauza i karta bohatera.
- **Stawianie w fali** (tylko przy otwartym pasku, czyli w pauzie): pułapki, potwory i łup z paska (nie narzędzia, nie obiekty budowane, nie tryby), z tymi samymi regułami miejsca (sekcja 07).

### 4.4 Co jest zablokowane

| Sytuacja | Skutek |
|---|---|
| check czeka na odpowiedź | czas gry ×0,25 (`CHECK_SLOW`); nie startuje przytrzymanie-przyspieszenie; stuknięcie odpowiada na check zamiast działać normalnie |
| pauza (otwarty pasek, karta samouczka, okno) | czas gry stoi; licznik checku stoi (`t0` przesuwany o czas realny), dotyk na mapie nie odpowiada na check |
| okno otwarte | mapa nie przyjmuje dotyku; przyspieszenie się kończy |
| karta samouczka (TUT_POP) | gra stoi, klawisz P nie przełącza paska, check czeka pod kartą |

### 4.5 Komunikaty w 1.12: notka przy polu i "nope" na kafelku

Od 1.12 nie ma podpowiedzi u góry ekranu. `setHint(t)` jest pustą funkcją (`p8b_ui.js: setHint`), zostawioną dla starych wywołań.

- **Notka** (`note(t, x, y)`): krótki napis w miejscu stuknięcia (pole z argumentów albo ostatnio stuknięte `lastTapT`), kolor `#ffc2b8`, rozmiar 13, unosi się jak inne liczby (6.10), znacznik `note`, więc nowa notka w tym samym miejscu zastępuje starą. Teksty: "Nie ulepsza się", "Poziom 3 to maks", "Za mało Esencji (c)", "Poziom N[: cecha]", "Tu nie pasuje", "Zablokowane", "Za mało Esencji", "Tylko między falami", "Tylko w pokoju", "Już stoi w tym pokoju", "Zablokuje przejście", "Pokój pełny (n)" / "Korytarz pełny (n)".
- **Nope** (`nope(b, t)`): kafelek w pasku drży i na 1,5 s pokazuje powód zamiast tagu (4.2).

W Unity: nie odtwarzać `setHint` ani toastu (rozdz. 10).

### 4.6 Haptyka (`p6_loop.js: buzz`, tylko gdy `S.haptics`)

| Wzór (ms) | Kiedy | Źródło |
|---|---|---|
| 12 | pokazanie podpowiedzi kafelka | `showTip` |
| 15 | nope na kafelku | `nope` |
| 30 | zdjęcie elementu przytrzymaniem | `holdRemove` |
| 25 | krytyk w checku | `resolveCheck` |
| 14 | śmierć bohatera | `p3_flow.js: kill` |
| 70 | kradzież kryształu przy sercu | `takeCrystal` |
| [90, 60, 90] | kryształ wyniesiony z lochu | `p3_flow.js: heroExit` |

Unity: `Handheld.Vibrate` jest za długie; użyj natywnego `Vibrator.vibrate(ms)`/`VibrationEffect` przez JNI (Android), z tymi czasami.

### 4.7 Klawiatura (tylko prototyp)

Spacja: odpowiedź na check; P: zwiń/rozwiń pasek w fali (nie przy karcie samouczka); F trzymane: przyspieszenie; Esc: odłóż wybór i to, co w ręce; Ctrl/Cmd+Z: cofnij w budowie. Unity: opcjonalnie skróty w edytorze do testów.

### 4.8 Wyjście z aplikacji

`visibilitychange` (ukrycie karty) w fali: rozwija pasek (pauza); muzyka i AudioContext są zawieszane i wznawiane. Unity: `OnApplicationPause(true)` w fali = otwarcie paska, wstrzymanie audio.

## 5. Kamera i rzutowanie (`p6_loop.js`)

### 5.1 Rzut izometryczny

Loch jest obrócony o 45° (północny zachód na górze ekranu) i pochylony o kąt `pitch`. Świat: x, y w polach (pole = kwadrat 1×1), z = wysokość w polach. "Jednostki widoku" (view units):

```
R2 = √½ ≈ 0,7071;  SP = sin(pitch);  CP = cos(pitch);  HM = 1,25   (zapas nad górnym rzędem na ściany i figury)
vX(x, y)    = (x - y + WH) * R2
vY(x, y, z) = (x + y) * R2 * SP + (HM - z) * CP
ekran:  W2S(x, y, z) = [ vX * cam.s - cam.ox,  vY * cam.s - cam.oy ]       (px CSS względem lewego górnego rogu mapy)
odwrotnie (z = 0): fromView(u, v): a = u/R2 - WH, b = (v - HM*CP)/(R2*SP), x = (a + b)/2, y = (b - a)/2
toWorld(sx, sy) = fromView((sx + ox)/s, (sy + oy)/s)   (w podzielonym ekranie kamera połówki)
viewW = (WW + WH) * R2;  viewH = (WW + WH) * R2 * SP + HM * CP
```

Źródło: `vX`, `vY`, `fromView`, `W2S`, `toWorld`, `viewW`, `viewH`. Głębokość rysowania = x + y (większe = bliżej kamery, rysowane później).

**Odpowiednik w Unity (kamera ortograficzna 3D)**: pozycja w Unity = (x, z, -y) (X = x, Y = wysokość, Z = -y), kamera ortograficzna o obrocie `Euler(pitch, -45°, 0)`. Taki rzut daje dokładnie powyższe wzory (oś "w prawo" kamery = (1, 0, 1)/√2, "w dół" = (SP/√2, -CP, -SP/√2)). `orthographicSize = wysokość_widocznej_mapy_px / (2 * cam.s)`. Kolejność głębi z bufora głębi zgadza się z sortowaniem x + y. Figury (sprite'y) zwrócone do kamery.

### 5.2 Dwa widoki i przejście

| Stała | Wartość | Znaczenie |
|---|---|---|
| `PITCH_BUILD` | 55° | widok budowy: wysoka izometria (pasek rozwinięty) |
| `PITCH_RAID` | 30° | widok fali i jego podgląd: izometria 2:1 (sin 30° = 0,5, romb pola 2:1) |
| `VIEW.dur` | 0,45 s | czas przejścia |

`wantPitch()`: brak runu albo pasek otwarty → 55°, inaczej 30°. `viewTick`: przy zmianie celu interpolacja kąta krzywą smoothstep `e = t²(3 - 2t)`, a w każdej klatce kamera wraca na ten sam punkt podłogi w środku widoku (`camCentre` przed zmianą, `centerOn` po niej), więc zmienia się tylko nachylenie, kierunki zostają. Przejście do widoku budowy kasuje podział ekranu. Pasek budowy zwija się w tym samym czasie i tą samą krzywą (2.5). Zrzuty: `02_build_tray.png` (55°) i `04_build_folded.png` (30°).

### 5.3 Skala i przybliżanie

| Wzór / stała | Wartość | Źródło |
|---|---|---|
| `fitScale` | `min(cw / viewW, ch / viewH)` (cały loch na mapie) | `fitScale` |
| `buildScale` | `clamp(cw / 10,5, fitScale, 44)`: ok. 10,5 jednostki widoku na szerokość mapy | `buildScale` |
| `MAX_S` | 56 px na jednostkę | `zoomAt` |
| zakres przybliżania | od `0,95 × fitScale` do 56 | `zoomAt` (przybliża wokół punktu pod palcami/kursorem) |
| ograniczenie przesuwu | gdy mapa mniejsza niż ekran: wyśrodkowana; inaczej `ox ∈ [-0,3 cw, mw - 0,7 cw]`, `oy ∈ [-0,3 ch, mh - 0,7 ch]` | `clampCam` |

Start budowy: `cam.s = buildScale`, środek między wejściem a sercem (`p3_flow.js: startBuild`). W budowie kamera jest tylko ręczna.

### 5.4 Fala: kamera za drużyną (`autoCam`)

Działa tylko w fali, gdy nie ma pauzy, pasek jest zwinięty i nie ma ręcznego przejęcia.

1. Punkty: pozycje żywych bohaterów (w `vX`, `vY` z z = 0,5) + pułapka trwającego checku; bez bohaterów: wejście.
2. Prostokąt z marginesem m = 3,2 (pion m × 0,8): `bw = szer + 2m`, `bh = wys + 1,6m`.
3. Docelowa skala `ts = clamp(min(cw / bw, (ch - ins) / bh), fitScale, 34)`, gdzie `ins = coachInset` (wysokość coacha u góry mapy; drużyna jest kadrowana pod nim, środek pionowy `hc = ins + (ch - ins)/2`).
4. Wygładzanie: `k = 1 - exp(-rdt × 2,6)` dla skali i środka.
5. Po przeliczeniu kamera trzyma loch w kadrze z zapasem 0,6 jednostki zamiast pokazywać pustkę (`pad`).
6. Podział ekranu (5.5).

**Ręczne przejęcie**: przeciągnięcie ustawia `cam.manualUntil = realNow + 4`, pinch i kółko `+ 5`. W tym czasie kamera nie podąża, a podział ekranu gaśnie (`SPLIT.k -= 3/s`). Start fali i budowy zeruje przejęcie.

### 5.5 Podzielony ekran (`splitCam`, `splitViews`, `SPLIT`)

Pomysł autora (jak w grach LEGO): gdy drużyna rozejdzie się tak, że nie mieści się na ekranie w czytelnej skali, linia przez środek ekranu (prostopadła do kierunku między grupami) dzieli go na dwie połówki, każda z własną kamerą.

- **Warunek** (`want`): ustawienie `split` ≠ 0, ≥ 2 żywych i widocznych bohaterów, `fitScale < SPLIT_T` (cały loch nie mieści się w 16 px na jednostkę) i skala potrzebna, żeby zmieścić wszystkich, `< SPLIT_T` (16) (×1,12 histerezy, gdy już podzielony).
- **Grupy**: k-średnie na 2 grupy, 4 rundy, start od poprzednich środków albo od dwóch najdalszych bohaterów. Pułapka trwającego checku dołącza do bliższej grupy.
- **Kąt** linii: kierunek między środkami grup; po podziale obraca się najwyżej 2,4 rad/s.
- **Kamery połówek**: każda kadruje swoją grupę w swoim wielokącie (margines 2,2, 0,9 dopasowania), wspólna skala `clamp(min(s0, s1), fitScale, 34)`, wygładzanie `1 - exp(-rdt × 3)`.
- **Wejście/wyjście**: `SPLIT.k` rośnie/maleje o 2/s; połówki płynnie przechodzą od kamery głównej (smoothstep `k²(3-2k)`). Przy k ≤ 0 stan się kasuje.
- **Rysowanie**: świat i dymki rysowane dwa razy z przycięciem do wielokątów (`withViews`), potem **żelazna belka** wzdłuż cięcia (`drawDivider`, krycie = postęp): linie 10 px `rgba(0,0,0,0.6)`, 6 px `#464b53`, 4 px `#1d1f24`, 1 px `rgba(230,225,214,0.35)`. Orby celują w połówkę bohatera, z którego lecą (`heroScreen`, `tileScreen`). Dotyk używa kamery połówki pod palcem.
- Budowa i pauza: zawsze jeden ekran.

W Unity: dwie kamery z maską (stencil albo render textures przycięte wielokątem) albo jedna kamera i dwa przebiegi z `GL`/maską; belka jako UI.

### 5.6 Wstrząs (`shake`)

Przesunięcie świata o losowe ±9 px × `shake` w obu osiach (`(rand - 0,5) × shake × 18`), zanik liniowy 1/s. Wartości: krytyk 0,22, kradzież kryształu 0,2, kryształ wyniesiony 0,3, proch 0,35, ogr 0,2, krata 0,12, trumna 0,08, alarm wabika 0,18, rozbita skrzynia 0,12, gniew bossa 0,25, pozostałe w sekcji 05.

### 5.7 Wysokość mapy a pasek (`resize`, `trayCover`)

Canvas jest tak wysoki, jak mapa przy zwiniętym pasku (`rect.height + trayCover`); otwarty albo ruszający się pasek zasłania jego dół (stage przycina). `ch` = widoczna wysokość. Przy każdej zmianie rozmiaru środek widocznej części mapy zostaje w tym samym punkcie świata. Gęstość pikseli canvasu najwyżej ×2 (`DPR = min(2, devicePixelRatio)`). W Unity: prostokąt widoku kamery (`Camera.pixelRect`) = widoczna część mapy, aktualizowany co klatkę w trakcie animacji paska, ze stałym punktem środkowym.

## 6. Rendering świata (`p7_draw.js`)

### 6.1 Kolejność warstw (`draw`, `drawWorld`)

`draw()`: wyczyść `#060709`; dla każdego widoku (1 albo 2 połówki): `drawWorld`, (tylko bez podziału) `drawOffscreen` (lista drużyny/następnej fali, strzałki), `drawBubbles`; belka podziału; `drawOrbs` (osobny canvas `#fx` nad całą stroną); `drawCheck`; `drawPause`; `drawFF`.

`drawWorld` (świat przesunięty o wstrząs):

1. **Podłoga** (rzut podłogi `floorT`, rysowanie w pikselach pola): kafelki (`drawTileLayer`) → światło pochodni → typy pokoi → strefy (`fl.zones`, `rgba(160,190,255,0.18)`) → w fali mapa zagrożenia (`fl.danger` ≥ 0,4: `rgba(255,80,80, min(0,22, d×0,05))`) → w budowie zasięgi pułapek i plotki → poświata serca → rzeczy płaskie (sieć, zapadnia, otwarta klatka, rozbita budowla) z "pykiem" → znaki stanu na polach (6.5) → mgła wiedzy (fala/podsumowanie) → znaczniki miejsc / przenoszenia → pierścień przytrzymania → znacznik wyłomu (budowa) → zakłócone pola (fiolet `rgba(150,100,255,0.38)`) → cel samouczka → efekty pól i linii → pierścienie cząsteczek.
2. **Ściany**: najpierw "wargi" (ściany położone płasko) i rzeczy na nich, potem stojące bloki posortowane po głębokości.
3. **Rzeczy stojące**, posortowane po głębokości (meble x+y+1, elementy x+y+1 (na meblu +0,02), serce, bohaterowie p.x+p.y, trupy potworów). Rzecz, którą zasłoniłaby stojąca ściana przed nią (`wallCovers`), rysowana jest pomiędzy blokami ścian; reszta po wszystkich ścianach. Potem ramki na licach ścian, potem latające potwory (duch, cień, nietoperze) nad wszystkim.
4. **Znaki** (zawsze w pionie, czytelne): "?" zakłócenia, nazwy typów pokoi, etykiety pokoi, "SERCE", oczy plotek (budowa), znaczniki narzędzi (budowa), etykieta wyłomu, "zdejmij", koszty ulepszeń, znaczki pamięci checku i "!" wykrycia, iskry, unoszące się napisy.

Wydajność (prototyp): podłogi rysowane raz do kawałków 8×8 pól w kilku skalach i wklejane (`tileChunk`, `TC`), poświaty jako gotowe obrazki (`glowSprite`), w budowie bez dotyku 2 s rysowana co druga klatka. W Unity zbędne (siatki/tilemapa), ale warto zachować oszczędzanie baterii w budowie (np. `Application.targetFrameRate` 30 w bezczynności).

### 6.2 Podłoga, drzwi, typy pokoi, mgła

- **Podłoga** (`drawTiles`): kolor pokoju (`ROOM_TINT` wg głębokości, korytarz ×0,62) + przyciemnienie `rgba(5,5,9,0.24)`; płyty o nierównym kolorze wg skrótu pola `tileHash` (v = h mod 7: v < 3 ciemniej o 0,05 + 0,04v, v = 6 jaśniej `rgba(215,225,240,0.04)`); dwa jasne prostokąty (0,1/0,12 i 0,52/0,56, 0,34×0,24 pola) `rgba(220,230,245,0.04)`; obwódka pola `rgba(0,0,0,0.38)`; co dziewiąte pole (T ≥ 16) rysa. Skała: nic (ciemność).
- **Drzwi**: `#131418` + deski `#3b2f28` (3 szczeliny wzdłuż przejścia); **wejście** `#5c544c` z ciepłym gradientem `rgba(255,220,160,0.35)` i jasnym trójkątem-strzałką `rgba(255,236,200,0.95)`; **wyłom**: gruz `#2a0f14` z czerwonymi pęknięciami `#ff6b6b`.
- **Typy pokoi** (`drawRoomTypes`, nakładka na prostokąt pokoju): Mgła: `rgba(190,200,220,0.16)` + 4 dryfujące kłęby; Bagno: `rgba(70,100,40,0.32)` + 5 pęcherzyków; Grota: `rgba(80,100,170,0.2)` + 2 rozchodzące się pierścienie (0,35/s); Krypta: `rgba(40,20,60,0.35)` + krzyże co 4. pole; Sezam: `rgba(200,160,50,0.16)` + migające iskry; Sanktuarium: `rgba(255,236,180,0.11)` + oddychająca poświata i duży jasny krzyż; Zębatki: `rgba(150,110,60,0.16)` + 2 obracające się koła zębate (8 zębów); Głusza: `rgba(14,16,22,0.34)` + 2 pierścienie zwijające się do środka; Lodownia: `rgba(170,215,240,0.2)` + przesuwające się błyski i rysy lodu. Nazwa typu przy przednim lewym rogu pokoju: "glif Nazwa" w kolorze typu (T ≥ 14).
- **Mgła wiedzy** (`drawFog`, w fali, podsumowaniu, końcu): pola, których drużyna nie zna, `rgba(5,6,8,0.52)`; rzeczy stojące na nich w 55% krycia.
- **Plotki** (budowa): pola znane z plotek `rgba(180,140,255,0.10)`; nad pułapką z plotki oko (`eyeIcon`, `#d6c8ff`): pełne, gdy plotka trafna, puste, gdy fałszywa/nieaktualna.
- **Zasięgi** (budowa, `drawAreas`): pola rażenia każdej pułapki/potwora w kolorze kości `rgba(225,220,205,0.08)`, przez 1,4 s po postawieniu 0,26.

### 6.3 Ściany i pochodnie

Stałe: `WALL_H` 1,7 pola (stojąca ściana, od 1.09 dwa razy wyższa), `WALL_H0` 0,85 (wysokość, dla której liczono cięcie), `WALL_LIP` 0,06 (warga), `DOOR_H` 1,25, `WALL_ANIM` 0,4 s (ruch jednego bloku), `WALL_STAY` 1,0 s (pokój zostaje otwarty po wyjściu drużyny).

- **Cięcie** (`wallSetup`, liczone raz na mapę, dla widoku fali 30°): ściana leży płasko (warga), jeśli przy wysokości 0,85 zasłoniłaby jakiekolwiek pole chodnika za sobą (przesunięcia -3..0 w obu osiach; "zasłania" = romby nachodzą na siebie, test `du/R2 + |dv + t|/(R2 SP) < 1,85`). W praktyce ściany od strony kamery (południowe i wschodnie) są ścięte do podłogi, więc nic się za nimi nie chowa. Pułapka ścienna na wardze stoi przy niej jak tabliczka.
- **Wysokie ściany w fali** (`wallFocus`, `wallTick`): pokoje "otwarte" = te, w których stoją bohaterowie, i te za drzwiami w promieniu 2 pól od nich (trzymane jeszcze 1 s po odejściu). Każda stojąca ściana, która przy pełnej wysokości zasłoniłaby otwarty pokój, kładzie się, a razem z nią wszystkie ściany pokoi stojących między kamerą a drużyną. W budowie wszystkie stojące ściany stoją. Każdy blok zaczyna ruch z opóźnieniem `min(0,3, odległość do najbliższego bohatera × 0,025)` s (fala od drużyny), rośnie z `easeOutBack` (c = 1,9), opada z `easeInBack` (c = 1,7), w trakcie ruchu jest szerszy o `0,14 × sin(π p)` ("pop"). Wysokości trzymane w liczbach 64-bitowych (poprawka 1.09.1: ściany nie podskakują).
- **Wygląd**: blok = góra `#3a3c43`, lico południowe `#2c2e34`, wschodnie `#202227` (światło z lewej), warga `#2b2d33`; rysowane są tylko lica odsłonięte (sąsiad niższy). Zaprawa (T ≥ 12): `rgba(0,0,0,0.3)`, rzędy co 0,42 pola (min. 2), spoiny pionowe naprzemiennie z przesunięciem wg skrótu; górne krawędzie `rgba(205,210,225,0.16)`; linia styku wargi z podłogą `rgba(150,155,170,0.16)`.
- **Pochodnie** (`drawTorch`, `drawTorchLight`): na stojących ścianach z `tileHash(x+101, y+37) mod 5 = 0`, na licu zwróconym do podłogi (S albo E), gdy na tej ścianie nic nie wisi i ściana ma ≥ 60% wysokości. Kinkiet (`#121316` + `#4a4e57`) na wysokości ręki (lico do 1,25), płomień: zewnętrzna elipsa `rgba(255,110,30,0.92)` 0,07×0,12T, wnętrze `rgba(255,225,140,0.95)`; ciepła poświata na licu (`torchw`) i na podłodze (`torch`, promień 2,4T). Migotanie `f = 0,86 + 0,14 sin(8,3t + 1,7x) sin(5,1t + 2,3y)`. T < 10: bez pochodni.

### 6.4 Meble (`drawObjectIso`)

Cień na podłodze (elipsa 0,42×0,34, 0,4). Beczka: walec r 0,27T, wys. 0,62, `#6e4724`, góra `#86592e`, 2 obręcze `#3a2614`, połysk z lewej. Skrzynia: pudło 0,7×0,7×0,6 (`#7d5c36`/`#6a4c2c`/`#523a22`) z zastrzałami. Posąg: cokół 0,62×0,62×0,22 + figura wojownika w kamieniu (pixel art przefarbowany na szaro-fiolet, `stoneSprite`). Regał: pudło 0,8×0,42×1,0 (`#4a3020`…) z 3 półkami po 5 grzbietów w 4 kolorach na licu południowym.

### 6.5 Pułapki, potwory, łup, budowle

Rodzaje rysowania (`drawWorld`): **ścienne** (`WALL_ITEM`: portret, oczy, lustro, strzały, ogień) malowane na licu ściany zwróconym do pokoju albo na wardze (`wallPlane`, `wallArt`); **płaskie** (sieć, zapadnia, otwarta klatka, rozbita budowla) na podłodze; **na meblu** (`ON_OBJECT`: proch, mimik, pozytywka) na górze/licu mebla; **latające** (`DRIFT`: duch, cień, nietoperze) nad wszystkim; reszta **stoi** jako bryła albo figura (`ISO_ART`). Szczegółowe kształty każdego typu: `p7_draw.js: drawItemTop` (widok z góry), `wallArt` (ścienne), `ISO_ART` (bryły: kolce jako 9 stożków, które przy odpaleniu wyskakują z 0,13 do 0,4 pola, trumna z uchylanym wiekiem, runa i kamień wyjec jako zwężające się głazy, ołtarz ze świecami, kadź kwasu z bąblami, zasłona, okowy, bastion, krata opuszczana w drzwiach z liczbą pozostałych zamknięć jako ćwieki, skrzypiące skrzydło drzwi, klatka z prętów, beczułka prochu z iskrzącym lontem, mimik z oczami i zębami na licu mebla, pozytywka z nutami ♪, kości z drgającą czaszką). Element w trakcie odpalenia ma `it.anim > 0` (np. oczy i lustro czerwienieją, wieko się uchyla).

**Łup** (`ISO_ART.loot`): monety (4 albo 7 krążków `#e8c060`/`#c99a3a`, przy sakwie poległego liczba), mikstura (kolba z zielonym płynem), relikwia (złoty kielich, pomarańczowa pulsująca poświata 5/s), ekwipunek (skrzyneczka z okuciami, niebieska poświata 3/s), przeklęty (wygląda jak ekwipunek; gracz widzi przerywaną fioletową ramkę, a gdy kapłan go wyczuje, duże fioletowe X). Kolorowa kropka = znany przedmiot po bohaterze. Migające iskierki.

**Znaki stanu** (`drawItemStatus` na polu, `statusUnit` na licu ściany):

| Znak | Wygląd | Kiedy |
|---|---|---|
| poziom | romby w prawym dolnym rogu: poz. 2 jeden `#f2b94b`, poz. 3 dwa `#ff9a3c` + pulsująca pomarańczowa ramka | zawsze |
| gotowa | pulsująca złota ramka `rgba(242,185,75, 0,5 ± 0,35)` (6/s) | fala, pułapka/potwór gotowy |
| przeładowanie | łuk `rgba(166,155,187,0.85)` r 0,42 pola, rośnie zgodnie z ruchem wskazówek | fala, `cd > 0` |
| wyłączona | przyciemnienie `rgba(16,17,20,0.6)` + X `#857a99` | fala, rozbrojona/zniszczona/zabity potwór |
| zakłócona | fioletowe pole + "?" `#e6dcff` | fala, mag zakłócił |
| wykryta | "!" `#ffe066` nad elementem | fala, bohaterowie ją znają |
| pamięć checku | ciemny krążek, w nim: krytyk = pełny jasny krążek `#ece6da` z poświatą, draśnięcie = jasna obwódka; T ≥ 9, w prawym górnym rogu nad rzeczą | fala i budowa (od 1.09 widać między falami) |
| uśpiona czaszką | "☠" w tym krążku | tylko w fali |
| oko plotki | patrz 6.2 | budowa |

**Efekty odpalenia** (`p4_traps.js: fire`, `p3_flow.js: fxTiles, fxLine`): rozbłysk pól zasięgu w kolorze typu, krycie 0,55 × życie × migotanie (40/s): ogień `255,140,50` 0,5 s, portret `170,120,255` 0,5 s, oczy `255,224,102` 0,3 s, kości `232,224,208` 0,3 s, lustro `190,220,255` 0,4 s, mimik `216,67,79` 0,3 s, pająk `220,230,255` 0,35 s, ogr `200,180,140` 0,35 s, szaman `120,220,130` 0,4 s, duch `200,210,255` 0,4 s, nietoperze `70,56,84` 0,3 s; linie (`fxLine`, kolor `255,240,200`, grubość max(2, 0,09T)): strzała przez pokój 0,28 s, łucznik do celu 0,25 s (strzał potwora 0,15 s); proch: 26 + 12 iskier `#ff9a3c`/`#ffd27a` i wstrząs 0,35; napisy: "Skrzyp!", "♪ Kołysanka", "Wrzask!", "Leczenie potworów", "Alarm!", "Echo!".

### 6.6 Serce (`drawHeartGlow`, `drawHeartIso`, `drawHeartLabel`)

Na podłodze radialna poświata `rgba(216,67,79,0.42)` r 1,6 pola; przy kradzieży czerwony łuk postępu r 0,62 (`fl.party.steal / stealNeed`). Cokół 0,56×0,56×0,18 (`#3a2228`…). Nad nim serce (krzywa Béziera) na wysokości 0,62 ± 0,03 (kołysanie 1,6/s), bije: skala `1 + 0,07 max(0, sin 6t)` + 0,08 przy ranieniu bohaterów; kolor `#b8323f` (bez kryształów `#4a2a30`), odblask, obrys `#ff8a8a`, poświata. Kryształy krążą (r 0,48, 0,6 rad/s, wys. 0,42 ± 0,05): w sercu `#ff9ab0`, niesiony przez złodzieja `rgba(255,154,176,0.25)`, utracony `rgba(80,60,70,0.6)`; romb z białą krawędzią. Pod sercem "SERCE" (Jersey, `rgba(255,214,170,0.9)`, T ≥ 14).

### 6.7 Bohaterowie (pixel art, `paintFigure`, `drawHero`)

- **Sprite** 20×28 pikseli, stopy w dolnym rzędzie, zwrócony w prawo; w lewo = lustro. Malowany prostokątami całych pikseli z paletą `PAL` (dwa tony na materiał: jasny i cień): skóra `#c9a184`/`#9d7660`, stal `#9aa3b2`/`#646c7a` (blask `#c5ccd8`), drewno, złoto, kolory klas (wojownik niebieski tabard `#46628c`, złodziej zielony `#46613f`, kapłan kość `#d9d0b9`, mag fiolet `#5d4286`, bard morski `#2e7069`, barbarzyńca brąz `#8c5a33` + futro), kość, goblin, ogr, pająk, duch, cień. Po namalowaniu obrys 1 px `rgba(12,9,14,0.72)` (miękki, nie czarna kreska).
- **Sylwetki klas**: wojownik: hełm z czerwonym grzebieniem, tarcza z tyłu, miecz; złodziej: kaptur z cieniem na oczach, płaszcz, sztylet; kapłan: aureola, szata ze złotym pasem i krzyżem; mag: spiczasty kapelusz, broda, laska z kulą; bard: czapka z piórem, lutnia; barbarzyńca: hełm z rogami, goła pierś, futro, topór.
- **Klatki**: 4 klatki chodu (0 stoi, 1 i 3 nogi w rozkroku, ciało 1 px wyżej), 4 klatki na sekundę (`floor(realNow × 4 + id × 0,37) mod 4`), tylko gdy idzie w fali i gra nie stoi. Wariant "flash" (cały biały, obrys półbiały) przy trafieniu.
- **Rozmiar**: `figH = clamp(T × 1,1, 27, 50)` px (czempion ×1,18, bohater z przepowiedni ×1,3), rysowany w 1,15 × figH; skala całkowita w pikselach urządzenia `k = max(1, round(H × DPR / 28))`, bez wygładzania. Figura nigdy nie jest mniejsza niż 27 px. Stopy stoją w punkcie podłogi z `heroPos` (pozycja interpolowana między polami + przesunięcie wg id: (id mod 3 - 1) × 0,14 w x i połowa tego w y, żeby się nie nakładali).
- **Na ziemi**: cień (elipsa 0,95W × 0,32W, W = 0,36H), kropki ścieżki (6 następnych pól, kolor klasy, 45%), pierścienie: spowolniony `#a9c6ff`, sam (fala) przerywany pomarańczowy, bliski śmierci (< 30% HP) pulsujący czerwony, rozbrajający żółty łuk postępu.
- **Na figurze**: łowca skarbów = sakiewka `#8a6a2c` przy biodrze; boss = złota korona `#d9b44a` nad głową; przeklęty = fioletowa mgiełka; amulet = fioletowa poświata; buty = 3 linie pędu; płonący = migający płomyk; talizman = pulsująca niebieska elipsa; tarcza wojownika = łuk `#7fb8ff` z przodu; na lodzie: przechylony, iskry lodu za nim; barbarzyńca rozbijający: drganie.
- **Nad głową**: paski HP (`#6fd38a` / `#ff6b6b` ≤ 35%), strach (`#b48cff`, pełny = ucieka), tarcza (`#7fb8ff`, nad HP), wiara kapłana (`#ffe9a8`); szerokość `max(0,56T, 0,62H)`, wysokość `max(2, 0,07T)`, tło `rgba(0,0,0,0.65)`; poziom (liczba) przy głowie w kolorze rangi z ciemnym obrysem; niesiony kryształ (różowy romb); sakwa ze złotem (kropka `#f2b94b` + liczba); uciekający "»"/"«" `#c3b2ff` drgające; pod stopami kwadraciki ekwipunku (do 6, kolory przedmiotów, przygaszone na odnowieniu, T ≥ 14); znak nad paskami: "!!" panika `#ff6b6b`, "?" zgubiony `#ffe066`, "..." narada, "z" odpoczynek.
- **Animacje 1.09**: wejście w drzwiach (`inR`): skala `0,35 + 0,65 easeOutBack` i krycie w 0,36 s; ugięcie od ciosu (`flash` 0,12 s): szerzej 1 + 0,12q, niżej 1 - 0,1q; wyjście (`HERO_OUT` 0,7 s): **śmierć** przewrócenie o 90° (kąt ∝ t², t = k/0,5), mały podskok, zanik od 55%; **zapadnia** spłaszczenie (ky 1-k, kx 1-0,3k), krycie 1-0,6k; **wyjście z lochu** zanik.

### 6.8 Potwory (`ISO_ART`, `drawCorpse`)

Goblin, łucznik (szkielet z łukiem), szaman (zielony z piórami i laską), ogr (z maczugą), pająk (nisko, 8 cienkich nóg dorysowanych po obrysie): pixel art jak bohaterowie, wysokość `monH` (ogr 1,25T, goblin 0,8, łucznik 0,95, szaman 0,9, pająk 0,6) × 1,15, minimum 27 px × (pająk 0,75, goblin 0,85, ogr 1,2), patrzą na najbliższego bohatera (w promieniu 8 pól), przy ciosie klatka 1. Duch: blady, unosi się (0,35 ± 0,06), 72% krycia (95% przy odpaleniu), klatki 4/s, odwraca się. Cień: ciemna radialna mgła + zakapturzona postać z fioletowymi oczami, klatki 3/s. Nietoperze: 3 małe nietoperze (2 klatki skrzydeł, 10/s) krążące wokół pola. Pasek HP potwora `#9be37a`, trafienie = biały owal i ugięcie. Śmierć (1.09): trup przewraca się i znika w 0,75 s + szare drobiny.

### 6.9 Dymki (`drawBubbles`)

Kto i kiedy mówi: sekcja 06. Prezentacja (1.08, styl reszty gry), zrzut `06_wave_play.png`:

- Rysowane w przestrzeni ekranu (czytelne przy każdym przybliżeniu), nie w budowie. Najwyżej 3 naraz, posortowane po priorytecie, bez powtórzeń tego samego tekstu.
- Font 500 12 px Alegreya Sans, interlinia 15 px, łamanie do szerokości 150 px, **najwyżej 2 linie** (reszta ucięta). Szerokość = tekst + 19 px, wysokość = linie × 15 + 9.
- Płyta `rgba(16,17,21,0.95)`, rogi 3 px, obramowanie 1 px `#464b53`, a dla ważnych (`prio ≥ 3`) mosiądz `#8a7034` i tekst `#e6cf94` zamiast `#e6e1d6`; światło na górnej krawędzi `rgba(210,220,235,0.07)`; pasek 3 px po lewej w kolorze klasy mówiącego; ogonek 6 px w schodkach (jak pixel art) pod mówiącym.
- Pozycja: nad głową i paskami, wyśrodkowany, w granicach mapy (4 px). Omija pudło checku, listę drużyny i wcześniejsze dymki (do 6 prób; od innych dymków i listy w górę, a od pudła checku, które od 1.13 jest u góry, w dół: pod pudło, jeśli tam się mieści). Gdy musiał wjechać wyżej o > 6 px, cienka nitka `rgba(120,126,136,0.55)` od ogonka do głowy.
- Wejście 0,16 s (wjeżdża 4 px w górę), zanik w ostatnich 0,3 s. Czas: spokojna kwestia `max(dur, readT)`, `readT = clamp(1,1 + 0,042 × długość, 1,6, 3,4)` s; okrzyk (`loud`) `dur` (domyślnie 1,9 s).
- **Głusza**: zamiast tekstu "…" (okrzyk "…!"), 1,4 s.

### 6.10 Unoszące się napisy i cząsteczki

- **Napisy** (`addFloat`, `drawFloats`): stoją na punkcie podłogi i unoszą się (0,9 pola/s × 0,9T), życie 1,2 s, krycie `life/0,5`; font Jersey `max(11, rozmiar × T / 52)`, obrys 3 px `rgba(10,11,13,0.9)`. Napis z tym samym znacznikiem w pobliżu (1,6 pola) zastępuje starszy; inne w tym samym miejscu przesuwają się o 0,34 w górę. Przykłady: Groza nad bohaterem "+G" `#c3b2ff` 16 (sam: `#e6dcff` "+G sam!"), "KRYTYK!" / "SERIA: KRYTYK!" `#ff6b6b` 19, "Draśnięcie" `#8be38f` 14, "Pudło" `#a69bbb` 15, "Kryształ skradziony!" `#ff6b6b` 18, "Serce syte!" `#ff9aa4` 16, "Śmierć +E Esencji" `#ff7a86` 15, "Nowa ranga: X!" `#cbb0ff` 16, "Poziom N" `#ffb35c` 15, "+N Esencji" `#ff7a86` 14 (zdjęcie), "Przeniesione" `#d8d2c4` 13, "Serce ich odpycha!" `#ff9ab0` 15.
- **Cząsteczki** (`burst`, `drawParticles`): n kwadracików 0,08T na wysokości 0,35, prędkość (0,6..1,6) × 2,2 pola/s w losowym kierunku, tarcie ×0,9 na klatkę, życie 0,5-0,8 s, krycie `life × 2,2`. **Pierścienie** na podłodze: promień dąży do `maxR` (12/s), grubość `max(2, 0,08T)`. Przykłady: kurz `#9a9286` ×7 + pierścień `#b9b2a6` 0,15 → 0,85, 0,32 s; ulepszenie `#ffb35c` ×12 + pierścień 0,2 → 1,1, 0,4 s; śmierć bohatera `#d8434f` ×16; krytyk wybija przedmiot (kolor rzadkości ×10); śmierć potwora `#8a8378` ×8.

### 6.11 Orby (`p6_loop.js: gainEssence, grozaOrbs, boxOrbs`; `p7_draw.js: drawOrbs`)

Rysowane na `#fx` (pełny ekran, nad HUD i mapą, pod oknami). `ORB_MAX = 90` naraz.

| Orb | Skąd → dokąd | Liczba | Opóźnienia / czas lotu | Kolory (smuga, poświata, rdzeń) |
|---|---|---|---|---|
| groza | bohater (`heroScreen`, ±6 px) → pudełko Groza | `min(5, floor(akum/0,08))`, każdy niesie akum/n | -0,06 s × i; 0,45-0,65 s | `rgba(170,150,245,0.55)`, `rgba(160,135,245,0.42)`, `#ece6ff` |
| greed | pole łupu (z 0,4) → Chciwość | `clamp(round(g/0,04), 1, 6)` | -0,07 s × i; 0,5-0,7 s | `rgba(236,200,120,0.6)`, `rgba(240,190,80,0.4)`, `#fff4d6` |
| combo | pole pułapki → Combo | 3 na stopień (+0,25) | jw. | `rgba(169,212,218,0.6)`, `rgba(140,210,222,0.4)`, `#effcff` |
| score | losowy punkt pudełka Esencja → duża liczba | `min(30, max(1, round(E/0,4)))` | -0,035 s × i - los 0,05; 0,5-0,7 s | `rgba(255,90,100,0.38)`, `rgba(255,70,85,0.32)`, `#ffe0e3` |
| heart | pudełko Esencja → ♥ | `min(24, max(1, round(porcja/0,6)))` | jw. | jak score |

Tor: krzywa kwadratowa z punktem kontrolnym `(ox + 0,2(tx - ox), min(oy, ty) - 40)` (z równania: -18), postęp wygładzony smoothstep; rysunek: smuga 3 px od u-0,08 do u, krąg r 7, rdzeń r 2,6. Lądowanie: pudełko błyska (patrz 2.3), liczba w pudełku rośnie dopiero wtedy (wartości w HUD odejmują to, co jeszcze leci: `C.fly`, `fl.gFly`, `fl.kFly`, liczone osobno na serię, żeby orby starej serii nie psuły nowej). Brak orbów przy "mniej ruchu".

### 6.12 Skill check: wygląd (`drawCheck`, `ckPath`, `ckSlab`)

Logika (strefy, czasy, kształt dla typu, czaszka): sekcja 05. Zrzut: `05_wave_check.png`.

- **Przyciemnienie** mapy `rgba(4,5,7,0.36)` do odpowiedzi. Wokół pułapki: pierścień kości (r `max(12, 0,75T)`, 1,6 px na czarnym 3 px), pozostałe pułapki serii przerywanym mosiądzem (r 0,6T).
- **Płyta** u góry mapy (od 1.13, decyzja autora: na telefonie kciuk zasłaniał check na dole): górna krawędź `max(36 + 6, dół coacha + 8)` px od góry mapy, czyli pod rzędem ikon drużyny (`drawChips`: 6 px od góry, 30 px wysokości), a w fali z kartą samouczka u góry pod tą kartą; gdy płyta nie mieści się nad dołem mapy, przesuwa się w górę (`min(..., ch - 10 - wysokość)`, nie wyżej niż 8 px). Odpowiedź to nadal stuknięcie w dowolne miejsce mapy, więc kciuk stuka niżej i nie zasłania koralika. Od 1.02 do 1.12.1 płyta była na dole mapy (10 px od dołu, nad coachem, gdy był na dole). Rozwinięta lista drużyny (`UI.listOpen`) leży pod płytą i jest przez nią przykryta na czas checku. Szer. `min(320, cw - 28) + 20`, ścięte rogi 5 px, gradient `#1d1f24`→`#111216`, ramka `#464b53`, nity 1,4 px `#5d6168`, cień 16 px. Tytuł Grenze 700 17 px: w fazie "Uwaga!" (0,5 s, `CHECK_PREP`) "Uwaga: kolce!" albo "Uwaga: seria (n)!" w jasnym mosiądzu `#e6cf94` + kurczący się pasek mosiężny 70 px; potem "Kolce[ + n]: stuknij!" w kości; po odpowiedzi "Kolce: Krytyk!" (kość z poświatą) / "Draśnięcie" `#b9b3a6` / "Pudło" / "Odpuszczone" `#8e939a`. Po prawej uwagi fioletem `#d9ccff` 600 11 px ("rozbraja ją!", "niesie kryształ!", "w klatce +50%", "poz. 12: szybciej"…). Legenda 11 px popiół "obwódka: draśnięcie · pełne pole: krytyk (najmocniej) · ☠ zabije" przez pierwsze 3 checki każdej fali.
- **Tor** (`ckPath`, q od 0 do 1; R = `clamp(min(cw, ch) × 0,12, 40, 52)`, TW = 14 px): `bar` prosta linia szer. w; `fuse` lont `y = 7 sin(4πq)` (koralik przyspiesza, `checkPos = u^1,7`); `swing` łuk wiszący r 1,45R, ±1,1 rad, tam i z powrotem (2 przejścia, wahadło ±35%); `spiral` 2 obroty do środka (r = 1,2R(1 - 0,74q)); `pulse` zamykający się pierścień (r = (R + TW/2 - 1)(1 - q)); `ring` i `double` okrąg r R od kąta `rot - π/2`. Tor = rowek 14 px `#0a0b0d` z krawędzią `#2b2e34`.
- **Strefy** (od 1.04, jak w Dead by Daylight, czytelne dla daltonistów): draśnięcie = **obwódka** pasa w kolorze `#ece6da` (pełna szerokość toru z wyciętym środkiem 10 px i poprzecznymi końcówkami 2 px), krytyk = **pełny** jasny pas z poświatą `rgba(255,244,225,0.8)` blur 10. `double` ma dwa okna. W `pulse` strefy to pierścienie (obwódka: dwa okręgi, krytyk: wypełniony pierścień).
- **Czaszka** "☠" 12 px ciemna z jasnym obrysem na środku strefy, która zabije (draśnięcie i/lub krytyk).
- **Koralik**: krwisty `#d23a48` (w "Uwaga!" przygaszony `rgba(210,58,72,0.45)`), r TW/2 + 0,5 na czarnym r TW/2 + 2,5, poświata `rgba(255,60,75,0.7)` blur 9, środek 1,6 px `rgba(255,225,228,0.9)` = dokładny punkt; w `pulse` także jego zamykający się okrąg.
- Wynik wisi 0,35 s, potem check znika (`clearCheck`).

### 6.13 Znaczniki budowy

| Znacznik | Wygląd | Źródło |
|---|---|---|
| wolne miejsce dla wybranego kafelka | przerywana ramka `rgba(242,185,75,0.75)` (wcięcie 0,12, grubość `max(1, 0,04T)`, kreska 0,12T/0,1T); na stojącej ścianie rysowana na jej licu | `drawSlots`, `markTile`, `drawWallMarks` |
| element w ręce | pulsująca fioletowa ramka `rgba(195,178,255, 0,6±0,4)` (grubość `max(2, 0,08T)`), cele przerywane `rgba(195,178,255,0.8)` | `drawCarry` |
| koszt ulepszenia | czerwona pigułka `rgba(255,85,98,0.95)` z "↑c" (za mało: szara) nad elementem w ręce | `costTag` |
| przytrzymanie | od 15% czasu: pierścień r 0,62T, tło `rgba(16,17,20,0.7)`, wypełnia się na czerwono `#ff6b6b`; napis "zdejmij" `#ffd0d0` | `drawHold`, `drawHoldLabel` |
| narzędzie (Loch) | krążki r `max(10, 0,42T)`: złote (`+` kopanie, `↔` przejście, `▲` rozbudowa z ceną pod spodem), czerwone (wyburz, zdejmij typ), w kolorze typu pokoju z glifem, szare gdy za drogo; "zamiast: X" | `drawToolMarkers` |
| wyłom | pulsujący czerwony pierścień + "WYŁOM" i "stuknij: załataj (20)"; po otwarciu arkusza przez 4 s 2 fale pierścieni co 1,2 s (r 0,8 → 3) | `drawBreachMark`, `drawBreachLabel` |
| cel samouczka | pulsujący złoty pierścień r 0,6 ± 0,1 | `drawTutTarget` |
| etykieta pokoju | "×1,7" (mnożnik głębokości) przy przednim prawym rogu pokoju, w budowie także "zajęte/pojemność" (czerwone `#ff9a9a` gdy pełny); pokoje skrajne `rgba(255,170,140,0.95)` | `drawRoomLabels` |

### 6.14 Co musi dostarczyć grafika w Unity

Prototyp nie ma żadnego pliku graficznego: wszystko rysuje kod. Najwierniej jest **odtworzyć to samo proceduralnie** (te same kolory i proporcje), a nie zamawiać nowe rysunki.

| Zasób | Jak odtworzyć |
|---|---|
| Sprite'y postaci 20×28 px: 6 klas × 4 klatki, goblin, łucznik, ogr, szaman, pająk (2 układy nóg), duch, cień, nietoperz (2 klatki), wariant "flash", posąg | przepisać `paintFigure`, `outlineSprite`, `spiderLegs`, `stoneSprite` 1:1 do edytorowego skryptu C#, który wygeneruje PNG (filtr Point, bez kompresji) albo Texture2D w runtime |
| Podłoga (kolory pokoi, wariacje, rysy), drzwi, wejście, wyłom | siatka/tilemapa z kolorem wierzchołka albo mała tekstura proceduralna wg `drawTiles` |
| Ściany (bloki 3 kolorów, warga, zaprawa), pochodnie | bryły 3D z materiałem unlit (kolor na lico), zaprawa jako tekstura; animowana wysokość |
| Meble, serce z kryształami, bryły pułapek i budowli, łup | proste bryły unlit + elementy 2D wg `ISO_ART`, `drawObjectIso`, `drawHeartIso` |
| Elementy płaskie i ścienne | sprite'y/quady na podłodze i licach wg `drawItemTop`, `wallArt` |
| Poświaty | 5 tekstur radialnych 128×128: `torch`, `torchw`, `heart`, `relic`, `gear` (`glowSprite`, przystanki w kodzie) |
| Ikony kafelków (53) | SVG z `p8a_icons.js: ICONS` przez pakiet Vector Graphics albo zrasteryzowane do PNG 64×64 |
| Ikony klas (6 + sakiewka), ekwipunku (7), kłódka, menu, cofnij | ścieżki `CLASS_ICON` (`p1_config.js`), `ITEM_GLYPH` (`p8b_ui.js`), `LOCK`, SVG w `p0b_body.html` |
| Ziarno UI | tekstura szumu 180×180 kafelkowana (alfa 0,1) |
| Fonty | Grenze Gotisch, Alegreya Sans, Jersey 10 (TMP) |
| Skill check, dymki, orby, paski, plakietki | UI rysowane w kodzie (siatka, `LineRenderer`/UI Toolkit `Painter2D`) wg 6.9-6.12 |

## 7. Dźwięk (`p6_loop.js`)

Wszystko jest syntezowane w Web Audio, bez plików. Autor lubi te dźwięki: **zachować je**, najlepiej przez wyrenderowanie syntezy do klipów (opis niżej).

### 7.1 Muzyka (`MUS`, `M_BARS`, `M_LEAD`, `mStep`, `musicTick`)

Jak w Balatro (1.07): jeden utwór w dwóch aranżacjach, które grają **równo** (to samo tempo, tonacja, akordy) i przechodzą jedna w drugą. **A "Loch"**: budowa, sklep, podsumowanie, pauza, start. **B "Fala"**: trwająca fala. `musicWant()` = B, gdy faza fali, brak pauzy, pasek zwinięty i fala się nie kończy; inaczej A. Zmiana = liniowe przejście głośności obu aranżacji w 1,2 s (obie grają cały czas w tym samym miejscu utworu).

Parametry: 96 BPM, a-moll, szesnastka `sx = 60/96/4 = 0,15625 s`, pętla 16 taktów × 16 szesnastek = 256 kroków = **40 s**. Akordy (`M_BARS`, 8 taktów, powtórzone 2×; bas MIDI, akord MIDI): [45, 57 60 64 67 71], [41, 53 57 60 64], [38, 57 60 62 65], [40, 56 59 62 64], [45, 57 60 64 67 71], [48, 55 59 60 64], [46, 58 62 65 69], [40, 56 59 62 65]. Melodia `M_LEAD`: 61 nut [takt 0-15, ósemka 0-7, nuta MIDI, długość w ósemkach] w kodzie. `mhz(n) = 440 × 2^((n-69)/12)`.

Nuta (`mNote`): oscylator, obwiednia: 0,0001 → liniowo do `vol` w `att` → trzyma do `len - rel` → wykładniczo do 0,0001 w `len + rel`; opcjonalny dolnoprzepustowy `cut`; opcjonalnie do echa. **Taśma**: LFO sinus 0,35 Hz, ±9 centów na detune każdego strojonego głosu (14 pełnych cykli na pętlę, więc pętla się zamyka).

| Aranżacja A "Loch" (tylko parzyste szesnastki, swing: kroki 2, 6, 10, 14 opóźnione o 0,32 sx) | |
|---|---|
| organy (krok 0) | każdy dźwięk akordu: square, 15 sx, vol 0,022, att 0,08, rel 0,5, LP 1300 + sinus oktawę wyżej, vol 0,012 - 0,001k, att 0,12, rel 0,6 |
| bas | triangle, kroki 0: pryma, 4: +7, 8: +12, 12: +10, 14: następna pryma - 1; 1,8 sx, vol 0,16, att 0,01, rel 0,08 |
| melodia | square, 2 × długość × 0,92 sx, vol 0,035, att 0,02, rel 0,12, LP 2400, echo |
| perkusja | stopa kroki 0 i 10 (0,5), werbel 4 i 12 (0,12), hi-hat każda ósemka (0,04 na ćwierćnutach, inaczej 0,025) |

| Aranżacja B "Fala" (proste szesnastki) | |
|---|---|
| organy | na krokach 2, 6, 10, 14 (offbeat): akord square 0,9 sx, vol 0,016, att 0,005, rel 0,05, LP 1800 |
| bas | parzyste kroki, sawtooth wg [pryma, pryma, +12, pryma, +7, pryma, +12, następna - 1][krok/2], 1,6 sx, vol 0,08, att 0,005, rel 0,04, LP 900 |
| arpeggio | każda szesnastka, square, akord + 12, indeks [0,1,2,3,2,1,0,1][krok mod 8] mod długość, 0,7 sx, vol 0,018, att 0,003, rel 0,03, LP 3200 |
| melodia | tylko takty 8-15, oktawę wyżej, square, 2 × dł. × 0,9 sx, vol 0,03, att 0,01, rel 0,1, LP 3600, echo |
| perkusja | stopa kroki 0, 6, 8, 11 (0,6), werbel 4, 12 (0,2), hi-hat co szesnastkę (0,035 parzyste / 0,018 nieparzyste), krok 14 otwarty hi-hat |

Perkusja (`mDrum`): stopa = oscylator 120 → 42 Hz wykładniczo w 0,14 s, głośność do zera w 0,3 s; hi-hat = szum górnoprzepustowy 7200 Hz Q 0,5, 0,04 s (otwarty 0,22 s); werbel = szum pasmowy 1900 Hz Q 0,8, 0,16 s + sinus 185 Hz (0,5 vol, 0,09 s).

Szyna: głośność `S.music × 0,55` (`setTargetAtTime` 0,15 s) → dolnoprzepustowy 5200 Hz Q 0,3 ("ciepło") → wyjście, oraz pogłos (splot ze stereo szumem 1,6 s zanikającym `(1 - i/n)^3,2`, wet 0,22). Echo melodii: opóźnienie ósemki z kropką (0,75 × 60/96 = 0,469 s), sprzężenie 0,28, wet 0,3 do szyny. Harmonogram: co 60 ms, z wyprzedzeniem 0,22 s; po przerwie gra od teraz bez nadrabiania. Start po pierwszym dotknięciu/klawiszu (wymóg przeglądarki), tylko gdy `S.music > 0`; ukrycie karty zawiesza dźwięk.

### 7.2 Efekty dźwiękowe (`sfx`)

Pięć dźwięków, wszystkie wokół skill checku. Jeden oscylator, głośność `S.volume × 0,2` (go: × 0,08), obwiednia wykładnicza do 0,0001 w czasie trwania, częstotliwość wykładniczo do końcowej (jeśli podana), prosto na wyjście (poza szyną muzyki).

| Nazwa | Kiedy | Fala | Start → koniec Hz | Czas |
|---|---|---|---|---|
| `warn` | pojawia się check ("Uwaga!") | triangle | 880 → 1320 | 0,12 s |
| `go` | koralik rusza (koniec "Uwaga!") | square | 1480 | 0,04 s |
| `crit` | krytyk | square | 220 → 55 | 0,22 s |
| `ok` | draśnięcie | sine | 620 → 520 | 0,14 s |
| `miss` | pudło | sawtooth | 150 → 70 | 0,18 s |

Brak dźwięków dla przycisków, pułapek, śmierci, kryształów i odpuszczonego checku (to miejsce na rozbudowę, ale tylko za zgodą autora).

### 7.3 Unity

- **AudioMixer**: grupy Master → Music (A, B) i SFX; parametry wystawione `MusicVol` (= `S.music × 0,55`, w dB) i `SfxVol` (`S.volume`); 0 = wyciszenie.
- **Muzyka**: wyrenderuj obie aranżacje offline (np. `OfflineAudioContext` z tym samym kodem w przeglądarce, 44,1 kHz stereo) jako bezszwowe pętle po 40 s, z wypalonym filtrem, pogłosem i echem. Żeby ogony pogłosu i echa zawijały się poprawnie, renderuj 2 pętle i zapisz drugą. W Unity dwa `AudioSource` startowane tym samym `PlayScheduled(dspTime)`, `loop = true`, przejście 1,2 s liniowo przez głośności (albo snapshoty miksera). Ustawienia importu: Vorbis, Streaming.
- **Efekty**: wyrenderuj 5 krótkich klipów (WAV, Decompress On Load) albo syntezuj w `OnAudioFilterRead`/`AudioClip.Create`.
- Start muzyki od razu (w aplikacji nie ma wymogu dotknięcia); pauza aplikacji wycisza.

## 8. Samouczek i nauka (1.12)

### 8.1 Etapy pierwszych runów (`ONB_STAGES`, `onbStage`, `onbDone`)

Etap w pamięci urządzenia `yatd-onb`: 1-4 = który run nauki jest następny, 5 = gra poznana. Domyślnie 1, a urządzenie, które ma już rozegrane runy sprzed 1.12, startuje od 5. Run z nauki przesuwa etap po zakończeniu (`onbDone`: tylko run rozpoczęty ścieżką nauki, `guided`; wyjście przed falą 5 się nie liczy). Co odsłania każdy etap (elementy `ONB_ITEM`, karty `ONB_CARD`, mechaniki): sekcje 03-05; tu prezentacja:

| Etap | Nazwa | Co widzi gracz |
|---|---|---|
| 1 | Podstawy | przewodnik (coach) przez fale 1-3; brak zakładki Obiekty (także w etapie 2) i typów pokoi; brak karty "Nowe" |
| 2 | Strach | karta `onb` "Nowe: strach" na starcie (3 punkty) |
| 3 | Gildia i loch | karta "Nowe: gildia i loch" (3 punkty), zakładka Obiekty, typy pokoi |
| 4 | Pełna gra | karta "Nowe: pełna gra" (4 punkty) |

`startGuided`: etap = `min(4, onbStage)`, `newRun(etap 1 i samouczek nieukończony, etap)`, `run.guided = true`, dla etapu > 1 kolejkuje kartę `onb`, zapisuje run.

### 8.2 Coach (`#coach`, `tutShow`)

Płyta wewnątrz mapy: w budowie na dole (8 px od lewej, prawej i dołu), w fali u góry (`top: 42px`, pod chipami drużyny), z-index 3; tło `rgba(16,17,21,0.97)`, ramka `--line2`, lewa krawędź 3 px `--gold`, padding 10/12, tekst 14 px, interlinia 1,38, wjazd 0,25 s. Treść: tekst kroku, pod nim rząd: "Samouczek i/16" (12 px muted) po lewej, po prawej "Zakończ" (każdy krok poza ostatnim), "Pomiń krok" (kroki z `skip`), "Dalej" / "Gramy!" (kroki z `next`; złoty gradient `--gold-hi`→`--gold`, tekst `#141210`). Linki "Zakończ" i "Pomiń krok" podkreślone muted. Zrzut `10_tutorial.png`.

- **Podświetlenia** (`tut-hl`): elementy z listy `hl` dostają złotą obwódkę 2 px z odstępem 2 px pulsującą 1 s; podświetlony kafelek przewija się do widoku.
- **Cel na mapie**: krok z `tile` rysuje pulsujący złoty pierścień na polu (`drawTutTarget`) i w budowie centruje na nim kamerę nieco powyżej środka (`cam.oy += ch × 0,14`), bo coach jest na dole.
- Krok innej fazy albo późniejszej fali czeka niewidoczny. W fali kamera kadruje drużynę pod coachem (`coachInset`, 5.4), a check (od 1.13) rysuje się pod coachem.

### 8.3 Kroki (`TUT`, 16)

| # | id | Fala / faza | Co mówi i o co prosi | Zakończenie |
|---|---|---|---|---|
| 1 | intro | 1 budowa | to Twój loch, loch postawił 2 pułapki przy sercu | "Dalej" |
| 2 | move | 1 budowa | stuknij pułapkę w kółku (pułapka startowa `sys`), potem inne pole; przytrzymanie zdejmuje | przeniesienie elementu (`tutFlags.moved`); "Pomiń krok" |
| 3 | spikes | 1 budowa | wybierz Kolce (podświetla zakładkę Pułapki i kafelek Kolce, otwiera pasek); przytrzymaj kafelek | Kolce wybrane albo postawione |
| 4 | place | 1 budowa | postaw na trasie, pole z kółkiem (`tutPathTile(0,25)`) | więcej kolców niż na starcie kroku |
| 5 | arrows | 1 budowa | Strzały na ścianę przy trasie (`tutWallTile`) | więcej strzał |
| 6 | spend | 1 budowa | "Masz jeszcze N Esencji…", nie oszczędzaj | koniec budowy, Esencja < 3 albo brak miejsca na kolce/strzały (`tutAnySpot`); "Pomiń krok" |
| 7 | go | 1 budowa | wypuść falę (podświetla główny przycisk), ▲ Budowa zatrzymuje grę | start fali |
| 8 | novice | 1 fala | nadchodzą nowicjusze, równanie (podświetla `#h-eq`) | chowa się po 9 s; pierwszy check przeskakuje do kroku 9 |
| 9 | check | 1 fala | stuknij w mapę, gdy koralik w obwódce/pełnym polu | odpowiedź na check albo 2 s bez checku |
| 10 | herocard | 1 fala | stuknij bohatera albo listę | otwarta karta bohatera; "Pomiń krok" |
| 11 | ff | 1 fala | przytrzymaj palec (przyspieszenie), ▶▶ spokój | użyte przyspieszenie; "Pomiń krok" |
| 12 | loot | 2 budowa | serce chce Esencji, łup podbija chciwość: postaw Monety (otwiera Łup; dopłaca Esencję do ceny monet) | postawiony łup (nie po bohaterach); "Pomiń krok" |
| 13 | upgrade | 2 budowa | dwa stuknięcia w pułapkę w kółku (`tutUpTarget`, dopłaca Esencję do ulepszenia) | ulepszenie; "Pomiń krok" |
| 14 | deck | 2 budowa | karta ze sklepu jest w talii (otwiera Talię) | "Dalej" |
| 15 | dig | 3 budowa | kop nowe pokoje (zakładka Loch, Nowy pokój) | użyte narzędzie Loch (`tutEvent('tool')`); "Pomiń krok" |
| 16 | end | 3 budowa | koniec pierwszego runu, kolejne runy dołożą resztę | "Gramy!" |

Mechanika: `tutTick` sprawdza `done` co klatkę (krok z `next` czeka na przycisk); `tutEvent('check')` przy pierwszym checku skacze z "novice" do "check" i pokazuje kartę `check`; `tutOnBuild` na starcie budowy przeskakuje do pierwszego kroku tej fali (co zostało z poprzedniej, przepada); `tutEnd` ("Zakończ" albo ostatni krok) ustawia `run.tut = -1`, zapisuje `yatd-coach = 1` i wznawia grę. Log kroków (`run.tutLog`: najdalszy, pominięte, jak się skończył) idzie do statystyk (tylko prototyp).

### 8.4 Karty ważnych chwil (`TUT_POP`, `tutPop`)

Krótka karta w coachu u góry mapy (klasy `top pop`: lewa krawędź `--gold-hi`, złota obwódka), tekst + "Gra stoi" + "Rozumiem". **Zatrzymuje grę** (`setPaused(true)`); check czeka pod kartą. Kolejka, gdy przyjdą dwie. Zamknięcie: następna z kolejki albo wznowienie gry i powrót kroku przewodnika.

| id | Kiedy (źródło) | Treść (skrót) |
|---|---|---|
| check | pierwszy check, tylko w runie z przewodnikiem w toku (`tutEvent`) | obwódka = draśnięcie, pełne pole = krytyk, ☠ zabije, wynik zostaje |
| pay | wypłata serii ≥ 1 Esencji (`payChain`) | koniec combo zamienia Grozę w Esencję |
| theft | kradzież kryształu (`takeCrystal`) | zabij albo wystrasz niosącego |
| flee | bohater ucieka ze strachu (`startFlee`) | uciekinier da Esencję, ale opowie o pułapkach |
| body | pierwsze ujawnienie ciała (`revealPhys`) | słabość/odporność ciała |
| phobia | pierwsza fobia (`revealPhobia`) | boi się 2 razy bardziej |
| returner | powracający w drużynie (`spawnHero`) | uciekł kiedyś, wraca silniejszy |

Warunki: run z nauki (`run.guided`) albo samouczek w toku; trwająca fala, która się nie kończy (`fl.ending`, `fl.finishing`); żadne okno nie jest otwarte; karta nie była jeszcze widziana na tym urządzeniu (`yatd-pops`, słownik id → 1, zapisywany przy pokazaniu). `tutPopDrop` na starcie każdej budowy usuwa niewyświetlone karty i chowa coach (karta fali nigdy jej nie przeżywa); `coachHide` przy nowym runie i wczytaniu (poprawka 1.12).

### 8.5 Zapis i wznowienie (`tutResume`)

Run z samouczkiem zapisuje się jak każdy. Po wczytaniu: liczniki "postaw więcej" liczą od tego, co stoi; krok ustawiony na pierwszy krok bieżącej fali, jeśli był wcześniejszy; krok fali z fali 1 wraca do "go" (wypuść falę), bo fala zaczyna się od nowa; w budowie coach pokazuje się od razu.

### 8.6 Pamięć urządzenia (localStorage → PlayerPrefs)

| Klucz | Zawartość |
|---|---|
| `yatd-onb` | etap nauki 1-5 |
| `yatd-coach` | "1" = przewodnik ukończony/porzucony |
| `yatd-pops` | widziane karty TUT_POP |
| `yatd-tab` | ostatnia zakładka paska |
| `yatd12-ui` | `trayBuild`, `listOpen`, liczniki podpowiedzi (`holdTips`, `carryTips`, `trayPauseHint`), `noFull` |
| `yatd12-settings` | ustawienia gracza (+ `speedsV`) |
| `yatd12-save` | zapisany run (sekcja 07) |
| `yatd15-records`, `yatd15-best` | rekordy |
| `yatd-name`, `yatd-device`, `yatd-survey` | tylko prototyp |

## 9. Tylko prototyp: odpowiedniki w Unity

| Rzecz w prototypie | Źródło | W Unity |
|---|---|---|
| instalacja web (manifest, service worker, `beforeinstallprompt`, wskazówka iPhone) | `build.py`, `webStartRow` | aplikacja z Google Play, nic |
| pełny ekran (Fullscreen API, blokada pionu), przycisk w Menu | `goFullscreen`, `renderMenu` | tryb immersyjny Androida, orientacja Portrait w Player Settings |
| `--top-min` 28 px i suwak "Odstęp od góry ekranu" | `p0_head.html: :root`, `applyLook` | `Screen.safeArea`; suwak można zostawić jako awaryjny |
| klawiatura i kółko myszy | `keydown`, `wheel` | skróty tylko w edytorze |
| ustawienia testowe (suwaki balansu) | `renderTests`, `SLIDERS` | menu debug / ScriptableObject |
| ankieta | `renderSurvey` | brak (ewentualnie link) |
| logi na Dysk Google, "Pobierz wyniki", notki stanu zapisu, `deviceId`, pole "Kto testuje" | `pushLog`, `downloadRun`, `logText` | analityka (np. Unity Analytics/Firebase) i eksport JSON w buildach deweloperskich |
| "Co nowego" (dziennik zmian) | `renderStart` | brak w wydaniu (ewentualnie "Nowości" dla graczy) |
| "Za reklamę", "Kontynuuj z 1 kryształem" (symulacja) | `renderShop`, `renderOver` | prawdziwe reklamy nagradzane (sekcja 03) |
| demonstracyjny loch za ekranem startowym | boot `p8b_ui.js` | może zostać (tło menu) |

## 10. Błędy, martwy kod i niespójności zauważone przy opisie

1. **`setHint` nic nie robi**, a wiele miejsc nadal na nim polega, więc te komunikaty znikły: wszystkie komunikaty sklepu (`m.msg`: "W talii: X.", "Za mało Esencji…", "Talia i schowek są pełne…", "Nowa oferta."), sprzedaż/schowek z karty talii, wskazówka "Celuj w pełne pole…" po 6 checkach bez krytyka (`run.critHinted` ustawiany, nic nie widać), wskazówki checku `run.checkHints`, wiadomość "Kryształ skradziony!" poza nauką, wieści o fali na starcie budowy i po stuknięciu "Fala X/10" (`#h-wave`), wiadomości o pauzie, załatanym wyłomie, postawionej budowli, cofnięciu. W Unity świadomie: albo przenieść ważne (np. błędy sklepu) na `note`/drganie przycisku, albo pominąć. **Poprawione w 1.12.1 częściowo:** komunikat sklepu (`m.msg`) pokazuje się w samym sklepie nad przyciskiem "Do budowy" (`.shopmsg`, 2,8 s, `p8b_ui.js: renderShop`), a stuknięcie "Fala X/10" otwiera kartę "Wieści z karczmy" (`renderNews`: tytuł = nazwa fali, treść = `waveHint()` podzielone na zdania, przycisk Zamknij). Reszta jak opisano.
2. **Toast martwy**: `#toast`, `hideToast`, `placeToast`, `hintMsg` nigdy nic nie pokazują. "Co nowego 1.0" i "Jak grać" nadal opisują znikające komunikaty i stuknięcie w "Fala X/10".
3. **Brak nazwy źródła strachu "heart"** w `FEAR_SRC` (`p8b_ui.js`): ciekawostka "Najbardziej przerażony" pokazuje "najbardziej bał się: heart", a karta bohatera "Strach w tej fali: heart 46" (widać na `07_summary.png` i `09_hero_card.png`). Dodać np. `heart: 'serce'`. **Poprawione w 1.12.1:** `FEAR_SRC` ma też `heart` (żar serca), `screams` (krzyki uciekających), `phobia` (fobia), `nightmare` (koszmary).
4. **Podwójny napis przy ulepszeniu dwoma stuknięciami**: `upgradeItem` dodaje "Poziom N" (`floatTile`), a `tapUpgrade` drugi raz przez `note`, więc w tym samym miejscu stoją dwa napisy. **Poprawione w 1.12.1:** `tapUpgrade` nie dodaje już `note`.
5. **Podzielony ekran chowa listę drużyny i strzałki**: `drawOffscreen` jest wołane tylko bez podziału, a `uiRects.list` zostaje z ostatniej klatki, więc stuknięcie w puste miejsce, gdzie była lista, nadal ją zwija/rozwija.
6. **"Jeszcze raz" na ekranie końca** woła `newRun(false)`, czyli pełną grę (etap 4), także w trakcie runów nauki 1-3; start zaproponowałby kolejny run nauki. Prawdopodobnie powinno iść przez `startGuided`, gdy `onbStage() ≤ 4`. **Poprawione w 1.12.1:** w etapach 1-4 "Jeszcze raz" woła `startGuided()`, potem `newRun(false)`.
7. **Karta `check` z TUT_POP** pokazuje się tylko w runie z przewodnikiem w toku (`tutEvent` wołany przy `run.tut ≥ 0`); po "Zakończ" w runie 1 albo w runach 2-4 ten opis nigdy się nie pojawi (inne karty działają w runach z nauki).
8. **Nieosiągalne okna**: `tests`, `item`, `upgrade` (z `renderPickSection`, `takeCard`, `renderReplace`, `cardBtn`). Tryby `upgrade` i `move` (`MODES`) nie mają kafelka, więc gałęzie `selected === 'upgrade'`/`'move'` w `drawSlots`, `drawCostLabels`, `handleTap` są martwe; `tapMove` nieużywane.
9. **Martwy kod rysowania i UI**: `drawFigure` (figurki 1.06), `figFeet`; `#btn-zoom`/`updateZoomBtn`, `#btn-speed`/`updateSpeedBtn`, `updatePauseBtn`, `essPulse` puste lub bez elementów; `#h-mult` zawsze pusty; `#h-hmark` zawsze ukryty; CSS `.focus`, `#btn-speed`, `#h-thr`, `.regen`, `.trayclosed` bez użycia; `DEFAULTS.trayAuto` nieużywane (podpis menu "pasek elementów" w Ustawieniach nie ma pokrycia); `tutFlags.trayFolded` nieużywane; `CK.g0/g1/r0/r1` (zielone i czerwone strefy sprzed 1.04) nieużywane, a "Co nowego 1.02" nadal opisuje zieloną/krwistą strefę; etykieta "Combo czeka" nigdy (zmienna `wait = false`); `buyCrystal`/`crystalCost` tylko dla testów.
10. **Rząd akcji sklepu** ma 3 kolumny, a przyciski są 2 (po usunięciu kupna kryształu w 1.05), więc trzecia kolumna jest pusta (widać na `08_shop.png`).
11. **Tarcie cząsteczek** ×0,9 na klatkę zależy od liczby klatek; w Unity użyć `0,9^(60·dt)`.
12. **Dymki ucinają tekst** po 2 liniach (`wrapText` zwraca najwyżej 2), bez wielokropka.
13. **Legenda checku**: warunek `run.checkHints >= 0` jest zawsze prawdziwy, więc legenda pokazuje się w pierwszych 3 checkach każdej fali (prawdopodobnie zamierzone, ale licznik `checkHints` nie ma już sensu).
