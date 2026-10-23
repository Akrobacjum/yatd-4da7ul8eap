# Załącznik C: mapa kodu prototypu

Spis funkcji z `src/` (Prototype 1.13, nowe funkcje dopisywane do 1.24; funkcje 1.18-1.24 na końcu tabeli każdego pliku, z wersją, w której powstały, w nawiasie; zmiany w istniejących dopisane po średniku z numerem wersji) z pierwszym zdaniem komentarza, który je poprzedza (komentarze w kodzie są po angielsku). Służy do szybkiego znalezienia miejsca w kodzie, na które powołuje się specyfikacja (`plik.js: funkcja`). Numery linii pominięte, bo się zmieniają; szukaj po nazwie.

## p1_config.js (dane i stałe)

| funkcja | komentarz przed nią |
|---|---|
| `f1` |  |
| `rankOf` |  |
| `comboHp` |  |
| `isLoot` |  |
| `LOOKS_TRAP` | what the heroes take for a trap |
| `SLOTTED` | what counts towards a room's limit |
| `tierOf` |  |
| `levelStats` | avoid = how hard they steer around known danger, learn = chance to remember a trap that went off in front of them, rumor = how much tavern talk they take in, risk = danger accepted for loot (higher = more reckless),... |
| `makeKit` |  |
| `rarColor` |  |
| `powerCharges` | Powers have a few uses per wave (better ones more) and a cooldown between them: the hero has to pick his moments. |
| `adj` |  |
| `G3` |  |
| `fmtE` |  |
| `actSrc` | a tapped monster ability scores like a trap |
| `gtext` |  |
| `pick` |  |
| `pickS` | 1.17: a line or a list of lines (`SAY.trap[kind]` is a list of 3 since 1.17) |
| `nameGen` | 1.17: {g} = genitive (bez Wandy, głos Borysa): a man's is his accusative, a woman's comes from her name (-ki/-gi/-li/-ii, else -y) |
| `nameFill` | 1.17: also {g} (nameGen); each marker is replaced once |
| `onbWaveStage` | (1.24) etap nauki z numeru fali pierwszego runu (ONB_WAVE) |
| `SCARES` | (1.24) 1.24 (B, P1-4: new players did not see that scaring pays): what an element does to a hero, as a word on its description |
| `HURTS` | (1.24) czy element rani (słowo "Rani" w opisie) |
| `fitOf` | (1.20) dopasowanie rodzaju przedmiotu do klasy (CLASS_FIT, domyślnie 1) |
| `hasRk` | (1.18) 1.18: a card of a komnata or a room effect is offered only while that komnata or effect is in the dungeon (its req), so the 21 new ones do not water down the pool: a dungeon has 2-4 of them at a time |

## p2_state_map.js (ustawienia, stan, mapa, obszary)

| funkcja | komentarz przed nią |
|---|---|
| `loadBest` |  |
| `saveBest` |  |
| `rand` |  |
| `clamp` |  |
| `key` |  |
| `fmt2` |  |
| `shuffle` |  |
| `saveSettings` |  |
| `remoteDb` | Prototype 1.0, the web version (GitHub Pages): the same documents go to a small Google Apps Script web app that saves them as files on the author's Google Drive. Its answer cannot be read across sites (no-cors), so a... |
| `getDb` |  |
| `cellKey` | Cells hold rooms; edges are corridors between neighbouring cells. Everything random is decided once, when a room or corridor is created, so rebuilding the tile map after a change gives back exactly the same rooms. |
| `parseCell` |  |
| `edgeKey` |  |
| `inGrid` | above the entrance row is the surface; everything else can be dug |
| `inStart` |  |
| `regrid` | The grid follows the dungeon: the leftmost room column is kept at cell 1 and one ring of rock cells stays free (left, right, bottom) for digging. Shifting moves the layout and everything that remembers tile positions. |
| `shiftLayout` |  |
| `remapRunState` |  |
| `newRoomSpec` |  |
| `edgeDoors` | doors of a corridor, from its stored bend coordinates |
| `cellDoors` |  |
| `heartTile` |  |
| `objAt` |  |
| `makeEdge` | A new corridor between two cells: pick door rows/columns whose inside tile is free (no furniture, not the heart). |
| `genFurniture` | Furniture: blocks walking and offers "object" slots; never seals a room off and never sits next to a door or the heart. |
| `layoutDist` |  |
| `allConnected` |  |
| `genStartLayout` |  |
| `digRoom` |  |
| `addPassage` |  |
| `canDemolishRoom` |  |
| `canDemolishEdge` |  |
| `demolishRoom` |  |
| `hexToRgb` |  |
| `tint` |  |
| `buildMap` | Tile map from the layout. Deterministic: the same layout always gives the same tiles. |
| `tileAt` |  |
| `isHeart` |  |
| `doorClosed` |  |
| `roomOf` |  |
| `wallDirs` |  |
| `slotOf` |  |
| `blockerAt` | 1.05: a building smashed by a barbarian is rubble you can walk over // Prototype 1.0: a building stands in the way like a crate |
| `walkable` |  |
| `rtOf` | room types (Pokoje tab): fog, swamp, grotto, crypt, vault |
| `isRt` |  |
| `rkOf` | 1.15: the komnata of a room (KIND_INFO), and what it does (05, 5.8a) |
| `servedRooms` | the rooms an element serves: slotRoom, or both rooms of a door |
| `inKind` | an element of a komnata's family serving a room with that komnata |
| `t3` | the level 3 trait: level 3 or in its komnata |
| `kindPow` | x1,25 for an element already at level 3 in its komnata |
| `nbrRooms` | rooms and corridors right next to a room (through its doors), for the grotto's echo |
| `roomTilesNear` |  |
| `areaOf` |  |
| `areaOfRaw` |  |
| `passable` |  |
| `bfs` | Dijkstra. Heroes only walk where they know the way (known), and pay extra for danger they know about (avoid = how much they care). |
| `pathFrom` |  |
| `shortestPath` | the true shortest way in (used by the tutorial and the test bots) |
| `markKnown` | The party shares one map in their heads: what they were told in the tavern (rumours) plus what they see. A room is seen whole the moment someone steps in (or into its doorway); in a corridor they see a few tiles... |
| `revealRoom` | 1.17: the heart's room seen for the first time: fl.heartBy = fl.revealBy (who saw it; heartP, p5_ai.js) |
| `revealAround` |  |
| `reveal` | 1.17: fl.revealBy = the hero whose sight it is (for heartBy) |
| `checkGhostRumors` | A rumoured trap that is not there: once they can see the spot, the false rumour is gone. |
| `frontier` | Frontier: tiles they know, next to walkable tiles they do not know yet. That is where exploring goes. |
| `playerIdNow` | (1.24) identyfikator gracza dla bieżącego imienia (yatd-player), nowy przy innym imieniu |

## p3_flow.js (run, fala, ekonomia, bohaterowie, obrażenia, strach, rozmowy)

