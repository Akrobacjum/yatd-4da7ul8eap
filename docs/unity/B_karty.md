# Załącznik B: karty (UPGRADES) i ich efekty w kodzie

Wygenerowane z `src/p1_config.js` (Prototype 1.26.1; do 1.24 tabela główna, karty 1.26 w B.4, zmiany 1.26 w B.5, karty 1.26.1 w B.6, zmiany 1.26.1 w B.7; do 1.17.1: 1.12.1). Kolumna "efekt w kodzie" to dosłowna treść funkcji `apply` (dla kart `card` działa na obiekcie `mods`, `m` = mods; dla `instant` działa raz na `run`/`fl`). W Unity każdą kartę zapisz jako dane (id, nazwa, opis, rzadkość, unikalna, wymaganie, etap nauki, grupa łączenia) plus listę operacji na modyfikatorach (np. `spikeDmg *= 1.5`), a nie jako kod. Znaczenie pól `mods` i miejsca, gdzie kod je czyta: sekcja 03 (3.9), dla kart 1.18 także sekcje 05 (5.13) i 06 (6.3.14).

**Od 1.26.1: 210 wpisów** (+8): 170 do talii (zwykłe 69, rzadkie 83, legendarne 18; +7 nowych kart Serca, a 7 zwykłych kart Serca stało się rzadkimi), 34 odblokowania, 6 jednorazowych (zwykła 1, rzadkie 3, legendarne 2; +1: Rozrost serca). Grupa Serce: 25 wpisów, 22 karty do talii oraz `crystal`, `regrow` i `heartgrowth`; od 1.26.1 wypada wyłącznie w rzędzie Dar serca (rzadkie 70%, legendarne 30%, sekcja 03, 3.15).

**Od 1.26: 202 wpisy** (140 -> 202, +62): 163 do talii (zwykłe 76, rzadkie 72, legendarne 15; +41), 34 odblokowania (+20: 9 nowych pułapek, łup Przynęta i 10 nowych potworów), 5 jednorazowych (zwykła 1, rzadkie 2, legendarne 2; +1: Odrost). Grupa Serce (`group: 'heart'`, rząd Dar serca, sekcja 03, 3.15): 15 kart do talii oraz `crystal` i `regrow`. Ceny od 1.26: zwykła 5, rzadka 9, legendarna 14, odblokowanie 7 (`SHOP_PRICE`, `priceOf`). Do 1.25.1: 140 kart (1.18: 113 -> 140): 122 do talii (zwykłe 63, rzadkie 52, legendarne 7), 14 odblokowań, 4 jednorazowe. W 1.18 doszło 28 kart (24 "MUST" z propozycji i `badnews`, `coins`, `tainted`, `rhythm`), a usunięta została `u-portrait` (portret jest w `START_UNLOCKED`, karta nigdy nie mogła wypaść). Nie zrobione z propozycji: `challenge`, `contagion`, `spite`, `scouthunt`.

Kolumna "etap": etap nauki (`ONB_CARD`, a dla kart `unlock` `ONB_ITEM` odblokowywanego elementu), od którego karta może wypaść; od 1.24 w pierwszym runie etap 1 = od fali 1, 2 = od fali 3, 3 = od fali 5, 4 = od fali 7 (`ONB_WAVE`, sekcja 03, 5.3), w kolejnych runach wszystkie. Karty komnat i efektów (1.18) mają `req` "ten element jest w lochu" (`hasRk(k)` albo `hasRt(t)`) i nie wypadają bez niego. Kolumna "★": grupa łączenia (1.24, sekcja 03, 3.13): `named` (element o poziom wyżej), `power` (+10% mocy, ×2,75), `fear` (strach +15%), `hero` (+25%, ×3,125), `ess` (+2 Esencji po fali), `greed` (+0,1 chciwości), `shop` (darmowe odświeżenie); "-" = karta `unique`, nie łączy się. Ceny do 1.25.1: zwykła 6, rzadka 10, legendarna 16, odblokowanie 8 Esencji (`priceOf`, przed zniżką Pośrednika; od 1.26: 5, 9, 14, 7); sprzedaż połączonej ★ za cenę dwóch.

