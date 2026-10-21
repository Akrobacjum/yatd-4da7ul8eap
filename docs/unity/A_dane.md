# Załącznik A: dane wyeksportowane z prototypu

Katalog `data/` to dosłowny eksport tabel z `src/p1_config.js` (Prototype 1.13.1), zrobiony skryptem `tools/dump.js` (node wykonuje plik konfiguracji i zapisuje każdą tabelę jako JSON). Funkcje w tabelach są zapisane jako tekst z prefiksem `fn: `, zbiory (`Set`) jako tablice. Nic nie było przepisywane ręcznie.

- `yatd_content_1.13.1.json`: wszystkie tabele w jednym pliku: `{ version, source, tables: { ITEMS: ..., UPGRADES: ..., ... } }`. Ten plik warto wczytać w Unity.
- `<NAZWA>.json`: ta sama tabela osobno (wygodne do czytania i porównań).
- `levelStats_1_30.json`: wynik `levelStats(L)` dla poziomów 1-30 (zaokrąglone do 4 miejsc).
- `golden_1.13.1.json`: wartości policzone przez działający prototyp do testów (sekcja 09).

Znaczenie i użycie każdej wartości opisują sekcje 03-08; poniżej skrót pól.

## A.1 Treść gry

| Plik | Kształt | Pola i znaczenie |
|---|---|---|
| `ITEMS` | słownik `id -> element` (53) | `name` nazwa; `cost` koszt w Esencji; `slot` miejsce: `floor`, `wall`, `door`, `object`, `roomtype` (opis w `SLOT_LABEL`); `tag` krótka cecha pod nazwą kafelka; `desc` opis po przytrzymaniu; `cd` odnowienie w s; `hp`, `melee` dla potworów; `build: true` budowla-kontra (tylko między falami, w pokoju, jedna na pokój); `tool: true` narzędzie lochu (kopanie, typy pokoi); `rt` typ pokoju nadawany przez narzędzie; `rarity` dla łupu (1-3: zasięg widzenia); `mode` dla trybów (Ulepsz, Przenieś) |
| `TABS` | lista zakładek paska | `id`, `label`, `items` (kolejność kafelków), od 1.14 opcjonalnie `subs`: lista `{id, label, items}` (Pułapki i Potwory: `dmg` Rany, `fear` Strach; 08). `ITEM_ORDER` = wszystkie kafelki po kolei |
| `START_UNLOCKED` | lista id | elementy dostępne od startu runu (reszta przez karty "Nowa pułapka/potwór"; od 1.14 odkryte zostają na stałe, 03 3.8) |
| `TRAPS`, `MONSTERS`, `SCARE`, `CURSED`, `DRIFT`, `BUILDINGS`, `TOOLS`, `MODES`, `DISARMABLE`, `SMASHABLE_OBJ` | zbiory `id -> 1` | przynależność: pułapka, potwór, tylko straszy, przeklęte (kapłan zdejmuje), potwór dryfujący za bohaterami, budowla, narzędzie, tryb, da się rozbroić, barbarzyńca rozbija |
| `LOOKS_TRAP` | funkcja | co bohaterowie biorą za pułapkę (pułapki i Wabik) |
| `UPG_COST` | `[0, 0, 2, 4]` | mnożnik kosztu elementu przy ulepszeniu na poziom 2 i 3 |
| `TRAITS` | `id -> [nazwa, opis]` | cecha poziomu 3 każdego elementu |
| `ARM_TIME` | 2 | czas uzbrajania pułapki postawionej w trakcie fali (s) |
| `DMG_OF`, `DMG_TYPES` | `id -> typ`, `typ -> nazwa` | typ obrażeń elementu: `pierce` kłute, `blunt` obuchowe, `fire` ogień, `poison` trucizna |
| `LOOT_KIND`, `LOOT_GREED` | `id -> rodzaj`, `rodzaj -> [zobaczony, zabrany]` | rodzaje łupu (złoto, mikstura, sprzęt, relikwia, przeklęty) i ile chciwości dają |
| `SIZE_BONUS` | 0,05 | dodatek chciwości za rozległość lochu (sekcja 03) |
| `ROOMTYPES`, `RT_INFO` | `narzędzie -> typ`, `typ -> {name, item, glyph, color}` | typy pokoi i ich znaczek na mapie |
| `OBJ_KINDS` | lista | rodzaje mebli: beczka, skrzynia, posąg, półka |
| `HEART` | `{kind: 'heart'}` | znacznik serca w układzie |
| `CGX`, `ROCK`, `WW` | liczby | stałe siatki z pliku konfiguracji (`WW`, `WH` są przeliczane z układu lochu, sekcja 07) |

## A.2 Bohaterowie

