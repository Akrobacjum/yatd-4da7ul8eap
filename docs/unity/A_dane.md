# Załącznik A: dane wyeksportowane z prototypu

Katalog `data/` to dosłowny eksport tabel z `src/p1_config.js` (**wszystkie pliki tabel przeeksportowane na Prototype 1.26.1**, 95 tabel; w 1.27 eksportu nie powtarzano, A.12; tabele zmienione i nowe w 1.18-1.24 opisuje A.9, w 1.26 A.10, w 1.26.1 A.11, w 1.27 A.12 (teksty, języki, nowe id podzakładek); kilka stałych z `p1_config.js` nie trafia do eksportu, lista w A.0; historia: do 1.25.1 eksport był z 1.17.1, a od 1.13.1 zmieniły się `TABS` w 1.14, w 1.15 `ITEMS`, `ITEM_ORDER`, `START_UNLOCKED`, `ONB_ITEM`, `TOOLS`, `SLOT_LABEL` i nowe `KIND_INFO`, `KINDS`, `KIND_OF`, `KIND_POW`, `KIND_COST`, w 1.16 `GZ` i `SAY`, w 1.17 tabele kwestii `SAY`, `SOLO`, `SOLO_MUTE`, `CHAT_REPLY`, `CONVO` i `CONVO_P`, w 1.17.1 `SAY`, `SOLO`, `SOLO_MUTE`, `CONVO`, `CONVO_P` i nowa `LINE_NEEDS`), zrobiony skryptem `tools/dump.js` (node wykonuje plik konfiguracji i zapisuje każdą tabelę jako JSON). Funkcje w tabelach są zapisane jako tekst z prefiksem `fn: `, zbiory (`Set`) jako tablice. Nic nie było przepisywane ręcznie.

- `yatd_content_1.26.1.json` (wcześniej `yatd_content_1.26.json`): wszystkie tabele w jednym pliku: `{ version: 'Prototype 1.26.1', source, tables: { ITEMS: ..., UPGRADES: ..., ... } }` (95 tabel; 1.17.1: 83, doszły `ACTS`, `BLEED`, `POISONT`, `FAMILIES`, `FAMILY_OF`, `OMENS`, `OMEN_WAVES`, `REACTIONS`, `REACT_K`, `RUNE_MAX`, `STATUS`, `TRAITS_B`), złożony z plików tabel poniżej (zastąpił `yatd_content_1.17.1.json`). Ten plik warto wczytać w Unity.
- `<NAZWA>.json`: ta sama tabela osobno (wygodne do czytania i porównań).
- `levelStats_1_30.json`: wynik `levelStats(L)` dla poziomów 1-30 (zaokrąglone do 4 miejsc).
- `golden_1.13.1.json`: wartości policzone przez działający prototyp do testów (sekcja 09).

Znaczenie i użycie każdej wartości opisują sekcje 03-08; poniżej skrót pól. Wartości zmienione w 1.26 (np. `GZ.scare` 4, `GZ.crystal` 6, `MON_FACTOR` 0,8, `DEFAULTS.essence` 25, `waveIncome` 6, `KIND_COST` 10) są w A.10; opisy w A.1-A.4 podają też starsze liczby.

## A.0 Stan danych a Prototype 1.26

**Od 1.26** eksport w `data/` odpowiada 1.26 (`yatd_content_1.26.json` i pliki tabel). Wartości 1.18-1.26 opisane w A.9 i A.10 są więc w JSON-ach, z wyjątkiem stałych, których `tools/dump.js` nie wypisuje (trzeba je przepisać z `src/p1_config.js` albo dopisać do skryptu): `ONB_WAVE`, `CLASS_FIT`, `ITEM_COLOR`, `FUSE_POW`, `FUSE_K`, `FUSE_GROUP`, `FUSE_INT`, `FUSE_TEXT`, funkcje `SCARES`, `HURTS`, `fitOf`, `onbWaveStage`, `partyPool`, `runePrice` oraz stałe spoza `p1_config.js` (A.7-A.10). Do 1.25.1 eksport odpowiadał 1.17.1. Różnice w 1.24 (szczegóły A.9): `ITEMS` (zapadnia `cost` 6 i opis z limitem upadków), `HITEMS` (narzędzia `lantern`, `crowbar`, pole `kg` i `tool`), `LOOT_GREED` (`body`), `UPGRADES` (140 kart), `ONB_CARD` (karty 1.18), `DEFAULTS` (`calmWaves`, `calmGap`, `okPulse`, `okSwing`), tabele kwestii `SAY`, `SOLO`, `CONVO`, `LINE_NEEDS` (A.5), nowe `ONB_WAVE`, `CARRY`, `CLASS_FIT`, `FUSE_POW`, `FUSE_K`, `FUSE_GROUP`, `FUSE_INT`, `FUSE_TEXT` oraz funkcje `SCARES`, `HURTS`, `fitOf`, `onbWaveStage`. (Do 1.25.1 plik zbiorczy był z 1.17.1; od 1.26 jest `yatd_content_1.26.json`.)

## A.1 Treść gry

