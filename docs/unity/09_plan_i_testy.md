# 09. Plan wdrożenia i testy zgodności

## 9.1 Jak pracować (dla kolejnego czatu)

1. Przeczytaj sekcje 00-02 i 11, potem sekcję systemu, który właśnie przenosisz. Szczegóły zawsze sprawdzaj w kodzie prototypu (każda reguła ma odnośnik `plik.js: funkcja`).
2. Pracuj etapami (9.2). Każdy etap kończy się działającym buildem na telefon autora i krótkim podsumowaniem dla autora: co działa, co sprawdzić, co jest inaczej niż w prototypie.
3. Najpierw testy, potem kod (9.3). Testy wzorcowe muszą przechodzić przed przejściem do kolejnego etapu.
4. Autor testuje na telefonie i porównuje z prototypem na stronie testowej. Jego uwagi mają pierwszeństwo przed specyfikacją; zmiany zapisuj w GDD (tabela zmian) i w dokumencie projektu.
5. Gdy prototyp i specyfikacja się różnią, rację ma prototyp (kod), chyba że autor zdecyduje inaczej.

Podział ról (dokument projektu): autor odpowiada za wizję, testy na telefonie, grafikę i kierunek artystyczny, konta i publikację; Claude za kod C#, systemy, symulacje balansu, teksty, lokalizację i analizę danych.

## 9.2 Etapy

Harmonogram z dokumentu projektu (start 19.10.2026, 15 tygodni): F3 Graybox w Unity (T3-T5), F4 Vertical slice (T5-T9), F5 Meta, ekonomia i monetyzacja (T9-T12), F6 Testy i balans (T12-T14), F7 Szlif i materiały do sklepu (T14-T15, do 31.01.2027). Prototyp w przeglądarce (F2) skończył się 20.10 wersją 1.12.

| Etap | Zakres | Gotowe, gdy |
|---|---|---|
| **M0 Start** (F3) | projekt Unity 6 LTS z URP, pakiety (2.2), asmdef i katalogi (2.7), repo z Git LFS, import `data/`, klasa `Rng`, `JsMath`, build na Androida | build instaluje się na telefonie autora; testy wzorcowe formuł (9.3a) przechodzą |
| **M1 Rdzeń bez grafiki** (F3) | sekcje 07 (model lochu, generator, stawianie, narzędzia), 04 (skład fal, poziomy, HP, ekwipunek), 05 (pułapki i potwory poziomu 1, obrażenia, strach), 06 (ruch, drogi, zwiedzanie, kradzież kryształu), 03 (Groza, seria combo, chciwość, serce, kryształy, koniec fali i runu) | symulacja przechodzi falę 1-10 bez Unity (test EditMode z prostym botem budującym); scenariusze 9.3b przechodzą |
| **M2 Graybox** (F3) | loch z prostych brył, kamera (dwa nachylenia, przejście 0,45 s, podążanie za drużyną), pasek budowy, HUD z liczbami, skill check (wszystkie kształty, faza "Uwaga!", spowolnienie), przytrzymanie = przyspieszenie, ekran po fali i sklep w prostej formie | autor gra na telefonie cały run i mówi "to jest ta gra" |
| **M3 Pełne systemy** (F4) | wszystkie pułapki, potwory, poziomy 2-3 (cecha A/B, 1.26), budowle, typy pokoi, karty (202, z łączeniem ★, 1.24, i grupą Serce, 1.26), statusy i reakcje, rodziny, poziomy serca, omeny, nowe klasy (1.26), gildia, powracający, Nemezis, łowcy, wyłom, plotki, rozmowy bohaterów, Rozłam, ekwipunek 1.20, więzi, finał fali, nauka w jednym runie (1.24), przewodnik, zapis i wznowienie, ustawienia | odtworzenia fal (9.3c) mieszczą się w tolerancji; testy przewodnika i zapisu przechodzą |
| **M4 Vertical slice** (F4) | grafika według listy assetów (sekcja 08), animacje, dymki, orby, pływające liczby, ściany kładące się wokół drużyny, dźwięki i muzyka (dwie aranżacje), wibracje | autor ocenia wygląd i "feel" jako co najmniej równe prototypowi |
| **M5 Dane testowe i dopracowanie** (F4-F6) | dane testowe (sekcja 07) do tego samego skryptu Google co prototyp, ankieta, wydajność na słabszym telefonie, angielska wersja tekstów (opcjonalnie) | dane z testów da się analizować tak jak z prototypu |
| **M6 Meta i monetyzacja** (F5) | projekt i wdrożenie metagry (serce lochu, kolekcja, monety, Dusze), reklamy (LevelPlay + UMP), zakupy (Unity IAP); sekcja 10 | decyzje autora zapisane w GDD; reklamy i zakupy działają w trybie testowym |
| **M7 Wydanie** (F6-F7) | test zamknięty w Google Play, materiały do sklepu, polityka prywatności, ankieta o danych, klasyfikacja wiekowa | spełnione wymagania Google Play (sekcja 10) |

Kolejność M1-M3 jest ważna: najpierw rdzeń bez grafiki z testami, bo grafika ukrywa błędy logiki, a logika jest najtrudniejsza do zgrania z prototypem.

## 9.3 Testy

### a) Testy wzorcowe formuł (EditMode)

Plik `data/golden_1.13.1.json` to wartości policzone przez działający prototyp (funkcje z `window.__yatd`). Testy porównują z nimi kod C#:

