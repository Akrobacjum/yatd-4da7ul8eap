# Załącznik A: dane wyeksportowane z prototypu

Katalog `data/` to dosłowny eksport tabel z `src/p1_config.js` (wszystkie pliki tabel przeeksportowane na Prototype 1.17.1; **nie przeeksportowane na 1.24**: tabele zmienione i nowe w 1.18-1.24 są wymienione w A.9 i trzeba je wyeksportować `tools/dump.js` przed użyciem w Unity, albo czytać z `src/p1_config.js` 1.24; od 1.13.1 zmieniły się `TABS` w 1.14, w 1.15 `ITEMS`, `ITEM_ORDER`, `START_UNLOCKED`, `ONB_ITEM`, `TOOLS`, `SLOT_LABEL` i nowe `KIND_INFO`, `KINDS`, `KIND_OF`, `KIND_POW`, `KIND_COST`, w 1.16 `GZ` i `SAY`, w 1.17 tabele kwestii `SAY`, `SOLO`, `SOLO_MUTE`, `CHAT_REPLY`, `CONVO` i `CONVO_P`, w 1.17.1 `SAY`, `SOLO`, `SOLO_MUTE`, `CONVO`, `CONVO_P` i nowa `LINE_NEEDS`), zrobiony skryptem `tools/dump.js` (node wykonuje plik konfiguracji i zapisuje każdą tabelę jako JSON). Funkcje w tabelach są zapisane jako tekst z prefiksem `fn: `, zbiory (`Set`) jako tablice. Nic nie było przepisywane ręcznie.

- `yatd_content_1.17.1.json`: wszystkie tabele w jednym pliku: `{ version, source, tables: { ITEMS: ..., UPGRADES: ..., ... } }` (83 tabele; 1.17: 82, doszła `LINE_NEEDS`), złożony z plików tabel poniżej (stan 1.17.1; zastąpił `yatd_content_1.17.json`). Ten plik warto wczytać w Unity.
- `<NAZWA>.json`: ta sama tabela osobno (wygodne do czytania i porównań).
- `levelStats_1_30.json`: wynik `levelStats(L)` dla poziomów 1-30 (zaokrąglone do 4 miejsc).
- `golden_1.13.1.json`: wartości policzone przez działający prototyp do testów (sekcja 09).

Znaczenie i użycie każdej wartości opisują sekcje 03-08; poniżej skrót pól.

## A.0 Stan danych a Prototype 1.24

Eksport w `data/` odpowiada 1.17.1. Różnice w 1.24 (szczegóły A.9): `ITEMS` (zapadnia `cost` 6 i opis z limitem upadków), `HITEMS` (narzędzia `lantern`, `crowbar`, pole `kg` i `tool`), `LOOT_GREED` (`body`), `UPGRADES` (140 kart), `ONB_CARD` (karty 1.18), `DEFAULTS` (`calmWaves`, `calmGap`, `okPulse`, `okSwing`), tabele kwestii `SAY`, `SOLO`, `CONVO`, `LINE_NEEDS` (A.5), nowe `ONB_WAVE`, `CARRY`, `CLASS_FIT`, `FUSE_POW`, `FUSE_K`, `FUSE_GROUP`, `FUSE_INT`, `FUSE_TEXT` oraz funkcje `SCARES`, `HURTS`, `fitOf`, `onbWaveStage`. Plik zbiorczy powinien dostać nazwę `yatd_content_1.24.json`.

## A.1 Treść gry