| Plik | Pola i znaczenie |
|---|---|
| `HEROES` | klasa -> `name` [forma męska, żeńska], `hp` bazowe, `speed` pól/s, `dps`, `color` klasy, `letter`, `greed` (jak bardzo ciągnie do łupu) |
| `PARTY`, `CLASSIC`, `LEADER_ORDER` | wszystkie 6 klas; 4 klasyczne (fale 1-3); kolejność do wyboru przywódcy |
| `CLASS_RES`, `CLASS_RES_TEXT` | mnożniki obrażeń według typu dla klasy i ich opis |
| `CLASS_SKILL` | krótki opis umiejętności klasy (karta bohatera) |
| `HERO_TRAITS` | osobowość -> `name` [m, ż], `w` waga losowania |
| `PHYS`, `SCAR_RES` | ciało -> `name` [m, ż], `res` {typ: mnożnik}, `text`; blizna po ranach danego typu -> ciało |
| `PHOBIAS`, `PHOBIA_OF_ATTR` | fobia -> `name`, `attrs` (źródła strachu), `types` (typy obrażeń), `sees` (co widziane straszy), `srcs`, `dark` (ciemność, samotność, zgubienie); źródło -> fobia, którą może wynieść uciekinier |
| `KIT` | klasa -> wagi przedmiotów w ekwipunku |
| `HITEMS` | przedmiot bohatera -> `name`, `acc` (biernik), `g` (rodzaj gramatyczny), `w` waga, `use` (`once`, `power` z odnowieniem `cd`, `gear`), `loot` (może pochodzić z łupu) |
| `GEAR_POOL` | przedmioty, które mogą wypaść z łupu sprzętu |
| `TIERS` | progi rang bohaterów (`min` poziom, `name` [m, ż], `color`) |
| `levelStats_1_30` | statystyki poziomu: `hp`, `courage`, `dps`, `pow` (mnożniki), `speed`, `avoid`, `learn`, `detect`, `disarm`, `fail`, `rumor`, `risk`, `panic`, `potion`, `coord`, `caution`, `dodge`, `shield`, `shieldCd`, `calm`, `sapper`, `sight` (znaczenie: sekcja 04 i 06) |
| `BOSS_NAME` | tytuły bossów: czempion, bohater z przepowiedni [m, ż] |
| `NAMES_M`, `NAMES_F` | imiona w trzech przypadkach: mianownik, biernik, wołacz |

## A.3 Karty i sklep

| Plik | Pola i znaczenie |
|---|---|
| `UPGRADES` (113) | `id`; `kind`: `unlock` (odblokowanie elementu, pole `unlock`), `instant` (działa raz przy kupnie), `card` (leży w talii i działa przez `apply` na `mods`); `rar`: `c` zwykła, `r` rzadka, `l` legendarna; `name`, `text`, `tag`; `unique` (tylko jedna kopia); `req` (wymagane odblokowanie: id albo funkcja); `grows` (karta z licznikiem rosnącym w runie, np. Głodne kolce); `apply` (kod efektu). Pełna tabela: załącznik B |
| `RAR_NAME`, `RARITY_NAME` | nazwy rzadkości kart i łupu |
| `DECK_SIZE` | 7 miejsc w talii |
| `RANKS` | progi rang lochu z sumy Esencji w runie: Nora 0, Piwnica 150, Loch 400, Labirynt 1000, Twierdza grozy 2500, Legenda 6000 |

## A.4 Ekonomia i ustawienia

| Plik | Pola i znaczenie |
|---|---|
| `GZ` | ile Grozy daje zdarzenie (względem bohatera): `dmg` 1,5 (całe HP), `fear` 1,6 (pełny pasek), `kill` 1,2, `scare` 2,5 (wypędzenie), `lost` 0,12 i `alone` 0,09 (na sekundę), `loot` 0,4, `heal` 0,45, `web` 0,25, `cage` 0,45, `crystal` 4 (szczegóły i miejsca użycia: sekcja 03) |
| `DMG_FACTOR`, `MON_FACTOR` | mnożnik Grozy z obrażeń według źródła (pułapka 1, łup 1, podpalenie 1, potwór 0,4, serce 0, inne 0); potwory 0,4 |
| `COMBO_POW`, `COMBO_HP` | 0,12 (siła pułapek na stopień combo), 0,2 (dodatkowe HP bohaterów od fali 5); funkcja `comboHp` w kodzie |
| `DEFAULTS` | wartości domyślne ustawień i balansu: `waveTime` 120 (cierpliwość), `scale` 1, `heroHp` 100, `heroSpeed` 100, `dmg` 0,7, `monDmg` 1, `essence` 30, `deckSize` 7, `waveIncome` 8, `regenBase` 0, `fearRate` 1, `essenceCap` 40 (nieużywany limit, sekcja 03), `crystals` 3, `comboWin` 3 (okno combo w s), `comboQuiet` 0,25 (zegar combo w ciszy), `essK` 1,1 (mnożnik Esencji z Grozy), `checkDiff` 1, `ffSpeed` 3, `thrBase` 1500, `depthMax` 2,4, `volume` 0,6, `hungerBase` 37, `hungerGrowth` 1,25, `greedW` 1, `autoFF` 1,5, `earlyHp` 1, `music` 0,5, `haptics` 1, `trayAuto` 1, `series` 1, `split` 1, `topPad` 0 |
| `GAME_SETTINGS` | ustawienia gracza (zapisywane): głośność efektów, muzyka, wibracje, seria checków, dzielenie ekranu, trudność checków, autoprzyspieszenie... (`k`, `label`, zakres albo `toggle`) |
| `SLIDERS` | suwaki balansu z "Ustawień testowych" (tylko prototyp: w Unity jako menu deweloperskie) |
| `RUN_WAVES` | 10 |
| `ONB_FULL`, `ONB_ITEM`, `ONB_CARD`, `ONB_STAGES` | pierwsze runy (1.12): etap pełnej gry (4), od którego etapu jest element i karta, nazwy i karty nowości etapów (sekcja 03 i 08) |

