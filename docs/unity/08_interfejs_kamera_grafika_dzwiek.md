# 08. Interfejs, sterowanie, kamera, grafika, dźwięk i samouczek

Wersja źródłowa: Prototype 1.15.1 (`LOG_VERSION = 58`), z uzupełnieniami do 1.27 (`LOG_VERSION = 62`, w 1.26.1 i 1.27 bez zmiany; niżej). Od 1.26 dochodzi plik `src/p7c_art.js` (ilustracje i nowa grafika rysowana w kodzie), od 1.27 `src/p1e_en.js` (angielskie kwestie bohaterów; języki: sekcja 02, 2.10). Od 1.27 interfejs jest domyślnie po angielsku; napisy cytowane w tej sekcji są polskie (wersja, którą widzą testy), a ich angielskie odpowiedniki stoją w kodzie obok, w parach `L('pl', 'en')`. Pliki: `src/p0_head.html` (CSS), `src/p0b_body.html` (DOM), `src/p6_loop.js` (kamera, skill check, muzyka, efekty dźwiękowe, haptyka), `src/p7_draw.js` (rysowanie na canvasie), `src/p8a_icons.js` (ikony SVG), `src/p8b_ui.js` (HUD, ekrany, wejście, sklep, zapis, samouczek).

Autor jest bardzo zadowolony z wyglądu, odczucia i dźwięku prototypu ("fenomenalna robota"). Wersja Unity ma być **wierną kopią prezentacji**: te same kolory, rozmiary, czasy animacji, dźwięki i zachowanie gestów. Ta sekcja opisuje wyłącznie prezentację i interakcję. Zasady gry są gdzie indziej: przebieg runu, ekonomia, sklep (sekcja 03), generowanie bohaterów (sekcja 04), pułapki, obrażenia, strach i logika skill checku (sekcja 05), AI bohaterów i reguły mówienia (sekcja 06), mapa, reguły stawiania, pętla gry i zapis (sekcja 07).

## Zmiany w 1.27.5

- **Szybsza budowa** (plan rebalansu 6.7, oba usprawnienia): w opisie elementu przycisk "Ulepsz wszystkie w pokoju" (`#sheet-upgrade-all`, "N × → poziom L · koszt"), gdy w tym samym pokoju stoją co najmniej 2 elementy tego typu na tym samym poziomie (`sameInRoom`); jedno cofnięcie na całość, łączny koszt (`upgradeAllCost`), przy poziomie 2 -> 3 z cechami A/B okno gałęzi z łącznym kosztem i podpisem "× N" (ta sama gałąź dla wszystkich); `stats.upgradeAll`. Drugie usprawnienie: dwa stuknięcia w wolne pole (w `DOUBLE_TAP_MS`, bez wybranego elementu) stawiają jeszcze raz ostatnio postawiony element (`lastPlaced`, `stats.repeatPlace`); linia w "Jak grać".
- **Przycisk "Wypuść falę"** (brief "Serce hamuje", D): od fali 2 podpis "K bohaterów · głód H · zapas E", czerwony przy ryzyku i zapasie < 20% głodu (tabela przycisku wyżej). Fala 1 i samouczek bez zmian, bez nowego okna.
- **Pasek serca w HUD** (brief A): gdy awans czeka na następną falę (`heartUpBlocked`), wiersz głodu ma klasę `waiting`: pełny złoty pasek delikatnie pulsuje (`satwait`, bez animacji przy `prefers-reduced-motion`), `title` "Nasycenie pełne: następny poziom w kolejnej fali". Karta serca: punkt o poziomach "Każdy poziom daje darmową kartę z rzędu Dar serca. Karty Daru nie zajmują miejsc w talii. Najwyżej 1 poziom na falę. Poziomy 3, 5, 7: może trafić się Odrost (kryształ wraca).", pasek "Nasycenie X / Y · poziom w następnej fali"; podsumowanie fali: "Nasycenie pełne: poziom serca wejdzie na początku budowy"; karta samouczka `heartLv` z dopiskiem "Najwyżej 1 poziom na falę."
- **Rząd Serce w talii** (brief B): w panelu talii sklepu `deckSize` miejsc na zwykłe karty, pod nimi karty Daru w ramce serca (`.slot.giftslot`), nagłówek "Talia X/Y · ♥ Serce N"; w pasku (zakładka Talia) karty Daru po zwykłych, z napisem "♥ Serce" (`.giftcard`). Karty Daru: przycisk "Do schowka" wyłączony, strzałki przesuwania tylko w obrębie zwykłych kart.
- **Pułapki 3D** (autor: "wszystko poza postaciami ma być 3D"; `p7_draw.js: wallKit, lipSlab, WALL_3D, drawWallItem`; `p7c_art.js: trapOnFloor, jaw3D, grateRim`): 9 dotąd płaskich pułapek ma bryły. Ścienne na stojącej ścianie (lico S albo E): Portret (gruba rama z pozłacanym wałkiem, płótno z twarzą i oczami wpuszczone w głąb), Lustro (owalna rama z warstw i grzebień, szkło wpuszczone, twarz przy wystrzale), Oczy (kamienna płyta z łukiem brwi i nosem, oczy w oczodołach, czerwona poświata przy wystrzale), Strzały (okuty blok z trzema szczelinami i grotami; przy wystrzale bełty lecą w pokój, kurz ze szczelin), Ogień (żelazna płyta z brązową rurą, rozszerzony wylot, płomyk; przy wystrzale strumień ognia, poświata, iskry), Wahadło (wspornik i belka nad ścianą, pręt i dwuwarstwowe ostrze wiszące ok. 0,4 pola w pokoju, kołysze się wzdłuż ściany: mało w spoczynku, mocno przy wystrzale; cień na ścianie, iskry z ostrza), Runa piorunów (kamienna płyta z gzymsem, świecąca runa w panelu; przy wystrzale dwie błyskawice do podłogi przed nią, rzadki trzask w spoczynku). Na obniżonej ścianie (w fali) ścienne pułapki leżą na krawędzi jako niskie bryły, najwyżej ok. 0,2 pola (`lipKit`, ten sam interfejs co `wallKit`, więc `WALL_3D` rysuje te same modele); to, co wystaje dalej (bełty, strumień ognia, błyskawice, belka i ostrze wahadła), leci w pokój. Podłogowe: Wnyki (dwie żelazne szczęki na sprężynie, zęby w górę, płytka nacisku, łańcuch z kołkiem; po zatrzaśnięciu szczęki stoją zwarte, iskry), Przynęta (gruba płyta z kupką złotych monet, wokół szczęki, które zatrzaskują się przy wystrzale; monety dotąd nie były widoczne na mapie), Zalanie i Wyziewy (niska żelazna obręcz wokół kraty). Zostają stany `anim`/gorący, mruganie, znaki wyłączenia / odnowienia / gotowości, kropki poziomu i przyciemnienie we mgle. Cząsteczki: najwyżej 16 na pułapkę, tylko przy wystrzale (albo rzadka iskra w spoczynku), liczone i rysowane razem z pułapką, więc tylko na ekranie; brak przy `reduceMotion`. W Unity: modele 3D z tymi samymi częściami i efektami cząsteczek.
- **Wszystko poza postaciami w 3D** (autor 25.10: "2d tylko potwory i bohaterowie, reszta 3d!"). Płaskie zostają tylko rzeczy, które naprawdę leżą w powierzchni (plamy, kałuże, woda, wyryte runy, wzory posadzki i ścian, deski drzwi w podłodze, znaczniki gracza: kółka, przerywane obrysy). Bryły budowane z rzutowanych ścian (góra jasna, południe średnie, wschód ciemne) i z warstw elips dla brył obrotowych; nieruchome części rekwizytów efektów malowane raz do małego canvasu (`rxKeep`, najwyżej 160 wpisów) i potem tylko wklejane.
  - **Mapa i elementy** (`p7_draw.js: drawHeartIso, drawTorch, cage3D, cageFront, LOOT_PILE, lipKit, ISO_ART`; `p7c_art.js: rod3D, bone3D, skull3D, lathe3D, ring3D, slab3D, crystal3D, rubble3D, TOP_ART web/trapdoor/cage, ISO_ART falsedoor/tar/bell, drawHazards`): serce na schodkowym cokole, z grubością i kryształami-ośmiościanami; pochodnia (płytka, ramię, czasza ze smołą); Sieć rozpięta nisko między 4 szpilkami; Zapadnia z ramą i dwoma skrzydłami z desek (otwarta: dół z kamiennymi ścianami); Klatka z prętami od pierścienia do ramy, przednia połowa rysowana po złapanym bohaterze (osobny rodzaj w kolejce rysowania, 7); gruz zniszczonej budowli; kolce i wabik w podniesionej obręczy; kości i czaszka; łup (monety z krawędzią w stosie, mikstura jako szklana kula z płynem, toczony kielich relikwii); ołtarz (świece-walce), zasłona (słupki, drążek, kotara w dwóch warstwach), kajdany (ogniwa-pierścienie); drzwi: brama (belka, kwadratowe pręty z grotami, ćwieki = pozostałe użycia), skrzypiące drzwi i fałszywa ściana z grubością, smoła z kociołkiem przechylanym przy wylewaniu; Dzwon (słupki, belka, okrągły dzwon z sercem); mimik (zęby i oczy wystają); kolczatki, bomba saperów z iskrzącym lontem, bloki kamienia na polu wyłomu (drzwi wyłomu w pamięci raz na mapę). Plama oleju malowana, ale z grubą krawędzią.
  - **Komnaty** (`p7_draw.js`: pomocniki po `pLine`: `kSh, pBox, pRod, pCap, pCurve, pKnob, pOval, pDome, pRing, pBlade, pBone, pSkull, pSlab, pTuft, pFloorEll`; `PROP`, `KIND_WALL` z `kwKit` i `kindWallDeco` (funkcje dostają `(K, t, u0, alt, T)`), `KIND_WALL3D`, korony ścian `WALL_STYLE`, `kindSolid` na końcu `drawKindBlock`; `p7c_art.js`: blok komnat 1.26): wszystkie stojące rekwizyty (ognisko z kręgiem kamieni, grzyby, totem, kokony, kocioł, kości, krzesła, urny, stosy czaszek, stojaki, tarcze, koksowniki, nagrobki `pSlab` z okrągłym, kwadratowym albo złamanym szczytem, krzyże z belek, kolby i stół laboratorium `pFlask` i inne), nowy rekwizyt `gmound` (kopiec grobu na Cmentarzu), wszystkie ozdoby ścian 15 komnat jako bryły w układzie lica (tarcze z umbem, włócznie i miecze, rama z wpuszczonym płótnem, półki ze słojami, ceglany łuk paleniska, nisze kostnicy z czaszkami, okno z okrągłymi kratami, łańcuchy, sztandar ze skóry, pajęczyna, kotara, latarnia), elementy dawniej wmalowane w tekstury ścian (słup, kokon, haki, pierścień, deska, półka, tabliczka) jako bryły (`solid`/`solidV`); trawa Cmentarza w podłodze cieniowana jak stojące kępki. Płaskie celowo: rysy pazurów ogra, znak otchłani, kartki (z krawędzią i pinezką).
  - **Efekty pokojów** (`p7c_art.js`, sekcja efektów: `rxShade, rxLit, rxSolid, rxLathe, rxRod, rxEgg, rxRock, rxBox, rxHCyl, rxXW, rxPlane, rxCandles, rxCrystal, rxHang, rxDrape`, pamięć `rxKeep`/`RXC`, nowy `rx_urn`): wyloty Mgły z kamieni, gałęzie, sitowie z okrągłymi łodygami na kopcu, pień, ropucha na kamieniu, huby, stalagmity i kryształy Groty, płyty nagrobne, świece i urny Krypty, kopce monet, skrzynia z odchyloną pokrywą i sztabki Skarbca, posłania (leżący walec), dzban i kubek Przystani, zębatki z warstw, rury z kołnierzami, zawór i manometr, dźwignia, bele filcu i dzwon w płótnie Głuszy, kryształy i sople Lodowni pod lodowym gzymsem; liście lilii, dywan i klejnoty z krawędzią.
  - Koszt (pomiary agentów, przeglądarka bez GPU, mediana, sceny celowo pełne): elementy mapy ok. +0,5 ms; komnaty 20 na 20 pokoi ok. 5,5 -> 7,5 ms (T30) i 3,0 -> 3,7 ms (T56); rekwizyty efektów bez zmian z daleka, do ok. +1 ms z bliska. Uproszczenia przy oddaleniu (mniej detali poniżej T 20-24).
- **Efekty pokojów jak komnaty** (`p7_draw.js: drawRoomTypes, RT_WALL, rtGrad, rtWallWash`; `p7c_art.js` od sekcji "1.27.5" na końcu: podłoga, rekwizyty, `rfxAir`, `rfxPropsSO`, ozdoby ścian): każdy z 9 efektów ma własną podłogę malowaną raz na pokój i krok przybliżenia (przycięta do pól pokoju, jak podłoga komnaty), ruchomą warstwę, małe rekwizyty 3D (stały plan na pokój, rysowane przez `drawProp` razem z rekwizytami komnaty, nigdy na pułapce, potworze, meblu ani polu serca), cząsteczki w powietrzu (bez stanu: każda to faza zegara, limit na pokój, tylko pokoje na ekranie, brak przy `reduceMotion`) i ozdoby ścian. Progi przybliżenia (`T`): podłoga od 6 (dalej dawny jednolity odcień), animacja podłogi od 14 (dryf Mgły zawsze), cząsteczki od 14 (połowa poniżej 24), rekwizyty od 9, ozdoby ścian od 20. Z komnatą w pokoju efekt ustępuje: jaśniejsza podłoga, mniej i mniejsze rekwizyty tylko na wolnych polach brzegu, cienkie ozdoby ścian. Kolor efektu z `RT_INFO` bez zmian.

| Efekt | Podłoga i jej ruch | Rekwizyty | Powietrze | Ściany |
|---|---|---|---|---|
| Mgła | wilgotny szary kamień, rosa, mgła przy ścianach; dryfujące warstwy | kamienne wyloty, martwe gałęzie | niski wał mgły, kłęby z wylotów | mgła u stóp ściany, szary mech |
| Bagno | błoto, czarne sadzawki, rzęsa, liście lilii; kręgi i bąble | sitowie, zgniły pień, ropucha | bąble, muszki, zielony gaz | zwisające wodorosty, huby |
| Grota | mokry niebieski kamień, czysta sadzawka z refleksami; kręgi kropli | stalagmity, niebieskie kryształy | krople z sufitu (lądują tam, gdzie zaczynają się kręgi), błyski, zimny oddech | stalaktyty z kroplą, mokre smugi |
| Krypta | spękane płyty, wosk, fioletowe runy pulsujące; pełznąca mgła | płyty nagrobne z krzyżem, świece z fioletowym płomieniem, urny | fioletowe smugi z run, kurz | nisze ze świecą, pajęczyny, runa |
| Skarbiec | ciemne płytki ze złotą intarsją i medalionami, monety, klejnoty; przesuwający się połysk | kopce monet, otwarta świecąca skrzynia, sztabki | złoty pył, błyski | złota płyta z klejnotem, ćwieki |
| Przystań | słoma, czerwony dywan (bez dywanu przy komnacie); oddech świec | świece, posłania, dzban | iskry ze świec, ciepły pył | kotara z krzyżem, kinkiety |
| Zębatki | nitowane płyty, świecące szczeliny, doły z kręcącymi się kołami | zębatki na stojakach, miedziane rury z zaworem i manometrem, dźwignie | para z rur, iskry | zębatki wystające ze ściany, rura u stóp |
| Głusza | ciemny filc ze szwami; kręgi dźwięku, które gasną | bele filcu, zgaszone świece, dzwon owinięty płótnem | opadający kurz, dym ze świec | ciężkie fałdy kotar |
| Lodownia | lśniący lód ze spękaniami, bąble, szron od ścian, śnieg w rogach; połysk | kryształy lodu, bloki lodu ze skrzynią w środku | padający śnieg, zimna para, błyski | sople 3D z kroplą |

- Koszt klatki (pomiar agenta, przeglądarka bez GPU, 390 × 844 przy 2×, loch 20 pokoi, 200 klatek; przed / po, ms na klatkę): 6 pokoi z efektem: 38,3 / 44,0 (daleko, T16), 26,9 / 32,0 (normalnie, T30), 21,1 / 27,3 (blisko, T48); wszystkie 20 z efektem: 48,4 / 61,0, 35,1 / 45,9, 23,0 / 31,1. Czyli ok. 15-30% wolniej przy typowych 6 pokojach. Na telefonie z GPU podłoga z pamięci powinna być tańsza; do sprawdzenia w telemetrii (`perf` w podsumowaniu fali). Następne cięcia, gdyby trzeba: mniej cząsteczek albo animacja podłogi dopiero bliżej.
- Rezonans: opis "Esencja +3% za każdą inną zwykłą kartę w talii (karty Daru serca się nie liczą, najwyżej +30%)".
- Wersja "Prototype 1.27.5", "Co nowego" z nowymi liniami.

## Zmiany w 1.27.4

- **Karty sklepu pionowe** (autor: karty były kwadratowe, a ilustracja dalej kwadratowa przy za dużym napisie): karta ma proporcje 5:7, ilustracja wypełnia całą kartę (`ART.cardTall(id)`: ta sama karta malowana w 50 × 70, linia ściany niżej o `DY` = 20, motyw wyżej i 1,2 raza większy, znaczek w prawym górnym rogu; `ART.cardImg(id, big, tall)`), a nazwa (11 px, najwyżej 2 linie) i cena leżą na ciemnym pasie u dołu (gradient do `rgba(8,8,10,0.86)`). Runa rodu: ikona runy na poświacie koloru rodziny. Znaczek ★ / ! w lewym górnym rogu. 4 karty: jeden rząd (nazwa 10,5 px).
- Niskie okno (do 760 px): karty w jednym rzędzie przewijanym w bok jak pasek budowy (szer. 86 px, przyciąganie do karty), z ilustracją; przewinięcie zostaje przy odświeżeniu widoku (`m.cardsX`). Wyżej: 3 karty w rzędzie, 2 rzędy przy 5-6 kartach.
- **Odśwież w Darze serca** losuje nowe karty Daru (ten sam koszt odświeżenia; oferty sklepu zostają; `shopReroll(ad, heart)`, `stats.heartRerolls`). Wcześniej odświeżało niewidoczne oferty pod spodem.
- Opis karty w panelu (`.cdetail .tx`) przewija się, gdy nie mieści się nawet w 11 px (bez ucinania).
- Wersja "Prototype 1.27.4", "Co nowego" z czterema liniami.

## Zmiany w 1.27.3

- **Sklep jak w karciance** (autor: pięć kart w siatce 2×2, np. z Dziesięciną, były ściśnięte i nieczytelne; wzór: Balatro i pasek budowy). Opis w 3.9, "Sklep w 1.27.3".
- Wersja na ekranie startowym "Prototype 1.27.3", w "Co nowego" dwie nowe linie (bohaterowie nie znikają, sklep z kart).

## Zmiany w 1.27.2

- Zakładka bez niczego z danego etapu nauki (w pierwszym runie Obiekty do fali 5) nie znika już z paska: zostaje na swoim miejscu, przygaszona (`.tab.off`, kłódka), a stuknięcie mówi, od której fali (`subWhen`). Wcześniej znikała i pojawiała się później, przesuwając zakładki.
- Dymek kafelka: przytrzymanie palca na telefonie wywołuje też `contextmenu`; dymek pokazywał się wtedy drugi raz z animacją. `showTip` nie odtwarza się ponownie dla tego samego kafelka, a `contextmenu` z dotyku jest pomijane.
- Potwór powalony ciosem zostawał z białym błyskiem trafienia (`m.flash` nie malał, bo `monstersTick` kończył się dla powalonych przed jego zmniejszeniem) i po odrodzeniu był biały; błysk maleje też u powalonych, a budowa go zeruje.

## Zmiany w 1.27.1

- Równanie Esencji (`#h-eq`) nie znika skokiem: klasa `eq-off` zwija je (max-height, przezroczystość, przesunięcie w górę) po końcu fali i rozwija na jej początku (ok. 0,3 s; bez animacji przy `prefers-reduced-motion`). Zwinięte nie łapie stuknięć.
- Kafelki paska budowy: tło sceny w kolorze rodziny (`ART.tintOf`, `FAM_TINT` w `p7c_art.js`: Mechanizmy niebieskie, Ogień pomarańczowy, Alchemia i Zielonoskórzy zielone, Nawiedzenie fioletowe, Nieumarli ciemne z zielonkawym blaskiem, Bestie brązowe, Demony krwiste, Skarby złote; obiekty brązowo-złote; narzędzia Lochu i komnaty bez zmian) i dolna krawędź kafelka w tym kolorze (`--fam`).
- Sklep: po kupnie Runy rodu jej wiersz zostaje jako pusty, przerywany wiersz tej samej wysokości ("Kupione: X, poziom N"), więc reszta sklepu się nie przesuwa (`run.shop.runeDone`; odświeżenie oferty go czyści).
- Zakładka Talia: kafelek Rodziny (`#tile-families`, po kafelku Sklep, także w fali) otwiera kartę `families` (`renderFamilies`): każda rodzina z runą, poziomem (romby 0-5), skutkiem poziomu (+8% mocy, -4% odnowienia, statusy +8% na poziom; Skarby: łup +8% Chciwości), elementami i liczbą jej elementów w lochu.
- Znaczek omenu pod podglądem drużyny ma styl podglądu (ciemna płyta, fioletowa krawędź, mały napis OMEN), zamiast fioletowej pigułki.
- Danina na bieżąco: patrz 03 (`heartLive`).

## Zmiany w 1.27 (skrót)

Przegląd UI/UX ekran po ekranie i drugi język (plan "Prototype 1.27 - przegląd UI/UX, czytelność i język", 25.10.2026). Zasada autora: UI nie mówi wszystkiego naraz; ogólne rzeczy mają być dostępne i zrozumiałe, szczegóły drobnym drukiem, a opis nie tłumaczy mechanik z innych miejsc. Stąd trzy warstwy informacji, których trzyma się każdy ekran (także w Unity):

| Warstwa | Gdzie | Co tam jest |
|---|---|---|
| 1. Rzut oka | HUD, mapa, kafelki | liczba, ikona, jedno słowo; tylko to, co zmienia decyzję teraz |
| 2. Stuknięcie | dymek kafelka, karta bohatera, karta serca | nazwa, jedno zdanie "co to robi", koszt |
| 3. Szczegóły | drobny druk pod spodem, "Szczegóły", "Jak grać" | liczby, wyjątki, skill check, rodzina |

- **Kategorie budowania** (2.5): podzakładki mówią czasownikiem, co element robi bohaterom. Pułapki: Ranią / Trzymają / Osłabiają / Straszą; Potwory: Walczą / Wspierają / Straszą; Loch: Kopanie / Komnaty / Klimat (dawne Efekty). "Mrok" i "Statusy" zniknęły. Id podzakładek: `dmg`, `hold`, `weak`, `fear` i `dmg`, `sup`, `fear`.
- **Dymek kafelka** (2.5): nazwa, koszt, tag, słowa Rani / Straszy, opis jednym zdaniem (`desc`), a pod nim drobny druk (`.fine`): `more` (miejsce, typ obrażeń, liczby, kto jest odporny, skill check), "Rodzina: X" (z poziomem) i krok ceny łupu. Linia rodziny nie tłumaczy już Runy rodu. Ten sam `more` jest pod opisem na karcie elementu (3.15).
- **HUD** (2.2, 2.3): równanie Groza × Chciwość × Combo = Esencja jest widoczne tylko w fali; wiersza rangi nie ma (ranga jest w Szczegółach podsumowania, na ekranie końca runu i w rekordzie na starcie); koszt na kafelku poprzedza kropla Esencji zamiast rombu podobnego do kryształu.
- **Mapa** (6.13): etykieta pokoju w budowie: głębia "×N" i kropki miejsc (● zajęte, ○ wolne), gdy pojemność jest najwyżej 6.
- **Start** (3.3): 2 zdania wstępu, pole imienia testera zwinięte pod "Dla testerów", Jak grać w 7 krótkich działach, Co nowego tylko 1.27 (starsze pod "Starsze wersje", tylko po polsku).
- **Podsumowanie fali** (3.8): "Groza N × chciwość K = E", "o włos: złodziej był X s od kryształu" tylko poniżej 3 s, "+N dochodu po fali", przyciski Szczegóły / Wyjdź / Zakończ run, główny "Dalej: sklep"; notka o zapisie wyników tylko w Szczegółach, "Pobierz wyniki" tylko w Menu z podpisem "dla testerów".
- **Sklep** (3.9): nagłówek "Esencji · 1 darmowa karta" albo "darmowe karty: N"; schowek "karty tu nie działają". **Karta serca** (3.22): podtytuł "Serce · poziom N" bez dopisku; rozbicie głodu tylko, gdy ma coś poza podstawą.
- **Wieści z karczmy i boss** (3.19a, 3.8): czempion i bohater z przepowiedni mają kartę jak omen (`bossBox`) w wieściach i w panelu następnej drużyny po fali; wieści otwierają się same w budowie fali z bossem (jak przy omenie, nie w samouczku); `waveHint` nie mówi już o bossie i omenie, a o głodzie mówi z zasadą sakiewki.
- **Samouczek i karty zasad** (8.3a, 8.4): teksty przepisane, krótsze, zwykle jedna myśl na krok.
- **Język** (3.6, sekcja 02, 2.10): "Język / Language" na górze Ustawień (English / Polski), zmiana przeładowuje grę; Menu > Ustawienia ma podpis "język, dźwięk, wibracje, skill checki".
- **Polski tekst** całego UI i danych przepisany krócej i naturalniej (nazwy elementów i kart bez zmian); testy z napisami poprawione.

## Zmiany w 1.26.1 (skrót)

- **Ukryte przejście** (6.13, 6.14b): nowy kafelek w zakładce Loch, podzakładka Kopanie, po Tunelu (scenka `EL.secret`); znaczniki na korytarzach ("?" maskuj, "×" zdejmij maskę); na mapie zamaskowane drzwi to blok kamienia z fioletowym konturem i "?", odkryte to gruz.
- **Ogar na tropie** (6.14b): biegnący ogar rysuje się w `gx, gy` (jak unoszący się potwór, ale niżej).
- **Sklep i karta serca** (3.9, 3.22): rząd Dar serca losuje tylko karty rzadkie i legendarne, a karty Serca nie pojawiają się w zwykłej ofercie; w karcie serca punkt o poziomach mówi "(rzadka albo legendarna, karty Serca są tylko tam)", a notka z głodem liczy Kamienne serce.
- **Start** (3.3): "Prototype 1.26.1 · 10 fal i finał", "Co nowego w Prototype 1.26.1" z 4 nowymi wpisami na górze; nowe opisy charakterów (`TRAIT_TEXT`) przesądnego, ciekawskiego i zapaleńca.