| id | nazwa | opis w grze | rodzaj | rzadkość | unikalna | wymaga | etap | ★ | efekt w kodzie |
|---|---|---|---|---|---|---|---|---|---|
| `u-web` | Nowa pułapka: Sieć | Na podłogę. Spowalnia w kwadracie 3×3, bohater w sieci dostaje +30% obrażeń. | unlock | zwykła |  |  | 1 |  | `unlock: web` |
| `u-fire` | Nowa pułapka: Ogień | Na ścianę. Płomień 2×3 pola i podpalenie. | unlock | zwykła |  |  | 1 |  | `unlock: fire` |
| `u-mimic` | Nowa pułapka: Mimik | Na obiekt. Mebel gryzie wszystkich dookoła. | unlock | zwykła |  |  | 1 |  | `unlock: mimic` |
| `u-cage` | Nowa pułapka: Klatka | Na podłogę. Więzi bohatera; jeśli drużyna go nie uwolni, umiera w klatce. | unlock | zwykła |  |  | 1 |  | `unlock: cage` |
| `u-spider` | Nowy potwór: Pająk | Blokuje przejście, gryzie i oplata siecią. | unlock | zwykła |  |  | 1 |  | `unlock: spider` |
| `u-ogre` | Nowy potwór: Ogr | Dużo życia, bije wszystkich, którzy z nim walczą. | unlock | zwykła |  |  | 1 |  | `unlock: ogre` |
| `u-shaman` | Nowy potwór: Szaman | Leczy potwory dookoła, w skill checku cały pokój. | unlock | zwykła |  |  | 1 |  | `unlock: shaman` |
| `u-ghost` | Nowy potwór: Duch | Krąży przy bohaterach i ich straszy. Tkną go tylko kapłan i mag. | unlock | zwykła |  |  | 2 |  | `unlock: ghost` |
| `u-mirror` | Nowa pułapka: Lustro | Na ścianę. Straszy tym mocniej, im bardziej bohater już się boi. | unlock | zwykła |  |  | 2 |  | `unlock: mirror` |
| `u-creak` | Nowa pułapka: Zawiasy | Na drzwi. Skrzypią i mocno straszą każdego w progu. | unlock | zwykła |  |  | 2 |  | `unlock: creak` |
| `u-coffin` | Nowa pułapka: Trumna | Na podłogę. Bardzo mocno straszy najbliższego bohatera, w Krypcie jeszcze mocniej. | unlock | zwykła |  |  | 2 |  | `unlock: coffin` |
| `u-musicbox` | Nowa pułapka: Pozytywka | Na obiekt. Kołysanka straszy cały pokój przez kilka sekund. | unlock | zwykła |  |  | 2 |  | `unlock: musicbox` |
| `u-shade` | Nowy potwór: Cień | Sunie za samotnym bohaterem i szepcze. Rani go tylko kapłan. | unlock | zwykła |  |  | 2 |  | `unlock: shade` |
| `u-bats` | Nowy potwór: Nietoperze | Szybki rój: gryzie, straszy i płoszy bohaterów. | unlock | zwykła |  |  | 2 |  | `unlock: bats` |
| `crystal` | Żarłoczne serce | Od razu: serce dostaje dodatkowy kryształ (także maksymalnie, do końca runu). | instant | legendarna |  |  | 1 |  | `() => { run.crystals += 1; run.maxCrystals += 1; }` |
| `infusion` | Zastrzyk Esencji | Od razu: +15 Esencji. | instant | zwykła |  |  | 1 |  | `() => { fl.essence += 15; run.essence = fl.essence; }` |
| `gift` | Hojny kupiec | Od razu: 2 darmowe karty do wybrania w sklepie. | instant | rzadka |  |  | 1 |  | `() => { run.freePicks = (run.freePicks \|\| 0) + 2; }` |
| `pact` | Pakt | Do końca runu +1 miejsce w talii, ale serce traci 1 kryształ (także maksymalnie, zawsze zostaje co najmniej 1). | instant | legendarna |  |  | 1 |  | `() => { run.deckSize += 1; run.maxCrystals = Math.max(1, run.maxCrystals - 1); run.crystals = Math.max(1, Math.min(run.crystals - 1, run.maxCrystals)); }` |
| `spikes` | Ostrzejsze kolce | Kolce zadają +50% obrażeń. | card | zwykła |  |  | 1 | named | `m => { m.spikeDmg *= 1.5; }` |
| `cooldown` | Szybkie przeładowanie | Odnowienie wszystkich pułapek i zdolności potworów krótsze o 25%. | card | zwykła |  |  | 1 | power | `m => { m.cooldown *= 0.75; }` |
| `walls` | Głodne ściany | Strzały, ogień, portrety, oczy i lustra przeładowują się o 20% szybciej. | card | zwykła |  |  | 1 | power | `m => { m.wallCd *= 0.8; }` |
| `powder` | Więcej prochu | Wybuch prochu sięga o 1 pole dalej. | card | zwykła |  |  | 1 | named | `m => { m.powderR += 1; }` |
| `arrows` | Płonące groty | Strzały podpalają trafionych. | card | rzadka | tak |  | 1 | - | `m => { m.arrowBurn = true; }` |
| `gate` | Ciężka krata | Każda krata wytrzymuje 2 zamknięcia więcej i miażdży o 50% mocniej. | card | zwykła |  |  | 1 | named | `m => { m.gateUses += 2; m.gateCrush *= 1.5; }` |
| `web` | Lepka sieć | Sieć trzyma 2 razy dłużej. | card | zwykła |  | `web` | 1 | named | `m => { m.webDur *= 2; }` |
| `fire` | Smocza smoła | Ogień zadaje +50% obrażeń. | card | zwykła |  | `fire` | 1 | named | `m => { m.fireDmg *= 1.5; }` |
| `mimic` | Wygłodniały mimik | Mimik gryzie o 50% mocniej. | card | zwykła |  | `mimic` | 1 | named | `m => { m.mimicDmg *= 1.5; }` |
| `trapdoor` | Głęboka zapadnia | Spadający bohater leci dłużej (+4 s) i obija się o 50% mocniej. | card | zwykła |  |  | 1 | named | `m => { m.fallTime += 4; m.fallDmg *= 1.5; }` |
| `cage` | Żelazne klatki | Klatka trzyma 2 razy dłużej (drużyna ma więcej czasu na ratunek), a uwięziony boi się o 50% bardziej. | card | zwykła |  | `cage` | 1 | named | `m => { m.cageTime *= 2; m.cageFear *= 1.5; }` |
| `portrait` | Galeria grozy | Portret sięga o 2 pola dalej i straszy o 30% mocniej. Portret z cechą 3. poziomu (także w Galerii) i tak straszy cały pokój, więc dostaje tylko strach. | card | zwykła |  | `portrait` | 1 | named | `m => { m.portraitR += 2; m.portraitFear *= 1.3; }` |
| `spider` | Pajęcze gniazdo | Ugryzienie pająka oplata siecią cały kwadrat 3×3 (pająk z cechą 3. poziomu robi to i bez karty), a pajęczyna każdego pająka trzyma 2 s dłużej. | card | rzadka | tak | `spider` | 1 | - | `m => { m.spiderNest = true; }` |
| `ghost` | Zimny dotyk | Duch straszy o 50% mocniej, a zranić go może już tylko kapłan. | card | rzadka | tak | `ghost` | 1 | - | `m => { m.ghostAura *= 1.5; m.ghostPriestOnly = true; }` |
| `monster` | Weterani | Nowo postawione potwory mają +40% HP i biją o 40% mocniej (bonus zostaje, gdy wstaną po powaleniu). | card | zwykła |  |  | 1 | power | `m => { m.monster *= 1.4; }` |
| `loottrap` | Zatruty łup | Podniesienie łupu zadaje obrażenia (więcej przy rzadszym). | card | zwykła |  |  | 1 | power | `m => { m.lootTrap += 15; }` |
| `disarm` | Zardzewiałe zamki | Złodziej rozbraja 2 razy wolniej (masz więcej czasu, żeby go przyłapać). | card | zwykła |  |  | 1 | hero | `m => { m.disarm *= 2; }` |
| `suicide` | Mechanizm samobójczy | Rozbrajana pułapka ma 30% szans, że odpali w twarz rozbrajającemu. | card | zwykła |  |  | 1 | power | `m => { m.suicideMech += 0.3; }` |
| `essence` | Żyła esencji | Esencja z Grozy +30% (Groza × Chciwość × Combo × 1,3). | card | zwykła |  |  | 1 | ess | `m => { m.regen *= 1.3; }` |
| `income` Mroczny dochód | Mroczny dochód | +3 Esencji po każdej fali. | card | zwykła |  |  | 1 | ess | `m => { m.income += 3; }` |
| `usurer` | Lichwiarz | Po fali (gdy serce już zabrało swoje) dostajesz 15% niewydanej Esencji (najwyżej 10). | card | zwykła |  |  | 1 | ess | `m => { m.usurer += 0.15; }` |
| `dig` | Kopacze | Pokój i przejście kosztują o 2 Esencji mniej. | card | zwykła |  |  | 1 | ess | `m => { m.digDiscount += 2; }` |
| `mole` | Kret | Co drugą falę jedno kopanie pokoju za darmo. | card | zwykła |  |  | 1 | ess | `m => { m.mole += 1; }` |
| `harvest` Żniwa strachu | Żniwa strachu | Każdy bohater, który ucieknie ze strachu, daje dodatkowo 3 Esencji (bez mnożników). | card | zwykła |  |  | 2 | ess | `m => { m.fearHarvest += 3; }` |
| `soul` | Żniwiarz | Śmierć bohatera daje 2 razy więcej Grozy. | card | rzadka |  |  | 1 | ess | `m => { m.soulMult *= 2; }` |
| `greed` | Złote runo | Zobaczony łup podbija chciwość o połowę mocniej. | card | zwykła |  |  | 1 | greed | `m => { m.greedMult *= 1.5; }` |
| `fever` | Gorączka złota | Każda fala zaczyna z chciwością wyższą o 0,3. | card | zwykła |  |  | 1 | greed | `m => { m.greedStart += 0.3; }` |
| `depth` | Głębia mroku | Mnożnik pokoju z sercem i pokoi tuż przed nim +0,5. | card | zwykła |  |  | 1 | greed | `m => { m.depthBonus += 0.5; }` |
| `infamous` | Zła sława | Każdy kryształ w sercu daje +0,15 chciwości (liczone na starcie fali). | card | zwykła |  |  | 1 | greed | `m => { m.crystalPts += 0.15; }` |
| `collector` | Kolekcjoner | +0,04 chciwości za każdy inny rodzaj pułapki lub potwora w lochu (na starcie fali). | card | rzadka |  |  | 1 | greed | `m => { m.collector += 0.04; }` |
| `miser` | Skąpiec | +0,05 chciwości za każdy element mniej niż 15 w lochu (pułapki i potwory, na starcie fali). | card | rzadka |  |  | 1 | greed | `m => { m.miser += 0.05; }` |
| `lonely` | Echo samotności | Samotność bohatera daje 2 razy więcej Grozy. | card | rzadka |  |  | 1 | fear | `m => { m.loneMult *= 2; }` |
| `maze` | Kręte korytarze | Zgubiony bohater daje 2 razy więcej Grozy (Groza ze zgubienia płynie przez jego pierwsze 12 s). | card | rzadka |  |  | 1 | fear | `m => { m.lostMult *= 2; }` |
| `haunt` | Nawiedzenie | Każdy strach jest o 25% silniejszy (więcej Grozy, szybsze ucieczki). | card | zwykła |  |  | 2 | fear | `m => { m.fearMult *= 1.25; }` |
| `echo` Echo krzyku | Echo krzyku | Bohater, który ucieknie ze strachu, daje 1,75 raza więcej Grozy. | card | rzadka |  |  | 2 | fear | `m => { m.scareMult *= 1.75; }` |
| `panic` | Panika | Bohater, który zaczyna uciekać, straszy wszystkich w promieniu 3 pól (25 strachu). | card | rzadka |  |  | 2 | fear | `m => { m.panic += 1; }` |
| `hgallery` | Nawiedzona galeria | Duch w pokoju z portretem straszy 2 razy mocniej. | card | rzadka |  | `ghost` | 1 | named | `m => { m.hauntedGallery += 1; }` |
| `curse` | Klątwa kryształu | Niosący kryształ idzie o 35% wolniej i boi się coraz bardziej. | card | rzadka |  |  | 1 | hero | `m => { m.carrierSlow *= 0.65; m.carrierFear += 4; }` |
| `deaf` | Głuche ściany | Uciekinierzy pamiętają tylko połowę tego, co widzieli: pułapek i pokoi, ale też łupu (następna fala przychodzi mniej chciwa). | card | rzadka |  |  | 1 | hero | `m => { m.rumorKeep *= 0.5; }` |
| `trails` | Fałszywe tropy | Uciekinierzy opowiadają też o pułapkach, których nie ma. Następna fala omija puste miejsca. | card | rzadka | tak |  | 1 | - | `m => { m.falseTrails = true; }` |
| `cursed` | Rdza | Przedmioty bohaterów (także z ich wyposażenia) działają o połowę słabiej. | card | rzadka |  |  | 1 | hero | `m => { m.itemPower *= 0.5; }` |
| `sticky` | Lepkie kolce | Kolce zadają 2 razy więcej spowolnionym bohaterom (sieć, pajęczyna, zawiasy, trumna, podcięcie goblina, Gołoledź). | card | rzadka |  | `() => run.unlocked.has('web') \|\| run.unlocked.has('spider')` | 1 | power | `m => { m.stickySpikes += 1; }` |
| `wildfire` | Pożoga | Podpalenie przeskakuje na bohaterów w promieniu 1,5 pola (każda kolejna kopia +0,5 pola). | card | rzadka |  | `fire` | 1 | named | `m => { m.wildfire += 1; }` |
| `blood` | Krwawy rytuał | Każde zabójstwo w tej fali wzmacnia pułapki o 10% (obrażenia, strach, czas działania) do końca fali. | card | rzadka |  |  | 1 | power | `m => { m.bloodRite += 0.1; }` |
| `calm` | Cisza przed burzą | Pułapka, która nie odpaliła od 20 s (albo jeszcze wcale w tej fali), działa 2,5 raza mocniej (kolejna kopia: 4 razy, 5,5 raza...). | card | rzadka |  |  | 1 | power | `m => { m.calmStorm += 1.5; }` |
| `well` | Bezdenna studnia | Bohater z kryształem, który spadnie w zapadnię, gubi go w ciemności: kryształ wraca do serca. | card | rzadka | tak |  | 1 | - | `m => { m.bottomless = true; }` |
| `echofire` | Echo mechanizmów | Co 5. odpalenie pułapki odpala ją drugi raz (kolejna kopia: co 4., co 3...). | card | rzadka |  |  | 1 | power | `m => { m.echoFire += 1; }` |
| `glass` | Szklane serce | Chciwość +1, ale bohaterowie wyważają kryształ 2 razy szybciej. | card | legendarna |  |  | 1 | greed | `m => { m.glass += 1; }` |
| `nopick` | Odwrotna chciwość | Bohaterowie zabierają łup jak zwykle, ale zabrany łup podbija chciwość 3 razy mocniej. Opłaca się dać im coś ukraść. | card | legendarna | tak |  | 1 | - | `m => { m.pickGreed *= 3; }` |
| `gambler` | Hazardzista | Krytyk w skill checku uderza ×1,35 mocniej (×2,4 zamiast ×1,8), ale draśnięcie tylko ×0,4 zamiast ×0,7. | card | legendarna |  |  | 1 | power | `m => { m.critPw *= 1.35; m.okPw *= 0.57; }` |
| `choir` | Chór potępionych | Odpalony portret odpala też wszystkie gotowe portrety w tym samym pokoju (z 60% mocy, każda kolejna kopia +40%). | card | legendarna |  | `portrait` | 1 | named | `m => { m.choir += 1; }` |
| `hunger` | Głodne kolce | Kolce zadają do końca runu +4% obrażeń za każde zabójstwo kolcami (licznik rośnie przez cały run). | card | rzadka |  |  | 1 | power | `m => { m.hunger += 1; }` |
| `chronicle` | Kronika grozy | Strach jest o 3% silniejszy za każdego bohatera, który w tym runie uciekł ze strachu (do końca runu). | card | rzadka |  |  | 2 | power | `m => { m.chronicle += 1; }` |
| `granary` | Spichlerz dusz | Każdy zabity bohater zmniejsza głód serca o 1 do końca runu (najwyżej o 40). | card | zwykła |  |  | 1 | ess | `m => { m.granary += 1; }` |
| `bank` | Skarbiec | Każda fala bez kradzieży kryształu dodaje +2 Esencji do przychodu po każdej kolejnej fali (do końca runu). | card | zwykła |  |  | 1 | ess | `m => { m.bank += 1; }` |
| `tempered` | Zaprawione mechanizmy | Pułapki działają o 1% mocniej za każde 4 trafienia pułapek w tym runie (do końca runu). | card | rzadka |  |  | 1 | power | `m => { m.tempered += 1; }` |
| `bloodpact` | Krwawa umowa | Pułapki i potwory działają ×1,6 mocniej, ale bohaterowie przychodzą o 2 poziomy silniejsi. | card | legendarna |  |  | 1 | power | `m => { m.pactPower *= 1.6; m.pactLevels += 2; }` |
| `overload` | Przeciążenie | Pułapki i zdolności potworów odnawiają się o 40% szybciej, ale każde odpalenie pułapki ma 6% szans zepsuć ją do końca fali. | card | rzadka |  |  | 1 | power | `m => { m.cooldown *= 0.6; m.overload += 0.06; }` |
| `cheapwalls` | Tanie mury | Rozbudowa pokoi kosztuje o połowę mniej, ale budowle są o 50% droższe. | card | zwykła |  |  | 3 | ess | `m => { m.expandCost *= 0.5; m.buildingCost *= 1.5; }` |
| `firepit` | Ognista otchłań | Bohater, który spadnie przez zapadnię, wychodzi podpalony. | card | rzadka |  |  | 1 | power | `m => { m.firepit += 1; }` |
| `cageghost` | Nawiedzone klatki | Uwięziony w klatce dostaje 12 strachu na sekundę. | card | rzadka |  | `cage` | 2 | named | `m => { m.cageHaunt += 12; }` |
| `monsterroar` | Ryk potworów | Rany zadane przez potwory straszą 2,5 raza mocniej (kolejna kopia: 4 razy...). | card | zwykła |  |  | 2 | fear | `m => { m.monsterFear += 1.5; }` |
| `sharp` | Hartowane ostrza | Obrażenia kłute (kolce i krwawienie, strzały, łucznik, goblin, mimik, nietoperze) +25%. | card | zwykła |  |  | 1 | power | `m => { m.dmgType.pierce *= 1.25; }` |
| `heavy` | Ciężkie mechanizmy | Obrażenia obuchowe (krata, ogr, upadek w zapadnię) +25%. | card | zwykła |  |  | 1 | power | `m => { m.dmgType.blunt *= 1.25; }` |
| `oil` | Olej w szczelinach | Obrażenia od ognia (ogień, proch, podpalenia; nie krwawienie) +25%. | card | zwykła |  |  | 1 | power | `m => { m.dmgType.fire *= 1.25; }` |
| `venom` | Jadowite gruczoły | Obrażenia od trucizny (pająk, szaman, Zatruty łup) +30%. | card | zwykła |  |  | 1 | power | `m => { m.dmgType.poison *= 1.3; }` |
| `weakspot` | Słabe punkty | Słabości ciała bohaterów działają 2 razy mocniej (np. kruche kości: obuchowe +80% zamiast +40%). | card | rzadka |  |  | 4 | hero | `m => { m.weakK += 1; }` |
| `anatomy` | Anatomia ofiar | Przed falą znasz ciało i fobie każdego bohatera. | card | rzadka | tak |  | 4 | - | `m => { m.revealAll = true; }` |
| `arsenal` Pełen arsenał | Pełen arsenał | Jeśli na starcie fali masz w lochu 4 z 5 typów obrażeń (kłute, obuchowe, ogień, trucizna, porażenie), wszystkie obrażenia +20%. | card | rzadka |  |  | 1 | power | `m => { m.arsenal += 0.2; }` |
| `nightmares` | Koszmary | Fobie straszą 3 razy mocniej zamiast 2 (kolejna kopia: 4 razy). | card | rzadka |  |  | 4 | fear | `m => { m.phobiaK += 1; }` |
| `oddbodies` | Przeklęta karczma | Więcej bohaterów przychodzi z fobią albo słabością ciała (+10% szans na każdą). | card | zwykła |  |  | 4 | hero | `m => { m.oddBodies += 1; }` |
| `scars` | Blizny na duszy | Trauma łapie już poniżej 50% HP i straszy 2 razy (zamiast 1,5 raza). | card | rzadka |  |  | 4 | fear | `m => { m.traumaK += 1; }` |
| `memories` | Złe wspomnienia | Powracający bohaterowie wchodzą do lochu z 30% strachu. | card | rzadka |  |  | 4 | fear | `m => { m.badMemories += 0.3; }` |
| `survivors` | Legenda ocalałych | Uciekinierzy wracają 1,5 raza częściej, a każdy powracający w drużynie daje +0,2 chciwości. | card | zwykła |  |  | 4 | hero | `m => { m.moreReturn += 0.5; m.returnGreed += 0.2; }` |
| `dread` | Gęsta atmosfera | Strach bohaterów opada o połowę wolniej. | card | zwykła |  |  | 2 | fear | `m => { m.calmK *= 0.5; }` |
| `screams` | Krzyki w ścianach | Bohater, który ucieknie ze strachu, straszy tych, którzy słyszą jego krzyk (10% ich odwagi; krzyk niesie się 14 kroków, nie przez Głuszę i Kamień wyjec). | card | zwykła |  |  | 2 | fear | `m => { m.fleeShock += 0.1; }` |
| `isolation` | Izolacja | Samotny albo zgubiony bohater boi się wszystkiego o 25% bardziej, a sama samotność straszy go 2 razy mocniej. | card | rzadka |  |  | 2 | fear | `m => { m.isolation += 1; }` |
| `heavyair` | Ciężkie powietrze | W Mgle i w Krypcie każdy strach jest o 25% silniejszy. | card | zwykła |  |  | 3 | fear | `m => { m.heavyAir += 0.25; }` |
| `lastgasp` | Ostatnie tchnienie | Umierający bohater straszy wszystkich w swoim pokoju (20% ich odwagi). | card | rzadka |  |  | 2 | fear | `m => { m.lastGasp += 0.2; }` |
| `broker` | Pośrednik | Karty w sklepie kosztują o 25% mniej. | card | zwykła |  |  | 1 | shop | `m => { m.shopDisc += 0.25; }` |
| `luckydraw` | Szczęśliwy los | Pierwsze odświeżenie sklepu w każdej fali jest darmowe. | card | zwykła |  |  | 1 | shop | `m => { m.freeReroll += 1; }` |
| `pawnshop` | Lombard | Sprzedane karty dają 2 razy więcej Esencji. | card | zwykła |  |  | 1 | shop | `m => { m.sellK *= 2; }` |
| `deepstash` | Głęboki schowek | Schowek mieści 2 karty więcej. | card | rzadka |  |  | 1 | shop | `m => { m.stashPlus += 2; }` |
| `patron` | Mecenas | Co drugą falę dostajesz dodatkową darmową kartę. | card | rzadka |  |  | 1 | shop | `m => { m.patron += 1; }` |
| `hoard` | Kolekcja w schowku | Każda karta w schowku daje +0,1 chciwości. | card | rzadka |  |  | 1 | shop | `m => { m.stashGreed += 0.1; }` |
| `wager` | Zakład z sercem | Chciwość +0,8, ale serce chce o 20% więcej. | card | legendarna |  |  | 1 | ess | `m => { m.greedFlat += 0.8; m.hungerK *= 1.2; }` |
| `gluttony` | Obżarstwo | Gdy serce jest już syte, Esencja, która trafia do sakiewki (po Daninie), wpada o 25% większa. | card | rzadka |  |  | 1 | ess | `m => { m.storeK *= 1.25; }` |
| `fasting` | Post | Serce chce o 15% mniej, ale chciwość -0,2. | card | zwykła |  |  | 1 | ess | `m => { m.hungerK *= 0.85; m.greedFlat -= 0.2; }` |
| `heartbeat` | Bijące serce | Gdy serce jest już syte w tej fali, pułapki i potwory działają o 20% mocniej. | card | rzadka |  |  | 1 | ess | `m => { m.heartbeat += 0.2; }` |
| `gilded` | Pozłacane pułapki | +0,05 chciwości za każdą pułapkę i potwora na poziomie 2 lub 3. | card | zwykła |  |  | 1 | greed | `m => { m.gilded += 0.05; }` |
| `golddust` | Złoty pył | Monety podbijają chciwość o połowę mocniej. | card | zwykła |  |  | 1 | greed | `m => { m.goldDust += 0.5; }` |
| `reliquary` | Relikwiarz | Relikwie podbijają chciwość 1,5 raza mocniej, a bohater, który zabierze relikwię, nie dostaje z niej przedmiotu. | card | rzadka | tak |  | 1 | - | `m => { m.reliquary = true; }` |
| `pack` | Stado | Potwór, który ma w swoim pokoju innego potwora, bije o 20% mocniej. | card | zwykła |  |  | 1 | power | `m => { m.pack += 0.2; }` |
| `quickarm` | Szybki montaż | Pułapki postawione w trakcie fali są gotowe od razu, a ich pierwsze odpalenie ma +50% mocy. | card | zwykła | tak |  | 1 | - | `m => { m.quickArm = true; }` |
| `drawers` | Zastawione szuflady | W Graciarni bohaterowie chętniej się rozglądają, a mimik, pozytywka i proch na przeszukiwanym meblu odpalają 2 razy częściej (mimik prawie zawsze). | card | zwykła |  | `() => hasRk('junk')` | 3 | hero | `m => { m.drawers += 1; }` |
| `lure` | Wabiący hałas | Odgłos pułapki zza ściany ciągnie każdego przywódcę, także ostrożnego i tchórza, a drużyna pamięta, skąd dobiegł, przez 40 s zamiast 25. | card | rzadka |  |  | 1 | hero | `m => { m.lure += 1; }` |
| `onemore` | Jeszcze chwila | Na naradzie bohaterowie chętniej głosują, żeby szukać dalej (chciwi i łowcy skarbów 2 razy chętniej), a "jeszcze chwila" trwa 45 s zamiast 30. | card | zwykła |  |  | 1 | hero | `m => { m.onemore += 1; }` |
| `thickwalls` | Grube mury | Krzyki niosą się tylko na 8 kroków zamiast 14. Drużyna później dowiaduje się o śmierci, klatce, krysztale i ucieczce, a odcięci szukają dalej sami. Za to mniej osób słyszy śmierć. | card | rzadka | tak |  | 1 | - | `m => { m.thickwalls = true; }` |
| `risen` | Wstający umarli | Bohater, który zginie w Krypcie, wstaje jako duch: Twój potwór do końca fali, nie zajmuje miejsca. Najwyżej 2 na falę. | card | legendarna | tak | `() => hasRt('crypt')` | 3 | - | `m => { m.risen = true; }` |
| `cell` | Cela pod zapadnią | Bohater, który spadnie przez zapadnię w Więzieniu, ląduje w gotowej klatce w Więzieniu (jeśli jakaś jest) i klatka zamyka się na nim. | card | rzadka | tak | `() => hasRk('prison')` | 3 | - | `m => { m.cell = true; }` |
| `vaultsnap` | Zatrzask sezamu | Gdy bohater podniesie łup w Sezamie, odpalają wszystkie gotowe pułapki w Sezamie (jak alarm wabika, najwyżej raz na 6 s). | card | rzadka | tak | `() => hasRt('vault')` | 3 | - | `m => { m.vaultsnap = true; }` |
| `wisps` | Błędne ogniki | Przywódca, który błądzi we Mgle, idzie prosto na pułapkę, której drużyna nie zna (jeśli jest w tym pokoju), i błądzi o 2 s dłużej. | card | zwykła |  | `() => hasRt('fog')` | 3 | hero | `m => { m.wisps += 1; }` |
| `body` | Odnalezione ciało | Kto znajdzie ciało towarzysza, o którego śmierci nie wiedział, boi się jak świadek śmierci. W Głuszy 2 razy mocniej (kolejna kopia: +50%). | card | rzadka |  | `() => hasRt('hush')` | 3 | fear | `m => { m.body += 1; }` |
| `falsecall` | Fałszywe wołanie | Zgubiony bohater, który woła drużynę w pobliżu Nawiedzonej sali, czasem słyszy odpowiedź z sali i idzie na ten głos prosto do niej. | card | rzadka | tak | `() => hasRk('haunt')` | 3 | - | `m => { m.falsecall = true; }` |
| `frames` | Spojrzenie z ramy | Bohater, który w Galerii ogląda portret, oczy albo lustro, budzi je: gotowa pułapka odpala sama na niego z 1,5 raza większą mocą. | card | rzadka |  | `() => hasRk('gallery')` | 3 | fear | `m => { m.frames += 1; }` |
| `restock` | Beczki z kuźni | Proch w Kuźni po wybuchu wraca w następnej fali razem z meblem, za darmo i na tym samym poziomie. | card | zwykła | tak | `() => hasRk('forge')` | 3 | - | `m => { m.restock = true; }` |
| `lullsleep` | Usypianka | Ranny bohater (poniżej 60% HP), który w Pokoju dziecięcym słucha kołysanki, zasypia na 4 s (kolejna kopia: +2 s): śpi w miejscu, a koszmary straszą go jak w Sanktuarium. | card | rzadka |  | `() => hasRk('nursery')` | 3 | fear | `m => { m.lullsleep += 1; }` |
| `ambush` | Zasadzka w norze | Gobliny i szamani w Gobliniej norze siedzą w ukryciu: bohaterowie nie omijają ich, dopóki goblin nie zaatakuje. Pierwszy cios z ukrycia jest 2 razy mocniejszy. | card | rzadka | tak | `() => hasRk('goblin')` | 3 | - | `m => { m.ambush = true; }` |
| `cocoons` | Kokony | Bohater oplątany w Leżu pająków (sieć albo pająk) boi się 6 na sekundę, dopóki się nie wyplącze (z fobią pająków 2 razy więcej). | card | zwykła |  | `() => hasRk('spider')` | 3 | fear | `m => { m.cocoons += 1; }` |
| `cauldron` | Kocioł ogra | Bohater, który zginie w Jaskini ogra, trafia do kotła: jego przedmioty i złoto nie wypadają na podłogę, a Ty dostajesz 2 Esencji za każdy przedmiot i 1 za każdą monetę (najwyżej 8 z jednego bohatera). | card | zwykła |  | `() => hasRk('ogre')` | 3 | power | `m => { m.cauldron += 1; }` |
| `batscatter` | Spłoszeni w mrok | Bohater spłoszony przez nietoperze z Gniazda nietoperzy biegnie na oślep i może się zgubić (40% szans, nowicjusz 60%). | card | zwykła |  | `() => hasRk('bats')` | 3 | fear | `m => { m.batscatter += 1; }` |
| `skullwall` | Mur z czaszek | Kości, trumny i łucznicy w Kaplicy czaszek działają o 5% mocniej za każdego bohatera, który zginął w Kaplicy w tym runie (najwyżej +50%). | card | rzadka |  | `() => hasRk('ossuary')` | 3 | power | `m => { m.skullwall += 1; }` |
| `strip` | Zdarte pancerze | Trafienie kolcami albo strzałą w Zbrojowni strąca bohaterowi talizman, amulet albo zbroję (50% szans): przedmiot spada obok jako łup. | card | zwykła |  | `() => hasRk('armory')` | 3 | hero | `m => { m.strip += 1; }` |
| `mire` | Grzęzawisko | W Bagnie spowolnienie od pułapek i potworów (sieć, pająk, zawiasy, trumna, podcięcie goblina) trwa 2 razy dłużej. | card | zwykła |  | `() => hasRt('swamp')` | 3 | hero | `m => { m.mire += 1; }` |
| `farecho` | Niosące się echo | Krzyk z Groty (śmierć, klatka, kryształ, ucieczka) słychać 2 razy dalej, a kto usłyszy śmierć w Grocie, boi się jak świadek. | card | rzadka |  | `() => hasRt('grotto')` | 3 | fear | `m => { m.farecho += 1; }` |
| `deepsleep` | Sen bez przebudzenia | Pułapki i potwory w Sanktuarium zadają śpiącym i odpoczywającym 2 razy więcej ran i strachu. | card | zwykła |  | `() => hasRt('haven')` | 3 | fear | `m => { m.deepsleep += 1; }` |
| `gearlink` | Sprzężone tryby | Gdy pułapka w Zębatkach odpali, inne pułapki w tym pokoju odnawiają się o 1 s szybciej. | card | zwykła |  | `() => hasRt('gears')` | 3 | power | `m => { m.gearlink += 1; }` |
| `blackice` | Gołoledź | Kto poślizgnie się w Lodowni, przewraca się: przez 1,5 s jest spowolniony (pułapki zadają mu +30%), a poślizgów jest o połowę więcej. | card | zwykła |  | `() => hasRt('ice')` | 3 | hero | `m => { m.blackice += 1; }` |
| `badnews` | Złe wieści | Śmierć, o której bohater dowie się później (z krzyku zza ścian albo od towarzysza), straszy go 2 razy mocniej. | card | zwykła |  |  | 1 | hero | `m => { m.badnews += 1; }` |
| `coins` | Podrzucone grosze | Przeszukany mebel 2 razy częściej kryje monetę, a znaleziona moneta podbija chciwość jak zobaczone Monety. | card | zwykła |  |  | 1 | greed | `m => { m.coins += 1; }` |
| `tainted` | Zepsute mikstury | Mikstury z Twojego łupu są zepsute: wypita leczy o połowę słabiej i straszy pijącego (10% odwagi). | card | zwykła |  |  | 1 | hero | `m => { m.tainted += 1; }` |
| `rhythm` | Rytm lochu | Okno combo trwa 1 s dłużej (4 s zamiast 3). | card | zwykła |  |  | 1 | power | `m => { m.rhythm += 1; }` |