| Plik | Kształt | Pola i znaczenie |
|---|---|---|
| `ITEMS` | słownik `id -> element` (65; od 1.15 także 12 komnat `k_*`) | `name` nazwa; `cost` koszt w Esencji; `slot` miejsce: `floor`, `wall`, `door`, `object`, `roomtype`, od 1.15 `roomkind` (opis w `SLOT_LABEL`); `tag` krótka cecha pod nazwą kafelka; `desc` opis po przytrzymaniu; `cd` odnowienie w s; `hp`, `melee` dla potworów; `build: true` budowla-kontra (tylko między falami, w pokoju, jedna na pokój); `tool: true` narzędzie lochu (kopanie, typy pokoi); `rt` typ pokoju nadawany przez narzędzie; `rarity` dla łupu (1-3: zasięg widzenia); `mode` dla trybów (Ulepsz, Przenieś) |
| `TABS` | lista zakładek paska | `id`, `label`, `items` (kolejność kafelków), od 1.14 opcjonalnie `subs`: lista `{id, label, items}` (Pułapki i Potwory: `dmg` Rany, `fear` Strach; od 1.15 Loch: `dig` Kopanie, `kind` Komnaty, `effect` Efekty; 08). `ITEM_ORDER` = wszystkie kafelki po kolei |
| `START_UNLOCKED` | lista id | elementy dostępne od startu runu (reszta przez karty "Nowa pułapka/potwór"; od 1.14 odkryte zostają na stałe, 03 3.8) |
| `TRAPS`, `MONSTERS`, `SCARE`, `CURSED`, `DRIFT`, `BUILDINGS`, `TOOLS`, `MODES`, `DISARMABLE`, `SMASHABLE_OBJ` | zbiory `id -> 1` | przynależność: pułapka, potwór, tylko straszy, przeklęte (kapłan zdejmuje), potwór dryfujący za bohaterami, budowla, narzędzie, tryb, da się rozbroić, barbarzyńca rozbija |
| `LOOKS_TRAP` | funkcja | co bohaterowie biorą za pułapkę (pułapki i Wabik) |
| `UPG_COST` | `[0, 0, 2, 4]` | mnożnik kosztu elementu przy ulepszeniu na poziom 2 i 3 |
| `TRAITS` | `id -> [nazwa, opis]` | cecha poziomu 3 każdego elementu |
| `ARM_TIME` | 2 | czas uzbrajania pułapki postawionej w trakcie fali (s) |
| `DMG_OF`, `DMG_TYPES` | `id -> typ`, `typ -> nazwa` | typ obrażeń elementu: `pierce` kłute, `blunt` obuchowe, `fire` ogień, `poison` trucizna |
| `LOOT_KIND`, `LOOT_GREED` | `id -> rodzaj`, `rodzaj -> [zobaczony, zabrany]` | rodzaje łupu (złoto, mikstura, sprzęt, relikwia, przeklęty) i ile chciwości dają |
| `SIZE_BONUS` | 0,05 | dodatek chciwości za rozległość lochu (sekcja 03) |
| `ROOMTYPES`, `RT_INFO` | `narzędzie -> typ`, `typ -> {name, item, glyph, color}` | efekty pokoi (dawniej typy pokoi) i ich znaczek na mapie |
| `KIND_INFO`, `KINDS`, `KIND_OF` (od 1.15) | `komnata -> {name, item, items, tag, glyph, color}`, `narzędzie -> komnata`, `element -> komnata` | komnaty: rodzina (`items`), opis rodziny na kafelku (`tag`), znak i kolor (05, 5.8a) |
| `KIND_POW`, `KIND_COST` (od 1.15) | 1,25; 12 | dodatkowa moc elementu rodziny, który ma już 3. poziom; cena komnaty |
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
| `UPGRADES` (113 w eksporcie 1.17.1; 140 w 1.24, załącznik B) | `id`; `kind`: `unlock` (odblokowanie elementu, pole `unlock`), `instant` (działa raz przy kupnie), `card` (leży w talii i działa przez `apply` na `mods`); `rar`: `c` zwykła, `r` rzadka, `l` legendarna; `name`, `text`, `tag`; `unique` (tylko jedna kopia); `req` (wymagane odblokowanie: id albo funkcja); `grows` (karta z licznikiem rosnącym w runie, np. Głodne kolce); `apply` (kod efektu). Pełna tabela: załącznik B |
| `RAR_NAME`, `RARITY_NAME` | nazwy rzadkości kart i łupu |
| `DECK_SIZE` | 7 miejsc w talii |
| `RANKS` | progi rang lochu z sumy Esencji w runie: Nora 0, Piwnica 150, Loch 400, Labirynt 1000, Twierdza grozy 2500, Legenda 6000 |

## A.4 Ekonomia i ustawienia

