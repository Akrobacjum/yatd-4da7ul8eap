# Załącznik C: mapa kodu prototypu

Spis funkcji z `src/` (Prototype 1.13) z pierwszym zdaniem komentarza, który je poprzedza (komentarze w kodzie są po angielsku). Służy do szybkiego znalezienia miejsca w kodzie, na które powołuje się specyfikacja (`plik.js: funkcja`). Numery linii pominięte, bo się zmieniają; szukaj po nazwie.

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
| `nameFill` |  |

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
| `nbrRooms` | rooms and corridors right next to a room (through its doors), for the grotto's echo |
| `roomTilesNear` |  |
| `areaOf` |  |
| `areaOfRaw` |  |
| `passable` |  |
| `bfs` | Dijkstra. Heroes only walk where they know the way (known), and pay extra for danger they know about (avoid = how much they care). |
| `pathFrom` |  |
| `shortestPath` | the true shortest way in (used by the tutorial and the test bots) |
| `markKnown` | The party shares one map in their heads: what they were told in the tavern (rumours) plus what they see. A room is seen whole the moment someone steps in (or into its doorway); in a corridor they see a few tiles... |
| `revealRoom` |  |
| `revealAround` |  |
| `reveal` |  |
| `checkGhostRumors` | A rumoured trap that is not there: once they can see the spot, the false rumour is gone. |
| `frontier` | Frontier: tiles they know, next to walkable tiles they do not know yet. That is where exploring goes. |

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
| `payChain` |  |
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
| `othersWaiting` | a new line also waits for the lines already waiting around him (a talk going on, an answer due): first come, first said |
| `lookAt` |  |
| `say` |  |
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
| `freshParty` |  |
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
| `spawnHero` |  |
| `regroupAtDoor` | The first ones ran out screaming before everyone was in: those still outside go in as a new group, a little shaken. |
| `becomeImpatient` | Patience runs out. Prototype 1.01 (author's decision): the party retreats and goes home, heart known or not (the old "szarża" is gone). Only the hero of the prophecy never goes home: the prophecy shows the way and... |
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
| `phobiaSight` | seeing what he fears: a jolt the first time (15% of courage), once per element |
| `bt` |  |
| `srcKind` |  |
| `markOuch` | 1.13 (author: they stood and rested in traps): a hero remembers where a trap just got him (the whole reach of it, for half a minute), even if the party learnt nothing; he will not stand still there (p... |
| `damage` |  |
| `fearResist` | Fear: the second currency of the dungeon. Every bit of it scores; past a hero's courage he runs for the exit. |
| `startRage` | 1.05: fury, one mechanic for everyone (it used to be a brave one's answer to a death): +25% speed, half the fear, hits monsters harder. The barbarian lives in it: a death, a hard hit or panic makes him rage (panic... |
| `raging` |  |
| `addFear` |  |
| `dropCrystal` |  |
| `startFlee` |  |
| `partyFlee` |  |
| `crystalReturns` | The carrier loses the crystal (killed, or down a bottomless well): it rolls back to the heart and the others decide what now. |
| `kill` | A dead hero: points, a soul for the dungeon, a louder legend (Infamy), panic among the others. His secrets die with him. |
| `rollItem` |  |
| `itemPow` | Rdza and a curse weaken gear |
| `potionHeal` | a potion heals 30% of max HP, a rare one 51%, never more than 55% |
| `gearR` |  |
| `itemLabel` |  |
| `itemAcc` |  |
| `itemValue` | What a piece of gear is worth to this hero right now (0 = no use for it): potions matter when hurt, a second power of a kind only if it is better, each class has its favourite (warrior: talisman, weapon, armour;... |
| `dropItem` | Something lands on the floor next to the hero (swapped out, or spilled from a body): the exact item, loot for anyone. |
| `giveItem` | A hero takes a piece of gear. One power, weapon and armour of a kind: a better one replaces the old one (left on the floor); a full pack swaps out its least useful item if the new one is worth more, otherwise he... |
| `noticeLoot` | Greed grows when they SEE treasure (each kind its own pull, a Sezam doubles it); picking it up adds a little more. |
| `pickup` | Picking it up: coins go to the purse, the rest is a real item (or the exact one that was dropped). No use or no room: it stays. |
| `curse` |  |

## p4_traps.js (odpalanie pułapek i potworów)

| funkcja | komentarz przed nią |
|---|---|
| `learnTrap` | A trap that went off in front of the heroes may be remembered (veterans almost always, rookies often not); the thief, elites and amulets spot traps before they fire. Known traps are avoided if they can be. |
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
| `decoyAlarm` | Wabik: taking it apart rings the alarm and every ready trap in its room goes off at once. |
| `fire` | 1.05: while a trap fires, the wounds and the fright it causes are remembered by each hero (what he will tell in the tavern) |
| `feltBy` |  |
| `fireRaw` |  |
| `fall` | Trapdoor: down into the dark, out somewhere else a few seconds later, alone and shaken. A hero falls through a given trapdoor once per wave: after that he knows where the edge is and steps around it. |
| `landFallen` |  |
| `cageHero` | Cage: stuck for a while, taking extra damage. The party decides whether to come back for him. |
| `freeCaged` | Once a cage has been opened (pried by a friend, worn through, or torn apart in panic) its bars are bent: no more catches this wave. |
| `cageEnds` | v14.1: the cage's time is up. A friend on the way gets a few more seconds; nobody coming = he dies in the cage. A boss is too strong for the bars: he tears them apart (the cage is bent for this wave). |
| `hurtMonster` |  |
| `monDmg` |  |
| `driftTarget` |  |
| `driftTick` |  |
| `monstersTick` |  |

## p5_ai.js (AI bohaterów)

| funkcja | komentarz przed nią |
|---|---|
| `replanAll` | Each hero has a job: the thief scouts and disarms, the priest heals, exorcises and blesses, the mage burns monsters and webs, the warrior charges monsters and raises his shield. They only know what they have seen or... |
| `byId` |  |
| `tIdx` |  |
| `hdist` |  |
| `panicking` |  |
| `goingOut` |  |
| `exiting` |  |
| `heartGoals` |  |
| `exitGoals` |  |
| `exitGoal` |  |
| `leader` |  |
| `partySay` |  |
| `talkGroup` |  |
| `toSafety` | a hero who stands still somewhere unsafe walks to a good tile (at most 3 steps, the one nearest the leader; one who rests stays in his room, so the rest does not walk out of it; none: he stays) |
| `talk` | The party stops and talks it over: a few lines from different heroes, one after another. |
| `talkAs` | 1.05: the same, but each line has its speaker (null: anyone in the party) |
| `lineKey` |  |
| `convoAfter` |  |
| `convoStart` |  |
| `huddleUp` | 1.12.1: when the party stops to talk it over, the ones further off come up to the leader (to a free tile at most 2 steps from him) and everyone turns to him: a huddle, not a freeze |
| `talkLen` |  |
| `lootLevel` |  |
| `lootSeen` | Common loot is noticed from the same room, rare from the next one, legendary glitters across the dungeon. |
| `checkCursed` | An experienced priest (level 6+) feels the curse on a treasure close by and warns the others: nobody touches it. |
| `lootDecision` | Worth it? What the loot is worth to THIS hero (gold to the greedy, a potion to the wounded, gear he can use) against the danger they know about on the way and around it. |
| `safestRoom` |  |
| `searchTargets` | Rooms they know of (from the tavern or from the doorway) but have not walked through yet this wave: there may be treasure. |
| `chooseTarget` |  |
| `restScene` | 1.12.1: when they sit down to rest: the leader calls it, the priest tends the wounds, somebody grumbles and gets an answer |
| `decideCage` | A friend in a cage: elites always go back for him; others weigh their own fear. |
| `partyThink` | Runs a few times per second: who leads, where they go, retreat, push for the crystal or run, who got separated. |
| `answerLost` | 1.05: a lost one calls and the party answers: the nearest one who hears him (14 steps, a bard 26) shouts back and he walks towards the voice, through rooms he does not know too. A Kamień wyjec in his room turns the... |
| `lostChance` | The chance to lose the way once cut off from the leader: bigger dungeon and fog = more, experience and a thief's sense = less. |
| `getLost` |  |
| `maybeDetour` | A wrong turn at a junction (a room with 3+ ways out): more likely in a big dungeon and in the fog, rarer for veterans who know the way. |
| `powerReady` |  |
| `usePower` |  |
| `useCharm` | Talisman: a 3 s ward against trap damage (25% at the first level, +5% a level, at most 40%). A few uses a wave. Rookies switch it on after a hard hit, veterans also right before a trap they know about. |
| `useAmulet` | Amulet: when the nerves are about to go, it takes a chunk of fear away (12% of courage at the first level, +4% a level) and dulls new fear for 4 s. Rookies reach for it late (at 85% of what makes them run), veterans... |
| `useBoots` | Boots: a 3 s sprint, for running out (with or without the crystal), dashing past a known trap, or finding the others. |
| `roomThreat` | Known threat in a room: traps they know about (wall traps count for the room they face) and monsters they can see. |
| `checkPrep` |  |
| `startPrep` |  |
| `finishPrep` |  |
| `isFrontierTile` |  |
| `randomKnownFar` |  |
| `nearestOf` |  |
| `planHero` | One hero decides what to do next and finds a path there (only through tiles the party knows). |
| `partyWay` | 1.13.4: where the party is going: the leader's path while someone else leads and walks it, else the route to the party's goal (detour, heart in an assault, explore target). Not the hero's own path. |
| `disarmJob` | The thief deals with known traps that still sit on the leader's way. Rookies are slow and sometimes set them off. |
| `smashJob` | 1.05: the barbarian's axe: counter-buildings in his room (always worth it to him) and wooden furniture close by (further when raging). A smashed building does nothing for the rest of the wave and stops blocking; a... |
| `smashDone` |  |
| `blessJob` | An experienced priest lifts the curse from a known portrait near their way. |
| `bombJob` | Anyone with a bomb throws it at a known trap blocking the leader's way, from up to 3 tiles. |
| `bardTick` | Priest heals, puts out fires, raises a barrier and burns ghosts with holy light; mage burns monsters and clears webs. 1.05: the bard. A call when someone is lost (they walk to the music), and a song when spirits sag... |
| `heroAbilities` |  |
| `glance` | 1.10: standing, a hero looks around now and then: at a friend, at loot they saw, at a trap they know, or just away |
| `slipChance` |  |
| `heroTile` |  |
| `heroBlock` |  |
| `detourAround` | a short way round the heroes in the way, back onto the rest of his path (a few steps at most) |
| `stepAside` | two standing on one tile (a fall, a slide, a squeeze): the later one steps to a free tile next to it |
| `idleIn` | 1.12.1: a hero standing idle in the way of one who walks makes way: a step to the side, or one ahead along his way (and whoever stands there makes way too), so the leader never stands behind his own f... |
| `makeWay` |  |
| `onEnter` |  |
| `inZone` |  |
| `scanTraps` |  |
| `updateHero` |  |

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
| `takeCrystal` |  |
| `stealNeed` | Szklane serce: the crystal comes loose 2 times faster per copy |
| `step` |  |
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
| `wallDressing` | what is on a standing block: its torch, the wall traps on its face |
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
| `drawHero` |  |
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
| `updateHud` |  |
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
| `renderStart` |  |
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
| `waveFun` | 2-3 curiosities of the wave: the favourite trap is the usual first, the rest by lot (kept while the screen is open) |
| `renderWave` |  |
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
| `renderHero` |  |
| `renderHungerTip` | v14: the first hungry wave explains itself once |
| `renderBreach` | The breach, tapped between waves: what it means and the patch. |
| `renderCard` | A card from the deck tab: read it, or sell it between waves. |
| `fate` |  |
| `fearSrcName` |  |
| `statTile` |  |
| `itemsTable` |  |
| `statsTable` |  |
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
| `tutTick` |  |
| `tutEvent` |  |
| `tutOnBuild` | 1.12: a new wave's build jumps to its first step (what was left of the wave before is let go) |
| `tutResume` | Prototype 1.0: a tutorial run comes back from a save with its coach where it was. A step of the wave itself waits for the next wave, so it goes back to "release the wave"; the "place more" steps count from what... |
| `tutAnySpot` |  |
| `tutEnd` |  |