## B.1 Karty 1.18: liczba kopii i decyzje

Mechanika każdej nowej karty: sekcja 05 (5.13.1) i 06 (6.3.14). Kopie: pola "+1 za kopię" sumują się według opisu; karty z flagą są `unique`.

| Karta | Co daje kolejna kopia (decyzja przy 1.18, gdy propozycja milczała) |
|---|---|
| `drawers` | +0,3 szansy rozglądania się i mnożnik szansy pułapki mebla (najwyżej 0,95) |
| `lure` | +15 s pamięci dźwięku |
| `onemore` | +0,6 głosu "jeszcze chwila" i +15 s |
| `wisps` | +2 s błądzenia |
| `body` | +50% strachu |
| `frames` | +0,5 mocy |
| `lullsleep` | +2 s snu |
| `cocoons` | +6 strachu/s |
| `cauldron` | ×kopie Esencji z kotła |
| `batscatter` | +0,2 szansy zgubienia |
| `skullwall` | ×kopie na licznik (najwyżej +50%) |
| `strip` | +0,5 szansy |
| `mire` | spowolnienie mija wolniej (×1/(1 + kopie)) |
| `farecho` | zasięg krzyku ×(1 + kopie) |
| `deepsleep` | ×(1 + kopie) |
| `gearlink` | -1 s odnowienia |
| `blackice` | +0,5 szansy poślizgu |
| `badnews` | ×(1 + kopie) |
| `coins` | ×(1 + kopie) szansy monety |
| `tainted` | +10% odwagi strachu |
| `rhythm` | +1 s okna combo |
| `thickwalls`, `risen`, `cell`, `vaultsnap`, `falsecall`, `restock`, `ambush` | `unique` (`vaultsnap` i `restock`: druga kopia byłaby martwa) |

