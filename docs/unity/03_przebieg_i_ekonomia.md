# 03. Przebieg runu i ekonomia

Sekcja opisuje: cykl życia runu (od `newRun` do `endRun`), całą ekonomię (Groza, Chciwość, Combo, Esencja, głód serca, kryształy, przychód), sklep i talię kart (`mods`), rangi i rekordy oraz wpływ etapów nauki 1.12 na zawartość. Wszystkie odwołania do kodu mają postać `plik.js: funkcja` i dotyczą katalogu `src/` prototypu "Prototype 1.12.1". Tabele treści są wyeksportowane do `spec/data/*.json`; tu opisuję tylko ich semantykę.

Inne sekcje: generowanie bohaterów i fal, gildia, powracający, wyłom: **sekcja 04**. Pułapki, obrażenia, strach, skill checki: **sekcja 05**. AI bohaterów i mowa: **sekcja 06**. Mapa, stawianie, pętla, zapis, telemetria: **sekcja 07**. UI, kamera, grafika, audio, samouczek: **sekcja 08**.

## 0. Słownik i konwencje

| Pojęcie | Identyfikator | Znaczenie |
|---|---|---|
| Run | `run` (obiekt globalny) | Cała rozgrywka: 10 fal + opcjonalnie fale bez końca. Przetrwa między falami, jest zapisywany. |
| Stan fali / budowy | `fl` (obiekt globalny) | Tworzony od nowa przez `setupFl` na każdą fazę budowy (i przy wznowieniu po podsumowaniu). Zawiera mapę, bohaterów, statystyki fali. |
| Modyfikatory talii | `mods` (obiekt globalny) | Wynik `recomputeMods()`: domyślne wartości `freshMods()` + efekty wszystkich kart w talii. |
| Ustawienia | `S` | Kopia `DEFAULTS` (`data/DEFAULTS.json`) nadpisana ustawieniami gracza (sekcja 07). |
| Groza | `fl.base` (suma fali), `run.grozaTotal` (suma runu) | "Baza" wyniku. Każde zdarzenie (rana, strach, śmierć, ucieczka...) daje małą porcję Grozy. |
| Chciwość | `fl.greed` | Mnożnik. Startuje z wartości liczonej na początku fali, rośnie od łupu. Tylko rośnie w trakcie fali. |
| Combo | `fl.combo` (stopień 1..7), mnożnik `1 + 0,25 × (combo - 1)` | Mnożnik serii różnych pułapek odpalonych w oknie czasowym. |
| Esencja | `fl.essence` (sakiewka na żywo), `run.essence` (kopia do zapisu) | Jedyna waluta. Esencja = Groza × Chciwość × Combo (× Żyła esencji). |
| Esencja z fali | `fl.score` | Suma wszystkich wypłat serii w tej fali (z częścią serca). Wyświetlana jako "+X Esencji z fali". |
| Żniwo runu | `run.total` | Suma `fl.score` ze wszystkich fal. Wyznacza rangę i rekord. |
| Serce syte | `fl.fed`, `fl.fedAt` | Ile Esencji z tej fali zjadło już serce i kiedy się najadło. |

Zasady portu ogólne:
- JS `Math.round` zaokrągla połówki w górę (`floor(x + 0,5)`). W C# `Math.Round` domyślnie zaokrągla "do parzystej". Wszędzie, gdzie prototyp używa `Math.round`, w Unity użyj `Mathf.Floor(x + 0.5f)` albo `MidpointRounding.AwayFromZero`. Dotyczy m.in. `hungerNeed`, `priceOf`, `sellOf`.
- `Math.random()` zastąp jednym wstrzykiwanym generatorem (`System.Random` z ziarnem), żeby dało się odtwarzać fale w testach.
- Czas gry (`fl.time`, `dt`) to czas symulacji (spowalniany podczas skill checku do ×0,25, przyspieszany), a nie czas rzeczywisty. Gdzie kod używa czasu rzeczywistego (`rdt`, `realNow`), zaznaczam to wprost.

---

## 1. Cykl życia runu

### 1.1 Fazy

```
newRun ──> startBuild (faza 'build') ──[przycisk "Wypuść falę N"]──> startWave (faza 'raid')
   ^                                                                      │
   │                                         warunek końca fali ──> fl.ending = 1,2 s (czas rzeczywisty)
   │                                                                      │
   │                                                              finishWave (faza 'summary')
   │                                                                      │
   │                                         okno 'wave' (podsumowanie) ──[Dalej]──> afterSummary
   │                                                                      │
   │        kryształy <= 0 ──> okno 'over' ──[reklama: 1 kryształ, raz na run]──> proceedToBuild
   │                                       └─[Zakończ run]──> endRun (faza 'over') ──> okno 'end'
   │        fala 10 wygrana ──> wybór: "Graj dalej" (proceedToBuild) albo "Zakończ: zwycięstwo" (endRun 'win')
   │                                                                      │
   └──────── proceedToBuild ──> afterModals: run.wave++, startBuild, okno 'shop', [breach], [hungerTip]
```

Wartości `fl.phase`: `'build'`, `'raid'`, `'summary'`, `'over'`. Źródła: `p3_flow.js: setupFl`, `p3_flow.js: startWave`, `p3_flow.js: finishWave`, `p3_flow.js: endRun`.

### 1.2 `newRun(tutorial, stage)` (`p3_flow.js: newRun`)

```
stage = clamp(stage || (tutorial ? 1 : ONB_FULL), 1, ONB_FULL)     // ONB_FULL = 4
coachHide()                       // UI samouczka (sekcja 08)
run = { ...pola z tabeli niżej... }
mods = freshMods()
floats = []; particles = []; paused = false; ff = false
run.layout = genStartLayout()     // sekcja 07
startBuild()
seedStartTraps()
if (run.tut >= 0) tutStart()      // sekcja 08
```

Pola `run` ustawiane w `newRun` (pełna lista):

| Pole | Start | Znaczenie / kto używa |
|---|---|---|
| `wave` | 1 | Numer fali, która jest budowana / trwa / właśnie się skończyła. Zwiększany w `proceedToBuild` (afterModals). |
| `total` | 0 | Żniwo runu (suma `fl.score`). Ranga, rekord. |
| `waves` | [] | Rekordy fal z `recordWave` (statystyki używa gildia, sekcja 04, oraz ekrany podsumowań). |
| `crystals` | `S.crystals` (3) | Kryształy w sercu. 0 = przegrana po fali. |
| `maxCrystals` | `S.crystals` | Maksimum (wyświetlanie, karty Żarłoczne serce i Pakt). |
| `grozaTotal` | 0 | Suma `fl.base` (do logów i gildii). |
| `greedRep` | 1 | Chciwość, z jaką skończyła się ostatnia fala. Gildia z niej liczy łowców skarbów i poziom przywódcy (sekcja 04). |
| `returners` | [] | Uciekinierzy, którzy wrócą (sekcja 04). |
| `stash` | [] | Schowek kart (nieaktywne). |
| `freePicks` | 0 | Darmowe karty do wzięcia w sklepie. |
| `shop` | null | Bieżąca oferta sklepu `{ wave, ids[4], rerolls, ad }`. |
| `shopOwed` | 1 | Rzadkość, jaką ma mieć następne losowanie oferty (1 zwykła fala, 3 fala z bossem). |
| `stacks` | {} | Liczniki kart rosnących (`hunger`, `chronicle`, `granary`, `bank`, `tempered`). |
| `guild` | null | Decyzja gildii dla następnej fali (sekcja 04). |
| `resumed` | 0 | Ile razy wznowiono z zapisu (telemetria). |
| `moleWave` | 0 | Ostatnia fala, w której Kret dał darmowe kopanie. |
| `essence` | `S.essence` (30) | Kopia sakiewki do zapisu. Na żywo sakiewką jest `fl.essence`. |
| `items` | `new Map()` | Postawione elementy. **To ten sam obiekt co `fl.items`** (`setupFl` przypisuje referencję). |
| `layout` | null, potem `genStartLayout()` | Układ lochu (sekcja 07). |
| `rumor` | `{ tiles: Map, traps: Map, loot: Map, heart: -1, gold: 0 }` | Plotki (sekcja 04/06). `rumor.gold` jest składnikiem chciwości startowej (2.6). |
| `upgrades` | [] | Historia wszystkich wziętych kart (także do schowka). |
| `unlocked` | `Set(START_UNLOCKED.concat(loadFound()).filter(t => onbOk(t, stage)))` | Odblokowane elementy (rozdział 5). Od 1.14 także odkryte w poprzednich runach (`loadFound`, 3.8). |
| `foundAtStart` | `loadFound()` z `onbOk` i bez `START_UNLOCKED` | 1.14: z czym run zaczął z wcześniejszych odkryć (pole `found` w logu runu). |
| `stage` | stage | Etap nauki 1..4 (rozdział 5). |
| `pendingUpgrades` | [] | Nagrody za fale czekające na zamianę w darmowe karty. |
| `continueUsed` | false | Czy użyto "Kontynuuj z 1 kryształem" (reklama). |
| `result`, `reason` | null, '' | Wynik `'win' / 'end' / 'quit'` i tekst powodu. |
| `tut`, `tutorial` | 0 / -1, bool | Samouczek (sekcja 08). `tutorial` wpływa też na falę 1 (2 nowicjuszy, sekcja 04). |
| `startedAt`, `checkHints` (3), `mode` ('check', martwe), `fires`, `buildSec`, `raidSec` | | Czas startu, podpowiedzi skill checku (sekcja 05/08), liczniki telemetrii. |
| `best` | `loadBest()` | Rekord żniwa (rozdział 4). |
| `next` | null | Lista bohaterów następnej fali (sekcja 04). |
| `lastIncome` | 0 | Przychód po ostatniej fali (2.10). |
| `afterModals` | null | Funkcja do wywołania po zamknięciu kolejki okien (1.11). |
| `over` | false | Run skończony. |
| `greedKeep` | 0 | Trwała chciwość z zabranego łupu (2.6). |
| `greedNext` | 0 | Chciwość z opowieści o skarbach na następną falę (2.6). |
| `won` | false | Fala 10 przetrwana. |
| `id`, `thrIdx` (martwe), `waveDocs`, `logState`, `waveStart` | | Identyfikator i telemetria. Tylko prototyp. |
| `deck` | [] | Talia: tablica id kart (kopie dozwolone). |
| `deckSize` | `S.deckSize \|\| DECK_SIZE` (7) | Miejsca w talii. Pakt +1. |
| `freeDigs` | 0 | Darmowe kopania (Kret). |
| `lastInterest` | 0 | Odsetki Lichwiarza z ostatniej fali. |

Pola dopisywane później: `nextFor`, `builtFor` (strażnicy "zrobione dla fali N", `startBuild`), `breachNew` (sekcja 04), `hungerTip` (okno głodu pokazane), `victoryDone`, `endless`, `rankIdx`, `sold` (lista sprzedanych), `memSpots` (sekcja 05), `guided` (run z etapów nauki), `tutLog`, `shopTipShown`, `recorded` (rekordy zapisane), `lastLog` (telemetria), `crystalsBought` (martwe).

Tylko prototyp: `run.id` z `Date.now()` i `Math.random()`. W Unity: `System.Guid.NewGuid()`.

### 1.3 Pułapki startowe: `START_TRAPS`, `seedStartTraps` (`p3_flow.js: seedStartTraps`, `startTrapSpot`)

Stała zdefiniowana poza `p1_config.js`, w całości:

```
START_TRAPS = [['spikes', 0.7, 0.95], ['arrows', 0.6, 1]]   // [typ, f0, f1] jako ułamki najkrótszej ścieżki wejście -> serce
```

Algorytm:
```
P = shortestPath()            // lista pól od wejścia do serca (sekcja 07); pusta -> koniec
for [type, f0, f1] in START_TRAPS:
    cost = ITEMS[type].cost   // spikes 3, arrows 3
    if fl.essence < cost: continue
    t = startTrapSpot(type, P, f0, f1)
    if !t: continue
    postaw element { type, lvl 1, spent: cost, sys: true, power: mods.monster, ... }
    fl.essence -= cost; bt(type).placed++; bt(type).spent += cost
run.essence = fl.essence
saveRun('build')
```

`startTrapSpot`:
- pułapka ścienna (`ITEMS[type].slot === 'wall'`, czyli strzały): spośród wszystkich pól, na których `canPlace(type, x, y)`, wybierz to, którego obszar (`areaOf`) pokrywa najwięcej pól odcinka `P[floor(len × f0) .. ceil(len × f1))`; jeśli żadne nie pokrywa, powtórz dla całej ścieżki `P`; brak = null;
- pułapka podłogowa (kolce): idąc od indeksu `min(len - 1, floor(len × f1))` w dół do 0, pierwsze pole ścieżki, na którym `canPlace`.

Efekt ekonomiczny: start 30 Esencji minus 6 = 24 do wydania. Zdjęcie takiej pułapki zwraca jej `spent` (3). Flaga `sys: true` służy samouczkowi (sekcja 08). Komunikat pod mapą tylko gdy nie ma samouczka.

### 1.4 `startBuild()` (`p3_flow.js: startBuild`)

Kolejność:
1. `tutPopDrop()` (UI).
2. `setupFl('build')` (1.5).
3. Jeżeli `!run.shop || run.shop.wave !== run.wave`: `shopRefresh(true)` (3.4). Każda fala ma świeżą ofertę.
4. Jeżeli `!run.next || run.nextFor !== run.wave`: `run.next = makeWave(run.wave); run.nextFor = run.wave` (zwykle drużyna jest już zrobiona w `finishWave`).
5. Jeżeli `run.builtFor !== run.wave` (raz na falę):
   - `run.builtFor = run.wave`;
   - Kret: `if (mods.mole && run.wave % 2 === 0 && run.moleWave !== run.wave) { run.freeDigs += mods.mole; run.moleWave = run.wave; }` (darmowe kopania sumują się, nie przepadają);
   - wyłom: od fali 6, poza samouczkiem, z p = `BREACH_P` (0,35) `planBreach()` (sekcja 04; tylko etap 4);
   - usunięcie martwego wyłomu.
