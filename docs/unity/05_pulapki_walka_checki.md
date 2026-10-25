# 05. Pułapki, potwory, walka, strach i skill checki

Ta sekcja opisuje wszystko, co dzieje się między elementem lochu (pułapka, potwór, budowla, łup, skrzynia) a bohaterem: kiedy element może odpalić, co robi na każdym poziomie, jak liczone są obrażenia i strach, jak działają typy pokojów i jak gracz steruje tym przez skill checki. Ekonomia (Groza, Chciwość, wypłata serii combo, głód serca) jest w sekcji 03, skład fal, przedmioty bohaterów i łup w sekcji 04, decyzje AI bohaterów i ich kwestie w sekcji 06, mapa, stawianie elementów, pętla `step` i zapis w sekcji 07, a wygląd checku, kamera, dźwięk i przewodnik w sekcji 08. Pełna lista kart: załącznik B. Stan: Prototype 1.26 (zmiany 1.18-1.24 w 5.1.4, 5.3.4, 5.3.9, 5.4.10, 5.9.3, 5.9.4, 5.9.10-5.9.13, 5.10 i 5.13; zmiany 1.26 "Serce zabiera" w 5.14: statusy i reakcje, porażenie, 10 nowych pułapek i 10 potworów, 3. poziom A albo B, Odrodzenie potworów, rodziny i Runy rodów, nowe komnaty, nowe liczby istniejących elementów; w starszych punktach dopisane krótkie odwołania).

Konwencje:
- Źródło każdej reguły: `plik.js: funkcja`. Wszystkie pliki są w `src/` i po sklejeniu tworzą jeden zasięg (IIFE), więc stałe z jednego pliku są widoczne w innych.
- `D = S.dmg = 0,7` (`DEFAULTS.dmg`, suwak balansu, nie ustawienie gracza). Liczby obrażeń podaję jak w kodzie (np. `35 * D`), a obok wartość efektywną przy `D = 0,7`.
- Czas gry: `fl.time` (sekundy symulacji, spowalnia przy checku). Czas rzeczywisty: `realNow` (zegar ekranu, nie zwalnia). Odległości w polach (kafelkach).
- `pw` = moc odpalenia (z checku: graze 0,7, krytyk 1,8; mnożona dalej przez poziom i karty). `cpow` = mnożnik combo dla ran i strachu (punkt 5.2.7).
- Tabele treści są w `data/` (eksport z `p1_config.js`). Nie przepisuję ich; tłumaczę pola. Stałe zdefiniowane poza `p1_config.js` podaję w całości.

---

## 5.1 Model elementu

### 5.1.1 Rodziny elementów (`p1_config.js`)

| Zbiór | Plik danych | Znaczenie |
|---|---|---|
| `TRAPS` | `data/TRAPS.json` | 16 pułapek: spikes, web, trapdoor, cage, arrows, fire, portrait, gate, powder, mimic, eyes, bones, mirror, creak, coffin, musicbox |
| `MONSTERS` | `data/MONSTERS.json` | 8 potworów: goblin, archer, spider, ogre, shaman, ghost, shade, bats |
| `ACTIVE` | (w kodzie) | `TRAPS ∪ MONSTERS`, wszystko, co może odpalić (`fire`) |
| `SCARE` | `data/SCARE.json` | pułapki, które tylko straszą (portrait, eyes, bones, mirror, creak, coffin, musicbox) |
| `CURSED` | `data/CURSED.json` | przeklęte: odczynia je kapłan, nie złodziej ani bomba (portrait, eyes, bones, mirror) |
| `DRIFT` | `data/DRIFT.json` | potwory unoszące się za bohaterami, nie blokują przejścia (ghost, shade, bats) |
| `DISARMABLE` | `data/DISARMABLE.json` | co złodziej rozbraja (mimik i przeklęte nie) |
| `BUILDINGS` | `data/BUILDINGS.json` | budowle-kontry (rune, altar, decoy, acid, veil, fortify, howl, shackles) |
| `LOOKS_TRAP(t)` | funkcja | `TRAPS[t] \|\| t === 'decoy'`: co bohaterowie biorą za pułapkę (wykrywanie, plotki) |
| `LOOT_KIND` | `data/LOOT_KIND.json` | łupy (loot, lpotion, loot2, loot3, lcursed); nie są `ACTIVE`, nigdy nie odpalają |

Od 1.26 (5.14): `TRAPS` 25 (+ pendulum, snare, miasma, oilslick, bolt, flood, bell, falsedoor, tar), `MONSTERS` 18 (+ skeleton, zombie, lich, imp, hound, siren, demon, sapper, warlord, rats), `SCARE` + bell, falsedoor, `CURSED` + bell, `DRIFT` + imp, siren, `DISARMABLE` + pendulum, snare, miasma, oilslick, bolt, flood, falsedoor, tar, `LOOT_KIND` + bait (`'gold'`: Przynęta wygląda jak monety i gryzie przy podnoszeniu, ale nie jest `ACTIVE`), nowy zbiór `FAMILIES` (9 rodzin, `FAMILY_OF[typ]`). Pliki w `data/` są jeszcze z 1.17.1 (załącznik A).

Pola `data/ITEMS.json` używane w tej sekcji:
- `cost`: cena w Esencji (od niej liczy się koszt ulepszenia, punkt 5.1.3).
- `slot`: gdzie stoi (`floor`, `wall`, `door`, `object` = na meblu). Decyduje o `slotRoom` i o obszarze.
- `cd`: bazowe odnowienie w sekundach czasu gry. Dla potworów to odnowienie ich zdolności ze skill checku. `powder` ma `cd: 0` (jednorazowy).
- `hp`: bazowe HP potwora. `melee`: obrażenia na sekundę, które potwór zadaje, gdy ktoś z nim walczy (wręcz).
- `tag`, `desc`, `name`: teksty UI. `desc` opisuje działanie, ale tam, gdzie różni się od kodu, wiąże kod (lista niespójności w 5.11). Od 1.27 `desc` to jedno zdanie (co element robi), a liczby, miejsce, typ obrażeń, odporności i skill check są w nowym polu `more` (drobny druk dymka, sekcja 08, 2.5); obok jest `en: { name, tag, desc, more }`. Teksty przepisano bez zmiany zasad, więc liczby w tej sekcji nadal są z kodu; cytowane w niej dawne opisy mogą się różnić od napisów 1.27.
- `build: true` (skrzynia i budowle): stawiane tylko między falami. `rarity`: łup.

### 5.1.2 Pola obiektu `it` (element na mapie)

Element tworzy `p8b_ui.js: tryPlace` (i `p3_flow.js: seedStartTraps` dla dwóch pułapek startowych):

```
it = { type, x, y,
  cd: (fl.phase === 'raid' && TRAPS[type] && !mods.quickArm) ? ARM_TIME : 0,   // ARM_TIME = 2 (p1_config.js)
  anim: 0, disabled: false,
  hp, max: hp,          // hp = MONSTERS[type] ? ITEMS[type].hp * mods.monster : 0
  power: mods.monster,  // siła potwora (pułapki jej nie używają)
  shot: 0.5,            // zegar strzału łucznika
  flash: 0, preview: 1.4, gx: x + 0.5, gy: y + 0.5,   // gx, gy: pozycja unoszącego się potwora
  lvl: 1, spent: cost }
```

Pola dochodzące w trakcie gry:

| Pole | Ustawia | Znaczenie |
|---|---|---|
| `detected` | `p4_traps.js: learnTrap`, `p3_flow.js: applyRumors` | bohaterowie o niej wiedzą (omijają, mniej się boją) |
| `jamUntil` | `p5_ai.js: finishPrep` (mag) | zakłócona do tej chwili: nie odpala |
| `skipUntil` | `p6_loop.js: skipCheck` | 1,2 s po puszczonym checku nie pyta znowu |
| `skullOff` | `p6_loop.js: skipCheck` | puszczona czaszka: śpi, dopóki jej trafienie by zabiło |
| `memRes`, `memLvl` | `p6_loop.js: resolveCheck` | zapamiętany wynik checku (`'crit'` / `'ok'`) i poziom, do którego należy |
| `uses` | `fireRaw` (krata) | ile razy krata zamknęła się w tej fali |
| `worn` | krata (limit zamknięć), Przeciążenie | wyłączona przez własny limit albo kartę (pamięć zostaje) |
| `bent` | `p4_traps.js: freeCaged` | klatka wygięta po otwarciu |
| `broken` | `p5_ai.js: smashDone` | budowla rozbita toporem |
| `alarmed` | `p4_traps.js: decoyAlarm` | wabik już podniósł alarm |
| `lastFire` | `fireRaw` (tylko `TRAPS`) | czas ostatniego odpalenia (Cisza przed burzą) |
| `playUntil` | pozytywka | gra do tej chwili (tylko rysowanie) |
| `webT` | `monstersTick` (pająk) | zegar oplatania w walce |
| `batTgt`, `batT` | `driftTarget` (nietoperze) | obecny cel roju i czas zmiany |
| `w` | `fireRaw` | statystyki fali: odpalenia, trafienia, Esencja, zabójstwa (karta elementu) |

**Reset między falami** (`p3_flow.js: setupFl`, wywoływane przy każdym wejściu w budowanie):

```
if (it.memRes && !it.worn && (it.disabled || it.broken)) it.memRes = null;   // bohaterowie wyłączyli: zapyta znowu
it.worn = false; it.cd = 0; it.disabled = false; it.bent = false; it.anim = 0; it.sleep = false;
it.detected = false; it.rumored = false; it.uses = 0; it.seenWave = 0; it.preview = 0;
it.noGreed = false; it.cursedKnown = false;
it.jamUntil = 0; it.skipUntil = 0; it.lastFire = null; it.broken = false;
if (MONSTERS[it.type]) { it.hp = it.max; it.gx = it.x + 0.5; it.gy = it.y + 0.5; it.foeT = 0; it.down = false; it.downR = null; it.healGot = 0; }   // 1.26: powalony wstaje
it.alarmed = false; it.ambushUntil = 0; it.quick = false; it.shown = false   // 1.26: alarmed (wabik raz na falę); reszta od 1.18
```

Na starcie fali (`p3_flow.js: startWave`): `it.skullOff = false` dla wszystkich, a potwory w Krypcie dostają `hp = round(max * 1,25)` (punkt 5.8); od 1.26 potwory w pokoju serca przy Strażniku `hp × (1 + mods.warden)`. Do 1.25.1 `alarmed` nie było kasowane (5.11, poprawione w 1.26).

Co ginie na zawsze (usunięte z `fl.items`, które jest tą samą mapą co `run.items`):
- do 1.25.1 potwór zabity w fali (`p4_traps.js: hurtMonster`); od 1.26 tylko potwór tymczasowy (`temp`), a każdy inny jest powalony i wstaje w następnej budowie (5.14.6),
- proch po wybuchu (`fireRaw`, przypadek `powder`), razem z meblem pod nim,
- pułapka rozmontowana przez złodzieja-sapera (`p5_ai.js: updateHero`, `finishPrep`).
Esencja wydana na nie przepada.

### 5.1.3 Poziomy (`p1_config.js`, `p8b_ui.js: upgradeItem`, `upgCost`)

```
UPG_COST = [0, 0, 2, 4]    // mnożnik ceny: poziom 2 kosztuje cost*2, poziom 3 kolejne cost*4
LVL_POW  = [1, 1, 1.6, 2.4]  // moc pułapki (mnoży pw)
LVL_MON  = [1, 1, 1.5, 2.2]  // HP i siła potwora
upgCost(it) = ceil(ITEMS[it.type].cost * UPG_COST[lvl + 1] * (1 - mods.upgDisc))   // 1.26: Kuźnia ciemności
```

- Ulepszać można tylko w budowaniu, tylko `ACTIVE`, do poziomu 3.
- Pułapka: `lvlPow(it) = LVL_POW[lvl]` mnoży `pw` w każdym odpaleniu (`p4_traps.js: lvlPow`). Potwór: `lvlPow = 1`; zamiast tego `max`, `hp` i `power` mnożone przez `LVL_MON[nowy] / LVL_MON[stary]` (max zaokrąglony; od 1.26 też `baseMax` roju szczurów).
- Poziom 3 dodaje cechę (`TRAITS`, tekst w `p1_config.js`; co robi w kodzie: przy każdym elemencie w 5.3 i 5.4). Od 1.26 to wybór: cecha A (dawna, `TRAITS`, `it.branch = 'A'`) albo B (`TRAITS_B`, `it.branch = 'B'`), okno wyboru przy ulepszaniu z poziomu 2 (5.14.3). `t3(it)` = cecha A, `t3B(it)` = cecha B.
- Poziom poszerza strefy checku: `LVL_ZONE = [1, 1, 1,15, 1,3]` (punkt 5.9.4).
- Ulepszenie kasuje pamięć checku (pamięć należy do poziomu, punkt 5.9.7); od 1.26 karta Pamięć serca przenosi zapamiętany wynik na nowy poziom.

---

### 5.1.4 Połączona karta podnosi poziom (1.24, `p4_traps.js: lvlAt, lvlPow`)

Karta z grupy "named" połączona w ★ (sekcja 03, 3.13) daje `mods.fuseLv[typ] = 1`, a moc elementu liczy się jak o poziom wyżej:
```
lvlAt(T, L) = L < T.length ? T[L] : T[last] * (T[last] / T[last - 1]) ^ (L - last)    // za poziomem 3 ostatni krok jeszcze raz
lvlPow(it)  = TRAPS[typ] ? lvlAt(LVL_POW, lvl + f) : (f ? lvlAt(LVL_MON, lvl + f) / LVL_MON[lvl] : 1)   // f = mods.fuseLv[typ] || 0
LVL_POW = [1, 1, 1.6, 2.4], LVL_MON = [1, 1, 1.5, 2.2]
```
Pułapka poziomu 1 z połączoną kartą ma moc 1,6, poziomu 2: 2,4, poziomu 3: 3,6. Cecha 3. poziomu (`t3`) zależy dalej od prawdziwego poziomu.

## 5.2 Wyzwalanie

### 5.2.1 Sloty i pokój elementu

`p7_draw.js: slotRoom(type, x, y)` mówi, do którego pokoju element należy (limit miejsc, combo w Zębatkach, Głusza, chór, alarm wabika):
- `wall`: pokój przed ścianą, `roomOf(x + d[0], y + d[1])` dla pierwszego kierunku z `wallDirs(x, y)` (sąsiedzi 4-kierunkowi będący podłogą),
- `door`: `dd.b >= 0 ? dd.b : dd.a` z `fl.doors`. Drzwi korytarza mają `a` = pokój, `b` = korytarz (`p2_state_map.js: buildMap`), więc **krata i zawiasy należą do korytarza**, nie do pokoju (typy pokojów ich nie dotyczą),
- `floor`, `object`: `roomOf(x, y)`.

`WALL_TRAP = { arrows, fire, portrait, eyes, mirror }` (`p4_traps.js`; od 1.26 też pendulum, bolt): pułapki ścienne (karta Głodne ściany, miejsca rozbrajania).

### 5.2.2 Obszary (`p2_state_map.js: areaOf`, `areaOfRaw`)

Obszar to lista pól, na których bohater zostanie trafiony. `addIf(tx, ty, doorsToo)` dodaje pole podłogi (i drzwi, gdy `doorsToo`).

| Typ | Obszar |
|---|---|
| spikes, gate, trapdoor, cage, decoy | samo pole elementu |
| web | kwadrat 3×3 wokół, z drzwiami |
| arrows, eyes | od każdego kierunku z `wallDirs`: linia `k = 1..11` pól, przerwana na pierwszym polu, które nie jest `walkable` (mebel, budowla, serce, ściana) |
| fire | od każdego kierunku `d`: `k = 1..2` w głąb, `p = -1..1` w poprzek (`px = d[1], py = d[0]`), tylko pola `walkable` (prostokąt 2×3) |
| portrait | `roomTilesNear(x, y, R, pokój przed ścianą)`, `R = lvl >= 3 ? 99 : mods.portraitR` (domyślnie 4, Galeria grozy +2) |
| mirror | jak portret, `R = lvl >= 3 ? 99 : 3` |
| bones | kwadrat `(2R+1)²`, `R = lvl >= 3 ? 2 : 1` (3×3 albo 5×5), z drzwiami |
| creak | pole drzwi oraz pola podłogi z `hypot(dx, dy) <= 2,01` należące do pokoju `dd.a` albo `dd.b` |
| coffin | `roomTilesNear(x, y, 2, roomOf(x, y))` |
| musicbox, shaman, ghost | cały pokój (`roomTilesNear(..., 99, ...)`) |
| powder | kwadrat `(2R+1)²`, `R = mods.powderR + (lvl >= 3 ? 1 : 0)` (`powderR` domyślnie 1), z drzwiami |
| mimic | 8 sąsiadów (`DIRS8`), z drzwiami |
| goblin, ogre, spider | kwadrat 3×3 wokół, z drzwiami |
| archer | `roomTilesNear(x, y, 4, roomOf(x, y))` |
| shade, bats | `roomTilesNear(floor(gx), floor(gy), R, roomOf(x, y))`; cień `R = 3`, nietoperze `R = lvl >= 3 ? 3 : 2` (wokół miejsca, gdzie rój jest teraz, w jego pokoju domowym) |

`roomTilesNear(x, y, R, rid)`: pola podłogi pokoju `rid` z `hypot(tx - x, ty - y) <= R`.

Obszar jest pamiętany (`AREA_MEMO`, klucz: typ, x, y, poziom, `portraitR`, `powderR`, dla `DRIFT` także `floor(gx), floor(gy)`), dopóki nie zmieni się mapa; arrows, eyes i fire liczone są zawsze od nowa (zatrzymują się na tym, co stoi). **tylko prototyp**: w Unity cache obszaru z unieważnianiem po zmianie mapy, obiektów albo kart.

### 5.2.3 Kto jest w zasięgu

```
heroesOn(keys) = alive().filter(h => keys.has(key(h.tx, h.ty)))      // p4_traps.js
alive() = fl.heroes.filter(h => !h.dead && !h.fled && !h.gone)        // p3_flow.js
```

- `h.tx, h.ty` to pole, na którym bohater "jest": docelowe, gdy przeszedł już połowę kroku (`p5_ai.js: heroTile`, `prog >= 0,5`).
- Spadający w zapadnię (`gone`) jest nietykalny. Uciekający (`fleeing`) i uwięziony w klatce są celem.
- `p6_loop.js: heroesInArea(it)`: to samo dla checku, ale duch liczy cały swój pokój (`h.room === roomOf(it.x, it.y)`).

### 5.2.4 Kiedy element może odpalić

Warunek w `p4_traps.js: fireRaw` (każde odpalenie przechodzi tędy):

```
if (!fl || fl.phase !== 'raid' || !ACTIVE[it.type] || it.disabled
    || (it.cd > 0 && !opt.echo) || it.jamUntil > fl.time
    || (MONSTERS[it.type] && it.hp <= 0)) return false;
```

Warunek "chcę odpalić" dla checku i pamięci (`p6_loop.js: checkWanted`):

```
if (!ACTIVE || disabled || cd > 0 || jamUntil > time || skipUntil > time || (potwór && hp <= 0)) return false;
gate:     ktoś stoi na kracie, wchodzi na nią (nx, ny) albo stoi obok niej (Manhattan 1) i ma ją w path[0] (1.24; do 1.23 path[0] lub path[1])
shaman:   inny żywy potwór w jego pokoju ma hp < 0.6 * max
ghost:    ktoś w jego pokoju jest w odległości <= 3 od (gx, gy)
trapdoor: ktoś w obszarze, komu zapadnia jeszcze grozi (!tdSafe(h, it), 1.24, 5.3.4); przy okazji ktoś po limicie upadków
          stojący przy nieznanej zapadni ją widzi (learnTrap(it, 'seen'), stats.tdSeen)
cage:     ktoś w obszarze, kto nie jest w klatce
reszta:   heroesInArea(it).length > 0
```

Nic nie odpala przed otwarciem drzwi fali: `checkTick` działa dopiero od `fl.gateOpen` (`GATE_T = 1,8 s`, `p6_loop.js: step`). Pasywne działania potworów (`monstersTick`) chodzą od początku.

Stany wyłączenia:

| Stan | Skąd | Jak długo | Pamięć checku |
|---|---|---|---|
| `cd > 0` | po odpaleniu, po pudle (5.9.8), `ARM_TIME` | aż `cd` spadnie do 0 (`step` odejmuje `dt`) | zostaje |
| uzbrajanie | postawiona w trakcie fali: `cd = ARM_TIME = 2` (tylko `TRAPS`; potwory gotowe od razu; karta Szybki montaż `mods.quickArm` znosi) | 2 s | - |
| `jamUntil` | mag w przygotowaniu do pokoju: `fl.time + 2 + 0,25 * lvl maga`, wszystkie `TRAPS` z tym `slotRoom` (`p5_ai.js: finishPrep`) | do końca zakłócenia | **kasowana** (`putOut`) |
| `disabled` (rozbrojona) | złodziej (`updateHero`, `finishPrep`), kapłan odczynia przeklęte (`blessJob`, egzorcyzm), bomba (`bombJob`), podważona krata (`partyThink`), rozbity mebel pod nią (`smashDone`), alarm wabika | do końca fali | kasowana |
| `disabled + worn` | krata po ostatnim zamknięciu, Przeciążenie | do końca fali | zostaje |
| `disabled + bent` | klatka po otwarciu (uwolnienie, wyłamanie, wypuszczenie) | do końca fali | kasowana |
| `skipUntil` | puszczony check | 1,2 s | zostaje |
| `skullOff` | puszczona czaszka | dopóki trafienie by zabiło, najdłużej do końca fali | zostaje |
| usunięta | saper, proch po wybuchu, zabity potwór | na zawsze | ginie z elementem |

Przeciążenie (`mods.overload`, karta): po każdym odpaleniu `TRAPS` (nie proch, nie echo, element wciąż na mapie) z szansą `mods.overload` (0,06 za kopię) `disabled = true, worn = true` (`fireRaw`).

### 5.2.5 Skąd przychodzi odpalenie

1. **Skill check** rozstrzygnięty trafieniem: `fire(it, mods.critPw | mods.okPw, { lock })` (`p6_loop.js: resolveCheck`).
2. **Pamięć wyniku**: element z pamięcią, którego trafienie nie zabije, odpala sam z mocą pamięci (`checkTick`).
3. **Przytrzymany palec** (`ff`): wszystko gotowe odpala samo, z pamięcią albo jak graze (`checkTick`).
4. **Echo mechanizmów** (karta): powtórka 0,4 s później (`fireRaw`, `step`).
5. **Chór potępionych** (karta): inne gotowe portrety w pokoju (`fireRaw`).
6. **Alarm wabika**: `fire(o, 1)` dla każdej gotowej pułapki w pokoju (`decoyAlarm`).
7. **Mechanizm samobójczy** (karta): rozbrajana pułapka odpala `fire(it, 1)` (`rigged`).
8. **Wpadka rozbrajania**: złodziej z szansą `R.fail` odpala ją `fire(it, 1)` (gdy `cd <= 0`, nie przeklęta).
9. **Topór barbarzyńcy**: rozbity mebel odpala proch albo mimika na nim `fire(on, 1)` (`smashDone`).
10. **Bomba bohatera** w proch: `fire(it, 0,5)` (`bombJob`).
11. **Przeszukanie mebla** (1.17, rozglądanie się, sekcja 06, 6.3.3a): bohater, który skończył oglądać mebel, na którym stoi mimik, pozytywka albo beczka prochu (wciąż na miejscu, niewyłączony, nierozpoznany, gotowy: `cd <= 0`), odpala go `fire(it, 1)` z szansą `SEARCH_TRAP`: mimik 0,55, pozytywka 0,45, proch 0,2 (`p5_ai.js: lookDone`; `stats.lookTraps`, `tl('lt')`). Dzieje się to na końcu oglądania (1,5-3 s po dojściu), więc gracz ma najpierw własną szansę (skill check, gdy bohater stoi w zasięgu). Mebel ze znaną pułapką nie jest oglądany.

Bez gracza (bez tapnięcia, bez pamięci, bez `ff`) pułapka **nie odpala** (poza punktami 6-11, które wywołują bohaterowie): check, na który nikt nie odpowie, wygasa i element czeka (`skipCheck`). Potwory poza checkiem działają pasywnie (5.4).

### 5.2.6 Przebieg `fire` i `fireRaw` (`p4_traps.js`)

`fire(it, pw, opt)` ustawia `fl.firing = it` na czas wywołania (do "co go zraniło" w opowieściach w karczmie, `feltBy`) i woła `fireRaw`. Kroki `fireRaw`:

1. Warunek z 5.2.4. Zapamiętaj `basePw = pw`, `boost = trapBoost(it)`.
2. Napis "Cisza przed burzą ×N", gdy `calmReady(it)` i to nie echo.
3. `pw *= boost * lvlPow(it) * kindPow(it) * mods.pactPower * skullK(it) * famK(it.type) * omenPow(it)` (od 1.26 Runa rodu `famK` = 1 + 0,08 × poziom rodziny i Krwawy księżyc dla potworów; `kindPow` od 1.15, `skullK` od 1.18). Dla `TRAPS`: `it.lastFire = fl.time`, od 1.26 `fl.fireN++`.
3a. 1.26 Echo serca: pierwsza pułapka (nie proch, nie echo, nie chór) odpalona po nasyceniu serca w tej fali trafia drugi raz do `fl.echoQ` (po 0,4 s, `basePw`), napis "Echo serca!".
4. Echo mechanizmów: dla `TRAPS`, gdy `mods.echoFire` i nie echo ani chór: `fl.trapFires++`; gdy `fl.trapFires % max(2, 6 - mods.echoFire) === 0` i typ nie `powder`, do kolejki `fl.echoQ` trafia `{ it, at: fl.time + 0,4, pw: basePw }`.
5. Combo (5.2.7), zapis `lastTrapAt`, `lastTrapC`, `lastTrapType`, od 1.17 `lastTrapRoom` (`slotRoom` elementu; przerywa rozglądanie się w tym pokoju, sekcja 06), okno `comboWinNow`.
6. `comboMult = 1 + 0,25 * (combo - 1)` (tylko napis nad pułapką), `cpow = 1 + COMBO_POW * (combo - 1)`, `D = S.dmg`. `run.fires++`.
7. Każdy, kto właśnie rozbraja ten element (`h.item === it && state === 'disarm'`), przerywa (kwestia `SAY.disarmHit`, od 1.17 przy przeklętym straszaku kapłan mówi `SAY.blessHit`); od 1.13.4 za drugim razem odpuszcza tę pułapkę (`h.disarmHits`, 6.5.2).
8. `area = areaOf(it)`, `list = heroesOn(keys)`. Z `opt.lock` dochodzą cele zablokowane przez check (żywi, nie `fled`, nie `gone`, **nie uciekający**), bez duplikatów.
9. `fl.surprise = TRAPS[type] && !it.detected` (rana z niewykrytej pułapki straszy ×1,3).
9a. 1.17: dla `TRAPS` (każde odpalenie, przed świadkami) `hearFar(it, list)` (`p5_ai.js`, sekcja 06, 6.3.3a): gdy minęła przerwa `P.soundCd` (10 s), drużyna nie wychodzi, a pokój pułapki nie jest Głuszą, najbliższy spokojny bohater (nie zgubiony, nie panikuje, nie w klatce, nie wychodzi) w odległości <= 12 pól, nie w tym pokoju, nie w Głuszy i nie trafiony tą pułapką, słyszy ją: kwestia `hearScream` z imieniem trafionego albo (szansa 0,65) `hearSound`, on i każdy w jego zasięgu słuchu odwracają się w tę stronę; gdy to przywódca albo przywódca go słyszy, `P.sound` (przez 25 s przyciąga odważnego, chciwego albo zielonego przywódcę i odpycha ostrożnego i tchórza). `stats.heard`, `tl('hs')`.
10. Dla `TRAPS`, jeśli ktoś jest w pokojach obszaru (świadkowie): okrzyk, gdy niewykryta (`pickS(SAY.trap[typ] || SAY.trapGeneric)`, od 1.17 lista kwestii); uczenie się (`p = max(R.learn)` świadków; w Głuszy nikt się nie uczy, `stats.hushUnlearned`; inaczej z szansą `p` `learnTrap(it, 'seen')`, a wtedy od 1.17 z szansą 0,5 ktoś w pokoju mówi `SAY.learn`); licznik zasadzki: gdy wśród trafionych jest przywódca albo ktoś, kto go widzi lub słyszy (od 1.17: grupa przywódcy; wcześniej każdy trafiony, także pokoje dalej), `ambushN++` jeśli od `ambushT` minęło < 3 s, inaczej `ambushN = 1` (co robi zasadzka: 5.7.5). Szczegóły uczenia i kwestie: sekcja 06.
11. `cdBase = cdOf(type) * (Zębatki ? 0,75 : 1)`, gdzie `cdOf(type) = ITEMS[type].cd * mods.cooldown * (WALL_TRAP[type] ? mods.wallCd : 1) * (1 - 0,04 * famLv(type))` (też dla potworów; od 1.26 Runa rodu -4% na poziom). Opis Runy (budowli) mówi o pułapkach odnawiających się 10% szybciej, ale `cdOf` tego nie liczy (5.14.10).
12. Efekt typu (`switch`, punkty 5.3 i 5.4); `hit` = liczba trafionych (szaman: `-1`).
13. Zaprawione mechanizmy: `TRAPS && hit > 0 && mods.tempered` daje `run.stacks.tempered += hit`.
14. Przeciążenie (5.2.4).
15. Gdy wśród trafionych jest nowicjusz (`rank === 0`), z szansą 0,3 weteran (`rank >= 2`) w odległości < 7 rzuca ostrzeżenie.
16. Chór: jeśli zebrano portrety, każdy odpala `fire(o, basePw * k, { choir: true })`, `k = 0,6 + 0,4 * (mods.choir - 1)`.
17. Statystyki elementu `it.w` (`f` odpalenia, `h` trafienia, `p` Esencja, `k` zabici), `bt(type).hits`. Od 1.16.1 `p` to przyrost `fl.prov` w tym odpaleniu (wartość chwilowa jego Grozy); wcześniej był to przyrost `fl.score`, który rośnie tylko przy wypłacie serii, więc na karcie było prawie zawsze 0 (w 4 falach testu `t1161_heart` na 1.16: suma 0). Napis "Combo ×comboMult" gdy `hit > 0` i combo > 1; "pudło" gdy `hit === 0` i nie krata. Zwraca `true`.

`trapBoost(it)` (tylko `TRAPS`, potwory = 1):

```
trapBoost = kataK(it.type) * heartK(it)                            // 1.26: Pamiętnik kata; Puls serca (syte serce, pokój serca) i Ostatni oddech
          * (heartFed() ? 1 + mods.heartbeat : 1)                  // Bijące serce: serce syte w tej fali
          * (calmReady(it) ? 1 + mods.calmStorm : 1)               // Cisza przed burzą: nie odpalała od 20 s albo wcale w tej fali
          * (1 + mods.bloodRite * fl.stats.kills)                  // Krwawy rytuał: +10% za zabójstwo w tej fali
          * (1 + 0.01 * floor(run.stacks.tempered / 4) * mods.tempered)   // Zaprawione mechanizmy
heartFed() = mods.heartbeat && hungerNeed(run.wave) > 0 && fl.fed >= hungerNeed(run.wave)
calmReady(it) = mods.calmStorm > 0 && TRAPS[it.type] && (it.lastFire == null || fl.time - it.lastFire >= 20)
```

Moc `pw` mnoży nie tylko obrażenia i strach, ale też czasy: sieć (`3 * webDur * pw`), klatka (`6 * cageTime * max(1, pw)`), upadek (`fallTime * max(1, pw)`), sieć pająka (`4 * pw`), siła kołysanki (`5 * pw`).

### 5.2.7 Combo (`p4_traps.js: fireRaw`)

```
if (fl.cclock - fl.lastTrapC < (fl.comboWinNow || S.comboWin)) {          // w oknie
  if ((fl.lastTrapType !== it.type || isRt(slotRoom(it), 'gears') || mods.sharedMech) && fl.combo < 7) { fl.combo++; comboOrbs(it.x, it.y); }   // 1.26 Wspólny mechanizm
} else {                                                                   // okno minęło
  if (fl.chain && fl.chain.trap) payChain();   // stara seria wypłacona, zanim zacznie się nowa (sekcja 03)
  fl.combo = 1; comboReset();
}
fl.lastTrapAt = fl.time; fl.lastTrapC = fl.cclock; fl.lastTrapType = it.type;
fl.comboWinNow = S.comboWin * (isRt(slotRoom(it), 'grotto') ? 1.5 : 1);
```

- `S.comboWin = 3 s` (od 1.12.1, suwak balansu). `fl.cclock` rośnie w każdym `step` o `dt`, a w ciszy (`fl.quiet`) o `dt × S.comboQuiet` (0,25) (czas gry, także spowolniony podczas checku: realnie okno trwa wtedy 4 razy dłużej). Szczegóły i historia: sekcja 03, 2.5.
- Liczy się każde `fire` elementu `ACTIVE`, także zdolność potwora i leczenie szamana. Pasywne obrażenia potworów i podpalenie nie ruszają combo.
- Ta sama pułapka (ten sam typ) w oknie nie podbija combo, ale odświeża okno. W Zębatkach podbija (od 1.26 także wszędzie z kartą Wspólny mechanizm). Od 1.26 reakcja dokłada krok combo także dla tej samej pułapki (5.14.2).
- Maksimum 7. `comboNow()` (`p3_flow.js`) zwraca `fl.combo` tylko, gdy okno trwa, inaczej 1.
- **`cpow = 1 + COMBO_POW * (combo - 1)`**, `COMBO_POW = 0,12`: mnoży rany (4. argument `damage`) i większość strachu z pułapek (gdzie dokładnie: tabela w 5.3). Przy combo 7: ×1,72.
- **Mnożnik Esencji**: `addPts` liczy `cm = 1 + 0,25 * (comboNow() - 1)` (do 2,5 przy combo 7), seria bierze największe `cm` i mnoży nim całą swoją Grozę przy wypłacie (sekcja 03). Napis nad pułapką pokazuje ten mnożnik.
- Kulki combo (`comboOrbs`, wartość 0,25 w 3 kulkach) i `comboReset` to tylko widok (sekcja 08).

Zębatki skracają też odnowienie (×0,75), Grota wydłuża okno (×1,5), w obu przypadkach liczy się pokój elementu, który właśnie odpalił.

---

## 5.3 Pułapki

Wspólne dla wszystkich: po odpaleniu `it.cd = cdBase` (krata: inaczej), `it.anim` to czas animacji (tylko widok). Obrażenia przez `damage(h, kwota, it, cpow)` (źródło typu `trap`, punkt 5.6). Strach przez `addFear(h, kwota, atrybut)` (5.7).

### 5.3.1 Tabela zbiorcza

Kwota = wartość przy `pw = 1` (przed checkiem, poziomem i kartami). "×cpow" = combo działa na tę wartość. Stan 1.25.1 dla kolumny "Poziom 3" (to cecha A); od 1.26 każdy element ma też cechę B (5.14.3), a liczby zmienione w 1.26 (krata, lustro, zawiasy, trumna, pozytywka, koszty) są w 5.14.9. Nowe pułapki: 5.14.4.

| Typ | Slot | Typ obrażeń (`DMG_OF`) | Rana | Strach | cd (s) | Obszar | Poziom 3 (cecha) | Kształt checku |
|---|---|---|---|---|---|---|---|---|
| spikes Kolce | floor | pierce | `35*D` = 24,5 ×cpow | z rany | 1,5 | pole | Krwawienie: 3 s ran kłutych (od 1.17.1; wcześniej ogień) | bar |
| web Sieć | floor | - | 0 | 6 (bez pw, bez cpow) | 7 | 3×3 | Kwaśna sieć: +60% zamiast +30% | spiral |
| trapdoor Zapadnia | floor | blunt | `20*D` = 14 ×cpow | 25 przy upadku, 10 przy wyjściu | 8 | pole | Bezdenny szyb: zgubiony, +25 strachu | pulse |
| cage Klatka | floor | - | 0 (ale +50% ran) | `20*cageFear` | 10 | pole | Kolczasta: ×2 ran, ×2 strachu | pulse |
| arrows Strzały | wall | pierce | `25*D` = 17,5 ×cpow | z rany | 3 | linie | Przebijające: bez tarczy i talizmanu | bar |
| fire Ogień | wall | fire | `20*D` = 14 ×cpow + podpalenie 3 s | z rany | 5 | 2×3 | Napalm: podpalenie 6 s | ring |
| portrait Portret | wall | - | 0 | `22*portraitFear` ×cpow | 6 | R 4 w pokoju | Całun grozy: cały pokój | double |
| gate Krata | door | blunt | `60*D*gateCrush` = 42 ×cpow (tylko na polu kraty) | 5 dla najbliższego (≤ 2) | 8 (+4 zamknięcie) | pole | Żelazna: +2 zamknięcia | bar |
| powder Proch | object | fire | `60*D` = 42 ×cpow | z rany | 0 (jednorazowy) | 3×3 (`powderR`) | Ognisty: +1 pole, podpala | fuse |
| mimic Mimik | object | pierce | `40*D*mimicDmg` = 28 ×cpow | z rany | 4 | 8 sąsiadów | Pożeracz: traci przedmiot | bar |
| eyes Oczy | wall | - | 0 | 14 ×cpow (samotny ×2) | 3 | linie | Wszystkowidzące: samotny ×3 | double |
| bones Kości | floor | - | 0 | 20 ×cpow (nowicjusz ×1,5) | 4 | 3×3 | Kostnica: 5×5 | pulse |
| mirror Lustro | wall | - | 0 | `12*(1 + 1,5*fear/courage)` ×cpow | 6 | R 3 w pokoju | Krzywe zwierciadło: cały pokój | ring |
| creak Zawiasy | door | - | 0 | 24 (≤ 1 pole) / 12 ×cpow | 4 | drzwi + 2 pola | Trzask: spowolnienie 2 s | bar |
| coffin Trumna | floor | - | 0 | 36 najbliższy / 14 ×cpow, Krypta ×1,5 | 9 | R 2 | Pogrzebany żywcem: ×1,5 i spowolnienie 3 s | fuse |
| musicbox Pozytywka | object | - | 0 | 6 ×cpow + `5*pw`/s przez 4 s | 9 | pokój | Kołysanka śmierci: 8 s | spiral |

Kolumna cd: `ITEMS.cd`, w kodzie mnożone przez `mods.cooldown`, `mods.wallCd` (ściany) i Zębatki. Wszystkie rany mnoży jeszcze cały `damage` (5.6), a strach cały `addFear` (5.7).

### 5.3.2 Kolce (`spikes`)

```
damage(h, 35 * D * mods.spikeDmg * (1 + 0.04 * (run.stacks.hunger || 0) * mods.hunger) * pw, it, cpow)
lvl >= 3 && !h.dead: h.burnUntil = max(h.burnUntil, fl.time + 3); h.burnBy = 'spikes'   // "Krwawi" (do 1.25.1)
1.26: t3(it) (cecha A): setStatus(h, 'bleed', 3, 'spikes'); t3B(it) (cecha B Zadziory): setStatus(h, 'root', 1, 'spikes')
      Podwójne ostrze (mods.doubleEdge): Unieruchomiony albo Spowolniony dostaje drugi cios 35 * D * spikeDmg * pw * 0,5
```
Od 1.26 krwawienie jest osobnym statusem (`h.bleedUntil`, tyknięcie `6 * S.dmg` = 4,2/s kłute przez `BLEED = { kind: 'bleed' }`, 5.14.1), a nie podpaleniem z `burnBy 'spikes'`; opis niżej dotyczy wersji do 1.25.1.

- Trafia każdego na polu. `trapMult`: ×1,5, gdy bohater stoi (`held`: walka, czekanie, rozmowa, odpoczynek, rozbrajanie, przy sercu, uwalnianie, w klatce, w sieci); Lepkie kolce: ×(1 + `stickySpikes`) w sieci (5.6.2).
- Krwawienie korzysta z mechaniki podpalenia (`burnUntil`, 6·D/s, `BURN`), ale ustawione jest bezpośrednio, bez `ignite`, więc Pożoga go nie przenosi. Od 1.17.1 to rana **kłuta**, nie ogień: `damageRaw` daje `dtp = h.burnBy === 'spikes' ? 'pierce' : 'fire'` (5.6.1, krok 6). Działa więc na nie `CLASS_RES.pierce` (wojownik ×0,75, mag ×1,25, kapłan ×1,1, złodziej ×1), ciało (`PHYS`, np. gruboskóry ×0,7), karta Hartowane ostrza (`dmgType.pierce`), trauma `pierce` i rany w `dmgBy.pierce`; do 1.17 liczyło się jako ogień (złodziej ×1,25, mag ×0,7, barbarzyńca ×1,2, kapłan ×0,85, Olej w szczelinach, trauma i fobia ognia), stąd bohater, któremu "śniły się płomienie" w lochu bez ognia. Kolce z cechą 3. poziomu to też kolce w pokoju Zbrojowni (`t3` przez `inKind`, 5.8a).
- Wygląd: krwawiący ma nad sobą czerwoną kropkę (`#d8434f`/`#ff6b6b`, miga `sin(realNow*12)`), a nie płomień (sekcja 08). Kapłan tamuje krwawienie kwestią `SAY.staunch`, nie `SAY.cleanse` (sekcja 06, 6.5.3). Pamięć bohatera: krwawienie to tagi `spikes` i `blood`, nie `fire` (6.7.10).
- Złodziej może uniknąć (5.6.1). Głodne kolce: zabójstwo kolcami podbija `run.stacks.hunger` (`kill`).

### 5.3.3 Sieć (`web`)

```
dur = 3 * mods.webDur * pw
fl.zones.push({ keys, tiles: area, until: fl.time + dur, src: it })
każdy w list: h.slowUntil = fl.time + dur; lvl >= 3: h.acidWebUntil = h.slowUntil
              Groza addPts(GZ.web * depthMult(h.room), 'dmgPts', h); addFear(h, 6, 'web')
```

- Strefa: kto wejdzie w nią później, dostaje `slowUntil = max(slowUntil, fl.time + 0,15)` co klatkę (`p5_ai.js: updateHero`, `inZone`). Spowolnienie: prędkość ×0,35.
- Spowolniony (`webbed`) dostaje od pułapek ×1,3 (×1,6, gdy trafiła go kwaśna sieć: tylko trafieni bezpośrednio, nie ci, co weszli później).
- Mag rozprasza strefę w promieniu 4 od siebie (5.4.9). Strefa znika po `until`.
- `GZ.web = 0,25` Grozy za każdego trafionego (bez pw).

### 5.3.4 Zapadnia (`trapdoor`) i upadek

```
list.filter(h => !tdSafe(h, it)).forEach(h => {          // 1.24; do 1.23: !h.fellFrom?.has(it)
  damage(h, 20 * D * mods.fallDmg * pw, it, cpow);
  if (!h.dead) fall(h, pw, it);
})
```

**Limit upadków (1.24, `p4_traps.js: tdCap, tdSafe`; autor: "zapadnie są za mocne")**:
```
tdCap(h)      = (h.rank >= 2 || h.lvl >= 12) ? 1 : 2           // elita albo poziom 12+: raz na falę
tdSafe(h, it) = h.fellFrom?.has(it) || (h.tdFalls || 0) >= tdCap(h)
```
`h.tdFalls` liczy upadki bohatera przez dowolne zapadnie w tej fali (w `fall`). Bohater "bezpieczny" nie jest celem zapadni (`fireRaw`), nie liczy się do `heroesInArea` zapadni (więc nie wywoła checku ani czaszki, `p6_loop.js: heroesInArea`) ani do `checkWanted`. Kto przekroczył limit i stanie w obszarze nieznanej, gotowej zapadni, widzi ją: `learnTrap(it, 'seen', h)` (od tej chwili drużyna ją zna i omija jak każdą znaną pułapkę), `stats.tdSeen`. Koszt zapadni od 1.24: 6 Esencji (było 4), więc ulepszenie 12 i 24 (`upgCost`), zwrot przy zdjęciu według `spent`; od 1.26 znowu 4 (ulepszenie 8 i 16), a lądowanie zostawia bohatera Oszołomionego (`setStatus(h, 'dazed', 3)` = Spowolniony 3 s; plan: "Oszołomienie"). Cecha B (Kolce na dnie): rana upadku ×3 i krwawienie 4 s. Opis elementu podaje limit. Karta bohatera: "Zapadnie: n/cap" (gdy spadł albo w lochu jest zapadnia), "(już mu/jej nie grożą)" przy limicie, "(elita albo poz. 12+: spada raz)" przy limicie 1 (sekcja 08).

`fall(h, pw, it)` (`p4_traps.js`):
1. `h.fellFrom.add(it)` (przez tę zapadnię spada raz na falę), od 1.24 `h.tdFalls++`, `learnTrap(it, 'seen')` (zapadnia staje się znana), poziom 3: `h.deepFall = true`; od 1.18 `h.fallRoom`, `h.fallRk` (komnata zapadni, karta Cela pod zapadnią: 5.13).
2. `h.gone = true`, `state = 'fallen'`, `fallUntil = fl.time + mods.fallTime * max(1, pw)` (`fallTime` 5 s, Głęboka zapadnia +4 s), czyszczenie ścieżki, celu, walki.
3. Z kryształem i kartą Bezdenna studnia: kryształ wraca do serca (`crystalReturns`).
4. `addFear(h, 25, 'trapdoor')` (bez pw i cpow). Traci rolę przywódcy i zwiadowcy.

`landFallen(h)` (wołane z `updateHero`, gdy `fl.time >= h.fallUntil`):
1. 30 losowań: losowy pokój (`kind === 'room'`, nie pokój serca), losowe pole `walkable`. Ocena: z kryształem `min(dystans BFS od wejścia, od wyłomu) + rand*2`, bez kryształu `odległość od przywódcy + rand*3`. Wygrywa największa (jak najdalej od wyjścia albo od drużyny). Zapas: `[ent.x, ent.y + 1]`.
2. `h.lost = L && (hdist(h, L) > 6 || Mgła)`. `addFear(h, 10, 'trapdoor')`.
3. Bezdenny szyb: `lost = true`, `addFear(h, 25, 'trapdoor')`.
4. Ognista otchłań (`mods.firepit`): `ignite(h, 'trapdoor', 3 * mods.firepit)`.

### 5.3.5 Klatka (`cage`)

```
list.filter(h => !caged(h)).slice(0, 1)          // jeden, pierwszy w kolejności fl.heroes
  cageHero(h, it, 6 * mods.cageTime * max(1, pw), lvl >= 3 ? 2 : 1)
  Groza addPts(GZ.cage * depthMult(h.room), 'dmgPts', h)    // GZ.cage = 0,45
```

`cageHero(h, it, dur, fearK)`: gdy był w połowie kroku, ląduje na polu docelowym (`prog >= 0,5`) albo zostaje; `state = 'caged'`, `cageUntil = fl.time + dur`, `cageIt = it`; `addFear(h, 20 * mods.cageFear * fearK, 'cage')`; drużyna zdecyduje o ratunku (`p5_ai.js: decideCage`, sekcja 06).

W klatce:
- rany od pułapek ×1,5 (poziom 3: ×2, `trapMult`), rany z innych źródeł (potwory, podpalenie, serce, łup) ×1,5 (`damage`),
- strach maleje o połowę wolniej, nie może zacząć ucieczki (`addFear` pomija `startFlee` dla `caged`),
- Nawiedzone klatki: `mods.cageHaunt` strachu na sekundę (12 za kopię); porzucony albo bez nikogo zdolnego do ratunku: `8 * mods.cageFear` na sekundę (`partyThink`); porzucenie: jednorazowo +15 (`decideCage`).

Koniec (`cageEnds`, gdy `fl.time >= cageUntil`):
- boss wyłamuje kraty: `freeCaged(h, false, 'break')`,
- ktoś idzie na ratunek (`P.rescueId === h.id` i jest ktoś zdolny): czeka do 8 s dłużej,
- inaczej **umiera w klatce**: `hp = 0`, `kill(h, 'trap', 'cage')`; klatka `cd = max(cd, ITEMS.cage.cd * 0,5)` = 5 s (bez kart).

Uwolnienie (`freeCaged`): klatka `disabled + bent` do końca fali; uratowany (`state 'free'` ratownika trwa 0,8 s złodziej, 1,8 s inni) traci 15 strachu, a gdy wciąż `fear >= courage`, zaczyna uciekać.

### 5.3.6 Strzały (`arrows`)

`damage(h, 25 * D * pw, it, cpow)` każdemu w liniach; Płonące groty (`mods.arrowBurn`): `ignite(h, 'arrows')` (3 s). Poziom 3 nie zmienia obrażeń: przebija tarczę wojownika, osłonę tarczą i talizman (`trapMult`, `damage`, `takenK`). Złodziej może uniknąć.

### 5.3.7 Ogień (`fire`) i podpalenie

`damage(h, 20 * D * mods.fireDmg * pw, it, cpow)`, potem `ignite(h, 'fire', lvl >= 3 ? 6 : 3)`.

```
ignite(h, by, dur = 3):
  h.burnUntil = max(h.burnUntil, fl.time + dur); h.burnBy = by
  Pożoga (mods.wildfire): R = 1 + 0.5 * mods.wildfire; każdy żywy w odległości <= R, który nie płonie:
      o.burnUntil = fl.time + dur; o.burnBy = by       // jeden przeskok
```

Podpalenie (`p5_ai.js: updateHero`): `damage(h, 6 * S.dmg * dt, BURN)` (4,2/s). `BURN = { kind: 'burn' }`: typ obrażeń `fire` (od 1.17.1 `pierce`, gdy `burnBy === 'spikes'`: krwawienie, 5.3.2), atrybut = `h.burnBy`, Groza ×1 (`DMG_FACTOR.burn`). Podpalony nie leczy się odpoczynkiem; kapłan gasi (`burnUntil = fl.time`, zamiast leczenia; krwawienie tamuje tak samo). Kto podpala: ogień, proch (poziom 3), strzały (karta), łucznik (poziom 3, zdolność i strzał pasywny), zapadnia (Ognista otchłań); kolce (poziom 3, bezpośrednio) dają tym samym mechanizmem krwawienie, które od 1.17.1 nie jest ogniem (5.3.2).

### 5.3.8 Portret (`portrait`) i Chór

Każdy w obszarze: `addFear(h, 22 * pw * mods.portraitFear * cpow, 'portrait')`. Chór potępionych (`mods.choir`, nie dla odpalenia z chóru): zbiera inne portrety tego samego `slotRoom`, nie wyłączone, `cd <= 0`, nie zakłócone; po efekcie każdy odpala z `basePw * (0,6 + 0,4 * (choir - 1))`. Nawiedzona galeria: patrz duch (5.4.6).

### 5.3.9 Krata (`gate`)

```
shut = 6 * mods.gateDur                     // gateDur zawsze 1 (żadna karta go nie zmienia); od 1.26 6 s (było 4)
it.cd = shut + cdBase                       // odnowienie liczy się od otwarcia
d = fl.doors.get(key(x, y)); d.closedUntil = fl.time + shut; d.wasClosed = true
it.uses++; if (it.uses >= mods.gateUses + (lvl >= 3 ? 2 : 0)) { disabled = true; worn = true }   // gateUses 3, Ciężka krata +2
bohater idący na kratę z prog < 0,5: cofa się (nx = null, prog = 0)
list (tylko pole kraty): damage(h, 60 * D * mods.gateCrush * pw * (t3B ? 2 : 1), it, cpow)   // 1.26 cecha B Gilotyna ×2
gateSplit(it, shut)                         // 1.26 Rozdzielenie: odcięci od przywódcy są samotni 6 s (Gilotyna 8 s)
najbliższy żywy w odległości Manhattan <= 2: kwestia i addFear(near, 5, 'gate')
replanAll(); wstrząs ekranu
```

- 1.26 `gateSplit(it, shut)`: każdy żywy (nie przywódca, nie w zapadni, nie w klatce) w odległości Manhattan ≤ 6 od kraty, który stoi po drugiej stronie drzwi niż przywódca (strona liczona wzdłuż osi przejścia, `doorAlong`), dostaje `h.cutUntil = fl.time + 6` (cecha B: 8), napis "Odcięty!"/"Odcięta!", `stats.gateSplits`, oś czasu `gs`. Do `cutUntil` liczy się jako samotny (`h.alone`, sekcja 06): Groza samotności 0,09/s i 2,5 strachu/s z atrybutem `gate` (fobia ciasnoty).
- Zamknięte drzwi są nieprzechodnie (`passable`). Gdy się otworzą, `step` każe wszystkim przeplanować.
- Brak napisu "pudło" (krata zawsze "trafia" w drogę).
- Złodziej przy zamkniętej kracie, gdy drużyna czeka, podważa ją w 3 s (×1,5 szybciej od poziomu 6): drzwi otwarte, krata `disabled` i wykryta (`p5_ai.js: partyThink`).
- Check pyta (od 1.24, `p6_loop.js: checkWanted`; uzupełnienie 2 do 1.24, decyzja autora), gdy ktoś stoi na polu kraty, właśnie na nie wchodzi (`nx, ny`) albo stoi tuż obok (Manhattan 1) i ma je w `path[0]`; dwa pola dalej krata czeka. Do 1.23 wystarczało pole kraty w dwóch najbliższych krokach ścieżki, więc większość zamknięć tylko odcinała drogę przed drużyną. Czaszka liczy tylko tych na polu kraty. Krata wejściowa fali (`t104_gate`) bez zmian.

### 5.3.10 Proch (`powder`)

```
fl.items.delete(key); fl.objects.delete(key); usuń mebel z run.layout (komórka c.objs)  // na zawsze
list: damage(h, 60 * D * pw, it, cpow); lvl >= 3 && !h.dead: ignite(h, 'powder')
replanAll(); efekty wybuchu, wstrząs 0,35
```

Jednorazowy (element i mebel znikają, w miejscu mebla jest przejście). Nie ma echa ani Przeciążenia. Odpala go też topór barbarzyńcy (rozbity mebel), bomba bohatera (`pw = 0,5`) i od 1.17 bohater przeszukujący mebel przy rozglądaniu się (szansa 0,2, `pw = 1`, 5.2.5). Promień: `mods.powderR` (1, Więcej prochu +1) + poziom 3.

