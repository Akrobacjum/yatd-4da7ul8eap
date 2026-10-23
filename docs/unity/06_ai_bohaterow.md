# 06. AI bohaterów i rozmowy

Ta sekcja opisuje "mózg" drużyny bohaterów z prototypu (Prototype 1.12.1, uzupełniane do 1.17.1): kto prowadzi, dokąd idą, co wiedzą, kiedy biorą łup, kiedy się wycofują, szturmują serce albo uciekają, jak każda klasa używa swoich umiejętności i przedmiotów, oraz cały system mowy (dymki, kolejki, rozmowy, katalog kluczy `SAY`). Od 1.17 także: co kto widzi i słyszy (percepcja, plan każdego bohatera, wieści, 6.3.13), ciekawość (rozglądanie się po pokoju i dźwięki zza ściany, 6.3.3a) i narada na końcu cierpliwości (6.3.10a). Od 1.17.1: pamięć bohatera (co widział albo poczuł w tej fali) i dopasowanie kwestii do niej (6.7.10). Od 1.18-1.24 (stan Prototype 1.24): karty zachowań bohaterów (6.3.14), Rozłam: druga grupa, bunt, foch (6.10, 1.19), ekwipunek w zachowaniu (6.11, 1.20), więzi i dramaty (6.12, 1.21), finał fali (6.13, 1.22), Nemezis i pamięć poległych (6.14, 1.23), wyczerpanie na końcu fali i częstość zdarzeń (6.15, 1.24).

Źródła: `p5_ai.js` (w całości), z `p3_flow.js` części: mowa (`say`, `sayTick`, `earshot`...), spawn i start fali (`spawnHero`, `regroupAtDoor`, `becomeImpatient`, `goHome`, `heroExit`), strach w zachowaniu (`addFear`, `startFlee`, `partyFlee`, `dropCrystal`, `crystalReturns`, `kill`), łupy (`noticeLoot`, `pickup`, `giveItem`, `dropItem`, `itemValue`, `curse`); z `p6_loop.js`: `step`, `takeCrystal`, `stealNeed`, `GATE_T`; z `p2_state_map.js`: przejezdność, wiedza o mapie, `bfs`; z `p4_traps.js`: `learnTrap`, `rebuildThreat`, `disarmSpots`, klatka, zapadnia, potwory (tylko to, co dotyczy decyzji bohaterów); z `p1_config.js`: `nameGen`, `nameFill`, `pickS` i tabele kwestii (od 1.17.1 także `LINE_NEEDS`).

Dane (katalog `spec/data/`): `SAY.json`, `CHAT_REPLY.json`, `HEROES.json`, `HERO_TRAITS.json`, `levelStats_1_30.json`, `LEADER_ORDER.json`, `SMASHABLE_OBJ.json`, `HITEMS.json`, `LOOT_GREED.json`, `LOOT_KIND.json`, `ITEMS.json`, `DRIFT.json`, `SCARE.json`, `CURSED.json`, `DISARMABLE.json`, `BUILDINGS.json`, `DEFAULTS.json`, `GZ.json`, od 1.17.1 `LINE_NEEDS.json`.

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
| `goingOut()` | `P.plan` to `'flee'`, `'leave'` albo `'escape'` (plan drużyny, czyli przywódcy) | `p5_ai.js` |
| `planOf(h)` | 1.17: plan, który zna ten bohater: `h.plan \|\| P.plan` (6.3.13) | `p5_ai.js` |
| `goingOutH(h)` | 1.17: `planOf(h)` to `'flee'`, `'leave'` albo `'escape'` | `p5_ai.js` |
| `exiting(h)` | `h.fleeing` albo `h.crystal` albo `h.goHome` (1.17: przegłosowany na naradzie wraca sam) albo `goingOutH(h)` (do 1.16 `goingOut()`): bohater idzie do wyjścia | `p5_ai.js` |
| `samePlace(a, b)` | ten sam pokój albo korytarz (`roomOf(tx, ty)` równe i >= 0) albo odległość <= 3,5 pola | `p5_ai.js` |
| `canSee(o, v)` | 1.17: `o` widzi to, co dzieje się z `v`: żaden nie spada w zapadni i `samePlace(o, v)` | `p5_ai.js` |
| `canHear(o, v)` | 1.17: `o` słyszy zwykły głos `v`: żaden nie spada, żaden nie stoi w Głuszy (`hushAt`), `earshot(o, v)` (6.7.4) | `p5_ai.js` |
| `canHearShout(o, v)` | 1.17: `o` słyszy krzyk `v`: `canHear` albo do 14 kroków po polach przejezdnych (`stepsWithin`, prosta odległość najwyżej 14), żaden w Głuszy ani w pokoju z Kamieniem wyjcem | `p5_ai.js` |
| `perceives(o, v, shout)` | 1.17: `o === v` albo `canSee` albo (`shout` ? `canHearShout` : `canHear`) | `p5_ai.js` |
| `groupOf(L)` | 1.17: grupa przywódcy: `L` i żywi, nie zgubieni, nie w klatce, którzy go widzą albo słyszą (`canSee`/`canHear`) | `p5_ai.js` |
| `heartP()` | 1.17: drużyna (przywódca) wie, gdzie jest serce: `fl.heartKnown && P.heartSaid` (6.3.13) | `p5_ai.js` |
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
| `inG2(h)` | 1.19: bohater należy do drugiej grupy (`P.g2.ids`) | `p5_ai.js` |
| `g2Leader()` | 1.19: przywódca drugiej grupy (wybiera nowego, gdy obecny odpadł; 6.10) | `p5_ai.js` |
| `groupLeaderOf(h)` | 1.19: przywódca grupy bohatera: `inG2(h) ? g2Leader() : leader()` | `p5_ai.js` |
| `splitting(h)` | zwiad, partner, wypad nowicjusza, od 1.19 także druga grupa (Groza `GZ.split`) | `p5_ai.js` |
| `bondOf(h)` | 1.21: partner więzi, gdy więź jest wzajemna (także martwy); `bondType(h, t)` | `p5_ai.js` |
| `calmFor(o)` | 1.21: żyje, w lochu, nie zgubiony, nie w klatce, bez paniki, nie ucieka | `p5_ai.js` |
| `carrierOf()` | 1.22: niosący kryształ (`P.carrierId`, żywy, w lochu) | `p5_ai.js` |
| `standing(h)`, `sacrificing(h)` | 1.22: trwa jego ostatni bastion / poświęcenie | `p5_ai.js` |
| `cheb(ax, ay, bx, by)` | 1.22: odległość Czebyszewa | `p5_ai.js` |
| `nemHold(h)` | 1.23: Nemezis powyżej 15% HP (nie panikuje, nie ucieka ze strachu) | `p3_flow.js` |

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
  if !fl.gateOpen && fl.time >= GATE_T (1.8): fl.gateOpen = true; przywódca (1.17: leader(), wcześniej alive()[0]) mówi SAY.gate
  if fl.gateOpen:
    for h of fl.heroes (nie dead, nie fled): updateHero(h, dt)   // tu jest planHero i ruch
    checkTick()                                                  // skill checki (sekcja 05)
  monstersTick(dt)
  kradzież kryształu przy sercu (6.3.9); 1.17: nikt przy sercu -> P.steal maleje o 0.5/s
  if !fl.fearless && fl.ending === null && fl.patT >= S.waveTime: becomeImpatient()   // 6.3.10; od 1.17 otwiera naradę (6.3.10a)
  if fl.ending === null && !fl.exhausted && fl.patT >= S.waveTime + 60: waveExhausted()     // 1.24 (6.15); do 1.23: każdy żywy -> heroExit
  if fl.ending === null && fl.patT >= S.waveTime + 150: waveForceOut()                     // 1.24: prawdziwa siatka bezpieczeństwa
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
| pamięć: co kto widzi (1.17.1) | co `0.25` s (`sawSweep` na początku `perceiveThink`), do tego przy wejściu do pokoju, odpaleniu, ranie i zdarzeniach (6.7.10) | `p5_ai.js: sawSweep` |
| wołanie zgubionego | pierwsze `5` s po zgubieniu, potem co `6 + 3*rand` s | `p5_ai.js: getLost, partyThink` |
| przywódca zauważa brak zgubionego (1.17) | najwcześniej `4` s po zgubieniu, gdy go nie słyszy; szukanie do `14` s (do 1.16: decyzja od razu, `12` s) | `p5_ai.js: perceiveThink, missLost` |
| wieść o śmierci (1.17) | co `0.25` s najwyżej jedna para "wie - nie wie" na każdą śmierć | `p5_ai.js: perceiveThink` |
| narada po cierpliwości (1.17) | czeka na ciszę do `4` s, bez grupy po `8` s do domu; "jeszcze chwila" = `30` s cierpliwości, raz na falę | `p5_ai.js: councilThink, councilDone` |
| rozglądanie się (1.17) | rzut `0.9` s po wejściu przywódcy do pokoju (raz na pokój); trwa najwyżej `10` s, oglądanie rzeczy `1.5-3` s, potem przerwa `18` s | `p5_ai.js: lookRoll, lookThink` |
| dźwięk zza ściany (1.17) | najwyżej jeden na `10` s (`P.soundCd`); przywódca pamięta go `25` s | `p5_ai.js: hearFar, chooseTarget` |
| wołanie o kapłana | najwyżej co `14` s na rannego; od 1.17 kapłan idzie najpierw do wołającego przez `10` s (`healForUntil`) | `p5_ai.js: partyThink` |
| ta sama kwestia drużyny (`partySay`) | najwyżej co `5` s na klucz | `p5_ai.js: partySay` |
| kapłan | rozgląda się co `1` s (`h.cast`), modlitwa trwa `3` s; start `cast = 1.5` | `p5_ai.js: heroAbilities` |
| mag | kula ognia `cast = 4` s, bez celu `0.5` s; rozproszenie sieci co `8` s; start `cast = 2` | `p5_ai.js: heroAbilities` |
| bard | zawołanie zgubionych co `9` s (`callCd`, start `0`); pieśń co `16` s (`songCd`, start `6`; `6` gdy zagłuszył ją Kamień wyjec) | `p5_ai.js: bardTick` |
| podanie mikstury | najwyżej co `10` s na dającego | `p5_ai.js: partyThink` |
| objazd (zły skręt) | trwa do `10` s, potem przerwa `15` s | `p5_ai.js: maybeDetour` |
| przygotowanie przed groźnym pokojem | od 1.12.1 `max(3, talkLen)` s (do 1.12: `2.4` s), potem przerwa `4` s, bieg `6` s | `p5_ai.js: startPrep, finishPrep` |
| blokada odwrotu po odpoczynku | `15` s | `p5_ai.js: partyThink` |
| cierpliwość fali | `S.waveTime` = `120` s (suwak 60-300); od 1.24 wyczerpanie +`60` s, siatka bezpieczeństwa +`150` s (do 1.23 siatka +`60` s) | `p6_loop.js: step` |
| druga grupa (1.19) | rozejście w `20` s albo nic z tego; scalenie najwcześniej po `8` s; zwiad do `40` s (foch i bunt `25` s) | `p5_ai.js: g2Start, g2Think` |
| bunt (1.19, 1.24) | od `20` s fali, `25%/s`, raz na falę | `p5_ai.js: mutinyThink` |
| niespokojny rozłam (1.19, 1.24) | od `15` s, `6%/s`, najwyżej 2 rozłamy na falę | `p5_ai.js: riftThink` |
| dzielenie się (1.20) | co `1` s; odnowienie `8` s na bohatera, `4` s na drużynę, `10` s po podaniu amuletu | `p5_ai.js: shareThink` |
| więzi (1.21) | pierwsze słowo pary `4-20` s po wejściu (porzucone po `25` s); w small talku raz na `30` s; mistrz `25` s; rywal `12` s (1.24) | `p5_ai.js: bondThink, bondTalk, mentorWatch, rivalJab` |
| zakład (1.21, 1.24) | od `8` s, raz na falę, rozglądanie raz na sekundę, zakład `8` s, odwołany po `12` s | `p5_ai.js: betThink, betStart, betEnd` |
| finał (1.22) | przekazanie co `6` s (najwyżej 2), bastion `8` s, poświęcenie `6 + 0,6/krok` s, "ty pierwszy" co `40` s (najwyżej 2), wycofanie rannego `4` s | `p5_ai.js: finalThink` (6.13) |
| Nemezis (1.23) | odpowiedź `3,5` s po wejściu; uraza `25` s; rozmowa o nagrodzie `6-60` s; przechwałka co `10` s (najwyżej 2) | `p5_ai.js: nemesisThink` (6.14) |

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
| `heartSaid` | `false` | czy lider już skomentował znalezienie serca; od 1.17 to też znak, że przywódca wie, gdzie jest serce (`heartP()`, 6.3.13): pada dopiero, gdy przywódca widzi albo słyszy tego, kto zobaczył serce, albo sam stoi w jego pokoju |
| `queueSay` | `[]` | kolejka kwestii drużyny `{id, text, at, prio?, dur?, how?, cv?, late?}` (6.7.3) |
| `prepped` | `Set` | pokoje, przed którymi już się przygotowywali |
| `prep` | `null` | trwające przygotowanie `{room, until, pr, mg, th, wr}` |
| `prepCd` | `0` | przerwa między przygotowaniami |
| `rushUntil` | `-1` | do kiedy trwa bieg przez groźny pokój (+25% prędkości) |
| `searchId`, `searchUntil` | `-1`, `-1` | zgubiony, którego lider szuka, i do kiedy (od 1.17 `time + 14`) |
| `detour`, `detourCd` | `null`, `0` | zły skręt / błądzenie we mgle `{goal, until}` i przerwa |
| `wantSearch` | `true` | czy jeszcze przeszukują znane pokoje (łupy) |
| `council` | `null` | 1.17: trwająca narada na końcu cierpliwości `{stage, t0, res?, endAt?, votes?, leave?}`, `stage` = `'wait'` albo `'talk'` (6.3.10a) |
| `councilMore` | `false` | 1.17: "jeszcze chwila" już wybrana w tej fali (drugi raz nie ma tej opcji) |
| `look` | `null` | 1.17: trwające rozglądanie się `{room, t0, until, ids}` (6.3.3a) |
| `lookCd` | `0` | 1.17: przed tym czasem nie ma nowego rozglądania (`time + 18` po końcu poprzedniego) |
| `sound` | `null` | 1.17: dźwięk zza ściany, który słyszał przywódca `{x, y, t, room}` (wpływa na wybór celu przez 25 s) |
| `soundCd` | `0` | 1.17: przed tym czasem `hearFar` nic nie robi (`time + 10`) |
| `g2` | brak | 1.19: druga grupa `{leaderId, ids (Set), plan, target, born, why, until, said, apart?, partner?}` (6.10) |
| `mutinyDone`, `mutinyHome`, `sulkAfter`, `convoNot` | brak | 1.19: bunt w tej fali już był; kiedy po wygranym buncie idą do domu; kto i kiedy odchodzi obrażony `{id, at}`; kogo wykluczyć z rozmowy po kwestii `{key, ids}` |
| `shareT`, `shareCd`, `gifts`, `lootedDead`, `lootRivals`, `rivalSeen` | brak | 1.20: zegar i odnowienie dzielenia się, haki dla 1.21-1.22 (6.11) |
| `bondAt`, `bondT`, `quarrels`, `betDone`, `betTried` | brak | 1.21: pierwsze słowo par, ostatnie słowo pary, pary po kłótni, zakład w fali, próby zakładu (6.12) |
| `hurt` | brak | 1.22: `Map` pułapka -> Set id bohaterów, których zraniła w tej fali (`damageRaw`; "nie tędy") |
| `fin` | brak | 1.22: stan finału fali (`finOf`, 6.13) |
| `nem` | brak | 1.23: stan Nemezis w fali (`nemOf`, 6.14) |

Pola dopisywane w trakcie: `rescuerId` (kto uwalnia), `fogDone` (pokoje mgły już "przebłądzone" przez lidera), `blockT`, `blockSaid`, `liftT` (zamknięta krata), `gateDetourUntil` (objazd przez kratę), `lootClaim` (Map: pole łupu -> id bohatera), `lootWaitId`, `lootWaitT` (lider czeka na zbierającego), `ambushSaid`, `loggedPlan` (do logu, tylko prototyp). Od 1.17 także: `lookAsk` (`{room, at}`: przywódca wszedł do nowego pokoju, rzut na rozglądanie po 0,9 s), `lookRolled` (Set pokoi, w których już rzucano), `seen` (obiekt `id -> {x, y, t}`: gdzie przywódca ostatnio widział albo słyszał każdego), `searchGoal` (pole, do którego przywódca wraca po zgubionego: ostatnie znane miejsce), `rescueQ` (lista uwięzionych czekających na ratunek, gdy ratują już kogoś innego), `lastL` (id przywódcy z poprzedniego `partyThink`; nowy przywódca przynosi swój plan, 6.3.13), `queueCur` i `sayingQ` (kolejka w trakcie obsługi i kwestia właśnie mówiona, 6.7.3).

`regroupAtDoor` zeruje tylko: `plan = 'explore'`, `leaderId`, `target`, `prep`, `steal`, `detour`, `searchId` (oraz `fl.holdT = 0`, `fl.secondGroup++`). Morale, `junctions`, `hesitated`, `prepped`, `fogDone`, `cageDecided`, `rescueId` przechodzą na drugą grupę (od 1.17 także `council`, `councilMore`, `lookRolled`, `lookCd`, `seen`, `rescueQ`).

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
| 1.17.1 | `saw` (`Set` tagów: co widział albo poczuł w tej fali; tworzony w `spawnHero`), `sawAt` (`Map` tag -> czas pierwszego zobaczenia, przy pierwszym `sawAdd`); 6.7.10 |
| 1.17 (dopisywane w trakcie) | `plan` (plan drużyny, który zna ten bohater; brak = `P.plan`, 6.3.13), `goHome` (przegłosowany na naradzie wraca sam do domu, 6.3.10a), `look` (`{kind, sub, x, y, st, it, dwell, at, done}`: co ogląda przy rozglądaniu się, 6.3.3a), `lostAt`, `lostNoticed` (kiedy się zgubił i czy przywódca już to zauważył), `cagedAt` (kiedy zamknęła się klatka), `healFor`, `healForUntil` (kapłan: kto go wołał i do kiedy idzie najpierw do niego), `avoidM` (wojownik: potwór, którego omijanie już skomentował) |

`h.rtSaid` jest tworzone, ale nieużywane (kod używa `fl.rtSaid`), patrz 6.8.

### 6.1.5 Stany bohatera `h.state`

| Stan | Znaczenie | Wejście | Wyjście |
|---|---|---|---|
| `walk` | idzie ścieżką / planuje | domyślny | inne stany |
| `wait` | stoi chwilę (`timer`) | brak ścieżki (`0.4` s), blisko lidera (`0.35` s), pole rozbrajane przez innego (`0.4` s), od 1.17 ogląda rzecz przy rozglądaniu się (do `0.5` s naraz, 6.3.3a) | `timer <= 0` -> `walk` + `needPlan` |
| `talk` | drużyna stoi (rozmowa, narada, przygotowanie) albo lider czeka | `fl.time < P.talkUntil` lub (lider i `fl.time < P.waitUntil`); wahanie lidera | koniec obu czasów albo `exiting` |
| `rest` | odpoczynek (odwrót) albo drzemka w Sanktuarium | w pokoju odwrotu; `nap` | plan nie `retreat` i drzemka minęła; panika; `exiting` |
| `fight` | walka wręcz z potworem `h.foe` | następne pole ścieżki zajęte przez żywego potwora nie-unoszącego się | potwór martwy/zniknął, `exiting` |
| `disarm` | rozbraja pułapkę albo zdejmuje klątwę z portretu (`h.item`, `timer`) | `disarmJob`/`blessJob` na miejscu | koniec czasu; `exiting`; pułapka odpaliła |
| `smash` | barbarzyńca rąbie (`h.smashIt`, `timer`) | `smashJob` na miejscu | koniec; `exiting`, panika, Okowy |
| `free` | wyłamuje kratę klatki przyjaciela (`h.freeT`, `timer`) | ratujący obok klatki | koniec; uwięziony wolny; `exiting` |
| `boss` | przy sercu, wyważa kryształ | `onEnter` przy sercu w planie `assault` | plan nie `assault`, `exiting`, panika |
| `caged` | w klatce | `p4_traps.js: cageHero` | `freeCaged`, `cageEnds` |
| `fallen` | spada przez zapadnię (`gone = true`) | `p4_traps.js: fall` | `landFallen` po `fallUntil` |
| `loot` | 1.20: klęczy przy ciele i przeszukuje je (`h.lootIt`, `timer` 1,0 s, złodziej 0,5 s) | `pickup` stosu z `body` | koniec: `bodyLoot`; wyjście, panika, ucieczka przerywają (nic nie bierze); rana nie |

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
   +--- startFlee / partyFlee / takeCrystal / becomeImpatient / goHome / councilDone: rest/talk/wait/boss(/disarm/free) -> walk
```

### 6.1.6 Intencje `h.intent`

Intencja to "po co idzie" (ustawiana w `planHero`, czytana przez innych):

| Intencja | Kto | Cel ścieżki |
|---|---|---|
| `lead` | lider przy eksploracji | `P.target` |
| `heart` | lider w `assault`, każdy przy `fl.fearless && planOf(h) === 'assault'` | `heartGoal()` |
| `detour` | lider w objeździe / błądzeniu we mgle | `P.detour.goal` |
| `search` | lider szuka zgubionego | od 1.17 `P.searchGoal` (gdzie go ostatnio widział), a gdy go słyszy, jego pole; do 1.16 zawsze bieżące pole zgubionego |
| `look` | 1.17: ogląda coś przy rozglądaniu się (6.3.3a) | pole obok rzeczy (`h.look.st`) |
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
| `pry` | 1.20: z łomem albo złodziej idzie do zamkniętej kraty, gdy drużyna czeka | pole przy kracie |
| `escort` | 1.22: strażnik niosącego kryształ (6.13.1) | `escortGoal` |
| `first` | 1.22: wysłany "ty pierwszy" do pokoju z pułapką (6.13.5) | `firstInto.goal` |
| `lead` dla przywódcy drugiej grupy, `rescue`, `search` w ratunku | 1.19, 1.21: `g2Goal`, `rescueJob` (6.10, 6.12.4) | |

### 6.1.7 Plany drużyny `P.plan`

| Plan | Znaczenie |
|---|---|
| `explore` | szukają serca i łupów; lider prowadzi do `P.target` |
| `assault` | idą do serca i wyważają kryształ |
| `retreat` | idą do najbezpieczniejszego pokoju i odpoczywają |
| `flee` | cała drużyna ucieka (strach) |
| `escape` | mają kryształ: wszyscy do wyjścia |
| `leave` | koniec cierpliwości (narada zdecydowała "do domu" albo nie było wyboru), serce ich odepchnęło albo (1.24) wyczerpanie: wracają do domu |
| `regroup`, `rescue` | 1.19, 1.21: tylko plan drugiej grupy (`P.g2.plan`): wracają do reszty / idą po partnera (6.10, 6.12.4) |

```
explore --(serce znane przywódcy: heartP(), przeszukali dość albo minął limit, avgHp grupy >= 0.5)--> assault
explore --(nic do odkrycia i heartP())--> assault
assault --(krata zamknięta, jest co przeszukać)--> explore (gateDetourUntil) --(koniec)--> assault
explore/assault --(avgHp grupy nisko, lider poz. 3+)--> retreat --(avgHp >= 0.7 i >= 10 s odpoczynku, albo 26 s; 1.12.1)--> assault|explore
assault --(wyważyli kryształ: takeCrystal)--> escape
escape --(niosący zginął, grupa przywódcy odważna i spokojna)--> assault ; (inaczej) --> flee
dowolny nie-wyjściowy --(strach grupy przywódcy, morale, połowa grupy ucieka)--> flee
flee --(drugi oddział wchodzi: regroupAtDoor)--> explore
dowolny --(cierpliwość: becomeImpatient)--> narada (1.17, 6.3.10a): leave | assault (szturm) | bez zmiany (+30 s)
         ; bez wyboru (serce nieznane i +30 s już było) --> leave ; bohater z przepowiedni --> assault
assault, fala 1 --(serce odpycha)--> leave
nowy przywódca (1.17) --(miał inny plan, w lochu są jeszcze inni, kryształu w tej fali nie skradziono)--> jego plan (6.3.13)
```

`flee`, `escape`, `leave` to plany "wyjściowe" (`goingOut()`): w nich `partyThink` nie zmienia już planu (poza `regroupAtDoor`, `crystalReturns` i, od 1.17, nowym przywódcą z innym planem).

**Plan drużyny a plan bohatera (1.17).** `P.plan` to plan przywódcy i tych, którzy go słyszą. Każdy bohater ma własne `h.plan` (`planOf(h)`): dostaje plan drużyny, gdy widzi albo słyszy przywódcę (`perceiveThink`, co `partyThink`), a krzyk (ucieczka, kryształ) sięga 14 kroków. Kto nie słyszał zmiany, robi dalej to, co robił, aż dołączy. Wyjście (`exiting`), odwrót i szturm w `planHero` czytają `planOf(h)`. Szczegóły: 6.3.13.

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

- `Core/AI/PartyBrain` (odpowiednik `partyThink`, `leader`, `chooseTarget`, `decideCage`, `checkPrep/startPrep/finishPrep`, `maybeDetour`, `getLost`, `answerLost`; od 1.17 także `councilThink/councilVote/councilDone`, `lookRoll/lookThink`, `hearFar`, `missLost`), `Core/AI/Perception` (1.17: `canSee`, `canHear`, `canHearShout`, `perceives`, `groupOf`, `perceiveThink`, wieści o śmierci; jedno miejsce, które odpowiada na pytanie "czy on o tym wie"), `Core/AI/HeroBrain` (`planHero`, prace klasowe, `updateHero`, `onEnter`, `heroAbilities`, `bardTick`), `Core/AI/Pathfinder` (`bfs`, `pathFrom`, `frontier`, mapa zagrożeń), `Core/Speech/SpeechSystem` (`say`, `sayTick`, `earshot`, kolejki, small talk, katalog kluczy). Czysty C#, bez MonoBehaviour (sekcja 02).
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
   h.shieldUpUntil = time + 2.5; h.shieldCd = time + h.R.shieldCd
   (h jest liderem && !exiting(h) && h.intent in (lead, heart, detour)) ? SAY.shieldLead : SAY.shield (2)    // 1.17 (6.5.1)
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
1.17.1: if changed: sawRoom(h, r)                                // co widzi, wchodząc (6.7.10), przed kwestiami pokoju
if r >= 0 && fl.rooms[r].kind === 'room':
   if !R.visited: R.visited = true
   if R.rt && !exiting(h) && r nie w fl.rtSaid: fl.rtSaid.add(r); say(h, SAY[RT_SAY[rt]], 3)   // pierwszy w pokoju z charakterem
   1.17.1: if SAY.rkEnter['k_' + R.rk] && !exiting(h) && r nie w fl.rkSaid:                   // pierwszy w pokoju z komnatą
      fl.rkSaid.add(r); stats.rkEnter++; say(h, SAY.rkEnter['k_' + R.rk], R.rt ? 2 : 3)
   if changed && h jest liderem: maybeDetour(h, r)                                              // 6.2.11
      1.17: if !P.detour: P.lookAsk = {room: r, at: time + 0.9}                                  // rzut na rozglądanie się (6.3.3a)
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

`RT_SAY` (`p5_ai.js`): `fog: 'rtFog', swamp: 'rtSwamp', grotto: 'rtGrotto', crypt: 'rtCrypt', vault: 'rtVault', haven: 'rtHaven', gears: 'rtGears', hush: 'rtHush', ice: 'rtIce'`. `fl.rtSaid` i (1.17.1) `fl.rkSaid` żyją jedną falę.

Kwestia komnaty (1.17.1, `SAY.rkEnter`, 9 na komnatę) pada bez warunku `changed`, jak kwestia efektu, i nie zależy od pamięci (kwestie `rkEnter` nie mają tagów w `LINE_NEEDS`). W pokoju z efektem i komnatą ma priorytet 2 po kwestii efektu z priorytetem 3: gdy ten sam bohater właśnie dostał dymek efektu, `say` odrzuca kwestię komnaty (aktywny dymek o wyższym priorytecie, 6.7.2), a `fl.rkSaid` i `stats.rkEnter` są już ustawione, więc w takim pokoju kwestia komnaty zwykle przepada (6.8 #35).

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
elif exiting(h):                         intent = h.crystal ? 'carry' : 'exit'; goal = exitG()     (1.17: wg planu bohatera i goHome)
elif fl.fearless && planOf(h) === 'assault': intent 'heart'; goal = heartGoal()                   (1.17: planOf, było P.plan)
elif planOf(h) === 'retreat' && P.plan === 'retreat' && !h.lost && !onScout(h):     (1.16: zwiadowca z postoju nie siada; 1.17: tylko ten, kto wie o odwrocie)
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
     1  ratunek z klatki: P.rescueId >= 0 i to nie on (6.5.9; 1.17: ratownik tylko spośród tych, którzy słyszą klatkę albo przywódcę)
     2  L !== h && L.state === 'fight' && L.foe żywy i !DRIFT && !onScout(h) && canHear(h, L)   -> {fight, pole L.foe}
        (pomagają liderowi; 1.17: tylko ci, którzy słyszą walkę, i nie zwiadowca ani jego partner)
     3  kapłan: 1.17: najpierw ten, kto go wołał (h.healFor, do healForUntil = 10 s od wołania), jeśli żyje, hp < 0.5 max
        i hdist > 2.5, z B().dist <= 20; inaczej najsłabszy (wg hp/max) inny z hp < 0.5 max i hdist > 2.5, z B().dist <= 12 -> {heal, jego pole}
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
     13 rozglądanie się (1.17): h.look -> lookJob(h, B) (6.3.3a): stoi i ogląda -> intent 'look', path [], state 'wait',
        timer = min(0.5, reszta oglądania), return; idzie -> {look, pole obok rzeczy}; nic (koniec, za daleko) -> dalej
   if job: intent, goal = job
   elif h === L:                                  // lider
      dt = P.detour
      if dt && (time > dt.until || tIdx(h) === dt.goal || B().dist[dt.goal] < 0): P.detour = null; jeśli doszedł do celu: SAY.detourBack (2)
      sc = P.searchId >= 0 ? byId(P.searchId) : null
      if P.detour:                                   intent 'detour'; goal = P.detour.goal     // reszta idzie za nim
      elif sc && sc.lost:                            // 1.17: wraca tam, gdzie go ostatnio widział, a gdy go słyszy, idzie na głos
         g = canHear(h, sc) ? tIdx(sc) : P.searchGoal
         if g >= 0 && B().dist[g] >= 0 && g !== tIdx(h): intent 'search'; goal = g
         else: if g === tIdx(h): P.searchId = -1; kolejka h: SAY.searchFail (+0.2, prio 2)    // doszedł, a tu nikogo
               intent 'lead'; goal = P.target
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

Do 1.16 lider szukał zgubionego na jego bieżącym polu, odświeżanym przy każdym planie (jak GPS), i decydował o szukaniu w chwili zgubienia; od 1.17 decyzja zapada, gdy go zauważy (6.2.10), a celem jest ostatnie miejsce, w którym go widział albo słyszał.

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
h.lost = true; h.sepRolled = true; h.lostT = 0; h.lostCallT = time + 5; h.needPlan = true
h.split -> split = false, stats.splitLost++ (1.16); h.wanderUntil = -1; stats.gotLost++; SAY.lost (3)
h.lostAt = time; h.lostNoticed = false                    // 1.17: decyzji przywódcy jeszcze nie ma
```

Do 1.16 `getLost` od razu decydował za przywódcę (szukamy albo nie), choć przywódca był zwykle pokoje dalej i nie mógł nic wiedzieć. Od 1.17 przywódca **zauważa brak** w `perceiveThink` (6.3.13): gdy od zgubienia minęły co najmniej 4 s, zgubiony nie został jeszcze zauważony, a przywódca go teraz nie słyszy (`!canHear(L, h)`), woła **`missLost(h, L)`**:
```
h.lostNoticed = true
if !L || L === h || P.searchId >= 0 || goingOut() || fl.fearless: return
fearR = średnia fear/courage grupy przywódcy (groupOf(L))
ls = P.seen[h.id]                                       // gdzie przywódca ostatnio go widział albo słyszał
if L.rank >= 1 && fearR < 0.6 && rand < 0.6 && ls:
   P.searchId = h.id; P.searchUntil = time + 14; P.searchGoal = pole ls; stats.searches++
   kolejka: L mówi SAY.searchLost z imieniem (+0.3 s); L.needPlan            // wracamy po niego
else: kolejka: L mówi SAY.leaveLost z imieniem (+0.3 s)                      // sam trafi
```
Przywódca idzie do `P.searchGoal`, a gdy usłyszy zgubionego, na jego głos (6.2.9). Gdy stanie na `P.searchGoal`, a zgubionego tam nie ma: `SAY.searchFail`, koniec szukania. Zgubiony, który wyszedł z zapadni (`landFallen`), nie ma `lostAt`, więc jest zauważany od razu przy pierwszym `partyThink`, w którym przywódca go nie słyszy (o ile `lostNoticed` nie zostało prawdą z wcześniejszego zgubienia w tej fali, bo odnalezienie go nie zeruje).

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

**Szukanie zgubionego przez lidera** kończy się (`P.searchId = -1`), gdy szukany nie istnieje, nie jest już zgubiony, nie żyje, zbiegł, minęło `searchUntil` albo drużyna wychodzi; od 1.17 także, gdy lider dojdzie do ostatniego znanego miejsca i nikogo tam nie ma (`SAY.searchFail`).

**Lider błądzi we mgle** (`partyThink`, Prototype 1.01): gdy lider (nie wychodzą, nie `fearless`, brak `P.detour`) jest w pokoju typu `fog`, raz na pokój mgły na falę (`P.fogDone`): cel = losowe `walkable` pole tego pokoju w odległości co najmniej 2 od lidera, `P.detour = {goal, until: time + 3 + 0.25*max(0, 8 - L.lvl/2)}`, lider mówi `SAY.fogGrope` (prio 3; do 1.16 trzy kwestie zaszyte w kodzie, 6.7.8). Cała drużyna idzie za nim (6.2.12).

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

**Widać to**: turkusowy przerywany pierścień pod bohaterem zamiast pomarańczowego samotności (`p7_draw.js`), znak `›` w pasku bohaterów, w karcie bohatera stan `na zwiadzie`, w podsumowaniu fali wiersz `Zwiad (celowo osobno)` (okno "Skąd Esencja"), wiersz `Osobno: na zwiadzie / sam / zgubiony (s)` w `statsTable` (ta funkcja nie jest nigdzie wołana, więc wiersza w grze nie widać, sekcja 08), ciekawostka `Rozdzieleni` (gdy co najmniej 4 s zwiadu), strach ze źródła `'split'` opisany jako `rozdzielenie (zwiad)`.

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
goal = ((L.state === 'boss' || planOf(h) === 'assault') && !P.detour && P.searchId < 0) ? heartGoal() : lt     // 1.17: planOf
if goal < 0: goal = lt
```

- Gdy lider wyważa kryształ albo bohater zna plan `assault`, idzie od razu do serca (bez objazdu i szukania), i nie zatrzymuje się przy liderze, gdy ten jest w stanie `boss`.
- Idący za liderem zna zawsze jego **bieżące** pole, także gdy go nie widzi ani nie słyszy (pokoje dalej). To zostało w 1.17 jak było (jak GPS); łapie go tylko rzut na zgubienie (6.2.10). Znane ograniczenie, sekcja 11.
- Lider czeka na maruderów: `partyThink` (gdy plan nie `retreat`, nie `fearless`, nie wychodzą, `L.R.coord`): `far` = inni (nie zgubieni, nie na zwiadzie: `!onScout`, nie panikują, nie walczą, nie w klatce, od 1.17 nie wychodzą: `!exiting`, np. uciekający albo przegłosowany wracający sam) z `hdist > 7`; jeśli są i `time > P.waitUntil + 2`: `P.waitUntil = time + 1.6`, `partySay('regroup', 2)`. Lider w tym czasie stoi w stanie `talk` (6.1.8).
- Nowicjusz odłącza się sam (`partyThink`, plan `explore`): dla każdego rangi 0, nie lidera, nie zgubionego, nie wędrującego, nie w klatce, z szansą `0.004` na wywołanie (`partyThink` 4 razy na sekundę, ok. 1,6% na sekundę): losowe pole granicy dalej niż 4 od niego, `wanderUntil = time + 10`, `SAY.wander` (2), od 1.16 `startSplit(h, 'wander')`. Wędrujący nie staje do rozmów; od 1.16 nie ma rzutu za odcięcie, ale może się zgubić we mgle i bez drogi (6.2.10, 6.2.10a).

### 6.2.13 Wejście do lochu: spawn, czekanie, drugi oddział

- Bohaterowie wchodzą co `0.3` s z kolejki fali (`p6_loop.js: step`) na pole wejścia albo wyłomu (`spawnPt`, sekcja 07). `spawnHero` od razu odsłania okolicę (`reveal`) i mówi kwestię otwarcia (6.7.9 A).
- **Czekanie przy wejściu** (`GATE_T = 1.8` s, `p6_loop.js`): do tego czasu nikt się nie rusza i nie ma skill checków (testerzy nie zdążali reagować); `partyThink` już działa. Po otwarciu przywódca (od 1.17 `leader()`, bo kwestie typu "za mną" ma mówić ten, kto prowadzi; do 1.16 `alive()[0]`, pierwszy w kolejności wejścia) mówi `SAY.gate` (2, dur 1.6).
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
  if !L || L.dead || L.fled || L.gone || L.lost || L.goHome || panicking(L) || caged(L) || (L.fleeing && P.plan !== 'flee') || inG2(L):
     c = alive() bez: zgubionych, wracających samotnie (goHome, 1.17), panikujących, w klatce, uciekających
         (uciekający dopuszczeni tylko w planie 'flee'), od 1.19 członków drugiej grupy
     if !c.length && P.g2 && ktoś żyje w drugiej grupie: g2End('last'); return leader()     // 1.19: została tylko druga grupa: jest drużyną
     away(o) = onScout(o) || o.split ? 1 : 0                // 1.17: kto jest na własnym wypadzie, prowadzi tylko, gdy nie ma nikogo innego
     c.sort: away rosnąco, potem rank malejąco, potem (1.23) Nemezis przed innymi, przy remisie indeks typu w LEADER_ORDER rosnąco
     L = c[0] || alive()[0] || null
     P.leaderId = L ? L.id : -1
  return L
```