6. `fl.cardMult = cardMultNow()` (zawsze 1, martwe).
7. Reset efektów, zaznaczenia, pauzy i fast-forward; `clearUndo()`; kamera; HUD (sekcja 08).
8. `saveRun('build')` (sekcja 07).

### 1.5 `setupFl(phase)`: pola `fl` istotne dla ekonomii (`p3_flow.js: setupFl`)

```
fl = buildMap(run.layout) + {
  items: run.items, phase, essence: run.essence,
  greed: 1, base: 0, combo: 1, lastTrapAt: -99, lastTrapType: null,
  cclock: 0, lastTrapC: -99, comboWinNow: S.comboWin,
  score: 0, fed: 0, fedAt: -1, chain: null, lastPay: null,
  ending: null, endReason: null (martwe), fearless: false,
  crystalLost: false, rerolled: false (martwe, patrz 3.12),
  byType: {}, stats: newStats(), party: freshParty(), ...
}
validateItems(true)   // elementy bez miejsca wracają jako Esencja (spent albo cost)
dla każdego elementu: naprawa i reset zegarów; potwory: hp = max (żywe potwory leczą się między falami)
fl.bRooms = computeBRooms()
```

Uwaga: potwór zabity w fali jest usuwany z `fl.items` (`p4_traps.js: hurtMonster`), więc ginie na dobre, a wydana na niego Esencja przepada. Przeżyte potwory wracają z pełnym HP.

`newStats()` (`p3_flow.js: newStats`) zawiera m.in. wszystkie liczniki Grozy z rozdziału 2.2 (`dmgPts`, `fearPts`, `scarePts`, `killPts`, `lootPts`, `crystalPts`, `wavePts`, `lostPts`, `lonePts`, `healPts`, `edgePts`), liczniki Esencji (`essBase`, `essFear`, `essSoul` (martwe), `essDrop`), `maxCombo: 1`, `souls`, `lootSeen`, `loot` oraz kilkadziesiąt liczników telemetrycznych. Pola dopisywane dynamicznie: `comboPts`, `essWave`, `essHeart`, `essGlut`, `treasureTale`, `greedKept`, `hungerAte`.

### 1.6 `startWave()` (`p3_flow.js: startWave`)

Wywoływana przyciskiem akcji w fazie budowy (`p8b_ui.js: updateAction`, obsługa przycisku). Nie ma kosztu ani warunku poza `fl.phase === 'build'`.

```
run.buildSec += czas rzeczywisty budowy; saveRun('build')       // zamknięcie aplikacji w fali wraca do tej budowy
fl.phase = 'raid'; fl.time = 0; fl.gateOpen = false; ...
fl.queue = run.next.slice()
fl.arsenal4 = (liczba różnych DMG_OF wśród ACTIVE elementów) >= 4      // Pełen arsenał (sekcja 05)
run.returners = run.returners.filter(r => r.used !== run.wave)
fl.base = 0
setGreed(greedStartNow())          // 2.6
run.greedNext = 0                  // opowieści zużyte
fl.chain = null; fl.lastPay = null; fl.fed = 0; fl.fedAt = -1
applyRumors()                      // sekcja 04/06; widziany z plotek łup od razu podbija chciwość (2.6)
chooseEntrance()                   // sekcja 04
Krypta: potwory w krypcie dostają hp = round(max × 1,25) na tę falę
baner "Fala N", reset UI, fl.tl (telemetria), run.waveStart = snapshotLayout() (telemetria)
```

Drużyna stoi przy drzwiach `GATE_T = 1,8 s` czasu gry (`p6_loop.js: step`), potem wchodzi (sekcja 06).

### 1.7 Koniec fali: warunki i `fl.ending`

Sprawdzane w `p6_loop.js: step` (czas gry):

| Warunek | Skutek | Źródło |
|---|---|---|
| `fl.patT` (cierpliwość, od 1.12.1: rośnie o `dt`, a o `0,5 × dt`, gdy drużyna się naradza (`fl.time < P.talkUntil`) albo odpoczywa (`plan 'retreat'` i `restSince > 0`); `p6_loop.js: step`) `>= S.waveTime` (120 s) i `!fl.fearless` | `becomeImpatient()`: `fl.fearless = true`; drużyna wraca do domu (`plan 'leave'`), chyba że jest bohater z przepowiedni: wtedy zna serce i szturmuje (`plan 'assault'`, `fl.storm = true`). | `p3_flow.js: becomeImpatient` |
| `fl.patT >= S.waveTime + 60` (180 s czasu cierpliwości) | Siatka bezpieczeństwa: każdy żywy i nie-wyszły bohater (także "zniknięty" w zapadni: `h.gone = false`) przechodzi przez `heroExit(h)`. **Nosiciel kryształu wynosi go wtedy (kryształ stracony).** | `p6_loop.js: step` |
| `fl.queue.length === 0 && fl.heroes.length && wszyscy (dead \|\| fled)` | `fl.ending = 1.2` | `p6_loop.js: step` |
| Fala 1: drużyna przy sercu, `P.steal >= 0,85 × stealNeed()` | Serce ich odpycha: strach, ucieczka, `plan 'leave'` (fala 1 nie może ukraść kryształu). | `p6_loop.js: step` |

`fl.ending` odlicza **czas rzeczywisty** (`rdt`) w `p6_loop.js: frameBody`, tylko gdy nie ma otwartego okna i pauzy. Po dojściu do 0: `fl.ending = null; finishWave()`. Gdy `fl.ending !== null`, `damage()` ignoruje obrażenia, a skill checki się nie pojawiają (`p6_loop.js: checkTick`).

Uwaga: bohater "zniknięty" (spada w zapadni, `h.gone`) nie jest ani `dead`, ani `fled`, więc fala nie kończy się, dopóki nie wyjdzie z upadku.

### 1.8 `finishWave()` (`p3_flow.js: finishWave`), dokładna kolejność

1. Tylko gdy `fl.phase === 'raid'`. `fl.check = null; ff = false; fl.finishing = true` (blokuje karty samouczka).
2. `payChain()`: niedokończona seria jest wypłacana przed rozliczeniem serca (2.4).
3. `run.greedNext = fl.stats.treasureTale || 0` (2.6).
4. Statystyki elementów fali na ich karty: `it.lf/lh/lp/lk` z `it.w`, potem `it.w = null` (UI, sekcja 08).
5. `run.raidSec += fl.time`.
6. Plotki (jeśli ktoś wyszedł żywy, `fl.anyOut`): sekcja 04/06. Wynik: `rr` (pokoje), `rt` (pułapki).
7. `run.layout.breach.fresh = false` (sekcja 04).
8. Skarbiec: `if (!fl.crystalLost && mods.bank) run.stacks.bank++`.
9. `fl.stats.wavePts = 0` (brak premii za samą falę od v15).
10. `feedHeart()` (2.7).
11. Zwycięstwo: `if (run.wave === RUN_WAVES && run.crystals > 0 && !run.won) { run.won = true; fl.victory = true; }`.
12. `run.grozaTotal += fl.base; run.greedRep = fl.greed`.
13. `checkThresholds(run.total + fl.score)`: ogłoszenia nowych rang (rozdział 4).
14. `run.pendingUpgrades.push({ r: bossOf(run.wave) ? 3 : 1, src: bossOf(run.wave) ? 'boss' : 'wave', wave: run.wave })`. **Każda zakończona fala** daje nagrodę, także gdy stracono kryształ.
15. Odsetki i przychód (2.10): `run.lastInterest`, `income`, `run.lastIncome`, `run.essence = fl.essence + income; fl.essence = run.essence`.
16. `collectReturners()` (sekcja 04; tylko etap 4).
17. `recordWave(rr, rt)`: dopisuje rekord do `run.waves`.
18. `run.total += fl.score`; `if (run.total > run.best) { run.best = run.total; saveBest(run.best); }`.
19. `if (run.crystals > 0) { run.next = makeWave(run.wave + 1); run.nextFor = run.wave + 1; }` (podsumowanie pokazuje następną drużynę).
20. `logWave(false)`: telemetria, tylko prototyp.
21. `if (run.crystals > 0) saveRun('summary')`.
22. `fl.phase = 'summary'`; `queueModal({ type: 'wave', rr, rt, out })`.

`recordWave` (`p3_flow.js: recordWave`) zapisuje m.in.: `wave`, `score` (round `fl.score`), `time`, `crystalLost`, `heroes[]` (typ, poziom, boss, los: `dead/scared/crystal/left`), `hunger` (obiekt z 2.7), `groza`, `greed`, `crystals`, `essence`, `stats` (zaokrąglone), `items` (statystyki per typ elementu), `partial`. Dla gry w Unity potrzebne są: `stats` (gildia czyta `fearPts, scarePts, dmgPts, killPts, lostPts, lonePts, kills, gotLost, reroutes`), `heroes.length`, `score`, `hunger`, `crystalLost`, `items` (najlepsze elementy na ekranie końca). Reszta (perf, cpm, frozen, errors) to telemetria, tylko prototyp.

### 1.9 Podsumowanie fali i kolejność okien

Okno `'wave'` (`p8b_ui.js: renderWave`), dane ekonomiczne:
- nagłówek: `fl.victory` -> "Zwycięstwo!"; `fl.crystalLost` -> "Kryształ skradziony"; serce zjadło kryształ -> "Serce zjadło kryształ"; inaczej "Fala odparta". Duża liczba `+fl.score` "Esencji z fali";
- kafelki: sakiewka `run.essence`; serce `♥ need` (syte / zjadło kryształ) albo "-" ("głód od fali 2"); kryształy `crystals/maxCrystals`; zabici · przestraszeni;
- rachunek: `Groza fl.base × (fl.score / fl.base) = fl.score`; serce `−need` albo `za mało: −fed · kryształ`; `dla Ciebie +mine (+lastIncome po fali)`, gdzie `heart = min(need, fl.fed)`, `mine = ate ? 0 : max(0, fl.score - heart)`;
- wykres Esencji z fal, 2-3 ciekawostki (`waveFun`), panel następnej fali;
- "Szczegóły" (`p8b_ui.js: waveDetails`): pasek "Skąd Esencja" z `dmgPts, fearPts, scarePts, killPts, lootPts, comboPts` i "Inne" = `crystalPts + lostPts + lonePts + healPts`; zakładki Co dalej / Bohaterowie / Elementy / Liczby.

Przyciski: "Dalej: sklep przed falą N+1" (podpis: liczba darmowych kart = `pendingUpgrades.length + freePicks`, "(legendarna w ofercie)" gdy nagroda z bossa) -> `closeModal(); afterSummary()`. "Zapisz i wyjdź" (gdy kryształy > 0 i nie wygrana). "Zakończ run" (dwa stuknięcia) -> `endRun('Run zakończony przez gracza po fali N.', 'quit')`. Przy wygranej: "Graj dalej" (`run.victoryDone = true; afterSummary()`) i "Zakończ: zwycięstwo" (`endRun('Loch przetrwał wszystkie 10 fal.', 'win')`). "Pobierz wyniki": tylko prototyp (w Unity brak).

Kolejka okien (`p8b_ui.js: queueModal`, `closeModal`, `openModal`): jedno okno naraz; `queueModal` dokleja do kolejki FIFO, gdy coś jest otwarte. `closeModal` otwiera następne z kolejki, a gdy kolejka pusta i `run.afterModals` istnieje, wywołuje je (jednorazowo).

`afterSummary()` (`p3_flow.js: afterSummary`):
```
if (run.crystals <= 0) { queueModal({ type: 'over' }); return; }
if (run.wave === RUN_WAVES && run.won && !run.victoryDone) { queueModal({ type: 'victory' }); return; }   // tylko po wczytaniu zapisu z ekranu finału
proceedToBuild();
```

`proceedToBuild()` (`p3_flow.js: proceedToBuild`):
```
picks = run.pendingUpgrades.splice(0)
run.freePicks += picks.length + (mods.patron && run.wave % 2 === 0 ? mods.patron : 0)   // run.wave = fala właśnie zakończona
run.shopOwed = max(run.shopOwed || 1, ...picks.map(p => p.r), 1)
run.afterModals = () => {
    run.wave++
    startBuild()                                                  // tu shopRefresh(true) zużywa shopOwed
    queueModal({ type: 'shop', between: true })
    if (run.tut >= 0) tutOnBuild()
    if (run.breachNew === run.wave && fl.breach) queueModal({ type: 'breach', fresh: true })
    if (run.wave === 2 && !run.hungerTip) { run.hungerTip = true; queueModal({ type: 'hungerTip' }) }
}
f = run.afterModals; run.afterModals = null; f()                  // wywołane od razu
```

Kolejność okien po fali jest więc: sklep -> (nowy wyłom) -> (okno głodu, tylko przed falą 2, raz na run). W Unity wystarczy prosta kolejka; mechanizm `afterModals` to pozostałość i może zostać zastąpiony bezpośrednim wywołaniem.

Okno `'hungerTip'` (`p8b_ui.js: renderHungerTip`): tekst o głodzie z bieżącym `hungerNeed(run.wave)`.

### 1.10 Koniec runu