| Co | Pole w golden | Funkcja prototypu |
|---|---|---|
| liczba bohaterów fali 1-20 | `waves[].partySize`, `waves[].waveSize` | `partySize`, `waveSize` |
| bazowy poziom fali | `waves[].waveCurve`, `waves[].waveBase` | `waveCurve`, `waveBase` (od 1.24 wzorzec `waveBase` z 1.13.1 to `waveBase0`; nowe wartości fal 1-4: 4.77, 5.86, 6.54, 6.86, sekcja 04, 3.9) |
| głód serca | `waves[].hungerNeed` (wzorzec 1.13.1, od 1.26 nieaktualny) | `hungerNeed` (od 1.26 z `HUNGER_T`: fale 2-10 38, 50, 72, 104, 150, 190, 230, 272, 350, dalej ×1,2; test `t126_rebal` sprawdza tabelę przez `hungerParts(n).base`) |
| mnożnik HP z 1.12 | `waves[].comboHp` | `comboHp` |
| chciwość z surowej | `greedCurve[]` | `greedCurve` |
| ceny w sklepie | `prices` (c 6, r 10, l 16, unlock 8; od 1.26 c 5, r 9, l 14, unlock 7), `rerollCost0`, `stashCap` | `priceOf`, `rerollCost`, `stashCap` |
| koszty narzędzi na lochu startowym | `toolCosts` | `toolCost` |
| statystyki poziomów 1-30 | `levelStats_1_30.json` | `levelStats` |
| domyślne modyfikatory i ustawienia | `mods`, `S` | `freshMods`, `DEFAULTS` |

Wartości 1.18-1.24 bez wzorca w pliku (policz `tools/golden.py` na 1.24 albo wpisz z sekcji): `earlyHpK` fal 1-4 (1.540, 1.593, 1.541, 1.610), `tdCap` (rank >= 2 albo lvl >= 12: 1, inaczej 2), `fusePow` (2.5 / 2.75 / 3.125), `applyFrac` dla każdej karty łączącej się, `lvlPow` z `fuseLv` (pułapka 1.6 / 2.4 / 3.6), `bountyOf` (10 + 5 × times), `carryOf`, `burden`, `itemValue` z `CLASS_FIT`, `OK_WIDE` (szerokość obwódki kręgu i wahadła). Koszt zapadni 6 (1.24) nie dotyczy `toolCosts` (narzędzia lochu), tylko ceny elementu i ulepszeń (12, 24); od 1.26 zapadnia kosztuje 4 (ulepszenia 8 i 16).

Wartości 1.26 bez wzorca (wpisz z sekcji 03 i A.10 albo policz `tools/golden.py` na 1.26): `hungerParts` (tabela, odrodzenie +1 za potwora, demony +2, spichlerz najwyżej -40), `heartLvAt` (30, 75, 135, 210, 300, 410, 540, dalej +150), `titheNow` (0,3; z Dziesięciną 0,45; najwyżej 0,6), `feastIn` (0,8 × poziom × `feastK`), `famK` (1 + 0,08 × poziom), `cdOf` (× (1 - 0,04 × poziom)), `runePrice` (5 + poziom), `stealNeed` (5 s, Ciężki kryształ +1,5 s), `EARLY_W` (1,5; 2,25; 3; 4), `DEFAULTS.essence` 25 i `waveIncome` 6, `GZ.scare` 4, `GZ.crystal` 6, `MON_FACTOR` 0,8, `KIND_COST` 10, `BREACH_PATCH` 15, `LOOT_STEP` 1,15.

Uwaga: `toolCosts` zależą od wylosowanego lochu startowego. Test powinien sprawdzać formułę (sekcja 07), a nie konkretny loch. Tolerancja dla liczb rzeczywistych: 1e-3.

Wartości wzorcowe dla innych formuł (np. ulepszenia, sprzedaż, przychód po fali, Esencja z serii) policz w ten sam sposób: skrypt `tools/golden.py` uruchamia prototyp w przeglądarce (Playwright) i woła funkcje z `__yatd`.

### b) Scenariusze (EditMode)

Krótkie, deterministyczne sytuacje z ustalonym ziarnem i ręcznie ustawionym lochem. Przykłady (prototyp ma podobne testy w `tests/`, warto je czytać jako listę przypadków):