Od 1.24 druga kopia nie leży już obok pierwszej: łączy się w kartę ★, która działa jak 2,5 kopii (grupa `power` 2,75, `hero` 3,125) i dostaje cechę grupy (sekcja 03, 3.13); trzecia nie wypada.

## B.2 Karty zmienione w 1.18

| Karta | Zmiana |
|---|---|
| `spider` Pajęcze gniazdo | dodatkowo każda pajęczyna każdego pająka trzyma o 2 s dłużej (także w Leżu i na 3. poziomie) |
| `portrait` Galeria grozy | tylko tekst: +2 pola nie dotyczą portretu z cechą 3. poziomu (straszy cały pokój), ×1,3 strachu zostaje |
| `quickarm` Szybki montaż | pierwsze odpalenie pułapki postawionej w fali ×1,5 (napis "Szybki montaż ×1,5"), nie echo |
| `screams` Krzyki w ścianach | straszy tylko tych, którzy słyszą krzyk uciekającego (`canHearShout`) |
| `walls` Głodne ściany | tekst: także oczy i lustra; `CARD_NEEDS` + `eyes`, `mirror` |
| `infusion` Zastrzyk Esencji | tekst bez "nawet ponad pojemność" |
| `bank` Skarbiec | tekst "bez kradzieży kryształu" (głód się nie liczy, jak w kodzie) |
| `sticky` Lepkie kolce | tekst: każdy spowolniony, z listą źródeł |
| `cooldown`, `overload` | tekst: także zdolności potworów; Przeciążenie psuje tylko pułapki |
| `sharp` Hartowane ostrza | tekst: kolce i krwawienie, nietoperze; `CARD_NEEDS` + `bats` |
| `oil` Olej w szczelinach | tekst: "nie krwawienie" |
| `venom` | `CARD_NEEDS` bez `lcursed` |
| `hgallery` | `CARD_NEEDS` duch i portret, oba potrzebne (`CARD_ALL`) |
| `maze` Kręte korytarze | tekst: Groza zgubionego płynie przez jego pierwsze 12 s |
| `deaf` Głuche ściany | tekst: tracą też połowę opowieści o łupie |
| `u-portrait` | usunięta (stare zapisy pomijają jej id w talii, schowku i ofercie) |

