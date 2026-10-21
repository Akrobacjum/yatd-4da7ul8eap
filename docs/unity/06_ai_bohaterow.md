# 06. AI bohaterów i rozmowy

Ta sekcja opisuje "mózg" drużyny bohaterów z prototypu (Prototype 1.12.1): kto prowadzi, dokąd idą, co wiedzą, kiedy biorą łup, kiedy się wycofują, szturmują serce albo uciekają, jak każda klasa używa swoich umiejętności i przedmiotów, oraz cały system mowy (dymki, kolejki, rozmowy, katalog kluczy `SAY`).

Źródła: `p5_ai.js` (w całości), z `p3_flow.js` części: mowa (`say`, `sayTick`, `earshot`...), spawn i start fali (`spawnHero`, `regroupAtDoor`, `becomeImpatient`, `heroExit`), strach w zachowaniu (`addFear`, `startFlee`, `partyFlee`, `dropCrystal`, `crystalReturns`, `kill`), łupy (`noticeLoot`, `pickup`, `giveItem`, `dropItem`, `itemValue`, `curse`); z `p6_loop.js`: `step`, `takeCrystal`, `stealNeed`, `GATE_T`; z `p2_state_map.js`: przejezdność, wiedza o mapie, `bfs`; z `p4_traps.js`: `learnTrap`, `rebuildThreat`, `disarmSpots`, klatka, zapadnia, potwory (tylko to, co dotyczy decyzji bohaterów).

Dane (katalog `spec/data/`): `SAY.json`, `CHAT_REPLY.json`, `HEROES.json`, `HERO_TRAITS.json`, `levelStats_1_30.json`, `LEADER_ORDER.json`, `SMASHABLE_OBJ.json`, `HITEMS.json`, `LOOT_GREED.json`, `LOOT_KIND.json`, `ITEMS.json`, `DRIFT.json`, `SCARE.json`, `CURSED.json`, `DISARMABLE.json`, `BUILDINGS.json`, `DEFAULTS.json`, `GZ.json`.

Gdzie indziej:
- sekcja 03: przebieg runu i fali, ekonomia (Groza, Chciwość, Combo, `addPts`), zapis plotek po fali (`finishWave`), ocena sławy lochu;
- sekcja 04: generowanie bohaterów (poziom, ranga, cechy, łowcy skarbów, powracający), gildia, ekwipunek startowy i statystyki przedmiotów;
- sekcja 05: pułapki, potwory, obrażenia, liczby strachu (`damage`, `addFear`, `fearResist`, fobie, traumy), skill checki;
- sekcja 07: mapa, pokoje, korytarze, drzwi, wyłom, rozmieszczanie, kolejność pętli, zapis;
- sekcja 08: wygląd dymków mowy, kamera, pływające napisy, dźwięk, wibracje.

Konwencje:
- Odwołania do kodu: `plik.js: funkcja`. Liczby w blokach kodu i w `kodzie` z kropką (jak w prototypie), w prozie z przecinkiem.
- Czas to `fl.time` w sekundach czasu gry (skill check go spowalnia, przytrzymanie palca przyspiesza; sekcja 02 i 07).
- "Pole" = kafel siatki `WW x WH`. Odległość euklidesowa = `Math.hypot`, Manhattan = suma modułów, Czebyszew = max modułów.
- `rand` w pseudokodzie = `Math.random()` (w Unity strumień `Rng` "AI", sekcja 02).
- Rzeczy oznaczone **tylko prototyp** nie przechodzą wprost do gry; obok jest odpowiednik w Unity.

## 6.0 Słowniczek funkcji pomocniczych

| Identyfikator | Znaczenie | Źródło |
|---|---|---|
| `alive()` | bohaterowie nie `dead`, nie `fled`, nie `gone` (spadający przez zapadnię nie należy do żywych) | `p3_flow.js: alive` |
| `caged(h)` | `h.state === 'caged'` | `p3_flow.js: caged` |
| `panicking(h)` | `fl.time < h.panicUntil` | `p5_ai.js` |
| `goingOut()` | `P.plan` to `'flee'`, `'leave'` albo `'escape'` | `p5_ai.js` |
| `exiting(h)` | `h.fleeing` albo `h.crystal` albo `goingOut()`: bohater idzie do wyjścia | `p5_ai.js` |
| `held(h)` | stan `fight/wait/talk/rest/disarm/boss/free`, klatka albo sieć (dla mnożników obrażeń, sekcja 05) | `p3_flow.js: held` |
| `webbed(h)` | `fl.time < h.slowUntil` | `p3_flow.js: webbed` |
| `hdist(a, b)` | odległość euklidesowa między `heroPos(a)` i `heroPos(b)` (pozycje interpolowane w ruchu, z drobnym przesunięciem, patrz 6.2.1) | `p5_ai.js: hdist` |
| `tIdx(h)` | `h.ty * WW + h.tx` | `p5_ai.js` |
| `byId(id)` | bohater o danym `id` (także martwy) | `p5_ai.js` |
| `leader()` | aktualny lider (wybór w 6.3.1) | `p5_ai.js: leader` |
| `raging(h)` | `fl.time < h.rageUntil` i pokój bez Okowów | `p3_flow.js: raging` |
| `inB(t, r)` | w pokoju `r` stoi nierozbita budowla typu `t` (`fl.bRooms`, liczone na start fali i po rozbiciu) | `p3_flow.js: inB, computeBRooms` |
| `isRt(r, t)` | pokój `r` ma typ `t` (`fog`, `swamp`, `grotto`, `crypt`, `vault`, `haven`, `gears`, `hush`, `ice`) | `p2_state_map.js: isRt` |
| `roomOf(x, y)` | id obszaru z `fl.roomAt`: pokój (`kind 'room'`) albo korytarz (`kind 'hall'`); pole drzwi i skała dają `-1` | `p2_state_map.js: roomOf` |
| `heartGoals()` | pola przylegające do serca (`fl.heartAdj`, 4 sąsiedzi w pokoju serca) | `p5_ai.js` |
| `exitGoals()` | pole wejścia i (jeśli jest) pole wyłomu | `p5_ai.js` |
| `replanAll()` | wszystkim bohaterom `needPlan = true` | `p5_ai.js: replanAll` |
| `nearestOf(b, list)` | z listy indeksów pól ten o najmniejszym `b.dist >= 0` | `p5_ai.js: nearestOf` |

## 6.1 Architektura AI

### 6.1.1 Gdzie AI jest wywoływane (`p6_loop.js: step`)

```
step(dt):
  fl.time += dt
  (spokój, zegar combo, chainTick, echo mechanizmów: sekcje 03 i 05)
  if fl.queue.length:                                     // wpuszczanie bohaterów
    routed = P.plan === 'flee' && fl.heroes.length > 0
    if routed && alive().length && (fl.holdT += dt) < 8:  pozostali czekają na zewnątrz (6.2.13)
    else:
      if routed: regroupAtDoor()
      fl.spawnTimer -= dt
      if fl.spawnTimer <= 0: spawnHero(fl.queue.shift()); fl.spawnTimer = 0.3
  elementy: it.cd -= dt (detected i cd przeszło przez 0.3 -> threatDirty), jamUntil minął -> threatDirty
  strefy sieci wygasają; regenTick
  if fl.threatDirty: rebuildThreat()                       // mapa zagrożeń, na końcu replanAll()
  drzwi: wasClosed i closedUntil <= time -> wasClosed = false; replanAll()
  P.thinkT -= dt
  if P.thinkT <= 0: partyThink(0.25 - P.thinkT); P.thinkT = 0.25   // drużyna myśli 4 razy na sekundę
  sayTick()                                                 // kwestie czekające na swoją kolej
  (próbka do logu co 1 s: tylko prototyp)
  fl.disarmKeys = pola obszarów pułapek, które ktoś teraz rozbraja (state 'disarm', item.detected)
  if !fl.gateOpen && fl.time >= GATE_T (1.8): fl.gateOpen = true; alive()[0] mówi SAY.gate
  if fl.gateOpen:
    for h of fl.heroes (nie dead, nie fled): updateHero(h, dt)   // tu jest planHero i ruch
    checkTick()                                                  // skill checki (sekcja 05)
  monstersTick(dt)
  kradzież kryształu przy sercu (6.3.9)
  if !fl.fearless && fl.ending === null && fl.time >= S.waveTime: becomeImpatient()   // 6.3.10
  if fl.ending === null && fl.time >= S.waveTime + 60: każdy żywy -> heroExit (siatka bezpieczeństwa)
  if kolejka pusta i wszyscy dead/fled: fl.ending = 1.2
  dymki: bubble.until <= time -> bubble = null
```

Ważne:
- `partyThink` działa także przed otwarciem wejścia (`GATE_T`), `updateHero` (a więc `planHero` i ruch) dopiero po nim.
- `planHero` jest wołane tylko z `updateHero`, tylko gdy bohater stoi na polu (`h.nx === null`).
- Kolejność w obrębie kroku ma znaczenie: decyzje drużyny (`partyThink`) zapadają przed ruchem bohaterów w tym samym kroku, a kwestie z kolejek (`sayTick`) przed nowymi kwestiami z `updateHero`.
- `fl.heroes` iterowane w kolejności spawnu (`h.id` = indeks).

### 6.1.2 Zegary i częstotliwości

| Co | Wartość | Źródło |
|---|---|---|
| myślenie drużyny | co `0.25` s (`P.thinkT`, start `0`: pierwsze od razu); `dt` przekazane = `0.25 - P.thinkT` | `p6_loop.js: step` |
| plan bohatera | gdy stoi i (`needPlan` albo `thinkT <= 0` albo pusta ścieżka); po planie `thinkT = 0.45 + rand*0.3` | `p5_ai.js: planHero, updateHero` |
| szukanie pułapek wzrokiem | co `0.5` s (`h.scan`, start `0.5`) | `p5_ai.js: updateHero, scanTraps` |
| rozglądanie się | co `1.6 + rand*2.8` s, tylko w stanie `talk`/`wait` | `p5_ai.js: glance` |
| small talk | `P.chatT` start `6`, potem `7 + rand*6` s | `p5_ai.js: partyThink` |
| wołanie zgubionego | pierwsze `5` s po zgubieniu, potem co `6 + 3*rand` s | `p5_ai.js: getLost, partyThink` |
| wołanie o kapłana | najwyżej co `14` s na rannego | `p5_ai.js: partyThink` |
| ta sama kwestia drużyny (`partySay`) | najwyżej co `5` s na klucz | `p5_ai.js: partySay` |
| kapłan | rozgląda się co `1` s (`h.cast`), modlitwa trwa `3` s; start `cast = 1.5` | `p5_ai.js: heroAbilities` |
| mag | kula ognia `cast = 4` s, bez celu `0.5` s; rozproszenie sieci co `8` s; start `cast = 2` | `p5_ai.js: heroAbilities` |
| bard | zawołanie zgubionych co `9` s (`callCd`, start `0`); pieśń co `16` s (`songCd`, start `6`; `6` gdy zagłuszył ją Kamień wyjec) | `p5_ai.js: bardTick` |
| podanie mikstury | najwyżej co `10` s na dającego | `p5_ai.js: partyThink` |
| objazd (zły skręt) | trwa do `10` s, potem przerwa `15` s | `p5_ai.js: maybeDetour` |
| przygotowanie przed groźnym pokojem | od 1.12.1 `max(3, talkLen)` s (do 1.12: `2.4` s), potem przerwa `4` s, bieg `6` s | `p5_ai.js: startPrep, finishPrep` |
| blokada odwrotu po odpoczynku | `15` s | `p5_ai.js: partyThink` |
| cierpliwość fali | `S.waveTime` = `120` s (suwak 60-300), siatka bezpieczeństwa +`60` s | `p6_loop.js: step` |

### 6.1.3 Obiekt drużyny (`p3_flow.js: freshParty`)

Jeden obiekt `fl.party` (dalej `P`) na falę; tworzony w `setupFl`, częściowo zerowany w `regroupAtDoor`.

| Pole | Start | Znaczenie |
|---|---|---|
| `plan` | `'explore'` | plan drużyny (6.1.7) |
| `target` | `-1` | indeks pola, do którego lider prowadzi przy eksploracji |
| `targetRoom` | `-1` | pokój celu, gdy cel to "pokój znany, ale nieodwiedzony" (szukanie łupów) |
| `leaderId` | `-1` | id lidera; `-1` = wybierz od nowa |
| `talkUntil` | `-1` | do kiedy drużyna stoi i rozmawia (stan `talk`) |
| `waitUntil` | `-1` | do kiedy lider czeka (na maruderów, na zbierającego łup) |
| `retreatRoom` | `-1` | pokój odpoczynku przy odwrocie |
| `retreatLock` | `-99` | przed tym czasem nie ma nowego odwrotu |
| `restSince` | `-1` | kiedy ktoś pierwszy usiadł do odpoczynku |
| `morale` | `1` | morale drużyny 0..1 (6.3.6) |
| `scoutId` | `-1` | zwiadowca (złodziej albo, od 1.16, odważny ochotnik) |
| `scoutMate` | `-1` | partner zwiadowcy, idzie z nim (1.16, 6.2.10a) |
| `aheadRoom`, `aheadCd`, `aheadWait`, `aheadUntil` | brak, brak (`15`), `-1`, `-1` | zwiad przodem (1.16): ostatni pokój lidera, przed kiedy nie ma następnego, na kogo drużyna czeka i do kiedy |
| `restScouted` | brak | na tym postoju już losowano zwiad złodzieja (1.16) |
| `junctions` | `Set` | pokoje, w których już była narada |
| `hesitated` | `Set` | pola, przed którymi lider już się zawahał |
| `thinkT` | `0` | zegar `partyThink` |
| `lastSay` | `{}` | czas ostatniej kwestii drużyny wg klucza (`partySay`) i `friendHit` |
| `ambushT`, `ambushN` | `-9`, `0` | czas ostatniej trafiającej pułapki i licznik serii (zasadzka) |
| `steal` | `0` | postęp wyważania kryształu (s) |
| `carrierId` | `-1` | kto niesie kryształ |
| `rescueId` | `-1` | uwięziony w klatce, po którego wracają |
| `cageDecided` | `Set` | uwięzieni, o których już zdecydowano |
| `abandoned` | `Set` | uwięzieni porzuceni |
| `lastTalkAt` | `-99` | czas ostatniej narady |
| `chatT` | `6` | zegar small talku |
| `heartSaid` | `false` | czy lider już skomentował znalezienie serca |
| `queueSay` | `[]` | kolejka kwestii drużyny `{id, text, at, prio?, dur?, how?}` (6.7.3) |
| `prepped` | `Set` | pokoje, przed którymi już się przygotowywali |
| `prep` | `null` | trwające przygotowanie `{room, until, pr, mg, th, wr}` |
| `prepCd` | `0` | przerwa między przygotowaniami |
| `rushUntil` | `-1` | do kiedy trwa bieg przez groźny pokój (+25% prędkości) |
| `searchId`, `searchUntil` | `-1`, `-1` | zgubiony, którego lider szuka, i do kiedy |
| `detour`, `detourCd` | `null`, `0` | zły skręt / błądzenie we mgle `{goal, until}` i przerwa |
| `wantSearch` | `true` | czy jeszcze przeszukują znane pokoje (łupy) |

Pola dopisywane w trakcie: `rescuerId` (kto uwalnia), `fogDone` (pokoje mgły już "przebłądzone" przez lidera), `blockT`, `blockSaid`, `liftT` (zamknięta krata), `gateDetourUntil` (objazd przez kratę), `lootClaim` (Map: pole łupu -> id bohatera), `lootWaitId`, `lootWaitT` (lider czeka na zbierającego), `ambushSaid`, `loggedPlan` (do logu, tylko prototyp).

`regroupAtDoor` zeruje tylko: `plan = 'explore'`, `leaderId`, `target`, `prep`, `steal`, `detour`, `searchId` (oraz `fl.holdT = 0`, `fl.secondGroup++`). Morale, `junctions`, `hesitated`, `prepped`, `fogDone`, `cageDecided`, `rescueId` przechodzą na drugą grupę.

### 6.1.4 Pola bohatera używane przez AI (`p3_flow.js: spawnHero`)

Stałe z generacji (sekcja 04): `type`, `T` (wiersz `HEROES.json`: `speed`, `greed`, `dps`, `hp`), `R` (`levelStats(lvl)`, tabela `levelStats_1_30.json`), `lvl`, `rank` (`tierOf(lvl)`: 0 dla poz. 1-2 "nowicjusz", 1 dla 3-5 "weteran", 2 dla 6-9 "elita", 3 od 10), `boss` (`'champion'`/`'final'`/`null`), `trait` (`greedy`/`coward`/`brave`/`careful`/`null`), `hunter`, `courage`, `max`, `female`, `nm` (imię w 3 przypadkach), `phobia`, `phys`, `returning`.

Pola `R` używane przez AI: `avoid` (waga omijania zagrożeń), `learn` (szansa zapamiętania pułapki), `detect` (zasięg wykrywania), `disarm` (mnożnik czasu rozbrajania), `fail` (szansa wpadki), `rumor` (przyswajanie plotek), `risk` (odwaga w sprawie łupów), `panic` (wstrząs po śmierci), `potion` (próg picia mikstury), `coord` (poz. 3+: koordynacja), `caution` (poz. 6+: ostrożność na nieznanym), `dodge`, `shield`, `shieldCd`, `calm` (wygasanie strachu), `sapper` (poz. 7+), `sight` (poz. 8+: mag czuje pułapki), `pow`, `speed`, `dps`.

| Grupa | Pola (start) |
|---|---|
| pozycja i ruch | `x, y` (pole), `nx, ny` (pole docelowe kroku albo `null`), `prog` (0..1 postęp kroku), `tx, ty` (pole "logiczne", 6.2.1), `room`, `enteredRoom`, `ldx, ldy` (kierunek ostatniego kroku), `sliding`, `slid`, `path` (lista pól), `blocked` (`-1` albo czas, gdy cel był nieosiągalny), `noPathT` (`0`), `face` (`±1`, w którą stronę patrzy) |
| myślenie | `needPlan` (`true`), `thinkT` (`0`), `intent` (`'follow'`), `state` (`'walk'`), `timer`, `dur`, `item` (pułapka w robocie), `disarmT` (pułapka, którą zamierza rozbroić), `foe` (potwór w walce), `smashIt`, `freeT` (id uwalnianego), `lootKey`, `lootMemo` (Map: pole łupu -> `{go, t}`) |
| strach i nastrój | `fear` (`0`), `panicUntil` (`-1`), `fleeing`, `crystal`, `alone`, `aloneSaid`, `shakenUntil` (`-1`), `calmUntil`, `braveUntil`, `braveK`, `cursed`, `rageUntil` (`-1`), `rageCd` (`0`), `raged` (boss finałowy), `shoutCd` (czempion) |
| gubienie się | `lost`, `lostT`, `lostCallT` (`0`), `sepT`, `sepRolled`, `hearUntil` (`-1`), `hearId` (`-1`), `wanderUntil` (`-1`), `wanderTarget` (`-1`), `scoutTarget`, `scoutUntil`, `split` (`false`, 1.16: celowo oddzielony, 6.2.10a) |
| przedmioty i moce | `inv` (lista `{type, r, charges, cdUntil}`), `invCap` (`3 + floor(lvl/3)`), `gold`, `loot` (licznik zebranych), `wardUntil/wardK` (talizman), `sprintUntil/sprintK` (buty), `calmUntil` (amulet), `giveCd` |
| klasa | kapłan: `faith`, `faithMax` (`6 + floor(lvl/2)`), `faithT`, `faithSaid`, `cast`, `barrierCd`; mag: `cast`, `dispelCd`, `jamCd`; bard: `songs` (`2 + floor(lvl/4)`), `songCd` (`6`), `callCd` (`0`); barbarzyńca: `smashCd` (`0`); wojownik: `shieldUpUntil`, `shieldCd`; złodziej: `dodgeCd` |
| stany chwilowe | `slowUntil`, `burnUntil`, `cageUntil`, `cageIt`, `fallUntil`, `gone`, `fellFrom` (Set zapadni), `deepFall`, `napped`, `napUntil`, `restAt`, `dreamSaid`, `lullUntil/lullK/lullRoom`, `healCallT`, `glanceT` |
| mowa | `bubble` (`{text, prio, at, until, loud}`), `saidUntil`, `sayQ` (lista kwestii czekających), flagi "raz na falę": `ghostSaid`, `shadeSaid`, `batSaid`, `spiderSaid`, `rumorSaid`, `saidTiming` (Set pułapek), `saidB` (Set: Okowy w pokoju) |
| pamięć do karczmy | `felt` (Map: pułapka -> ile go zraniła/przestraszyła; sekcja 03), `fearBy`, `dmgBy`, `trauma`, `phobiaSeen`, `known` |

`h.rtSaid` jest tworzone, ale nieużywane (kod używa `fl.rtSaid`), patrz 6.8.

### 6.1.5 Stany bohatera `h.state`

| Stan | Znaczenie | Wejście | Wyjście |
|---|---|---|---|
| `walk` | idzie ścieżką / planuje | domyślny | inne stany |
| `wait` | stoi chwilę (`timer`) | brak ścieżki (`0.4` s), blisko lidera (`0.35` s), pole rozbrajane przez innego (`0.4` s) | `timer <= 0` -> `walk` + `needPlan` |
| `talk` | drużyna stoi (rozmowa, narada, przygotowanie) albo lider czeka | `fl.time < P.talkUntil` lub (lider i `fl.time < P.waitUntil`); wahanie lidera | koniec obu czasów albo `exiting` |
| `rest` | odpoczynek (odwrót) albo drzemka w Sanktuarium | w pokoju odwrotu; `nap` | plan nie `retreat` i drzemka minęła; panika; `exiting` |
| `fight` | walka wręcz z potworem `h.foe` | następne pole ścieżki zajęte przez żywego potwora nie-unoszącego się | potwór martwy/zniknął, `exiting` |
| `disarm` | rozbraja pułapkę albo zdejmuje klątwę z portretu (`h.item`, `timer`) | `disarmJob`/`blessJob` na miejscu | koniec czasu; `exiting`; pułapka odpaliła |
| `smash` | barbarzyńca rąbie (`h.smashIt`, `timer`) | `smashJob` na miejscu | koniec; `exiting`, panika, Okowy |
| `free` | wyłamuje kratę klatki przyjaciela (`h.freeT`, `timer`) | ratujący obok klatki | koniec; uwięziony wolny; `exiting` |
| `boss` | przy sercu, wyważa kryształ | `onEnter` przy sercu w planie `assault` | plan nie `assault`, `exiting`, panika |
| `caged` | w klatce | `p4_traps.js: cageHero` | `freeCaged`, `cageEnds` |
| `fallen` | spada przez zapadnię (`gone = true`) | `p4_traps.js: fall` | `landFallen` po `fallUntil` |

```
              +-------------------- needPlan / thinkT --------------------+
              v                                                           |
   +------> walk --(brak ścieżki)--> wait --(timer)------------------------+
   |          |--(potwór na drodze)--> fight --(potwór martwy / exiting)--> walk
   |          |--(disarmJob/blessJob na miejscu)--> disarm --(timer)------> walk
   |          |--(smashJob na miejscu)--> smash --(timer)-----------------> walk
   |          |--(ratujący przy klatce)--> free --(timer: freeCaged)------> walk
   |          |--(P.talkUntil / lider i P.waitUntil)--> talk --(koniec)---> walk
   |          |--(pokój odwrotu / Sanktuarium)--> rest --(koniec planu)---> walk
   |          |--(assault, obok serca)--> boss --(kryształ / plan / panika)--> walk
   |          |--(pułapka klatka)--> caged --(uwolniony / koniec)--> walk | śmierć
   |          +--(zapadnia)--> fallen (gone) --(landFallen)-------------> walk
   +--- startFlee / partyFlee / takeCrystal / becomeImpatient: rest/talk/wait/boss(/disarm/free) -> walk
```

### 6.1.6 Intencje `h.intent`

Intencja to "po co idzie" (ustawiana w `planHero`, czytana przez innych):

| Intencja | Kto | Cel ścieżki |
|---|---|---|
| `lead` | lider przy eksploracji | `P.target` |
| `heart` | lider w `assault`, każdy przy `fl.fearless && assault` | `heartGoal()` |
| `detour` | lider w objeździe / błądzeniu we mgle | `P.detour.goal` |
| `search` | lider szuka zgubionego | pole zgubionego |
| `follow` | reszta | pole lidera albo serce (6.2.12) |
| `space` | stojący na tym samym polu co inny | sąsiednie wolne pole |
| `retreat` | w odwrocie | najbliższe pole pokoju odwrotu |
| `lost` | zgubiony | głos, lider, drzwi, granica albo daleki znany punkt |
| `wander` | nowicjusz, który odłączył się sam | `h.wanderTarget` |
| `rescue` | ratujący | pole obok klatki |
| `fight` | dołącza do walki lidera; wojownik szarżuje | pole potwora |
| `heal` | kapłan do rannego | pole rannego |
| `nap` | drzemka w Sanktuarium | brak (siada) |
| `smash`, `disarm`, `bless`, `bomb` | prace klasowe | miejsce pracy |
| `loot` | idzie po łup | pole łupu (albo granica w stronę legendarnego) |
| `scout` | zwiadowca; od 1.16 także jego partner | `h.scoutTarget`; partner: pole zwiadowcy |
| `panic` | spanikowany | wyjście (jeśli ucieka) albo daleki znany punkt |
| `exit`, `carry` | idzie do wyjścia; niesie kryształ | najbliższe wyjście |
| `avoid` | wojownik omija potwora (tylko chwilowo, nadpisywane, 6.8) | - |

### 6.1.7 Plany drużyny `P.plan`

| Plan | Znaczenie |
|---|---|
| `explore` | szukają serca i łupów; lider prowadzi do `P.target` |
| `assault` | idą do serca i wyważają kryształ |
| `retreat` | idą do najbezpieczniejszego pokoju i odpoczywają |
| `flee` | cała drużyna ucieka (strach) |
| `escape` | mają kryształ: wszyscy do wyjścia |
| `leave` | koniec cierpliwości albo serce ich odepchnęło: wracają do domu |

```
explore --(serce znane i przeszukali dość albo minął limit, avgHp >= 0.5)--> assault
explore --(nic do odkrycia i serce znane)--> assault
assault --(krata zamknięta, jest co przeszukać)--> explore (gateDetourUntil) --(koniec)--> assault
explore/assault --(avgHp nisko, lider poz. 3+)--> retreat --(avgHp >= 0.7 i >= 10 s odpoczynku, albo 26 s; 1.12.1)--> assault|explore
assault --(wyważyli kryształ: takeCrystal)--> escape
escape --(niosący zginął, odważni i spokojni)--> assault ; (inaczej) --> flee
dowolny nie-wyjściowy --(strach drużyny, morale, połowa ucieka)--> flee
flee --(drugi oddział wchodzi: regroupAtDoor)--> explore
dowolny --(cierpliwość: becomeImpatient)--> leave | assault (bohater z przepowiedni)
assault, fala 1 --(serce odpycha)--> leave
```

`flee`, `escape`, `leave` to plany "wyjściowe" (`goingOut()`): w nich `partyThink` nie zmienia już planu (poza `regroupAtDoor` i `crystalReturns`).

### 6.1.8 `updateHero(h, dt)`: kolejność (`p5_ai.js: updateHero`)