**Przegrana.** Run nie kończy się w trakcie fali, nawet gdy kryształy spadną do 0 (fala gra dalej). Po podsumowaniu `afterSummary` pokazuje okno `'over'` (`p8b_ui.js: renderOver`):
- nagłówek zależny od `fl.hunger.ate`: "Serce zjadło ostatni kryształ" albo "Ostatni kryształ wyniesiony";
- jeśli `!run.continueUsed`: "Kontynuuj z 1 kryształem" (symulacja reklamy: 3 kroki po 700 ms czasu rzeczywistego), potem `run.continueUsed = true; run.crystals = 1; run.maxCrystals = max(run.maxCrystals, 1); proceedToBuild()`. Nagrody z tej fali (`pendingUpgrades`) przechodzą normalnie;
- "Zakończ run" -> `endRun(ate ? 'Serce zjadło ostatni kryształ.' : 'Bohaterowie wynieśli wszystkie kryształy.', 'end')`.

Tylko prototyp: symulacja reklamy. W Unity: reklama nagradzana (np. LevelPlay Rewarded) z tym samym efektem po potwierdzeniu nagrody, raz na run.

**`endRun(reason, result)`** (`p3_flow.js: endRun`):
```
run.result = result || 'end'; run.reason = reason; run.over = true
if (run.won && run.result !== 'win') { run.endless = run.wave - RUN_WAVES; run.result = 'win' }   // wygrana zostaje
onbDone(run)          // rozdział 5
clearSave()
fl.phase = 'over'; ff = false
queueModal({ type: 'end' })
```

**Zwycięstwo.** Warunek w `finishWave`: fala `RUN_WAVES` (10) zakończona z `run.crystals > 0` (po rozliczeniu głodu). Bohater z przepowiedni nie musi zginąć. Gracz wybiera: "Graj dalej" (fale bez końca) albo "Zakończ: zwycięstwo". Okno `'victory'` (`p8b_ui.js: renderVictory`) pojawia się tylko po wczytaniu zapisu zrobionego na podsumowaniu finału; daje te same dwa wybory.

**Fale bez końca.** Po wygranej fale numerowane dalej (`run.wave > 10`), HUD pokazuje "Fala N ∞", `waveName()` bez "/10". Głód rośnie dalej (2.7), boss co 5 fal (`bossOf`: `n % 10 === 0` -> 'final', inaczej `n % 5 === 0` -> 'champion'), nagroda bossa `r = 3` także w falach 15, 20... Siła fal: sekcja 04. Przegrana w falach bez końca kończy się wynikiem `'win'` z `run.endless = run.wave - 10`.

Przypadek brzegowy: jeśli fala 10 skończy się z 0 kryształami, a gracz użyje reklamy, gra przechodzi do fali 11 i `run.won` już nigdy nie zostanie ustawione (warunek sprawdza tylko `run.wave === RUN_WAVES`). Run może się skończyć tylko wynikiem `'end'` albo `'quit'`.

**Przerwanie.** `quitRun()` (`p3_flow.js: quitRun`, wywoływane z menu w trakcie gry): jeśli trwa fala, `recordWave(0, 0, true)` (rekord częściowy), `run.total += fl.score`, `logWave(true)`; potem `endRun('Run przerwany przez gracza.', 'quit')`. Otwarta seria combo nie jest wypłacana przed doliczeniem (drobna rozbieżność, patrz rozdział 6).

**Ekran końca** (`p8b_ui.js: renderEnd`): opisany w rozdziale 4.

### 1.11 Zapis (skrót, szczegóły w sekcji 07)

Zapisy: `saveRun('build')` w `startBuild`, `seedStartTraps`, `startWave` i po zmianach w budowie; `saveRun('summary')` w `finishWave`, tylko gdy `run.crystals > 0`. `endRun` czyści zapis. Wznowienie (`p8b_ui.js: resumeRun`) ze stanu `'summary'` robi `setupFl('summary')` i od razu `afterSummary()` (okno podsumowania nie jest pokazywane ponownie); ze stanu `'build'` robi `startBuild(true)`.

Luka: przy przegranej (kryształy 0) zapis `'summary'` nie powstaje, a zapis `'build'` sprzed fali zostaje do czasu kliknięcia "Zakończ run". Zamknięcie aplikacji na oknie `'over'` pozwala wczytać budowę sprzed przegranej fali. W Unity zapisz stan przegranej (albo wyczyść zapis) od razu w `finishWave`.

---

## 2. Ekonomia

### 2.1 Model

```
każde zdarzenie e (rana, strach, śmierć...) daje Grozę g(e) >= 0
Groza zbiera się w serii (fl.chain) tak długo, jak trwa combo
wypłata serii:  E = C.g × C.greed × C.cm × mods.regen
fl.score += E
essIn(E):  najpierw serce bierze do potrzeby hungerNeed(fala), reszta -> sakiewka (fl.essence)
po fali:   przychód (stały + karty) -> sakiewka
```

Esencja trafia do sakiewki tylko z: wypłat serii (`essIn`, reszta po sercu), Obżarstwa, Żniw strachu, relikwii, odnawiania (`regenBase`, domyślnie 0), przychodu po fali, sprzedaży kart, zwrotów za zdjęte elementy i zasypane pokoje, karty Zastrzyk Esencji. `fl.score` i `run.total` liczą wyłącznie wypłaty serii (z częścią serca).

### 2.2 Źródła Grozy

Stałe (`data/GZ.json`, `data/DMG_FACTOR.json`, `data/MON_FACTOR.json`):

```
GZ = { dmg: 1.5, fear: 1.6, kill: 1.2, scare: 2.5, lost: 0.12, alone: 0.09, split: 0.04, loot: 0.4, heal: 0.45, web: 0.25, cage: 0.45, crystal: 4 }
MON_FACTOR = 0.4
DMG_FACTOR = { trap: 1, loot: 1, burn: 1, monster: 0.4, heart: 0, other: 0 }
```

Pomocnicze mnożniki zdefiniowane poza `p1_config.js`:

```
lootMult(h) = 1 + 0.25 × min(4, h.inv.length)          // p6_loop.js: lootMult; obładowany sprzętem krwawi mocniej
loneMult(h) = 1                                          // p3_flow.js: loneMult; martwe (zawsze 1)
infMult() = 1, sizeMult() = 1, cardMultNow() = 1         // p3_flow.js; martwe
depthMult(r)                                             // 2.3
```

Każde źródło przechodzi przez `addPts(g, stat, h)` (2.4). Kolumna "stat" to klucz `fl.stats`, do którego trafia **wartość Esencji w chwili zdarzenia** `e = g × fl.greed × cm × mods.regen` (nie surowa Groza).

| stat | Zdarzenie | Groza `g` | Źródło |
|---|---|---|---|
| `dmgPts` | Rana zadana bohaterowi (pułapka, łup z Zatrutym łupem, podpalenie, potwór sam z siebie) | `real / gmax × GZ.dmg × DMG_FACTOR[kind] × depthMult(h.room) × lootMult(h)`, `gmax = h.max / h.hpK` (1.12.1); dodatkowo ×1,5 "Na skraju" (niżej) | `p3_flow.js: damage` |
| `dmgPts` | Sieć oplata bohatera (za każdego w obszarze) | `GZ.web × depthMult(h.room) × loneMult(h)` | `p4_traps.js: fireRaw` (case `web`) |
| `dmgPts` | Klatka więzi bohatera (jednego) | `GZ.cage × depthMult(h.room)` | `p4_traps.js: fireRaw` (case `cage`) |
| `fearPts` | Każdy przyrost strachu (po wszystkich mnożnikach strachu) | `amt / h.courage × GZ.fear × depthMult(h.room) × loneMult(h)` | `p3_flow.js: addFear` |
| `scarePts` | Bohater wychodzi z lochu przestraszony (`h.fleeing`, bez kryształu; także jeśli wybiega w panice: `fl.time < h.panicUntil`) | `GZ.scare × (h.boss ? 2 : 1) × mods.scareMult` | `p3_flow.js: heroExit` |
| `killPts` | Śmierć bohatera (z każdego źródła, także od serca) | `GZ.kill × (h.boss ? 2 : 1) × mods.soulMult × (Krypta ? 1.5 : 1)` | `p3_flow.js: kill` |
| `lootPts` | Bohater zabiera łup | `GZ.loot × rarity × depthMult(pokój łupu)`, `rarity = ITEMS[type].rarity` (Monety 1, Mikstura 1, Ekwipunek 2, Relikwia 3, Przeklęty 2) | `p3_flow.js: pickup` |
| `crystalPts` | Kryształ wraca do serca (nosiciel zabity, rzucił kryształ ze strachu, Bezdenna studnia) | `GZ.crystal` (4), bez głębi i bez przypisania do bohatera | `p3_flow.js: crystalReturns` |
| `lostPts` | Każda sekunda zgubienia (najwyżej 12 s na jedno zgubienie, `h.lostT` zerowane w `getLost`) | `GZ.lost × dt × depthMult(h.room) × mods.lostMult` | `p5_ai.js: partyThink` |
| `lonePts` | Każda sekunda samotności (inni żyją, kolejka pusta, najbliższy towarzysz dalej niż 4,5 pola), poza zwiadem | `GZ.alone × dt × depthMult(h.room) × mods.loneMult` | `p5_ai.js: partyThink` |
| `splitPts` | 1.16: każda sekunda celowego rozdzielenia (zwiadowca, jego partner, nowicjusz na wypadzie) z dala od reszty drużyny (najbliższy spoza zwiadu dalej niż 4,5 pola); zamiast `lonePts` | `GZ.split × dt × depthMult(h.room) × (h.alone ? mods.loneMult : 1)` | `p5_ai.js: partyThink` (06, 6.2.10a) |
| `healPts` | Kapłan leczy (suma wyleczonego HP w jednym rzucie) | `healed / kapłan.max × GZ.heal × depthMult(pokój kapłana)` | `p5_ai.js: heroAbilities` |
| `edgePts` | Dodatek "Na skraju" (patrz niżej) | zapisywane jako **surowa Groza** `0,5 × pts`, nie Esencja | `p3_flow.js: damage` |
| `wavePts` | Zawsze 0 od v15 | 0 | `p3_flow.js: finishWave` |
| `comboPts` | Różnica "wstecz": ile seria wypłaciła ponad sumę wartości chwilowych | `max(0, E - C.prov)` | `p3_flow.js: payChain` |

Szczegóły `damage` (tylko część Grozy; reszta to sekcja 05):
```
real = min(h.hp + h.shield, amt)               // amt po wszystkich mnożnikach obrażeń
kind = srcKind(src)                            // 'trap' | 'monster' | 'loot' | 'burn' | 'heart' | 'other'
gmax = h.max / h.hpK          // 1.12.1: HP bez dodatku comboHp (h.hpK = comboHp(n) z makeHero)
pts = real / gmax × GZ.dmg × DMG_FACTOR[kind] × depthMult(h.room) × lootMult(h)
if pts > 0 && h.hp < 0.3 × h.max && kind in {trap, loot, burn}:   // h.hp już po ranie
    fl.stats.edgePts += pts × 0.5
    pts *= 1.5                                  // "Na skraju!"
if pts > 0: e = addPts(pts, null, h); fl.stats.dmgPts += e
```
- Potwór atakujący sam (`monstersTick`) to `kind 'monster'`: Groza ×0,4 i bez combo. Zdolność potwora odpalona skill checkiem używa źródła `actSrc(type) = { kind: 'trap', type }`, więc liczy się jak pułapka (×1) i buduje combo (`fireRaw`).
- Serce (`HEART = { kind: 'heart' }`) parzy bohaterów przy krysztale: 0 Grozy za rany (i bez strachu z ran), ale śmierć od serca daje normalne `killPts`.
- Rany straszą (sekcja 05), więc rana daje dodatkowo `fearPts` przez `addFear`.
- Strach z samotności (`2,5/s`), zgubienia (`4/s`), ciężkich ran, klątwy itd. idzie przez `addFear`, więc samotny bohater daje równocześnie `lonePts` i `fearPts`.

Zdarzenia **bez** Grozy: bohater, który po prostu wychodzi (`left`, np. po zniecierpliwieniu), i bohater wynoszący kryształ.

### 2.3 Mnożnik pokoju: `depthMult` (`p3_flow.js: depthMult`, `isEdgeRoom`)

```
depthMult(r):
    if r < 0 || !fl.rooms[r]: return 1                 // bohater poza pokojem/korytarzem
    R = fl.rooms[r]
    return 1 + (S.depthMax - 1) × R.dist / fl.maxD
             + (isEdgeRoom(r) ? mods.depthBonus : 0)    // Głębia mroku
             + (R.rt === 'vault' ? 0.15 : 0)            // Sezam
isEdgeRoom(r) = fl.rooms[r].dist >= fl.maxD - 1
```
- `R.dist` to odległość pokoju od wejścia w grafie komórek (korytarz: średnia dwóch pokoi), `fl.maxD = max(1, największa odległość)`. Liczone w `p2_state_map.js: buildMap` (sekcja 07).
- `S.depthMax = 2.4`: wejście ×1,0, najgłębszy pokój ×2,4.
- Gracz widzi tę liczbę w rogu pokoju (sekcja 08).

### 2.4 Seria (łańcuch) i jej wypłata

`addPts(g, stat, h)` (`p3_flow.js: addPts`):
```
if !(g > 0) || !fl: return 0
cm = 1 + 0.25 × (comboNow() - 1)
e  = g × fl.greed × cm × mods.regen                 // wartość chwilowa
fl.base += g
C = fl.chain || (fl.chain = { g: 0, prov: 0, cm: 1, greed: fl.greed, t0: fl.time, last: fl.time, trap: false, who: Map, n: 0 })
C.g += g; C.prov += e; C.last = fl.time; C.n++
C.cm = max(C.cm, cm); C.greed = max(C.greed, fl.greed)
if comboLive(): C.trap = true
if h: C.who[h.id] += g; h.accG += g; grozaOrbs(h, g)    // UI
if stat: fl.stats[stat] += e
return e
```