| Plik | Pola i znaczenie |
|---|---|
| `GZ` | ile Grozy daje zdarzenie (względem bohatera): `dmg` 1,5 (całe HP), `fear` 1,6 (pełny pasek), `kill` 1,2, `scare` 2,5 (wypędzenie), `lost` 0,12, `alone` 0,09 i `split` 0,04 (zwiad, 1.16) (na sekundę), `loot` 0,4, `heal` 0,45, `web` 0,25, `cage` 0,45, `crystal` 4 (szczegóły i miejsca użycia: sekcja 03) |
| `DMG_FACTOR`, `MON_FACTOR` | mnożnik Grozy z obrażeń według źródła (pułapka 1, łup 1, podpalenie 1, potwór 0,4, serce 0, inne 0); potwory 0,4 |
| `COMBO_POW`, `COMBO_HP` | 0,12 (siła pułapek na stopień combo), 0,2 (dodatkowe HP bohaterów od fali 5); funkcja `comboHp` w kodzie |
| `DEFAULTS` | wartości domyślne ustawień i balansu: `waveTime` 120 (cierpliwość), `scale` 1, `heroHp` 100, `heroSpeed` 100, `dmg` 0,7, `monDmg` 1, `essence` 30, `deckSize` 7, `waveIncome` 8, `regenBase` 0, `fearRate` 1, `essenceCap` 40 (nieużywany limit, sekcja 03), `crystals` 3, `comboWin` 3 (okno combo w s), `comboQuiet` 0,25 (zegar combo w ciszy), `essK` 1,1 (mnożnik Esencji z Grozy), `checkDiff` 1, `ffSpeed` 3, `thrBase` 1500, `depthMax` 2,4, `volume` 0,6, `hungerBase` 37, `hungerGrowth` 1,25, `greedW` 1, `autoFF` 1,5, `earlyHp` 1, `music` 0,5, `haptics` 1, `trayAuto` 1, `series` 1, `split` 1, `topPad` 0 |
| `GAME_SETTINGS` | ustawienia gracza (zapisywane): głośność efektów, muzyka, wibracje, seria checków, dzielenie ekranu, trudność checków, autoprzyspieszenie... (`k`, `label`, zakres albo `toggle`) |
| `SLIDERS` | suwaki balansu z "Ustawień testowych" (tylko prototyp: w Unity jako menu deweloperskie) |
| `RUN_WAVES` | 10 |
| `ONB_FULL`, `ONB_ITEM`, `ONB_CARD`, `ONB_STAGES` | pierwsze runy (1.12): etap pełnej gry (4), od którego etapu jest element i karta, nazwy i karty nowości etapów (sekcja 03 i 08) |

## A.5 Teksty bohaterów

**Rozmiary tabel kwestii (jedyne miejsce w tym pliku z liczbami; 1.17.1 i wcześniej policzone na `data/*.json`, 1.18-1.24 policzone na `src/p1_config.js` danej wersji):**

| Tabela | 1.24 | 1.17.1 | 1.17 | 1.16.1 |
|---|---|---|---|---|
| `SAY` | 376 kluczy, 4107 kwestii | 272 klucze, 3173 kwestie (z zagnieżdżonymi) | 269 kluczy, 2535 kwestii | 222 klucze, 669 kwestii |
| `SOLO` | 84 klucze, 517 kwestii | 68 kluczy, 434 kwestie | 67 kluczy, 431 kwestii | 38 kluczy, 89 kwestii |
| `SOLO_MUTE` | 40 kluczy | 40 kluczy | 39 kluczy | 35 kluczy |
| `CHAT_REPLY` | 75 zaczepek, 206 odpowiedzi | 75 zaczepek, 206 odpowiedzi | 75 zaczepek, 206 odpowiedzi | 19 zaczepek, 31 odpowiedzi |
| `CONVO` | 103 zestawy, 635 wymian, 1429 kwestii | 87 zestawów, 520 wymian, 1125 kwestii | 85 zestawów, 497 wymian, 1073 kwestie | 74 zestawy, 143 wymiany, 305 kwestii |
| `CONVO_P` | 80 kluczy (nowe zestawy 1.19-1.23 bez wpisu: szansa domyślna 0,5) | 80 kluczy | 78 kluczy | 67 kluczy |
| `LINE_NEEDS` | 57 tagów, 900 wpisów (899 różnych kwestii) | 57 tagów, 803 wpisy (802 różne kwestie) | - | - |

Przyrost `SAY` po wersjach (klucze, kwestie): 1.18 +3, +14 (`bodyFound`, `lullNap`, `lullDream`); 1.19 +19, +185 (Rozłam); 1.20 +24, +164 (ekwipunek); 1.21 +25, +250 (więzi); 1.22 +19, +185 (finał); 1.23 +14, +136 (Nemezis). Listy kluczy: sekcja 06 (6.3.14, 6.10.4, 6.11.6, 6.12.9, 6.13.7, 6.14.5).

`CHANGES1171.md` podaje w przybliżeniu "SAY ~3180 kwestii, SOLO 437"; policzone na eksporcie wychodzi 3173 i 434 (do porównań brać tabelę wyżej).

`CHANGES117.md` podaje dla stanu przed 1.17 inne liczby `SAY` (230 kluczy, 684 kwestie), a kod i eksport 1.16.1 mają 222 klucze i 669 kwestii; do porównań brać tabelę wyżej.