```
if h.gone: if fl.time >= h.fallUntil: landFallen(h); return
(flash, liczniki pływającej Grozy: tylko wygląd)
[h.tx, h.ty] = heroTile(h); jeśli roomOf(tx,ty) >= 0: h.room = ten pokój
if płonie: damage(h, 6 * S.dmg * dt, BURN); if h.dead: return
if h.hp < h.R.potion * h.max: wypij najlepszą miksturę (6.5.8)
heroAbilities(h, dt)                         // kapłan, mag, bard (6.5)
if stoi w strefie sieci: h.slowUntil = max(h.slowUntil, time + 0.15)
wygasanie strachu (sekcja 05: R.calm * mods.calmK * mnożniki), nie gdy fleeing
h.scan -= dt; if h.scan <= 0: h.scan = 0.5; scanTraps(h)
h.thinkT -= dt
if h.sliding && (state != 'walk' || nx === null): sliding = false
if caged: if time >= cageUntil: cageEnds(h); return
if state 'rest':  (6.3.7) return
if state 'disarm': (6.5.2) return
if state 'smash':  (6.5.6) return
if state 'free':   (6.5.9) return
if state 'fight':  jeśli wróg nieważny lub exiting -> walk + needPlan (i dalej w tym kroku); inaczej ewentualna bomba (6.5.8); return
if state 'boss':   if plan != 'assault' || exiting || panicking -> walk + needPlan; return
if state talk/wait i stoi: glance co glanceT
if state 'talk': jeśli (time >= talkUntil i nie (lider i time < waitUntil)) albo exiting -> walk + needPlan; inaczej return
if state 'wait': timer -= dt; if timer > 0 return; -> walk + needPlan
if exiting && stoi && isExitTile(x,y): heroExit(h); return
if !fearless && !exiting && !lost && !panicking && stoi
   && (time < P.talkUntil || (lider && time < P.waitUntil)) && !onScout(h) && nie wędruje: state = 'talk'; return
if stoi: krok po ścieżce (6.2.6)
ruch: prędkość (6.2.2), ślizg (6.2.8), dotarcie -> onEnter(h)
```

### 6.1.9 Odwzorowanie w Unity

- `Core/AI/PartyBrain` (odpowiednik `partyThink`, `leader`, `chooseTarget`, `decideCage`, `checkPrep/startPrep/finishPrep`, `maybeDetour`, `getLost`, `answerLost`), `Core/AI/HeroBrain` (`planHero`, prace klasowe, `updateHero`, `onEnter`, `heroAbilities`, `bardTick`), `Core/AI/Pathfinder` (`bfs`, `pathFrom`, `frontier`, mapa zagrożeń), `Core/Speech/SpeechSystem` (`say`, `sayTick`, `earshot`, kolejki, small talk, katalog kluczy). Czysty C#, bez MonoBehaviour (sekcja 02).
- Kolejność wywołań taka jak w 6.1.1 i 6.1.8; zachowaj flagi `needPlan`, `threatDirty`, `knowDirty` (Dijkstra liczona na żądanie, nie co klatkę).
- Ścieżki: własny Dijkstra na siatce 4-kierunkowej z kopcem binarnym i tablicami z puli. **Nie** NavMesh (siatka pól, koszty zagrożenia, wiedza drużyny).
- Losowanie: strumień `Rng` "AI" (sekcja 02). **Tylko prototyp:** `Math.random()`.
- `fl.items` iterowane w kolejności dodania (kto pierwszy, ten wybrany przy remisach i w pętlach "pierwszy pasujący", np. `bombJob`): w Unity lista elementów w kolejności postawienia.
- **Tylko prototyp:** `tl(...)` (oś czasu do logu testowego), większość `fl.stats.*` (statystyki do logu). Odpowiednik: zdarzenia diagnostyczne w buildzie deweloperskim. Wyjątki, które wpływają na grę i muszą zostać: `fl.stats.gotLost`, `fl.stats.reroutes` (gildia, sekcja 04), `fl.stats.lootSeen` (opowieści o skarbach i chciwość, sekcje 03 i 6.4.1), `fl.stats.loot` (malejący przyrost chciwości), `fl.stats.kills` (warunek small talku o bogactwie).
- **Tylko prototyp:** `floatHero`, `floatTile`, `burst`, `particles`, `fxTiles`, `fxLine`, `shake`, `buzz`, `setHint`. Odpowiednik: zdarzenia symulacji do warstwy widoku (sekcja 02 i 08).

## 6.2 Ruch i ścieżki

### 6.2.1 Pozycja i "pole logiczne"

- Bohater stoi na polu `(x, y)`. Krok: `nx, ny` = następne pole, `prog` rośnie od 0 do 1 (`p5_ai.js: updateHero`). Przy `prog >= 1`: `ldx, ldy` = kierunek kroku, `x, y = nx, ny`, `nx = ny = null`, `prog = 0`, `onEnter(h)`.
- `heroTile(h)`: w ruchu, od połowy kroku (`prog >= 0.5`) bohater "jest" już na polu docelowym. `h.tx, h.ty` = to pole; liczone na początku każdego `updateHero`. Pułapki, pokoje, `earshot`, wykrywanie, łupy w zasięgu itd. używają `tx, ty` (`p5_ai.js: heroTile`).
- `heroPos(h)` (`p3_flow.js: heroPos`, od 1.12.1): pozycja ciągła = interpolacja `x..nx` wg `prog` + 0,5 (środek pola). Przy mijaniu (`h.passing != null` w ruchu) bohater odchyla się w bok: przesunięcie prostopadłe do kierunku kroku `0,24 × sin(π × prog)` (`ox = -(ny - y) × s`, `oy = (nx - x) × s`), więc dwaj idący na siebie rozjeżdżają się każdy w swoją prawą stronę. Dawne przesunięcie `off = (h.id % 3 - 1) * 0.14` zostało tylko dla rzadkiej chwili, gdy dwóch stoi na jednym polu. Używane przez `hdist` i odległości do unoszących się potworów (różnice < 0,25 pola; w Unity można liczyć `hdist` bez przesunięć, a odchylenie zrobić w widoku).
- **Jedno pole na bohatera (od 1.12.1, decyzja autora: "jak potwory, wyjątek: kiedy się mijają").** Szczegóły w 6.2.15.

### 6.2.2 Prędkość (`p5_ai.js: updateHero`)

```
slow    = fl.time < h.slowUntil ? 0.35 : 1
fearAll = fl.fearless ? 1.3 : 1
dash    = !fl.fearless && h.rank >= 1 && fl.danger[ny*WW+nx] > 0 ? 1.3 : 1     // weterani przebiegają przez znane zagrożenie
careful = h.R.caution && !exiting(h) && !fl.fearless && isFrontierTile(ny*WW+nx) ? 0.8 : 1   // elita (poz. 6+) ostrożnie na nieznanym
sprint  = fl.time < h.sprintUntil ? h.sprintK : 1                                   // buty
bog     = isRt(roomOf(nx,ny),'swamp') || isRt(roomOf(x,y),'swamp') ? 0.65 : 1       // Bagno
purse   = h.gold > 0 ? max(0.8, 1 - 0.04*h.gold) : 1                               // ciężka sakiewka
spd = h.T.speed * h.R.speed * (S.heroSpeed/100) * slow * fearAll * dash * careful * sprint * bog * purse
      * (panicking(h) ? 1.2 : 1) * (h.fleeing ? 1.15 : 1)
      * (h.crystal ? 0.9 * mods.carrierSlow : 1)
      * (fl.time < P.rushUntil && !exiting(h) ? 1.25 : 1)     // bieg po przygotowaniu (6.3.8)
      * (fl.time < h.rageUntil ? 1.25 : 1)                     // furia
h.prog += spd * dt                                             // pól na sekundę
```

- `T.speed` z `HEROES.json` (wojownik 1,5, złodziej 1,9, kapłan 1,3, mag 1,3, bard 1,4, barbarzyńca 1,45). `R.speed = 1 + 0.02*(lvl-1)`. `S.heroSpeed` domyślnie 100 (suwak 50-200).
- Źródła `slowUntil` (sekcja 05): sieć (`3 * mods.webDur * pw` s), ugryzienie pająka (`4 * pw`), sieć pająka w walce (`2.5`), stanie w strefie sieci (`inZone`: `+0.15` s co krok), Zawiasy poz. 3 (`2`), Trumna poz. 3 (`3`), Goblin poz. 3 (`1.5`). Mag może rozproszyć strefę (6.5.4).
- Kołysanka z pozytywki **nie** spowalnia: daje tylko strach `lullK` na sekundę, dopóki bohater jest w tym pokoju (`p5_ai.js: partyThink`).
- Mnożnik furii bierze `h.rageUntil` wprost, a nie `raging(h)`, więc działa także w pokoju z Okowami (patrz 6.8).
- Ślizg po lodzie ma osobną prędkość: `prog += 3.2 * dt` bez żadnych mnożników (6.2.8).

### 6.2.3 Przejezdność (`p2_state_map.js`)

```
passable(x,y):  FLOOR  -> nie serce && brak obiektu (fl.objects: skrzynie, beczki, półki, posągi...) && brak stojącej budowli (blockerAt)
                DOOR   -> drzwi nie zamknięte (closedUntil <= fl.time; zamyka je tylko Krata)
                inne   -> false
walkable(x,y):  tylko FLOOR, te same warunki (pole drzwi NIE jest walkable)
blockerAt(x,y): element z BUILDINGS (Runa, Ołtarz, Wabik, Kwas, Zasłona, Umocnienie, Kamień wyjec, Okowy) i nie it.broken
```

- `passable` decyduje o ścieżkach (`bfs`) i o tym, czy można wejść na następne pole; `walkable` o wyborze pól docelowych (miejsca pracy, rozstawienie, pola pokoju odwrotu, losowe pola).
- Potwory **nie** są przeszkodą dla `bfs`. Wejście na pole z żywym potworem, który się nie unosi (`!DRIFT[type]`; unoszą się duch, cień, nietoperze), zamienia się w walkę (6.2.6). Mapa zagrożeń sprawia, że zwykle je omijają.
- Rozbita przez barbarzyńcę budowla (`it.broken`) przestaje blokować; rozbita skrzynia znika z `fl.objects` do końca fali (6.5.6).

### 6.2.4 Co drużyna wie o mapie (`p2_state_map.js: reveal, revealRoom, revealAround, frontier`)

Drużyna ma jedną wspólną mapę w głowach: `fl.known` (bajt na pole). Na początku fali wypełniają ją plotki (6.3.5), potem wszystko, co zobaczą.

```
reveal(h):                      // przy spawnie, po każdym kroku (onEnter), po wyjściu z zapadni
  if pole drzwi: oba pokoje (kind 'room') za drzwiami widać w całości (revealRoom) + kwadrat promienia 2 (revealAround)
  elif w pokoju (kind 'room'): cały pokój z pierścieniem ścian (y0-1..y1+1, x0-1..x1+1)
  else (korytarz): kwadrat promienia 3; pola podłogi pokoi tylko w odległości 1 (pokój widać tylko ze środka albo z progu)
  jeśli coś nowego: fl.knowDirty = true; fl.newKnowAt = fl.time; fl.threatDirty = true; checkGhostRumors(h)
revealRoom(r): pierwszy raz -> R.seen = true; jeśli to pokój serca -> fl.heartKnown = true
```

- `R.seen` = pokój znany (zobaczony albo z plotki). `R.visited` = ktoś w nim stanął (`onEnter`). `R.rumored` = znany z plotki. `R.sensed` = mag już go "wyczuł".
- `frontier()`: znane, przejezdne pola (bez brzegu mapy) z co najmniej jednym nieznanym sąsiadem typu FLOOR albo DOOR. Tam prowadzi eksploracja.
- `isFrontierTile(i)`: znane pole z nieznanym sąsiadem FLOOR/DOOR (bez sprawdzania przejezdności samego pola).
- `checkGhostRumors(h)`: plotka o pułapce, której nie ma (`fl.ghosts`), znika, gdy jej pole staje się znane; `h` mówi `SAY.rumorFalse` (2).
- Potwór jest "widziany", gdy jego pole jest w `fl.known`.

### 6.2.5 Wyszukiwanie dróg i koszt zagrożenia

`bfs(sx, sy, opt)` (`p2_state_map.js: bfs`) to Dijkstra po 4 kierunkach z kopcem binarnym.

```
opt.known   -> wolno wchodzić tylko na pola z fl.known (pole startowe zawsze)
avoidK      = (opt.noDanger || fl.fearless) ? 0 : (opt.avoid ?? 1)
koszt wejścia na pole ni = 1 + (avoidK ? min(12, fl.danger[ni] * 3 * avoidK) : 0)
zwraca { dist: Float32Array (-1 = nieosiągalne), prev: Int32Array }
pathFrom(b, target): lista pól od pierwszego kroku do celu (bez pola startowego); długość = liczba kroków
shortestPath(): ścieżka od wejścia do najbliższego pola przy sercu, noDanger, po wszystkich polach (używa jej przepowiednia, 6.3.10)
```

Kto liczy z jakim `avoid`:

| Wywołanie | `known` | `avoid` |
|---|---|---|
| `planHero` (B) | tak | `h.R.avoid * (h.fleeing ? 0.6 : 1) * (careful 1.3, greedy 0.85, inaczej 1)`; `noDanger` przy panice |
| `planHero` zapas do wyjścia | nie | `noDanger` |
| `planHero` zgubiony idzie za głosem | nie | domyślne 1 |
| `chooseTarget` | tak | `L.R.avoid` |
| `safestRoom` | tak | 1 |
| `answerLost`, `bardTick` | nie | 1 |
| `landFallen` (z kryształem) | nie | `noDanger` |

`R.avoid = 0.35 + 0.16*(lvl-1)` (poz. 1: 0,35; poz. 5: 0,99; poz. 10: 1,79): weterani mocniej obchodzą znane zagrożenia. Przy `fl.fearless` (koniec cierpliwości) nikt nie omija niczego.

**Mapa zagrożeń** `fl.danger` (`p4_traps.js: rebuildThreat`), przeliczana, gdy `fl.threatDirty`:

| Źródło | Pola | Waga |
|---|---|---|
| znana (`detected`), nierozbrojona pułapka lub Wabik (`LOOKS_TRAP`), straszak (`SCARE`) | `areaOf(it)` | `1` |
| j.w., pułapka gotowa | `areaOf(it)` | `4` |
| j.w., przeładowuje się (`cd > 0.3`) albo zagłuszona (`jamUntil > time`) | `areaOf(it)` | `0.4` |
| żywy potwór na znanym polu, łucznik | `areaOf` (pokój w promieniu 4) | `1` |
| żywy unoszący się potwór (duch, cień, nietoperze) na znanym polu | pola pokoju w promieniu 1,5 od jego pozycji | `1.5` |
| inny żywy potwór na znanym polu | `areaOf` (3x3) | `2` |
| fałszywa plotka o pułapce (`fl.ghosts`) | obszar tej pułapki | `4` |

Wagi się sumują, pole najwyżej `6`. Po przeliczeniu `fl.knownTypes` = typy znanych pułapek (zmniejsza strach od nich, sekcja 05) i `replanAll()`. `threatDirty` ustawiają m.in.: nowa wiedza (`reveal`), wykrycie i rozbrojenie pułapek, przejście `cd` przez 0,3, koniec zagłuszenia, śmierć potwora, rozbicie, zmiana talii.

**Łupy nie zmieniają kosztów ścieżek.** Wpływają tylko na wybór celu (6.3.3) i na prace (6.4).

### 6.2.6 Krok po ścieżce (stojący bohater, `p5_ai.js: updateHero`)

```
if h.needPlan || h.thinkT <= 0 || !h.path.length: planHero(h)
if h.state !== 'walk': return                      // plan mógł posadzić, zacząć pracę, kazać czekać
if h.path.length && !passable(h.path[0]): planHero(h)
if !h.path.length || !passable(h.path[0]):
   if h.intent !== 'follow' || hdist(h, leader()) > 3: h.noPathT += 0.4
   h.state = 'wait'; h.timer = 0.4; return
n = h.path[0]; g = przedmiot na n
if g jest potworem, !DRIFT, hp > 0: h.state = 'fight'; h.foe = g; return
if h.R.coord && h.type !== 'thief' && !fl.fearless && !exiting(h)
   && fl.disarmKeys ma n && nie ma (h.x,h.y): h.state = 'wait'; h.timer = 0.4; return     // nie włazi pod rozbrajaną pułapkę
if h jest liderem && h.rank >= 1 && !fl.fearless && !exiting(h) && P.morale < 0.75
   && isFrontierTile(n) && !P.hesitated.has(n):
   P.hesitated.add(n); talk(0.9, [SAY.hesitate]); h.state = 'talk'; return              // wahanie przed nieznanym
dng = fl.danger[n]
if h.type === 'warrior' && !fl.fearless && dng > 1 && fl.time > h.shieldCd:
   h.shieldUpUntil = time + 2.5; h.shieldCd = time + h.R.shieldCd; SAY.shield (2)
if h.inv.length:
   if dng > 1.5 && !fl.fearless && !exiting(h): useCharm(h, 'danger')
   if exiting(h) || (h.lost && h.rank >= 1) || (dng > 1 && h.rank >= 1 && !fl.fearless): useBoots(h, exiting(h) ? 'out' : 'dash')
h.path.shift(); h.nx, h.ny = n; h.prog = 0
```

`noPathT` mierzy (w przybliżeniu w sekundach), jak długo bohater nie ma drogi; zerowane po udanym planie. Powyżej 3 przy odległości od lidera > 6 bohater się gubi (6.2.10).

### 6.2.7 Wejście na pole (`p5_ai.js: onEnter`)

```
r = roomOf(h.x,h.y); changed = r >= 0 && r !== h.enteredRoom
if r >= 0: h.room = r; h.enteredRoom = r
reveal(h)
if r >= 0 && fl.rooms[r].kind === 'room':
   if !R.visited: R.visited = true
   if R.rt && !exiting(h) && r nie w fl.rtSaid: fl.rtSaid.add(r); say(h, SAY[RT_SAY[rt]], 3)   // pierwszy w pokoju z charakterem
   if changed && h jest liderem: maybeDetour(h, r)                                              // 6.2.11
   if changed && !exiting(h): phobiaSight(h, r)                                                // sekcja 05
if isExitTile(h.x,h.y) && exiting(h): heroExit(h); return
if na polu łup && !h.crystal && !h.fleeing: pickup(h, it)                                     // każdy, kto wejdzie, nie tylko chętny
if lód: możliwy ślizg (6.2.8), wtedy return
if P.plan === 'retreat' && !h.lost && r === P.retreatRoom && !panicking(h) && !exiting(h): state 'rest'; path []; return
if P.plan === 'assault' && !exiting(h) && manhattan(h, serce) === 1 && !panicking(h): state 'boss'; path []; return
if h.rank >= 1: każda pułapka (TRAPS) detected, !disabled, cd > 0.3, nie w h.saidTiming, !exiting(h), gdy h stoi w jej areaOf:
   h.saidTiming.add(t); SAY.timing (2)                                       // "przebiegnę, póki się ładuje" (tylko kwestia)
if R.rumored && !h.rumorSaid && !exiting(h) && rand < 0.5: h.rumorSaid = true; SAY.rumor (1)
if mag && h.R.sight && pokój kind 'room' && !R.sensed && !exiting(h) && !inB('rune', r) && !inB('veil', r) && !isRt(r, 'fog'):
   R.sensed = true; każda nieznana, nierozbrojona LOOKS_TRAP z roomOf === r: learnTrap(t, 'scan', null)
   jeśli wyczuł choć jedną: SAY.sense (3)
h.needPlan = true
```

`RT_SAY` (`p5_ai.js`): `fog: 'rtFog', swamp: 'rtSwamp', grotto: 'rtGrotto', crypt: 'rtCrypt', vault: 'rtVault', haven: 'rtHaven', gears: 'rtGears', hush: 'rtHush', ice: 'rtIce'`. `fl.rtSaid` żyje jedną falę.

### 6.2.8 Lodownia: ślizg (`p5_ai.js: onEnter, slipChance`)

```
slipChance(h) = 0.33 * (h.rank >= 2 ? 0.55 : 1) * (h.type === 'thief' ? 0.6 : 1) * (panicking(h) || h.fleeing ? 1.3 : 1)
w onEnter, gdy r to pokój 'ice' && !h.slid && (h.ldx || h.ldy) && h.state === 'walk' && rand < slipChance(h):
   (sx, sy) = (h.x + h.ldx, h.y + h.ldy)               // jeszcze jedno pole prosto
   jeśli passable(sx,sy) && nie stoi tam żywy potwór nie-DRIFT && to nie pole serca:
      h.nx, h.ny = sx, sy; h.prog = 0; h.sliding = true; h.path = []; SAY.slip (2, dur 1.2, 'loud'); return
ruch w ślizgu: h.prog += 3.2 * dt; po dojściu: h.slid = true (nie dwa razy z rzędu), onEnter(h)
po zwykłym kroku: h.slid = false
ślizg przerywa: stan inny niż 'walk' albo nx === null (klatka, zapadnia)
```

Ślizg nie omija zagrożeń: może wnieść bohatera w obszar pułapki albo na łup (który wtedy podnosi).

### 6.2.9 `planHero`: drzewo decyzji (`p5_ai.js: planHero`)

```
h.needPlan = false; h.thinkT = 0.45 + rand*0.3
if h.gone || caged(h): h.path = []; return
L = leader(); goal = -1; intent = 'follow'; noDanger = false
B()        = bfs(h.x, h.y, {known: true, noDanger, avoid: h.R.avoid * (fleeing 0.6) * (careful 1.3 | greedy 0.85)})   // liczone raz, leniwie
exitG()    = planB = B(); exitGoal()                    // najbliższe z wyjść (wejście albo wyłom) wg B
heartGoal()= nearestOf(B(), heartGoals()) jeśli osiągalne;
             inaczej pole granicy f (B().dist[f] >= 0) z najmniejszym B().dist[f] + 0.6 * manhattan(f, serce)   // serce znane z plotek, droga nie
             inaczej -1

if panicking(h):                         intent 'panic'; noDanger = true; goal = h.fleeing ? exitG() : randomKnownFar(h)
elif exiting(h):                         intent = h.crystal ? 'carry' : 'exit'; goal = exitG()
elif fl.fearless && P.plan === 'assault': intent 'heart'; goal = heartGoal()
elif P.plan === 'retreat' && !h.lost && !onScout(h):     (1.16: zwiadowca z postoju nie siada)
   intent 'retreat'
   spots = pola P.retreatRoom ze standOk i bez heroBlock                                  (1.13: wolne, bezpieczne miejsce)
   if roomOf(h.tx,h.ty) === P.retreatRoom && (standOk(h.x,h.y) || !spots.length): h.state = 'rest'; h.path = []; h.intent = intent; return
   goal = nearestOf(B(), spots, a gdy ich brak: walkable pola P.retreatRoom)
   if goal >= 0 && standOk(h.x,h.y) && na 3 pierwszych polach pathFrom(B(), goal) stoi odpoczywający (state 'rest') przyjaciel:
      h.state = 'rest'; h.path = []; stats.restBy++; return                              (1.13.4: odpoczywa obok nich)
   // 1.13.4: bez tego przyjaciel odpoczywający tuż za drzwiami blokował wejście; bohater stawał w drzwiach (nie standOk),
   // toSafety cofało go o pole, a plan znów prowadził do drzwi (w powtórkach do 15 s)
elif h.lost:                             zgubiony (6.2.10)
elif h.wanderUntil > time && h.wanderTarget >= 0 && isFrontierTile(h.wanderTarget): intent 'wander'; goal = h.wanderTarget
else:
   job = pierwsza pasująca (kolejność jest regułą):
     1  ratunek z klatki: P.rescueId >= 0 i to nie on (6.5.9)
     2  L !== h && L.state === 'fight' && L.foe żywy i !DRIFT          -> {fight, pole L.foe}   (wszyscy pomagają liderowi)
     3  kapłan: najsłabszy (wg hp/max) inny z hp < 0.5 max i hdist > 2.5, z B().dist <= 12 -> {heal, jego pole}
     4  Sanktuarium: h.room typu 'haven' && hp < 0.6 max && !h.napped && !h.lost && plan != 'retreat' && nie płonie
        -> h.napped = true; h.napUntil = time + 5; h.restAt = time; h.dreamSaid = false; state 'rest'; path []; intent 'nap'; SAY.nap (2); return
     5  barbarzyńca: smashJob(h, B())           (6.5.6)
     6  złodziej: disarmJob(h, B())             (6.5.2)
     7  kapłan rangi 1+: blessJob(h, B())       (6.5.3)
     8  każdy: bombJob(h, B())                  (6.5.8)
     9  łup                                     (6.4.3)
     10 wojownik: potwór w jego pokoju          (6.5.1)
     11 zwiadowca: P.scoutId === h.id && h.scoutTarget >= 0 -> {scout, h.scoutTarget}
     12 partner (1.16): P.scoutMate === h.id, zwiadowca istnieje i nie jest zgubiony; sd = B().dist[pole zwiadowcy]:
        sd w 0..1.5 -> intent 'scout', path [], state 'wait', timer 0.3, return;  sd > 0 -> {scout, pole zwiadowcy}
   if job: intent, goal = job
   elif h === L:                                  // lider
      dt = P.detour
      if dt && (time > dt.until || tIdx(h) === dt.goal || B().dist[dt.goal] < 0): P.detour = null; jeśli doszedł do celu: SAY.detourBack (2)
      sc = P.searchId >= 0 ? byId(P.searchId) : null
      if P.detour:                                   intent 'detour'; goal = P.detour.goal     // reszta idzie za nim
      elif sc && sc.lost && B().dist[tIdx(sc)] >= 0: intent 'search'; goal = tIdx(sc)
      elif P.plan === 'assault':                     intent 'heart'; goal = heartGoal(); jeśli poprzednia intencja != 'heart': SAY.assault (2)
      else:                                          intent 'lead'; goal = P.target
   elif L:                                         // reszta: podążanie (6.2.12)
h.intent = intent; if intent !== 'loot': h.lootKey = null
if goal < 0: h.path = []; return
if B().dist[goal] < 0:
   if intent in ('exit','carry','panic'):          // w drodze do wyjścia znajdą drogę, znaną czy nie
      b2 = bfs(h.x, h.y, {noDanger: true}); g2 = nearestOf(b2, exitGoals())
      if g2 >= 0: h.path = pathFrom(b2, g2); h.blocked = -1; return
   h.path = []; h.blocked = fl.time; return        // cel nieosiągalny (np. zamknięta krata)
h.blocked = -1; h.path = pathFrom(B(), goal); h.noPathT = 0
```

`randomKnownFar(h)` (`p5_ai.js`): 40 losowych pól; spośród znanych i przejezdnych bierze to z największym `hypot(pole - h) - 0.3 * hypot(pole - wejście)`: daleko od siebie, z lekką skłonnością w stronę wejścia. Tam biegnie spanikowany, który jeszcze nie ucieka.

`exitGoal()`: przy wyłomie dwa wyjścia; wybiera bliższe wg ostatniego `B()` (`planB`), inaczej wejście.

### 6.2.10 Mgła, rozdzielenie i gubienie się

**Kiedy bohater się gubi** (`p5_ai.js: partyThink`, dla każdego żywego poza liderem, nie zgubionego, gdy `!fl.fearless && !exiting(h) && !caged(h)`). Od 1.16 ktoś celowo oddzielony (`splitting(h)`: zwiadowca, partner albo nowicjusz na wypadzie, 6.2.10a) nie ma rzutu za odcięcie (`sepT = 0`, `sepRolled = false`), ale gubi się bez drogi (`noPathT > 3 && d > 6`) i we mgle (ten sam rzut co niżej). Przedtem zwiadowca i wędrujący w ogóle się nie gubili. Dla pozostałych:

```
d = hdist(h, L)
apart = L && d > 7 && h.room !== L.room
h.sepT = apart ? h.sepT + dt : 0; if !apart: h.sepRolled = false
if h.noPathT > 3 && d > 6:                         getLost(h, 'nopath')
elif h.sepT > 3 && !h.sepRolled: h.sepRolled = true; if rand < lostChance(h): getLost(h, 'sep')
elif h.room >= 0 && isRt(h.room,'fog') && d > 1.5
     && rand < dt * 0.22 * max(0.35, 1 - 0.03*h.lvl) * (thief ? 0.6 : 1): getLost(h, 'fog')

lostChance(h) = clamp(0.12 + 0.03*max(0, roomCount()-6) + (isRt(h.room,'fog') ? 0.45 : 0) - 0.01*h.lvl - (thief ? 0.1 : 0), 0.02, 0.6)
```