`chainTick()` (`p3_flow.js: chainTick`, wołane w każdym kroku `p6_loop.js: step`, zaraz po `fl.cclock += dt`):
```
C = fl.chain; if !C: return
if C.trap ? !comboLive() : (fl.time - C.last > 1.2 || fl.time - C.t0 > 4): payChain()
```
- seria "pułapkowa" (`C.trap`): kończy się, gdy wygaśnie okno combo;
- seria bez pułapki (zgubiony, samotny, na zwiadzie, aura ducha, leczenie): kończy się po 1,2 s bez nowej Grozy albo po 4 s od początku.

Dodatkowo `p4_traps.js: fireRaw` wypłaca starą serię pułapkową, gdy nowa pułapka odpala poza oknem (zabezpieczenie; zwykle `chainTick` zrobił to wcześniej w tym samym kroku). Seria bez pułapki, w czasie której odpali pułapka, staje się pułapkową i jej wcześniejsza Groza dostaje końcowe combo.

`payChain()` (`p3_flow.js: payChain`):
```
C = fl.chain; if !C: return 0
fl.chain = null
E = C.g × C.greed × C.cm × mods.regen
fl.stats.comboPts += max(0, E - C.prov)
fl.score += E
fl.lastPay = { g: C.g, greed: C.greed, cm: C.cm, e: E, t: fl.time, n }   // HUD pokazuje wypłatę przez 1,6 s
essIn(E, C.who)                                                          // 2.7
```

Ponieważ `C.greed` i `C.cm` to maksima, `E >= C.prov` zawsze. Inwariant (do testów): `dmgPts + fearPts + scarePts + killPts + lootPts + crystalPts + lostPts + lonePts + healPts + comboPts == fl.score` (z dokładnością do zaokrągleń; `edgePts` jest poza tą sumą, bo jest w jednostkach Grozy i już zawiera się w `dmgPts`).

### 2.5 Combo

Logika w `p4_traps.js: fireRaw` (przy każdym udanym odpaleniu elementu `ACTIVE`, czyli pułapki albo zdolności potwora odpalonej przez `fire`, także gdy nikogo nie trafi; także odpalenia echa i chóru):

```
if (fl.cclock - fl.lastTrapC < (fl.comboWinNow || S.comboWin)):          // okno trwa
    if (fl.lastTrapType !== it.type || pokój(it) jest 'gears') && fl.combo < 7:
        fl.combo++                                                        // + orby (UI)
else:
    if fl.chain && fl.chain.trap: payChain()
    fl.combo = 1
fl.lastTrapAt = fl.time; fl.lastTrapC = fl.cclock; fl.lastTrapType = it.type
fl.comboWinNow = S.comboWin × (pokój(it) jest 'grotto' ? 1.5 : 1)
fl.stats.maxCombo = max(fl.stats.maxCombo, fl.combo)
comboMult = 1 + 0.25 × (fl.combo - 1)          // mnożnik Esencji pokazywany nad pułapką
cpow = 1 + COMBO_POW × (fl.combo - 1)          // COMBO_POW = 0.12, wzmocnienie ran i strachu: sekcja 05
```

```
comboLive() = !!fl && fl.cclock - fl.lastTrapC < (fl.comboWinNow || S.comboWin)     // p3_flow.js: comboLive
comboNow()  = comboLive() ? fl.combo : 1                                             // p3_flow.js: comboNow
```

- `S.comboWin = 3` s (od 1.12.1; w 1.12 było 2,5 s, wcześniej 3,5 s). Grota (`'grotto'`): okno ×1,5 (4,5 s), ustalane przez pokój **ostatnio odpalonej** pułapki.
- Zębatki (`'gears'`): ta sama pułapka (ten sam typ) odpalona ponownie też podbija combo, jeśli **odpalana** pułapka stoi w Zębatkach.
- Maks. stopień 7, czyli mnożnik Esencji 1 + 0,25 × 6 = ×2,5; `cpow` maks. 1,72.
- Tabela: stopień 1..7 -> mnożnik ×1,00 / 1,25 / 1,50 / 1,75 / 2,00 / 2,25 / 2,50; `cpow` 1,00 / 1,12 / 1,24 / 1,36 / 1,48 / 1,60 / 1,72.
- Zegar combo (od 1.12.1): `fl.cclock += dt × (fl.quiet ? S.comboQuiet : 1)`, `S.comboQuiet = 0,25`, czyli w ciszy (`quietNow`, sekcja 05: nikt nie walczy i nikt nie jest krok od zasięgu gotowej pułapki, potwora albo łupu) płynie 4 razy wolniej. Historia: do 1.11.1 w ciszy stał (cała fala w rozległym lochu bywała jedną serią z combo ×2-2,5), w 1.12 płynął zawsze (fala rozpadała się na 7-9 serii, przychód spadł o 25-50% we wczesnych falach). W czasie skill checku świat zwalnia do `CHECK_SLOW = 0,25` (`p6_loop.js`), więc okno w czasie rzeczywistym wydłuża się 4 razy.
- `comboHp(n) = 1 + COMBO_HP × min(1, max(0, n - 1) / 4)`, `COMBO_HP = 0.2`: bohaterowie dostają więcej HP jako przeciwwagę (sekcja 04). Od 1.12.1 Groza i strach z ran liczą się względem HP bez tego dodatku (`gmax = h.max / h.hpK`, `p3_flow.js: damage`), więc dodatek wydłuża najazd, ale nie obniża przychodu.
- Mnożnik Esencji `S.essK = 1,1` (od 1.12.1, `p3_flow.js: addPts`, `payChain`): `e = g × greed × cm × mods.regen × S.essK`. Dobrany na odtworzeniach dwóch runów autora tak, żeby przychód wrócił do poziomu 1.11.1 (z 1,1: +3% i +5% z fal 2-10; z 1,2 było +15% i +18%; sekcja 09, `parity/`).
- Żyła esencji (`mods.regen`, ×1,3 za kopię) mnoży każdą wypłatę na końcu.

### 2.6 Chciwość

**Krzywa** (`p3_flow.js: greedCurve`, `greedRaw`, `addGreed`, `setGreed`):
```
greedCurve(raw) = raw <= 1 ? raw : sqrt(2 × raw - 1)
greedRaw(g)     = g <= 1 ? g : (g × g + 1) / 2          // odwrotność krzywej
addGreed(dg):   g0 = fl.greed
                if dg > 0: fl.greed = greedCurve(greedRaw(g0) + dg)
                return fl.greed - g0                     // do orbów (UI)
setGreed(v):    fl.greed = v
```
Przykłady: raw 1 -> ×1,00; 1,5 -> 1,41; 2 -> 1,73; 2,5 -> 2,00; 3 -> 2,24; 4 -> 2,65; 5 -> 3,00; 8 -> 3,87. Wszystkie przyrosty i dodatki są w przestrzeni "raw". Gildia i ocena łupu przez bohaterów używają `greedRaw(fl.greed)` (sekcja 04/06). W trakcie fali chciwość tylko rośnie.

**Chciwość na start fali** (`p3_flow.js: greedStartNow`, ustawiana w `startWave`, pokazywana w budowie):
```
greedStartNow() = greedCurve(1 + mods.greedStart + run.rumor.gold + run.greedKeep + greedBonusNow())
greedBonusNow() = suma wartości z greedBonusParts()
```

`greedBonusParts()` (`p3_flow.js: greedBonusParts`): lista `[nazwa, wartość]`, z której odrzucane są pozycje o `|wartość| <= 0,001`:

| Nazwa | Wartość | Karta |
|---|---|---|
| `rozległość lochu` | `SIZE_BONUS × max(0, roomCount() - 5)`, `SIZE_BONUS = 0.05`, `roomCount` = liczba `fl.rooms` z `kind === 'room'` (bez korytarzy) | zawsze |
| `Szklane serce` | `mods.glass` | glass |
| `Kolekcjoner` | `mods.collector × liczba różnych typów ACTIVE` (bez martwych potworów) | collector |
| `Skąpiec` | `mods.miser × max(0, 15 - n)`, `n` = liczba elementów ACTIVE (bez martwych potworów) | miser |
| `Zła sława` | `mods.crystalPts × max(0, run.crystals)` | infamous |
| `karty` | `mods.greedFlat` | wager (+0,8), fasting (-0,2) |
| `Pozłacane pułapki` | `mods.gilded × liczba elementów ACTIVE z lvl >= 2` | gilded |
| `schowek` | `mods.stashGreed × run.stash.length` | hoard |
| `powracający` | `mods.returnGreed × liczba wpisów run.next z returning` | survivors |
| `opowieści o skarbach` | `run.greedNext` | zawsze |

Pozostałe składniki startu (poza listą): `mods.greedStart` (Gorączka złota, +0,3), `run.rumor.gold`, `run.greedKeep`. Wszystko liczone w chwili `startWave` (Kolekcjoner/Skąpiec/Pozłacane według elementów stojących w tej chwili).

**Łup widziany** (`p3_flow.js: noticeLoot`, wołane z `p5_ai.js: lootSeen`, `p3_flow.js: applyRumors` i `pickup`). Raz na element na falę (`it.seenWave`). Elementy `noGreed` (sprzęt odłożony przez bohatera przy wymianie) nie dają chciwości i nie liczą się do `lootSeen`.
```
kind = LOOT_KIND[type]                       // data/LOOT_KIND.json: loot gold, lpotion potion, loot2 gear, loot3 relic, lcursed cursed
g = LOOT_GREED[kind][0]                      // data/LOOT_GREED.json: [widziany, zabrany]
    × mods.greedMult                         // Złote runo ×1,5
    × (pokój łupu jest 'vault' ? 2 : 1)      // Sezam
    × (kind === 'gold' ? 1 + mods.goldDust : 1)       // Złoty pył +0,5
    × (kind === 'relic' && mods.reliquary ? 1.5 : 1)  // Relikwiarz
    / (1 + 0.15 × fl.stats.lootSeen)         // każdy kolejny widziany łup w tej fali ciągnie słabiej
addGreed(g); fl.stats.lootSeen++
```
`LOOT_GREED = { gold: [0.08, 0.06], potion: [0.03, 0.02], gear: [0.15, 0.08], relic: [0.35, 0.15], cursed: [0.15, 0.08] }`.

**Łup zabrany** (`p3_flow.js: pickup`, jeśli bohater go przyjął; szczegóły ekwipunku: sekcja 06):
```
addGreed(LOOT_GREED[kind][1] × mods.greedMult × mods.pickGreed / (1 + 0.15 × fl.stats.loot))   // Odwrotna chciwość ×3
if !it.dropped:                                            // tylko łup postawiony przez gracza
    keep = 0.5 × LOOT_GREED[kind][0] × mods.greedMult / (1 + 0.5 × run.greedKeep)
    run.greedKeep += keep; fl.stats.greedKept += keep       // trwale do końca runu (raw)
lootPts (2.2); fl.stats.loot++
monety: h.gold += max(1, it.gold || 1)
cursed: klątwa (sekcja 06)
if mods.lootTrap > 0: damage(h, mods.lootTrap × rarity, LOOTTRAP)        // Zatruty łup, kind 'loot'
if kind === 'relic' && !it.dropped: gainEssence(null, 4, 'essDrop')     // +4 Esencji do sakiewki
```

**Opowieści o skarbach** (`p3_flow.js: heroExit`), stałe zdefiniowane poza `p1_config.js`:
```
TALE_PER = 0.04, TALE_LOOT = 4, TALE_CAP = 0.3
przy każdym przestraszonym uciekinierze, jeśli fl.stats.lootSeen > 0:
    got = min(TALE_PER × min(TALE_LOOT, fl.stats.lootSeen), TALE_CAP - fl.stats.treasureTale)
    if got > 0.001: fl.stats.treasureTale += got
finishWave: run.greedNext = fl.stats.treasureTale
startWave:  wchodzi do greedBonusParts jako 'opowieści o skarbach', potem run.greedNext = 0
```
Liczy się łup widziany przez całą drużynę w tej fali, nie przez tego bohatera. Maks. +0,16 na uciekiniera i +0,3 na falę; działa tylko na następną falę.

**Złoto wyniesione** (`p3_flow.js: heroExit`): każdy bohater, który wyjdzie żywy (z dowolnego powodu) i coś zabrał (`h.loot > 0`): `run.rumor.gold += 0.05 × h.loot + 0.02 × h.gold`. Wartość nigdy nie maleje (trwały dodatek do chciwości startowej do końca runu).

**Reputacja dla gildii**: `run.greedRep = fl.greed` na końcu fali (`finishWave`). Gildia używa `greedRaw(run.greedRep)` do poziomu przywódcy i liczby łowców skarbów (sekcja 04).

**Ceny łupu** rosną z liczbą postawionych egzemplarzy (2.11), żeby chciwość nie była darmowa.

Przypadek brzegowy: karta Post (`greedFlat -0,2`) w wielu kopiach może dać raw < 1, a wtedy `greedCurve(raw) = raw`, czyli chciwość < 1 (od 5 kopii 0 lub mniej i ujemna Esencja z wypłat). Prototyp tego nie ogranicza. W Unity proponuję ograniczyć raw do minimum 0,1 i opisać to jako zmianę.

### 2.7 Głód serca, `essIn`, `feedHeart`

**Potrzeba serca** (`p3_flow.js: hungerNeed`):
```
hungerNeed(n) = (n < 2 || !(S.hungerBase > 0)) ? 0 :
    max(1, round(S.hungerBase × S.hungerGrowth^(n - 2) × (mods.hungerK || 1)
                 - (run.stacks.granary || 0) × (mods.granary || 0)))
S.hungerBase = 37, S.hungerGrowth = 1.25
```
Bez kart: fala 2: 37, 3: 46, 4: 58, 5: 72, 6: 90, 7: 113, 8: 141, 9: 176, 10: 221, 11: 276, 12: 345, 13: 431, 14: 538, 15: 673. Fala 1 nie ma głodu. Komentarz projektowy: typowa fala przynosi ok. 73 × 1,257^(n-2), serce chce mniej więcej połowę.