## B.3 Rozkład grup łączenia (1.24; liczby 1.26 pod tabelą)

| Grupa | Liczba kart | Karty |
|---|---|---|
| `named` | 16 (3 z nich `unique`: arrows, spider, ghost) | spikes, powder, arrows, gate, web, fire, mimic, trapdoor, cage, portrait, spider, ghost, hgallery, wildfire, choir, cageghost |
| `power` | 39 (w tym `unique` bez wpisu: trails, well, nopick, anatomy, reliquary, quickarm, thickwalls, risen, cell, vaultsnap, falsecall, restock, ambush) | cooldown, walls, monster, loottrap, suicide, trails, sticky, blood, calm, well, echofire, nopick, gambler, hunger, chronicle, tempered, bloodpact, overload, firepit, sharp, heavy, oil, venom, anatomy, arsenal, reliquary, pack, quickarm, thickwalls, risen, cell, vaultsnap, falsecall, restock, ambush, cauldron, skullwall, gearlink, rhythm |
| `fear` | 21 | lonely, maze, haunt, echo, panic, monsterroar, nightmares, scars, memories, dread, screams, isolation, heavyair, lastgasp, body, frames, lullsleep, cocoons, batscatter, farecho, deepsleep |
| `hero` | 16 | disarm, curse, deaf, cursed, weakspot, oddbodies, survivors, drawers, lure, onemore, wisps, strip, mire, blackice, badnews, tainted |
| `ess` | 14 | essence, income, usurer, dig, mole, harvest, soul, granary, bank, cheapwalls, wager, gluttony, fasting, heartbeat |
| `greed` | 10 | greed, fever, depth, infamous, collector, miser, glass, gilded, golddust, coins |
| `shop` | 6 | broker, luckydraw, pawnshop, deepstash, patron, hoard |