### 5.3.11 Mimik (`mimic`)

`damage(h, 40 * D * mods.mimicDmg * pw, it, cpow)` każdemu z 8 sąsiadów. Poziom 3 (Pożeracz): żywy trafiony traci losowy przedmiot z plecaka (przepada, bez łupu). Nie da się go rozbroić (nie ma w `DISARMABLE`), może go wyłączyć bomba; topór rozbijający mebel odpala go i wyłącza. Od 1.17 budzi go też bohater przeszukujący mebel przy rozglądaniu się (szansa 0,55, `pw = 1`, 5.2.5); nieznany mimik wygląda wtedy jak zwykły mebel, który drużyna ogląda (`lookObj`).

### 5.3.12 Oczy (`eyes`)

`lone = h.alone || h.lost`, `k = lone ? (lvl >= 3 ? 3 : 2) : 1`, `addFear(h, 14 * k * pw * cpow, 'eyes')`. Obszar jak strzały (linia wzroku).

### 5.3.13 Kości (`bones`)

`addFear(h, 20 * (h.rank === 0 ? 1,5 : 1) * pw * cpow, 'bones')`. `rank 0` = nowicjusz (poziomy 1-2, sekcja 04).

### 5.3.14 Lustro (`mirror`)

`k = 1 + 1,5 * clamp(h.fear / h.courage, 0, 1)` (od 1 do 2,5, liczone przed tym strachem), `addFear(h, 12 * k * pw * cpow, 'mirror')`; od 1.26 `16 * k`, a cecha B (Odbicie) daje `h.reflectUntil = fl.time + 8`: następny strach z innego źródła niż lustro ×1,2 (raz).

### 5.3.15 Zawiasy (`creak`)

`close = |h.tx - x| + |h.ty - y| <= 1`; `addFear(h, (close ? 24 : 12) * pw * cpow, 'creak')` (od 1.26 30 / 15); poziom 3 i `close`: `slowUntil = max(slowUntil, fl.time + 2)`. Cecha B (1.26, Skrzyp nocy): żywi w pokojach sąsiadujących z pokojem zawiasów, poza trafionymi, dostają `7,5 * pw` strachu (bez cpow).

### 5.3.16 Trumna (`coffin`)

```
crypt = isRt(roomOf(x, y), 'crypt') ? 1.5 : 1
near = najbliższy z list (hypot od pola trumny)
każdy: addFear(h, (h === near ? 36 * (lvl >= 3 ? 1.5 : 1) : 14) * crypt * pw * cpow, 'coffin')   // od 1.26 50 / 20, cd 7 (było 9), koszt 4 (było 5)
lvl >= 3 i h === near: slowUntil = max(slowUntil, fl.time + 3)
1.26 cecha B (Wieko): setStatus(near, 'root', 2, 'coffin')
```

### 5.3.17 Pozytywka (`musicbox`)

```
dur = lvl >= 3 ? 8 : 4; r = roomOf(x, y); it.playUntil = fl.time + dur
każdy w pokoju: addFear(h, 6 * pw * cpow, 'musicbox'); h.lullUntil = fl.time + dur; h.lullK = 5 * pw; h.lullRoom = r   // od 1.26 12 i 7 * pw, cd 8 (było 9)
1.26 cecha B (Usypianka): każdy trafiony < 60% HP (nie drzemał w tej fali, nie w klatce, nie wychodzi, nie panikuje, nie płonie) zasypia na 3 s (stan 'rest', drzemka ze snem), stats.lullNaps
```

Kołysanka (`p5_ai.js: partyThink`): dopóki `fl.time < lullUntil` i bohater jest w `lullRoom`, `addFear(h, lullK * dt, 'musicbox', 'lull')` (bez cpow). Topór rozbijający mebel wyłącza pozytywkę. Od 1.17 nakręca ją bohater przeszukujący mebel przy rozglądaniu się (szansa 0,45, `pw = 1`, 5.2.5).

### 5.3.18 Obrona bohaterów przed pułapkami (skrót, szczegóły w sekcji 06)

- Złodziej rozbraja `DISARMABLE` (czas `(arrows|fire|powder ? 1,5 : 1,0) * mods.disarm * R.disarm * (Bagno ? 1,5 : 1)`), wpadka `R.fail`, saper `R.sapper` usuwa na zawsze.
- Kapłan (ranga ≥ 1) odczynia `CURSED` za 1 wiarę (`1,5 * R.disarm`, Ołtarz ×2).
- Bomba wyłącza znaną pułapkę na drodze przywódcy (nie krata, nie przeklęte) z odległości ≤ 3.
- Mag w przygotowaniu zakłóca pułapki pokoju (Runa blokuje).
- Wojownik podnosi tarczę przed znanym niebezpieczeństwem.

---

## 5.4 Potwory

### 5.4.1 Wspólne zasady

- HP przy postawieniu: `ITEMS.hp * mods.monster` (Weterani ×1,4 tylko dla nowo stawianych), `power = mods.monster`. Ulepszenie: `LVL_MON`.
- Między falami HP wraca do `max`, pozycja unoszących się do pola domowego (`setupFl`). W Krypcie na starcie fali `hp = round(max * 1,25)` (więcej niż `max`; leczenie szamana i tak tnie do `max`).
- Do 1.25.1 **śmierć była ostateczna** (`hurtMonster`): `hp <= 0` usuwało element z `fl.items` (= `run.items`), ciało (dla nie-`DRIFT`) jako efekt, walczący z nim wracali do marszu, `threatDirty`. Od 1.26 **Odrodzenie** (5.14.6): potwór jest powalony (`down = true`, zostaje na polu), a znika tylko tymczasowy (`temp`).
- Potwór nie jest przeszkodą dla `passable`; bohater, którego następny krok to pole żywego potwora nie-`DRIFT`, wchodzi w stan `fight` z `foe = potwór` (`p5_ai.js: updateHero`). Unoszące się nigdy nie blokują.
- Dwa tryby działania:
  1. **Zdolność** przez `fire` (skill check, pamięć, `ff`): obszar i `cd` jak u pułapek, źródło `actSrc(type) = { kind: 'trap', type }`, więc liczy się jak pułapka (Groza ×1, `trapMult`, talizman, zbroja, strach z rany 25%). Moc: `pw` z checku × `mods.pactPower` (bez `trapBoost`, bez `LVL_POW`), siła przez `it.power`.
  2. **Działanie pasywne** w `monstersTick(dt)` (co krok): walka wręcz, strzały łucznika, leczenie szamana, aury unoszących się. Źródło `src = m` (element), czyli rodzaj `monster`: Groza ×0,4 (`MON_FACTOR`; od 1.26 ×0,8), strach z rany 18% odwagi (zamiast 25%). Od 1.26 tylko ten rodzaj zabójstwa daje Ucztę (sekcja 03, 2.14).

```
monDmg(m) = S.monDmg * m.power * mods.pactPower * (heartFed() ? 1 + mods.heartbeat : 1)
          * (mods.pack && inny żywy potwór w tym samym pokoju ? 1 + mods.pack : 1)      // Stado
1.26: × kataK(typ) × kindPow(m) × skullK(m) × famK(typ) × omenPow(m) × warlordK(m) × heartK(m)
      × (szkielet złożony i Kości niezłomne ? 1,2 : 1) × (demon z Paktem z otchłanią ? 1,2 : 1) × (Strażnik i pokój serca ? 1 + warden : 1)
```

`S.monDmg = 1` (suwak balansu).

### 5.4.2 Walka wręcz (`p4_traps.js: monstersTick`)

```
fighters = bohaterowie nie martwi, nie fled, nie gone, state === 'fight', foe === m
ogr: bije wszystkich walczących; inni: tylko fighters[0]          // 1.26: demon i rój szczurów też biją wszystkich
damage(h, ITEMS[m.type].melee * monDmg(m) * dt * houndK(m, h) * ratsK(m) * (demon ? demonK(m) : 1), m)   // 1.26: Polowanie, urośnięty rój, Pan otchłani
ogr poziom 3: addFear(h, 4 * dt, 'ogre')
1.26: ogar z cechą B podpala walczącego (szansa dt/2 na krok), rój z cechą A zaraża (dt/2)
obrażenia zadane potworowi:
dmgIn = Σ h.T.dps * h.R.dps * (wojownik ? 1.4 : 1) * (paladyn i nieumarły/demon ? 1.5 : 1) * (raging(h) ? 1.5 : 1) * (1 + 0.25 * gearR(h, 'weapon') * itemPow(h)) * dt
hurtMonster(m, dmgIn, fighters[0])                                 // 1.26: trzeci argument "kto" (szkielet, chochlik)
```

`hurtMonster(m, dmg, by)`: od 1.26 chochlik w 50% (odnowienie 2 s) unika trafienia teleportem w swoim pokoju; szkielet z cechą B dostaje ×0,6 od wszystkiego poza magiem; gdy w pokoju jest żywy szaman poziomu 3 (Tarcza ducha, także on sam), `dmg *= 0,7`. Bomba w walce: gdy `g.hp > 60`, walczący z bombą rzuca ją: `hurtMonster(g, 80 * min(4, r)^1,3 * itemPow(h))` (`updateHero`).

Kto rani który potwór:

| Potwór | Wręcz (dowolna klasa) | Bomba w walce | Kula ognia maga | Święte światło kapłana | Egzorcyzm (kapłan ≥ 6 w przygotowaniu) |
|---|---|---|---|---|---|
| goblin, archer, spider, ogre, shaman | tak | tak | tak (3×3) | nie | nie |
| ghost | nie | nie | tak, chyba że Zimny dotyk (`ghostPriestOnly`) | tak | tak |
| shade | nie | nie | nie | tak | tak |
| bats | nie | nie | tak | tak | nie |

Od 1.26: nowe potwory chodzące (szkielet, zombie, licz, ogar, demon, saper, herszt, szczury) jak goblin; chochlik i kusicielka jak nietoperze (unoszą się; chochlik w 50% unika trafienia). Do tego święta aura paladyna (unoszące się w promieniu 1,5: `10 × R.pow`/s), strzał tropiciela (każdy potwór w jego pokoju do 4 pól, unoszący się pierwszy raz ×2) i flaszka alchemika (`60 × R.pow`, sekcja 04, 4.3a). Szczegóły zaklęć: 5.4.9.

### 5.4.3 Goblin (`goblin`)

- Pasywnie: blokuje i bije walczącego: `melee 14 * monDmg` na sekundę (od 1.26 HP 140 zamiast 110 i `melee 16`). Cecha B (Łupieżca): bohater zabity przez niego (w walce albo zdolnością) zostawia dodatkowy stos łupu (2 monety).
- Zdolność (cd 3, kształt swing): `near` = żywi w odległości Czebyszewa ≤ 1; cel = ten, który z nim walczy, albo pierwszy z `near`. `damage(tgt, 35 * D * it.power * pw, actSrc, cpow)` (24,5). Poziom 3 (Podcięcie): żywy cel `slowUntil = max(..., +1,5 s)`.

### 5.4.4 Łucznik (`archer`)

- Pasywnie: `m.shot -= dt`; gdy `<= 0`, cel = najbliższy żywy, którego `roomOf(h.tx, h.ty)` to pokój łucznika i `hypot(h.tx - x, h.ty - y) < 4,01`. Jest cel: `shot = 1,2`, `damage(tgt, 12 * monDmg(m), m)`, poziom 3: `ignite(tgt, 'archer')`. Nie ma celu: `shot = 0,3`. Wręcz słaby: `melee 4`.
- Zdolność (cd 4, swing): każdy w obszarze (R 4) `damage(h, 22 * D * it.power * pw, actSrc, cpow)` (15,4), poziom 3 podpala.
- Wojownik każdej rangi chętnie z nim walczy, nawet ranny (sekcja 06).

### 5.4.5 Pająk, ogr, szaman

**Pająk (`spider`)**: pasywnie `melee 12`; co 3 s walki (`m.webT`): gdy Pajęcze gniazdo (`mods.spiderNest`) albo poziom 3, strefa sieci 3×3 na 3 s; `fighters[0].slowUntil = fl.time + 2,5`. Zdolność (cd 5, spiral): strefa 3×3 na `4 * pw` s, każdy w obszarze `slowUntil = fl.time + 4 * pw` i `damage(h, 30 * D * it.power * pw, actSrc, cpow)` (21). Typ obrażeń trucizna.

**Ogr (`ogre`)**: pasywnie `melee 18` każdemu walczącemu; poziom 3 (Grzmot): +4 strachu/s każdemu walczącemu. Zdolność (cd 6, swing): każdy w 3×3 `damage(h, 45 * D * it.power * pw, actSrc, cpow)` (31,5), poziom 3: `addFear(h, 15 * pw, 'ogre')` (bez cpow). Wstrząs ekranu.

**Szaman (`shaman`)**: pasywnie co krok leczy każdego żywego potwora z `hp < max` w odległości Czebyszewa ≤ 2 (także siebie) o `8 * dt`. `melee 3`. Zdolność (cd 8, swing; check pyta, gdy inny potwór w pokoju ma < 60% HP): każdy żywy potwór w pokoju `hp = min(max, hp + 60 * pw)`; `hit = -1` (bez "pudło"), ale combo rośnie. Poziom 3 (Tarcza ducha): potwory w jego pokoju dostają 30% mniej obrażeń.

Od 1.26 (plan 6.2): koszt 4; leczenie pasywne **się nie sumuje**: potwór bierze je tylko od najsilniejszego szamana w zasięgu (`bestHealer`: najwyższy poziom, przy remisie pierwszy); **limit**: wszystkie szamany razem (pasywnie i zdolnością) leczą potwora najwyżej o jego `max` HP na falę (`m.healGot`, zerowane w `setupFl`); Groza z leczenia `SHAMAN_GZ` 0,02 -> 0,1 za pełne HP. Cecha B (Klątwa): zdolność przeklina każdego bohatera w pokoju szamana na 8 s (`h.hexUntil`): +20% otrzymanych obrażeń, strach opada 2 razy wolniej. Bohaterowie celują najpierw w szamana i licza (sekcja 06, 6.16).

### 5.4.6 Unoszące się (`DRIFT`): duch, cień, nietoperze

Ruch (`driftTarget`, `driftTick`), tylko w pokoju domowym (`roomOf(m.x, m.y)`), pozycja `gx, gy`:

```
DRIFT_SPEED = { ghost: 0.9, shade: 1.1, bats: 2.2 }      // pola na sekundę
cel: tylko żywi z h.room === pokój domowy
  ghost:  najbliższy (do gx, gy)
  shade:  max( (alone||lost ? 100 : 0) + (L && h !== L ? min(12, hdist(h, L)) : 0) - 0.3 * dist )   // samotny albo najdalszy od przywódcy
  bats:   losowy; zmiana co 1,2 + rand s albo gdy cel odpadł/wyszedł z pokoju
brak celu: powrót do (x+0.5, y+0.5) z szybkością min(1, dt) odległości na krok
ruch: krok min(d, speed*dt) w stronę heroPos(cel); bats + (sin(t*9 + x), cos(t*7 + y)) * 0.9 * dt
clamp gx do [R.x0 + 0.3, R.x1 + 0.7], gy do [R.y0 + 0.3, R.y1 + 0.7]
```

Aury (co krok, dla każdego żywego w odległości `dd` od `gx, gy`; obrażenia źródła `monster`):

| Potwór | Strach | Rana |
|---|---|---|
| ghost | `dd <= (lvl3 ? 2,6 : 1,6)`: `10 * dt * mods.ghostAura * galleryK` (od 1.26 `12 * dt`) | `dd <= 0,8`: `5 * monDmg * dt` |
| shade | `dd <= 1,4`: `7 * dt * (alone/lost ? 2 : 1)` | - |
| bats | `dd <= (lvl3 ? 1,6 : 1,0)`: `4 * dt` | `3 * monDmg * dt` (kłute) |

`galleryK(g) = (mods.hauntedGallery && fl.portraitRooms.has(roomOf(g.x, g.y))) ? 1 + mods.hauntedGallery : 1` (Nawiedzona galeria; `fl.portraitRooms` = pokoje z niewyłączonym portretem, przeliczane co krok, gdy karta jest w talii).

Od 1.26: `DRIFT_SPEED` + `imp: 1.8, siren: 0.8`; aury chochlika (`dd <= 1,6`: 4 strachu/s) i kusicielki (`dd <= 2`: 5/s); każdy unoszący się wybiera najpierw Naznaczonego w swoim pokoju; duch z cechą B (Nawiedzenie) bierze cele do 7 pól także spoza pokoju i nie jest przycinany do granic pokoju.

Zdolności (liczby 1.25.1; zmiany 1.26: duch 40 -> 50, cień 30 -> 40, nietoperze 16 -> 20 i koszt 3, cechy B w 5.14.3):
- **Duch** (cd 7, double; check pyta, gdy ktoś w pokoju jest ≤ 3 od ducha; obszar = cały pokój): każdy w pokoju `addFear(h, 40 * pw * ghostAura * galleryK * cpow, 'ghost')` i `damage(h, 5 * D * pw, actSrc, cpow)` (bez `it.power`). Zimny dotyk: `ghostAura ×1,5`. Poziom 3 (Wycie): większy zasięg aury.
- **Cień** (cd 8, double): `tgt` = najwyższy wynik `(alone||lost ? 100 : 0) - hypot(do gx, gy)`; każdy w obszarze `addFear(h, (h === tgt ? 30 : 10) * (alone||lost ? 2 : 1) * pw * cpow, 'shade')`. Poziom 3 (Pożeracz światła): gdy `tgt.alone && !tgt.lost` i nie jest przywódcą, `getLost(tgt, 'shade')`. Rani go tylko kapłan.
- **Nietoperze** (cd 6, swing): każdy w obszarze `addFear(h, 16 * pw * cpow, 'bats')`, `damage(h, 6 * D * pw, actSrc, cpow)` (bez `it.power`); jeśli żywy, nie ucieka, nie niesie kryształu, nie w klatce, nie przywódca, z szansą `(rank 0 ? 0,6 : 0,35) * (lvl3 ? 1,3 : 1)`: `panicUntil = fl.time + 2,5` (spłoszony, biegnie na oślep, sekcja 06).

### 5.4.7 Tabela zbiorcza potworów

Dane bazowe: `data/ITEMS.json` (`hp`, `melee`, `cd`, `cost`).

| Typ | HP | Wręcz /s | Zdolność (pw = 1) | Obszar zdolności | Pasywnie | Poziom 3 | Kształt |
|---|---|---|---|---|---|---|---|
| goblin | 110 (1.26: 140) | 14 (1.26: 16) | `35*D*power` jednemu | Czebyszew 1 | blokuje, bije | spowolnienie 1,5 s | swing |
| archer | 50 | 4 | `22*D*power` każdemu | R 4 | strzał `12*monDmg` co 1,2 s, R < 4,01 | podpala | swing |
| spider | 90 | 12 | `30*D*power` + sieć `4*pw` s | 3×3 | co 3 s walki spowalnia walczącego 2,5 s | sieć 3×3 przy ugryzieniu | spiral |
| ogre | 240 | 18 (wszystkim) | `45*D*power` | 3×3 | bije wszystkich walczących | +15·pw strachu i +4/s w walce | swing |
| shaman | 60 | 3 | +`60*pw` HP potworom w pokoju | pokój | +8 HP/s potworom w R 2 | -30% obrażeń potworów w pokoju | swing |
| ghost | 60 | 5 (nieużywane) | strach `40` + rana `5*D` | pokój | aura strachu i dotyk | aura R 2,6 | double |
| shade | 50 | 0 | strach 30 / 10, samotni ×2 | R 3 wokół | szept 7/s | gubi samotnego | double |
| bats | 40 | 0 | strach 16 + rana `6*D` + spłoszenie | R 2 (3) wokół | gryzą 4 strachu/s i `3*monDmg`/s | R 3, spłoszenie ×1,3, aura R 1,6 | swing |

`melee` ducha (5) nie jest używane: nikt nie walczy z unoszącymi się wręcz. Kolumna "Poziom 3" to cecha A; nowe potwory 1.26 i cechy B: 5.14.5 i 5.14.3.

### 5.4.8 Inne interakcje potworów

- Krypta: +25% HP na falę. Zębatki: odnowienie zdolności ×0,75 (bo `cdOf` dotyczy też potworów, tak samo karty Szybkie przeładowanie i Przeciążenie).
- `rebuildThreat` (ocena niebezpieczeństwa dla ścieżek, sekcja 06): znany potwór nie-`DRIFT` waży 2 na swoim obszarze (łucznik 1), unoszący się 1,5 w promieniu 1,5 od `gx, gy`.
- Wojownik szuka walki: nowicjusz z każdym, weteran z łucznikiem zawsze, z innym (nie ogrem) przy HP > 60% (sekcja 06). Pozostali dołączają, gdy przywódca walczy.

### 5.4.9 Zaklęcia bohaterów przeciw potworom (`p5_ai.js: heroAbilities`, `finishPrep`)

- **Kula ognia maga**: co 4 s (`h.cast`; bez celu sprawdza znowu po 0,5 s). Cel: najbliższy żywy potwór w pokoju maga, odległość < 4,5 (dla `DRIFT` liczona do `gx, gy`), z pominięciem cienia i ducha przy Zimnym dotyku. `DRIFT`: `hurtMonster(cel, 30 * R.pow)`; dodatkowo każdy potwór nie-`DRIFT` w 3×3 wokół punktu celu dostaje `30 * R.pow`. (`R.pow = 1,08^(L-1)`.)
- **Rozproszenie maga**: co 8 s (`dispelCd`), gdy jakiś bohater w odległości ≤ 4 stoi w strefie sieci: strefa znika, każdy w niej traci spowolnienie.
- **Święte światło kapłana**: kapłan rozgląda się co 1 s (`h.cast`); gdy w odległości ≤ 3 jest żywy `DRIFT` i kapłan właśnie się modlił albo ma wiarę > 0, wszystkie takie potwory dostają `25 * R.pow * (Ołtarz ? 0,5 : 1)`, a kapłan odpoczywa 3 s. Bez kosztu wiary. Zdjęcie klątwy z przyjaciela w tym samym obrocie wyklucza światło.
- **Egzorcyzm** (przygotowanie przed groźnym pokojem, kapłan poziomu ≥ 6, sekcja 06): duchy i cienie w pokoju `40 * R.pow * (Ołtarz ? 0,5 : 1)`.

---

## 5.5 Łupy-pułapki, budowle i skrzynia

### 5.5.1 Łup, który rani

- **Zatruty łup** (`mods.lootTrap`, +15 za kopię): przy podniesieniu `damage(h, mods.lootTrap * r, LOOTTRAP)` (`p3_flow.js: pickup`), `r` = rzadkość łupu. `LOOTTRAP = { kind: 'loot' }`: typ trucizna (`DMG_OF.loot`), Groza ×1, **bez strachu z rany**, bez `trapMult` i talizmanu.
- **Przeklęty skarb** (`lcursed`, sekcja 04): `curse(h)` daje `h.cursed = true`: wszystkie obrażenia ×1,3 (poza sercem), spadek strachu ×0,5, +2 strachu/s (`'curse'`), przedmioty `itemPow ×0,5`, odnowienie mocy ×1,5. Kapłan od poziomu 4 zdejmuje klątwę za 3 wiary.

### 5.5.2 Budowle (`BUILDINGS`, efekty przez `inB(typ, pokój)`)

Budowla stoi tylko między falami, jedna danego typu na pokój, na podłodze pokoju (nie przy drzwiach ani sercu, pokój musi zostać spójny) i blokuje przejście jak skrzynia (`blockerAt`). Zajmuje miejsce w pokoju (`SLOTTED`). Zbiory pokojów liczone na starcie fali (`computeBRooms`, rozbite pomijane). Barbarzyńca rozbija je toporem (`broken`, do końca fali nie działa i nie blokuje).

| Budowla | Efekt w kodzie |
|---|---|
| rune Runa | mag nie zakłóci pułapek w tym pokoju (czar przepada, `jamCd` 12 s) i nie wyczuje ich przy wejściu; od 1.26 pułapki w pokoju odnawiają się 10% szybciej (`cdBase × 0,9`) |
| altar Ołtarz | kapłan o połowę słabszy: leczenie, bariera, święte światło, egzorcyzm, osłona przed pokojem (tarcza i odwaga), uspokajanie obok (`fearResist` ×0,875 zamiast ×0,75), odczynianie trwa 2 razy dłużej, amulet zdejmuje połowę strachu i tłumi go 2 s zamiast 4; od 1.26 strach w pokoju ×1,1 |
| decoy Wabik | wygląda jak pułapka (`LOOKS_TRAP`, obszar = pole), złodziej woli go rozbroić (koszt ścieżki -4); rozbrojenie albo topór: `decoyAlarm` |
| acid Kwas | tarcza wojownika i osłona tarczą działają jak `(1 + k) / 2`, talizman `wardK * 0,5`, zbroja połowa redukcji, tarcza kapłana (`h.shield`) pochłania połowę rany; od 1.26 obrażenia od pułapek i potworów w pokoju ×1,1 |
| veil Zasłona | uciekinierzy nie zapamiętują pokoju, pułapek ani łupu w nim (plotki, sekcja 03); doświadczony mag nie wyczuwa pułapek tego pokoju przy wejściu; od 1.26 +0,15 do szansy zgubienia w pokoju, a jego pułapek nie słychać zza ściany |
| fortify Bastion | gildia nie przebije tu wyłomu (sekcja 03) |
| howl Kamień wyjec | pieśń i wołanie barda nie działają; zgubiony nie trafi tu do drużyny po głosie; od 1.17 połyka krzyki z daleka (`canHearShout`: kto stoi w tym pokoju, nie słyszy krzyku spoza zasięgu zwykłego głosu i nikt nie słyszy z daleka jego krzyku; sekcja 06, 6.3.13); od 1.26 strach w pokoju ×1,1 |
| shackles Okowy | nikt nie wpada w furię (`startRage` zwraca false, `raging` false); nikt nie rozbija mebli ani budowli; od 1.26 spowolnienie i unieruchomienie nałożone w pokoju +1 s |

Od 1.26 budowle kosztują mniej (runa i ołtarz 10, wabik i zasłona 6, kwas, wyjec, okowy, bastion 8), a opisy obiecują dodatki z planu (runa: pułapki w pokoju odnawiają się 10% szybciej; ołtarz: strach w pokoju +10%; kwas: obrażenia w pokoju +10%; zasłona: łatwiej się zgubić i pułapek nie słychać zza ścian; wyjec: strach +10%; okowy: unieruchomienie i spowolnienie +1 s; wabik: alarm raz na falę). Wszystkie są w kodzie (`inB(typ, pokój)`, po przeglądzie 1.26): Runa: `cdBase × 0,9` dla pułapek, których pokój (`slotRoom`) ma Runę; Ołtarz i Kamień wyjec: w `addFear` `amt × 1,1` za każdy z nich w pokoju bohatera; Kwas: w `damage` `amt × 1,1` dla źródeł `trap` i `monster` w pokoju bohatera; Zasłona: +0,15 do szansy zgubienia w jej pokoju (`p5_ai.js`, obok Mgły) i pułapek z jej pokoju nie słychać zza ściany (jak w Głuszy); Okowy: `setStatus` dodaje 1 s do spowolnienia i unieruchomienia nałożonych w pokoju z Okowami; Wabik: `alarmed` kasowane w `setupFl`, więc alarm raz na falę.