## Zmiany w 1.26 (skrót)

- **Wiersz serca** (2.2): pasek głodu, po nasyceniu złoty pasek Nasycenia, cienka złota linia Nasycenia pod spodem, numer poziomu przy ♥, w budowie "serce chce N · zapas X"; stuknięcie (albo Enter) otwiera **kartę serca** (3.22) z rozbiciem głodu, Nasyceniem i Ofiarą; w fali pauzuje grę.
- **Sklep** (3.9): rząd **Dar serca** zamiast ofert, gdy czeka poziom serca, "Później (sklep)" i "♥ Dar serca czeka (N)"; **Runa rodu** pod ofertami; obrazki kart na ofertach; 4 + Wiedza mroku ofert.
- **Podsumowanie fali** (3.8): część serca z animacją zabierania z sakiewki, Nasycenie, poziom, Odrodzenie, Uczta, "byli S s od kradzieży", reakcje; ramka omenu w panelu następnej fali; "Reakcje" i "Uczta" w pasku "Skąd Esencja".
- **Omen** (3.19a, 6.13a): ramka omenu w wieściach z karczmy (otwierają się same raz w budowie fali z omenem), znaczek "Omen: <nazwa>" pod podglądem fali, Mgła wojny ukrywa drużynę w podglądzie i w podsumowaniu, napis przy wejściu na starcie fali.
- **Wybór cechy A albo B** przy ulepszaniu na poziom 3 (3.23); karta elementu pokazuje obie cechy (3.15) i rodzinę z poziomem (podpowiedź kafelka, 2.5).
- **Statusy**: ikonki nad bohaterem, kałuże, kajdany i nić kusicielki na figurze (6.7a), lista statusów na karcie bohatera (3.14); **reakcje**: duży napis i pierścień na podłodze.
- **Karta talii** (3.16): obrazek karty ×2, przyciski "◀ W lewo" i "W prawo ▶", gdy w talii jest Kopista albo Lustro duszy, "Teraz kopiuje: ...".
- **Nowa grafika** (6.14, 6.14a; 6.2a, 6.5, 6.7, 6.7a, 6.8): ilustracje kart 72×48, sceny na kafelkach paska 72×36, ikonki statusów, runy, herby rodzin, sceny omenów 96×48, figury 4 nowych klas i 10 potworów, 10 nowych pułapek na mapie, posąg jako bryła 3D, rekwizyty, ściany i podłogi 3 nowych komnat, zagrożenia na podłodze, powalone potwory, więcej detalu w starych figurach.
- **Pasek budowy** (2.5): podzakładki Pułapki: Rany / Statusy / Strach, Potwory: Rany / Mrok / Strach, 3 nowe komnaty w zakładce Loch; kafelek bez rysunku dostaje ikonę rodziny (`genIcon`).
- **Karty nowych zasad** (8): `heartLv`, `heartCry`, `status`, `reaction`, `revive`, `cultist` w każdym runie (raz w przeglądarce); start "Prototype 1.26", "Co nowego w Prototype 1.26", nowe punkty "Jak grać" (3.3); karta głodu przepisana (3.18).

## Zmiany w 1.25 (skrót)

- **Telefon, tablet, komputer** (2.9): `--ui` (krótszy bok / 600, od 1 do 1,3) powiększa interfejs na tablecie i monitorze; ekran szerszy niż wysoki i wyższy niż 560 px ma budowę w panelu po prawej, HUD w lewym górnym rogu mapy, mapę w reszcie (złożony panel oddaje mapie swoją kolumnę). Telefon w pionie i w poziomie bez zmian.
- **Mysz, touchpad, klawiatura** (4.1, 4.7): przeciągnięcie po włączeniu przyspieszenia kończy je i przesuwa mapę; mapę mniejszą niż ekran da się przesunąć o 1/4 widoku; środkowy przycisk przeciąga; prawy przycisk: opis kafelka albo zdjęcie elementu (drugie kliknięcie potwierdza); kółko przybliża, touchpad przesuwa dwoma palcami, szczypanie przybliża; najechanie pokazuje opis kafelka, elementu albo bohatera; skróty WASD, + -, 1-9, Q/E, Enter, B; okno Menu > Sterowanie.
- Kamera: limity skali × `--ui`, kamera fali przybliża do skali budowy (5.3, 5.4). Panele rysowane na płótnie (podgląd fali, drużyna, check, dymki, pauza) × `--ui` (6.1). Log: `runs.screen` (`LOG_VERSION = 60`).

## Zmiany w 1.18-1.24 (skrót)

- **1.24 mapa bez ramki** (2.8): płótno pod całym ekranem, HUD, szuflada i przyciski stoją na mapie na lekkim cieniu; w poziomie kolumna po prawej.
- **1.24 następna fala w budowie bez stuknięcia** (6.13a), **pasek strachu** pod paskiem HP i stuknięcie w niego (6.7), linia "Zabici / Wystraszeni" w podsumowaniu, słowa "Rani" / "Straszy" w opisach (3.8, 2.5 podpowiedź kafelka).
- **1.24 animacje** bohaterów i pułapek (6.13b); **znaczniki na niskich ścianach** od frontu ze strzałką (6.13).
- **1.24 samouczek w jednym runie** i krótszy przewodnik (8), pytanie o imię w wersji WWW, pytanie o niewydaną Esencję i pulsujący licznik (2.2, 3.21), ostrzeżenie o głodzie w wierszu serca (2.2), linia o utraconym krysztale (3.8), "Zapadnie: n/limit" na karcie bohatera (3.14).
- **1.24 połączone karty ★** w sklepie, talii, schowku i oknie karty (3.9, 3.16); **tempo klatek** i zatrzymywanie ozdób CSS w bezczynności (sekcja 07, 7.10.9); zielone "+N" leczenia szamana i "Wyleczył potworom N HP." w opisie podniesionego szamana (`itemInfo`) i na karcie elementu (6.10).
- **1.19-1.23**: pierścienie pod drugą grupą, strażnikiem, przeszukującym ciało i latarnią, ▼ przy przeciążonym, narzędzia w plecaku, złota obwódka Nemezis (6.7); karta bohatera z pochodzeniem przedmiotów, ciężarem, więzią, Nemezis i nagrodą (3.14); kratki Liczb: Rozłam, Ekwipunek, Więzi, Finał, Nemezis (3.8); napisy nad bohaterami (6.10).
- Ekran startowy: "Prototype 1.24 · 10 fal i finał", "Co nowego w Prototype 1.24" z wpisami 1.24 na górze (starsze zostają).

## Zmiany w 1.12.1 (skrót)

- Bohaterowie stoją na środku swojego pola (jedno pole na bohatera, sekcja 06, 6.2.15); przy mijaniu odchylają się w bok o `0,24 × sin(π × prog)` pola (`p3_flow.js: heroPos`).
- Narady i odpoczynek to scenki z kilkoma dymkami po kolei; drużyna podchodzi do przywódcy i patrzy na niego (sekcja 06, 6.7.5); w ich trakcie bez autoprzyspieszenia.
- Pasek czasu w HUD pokazuje czas cierpliwości `fl.patT` (w scenkach płynie 2 razy wolniej).
- Nowa karta "Wieści z karczmy", komunikaty sklepu nad przyciskiem, poprawki z listy w rozdziale 10.

## Zmiany w 1.17.1 (skrót)

- Karta bohatera, "Ta fala": nowy punkt "Widział w tej fali: ..." / "Widziała w tej fali: ..." (co bohater widział albo poczuł w tej fali, w kolejności zobaczenia; 3.14).
- Zakładka Liczby: nowa kratka "Kwestie o tym, co widzieli / zamienione / pominięte" (3.8).
- Krwawienie (kolce 3. poziomu i kolce w Zbrojowni) ma nad figurą czerwoną kropkę zamiast płomyka (6.7).
- Ekran startowy: podtytuł "Prototype 1.17.1 · 10 fal i finał", 3 nowe wpisy w "Co nowego w Prototype 1.17.1" (3.3).

## Zmiany w 1.17 (skrót)

- HUD: w trakcie narady na końcu cierpliwości `#h-time` pokazuje "narada" zamiast pozostałego czasu (2.2).
- Karta bohatera: nowe stany "wraca sam do domu" i "rozgląda się" w wierszu "Teraz" (3.14).
- Ekran po fali: nowe ciekawostki "Zwiedzali" i "Narada" (3.8); w zakładce Liczby cztery nowe kratki (od poprawki wydania 1.17): "Osobno: zwiad / sam / zgubiony (s)", "Rozglądania / monety / pułapki z szukania", "Narada: dom / szturm / chwila · sami do domu" i "Słyszane zza ściany / wieści o śmierci". Wiersze dopisane w 1.16 i pierwszej wersji 1.17 do `statsTable` nie pokazywały się, bo ta funkcja nie jest wołana (rozdział 10).
- Napis "Wraca sam" / "Wraca sama" nad przegłosowanym, który wraca do domu, i "+1 złota" nad tym, kto znalazł monetę w meblu (pływające napisy, kolory `#c9c2d8` i `#f2c94c`).
- Ekran startowy: podtytuł "Prototype 1.17 · 10 fal i finał", lista "Co nowego w Prototype 1.17" (3.3).
- Dymków jest ok. 3 razy więcej (treść i zasady: sekcja 06, 6.7); wygląd dymka bez zmian.

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
| `13_komnaty.png` | 1.15: Goblinia nora we Mgle: ziemne ściany z belkami, korzeniami i trawą na górze, ognisko z polanami, świecące grzybki, totemy z czaszką, odciski dłoni, mgła na podłodze i przy ścianach, nazwy komnaty i efektu; pasek: Loch, podzakładka Komnaty |

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
| Komnaty (glif, kolor, od 1.15) | Goblinia nora ♣ `#a7d060`, Leże pająków ✳ `#d4cbe8`, Jaskinia ogra ♠ `#d99a6c`, Nawiedzona sala ✧ `#a6e8ff`, Gniazdo nietoperzy ☾ `#bba2e6`, Kaplica czaszek ☠ `#efe6cc`, Zbrojownia ⚔ `#c9d5e2`, Kuźnia ⚒ `#ffa65c`, Więzienie ⛓ `#bdb19b`, Graciarnia ⌂ `#dcae6c`, Galeria ▣ `#ecc65e`, Pokój dziecięcy ♪ `#f2bcd4` | `p1_config.js: KIND_INFO` |
| Efekty, dawniej typy pokoi (glif, kolor) | Mgła ≋ `#b9c4d8`, Bagno ~ `#8fbf6a`, Grota ) `#9fb6ff`, Krypta ✝ `#c9b6e8`, Sezam ◆ `#ffd27a`, Sanktuarium ✚ `#f3e2b0`, Zębatki ⚙ `#d6a86a`, Głusza ◌ `#9aa6bb`, Lodownia ❄ `#bfe6ff` | `p1_config.js: RT_INFO` |
| Podłoga pokoi (od wejścia w głąb) | `ROOM_TINT` `#424448` → `#44464a` → `#46464b` → `#48464b` → `#4a464a` (od 1.15 szara kamienna aż do końca, w głębi tylko odrobinę cieplejsza; 1.0-1.14: `#3f4246` → `#5f3239`, "zaschnięta krew" w głębi; interpolacja po odległości; korytarz × 0,62) | `p1_config.js`, `p2_state_map.js: tint` |
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
| 2 | `#h-pips` / `#h-barwrap` + `#h-time` | 10 pipsów runu + "budowa" | pasek czasu (`fl.patT / S.waveTime`, od 1.12.1 czas cierpliwości, w scenkach płynie wolniej; mosiądz) + pozostały czas m:ss, "pauza", "szturm!" / "odwrót" (gdy `fl.fearless`; "szturm!" przy `fl.storm`), od 1.17 "narada" (gdy trwa narada na końcu cierpliwości, `fl.party.council`); po "jeszcze chwila" znów czas (30 s) | pips 7 px wysokości, odstęp 3 px; pasek 6 px; czas Jersey 14 px |
| 3 | `#h-hrow`: ♥ `#h-heart` z poziomem `#h-hlv` (od 1.26), pasek `#h-hfill`, linia Nasycenia `#h-sfill` (od 1.26), `#h-hlabel` | etykieta "serce chce N z fali" albo "serce głodne od fali 2"; od 1.26 "serce chce N · zapas X" (albo "⚠ N · zapas X"), bez głodu "serce poz. L" | "serce X/N" → "serce syte"; od 1.26 po nasyceniu "syte · Danina 30% → poz. L+1" | pasek 9 px; patrz stany niżej; od 1.26 klikalny (`role="button"`, kursor rączki) |
| 4 | `#h-eq` (równanie) | do 1.26.1: Groza 0 × Chciwość start × Combo 1 = +0; od 1.27 ukryte | żywe wartości serii combo | patrz 2.3 |
| 5 | `#h-rankrow` | do 1.26.1: "Ranga · Następna za N" albo "ranga: Legenda"; od 1.27 zawsze ukryty | ukryty (równanie potrzebuje miejsca) | 12,5 px muted |

**1.27**: równanie jest tylko w fali (`eq.hidden = !raid`; w budowie pokazywało same zera), a wiersz rangi jest ukryty zawsze (`#h-rankrow`). `updateHud` dalej wpisuje tekst rangi do `#h-rank` (martwe, rozdz. 10). Rangę gracz widzi w Szczegółach podsumowania (Co dalej: "Ranga runu: X (E Esencji, następna: Y od P)."), na ekranie końca runu i w rekordzie na starcie. W Unity: w budowie HUD ma tylko rzędy 1-3.

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

**Ostrzeżenie o głodzie** (1.24, `hungerRisk`, sekcja 03, 2.13): w budowie, gdy nadchodząca fala ma głód i ostatnia fala dała mniej niż 1,25 × próg (albo serce zjadło kryształ), etykieta "⚠ N z fali albo kryształ", wiersz czerwony z szybkim biciem serca, a `title` wiersza: "Głód: jeśli ta fala da mniej niż N Esencji, serce zje kryształ (ostatnia fala dała M)." Od 1.26 ostrzeżenie tylko wtedy, gdy sakiewka nie pokrywa głodu; etykieta "⚠ N · zapas X", `title` "Głód: N Esencji. Fala da mniej: serce zabierze brak z sakiewki (masz X), a gdy nie wystarczy, pęknie kryształ (ostatnia fala dała M)."; bez ostrzeżenia `title` "Serce: stuknij, żeby zobaczyć głód, Nasycenie i Ofiarę".

**Serce od 1.26** (`updateHud`, CSS `.hbar em`, `#h-heart sub`, `.hungerrow.fed .hbar i`): w stanie `fed` pasek `#h-hfill` pokazuje Nasycenie od progu bieżącego poziomu do następnego (`(satiety - heartLvAt(L)) / (heartLvAt(L+1) - heartLvAt(L))`) w złotym gradiencie `#ffe39a` → `#c9932b` → `#7a5214` zamiast zielonego; pod paskiem 2-pikselowa złota linia `#h-sfill` (gradient `#a8781f` → `#ffd27a`, poświata) pokazuje to samo Nasycenie w każdym stanie poza `fed` i `off`; przy ♥ mały numer poziomu (`<sub>` 700 9 px `#ffd27a`, puste przy poziomie 0). Klasa `take` (bicie `heartHit` 3 razy, ♥ `#ff3b4e`) jest w CSS na zabieranie z sakiewki, ale kod jej nie nadaje (martwa; zabieranie widać w podsumowaniu fali, 3.8). Klucz pamięci HUD zawiera poziom, Nasycenie i sakiewkę, więc wiersz odświeża się przy zakupie.

**Esencja, za którą coś kupisz** (1.24, `.afford`, `cheapestItem`): w budowie bez okna, gdy Esencja >= koszt najtańszego elementu, licznik `#h-score` pulsuje złotem; przy "mniej ruchu" i w bezczynności (`html.still`) jest złoty i nieruchomy. Pasek cierpliwości `#h-bar` jest od 1.24 zapisywany tylko przy zmianie (wcześniej co klatkę wymuszał przeliczenie układu).

Wypełnienie paska = `fl.fed / need` (animacja szerokości 0,25 s). Od 1.16.1 `fl.fed` rośnie przy każdym zdarzeniu Grozy (`heartLive`, sekcja 03, 2.4), więc pasek rusza od razu, a nie dopiero przy wypłacie serii; czerwone orby lecą wtedy z pola wyniku do ♥ co ok. 0,6 Esencji. Orb dolatujący do ♥ powiększa je (`heartHit`, skala 1,55, 0,32 s). Element `#h-hmark` (znacznik progu) jest zawsze ukryty.

### 2.3 Równanie Groza × Chciwość × Combo = Esencja (`updateHud`, `p0_head.html: .eqrow`)

Od 1.27 rząd jest widoczny tylko w fali (w budowie i na ekranach między falami ukryty); opis "poza falą" niżej dotyczy wersji do 1.26.1. Rząd wyśrodkowany, odstęp 4 px. Pięć pudełek (`.eq`): etykieta 9 px wersalikami muted, wartość Jersey 15 px; minimalna szerokość 48 px, padding 2/7/3 px; operatory `×`, `=` 13 px `--dim`. Kolory wartości: Groza `--violet-hi`, Chciwość `--gold-hi`, Combo i Żyła `--ice`, Esencja `--ess` w pudełku z tłem `#231215` i ramką `#6e1c27`. Przy ≤380 px: odstęp 2 px, min. 44 px, wartość 14 px, etykieta 8,5 px.

| Pudełko | Wartość | Uwagi |
|---|---|---|
| `#eq-g` Groza | w trakcie serii combo "+G" (G = Groza serii minus to, co jeszcze leci w orbach), przez 1,6 s czasu gry po wypłacie G wypłaconej serii, inaczej "0" | |
| `#eq-c` Chciwość | w fali obecna chciwość minus lecące orby złote; poza falą chciwość na start | etykieta "Chciwość" w fali, "Chciwość start" poza |
| `#eq-k` Combo | ×(1 + 0,25 × (krok combo - 1)) minus lecące orby lodowe; w serii jej combo | etykieta "Combo" |
| `#eq-rop`, `#eq-r` Żyła | ×mods.regen | widoczne tylko, gdy karta Żyła esencji (`mods.regen ≠ 1`) |
| `#eq-e` Esencja | "+E" serii (G × Chciwość × Combo × Żyła × `S.essK`; do 1.16 bez `S.essK`, więc przy wypłacie liczba podskakiwała o ok. 10%), po wypłacie "+E" wypłaty, inaczej "+0" | |

Stany całego rzędu: `idle` (nic się nie dzieje: Groza i Esencja w 45% krycia), `chain` (trwa seria: Groza z fioletową ramką `--violet-lo` i poświatą `rgba(160,140,232,0.25)`), `paid` (1,6 s po wypłacie: pudełko Esencji z ramką `#a3263a` i poświatą `rgba(255,70,85,0.45)`). Zmiana wartości w trakcie serii/wypłaty: liczba "pyka" (skala 1,3 → 1 w 0,3 s, nie częściej niż co 220 ms na pudełko). Orb dolatujący do pudełka: błysk ramki w jego kolorze 0,22 s (`gHit`, `cHit`, `kHit`). Stuknięcie rzędu (albo Enter/spacja) otwiera okno "Skąd Esencja" i pauzuje trwającą falę. Zasady liczenia: sekcja 03.

### 2.4 Mapa (`#stage`)

Canvas `#cv` wypełnia `#stage`; `touch-action: none`. Na canvasie, w przestrzeni ekranu (nie świata):