Od 1.26 (163 karty do talii; grupa liczona przez `fuseGroup`, także dla kart `unique`, które się nie łączą): `named` 20 (5 `unique`: arrows, spider, ghost, conduct, hellpack; nowe: doubleedge, bonesunbroken, conduct, hellpack), `power` 71 (25 `unique`; nowe: heartcry, heavycrystal, warden, bloodflow, lastbreath, heartpulse, fearcrown, bloodbath, lonewolf, palette, minimalist, cursedcrown, skulls, execdiary, risinglegend, pantry, chainreact, tarsulfur, toxicfume, abysspact oraz `unique` heartroom, darklore, heartmem, bloodcredit, copyist, soulmirror, sharedmech, heartecho, plague, undyingarmy, goldendream, croesus), `fear` 21, `hero` 16, `ess` 19 (nowe w `FUSE_GROUP`: darkforge, tithe, stoneheart, glutton, kingsfeast), `greed` 10, `shop` 6. Karty `unique` razem: 30 (14 nowych).

Od 1.26.1 (170 kart do talii): `power` 78 (+7: heartguide, heartdread, heartgreed, heartpatience, heartcore oraz `unique` secondheart, resonance), reszta bez zmian; karty `unique` razem: 32. Nowe karty Serca nie są w `FUSE_GROUP`, więc Groza serca (strach) i Serce lochu (Esencja) łączą się jako `power` (+10% mocy), a nie `fear` albo `ess`; do potwierdzenia przy wdrożeniu, jak przypisanie grup w 1.24 (sekcja 11).

## B.4 Karty dodane w 1.26

Kolumny jak w tabeli głównej, plus "grupa / uwagi": `heart` = grupa Serce (w 1.26 wypadała też w zwykłej ofercie, od 1.26.1 tylko w rzędzie Dar serca), "rośnie" = `grows` (licznik `run.stacks`, sekcja 03, 3.1), "tylko Dar serca" = `heartOnly`. Etap 1 przy kartach 1.26 oznacza brak wpisu w `ONB_CARD` (wypadają od początku, jeśli spełniają `req`); odblokowania mają etap z `ONB_ITEM` (Wahadło i Wnyki 1, reszta 2-3). Kopista i Lustro duszy mają pustą `apply`: kopiują w `buildMods` (sekcja 03, 3.8). Mechanika nowych kart: sekcje 03 (3.9, 3.15) i 05 (5.14.10).

