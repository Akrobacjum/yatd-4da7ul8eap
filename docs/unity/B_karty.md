# Załącznik B: karty (UPGRADES) i ich efekty w kodzie

Wygenerowane z `src/p1_config.js` (Prototype 1.24; do 1.17.1: 1.12.1). Kolumna "efekt w kodzie" to dosłowna treść funkcji `apply` (dla kart `card` działa na obiekcie `mods`, `m` = mods; dla `instant` działa raz na `run`/`fl`). W Unity każdą kartę zapisz jako dane (id, nazwa, opis, rzadkość, unikalna, wymaganie, etap nauki, grupa łączenia) plus listę operacji na modyfikatorach (np. `spikeDmg *= 1.5`), a nie jako kod. Znaczenie pól `mods` i miejsca, gdzie kod je czyta: sekcja 03 (3.9), dla kart 1.18 także sekcje 05 (5.13) i 06 (6.3.14).

140 kart (1.18: 113 -> 140): 122 do talii (zwykłe 63, rzadkie 52, legendarne 7), 14 odblokowań, 4 jednorazowe. W 1.18 doszło 28 kart (24 "MUST" z propozycji i `badnews`, `coins`, `tainted`, `rhythm`), a usunięta została `u-portrait` (portret jest w `START_UNLOCKED`, karta nigdy nie mogła wypaść). Nie zrobione z propozycji: `challenge`, `contagion`, `spite`, `scouthunt`.

Kolumna "etap": etap nauki (`ONB_CARD`, a dla kart `unlock` `ONB_ITEM` odblokowywanego elementu), od którego karta może wypaść; od 1.24 w pierwszym runie etap 1 = od fali 1, 2 = od fali 3, 3 = od fali 5, 4 = od fali 7 (`ONB_WAVE`, sekcja 03, 5.3), w kolejnych runach wszystkie. Karty komnat i efektów (1.18) mają `req` "ten element jest w lochu" (`hasRk(k)` albo `hasRt(t)`) i nie wypadają bez niego. Kolumna "★": grupa łączenia (1.24, sekcja 03, 3.13): `named` (element o poziom wyżej), `power` (+10% mocy, ×2,75), `fear` (strach +15%), `hero` (+25%, ×3,125), `ess` (+2 Esencji po fali), `greed` (+0,1 chciwości), `shop` (darmowe odświeżenie); "-" = karta `unique`, nie łączy się. Ceny: zwykła 6, rzadka 10, legendarna 16, odblokowanie 8 Esencji (`priceOf`, przed zniżką Pośrednika); sprzedaż połączonej ★ za cenę dwóch.

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
| `crystal` | Żarłoczne serce | Od razu: serce dostaje dodatkowy kryształ (także maksymalnie, do końca runu). | instant | rzadka |  |  | 1 |  | `() => { run.crystals += 1; run.maxCrystals += 1; }` |
| `infusion` | Zastrzyk Esencji | Od razu: +20 Esencji. | instant | zwykła |  |  | 1 |  | `() => { fl.essence += 20; run.essence = fl.essence; }` |
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
| `monster` | Weterani | Nowo postawione potwory mają +40% HP i biją o 40% mocniej. | card | zwykła |  |  | 1 | power | `m => { m.monster *= 1.4; }` |
| `loottrap` | Zatruty łup | Podniesienie łupu zadaje obrażenia (więcej przy rzadszym). | card | zwykła |  |  | 1 | power | `m => { m.lootTrap += 15; }` |
| `disarm` | Zardzewiałe zamki | Złodziej rozbraja 2 razy wolniej (masz więcej czasu, żeby go przyłapać). | card | zwykła |  |  | 1 | hero | `m => { m.disarm *= 2; }` |
| `suicide` | Mechanizm samobójczy | Rozbrajana pułapka ma 30% szans, że odpali w twarz rozbrajającemu. | card | zwykła |  |  | 1 | power | `m => { m.suicideMech += 0.3; }` |
| `essence` | Żyła esencji | Esencja z Grozy +30% (Groza × Chciwość × Combo × 1,3). | card | zwykła |  |  | 1 | ess | `m => { m.regen *= 1.3; }` |
| `income` | Mroczny dochód | +4 Esencji po każdej fali. | card | zwykła |  |  | 1 | ess | `m => { m.income += 4; }` |
| `usurer` | Lichwiarz | Po fali dostajesz 15% niewydanej Esencji (najwyżej 12). | card | zwykła |  |  | 1 | ess | `m => { m.usurer += 0.15; }` |
| `dig` | Kopacze | Pokój i przejście kosztują o 2 Esencji mniej. | card | zwykła |  |  | 1 | ess | `m => { m.digDiscount += 2; }` |
| `mole` | Kret | Co drugą falę jedno kopanie pokoju za darmo. | card | zwykła |  |  | 1 | ess | `m => { m.mole += 1; }` |
| `harvest` | Żniwa strachu | Każdy bohater, który ucieknie ze strachu, daje dodatkowo 2 Esencji (bez mnożników). | card | zwykła |  |  | 2 | ess | `m => { m.fearHarvest += 2; }` |
| `soul` | Żniwiarz | Śmierć bohatera daje 2 razy więcej Grozy. | card | rzadka |  |  | 1 | ess | `m => { m.soulMult *= 2; }` |
| `greed` | Złote runo | Zobaczony łup podbija chciwość o połowę mocniej. | card | zwykła |  |  | 1 | greed | `m => { m.greedMult *= 1.5; }` |
| `fever` | Gorączka złota | Każda fala zaczyna z chciwością wyższą o 0,3. | card | zwykła |  |  | 1 | greed | `m => { m.greedStart += 0.3; }` |
| `depth` | Głębia mroku | Mnożnik pokoju z sercem i pokoi tuż przed nim +0,5. | card | zwykła |  |  | 1 | greed | `m => { m.depthBonus += 0.5; }` |
| `infamous` | Zła sława | Każdy kryształ w sercu daje +0,15 chciwości (liczone na starcie fali). | card | zwykła |  |  | 1 | greed | `m => { m.crystalPts += 0.15; }` |
| `collector` | Kolekcjoner | +0,05 chciwości za każdy inny rodzaj pułapki lub potwora w lochu (na starcie fali). | card | rzadka |  |  | 1 | greed | `m => { m.collector += 0.05; }` |
| `miser` | Skąpiec | +0,05 chciwości za każdy element mniej niż 15 w lochu (pułapki i potwory, na starcie fali). | card | rzadka |  |  | 1 | greed | `m => { m.miser += 0.05; }` |
| `lonely` | Echo samotności | Samotność bohatera daje 2 razy więcej Grozy. | card | rzadka |  |  | 1 | fear | `m => { m.loneMult *= 2; }` |
| `maze` | Kręte korytarze | Zgubiony bohater daje 2 razy więcej Grozy (Groza ze zgubienia płynie przez jego pierwsze 12 s). | card | rzadka |  |  | 1 | fear | `m => { m.lostMult *= 2; }` |
| `haunt` | Nawiedzenie | Każdy strach jest o 25% silniejszy (więcej Grozy, szybsze ucieczki). | card | zwykła |  |  | 2 | fear | `m => { m.fearMult *= 1.25; }` |
| `echo` | Echo krzyku | Bohater, który ucieknie ze strachu, daje 2 razy więcej Grozy. | card | rzadka |  |  | 2 | fear | `m => { m.scareMult *= 2; }` |
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
| `granary` | Spichlerz dusz | Każdy zabity bohater zmniejsza głód serca o 1 do końca runu. | card | zwykła |  |  | 1 | ess | `m => { m.granary += 1; }` |
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
| `arsenal` | Pełen arsenał | Jeśli na starcie fali masz w lochu wszystkie 4 typy obrażeń, wszystkie obrażenia +20%. | card | rzadka |  |  | 1 | power | `m => { m.arsenal += 0.2; }` |
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
| `wager` | Zakład z sercem | Chciwość +0,8, ale serce chce o 30% więcej. | card | legendarna |  |  | 1 | ess | `m => { m.greedFlat += 0.8; m.hungerK *= 1.3; }` |
| `gluttony` | Obżarstwo | Gdy serce jest już syte, Esencja z fali wpada o 25% większa. | card | rzadka |  |  | 1 | ess | `m => { m.storeK *= 1.25; }` |
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