Od 1.17 nowy przywódca przynosi swoją wiedzę: gdy w `perceiveThink` przywódca jest inny niż w poprzednim `partyThink` (`P.lastL`), ma własny plan różny od `P.plan`, nie niesie kryształu, a w lochu jest ktoś jeszcze, ale nikt z pozostałych nie zna już starego planu (`o.plan === P.plan`) i cierpliwość jeszcze trwa (`!fl.fearless`), drużyna przejmuje jego plan (`P.plan = L.plan`, 6.3.13). Inaczej (ktoś z grupy starego przywódcy żyje) to on dostaje plan drużyny, gdy do niej dołączy. Po kradzieży kryształu w tej fali (`fl.stats.crystalTaken`) plan nowego przywódcy nie jest przejmowany: drugiego kryształu w fali nie ma, więc drużyna zostaje przy ucieczce. Przywódca wybierany jest nadal spośród wszystkich żywych, nie tylko z grupy starego przywódcy (znane ograniczenie, 6.3.13).

- `LEADER_ORDER.json`: `warrior, barbarian, priest, bard, mage, thief`.
- Liczy się ranga (przedział poziomów), nie poziom: elita poz. 6 wojownik wygrywa z elitą poz. 9 magiem. Boss fali ma zwykle najwyższą rangę (sekcja 04).
- Zmiana lidera następuje "w locie", przy pierwszym wywołaniu `leader()` po utracie zdolności do prowadzenia; nie ma osobnej kwestii. `kill` i `fall` ustawiają `P.leaderId = -1`.
- Niosący kryształ ma `fleeing = false`, więc może prowadzić.
- Co lider robi inaczej: wybiera cel eksploracji, zarządza odwrotem (tylko poz. 3+, `R.coord`), czeka na maruderów i zbierających łupy, waha się przed nieznanym, decyduje o ratowaniu z klatki i szukaniu zgubionych, wywołuje objazdy, mówi kwestie drużyny (`partySay`). Ranga lidera ustawia próg ucieczki drużyny (6.6.3).

### 6.3.2 `partyThink(dt)`: kolejność (`p5_ai.js: partyThink`, co 0,25 s)

```
 1  kolejka kwestii P.queueSay (6.7.3; od 1.17 obsługiwana jako P.queueCur, nowe kwestie trafiają do świeżej P.queueSay)
 2  lootSeen(it) dla każdego łupu na mapie (6.4.1)
 3  crew = alive(); if !crew.length: return
 4  L = leader()
 5  P.morale = min(1, P.morale + (bard w drużynie, nie zgubiony, nie w klatce ? 0.02 : 0.012) * dt)
    1.16: if P.detour && time > P.detour.until: P.detour = null; L.needPlan = true     (dawniej objazd czyścił tylko
        planHero lidera bez własnej pracy, więc lider zajęty łupem trzymał stary objazd i blokował nowe pomyłki, mgłę i zwiad przodem)
 5a 1.17: perceiveThink(L, crew): plan bohaterów, ostatnie znane miejsca, zauważenie zgubionego, wieści o śmierci (6.3.13)
 5b 1.17: if P.council: councilThink(L) (6.3.10a)
    1.19: g2Think(L); sulkThink(L) (6.10)
 5c 1.17: ratowany już nie w klatce (albo nie żyje) -> P.rescueId = P.rescuerId = -1; następny z P.rescueQ, który wciąż siedzi (6.5.9)
 5d 1.17: lookThink(L, crew): rzut na rozglądanie się (P.lookAsk), przebieg i koniec (6.3.3a)
 6  lider błądzi we mgle (6.2.10)
 7  dla każdego h z crew: rozdzielenie (6.2.10a) albo samotność, rany, klątwa, kołysanka, klatka (6.6.5); reakcja na kontr-budowlę (6.3.12);
    if h === L: h.lost = false; h.sepT = 0; dalej następny
    odnalezienie albo zgubienie (6.2.10); zgubiony: strach 4/s, Groza, wołanie (6.2.10)
 8  podanie mikstury przyjacielowi (6.5.8)
 8a 1.20: shareThink(crew, L, dt) (6.11.4); 1.21: bondThink(crew, L) (6.12); 1.22: finalThink(crew, L, dt) (6.13); 1.23: nemesisThink(crew, L) (6.14)
 9  if !L: return
10  if P.prep && time >= P.prep.until: finishPrep() else if !P.prep: checkPrep(L)          (6.3.8)
11  każdy w klatce, a nie w P.cageDecided: decideCage(h, L), od 1.17 tylko gdy przywódca słyszy krzyk z klatki
    (canHearShout(L, h)) albo minęło 20 s od zamknięcia (h.cagedAt); P.rescueId nieważny -> -1        (6.5.9)
12  grp = groupOf(L) (1.17; wcześniej cała załoga); avgHp = średnia hp/max grupy; fearR = średnia fear/courage grupy
    1.19: mutinyThink(L, grp, dt, avgHp, fearR); riftThink(L, grp, dt) (6.10)
13  zwiadowca: następna granica albo powrót (6.3.3); zwiad przodem (6.3.3); koniec czekania na zwiadowcę; partner (6.2.10a)
14  zmiana planu:
      goingOut():        nic (wszyscy do wyjścia)
      elif fl.fearless:  if plan != 'assault' && heartP(): plan = 'assault'; replanAll()     (1.17: heartP, było fl.heartKnown)
      elif plan 'retreat': koniec odpoczynku? (6.3.7)
      elif decyzja o odwrocie (6.3.7)
15  if !goingOut() && (fearR > [0.75, 0.85, 0.95, 1][L.rank] || (P.morale < 0.2 && L.rank < 2)): partyFlee()   (6.6.3)
16  przeszukanie i decyzja o szturmie (6.3.4)
17  P.searchId nieważny -> -1 (6.2.10)
18  plan 'explore': cel ważny? inaczej chooseTarget(L) (6.3.3) i od 1.22 notThisWay(L, crew) (6.13.7); brak celu i heartP() -> assault
19  zamknięta krata (6.3.11)
20  zasadzka (6.3.12)
21  small talk (6.7.6); od 1.21 wybrany z więzią w 25% mówi zamiast tego słowo do partnera (6.12.2)
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
tr = L.trait                                                  // 1.17: charakter przywódcy widać w tym, dokąd idzie
deep = tr brave ? 0.24 : tr coward ? 0.1 : 0.18               // odważny ciągnie w głąb, tchórz trzyma się bliżej wyjścia
whim = tr brave ? 2.5 : tr careful ? 1 : 1.5                  // odważny częściej idzie "na czuja", ostrożny prawie nigdy
snd  = P.sound, jeśli time - P.sound.t < 25 (dźwięk zza ściany, który słyszał przywódca, 6.3.3a)
sndK = (tr brave || tr greedy || L.rank === 0) ? -2.5 : (tr careful || tr coward) ? +2 : -1
add(f, room, bonus):
   d = b.dist[f]; if d < 0: pomiń
   sc = d * (tr careful ? 1.15 : 1) - deep * manhattan(f, wejście) + rand*whim + bonus     // do 1.16: d - 0.18*manhattan + rand*1.5
   if snd && hypot(snd - f) <= 7: sc += sndK                  // odważny, chciwy, zielony idzie sprawdzić; ostrożny i tchórz omijają
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
if lines.length < 2 && crewT.length: lines.push([null, deliberate2])  // ktokolwiek (1.13: sam lider nie spiera się sam ze sobą;
                                                                       // 1.17: drugi głos ma własny klucz, do 1.16 drugi raz deliberate)
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

### 6.3.3a Ciekawość: rozglądanie się po pokoju i dźwięki zza ściany (1.17, `p5_ai.js: lookSpots, lookPref, lookRoll, lookThink, lookJob, lookArrive, lookDone, hearFar`)

Autor (21.10): bardziej naturalne zwiedzanie, ciekawość, niech się rozglądają. Przywódca, który wchodzi do nowego pokoju, czasem pozwala drużynie obejrzeć, co w nim jest: każdy podchodzi do czegoś, patrzy chwilę i mówi, co widzi; meble są przeszukiwane.

**Rzut** (`onEnter` lidera -> `P.lookAsk = {room, at: time + 0.9}`, gdy nie zaczął się zły skręt; `lookThink` po czasie woła `lookRoll(L, room)`, jeśli w tym pokoju jeszcze nie rzucano i lider wciąż w nim jest). `lookRoll` zawsze dopisuje pokój do `P.lookRolled` (jeden rzut na pokój w fali), a potem:
```
stop, gdy: plan != 'explore' || fearless || goingOut() || P.council || P.detour || P.prep || P.aheadWait >= 0
           || time < P.lookCd || L.lost || talking(L)
        || fl.patT > 0.8 * waveTime || P.morale < 0.45 || ktoś z groupOf(L) panikuje albo walczy || lider nie stoi w tym pokoju
        || w pokoju jest żywy potwór
spots = lookSpots(r, L); objs = liczba miejsc innych niż goła ściana
p = {careful 0.5, greedy 0.55, brave 0.35, coward 0.15}[L.trait] (bez cechy 0.4)
    + (L.rank === 0 ? 0.15 : 0) + (objs >= 2 ? 0.2 : objs ? 0.1 : -0.2) + (komnata R.rk ? 0.15 : 0)
    - (średnie hp/max wszystkich żywych < 0.5 ? 0.25 : 0) - (fl.patT > 0.6 * waveTime ? 0.15 : 0)
g = talkGroup(L)
if rand >= p:                                            // nie ma czasu na zwiedzanie
   w = (w pokoju jest mebel) && rand < 0.3 ? ktoś z g (nie L) chciwy albo nowicjusz, nie rozmawia : null
   if w: talkAs(1.5, [[w, lookWant], [L, lookHurry]]); stats.lookNo++
   return
lookers = g bez L, bez niosącego kryształ, wychodzących, panikujących, w klatce, na zwiadzie (onScout), rozmawiających, z hp <= 30%
if lookers puste: lookers = [L]                           // sam rozgląda się sam
dla każdego z lookers w losowej kolejności:
   tchórz (nie L) z szansą 0.6 zostaje przy liderze (z tego 40% powie lookStay, tylko jeśli ktoś inny naprawdę idzie oglądać)
   inaczej miejsce z najmniejszym  d - lookPref(o, s) + rand*3  (d = Manhattan do najbliższego pola stania; tchórz tylko d <= 3)
   o.look = {kind, sub, x, y, st, it, dwell: 1.5 + rand*1.5, at: -1, done: false}; o.needPlan; miejsce zajęte
if nikt nie dostał miejsca: return
P.look = {room: r, t0: time, until: time + 10, ids}; stats.looks++; tl('lk', r, ids.length)
lider nie ogląda sam -> P.waitUntil = max(P.waitUntil, time + 1); lider mówi lookStart (2)
```

**Miejsca** (`lookSpots(r, L)`; pole stania = sąsiad 4-kierunkowy w tym pokoju, znany, `standOk`):
- meble `fl.objects` w pokoju (beczka, skrzynia, posąg, półka), pomijając mebel ze znaną, nierozbrojoną pułapką; jeśli stoi na nim mimik, beczka prochu albo pozytywka (`SEARCH_TRAP`), miejsce pamięta ten element (`it`);
- straszaki `LOOK_PROP` (portret, lustro, oczy na ścianie, trumna, kości) w tym pokoju (`slotRoom`), jeszcze nieznane; dla ściennych pole stania przed ścianą (`wallDirs`);
- środek komnaty (`R.rk`, gdy jest dla niej `SAY.lookKind`): pole obok środka albo sam środek;
- 2 losowe pola przy gołej ścianie (patrzy na ścianę).

**Upodobania** `lookPref(h, s)` (`LOOK_LIKE`, im więcej, tym chętniej; suma dla charakteru i klasy, po `kind` i `sub`): chciwy: meble 2,5; złodziej: meble 1,5; kapłan: trumna, kości, Kaplica czaszek 2,5, Nawiedzona sala 1,5; mag: lustro 2, oczy 2, Nawiedzona sala 1,5; barbarzyńca: Zbrojownia 2,5, Kuźnia 2,5, Jaskinia ogra 1,5; bard: posąg 2, Galeria 2,5, Pokój dziecięcy 1,5, portret 1,5; wojownik: Zbrojownia 2, posąg 1; goła ściana zawsze -1,5.

**Oglądanie** (`lookJob`, praca nr 13 w `planHero`, 6.2.9): bohater idzie (najwyżej 12 kroków, inaczej rezygnuje: `done`) do najbliższego pola stania; na miejscu raz `lookArrive` (kwestia `lookObj[sub]` / `lookProp[sub]` / `lookKind[sub]` / `lookWall` przez kolejkę, prio 1, z szansą 0,8, przy ścianie 0,5), potem stoi twarzą do rzeczy (`lookAt`, stan `wait`) przez `dwell`; na koniec `lookDone`:
```
look.done = true
tylko mebel:
  it (mimik / pozytywka / proch) wciąż na miejscu, nie wyłączony, nieznany, gotowy (cd <= 0) && rand < SEARCH_TRAP[typ]
     (mimik 0.55, pozytywka 0.45, proch 0.2) -> fire(it, 1); stats.lookTraps++; tl('lt', h.id, typ, x, y); koniec
  skrzynia, beczka, półka (SEARCH_GOLD): rand < (chciwy albo złodziej ? 0.3 : 0.18) -> h.gold++, stats.goldFound++,
     napis "+1 złota", kolejka lookFind (prio 2); inaczej z szansą 0.45 lookNothing (prio 1)
```
Mebel z mimikiem, prochem albo pozytywką odpala dopiero na końcu oglądania, więc gracz ma najpierw własną szansę (skill check, gdy bohater stoi w zasięgu).

**Przebieg i koniec** (`lookThink`, co `partyThink`): koniec, gdy wszyscy z `ids` skończyli (albo są zgubieni lub w klatce), po 10 s albo od razu (`stop`) przy: zmianie planu z `explore`, `fearless`, wychodzeniu, naradzie, braku lidera albo zgubionym liderze, pułapce, która odpaliła od początku rozglądania w tym pokoju (`fl.lastTrapRoom`) albo którą przywódca słyszał zza ściany (`P.sound.t > t0`), ranie, panice albo walce kogoś z grupy przywódcy. Wtedy `P.look = null`, `P.lookCd = time + 18`, wszyscy `look = null` i przeplanowują, `P.waitUntil` się kończy, a gdy to nie był `stop`, lider mówi `lookEnd` (kolejka +0,4 s). W trakcie lider, który sam nie ogląda, czeka (`P.waitUntil = time + 0,5`).

**Dźwięk zza ściany** (`hearFar(it, hit)`, wołane z `p4_traps.js: fireRaw` przy każdym odpaleniu pułapki `TRAPS`, przed świadkami):
```
stop, gdy: brak drużyny, nie fala, time < P.soundCd, goingOut(), pokój pułapki (slotRoom) to Głusza
c = żywi: nie zgubieni, nie panikują, nie w klatce, nie wychodzą, nie w pokoju pułapki, nie w Głuszy,
    w odległości <= 12 (od środka pola pułapki), nie trafieni tą pułapką
if c puste: return
h = najbliższy z c; v = pierwszy żywy trafiony (jeśli jest)
P.soundCd = time + 10
if h jest przywódcą albo przywódca go słyszy (canHear): P.sound = {x, y, t: time, room}     // tylko wtedy przywódca kieruje się dźwiękiem
stats.heard++; tl('hs', h.id, typ)
v ? kolejka h: hearScream z imieniem v (prio 2) : z szansą 0.65 kolejka h: hearSound (prio 2)
każdy nie zgubiony, nie panikujący, nie w klatce, który jest h albo w earshot(o, h): lookAt(pułapka), glanceT = 2.5   // odwracają się w tę stronę
```
`P.sound` przez 25 s zmienia wybór celu (6.3.3): odważny, chciwy albo zielony przywódca idzie sprawdzić, co to było, ostrożny i tchórz to omijają. Pułapka, którą przywódca słyszał, przerywa też rozglądanie się.

Widać to: w karcie bohatera stan "rozgląda się", ciekawostka "Zwiedzali" (od 2 rozglądań w fali), statystyki `looks`, `lookNo`, `lookTraps`, `goldFound`, `heard` (sekcje 07 i 08).

### 6.3.4 Ile przeszukać przed szturmem (`p5_ai.js: partyThink`, krok 16)

```
rooms     = pokoje (kind 'room')
seenShare = Σ (R.visited ? 1 : R.seen ? 0.3 : 0) / rooms.length
need   = min(0.85, (L.rank === 0 ? 0.5 : 0.6) + 0.1 * clamp(greedRaw(fl.greed) - 1, 0, 2) - (L.rank >= 2 ? 0.1 : 0))
if fl.heartKnown && !P.heartSaid && !goingOut() && heartTold(L):            // 1.17: heartTold (6.3.13)
   P.heartSaid = true; L mówi (seenShare < need && L.rank > 0 && !fl.fearless ? SAY.heartLater : SAY.heartSeen) (3)
   // 1.17: "najpierw reszta" tylko, gdy naprawdę jeszcze szukają (do 1.16 stały próg 0,65 i padało też w szturmie z przepowiedni)
tLimit = S.waveTime * min(0.6, 0.45 + 0.01 * max(0, rooms.length - 6))      // duży loch: więcej czasu
detourG = P.gateDetourUntil > time                                          // krata kazała obejść (6.3.11)
P.wantSearch = (seenShare < need && fl.patT < tLimit) || detourG            // zmiana -> fl.knowDirty = true
if P.plan === 'explore' && !detourG && heartP() && avgHp >= 0.5 && (seenShare >= need || fl.patT > tLimit):   // avgHp grupy przywódcy
   P.plan = 'assault'; P.detour = null; partySay('assault', 3); replanAll()
   gr = inny niż lider chciwy albo łowca, nie zgubiony, nie panikuje, od 1.17 słyszy przywódcę (canHear)
   if gr && seenShare < 0.85: kolejka gr: SAY.argueSearch (+1), L: SAY.replySearch (+2)
```

Im bardziej chciwi (globalna Chciwość `fl.greed`, sekcja 03), tym więcej lochu przeszukują przed szturmem. `greedRaw(g) = g <= 1 ? g : (g*g + 1)/2`.

### 6.3.5 Wiedza: pułapki, plotki, potwory

**Zapamiętanie pułapki, która odpaliła przy nich** (`p4_traps.js: fireRaw`, tylko `TRAPS`, nie potwory):
```
witnesses = żywi, których pokój (h.room) jest jednym z pokoi obszaru pułapki
if witnesses:
   if !it.detected: (list[0] || witnesses[0]) krzyczy pickS(SAY.trap[it.type] || SAY.trapGeneric) (3, dur 1.4, 'loud')
                    // 1.17: SAY.trap[typ] to lista (pickS losuje), trapGeneric zastąpił zaszyte 'Pułapka!'
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

**`learnTrap(it, how, by)`** (`p4_traps.js`): `it.detected = true`, `fl.threatDirty = true`; dla `how 'seen'` napis "Zapamiętali"; jeśli jest `by`: kwestia (`'seen'` -> `SAY.learn`, inaczej `SAY.amulet`/`SAY.detect`, prio 2); od 1.17, gdy `by` brak i `how 'seen'` (wszystkie takie wywołania: odpalenie przy świadkach, upadek w zapadnię, pułapka postawiona na ich oczach), z szansą 0,5 pierwszy żywy w pokoju pułapki (`slotRoom`), nie zgubiony, nie panikujący, nie w klatce, mówi przez kolejkę `SAY.learn` (+1,2 s, po okrzyku, prio 2); pułapka poz. 3: z szansą 0,7 `by` (albo ktoś w jej pokoju) mówi `SAY.nastyTrap` (3). Do 1.16 `SAY.learn` nigdy nie padało (6.8).

**Wiedza wspólna (1.17 jej nie dzieli).** Mapa (`fl.known`), wiedza o pułapkach (`detected`, `fl.danger`, `fl.knownTypes`) i o łupach (`seenWave`) zostają wspólne dla całej drużyny, także dla zwiadowcy i zgubionego pokoje dalej: to świadoma abstrakcja (sekcja 11). Percepcja z 1.17 (6.3.13) dotyczy zdarzeń i decyzji: śmierci, krzyków, planu, serca.

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
| każde obrażenie od pułapki (także pokoje dalej, bez sprawdzania percepcji) | `-0.03`, min `0.15` | `p3_flow.js: damage` |
| śmierć bohatera | `-0.25`, min `0.15`; od 1.17 raz na śmierć i dopiero, gdy wie o niej przywódca (widział, słyszał krzyk albo dostał wieść, 6.3.13) | `p3_flow.js: kill`, `p5_ai.js: perceiveThink` |
| pieśń barda | `+0.25` | `p5_ai.js: bardTick` |

| Próg | Skutek |
|---|---|
| `< 0.2` i lider rangi 0-1 | cała drużyna ucieka (6.6.3) |
| `< 0.45` | 1.17: przywódca nie pozwala się rozglądać (6.3.3a) |
| `< 0.65` | bard śpiewa (6.5.5) |
| `< 0.75` | lider rangi 1+ waha się przed każdym nowym polem granicy (`SAY.hesitate`) |
| `< 0.8` | tchórz zabiera głos na naradzie |

### 6.3.7 Odwrót i odpoczynek

**Decyzja o odwrocie** (`partyThink` krok 14, gdy plan nie wyjściowy, nie `fearless`, nie `retreat`):
```
if L.R.coord (lider poz. 3+) && time > P.retreatLock
   && (avgHp < (P.plan === 'assault' ? 0.32 : 0.42) || (ktoś z grupy ma hp < 0.22 max && w załodze nie ma kapłana)):
   // 1.17: avgHp i "ktoś ciężko ranny" liczone w grupie przywódcy (groupOf), kapłan w całej załodze
   room = safestRoom(L)
   if room >= 0:
      P.plan = 'retreat'; P.retreatRoom = room; P.restSince = -1; partySay('retreat', 3); replanAll()
      br = inny niż lider odważny (brave) albo barbarzyńca, nie panikuje, 1.17: słyszy lidera -> kolejka SAY.argueRetreat (+1)
      cw = inny niż lider tchórz, nie panikuje, 1.17: słyszy lidera -> kolejka SAY.agreeRetreat (+2 jeśli był br, inaczej +1)
```
Lider-nowicjusz (poz. 1-2) nigdy nie zarządza odwrotu. Protest odważnego nic nie zmienia. Od 1.17 do pokoju odwrotu idą tylko ci, którzy znają ten plan (`planOf(h) === 'retreat'`, 6.2.9); reszta dostaje go, gdy zobaczy albo usłyszy przywódcę.

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

**Koniec odpoczynku** (`partyThink`, od 1.12.1): `restT = restSince > 0 ? time - restSince : 0`; koniec, gdy `(avgHp >= 0.7 && (restT >= 10 || (restSince < 0 && avgHp >= 0.85))) || restT > 26` (do 1.12: `avgHp >= 0.7` albo 20 s od `restSince`). `avgHp` od 1.17 to średnia grupy przywódcy. Po końcu: `plan = heartP() ? 'assault' : 'explore'` (do 1.16 `fl.heartKnown`), `P.retreatLock = time + 15`, `P.restSince = -1`, `partySay('restDone', 2)`, odpoczywający wstają, `needPlan` wszystkim.

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
trapsKnown = w pokoju r jest znana, nierozbrojona LOOKS_TRAP (slotRoom)       // 1.17: pokój może mieć same potwory
spec = [[kapłan, prepWard], [trapsKnown && mag, prepJam], [trapsKnown && złodziej, prepDisarm], [wojownik, prepShield]] bez brakujących
tasowanie Fisher-Yates (Math.random), mówią pierwsi 2 ze spec           // pozostali i tak działają w finishPrep
if kwestie.length === 1:                                                  // nie mówi żaden specjalista
   rep = ktoś z załogi poza L
   rep ? [rep, prepReply] : [L, prepGo]                                   // sam lider: jego własne "idę" (SOLO.prepGo)
dur = max(3, talkLen(kwestie)); P.prep = {room, until: time + dur, pr, mg, th, wr}   // id WSZYSTKICH specjalistów
P.talkUntil = max(P.talkUntil, time + dur); załoga: talkUntil = time + dur
kolejka: kwestia i o czasie time + 0.5*i; huddleUp(L) (6.7.5)
```
Mag i złodziej nadal działają w `finishPrep` (zagłuszenie, rozbrojenie), nawet gdy w scenie nic nie powiedzieli. Od 1.17 kwestie specjalistów (`prepWard`, `prepJam`, `prepDisarm`, `prepShield`) są w `SOLO_MUTE`: samotny specjalista ich nie mówi. Sygnałem do biegu jest okrzyk lidera `SAY.rush` w `finishPrep`. Długość scenki (średnie `readT` + przerwy): bez specjalisty ok. 5,8 s (sam lider ok. 6,2 s), z jednym ok. 6,5 s, z dwoma lub więcej ok. 9,3 s; w powtórkach dwóch runów (72 fale) średnio 8,0 s na przygotowanie. W 1.12.1-1.13.2 mówił każdy specjalista, a potem lider `prepGo` i ktoś `prepReply` (do 7 kwestii, 8-19 s, średnio 12,5 s w tych samych powtórkach; autor: za długie). Do 1.12 było stałe 2,4 s i większość kwestii nie zdążyła paść ("Plan!" i bezruch). Każdy poz. 4+ z `hp < 0.7 max` wypija najlepszą miksturę.

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
         P.plan = 'leave'; wszyscy needPlan; rest/talk/boss -> walk
         SAY.leave (3) mówi nieuciekający przy sercu, a gdy wszyscy przy sercu uciekają, nieuciekający, który słyszy
         kogoś przy sercu (1.17; do 1.16 pierwszy nieuciekający w kolejności wejścia, gdziekolwiek był)
   if P.steal >= stealNeed(): takeCrystal(żywi w stanie 'boss')
if nikt nie stoi przy sercu && P.steal > 0: P.steal = max(0, P.steal - 0.5 * dt)     // 1.17: napoczęty kryształ osiada z powrotem
stealNeed() = 4 / 2^mods.glass                                // Szklane serce
```
Do 1.16 `P.steal` nie spadał, gdy odeszli od serca (np. w panice), więc kolejne podejście zaczynało od poprzedniego postępu; od 1.17 maleje o 0,5/s, gdy nikt nie stoi przy sercu. Zerują go też `takeCrystal`, `regroupAtDoor` i powrót do szturmu w `crystalReturns`.

**`takeCrystal(atHeart)`** (`p6_loop.js`):
```
carrier = ten z atHeart, kto ma najwięcej HP
carrier.crystal = true; carrier.fleeing = false; P.carrierId = carrier.id; P.plan = 'escape'; P.steal = 0
carrier: SAY.steal (4, dur 2.2)
1.17: tylko niosący i ci, którzy go widzą albo słyszą jego krzyk (perceives(h, carrier, true), 14 kroków):
   h.plan = 'escape'; boss/rest/talk -> walk; needPlan; inni niż niosący z szansą 0.4: SAY.escape (2)
   (do 1.16 każdy żywy w lochu; reszta dowiaduje się, gdy dołączy, 6.3.13)
```

**Ucieczka z kryształem**: plan `escape` jest wyjściowy, więc wszyscy idą do wyjścia (`intent 'carry'` dla niosącego, `'exit'` dla reszty). Nie ma osobnej eskorty: pozostali po prostu wychodzą tą samą drogą i ich wyjście liczy się jako zwykłe (nie przestraszone). Niosący: prędkość `x0.9 * mods.carrierSlow`, strach od karty `mods.carrierFear`, używa butów, w small talku `chatCarrier`. Kryształ wraca, gdy:
- niosący zginie (`kill` -> `crystalReturns`),
- strach niosącego dojdzie do odwagi (`addFear`, gdy nie jest w klatce) -> `dropCrystal`: `SAY.crystalFear` (4), `crystalReturns`, `startFlee`,
- spadnie przez zapadnię z kartą Bezdenna studnia (`mods.bottomless`).
Niosący, który spadł przez zapadnię bez tej karty, wychodzi z niej możliwie daleko od wyjść (`landFallen`).

**`crystalReturns(h)`** (`p3_flow.js`):
```
h.crystal = false; P.carrierId = -1; Groza za odzyskany kryształ (sekcja 03)
1.17: tylko ci, którzy widzą niosącego albo słyszą krzyk (perceives(o, h, true)): SAY.crystalDrop (4), needPlan
crew = groupOf(leader()) (1.17; do 1.16 wszyscy żywi)
if crew >= 2 && średnia fear/courage crew < 0.55 && nikt z crew nie ucieka:
   P.plan = 'assault'; P.steal = 0; każdy z crew: plan = 'assault', needPlan          // próbują jeszcze raz
else: partyFlee()
```
Kto nie widział i nie słyszał utraty kryształu, idzie dalej do wyjścia (myśli, że kryształ jest przed nim), aż dołączy do przywódcy i dostanie jego plan (6.3.13). Niosący, który spadł w Bezdenną studnię, jest już "zniknięty" (`gone`), więc nikt go nie widzi i nikt nie krzyczy.

### 6.3.10 Cierpliwość (`p3_flow.js: becomeImpatient`, `S.waveTime` = 120 s)

Od 1.12.1 cierpliwość liczy osobny zegar `fl.patT` (`p6_loop.js: step`): rośnie o `dt`, a o `0,5 × dt`, gdy `fl.time < P.talkUntil` (narada, przygotowanie, inne rozmowy z postojem) albo trwa odpoczynek (`plan 'retreat'` i `restSince > 0`). Wszystkie progi poniżej (120 s, siatka bezpieczeństwa +60 s, limit szukania `tLimit` w 6.3.4) porównują `fl.patT`, nie `fl.time`. HUD pokazuje pozostały czas cierpliwości. Powód: dłuższe scenki nie mogą skracać zwiedzania.

```
L = leader()
if plan już wyjściowy: fl.fearless = true; return
if P.council: return                                          // 1.17: narada trwa (step woła co krok, póki !fearless)
prophet = żywy boss 'final' (bohater z przepowiedni), nie uciekający
if !prophet:
   if L && (heartP() || !P.councilMore):                      // 1.17: jest wybór -> narada (6.3.10a)
      P.council = {stage: 'wait', t0: time}; stats.councils++; podpowiedź "naradzają się, co dalej"; return
   goHome(L); return                                          // brak wyboru: serce nieznane przywódcy i +30 s już było
fl.fearless = true; fl.storm = true; P.heartSaid = true
if !fl.heartKnown:                                            // przepowiednia pokazuje drogę
   fl.heartKnown = true; fl.heartBy = null; pola shortestPath() i pokój serca -> known; prophet: SAY.prophecy (4, dur 2.6)
if fl.heartKnown: P.plan = 'assault'; rest/talk -> walk; needPlan; L: SAY.impatient (3)       // 1.17: L, było alive()[0]
else: P.plan = 'leave'; ...; L: SAY.leave (3)        // (nieosiągalne przy prophet, bo wyżej heartKnown = true)

goHome(L):                                                    // 1.17: dawny koniec cierpliwości, osobna funkcja
   fl.fearless = true; fl.storm = false; tl('ip', 0); P.plan = 'leave'; P.council = null
   wszyscy needPlan, rest/talk -> walk; L (jeśli jest): SAY.leave (3)
```

Do 1.16 koniec cierpliwości bez przepowiedni zawsze oznaczał powrót do domu (`plan 'leave'`, tak zdecydował autor w 1.01). Od 1.17 (autor 21.10: po 2 minutach nie sztywny odwrót albo szarża, tylko decyzja, może wspólna, przez rozmowę) drużyna się naradza (6.3.10a); `goHome` zostaje dla sytuacji bez wyboru i dla wyniku "do domu". `fl.fearless` ustawia dopiero wynik narady (dom albo szturm), więc w trakcie narady i po "jeszcze chwila" drużyna zachowuje się normalnie. HUD pokazuje w trakcie narady "narada" zamiast czasu (sekcja 08).

Skutki `fl.fearless` (od tej chwili do końca fali): ścieżki bez kosztu zagrożeń, prędkość x1,3, próg ucieczki x1,3 (sekcja 05), brak rozmów (`talk`/`talkAs` nic nie robią), brak wahania, tarczy wojownika przed zagrożeniem, talizmanu "przed pułapką", przyspieszania przy zagrożeniu, przygotowań, objazdów, gubienia się, prac klasowych (`disarmJob`, `smashJob`, `blessJob`, `bombJob` zwracają `null`), szukania zgubionych, wołania barda; w `planHero` gałąź "fearless i assault" wyprzedza wszystkie prace i łupy. 60 s po końcu cierpliwości każdy żywy wychodzi natychmiast (`heroExit`, siatka bezpieczeństwa w `step`; liczy się `fl.patT >= S.waveTime + 60`, więc po "jeszcze chwila" siatka przychodzi odpowiednio później).

### 6.3.10a Narada na końcu cierpliwości (1.17, `p3_flow.js: becomeImpatient, goHome`, `p5_ai.js: councilThink, councilVote, councilDone`)

Po 120 s cierpliwości (bez bohatera z przepowiedni) drużyna nie wraca już z automatu do domu: przywódca zwołuje naradę, każdy, kto stoi przy nim, głosuje według swojego stanu i charakteru, a decyzja wchodzi w życie po ostatniej kwestii.

**Otwarcie** (`becomeImpatient`, 6.3.10): `P.council = {stage: 'wait', t0: time}`, gdy jest przywódca i jest wybór: przywódca wie, gdzie jest serce (`heartP()`), albo "jeszcze chwila" nie była użyta (`!P.councilMore`). Inaczej `goHome(L)` (stary powrót).

**`councilThink(L)`** (każdy `partyThink`, póki `P.council`, krok 5b w 6.3.2):
```
if goingOut() || fl.ending !== null || fl.fearless || !L: P.council = null; return        // uciekli albo fala się skończyła
if stage 'wait':
   if time - t0 > 8: goHome(L); return                     // nie da się ich zebrać (lider zgubiony, w klatce...): do domu jak przed 1.17
   g = talkGroup(L)
   if ktoś z g rozmawia: do 4 s od otwarcia czeka na ciszę; potem ucina rozmowy (talkUntil = time)
   g = L i ci z g, którzy nie niosą kryształu, nie wychodzą i nie panikują        // głosujący
   opts = ['home'] + (heartP() ? ['storm'] : []) + (P.councilMore ? [] : ['more'])
   votes = councilVote(o, opts) dla każdego z g
   tally: głos lidera 1.5, elity (rank >= 2) 1.25, reszty 1
   res = głos lidera; każda opcja z większą sumą wygrywa (remis: decyduje lider)
   others = do 4 losowych z g bez lidera
   kwestie: [L, councilOpen], każdy z others: voteHome / voteStorm / voteMore (wg głosu)
            lider przegłosowany: [L, councilGiveIn]; potem [L, decideHome | decideStorm | decideMore]
   leave = []; grumbles = 0
   każdy z others, który głosował inaczej niż wynik:
      chciał do domu && rand < min(0.85, 0.2 + (tchórz 0.35) + 0.3*clamp(fear/courage, 0, 1) + (hp < 0.35 max ? 0.25 : 0)):
         leave.push(o); [o, goHomeAlone]                   // wraca sam
      elif grumbles < 2 && rand < 0.6: grumbles++; [o, outvotedHome | outvotedStorm | outvotedMore]
   if !talkAs(2, kwestie, L): return                       // nikogo nie ma (nie powinno się zdarzyć): spróbuje w następnym ticku
   stage = 'talk'; res, endAt = P.talkUntil, votes; P.waitUntil = max(P.waitUntil, P.talkUntil); tl('cn', res, g.length, leave.length)
elif time >= endAt: councilDone(C, L)
```