`decoyAlarm(it, by)`: raz (`alarmed`; od 1.26 raz na falę), wabik `disabled`; każda `TRAPS` z tym samym `slotRoom`, nie wyłączona, `cd <= 0`, odpala `fire(o, 1)` (bez checku, pełna moc 1, nawet gdy nikogo nie ma w obszarze); wstrząs, kwestia.

### 5.5.3 Skrzynia (`crate`)

Stawiana tylko w budowaniu (`p7_draw.js: crateOk`): podłoga pokoju, nie przy drzwiach ani sercu, pokój spójny. Zapis w układzie lochu jako mebel `[x, y, 'crate', 1]` (`tryPlace`), więc po przebudowie mapy jest obiektem: blokuje przejście (`walkable` false), zatrzymuje strzały, ogień i wzrok oczu, daje slot `object` dla prochu, mimika i pozytywki. Barbarzyńca rozbija skrzynie, beczki i półki (`SMASHABLE_OBJ`, nie posągi): mebel znika do końca fali (z układu lochu nie, wróci w następnej), element na nim odpala (proch, mimik) i jest wyłączony. Wybuch prochu usuwa mebel na zawsze. Szczegóły stawiania i zwrotu: sekcja 07.

---

## 5.6 Obrażenia: `damage(h, amt, src, comboMult)` (`p3_flow.js`)

### 5.6.1 Kolejność

Czwarty argument to w praktyce `cpow` (mnożnik combo dla ran), nie mnożnik Esencji.

Od 1.17.1 `damage` to opakowanie: `now = hurtTags(h, src)` (podpalenie: `BURN_TAGS[h.burnBy] || ['fire']`, czyli `spikes` -> `['spikes', 'blood']`, `arrows` -> `['arrows', 'fire']`, `powder` -> `['blast', 'fire']`, `fire` -> `['fire']`, `archer` -> `['archer', 'monster', 'fire']`, `trapdoor` -> `['trapdoor', 'fire']`; pułapka albo potwór: `itemTags(src, true)`; inne źródła: `null`). Gdy `now` jest: `sawAdd(h, now)`, przy podpaleniu też `sawNear(h, now)` (widzą go inni), a cała reszta (`damageRaw`, kroki niżej, łącznie ze śmiercią, traumą i fobią) idzie w `sayNow(now, ...)`, więc każda kwestia wywołana raną musi dotyczyć tego, co zraniło (sekcja 06, 6.7.10). Bez `now` od razu `damageRaw`.

```
0. if (h.dead || h.fled || amt <= 0 || fl.ending !== null) return
1. kind = srcKind(src)          // src.kind ('trap' actSrc, 'loot', 'burn', 'heart') | TRAPS → 'trap' | MONSTERS → 'monster' | 'other'
2. amt *= comboMult || 1        // cpow
3. tkey = kind === 'trap' && src.type ? src.type : null
4. if (tkey) {
     a) UNIK: h.type === 'thief' && (tkey === 'spikes' || tkey === 'arrows') && !held(h)
              && fl.time > h.dodgeCd && rand < h.R.dodge  →  h.dodgeCd = fl.time + 3; return   // brak rany i strachu
     b) TALIZMAN: fl.time < h.wardUntil && !(tkey === 'arrows' && src.lvl >= 3):
              amt *= 1 - h.wardK * (Kwas ? 0.5 : 1); if (amt <= 0.5) return
     c) amt *= trapMult(h, tkey, src)
     d) ZBROJA: ar = gearR(h, 'armor'); if (ar) amt *= 1 - (1 - 0.92^(ar * itemPow(h))) * (Kwas ? 0.5 : 1)
   } else if (caged(h)) amt *= 1.5
5. if (h.cursed && kind !== 'heart') amt *= 1.3
   1.26: if (fl.time < h.hexUntil && kind !== 'heart') amt *= 1.2             // Klątwa szamana (cecha B)
6. dtp = kind === 'burn' ? (h.burnBy === 'spikes' ? 'pierce' : 'fire')      // 1.17.1: krwawienie z kolców to rana kłuta
       : kind === 'bleed' ? 'pierce' : kind === 'poison' ? 'poison' : kind === 'react' ? src.dtp   // 1.26: tyknięcia statusów, reakcje
       : kind === 'heart' ? null : DMG_OF[tkey || src.type || (kind === 'loot' ? 'loot' : '')]
   if (dtp) { tk = typeMult(h, dtp); amt *= tk; if (tk !== 1) revealPhys(h, dtp) }
   1.26: dtp === 'pierce' && mods.tarSulfur && Oblany: amt *= 1 + tarSulfur      // Smoła i siarka
         dtp === 'shock': ar = gearR(h, 'armor'); if (ar) amt *= 1 + 0.05 * ar   // zbroja przyciąga piorun
         dtp in {fire, shock}: amt = reactHit(h, amt, dtp, kind, src); if (h.dead) return   // Pożar, Detonacja, Porażenie, woda gasi ogień (5.14.2)
7. attr = tkey || (monster ? src.type : burn ? (h.burnBy || 'fire') : loot ? 'loot' : null)
8. real = min(h.hp + h.shield, amt)
   rest = amt; if (h.shield > 0) { ab = min(h.shield, rest * (Kwas ? 0.5 : 1)); h.shield -= ab; rest -= ab }
   h.hp -= rest; błysk h.flash = 0.12 (od 1.26 nie przy tyknięciach burn, bleed, poison)
9. 1.17.1: h.hp < 0.4 max i nie serce -> sawNear(h, ['blood']) (on i ci, którzy go widzą, 6.7.10);
   inni w odległości Manhattan <= 5 odwracają się; h.playerDmg += real * (monster ? MON_FACTOR : 1) (bez serca);
   feltBy(h, real / h.max); statystyki bt(attr); kind === 'trap': morale = max(0.15, morale - 0.03)
10. if (h.hp <= 0) { h.hp = 0; h.dead = true; kill(h, kind, attr); return }   // śmiertelna rana nie daje Grozy za ranę, tylko za śmierć
11. reakcja przyjaciela (trap, real >= 0.25 max, raz na 5 s); barbarzyńca: real >= 0.2 max i nie serce → furia
12. Bohater z przepowiedni (boss 'final') pierwszy raz < 50% HP: hp += 20% max, tarcza = max(tarcza, 20% max),
    każdy inny żywy: fear = max(0, fear - 0.2 * jego courage)
13. TRAUMA: dtp && real > 0: h.dmgBy[dtp] += real;
       próg tl0 = mods.traumaK ? 0.5 : 0.35
       if (!h.trauma[dtp] && h.hp < tl0 * max && h.hp + real >= tl0 * max) h.trauma[dtp] = true   // przekroczył próg tą raną
14. GROZA (1.12.1: gmax = h.max / h.hpK, HP bez dodatku comboHp): pts = real / gmax * GZ.dmg * DMG_FACTOR[kind] * depthMult(h.room) * lootMult(h)
       NA SKRAJU: if (pts > 0 && h.hp < 0.3 * max && kind in {trap, loot, burn}) pts *= 1.5   // "Na skraju!"
       if (pts > 0) addPts(pts, null, h)
15. STRACH Z RANY (nie serce, nie łup):
       addFear(h, real / gmax * h.courage * (monster ? 0.18 * (1 + mods.monsterFear) : 0.25)
                  * (fl.surprise && kind === 'trap' ? 1.3 : 1),
               attr, monster && mods.monsterFear ? 'roar' : 'dmg', dtp)
16. kwestia bólu (trap, real >= 8, szansa 0,35); trap i żywy z hp < 0.6 max: useCharm(h, 'hit')
```

Stałe: `GZ.dmg = 1,5` (Groza za całe HP), `DMG_FACTOR = { trap: 1, loot: 1, burn: 1, monster: 0,4, heart: 0, other: 0 }` (od 1.26 `monster: 0,8` i nowe `bleed: 1, poison: 1, react: 1`), `lootMult(h) = 1 + 0,25 * min(4, h.inv.length)` (`p6_loop.js`), `depthMult` w sekcji 03. Strach z rany: utrata całego HP = 25% odwagi (potwory 18%, Ryk potworów ×(1 + 1,5 za kopię)).

### 5.6.2 `trapMult(h, type, src)` (`p3_flow.js`)

```
pierce = type === 'arrows' && src && src.lvl >= 3
sh(k)  = Kwas w pokoju ? (1 + k) / 2 : k
holdK = rooted(h) ? (type in {spikes, pendulum} ? 1 : 1.15) : 1                // 1.26 Unieruchomiony
slowK = webbed(h) ? (fl.time < h.acidWebUntil ? 1.6 : 1.3) : 1
trapMult = (type in {spikes, pendulum} && held(h) ? 1.5 : 1)                     // 1.26: wahadło jak kolce
         * (caged(h) ? (h.cageIt && h.cageIt.lvl >= 3 ? 2 : 1.5) : 1)
         * max(holdK, slowK)                                                       // 1.26: nie sumują się, liczy się wyższy (do 1.25.1 samo slowK)
         * (type === 'spikes' && mods.stickySpikes && webbed(h) ? 1 + mods.stickySpikes : 1)
         * (pierce ? 1 : (h.type === 'warrior' && fl.time < h.shieldUpUntil ? sh(h.R.shield) : 1) * sh(shieldCover(h)))
held(h)   = rooted(h) || state in {fight, wait, talk, rest, disarm, boss, free, loot} || caged(h) || webbed(h)   // 1.26: rooted; 1.20: loot
webbed(h) = fl.time < h.slowUntil        // każde spowolnienie, nie tylko sieć (5.11)
shieldCover(h) = min po wojownikach o != h z podniesioną tarczą w odległości <= 1,8: (1 + o.R.shield) / 2
```

Tarcza wojownika: `R.shield = 0,5 * 0,94^(L-1)` (poziom 1: połowa rany). Podnosi ją na 2,5 s przed polem o `danger > 1` (odnowienie `R.shieldCd`), na 5 s w przygotowaniu (sekcja 06).

### 5.6.3 `typeMult(h, dtp)` (`p3_flow.js`)

```
k = CLASS_RES[h.type][dtp] || 1
P = PHYS[h.phys]; if (P && P.res[dtp]) k *= P.res[dtp] > 1 ? 1 + (P.res[dtp] - 1) * (1 + mods.weakK) : P.res[dtp]   // Słabe punkty wzmacniają tylko słabości
return k * (mods.dmgType[dtp] || 1) * (mods.arsenal && fl.arsenal4 ? 1 + mods.arsenal : 1)   // porażenie (1.26) nie ma pola w dmgType
```

- `data/CLASS_RES.json`: mnożnik według klasy i typu; brak wpisu = 1. `data/PHYS.json`: ciało bohatera (`res` per typ, `text` dla UI). `data/DMG_OF.json`: typ obrażeń źródła (bez wpisu: brak typu, np. duch). `data/DMG_TYPES.json`: polskie nazwy typów.
- `fl.arsenal4` = na starcie fali w lochu są elementy `ACTIVE` co najmniej 4 różnych typów (`startWave`, Pełen arsenał); od 1.26 typów jest 5 (porażenie), więc wystarczą 4 z 5.
- `revealPhys`: pierwszy raz, gdy ciało (`PHYS`) zmienia ranę danego typu, cecha staje się jawna (kwestia, napis "Słabość/Odporność").
- `typeMult` działa też na rany pasywne potworów (np. goblin wręcz = kłute) i podpalenie (ogień; krwawienie z kolców od 1.17.1 kłute).

### 5.6.4 Śmierć: `kill(h, kind, attr)` (`p3_flow.js`)

1. `acc = 0`, statystyki (`killsHeart`, `killsMon`, reszta `killsTrap`), `bt(attr).kills++` (zasługa: typ pułapki, potwora, `burnBy` dla podpalenia, `'cage'` dla śmierci w klatce).
2. Groza: `addPts(GZ.kill * (h.boss ? 2 : 1) * mods.soulMult * (Krypta ? 1,5 : 1), 'killPts', h)`, `GZ.kill = 1,2`; od 1.26 też ×1,5 za kultystę i ×`omenK('killK')` (Krwawy księżyc 1,5). Kultysta oddaje sercu połowę wypitego.
3. Spichlerz dusz (`run.stacks.granary++`, od 1.26 najwyżej 40), Głodne kolce (`attr === 'spikes'`). Od 1.26 także: Krwawa łaźnia (śmierć w pokoju serca: `fl.bathK × 1,1` za kopię, najwyżej 2), Kolekcja czaszek (`stacks.skulls`, najwyżej 20), Pamiętnik kata (`run.kata[typ zabójcy] += 0,02`, najwyżej 0,3), Uczta (`kind === 'monster'`, sekcja 03, 2.14) i `killHooks` (5.14.7).
4. Kryształ wraca do serca, ekwipunek i złoto wypadają jako łup (sekcja 04).
5. 1.17: zapis śmierci `{id, t, crypt, knows}` w `fl.deaths` (kto o niej wie; wieści, sekcja 06, 6.3.13).
6. Ostatnie tchnienie: każdy żywy w tym samym pokoju `addFear(o, mods.lastGasp * o.courage, null, 'death')` (bez zmian w 1.17).
7. Strach ze śmierci tylko dla tych, którzy ją widzieli albo słyszeli krzyk (5.7.4; do 1.16 dla każdego żywego).
8. Morale drużyny -0,25 (min 0,15) raz, gdy dowie się przywódca: od razu, jeśli widział albo słyszał, inaczej, gdy dostanie wieść (do 1.16 zawsze od razu).

### 5.6.5 Leczenie, tarcze, mikstury (jak wchodzą w obrażenia)

- **Mikstura**: co klatkę, gdy `h.hp < R.potion * max` (`R.potion = min(0,5, 0,15 + 0,03 k)`), pije najlepszą: `hp += max * potionHeal(r) * itemPow(h)`, `potionHeal(r) = min(0,55, 1 - 0,7^r)` (`updateHero`). Doświadczeni piją też przed groźnym pokojem; drużyna oddaje miksturę konającemu (sekcja 06).
- **Odpoczynek**: +4 HP/s (Sanktuarium ×0,5), nie gdy płonie.
- **Kapłan**: co sekundę patrzy; gdy ktoś w R 3 płonie, ma < 75% HP albo braki > 0,6 max kapłana, modli się za 1 wiarę: płonącego gasi (zamiast leczenia), resztę leczy `min(22 * R.pow * ak, braki)`, `ak = Ołtarz ? 0,5 : 1`. **Leczenie daje graczowi Grozę**: `addPts(healed / h.max * GZ.heal * depthMult, 'healPts')`, `GZ.heal = 0,45`.
- **Tarcza** (`h.shield`, pochłania przed HP, krok 8 w 5.6.1): bariera kapłana `max(shield, 12 * R.pow * ak)` (3 wiary, odnowienie 14 s, przy zasadzce albo kimś < 45% HP), osłona przed pokojem `max(shield, max * (0,15 + 0,012 lvl) * (Ołtarz ? 0,5 : 1))`, gniew bohatera z przepowiedni 20% max.
- **Talizman**: `wardUntil = +3 s`, `wardK = min(0,4, 0,25 + 0,05 (r - 1)) * min(1, itemPow)`; włączany po mocnym trafieniu (HP < 60%) albo przed znaną pułapką (weterani).
- **Rdza** (`mods.itemPower 0,5`) i klątwa (×0,5) osłabiają zbroję, talizman, mikstury, amulety, buty, broń, pieśń barda (`itemPow`).

---

## 5.7 Strach

### 5.7.1 `addFear(h, amt, attr, src, dtp)` (`p3_flow.js`)

```
if (h.dead || h.fled || amt <= 0) return
raw = amt
amt *= mods.fearMult                                            // Nawiedzenie ×1,25 za kopię
     * fearResist(h, attr)
     * (1 + 0.03 * (run.stacks.chronicle || 0) * mods.chronicle) // Kronika grozy
     * (Mgła ? 1.15 : Głusza ? 1.2 : 1)
if (raging(h)) amt *= 0.5                                        // furia
1.26: Naznaczony ×1,3; Odbicie (lustro B) ×1,2 raz, gdy attr !== 'mirror'
amt *= phobiaMult(h, attr, src, dtp)
h.fearBy[attr || src] += amt; feltBy (gdy attr = typ odpalanego elementu); statystyki fearSrc
before = h.fear; h.fear += amt
pts = addPts(amt / h.courage * GZ.fear * depthMult(h.room) * loneMult(h), 'fearPts', h)   // GZ.fear = 1,6; loneMult = 1
GROTA: if (src !== 'echo' && Grota) każdy żywy o != h w nbrRooms(h.room): addFear(o, raw * 0.4, attr, 'echo')
lim = h.courage * (fl.fearless ? 1.3 : 1) * (h.trait === 'hothead' ? 1.1 : 1)   // po końcu cierpliwości bohaterowie wytrzymują więcej; 1.26 Zapaleniec
AMULET: if (!fleeing && !crystal && h.fear >= [0.85, 0.7, 0.6, 0.6][h.rank] * lim) useAmulet(h)
pk = h.trait === 'coward' ? 0.55 : 0.7
1.26 ZAPALENIEC: raz na falę (h.hotW) w miejscu paniki startRage(h, 'panic') → h.fear -= 0.25 * lim; return
BARBARZYŃCA: before < pk*lim <= fear, nie ucieka, bez kryształu, po rageCd, startRage(h,'panic') udany
             → h.fear = max(0, h.fear - 0.25 * lim); return
PANIKA: before < pk*lim <= fear && !fleeing && !crystal && fl.time > h.panicUntil
        → h.panicUntil = fl.time + 2 + rand*2; needPlan
if (h.fear >= lim && h.crystal && !caged(h)) dropCrystal(h)       // rzuca kryształ i ucieka
if (h.fear >= lim && !h.fleeing && !h.crystal && !caged(h)) startFlee(h)
```

- Echo Groty liczy się od surowej kwoty (`raw`), ale u odbiorcy przechodzi przez wszystkie jego mnożniki; echo nie odbija się dalej. `nbrRooms(r)`: pokoje i korytarze za drzwiami pokoju oraz pokoje na drugim końcu tych korytarzy (`p2_state_map.js`).
- `useAmulet`: zdejmuje `(0,08 + 0,04 * min(4, r)) * itemPow * (Ołtarz ? 0,5 : 1) * courage` strachu i na 4 s (Ołtarz 2 s) mnoży nowy strach ×0,7 (`calmUntil`).

### 5.7.2 `fearResist(h, attr)` i `phobiaMult(h, attr, src, dtp)`

```
fearResist:
  k = 1
  attr in fl.knownTypes                          → ×0.6   // jakakolwiek wykryta pułapka tego typu (rebuildThreat)
  inny kapłan rangi >= 1 w odległości <= 3       → ×0.75 (Ołtarz w pokoju h: ×0.875)
     1.26: albo paladyn (każdej rangi) w odległości <= 3 → ×0.8 (Ołtarz ×0.9); kapłan i paladyn się nie sumują: min(kapłan, paladyn)
  1.26: h.trait === 'superstitious' && attr w SCARE albo w rodzinie Nawiedzenie → ×1.4
  1.26: omenK(fala, 'fearK')                     → ×0.7 (Inkwizycja)
  bohater z przepowiedni w odległości <= 3       → ×0.75
  żywy boss, z którym jest (1.17: to on sam albo h go widzi lub słyszy; boss nie w klatce, nie w zapadni)   → ×0.85
                                                 // do 1.16: jakikolwiek żywy boss w fali, gdziekolwiek
  fl.time < h.braveUntil                         → ×h.braveK      // osłona kapłana przed pokojem: 0,85^(1 + lvl/5), Ołtarz połowa efektu
  fl.time < h.calmUntil                          → ×0.7          // amulet

phobiaMult:
  k = 1
  phobiaOn(h, attr, src, dtp) → k *= (PHOBIAS[h.phobia].dark ? 1.6 : 2) + mods.phobiaK; revealPhobia
  tt = dtp || DMG_OF[attr]; if (tt && h.trauma[tt]) k *= 1.5 + 0.5 * mods.traumaK
  mods.isolation && (alone || lost) → k *= (src === 'alone' ? 2.5 : 1.25)
  mods.heavyAir && (Mgła || Krypta) → k *= 1 + mods.heavyAir
phobiaOn = attr in F.attrs || dtp in F.types || src in F.srcs || (F.dark && (Mgła || alone || lost))
```

`data/PHOBIAS.json`: `attrs` (atrybuty, które straszą bardziej), `types` (typ obrażeń, tylko ogień), `srcs` (źródła, tylko `death` dla krwi i kości), `dark` (ciemność: działa na **każdy** strach w Mgle, w samotności i po zgubieniu, ×1,6), `sees` (co straszy samym widokiem). `PHOBIA_OF_ATTR` (`data/PHOBIA_OF_ATTR.json`): odwrotna mapa atrybut → fobia (fobia powracającego, sekcja 04).

**Widok fobii** (`phobiaSight`, przy wejściu do pokoju, nie podczas ucieczki): każdy element z `F.sees` w tym pokoju (`slotRoom`), nie wyłączony, raz na element: `addFear(h, 0,15 * courage * (1 + phobiaK / 2), null, 'phobia')`. Ukryte pułapki raniące nie straszą widokiem (straszą: wykryte, `SCARE` i ogień).

### 5.7.3 Spadek strachu, panika, ucieczka

**Spadek** (`p5_ai.js: updateHero`, co krok, gdy nie ucieka):

```
h.fear = max(0, h.fear - h.R.calm * mods.calmK * omenK(fala, 'calm') (Noc strachu 1.5; brak omenu = 1) * dt
   * (fl.time < h.hexUntil ? 0.5 : 1) * (fl.time < h.icyUntil ? 0.5 : 1)   // 1.26: Klątwa szamana, Lodowata woda (zalewnia B)
   * (alone || lost || caged ? 0.5 : 1)
   * (fl.time - h.hurtAt < 1.5 ? 0.5 : 1)
   * (fl.time < h.shakenUntil ? 0.35 : 1)
   * (h.cursed ? 0.5 : 1))
R.calm = 2 + 0.4 * L        // levelStats
```

Gęsta atmosfera: `calmK ×0,5`. Uciekający nie uspokaja się.

**Panika** (`panicUntil`, 2-4 s): próg `0,7 * lim` (tchórz 0,55), przekroczony od dołu. Spłoszenie przez nietoperze daje to samo na 2,5 s bez strachu. Panikujący biegnie na losowe znane, dalekie pole (uciekający: do wyjścia), ignoruje niebezpieczeństwo, prędkość ×1,2 (sekcja 06). Wyjście z lochu w panice liczy się jak ucieczka ze strachu (`heroExit`).

**Ucieczka** (`startFlee`): `fear >= lim`; nie w klatce (klatka trzyma, strach dalej daje Grozę); niosący kryształ najpierw go rzuca (`dropCrystal`, kryształ wraca). Skutki:
- `fleeing = true`, prędkość ×1,15, cel: wyjście, ostrożność ×0,6 (sekcja 06),
- Krzyki w ścianach: każdy inny nieuciekający `addFear(o, mods.fleeShock * o.courage, null, 'screams')`,
- czempion (jeśli żyje, nie ucieka i nie siedzi w klatce; od 1.17 tylko gdy widzi uciekającego albo słyszy jego krzyk) raz na 15 s (od 1.26 raz na 25 s) okrzykiem obniża strach innego nieuciekającego o 25% jego odwagi (od 1.17 tylko tym, którzy słyszą okrzyk, do 14 kroków),
- gdy uciekających jest ≥ `max(2, ceil(grupa / 2))`, cała drużyna się wycofuje (`partyFlee`); od 1.17 liczy się grupa przywódcy (ci, którzy go widzą albo słyszą), a ucieka tylko ten, kto słyszy krzyk przywódcy, bez uwięzionych w klatce i bez czempiona (sekcja 06, 6.6.3),
- Panika (karta): każdy w odległości ≤ 3 `addFear(o, 25 * mods.panic, null, 'panic')`.

**Wypłata za przestraszonego** (`heroExit`, gdy wychodzi z `fleeing`): `addPts(GZ.scare * (boss ? 2 : 1) * mods.scareMult, 'scarePts', h)`, `GZ.scare = 2,5` (od 1.26 4; Echo krzyku ×2, od 1.26 ×1,75); Żniwa strachu: `+mods.fearHarvest` Esencji bez mnożników; Kronika grozy `run.stacks.chronicle++`. Opowieść o skarbach i powroty: sekcje 03 i 04.

### 5.7.4 Strach ze śmierci (`kill`)

Od 1.17 (autor: bohaterowie "wiedzą o sobie w innych pokojach, np. o śmierci") reaguje tylko ten, kto śmierć widzi albo słyszy (sekcja 06, 6.3.13). Dla każdego żywego `o`:

```
near  = canSee(o, zmarły)                               // to samo miejsce: pokój/korytarz albo <= 3,5 pola, nikt w zapadni
hears = !near && canHearShout(o, zmarły)                // krzyk: do 14 kroków drogi, nie przez Głuszę ani Kamień wyjec
if !near && !hears: nic (dowie się później z wieści)
d.knows.add(o); if o jest przywódcą: morale -0.25 (raz)
base = (near ? max(15 * o.R.panic, 0.12 * o.courage + 4) : 1.3 * max(5 * o.R.panic, 0.05 * o.courage + 2)) * (Krypta ? 2 : 1)
o.shakenUntil = fl.time + (near ? 9 : 5)               // wstrząśnięty: strach spada ×0,35
hears: z szansą 0.55 SAY.deathHeard (bez imienia); addFear(o, base * (trait 'coward' ? 1.5 : 1), null, 'death'); koniec (bez furii)
near:  jeśli nie ucieka i (trait 'brave' || barbarzyńca || (wojownik && rand < 0.3)) i startRage(o, 'death', h):
          addFear(o, base * 0.3, null, 'death')        // gniew zamiast strachu
       inaczej: z szansą 0.55 SAY.death / deathFlee z imieniem; addFear(o, base * (trait 'coward' ? 1.5 : 1), null, 'death')
wieść (p5_ai.js: perceiveThink, gdy spotka kogoś, kto wie): addFear(o, 0.6 * max(5 * o.R.panic, 0.05 * o.courage + 2) * (Krypta ? 2 : 1), null, 'death'),
       shakenUntil = fl.time + 5, bez furii i bez mnożnika tchórza
R.panic = 1.5 * 0.86^(L-1)
```

Do 1.16 reagował każdy żywy w lochu: `near = hypot(o - p) < 8` (w linii prostej, przez ściany), daleki `max(5 * panic, 0.05 * courage + 2)` bez mnożnika 1,3, wstrząs 9 albo 5 s, a furia i kwestia z imieniem także daleko. Krypta to pokój zmarłego. `src = 'death'` budzi fobię krwi (także przy krzyku i wieści). Furia (`startRage`): 6 s (barbarzyńca 8 s), odnowienie 20 s (14 s), strach ×0,5, prędkość ×1,25, wręcz ×1,5; Okowy blokują.

### 5.7.5 Źródła strachu (pełna lista)