| Plik | Kształt | Pola i znaczenie |
|---|---|---|
| `ITEMS` | słownik `id -> element` (65; od 1.15 także 12 komnat `k_*`) | `name` nazwa; `cost` koszt w Esencji; `slot` miejsce: `floor`, `wall`, `door`, `object`, `roomtype`, od 1.15 `roomkind` (opis w `SLOT_LABEL`); `tag` krótka cecha pod nazwą kafelka; `desc` opis po przytrzymaniu; `cd` odnowienie w s; `hp`, `melee` dla potworów; `build: true` budowla-kontra (tylko między falami, w pokoju, jedna na pokój); `tool: true` narzędzie lochu (kopanie, typy pokoi); `rt` typ pokoju nadawany przez narzędzie; `rarity` dla łupu (1-3: zasięg widzenia); `mode` dla trybów (Ulepsz, Przenieś) |
| `TABS` | lista zakładek paska | `id`, `label`, `items` (kolejność kafelków), od 1.14 opcjonalnie `subs`: lista `{id, label, items}` (Pułapki i Potwory: `dmg` Rany, `fear` Strach; od 1.15 Loch: `dig` Kopanie, `kind` Komnaty, `effect` Efekty; od 1.27 Pułapki `dmg` Ranią, `hold` Trzymają, `weak` Osłabiają, `fear` Straszą, Potwory `dmg` Walczą, `sup` Wspierają, `fear` Straszą, Loch `effect` Klimat, A.12; 08). `ITEM_ORDER` = wszystkie kafelki po kolei |
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
| `UPGRADES` (210 w eksporcie 1.26.1 i w kodzie 1.27, 202 w 1.26; 140 w 1.24, 113 w 1.17.1; załącznik B) | `id`; `kind`: `unlock` (odblokowanie elementu, pole `unlock`), `instant` (działa raz przy kupnie), `card` (leży w talii i działa przez `apply` na `mods`); `rar`: `c` zwykła, `r` rzadka, `l` legendarna; `name`, `text`, `tag`; `unique` (tylko jedna kopia); `req` (wymagane odblokowanie: id albo funkcja); `grows` (karta z licznikiem rosnącym w runie, np. Głodne kolce); `apply` (kod efektu). Pełna tabela: załącznik B |
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

| Tabela | 1.26 | 1.24 | 1.17.1 | 1.17 | 1.16.1 |
|---|---|---|---|---|---|
| `SAY` | 395 kluczy, 4233 kwestie | 376 kluczy, 4107 kwestii | 272 klucze, 3173 kwestie (z zagnieżdżonymi) | 269 kluczy, 2535 kwestii | 222 klucze, 669 kwestii |
| `SOLO` | 84 klucze, 517 kwestii | 84 klucze, 517 kwestii | 68 kluczy, 434 kwestie | 67 kluczy, 431 kwestii | 38 kluczy, 89 kwestii |
| `SOLO_MUTE` | 40 kluczy | 40 kluczy | 40 kluczy | 39 kluczy | 35 kluczy |
| `CHAT_REPLY` | 75 zaczepek, 206 odpowiedzi | 75 zaczepek, 206 odpowiedzi | 75 zaczepek, 206 odpowiedzi | 75 zaczepek, 206 odpowiedzi | 19 zaczepek, 31 odpowiedzi |
| `CONVO` | 103 zestawy, 635 wymian, 1429 kwestii | 103 zestawy, 635 wymian, 1429 kwestii | 87 zestawów, 520 wymian, 1125 kwestii | 85 zestawów, 497 wymian, 1073 kwestie | 74 zestawy, 143 wymiany, 305 kwestii |
| `CONVO_P` | 80 kluczy | 80 kluczy (nowe zestawy 1.19-1.23 bez wpisu: szansa domyślna 0,5) | 80 kluczy | 78 kluczy | 67 kluczy |
| `LINE_NEEDS` | 57 tagów, 900 wpisów (899 różnych kwestii) | 57 tagów, 900 wpisów (899 różnych kwestii) | 57 tagów, 803 wpisy (802 różne kwestie) | - | - |

Przyrost `SAY` po wersjach (klucze, kwestie): 1.26.1 +4, +17 (w kodzie 399 kluczy, 4250 kwestii; A.11); 1.26 +19, +126 (klucze 1.26 i podklucze: sekcja 06, 6.16.10; nowe kwestie nie mają wpisów w `LINE_NEEDS`); 1.18 +3, +14 (`bodyFound`, `lullNap`, `lullDream`); 1.19 +19, +185 (Rozłam); 1.20 +24, +164 (ekwipunek); 1.21 +25, +250 (więzi); 1.22 +19, +185 (finał); 1.23 +14, +136 (Nemezis). Listy kluczy: sekcja 06 (6.3.14, 6.10.4, 6.11.6, 6.12.9, 6.13.7, 6.14.5).

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

Polszczyzna gry odmienia imiona i formy płci; przy tłumaczeniu na angielski większość znaczników znika, ale klucze muszą zostać te same. Od 1.27 (A.12) angielskie kwestie są w `DLG_EN` (`p1e_en.js`): zostaje w nich `{n}` (także tam, gdzie polski ma `{a}`, `{v}` albo `{g}`) i przełącznik płci tylko tam, gdzie angielski go potrzebuje (he/she); po angielsku `nameFill`, `nameGen` i `convoFill` wstawiają zawsze mianownik.

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
| `EARLY_W` | `p3_flow.js` | od 1.26 `[0, 1.5, 2.25, 3, 4]` (1.25.1 `[0, 2, 2.75, 3.5, 4.25]`; 1.24 `[0, 3, 3.75, 4.3, 4.6]`) | trudniejsze fale 1-4 (sekcja 04, 3.9) |
| `EARLY_W_TUT` | `p3_flow.js` | `[0, 1, 2, 3, 4]` | 1.25.1: pierwszy run z przewodnikiem po staremu (v58), limit poziomu 4 w falach 1-2 |
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
| `LOG_VERSION` | `p8b_ui.js` | 59 (1.24), 60 (1.25), 61 (1.25.1), od 1.26 62 | format danych testowych (sekcja 07, 7.12) |
| liczby AI 1.19-1.24 | `p5_ai.js` | sekcja 06, 6.9.1 i 6.10-6.15 | Rozłam, ekwipunek, więzi, finał, Nemezis, wyczerpanie |

## A.10 Tabele i stałe dodane albo zmienione w 1.26

Wszystkie z `p1_config.js` są w eksporcie 1.26 (`data/`), chyba że zaznaczono inaczej. Mechanika: sekcje 03 (2.7, 2.14, 3.15, 3.16), 04 (4.3a, 6.11), 05 (5.14), 06 (6.16).

### A.10.1 Statusy, reakcje, rodziny, omeny (`p1_config.js`)