| funkcja | komentarz przed nią |
|---|---|
| `isEdgeRoom` |  |
| `depthMult` |  |
| `hungerNeed` | 37 x 1,25^(wave - 2): 37, 72 in wave 5, 141 in wave 8, 221 in wave 10 (1.10: 20 to 119, about a quarter of a wave). A wave under half of the usual feeds nothing and costs a crystal; the heart's half keeps the purse... |
| `greedLv` | extra levels of the leader from greed. Up to 1.02 at most 3, so greed 23 was as safe as greed 4 (the author's run: 42 798 Esencja). 1.03: no ceiling, but past 4 it creeps up slowly (6: +3,7, 8: +4,2, 12: +5,0, 23: +6,1). |
| `huntersLv` |  |
| `huntersN` | treasure hunters replacing ordinary heroes: 1 from greed 3, 2 from 4,5, then one more each time greed doubles (9, 18...) |
| `comboLive` | brought (heart's share included), run.total = the harvest of the run. addPts returns what the event is worth at the multipliers now (the stats per element use it); the chain pays at least that, the extra from the... |
| `addPts` |  |
| `chainTick` | the chain ends: a trap chain when the combo clock runs out, a chain without a trap after 1,2 s without Groza (at most 4 s) |
| `payChain` | 1.01: a chain is cashed in: E = Groza x its greed x its combo; 1.16.1: fl.score += E - pre and essIn(E - pre), pre = what the heart already ate of it (C.fedLive) |
| `heartLive` | 1.16.1: the hungry heart eats every event's worth at the multipliers of the moment, as it comes (the chain's payout only adds what the combo made on top) |
| `heartFull` | 1.16.1: the heart is fed: fl.fed = need, fl.fedAt, 'Serce syte!' |
| `essIn` | Esencja comes in: the hungry heart takes its share first, the rest goes to the purse (Obżarstwo: x1,25 once it is fed) |
| `setGreed` |  |
| `greedCurve` | half as hard as at x1, at x3 a third. Exactly: greed = sqrt(2 x raw - 1), where raw is the plain sum of what made it (the way greed was counted up to 1.09.1): raw 2 = x1,73, raw 3 = x2,24, raw 5,4 = x3,12. The greed... |
| `greedRaw` |  |
| `addGreed` |  |
| `infMult` | v14: no hidden multipliers on Groza; everything global became greed (greedBonusNow) |
| `computeBRooms` | counter-buildings: which rooms hold which (computed when a wave starts) |
| `inB` |  |
| `comboNow` | The combo clock only ran while something was happening (up to 1.11.1: a walk down an empty corridor between two trap rooms did not break the combo, so traps spread over a big dungeon still chained). 1.12 (author: a... |
| `alive` |  |
| `webbed` |  |
| `caged` |  |
| `held` |  |
| `trapMult` |  |
| `shieldCover` | a warrior with his shield up covers the friends right behind him (half his protection) |
| `loneMult` | v14: loneliness pays a steady Groza instead of a multiplier (see updateHero) |
| `heroName` |  |
| `rankName` |  |
| `traitName` |  |
| `lvlLabel` |  |
| `tl` | timeline of the wave for the test log: [time, code, ...data] |
| `className` |  |
| `addFloat` | Floating numbers: a tagged one (greed, combo) replaces its older twin nearby; others step up instead of piling on each other. 1.07: a float stands on its spot of the floor (x, gy) and rises (lift, in tiles up the... |
| `floatTile` |  |
| `heroPos` |  |
| `floatHero` |  |
| `burst` |  |
| `fxTiles` |  |
| `fxLine` |  |
| `earshot` | counted as "chaos", so in a room with an archer nearly every line was a shout. Now earshot is 7 steps (or the same room) and only the lines that ARE a shout go over the others: cries, pain, a hit, a scare, the shout... |
| `inChaos` |  |
| `readT` |  |
| `floorBusy` |  |
| `othersWaiting` | a new line also waits for the lines already waiting around him (a talk going on, an answer due): first come, first said; 1.17: also the queue being worked through (P.queueCur without done entries and the line being said, P.sayingQ), plus P.queueSay |
| `lookAt` |  |
| `say` | 1.17.1: in a raid, after the SOLO swap, fitLine(h, text, pool) (p5_ai.js): a line about a thing he has not seen is replaced from its pool or dropped (returns true); sayHook (tests); stats.sawTalk for saw:* lines. |
| `sayTick` | the lines waiting for their turn: the most important first, the oldest among equals |
| `freshMods` |  |
| `recomputeMods` | The deck decides the mods: start from scratch and lay every card on top (two copies = applied twice). Selling a card really removes it. |
| `roomCount` | Point multipliers from cards that look at the dungeon as it stands right now. Rozległość lochu: a bigger dungeon is a louder legend, +3% points for every room over 5. |
| `sizeMult` |  |
| `cardMultNow` |  |
| `greedBonusParts` | v14: the score is Groza (depth and combo only, both visible) x Chciwość. Everything global adds to greed at the start of a wave: a big dungeon, Szklane serce, Kolekcjoner, Skąpiec, Zła sława. |
| `greedBonusNow` |  |
| `portraitRooms` |  |
| `newStats` |  |
| `stageOf` | 1.12: stage = which of the first runs this is (ONB_STAGES); the guide (tutorial) goes with the first one. Anything else is the full game. |
| `onbOk` |  |
| `newRun` |  |
| `startTrapSpot` |  |
| `seedStartTraps` |  |
| `freshParty` | 1.17: council, councilMore, look, lookCd, sound, soundCd |
| `setupFl` | A fresh wave state around the dungeon as it stands (used by the build phase, and by a run resumed after a wave summary). |
| `startBuild` |  |
| `waveHint` |  |
| `rumorView` | what the next wave has heard about the dungeon (shown in the build phase) |
| `rebuildDungeon` | After a change to the layout (between waves): rebuild the tiles, drop and refund whatever lost its place. |
| `validateItems` |  |
| `planBreach` |  |
| `patchBreach` | Patching the breach: between waves, a tap on it (see the breach sheet). |
| `chooseEntrance` | Which way in: a fresh breach is the guild's plan; after that the party weighs the two ways (what the tavern says about the traps). |
| `spawnPt` |  |
| `isExitTile` |  |
| `makeHero` |  |
| `guildAdapt` |  |
| `grozaTyp` |  |
| `tutW1` | the tutorial's first wave stays gentle: 2 rookies |
| `waveCurve` |  |
| `partySize` | champion (wave 5) and the legend (wave 10) come as a fifth; past the finale more again, step by step (5 from wave 11, 6 from 15). Where there used to be more of them, the four get levels instead (SIZE_LV: about +1,5... |
| `waveSize` |  |
| `sizeLv` |  |
| `endlessLv` | what the 7th, 8th... hero used to add |
| `waveBase` |  |
| `bossOf` |  |
| `waveName` |  |
| `makeWave` | Each wave is new people: the first ones are rookies, then they keep getting better. Every 5th wave a boss leads them. |
| `greedStartNow` |  |
| `startWave` |  |
| `applyRumors` |  |
| `spawnHero` | 1.17.1: saw: new Set() (hero memory of this wave). |
| `regroupAtDoor` | The first ones ran out screaming before everyone was in: those still outside go in as a new group, a little shaken. |
| `becomeImpatient` | Patience runs out. 1.17 (author: after 2 minutes not a rigid retreat or charge): P.council opens when the heart is known to the party (heartP) or the extra 30 s is still unused, and the party votes (p5_ai.js: councilThink); otherwise goHome. Only the hero of the prophecy never goes home: the prophecy shows the way and the party storms the heart. |
| `goHome` | 1.17: the old end of patience: everyone goes home (fl.fearless, P.plan leave, P.council cleared, tl ip 0, the leader says leave, the hint); also the council's home result and its fallbacks |
| `heroExit` | A hero walks out of the dungeon. With a crystal it is your loss; scared out of his wits it is your win. Either way, he talks. |
| `finishWave` |  |
| `collectReturners` | Głód serca: the wave's score feeds the heart. Short: the reserve pays first, then a crystal. Surplus: the reserve (at most 2 needs); a full reserve grows a lost crystal back. |
| `feedHeart` | Prototype 1.01: the heart has been eating its share of this wave's Esencja all along (essIn). When the wave ends it is either fed, or it eats what it got and a crystal. Crystals do not grow back by themselves (1.05:... |
| `roundStats` |  |
| `nextThr` | Points thresholds: each one crossed earns a buff after the wave (rare pick). They grow by 60% each. v14.1: points no longer give cards (author's decision 19.10). They feed the heart and set the rank; a new rank is... |
| `checkThresholds` |  |
| `recordWave` |  |
| `afterSummary` | after the wave summary: game over, or upgrades and the next build phase |
| `proceedToBuild` |  |
| `endRun` |  |
| `quitRun` | Quitting mid-run still logs everything so far, including the unfinished wave. |
| `cellCenter` |  |
| `expandRefund` | half of what the expansions cost |
| `toolCost` |  |
| `toolMarkers` |  |
| `forgetTiles` |  |
| `applyTool` |  |
| `typeMult` | v14: damage types, bodies, phobias, traumas |
| `revealPhys` |  |
| `phobiaOn` |  |
| `revealPhobia` |  |
| `phobiaMult` |  |
| `phobiaSight` | seeing what he fears: a jolt the first time (15% of courage), once per element 1.17.1: sawAdd(itemTags(it)) and the jolt inside sayNow(itemTags(it)). |
| `bt` |  |
| `srcKind` | (1.17.1: used by hurtTags) |
| `markOuch` | 1.13 (author: they stood and rested in traps): a hero remembers where a trap just got him (the whole reach of it, for half a minute), even if the party learnt nothing; he will not stand still there (p... |
| `damage` | 1.17: the hero of the prophecy getting back up steadies only those who hear him (canHearShout) 1.17.1: a wrapper: hurtTags(h, src) -> sawAdd (and sawNear for a burn or bleed), then damageRaw inside sayNow(tags). |
| `damageRaw` | 1.17.1: the old body of damage. Bleeding from spikes (burnBy spikes) is pierce, not fire; hp under 40%: sawNear(h, ['blood']). |
| `hurtTags` | 1.17.1: what hurts him: a burn by BURN_TAGS[h.burnBy] (spikes: spikes, blood; arrows, powder, archer, trapdoor: with fire; else fire), a trap or monster by itemTags(src, true); otherwise null |
| `fearResist` | Fear: the second currency of the dungeon. Every bit of it scores; past a hero's courage he runs for the exit. 1.17: the boss bonus (x0.85) only with a boss he is with (sees or hears him) |
| `startRage` | 1.05: fury, one mechanic for everyone (it used to be a brave one's answer to a death): +25% speed, half the fear, hits monsters harder. The barbarian lives in it: a death, a hard hit or panic makes him rage (panic... |
| `raging` |  |
| `addFear` |  |
| `dropCrystal` |  |
| `startFlee` | 1.17: the champion's cry only when he perceives the one who bolts, and steadies those who hear it; half of us run counts the leader's group (groupOf); fleeShout only when the leader perceives him |
| `partyFlee` | 1.17: reaches whoever hears the leader's cry (canHearShout, h.plan flee); a caged one and the champion are not marked fleeing; the others learn when they rejoin |
| `crystalReturns` | The carrier loses the crystal (killed, or down a bottomless well): it rolls back to the heart and the others decide what now. 1.17: only those who see it or hear the cry shout and turn back; the decision is the leader's group's (groupOf), the rest learn when they rejoin |
| `kill` | A dead hero: points, a soul for the dungeon, a louder legend (Infamy), panic among the others. His secrets die with him. 1.17: fl.deaths entry (knows, morale); the ones who see it react in full, the ones who hear the cry (canHearShout) get 1.3 x the far fright, shaken 5 s, deathHeard 55%, no name, no rage; the party's morale drops once the leader knows 1.17.1: those who see it get the tag blood. |
| `rollItem` |  |
| `itemPow` | Rdza and a curse weaken gear |
| `potionHeal` | a potion heals 30% of max HP, a rare one 51%, never more than 55% |
| `gearR` |  |
| `itemLabel` |  |
| `itemAcc` |  |
| `itemValue` | What a piece of gear is worth to this hero right now (0 = no use for it): potions matter when hurt, a second power of a kind only if it is better, each class has its favourite (warrior: talisman, weapon, armour;... |
| `dropItem` | Something lands on the floor next to the hero (swapped out, or spilled from a body): the exact item, loot for anyone. |
| `giveItem` | A hero takes a piece of gear. One power, weapon and armour of a kind: a better one replaces the old one (left on the floor); a full pack swaps out its least useful item if the new one is worth more, otherwise he... |
| `noticeLoot` | Greed grows when they SEE treasure (each kind its own pull, a Sezam doubles it); picking it up adds a little more. 1.17: a potion seen: SAY.lootPotionSeen 1.17.1: sawAdd for the one who notices, the line inside sayNow(itemTags(it)). |
| `pickup` | Picking it up: coins go to the purse, the rest is a real item (or the exact one that was dropped). No use or no room: it stays. 1.17.1: sawAdd(itemTags(it)); the gold line inside sayNow(['gold']). |
| `curse` | 1.17.1: sawAdd(['cursed']); cursedPick inside sayNow(['cursed', 'gear']). |
| `buildMods` | (1.24) 1.24 Połączone karty (p1: FUSE_GROUP): the deck's mods (recomputeMods and a resumed run) |
| `fuseElems` | (1.24) 1.24: the element(s) a card names |
| `fuseGroup` | (1.24) 1.24 |
| `fusePow` | (1.24) 1.24: 2,5, 2,75 (power) or 3,125 (hero) |
| `fuseText` | (1.24) 1.24: the property line |
| `applyFrac` | (1.24) a card laid on p times, p fractional: the whole copies, then the share f of one more copy, field by field: a field the copies multiplied (the same ratio twice) grows by that ratio to the power f, one they added to by... |
| `fuseApply` | (1.24) nakłada połączoną kartę ★: applyFrac z fusePow, zaokrąglenie FUSE_INT, cecha grupy |
| `isFused` | (1.24) 1.24 |
| `ownsCard` | (1.24) 1.24: in the deck or the stash (a copy taken now fuses with it) |
| `fuseCard` | (1.24) 1.24: the second copy: the one in the deck or the stash becomes ★ (no new slot) |
| `onbAdvance` | (1.24) 1.24 (B, item 3): the guided run's stage follows the wave it gets to (ONB_WAVE); what the new stage opens is unlocked at the end of the wave before (so the next party, the summary and the shop already belong to it)... |
| `restockForge` | (1.18) 1.18 Beczki z kuźni: the powder that blew up in a Kuźnia (fireRaw keeps it in run.restock) is back for the next wave, with its furniture, free and at its level, if its spot is still free (nothing changes the map... |
| `waveBase0` | (1.24) 1.24: the curve up to 1.23 |
| `earlyW` | (1.24) 1.24: the old wave a wave plays like |
| `atW` | (1.24) 1.24: f between two waves |
| `hpK0` | (1.24) 1.24: the HP bonus up to 1.23 |
| `earlyHpK` | (1.24) 1.24: never below its own (wave 4: the old wave 5 has less bonus) |
| `makeBonds` | (1.21) 1.21 Więzi i dramaty: some of them come in pairs. A party gets 0-2 bonds (the first 55%, a second 30%; 1.24: 75% and 45%, rivals 45%, mentors 20%), one bond a hero at most, none for a returner (1.23 may give him one)... |
| `bondLabel` | (1.21) "Przyjaciel: Borys", "Uczennica: ..." według roli i płci partnera |
| `bondMate` | (1.21) the other one of an entry's pair: the hero in the dungeon, or his entry in the party list (before the wave, or not in yet) |
| `waveExhausted` | (1.24) 1.24 (author: at the end of a raid the heroes sometimes vanished and the wave ended at random): up to 1.23 everyone still inside 60 s after the end of patience was teleported out (councils, storms, second groups,... |
| `waveForceOut` | (1.24) 1.24: the true safety net (a hero stuck somewhere): 150 s after the end of patience the ones still inside run out where they stand, with a float and the fade; a crystal one of them carries goes back to the heart... |
| `crystalEv` | (1.24) 1.24 (D, P0-2): every change of run.crystals with its cause (stolen \| hunger \| saved \| card \| other): run.crystalEv for the whole run (the runs record) and each wave record's crystalEvents (what came since the... |
| `crystalSync` | (1.24) zmiana kryształów spoza dziennika jako wpis other/unlogged |
| `crystalEvTake` | (1.24) wpisy dziennika kryształów od ostatniego rekordu fali |
| `nemHold` | (1.23) 1.23: a Nemezis does not panic or flee by fear while above 15% HP |
| `riseGhost` | (1.18) 1.18 Wstający umarli: a hero killed in a Krypta gets up as a ghost on your side, a real monster for the rest of the wave on the free floor tile nearest the body. It is temp: no cost, no slot, no part of the dungeon's... |
| `loadOf` | (1.20) 1.20 Udźwig: what he carries (kg) against what his class can carry; past 60% he slows down (at most to x0,84) |
| `carryOf` | (1.20) udźwig: CARRY klasy + 0,3 kg za poziom |
| `burden` | (1.20) mnożnik prędkości przy ciężarze ponad 60% udźwigu (min. 0,84) |
| `canTake` | (1.20) could he take this one from a friend: room in the pack (or it replaces one of a kind, not a cursed one) and the weight |
| `litLantern` | (1.20) 1.20 Latarnia: lit (a ghost, a shade or bats may blow it out for 8 s), it keeps the fog off everyone within 2 tiles in his room |
| `lanternNear` | (1.20) zapalona latarnia w 2 polach w tym samym pokoju |
| `hasCrowbar` | (1.20) czy niesie łom |
| `dropAt` | (1.20) Something lands on the floor next to the hero (swapped out, or spilled from a body): the exact item, loot for anyone. 1.20: dropAt puts it next to a spot (the mimic spitting out its belly), dropItem next to the hero,... |
| `vaultSnap` | (1.18) 1.18 Zatrzask sezamu: loot taken in a Sezam sets off every ready trap in that room (the decoy's alarm, without using it up), at most once in 6 s a room, so two treasures side by side make one alarm |
| `bodyLoot` | (1.20) 1.20 Ciało do przeszukania: after kneeling by a body he takes from its piles (this one and the dead one's others within 1,5 tiles) every coin and each item worth 0,6 to him that fits in his pack; the rest stays. A... |
| `bombCook` | (1.20) 1.20: a bomb in a burning pack goes off: it hurts him (40 x power), half that to anyone within 1,5 tiles, a scare to 3 tiles |

## p4_traps.js (odpalanie pułapek i potworów)

| funkcja | komentarz przed nią |
|---|---|
| `learnTrap` | A trap that went off in front of the heroes may be remembered (veterans almost always, rookies often not); the thief, elites and amulets spot traps before they fire. Known traps are avoided if they can be. 1.17: one who saw it (in that room, not lost, not panicking, not caged) tells the others now and then (0.5, SAY.learn after the shout) 1.17.1: the one who spots it: sawAdd(itemTags(it)), his line inside sayNow; nastyTrap inside sayNow(itemTags(it)). |
| `rebuildThreat` | Path cost: known loaded traps hard, reloading ones barely; rumoured traps that are not there count as real; monsters they can see make them look for another way. |
| `disarmSpots` |  |
| `heroesOn` |  |
| `galleryK` | Nawiedzona galeria: a ghost haunting a room that has a portrait scares (1 + copies) times harder |
| `cdOf` |  |
| `calmReady` | Card boosts on a trap's power: Cisza przed burzą (idle 20 s or not fired yet this wave) and Krwawy rytuał (kills this wave). |
| `heartFed` | Bijące serce (1.01: the heart is fed in this wave) // Bijące serce (v15: you hold enough to feed the heart) |
| `trapBoost` |  |
| `lvlPow` | monsters grow through HP and power instead |
| `ignite` | Setting a hero on fire; with Pożoga the flames jump to the heroes right next to him (one hop). |
| `rigged` | Mechanizm samobójczy: the trap being taken apart fires in the face of whoever is doing it. |
| `decoyAlarm` | Wabik: taking it apart rings the alarm and every ready trap in its room goes off at once. 1.17.1: sawItem(it, [w], ['decoy']) (everyone who sees the room, plus the one who set it off); bDecoy inside sayNow(['decoy']). |
| `fire` | 1.05: while a trap fires, the wounds and the fright it causes are remembered by each hero (what he will tell in the tavern) 1.17.1: fireRaw runs inside sayNow(itemTags(it, true)): what went off is the thing of the moment. |
| `feltBy` |  |
| `fireRaw` | 1.17: fl.lastTrapRoom; hearFar for TRAPS; the shout from SAY.trap lists (pickS, else trapGeneric); the ambush counter only for traps on the leader's group; a priest's failed blessing says blessHit 1.17.1: sawItem(it, list) before hearFar: those hit and those who see the spot. |
| `fall` | Trapdoor: down into the dark, out somewhere else a few seconds later, alone and shaken. A hero falls through a given trapdoor once per wave: after that he knows where the edge is and steps around it. |
| `landFallen` |  |
| `cageHero` | Cage: stuck for a while, taking extra damage. The party decides whether to come back for him. 1.17: h.cagedAt (the leader notices a silent cage after 20 s) |
| `freeCaged` | Once a cage has been opened (pried by a friend, worn through, or torn apart in panic) its bars are bent: no more catches this wave. |
| `cageEnds` | v14.1: the cage's time is up. A friend on the way gets a few more seconds; nobody coming = he dies in the cage. A boss is too strong for the bars: he tears them apart (the cage is bent for this wave). |
| `hurtMonster` |  |
| `monDmg` |  |
| `driftTarget` |  |
| `driftTick` | 1.17.1: a ghost, shade or bats close enough to act on him: sawAdd(itemTags(m)). |
| `monstersTick` | 1.17.1: a spider web on the one it binds: sawAdd(['web', 'spider', 'monster']). |
| `hiddenAmbush` | (1.18) 1.18 Zasadzka w norze: goblins and shamans in their Goblinia nora sit hidden: no danger on the map (rebuildThreat), nobody walks round them or picks a fight with them, until one strikes or a hero runs into it... |
| `showAmbush` | (1.18) odsłania goblina/szamana z zasadzki (napis "Zasadzka!", 1 s ciosów ×2) |
| `skullK` | (1.18) 1.18 Mur z czaszek: kości, trumny and archers in a Kaplica czaszek, +5% for every hero killed in a Kaplica this run (at most +50%) |
| `stripGear` | (1.18) 1.18 Zdarte pancerze: spikes or arrows in a Zbrojownia may knock a talisman, an amulet or armour off him (50% a copy); it lands next to him as loot, and loot is something to come back for, through the same spikes |
| `mimicSpill` | (1.20) 1.20: a mimic blown up by a bomb or smashed by an axe spits out what it ate (its belly, up to 6 items, kept between waves) around its furniture, as loot |
| `douseLantern` | (1.20) 1.20 Latarnia: a ghost, a shade or bats hitting its bearer may blow it out for 8 s (half the time; a level 3 shade always) |
| `lvlAt` | (1.24) 1.24: past level 3 the last step again |
| `tdCap` | (1.24) Trapdoor: down into the dark, out somewhere else a few seconds later, alone and shaken. A hero falls through a given trapdoor once per wave: after that he knows where the edge is and steps around it. 1.24 (author:... |
| `tdSafe` | (1.24) 1.24 |
| `cellLand` | (1.18) 1.18 Cela pod zapadnią: down a trapdoor of a Więzienie he lands in a ready cage of a Więzienie (the one in that room first) and it shuts on him: the cage fires on him (its Groza, the combo, the party's rescue, as for... |
| `shamanHeal` | (1.24) leczenie szamana z zapisem na koncie potwora (bez zmiany ilości) |
| `healFlush` | (1.24) raz na sekundę: zielone "+N", ślad Grozy (SHAMAN_GZ), statystyki szamana |

## p5_ai.js (AI bohaterów)

| funkcja | komentarz przed nią |
|---|---|
| `replanAll` | Each hero has a job: the thief scouts and disarms, the priest heals, exorcises and blesses, the mage burns monsters and webs, the warrior charges monsters and raises his shield. They only know what they have seen or... |
| `byId` |  |
| `tIdx` |  |
| `hdist` |  |
| `panicking` |  |
| `planOf` | 1.17 (author: the heroes know about each other in other rooms): each hero acts on the plan he knows (h.plan, else P.plan); perceiveThink spreads it |
| `heartP` | 1.17: the party knows where the heart is once the leader does: heartKnown and heartSaid |
| `heartTold` | 1.17: the leader learns the heart: heartBy unset (tavern, prophecy) or the leader himself, he sees or hears the one who saw it, or stands in the heart's room |
| `goingOut` | 1.17: the party's plan (P.plan) only; one hero's own: goingOutH |
| `goingOutH` | 1.17: the hero's own plan (planOf) is a way out (flee, leave, escape) |
| `exiting` | 1.17: fleeing, crystal, goHome (outvoted at the council, goes home alone) or his own plan out (goingOutH) |
| `hushAt` | 1.17: what a hero can perceive. He SEES what happens in his own place (samePlace), HEARS a voice in earshot, and a SHOUT carries 14 steps; nothing is heard into or out of a Głusza, and a Kamień wyjec swallows shouts |
| `canSee` | 1.17: same place (samePlace), neither gone |
| `canHear` | 1.17: earshot, neither gone nor in a Głusza |
| `stepsWithin` | 1.17: walking steps from a to b (any walkable or door tile), searched up to n steps |
| `canHearShout` | 1.17: canHear, or at most 14 walking steps (and 14 tiles straight), not from or into a Głusza or a Kamień wyjec's room |
| `perceives` | 1.17: sees, or hears (a shout when shout is set) |
| `groupOf` | 1.17: the leader's group: who decides and counts (the leader and whoever sees or hears him, not lost, not caged) |
| `sayNow` | 1.17.1: runs f with SAY_NOW = the tags of the thing of the moment (null for an empty list), restoring the previous value |
| `itemTags` | 1.17.1: what a thing is to the eye: monster [type, monster]; lcursed [gear] or [cursed, gear] once cursedKnown; loot LOOT_KIND; powder [blast] (+fire when fired at level 3); arrows fired with arrowBurn [arrows, fire]; traps and buildings [type] |
| `sawOf` | 1.17.1: h.saw, created when missing |
| `sawAdd` | 1.17.1: adds tags to h.saw and the time first seen to h.sawAt |
| `sawTalk` | 1.17.1: the SAY.saw lines of the 2 most recently seen tags and 1 random earlier one |
| `sawName` | 1.17.1: a tag as a word for the hero card (SAW_NAME, KIND_INFO, ITEMS) |
| `sawNames` | 1.17.1: what he has seen this wave, in order, without monster (hero card) |
| `itemSpot` | 1.17.1: a monster's tile from gx, gy; else x, y |
| `itemRooms` | 1.17.1: a trap's servedRooms, else the room of its spot |
| `seesSpot` | 1.17.1: in a room he sees that room; in a corridor 3.5 tiles around him |
| `sawItem` | 1.17.1: everyone who sees the spot (and the listed ones) remembers the thing |
| `sawNear` | 1.17.1: he and those who canSee him (burning, bleeding, badly hurt) |
| `sawVisible` | 1.17.1: what can be seen: a live monster, loot, a building (decoy only once alarmed), a known trap, a scare prop (not musicbox or creak), fire, a shut gate |
| `sawRoomTags` | 1.17.1: the room's effect, k_ komnata, heartSeen in the heart room, the buildings in it (not decoy) |
| `sawRoom` | 1.17.1: sawRoomTags plus every visible thing of the room (onEnter) |
| `sawSweep` | 1.17.1: every party tick: each hero's room and what he sees from where he stands |
| `lineTags` | 1.17.1: the tags a line needs (LINE_NEEDS plus SAY.saw by its own tag), by exact text or a pattern for {n}/{a}/{v}/{g} |
| `knowsTag` | 1.17.1: death from fl.deaths, gold/cursed he carries, SAY_NOW, h.saw |
| `lineOk` | 1.17.1: a line fits: every tag known; during SAY_NOW a thing tag (TAG_CAT) must be one of the moment |
| `linePool` | 1.17.1: the SAY list of a key (key:sub for the nested ones) |
| `fitLine` | 1.17.1: the line, a fitting line of the same pool without names, or null; stats lineSwap, lineDrop, lineDropK; during SAY_NOW the moment's tags of the line go to his memory |
| `okLines` | 1.17.1: the lines of a list that fit him |
| `heartGoals` |  |
| `exitGoals` |  |
| `exitGoal` |  |
| `leader` | 1.17: not one going home alone (goHome); one off on his own errand (scout, split) takes the lead only if nobody else can |
| `partySay` |  |
| `talkGroup` |  |
| `toSafety` | a hero who stands still somewhere unsafe walks to a good tile (at most 3 steps, the one nearest the leader; one who rests stays in his room, so the rest does not walk out of it; none: he stays) |
| `councilVote` | 1.17: one hero's vote at the council: scores for home, storm (only with heartP) and more (only once a wave) from fear, health, character, class, rank and gold |
| `councilThink` | 1.17: the council at the end of patience (opened by becomeImpatient, p3_flow.js): waits for a quiet moment (at most 4 s, then cuts a talk short), the voters speak, the leader sums it up (his vote 1.5, an elite's 1.25); an outvoted hero may go home alone; cancelled when the party goes out, after 8 s without a group home |
| `councilDone` | 1.17: the decision takes effect when the last line has been said: more (patT capped at waveTime - 30, councilMore), storm (fearless, storm, assault, tl ip 1) or home (goHome); the ones going home alone get goHome, tl gh, the float |
| `talk` | The party stops and talks it over: a few lines from different heroes, one after another. |
| `talkAs` | 1.05: the same, but each line has its speaker (null: anyone in the party); 1.17: lines are matched to their keys by LINE_RX (lineKey) |
| `lineKey` | 1.17: lines with a name ({n}, {a}, {v}, {g}) and gender forms are matched by regex patterns built once (LINE_RX), so CONVO starts after them too |
| `convoAfter` |  |
| `convoStart` | 1.17: another exchange nearby also counts while the queue is worked through (P.queueCur without done entries and P.sayingQ) 1.17.1: an exchange only if A fits all A lines (lineOk); B and C chosen among those who fit theirs. |
| `huddleUp` | 1.12.1: when the party stops to talk it over, the ones further off come up to the leader (to a free tile at most 2 steps from him) and everyone turns to him: a huddle, not a freeze |
| `talkLen` |  |
| `lootLevel` |  |
| `lootSeen` | Common loot is noticed from the same room, rare from the next one, legendary glitters across the dungeon. |
| `checkCursed` | An experienced priest (level 6+) feels the curse on a treasure close by and warns the others: nobody touches it. 1.17.1: cursedWarn inside sayNow(['cursed', 'gear']). |
| `lootDecision` | Worth it? What the loot is worth to THIS hero (gold to the greedy, a potion to the wounded, gear he can use) against the danger they know about on the way and around it. 1.17: lootStop has an effect (lootObey: who heeds it leaves the loot for 15 s); going for a potion he says lootPotion (lootPotionNeed when hurt), not a gold line |
| `safestRoom` |  |
| `searchTargets` | Rooms they know of (from the tavern or from the doorway) but have not walked through yet this wave: there may be treasure. |
| `chooseTarget` | 1.17: deep and whim by character (brave, careful, coward), careful x1.15 distance; a sound heard in the last 25 s within 7 tiles pulls or pushes by character |
| `restScene` | 1.12.1: when they sit down to rest: the leader calls it, the priest tends the wounds, somebody grumbles and gets an answer |
| `decideCage` | A friend in a cage: elites always go back for him; others weigh their own fear. 1.17: a second one caged while they free the first waits in P.rescueQ |
| `partyThink` | Runs a few times per second: who leads, where they go, retreat, push for the crystal or run, who got separated. 1.17: perceiveThink, councilThink and lookThink each tick; the cage decision when the leader hears the cage (or after 20 s); the heal call only when the priest hears it (canHearShout); retreat, rest and flight thresholds over the leader's group; small talk keys by mood (chatHurt, chatScared, chatGold, chatRich, chatIdle) 1.17.1: building lines inside sayNow([type]) with sawAdd; gate lines inside sayNow(['gate']); small talk filtered (okLines) with sawTalk 45%, CHAT_REPLY answers filtered for the one who answers; stats chatTry, chatPick. |
| `answerLost` | 1.05: a lost one calls and the party answers: the nearest one who hears him (14 steps, a bard 26) shouts back and he walks towards the voice, through rooms he does not know too. A Kamień wyjec in his room turns the... |
| `lostChance` | The chance to lose the way once cut off from the leader: bigger dungeon and fog = more, experience and a thief's sense = less. |
| `getLost` | 1.17: only marks him (lostAt, lostNoticed false); the leader decides when he notices (missLost) |
| `missLost` | 1.17: the leader misses him (4 s out of his sight and earshot): go back for him (to where he was last seen, P.seen; 14 s), or go on (leaveLost) |
| `perceiveThink` | 1.17: who knows what. Every party tick: the leader's plan reaches those who see or hear him (h.plan), a new leader brings his own plan (not after a theft), P.seen, missLost, a death reaches those who did not see or hear it when they meet one who knows (tellDeath, newsDeath), heartTold, leftBehind 1.17.1: sawSweep() first. |
| `startSplit` | 1.16: a deliberate split starts (scout, mate, 'wait here', rest scout, rookie errand): h.split, stats.splits, the 'Zwiad' float |
| `onScout`, `splitting` | 1.16: the scout or his mate; anyone away on purpose (also a rookie on his errand) |
| `nextScout` | 1.16: the scout's next opening: the nearest known way into the unknown that does not lead back towards the party |
| `maybeDetour` | A wrong turn at a junction (a room with 3+ ways out): more likely in a big dungeon and in the fog, rarer for veterans who know the way. 1.17: heartP instead of heartKnown |
| `lookSpots` | 1.17 (author: let them look around): what can be looked at in a room: furniture, props (LOOK_PROP), the komnata, a wall, with a free tile to stand on |
| `lookPref` | 1.17: what this hero likes to look at (LOOK_LIKE by character and class; a wall -1.5) |
| `lookRoll` | 1.17: the leader walks into a room not looked around in this wave: one roll whether they stop and look (chance by his character, the room, the time and their wounds); who goes, who stays (a coward 60%), lookWant / lookHurry |
| `lookThink` | 1.17: the looking-around runs: ends when all are done, after 10 s, or at once on a trap there, a sound, a wound, a panic, a new plan; lookEnd, lookCd 18 s |
| `lookJob` | 1.17: planHero: walk up to the thing, look at it, search it; null when there is nothing (left) to do |
| `lookArrive` | 1.17: he stands at the thing: what he says (lookObj, lookProp, lookKind, lookWall) |
| `lookDone` | 1.17: done looking: furniture searched may set off the trap on it (SEARCH_TRAP) or give a coin (SEARCH_GOLD: 0.3 greedy and thief, else 0.18); lookFind or lookNothing 1.17.1: a coin found: sawAdd(['gold']). |
| `hearFar` | 1.17: a trap goes off where none of them can see it: the nearest calm one within 12 tiles hears it, may say so (hearSound, hearScream), and P.sound steers the leader if he heard it too; soundCd 10 s |
| `powerReady` |  |
| `usePower` |  |
| `useCharm` | Talisman: a 3 s ward against trap damage (25% at the first level, +5% a level, at most 40%). A few uses a wave. Rookies switch it on after a hard hit, veterans also right before a trap they know about. |
| `useAmulet` | Amulet: when the nerves are about to go, it takes a chunk of fear away (12% of courage at the first level, +4% a level) and dulls new fear for 4 s. Rookies reach for it late (at 85% of what makes them run), veterans... |
| `useBoots` | Boots: a 3 s sprint, for running out (with or without the crystal), dashing past a known trap, or finding the others. |
| `roomThreat` | Known threat in a room: traps they know about (wall traps count for the room they face) and monsters they can see. |
| `checkPrep` |  |
| `startPrep` | 1.17: the mage and the thief speak of traps only when the room has traps they know of |
| `finishPrep` | 1.17.1: bAltar and bRune inside sayNow. |
| `isFrontierTile` |  |
| `randomKnownFar` |  |
| `nearestOf` |  |
| `loadFound` | 1.14: the traps you discover stay discovered between runs (this browser's collection, `yatd-found`). |
| `saveFound` |  |
| `pickTab` | 1.14: to a tab, and to the sub that holds a tile (the guide points at a tile). |
| `planHero` | One hero decides what to do next and finds a path there (only through tiles the party knows). 1.17: reads planOf(h) and exiting(h); job 13 look (lookJob); the leader's search for a lost one ends with searchFail; the priest walks to a caller whose path costs at most 20 (healFor); regroup ignores those going out 1.17.1: the warrior's fight and avoid lines inside sayNow(itemTags(monster)) with sawAdd. |
| `partyWay` | 1.13.4: where the party is going: the leader's path while someone else leads and walks it, else the route to the party's goal (detour, heart in an assault, explore target). Not the hero's own path. |
| `disarmJob` | The thief deals with known traps that still sit on the leader's way. Rookies are slow and sometimes set them off. |
| `smashJob` | 1.05: the barbarian's axe: counter-buildings in his room (always worth it to him) and wooden furniture close by (further when raging). A smashed building does nothing for the rest of the wave and stops blocking; a... 1.17.1: smashB inside sayNow([building type]). |
| `smashDone` |  |
| `blessJob` | An experienced priest lifts the curse from a known portrait near their way. 1.17.1: bAltar inside sayNow(['altar']). |
| `bombJob` | Anyone with a bomb throws it at a known trap blocking the leader's way, from up to 3 tiles. |
| `bardTick` | Priest heals, puts out fires, raises a barrier and burns ghosts with holy light; mage burns monsters and clears webs. 1.05: the bard. A call when someone is lost (they walk to the music), and a song when spirits sag... 1.17.1: bHowl inside sayNow(['howl']). |
| `heroAbilities` | 1.17: no spells or prayers while panicking or fleeing; the priest lifts a friend's curse first, then his own (curseSelf) 1.17.1: cleansing a bleeding hero says SAY.staunch inside sayNow(['spikes', 'blood']), a burning one SAY.cleanse inside sayNow(['fire']); bAltar inside sayNow(['altar']). |
| `glance` | 1.10: standing, a hero looks around now and then: at a friend, at loot they saw, at a trap they know, or just away |
| `slipChance` |  |
| `heroTile` |  |
| `heroBlock` |  |
| `detourAround` | a short way round the heroes in the way, back onto the rest of his path (a few steps at most) |
| `stepAside` | two standing on one tile (a fall, a slide, a squeeze): the later one steps to a free tile next to it |
| `idleIn` | 1.12.1: a hero standing idle in the way of one who walks makes way: a step to the side, or one ahead along his way (and whoever stands there makes way too), so the leader never stands behind his own f... |
| `makeWay` |  |
| `onEnter` | 1.17: the leader in a new room without a detour: P.lookAsk (lookRoll 0.9 s later) 1.17.1: sawRoom(h, r) on a room change; the first one into a komnata room says SAY.rkEnter[k_rk] (fl.rkSaid, stats.rkEnter). |
| `inZone` |  |
| `scanTraps` |  |
| `updateHero` | 1.17: a lifted curse says blessDone; the warrior leading raises his shield with shieldLead |
| `shoutRange` | (1.18) 1.18: Grube mury: a shout carries 8 steps instead of 14; Niosące się echo: a shout from a Grota carries 2 times as far (3 times with a second copy), with Grube mury 16 |
| `inG2` | (1.19) 1.19 Rozłam (author: "plan rozbudowy bohaterów: rozłam"): the party can break in two. A second group (P.g2: its leader, its members, its own plan and goal) explores on its own and joins the rest again when they meet;... |
| `g2Leader` | (1.19) przywódca drugiej grupy, nowy gdy obecny odpadnie (plan regroup) |
| `groupLeaderOf` | (1.19) przywódca grupy bohatera (druga grupa albo drużyna) |
| `g2Start` | (1.19) zakłada drugą grupę (fork, restless, council, sulk, mutiny, rescue) |
| `g2End` | (1.19) kończy drugą grupę (merge, fizzle, out, gone, last) |
| `g2Target` | (1.19) where the second group goes: an opening of its own, away from where the others are going |
| `g2Think` | (1.19) życie drugiej grupy: plan, wyjście z resztą, rozejście, scalenie, czas, cel |
| `g2Goal` | (1.19) the goal of the second group's leader |
| `mutinyThink` | (1.19) 1.19 Bunt: when things go badly (a death the leader knows of, heavy wounds or fear, low morale) and the leader pushes on, a braver or higher-ranked one challenges him in front of the group. They take sides (the... |
| `riftThink` | (1.19) 1.19: a restless one (greedy, brave, a treasure hunter, a barbarian; not a rookie) tired of the leader's pace says he goes his own way, now and then, when there is more than one way into the unknown; 1-2 like him go too |
| `sulkThink` | (1.19) a sulker leaves when the quarrel has been said (a group of one, he comes back when he meets them) |
| `claimScore` | (1.20) 1.20 Kto bierze łup: how much a hero should have this loot (what it is worth to him; for one nobody knows: a potion for the wounded, coins for a thief or the greedy, anything for the greedy), +0,5 for the one who saw... |
| `lootReassign` | (1.20) another one has set out for it: one who needs it clearly more (+0,8), both close to it (8 steps), takes it over when a leader of rank 1+ (neither of them) hears both and gives it to him; with no such leader two... |
| `onLootRival` | (1.20) 1.20 (hook for 1.21: a quarrel over the loot): two greedy ones after the same thing, once a pair and a pile |
| `lootOffer` | (1.20) 1.20: he cannot use what he found (no need, no room, too heavy): a friend who sees him and whom it would suit (worth 1+) is told, and goes for it (offerKey: lootDecision wants it; the lootMemo 'no' is gone) |
| `onLootDead` | (1.20) 1.20 (hook for 1.21: looting the dead, a friend's objection): called after every search of a body, taken or not. 1.21: one who sees him take a dead friend's things objects (lootDeadObject, {v} = the looter; the... |
| `bondOf` | (1.21) the other one of his pair, whatever became of him (null: no bond, or not in the dungeon yet) |
| `bondType` | (1.21) czy więź bohatera jest danego typu |
| `calmFor` | (1.21) żywy, w lochu, nie zgubiony, nie w klatce, bez paniki i ucieczki |
| `bondText` | (1.21) a line naming the other one ({v}); alone, its SOLO version (say() itself only swaps in SOLO lines without a name) |
| `pairKey` | (1.21) klucz pary bohaterów (mniejsze id, potem większe) |
| `mateBody` | (1.21) czy stos to ciało jego partnera więzi z tej fali |
| `lootBanned` | (1.21) zakaz brania łupu po kłótni (10 s) |
| `bondTalk` | (1.21) a word to the other one (bondFriend... with his name) and, unless a talk starts from it, his answer (bondReply); the mentor speaks to his apprentice, not the other way round. gap: seconds since that pair's last word.... |
| `griefOf` | (1.21) żałoba albo przysięga zemsty partnera zmarłego |
| `vowK` | (1.21) revenge: +30% damage to monsters |
| `bondHurt` | (1.21) a wound his pair sees: a rival's jab (a trap, 20%+ HP, 30%, once in 20 s), the mentor's warning when his apprentice is hurt (once in 25 s), or, when the hit leaves him under 30% HP and he lives, the mentor's praise 3... |
| `rivalJab` | (1.24) 1.24: a rival's jab ({v} = the other): his wound (bondHurt) or, new, a scare that went through him (addFear: 8%+ of his courage from a trap or a monster, rivalScare); 80%, once in 12 s; busy: right after; a float... |
| `rivalScare` | (1.24) 1.24 (addFear) |
| `mentorWatch` | (1.21) the mentor's warning ({v} = the apprentice; once in 25 s) and the apprentice's answer |
| `mentorProud` | (1.21) the mentor's praise (his apprentice disarmed a trap, or lived through a hit that left him under 30% HP); once in 25 s |
| `mentorRoom` | (1.21) an apprentice walks into a room where they know of a trap: the mentor warns him |
| `mentorNear` | (1.21) mistrz w 3 polach w zasięgu wzroku (lostChance ×0,7) |
| `quarrel` | (1.21) 1.21: a quarrel over loot. One wants what another has claimed (he is greedy, a treasure hunter, or the claimant's rival) and they see each other: quarrelStart ({v} = the other), quarrelReply; the higher rank wins... |
| `quarrelWon` | (1.21) the winner picks up what they quarrelled over |
| `noLeave` | (1.21) 1.21 "Nie zostawię cię": the leader leaves a friend, a brother or sister, an apprentice or a mentor behind (in a cage, or lost): the other one of the pair, if he hears it, will not have it (noLeave {v} = the friend;... |
| `rescueThink` | (1.21) the rescue group's progress (g2Think): the lost one found (he is close and sees him), the caged one free: he joins and they go back to the others; the friend dead, gone, or the time up: back to the others |
| `rescueJob` | (1.21) the rescuer's way (planHero, the second group's leader with the plan 'rescue'): next to the cage (then he opens it), or to where the lost one was last seen, then to his voice (any way, known or not, like a lost one... |
| `betThink` | (1.21) 1.21 Zakład: a brave one or a rival (rank 1+, 60%+ HP) in a room with a known, loaded trap on the party's way bets he walks through it unhurt (betStart); his rival, or anyone who sees him, takes it (betTake {v} = the... |
| `betStart` | (1.21) zaczyna zakład: kwestie, napis, praca przejścia przez obszar pułapki |
| `betEnd` | (1.21) the bet is settled: hit by that trap (lost), out of its reach after walking into it (won), or he never went in (off) |
| `betStep` | (1.21) a step of the bettor (onEnter): into the trap's reach, and out of it again unhurt = won |
| `bondThink` | (1.21) every party tick: the first word of each pair (4-25 s into the wave, once the gate is open, at a random moment), the mentor's praise after a near miss, the apprentice growing up after his mentor's death, the bet |
| `shareThink` | (1.20) 1.20 Dzielenie się (author: they share nothing but potions): once a second. 1) In a crisis a calm one hands his ready amulet to a friend about to panic (2 tiles, they see each other) and it works at once. 2) At ease... |
| `finOf` | (1.22) 1.22 Finał fali (e122/SPEC122.md): the crystal run (a guard round the carrier, the crystal handed over, a last stand, a trap set off on purpose, "nearly out") and care on the way ("ty pierwszy", tapping the floor,... |
| `carrierOf` | (1.22) żywy niosący kryształ w lochu |
| `standing` | (1.22) a last stand (also asked by driftTarget, p4) |
| `sacrificing` | (1.22) trwa jego poświęcenie |
| `cheb` | (1.22) odległość Czebyszewa |
| `lsBrave` | (1.22) rolled once a wave; 1.24: an elite too |
| `finalThink` | (1.22) finał fali co tick: eskorta, przekazanie, bastion, poświęcenie, prawie wyszli, szyk |
| `escortThink` | (1.22) 1. the escort: when someone carries the crystal, those who see him (on the escape plan, 35%+ HP) walk next to him (planHero: escortGoal) instead of each taking his own way out. The leader (or the strongest of them)... |
| `escortGoal` | (1.22) where a guard goes: a free tile 1-2 steps from where the carrier will be in two steps, off his next steps; a warrior in front (towards where the carrier goes), the others close at his side. Measured from his next... |
| `escortPace` | (1.22) a guard keeps up with the carrier: walking to his spot he goes at least at the carrier's pace (a thief with the crystal outran a priest and a mage, and the guard fell behind in the first test), a warrior a bit faster... |
| `guardOf` | (1.22) a guard next to the carrier steps into a monster's blow meant for him (monstersTick, p4): the best of them (a warrior first) |
| `handThink` | (1.22) 2. the hand-over: the carrier under 35% HP gives the crystal to a healthier friend (60%+ HP) within 1,5 tiles who sees him; at most twice a wave, not twice within 6 s. The theft stats stay as they were. |
| `threatNear` | (1.22) 3. the last stand: a drifting monster (ghost, shade, bats), or a melee one somebody fights, within 3 tiles of the carrier |
| `standStart` | (1.22) once a wave: a brave one (a warrior or a barbarian half the time) with 40%+ HP, not the carrier, stops in the nearest doorway between the monster and the carrier (or where he is) and holds it there (planHero: a fight... |
| `standThink` | (1.22) kończy ostatni bastion (8 s, 25% HP, panika, potwór martwy, chroniony zniknął) |
| `reachAvoid` | (1.22) 4. the sacrifice: once a wave, when the carrier's known way out goes through a known, loaded floor or wall trap (not a cage, not a scare) within 12 steps and there is no other known way, one of them (a brave one, a... |
| `sacStart` | (1.22) wybiera poświęcenie: pułapka na jedynej znanej drodze niosącego |
| `sacTick` | (1.22) poświęcenie odpaliło albo się skończyło |
| `sacHold` | (1.22) one of the others, a step or two before the trap, waits for it to go off |
| `youFirst` | (1.22) 5. "ty pierwszy": exploring, a coward or a careful one about to walk into a room with a known trap sends another one first (his rival or a rookie if he can): the named one walks in (planHero: firstInto), he waits 1,5... |
| `tapRoom` | (1.22) 6. tapping the floor: a careful one (or a rookie thief) walking into a room nobody has walked through yet (or right behind the first one in) may tap his way across it (60%, 3 rooms a wave): 30% slower there... |
| `tapStep` | (1.22) true: he found one and stops to think again |
| `notThisWay` | (1.22) 7. "nie tędy": once a wave, a new explore target whose way goes through a room with a known trap that hurt someone this wave (P.hurt, damageRaw): a veteran (rank 2+) or one it hurt says so, and the leader picks... |
| `formThink` | (1.22) 8. the formation: in a fight with a melee monster (two of them or more there), the warrior holds the front (frontLine once a fight; planHero sends him at it, monstersTick hits him first), the priest and the mage step... |
| `formedFoe` | (1.22) a monster the warrior holds in his room (the priest and the mage keep off it) |
| `backTile` | (1.22) a free, safe tile 2-3 tiles from the monster, behind the warrior who holds it if there is one, nearest to him |
| `nemName` | (1.23) "Borys Niezłomny": everywhere the name stands in a list or on the card |
| `bountyOf` | (1.23) the guild's bounty on his head (Esencja) |
| `nemK` | (1.23) +25% damage to the monster he holds the grudge against |
| `nemOf` | (1.23) stan Nemezis w fali (P.nem) |
| `grudgeAdd` | (1.23) what hurt (fraction of HP) or scared (fraction of courage) him, by the tile it stood on (damageRaw, addFear) |
| `nemesisEntry` | (1.23) collectReturners: who becomes a Nemezis, and what he takes with him |
| `nemesisSpawn` | (1.23) spawnHero: the rooms he remembers are known to the party (their tiles, walls and doors; the heart, if he was there), the traps the party knew there and that are still there are detected (no lines); he takes the lead... |
| `grudgeItem` | (1.23) the thing he holds the grudge against, if it is in the dungeon and working: on its old tile, else the nearest of its kind |
| `nemAnswer` | (1.23) one of the others answers him: after his first words (nemesisFollow from one who follows him, else a reply) or a warning |
| `nemBoast` | (1.23) przechwałka Nemezis (najwyżej 2 na falę, co 10 s) |
| `nemesisThink` | (1.23) every party tick (partyThink, after finalThink) |
| `bountyTalk` | (1.23) rozmowa o nagrodzie za głowę Nemezis |
| `nemGrudgeLook` | (1.23) he sees his grudge (in his room): the line once, the trap known (and, if he cannot deal with it, twice as dangerous for the party's paths), then planHero's grudgeJob for 25 s |
| `grudgeJob` | (1.23) planHero: go for the grudge. A trap: a thief takes it apart (the disarm state), a barbarian smashes it (the smash state); others leave it be (it is marked). A monster: a fight job, whatever his class (not a drifting... |
| `nemGrudgeDone` | (1.23) updateHero: his grudge trap taken apart or smashed |
| `nemWarn` | (1.23) the party is about to walk into a room he remembers with a trap in it (the leader's next 5 steps): he warns them, once a room |
| `nemBefore` | (1.23) fire() (p4): a trap he knew goes off next to him and misses him |
| `nemMissed` | (1.23) pułapka znana Nemezis odpaliła obok i go nie zraniła: przechwałka |
| `nemesisRage` | (1.23) Nemezis poniżej 30% HP: "Nie ucieknie!" |
| `nemesisKilled` | (1.23) kill (p3): the bounty |
| `rememberFallen` | (1.23) kill (p3): the tavern remembers where he died (the full game; up to 12, the oldest goes) |
| `fallenRoom` | (1.23) onEnter: a hero walks into a room where one of the fallen of an earlier wave died: he may say so (70%), once a room a wave, three a wave; a Nemezis' death is talked about first (nemesisFallen) |
| `falseCall` | (1.18) 1.18 Fałszywe wołanie: a Nawiedzona sala within 14 steps of the lost one answers his call; he walks to the voice, to the middle of the hall (h.hearGoal, planHero), and is still lost when he gets there. Kamień wyjec... |
| `fogRoll` | (1.20) 1.20 Latarnia: the fog's roll on one a step away from the leader; a lit lantern within 2 tiles cuts it to 30% (lanternSaves) |
| `framesWake` | (1.18) 1.18 Spojrzenie z ramy: in a Galeria, the portrait, eyes or mirror he looks at wakes up: if it is ready (and they do not know it), it goes off on him by itself with 1,5 times the power (+0,5 a copy) |
| `taintedSip` | (1.18) 1.18 Zepsute mikstury: a potion from your loot (pickup marks it) heals half and scares the one who drinks it (10% of his courage a copy) |

## p6_loop.js (krok symulacji, checki, kamera, muzyka)

| funkcja | komentarz przed nią |
|---|---|
| `regenParts` |  |
| `gainEssence` |  |
| `grozaOrbs` | violet orbs carrying Groza from a hero to the equation (the Groza number there grows as they land) |
| `tileScreen` | the equation, ice-blue ones carry Combo from the trap that raised it (+0,25 a step) to the Combo box. Each box shows its number less what is still flying, so it grows as they land. fl.gFly / fl.kFly = what is in the... |
| `boxOrbs` |  |
| `greedOrbs` |  |
| `comboOrbs` |  |
| `comboReset` |  |
| `lootMult` | a hero carrying gear sheds more when hurt |
| `regenTick` |  |
| `essPulse` | Prototype 1.0: the big number counts up by itself (tickScore); an orb landing in it gives it a knock (scoreHit) |
| `scoreHit` |  |
| `grozaHit` |  |
| `boxHit` |  |
| `heartHit` |  |
| `sfx` |  |
| `mhz` |  |
| `musicWant` | which arrangement the moment asks for: a running wave = Fala, anything else (building, shop, pause, start) = Loch |
| `musicInit` |  |
| `mNote` | one tuned note: wave type, frequency, start, length, volume, an attack and a release; the wobble on its pitch |
| `mDrum` |  |
| `mStep` | one sixteenth of the loop for both arrangements (a quiet one is skipped) |
| `musicTick` |  |
| `musicStart` | music starts with the first touch (browsers allow sound only after one) |
| `buzz` | Vibration on phones that have it (Android); a game setting turns it off. |
| `predictedDmg` |  |
| `heroesInArea` |  |
| `checkWanted` |  |
| `takenK` | what reaches the hero after his own protection: a talisman's ward, armour (acid halves both), a curse (+30%) |
| `lethalFor` |  |
| `checkPos` |  |
| `memOf` | or the heroes putting the trap out of use in any way (disarmed, smashed, a monster killed, jammed, its furniture broken); moving it, or taking it down and putting it back on the same spot, keeps it. A miss asks again... |
| `forgetMem` |  |
| `putOut` | the heroes stopped it (worn: its own limit or a card) |
| `memPw` |  |
| `skullHolds` | switched off at a skull: it stays off while its hit (the remembered one, or a graze) would kill |
| `needsCheck` |  |
| `checkTick` |  |
| `resolveCheck` | p (tests): a position on the shape; a tap: where the needle is right now |
| `skipCheck` |  |
| `clearCheck` |  |
| `updateCheck` |  |
| `heroCode` |  |
| `takeCrystal` | 1.17: only those who see the carrier or hear his cry turn to escape (h.plan); the rest learn when they rejoin |
| `stealNeed` | Szklane serce: the crystal comes loose 2 times faster per copy |
| `step` | 1.17: the gate line by the leader; P.steal settles back 0.5/s with nobody at the heart; the wave 1 leave line by one who was at the heart (or hears one) |
| `timeScale` |  |
| `autoFFOn` | v15.1: after 0,3 s of quiet (was 0,8) |
| `quietNow` |  |
| `quietWhy` | 1.02: names what keeps it from being quiet (null = quiet); the tests read it |
| `perfReset` |  |
| `perfErr` | the message and where: the function and the line of the built file |
| `perfNote` |  |
| `perfSummary` |  |
| `frame` |  |
| `frameBody` |  |
| `vX` |  |
| `vY` |  |
| `viewW` |  |
| `fromView` |  |
| `W2S` | a point of the dungeon on the screen (with the camera being drawn: in a split screen, that half's) |
| `camCentre` |  |
| `setPitchNow` |  |
| `wantPitch` | which view the moment asks for: the tray open = building, folded = the wave (its preview between waves) |
| `viewTick` |  |
| `viewSettling` |  |
| `fitScale` | Building: you move it. Raid: it follows the party and zooms out as they spread; a drag takes over for a few seconds. |
| `buildScale` |  |
| `clampCam` |  |
| `centerOnView` |  |
| `centerOn` |  |
| `zoomAt` |  |
| `toWorld` | a point on the screen -> the spot of the floor under it (tiles) |
| `autoCam` |  |
| `splitSide` |  |
| `splitPolys` | the screen cut in two: [the side away from the direction, the side towards it] |
| `polyCentroid` |  |
| `rayOut` | how far from o along d until the polygon's edge |
| `splitCam` |  |
| `splitViews` | the camera(s) to draw with: null = one screen; else for each half its outline and a camera blended in from the main one |
| `heroScreen` | a hero's place on the screen (in a split screen: in the half of his group) |
| `resize` |  |
| `updateZoomBtn` |  |
| `areaKeys` | (1.24) pola obszaru jako Set liczb, zapamiętany przy obszarze |
| `shapeStat` | (1.24) 1.24 (D, P0-6): checks by shape in the wave's stats: checkByShape[shape] = { ok, crit, miss, skip } (+ auto: fired by itself in the calm gap of P1-3) |
| `calmChecks` | (1.24) 1.24 (D, P1-3; a tester got 23 checks in 29 s of wave 1): in waves 1-S.calmWaves and while the guide runs, after a check the next one waits S.calmGap s (game time; the world runs at its normal speed then); what wants... |
| `calmFire` | (1.24) w spokojnej przerwie elementy, które chcą checku, biją same jak draśnięcie |
| `tutSpikeSure` | (1.24) 1.24 (B, P1-5: a tester's spikes never went off in the guide): in the guide's first wave every spikes go off at least once. A miss or a let-go check of spikes that have not fired yet still springs them, at graze... |
| `fpBusy` | (1.24) czy coś się rusza (orby, napisy, cząsteczki, efekty, przewodnik, koniec fali) |
| `frameIv` | (1.24) odstęp klatek: 60/s, 30/s albo postój |
| `frameSig` | (1.24) podpis obrazu (rysuj w postoju tylko po zmianie) |
| `kick` | (1.24) the next frame is asked for once (kick); standing still the loop asks no frames of the browser (a phone can then lower its refresh) and looks again every 100 ms, or at once on a tap |
| `frameR` | (1.24) wywołanie requestAnimationFrame dla frame |

## p7_draw.js (rysowanie)

| funkcja | komentarz przed nią |
|---|---|
| `numFont` | 1.05 (testers mixed up 2 and 8 in Pixelify Sans): Jersey 10, one weight (no fake bold on the canvas) |
| `rr` |  |
| `draw` |  |
| `withViews` | draw fn once, or once per half (clipped to it, with its camera) |
| `drawDivider` | an iron bar along the cut, fading in as the halves part |
| `floorT` | The floor and everything painted on it (zones, fog, slots, flat traps) is drawn as before, in tile pixels, through floorT: the floor plane turned and tilted. Walls are boxes. What stands (furniture, monsters, heroes,... |
| `tileMap` | 1.07 (author: what is flat lies on a floor or a wall, only the figures face the camera): the unit square on a tile of the floor at height z, turned so that its bottom edge looks the way d points (the art then reads... |
| `wallPlane` | a wall trap's own plane: the face towards the room on a full wall, the top of a cut wall (its bottom edge towards the room) |
| `screenT` |  |
| `viewBox` | the tiles that can show on screen (with room for walls and figures standing out of them) |
| `onScreen` |  |
| `areaAt` |  |
| `wallSetup` | per map: which walls stand, which rooms each standing wall would hide (at full height, in the wave view), whose walls they are |
| `wallFocus` | which rooms and halls are open now: where the heroes stand, and past a door they are within 2 tiles of |
| `easeOutBack` |  |
| `easeInBack` |  |
| `wallTick` | once a frame: the heights each wall goes to, and the blocks on their way |
| `wallHeights` |  |
| `wallH` |  |
| `wallUp` | a standing (or moving) block, not a lip |
| `wallCovers` | a standing wall in front of a point that would cover something hz high standing there (so it is drawn among the walls) |
| `poly` |  |
| `faceMap` | maps the unit square (u along a to b, v from the top z1 down to z0) onto an upright face of the dungeon |
| `isoBox` | A box standing on the floor: footprint centred on (cx, cy), w along x, d along y, h high, from z0. Colours: top, south, east. |
| `groundShadow` | a soft dark ellipse on the floor (screen space) |
| `drawWalls` | the lips (and what hangs over them) go first, under everything; the standing blocks come back sorted by depth, to be drawn among what stands (a high wall can hide it) |
| `drawWallRun` | the standing blocks from a to b (sorted by depth): the still ones in one go (south faces, east faces, mortar, tops, edges), a moving one by itself (it pops out of its tile); then the torches and the wall traps on them |
| `mortar` | mortar: courses of stone on the open faces (k: the block's size, 1 when still) |
| `drawBlockPop` | a block on its way up or down: it grows a little wider in the middle of the move (the pop) and its faces are all shown |
| `wallDressing` | what is on a standing block: its torch, the wall traps on its face (1.15: also the komnata's ornaments and the effect's wash) |
| `kindWalls` | 1.15: which komnata each wall face and top belongs to (per map and set of komnaty) |
| `kindTex`, `kindTopTex` | the face (128x218) and top (64x64) texture of a komnata's walls, painted once |
| `kwStyle`, `texRand`, `per`, `facets`, `skullT`, `boneT` | wall-texture helpers: a block's WALL_STYLE, a seeded random, tiling along u, raw-rock facets, a skull and a bone for textures and crowns |
| `kindFace` | one face of a komnata's block: its texture through faceMap, the E face darker, the forge's live glow |
| `drawKindBlock` | a standing block of a komnata: faces, top, edges, crown (WALL_STYLE[k].crown) |
| `drawKindLips` | the flattened walls of a komnata: its lip colour and top texture |
| `rockCrown` | jagged stone teeth on top of a cave wall (ogre, bats) |
| `courses`, `facets`, `per`, `skullT`, `boneT` | texture helpers: stone courses, raw rock facets, tiling along the face, skulls, bones |
| `rtWallWash` | 1.15: a room's effect on the faces of the walls looking into it (RT_WALL) |
| `kindWallDeco` | a komnata's ornaments on its standing walls (KIND_WALL) |
| `torchFlicker` |  |
| `drawTorch` | a sconce on the wall's face, a flame (a flame faces you), a warm light on the face around it |
| `drawTorchLight` | the light of the torches on the floor in front of them (flat, under the walls) |
| `flatItem` |  |
| `cageShut` |  |
| `fogged` | in a wave, what the heroes have not seen is dimmed (the fog), standing things too |
| `drawWorld` |  |
| `itemAnchor` | where to put signs for an item: over a standing thing, on a wall trap's picture, at the middle of a floor trap |
| `wallSpot` | a wall trap's spot: the middle of its face towards the room (a full wall), or just in front of a cut wall |
| `drawTiles` | 1.03: g = the context to draw on (a cached chunk) |
| `tileBucket` |  |
| `tileChunk` |  |
| `drawTileLayer` |  |
| `glowSprite` |  |
| `tileHash` | Prototype 1.0: the same stone always looks the same (a cheap hash of the tile) |
| `drawZones` | Torches on some walls that face a floor (not where a trap or a picture hangs); their light flickers on the floor below. |
| `drawDanger` |  |
| `drawAreas` |  |
| `drawMemBadges` | 1.05: a trap's answer for this wave, in the check's own language: a full pale disc = crit, a ring = graze; a skull = let go |
| `drawItemTop` | 1.07: the picture of a thing seen from above (flat traps on the floor; until redrawn, standing ones too) |
| `drawItemStatus` | flat signs of a trap or monster on its tile: level pips, a glow at level 3, ready / cooling down / switched off |
| `statusUnit` | the same signs for what hangs on a wall or floats: a ring around it on the screen the signs of a trap (level pips, ready / cooling down / off) in the unit square of its own plane |
| `drawWallItem` | A wall trap: on a full wall it is painted on the face towards the room; on a cut wall it stands on the lip, facing you. |
| `wallArt` | wall traps in a unit square (x along the wall, y down), lit by k (the east face is a little darker) |
| `drawObjectIso` | Furniture: barrel, crate, statue, bookcase (boxes and shapes standing on their tile) |
| `drawHeartGlow` | the heart: a dark pedestal, the heart beating over it, the crystals floating around it |
| `drawHeartIso` |  |
| `drawHeartLabel` |  |
| `drawCorpse` | Standing traps, buildings, loot and monsters. Until each has its own drawing, the old picture stands up on its tile. |
| `popK` | 1.09: something just placed, moved or upgraded pops (a little too big, then its size) |
| `drawItemUp` |  |
| `monH` |  |
| `signText` | upright signs: a text with a dark rim at a point of the screen |
| `drawRoomTypeNames` |  |
| `drawBreachLabel` |  |
| `drawHoldLabel` |  |
| `costTag` | what an upgrade costs, over each thing that can be upgraded (with Ulepsz picked, or over the thing in hand) |
| `drawCostLabels` |  |
| `drawDetected` |  |
| `drawLoot` | Loot by kind: a coin pile, a potion flask, a gear chest (blue glow), a relic (orange glow). The cursed treasure looks like a gear chest to the heroes; you see a faint violet mark on it (and a big X once a priest has... |
| `drawRoomTypes` | Room types: a tint and a little texture over the whole room, so you see at a glance what each room does. |
| `drawRoomKinds` | 1.15: the floor of each komnata on screen: its still part from the cache, what moves over it (KIND_LIVE), under the effect |
| `kindFloorCache` | the still part of a komnata's floor, painted once into a canvas per room at the screen's resolution |
| `roomSeen` | a room with any part on screen |
| `drawKindAuras` | a soft glow of the komnata's colour under each element of its family |
| `drawKindLife` | a little life over the floor of each komnata on screen (screen space) |
| `kindProps`, `PROP_PLAN` | 1.15: the small things standing in a komnata, planned once per room |
| `kindPropsSO` | the props on screen join what stands (sorted by depth with heroes and furniture, drawSO kind 5) |
| `drawProp`, `PROP`, `candles` | one prop, drawn x1,3 around its foot |
| `pCyl`, `pBall`, `pCone`, `pFlame`, `pLine` | screen-space solids for props and wall pieces |
| `relief`, `noRelief` | flat things lifted off their floor or face: a soft canvas shadow down and to the right |
| `wallFrame` | points, boxes and planes in front of one face of a wall |
| `kindWall3D`, `KIND_WALL3D` | what stands out of a komnata's walls (sconces, shelves, chains, shields, roots, silk...) |
| `blob`, `boneAt`, `skullAt`, `kH`, `hexA`, `edgeTile`, `roomMid`, `kindRooms` | floor-art helpers of the komnaty |
| `hpBar` |  |
| `heartPath` |  |
| `crystalShape` |  |
| `drawRoomLabels` | 1.07: the depth multiplier (and in building, the room's load) by the room's front corner, upright |
| `drawFog` | What the heroes have not seen yet is dimmed: you see everything, they do not. |
| `slotRoom` | Every room holds only so many traps and monsters (corridors 1, rooms 2-3 by size, +1 per expansion): to build more, dig or expand. |
| `roomCap` |  |
| `crateOk` | A crate: only on a room floor, never next to a door or the heart, and the room must stay one connected space. |
| `blockerOk` | Prototype 1.0: where a building may stand (it blocks like a crate): free floor of a room, not by a door or the heart, and the rest of the room stays in one piece. The tile itself is left out of the check (so it works... |
| `roomLoads` |  |
| `roomFull` |  |
| `canPlace` |  |
| `markTile` |  |
| `markRing` |  |
| `drawWallMarks` | frames on full walls, on the wall's face |
| `drawCarry` |  |
| `drawHold` | a ring fills while the finger stays on a thing; full = taken down (on the floor; the word over it: drawHoldLabel) |
| `drawSlots` |  |
| `drawFx` |  |
| `drawClassIcon` |  |
| `figH` |  |
| `figFeet` | the feet stand a bit below the tile's centre (the figure rises from there) |
| `paintFigure` | draws one figure into a PXW x PXH canvas; r() paints a rectangle of whole pixels |
| `outlineSprite` | a 1-pixel outline around the sprite (soft, in the dark of the dungeon, not black line art) |
| `sprite` |  |
| `stoneSprite` | a figure turned to stone: its own light and shade, in grey-violet |
| `spiderLegs` | a spider's thin legs go on after the outline (with one they would merge into a blob): up to a knee, down to the floor |
| `drawPixelFigure` | draws a figure standing at (x, feet) on the screen, H px tall, mirrored when it faces left; whole device pixels per sprite pixel |
| `monFace` | 1.07: monsters are pixel figures like the heroes; they look towards the nearest hero and lunge a frame when they strike |
| `objTopZ` |  |
| `line2` |  |
| `flame` | a small candle or torch flame at p |
| `doorAlongX` | the wall a door tile sits in runs along x (true) or along y |
| `isoFrustum` | a tapered block (a standing stone): base wb x db, top wt x dt, h high; and a point on its south face (u across, v up) |
| `frontPt` |  |
| `spikeCones` | spikes: a plate in the floor and steel cones that shoot up when it fires (cones look the same from any side) |
| `drawFigure` | draws one figure in a 24-unit box (feet at 0, head top near -24; x to the right = the way it faces) |
| `shade` | a colour a bit darker (k < 0) or lighter (k > 0) |
| `drawHeroOut` |  |
| `heroOut` |  |
| `drawHero` | 1.17.1: bleeding (burnBy spikes) is a red dot, not a flame. |
| `drawParticles` | 1.07: rings lie on the floor (floor pass), sparks fly upright (second pass) |
| `drawFloats` | 1.07: a number rises straight up from its spot of the floor |
| `heroGlyph` | Party panel in screen space: who is in the dungeon, how hurt, how scared, who carries the crystal. Folded (default): one row of chips with HP and fear bars. Unfolded: the full list with gear. A tap switches. |
| `drawChips` |  |
| `drawParty` |  |
| `drawOrbs` |  |
| `ckGrad` |  |
| `ckCut` | a rectangle with the corners cut off, like the slabs in the interface |
| `ckSlab` |  |
| `ckGlow` | graze = moss, crit = blood with a glow |
| `drawCheck` |  |
| `ckPath` | the groove of each check shape, q in 0..1 along it (local coordinates; drawCheck centres it) |
| `drawNextWave` |  |
| `drawOffscreen` |  |
| `wrapText` | Speech bubbles in screen space, so they stay readable at any zoom; overlapping ones stack upwards. |
| `drawBubbles` |  |
| `drawPause` | 1.07: the open build tray is the pause: a small plate at the top says how to play on |
| `drawRumorTiles` | Build phase: what the next wave already knows from rumours (tinted floor, an eye on known traps, a hollow eye on false ones). |
| `eyeIcon` |  |
| `drawRumorEyes` | 1.07: over the trap, upright |
| `drawToolMarkers` |  |
| `drawBreachMark` | Build phase: where the next wave will tunnel in. |
| `drawTutTarget` |  |
| `drawFF` |  |
| `VP` | (1.24) rzut na jednostki widoku (pamięć ścian) |
| `viewT` | (1.24) transformacja kamery dla ścieżek widoku |
| `wpFresh` | (1.24) unieważnia pamięć ścieżek ścian przy zmianie |
| `pQuad` | (1.24) czworokąt jako Path2D |
| `wallPaths` | (1.24) obrysy bloku ściany jako Path2D w jednostkach widoku (raz na wysokość i nachylenie) |
| `lipPaths` | (1.24) obrysy wargi niskiej ściany jako Path2D |
| `fearBar` | (1.24) pasek strachu pod HP i zapis jego prostokąta (FEARR) |
| `fearBarAt` | (1.24) the hero whose fear bar is under a tap (a finger's slack around it) |
| `afx` | (1.24) animacja z puli AFX (bez alokacji, bez Math.random, nie przy "mniej ruchu") |
| `heroFx` | (1.24) animacja na bohaterze |
| `trapFx` | (1.24) animacja odpalenia pułapki |
| `drawAfx` | (1.24) rysuje trwające animacje (w fali) |
| `fitTxt` | (1.24) tekst ucięty z wielokropkiem do szerokości |
| `drawPreview` | (1.24) następna drużyna u góry mapy w budowie (chipy i dwie linie) |

## p8a_icons.js (ikony)

| funkcja | komentarz przed nią |
|---|---|

## p8b_ui.js (interfejs, gesty, sklep, zapis, dane testowe, przewodnik)

| funkcja | komentarz przed nią |
|---|---|
| `UI` | Small preferences of this browser: which panels are open, and the speed button. |
| `saveUI` |  |
| `lootCount` |  |
| `costOf` |  |
| `upgCost` |  |
| `trayFade` |  |
| `updateTray` |  |
| `showTip` |  |
| `hideTip` |  |
| `renderDeckTiles` | The deck tab: one tile per slot, filled or empty. Rebuilt only when the deck changes. |
| `actLabel` |  |
| `updateAction` |  |
| `updatePauseBtn` | 1.07: the pause button is gone (kept as a name for older callers) |
| `setPaused` | quiet: the tutorial's own pause says it itself |
| `reduceMotion` |  |
| `tickScore` |  |
| `floater` |  |
| `crystalAlarm` |  |
| `showBanner` | the banner over the map when a wave comes in |
| `setText` |  |
| `mmss` |  |
| `fmtK` |  |
| `updateHud` | 1.17: narada on the clock during a council |
| `fmtG` | small Groza with two decimals |
| `renderPips` | Ten pips for the run between waves: green = held, red = a crystal lost, gold = the next wave; a diamond marks a boss. |
| `setHint` | 1.12 (author: the message box at the top of the map goes, all of it): what it explained is in the onboarding cards (Nowe w tym runie), in the tile tips (hold a tile) and on the screens; what a tap did wrong is said... |
| `note` |  |
| `nope` |  |
| `hideToast` |  |
| `placeToast` |  |
| `trayIsOpen` | The element tray folds away and comes back on a tap of its handle; a wave folds it as it starts (1.09: again, after 1.08 took that out: the author's complaint was the handle's width, a whole-row hit area). Between... |
| `setTrayOpen` | 1.07 (author): in a wave the tray is the pause: open = time stops and the camera tilts to the building view (high isometry), folded = the game goes on in the wave view (2:1). Between waves a folded tray previews the... |
| `trayTick` |  |
| `trayPaint` |  |
| `trayCover` | how much of the map's full height the tray's body takes now (0 when folded): the canvas is drawn that much taller |
| `cloneLayout` |  |
| `pushUndo` |  |
| `undo` |  |
| `clearUndo` |  |
| `updateUndoBtn` |  |
| `updateSpeedBtn` |  |
| `queueModal` |  |
| `closeModal` |  |
| `openModal` |  |
| `el` |  |
| `btn` |  |
| `loadRecords` | Records of this browser: best score, furthest wave, wins. |
| `saveRecords` |  |
| `deviceId` |  |
| `surveyState` | The survey after the first finished run (web version only). This phone remembers that it was answered or skipped, so it never comes back on its own; the menu still offers it until it is answered. |
| `setSurveyState` |  |
| `renderSurvey` |  |
| `standalone` |  |
| `isIOS` |  |
| `isFull` |  |
| `goFullscreen` |  |
| `leaveFullscreen` |  |
| `restart` | the start card again, in place |
| `webStartRow` |  |
| `renderStart` | 1.17: the version label and the Co nowego entries 1.17.1: label Prototype 1.17.1, 3 new entries. |
| `renderMenu` | The menu (the button bottom left): back to the game, settings, save and leave, download, end the run. |
| `settingsBack` |  |
| `sliderRow` |  |
| `applyLook` | 1.02: settings that change the page itself (the extra gap at the top of the screen) |
| `renderSettings` | Player settings: what a player of the finished game would see. |
| `renderTests` | Test sliders: the balance knobs for testing, kept apart from the player's settings. |
| `reqOk` | Three cards to choose from. Rarity follows the source: a wave gives mostly common cards (a rare one now and then), a points threshold opens all rare cards, a boss guarantees a legendary. New traps and monsters come... |
| `upgradePicks` |  |
| `stashCap` |  |
| `priceOf` |  |
| `sellOf` |  |
| `rerollCost` |  |
| `shopRoll` |  |
| `shopRefresh` |  |
| `shopBuy` |  |
| `shopReroll` |  |
| `toStash` |  |
| `fromStash` |  |
| `sellStash` |  |
| `fitList` | v15.1: the screens between waves (shop, wave summary, end of the run) fill one screen and never scroll. Their layout stays put whatever you tap: the same boxes in the same places; a list that would not fit its box... |
| `scrHead` |  |
| `countUp` |  |
| `panel` |  |
| `waveChart` | Esencja wave by wave. Every wave of the run has its place from the start (nothing moves); red = a crystal lost or eaten; the pink tick = what the heart ate after that wave. |
| `frow` |  |
| `svgI` |  |
| `classIconSvg` |  |
| `weakOf` | what a hero entry is weak to: class and (when known) body; the strongest first |
| `nextRow` | one row of the next party: icon, name, class and level, character; what the class does; gear; weaknesses and what is known |
| `waveFun` | 2-3 curiosities of the wave: the favourite trap is the usual first, the rest by lot (kept while the screen is open); 1.17: Zwiedzali (2+ looks) and Narada |
| `renderWave` | 1.17.1: Liczby cell for sawTalk / lineSwap / lineDrop. |
| `waveDetails` | Szczegóły: where the Esencja came from, then four views in one box (what comes next, the heroes, the elements, the numbers) |
| `cardFit` |  |
| `kindShort` |  |
| `renderShop` |  |
| `fitSlot` | Prototype 1.0: the whole text has to fit its box, nothing is cut. The letters shrink step by step down to a readable minimum; a long name shrinks too. The tile says data-fit="no" if even that is not enough (the tests... |
| `fitText` |  |
| `renderEnd` |  |
| `crystalCost` | 1.05: buying a crystal back for Esencja is gone (only a card, Żarłoczne serce, or the continue after a lost run give one back); kept for old tests only, nothing in the game calls it |
| `buyCrystal` |  |
| `addEss` |  |
| `applyUpgrade` |  |
| `sellCard` |  |
| `plural` |  |
| `slotsTxt` |  |
| `capFirst` |  |
| `kindLabel` |  |
| `cardBtn` |  |
| `renderPickSection` | The three cards (and the reroll), used by the card modal and by the wave summary. |
| `pickSub` |  |
| `renderUpgrade` |  |
| `finishPick` |  |
| `takeCard` |  |
| `renderReplace` | Deck full: sell one card to make room, or pass on the new one (it is sold for you). |
| `upgradeItem` | A placed element, tapped between waves: what it does, its level, upgrade it or take it down (full refund). |
| `dustAt` | 1.09: a puff of dust and a ring on a tile (placing, moving, taking down) |
| `removeItem` |  |
| `moveTarget` | Przenieś: free, keeps the level. The element is lifted off for the check, so its own spot does not count as taken. |
| `moveItem` |  |
| `itemAt` | the element under (or right next to) a tap, any kind |
| `tapUpgrade` |  |
| `tapMove` |  |
| `renderItem` |  |
| `renderEsencja` | v15.1: a tap on the equation row: what each part means, and where this wave's Esencja came from |
| `renderHero` | 1.17: Teraz statuses wraca sam do domu and rozgląda się 1.17.1: Ta fala: Widział(a) w tej fali (sawNames). |
| `renderHungerTip` | v14: the first hungry wave explains itself once |
| `renderBreach` | The breach, tapped between waves: what it means and the patch. |
| `renderCard` | A card from the deck tab: read it, or sell it between waves. |
| `fate` |  |
| `fearSrcName` |  |
| `statTile` |  |
| `itemsTable` |  |
| `statsTable` | 1.17: rows for looking around, the council and news (no caller in 1.17, see 08) |
| `renderOver` |  |
| `renderVictory` | After a reload at the final summary: the same choice as on the summary (win now or play on). |
| `saveRunSoon` |  |
| `saveRunSoonSummary` |  |
| `saveRun` |  |
| `loadSave` |  |
| `clearSave` |  |
| `resumeRun` |  |
| `snapshotLayout` | 54: Prototype 1.11: the heart takes no Esencja, a wave must reach hungerNeed (60 x 1,25^(wave-2)) or a crystal goes (hunger.fedAmt = how far the bar got; stats.essHeart is gone) 53: Prototype 1.10: 4 heroes a wave (+... |
| `runSummary` |  |
| `docBytes` |  |
| `logWave` |  |
| `pushLog` |  |
| `logText` |  |
| `getDownloads` |  |
| `downloadRun` |  |
| `copyFallback` |  |
| `trapNear` |  |
| `snapTile` |  |
| `objOn` |  |
| `cellOf` |  |
| `itemBack` |  |
| `itemInfo` |  |
| `objName` |  |
| `objBack` |  |
| `objInfo` |  |
| `pickUp` |  |
| `pickUpObj` |  |
| `dropCarry` |  |
| `objTargetOk` | furniture goes where a crate could stand: free floor of a room, not by a door or the heart, the room stays in one piece |
| `objTarget` |  |
| `moveObj` |  |
| `removeObj` |  |
| `holdTarget` | what a finger is on: an element (exact tile, or right next to it when nothing is chosen), else a piece of furniture |
| `holdRemove` |  |
| `buildTap` | a tap between waves: true = handled here (pick up, put down, swap what is in hand) |
| `withTapCam` |  |
| `tapWorld` |  |
| `heroAtScreen` | the hero whose figure is under the finger (or close to it), on the screen |
| `handleTap` |  |
| `tryPlace` |  |
| `localXY` |  |
| `endPointer` |  |
| `dungeonBounds` |  |
| `countType` |  |
| `tutPathTile` |  |
| `tutWallTile` |  |
| `trayOpen` |  |
| `tutUpTarget` | 1.05: the item to upgrade in the tutorial: the newest trap the player placed (or any trap) |
| `coachSync` | read once per change, not every frame |
| `popsSeen` |  |
| `tutPop` | true if the card shows (or waits for the one up now) |
| `tutPopShow` |  |
| `tutPopDrop` | the guide's own step comes back with the build (tutOnBuild) |
| `tutPopClose` |  |
| `coachHide` | 1.12 (bug): a new run (or a saved one) never inherits the guide's card of the run before |
| `onbStage` |  |
| `setOnb` |  |
| `coachDone` |  |
| `onbDone` |  |
| `startGuided` | a run of the first ones: the guide with the first (once: a first run left in the middle starts again without it), a card with what is new for the others |
| `renderNews` |  |
| `renderOnb` |  |
| `tutStart` |  |
| `tutLogOf` | 1.05: how far the tutorial got (logged with the run): the furthest step, the steps skipped, how it ended |
| `tutClearHl` |  |
| `tutShow` |  |
| `tutTarget` |  |
| `tutAdvance` |  |
| `tutHoldOk` | 1.15.1: the guide's pause that a held finger ends (the ff step) |
| `tutCheckHold` | 1.15.1: the guide's first check: the world stands while it waits (timeScale) |
| `isOpenT` | 1.15: a tile can be used: unlocked, and a komnata only once one of its family is |
| `subsOn`, `curSub` | 1.14: the sub-tabs with something for this stage, and the one picked (remembered per tab) |
| `subStage` | 1.15.1: the run of learning a sub-tab's first tile comes in (a dimmed sub-tab says it) |
| `tutTick` |  |
| `tutEvent` |  |
| `tutOnBuild` | 1.12: a new wave's build jumps to its first step (what was left of the wave before is let go) |
| `tutResume` | Prototype 1.0: a tutorial run comes back from a save with its coach where it was. A step of the wave itself waits for the next wave, so it goes back to "release the wave"; the "place more" steps count from what... |
| `tutAnySpot` |  |
| `tutEnd` | 1.17: the test hooks also export lookRoll, lookSpots, hearFar, councilVote, nameGen, nameFill |
| `subWhen` | (1.24) 1.24 (B): the first run opens it with a wave |
| `effWords` | (1.24) 1.24 (B, P1-4) |
| `withName` | (1.24) w wersji WWW najpierw pytanie o imię, potem start |
| `renderName` | (1.24) okno "Jak masz na imię?" |
| `sellFor` | (1.24) 1.24: a fused ★ card sells for two |
| `fuses` | (1.24) 1.24: taking it fuses it with the one you have |
| `unfuse` | (1.24) 1.24: sold: the ★ goes with it |
| `cardName` | (1.24) 1.24 |
| `srcText` | (1.20) 1.20: where a hero's item comes from (the hero card, the next party's icons) |
| `needHas` | (1.18) czy element (także komnata k_ albo efekt r_) jest w lochu (cardFit) |
| `cheapestItem` | (1.24) najtańszy element, który można teraz postawić |
| `askUnspent` | (1.24) pytanie o niewydaną Esencję przed falą |
| `renderUnspent` | (1.24) okno "Masz X Esencji" |
| `runStatus` | (1.24) 1.24 (D, P0-1; two runs had status active with won true): one status: win (won at wave 10, also when it went on and fell later), end (lost: no crystal left, also while the player still has to pick "Zakończ run" or... |
| `notePreview` | (1.24) 1.24 (D, P0-6): the next wave looked at in the build phase (the news card, the party list, a card of the next party; Part B's preview calls it too) and the fear shown in the wave (card: a hero card opened in the... |
| `noteFearUi` | (1.24) liczy oglądanie strachu w fali (karta, pasek) |
| `activeTick` | (1.24) co 1 s: czas aktywnej gry i posiedzenia |
| `crystalWhy` | (1.24) 1.24 (D, P0-2): the summary says in one red line why a crystal went (the testers lost crystals to hunger without noticing) |
| `hungerRisk` | (1.24) 1.24 (D, P0-2): in the build phase, a warning when hunger may eat a crystal in the coming wave: the last wave brought less than 1,25 x what the heart wants now, or the heart ate a crystal last time |
| `healLine` | (1.24) 1.24 (C, addendum 2): the shaman's heals of the last wave |
| `tutWayOnly` | (1.24) 1.24 (B, P1-5: a tester's spikes never fired in the guide): the guide's spikes go on the heroes' way (from a quarter of it on, like the ring), so a hero steps on them in wave 1 (and tutSpikeSure makes them go off) |