`roomCount()` = liczba pokoi (`kind 'room'`). Inne źródła zgubienia: Cień poz. 3 (`p4_traps.js: fireRaw`, samotny nie-lider, `getLost(tgt,'shade')`), wyjście z zapadni (`landFallen`: `h.lost = L && (hdist > 6 || mgła)`, Bezdenny szyb zawsze), patrz 6.5.10.

**`getLost(h, why)`** (`p5_ai.js`):
```
if h.lost: return
h.lost = true; h.sepRolled = true; h.lostT = 0; h.lostCallT = time + 5; h.needPlan = true; SAY.lost (3)
L = leader(); if !L || L === h || P.searchId >= 0 || goingOut() || fl.fearless: return
fearR = średnia fear/courage żywych
if L.rank >= 1 && fearR < 0.6 && rand < 0.6:
   P.searchId = h.id; P.searchUntil = time + 12; kolejka: L mówi SAY.searchLost (+0.8 s)     // wracamy po niego
else: kolejka: L mówi SAY.leaveLost (+0.8 s)                                              // sam trafi
```

**Co robi zgubiony** (`p5_ai.js: planHero`, gałąź `lost`):
```
intent 'lost'
hr = h.hearUntil > time ? byId(h.hearId) : null
if hr żywy, nie zbiegły, nie zgubiony && !inB('howl', h.room):
   bv = bfs(h.x,h.y,{})                      // po wszystkich polach, także nieznanych
   if bv.dist[pole hr] >= 0: goal = pole hr  // idzie na głos
if goal < 0:
   if L && B().dist[pole L] in [0, 14) && rand < 0.5: goal = pole L        // słyszy drużynę
   else:
      drzwi jego pokoju (bez wejścia, nie to, na którym stoi), osiągalne (B().dist > 0)
      if są && rand < 0.65: goal = losowe z nich
      else: fr = frontier(); goal = (fr && rand < 0.6) ? najbliższa granica : randomKnownFar(h)
```

Co krok `partyThink` dla zgubionego: strach `4/s` (`'lost'`); przez pierwsze 12 s Groza `GZ.lost * dt * depthMult * mods.lostMult` (sekcja 03); gdy `time > h.lostCallT` i nie panikuje: `h.lostCallT = time + 6 + 3*rand`, `SAY.lostCall` (2), `answerLost(h)`.

**`answerLost(h)`** (`p5_ai.js`):
```
if fl.fearless || goingOut(): return
if inB('howl', h.room): kolejka: h mówi SAY.echoLost (+1.4); return          // Kamień wyjec: echo
if isRt(h.room,'hush'): return                                               // Głusza: nikt nie słyszy
b = bfs(h.x,h.y,{})                                                          // wszystkie pola, koszt z zagrożeniem
best = najbliższy (b.dist) żywy inny: nie zgubiony, nie panikuje, nie w klatce, nie ucieka, nie w pokoju z wyjcem,
       z b.dist <= (bard ? 26 : 14)
if !best: return
h.hearUntil = time + 7; h.hearId = best.id; h.needPlan = true
kolejka: best mówi (bard ? SAY.bardCall : SAY.answer) z imieniem h (+0.8); h mówi (bard ? SAY.lostHear : SAY.hearVoice) (+1.8)
```

Bard dodatkowo sam woła zgubionych co 9 s (6.5.5).

**Odnalezienie** (`partyThink`): zgubiony przestaje być zgubiony, gdy `d < (mgła w jego pokoju lub w pokoju lidera ? 1.6 : 4.5)` albo gdy jest bliżej niż 2,5 od tego, czyj głos słyszy. Wtedy `lost = false`, `hearUntil = -1`, `noPathT = sepT = 0`, `sepRolled = false`, `SAY.found` (3), `needPlan`; jeśli to był szukany: `P.searchId = -1`.

Lider nigdy nie jest zgubiony: w `partyThink` liderowi zawsze `lost = false`, `sepT = 0`; zgubiony nie może zostać liderem (6.3.1).

**Szukanie zgubionego przez lidera** kończy się (`P.searchId = -1`), gdy szukany nie istnieje, nie jest już zgubiony, nie żyje, zbiegł, minęło `searchUntil` albo drużyna wychodzi.

**Lider błądzi we mgle** (`partyThink`, Prototype 1.01): gdy lider (nie wychodzą, nie `fearless`, brak `P.detour`) jest w pokoju typu `fog`, raz na pokój mgły na falę (`P.fogDone`): cel = losowe `walkable` pole tego pokoju w odległości co najmniej 2 od lidera, `P.detour = {goal, until: time + 3 + 0.25*max(0, 8 - L.lvl/2)}`, lider mówi jedną z trzech kwestii zaszytych w kodzie (prio 3, 6.7.8). Cała drużyna idzie za nim (6.2.12).

W mgle także: brak wykrywania wzrokiem (`scanTraps` pomija pułapki w pokoju mgły), mag nie "czuje" pułapek, strach +15% (sekcja 05).


### 6.2.10a Celowe rozdzielenie: zwiad (1.16)

Autor: bohaterowie mogą się zgubić (Groza jak dotąd), ale mogą też rozdzielić się celowo, np. na zwiad, i to nabija Grozę wolniej.

**Kto jest celowo oddzielony** (`p5_ai.js`):
```
onScout(h)   = h.id === P.scoutId || h.id === P.scoutMate
splitting(h) = onScout(h) || (h.wanderUntil > time && h.wanderTarget >= 0 && isFrontierTile(h.wanderTarget))
startSplit(h, why): jeśli !h.split: h.split = true; stats.splits++; tl('rz', h.id, why); napis 'Zwiad' (#9fe0cf)
   why: 'scout' (narada), 'mate' (partner), 'ahead' (zwiad przodem), 'rest' (zwiad na postoju), 'wander' (nowicjusz)
```
`h.split` trwa także w drodze powrotnej, aż stanie przy drużynie.

**Co krok `partyThink`, dla każdego z załogi** (przed samotnością, 6.6.5):
```
h.alone = (jak dotąd: są inni, kolejka pusta, najbliższy > 4,5)
if h.split && (h.lost || h === L): h.split = false
away = false
if h.split:
   rest = inni z załogi bez split                    // drużyna, od której odszedł (zwiadowca i partner są osobno razem)
   away = rest niepuste && kolejka pusta && min hdist(h, rest) > 4.5
   if !away && !splitting(h): h.split = false        // wrócił
if h.split && away:
   stats.splitTime += dt; addFear(h, 1 * dt, null, 'split')
   Groza GZ.split (0,04) * dt * depthMult(h.room) * (h.alone ? mods.loneMult : 1) -> stat 'splitPts'
   h.aloneSaid = true                                // nie woła 'Jest tu ktoś?'
elif h.alone: samotność jak dotąd (2,5/s strachu, GZ.alone 0,09)
```
Porównanie (stawki bazowe na sekundę; strach daje dodatkowo Grozę `strach / courage * GZ.fear`, sekcja 03):

| Stan | Groza stała | Strach |
|---|---|---|
| zwiad (`split` i z dala) | `0.04` | `1` |
| sam (`alone`, bez planu) | `0.09` | `2.5` |
| zgubiony | `0.12` przez 12 s, zwykle też samotność `0.09` | `4`, zwykle też `2.5` |

`h.alone` zostaje prawdą także na zwiadzie (fizycznie jest sam), więc pułapki, które polują na samotnych (Oczy, Cień, fobia ciemności, Izolacja: źródło `'split'` dostaje ×1,25 jak inne, nie ×2,5 jak `'alone'`), widzą go jako samotnego. Zwiadowca z partnerem nie są samotni (stoją razem), ale są z dala od drużyny.

**Koniec przez zgubienie**: `getLost` (6.2.10) przy `h.split`: `split = false`, `stats.splitLost++`; zawsze `wanderUntil = -1`. Zwiad kończy się w kroku 13, bo zwiadowca jest zgubiony.

**Skąd biorą się zwiady** (szczegóły w 6.3.3 i 6.3.7):

| Wyzwalacz | Kto | Szansa |
|---|---|---|
| narada na rozwidleniu | złodziej (hp > 50%), a bez niego odważny nie-kapłan (hp > 60%, bez kryształu); 3+ żywych, nikt nie jest na zwiadzie | złodziej `0.55` (`0.9` z łupem przy drugiej drodze), odważny `0.3` (`0.5`) |
| partner przy naradzie | najbliższy odważny, potem najbliższy inny w promieniu 6 od zwiadowcy: nie lider, nie kapłan, nie tchórz, hp > 50%, bez kryształu; 4+ żywych | `0.45` |
| zwiad przodem | złodziej (hp > 60%, do 8 pól od lidera) przy wejściu lidera do nowego pokoju; plan `explore`, lider rangi 1+, 3+ w załodze, cel co najmniej 3 pola od lidera, po 15 s fali, co najmniej 40 s od poprzedniego | `0.4` |
| zwiad na postoju | złodziej z hp > 70%, 3 s po początku odpoczynku, 3+ w załodze; jeden rzut na postój | `0.5` |
| wypad nowicjusza | jak dotąd (6.2.12) | jak dotąd |

**Widać to**: turkusowy przerywany pierścień pod bohaterem zamiast pomarańczowego samotności (`p7_draw.js`), znak `›` w pasku bohaterów, w karcie bohatera stan `na zwiadzie`, w podsumowaniu fali wiersz `Zwiad (celowo osobno)`, w Szczegółach wiersz `Osobno: na zwiadzie / sam / zgubiony (s)`, ciekawostka `Rozdzieleni` (gdy co najmniej 4 s zwiadu), strach ze źródła `'split'` opisany jako `rozdzielenie (zwiad)`.

### 6.2.11 Zły skręt na rozwidleniu (`p5_ai.js: maybeDetour`)

Wołane w `onEnter`, gdy lider wchodzi do nowego pokoju (`kind 'room'`).
```
if P.detour || fl.fearless || goingOut() || L.lost || P.plan === 'retreat' || time < P.detourCd: return
doors = drzwi pokoju bez wejścia; fog = isRt(r,'fog')
if doors.length < 3 && !(fog && doors.length >= 2): return
p = 0.05 + 0.02*max(0, roomCount()-6) + (fog ? 0.25 : 0) - 0.004*L.lvl - (L thief ? 0.03 : 0)
if fl.heartKnown && P.plan === 'assault' && L.rank >= 2: p *= 0.5
if rand >= clamp(p, 0, 0.4): return
cand = drzwi spoza najbliższych 10 pól ścieżki lidera, nie te, na których stoi, znane
d = losowe z cand; goal = pole drzwi
if fl.rooms[d.b] to korytarz: goal = jego drugie drzwi, jeśli znane          // w głąb korytarza
P.detour = {goal, until: time + 10}; P.detourCd = time + 15; SAY.detour (3); L.needPlan = true
```

Koniec objazdu w `planHero` lidera (6.2.9): po `until`, po dojściu (`SAY.detourBack`) albo gdy cel nieosiągalny. Uwaga: sprawdzany jest tylko `d.b` (druga strona drzwi wg zapisu mapy); jeśli korytarz jest po stronie `d.a`, cel zostaje na drzwiach (niepewne: sprawdź `p5_ai.js: maybeDetour` i kierunek `a/b` w `p2_state_map.js: buildMap`).

### 6.2.12 Podążanie za liderem i odstępy (`p5_ai.js: planHero`, gałąź `follow`)

```
intent 'follow'; lt = pole lidera; d = B().dist[lt]       // koszt z zagrożeniem, nie liczba kroków
gap = (kapłan || mag) ? 3.5 : 2.5                           // tylna linia trzyma się krok dalej
if d >= 0 && d <= gap && L.state !== 'boss':
   if !h.lost && (stoi na polu lidera || jakiś o mniejszym id stoi (nx === null) na jego polu):
      sp = sąsiednie pola: walkable, znane, fl.danger == 0, bez przedmiotu, w odległości <= gap + 0.5 od lidera,
           nikt na nich nie stoi i nikt tam nie idzie (nx,ny)
      if sp: h.intent = 'space'; h.lootKey = null; h.path = [losowe z sp]; return    // grupa, nie kupa
   h.intent = intent; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = 0.35; return
goal = ((L.state === 'boss' || P.plan === 'assault') && !P.detour && P.searchId < 0) ? heartGoal() : lt
if goal < 0: goal = lt
```

- Gdy lider wyważa kryształ albo plan to `assault`, reszta idzie od razu do serca (bez objazdu i szukania), i nie zatrzymuje się przy liderze, gdy ten jest w stanie `boss`.
- Lider czeka na maruderów: `partyThink` (gdy plan nie `retreat`, nie `fearless`, nie wychodzą, `L.R.coord`): `far` = inni (nie zgubieni, nie na zwiadzie: `!onScout`, nie panikują, nie walczą, nie w klatce) z `hdist > 7`; jeśli są i `time > P.waitUntil + 2`: `P.waitUntil = time + 1.6`, `partySay('regroup', 2)`. Lider w tym czasie stoi w stanie `talk` (6.1.8).
- Nowicjusz odłącza się sam (`partyThink`, plan `explore`): dla każdego rangi 0, nie lidera, nie zgubionego, nie wędrującego, nie w klatce, z szansą `0.004` na wywołanie (`partyThink` 4 razy na sekundę, ok. 1,6% na sekundę): losowe pole granicy dalej niż 4 od niego, `wanderUntil = time + 10`, `SAY.wander` (2), od 1.16 `startSplit(h, 'wander')`. Wędrujący nie staje do rozmów; od 1.16 nie ma rzutu za odcięcie, ale może się zgubić we mgle i bez drogi (6.2.10, 6.2.10a).

### 6.2.13 Wejście do lochu: spawn, czekanie, drugi oddział

- Bohaterowie wchodzą co `0.3` s z kolejki fali (`p6_loop.js: step`) na pole wejścia albo wyłomu (`spawnPt`, sekcja 07). `spawnHero` od razu odsłania okolicę (`reveal`) i mówi kwestię otwarcia (6.7.9 A).
- **Czekanie przy wejściu** (`GATE_T = 1.8` s, `p6_loop.js`): do tego czasu nikt się nie rusza i nie ma skill checków (testerzy nie zdążali reagować); `partyThink` już działa. Po otwarciu `alive()[0]` mówi `SAY.gate` (2, dur 1.6).
- **Drugi oddział** (`p6_loop.js: step`, `p3_flow.js: regroupAtDoor`): jeśli w kolejce są jeszcze bohaterowie, a drużyna w środku ucieka (`P.plan === 'flee'`), pozostali czekają na zewnątrz, dopóki ktoś jest w środku, najwyżej 8 s (`fl.holdT`). Potem `regroupAtDoor()` (plan `explore`, nowy lider, `fl.secondGroup++`) i wchodzą dalej. Każdy wchodzący w drugim oddziale ma od razu `fear = 0.2 * courage` i mówi `SAY.secondGroup` (3), gdy jest jedynym żywym z wpisu fali albo z szansą 0,3.

### 6.2.14 Wyjście z lochu (`p3_flow.js: heroExit`)

Wychodzący (`exiting`) idzie do najbliższego wyjścia (wejście albo wyłom). Gdy stanie na polu wyjścia (w `onEnter` albo stojąc w `updateHero`): `heroExit(h)`.
```
if !h.crystal && !h.fleeing && panicking(h): h.fleeing = true      // wybiegł w panice = przestraszony
h.fled = true; h.bubble = null
if h.crystal:   kryształ stracony (sekcja 03); P.carrierId = -1
elif h.fleeing: przestraszony: Esencja za przestraszenie, opowieść o skarbach (sekcja 03)
else:           po prostu wyszedł (fl.stats.left)
if h.loot: run.rumor.gold += 0.05*h.loot + 0.02*h.gold                // chciwość następnej fali (sekcja 03)
fl.anyOut = true                                                      // ktoś wyniesie plotki (sekcja 03)
```

### 6.2.15 Jedno pole na bohatera i mijanie (od 1.12.1, `p5_ai.js: heroBlock, detourAround, stepAside, idleIn, makeWay, updateHero`)

Decyzja autora (20.10): bohater zajmuje jedno pole jak potwór; dwóch nie stoi na jednym polu, wyjątek to mijanie.

```
heroBlock(h, x, y):                        // kto zajmuje albo rezerwuje pole (x, y)
    if isExitTile(x, y): return null       // drzwi wejściowe i wyłom są "na zewnątrz": tam wolno stać razem (zbiórka przed bramą)
    dla każdego innego o (nie martwy, nie wyszedł, nie zniknął w zapadni):
        if heroTile(o) == (x, y) || (o.nx, o.ny) == (x, y): return o
    return null

przed krokiem na pole n (stojący, h.nx == null, po walce/rozbrajaniu/tarczy/mocach):
    o = heroBlock(h, n)
    if o:
        swap = (o.nx, o.ny) == (h.x, h.y) ||                         // idzie na mnie
               (o.nx == null && o.state == 'walk' && o.path[0] == (h.x, h.y))   // stoi i za chwilę ruszy na moje pole
        if !swap:
            if h.path.length == 1 && o.nx == null:                   // cel jest zajęty przez stojącego: staję obok
                if h.lootKey && makeWay(o, h, 0): return             // od 1.13.2: chyba że to skarb, po który idzie
                h.path = []; h.state = 'wait'; h.timer = 0.3; return
            h.blockT += dt
            if h.blockT < BLOCK_WAIT (0.45 s): return                // chwila, może tamten zejdzie
            if o.nx == null && makeWay(o, h, 0): return              // bezczynny robi miejsce (niżej)
            if !h.detoured: h.detoured = true; if detourAround(h): h.blockT = 0; return
            urgent = exiting(h) || panicking(h) || h.fleeing || h.crystal
            jam = o.nx == null && o.state == 'walk' && o.blockT > 0  // tamten też stoi zablokowany
            if h.blockT < (urgent ? SQUEEZE_RUN 0.6 : jam ? SQUEEZE_T 2.2 : SQUEEZE_LONG 6): return
            beyond = h.path[1]                                       // przeciska się tylko NA WYLOT
            if !urgent && (!beyond || heroBlock(h, beyond)):
                if h.blockT > SQUEEZE_LONG + 2: h.blockT = 0; h.detoured = false; h.path = []; h.needPlan = true   // nowy plan
                return
            stats.squeezes++                                         // przeciska się (mijanie)
        h.passing = o.id; if swap: o.passing = h.id                  // widok: odchylenie w bok (6.2.1)
    h.blockT = 0; h.detoured = false; krok jak dotąd
po kroku: h.passing = null
```

- `detourAround(h)`: BFS (4 kierunki) od pola bohatera po polach `passable`, bez pól zajętych (`heroBlock`) i bez żywych potworów (nie dryfujących), do najbliższego pola dalszej części ścieżki (indeks >= 1); co najwyżej 160 odwiedzonych pól i 8 kroków objazdu; nowa ścieżka = objazd + reszta starej (`stats.sidesteps++`).
- `stepAside(h)` (na początku części ruchowej `updateHero`, dla stanów `walk`, `talk`, `wait`, `rest`, gdy `h.nx == null`): jeśli na tym samym polu stoi inny bohater o niższym `id` (też stojący) i pole nie jest wyjściem, bohater o wyższym `id` schodzi na losowe wolne sąsiednie pole (przejezdne, nie zajęte, nie serce, bez żywego potwora): `state = 'walk'`, `needPlan` (`stats.sidesteps++`). Tak rozchodzą się bohaterowie po upadku z zapadni, poślizgu albo przeciśnięciu.
- `makeWay(o, h, depth)` (robienie miejsca): działa tylko na bezczynnego `o` (`idleIn(o)`: `o.nx == null`, nie idzie do narady `!o.huddle`, stan `wait`, `talk` albo `walk` bez ścieżki; nie na polu wyjścia; `depth <= 4`). Najpierw krok w bok: losowe sąsiednie pole przejezdne, wolne (`heroBlock`), nie serce, nie pole `h`, bez żywego potwora, bez elementu (`fl.items`), bez znanego zagrożenia (`fl.danger`) i nie na drodze `h` (pole `h` i `h.path`). Gdy takiego nie ma (od 1.13.2): zamiana miejscami, czyli `o` idzie na pole `h` (`o.passing = h.id`, `stats.swapWay++`), a `h` w następnej klatce widzi to jako mijanie (`swap`) i wchodzi na pole `o`; tylko gdy następne pole drogi `h` to pole `o` i `h` stoi. Do 1.13.1 `o` robił krok naprzód po drodze `h` (a stojący tam robił miejsce pierwszy), po czym wracał do przywódcy: w ślepym przejściu (pas szerokości jednego pola) cała drużyna przesuwała się gęsiego o pole w tę i z powrotem przez cały najazd (run autora `mvh4wnpcy54a`, fala 7). Ruch: `o.state = 'walk'; o.path = []; o.nx, o.ny = pole; o.prog = 0; o.needPlan = true` (`stats.makeWay++`). Bez tego przywódca stał za własną drużyną: idący za nim czekają w odległości 2,5-3,5 kroku (6.2.12), a w korytarzu to dokładnie pola jego drogi.
- Przeciskanie na wylot: w wersji roboczej 1.12.1 zablokowany wchodził na pole stojącego i, gdy dalej też było zajęte, stał tam razem z nim (w testach 1-7% klatek z dwoma na jednym polu, raz drużyna stała w korytarzu ok. 100 s). Teraz bez pośpiechu przeciska się tylko, gdy pole za stojącym jest wolne; uciekający, panikujący i niosący kryształ nadal przeciskają się po 0,6 s.
- Ślizg na lodzie nie wjedzie na pole zajęte przez bohatera (`onEnter`), a powrót z zapadni (`p4_traps.js: landFallen`) wybiera pole bez bohatera.
- Skutki dla gry: kolce i inne pułapki jednego pola trafiają mniej bohaterów naraz; w korytarzach drużyna idzie gęsiego; walczyć z potworem w korytarzu może tylko pierwszy; fale są dłuższe (odtworzenia: ok. +30%).
- Test: `tests/t1121_tiles.py` (12 fal na losowych lochach: dwóch stojących na jednym polu w 0,2-0,3% klatek zamiast 18,5% w 1.12, żadna fala nie utknęła; próg testu 1%).

### 6.2.16 Nikt nie stoi w pułapce (od 1.13, `p3_flow.js: markOuch`, `p5_ai.js: unsafeAt, standOk, toSafety`)

Decyzja autora (20.10): bohaterowie nie mają stawać ani odpoczywać w pułapkach.

```
markOuch(h, it): przy ranie (damage) albo strachu (addFear) od elementu, który właśnie odpala (fl.firing; strach tylko od pułapek
                 i straszących): h.ouch = { until: time + 30, tiles: areaOf(it) + pole elementu }   // pamięta to sam, nawet gdy drużyna nic nie wie
unsafeAt(h, x, y) = fl.danger[y*WW+x] > 0 || (h.ouch && time < h.ouch.until && h.ouch.tiles.has(y*WW+x))
standOk(h, x, y)  = walkable && !unsafeAt && brak elementu na polu (pułapka, łup, potwór) && nie serce
toSafety(h): stojący (h.nx == null), nie na polu wyjścia, !standOk(h, h.x, h.y):
   BFS do 3 kroków po passable bez bohaterów (heroBlock) i żywych potworów; kandydaci = pola standOk, wolne;
   odpoczywający: tylko w swoim pokoju; stojący z liderem (samePlace): tylko w miejscu lidera;
   cel = kandydat najbliżej lidera (+ 0,5 × kroki); h.path = droga, h.toSafe = true (planHero i rozmowa jej nie przerywają),
   stats.toSafety++; brak kandydata -> zostaje
updateHero: przed zejściem z pola (stepAside) -> if stan talk / wait / rest && toSafety(h): return
stepAside (6.2.15): wybiera pole standOk, jeśli takie jest
odpoczynek (odwrót, 6.3.x): w pokoju odwrotu siada tylko na polu standOk, inaczej idzie do najbliższego wolnego pola standOk
   w tym pokoju; gdy takiego nie ma, siada, gdzie stoi
scenka odpoczynku (restScene): mówią tylko ci, którzy już siedzą razem (samePlace z pierwszym siedzącym); lider, jeśli jest z nimi
```

- Pomiar (10 fal z gęstymi pułapkami na trasie): klatki "stoi w pułapce" (stan talk/wait/rest na polu w zasięgu pułapki) 1016 na 1.12.1, ok. 260-560 na 1.13 (zostają głównie zatory w korytarzach, gdzie nie ma dokąd zejść); odpoczynek w pułapce: 0 w obu.
- Skutek dla gry: bohaterowie rzadziej giną głupio, fale są dłuższe (odtworzenia runów autora: suma czasów fal 2-10 +15% i +5% względem 1.12.1, Esencja +0% i +1%).

## 6.3 Decyzje drużyny

### 6.3.1 Lider (`p5_ai.js: leader`)

```
leader():
  L = byId(P.leaderId)
  if !L || L.dead || L.fled || L.gone || L.lost || panicking(L) || caged(L) || (L.fleeing && P.plan !== 'flee'):
     c = alive() bez: zgubionych, panikujących, w klatce, uciekających (uciekający dopuszczeni tylko w planie 'flee')
     c.sort: rank malejąco, przy remisie indeks typu w LEADER_ORDER rosnąco
     L = c[0] || alive()[0] || null
     P.leaderId = L ? L.id : -1
  return L
```

- `LEADER_ORDER.json`: `warrior, barbarian, priest, bard, mage, thief`.
- Liczy się ranga (przedział poziomów), nie poziom: elita poz. 6 wojownik wygrywa z elitą poz. 9 magiem. Boss fali ma zwykle najwyższą rangę (sekcja 04).
- Zmiana lidera następuje "w locie", przy pierwszym wywołaniu `leader()` po utracie zdolności do prowadzenia; nie ma osobnej kwestii. `kill` i `fall` ustawiają `P.leaderId = -1`.
- Niosący kryształ ma `fleeing = false`, więc może prowadzić.
- Co lider robi inaczej: wybiera cel eksploracji, zarządza odwrotem (tylko poz. 3+, `R.coord`), czeka na maruderów i zbierających łupy, waha się przed nieznanym, decyduje o ratowaniu z klatki i szukaniu zgubionych, wywołuje objazdy, mówi kwestie drużyny (`partySay`). Ranga lidera ustawia próg ucieczki drużyny (6.6.3).

### 6.3.2 `partyThink(dt)`: kolejność (`p5_ai.js: partyThink`, co 0,25 s)

```
 1  kolejka kwestii P.queueSay (6.7.3)
 2  lootSeen(it) dla każdego łupu na mapie (6.4.1)
 3  crew = alive(); if !crew.length: return
 4  L = leader()
 5  P.morale = min(1, P.morale + (bard w drużynie, nie zgubiony, nie w klatce ? 0.02 : 0.012) * dt)
    1.16: if P.detour && time > P.detour.until: P.detour = null; L.needPlan = true     (dawniej objazd czyścił tylko
        planHero lidera bez własnej pracy, więc lider zajęty łupem trzymał stary objazd i blokował nowe pomyłki, mgłę i zwiad przodem)
 6  lider błądzi we mgle (6.2.10)
 7  dla każdego h z crew: rozdzielenie (6.2.10a) albo samotność, rany, klątwa, kołysanka, klatka (6.6.5); reakcja na kontr-budowlę (6.3.12);
    if h === L: h.lost = false; h.sepT = 0; dalej następny
    odnalezienie albo zgubienie (6.2.10); zgubiony: strach 4/s, Groza, wołanie (6.2.10)
 8  podanie mikstury przyjacielowi (6.5.8)
 9  if !L: return
10  if P.prep && time >= P.prep.until: finishPrep() else if !P.prep: checkPrep(L)          (6.3.8)
11  każdy w klatce, a nie w P.cageDecided: decideCage(h, L); P.rescueId nieważny -> -1        (6.5.9)
12  avgHp = średnia hp/max załogi; fearR = średnia fear/courage załogi
13  zwiadowca: następna granica albo powrót (6.3.3); zwiad przodem (6.3.3); koniec czekania na zwiadowcę; partner (6.2.10a)
14  zmiana planu:
      goingOut():        nic (wszyscy do wyjścia)
      elif fl.fearless:  if plan != 'assault' && fl.heartKnown: plan = 'assault'; replanAll()
      elif plan 'retreat': koniec odpoczynku? (6.3.7)
      elif decyzja o odwrocie (6.3.7)
15  if !goingOut() && (fearR > [0.75, 0.85, 0.95, 1][L.rank] || (P.morale < 0.2 && L.rank < 2)): partyFlee()   (6.6.3)
16  przeszukanie i decyzja o szturmie (6.3.4)
17  P.searchId nieważny -> -1 (6.2.10)
18  plan 'explore': cel ważny? inaczej chooseTarget(L) (6.3.3); brak celu i serce znane -> assault
19  zamknięta krata (6.3.11)
20  zasadzka (6.3.12)
21  small talk (6.7.6)
22  wołanie o kapłana (6.5.3)
23  lider czeka na zbierającego łup (6.4.5)
24  lider czeka na maruderów (6.2.12)
25  nowicjusze odłączają się (6.2.12)
```