Modyfikatory: Zakład z sercem `hungerK ×1,3`, Post `hungerK ×0,85`, Spichlerz dusz: każda śmierć bohatera, gdy karta jest w talii, dodaje 1 do `run.stacks.granary` (`p3_flow.js: kill`), a potrzeba spada o `stacks × liczba kopii`. Potrzeba jest liczona przy każdej wypłacie, więc zabójstwo z Spichlerzem obniża ją jeszcze w tej samej fali.

**Wpływ Esencji** (`p3_flow.js: essIn`):
```
essIn(e):
    if !(e > 0): return
    need = hungerNeed(run.wave); heart = 0
    if need > 0 && fl.fed < need:
        heart = min(e, need - fl.fed); fl.fed += heart
        if fl.fed >= need - 1e-6: fl.fed = need; fl.fedAt = fl.time      // "Serce syte!"
    rest = e - heart
    if rest > 0 && need > 0 && fl.fed >= need && mods.storeK > 1:     // Obżarstwo
        x = rest × (mods.storeK - 1); rest += x; fl.stats.essGlut += x
    fl.stats.essHeart += heart
    gainEssence('eq', rest, 'essWave', heart)
```
Serce je pierwsze: dopóki nie jest syte, cała Esencja z wypłat idzie do serca, sakiewka nie dostaje nic. Część serca nie trafia do sakiewki, ale liczy się do `fl.score` i `run.total`. Bonus Obżarstwa trafia tylko do sakiewki (nie do `fl.score`). W fali 1 (`need = 0`) wszystko idzie do sakiewki, Obżarstwo nie działa.

**Rozliczenie na końcu fali** (`p3_flow.js: feedHeart`, w `finishWave` po `payChain`):
```
need = hungerNeed(run.wave); fl.hunger = null
if !need || run.crystals <= 0: return
fl.hunger = { need, got: round1(fl.score), fedAmt: round1(fl.fed), fedAt: fl.fedAt >= 0 ? round(fl.fedAt) : null }
fl.hunger.fed = fl.fed >= need - 0.001
if !fed: run.crystals = max(0, run.crystals - 1); fl.hunger.ate = true; fl.stats.hungerAte = 1
```
Fala, która nie nakarmiła serca: serce zjada wszystko, co dostało w tej fali (już zabrane w `essIn`), i jeden kryształ. Nie ma zapasu między falami (od 1.01). Jeżeli kryształy spadły do 0 przez kradzież w tej fali, rozliczenie głodu jest pomijane (`fl.hunger = null`).

HUD (sekcja 08): pasek ♥ pokazuje `min(fl.fed, need) / need` w fali i "serce chce N z fali" w budowie.

### 2.8 `gainEssence` i rodzaje wpływów (`p6_loop.js: gainEssence`)

```
gainEssence(from, amt, stat, heart):
    if !fl || !((amt || 0) + (heart || 0) > 0): return
    if amt > 0: fl.essence += amt; fl.stats[stat] += amt
    if from === 'eq': orby z pola wyniku równania do sakiewki i do ♥ (UI, sekcja 08)
    odśwież pasek budowy, gdy zmieni się część całkowita
```

| `stat` | Źródło | Wywołanie |
|---|---|---|
| `essWave` | reszta wypłaty serii po sercu (+Obżarstwo) | `p3_flow.js: essIn` |
| `essHeart` | część serca (nie trafia do sakiewki, tylko statystyka) | `p3_flow.js: essIn` |
| `essGlut` | dodatek Obżarstwa (już wliczony w `essWave`) | `p3_flow.js: essIn` |
| `essFear` | Żniwa strachu: `mods.fearHarvest` (2 na kopię) za przestraszonego uciekiniera, bez mnożników | `p3_flow.js: heroExit` |
| `essDrop` | Relikwia zabrana (nie upuszczona przez bohatera): +4 | `p3_flow.js: pickup` |
| `essBase` | odnawianie `S.regenBase / 10 × mods.regen` na sekundę gry; domyślnie `regenBase = 0`, czyli nieaktywne | `p6_loop.js: regenTick`, `regenParts` |
| `essSoul` | nigdy nie zapisywane (martwe) | - |

Tylko prototyp: suwak `regenBase` (balans). W Unity zostaw jako pole konfiguracji balansu z wartością 0.

### 2.9 Kryształy

**Kradzież** (`p6_loop.js: step`, `takeCrystal`, `stealNeed`):
```
atHeart = żywi bohaterowie w stanie 'boss' (przy sercu)
if atHeart.length && P.plan === 'assault' && fl.ending === null:
    P.steal += dt × (1 + 0.5 × (atHeart.length - 1))
    damage(atHeart[0], 5 × dt, HEART)                 // serce parzy pierwszego: 0 Grozy za rany, śmierć daje killPts
    fala 1: każdy przy sercu dostaje strach 0.3 × courage × dt; przy P.steal >= 0.85 × stealNeed(): odparcie (1.7)
    if P.steal >= stealNeed(): takeCrystal(żywi przy sercu)
stealNeed() = 4 / 2^mods.glass                         // Szklane serce: 2 razy szybciej za kopię
```
`takeCrystal`: nosicielem zostaje bohater przy sercu z największym HP; `carrier.crystal = true`, `P.carrierId`, `P.plan = 'escape'`, `P.steal = 0`, `fl.stats.crystalTaken++`. Ruch nosiciela i ucieczka: sekcja 06 (Klątwa kryształu: `carrierSlow`, `carrierFear`).

**Wyniesienie** (`p3_flow.js: heroExit`): nosiciel wychodzi -> `h.carriedOut = true; fl.crystalLost = true; run.crystals = max(0, run.crystals - 1); fl.stats.crystalLost++`. Kryształ znika natychmiast (w trakcie fali). Bez Grozy.

**Powrót** (`p3_flow.js: crystalReturns`): gdy nosiciel zginie (`kill`), rzuci kryształ ze strachu (`addFear` -> `dropCrystal`, gdy `h.fear >= lim`) albo wpadnie w zapadnię z Bezdenną studnią (`p4_traps.js: fall`). Efekt: `+GZ.crystal` Grozy (`crystalPts`), `fl.stats.crystalSaved++`, a drużyna albo szturmuje dalej (`plan 'assault'`, `P.steal = 0`, gdy żyje >= 2, średni strach/odwaga < 0,55 i nikt nie ucieka), albo ucieka (`partyFlee`). W jednej fali można więc stracić więcej niż jeden kryształ (kolejne kradzieże).

**Wszystkie zmiany liczby kryształów:**

| Zdarzenie | Zmiana | Źródło |
|---|---|---|
| Start runu | `crystals = maxCrystals = S.crystals` (3) | `p3_flow.js: newRun` |
| Kryształ wyniesiony | -1 (w fali) | `p3_flow.js: heroExit` |
| Serce głodne po fali | -1 | `p3_flow.js: feedHeart` |
| Siatka bezpieczeństwa 180 s z nosicielem w środku | -1 (przez `heroExit`) | `p6_loop.js: step` |
| Żarłoczne serce (instant) | `crystals += 1; maxCrystals += 1` | `p1_config.js: UPGRADES (crystal)` |
| Pakt (instant) | `maxCrystals = max(1, max - 1); crystals = max(1, min(crystals - 1, maxCrystals))` (przy 1 krysztale nic nie traci) | `p1_config.js: UPGRADES (pact)` |
| Kontynuacja za reklamę | `crystals = 1` (raz na run) | `p8b_ui.js: renderOver` |
| Kupno kryształu za Esencję | usunięte w 1.05 (`buyCrystal`, `crystalCost = 40 + 30 × kupione` istnieją tylko dla starych testów) | `p8b_ui.js: buyCrystal` |

Skarbiec liczy falę "bez utraty kryształu" tylko według `fl.crystalLost` (kradzież); kryształ zjedzony przez głód nie przerywa serii.

Kradzież nie sprawdza `run.crystals`: gdy w trakcie fali kryształy spadną do 0, drużyna nadal może "ukraść" i wynieść kryształ (licznik zostaje na 0 dzięki `max(0, ...)`), a uratowanie takiego kryształu nadal daje `GZ.crystal` Grozy. W Unity zachowaj albo zablokuj kradzież przy 0 (decyzja autora).

### 2.10 Przychód po fali (`p3_flow.js: finishWave`)

```
if !fl.crystalLost && mods.bank: run.stacks.bank++                       // przed liczeniem przychodu
run.lastInterest = min(floor(fl.essence × mods.usurer), 12 × round(mods.usurer / 0.15))   // Lichwiarz: 15% za kopię, maks. 12 za kopię
income = S.waveIncome + mods.income + run.lastInterest + 2 × (run.stacks.bank || 0) × mods.bank
run.lastIncome = income
run.essence = fl.essence + income; fl.essence = run.essence
```
- `S.waveIncome = 8`; Mroczny dochód +4 za kopię; Skarbiec +2 za każdą falę bez kradzieży (licznik × liczba kopii); odsetki od sakiewki **po** zarobkach tej fali, przed przychodem.
- Brak limitu sakiewki od 1.01. `DEFAULTS.essenceCap = 40` nie jest nigdzie czytane (martwe), a tekst karty Zastrzyk Esencji "nawet ponad pojemność" jest nieaktualny.

### 2.11 Wydatki i zwroty Esencji (skrót, mechanika w sekcji 07)

| Pozycja | Koszt / zwrot | Źródło |
|---|---|---|
| Element (pułapka, potwór) | `ITEMS[t].cost` (`data/ITEMS.json`) | `p8b_ui.js: costOf`, `tryPlace` |
| Łup | `ceil(cost × LOOT_STEP^n - 1e-9)`, `LOOT_STEP = 1.25`, `n` = liczba już postawionych egzemplarzy tego typu (bez upuszczonych przez bohaterów) | `p8b_ui.js: costOf`, `lootCount` |
| Budowla | `ceil(cost × mods.buildingCost)` (Tanie mury ×1,5) | `p8b_ui.js: costOf` |
| Ulepszenie | poziom 2: `ceil(cost × 2)`, poziom 3: `ceil(cost × 4)` (`UPG_COST = [0, 0, 2, 4]`); `it.spent` rośnie | `p8b_ui.js: upgCost`, `upgradeItem` |
| Zdjęcie elementu (tylko budowa) | zwrot całego `it.spent` (z ulepszeniami); łup po bohaterach (`spent 0`) nic | `p8b_ui.js: removeItem` |
| Nowy pokój | `8 + 3 × max(0, komórki - 7) - mods.digDiscount`, 0 przy `run.freeDigs > 0` | `p3_flow.js: toolCost` |
| Przejście | `4 - mods.digDiscount` (min. 0) | `p3_flow.js: toolCost` |
| Rozbudowa | `ceil(4 × 2^lvl × mods.expandCost)` | `p3_flow.js: toolCost` |
| Wyburzenie pokoju | zwrot `5 + floor(4 × (2^lvl - 1) / 2)`; przejścia: `floor(4 × (2^lvl - 1) / 2)` | `p3_flow.js: applyTool`, `expandRefund` |
| Typ pokoju | `ITEMS[r_*].cost`; zdjęcie tego samego typu: 0 i zwrot `floor(cost / 2)` | `p3_flow.js: toolCost`, `applyTool` |
| Łatanie wyłomu | `BREACH_PATCH = 20` | `p3_flow.js: patchBreach` |
| Karty w sklepie, odświeżenie | rozdział 3 | `p8b_ui.js` |
| Element bez miejsca po zmianie układu | zwrot `spent` (albo `cost`) | `p3_flow.js: validateItems` |

Cofnij (`p8b_ui.js: pushUndo`, `undo`, maks. 30 kroków, tylko w budowie) przywraca też `fl.essence` i `run.freeDigs`. Zakupy w sklepie nie są cofane.

### 2.12 Dusze i łup po poległych

- `fl.stats.souls++` przy każdej śmierci (tylko statystyka).
- Ekwipunek i sakiewka zabitego bohatera wypadają jako łup na sąsiednich polach (`p3_flow.js: kill` -> `dropItem`): typ `lpotion` (mikstura), `loot3` (przedmiot rzadkości >= 3), `loot2` (inny przedmiot), `loot` (złoto, `gold = h.gold`). Mają `dropped: true`, `spent: 0`. Leżą w `run.items`, więc **zostają na kolejne fale** jako darmowy łup gracza (można je przenieść, zdjęcie nic nie zwraca).
- Limit: najwyżej 10 upuszczonych stosów naraz, najstarsze znikają (`dropItem`).
- Widziane dają normalną chciwość (chyba że `noGreed`: sprzęt odłożony przy wymianie); zabrane dają chciwość za zabranie i `lootPts`, ale nie `greedKeep` i nie +4 za relikwię. Nie podnoszą ceny łupu (`lootCount` je pomija).

---

## 3. Sklep i talia

### 3.1 Karty: pola w `data/UPGRADES.json`

113 wpisów. Pola:
- `id`: klucz (`UPG[id]`, `p1_config.js`).
- `kind`: `'card'` (żyje w talii, zajmuje miejsce, kopie się sumują), `'unlock'` (na stałe odblokowuje element `u.unlock`, bez miejsca), `'instant'` (jednorazowy efekt `u.apply()`, bez miejsca).
- `rar`: `'c'` zwykła, `'r'` rzadka, `'l'` legendarna. Liczności: card c 47, r 41, l 6; unlock c 15; instant c 1, r 2, l 1.
- `unique`: najwyżej jedna kopia w talii + schowku (`arrows, spider, ghost, trails, well, nopick, anatomy, reliquary, quickarm`).
- `req`: wymaganie: string = `run.unlocked.has(req)`; funkcja (w JSON jako źródło `"fn: ..."`) = wywołanie (jedyna: `sticky` wymaga `web` albo `spider`). Karty z `req`: `web, fire, mimic, cage, portrait, spider, ghost, hgallery(ghost), sticky, wildfire(fire), choir(portrait), cageghost(cage)`.
- `grows`: karta rosnąca z licznikiem `run.stacks[id]` (`hunger, chronicle, granary, bank, tempered`).
- `tag`, `name`, `text`: teksty UI.
- `apply`: dla `card` funkcja `m => {...}` modyfikująca obiekt `mods`; dla `instant` funkcja bez argumentu działająca na `run`/`fl`. W JSON jako string źródła. W Unity: każda karta jako dane + mały zestaw typów efektu (np. `Mul(field, k)`, `Add(field, k)`, `Set(field, true)`), patrz 3.9.

