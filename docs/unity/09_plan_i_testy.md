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
| **M3 Pełne systemy** (F4) | wszystkie pułapki, potwory, poziomy 2-3, budowle, typy pokoi, karty (113), gildia, powracający, łowcy, wyłom, plotki, rozmowy bohaterów, pierwsze runy (1.12), przewodnik, zapis i wznowienie, ustawienia | odtworzenia fal (9.3c) mieszczą się w tolerancji; testy przewodnika i zapisu przechodzą |
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
| bazowy poziom fali | `waves[].waveCurve`, `waves[].waveBase` | `waveCurve`, `waveBase` |
| głód serca | `waves[].hungerNeed` | `hungerNeed` |
| mnożnik HP z 1.12 | `waves[].comboHp` | `comboHp` |
| chciwość z surowej | `greedCurve[]` | `greedCurve` |
| ceny w sklepie | `prices` (c 6, r 10, l 16, unlock 8), `rerollCost0`, `stashCap` | `priceOf`, `rerollCost`, `stashCap` |
| koszty narzędzi na lochu startowym | `toolCosts` | `toolCost` |
| statystyki poziomów 1-30 | `levelStats_1_30.json` | `levelStats` |
| domyślne modyfikatory i ustawienia | `mods`, `S` | `freshMods`, `DEFAULTS` |

Uwaga: `toolCosts` zależą od wylosowanego lochu startowego. Test powinien sprawdzać formułę (sekcja 07), a nie konkretny loch. Tolerancja dla liczb rzeczywistych: 1e-3.

Wartości wzorcowe dla innych formuł (np. ulepszenia, sprzedaż, przychód po fali, Esencja z serii) policz w ten sam sposób: skrypt `tools/golden.py` uruchamia prototyp w przeglądarce (Playwright) i woła funkcje z `__yatd`.

### b) Scenariusze (EditMode)

Krótkie, deterministyczne sytuacje z ustalonym ziarnem i ręcznie ustawionym lochem. Przykłady (prototyp ma podobne testy w `tests/`, warto je czytać jako listę przypadków):

| Scenariusz | Oczekiwanie | Test prototypu z podobnymi przypadkami |
|---|---|---|
| kolce na trasie, ulepszenie | obrażenia i koszt ulepszenia zgodne ze wzorem, odnowienie 1,5 s | `t15x_unit.py` (koszty i siła ulepszeń, poziomy fal) |
| skill check: krytyk, draśnięcie, pudło, czaszka | mnożniki i pamięć wyniku między falami, świat ×0,25 pod checkiem | `t102_shapes.py`, `t109_mem.py` |
| combo: dwie różne pułapki w 3 s, potem przerwa | stopień 2, wypłata serii po przerwie, Esencja × mnożnik; orby | `t101_core.py`, `t110_orbs.py` |
| serce: fala poniżej progu | serce zjada wszystko i kryształ; najedzone: reszta do puli | `t15_econ.py` |
| krata, odwrót po cierpliwości, mgła | krata 4 s i odnowienie, drużyna wraca po 120 s, zgubieni w mgle | `t101_mech.py` |
| klatka bez ratunku, niosący kryształ w strachu | uwięziony umiera, boss się wyrywa; przestraszony niosący upuszcza kryształ | `t15c_cage.py` |
| ciało, fobie, powracający | słabość odkryta przy trafieniu, fobia odkryta, uciekinier wraca z fobią | `t15_fear.py` |
| pułapki straszące i potwory, które dryfują | portret i oczy straszą, kołysanka, cień idzie za samotnym, kapłan zdejmuje klątwę | `t151_scare.py` |
| typy pokoi | Lodownia: poślizg; Zębatki: ta sama pułapka podbija combo; Głusza: bez ostrzeżeń; Sanktuarium: ranni odpoczywają | `t110_rooms.py` |
| rozmowy | jeden mówi naraz w zasięgu słuchu, okrzyki się przebijają | `t110_ai.py` |
| sklep | darmowa karta za falę, ceny, odświeżanie drożeje, schowek wyłącza kartę, sprzedaż | `t15_shop.py` |
| pierwsze runy | zakładki i elementy etapu 1-4, karty nowości, przejście etapów | `t112_onb.py` |
| przewodnik | 16 kroków w falach 1-3, zapis i wznowienie | `t151_tut.py`, `t10_tutsave.py`, `t10_tutsave2.py` |
| podzakładki paska (1.14) | Rany / Strach w Pułapkach i Potworach filtrują kafelki, wybór zapamiętany dla zakładki, mapa nie zmienia wysokości między zakładkami, przy jednej podzakładce etapu rząd znika, przewodnik przełącza na podzakładkę swojego kafelka | `t114_subs.py` |
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

Testy prototypu są w Pythonie z Playwright i działają na zbudowanej stronie; ścieżki w nich wskazują stary katalog roboczy (README repo). Traktuj je jako specyfikację przypadków, nie jako kod do uruchomienia.