| Scenariusz | Oczekiwanie | Test prototypu z podobnymi przypadkami |
|---|---|---|
| kolce na trasie, ulepszenie | obrażenia i koszt ulepszenia zgodne ze wzorem, odnowienie 1,5 s | `t15x_unit.py` (koszty i siła ulepszeń, poziomy fal) |
| skill check: krytyk, draśnięcie, pudło, czaszka | mnożniki i pamięć wyniku między falami, świat ×0,25 pod checkiem | `t102_shapes.py`, `t109_mem.py` |
| combo: dwie różne pułapki w 3 s, potem przerwa | stopień 2, wypłata serii po przerwie, Esencja × mnożnik; orby | `t101_core.py`, `t110_orbs.py` |
| serce: fala poniżej progu | do 1.25.1: serce zjada wszystko i kryształ; najedzone: reszta do puli. Od 1.26: niedobór zabiera z sakiewki (bez utraty kryształu, gdy sakiewka wystarczy), kryształ pęka i sakiewka zostaje pusta dopiero przy bankructwie (przed dochodem po fali) | `t15_econ.py`, `t124d_data.py` (od 1.26: sakiewka przed kryształem, start z 25), `t126_rebal.py` |
| krata, koniec cierpliwości, mgła | krata 4 s i odnowienie; po 120 s (od 1.17) otwiera się narada (`P.council`, bez `fearless`), a gdy nie ma wyboru (serce nieznane, `councilMore` użyte) drużyna od razu wraca (`plan 'leave'`, `fl.storm = false`; do 1.16 test sprawdzał tylko powrót); zgubieni w mgle | `t101_mech.py` |
| klatka bez ratunku, niosący kryształ w strachu | uwięziony umiera, boss się wyrywa; przestraszony niosący upuszcza kryształ | `t15c_cage.py` |
| ciało, fobie, powracający | słabość odkryta przy trafieniu, fobia odkryta, uciekinier wraca z fobią | `t15_fear.py` |
| pułapki straszące i potwory, które dryfują | portret i oczy straszą, kołysanka, cień idzie za samotnym, kapłan zdejmuje klątwę | `t151_scare.py` |
| typy pokoi | Lodownia: poślizg; Zębatki: ta sama pułapka podbija combo; Głusza: bez ostrzeżeń; Sanktuarium: ranni odpoczywają | `t110_rooms.py` |
| rozmowy | jeden mówi naraz w zasięgu słuchu, okrzyki się przebijają | `t110_ai.py` |
| sklep | darmowa karta za falę, ceny, odświeżanie drożeje, schowek wyłącza kartę, sprzedaż | `t15_shop.py` |
| pierwsze runy | zakładki i elementy etapu 1-4, karty nowości, przejście etapów | `t112_onb.py` |
| przewodnik | 16 kroków w falach 1-3, zapis i wznowienie | `t151_tut.py`, `t10_tutsave.py`, `t10_tutsave2.py` |
| podzakładki paska (1.14; od 1.27: Ranią / Trzymają / Osłabiają / Straszą w Pułapkach, Walczą / Wspierają / Straszą w Potworach, Loch: Kopanie / Komnaty / Klimat) | podzakładki filtrują kafelki, wybór zapamiętany dla zakładki, mapa nie zmienia wysokości między zakładkami, przy jednej podzakładce etapu rząd znikał (do 1.15; od 1.15.1 rząd jest zawsze, a pusta podzakładka jest wyszarzona z kłódką), przewodnik przełącza na podzakładkę swojego kafelka | `t114_subs.py` |
| porady samouczka zatrzymują grę (1.15.1) | pierwsza porada fali stoi do Rozumiem (czas fali 0), Rozumiem puszcza; karta pierwszego checku zatrzymuje, pod krokiem check świat stoi (bez czasu fali); porada o karcie bohatera i o przytrzymaniu zatrzymują; przytrzymanie palca puszcza grę przyspieszoną; karta samouczka w sklepie stoi po 5 s i znika po Rozumiem | `t1151_tut.py` |
| podzakładki zawsze widoczne (1.15.1) | etap 1: rząd widoczny, Strach wyszarzony z kłódką, stuknięcie mówi "od 2. runu" i nic nie przełącza; Loch: Kopanie, wyszarzone Komnaty i Efekty | `t114_subs.py` |
| bohaterowie 1.17: narada, ciekawość, percepcja | dopełniacz imion (`nameGen`: Wandy, Jadwigi, Zofii, Heli, Borysa; `bez {g}` -> "bez Ewy"); narada po cierpliwości (drużyna 4 osób na fali 6, poz. 6+): otwiera się i rozmawia, zawsze coś postanawia, "dom" = `leave` + `fearless`, "szturm" = `assault` + `fearless` + `storm`, "jeszcze chwila" = `councilMore`, bez `fearless`, 20-31 s cierpliwości, i druga narada już bez tej opcji; dzielna i zdrowa drużyna ze znanym sercem w większości prób szturmuje, przestraszeni i ranni tchórze w większości wracają, przy nieznanym sercu nigdy szturmu; rozglądanie się w lochu 10 pokoi (chciwy, ostrożny): startuje w co najmniej połowie prób, w 60% prób ktoś dochodzi i ogląda, zawsze się kończy; pułapka w pustym pokoju do 10 pól od przywódcy jest usłyszana (`heard` = 1); śmierć obok przywódcy, a jeden bohater ponad 15 pól dalej w innym pokoju: dalszy nie wie, nie boi się i nie jest wstrząśnięty, przywódca wie, a po dołączeniu dalszy dostaje wieść (wie, strach > 0, `newsDeaths >= 1`); fale naturalne w lochu 12 pokoi: co najmniej jedno rozglądanie się na N fal, żaden dymek z surowym szablonem (`{` `}`); brak błędów strony | `t117_ai.py` |
| pamięć bohatera i dopasowanie kwestii (1.17.1) | filtr: kwestia "Każdy płomień będzie mi się śnił..." ma tag `fire`; bohater bez `fire` w pamięci jej nie powie, a `fitLine` daje zamiast niej inną pasującą kwestię albo nic (30 prób); po `sawAdd(h, ['fire'])` może ją powiedzieć; "Złoto!" pasuje do kogoś, kto widział złoto, ale nie w chwili, gdy patrzy na miksturę (`sayNow(['potion'])`), za to tak przy `sayNow(['gold'])`; rzecz chwili liczy się jako znana (kwestia z tagiem `gate` przy `sayNow(['gate'])` bez pamięci); kwestia z tagiem `death` tylko u kogoś, kto zna śmierć z `fl.deaths`; krwawienie (`burnBy 'spikes'`, 1 s) daje `dmgBy.pierce > 0`, bez `dmgBy.fire`, a w pamięci `blood` bez `fire`. Fale naturalne (4 runy, loch z co najmniej 7 pokojami, 2 efekty, 2 komnaty, jedna z nich z efektem, 10 losowych elementów z 9 typów, fala 5, do 220 s): żadna kwestia z tagiem nie pada bez znanego tagu (hak `setSayHook` w `say`), żaden bohater nie pamięta tagu, którego nie ma w lochu, mówią dalej (> 25 kwestii na run); z `--nofire` (bez ognia i prochu, bez Kaplicy czaszek i Kuźni, bez Płonących grotów i Ognistej otchłani) nikt nie ma `fire` w pamięci i nie pada żadna kwestia o ogniu; brak błędów strony | `t1171_saw.py` (`t113_talk.py`: okrzyk "Kolce!" w samotności wymaga od 1.17.1 kolców w pamięci) |
| serce je na bieżąco (1.16.1) | serce je w trakcie otwartej serii combo; nigdy ponad potrzebę; Esencja fali nigdy poniżej tego, co zjadło serce; na końcu fali Esencja fali = część serca + sakiewka bez Obżarstwa, a część serca = min(potrzeba, Esencja fali); suma Esencji na kartach elementów nie większa niż suma wartości chwilowych (`fl.prov`) | `t1161_heart.py` |
| celowe rozdzielenie (1.16) | zwiad płaci `GZ.split` zamiast samotności (stosunek ok. 0,4 do samotności na bohatera i sekundę), strach ze źródła `split`, nie `alone`; zgubienie kończy rozdzielenie i liczy `splitLost`; partner idzie za zwiadowcą i odchodzi, gdy zwiadowca zginie; w lochu 12 pokoi z pętlami na fali 6 (złodziej, wojownik, mag, kapłan) w 5 falach jest co najmniej jedno rozdzielenie i czas zwiadu; złodziej idzie na zwiad z postoju | `t116_split.py` |
| komnaty (1.15; od 1.26 test sprawdza 15 komnat po 10 Esencji) | Loch = Kopanie (4) / Komnaty (12) / Efekty; każda pułapka i potwór w dokładnie jednej komnacie; Kolce i Strzały na ścianie pokoju bez cechy, po Zbrojowni (12 Esencji) z cechą; moc ×1 na poz. 1, ×1,25 na poz. 3; komnata obok Mgły; komórka układu [8] efekt, [9] komnata; Kuźnia zastępuje Zbrojownię (Kolce tracą cechę); Cofnij przywraca; zdjęcie za 0, zwrot 6, efekt zostaje; Krata w drzwiach Więzienia ma cechę (jej `slotRoom` to drugi pokój); Graciarnia wyszarzona bez Mimika; wszystkie 12 komnat, każda z jednym z 9 efektów (komnata i efekt razem), rysuje się bez błędów przy 3 przybliżeniach; w każdej komnacie stoi co najmniej jedna rzecz, a każda rzecz i każda komnata ma swój rysunek (rzeczy stojące, elementy ścian) | `t115_kinds.py` |
| odkrycia na stałe (1.14) | karta odblokowania zapisuje element; następny run zaczyna z nim, jego karta nie wypada w sklepie, inne odblokowania tak; run etapu 1 nie pokazuje elementu z etapu 2 | `t114_found.py` |
| złodziej przed pułapką ścienną (1.13.4) | fala 2 runu testera `mvh8nl1a0g9d` (układ i drużyna: złodziej 4, tchórzliwy wojownik 3, mag 3) zagrana 6 razy z modelem stukania: nikt nie przestępuje przez 6 s między dwoma polami (przed poprawką w 9 z 20 prób) | `t1134_disarm.py` |
| scenka przygotowania (1.13.3) | czterech specjalistów przed groźnym pokojem: mówią lider i dwóch (scenka do 10 s), wszyscy czterej i tak działają; bez specjalisty odpowiada liderowi ktoś inny; sam lider mówi za siebie | `t1133_prep.py` |
| ślepe przejście (1.13.2) | fala 7 runu autora `mvh4wnpcy54a` odtworzona 8 razy: drużyna może zebrać łup z wąskiego pasa, przygotować się przy drzwiach i odpocząć, ale nigdy nie spędza większości najazdu przy krypcie (na 1.13.1: 130 i 132 s z 132 s fali) | `t1132_deadend.py` |
| sam bohater (1.13.1) | gdy nikt go nie słyszy: kwestia narady staje się myśleniem na głos, odpowiedź dla innych nie pada, okrzyk zostaje okrzykiem; przy drzwiach, gdy reszta jeszcze wchodzi, nie jest sam | `t113_talk.py` |
| rozmowy (1.13) | kwestia (np. nieudane rozbrojenie) z przyjacielem w zasięgu słuchu zaczyna wymianę: jego odpowiedź, potem odpowiedź pierwszego, po kolei; przerwana wymiana przepada | `t113_talk.py` |
| narada tylko dla stojących razem (1.13) | bohater w innym pokoju nie staje, gdy lider rozmawia; dwie grupy mogą rozmawiać naraz | `t113_talk.py` |
| nikt nie stoi w pułapce (1.13) | bohater w rozmowie na znanym zagrożeniu schodzi na bezpieczne pole; odpoczynek tylko na bezpiecznym polu | `t113_talk.py` |
| check u góry, spokój (1.13) | płyta checku pod ikonami drużyny; narada, odpoczynek, zapadnia z kimś w środku i wszyscy w klatkach to spokój | `t113_quiet.py` |
| jedno pole na bohatera | w korytarzu idą gęsiego, mijają się, stojący robią miejsce przywódcy, nikt nie utknie; dwóch stojących na jednym polu w mniej niż 1% klatek | `t1121_tiles.py` |
| narada i odpoczynek | drużyna schodzi się do przywódcy, kwestie po kolei do końca, odpoczynek 10-26 s, cierpliwość ×0,5 w scenkach | brak osobnego testu w prototypie (opis w sekcji 06) |
| karty 1.18 (od 1.26 test liczy 163 karty do talii i losuje więcej ofert) | każda nowa karta ustawia pole `freshMods`; rzadkość, `unique`, `grows`, etap, `req`; losowanie oferty z elementem i bez; podpowiedź "Brak w lochu" w `cardFit` i w sklepie; `hgallery` wymaga obu; sprawdzenia działania wszystkich 28 kart i zmienionych (Szybki montaż, Krzyki w ścianach, Pajęcze gniazdo...); talia, sklep i zapis z `u-portrait` się nie psują | `t118_cards.py` (`--only=a,b`) |
| Rozłam (1.19) | rozłam na rozwidleniu odchodzi i płaci Grozę zwiadu; scalenie; foch; bunt | `t119_rift.py` (sprawdzenie rozwidlenia zależy od układu i bywa niestabilne także na 1.19) |
| ekwipunek i łup (1.20) | pochodzenie przedmiotów, rzeczy poprzednika, przeszukanie ciała, dzielenie się, ciężar, przydział łupu, latarnia, łom, wybity przedmiot, bomba w ogniu, powracający z trofeum i karta bohatera, kod osi czasu Zbrojowni `st`, nowe kwestie (liczby, długość, znaki, szablony, bez duplikatów), fale organiczne (3 ziarna × 3 fale 5-7 ze wszystkimi komnatami i efektami, kratami, mimikami 3. poziomu, ranami ×2,5) | `t120_gear.py` (sekcja "knock" bywa niestabilna, także na 1.21) |
| więzi (1.21) | 750 drużyn: udziały, wzajemność, rangi mistrzów (od 1.24: ok. 75% i 27%, reguła ucznia), żadnej dla powracającego; żałoba i zemsta (strach ×1,5 świadka, furia, zabójca oznaczony, +30%), uczeń dorasta po 20 s; "nie zostawię" dla uwięzionego i zgubionego; mistrz i rywal; kłótnia (jeden zwycięzca, raz na parę, przerwanie przez przywódcę, sprzeciw nad ciałem, partner nie grabi); zakład; wymiana bez roli C nie gra; fale organiczne | `t121_bonds.py` |
| finał fali (1.22) | eskorta (formuje się, strażnicy blisko, przejęcie 50% / wojownik 70%), przekazanie (max 2, co 6 s), bastion (5 s stoi, duch go wybiera, koniec po 8 s i poniżej 25% HP), poświęcenie (pokój z jednymi drzwiami i znaną siecią, niosący nie wchodzi przed odpaleniem), "ty pierwszy", opukiwanie (30 prób, >= 20% znalezionych: test statystyczny, ok. 4% szans na porażkę), "nie tędy", szyk; fale organiczne kończą się w 300 s | `t122_final.py` |
| Nemezis (1.23) | tytuł i uraza z pola, Złodziej Kryształu po wyniesieniu, zwykły pierwszy powracający, nagroda 20, najwyżej dwóch; +2 poziomy, ranga >= 1, odwaga ×1,4, talizman/amulet; pokój i pułapka znane, `nemesisIntro`, prowadzi; złodziej rozbraja, barbarzyńca rozbija, mag oznacza (zagrożenie ×2), kapłan walczy z goblinem +25%; zabicie płaci 20, `run.fallen`, nie wraca; brak ucieczki powyżej 15% HP; ucieczka: wraca z times 3, nagroda 25; pamięć poległych; zapis i wczytanie (stary zapis bez pól gra dalej) | `t123_nemesis.py` |
| 1.24 część A (od 1.26 zaktualizowany: zapadnia 4, krzywa fal 1-4 1,5 / 2,25 / 3 / 4, dochód +3) | wyczerpanie po +60 s (druga grupa, zakład, bastion odwołane, zgubiony odnaleziony, wszyscy wychodzą, nikt nie znika) i wymuszone wyjście po +150 s z kryształem z powrotem w sercu; zapadnia (koszt 6, ulepszenia 12/24, nowicjusz spada 2 razy, elita i poz. 12 raz, widzi nieznaną zapadnię, "Zapadnie: 2/2"); fale 1-4 (bazy, HP, fale 5-10 bez zmian, fala 1 samouczka bez zmian); zdarzenia w 60 falach organicznych (zakłady, kłótnie, bunty, rozłamy, żałoba, bastiony, drwiny, przekazania > 0); łączenie kart (moc i cecha grup, pełna talia, schowek, brak trzeciej kopii, unique, karty rosnące, cena dwóch, teksty, stary zapis z dwiema kopiami, zapis ★) | `t124a_play.py` (`--only=exhaust,trapdoor,waves,events,fuse`, `--reps=3`) |
| 1.24 część D | status runu (każda kombinacja), dziennik kryształów (karty, kradzież, głód z napisem, linia podsumowania, ostrzeżenie w budowie, kupno i zmiana spoza dziennika, zabity niosący = `saved`, sumy na falę i run), czas aktywny (sztuczny zegar, bezczynność 60 s, ukryta strona, nowe posiedzenie po 400 s i po wczytaniu), nowe pola rekordów (`checkByShape` się sumuje, `total` = fale + `endBonus` 0), pytanie o imię (tylko WWW), pytanie o Esencję (puls, "Nie pytaj więcej", nie przy 2 z 100 ani w przewodniku), spokojne checki (fale 1, 2, 3), szerokości okien, diagnoza elementów | `t124d_data.py` (`--only=status,crystals,time,records,name,unspent,calm,widths,items`) |
| 1.24 część B | mapa bez ramki (pion i poziom: bez ramki, płótno = ekran, widok = `#stage`, gradienty, puste miejsce HUD przepuszcza stuknięcie, 9 przycisków i kafelki działają, loch rysowany poza widokiem); znaczniki niskich ścian (wszystkie 5 pułapek ściennych); nauka w jednym runie (fale 1-8, etapy, odblokowania, karty w falach 3, 5, 7, zapis w fali 4, poznana gra po fali 7, stary run w etapie); przewodnik (16 kroków, tylko kolce wymagane, odmowa poza trasą, opis po przytrzymaniu z "Rani", tekst kroku move z pułapką w ręce, bez pytania o Esencję, kolce odpalone, `stepTimes`); animacje (każda umiejętność i pułapka, żadnej przy "mniej ruchu"); podgląd fali (10 fal, kolejka = podgląd, mieści się w 380 px); pasek strachu (czytelny, pod HP, stuknięcie liczone) | `t124b_ui.py` (`--only=frame,walls,onb,tut,spikes,hold,fx,preview,fear,shots`) |
| 1.24 część C | szaman (leczenie bez zmian, jeden zsumowany "+4" po sekundzie, Groza = 0,02 × wyleczone / max, karta "Wyleczył potworom 65 HP."); krata (2 pola: nie; obok i wchodzi, wchodzi, w drzwiach: tak; obok i odchodzi: nie); tempo (budowa stoi, nic nie rysuje w 1,5 s, `html.still`; stuknięcie budzi; ok. 30 klatek/s po stuknięciu; fala do 60; pauza 15 w 0,5 s potem postój; hak budzi); 120 Hz: 61 klatek na 120 odświeżeń | `t124c_perf.py` (`--only=shaman,gate,pace,hz`) |
| 1.26 "Serce zabiera" | tabela głodu fal 2-10 i fala 11 = ×1,2; odrodzony potwór +1 głodu; sakiewka pokrywa niedobór bez utraty kryształu, za mała sakiewka = kryształ i bankructwo; Danina i poziomy (dwa poziomy = dwa czekające Dary serca, poziom 2 daje miejsce w talii), rząd Dar serca 3 karty z grupy Serce, bez Odrostu na poziomach 1-2, Odrost na poziomie 3 przy brakującym krysztale i zwraca kryształ; Ofiara 1:1, najwyżej 40; klasy: fale 1-3 klasyczne, fala 4 paladyn i tropiciel, fala 6 alchemik, kultysta nigdy z puli, tylko z Pielgrzymką (2 kultystów); nowe charaktery i fobie, ok. 60% z charakterem; omeny: nigdy dwa razy, brak w runie z przewodnikiem, wykluczenia fali 3, Oblężenie +2, Saperzy złodziej i tropiciel, Inkwizycja kapłan i paladyn, Mgła wojny ukrywa podgląd; wszystkie 34 nowe karty istnieją i zmieniają `mods`, Kopista kopiuje kartę po prawej, Lustro duszy pierwszą, Kopista pomija kartę unikalną, Przeklęta korona ×1,35; status olej i reakcja Pożar (olej znika), unieruchomienie; powalony goblin zostaje na mapie; ekrany: start (słowa 1.26), karta głodu, karta serca, wieść z ramką omenu, Mgła wojny w podglądzie, karta bohatera ze statusami; kilka pełnych fal ze wszystkimi nowymi elementami bez błędów strony | `t126_rebal.py` |
| boty 1.26 (dym) | całe runy botami (`e126/bot`) z różnymi strategiami, z kartami i omenami: brak błędów strony; liczby nie służą do kalibracji (sekcja 11) | `e126/bot/bot.py`, `bot.js` (poza `tests/`) |
| rozmowa z kwestii z kolejki (1.17) | kwestia powiedziana z kolejki drużyny (np. odpowiedź, oglądanie rzeczy przy rozglądaniu się, wieść o śmierci) może zacząć wymianę `CONVO`; kwestie dopisane w trakcie przeglądu kolejki nie giną | brak osobnego testu w prototypie (opis w sekcji 06, 6.7.3) |