| Źródło (`attr` / `src`) | Ile | Gdzie |
|---|---|---|
| pułapki i potwory | tabele 5.3.1 i 5.4.7 | `fireRaw`, `driftTick`, `monstersTick` |
| rana (`dmg` / `roar`) | `real/max * courage * 0,25` (potwór 0,18·(1 + monsterFear)), niespodzianka ×1,3 | `damage` |
| zapadnia | 25 przy upadku, 10 przy wyjściu, +25 Bezdenny szyb | `fall`, `landFallen` |
| klatka | `20 * cageFear * (lvl3 2)`; +15 porzucony; `8 * cageFear`/s bez ratunku; `cageHaunt`/s | `cageHero`, `decideCage`, `partyThink` |
| sieć | 6 | `fireRaw` |
| krata | 5 najbliższemu | `fireRaw` |
| samotność `alone` | 2,5/s (najbliższy towarzysz > 4,5 pola, kolejka wejścia pusta), poza zwiadem | `partyThink` |
| rozdzielenie `split` | 1/s na zwiadzie z dala od drużyny (1.16, sekcja 06, 6.2.10a) | `partyThink` |
| zgubienie `lost` | 4/s | `partyThink` |
| niskie HP `lowhp` | 2,2/s przy HP < 35% | `partyThink` |
| klątwa `curse` | 2/s | `partyThink` |
| kołysanka `lull` | `5*pw`/s w pokoju pozytywki | `partyThink` |
| nosiciel kryształu `carrier` | `mods.carrierFear`/s (Klątwa kryształu +4) | `partyThink` |
| koszmar `nightmare` | 3,5/s przy odpoczynku w Sanktuarium | `updateHero` |
| zasadzka `ambush` | 6 każdemu z grupy przywódcy (od 1.17; wcześniej każdemu), gdy ≥ 3 pułapki trafiły grupę przywódcy w odstępach < 3 s i ostatnia < 0,6 s temu; raz na 12 s | `partyThink` |
| serce `heart` (fala 1) | `0,3 * courage`/s przy sercu, `0,4 * courage` przy odepchnięciu | `step` |
| fobia `phobia` | `0,15 * courage * (1 + phobiaK/2)` za widok | `phobiaSight` |
| śmierć `death` | 5.7.4 (widziana, usłyszana albo z wieści); Ostatnie tchnienie `lastGasp * courage` w pokoju | `kill`, `perceiveThink` |
| krzyki `screams`, panika `panic` | karty | `startFlee` |
| echo `echo` | 40% z Groty | `addFear` |
| 1.26: krzyk serca `heartcry` | `(0,06 + heartCry) * courage`/s przy sercu od fali 2 (bez bossa i kultysty) | `step` |
| 1.26: płomienie `burn` | 2/s, dopóki płonie (atrybut `fire`) | `statusTick` |
| 1.26: odcięcie kratą | samotność 2,5/s z atrybutem `gate` przez 6 s (8 s Gilotyna) | `partyThink` (`h.cutUntil`) |
| 1.26: zew `siren` | 30 po końcu uwiedzenia; aura kusicielki 5/s | `seduceEnd`, `driftTick` |
| 1.26: dzwon `bell` | 24 na dzwon (najwyżej 2) każdemu żywemu przy każdej śmierci; 10 z checku | `killHooks`, `fireRaw` |
| 1.26: para `steam` | 12 w chmurze 3×3 | `fireRaw` (flood) |
| 1.26: nowe pułapki i potwory | 5.14.4, 5.14.5 | `fireRaw`, `newMonsterTick`, `driftTick` |

Samotność i zgubienie płacą też stałą Grozę bez strachu: `GZ.alone * dt * depthMult * mods.loneMult` (0,09/s) i `GZ.lost * dt * depthMult * mods.lostMult` (0,12/s, przez pierwsze 12 s zgubienia) (`partyThink`). Od 1.16 celowe rozdzielenie (zwiad) płaci zamiast samotności `GZ.split * dt * depthMult * (alone ? mods.loneMult : 1)` (0,04/s). Zwiadowca, który jest sam, nadal ma `h.alone`, więc Oczy, Cień, fobia ciemności i Izolacja (źródło `'split'`: ×1,25) traktują go jak samotnego.

### 5.7.6 Trauma

Ustawiana w `damage` (krok 13), trwa do końca fali (bohater żyje tylko w fali). Strach z atrybutem tego typu obrażeń (`dtp` albo `DMG_OF[attr]`) ×1,5 (Blizny na duszy: ×2 i próg 50% HP zamiast 35%). Najgroźniejsza rana uciekiniera może zostać blizną (`SCAR_RES`, sekcja 04).

---

## 5.8 Typy pokojów (`ROOMTYPES`, `RT_INFO`, `rtOf`, `isRt`)

`data/ROOMTYPES.json`: id narzędzia → typ; `data/RT_INFO.json`: nazwa, narzędzie, znak i kolor (UI). Typ nadaje się tylko pokojom (`kind === 'room'`), nie korytarzom (`p3_flow.js: applyTool`); ponowne użycie tego samego zdejmuje typ i zwraca połowę ceny. `rtOf(r) = fl.rooms[r].rt`, `isRt(r, t) = rtOf(r) === t` (`p2_state_map.js`). Pokój elementu = `slotRoom` albo `roomOf` (zaznaczam przy każdym).

| Typ | Efekty w kodzie |
|---|---|
| **fog** Mgła | strach ×1,15 (`addFear`, pokój bohatera); fobia ciemności działa na każdy strach; Ciężkie powietrze ×(1 + 0,25); nikt nie wykrywa pułapek, których `slotRoom` jest w Mgle (`scanTraps`), mag nie wyczuwa pokoju; przywódca raz na pokój błądzi `3 + 0,25 * max(0, 8 - lvl/2)` s do losowego pola (`partyThink`); każdy dalej niż 1,5 od przywódcy gubi się z szansą `dt * 0,22 * max(0,35, 1 - 0,03 lvl) * (złodziej 0,6)` na krok; `lostChance` +0,45; zgubiony odnajduje drużynę dopiero z 1,6 pola (zamiast 4,5); błędny skręt możliwy przy 2 drzwiach, szansa +0,25; wyjście z zapadni w Mgle = zgubiony. Opis "widać na 2 pola" nie ma odpowiednika w kodzie odkrywania mapy (tylko rysunek mgły, `p7_draw.js`) |
| **swamp** Bagno | ruch ×0,65, gdy pole obecne albo następne jest w Bagnie (`updateHero`); rozbrajanie ×1,5 dłużej (pokój złodzieja); nikt tu nie odpoczywa przy odwrocie (`safestRoom`) |
| **grotto** Grota | echo strachu 40% do sąsiednich pokojów i korytarzy (`addFear`, pokój bohatera); okno combo ×1,5 po odpaleniu elementu, którego `slotRoom` jest w Grocie |
| **crypt** Krypta | śmierć: Groza ×1,5 i strach ze śmierci ×2 (pokój zmarłego); potwory +25% HP na starcie fali (`roomOf` potwora); trumna ×1,5 (`roomOf` trumny); Ciężkie powietrze |
| **vault** Sezam | widziany łup podbija chciwość ×2 (`noticeLoot`); wartość łupu w decyzji ×1,5; pokój przyciąga przy wyborze celu (-4); `depthMult +0,15` (sekcje 03, 04, 06) |
| **haven** Sanktuarium | ranny (< 60% HP) przechodzący drzemie 5 s raz na falę (nie gdy płonie, nie zgubiony); przy odwrocie wybierany jako najbezpieczniejszy (-12); leczenie przy odpoczynku ×0,5; śpiący +3,5 strachu/s (`nightmare`) |
| **gears** Zębatki | odnowienie elementów z `slotRoom` w Zębatkach ×0,75 (pułapki i potwory); ta sama pułapka w oknie combo podbija combo |
| **hush** Głusza | strach ×1,2 (od 1.27.4 ×1,1); zgubiony w Głuszy po 8 s sam znajduje drogę (od 1.27.4, sekcja 06, 6.15.4); świadkowie odpalenia nie uczą się pułapki (`slotRoom` w Głuszy); kwestie bohatera w Głuszy to "…" (`say`); nikt nie woła kapłana, nikt nie odpowiada na strach, wołanie zgubionego przepada (pokój mówiącego); od 1.17 nikt w Głuszy ani spoza niej nie słyszy nikogo po drugiej stronie (`canHear`, `canHearShout`: krzyk śmierci, klatka, ucieczka drużyny, wieści, plan), a pułapka w Głuszy nie jest słyszana zza ściany (`hearFar`), tak samo bohater w Głuszy jej nie słyszy (sekcja 06, 6.3.13) |
| **ice** Lodownia | przy wejściu na pole w stanie `walk` (nie dwa razy z rzędu): z szansą `0,33 * (rank >= 2 ? 0,55 : 1) * (złodziej 0,6) * (panika lub ucieczka 1,3)` bohater jedzie jedno pole dalej w tym samym kierunku (`prog += 3,2 dt`), jeśli pole przechodnie, bez żywego potwora nie-`DRIFT` i nie serce; po wjeździe normalne `onEnter` (łup, pułapki); nikt tu nie odpoczywa |

Uwaga dla kraty i zawiasów: ich `slotRoom` to korytarz, więc Zębatki, Głusza i Grota z pokoju obok ich nie dotyczą.

## 5.8a Komnaty (`KIND_INFO`, `KINDS`, `KIND_OF`, `rkOf`, `servedRooms`, `inKind`, `t3`, `kindPow`, od 1.15)

Komnata mówi, komu pokój służy. `data/KIND_INFO.json`: id → nazwa, narzędzie (`k_<id>`), rodzina (`items`), krótki opis rodziny (`tag`), znak i kolor. Każda pułapka i każdy potwór należy do dokładnie jednej komnaty (24 elementy w 12 komnatach, `KIND_OF`: element → komnata; `KINDS`: narzędzie → komnata).

| Komnata | Rodzina | Znak, kolor |
|---|---|---|
| **goblin** Goblinia nora | Goblin, Szaman | ♣ `#a7d060` |
| **spider** Leże pająków | Pająk, Sieć | ✳ `#d4cbe8` |
| **ogre** Jaskinia ogra | Ogr | ♠ `#d99a6c` |
| **haunt** Nawiedzona sala | Duch, Cień | ✧ `#a6e8ff` |
| **bats** Gniazdo nietoperzy | Nietoperze | ☾ `#bba2e6` |
| **ossuary** Kaplica czaszek | Kości, Trumna, Łucznik | ☠ `#efe6cc` |
| **armory** Zbrojownia | Kolce, Strzały | ⚔ `#c9d5e2` |
| **forge** Kuźnia | Ogień, Proch | ⚒ `#ffa65c` |
| **prison** Więzienie | Klatka, Zapadnia, Krata | ⛓ `#bdb19b` |
| **junk** Graciarnia | Mimik | ⌂ `#dcae6c` |
| **gallery** Galeria | Portret, Oczy, Lustro | ▣ `#ecc65e` |
| **nursery** Pokój dziecięcy | Pozytywka, Zawiasy | ♪ `#f2bcd4` |

Od 1.26: 15 komnat i 44 elementy. Dopisane do starych: Goblinia nora + goblin saper, herszt; Gniazdo (dawne Gniazdo nietoperzy, tag "nietoperze i szczury") + rój szczurów; Zbrojownia + wahadło; Kuźnia + plama oleju, kocioł smoły; Więzienie + wnyki; Galeria + fałszywe przejście. Nowe: **lab** Laboratorium (wyziewy, zalewnia, runa piorunów; ⚗ `#9fe0c8`), **graveyard** Cmentarz (szkielet, zombie, licz, dzwon żałobny; ✟ `#c9d4b0`), **abyssgate** Wrota otchłani (chochlik, ogar piekielny, kusicielka, demon otchłani; ⛧ `#ff7a5a`). Przynęta nie ma komnaty (łup). `KIND_COST` 10 (było 12), zwrot 5. Komnata daje cechę A za darmo; element z cechą B w komnacie ma obie (5.14.3). Kwestie wejścia `rkEnter.k_lab/k_graveyard/k_abyssgate` i rozglądania się `lookKind.lab/graveyard/abyssgate`.

Zasady (`p2_state_map.js`, `p3_flow.js: applyTool`):

- **Działanie.** Element rodziny, który służy pokojowi z jej komnatą, ma cechę 3. poziomu bez ulepszania: `t3(it) = lvl >= 3 || inKind(it)`. Wszystkie miejsca w kodzie, które sprawdzały `lvl >= 3` dla cechy (`TRAITS`), pytają teraz `t3` (36 miejsc w `p2`-`p6`; klucz pamięci obszarów `AREA_MEMO` zawiera `t`, gdy element ma cechę). Element rodziny, który ma już 3. poziom, dostaje `KIND_POW = 1,25` mocy (`kindPow`): pułapki w `fireRaw` (`pw *= boost * lvlPow * kindPow * pactPower`), potwory w `monDmg`. Poziom 2 nie zyskuje nic poza cechą.
- **Któremu pokojowi służy element** (`servedRooms`): pułapka na ścianie pokojowi, w który patrzy (`slotRoom`), potwór i pułapka na podłodze albo obiekcie pokojowi, w którym stoi (duchy, cienie i nietoperze: pokojowi swojego pola startowego), pułapka w drzwiach (Krata, Zawiasy) obu pokojom swoich drzwi. Samo `slotRoom` dałoby drzwiom często korytarz, a korytarz nie ma komnaty.
- **Koszt** `KIND_COST = 12` (`toolCost`). Komnata nie zajmuje miejsca w pokoju (`roomCap` jej nie liczy). Tylko pokoje (`kind === 'room'`), nie korytarze. Jeden pokój ma najwyżej jedną komnatę i niezależnie od niej jeden efekt (`rt`). Komnata i efekt nakładają się (decyzja autora, np. Goblinia nora we Mgle): działają oba naraz, żadne z nich nie zdejmuje drugiego, a rysunek pokazuje oba (08, 6.2a).
- **Zdejmowanie i zamiana.** Stuknięcie pokoju, który ma tę komnatę: zdjęcie za 0, wraca `floor(12 / 2) = 6`. Stuknięcie pokoju z inną komnatą: zamiana za pełne 12 (napis "zamiast: ..."). Cofnij przywraca komnatę (kopia `run.layout`).
- **Odblokowanie.** Wszystkie 12 narzędzi jest w `START_UNLOCKED` (pokazują się od etapu 3, `ONB_ITEM = 3`), ale komnata działa jako zablokowana (`p8b_ui.js: isOpenT`), dopóki gracz nie ma odblokowanego żadnego elementu jej rodziny. Kafelek jest wtedy wyszarzony z kłódką, stuknięcie mówi "brak rodziny", a dymek: "Zablokowana: najpierw odblokuj X albo Y (kartą ze sklepu)."
- **Komunikat po postawieniu:** "Komnata: <nazwa> (zamiast: <poprzednia>). <rodzina> w tym pokoju ma/mają cechę 3. poziomu (działa już na N | , postaw je tutaj)." Opis kafelka (`ITEMS.k_*.desc`) wymienia cechy całej rodziny (`TRAITS`).
- **Zapis.** `run.layout.cells[k].rk` (id komnaty); pokój dostaje `R.rk` przy budowaniu mapy. Log runu: komórka układu `[9]` (`null`, gdy brak; `[8]` to efekt), `LOG_VERSION` bez zmian (58), bo pole doszło na końcu.
- **Odtwarzanie** (`tests/replay112.py`): komórka `[9]` wraca jako `rk`. Eksperyment `KINDS=auto` (zmienna środowiska): każdy pokój dostaje komnatę rodziny, której ma najwięcej, bez opłaty.

Wygląd komnat: sekcja 08 (6.2a). Podzakładki Lochu: sekcja 08 (2.5).

---

## 5.9 Skill checki (`p6_loop.js`)

### 5.9.1 Idea

Bohater wchodzi w obszar gotowego elementu, który nie ma zapamiętanego wyniku: świat zwalnia do ×0,25, przy elemencie pojawia się kształt z koralikiem. Gracz stuka w mapę: koralik w obwódce = draśnięcie (graze, `okPw = 0,7`), w pełnym polu = krytyk (`critPw = 1,8`), poza strefami = pudło. Wynik (graze albo krytyk) element pamięta i dalej odpala sam z tą mocą, także w kolejnych falach. Trafienie, które kogoś zabije, zawsze pyta (czaszka). Wygląd: sekcja 08.

### 5.9.2 Stałe

```
CHECK_DUR = 1.15        // s, bazowy czas przejazdu koralika (czas rzeczywisty)
CHECK_PREP = 0.5        // s "Uwaga!" przed startem koralika (czas rzeczywisty)
CHECK_SLOW = 0.25       // prędkość świata podczas checku (timeScale)
SERIES_MAX = 6          // ile innych elementów może dołączyć do serii
CHECK_LV_SPEED = 0.015
CHECK_SHAPE = { spikes: 'bar', arrows: 'bar', gate: 'bar', mimic: 'bar', powder: 'fuse', fire: 'ring',
  portrait: 'double', ghost: 'double', web: 'spiral', spider: 'spiral', trapdoor: 'pulse', cage: 'pulse',
  goblin: 'swing', archer: 'swing', ogre: 'swing', shaman: 'swing', eyes: 'double', bones: 'pulse',
  mirror: 'ring', creak: 'bar', coffin: 'fuse', musicbox: 'spiral', shade: 'double', bats: 'swing',
  // 1.26
  pendulum: 'swing', snare: 'pulse', miasma: 'spiral', oilslick: 'ring', bolt: 'double', flood: 'pulse', bell: 'fuse', falsedoor: 'double', tar: 'fuse',
  skeleton: 'swing', zombie: 'swing', lich: 'double', imp: 'double', hound: 'swing', siren: 'double', demon: 'swing', sapper: 'bar', warlord: 'swing', rats: 'pulse' }
SHAPE_NAME = { bar: 'pasek', ring: 'tarcza', fuse: 'lont', double: 'podwójna tarcza', spiral: 'spirala', pulse: 'krąg', swing: 'wahadło' }
SHAPE_DUR = { bar: 1, ring: 1.15, pulse: 0.95, swing: 1.55, fuse: 1.25, double: 1.2, spiral: 1.25 }
LVL_ZONE = [1, 1, 1.15, 1.3]
SWING_PASSES = 2, SWING_EASE = 0.35
BASE_DMG = { spikes: 35, arrows: 25, fire: 20, gate: 60, powder: 60, mimic: 40, trapdoor: 20, goblin: 35, archer: 22,
  spider: 30, ogre: 45, ghost: 5, web: 0, cage: 0, portrait: 0, shaman: 0, eyes: 0, bones: 0, mirror: 0, creak: 0,
  coffin: 0, musicbox: 0, shade: 0, bats: 6,
  // 1.26
  pendulum: 45, snare: 25, miasma: 0, oilslick: 0, bolt: 22, flood: 0, bell: 0, falsedoor: 0, tar: 25,
  skeleton: 20, zombie: 15, lich: 25, imp: 0, hound: 30, siren: 0, demon: 40, sapper: 0, warlord: 30, rats: 8 }
NO_KILL = { web, shaman, cage, portrait, eyes, bones, mirror, creak, coffin, musicbox, shade }   // nigdy nie pokazują czaszki (1.26: bez zmian; nowe straszaki z BASE_DMG 0 i tak nie zabijają)
mods.critPw = 1.8, mods.okPw = 0.7     // Hazardzista: critPw ×1,35 (2,43), okPw ×0,57 (0,399)
```

### 5.9.3 Kiedy check startuje (`checkTick`, wołane w każdym `step` po ruchu bohaterów)

```
checkTick():
  if (fl.check || fl.ending !== null) return            // podczas checku nic innego nie odpala samo
  // 1) to, co ma odpowiedź, odpala samo
  for it of fl.items (kolejność wstawienia):
    if (it.memRes && putOut(it)) forgetMem(it)           // putOut = !worn && (disabled || broken || jamUntil > time)
    if (!checkWanted(it) || skullHolds(it)) continue
    pw = memPw(it)                                        // crit → critPw, ok → okPw, brak → 0
    if (ff) fire(it, pw || mods.okPw)                     // palec na mapie: wszystko, bez pamięci jak graze
    else if (pw && !lethalFor(it, pw)) fire(it, pw)       // pamięć i nie zabije
  if (ff || fl.time < fl.checkGap) return
  if (calmChecks() && fl.time < fl.calmUntil) { calmFire(); return }   // 1.24: spokojna przerwa w falach 1-2 (5.9.10)
  // 2) pierwszy element, który potrzebuje checku, otwiera go
  for it of fl.items:
    if (!checkWanted(it) || skullHolds(it) || !needsCheck(it)) continue
    ... zbuduj check (5.9.4), return
needsCheck(it) = !memPw(it) || lethalFor(it, memPw(it))
```

- Kolejność w `fl.items` (kolejność stawiania) decyduje, który element pyta pierwszy. W Unity: lista w kolejności dodania.
- `fl.checkGap = fl.time + 0,25` po zamknięciu checku (`clearCheck`): nowy check najwcześniej 0,25 s czasu gry później. Pamięć odpala w tym czasie normalnie. Od 1.24 w falach 1-2 i w samouczku dodatkowo `fl.calmUntil = fl.time + S.calmGap` (1,5 s, 5.9.10).
- Przy przytrzymanym palcu (`ff`) nowe checki nie startują, a odpalenie z pamięci lub jako graze **nie sprawdza czaszki** (zabija bez pytania; respektuje tylko `skullOff`).

### 5.9.4 Budowa checku

```
inA = heroesInArea(it); shape = CHECK_SHAPE[it.type] || 'bar'
maxL = max(1, poziomy bohaterów z inA)
kz = S.checkDiff * (1 + 0.02 * min(10, run.wave - 1)) / LVL_ZONE[it.lvl || 1]     // węższe strefy
ks = S.checkDiff * (1 + CHECK_LV_SPEED * min(20, maxL - 1))                        // szybszy koralik
gw = min(0.4 / kz * OK_WIDE[shape], 0.96 - lo - rw)   // szerokość obwódki (graze), część kształtu 0..1; OK_WIDE od 1.24: pulse S.okPulse 1,6, swing S.okSwing 1,65, reszta 1 (5.9.11)
rw = 0.09 / kz         // szerokość pełnego pola (krytyk)
lo = shape === 'swing' ? 0.08 : 0.12
start = lo + rand * max(0, 0.96 - lo - gw - rw)
double: g = gw * 0.7, r = rw * 0.85
        a = 0.08 + rand * max(0, 0.46 - 0.08 - g - r); b = 0.52 + rand * max(0, 0.94 - 0.52 - g - r)
        g0 = a, g1 = a + g, r0 = g1, r1 = g1 + r;  z2 = { g0: b, g1: b + g, r0: b + g, r1: b + g + r }
inny niż pulse, z szansą 0,5: r0 = start, r1 = r0 + rw, g0 = r1, g1 = g0 + gw     // krytyk przed obwódką
w pozostałych (zawsze dla pulse): g0 = start, g1 = g0 + gw, r0 = g1, r1 = r0 + rw   // krytyk za obwódką (w kręgu: w środku)
dur = CHECK_DUR / sqrt(ks) * SHAPE_DUR[shape]
```

- `S.checkDiff` (ustawienie gracza "Trudność skill checków", 0,6-1,8, krok 0,1, domyślnie 1): większe = węższe strefy i szybszy koralik.
- Przy `checkDiff = 1`, fali 1 i poziomie 1: obwódka 0,40, krytyk 0,09 kształtu; w fali 11+ obwódka 0,333, krytyk 0,075; poziom 3 elementu ×1,3 szerzej.
- Czasy przy `ks = 1`: pasek 1,15 s, tarcza 1,32 s, krąg 1,09 s, wahadło 1,78 s, lont 1,44 s, podwójna 1,38 s, spirala 1,44 s. Bohater poziomu 21 (`ks = 1,3`): ×0,877.

Pozycja koralika `checkPos(c, u)`, `u = (realNow - t0) / dur` obcięte do 0..1:

```
fuse:  u^1.7                            // iskra pełznie, potem pędzi
swing: k = min(1, floor(2u)); s = 2u - k; q = s - 0.35 * sin(2πs) / (2π); pos = k odd ? 1 - q : q   // tam i z powrotem, szybciej w środku
reszta: u
```

**Seria** (`S.series`, ustawienie gracza, domyślnie włączone): do checku dołącza do `SERIES_MAX` innych elementów z całej mapy, które są `checkWanted`, nie `skullHolds` i `needsCheck`. Jedno stuknięcie odpowiada za wszystkie.

**Blokada celów** (`lock`): `Map(element → heroesInArea(element))` z chwili startu. Ci bohaterowie zostają celami, choć w spowolnieniu idą dalej (`fireRaw` dokłada ich do `list`, bez uciekających).

Obiekt checku:

```
fl.check = { it, extra, shape, maxL, lock, t0: realNow + CHECK_PREP, prepT0: realNow, go: false, dur,
             g0, g1, r0, r1, z2, rot: rand * 2π,
             lethalOk: all.some(o => lethalFor(o, mods.okPw)),     // czaszka na obwódce
             lethalCrit: all.some(o => lethalFor(o, mods.critPw)), // czaszka na pełnym polu
             result: null, resT: 0, note }
```

`note`: podpowiedzi nad checkiem (rozbraja ją, niesie kryształ, stoi ×1,5, w klatce +50%, w sieci +30%, lepkie kolce, cisza, krew, tarcza -N%, blisko ucieczki, talizman, "poz. N: szybciej" od poziomu 12); tylko UI, sekcja 08. Dźwięk `warn`, podpowiedź tekstowa przy pierwszych 3 checkach runu (`run.checkHints`).

### 5.9.5 Czaszka: `lethalFor(it, pw)`

```
predictedDmg(it, pw):
  D = S.dmg; burn = 18 * D                       // 3 s podpalenia
  pw *= lvlPow(it) * mods.pactPower
  fire:   20*D*fireDmg*pw*trapBoost + burn * (lvl >= 3 ? 2 : 1)
  arrows: 25*D*pw*trapBoost + (arrowBurn ? burn : 0)
  spikes: 35*D*spikeDmg*(1 + 0.04*hunger)*pw*trapBoost + (lvl >= 3 ? burn : 0)
  reszta: BASE_DMG[type] * D * {gate: gateCrush, mimic: mimicDmg, trapdoor: fallDmg}[type] * (potwór ? it.power : 1) * pw * trapBoost
takenK(h, it) = (talizman aktywny i nie przebijające strzały ? 1 - wardK * (Kwas 0.5) : 1)
              * (zbroja ? 1 - (1 - 0.92^(r * itemPow)) * (Kwas 0.5) : 1) * (h.cursed ? 1.3 : 1)
lethalFor(it, pw) = !NO_KILL[type] && heroesInArea(it).some(h =>
      (type !== 'gate' || h stoi na kracie) && h.hp + h.shield <= predictedDmg(it, pw) * trapMult(h, type, it) * takenK(h, it))
```

Prognoza nie zna combo (`cpow`), odporności klasy i ciała (`typeMult`), uniku złodzieja ani echa, więc jest przybliżeniem (5.11).

### 5.9.6 Rozstrzygnięcie