| Tabela | Wartość / kształt | Do czego |
|---|---|---|
| `STATUS` | 11 statusów `id -> {name, short, color, desc}`: `slow` Spowolniony, `root` Unieruchomiony, `burn` Podpalony, `bleed` Krwawiący, `poison` Zatruty, `oiled` Oblany, `wet` Mokry, `infected` Zarażony, `marked` Naznaczony, `seduced` Uwiedziony, `dazed` Oszołomiony | karta bohatera, ikonki (`ART.status`), `statusOn`, `setStatus` (05, 5.14.1) |
| `REACTIONS` | 5 reakcji `id -> {name, color, desc}`: `blaze` Pożar, `detonate` Detonacja, `shock` Porażenie, `steam` Para, `rise` Powstanie | `reaction(h, k)`, napis i pierścień (05, 5.14.2) |
| `REACT_K` | 1,6 | mnożnik obrażeń Pożaru i Porażenia |
| `BLEED`, `POISONT`, `ACTS` | `{kind: 'bleed'}`, `{kind: 'poison'}`, `{}` (pamięć podręczna `actSrc`) | źródła obrażeń krwawienia i trucizny (`DMG_FACTOR` 1), źródło zdolności potwora |
| `FAMILIES` | 9 rodzin `id -> {name, items, color, glyph}`: `mech` Mechanizmy ⚙ (spikes, arrows, pendulum, snare, gate, trapdoor, cage, mimic), `fire` Ogień ♨ (fire, powder, oilslick, tar), `alch` Alchemia ⚗ (miasma, flood, bolt), `haunt` Nawiedzenie ✧ (portrait, eyes, mirror, creak, musicbox, falsedoor, ghost, shade), `undead` Nieumarli ☠ (bones, coffin, bell, skeleton, zombie, lich), `beast` Bestie ✳ (web, spider, bats, rats), `green` Zielonoskórzy ♣ (goblin, archer, shaman, ogre, sapper, warlord), `demons` Demony ⛧ (imp, hound, siren, demon), `treasure` Skarby ◆ (loot, lpotion, loot2, loot3, lcursed, bait) | Runa rodu (03, 3.16), `famK`, `cdOf`, Pełna paleta |
| `FAMILY_OF` | element -> rodzina | odwrotność `FAMILIES` |
| `RUNE_MAX`, `runePrice` | 5; `lv => 5 + lv` (5, 6, 7, 8, 9; funkcja poza eksportem) | poziom rodziny i cena runy |
| `OMEN_WAVES` | `[3, 6, 8]` | fale z omenem (w falach bez końca każda bez bossa) |
| `OMENS` | 10 omenów, tabela niżej | `omenOf`, `omenK(fala, klucz)` (04, 6.11) |
| `TRAITS_B` | 43 elementy: `id -> [nazwa, opis]`, tabela niżej | cecha B poziomu 3 (05, 5.14.3) |
| `TRAITS` | + cechy A 20 nowych elementów (tabela A.10.3) | cecha A |
| `DMG_TYPES` | + `shock` "porażenie" | piąty typ obrażeń |
| `CLASS_RES`, `CLASS_RES_TEXT` | + `shock` u wojownika 1,2 i maga 0,8; nowe klasy (A.10.4) | odporności klas |
| `PHYS`, `SCAR_RES` | + `conductive` (porażenie ×1,4), `grounded` (×0,7); blizna po porażeniu -> `grounded` | ciała |
| `PHOBIAS` | + `dead` umarli (skeleton, zombie, lich, bones, coffin, bell; źródła bell, death), `abyss` otchłań (trapdoor, falsedoor, pendulum), `noise` hałas (creak, musicbox, bell, gate, rattle, howl; źródła screams, bell), `swarm` roje (bats, rats, imp, miasma) | 10 fobii |
| `HERO_TRAITS` | 8 charakterów, wszystkie `w` 1 (+ superstitious, curious, loyal, hothead) | charakter u ok. 60% nie-bossów (04, 4.2) |
| `HEROES`, `KIT`, `CARRY`, `CLASS_SKILL` | + 4 klasy (A.10.4) | |
| `LEADER_ORDER` | warrior, paladin, barbarian, priest, bard, ranger, mage, alchemist, thief (bez kultysty) | remis rangi przy wyborze przywódcy |
| `partyPool(n)` | funkcja (poza eksportem): fale 1-3 `CLASSIC`; 4-5 `PARTY` + paladin, ranger; od 6 + alchemist | klasy fali (04, 2.2) |
| `KIND_INFO`, `KINDS`, `KIND_OF`, `KIND_COST` | + `lab` Laboratorium ⚗ (miasma, flood, bolt), `graveyard` Cmentarz ✟ (skeleton, zombie, lich, bell), `abyssgate` Wrota otchłani ⛧ (imp, hound, siren, demon); 15 komnat; cena 10 (było 12) | komnaty (05, 5.8a) |
| `GZ` | `scare` 4 (było 2,5), `crystal` 6 (było 4); reszta bez zmian | 03, 2.2 |
| `MON_FACTOR`, `DMG_FACTOR` | 0,8 (było 0,4); `DMG_FACTOR`: `monster` 0,8, nowe `bleed` 1, `poison` 1, `react` 1 | Groza z ran od potworów i statusów |
| `DEFAULTS` | `essence` 25 (było 30), `waveIncome` 6 (było 8), nowe `hungerK` 1 i `tithe` 0,3; `hungerBase` i `hungerGrowth` usunięte (głód z tabeli `HUNGER_T`) | 03, 2.7 i 2.10 |
| `START_UNLOCKED` | + `k_lab`, `k_graveyard`, `k_abyssgate` (komnaty dostępne od startu, zablokowane bez odblokowanej rodziny) | |
| `ONB_ITEM` | nowe elementy: Wahadło i Wnyki etap 1 (brak wpisu), oilslick, tar, bell, falsedoor, bait, imp, siren, hound, rats, skeleton, zombie 2; miasma, flood, bolt, lich, demon, sapper, warlord 3 | etapy nauki |
| `ITEMS` | 88 wpisów (+23: 20 elementów i 3 komnaty, A.10.3); koszty starych elementów i budowli obniżone (05, 5.14.9) | |
| `UPGRADES` | 202 wpisy (+62), pola `group` ('heart'), `heartOnly` | załącznik B (B.4, B.5) |
| `FUSE_GROUP` | + `ess`: tithe, stoneheart, glutton, kingsfeast, darkforge (poza eksportem) | B.3 |
| `FUSE_INT` | + `crownLv`, `titheChoice`, `shopPlus`, `heartRoom` (poza eksportem) | pola zaokrąglane w dół przy ★ |