Testy prototypu są w Pythonie z Playwright i działają na zbudowanej stronie; ścieżki w nich wskazują stary katalog roboczy (README repo). Traktuj je jako specyfikację przypadków, nie jako kod do uruchomienia.

### c) Odtwarzanie zapisanych fal (zgodność statystyczna)

Najmocniejszy test zgodności: te same lochy, te same talie, losowi bohaterowie, wiele prób, porównanie rozkładów.

- **Wejście**: zapisane fale autora (pliki `waves_<run>_<nr>.json` z Dysku Google, folder "YATD wyniki testów"; format w sekcji 07). Każdy plik ma układ lochu, elementy z poziomami i pamięcią checków, talię, modyfikatory i stan przed falą.
- **Wzorzec**: `parity/ref_1.13_mvgkfs0v1x2z.json` (run zabijania, 10 fal) i `parity/ref_1.13_mvgegs03hviw.json` (run strachu, wygrany). Policzone na Prototype 1.13 skryptem `tests/replay112.py` (bazuje na `tests/replay101.py`): fale 2-10, 8 prób na falę, celność checków 0,9, chciwość z krzywej. Dla każdej fali: Esencja z fali (`pts`), czas fali (`t`), w ilu próbach skradziono kryształ (`lost`), w ilu serce się najadło (`fedN`), próg serca (`need`), zabici i przestraszeni, rozbicie Grozy (rany, strach, zabójstwa).
- **Harness w Unity**: wczytaj plik fali, zbuduj loch i stan dokładnie jak `replay101.py`/`replay112.py` (te skrypty pokazują, które pola zapisu są potrzebne i jak ustawić chciwość, stosy kart i pamięć checków), uruchom falę bez grafiki z botem checków (trafia w środek obwódki z prawdopodobieństwem 0,9, inaczej krytyk albo pudło jak w skrypcie), powtórz 30 razy.
- **Tolerancja** (propozycja): średnia Esencja z fali i średni czas fali w granicach ±20% wzorca dla każdej fali 3-10; liczba prób z najedzonym sercem i ze skradzionym kryształem w granicach ±2 na 8 (przeskalowane na 30 prób); ta sama kolejność wielkości rozbicia Grozy (np. w runie strachu strach > rany). Większe różnice to błąd przeniesienia albo świadoma zmiana, którą trzeba opisać w sekcji 11.