**Stuknięcie** (`p8b_ui.js`, `pointerdown` na płótnie mapy, jeden palec, gra niezapauzowana): gdy trwa check bez wyniku, woła `resolveCheck()` i zjada gest (ani przesuwanie, ani przyspieszenie). Przyciski i tacka to elementy poza mapą, nie odpowiadają. Stuknięcie w czasie "Uwaga!" (`realNow < t0`) jest zjedzone bez wyniku. **tylko prototyp**: spacja = stuknięcie; w Unity tylko dotyk w obszarze mapy.

```
resolveCheck(p):                       // p: pozycja (testy); stuknięcie: pozycja koralika teraz
  if (!c || c.result) return
  if (p === undefined) { if (realNow < c.t0) return; p = checkPos(c, (realNow - c.t0) / c.dur) }
  res = 'miss'
  if (p in [r0, r1] || p in [z2.r0, z2.r1]) { res = 'crit'; pw = mods.critPw }      // krytyk sprawdzany pierwszy
  else if (p in [g0, g1] || p in [z2.g0, z2.g1]) { res = 'ok'; pw = mods.okPw }
  c.result = res; c.resT = realNow; c.p = p
  all = [c.it, ...c.extra]
  if (res !== 'miss') all.forEach(o => { if (!memOf(o)) { o.memRes = res; o.memLvl = o.lvl || 1 } o.skullOff = false })
  dźwięk; krytyk: wibracja 25 ms; statystyki; po 6 checkach z rzędu bez krytyka raz na run podpowiedź
  if (res === 'miss') { all.forEach(o => o.cd = cdOf(o.type) * 0.5 || 1); napis "Pudło"; return }
  victims = heroesInArea(o) ∪ lock(o) dla wszystkich o
  fire(c.it, pw, { lock: lock(c.it) })
  extra: fire(o, pw, { lock }) jeśli o wciąż na mapie, nie wyłączony, nie zakłócony, potwór żywy
  crit: wstrząs, napis "KRYTYK!" / "SERIA: KRYTYK!"; każdy żywy z victims z niepustym plecakiem traci losowy przedmiot: od 1.20 ląduje obok jako łup "wybity" (5.9.13), przepada tylko bez wolnego pola
  ok: napis "Draśnięcie"
```

**Brak stuknięcia** (`updateCheck`, co klatkę w czasie rzeczywistym): `u >= 1` → `skipCheck()`:

```
c.result = 'skip'
all.forEach(o => {
  o.skipUntil = fl.time + 1.2
  if ((c.lethalOk || c.lethalCrit) && lethalFor(o, memPw(o) || mods.okPw)) o.skullOff = true   // puszczona czaszka
})
```

**Czaszka puszczona** (`skullHolds`): element z `skullOff` nie pyta i nie odpala sam, dopóki `lethalFor(it, memPw(it) || okPw)`; gdy przestanie zabijać, `skullOff = false` i wraca do normy. Kasowane też na starcie każdej fali i przy trafionym checku. Czaszka tylko na krytyku (graze nie zabija) nie usypia: po 1,2 s check wraca.

**Zamknięcie**: wynik widać 0,35 s czasu rzeczywistego (`updateCheck`), potem `clearCheck()`: `fl.check = null; fl.checkGap = fl.time + 0,25` (od 1.24 w falach 1-2 i samouczku także `fl.calmUntil = fl.time + S.calmGap`). Od 1.24 każdy wynik idzie też do `stats.checkByShape[kształt]` (`shapeStat`: `ok`, `crit`, `miss`, `skip`, `auto`; sekcja 07). Pudło i puszczenie w pierwszej fali samouczka mogą jeszcze odpalić kolce (5.9.12). Świat wraca do pełnej prędkości od chwili wyniku (`timeScale` zwalnia tylko `check && !result`).

**Pauza i okno**: gdy otwarte jest okno albo pauza, `t0`, `prepT0` i `resT` przesuwają się o czas klatki (check stoi).

### 5.9.7 Pamięć wyniku (1.05, od 1.09 między falami)

```
memOf(it) = it.memRes && it.memLvl === (it.lvl || 1) ? it.memRes : null
memPw(it) = memOf === 'crit' ? mods.critPw : memOf === 'ok' ? mods.okPw : 0
forgetMem(it) = it.memRes = null (+ statystyka memLost)
```

- Zapis: tylko pierwszy trafiony check (gdy pamięci brak). Check czaszki elementu z pamięcią rozstrzyga tylko to jedno trafienie.
- Pudło i puszczenie nie zmieniają pamięci (pudło: zapyta przy następnej gotowości).
- Kasuje: wyłączenie przez bohaterów (`putOut`: rozbrojenie, odczynienie, bomba, zakłócenie magiem, rozbity mebel, rozbita budowla; nie `worn`), sprawdzane w `checkTick` i jeszcze raz w `setupFl`. Zabity potwór i rozmontowana pułapka znikają razem z pamięcią.
- Ulepszenie: `memLvl` nie pasuje do nowego poziomu, element zapyta znowu.
- Przeniesienie zachowuje pamięć (ten sam obiekt). Zdjęcie zapisuje `run.memSpots[key] = [type, memRes, memLvl]`; postawienie tego samego typu na tym polu (poziom 1) przywraca pamięć poziomu 1 (`p8b_ui.js: removeItem`, `tryPlace`). `memSpots` nie są nigdy czyszczone.
- Zapis gry: `memRes` i `memLvl` to zwykłe pola elementu, idą do zapisu (sekcja 07).

### 5.9.8 Pudło

Każdy element checku: `o.cd = cdOf(o.type) * 0,5 || 1` (połowa odnowienia bez mnożnika Zębatek; proch ma `cdOf = 0`, więc 1 s), bez odpalenia, bez pamięci. Zapyta znowu po tym czasie.

### 5.9.9 Przyspieszanie

- **Przytrzymanie palca** (`ff`, `p8b_ui.js`): palec na mapie przez 280 ms bez ruchu (> 8 px przesunięcia anuluje), jeden palec, fala trwa, brak pauzy. Puszczenie kończy. Świat ×`S.ffSpeed` (ustawienie 2-6, domyślnie 3). Skutki w `checkTick` (5.9.3): wszystko gotowe odpala samo, z pamięcią albo jak graze (`bt.ok++`, bez zapisu pamięci), bez czaszki. **tylko prototyp**: klawisz F; w Unity tylko przytrzymanie.
- **Auto-przyspieszenie w ciszy** (`autoFF`): `autoFFOn = S.autoFF > 1 && fala && fl.quietT > 0,3 && !fl.check && fl.gateOpen`. Docelowo `S.autoFF` (ustawienie 1-4, domyślnie 1,5; 1 = wyłączone); narasta o 4 na sekundę rzeczywistą, spada od razu (`frameBody`). Nie rozstrzyga checków (w ciszy ich nie ma).
- `timeScale()`: brak fali, okno albo pauza → 0; check bez wyniku → 0,25; `ff` → `max(S.ffSpeed, 1)`; inaczej `max(1, ffAuto)`.
- **Cisza** (`quietWhy`, co 0,1 s czasu gry): nie jest cicho, gdy koniec fali, przygotowanie drużyny, brak żywych, ktoś walczy, rozbraja, jest przy sercu, uwalnia albo siedzi w klatce, albo gdy któryś bohater stoi na polu "gorącym" lub w odległości `QUIET.r = 1` kroku od niego. Gorące pola: pole i obszar każdego żywego elementu `ACTIVE` (nie wyłączonego, potwór żywy) albo łupu, którego `cd <= QUIET.cd = 1`. Sąsiedztwo: BFS 4-kierunkowy przez pola `passable` (pole sąsiada sprawdzane, nawet gdy nieprzechodnie). `QUIET = { r: 1, cd: 1 }`; `r = 0` włącza starą regułę "cały pokój" (martwy wariant).

### 5.9.10 Spokojne checki w falach 1-2 (1.24, `p6_loop.js: calmChecks, calmFire, clearCheck`)

Z danych testerów: 23 checki w 29 s pierwszej fali. Od 1.24:
```
calmChecks() = S.calmGap > 0 && run && (run.wave <= S.calmWaves || run.tut >= 0)    // DEFAULTS: calmWaves 2, calmGap 1.5
clearCheck(): ...; if calmChecks(): fl.calmUntil = fl.time + S.calmGap              // czas gry, świat idzie normalnie
checkTick: po odpaleniach z pamięci, gdy calmChecks() && fl.time < fl.calmUntil: calmFire(); return
calmFire(): każdy element, który chce checku (checkWanted, !skullHolds, needsCheck):
   fire(it, mods.okPw) jak draśnięcie, bez zapisu pamięci (zapyta przy następnej gotowości),
   stats.calmAuto++, bt(typ).ok++, checkByShape[kształt].auto++
```
Czaszka w tej przerwie nie pyta (element odpala jak draśnięcie, jak przy przytrzymanym palcu). Od fali 3 (poza samouczkiem) jak do 1.23. Pomiar (`t124d_data`, 4 strzały i 2-3 kolce na trasie, każdy check chybiony, 3 przebiegi): fala 1: 10-16 checków, najmniejsza przerwa 1,5 s, 5-16 draśnięć z automatu; fala 2: 10-14 checków; fala 3: 22-40 checków, najmniejsza przerwa 0,25-0,5 s, 0 z automatu.

### 5.9.11 Szersze okno kręgu i wahadła (1.24, `p6_loop.js: OK_WIDE`; `DEFAULTS.okPulse` 1,6, `okSwing` 1,65)

Testerzy pudłowali 81% kręgów (zapadnia, klatka, kości) i 32% wahadeł (potwory) wobec ok. połowy na pasku. Udział obwódki był ten sam, ale krąg rysuje się na tarczy o promieniu ok. 53 px (okno było pierścieniem 18 px wobec 113 px paska), a strefy wahadła leżą w szybkim środku łuku. Od 1.24 obwódka kręgu ×`S.okPulse`, wahadła ×`S.okSwing`, przycięta tak, żeby strefy zostały na kształcie (`0,96 - lo - rw`); pełne pole krytyku bez zmian (0,085 przy fali 4). Pomiar (fala 4, element poziomu 1, 16 checków na kształt, telefon 390 px):

| Kształt | Udział obwódki przed -> po | Czas koralika w obwódce (ms) | Rozmiar na ekranie (px) |
|---|---|---|---|
| bar (kolce, strzały, krata, mimik) | 0,377 (bez zmian) | 421 | 113 |
| pulse (zapadnia, klatka, kości) | 0,377 -> 0,604 | 400 -> 641 | 18 -> 28 (pierścień) |
| swing (potwory) | 0,377 -> 0,623 | 263 -> 451 na przejście (są dwa) | 49 -> 82 |

### 5.9.12 Kolce w samouczku zawsze kłują (1.24, `p6_loop.js: tutSpikeSure`)

W pierwszej fali samouczka (`run.tut >= 0 && run.wave === 1`) pudło albo puszczony check kolców, które w tej fali jeszcze nie odpaliły (`it.w.f == 0`) i stoją na mapie bez wyłączenia, odpala je raz z mocą draśnięcia (`cd`, `skipUntil`, `jamUntil` zerowane, `it.tutSure = true`), napis "Kolce i tak kłują", `stats.tutSpike`. Razem z wymogiem stawiania kolców na trasie (sekcja 08, przewodnik) kolce odpalają w 10 na 10 prób z każdym checkiem chybionym (przed zmianą 33 na 47 przy kolcach od ćwierci trasy, 1 na 12 przy drzwiach).

### 5.9.13 Krytyk wybija przedmiot (1.20, `p6_loop.js: resolveCheck`)

Krytyk dalej zabiera każdemu trafionemu z niepustym plecakiem losowy przedmiot, ale od 1.20 przedmiot spada obok jako stos łupu (`dropItem(h, x, 0, noGreed, { knocked: true })`, pole `pile.knocked = h.id`), napis "Wypadł/Wypadła/Wypadły <przedmiot>!", `stats.gearKnocked`, oś czasu `kn`, w 60% kolejkowana kwestia `SAY.gearKnocked`. Bez wolnego pola dookoła przepada jak do 1.19. Właściciel chce go odzyskać (sekcja 06, 6.11.2: `need ×1,5`, ryzyko ×0,8); podniesienie przez właściciela nie jest łupem (bez chciwości i Grozy). Ktoś inny bierze go jak zwykły łup. `startWave` czyści `knocked`. Karta Zdarte pancerze robi to samo kolcami i strzałami w Zbrojowni (5.13).

---

## 5.10 Karty dotykające tej sekcji (`mods.*`)

Wartości domyślne: `p3_flow.js: freshMods`. Pełne opisy kart: załącznik B. Kopie kart stosują się wielokrotnie (`recomputeMods`).

| Pole `mods` | Domyślnie | Karta (efekt kopii) | Gdzie działa |
|---|---|---|---|
| `spikeDmg` | 1 | Ostrzejsze kolce ×1,5 | kolce, czaszka |
| `cooldown` | 1 | Szybkie przeładowanie ×0,75, Przeciążenie ×0,6 | `cdOf` (pułapki i potwory) |
| `wallCd` | 1 | Głodne ściany ×0,8 | `cdOf` dla `WALL_TRAP` |
| `powderR` | 1 | Więcej prochu +1 | obszar prochu |
| `arrowBurn` | false | Płonące groty | strzały podpalają |
| `gateUses`, `gateCrush` | 3, 1 | Ciężka krata +2, ×1,5 | krata |
| `gateDur` | 1 | (żadna) | czas zamknięcia 4 s |
| `webDur` | 1 | Lepka sieć ×2 | sieć |
| `fireDmg` | 1 | Smocza smoła ×1,5 | ogień |
| `mimicDmg` | 1 | Wygłodniały mimik ×1,5 | mimik |
| `fallTime`, `fallDmg` | 5, 1 | Głęboka zapadnia +4, ×1,5 | zapadnia |
| `cageTime`, `cageFear` | 1, 1 | Żelazne klatki ×2, ×1,5 | klatka |
| `portraitR`, `portraitFear` | 4, 1 | Galeria grozy +2, ×1,3 | portret |
| `spiderNest` | false | Pajęcze gniazdo | pająk w walce |
| `ghostAura`, `ghostPriestOnly` | 1, false | Zimny dotyk ×1,5, true | duch |
| `monster` | 1 | Weterani ×1,4 | HP i siła nowych potworów |
| `lootTrap` | 0 | Zatruty łup +15 | `pickup` |
| `disarm` | 1 | Zardzewiałe zamki ×2 | czas rozbrajania |
| `suicideMech` | 0 | Mechanizm samobójczy +0,3 | `rigged` |
| `soulMult` | 1 | Żniwiarz ×2 | Groza śmierci |
| `fearMult` | 1 | Nawiedzenie ×1,25 | każdy strach |
| `scareMult` | 1 | Echo krzyku ×2 | Groza ucieczki |
| `panic` | 0 | Panika +1 | `startFlee` |
| `hauntedGallery` | 0 | Nawiedzona galeria +1 | duch przy portrecie |
| `carrierSlow`, `carrierFear` | 1, 0 | Klątwa kryształu ×0,65, +4 | nosiciel |
| `itemPower` | 1 | Rdza ×0,5 | przedmioty bohaterów |
| `stickySpikes` | 0 | Lepkie kolce +1 | `trapMult` |
| `wildfire` | 0 | Pożoga +1 | `ignite` |
| `bloodRite` | 0 | Krwawy rytuał +0,1 | `trapBoost` |
| `calmStorm` | 0 | Cisza przed burzą +1,5 | `trapBoost` |
| `bottomless` | false | Bezdenna studnia | `fall` |
| `echoFire` | 0 | Echo mechanizmów +1 | `fireRaw` |
| `critPw`, `okPw` | 1,8, 0,7 | Hazardzista ×1,35, ×0,57 | check |
| `choir` | 0 | Chór potępionych +1 | portret |
| `hunger` | 0 | Głodne kolce +1 | kolce (licznik `run.stacks.hunger`) |
| `chronicle` | 0 | Kronika grozy +1 | `addFear` (licznik ucieczek) |
| `tempered` | 0 | Zaprawione mechanizmy +1 | `trapBoost` (licznik trafień) |
| `pactPower` | 1 | Krwawa umowa ×1,6 | każde `fire`, `monDmg`, czaszka |
| `overload` | 0 | Przeciążenie +0,06 | `fireRaw` |
| `firepit` | 0 | Ognista otchłań +1 | `landFallen` |
| `cageHaunt` | 0 | Nawiedzone klatki +12 | `partyThink` |
| `monsterFear` | 0 | Ryk potworów +1,5 | strach z ran od potworów |
| `dmgType.*` | 1 | Hartowane ostrza, Ciężkie mechanizmy, Olej (×1,25), Jadowite gruczoły (×1,3) | `typeMult` |
| `weakK` | 0 | Słabe punkty +1 | `typeMult` |
| `arsenal` | 0 | Pełen arsenał +0,2 | `typeMult` |
| `phobiaK` | 0 | Koszmary +1 | `phobiaMult`, `phobiaSight` |
| `traumaK` | 0 | Blizny na duszy +1 | trauma |
| `calmK` | 1 | Gęsta atmosfera ×0,5 | spadek strachu |
| `fleeShock` | 0 | Krzyki w ścianach +0,1 | `startFlee` |
| `isolation` | 0 | Izolacja +1 | `phobiaMult` |
| `heavyAir` | 0 | Ciężkie powietrze +0,25 | `phobiaMult` |
| `lastGasp` | 0 | Ostatnie tchnienie +0,2 | `kill` |
| `heartbeat` | 0 | Bijące serce +0,2 | `trapBoost`, `monDmg` |
| `pack` | 0 | Stado +0,2 | `monDmg` |
| `quickArm` | false | Szybki montaż | `ARM_TIME` (od 1.18 także pierwsze odpalenie ×1,5, wiersz niżej) |
| `fearHarvest` | 0 | Żniwa strachu +2 | `heroExit` |
| `loneMult`, `lostMult` | 1 | Echo samotności, Kręte korytarze ×2 | Groza samotności i zgubienia |
| `spiderNest` (1.18) | false | Pajęcze gniazdo: także pajęczyna każdego pająka trzyma o 2 s dłużej | `fireRaw` (pająk), `monstersTick` |
| `quickArm` (1.18) | false | Szybki montaż: pierwsze odpalenie pułapki postawionej w fali ×1,5 (`it.quick`) | `fireRaw` |
| `rhythm` (1.18) | 0 | Rytm lochu: okno combo +1 s za kopię | `fireRaw`, `setupFl` |
| `ambush` (1.18) | false | Zasadzka w norze: ukryte gobliny i szamani w Gobliniej norze | `hiddenAmbush`, `rebuildThreat`, `fireRaw`, `monstersTick` |
| `cell` (1.18) | false | Cela pod zapadnią | `fall`, `cellLand`, `landFallen` |
| `vaultsnap` (1.18) | false | Zatrzask sezamu | `pickup`, `vaultSnap` |
| `frames` (1.18) | 0 | Spojrzenie z ramy: moc ×(1 + 0,5 za kopię) | `lookDone`, `framesWake` |
| `restock` (1.18) | false | Beczki z kuźni | `fireRaw` (proch), `restockForge` |
| `skullwall` (1.18) | 0 | Mur z czaszek: +5% za śmierć w Kaplicy (licznik `run.stacks.skullwall`), najwyżej +50% | `skullK` w `fireRaw` i `monDmg` |
| `strip` (1.18) | 0 | Zdarte pancerze: 50% za kopię | `stripGear` |
| `gearlink` (1.18) | 0 | Sprzężone tryby: -1 s odnowienia innych pułapek pokoju za kopię | `fireRaw` |
| `batscatter` (1.18) | 0 | Spłoszeni w mrok: zgubienie 40% (nowicjusz 60%) +20% za dalszą kopię | `fireRaw` (nietoperze) |
| `cocoons` (1.18) | 0 | Kokony: 6 strachu/s za kopię | `partyThink` |
| `mire` (1.18) | 0 | Grzęzawisko: spowolnienie w Bagnie mija wolniej | `updateHero` |
| `blackice` (1.18) | 0 | Gołoledź: poślizg ×(1 + 0,5 za kopię), spowolnienie do `time + 1,8` | `onEnter` |
| `deepsleep` (1.18) | 0 | Sen bez przebudzenia: rany i strach śpiących w Sanktuarium ×(1 + kopie) | `damageRaw`, `addFear` |
| `risen` (1.18) | false | Wstający umarli | `kill`, `riseGhost` |
| `fuseLv` (1.24) | `{}` | połączona karta z grupy "named": +1 poziom mocy jej elementu (5.1.4) | `lvlPow` |

---

## 5.11 Niespójności, martwy kod, pułapki dla implementacji

Zachowaj zachowanie z kodu, chyba że autor zdecyduje inaczej; każdą z tych rzeczy warto pokazać autorowi.

1. **Wabik alarmuje raz na run** (naprawione w 1.26: `setupFl` kasuje `alarmed`, alarm raz na falę): do 1.25.1 `alarmed` nie było kasowane w `setupFl` (i idzie do zapisu), a `decoyAlarm` od razu wychodzi, gdy `alarmed`. Od następnej fali "rozbrojenie" wabika (gałąź wabika w `updateHero` i `finishPrep` woła tylko `decoyAlarm`) nic nie robi: nie ma alarmu, a wabik zostaje włączony, więc złodziej może do niego wracać. Prawdopodobnie błąd; w Unity kasuj `alarmed` razem z resztą stanu fali, chyba że autor zdecyduje inaczej.
2. **Przytrzymany palec omija czaszkę**: w `checkTick` gałąź `ff` odpala bez `lethalFor`, wbrew zasadzie "trafienie, które zabije, zawsze pyta".
3. **Czaszka nie zna combo i odporności**: `predictedDmg` pomija `cpow`, `typeMult`, unik; duch i nietoperze w prognozie mnożą przez `it.power`, a w `fireRaw` nie (przy Weteranach i ulepszeniu prognoza zawyża). Proch poziomu 3 i łucznik poziomu 3 podpalają, a prognoza tego nie liczy.
4. **Strach bez combo i mocy**: sieć (6), zapadnia (25, 10, 25), klatka (20), krata (5), ogr poziomu 3 (15·pw), kołysanka na sekundę nie mają `cpow` (część także `pw`), choć komentarz 1.12 mówi, że combo wzmacnia "rany i strachy".
5. **`webbed` = każde spowolnienie**: `trapMult` daje +30% (i kolce ×1,5 przez `held`) każdemu z `slowUntil > time`, także po zawiasach, trumnie, goblinie poziomu 3 czy w strefie pająka; tekst mówi "w sieci".
6. **Klatka a ucieczka**: komentarz w `partyThink` ("strach rośnie, aż wyłamie kraty i ucieknie") i gałąź `caged` w `startFlee` są martwe, bo `addFear` nie woła `startFlee` dla uwięzionego. Uwięziony bez ratunku zawsze umiera po czasie (boss wyłamuje).
7. **Głodne ściany** (naprawione w 1.18): tekst karty wymienia teraz także oczy i lustra, jak `WALL_TRAP` w kodzie.
8. **Szybkie przeładowanie, Przeciążenie, Zębatki** skracają też odnowienie zdolności potworów (`cdOf` bez filtra `TRAPS`). Zdolność potworów nie korzysta z `trapBoost` (Bijące serce działa tylko na ich obrażenia pasywne).
9. **Krata i zawiasy należą do korytarza** (`slotRoom` drzwi = `dd.b`), więc typ pokoju obok ich nie dotyczy, a liczą się do limitu korytarza.
10. **Licznik kraty w UI** (`p7_draw.js`) pokazuje `gateUses - uses` bez +2 z poziomu 3.
11. **Martwe pola i stałe**: `it.sleep` (z v14, nikt nie ustawia), `mods.gateDur`, `mods.labyrinth`, `S.fearRate`, `loneMult(h)` zawsze 1, `infMult`, `cardMultNow` = 1, `ITEMS.ghost.melee`, wariant `QUIET.r = 0`.
12. **Mgła "widać na 2 pola"**: opis karty pokoju obiecuje, kod odkrywania mapy (`reveal`) tego nie robi.
13. **Śmiertelna rana nie daje Grozy za ranę** (`damage` wraca przed `pts`), tylko Grozę śmierci. Zachować (balans był strojony na tym).
14. **Krytyk zabiera przedmiot** także tym, którzy wyszli z obszaru, ale są w `lock`, i robi to nawet wtedy, gdy główny element w spowolnieniu został wyłączony i `fire` nic nie zrobił (pętla `victims` nie sprawdza wyniku `fire`).
15. **Klatka bierze pierwszego z `fl.heroes`**, nie najbliższego ani tego na polu jako pierwszego (na polu jednej klatki zwykle i tak stoi jeden).
16. **Krwawienie po 1.17.1 a teksty** (naprawione w 1.18-1.24): Hartowane ostrza "kolce i krwawienie, strzały, łucznik, goblin, mimik, nietoperze", Olej w szczelinach "ogień, proch, podpalenia; nie krwawienie"; karta bohatera pisze "krwawi" przy `burnBy === 'spikes'`, inaczej "płonie".
17. **Zapadnia po limicie (1.24)**: bohater po limicie upadków nie jest celem żadnej zapadni, ale dalej stoi w jej obszarze i liczy się do obszaru innych elementów; zapadnia "widziana" przez niego staje się znana całej drużynie (jak każda wiedza o pułapkach, sekcja 06).
18. **Draśnięcia z przerwy (1.24)** liczą się do `bt(typ).ok` jak trafione checki, więc karta elementu i statystyka "draśnięcia" w falach 1-2 obejmują też odpalenia bez stuknięcia (`calmAuto` rozdziela je tylko w danych testowych).
19. **Połączona karta "named" a potwory (1.24)**: `lvlPow` potwora z `fuseLv` to stosunek `LVL_MON` poziomu wyższego do obecnego (poziom 1: ×1,5; 2: ×1,467; 3: ×1,467), a bez połączenia potwór ma moc 1 (rośnie przez HP i siłę). Mnożnik działa w `fireRaw` (zdolność), a `monDmg` (ciosy w walce) go nie używa.
20. **Budowle 1.26** (naprawione po przeglądzie): w pierwszej wersji 1.26 dodatki Runy, Ołtarza, Kwasu, Zasłony i Kamienia wyjca były tylko w opisach; teraz kod je liczy (5.5.2). Kwas +10% i Ołtarz/wyjec +10% mnożą się z resztą kroków `damage` i `addFear`, więc w testach zgodności liczyć je w tej kolejności.
21. **Czaszka nie zna Runy rodu i omenu (1.26)**: `predictedDmg` mnoży tylko `lvlPow` i `pactPower` (i `trapBoost`, od 1.26.1 także dla potworów), bez `famK`, `kindPow`, `omenPow`, Krwawego księżyca i reakcji, więc przy rodzinie na wysokim poziomie zabija bez pytania częściej, niż prognoza mówi.
22. **Pożar (naprawione w 1.26.1)**: plan mówi "podpalenie 2 razy dłużej"; od 1.26.1 kod ustawia w następnym kroku `burnUntil = teraz + max(6, 2 × pozostały czas)`, w 1.26 było stałe 6 s. Sąsiadów Oblanych dalej podpala na 4 s.
23. **Kościany pancerz (szkielet B, 1.26)**: plan "kłute ×0,6", kod zmniejsza ×0,6 każde obrażenie od kogoś innego niż mag (także obuchowe barbarzyńcy i flaszkę alchemika).
24. **Szaman: zdolność a "nie sumuje się" (1.26)**: wybór najsilniejszego szamana (`bestHealer`) dotyczy tylko leczenia biernego; Wielkie leczenie z checku leczy od każdego szamana (ograniczone tylko limitem `healGot` = max HP na falę).
25. **Runa rodu a czas statusów (naprawione w 1.26.1)**: plan "+8% mocy (rany, strach, czas statusów)"; od 1.26.1 `setStatus` mnoży czas przez `famK` źródła (bez unieruchomienia), w 1.26 czasy były stałe.