**`councilVote(h, opts)`**: `fr = clamp(fear/courage, 0, 1.5)`, `hp = hp/max`; dla każdej opcji wynik + `rand*0.8`, wygrywa najwyższy:
```
home  = 0.9 + 1.8*fr + 1.4*(1 - hp) + (tchórz 1.4 | ostrożny 0.4) + (złoto >= 2 ? 0.4 : 0) + (wstrząśnięty śmiercią ? 0.5 : 0)
storm = 0.6 + (odważny 1 | chciwy 0.5 | tchórz -0.9) + (barbarzyńca 0.6) + (czempion albo łowca 0.8) + (hp > 0.6 ? 0.5 : 0)
        + 0.2*rank - 1.4*fr + (P.plan === 'assault' ? 0.4 : 0)
more  = 0.5 + (heartP() ? 0 : 0.7) + (chciwy 0.8 | odważny 0.2) + (łowca 0.6) - (hp < 0.4 ? 0.6 : 0) - fr
```

**`councilDone(C, L)`** (gdy skończy się ostatnia kwestia, `time >= endAt`):
```
P.council = null; stats['council' + Res]++              // councilHome / councilStorm / councilMore
more:  P.councilMore = true; fl.patT = min(fl.patT, S.waveTime - 30)        // 30 s cierpliwości, potem druga narada już bez `more`
storm: fl.fearless = true; fl.storm = true; P.plan = 'assault'; P.detour = null; tl('ip', 1); rest/talk -> walk; wszyscy needPlan
home:  goHome(null)                                      // bez kwestii leave: decyzja już padła
if res !== 'home': każdy z leave, który żyje, nie wyszedł, nie spada, nie niesie kryształu, nie siedzi w klatce i nie jest liderem:
   o.goHome = true; o.split = false; needPlan; rest/talk -> walk; stats.goHome++; tl('gh', o.id); napis "Wraca sam" / "Wraca sama"
```
Bohater z `goHome` jest wychodzący (`exiting`), nie może zostać przywódcą (6.3.1), nie liczy się do czekania na maruderów (6.2.12), nie zostaje ratownikiem (6.5.9); w karcie bohatera ma stan "wraca sam do domu". Wynik narady przejmują od razu ci, którzy stoją przy przywódcy; reszta dostaje plan, gdy go zobaczy albo usłyszy (6.3.13). `fl.fearless` po szturmie działa jednak na wszystkich w lochu (sekcja 11).

Zestawy kwestii: `councilOpen`, `voteHome`, `voteStorm`, `voteMore`, `councilGiveIn`, `decideHome`, `decideStorm`, `decideMore`, `goHomeAlone`, `outvotedHome`, `outvotedStorm`, `outvotedMore` (6.7.9 I); samotny przywódca mówi wersje `SOLO` (`councilOpen`, `decide*`) i decyduje sam (jego głos to cała narada). `CONVO` ma zestawy dla `goHomeAlone` i `councilGiveIn`, ale kwestie narady mówi się w trakcie rozmowy (`talkAs` ustawia głosującym `talkUntil`), a `convoStart` odmawia mówiącemu, który rozmawia (`talking(A)`, 6.7.5a), więc te wymiany zaczynają się tylko wtedy, gdy kwestia spóźni się poza koniec narady (rzadko).

Test: `tests/t117_ai.py` (dzielna i zdrowa drużyna ze znanym sercem zwykle szturmuje, przestraszeni i ranni tchórze zwykle wracają, przy nieznanym sercu nigdy szturm, "jeszcze chwila" daje 20-31 s i drugi raz nie wypada, sekcja 09).

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
      L: (moved ? SAY.gateReroute : SAY.gateWait) (3, dur 2.2), 1.17.1 w sayNow(['gate']); if !moved: P.liftT = 0
   if P.blockSaid && plan !== 'explore':                     // czekają: złodziej podważa kratę
      door = najbliższe lidera zamknięte drzwi
      th = złodziej nie panikujący, nie uciekający, w odległości <= 1.6 od tych drzwi
      if na drzwiach stoi Krata && th:
         pierwszy raz: th mówi SAY.gateLever (3, dur 2; do 1.16 jedna kwestia zaszyta w kodzie); 1.17.1: sawAdd(th, ['gate']), sayNow(['gate'])
         P.liftT += dt * (th.lvl >= 6 ? 1.5 : 1)
         if P.liftT >= 3: drzwi otwarte; krata disabled + detected; threatDirty; replanAll()
else: P.blockT = 0; P.liftT = 0; if !gateShut: P.blockSaid = false
if P.gateDetourUntil && plan 'explore' && (time > gateDetourUntil || P.target < 0) && heartP() && !gateShut:     // 1.17: heartP
   P.gateDetourUntil = 0; plan = 'assault'; replanAll()
```
Gdy drzwi się otworzą (`step`), wszyscy przeplanowują. Złodziej nie ma osobnej pracy "idź do kraty": podważa tylko, gdy już stoi blisko (zwykle idzie za liderem). Objazdy liczą się do statystyki `reroutes` (gildia przysyła barbarzyńcę, sekcja 04).

### 6.3.12 Inne odruchy drużyny

- **Zasadzka** (`partyThink` krok 20): `fireRaw` przy każdej pułapce, która objęła kogoś z grupy przywódcy (od 1.17: trafiony to przywódca albo widzi go lub słyszy; do 1.16 ktokolwiek w lochu), robi `ambushN++` jeśli poprzednia była mniej niż 3 s temu (inaczej `ambushN = 1`) i `ambushT = time`. Gdy `ambushN >= 3`, `time - ambushT < 0.6` i od ostatniej zasadzki minęło ponad 12 s (`P.ambushSaid`): `ambushN = 0`, `talk(1.0, [SAY.ambush])`, każdy z grupy przywódcy (od 1.17; wcześniej każdy żywy) +6 strachu (`'ambush'`). Kapłan traktuje każde liczone trafienie w ostatnich 2 s (`P.ambushT`) jako powód do bariery (6.5.3).
- **Kontr-budowle** (`partyThink` krok 7): pierwszy, kto wejdzie do pokoju z budowlą `altar`, `rune`, `acid`, `veil`, `howl` albo `shackles`, mówi `SAY.b<Typ>` (3), raz na pokój i typ w fali (`fl.bSaid`). Pierwszeństwo ma klasa, której budowla szkodzi (Ołtarz: kapłan, Runa: mag, Kwas: wojownik, Kamień wyjec: bard, Okowy: barbarzyńca), jeśli jest w tym pokoju; Zasłona nie ma preferencji. Umocnienie (`fortify`) i Wabik nie mają kwestii przy wejściu (Wabik wygląda jak pułapka). Od 1.17.1 mówiący dostaje typ budowli do pamięci, a kwestia idzie w `sayNow([typ])` (6.7.10).
- **Serce znalezione**: patrz 6.3.4 (`heartSeen`/`heartLater`) i 6.3.13 (kiedy przywódca o nim wie).

### 6.3.13 Percepcja i plany bohaterów: nikt nie wie przez ściany (1.17, `p5_ai.js: planOf, goingOutH, exiting, hushAt, canSee, canHear, stepsWithin, canHearShout, perceives, groupOf, heartP, heartTold, perceiveThink, missLost`; `p3_flow.js: kill, startFlee, partyFlee, crystalReturns, damage, fearResist`; `p6_loop.js: takeCrystal, step`)

Autor (21.10): bohaterowie wydają się wiedzieć o sobie nawzajem w innych pokojach (np. o śmierci). Do 1.16 wiele reakcji szło do `alive()` bez żadnego sprawdzenia: śmierć wstrząsała całym lochem, "Kryształ!" krzyczał każdy, ucieczka drużyny łapała spokojnego zwiadowcę dwa pokoje dalej, przywódca znał położenie zgubionego, kapłan słyszał wołanie z drugiego końca lochu. Od 1.17 obowiązuje jedna reguła: bohater reaguje tylko na to, co widzi albo słyszy, a resztę poznaje później.

**Zmysły** (6.0):
- **widzi** (`canSee`): to samo miejsce (`samePlace`: ten sam pokój albo korytarz, albo do 3,5 pola), żaden nie spada w zapadni;
- **słyszy głos** (`canHear`): `earshot` (ten sam obszar albo do 7 pól w linii prostej, 6.7.4), żaden nie stoi w Głuszy;
- **słyszy krzyk** (`canHearShout`): jak głos albo do 14 kroków drogi (`stepsWithin`, BFS po polach przejezdnych do 14 kroków; najpierw odrzuca prostą odległość > 14), żaden w Głuszy ani w pokoju z Kamieniem wyjcem (jak odpowiedź na wołanie zgubionego, 6.2.10). Krzyki to: śmierć, klatka, "Kryształ!", ucieczka drużyny, okrzyk czempiona, gniew bohatera z przepowiedni, wołanie o kapłana.
- `perceives(o, v, shout)` łączy to w jedno; `groupOf(L)` = przywódca i każdy żywy, nie zgubiony, nie w klatce, kto go widzi albo słyszy (grupa przywódcy).

**Plan bohatera.** `h.plan` (start: `P.plan`); `planOf(h) = h.plan || P.plan`; `goingOutH(h)` = jego plan jest wyjściowy; `exiting(h) = fleeing || crystal || goHome || goingOutH(h)`. `planHero` czyta `planOf(h)` w gałęzi wyjścia (przez `exiting`), szturmu (`fearless && planOf(h) === 'assault'`), odwrotu (`planOf(h) === 'retreat' && P.plan === 'retreat'`) i celu idącego za liderem (serce przy `planOf(h) === 'assault'`). Kto nie usłyszał ucieczki, kryształu albo powrotu do domu, robi swoje, dopóki nie dołączy.

**`perceiveThink(L, crew)`** (każdy `partyThink`, krok 5a):
```
seen = P.seen
if L && P.lastL !== L.id:                                  // nowy przywódca
   P.lastL = L.id
   if L.plan określony && L.plan !== P.plan && crew > 1 && !L.crystal && !fl.stats.crystalTaken
      && !fl.fearless && nikt inny z crew nie ma o.plan === P.plan:
      P.plan = L.plan                                       // drużyna idzie wg jego wiedzy (nigdy po kradzieży ani po końcu cierpliwości)
dla każdego o z crew:
   if o.plan nieokreślony: o.plan = P.plan
   if o === L || canSee(o, L) || canHear(o, L):            // widzi albo słyszy przywódcę: zna plan drużyny
      if o.plan !== P.plan:
         was = o.plan; o.plan = P.plan; o.needPlan = true
         if o === L && crew === 1 && goingOut() && was nie był wyjściowy: o mówi SAY.leftBehind (3)   // reszta wyszła albo zginęła
   if L && (o === L || canSee(L, o) || canHear(L, o)): seen[o.id] = {x: o.tx, y: o.ty, t: time}       // ostatnie znane miejsce
   if o.lost && !o.lostNoticed && time - (o.lostAt || 0) >= 4 && L && !canHear(L, o): missLost(o, L)    // 6.2.10
dla każdej śmierci d z fl.deaths:                         // wieści (niżej)
   o = pierwszy z crew, który nie wie (d.knows), nie panikuje, nie w klatce, i ma obok kogoś, kto wie (k: wie, nie panikuje, canSee/canHear)
   jeśli jest: d.knows.add(o.id)
      kolejka: k mówi SAY.tellDeath z imieniem zmarłego (+0.2 s, prio 3), o mówi SAY.newsDeath (+0.4 s, prio 3)
      o.shakenUntil = time + 5; addFear(o, 0.6 * max(5 * o.R.panic, 0.05 * o.courage + 2) * (krypta ? 2 : 1), 'death')
      if o === L && !d.morale: d.morale = true; P.morale = max(0.15, P.morale - 0.25)
      stats.newsDeaths++                                   // jedna para na śmierć na tick
```
Ostatni żywy w lochu zostaje przywódcą: jeśli nie słyszał, że reszta wyszła (plan wyjściowy), przejmuje ten plan, mówi `leftBehind` i idzie do wyjścia.

**Śmierć** (`kill`, szczegóły liczb w sekcji 05, 5.7.4). Zapis `d = {id, t, crypt, knows: Set}` w `fl.deaths`. Dla każdego żywego `o`:
- **widzi** (`canSee(o, zmarły)`): pełna reakcja jak dawniej: wstrząs 9 s, furia z imieniem (odważny, barbarzyńca, wojownik 30%) albo z szansą 0,55 `SAY.death`/`deathFlee` z imieniem, strach `max(15 × panic, 0,12 × courage + 4)` (krypta ×2, tchórz ×1,5, furia ×0,3);
- **słyszy tylko krzyk** (`canHearShout`): wstrząs 5 s, z szansą 0,55 `SAY.deathHeard` (bez imienia, prio 3, dur 2), strach `1,3 × max(5 × panic, 0,05 × courage + 2)` (krypta ×2, tchórz ×1,5), bez furii;
- **reszta**: nic, aż dostanie wieść (wyżej: 0,6 × daleki strach, wstrząs 5 s, bez furii, bez mnożnika tchórza).
Każdy, kto zobaczył albo usłyszał, trafia do `d.knows`. Morale -0,25 raz, gdy dowie się przywódca (od razu albo z wieści).

**Serce.** `revealRoom` zapisuje, kto zobaczył pokój serca (`fl.heartBy = fl.revealBy`, id bohatera z ostatniego `reveal`); plotka i przepowiednia zostawiają `heartBy` puste. `heartTold(L)` = `heartBy` puste albo to sam przywódca, albo przywódca widzi lub słyszy tego, kto je zobaczył (żywego, w lochu), albo stoi w pokoju serca. Dopiero wtedy przywódca ogłasza serce (`heartSeen`/`heartLater`, `P.heartSaid = true`, 6.3.4). `heartP() = fl.heartKnown && P.heartSaid` zastępuje `fl.heartKnown` we wszystkich decyzjach drużyny: przejście do szturmu (kroki 14, 16, 18, koniec objazdu kraty), koniec odpoczynku, opcje i głosy narady, zły skręt (`maybeDetour`). Ścieżki (`heartGoal`) i mapa korzystają dalej z `fl.heartKnown` i `fl.known`.

**Decyzje liczone w grupie przywódcy** (`groupOf(L)`, wcześniej cała załoga):
- średnie HP i strach przy odwrocie, końcu odpoczynku, szturmie i ucieczce drużyny (6.3.7, 6.3.4, 6.6.3);
- "połowa ucieka" w `startFlee` (6.6.2) i ocena po utracie kryształu (6.3.9);
- licznik zasadzki i jej strach (6.3.12);
- strach przy decyzji o szukaniu zgubionego (`missLost`) i przerwanie rozglądania się (6.3.3a);
- protestujący przy odwrocie i szturmie tylko ci, którzy słyszą przywódcę (`canHear`); sprzeciw wobec łupu tylko w `earshot` (6.4.4);
- `friendLow` w small talku tylko o przyjacielu, którego mówiący widzi albo słyszy (6.7.6);
- pomoc w walce przywódcy tylko dla tych, którzy ją słyszą, i nie dla zwiadowcy ani partnera (6.2.9);
- odwaga przy bossie tylko, gdy bohater jest z nim (widzi albo słyszy, boss nie w klatce, nie w zapadni; sam boss też), sekcja 05;
- czekanie na maruderów pomija wychodzących (6.2.12); przywódcą zostaje najpierw ktoś, kto nie jest na własnym wypadzie (6.3.1).

**Krzyki i rozkazy**: klatka (decyzja, gdy przywódca słyszy krzyk, i ratownik spośród słyszących, 6.5.9), wołanie o kapłana (kapłan musi słyszeć krzyk, 6.5.3), ucieczka drużyny (tylko słyszący przywódcę, 6.6.3), okrzyk czempiona i krzyk przywódcy za uciekającym (tylko gdy widzą albo słyszą uciekającego, 6.6.2), gniew bohatera z przepowiedni (uspokaja słyszących, 6.6.4), kryształ zabrany i stracony (6.3.9), odepchnięcie od serca w fali 1 (6.3.9), zgubiony (6.2.10), dźwięk pułapki zza ściany (6.3.3a).

**Co zostało bez zmian (znane ograniczenia, sekcja 11):**
- mapa, wiedza o pułapkach i łupach wspólne dla wszystkich (6.3.5);
- idący za liderem zna jego bieżące pole, także pokoje dalej (6.2.12); łapie go tylko rzut na zgubienie;
- `fl.fearless` (po szturmie z narady albo powrocie) i cierpliwość są wspólne dla całego lochu;
- morale spada przy każdej ranie od pułapki, także pokoje dalej (6.3.6);
- przywódca wybierany spośród wszystkich żywych (z pierwszeństwem dla tych, którzy nie są na wypadzie);
- bard woła zgubionego po imieniu, nawet gdy go nie słyszał (6.5.5); efekty przygotowania (talizmany, osłona kapłana, bieg) działają na wszystkich (6.3.8); czekanie na zwiadowcę przodem kończy się, gdy zwiad się skończy, nawet gdy zwiadowca zginął dalej (6.3.3); uwięziony wie, czy ktoś po niego idzie (6.6.5, 6.5.9);
- reakcje liczone samą odległością przez ściany: `friendHit` (<= 4), ostrzeżenie weterana (< 7), odwracanie się do rannego (Manhattan <= 5), pocieszenie (<= 6), sam `earshot` (7 pól w linii prostej);
- kapłan idzie leczyć także rannego, którego nie widzi (praca nr 3, koszt drogi <= 12), gdy nikt go nie wołał;
- `onEnter` sadza bohatera w pokoju odwrotu i przy sercu wg `P.plan`, nie `planOf(h)`;
- ten, kto wyszedł z zapadni, nie dostaje wieści o tym, co działo się, gdy spadał (był poza `alive()`), chyba że przez zwykłe wieści o śmierci.

Test: `tests/t117_ai.py` (bohater pokoje dalej nie reaguje na śmierć od razu, przywódca obok ją widział, dalszy dowiaduje się, gdy dołączy: wie, boi się, `newsDeaths >= 1`; sekcja 09).

### 6.3.14 Karty zachowań bohaterów (1.18; teksty i liczby kopii w załączniku B)

| Karta | Co zmienia w decyzjach bohaterów | Kod |
|---|---|---|
| Wabiący hałas (`lure`) | dźwięk pułapki zza ściany (`P.sound`) liczy się przez `25 + 15 × kopie` s (40 s) i ciągnie każdego przywódcę: `sndK = -2,5` (bez karty: odważny, chciwy, nowicjusz -2,5; ostrożny, tchórz +2; inni -1); `hearFar` i Głusza bez zmian | `chooseTarget` |
| Jeszcze chwila (`onemore`) | głos "jeszcze chwila" +0,6 × kopie (×2 dla chciwego i łowcy); wynik "jeszcze chwila" daje `30 + 15 × kopie` s (45 s), podpowiedź mówi liczbę sekund; dalej raz na falę | `councilVote`, `councilDone` |
| Grube mury (`thickwalls`, jedna) | krzyk niesie się 8 kroków zamiast 14 (`shoutRange`): później docierają śmierć, klatka, kryształ, ucieczka, okrzyk czempiona i przepowiedni, wołanie kapłana, Krzyki w ścianach | `shoutRange`, `canHearShout` |
| Niosące się echo (`farecho`) | krzyk z Groty sięga `14 × (1 + kopie)` (28; z Grubymi murami 16); kto tylko słyszy śmierć w Grocie, boi się jak świadek | `shoutRange`; `p3_flow.js: kill` |
| Złe wieści (`badnews`) | śmierć znana ze słuchu albo od towarzysza straszy ×(1 + kopie); świadkowie i Odnalezione ciało bez zmian | `kill`, `perceiveThink` |
| Odnalezione ciało (`body`) | `kill` zapisuje, gdzie leży ciało (`d.x, d.y, d.room, d.hush`); kto nie wie o śmierci i jest w tym samym miejscu (`samePlace`), dowiaduje się tam: strach jak świadek `max(15 × panic, 0,12 × odwaga + 4)` ×2 Głusza ×2 Krypta ×1,5 tchórz ×(1 + 0,5 × (kopie - 1)), wstrząs 9 s, morale -0,25 dla przywódcy, `SAY.bodyFound` (sam: `SOLO.bodyFound`); od 1.21 partner zmarłego: żałoba zamiast tego (6.12.3) | `perceiveThink` |
| Fałszywe wołanie (`falsecall`, jedna) | zgubiony wołający w promieniu 14 (koszt drogi) od Nawiedzonej sali (nie swojego pokoju), gdy nikt nie odpowiada albo w 60%: `h.hearGoal` = pole najbliższe środka sali, `hearUntil +7 s`, `SAY.hearVoice`; idzie tam każdą drogą, zostaje zgubiony | `answerLost`, `falseCall`, `planHero` |
| Błędne ogniki (`wisps`) | przywódca błądzący we Mgle idzie na pole w zasięgu nieznanej pułapki tego pokoju najbliższe jemu (co najmniej 1 pole), błądzi o `2 × kopie` s dłużej (od 1.20 latarnia skraca błądzenie o połowę, te 2 s zostają) | `partyThink` |
| Zastawione szuflady (`drawers`) | w Graciarni szansa rozglądania się +0,3 × kopie; pułapka na przeszukiwanym meblu odpala z `min(0,95; SEARCH_TRAP × (1 + kopie))`: mimik 0,55 -> 0,95, pozytywka 0,45 -> 0,9, proch 0,2 -> 0,4 | `lookRoll`, `lookDone` |
| Podrzucone grosze (`coins`) | szansa monety w meblu ×(1 + kopie) (0,18 / 0,3 -> 0,36 / 0,6); znaleziona moneta podbija chciwość `LOOT_GREED.gold[0] × greedMult × (1 + goldDust) / (1 + 0,15 × lootSeen)` i liczy się do `lootSeen` | `lookDone` |
| Zepsute mikstury (`tainted`) | mikstura z Twojego łupu (nie upuszczona przez bohatera) dostaje `item.tainted`; wypita (sam, przed groźnym pokojem, podana przez przyjaciela) leczy ×0,5 i straszy 0,1 × odwaga × max(1, kopie) | `pickup`, `taintedSip`, `updateHero`, `startPrep`, `partyThink` |
| Usypianka (`lullsleep`) | ranny (< 60% HP), na którego gra kołysanka w Pokoju dziecięcym, nie drzemał w tej fali, stoi, idzie, rozmawia albo czeka (nie w klatce, bez paniki, nie wychodzi, nie płonie): drzemka jak w Sanktuarium na `4 + 2 × (kopie - 1)` s z `h.dream`, `SAY.lullNap`; we śnie koszmar 3,5 strachu/s i leczenie ×0,5, `SAY.lullDream` | `partyThink`, `updateHero` |
| Zasadzka w norze, Kokony, Spłoszeni w mrok, Gołoledź, Grzęzawisko, Sen bez przebudzenia, Spojrzenie z ramy | ukryci potwory nie są omijani, nie przerywają rozglądania, wojownik ich nie wybiera; reszta: sekcja 05, 5.13.1 | `planHero`, `lookRoll` |

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
- inaczej: mikstura -> `SAY.lootPotionSeen` (2; do 1.16 trzy kwestie zaszyte w kodzie); reszta -> `SAY['loot' + min(3, r)]` (prio `r >= 2 ? 3 : 2`).

Łup "widziany" (`seenWave === run.wave`) jest celem dla wszystkich (wiedza wspólna). Łup z plotki jest widziany od początku fali (6.3.5).

1.17.1: bez `by` `noticeLoot` kończy się po Chciwości; z `by`: `sawAdd(by, itemTags(it))`, a kwestia idzie w `sayNow(itemTags(it))`, więc musi pasować do rodzaju tego łupu (6.7.10). Do pamięci innych łup trafia przez `sawSweep` (łup jest zawsze widoczny w swoim pokoju).

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
   go:  mikstura -> hurt ? lootPotionNeed : lootPotion (1.17; do 1.16 ranny miał kwestię zaszytą, a zdrowy SAY.loot1, czyli "Złoto!")
        inaczej greedy -> lootGreedy; r === 3 -> lootLegend; rank 0 -> lootRookie; risk > 2 -> lootGo; inaczej SAY['loot' + r]   (wszystko prio 2)
        lider (inny, rangi 1+), gdy risk > 1.5, z szansą 0.4 i (1.17) w earshot(L, h):
           defy = h chciwy || łowca || nowicjusz || (mikstura && hurt) || rand < 0.25
           kolejka L: lootStop (+0.8), h: (defy ? lootReply : lootObey) (+1.8); stats.lootArgue++
           if !defy: stats.lootObey++; h.lootMemo = {go: false, t: time + 7}; return false   // 1.17: zostawia łup na 15 s (do 1.16 tylko słowa)
   !go: z szansą 0.6: careful -> lootCareful; rank 2+ i złoto -> lootPetty; inaczej lootRisk (2)
return go
```
Pamięć `{go: false, t: time + 7}` jest ważna, dopóki `time - t < 8`, czyli przez 15 s od rozkazu.

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

Wzięcie `lcursed`: `h.cursed = true`, przedmiot do plecaka po cichu (jeśli jest miejsce), `SAY.cursedPick` (3, dur 2.2; od 1.17.1 `sawAdd(h, ['cursed'])` i kwestia w `sayNow(['cursed', 'gear'])`). Skutki: obrażenia x1,3, przedmioty słabsze o połowę (`itemPow`), moce dłużej się odnawiają (x1,5), strach +2/s, wygasanie strachu o połowę wolniej (sekcja 05). Zdejmuje ją kapłan poz. 4+ za 3 wiary (6.5.3).

## 6.5 Zachowania klas, przedmioty, klatka, zapadnia

Klasy z `HEROES.json`. Cechy (`HERO_TRAITS.json`): `greedy` (chciwy), `coward` (tchórzliwy), `brave` (bohaterski), `careful` (ostrożny); około połowa bohaterów ma cechę (sekcja 04). Łowca skarbów (`hunter`) ma zawsze cechę `greedy`.

### 6.5.1 Wojownik

- **Szarża** (`planHero` praca nr 10): spośród żywych potworów nie unoszących się w **swoim** pokoju wybiera najbliższego (koszt `0 < B().dist <= 6`), ale tylko "mądre" walki: `rank === 0` (nowicjusz bije wszystko) albo łucznik albo (`hp > 0.6 max` i nie ogr). Gdy wybrał: `{fight, pole potwora}`, przy zmianie intencji `SAY.fight` (2). Gdy jest potwór, którego unika, a nie ma innego: z szansą 0,3 `SAY.avoid` (2), od 1.17 raz na potwora (`h.avoidM`); do 1.16 kwestia mogła wracać przy każdym planie (6.8).
- **Tarcza** (`updateHero`, przed krokiem): przy wejściu na pole z `fl.danger > 1`, gdy `time > shieldCd` i nie `fearless`: `shieldUpUntil = time + 2.5`, `shieldCd = time + R.shieldCd` (`max(2, 6 - 0.3*(lvl-1))`), kwestia (2): od 1.17 `SAY.shieldLead` ("za mną" jest prawdą), gdy wojownik jest przywódcą, nie wychodzi i prowadzi naprzód (intencja `lead`, `heart` albo `detour`), inaczej `SAY.shield` (do 1.16 zawsze `shield`, z kwestią "Za mną, osłonię was!" także u cofającego się albo idącego za kimś). Tarcza osłania też tych tuż za nim (sekcja 05). Przed groźnym pokojem: 5 s tarczy (6.3.8).
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
inaczej:                                     it.disabled = true do końca fali; SAY.disarmDone (2), a przy przeklętym straszaku
                                             (egzorcyzm kapłana, ten sam stan 'disarm') od 1.17 SAY.blessDone (2)
potem: walk, needPlan
```
  Jeśli rozbrajana pułapka odpali (skill check gracza), rozbrajający przerywa i krzyczy `SAY.disarmHit` (3, loud), a kapłan przy przeklętym straszaku od 1.17 `SAY.blessHit` (do 1.16 też `disarmHit`, np. "Rozbrojone!" z ust kapłana) (`p4_traps.js: fireRaw`); od 1.13.4 liczy to w `h.disarmHits` (mapa pułapka -> ile razy) i za drugim razem odpuszcza tę pułapkę do końca fali (`h.disarmT = null`, `stats.disarmQuit`).
  Dlaczego tak (1.13.4): drogą była bieżąca ścieżka lidera, a złodziej-lider idzie własnym objazdem do pułapki. Na miejscu rozbrajania jego ścieżka była pusta, więc pułapka "nie leżała na drodze"; prowadził dalej, krok później znów leżała i wracał, co 0,4 s, w linii strzału (run testera: fala 2, od 55 do 10 HP w 12 s; w powtórkach tej fali w 9 z 20 prób, ze słabszym graczem w 6 z 16; po zmianie w 0 z 10 i 0 z 16). Inni (poz. 3+, nie złodzieje) czekają, zamiast wejść na pole w obszarze rozbrajanej pułapki (`fl.disarmKeys`, 6.2.6).
- **Wykrywanie**: +2 do zasięgu `scanTraps` (6.3.5).
- **Unik** (`p3_flow.js: damage`, sekcja 05): pojedyncze trafienie kolcami albo strzałami, gdy nie jest "trzymany" (`held`), raz na 3 s, szansa `R.dodge`; `SAY.dodge` (2, loud).
- **Zwiad** na naradzie (6.3.3); **podważanie kraty** (6.3.11, 3 s, poz. 6+ x1,5 szybciej); **preferowany ratownik** z klatki i szybszy (0,8 s zamiast 1,8 s, 6.5.9).
- Mniej się gubi (`lostChance -0.1`, mgła x0,6), rzadziej skręca źle (`-0.03`), rzadziej się ślizga (x0,6), dalej sięga po łupy (11 kroków), złoto ceni wyżej (`need 1.6`), `T.greed = 1.5`.
- Kryształu nie wyważa szybciej niż inni (`stealNeed` nie zależy od klasy).

### 6.5.3 Kapłan

- **Wiara** (`heroAbilities`): pula `faithMax = 6 + floor(lvl/2)`, +1 co 12 s; przy `faith >= 2` znika flaga "już mówiłem, że brak wiary". Od 1.17 `heroAbilities` kapłana i maga kończy się zaraz po odliczeniu `cast`, `barrierCd`, `dispelCd`, gdy panikuje albo ucieka (`panicking(h) || h.fleeing`): wtedy nie modli się, nie czaruje i wiara się nie odnawia.
- **Co sekundę** (`h.cast = 1`, modlitwa `cast = 3`), `near` = żywi w odległości <= 3 (z nim samym), Ołtarz w jego pokoju = wszystko x0,5 (`ak`):
```
spend(n): faith >= n -> faith -= n, true; inaczej raz SAY.faithLow (3), false
1 klątwa (poz. 4+, faith >= 3): 1.17: najpierw przeklęty przyjaciel w near, potem on sam -> spend(3): cursed = false; cast 3;
     przyjaciel: SAY.curseLift z imieniem (3); on sam: SAY.curseSelf (3, 1.17); return
2 leczenie (1 wiara), gdy ktoś płonie (albo krwawi) || najsłabszy w near < 0.75 max || suma brakującego HP w near > 0.6 * jego max:
     cast 3; płonący: gaszenie zamiast leczenia (burnUntil = time); reszta: +min(22 * R.pow * ak, brakujące)
     1.17.1: cleansed = (cleansed === 'fire' || o.burnBy !== 'spikes') ? 'fire' : 'blood'   // choć jeden płonący = ogień
3 duchy, cienie, nietoperze w odległości <= 3 (pozycja unoszenia): gdy cast === 3 (modlił się) albo faith > 0:
     cast 3; każdy dostaje 25 * R.pow * ak (gratis, część modlitwy)
4 Ołtarz i wyleczył: z szansą 0.25 SAY.bAltar (2), 1.17.1 w sayNow(['altar'])
5 gaszenie: stats.cleanses++; 1.17.1: cleansed === 'fire' -> sayNow(['fire'], SAY.cleanse (3))
                                   cleansed === 'blood' -> sayNow(['spikes', 'blood'], SAY.staunch (3))   // tamuje krwawienie
6 bariera (3 wiary): barrierCd <= 0 && near >= 2 && (pułapka trafiła kogoś < 2 s temu || ktoś w near < 0.45 max) && faith >= 3:
     shield = max(shield, 12 * R.pow * ak) każdemu w near; barrierCd = 14; SAY.barrier (3); cast 3
7 wyleczył: Groza dla gracza (healed / h.max * GZ.heal * depthMult, sekcja 03); SAY.heal (1), chyba że gasił
```
  Do 1.16 kapłan modlił się także w panice i w ucieczce (6.8 #16, naprawione w 1.17).
  Do 1.17 krwawienie z kolców (`burnBy 'spikes'`, sekcja 05, 5.3.2) też było "gaszone" kwestią `SAY.cleanse` ("Gaszę ogień!"); od 1.17.1 kapłan, który zatamował tylko krwawienie, mówi `SAY.staunch` (6 kwestii, sam: `SOLO.staunch`, 3). Gdy w `near` płonie choć jeden, mówi `cleanse`. Obie kwestie idą w `sayNow` (6.7.10), więc filtr dopuszcza tylko kwestie o ogniu albo o krwi i kolcach.
- **Idzie do rannego** (`planHero` praca nr 3): od 1.17 najpierw ten, kto go wołał (`healFor`, przez 10 s, koszt drogi <= 20), inaczej najsłabszy z `hp < 0.5 max`, dalej niż 2,5, koszt drogi <= 12.
- **Wołanie o kapłana** (`partyThink` krok 22, wersja 1.05): gdy jest kapłan (nie zgubiony, nie panikuje, nie w klatce), każdy inny z `hp < 0.4 max`, który nie wychodzi, nie zgubiony, nie w klatce, nie panikuje, jest dalej niż 3 od kapłana i nie w Głuszy, od 1.17 tylko gdy kapłan słyszy jego krzyk (`canHearShout(pr, h)`), najwyżej co 14 s: `SAY.callHealer` z imieniem kapłana (2), kolejka kapłan `SAY.healerReply` (+1,1), `kapłan.needPlan`, od 1.17 `pr.healFor = h.id`, `pr.healForUntil = time + 10` (do 1.16 kapłan odpowiadał z dowolnej odległości, a potem szedł do najsłabszego, niekoniecznie do wołającego).
- **Zdejmowanie klątwy z portretów** (`blessJob`, praca nr 7, ranga 1+, `faith >= 1`): znane, nieodczynione straszaki z `CURSED` (`portrait`, `eyes`, `bones`, `mirror`) w odległości <= 8 od lidera, których nikt inny nie bierze; najbliższe miejsce z `disarmSpots`. Na miejscu: `faith--`, stan `disarm`, `timer = 1.5 * R.disarm * (Ołtarz ? 2 : 1)`, `SAY.bless` albo `SAY.bAltar` (3; od 1.17.1 `bAltar` w `sayNow(['altar'])`). Na koniec bez szansy wpadki i bez saperki: odczyniony do końca fali, kwestia `SAY.blessDone` (1.17); przerwany odpaleniem: `SAY.blessHit` (1.17).
- **Wyczuwa przeklęty skarb** (poz. 6+, 6.4.2). **Osłona przed groźnym pokojem** (6.3.8). Kapłan rangi 1+ uspokaja innych w promieniu 3 (mniej strachu, sekcja 05). Żaden kapłan nie idzie po legendarny łup w nieznane (6.4.3).

### 6.5.4 Mag

- **Rozproszenie sieci** (`heroAbilities`, przed sprawdzeniem `cast`): gdy `dispelCd <= 0`, nie panikuje i (od 1.17) nie ucieka: pierwsza strefa sieci (`fl.zones`), na której stoi jakiś bohater w odległości <= 4 od maga -> strefa znika, stojącym w niej `slowUntil = time`; `dispelCd = 8`; `SAY.dispel` (3).
- **Kula ognia**: cel = najbliższy żywy potwór w **jego pokoju** w odległości < 4,5 (cień nigdy; duch nie, gdy karta `ghostPriestOnly`). Brak celu: `cast = 0.5`. Jest cel: `cast = 4`, `SAY.fireball` (1); unoszący się cel dostaje `30 * R.pow`; każdy nie-unoszący się potwór w kwadracie 3x3 wokół celu `30 * R.pow`. Od 1.17 mag w panice albo w ucieczce nie rzuca kul (do 1.16 rzucał, 6.8 #16).
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
| `greedy` | łupy x1,8, odwaga x1,3, złoto `need 1.6`, ścieżki `avoid x0.85`, głos na naradzie, protest przy szturmie, chciwy lider ulega; 1.17: nie słucha rozkazu "zostaw łup"; prosi o przeszukanie mebli (`lookWant`), meble przy rozglądaniu +2,5 i częściej znajduje monetę (0,3); jako przywódca pozwala się rozglądać najczęściej (0,55) i idzie sprawdzić dźwięk zza ściany; na naradzie storm +0,5, more +0,8 |
| `careful` | łupy x0,6, `avoid x1.3`, głos na naradzie, gasi entuzjazm chciwych (`surviveFirst`), kwestia `cautious` przy wejściu; 1.17: jako przywódca wybiera bliższe cele (odległość x1,15, mało przypadku), omija dźwięk zza ściany, pozwala się rozglądać (0,5); na naradzie home +0,4 |
| `coward` | panika już przy 55% odwagi; po śmierci przyjaciela strach x1,5; zgadza się na odwrót; głos na naradzie przy morale < 0.8; `cowardRun` przy ucieczce; 1.17: przy rozglądaniu zwykle zostaje przy przywódcy (0,6) albo ogląda coś najwyżej 3 pola dalej; jako przywódca trzyma się bliżej wyjścia i rzadko pozwala zwiedzać (0,15); na naradzie home +1,4, storm -0,9, częściej wraca sam po przegranym głosowaniu |
| `brave` | furia zamiast strachu po śmierci (tylko gdy ją widział, 1.17); protestuje przy odwrocie; odpowiada na naradzie tchórzowi; pociesza (`reassure`); 1.17: jako przywódca idzie w głąb, częściej "na czuja", idzie sprawdzić dźwięk zza ściany; na naradzie storm +1, more +0,2 |
| `hunter` | jak `greedy` + złoto bez kary elity; kwestia `hunters` przy wejściu (60%); 1.17: nie słucha rozkazu "zostaw łup"; na naradzie storm +0,8, more +0,6 |
| czempion | okrzyk przy cudzej ucieczce, gdy ją widzi albo słyszy (6.6.4); wyłamuje klatkę; 1.17: przy ucieczce drużyny wychodzi z nią, ale nie jest oznaczany jako uciekający; na naradzie storm +0,8 |
| bohater z przepowiedni | szturm po końcu cierpliwości bez narady (6.3.10), gniew przy połowie HP (6.6.4); wyłamuje klatkę |
| nowicjusz (1.17) | nie słucha rozkazu "zostaw łup"; prosi o rozglądanie się; jako przywódca częściej pozwala zwiedzać (+0,15) i idzie sprawdzić dźwięk |

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

**Decyzja** (`p5_ai.js: decideCage`, `partyThink` krok 11, dla każdego uwięzionego bez decyzji; od 1.17 dopiero, gdy przywódca słyszy krzyk z klatki (`canHearShout(L, c)`) albo minęło 20 s od zamknięcia (`c.cagedAt`, przywódca zauważa brak); `cageHero` usuwa go z `cageDecided`, więc każde uwięzienie to nowa decyzja):
```
P.cageDecided.add(c.id)
others = żywi inni, nie uciekają, nie w klatce
if !others || goingOut(): return                         // bez kwestii; zostaje bez ratunku
fearR = średnia fear/courage others
rescue = L.rank >= 2 || (fearR < 0.6 && rand < (L.rank === 0 ? 0.5 : 0.8))   // elita zawsze wraca
who = L === c ? others[0] : L
rescue: 1.17: jeśli już ratują kogoś innego, kto wciąż siedzi: c do kolejki P.rescueQ; inaczej P.rescueId = c.id; P.rescuerId = -1
        who: SAY.rescue z imieniem (3)