### 6.3.3 Eksploracja: wybór celu, narada, zwiad

**Ważność celu** (krok 18): w planie `explore` cel jest ważny, gdy `P.target >= 0` i (`isFrontierTile(P.target)` albo `P.targetRoom >= 0` i ten pokój nie jest jeszcze odwiedzony). Nowy wybór, gdy cel nieważny albo gdy przed chwilą doszła nowa wiedza (`fl.knowDirty && time - fl.newKnowAt < 0.5`); po wyborze `fl.knowDirty = false`, `replanAll()`. Jeśli po wyborze `P.target < 0` i serce znane: `plan = 'assault'`, `partySay('assault', 3)`, `replanAll()`. Jeśli serce nieznane i nie ma już nic do odkrycia, lider stoi (ścieżka pusta), aż skończy się cierpliwość (6.3.10).

**`chooseTarget(L)`** (`p5_ai.js`):
```
fr = frontier(); st = P.wantSearch ? searchTargets() : []
P.targetRoom = -1
if !fr && !st: P.target = -1; return
b = bfs(L.x, L.y, {known: true, avoid: L.R.avoid})
seenLoot = łupy z seenWave === bieżąca fala
add(f, room, bonus):
   d = b.dist[f]; if d < 0: pomiń
   sc = d - 0.18 * manhattan(f, wejście) + rand*1.5 + bonus     // lekko woli głąb lochu
   dla każdego łupu z seenLoot w odległości <= 6 od f: sc -= 3 * rarity(łup)
   if room >= 0 && pokój typu 'vault': sc -= 4                // Sezam przyciąga
granica: add(f, -1, 0); cele przeszukania: add(t.i, t.room, 2)   // nieznane kusi bardziej niż pokój, o którym słyszeli
sortuj rosnąco po sc
if L.rank === 0:                                              // nowicjusz bierze cokolwiek z pierwszej trójki
   c = cands[min(len-1, rand(0,2))]; P.target = c.f; P.targetRoom = c.room
   if cel się zmienił && rand < 0.3: partySay('rookieLead', 1); return
best = cands[0]; P.target = best.f; P.targetRoom = best.room
alt  = pierwszy inny kandydat z sc < best.sc + 5 i manhattan(alt, best) > 5
room = pokój/korytarz lidera; na polu drzwi: pierwszy sąsiedni obszar spoza P.junctions
if alt && room >= 0 && room nie w P.junctions && !fl.fearless && time - P.lastTalkAt > 6:  narada (niżej)
elif cel się zmienił && rand < 0.35: partySay('explore', 1)
```

`searchTargets()`: dla każdego pokoju (`kind 'room'`) znanego (`seen`), jeszcze nieodwiedzonego, nie serca: najbliższe środkowi `walkable` pole.

**Narada na rozwidleniu** (`chooseTarget`, wersja 1.05): `P.lastTalkAt = time`, `P.junctions.add(room)`.
```
lureAlt = jakiś widziany łup w odległości <= 6 od alt
crewT   = talkGroup(L) bez lidera (6.7.5): stoją z nim (samePlace), nie zgubieni, nie panikują, nie w klatce, nie uciekają, nie na zwiadzie (onScout), nie wychodzą
greedy  = lureAlt ? pierwszy z crewT z cechą greedy albo łowca : null
careful = pierwszy z crewT z cechą careful
coward  = P.morale < 0.8 ? pierwszy z crewT z cechą coward : null
brave   = coward ? pierwszy z crewT z cechą brave : null
lines = [[L, deliberate]] + [greedy, argueLoot] + [careful, argueCareful] + [coward, argueCoward] + [brave, argueBrave] (tylko istniejący)
if lines.length < 2 && crewT.length: lines.push([null, deliberate])   // ktokolwiek (1.13: sam lider nie spiera się sam ze sobą)
if greedy:
   sway = L.trait === 'greedy' || L.hunter || L.rank === 0 || rand < 0.35
   if sway: P.target = alt.f; P.targetRoom = alt.room       // lider ulega chciwemu
   lines.push([L, sway ? decideYes : decideNo])
thief = złodziej z crewT
vol   = thief z hp > 0.5 max, a bez niego (1.16) pierwszy z crewT odważny, nie kapłan, hp > 0.6 max, bez kryształu
volP  = vol === thief ? (lureAlt ? 0.9 : 0.55) : (lureAlt ? 0.5 : 0.3)
if !greedy && vol && alive().length >= 3 && P.scoutId < 0 && rand < volP:
   P.scoutId = vol.id; vol.scoutTarget = alt.f; vol.scoutUntil = time + 16; vol.needPlan = true; stats.scouts++; startSplit(vol, 'scout')
   lines.push([vol, scout])                                 // sam się zgłasza na zwiad
   mate = alive().length >= 4 && rand < 0.45 ? partner (6.2.10a) : null
   if mate: P.scoutMate = mate.id; mate.needPlan = true; startSplit(mate, 'mate'); stats.scoutPairs++
            lines.push([mate, splitMate], [L, splitReply])  // "Idę z tobą." / "Dobra, rozdzielmy się. Ale na chwilę!"
   else:    lines.push([L, scoutReply])
quiet = pierwszy z crewT, który jeszcze nic nie powiedział i nie jest złodziejem
if quiet: lines.push([quiet, councilReply])                 // 1.12.1: ktoś jeszcze dorzuca słowo
talkAs(1.4 + 0.45 * lines.length, lines)                   // drużyna staje i rozmawia (6.7.5)
huddleUp(L)                                                 // podchodzą do lidera (6.7.5)
```

Ostrożny i tchórz tylko mówią; o kierunku decyduje lider (i ewentualnie chciwy).

**Zwiad**: zwiadowca idzie do `scoutTarget` (praca nr 11 w `planHero`, więc wcześniejsze prace złodzieja, np. rozbrajanie i łup, mają pierwszeństwo), partner za nim (praca nr 12). Nie stają do rozmów, nie są liczeni do czekania na maruderów; od 1.16 gubią się tylko we mgle albo bez drogi (6.2.10). Krok 13 (`partyThink`):
```
sc = byId(P.scoutId)
// 1.16: zobaczył tę granicę -> następna po jego stronie, dopóki ma czas
if sc żywy, nie zbiegł, nie zgubiony, nie lider, time <= scoutUntil, hp >= 0.45 max, scoutTarget >= 0, !isFrontierTile(scoutTarget):
   nb = nextScout(sc, L); if nb >= 0: sc.scoutTarget = nb; sc.needPlan = true; stats.scoutSteps++
if sc && (nie żyje || zbiegł || zgubiony || sc === L || time > scoutUntil || hp < 0.45 max || cel przestał być granicą):
   jeśli żywy, nie zbiegł, nie zgubiony, nie lider: SAY.scoutBack (2)
   P.scoutId = -1; scoutTarget = -1; needPlan
nextScout(sc, L): b = bfs(sc, {known}); najbliższa (b.dist <= 14) granica, która nie jest bliżej lidera niż sc teraz
```
Partner (krok 13, po zwiadowcy): gdy `P.scoutId < 0`, nie żyje, zbiegł, zgubiony, jest liderem albo `hp < 0.45 max`: `P.scoutMate = -1`, `needPlan`; `SAY.scoutBack` mówi tylko, gdy zwiadowca nadal jest na zwiadzie.

**Zwiad przodem** (1.16, krok 13, także w lochu bez rozwidleń): `if P.plan === 'explore' && !fearless && !goingOut() && P.scoutId < 0 && !P.detour && P.searchId < 0 && L.room >= 0 && L.room !== P.aheadRoom`: `P.aheadRoom = L.room`; dalej, gdy to pokój (`kind 'room'`), `L.rank >= 1`, `time > (P.aheadCd || 15)`, załoga 3+, `P.target >= 0`, `rand < 0.4`: `th` = złodziej, nie lider, `hp > 0.6 max`, bez kryształu, nie w klatce, nie zgubiony, nie panikuje, `hdist(th, L) <= 8`; jeśli jest i cel jest co najmniej 3 pola od lidera: `P.scoutId = th.id`, `scoutTarget = P.target`, `scoutUntil = time + 12`, `stats.scouts++`, `stats.aheadScouts++`, `P.aheadCd = time + 40`, `P.aheadUntil = time + 8`, `P.waitUntil = max(P.waitUntil, P.aheadUntil)`, `P.aheadWait = th.id`, `startSplit(th, 'ahead')`, `SAY.aheadScout` (2), lider po 1,3 s `SAY.aheadReply`. Drużyna stoi (lider w stanie `talk`). Gdy zwiad się skończy (`P.scoutId !== P.aheadWait`): `P.aheadWait = -1` i jeśli `P.waitUntil <= P.aheadUntil`, czekanie kończy się od razu.

### 6.3.4 Ile przeszukać przed szturmem (`p5_ai.js: partyThink`, krok 16)

```
rooms     = pokoje (kind 'room')
seenShare = Σ (R.visited ? 1 : R.seen ? 0.3 : 0) / rooms.length
if fl.heartKnown && !P.heartSaid && !goingOut():
   P.heartSaid = true; L mówi (seenShare < 0.65 && L.rank > 0 ? SAY.heartLater : SAY.heartSeen) (3)
need   = min(0.85, (L.rank === 0 ? 0.5 : 0.6) + 0.1 * clamp(greedRaw(fl.greed) - 1, 0, 2) - (L.rank >= 2 ? 0.1 : 0))
tLimit = S.waveTime * min(0.6, 0.45 + 0.01 * max(0, rooms.length - 6))      // duży loch: więcej czasu
detourG = P.gateDetourUntil > time                                          // krata kazała obejść (6.3.11)
P.wantSearch = (seenShare < need && time < tLimit) || detourG               // zmiana -> fl.knowDirty = true
if P.plan === 'explore' && !detourG && fl.heartKnown && avgHp >= 0.5 && (seenShare >= need || time > tLimit):
   P.plan = 'assault'; P.detour = null; partySay('assault', 3); replanAll()
   gr = inny niż lider chciwy albo łowca, nie zgubiony, nie panikuje
   if gr && seenShare < 0.85: kolejka gr: SAY.argueSearch (+1), L: SAY.replySearch (+2)
```

Im bardziej chciwi (globalna Chciwość `fl.greed`, sekcja 03), tym więcej lochu przeszukują przed szturmem. `greedRaw(g) = g <= 1 ? g : (g*g + 1)/2`.

### 6.3.5 Wiedza: pułapki, plotki, potwory

**Zapamiętanie pułapki, która odpaliła przy nich** (`p4_traps.js: fireRaw`, tylko `TRAPS`, nie potwory):
```
witnesses = żywi, których pokój (h.room) jest jednym z pokoi obszaru pułapki
if witnesses:
   if !it.detected: (list[0] || witnesses[0]) krzyczy SAY.trap[it.type] || 'Pułapka!' (3, dur 1.4, 'loud')
   p = max(h.R.learn dla świadków)                       // R.learn = 1 - 0.5 * 0.7^(lvl-1): poz. 1 = 0.5, poz. 5 = 0.88
   if pułapka w pokoju 'hush':  nikt nie zapamięta (Głusza: nie da się ostrzec innych)
   elif rand < p:               learnTrap(it, 'seen', null)          // napis "Zapamiętali"
   elif !it.detected:           witnesses[0] mówi SAY.noLearn (2)
```
Po trafieniu nowicjuszy (z szansą 0,3) weteran rangi 2+, który nie był w obszarze i stoi bliżej niż 7 od pierwszego trafionego, mówi `SAY.vetWarn` (2).

**Wykrycie wzrokiem** (`p5_ai.js: scanTraps`, co 0,5 s):
```
R = (h.type === 'thief' ? 2 : 0) + h.R.detect + max(0, round(gearR(h,'amulet') * itemPow(h)))
    // R.detect = lvl >= 6 ? 1 + floor((lvl-6)/4) : 0
if R <= 0: return
każda nieznana, nierozbrojona LOOKS_TRAP z max(|it.x - h.tx|, |it.y - h.ty|) <= R, nie w pokoju mgły (slotRoom):
   learnTrap(it, 'scan', h)        // h mówi SAY.amulet (ma amulet i nie jest złodziejem) albo SAY.detect (2)
```

**Mag poz. 8+** wyczuwa wszystkie pułapki pokoju przy wejściu (6.2.7).

**Pułapka postawiona na ich oczach** (`p8b_ui.js: tryPlace`, w trakcie fali): jeśli to `TRAPS` i ktoś stoi w tym pokoju (`kind 'room'`) albo w odległości <= 3: `learnTrap(it, 'seen', null)` i ten bohater mówi `SAY.seenBuilt` (3).

**Zapadnia**: kto spadł, zna ją (`p4_traps.js: fall`, `learnTrap`) i nie spadnie przez nią drugi raz w tej fali (`h.fellFrom`).

**`learnTrap(it, how, by)`** (`p4_traps.js`): `it.detected = true`, `fl.threatDirty = true`; dla `how 'seen'` napis "Zapamiętali"; jeśli jest `by`: kwestia (`'seen'` -> `SAY.learn`, inaczej `SAY.amulet`/`SAY.detect`, prio 2); pułapka poz. 3: z szansą 0,7 `by` (albo ktoś w jej pokoju) mówi `SAY.nastyTrap` (3). Uwaga: wszystkie wywołania z `'seen'` podają `by = null`, więc `SAY.learn` nigdy nie pada (6.8).

**Plotki z karczmy** (`p3_flow.js: applyRumors`, na start fali; zapis plotek po fali w sekcji 03):
```
uptake = max(levelStats(e.lvl).rumor dla bohaterów fali)        // R.rumor = min(1, 0.4 + 0.15*(lvl-1))
plotki starsze niż RUMOR_LIFE = 2 fale znikają (łupy: starsze niż 3 fale albo już ich nie ma)
pokój albo korytarz: jeśli >= 60% jego pól jest w plotkach i rand <= uptake:
   jego pola i drzwi -> known
   tylko pokój (kind 'room'): także pierścień ścian; R.seen = R.rumored = true; pokój serca -> fl.heartKnown = true
pułapka z plotki: jeśli rand <= uptake:
   ten sam typ wciąż tam stoi -> it.detected = it.rumored = true
   pole puste i pasuje do slotu -> fałszywa plotka (fl.ghosts, waga 4 w mapie zagrożeń, znika, gdy pole stanie się znane)
łup z plotki (wciąż tam leży): jeśli rand <= uptake: noticeLoot(it, null), it.rumored = true   // wchodzą, wiedząc gdzie, i chcąc go
```

**Potwory**: znane, gdy ich pole jest w `fl.known`; wtedy wchodzą do mapy zagrożeń, do `roomThreat`, do ryzyka łupów i do `safestRoom`.

**Między falami** wszystko się zeruje (`p3_flow.js: setupFl`: `detected`, `rumored`, `seenWave`, `cursedKnown`...); drużyna zaczyna tylko z plotkami. W czasie fali nic nie jest zapominane.

### 6.3.6 Morale (`P.morale`, 0..1)

| Zmiana | Wartość | Źródło |
|---|---|---|
| start fali | `1` | `freshParty` |
| upływ czasu | `+0.012/s`, z bardem (nie zgubionym, nie w klatce) `+0.02/s`; max 1 | `p5_ai.js: partyThink` |
| każde obrażenie od pułapki | `-0.03`, min `0.15` | `p3_flow.js: damage` |
| śmierć bohatera | `-0.25`, min `0.15` | `p3_flow.js: kill` |
| pieśń barda | `+0.25` | `p5_ai.js: bardTick` |

| Próg | Skutek |
|---|---|
| `< 0.2` i lider rangi 0-1 | cała drużyna ucieka (6.6.3) |
| `< 0.65` | bard śpiewa (6.5.5) |
| `< 0.75` | lider rangi 1+ waha się przed każdym nowym polem granicy (`SAY.hesitate`) |
| `< 0.8` | tchórz zabiera głos na naradzie |

### 6.3.7 Odwrót i odpoczynek

**Decyzja o odwrocie** (`partyThink` krok 14, gdy plan nie wyjściowy, nie `fearless`, nie `retreat`):
```
if L.R.coord (lider poz. 3+) && time > P.retreatLock
   && (avgHp < (P.plan === 'assault' ? 0.32 : 0.42) || (ktoś ma hp < 0.22 max && w załodze nie ma kapłana)):
   room = safestRoom(L)
   if room >= 0:
      P.plan = 'retreat'; P.retreatRoom = room; P.restSince = -1; partySay('retreat', 3); replanAll()
      br = inny niż lider odważny (brave) albo barbarzyńca, nie panikuje -> kolejka SAY.argueRetreat (+1)
      cw = inny niż lider tchórz, nie panikuje -> kolejka SAY.agreeRetreat (+2 jeśli był br, inaczej +1)
```
Lider-nowicjusz (poz. 1-2) nigdy nie zarządza odwrotu. Protest odważnego nic nie zmienia.

**`safestRoom(from)`** (`p5_ai.js`):
```
b = bfs(from, {known: true})                       // avoid domyślne 1
dla każdego pokoju R (kind 'room', seen, nie serce, nie 'swamp', nie 'ice'):
   danger = Σ fl.danger po polach R; near = min b.dist po polach R; nieosiągalny -> pomiń
   threats = 5 za każdego żywego potwora w R + 3 za każdą znaną nierozbrojoną LOOKS_TRAP z roomOf === R
   sc = danger + threats + near*0.2 - (R.rt === 'haven' ? 12 : 0)     // Sanktuarium wygląda na najbezpieczniejsze
zwraca pokój z najmniejszym sc albo -1
```
(Pułapki ścienne stoją na polu ściany, którego `roomOf` to zwykle -1, więc w `threats` się nie liczą; liczą się przez `danger`.)

**Odpoczynek**: kto dojdzie do pokoju odwrotu, siada (`state 'rest'`, w `planHero` albo `onEnter`). W `updateHero`:
```
haven = pokój 'haven'
if nie płonie: h.hp = min(max, hp + 4 * dt * (haven ? 0.5 : 1))          // 4 HP/s, w Sanktuarium połowa
if haven: strach 3.5/s ('nightmare'); po 1.5 s odpoczynku raz SAY.nightmare (2)
nap = time < h.napUntil
if (P.plan !== 'retreat' && !nap) || panicking(h) || exiting(h): state 'walk', napUntil = restAt = -1, needPlan
```

**Scenka odpoczynku** (od 1.12.1, `p5_ai.js: restScene`): gdy pierwszy usiądzie (`P.restSince` ustawiane pierwszy raz), kolejka `P.queueSay` co 0,6 s (od +0,3 s): lider `restStart`, kapłan (jeśli jest i to nie lider) `restPriest`, losowy inny `restScene`, ktoś jeszcze (albo lider) `restReply`. Potem small talk w odwrocie co 3,5-6,5 s (zamiast 7-13 s), z pulą `chatRest` + `restScene`. Odpoczynek jest spokojem (gra sama przyspiesza, zegar combo płynie ×0,25), a cierpliwość płynie 2 razy wolniej przez cały odpoczynek (6.3.10). W 1.12.1 przez pierwsze 8 s odpoczynku autoprzyspieszenie było wyłączone (`sceneNow`); od 1.13, na prośbę autora, już nie.

**Zwiad na postoju** (1.16, `partyThink`, plan `retreat`): gdy `restSince > 0`, `!P.restScouted`, minęły 3 s odpoczynku, `P.scoutId < 0`, załoga 3+ i jest złodziej (nie lider) z `hp > 0.7 max`, bez kryształu, nie w klatce, nie zgubiony, nie panikuje: `P.restScouted = true` (jeden rzut na postój, także gdy rzut nie wyjdzie); z szansą `0.5`: `f` = najbliższa granica wg `bfs(th, {known})`; jeśli jest i ścieżka ma do 18 pól: `P.scoutId = th.id`, `scoutTarget = f`, `scoutUntil = time + 14`, `state 'walk'`, `restAt = -1`, `stats.scouts++`, `stats.restScouts++`, `startSplit(th, 'rest')`, `SAY.restScout` (2), lider po 1,4 s `SAY.scoutReply`. `planHero` nie sadza zwiadowcy (`P.plan === 'retreat' && !onScout(h)`). `P.restScouted = false` przy nowym odwrocie i przy końcu odpoczynku.

**Koniec odpoczynku** (`partyThink`, od 1.12.1): `restT = restSince > 0 ? time - restSince : 0`; koniec, gdy `(avgHp >= 0.7 && (restT >= 10 || (restSince < 0 && avgHp >= 0.85))) || restT > 26` (do 1.12: `avgHp >= 0.7` albo 20 s od `restSince`). Po końcu: `plan = fl.heartKnown ? 'assault' : 'explore'`, `P.retreatLock = time + 15`, `P.restSince = -1`, `partySay('restDone', 2)`, odpoczywający wstają, `needPlan` wszystkim.

**Drzemka w Sanktuarium** (wersja 1.10, `planHero` praca nr 4): ranny (`hp < 0.6 max`) przechodzący przez pokój typu `haven` siada na 5 s raz na falę, reszta idzie dalej (wtedy łatwo się odłączyć). Te same koszmary co wyżej.

### 6.3.8 Przygotowanie przed znanym groźnym pokojem i bieg

**`roomThreat(r)`** (`p5_ai.js`): suma po elementach: znana, nierozbrojona, nie zagłuszona `LOOKS_TRAP` ze `slotRoom === r` (pułapki ścienne liczą się dla pokoju, na który patrzą): straszak `0.7`, inna `1`; żywy potwór na znanym polu w `r`: `1.5`.

**`checkPrep(L)`** (`partyThink` krok 10):
```
if fl.fearless || goingOut() || L.lvl < 3 || !L.path.length || time < P.prepCd: return
cur = pokój lidera
dla i < min(5, L.path.length): r = roomOf(L.path[i])
   if r < 0 || r === cur || nie kind 'room': dalej
   if r nie w P.prepped && roomThreat(r) >= 3: startPrep(r)
   return                                   // sprawdza tylko pierwszy inny pokój na najbliższych 5 polach
```

**`startPrep(r)`**: załoga = grupa lidera (`talkGroup(L)`, od 1.13; wcześniej wszyscy żywi, nie zgubieni, nie w klatce, nie uciekający); gdy ktoś z niej już rozmawia, przygotowania nie ma. `P.prepped.add(r)`. Uczestnicy: kapłan poz. 3+ z `faith >= 2`, mag poz. 5+ z gotowym `jamCd`, złodziej poz. 4+, wojownik poz. 3+ (pierwszy pasujący każdej klasy). Scenka (od 1.13.3):
```
kwestie = [[L, prepStart]]
spec = [[kapłan, prepWard], [mag, prepJam], [złodziej, prepDisarm], [wojownik, prepShield]] bez brakujących
tasowanie Fisher-Yates (Math.random), mówią pierwsi 2 ze spec           // pozostali i tak działają w finishPrep
if kwestie.length === 1:                                                  // nie mówi żaden specjalista
   rep = ktoś z załogi poza L
   rep ? [rep, prepReply] : [L, prepGo]                                   // sam lider: jego własne "idę" (SOLO.prepGo)
dur = max(3, talkLen(kwestie)); P.prep = {room, until: time + dur, pr, mg, th, wr}   // id WSZYSTKICH specjalistów
P.talkUntil = max(P.talkUntil, time + dur); załoga: talkUntil = time + dur
kolejka: kwestia i o czasie time + 0.5*i; huddleUp(L) (6.7.5)
```
Sygnałem do biegu jest okrzyk lidera `SAY.rush` w `finishPrep`. Długość scenki (średnie `readT` + przerwy): bez specjalisty ok. 5,8 s (sam lider ok. 6,2 s), z jednym ok. 6,5 s, z dwoma lub więcej ok. 9,3 s; w powtórkach dwóch runów (72 fale) średnio 8,0 s na przygotowanie. W 1.12.1-1.13.2 mówił każdy specjalista, a potem lider `prepGo` i ktoś `prepReply` (do 7 kwestii, 8-19 s, średnio 12,5 s w tych samych powtórkach; autor: za długie). Do 1.12 było stałe 2,4 s i większość kwestii nie zdążyła paść ("Plan!" i bezruch). Każdy poz. 4+ z `hp < 0.7 max` wypija najlepszą miksturę.

**`finishPrep()`** (po `dur`):
```
P.prep = null; P.prepCd = time + 4
uczestnik ważny = żyje, nie zbiegł, nie spada, nie w klatce, nie ucieka
kapłan bez 2 wiary: SAY.faithLow (3) i bez osłony
każdy żywy (nie zgubiony, nie w klatce, nie uciekający): useCharm(o, 'prep')
kapłan (faith -= 2):
   alt = Ołtarz w r; frac = (0.15 + 0.012*lvl) * (alt ? 0.5 : 1)
   brave0 = 0.85^(1 + lvl/5); brave = alt ? 1 - (1 - brave0)/2 : brave0
   każdy żywy: shield = max(shield, max * frac); braveUntil = time + 10; braveK = brave    // mniej strachu (sekcja 05)
   alt: kapłan mówi SAY.bAltar (4)
   poz. 6+: duchy i cienie w r dostają 40 * R.pow * (alt 0.5); do nb = 2 + floor((lvl-6)/2) (alt: max(1, floor(nb/2)))
            znanych przeklętych straszaków (CURSED) w r zostaje odczynionych
mag: Runa w r -> jamCd = time + 12, SAY.bRune (4), bez efektu
     inaczej każda pułapka (TRAPS) w r: jamUntil = time + 2 + 0.25*lvl; jamCd = time + 12
złodziej: k = 1 + floor((lvl-4)/4) znanych rozbrajalnych (DISARMABLE) w r, z progu:
     Wabik -> alarm; rand < R.fail i gotowa -> odpala; rigged -> odpala; rand < R.sapper -> usunięta na stałe; inaczej rozbrojona
wojownik: shieldUpUntil = time + 5; shieldCd = time + 5 + R.shieldCd
P.rushUntil = time + 6 (+25% prędkości, 6.2.2); lider SAY.rush (3); wszyscy needPlan; 'talk' -> 'walk'; P.talkUntil = time
```

### 6.3.9 Serce i kryształ

**Droga do serca**: w planie `assault` lider idzie do `heartGoal()` (6.2.9), reszta też prosto do serca (6.2.12). Kto stanie na polu przylegającym do serca (Manhattan 1), nie panikując i nie wychodząc, przechodzi w stan `boss` (`onEnter`). Odchodzi z niego, gdy plan przestaje być `assault`, gdy wychodzi albo panikuje.