**`OMENS`** (pola liczbowe czyta `omenK`):

| id | Nazwa | Działanie (pola) | Nagroda / koszt | Od fali |
|---|---|---|---|---|
| `siege` | Oblężenie | `extra` +2 bohaterów, `lvAdd` -2 | koszt: `hunger` ×1,15 | 3 |
| `elite` | Elita | `extra` -1, `lvAdd` +3, `gear` +1 przedmiot | +1 darmowa karta (`free`) | 6 (`minW`) |
| `inquisition` | Inkwizycja | `force` kapłan i paladyn, `lvAdd` +1, `fearK` 0,7 | brak | 3 |
| `sappers` | Saperzy | `force` złodziej i tropiciel (przed falą 6 dwóch złodziei) | +1 darmowa karta | 6 (`minW`) |
| `haste` | Pośpiech | `patience` 60 s, `speed` ×1,2, `noRest` | koszt: `hunger` ×0,85 (tekst "serce chce o 15% mniej") | 3 |
| `bloodmoon` | Krwawy księżyc | `hpK` 1,2, `monDmg` 1,3, `killK` 1,5 | brak | 3 |
| `goldrush` | Złoty szał | `greedAll`, `greedStart` +0,5, `hunters` +1 | koszt: `hunger` ×1,15 | 3 |
| `warfog` | Mgła wojny | `fog` (drużyna ukryta), `lostAdd` 0,2 | +10 Nasycenia po fali (`satiety`) | 3 |
| `pilgrimage` | Pielgrzymka | `cultists` 2 | +1 darmowa karta | 6 (`minW`) |
| `fearnight` | Noc strachu | `courage` ×0,8, `calm` ×1,5 | brak | 3 |

### A.10.2 Cechy poziomu 3: A i B (`TRAITS`, `TRAITS_B`)

| id | Element | Cecha A | Cecha B: opis |
|---|---|---|---|
| `spikes` | Kolce | Krwawienie | Zadziory: trafiony jest Unieruchomiony na 1 s |
| `arrows` | Strzały | Przebijające groty | Zatrute groty: każde trafienie dodaje stos trucizny |
| `fire` | Ogień | Napalm | Ściana ognia: płomień zamyka najbliższe drzwi pokoju na 3 s, przejście płonie (+10 strachu) |
| `web` | Sieć | Kwaśna sieć | Kokon: złapany przez 4 s nie użyje żadnego przedmiotu |
| `trapdoor` | Zapadnia | Bezdenny szyb | Kolce na dnie: upadek rani 3 razy mocniej i zostawia krwawienie |
| `cage` | Klatka | Kolczasta klatka | Pułapka na ratownika: kto otworzy klatkę, jest Unieruchomiony na 3 s |
| `portrait` | Portret | Całun grozy | Oczy śledzą: przestraszony jest Naznaczony na 8 s (każdy strach ×1,3) |
| `gate` | Krata | Żelazna krata | Gilotyna: miażdży 2 razy mocniej, odcięci są samotni przez 8 s |
| `powder` | Proch | Ognisty proch | Odłamki: wszyscy w wybuchu krwawią przez 3 s |
| `mimic` | Mimik | Pożeracz | Zachłanny: gryzie 2 razy mocniej bohatera, który podnosi łup obok |
| `eyes` | Oczy | Wszystkowidzące | Wzrok bazyliszka: przestraszony jest Spowolniony na 2 s |
| `bones` | Kości | Kostnica | Grzechot: budzi fobię hałasu, nowicjusze boją się 2 razy bardziej |
| `mirror` | Lustro | Krzywe zwierciadło | Odbicie: następny strach przestraszonego jest o 20% większy (8 s) |
| `creak` | Zawiasy | Trzask | Skrzyp nocy: połowę strachu słychać w sąsiednich pokojach |
| `coffin` | Trumna | Pogrzebany żywcem | Wieko: najbliższy jest Unieruchomiony na 2 s |
| `musicbox` | Pozytywka | Kołysanka śmierci | Usypianka: ranny (poniżej 60% HP) zasypia na 3 s, w każdym pokoju |
| `goblin` | Goblin | Podcięcie | Łupieżca: zabity przez niego bohater zostawia dodatkowy stos łupu |
| `archer` | Łucznik | Ogniste strzały | Zatrute strzały: każdy strzał dodaje stos trucizny |
| `spider` | Pająk | Gniazdo | Jad paraliżujący: ukąszony jest Unieruchomiony na 1,5 s |
| `ogre` | Ogr | Grzmot | Rzut: wyrzuca bohatera do sąsiedniego pokoju: samotność, często zgubienie |
| `shaman` | Szaman | Tarcza ducha | Klątwa: skill check przeklina bohatera na 8 s: uspokaja się 2 razy wolniej, dostaje +20% obrażeń |
| `ghost` | Duch | Wycie | Nawiedzenie: idzie za celem także do następnego pokoju |
| `shade` | Cień | Pożeracz światła | Szept: odwaga celu -15% do końca fali |
| `bats` | Nietoperze | Chmara | Wampiry: ukąszenia leczą potwory w pokoju o zadane obrażenia |
| `pendulum` | Wahadło | Podwójne | Ścięcie: krytyk zostawia krwawienie na 4 s |
| `snare` | Wnyki | Zębate | Łańcuch: najbliższy sojusznik też jest Unieruchomiony na 2 s |
| `miasma` | Wyziewy | Gęste | Łzawiące: w chmurze nikt nie wykrywa ani nie zapamiętuje pułapek |
| `oilslick` | Plama oleju | Łatwopalna | Śliska: poślizg w połowie kroków |
| `bolt` | Runa piorunów | Burza | Przeciążenie: co 3. odpalenie ogłusza na 2 s |
| `flood` | Zalewnia | Topiel | Lodowata woda: Mokrzy uspokajają się 2 razy wolniej |
| `bell` | Dzwon żałobny | Requiem | Namaszczenie: skill check leczy wszystkie potwory w lochu o 20% |
| `falsedoor` | Fałszywe przejście | Labirynt | Pętla: przejście wyprowadza z powrotem do poprzedniego pokoju |
| `tar` | Kocioł smoły | Wrzątek | Smoła: spowolnienie na 6 s |
| `skeleton` | Szkielet | Legion | Kościany pancerz: kłute rani go o 40% słabiej |
| `zombie` | Zombie | Epidemia | Gnijące mięso: powalony wybucha: 3 stosy trucizny walczącym |
| `lich` | Licz | Filakteria | Armia: wskrzesza 2 razy na falę |
| `imp` | Chochlik | Kleptoman | Podpalacz: skradziony przedmiot wybucha ogniem |
| `hound` | Ogar piekielny | Sfora | Piekielny ogień: ugryzienie podpala na 3 s |
| `siren` | Kusicielka | Pocałunek | Zazdrość: uwiedzenie wywołuje kłótnię (morale -0,1) |
| `demon` | Demon otchłani | Pan otchłani | Głód krwi: każde jego zabójstwo -3 do głodu następnej fali |
| `sapper` | Goblin saper | Proch | Zwijacz: raz na falę uzbraja z powrotem rozbrojoną pułapkę w pokoju |
| `warlord` | Herszt goblinów | Wódz | Grabież: zabity w jego pokoju zostawia stos łupu |
| `rats` | Rój szczurów | Wścieklizna | Nora: powalony dzieli się na 2 małe roje do końca fali |