else:   P.abandoned.add(c.id); who: SAY.abandon (3); kolejka c: SAY.abandoned (+1); strach c +15 ('cage')
```
Do 1.16 naraz był tylko jeden `P.rescueId` i druga decyzja "ratujemy" zabierała ratownika pierwszemu (6.8 #14). Od 1.17 drugi czeka w `P.rescueQ`; gdy ratowany wyjdzie z klatki albo zginie, `partyThink` (krok 5c) bierze następnego z kolejki, który wciąż siedzi. Średni strach w `decideCage` liczy się nadal po wszystkich (`others`), nie po grupie przywódcy.

**Ratownik** (`planHero` praca nr 1): jeśli `P.rescuerId` nieważny (nie żyje, zbiegł, spada, w klatce, ucieka), nowy = spośród żywych (nie uwięziony, nie w klatce, nie ucieka; od 1.17 też nie zgubiony, nie wracający sam, nie na zwiadzie, i tylko ten, kto słyszy krzyk z klatki, jest przywódcą albo słyszy przywódcę) najpierw złodziej, potem najbliższy uwięzionemu. Do 1.16 ratownikiem mógł zostać zgubiony albo zwiadowca pokoje dalej, który szedł prosto do klatki, której nigdy nie widział (albo nigdy nie przychodził, a nikt inny nie szedł). Raz wybrany ratownik nie traci tej roli, gdy później się zgubi albo zacznie wracać sam (sprawdzane są tylko śmierć, wyjście, zapadnia, klatka i ucieczka). Tylko ratownik ma tę pracę: obok klatki (Manhattan <= 1) -> stan `free`, `timer = złodziej 0.8 : 1.8`; inaczej idzie do najbliższego `walkable` sąsiada klatki. Po czasie `freeCaged(c, true)`: klatka wygięta (wyłączona do końca fali), uwolniony `SAY.freed` (3), strach -15, a jeśli wciąż >= odwagi: `startFlee`.

**Koniec czasu klatki** (`p4_traps.js: cageEnds`): boss wyłamuje kraty (`SAY.cageBreak`, 4). Jeśli `P.rescueId === uwięziony` i ktoś może pomóc (nie w klatce, nie ucieka, nie zgubiony, nie spada): czeka do 8 s dłużej. Inaczej umiera w klatce (`SAY.cageDie`, 4, dur 2). Uwięziony nie zaczyna uciekać ze strachu (`addFear` pomija klatkę); do 1.16 `partyFlee` ustawiał mu `fleeing` (wtedy nikt go nie uwalniał), od 1.17 już nie (6.6.3). Strach w klatce: patrz 6.6.5 (nadal wie, czy ktoś wolny może pomóc i czy go porzucono, bez sprawdzania, czy słyszał decyzję).

### 6.5.10 Zapadnia: upadek i powrót (`p4_traps.js: fall, landFallen`)

Upadek (szczegóły obrażeń i strachu: sekcja 05): `gone = true`, stan `fallen`, ścieżka i praca przerwane, `SAY.fall` (4); lider/zwiadowca tracą funkcję. Po `fallUntil` (`mods.fallTime * max(1, pw)`, domyślnie 5 s) `landFallen`:
```
30 losowych pól pokoi (nie serca): z kryształem -> najdalej od wyjść (bfs noDanger); inaczej -> najdalej od lidera (+ losowe 0..3)
brak: pole pod wejściem
h.lost = L && (hdist(h, L) > 6 || pokój mgły); SAY.landed (4)
Bezdenny szyb (poz. 3): zawsze zgubiony, dodatkowy strach
```
Nie ma osobnej pomocy dla spadłego: wraca jako zgubiony (`getLost` nie jest wołane; `lostCallT` nie jest ustawiane, więc woła od razu przy najbliższym `partyThink`) i szuka drużyny jak każdy zgubiony (6.2.10). Od 1.17 przywódca i tak decyduje o szukaniu: brak `lostAt` sprawia, że `perceiveThink` zauważa go od razu, gdy go nie słyszy (`missLost`, 6.2.10), chyba że `lostNoticed` zostało z wcześniejszego zgubienia w tej fali. Jego `reveal` przy wyjściu może też odsłonić serce (`fl.heartBy` = on).

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
czempion (inny, żywy, nie spada, nie ucieka, nie w klatce; 1.17: widzi uciekającego albo słyszy jego krzyk), raz na 15 s: SAY.champShout (4);
   inni nieuciekający, którzy słyszą krzyk czempiona (1.17: canHearShout; wcześniej wszyscy): fear -= 0.25*courage
lider (inny, R.coord) z szansą 0.6, 1.17: tylko gdy widzi albo słyszy uciekającego: SAY.fleeShout (2)
crew = groupOf(leader()) (1.17; bez lidera: wszyscy żywi)
if plan nie 'flee'/'escape' && uciekających w crew >= max(2, ceil(crew/2)): partyFlee()
karta Panika: inni nieuciekający w odległości <= 3 dostają 25 * mods.panic strachu
```
Uciekający idzie do wyjścia (`exiting`), omija zagrożenia słabiej (`avoid x0.6`), biegnie x1,15, używa butów; jego strach nie wygasa. Nie podnosi łupów.

### 6.6.3 Ucieczka całej drużyny (`p3_flow.js: partyFlee`)