**Wyważanie** (`p6_loop.js: step`):
```
atHeart = żywi w stanie 'boss'
if atHeart && P.plan === 'assault' && fl.ending === null:
   P.steal += dt * (1 + 0.5 * (atHeart.length - 1))            // każdy kolejny przy sercu +50%
   damage(atHeart[0], 5 * dt, HEART)                           // serce parzy pierwszego
   if run.wave === 1:                                          // pierwsza fala nie może wziąć kryształu
      każdy przy sercu: strach 0.3 * courage * dt ('heart')
      if P.steal >= 0.85 * stealNeed():
         P.steal = 0.85 * stealNeed(); atHeart[0]: SAY.heartRepel (4)
         każdy przy sercu: strach 0.4 * courage, startFlee
         P.plan = 'leave'; wszyscy needPlan; rest/talk/boss -> walk; pierwszy nieuciekający: SAY.leave (3)
   if P.steal >= stealNeed(): takeCrystal(żywi w stanie 'boss')
stealNeed() = 4 / 2^mods.glass                                // Szklane serce
```
`P.steal` nie spada, gdy odejdą od serca (zeruje go tylko `takeCrystal`, `regroupAtDoor` i powrót do szturmu w `crystalReturns`).

**`takeCrystal(atHeart)`** (`p6_loop.js`):
```
carrier = ten z atHeart, kto ma najwięcej HP
carrier.crystal = true; carrier.fleeing = false; P.carrierId = carrier.id; P.plan = 'escape'; P.steal = 0
carrier: SAY.steal (4, dur 2.2)
każdy żywy: boss/rest/talk -> walk; needPlan; inni z szansą 0.4: SAY.escape (2)
```

**Ucieczka z kryształem**: plan `escape` jest wyjściowy, więc wszyscy idą do wyjścia (`intent 'carry'` dla niosącego, `'exit'` dla reszty). Nie ma osobnej eskorty: pozostali po prostu wychodzą tą samą drogą i ich wyjście liczy się jako zwykłe (nie przestraszone). Niosący: prędkość `x0.9 * mods.carrierSlow`, strach od karty `mods.carrierFear`, używa butów, w small talku `chatCarrier`. Kryształ wraca, gdy:
- niosący zginie (`kill` -> `crystalReturns`),
- strach niosącego dojdzie do odwagi (`addFear`, gdy nie jest w klatce) -> `dropCrystal`: `SAY.crystalFear` (4), `crystalReturns`, `startFlee`,
- spadnie przez zapadnię z kartą Bezdenna studnia (`mods.bottomless`).
Niosący, który spadł przez zapadnię bez tej karty, wychodzi z niej możliwie daleko od wyjść (`landFallen`).

**`crystalReturns(h)`** (`p3_flow.js`):
```
h.crystal = false; P.carrierId = -1; Groza za odzyskany kryształ (sekcja 03)
każdy żywy: SAY.crystalDrop (4)
if żywych >= 2 && średnia fear/courage < 0.55 && nikt nie ucieka: P.plan = 'assault'; P.steal = 0     // próbują jeszcze raz
else: partyFlee()
wszyscy needPlan
```

### 6.3.10 Cierpliwość (`p3_flow.js: becomeImpatient`, `S.waveTime` = 120 s)

Od 1.12.1 cierpliwość liczy osobny zegar `fl.patT` (`p6_loop.js: step`): rośnie o `dt`, a o `0,5 × dt`, gdy `fl.time < P.talkUntil` (narada, przygotowanie, inne rozmowy z postojem) albo trwa odpoczynek (`plan 'retreat'` i `restSince > 0`). Wszystkie progi poniżej (120 s, siatka bezpieczeństwa +60 s, limit szukania `tLimit` w 6.3.4) porównują `fl.patT`, nie `fl.time`. HUD pokazuje pozostały czas cierpliwości. Powód: dłuższe scenki nie mogą skracać zwiedzania.

```
fl.fearless = true
if plan już wyjściowy: return
prophet = żywy boss 'final' (bohater z przepowiedni), nie uciekający
if !prophet:
   fl.storm = false; P.plan = 'leave'; wszyscy needPlan, rest/talk -> walk; alive()[0]: SAY.leave (3); return     // wracają do domu
fl.storm = true
if !fl.heartKnown:                                            // przepowiednia pokazuje drogę
   fl.heartKnown = true; pola shortestPath() i pokój serca -> known; prophet: SAY.prophecy (4, dur 2.6)
if fl.heartKnown: P.plan = 'assault'; rest/talk -> walk; needPlan; alive()[0]: SAY.impatient (3)
else: P.plan = 'leave'; ...; SAY.leave (3)        // (nieosiągalne przy prophet, bo wyżej heartKnown = true)
```

Skutki `fl.fearless` (od tej chwili do końca fali): ścieżki bez kosztu zagrożeń, prędkość x1,3, próg ucieczki x1,3 (sekcja 05), brak rozmów (`talk`/`talkAs` nic nie robią), brak wahania, tarczy wojownika przed zagrożeniem, talizmanu "przed pułapką", przyspieszania przy zagrożeniu, przygotowań, objazdów, gubienia się, prac klasowych (`disarmJob`, `smashJob`, `blessJob`, `bombJob` zwracają `null`), szukania zgubionych, wołania barda; w `planHero` gałąź "fearless i assault" wyprzedza wszystkie prace i łupy. 60 s po końcu cierpliwości każdy żywy wychodzi natychmiast (`heroExit`, siatka bezpieczeństwa w `step`).

### 6.3.11 Zamknięta krata (`p5_ai.js: partyThink`, krok 19)

Krata (pułapka na drzwiach, sekcja 05) zamyka drzwi na `4 * mods.gateDur` s; kto był w trakcie wchodzenia (`prog < 0.5`), cofa się; `replanAll()`.
```
gateShut = jakieś drzwi mają closedUntil > time
if gateShut && L.blocked >= 0 && !goingOut():               // ostatni plan lidera nie znalazł drogi
   P.blockT += dt
   if P.blockT > 1.2 && !P.blockSaid:
      P.blockSaid = true; before = P.target; wasPlan = P.plan
      if plan 'assault': plan = 'explore'; P.gateDetourUntil = time + 18; P.wantSearch = true
      if plan 'explore': chooseTarget(L); replanAll()
      moved = plan 'explore' && P.target >= 0 && (P.target !== before || wasPlan !== 'explore')
      if !moved && wasPlan 'assault': plan = 'assault'; P.gateDetourUntil = 0
      L: (moved ? SAY.gateReroute : SAY.gateWait) (3, dur 2.2); if !moved: P.liftT = 0
   if P.blockSaid && plan !== 'explore':                     // czekają: złodziej podważa kratę
      door = najbliższe lidera zamknięte drzwi
      th = złodziej nie panikujący, nie uciekający, w odległości <= 1.6 od tych drzwi
      if na drzwiach stoi Krata && th:
         pierwszy raz: th mówi 'Podważę ją, osłaniajcie mnie!' (3, dur 2)
         P.liftT += dt * (th.lvl >= 6 ? 1.5 : 1)
         if P.liftT >= 3: drzwi otwarte; krata disabled + detected; threatDirty; replanAll()
else: P.blockT = 0; P.liftT = 0; if !gateShut: P.blockSaid = false
if P.gateDetourUntil && plan 'explore' && (time > gateDetourUntil || P.target < 0) && fl.heartKnown && !gateShut:
   P.gateDetourUntil = 0; plan = 'assault'; replanAll()
```
Gdy drzwi się otworzą (`step`), wszyscy przeplanowują. Złodziej nie ma osobnej pracy "idź do kraty": podważa tylko, gdy już stoi blisko (zwykle idzie za liderem). Objazdy liczą się do statystyki `reroutes` (gildia przysyła barbarzyńcę, sekcja 04).

### 6.3.12 Inne odruchy drużyny

- **Zasadzka** (`partyThink` krok 20): `fireRaw` przy każdej pułapce, która kogoś objęła, robi `ambushN++` jeśli poprzednia była mniej niż 3 s temu (inaczej `ambushN = 1`) i `ambushT = time`. Gdy `ambushN >= 3`, `time - ambushT < 0.6` i od ostatniej zasadzki minęło ponad 12 s (`P.ambushSaid`): `ambushN = 0`, `talk(1.0, [SAY.ambush])`, każdy +6 strachu (`'ambush'`). Kapłan traktuje każde trafienie pułapką w ostatnich 2 s jako powód do bariery (6.5.3).
- **Kontr-budowle** (`partyThink` krok 7): pierwszy, kto wejdzie do pokoju z budowlą `altar`, `rune`, `acid`, `veil`, `howl` albo `shackles`, mówi `SAY.b<Typ>` (3), raz na pokój i typ w fali (`fl.bSaid`). Pierwszeństwo ma klasa, której budowla szkodzi (Ołtarz: kapłan, Runa: mag, Kwas: wojownik, Kamień wyjec: bard, Okowy: barbarzyńca), jeśli jest w tym pokoju; Zasłona nie ma preferencji. Umocnienie (`fortify`) i Wabik nie mają kwestii przy wejściu (Wabik wygląda jak pułapka).
- **Serce znalezione**: patrz 6.3.4 (`heartSeen`/`heartLater`).

## 6.4 Łupy

Rodzaje łupu (`LOOT_KIND.json`, rzadkość z `ITEMS.json`): `loot` = złoto (rzadkość 1), `lpotion` = mikstura (1), `loot2` = ekwipunek (2), `loot3` = relikwia (3), `lcursed` = przeklęty skarb (2, wygląda jak ekwipunek). `lootLevel(it) = ITEMS[it.type].rarity || 0`. Łup upuszczony przez bohatera (`dropItem`) ma `dropped = true` i dokładny przedmiot w `it.item` albo złoto w `it.gold`.

### 6.4.1 Zauważenie łupu (`p5_ai.js: lootSeen`, `p3_flow.js: noticeLoot`)

`lootSeen(it)` jest wołane dla każdego łupu w każdym `partyThink`.
```
if it.seenWave === run.wave: (lcursed: checkCursed(it)); return true
r = lootLevel(it); R = r === 3 ? 12 : r === 2 ? 7 : 5; ir = pokój łupu
by = pierwszy żywy, dla którego:
     (h.room === ir && pole łupu znane)
  || (r >= 2 && hypot(h.tx - it.x, h.ty - it.y) <= R)                    // rzadki i legendarny widać przez ściany
  || (r === 1 && pole łupu znane && hypot(...) <= R)
if !by: return false
noticeLoot(it, by); (lcursed: checkCursed(it)); return true
```

`noticeLoot(it, by)`: `it.seenWave = run.wave`; jeśli to nie ich własny odłożony przedmiot (`noGreed`), rośnie Chciwość (wzór w sekcji 03, `LOOT_GREED.json` pierwsza liczba) i `fl.stats.lootSeen++`. Kwestia `by` (gdy jest):
- jeśli `by` ucieka, niesie kryształ, panikuje albo drużyna wychodzi: tylko przy rzadkości 2+ `SAY.lootFlee` (2);
- inaczej: mikstura -> jedna z trzech kwestii zaszytych w kodzie (2); reszta -> `SAY['loot' + min(3, r)]` (prio `r >= 2 ? 3 : 2`).

Łup "widziany" (`seenWave === run.wave`) jest celem dla wszystkich (wiedza wspólna). Łup z plotki jest widziany od początku fali (6.3.5).

### 6.4.2 Przeklęty skarb (`p5_ai.js: checkCursed`)

```
if it.cursedKnown: return
pr = żywy kapłan poz. 6+, nie zgubiony, nie uciekający, w odległości <= 6 od łupu
if pr: it.cursedKnown = true; pr: SAY.cursedWarn (4, dur 2.2); napis "Przeklęte!"; replanAll()
```
Łupu z `cursedKnown` nikt już nie weźmie (`lootDecision` i wybór w `planHero` go pomijają). Ale kto przypadkiem na niego wejdzie, podnosi go (`onEnter` -> `pickup` nie sprawdza `cursedKnown`).

### 6.4.3 Wybór łupu w `planHero` (praca nr 9)

```
claims = P.lootClaim (Map: pole -> id)
dla każdego łupu it z seenWave === run.wave && !it.cursedKnown:
   k = pole; cl = byId(claims.get(k))
   if cl && cl !== h && cl żyje, nie zbiegł, nie spada && cl.intent === 'loot' && cl.lootKey === k: pomiń   // już ktoś po niego idzie
   d = B().dist[pole]; steps = d >= 0 ? pathFrom(B(), pole).length : -1       // KROKI na drodze, nie koszt (1.10)
   reach = r === 3 ? 30
         : r === 2 ? 16
         : (mikstura && h.hp < 0.5 max) ? 14
         : h.type === 'thief' ? 11
         : h.rank === 0 ? 9 : 8
   if steps >= 0 && steps <= reach && steps < bd && lootDecision(h, it, B(), pole): bd = steps; best = pole; bestK = k
   elif d < 0 && r === 3 && h.type !== 'priest':          // legendarny w nieznanym miejscu: do granicy w jego stronę
      g = najbliższa (B) granica w odległości < 8 od łupu; gs = długość ścieżki do g
      if g >= 0 && gs < bd: bd = gs; best = g; bestK = null
if best >= 0: job = {loot, best}; h.lootKey = bestK; if bestK: claims.set(bestK, h.id)
```

`lootDecision` liczy się tylko dla łupów w zasięgu i bliższych niż dotychczasowy najlepszy. Roszczenie (`lootClaim`) wygasa samo, gdy roszczący zmieni intencję. Podniesienie następuje w `onEnter` (każdy, kto wejdzie na pole łupu, jeśli nie niesie kryształu i nie ucieka).

### 6.4.4 Czy warto? (`p5_ai.js: lootDecision`)

```
if it.cursedKnown: return false
memo = h.lootMemo.get(pole); if memo && time - memo.t < 8: return memo.go       // decyzja ważna 8 s
r = rarity; kind = LOOT_KIND[it.type]; hurt = h.hp < 0.4 max
need:
   mikstura:          hurt ? 3.2 : hp < 0.7 max ? 1.6 : (ma już miksturę ? 0.25 : 0.6)
   złoto:             (thief || greedy || hunter) ? 1.6 : 1
   upuszczony przedm.: min(2, itemValue(h, it.item) / max(0.6, 1.2 * it.item.r))     // lepszy od jego własnego?
   inaczej:           1
   (kolejność: najpierw mikstura, więc upuszczona mikstura liczy się jak mikstura)
if it.item && need <= 0.05: memo {go:false}; return false                           // bez kwestii
value = [0, 1, 2.6, 6][r] * need * h.T.greed * (rank 0: 1.6, rank 1: 1, rank 2+: 0.85) * (0.6 + 0.4 * greedRaw(fl.greed))
if rank >= 2 && złoto && !thief && !hunter: value *= 0.3                            // elita nie schyla się po drobne
if r >= 2: value *= 1 + 0.06*(lvl - 1)                                             // ale rzadkie kuszą lepszych mocniej
greedy: value *= 1.8; careful: value *= 0.6
pokój łupu typu 'vault': value *= 1.5                                              // Sezam
risk  = 0.35 * Σ fl.danger po polach ścieżki (pathFrom(B, pole))
      + 2.5 * liczba żywych potworów na znanych polach w odległości <= 2.5 od łupu
      + 2 * h.fear / h.courage
      + (hurt && kind !== 'potion' ? 2 : 0)
nerve = max(0.8, h.R.risk) * (greedy ? 1.3 : 1) * (mikstura && hurt ? 1.5 : 1)      // R.risk = 2.2 * 0.82^(lvl-1)
go = rank === 0 ? (value*2*nerve > risk || rand < 0.7) : value*2*nerve > risk        // nowicjusze i tak często idą
h.lootMemo.set(pole, {go, t: time})
pierwszy raz dla tego łupu (brak memo): myśli na głos
   go:  mikstura i hurt -> kwestia zaszyta (2); inaczej greedy -> lootGreedy; r === 3 -> lootLegend; rank 0 -> lootRookie;
        risk > 2 -> lootGo; inaczej SAY['loot' + r]   (wszystko prio 2)
        lider (inny, rangi 1+), gdy risk > 1.5, z szansą 0.4: kolejka L: lootStop (+0.8), h: lootReply (+1.8)   // tylko słowa
   !go: z szansą 0.6: careful -> lootCareful; rank 2+ i złoto -> lootPetty; inaczej lootRisk (2)
return go
```

`T.greed` (`HEROES.json`): wojownik 0,6, złodziej 1,5, kapłan 0,9, mag 1, bard 1,2, barbarzyńca 0,7. `greedRaw` w 6.3.4.

### 6.4.5 Lider czeka na zbierającego (`partyThink` krok 23, wersja 1.10)

```
if plan !== 'retreat' && !fl.fearless && !goingOut() && L.intent !== 'loot':
   lt = inny niż lider z intent 'loot', nie zgubiony, nie panikuje, hdist(lt, L) <= 8
   if lt:
      if P.lootWaitId !== lt.id: P.lootWaitId = lt.id; P.lootWaitT = time; z szansą 0.55 kolejka L: SAY.lootWait (+0.3, prio 1)
      if time - P.lootWaitT < 6: P.waitUntil = max(P.waitUntil, time + 0.4)       // czeka najwyżej 6 s na jednego
   else: P.lootWaitId = -1
```

### 6.4.6 Podniesienie i ekwipunek (`p3_flow.js: pickup, giveItem, dropItem, itemValue`)

```
pickup(h, it):
  noticeLoot(it, null)
  item = it.item (upuszczony) | mikstura {potion, r:1} | gear/cursed: rollItem(2, GEAR_POOL) | relikwia: rollItem(3, wszystkie HITEMS) (z kartą Relikwiarz: brak przedmiotu) | złoto: brak
  if item && kind !== 'cursed' && !giveItem(h, item):
     h.lootMemo.set(pole, {go:false, t: time + 60}); return false        // zostawia i nie wraca (memo ważne 68 s)
  usuń łup; h.loot++; Chciwość i Groza za podniesienie (sekcja 03)
  złoto: h.gold += max(1, it.gold || 1); SAY.goldHeavy (gdy gold >= 3) albo SAY.gold (2)
  przeklęty: curse(h, item)
  karta Pułapka w łupie: obrażenia; relikwia nie upuszczona: +4 Esencji
  replanAll()

giveItem(h, item, quiet):
  moc (charm/amulet/boots) albo sprzęt (weapon/armor) tego samego typu już jest:
     stary >= nowy: SAY.noNeed (1); false
     inaczej: stary na podłogę (dropItem z noGreed), nowy do plecaka; SAY.swap (2); true
  plecak pełny (invCap = 3 + floor(lvl/3)):
     najmniej wart (itemValue) stary < nowy -> wymiana (SAY.swap, 2); inaczej SAY.full (1); false
  inaczej: 'Mam <przedmiot>!' (kwestia składana w kodzie, prio r >= 2 ? 3 : 2)
  plecak.push(item); true

itemValue(h, it):                           // 0 = bezużyteczny
  potion: r * (hp < 0.6 max ? 2.5 : 1) / (1 + 0.7 * liczba innych mikstur)
  bomb:   0.8 * r / (1 + 0.5 * liczba innych bomb)
  inne:   best = najwyższe r innego egzemplarza tego typu
          best ? max(0, r - best) * 1.2 : r * 1.2 * (ulubiony typ klasy ? 1.3 : 1)
          ulubione: charm, weapon, armor -> warrior; amulet -> priest; boots -> thief

dropItem(h, item, gold, noGreed): na pole bohatera albo pierwsze wolne z 8 sąsiednich (walkable, bez przedmiotu);
  typ łupu: złoto -> 'loot', mikstura -> 'lpotion', r >= 3 -> 'loot3', inaczej 'loot2'; dropped = true
  najwyżej 10 upuszczonych stosów naraz (najstarsze znikają)
```

Po śmierci cały ekwipunek i złoto bohatera wypadają jako łup (`kill`, sekcja 05). Co przedmioty dają w walce (broń, zbroja) i jak powstaje ekwipunek startowy: sekcja 04 i 05. Kiedy AI używa mikstur, bomb i mocy: 6.5.8.

### 6.4.7 Klątwa (`p3_flow.js: curse`)

Wzięcie `lcursed`: `h.cursed = true`, przedmiot do plecaka po cichu (jeśli jest miejsce), `SAY.cursedPick` (3, dur 2.2). Skutki: obrażenia x1,3, przedmioty słabsze o połowę (`itemPow`), moce dłużej się odnawiają (x1,5), strach +2/s, wygasanie strachu o połowę wolniej (sekcja 05). Zdejmuje ją kapłan poz. 4+ za 3 wiary (6.5.3).

## 6.5 Zachowania klas, przedmioty, klatka, zapadnia

Klasy z `HEROES.json`. Cechy (`HERO_TRAITS.json`): `greedy` (chciwy), `coward` (tchórzliwy), `brave` (bohaterski), `careful` (ostrożny); około połowa bohaterów ma cechę (sekcja 04). Łowca skarbów (`hunter`) ma zawsze cechę `greedy`.

### 6.5.1 Wojownik

- **Szarża** (`planHero` praca nr 10): spośród żywych potworów nie unoszących się w **swoim** pokoju wybiera najbliższego (koszt `0 < B().dist <= 6`), ale tylko "mądre" walki: `rank === 0` (nowicjusz bije wszystko) albo łucznik albo (`hp > 0.6 max` i nie ogr). Gdy wybrał: `{fight, pole potwora}`, przy zmianie intencji `SAY.fight` (2). Gdy jest potwór, którego unika, a nie ma innego: z szansą 0,3 `SAY.avoid` (2) (intencja `avoid` jest od razu nadpisywana, więc kwestia może się powtarzać, 6.8).
- **Tarcza** (`updateHero`, przed krokiem): przy wejściu na pole z `fl.danger > 1`, gdy `time > shieldCd` i nie `fearless`: `shieldUpUntil = time + 2.5`, `shieldCd = time + R.shieldCd` (`max(2, 6 - 0.3*(lvl-1))`), `SAY.shield` (2). Tarcza osłania też tych tuż za nim (sekcja 05). Przed groźnym pokojem: 5 s tarczy (6.3.8).
- Śmierć przyjaciela: z szansą 0,3 furia zamiast strachu (6.6.6). Duch: wojownik ma mówić `SAY.ghostOnly`, ale kwestia jest blokowana (6.8).
- Moce ulubione: talizman, broń, zbroja (`itemValue`).

### 6.5.2 Złodziej

- **Rozbrajanie** (`p5_ai.js: disarmJob`, praca nr 6):
```
if fl.fearless || panicking(h): return null
// od 1.13.4: droga = partyWay(h, b): dokąd idzie drużyna, nie objazd samego złodzieja
wayPath = ścieżka lidera, gdy lider to ktoś inny i ma ścieżkę
          inaczej ścieżka B() od złodzieja do celu drużyny: P.detour.goal | (P.plan 'assault': najbliższe pole przy sercu) | P.target
          (cel nieosiągalny: własna ścieżka złodzieja)
keep = poprzednie h.disarmT, jeśli wciąż leży, jest znane, nierozbrojone i nie odpaliło mu w twarz 2 razy (h.disarmHits)
dla każdej znanej, nierozbrojonej pułapki z DISARMABLE, której areaOf przecina way albo która jest keep,
     i której nikt inny żywy nie ma w disarmT i która nie ma h.disarmHits >= 2:
   bias = Wabik ? -4 : 0                                    // wabik wygląda na najsmaczniejszy mechanizm
   dla każdego miejsca disarmSpots(it) z B().dist >= 0: koszt = dist + bias -> najmniejszy
      (dla keep tylko miejsce na drodze albo najwyżej 6 kroków dalej)
h.disarmT = wybrana (albo null)
if stoi na miejscu (tCost <= 0 && B().dist[spot] === 0):
   state 'disarm'; timer = (arrows|fire|powder ? 1.5 : 1.0) * mods.disarm * h.R.disarm * (pokój 'swamp' ? 1.5 : 1)
   h.item = pułapka; SAY.disarm (3); return {disarm, -1}
return {disarm, spot}
disarmSpots(it): pułapki podłogowe i drzwiowe (spikes, web, gate, trapdoor, cage, bones, creak) -> pole pułapki;
                 ścienne (arrows, fire, portrait, eyes, mirror) -> pola podłogi przy ścianie; reszta -> walkable 4 sąsiedzi
R.disarm = 1.7 * 0.88^(lvl-1)
```
- **Koniec rozbrajania** (`updateHero`, stan `disarm`): `exiting` przerywa. Po czasie, jeśli pułapka wciąż jest i nie jest wyłączona:
```
Wabik:                                       decoyAlarm (odpalają wszystkie gotowe pułapki w pokoju, SAY.bDecoy 4)
!CURSED && rand < h.R.fail && it.cd <= 0:    wpadka: fire(it, 1); SAY.disarmFail (3)          // R.fail = 0.35 * 0.5^(lvl-1)
rigged(it) (karta Mechanizm samobójczy):     pułapka odpala; SAY.disarmFail (3)
złodziej && !CURSED && rand < h.R.sapper:    usunięta na stałe z lochu ("Rozmontowane!"); SAY.sapped (3)   // R.sapper od poz. 7
inaczej:                                     it.disabled = true do końca fali; SAY.disarmDone (2)
potem: walk, needPlan
```
  Jeśli rozbrajana pułapka odpali (skill check gracza), rozbrajający przerywa i krzyczy `SAY.disarmHit` (3, loud) (`p4_traps.js: fireRaw`); od 1.13.4 liczy to w `h.disarmHits` (mapa pułapka -> ile razy) i za drugim razem odpuszcza tę pułapkę do końca fali (`h.disarmT = null`, `stats.disarmQuit`).
  Dlaczego tak (1.13.4): drogą była bieżąca ścieżka lidera, a złodziej-lider idzie własnym objazdem do pułapki. Na miejscu rozbrajania jego ścieżka była pusta, więc pułapka "nie leżała na drodze"; prowadził dalej, krok później znów leżała i wracał, co 0,4 s, w linii strzału (run testera: fala 2, od 55 do 10 HP w 12 s; w powtórkach tej fali w 9 z 20 prób, ze słabszym graczem w 6 z 16; po zmianie w 0 z 10 i 0 z 16). Inni (poz. 3+, nie złodzieje) czekają, zamiast wejść na pole w obszarze rozbrajanej pułapki (`fl.disarmKeys`, 6.2.6).
- **Wykrywanie**: +2 do zasięgu `scanTraps` (6.3.5).
- **Unik** (`p3_flow.js: damage`, sekcja 05): pojedyncze trafienie kolcami albo strzałami, gdy nie jest "trzymany" (`held`), raz na 3 s, szansa `R.dodge`; `SAY.dodge` (2, loud).
- **Zwiad** na naradzie (6.3.3); **podważanie kraty** (6.3.11, 3 s, poz. 6+ x1,5 szybciej); **preferowany ratownik** z klatki i szybszy (0,8 s zamiast 1,8 s, 6.5.9).
- Mniej się gubi (`lostChance -0.1`, mgła x0,6), rzadziej skręca źle (`-0.03`), rzadziej się ślizga (x0,6), dalej sięga po łupy (11 kroków), złoto ceni wyżej (`need 1.6`), `T.greed = 1.5`.
- Kryształu nie wyważa szybciej niż inni (`stealNeed` nie zależy od klasy).

### 6.5.3 Kapłan

- **Wiara** (`heroAbilities`): pula `faithMax = 6 + floor(lvl/2)`, +1 co 12 s; przy `faith >= 2` znika flaga "już mówiłem, że brak wiary".
- **Co sekundę** (`h.cast = 1`, modlitwa `cast = 3`), `near` = żywi w odległości <= 3 (z nim samym), Ołtarz w jego pokoju = wszystko x0,5 (`ak`):
```
spend(n): faith >= n -> faith -= n, true; inaczej raz SAY.faithLow (3), false
1 klątwa (poz. 4+, faith >= 3): pierwszy przeklęty w near -> spend(3): cursed = false; cast 3; SAY.curseLift z imieniem (3); return
2 leczenie (1 wiara), gdy ktoś płonie || najsłabszy w near < 0.75 max || suma brakującego HP w near > 0.6 * jego max:
     cast 3; płonący: gaszenie zamiast leczenia; reszta: +min(22 * R.pow * ak, brakujące)
3 duchy, cienie, nietoperze w odległości <= 3 (pozycja unoszenia): gdy cast === 3 (modlił się) albo faith > 0:
     cast 3; każdy dostaje 25 * R.pow * ak (gratis, część modlitwy)
4 Ołtarz i wyleczył: z szansą 0.25 SAY.bAltar (2)
5 gaszenie: SAY.cleanse (3)
6 bariera (3 wiary): barrierCd <= 0 && near >= 2 && (pułapka trafiła kogoś < 2 s temu || ktoś w near < 0.45 max) && faith >= 3:
     shield = max(shield, 12 * R.pow * ak) każdemu w near; barrierCd = 14; SAY.barrier (3); cast 3
7 wyleczył: Groza dla gracza (healed / h.max * GZ.heal * depthMult, sekcja 03); SAY.heal (1), chyba że gasił
```
  Kapłan modli się także w panice i w ucieczce (brak sprawdzenia, 6.8).