---

## 5.12 Wskazówki dla Unity

- **Czas**: check (Uwaga, przejazd koralika, 0,35 s wyniku) w czasie rzeczywistym (`Time.unscaledDeltaTime`, z zatrzymaniem przy pauzie i oknie), świat w czasie gry z `timeScale` jak w 5.9.9. Okno combo, odnowienia, `skipUntil`, `checkGap`, podpalenie, strefy, klatka, upadek: czas gry.
- **Kolejność**: `checkTick` po ruchu bohaterów, przed `monstersTick` (sekcja 07); iteracja po elementach w kolejności postawienia.
- **Zdarzenia**: zamiast `floatTile`, `floatHero`, `burst`, `fxTiles`, `fxLine`, `shake`, `sfx`, `buzz`, `say`, `tl` wysyłaj zdarzenia z Core (sekcja 02). **tylko prototyp**: `tl()` (oś czasu do testów), `fl.stats.*` i `bt()` (dziennik fali); w Unity jako telemetria albo statystyki karty elementu.
- **Losowość**: strumień "walka i AI" dla uniku, uczenia się, nietoperzy, wyboru miejsca stref checku, Przeciążenia, echa (sekcja 02).
- **Dane**: liczby z tej sekcji, które nie są w `data/` (np. 35, 25, 22, 0,12, 1,15, 0,4, 0,09), przenieś do jednego `Balance` (ScriptableObject) z nazwami jak w prototypie, żeby test zgodności mógł je porównać.
- **Testy zgodności** (sekcja 09): wartości z tabel 5.3.1 i 5.4.7 przy `pw` 0,7 i 1,8, poziomach 1-3 i combo 1-7; `checkPos` dla każdego kształtu; `lethalFor` dla przypadków brzegowych (krata, klatka, tarcza kapłana, Kwas).
- **tylko prototyp**: `ARM_TIME` jest `let`, bo test ustawia go przez `setArm` (w Unity stała `Balance.ArmTime = 2`); `resolveCheck(p)` z argumentem służy testom (w Unity metoda `ResolveAt(float p)` tylko w testach); skróty klawiszowe Space i F.

---

## 5.13 Pułapki i potwory w 1.18-1.24 (skrót, szczegóły kart w załączniku B)

### 5.13.1 Karty komnat i efektów (1.18)

21 nowych kart działa tylko z komnatą albo efektem w lochu (`req: () => hasRk(k)` albo `hasRt(t)`). Mechanika tej sekcji:

| Karta | Co zmienia w pułapkach i potworach | Kod |
|---|---|---|
| Cela pod zapadnią (`cell`) | bohater, który spadnie przez zapadnię w Więzieniu, ląduje na gotowej klatce w Więzieniu (nie wyłączonej, `cd 0`, nie zakłóconej, wolne pole; najpierw w tym samym pokoju) i klatka odpala na niego (`fire(c, 1)`: jej Groza, combo, ratunek); nie jest zgubiony, Ognista otchłań dalej pali; bez gotowej klatki zwykłe lądowanie | `p4_traps.js: fall, cellLand, landFallen` |
| Zatrzask sezamu (`vaultsnap`) | łup wzięty w Sezamie odpala każdą gotową pułapkę tego pokoju (jak alarm wabika, bez zużycia), najwyżej raz na 6 s na pokój (`fl.snapAt`) | `p3_flow.js: pickup, vaultSnap` |
| Spojrzenie z ramy (`frames`) | bohater, który przy rozglądaniu się ogląda w Galerii portret, oczy albo lustro (nie wyłączone, nie wykryte, `cd 0`, nie zakłócone), budzi je: `fire(it, 1 + 0,5 × kopie)` | `p5_ai.js: lookDone, framesWake` |
| Beczki z kuźni (`restock`) | proch, który wybuchł w swojej Kuźni, trafia do `run.restock {x, y, obj, lvl, spent}` i wraca w następnej budowie z meblem, za darmo i na tym samym poziomie, jeśli pole jest wolne | `p4_traps.js: fireRaw`; `p3_flow.js: startBuild, restockForge` |
| Zasadzka w norze (`ambush`) | goblin i szaman w swojej Gobliniej norze są ukryci (`!m.shown`): bez zagrożenia na mapie, wojownik ich nie wybiera do walki, nie przerywają rozglądania się; cios goblina z ukrycia ×2, potem `showAmbush` (napis "Zasadzka!"); kto na niego wpadnie w walce, odsłania go, a pierwsza 1 s walki wręcz bije ×2 (`m.ambushUntil`); `setupFl` co falę ukrywa je od nowa | `p4_traps.js: hiddenAmbush, showAmbush, rebuildThreat, fireRaw, monstersTick` |
| Kokony (`cocoons`) | spowolniony w Leżu pająków, stojący w strefie sieci albo pająka, boi się 6 na sekundę za kopię (atrybut `web`, fobia pająków ×2) | `p5_ai.js: partyThink` |
| Spłoszeni w mrok (`batscatter`) | nietoperze w swoim Gnieździe: spłoszony (nie przywódca, nie zgubiony) gubi się z szansą nowicjusz 0,6, inni 0,4, +0,2 za każdą dalszą kopię, najwyżej 1 | `p4_traps.js: fireRaw` |
| Mur z czaszek (`skullwall`, rośnie) | kości, trumna i łucznik w swojej Kaplicy czaszek: `skullK = 1 + min(0,5; 0,05 × śmierci w Kaplicy w runie × kopie)` w `fireRaw` i `monDmg`; licznik `run.stacks.skullwall` rośnie w `kill` | `p4_traps.js: skullK` |
| Zdarte pancerze (`strip`) | trafienie kolcami albo strzałą w Zbrojowni strąca z szansą `min(1; 0,5 × kopie)` losowy talizman, amulet albo zbroję: spada obok jako łup "wybity" (5.9.13), napis "Strącone: ...", `stats.stripped`, oś czasu `st` | `p4_traps.js: stripGear` |
| Grzęzawisko (`mire`) | w Bagnie spowolnienie mija wolniej: `slowUntil += dt × (1 - 1 / (1 + kopie))` | `p5_ai.js: updateHero` |
| Gołoledź (`blackice`) | poślizg w Lodowni ×(1 + 0,5 × kopie), po poślizgu `slowUntil = max(slowUntil, time + 1,8)` (ok. 1,5 s po ślizgu: +30% od pułapek jak w sieci) | `p5_ai.js: onEnter` |
| Sen bez przebudzenia (`deepsleep`) | rany od pułapek i potworów i strach z atrybutem pułapki albo potwora dla odpoczywającego (`state 'rest'`) w Sanktuarium ×(1 + kopie); koszmar Sanktuarium (atrybut `null`) bez zmian | `p3_flow.js: damageRaw, addFear` |
| Sprzężone tryby (`gearlink`) | pułapka odpalająca w Zębatkach (nie echo, nie chór) skraca `cd` innych pułapek tego pokoju z `cd > 0` o `kopie` s (do 0) | `p4_traps.js: fireRaw` |
| Wstający umarli (`risen`, legendarna) | bohater zabity w Krypcie wstaje jako duch po stronie lochu (najwyżej 2 na falę, `fl.risen`): `{type: ghost, hp 60, power 1, lvl 1, cd 1, spent 0, temp: true}` na wolnym polu tego pokoju najbliższym ciała; bez miejsca w pokoju, poza chciwością (Kolekcjoner, Skąpiec, Pozłacane) i gildią; `setupFl` usuwa go przed `validateItems` (bez zwrotu) | `p3_flow.js: kill, riseGhost` |

Zmienione karty pułapek (1.18): Pajęcze gniazdo (sieć 3×3 jak dotąd plus każda pajęczyna trzyma o 2 s dłużej), Szybki montaż (pierwsze odpalenie ×1,5), Rytm lochu (okno combo +1 s za kopię, także `fl.comboWinNow` w Grocie ×1,5). Karta `u-portrait` usunięta.

### 5.13.2 Przedmioty bohaterów a pułapki i potwory (1.20)

- **Brzuch mimika** (Pożeracz, mimik poziomu 3): zjedzony przedmiot trafia do `it.belly` (najwyżej 6, najstarszy wypada), `stats.mimicAte`; ugryzienie ×(1 + 0,1 × min(6, liczba w brzuchu)). Brzuch zostaje między falami (i w zapisie). Mimik wysadzony bombą (`bombJob`) albo rozbity toporem (`smashDone`) wypluwa brzuch wokół mebla jako stosy łupu (`mimicSpill`, `dropAt`), napis "Wypluwa N przedmiot(y/ów)", `SAY.mimicSpill`, `stats.mimicSpill`, oś czasu `mx`. Karta mimika: "W brzuchu: n przedmiotów (gryzie o x% mocniej)".
- **Latarnia gaśnie** (`douseLantern`): duch, cień albo nietoperze trafiające niosącego zapaloną latarnię gaszą ją na 8 s z szansą 0,5 (cień poziomu 3: zawsze), napis "Zgasła!", `SAY.lanternOut`, `stats.lanternOut`, oś czasu `la`.
- **Bomba w płonącym plecaku** (`bombCook`, `p3_flow.js`): płonący z bombą co sekundę z szansą `min(0,45; 0,15 × bomby)`: 40 × `S.dmg` × √min(4, r) jemu (ogień), połowa każdemu w 1,5 pola, 10 strachu każdemu w 3 polach (także jemu), napis "Bomba w plecaku!", `stats.bombCook`, oś czasu `bx`.
- **Bomba przy przyjaciołach**: weteran (ranga 1+, bez furii) nie rzuca, gdy przyjaciel stoi przy potworze (`stats.bombHeld`, raz na potwora); inni rzucają, a przyjaciele obok potwora dostają 20 × `S.dmg` × √min(4, r) (ogień), `stats.bombFriendly`, oś czasu `bf2`.

### 5.13.3 Walka wręcz po 1.21-1.23 (`p4_traps.js: monstersTick`)

Obrażenia bohatera w walce na sekundę mnożą od 1.21 `vowK(h)` (zemsta, ×1,3 przez 30 s) i od 1.23 `nemK(h, m)` (Nemezis przeciw swojej urazie, ×1,25); oba mnożą też kulę ognia maga. Od 1.22: wojownik trzymający front (`w.front === m`) jest bity pierwszy spośród walczących (ogr dalej bije wszystkich), a cios w niosącego kryształ przejmuje w 50% strażnik obok (wojownik 70%, `guardOf`: eskorta, 25%+ HP, nie w klatce, bez paniki, w 1 polu; `stats.guardSoaks`, `guardSoakDmg`, oś czasu `gs`). Duch, cień i nietoperze wybierają za cel bohatera w ostatnim bastionie w 3 polach (`driftTarget`). Szczegóły zachowań: sekcja 06 (6.13-6.14).

### 5.13.4 Szaman i krata (uzupełnienie 2 do 1.24)

- **Szaman** (`p4_traps.js: shamanHeal, healFlush, SHAMAN_GZ = 0,02`): oba leczenia (bierne 8 HP/s w promieniu 2 pól i 60 × `pw` HP z checku dla potworów pokoju) idą przez `shamanHeal`, które leczy dokładnie jak wcześniej i zapisuje wyleczone HP na koncie potwora (`m.healAcc`, `m.healBy`). Raz na sekundę (`monstersTick`; reszta w `finishWave`) `healFlush`: zielone "+N" nad leczonym potworem (zsumowane), `addPts(SHAMAN_GZ × wyleczone / max HP potwora)` jako bierne źródło szamana (`byType.shaman.passivePts`, `it.w.p`, `it.w.hl`), `stats.shamanHeal`. Pełne wyleczenie potwora to 0,02 Grozy (rana wielkości zabójstwa ok. 1,5): ślad. Opis podniesionego szamana (`itemInfo`) i karta elementu: "Wyleczył potworom N HP." (`it.lhl`, `healLine`). Bez `Math.random`.
- **Krata**: nowy warunek checku w 5.3.9. Diagnoza 1.24 (12 fal na element): szaman, pająk, krata, łucznik i proch działają zgodnie z kodem; "nic nie robi" wynika z ustawienia poza trasą (szaman sam albo bez rannego potwora: 8 z 12 fal; pająk poza trasą 7 z 12) i z braku odpowiedzi na check w pierwszej fali elementu.

### 5.13.5 Animacje pułapek (1.24, sekcja 08)

`fireRaw` kończy się `trapFx(it, area)`: każdy rodzaj pułapki ma krótką animację (kolce, strzały, ogień, krata, zapadnia, klatka, sieć, proch, mimik, portret, oczy, lustro, trumna, kości, pozytywka, zawiasy). Tylko widok, bez losowania; opis w sekcji 08.

---

## 5.14 Prototype 1.26 "Serce zabiera": statusy, reakcje, nowe elementy, poziom 3 A/B, rodziny (`p1_config.js: STATUS, REACTIONS, REACT_K, TRAITS_B, FAMILIES, FAMILY_OF, RUNE_MAX, runePrice`; `p4_traps.js: statusOn, statusList, rooted, setStatus, clearStatus, statusTick, seduceEnd, reaction, reactHit, famLv, famK, omenPow, warlordK, houndK, demonK, ratsK, impSteal, plagueAirTick, newMonsterTick, monsterDown, hazardsTick, baitBite, fireWall, ogreThrow, bestHealer, gateSplit`; `p2_state_map.js: t3, t3B, t3b, doorAlong, areaOf`; `p3_flow.js: kill, killHooks, riseZombie, damage`)

Plan autora: dokument projektu `claude/rebalans-1.26-serce-zabiera.md` (sekcje 6-10). Gdy plan i kod się różnią, opisuję kod, a różnice zbieram w 5.11 (punkty 20-25) i 5.14.11.

### 5.14.1 Statusy (`STATUS`)

Statusy to flagi z czasem na bohaterze (bez osobnych obiektów); `setStatus(h, k, dur, src)` nakłada, `statusOn(h, k)` sprawdza, `statusList(h)` daje listę do karty bohatera i ikonek nad nim (sekcja 08). `setStatus` zwraca `false` dla martwego, wyszłego, zniknionego; w pokoju z Okowami spowolnienie i unieruchomienie trwają +1 s. Każde nałożenie liczy się w `stats.status[k]`, a pierwsze w fali pokazuje kartę "status" (raz w przeglądarce).

| id | Nazwa | Pole | Nałożenie i działanie w kodzie |
|---|---|---|---|
| `slow` | Spowolniony | `slowUntil` | prędkość ×0,35, pułapki ×1,3 (`webbed`, jak dotąd) |
| `root` | Unieruchomiony | `rootUntil`, `rootImm`; także `stunUntil` | stoi w miejscu (`rooted`: nie robi kroku, nie wyrywa kryształu, zegar rozbrajania stoi); `held` dla kolców i wahadła (×1,5), inne pułapki ×1,15, nie sumuje się ze spowolnieniem (liczy się wyższy mnożnik); czas `min(teraz + 5, ...)`, potem 3 s odporności (`rootImm`); bohatera z przepowiedni nie da się unieruchomić |
| `burn` | Podpalony | `burnUntil` (przez `ignite`) | 4,2/s ognia (jak dotąd) i od 1.26 +2 strachu/s (`statusTick`); Mokrego nie da się podpalić |
| `bleed` | Krwawiący | `bleedUntil` | 4,2/s kłute (`BLEED`); przy nałożeniu `sawNear(h, ['blood'])`; kapłan tamuje jak ogień |
| `poison` | Zatruty | `poison` (stosy) | 2/s za stos (`POISONT`, trucizna); najwyżej 6 stosów (Toksyczny opar +4) |
| `oiled` | Oblany | `oilUntil` | następny ogień = Pożar; przy każdym rozpoczętym kroku 25% (plama B: 50%) na poślizg = Unieruchomiony 1 s; Mokrego nie da się oblać |
| `wet` | Mokry | `wetUntil` | prędkość ×0,8, ogień ×0,5 i gaśnie, zmywa olej; porażenie = Porażenie |
| `infected` | Zarażony | `plague` (stosy) | rani jak trucizna (stosy trucizny i zarazy sumują się w tyknięciu, limit wspólny `POISON_CAP`); śmierć = Powstanie |
| `marked` | Naznaczony | `markUntil` | każdy strach ×1,3; unoszące się potwory wybierają go na cel |
| `seduced` | Uwiedziony | `seduceUntil`, `seducer` | idzie do kusicielki (`intent 'seduced'`, bez omijania niebezpieczeństw); po końcu 30 strachu, 4 s samotności (`cutUntil`), 6 s odporności; paladyn i bohater z przepowiedni odporni |
| `dazed` | Oszołomiony | `dazedUntil` (+`slowUntil`) | po upadku z zapadni: spowolniony 3 s |

Oczyszczanie: kapłan (gasi i tamuje krwawienie), alchemik (antidotum, sekcja 04, 4.3a), Mokry gasi Podpalonego, Wezwanie po krzyk zdejmuje unieruchomienie i uwiedzenie (sekcja 06, 6.16). Oślepienie (`blindUntil`, z Pary i Łzawiących wyziewów) blokuje wykrywanie pułapek (`scanTraps`), a od 1.26.1 także naukę: oślepiony nie jest świadkiem odpalenia pułapki (`witnesses` w `fireRaw`), więc nie uczy drużyny jej rodzaju i nie krzyczy o niej; Kokon (sieć B, `noItemUntil`) blokuje mikstury, talizman, amulet i buty przez 4 s.

### 5.14.2 Reakcje (`REACTIONS`, `REACT_K = 1,6`)

`reactHit(h, amt, dtp, kind, src)` wołane w `damage` dla obrażeń `fire` i `shock` (nie dla rodzaju `react` i nie poza falą):

| Reakcja | Warunek | Skutek |
|---|---|---|
| (woda) | ogień trafia Mokrego | trafienie ×0,5 i podpalenie gaśnie; bez reakcji |
| Pożar `blaze` | ogień (także tyknięcie podpalenia) trafia Oblanego | olej znika, trafienie ×1,6, w następnym kroku podpalenie `burnUntil = teraz + max(6, 2 × pozostały czas podpalenia)` (od 1.26.1; w 1.26 stałe 6 s); każdy inny Oblany w 1,5 pola traci olej i płonie 4 s |
| Detonacja `detonate` | ogień trafia Zatrutego z ≥ 2 stosami | stosy znikają; każdy w 3×3 (≤ 1,5 pola, także on) dostaje `6 × S.dmg × stosy × toxicDet` trucizny jako `react` |
| Porażenie `shock` | porażenie trafia Mokrego | woda znika, ×1,6, ogłuszenie 0,5 s (`stunUntil`); każdy inny Mokry w pokoju (z Przewodnictwem także Spowolniony) traci wodę, 0,5 s ogłuszenia i `amt × 0,6` porażenia jako `react` |
| Para `steam` | Zalewnia trafia Podpalonego | gasi; chmura ≤ 1,5 pola: 12 strachu (`steam`) i oślepienie 3 s |
| Powstanie `rise` | Zarażony umiera | wstaje jako Twój zombie (`temp`, 120 HP) na najbliższym wolnym polu podłogi swojego pokoju; najwyżej 2 na falę (`fl.risenZ`) |

`reaction(h, k)`: duży napis i iskry w kolorze reakcji, `addPts(0,3 × depthMult(h.room), 'reactPts', h)` (raz na bohatera), `stats.reactions[k]`, `stats.reactN`, oś czasu `re`; krok combo raz na odpalenie elementu (`fl.firing` i ten sam czas), gdy okno combo trwa albo reakcję wywołało odpalenie: `fl.combo++` (do 7) i odświeżenie okna; Reakcja łańcuchowa: okno +1 s i jeszcze +1 krok za kopię. Pierwsza reakcja w fali: karta "reaction". Obrażenia reakcji (`kind 'react'`) nie wywołują kolejnych reakcji i nie mają mnożników statusów.

Nowy typ obrażeń `shock` (porażenie, `DMG_TYPES`), źródło: Runa piorunów. Zbroja z łupu: porażenie ×(1 + 0,05 × r). Odporności klas i ciał: sekcja 04, 4.3 i 4.4.

### 5.14.3 Poziom 3: cecha A albo B (`TRAITS`, `TRAITS_B`, `it.branch`)

```
t3(it)  = (lvl >= 3 && it.branch !== 'B') || inKind(it)     // cecha A: dawna; komnata daje ją za darmo
t3B(it) = lvl >= 3 && it.branch === 'B'                     // cecha B: tylko kupiona ulepszeniem
upgradeItem(it, branch): przy wejściu na poziom 3 it.branch = branch === 'B' && TRAITS_B[typ] ? 'B' : 'A'
```
Ulepszenie z poziomu 2 elementu z `TRAITS_B` otwiera okno wyboru (`renderBranch`, sekcja 08); bez wyboru (np. stare testy) wychodzi A. Element w komnacie z cechą B ma obie cechy. Wyboru nie da się cofnąć (poza zdjęciem elementu). Wszystkie 43 elementy z poziomami (25 pułapek bez Przynęty i 18 potworów) mają obie cechy:

| Element | A (`TRAITS`) | B (`TRAITS_B`) i jak działa w kodzie |
|---|---|---|
| spikes | Krwawienie 3 s | Zadziory: trafiony Unieruchomiony 1 s |
| arrows | Przebijające groty | Zatrute groty: +1 stos trucizny za trafienie |
| fire | Napalm (podpalenie 6 s) | Ściana ognia: najbliższe drzwi pokoju zamknięte na 3 s, 10 strachu każdemu w 2 polach od drzwi (`fireWall`) |
| web | Kwaśna sieć | Kokon: złapany 4 s bez przedmiotów (`noItemUntil`) |
| trapdoor | Bezdenny szyb | Kolce na dnie: rana upadku ×3 i krwawienie 4 s |
| cage | Kolczasta klatka | Pułapka na ratownika: uwalniający po otwarciu Unieruchomiony 3 s |
| portrait | Całun grozy | Oczy śledzą: przestraszony Naznaczony 8 s |
| gate | Żelazna krata (+2 zamknięcia) | Gilotyna: miażdżenie ×2, odcięci samotni 8 s |
| powder | Ognisty proch | Odłamki: wszyscy w wybuchu krwawią 3 s |
| mimic | Pożeracz | Zachłanny: podnoszący łup w promieniu 1 dostaje ugryzienie z mocą 2 |
| eyes | Wszystkowidzące | Wzrok bazyliszka: przestraszony Spowolniony 2 s |
| bones | Kostnica (5×5) | Grzechot: atrybut strachu `rattle` (fobia hałasu), nowicjusze ×2 |
| mirror | Krzywe zwierciadło | Odbicie: następny strach ×1,2 przez 8 s (raz); od 1.26.1 tylko strach co najmniej 3 (`amt >= 3`), więc drobne tyknięcia strachu go nie zużywają |
| creak | Trzask | Skrzyp nocy: 7,5 × pw strachu w sąsiednich pokojach |
| coffin | Pogrzebany żywcem | Wieko: najbliższy Unieruchomiony 2 s |
| musicbox | Kołysanka śmierci (8 s) | Usypianka: ranny < 60% zasypia 3 s |
| goblin | Podcięcie | Łupieżca: zabity przez niego (walka albo zdolność) zostawia stos łupu (2 monety) |
| archer | Ogniste strzały | Zatrute strzały: +1 stos trucizny (zdolność i strzał bierny) |
| spider | Gniazdo (sieć 3×3) | Jad paraliżujący: ukąszony zdolnością Unieruchomiony 1,5 s |
| ogre | Grzmot | Rzut: trafiony zdolnością (nie boss, nie w klatce) ląduje w losowym sąsiednim pokoju, nie-przywódca gubi się (nowicjusz 70%, inni 40%), 12 strachu, `stats.ogreThrows` |
| shaman | Tarcza ducha | Klątwa: zdolność przeklina bohaterów w pokoju na 8 s (+20% obrażeń, uspokajanie ×0,5) |
| ghost | Wycie | Nawiedzenie: bierze cele do 7 pól także poza pokojem i wychodzi za nimi |
| shade | Pożeracz światła | Szept: cel szeptu traci 15% odwagi (raz na falę) |
| bats | Chmara | Wampiry: obrażenia zadane zdolnością leczą inne potwory w pokoju |
| pendulum | Podwójne: drugi zamach 50% po 0,6 s | Ścięcie: krytyk (wynik checku `basePw >= mods.critPw`, nie moc po mnożnikach) = krwawienie 4 s |
| snare | Zębate: krwawienie 3 s | Łańcuch: najbliższy sojusznik w 3 polach Unieruchomiony 2 s |
| miasma | Gęste: chmura 8 s | Łzawiące: w chmurze bez wykrywania pułapek |
| oilslick | Łatwopalna: Oblany przez tę plamę (`h.oilA`) przy każdym trafieniu pułapki ma 15% szansy na podpalenie 3 s (`damage`, napis "Zapłon!"; w kodzie 1.26.1 działa, wcześniejsza wersja tej specyfikacji podawała, że nie) | Śliska: poślizg 50% |
| bolt | Burza: przeskok na suchych (50%, ×0,6, najwyżej 3 trafienia) | Przeciążenie: co 3. odpalenie ogłusza cel 2 s |
| flood | Topiel: strefa spowolnienia na 12 s | Lodowata woda: uspokajanie ×0,5 przez 8 s |
| bell | Requiem: +0,5 Grozy za każdego, kto usłyszy dzwon | Namaszczenie: skill check leczy wszystkie potwory w lochu o 20% |
| falsedoor | Labirynt: zgubienie 18 s | Pętla: bohater wraca do 3 pól w tył swoją drogą |
| tar | Wrzątek: podpalenie 4 s | Smoła: spowolnienie 6 s |
| skeleton | Legion: składa się 2 razy | Kościany pancerz: obrażenia (poza magiem) ×0,6 |
| zombie | Epidemia: co 4 s zaraza przeskakuje na sąsiadów | Gnijące mięso: powalony daje walczącym 3 stosy trucizny |
| lich | Filakteria: powalony nie dodaje głodu | Armia: podnosi 2 razy |
| imp | Kleptoman: 2 przedmioty, okradziony Naznaczony 8 s | Podpalacz: skradziony przedmiot wybucha (15 × D ognia), nie spada jako łup |
| hound | Sfora: +25% za każdego innego ogara w lochu | Piekielny ogień: zdolność i walka podpalają 3 s |
| siren | Pocałunek: odwaga uwiedzionego ×0,8 | Zazdrość: morale drużyny -0,1 |
| demon | Pan otchłani: inne Demony otchłani +25% | Głód krwi: -3 głodu następnej fali za jego zabójstwo (bierne) |
| sapper | Proch: jedna kolczatka na falę to bomba (40 × D × pw ognia w 3×3) | Zwijacz: raz uzbraja wyłączoną pułapkę w pokoju |
| warlord | Wódz: aura także w sąsiednich pokojach | Grabież: zabity w jego pokoju zostawia stos łupu |
| rats | Wścieklizna: zdolność i walka zarażają | Nora: powalony dzieli się na 2 małe roje (35 HP, `temp`) |