Wyzwalacze:
1. `partyThink`: `fearR > [0.75, 0.85, 0.95, 1][L.rank]` (średnia fear/courage grupy przywódcy, od 1.17; wcześniej całej załogi; nowicjusze pękają pierwsi) albo `P.morale < 0.2` przy liderze rangi 0-1;
2. `startFlee`: uciekających w grupie przywódcy jest co najmniej `max(2, ceil(grupa/2))` (od 1.17; wcześniej wśród wszystkich żywych);
3. `crystalReturns`: po utracie niosącego, gdy grupa przywódcy nie jest dość spokojna (6.3.9).
```
if plan 'flee' albo 'escape': return
P.plan = 'flee'
L = leader()
każdy żywy o, który jest L, słyszy krzyk L (canHearShout(o, L), 1.17) albo już ucieka (bez L: każdy):
   o.plan = 'flee'
   if !o.crystal && !caged(o) && o.boss !== 'champion': o.fleeing = true      // 1.17: uwięziony i czempion nie są oznaczani
   needPlan; rest/talk/boss/wait -> walk
L: SAY.partyFlee (4, dur 2.2)
```
Do 1.16 `fleeing` dostawał każdy żywy bez kryształu, także uwięziony w klatce (wtedy nikt go nie uwalniał, 6.8 #6) i spokojny zwiadowca dwa pokoje dalej. Od 1.17 kto nie słyszał krzyku, robi swoje i dostaje plan `flee`, gdy dołączy (6.3.13); czempion, który przed chwilą krzyczał, że nigdy nie ucieka, wychodzi z drużyną z planem `flee` (`exiting`), ale bez `fleeing` (wyjście nie liczy się jako wypędzenie strachem). Stany `disarm`, `smash`, `free`, `fight` same się przerywają przy `exiting`. Pozostali w kolejce czekają na zewnątrz (6.2.13).

### 6.6.4 Bossowie

- **Czempion**: okrzyk przy cudzej ucieczce, gdy ją widzi albo słyszy (6.6.2); obecność bossa zmniejsza strach (sekcja 05; od 1.17 tylko tym, którzy są z nim: widzą go albo słyszą, a boss nie siedzi w klatce i nie spada w zapadni); wyłamuje klatkę; przy ucieczce drużyny nie jest oznaczany jako uciekający (6.6.3).
- **Bohater z przepowiedni**: przy pierwszym spadku poniżej 50% HP (`p3_flow.js: damage`, raz, `h.raged`): +20% max HP, osłona 20% max, inni, którzy słyszą jego krzyk (od 1.17 `canHearShout`; wcześniej wszyscy w lochu), `fear -= 0.2 * courage`, `SAY.finalRage` (4, dur 2.4). W promieniu 3 od niego strach mniejszy (sekcja 05). Po końcu cierpliwości prowadzi szturm (6.3.10). Nie dostaje cechy.

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

Od 1.17 reaguje tylko ten, kto śmierć widział albo słyszał krzyk; reszta dowiaduje się później (pełny opis: 6.3.13).
- **Widział** (`canSee`, to samo miejsce): `shakenUntil = time + 9` (wstrząśnięty: wolniejsze wygasanie strachu, kwestie `shaken`, powód do pieśni barda). Odważny, barbarzyńca albo wojownik (30%), który nie ucieka: furia z imieniem zmarłego (`SAY.revenge`) i tylko 30% strachu. Pozostali: z szansą 0,55 `SAY.death` (albo `SAY.deathFlee`, gdy uciekają albo drużyna wychodzi; 4, dur 2.2) i strach (tchórz x1,5; liczby w sekcji 05).
- **Słyszał krzyk** (`canHearShout`, 14 kroków, nie przez Głuszę ani Kamień wyjec): `shakenUntil = time + 5`, z szansą 0,55 `SAY.deathHeard` (bez imienia, 3, dur 2), mniejszy strach (×1,3 dalekiego), bez furii.
- **Reszta**: nic, aż spotka kogoś, kto wie (`perceiveThink`: `tellDeath` z imieniem, `newsDeath`, 0,6 dalekiego strachu, wstrząs 5 s).
- `P.morale -= 0.25` (min 0,15) raz, gdy dowie się przywódca (od razu albo z wieści).

Do 1.16 każdy żywy w lochu dostawał wstrząs (9 s bliżej niż 8 pól w linii prostej, przez ściany, inaczej 5 s), furię albo kwestię z imieniem i strach, a morale spadało od razu. Ekwipunek zmarłego wypada jako łup. Zmarły lider/zwiadowca: funkcja zwolniona.

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
if !h || h.dead || h.fled || h.gone || !text || !fl: return false
prio = prio || 1; pool = null
if fl.phase === 'raid' && aloneNow(h):                             // 1.13.1: sam (6.7.5b)
   k = lineKey(text); kb = część k przed ':'
   SOLO[k] || SOLO[kb]: pool = ta lista; text = losowa z pool
   inaczej kb w SOLO_MUTE: return true                             // nie pada, "powiedziane"
if fl.phase === 'raid': text = fitLine(h, text, pool); if !text: return true   // 1.17.1: tylko o tym, co zna (6.7.10)
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
(sayHook(h, text, SAY_NOW): tylko testy, 1.17.1)
1.17.1: lineKey(text) zaczyna się od 'saw:' -> stats.sawTalk++
stats.lines++
if !hush: convoAfter(h, text)                                     // może zacząć rozmowę (6.7.5a)
if !loud:                                                         // zwraca się do słuchacza
   to = najbliższy (po tx,ty) inny w earshot; każdy inny w earshot i w odległości <= 4: lookAt(o, h.x, h.y)
   if to: lookAt(h, to.x, to.y)
return true
```

- Kwestia odrzucona przez wyższy priorytet aktywnego dymka **przepada** (nie trafia do kolejki).
- 1.17.1: `fitLine` działa przed sprawdzeniem dymka i kolejki, na tekście już zamienionym na `SOLO`. Do kolejki `h.sayQ` trafia tekst po dopasowaniu, a przy ponownej próbie z `sayTick` dopasowanie liczy się jeszcze raz (już bez rzeczy chwili, ale jej tagi są wtedy w pamięci). Kwestia, dla której nie ma pasującej, nie pada, a `say` zwraca `true` (jak przy `SOLO_MUTE`).
- `gtext` wybiera formę wg płci: szablon `{forma męska|forma żeńska}`. **Tylko prototyp:** podmiana wyrażeniem regularnym. Odpowiednik: Unity Localization (Smart Strings) z wyborem płci mówiącego.

### 6.7.3 Kolejki

**Kolejka bohatera** `h.sayQ` (najwyżej 2 wpisy) i `sayTick()` (każdy krok, `p3_flow.js`):
```
dla każdego bohatera: usuń wpisy z exp <= time; niepuste (i żywy) -> lista czekających
sortuj czekających: prio pierwszego wpisu malejąco, potem exp rosnąco (najstarszy pierwszy)
dla każdego: say(h, e.text, e.prio, e.dur, 'q'); udało się -> usuń wpis
```
Tryb `'q'` czeka tylko na `floorBusy` (nie na `othersWaiting`) i nie trafia ponownie do kolejki.

**Kolejka drużyny** `P.queueSay` (wpisy `{id, text, at, prio = 2, dur = 1.8, how = 'q', cv?, late?}`), obsługiwana na początku `partyThink`:
```
cur = P.queueSay posortowana po at; P.queueSay = []; P.queueCur = cur; held = []; cut = Set()     // 1.17: nowa tablica na nowe kwestie
dla każdego wpisu q z cur:
   if q.cv && cut ma q.cv: usuń                                        // reszta wymiany, która straciła kwestię (6.7.5a)
   if q.at > time: zostaw
   h = byId(q.id); if brak/dead/fled/gone || time - q.at > (q.late || 10): usuń (q.done = true; cv -> cut)   // moment minął
   if q.how !== 'loud' && ktoś z held jest w earshot h: held.push(h); zostaw   // odpowiedź czeka na kwestię, na którą odpowiada
   P.sayingQ = q; ok = say(h, q.text, q.prio || 2, q.dur || 1.8, q.how || 'q'); P.sayingQ = null
   ok: q.done = true; usuń;  inaczej: held.push(h); zostaw
P.queueCur = null; P.queueSay = pozostawione z cur + kwestie dodane w trakcie (np. przez rozmowę zaczętą tą kwestią)
```
Tak działają odpowiedzi, narady, przygotowania i dialogi: kolejne linie mają rosnące `at`, a linia czeka, aż wcześniejsza w zasięgu słuchu zostanie powiedziana.

Poprawka 1.17 (znaleziona przy przeglądzie kwestii): do 1.16 kwestia powiedziana z kolejki drużyny nigdy nie zaczynała rozmowy (6.7.5a), bo `convoStart` sprawdzał, czy w zasięgu słuchu czeka jakaś kwestia z kolejki, i widział w niej tę właśnie mówioną; a kwestie dopisane do kolejki w trakcie jej przeglądania (np. przez `say` w środku pętli) ginęły razem ze starą tablicą. Od 1.17 przeglądana kolejka to `P.queueCur`, nowe kwestie trafiają do świeżej `P.queueSay` (doklejanej po pętli), a kwestia właśnie mówiona (`P.sayingQ`) i już powiedziane w tym ticku (`q.done`) nie liczą się jako czekające, ani w `convoStart`, ani w `othersWaiting` (6.7.4). Dzięki temu rozmowy zaczynają się też od kwestii mówionych po kolei (rozglądanie się, wieści, odpowiedzi).

### 6.7.4 Zasięg słuchu i zajęta "podłoga"

```
earshot(a, b) = (roomOf(a.tx,a.ty) >= 0 && roomOf(a.tx,a.ty) === roomOf(b.tx,b.ty)) || hypot(a.tx-b.tx, a.ty-b.ty) <= 7
                 // ten sam pokój albo korytarz (wersja 1.11: 7 pól; wcześniej 2,5)
inChaos(h)    = time < h.panicUntil || h.fleeing || h.state === 'caged'
floorBusy(h)  = jakiś żywy bohater o (także sam h) ma o.saidUntil + SAY_GAP > time i earshot(h, o)
othersWaiting(h, prio) = jakiś żywy o w earshot(h, o) ma w sayQ niewygasły wpis z prio >= prio
                         || jakaś pozycja kolejki drużyny z at <= time ma mówiącego w earshot(h)
                            (1.17: w trakcie obsługi kolejki to P.queueCur bez q.done i bez P.sayingQ, plus nowa P.queueSay)
```
Bohaterowie w różnych pokojach (i dalej niż 7 pól) mówią jednocześnie. Bohater nie powie spokojnej kwestii, dopóki sam ma dymek (+0,3 s). `earshot` nie patrzy na ściany ani na Głuszę; percepcja z 1.17 (`canHear`, 6.0) dokłada warunek Głuszy, ale sam promień 7 pól w linii prostej został (rozmowy przez ścianę dwóch sąsiednich pokoi są możliwe).

### 6.7.5 Rozmowy drużyny

- **`partySay(k, prio, who)`** (`p5_ai.js`): ten sam klucz najwyżej co 5 s (`P.lastSay[k]`); mówi `who` albo lider; tekst losowy z `SAY[k]`. Używane dla: `rookieLead`, `explore`, `retreat`, `restDone`, `assault`, `regroup`.
- **Kto rozmawia** (od 1.13, decyzja autora 20.10: drużyna stawała w miejscu wszędzie, w innych pokojach i na pułapkach): `talkGroup(c)` = `c` (zwykle lider) i ci, którzy stoją z nim w tym samym miejscu: `samePlace(a, b)` = ten sam pokój albo korytarz (`roomOf(tx, ty)` równe i >= 0) albo odległość <= 3,5 pola; bez zgubionych, panikujących, uwięzionych, uciekających, zwiadowcy i jego partnera (`onScout`, 1.16) i wychodzących. Tylko oni dostają `h.talkUntil` i stają; reszta robi swoje (idący za liderem dochodzą do niego jak zwykle). Dwie grupy mogą rozmawiać naraz. `P.talkUntil` = koniec najpóźniejszej rozmowy (cierpliwość 6.3.10, blokada rozmów 6.7.8).
- **`talk(dur, lines, c = lider)`**: jeśli nie `fearless`, drużyna nie wychodzi, grupa niepusta i nikt z grupy już nie rozmawia: `koniec = time + max(dur, talkLen(lines))`, każdy z grupy `h.talkUntil = koniec`; linia `i` mówi `grupa[i % n]` (pierwsza: `c`) o `at = time + 0.65*i`. Zwraca grupę albo `null`.
- **`talkAs(dur, lines, c = lider)`** (wersja 1.05): jak wyżej, ale każda linia ma mówcę (`[bohater, tekst]`, `null` = ktokolwiek z grupy wg `i`), `at = time + 0.7*i`; od 1.13 linia mówcy spoza grupy przepada (na rozwidleniu głos mają tylko ci, którzy stoją z liderem, i tylko złodziej z grupy może zaproponować zwiad). Używane: narada na rozwidleniu. Od 1.12.1 narada dostaje jeszcze głos kogoś, kto nic nie powiedział (nie złodziej): `councilReply`, a po niej `huddleUp(L)`.
- **`talkLen(lines) = Σ (readT(t) + SAY_GAP) + 0,6`** (od 1.12.1; w 1.10-1.12 było `0.55 × Σ`, więc drużyna ruszała, zanim padła połowa kwestii): drużyna stoi tyle, ile trwa powiedzenie wszystkiego, jedno po drugim.
- **`huddleUp(L)`** (od 1.12.1, `p5_ai.js`; od 1.13 tylko uczestnicy rozmowy, `talking(h)`, a pole docelowe musi spełniać `standOk`, 6.2.16): w naradzie i przy przygotowaniu bohaterowie dalej niż 2 pola (Manhattan) od lidera podchodzą do najbliższego wolnego pola w promieniu 2 od niego (BFS po polach przejezdnych bez innych bohaterów i bez żywych potworów, nie dalej niż 7 kroków, nie na pole wyjścia); bliżsi zostają. W trakcie dojścia `h.huddle = true` (planHero ich nie przestawia, stan `talk` czeka na koniec drogi). Po dojściu (i ci, którzy stali blisko) odwracają się do lidera (`lookAt`, `h.huddleId`). Bohater w trakcie kroku dołącza po jego końcu.
- W trakcie `P.talkUntil` i odpoczynku cierpliwość płynie 2 razy wolniej (6.3.10). Spokój (autoprzyspieszenie i wolniejszy zegar combo) od 1.13 trwa także w scenkach, w tym na postoju przed groźnym pokojem (decyzja autora 20.10: "cisza niech trwa w trakcie odpoczynku bohaterów i narad również"); w 1.12.1 scenki go wyłączały (`sceneNow`, a `P.prep` nigdy nie był spokojem). Od 1.13 spokojem jest też chwila, gdy ktoś siedzi w zapadni, i gdy wszyscy są w klatkach (7.10.3).
- Stojący bohater z `fl.time < h.talkUntil` (nie wychodzący, nie zgubiony, nie panikujący, nie zwiadowca, nie wędrujący, nie w drodze do narady ani z pułapki) przechodzi w stan `talk` (6.1.8); do 1.12.1 robił to każdy w czasie `P.talkUntil`. Przygotowanie przed groźnym pokojem też ustawia `h.talkUntil` swojej grupy (6.3.8); specjaliści przygotowania (kapłan, mag, złodziej, wojownik) są brani tylko z tej grupy.
- Narada na końcu cierpliwości (1.17, 6.3.10a) i spór o rozglądanie się (`lookWant`/`lookHurry`, 6.3.3a) idą przez `talkAs` jak narada na rozwidleniu.
- Inne krótkie dialogi przez `P.queueSay`: spór o łup (`lootStop`/`lootReply`, od 1.17 też `lootObey`), porzucenie (`abandon`/`abandoned`), szukanie zgubionego (od 1.17 `searchFail` przy pustym miejscu), wieść o śmierci (`tellDeath`/`newsDeath`, 1.17), kwestie rozglądania się (`lookStay`, `lookObj`..., `lookFind`, `lookNothing`, `lookEnd`, 1.17), dźwięk zza ściany (`hearSound`/`hearScream`, 1.17), `learn` (1.17), odpowiedź na wołanie, wołanie o kapłana, podanie mikstury, protest przy szturmie i odwrocie, podziękowanie za pieśń, reakcja na trafienie przyjaciela (`friendHit`, głośna, +0,5 s, gdy pułapka zabrała >= 25% max HP, najbliższy w odległości <= 4 nieuciekający, nie panikujący, nie zgubiony; najwyżej co 5 s dla całej drużyny).

### 6.7.5a Rozmowy bohaterów (od 1.13, `p5_ai.js: lineKey, convoAfter, convoStart, convoFill`; dane `CONVO`, `CONVO_ALIAS`, `CONVO_P`)

Decyzja autora (20.10): "dajmy im konwersacje": bohaterowie mają komentować nawzajem swoje dymki, działania, błędy i sukcesy, a nie tylko rzucać pojedyncze kwestie.

```
say(h, text, ...) udana i nie w Głuszy -> convoAfter(h, text)
convoAfter(h, text): k = lineKey(text)            // klucz SAY tej kwestii; zagnieżdżone: 'trap:spikes', 'phobia:fire', 'lookProp:mirror'
                     if k: convoStart(h, k)
lineKey(t): mapa dokładny tekst -> klucz budowana raz ze wszystkich list SAY (pierwszy klucz wygrywa)
            1.17: kwestia z imieniem ({n} {a} {v} {g}) jest mówiona już wypełniona, więc dla takich kwestii powstaje też wzorzec:
            tekst z uciekniętymi znakami specjalnymi, każdy znacznik imienia -> '.+?', całość ^...$; gdy dokładnego tekstu
            nie ma, sprawdzane są wzorce po kolei (do 1.16 kwestie z imieniem nie miały klucza: ani SOLO, ani rozmów)
zabicie potwora (hurtMonster, hp <= 0): zabójca = bohater z h.foe == m -> convoStart(zabójca, 'monsterDown')

convoStart(A, key):
  stop gdy: nie fala / koniec fali; time < P.convoT ('breath'); talking(A) ('talk');
            w kolejce drużyny (P.queueCur i P.queueSay, bez P.sayingQ i q.done, 1.17) czeka kwestia kogoś w zasięgu słuchu A ('queue')
  zestaw = CONVO[key] || CONVO[CONVO_ALIAS[key]] || CONVO[klucz bazowy]; brak -> koniec
  rand > CONVO_P[key] (albo aliasu, bazowego; domyślnie 0,5) -> 'luck';  A w Głuszy -> 'hush'
  słuchacze = żywi w zasięgu słuchu A (6.7.4), nie zgubieni, nie w klatce, nie w chaosie, nie w rozmowie; brak -> 'alone'
  pasujące wymiany: A nie zniknął/nie zginął, jeśli mówi; klasa i charakter A (ac, at); 1.17.1: A zna wszystkie swoje
     kwestie wymiany (knows(A, 'A'): lineOk na każdej kwestii roli A, 6.7.10); B ze słuchaczy z klasą b, charakterem bt,
     rangą <= br i >= bv, 1.17.1: którzy znają wszystkie kwestie roli B; wymiana z C wymaga 2 słuchaczy. Waga w × 1,6,
     gdy wymiana ma warunki (pasujące do sytuacji wygrywają z ogólnymi). Brak -> 'fit'
  B = losowy pasujący, C = losowy inny słuchacz (1.17.1: tylko z tych, którzy znają kwestie roli C; brak -> C = null,
     a kwestie C są pomijane przy wstawianiu do kolejki)
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
- Od 1.17 (6.7.3) rozmowę może zacząć też kwestia powiedziana z kolejki drużyny (do 1.16 `convoStart` widział w kolejce tę samą kwestię i zawsze odmawiał 'queue'). Mówiący w trakcie rozmowy drużyny (`talking`) dalej nie zaczyna wymiany.
- Zestawy: liczby w 6.7.9; od 1.17 każdy zestaw ma ok. 3 razy więcej wymian, a nowe zestawy to `lookObj`, `lookProp:portrait`, `lookProp:mirror`, `lookProp:coffin`, `lookKind`, `lookFind`, `lookNothing`, `newsDeath`, `deathHeard`, `goHomeAlone`, `councilGiveIn`, z `CONVO_P`: `lookObj` 0,35, `lookKind` 0,45, trzy `lookProp` 0,45, `lookFind` 0,6, `lookNothing` 0,25, `newsDeath` 0,7, `deathHeard` 0,6, `goHomeAlone` 0,8, `councilGiveIn` 0,5. Zestawy z 1.13: wpadki (`trap`, `trap:web`, `trap:trapdoor`, `trap:cage`, `scare`, `trap:portrait`, `hurt`, `disarmFail`, `disarmHit`, `slip`, `cursedPick`, `panic`, `cowardRun`, `crystalDrop`), sukcesy (`disarmDone`, `dodge`, `monsterDown`, `detect`, `resistHit`, `loot1-3`, `gold`, `freed`, `found`, `steal`), moce i działania (`shield`, `heal`, `fireball`, `fight`, `smash`, `rage`, `song`, `bless`, `cleanse`, `barrier`, `charmUse`, `bootsUse`, `potion`, `timing`), lęki (`phobia:*`, `ghost`, `bats`, `spider`, `lull`, `nightmare`, `seenBuilt`), drużyna (`enter`, `champion`, `rookie`, `rookieBoast`, `vetWarn`, `elite`, `explore`, `cautious`, `heartSeen`, `assault`, `retreat`, `restDone`, `rumor`, `fame2`, `gateWait`, `nap`, `goldHeavy`, `weakHit`, `learn`, `alone`, `landed`).
- 1.17.1: sprawdzenie `lineOk` dzieje się w chwili `convoStart`, na surowym tekście z `CONVO` (przed `convoFill`), czyli w trakcie rzeczy chwili kwestii, która zaczęła rozmowę (`SAY_NOW`, 6.7.10). Kwestie wymiany mówione później z kolejki przechodzą jeszcze przez `fitLine` w `say`, ale wypełnione znaczniki `{A:...}`, `{An}` nie pasują już do wzorców, więc dla nich liczy się tylko to sprawdzenie (6.8 #34). Nowe zestawy 1.17.1: `saw` (15 wymian, `CONVO_P` 0,45) i `rkEnter` (8 wymian, 0,4).
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
- 1.17: nowe klucze `SOLO` dla kwestii, które mogą paść, gdy nikogo nie ma w pobliżu: narada samotnego przywódcy (`councilOpen`, `decideHome`, `decideStorm`, `decideMore`), rozglądanie się w pojedynkę (`lookStart`, `lookEnd`), `scoutBack`, `partyFlee`, `gateLever`, `detour`, `detourBack`, `fogGrope`, `searchLost`, `leaveLost`, `heartLater`, `prophecy`, `gateReroute`, `disarm`, `chatFlee`, `rtFog`, `rtSwamp`, `rtGrotto`, `rtGears`, `rtIce`, `rtVault`, `rtHaven`, `shieldLead`, `hearSound`, `hearScream`; dotychczasowe klucze dostały ok. 3 razy więcej kwestii (liczby w 6.7.9). Kwestie `SOLO` nie mają imion (`{n}` nie jest wypełniane).
- 1.17: `SOLO_MUTE` dostało kwestie specjalistów przygotowania (`prepWard`, `prepJam`, `prepDisarm`, `prepShield`): samotny nie mówi, co zrobi dla drużyny.
- 1.17.1: `SOLO_MUTE` dostało `saw` (o tym, co widział, sam nie mówi; small talk samotnego i tak nie bierze `sawTalk`), a `SOLO` klucz `staunch` (3 kwestie: kapłan sam tamuje sobie krwawienie). Kwestia z `SOLO` przechodzi przez filtr pamięci jak każda inna, a zamiennik jest losowany z tej samej listy `SOLO` (`fitLine(h, text, pool)`, 6.7.10).
- 1.17: dzięki wzorcom w `lineKey` (6.7.5a) kwestie z imieniem też mają klucz, więc samotny dostaje ich wersję `SOLO` albo je przemilcza (`SOLO_MUTE`), zamiast mówić do powietrza z czyimś imieniem.

### 6.7.6 Small talk (`p5_ai.js: partyThink` krok 21)

```
P.chatT -= dt; if P.chatT > 0: koniec
P.chatT = P.plan === 'retreat' ? 3.5 + rand*3 : 7 + rand*6
pool = żywi bez dymka, nie panikują, nie w klatce, nie zgubieni, nie w stanie fight/smash, !floorBusy(o)   // tylko w ciszy
h = losowy z pool; lines = []; mood = null
if h sam (aloneNow) i nie wychodzi: SOLO.chat + SOLO['chat_' + cecha] (odważny przestraszony nie) + SOLO['chat_' + klasa]   (6.7.5b)
elif h wychodzi/niesie/ucieka: lines += chatFlee; niesie -> + chatCarrier dwa razy; hp < 0.4 max -> + chatHurtOut
elif P.plan === 'retreat':   lines += chatRest + restScene
else:
   scared = fear > 0.5*courage; shaken = time < shakenUntil + 6
   hp < 0.4 max:                 SAY.chatHurt (1.17; do 1.16 2 kwestie zaszyte)
   ma przedmiot && !scared:      2 kwestie składane o pierwszym przedmiocie z plecaka (HITEMS: name, acc, g; nadal w kodzie)
   scared:                       SAY.chatScared (1.17) ; mood 'fear'
   shaken:                       SAY.shaken dwa razy ; mood 'fear'
   gold >= 2:                    SAY.goldHeavy + SAY.chatGold (1.17)
   cursed:                       SAY.cursedPick
   kapłan z faith <= 1:          SAY.faithLow
   ktoś inny < 0.3 max, 1.17: którego h widzi albo słyszy (canSee/canHear): jedna z SAY.friendLow z jego imieniem
   fl.greed > 1.5 && !scared && !shaken && hp > 0.5 max && nikt jeszcze nie zginął w tej fali:
                                 SAY.chatRich (1.17) ; mood 'greed' (jeśli nie 'fear')
   cecha z SAY['chat_' + cecha] (oprócz odważnego, gdy scared): cała lista
   bard: SAY.bardIdle; barbarzyńca: SAY.barbIdle
   rank 0 && !scared: SAY.rookie; rank 2+: SAY.elite
   zawsze: SAY.chatIdle (1.17; do 1.16 3 zaszyte: "Słyszycie to?", "Trzymajcie się blisko.", "Patrzcie pod nogi.")
1.17.1: sl = (h && !aloneNow(h) && !(h.fleeing || h.crystal || goingOut())) ? sawTalk(h) : []   // 6.7.10
        lines += sl
        fit = h ? (sl niepuste && rand < 0.45 ? sl : okLines(h, lines)) : []   // prawie połowa pogaduszek o tym, co widzieli
line = losowa z fit (brak -> null)
stats.chatTry++; line -> stats.chatPick++
if line && say(h, line, 1, 2.2):
   fearLine  = mood 'fear' i linia z SAY.shaken albo SAY.chatScared
   greedLine = mood 'greed' i linia z SAY.chatRich
   ans = (Głusza w pokoju h) ? null
       : fearLine  ? inny: nie panikuje, nie zgubiony, (brave || lider || bard), hdist <= 6
       : greedLine ? inny: nie zgubiony, careful, hdist <= 6 : null
   if ans && rand < 0.6: kolejka ans: (fearLine ? SAY.reassure : SAY.surviveFirst) (+1.6)
   elif !ans && CHAT_REPLY[line] && rand < 0.55:
      o = inny w earshot, nie zgubiony, nie panikuje, nie w klatce
      1.17.1: rep = okLines(o, CHAT_REPLY[line]); rep niepuste -> kolejka o: losowa z rep (+0.4, prio 1)
```
Wersja 1.17.1: pula jest filtrowana pamięcią mówiącego (`okLines`: tylko kwestie, których tagi zna, 6.7.10), także pula `SOLO` samotnego i kwestia `friendLow` z imieniem; pogaduszki `SAY.saw` dochodzą tylko w towarzystwie (`sawTalk`: 2 najświeższe tematy i 1 losowy wcześniejszy). Odpowiedź z `CHAT_REPLY` jest filtrowana pamięcią odpowiadającego; gdy żadna mu nie pasuje, nikt nie odpowiada.

Wersja 1.05: small talk "wie, co się dzieje": w drodze do wyjścia o wyjściu, przy odpoczynku o ranach, bez rozmów o bogactwie, gdy ktoś się boi, jest ranny albo ktoś zginął.

Śmierć nadal blokuje rozmowy o bogactwie przez `fl.stats.kills` (ktokolwiek zginął w tej fali, także pokoje dalej i bez wieści), a nastrój "wstrząśnięty" (`shakenUntil`) ma od 1.17 tylko ten, kto o śmierci wie (6.3.13).

`CHAT_REPLY.json`: obiekt `tekst kwestii -> lista odpowiedzi`. Klucze to dokładne teksty kwestii (z `SAY.chatRest`, `SAY.chatIdle`, `SAY.chatHurt`, `SAY.chat_*`, `SAY.rookie`, `SAY.elite`, `SAY.restScene` i innych kwestii small talku), odpowiedzi mogą mieć szablon płci (`{m|ż}` to płeć odpowiadającego). W 1.17 tabela urosła z 19 kwestii i 31 odpowiedzi do liczby podanej w 6.7.9: 17 starych kwestii zostało (z 29 odpowiedzi zrobiło się 87), dwie wypadły razem ze swoimi kwestiami ("Nie siadaj na tej płycie!", "Ta płyta jest luźna. Omijamy."), doszło 58 nowych kwestii (z nowych linii small talku). **Tylko prototyp:** dopasowanie po tekście. Odpowiednik: klucz po identyfikatorze kwestii (np. `chatRest/0`), żeby tłumaczenia nie psuły dopasowań.

### 6.7.7 Patrzenie (`p3_flow.js: lookAt`, `p5_ai.js: glance`)

- `lookAt(h, x, y)`: tylko gdy stoi (`nx === null`); `s = (x - h.x) - (y - h.y)`; jeśli `|s| > 0.3`: `h.face = s > 0 ? 1 : -1` (lewo/prawo na ekranie w rzucie izometrycznym, sekcja 08).
- Przy spokojnej kwestii mówiący patrzy na najbliższego słuchacza, a słuchacze w odległości <= 4 na niego (6.7.2).
- Przy obrażeniach (`damage`): wszyscy w odległości Manhattan <= 5 odwracają się do rannego.
- `glance(h)` (wersja 1.10), stojący w stanie `talk` albo `wait`, co `1.6 + rand*2.8` s, nie gdy sam mówi: punkty = inni w earshot + łupy widziane w tej fali i znane nierozbrojone elementy w odległości Manhattan <= 6; z szansą 0,75 patrzy na losowy punkt, inaczej odwraca się (`face = -face`). (Warunek obejmuje też `rest`, ale ten stan kończy `updateHero` wcześniej, 6.8.)
- 1.17: oglądający rzecz przy rozglądaniu się patrzy na nią (`lookAt` co plan, `glanceT = 1`, więc się nie rozgląda); po dźwięku zza ściany ten, kto usłyszał, i każdy w jego zasięgu słuchu odwracają się w stronę pułapki (`glanceT = 2.5`, 6.3.3a).

### 6.7.8 Kwestie zaszyte w kodzie i szablony

Od 1.17 prawie wszystkie kwestie są w `SAY`. Do 1.16 w kodzie siedziały: błądzenie lidera we mgle (3 kwestie), złodziej przy kracie (1), ranny idzie po miksturę (2), zauważona mikstura (3), small talk: ranny (2), strach (2), złoto (1), bogactwo (2), ogólne (3), i okrzyk `'Pułapka!'` dla typu bez tekstu; teraz to klucze `fogGrope`, `gateLever`, `lootPotionNeed`, `lootPotionSeen`, `chatHurt`, `chatScared`, `chatGold`, `chatRich`, `chatIdle`, `trapGeneric` (6.7.9), a zdrowy, który idzie po miksturę, ma własne `lootPotion` (do 1.16 mówił `loot1`, np. "Złoto!"). W kodzie zostały tylko kwestie składane z danych (w Unity przenieś je do tabeli kwestii pod nowymi kluczami; proponowane klucze w nawiasach):

| Gdzie | Kwestie | Proponowany klucz |
|---|---|---|
| `giveItem`, nowy przedmiot | `'Mam ' + itemAcc(item) + '!'` (biernik z przymiotnikiem rzadkości) | `gotItem` z parametrem |
| `partyThink`, small talk o przedmiocie | 2 kwestie składane o pierwszym przedmiocie z plecaka (`HITEMS`: `name`, `acc`, `g`) | `chatItem` z parametrem |

`SAY.trap` (od 1.17) to mapa `typ pułapki -> lista` (do 1.16 jeden tekst na typ); losuje `pickS` (`p1_config.js`: lista -> `pick`, tekst -> on sam), więc kod przyjmuje obie postaci.

Szablony w tekstach `SAY.json` (sprawdzone skryptem): `{m|f}` forma wg płci mówiącego (`gtext`); `{n}`, `{a}`, `{v}` imię drugiej osoby w mianowniku, bierniku, wołaczu (`nameFill`, `NAMES_M/NAMES_F` mają 3 przypadki); od 1.17 `{g}` dopełniacz ("bez Wandy", "głos Borysa": `nameGen`, niżej); `{k}` liczba plotek o pułapkach (`rumorStart`). Klucze z imieniem: `death`, `deathFlee`, `rescue`, `abandon`, `revenge`, `curseLift`, `searchLost`, `leaveLost` (też `{g}`), `friendLow`, `friendHit`, `callHealer`, `bardCall`, `answer`, od 1.17 `hearScream` (też `{g}`) i `tellDeath`. Linie z `{n}/{a}/{v}/{g}` muszą dostać bohatera (`nameFill(pick(SAY.k), inny)`); w Unity: parametr "druga osoba" w Smart String. Kwestie `SOLO` nie mają imion.

**`nameGen(h)`** (1.17, `p1_config.js`): mężczyzna: dopełniacz = biernik (`nm[1]`, "Borysa"); kobieta: z mianownika: końcówka `-ia` -> `-ii` ("Zofia" -> "Zofii"), `-ka`/`-ga`/`-la` -> `-ki`/`-gi`/`-li` ("Jadwiga" -> "Jadwigi", "Hela" -> "Heli"), inne `-a` -> `-y` ("Wanda" -> "Wandy"). `nameFill` podmienia `{n}`, `{a}`, `{v}`, `{g}` (każdy znacznik raz, pierwsze wystąpienie). Do 1.16 kwestie "bez {a}" dawały biernik ("bez Wandę"); poprawione na `{g}`. W Unity: dopełniacz jako czwarta forma imienia w danych (`NAMES_M/NAMES_F`) albo ta sama reguła.

**Kwestie z imieniem a klucz** (`lineKey`, 6.7.5a): od 1.17 rozpoznawane wzorcem, więc działają dla nich `SOLO`, `SOLO_MUTE` i rozmowy. **Tylko prototyp:** dopasowanie po tekście i wyrażeniach regularnych; w Unity klucz kwestii przekazywany razem z tekstem.

### 6.7.9 Katalog kluczy `SAY.json`

**Rozmiar tabel kwestii (Prototype 1.17.1, policzone na `data/*.json`; jedyne miejsce w tej sekcji z tymi liczbami, tabela z poprzednimi wersjami także w załączniku A, A.5):** `SAY` 272 klucze, 3173 kwestie (1.17: 269 kluczy, 2535 kwestii; 1.16.1: 222 klucze, 669 kwestii; mediana długości w 1.17 26 znaków, 90% do 38, najdłuższa 58); `SOLO` 68 kluczy, 434 kwestie (1.17: 67 / 431; 1.16.1: 38 / 89); `CONVO` 87 zestawów, 520 wymian, 1125 kwestii (1.17: 85 / 497 / 1073; 1.16.1: 74 / 143 / 305); `CHAT_REPLY` 75 zaczepek, 206 odpowiedzi (bez zmian od 1.17; 1.16.1: 19 / 31); `LINE_NEEDS` (1.17.1) 57 tagów, 803 wpisy (802 różne kwestie: 614 z `SAY`, 128 z `CONVO`, 55 z `SOLO`, 4 kwestie `SAY` będące zaczepkami `CHAT_REPLY`, 2 odpowiedzi `CHAT_REPLY`). 1.17.1 dodało `SAY.saw` (58 tagów po 9 = 522), `SAY.rkEnter` (12 po 9 = 108), `SAY.staunch` (6), 2 kwestie `phobia.spiders` (o pajęczynie) i `SOLO.staunch` (3); 2 kwestie `smashB` przepisano tak, żeby pasowały do każdej budowli ("Precz z tym paskudztwem!", "Topór rozwiąże ten problem!"). Klucze nowych zachowań z 1.17 (narada, rozglądanie się, dźwięki, wieści, rozdzielone klucze) mają zwykle po 9 kwestii (`tellDeath` 7; mapy `lookObj`, `lookProp`, `lookKind`: 9 na podklucz) i po 6 w `SOLO` (`shieldLead`, `hearSound`, `hearScream` po 3); klucze przeniesione z kodu mają 3-9; stare klucze ok. 3 razy więcej niż w 1.16; `SAY.trap` ma po 3 kwestie na typ. Kwestie pisało 9 równoległych przebiegów z walidatorem (szablony, długość <= 60, bez pauz i cudzysłowów, bez powtórzeń), a każdą starą kwestię sprawdzono z jej wyzwalaczem w kodzie (ok. 120 przepisanych albo usuniętych).

Wartość to lista wariantów (losowany jeden, `pick`), a dla `trap` mapa `typ pułapki -> lista` (od 1.17; wcześniej jeden tekst, losuje `pickS`), dla `trauma`, `weakHit`, `resistHit` mapa `typ obrażeń (pierce, blunt, fire, poison) -> lista`, dla `phobia` mapa `fobia (fire, spiders, closed, ghosts, blood, dark) -> lista`, od 1.17 `lookObj` (barrel, crate, statue, shelf), `lookProp` (portrait, mirror, eyes, coffin, bones) i `lookKind` (12 komnat: goblin, spider, ogre, haunt, bats, ossuary, armory, forge, prison, junk, gallery, nursery) `-> lista`, od 1.17.1 `saw` (58 tagów pamięci, 6.7.10) i `rkEnter` (`k_<komnata>`, 12) `-> lista`. Teksty są w pliku; tu tylko kiedy padają.

Od 1.17.1 każda kwestia w fali przechodzi przez filtr pamięci (`fitLine`, 6.7.10): kwestia z tagami z `LINE_NEEDS`, których mówiący nie zna, jest zamieniana na pasującą z tej samej listy albo nie pada. Kolumna "Kiedy" mówi, kiedy kod sięga po klucz, a nie, że kwestia na pewno padnie.

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
| `gate` | otwarcie wejścia po `GATE_T` (`p6_loop.js: step`) | przywódca (od 1.17 `leader()`, bo kwestie mówią "za mną"; do 1.16 `alive()[0]`) | 2, d 1.6 |

**B. Prowadzenie, eksploracja, mapa**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `explore` | `chooseTarget`: nowy cel bez narady, szansa 0,35 | lider | PS 1 |
| `rookieLead` | `chooseTarget`: lider rangi 0 zmienił cel, szansa 0,3 | lider | PS 1 |
| `deliberate` | narada na rozwidleniu: otwiera lider (do 1.16 ten sam klucz był też drugim głosem "ktokolwiek") | lider | K (`talkAs`) |
| `deliberate2` | 1.17: narada na rozwidleniu, drugi głos "ktokolwiek", gdy nikt inny nie zabrał głosu, a ktoś stoi przy liderze | ktoś z grupy (nie lider) | K |
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
| `fogGrope` | 1.17 (do 1.16 zaszyte): lider błądzi we mgle (6.2.10) | lider | 3 |
| `regroup` | lider czeka na maruderów (od 1.17 nie na wychodzących) | lider | PS 2 |
| `heartSeen`, `heartLater` | pierwsze `partyThink` ze znanym sercem, od 1.17 dopiero gdy przywódca wie o nim (`heartTold`, 6.3.13); `heartLater` gdy naprawdę jeszcze szukają (od 1.17: przeszukane < `need`, nie `fearless`; do 1.16 przeszukane < 65%, także w szturmie z przepowiedni) i lider nie jest nowicjuszem | lider | 3 |
| `assault` | zmiana planu na szturm (`partyThink`, PS 3); lider rusza do serca (`planHero`, 2) | lider | PS 3 / 2 |
| `argueSearch`, `replySearch` | szturm, a chciwy chce szukać dalej (przeszukane < 85%; od 1.17 chciwy słyszy lidera) | chciwy, lider | K (+1, +2) |
| `gateReroute`, `gateWait` | krata blokuje lidera od 1,2 s: idą inną drogą / czekają | lider | 3, d 2.2 |
| `gateLever` | 1.17 (do 1.16 zaszyte): złodziej zaczyna podważać kratę (6.3.11) | złodziej | 3, d 2 |
| `gateBlocked` | krata się zamknęła (`p4_traps.js: fireRaw`): najbliższy w Manhattan <= 2 (+5 strachu) | on | 3, G |
| `rumor` | wejście do pokoju znanego z plotki, raz na bohatera, szansa 0,5 (`onEnter`) | on | 1 |
| `rumorFalse` | plotka o pułapce okazała się fałszywa (`checkGhostRumors`) | ten, kto zobaczył | 2 |
| `seenBuilt` | gracz postawił pułapkę na ich oczach (`p8b_ui.js: tryPlace`) | świadek | 3 |
| `rtFog`, `rtSwamp`, `rtGrotto`, `rtCrypt`, `rtVault`, `rtHaven`, `rtGears`, `rtHush`, `rtIce` | pierwszy, kto wejdzie do pokoju danego typu (raz na pokój w fali, nie wychodzący; `onEnter`, `RT_SAY`) | on | 3 |
| `rkEnter` (mapa: `k_<komnata>`, 12) | 1.17.1: pierwszy, kto wejdzie do pokoju z komnatą (raz na pokój w fali, `fl.rkSaid`, nie wychodzący; `onEnter`); po kwestii efektu w tym samym pokoju zwykle przepada (6.8 #35) | on | 3 (2, gdy pokój ma też efekt) |
| `bAltar` | wejście do pokoju z Ołtarzem (3); osłona przed pokojem przy Ołtarzu (4); odczynianie przy Ołtarzu (3); leczenie przy Ołtarzu, szansa 0,25 (2); od 1.17.1 zawsze w `sayNow(['altar'])` (tak samo `bRune`, `bHowl`, `bDecoy` i kwestie wejścia do pokoju z budowlą ze swoim typem) | kapłan pierwszy | 3 / 4 / 3 / 2 |
| `bRune` | wejście do pokoju z Runą (3); zagłuszenie pułapek zablokowane przez Runę (4) | mag pierwszy | 3 / 4 |
| `bAcid` | wejście do pokoju z Kwasem | wojownik pierwszy | 3 |
| `bVeil` | wejście do pokoju z Zasłoną | ktokolwiek pierwszy | 3 |
| `bHowl` | wejście do pokoju z Kamieniem wyjcem (3); bard nie może zawołać albo zaśpiewać (3) | bard pierwszy | 3 |
| `bShackles` | wejście do pokoju z Okowami (3, `partyThink`); furia zablokowana (3, raz na pokój i bohatera, `startRage`) | barbarzyńca pierwszy | 3 |
| `bDecoy` | Wabik podnosi alarm (rozbrojony albo rozbity, `decoyAlarm`) | rozbrajający albo ktoś w pokoju | 4, G |

**B2. Ciekawość: rozglądanie się i dźwięki (1.17, 6.3.3a)**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `lookStart` | przywódca pozwala się rozejrzeć (`lookRoll`); `SOLO`: rozgląda się sam | przywódca | 2 |
| `lookWant`, `lookHurry` | rzut się nie udał, w pokoju jest mebel, z szansą 0,3: chciwy albo nowicjusz prosi o przeszukanie, przywódca odmawia | prosi, przywódca | K (`talkAs`) |
| `lookStay` | tchórz zostaje przy przywódcy (60%), z tego 40% mówi, tylko gdy inni naprawdę idą oglądać | tchórz | K prio 1 (+1,2) |
| `lookObj` (mapa: barrel, crate, statue, shelf) | doszedł do mebla, który obejrzy i przeszuka, szansa 0,8 (`lookArrive`) | oglądający | K prio 1 |
| `lookProp` (mapa: portrait, mirror, eyes, coffin, bones) | doszedł do straszaka, którego nie rozpoznali (kwestie nie zdradzają pułapki), szansa 0,8 | oglądający | K prio 1 |
| `lookKind` (mapa: 12 komnat) | doszedł do środka komnaty, szansa 0,8 | oglądający | K prio 1 |
| `lookWall` | stanął przy gołej ścianie, szansa 0,5 | oglądający | K prio 1 |
| `lookFind`, `lookNothing` | koniec przeszukania skrzyni, beczki, półki: znalazł monetę (chciwy, złodziej 0,3, inni 0,18) / nic (szansa 0,45) | przeszukujący | K prio 2 / K prio 1 |
| `lookEnd` | koniec rozglądania (wszyscy skończyli albo 10 s), nie przy przerwaniu; `SOLO` w pojedynkę | przywódca | K prio 2 (+0,4) |
| `hearSound` | pułapka odpaliła w innym pokoju w promieniu 12 pól, nikogo nie trafiła (szansa 0,65; `hearFar`) | najbliższy spokojny, który usłyszał | K prio 2 (+0,3) |
| `hearScream` | to samo, ale pułapka kogoś trafiła (z imieniem `{n}`/`{g}`, zawsze) | najbliższy spokojny | K prio 2 (+0,3) |

**C. Pułapki, wiedza, prace**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `trap` (mapa wg typu, od 1.17 listy) | pułapka jeszcze nieznana odpala przy świadkach (`fireRaw`); dodatkowo `trap.portrait` i `trap.mirror` przy każdym odpaleniu (3, S) | pierwszy trafiony albo świadek | 3, d 1.4, G |
| `trapGeneric` | 1.17 (do 1.16 zaszyte `'Pułapka!'`): jak `trap`, gdy dla typu nie ma wpisu | jak wyżej | 3, d 1.4, G |
| `learn` | 1.17: zapamiętali pułapkę po odpaleniu, upadku albo postawieniu na ich oczach (`learnTrap` z `'seen'` bez `by`), szansa 0,5; do 1.16 nigdy nie padało (6.8) | pierwszy żywy w pokoju pułapki (nie zgubiony, nie panikuje, nie w klatce) | K (+1,2) |
| `noLearn` | pułapka odpaliła, nikt jej nie zapamiętał | pierwszy świadek | 2 |
| `detect`, `amulet` | wykrył pułapkę wzrokiem; `amulet` gdy ma amulet i nie jest złodziejem (`learnTrap`) | on | 2 |
| `nastyTrap` | poznali pułapkę poz. 3, szansa 0,7 | wykrywający albo ktoś w pokoju | 3 |
| `vetWarn` | pułapka trafiła nowicjuszy, szansa 0,3: weteran rangi 2+ obok (< 7) | weteran | 2 |
| `timing` | weteran stoi w obszarze znanej przeładowującej się pułapki (raz na pułapkę) | on | 2 |
| `sense` | mag poz. 8+ wyczuł pułapki pokoju | mag | 3 |
| `disarm`, `disarmDone`, `disarmHit`, `disarmFail`, `sapped` | zaczyna rozbrajać; rozbroił; pułapka odpaliła w trakcie; wpadka albo Mechanizm samobójczy; rozmontował na stałe. Od 1.17 `disarmDone` i `disarmHit` mówi tylko złodziej przy zwykłej pułapce (do 1.16 także kapłan przy przeklętym straszaku, np. "Rozbrojone!") | złodziej | 3 / 2 / 3 G / 3 / 3 |
| `bless` | kapłan zaczyna odczyniać portret | kapłan | 3 |
| `blessDone`, `blessHit` | 1.17: kapłan skończył odczyniać przeklęty straszak (`CURSED`) / straszak odpalił w trakcie | kapłan | 2 / 3 G |
| `bomb` | rzut bombą w pułapkę albo w potwora (> 60 HP) | rzucający | 3 |
| `shield` | wojownik podnosi tarczę przed zagrożeniem (od 1.17 gdy nie prowadzi drużyny naprzód: idzie za kimś, wychodzi, cofa się; "Za mną, osłonię was!" przeniesione do `shieldLead`) | wojownik | 2 |
| `shieldLead` | 1.17: jak `shield`, ale wojownik jest przywódcą, nie wychodzi i prowadzi naprzód (intencja `lead`, `heart`, `detour`) | wojownik-przywódca | 2 |
| `dodge` | złodziej unika trafienia | złodziej | 2, G |
| `prepStart`, `prepWard`, `prepJam`, `prepDisarm`, `prepShield` | przygotowanie przed groźnym pokojem, co 0,5 s; od 1.13.3 najwyżej 2 specjalistów (losowo); od 1.17 `prepJam` i `prepDisarm` tylko, gdy w pokoju są znane pułapki, a `prepWard`/`prepJam`/`prepDisarm`/`prepShield` są w `SOLO_MUTE` | lider, kapłan, mag, złodziej, wojownik | K |
| `rush` | koniec przygotowania, bieg | lider | 3 |
| `slip` | ślizg na lodzie | on | 2, d 1.2, G |
| `lull` | pozytywka zaczyna grać | pierwszy objęty | 3 |
| `fall`, `landed` | spada przez zapadnię; wychodzi z niej | on | 4 |
| `cage`, `freed`, `cageBreak`, `cageDie` | złapany; uwolniony; boss wyłamuje kraty; umiera w klatce | uwięziony | 4 / 3 / 4 / 4 d 2 |
| `rescue`, `abandon`, `abandoned` | decyzja: wracamy po niego / zostawiamy (od 1.17 gdy lider słyszy krzyk z klatki albo po 20 s); odpowiedź porzuconego (+1 s) | lider (albo inny), uwięziony | 3 / 3 / K |

**D. Potwory i walka**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `fight`, `avoid` | wojownik szarżuje na potwora; wojownik omija groźnego potwora (szansa 0,3 na plan; od 1.17 raz na potwora); od 1.17.1 w `sayNow(itemTags(potwór))`: kwestia musi pasować do tego potwora | wojownik | 2 |
| `ghost` | pierwszy raz w aurze ducha (raz na falę) | on | 3, G |
| `ghostOnly` | wojownik po `ghost`: zawsze zablokowane (6.8) | wojownik | 2 |
| `shade` | pierwszy raz przy cieniu (raz na falę); cel szeptu przy każdym odpaleniu cienia | on | 3, G |
| `bats`, `batScatter` | pierwszy raz w roju (raz na falę); spłoszony przez nietoperze | on | 3 G / 2 G |
| `spider` | pierwszy raz oplątany przez pająka w walce | on | 2, G |
| `fireball`, `dispel` | mag rzuca kulę ognia; rozprasza sieć | mag | 1 / 3 |
| `smash`, `smashB` | barbarzyńca rąbie mebel / budowlę (od 1.17.1 `smashB` w `sayNow([typ budowli])`) | barbarzyńca | 3 |
| `rage`, `rageNoPanic`, `revenge` | furia: po trafieniu; zamiast paniki; po śmierci przyjaciela (z imieniem) | on | 4, d 2.2 |

**E. Leczenie, wsparcie, moce**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `heal`, `cleanse`, `barrier`, `curseLift` | modlitwa: leczenie; gaszenie ognia (od 1.17.1 gdy w `near` płonie choć jeden, w `sayNow(['fire'])`); bariera; zdjęcie klątwy z przyjaciela (z imieniem) | kapłan | 1 / 3 / 3 / 3 |
| `staunch` | 1.17.1: modlitwa zatamowała tylko krwawienie z kolców (nikt w `near` nie płonął), w `sayNow(['spikes', 'blood'])`; do 1.17 mówił wtedy `cleanse` ("Gaszę ogień!"); `SOLO.staunch` | kapłan | 3 |
| `curseSelf` | 1.17: kapłan zdejmuje klątwę z samego siebie (przyjaciel ma pierwszeństwo) | kapłan | 3 |
| `faithLow` | brak wiary na modlitwę (raz, aż wiara wróci do 2); brak wiary na osłonę przed pokojem; small talk kapłana z wiarą <= 1 | kapłan | 3 / 3 / 1 |
| `callHealer`, `healerReply` | ranny (< 40%) daleko od kapłana woła (od 1.17 tylko gdy kapłan słyszy krzyk, `canHearShout`); kapłan odpowiada (+1,1) i idzie najpierw do wołającego | ranny, kapłan | 2 / K |
| `potion` | pije miksturę (próg `R.potion`); nie mylić z `lootPotion` (idzie po leżącą) | on | 3 |
| `potionGive`, `potionThanks` | daje miksturę umierającemu; podziękowanie (+1,1) | dający, biorący | 3 / K |
| `charmUse`, `amuletUse`, `bootsUse` | użycie talizmanu, amuletu, butów | on | 3 / 3 / 2 |
| `song`, `songThanks` | pieśń barda; podziękowanie (+1,6) | bard, ktoś obok | 3 d 2.2 / K |
| `bardCall` | bard woła zgubionych (`bardTick`, 3); bard odpowiada na wołanie zgubionego (`answerLost`, K) | bard | 3 / K |
| `answer`, `hearVoice`, `lostHear`, `echoLost` | odpowiedź na wołanie zgubionego (+0,8); zgubiony słyszy głos (+1,8) / muzykę barda; echo przy Kamieniu wyjcu (+1,4) | odpowiadający, zgubiony | K |
| `nap`, `nightmare` | drzemka w Sanktuarium; koszmar po 1,5 s odpoczynku w Sanktuarium | on | 2 |

**F. Łupy i przedmioty**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `loot1`, `loot2`, `loot3` | zauważył łup danej rzadkości (`noticeLoot`, 2 albo 3 od rzadkości 2; od 1.17 nie dla mikstury); decyzja "idę" bez szczególnego powodu (`lootDecision`, 2; od 1.17 nie dla mikstury, do 1.16 zdrowy po miksturę mówił "Złoto!") | ten, kto zobaczył / decydujący | 2-3 |
| `lootPotionSeen` | 1.17 (do 1.16 zaszyte): zauważył leżącą miksturę (`noticeLoot`) | ten, kto zobaczył | 2 |
| `lootPotion`, `lootPotionNeed` | 1.17: decyzja "idę po miksturę" (`lootDecision`): niezbyt ranny / ranny < 40% HP (`lootPotionNeed` do 1.16 zaszyte) | on | 2 |
| `lootGreedy`, `lootLegend`, `lootRookie`, `lootGo` | decyzja "idę": chciwy; legendarny; nowicjusz; mimo ryzyka (> 2) | on | 2 |
| `lootRisk`, `lootCareful`, `lootPetty` | decyzja "nie idę" (szansa 0,6): zbyt groźnie; ostrożny; elita nie schyla się po złoto | on | 2 |
| `lootStop`, `lootReply` | lider (rangi 1+) sprzeciwia się ryzykownemu łupowi, szansa 0,4, od 1.17 tylko w `earshot`; `lootReply` = odpowiedź tego, kto i tak idzie (chciwy, łowca, nowicjusz, ranny po miksturę albo 25%) | lider, zbierający | K (+0,8, +1,8) |
| `lootObey` | 1.17: zbierający słucha rozkazu i zostawia łup na 15 s (do 1.16 rozkaz nic nie zmieniał) | zbierający | K (+1,8) |
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
| `searchLost`, `leaveLost` | lider decyduje: szukamy / sam trafi; od 1.17 dopiero, gdy zauważy brak (4 s po zgubieniu i go nie słyszy, `missLost`), +0,3 s (do 1.16 od razu przy zgubieniu, +0,8 s) | lider | K |
| `searchFail` | 1.17: lider doszedł do miejsca, gdzie ostatnio widział zgubionego, a tam nikogo; koniec szukania | lider | K prio 2 (+0,2) |
| `alone` | został sam (raz, aż wróci do grupy) | on | 2 |

**H. Odwrót, rany, strach, ucieczka**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `retreat`, `restDone` | odwrót; koniec odpoczynku | lider | PS 3 / PS 2 |
| `argueRetreat`, `agreeRetreat` | odważny/barbarzyńca protestuje; tchórz się zgadza (od 1.17 tylko ci, którzy słyszą lidera) | oni | K |
| `hurt`, `hurtScared` | rana od pułapki >= 8 HP, szansa 0,35; `hurtScared` gdy hp < 0,3 max (`damage`) | ranny | 1 / 2, d 1.4, G |
| `friendHit` | przyjaciel stracił od pułapki >= 25% max HP (najwyżej co 5 s) | najbliższy w odległości <= 4 | K, G (+0,5) |
| `ambush` | zasadzka (3 trafienia w seriach; od 1.17 tylko trafienia grupy przywódcy) | z `talk()` | K |
| `panic` | wpada w panikę | on | 3, d 1.8, G |
| `flee`, `cowardRun` | zaczyna uciekać (tchórz: `cowardRun`) | on | 4, d 2 |
| `fleeShout` | ktoś ucieka, lider (poz. 3+) krzyczy, szansa 0,6 (od 1.17 tylko gdy widzi albo słyszy uciekającego) | lider | 2 |
| `partyFlee` | cała drużyna ucieka (od 1.17 uciekają ci, którzy słyszą ten krzyk); `SOLO`: samotny przywódca | lider | 4, d 2.2 |
| `champShout` | czempion powstrzymuje ucieczkę (co 15 s; od 1.17 gdy widzi albo słyszy uciekającego) | czempion | 4, d 2.2 |
| `death`, `deathFlee` | ktoś zginął, szansa 0,55 na każdego (bez tych w furii); `deathFlee` gdy uciekają; od 1.17 tylko ci, którzy śmierć widzieli (`canSee`, to samo miejsce) | świadkowie | 4, d 2.2 |
| `deathHeard` | 1.17: usłyszał krzyk śmierci (do 14 kroków), ale nie widział: bez imienia, szansa 0,55 | słyszący | 3, d 2 |
| `tellDeath`, `newsDeath` | 1.17: ktoś, kto wie o śmierci, spotyka (widzi albo słyszy) kogoś, kto nie wie: mówi z imieniem zmarłego; tamten reaguje (bez imienia) | wiedzący, niewiedzący | K prio 3 (+0,2, +0,4) |
| `shaken` | small talk wstrząśniętego (do 6 s po końcu wstrząsu; od 1.17 wstrząśnięty jest tylko ten, kto o śmierci wie) | on | 1 |
| `trauma` (mapa wg typu obrażeń) | pierwsza rana tego typu, która zbiła hp poniżej 35% (z kartą 50%) | on | 4, d 2.2 |
| `weakHit`, `resistHit` (mapy) | ciało ujawnia słabość / odporność na typ obrażeń (sekcja 05) | on | 3, d 1.8, G |
| `phobia` (mapa wg fobii) | fobia się ujawnia (od 1.17.1 `phobia.spiders` ma 8 kwestii, 2 o pajęczynie z tagiem `web`: w trakcie rzeczy chwili, np. rany od pająka, padają tylko, gdy rzeczą chwili jest sieć, poza nią tylko u kogoś, kto sieć widział) | on | 4, d 2.2 |
| `finalRage` | bohater z przepowiedni poniżej 50% HP | on | 4, d 2.4 |
| `crystalFear` | niosący rzuca kryształ ze strachu | on | 4, d 2.2 |

**I. Serce, kryształ, koniec cierpliwości**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `steal` | wyważył kryształ | niosący | 4, d 2.2 |
| `escape` | po kradzieży, każdy inny z szansą 0,4; od 1.17 tylko ci, którzy widzą niosącego albo słyszą jego krzyk | oni | 2 |
| `heartRepel` | fala 1: serce ich odpycha | pierwszy przy sercu | 4, d 2.2 |
| `crystalDrop` | kryształ wraca do serca; od 1.17 tylko ci, którzy widzą niosącego albo słyszą krzyk (do 1.16 każdy żywy w lochu) | świadkowie i słyszący | 4 |
| `impatient` | koniec cierpliwości, szturm z bohaterem z przepowiedni | przywódca (od 1.17; wcześniej `alive()[0]`) | 3 |
| `prophecy` | przepowiednia pokazuje drogę do nieznanego serca; `SOLO`: prorok sam | bohater z przepowiedni | 4, d 2.6 |
| `leave` | koniec cierpliwości bez wyboru (`goHome` z `becomeImpatient` albo narada bez grupy przez 8 s); odepchnięci od serca w fali 1. Po decyzji narady "do domu" nie pada (jest `decideHome`) | przywódca (od 1.17; wcześniej `alive()[0]`) / nieuciekający przy sercu albo słyszący kogoś przy sercu | 3 |
| `leftBehind` | 1.17: ostatni żywy zostaje przywódcą, a nie słyszał, że reszta wyszła: przejmuje plan wyjściowy i idzie do wyjścia | on | 3 |

**I2. Narada na końcu cierpliwości (1.17, 6.3.10a; wszystkie K przez `talkAs`)**

| Klucz | Kiedy | Kto | prio / tryb |
|---|---|---|---|
| `councilOpen` | otwarcie narady; `SOLO`: samotny przywódca | przywódca | K |
| `voteHome`, `voteStorm`, `voteMore` | głos: do domu / szturm (tylko gdy przywódca zna serce) / jeszcze chwila (raz na falę) | do 4 głosujących poza przywódcą | K |
| `councilGiveIn` | przywódca przegłosowany, ustępuje | przywódca | K |
| `decideHome`, `decideStorm`, `decideMore` | decyzja; `SOLO`: samotny przywódca decyduje sam | przywódca | K |
| `goHomeAlone` | przegłosowany, który chciał do domu, wraca sam (szansa `min(0.85, 0.2 + tchórz 0.35 + 0.3*strach + ranny 0.25)`); naprawdę odchodzi po naradzie (`goHome`) | on | K |
| `outvotedHome`, `outvotedStorm`, `outvotedMore` | przegłosowany zostaje i marudzi (najwyżej 2, szansa 0,6) | on | K |

**J. Small talk** (6.7.6; prio 1, d 2.2; odpowiedzi K)

| Klucz | Kiedy |
|---|---|
| `chatFlee`, `chatCarrier`, `chatHurtOut` | w drodze do wyjścia; niosący (podwójna waga); ranny w drodze do wyjścia |
| `chatRest` | w czasie odwrotu (razem z `restScene`) |
| `chat_coward`, `chat_brave`, `chat_careful`, `chat_greedy` | wg cechy (odważny nie, gdy się boi) |
| `bardIdle`, `barbIdle`, `elite` | bard; barbarzyńca; ranga 2+ |
| `chatHurt` | 1.17 (do 1.16 zaszyte): mówiący ma < 40% HP |
| `chatScared` | 1.17 (do 1.16 zaszyte): mówiący się boi (strach > 50% odwagi); kwestia strachu, dostaje `reassure` |
| `chatGold` | 1.17 (do 1.16 zaszyte): niesie >= 2 złota (razem z `goldHeavy`) |
| `chatRich` | 1.17 (do 1.16 zaszyte): chciwość > 1,5, bez strachu, wstrząsu i śmierci w fali, HP > 50%; kwestia o bogactwie, dostaje `surviveFirst` |
| `chatIdle` | 1.17 (do 1.16 zaszyte): zawsze w puli |
| `saw` (mapa: tag pamięci -> 9 kwestii, 58 tagów: pułapki 16, potwory 8, łup 5, efekty 9, komnaty 12, budowle 8) | 1.17.1: pogaduszka o tym, co widział w tej fali (`sawTalk`: 2 najświeższe tematy + 1 losowy wcześniejszy); w towarzystwie, poza wyjściem; w 45% small talku kwestia jest tylko z nich, inaczej dochodzą do puli; w `SOLO_MUTE` (6.7.10) |
| `friendLow` | ktoś inny ma < 30% HP (z imieniem); od 1.17 tylko ktoś, kogo mówiący widzi albo słyszy |
| `reassure` | odpowiedź na kwestię strachu (odważny, lider albo bard w odległości <= 6, szansa 0,6) |
| `surviveFirst` | odpowiedź ostrożnego na kwestię o bogactwie (szansa 0,6) |

Plus w small talku używane: `rookie`, `shaken`, `goldHeavy`, `cursedPick`, `faithLow` (wyżej). Samotny mówi `SOLO.chat`, `SOLO.chat_<cecha>`, `SOLO.chat_<klasa>` (6.7.5b).

**K. Martwe klucze**: `charm` (nieużywany; talizman mówi `charmUse`). W praktyce nigdy nie słychać też `ghostOnly` (6.8); `learn` pada od 1.17.

### 6.7.10 Pamięć bohatera i dopasowanie kwestii (1.17.1, `p5_ai.js`: blok po `groupOf`; `p3_flow.js: say, damage, hurtTags`; dane `LINE_NEEDS`)

Decyzja autora (1.17.1): "wojownik powiedział, że płomienie będą mu się śniły, a na planszy nie było nigdzie ognia. Niech mówią o komnatach, efektach, potworach, łupach i pułapkach, które widzą albo widzieli." Przyczyna tej jednej kwestii: krwawienie z kolców liczyło się jako ogień (trauma ognia, sekcja 05, 5.3.2). Przyczyna ogólna: każda kwestia mogła paść niezależnie od tego, co jest w lochu. Od 1.17.1 każdy bohater pamięta, co widział albo poczuł w tej fali, a kwestia, która wspomina rzecz, pada tylko u kogoś, kto tę rzecz zna.

**Pamięć.** `h.saw` (`Set` tagów, tworzony pusty w `spawnHero`) i `h.sawAt` (`Map` tag -> `fl.time` pierwszego zobaczenia, tworzona przy pierwszym `sawAdd`). Żyje jedną falę (bohater powstaje co falę), nie trafia do zapisu. `sawAdd(h, tags)` dopisuje tylko nowe tagi (czas pierwszego zobaczenia się nie zmienia).

| Grupa | Tagi | Skąd tag |
|---|---|---|
| pułapki (16) | `fire`, `blast`, `spikes`, `arrows`, `gate`, `trapdoor`, `cage`, `web`, `mimic`, `portrait`, `mirror`, `coffin`, `bones`, `eyes`, `musicbox`, `creak` | typ pułapki (`powder` = `blast`) |
| potwory | `goblin`, `archer`, `spider`, `ogre`, `shaman`, `ghost`, `shade`, `bats` oraz `monster` | typ potwora + `monster` |
| łup | `gold`, `potion`, `gear`, `relic`, `cursed` | `LOOT_KIND` |
| efekty pokoi | `fog`, `swamp`, `grotto`, `crypt`, `vault`, `haven`, `gears`, `hush`, `ice` | `R.rt` |
| komnaty (12) | `k_goblin`, `k_spider`, `k_ogre`, `k_haunt`, `k_bats`, `k_ossuary`, `k_armory`, `k_forge`, `k_prison`, `k_junk`, `k_gallery`, `k_nursery` | `'k_' + R.rk` |
| budowle | `rune`, `altar`, `acid`, `veil`, `decoy`, `howl`, `shackles`, `fortify` | klucze `BUILDINGS` |
| inne | `death` (zna czyjąś śmierć), `heartSeen` (był w pokoju serca), `blood` (krew: ciężko ranny, krwawienie, śmierć z bliska) | niżej |

```
itemTags(it, fired):                              // czym rzecz jest dla oka (fired: co robi, gdy odpala)
  t = it.type; brak -> []
  MONSTERS[t]       -> [t, 'monster']
  t === 'lcursed'   -> it.cursedKnown ? ['cursed', 'gear'] : ['gear']   // wygląda jak sprzęt, dopóki kapłan nie wyczuje klątwy
  LOOT_KIND[t]      -> [LOOT_KIND[t]]
  t === 'powder'    -> fired && t3(it) ? ['blast', 'fire'] : ['blast']
  t === 'arrows' && fired && mods.arrowBurn -> ['arrows', 'fire']
  TRAPS[t] || BUILDINGS[t] -> [t]
  inaczej []
```

**Co trafia do pamięci i kiedy:**

| Gdzie | Kto | Tagi |
|---|---|---|
| `sawSweep()` na początku `perceiveThink` (każdy tick drużyny, co 0,25 s) | każdy żywy (nie `dead`, `fled`, `gone`) | `sawRoomTags(h, roomOf(h.tx, h.ty))` i `itemTags(it)` każdej rzeczy, którą widać (`sawVisible`) z miejsca, w którym stoi (`seesSpot`) |
| `onEnter` przy zmianie obszaru (`changed`), przed kwestiami pokoju (6.2.7) | wchodzący | `sawRoom(h, r)`: `sawRoomTags` + każda widoczna rzecz, której `itemRooms` zawiera `r` |
| `fireRaw` (przed `hearFar`) | trafieni (`list`, z `opt.lock`) i każdy, kto widzi miejsce | `sawItem(it, list)`: `itemTags(it, true)`; ukryta pułapka trafia do pamięci dopiero, gdy odpali |
| `damage` (`p3_flow.js`) | ranny; przy podpaleniu albo krwawieniu także ci, którzy go widzą (`sawNear`) | `hurtTags(h, src)` (niżej) |
| `damageRaw`: `hp < 0.4 max` (nie serce) | ranny i ci, którzy go widzą (`sawNear`) | `blood` |
| `kill` | każdy żywy, który widzi śmierć (`canSee`) | `blood` |
| `noticeLoot` | ten, kto zauważył łup | `itemTags(it)` |
| `pickup` | podnoszący | `itemTags(it)` |
| `curse` | przeklęty | `cursed` |
| `lookDone`: moneta z mebla | przeszukujący | `gold` |
| `phobiaSight` | ten, którego rzecz przestraszyła | `itemTags(it)` |
| `learnTrap` z `by` | ten, kto wykrył (albo zapamiętał) pułapkę | `itemTags(it)` |
| `driftTick`: duch w zasięgu aury (2,6 pola na 3. poziomie, inaczej 1,6), cień <= 1,4, nietoperze (1,6 / 1,0) | ten bohater | `itemTags(m)` |
| `monstersTick`: sieć pająka na celu | oplątany | `web`, `spider`, `monster` |
| `decoyAlarm` | każdy, kto widzi Wabik, i mówiący `w` | `sawItem(it, [w], ['decoy'])` |
| `partyThink`: kwestia budowli przy wejściu (6.3.12) | mówiący | typ budowli |
| `partyThink`: złodziej podważa kratę (`gateLever`, pierwszy raz) | złodziej | `gate` |
| `planHero`: wojownik szarżuje (`fight`) albo omija potwora (`avoid`) | wojownik | `itemTags(potwór)` |
| `fitLine` w trakcie `SAY_NOW` | mówiący | tagi kwestii, które należą do rzeczy chwili |

Bez zapisu w pamięci, liczone na bieżąco (`knowsTag`): `death` = jakiś wpis `fl.deaths` ma go w `knows` (6.3.13); `gold` = niesie monety (`h.gold > 0`); `cursed` = jest przeklęty.

```
sawRoomTags(h, r):   r < 0 albo brak fl.rooms[r] -> nic
   R.rt; 'k_' + R.rk; r === fl.heart.room -> 'heartSeen'; każda budowla b (oprócz 'decoy') z inB(b, r) -> b
itemSpot(it)  = potwór z gx: [floor(gx), floor(gy)]; inaczej [x, y]
itemRooms(it) = pułapka: servedRooms(type, x, y) (drzwi: oba obszary dd.a, dd.b; ściana: pokój, w który patrzy);
                inaczej [roomOf(itemSpot)]
seesSpot(h, x, y, rooms): r = roomOf(h.tx, h.ty); r >= 0 ? rooms.includes(r) : hypot(h.tx - x, h.ty - y) <= 3.5
sawVisible(it):
   potwór: hp > 0
   'decoy': it.alarmed (do alarmu wygląda jak kolce)
   łup, budowla: zawsze
   nie pułapka: nie
   'gate': it.detected || drzwi zamknięte teraz (closedUntil > time)
   'musicbox', 'creak': nie (słychać je, gdy grają: wtedy sawItem w fireRaw)
   inne pułapki: it.detected || SCARE[t] || t === 'fire'      // straszaki są po to, żeby je widzieć; ogień płonie na widoku
sawNear(h, tags): h i każdy żywy o z canSee(o, h)
```

`roomOf` daje id także korytarzowi (6.0), więc w korytarzu bohater widzi wszystko, co należy do tego korytarza (także kratę i zawiasy w jego drzwiach), a promień 3,5 pola działa tylko na polu drzwi (`roomOf = -1`). Komentarz w kodzie i opis zmian mówią "w korytarzu 3,5 pola" (6.8 #36).

**Rana: co czuje** (`p3_flow.js: hurtTags`, `BURN_TAGS`):
```
hurtTags(h, src): k = srcKind(src)
   k === 'burn'            -> BURN_TAGS[h.burnBy] || ['fire']
   k === 'trap' || 'monster' -> itemTags(src, true)
   inaczej null             // serce, łup-pułapka, inne: damage idzie od razu do damageRaw, bez nowej rzeczy chwili
BURN_TAGS = { spikes: ['spikes', 'blood'], arrows: ['arrows', 'fire'], powder: ['blast', 'fire'], fire: ['fire'],
              archer: ['archer', 'monster', 'fire'], trapdoor: ['trapdoor', 'fire'] }
damage(h, amt, src, cm): martwy/uciekł/amt <= 0/koniec fali -> return
   now = hurtTags(h, src); !now -> damageRaw(...)
   sawAdd(h, now); k === 'burn' -> sawNear(h, now)          // inni widzą, jak płonie albo krwawi
   sayNow(now, () => damageRaw(h, amt, src, cm))             // rana, śmierć, trauma, słabość, fobia, ból: o tym, co zraniło
```

**Rzecz chwili** (`SAY_NOW`). `sayNow(tags, f)`: zapamiętuje poprzednią wartość, ustawia `SAY_NOW = new Set(tags)` (pusta lista albo `null` -> `null`), woła `f`, przywraca poprzednią (także przy wyjątku). Każda kwestia powiedziana w trakcie `f` (także zagnieżdżona, np. krzyk śmierci w ranie od pułapki w trakcie odpalenia) jest sprawdzana względem tej rzeczy:

| Miejsce | `SAY_NOW` |
|---|---|
| `fire(it)` (całe odpalenie, `fireRaw`) | `itemTags(it, true)` |
| `damage` (cała rana z `damageRaw`, w tym `kill`, trauma, `revealPhys`, fobia) | `hurtTags(h, src)` |
| `noticeLoot` (kwestia `loot1-3`, `lootPotionSeen`, `lootFlee`) | `itemTags(it)` |
| `pickup`: złoto (`gold`, `goldHeavy`) | `['gold']` |
| `curse` (`cursedPick`), `checkCursed` (`cursedWarn`) | `['cursed', 'gear']` |
| `learnTrap` z `by` (`learn`, `detect`, `amulet`); `nastyTrap` | `itemTags(it)` |
| `planHero`: `fight`, `avoid` | `itemTags(potwór)` (ten, na którego idzie / którego omija) |
| `smashJob`: `smashB` | `[typ budowli]` (mebel: `null`) |
| `partyThink`: kwestie budowli przy wejściu | `[typ]` |
| `partyThink`: `gateReroute`, `gateWait`, `gateLever` | `['gate']` |
| `bAltar` (`finishPrep`, `blessJob`, `heroAbilities`), `bRune` (`finishPrep`), `bHowl` (`bardTick`) | `['altar']`, `['rune']`, `['howl']` |
| `decoyAlarm`: `bDecoy` | `['decoy']` |
| `heroAbilities`: `cleanse` / `staunch` | `['fire']` / `['spikes', 'blood']` |
| `phobiaSight` (strach i ujawnienie fobii) | `itemTags(it)` |

**Filtr kwestii.**
```
lineTags(text):        // raz budowana mapa tekst -> tagi
   z LINE_NEEDS: każdy tekst z listy tagu dostaje ten tag (kwestia może mieć kilka)
   z SAY.saw: każda kwestia SAY.saw[tag] dostaje swój tag (mówić o rzeczy można tylko, gdy się ją zna)
   teksty z {n} {a} {v} {g}: wzorzec jak w lineKey (6.7.5a): znaczniki -> '.+?', całość ^...$
   wynik: tagi dokładnego tekstu, inaczej pierwszego pasującego wzorca, inaczej null (kwestia bez wymagań)
TAG_CAT = tagi pułapek (16), potworów (z 'monster'), łupu (5) i wszystkie klucze BUILDINGS   // "rzeczy"
knowsTag(h, t):
   t === 'death'  -> jakiś d z fl.deaths ma d.knows.has(h.id)
   t === 'gold' && h.gold > 0, t === 'cursed' && h.cursed -> true
   inaczej SAY_NOW?.has(t) || h.saw?.has(t)
lineOk(h, text): tg = lineTags(text); brak -> true
   każdy x z tg: (SAY_NOW && TAG_CAT[x]) ? SAY_NOW.has(x) : knowsTag(h, x)
```
W trakcie rzeczy chwili kwestia o pułapce, potworze, łupie albo budowli musi dotyczyć właśnie tej rzeczy (nie wystarczy, że widział ją wcześniej: "Złoto!" nie pada, gdy patrzy na miksturę, choć złoto widział). Pozostałe tagi (efekty, komnaty, `death`, `blood`, `heartSeen`) zawsze sprawdza pamięć; tagi rzeczy chwili liczą się jako znane.

```
linePool(k) = k bez ':' -> SAY[k]; 'a:b' -> SAY[a][b]; jako lista (albo null)
fitLine(h, text, pool):                     // w say, tylko w fali, po zamianie na SOLO (6.7.2)
   t = text
   if !lineOk(h, t):
      k = lineKey(t)
      alt = (pool || linePool(k) || []) bez kwestii z {n}/{a}/{v}/{g}, tylko te z lineOk(h, x)
      alt puste: stats.lineDrop++; stats.lineDropK[k || '?']++; return null     // say zwraca true: "powiedziane", bez dymka
      stats.lineSwap++; t = losowa z alt
   if SAY_NOW: tagi t, które są w SAY_NOW -> sawAdd(h, ...)                     // o czym mówi teraz, o tym wie
   return t
okLines(h, list) = list.filter(x => lineOk(h, x))
```
- `pool` to lista `SOLO`, gdy samotny dostał kwestię z `SOLO` (zamiennik też z `SOLO`); inaczej pula klucza kwestii w `SAY`. Kwestia bez klucza (`CONVO`, `CHAT_REPLY`, kwestie składane w kodzie), która nie pasuje, przepada (`lineDropK['?']`); takie kwestie są filtrowane wcześniej (rozmowy w `convoStart`, odpowiedzi w small talku).
- Zamienników z imieniem nie ma, bo nie wiadomo, kogo wstawić.
- Kwestie `CONVO` ze znacznikami `{A:...}`, `{An}` itd. są w `say` już wypełnione i nie pasują do żadnego wzorca (wzorce znają tylko `{n} {a} {v} {g}`), więc filtr działa dla nich tylko w `convoStart` (6.7.5a).

**Gdzie filtr działa:** każda kwestia w fali przez `say` (6.7.2); small talk (`okLines` na całej puli, odpowiedzi `CHAT_REPLY` dla odpowiadającego, 6.7.6); rozmowy (każdy uczestnik tylko z kwestiami, które zna, 6.7.5a). Poza falą (`fl.phase !== 'raid'`) filtra nie ma.

**Pogaduszki o tym, co widzieli** (`SAY.saw`, 58 tagów po 9 kwestii, 6.7.9). `sawTalk(h)`: tagi z `h.saw`, które mają kwestie w `SAY.saw`, posortowane malejąco po `h.sawAt` (najświeższe pierwsze; przy równym czasie kolejność dopisania); tematy = 2 pierwsze + 1 losowy z reszty (gdy są więcej niż 2); wynik = wszystkie kwestie tych tematów. W small talku (6.7.6), gdy bohater nie jest sam (`aloneNow`), nie ucieka, nie niesie kryształu i drużyna nie wychodzi (`goingOut()`): z szansą 0,45 kwestia jest tylko z tych tematów, inaczej dołączają do zwykłej puli. `saw` jest w `SOLO_MUTE` (sam o tym nie mówi). Rozmowy: `CONVO.saw` (15 wymian, `CONVO_P.saw` 0,45; kwestia `saw:<tag>` szuka zestawu `CONVO['saw:<tag>']`, a dalej bazowego `saw`).

**Kwestia wejścia do komnaty** (`SAY.rkEnter`, 12 komnat po 9): pierwszy w pokoju z komnatą (raz na pokój w fali, `fl.rkSaid`, nie wychodzący) mówi, co to za miejsce, z priorytetem 3, a 2, gdy pokój ma też efekt (kwestia efektu padła wtedy przed nią z priorytetem 3, 6.2.7, 6.8 #35); `stats.rkEnter++`. Rozmowy: `CONVO.rkEnter` (8 wymian, 0,4). Kwestie `rkEnter` nie mają tagów w `LINE_NEEDS` (mówi je ten, kto właśnie wszedł, a `sawRoom` już dopisało komnatę).

**Statystyki fali** (`fl.stats`, zakładka Liczby, sekcja 08): `sawTalk` (kwestie z klucza `saw:*`, liczone w `say` po ustawieniu dymka), `lineSwap`, `lineDrop`, `lineDropK` (pominięte wg klucza; tylko log), `rkEnter`, `chatTry` (każdy tick zegara small talku, także bez mówiącego), `chatPick` (z wybraną kwestią). Test (`tests/t1171_saw.py`) podpina `sayHook(h, text, SAY_NOW)` w `say` (`setSayHook`, **tylko prototyp**).

Pomiar (`CHANGES1171.md`, odtworzenia 2 runów autora, 9 fal, 4 próby): kwestii na run tyle co w 1.17 (450-490), ok. 15-24 zamienione, prawie żadna pominięta; Esencja w granicach szumu (sekcja 09).

**W Unity:**
- Tagi jako enum (albo stałe tekstowe w danych); pamięć `HashSet<Tag>` + `Dictionary<Tag, float>` w `HeroRuntime`, czyszczone co falę.
- `LINE_NEEDS` kluczować identyfikatorem kwestii (np. `trauma.fire/3`, `CONVO` po zestawie i numerze), nie tekstem. **Tylko prototyp:** dopasowanie po dokładnym tekście i wyrażeniach regularnych (zmiana tekstu w `SAY` bez zmiany w `LINE_NEEDS` po cichu zdejmuje kwestii wymagania).
- `SAY_NOW` jako jawny kontekst przekazywany do systemu mowy (np. `using (Speech.Moment(tags))` albo parametr zdarzenia), a nie zmienna globalna; w Core nie ma wyjątków przerywających, ale kontekst trzeba przywracać jak stos.
- Kolejność: `sawSweep` przed resztą `perceiveThink`, `sawRoom` przed kwestiami wejścia, `sawItem` przed kwestiami odpalenia i przed `hearFar`, `sawAdd` w `damage` przed `damageRaw`.

## 6.8 Błędy, martwy kod, niespójności (do przeniesienia do sekcji 11)

Zachowanie prototypu odtwarzaj wiernie; poniższe zgłoś autorowi (sekcja 02, zasady).

1. **`SAY.learn` nigdy nie pada** (naprawione w 1.17: bez `by` z szansą 0,5 mówi ją przez kolejkę pierwszy żywy w pokoju pułapki, 6.3.5). `learnTrap(it, 'seen', by)` mówiło tylko, gdy jest `by`, a wszystkie wywołania z `'seen'` (`fireRaw`, `fall`, `tryPlace`) podają `null`. (`p4_traps.js: learnTrap`)
2. **`SAY.ghostOnly` nigdy nie pada.** Wojownik mówi ją zaraz po swojej głośnej kwestii `ghost` (prio 3); `say` odrzuca prio 2 przy aktywnym dymku prio 3 i nie kolejkuje. (`p4_traps.js: driftTick`)
3. **`SAY.charm` nieużywany.**
4. **Intencja `avoid` jest natychmiast nadpisywana** (naprawione w 1.17: kwestia raz na potwora, `h.avoidM`). Do 1.16 warunek `h.intent !== 'avoid'` był zawsze prawdziwy (`h.intent = intent` na końcu `planHero`), więc wojownik mógł powtarzać `SAY.avoid` przy każdym planie (szansa 0,3), dopóki groźny potwór był w pokoju. (`p5_ai.js: planHero`)
5. **`glance` dla stanu `rest` nieosiągalne**: stan `rest` kończy `updateHero` wcześniej. (`p5_ai.js: updateHero`)
6. **Gałąź klatki w `startFlee` jest martwa**: `addFear` nie woła `startFlee` dla uwięzionego, a inne wywołania dotyczą wolnych (bez zmian). `partyFlee` ustawiał `fleeing = true` także uwięzionym, więc nikt ich nie uwalniał i zwykle ginęli w klatce (naprawione w 1.17: uwięziony i czempion dostają plan `flee`, ale nie `fleeing`, 6.6.3). (`p3_flow.js: startFlee, partyFlee`)
7. **Mnożnik prędkości furii** bierze `h.rageUntil` wprost, nie `raging(h)`: w pokoju z Okowami furia rozpoczęta wcześniej wciąż przyspiesza, choć jej inne skutki są wyłączone. (`p5_ai.js: updateHero`)
8. **Komentarz a kod**: `seenShare` liczy pokój znany z plotki jako 0,3, komentarz mówi "half". Komentarz o zasadzce mówi "dwie pułapki", kod wymaga `ambushN >= 3`. (`p5_ai.js: partyThink`)
9. **`h.rtSaid`** tworzone w `spawnHero`, nieużywane (używane jest `fl.rtSaid`).
10. **Kwestie otwarcia przy spawnie się wypierają**: pierwszy bohater mówi kwestię wyłomu albo powrotu (prio 3), a potem kwestię otwarcia (prio 2), która jest odrzucana przez aktywny dymek; podobnie `hunters` + otwarcie (ta sama waga w ciągu 0,7 s). Słychać tylko pierwszą. (`p3_flow.js: spawnHero`)
11. **Sprzeciw lidera wobec łupu** (`lootStop`) to tylko słowa; nie zmienia decyzji (naprawione w 1.17: zbierający zwykle słucha, mówi `lootObey` i zostawia łup na 15 s; chciwy, łowca, nowicjusz, ranny po miksturę i co czwarty inny idą mimo to; sprzeciw tylko w `earshot`, 6.4.4). (`p5_ai.js: lootDecision`)
12. **`P.steal` nie spada**, gdy odejdą od serca (np. panika); kolejne podejście w tej samej fali zaczyna od poprzedniego postępu (naprawione w 1.17: gdy nikt nie stoi przy sercu, maleje o 0,5/s, 6.3.9). (`p6_loop.js: step`)
13. **Wyjście z zapadni jako zgubiony** nie przechodzi przez `getLost`: `lostCallT` nieustawione (woła od razu), brak decyzji lidera o szukaniu (częściowo naprawione w 1.17: decyzję podejmuje teraz `perceiveThink`/`missLost`, gdy przywódca go nie słyszy, bo brak `lostAt` liczy się jak dawne zgubienie; nie działa, gdy `lostNoticed` zostało prawdą z wcześniejszego zgubienia w tej fali, bo odnalezienie go nie zeruje, 6.2.10). (`p4_traps.js: landFallen`)
14. **Jeden `P.rescueId`**: druga decyzja "ratujemy" nadpisywała pierwszą; pierwszy uwięziony tracił ratownika (naprawione w 1.17: drugi czeka w `P.rescueQ`, 6.5.9). Gdy drużyna już wychodzi, `decideCage` oznacza decyzję bez kwestii i bez ratunku (bez zmian). (`p5_ai.js: decideCage`)
15. **Podważanie kraty** wymaga, żeby złodziej już stał w odległości <= 1,6 od drzwi (brak pracy "idź do kraty"); krata zamyka się na `4 * mods.gateDur` s, a podważenie trwa 3 s (2 s od poz. 6), więc ma znaczenie tylko przy dłuższym zamknięciu. (`p5_ai.js: partyThink`)
16. **Mag rzuca kule ognia, a kapłan się modli także w panice i w ucieczce** (naprawione w 1.17: `heroAbilities` kończy się przy `panicking(h) || h.fleeing`, zaraz po odliczeniu czasów; bard miał to sprawdzenie od początku). (`p5_ai.js: heroAbilities`)
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
27. **Wiedza przez ściany** (naprawione w 1.17 dla zdarzeń i decyzji, 6.3.13): śmierć, "Kryształ!", kradzież, ucieczka drużyny, klatka, wołanie o kapłana, serce wypatrzone przez zwiadowcę, zgubiony i średnie strachu oraz HP działały na wszystkich żywych w lochu, bez sprawdzania, czy ktoś coś widział albo słyszał. Zostały znane ograniczenia wymienione na końcu 6.3.13.
28. **Ratownikiem mógł zostać ktoś, kto nigdy nie przyjdzie** (zgubiony, wracający sam, zwiadowca pokoje dalej), a nikt inny wtedy nie szedł (naprawione w 1.17 przy wyborze ratownika, 6.5.9). Od wydania 1.17 także ratownik, który później się zgubi albo zacznie wracać sam, jest zastępowany. (`p5_ai.js: planHero`)
29. **Lider wołał "zbiórka" na wychodzących** (uciekający, a od 1.17 przegłosowany, który wraca sam) i czekał co ok. 3,6 s, aż wyjdą (naprawione w 1.17: `far` pomija `exiting`, 6.2.12). (`p5_ai.js: partyThink`)
30. **Kwestia z kolejki drużyny nie zaczynała rozmowy** (naprawione w 1.17, 6.7.3): `convoStart` widział w kolejce tę samą kwestię; kwestie dodane w trakcie przeglądu kolejki ginęły. (`p5_ai.js: partyThink, convoStart`, `p3_flow.js: othersWaiting`)
31. **Kwestie nie mówiły prawdy** (naprawione w 1.17 wraz z przeglądem kwestii): "Za mną, osłonię was!" u wojownika, który się cofa albo idzie za kimś (`shieldLead`); "Złoto!" po miksturę (`lootPotion`); "Rozbrojone!" z ust kapłana (`blessDone`/`blessHit`); okrzyk przy bramie od pierwszego w kolejce, a nie przywódcy (`gate`); "najpierw reszta" przy szturmie bez szukania (`heartLater`); mag i złodziej obiecujący zająć się pułapkami w pokoju z samymi potworami (`prepJam`, `prepDisarm`); drugi głos narady jako kopia pierwszego (`deliberate2`); `bez {a}` (biernik) zamiast dopełniacza (`{g}`).
32. **Nowy przywódca przynosił swój plan** (1.17, `perceiveThink`; naprawione w poprawce wydania 1.17): przejmowanie planu nowego przywódcy działa teraz tylko wtedy, gdy nikt z pozostałych nie zna starego planu, cierpliwość jeszcze trwa (`!fl.fearless`) i w fali nie skradziono kryształu; wcześniej po powrocie do domu drużyna mogła znów zwiedzać albo szturmować aż do siatki bezpieczeństwa. (`p5_ai.js: perceiveThink`)
33. **Rozmowy o naradzie prawie nie startują**: `CONVO` ma zestawy `goHomeAlone` i `councilGiveIn`, ale te kwestie padają w trakcie narady, gdy mówiący `talking`, a `convoStart` wtedy odmawia (6.3.10a). (`p5_ai.js: councilThink, convoStart`)
34. **Rozmowy a pamięć (1.17.1)**: `convoStart` sprawdza `lineOk` uczestników w chwili startu, a więc w trakcie rzeczy chwili kwestii, która zaczęła rozmowę (`SAY_NOW`): kwestia B o tej samej rzeczy przechodzi, choć B może jej nie mieć w pamięci, a kwestia o innej rzeczy, którą B widział wcześniej, nie przechodzi. Kwestie mówione potem z kolejki są sprawdzane bez `SAY_NOW` (przez `fitLine`, tylko gdy tekst po `convoFill` pasuje do `LINE_NEEDS`, czyli bez znaczników `{A:...}`/`{An}`); niepasująca nie pada, a wymiana idzie dalej bez niej. Gdy żaden słuchacz nie zna kwestii roli C, `C = null` i kwestie C były po cichu pomijane (naprawione w 1.21: wymiana z rolą C jest proponowana tylko z B, dla którego ktoś inny w zasięgu słuchu zna kwestie C) (`p5_ai.js: convoStart`).
35. **Kwestia komnaty po kwestii efektu przepada (1.17.1)**: w pokoju z efektem i komnatą `onEnter` mówi najpierw kwestię efektu (prio 3), a zaraz potem kwestię komnaty z prio 2; `say` odrzuca ją, bo ten sam bohater ma aktywny dymek o wyższym priorytecie (bez kolejki, 6.7.2). `fl.rkSaid` i `stats.rkEnter` są ustawiane przed `say`, więc kwestia nie wraca, a licznik ją liczy. Kwestia komnaty pada w takim pokoju tylko wtedy, gdy obie trafiły do kolejki `h.sayQ` (ktoś w pobliżu mówił) i kwestia komnaty doczeka tam (najwyżej 2,6 s) końca dymka efektu, albo gdy kwestia efektu w ogóle nie padła (`p5_ai.js: onEnter`). Pewnie zamiar był odwrotny ("2 po kwestii efektu" = po niej, z kolejki). Częściowo naprawione w 1.18: w pokoju z efektem kwestia komnaty idzie do kolejki drużyny (+0,2 s, prio 2, ważna 5 s); `stats.rkEnter` dalej liczy ją przed powiedzeniem.
36. **"W korytarzu 3,5 pola" (1.17.1)**: `seesSpot` porównuje obszary, gdy `roomOf(h.tx, h.ty) >= 0`, a `roomOf` daje id także korytarzowi; promień 3,5 pola działa więc tylko na polu drzwi, a w korytarzu bohater widzi wszystko, co do niego należy (potwory, łup, krata i zawiasy w jego drzwiach), na całej długości. Komentarz w kodzie i opis zmian mówią o 3,5 pola w korytarzu (`p5_ai.js: seesSpot`).
37. **`fitLine` przed sprawdzeniem dymka (1.17.1)**: w `say` dopasowanie (i liczniki `lineSwap`/`lineDrop`, i dopisanie tagów rzeczy chwili do pamięci) dzieje się przed odrzuceniem przez aktywny dymek o wyższym priorytecie i przed wstawieniem do `h.sayQ`; kwestia, która w końcu nie pada, i tak zostawia ślad w statystykach i pamięci. `say` zwraca `true` dla kwestii pominiętej przez filtr, więc wołający uznaje ją za powiedzianą (`p3_flow.js: say`).
38. **`stats.chatTry` (1.17.1)** rosło przy każdym ticku zegara small talku, także gdy nikt nie mógł mówić (pusta pula, `h = null`); od 1.21 rośnie tylko, gdy wybrano mówiącego (także gdy zamiast pogaduszki powie słowo pary), więc nadal nie liczy prób powiedzenia kwestii (`p5_ai.js: partyThink`).
39. **Ten sam kod osi czasu `fm` (1.22, 1.23)**: `formThink` zapisuje `tl('fm', ...)` dla szyku w walce, a `fallenRoom` `tl('fm', ...)` dla pamięci poległych; w danych testowych nie da się ich rozróżnić bez liczby argumentów (`p5_ai.js: formThink, fallenRoom`). W Unity nadać osobne kody.
40. **Komentarze niezgodne z kodem po 1.24**: nad `betThink` "60%+ HP" i "70% roll" (kod: 50% i 85%), nad `bondHurt` "a trap, 20%+ HP, 30%, once in 20 s" (kod: 8%+, 80%, 12 s), nad `makeBonds` "siblings 15%, a mentor 25%, rivals 25%" w części opisu (kod: 15%, 20%, 45%), nad `handThink` "under 35% HP ... 60%+ HP within 1,5 tiles" (kod: 50%, 50%, 2,5).
41. **`riftThink` liczy limit 2 po wszystkich rozłamach** (`fl.stats.rifts`, także foch, bunt, narada i ratunek), a rozłam z rozwidlenia po `rift_fork`; niespokojny rozłam może więc nie mieć szans po dwóch fochach w tej fali.
42. **`waveExhausted` czyści `fl.queue`**: bohaterowie jeszcze przed drzwiami nigdy nie wchodzą i nie liczą się do statystyk fali; zamierzone ("reszta drużyny zostaje na zewnątrz"), ale zmienia skład podsumowania.
43. **`g2Goal` przy zakończonej grupie (naprawione w 1.24)**: `leader()` może zakończyć drugą grupę (`g2End('last')`) w trakcie `planHero` jej przywódcy; do 1.23 `g2Goal` czytał wtedy `fl.party.g2` = null (wyjątek w odtworzeniu).
44. **Nemezis i `nemesisSpawn` przy remisie rangi** przejmuje prowadzenie także od przywódcy tej samej rangi (warunek `L.rank <= h.rank`), a `leader()` przy remisie i tak go woli: zgodne, ale przywódca-boss nigdy nie oddaje prowadzenia.

## 6.9 Dla implementacji w Unity

### 6.9.1 Stałe AI w jednym miejscu

| Stała | Wartość | Źródło |
|---|---|---|
| myślenie drużyny | 0,25 s | `p6_loop.js: step` |
| `thinkT` po planie | `0.45 + rand*0.3` | `planHero` |
| `GATE_T` | 1,8 s | `p6_loop.js` |
| odstęp spawnu | 0,3 s; czekanie drugiego oddziału do 8 s | `step` |
| `S.waveTime` | 120 s; od 1.24 wyczerpanie +60 s i siatka bezpieczeństwa +150 s (czasu cierpliwości `fl.patT`; do 1.23 siatka +60 s) | `DEFAULTS.json`, `step` |
| druga grupa, bunt, rozłam (1.19, 1.24) | 6.10: rozejście 20 s, scalenie po 8 s, zwiad 40 s (foch, bunt 25 s); bunt od 20 s, 25%/s, głos przywódcy 1,5, wyzywającego 1 (elita 1,25); niespokojny od 15 s, 6%/s, cel 4+ pola od celu drużyny, najwyżej 2 rozłamy; z narady 65% / 35% | `p5_ai.js` |
| dzielenie się (1.20) | 6.11.4: amulet przy strachu >= 60% od spokojnego < 40%; sprzęt przy zysku >= 1,0; 35% poza postojem; 2 pola | `shareThink` |
| więzi (1.21, 1.24) | 6.12: zemsta 30 s ×1,3; uczeń dorasta po 20 s ×1,15; drwina 8% HP albo strach 8% odwagi, 80%, co 12 s; zakład 85%, 8 s; kłótnia: przerwanie 40%, ban 10 s, foch 30%; sprzeciw nad ciałem morale -0,05 | `p5_ai.js` |
| finał (1.22, 1.24) | 6.13: eskorta 35%+ HP, tempo ×1,05 (wojownik ×1,2) do ×1,4, przejęcie 50% (wojownik 70%); przekazanie < 50% HP albo strach 60%, odbiorca 50%+ HP i +20 pkt, 2,5 pola; bastion 40%+ HP, 8 s, do 25% HP; poświęcenie 35%+ HP, 12 kroków; "ty pierwszy" 60%, 40 s; opukiwanie 60%, 35%, ×0,7; szyk 30% HP | `p5_ai.js` |
| Nemezis (1.23) | 6.14: uraza 25 s, zagrożenie ×2, `nemK` 1,25; bez paniki powyżej 15% HP; ostrzeżenie 5 kroków; przechwałka 2 na falę co 10 s; nagroda `10 + 5 × times` | `p5_ai.js` |
| narada (1.17) | cisza do 4 s, bez grupy po 8 s do domu; głos lidera 1,5, elity 1,25; "jeszcze chwila" `patT = min(patT, waveTime - 30)`, raz na falę; do 4 głosów na głos, do 2 marudzących (0,6); powrót sam `min(0.85, 0.2 + 0.35 tchórz + 0.3*strach + 0.25 przy hp < 35%)`; wagi głosów 6.3.10a | `councilThink`, `councilVote`, `councilDone` |
| percepcja (1.17) | widzi: `samePlace` (pokój/korytarz albo 3,5 pola); słyszy: `earshot` 7 pól, nie Głusza; krzyk: 14 kroków drogi, nie Głusza ani Kamień wyjec; zgubiony zauważony po 4 s; wieść o śmierci: 0,6 dalekiego strachu, wstrząs 5 s; krzyk śmierci: 1,3 dalekiego strachu, wstrząs 5 s; widziana śmierć: wstrząs 9 s; klatka zauważona bez krzyku po 20 s | `p5_ai.js` (6.3.13) |
| rozglądanie się (1.17) | rzut 0,9 s po wejściu przywódcy, raz na pokój; `p` 0,15-0,55 wg cechy + nowicjusz 0,15 + rzeczy (-0,2 / 0,1 / 0,2) + komnata 0,15 - ranni 0,25 - późno (> 60% cierpliwości) 0,15; nie po 80% cierpliwości ani przy morale < 0,45; 10 s, oglądanie 1,5-3 s, droga <= 12 kroków, przerwa 18 s; tchórz zostaje 0,6, ogląda do 3 pól; `SEARCH_TRAP` mimik 0,55, pozytywka 0,45, proch 0,2; moneta 0,3 (chciwy, złodziej) / 0,18; prośba odrzucona 0,3 | `lookRoll`, `lookThink`, `lookDone` (6.3.3a) |
| dźwięk zza ściany (1.17) | słyszy najbliższy spokojny do 12 pól (nie w tym pokoju, nie w Głuszy); przerwa 10 s; `hearSound` 0,65; wpływ na cel 25 s w promieniu 7 pól: -2,5 (odważny, chciwy, nowicjusz) / +2 (ostrożny, tchórz) / -1 | `hearFar`, `chooseTarget` |
| `stealNeed` | `4 / 2^mods.glass`; więcej osób: `x(1 + 0.5*(n-1))`; fala 1 stop na 0,85; 1.17: nikt przy sercu -> `-0.5/s` | `step` |
| obrażenia serca przy wyważaniu | `5/s` pierwszemu | `step` |
| progi ucieczki drużyny | `fearR > [0.75, 0.85, 0.95, 1][L.rank]` (1.17: w grupie przywódcy); morale < 0,2 przy L.rank < 2; połowa uciekających w grupie przywódcy (min. 2) | `partyThink`, `startFlee` |
| odwrót | lider poz. 3+; `avgHp` grupy przywódcy `< 0.42` (w szturmie 0,32) albo ktoś z grupy < 0,22 bez kapłana; koniec przy `avgHp >= 0.7` i co najmniej 10 s odpoczynku, najpóźniej po 26 s (1.12.1); blokada 15 s | `partyThink` |
| odpoczynek | 4 HP/s, Sanktuarium x0,5 i koszmary 3,5/s | `updateHero` |
| szturm | `need = min(0.85, 0.5/0.6 + 0.1*clamp(greedRaw-1,0,2) - 0.1 elita)`; `tLimit = waveTime * min(0.6, 0.45 + 0.01*max(0, pokoje-6))`; `avgHp >= 0.5` | `partyThink` |
| narada | alternatywa `sc < best + 5`, dalej niż 5 pól; raz na pokój; co najmniej 6 s przerwy | `chooseTarget` |
| zwiad | 16 s; powrót przy hp < 0,45 | `chooseTarget`, `partyThink` |
| wybór celu | `d*(ostrożny 1.15) - deep*manhattan(wejście) + rand*whim + bonus(2 za pokój do przeszukania) - 3*rzadkość łupu (<= 6) - 4 Sezam (+ dźwięk)`; 1.17: `deep` 0,24 odważny / 0,1 tchórz / 0,18; `whim` 2,5 odważny / 1 ostrożny / 1,5 (do 1.16 `deep` 0,18, `whim` 1,5 dla wszystkich) | `chooseTarget` |
| gubienie | rozdzielenie > 7 pól w innym pokoju przez 3 s, potem `lostChance`; mgła `0.22/s * max(0.35, 1 - 0.03*lvl)` (złodziej x0,6); brak drogi > 3 s i > 6 pól | `partyThink` |
| odnalezienie | < 4,5 (mgła 1,6) od lidera albo < 2,5 od głosu | `partyThink` |
| odpowiedź na wołanie | zasięg 14, bard 26; słyszy 7 s (bard woła: 8 s) | `answerLost`, `bardTick` |
| szukanie zgubionego | lider rangi 1+, `fearR` grupy `< 0.6`, szansa 0,6, znane ostatnie miejsce; 14 s (1.17; do 1.16 12 s, decyzja w `getLost`) | `missLost` |
| zły skręt | `p = 0.05 + 0.02*(pokoje-6) + 0.25 mgła - 0.004*lvl - 0.03 złodziej`, max 0,4; 10 s, przerwa 15 s | `maybeDetour` |
| mgła lidera | `3 + 0.25*max(0, 8 - lvl/2)` s, raz na pokój | `partyThink` |
| ślizg | `0.33 x 0.55 (elita) x 0.6 (złodziej) x 1.3 (panika/ucieczka)` | `slipChance` |
| przygotowanie | lider poz. 3+; `roomThreat >= 3` w pierwszym innym pokoju na 5 polach; 2,4 s; bieg 6 s x1,25; przerwa 4 s | `checkPrep` i dalej |
| zasięg łupów (kroki) | 30 / 16 / mikstura dla rannego 14 / złodziej 11 / nowicjusz 9 / reszta 8 | `planHero` |
| decyzja o łupie | ważna 8 s; po nieudanym podniesieniu 68 s | `lootDecision`, `pickup` |
| czekanie na zbierającego | do 6 s, zbierający <= 8 od lidera | `partyThink` |
| czekanie na maruderów | maruder > 7; lider stoi 1,6 s, nie częściej niż co 3,6 s | `partyThink` |
| odstęp przy liderze | 2,5 (kapłan, mag 3,5) | `planHero` |
| wołanie o kapłana | < 40% HP, > 3 od kapłana, kapłan słyszy krzyk (1.17), co 14 s; kapłan idzie do wołającego przez 10 s, koszt drogi <= 20 | `partyThink`, `planHero` |
| rozkaz "zostaw łup" (1.17) | szansa 0,4 przy ryzyku > 1,5, w `earshot`; nie słuchają: chciwy, łowca, nowicjusz, ranny po miksturę, inni 0,25; posłuszny zostawia łup na 15 s | `lootDecision` |
| podanie mikstury | przyjaciel < 30%, <= 2 pola, co 10 s | `partyThink` |
| klatka | ratunek: elita zawsze, inaczej `fearR < 0.6` i 0,5 (nowicjusz) / 0,8; uwalnianie 0,8 s (złodziej) / 1,8 s; czekanie na ratownika +8 s | `decideCage`, `planHero`, `cageEnds` |
| nowicjusz odłącza się | 0,004 na `partyThink`, 10 s, cel > 4 pola | `partyThink` |
| mowa | `SAY_GAP 0.3`, `SAYQ_LIFE [0, 1.4, 2.6, 4]`, `readT = clamp(1.1 + 0.042*len, 1.6, 3.4)`, earshot 7 pól lub ten sam obszar, kolejka bohatera 2 wpisy, kolejka drużyny przeterminowana po 10 s, ta sama waga co 0,7 s | `p3_flow.js` |
| small talk | co 7-13 s; odpowiedź 0,6 (pocieszenie) albo 0,55 (`CHAT_REPLY`); 1.17.1: pogaduszka tylko z `SAY.saw` z szansą 0,45, tematy: 2 najświeższe + 1 losowy | `partyThink`, `sawTalk` |
| pamięć (1.17.1) | wzrok: w pokoju cały pokój (rzecz w drzwiach z obu obszarów), na polu drzwi 3,5 pola; krew: `hp < 0.4 max`; rzeczy chwili `TAG_CAT`; `BURN_TAGS` (6.7.10, załącznik A.8) | `seesSpot`, `damageRaw`, `lineOk`, `hurtTags` |

### 6.9.2 Scenariusze testowe AI (uzupełnienie sekcji 09)

1. **Kolejność mowy**: drużyna 4 osób w jednym korytarzu, 3 spokojne kwestie naraz -> w zasięgu słuchu najwyżej jeden dymek naraz, odstęp co najmniej `SAY_GAP`; kwestia prio 4 wchodzi od razu.
2. **Głusza**: pułapka w Głuszy nie trafia do wiedzy; dymki to `…`/`…!`; ranny w Głuszy nie woła kapłana; wołanie zgubionego bez odpowiedzi.
3. **Fala 1 a serce**: pusty loch, fala 1 -> przy sercu `P.steal` zatrzymuje się na `0.85 * stealNeed()`, wszyscy przy sercu uciekają, plan `leave`.
4. **Lider-nowicjusz nie zarządza odwrotu**, lider poz. 3 przy `avgHp < 0.42` idzie do `safestRoom` i odpoczywa do 0,7 (co najmniej 10 s) albo najwyżej 26 s (1.12.1).
5. **Znane kolce na jedynej drodze**: weteran i tak przechodzi (koszt rośnie, ale droga istnieje), podnosi tarczę (wojownik), przyspiesza x1,3. Gdy istnieje objazd dłuższy o mniej niż dodatkowy koszt zagrożenia (`min(12, danger*3*avoid)` na pole), wybiera objazd.
6. **Krata**: lider bez drogi przez 1,2 s -> przy niezbadanych pokojach plan `explore` na 18 s (`gateReroute`), inaczej `gateWait`; złodziej przy kracie podnosi ją po 3 s.
7. **Klatka**: lider rangi 2 zawsze ratuje; ratownikiem jest złodziej (0,8 s); bez ratownika uwięziony ginie po czasie klatki (+8 s, gdy ratownik w drodze).
8. **Zgubiony**: w mgle, złodziej rzadziej; odpowiedź przychodzi od najbliższego w zasięgu 14 (bard 26); odnalezienie przy < 4,5 pola; przywódca decyduje o szukaniu najwcześniej 4 s po zgubieniu, gdy go nie słyszy, i idzie do ostatniego znanego miejsca (`searchFail`, gdy go tam nie ma).
9. **Cierpliwość**: po 120 s bez przepowiedni narada (1.17): dzielni i zdrowi przy znanym sercu zwykle szturmują, przestraszeni i ranni tchórze zwykle wracają, przy nieznanym sercu nigdy szturm; "jeszcze chwila" daje 30 s raz na falę; serce nieznane i +30 s użyte -> od razu `leave`; z przepowiednią serce znane i szturm bez omijania pułapek.
10. **Łupy**: dwóch chętnych na ten sam łup -> idzie jeden (roszczenie); lider czeka najwyżej 6 s; przeklęty łup przy kapłanie poz. 6+ nietknięty.
11. **Lód**: nowicjusz ślizga się z częstością ok. 0,33 na krok, nigdy dwa razy z rzędu, nie na serce ani na potwora.
12. **Ucieczka**: połowa drużyny (min. 2) ucieka -> `partyFlee`; reszta kolejki czeka do 8 s i wchodzi jako drugi oddział z 20% strachu.
13. **Percepcja (1.17)**: śmierć obok przywódcy, a jeden bohater pokoje dalej (ponad 14 kroków): ten nie dostaje strachu ani wstrząsu, nie ma go w `d.knows`; przywódca wie (morale -0,25); gdy dalszy dołączy, dostaje wieść (`tellDeath`/`newsDeath`, strach, `newsDeaths`). Ucieczka drużyny nie oznacza uwięzionego jako uciekającego; zwiadowca pokoje dalej nie ucieka, dopóki nie dołączy.
14. **Ciekawość (1.17)**: loch 10 pokoi, chciwy i ostrożny w drużynie: rozglądanie się startuje, bohaterowie podchodzą do rzeczy i stoją przy nich, rozglądanie się kończy; mebel z mimikiem może odpalić na końcu przeszukania.
15. **Dźwięk zza ściany (1.17)**: pułapka w pokoju bez bohaterów do 12 pól od przywódcy -> `stats.heard` +1, `P.sound` ustawione (przywódca słyszał), kwestia `hearSound` albo `hearScream`.
16. **Dopełniacz imion (1.17)**: `nameGen` daje Wandy, Jadwigi, Zofii, Heli, Borysa; `nameFill('bez {g}', Ewa)` = "bez Ewy"; żaden dymek nie zawiera surowego szablonu (`{` `}`).
17. **Pamięć i filtr kwestii (1.17.1)**: `lineTags('Każdy płomień będzie mi się śnił...')` zawiera `fire`; bohater bez `fire` w pamięci: `lineOk` = false, a `fitLine` daje inną pasującą kwestię albo `null` (nigdy tę); po `sawAdd(h, ['fire'])` może ją powiedzieć. Pamięć `{gold}`: "Złoto!" pasuje; w `sayNow(['potion'])` nie pasuje, w `sayNow(['gold'])` pasuje. Pusta pamięć i `sayNow(['gate'])`: kwestia z tagiem `gate` pasuje. Kwestia z tagiem `death` pasuje dopiero, gdy wpis w `fl.deaths` ma bohatera w `knows`.
18. **Krwawienie to nie ogień (1.17.1)**: bohater z `burnBy = 'spikes'` przez 1 s: `dmgBy.pierce > 0`, brak `dmgBy.fire`, w pamięci `blood`, bez `fire`; nad figurą czerwona kropka; kapłan, który go opatrzy, mówi `staunch`, nie `cleanse`.
19. **Nikt nie mówi o tym, czego nie ma (1.17.1)**: losowe lochy (co najmniej 7 pokoi, 2 efekty, 2 komnaty, 10 elementów z 9 losowych typów, fala 5, do 220 s, kilka prób): żadna kwestia z tagiem nie pada bez znanego tagu (sprawdzane w chwili powiedzenia, z `SAY_NOW`), żaden bohater nie ma w pamięci tagu, którego nie ma w lochu ("w lochu" = `itemTags(it, true)` każdego elementu, efekty i komnaty pokoi oraz `blood`, `death`, `heartSeen`; do tego każdy łucznik i zapadnia z Ognistą otchłanią dają ogień, pająk sieć, przeklęty łup `cursed` i `gear`); loch bez ognia, prochu, Kaplicy czaszek i Kuźni oraz bez kart ognia: nikt nie ma `fire` i nie pada żadna kwestia o ogniu. Test prototypu: `tests/t1171_saw.py` (z `--nofire`).
20. **Wejście do komnaty (1.17.1)**: pierwszy w pokoju z komnatą (bez efektu) mówi kwestię `rkEnter` tej komnaty, raz na pokój; drugi wchodzący nie. W pokoju z efektem i komnatą zachowanie jak w 6.8 #35 (do decyzji, czy poprawić).

## 6.10 Rozłam: druga grupa, bunt, foch (1.19; zmiany 1.24; `p5_ai.js: inG2, g2Leader, groupLeaderOf, g2Start, g2End, g2Target, g2Think, g2Goal, mutinyThink, riftThink, sulkThink, leader, chooseTarget, councilThink, councilDone, lootDecision, convoStart`)

Drużyna może się rozpaść na dwie. Druga grupa (`P.g2`: przywódca, członkowie, własny plan i cel) zwiedza osobno i łączy się z resztą, gdy się spotkają. Jej członkowie są z dala celowo (`h.split`, Groza zwiadu `GZ.split`, 6.2.10a, przez `splitting()`), dopóki nie wrócą. Naraz tylko jedna druga grupa.

### 6.10.1 Życie grupy

```
g2Start(D, joiners, plan, target, why):             // why: fork | restless | council | sulk | mutiny | rescue (1.21)
   if P.g2 || !D: false
   P.g2 = { leaderId: D.id, ids: Set(D + joiners), plan, target, born: time, why,
            until: time + (why sulk|mutiny ? 25 : 40), said: false }
   każdy członek: plan = plan grupy, needPlan, startSplit(o, 'rift'), wanderUntil = -1, lootKey = null
   stats.rifts++, stats['rift_' + why]++, tl('rf'); podpowiedź (nie przy fochu), napis "Rozłam" / "Obrażony/Obrażona" (foch, bunt) / "Nie zostawię!" (ratunek)
g2End(why):                                          // merge | fizzle | out | gone | last
   P.g2 = null; członkowie needPlan (merge: plan = P.plan); stats['g2end_' + why]++, stats.g2Time += czas, merge: stats.merges++, tl('rj')
g2Leader(): obecny przywódca grupy, jeśli żyje, w lochu, nie zgubiony, nie w klatce, bez paniki, nie wraca sam, nie ucieka;
   inaczej najwyższa ranga z grupy (brak: g2End('gone')); gdy grupa straciła głowę, plan 'regroup' i kolejkowane g2LeaderDown
g2Target(L2, Lm): granica (frontier) w znanej mapie o najmniejszym d - 0.6 × min(odległość od celu drużyny, 12) + rand × 2   // z dala od reszty
g2Think(Lm) (partyThink, po naradzie):
   członek, który widzi albo słyszy przywódcę grupy, przejmuje plan grupy
   reszta wychodzi, a ktoś z grupy słyszy krzyk przywódcy drużyny: g2End('out')   (nie grupa z narady, nie foch, nie ratunek przed końcem)
   ratunek: rescueThink (6.12.4)
   drużyna szturmuje (fearless && storm) i grupa słyszy krzyk: plan 'assault'
   najpierw muszą się rozejść (nikt z grupy nie jest samePlace z kimś z reszty): G.apart; inaczej po 20 s g2End('fizzle')
   spotkanie: G.apart, po 8 s od narodzin, ktoś z grupy samePlace z kimś z reszty i go widzi albo słyszy:
       foch/bunt: sulkBack od przywódcy grupy; inaczej mergeG2 i 70% mergeReply; g2End('merge')
   explore i (time > until albo nic do odkrycia): plan 'regroup'; assault bez znanego serca: explore
   explore bez ważnego celu: G.target = g2Target (brak: regroup)
   po 5 s, 2+ członków, przywódca nie mówi: raz g2Lead
g2Goal(h, heartGoal): brak grupy (zakończona w trakcie myślenia) -> pole przywódcy drużyny (1.24); assault -> serce; regroup -> pole przywódcy drużyny; inaczej G.target
```
`planHero`: przywódca grupy ma pracę `lead` z celem `g2Goal` (od 1.24 tylko gdy `P.g2` dalej istnieje); członkowie idą za nim (`groupLeaderOf`). Odległość do zgubienia i odnalezienia liczona do przywódcy własnej grupy; czekanie na maruderów pomija drugą grupę; `missLost` nie dla członków; `perceiveThink` nie nadpisuje im planu.

### 6.10.2 Skąd się bierze

| Źródło | Warunek | Kod |
|---|---|---|
| rozwidlenie (`fork`) | w trakcie narady przy rozwidleniu (6.3.3), plan `explore`, bez `fearless`, po 15 s, bez zwiadowcy, 3+ w grupie rozmowy, najwyżej 2 takie na falę; odszczepieniec: chciwy, którego przywódca nie posłuchał (50%), inaczej rywal przywódcy (1.21; ranga 1+, HP > 50%), inaczej odważny, chciwy albo łowca rangi 1+ z HP > 50% (20%); ×1,3 przy morale < 0,6, ×1,5 dla rywala; idzie drugą drogą z 1-2 podobnymi (chciwi, odważni, łowcy, barbarzyńcy, nowicjusze); po rozłamie nie ma zwiadu | `chooseTarget` |
| niespokojny (`restless`) | `riftThink`: plan `explore`, bez narady i `fearless`, nikt nie wychodzi, bez zwiadowcy, 3+ w grupie, od 15 s (1.24; było 20), łącznie najwyżej 2 rozłamy na falę, nikt nie rozmawia, 8 s od ostatniej rozmowy; kandydaci: chciwy, odważny, łowca, barbarzyńca albo rywal przywódcy, ranga 1+ (od 1.24 także chciwy nowicjusz i łowca), bez kryształu, HP > 50%, strach < 50% odwagi; szansa `dt × 0,06` (1.24; było 0,025) ×1,5 przy morale < 0,6, ×1,5 gdy rywal jest kandydatem (i on idzie pierwszy); cel `g2Target` co najmniej 4 pola od celu drużyny (1.24; było 6); dołącza do 2 podobnych (do `grupa - 3`); kwestie `riftStart` ({v} = przywódca), `riftJoin`, `riftLeader` | `riftThink` |
| narada (`council`) | na naradzie końca cierpliwości wynik "do domu", w lochu 4+ żywych, 2+ przegłosowanych za szturmem albo "jeszcze chwila" (bez kryształu, HP > 40%): 65%, gdy wśród nich jest odważny, chciwy albo łowca, inaczej 35%; zostają (najwyżej 3) i szukają dalej (`riftCouncilStorm`/`riftCouncilMore`; szturm tylko przy `heartP()`); drugi wracający sam mówi `homeTogether` i od pierwszego taka decyzja jest o 0,2 łatwiejsza | `councilThink`, `councilDone` |
| bunt (`mutiny`) | 6.10.3 | `mutinyThink` |
| foch (`sulk`) | przegrany bunt dumnego (45%), odrzucony stary przywódca po buncie (60%), dwa razy kazano mu zostawić łup (40%, nie ostrożny ani tchórz), od 1.21 przegrany w kłótni o łup (30%): `P.sulkAfter`, potem `sulkThink` robi grupę jednoosobową (`assault`, gdy serce znane i to odważny albo łowca, inaczej `explore`), `stats.sulks`, sam mówi `SOLO.sulkOff` | `sulkThink`, `lootDecision`, `quarrel` |
| ratunek (`rescue`) | 1.21 "Nie zostawię cię" (6.12.4) | `noLeave` |

Grupa z narady i foch nie idą za resztą do domu, gdy słyszą, że reszta wychodzi.

### 6.10.3 Bunt (`mutinyThink`, raz na falę)

```
if P.mutinyDone || P.council || P.g2 || goingOut() || fl.fearless || !L || grp < 3 || time < 20                       // 1.24: od 20 s (było 30)
   || (P.morale > 0.85 && fearR < 0.25 && avgHp > 0.8) || ktoś rozmawia || time - P.lastTalkAt < 6: return
dead = przywódca wie o śmierci w tej fali
if !dead && avgHp > 0.8 && fearR < 0.25 && P.morale > 0.75: return                   // 1.24 (było: morale <= 0.55 i śmierć albo HP < 55% albo strach > 45%)
if rand > dt × 0.25: return                                                         // 1.24: 25%/s (było 10%/s)
restless(o) = odważny || chciwy || łowca || barbarzyńca || (rywal przywódcy)
C = z grupy bez przywódcy: nie zgubiony, bez kryształu, HP > 50%, strach < 50% odwagi, oraz jedno z:
    rank > L.rank; restless i rank >= L.rank; L.rank 0 i rank >= 1; rank >= L.rank i HP% > HP% przywódcy + 25 pkt;
    restless i rank >= L.rank - 1, gdy przywódca ranny (< 60% HP) albo wstrząśnięty (strach > 40% odwagi)          // 1.24
    sortowanie: ranga malejąco, odważny pierwszy
głosy: przywódca 1,5, wyzywający 1 (elita 1,25); każdy inny popiera wyzywającego, gdy
    0.4 + fr + (1 - hp%) + (tchórz/ostrożny 0.5) - (odważny 0.5) + 0.25 × (C.rank - L.rank) + (rand - 0.5) × 0.8 > 0.9      // fr = strach/odwaga, max 1,5
kwestie: [C, mutinyStart {v}=L], do 3 innych mutinyBack/mutinyStay; P.convoNot wyklucza starego przywódcę z rozmowy
wygrana: L mutinyYield albo (dumny: odważny, chciwy, łowca albo elita; 60%) mutinyRefuse + sulkOff (foch po kwestiach); C mutinyWin;
         P.leaderId = C; jeśli fearR > 0.55 || avgHp < 0.45 || C tchórz albo ostrożny: P.mutinyHome (do domu po kwestiach, stats.mutinyHomes)
przegrana: C mutinyLose; odważny albo chciwy 45%: sulkOff i foch
stats.mutinies, mutinyWins, tl('mu'); napis "Bunt!"
```

### 6.10.4 Kwestie, widok, liczby

- Kwestie (`SAY`, 19 kluczy): `riftStart`, `riftJoin`, `riftLeader`, `riftCouncilMore`, `riftCouncilStorm`, `homeTogether`, `mergeG2`, `mergeReply`, `g2Lead`, `g2LeaderDown`, `mutinyStart`, `mutinyBack`, `mutinyStay`, `mutinyYield`, `mutinyRefuse`, `mutinyWin`, `mutinyLose`, `sulkOff`, `sulkBack`; `SOLO`: `sulkOff`, `g2LeaderDown`, `sulkBack`; `CONVO`: `riftStart`, `mutinyStart`, `mergeG2`, `sulkOff`. `P.convoNot = {key, ids}`: stary przywódca nie komentuje swojego buntu, dołączający swojego rozłamu (`convoStart`).
- Karta bohatera: stan "prowadzi drugą grupę" / "w drugiej grupie"; Liczby: "Rozłam: grupy / bunty (udane) / obrażeni / powroty"; bursztynowy pierścień pod członkami (sekcja 08).
- Odtworzenia 1.19: ok. 1-2 rozłamy i ok. 1 foch na run 10 fal; bunty rzadkie (morale rzadko dość niskie). 1.24 (200 fal, 6.15): rozłam w 34% fal, bunt w 32%, foch w 26%, rozłam z narady 0% (potrzebuje 2+ przegłosowanych w drużynie 4+), ratunek 2%, powrót do domu po buncie w 4%.

## 6.11 Ekwipunek i łup w zachowaniu (1.20; `p5_ai.js: lootDecision, claimScore, lootReassign, onLootRival, lootOffer, onLootDead, shareThink, fogRoll, lostChance, planHero, updateHero, onEnter`; `p3_flow.js: noticeLoot, pickup, bodyLoot, giveItem, curse`)

Dane przedmiotów (pochodzenie, ciężar, narzędzia): sekcja 04, 5.6. Decyzje autora: wybierano prostszą opcję tam, gdzie plan dawał wybór.

### 6.11.1 Rzeczy poległych i poprzedników

- `kill`: plecak i sakiewka spadają z `{ body: true }` (stosy znają ciało: `it.body`, `fromNm`).
- `noticeLoot` stosu z ciała: chciwość `LOOT_GREED.body = [0,075; 0,04]` (połowa sprzętu, bez Sezamu, Relikwiarza i Złotego pyłu; `stats.greedBody`); kto wie o tej śmierci (`fl.deaths` tej fali), mówi `SAY.lootFallen` z imieniem zmarłego (`stats.lootFallen`). Stos z ciała z wcześniejszej fali, widziany pierwszy raz: 60%, że widzący go rozpozna (`SAY.predecessorGear`, prio 3, zamiast zwykłej kwestii łupu), strach 5% odwagi (źródło `death`), raz na bohatera (`h.predSaid`); słyszący dostają `gear` do pamięci (`stats.predecessorSeen`, oś czasu `pr`). Decyzja: tylko stosy z ciała, bo kwestie mówią, że nikt nie wrócił.
- **Klątwa na przedmiocie**: `curse(h, item)` oznacza go `cursed`; podniesienie (`pickup`, `bodyLoot`) przeklętego przeklina biorącego (`stats.cursePassed`); `lootSeen`, `checkCursed` (kapłan to czuje) i `itemTags` traktują stos z przeklętym przedmiotem jak `lcursed`; zdjęta klątwa czyści też jego przedmioty (`heroAbilities`); przeklętego nie da się oddać ani wymienić.

### 6.11.2 Ciało do przeszukania, wybity przedmiot

- `pickup` stosu z ciała: bohater klęka (`state 'loot'`, 1,0 s, złodziej 0,5 s; `h.lootIt`), nie gdy wychodzi, panikuje albo siedzi w klatce i nie nad ciałem, które już przeglądał (`lootMemo` z `body: true`, 60 s), od 1.21 nigdy nad partnerem więzi (`mateBody`). `held()` (kolce ×1,5) i spokój liczą `loot` jako zajęcie; `startFlee` przerywa.
- `bodyLoot(h, it)`: wszystkie stosy tego ciała (ten sam `body` i `fromWave`) w 1,5 pola: monety zawsze, przedmiot o `itemValue >= 0,6`, który `giveItem` przyjmie (po cichu; `kit`/`guild` staje się `src: 'body'`). Każdy wzięty stos liczy się jak łup: chciwość `LOOT_GREED.body[1]`, `h.loot`, Groza `GZ.loot × 2 × depthMult` (rzadkość 2); Pułapka na łup i Zatrzask sezamu raz. Każdy zostawiony stos tego ciała dostaje w jego `lootMemo` "nie" na 60 s. Napis "Zabiera rzeczy <dopełniacz>".
- `lootDecision` stosu z ciała: ×0,7 dla tego, kto wie o tej śmierci (nie chciwy, nie łowca), ×0,5 dla kapłana (nie mikstura dla rannego), ×1,2 dla złodzieja, chciwego i łowcy. Własny wybity przedmiot (`it.knocked === h.id`): `need ×1,5`, ryzyko ×0,8; podniesienie przez właściciela po cichu, kolejkowane `SAY.gearBack`, `stats.gearBack`, i **nie jest łupem** (bez chciwości, Grozy, `h.loot`, `stats.loot`). Decyzja autora: bez tego Esencja w odtworzeniach rosła o 25-30% (odtworzenia rozstrzygają wiele checków krytykiem).
- `onLootDead(h, deadId, items, pile)`: zawsze `P.lootedDead.push`; z czymś wziętym `stats.bodyLoot`, `bodyLootBy[klasa]`, oś czasu `bl`, 60% `SAY.lootDead` (sam: `SOLO.lootDead`). Sprzeciw: 6.12.8.

### 6.11.3 Kto bierze łup

- `noticeLoot`: `it.firstBy` = pierwszy, kto go zobaczył w tej fali (`startWave` czyści).
- `claimScore(h, it)` = wartość dla niego (`itemValue`; bez przedmiotu: mikstura 3 dla rannego, inaczej 0,5; monety 1,5 złodziejowi, chciwemu i łowcy, inaczej 0,6; reszta 1, chciwemu 1,5) + 0,5 dla pierwszego, który widział.
- `lootReassign(h, cl, it, k, steps)` (`planHero`, gdy łup ma już chętnego): obaj w 8 krokach / polach; gdy `claimScore(h) >= claimScore(cl) + 0,8` i przywódca grupy rangi 1+ (żaden z nich, bez paniki) słyszy obu: roszczenie przechodzi, stary chętny dostaje "nie" na 7 s, przywódca mówi `SAY.lootAssign` ({n}/{v} = biorący), `stats.lootAssign`, oś czasu `qa`. Dwóch chciwych albo łowców bez takiego przywódcy: `onLootRival` (raz na parę i stos, `stats.lootRival`, oś czasu `qr`); od 1.21 chciwy, łowca albo rywal chętnego kłóci się (6.12.7).
- Odmowa podniesienia (bez potrzeby, bez miejsca, za ciężkie): wylosowany przedmiot zostaje w stosie (`it.item`; do 1.19 znikał), a `lootOffer`: przyjaciel z tej samej grupy, który go widzi, nie zgubiony, nie w klatce, bez paniki, nie wychodzi, może go wziąć i ma z niego 1+: `SAY.lootOffer`, jego "nie" kasowane, `o.offerKey`, kolejkowane `SAY.lootOfferTake`, `stats.lootOffer`, oś czasu `qo`; `lootDecision` daje mu `need >= 1,2`; wzięcie: `stats.lootOfferTaken`.

### 6.11.4 Dzielenie się (`shareThink`, raz na sekundę, po bloku mikstur)

```
1) kryzys: spokojny (strach < 40% odwagi) z gotowym nieprzeklętym amuletem oddaje go temu, kto ma strach >= 60% odwagi, nie ma gotowego
   amuletu i nie jest pod jego działaniem, w 2 polach, widzą się: do ręki (bez sprawdzania plecaka i ciężaru), useAmulet od razu,
   giveCd 10 s (wspólne z miksturami), stats.amuletGiven, SAY.amuletGive, napis "Od X: amulet"
2) w spokoju (nie fearless, nikt nie wychodzi, nie odwrót, P.shareCd minęło): zawsze przy rozmowie, odpoczynku, zbiórce albo postoju przed pokojem, inaczej 35%;
   dwóch z tej samej grupy, 2 pola, widzą się, obaj spokojni (bez paniki, klatki, zgubienia, wyjścia, walki, przeszukania, zagrożenia na polu,
   znanego potwora w pokoju); najlepszy przedmiot z itemValue(o) - itemValue(g) >= 1.0, który o może wziąć (nie mikstura, nie przeklęty,
   nigdy z powrotem do tego, kto dał: gaveBy); lepszy tego samego rodzaju odsyła stary przedmiot o do g (gdy ma dla g wartość i g może go wziąć)
   albo na podłogę; potem wymiana: najlepszy przedmiot o wart dla g 1+ więcej; shareCd 8 s obu, P.shareCd 4 s
   stats.gearGiven, gearTrades, P.gifts, tl('gv'), SAY.giveGear, kolejkowane giveGearThanks, napis "Od X: <przedmiot>"
```

### 6.11.5 Latarnia, łom, ciężar, bomby

- Mgła: `fogRoll(h, dt)` (oba miejsca w `partyThink`): `p = dt × 0,22 × max(0,35; 1 - 0,03 × lvl) × (złodziej 0,6)`; zapalona latarnia w 2 polach w tym pokoju zatrzymuje 70% rzutów (`stats.lanternSaves`, od 1.24 animacja światła). `lostChance`: część mgły 0,15 z latarnią (0,45 bez). Błądzenie przywódcy we mgle o połowę krótsze z latarnią obok, niosący mówi `SAY.lanternLight`. `scanTraps`: niosący widzi pułapki we mgle w 1 polu.
- Łom: przy zamkniętej kracie podważa ten z łomem obok kraty, inaczej złodziej; tempo ×1,5 (złodziej poz. 6+) ×1,5 (łom) ×0,5 (krata 3. poziomu). `planHero`: gdy drużyna czeka przy zamkniętej kracie (`P.blockSaid`, plan nie `explore`), ten z łomem albo złodziej (nie w drugiej grupie, bez paniki) idzie do kraty (`intent 'pry'`) i tam czeka (do 1.19 złodziej podważał tylko, gdy akurat stał obok). Klatka: ratownik z łomem 0,6 s, złodziej 0,5 s; uwięziony z łomem po 4 s sam (`freeCaged(h, false, 'pry')`).
- Ciężar: prędkość × `burden(h)`; pierwszy raz `SAY.heavyLoad`; poślizg na lodzie ×`(1 + max(0, load/carry - 0,5))`.
- Bomby w ogniu i przy przyjaciołach: sekcja 05, 5.13.2 (kwestie `bombCook` głośno prio 4, kolejkowane `bombFriendly`).

### 6.11.6 Kwestie i liczby

`SAY` (24 klucze, 164 kwestie): `lootFallen`, `predecessorGear`, `cursedKeep`, `lootDead`, `lootDeadObject`, `lootDeadReply`, `giveGear`, `giveGearThanks`, `amuletGive`, `tooHeavy`, `heavyLoad`, `lootAssign`, `lootOffer`, `lootOfferTake`, `lanternLight`, `lanternOut`, `crowbarGate`, `crowbarCage`, `gearKnocked`, `gearBack`, `mimicSpill`, `bombCook`, `bombFriendly`, `returnGear`; `SOLO`: `lootDead`, `cursedKeep`, `crowbarGate`, `bombCook`. Kwestie o rzeczach zmarłych nigdy nie używają płci zmarłego. `LINE_NEEDS`: kwestie latarni z mgłą `fog`, płonącej bomby z ogniem `fire`, łomu `gate`/`cage`, mimika `mimic`. Liczby (1.24, 200 fal): dzielenie się 34% fal, wymiana 1%, amulet 20%, oferta 30%, latarnia 38% (ratuje 12%), łom 0% (w lochach autora brak klatek, kraty rzadko odcinają drogę), przeszukanie ciała 39%.

## 6.12 Więzi i dramaty (1.21; zmiany 1.24; `p5_ai.js: bondOf, bondTalk, griefOf, vowK, bondHurt, rivalJab, rivalScare, mentorWatch, mentorProud, mentorRoom, mentorNear, quarrel, quarrelWon, noLeave, rescueThink, rescueJob, betThink, betStart, betEnd, betStep, bondThink`; `p3_flow.js: makeBonds, kill, damageRaw, addFear, say`)

Pary powstają w `makeBonds` (sekcja 04, 2.9). Wszystko dzieje się tylko między dwoma, którzy się widzą; kwestie z {v} nazywają partnera (nigdy jego płci). `bondText(h, k, o)`: kwestia z imieniem partnera, sam: wersja `SOLO`; `say()` od 1.21 podmienia w samotności tylko kwestie `SOLO` bez imienia.

### 6.12.1 Słowo pary (`bondThink`, `bondTalk`)

Każda para dostaje losowy moment 4-20 s po otwarciu drzwi; kwestia (`bondFriend` / `bondSibling` / `bondRival` / `bondMentor`) idzie przez kolejkę drużyny (przy drzwiach jest tłok) i przepada po 25 s. Mistrz mówi do ucznia, nigdy odwrotnie; w innych parach jeden z dwóch. Odpowiedź partnera `bondReply` 60%; bez niej może zacząć się `CONVO` (zestaw `bondFriend`), z partnerem wykluczonym (`P.convoNot`). `stats.bondLines`, oś czasu `bk`. W small talku wybrany z więzią w 25% mówi słowo pary zamiast pogaduszki (raz na 30 s na parę, tylko w ciszy, partner w zasięgu wzroku).

### 6.12.2 Żałoba i zemsta (`griefOf`, `kill`, `perceiveThink`)

Partner zmarłego, który widzi śmierć albo słyszy krzyk (`d.knows`), zamiast zwykłej kwestii i strachu woła `griefOf(o, dead, base, d)`; dowiadujący się później (wieść od towarzysza): kwestia mówiącego, potem jego żałoba (kolejka) zamiast `newsDeath`; znalezienie ciała: żałoba zamiast `bodyFound`. Od 1.24 napis "Żałoba" (rywal: "Szok").
```
rywal:                    griefRival, strach × 0.5
uczeń zmarłego mistrza:   griefMentor, strach × 1.5, growAt = time + 20: jeśli przeżyje, odwaga × 1.15 do końca fali ("Dorasta", stats.grownUp)
przyjaciel, rodzeństwo, mistrz zmarłego ucznia (griefFriend):
   nie ucieka i (odważny || barbarzyńca || wojownik 50%) i startRage(o, 'vow', dead):
      revengeVow ({v} = zmarły; sam SOLO), vowUntil = time + 30, vowOn = potwór, który go zabił (d.killer, żywy), strach × 0.3,
      stats.revengeVows, revenge, napis "Zemsta!" (1.24)
   inaczej kwestia żałoby, strach × 1.5
(tchórz: strach × 1.5 na wierzch, jak dotąd)
```
Zemsta: `planHero` daje pracę walki z `vowOn`, dopóki żyje i jest w jego pokoju (nie unoszący się duch ani cień); `vowK(h) = 1,3` do obrażeń wręcz potworów i kuli ognia maga. Wszystkie kwestie żałoby i `revengeVow` są w `LINE_NEEDS.death` (mówi je tylko ten, kto zna tę śmierć; jest dopisywany do `d.knows` przed kwestią). `stats.griefs`, `revengeFights`; oś czasu `gf`, `vw`, `gu`.

### 6.12.3 Mistrz i uczeń

- `mentorWatch(m, a)` (raz na 25 s, mistrz go widzi): uczeń wchodzi do pokoju ze znaną pułapką (`mentorRoom`, `onEnter`) albo traci od pułapki lub potwora 10%+ HP (`bondHurt`); `SAY.mentorWatch` ({v} = uczeń), 60% kolejkowane `apprenticeReply`.
- `mentorProud(a)` (raz na 25 s): uczeń rozbroił pułapkę albo 3 s po trafieniu, które zostawiło go poniżej 30% HP, jeśli żyje (`h.proudAt`); `SAY.mentorProud`.
- Uczeń idzie za mistrzem zamiast za przywódcą, gdy mistrz idzie za przywódcą w 6 polach, widzi go, nie ma własnej pracy, ta sama grupa; `lostChance ×0,7` z mistrzem w 3 polach w zasięgu wzroku (`mentorNear`).
- `stats.mentorWatch`, `mentorProud`; oś czasu `mw`, `mp`.

### 6.12.4 "Nie zostawię cię" (`noLeave`, `rescueThink`, `rescueJob`)

- `decideCage`: przywódca nigdy nie zostawia w klatce własnego partnera (nie rywala). Gdy zostawia kogoś, `noLeave(c, L, pole)`; gdy rezygnuje ze zgubionego (`missLost`), `noLeave(zgubiony, L, ostatnio widziane pole)`.
- `noLeave`: partner (przyjaciel, rodzeństwo, mistrz/uczeń; nie rywal), spokojny, nie wychodzi, bez kryształu, nie przywódca, nie na zwiadzie, drugiej grupy jeszcze nie ma, i słyszy przywódcę (albo sam nim jest) albo krzyk uwięzionego: kolejkowane `noLeave` ({v} = przyjaciel) i `noLeaveReply` uwięzionego; `g2Start(m, [], 'rescue', pole, 'rescue')`, `P.g2.partner`, `P.g2.apart = true`, uwięziony przestaje być porzucony (koniec strachu samotnej klatki). Podpowiedź "X nie zostawi przyjaciela: wraca po niego sam(a).", napis "Nie zostawię!".
- Plan `rescue` (`rescueJob` dla przywódcy drugiej grupy): do pola obok klatki, potem `state 'free'` (zwykłe otwieranie, także czasy łomu); po zgubionego: do miejsca, gdzie był ostatnio, potem (widziany, słyszany albo miejsce osiągnięte) do jego pola dowolną drogą.
- `rescueThink` (`g2Think`): zgubiony blisko (2,5 pola) i w zasięgu wzroku jest odnaleziony (`SAY.found`); uwolniony albo odnaleziony w 6 polach dołącza do grupy (`stats.noLeaveSaved`) i idą `regroup` (do przywódcy, potem zwykłe scalenie); martwy, zniknął albo minęło 40 s: `regroup`. Grupa ratunku zostaje, gdy inni wychodzą, nie musi się rozchodzić, nie scala się przed końcem.
- Zwykły ratunek: partner uwięzionego jest pierwszym kandydatem na ratownika; `cageEnds` czeka do 8 s dłużej, gdy grupa ratunku partnera jest w drodze. `stats.noLeave`, `noLeaveSaved`; oś czasu `nl`, `ns`. Decyzja: przy szukaniu zgubionego przez przywódcę partner idzie z drużyną.

### 6.12.5 Rywale (`bondHurt`, `rivalJab`, `rivalScare`)

Od 1.24: rana od pułapki albo potwora 8%+ HP widziana przez rywala (do 1.23: tylko pułapka i 20%+ HP, co przy wysokich poziomach prawie nie zdarzało się: 0 na 200 fal) albo, nowe, strach 8%+ odwagi od pułapki lub potwora (`addFear` -> `rivalScare`; wtedy kwestie bez słów "Ała", "Boli", "Uważaj" i odpowiedzi bez "draśnięcie", "zabiło", "Nic mi nie jest"); szansa 80%, raz na 12 s, zajęty: kolejka; `rivalMock` ({v} = trafiony), kolejkowane `rivalMockReply`, trafiony wykluczony z rozmowy; napis "Drwina", `stats.rivalMock`, oś czasu `rm`. Rywal przywódcy jest pierwszym kandydatem do rozłamu (×1,5, 6.10.2) i do kłótni o łup.

### 6.12.6 Zakład (`betThink`, `betStart`, `betEnd`, `betStep`)

```
betThink (bondThink, co tick): raz na falę, nie w odwrocie, bez fearless, nikt nie wychodzi, od 8 s (1.24; było 10), bez rozmowy dłuższej niż 3 s
   rv = rywal, który go widzi i jest spokojny
   kandydat: nie przywódca, ranga 1+ (albo z rv, albo łowca), HP > 50% (1.24; było 60%), spokojny, nie wychodzi, nie w drugiej grupie,
      nie na zwiadzie ani wypadzie, nie mówi, idzie (walk), w pokoju, bez kryształu;
      odważny, chciwy, łowca, barbarzyńca albo z rv (1.24; było: odważny albo rywal); rozgląda się raz na sekundę
   pułapki: wykryte, włączone, cd <= 0, w jego pokoju, jeszcze nie próbowane dla tej pary
   pułapka, której obszar dotyka drogi przywódcy, jego drogi albo drogi drużyny (partyWay), inaczej (1.24) każda z przechodnim polem w obszarze
   jeden rzut na bohatera i pułapkę: 85% (1.24; było 70%)
   przyjmujący: rv, inaczej ktoś spokojny, kto go widzi i nie mówi
betStart: betStart (przyjmujący wykluczony z rozmowy), kolejkowane betTake ({v} = zakładający), napis "Zakład!"; h.bet na 8 s:
   planHero daje pracę do najdalszego pola obszaru z noDanger (przechodzi przez obszar)
betStep (onEnter): w obszarze, potem z niego bez trafienia: wygrana (betWin {v} = przyjmujący, moneta od przyjmującego, napis "Wygrany zakład")
trafiony tą pułapką (bondHurt) albo zabity: przegrana (betLose przyjmującego {v} = zakładający, moneta od zakładającego); nie wszedł w 12 s: odwołany
stats.bets, betsWon, betsLost, betsOff; oś czasu bt, be
```
Zakład jest dobry dla gracza (bohater wchodzi w pułapkę celowo), więc z założenia rzadki. 1.21: ok. 1 na 6-8 fal; 1.24: w 34% fal.

### 6.12.7 Kłótnia o łup (`quarrel`, `quarrelWon`)

`lootReassign`: przydział przywódcy (claimScore +0,8) jak w 1.20; inaczej chcący zajętego łupu (chciwy, łowca albo rywal chętnego, w 8 krokach, nie zbanowany) woła `quarrel(h, cl, it, k)`: raz na parę na falę, widzą się, spokojni, nie wychodzą, nie mówią. Napis "Kłótnia!" (1.24), `quarrelStart` ({v} = drugi; drugi wykluczony z rozmowy), kolejkowane `quarrelReply`. Przywódca grupy (żaden z nich, spokojny, widzi obu) przerywa w 40%: `SAY.lootStop`, roszczenie kasowane, `it.qBan` = nikt przez 10 s (`stats.quarrelStops`). Inaczej wygrywa wyższy wynik: ranga + 1 (chciwy albo łowca) + 1 (barbarzyńca) + 1 (przywódca) + rand × 0,5; roszczenie jego, `it.qBan` = przegrany przez 10 s (`lootDecision`, `pickup`), kolejkowane `quarrelLose`; przegrany chciwy, łowca albo rywal (nie przywódca) odchodzi obrażony w 30% (foch 1.19, `stats.quarrelSulks`). `quarrelWin`, gdy zwycięzca podniesie łup (`pickup`, `bodyLoot`; `stats.quarrelWins`). `stats.quarrels`; oś czasu `qq`. Ok. 0,6 kłótni na falę (1.21), 1,5 (1.24, 55% fal).

### 6.12.8 Grabienie poległych (`onLootDead`, `mateBody`)

Sprzeciw: partner zmarłego zawsze (jeśli widzi grabiącego), inaczej kapłan albo ostrożny, który wie o tej śmierci, w 50% (nie chciwy, nie łowca): `lootDeadObject` ({v} = grabiący) i `lootDeadReply`; `P.morale -= 0,05` (min. 0,15); `stats.lootDeadObject`, oś czasu `ob`. Partnera ma tylko śmierć z tej fali (id są falowe). `mateBody`: partner nigdy nie przeszukuje ciała swojej pary.

### 6.12.9 Kwestie i liczby

`SAY` (25 kluczy po 10 kwestii): `bondFriend`, `bondSibling`, `bondRival`, `bondMentor`, `bondReply`, `griefFriend`, `griefSibling`, `griefMentor`, `griefRival`, `revengeVow`, `noLeave`, `noLeaveReply`, `mentorWatch`, `apprenticeReply`, `mentorProud`, `rivalMock`, `rivalMockReply`, `quarrelStart`, `quarrelReply`, `quarrelWin`, `quarrelLose`, `betStart`, `betTake`, `betWin`, `betLose`; `SOLO`: `griefFriend` (6), `revengeVow` (6); `CONVO`: `griefFriend` (7), `quarrelStart` (6), `betStart` (7), `rivalMock` (6), `bondFriend` (7). Liczby: "Więzi: pary / żałoba (zemsta) / nie zostawię (uratowani) / mistrz: uwagi, pochwały / kpiny / kłótnie (przerwane) / sprzeciw nad ciałem / zakłady: wygrane-przegrane" (sekcja 08). Od 1.21 `convoStart` proponuje wymianę z rolą C tylko wtedy, gdy ktoś inny w zasięgu słuchu zna kwestie C (do 1.20 wymiana na trzy głosy szła bez C).

## 6.13 Finał fali (1.22; zmiany 1.24; `p5_ai.js: finOf, finalThink, escortThink, escortGoal, escortPace, guardOf, handThink, threatNear, standStart, standThink, lsBrave, reachAvoid, sacStart, sacTick, sacHold, youFirst, tapRoom, tapStep, notThisWay, formThink, formedFoe, backTile`)

`finalThink(crew, L, dt)` co tick (`partyThink`, po `bondThink`); stan fali w `P.fin` (`finOf`). Przy ucieczce z kryształem (`carrierOf()` i `P.plan === 'escape'`): eskorta, przekazanie, ostatni bastion, poświęcenie, "prawie wyszli"; od 1.24 bez kryształu, gdy w drużynie 2+: ostatni bastion za przyjaciela ciężko rannego (< 30% HP) albo panikującego z potworem przy nim (nie w klatce, nie zgubiony, `threatNear`). Zawsze: `standThink`, `sacTick`, `formThink`.

### 6.13.1 Eskorta

- `escortThink`: nowy niosący (z serca): ci, którzy go widzą, spokojni, na planie ucieczki, 35%+ HP, nie wracają sami, nie w bastionie ani poświęceniu, dostają `h.escort`; przywódca (jeśli jest wśród nich) albo najzdrowszy mówi `escortForm`, strażnik (wojownik pierwszy, inaczej najbliższy) kolejkuje `escortGuard` ({v} = niosący), niosący `carrierThanks`. Nikt go nie widzi: formują się, gdy ktoś zobaczy; kto zobaczy później, dołącza. Przekazany kryształ zachowuje straż (bez nowego wołania). `stats.escortForms`, `escortGuards`; oś czasu `ef`.
- `escortGoal(h, c, b)` (`planHero`, gałąź wychodzenia, `exit` z `escort`, nie ucieka, nie wraca sam): wolne bezpieczne pole (`danger <= 1`) w 2 krokach (Manhattan) od miejsca, gdzie niosący będzie za krok (`path[0]`), poza jego bieżącym, następnym i 3 kolejnymi polami; wojownik wokół pola 3 kroki przed nim (z przodu, waga odległości ×2), reszta najbliżej niosącego; + 0,25 × koszt drogi. Brak miejsca (przejście): pole niosącego (strażnik staje krok przed nim). Niosący poza zasięgiem wzroku i dalej niż 8 pól: wyjście jak dotąd. Na swoim polu czeka 0,15 s, w drodze patrzy znów po 0,25 s (`intent 'escort'`).
- `escortPace(h)` (prędkość w `updateHero`): strażnik idący na swoje pole idzie co najmniej tempem niosącego ×1,05 (wojownik ×1,2), najwyżej 1,4 swojego (`clamp(..., 1, 1,4)`). Decyzja: bez tego złodziej z kryształem (1,9) zostawiał kapłana i maga (1,3).
- Przejęcie ciosu (`monstersTick`): sekcja 05, 5.13.3. Złoty pierścień pod strażnikiem (sekcja 08).

### 6.13.2 Przekazanie (`handThink`)

```
scared = strach niosącego >= 60% odwagi; hurt = HP < 50% (1.24; było 35%)
weak (1.24) = !hurt && !scared && pierwsze przekazanie fali && niosący to mag, kapłan albo bard
if (!hurt && !scared && !weak) || przekazań >= 2 || time - ostatnie < 6 || niosący w klatce: return
odbiorca: HP >= 50% (1.24; było 60%) i
   weak:   wojownik albo barbarzyńca z HP >= 70%
   inaczej: HP% >= HP% niosącego + 20 pkt (przestraszony niosący: bez tej różnicy, ale odbiorca ze strachem < 40% odwagi)
   spokojny, nie wraca sam, nie w bastionie ani poświęceniu, w 2,5 pola (1.24; było 1,5), widzi niosącego; najzdrowszy
kryształ przechodzi (P.carrierId, plan odbiorcy 'escape', fleeing = false); walka, czekanie, rozmowa, odpoczynek -> walk
stats.handOvers, tl('ho'); napisy "Przekazuje kryształ" (1.24) i "Niesie kryształ"
handOver ({v} = odbiorca; z okLines: kwestia o krwawieniu tylko, gdy wie, że krwawi; 1.24: niosący nie ranny bez kwestii o ranach),
handTake kolejkowane (chyba że kwestia zaczęła rozmowę); zajęta "podłoga": obie w kolejce
```
Statystyki kradzieży bez zmian.

### 6.13.3 Ostatni bastion (`standStart`, `standThink`, `threatNear`, `lsBrave`)

- `threatNear(c)`: unoszący się potwór (duch, cień, nietoperze; `gx/gy`) albo potwór wręcz, z którym ktoś walczy, w 3 polach (nie ukryty w zasadzce); najbliższy.
- `standStart` (raz na falę): kandydat spokojny, przy krysztale na planie ucieczki (od 1.24 za przyjaciela: dowolny plan, nie z kryształem, nie w drugiej grupie, nie na zwiadzie), nie wraca sam, 40%+ HP, nie w poświęceniu, w 6 polach od chronionego, `lsBrave` (odważny, od 1.24 elita, albo wojownik/barbarzyńca z rzutem 50% raz na falę); najbliższy potworowi. Miejsce: najbliższe drzwi (najwyżej 6 kroków, nie wejście, nie na drodze niosącego, bliżej potwora niż niosący i bliżej niosącego, w 5 polach od niego) pokoju niosącego, potwora albo swojego, inaczej tam, gdzie stoi. `h.stand = { m, goal, door, until: +8 s, cid, cr }`; napis "Ostatni bastion!" (1.24; było "Zostaje!"); `lastStand` głośno prio 4 (sam `SOLO`; kwestie o drzwiach, progu i ciasnocie tylko w drzwiach), przyjaciel, który go słyszy, kolejkuje `lastStandReply` ({v} = on).
- `planHero` (przed gałęzią wychodzenia): do miejsca z `noDanger`; tam potwór wręcz w zasięgu = `state 'fight'` (`updateHero` nie przerywa tej walki z powodu wychodzenia), inaczej `wait`; `toSafety` go nie przesuwa. `driftTarget`: unoszący się potwór wybiera stojącego w 3 polach.
- `standThink`: koniec po 8 s, poniżej 25% HP, przy panice albo ucieczce, gdy potwór zginie albo gdy chroniony zniknie (kryształ: `carrierOf()`; od 1.24 przyjaciel: dopóki żyje i jest w lochu); potem biegnie do wyjścia. `stats.lastStands`, `lastStandT`; oś czasu `lx`, `le`. Pierwsza wersja 1.24 stawała też za przyjacielem tylko przestraszonym (80%+): zabierała mu duchy i loch strachu płacił ok. 10% mniej w falach 6-10, więc tego nie ma.

### 6.13.4 Poświęcenie (`sacStart`, `sacTick`, `sacHold`, `reachAvoid`)

- `sacStart` (rozglądanie raz na sekundę, raz na falę): znana droga niosącego do wyjścia (`bfs known, noDanger`) i pierwsza znana, gotowa (`cd <= 0,3`, nie zakłócona) pułapka podłogowa albo ścienna, której obszar dotyka pierwszych 12 kroków tam, gdzie `fl.danger >= 1`; nie klatka (trzymałaby go) ani rekwizyt strachu. "Nie ma innej drogi": `reachAvoid` (znana droga od niosącego do wyjścia omijająca obszar) się nie udaje, a niosący nie stoi już w obszarze. Bohater: odważny, inaczej kapłan (30%), inaczej najzdrowszy; na planie ucieczki, spokojny, nie wraca sam, nie w bastionie, 35%+ HP, w 8 polach, nie niosący. Cel: przechodnie pole obszaru, do którego dojdzie (najpierw na drodze niosącego, najbliższe). `sacrifice` ('q' albo kolejka), `sacrificeReply` ({v} = on) od słyszącego; napis "Poświęca się"; `F.sac = { ..., until: +6 + 0,6 × kroki, wait: +4 + 0,6 × kroki }`.
- `planHero`: do celu z `noDanger`, potem stoi w nim (`wait`, bez `toSafety`), aż pułapka odpali na niego zwykłą drogą (check albo sama).
- `sacTick`: `cd > 0` = odpaliła: `sacrificeDone` (głośno, jeśli żyje), `stats.sacrificeFired`; koniec, gdy odpaliła, on martwy/zniknął/przestraszony, pułapki nie ma albo minął `until`.
- `sacHold(h)` (`updateHero`, przed krokiem): inni wychodzący (bez paniki) stają, gdy jeden z ich 2 następnych kroków jest w obszarze, aż odpali albo minie `wait`. Decyzja: `P.waitUntil` trzyma tylko przywódcę i nie przy wychodzeniu, więc wstrzymanie jest osobne. `stats.sacrifices`; oś czasu `sf`, `sd`.

### 6.13.5 "Ty pierwszy" (`youFirst`), opukiwanie podłogi (`tapRoom`, `tapStep`), "nie tędy" (`notThisWay`)

- `youFirst(h, n)` (`updateHero`, przed krokiem): zwiedzający tchórz albo ostrożny (nie wychodzi, bez paniki, nie zgubiony, nie w drugiej grupie, nie na zwiadzie) przed wejściem do pokoju ze znaną pułapką albo rekwizytem (`LOOKS_TRAP`, wykryte, włączone); każdy pokój raz (60%), raz na 40 s, 2 na falę. Wysłany: spokojny, widzi go, w 4 polach, nie walczy; najpierw jego rywal, potem nowicjusz, potem najbliższy. `o.firstInto = { room, goal: krok albo dwa w głąb pokoju na drodze tchórza, until: +6 s }` (praca `first`, kasowana, gdy jest w pokoju); tchórz czeka 1,5 s. `youFirst` ({v} = wysłany), `youFirstReply`. `stats.youFirst`; oś czasu `yf`.
- `tapRoom(h, r, fresh)` (`onEnter`, nowy pokój): ostrożny albo złodziej-nowicjusz wchodzący do pokoju, przez który nikt jeszcze nie przeszedł albo w 4 s od pierwszego (`R.visitT`), 60%, 3 pokoje na falę (`h.taps`): `h.tap`, `tapFloor` (sam `SOLO`); w tym pokoju idzie ×0,7. Wychodzi bez znaleziska: `tapNothing` (40%). `tapStep(h, n)`: każda ukryta, działająca pułapka podłogowa (kolce, zapadnia, klatka, sieć) w 1 polu (Czebyszew) od następnego kroku ma jeden rzut 35% na falę (`h.tapRolled`); znaleziona: `learnTrap(it, 'tap', h)` (znalazca mówi `tapFound`), `stats.detected`, napis "Opukana!", staje i planuje od nowa. `stats.taps`, `tapFound`; oś czasu `tp`, `tf`.
- `notThisWay(L, crew)` (`partyThink`, po nowym celu): raz na falę, znana droga przywódcy do `P.target` przechodzi przez pokój (nie jego) ze znaną, działającą pułapką z `P.hurt` (`damageRaw` pamięta, kogo każda pułapka zraniła); mówiący: spokojny, słyszy przywódcę, nie przywódca, ranga 2+ albo zraniony przez nią (pierwszeństwo). Kolejkowane `notThisWay` (kwestie "Byłem tam", "Raz mi wystarczyło", "Pamiętam to miejsce" tylko od zranionego), potem `chooseTarget(L, room)`: `bfs` z `costRoom` (+20 za pole tego pokoju) i +1000 za cel w nim, bez narady przy rozwidleniu. `stats.notThisWay`, `notThisWayMoved`; oś czasu `nw`.

### 6.13.6 Szyk w walce (`formThink`, `formedFoe`, `backTile`)

Każdy potwór wręcz, z którym ktoś walczy (nie przy wychodzeniu), z wojownikiem obok (spokojny, 30%+ HP, nie wycofany, w pokoju potwora albo 2 pola) i kimś jeszcze: `w.front = m` (`planHero` posyła go na potwora; `monstersTick` bije go pierwszego, ogr dalej wszystkich), `frontLine` raz na walkę; kapłan albo mag walczący z nim (bez furii) wychodzi z walki. Walczący poniżej 30% HP (raz na falę, nie w bastionie) z wojownikiem albo innym walczącym obok: `woundedBack`, 4 s poza walką (`backUntil`, `backFrom`), `backTile` (wolne bezpieczne pole 2-3 pola od potwora, za wojownikiem, najbliższe), bez prac walki. `formedFoe(h)`: potwór jego pokoju trzymany przez wojownika (także gdy wojownik do niego idzie); kapłan i mag nie dołączają do tej walki i trzymają się 2-4 pola od niej. `stats.frontLines`, `woundedBack`; oś czasu `fm`, `wb`.

### 6.13.7 Prawie wyszli, kwestie, liczby

- Niosący w 6 polach od wyjścia: kolejkowane `nearExit` raz na falę (sam `SOLO`). `stats.nearExit`; oś czasu `ne`.
- `SAY` (19 kluczy, 185 kwestii): `escortForm`, `escortGuard`, `carrierThanks`, `handOver`, `handTake`, `lastStand`, `lastStandReply`, `sacrifice`, `sacrificeReply`, `sacrificeDone`, `youFirst`, `youFirstReply`, `tapFloor`, `tapFound`, `tapNothing`, `notThisWay`, `frontLine`, `woundedBack`, `nearExit`; `SOLO`: `tapFloor`, `nearExit`, `lastStand` (po 6); `CONVO`: `handOver` (7), `lastStand` (7), `youFirst` (6), `notThisWay` (7). `LINE_NEEDS.blood`: `woundedBack` "Krwawię... Zasłońcie mnie!", `handOver` "Dalej ty, {v}. Krwawię jak prosię." i `CONVO handOver` "Ojej, tyle krwi..." (ranny poniżej 40% HP zna `blood`).
- Odtworzenia 1.22 (7 serii na run): utracone kryształy +14%, Esencja +5% względem 1.21 (w granicach: +25% / -10%). 1.24 (200 fal, 6.15): eskorta 22% fal, przekazanie 10%, bastion 46%, poświęcenie 6%, "ty pierwszy" 18%, opukiwanie 28%, "nie tędy" 28%, szyk 40%.

## 6.14 Nemezis w lochu i pamięć poległych (1.23; `p5_ai.js: nemOf, grudgeAdd, nemesisSpawn, grudgeItem, nemAnswer, nemBoast, nemesisThink, bountyTalk, nemGrudgeLook, grudgeJob, nemGrudgeDone, nemWarn, nemBefore, nemMissed, nemesisRage, nemesisKilled, rememberFallen, fallenRoom`; `p3_flow.js: nemHold, damageRaw, addFear, startFlee, partyFlee, kill, heroExit`; `p4_traps.js: fire, rebuildThreat, monstersTick`)

Kto zostaje Nemezis, tytuły, siła, wejście i nagroda: sekcja 04, 6.9. Tu zachowanie. Stan fali `P.nem = { warned, fallenRooms, fallenN, boasts, boastT, bounty, bountyT }`. `nemesisThink(crew, L)` co tick po `finalThink`.

### 6.14.1 Uraza

- `grudgeItem(h)`: element tego typu na starym polu, inaczej najbliższy działający tego typu gdziekolwiek (nie `temp`, nie wyłączony, nie rozbity, żywy potwór).
- `nemGrudgeLook(h)`: spokojny, nie wychodzi, rzecz w jego pokoju (nie potwór ukryty w zasadzce): raz `nemesisGrudge`, `h.grudgeOn`, 25 s na załatwienie, pułapka staje się wykryta; jeśli on jej nie załatwi (złodziej i `DISARMABLE` albo barbarzyńca bez Okowów), dostaje `grudgeW = run.wave`, a jej zagrożenie liczy się ×2 w `rebuildThreat` (z limitem 6 jak dotąd). `stats.grudgeHits`; oś czasu `ng`.
- `grudgeJob(h, b)` (`planHero`, po zemście, przed leczeniem kapłana; nie w panice, nie zgubiony, bez `fearless`): złodziej i pułapka `DISARMABLE`: do miejsca rozbrajania, potem zwykły stan `disarm` (wpadka, mechanizm samobójczy, saper jak zwykle); barbarzyńca (nie w Okowach): do pola obok, potem `smash` z `{ kind: 'b', ref: pułapka }` (`smashDone` oznacza ją rozbitą i wyłączoną na falę); inni: bez pracy. Potwór (nie unoszący się) w jego pokoju: praca walki (`intent 'fight'`) bez względu na klasę; `nemK(h, m) = 1,25` do obrażeń wręcz i kuli ognia.
- Załatwione (rozbrojona/zdjęta, rozbita, potwór martwy): `stats.grudgeDone`, `nemesisBoast`; oś czasu `nd`.

### 6.14.2 Ostrzeżenia, przechwałki, brak paniki, ucieczka z kryształem

- `nemWarn`: następne 5 kroków przywódcy wchodzi do pokoju (kind `room`), który pamięta, z jedną z `h.nemTraps` działającą w nim; raz na pokój na falę; słyszy przywódcę (albo prowadzi); `nemesisWarn`, odpowiedź 50% (`nemAnswer`) chyba że zaczęła się rozmowa. `stats.nemesisWarn`; oś czasu `nw2`.
- `nemesisRage`: poniżej 30% HP raz (`damageRaw`), napis "Nie ucieknie!", `stats.nemesisRage`, oś czasu `nr`.
- `nemHold(h)` (`p3_flow.js`): Nemezis powyżej 15% HP nie panikuje (`addFear`), nie upuszcza kryształu ze strachu, `startFlee` od razu wraca (także odpychanie serca i uwolnienie z klatki), a `partyFlee` nie oznacza go jako uciekającego (wychodzi z nimi jak czempion).
- `nemesisBoast`: pułapka z `h.nemTraps` odpala (`fire()` w `p4_traps.js`: `nemBefore`/`nemMissed`), a on w 1 polu od jej obszaru nie stracił HP: najwyżej 2 na falę, co 10 s; zawsze po załatwionej urazie. `stats.nemesisBoast`; oś czasu `nx`.
- `nemesisEscape`: niesie kryształ, 2,5 pola od wyjścia (przed drzwiami, bo dymek znika przy wyjściu). `heroExit`: `stats.nemesisOut`, `nemesisCrystal`; oś czasu `no`.
- `nemesisDown` ({g} = on): towarzysz, który widzi jego śmierć (nie ucieka, bez paniki, nie w klatce), mówi to (prio 4) zamiast zwykłej kwestii śmierci. `stats.nemesisDown`.

### 6.14.3 Rozmowa o nagrodzie (`bountyTalk`)

Z Nemezis w fali (w lochu albo w kolejce), od 6 s, rozglądanie raz na sekundę do 60 s: nikt nie walczy ani nie panikuje, nikt nie wychodzi; spokojny (nie on; chciwy albo łowca pierwszy), którego ktoś słyszy, mówi `bountyTalk` (teraz albo przy następnym spojrzeniu), `bountyReply` 60% chyba że zaczęła się rozmowa. `stats.bountyTalk`; oś czasu `bn`.

### 6.14.4 Pamięć poległych (`rememberFallen`, `fallenRoom`)

`fallenRoom(h, r)` (`onEnter`, nowy pokój albo korytarz): poległy z wcześniejszej fali zginął tutaj; pierwszy spokojny bohater, który wchodzi (nie wychodzi, nie mówi), oznacza pokój na tę falę i w 70% mówi: `nemesisFallen` ({g}), gdy jeden z nich był Nemezis, inaczej `fallenMemory` ({g} = ostatni; sam `SOLO`); `fallenReply` 60% chyba że zaczęła się rozmowa; 3 na falę. `stats.fallenMemory`; oś czasu `fm` (ten sam kod co szyk w walce, 6.13.6). Decyzja: wchodzący w panice albo biegnący nie zużywa pokoju (następny spokojny może mówić).

### 6.14.5 Kwestie i liczby

`SAY` (14 kluczy, 136 kwestii): `nemesisIntro`, `nemesisGrudge`, `nemesisWarn`, `nemesisReply`, `nemesisFollow` ({v}), `nemesisRage`, `nemesisBoast`, `nemesisEscape`, `nemesisDown` ({g}), `nemesisFallen` ({g}), `fallenMemory` ({g}), `fallenReply`, `bountyTalk`, `bountyReply`; `SOLO`: `nemesisIntro` (6), `nemesisGrudge` (6), `fallenMemory` (5, cztery z {g}); `CONVO`: `nemesisIntro` (8), `fallenMemory` (8), `bountyTalk` (7) (startują same po kwestii A, `convoAfter`). {g}/{v} wypełnia `nameFill` (wpis poległego ma `nm` i `female`). Liczby: "Nemezis: w fali / nagrody (Esencja) / urazy (załatwione) / ostrzeżenia / pamięć poległych". 1.24 (200 fal): Nemezis w 24% fal, nagroda wypłacona 2%, rozmowa o nagrodzie 4%, pamięć poległych 50%.

## 6.15 Wyczerpanie na końcu fali i częstość zdarzeń (1.24; `p3_flow.js: waveExhausted, waveForceOut`; `p6_loop.js: step`)

### 6.15.1 Wyczerpanie zamiast teleportu

Autor: pod koniec najazdu bohaterowie czasem znikali, a fala kończyła się przypadkowo. Do 1.23 `step` przy `fl.patT >= S.waveTime + 60` wyprowadzał każdego w środku tam, gdzie stał (także zniknięty w zapadni); od 1.17-1.22 (narada "jeszcze chwila", szturm, druga grupa, fochy, bastion) zdarzało się to częściej.
```
waveExhausted() (raz, fl.exhausted; stats.exhausted, tl('xh', ilu w środku)):
   P.g2 -> g2End('out'); P.council = null; P.councilMore = true; P.sulkAfter = null; P.mutinyHome = 0; P.scoutId = P.scoutMate = -1; P.prep = null; P.detour = null
   poświęcenie zakończone; fl.fearless = true; fl.storm = false; fl.queue = []            // reszta drużyny zostaje na zewnątrz
   if P.plan nie 'escape' i nie 'flee': P.plan = 'leave'
   każdy żywy w lochu: zakład odwołany (betEnd, jako betsOff), bastion i poświęcenie zakończone, h.plan = null (niosący zostaje przy 'escape'),
      split, wander, zemsta i łup kasowane, needPlan; zgubiony odnajduje drogę (lost = false, reveal); rest/talk/wait/boss -> walk;
      napis "Wyczerpany/Wyczerpana" (nie nad spadającym)
   przywódca: SAY.leave; setHint('Bohaterowie są wyczerpani: wychodzą.') (setHint martwe, napisy to niosą)
waveForceOut() (każdy krok od fl.patT >= S.waveTime + 150):
   każdy żywy w lochu: niesie kryształ -> wraca do serca (crystalSaved, "Kryształ wraca!", crystalEv(0, 'saved', 'forcedOut'));
   h.gone = false; napis "Ucieka"; stats.forcedOut, tl('fo', id, x, y, stan); heroExit(h)
```
Inne miejsca znikania sprawdzone w 1.24: `h.gone` ustawia tylko `fall()` (zapadnia) i bohater zawsze wraca (`landFallen` albo `cellLand`; fala nie kończy się, gdy ktoś spada); `heroExit` tylko na polu wyjścia (`updateHero`, dwa razy) i w siatce; wyłom to pole wyjścia z tym samym zanikaniem; mgła tylko przyciemnia (alfa 0,55). W 200 falach testowych stara siatka zadziałałaby 0 razy, wyczerpanie 1-2 razy, wymuszone wyjście 0.

### 6.15.2 Czy zdarzenia 1.19-1.23 działają (pomiar 1.24, `e124/evcount.py`)

Cały run (fale 1-10 grane dalej: powracający, Nemezis, polegli, więzi przechodzą), każda fala to loch autora z tej fali (układ, elementy, talia), pełna gra, checki losowo (40% krytyk, 42% draśnięcie, 18% pudło); 10 runów każdego z dwóch runów autora = 200 fal. Średnia liczba na falę / udział fal ze zdarzeniem:

| Zdarzenie | 1.23 | 1.24 | Uwagi |
|---|---|---|---|
| rozłam (wszystkie) | 0,30 / 26% | 0,39 / 34% | |
| niespokojny | 0,08 / 6% | 0,07 / 7% | małe lochy rzadko mają drugą drogę |
| foch | 0,21 / 20% | 0,29 / 26% | |
| z narady | 0 / 0% | 0 / 0% | potrzeba 2+ przegłosowanych za "jeszcze chwila"/szturmem w drużynie 4+; narady w ok. 12-16% fal |
| ratunek ("nie zostawię") | 0,01 / 2% | 0,01 / 2% | |
| bunt | 0,00 / 0% (1 na 200) | 0,32 / 32% | |
| scalenie | 0,12 / 12% | 0,13 / 12% | |
| podanie / wymiana sprzętu | 0,45 / 27%, 0,01 / 0% | 0,56 / 34%, 0,01 / 1% | wymiana rzadka z założenia (1+ w obie strony) |
| podany amulet | 0,22 / 19% | 0,25 / 20% | |
| oferta łupu | 0,56 / 29% | 0,62 / 30% | |
| latarnia (ratuje) | 0,41 / 40% (12%) | 0,40 / 38% (12%) | |
| łom: krata / klatka | 0 / 0% | 0 / 0% | działa w testach jednostkowych; w lochach autora brak klatek |
| przeszukanie ciała | 1,20 / 43% | 1,01 / 39% | |
| słowo pary | 0,41 / 37% | 0,69 / 60% | |
| żałoba (zemsta) | 0,28 / 27% (7%) | 0,42 / 34% (10%) | |
| drwina rywala | 0,00 / 0% | 0,56 / 26% | |
| kłótnia | 1,56 / 60% | 1,52 / 55% | |
| sprzeciw nad ciałem | 0,12 / 8% | 0,14 / 12% | |
| zakład | 0,04 / 4% | 0,34 / 34% | |
| eskorta | 0,17 / 18% | 0,22 / 22% | idzie za kradzieżami (22% -> 32% fal, trudniejsze fale 1-4) |
| przekazanie | 0,02 / 2% | 0,10 / 10% | ok. jedna trzecia fal z kradzieżą |
| ostatni bastion | 0,01 / 1% | 0,46 / 46% | |
| poświęcenie | 0,05 / 5% | 0,07 / 6% | |
| "ty pierwszy" | 0,18 / 17% | 0,20 / 18% | |
| opukiwanie | 0,48 / 28% | 0,45 / 28% | |
| "nie tędy" | 0,43 / 44% | 0,28 / 28% | |
| szyk (front) | 0,85 / 47% | 0,79 / 40% | |
| Nemezis w fali | 0,14 / 14% | 0,24 / 24% | |
| nagroda / rozmowa o nagrodzie | 0,01 / 1%, 0,02 / 2% | 0,03 / 2%, 0,04 / 4% | |
| pamięć poległych | 1,02 / 57% | 0,96 / 50% | |

Zmiany 1.24 (dramatyczne zdarzenia mniej więcej raz na 2-3 fale, każde z napisem na starcie): zakład (6.12.6), drwina rywala (6.12.5), więzi 75% / 45%, rywale 45%, mistrzowie 20% (sekcja 04, 2.9), kłótnia z napisem "Kłótnia!", bunt (6.10.3), rozłam (6.10.2), żałoba z napisem "Żałoba"/"Szok" i "Zemsta!", ostatni bastion także za rannym przyjacielem i dla elity (6.13.3), przekazanie (6.13.2). Rzadkie z założenia albo przez warunki i zostawione: rozłam z narady, łom, wymiana sprzętu.