## B.3 Rozkład grup łączenia (1.24)

| Grupa | Liczba kart | Karty |
|---|---|---|
| `named` | 16 (3 z nich `unique`: arrows, spider, ghost) | spikes, powder, arrows, gate, web, fire, mimic, trapdoor, cage, portrait, spider, ghost, hgallery, wildfire, choir, cageghost |
| `power` | 39 (w tym `unique` bez wpisu: trails, well, nopick, anatomy, reliquary, quickarm, thickwalls, risen, cell, vaultsnap, falsecall, restock, ambush) | cooldown, walls, monster, loottrap, suicide, trails, sticky, blood, calm, well, echofire, nopick, gambler, hunger, chronicle, tempered, bloodpact, overload, firepit, sharp, heavy, oil, venom, anatomy, arsenal, reliquary, pack, quickarm, thickwalls, risen, cell, vaultsnap, falsecall, restock, ambush, cauldron, skullwall, gearlink, rhythm |
| `fear` | 21 | lonely, maze, haunt, echo, panic, monsterroar, nightmares, scars, memories, dread, screams, isolation, heavyair, lastgasp, body, frames, lullsleep, cocoons, batscatter, farecho, deepsleep |
| `hero` | 16 | disarm, curse, deaf, cursed, weakspot, oddbodies, survivors, drawers, lure, onemore, wisps, strip, mire, blackice, badnews, tainted |
| `ess` | 14 | essence, income, usurer, dig, mole, harvest, soul, granary, bank, cheapwalls, wager, gluttony, fasting, heartbeat |
| `greed` | 10 | greed, fever, depth, infamous, collector, miser, glass, gilded, golddust, coins |
| `shop` | 6 | broker, luckydraw, pawnshop, deepstash, patron, hoard |