### 3.2 Darmowe karty

- Po każdej fali `finishWave` dodaje `{ r: boss ? 3 : 1, src, wave }` do `run.pendingUpgrades`.
- `proceedToBuild` zamienia je na `run.freePicks += liczba` (+ Mecenas: `mods.patron` dodatkowych, gdy zakończona fala jest parzysta) i ustawia `run.shopOwed = max(shopOwed, r)`.
- Hojny kupiec (instant): `run.freePicks += 2`.
- Darmowe karty nie przepadają (czekają do kolejnych faz budowy). Darmowa karta obejmuje dowolną ofertę (także legendarną, odblokowanie i instant); jeśli `freePicks > 0`, każde kupno zużywa darmową kartę zamiast Esencji.

### 3.3 Losowanie trzech kart: `upgradePicks(r)` (`p8b_ui.js: upgradePicks`)

```
has(id) = run.deck.includes(id) || run.stash.includes(id)
locked = shuffle(UPGRADES.filter(u => u.kind === 'unlock' && !run.unlocked.has(u.unlock) && onbOk(u.unlock)))
f      = 0.75 × max(0, run.wave - 1)
rareP  = r >= 2 ? 1 : min(0.6, 0.15 + 0.02 × f)
legP   = r >= 3 ? 1 : r >= 2 ? min(0.4, 0.15 + 0.01 × f) : min(0.15, 0.03 + 0.005 × f)
rarOk(u) = u.rar === 'c' || (u.rar === 'r' && rand() < rareP) || (u.rar === 'l' && rand() < legP)   // losowane osobno dla każdej karty
pool   = UPGRADES.filter(u => u.kind !== 'unlock' && reqOk(u) && (ONB_CARD[u.id] || 1) <= stageOf()
                          && !(u.unique && has(u.id)) && rarOk(u))
picks = []
if r === 3: leg = shuffle(pool.filter(l)); if leg.length: picks.push(leg[0])            // boss: gwarantowana legendarna
if locked.length && (r >= 2 || rand() < 0.5): picks.push(locked[0])                    // odblokowanie
rest = shuffle(pool bez picks); dopełnij picks do 3
return shuffle(picks)
```
`reqOk(u) = !u.req || (typeof u.req === 'function' ? u.req() : run.unlocked.has(u.req))`.

Szanse dopuszczenia karty do puli przy `r = 1` (zwykła fala; `run.wave` to numer **nadchodzącej** fali):

| Fala | rareP | legP |
|---|---|---|
| 1 | 0,150 | 0,030 |
| 2 | 0,165 | 0,034 |
| 3 | 0,180 | 0,038 |
| 5 | 0,210 | 0,045 |
| 8 | 0,255 | 0,056 |
| 10 | 0,285 | 0,064 |
| 11 | 0,300 | 0,068 |
| 15 | 0,360 | 0,083 |
| 20 | 0,435 | 0,101 |
| 31 i dalej | 0,600 (limit) | 0,1425, od fali 33: 0,150 (limit) |

`r = 3` (oferta po fali z bossem): wszystkie rzadkie i legendarne w puli, jedna legendarna na pewno, odblokowanie na pewno (jeśli jakieś jest). `r = 2` (dawne progi punktowe) nie ma już źródła w 1.12 (martwa gałąź).

### 3.4 Oferta: `shopRoll`, `shopRefresh` (`p8b_ui.js`)

```
shopRoll():
    owed = run.shopOwed || 1
    ids  = upgradePicks(owed).map(id)
    more = upgradePicks(1).map(id).filter(id => !ids.includes(id))
    if more.length: ids.push(more[0])
    return ids.filter(id => !(UPG[id].unique && run.stash.includes(id))).slice(0, 4)   // zwykle 4 oferty

shopRefresh(fresh):
    same = run.shop && run.shop.wave === run.wave
    run.shop = { wave: run.wave, ids: shopRoll(), rerolls: same && !fresh ? run.shop.rerolls : 0, ad: same && !fresh ? run.shop.ad : false }
    if fresh: run.shopOwed = 1
```
Ważne: `startBuild` woła `shopRefresh(true)`, które **najpierw** losuje ofertę z `shopOwed` (np. 3 po bossie), a potem zeruje `shopOwed` do 1. Gwarancja legendarnej dotyczy więc tylko pierwszej oferty tej fazy budowy; odświeżenia losują już jak zwykła fala. Pierwsza oferta istnieje także przed falą 1 (sklep dostępny z kafelka w zakładce Talia, sekcja 08).

### 3.5 Kupno: `shopBuy(i)`, `priceOf`, `SHOP_PRICE` (`p8b_ui.js`)

Stałe spoza `p1_config.js`, w całości:
```
SHOP_PRICE = { c: 6, r: 10, l: 16 }
STASH_BASE = 3
```
```
priceOf(u) = max(1, round((u.kind === 'unlock' ? 8 : SHOP_PRICE[u.rar]) × (1 - (mods.shopDisc || 0))))   // Pośrednik -25% za kopię

shopBuy(i):
    u = UPG[run.shop.ids[i]]; jeśli brak albo faza != 'build': 'no'
    free = run.freePicks > 0; price = free ? 0 : priceOf(u)
    if !free && fl.essence < price: return 'ess'
    toStash = u.kind === 'card' && run.deck.length >= run.deckSize
    if toStash && run.stash.length >= stashCap(): return 'full'        // nic nie pobrano
    free ? run.freePicks-- : fl.essence -= price
    run.shop.ids[i] = null                                              // miejsce "Kupione"
    toStash ? (run.stash.push(id), run.upgrades.push(id)) : applyUpgrade(u)
    run.essence = fl.essence; recomputeMods(); saveRunSoon()
    return toStash ? 'stash' : 'ok'
```
Ceny: unlock 8, instant według rzadkości. Instant i unlock nigdy nie idą do schowka.

### 3.6 Odświeżanie i "Za reklamę" (`p8b_ui.js: rerollCost`, `shopReroll`)

```
rerollCost() = run.shop && run.shop.rerolls < (mods.freeReroll || 0) ? 0
             : 3 + (run.shop ? run.shop.rerolls - (mods.freeReroll || 0) : 0)
shopReroll(ad):
    tylko w budowie
    if ad: if run.shop.ad: false; run.shop.ad = true                    // raz na falę, bez kosztu, nie zwiększa rerolls
    else:  c = rerollCost(); if fl.essence < c: false; fl.essence -= c; run.shop.rerolls++
    run.shop.ids = shopRoll()                                           // kupione miejsca też wracają z nową ofertą
```
Koszt: 3, 4, 5... w obrębie fali; Szczęśliwy los: pierwsze N darmowe (N = liczba kopii), potem znów od 3. Licznik zeruje się przy nowej ofercie fali.

Tylko prototyp: "Za reklamę" to symulacja (natychmiast). W Unity: reklama nagradzana, po nagrodzie `shopReroll(true)`.

### 3.7 Talia, schowek, sprzedaż (`p8b_ui.js`)

```
stashCap()  = STASH_BASE + (mods.stashPlus || 0)                // 3, Głęboki schowek +2 za kopię
sellOf(u)   = round(RAR_SELL[u.rar] × (mods.sellK || 1))         // RAR_SELL = { c: 2, r: 4, l: 6 } (p1_config.js), Lombard ×2
toStash(i)  : jeśli schowek pełny albo brak karty -> false; deck[i] -> stash; recomputeMods()
fromStash(i): jeśli talia pełna -> false; stash[i] -> deck; recomputeMods()
sellCard(i) : usuń z talii, run.sold.push(id), addEss(sellOf(u)), recomputeMods()
sellStash(i): usuń ze schowka, run.sold.push(id), addEss(sellOf(u))
```
- Talia: `run.deck` (tablica id, kopie dozwolone poza `unique`), rozmiar `run.deckSize` (`S.deckSize || DECK_SIZE`, 7; Pakt +1 na stałe).
- Schowek: karty nieaktywne (nie wchodzą do `mods`), ale liczą się do Kolekcji w schowku i do `unique`.
- Sprzedaż i schowek tylko między falami (`renderCard` w fali pokazuje "Karty sprzedajesz tylko między falami").
- `addEss(n)`: `fl.essence += n; run.essence = fl.essence`.
- Zmniejszenie `stashCap` (sprzedaż/odłożenie Głębokiego schowka) nie wyrzuca kart nadmiarowych; blokuje tylko dokładanie.

### 3.8 Działanie kart: `applyUpgrade`, `freshMods`, `recomputeMods`

```
applyUpgrade(u):                                  // p8b_ui.js
    unlock:  run.unlocked.add(u.unlock); saveFound(u.unlock)        // 1.14: na stałe, także w kolejnych runach
    instant: u.apply()
    card:    run.deck.push(u.id); recomputeMods()
    run.upgrades.push(u.id)

recomputeMods():                                  // p3_flow.js
    mods = freshMods()
    for id in run.deck (w kolejności talii): UPG[id].apply(mods)       // dwie kopie = dwa wywołania
    for id in keys(run.stacks): if !run.deck.includes(id): delete run.stacks[id]
    if fl: fl.threatDirty = true
    updateTray()
```
Mnożenia (`*=`) się składają (dwie kopie Szybkiego przeładowania: 0,75² = 0,5625), dodawania (`+=`) sumują. Licznik karty rosnącej przepada, gdy w talii nie ma już żadnej kopii, czyli **także po odłożeniu do schowka** (tekst karty mówi tylko o sprzedaży).

Niektóre efekty są "zamrażane" przy postawieniu elementu: `mods.monster` (Weterani) ustawia `hp` i `power` potwora w chwili `tryPlace`/`seedStartTraps`, więc dotyczy tylko nowo postawionych.

Wpływ na `run` przy wczytaniu zapisu: `resumeRun` odtwarza `mods` tak samo (bez `updateTray`), odrzucając id kart, których nie ma w `UPG`.


**Odkrycia na stałe (1.14, `p3_flow.js: loadFound`, `saveFound`):** każdy element odblokowany kartą `unlock` trafia do kolekcji tej przeglądarki (`localStorage` `yatd-found`, tablica id; `loadFound` odrzuca id, których nie ma w `ITEMS`). `newRun` dodaje kolekcję do `run.unlocked` (przez `onbOk` etapu runu, więc pierwsze runy dalej pokazują tylko swój etap), a karty takich elementów nie wypadają już w sklepie, bo `upgradePicks` i `shopRoll` biorą tylko `!run.unlocked.has(u.unlock)`. Wczytanie zapisanego runu (`resumeRun`) dopisuje do kolekcji odblokowania z `run.upgrades` (run sprzed 1.14) i dokłada kolekcję do `run.unlocked`. Samouczek od nowa nie czyści kolekcji. W Unity: kolekcja w profilu gracza (zapis lokalny i w chmurze), nie w zapisie runu.
### 3.9 Tabela pól `mods`

Domyślne wartości z `p3_flow.js: freshMods`. Kolumna "Karty" podaje id karty i efekt za kopię. Kolumna "Czytane w" podaje `plik.js: funkcja`.