### A.10.3 Nowe elementy 1.26 (`ITEMS`)

Kolumny: miejsce (`slot`), koszt w Esencji, odnowienie `cd` (s), HP / `melee` (potwory), typ obrażeń (`DMG_OF`), rodzina, etap nauki (`ONB_ITEM`, brak wpisu = 1), cecha A. Komnaty `k_lab`, `k_graveyard`, `k_abyssgate`: `slot` `roomkind`, koszt 10, etap 3. Działanie: sekcja 05, 5.14.4 i 5.14.5.

| id | Nazwa | Miejsce | Koszt | cd | HP / melee | Obrażenia | Rodzina | Etap | Cecha A |
|---|---|---|---|---|---|---|---|---|---|
| `pendulum` | Wahadło | wall | 4 | 4 |  | kłute | Mechanizmy | 1 | Podwójne |
| `snare` | Wnyki | floor | 3 | 8 |  | kłute | Mechanizmy | 1 | Zębate |
| `miasma` | Wyziewy | floor | 5 | 7 |  | trucizna | Alchemia | 3 | Gęste |
| `oilslick` | Plama oleju | floor | 4 | 6 |  | - | Ogień | 2 | Łatwopalna |
| `bolt` | Runa piorunów | wall | 5 | 4 |  | porażenie | Alchemia | 3 | Burza |
| `flood` | Zalewnia | floor | 4 | 10 |  | - | Alchemia | 3 | Topiel |
| `bell` | Dzwon żałobny | object | 4 | 8 |  | - | Nieumarli | 2 | Requiem |
| `falsedoor` | Fałszywe przejście | door | 4 | 10 |  | - | Nawiedzenie | 2 | Labirynt |
| `tar` | Kocioł smoły | door | 5 | 10 |  | ogień | Ogień | 2 | Wrzątek |
| `bait` | Przynęta | floor | 3 | 6 |  | kłute | Skarby | 2 |  |
| `skeleton` | Szkielet | floor | 4 | 4 | 70 / 12 | kłute | Nieumarli | 2 | Legion |
| `zombie` | Zombie | floor | 5 | 5 | 170 / 8 | trucizna | Nieumarli | 2 | Epidemia |
| `lich` | Licz | floor | 9 | 6 | 120 / 4 | obuchowe | Nieumarli | 3 | Filakteria |
| `imp` | Chochlik | floor | 3 | 6 | 40 / 0 | - | Demony | 2 | Kleptoman |
| `hound` | Ogar piekielny | floor | 5 | 5 | 90 / 28 | ogień | Demony | 2 | Sfora |
| `siren` | Kusicielka | floor | 6 | 9 | 60 / 0 | - | Demony | 2 | Pocałunek |
| `demon` | Demon otchłani | floor | 10 | 6 | 420 / 28 | ogień | Demony | 3 | Pan otchłani |
| `sapper` | Goblin saper | floor | 5 | 8 | 80 / 8 | kłute | Zielonoskórzy | 3 | Proch |
| `warlord` | Herszt goblinów | floor | 7 | 5 | 160 / 14 | obuchowe | Zielonoskórzy | 3 | Wódz |
| `rats` | Rój szczurów | floor | 3 | 4 | 35 / 6 | kłute | Bestie | 2 | Wścieklizna |

### A.10.4 Nowe klasy bohaterów (`HEROES`, `CLASS_RES`, `KIT`, `CARRY`)