## A.5 Teksty bohaterów

| Plik | Pola i znaczenie |
|---|---|
| `SAY` (217 kluczy) | klucz sytuacji -> lista kwestii do losowania. Kiedy pada który klucz i z jakim priorytetem: sekcja 06 |
| `CHAT_REPLY` | kwestia -> lista odpowiedzi (krótkie rozmowy w drużynie) |
| `CONVO` (od 1.13, 74 zestawy, 143 wymiany, 305 kwestii) | klucz kwestii, która zaczyna rozmowę (klucz `SAY`, przy zagnieżdżonych `trap:spikes`, `phobia:fire`; `monsterDown` bez własnej kwestii: zabicie potwora; `scare` przez `CONVO_ALIAS`) -> lista wymian `{ l: [[mówiący, tekst], ...], b, bt, br, bv, ac, at, w }`: mówiący `A` (ten, kto powiedział kwestię), `B` (przyjaciel w zasięgu słuchu), `C` (ktoś trzeci); `b`/`bt` klasa/charakter B (jedna wartość albo lista), `br`/`bv` ranga B najwyżej/najmniej, `ac`/`at` klasa/charakter A, `w` waga. Mechanika: sekcja 06 (6.7.5a) |
| `CONVO_ALIAS` | klucz -> zestaw zastępczy (straszące pułapki -> `scare`) |
| `SOLO` (od 1.13.1, 38 kluczy, 89 kwestii) | klucz `SAY` -> kwestie, które bohater mówi zamiast niej, gdy nikt go nie słyszy (myślenie na głos); `chat`, `chat_<charakter>`, `chat_<klasa>` = jego small talk w samotności. Mechanika: sekcja 06 (6.7.5b) |
| `SOLO_MUTE` | klucze kwestii, które bez słuchaczy w ogóle nie padają (odpowiedzi, zachęty, spory, podziękowania) |
| `CONVO_P` | klucz -> szansa, że kwestia zacznie rozmowę (0,15 przy "Ał!", do 0,9 przy wpadkach i rzadkich chwilach) |

Znaczniki w tekstach (trzeba je obsłużyć w lokalizacji):
- `{męska|żeńska}` forma zależna od płci mówiącego, np. `Byłem|Byłam` (`p1_config.js: gtext`),
- `{n}`, `{a}`, `{v}` imię w mianowniku, bierniku i wołaczu (`p1_config.js: nameFill`, dane w `NAMES_M`/`NAMES_F`).
- w `CONVO` (od 1.13): `{A:męska|żeńska}`, `{B:...}`, `{C:...}` forma zależna od płci innej osoby rozmowy, `{An}` `{Aa}` `{Av}` (i tak samo B, C) jej imię w trzech przypadkach (`p5_ai.js: convoFill`); `{męska|żeńska}` bez litery to nadal płeć mówiącego.

Polszczyzna gry odmienia imiona i formy płci; przy tłumaczeniu na angielski większość znaczników znika, ale klucze muszą zostać te same.

## A.6 Wartości wzorcowe (`golden_1.13.1.json`)

Policzone na zbudowanym prototypie (`newRun(false)`, pełna gra, domyślne ustawienia): `waves[n]` dla fal 1-20 (`partySize`, `waveSize`, `waveCurve`, `waveBase`, `hungerNeed`, `comboHp`), `greedCurve` (surowa -> chciwość), `prices` (c 6, r 10, l 16, unlock 8), `rerollCost0` (pierwsze odświeżenie), `stashCap` (3), `toolCosts` na wylosowanym lochu startowym, `crystals` 3, `essenceStart` 24 (po postawieniu dwóch pułapek), `deckSize` 7, `mods` (wszystkie modyfikatory kart z wartościami domyślnymi), `S` (wszystkie ustawienia). Skrypt: `tools/golden.py`.