| Plik | Pola i znaczenie |
|---|---|
| `SAY` | klucz sytuacji -> lista kwestii do losowania. Kiedy pada który klucz i z jakim priorytetem: sekcja 06 |
| `CHAT_REPLY` | kwestia -> lista odpowiedzi (krótkie rozmowy w drużynie) |
| `CONVO` (od 1.13) | klucz kwestii, która zaczyna rozmowę (klucz `SAY`, przy zagnieżdżonych `trap:spikes`, `phobia:fire`; `monsterDown` bez własnej kwestii: zabicie potwora; `scare` przez `CONVO_ALIAS`) -> lista wymian `{ l: [[mówiący, tekst], ...], b, bt, br, bv, ac, at, w }`: mówiący `A` (ten, kto powiedział kwestię), `B` (przyjaciel w zasięgu słuchu), `C` (ktoś trzeci); `b`/`bt` klasa/charakter B (jedna wartość albo lista), `br`/`bv` ranga B najwyżej/najmniej, `ac`/`at` klasa/charakter A, `w` waga. Mechanika: sekcja 06 (6.7.5a) |
| `CONVO_ALIAS` | klucz -> zestaw zastępczy (straszące pułapki -> `scare`) |
| `SOLO` (od 1.13.1) | klucz `SAY` -> kwestie, które bohater mówi zamiast niej, gdy nikt go nie słyszy (myślenie na głos); `chat`, `chat_<charakter>`, `chat_<klasa>` = jego small talk w samotności. Mechanika: sekcja 06 (6.7.5b) |
| `SOLO_MUTE` | klucze kwestii, które bez słuchaczy w ogóle nie padają (odpowiedzi, zachęty, spory, podziękowania; od 1.17.1 `saw`) |
| `LINE_NEEDS` (od 1.17.1) | tag -> lista dokładnych tekstów kwestii (z `SAY`, `SOLO`, `CONVO`, `CHAT_REPLY`, przed rozwinięciem znaczników), które wolno powiedzieć tylko bohaterowi, który zna ten tag w tej fali (widział, poczuł, nosi). Tagi: pułapki `fire`, `blast`, `spikes`, `arrows`, `gate`, `trapdoor`, `cage`, `web`, `mimic`, `portrait`, `mirror`, `coffin`, `bones`, `eyes`, `musicbox`, `creak`; potwory `spider`, `ghost`, `shade`, `bats`, `monster`; łup `gold`, `potion`, `gear`, `relic`, `cursed`; efekty `fog`, `swamp`, `grotto`, `crypt`, `vault`, `haven`, `gears`, `hush`, `ice`; komnaty `k_<rodzaj>` (12); budowle `acid`, `altar`, `decoy`, `howl`, `rune`, `shackles`, `veil`; oraz `death`, `blood`, `heartSeen`. Kwestia może mieć kilka tagów (wszystkie muszą być znane; jedyna taka w danych: "Coś tu patrzy z trumien." = `coffin` + `crypt`). Kwestie `SAY.saw.<tag>` nie są w tej tabeli: kod sam dokłada im ich tag. Mechanika: sekcja 06 (6.7.10) |
| `CONVO_P` | klucz -> szansa, że kwestia zacznie rozmowę (0,15 przy "Ał!", do 0,9 przy wpadkach i rzadkich chwilach) |