| Pole | Domyślnie | Karty (id: efekt) | Czytane w |
|---|---|---|---|
| `spikeDmg` | 1 | spikes: ×1,5 | `p4_traps.js: fireRaw`, `p6_loop.js: predictedDmg` |
| `cooldown` | 1 | cooldown: ×0,75; overload: ×0,6 | `p4_traps.js: cdOf` |
| `powderR` | 1 | powder: +1 | `p2_state_map.js: areaOf`, `p4_traps.js: fireRaw` |
| `webDur` | 1 | web: ×2 | `p4_traps.js: fireRaw` |
| `greedMult` | 1 | greed: ×1,5 | `p3_flow.js: noticeLoot`, `pickup` |
| `depthBonus` | 0 | depth: +0,5 | `p3_flow.js: depthMult` |
| `lootTrap` | 0 | loottrap: +15 | `p3_flow.js: pickup` |
| `monster` | 1 | monster: ×1,4 | `p8b_ui.js: tryPlace`, `p3_flow.js: seedStartTraps` |
| `disarm` | 1 | disarm: ×2 | `p5_ai.js: disarmJob` |
| `arrowBurn` | false | arrows: true | `p4_traps.js: fireRaw`, `p6_loop.js: predictedDmg` |
| `gateDur` | 1 | brak karty (zawsze 1) | `p4_traps.js: fireRaw` |
| `gateUses` | 3 | gate: +2 | `p4_traps.js: fireRaw`, `p7_draw.js` |
| `gateCrush` | 1 | gate: ×1,5 | `p4_traps.js: fireRaw`, `p6_loop.js: predictedDmg` |
| `mimicDmg` | 1 | mimic: ×1,5 | `p4_traps.js: fireRaw`, `p6_loop.js: predictedDmg` |
| `fireDmg` | 1 | fire: ×1,5 | `p4_traps.js: fireRaw`, `p6_loop.js: predictedDmg` |
| `regen` | 1 | essence: ×1,3 | `p3_flow.js: addPts`, `payChain`, `p6_loop.js: regenParts`, `p8b_ui.js: updateHud`, `renderEsencja` |
| `loneMult` | 1 | lonely: ×2 | `p5_ai.js: partyThink` (lonePts) |
| `soulMult` | 1 | soul: ×2 | `p3_flow.js: kill` |
| `lostMult` | 1 | maze: ×2 | `p5_ai.js: partyThink` (lostPts) |
| `itemPower` | 1 | cursed (Rdza): ×0,5 | `p3_flow.js: itemPow` |
| `fearMult` | 1 | haunt: ×1,25 | `p3_flow.js: addFear` |
| `scareMult` | 1 | echo: ×2 | `p3_flow.js: heroExit` |
| `rumorKeep` | 1 | deaf: ×0,5 | `p3_flow.js: finishWave` |
| `falseTrails` | false | trails: true | `p3_flow.js: finishWave` |
| `crystalPts` | 0 | infamous: +0,15 (chciwość za kryształ; nie mylić z `stats.crystalPts`) | `p3_flow.js: greedBonusParts` |
| `carrierSlow` | 1 | curse: ×0,65 | `p5_ai.js: updateHero` |
| `carrierFear` | 0 | curse: +4 (strach/s) | `p5_ai.js: partyThink` |
| `income` | 0 | income: +4 | `p3_flow.js: finishWave` |
| `digDiscount` | 0 | dig: +2 | `p3_flow.js: toolCost` |
| `greedStart` | 0 | fever: +0,3 | `p3_flow.js: greedStartNow` |
| `fallTime` | 5 | trapdoor: +4 | `p4_traps.js: fall` |
| `fallDmg` | 1 | trapdoor: ×1,5 | `p4_traps.js: fireRaw`, `p6_loop.js: predictedDmg` |
| `cageTime` | 1 | cage: ×2 | `p4_traps.js: fireRaw` |
| `cageFear` | 1 | cage: ×1,5 | `p4_traps.js: cageHero`, `p5_ai.js: partyThink` |
| `spiderNest` | false | spider: true | `p4_traps.js: monstersTick` |
| `ghostAura` | 1 | ghost: ×1,5 | `p4_traps.js: fireRaw`, `driftTick` |
| `ghostPriestOnly` | false | ghost: true | `p5_ai.js: heroAbilities` |
| `portraitR` | 4 | portrait: +2 | `p2_state_map.js: areaOf` |
| `portraitFear` | 1 | portrait: ×1,3 | `p4_traps.js: fireRaw` |
| `wallCd` | 1 | walls: ×0,8 | `p4_traps.js: cdOf` |
| `suicideMech` | 0 | suicide: +0,3 | `p4_traps.js: rigged` |
| `usurer` | 0 | usurer: +0,15 | `p3_flow.js: finishWave` |
| `mole` | 0 | mole: +1 | `p3_flow.js: startBuild` |
| `fearHarvest` | 0 | harvest: +2 | `p3_flow.js: heroExit` |
| `labyrinth` | 0 | brak (karta usunięta w v14) | nigdzie (martwe) |
| `collector` | 0 | collector: +0,05 | `p3_flow.js: greedBonusParts` |
| `miser` | 0 | miser: +0,05 | `p3_flow.js: greedBonusParts` |
| `panic` | 0 | panic: +1 | `p3_flow.js: startFlee` |
| `hauntedGallery` | 0 | hgallery: +1 | `p4_traps.js: galleryK`, `p6_loop.js: step` |
| `stickySpikes` | 0 | sticky: +1 | `p3_flow.js: trapMult`, `p6_loop.js: checkTick` |
| `wildfire` | 0 | wildfire: +1 | `p4_traps.js: ignite` |
| `bloodRite` | 0 | blood: +0,1 | `p4_traps.js: trapBoost`, `p6_loop.js: checkTick` |
| `calmStorm` | 0 | calm: +1,5 | `p4_traps.js: calmReady`, `trapBoost`, `fireRaw`, `p6_loop.js: checkTick` |
| `echoFire` | 0 | echofire: +1 | `p4_traps.js: fireRaw` |
| `glass` | 0 | glass: +1 | `p3_flow.js: greedBonusParts`, `p6_loop.js: stealNeed` |
| `pickGreed` | 1 | nopick: ×3 | `p3_flow.js: pickup` |
| `critPw` | 1,8 | gambler: ×1,35 | `p6_loop.js: memPw`, `checkTick`, `resolveCheck` |
| `okPw` | 0,7 | gambler: ×0,57 | `p6_loop.js: memPw`, `skullHolds`, `checkTick`, `resolveCheck`, `skipCheck` |
| `choir` | 0 | choir: +1 | `p4_traps.js: fireRaw` |
| `bottomless` | false | well: true | `p4_traps.js: fall` |
| `hunger` | 0 | hunger: +1 (licznik `stacks.hunger` przy zabójstwie kolcami) | `p3_flow.js: kill`, `p4_traps.js: fireRaw`, `p6_loop.js: predictedDmg` |
| `chronicle` | 0 | chronicle: +1 (licznik przy przestraszonym uciekinierze) | `p3_flow.js: heroExit`, `addFear` |
| `granary` | 0 | granary: +1 (licznik przy każdej śmierci) | `p3_flow.js: hungerNeed`, `kill` |
| `bank` | 0 | bank: +1 (licznik za falę bez kradzieży) | `p3_flow.js: finishWave` |
| `tempered` | 0 | tempered: +1 (licznik trafień pułapek) | `p4_traps.js: trapBoost`, `fireRaw` |
| `pactPower` | 1 | bloodpact: ×1,6 | `p4_traps.js: fireRaw`, `monDmg`, `p6_loop.js: predictedDmg` |
| `pactLevels` | 0 | bloodpact: +2 | `p3_flow.js: waveBase` (sekcja 04) |
| `overload` | 0 | overload: +0,06 | `p4_traps.js: fireRaw` |
| `expandCost` | 1 | cheapwalls: ×0,5 | `p3_flow.js: toolCost` |
| `buildingCost` | 1 | cheapwalls: ×1,5 | `p8b_ui.js: costOf` |
| `firepit` | 0 | firepit: +1 | `p4_traps.js: landFallen` |
| `cageHaunt` | 0 | cageghost: +12 (strach/s) | `p5_ai.js: partyThink` |
| `monsterFear` | 0 | monsterroar: +1,5 | `p3_flow.js: damage` |
| `dmgType` | `{ pierce: 1, blunt: 1, fire: 1, poison: 1 }` | sharp: pierce ×1,25; heavy: blunt ×1,25; oil: fire ×1,25; venom: poison ×1,3 | `p3_flow.js: typeMult` |
| `weakK` | 0 | weakspot: +1 | `p3_flow.js: typeMult` |
| `revealAll` | false | anatomy: true | `p3_flow.js: makeHero`, `p7_draw.js: drawNextWave`, `p8b_ui.js: nextRow`, `renderHero` |
| `arsenal` | 0 | arsenal: +0,2 | `p3_flow.js: typeMult` (z `fl.arsenal4` ze `startWave`) |
| `phobiaK` | 0 | nightmares: +1 | `p3_flow.js: phobiaMult`, `phobiaSight` |
| `oddBodies` | 0 | oddbodies: +1 | `p3_flow.js: makeHero` |
| `traumaK` | 0 | scars: +1 | `p3_flow.js: phobiaMult`, `damage` |
| `badMemories` | 0 | memories: +0,3 | `p3_flow.js: spawnHero` |
| `moreReturn` | 0 | survivors: +0,5 | `p3_flow.js: collectReturners` |
| `returnGreed` | 0 | survivors: +0,2 | `p3_flow.js: greedBonusParts` |
| `calmK` | 1 | dread: ×0,5 | `p5_ai.js: updateHero` |
| `fleeShock` | 0 | screams: +0,1 | `p3_flow.js: startFlee` |
| `isolation` | 0 | isolation: +1 | `p3_flow.js: phobiaMult` |
| `heavyAir` | 0 | heavyair: +0,25 | `p3_flow.js: phobiaMult` |
| `lastGasp` | 0 | lastgasp: +0,2 | `p3_flow.js: kill` |
| `shopDisc` | 0 | broker: +0,25 | `p8b_ui.js: priceOf` |
| `freeReroll` | 0 | luckydraw: +1 | `p8b_ui.js: rerollCost` |
| `sellK` | 1 | pawnshop: ×2 | `p8b_ui.js: sellOf` |
| `stashPlus` | 0 | deepstash: +2 | `p8b_ui.js: stashCap` |
| `patron` | 0 | patron: +1 | `p3_flow.js: proceedToBuild` |
| `stashGreed` | 0 | hoard: +0,1 | `p3_flow.js: greedBonusParts` |
| `greedFlat` | 0 | wager: +0,8; fasting: -0,2 | `p3_flow.js: greedBonusParts` |
| `hungerK` | 1 | wager: ×1,3; fasting: ×0,85 | `p3_flow.js: hungerNeed` |
| `storeK` | 1 | gluttony: ×1,25 | `p3_flow.js: essIn` |
| `heartbeat` | 0 | heartbeat: +0,2 | `p4_traps.js: heartFed`, `trapBoost`, `monDmg` |
| `gilded` | 0 | gilded: +0,05 | `p3_flow.js: greedBonusParts` |
| `goldDust` | 0 | golddust: +0,5 | `p3_flow.js: noticeLoot` |
| `reliquary` | false | reliquary: true | `p3_flow.js: noticeLoot`, `pickup` |
| `pack` | 0 | pack: +0,2 | `p4_traps.js: monDmg` |
| `quickArm` | false | quickarm: true | `p8b_ui.js: tryPlace` |

Mechanika efektów bojowych (kolce, ogień, strach, fobie, skill checki): sekcja 05. Tu ważne są pola ekonomiczne: `regen, greedMult, pickGreed, goldDust, reliquary, greedStart, greedFlat, collector, miser, crystalPts, gilded, stashGreed, returnGreed, glass, depthBonus, soulMult, scareMult, loneMult, lostMult, fearHarvest, income, usurer, bank, granary, hungerK, storeK, shopDisc, freeReroll, sellK, stashPlus, patron, digDiscount, expandCost, buildingCost, mole`.

### 3.10 Karty jednorazowe (instant)

| id | Rzadkość | Efekt (`apply`) |
|---|---|---|
| `crystal` (Żarłoczne serce) | r | `run.crystals += 1; run.maxCrystals += 1` |
| `infusion` (Zastrzyk Esencji) | c | `fl.essence += 20; run.essence = fl.essence` |
| `gift` (Hojny kupiec) | r | `run.freePicks += 2` |
| `pact` (Pakt) | l | `run.deckSize += 1; run.maxCrystals = max(1, max - 1); run.crystals = max(1, min(crystals - 1, maxCrystals))` |

### 3.11 Podpowiedź "pasuje do lochu" (`p8b_ui.js: cardFit`, `CARD_NEEDS`)

Czysto informacyjna (sklep): dla części kart sprawdza, czy w lochu stoi któryś z wymaganych typów, i dopisuje "Pasuje do Twojego lochu." albo "Brak w lochu: ...". Mapa `CARD_NEEDS` (w całości):
```
MON_T  = ['goblin','archer','spider','ogre','shaman','ghost','shade','bats']
LOOT_T = ['loot','lpotion','loot2','loot3','lcursed']
CARD_NEEDS = { spikes: ['spikes'], walls: ['arrows','fire','portrait'], powder: ['powder'], arrows: ['arrows'], gate: ['gate'], web: ['web'],
  fire: ['fire'], mimic: ['mimic'], trapdoor: ['trapdoor'], cage: ['cage'], portrait: ['portrait'], spider: ['spider'], ghost: ['ghost'],
  monster: MON_T, loottrap: LOOT_T, sticky: ['spikes'], wildfire: ['fire','powder','arrows'], choir: ['portrait'], hgallery: ['ghost'],
  firepit: ['trapdoor'], cageghost: ['cage'], monsterroar: MON_T, sharp: ['spikes','arrows','archer','goblin','mimic'], heavy: ['gate','ogre','trapdoor'],
  oil: ['fire','powder'], venom: ['spider','shaman','lcursed'], pack: MON_T, well: ['trapdoor'], golddust: ['loot'], reliquary: ['loot3'], greed: LOOT_T, nopick: LOOT_T }
```

### 3.12 Martwy kod sklepu

Okno `'upgrade'` (`p8b_ui.js: renderUpgrade`, `renderPickSection`, `takeCard`, `renderReplace`, `finishPick`, `pickSub`) nie jest nigdzie kolejkowane od v14 (sklep zastąpił wybór 1 z 3). Zawiera m.in. "Losuj ponownie (symulacja reklamy, raz na falę)" z flagą `fl.rerolled` i ekran "Talia pełna: co sprzedajesz?". Nie portować. W Unity zakup karty przy pełnej talii idzie do schowka (3.5).

---

## 4. Rangi, rekordy i wyniki

### 4.1 Rangi

`data/RANKS.json`: `[[0,'Nora'], [150,'Piwnica'], [400,'Loch'], [1000,'Labirynt'], [2500,'Twierdza grozy'], [6000,'Legenda']]` (próg w Esencji żniwa runu).

```
rankOf(pts): i = ostatni indeks k z pts >= RANKS[k][0]; return { i, name: RANKS[i][1], next: RANKS[i + 1] || null }   // p1_config.js: rankOf
checkThresholds(total):                                   // p3_flow.js: checkThresholds
    while run.rankIdx < rankOf(total).i: run.rankIdx++; jeśli faza 'raid': napis "Nowa ranga: X!" nad sercem
```
Wywoływane co 0,25 s gry (`p6_loop.js: step`, z `run.total + fl.score`) i w `finishWave`. Rangi tylko się ogłasza (od v14.1 nie dają kart). Ranga wpływa też na teksty bohaterów (`p3_flow.js: spawnHero`, sława, sekcja 06). HUD w budowie: "Ranga · następna za N" (`p8b_ui.js: updateHud`). `nextThr` (`p3_flow.js`) jest martwe.