### 5.14.4 Nowe pułapki (`p4_traps.js: fireRaw`; obszary `p2_state_map.js: areaOf`)

Wartości przy `pw = 1`, `D = 0,7`. Wszystkie odblokowuje karta `u-<id>` (cena 7, sekcja 03, 5.2).

| Typ | Nazwa | Slot, koszt, cd | Obszar | Działanie | Rodzina, komnata | Kształt |
|---|---|---|---|---|---|---|
| `pendulum` | Wahadło | ściana, 4, 4 s | pas 3 pól szerokości i 4 w głąb od ściany | `45*D` = 31,5 kłute każdemu ×cpow; ×1,5 trzymanym (jak kolce) | Mechanizmy, Zbrojownia | swing |
| `snare` | Wnyki | podłoga, 3, 8 s | pole | pierwszy na polu: `25*D` = 17,5 kłute + Unieruchomiony 5 s (draśnięcie, wynik checku `basePw < 1`: 3,5 s); kwestia `snare`; od 1.26.1 rozbrajanie ×1,5 (jak strzały, ogień i proch) | Mechanizmy, Więzienie | pulse |
| `miasma` | Wyziewy | podłoga, 5, 7 s | 3×3 | trafieni: +1 stos trucizny, `10*pw` strachu ×cpow; chmura (`fl.clouds`) 5 s: wejście +1 stos i 10 strachu (raz na chmurę), potem +1 stos co 1,5 s; od 1.26.1 trafieni przy odpaleniu są od razu w `seen` chmury (bez drugiego stosu za "wejście"), a ich zegar `cloudT` startuje od 0 | Alchemia, Laboratorium | spiral |
| `oilslick` | Plama oleju | podłoga, 4, 6 s | 3×3 | Oblany 8 s, Spowolniony 1,5 s | Ogień, Kuźnia | ring |
| `bolt` | Runa piorunów | ściana, 5, 4 s | pola pokoju przed ścianą do 3 | najbliższy: `22*D` = 15,4 porażenia; każdy inny Mokry w pokoju też dostaje piorun | Alchemia, Laboratorium | double |
| `flood` | Zalewnia | podłoga, 4, 10 s | cały pokój | Mokry 8 s, Spowolniony 2 s, `6*pw` strachu; podpalony: Para | Alchemia, Laboratorium | pulse |
| `bell` | Dzwon żałobny | mebel, 4, 8 s | 3×3 | z checku `10*pw` strachu; biernie przy każdej śmierci bohatera w lochu `24 × (liczba dzwonów, najwyżej 2) × famK` strachu każdemu żywemu (`killHooks`, atrybut `bell`), `stats.bellTolls`; przeklęty (kapłan go odczyni) | Nieumarli, Cmentarz | fuse |
| `falsedoor` | Fałszywe przejście | drzwi, 4, 10 s | drzwi + sąsiednie pola | pierwszy, kto nie był już nabrany przez to przejście (bez maga 8+ i bossa): `10*pw` strachu; nie-przywódca albo przywódca bez drużyny gubi się na 12 s (`fdLostUntil`, potem odnajduje drużynę); przywódca z drużyną tylko skręca źle i przeplanowuje | Nawiedzenie, Galeria | double |
| `tar` | Kocioł smoły | drzwi, 5, 10 s | drzwi + sąsiednie pola | najbliższy: `25*D` = 17,5 ognia (bez podpalenia), potem Oblany 8 s i Spowolniony 3 s | Ogień, Kuźnia | fuse |
| `bait` | Przynęta | podłoga (łup), 3 | pole | wygląda jak Monety (chciwość z widzenia jak `gold`); podnoszący: `20*D*pw` kłute, Unieruchomiony 3 s, pobliscy (≤ 3) 8 strachu; przynęta zostaje, odnowienie 6 s (`baitBite`) | Skarby, bez komnaty | (nie `ACTIVE`, bez checku) |

Wszystkie nowe pułapki poza dzwonem i przynętą są w `DISARMABLE`. Obszar wahadła rysuje się na podłodze jak strzały (`WALL_TRAP`).

### 5.14.5 Nowe potwory (`fireRaw`, `monstersTick`, `newMonsterTick`, `driftTick`, `monsterDown`)

| Typ | Nazwa | Koszt, HP, wręcz/s, cd | Zdolność (pw = 1) | Biernie | Rodzina, komnata | Kształt |
|---|---|---|---|---|---|---|
| `skeleton` | Szkielet | 4, 70, 12 kłute, 4 s | `20*D*power` jednemu obok (walczącemu) | Składanie: przy powaleniu, jeśli `reN < (A ? 2 : 1) + mods.bonesUp` i nie dobił go paladyn, kapłan ani barbarzyńca w furii, wstaje po 5 s z 50% HP | Nieumarli, Cmentarz | swing |
| `zombie` | Zombie | 5, 170, 8 trucizna, 5 s | `15*D*power` + 2 stosy trucizny jednemu obok | Zaraza: walczący z nim +1 stos zarazy co 1,5 s | Nieumarli, Cmentarz | swing |
| `lich` | Licz | 9, 120, 4 obuchowe, 6 s | `25*D*power` + Spowolniony 2 s każdemu do 2 pól w pokoju | aura 8 strachu/s do 2 pól w pokoju; raz (B: 2 razy) podnosi powalonego (nie unoszącego się, nie `temp`) potwora swojego pokoju z 50% HP | Nieumarli, Cmentarz | double |
| `imp` | Chochlik | 3, 40, 0 (unosi się), 6 s | Zwędzenie: cel z przedmiotami (losowy) 20 × pw strachu, zabiera przedmiot i upuszcza go na losowym polu innego pokoju (nie pokoju serca) jako łup | aura 4/s do 1,6; po trafieniu 50% unik teleportem (odnowienie 2 s) | Demony, Wrota otchłani | double |
| `hound` | Ogar piekielny | 5, 90, 28 ogień, 5 s | Pogoń: najbardziej przestraszony w pokoju `30*D*power × houndK` | uciekający i panikujący dostają od niego ×2 (Piekielna sfora ×3); zabicie takiego w walce daje też Grozę ucieczki; od 1.26.1 trop krwi (`houndTrack`, 5.15.2) | Demony, Wrota otchłani | swing |
| `siren` | Kusicielka | 6, 60, 0 (unosi się), 9 s | Zew: najmniej odważny w zasięgu 4 (nie paladyn, nie boss) Uwiedziony 4 s; przerywa to kapłan, paladyn albo śpiewający bard w jej pokoju ("Zew przerwany") | aura 5/s do 2 | Demony, Wrota otchłani | double |
| `demon` | Demon otchłani | 10, 420, 28 ogień (wszystkim walczącym), 6 s | Pożoga: `40*D*power × demonK` każdemu w pokoju + podpalenie 3 s | aura 6/s do 2,5; Apetyt: dopóki stoi w lochu (nie `temp`), głód każdej fali +2 (Pakt z otchłanią +1) | Demony, Wrota otchłani | swing |
| `sapper` | Goblin saper | 5, 80, 8 kłute, 8 s | Kolczatki: do 3 wolnych pól obok bohaterów w obszarze, najwyżej 9 kolczatek tego sapera w fali; wejście: `15*S.dmg*pw` kłute i Spowolniony 1,5 s (`hazardsTick`) | od 1.26.1 chowa się za innymi potworami (5.15.2) | Zielonoskórzy, Goblinia nora | bar |
| `warlord` | Herszt goblinów | 7, 160, 14 obuchowe, 5 s | Okrzyk: `30*D*power` i `15*pw` strachu każdemu w pokoju | zielonoskórzy (goblin, szaman, saper, herszt, łucznik, ogr) w jego pokoju ×1,5 (`warlordK`); po powaleniu goblina w jego pokoju szał 6 s (×1,5 więcej) | Zielonoskórzy, Goblinia nora | swing |
| `rats` | Rój szczurów | 3, 35, 6 kłute (wszystkim walczącym), 4 s | Zalew: `8*D*power × ratsK` każdemu w pokoju | Rośnie: po fali bez powalenia `grow` +1 (najwyżej 3), HP i obrażenia ×(1 + 0,8 × grow); powalony wraca do 0 | Bestie, Gniazdo | pulse |

Chochlik i kusicielka są w `DRIFT` (unoszą się, nie blokują, rani je kula ognia, święte światło, aura paladyna i strzał tropiciela). Kwestie i wejście do nowych komnat: sekcja 06.

### 5.14.6 Odrodzenie (`hurtMonster`, `monsterDown`)

```
hurtMonster(m, dmg, by):
  ... (chochlik: 50% unik; szkielet B ×0,6; Tarcza ducha ×0,7)
  m.hp -= dmg
  if m.hp <= 0: m.hp = 0; stats.monstersLost++; bt(typ).died++; tl('mn', ...)
     if m.temp: usuń z fl.items                                  // duch z Krypty, zombie z Powstania, szkielet z armii, małe roje
     else: m.down = true; m.downR = realNow; m.foeT = 0; monsterDown(m, by)
     m.grow = 0 (rój); karta "revive" (raz w przeglądarce); ciało jak dotąd; napis "<Nazwa> na ziemi (wstanie, +1 głodu)"
monsterDown(m, by): Składanie szkieletu (wtedy wstaje po 5 s, bez powalenia na stałe w tej fali; `monsterTick` przy `hp <= 0` woła dla takiego szkieletu `newMonsterTick`, który po `reAt` stawia go z 50% HP); Gnijące mięso zombie (B);
                    Nora szczurów (B); goblin w pokoju herszta: herszt w szał na 6 s
```
Powalony potwór nie odpala, nie walczy i nie leczy się (wszędzie `hp > 0`), rysuje się leżący (sekcja 08). `setupFl` stawia go w następnej budowie z pełnym HP. Za każdego powalonego (bez `temp`, bez licza z Filakterią) głód następnej fali +1 (sekcja 03, 2.7).

### 5.14.7 Śmierć bohatera w 1.26 (`killHooks`, wołane w `kill`)

- Dzwon żałobny (5.14.4) i Requiem.
- Powstanie: `h.plague > 0` i mniej niż 2 w fali: `riseZombie(h)`.
- Polowanie: zabójca to ogar (`h.killer`: z walki, a po przeglądzie 1.26 także ze zdolności odpalonej checkiem, `fl.firing`) i ofiara uciekała albo panikowała: dodatkowo `addPts(GZ.scare × mods.scareMult, 'scarePts')`, `stats.houndHunt`.
- Nieśmiertelna armia: zabójca z rodziny Nieumarłych, najwyżej 3 w fali: `riseZombie(h, 'skeleton')` (90 HP, `temp`).
- Głód krwi: zabójca to demon z cechą B: `run.bloodHunger = { w: fala + 1, n: +3 }`.
- Grabież: żywy herszt z cechą B w pokoju zmarłego: dodatkowy stos łupu (2 monety).
- Łupieżca goblina (B): zabity przez goblina (walka albo Podcięcie z checku) zostawia stos łupu (w `kill`).

### 5.14.8 Rodziny i Runy rodów (`FAMILIES`)

| id | Nazwa | Elementy | Znak, kolor |
|---|---|---|---|
| `mech` | Mechanizmy | spikes, arrows, pendulum, snare, gate, trapdoor, cage, mimic | ⚙ `#c9d5e2` |
| `fire` | Ogień | fire, powder, oilslick, tar | ♨ `#ffa65c` |
| `alch` | Alchemia | miasma, flood, bolt | ⚗ `#9fe0c8` |
| `haunt` | Nawiedzenie | portrait, eyes, mirror, creak, musicbox, falsedoor, ghost, shade | ✧ `#a6e8ff` |
| `undead` | Nieumarli | bones, coffin, bell, skeleton, zombie, lich | ☠ `#c9d4b0` |
| `beast` | Bestie | web, spider, bats, rats | ✳ `#d4cbe8` |
| `green` | Zielonoskórzy | goblin, archer, shaman, ogre, sapper, warlord | ♣ `#a7d060` |
| `demons` | Demony | imp, hound, siren, demon | ⛧ `#ff7a5a` |
| `treasure` | Skarby | loot, lpotion, loot2, loot3, lcursed, bait | ◆ `#f2b94b` |

Poziom rodziny `run.famLv[f]` (0-5, Runa rodu w sklepie, sekcja 03, 3.16): `famK(t) = 1 + 0,08 × poziom` mnoży moc pułapek i zdolności (`fireRaw`), ciosy potworów (`monDmg`), dzwon żałobny i przynętę; Skarby: chciwość z widzianego łupu; od 1.26.1 także czas statusów nakładanych przez element rodziny (`setStatus`, bez unieruchomienia, 5.15.3). `cdOf` -4% na poziom. Rodziny liczą się też w Pełnej palecie (`fl.famN`), stylu gildii "holy" (nieumarli i demony) i Przesądnym (Nawiedzenie). Rodzina (`FAMILY_OF`) nie jest tym samym co komnata (`KIND_OF`): np. łucznik jest w rodzinie Zielonoskórych, a w komnacie Kaplica czaszek.

### 5.14.9 Zmiany liczb istniejących elementów (plan 6.1-6.5)

| Element | 1.25.1 | 1.26 |
|---|---|---|
| Kolce, strzały | koszt 3 | 4 |
| Zapadnia | koszt 6 | 4, lądowanie Oszołomiony 3 s |
| Krata | koszt 4, zamknięcie 4 s | 3, zamknięcie 6 s i Rozdzielenie (5.3.9) |
| Lustro | `12 × (...)` | `16 × (...)` |
| Zawiasy | 24 / 12 | 30 / 15 |
| Trumna | koszt 5, 36 / 14, cd 9 | 4, 50 / 20, cd 7 |
| Pozytywka | 6 + `5*pw`/s, cd 9 | 12 + `7*pw`/s, cd 8 |
| Goblin | HP 110, wręcz 14 | 140, 16 |
| Pająk, szaman | koszt 5 | 4; pająk zdolnością +1 stos trucizny |
| Szaman | leczenie się sumuje, Groza 0,02 | najsilniejszy, limit 100% max HP na falę, Groza 0,1 |
| Duch | aura 10/s, zdolność 40 | 12/s, 50 |
| Cień | zdolność 30 | 40 |
| Nietoperze | koszt 4, zdolność 16 | 3, 20 |
| Mikstura (łup), Relikwia | 4, 10 | 3, 8 |
| Kolejny łup tego samego typu | ×1,25 | ×1,15 |
| Budowle | runa i ołtarz 14, kwas, zasłona, wyjec, okowy 12, wabik, bastion 10 | runa i ołtarz 10, kwas, wyjec, okowy, bastion 8, wabik, zasłona 6 (dodatki: 5.5.2) |
| Efekty pokoi | 8 albo 10 | 8 |
| Komnata | 12 (zwrot 6) | 10 (zwrot 5) |
| `MON_FACTOR`, `DMG_FACTOR.monster` | 0,4 | 0,8 |

Tooltip łupu w pasku budowy (`showTip`) mówi "+15% ceny" za każdy kolejny, zgodnie z `LOOT_STEP` 1,15 (w pierwszej wersji 1.26 było "+25%").

### 5.14.10 Karty statusów i rodzin (1.26, efekty w kodzie)

| Karta | Gdzie w kodzie | Efekt |
|---|---|---|
| Smoła i siarka (`tarSulfur`) | `damage` | Oblany: kłute ×(1 + 0,3) |
| Przewodnictwo (`conduct`) | `reactHit` | Porażenie przeskakuje też na Spowolnionych w pokoju |
| Toksyczny opar (`toxicCap`, `toxicDet`) | `POISON_CAP`, `reactHit` | limit stosów 10, Detonacja ×1,25 |
| Morowe powietrze (`plagueAir`) | `plagueAirTick` | co 3 s +1 stos zarazy każdemu w 1,5 pola od Zarażonego |
| Piekielna sfora (`hellPack`) | `houndK`, `updateHero` | Polowanie ×3, uciekający i panikujący ×0,8 prędkości |
| Kości niezłomne (`bonesUp`) | `monsterDown`, `monDmg` | +2 złożenia, szkielet po złożeniu ×1,2 |
| Nieśmiertelna armia (`undyingArmy`) | `killHooks` | zabity przez nieumarłego wstaje jako szkielet (najwyżej 3 w fali) |
| Pakt z otchłanią (`abyssPact`) | `hungerParts`, `monDmg` | Apetyt +1 zamiast +2, demony (cała rodzina) ×1,2 w walce |
| Podwójne ostrze (`doubleEdge`) | `fireRaw` (kolce) | drugi cios 50% Unieruchomionym i Spowolnionym |
| Echo serca (`heartEcho`) | `fireRaw` | pierwsza pułapka po nasyceniu odpala dwa razy |
| Puls serca, Ostatni oddech, Strażnik | `heartK`, `monDmg`, `startWave`; od 1.26.1 też `trapBoost` dla potworów | sekcja 03, 3.9; od 1.26.1 wzmacniają także zdolności potworów odpalane checkiem (5.15.3) |

### 5.14.11 Różnice wobec planu w tej sekcji (do decyzji autora)

Zrobione w 1.26.1 (szczegóły w 5.15): Plama oleju A działa (15% na podpalenie przy trafieniu pułapki), Wnyki rozbraja się ×1,5, ogar idzie za Krwawiącym do sąsiedniego pokoju, goblin saper chowa się za innymi potworami, oślepiony nie uczy się pułapek, Wyziewy nie dają drugiego stosu przy odpaleniu, Pożar i Runa rodu wydłużają statusy. W kodzie 1.26.1 `setupFl` zeruje też liczniki potworów `m.raised`, `m.reN`, `m.reAt`, `m.rangerHit` i `it.rewound` (licz podnosi, szkielet się składa i Zwijacz działa raz na falę), a tooltip łupu mówi "+15% ceny".

Zostaje:
- `it.boltN` (licznik Przeciążenia runy piorunów B) nie jest zerowany między falami, więc co trzecie odpalenie liczy się przez cały run, a nie od początku fali.
- Krwawy księżyc mnoży obrażenia potworów także w ich zdolnościach (`omenPow` w `fireRaw`), plan mówił ogólnie "potwory +30% obrażeń", więc zgodne; czaszka tego nie liczy (5.11, punkt 21).

## 5.15 Prototype 1.26.1: Ukryte przejście, brakujące zachowania potworów, poprawki zasad (`p1_config.js: ITEMS.secret, TABS, TOOLS, START_UNLOCKED, ONB_ITEM`; `p3_flow.js: toolCost, toolMarkers, secretOk, applyTool, secretFind`; `p2_state_map.js: secretShut, passable`; `p4_traps.js: houndTrack, trapBoost, setStatus, reactHit, hazardsTick`; `p5_ai.js: heroAI126, sapperCovered, newClassTick`)

Lista zmian 1.26.1 opisana w kodzie komentarzami "1.26.1". Wykrywanie ukrytego przejścia przez bohaterów: sekcja 06, 6.16.12; mapa, ścieżki i zapis: sekcja 07, 7.14; rysowanie: sekcja 08, 6.14b.

### 5.15.1 Ukryte przejście (narzędzie)

| Pole | Wartość |
|---|---|
| `ITEMS.secret` | `name 'Ukryte przejście'`, `cost 6`, `slot 'hall'` (`SLOT_LABEL.hall` = "przejście między pokojami"), `tag 'fałszywa ściana'`, `tool: true` |
| Gdzie w pasku | zakładka Loch, podzakładka Kopanie, po Tunelu (`dig, tunnel, secret, expand, demolish`) |
| Dostępność | w `START_UNLOCKED` (bez karty odblokowania), w `TOOLS`; `ONB_ITEM.secret = 3`, czyli od 3. etapu nauki |

Działanie: narzędzie oznacza istniejące przejście między dwoma pokojami (krawędź `L.edges`, klucz `edgeKey(a, b)`) jako fałszywą ścianę: `e.secret = true`. Przy budowie lochu z układu oba końce korytarza (drzwi przy pokoju A i przy pokoju B) dostają `d.secret = e.key`, a korytarz `hall.secret = true`. Dla bohaterów (i dla ścieżek potworów) takie drzwi są ścianą, dopóki ktoś ich nie odkryje (sekcja 07, 7.14).

```
toolCost('secret', m) = m.has && !m.known ? 0 : 6              // zdjęcie maski nieznanego przejścia za darmo, bez zwrotu
toolMarkers('secret'): każdy korytarz (R.kind === 'hall') z krawędzią w układzie;
    przejście jeszcze nie ukryte tylko wtedy, gdy secretOk(L, R.key); znacznik na środkowym polu korytarza
    { tool, edge, has: e.secret, known: e.secret && e.secretKnown }
secretOk(L, ek): krawędzie bez ek i bez innych ukrytych; layoutDist(wejście, te krawędzie) dochodzi do serca
applyTool (secret):
    has && !known: e.secret = false, e.secretKnown = false; "Maska zdjęta: zwykłe przejście."
    has || secretOk: e.secret = true, e.secretKnown = false; forgetTiles(pola korytarza); stats.secretMade++;
                     "Ukryte przejście: bohaterowie widzą tu ścianę, dopóki go nie odkryją."
    inaczej: "Do serca musi zostać jawna droga."
    po zmianie rebuildDungeon(true)
```
- Ponowne maskowanie przejścia, o którym bohaterowie wiedzą z plotek (`secretKnown`, 07, 7.14), kosztuje 6 i kasuje tę wiedzę.
- `forgetTiles` usuwa pola korytarza z plotek (`run.rumor.tiles`), jak przy kopaniu: następna drużyna nie zna tego korytarza z opowieści.
- `secretOk` jest sprawdzane tylko przy maskowaniu. Zasypanie przejścia albo pokoju (`canDemolishEdge`, `canDemolishRoom`) sprawdza tylko spójność lochu i nie patrzy na ukryte przejścia, więc później da się zostawić do serca wyłącznie ukrytą drogę (sekcja 11).
- Odkryte przejście jest w tej fali zwykłym przejściem; w następnej znowu jest ukryte, chyba że ktoś o nim opowiedział (07, 7.14).

### 5.15.2 Potwory: ogar, saper, szkielet

**Ogar piekielny: trop krwi** (`houndTrack(m, room, dt)`, z `newMonsterTick` dla żywego ogara, co krok):
```
jeśli m.walking:
    stop, gdy cel martwy, wyszedł, zniknął, fl.time > hunt.until albo ścieżka pusta (m.walking = false, gx, gy na środek pola)
    ruch po ścieżce 2,6 pola/s (m.gx, m.gy); na końcu ścieżki (odroczone do następnego kroku):
        jeśli ogar dalej stoi na swoim polu w fl.items, a pole docelowe jest wolne i przechodnie:
            pierwszy raz w fali zapamiętaj dom (homeX, homeY); przenieś ogara na pole docelowe; threatDirty
            stats.houndTrack++, napis "Ogar na tropie!"
    return
co 1 s (m.huntCd):
    nikt żywy w pokoju ogara
    cel = pierwszy żywy Krwawiący w sąsiednim pokoju (nbrRooms), w odległości <= 9 pól od ogara
    pola docelowe: 8 pól wokół celu, w jego pokoju, przechodnie, bez elementu, slot podłogi
    BFS z pola ogara (noDanger); najbliższe pole docelowe; brak albo dalej niż 16 kroków: nic
    m.walking = true; m.hunt = { id celu, until: fl.time + 8, path }; napis "Ogar węszy krew!"
```
W trakcie biegu ogar logicznie stoi na starym polu (`m.x, m.y`), a rysuje się w `gx, gy` (sekcja 08). Zostaje w nowym miejscu do końca fali; `setupFl` w następnej budowie odstawia go na `homeX, homeY` (gdy to pole jest wolne) i kasuje `homeX`, `walking`, `hunt`.

**Goblin saper: chowa się za innymi potworami**:
- walka wręcz (`monstersTick`): gdy na polu obok sapera (odległość Czebyszewa <= 1) stoi inny żywy, nie powalony potwór, który nie jest saperem, obrażenia zadane saperowi w walce ×0,6;
- `sapperCovered(m)`: w pokoju sapera jest inny żywy, nie powalony potwór, który nie jest saperem. Wtedy mag celuje kulą ognia w sapera tak, jakby był 2,5 pola dalej (wybiera go na końcu), a tropiciel w ogóle do niego nie strzela (6.16.3 w sekcji 06). Od 1.26.1 tropiciel nie strzela też do powalonych potworów.

**Szkielet**: Składanie działa także wtedy, gdy szkielet leży (`monsterTick` przy `hp <= 0` woła dla niego `newMonsterTick`, 5.14.6).

### 5.15.3 Poprawki zasad

| Co | 1.26 | 1.26.1 (kod) |
|---|---|---|
| Wnyki: rozbrajanie | ×1 | ×1,5 jak strzały, ogień i proch (`disarmJob`, `grudgeJob`: `h.timer`) |
| Flaszka alchemika na strefę albo chmurę | kończy ją od razu (`until = teraz`) | wyłącza ją na 6 s (`z.offUntil = teraz + 6`, pola i klucze odłożone do `keysOff`, `tilesOff`, strefa pusta); `hazardsTick` przywraca ją po 6 s, jeśli dalej trwa; alchemik nie celuje w strefę już wyłączoną |
| Oślepienie (Para, Łzawiące wyziewy) | blokuje wykrywanie | blokuje też naukę: oślepieni nie są świadkami odpalenia (`witnesses` w `fireRaw`) |
| Pożar | podpalenie stałe 6 s | `burnUntil = teraz + max(6, 2 × pozostały czas podpalenia)` |
| Wyziewy, pierwszy kontakt | trafieni przy odpaleniu dostawali drugi stos za "wejście" do chmury | trafieni są od razu w `seen` chmury, `cloudT = 0`: jeden stos przy odpaleniu, kolejny po 1,5 s w chmurze |
| Runa rodu a statusy | czas stały | `setStatus` mnoży czas przez `famK(typ źródła)`, gdy źródło jest elementem (`ITEMS`), poza unieruchomieniem (`root`, dalej limit 5 s) |
| Karty i Strażnik a zdolności potworów | `trapBoost` = 1 dla potworów | `trapBoost(potwór) = kataK × heartK × (Strażnik w pokoju serca ? 1 + warden : 1)`: Pamiętnik kata, Puls serca, Ostatni oddech i Strażnik mnożą też moc zdolności odpalanej checkiem (`fireRaw`); walka wręcz (`monDmg`) miała je już w 1.26 |
| Plama oleju A | opis: nie działa | Oblany przez plamę z cechą A (`h.oilA`) przy trafieniu pułapki: 15% na podpalenie 3 s (`damage`, "Zapłon!") |
| Lustro B (Odbicie) | zużywał je każdy strach | tylko strach co najmniej 3 (`amt >= 3` w `addFear`) |

Podsumowanie fali (część serca `min(need, fl.fed)`, "dla Ciebie" bez Daniny) i `FUSE_INT`: sekcja 03 (1.9, 3.13).