Co doszło w 1.17 (żaden klucz nie zniknął):
- `SAY`, 47 nowych kluczy: `fogGrope`, `gateLever`, `trapGeneric`, small talk `chatHurt`, `chatScared`, `chatGold`, `chatRich`, `chatIdle`, narada `councilOpen`, `voteHome`, `voteStorm`, `voteMore`, `councilGiveIn`, `decideHome`, `decideStorm`, `decideMore`, `goHomeAlone`, `outvotedHome`, `outvotedStorm`, `outvotedMore`, rozglądanie `lookStart`, `lookEnd`, `lookWant`, `lookHurry`, `lookStay`, `lookObj`, `lookProp`, `lookKind`, `lookWall`, `lookFind`, `lookNothing`, dźwięk `hearSound`, `hearScream`, oraz `shieldLead`, `deliberate2`, `blessDone`, `blessHit`, `deathHeard`, `tellDeath`, `newsDeath`, `leftBehind`, `searchFail`, `lootPotion`, `lootPotionNeed`, `lootPotionSeen`, `lootObey`, `curseSelf`. Kiedy który pada: sekcja 06 (6.7.9).
- Zagnieżdżone klucze `SAY` (obiekt rodzaj -> lista): `trap` (16 rodzajów pułapek), `trauma`, `weakHit`, `resistHit` (4 typy obrażeń), `phobia` (6 fobii) i nowe w 1.17 `lookObj` (`barrel`, `crate`, `statue`, `shelf`), `lookProp` (`portrait`, `mirror`, `eyes`, `coffin`, `bones`), `lookKind` (12 rodzajów komnat: `goblin`, `spider`, `ogre`, `haunt`, `bats`, `ossuary`, `armory`, `forge`, `prison`, `junk`, `gallery`, `nursery`). Do 1.16.1 `SAY.trap[rodzaj]` był jednym tekstem, od 1.17 to lista 3 kwestii; kod losuje przez `pickS` (`p1_config.js`: lista -> losowa kwestia, tekst -> ten tekst), więc port powinien przyjmować obie postaci.
- `SOLO`, 29 nowych kluczy: `councilOpen`, `decideHome`, `decideStorm`, `decideMore`, `lookStart`, `lookEnd`, `scoutBack`, `partyFlee`, `gateLever`, `detour`, `detourBack`, `fogGrope`, `searchLost`, `leaveLost`, `heartLater`, `prophecy`, `gateReroute`, `disarm`, `chatFlee`, `rtFog`, `rtSwamp`, `rtGrotto`, `rtGears`, `rtIce`, `rtVault`, `rtHaven`, `shieldLead`, `hearSound`, `hearScream`.
- `SOLO_MUTE`: doszły `prepWard`, `prepJam`, `prepDisarm`, `prepShield` (przygotowania specjalistów bez słuchaczy nie padają).
- `CHAT_REPLY`: 17 zaczepek zostało (z większą liczbą odpowiedzi), 2 wypadły (`Nie siadaj na tej płycie!`, `Ta płyta jest luźna. Omijamy.`), 58 nowych. Kluczem jest surowy tekst zaczepki z `SAY` (ze znacznikami płci, przed ich rozwinięciem, small talk w `p5_ai.js: partyThink`), więc zmiana tekstu w `SAY` bez zmiany klucza w `CHAT_REPLY` urywa odpowiedzi.
- `CONVO` i `CONVO_P`, 11 nowych zestawów z szansą zaczęcia: `lookObj` 0,35, `lookKind` 0,45, `lookProp:portrait`, `lookProp:mirror`, `lookProp:coffin` po 0,45, `lookFind` 0,6, `lookNothing` 0,25, `newsDeath` 0,7, `deathHeard` 0,6, `goHomeAlone` 0,8, `councilGiveIn` 0,5. Istniejące zestawy dostały więcej wymian (143 -> 497).

Co doszło w 1.17.1 (żaden klucz nie zniknął):
- `SAY`, 3 nowe klucze: `saw` (mapa tag -> 9 kwestii, 58 tagów = 522 kwestie: pułapki 16, potwory 8, łup 5, efekty 9, komnaty `k_*` 12, budowle 8; pogaduszki o tym, co bohater widział w tej fali), `rkEnter` (mapa `k_<komnata>` -> 9 kwestii, 12 komnat = 108 kwestii; pierwszy w pokoju z komnatą mówi, co to za miejsce), `staunch` (6 kwestii: kapłan tamuje krwawienie). `SAY.phobia.spiders` +2 kwestie o pajęczynie (8), 2 kwestie `smashB` przepisane tak, żeby pasowały do każdej budowli. Tagi `SAY.saw` to tagi pamięci (6.7.10) z wyjątkiem `monster`, `death`, `blood`, `heartSeen`; mają za to `goblin`, `archer`, `ogre`, `shaman` i `fortify`, których nie ma w `LINE_NEEDS`.
- `SOLO`: `staunch` (3 kwestie). `SOLO_MUTE`: `saw` (o tym, co widział, nie mówi do siebie).
- `CONVO` i `CONVO_P`: `saw` (15 wymian, szansa 0,45; kwestie `saw:<tag>` trafiają do zestawu bazowego `saw`), `rkEnter` (8 wymian, 0,4).
- `LINE_NEEDS`: nowa tabela (wyżej).