- **Lista drużyny / chipy** (`p7_draw.js: drawChips`, `drawParty`, `drawNextWave`): w lewym górnym rogu (6, 6). Zwinięta (domyślnie): pasek wysokości 30 px, tło `rgba(10,11,13,0.8)`, rogi 3 px; chip co 25 px: krążek r 6,5 px w kolorze klasy z obwódką w kolorze poziomu (boss: `#ff8a3c` 2,4 px), ikona klasy 10,5 px `#1a1424`, poziom 8 px obok. W fali pod krążkiem pasek HP 18×3 px (zielony `#6fd38a`, czerwony `#ff6b6b` ≤35%, martwy `#6b5560`) i strachu 18×2 px (`#b48cff`), nad nim glif stanu (`heroGlyph`: † martwy, » uciekł/ucieka, ↑ wyszedł, ◆ niesie kryształ, ↓ pod lochem, # w klatce, z odpoczywa, ? zgubiony, ! panika, › na zwiadzie (1.16), s sam). Na końcu "▾". Kolejność: żywi, potem czekający w kolejce (50% krycia), potem martwi i ci, co wyszli (40%). Rozwinięta (stuknięcie): w fali lista 108 px szeroka, wiersz 19 px (krążek, HP 48×5, strach 48×3, glif, poziom, przedmioty jako kreski 4×3, sakiewka "◉N", klątwa "✶", wiara kapłana). W budowie lista **następnej fali** (szer. 200 px, wiersz 15 px, nagłówek "Fala N/10[ · FINAŁ| · boss]:", wiersz "Imię · poz. L ranga · wraca/łowca/rekrut · boi się: X"). W budowie pod zwiniętymi chipami pigułka wyłomu `rgba(120,20,30,0.85)`: "WYŁOM!" (świeży) albo "WYŁOM otwarty". Stan zwinięcia zapamiętany (`UI.listOpen`).
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

**Podzakładki** (1.14, `#subs`, `TABS[].subs`, `p8b_ui.js: subsOn`, `curSub`, `pickTab`): rząd pod zakładkami, wysokość 24 px (odstęp siatki 6 px, `margin-top: -1px`). Pułapki i Potwory mają dwie: **Rany** (`dmg`) i **Strach** (`fear`); w Ranach są też pułapki, które zatrzymują, rozdzielają i spowalniają (Sieć, Zapadnia, Klatka, Krata). Przycisk `.sub`: prostokąt z rogami `--r` jak kafelek, 12 px, 600, odstęp 0 14 px, tło `--panel`, ramka `--line`, tekst muted; wybrany: `--ink`, ramka i wewnętrzna obwódka `--gold`, tło `--panel3`. Pasek pokazuje kafelki tylko wybranej podzakładki. Wybór jest zapamiętany dla każdej zakładki (`yatd-sub`, JSON `{traps: 'fear', ...}`), a przewinięcie paska dla pary zakładka/podzakładka. Od 1.15.1 rząd jest pokazany zawsze, gdy zakładka ma podzakładki i choć jedna ma coś z obecnego etapu nauki (decyzja autora: w pierwszym runie nie było czego przełączać, bo rząd znikał; w 1.14 był chowany, gdy tylko jedna podzakładka miała kafelki). Podzakładka bez niczego z tego etapu (`subsOn`) ma klasę `off`: krycie 0,5 i kłódka 10 px (`LOCK`), `aria-disabled`, dymek "X: od N. runu nauki" (`subStage` = najmniejsze `ONB_ITEM` jej kafelków); stuknięcie nic nie przełącza, tylko trzęsie przyciskiem i na 1,5 s zmienia jego napis na "X: od N. runu" (`nope`). Przykład etapu 1: Pułapki = Rany + wyszarzony Strach (od 2. runu), Loch = Kopanie + wyszarzone Komnaty i Efekty (od 3. runu). Na zakładkach bez podzakładek rząd zostaje pusty (`visibility: hidden`), żeby mapa nie zmieniała wysokości przy przełączaniu. Przewodnik, który wskazuje kafelek, przełącza na jego podzakładkę (`pickTab('traps', 'spikes')`). Od 1.15 zakładka **Loch** ma trzy podzakładki: **Kopanie** (`dig`: kopanie, tunel, poszerzanie, burzenie), **Komnaty** (`kind`: 12 komnat, sekcja 05, 5.8a) i **Efekty** (`effect`: dawne typy pokoi `r_*`). Nazwy są robocze (autor podał "pomieszczenia", "rodzaj", "efekt"); zmiana to tylko `label` w `TABS`. Od 1.26 Pułapki mają trzy podzakładki: **Rany** (`dmg`: dawne + wahadło, wnyki), **Statusy** (`stat`: plama oleju, kocioł smoły, wyziewy, zalewnia, runa piorunów) i **Strach** (`fear`: dawne + dzwon żałobny, fałszywe przejście); Potwory: **Rany** (`dmg`: + saper, herszt, rój szczurów), **Mrok** (`dark`: szkielet, zombie, licz, ogar, demon) i **Strach** (`fear`: + chochlik, kusicielka); Łup + Przynęta; Komnaty: 15. Stuknięcie zakładki Loch wołałoby podpowiedź z poziomami rodzin ("Rodziny: Mechanizmy 2, ..."), ale `setHint` nic nie robi (rozdz. 10, punkt 1), więc tego tekstu nie widać.

**Od 1.27** (decyzja autora: kategoria ma odpowiadać na pytanie "co ma zrobić bohaterom?", czasownikiem; "Mrok" mówił, czym potwór jest, a "Statusy" to słowo z gier) podzakładki są takie (wygląd i zachowanie rzędu bez zmian; tekst przycisku 12 px, więc po polsku dłuższe nazwy też się mieszczą):

| Zakładka | Podzakładka (`id`, po angielsku) | Elementy |
|---|---|---|
| Pułapki | **Ranią** (`dmg`, Hurt) | kolce, strzały, zapadnia, ogień, proch, mimik, wahadło, runa piorunów |
| | **Trzymają** (`hold`, Hold) | sieć, klatka, krata, wnyki |
| | **Osłabiają** (`weak`, Weaken) | plama oleju, kocioł smoły, wyziewy, zalewnia |
| | **Straszą** (`fear`, Scare) | portret, oczy, kości, lustro, zawiasy, trumna, pozytywka, dzwon żałobny, fałszywe przejście |
| Potwory | **Walczą** (`dmg`, Fight) | goblin, ogr, pająk, rój szczurów, szkielet, zombie, ogar piekielny, demon otchłani |
| | **Wspierają** (`sup`, Support) | łucznik, szaman, goblin saper, herszt goblinów, licz |
| | **Straszą** (`fear`, Scare) | duch, cień, nietoperze, chochlik, kusicielka |
| Loch | **Kopanie** (`dig`, Dig) | kopanie, tunel, ukryte przejście, poszerzanie, burzenie |
| | **Komnaty** (`kind`, Lairs) | 15 komnat |
| | **Klimat** (`effect`, Mood) | 9 efektów pokoi `r_*` (dawniej podzakładka Efekty) |

Id `stat` (Statusy) i `dark` (Mrok) zniknęły, a `hold`, `weak` i `sup` są nowe. Zapamiętany wybór podzakładki (`yatd-sub`) ze starym id nie pasuje do żadnej, więc `curSub` bierze pierwszą dostępną. Rodzina elementu (Nieumarli, Demony...) jest tylko w drobnym druku dymka.

**Pasek kafelków** (`#tray`): jeden rząd przewijany w bok, wysokość 64 px, odstęp 6 px, przyciąganie do początku kafelka (`scroll-snap: x proximity`), bez paska przewijania. Na krawędziach, za którymi jest jeszcze coś, maska zanikania 28 px (`trayFade`). Zmiana zakładki "rozdaje" kafelki: każdy wjeżdża z dołu (10 px, skala 0,94 → 1) w 0,24 s z opóźnieniem 24 ms × indeks (do 9), klasa zdejmowana po 700 ms.

**Anatomia kafelka** (`.item`, 74×60 px, `updateTray`):

| Część | Wygląd | Uwagi |
|---|---|---|
| ikona | SVG 22×22 z `ICONS[typ]` (`p8a_icons.js`, 65 ikon; od 1.15 także 12 komnat) z cieniem 1 px | lewa górna część rzędu `.top` |
| koszt | Jersey 12 px `--ess`, poprzedzony czerwonym rombem 6 px z poświatą; od 1.27 kroplą Esencji 6 px (kwadrat obrócony o -45° z trzema zaokrąglonymi rogami, `border-radius: 50% 0 50% 50%`, ta sama poświata), żeby koszt nie wyglądał jak kryształ ◆ | `costOf` (sekcja 03); tryby bez kosztu |
| nazwa | 12,5 px; nazwy od 9 znaków 11 px (`longnm`) | `ITEMS[t].name` |
| tag | 10,5 px muted; dla łupu kolor `LOOT_COLOR`, dla efektów kolor `RT_INFO`, dla komnat kolor `KIND_INFO` | `ITEMS[t].tag` |
| kłódka | 11 px w prawym górnym rogu, `--dim` | gdy nieodblokowany |
| wybrany | ramka `--gold`, tło `--panel3`, wewnętrzna złota poświata, "pyknięcie" 1,08 → 1 w 0,22 s | `aria-pressed` |
| `off` | 40% krycia, saturacja 0,4 | zablokowany, nie w tej fazie albo za mało Esencji |
| narzędzie | ramka przerywana | zakładka Loch |
| `holding` | skala 0,96 | w trakcie przytrzymania |
| `nope` | drży 0,32 s (±4, ±4, ±2 px), tag zamienia się na powód w `#ff9a9a` na 1,5 s, wibracja 15 ms | patrz 4.5 |

Od 1.26 kafelki z rysunkiem (`ART.has(t)`, klasa `.art`) wyglądają inaczej: u góry scena 72×36 (`.scene`, obraz `ART.tile(t)` wstawiany przy pierwszym pokazaniu kafelka, `image-rendering: pixelated`, `object-fit: cover`), koszt jako znaczek w prawym górnym rogu sceny (`rgba(9,9,11,0.84)`, 12 px), pod sceną nazwa; tag jest ukryty, a pasek "nope" pojawia się na dole sceny (czerwony `rgba(70,10,16,0.92)`, 10 px); kłódka w lewym górnym rogu sceny; wybrany: złota obwódka sceny. W układzie poziomym niskim scena ma 33 px. Kafelek bez rysunku i bez ikony dostaje `genIcon(t)`: kwadrat z obwódką w kolorze rodziny (albo komnaty) i jej znakiem. Wymiary kafelka bez zmian (74×60), więc pasek nie rośnie.

**Zakładka Talia** (`renderDeckTiles`, kafelki 100 px, `.dslot`, górna ramka 3 px w kolorze rzadkości): najpierw kafelek **Sklep** (mosiądz; podpis "wróć do sklepu", "gratis: N" z pulsującą złotą obwódką, gdy są darmowe karty, albo "między falami"; w fali ukryty), potem po jednym kafelku na każde miejsce talii (tag = `u.tag` albo "rośnie: N", nazwa w 2 liniach; od 1.26 nad nimi pasek obrazka karty 26 px, `ART.cardImg`, klasa `hasart`; puste "wolne miejsce" przerywane); od 1.26 kafelek Sklep przy czekającym Darze serca pisze "♥ Dar serca" (+ liczba darmowych kart) złotym tekstem (`heartgift`), potem miejsca schowka (przerywane, 80% krycia, tag "schowek"; w fali ukryte). Stuknięcie karty otwiera okno karty (w fali pauzuje), stuknięcie schowka otwiera sklep.

**Podpowiedź kafelka** (`#tip`, `showTip`): przytrzymanie kafelka 380 ms (bez ruchu > 10 px) pokazuje płytę nad szufladą (dolna krawędź 6 px nad szufladą, szer. `min(440px, 100% - 32px)`, tło `#16181c`, górna ramka 2 px `#6b7079`, wjazd 0,16 s): nazwa Grenze 22 px + "N Esencji" w `--ess`, tag 11 px wersalikami, opis 14 px (`ITEMS[t].desc`), dla łupu "Każdy kolejny taki łup w lochu: +25% ceny (leży już: n, bazowo c)." (od 1.26 tekst nieaktualny, cena rośnie o 15%), od 1.26 dla elementu z rodziną "Rodzina: <znak> <nazwa> (poziom L: +8L% mocy)" albo "(Runa rodu ze sklepu ją wzmocni)", dla zablokowanego czerwone "Zablokowany: odblokujesz go kartą ze sklepu.". Od 1.24 pod opisem słowa z małym rombem: "Rani" (`.hurt`) i/lub "Straszy" (`.scare`) (`effWords`: Straszy dla pułapek straszących i unoszących się potworów, Rani dla raniących, nietoperze oba; także na kartach odblokowania); licznik pokazań `tutFlags.tipN` (krok przewodnika `hold`). Wibracja 12 ms. Puszczenie chowa podpowiedź, a koniec przytrzymania nie liczy się jako stuknięcie (`tipEat`). Zrzut: `03_tile_tip.png`.

**Dymek od 1.27** (warstwa 2 i 3, plan rozdz. 4): kolejność to nazwa + "N Esencji", tag, słowa Rani / Straszy (po angielsku Hurts / Scares), opis `ITEMS[t].desc` (jedno zdanie: co element robi), a pod nim drobny druk `.fine` (12 px, interlinia 1,35, `--muted`, odstęp 6 px) złożony z kawałków po spacji: `ITEMS[t].more` (miejsce, zasięg, liczby, typ obrażeń, kto jest odporny, skill check), "Rodzina: <glif> <nazwa>." albo z poziomem "Rodzina: <glif> <nazwa>, poziom L (+8L% mocy)." (bez dawnego "(Runa rodu ze sklepu ją wzmocni)") i dla łupu "Każdy kolejny taki łup jest o 15% droższy (w lochu już: n)." (tekst zgodny z regułą 15% z 1.26). Pod spodem jak dotąd czerwone "Zablokowany. Odblokuje go karta ze sklepu, na stałe." albo przy komnacie "Zablokowana. Najpierw odblokuj kartą ze sklepu: X albo Y.". Przykład, Sieć: opis "Oplata bohaterów, więc są wolniejsi i dostają więcej obrażeń.", drobny druk "Podłoga. Kwadrat 3×3, 3 s, +30% obrażeń. Mag potrafi ją rozproszyć. Rodzina: ...". W Unity: dwa pola tekstu w tabeli `Items` (`desc`, `more`), drobny druk jako osobny akapit z mniejszą czcionką.

### 2.6 Pasek akcji (`.actions`, `updateAction`)

| Przycisk | Rozmiar | Działanie |
|---|---|---|
| Menu `#btn-settings` (☰, SVG 22 px) | 48×48 px | otwiera Menu; w trwającej fali najpierw pauza |
| Cofnij `#btn-undo` (strzałka, odznaka z liczbą kroków) | 48×48 px | cofa ostatnią zmianę w budowie (stos 30 kroków: postawienie, ulepszenie, przeniesienie, zdjęcie, kopanie); wyłączony, gdy pusto albo poza budową; ukryty w fali |
| Główny `#btn-action` | `flex: 1`, min. 48 px wys., Grenze 700 21 px, podpis 11,5 px | patrz niżej |

Główny przycisk: tło krwiste (gradient `#ad2a34` → `--blood` → `#5a0f17`, ramka `#3a070c`, tekst `#f2ece2`).

| Faza | Napis | Podpis | Stan |
|---|---|---|---|
| Budowa | "Wypuść falę N" | "K bohaterów" + " · zostało E Esencji" (gdy E ≥ 6); od 1.27.5 od fali 2 (głód > 0, poza samouczkiem) zawsze "K bohaterów · głód H · zapas E", na czerwono (`small.low`, #ff6b6b, 600) gdy `hungerRisk() > 0` i E < 20% H (`reserveLow`) | aktywny, pulsuje żarem 2,6 s (`ready`) → `startWave` |
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
| maks. szer. `#app` | 560 px na telefonie; od 1.25 bez limitu, gdy `--ui` > 1 (2.9) |

W Unity: Canvas Scaler z rozdzielczością referencyjną 390×844, dopasowanie do szerokości; te progi jako warianty układu.

### 2.8 Mapa bez ramki (1.24, część B; `p0_head.html`, `p2_state_map.js`, `p6_loop.js: resize, splitPolys`, `p7_draw.js: draw, floorT, screenT, faceMap, viewBox, onScreen`, `p8b_ui.js: localXY`)

- Płótno `#cv` leży pod całym ekranem (z-index 0, rozmiar `FW × FH`); `#stage` zostaje w układzie jako wolna część ekranu między HUD a szufladą: kamera kadruje loch w niej jak dotąd (`cw × ch`), a jej róg w płótnie to `OX, OY`. Cztery transformacje rysowania dodają `OX/OY`; przycinanie (`viewBox`, `onScreen`, `roomSeen`, szacunek kafli) obejmuje całe płótno, więc loch rysuje się też pod HUD i szufladą; połówki podzielonego ekranu są przycinane do całego płótna (`SPLIT.fullPolys`), kadrowane w widoku jak dotąd. Stuknięcia (`localXY`) i orby odejmują / dodają `OX/OY`. Zwinięcie szuflady nie zmienia już rozmiaru płótna. Hak testowy `w2s` zwraca współrzędne płótna.
- Ramka zniknęła (bez obramowania, zaokrągleń i cienia pierścienia); blask świecy, winieta krawędzi i alarm kryształu obejmują cały ekran. HUD, szuflada i rząd akcji stoją na mapie (z-index 2) bez płyty: miękki ciemny gradient pod górnym rzędem (`.hud::before`) i pod dołem (`.drawer::before`), cienie tekstu na małych napisach, pudełka równania i kafelki paska lekko prześwitujące. Stuknięcia między elementami HUD trafiają w mapę (`pointer-events: none` na rzędach HUD, włączone na ich elementach; rząd równania tylko tak szeroki jak pudełka).
- **Poziom** (decyzja: stary układ zostawiał mapie 4 px na ekranie 390 px wysokości): przy `orientation: landscape and max-height: 560px` HUD, szuflada i przyciski są kolumną po prawej (`min(360px, 46vw)`), mapa zajmuje lewą stronę i biegnie pod kolumną; zwarty HUD (bez rzędu rangi, mniejsze równanie i pasek).
- Stuknięcie nad bohaterem przy górnej krawędzi mapy (poza widokiem) trafia w jego figurę i pasek strachu (sprawdzanie także poza mapą; budowa bez zmian).
- Zrzuty (repo prototypu, `e124/shots/`): `b_port_build.png`, `b_port_raid.png`, `b_land_build.png`, `b_land_raid.png`, `b_frame_390x844.png`, `b_frame_844x390.png` (przed: `before_*`). W Unity: kamera renderuje na cały ekran, UI (Canvas Screen Space Overlay) na wierzchu z gradientami; obszar kadrowania kamery = prostokąt między HUD a szufladą (`Screen.safeArea` minus wysokości UI).

### 2.9 Tablet i komputer (1.25; `p6_loop.js: applyLayout, ZOOM_OK`, `p0_head.html: html.big, html.wide`, `p7_draw.js: uiScaled, uiBack, uiIn`, `p8b_ui.js: showTip, placeToast, placeHov`)

Prośba autora (24.10): prototyp ma działać na telefonie, tablecie i komputerze. Decyzje autora: panel boczny na szerokim ekranie, większy interfejs na dużym ekranie.

| Ekran | Warunek | Układ |
|---|---|---|
| telefon w pionie | `--ui` = 1 | jak 1.24 (kolumna 560 px, HUD u góry, szuflada i przyciski na dole) |
| telefon w poziomie | wys. ≤ 560 px | jak 1.24 (kolumna po prawej, 2.8) |
| tablet w pionie, wąskie okno | `--ui` > 1, nie szeroki | układ telefonu × `--ui`, na całą szerokość (pasek pokazuje 9-10 kafelków bez przewijania) |
| szeroki: tablet w poziomie, laptop, monitor | szer. ≥ 1,1 × wys. i wys. > 560 px | mapa po lewej, panel po prawej (`min(340 px × ui, 42vw)`): przycisk ▼ Budowa, zakładki, podzakładki, kafelki w siatce przewijanej w dół, pasek akcji na dole; HUD w lewym górnym rogu mapy (do 540 px × ui); `#stage` pod HUD. Złożony panel (fala albo ręcznie): mapa zajmuje też kolumnę panelu, przycisk i pasek akcji stoją na mapie |

- `--ui` = krótszy bok / 600, zaokrąglone do 0,05, od 1 do 1,3 (np. 390×844: 1; 1000×700: 1,15; 820×1180, 1366×768, 1920×1080: 1,3). Liczone na starcie i przy każdej zmianie rozmiaru (`applyLayout`). Przeglądarka bez CSS `zoom` zostaje przy 1.
- Powiększenie: CSS `zoom` na HUD, szufladzie, pasku akcji, samouczku, banerze, kartach okien, podpowiedziach (`#tip`, `#toast`, `#hov`); płótno ma rozmiar ekranu, a swoje panele rysuje × `--ui` (`uiScaled`: transformacja × UIZ, `cw`/`ch` w tych pikselach; prostokąty do stuknięć z powrotem w piksele widoku). Elementy ustawiane z JS dzielą pozycję przez UIZ.
- Obrót: `manifest.webmanifest` ma od 1.25 `orientation: any` (było `portrait`); pion blokuje tylko telefon (krótszy bok ekranu < 600 px: `lockPhone` przy pełnym ekranie i w zainstalowanej aplikacji), tablet może leżeć poziomo.
- Podpowiedź kafelka w panelu stoi na lewo od panelu, na wysokości kafelka (`#tip.side`); komunikat nad środkiem mapy.
- Klasa `mouse`, gdy wskaźnikiem jest mysz (dotyk ją zdejmuje): podpowiedzi po najechaniu, numery kafelków, teksty samouczka "najedź / kliknij prawym / przytrzymaj F".
- Zrzuty (repo prototypu, `e125/shots/`): `build_*.png`, `raid_*.png`, `tip_*.png`, `menu_*.png` dla 9 ekranów, `keys_card.png`, `mouse_*.png`.
- W Unity: Canvas Scaler (referencja 390×844) plus mnożnik `ui` z krótszego boku w dp; dwa szablony układu (pion i szeroki) przełączane po proporcjach; panel budowy jako ScrollRect z GridLayoutGroup.

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

**Stan 1.27** (plan UI/UX: gracz ma zrozumieć, o co chodzi i jak zacząć, bez żargonu, zanim cokolwiek zobaczył): od góry podtytuł "Prototype 1.27 · 10 fal i finał", h1 "You are the dungeon", wstęp w 2 zdaniach ("Jesteś lochem. Bohaterowie przychodzą falami po kryształy z Twojego serca, a Ty bronisz go pułapkami, potworami i łupem. Przetrwaj 10 fal."), rekord (jak dotąd, z rangą), zwinięte `<details>` **"Dla testerów"** (`#start-testers`) z polem "Imię testera (opcjonalnie)" (otwarte, gdy imię jest już wpisane), przyciski (bez zmian w logice), wiersz web, **Jak grać** (`#start-how`) w 7 działach z nagłówkiem (`h3.howh`) i 1-3 krótkimi punktami: **Cel** (kryształy z serca, 10 fal i bohater z przepowiedni), **Budowa** (pasek, przytrzymanie kafelka, stuknięcie / dwa stuknięcia / przytrzymanie elementu, liczba przy pokoju to głębia, kropki to wolne miejsca), **Esencja** (Groza × Chciwość × Combo; skąd combo i chciwość), **Serce** (od fali 2 je pierwsze, brak z zapasu, potem kryształ; najedzone rośnie i daje karty; stuknij serce u góry), **Fala** (skill check, przytrzymanie przyspiesza, stuknij bohatera), **Karty** (darmowa karta po fali, sklep, talia do końca runu), **Z czasem** (straszenie, omeny, gildia, budowle i komnaty dochodzą z falami, gra powie o nich, gdy się pojawią). **"Co nowego w Prototype 1.27"** (`#start-new`) ma 5 wpisów 1.27 (język, nowe podzakładki, opis jednym zdaniem z drobnym drukiem, karta czempiona i bohatera z przepowiedni, spokojniejszy ekran); wpisy 1.26.1 i starsze są zwinięte pod "Starsze wersje" (`details.older`) i tylko po polsku (po angielsku ich nie ma). Nowe style: `#start-how .howh`, `details.testers`, `details.older`. W Unity: Jak grać i Co nowego jako teksty w tabeli `UI`; "Dla testerów" tylko w buildzie testowym.

**Stan 1.26.1**: podtytuł "Prototype 1.26.1 · 10 fal i finał", lista "Co nowego w Prototype 1.26.1" ma na górze 4 wpisy 1.26.1 (przed wpisami 1.26): Ukryte przejście (zakładka Loch, 6 Esencji, odkrywają je najczęściej złodziej i tropiciel, uciekinier opowie o nim następnej fali, do serca musi zostać jawna droga); brakujące zachowania (ogar idzie za krwawiącym, saper chowa się za potworami, przesądny, ciekawski, zapaleniec); Dar serca po nowemu (karty Serca tylko w rzędzie Dar serca, rzadkie 70% i legendarne 30%, 8 nowych kart); poprawki zasad (Wnyki, flaszka, oślepienie, Pożar, Wyziewy, Runa rodu, karty i Strażnik a zdolności potworów). Opisy charakterów (`TRAIT_TEXT`, karta bohatera): przesądny "... nie wejdzie pierwszy do pokoju z portretem albo lustrem", ciekawski "widzi łup z daleka (+4 pola), idzie sprawdzić usłyszaną pułapkę, 2 razy dokładniej przeszukuje meble, jako przywódca chętniej się rozgląda", zapaleniec "szarżuje na każdego potwora w pokoju (także ogra), częściej idzie przez znane pułapki, raz na falę zamiast paniki wpada w furię, wytrzyma 10% więcej strachu".

**Stan 1.26**: podtytuł "Prototype 1.26 · 10 fal i finał"; akapit wstępu ma nowe zdanie "Głodne serce zabiera z sakiewki, syte rośnie i daje karty."; **Jak grać** ma 22 akapity, w tym nowe: 10 klas bohaterów po figurkach, statusy (ikonki nad bohaterem), rodziny i Runa rodu (+8% mocy i -4% odnowienia na poziom, do 5), odradzanie potworów, omeny fal 3, 6 i 8, wybór A/B na 3. poziomie, przepisany akapit o sercu (sakiewka, Danina, Nasycenie, Dar serca, Ofiara); **"Co nowego w Prototype 1.26"** ma 190 wpisów, na początku 11 wpisów 1.26 (serce zabiera, Dary serca są kartami, 10 pułapek i 10 potworów, statusy i reakcje, rodziny i komnaty, A/B, odradzanie i Uczta, nowi bohaterowie i cechy, omeny, 34 karty, nowa ekonomia i grafika). Reszta opisu niżej jest historyczna.

Od góry: podtytuł "Prototype 1.17.1 · 10 fal i finał" (opis niżej dotyczy 1.14; w 1.17 i 1.17.1 zmieniły się tylko podtytuł i lista "Co nowego" (od 1.17.1 "Co nowego w Prototype 1.17.1"), która ma 126 wpisów: na początku 3 wpisy 1.17.1 (bohaterowie mówią tylko o tym, co widzieli albo poczuli; nowe kwestie: 522 pogaduszki, 108 kwestii wejścia do komnaty, 23 rozmowy, karta bohatera pokazuje, co widział; krwawienie z kolców to rana kłuta, nie ogień), w 1.17 było 123, w tym 6 wpisów 1.17: zwiedzanie i przeszukiwanie mebli, narada po 2 minutach, wiedza tylko z tego, co widzą i słyszą, ok. 3 razy więcej i prawdziwsze dymki, pułapka słyszana zza ściany i charakter przywódcy w wyborze drogi, poprawki AI); h1 "You are the dungeon"; akapit wstępu; rekordy (jeśli są: "Twój rekord: N Esencji zebranej w runie (ranga: X) · najdalej: fala F · wygrane: W z R."); pole "Kto testuje (opcjonalnie)" (tylko prototyp); przyciski; wiersz web (tylko prototyp); rozwijane **Jak grać** (17 akapitów w tablicy literalnej w `renderStart`, zasady całej gry, do przeniesienia jako tekst lokalizowany) i **Co nowego w Prototype 1.14** (99 wpisów dziennika zmian od v14 do 1.14, druga tablica w `renderStart`); przycisk "Ustawienia" (dźwięk, wibracje, skill checki).

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

**1.27**: podpis "Ustawienia" to "język, dźwięk, wibracje, skill checki"; "Pobierz wyniki" ma podpis "dla testerów: plik z przebiegiem runu" i jest jedynym miejscem pobierania w trakcie runu (przycisk zniknął z podsumowania fali, 3.8); "Zapisz i wyjdź" w budowie "wrócisz w to samo miejsce", "Zakończ run" z podpisem "zapisze dotychczasowy przebieg".

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

**1.27, język**: pierwszy wiersz karty to `.langrow` (flex, odstęp 12 px): napis "Język / Language" (w obu językach naraz, żeby gracz znalazł go bez znajomości bieżącego) i przełącznik `.seg` `#lang-seg` (min. 170 px, przyciski 14 px) z dwoma przyciskami "English" i "Polski" (`data-lang`; bieżący ma klasę `on`). Stuknięcie innego języka zapisuje `localStorage['yatd-lang']`, w budowie przy żywym runie zapisuje run (`saveRun('build')`) i przeładowuje stronę. W trakcie fali run nie jest zapisywany, więc po przeładowaniu wraca do budowy przed tą falą (jak po zamknięciu karty, sekcja 07). W Unity: przełączenie locale bez przeładowania (sekcja 02, 2.10).

**1.27, etykiety** (krótsze): "Wibracje (Android)", "Jeden skill check na kilka pułapek naraz", "Dziel ekran, gdy drużyna się rozdzieli", "Przyspieszaj, gdy nic się nie dzieje (1 = wyłączone)", "Przyspieszenie po przytrzymaniu palca", "Odstęp od góry (gdy aparat albo róg ucina ekran)"; notka "Ustawienia działają od razu i zapisują się w tej przeglądarce.".

### 3.7 Ustawienia testowe (`renderTests`, tylko prototyp)

Suwaki balansu `SLIDERS` (19 pozycji, `p1_config.js`) i "Przywróć domyślne". W 1.12 **nieosiągalne** z UI (nic nie otwiera typu `tests`). Unity: menu debug / ScriptableObject z balansem.

### 3.8 Podsumowanie fali (`renderWave`, `waveDetails`, zrzut `07_summary.png`)

Nagłówek: podtytuł "Fala N/10 · m:ss", tytuł "Zwycięstwo!" / "Kryształ skradziony" / "Serce zjadło kryształ" / "Fala odparta", duża liczba "+E" "Esencji z fali". Zwycięska karta ma tło `#1c1a16` i złotą ramkę (`.vic`).

Widok główny (ciało):

1. Cztery kafelki statystyk (`statrow`): "masz Esencji" (czerwony), serce ("♥ N" "serce syte" zielony / "zjadło kryształ" różowy, albo "-" "głód od fali 2"), "k/max" "kryształy", "zabici · przestr.". Od 1.24 pod nimi: "Zabici: K (A pkt z ran) · Wystraszeni: X (Y pkt ze strachu)" (`#wave-fear-line`, także przy 0, bo straszenie to też droga) i czerwona linia `#wave-crystal-why` (`crystalWhy`): "Głód pochłonął kryształ: serce chciało N Esencji z tej fali, a dostało M." / "Kryształ skradziony: <imię> (<klasa> <poziom>) wyniósł/wyniosła go z lochu."; od 1.23 dla każdego Nemezis fali "Nagroda za głowę: N Esencji · Borys Niezłomny: wypłacona." albo "...: uciekł, wróci z wyższą nagrodą.".
2. **Rozliczenie** (`reck`, 12,5 px, części wjeżdżają po 0,45 / 0,8 / 1,15 s): "Groza G × m = E", "♥ -N" albo "♥ za mało: -X · kryształ", "dla Ciebie +Y (+P po fali)".
3. Panel "Esencja z fal" (prawy dopisek "kreska: porcja serca"): wykres `waveChart` z miejscem na każdą z 10 fal (przyszłe przerywane), słupek gradient `--ess-hi`→`--ess`→`--ess-lo`, fala ze stratą szara, różowa kreska 2 px = porcja serca, bieżąca fala pełne krycie z poświatą i wartością u stopy słupka (Jersey 11,5 px biały z cieniem), numery fal pod spodem.
4. 2-3 **ciekawostki** (`waveFun`): "Ulubiona pułapka" (zawsze pierwsza, gdy jest), losowo z: "Zabójca fali", "Cichy zabójca/pomocnik", "MVP bohaterów", "Najbardziej przerażony", "Najwyższe combo", "Krytyki", "Zgubieni", "Rozdzieleni" (1.16: "N razy", "X s na zwiadzie", gdy co najmniej 4 s), od 1.17 "Zwiedzali" (gdy co najmniej 2 rozglądania: "N razy", opis "znaleźli N monetę/monety/monet" albo "nic nie znaleźli", z dopiskiem ", obudzili pułapkę: N", gdy przeszukanie odpaliło pułapkę) i "Narada" (gdy była narada po cierpliwości: wartość "szturm", "jeszcze chwila" albo "do domu", w tej kolejności ważności, gdy narad było kilka; opis "przegłosowani wrócili sami: N" albo "zdecydowali razem"), "Rozbrojone", "Łup". Etykieta mosiądz 9,5 px wersalikami, wartość 13,5 px, opis 11 px w 2 liniach.
5. Panel **następnej drużyny** "Fala N: k bohaterów, poz. a-b" (prawy dopisek: gildia albo "serce chce X"), wiersze `nextRow`: krążek 26 px z ikoną klasy, imię w kolorze klasy, "Klasa L", plakietki (przepowiednia/czempion mosiądz, charakter, sakiewka łowcy, ↺ powracający fiolet, rekrut), po prawej ikony ekwipunku (`ITEM_GLYPH`, 14 px, z liczbą ładunków), druga linia: umiejętność klasy · "słaby: …" (`#ffb35c`) · "boi się: …" · "? ciało/fobia" (`--dim`). Stuknięcie wiersza otwiera kartę bohatera, a "Wróć" wraca do podsumowania.

Stopka: przy zwycięstwie "Graj dalej" (fale bez końca) i "Zakończ: zwycięstwo"; inaczej "Dalej: sklep przed falą N+1" (albo "Dalej", gdy nie ma kryształów) z podpisem "darmowe karty: k[ (legendarna w ofercie)]". Pod spodem rząd małych przycisków: "Szczegóły" / "‹ Wróć", "Pobierz wyniki" (tylko prototyp), "Zapisz i wyjdź", "Zakończ run" (dwa stuknięcia: "Na pewno?"), oraz notka stanu logów (tylko prototyp).

Widok **Szczegóły**: panel "Skąd Esencja" (prawy dopisek "Groza G × średnio m") z paskiem źródeł 12 px (kolory: Rany `#ff8a7a`, Strach `#c3b2ff`, Ucieczki `#8a6fe0`, Zabici `#d8434f`, Łup `#f2b94b`, Combo `#a9d4da`, Inne `#7d7590`) i legendą 4 największych; zakładki (`seg`, jak zakładki paska): **Co dalej** (lista punktów z rombami: serce, fala następna, gildia, głód, Esencja po fali, plotki, opowieści o skarbach, zabrany łup, co gildia słyszy o chciwości, wyłom, przygotowania, budowle, błądzenie, przedmioty, wiara, saperzy, ranga), **Bohaterowie** (ikona, imię, klasa, los: zginął czerwony, wyniósł kryształ pomarańczowy, uciekł ze strachu fiolet, wyszedł szary), **Elementy** (nazwa, pasek, "E · n traf."), **Liczby** (siatka 2 kolumn: krytyk/draśnięcie/pudło, ciosy z pamięci, najwyższe combo, łup zobaczony/zabrany, rozbrojone/odczynione, plotki, zapadnie/klatki, serce/dla Ciebie, czas/przyspieszenie; w 1.17 bez zmian).

`statsTable(s)` (`p8b_ui.js`) to osobna, dłuższa tabela liczb fali, której **nic nie woła** (martwy kod, rozdział 10). 1.16 i 1.17 dopisały do niej wiersze (zwiad, zwiedzanie, narada, wieści), więc od poprawki wydania 1.17 te liczby są też w zakładce Liczby (`renderWave`, `cur === 'nums'`) jako cztery kratki: "Osobno: zwiad / sam / zgubiony (s)" (`splitTime`, `loneTime`, `lostTime`), "Rozglądania / monety / pułapki z szukania" (`looks`, `goldFound`, `lookTraps`), "Narada: dom / szturm / chwila · sami do domu" (`councilHome`, `councilStorm`, `councilMore`, `goHome`) i "Słyszane zza ściany / wieści o śmierci" (`heard`, `newsDeaths`). Od 1.17.1 piąta kratka: "Kwestie o tym, co widzieli / zamienione / pominięte" (`sawTalk`, `lineSwap`, `lineDrop`; sekcja 06, 6.7.10). Kolejne kratki: 1.19 "Rozłam: grupy / bunty (udane) / obrażeni / powroty"; 1.20 "Ekwipunek: z ciał / podane (amulety) / przydział / oferty / za ciężkie / latarnia ratuje / łom"; 1.21 "Więzi: pary / żałoba (zemsta) / nie zostawię (uratowani) / mistrz: uwagi, pochwały / kpiny / kłótnie (przerwane) / sprzeciw nad ciałem / zakłady: wygrane-przegrane"; 1.22 "Finał: eskorta / przekazania / ostatni bastion / poświęcenia / ty pierwszy / opukane / nie tędy / szyk" (eskorty z przejęciami, poświęcenia odpalone, opukania ze znaleziskami, szyk z wycofaniami); 1.23 "Nemezis: w fali / nagrody (Esencja) / urazy (załatwione) / ostrzeżenia / pamięć poległych". Zakładka Co dalej (1.20): przekazane, z ciał, wybite, zgaszone latarnie, bomby w ogniu. Panel następnej drużyny: znacznik więzi (1.21), "☠ nemezis" i "Nagroda za głowę: N Esencji" w drugiej linii (1.23), tytuł ikon ekwipunku mówi, skąd przedmiot, narzędzia w białej ramce, trofea pomarańczowe (1.20); "☠ Borys Niezłomny wraca N. raz. Nagroda za głowę: N Esencji." (1.23). `lookNo` i `lootObey` są tylko w logach (sekcja 07); tak samo `lineDropK`, `rkEnter`, `chatTry` i `chatPick` (1.17.1).

**Zmiany 1.26 w podsumowaniu** (`H = fl.hunger`, sekcja 03, 2.7):

- Tytuł: "Zwycięstwo!" / "Kryształ skradziony" / "Głód pękł kryształ" / "Serce zabrało z zapasów" (gdy `tookPurse > 0`) / "Fala odparta".
- Kafelek serca: "♥ need" z podpisem "serce syte" (zielony) / "pękł kryształ" (czerwony) / "kredyt krwi" / "zabrało N" (ostrzegawczy).
- `crystalWhy` przy głodzie: "Głód pękł kryształ: serce chciało N Esencji, fala dała X, a sakiewka tylko Y. Resztę sakiewki serce zjadło.".
- Nowy blok `heartLines` (`#wave-heart`, `.heartsum`), między linią strachu a rozliczeniem: gdy serce brało z sakiewki, ramka `.purse-take` "♥ Serce zabrało X z Twoich zapasów (p0 → p1)" albo "♥ Serce zjadło Twoje zapasy (p0) i kryształ" (`.ate`, czerwona) z paskiem 7 px (złoty gradient), który po 450 ms kurczy się od 100% do reszty sakiewki przez 1,1 s (bez opóźnienia przy `reduceMotion`); pod nią jedna notka z kawałków po " · ": "Nasycenie +N (Danina D)", "serce urosło do poziomu L: w sklepie czeka Dar serca", "powalone potwory wstaną: N (+N do głodu następnej fali)", "Uczta: +X (zabici przez potwory)", "bohaterowie byli X s od kradzieży" (gdy pasek kradzieży doszedł do co najmniej 30%, a kryształu nie ukradli), "reakcje: Pożar 3, Porażenie 1".
- Rozliczenie: "♥ -need" (syte), "♥ -X i -Y z zapasów", "♥ za mało: -X -Y z zapasów · kryształ"; nowa część "Danina D" (gdy co najmniej 1); "dla Ciebie +mine" (wzór i błąd wyświetlania: sekcja 03, 1.9 i rozdz. 6, pkt 20).
- Szczegóły, Co dalej: przy głodzie "Serce chciało N Esencji, fala dała X, z sakiewki wzięło Y: za mało, pękł kryształ."
- Panel następnej drużyny: ramka omenu następnej fali (`omenBox`) pod nagłówkiem; przy Mgle wojny (o ile nie ma karty Anatomia ofiar, `mods.revealAll`) nagłówek "Fala N: k bohaterów w mgle", a każdy wiersz to krążek "?", "???" " ktoś w mgle" i "Omen Mgła wojny: klasa, poziom i sprzęt nieznane do startu fali." (klasa `.np.fog`, bez stuknięcia w kartę bohatera).

**Zmiany 1.27 w podsumowaniu** (plan UI/UX: ile zarobiłem, co zjadło serce, co dalej; reszta w Szczegółach):

- Tytuły: "Zwycięstwo!" / "Kryształ skradziony" / "Głód rozbił kryształ" / "Serce sięgnęło do zapasu" / "Fala odparta". Kafelki: "masz Esencji", serce z podpisem "serce syte" / "pękł kryształ" / "kredyt krwi" / "wzięło N", "kryształy", "zabici · wystr.".
- Rozliczenie nazywa mnożnik: "Groza G × chciwość m = E"; serce "♥ -N", "♥ -X i -Y z zapasu" albo "♥ za mało: -X -Y z zapasu · kryształ"; ostatnia część "dla Ciebie +Y" z dopiskiem (`small`) "+P dochodu po fali" zamiast "(+P po fali)".
- W `heartLines` linia o kradzieży mówi "o włos: złodziej był X s od kryształu" (X bez zbędnych zer) i pojawia się tylko, gdy do końca kradzieży zostało mniej niż 3 s (wcześniej przy każdym postępie od 30%: "bohaterowie byli S s od kradzieży"); pasek sakiewki "♥ Serce wzięło X z zapasu (p0 → p1)" albo "♥ Serce zjadło cały zapas (p0) i kryształ".
- Panel następnej drużyny: pod ramką omenu (jeśli jest) karta bossa `bossBox`, gdy w następnej fali jest czempion albo bohater z przepowiedni (opis karty w 3.19a); "☠ Imię Tytuł wraca po raz N." (po angielsku liczebnik porządkowy, `ordEn`).
- Stopka: główny przycisk "Dalej: sklep" (bez numeru fali; "Dalej", gdy nie ma kryształów), podpis "darmowe karty: k[, w tym legendarna]"; przy zwycięstwie "Graj dalej" ("fale bez końca") i "Zakończ run" ("jako zwycięstwo"). Rząd małych przycisków: "Szczegóły" / "‹ Wróć", "Wyjdź" (zapisuje run i wraca na start, `title` "Zapisz run i wróć do menu"; było "Zapisz i wyjdź") i "Zakończ run" (dwa stuknięcia, "Na pewno?"). "Pobierz wyniki" zniknął stąd (jest w Menu, 3.5).
- Notka o zapisie wyników ("Zapisuję falę...", potem stan logów i "Run zapisany w tej przeglądarce.") jest tylko w widoku Szczegóły (dla testerów).
- Szczegóły, Co dalej: ostatni punkt "Ranga runu: X (E Esencji, następna: Y od P)." (jedno z miejsc, gdzie widać rangę, odkąd nie ma jej w HUD); punkt o fali "Fala N: poziom ok. L, prowadzi czempion / bohater z przepowiedni.".

### 3.9 Sklep (`renderShop`, zrzut `08_shop.png`)

Otwiera się na początku każdej budowy od fali 2 (po podsumowaniu) i z kafelka Sklep w Talii (tylko w budowie). Zasady zakupów, cen, schowka i odświeżania: sekcja 03.

- Nagłówek: "Przed falą N", "Sklep", duża liczba = Esencja, podpis "Esencji · darmowe: k".
- **Cztery oferty** w siatce 2×2, zawsze na tych samych miejscach (`.offer`): górna ramka 4 px w kolorze rzadkości (odblokowanie fiolet), linia rodzaju 10 px wersalikami ("odblokowanie", "zwykła · w talii 1", "rzadka · od razu"…), nazwa 14,5 px, opis 12 px `#c4c2bc` z podpowiedzią dopasowania ("Pasuje do Twojego lochu." `#9fd7a0` albo "Brak w lochu: …" `#e0a0a6`, `cardFit`), przycisk kupna (24 px wys., czerwony gradient `#ff7480`→`#d8313f`→`#8e1622`): "Weź za darmo" / "Kup za p Esencji" / wyłączone "Za mało (p)". Kupiona oferta: przerywana, 35% krycia, "Kupione" Grenze 20 px. Za droga: tekst w 60% krycia.
- **Arkusz karty** (`.sheet`, nad ofertami, reszta ekranu się nie rusza): po stuknięciu miejsca talii/schowka; "w talii · rzadkość" albo "w schowku (nie działa) · …", nazwa Grenze 24 px, opis 14 px, przyciski "Do schowka" / "Do talii", "Sprzedaj +s" (drugie stuknięcie "Na pewno? +s", czerwona ramka), "×" (32 px) zamyka.
- Rząd akcji (`.acts`, siatka 3 kolumn): "Odśwież" (koszt "N Esencji" na czerwono albo "gratis") i "Za reklamę" ("odśwież raz" / "już użyte"). Trzecia kolumna pusta.
- Panel "Talia d/rozmiar" (prawy dopisek "schowek s/pojemność (nie działa)"): siatka 4 kolumn slotów 34 px wysokości, górna ramka 3 px w kolorze rzadkości, schowek przerywany, puste "wolne"/"schowek"; wybrany slot ma złotą obwódkę. Nazwa w slocie zmniejsza się do 9 px zamiast ucinać (`fitSlot`).
- Stopka: "Do budowy fali N" z podpisem "darmowe karty poczekają: k" albo "sklep: pierwszy kafelek w Talii" → zamyka.

Komunikaty po akcji (`m.msg`: "W talii: X.", "Za mało Esencji…", "Nowa oferta."…) idą do `setHint`, który w 1.12 nic nie robi (rozdz. 10).

**Sklep w 1.26** (zasady: sekcja 03, 3.15 i 3.16):

- **Ilustracja karty** (`ART.cardImg(id)`, `.cardart`, 72×48, piksele bez wygładzania, czarna ramka) nad linią rodzaju każdej oferty i oferty Daru serca; przy wysokości okna do 760 px ilustracje ofert się chowają. Karty grupy Serce mają na ilustracji złoty kontur i czerwoną wewnętrzną obwódkę (`.cardart.heart`).
- **Rząd Dar serca** (`heartOffer()`): gdy czeka poziom serca (`run.heartPicks`), a gracz nie wybrał "Później" i nie ma otwartego arkusza karty, rząd zajmuje miejsce ofert (`.offers.heartrow`). Nagłówek `#heart-head` (czerwono-brązowe tło, złota ramka): "♥ Dar serca · poziom L" i "Serce urosło (Danina albo Ofiara): weź jedną kartę za darmo." (+ "Czeka jeszcze N.", + "Odrost odda utracony kryształ."). Pod nim 3 (z Dziesięciną 4) oferty `#heart-offer-i` (od 1.26.1 tylko rzadkie i legendarne, a karty grupy Serce są wyłącznie tutaj, sekcja 03, 3.15) jak zwykłe (ilustracja, linia rodzaju, przy Odroście "kryształ · od razu", nazwa, opis, dopasowanie, "Połączy się w ★"), przycisk "Weź za darmo" (`#heart-take-i`). Komunikaty: "Dar serca: X w talii.", "Odrost: kryształ wraca do serca.", "X: do schowka (talia pełna).", "X: połączona w ★.", "Talia i schowek są pełne: sprzedaj albo odłóż kartę.". Na dole "Później (sklep)" (`#heart-later`) pokazuje zwykły sklep; wtedy w stopce jest mały przycisk "♥ Dar serca czeka (N)" (`#heart-back`), który wraca do rzędu. Podpis przycisku "Do budowy fali N" wylicza "darmowe karty: k · Dar serca: N poczekają".
- **Runa rodu** (`#shop-rune`, `.runerow`, pod ofertami, nie w widoku Daru serca): ikona runy 24 px (`ART.rune(f)`), "<glif> Runa rodu: <rodzina>" w kolorze rodziny i "poz. L → L+1 (max 5)"; druga linia "jej elementy +8% mocy i -4% odnowienia" (dla Skarbów "łup podbija chciwość o 8% mocniej") z 4 nazwami elementów rodziny i "Działa od razu, nie zajmuje talii."; przycisk "Kup za N" / wyłączone "Za mało (N)" (`#rune-buy`). Komunikat "Runa rodu: X na poziomie L.".
- Kafelek Sklep w Talii ma w budowie dopisek "♥ Dar serca" (+ " + k" darmowych), gdy czeka poziom serca (rozdz. 2.5).

**Sklep w 1.27** (plan UI/UX: od razu widać, ile jest darmowych kart):

- Podpis dużej liczby w nagłówku: "Esencji · 1 darmowa karta" albo "Esencji · darmowe karty: N" (było "darmowe: k"); bez darmowych "Esencji". Przyciski ofert jak dotąd ("Weź za darmo" / "Kup za p Esencji" / "Za mało (p)").
- Panel talii: prawy dopisek "schowek s/pojemność · karty tu nie działają" (było "(nie działa)"); arkusz karty ze schowka "w schowku, nie działa · rzadkość".
- Rząd Dar serca: nagłówek "♥ Dar serca · poziom L" i "Serce urosło. Weź jedną kartę za darmo." (+ "Czeka jeszcze N.", + "Odrost oddaje utracony kryształ.").
- Stopka: "Do budowy fali N" z podpisem "darmowe karty: k · Dar serca: N poczekają" albo "sklep otworzysz w zakładce Talia".

**Sklep w 1.27.3** (`renderShop`; CSS `.shopstage`, `.offers.cards`, `.ccard`, `.cdetail`): oferty są **kartami**, a pełny opis jest w jednym panelu pod nimi.

- Scena sklepu (`.shopstage`, kolumna, wypełnia miejsce nad akcjami): [nagłówek Daru serca] → rząd kart (`.offers.cards`) → panel wybranej karty (`#shop-detail`, `.cdetail`). Arkusz karty z talii (`.sheet`) przykrywa całą scenę.
- **Karta** (`.offer.ccard`, id jak dawniej: `#offer-i`, `#heart-offer-i`, `#shop-rune`): ilustracja (`ART.cardImg`, szerokość karty, proporcja 3:2, piksele), nazwa 12,5 px pogrubiona (najwyżej 2 linie, `line-clamp`), cena pod spodem (Jersey 13 px, złota, z kroplą Esencji jak koszt kafelka; "za darmo" bez kropli; za droga szara, ilustracja przygaszona). Ramka 2 px w kolorze rzadkości: zwykła `#5d6168`, rzadka `#6f9bcc`, legendarna `--ember` (ciemnoczerwone tło), odblokowanie `--violet`, Dar serca `#c9932b` na bordowym tle, **Runa rodu** podwójna 3 px w kolorze rodziny (`--fam`) na tle z poświatą tego koloru, z ikoną runy zamiast ilustracji. Znaczek w prawym górnym rogu: "★" (połączy się) albo "!" (`cardFit` mówi, że nie pasuje). Kupiona: przerywana, 40% krycia, "Kupione" (przy runie też "<glif> rodzina · poz. L").
- Układ: 3 karty w rzędzie (`grid`, 8 px odstępu); przy dokładnie 4 kartach (Dar serca z Dziesięciną, albo 3 oferty i runa) jeden rząd 4 (`.n4`, nazwa 11,5 px). Zwykły sklep to 4 oferty + runa (3 + 2), z dodatkową ofertą 5 + runa (3 + 3).
- **Wybór**: stuknięcie karty (także koniec przytrzymania, Enter/spacja) wybiera ją (`m.pick = { k: 'o' | 'h' | 'r', i }`; złota obwódka, karta unosi się o 3 px). Domyślnie wybrana pierwsza dostępna; po kupnie wybór przechodzi na następną.
- **Panel** (`.cdetail`, górna ramka 4 px w kolorze karty): linia rodzaju (`kindShort`, przy runie "Runa rodu · poziom L → L+1 (max 5)"), nazwa Grenze 20 px (runa: glif i rodzina w jej kolorze), opis 14 px (`fitText` jak arkusz, 14 → 11 px) z "Połączy się w ★: …" i podpowiedzią dopasowania; przy runie skutek ("Elementy rodziny: +8% mocy, -4% odnowienia." / Skarby "Łup podbija chciwość o 8% mocniej.") i drobnym drukiem wszystkie elementy rodziny + "Działa od razu, bez miejsca w talii.". Na dole przycisk 34 px (czerwony gradient): `#offer-buy-i` "Kup za p Esencji" / "Weź za darmo" / "Za mało (p)", `#heart-take-i` "Weź za darmo" obok "Później" (`#heart-later`), `#rune-buy` "Kup za N Esencji". Gdy wszystko kupione: "Wszystko kupione. Odśwież ofertę albo wróć do budowy.".
- Niskie okno (do 760 px wysokości): karty bez ilustracji (nazwa i cena), żeby panel opisu zachował miejsce (od 1.27.4: pionowe karty z ilustracją w rzędzie przewijanym w bok, wyżej "Zmiany w 1.27.4"). Zastępuje to dawny wiersz Runy rodu (`.runerow`, 1.26-1.27.2) i siatkę 2×2 z pełnym tekstem w każdej ofercie.

**Połączone karty ★ (1.24)**: oferta karty, którą już masz, ma w linii rodzaju "połączy się w ★" i pod opisem "Połączy się w ★: <cecha>" (klasa `.fuse`, `.fz`); zakup daje komunikat "...: połączona w ★ (jedno miejsce)."; slot talii i schowka połączonej karty ma złotą ramkę (`.fused`) i nazwę z "★ " (`cardName`); arkusz karty złoty, "Sprzedaj +s" z ceną dwóch kart (`sellFor`). Nazwy kart w Unity: ten sam przedrostek "★ ". Linia rodzaju odblokowania od 1.24 ma też słowa "rani" / "straszy" (`kindShort`, `effWords`).

### 3.10 Koniec przegranej fali (`renderOver`)

Karta: "Serce lochu gaśnie", tytuł "Serce zjadło ostatni kryształ" albo "Ostatni kryształ wyniesiony", opis z informacją o reklamie. Raz na run: "Kontynuuj z 1 kryształem" (symulacja reklamy: "Reklama... 3/2/1" co 700 ms, potem 1 kryształ i budowa) oraz "Zakończ run". W Unity: prawdziwa reklama nagradzana (monetyzacja, sekcja 03).

### 3.11 Zwycięstwo po wczytaniu (`renderVictory`)

"Fala 10/10 odparta", "Zwycięstwo!", opis (Esencja, ranga, kryształy), notka o falach bez końca; "Graj dalej" / "Zakończ: zwycięstwo".

### 3.12 Koniec runu (`renderEnd`)

Ekran pełny: "Koniec runu · m:ss", tytuł "Zwycięstwo" / "Run przerwany" / "Loch upadł", duża liczba = Esencja w runie. Ciało: powód (+ fale bez końca), pigułka "Ranga: X" z "następna: Y od Z" i ewentualnie zielone "Nowy rekord!", kafelki (utrzymane fale z polską odmianą `plural`, zabici, przestraszeni, zjedzone kryształy), wykres "Esencja z fal" ("szare: stracony kryształ"), panel "Najlepsze elementy runu" (5 z paskami) + talia + rekordy. Stopka: "Jeszcze raz" (główny; od 1.12.1 w etapach 1-4 `startGuided()`, potem `newRun(false)`), "Menu" (start), "Pobierz wyniki tego runu (.json)" (tylko prototyp). Rekordy urządzenia aktualizują się raz (`yatd15-records`).

### 3.13 Ankieta (`renderSurvey`, tylko prototyp)

Przed pierwszym ekranem końca runu w wersji web: 5 pytań z przyciskami (`SURVEY`) + pole tekstowe, "Wyślij" / "Pomiń ankietę". Unity: pomiń (ewentualnie link do formularza).

### 3.14 Karta bohatera (`renderHero`, zrzut `09_hero_card.png`)

Otwiera: stuknięcie figury w fali, wiersz listy drużyny, wiersz następnej fali. W fali gra się pauzuje i wznawia po zamknięciu. Podtytuł "Klasa · poz. L ranga[ · powracający][ · łowca skarbów][ · rekrut]", imię Grenze w kolorze klasy, kafelki: HP "h/max" (różowy < 35%), strach "%" "strach z N odwagi" (różowy > 60%), wiara kapłana albo liczba przedmiotów; lista: Teraz (stan żywego), Charakter, Umie, Klasa (odporności), Łowca skarbów, Ciało, Fobia (albo "nie wiadomo"), Blizna, Trauma; "Ekwipunek" (lista z mocą, ładunkami, odnowieniem; sakwa); "Ta fala" (rany wg typów, 4 największe źródła strachu, od 1.17.1 "Widział/Widziała w tej fali: ..."); notka o odkrywaniu ciała i fobii; przycisk "Zamknij" albo "Wróć". Treść: sekcje 04 i 06.

Wiersz "Teraz" (żywy): "Zginął/Zginęła." / "Wyniósł kryształ." / "Uciekł ze strachu." / "Wyszedł z lochu." albo lista po przecinku: "UCIEKA", "NIESIE KRYSZTAŁ", "w klatce", jeden z: "zgubiony", "wraca sam/sama do domu" (1.17, przegłosowany na naradzie; forma żeńska od 1.24), od 1.19 "prowadzi drugą grupę" / "w drugiej grupie", "na zwiadzie" (1.16), "rozgląda się" (1.17, ogląda coś przy rozglądaniu się, `h.look` nieskończone), "sam" (w tej kolejności pierwszeństwa), dalej "krwawi" (od 1.24 przy `burnBy === 'spikes'`) albo "płonie", "przeklęty", "wstrząśnięty śmiercią", stan z `STATE_TEXT`. Stany "zgubiony" i "sam" nie mają formy żeńskiej (w Unity dodać).

Dopisane w 1.20-1.24: przy każdym przedmiocie, skąd pochodzi (`srcText`: " - z domu", " - od gildii", " - z Twojego lochu", " - relikwia z Twojego lochu", " - trofeum z fali n", " - z rzeczy <dopełniacz>", " - od <dopełniacz>", ", przeklęty"; narzędzia samą nazwą, latarnia "(zgaszona)"), "Ciężar: a,b / c,d kg (zwalnia)", u tego, kto wyszedł: "Zabrał(a) z lochu: n łupu, m monet" (1.20); po Charakterze więź: "Przyjaciel: Borys", "Rywalka: Wanda", "Mistrz/Mistrzyni", "Uczeń/Uczennica", "(zginął/zginęła)" (1.21); u Nemezis tytuł w nagłówku (h2) i "nemezis" w podtytule, "Nemezis: wraca N. raz (od fali s), zna pokoje...", "Uraza: <nazwa>" (" (gdziekolwiek)" bez pola), "Nagroda za głowę: N Esencji" ("(wypłacona)" po śmierci), wiersz Blizny bez powtórzenia liczby powrotów (1.23); "Zapadnie: n/limit" (gdy spadł albo w lochu jest zapadnia), "(już mu/jej nie grożą)" przy limicie, "(elita albo poz. 12+: spada raz)" przy limicie 1 (1.24). Karta otwarta w fali liczy się do `fearUi.card` (1.24).

"Ta fala" (żywy bohater w fali, nie z kolejki) ma do trzech punktów: "Rany w tej fali: kłute 12, ogień 5." (`dmgBy` >= 1, nazwy z `DMG_TYPES`), "Strach w tej fali: ..." (4 największe źródła) i od 1.17.1 "Widział w tej fali: ..." / "Widziała w tej fali: ..." (`sawNames(live)`, `p5_ai.js`): tagi z `h.saw` bez `monster`, posortowane rosnąco po `h.sawAt` (kolejność zobaczenia), zamienione na nazwy przez `sawName` (stałe `SAW_NAME`: "wybuch prochu", "monety", "mikstura", "ekwipunek", "relikwia", "przeklęty łup", "serce lochu", "krew"; komnaty z `KIND_INFO[...].name`, reszta z `ITEMS[tag]` albo `ITEMS['r_' + tag]`, małymi literami), puste pominięte, po przecinku, np. "Widział w tej fali: mgła, goblin, kolce, krew, monety." Nagłówek "Ta fala" pojawia się, gdy jest którykolwiek z trzech punktów. `death` nie jest w `h.saw` (liczone z `fl.deaths`, sekcja 06, 6.7.10), więc się nie pokazuje. Do 1.23 krwawiący miał w wierszu "Teraz" "płonie"; od 1.24 "krwawi".

**1.26**: u żywego bohatera w fali po "Teraz" wiersz "Statusy: Podpalenie (opis); Mokry (opis)." (`statusList(live)`: aktywne statusy w kolejności tabeli `STATUS`, nazwa i `desc`, sekcja 05, 5.14.1); u kultysty, który pił, "Wypił/Wypiła z serca X Esencji (zabity odda połowę)."; Charakter z nowymi opisami `TRAIT_TEXT` (przesądny, ciekawski, lojalny, zapaleniec; opisy ciekawskiego i zapaleńca obiecują więcej, niż robi kod, sekcja 04, 4.2); Fobia z nowymi nazwami (umarli, otchłań, hałas, roje). Wiersz "Teraz" ma stan `drink` "pije Esencję z serca". `FEAR_SRC` ma nowe klucze: "krzyk serca", "płomienie", "zew kusicielki", "para", "dzwon żałobny". Nowe klasy dostają ikonę i kolor z `HEROES` jak stare.

### 3.15 Karta elementu (`renderItem`)

Element (sub "Pułapka · poziom l z 3"), co zrobił w ostatniej fali, opis, moc, typ pokoju, przyciski "Ulepsz do poziomu N", "Przenieś", "Zdejmij", "Zamknij". **W 1.12 nieosiągalna** (stuknięcie elementu go podnosi, rozdz. 4.2). Nie trzeba jej robić w Unity, chyba że jako okno pomocy.

**1.26**: dalej nic nie otwiera typu `item`, ale treść jest uzupełniona: przy elemencie na 3. poziomie "Cecha A/B: nazwa (opis)." (`branchTrait`), poniżej 3. poziomu "Poziom 3 dodaje cechę do wyboru: A ... albo B ...", podpis ulepszenia z 2 na 3 "cecha A albo B", a przycisk otwiera okno wyboru cechy (3.23). Rodzina elementu jest w dymku kafelka paska (rozdz. 2.5: "Rodzina: <glif> <nazwa> (poziom L: +8L% mocy)" albo "(Runa rodu ze sklepu ją wzmocni)").

**1.27**: w zwijanym "Opis" pod jednozdaniowym `desc` stoi `more` jako notka (drobny druk), potem moc i pokój jak dotąd.

### 3.16 Karta talii (`renderCard`)

Z zakładki Talia. "Rzadkość karta · talia d z s", nazwa w kolorze `RAR_COLOR`, opis, kopie, licznik rosnący. W budowie: "Do schowka" ("nie działa, czeka" / "schowek pełny"), "Sprzedaj" (dwa stuknięcia), "Zamknij"; w fali tylko notka "Karty sprzedajesz tylko między falami." i "Zamknij" (otwarcie w fali pauzuje).

**1.26**: pod podtytułem duża ilustracja karty (`ART.cardImg(id, true)`, `.cardbig`, 144×96); licznik karty rosnącej "Zebrane w tym runie: N. Sprzedaż ostatniej kopii zeruje licznik." (`run.stacks`); przy Kopiście i Lustrze duszy "Teraz kopiuje: X." albo "Teraz nic nie kopiuje (po prawej / na pierwszym miejscu nie ma zwykłej karty)." (`copyTarget`). W budowie, gdy w talii jest Kopista albo Lustro duszy i talia ma więcej niż 1 kartę: notka "Kolejność ma znaczenie dla Kopisty i Lustra duszy." i dwa przyciski "◀ W lewo" / "W prawo ▶" z podpisem "miejsce N z D" (`#card-left`, `#card-right`, wyłączone na brzegach). Przesunięcie zamienia sąsiednie karty w `run.deck`, przelicza `mods`, zapisuje run i otwiera kartę na nowym miejscu.

### 3.17 Wyłom (`renderBreach`, arkusz u góry)

Otwiera: stuknięcie wyłomu w budowie (≤1,1 pola, nic nie wybrane) albo automatycznie przy nowym wyłomie. Kamera centruje wyłom i przesuwa go niżej (`cam.oy -= ch*0.18`), żeby był widoczny pod arkuszem, oraz uruchamia "ping" (rozdz. 6.13). Treść: "Wyłom · od fali N · na mapie poniżej", "Nowy wyłom!" / "Wyłom w ścianie", opis, "Załataj wyłom" (20 Esencji, od 1.26 15, `BREACH_PATCH`; wyłączony z "(masz N)"), "Zostaw" ("niech wybierają"). Mapa pod arkuszem nie przyjmuje stuknięć.

### 3.18 Głód serca (`renderHungerTip`)

Raz na run na początku budowy fali 2 (po sklepie): "Fala 2", "Serce jest głodne", akapit z porcją, 4 punkty, "Rozumiem".

**1.26**: tekst przepisany pod nowe serce. Akapit: "Od tej fali serce bierze pierwsze porcje Esencji z każdej fali, aż się naje: teraz N, potem coraz więcej. Dopiero reszta trafia do Ciebie." i 5 punktów: pasek ♥ i syte serce; Danina 30% w Nasycenie (złoty pasek), poziom serca i Dar serca; niedobór z sakiewki, kryształ pęka, gdy sakiewka nie wystarczy, i sakiewka zostaje pusta; zapas Esencji ("serce chce N · zapas X") i stuknięcie serca; Groza × Chciwość × Combo i trzymanie bohaterów w lochu.

### 3.19 Skąd Esencja (`renderEsencja`)

Ze stuknięcia równania (w fali pauzuje). Wzór i objaśnienie, "Groza: co przeżywają bohaterowie" z tabelą wag `GZ`, "Chciwość ×c" z listą dodatków, "Combo ×k" z zasadą (okno combo, +12% na stopień), w fali/podsumowaniu "W tej fali" (źródła i suma). Treść liczb: sekcja 03.

### 3.19a Wieści z karczmy (`renderNews`, od 1.12.1)

Stuknięcie w "Fala X/10" w budowie (`#h-wave`) otwiera kartę: podtytuł "Wieści z karczmy", nagłówek = nazwa fali (`waveName()`), akapity = zdania z `waveHint()` (liczba i poziom bohaterów, boss, głód serca w tej fali, wyłom, gildia, plotki), przycisk "Zamknij" (`#news-close`). Zastępuje dawny komunikat u góry ekranu.

**1.26**: gdy w tej fali jest omen (`run.omens[run.wave]`), na początku karty stoi ramka omenu (`omenBox`: ilustracja 96×48 z `ART.omen`, "Omen: <nazwa>", opis, zielone "Nagroda: ...", czerwone "Za to ..." albo "Bez nagrody: zmienia, co działa."), a za pierwszym razem w tej przeglądarce (`yatd-pops`, klucz `omenNews`) notka "Omen to zasada specjalna tej jednej fali (fale 3, 6 i 8). Omen, który utrudnia falę, daje nagrodę; ten, który ją ułatwia, podnosi głód serca. Buduj pod niego.". `waveHint()` dopisuje "OMEN NAZWA: opis. Nagroda: .... Za to ...."; przy Mgle wojny cała wieść to "Fala: N bohaterów w MGLE WOJNY: nie wiadomo, kto przyjdzie ani jak silny." (+ głód i omen).

**1.27, karta bossa** (decyzja autora 25.10: czempion i bohater z przepowiedni dostają kartę jak omen na ekranach między falami; `p8b_ui.js: bossBox(e)`, CSS `.omenbox.bossbox`): ramka jak `omenBox`, ale brązowo-pomarańczowa (ramka `#8a5a2a`, gradient `rgba(90,50,20,0.45)` → `rgba(24,18,14,0.6)`, nazwa `#ffcf9a`). Po lewej pole 64×48 z poświatą i ikoną klasy 40 px (`classIconSvg`, `#ffb07a` dla czempiona; dla bohatera z przepowiedni `#ffd27a` i jaśniejsza poświata, klasa `fin`). Po prawej: "Czempion: Imię" / "Bohaterka z przepowiedni: Imię" (`BOSS_NAME` w formie płci), linia "Klasa, poziom L." i co robi (czempion: "Prowadzi drużynę i nie ucieka z resztą. Gdy ktoś wpada w panikę, jego/jej okrzyk dodaje innym odwagi."; bohater z przepowiedni: "Zna drogę do serca i prowadzi drużynę prosto do niego. Ranny/Ranna do połowy wpada w szał, a kto idzie obok, boi się mniej.") oraz zielona linia: "Nagroda: po fali legendarna karta w ofercie." albo "Przetrwaj tę falę, a run jest wygrany.". Karta stoi w wieściach z karczmy pod ramką omenu (gdy `run.nextFor === run.wave` i w `run.next` jest boss) i w panelu następnej drużyny podsumowania (3.8).

**1.27, otwieranie i tekst**: wieści otwierają się same raz na początku budowy fali z omenem **albo z bossem** (`p3_flow.js: startBuild`, `queueModal({type: 'news', omen: true})`; nie po wczytaniu i nie w samouczku). `waveHint()` nie ma już zdań o bossie ani o omenie (mają swoje karty): "Fala N: k bohaterów, poziom a-b.", przy głodzie "Serce chce N Esencji z tej fali. Gdy fala da mniej, brak weźmie z zapasu, a gdy i tego zabraknie, pęknie kryształ.", wyłom, gildia, plotki, a w fali 1 "Stawiaj elementy z paska. Każdy pokój mieści kilka (kropki przy pokoju). Nowe pokoje kopiesz w zakładce Loch.". Notka o omenie za pierwszym razem: "Omen to specjalna zasada tylko tej fali. Trudniejszy omen daje nagrodę, łatwiejszy podnosi głód serca. Buduj pod niego.".

### 3.20a Okna dodane w 1.24 (`renderUnspent`, `renderName`, `renderOnb`)

- **"Masz X Esencji"** (`unspent`, 3.21): podtytuł "Przed falą N", tekst "Rozpocząć falę mimo to? Niewydana Esencja nie broni lochu. Najtańszy element: <nazwa> (<koszt>)." (+ "Uwaga na głód: serce chce N Esencji z tej fali."), pole "Nie pytaj więcej", przyciski "Buduj dalej" i "Wypuść falę mimo to" (`#unspent-go`). Reguła: sekcja 03, 3.14.
- **"Jak masz na imię?"** (`name`, tylko wersja WWW, przed pierwszym nowym runem bez imienia): podtytuł "Zanim zaczniesz", tekst "Imię albo pseudonim. Dzięki niemu autor odróżni Twoje gry od gier innych osób, także na tym samym telefonie.", pole (max 40, przykład "np. Kasia"), "Graj" (pusta nazwa: fokus), "Pomiń" (link). Sekcja 07, 7.11.6.
- **Karta etapu** (`onb`): od 1.24 w pierwszym runie "Fala N · nauka" i "Nowe: <etapy>" z punktami `ONB_STAGES[k].news`, notka "Od fali X: <następny etap>." albo "To już cała gra. Kolejne runy zaczną się od niej. Wszystkie zasady znajdziesz w Jak grać na ekranie startowym."; przycisk "Gramy" (`#onb-go`); pokazywana przed sklepem budowy, w której etap się otwiera. Run zapisany przed 1.24: "Run s z 4 · nauka" i "Następny run doda: ...".

### 3.21 Pytanie o niewydaną Esencję

Przycisk akcji w budowie: `askUnspent()` przed `startWave()`; gdy zwraca prawdę, otwiera okno 3.20a i fala nie startuje. Od 1.25.1 okno podpowiada, co kupić (`suggestBuys`): 1-2 elementy dostępne teraz w pasku (otwarte, odblokowane, na które stać), z wolnym miejscem w lochu, każdy z ceną i powodem ("pasuje na trasę bohaterów", "mocne w ostatniej fali (N pkt)", "chciwość pomoże nakarmić serce"). Ocena: pułapka 3, potwór 2,6, łup 1,6, budowla 1; + do 1,5 za droższy z dostępnych; + 1-2 za punkty w ostatniej fali; + 2 dla łupu przy głodzie; + 0,6, gdy stoi na trasie albo ją obejmuje. Drugi jest innego rodzaju i mieści się w reszcie Esencji, jeśli się da. Stuknięcie podpowiedzi zamyka okno, rozwija pasek, przechodzi do zakładki, wybiera element (wolne miejsca świecą na mapie) i podświetla kafelek na 6 s (`flashSuggest`, klasa `.suggest`); Buduj dalej podświetla oba. Bez podpowiedzi zostaje stary tekst z najtańszym elementem. Log: `stats.unspentPicks`, `stats.unspentPick`. Nie w przewodniku. Testy klikające "Wypuść falę" z Esencją muszą nacisnąć `#unspent-go` albo ustawić `yatd-noask-ess`.

Od 1.26 pytania nie ma, gdy Esencja w sakiewce jest nie większa niż głód tej fali (`e <= hungerNeed(run.wave)`): zapas na głód to świadomy wybór, bo serce bierze niedobór z sakiewki.

### 3.22 Karta serca (`renderHeart`, 1.26)

Otwiera stuknięcie (albo Enter) wiersza serca `#h-hrow` w HUD; w trwającej fali najpierw pauza, a "Zamknij" ją zdejmuje (`m.unpause`). Fala, której dotyczy: w budowie bieżąca, w podsumowaniu następna.

- Podtytuł "Serce · poziom L" (przy 0 z dopiskiem " (rośnie od pierwszego nasycenia)"), nagłówek "Głód fali n: N" (albo "Serce", gdy głodu nie ma).
- 4 punkty zasad: serce je pierwsze (czerwony pasek); niedobór po fali z sakiewki (z Kamiennym sercem "75% braku"), kryształ pęka, gdy sakiewka nie wystarczy, a serce zjada resztę sakiewki; Danina "N% każdej dalszej wypłaty" w Nasycenie (złoty pasek); co dają poziomy (Dar serca; 2, 4, 6 miejsce w talii; 3, 5, 7 możliwy Odrost); od 1.26.1 punkt brzmi "Każdy poziom: darmowa karta z rzędu Dar serca w sklepie (rzadka albo legendarna, karty Serca są tylko tam). Poziomy 2, 4, 6: +1 miejsce w talii. Poziomy 3, 5, 7: w rzędzie może być Odrost (utracony kryształ wraca).".
- Notka ze składnikami głodu (`hungerParts`): "Głód N: tabela T[ → B (karty, omen)], +R odrodzenie potworów, +D demony, +K kredyt krwi, −S spichlerz, −G głód krwi." i w budowie "Masz w sakiewce P: pokryje cały głód." albo "...: fala musi dać co najmniej N-P, inaczej pęknie kryształ."; od 1.26.1 z Kamiennym sercem (k = 0,75): "pokryje cały głód (Kamienne serce: wystarczy 75% braku).", gdy `P >= 0,75 × N`, inaczej "fala musi dać co najmniej ceil(N - P / 0,75)" (w 1.26 Kamienne serce nie było tu wliczone).
- Pasek Nasycenia `.satbar` (18 px, złoty gradient, wypełnienie od progu bieżącego poziomu do następnego), napis "Nasycenie S / próg do poziomu L+1".
- Notka "Poziom L+1: karta Dar serca[, +1 miejsce w talii][, może być Odrost]." (+ "Dar serca czeka w sklepie: N.").
- Tylko w budowie: złoty przycisk "Ofiaruj sercu min(10, limit)" z podpisem "Esencja z sakiewki w Nasycenie 1:1 (do 40 na przerwę, użyte U)" / "limit tej przerwy wykorzystany" / "brak Esencji" (`#heart-ofiara`), a gdy limit jest większy niż 10, drugi "Ofiaruj L" "cały limit" (`#heart-ofiara-all`). Po Ofierze karta otwiera się od nowa (chyba że pod spodem był sklep); gdy Ofiara przekroczy próg poziomu, `heartLevelUp` od razu kolejkuje sklep z rzędem Dar serca (`{type: 'shop', heartNow: true}`). Zasady Ofiary: sekcja 03, 2.14.
- "Zamknij".

**1.27**: podtytuł zawsze "Serce · poziom L" (bez dopisku przy poziomie 0). Notka ze składnikami głodu zaczyna się od "podstawa B" i jest pokazana tylko, gdy głód ma coś poza podstawą ("Głód N: podstawa B, +R powalone potwory, +D demony, +K Kredyt krwi, −S Spichlerz dusz, −G głód krwi."); bez dodatków notka ma tylko zdanie o sakiewce ("W sakiewce masz P: wystarczy na cały głód." albo "...: fala musi dać co najmniej X, inaczej pęknie kryształ."). 4 punkty zasad zostają (plan proponował 3), przepisane krócej: "Serce je pierwsze: z wypłat w fali bierze swoje, aż się naje (czerwony pasek). Reszta jest Twoja." i dalej sakiewka, Danina, poziomy. Przyciski "Ofiaruj sercu N" i "Zamknij" bez zmian.

W Unity: osobny panel nad HUD; liczby (głód i jego części, Nasycenie, poziom) z `Core/Economy`, przycisk Ofiary woła tę samą funkcję co prototyp (`ofiara(n)`).

### 3.23 Wybór cechy poziomu 3 (`renderBranch`, 1.26)

Otwiera ulepszenie elementu z poziomu 2 na 3, gdy element ma cechę B (`TRAITS_B`, wszystkie 43 elementy z poziomami: 25 pułapek i 18 potworów): stuknięcie w trybie ulepszania (`tapUpgrade`) albo przycisk w karcie elementu. Zwykłe ulepszenie 1→2 i elementy bez B idą bez okna.

- Podtytuł "<nazwa> · poziom 3 · C Esencji", nagłówek "Wybierz cechę".
- Notka "Moc rośnie tak samo, różni się cecha. Wyboru nie da się cofnąć (chyba że zdejmiesz element)." i dla elementu w komnacie "Ten element stoi w komnacie, która i tak daje mu cechę A: wybierz B, a będzie miał obie."
- Dwa przyciski obok siebie (`.choices.branch`): "A: nazwa" (zwykły) i "B: nazwa" (złoty), w podpisie opis cechy (`#branch-A`, `#branch-B`); wyłączone, gdy brakuje Esencji. Wybór woła `upgradeItem(it, 'A'|'B')`, zamyka okno i wraca do karty, z której przyszedł.
- Przycisk główny "Anuluj" albo "Za mało Esencji (C)".

Gdy element nie jest już na poziomie 2 albo nie trwa budowa: "Tego już nie ulepszysz." i "Zamknij".

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
| kółko myszy | ×1,15 na ząbek | przybliżanie | przybliżanie |
| przeciągnięcie po przyspieszeniu (1.25) | ruch > 14 px (mysz), > 26 px (palec) | - | kończy przyspieszenie i przesuwa kamerę (wcześniej kamera stała) |
| środkowy przycisk (1.25) | | tylko przesuwa | tylko przesuwa |
| prawy przycisk (1.25) | | na elemencie albo meblu: pyta ("Zdjąć za +N? Prawy jeszcze raz"), drugi w ciągu 3 s zdejmuje (`rcMark`, `holdRemove`) | nic |
| touchpad: dwa palce (1.25) | `deltaMode` 0 i `deltaX` ≠ 0, albo `|deltaY|` < 40, albo ułamek (i 0,35 s po takim) | przesuwa mapę | przesuwa mapę |
| touchpad: szczypanie (1.25) | kółko z Ctrl (także Ctrl + kółko myszy); Safari: `gesturechange` | płynne przybliżanie `exp(-dy × 0,01)` | to samo |
| najechanie myszą (1.25) | 0,3 s bez ruchu, bez przycisku | podpowiedź elementu albo mebla (`#hov`: nazwa, poziom, etykieta, Rani/Straszy, opis, skróty) | podpowiedź bohatera (imię, klasa, poziom, życie, strach %, kryształ) |

Przesuwanie ręczne (przeciągnięcie, touchpad, klawisze) przesuwa też loch mniejszy niż ekran, o 1/4 widoku w każdą stronę (`clampCam(true)`; wcześniej taki loch stał na środku i przeciąganie nic nie robiło). Na kafelku w pasku: najechanie (0,42 s) albo prawy przycisk pokazuje opis; przytrzymanie działa jak dotąd.

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

### 4.7 Klawiatura (od 1.25 pełna, lista w Menu > Sterowanie, `renderKeys`)

Spacja: odpowiedź na check; P: zwiń/rozwiń pasek w fali (nie przy karcie samouczka); F trzymane: przyspieszenie; Esc: odłóż wybór i to, co w ręce; Ctrl/Cmd+Z: cofnij w budowie. Od 1.25: W A S D i strzałki trzymane przesuwają mapę (650 px/s); + / - przybliżają ×1,15 wokół środka; 1-9 i 0 wybierają widoczne kafelki po kolei (numer w rogu kafelka przy myszy); Q / E poprzednia i następna zakładka; Enter wypuszcza falę (przez ten sam przycisk, więc pytanie o niewydaną Esencję zostaje); B zwija i rozwija budowę (w fali: pauza). Unity: Input System, te same akcje w wersji na komputer (jeśli powstanie).

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
| `buildScale` | `clamp(cw / 10,5, fitScale, 44 × ui)`: ok. 10,5 jednostki widoku na szerokość mapy (1.25: × ui) | `buildScale` |
| `MAX_S` | 56 × ui px na jednostkę (1.25) | `zoomAt` |
| zakres przybliżania | od `0,95 × fitScale` do 56 | `zoomAt` (przybliża wokół punktu pod palcami/kursorem) |
| ograniczenie przesuwu | gdy mapa mniejsza niż ekran: wyśrodkowana; inaczej `ox ∈ [-0,3 cw, mw - 0,7 cw]`, `oy ∈ [-0,3 ch, mh - 0,7 ch]` | `clampCam` |

Start budowy: `cam.s = buildScale`, środek między wejściem a sercem (`p3_flow.js: startBuild`). W budowie kamera jest tylko ręczna.

### 5.4 Fala: kamera za drużyną (`autoCam`)

Działa tylko w fali, gdy nie ma pauzy, pasek jest zwinięty i nie ma ręcznego przejęcia.

1. Punkty: pozycje żywych bohaterów (w `vX`, `vY` z z = 0,5) + pułapka trwającego checku; bez bohaterów: wejście.
2. Prostokąt z marginesem m = 3,2 (pion m × 0,8): `bw = szer + 2m`, `bh = wys + 1,6m`.
3. Docelowa skala `ts = clamp(min(cw / bw, (ch - ins) / bh), fitScale, max(34, buildScale))` (1.25: na dużym ekranie tak blisko jak w budowie; telefon zostaje przy 34), gdzie `ins = coachInset` (wysokość coacha u góry mapy; drużyna jest kadrowana pod nim, środek pionowy `hc = ins + (ch - ins)/2`).
4. Wygładzanie: `k = 1 - exp(-rdt × 2,6)` dla skali i środka.
5. Po przeliczeniu kamera trzyma loch w kadrze z zapasem 0,6 jednostki zamiast pokazywać pustkę (`pad`).
6. Podział ekranu (5.5).

**Ręczne przejęcie**: przeciągnięcie ustawia `cam.manualUntil = realNow + 4`, pinch i kółko `+ 5`. W tym czasie kamera nie podąża, a podział ekranu gaśnie (`SPLIT.k -= 3/s`). Start fali i budowy zeruje przejęcie.

### 5.5 Podzielony ekran (`splitCam`, `splitViews`, `SPLIT`)

Pomysł autora (jak w grach LEGO): gdy drużyna rozejdzie się tak, że nie mieści się na ekranie w czytelnej skali, linia przez środek ekranu (prostopadła do kierunku między grupami) dzieli go na dwie połówki, każda z własną kamerą.

- **Warunek** (`want`): ustawienie `split` ≠ 0, ≥ 2 żywych i widocznych bohaterów, `fitScale < SPLIT_T` (cały loch nie mieści się w 19 px na jednostkę) i skala potrzebna, żeby zmieścić wszystkich, `< SPLIT_T` (19; do 1.16 było 16) (×1,12 histerezy, gdy już podzielony, czyli połówki łączą się przy 21,3). Od 1.16.1 (autor: dzielić trochę wcześniej) ekran dzieli się przy grupach ok. 1/5 bliżej siebie niż przy 16.
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

1. **Podłoga** (rzut podłogi `floorT`, rysowanie w pikselach pola): kafelki (`drawTileLayer`) → światło pochodni → komnaty (`drawRoomKinds`) → efekty pokoi (`drawRoomTypes`, od 1.15 na podłodze komnaty) → poświaty rodzin (`drawKindAuras`) → strefy (`fl.zones`, `rgba(160,190,255,0.18)`) → w fali mapa zagrożenia (`fl.danger` ≥ 0,4: `rgba(255,80,80, min(0,22, d×0,05))`) → w budowie zasięgi pułapek i plotki → poświata serca → rzeczy płaskie (sieć, zapadnia, otwarta klatka, rozbita budowla) z "pykiem" → znaki stanu na polach (6.5) → mgła wiedzy (fala/podsumowanie) → znaczniki miejsc / przenoszenia → pierścień przytrzymania → znacznik wyłomu (budowa) → zakłócone pola (fiolet `rgba(150,100,255,0.38)`) → cel samouczka → efekty pól i linii → pierścienie cząsteczek.
1a. **Życie komnat** (`drawKindLife`, rzut ekranu, przed ścianami, więc ściana przed pokojem je zasłania).
2. **Ściany**: najpierw "wargi" (ściany położone płasko) i rzeczy na nich, potem stojące bloki posortowane po głębokości.
3. **Rzeczy stojące**, posortowane po głębokości (meble x+y+1, elementy x+y+1 (na meblu +0,02), serce, bohaterowie p.x+p.y, trupy potworów). Rzecz, którą zasłoniłaby stojąca ściana przed nią (`wallCovers`), rysowana jest pomiędzy blokami ścian; reszta po wszystkich ścianach. Potem ramki na licach ścian, potem latające potwory (duch, cień, nietoperze) nad wszystkim.
4. **Znaki** (zawsze w pionie, czytelne): "?" zakłócenia, nazwy efektów i komnat (komnata linijkę wyżej, gdy pokój ma oba), etykiety pokoi, "SERCE", oczy plotek (budowa), znaczniki narzędzi (budowa), etykieta wyłomu, "zdejmij", koszty ulepszeń, znaczki pamięci checku i "!" wykrycia, iskry, unoszące się napisy.

Wydajność (prototyp): podłogi rysowane raz do kawałków 8×8 pól w kilku skalach i wklejane (`tileChunk`, `TC`), poświaty jako gotowe obrazki (`glowSprite`), w budowie bez dotyku 2 s rysowana co druga klatka. W Unity zbędne (siatki/tilemapa), ale warto zachować oszczędzanie baterii w budowie (np. `Application.targetFrameRate` 30 w bezczynności).

### 6.2 Podłoga, drzwi, typy pokoi, mgła

- **Podłoga** (`drawTiles`): kolor pokoju (`ROOM_TINT` wg głębokości, korytarz ×0,62) + przyciemnienie `rgba(5,5,9,0.24)`; płyty o nierównym kolorze wg skrótu pola `tileHash` (v = h mod 7: v < 3 ciemniej o 0,05 + 0,04v, v = 6 jaśniej `rgba(215,225,240,0.04)`); dwa jasne prostokąty (0,1/0,12 i 0,52/0,56, 0,34×0,24 pola) `rgba(220,230,245,0.04)`; obwódka pola `rgba(0,0,0,0.38)`; co dziewiąte pole (T ≥ 16) rysa. Skała: nic (ciemność).
- **Drzwi**: `#131418` + deski `#3b2f28` (3 szczeliny wzdłuż przejścia); **wejście** `#5c544c` z ciepłym gradientem `rgba(255,220,160,0.35)` i jasnym trójkątem-strzałką `rgba(255,236,200,0.95)`; **wyłom**: gruz `#2a0f14` z czerwonymi pęknięciami `#ff6b6b`.
- **Typy pokoi** (`drawRoomTypes`, nakładka na prostokąt pokoju): Mgła: `rgba(190,200,220,0.16)` + 4 dryfujące kłęby; Bagno: `rgba(70,100,40,0.32)` + 5 pęcherzyków; Grota: `rgba(80,100,170,0.2)` + 2 rozchodzące się pierścienie (0,35/s); Krypta: `rgba(40,20,60,0.35)` + krzyże co 4. pole; Sezam: `rgba(200,160,50,0.16)` + migające iskry; Sanktuarium: `rgba(255,236,180,0.11)` + oddychająca poświata i duży jasny krzyż; Zębatki: `rgba(150,110,60,0.16)` + 2 obracające się koła zębate (8 zębów); Głusza: `rgba(14,16,22,0.34)` + 2 pierścienie zwijające się do środka; Lodownia: `rgba(170,215,240,0.2)` + przesuwające się błyski i rysy lodu. Nazwa typu przy przednim lewym rogu pokoju: "glif Nazwa" w kolorze typu (T ≥ 14).
- **Mgła wiedzy** (`drawFog`, w fali, podsumowaniu, końcu): pola, których drużyna nie zna, `rgba(5,6,8,0.52)`; rzeczy stojące na nich w 55% krycia.
- **Plotki** (budowa): pola znane z plotek `rgba(180,140,255,0.10)`; nad pułapką z plotki oko (`eyeIcon`, `#d6c8ff`): pełne, gdy plotka trafna, puste, gdy fałszywa/nieaktualna.
- **Zasięgi** (budowa, `drawAreas`): pola rażenia każdej pułapki/potwora w kolorze kości `rgba(225,220,205,0.08)`, przez 1,4 s po postawieniu 0,26.

### 6.2a Komnaty (od 1.15, `p7_draw.js`)

Każda komnata ubiera swój pokój, żeby było ją widać z daleka. Ściany komnaty mają własny materiał i kształt (niżej, "Ściany komnat"), a na tym sześć warstw, wszystkie stałe dla pola (los z `tileHash` przez `kH(x, y, sól)`), z ruchem z `realNow` (przy "mniej ruchu" czas stoi, a życie znika):


1. **Podłoga** (`drawRoomKinds`, rzut podłogi, od T ≥ 6, tylko pokoje widoczne na ekranie: `roomSeen`). Część stała (`KIND_FLOOR[rk]`) malowana raz na pokój do płótna w rozdzielczości ekranu (`kindFloorCache`: `s = round(T × DPR / 3) × 3` pikseli na pole; od nowa, gdy zmieni się pokój, komnata albo skok przybliżenia) i wklejana jednym obrazem; część ruchoma (`KIND_LIVE[rk]`: płomień ogniska, pająki, krąg i kałuże, cienie stada, światło świec, błyski, żar kuźni z kowadłem, połysk galerii, koń na biegunach) rysowana co klatkę, przycięta do pokoju. Rzeczy leżą płasko i niczego nie blokują. Efekty pokoi (`drawRoomTypes`) też rysują tylko pokoje na ekranie (od 1.15).
2. **Ozdoby na licach ścian** (`kindWallDeco`, `KIND_WALL[rk]`, wywoływane z `wallDressing`, od T ≥ 12): na stojącej ścianie (wysokość ≥ 0,6 `WALL_H`) lico S i E, które patrzy w pokój z komnatą, mapowane `faceMap` na kwadrat jednostkowy (z1 = min(h, 1,45), z0 = z1 - 1,2). Pomijane: co trzecie pole (`tileHash(5x+1, 3y+2) mod 3 = 0`), pola z pochodnią i pola z pułapką ścienną. Wariant `alt` co drugie pole (`tileHash(x+7, y+11)` parzysty).
3. **Życie** (`drawKindLife`, rzut ekranu, od T ≥ 9, tylko gdy środek pokoju jest na ekranie i nie w mgle wiedzy).
5. **Rzeczy stojące** (dodane w 1.15 po uwadze autora: "bardziej niż o zmianę koloru i tekstury podłogi chodzi o dodanie malutkich, wypukłych elementów spójnych tematycznie oraz jakichś efektów cząsteczkowych"; `PROP_PLAN`, `kindProps`, `kindPropsSO`, `drawProp`, `PROP`): drobne bryły w rzucie ekranu (`pCyl` walec, `pBall` kula ze światłem z lewej i cieniem z prawej, `pCone` stożek, `pFlame` płomień, `isoBox`, `groundShadow`). Plan na pokój liczony raz (klucz: komnata + prostokąt pokoju): dla każdego pola los `kH`, przy ścianie częściej (zwykle 50-75%) niż w środku (0-35%), punkt w polu 0,22-0,78, skala 0,85-1,15, wariant 0-3; niektóre rzeczy stoją na środku pokoju (ognisko, kocioł, tarcza strzelecka, palenisko) albo w stałym miejscu (kowadło, szczur, słupki z liną wzdłuż chodnika). Co klatkę rzeczy z pokoi na ekranie (od T ≥ 9) idą do listy rzeczy stojących (`drawSO` rodzaj 5, głębokość x + y), więc bohater idący za kotłem jest nim zasłonięty; pominięte, gdy na polu jest pułapka, potwór, mebel albo serce. Rysowane ×1,3 (`PROP_K`) wokół stopy, w mgle wiedzy w 55% krycia. Niczego nie blokują.
6. **Elementy wystające ze ścian** (`KIND_WALL3D`, `kindWall3D`, `wallFrame`: punkt lica (u, d na zewnątrz, z), `box` przy licu, `plane(d, z0, z1)` = płaszczyzna lica przesunięta o d): rysowane zaraz po swoim bloku, przed rzeczami przed nim.

**Bryła rzeczy płaskich** (decyzja autora: "jak najwięcej obiektów 3D, nawet płaskie niech lekko odstają, tylko postacie w 2D"; `relief`, `noRelief`): sieć, zapadnia, otwarta klatka i gruz po budowli leżą 0,035 pola nad podłogą (`floorT(0.035)`), pułapki ścienne 0,04 pola przed licem (`wallPlane(it, 0.04)`; na położonej ścianie 0,04 nad wargą), uchwyt pochodni 0,04 przed licem, ozdoby komnat 0,03; wszystkie rzucają cień płótna (`shadowColor rgba(0,0,0,0.55)`, przesunięcie 0,025 × T × DPR w prawo i 0,045 w dół, rozmycie 0,035, × 0,6-0,9), który nie skręca razem z płaszczyzną, więc wygląda jak odstęp od podłoża. Postacie (bohaterowie, potwory, duchy) zostają płaskimi figurkami.

| Komnata | Podłoga (płasko) | Rzeczy stojące (3D) | Na ścianach: ozdoby / elementy wystające | Życie |
|---|---|---|---|---|
| Goblinia nora | ubita ziemia, ciemne placki, słoma, zielone odciski dłoni przy ścianach, krąg kamieni | ognisko z dwoma polanami, płomieniem i iskrami (środek); kępki 2-3 świecących zielonych grzybków z poświatą; kamienie; patyki; totem: kij z czaszką i zieloną szmatą (rzadko, przy ścianie) | proporzec z dłonią, włócznie / stempel z belki, korzenie zwisające z ziemi | dym z ogniska, zielone zarodniki nad grzybkami |
| Leże pająków | zmierzch `rgba(52,42,74,0.3)` (bez sieci: wielkie pajęczyny malowane na podłodze usunięte po uwadze autora) | skupiska 3-5 jaj z nitkami; kokony; kłębki jedwabiu; małe pająki chodzące tam i z powrotem | pajęczyna z górnego rogu, pająk na nici / płachta jedwabiu zwisająca z krawędzi i falująca, kokon na nici; na górze ścian jaja zamiast namiotów z nici | 2 pająki zjeżdżające z sufitu |
| Jaskinia ogra | pęknięcia, plamy krwi, odciski stóp | kocioł na żarze z bulgoczącą zieloną zupą i parą (środek); stosy kości z czaszką; głazy; kość z mięsem | ślady pazurów, czaszka na sznurze / bryły skały, czaszka na kolcu | muchy, para z kotła |
| Nawiedzona sala | zimny błękit, obracający się krąg przywołania, świecące kałuże, szron | 2-3 świece z niebieskim płomieniem w kałuży wosku; przewrócone krzesła; urny | zasłona, niebieska świeca / kinkiet z niebieską świecą | ogniki |
| Gniazdo nietoperzy | ciemność, guano, cienie stada | stalagmity (1-3 stożki); kopczyki guana | wiszące nietoperze / sople skalne z krawędzi, nietoperz wiszący wśród nich | nietoperze latające ósemką |
| Kaplica czaszek | płyta z krzyżem na środku | piramidki czaszek; świece z ciepłym płomieniem; wiązki kości | nisze z czaszkami, skrzyżowane kości / kości wystające ze ściany, czaszka wysunięta z lica | kurz w świetle świec |
| Zbrojownia | stalowe płyty z nitami, leżące strzały | tarcza strzelecka na trójnogu ze strzałami (środek); stojaki z bronią (przy ścianie); tarcze oparte o coś; strzały wbite w podłogę | stojak z włóczniami / okrągła tarcza na skrzyżowanych włóczniach, wysunięta | błyski na płytach |
| Kuźnia | sadza, pęknięcia rozżarzone od środka | palenisko na trójnogu z żarzącymi się węglami i poświatą (środek); kowadło na pniu; wiadra z wodą; sztaby; obcęgi | palenisko w ścianie / okap paleniska (co trzecie lico) z poświatą i iskrami, obcęgi i młot na kołkach | iskry |
| Więzienie | wilgotna słoma w rogach, kratka odpływu, łańcuch, kreski dni | snopki słomy; wiadra; kołki z łańcuchem i kajdanami; miski; szczur biegający wzdłuż ściany | okienko z kratą / dwa kółka z łańcuchami i kajdanami, kołyszą się, kapie z nich woda | krople z sufitu |
| Graciarnia | kurz, deski, monety | skrzynki (czasem dwie na sobie); beczki; butelki; stosy książek; worki | (zastąpione) / półka ze słojami, pudełkiem i butelką | kurz |
| Galeria | marmur w 2 odcieniach, czerwony chodnik ze złotą obwódką | mosiężne słupki z czerwoną liną po obu stronach chodnika; popiersia i wazy na postumentach; kandelabry z 3 świecami | (zastąpione) / złocona rama z grubością i portretem o błyszczących oczach, kinkiet ze świecą | snop światła z kurzem |
| Pokój dziecięcy | okrągły dywan, kredkowe bazgroły | stosy klocków; piłki; misie; bębenki; bączki (kręcą się) | rysunek dziecka / półeczka z klockami, piłką i misiem | nutki |

**Ściany komnat** (od 1.15, decyzja autora: "ściany też powinny być modyfikowane przez nowy styl, nie tylko podłoga: tekstura, kształt, wszystko"; `kindWalls`, `WALL_STYLE`, `drawKindBlock`, `kindFace`, `drawKindLips`). Każdy blok ściany dostaje styl komnaty, w którą patrzy: lico S styl pokoju na polu (x, y+1), lico E pokoju na (x+1, y) (także przez położoną ścianę: pole o 2 dalej), góra styl pierwszego pokoju z komnatą wśród 8 sąsiadów. Przypisanie liczone raz na mapę i zestaw komnat (`KW`, klucz: `fl.tiles` + id pokoi z ich komnatami). Blok z jakimkolwiek stylem rysowany jest osobno (po `flush` partii zwykłych bloków, więc kolejność głębokości zostaje), w tej kolejności: lica (kolor bazowy + tekstura), zwykła zaprawa na licach bez stylu, góra (kolor + tekstura góry, jeśli styl ją ma), jasne krawędzie, korona. Blok w ruchu (`drawBlockPop`) ma tylko kolory stylu. Ściany położone płasko (wargi) dostają kolor `lip` i teksturę góry w 22% krycia.

- **Tekstura lica**: płótno 128 × 218 px (szerokość pola × `WALL_H`) malowane raz na komnatę i wariant (2 warianty, wybór `tileHash(3x + 1|5, 7y + 2) mod 2`), w jednostkach pola, okresowe wzdłuż lica (elementy przy krawędzi rysowane też o ±1 pole dalej, a kolor kamienia zależy od jego położenia, więc sąsiednie bloki się łączą). Na koniec każdej: przyciemnienie przy podłodze (ostatnie 0,4 pola, do 0,32) i jasna górna krawędź. Kładzione `faceMap(..., 0, h)`; ściana niższa niż `WALL_H` (zapadająca się) pokazuje górną część tekstury. Lico E dostaje dodatkowo `rgba(0,0,0,0.3)`.
- **Korona** (kształt, rzut ekranu, od T ≥ 10 i tylko na stojącym bloku): zmienia sylwetkę ściany.

| Komnata | Lica S / E, góra, warga | Tekstura lica (wariant 0 / 1) | Korona |
|---|---|---|---|
| Goblinia nora | `#5a4630` / `#463624`, `#4f4030`, `#463a28` | ubita ziemia w falistych warstwach, kamyki, korzenie z góry, belka nadproża z gwoździami; słup stempla przy lewej krawędzi / zielony odcisk dłoni | 2 kopczyki ziemi z kępkami trawy, czasem sterczący korzeń |
| Leże pająków | `#2a2632` / `#1f1c26`, `#3a3644`, `#2c2834` | ciemne ciosy pod zwisającymi płachtami jedwabiu i nićmi; jaja przy ziemi / kokon na nici | co trzeci blok: 3 kule jaj na górze (namioty z nici usunięte po uwadze autora) |
| Jaskinia ogra | `#4a3a30` / `#36291f`, `#4e3e32`, `#3e3026` | surowa skała bez zaprawy (siatka 3 × 5 ścianek, każda inaczej cieniowana); dziura / rozmazana krew ze strużkami | 2 skalne zęby (ostrosłupy do 0,34 pola) |
| Nawiedzona sala | `#46505e` / `#323a46`, `#4c5462`, `#3a424e` | blade ciosy z fazą, szron z soplami u góry; ślepa ostrołukowa arkada z poświatą / długie pęknięcie | czasem przekrzywiony odłamany kamień, oszronione krawędzie |
| Gniazdo nietoperzy | `#2c2436` / `#1f1928`, `#342b3e`, `#28202f` | ciemna skała (3 × 4), dziury gniazd ze spływającym guanem, białe kropki; trzecia dziura z nietoperzem o czerwonych oczach | 3 skalne zęby do 0,4 pola |
| Kaplica czaszek | `#5a5244` / `#433d32`, `#6a6252` (tekstura: kości), `#4e483c` | ściana z rzędów czaszek i par długich kości w szarej zaprawie / jedna czaszka wypadła (pusta nisza) | czaszki stojące na krawędzi (1-2 na blok, co czwarty bez) |
| Zbrojownia | `#4a505a` / `#363b43`, `#565c66` (tekstura: płyty), `#3e434b` | ciosany kamień z fazą, dwa żelazne okucia z nitami; strzelnica w kształcie krzyża w wariancie 1 | blanki: na każdym bloku ząb 0,52 × 0,52 × 0,28, przerwy między blokami tworzą krenelaż |
| Kuźnia | `#5a2e22` / `#43221a`, `#2a2220`, `#33261f` | cegła (12 warstw), sadza od góry i smugi, żar przy podłodze; haki w wariancie 1. Na żywo: rozżarzone pęknięcie w dolnych cegłach, oddycha | co czwarty blok: komin z żarem w środku i dymem |
| Więzienie | `#3a3c34` / `#2a2c25`, `#44463e`, `#33352e` | wielkie bloki, zacieki wilgoci, mech i śluz w spoinach; kreski dni / żelazne kółko na płytce | 3 żelazne kolce na listwie wzdłuż góry |
| Graciarnia | `#5c4630` / `#463422`, `#5a4632` (tekstura: deski), `#463826` | pionowe deski ze słojami, szparami, gwoździami i sękami; przybita deska na ukos / blacha z nitami na dziurze | rupiecie: skrzynia, beczka albo stercząca deska (2 bloki na 3) |
| Galeria | `#6a1e28` / `#4e1620`, `#4a3a2e` (tekstura: ciemna ze złotą ramką), `#3e2a24` | czerwony adamaszek, złota listwa pod sufitem i w połowie, ciemna boazeria z płycinami, listwa przypodłogowa; jaśniejszy ślad po zdjętym obrazie | gzyms: płyta 1,08 × 1,08 × 0,08 ze złotą krawędzią nad całą ścianą, co piąty blok złota urna |
| Pokój dziecięcy | `#9a8090` / `#76626e`, `#685a64`, `#584c54` | wyblakła tapeta w różowo-miętowe pasy, kremowy fryz z gwiazdkami, groszki niżej, biała listwa; bazgroły kredką / oderwany róg tapety | zabawki: dwa klocki jeden na drugim albo piłka (2 na 5 bloków) |

**Komnata i efekt razem** (decyzja autora: "rodzaj i efekt powinny się nakładać, np. goblinia grota z mgłą, graficznie i mechanicznie"). Mechanicznie są niezależne (`R.rk`, `R.rt`). Na obrazie: podłoga komnaty, na niej nakładka efektu (mgła snuje się po słomie), na wierzchu poświaty rodziny. Efekt zostawia też ślad na licach ścian, które patrzą w jego pokój (`RT_WALL`, `rtWallWash`, wywoływane z `wallDressing` po ozdobach komnaty, więc leży na każdym materiale ściany; od T ≥ 8, ściana wyższa niż 0,3; współrzędne lica: u wzdłuż, v od góry 0..h):

| Efekt | Na ścianie |
|---|---|
| Mgła | gradient `rgba(206,214,230,0.42)` od podłogi do 1 pola w górę + kłąb przesuwający się wzdłuż ściany (0,05 pola/s) |
| Bagno | mokry pas do linii wody (0,32 ± 0,02 pola, falujący) `rgba(28,40,14,0.5)`, jasna linia wody, 3 kępki mchu ze śluzem |
| Grota | 3 falujące pasy odblasków wody `rgba(160,190,255,0.2)` |
| Krypta | fiolet `rgba(44,20,64,0.32)` na całym licu, co trzecie lico wydrapany krzyż |
| Sezam | złoty połysk `rgba(210,170,60,0.09)` i 2 migające błyski |
| Sanktuarium | ciepłe światło od podłogi do 1,2 pola, oddycha |
| Zębatki | co drugie lico: brązowa zębatka (r 0,2 pola) obracająca się przy podłodze |
| Głusza | ściana pochłania światło: gradient od 0,15 u góry do 0,42 przy podłodze |
| Lodownia | szron na całym licu, biały pas z soplami (co trzeci długi, 0,22-0,32 pola) u góry, czasem spadająca kropla |

Nazwa komnaty (znak + nazwa w kolorze komnaty) stoi przy lewym przednim rogu pokoju, nad nazwą efektu, gdy pokój ma oba (`drawRoomTypeNames`, od T ≥ 14). Znacznik narzędzia komnaty (`drawToolMarkers`) ma kolor i znak komnaty, a dopisek "zamiast: ..." mówi, co zastąpi.

Ikony kafelków komnat (`p8a_icons.js: k_*`): kamienny łuk wejścia (`#4a4c55`, wnętrze w ciemnym kolorze komnaty) z godłem: głowa goblina nad słomą, pająk w sieci, kość z pazurami i krwią, duch w kręgu, nietoperz na tle sierpa księżyca, czaszka między świecami, tarcza na mieczach, kowadło z młotem i iskrami, okienko z kratą i kajdany, półki z rupieciami, portret w złotej ramie na chodniku, klocki i nutka.

W Unity: podłogi jako dekale (sprite'y na warstwie podłogi), ozdoby ścian jako sprite'y na licach (w przestrzeni lica), życie jako małe systemy cząsteczek, poświata jako miękki sprite addytywny.

**1.26: trzy nowe komnaty** (`p7c_art.js`, dopisane do tych samych tabel: `WALL_STYLE`, podłogi, rekwizyty `PROP_SCATTER`, życie `KIND_LIFE2`, wypukłe kawałki ścian `KIND_WALL3D`): **Laboratorium** (zielono poplamiony ciosany kamień, płytki z kratką ściekową i rozlanymi plamami, stół ze szkłem, flaszki, zielony kocioł; unoszące się bąbelki; na ścianie półka z flaszkami, jedna bulgocze, miedziana rura), **Cmentarz** (omszały stary kamień, udeptana ziemia i trawa, kopiec grobu na środku, krzywe nagrobki i krzyże; mgła i błędne ogniki), **Wrota otchłani** (czarny bazalt ze świecącymi pęknięciami, pulsujący krąg run w podłodze, czerwone kosze z żarem, siarka; unoszące się iskry).

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

**1.26: nowe pułapki na mapie** (`p7c_art.js`, wpięte w `p7_draw.js`): płaskie na podłodze (`FLAT_ART` + `TOP_ART`, rysowane w płaszczyźnie podłogi jak sieć i zapadnia): Wnyki (otwarte żelazne szczęki, po złapaniu zamknięte), Plama oleju (czarna kałuża z przesuwającym się połyskiem), Zalewnia (krata pełna wody, przy odpaleniu woda rozchodzi się kręgami), Wyziewy (krata, z której bucha zielona chmura, przy działaniu duża nad 3×3), Przynęta (pod łupem matowa płyta z zębami na obrzeżu; bohaterowie widzą tylko łup). Ścienne (`WALL_ART`): Wahadło (ostrze na pręcie u góry ściany, przy odpaleniu przelatuje przez pokój), Runa piorunów (płyta z runą burzy, przy odpaleniu błyskawica). Drzwiowe i stojące (`ISO_ART`): Fałszywe przejście (zamurowane przejście z bladym migotaniem, miga, gdy kogoś oszuka), Kocioł smoły (kocioł nad przejściem, przechyla się przy wylewaniu), Dzwon żałobny (na meblu albo we własnej czarnej ramie). Posąg (mebel) jest od 1.26 bryłą 3D jak beczka i skrzynia (`drawStatue3D`: dwustopniowy cokół z pęknięciem i mchem, kamienny rycerz z mieczem ostrzem w dół, światło z lewej), a nie płaskim kamiennym sprite'em. Animacje odpalenia nowych pułapek i zdolności nowych potworów idą przez `trapFx` → `afx` jak stare (6.13b).

**1.26: zagrożenia na podłodze** (`drawHazards`, z `drawZones`): Topiel (strefa Zalewni) to płytka woda z ruchomymi zmarszczkami i błyskami, gasnąca w ostatnich 1,2 s; Wyziewy (`fl.clouds`) to zielona mgiełka przetaczająca się po polach (sprite `miasmaH`), rzednie w ostatniej sekundzie; Kolczatki (`fl.caltrops`) to trzy żelazne kolczatki na polu, a bomba sapera to mała beczułka z płonącym lontem. Reakcja zostawia na podłodze pierścień w kolorze reakcji (r 0,25 → 1,5, 0,45 s), obok napisu i iskier z `reaction()`.

### 6.6 Serce (`drawHeartGlow`, `drawHeartIso`, `drawHeartLabel`)

Na podłodze radialna poświata `rgba(216,67,79,0.42)` r 1,6 pola; przy kradzieży czerwony łuk postępu r 0,62 (`fl.party.steal / stealNeed`). Cokół 0,56×0,56×0,18 (`#3a2228`…). Nad nim serce (krzywa Béziera) na wysokości 0,62 ± 0,03 (kołysanie 1,6/s), bije: skala `1 + 0,07 max(0, sin 6t)` + 0,08 przy ranieniu bohaterów; kolor `#b8323f` (bez kryształów `#4a2a30`), odblask, obrys `#ff8a8a`, poświata. Kryształy krążą (r 0,48, 0,6 rad/s, wys. 0,42 ± 0,05): w sercu `#ff9ab0`, niesiony przez złodzieja `rgba(255,154,176,0.25)`, utracony `rgba(80,60,70,0.6)`; romb z białą krawędzią. Pod sercem "SERCE" (Jersey, `rgba(255,214,170,0.9)`, T ≥ 14).

### 6.7 Bohaterowie (pixel art, `paintFigure`, `drawHero`)

- **Sprite** 20×28 pikseli, stopy w dolnym rzędzie, zwrócony w prawo; w lewo = lustro. Malowany prostokątami całych pikseli z paletą `PAL` (dwa tony na materiał: jasny i cień): skóra `#c9a184`/`#9d7660`, stal `#9aa3b2`/`#646c7a` (blask `#c5ccd8`), drewno, złoto, kolory klas (wojownik niebieski tabard `#46628c`, złodziej zielony `#46613f`, kapłan kość `#d9d0b9`, mag fiolet `#5d4286`, bard morski `#2e7069`, barbarzyńca brąz `#8c5a33` + futro), kość, goblin, ogr, pająk, duch, cień. Po namalowaniu obrys 1 px `rgba(12,9,14,0.72)` (miękki, nie czarna kreska).
- **Sylwetki klas**: wojownik: hełm z czerwonym grzebieniem, tarcza z tyłu, miecz; złodziej: kaptur z cieniem na oczach, płaszcz, sztylet; kapłan: aureola, szata ze złotym pasem i krzyżem; mag: spiczasty kapelusz, broda, laska z kulą; bard: czapka z piórem, lutnia; barbarzyńca: hełm z rogami, goła pierś, futro, topór.
- **Klatki**: 4 klatki chodu (0 stoi, 1 i 3 nogi w rozkroku, ciało 1 px wyżej), 4 klatki na sekundę (`floor(realNow × 4 + id × 0,37) mod 4`), tylko gdy idzie w fali i gra nie stoi. Wariant "flash" (cały biały, obrys półbiały) przy trafieniu.
- **Rozmiar**: `figH = clamp(T × 1,1, 27, 50)` px (czempion ×1,18, bohater z przepowiedni ×1,3), rysowany w 1,15 × figH; skala całkowita w pikselach urządzenia `k = max(1, round(H × DPR / 28))`, bez wygładzania. Figura nigdy nie jest mniejsza niż 27 px. Stopy stoją w punkcie podłogi z `heroPos` (pozycja interpolowana między polami + przesunięcie wg id: (id mod 3 - 1) × 0,14 w x i połowa tego w y, żeby się nie nakładali).
- **Na ziemi**: cień (elipsa 0,95W × 0,32W, W = 0,36H), kropki ścieżki (6 następnych pól, kolor klasy, 45%), pierścienie: spowolniony `#a9c6ff`, na zwiadzie (1.16, fala) przerywany turkusowy `rgba(140,224,200,0.85)` [2, 3] zamiast pomarańczowego, sam (fala) przerywany pomarańczowy, bliski śmierci (< 30% HP) pulsujący czerwony, rozbrajający żółty łuk postępu.
- **Na figurze**: łowca skarbów = sakiewka `#8a6a2c` przy biodrze; boss = złota korona `#d9b44a` nad głową; przeklęty = fioletowa mgiełka; amulet = fioletowa poświata; buty = 3 linie pędu; płonący = migający płomyk (`#ff9a3c`/`#ffd27a`, `sin(realNow*20)`, kółko r = max(2,5, 0,07H) przed twarzą); od 1.17.1 krwawiący (`burnBy === 'spikes'`) = w tym samym miejscu czerwona kropka (`#d8434f`/`#ff6b6b`, `sin(realNow*12)`); talizman = pulsująca niebieska elipsa; tarcza wojownika = łuk `#7fb8ff` z przodu; na lodzie: przechylony, iskry lodu za nim; barbarzyńca rozbijający: drganie.
- **Nad głową**: paski HP (`#6fd38a` / `#ff6b6b` ≤ 35%), strach (`#b48cff`, pełny = ucieka), tarcza (`#7fb8ff`, nad HP), wiara kapłana (`#ffe9a8`); szerokość `max(0,56T, 0,62H)`, wysokość `max(2, 0,07T)`, tło `rgba(0,0,0,0.65)`; poziom (liczba) przy głowie w kolorze rangi z ciemnym obrysem; niesiony kryształ (różowy romb); sakwa ze złotem (kropka `#f2b94b` + liczba); uciekający "»"/"«" `#c3b2ff` drgające; pod stopami kwadraciki ekwipunku (do 6, kolory przedmiotów, przygaszone na odnowieniu, T ≥ 14); znak nad paskami: "!!" panika `#ff6b6b`, "?" zgubiony `#ffe066`, "..." narada, "z" odpoczynek.
- **Dopisane w 1.19-1.24** (`p7_draw.js: drawHero`, `fearBar`): pierścienie pod stopami: bursztynowy pod członkami drugiej grupy (1.19), szary łuk postępu przy przeszukiwaniu ciała (`state 'loot'`, 1.20), ciepłe koło 1,5 pola pod zapaloną latarnią (1.20), blady złoty pierścień `rgba(255,214,120,0.4)` pod strażnikiem, gdy jest niosący (1.22); kwadraciki ekwipunku: narzędzia w białej ramce, przeklęty fioletowy i pulsujący, zgaszona latarnia przygaszona, mały szary "▼" po prawej przy przeciążeniu (`burden < 1`) (1.20); Nemezis: złota obwódka żetonu na liście (1.23). **Pasek strachu** (1.24, P1-4; testerzy w ogóle nie widzieli strachu): osobny pasek pod paskiem HP, nigdy na nim: szerokość `max(0,56T, 0,62H, 22)` px, wysokość `max(3, 0,09T)`, ciemna oprawa `rgba(0,0,0,0.72)`, tło `rgba(79,63,143,0.6)`, wypełnienie `#b48cff`, przy 75%+ miga `#ece4ff` (bez "mniej ruchu"), znacznik na końcu (1,5 px `#ece4ff`) = wyjście; prostokąty pasków zapisywane co klatkę (`FEARR`), stuknięcie w pasek (z zapasem 6/8 px) liczy `fearUi.bar` i otwiera kartę bohatera (`fearBarAt`).
- **Animacje 1.09**: wejście w drzwiach (`inR`): skala `0,35 + 0,65 easeOutBack` i krycie w 0,36 s; ugięcie od ciosu (`flash` 0,12 s): szerzej 1 + 0,12q, niżej 1 - 0,1q; wyjście (`HERO_OUT` 0,7 s): **śmierć** przewrócenie o 90° (kąt ∝ t², t = k/0,5), mały podskok, zanik od 55%; **zapadnia** spłaszczenie (ky 1-k, kx 1-0,3k), krycie 1-0,6k; **wyjście z lochu** zanik.
- **Nowe klasy 1.26** (`FIG_ART` w `p7c_art.js`, ten sam zaczep w `paintFigure` co nowe potwory): paladyn (biały tabard ze złotym słońcem, hełm garnczkowy z pióropuszem, okrągła tarcza i buzdygan), tropiciel (zielony kaptur i płaszcz, kołczan, długi łuk), alchemik (skórzany fartuch, mosiężne gogle, torba butelek, zielona flaszka), kultysta (głęboko czerwona szata z kapturem, blada twarz w cieniu, świeca). Od 1.26 każda figura (bohaterowie i potwory) ma dodatkowy detal (`FIG_DETAIL`, `figShade`: światło od lewej na krawędzi, chłodny cień po prawej, kilka ręcznych dotknięć: kolczuga, fałdy, błyski), liczony raz na sprite.

### 6.7a Statusy na bohaterze (1.26, `p7c_art.js: heroStatusIcons, heroStatusUnder, heroStatusOver`)

Tylko w fali. **Ikonki**: rząd do 4 znaków 7×7 (`ART.status(id)`, skalowanych całkowicie w pikselach urządzenia, rozmiar z `clamp(0,42H, 11, 15)`) nad paskami, w kolejności ważności `ST_PRIO`: unieruchomienie, podpalenie, trucizna, oblanie olejem, mokry, naznaczony, uwiedziony, krwawienie, spowolnienie, zaraza, oszołomienie. Trucizna i zaraza pokazują liczbę stosów (gdy > 1) w prawym dolnym rogu znaku. **Pod figurą**: mokry = niebieskawa kałuża z rozchodzącym się kręgiem; oblany olejem = czarna błyszcząca kałuża z fioletowym odblaskiem; uwiedziony = cienka różowa nić od piersi do kusicielki (pulsuje). **Na figurze**: unieruchomiony albo oszołomiony = żelazna obręcz przy kostkach i krótki łańcuch w podłogę; mokry = trzy spadające krople; oblany = ciemna smuga z błyskiem. Nic nie jest tworzone co klatkę (bufor `ST_SHOW`). Karta bohatera wymienia statusy słowami (3.14).

W Unity: ikonki jako sprite'y z atlasu nad paskami, kałuże i obręcz jako sprite'y pod figurą i na niej.

### 6.8 Potwory (`ISO_ART`, `drawCorpse`)

Goblin, łucznik (szkielet z łukiem), szaman (zielony z piórami i laską), ogr (z maczugą), pająk (nisko, 8 cienkich nóg dorysowanych po obrysie): pixel art jak bohaterowie, wysokość `monH` (ogr 1,25T, goblin 0,8, łucznik 0,95, szaman 0,9, pająk 0,6) × 1,15, minimum 27 px × (pająk 0,75, goblin 0,85, ogr 1,2), patrzą na najbliższego bohatera (w promieniu 8 pól), przy ciosie klatka 1. Duch: blady, unosi się (0,35 ± 0,06), 72% krycia (95% przy odpaleniu), klatki 4/s, odwraca się. Cień: ciemna radialna mgła + zakapturzona postać z fioletowymi oczami, klatki 3/s. Nietoperze: 3 małe nietoperze (2 klatki skrzydeł, 10/s) krążące wokół pola. Pasek HP potwora `#9be37a`, trafienie = biały owal i ugięcie. Śmierć (1.09): trup przewraca się i znika w 0,75 s + szare drobiny.

**1.26**: 10 nowych potworów jako figury 20×28 (`FIG_ART`, malowane jak stare; wysokości `MON_H2`: szkielet 0,9, zombie 0,9, licz 1,0, chochlik 0,55, ogar 0,62, kusicielka 0,95, demon 1,35, saper 0,8, herszt 1,0, szczury 0,4): szkielet (kości, zardzewiały miecz i okrągła tarcza), zombie (szarozielona skóra, łachmany, ręce przed sobą), licz (szkielet w koronie i ciemnej szacie, zimne niebieskie oczy, laska z lodową kulą), chochlik (mały czerwony diabeł na skrzydłach nietoperza, nogi wiszą w powietrzu), ogar (piekielny pies: nisko, czarno-czerwony, grzywa ognia, płonące oczy), kusicielka (blada, skrzydła nietoperza, długie ciemne włosy, unosząca się czerwona suknia), demon otchłani (duży, rogaty, płonący, płomień w dłoni), saper (goblin w hełmie górnika, z torbą i zapaloną bombą), herszt (większy goblin w brązowej zbroi, czerwonym płaszczu, rogatym hełmie, z wielkim toporem), szczury (rój: tym więcej szczurów, im bardziej urósł, `it.grow` 0-3). Chochlik i kusicielka unoszą się jak duch (`ISO_ART.imp`, `ISO_ART.siren`).

**Powalony potwór (1.26, Odrodzenie)**: zamiast zniknięcia leży do końca fali (`drawDownedArt`): figura w przygaszonej szarości (`downSprite`, liczona raz na typ), obrócona o 90° na bok, z cieniem, krycie 0,85 (0,35 we mgle), nad głową trzy krążące gwiazdki, a w fali i podsumowaniu różowy napis "+1 ♥" (kosztuje 1 głodu w następnej fali). Wstaje w następnej budowie (sekcja 05, 5.14.6).

### 6.9 Dymki (`drawBubbles`)

Kto i kiedy mówi: sekcja 06. Prezentacja (1.08, styl reszty gry), zrzut `06_wave_play.png`:

- Rysowane w przestrzeni ekranu (czytelne przy każdym przybliżeniu), nie w budowie. Najwyżej 3 naraz, posortowane po priorytecie, bez powtórzeń tego samego tekstu.
- Font 500 12 px Alegreya Sans, interlinia 15 px, łamanie do szerokości 150 px, **najwyżej 2 linie** (reszta ucięta). Szerokość = tekst + 19 px, wysokość = linie × 15 + 9.
- Płyta `rgba(16,17,21,0.95)`, rogi 3 px, obramowanie 1 px `#464b53`, a dla ważnych (`prio ≥ 3`) mosiądz `#8a7034` i tekst `#e6cf94` zamiast `#e6e1d6`; światło na górnej krawędzi `rgba(210,220,235,0.07)`; pasek 3 px po lewej w kolorze klasy mówiącego; ogonek 6 px w schodkach (jak pixel art) pod mówiącym.
- Pozycja: nad głową i paskami, wyśrodkowany, w granicach mapy (4 px). Omija pudło checku, listę drużyny i wcześniejsze dymki (do 6 prób; od innych dymków i listy w górę, a od pudła checku, które od 1.13 jest u góry, w dół: pod pudło, jeśli tam się mieści). Gdy musiał wjechać wyżej o > 6 px, cienka nitka `rgba(120,126,136,0.55)` od ogonka do głowy.
- Wejście 0,16 s (wjeżdża 4 px w górę), zanik w ostatnich 0,3 s. Czas: spokojna kwestia `max(dur, readT)`, `readT = clamp(1,1 + 0,042 × długość, 1,6, 3,4)` s; okrzyk (`loud`) `dur` (domyślnie 1,9 s).
- **Głusza**: zamiast tekstu "…" (okrzyk "…!"), 1,4 s.

### 6.10 Unoszące się napisy i cząsteczki

- **Napisy** (`addFloat`, `drawFloats`): stoją na punkcie podłogi i unoszą się (0,9 pola/s × 0,9T), życie 1,2 s, krycie `life/0,5`; font Jersey `max(11, rozmiar × T / 52)`, obrys 3 px `rgba(10,11,13,0.9)`. Napis z tym samym znacznikiem w pobliżu (1,6 pola) zastępuje starszy; inne w tym samym miejscu przesuwają się o 0,34 w górę. Dopisane w 1.18-1.24 (kolor, rozmiar): "Zasadzka!" `#a7d060` 15, "Szybki montaż ×1,5" `#ffd27a` 13, "Strącone: X" `#c9d5e2` 12, "Zasypia" `#e6d2ff` 12 (1.18); "Rozłam" / "Obrażony/Obrażona" `#e8b26a` 13, "Bunt!" `#e8b26a` 14 (1.19); "Zabiera rzeczy X" `#c9c2b8` 12, "Od X: <przedmiot>" w kolorze przedmiotu 12, "Zgasła!" `#ffe08a` 13, "Bomba w plecaku!" `#ffb35c` 14, "Wypluwa N przedmiotów" `#d8434f` 13, "Opukana!" `#ffe066` 13 (1.20, 1.22); "Żałoba" / "Szok" `#c9b6e8` 14, "Zemsta!" `#ff7a6b` 15, "Dorasta" `#9fe0cf` 12, "Drwina" `#e8b26a` 13, "Kłótnia!" `#e8b26a` 14, "Zakład!" / "Wygrany zakład" `#ffd27a` 13/12, "Nie zostawię!" (1.21, 1.24); "Ostatni bastion!" `#ffd27a` 15, "Przekazuje kryształ" / "Niesie kryształ" `#ff9ab0` 14/13, "Poświęca się" `#ffd27a` 13 (1.22, 1.24); "Nagroda! +N Esencji" `#ffd27a` 17, "Nie ucieknie!" `#ffd27a` 13 (1.23); "Wyczerpany/Wyczerpana" `#c9c2d8` 12, "Ucieka" `#c9c2d8` 13, "Kryształ wraca!" `#ff7a86` 15, "Głód pochłonął kryształ!" `#ff6b6b` 18, "Kolce i tak kłują" `#ffd27a` 13, zielone "+N" leczenia szamana `#7fe08a` 13 (1.24). Przykłady: Groza nad bohaterem "+G" `#c3b2ff` 16 (sam: `#e6dcff` "+G sam!"), "KRYTYK!" / "SERIA: KRYTYK!" `#ff6b6b` 19, "Draśnięcie" `#8be38f` 14, "Pudło" `#a69bbb` 15, "Kryształ skradziony!" `#ff6b6b` 18, "Serce syte!" `#ff9aa4` 16, "Śmierć +E Esencji" `#ff7a86` 15, "Nowa ranga: X!" `#cbb0ff` 16, "Poziom N" `#ffb35c` 15, "+N Esencji" `#ff7a86` 14 (zdjęcie), "Przeniesione" `#d8d2c4` 13, "Serce ich odpycha!" `#ff9ab0` 15.
- **Cząsteczki** (`burst`, `drawParticles`): n kwadracików 0,08T na wysokości 0,35, prędkość (0,6..1,6) × 2,2 pola/s w losowym kierunku, tarcie ×0,9 na klatkę, życie 0,5-0,8 s, krycie `life × 2,2`. **Pierścienie** na podłodze: promień dąży do `maxR` (12/s), grubość `max(2, 0,08T)`. Przykłady: kurz `#9a9286` ×7 + pierścień `#b9b2a6` 0,15 → 0,85, 0,32 s; ulepszenie `#ffb35c` ×12 + pierścień 0,2 → 1,1, 0,4 s; śmierć bohatera `#d8434f` ×16; krytyk wybija przedmiot (kolor rzadkości ×10); śmierć potwora `#8a8378` ×8.

### 6.11 Orby (`p6_loop.js: gainEssence, grozaOrbs, boxOrbs`; `p7_draw.js: drawOrbs`)

Rysowane na `#fx` (pełny ekran, nad HUD i mapą, pod oknami). `ORB_MAX = 90` naraz.

| Orb | Skąd → dokąd | Liczba | Opóźnienia / czas lotu | Kolory (smuga, poświata, rdzeń) |
|---|---|---|---|---|
| groza | bohater (`heroScreen`, ±6 px) → pudełko Groza | `min(5, floor(akum/0,08))`, każdy niesie akum/n | -0,06 s × i; 0,45-0,65 s | `rgba(170,150,245,0.55)`, `rgba(160,135,245,0.42)`, `#ece6ff` |
| greed | pole łupu (z 0,4) → Chciwość | `clamp(round(g/0,04), 1, 6)` | -0,07 s × i; 0,5-0,7 s | `rgba(236,200,120,0.6)`, `rgba(240,190,80,0.4)`, `#fff4d6` |
| combo | pole pułapki → Combo | 3 na stopień (+0,25) | jw. | `rgba(169,212,218,0.6)`, `rgba(140,210,222,0.4)`, `#effcff` |
| score | losowy punkt pudełka Esencja → duża liczba | `min(30, max(1, round(E/0,4)))` | -0,035 s × i - los 0,05; 0,5-0,7 s | `rgba(255,90,100,0.38)`, `rgba(255,70,85,0.32)`, `#ffe0e3` |
| heart | pudełko Esencja → ♥ | `min(24, max(1, round(porcja/0,6)))`; od 1.16.1 w trakcie fali porcjami `fl.heartOrb` >= 0,6 (zwykle 1 orb, `heartLive`), a przy wypłacie dopłata combo | jw. | jak score |

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
| wolne miejsce dla wybranego kafelka | przerywana ramka `rgba(242,185,75,0.75)` (wcięcie 0,12, grubość `max(1, 0,04T)`, kreska 0,12T/0,1T); na stojącej ścianie rysowana na jej licu; od 1.24 na ściętej (niskiej, `wallH <= 0,2`) ścianie od frontu na wierzchu jej wargi razem ze znakami ścian (po ścianach), z małym trójkątem-strzałką w stronę pokoju, w który pułapka strzeli (pokój pierwszego sąsiada podłogi, jak przy wysokich ścianach, `slotRoom`); do 1.23 ramka niskiej ściany leżała na podłodze pod wargą i była przez nią zasłonięta, więc żadna niska ściana jej nie pokazywała (reguły stawiania były dobre: 48-52 miejsc przy niskich ścianach wobec 33-37 przy wysokich w lochu 4 pokoi). Znaczniki niesienia i pierścień przewodnika idą tą samą drogą. Zrzuty `b_walls_near.png`, `b_walls_placed.png` | `drawSlots`, `markTile`, `markRing`, `drawWallMarks` |
| element w ręce | pulsująca fioletowa ramka `rgba(195,178,255, 0,6±0,4)` (grubość `max(2, 0,08T)`), cele przerywane `rgba(195,178,255,0.8)` | `drawCarry` |
| koszt ulepszenia | czerwona pigułka `rgba(255,85,98,0.95)` z "↑c" (za mało: szara) nad elementem w ręce | `costTag` |
| przytrzymanie | od 15% czasu: pierścień r 0,62T, tło `rgba(16,17,20,0.7)`, wypełnia się na czerwono `#ff6b6b`; napis "zdejmij" `#ffd0d0` | `drawHold`, `drawHoldLabel` |
| narzędzie (Loch) | krążki r `max(10, 0,42T)`: złote (`+` kopanie, `↔` przejście, `▲` rozbudowa z ceną pod spodem), czerwone (wyburz, zdejmij typ), w kolorze typu pokoju z glifem, szare gdy za drogo; "zamiast: X". 1.26.1 Ukryte przejście: na środkowym kafelku korytarza; jawne przejście złoty (szary, gdy za drogo) krążek z "?"; ukryte czerwony krążek z "×" (zdejmij maskę, za darmo), a ukryte, o którym bohaterowie wiedzą (`known`), czerwony z "?" (zamaskuj ponownie za 6) | `drawToolMarkers` |
| wyłom | pulsujący czerwony pierścień + "WYŁOM" i "stuknij: załataj (20)" (od 1.26 15); po otwarciu arkusza przez 4 s 2 fale pierścieni co 1,2 s (r 0,8 → 3) | `drawBreachMark`, `drawBreachLabel` |
| cel samouczka | pulsujący złoty pierścień r 0,6 ± 0,1 | `drawTutTarget` |
| etykieta pokoju | "×1,7" (mnożnik głębokości) przy przednim prawym rogu pokoju, w budowie także "zajęte/pojemność" (czerwone `#ff9a9a` gdy pełny); od 1.27 przy pojemności najwyżej 6 zamiast liczb kropki: ● za każde zajęte miejsce, ○ za wolne (np. "×1,7  ●●○"), powyżej 6 dalej "n/pojemność"; pokoje skrajne `rgba(255,170,140,0.95)`; po angielsku "×1.7" | `drawRoomLabels` |

### 6.13a Podgląd następnej fali w budowie (1.24, P1-1; `p7_draw.js: drawPreview, PV, fitTxt`)

Testerzy nie wiedzieli, kto przyjdzie ("ściana fali 5"). Drużyna była już zrobiona przed budową (`run.next`), więc nic się nie przesunęło: budowa rysuje ją u góry mapy bez stuknięcia, w miejscu zwiniętych chipów: chipy (krążek co 25 px: klasa, poziom, korona czempiona albo bohatera z przepowiedni, złoty pierścień Nemezis, zielony krzyżyk uzdrowiciela: kapłan, bard), a obok (na wąskim ekranie pod nimi) dwie linie: F1 600 11 px "Fala N/10: X bohaterów, poz. a-b", F2 500 10,5 px "✚ leczy: kapłanka, bard · czempion (poz. 9) · chciwy, ostrożna" (uzdrowiciele pierwsi, potem boss "z przepowiedni"/"czempion" z poziomem, potem charaktery bez powtórzeń), ucinane z wielokropkiem (`fitTxt`). Wiersz ma 34 px, gdy słowa mieszczą się obok (pierwsza wersja 58 px zasłaniała mapę). Teksty liczone raz na drużynę i szerokość (`PV`). Stuknięcie otwiera pełną listę jak dotąd i liczy się do `previewOpened` (`notePreview`). Sprawdzone na 10 falach: kolejka i wchodzący bohaterowie to podgląd.

**Omen (1.26, `drawPreview` w `p7_draw.js`)**: gdy fala ma omen, pod podglądem (i pod znaczkiem wyłomu, jeśli jest) stoi plakietka "Omen: <nazwa>" (fiolet `rgba(70,36,96,0.88)`, ramka `#a97ad6`, tekst `#e6d2ff` 700 10 px, wysokość 18 px), a w rozwiniętej liście nagłówek ma " · omen: <nazwa>". Przy Mgle wojny (bez karty Anatomia ofiar) podglądu nie ma: zamiast niego ramka 196×36 z fioletową obwódką "Fala N/10: k bohaterów w mgle" i "Omen: Mgła wojny (klasy i poziomy ukryte)", a stuknięcie nic nie otwiera. Na starcie fali z omenem nad wejściem unosi się napis "Omen: <nazwa>" (`#d9b8ff`).

### 6.13b Animacje bohaterów i pułapek (1.24, część B; `p7_draw.js: AFX, AFX_N, AFX_DUR, afx, heroFx, trapFx, TRAP_FX, drawAfx`)

Pula 64 miejsc używanych po kolei (najstarsze ustępuje, bez alokacji w pętli klatki), rysowanych pionowo po tym, co stoi, a przed znakami (tylko w fali), długość 0,35-1,3 s czasu rzeczywistego (`AFX_DUR`), bez `Math.random`, żadnej przy "mniej ruchu" (`AFXN` liczy uruchomione, dla testów). Symulacja nietknięta (te same fale z ziarnem dają identyczny wynik przed i po).

| Rodzaj (`AFX_DUR`, s) | Kiedy | Wygląd |
|---|---|---|
| `shield` 0,6 | tarcza wojownika (przygotowanie, znana pułapka) | uniesiona tarcza i pierścień |
| `heal` 0,9 | leczenie kapłana | złote pierścienie i krzyżyki na każdym leczonym |
| `ward` 0,8 | oczyszczenie, zdjęta klątwa, bariera | zimne pierścienie, kopuła |
| `exorcism` 0,8 | egzorcyzm | słup światła na duchu |
| `fireball` 0,5 | kula ognia maga | pocisk ze smugą i wybuch |
| `jam` 0,9 | zakłócenie maga | fioletowy puls na każdej pułapce pokoju |
| `notes` 1,3 | pieśń i wołanie barda; pozytywka | nuty w górę |
| `rage` 0,8, `smash` 0,5 | furia i cios barbarzyńcy | czerwona aura; łuk topora i kurz przy celu |
| `sparks` 0,5 | rozbrajanie złodzieja (błogosławieństwo: światło) | iskry |
| `dodge` 0,45 | unik | powidok |
| `potion` 0,9, `throw` 0,55 | mikstura (podana: rzucona) | fiolka nad głową, zielone iskry; łuk rzutu |
| `charm` 0,7, `boots` 0,6 | talizman, amulet; buty | żeton w górę i pierścień; kurz i linia skrzydeł |
| `light` 1,1, `pry` 0,7 | latarnia ratuje przed mgłą albo oświetla drogę; łom przy kracie albo klatce | koło światła; dźwignia i iskry |
| bomba | rzut bomby | łuk lotu i wybuch |
| `spikes` 0,45, `arrow` 0,35, `fire` 0,6, `gate` 0,45, `trapdoor` 0,6, `cage` 0,5, `web` 0,55, `powder` 0,6, `mimic` 0,45, `glare` 0,8 (portret), `gaze` 0,7 (oczy), `flash` 0,6 (lustro), `mist` 0,9 (trumna), `rattle` 0,55 (kości), `notes` (pozytywka), `creak` 0,6 | koniec każdego odpalenia (`trapFx(it, area)`) | kolce w górę; strzały lecą wzdłuż swojej linii (do mebla albo ściany); strumień ognia nad polami; opadające kraty; otwarta zapadnia; spadająca klatka; strzał sieci; błysk i dym prochu; szczęki mimika; czerwone oczy i promienie portretu; promień spojrzenia oczu; błysk lustra; mgła trumny; grzechot kości; nuty; łuki dźwięku zawiasów. Dawne pozy (`it.anim`) zostają |

W 6 falach organicznych (lochy fal 4-8 z wieloma typami) startuje 20+ rodzajów; każda umiejętność i każdy typ pułapki sprawdzone osobno. Zrzuty `b_fx_heroes.png`, `b_fx_traps.png`. W Unity: pula efektów (VFX Graph albo sprite'y) wyzwalana zdarzeniami symulacji, czasy z tabeli.

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
| Ikony kafelków (65) | SVG z `p8a_icons.js: ICONS` przez pakiet Vector Graphics albo zrasteryzowane do PNG 64×64 |
| Ikony klas (6 + sakiewka), ekwipunku (7), kłódka, menu, cofnij | ścieżki `CLASS_ICON` (`p1_config.js`), `ITEM_GLYPH` (`p8b_ui.js`), `LOCK`, SVG w `p0b_body.html` |
| Ziarno UI | tekstura szumu 180×180 kafelkowana (alfa 0,1) |
| Fonty | Grenze Gotisch, Alegreya Sans, Jersey 10 (TMP) |
| Skill check, dymki, orby, paski, plakietki | UI rysowane w kodzie (siatka, `LineRenderer`/UI Toolkit `Painter2D`) wg 6.9-6.12 |
| 1.26: sprite'y 4 nowych klas i 10 nowych potworów (20×28), szare sprite'y powalonych | `FIG_ART`, `FIG_DETAIL`, `downSprite` (`p7c_art.js`) tym samym skryptem co `paintFigure` |
| 1.26: obrazki z `p7c_art.js` (sceny kafelków 72×36, ilustracje kart 72×48, znaki statusów 7×7, runy 32×32, herby 24×24, omeny 96×48) | wygenerować PNG skryptem edytorowym z tych samych malarzy (paleta 32 kolorów, dither 4×4) albo wyeksportować z prototypu (`ART.tileCanvas`, `ART.cardCanvas`, `ART.runeCanvas`, `ART.familyCanvas`, `ART.omenCanvas`, `ART.status`) i spakować w atlas; 6.14a |
| 1.26: nowe pułapki na mapie, posąg 3D, zagrożenia na podłodze, komnaty | jak stare bryły i dekale, wg `TOP_ART`, `WALL_ART`, `ISO_ART`, `drawStatue3D`, `drawHazards`, `KIND_LIFE2`, `KIND_WALL3D` |

### 6.14a Grafika malowana w kodzie (`p7c_art.js`, 1.26)

Nowy plik (decyzja autora 25.10: malarskie ilustracje pixel art dla kart i nowych systemów oraz poziome scenki na kafelkach paska zamiast jednej ikony, wszystko z kodu). Obiekt `ART` (IIFE):

- **Technika**: każdy obrazek malowany zwykłymi kształtami canvas w docelowym rozmiarze (`pic(w, h, seed)`: kształty, światło addytywne, chłodny cień, "ręcznie kładzione" plamki 1-2 px, figura gry, napis cyfrowy), oświetlony ciepłą świecą i ochłodzony w cieniach, potem przyciągnięty do jednej palety 32 kolorów (8 szarości kamienia, 4 chłodne błękity, 4 drewna, złoto, ogień, krew, fiolet grozy, zieleń goblina, skóra; `HEX`) z lekkim ditheringiem uporządkowanym 4×4 (`BAYER`, `quantize`; alfa do 0 albo 1). Losowość z ziarnem (`rnd`, `hash`), więc ten sam obrazek za każdym razem.
- **Pamięć**: obrazek powstaje raz przy pierwszym użyciu (`keep` trzyma canvas dla mapy, `url` data URL dla strony). Wyświetlany bez wygładzania (`image-rendering: pixelated`), jeden piksel obrazka = jeden piksel CSS na kafelku.
- **Części**: sceny (tła: ściana, podłoga, drzwi, pochodnia), malarze elementów `EL` (jeden na element, używany i przez kafelki, i przez karty), pokoje `ROOMS` (efekty i komnaty jako małe pokoje), kafelki paska (`paintTile`, `ART.tile`/`tileCanvas`, 72×36, `STAGE_OF`, `TILE_K` skala rzeczy), ilustracje kart (`paintCard`, `ART.card`/`cardCanvas`/`cardImg`, 72×48: tło według grupy karty, motyw = element albo godło `EMB`, odznaka działania: w górę, ×2, minus, pętla...; `ART.isHeart` dla grupy Serce), znaki 7×7 (`GLYPH`, `badge`, `ART.status`/`statusUrl`), runy rodów 32×32 (`ART.rune`), herby rodzin 24×24 (`ART.family`), omeny 96×48 (`ART.omen`), figury nowych potworów i klas (`FIG_ART`), detal figur (`FIG_DETAIL`), nowe pułapki na mapie (`TOP_ART`, `FLAT_ART`, `WALL_ART`, `ISO_ART.*`), posąg (`drawStatue3D`), statusy na bohaterze (6.7a), zagrożenia (`drawHazards`), powaleni (`drawDownedArt`), pierścień reakcji (owija `reaction`), komnaty 1.26 (6.2a), animacje odpalenia nowych elementów (dopisane do `trapFx`/`afx`).
- **Użycie w UI** (`p8b_ui.js`): `ART.has(t)` (czy element ma scenkę), `ART.tile` (scenka na kafelku elementu w pasku, ładowana przy pierwszym pokazaniu), `ART.cardImg` (oferty, Dar serca, karta talii, kafelek karty w zakładce Talia), `ART.rune` (Runa rodu w sklepie), `ART.omen` (ramka omenu). `ART.family` (herby) jest gotowe, ale UI go nie używa.
- **Wpięcie w `p7_draw.js`**: `flatItem` → `FLAT_ART`/`TOP_ART`, `drawZones` → `drawHazards`, ściany → `WALL_ART`, mebel posąg → `drawStatue3D`, `drawDowned`, `monH` → `MON_H2`, życie komnat → `KIND_LIFE2`, `roomCap` (miejsca w pokoju serca), `paintFigure` → `FIG_ART`, `figShade`, `drawHero` → `heroStatusUnder`/`heroStatusOver`/`heroStatusIcons`.

W Unity najprościej wygenerować wszystkie te obrazki raz (w prototypie albo skryptem C# przepisanym z malarzy) i trzymać jako PNG w atlasie (filtr Point); malowanie w runtime nie jest potrzebne, bo obrazki nie zależą od stanu gry (poza figurami, które i tak są sprite'ami).

### 6.14b Ukryte przejście i ogar na tropie (1.26.1; `p7_draw.js: drawSecret, drawWorld, itemAnchor, drawItemUp`; `p7c_art.js: EL.secret`)

- **Drzwi ukrytego przejścia** (`drawSecret(d, T)`): każde drzwi z `d.secret`, które gracz widzi (`seen`), trafiają do listy brył sortowanej głębią (`SO`, rodzaj 6, klucz `d.x + d.y + 1`), więc chowają się za wyższymi rzeczami jak ściany.
  - Nieodkryte: blok kamienia 1×1 na polu drzwi, wysokości najwyższej z 4 sąsiednich ścian (`wallH`, gdy 0, to 1), kolory góra `#4a4e57`, przód `#33363d`, bok `#2a2d33`; ciemna rysa (łamana z 3 punktów, `rgba(20,18,24,0.7)`) na przednim licu; przerywany fioletowy kontur przedniego lica `rgba(185,150,255, a)` (kreska `max(2, 0,06T)` / przerwa `max(2, 0,05T)`, grubość `max(1, 0,03T)`), `a` = 0,85 w budowie i 0,45 w fali; przy `T >= 12` znak "?" na środku lica (`rgba(205,180,255, 0,95 / 0,55)`, Alegreya Sans 700, `max(9, round(0,38T))` px). Kontur i "?" są wskazówką dla gracza; bohaterowie widzą tu zwykłą ścianę.
  - Odkryte (`fl.secretFound`): 4 małe bryłki gruzu (`isoBox`, `#5a5e66` / `#3a3d44` / `#2e3036`) na polu drzwi.
  - Przy odkryciu: napis "Ukryte przejście!" (`#c9a8ff`) i iskry `#b9a3e0` nad oboma końcami (`secretFind`).
- **Scenka kafelka** `EL.secret` (pasek budowy, 72×36): odcinek muru z cegieł z jednym blokiem lekko wysuniętym, przerywana fioletowa ramka wokół niego i "?" w rogu.
- **Ogar na tropie**: potwór z `it.walking` rysuje się i ma kotwicę (`itemAnchor`) w `gx, gy` jak unoszący się potwór, ale na wysokości 0,55 (unoszące się 0,75); po dobiegnięciu wraca na środek swojego (nowego) pola. Napisy "Ogar węszy krew!" i "Ogar na tropie!" (`#ff7a5a`).

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

## 8. Samouczek i nauka (1.12; od 1.24 w jednym runie)

Od 1.24 (część B, decyzja autora: odsłanianie nowych rzeczy w jednym runie) etapy otwierają się z falami pierwszego runu (`ONB_WAVE = [0, 1, 3, 5, 7]`, sekcja 03, 5.3), a przewodnik jest krótszy (8.3a). Opis 8.1-8.3 to stan 1.12-1.23; karty ważnych chwil, coach i pamięć urządzenia bez zmian.

### 8.1 Etapy pierwszych runów (`ONB_STAGES`, `onbStage`, `onbDone`; stan do 1.23)

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
| 8 | novice | 1 fala | nadchodzą nowicjusze, równanie (podświetla `#h-eq`) | "Rozumiem" (od 1.15.1; wcześniej chowała się po 9 s, a gra szła); krok czeka niewidoczny, pierwszy check przeskakuje do kroku 9 |
| 9 | check | 1 fala | stuknij w mapę, gdy koralik w obwódce/pełnym polu; od 1.15.1 świat stoi, dopóki check czeka (`tutCheckHold`: `timeScale` 0 zamiast `CHECK_SLOW`), napis "Gra czeka na Twój ruch" | odpowiedź na check albo 2 s bez checku |
| 10 | herocard | 1 fala | stuknij bohatera albo listę | otwarta karta bohatera; "Pomiń krok" |
| 11 | ff | 1 fala | przytrzymaj palec (przyspieszenie), ▶▶ spokój; od 1.15.1 przytrzymanie działa także przy pauzie przewodnika (`tutHoldOk`) i ją kończy: gra rusza od razu przyspieszona | użyte przyspieszenie; "Pomiń krok" |
| 12 | loot | 2 budowa | serce chce Esencji, łup podbija chciwość: postaw Monety (otwiera Łup; dopłaca Esencję do ceny monet) | postawiony łup (nie po bohaterach); "Pomiń krok" |
| 13 | upgrade | 2 budowa | dwa stuknięcia w pułapkę w kółku (`tutUpTarget`, dopłaca Esencję do ulepszenia) | ulepszenie; "Pomiń krok" |
| 14 | deck | 2 budowa | karta ze sklepu jest w talii (otwiera Talię) | "Dalej" |
| 15 | dig | 3 budowa | kop nowe pokoje (zakładka Loch, Nowy pokój) | użyte narzędzie Loch (`tutEvent('tool')`); "Pomiń krok" |
| 16 | end | 3 budowa | koniec pierwszego runu, kolejne runy dołożą resztę | "Gramy!" |

Mechanika: `tutTick` sprawdza `done` co klatkę (krok z `next` czeka na przycisk); `tutEvent('check')` przy pierwszym checku skacze z "novice" do "check" i pokazuje kartę `check`; `tutOnBuild` na starcie budowy przeskakuje do pierwszego kroku tej fali (co zostało z poprzedniej, przepada); `tutEnd` ("Zakończ" albo ostatni krok) ustawia `run.tut = -1`, zapisuje `yatd-coach = 1` i wznawia grę. Log kroków (`run.tutLog`: najdalszy, pominięte, jak się skończył) idzie do statystyk (tylko prototyp).

**Pauza przewodnika** (od 1.15.1, decyzja autora: "każda porada powinna pauzować grę dopóki gracz nie zatwierdzi lub nie zrealizuje polecenia"; `tutPausedIt`): każdy krok fali (`raid: true`) pokazany w fali zatrzymuje grę (`setPaused(true, true)`) z napisem "Gra stoi" zamiast "Samouczek N/16". Wyjątek: krok `check`, przy którym świat stoi sam, dopóki check czeka (koralik biegnie w czasie rzeczywistym). Grę puszcza: "Rozumiem" (krok z `ack`: novice), wykonanie polecenia (stuknięcie bohatera otwiera kartę, która przy zamknięciu wznawia grę; przytrzymanie palca w kroku `ff`), "Pomiń krok" (następny krok fali znów zatrzymuje, krok budowy puszcza), "Zakończ" (`tutEnd`). Zatwierdzony krok (`acked`) czeka niewidoczny i nie zatrzymuje gry ponownie po zamknięciu karty `TUT_POP`.

**Karta samouczka w sklepie** (od 1.15.1, `#shop-tip`, `.shoptip`, tylko `run.tutorial`): kartka w stylu karty ważnej chwili (lewa krawędź `--gold-hi`), nałożona na górę sklepu (absolutnie, 10 px od krawędzi karty, z-index 6): "Po każdej fali jedną kartę bierzesz tu za darmo (Weź za darmo), a kolejne kupisz za Esencję. Wzięta karta trafia do talii na dole i działa do końca runu. Odblokowanie (fioletowy pasek) daje nową pułapkę albo potwora na stałe." + "Samouczek" + "Rozumiem". Zostaje, aż gracz stuknie Rozumiem albo weźmie kartę (`run.shopTipDone`). Do 1.15 był to komunikat `m.msg` nad przyciskiem, który gasł po ok. 2,2 s (animacja `shopmsg` 2,8 s) i zasłaniał talię.

### 8.3a Przewodnik i etapy od 1.24 (`TUT`, `startGuided`, `onbAdvance`, `renderStart`, `tutWayOnly`, `tutSpikeSure`, `tutLogOf`)

**Ekran startowy**: przy `onbStage() <= 1` przyciski "Samouczek" ("Pierwszy run z przewodnikiem") albo, gdy przewodnik był już ukończony, "Nowy run" ("Pierwszy run: gra odsłania się z falami"), oraz "Pomiń samouczek" ("Cała gra od razu"); inaczej "Nowy run" ("Pełna gra") i "Samouczek" ("Nauka od nowa: run z przewodnikiem, gra odsłania się z falami": `setOnb(1)`, kasuje `yatd-coach` i `yatd-pops`). Wszystkie przez `withName` (pytanie o imię w wersji WWW). `startGuided()` = zawsze etap 1 (`newRun(!coachDone(), 1)`, `run.guided = true`).

**Etapy w runie**: fale 1-2 etap 1, 3-4 etap 2 ("Nowe: strach"), 5-6 etap 3 ("Nowe: gildia i loch"), od 7 pełna gra; karta etapu przed sklepem budowy tej fali (3.20a); fala 7 albo koniec runu nauki po fali 5 ustawia `yatd-onb` 5. Wyszarzone podzakładki mówią "od fali 3" (`subWhen`). Karty ważnych chwil (8.4) działają w runie nauki jak dotąd.

**Kroki (`TUT`, nadal 16, tylko jedno stawianie wymagane)**:

| # | id | Fala / faza | Co mówi i o co prosi | Zakończenie |
|---|---|---|---|---|
| 1 | intro | 1 budowa | loch postawił 2 pułapki blisko serca, same nie wystarczą | "Dalej" |
| 2 | spikes | 1 budowa | wybierz Kolce (zakładka Pułapki) | Kolce wybrane albo postawione |
| 3 | place | 1 budowa | postaw na trasie, pole z pulsującym kółkiem (`tutPathTile(0,25)`) albo inne pole na ich drodze; poza trasą (od ćwierci najkrótszej ścieżki) odmowa "Na trasie: pole z kółkiem" (`tutWayOnly`, `tutFlags.offWay`) | więcej kolców |
| 4 | hold | 1 budowa | nowy: przytrzymaj palec na kafelku Strzały: rozwinie się opis (podświetla `#item-arrows`) | opis pokazany (`tutFlags.tipN`); "Pomiń krok" |
| 5 | move | 1 budowa | opcjonalny: stuknij pułapkę w kółku, potem pole z przerywaną ramką; z pułapką w ręce tekst zmienia się na "Masz ją w ręce: stuknij pole z przerywaną ramką, żeby ją tam postawić." | przeniesienie; "Pomiń krok" |
| 6 | spend | 1 budowa | opcjonalny: "Masz jeszcze N Esencji…", strzały także na niską ścianę od frontu (strzałka pokazuje pokój) | jak dotąd; "Pomiń krok" |
| 7 | go | 1 budowa | wypuść falę; ▲ Budowa zatrzymuje grę | start fali; bez pytania o niewydaną Esencję |
| 8-11 | novice, check, herocard, ff | 1 fala | bez zmian | bez zmian |
| 12 | loot | 2 budowa | mówi o łupie (zakładka Łup) | "Dalej" (do 1.23: postaw Monety) |
| 13 | upgrade | 2 budowa | opcjonalny: dwa stuknięcia w element w kółku | ulepszenie; "Pomiń krok" |
| 14 | deck | 2 budowa | karta w talii; od 1.24 także "druga kopia łączy się z pierwszą w złotą kartę ★" | "Dalej" |
| 15 | dig | 3 budowa | mówi o kopaniu (zakładka Loch) | "Dalej" (do 1.23: wykop pokój) |
| 16 | end | 3 budowa | "Ten run odsłoni resztę gry z falami: teraz straszenie, od fali 5 gildię z budowlami i typy pokoi, od fali 7 ciała i fobie bohaterów, powracających i wyłom. Kolejne runy to od razu cała gra." | "Gramy!" |

**1.27**: teksty kroków przepisane krócej, zwykle jedna myśl na krok (kroki, kolejność i warunki zakończenia bez zmian). Przykłady: intro "To Twój loch. Bohaterowie przyjdą falami, żeby ukraść kryształy z serca (ostatni pokój). Dwie pułapki już stoją, ale to za mało."; spikes "Wybierz Kolce na pasku na dole."; novice "Nadchodzą nowicjusze. Każda rana daje Grozę, a linia u góry zamienia Grozę w Esencję." (wskazuje równanie, które od 1.27 jest widoczne tylko w fali, a ten krok jest w fali); deck bez zdania o łączeniu w ★; end "To koniec samouczka. Resztę gry poznasz w tym runie, fala po fali. Powodzenia!". Kilka kroków dalej ma liczbę (koszt ulepszenia, Esencja do wydania w `spend`).

Usunięty krok `arrows` (postaw strzały na ścianie). Decyzja o przytrzymaniu: "przytrzymaj palec na kafelku" dotyczy kafelka paska (już otwierał opis po 380 ms bez ruchu, `showTip`); na mapie przytrzymanie ma swoje zadania (budowa: zdjęcie po 0,55 s, fala: przyspieszenie po 0,28 s), więc osobne przytrzymanie "informacyjne" na mapie by z nimi walczyło. W pierwszej fali kolce przewodnika kłują przynajmniej raz (sekcja 05, 5.9.12). Dziennik: `tut.stepIds` i `tut.stepTimes` (sekundy na każdym kroku) w dokumencie runu (sekcja 07).

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
| heartLv (1.26) | serce wchodzi na nowy poziom w fali (`heartLevelUp`) | Danina 30% w Nasycenie, poziom = darmowa karta Dar serca, 2/4/6 miejsce w talii, 3/5/7 możliwy Odrost |
| heartCry (1.26) | pierwszy krzyk serca w fali od fali 2 (`p6_loop.js: step`, `fl.cryShown`) | wyrywający traci 6% odwagi na sekundę, kradzież trwa 5 s |
| status (1.26) | pierwszy status w fali (`setStatus`, `fl.statusShown`) | ikonka nad bohaterem, przytrzymaj kafelek, statusy łączą się w reakcje |
| reaction (1.26) | pierwsza reakcja w fali (`reaction`, `fl.reactShown`) | olej + ogień = Pożar, trucizna + ogień = Detonacja, woda + porażenie = Porażenie, ogień + woda = Para |
| revive (1.26) | pierwszy powalony potwór (nie tymczasowy, `monsterDown`) | wstanie w następnej budowie, +1 głodu za każdego |
| cultist (1.26) | kultysta zaczyna pić przy sercu (`p5_ai.js`, `fl.cultShown`) | nie kradnie, pije Esencję serca; zabij albo dokarm |
| omen (1.26) | **nigdzie nie wołane** (martwy wpis; omen wyjaśnia wieść z karczmy, 3.19a) | zasada specjalna fali |

**1.27**: treść kart przepisana (zawsze okrzyk i 2-3 krótkie zdania, bez list; kolumna "Treść" wyżej to skrót dawnych tekstów). Przykłady: check "Skill check! Stuknij w mapę, gdy koralik wjedzie w obwódkę. Pełne pole to krytyk. Pułapka zapamięta wynik na kolejne fale."; status "Status! Ikonka nad bohaterem to stan, np. Spowolniony albo Podpalony. Co nakłada pułapka, zobaczysz w jej opisie."; reaction "Reakcja! Status i pasujące obrażenia dały coś mocniejszego, np. olej i ogień to Pożar. Reakcja daje Grozę i krok combo." (bez listy czterech reakcji); heartLv bez liczb poziomów. Liczby zostały w heartCry (kradzież trwa 5 s) i revive (+1 Esencji głodu).

Od 1.26 karty z `TUT_NEW` (wszystkie nowe wyżej) pokazują się w **każdym** runie, nie tylko w nauce (warunek `run.guided || samouczek || TUT_NEW[id]`), raz w tej przeglądarce (`yatd-pops`).

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
| `yatd-player`, `yatd-name-asked` | 1.24: identyfikator gracza dla imienia, pytanie o imię już było (wersja WWW) |
| `yatd-noask-ess` | 1.24: "Nie pytaj więcej" o niewydaną Esencję |
| `yatd-lang` | 1.27: `'en'` albo `'pl'`, wybór języka w Ustawieniach (brak = angielski); w Unity locale gracza w `PlayerPrefs` |

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
| tempo klatek `FP`, `html.still`, `window.__yatd` jako `Proxy` (1.24) | `p6_loop.js`, `p0_head.html`, `p8b_ui.js` | `Application.targetFrameRate`, `OnDemandRendering` (sekcja 07, 7.10.9) |
| pytanie o imię i `playerId` (1.24) | `withName`, `renderName`, `playerIdNow` | konto gracza albo identyfikator instalacji; imię opcjonalne |

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
14. **`statsTable` martwa** (`p8b_ui.js`): funkcja nie jest nigdzie wołana; wiersze dopisane do niej w 1.16 i 1.17 przez to się nie pokazywały (a "Co nowego" 1.16 obiecało czas na zwiadzie w Szczegółach). Od poprawki wydania 1.17 najważniejsze z nich są kratkami w zakładce Liczby; samą funkcję można usunąć.
15. **Stany bez formy żeńskiej** w karcie bohatera (1.17): "zgubiony" i "sam" nie zmieniają się dla bohaterki ("wraca sama do domu" poprawione do 1.24).
16. **Podgląd fali ucina słowa** (1.24): przy długich nazwach uzdrowicieli druga linia kończy się wielokropkiem w środku słowa ("z przepowi…"); test `t124b_ui` raz na kilka przebiegów tego nie przechodzi (tak samo na stronie sprzed części C).
17. **`setHint('Bohaterowie są wyczerpani: wychodzą.')`** i inne podpowiedzi 1.19-1.24 (rozłam, "nie zostawię", narada z rozłamem, "jeszcze chwila" z liczbą sekund) trafiają do martwego `setHint`; widać tylko napisy nad bohaterami.
18. **Pasek strachu przy podzielonym ekranie** (1.24): `drawWorld` rysuje bohaterów w każdej połówce (z maską połówki, a przycinanie obejmuje cały ekran), a `fearBar` zapisuje prostokąt także dla paska zakrytego maską; `FEARR` zbiera prostokąty obu połówek, a `fearBarAt` bierze ostatnio narysowany, więc stuknięcie w widoczny pasek może trafić w niewidoczny pasek innego bohatera z drugiej połówki (możliwe, nie sprawdzone w teście). W Unity sprawdzać trafienie w obrębie połówki.
19. **Nowe podpowiedzi 1.26 też idą do martwego `setHint`**: podpowiedź zakładki Loch z poziomami rodzin ("Rodziny: Ogień 2, ..."), wieść o omenie na starcie fali (`setHint('Omen: ...')`; widać tylko napis nad wejściem), komunikaty po ulepszeniu z cechą A/B, po sprzedaży i odłożeniu karty. Poziomy rodzin widać więc tylko w dymku kafelka ("Rodzina: ... (poziom L: +8L% mocy)"), choć "Jak grać" mówi "Poziomy rodzin widać w zakładce Loch".
20. **Dymek łupu nadal mówi "+25% ceny"** za kolejny taki sam łup, a od 1.26 `LOOT_STEP = 1,15` (sekcja 07). Naprawione w 1.27: "Każdy kolejny taki łup jest o 15% droższy" (2.5).
21. **Karta `omen` z `TUT_POP` jest martwa**: tekst jest w `TUT_POP` i w `TUT_NEW`, ale nic nie woła `tutPop('omen')` (wyjaśnienie omenu daje tylko wieść z karczmy otwierana na starcie budowy fali z omenem, 3.19a).
22. **Martwy CSS `.hungerrow.take`** (1.26, animacja serca przy zabieraniu): nic nie dodaje klasy `take` do wiersza serca.
23. **Rachunek "dla Ciebie" w podsumowaniu (1.26)**: część serca liczona jako `min(need, fl.fed - tookPurse)`, choć `feedHeart` nie dodaje zapłaty z sakiewki do `fl.fed`; w fali z niedoborem "♥ -X" jest za małe, a "dla Ciebie" pokazuje `+tookPurse` zamiast +0 (sekcja 03, rozdz. 6, pkt 20). Kafelek "masz Esencji" jest dobry.
24. **Karta serca nie liczy Kamiennego serca w zapasie** (naprawione w 1.26.1, 3.22): zdanie "fala musi dać co najmniej N-P, inaczej pęknie kryształ" bierze pełny głód, choć z Kamiennym sercem sakiewka płaci tylko 75% braku (punkt "Fala da za mało" w tej samej karcie mówi o 75%).
25. **Martwy tekst rangi w HUD** (1.27): `#h-rankrow` jest zawsze ukryty, ale `updateHud` dalej składa i wpisuje tekst rangi do `#h-rank`. W Unity wiersza nie robić.
26. **Napisy z runu w starym języku** (1.27): tytuł Nemezis, tekst gildii i powód końca runu są zapisane w runie jako gotowy tekst, więc po zmianie języka zostają w poprzednim (sekcja 11).