Uwaga do wzorca: szum jest duży (pojedyncza fala potrafi różnić się o 30% między seriami 8 prób), więc porównuj sumy fal 2-10 i liczbę najedzonych serc, a pojedyncze fale traktuj ostrożnie. Dla porównania: na 1.11.1 suma średnich Esencji z fal 2-10 wynosiła 2340 (run zabijania) i 2182 (run strachu), na 1.12.1 2401 i 2281, na 1.13 (wzorzec) 2408 i 2311 (suma czasów fal 2-10: 657 i 610 s na 1.11.1, 851 i 769 s na 1.12.1, 976 i 804 s na 1.13). Esencja 1.12.1 i 1.13 różni się w granicach szumu (1.13.1 zmienia tylko kwestie, wzorzec z 1.13 obowiązuje); fale 1.13 są dłuższe, bo bohaterowie nie stoją w pułapkach (6.2.16).

Sprawdzenie 1.17 (narada, ciekawość, percepcja; ten sam skrypt, ale 4 próby na falę, fale 2-10 obu runów): suma średnich Esencji z fal 2-10 wzrosła z 2301 (run zabijania `mvgkfs0v1x2z`) i 2094 (run strachu `mvgegs03hviw`) na 1.16 do 2457 i 2228 na 1.17, czyli ok. +6,5%; średni czas fali ok. +9 s (suma czasów fal 2-10 na 1.17: ok. 982 i 797 s); kryształ skradziony w 5 i 6 próbach z 36 (na 1.16: 4 i 3; na 1.15.1: 4 i 5, więc w granicach rozrzutu między seriami). Wzorzec `parity/ref_1.13_*.json` nie był liczony od nowa: przy porównaniu z Unity na 1.17 trzeba policzyć nowy wzorzec albo uwzględnić te +6,5% (sekcja 11).