### 4.2 Rekordy

```
loadBest() = int(localStorage['yatd15-best'] || 0)                       // p2_state_map.js
saveBest(v): localStorage['yatd15-best'] = round(v)
loadRecords() = { best: loadBest(), wave: 0, wins: 0, runs: 0 } nadpisane przez JSON localStorage['yatd15-records']   // p8b_ui.js
saveRecords(r): localStorage['yatd15-records'] = JSON(r)
```
`finishWave` aktualizuje `run.best`/`saveBest` po każdej fali. `renderEnd` raz na run (`run.recorded`): `runs++`, `wins++` gdy wynik `'win'`, `best = max(wasBest, round(run.total))`, `wave = max(wave, held)`, gdzie `held` = liczba rekordów w `run.waves` bez `partial` (rozegrane fale, łącznie z tą przegraną, a nie tylko przetrwane).

Tylko prototyp: `localStorage`. W Unity: plik zapisu profilu (sekcja 07) albo PlayerPrefs.

### 4.3 Co pokazują ekrany

- **HUD:** sekcja 08 (sakiewka, "fala +fl.score", równanie z serią w toku albo ostatnią wypłatą przez 1,6 s, pasek ♥).
- **Okno "Skąd Esencja"** (`p8b_ui.js: renderEsencja`, stuknięcie w równanie): tabela wartości `GZ`, części chciwości (`greedBonusParts` + `greedKeep`), opis combo, w fali i po niej rozbicie `dmgPts, fearPts, scarePts (liczba), killPts (liczba), lootPts, crystalPts, lostPts + lonePts, healPts, comboPts`, "Groza razem" `fl.base`, "Średnio na punkt Grozy" `fl.score / fl.base`, "= Esencja z fali" `fl.score`.
- **Podsumowanie fali:** 1.9.
- **Ekran końca** (`p8b_ui.js: renderEnd`): tytuł "Zwycięstwo" / "Run przerwany" / "Loch upadł"; duża liczba `round(run.total)` "Esencji w runie"; powód + "Po wygranej fale bez końca: N"; ranga i następna; "Nowy rekord!" gdy `run.total > poprzedni best`; kafelki: fale (`held`), zabici (suma `stats.kills`), przestraszeni (suma `stats.scared`), zjedzone kryształy (fale z `hunger.ate`); wykres Esencji z fal; 5 najlepszych elementów runu według sumy `pts + passivePts + fearPts` z `w.items`; skład talii; rekordy. "Jeszcze raz" -> `onbStage() <= 4 ? startGuided() : newRun(false)` (od 1.12.1), "Menu".

---

## 5. Etapy nauki 1.12 (wpływ na zawartość i ekonomię)

### 5.1 Mechanika etapów

Stałe: `ONB_FULL = 4`; `data/ONB_STAGES.json` (nazwy i teksty nowości: 1 Podstawy, 2 Strach, 3 Gildia i loch, 4 Pełna gra); `data/ONB_ITEM.json` (od którego etapu element jest dostępny, domyślnie 1); `data/ONB_CARD.json` (od którego etapu karta może wypaść, domyślnie 1).

```
stageOf() = (run && run.stage) || ONB_FULL                                // p3_flow.js
onbOk(t, stg) = (ONB_ITEM[t] || 1) <= (stg || stageOf())                  // p3_flow.js
onbStage(): localStorage['yatd-onb'] jeśli 1..5, inaczej (loadRecords().runs > 0 ? 5 : 1)   // p8b_ui.js; 5 = nauka skończona
setOnb(v): localStorage['yatd-onb'] = v
startGuided():                                                            // p8b_ui.js
    st = min(4, onbStage())
    newRun(st === 1 && !coachDone(), st); run.guided = true               // samouczek tylko w etapie 1 i tylko raz
    if st > 1: queueModal({ type: 'onb' })                                // okno "Nowe: ..." (sekcja 08)
    saveRun('build')
onbDone(r):                                                               // p8b_ui.js, wołane w endRun
    if !r || !r.guided || (r.result === 'quit' && r.wave < 5): return
    cur = onbStage()
    if cur <= 4 && r.stage >= cur: setOnb(min(5, r.stage + 1))
```
Ekran startowy (`p8b_ui.js: renderStart`): gdy `onbStage() <= 4`: "Samouczek"/"Nowy run" (run etapu) i "Pomiń samouczek" (`setOnb(5); newRun(false)`); gdy 5: "Nowy run" (`newRun(false)`, pełna gra) i "Samouczek" (`setOnb(1)`, kasuje flagi trenera, `startGuided()`). Porzucenie zapisanego runu etapu po fali 5 liczy się jako rozegrany (`onbDone` z `result 'quit'`). Run bez `stage` (stary zapis) to pełna gra.

Tylko prototyp: klucze `localStorage`. W Unity: pole w profilu gracza.

### 5.2 Co jest odcięte na danym etapie

| Etap | Elementy dostępne (z `START_UNLOCKED` przez `onbOk`) | Odblokowania w sklepie (`unlock`) | Karty (`ONB_CARD`) | Systemy |
|---|---|---|---|---|
| 1 Podstawy | spikes, trapdoor, arrows, gate, powder, goblin, archer, loot, lpotion, loot2, loot3, lcursed, dig, tunnel, expand, demolish, upgrade, move | web, fire, mimic, cage, spider, ogre, shaman | wszystkie bez wpisu w `ONB_CARD` (i z `req` spełnionym) | głód serca od fali 2, sklep, talia, combo, chciwość |
| 2 Strach | + portrait, eyes, bones | + mirror, creak, coffin, musicbox, ghost, shade, bats | + monsterroar, haunt, echo, panic, harvest, chronicle, dread, screams, lastgasp, cageghost, isolation | jak wyżej |
| 3 Gildia i loch | + crate, rune, altar, decoy, acid, howl, shackles, veil, fortify, r_fog, r_swamp, r_grotto, r_crypt, r_vault, r_haven, r_gears, r_hush, r_ice, od 1.15 k_goblin, k_spider, k_ogre, k_haunt, k_bats, k_ossuary, k_armory, k_forge, k_prison, k_junk, k_gallery, k_nursery (komnata działa, gdy odblokowany jest ktoś z jej rodziny, 05 5.8a) | bez zmian | + heavyair, cheapwalls | specjaliści gildii od fali 3 (`p3_flow.js: guildAdapt`, sekcja 04) |
| 4 Pełna gra | wszystko z `START_UNLOCKED` | wszystkie | + weakspot, anatomy, nightmares, oddbodies, scars, memories, survivors | ciała i fobie (`makeHero`), powracający (`collectReturners`), łowcy skarbów (`makeWave`), wyłom (`planBreach`) |

Zasady dodatkowe:
- Pasek budowy ukrywa elementy, dla których `!onbOk(t)`, i całe zakładki bez żadnego dostępnego elementu (`p8b_ui.js: updateTray`).
- `upgradePicks` filtruje odblokowania przez `onbOk(u.unlock)` i karty przez `ONB_CARD[u.id] <= stageOf()`; karty z `req` odpadają, dopóki wymagany element nie jest odblokowany.
- Gałęzie ekonomii zależne od etapu: Kolekcjoner/Skąpiec/Zła sława działają zawsze; `returnGreed` (Legenda ocalałych) ma sens dopiero na etapie 4, ale sama karta `survivors` też jest od etapu 4. Łowcy skarbów (chciwsi bohaterowie) tylko od etapu 4, więc na etapach 1-3 wysoka chciwość jest "tańsza".
- Samouczek (etap 1, `run.tutorial`): fala 1 ma 2 nowicjuszy (sekcja 04), wyłom wyłączony (`run.tut >= 0`).

---

## 6. Rozbieżności, martwy kod, uwagi dla portu

Błędy i niespójności (do decyzji autora, w Unity zachowaj zachowanie prototypu, chyba że opisano inaczej):
1. **Zapis przy przegranej:** przy 0 kryształach `finishWave` nie zapisuje stanu `'summary'`, więc stary zapis `'build'` sprzed fali przeżywa; zamknięcie aplikacji na oknie `'over'` pozwala powtórzyć przegraną falę (1.11). Zalecenie: zapisać stan przegranej albo wyczyścić zapis.
2. **"Jeszcze raz" w pierwszych runach** (poprawione w 1.12.1): `renderEnd` woła `startGuided()`, gdy `onbStage() <= 4`, a w pełnej grze `newRun(false)`; w 1.12 zawsze `newRun(false)`, czyli pełną grę z pominięciem etapów nauki.
3. **Karta `u-portrait` jest nieosiągalna:** na etapie 1 `onbOk('portrait')` jest fałszem, od etapu 2 portret jest już w `run.unlocked` (z `START_UNLOCKED`).
4. **Wygrana po reklamie w fali 10 niemożliwa:** warunek wygranej sprawdza tylko `run.wave === RUN_WAVES`; kontynuacja po przegranej fali 10 przechodzi do fali 11 bez szansy na `run.won`.
5. **Karty rosnące tracą licznik przy odłożeniu do schowka** (`recomputeMods` kasuje `run.stacks[id]`, gdy karty nie ma w talii), a tekst mówi tylko o sprzedaży ostatniej kopii.
6. **Skarbiec** ignoruje kryształ zjedzony przez głód (liczy tylko `fl.crystalLost` z kradzieży), mimo tekstu "bez utraty kryształu".
7. **Leczenie kapłana:** `healPts` dzieli wyleczone HP (często innych bohaterów) przez `max` HP kapłana, nie leczonego. Niepewne, czy zamierzone: sprawdź `p5_ai.js: heroAbilities`.
8. **`edgePts`** jest zapisywane w jednostkach Grozy (0,5 × pts), a wszystkie inne `*Pts` w Esencji. Tylko statystyka, ale nie sumować go z resztą.
9. **UI gildii pokazuje inną liczbę łowców:** `p8b_ui.js: waveDetails` używa `huntersN(run.greedRep)`, a `makeWave` `huntersN(greedRaw(run.greedRep))`; poza tym wiersz o łowcach pojawia się też na etapach 1-3, gdzie łowców nie ma.
10. **`quitRun` w trakcie fali** nie wypłaca otwartej serii przed doliczeniem `fl.score` do `run.total`.
11. **Post w wielu kopiach** może zepchnąć chciwość poniżej 1, a nawet do zera lub poniżej (2.6). Brak ograniczenia.
12. **Siatka bezpieczeństwa 180 s** wypycha nosiciela kryształu przez `heroExit`, co liczy się jak wyniesienie kryształu. Prawdopodobnie zamierzone, ale warto potwierdzić.
13. **Tekst karty Zastrzyk Esencji** ("nawet ponad pojemność") i komentarz przy `roomCount` ("+3% points for every room over 5") są nieaktualne: limitu sakiewki nie ma, rozległość daje +0,05 chciwości za pokój ponad 5.
14. **Kradzież przy 0 kryształach** jest możliwa (2.9), łącznie z Grozą za "uratowany" kryształ.
15. **Martwy ekran wymiany karty** (`renderReplace`) pokazuje cenę `RAR_SELL` bez `sellK` (Lombard); nie portować (3.12).

Martwy kod i pola bez efektu: `DEFAULTS.essenceCap`, `S.fearRate`, `S.thrBase` (suwaki istnieją, nic ich nie czyta); `S.regenBase` = 0 (mechanizm działa, ale wyłączony); `mods.labyrinth`, `mods.gateDur` (brak karty); `stats.essSoul`, `stats.wavePts` (zawsze 0); `run.thrIdx`, `run.mode`, `fl.endReason`, `fl.rerolled`; `infMult`, `sizeMult`, `cardMultNow`, `loneMult`, `nextThr`; `buyCrystal`/`crystalCost`; okno `'upgrade'` i jego funkcje; gałąź `r = 2` w `upgradePicks`; parametr `resume` w `startBuild`; `run.afterModals` jako mechanizm (wywoływane natychmiast).

Tylko prototyp (z odpowiednikiem w Unity):
- `logWave`, `pushLog`, `downloadRun`, `run.waveDocs`, `fl.tl`, `perfSummary`, pola `perf/cpm/frozen/errors` w `recordWave`: telemetria testów. W Unity: opcjonalnie Unity Analytics z kilkoma zdarzeniami (koniec fali, koniec runu), bez osi czasu.
- Symulacje reklam ("Za reklamę", "Kontynuuj z 1 kryształem"): w Unity reklamy nagradzane (LevelPlay), efekt dopiero po potwierdzeniu nagrody.
- `localStorage` (zapis, rekordy, etap nauki): w Unity plik zapisu/profilu (sekcja 07).
- Suwaki balansu `SLIDERS` (`waveTime, scale, dmg, monDmg, heroHp, earlyHp, heroSpeed, essence, waveIncome, regenBase, fearRate, hungerBase, hungerGrowth, greedW, crystals, deckSize, comboWin, thrBase, depthMax`): w Unity jeden ScriptableObject balansu (bez UI dla gracza); gracz widzi tylko `GAME_SETTINGS` (sekcja 07/08).
- `window.__yatd` (haki testów): w Unity testy EditMode/PlayMode wołające te same metody serwisów.

Zalecana struktura w Unity (propozycja, nie wymóg): `RunState` (pola `run`), `WaveState` (pola `fl` istotne dla ekonomii), `EconomyService` (`AddPts`, `ChainTick`, `PayChain`, `EssIn`, `FeedHeart`, `GreedStart`, `AddGreed`, `Income`), `ShopService` (`UpgradePicks`, `ShopRoll`, `Buy`, `Reroll`, `Sell`, stash), `Mods` jako klasa z polami z 3.9 i metodą `Recompute(deck)`, `OnboardingService` (5.1). Testy jednostkowe warto oprzeć na inwariancie z 2.4 i na tabelach z 2.7 i 3.3.