Znaczniki w tekstach (trzeba je obsłużyć w lokalizacji):
- `{męska|żeńska}` forma zależna od płci mówiącego, np. `Byłem|Byłam` (`p1_config.js: gtext`),
- `{n}`, `{a}`, `{v}` imię w mianowniku, bierniku i wołaczu (`p1_config.js: nameFill`, dane w `NAMES_M`/`NAMES_F`),
- od 1.17 `{g}` imię w dopełniaczu (`p1_config.js: nameGen`: mężczyzna = jego biernik, kobieta = mianownik z końcówką `-ia` -> `-ii`, `-ka`/`-ga`/`-la` -> `-ki`/`-gi`/`-li`, inne `-a` -> `-y`); używają go `leaveLost` i `hearScream` (5 kwestii w `SAY`), w `SOLO` i `CONVO` go nie ma. Jak pozostałe znaczniki imion, `nameFill` podmienia tylko pierwsze wystąpienie w kwestii.
- w `CONVO` (od 1.13): `{A:męska|żeńska}`, `{B:...}`, `{C:...}` forma zależna od płci innej osoby rozmowy, `{An}` `{Aa}` `{Av}` (i tak samo B, C) jej imię w trzech przypadkach (`p5_ai.js: convoFill`); `{męska|żeńska}` bez litery to nadal płeć mówiącego.

Polszczyzna gry odmienia imiona i formy płci; przy tłumaczeniu na angielski większość znaczników znika, ale klucze muszą zostać te same.

## A.6 Wartości wzorcowe (`golden_1.13.1.json`)

Policzone na zbudowanym prototypie (`newRun(false)`, pełna gra, domyślne ustawienia): `waves[n]` dla fal 1-20 (`partySize`, `waveSize`, `waveCurve`, `waveBase`, `hungerNeed`, `comboHp`), `greedCurve` (surowa -> chciwość), `prices` (c 6, r 10, l 16, unlock 8), `rerollCost0` (pierwsze odświeżenie), `stashCap` (3), `toolCosts` na wylosowanym lochu startowym, `crystals` 3, `essenceStart` 24 (po postawieniu dwóch pułapek), `deckSize` 7, `mods` (wszystkie modyfikatory kart z wartościami domyślnymi), `S` (wszystkie ustawienia). Skrypt: `tools/golden.py`.

## A.7 Stałe AI dodane w 1.17 (`p5_ai.js`, poza `data/`)

Te tabele i liczby siedzą w kodzie AI, nie w `p1_config.js`, więc `tools/dump.js` ich nie eksportuje; w porcie najlepiej przenieść je do tej samej konfiguracji co resztę. Pełna lista liczb AI: sekcja 06 (6.9.1).

| Stała | Wartość | Do czego |
|---|---|---|
| `LOOK_PROP` | `{ portrait, mirror, eyes, coffin, bones }` (wszystkie 1) | które pułapki-rekwizyty są czymś do obejrzenia przy rozglądaniu się (6.3.3a); kwestie `SAY.lookProp[rodzaj]` |
| `SEARCH_TRAP` | `{ mimic: 0.55, musicbox: 0.45, powder: 0.2 }` | szansa, że przeszukanie mebla odpali pułapkę stojącą na tym polu (`lookDone` -> `fireRaw`, 05 5.2.5) |
| `SEARCH_GOLD` | `{ crate, barrel, shelf }` (wszystkie 1) | meble, w których przeszukanie może dać monetę: 0,3 dla chciwego i złodzieja, 0,18 dla reszty (`stats.goldFound`) |
| `LOOK_LIKE` | cecha/klasa -> `{ rzecz albo komnata: premia }`: chciwy `obj` 2,5; złodziej `obj` 1,5; kapłan `coffin`, `bones`, `ossuary` 2,5, `haunt` 1,5; mag `mirror`, `eyes` 2, `haunt` 1,5; barbarzyńca `armory`, `forge` 2,5, `ogre` 1,5; bard `statue` 2, `gallery` 2,5, `nursery` 1,5, `portrait` 1,5; wojownik `armory` 2, `statue` 1 | `lookPref`: co bohater wybiera do oglądania (premie z cechy i klasy się sumują, ściana -1,5) |
| `COUNCIL_LINE` | `{ home: 'voteHome', storm: 'voteStorm', more: 'voteMore' }` | klucz `SAY` dla głosu na daną opcję narady (6.3.10a) |
| zasięg krzyku | 14 kroków drogi (`stepsWithin`, BFS po polach przechodnich i drzwiach), w linii prostej najwyżej 14 pól; nie z Głuszy ani z pokoju z Kamieniem wyjcem | `canHearShout` (6.3.13): wołanie o kapłana, klatka (decyzja przywódcy, wybór ratownika), ucieczka drużyny, krzyk śmierci, okrzyk czempiona, wstający bohater przepowiedni, upuszczony kryształ, kradzież kryształu (`p6_loop.js: takeCrystal`) |
| zasięg słuchu i wzroku | słuch `earshot` (ten sam obszar albo 7 pól w linii), nie w Głuszy; wzrok `samePlace` (ten sam pokój/korytarz albo 3,5 pola) | `canHear`, `canSee` |