Sprawdzenie 1.18-1.24 (ten sam skrypt `replay_talk.py`, `CURVE=1`, 4 próby na falę, fale 2-10 obu runów autora; liczby z `CHANGES118-124.md`; uwaga: odtworzenia zaczynają nowy run na każdą falę, więc nie ma w nich powracających, Nemezis, nagród ani pamięci poległych):

| Wersja | Run zabijania `mvgkfs0v1x2z` | Run strachu `mvgegs03hviw` | Uwagi |
|---|---|---|---|
| 1.18 | - | - | bez liczb balansu; testy ekonomii (`t15_econ`, `t114_found`, `t115_kinds`) bez zmian |
| 1.19 | 2300-2600 | 2216-2540 | w granicach szumu; ok. 1-2 rozłamy i 1 foch na run |
| 1.20 | 2214, 2610 | 2531, 2612 | pierwsza wersja +25-30% (krytyk wybijał przedmiot, a odzyskanie liczyło się jako łup); po poprawce w rozrzucie 1.19 |
| 1.21 | 2668, 2594 | 2678, 2415 | w rozrzucie 1.20 |
| 1.22 | 7 serii: 2480 (2338-2597), kryształy 5,0 | 7 serii: 2592 (2235-2737), kryształy 6,6 | razem Esencja +5%, utracone kryształy +14% wobec 1.21 (granice: +25% / -10%) |
| 1.23 | 2328, 2519, 2513 | 2512, 2872, 2429 | jak 1.22 (Nemezis nie pojawia się w odtworzeniach) |
| 1.24 A (4 serie) | 2542 (2397-2699), fale 2-5: 76, 181, 168, 279; kryształy 5-7 | 2245 (2060-2394), fale 2-5: 21, 54, 70, 316; kryształy 8-12 | trudniejsze fale 1-4: run zabijania płaci więcej w falach 2-4, run strachu mniej i traci kryształ w fali 2 w 4 na 4 próby (1.23: 0-1); fale 6-10 obu w szumie (6 dodatkowych serii fal 6-10 runu strachu: 1841 wobec 1836) |
| 1.24 C (2 serie) | 2464, 2722 | 2275, 2197 | tempo klatek nie zmienia gry (te same fale z ziarnem dają identyczny wynik); ślad Grozy szamana za mały, by go zobaczyć; nowa reguła kraty (run strachu ma kraty w falach 5-10) bez widocznej zmiany |