| id | nazwa | opis w grze | rodzaj | rzadkość | unikalna | wymaga | etap | ★ | grupa / uwagi | efekt w kodzie |
|---|---|---|---|---|---|---|---|---|---|---|
| `u-pendulum` | Nowa pułapka: Wahadło | Na ścianę. Ostrze tnie pas 3×4 pól, Unieruchomieni i spowolnieni dostają 1,5 raza więcej. | unlock | zwykła |  |  | 1 |  |  | `unlock: pendulum` |
| `u-snare` | Nowa pułapka: Wnyki | Na podłogę. Rani i Unieruchamia na 5 s: kolce i wahadło biją go wtedy 1,5 raza mocniej. | unlock | zwykła |  |  | 1 |  |  | `unlock: snare` |
| `u-miasma` | Nowa pułapka: Wyziewy | Na podłogę. Trująca chmura 3×3: stosy trucizny. Zatruty + ogień = Detonacja. | unlock | zwykła |  |  | 3 |  |  | `unlock: miasma` |
| `u-oilslick` | Nowa pułapka: Plama oleju | Na podłogę. Oblany na 8 s i spowolniony. Oblany + ogień = Pożar. | unlock | zwykła |  |  | 2 |  |  | `unlock: oilslick` |
| `u-bolt` | Nowa pułapka: Runa piorunów | Na ścianę. Piorun (porażenie) przeskakuje na Mokrych. Mokry + porażenie = Porażenie. | unlock | zwykła |  |  | 3 |  |  | `unlock: bolt` |
| `u-flood` | Nowa pułapka: Zalewnia | Na podłogę. Woda w całym pokoju: Mokry, spowolniony; gasi podpalonych (Para). | unlock | zwykła |  |  | 3 |  |  | `unlock: flood` |
| `u-bell` | Nowa pułapka: Dzwon żałobny | Na mebel. Każda śmierć bohatera w lochu straszy wszystkich żywych. | unlock | zwykła |  |  | 2 |  |  | `unlock: bell` |
| `u-falsedoor` | Nowa pułapka: Fałszywe przejście | Na drzwi. Pierwszy, kto przejdzie, gubi się na 12 s. | unlock | zwykła |  |  | 2 |  |  | `unlock: falsedoor` |
| `u-tar` | Nowa pułapka: Kocioł smoły | Na drzwi. Smoła: ogień, Oblany i spowolniony. Z ogniem obok robi Pożar. | unlock | zwykła |  |  | 2 |  |  | `unlock: tar` |
| `u-bait` | Nowy łup: Przynęta | Wygląda jak sakwa monet. Kto ją podniesie, jest Unieruchomiony i ranny; przynęta zostaje. | unlock | zwykła |  |  | 2 |  |  | `unlock: bait` |
| `u-skeleton` | Nowy potwór: Szkielet | Powalony pierwszy raz w fali składa się po 5 s z połową życia. | unlock | zwykła |  |  | 2 |  |  | `unlock: skeleton` |
| `u-zombie` | Nowy potwór: Zombie | Zaraża walczących; Zarażony, który zginie, wstaje jako Twój zombie. | unlock | zwykła |  |  | 2 |  |  | `unlock: zombie` |
| `u-lich` | Nowy potwór: Licz | Raz na falę podnosi powalonego potwora w swoim pokoju i straszy wokół. | unlock | zwykła |  |  | 3 |  |  | `unlock: lich` |
| `u-imp` | Nowy potwór: Chochlik | Latający złodziejaszek: kradnie przedmioty i rzuca je jako łup w innym pokoju. | unlock | zwykła |  |  | 2 |  |  | `unlock: imp` |
| `u-hound` | Nowy potwór: Ogar piekielny | Poluje na uciekających i spanikowanych (×2). | unlock | zwykła |  |  | 2 |  |  | `unlock: hound` |
| `u-siren` | Nowy potwór: Kusicielka | Zew wabi najmniej odważnego i odłącza go od drużyny. | unlock | zwykła |  |  | 2 |  |  | `unlock: siren` |
| `u-demon` | Nowy potwór: Demon otchłani | Ogromny i ognisty, ale dopóki stoi, głód każdej fali +2. | unlock | zwykła |  |  | 3 |  |  | `unlock: demon` |
| `u-sapper` | Nowy potwór: Goblin saper | Rozrzuca kolczatki przy bohaterach. | unlock | zwykła |  |  | 3 |  |  | `unlock: sapper` |
| `u-warlord` | Nowy potwór: Herszt goblinów | Zielonoskórzy przy nim biją 1,5 raza mocniej. | unlock | zwykła |  |  | 3 |  |  | `unlock: warlord` |
| `u-rats` | Nowy potwór: Rój szczurów | Tani rój, który rośnie z każdą przeżytą falą. | unlock | zwykła |  |  | 2 |  |  | `unlock: rats` |
| `regrow` | Odrost | Od razu: serce odrasta jeden utracony kryształ (do maksimum). | instant | rzadka |  |  | 1 |  | `heart`, tylko Dar serca | `() => { if (run.crystals < run.maxCrystals) { run.crystals += 1; run.regrowCount = (run.regrowCount \|\| 0) + 1; if (fl && fl.stats) fl.stats.regrow = (fl.stats.regrow \|\| 0) + 1; } }` |
| `heartcry` | Krzyk serca | Serce krzyczy głośniej: kradnący przy sercu tracą 10% odwagi na sekundę zamiast 6%. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.heartCry += 0.04; }` |
| `heavycrystal` | Ciężki kryształ | Wyrwanie kryształu trwa o 1,5 s dłużej. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.heavyCrystal += 1; }` |
| `heartroom` | Komora serca | Pokój serca mieści o 1 element więcej. | card | rzadka | tak |  | 1 | - | `heart` | `m => { m.heartRoom += 1; }` |
| `warden` | Strażnik | Potwory w pokoju serca mają +30% HP i biją o 30% mocniej. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.warden += 0.3; }` |
| `darkforge` | Kuźnia ciemności | Ulepszenia pułapek i potworów kosztują o 25% mniej. | card | rzadka |  |  | 1 | ess | `heart` | `m => { m.upgDisc = Math.min(0.6, m.upgDisc + 0.25); }` |
| `darklore` | Wiedza mroku | Sklep pokazuje o 1 kartę więcej. | card | rzadka | tak |  | 1 | - | `heart` | `m => { m.shopPlus += 1; }` |
| `heartmem` | Pamięć serca | Ulepszenie nie kasuje zapamiętanego wyniku skill checku. | card | rzadka | tak |  | 1 | - | `heart` | `m => { m.heartMem = true; }` |
| `tithe` | Dziesięcina | Danina rośnie z 30% do 45% (szybsze poziomy serca), a w rzędzie Dar serca wybierasz z 4 kart zamiast z 3. | card | rzadka |  |  | 1 | ess | `heart` | `m => { m.titheAdd += 0.15; m.titheChoice += 1; }` |
| `stoneheart` | Kamienne serce | Po fali serce potrzebuje z sakiewki tylko 75% braku: jeśli tyle masz, jest syte. Nasycenie rośnie za to o 25% wolniej. | card | rzadka |  |  | 1 | ess | `heart` | `m => { m.stoneHeart = true; m.satietyK *= 0.75; }` |
| `bloodcredit` | Kredyt krwi | Raz na run: gdy po fali sakiewka nie pokryje głodu, zamiast pęknięcia kryształu brakująca reszta ×2 dopisze się do głodu następnej fali (sakiewka zostaje). | card | rzadka | tak |  | 1 | - | `heart` | `m => { m.bloodCredit = true; }` |
| `glutton` | Głodomór | Serce chce o 20% więcej, ale Danina daje 2 razy więcej Nasycenia (Ofiara bez zmian). | card | legendarna | tak (od 1.27.5) |  | 1 | ess | do 1.27.4 `heart`; od 1.27.5 zwykła karta sklepu | `m => { m.hungerK *= 1.2; m.satietyK *= 2; }` |
| `bloodflow` | Krwiobieg | Każda wypłata combo ×2 lub więcej (5 różnych pułapek z rzędu) daje sercu +3 Nasycenia ponad Daninę. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.bloodflow += 3; }` |
| `kingsfeast` | Uczta królów | Uczta (bohater zabity przez potwora karmi serce) daje o 50% więcej. | card | rzadka |  |  | 1 | ess | `heart` | `m => { m.feastK *= 1.5; }` |
| `lastbreath` | Ostatni oddech | Gdy po rozliczeniu głodu sakiewka jest pusta, w następnej fali pułapki i potwory działają o 25% mocniej. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.lastBreath += 0.25; }` |
| `fearcrown` | Koronacja strachu | Łańcuch, w którym ktoś uciekł ze strachu, wypłaca 1,5 raza więcej Esencji. | card | legendarna |  |  | 1 | power |  | `m => { m.fearCrown *= 1.5; }` |
| `bloodbath` | Krwawa łaźnia | Każde zabójstwo w pokoju serca mnoży Esencję ×1,1 do końca fali (najwyżej ×2). | card | legendarna |  |  | 1 | power |  | `m => { m.bloodbath += 1; }` |
| `lonewolf` | Samotny wilk | Gdy w lochu został już tylko 1 bohater (z kilku), Esencja ×1,3. | card | rzadka |  |  | 1 | power |  | `m => { m.lonewolf *= 1.3; }` |
| `palette` | Pełna paleta | Gdy na starcie fali masz w lochu elementy z 5 lub więcej rodzin, Esencja ×1,25 przez całą falę. | card | rzadka |  |  | 1 | power |  | `m => { m.palette *= 1.25; }` |
| `minimalist` | Minimalista | Gdy na starcie fali masz w lochu najwyżej 12 pułapek i potworów, Esencja ×1,4 przez całą falę. | card | rzadka |  |  | 1 | power |  | `m => { m.minimalist *= 1.4; }` |
| `cursedcrown` | Przeklęta korona | Bohaterowie przychodzą o 1 poziom silniejsi, ale cała Esencja ×1,35. | card | legendarna |  |  | 1 | power |  | `m => { m.cursedCrown *= 1.35; m.crownLv += 1; }` |
| `skulls` | Kolekcja czaszek | Każdy bohater zabity w tym runie dodaje +0,03 do mnożnika Esencji (najwyżej +0,6, czyli ×1,6). | card | rzadka |  |  | 1 | power | rośnie | `m => { m.skulls += 1; }` |
| `execdiary` | Pamiętnik kata | Każde zabójstwo: ten rodzaj pułapki albo potwora działa o 2% mocniej do końca runu (najwyżej +30% na rodzaj). | card | zwykła |  |  | 1 | power |  | `m => { m.execDiary += 1; }` |
| `risinglegend` | Rosnąca legenda | Każda fala bez utraty kryształu: +0,1 chciwości na start fali, i tak dalej. Utrata kryształu zeruje licznik. | card | rzadka |  |  | 1 | power | rośnie | `m => { m.risingLegend += 1; }` |
| `pantry` | Spiżarnia | Fala, w której Danina dała sercu Nasycenia co najmniej za połowę głodu tej fali (bez Ofiary): dochód +2 do końca runu (najwyżej +10). | card | zwykła |  |  | 1 | power | rośnie | `m => { m.pantry += 1; }` |
| `copyist` | Kopista | Działa jak karta tuż po jego prawej w talii (nie kopiuje kart unikalnych ani innych kopiujących). Kolejność kart zmienisz w karcie talii. | card | legendarna | tak |  | 1 | - |  | `() => {}` |
| `soulmirror` | Lustro duszy | Działa jak pierwsza karta w talii (nie kopiuje kart unikalnych ani innych kopiujących). Kolejność kart zmienisz w karcie talii. | card | legendarna | tak |  | 1 | - |  | `() => {}` |
| `doubleedge` | Podwójne ostrze | Kolce trafiają Unieruchomionych i Spowolnionych drugi raz, z połową siły. | card | rzadka |  | `spikes` | 1 | named |  | `m => { m.doubleEdge += 0.5; }` |
| `sharedmech` | Wspólny mechanizm | W całym lochu ta sama pułapka odpalona ponownie też podbija combo (jak w Zębatkach). | card | rzadka | tak |  | 1 | - |  | `m => { m.sharedMech = true; }` |
| `chainreact` | Reakcja łańcuchowa | Każda reakcja (Pożar, Porażenie, Detonacja...) przedłuża okno combo o 1 s i podbija combo o 1. | card | rzadka |  |  | 1 | power |  | `m => { m.chainReact += 1; }` |
| `heartecho` | Echo serca | Pierwsza pułapka, która odpali po nasyceniu serca w fali, odpala dwa razy. | card | rzadka | tak |  | 1 | - |  | `m => { m.heartEcho = true; }` |
| `tarsulfur` | Smoła i siarka | Oblani (olej, smoła) dostają też o 30% więcej obrażeń kłutych. | card | zwykła |  | `() => run.unlocked.has('oilslick') \|\| run.unlocked.has('tar')` | 1 | power |  | `m => { m.tarSulfur += 0.3; }` |
| `conduct` | Przewodnictwo | Porażenie przeskakuje nie tylko na Mokrych, ale też na Spowolnionych w tym samym pokoju. | card | zwykła | tak | `bolt` | 1 | - |  | `m => { m.conduct = true; }` |
| `toxicfume` | Toksyczny opar | Trucizna i Zaraza kumulują się do 10 stosów zamiast 6, a Detonacja jest o 25% silniejsza. | card | zwykła |  | `() => ['miasma', 'zombie', 'rats', 'lcursed'].some(t => run.unlocked.has(t))` | 1 | power |  | `m => { m.toxicCap += 4; m.toxicDet *= 1.25; }` |
| `plague` | Morowe powietrze | Co 3 s Zaraza przeskakuje z każdego Zarażonego na bohaterów obok. | card | rzadka | tak | `() => run.unlocked.has('zombie') \|\| run.unlocked.has('rats')` | 1 | - |  | `m => { m.plagueAir = true; }` |
| `hellpack` | Piekielna sfora | Ogary biją uciekających 3 razy mocniej (zamiast 2), a uciekający biegną o 20% wolniej. | card | rzadka | tak | `hound` | 1 | - |  | `m => { m.hellPack = true; }` |
| `bonesunbroken` | Kości niezłomne | Szkielety składają się 2 razy więcej, a złożone biją o 20% mocniej. | card | zwykła |  | `skeleton` | 1 | named |  | `m => { m.bonesUp += 2; }` |
| `undyingarmy` | Nieśmiertelna armia | Bohater zabity przez nieumarłego potwora wstaje jako Twój szkielet do końca fali (najwyżej 3 na falę, bez miejsca). | card | legendarna | tak | `() => ['skeleton', 'zombie', 'lich'].some(t => run.unlocked.has(t))` | 1 | - |  | `m => { m.undyingArmy = true; }` |
| `abysspact` | Pakt z otchłanią | Apetyt demona otchłani o połowę mniejszy (+1 do głodu zamiast +2), a demony (chochlik, ogar, kusicielka, demon) biją o 20% mocniej. | card | rzadka |  | `() => ['imp', 'hound', 'siren', 'demon'].some(t => run.unlocked.has(t))` | 1 | power |  | `m => { m.abyssPact += 1; }` |
| `goldendream` | Złoty sen | Łup w pokoju serca i w pokojach obok kusi 1,5 raza mocniej, ale nie da się go podnieść: bohater próbuje 3 s i odchodzi. | card | rzadka | tak |  | 1 | - |  | `m => { m.goldenDream = true; }` |
| `croesus` | Krezus | Chciwość liczy się w Esencji do kwadratu (×2 daje ×4), ale poziomy bohaterów z chciwości rosną 1,5 raza szybciej. | card | legendarna | tak |  | 1 | - |  | `m => { m.croesus = true; }` |
| `heartpulse` | Puls serca | Gdy serce jest syte, pułapki i potwory w pokoju serca działają o 30% mocniej. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.heartPulse += 0.3; }` |