## A.8 Stałe pamięci bohatera dodane w 1.17.1 (`p5_ai.js`, `p3_flow.js`, poza `data/`)

Jak w A.7: siedzą w kodzie, `tools/dump.js` ich nie eksportuje. Mechanika: sekcja 06 (6.7.10).

| Stała | Wartość | Do czego |
|---|---|---|
| `TAG_CAT` (`p5_ai.js`) | tagi pułapek (16), potworów (`goblin`, `archer`, `spider`, `ogre`, `shaman`, `ghost`, `shade`, `bats`, `monster`), łupu (`gold`, `potion`, `gear`, `relic`, `cursed`) i wszystkie klucze `BUILDINGS` | "rzeczy chwili": gdy trwa `SAY_NOW`, kwestia z takim tagiem musi mówić o rzeczy chwili, a nie tylko o czymś z pamięci (`lineOk`) |
| `BURN_TAGS` (`p3_flow.js`) | `spikes` -> `['spikes', 'blood']`, `arrows` -> `['arrows', 'fire']`, `powder` -> `['blast', 'fire']`, `fire` -> `['fire']`, `archer` -> `['archer', 'monster', 'fire']`, `trapdoor` -> `['trapdoor', 'fire']`; inne `burnBy` -> `['fire']` | co bohater czuje, gdy płonie albo krwawi (`hurtTags` w `damage`) |
| `SAW_NAME` (`p5_ai.js`) | `blast` "wybuch prochu", `gold` "monety", `potion` "mikstura", `gear` "ekwipunek", `relic` "relikwia", `cursed` "przeklęty łup", `heartSeen` "serce lochu", `blood` "krew"; reszta z `KIND_INFO` (`k_*`) albo `ITEMS[tag]` / `ITEMS['r_' + tag]` (małe litery) | lista "Widział w tej fali" na karcie bohatera (`sawNames`, 08) |
| szansa pogaduszki o tym, co widział | `0.45` | small talk: tyle razy kwestia jest tylko z `SAY.saw` dla 2 ostatnich i 1 losowego wcześniejszego tagu (`sawTalk`, 6.7.6) |
| zasięg wzroku w korytarzu | `3.5` pola (euklidesowo, od `tx, ty`) | `seesSpot`: w pokoju widzi cały pokój (rzecz w drzwiach z obu pokoi), w korytarzu tylko tyle |
| próg krwi | `hp < 0.4 * max` | ciężko ranny: tag `blood` dla niego i tych, którzy go widzą (`damageRaw`) |

## A.9 Tabele i stałe dodane albo zmienione w 1.18-1.24

### A.9.1 W `p1_config.js` (do eksportu)

| Tabela | Wartość / kształt | Do czego |
|---|---|---|
| `ITEMS.trapdoor` | `cost` 6 (było 4), `desc` z "Najwyżej 2 upadki bohatera na falę (elita i poz. 12+: 1), potem widzi zapadnie." | koszt, ulepszenia 12 i 24 (sekcja 05, 5.3.4) |
| `HITEMS` | + `lantern` (`latarnia`, `w` 0, `use` `tool`, `kg` 1,5, `tool`), `crowbar` (`łom`, `kg` 3, `tool`); każdy przedmiot ma `kg`: mikstura 1, talizman 0,5, amulet 0,5, buty 1,5, bomba 2, broń 3, zbroja 6 | narzędzia i ciężar (sekcja 04, 5.6) |
| `ITEM_COLOR` | + `lantern` `#ffe08a`, `crowbar` `#b8b0a0` | kwadraciki w plecaku |
| `CARRY` | `{ warrior: 14, barbarian: 16, priest: 10, bard: 10, thief: 9, mage: 8 }` | udźwig (+0,3 kg za poziom) |
| `CLASS_FIT`, `fitOf` | sekcja 04, 5.4 | wartość przedmiotu dla klasy |
| `LOOT_GREED.body` | `[0.075, 0.04]` | chciwość z rzeczy poległego (zobaczone, zabrane) |
| `UPGRADES` | 140 kart, 28 nowych, bez `u-portrait`; nowe `req` jako funkcje `hasRk`/`hasRt` | załącznik B |
| `ONB_CARD` | + karty 1.18: komnaty i efekty 3, zachowania 1 | sekcja 03, 5.2 |
| `ONB_WAVE`, `onbWaveStage` | `[0, 1, 3, 5, 7]` | etap z fali pierwszego runu (sekcja 03, 5.3) |
| `FUSE_POW`, `FUSE_K` | 2,5; `{ power: 1.1, hero: 1.25 }` | moc połączonej karty (sekcja 03, 3.13) |
| `FUSE_GROUP` | id karty -> `fear` / `hero` / `ess` / `greed` / `shop` (reszta `power` albo `named`) | cecha połączonej karty |
| `FUSE_INT` | `['patron', 'mole', 'echoFire', 'freeReroll', 'stashPlus', 'gateUses']` | pola zaokrąglane w dół |
| `FUSE_TEXT` | grupa -> tekst cechy (`named`: "<Element>: moc jak o poziom wyżej", `power` "+10% tej mocy", `fear` "cały strach w lochu +15%", `hero` "+25% do szansy i efektu", `ess` "+2 Esencji po każdej fali", `greed` "+0,1 chciwości na start fali", `shop` "jedno darmowe odświeżenie sklepu") | UI karty ★ |
| `SCARES(t)`, `HURTS(t)` | `SCARE[t] \|\| DRIFT[t]`; `DMG_OF[t] && !LOOT_KIND[t]` | słowa "Straszy" / "Rani" w opisach (sekcja 08) |
| `DEFAULTS` | + `calmWaves` 2, `calmGap` 1,5, `okPulse` 1,6, `okSwing` 1,65 | spokojne checki i szersze okna (sekcja 05, 5.9.10-5.9.11) |
| `SAY`, `SOLO`, `CONVO`, `LINE_NEEDS` | A.5 | kwestie |