Wzorca w `parity/` nie liczono od nowa. Przy porównaniu Unity z 1.24 trzeba policzyć nowy wzorzec (zwłaszcza fale 2-5, które zmieniły się celowo), najlepiej w trybie całego runu (powracający, Nemezis i polegli przechodzą między falami, jak w `e124/evcount.py`).

Sprawdzenie 1.26: odtworzeń `replay_talk.py` na 1.26 nie było, a wzorzec `parity/ref_1.13_*.json` przestał pasować do ekonomii (inna tabela głodu, sakiewka zamiast utraty kryształu, start 25, dochód 6, tańsze elementy). Boty z `e126/bot` przeszły całe runy bez błędów strony, ale są słabsze od modelu z planu (dominuje kradzież kryształu), więc liczby planu zostały bez zmian, a kalibracja czeka na dane z testów z ludźmi (sekcja 11). Przy porównaniu Unity z 1.26 trzeba policzyć nowy wzorzec w trybie całego runu.

**Częstość zdarzeń** (1.24, nowe narzędzie `e124/evcount.py`): cały run 10 fal w lochach autora z checkami losowymi (40% krytyk, 42% draśnięcie, 18% pudło), 10 runów każdego z dwóch runów autora = 200 fal; tabela w sekcji 06 (6.15.2). Dla Unity: ten sam pomiar jako test statystyczny (każde zdarzenie > 0 w 60 falach, udziały w granicach ±50% tabeli).