- **Idzie do rannego** (`planHero` praca nr 3): najsłabszy z `hp < 0.5 max`, dalej niż 2,5, koszt drogi <= 12.
- **Wołanie o kapłana** (`partyThink` krok 22, wersja 1.05): gdy jest kapłan (nie zgubiony, nie panikuje, nie w klatce), każdy inny z `hp < 0.4 max`, który nie wychodzi, nie zgubiony, nie w klatce, nie panikuje, jest dalej niż 3 od kapłana i nie w Głuszy, najwyżej co 14 s: `SAY.callHealer` z imieniem kapłana (2), kolejka kapłan `SAY.healerReply` (+1,1), `kapłan.needPlan`.
- **Zdejmowanie klątwy z portretów** (`blessJob`, praca nr 7, ranga 1+, `faith >= 1`): znane, nieodczynione straszaki z `CURSED` (`portrait`, `eyes`, `bones`, `mirror`) w odległości <= 8 od lidera, których nikt inny nie bierze; najbliższe miejsce z `disarmSpots`. Na miejscu: `faith--`, stan `disarm`, `timer = 1.5 * R.disarm * (Ołtarz ? 2 : 1)`, `SAY.bless` albo `SAY.bAltar` (3). Na koniec bez szansy wpadki i bez saperki: odczyniony do końca fali.
- **Wyczuwa przeklęty skarb** (poz. 6+, 6.4.2). **Osłona przed groźnym pokojem** (6.3.8). Kapłan rangi 1+ uspokaja innych w promieniu 3 (mniej strachu, sekcja 05). Żaden kapłan nie idzie po legendarny łup w nieznane (6.4.3).

### 6.5.4 Mag

- **Rozproszenie sieci** (`heroAbilities`, przed sprawdzeniem `cast`): gdy `dispelCd <= 0` i nie panikuje: pierwsza strefa sieci (`fl.zones`), na której stoi jakiś bohater w odległości <= 4 od maga -> strefa znika, stojącym w niej `slowUntil = time`; `dispelCd = 8`; `SAY.dispel` (3).
- **Kula ognia**: cel = najbliższy żywy potwór w **jego pokoju** w odległości < 4,5 (cień nigdy; duch nie, gdy karta `ghostPriestOnly`). Brak celu: `cast = 0.5`. Jest cel: `cast = 4`, `SAY.fireball` (1); unoszący się cel dostaje `30 * R.pow`; każdy nie-unoszący się potwór w kwadracie 3x3 wokół celu `30 * R.pow`. Kula nie sprawdza paniki (6.8).
- **Zagłuszenie pułapek** przed groźnym pokojem (poz. 5+, 6.3.8). **Wyczuwanie pułapek** pokoju przy wejściu (poz. 8+, 6.2.7).

### 6.5.5 Bard (`p5_ai.js: bardTick`, zamiast `heroAbilities`)

```
songCd -= dt; callCd -= dt
if panicking || lost || caged || fleeing || gone: return
lostOnes = inni zgubieni, którzy nie słyszą już jego (hearId !== bard albo hearUntil minął)
if lostOnes && callCd <= 0 && !goingOut() && !fl.fearless:
   callCd = 9
   if inB('howl', jego pokój): SAY.bHowl (3); return
   b = bfs od barda po wszystkich polach
   każdy zgubiony z b.dist <= 26 i nie w pokoju z wyjcem: hearUntil = time + 8; hearId = bard; needPlan; kolejka: SAY.lostHear (+1.3)
   SAY.bardCall z imieniem pierwszego zgubionego (3)
   return
if h.songs <= 0 || songCd > 0 || goingOut() || fl.fearless: return
near = żywi nie zgubieni, nie w klatce, w odległości <= 5 (z bardem)
if !(P.morale < 0.65 || ktoś z near jest wstrząśnięty (shakenUntil > time) || średnia fear/courage near > 0.45): return
songCd = 16
if inB('howl', jego pokój): SAY.bHowl (3); songCd = 6; return          // pieśń zagłuszona, nie zużyta
songs--
k = (0.06 + 0.012*lvl) * min(1, itemPow + 0.5)
każdy z near: fear -= k * courage; wstrząśnięty -> shakenUntil = time + 1
P.morale = min(1, P.morale + 0.25); SAY.song (3, dur 2.2); inny nie panikujący z near: kolejka SAY.songThanks (+1.6)
```
Pieśni na falę: `2 + floor(lvl/4)`. Bard odpowiada zgubionym z dwa razy większego zasięgu (26 zamiast 14) i swoimi kwestiami (6.2.10). Z bardem morale rośnie szybciej (6.3.6). Gildia przysyła barda do lochu, w którym ludzie się gubią (sekcja 04).

### 6.5.6 Barbarzyńca

- **Furia** (`p3_flow.js: startRage`, wspólna dla wszystkich, ale barbarzyńca żyje w niej): wyzwalacze: trafienie za >= 20% max HP (nie od serca, gdy `time > rageCd` i bez furii), śmierć przyjaciela (6.6.6), próg paniki (zamiast paniki, 6.6.1). W pokoju z Okowami furia nie rusza: raz na pokój `SAY.bShackles` (3). Czas: barbarzyńca 8 s, przerwa 14 s; inni 6 s, przerwa 20 s. Kwestia: `revenge` (po śmierci, z imieniem), `rageNoPanic` (zamiast paniki), `rage` (4, dur 2.2). W furii: prędkość x1,25, strach x0,5, obrażenia potworom x1,5, dalszy zasięg i szybsze rąbanie.
- **Rąbanie** (`p5_ai.js: smashJob`, praca nr 5):
```
if fl.fearless || panicking || lost || time < smashCd || h.room < 0 || inB('shackles', h.room): return null
rage = raging(h)
kandydaci w JEGO pokoju (roomOf === h.room):
   budowle (BUILDINGS, nie rozbite) w odległości <= 8 (zawsze warto)
   meble SMASHABLE_OBJ (crate, barrel, shelf; nie posągi) w odległości <= (rage ? 5 : 2.5)
miejsce = walkable sąsiad celu; wybór: najmniejsze B().dist - (budowla ? 3 : 0)
na miejscu (dist 0): state 'smash'; timer = rage ? 0.8 : 1.8; SAY.smashB (budowla) albo SAY.smash (3)
```
- **Koniec rąbania** (`updateHero`, `smashDone`): przerywa `exiting`, panika, Okowy. Budowla: Wabik podnosi alarm, `broken = disabled = true`, przelicza `fl.bRooms` (przestaje działać i blokować do końca fali). Mebel: co na nim stało (beczka prochu, mimik gotowy) odpala, inne wyłączone; mebel znika z `fl.objects`. Potem `smashCd = time + (rage ? 2 : 5)`, `threatDirty`, `knowDirty`, `replanAll()`.
- Gildia przysyła go na loch zastawiony skrzyniami i budowlami (sekcja 04). Protestuje przy odwrocie (6.3.7).

### 6.5.7 Ranga, cechy, łowcy, bossowie: gdzie zmieniają decyzje

| Kto | Efekt w AI |
|---|---|
| ranga 0 (poz. 1-2) | jako lider: losowy z 3 najlepszych celów, brak odwrotu, drużyna ucieka przy `fearR > 0.75` albo morale < 0,2, ratunek z klatki z szansą 0,5; łupy: `x1.6` wartości i 70% "i tak idę"; zasięg po łup 9; wojownik bije każdego potwora; odłącza się sam; talizman tylko po trafieniu; amulet późno (85% progu); późno pije miksturę (`R.potion` rośnie z poziomem) |
| ranga 1 (poz. 3-5) | jako lider: odwrót, czekanie na maruderów, okrzyk przy ucieczce (`R.coord`), wahanie przed nieznanym, szukanie zgubionych, sprzeciw wobec ryzykownego łupu, ucieczka drużyny przy `fearR > 0.85` albo morale < 0,2, ratunek z szansą 0,8; czeka przy rozbrajaniu; przebiega przez zagrożenie x1,3; buty przy zagrożeniu i gdy zgubiony; talizman przed pułapką w 50%; amulet przy 70% progu |
| ranga 2+ (poz. 6+) | jako lider: ucieczka drużyny przy `fearR > 0.95` (ranga 3+: `> 1`), morale nie wystarcza, zawsze wraca po uwięzionego, objazd x0,5 w szturmie, mniej przeszukiwania przed szturmem (`need -0.1`); ostrożność na nieznanym (x0,8, `R.caution`); gardzi drobnym złotem (x0,3); rzadziej się ślizga; talizman przed pułapką zawsze; amulet przy 60% progu; ostrzega nowicjuszy (`vetWarn`) |
| `greedy` | łupy x1,8, odwaga x1,3, złoto `need 1.6`, ścieżki `avoid x0.85`, głos na naradzie, protest przy szturmie, chciwy lider ulega |
| `careful` | łupy x0,6, `avoid x1.3`, głos na naradzie, gasi entuzjazm chciwych (`surviveFirst`), kwestia `cautious` przy wejściu |
| `coward` | panika już przy 55% odwagi; po śmierci przyjaciela strach x1,5; zgadza się na odwrót; głos na naradzie przy morale < 0.8; `cowardRun` przy ucieczce |
| `brave` | furia zamiast strachu po śmierci; protestuje przy odwrocie; odpowiada na naradzie tchórzowi; pociesza (`reassure`) |
| `hunter` | jak `greedy` + złoto bez kary elity; kwestia `hunters` przy wejściu (60%) |
| czempion | okrzyk przy cudzej ucieczce (6.6.4); wyłamuje klatkę |
| bohater z przepowiedni | szturm po końcu cierpliwości (6.3.10), gniew przy połowie HP (6.6.4); wyłamuje klatkę |

### 6.5.8 Mikstury, bomby i moce: kiedy AI ich używa

Przedmioty (`HITEMS.json`): `potion` i `bomb` jednorazowe; `charm` (talizman), `amulet`, `boots` (buty) to moce z czasem odnowienia `cd` (20/30/15 s) i ograniczoną liczbą użyć na falę (`charges`: buty `2 + floor(r/3)`, talizman i amulet `1 + floor(r/3)`); `weapon` i `armor` działają same (sekcja 04/05).
```
powerReady(h, t) = przedmiot typu t z time >= cdUntil i (charges undefined lub > 0)
usePower(h, it): it.cdUntil = time + HITEMS[t].cd * (h.cursed ? 1.5 : 1); charges--
```

| Przedmiot | Kiedy | Efekt | Źródło |
|---|---|---|---|
| mikstura (sam) | `hp < R.potion * max` (`R.potion = min(0.5, 0.15 + 0.03*(lvl-1))`): najlepsza (najwyższe r) | `hp += max * potionHeal(r) * itemPow`, `potionHeal = min(0.55, 1 - 0.7^r)`; `SAY.potion` (3) | `updateHero` |
| mikstura (przed groźnym pokojem) | poz. 4+, `hp < 0.7 max` | najlepsza | `startPrep` |
| mikstura (dla przyjaciela) | dający: nie na przerwie (`giveCd`), nie wychodzi, nie w klatce, nie panikuje, nie zgubiony; ma mikstury i (więcej niż jedną albo sam ma `hp >= 0.7 max`); przyjaciel: `hp < 0.3 max`, bez mikstury, nie w klatce, `hdist <= 2` | daje najsłabszą; `giveCd = time + 10`; `SAY.potionGive` (3), kolejka `SAY.potionThanks` (+1,1) | `partyThink` krok 8 |
| bomba w pułapkę | praca nr 8 (`bombJob`): pierwsza znana, nierozbrojona pułapka (`TRAPS`, nie Krata, nie przeklęty straszak), której obszar przecina 8 pierwszych pól drogi drużyny (od 1.13.4 `partyWay(h, b, 8)`, jak w 6.5.2; wcześniej ścieżka lidera, a gdy lider stał, nic); pułapka, do której już idzie (`h.bombT`), zostaje celem, dopóki leży w 14 pierwszych polach | w odległości <= 3: rzuca (proch odpala z mocą 0,5, inna wyłączona), `SAY.bomb` (3), `bombJob` zwraca `null` (plan idzie do kolejnych prac); dalej: od 1.13.4 idzie do najbliższego znanego pola bez zagrożenia w promieniu 3 od pułapki (gdy brak: jak wcześniej, najbliższe pole obszaru albo miejsca rozbrajania) | `bombJob` |
| bomba w potwora | w walce, gdy potwór ma > 60 HP | `80 * min(4, r)^1.3 * itemPow` obrażeń; `SAY.bomb` (3) | `updateHero` |
| talizman | `'hit'`: po trafieniu pułapką, gdy `hp < 0.6 max` (każda ranga); `'danger'`: przed wejściem na pole z `danger > 1.5` (ranga 0 nigdy, ranga 1 w 50%, ranga 2+ zawsze); `'prep'`: przed biegiem | osłona 3 s: `wardK = min(0.4, 0.25 + 0.05*(r-1)) * min(1, itemPow)`; `SAY.charmUse` (3) | `useCharm` |
| amulet | strach >= `[0.85, 0.7, 0.6, 0.6][rank]` progu ucieczki, nie ucieka, nie niesie kryształu | `fear -= (0.08 + 0.04*min(4, r)) * itemPow * (Ołtarz 0.5) * courage`; `calmUntil = time + (Ołtarz 2 : 4)` (strach x0,7); `SAY.amuletUse` (3) | `addFear` -> `useAmulet` |
| buty | przed krokiem: wychodzi (`'out'`) albo (zgubiony i ranga 1+) albo (`danger > 1`, ranga 1+, nie `fearless`) (`'dash'`) | sprint 3 s: `sprintK = 1 + (0.3 + 0.1*min(3, r)) * min(1, itemPow)`; `SAY.bootsUse` (2) | `useBoots` |

`itemPow(h) = mods.itemPower * (cursed ? 0.5 : 1)`. Talizman i amulet dostaje część bohaterów od gildii (sekcja 04).

### 6.5.9 Klatka: decyzja, ratunek, porzucenie

**Decyzja** (`p5_ai.js: decideCage`, `partyThink` krok 11, dla każdego uwięzionego bez decyzji; `cageHero` usuwa go z `cageDecided`, więc każde uwięzienie to nowa decyzja):
```
P.cageDecided.add(c.id)
others = żywi inni, nie uciekają, nie w klatce
if !others || goingOut(): return                         // bez kwestii; zostaje bez ratunku
fearR = średnia fear/courage others
rescue = L.rank >= 2 || (fearR < 0.6 && rand < (L.rank === 0 ? 0.5 : 0.8))   // elita zawsze wraca
who = L === c ? others[0] : L
rescue: P.rescueId = c.id; P.rescuerId = -1; who: SAY.rescue z imieniem (3)
else:   P.abandoned.add(c.id); who: SAY.abandon (3); kolejka c: SAY.abandoned (+1); strach c +15 ('cage')
```
Naraz jest tylko jeden `P.rescueId`; nowa decyzja "ratujemy" nadpisuje poprzednią.

**Ratownik** (`planHero` praca nr 1): jeśli `P.rescuerId` nieważny (nie żyje, zbiegł, spada, w klatce, ucieka), nowy = spośród żywych (nie uwięziony, nie w klatce, nie ucieka) najpierw złodziej, potem najbliższy uwięzionemu. Tylko ratownik ma tę pracę: obok klatki (Manhattan <= 1) -> stan `free`, `timer = złodziej 0.8 : 1.8`; inaczej idzie do najbliższego `walkable` sąsiada klatki. Po czasie `freeCaged(c, true)`: klatka wygięta (wyłączona do końca fali), uwolniony `SAY.freed` (3), strach -15, a jeśli wciąż >= odwagi: `startFlee`.

**Koniec czasu klatki** (`p4_traps.js: cageEnds`): boss wyłamuje kraty (`SAY.cageBreak`, 4). Jeśli `P.rescueId === uwięziony` i ktoś może pomóc (nie w klatce, nie ucieka, nie zgubiony, nie spada): czeka do 8 s dłużej. Inaczej umiera w klatce (`SAY.cageDie`, 4, dur 2). Uwięziony nie zaczyna uciekać ze strachu (`addFear` pomija klatkę), ale `partyFlee` ustawia mu `fleeing` (wtedy nikt go nie uwolni). Strach w klatce: patrz 6.6.5.

### 6.5.10 Zapadnia: upadek i powrót (`p4_traps.js: fall, landFallen`)

Upadek (szczegóły obrażeń i strachu: sekcja 05): `gone = true`, stan `fallen`, ścieżka i praca przerwane, `SAY.fall` (4); lider/zwiadowca tracą funkcję. Po `fallUntil` (`mods.fallTime * max(1, pw)`, domyślnie 5 s) `landFallen`:
```
30 losowych pól pokoi (nie serca): z kryształem -> najdalej od wyjść (bfs noDanger); inaczej -> najdalej od lidera (+ losowe 0..3)
brak: pole pod wejściem
h.lost = L && (hdist(h, L) > 6 || pokój mgły); SAY.landed (4)
Bezdenny szyb (poz. 3): zawsze zgubiony, dodatkowy strach
```
Nie ma osobnej pomocy dla spadłego: wraca jako zgubiony (bez decyzji lidera o szukaniu, `getLost` nie jest wołane; `lostCallT` nie jest ustawiane, więc woła od razu przy najbliższym `partyThink`) i szuka drużyny jak każdy zgubiony (6.2.10).

## 6.6 Strach w zachowaniu

Ile strachu dają pułapki, rany, śmierć, fobie i jak działa `fearResist`: sekcja 05. Tu tylko to, jak strach zmienia decyzje. `lim = h.courage * (fl.fearless ? 1.3 : 1)` (`p3_flow.js: addFear`).

### 6.6.1 Panika (`p3_flow.js: addFear`)

```
pk = h.trait === 'coward' ? 0.55 : 0.7
if barbarzyńca && przekroczył pk*lim w tym wywołaniu && !fleeing && !crystal && time > rageCd && startRage(h, 'panic'):
   h.fear = max(0, h.fear - 0.25*lim); return                     // gniew zamiast paniki
if przekroczył pk*lim (before < pk*lim <= fear) && !fleeing && !crystal && time > h.panicUntil:
   h.panicUntil = time + 2 + rand*2; h.needPlan = true; SAY.panic (3, dur 1.8, 'loud')
```

Spanikowany (`panicking(h)`):
- traci przywództwo (6.3.1), nie bierze udziału w rozmowach, naradach, przygotowaniach, nie pracuje (gałąź paniki w `planHero` jest pierwsza);
- biegnie: jeśli już ucieka, do wyjścia; jeśli nie, do dalekiego znanego punktu (`randomKnownFar`), w obu przypadkach bez omijania zagrożeń (`noDanger`), prędkość x1,2;
- mówi tylko "głośno" (`inChaos`, 6.7.2);
- jeśli wybiegnie przez wyjście, liczy się jako przestraszony (`heroExit`);
- nadal podnosi łup, na który wejdzie (warunek w `onEnter` to tylko `!crystal && !fleeing`).

Panikę wywołują też nietoperze (`p4_traps.js: fireRaw`): trafiony nie-lider, nie uciekający, bez kryształu, nie w klatce, z szansą `(rank 0 ? 0.6 : 0.35) * (poz. 3 ? 1.3 : 1)`: `panicUntil = time + 2.5`, `SAY.batScatter` (2, loud).

### 6.6.2 Ucieczka jednego (`p3_flow.js: startFlee`)

Warunek (`addFear`): `h.fear >= lim && !h.fleeing && !h.crystal && !caged(h)`. Niosący kryształ najpierw go rzuca (`dropCrystal`, 6.3.9), potem ucieka. Też: uwolniony z klatki ze strachem >= odwagi, odepchnięci od serca w fali 1.
```
h.fleeing = true; needPlan
karta Krzyki w ścianach: wszyscy inni nieuciekający dostają strach
rest/talk/wait/boss/disarm/free -> walk; h.item = null
SAY.cowardRun (tchórz) albo SAY.flee (4, dur 2)
czempion (inny, żywy, nie ucieka, nie w klatce), raz na 15 s: SAY.champShout (4); wszyscy inni nieuciekający fear -= 0.25*courage
lider (inny, R.coord) z szansą 0.6: SAY.fleeShout (2)
if plan nie 'flee'/'escape' && liczba uciekających >= max(2, ceil(żywych/2)): partyFlee()
karta Panika: inni nieuciekający w odległości <= 3 dostają 25 * mods.panic strachu
```
Uciekający idzie do wyjścia (`exiting`), omija zagrożenia słabiej (`avoid x0.6`), biegnie x1,15, używa butów; jego strach nie wygasa. Nie podnosi łupów.

### 6.6.3 Ucieczka całej drużyny (`p3_flow.js: partyFlee`)

Wyzwalacze:
1. `partyThink`: `fearR > [0.75, 0.85, 0.95, 1][L.rank]` (średnia fear/courage załogi; nowicjusze pękają pierwsi) albo `P.morale < 0.2` przy liderze rangi 0-1;
2. `startFlee`: uciekających jest co najmniej `max(2, ceil(żywi/2))`;
3. `crystalReturns`: po utracie niosącego, gdy drużyna nie jest dość spokojna (6.3.9).
```
if plan 'flee' albo 'escape': return
P.plan = 'flee'
każdy żywy bez kryształu: fleeing = true (także uwięziony w klatce); needPlan; rest/talk/boss/wait -> walk
lider: SAY.partyFlee (4, dur 2.2)
```
Stany `disarm`, `smash`, `free`, `fight` same się przerywają przy `exiting`. Pozostali w kolejce czekają na zewnątrz (6.2.13).

### 6.6.4 Bossowie

- **Czempion**: okrzyk przy cudzej ucieczce (6.6.2); obecność bossa zmniejsza strach wszystkich (sekcja 05); wyłamuje klatkę.
- **Bohater z przepowiedni**: przy pierwszym spadku poniżej 50% HP (`p3_flow.js: damage`, raz, `h.raged`): +20% max HP, osłona 20% max, wszyscy inni `fear -= 0.2 * courage`, `SAY.finalRage` (4, dur 2.4). W promieniu 3 od niego strach mniejszy (sekcja 05). Po końcu cierpliwości prowadzi szturm (6.3.10). Nie dostaje cechy.

### 6.6.5 Ciągłe źródła strachu wynikające ze stanu (wartości na sekundę, przed mnożnikami z `addFear`)

| Stan | Strach | Źródło |
|---|---|---|
| sam (`h.alone`: są inni, kolejka pusta, najbliższy > 4,5 pola), nie na zwiadzie | `2.5` + Groza `GZ.alone` (sekcja 03); raz `SAY.alone` (2), dopóki nie wróci do grupy | `partyThink` |
| na zwiadzie z dala od drużyny (1.16, 6.2.10a) | `1` (`'split'`) + Groza `GZ.split` | `partyThink` |
| `hp < 0.35 max` | `2.2` | `partyThink` |
| niesie kryształ (karta) | `mods.carrierFear` | `partyThink` |
| w klatce (karta Nawiedzone klatki) | `mods.cageHaunt` | `partyThink` |
| w klatce porzucony albo nikt wolny nie może pomóc | `8 * mods.cageFear` | `partyThink` |
| przeklęty | `2` | `partyThink` |
| kołysanka, dopóki w tym pokoju | `h.lullK` (`5 * pw`) | `partyThink` |
| zgubiony | `4` | `partyThink` |
| odpoczynek w Sanktuarium (koszmary) | `3.5` | `updateHero` |
| przy sercu w fali 1 | `0.3 * courage` | `step` |

### 6.6.6 Śmierć przyjaciela (`p3_flow.js: kill`, część zachowania)

`P.morale -= 0.25` (min 0,15). Każdy żywy: `shakenUntil = time + (blisko < 8 pól ? 9 : 5)` (wstrząśnięty: wolniejsze wygasanie strachu, kwestie `shaken`, powód do pieśni barda). Odważny, barbarzyńca albo wojownik (30%), który nie ucieka: furia z imieniem zmarłego (`SAY.revenge`) i tylko 30% strachu. Pozostali: z szansą 0,55 `SAY.death` (albo `SAY.deathFlee`, gdy uciekają albo drużyna wychodzi; 4, dur 2.2) i strach (tchórz x1,5; liczby w sekcji 05). Ekwipunek zmarłego wypada jako łup. Zmarły lider/zwiadowca: funkcja zwolniona.

## 6.7 Mowa: dymki, kolejki, rozmowy

Każda decyzja bohatera jest "powiedziana na głos". Od wersji 1.10 rozmawiają po kolei, a nie wszyscy naraz. Wygląd dymka (wielkość, kolor, "głośny" dymek, kierunek): sekcja 08.

### 6.7.1 Model

- Kwestia = tekst + `prio` (1 zwykła, 2 ważniejsza, 3 decyzja/wydarzenie, 4 krzyk) + `dur` (opcjonalnie) + `how` (`'loud'`, `'q'` albo brak).
- **Głośna** kwestia (`loud`): `how === 'loud'` albo `prio >= 4` albo mówiący jest "w chaosie" (`inChaos(h)`: panikuje, ucieka albo jest w klatce). Głośna nie czeka na swoją kolej.
- **Spokojna** kwestia czeka, aż w zasięgu słuchu nikt nie mówi (plus oddech `SAY_GAP`) i nikt nie czeka przed nią w kolejce.
- Dymek: `h.bubble = {text, prio, at, until, loud}`; `h.saidUntil = until`. Gaśnie w `step`, gdy `until <= time`.

Stałe (`p3_flow.js`): `SAY_GAP = 0.3` s; `SAYQ_LIFE = [0, 1.4, 2.6, 4]` (ile spokojna kwestia może czekać, wg `min(3, prio)`); `readT(t) = clamp(1.1 + 0.042 * t.length, 1.6, 3.4)` (czas czytania w s wg liczby znaków).

### 6.7.2 `say(h, text, prio, dur, how)` (`p3_flow.js: say`)

```
if !h || h.dead || h.fled || h.gone || !text: return false
prio = prio || 1
loud = how === 'loud' || prio >= 4 || inChaos(h); b = h.bubble
if b aktywny && b.prio > prio: return false                        // ważniejsza kwestia nie daje się przerwać (bez kolejki!)
if b aktywny && b.prio === prio && time - b.at < 0.7: return false  // ta sama waga: nie częściej niż co 0.7 s
if !loud && (floorBusy(h) || (how !== 'q' && othersWaiting(h, prio))):   // nie jego kolej
   if how !== 'q':
      h.sayQ.push({text, prio, dur, exp: time + SAYQ_LIFE[min(3, prio)]}) jeśli tego tekstu jeszcze nie ma
      jeśli w kolejce > 2: usuń wpis o najniższym prio (pierwszy taki)
   return false
hush = h.room >= 0 && isRt(h.room, 'hush')                        // Głusza: usta się ruszają, nic nie słychać
t   = hush ? (loud ? '…!' : '…') : gtext(text, h.female)
len = hush ? 1.4 : loud ? (dur || 1.9) : max(dur || 1.9, readT(t))
h.bubble = {text: t, prio, at: time, until: time + len, loud}; h.saidUntil = time + len
if !loud:                                                         // zwraca się do słuchacza
   to = najbliższy (po tx,ty) inny w earshot; każdy inny w earshot i w odległości <= 4: lookAt(o, h.x, h.y)
   if to: lookAt(h, to.x, to.y)
return true
```