### c) Odtwarzanie zapisanych fal (zgodność statystyczna)

Najmocniejszy test zgodności: te same lochy, te same talie, losowi bohaterowie, wiele prób, porównanie rozkładów.

- **Wejście**: zapisane fale autora (pliki `waves_<run>_<nr>.json` z Dysku Google, folder "YATD wyniki testów"; format w sekcji 07). Każdy plik ma układ lochu, elementy z poziomami i pamięcią checków, talię, modyfikatory i stan przed falą.
- **Wzorzec**: `parity/ref_1.13_mvgkfs0v1x2z.json` (run zabijania, 10 fal) i `parity/ref_1.13_mvgegs03hviw.json` (run strachu, wygrany). Policzone na Prototype 1.13 skryptem `tests/replay112.py` (bazuje na `tests/replay101.py`): fale 2-10, 8 prób na falę, celność checków 0,9, chciwość z krzywej. Dla każdej fali: Esencja z fali (`pts`), czas fali (`t`), w ilu próbach skradziono kryształ (`lost`), w ilu serce się najadło (`fedN`), próg serca (`need`), zabici i przestraszeni, rozbicie Grozy (rany, strach, zabójstwa).
- **Harness w Unity**: wczytaj plik fali, zbuduj loch i stan dokładnie jak `replay101.py`/`replay112.py` (te skrypty pokazują, które pola zapisu są potrzebne i jak ustawić chciwość, stosy kart i pamięć checków), uruchom falę bez grafiki z botem checków (trafia w środek obwódki z prawdopodobieństwem 0,9, inaczej krytyk albo pudło jak w skrypcie), powtórz 30 razy.
- **Tolerancja** (propozycja): średnia Esencja z fali i średni czas fali w granicach ±20% wzorca dla każdej fali 3-10; liczba prób z najedzonym sercem i ze skradzionym kryształem w granicach ±2 na 8 (przeskalowane na 30 prób); ta sama kolejność wielkości rozbicia Grozy (np. w runie strachu strach > rany). Większe różnice to błąd przeniesienia albo świadoma zmiana, którą trzeba opisać w sekcji 11.

Uwaga do wzorca: szum jest duży (pojedyncza fala potrafi różnić się o 30% między seriami 8 prób), więc porównuj sumy fal 2-10 i liczbę najedzonych serc, a pojedyncze fale traktuj ostrożnie. Dla porównania: na 1.11.1 suma średnich Esencji z fal 2-10 wynosiła 2340 (run zabijania) i 2182 (run strachu), na 1.12.1 2401 i 2281, na 1.13 (wzorzec) 2408 i 2311 (suma czasów fal 2-10: 657 i 610 s na 1.11.1, 851 i 769 s na 1.12.1, 976 i 804 s na 1.13). Esencja 1.12.1 i 1.13 różni się w granicach szumu (1.13.1 zmienia tylko kwestie, wzorzec z 1.13 obowiązuje); fale 1.13 są dłuższe, bo bohaterowie nie stoją w pułapkach (6.2.16).

### d) Testy interfejsu (PlayMode) i ręczne

- gesty: stuknięcie, dwa stuknięcia (ulepszenie), przytrzymanie (zdjęcie), przeciąganie, przytrzymanie w fali (przyspieszenie), stuknięcie przy checku nie robi nic innego;
- pasek budowy jako pauza, przejście kamery zgrane z paskiem;
- ekrany bez przewijania przy 360×640, 360×780 i 412×915 (tak sprawdzano prototyp);
- zapis: zamknięcie aplikacji w budowie, w fali i na ekranie po fali, wznowienie w tym samym miejscu (sekcja 07);
- ręcznie z autorem: porównanie z prototypem obok siebie (ten sam etap gry na dwóch telefonach albo telefon i przeglądarka).

## 9.4 Ryzyka wdrożenia

| Ryzyko | Co robić |
|---|---|
| AI bohaterów jest duże (p5_ai.js ok. 89 tys. znaków) i pełne drobnych reguł | przenosić blokami z sekcji 06, po każdym bloku scenariusze i odtworzenia; nie upraszczać "bo wygląda na zbędne" |
| Wyczucie skill checku (czasy, spowolnienie, strefy) | liczby z sekcji 05 dosłownie; porównanie na telefonie z prototypem; zapis wyników checków w danych testowych |
| Wygląd 2.5D vs canvas prototypu | prototyp liczy rzut sam (sekcja 08); w Unity scena 3D z kamerą ortograficzną; wcześnie zrobić test jednego pokoju z oboma nachyleniami |
| Dźwięki syntezowane w przeglądarce | nagrać je do WAV z prototypu (sekcja 08), zanim powstaną nowe |
| Balans po 1.12 (próg serca) | decyzja autora przed M3 (sekcja 11) |
| Grafika robiona przez autora | do tego czasu zastępcze bryły i sprite'y; lista assetów w sekcji 08 z rozmiarami i stanami |