Sprawdzenie 1.17.1 (pamięć bohatera, dopasowanie kwestii, krwawienie jako rana kłuta; ten sam skrypt, 4 próby na falę, fale 2-10 obu runów autora, liczby z `CHANGES1171.md`): suma średnich Esencji 2207 (run strachu `mvgegs03hviw`) i 2602 (run zabijania `mvgkfs0v1x2z`) na 1.17.1 wobec 2158 i 2642 na 1.17 w tej samej serii, czyli w granicach szumu. Przypisanie do runów wynika z logu odtworzenia 1.17 (run strachu: 2158); liczby 1.17 z tej serii różnią się od 2228 i 2457 z poprzedniego sprawdzenia, co pokazuje rozrzut między seriami. Kwestii na run tyle samo co na 1.17 (450-490), z tego ok. 15-24 zamienione przez `fitLine` i prawie żadna pominięta. Nowego wzorca nie liczono.

### d) Testy interfejsu (PlayMode) i ręczne

- gesty: stuknięcie, dwa stuknięcia (ulepszenie), przytrzymanie (zdjęcie), przeciąganie, przytrzymanie w fali (przyspieszenie), stuknięcie przy checku nie robi nic innego;
- pasek budowy jako pauza, przejście kamery zgrane z paskiem;
- ekrany bez przewijania przy 360×640, 360×780 i 412×915 (tak sprawdzano prototyp); od 1.24 także poziom (844×390): kolumna HUD po prawej, mapa po lewej (`t124b_ui` frame);
- mapa bez ramki (1.24): stuknięcie w puste miejsce HUD trafia w mapę, bohater przy górnej krawędzi daje się stuknąć;
- tempo klatek (1.24): budowa bez dotyku nie rysuje (CPU), fala 60 klatek/s także na ekranie 120 Hz, stuknięcie budzi od razu; porównanie obrazu przed i po (`e124/c/vis.py`: różnica najwyżej 3/255 na piksel);
- zapis: zamknięcie aplikacji w budowie, w fali i na ekranie po fali, wznowienie w tym samym miejscu (sekcja 07);
- ręcznie z autorem: porównanie z prototypem obok siebie (ten sam etap gry na dwóch telefonach albo telefon i przeglądarka).

## 9.4 Ryzyka wdrożenia

| Ryzyko | Co robić |
|---|---|
| AI bohaterów jest duże (p5_ai.js w 1.17 ok. 150 tys. znaków, w 1.24 ok. 280 tys.) i pełne drobnych reguł; od 1.17 każda reakcja zależy też od tego, kto co widzi i słyszy; od 1.19-1.23 druga grupa, więzi, finał i Nemezis splatają się z naradą, percepcją i łupem | przenosić blokami z sekcji 06, po każdym bloku scenariusze i odtworzenia; nie upraszczać "bo wygląda na zbędne" |
| Wyczucie skill checku (czasy, spowolnienie, strefy) | liczby z sekcji 05 dosłownie; porównanie na telefonie z prototypem; zapis wyników checków w danych testowych |
| Wygląd 2.5D vs canvas prototypu | prototyp liczy rzut sam (sekcja 08); w Unity scena 3D z kamerą ortograficzną; wcześnie zrobić test jednego pokoju z oboma nachyleniami |
| Dźwięki syntezowane w przeglądarce | nagrać je do WAV z prototypu (sekcja 08), zanim powstaną nowe |
| Balans po 1.12 (próg serca) | decyzja autora przed M3 (sekcja 11) |
| Trudniejszy początek 1.24 | run strachu traci kryształy w falach 2-3 częściej; ocenić na testach z ludźmi (sekcja 11) |
| Ekonomia 1.26 bez kalibracji | liczby z planu nie są sprawdzone na ludziach ani na mocnym bocie; przed M3 policzyć wzorzec i zebrać dane testowe v62 (sekcja 11) |
| Grafika malowana w kodzie (1.26) | `p7c_art.js` maluje obrazki przy pierwszym użyciu; w Unity wygenerować je raz do atlasu (sekcja 08, 6.14a) |
| Wydajność na telefonie | płótno na cały ekran (1.24) to ok. 1,6 raza więcej pikseli; ciepło obniża tempo klatek, a nie sama klatka; w Unity od razu `targetFrameRate` i rysowanie na żądanie (sekcja 07, 7.10.9) |
| Zdarzenia rzadkie z założenia | łom, wymiana sprzętu, rozłam z narady prawie nie występują w lochach autora; testy jednostkowe zamiast odtworzeń |
| Grafika robiona przez autora | do tego czasu zastępcze bryły i sprite'y; lista assetów w sekcji 08 z rozmiarami i stanami |