- Kwestia odrzucona przez wyższy priorytet aktywnego dymka **przepada** (nie trafia do kolejki).
- `gtext` wybiera formę wg płci: szablon `{forma męska|forma żeńska}`. **Tylko prototyp:** podmiana wyrażeniem regularnym. Odpowiednik: Unity Localization (Smart Strings) z wyborem płci mówiącego.

### 6.7.3 Kolejki

**Kolejka bohatera** `h.sayQ` (najwyżej 2 wpisy) i `sayTick()` (każdy krok, `p3_flow.js`):
```
dla każdego bohatera: usuń wpisy z exp <= time; niepuste (i żywy) -> lista czekających
sortuj czekających: prio pierwszego wpisu malejąco, potem exp rosnąco (najstarszy pierwszy)
dla każdego: say(h, e.text, e.prio, e.dur, 'q'); udało się -> usuń wpis
```
Tryb `'q'` czeka tylko na `floorBusy` (nie na `othersWaiting`) i nie trafia ponownie do kolejki.

**Kolejka drużyny** `P.queueSay` (wpisy `{id, text, at, prio = 2, dur = 1.8, how = 'q'}`), obsługiwana na początku `partyThink`:
```
sortuj po at; held = []
dla każdego wpisu q:
   if q.at > time: zostaw
   h = byId(q.id); if brak/dead/fled/gone || time - q.at > 10: usuń      // moment minął
   if q.how !== 'loud' && ktoś z held jest w earshot h: held.push(h); zostaw   // odpowiedź czeka na kwestię, na którą odpowiada
   if say(h, q.text, q.prio || 2, q.dur || 1.8, q.how || 'q'): usuń
   else: held.push(h); zostaw
```
Tak działają odpowiedzi, narady, przygotowania i dialogi: kolejne linie mają rosnące `at`, a linia czeka, aż wcześniejsza w zasięgu słuchu zostanie powiedziana.

### 6.7.4 Zasięg słuchu i zajęta "podłoga"

```
earshot(a, b) = (roomOf(a.tx,a.ty) >= 0 && roomOf(a.tx,a.ty) === roomOf(b.tx,b.ty)) || hypot(a.tx-b.tx, a.ty-b.ty) <= 7
                 // ten sam pokój albo korytarz (wersja 1.11: 7 pól; wcześniej 2,5)
inChaos(h)    = time < h.panicUntil || h.fleeing || h.state === 'caged'
floorBusy(h)  = jakiś żywy bohater o (także sam h) ma o.saidUntil + SAY_GAP > time i earshot(h, o)
othersWaiting(h, prio) = jakiś żywy o w earshot(h, o) ma w sayQ niewygasły wpis z prio >= prio
                         || jakaś pozycja P.queueSay z at <= time ma mówiącego w earshot(h)
```
Bohaterowie w różnych pokojach (i dalej niż 7 pól) mówią jednocześnie. Bohater nie powie spokojnej kwestii, dopóki sam ma dymek (+0,3 s).

### 6.7.5 Rozmowy drużyny

- **`partySay(k, prio, who)`** (`p5_ai.js`): ten sam klucz najwyżej co 5 s (`P.lastSay[k]`); mówi `who` albo lider; tekst losowy z `SAY[k]`. Używane dla: `rookieLead`, `explore`, `retreat`, `restDone`, `assault`, `regroup`.
- **Kto rozmawia** (od 1.13, decyzja autora 20.10: drużyna stawała w miejscu wszędzie, w innych pokojach i na pułapkach): `talkGroup(c)` = `c` (zwykle lider) i ci, którzy stoją z nim w tym samym miejscu: `samePlace(a, b)` = ten sam pokój albo korytarz (`roomOf(tx, ty)` równe i >= 0) albo odległość <= 3,5 pola; bez zgubionych, panikujących, uwięzionych, uciekających, zwiadowcy i jego partnera (`onScout`, 1.16) i wychodzących. Tylko oni dostają `h.talkUntil` i stają; reszta robi swoje (idący za liderem dochodzą do niego jak zwykle). Dwie grupy mogą rozmawiać naraz. `P.talkUntil` = koniec najpóźniejszej rozmowy (cierpliwość 6.3.10, blokada rozmów 6.7.8).
- **`talk(dur, lines, c = lider)`**: jeśli nie `fearless`, drużyna nie wychodzi, grupa niepusta i nikt z grupy już nie rozmawia: `koniec = time + max(dur, talkLen(lines))`, każdy z grupy `h.talkUntil = koniec`; linia `i` mówi `grupa[i % n]` (pierwsza: `c`) o `at = time + 0.65*i`. Zwraca grupę albo `null`.
- **`talkAs(dur, lines, c = lider)`** (wersja 1.05): jak wyżej, ale każda linia ma mówcę (`[bohater, tekst]`, `null` = ktokolwiek z grupy wg `i`), `at = time + 0.7*i`; od 1.13 linia mówcy spoza grupy przepada (na rozwidleniu głos mają tylko ci, którzy stoją z liderem, i tylko złodziej z grupy może zaproponować zwiad). Używane: narada na rozwidleniu. Od 1.12.1 narada dostaje jeszcze głos kogoś, kto nic nie powiedział (nie złodziej): `councilReply`, a po niej `huddleUp(L)`.
- **`talkLen(lines) = Σ (readT(t) + SAY_GAP) + 0,6`** (od 1.12.1; w 1.10-1.12 było `0.55 × Σ`, więc drużyna ruszała, zanim padła połowa kwestii): drużyna stoi tyle, ile trwa powiedzenie wszystkiego, jedno po drugim.
- **`huddleUp(L)`** (od 1.12.1, `p5_ai.js`; od 1.13 tylko uczestnicy rozmowy, `talking(h)`, a pole docelowe musi spełniać `standOk`, 6.2.16): w naradzie i przy przygotowaniu bohaterowie dalej niż 2 pola (Manhattan) od lidera podchodzą do najbliższego wolnego pola w promieniu 2 od niego (BFS po polach przejezdnych bez innych bohaterów i bez żywych potworów, nie dalej niż 7 kroków, nie na pole wyjścia); bliżsi zostają. W trakcie dojścia `h.huddle = true` (planHero ich nie przestawia, stan `talk` czeka na koniec drogi). Po dojściu (i ci, którzy stali blisko) odwracają się do lidera (`lookAt`, `h.huddleId`). Bohater w trakcie kroku dołącza po jego końcu.
- W trakcie `P.talkUntil` i odpoczynku cierpliwość płynie 2 razy wolniej (6.3.10). Spokój (autoprzyspieszenie i wolniejszy zegar combo) od 1.13 trwa także w scenkach, w tym na postoju przed groźnym pokojem (decyzja autora 20.10: "cisza niech trwa w trakcie odpoczynku bohaterów i narad również"); w 1.12.1 scenki go wyłączały (`sceneNow`, a `P.prep` nigdy nie był spokojem). Od 1.13 spokojem jest też chwila, gdy ktoś siedzi w zapadni, i gdy wszyscy są w klatkach (7.10.3).
- Stojący bohater z `fl.time < h.talkUntil` (nie wychodzący, nie zgubiony, nie panikujący, nie zwiadowca, nie wędrujący, nie w drodze do narady ani z pułapki) przechodzi w stan `talk` (6.1.8); do 1.12.1 robił to każdy w czasie `P.talkUntil`. Przygotowanie przed groźnym pokojem też ustawia `h.talkUntil` swojej grupy (6.3.8); specjaliści przygotowania (kapłan, mag, złodziej, wojownik) są brani tylko z tej grupy.
- Inne krótkie dialogi przez `P.queueSay`: spór o łup (`lootStop`/`lootReply`), porzucenie (`abandon`/`abandoned`), szukanie zgubionego, odpowiedź na wołanie, wołanie o kapłana, podanie mikstury, protest przy szturmie i odwrocie, podziękowanie za pieśń, reakcja na trafienie przyjaciela (`friendHit`, głośna, +0,5 s, gdy pułapka zabrała >= 25% max HP, najbliższy w odległości <= 4 nieuciekający, nie panikujący, nie zgubiony; najwyżej co 5 s dla całej drużyny).

### 6.7.5a Rozmowy bohaterów (od 1.13, `p5_ai.js: lineKey, convoAfter, convoStart, convoFill`; dane `CONVO`, `CONVO_ALIAS`, `CONVO_P`)

Decyzja autora (20.10): "dajmy im konwersacje": bohaterowie mają komentować nawzajem swoje dymki, działania, błędy i sukcesy, a nie tylko rzucać pojedyncze kwestie.

```
say(h, text, ...) udana i nie w Głuszy -> convoAfter(h, text)
convoAfter(h, text): k = lineKey(text)            // klucz SAY tej kwestii; zagnieżdżone: 'trap:spikes', 'phobia:fire'
                     if k: convoStart(h, k)
zabicie potwora (hurtMonster, hp <= 0): zabójca = bohater z h.foe == m -> convoStart(zabójca, 'monsterDown')

convoStart(A, key):
  stop gdy: nie fala / koniec fali; time < P.convoT ('breath'); talking(A) ('talk');
            w kolejce P.queueSay czeka kwestia kogoś w zasięgu słuchu A ('queue')
  zestaw = CONVO[key] || CONVO[CONVO_ALIAS[key]] || CONVO[klucz bazowy]; brak -> koniec
  rand > CONVO_P[key] (albo aliasu, bazowego; domyślnie 0,5) -> 'luck';  A w Głuszy -> 'hush'
  słuchacze = żywi w zasięgu słuchu A (6.7.4), nie zgubieni, nie w klatce, nie w chaosie, nie w rozmowie; brak -> 'alone'
  pasujące wymiany: A nie zniknął/nie zginął, jeśli mówi; klasa i charakter A (ac, at); B ze słuchaczy z klasą b,
     charakterem bt, rangą <= br i >= bv; wymiana z C wymaga 2 słuchaczy. Waga w × 1,6, gdy wymiana ma warunki
     (pasujące do sytuacji wygrywają z ogólnymi). Brak -> 'fit'
  B = losowy pasujący, C = losowy inny słuchacz
  t0 = max(time + 0,3, A.saidUntil + SAY_GAP); oczekiwany = t0      // od 1.13.1: od chwili, gdy A skończy kwestię, która ją zaczęła
  kwestie do P.queueSay po kolei: { id, text: convoFill(tekst), at: t0, prio 2, cv: nr wymiany, late: oczekiwany - t0 + 3,5 },
     oczekiwany += readT(tekst) + SAY_GAP + 0,1
     // wszystkie są "na teraz", więc nikt w zasięgu słuchu się nie wtrąci (othersWaiting, 6.7.3), a kolejka trzyma
     // późniejsze, dopóki nie padnie wcześniejsza (sortowanie po at jest stabilne)
  P.convoT = oczekiwany + 1,5-4 s; stats.convos++; każda odmowa liczy się w stats.convoNo[powód]
kolejka (6.7.3): kwestia spóźniona o > late (od at; inne kwestie 10 s) przepada razem z resztą swojej wymiany (cv)
```

- Kwestie idą przez zwykłą kolejkę drużyny, więc mówią po kolei, po przeczytaniu poprzedniej (6.7.2-6.7.4); okrzyki i chaos je przerywają, a przerwana wymiana kończy się, zamiast wracać po kilku sekundach bez kontekstu.
- `convoFill`: `{A:m|ż}` `{B:...}` `{C:...}` = forma wg płci tej osoby; `{An}` `{Aa}` `{Av}` (B, C) = jej imię (mianownik, biernik, wołacz); `{m|ż}` bez litery zostaje do `gtext` w `say` (płeć mówiącego).
- Zestawy (74, 143 wymiany, 305 kwestii, `data/CONVO.json`): wpadki (`trap`, `trap:web`, `trap:trapdoor`, `trap:cage`, `scare`, `trap:portrait`, `hurt`, `disarmFail`, `disarmHit`, `slip`, `cursedPick`, `panic`, `cowardRun`, `crystalDrop`), sukcesy (`disarmDone`, `dodge`, `monsterDown`, `detect`, `resistHit`, `loot1-3`, `gold`, `freed`, `found`, `steal`), moce i działania (`shield`, `heal`, `fireball`, `fight`, `smash`, `rage`, `song`, `bless`, `cleanse`, `barrier`, `charmUse`, `bootsUse`, `potion`, `timing`), lęki (`phobia:*`, `ghost`, `bats`, `spider`, `lull`, `nightmare`, `seenBuilt`), drużyna (`enter`, `champion`, `rookie`, `rookieBoast`, `vetWarn`, `elite`, `explore`, `cautious`, `heartSeen`, `assault`, `retreat`, `restDone`, `rumor`, `fame2`, `gateWait`, `nap`, `goldHeavy`, `weakHit`, `learn`, `alone`, `landed`).
- Klucze bez zestawu (np. `chat_*`, `callHealer`, `potionGive`, kwestie narady) nie zaczynają rozmów: mają już swoje odpowiedzi (`CHAT_REPLY`, kolejki 6.7.5).
- Pomiar (10 fal testu z gęstymi pułapkami, 1.13): ok. 1,5-2,5 wymiany na falę; najczęstsze odmowy: kolejka zajęta w pobliżu, przerwa, los. Test: `tests/t113_talk.py`.

### 6.7.5b Sam bohater (od 1.13.1, `p3_flow.js: aloneNow, say`; dane `SOLO`, `SOLO_MUTE`)

Decyzja autora (20.10): bohaterowie nie mogą mówić do powietrza, gdy są sami.

```
aloneNow(h) = !(fl.queue niepuste && h w odległości <= 5 od wejścia)        // reszta jeszcze wchodzi przez drzwi
              && nikt inny (żywy, nie uciekł, nie w zapadni) nie jest w zasięgu słuchu h (6.7.4)
say(h, text, ...): w fali, gdy aloneNow(h):
   k = lineKey(text) (6.7.5a);  SOLO[k] albo SOLO[klucz bazowy] -> text = losowa kwestia z SOLO (myślenie na głos)
   inaczej klucz w SOLO_MUTE -> kwestia nie pada (say zwraca true: "powiedziane", bez dymka)
   inaczej bez zmian (okrzyki, ból, strach, pułapki zostają)
small talk (6.7.6): sam (i nie ucieka, nie niesie kryształu) -> pula SOLO.chat + SOLO['chat_' + charakter] + SOLO['chat_' + klasa]
talkAs: kwestia "ktokolwiek" (null) idzie do kogoś innego niż ten, kto zaczął; samotny lider nie dostaje drugiej kwestii narady
   i nie spiera się sam ze sobą (narada na rozwidleniu dopisuje drugi głos tylko, gdy ktoś stoi obok)
```

- Przykłady: narada "Lewo czy prawo?" -> "Nie ma kogo zapytać. Idę tędy."; odpoczynek "Siadamy. Opatrzmy rany." -> "Usiądę na chwilę."; small talk "Słyszycie to?" -> "Mówię do siebie. To chyba zły znak."; "Bierz to, poczekamy." -> nic.
- Rozmowy (6.7.5a) i tak wymagają słuchacza, więc samotny ich nie zaczyna.

### 6.7.6 Small talk (`p5_ai.js: partyThink` krok 21)

```
P.chatT -= dt; if P.chatT > 0: koniec
P.chatT = 7 + rand*6
pool = żywi bez dymka, nie panikują, nie w klatce, nie zgubieni, nie w stanie fight/smash, !floorBusy(o)   // tylko w ciszy
h = losowy z pool; lines = []; mood = null
if h wychodzi/niesie/ucieka: lines += chatFlee; niesie -> + chatCarrier dwa razy; hp < 0.4 max -> + chatHurtOut
elif P.plan === 'retreat':   lines += chatRest
else:
   scared = fear > 0.5*courage; shaken = time < shakenUntil + 6
   hp < 0.4 max:                 2 kwestie zaszyte ("Ledwo stoję...", "Potrzebuję chwili.")
   ma przedmiot && !scared:      2 kwestie składane o pierwszym przedmiocie z plecaka (HITEMS: name, acc, g)
   scared:                       2 kwestie zaszyte ("Nie podoba mi się...", "Wracajmy...") ; mood 'fear'
   shaken:                       SAY.shaken dwa razy ; mood 'fear'
   gold >= 2:                    SAY.goldHeavy + 1 zaszyta
   cursed:                       SAY.cursedPick
   kapłan z faith <= 1:          SAY.faithLow
   ktoś inny < 0.3 max:          jedna z SAY.friendLow z jego imieniem
   fl.greed > 1.5 && !scared && !shaken && hp > 0.5 max && nikt jeszcze nie zginął w tej fali:
                                 2 zaszyte ("Ile tu złota!", "Wszyscy będziemy bogaci.") ; mood 'greed' (jeśli nie 'fear')
   cecha z SAY['chat_' + cecha] (oprócz odważnego, gdy scared): cała lista
   bard: SAY.bardIdle; barbarzyńca: SAY.barbIdle
   rank 0 && !scared: SAY.rookie; rank 2+: SAY.elite
   zawsze: 3 zaszyte ("Słyszycie to?", "Trzymajcie się blisko.", "Patrzcie pod nogi.")
line = losowa z lines
if line && say(h, line, 1, 2.2):
   fearLine  = mood 'fear' i linia z SAY.shaken albo zaczyna się od "Nie podoba"/"Wracajmy"
   greedLine = mood 'greed' i linia to jedna z dwóch o bogactwie
   ans = (Głusza w pokoju h) ? null
       : fearLine  ? inny: nie panikuje, nie zgubiony, (brave || lider || bard), hdist <= 6
       : greedLine ? inny: nie zgubiony, careful, hdist <= 6 : null
   if ans && rand < 0.6: kolejka ans: (fearLine ? SAY.reassure : SAY.surviveFirst) (+1.6)
   elif !ans && CHAT_REPLY[line] && rand < 0.55:
      o = inny w earshot, nie zgubiony, nie panikuje, nie w klatce -> kolejka o: losowa z CHAT_REPLY[line] (+0.4, prio 1)
```
Wersja 1.05: small talk "wie, co się dzieje": w drodze do wyjścia o wyjściu, przy odpoczynku o ranach, bez rozmów o bogactwie, gdy ktoś się boi, jest ranny albo ktoś zginął.

`CHAT_REPLY.json`: obiekt `tekst kwestii -> lista odpowiedzi`. Klucze to dokładne teksty kwestii (z `SAY.chatRest`, `SAY.chat_*` i kwestii zaszytych w `partyThink`), odpowiedzi mogą mieć szablon płci. **Tylko prototyp:** dopasowanie po tekście. Odpowiednik: klucz po identyfikatorze kwestii (np. `chatRest/0`), żeby tłumaczenia nie psuły dopasowań.

### 6.7.7 Patrzenie (`p3_flow.js: lookAt`, `p5_ai.js: glance`)

- `lookAt(h, x, y)`: tylko gdy stoi (`nx === null`); `s = (x - h.x) - (y - h.y)`; jeśli `|s| > 0.3`: `h.face = s > 0 ? 1 : -1` (lewo/prawo na ekranie w rzucie izometrycznym, sekcja 08).
- Przy spokojnej kwestii mówiący patrzy na najbliższego słuchacza, a słuchacze w odległości <= 4 na niego (6.7.2).
- Przy obrażeniach (`damage`): wszyscy w odległości Manhattan <= 5 odwracają się do rannego.
- `glance(h)` (wersja 1.10), stojący w stanie `talk` albo `wait`, co `1.6 + rand*2.8` s, nie gdy sam mówi: punkty = inni w earshot + łupy widziane w tej fali i znane nierozbrojone elementy w odległości Manhattan <= 6; z szansą 0,75 patrzy na losowy punkt, inaczej odwraca się (`face = -face`). (Warunek obejmuje też `rest`, ale ten stan kończy `updateHero` wcześniej, 6.8.)

### 6.7.8 Kwestie zaszyte w kodzie i szablony

Teksty spoza `SAY.json` (w Unity przenieś je do tabeli kwestii pod nowymi kluczami; proponowane klucze w nawiasach):

| Gdzie | Kwestie | Proponowany klucz |
|---|---|---|
| `partyThink`, lider błądzi we mgle (prio 3) | 3 kwestie ("Nic nie widać... gdzie są drzwi?" i 2 inne) | `fogGrope` |
| `partyThink`, złodziej przy kracie (prio 3, dur 2) | "Podważę ją, osłaniajcie mnie!" | `gateLever` |
| `lootDecision`, ranny idzie po miksturę (prio 2) | 2 kwestie | `lootPotionNeed` |
| `noticeLoot`, zauważona mikstura | 3 kwestie | `lootPotionSeen` |
| `giveItem`, nowy przedmiot | `'Mam ' + itemAcc(item) + '!'` (biernik z przymiotnikiem rzadkości) | `gotItem` z parametrem |
| `partyThink`, small talk | ranny (2), przedmiot (2, składane z `HITEMS`), strach (2), złoto (1), bogactwo (2), ogólne (3) | `chatHurt`, `chatItem`, `chatScared`, `chatGold`, `chatRich`, `chatIdle` |
| `fireRaw`, brak tekstu dla typu pułapki | `'Pułapka!'` | `trapGeneric` |

Szablony w tekstach `SAY.json` (sprawdzone skryptem): `{m|f}` forma wg płci mówiącego (`gtext`); `{n}`, `{a}`, `{v}` imię drugiej osoby w mianowniku, bierniku, wołaczu (`nameFill`, `NAMES_M/NAMES_F` mają 3 przypadki); `{k}` liczba plotek o pułapkach (`rumorStart`). Klucze z imieniem: `death`, `deathFlee`, `rescue`, `abandon`, `revenge`, `curseLift`, `searchLost`, `leaveLost`, `friendLow`, `friendHit`, `callHealer`, `bardCall`, `answer`. Linie z `{n}/{a}/{v}` muszą dostać bohatera (`nameFill(pick(SAY.k), inny)`); w Unity: parametr "druga osoba" w Smart String.

### 6.7.9 Katalog kluczy `SAY.json`

`SAY.json` ma 210 kluczy. Wartość to lista wariantów (losowany jeden, `pick`), a dla `trap` mapa `typ pułapki -> jeden tekst`, dla `trauma`, `weakHit`, `resistHit` mapa `typ obrażeń (pierce, blunt, fire, poison) -> lista`, dla `phobia` mapa `fobia (fire, spiders, closed, ghosts, blood, dark) -> lista`. Teksty są w pliku; tu tylko kiedy padają.

Oznaczenia w kolumnie "prio / tryb": liczba = `prio`; **G** = głośna (`how 'loud'` albo prio 4); **S** = spokojna; **K** = kolejka drużyny `P.queueSay` (prio 2, dur 1,8, czeka na swoją kolej, chyba że podano inaczej); **PS** = `partySay` (ten sam klucz najwyżej co 5 s, mówi lider); `d` = `dur`. Każda kwestia staje się głośna, gdy mówiący panikuje, ucieka albo jest w klatce.

**A. Wejście i start fali** (`p3_flow.js: spawnHero`, chyba że podano inaczej)

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `breachUse`, `doorUse` | pierwszy bohater fali, gdy loch ma wyłom: wchodzą wyłomem / drzwiami | pierwszy | 3, d 2.2 |
| `returnBack` | powracający bohater (sekcja 04), gdy nie padła kwestia wyłomu | on | 3, d 2.4 |
| `hunters` | łowca skarbów, z szansą 0,6 | on | 2, d 2.2 |
| `secondGroup` | wchodzi drugi oddział (po ucieczce pierwszego): gdy jest jedynym żywym albo z szansą 0,3 | on | 3, d 2.2 |
| `finalAura` | pierwszy bohater to bohater z przepowiedni | on | 2, d 2.4 |
| `champion` | pierwszy bohater to czempion | on | 2, d 2.4 |
| `guildFear`, `guildKill`, `guildTraps`, `guildMonsters`, `guildLost`, `guildBlock` | pierwszy bohater, gildia przysłała specjalistę (`run.guild.kind`: fear, kill, traps, monsters, lost, block; sekcja 04) | pierwszy | 2, d 2.4 |
| `heartRumor` | pierwszy, serce znane z plotek (gdy nie ma bossa ani gildii) | pierwszy | 2, d 2.4 |
| `rumorStart` | pierwszy, są plotki o pułapkach (`{k}` = ich liczba) | pierwszy | 2, d 2.4 |
| `rookieBoast` | pierwszy rangi 0 (gdy nic wyżej); inni rangi 0: szansa 0,35, z tego połowa | on | 2, d 2.4 / 1 |
| `enter` | pierwszy, gdy żaden warunek wyżej | pierwszy | 2, d 2.4 |
| `fame1`, `fame2` | drugi bohater, sława lochu (`rankOf(run.total).i`, sekcja 03) >= 2, szansa 0,7; `fame2` od sławy 4 | drugi | 2, d 2.2 |
| `rookie` | inni rangi 0: szansa 0,35, z tego połowa; też small talk (rank 0, bez strachu) | on | 1 |
| `cautious` | kolejny bohater z cechą careful, szansa 0,4 (gdy nie nowicjusz z kwestią) | on | 1 |
| `gate` | otwarcie wejścia po `GATE_T` (`p6_loop.js: step`) | `alive()[0]` | 2, d 1.6 |

**B. Prowadzenie, eksploracja, mapa**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `explore` | `chooseTarget`: nowy cel bez narady, szansa 0,35 | lider | PS 1 |
| `rookieLead` | `chooseTarget`: lider rangi 0 zmienił cel, szansa 0,3 | lider | PS 1 |
| `deliberate` | narada na rozwidleniu: otwiera lider; drugi raz "ktokolwiek", gdy nikt inny nie zabrał głosu | lider / ktoś | K (`talkAs`) |
| `argueLoot`, `argueCareful`, `argueCoward`, `argueBrave` | narada: chciwy (łup przy drugiej drodze), ostrożny, tchórz (morale < 0,8), odważny (gdy tchórz mówił) | ci bohaterowie | K |
| `decideYes`, `decideNo` | narada: lider ulega chciwemu albo nie | lider | K |
| `scout`, `scoutReply` | narada: złodziej (od 1.16 bez niego czasem odważny) zgłasza się na zwiad, lider odpowiada; `scoutReply` odpowiada też na `restScout` (+1,4 s) | zwiadowca, lider | K |
| `splitMate`, `splitReply` | 1.16: narada, partner idzie ze zwiadowcą; lider odpowiada zamiast `scoutReply` | partner, lider | K |
| `aheadScout`, `aheadReply` | 1.16: zwiad przodem przy wejściu do nowego pokoju; lider odpowiada po 1,3 s | złodziej, lider | 2 / kolejka |
| `restScout` | 1.16: złodziej idzie się rozejrzeć na postoju | złodziej | 2 |
| `councilReply` | narada: ktoś, kto jeszcze nic nie powiedział (nie złodziej), dorzuca słowo | ten bohater | K |
| `scoutBack` | zwiadowca wraca (`partyThink`) | zwiadowca | 2 |
| `wander` | nowicjusz odłącza się sam | on | 2 |
| `hesitate` | lider waha się przed nieznanym polem (morale < 0,75) | z `talk()` | K |
| `detour`, `detourBack` | zły skręt (`maybeDetour`); lider doszedł do celu objazdu (`planHero`) | lider | 3 / 2 |
| `regroup` | lider czeka na maruderów | lider | PS 2 |
| `heartSeen`, `heartLater` | pierwsze `partyThink` ze znanym sercem; `heartLater` gdy przeszukali < 65% i lider nie jest nowicjuszem | lider | 3 |
| `assault` | zmiana planu na szturm (`partyThink`, PS 3); lider rusza do serca (`planHero`, 2) | lider | PS 3 / 2 |
| `argueSearch`, `replySearch` | szturm, a chciwy chce szukać dalej (przeszukane < 85%) | chciwy, lider | K (+1, +2) |
| `gateReroute`, `gateWait` | krata blokuje lidera od 1,2 s: idą inną drogą / czekają | lider | 3, d 2.2 |
| `gateBlocked` | krata się zamknęła (`p4_traps.js: fireRaw`): najbliższy w Manhattan <= 2 (+5 strachu) | on | 3, G |
| `rumor` | wejście do pokoju znanego z plotki, raz na bohatera, szansa 0,5 (`onEnter`) | on | 1 |
| `rumorFalse` | plotka o pułapce okazała się fałszywa (`checkGhostRumors`) | ten, kto zobaczył | 2 |
| `seenBuilt` | gracz postawił pułapkę na ich oczach (`p8b_ui.js: tryPlace`) | świadek | 3 |
| `rtFog`, `rtSwamp`, `rtGrotto`, `rtCrypt`, `rtVault`, `rtHaven`, `rtGears`, `rtHush`, `rtIce` | pierwszy, kto wejdzie do pokoju danego typu (raz na pokój w fali, nie wychodzący; `onEnter`, `RT_SAY`) | on | 3 |
| `bAltar` | wejście do pokoju z Ołtarzem (3); osłona przed pokojem przy Ołtarzu (4); odczynianie przy Ołtarzu (3); leczenie przy Ołtarzu, szansa 0,25 (2) | kapłan pierwszy | 3 / 4 / 3 / 2 |
| `bRune` | wejście do pokoju z Runą (3); zagłuszenie pułapek zablokowane przez Runę (4) | mag pierwszy | 3 / 4 |
| `bAcid` | wejście do pokoju z Kwasem | wojownik pierwszy | 3 |
| `bVeil` | wejście do pokoju z Zasłoną | ktokolwiek pierwszy | 3 |
| `bHowl` | wejście do pokoju z Kamieniem wyjcem (3); bard nie może zawołać albo zaśpiewać (3) | bard pierwszy | 3 |
| `bShackles` | wejście do pokoju z Okowami (3, `partyThink`); furia zablokowana (3, raz na pokój i bohatera, `startRage`) | barbarzyńca pierwszy | 3 |
| `bDecoy` | Wabik podnosi alarm (rozbrojony albo rozbity, `decoyAlarm`) | rozbrajający albo ktoś w pokoju | 4, G |