### A.9.2 W kodzie poza `p1_config.js` (nie eksportuje ich `tools/dump.js`)

| Stała | Plik | Wartość | Do czego |
|---|---|---|---|
| `EARLY_W` | `p3_flow.js` | `[0, 3, 3.75, 4.3, 4.6]` | trudniejsze fale 1-4 (sekcja 04, 3.9) |
| `NEM_TITLE` | `p5_ai.js` | `thief` Złodziej/Złodziejka Kryształu, `avenger` Mściciel/Mścicielka, `scar` Blizna, `survivor` Ocalały/Ocalała, `steady` Niezłomny/Niezłomna | tytuły Nemezis (sekcja 04, 6.9) |
| `BOND_NOUN` | `p3_flow.js` | `friend` Przyjaciel/Przyjaciółka, `sibling` Brat/Siostra, `rival` Rywal/Rywalka, `mentor` Mistrz/Mistrzyni, `apprentice` Uczeń/Uczennica | etykieta więzi |
| `BOND_KEY`, `GRIEF_KEY` | `p5_ai.js` | więź -> `bondFriend`/`bondSibling`/`bondRival`/`bondMentor`; `griefFriend`/`griefSibling`/`griefRival` | kwestie więzi |
| `FLOOR_TAP` | `p5_ai.js` | `{ spikes, trapdoor, cage, web }` | co da się opukać |
| `SHAMAN_GZ` | `p4_traps.js` | 0,02 | Groza z leczenia szamana |
| `LVL_POW` / `LVL_MON` za poziomem 3 | `p4_traps.js: lvlAt` | ostatni krok jeszcze raz (pułapka 3,6) | połączona karta `named` |
| `OK_WIDE` | `p6_loop.js` | `pulse: S.okPulse`, `swing: S.okSwing` | okno draśnięcia |
| `IV_FAST`, `IV_CALM`, `IV_STILL` | `p6_loop.js` | 1000/60, 1000/30, 1000 ms | tempo klatek (sekcja 07, 7.10.9) |
| `AFX_N`, `AFX_DUR`, `TRAP_FX` | `p7_draw.js` | 64 miejsca; czasy 0,35-1,3 s; typ pułapki -> animacja | animacje (sekcja 08, 6.13b) |
| `HEALER`, `PV` | `p7_draw.js` | `{ priest, bard }` | podgląd fali |
| `ACT_IDLE`, `SESSION_GAP` | `p8b_ui.js` | 60 s, 300 s | czas aktywnej gry, posiedzenia |
| `NOASK_KEY`, `NAME_ASKED` | `p8b_ui.js` | `'yatd-noask-ess'`, `'yatd-name-asked'` | pytania o Esencję i imię |
| `CARD_ALL` | `p8b_ui.js` | `{ hgallery: true }` | wszystkie potrzeby karty |
| `LOG_VERSION` | `p8b_ui.js` | 59 | format danych testowych |
| liczby AI 1.19-1.24 | `p5_ai.js` | sekcja 06, 6.9.1 i 6.10-6.15 | Rozłam, ekwipunek, więzi, finał, Nemezis, wyczerpanie |