| Klasa | Nazwa | HP | Szybkość | dps | Chciwość | Kolor, litera | Odporności | Wyposażenie (wagi) | Udźwig (kg) |
|---|---|---|---|---|---|---|---|---|---|
| `paladin` | Paladyn / Paladynka | 110 | 1,35 | 14 | 0,7 | `#f0e2a8`, P | ogień 0,9, obuchowe 0,9, porażenie 1,2 | potion 3, charm 2, amulet 2 | 15 |
| `ranger` | Tropiciel / Tropicielka | 80 | 1,6 | 12 | 1,1 | `#c8904e`, T | kłute 0,9, porażenie 0,9 | potion 3, boots 2, bomb 1 | 10 |
| `alchemist` | Alchemik / Alchemiczka | 70 | 1,35 | 7 | 1,0 | `#e070b0`, A | trucizna 0,5, ogień 0,85 | potion 4, bomb 2, amulet 1 | 12 |
| `cultist` | Kultysta / Kultystka | 75 | 1,4 | 6 | 0 | `#b8323e`, C | brak | potion 1 | 8 |

`PARTY` i `CLASSIC` bez zmian (6 i 4 klasy); nowe klasy wchodzą przez `partyPool`, kultysta tylko z omenem Pielgrzymka. Umiejętności: sekcja 04, 4.3a, i 06, 6.16.3.

### A.10.5 Stałe 1.26 poza `p1_config.js` (nie eksportuje ich `tools/dump.js`)

| Stała | Plik | Wartość | Do czego |
|---|---|---|---|
| `HUNGER_T` | `p3_flow.js` | `[0, 0, 38, 50, 72, 104, 150, 190, 230, 272, 350]`, po fali 10 ×1,2 na falę | głód fali (03, 2.7) |
| `HEART_LV`, `heartLvAt` | `p3_flow.js` | `[0, 30, 75, 135, 210, 300, 410, 540]`, dalej +150 na poziom | próg Nasycenia poziomu serca |
| `heartSlotLv`, `heartRegrowLv` | `p3_flow.js` | poziomy 2, 4, 6; poziomy nieparzyste od 3 | miejsce w talii; Odrost w rzędzie Dar serca |
| `titheNow` | `p3_flow.js` | `min(0,6, S.tithe 0,3 + mods.titheAdd + omen)` | Danina |
| `OFIARA_MAX` | `p3_flow.js` | 40 na przerwę między falami | Ofiara (03, 2.14) |
| `BREACH_PATCH` | `p3_flow.js` | 15 (było 20) | łatanie wyłomu |
| `EARLY_W`, `EARLY_W_TUT` | `p3_flow.js` | `[0, 1.5, 2.25, 3, 4]`, `[0, 1, 2, 3, 4]` | fale 1-4 (04, 3.9) |
| `famK`, `cdOf` | `p4_traps.js` | `1 + 0,08 × poziom rodziny`; odnowienie `× (1 - 0,04 × poziom)` | Runa rodu |
| `stealNeed` | `p6_loop.js` | `(5 + 1,5 × heavyCrystal) / 2^glass` s (było 4 s) | kradzież kryształu |
| `SHOP_PRICE`, odblokowanie | `p8b_ui.js` | `{c: 5, r: 9, l: 14}`, 7 (było 6/10/16, 8) | ceny kart (03, 3.4) |
| `LOOT_STEP` | `p8b_ui.js` | 1,15 (było 1,25) | wzrost ceny kolejnego takiego samego łupu |
| `TUT_NEW` | `p8b_ui.js` | `heartLv`, `heartCry`, `status`, `reaction`, `revive`, `omen`, `cultist` | karty nowych zasad w każdym runie (08, 8.4) |
| `LOG_VERSION` | `p8b_ui.js` | 62 | dane testowe (07, 7.12.1) |
| `ST_PRIO` | `p7c_art.js` | root, burn, poison, oiled, wet, marked, seduced, bleed, slow, infected, dazed | kolejność ikonek statusów (08, 6.7a) |
| `MON_H2` | `p7c_art.js` | skeleton 0,9, zombie 0,9, lich 1,0, imp 0,55, hound 0,62, siren 0,95, demon 1,35, sapper 0,8, warlord 1,0, rats 0,4 | wysokość figur nowych potworów (08, 6.8) |
| paleta `HEX` | `p7c_art.js` | 32 kolory (08, 6.14a) | grafika malowana w kodzie |

## A.11 Tabele, pola i stałe dodane albo zmienione w 1.26.1 (poza eksportem `data/`)

Tabele z A.11.1 są już w eksporcie 1.26.1 w `data/` (`yatd_content_1.26.1.json`, `UPGRADES` 210 wpisów); pola stanu i stałe z A.11.2 i A.11.3 trzeba przepisać z `src/`. Opis działania: sekcje 03 (3.15, 2.14), 05 (5.15), 06 (6.16.7, 6.16.12), 07 (7.14), 08 (6.14b) i załącznik B (B.6, B.7).

### A.11.1 `p1_config.js`

| Tabela | Zmiana 1.26.1 |
|---|---|
| `ITEMS.secret` | nowy wpis: `{ name: 'Ukryte przejście', cost: 6, slot: 'hall', tag: 'fałszywa ściana', tool: true, desc: 'Ukryte przejście (Loch): maskuje istniejące przejście między pokojami fałszywą ścianą. ...' }` (89 wpisów w `ITEMS`) |
| `SLOT_LABEL` | + `hall: 'przejście między pokojami'` |
| `TABS` | zakładka `dungeon` i podzakładka `dig` (Kopanie): `dig, tunnel, secret, expand, demolish` |
| `TOOLS` | + `secret: 1` |
| `START_UNLOCKED` | + `secret` (po `tunnel`) |
| `ONB_ITEM` | + `secret: 3` |
| `ITEMS.hound.desc`, `ITEMS.sapper.desc` | opisy dopisane o trop krwi ogara i chowanie się sapera |
| `UPGRADES` | 210 wpisów: + 8 kart Serca (`heartguide`, `heartdread`, `heartgreed`, `heartpatience`, `heartgrowth` instant, `heartcore`, `secondheart`, `resonance`); `rar` z `'c'` na `'r'`: `heartcry`, `heavycrystal`, `darkforge`, `heartmem`, `stoneheart`, `kingsfeast`, `heartpulse` (B.6, B.7) |
| `SAY` | 4 nowe klucze: `secretFound` (5 kwestii), `curiousGo` (4), `charge` (4), `superWait` (4); bez wpisów w `LINE_NEEDS` |

