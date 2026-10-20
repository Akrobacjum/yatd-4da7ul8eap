# Załącznik B: karty (UPGRADES) i ich efekty w kodzie

Wygenerowane z `src/p1_config.js` (Prototype 1.12.1). Kolumna "efekt w kodzie" to dosłowna treść funkcji `apply` (dla kart `card` działa na obiekcie `mods`, `m` = mods; dla `instant` działa raz na `run`/`fl`). W Unity każdą kartę zapisz jako dane (id, nazwa, opis, rzadkość, unikalna, wymaganie, etap nauki) plus listę operacji na modyfikatorach (np. `spikeDmg *= 1.5`), a nie jako kod. Znaczenie pól `mods` i miejsca, gdzie kod je czyta: sekcja 03 (tabela modyfikatorów).

Kolumna "run od": etap pierwszych runów (1.12), od którego karta może wypaść w sklepie (`ONB_CARD`, a dla kart `unlock` `ONB_ITEM` odblokowywanego elementu); 1 = od pierwszego runu. Ceny: zwykła 6, rzadka 10, legendarna 16, odblokowanie 8 Esencji (`priceOf`, przed zniżką Pośrednika).

| id | nazwa | opis w grze | rodzaj | rzadkość | unikalna | wymaga | run od | efekt w kodzie |
|---|---|---|---|---|---|---|---|---|
| `u-web` | Nowa pułapka: Sieć | Na podłogę. Spowalnia w kwadracie 3×3, bohater w sieci dostaje +30% obrażeń. | unlock | zwykła |  |  | 1 | `unlock: web` |
| `u-fire` | Nowa pułapka: Ogień | Na ścianę. Płomień 2×3 pola i podpalenie. | unlock | zwykła |  |  | 1 | `unlock: fire` |
| `u-mimic` | Nowa pułapka: Mimik | Na obiekt. Mebel gryzie wszystkich dookoła. | unlock | zwykła |  |  | 1 | `unlock: mimic` |
| `u-cage` | Nowa pułapka: Klatka | Na podłogę. Więzi bohatera; jeśli drużyna go nie uwolni, umiera w klatce. | unlock | zwykła |  |  | 1 | `unlock: cage` |
| `u-portrait` | Nowa pułapka: Portret | Na ścianę. Nie rani, tylko straszy cały kawałek pokoju. | unlock | zwykła |  |  | 2 | `unlock: portrait` |
| `u-spider` | Nowy potwór: Pająk | Blokuje przejście, gryzie i oplata siecią. | unlock | zwykła |  |  | 1 | `unlock: spider` |
| `u-ogre` | Nowy potwór: Ogr | Dużo życia, bije wszystkich, którzy z nim walczą. | unlock | zwykła |  |  | 1 | `unlock: ogre` |
| `u-shaman` | Nowy potwór: Szaman | Leczy potwory dookoła, w skill checku cały pokój. | unlock | zwykła |  |  | 1 | `unlock: shaman` |
| `u-ghost` | Nowy potwór: Duch | Krąży przy bohaterach i ich straszy. Tkną go tylko kapłan i mag. | unlock | zwykła |  |  | 2 | `unlock: ghost` |
| `u-mirror` | Nowa pułapka: Lustro | Na ścianę. Straszy tym mocniej, im bardziej bohater już się boi. | unlock | zwykła |  |  | 2 | `unlock: mirror` |
| `u-creak` | Nowa pułapka: Zawiasy | Na drzwi. Skrzypią i mocno straszą każdego w progu. | unlock | zwykła |  |  | 2 | `unlock: creak` |
| `u-coffin` | Nowa pułapka: Trumna | Na podłogę. Bardzo mocno straszy najbliższego bohatera, w Krypcie jeszcze mocniej. | unlock | zwykła |  |  | 2 | `unlock: coffin` |
| `u-musicbox` | Nowa pułapka: Pozytywka | Na obiekt. Kołysanka straszy cały pokój przez kilka sekund. | unlock | zwykła |  |  | 2 | `unlock: musicbox` |
| `u-shade` | Nowy potwór: Cień | Sunie za samotnym bohaterem i szepcze. Rani go tylko kapłan. | unlock | zwykła |  |  | 2 | `unlock: shade` |
| `u-bats` | Nowy potwór: Nietoperze | Szybki rój: gryzie, straszy i płoszy bohaterów. | unlock | zwykła |  |  | 2 | `unlock: bats` |
| `crystal` | Żarłoczne serce | Od razu: serce dostaje dodatkowy kryształ (także maksymalnie, do końca runu). | instant | rzadka |  |  | 1 | `() => { run.crystals += 1; run.maxCrystals += 1; }` |
| `infusion` | Zastrzyk Esencji | Od razu: +20 Esencji, nawet ponad pojemność. | instant | zwykła |  |  | 1 | `() => { fl.essence += 20; run.essence = fl.essence; }` |
| `gift` | Hojny kupiec | Od razu: 2 darmowe karty do wybrania w sklepie. | instant | rzadka |  |  | 1 | `() => { run.freePicks = (run.freePicks \|\| 0) + 2; }` |
| `pact` | Pakt | Do końca runu +1 miejsce w talii, ale serce traci 1 kryształ (także maksymalnie, zawsze zostaje co najmniej 1). | instant | legendarna |  |  | 1 | `() => { run.deckSize += 1; run.maxCrystals = Math.max(1, run.maxCrystals - 1); run.crystals = Math.max(1, Math.min(run.crystals - 1, run.maxCrystals)); }` |
| `spikes` | Ostrzejsze kolce | Kolce zadają +50% obrażeń. | card | zwykła |  |  | 1 | `m => { m.spikeDmg *= 1.5; }` |
| `cooldown` | Szybkie przeładowanie | Odnowienie wszystkich pułapek krótsze o 25%. | card | zwykła |  |  | 1 | `m => { m.cooldown *= 0.75; }` |
| `walls` | Głodne ściany | Strzały, ogień i portrety przeładowują się o 20% szybciej. | card | zwykła |  |  | 1 | `m => { m.wallCd *= 0.8; }` |
| `powder` | Więcej prochu | Wybuch prochu sięga o 1 pole dalej. | card | zwykła |  |  | 1 | `m => { m.powderR += 1; }` |
| `arrows` | Płonące groty | Strzały podpalają trafionych. | card | rzadka | tak |  | 1 | `m => { m.arrowBurn = true; }` |
| `gate` | Ciężka krata | Każda krata wytrzymuje 2 zamknięcia więcej i miażdży o 50% mocniej. | card | zwykła |  |  | 1 | `m => { m.gateUses += 2; m.gateCrush *= 1.5; }` |
| `web` | Lepka sieć | Sieć trzyma 2 razy dłużej. | card | zwykła |  | `web` | 1 | `m => { m.webDur *= 2; }` |
| `fire` | Smocza smoła | Ogień zadaje +50% obrażeń. | card | zwykła |  | `fire` | 1 | `m => { m.fireDmg *= 1.5; }` |
| `mimic` | Wygłodniały mimik | Mimik gryzie o 50% mocniej. | card | zwykła |  | `mimic` | 1 | `m => { m.mimicDmg *= 1.5; }` |
| `trapdoor` | Głęboka zapadnia | Spadający bohater leci dłużej (+4 s) i obija się o 50% mocniej. | card | zwykła |  |  | 1 | `m => { m.fallTime += 4; m.fallDmg *= 1.5; }` |
| `cage` | Żelazne klatki | Klatka trzyma 2 razy dłużej (drużyna ma więcej czasu na ratunek), a uwięziony boi się o 50% bardziej. | card | zwykła |  | `cage` | 1 | `m => { m.cageTime *= 2; m.cageFear *= 1.5; }` |
| `portrait` | Galeria grozy | Portret sięga o 2 pola dalej i straszy o 30% mocniej. | card | zwykła |  | `portrait` | 1 | `m => { m.portraitR += 2; m.portraitFear *= 1.3; }` |
| `spider` | Pajęcze gniazdo | Ugryzienie pająka oplata siecią cały kwadrat 3×3. | card | rzadka | tak | `spider` | 1 | `m => { m.spiderNest = true; }` |
| `ghost` | Zimny dotyk | Duch straszy o 50% mocniej, a zranić go może już tylko kapłan. | card | rzadka | tak | `ghost` | 1 | `m => { m.ghostAura *= 1.5; m.ghostPriestOnly = true; }` |
| `monster` | Weterani | Nowo postawione potwory mają +40% HP i biją o 40% mocniej. | card | zwykła |  |  | 1 | `m => { m.monster *= 1.4; }` |
| `loottrap` | Zatruty łup | Podniesienie łupu zadaje obrażenia (więcej przy rzadszym). | card | zwykła |  |  | 1 | `m => { m.lootTrap += 15; }` |
| `disarm` | Zardzewiałe zamki | Złodziej rozbraja 2 razy wolniej (masz więcej czasu, żeby go przyłapać). | card | zwykła |  |  | 1 | `m => { m.disarm *= 2; }` |
| `suicide` | Mechanizm samobójczy | Rozbrajana pułapka ma 30% szans, że odpali w twarz rozbrajającemu. | card | zwykła |  |  | 1 | `m => { m.suicideMech += 0.3; }` |
| `essence` | Żyła esencji | Esencja z Grozy +30% (Groza × Chciwość × Combo × 1,3). | card | zwykła |  |  | 1 | `m => { m.regen *= 1.3; }` |
| `income` | Mroczny dochód | +4 Esencji po każdej fali. | card | zwykła |  |  | 1 | `m => { m.income += 4; }` |
| `usurer` | Lichwiarz | Po fali dostajesz 15% niewydanej Esencji (najwyżej 12). | card | zwykła |  |  | 1 | `m => { m.usurer += 0.15; }` |
| `dig` | Kopacze | Pokój i przejście kosztują o 2 Esencji mniej. | card | zwykła |  |  | 1 | `m => { m.digDiscount += 2; }` |
| `mole` | Kret | Co drugą falę jedno kopanie pokoju za darmo. | card | zwykła |  |  | 1 | `m => { m.mole += 1; }` |
| `harvest` | Żniwa strachu | Każdy bohater, który ucieknie ze strachu, daje dodatkowo 2 Esencji (bez mnożników). | card | zwykła |  |  | 2 | `m => { m.fearHarvest += 2; }` |
| `soul` | Żniwiarz | Śmierć bohatera daje 2 razy więcej Grozy. | card | rzadka |  |  | 1 | `m => { m.soulMult *= 2; }` |
| `greed` | Złote runo | Zobaczony łup podbija chciwość o połowę mocniej. | card | zwykła |  |  | 1 | `m => { m.greedMult *= 1.5; }` |
| `fever` | Gorączka złota | Każda fala zaczyna z chciwością wyższą o 0,3. | card | zwykła |  |  | 1 | `m => { m.greedStart += 0.3; }` |
| `depth` | Głębia mroku | Mnożnik pokoju z sercem i pokoi tuż przed nim +0,5. | card | zwykła |  |  | 1 | `m => { m.depthBonus += 0.5; }` |
| `infamous` | Zła sława | Każdy kryształ w sercu daje +0,15 chciwości (liczone na starcie fali). | card | zwykła |  |  | 1 | `m => { m.crystalPts += 0.15; }` |
| `collector` | Kolekcjoner | +0,05 chciwości za każdy inny rodzaj pułapki lub potwora w lochu (na starcie fali). | card | rzadka |  |  | 1 | `m => { m.collector += 0.05; }` |
| `miser` | Skąpiec | +0,05 chciwości za każdy element mniej niż 15 w lochu (pułapki i potwory, na starcie fali). | card | rzadka |  |  | 1 | `m => { m.miser += 0.05; }` |
| `lonely` | Echo samotności | Samotność bohatera daje 2 razy więcej Grozy. | card | rzadka |  |  | 1 | `m => { m.loneMult *= 2; }` |
| `maze` | Kręte korytarze | Zgubiony bohater daje 2 razy więcej Grozy. | card | rzadka |  |  | 1 | `m => { m.lostMult *= 2; }` |
| `haunt` | Nawiedzenie | Każdy strach jest o 25% silniejszy (więcej Grozy, szybsze ucieczki). | card | zwykła |  |  | 2 | `m => { m.fearMult *= 1.25; }` |
| `echo` | Echo krzyku | Bohater, który ucieknie ze strachu, daje 2 razy więcej Grozy. | card | rzadka |  |  | 2 | `m => { m.scareMult *= 2; }` |
| `panic` | Panika | Bohater, który zaczyna uciekać, straszy wszystkich w promieniu 3 pól (25 strachu). | card | rzadka |  |  | 2 | `m => { m.panic += 1; }` |
| `hgallery` | Nawiedzona galeria | Duch w pokoju z portretem straszy 2 razy mocniej. | card | rzadka |  | `ghost` | 1 | `m => { m.hauntedGallery += 1; }` |
| `curse` | Klątwa kryształu | Niosący kryształ idzie o 35% wolniej i boi się coraz bardziej. | card | rzadka |  |  | 1 | `m => { m.carrierSlow *= 0.65; m.carrierFear += 4; }` |
| `deaf` | Głuche ściany | Uciekinierzy pamiętają tylko połowę tego, co widzieli. | card | rzadka |  |  | 1 | `m => { m.rumorKeep *= 0.5; }` |
| `trails` | Fałszywe tropy | Uciekinierzy opowiadają też o pułapkach, których nie ma. Następna fala omija puste miejsca. | card | rzadka | tak |  | 1 | `m => { m.falseTrails = true; }` |
| `cursed` | Rdza | Przedmioty bohaterów (także z ich wyposażenia) działają o połowę słabiej. | card | rzadka |  |  | 1 | `m => { m.itemPower *= 0.5; }` |
| `sticky` | Lepkie kolce | Kolce zadają 2 razy więcej bohaterom oplątanym siecią lub pajęczyną. | card | rzadka |  | `() => run.unlocked.has('web') \|\| run.unlocked.has('spider')` | 1 | `m => { m.stickySpikes += 1; }` |
| `wildfire` | Pożoga | Podpalenie przeskakuje na bohaterów w promieniu 1,5 pola (każda kolejna kopia +0,5 pola). | card | rzadka |  | `fire` | 1 | `m => { m.wildfire += 1; }` |
| `blood` | Krwawy rytuał | Każde zabójstwo w tej fali wzmacnia pułapki o 10% (obrażenia, strach, czas działania) do końca fali. | card | rzadka |  |  | 1 | `m => { m.bloodRite += 0.1; }` |
| `calm` | Cisza przed burzą | Pułapka, która nie odpaliła od 20 s (albo jeszcze wcale w tej fali), działa 2,5 raza mocniej (kolejna kopia: 4 razy, 5,5 raza...). | card | rzadka |  |  | 1 | `m => { m.calmStorm += 1.5; }` |
| `well` | Bezdenna studnia | Bohater z kryształem, który spadnie w zapadnię, gubi go w ciemności: kryształ wraca do serca. | card | rzadka | tak |  | 1 | `m => { m.bottomless = true; }` |
| `echofire` | Echo mechanizmów | Co 5. odpalenie pułapki odpala ją drugi raz (kolejna kopia: co 4., co 3...). | card | rzadka |  |  | 1 | `m => { m.echoFire += 1; }` |
| `glass` | Szklane serce | Chciwość +1, ale bohaterowie wyważają kryształ 2 razy szybciej. | card | legendarna |  |  | 1 | `m => { m.glass += 1; }` |
| `nopick` | Odwrotna chciwość | Bohaterowie zabierają łup jak zwykle, ale zabrany łup podbija chciwość 3 razy mocniej. Opłaca się dać im coś ukraść. | card | legendarna | tak |  | 1 | `m => { m.pickGreed *= 3; }` |
| `gambler` | Hazardzista | Krytyk w skill checku uderza ×1,35 mocniej (×2,4 zamiast ×1,8), ale draśnięcie tylko ×0,4 zamiast ×0,7. | card | legendarna |  |  | 1 | `m => { m.critPw *= 1.35; m.okPw *= 0.57; }` |
| `choir` | Chór potępionych | Odpalony portret odpala też wszystkie gotowe portrety w tym samym pokoju (z 60% mocy, każda kolejna kopia +40%). | card | legendarna |  | `portrait` | 1 | `m => { m.choir += 1; }` |
| `hunger` | Głodne kolce | Kolce zadają do końca runu +4% obrażeń za każde zabójstwo kolcami (licznik rośnie przez cały run). | card | rzadka |  |  | 1 | `m => { m.hunger += 1; }` |
| `chronicle` | Kronika grozy | Strach jest o 3% silniejszy za każdego bohatera, który w tym runie uciekł ze strachu (do końca runu). | card | rzadka |  |  | 2 | `m => { m.chronicle += 1; }` |
| `granary` | Spichlerz dusz | Każdy zabity bohater zmniejsza głód serca o 1 do końca runu. | card | zwykła |  |  | 1 | `m => { m.granary += 1; }` |
| `bank` | Skarbiec | Każda fala bez utraty kryształu dodaje +2 Esencji do przychodu po każdej kolejnej fali (do końca runu). | card | zwykła |  |  | 1 | `m => { m.bank += 1; }` |
| `tempered` | Zaprawione mechanizmy | Pułapki działają o 1% mocniej za każde 4 trafienia pułapek w tym runie (do końca runu). | card | rzadka |  |  | 1 | `m => { m.tempered += 1; }` |
| `bloodpact` | Krwawa umowa | Pułapki i potwory działają ×1,6 mocniej, ale bohaterowie przychodzą o 2 poziomy silniejsi. | card | legendarna |  |  | 1 | `m => { m.pactPower *= 1.6; m.pactLevels += 2; }` |
| `overload` | Przeciążenie | Pułapki odnawiają się o 40% szybciej, ale każde odpalenie ma 6% szans zepsuć pułapkę do końca fali. | card | rzadka |  |  | 1 | `m => { m.cooldown *= 0.6; m.overload += 0.06; }` |
| `cheapwalls` | Tanie mury | Rozbudowa pokoi kosztuje o połowę mniej, ale budowle są o 50% droższe. | card | zwykła |  |  | 3 | `m => { m.expandCost *= 0.5; m.buildingCost *= 1.5; }` |
| `firepit` | Ognista otchłań | Bohater, który spadnie przez zapadnię, wychodzi podpalony. | card | rzadka |  |  | 1 | `m => { m.firepit += 1; }` |
| `cageghost` | Nawiedzone klatki | Uwięziony w klatce dostaje 12 strachu na sekundę. | card | rzadka |  | `cage` | 2 | `m => { m.cageHaunt += 12; }` |
| `monsterroar` | Ryk potworów | Rany zadane przez potwory straszą 2,5 raza mocniej (kolejna kopia: 4 razy...). | card | zwykła |  |  | 2 | `m => { m.monsterFear += 1.5; }` |
| `sharp` | Hartowane ostrza | Obrażenia kłute (kolce, strzały, łucznik, goblin, mimik) +25%. | card | zwykła |  |  | 1 | `m => { m.dmgType.pierce *= 1.25; }` |
| `heavy` | Ciężkie mechanizmy | Obrażenia obuchowe (krata, ogr, upadek w zapadnię) +25%. | card | zwykła |  |  | 1 | `m => { m.dmgType.blunt *= 1.25; }` |
| `oil` | Olej w szczelinach | Obrażenia od ognia (ogień, proch, podpalenia) +25%. | card | zwykła |  |  | 1 | `m => { m.dmgType.fire *= 1.25; }` |
| `venom` | Jadowite gruczoły | Obrażenia od trucizny (pająk, szaman, Zatruty łup) +30%. | card | zwykła |  |  | 1 | `m => { m.dmgType.poison *= 1.3; }` |
| `weakspot` | Słabe punkty | Słabości ciała bohaterów działają 2 razy mocniej (np. kruche kości: obuchowe +80% zamiast +40%). | card | rzadka |  |  | 4 | `m => { m.weakK += 1; }` |
| `anatomy` | Anatomia ofiar | Przed falą znasz ciało i fobie każdego bohatera. | card | rzadka | tak |  | 4 | `m => { m.revealAll = true; }` |
| `arsenal` | Pełen arsenał | Jeśli na starcie fali masz w lochu wszystkie 4 typy obrażeń, wszystkie obrażenia +20%. | card | rzadka |  |  | 1 | `m => { m.arsenal += 0.2; }` |
| `nightmares` | Koszmary | Fobie straszą 3 razy mocniej zamiast 2 (kolejna kopia: 4 razy). | card | rzadka |  |  | 4 | `m => { m.phobiaK += 1; }` |
| `oddbodies` | Przeklęta karczma | Więcej bohaterów przychodzi z fobią albo słabością ciała (+10% szans na każdą). | card | zwykła |  |  | 4 | `m => { m.oddBodies += 1; }` |
| `scars` | Blizny na duszy | Trauma łapie już poniżej 50% HP i straszy 2 razy (zamiast 1,5 raza). | card | rzadka |  |  | 4 | `m => { m.traumaK += 1; }` |
| `memories` | Złe wspomnienia | Powracający bohaterowie wchodzą do lochu z 30% strachu. | card | rzadka |  |  | 4 | `m => { m.badMemories += 0.3; }` |
| `survivors` | Legenda ocalałych | Uciekinierzy wracają 1,5 raza częściej, a każdy powracający w drużynie daje +0,2 chciwości. | card | zwykła |  |  | 4 | `m => { m.moreReturn += 0.5; m.returnGreed += 0.2; }` |
| `dread` | Gęsta atmosfera | Strach bohaterów opada o połowę wolniej. | card | zwykła |  |  | 2 | `m => { m.calmK *= 0.5; }` |
| `screams` | Krzyki w ścianach | Każdy bohater, który ucieknie ze strachu, straszy pozostałych (10% ich odwagi). | card | zwykła |  |  | 2 | `m => { m.fleeShock += 0.1; }` |
| `isolation` | Izolacja | Samotny albo zgubiony bohater boi się wszystkiego o 25% bardziej, a sama samotność straszy go 2 razy mocniej. | card | rzadka |  |  | 2 | `m => { m.isolation += 1; }` |
| `heavyair` | Ciężkie powietrze | W Mgle i w Krypcie każdy strach jest o 25% silniejszy. | card | zwykła |  |  | 3 | `m => { m.heavyAir += 0.25; }` |
| `lastgasp` | Ostatnie tchnienie | Umierający bohater straszy wszystkich w swoim pokoju (20% ich odwagi). | card | rzadka |  |  | 2 | `m => { m.lastGasp += 0.2; }` |
| `broker` | Pośrednik | Karty w sklepie kosztują o 25% mniej. | card | zwykła |  |  | 1 | `m => { m.shopDisc += 0.25; }` |
| `luckydraw` | Szczęśliwy los | Pierwsze odświeżenie sklepu w każdej fali jest darmowe. | card | zwykła |  |  | 1 | `m => { m.freeReroll += 1; }` |
| `pawnshop` | Lombard | Sprzedane karty dają 2 razy więcej Esencji. | card | zwykła |  |  | 1 | `m => { m.sellK *= 2; }` |
| `deepstash` | Głęboki schowek | Schowek mieści 2 karty więcej. | card | rzadka |  |  | 1 | `m => { m.stashPlus += 2; }` |
| `patron` | Mecenas | Co drugą falę dostajesz dodatkową darmową kartę. | card | rzadka |  |  | 1 | `m => { m.patron += 1; }` |
| `hoard` | Kolekcja w schowku | Każda karta w schowku daje +0,1 chciwości. | card | rzadka |  |  | 1 | `m => { m.stashGreed += 0.1; }` |
| `wager` | Zakład z sercem | Chciwość +0,8, ale serce chce o 30% więcej. | card | legendarna |  |  | 1 | `m => { m.greedFlat += 0.8; m.hungerK *= 1.3; }` |
| `gluttony` | Obżarstwo | Gdy serce jest już syte, Esencja z fali wpada o 25% większa. | card | rzadka |  |  | 1 | `m => { m.storeK *= 1.25; }` |
| `fasting` | Post | Serce chce o 15% mniej, ale chciwość -0,2. | card | zwykła |  |  | 1 | `m => { m.hungerK *= 0.85; m.greedFlat -= 0.2; }` |
| `heartbeat` | Bijące serce | Gdy serce jest już syte w tej fali, pułapki i potwory działają o 20% mocniej. | card | rzadka |  |  | 1 | `m => { m.heartbeat += 0.2; }` |
| `gilded` | Pozłacane pułapki | +0,05 chciwości za każdą pułapkę i potwora na poziomie 2 lub 3. | card | zwykła |  |  | 1 | `m => { m.gilded += 0.05; }` |
| `golddust` | Złoty pył | Monety podbijają chciwość o połowę mocniej. | card | zwykła |  |  | 1 | `m => { m.goldDust += 0.5; }` |
| `reliquary` | Relikwiarz | Relikwie podbijają chciwość 1,5 raza mocniej, a bohater, który zabierze relikwię, nie dostaje z niej przedmiotu. | card | rzadka | tak |  | 1 | `m => { m.reliquary = true; }` |
| `pack` | Stado | Potwór, który ma w swoim pokoju innego potwora, bije o 20% mocniej. | card | zwykła |  |  | 1 | `m => { m.pack += 0.2; }` |
| `quickarm` | Szybki montaż | Pułapki postawione w trakcie fali są gotowe od razu. | card | zwykła | tak |  | 1 | `m => { m.quickArm = true; }` |