## B.5 Karty zmienione w 1.26

Wartości w tabeli głównej są już z 1.26; poprzednie (1.25.1) tutaj.

| Karta | Do 1.25.1 | Od 1.26 |
|---|---|---|
| `crystal` Żarłoczne serce | rzadka | legendarna, grupa Serce (w 1.26 w zwykłej ofercie i w rzędzie Dar serca, od 1.26.1 tylko w rzędzie) |
| `infusion` Zastrzyk Esencji | +20 Esencji | +15 Esencji |
| `monster` Weterani | opis bez dopisku | dopisek "bonus zostaje, gdy wstaną po powaleniu" (Odrodzenie) |
| `income` Mroczny dochód | +4 Esencji po fali | +3 |
| `usurer` Lichwiarz | 15% niewydanej, najwyżej 12 | najwyżej 10, "gdy serce już zabrało swoje" |
| `harvest` Żniwa strachu | +2 Esencji za ucieczkę | +3 |
| `collector` Kolekcjoner | +0,05 chciwości za rodzaj | +0,04 |
| `echo` Echo krzyku | Groza za ucieczkę ×2 | ×1,75 |
| `granary` Spichlerz dusz | -1 głodu za zabitego, bez limitu | najwyżej -40 na run |
| `arsenal` Pełen arsenał | 4 typy obrażeń z 4 | 4 z 5 (doszło porażenie) |
| `wager` Zakład z sercem | serce chce o 30% więcej | o 20% |
| `gluttony` Obżarstwo | "Esencja z fali wpada o 25% większa" | to samo, ale liczone po Daninie (tylko część do sakiewki) |

## B.6 Karty dodane w 1.26.1

Wszystkie z grupy Serce (`group: 'heart'`; od 1.27.5 poza `heartcore` i `resonance`, które z `glutton` są zwykłymi, unikalnymi legendami sklepu, brief "Serce hamuje" C), bez `req` i bez wpisu w `ONB_CARD` (etap 1); wypadają tylko w rzędzie Dar serca (sekcja 03, 3.15). Decyzja autora (25.10): karty Dar serca mają być rzadkie albo legendarne i przydatne w większości buildów. Kolumny jak w B.4.

| id | nazwa | opis w grze | rodzaj | rzadkość | unikalna | wymaga | etap | ★ | grupa / uwagi | efekt w kodzie |
|---|---|---|---|---|---|---|---|---|---|---|
| `heartguide` | Wola serca | Wszystkie pułapki i potwory działają o 10% mocniej. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.pactPower *= 1.1; }` |
| `heartdread` | Groza serca | Każdy strach w lochu jest o 15% silniejszy. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.fearMult *= 1.15; }` |
| `heartgreed` | Złote tętno | Każda fala zaczyna się z chciwością większą o 0,3. | card | rzadka |  |  | 1 | power | `heart` | `m => { m.greedStart += 0.3; }` |
| `heartpatience` | Cierpliwość serca | Bohaterowie zostają w lochu o 20 s dłużej, zanim skończy się im cierpliwość (więcej czasu na Esencję). | card | rzadka |  |  | 1 | power | `heart`; `mods.patience` dodawane do limitu cierpliwości w `p6_loop.js: step` | `m => { m.patience += 20; }` |
| `heartgrowth` | Rozrost serca | Od razu: talia ma na stałe o 1 miejsce więcej. | instant | rzadka |  |  | 1 |  | `heart` | `() => { run.deckSize += 1; }` |
| `heartcore` | Serce lochu | Cała Esencja ×1,2. | card | legendarna | tak (od 1.27.5) |  | 1 | power | do 1.27.4 `heart`; od 1.27.5 zwykła karta sklepu; mnożnik w `essMultNow` | `m => { m.heartCore *= 1.2; }` |
| `secondheart` | Drugie serce | Raz na run: kryształ wyniesiony z lochu przez złodzieja wraca do serca. | card | legendarna | tak |  | 1 | - | `heart`; `heroExit`, `run.secondHeartUsed`, `stats.secondHeart` (działa na każdego, kto wynosi kryształ, nie tylko złodzieja) | `m => { m.secondHeart = true; }` |
| `resonance` | Rezonans | Esencja +3% za każdą inną zwykłą kartę w talii (karty Daru serca się nie liczą, najwyżej +30%). | card | legendarna | tak |  | 1 | - | do 1.27.4 `heart`; od 1.27.5 zwykła karta sklepu; `essMultNow`: `1 + min(0,3; 0,03 × liczba różnych id zwykłych kart w run.deck)` (schowek i karty Daru się nie liczą; do 1.27.4 liczyły się wszystkie karty talii) | `m => { m.resonance = true; }` |

Ilustracje kart (`p7c_art.js`): heartguide `@pulse|up|heart`, heartdread `@skull|up|heart`, heartgreed `@crown|coin|heart`, heartpatience `@hourglass|time|heart`, heartgrowth `@heartAltar|plus|heart`, heartcore `@heartEcho|x2|heart`, secondheart `@crystal|loop|heart`, resonance `@book|chain|heart`; wszystkie w `HEART_IDS` (złota ramka), od 1.27.5 bez heartcore, resonance i glutton (zwykłe karty, ramka legendarnej).

## B.7 Karty zmienione w 1.26.1

| Karta | 1.26 | Od 1.26.1 |
|---|---|---|
| `heartcry` Krzyk serca, `heavycrystal` Ciężki kryształ, `darkforge` Kuźnia ciemności, `heartmem` Pamięć serca, `stoneheart` Kamienne serce, `kingsfeast` Uczta królów, `heartpulse` Puls serca | zwykła | rzadka (efekt bez zmian) |
| cała grupa Serce (także `crystal`) | zwykła oferta sklepu i darmowe karty za falę oraz rząd Dar serca (55/35/10%) | tylko rząd Dar serca, rzadkie 70%, legendarne 30% (`upgradePicks` pomija `group === 'heart'`) |
| `warden` Strażnik, `heartpulse` Puls serca, `lastbreath` Ostatni oddech, `execdiary` Pamiętnik kata | mnożyły walkę wręcz potworów i moc pułapek | mnożą też zdolności potworów odpalane checkiem (`trapBoost`, sekcja 05, 5.15.3) |