### A.11.2 Pola stanu (kod poza `p1_config.js`)

| Gdzie | Pole | Start | Znaczenie |
|---|---|---|---|
| `mods` (`p3_flow.js: freshMods`) | `patience` | 0 | sekundy dodane do limitu cierpliwości (Cierpliwość serca +20) |
| `mods` | `heartCore` | 1 | mnożnik Esencji w `essMultNow` (Serce lochu ×1,2) |
| `mods` | `secondHeart` | false | Drugie serce: pierwszy wyniesiony kryształ w runie wraca |
| `mods` | `resonance` | false | Rezonans: Esencja ×(1 + min(0,3; 0,03 × różne karty w talii)) |
| `run` | `secondHeartUsed` | brak | Drugie serce już zadziałało (ustawiane przy użyciu, w zapisie) |
| krawędź `run.layout.edges` | `secret`, `secretKnown` | brak | przejście ukryte; bohaterowie wiedzą o nim z opowieści (w zapisie) |
| drzwi `fl.doors`, korytarz `fl.rooms` | `d.secret` (klucz krawędzi), `hall.secret` | z `buildMap` | końce ukrytego przejścia |
| `fl` | `secretFound` | `Set` z `secretKnown` w `startWave` | odkryte w tej fali |
| bohater | `checkAt`, `curiousN`, `superRoom`, `superWait`, `superSaid`, `chargeSaid` | brak | ciekawski, przesądny, zapaleniec |
| element (ogar) | `walking`, `hunt`, `huntCd`, `homeX`, `homeY` | brak | trop krwi, dom do powrotu |
| strefa, chmura | `offUntil`, `keysOff`, `tilesOff` | brak | wyłączenie flaszką na 6 s |
| `fl.stats` | `secretMade`, `secretFound`, `houndTrack`, `superWaits`, `curiousGo`, `secondHeart` | dopisywane w locie | telemetria (`LOG_VERSION` dalej 62) |
| oś czasu | `sf`, `cx2` | | odkrycie ukrytego przejścia; kryształ wrócił dzięki Drugiemu sercu (07, 7.12.5) |

### A.11.3 Stałe 1.26.1 w kodzie

| Stała | Plik | Wartość | Do czego |
|---|---|---|---|
| szansa wykrycia ukrytego przejścia | `p5_ai.js: heroAI126` | rzut co 0,5 s: `0,5 × (0,04 + 0,14 złodziej/tropiciel + 0,03 × R.detect + 0,06 ostrożny/ciekawski + 0,15 bez drogi > 2 s)` | 06, 6.16.12 |
| trop ogara | `p4_traps.js: houndTrack` | sprawdzenie co 1 s, cel do 9 pól w sąsiednim pokoju, ścieżka najwyżej 16 kroków, 2,6 pola/s, limit 8 s | 05, 5.15.2 |
| osłona sapera | `p4_traps.js: monstersTick`, `p5_ai.js: sapperCovered` | walka wręcz ×0,6 przy potworze obok; kula ognia +2,5 odległości | 05, 5.15.2 |
| przesądny | `p5_ai.js: updateHero` | czeka najwyżej 8 s | 06, 6.16.7 |
| ciekawski | `p5_ai.js: hearFar, lookDone` | `checkAt` 12 s, najwyżej 2 na falę; `SEARCH_TRAP × 2` (max 0,95); moneta 0,3 | 06, 6.16.7 |
| flaszka | `p5_ai.js: newClassTick` | strefa wyłączona na 6 s | 05, 5.15.3 |
| Pożar | `p4_traps.js: reactHit` | podpalenie `max(6, 2 × pozostały czas)` | 05, 5.15.3 |
| Dar serca | `p8b_ui.js: heartOffer` | rzadkie 70%, legendarne 30% | 03, 3.15 |
| Rezonans | `p3_flow.js: essMultNow` | +0,03 za kartę, najwyżej +0,3 | 03, 2.14 |

## A.12 Teksty i języki w 1.27 (eksport `data/` bez zmian)

W 1.27 nie zmieniła się żadna liczba ani zasada; zmieniły się teksty (polski przepisany krócej, angielski dodany) i id podzakładek w `TABS`. Pliki w `data/` są dalej z eksportu 1.26.1, więc mają dawne polskie teksty, dawne podzakładki i nie mają pól `en` ani `more`. Do tekstów 1.27 trzeba przeeksportować tabele (`tools/dump.js` na `src/p1_config.js` 1.27) albo czytać `src/`. Mechanizm języków i zalecenia dla Unity: sekcja 02, 2.10.

### A.12.1 Eksport zostaje polski

`tools/dump.js` od 1.27 wykonuje `p1_config.js` z `window.YATD_LANG_DEFAULT = 'pl'` i pustym `localStorage`, więc `LANG = 'pl'`, `L()` zwraca tekst polski, a `enDeep` nic nie robi. Skutki dla eksportu 1.27:

- obiekty z polem `en` mają je w JSON jako podobiekt obok pól polskich (np. `ITEMS.web = { name: 'Sieć', ..., desc, more, en: { name: 'Web', tag, desc, more } }`); to wystarczy do wypełnienia obu kolumn tabel lokalizacji;
- tabele zbudowane parą `L([...], [...])` albo `L({...}, {...})` eksportują się tylko po polsku (lista niżej); angielskie wersje są tylko w `src/` (albo w drugim przebiegu skryptu z `'en'`, którego dziś nie ma);
- `DLG_EN` nie jest w eksporcie: leży w `src/p1e_en.js` (jeden literał obiektu, JSON), a `dump.js` czyta tylko `p1_config.js`;
- komnaty `ITEMS.k_*` są budowane w kodzie z `KIND_INFO` (`name: L(K.name, K.en.name)`, `tag: L(...)`), więc w eksporcie mają tylko polski; angielski jest w `KIND_INFO[].en`.