**C. Pułapki, wiedza, prace**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `trap` (mapa wg typu) | pułapka jeszcze nieznana odpala przy świadkach (`fireRaw`); dodatkowo `trap.portrait` i `trap.mirror` przy każdym odpaleniu (3, S) | pierwszy trafiony albo świadek | 3, d 1.4, G |
| `learn` | miało być: zapamiętali pułapkę; w praktyce nigdy nie pada (6.8) | - | 2 |
| `noLearn` | pułapka odpaliła, nikt jej nie zapamiętał | pierwszy świadek | 2 |
| `detect`, `amulet` | wykrył pułapkę wzrokiem; `amulet` gdy ma amulet i nie jest złodziejem (`learnTrap`) | on | 2 |
| `nastyTrap` | poznali pułapkę poz. 3, szansa 0,7 | wykrywający albo ktoś w pokoju | 3 |
| `vetWarn` | pułapka trafiła nowicjuszy, szansa 0,3: weteran rangi 2+ obok (< 7) | weteran | 2 |
| `timing` | weteran stoi w obszarze znanej przeładowującej się pułapki (raz na pułapkę) | on | 2 |
| `sense` | mag poz. 8+ wyczuł pułapki pokoju | mag | 3 |
| `disarm`, `disarmDone`, `disarmHit`, `disarmFail`, `sapped` | zaczyna rozbrajać; rozbroił; pułapka odpaliła w trakcie; wpadka albo Mechanizm samobójczy; rozmontował na stałe | złodziej | 3 / 2 / 3 G / 3 / 3 |
| `bless` | kapłan zaczyna odczyniać portret | kapłan | 3 |
| `bomb` | rzut bombą w pułapkę albo w potwora (> 60 HP) | rzucający | 3 |
| `shield` | wojownik podnosi tarczę przed zagrożeniem | wojownik | 2 |
| `dodge` | złodziej unika trafienia | złodziej | 2, G |
| `prepStart`, `prepWard`, `prepJam`, `prepDisarm`, `prepShield` | przygotowanie przed groźnym pokojem, co 0,5 s; od 1.13.3 najwyżej 2 specjalistów (losowo) | lider, kapłan, mag, złodziej, wojownik | K |
| `rush` | koniec przygotowania, bieg | lider | 3 |
| `slip` | ślizg na lodzie | on | 2, d 1.2, G |
| `lull` | pozytywka zaczyna grać | pierwszy objęty | 3 |
| `fall`, `landed` | spada przez zapadnię; wychodzi z niej | on | 4 |
| `cage`, `freed`, `cageBreak`, `cageDie` | złapany; uwolniony; boss wyłamuje kraty; umiera w klatce | uwięziony | 4 / 3 / 4 / 4 d 2 |
| `rescue`, `abandon`, `abandoned` | decyzja: wracamy po niego / zostawiamy; odpowiedź porzuconego (+1 s) | lider (albo inny), uwięziony | 3 / 3 / K |

**D. Potwory i walka**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `fight`, `avoid` | wojownik szarżuje na potwora; wojownik omija groźnego potwora (szansa 0,3 na plan) | wojownik | 2 |
| `ghost` | pierwszy raz w aurze ducha (raz na falę) | on | 3, G |
| `ghostOnly` | wojownik po `ghost`: zawsze zablokowane (6.8) | wojownik | 2 |
| `shade` | pierwszy raz przy cieniu (raz na falę); cel szeptu przy każdym odpaleniu cienia | on | 3, G |
| `bats`, `batScatter` | pierwszy raz w roju (raz na falę); spłoszony przez nietoperze | on | 3 G / 2 G |
| `spider` | pierwszy raz oplątany przez pająka w walce | on | 2, G |
| `fireball`, `dispel` | mag rzuca kulę ognia; rozprasza sieć | mag | 1 / 3 |
| `smash`, `smashB` | barbarzyńca rąbie mebel / budowlę | barbarzyńca | 3 |
| `rage`, `rageNoPanic`, `revenge` | furia: po trafieniu; zamiast paniki; po śmierci przyjaciela (z imieniem) | on | 4, d 2.2 |

**E. Leczenie, wsparcie, moce**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `heal`, `cleanse`, `barrier`, `curseLift` | modlitwa: leczenie; gaszenie ognia; bariera; zdjęcie klątwy (z imieniem) | kapłan | 1 / 3 / 3 / 3 |
| `faithLow` | brak wiary na modlitwę (raz, aż wiara wróci do 2); brak wiary na osłonę przed pokojem; small talk kapłana z wiarą <= 1 | kapłan | 3 / 3 / 1 |
| `callHealer`, `healerReply` | ranny (< 40%) daleko od kapłana woła; kapłan odpowiada (+1,1) | ranny, kapłan | 2 / K |
| `potion` | pije miksturę (próg `R.potion`) | on | 3 |
| `potionGive`, `potionThanks` | daje miksturę umierającemu; podziękowanie (+1,1) | dający, biorący | 3 / K |
| `charmUse`, `amuletUse`, `bootsUse` | użycie talizmanu, amuletu, butów | on | 3 / 3 / 2 |
| `song`, `songThanks` | pieśń barda; podziękowanie (+1,6) | bard, ktoś obok | 3 d 2.2 / K |
| `bardCall` | bard woła zgubionych (`bardTick`, 3); bard odpowiada na wołanie zgubionego (`answerLost`, K) | bard | 3 / K |
| `answer`, `hearVoice`, `lostHear`, `echoLost` | odpowiedź na wołanie zgubionego (+0,8); zgubiony słyszy głos (+1,8) / muzykę barda; echo przy Kamieniu wyjcu (+1,4) | odpowiadający, zgubiony | K |
| `nap`, `nightmare` | drzemka w Sanktuarium; koszmar po 1,5 s odpoczynku w Sanktuarium | on | 2 |

**F. Łupy i przedmioty**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `loot1`, `loot2`, `loot3` | zauważył łup danej rzadkości (`noticeLoot`, 2 albo 3 od rzadkości 2); decyzja "idę" bez szczególnego powodu (`lootDecision`, 2) | ten, kto zobaczył / decydujący | 2-3 |
| `lootGreedy`, `lootLegend`, `lootRookie`, `lootGo` | decyzja "idę": chciwy; legendarny; nowicjusz; mimo ryzyka (> 2) | on | 2 |
| `lootRisk`, `lootCareful`, `lootPetty` | decyzja "nie idę" (szansa 0,6): zbyt groźnie; ostrożny; elita nie schyla się po złoto | on | 2 |
| `lootStop`, `lootReply` | lider (rangi 1+) sprzeciwia się ryzykownemu łupowi, szansa 0,4; odpowiedź | lider, zbierający | K (+0,8, +1,8) |
| `lootWait` | lider czeka na zbierającego, szansa 0,55 | lider | K prio 1 |
| `lootFlee` | zauważył łup rzadkości 2+ w czasie ucieczki | on | 2 |
| `gold`, `goldHeavy` | podniósł złoto (`goldHeavy` gdy ma >= 3); `goldHeavy` też w small talku (>= 2) | on | 2 / 1 |
| `swap`, `full`, `noNeed` | wymienił przedmiot; plecak pełny; ma lepszy | on | 2 / 1 / 1 |
| `cursedPick` | wziął przeklęty skarb; small talk przeklętego | on | 3 d 2.2 / 1 |
| `cursedWarn` | kapłan poz. 6+ wyczuł klątwę na łupie | kapłan | 4, d 2.2 |

**G. Gubienie się**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `lost`, `found` | zgubił się (`getLost`); odnalazł drużynę | on | 3 |
| `lostCall` | zgubiony woła (co 6-9 s) | on | 2 |
| `searchLost`, `leaveLost` | lider decyduje: szukamy / sam trafi (+0,8) | lider | K |
| `alone` | został sam (raz, aż wróci do grupy) | on | 2 |

**H. Odwrót, rany, strach, ucieczka**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `retreat`, `restDone` | odwrót; koniec odpoczynku | lider | PS 3 / PS 2 |
| `argueRetreat`, `agreeRetreat` | odważny/barbarzyńca protestuje; tchórz się zgadza | oni | K |
| `hurt`, `hurtScared` | rana od pułapki >= 8 HP, szansa 0,35; `hurtScared` gdy hp < 0,3 max (`damage`) | ranny | 1 / 2, d 1.4, G |
| `friendHit` | przyjaciel stracił od pułapki >= 25% max HP (najwyżej co 5 s) | najbliższy w odległości <= 4 | K, G (+0,5) |
| `ambush` | zasadzka (3 trafienia w seriach) | z `talk()` | K |
| `panic` | wpada w panikę | on | 3, d 1.8, G |
| `flee`, `cowardRun` | zaczyna uciekać (tchórz: `cowardRun`) | on | 4, d 2 |
| `fleeShout` | ktoś ucieka, lider (poz. 3+) krzyczy, szansa 0,6 | lider | 2 |
| `partyFlee` | cała drużyna ucieka | lider | 4, d 2.2 |
| `champShout` | czempion powstrzymuje ucieczkę (co 15 s) | czempion | 4, d 2.2 |
| `death`, `deathFlee` | ktoś zginął, szansa 0,55 na każdego (bez tych w furii); `deathFlee` gdy uciekają | każdy żywy | 4, d 2.2 |
| `shaken` | small talk wstrząśniętego (do 6 s po końcu wstrząsu) | on | 1 |
| `trauma` (mapa wg typu obrażeń) | pierwsza rana tego typu, która zbiła hp poniżej 35% (z kartą 50%) | on | 4, d 2.2 |
| `weakHit`, `resistHit` (mapy) | ciało ujawnia słabość / odporność na typ obrażeń (sekcja 05) | on | 3, d 1.8, G |
| `phobia` (mapa wg fobii) | fobia się ujawnia | on | 4, d 2.2 |
| `finalRage` | bohater z przepowiedni poniżej 50% HP | on | 4, d 2.4 |
| `crystalFear` | niosący rzuca kryształ ze strachu | on | 4, d 2.2 |

**I. Serce, kryształ, koniec cierpliwości**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `steal` | wyważył kryształ | niosący | 4, d 2.2 |
| `escape` | po kradzieży, każdy inny z szansą 0,4 | oni | 2 |
| `heartRepel` | fala 1: serce ich odpycha | pierwszy przy sercu | 4, d 2.2 |
| `crystalDrop` | kryształ wraca do serca | każdy żywy | 4 |
| `impatient` | koniec cierpliwości, szturm z bohaterem z przepowiedni | `alive()[0]` | 3 |
| `prophecy` | przepowiednia pokazuje drogę do nieznanego serca | bohater z przepowiedni | 4, d 2.6 |
| `leave` | koniec cierpliwości bez przepowiedni; odepchnięci od serca w fali 1 | `alive()[0]` / pierwszy nieuciekający | 3 |

**J. Small talk** (6.7.6; prio 1, d 2.2; odpowiedzi K)

| Klucz | Kiedy |
|---|---|
| `chatFlee`, `chatCarrier`, `chatHurtOut` | w drodze do wyjścia; niosący (podwójna waga); ranny w drodze do wyjścia |
| `chatRest` | w czasie odwrotu |
| `chat_coward`, `chat_brave`, `chat_careful`, `chat_greedy` | wg cechy (odważny nie, gdy się boi) |
| `bardIdle`, `barbIdle`, `elite` | bard; barbarzyńca; ranga 2+ |
| `friendLow` | ktoś inny ma < 30% HP (z imieniem) |
| `reassure` | odpowiedź na kwestię strachu (odważny, lider albo bard w odległości <= 6, szansa 0,6) |
| `surviveFirst` | odpowiedź ostrożnego na kwestię o bogactwie (szansa 0,6) |

Plus w small talku używane: `rookie`, `shaken`, `goldHeavy`, `cursedPick`, `faithLow` (wyżej).

**K. Martwe klucze**: `charm` (nieużywany; talizman mówi `charmUse`). W praktyce nigdy nie słychać też `learn` i `ghostOnly` (6.8).

## 6.8 Błędy, martwy kod, niespójności (do przeniesienia do sekcji 11)

Zachowanie prototypu odtwarzaj wiernie; poniższe zgłoś autorowi (sekcja 02, zasady).

1. **`SAY.learn` nigdy nie pada.** `learnTrap(it, 'seen', by)` mówi tylko, gdy jest `by`, a wszystkie wywołania z `'seen'` (`fireRaw`, `fall`, `tryPlace`) podają `null`. (`p4_traps.js: learnTrap`)
2. **`SAY.ghostOnly` nigdy nie pada.** Wojownik mówi ją zaraz po swojej głośnej kwestii `ghost` (prio 3); `say` odrzuca prio 2 przy aktywnym dymku prio 3 i nie kolejkuje. (`p4_traps.js: driftTick`)
3. **`SAY.charm` nieużywany.**
4. **Intencja `avoid` jest natychmiast nadpisywana** (`h.intent = intent` na końcu `planHero`), więc warunek `h.intent !== 'avoid'` zawsze jest prawdziwy: wojownik może powtarzać `SAY.avoid` przy każdym planie (szansa 0,3), dopóki groźny potwór jest w pokoju. (`p5_ai.js: planHero`)
5. **`glance` dla stanu `rest` nieosiągalne**: stan `rest` kończy `updateHero` wcześniej. (`p5_ai.js: updateHero`)
6. **Gałąź klatki w `startFlee` jest martwa**: `addFear` nie woła `startFlee` dla uwięzionego, a inne wywołania dotyczą wolnych. Natomiast `partyFlee` ustawia `fleeing = true` także uwięzionym (wtedy nikt ich nie uwolni i zwykle giną w klatce). (`p3_flow.js: startFlee, partyFlee`)
7. **Mnożnik prędkości furii** bierze `h.rageUntil` wprost, nie `raging(h)`: w pokoju z Okowami furia rozpoczęta wcześniej wciąż przyspiesza, choć jej inne skutki są wyłączone. (`p5_ai.js: updateHero`)
8. **Komentarz a kod**: `seenShare` liczy pokój znany z plotki jako 0,3, komentarz mówi "half". Komentarz o zasadzce mówi "dwie pułapki", kod wymaga `ambushN >= 3`. (`p5_ai.js: partyThink`)
9. **`h.rtSaid`** tworzone w `spawnHero`, nieużywane (używane jest `fl.rtSaid`).
10. **Kwestie otwarcia przy spawnie się wypierają**: pierwszy bohater mówi kwestię wyłomu albo powrotu (prio 3), a potem kwestię otwarcia (prio 2), która jest odrzucana przez aktywny dymek; podobnie `hunters` + otwarcie (ta sama waga w ciągu 0,7 s). Słychać tylko pierwszą. (`p3_flow.js: spawnHero`)
11. **Sprzeciw lidera wobec łupu** (`lootStop`) to tylko słowa; nie zmienia decyzji. (`p5_ai.js: lootDecision`)
12. **`P.steal` nie spada**, gdy odejdą od serca (np. panika); kolejne podejście w tej samej fali zaczyna od poprzedniego postępu. (`p6_loop.js: step`)
13. **Wyjście z zapadni jako zgubiony** nie przechodzi przez `getLost`: brak decyzji lidera o szukaniu, `lostCallT` nieustawione (woła od razu). (`p4_traps.js: landFallen`)
14. **Jeden `P.rescueId`**: druga decyzja "ratujemy" nadpisuje pierwszą; pierwszy uwięziony traci ratownika. Gdy drużyna już wychodzi, `decideCage` oznacza decyzję bez kwestii i bez ratunku. (`p5_ai.js: decideCage`)
15. **Podważanie kraty** wymaga, żeby złodziej już stał w odległości <= 1,6 od drzwi (brak pracy "idź do kraty"); krata zamyka się na `4 * mods.gateDur` s, a podważenie trwa 3 s (2 s od poz. 6), więc ma znaczenie tylko przy dłuższym zamknięciu. (`p5_ai.js: partyThink`)
16. **Mag rzuca kule ognia, a kapłan się modli także w panice i w ucieczce** (brak sprawdzenia; rozproszenie sieci ma `!panicking`). (`p5_ai.js: heroAbilities`)
17. **`maybeDetour`** sprawdza korytarz tylko po stronie `d.b` drzwi (niepewne: sprawdź `p5_ai.js: maybeDetour`).
18. **Lider wybierany wg rangi (przedziału), nie poziomu**; komentarz mówi "najbardziej doświadczony". (`p5_ai.js: leader`)
19. **Rozbite meble wracają w następnej fali** (`setupFl` buduje `fl.objects` z `run.layout`), a wysadzona beczka prochu znika na stałe (usuwana z `run.layout`). Do potwierdzenia z autorem, sekcja 07. (`p5_ai.js: smashDone`)
20. **`hdist` liczy z pozycji z kosmetycznym przesunięciem** `(id % 3 - 1) * 0.14`. (`p3_flow.js: heroPos`)
21. **Odstęp przy liderze** (`gap`) porównywany z kosztem drogi z zagrożeniem, nie z liczbą kroków: przy znanej pułapce obok lidera nie zatrzymują się przy nim. (`p5_ai.js: planHero`)
22. **`safestRoom`** liczy w `threats` pułapki wg `roomOf(it.x, it.y)`; pułapki ścienne (pole ściany, `roomOf -1`) się nie liczą (tylko przez `danger`). (`p5_ai.js: safestRoom`)
23. **Łup rzadkości 2-3 jest zauważany przez ściany** (sama odległość 7/12), także z pokoi, których nie znają. Zamierzone wg komentarza ("rare from the next one, legendary across the dungeon").
24. **Drugi oddział dziedziczy** morale, naradzone rozwidlenia, przygotowane pokoje, "przebłądzoną" mgłę i decyzje o klatkach (`regroupAtDoor` zeruje tylko część pól).
25. **`becomeImpatient`**: gałąź `else` (plan `leave`) po bloku przepowiedni jest nieosiągalna, bo przepowiednia zawsze ustawia `heartKnown`.
26. **`talk()`** przy pustej załodze dodaje do kolejki wpisy z `id: undefined` (po cichu odrzucane).

## 6.9 Dla implementacji w Unity

### 6.9.1 Stałe AI w jednym miejscu

| Stała | Wartość | Źródło |
|---|---|---|
| myślenie drużyny | 0,25 s | `p6_loop.js: step` |
| `thinkT` po planie | `0.45 + rand*0.3` | `planHero` |
| `GATE_T` | 1,8 s | `p6_loop.js` |
| odstęp spawnu | 0,3 s; czekanie drugiego oddziału do 8 s | `step` |
| `S.waveTime` | 120 s; siatka bezpieczeństwa +60 s | `DEFAULTS.json`, `step` |
| `stealNeed` | `4 / 2^mods.glass`; więcej osób: `x(1 + 0.5*(n-1))`; fala 1 stop na 0,85 | `step` |
| obrażenia serca przy wyważaniu | `5/s` pierwszemu | `step` |
| progi ucieczki drużyny | `fearR > [0.75, 0.85, 0.95, 1][L.rank]`; morale < 0,2 przy L.rank < 2; połowa uciekających (min. 2) | `partyThink`, `startFlee` |
| odwrót | lider poz. 3+; `avgHp < 0.42` (w szturmie 0,32) albo ktoś < 0,22 bez kapłana; koniec przy `avgHp >= 0.7` i co najmniej 10 s odpoczynku, najpóźniej po 26 s (1.12.1); blokada 15 s | `partyThink` |
| odpoczynek | 4 HP/s, Sanktuarium x0,5 i koszmary 3,5/s | `updateHero` |
| szturm | `need = min(0.85, 0.5/0.6 + 0.1*clamp(greedRaw-1,0,2) - 0.1 elita)`; `tLimit = waveTime * min(0.6, 0.45 + 0.01*max(0, pokoje-6))`; `avgHp >= 0.5` | `partyThink` |
| narada | alternatywa `sc < best + 5`, dalej niż 5 pól; raz na pokój; co najmniej 6 s przerwy | `chooseTarget` |
| zwiad | 16 s; powrót przy hp < 0,45 | `chooseTarget`, `partyThink` |
| wybór celu | `d - 0.18*manhattan(wejście) + rand*1.5 + bonus(2 za pokój do przeszukania) - 3*rzadkość łupu (<= 6) - 4 Sezam` | `chooseTarget` |
| gubienie | rozdzielenie > 7 pól w innym pokoju przez 3 s, potem `lostChance`; mgła `0.22/s * max(0.35, 1 - 0.03*lvl)` (złodziej x0,6); brak drogi > 3 s i > 6 pól | `partyThink` |
| odnalezienie | < 4,5 (mgła 1,6) od lidera albo < 2,5 od głosu | `partyThink` |
| odpowiedź na wołanie | zasięg 14, bard 26; słyszy 7 s (bard woła: 8 s) | `answerLost`, `bardTick` |
| szukanie zgubionego | lider rangi 1+, `fearR < 0.6`, szansa 0,6; 12 s | `getLost` |
| zły skręt | `p = 0.05 + 0.02*(pokoje-6) + 0.25 mgła - 0.004*lvl - 0.03 złodziej`, max 0,4; 10 s, przerwa 15 s | `maybeDetour` |
| mgła lidera | `3 + 0.25*max(0, 8 - lvl/2)` s, raz na pokój | `partyThink` |
| ślizg | `0.33 x 0.55 (elita) x 0.6 (złodziej) x 1.3 (panika/ucieczka)` | `slipChance` |
| przygotowanie | lider poz. 3+; `roomThreat >= 3` w pierwszym innym pokoju na 5 polach; 2,4 s; bieg 6 s x1,25; przerwa 4 s | `checkPrep` i dalej |
| zasięg łupów (kroki) | 30 / 16 / mikstura dla rannego 14 / złodziej 11 / nowicjusz 9 / reszta 8 | `planHero` |
| decyzja o łupie | ważna 8 s; po nieudanym podniesieniu 68 s | `lootDecision`, `pickup` |
| czekanie na zbierającego | do 6 s, zbierający <= 8 od lidera | `partyThink` |
| czekanie na maruderów | maruder > 7; lider stoi 1,6 s, nie częściej niż co 3,6 s | `partyThink` |
| odstęp przy liderze | 2,5 (kapłan, mag 3,5) | `planHero` |
| wołanie o kapłana | < 40% HP, > 3 od kapłana, co 14 s | `partyThink` |
| podanie mikstury | przyjaciel < 30%, <= 2 pola, co 10 s | `partyThink` |
| klatka | ratunek: elita zawsze, inaczej `fearR < 0.6` i 0,5 (nowicjusz) / 0,8; uwalnianie 0,8 s (złodziej) / 1,8 s; czekanie na ratownika +8 s | `decideCage`, `planHero`, `cageEnds` |
| nowicjusz odłącza się | 0,004 na `partyThink`, 10 s, cel > 4 pola | `partyThink` |
| mowa | `SAY_GAP 0.3`, `SAYQ_LIFE [0, 1.4, 2.6, 4]`, `readT = clamp(1.1 + 0.042*len, 1.6, 3.4)`, earshot 7 pól lub ten sam obszar, kolejka bohatera 2 wpisy, kolejka drużyny przeterminowana po 10 s, ta sama waga co 0,7 s | `p3_flow.js` |
| small talk | co 7-13 s; odpowiedź 0,6 (pocieszenie) albo 0,55 (`CHAT_REPLY`) | `partyThink` |

### 6.9.2 Scenariusze testowe AI (uzupełnienie sekcji 09)

1. **Kolejność mowy**: drużyna 4 osób w jednym korytarzu, 3 spokojne kwestie naraz -> w zasięgu słuchu najwyżej jeden dymek naraz, odstęp co najmniej `SAY_GAP`; kwestia prio 4 wchodzi od razu.
2. **Głusza**: pułapka w Głuszy nie trafia do wiedzy; dymki to `…`/`…!`; ranny w Głuszy nie woła kapłana; wołanie zgubionego bez odpowiedzi.
3. **Fala 1 a serce**: pusty loch, fala 1 -> przy sercu `P.steal` zatrzymuje się na `0.85 * stealNeed()`, wszyscy przy sercu uciekają, plan `leave`.
4. **Lider-nowicjusz nie zarządza odwrotu**, lider poz. 3 przy `avgHp < 0.42` idzie do `safestRoom` i odpoczywa do 0,7 (co najmniej 10 s) albo najwyżej 26 s (1.12.1).
5. **Znane kolce na jedynej drodze**: weteran i tak przechodzi (koszt rośnie, ale droga istnieje), podnosi tarczę (wojownik), przyspiesza x1,3. Gdy istnieje objazd dłuższy o mniej niż dodatkowy koszt zagrożenia (`min(12, danger*3*avoid)` na pole), wybiera objazd.
6. **Krata**: lider bez drogi przez 1,2 s -> przy niezbadanych pokojach plan `explore` na 18 s (`gateReroute`), inaczej `gateWait`; złodziej przy kracie podnosi ją po 3 s.
7. **Klatka**: lider rangi 2 zawsze ratuje; ratownikiem jest złodziej (0,8 s); bez ratownika uwięziony ginie po czasie klatki (+8 s, gdy ratownik w drodze).
8. **Zgubiony**: w mgle, złodziej rzadziej; odpowiedź przychodzi od najbliższego w zasięgu 14 (bard 26); odnalezienie przy < 4,5 pola.
9. **Cierpliwość**: po 120 s bez przepowiedni plan `leave`, z przepowiednią serce znane i szturm bez omijania pułapek.
10. **Łupy**: dwóch chętnych na ten sam łup -> idzie jeden (roszczenie); lider czeka najwyżej 6 s; przeklęty łup przy kapłanie poz. 6+ nietknięty.
11. **Lód**: nowicjusz ślizga się z częstością ok. 0,33 na krok, nigdy dwa razy z rzędu, nie na serce ani na potwora.
12. **Ucieczka**: połowa drużyny (min. 2) ucieka -> `partyFlee`; reszta kolejki czeka do 8 s i wchodzi jako drugi oddział z 20% strachu.