### A.12.2 Pola `en` i `more` (`p1_config.js`)

| Tabela | Co doszło w 1.27 |
|---|---|
| `ITEMS` | `more` w każdym z 89 wpisów (drobny druk: miejsce, zasięg, liczby, typ obrażeń, odporności, skill check); `desc` skrócony do jednego zdania; `en: { name, tag, desc, more }` w 74 wpisach (bez 15 komnat `k_*`, A.12.1) |
| `UPGRADES` | `en: { name, text, tag }` we wszystkich 210 kartach |
| `TABS` | `en: { label }` w zakładkach i podzakładkach; nowe `subs` (A.12.3) |
| `KIND_INFO`, `RT_INFO`, `FAMILIES`, `STATUS`, `REACTIONS`, `HERO_TRAITS`, `PHOBIAS`, `PHYS`, `HEROES`, `TIERS`, `HITEMS`, `OMENS`, `ONB_STAGES`, `GAME_SETTINGS`, `SLIDERS` | `en: {...}` z tymi samymi nazwami pól co polskie (`name`, `tag`, `desc`, `short`, `text`, `label`, `reward`, `cost`, `news`...) we wszystkich wpisach |
| `RANKS` (nazwy), `SLOT_LABEL`, `RARITY_NAME`, `RAR_NAME`, `DMG_TYPES`, `CLASS_RES_TEXT`, `CLASS_SKILL`, `BOSS_NAME`, `TRAITS` i `TRAITS_B` (każdy wpis) | para `L(polski, angielski)` zamiast pola `en` (eksport: tylko polski) |
| `ADJ` | formy przymiotników rzadkości tylko po polsku (`PL ? {...} : ...`) |
| nowe na początku pliku | `LANG`, `PL`, `L`, `LL`, `dec`, `enDeep` (sekcja 02, 2.10; załącznik C) |

Poza `p1_config.js` w parach `L` są też m.in. `NEM_TITLE` (`p5_ai.js`), `TRAIT_TEXT`, `TUT`, `TUT_POP`, `SURVEY` (`p8b_ui.js`; ankieta pokazuje `oe`, a zapisuje polskie `o`).

### A.12.3 `TABS.subs` (zmiana id)

| Zakładka | 1.26.1 | 1.27 |
|---|---|---|
| `traps` | `dmg` Rany, `stat` Statusy, `fear` Strach | `dmg` Ranią (spikes, arrows, trapdoor, fire, powder, mimic, pendulum, bolt), `hold` Trzymają (web, cage, gate, snare), `weak` Osłabiają (oilslick, tar, miasma, flood), `fear` Straszą (portrait, eyes, bones, mirror, creak, coffin, musicbox, bell, falsedoor) |
| `monster` | `dmg` Rany, `dark` Mrok, `fear` Strach | `dmg` Walczą (goblin, ogre, spider, rats, skeleton, zombie, hound, demon), `sup` Wspierają (archer, shaman, sapper, warlord, lich), `fear` Straszą (ghost, shade, bats, imp, siren) |
| `dungeon` | `dig` Kopanie, `kind` Komnaty, `effect` Efekty | id bez zmian; `effect` ma etykietę Klimat (ang. Mood), `kind` po angielsku Lairs |

Kolejność kafelków w `items` zakładek bez zmian. Zapamiętany wybór ze starym id (`stat`, `dark`) przepada (sekcja 08, 2.5).

### A.12.4 `p1e_en.js` i `DLG_EN`

Nowy plik części, w budowie zaraz po `p1_config.js` (`build.py: PARTS`). Zawiera:

- `DLG_EN`: obiekt "polska kwestia -> angielska", 6368 kluczy: wszystkie różne kwestie z `SAY`, `CONVO`, `SOLO`, `LINE_NEEDS` i `CHAT_REPLY` (także klucze `CHAT_REPLY`). Klucz to surowy tekst polski ze znacznikami (`{em|am}`, `{g}`...), przed ich rozwinięciem;
- `EN_TABLES()`: lista tabel, na których po angielsku działa `enDeep` (`ITEMS`, `TABS`, `UPGRADES`, `TRAITS`, `TRAITS_B`, `KIND_INFO`, `FAMILIES`, `HERO_TRAITS`, `STATUS`, `REACTIONS`, `PHOBIAS`, `HEROES`, `OMENS`, `RT_INFO`, `TOOLS`, `MODES`, `GAME_SETTINGS`, `SLIDERS`, `HITEMS`, `DMG_TYPES`, `TIERS`, `ONB_STAGES`, `ROOMTYPES`, `BUILDINGS`, `PHYS`);
- blok `if (!PL)`: przepisuje w miejscu kwestie `SAY`, `CONVO`, `SOLO`, `LINE_NEEDS` (z pominięciem pól meta `CONVO`: `b`, `bt`, `at`, `ac`, `br`, `bv`), przenosi `CHAT_REPLY` pod angielskie klucze i woła `enDeep` na tabelach z `EN_TABLES()`. Kwestia bez wpisu w `DLG_EN` zostaje po polsku.

Po polsku plik tylko definiuje `DLG_EN` i `EN_TABLES` (nic nie zmienia). Rozmiary tabel kwestii (A.5) są w 1.27 te same co w 1.26.1 (`SAY` 399 kluczy i 4250 kwestii, `SOLO` 84 i 517, `LINE_NEEDS` 57 tagów i 900 wpisów); 16 polskich kwestii ma poprawiony tekst (gramatyka, forma płci), a stara wersja nie została w żadnej z tabel kwestii (także w `LINE_NEEDS` i kluczach `CHAT_REPLY`). Wszystkie kwestie mają wpis w `DLG_EN` (poza tabelą zostają tylko litery mówiących i id klas z `CONVO` oraz "...").
