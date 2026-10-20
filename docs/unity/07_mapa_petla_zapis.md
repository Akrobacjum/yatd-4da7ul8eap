# 07. Mapa, budowanie, pętla gry, zapis i dane testowe

Ta sekcja opisuje: model lochu (układ komórek i mapę kafelków), zasady budowania i narzędzia lochu, główną pętlę symulacji, zapis gry i ustawień oraz dane testowe (telemetrię) prototypu "Prototype 1.12.1". Źródłem prawdy jest kod w `src/`. Każda reguła ma odnośnik `plik.js: funkcja`.

Sąsiednie sekcje (tu tylko odnośniki, bez powtórzeń):
- sekcja 03: przebieg runu i fali, ekonomia (Groza, Chciwość, Combo, Esencja, głód serca), sklep, talia, plotki, wyłom (kiedy), gildia;
- sekcja 04: generowanie bohaterów i fal;
- sekcja 05: pułapki, potwory, obrażenia, strach, skill checki, obszary działania poszczególnych pułapek (szczegóły);
- sekcja 06: AI bohaterów, ścieżki, wiedza drużyny, mowa;
- sekcja 08: UI, kamera izometryczna, grafika, wysokości ścian, dźwięk, samouczek.

Tabele treści są w `data/` (w repo docelowo `docs/unity/data/`): `ITEMS.json`, `OBJ_KINDS.json`, `TOOLS.json`, `ROOMTYPES.json`, `RT_INFO.json`, `MODES.json`, `BUILDINGS.json`, `UPG_COST.json`, `DEFAULTS.json`, `GAME_SETTINGS.json`, `SLIDERS.json`, `SLOT_LABEL.json`, `TABS.json`, `START_UNLOCKED.json`, `HEART.json`, `ROCK.json`, `CGX.json`, `WW.json`. Stałe zdefiniowane poza `p1_config.js` są wypisane tutaj w całości.

Konwencja: "tylko prototyp" oznacza mechanizm, który istnieje wyłącznie dla wersji przeglądarkowej albo testów; obok jest jednozdaniowy odpowiednik dla Unity.

---

## 7.1 Stałe, współrzędne i pomocnicze funkcje

| Stała | Wartość | Źródło | Znaczenie |
|---|---|---|---|
| `CGX`, `CGY` | 4, 5 | `p1_config.js` | rozmiar siatki komórek, w której powstaje startowy loch (`inStart`) |
| `CELL` | 8 | `p1_config.js` | bok komórki w kafelkach |
| `WW`, `WH` | start `(CGX+2)*CELL+1 = 49`, `(CGY+1)*CELL+1 = 49` | `p1_config.js`, przeliczane w `p2_state_map.js: regrid` | szerokość i wysokość mapy kafelków; zmienne globalne (`let`) |
| `ROCK`, `WALL`, `FLOOR`, `DOOR` | 0, 1, 2, 3 | `p1_config.js` | rodzaje kafelków |
| `DIRS` | `[[1,0],[-1,0],[0,1],[0,-1]]` | `p1_config.js` | 4 kierunki; KOLEJNOŚĆ ma znaczenie (pierwszy pasujący kierunek wygrywa w `slotRoom`, `portrait`, `mirror`) |
| `DIRS8` | 4 kierunki + `[1,1],[1,-1],[-1,1],[-1,-1]` | `p1_config.js` | 8 kierunków (ściany, mimik, `itemAt`) |

Współrzędne:
- kafelek `(x, y)`, indeks w tablicach płaskich `i = y * WW + x`;
- klucz kafelka `key(x, y) = x + ',' + y` (`p2_state_map.js`), używany w `fl.items`, `fl.objects`, `fl.doors`, `run.rumor.traps`;
- komórka `(cx, cy)` obejmuje kafelki `cx*CELL .. cx*CELL+7` i `cy*CELL .. cy*CELL+7`; klucz `cellKey(cx, cy) = cx + ',' + cy`, `parseCell(k)` to odwrotność;
- krawędź (korytarz) między komórkami `a`, `b`: `edgeKey(a, b) = a < b ? a + '|' + b : b + '|' + a` (porównanie NAPISÓW, chodzi tylko o kanoniczną kolejność);
- `tileAt(x, y)` poza mapą zwraca `ROCK`; `roomOf(x, y)` poza mapą zwraca -1.

Pomocnicze (wszystkie na `Math.random`, patrz 7.10.7): `rand(a, b)` całkowita z przedziału domkniętego, `pick(a)` losowy element (`p1_config.js`), `shuffle(a)` Fisher-Yates, `clamp`.

`HEART`, `LOOTTRAP`, `BURN` w `p1_config.js` to NIE kafelki ani serce na mapie, tylko obiekty-źródła obrażeń (`{kind: 'heart'}` itd., sekcja 05). Serce na mapie to `fl.heart`.

---

## 7.2 Model lochu: `run.layout` (żyje przez cały run)

Loch jest zapisany abstrakcyjnie: komórki (pokoje) na siatce i krawędzie (korytarze) między sąsiednimi komórkami. Wszystko losowe (wymiary pokoju, wiersz drzwi, meble) losuje się RAZ, przy tworzeniu pokoju lub korytarza, więc ponowne zbudowanie mapy kafelków z tego samego układu daje dokładnie ten sam loch (`p2_state_map.js`, komentarz nad `cellKey`).

### 7.2.1 Pola układu `L`

| Pole | Typ | Znaczenie |
|---|---|---|
| `cells` | `Map<cellKey, Cell>` | pokoje |
| `edges` | `Map<edgeKey, Edge>` | korytarze |
| `entrance` | cellKey | komórka z wejściem (zawsze w wierszu `cy = 0`) |
| `heartKey` | cellKey | komórka z sercem |
| `entX` | int (kafelek x) | kolumna drzwi wejściowych w górnej ścianie pokoju wejściowego |
| `breach` | obiekt albo brak | wyłom gildii: `{cell, x, y, ox, oy, fresh, born}` (7.9.8) |

### 7.2.2 Komórka `Cell` (`p2_state_map.js: newRoomSpec`)

| Pole | Znaczenie |
|---|---|
| `cx`, `cy` | pozycja na siatce komórek |
| `x0, y0, x1, y1` | prostokąt podłogi pokoju w kafelkach (włącznie) |
| `objs` | lista mebli `[x, y, kind, built?]`; `kind` z `OBJ_KINDS` (`barrel`, `crate`, `statue`, `shelf`); czwarty element `1` = skrzynia postawiona przez gracza |
| `lvl` | liczba rozbudów (`expand`), start 0 |
| `born` | numer fali, w której powstał (`run.wave` albo 0, gdy `run` nie istnieje) |
| `rt` | typ pokoju (`fog`, `swamp`, `grotto`, `crypt`, `vault`, `haven`, `gears`, `hush`, `ice`) albo brak |

Wymiary pokoju:
```
w = rand(3, 5); h = rand(3, 5); ox = cx*CELL; oy = cy*CELL
x0 = ox + 2 + rand(0, 5 - w);  y0 = oy + 2 + rand(0, 5 - h)
x1 = x0 + w - 1;               y1 = y0 + h - 1
```
Pokój zawsze leży w kafelkach `ox+2 .. ox+6` (i analogicznie w pionie), więc między pokojami sąsiednich komórek zostaje przerwa co najmniej 3 kafelków (offsety 7, 0, 1). Pole pokoju: od 9 (3×3) do 25 (5×5) kafelków.

### 7.2.3 Krawędź `Edge` (`p2_state_map.js: makeEdge`)

| Pole | Znaczenie |
|---|---|
| `key` | `edgeKey(a, b)` |
| `a`, `b` | klucze komórek; `a` to zawsze komórka lewa (korytarz poziomy) albo górna (pionowy) |
| `horiz` | `true`, gdy `A.cy === B.cy` |
| `pa`, `pb` | poziomy: wiersz `y` drzwi w prawej ścianie A i w lewej ścianie B; pionowy: kolumna `x` drzwi w dolnej ścianie A i w górnej ścianie B |
| `lvl` | rozbudowy korytarza |
| `born` | fala powstania |

Wybór `pa`/`pb`: tylko te wiersze (kolumny), których kafelek WEWNĄTRZ pokoju przy ścianie jest wolny: bez mebla (`objAt`) i nie jest kafelkiem serca. Brak kandydata po którejkolwiek stronie: `makeEdge` zwraca `null` i nie tworzy krawędzi. Wybór losowy (`pick`).

### 7.2.4 Siatka podąża za lochem (`p2_state_map.js: regrid, shiftLayout, remapRunState`)

- `inGrid(cx, cy) = cy >= 0`: kopać można w lewo, w prawo i w dół bez limitu; nad wierszem wejścia jest powierzchnia.
- `inStart(cx, cy)`: `0 <= cx < CGX` i `0 <= cy < CGY` (tylko generator startowy).

Przy każdym `buildMap`:
```
minCx = min(c.cx); maxCx = max(c.cx); maxCy = max(c.cy)
d = 1 - minCx                       // skrajna lewa kolumna pokoi zawsze w komórce 1
if d != 0: shiftLayout(L, d)        // cx += d; x0, x1, objs[].x += d*CELL; drzwi pionowych korytarzy pa, pb += d*CELL;
                                    // klucze komórek i krawędzi, entrance, heartKey, entX, breach.x/breach.cell przeliczone
WW = (maxCx + d + 2) * CELL + 1      // jedna wolna kolumna komórek skały z prawej
WH = (maxCy + 2) * CELL + 1          // jeden wolny wiersz komórek skały na dole
if run && (d != 0 || WW != oldWW): remapRunState(oldWW, d*CELL)
if kamera istnieje: centerOn(stary środek + d*CELL)   // widok zostaje w miejscu (1.07)
```
`remapRunState` przesuwa: `run.items` (x, gx; klucze mapy na nowo), `run.rumor.tiles` (indeksy przeliczone ze starego `WW` na nowe) i klucze `run.rumor.traps`. NIE przesuwa `run.rumor.loot` ani `run.memSpots` (błąd, 7.13).

W Unity: ten sam model (komórki + krawędzie jako dane serializowalne), mapa kafelków jako `byte[]` przeliczana z modelu; przesunięcie siatki można zastąpić współrzędnymi ze znakiem, ale wtedy wszystkie klucze muszą być od tego niezależne.

---

## 7.3 Generator startowego lochu (`p2_state_map.js: genStartLayout`)

```
for attempt in 0..2999:
  N = 3                                   // wejście, jeden pokój, serce
  start = cellKey(rand(0, CGX-1), 0)
  keys = [start]; pairs = []
  guard = 0
  while keys.length < N and guard++ < 1000:     // losowy spacer od losowej istniejącej komórki
    from = pick(keys); d = DIRS[rand(0,3)]; t = from + d
    if !inStart(t) or t in keys: continue
    keys.push(t); pairs.push([from, t])
  if keys.length < N: continue
  loops = sąsiednie pary komórek z keys bez krawędzi w pairs
  if loops niepuste and random < 0.7: pairs.push(pick(loops))
  L = {cells: newRoomSpec dla każdej komórki, edges: {}, entrance: start, heartKey: null, entX: 0}
  dist = BFS po pairs od start; maxD = max(dist)
  if maxD < N - 1: continue               // serce musi być 2 komórki od wejścia
  L.heartKey = pick(komórek z dist == maxD)
  L.entX = rand(e0.x0, e0.x1)             // e0 = pokój wejściowy
  dla każdej pary: makeEdge(L, a, b); jeśli null -> continue (nowa próba)
  dla każdej komórki: genFurniture(L, k)
  return L
throw 'map generation failed'
```
Skutki:
- start to zawsze łańcuch trzech pokoi: wejście (wiersz 0) - pokój - serce, prosty albo w kształcie litery L;
- przy N = 3 lista `loops` jest zawsze pusta (siatka jest grafem dwudzielnym, 3 komórki nie tworzą cyklu), więc gałąź z 70% jest martwa;
- `layoutDist(L)` to BFS po krawędziach od `L.entrance` (`p2_state_map.js: layoutDist`); `allConnected(L, cells, edges)` sprawdza, czy BFS dochodzi do wszystkich komórek.

### 7.3.1 Meble (`p2_state_map.js: genFurniture`)

```
tiles = wszystkie kafelki podłogi pokoju; area = tiles.length
special = (k == entrance or k == heartKey)
n = special ? rand(0,1) : area >= 20 ? rand(1,3) : area >= 12 ? rand(0,2) : rand(0,1)
blocked(x,y) = manhattan((x,y), dowolne drzwi pokoju) <= 1 or manhattan((x,y), kafelek serca) <= 1
tries = 0
while placed < n and tries++ < 40:
  t = pick(tiles)
  if mebel na t or blocked(t): continue
  objs.push([t.x, t.y, pick(OBJ_KINDS)])
  if !connected(): objs.pop(); continue     // wolne kafelki pokoju (bez mebli i serca) muszą tworzyć jedną spójną część (4 kierunki)
  placed++
```
Drzwi pokoju to drzwi wszystkich jego korytarzy i (dla wejścia) drzwi wejściowe (`cellDoors`). Kafelek serca `heartTile(L)` to środek pokoju serca: `(floor((x0+x1)/2), floor((y0+y1)/2))`. Meble powstają też w każdym nowo wykopanym pokoju (7.9.3), ale już nie przy dodaniu przejścia.

### 7.3.2 Pułapki na start (`p3_flow.js: seedStartTraps, startTrapSpot`)

Po `startBuild` nowego runu loch sam stawia dwie pułapki na najkrótszej drodze wejście-serce (`shortestPath`, bez kosztu niebezpieczeństwa), płacąc z Esencji startowej (30 - 3 - 3 = 24):
```
START_TRAPS = [['spikes', 0.7, 0.95], ['arrows', 0.6, 1]]
P = shortestPath()                         // od fl.ent do najbliższego heartAdj
podłoga: ostatni kafelek P[k] dla k od min(len-1, floor(len*f1)) w dół, na którym canPlace
ściana: kafelek ściany z canPlace, którego areaOf ma najwięcej wspólnych kafelków z P[floor(len*f0) .. ceil(len*f1)),
        a gdy żaden nie pokrywa odcinka: z całym P
```
Stawiana pułapka ma `lvl: 1, spent: koszt, sys: true` (zdjęta oddaje koszt). Brak Esencji albo miejsca: pułapka jest pomijana. Po wszystkim `saveRun('build')`.

---

## 7.4 `buildMap`: z układu do mapy kafelków (`p2_state_map.js: buildMap`)

Funkcja deterministyczna: ten sam układ daje te same kafelki. Wywołuje najpierw `regrid(L)`.

```
tiles = Uint8Array(WW*WH)  (ROCK);  roomAt = Int16Array(WW*WH) wypełniona -1
dist = layoutDist(L); maxD = max(1, max(dist))
1) każdy pokój: kafelki x0..x1, y0..y1 = FLOOR, roomAt = id pokoju
2) każda krawędź: korytarz (hall) z kafelków FLOOR, roomAt = id korytarza, i dwoje drzwi DOOR
3) każdy ROCK, który ma w 8 kierunkach FLOOR albo DOOR, staje się WALL
4) drzwi wejściowe: (L.entX, r0.y0 - 1) w górnej ścianie pokoju wejściowego
5) wyłom (jeśli jest i nadal pasuje): drzwi w ścianie pokoju
6) serce, heartAdj, objects
```

### 7.4.1 Geometria korytarza

```
poziomy (A z lewej):  ya = e.pa; yb = e.pb; gx = (A.cx + 1) * CELL     // kolumna zgięcia = offset 0 następnej komórki
  for x = A.x1+2 .. gx:            put(x, ya)
  for y = min(ya,yb) .. max(ya,yb): put(gx, y)
  for x = gx .. B.x0-2:            put(x, yb)
  drzwi: (A.x1+1, ya) i (B.x0-1, yb), horiz = true
pionowy (A u góry): analogicznie z gy = (A.cy + 1) * CELL, drzwi (xa, A.y1+1) i (xb, B.y0-1), horiz = false
```
Każdy korytarz zgina się w "swojej" przerwie między komórkami, więc korytarze nigdy się nie krzyżują. Korytarz ma zawsze co najmniej 1 kafelek (kolumna/wiersz zgięcia). Kafelki drzwi nie należą do żadnego pokoju (`roomAt = -1`).

### 7.4.2 Lista `fl.rooms` (pokoje i korytarze w jednej tablicy, `id` = indeks)

| Pole | Pokój (`kind: 'room'`) | Korytarz (`kind: 'hall'`) |
|---|---|---|
| `id` | indeks w `fl.rooms` | indeks |
| `key` | cellKey | edgeKey |
| `cx, cy` | tak | brak |
| `x0, y0, x1, y1` | prostokąt podłogi | obrys (bounding box) kafelków |
| `dist` | odległość od wejścia w krokach komórek (`layoutDist`; nieosiągalne = `maxD`) | średnia `dist` obu pokoi (może być x,5) |
| `doors` | lista obiektów drzwi | 2 drzwi |
| `tiles` | lista `[x, y]` | lista `[x, y]` |
| `color` | `tint(dist / maxD)` | `tint(dist / maxD, true)` (ciemniejszy ×0,62) |
| `born`, `lvl` | z komórki | z krawędzi |
| `rt` | typ pokoju albo `null` | brak |

Pola dopisywane w trakcie fali: `seen` (ktoś widział pokój), `rumored` (znany z plotek), `visited`, `sensed`, `nbrs` (cache `nbrRooms`), `rumorDrop` (czy plotka o tym pokoju przepadła, losowane raz na falę w `finishWave`). `tint` interpoluje `ROOM_TINT = ['#3f4246', '#43424a', '#4a3e45', '#533941', '#5f3239']` (szary kamień przy wejściu, zaschnięta krew w głębi) - kolory to sekcja 08.

### 7.4.3 Drzwi `fl.doors: Map<key, Door>`

| Pole | Znaczenie |
|---|---|
| `x, y` | kafelek |
| `a, b` | id pokoju i id korytarza (dla wejścia i wyłomu `b = -1`) |
| `closedUntil` | czas fali, do którego krata zamyka drzwi (`doorClosed(d) = d.closedUntil > fl.time`); start -1 |
| `wasClosed` | czy były zamknięte (otwarcie wywołuje `replanAll`, 7.10.4) |
| `entrance` | `true` dla wejścia i wyłomu |
| `breach` | `true` dla wyłomu |
| `horiz` | orientacja (rysowanie) |

### 7.4.4 Pozostałe pola mapy (zwracane przez `buildMap` i scalane w `fl`)

| Pole | Znaczenie |
|---|---|
| `tiles`, `roomAt` | tablice kafelków |
| `rooms`, `doors` | jak wyżej |
| `ent` | `{x: entX, y: r0.y0-1, ix: entX, iy: r0.y0}`: kafelek drzwi wejściowych i kafelek tuż za nimi |
| `heart` | `{x, y, room}`: kafelek serca (środek pokoju serca) i id pokoju |
| `heartAdj` | kafelki w 4 kierunkach od serca, które są FLOOR i należą do pokoju serca (tam stają bohaterowie, żeby kraść) |
| `objects` | `Map<key, {kind, x, y, built}>` z `cells[].objs` |
| `maxD` | `max(1, max dist)` |
| `breach` | `{x, y, ix, iy, room}` albo `null` |

Wyłom w `buildMap`: drzwi powstają tylko, gdy `tiles[B] === WALL` i kafelek na zewnątrz `(B.x+ox, B.y+oy)` jest `ROCK`; wtedy `ix = B.x - ox`, `iy = B.y - oy` (kafelek w środku pokoju). Gdy warunek przestał być spełniony (pokój zburzony, przekopany), `fl.breach` jest `null`, a `startBuild`/`rebuildDungeon` usuwa `L.breach`.

Wysokości ścian (`WALL_H = 1.7`, `WALL_H0 = 0.85`, `WALL_LIP = 0.06`, `DOOR_H = 1.25`, animacja `WALL_ANIM = 0.4` s, `WALL_STAY = 1.0` s, `p7_draw.js: wallSetup, wallTick`) to wyłącznie rysowanie: które ściany stoją, a które leżą płasko, liczy się z mapy kafelków. Szczegóły: sekcja 08.

W Unity: `buildMap` jako czysta funkcja `DungeonLayout -> DungeonMap` (bez efektów ubocznych poza ewentualnym przesunięciem siatki), testowana złotymi plikami z prototypu.

---

## 7.5 Zapytania o mapę

### 7.5.1 Rodzaj miejsca: `slotOf(x, y)` (`p2_state_map.js`)

| Kafelek | Wynik |
|---|---|
| FLOOR, serce | `null` |
| FLOOR z meblem (`fl.objects`) | `'object'` |
| FLOOR | `'floor'` |
| DOOR zwykłe | `'door'` |
| DOOR wejście albo wyłom | `null` |
| WALL z co najmniej jednym sąsiadem FLOOR w 4 kierunkach (`wallDirs`) | `'wall'` |
| reszta (ROCK, ściana bez podłogi obok) | `null` |

Pole `slot` przedmiotu w `ITEMS.json` musi być równe `slotOf` (`floor`, `wall`, `door`, `object`; narzędzia mają `dig`, `tunnel`, `expand`, `demolish`, `roomtype`; tryby `null`). Etykiety: `SLOT_LABEL.json`.

`wallDirs(x, y)` = kierunki z `DIRS`, w których sąsiad jest FLOOR (drzwi się nie liczą). Ściana może mieć podłogę z kilku stron (narożnik, ściana między pokojem a korytarzem).

### 7.5.2 Do którego pokoju należy element: `slotRoom(type, x, y)` (`p7_draw.js`)

```
wall:  d = wallDirs(x,y)[0]; return d ? roomOf(x+d.x, y+d.y) : -1      // pierwszy kierunek w kolejności DIRS
door:  dd = fl.doors.get(key); return dd ? (dd.b >= 0 ? dd.b : dd.a) : -1   // drzwi korytarza liczą się do KORYTARZA
reszta: roomOf(x, y)
```

### 7.5.3 Chodzenie

```
blockerAt(x,y) = jest element z BUILDINGS na (x,y) i !it.broken     // rozbita budowla to gruz, przechodni (1.05)
walkable(x,y)  = tileAt == FLOOR && !isHeart && !fl.objects.has && !blockerAt
passable(x,y)  = FLOOR: jak walkable;  DOOR: !doorClosed(d);  reszta: false
```
Pułapki na podłodze i potwory NIE blokują `walkable`/`passable` (blokowanie przez potwory to AI, sekcja 06). Serce nigdy nie jest przechodnie.

### 7.5.4 "Nigdy nie odcinaj": `crateOk`, `blockerOk` (`p7_draw.js`)

Obie funkcje mają ten sam rdzeń:
```
slotOf(x,y) == 'floor'
R = pokój (kind 'room'), nie korytarz
manhattan((x,y), każde drzwi R) > 1 and manhattan((x,y), serce) > 1
free = kafelki R bez (x,y), które są walkable
free niepuste i spójne (4 kierunki)
```
`crateOk` dodatkowo: tylko w fazie `build`, kafelek bez elementu (`!fl.items.has`), pokój musi być komórką układu. `blockerOk` sprawdza też stojącą już budowlę (jej kafelek jest wyłączony z testu). Te reguły razem z `canDemolishRoom`/`canDemolishEdge` (7.9.4) i generatorem mebli gwarantują, że serce i wszystkie pokoje są zawsze osiągalne od wejścia. Meble z generatora nie mogą stać przy drzwiach ani przy sercu, ale kolejne przejście (`tunnel`) wybiera drzwi tylko z wolnym kafelkiem wewnętrznym, więc nowe drzwi mogą wypaść tuż obok starego mebla (to nie odcina, bo spójność wolnych kafelków jest zachowana).

### 7.5.5 Obszar działania elementu: `areaOf(it)` (`p2_state_map.js: areaOf, areaOfRaw`)

`areaOf` zwraca listę kafelków `[x, y]`, w które element trafia. Wynik jest zapamiętany w `AREA_MEMO` (`WeakMap` po obiekcie elementu) z kluczem:
```
k = type|x|y|lvl|mods.portraitR|mods.powderR (+ |floor(gx)|floor(gy) dla DRIFT: ghost, shade, bats)
ważny, dopóki memo.tiles === fl.tiles (ta sama tablica mapy) i memo.k === k
```
Wyjątki liczone zawsze od nowa: `arrows`, `eyes`, `fire` (zatrzymują się na tym, co stoi na drodze, a to zmienia się w trakcie fali). Obszary poszczególnych typów (sam kafelek, kwadrat 3×3, linia od ściany do 11 kafelków, płomień 2×3, promień w pokoju, cały pokój, 8 sąsiadów mimika, obszar wokół bieżącej pozycji duchów, cieni i nietoperzy `gx, gy`) opisuje sekcja 05; kod: `areaOfRaw`.

`roomTilesNear(x, y, R, rid)`: kafelki pokoju `rid` w odległości euklidesowej `<= R` i typu FLOOR (`R = 99` = cały pokój); bez pokoju: skanowanie kwadratu.

### 7.5.6 Inne zapytania

- `isRt(r, t)`, `rtOf(r)`: typ pokoju o id `r` (`p2_state_map.js`).
- `nbrRooms(r)`: pokoje i korytarze połączone drzwiami z `r` plus pokoje za tymi korytarzami (echo groty), cache w `R.nbrs`.
- `bfs(sx, sy, opt)`, `pathFrom`, `shortestPath()`: Dijkstra po `passable` z kosztem `1 + min(12, danger*3*avoid)`; `shortestPath` liczy drogę od `fl.ent` do najbliższego `heartAdj` bez kosztu niebezpieczeństwa (samouczek, boty, pułapki startowe). Szczegóły i użycie: sekcja 06.
- Wiedza drużyny: `fl.known` (`Uint8Array WW*WH`), `markKnown`, `revealRoom`, `revealAround`, `reveal`, `frontier()` (znane, przechodnie kafelki z nieznanym sąsiadem FLOOR/DOOR, cel eksploracji), `checkGhostRumors`: sekcja 06.
- `isEdgeRoom(r) = fl.rooms[r].dist >= fl.maxD - 1` (dwa najgłębsze poziomy).
- Mnożnik głębokości pokoju (`p3_flow.js: depthMult`):
```
depthMult(r) = r < 0 ? 1 : 1 + (S.depthMax - 1) * R.dist / fl.maxD
                          + (isEdgeRoom(r) ? mods.depthBonus : 0) + (R.rt == 'vault' ? 0.15 : 0)
```
  Dla kafelka drzwi `roomOf = -1`, więc mnożnik 1. Na mapie w budowie przy rogu pokoju widać `×m` i obciążenie `n/cap` (`p7_draw.js: drawRoomLabels`). Użycie: sekcja 03 i 05.
- `sizeMult = () => 1`, `cardMultNow() = 1`, `infMult = () => 1`, `loneMult = h => 1` to pozostałości (martwy kod, 7.13). Rozmiar lochu działa przez chciwość: `SIZE_BONUS * max(0, roomCount() - 5)` (sekcja 03).

---

## 7.6 Pojemność pokoi (`p7_draw.js: roomCap, roomLoads, roomFull`)

```
SLOTTED(t) = ACTIVE[t] (pułapki + potwory) || BUILDINGS[t]        // łup i skrzynia się NIE liczą
roomCap(R) = (R.kind == 'hall' ? 1 : 2 + (R.tiles.length >= 20 ? 1 : 0)) + (R.lvl || 0)
roomLoads()[r] = liczba elementów SLOTTED, dla których slotRoom(...) == r
roomFull(type, x, y) = SLOTTED(type) && loads[slotRoom(type,x,y)] >= roomCap(fl.rooms[r])
```
- Pokój 3×3 do 4×4 i 3×5/5×3: 2 miejsca; pokój o polu 20 lub 25 (4×5, 5×4, 5×5): 3 miejsca; korytarz: 1 miejsce.
- Elementy na drzwiach (`gate`, `creak`) zajmują miejsce w KORYTARZU (7.5.2), a korytarz ma dwoje drzwi i własną podłogę, które dzielą to jedno miejsce.
- Elementy ścienne liczą się do pokoju po stronie `wallDirs[0]`.
- Każda rozbudowa `expand` dodaje +1 (7.9).
- Pojemność nigdy nie maleje (poza cofnięciem), więc `validateItems` jej nie sprawdza.

---

## 7.7 Budowanie: stawianie elementów

### 7.7.1 Kiedy co wolno

| Akcja | Budowa (`fl.phase == 'build'`) | Fala (`'raid'`) |
|---|---|---|
| pułapki, potwory, łup (`tryPlace`) | tak | tak (pasek otwarty = pauza); pułapka uzbraja się `ARM_TIME = 2` s (`mods.quickArm` = od razu) |
| skrzynia i budowle (`ITEMS[t].build`) | tak | nie ("między falami") |
| narzędzia lochu (`TOOLS`) | tak | nie |
| przenoszenie, ulepszanie, zdejmowanie, cofanie | tak | nie |
| łatanie wyłomu | tak | nie |

Kafelek w pasku (`p8b_ui.js: updateTray`, kliknięcie): tryb (`MODES`) tylko w budowie; zablokowany (`!run.unlocked.has`) -> "zablokowane"; narzędzie lub `build` w fali -> "między falami"; `fl.essence < costOf(t)` -> "za mało Esencji"; inaczej przełącza `selected` (drugie stuknięcie odznacza) i odkłada to, co było w ręce. Kafelek jest wyszarzony (`off`), gdy zablokowany, niegrywalny w tej fazie albo za drogi; wyszarzenie odznacza wybór. Elementy z późniejszego etapu nauki nie są w pasku wcale (`onbOk`, sekcja 08).

### 7.7.2 Cena (`p8b_ui.js: costOf, LOOT_STEP`)

```
LOOT_STEP = 1.25
lootCount(t) = liczba elementów typu t w fl.items z !it.dropped       // łup upuszczony przez bohaterów się nie liczy
costOf(t) =
  MODES[t]      -> 0
  TOOLS[t]      -> toolCost(t)                                       // 7.9.2
  BUILDINGS[t]  -> ceil(ITEMS[t].cost * mods.buildingCost)
  LOOT_KIND[t]  -> ceil(ITEMS[t].cost * LOOT_STEP ^ lootCount(t) - 1e-9)
  inaczej       -> ITEMS[t].cost
```
Przykład: relikwie 10, 13, 16, 20, 25... Zapłacona kwota zapisuje się w `it.spent` i to ona wraca przy zdjęciu (zdjęcie starszej, tańszej relikwii oddaje mniej niż obecna cena).

### 7.7.3 Czy można postawić: `canPlace(type, x, y, loads)` (`p7_draw.js`)

Sprawdzenia w tej kolejności:
1. `ITEMS[type]` istnieje, nie jest narzędziem, typ odblokowany w runie.
2. `type == 'crate'` -> wynik `crateOk(x, y)`.
3. Kafelek zajęty (`fl.items.has`) -> nie.
4. Budowla (`BUILDINGS`): tylko w budowie; `roomOf` musi być pokojem (nie korytarzem); w tym pokoju nie ma jeszcze budowli tego samego typu (porównanie `roomOf` wszystkich elementów); `blockerOk(x, y)`.
5. `slotOf(x, y) === ITEMS[type].slot`.
6. Potwór w fali: żaden żywy bohater nie stoi na `(x, y)`.
7. `!roomFull(type, x, y, loads)`.

### 7.7.4 Przyciąganie do kafelka: `snapTile(type, wx, wy)` (`p8b_ui.js`)

Z 9 kafelków wokół kafelka pod palcem (`floor(wx) ± 1`, `floor(wy) ± 1`) wybiera ten, dla którego `canPlace` jest prawdą i środek jest najbliżej punktu stuknięcia, ale bliżej niż 1,0 kafelka. Brak: `null`. Punkt stuknięcia `(wx, wy)` w kafelkach liczy `tapWorld` z uwzględnieniem obrazków stojących elementów i ścian (sekcja 08).

### 7.7.5 `tryPlace(type, x, y)` (`p8b_ui.js`)

```
if T.tool: false
if !unlocked: note 'Zablokowane'
cost = costOf(type); if fl.essence < cost: note 'Za mało Esencji'
if BUILDINGS[type] and !canPlace:                      // czytelne powody dla budowli
  faza != build        -> 'Tylko między falami'
  pokój jest korytarzem -> 'Tylko w pokoju'
  taki już w pokoju    -> 'Już stoi w tym pokoju'
  kafelek wolny i !blockerOk -> 'Zablokuje przejście'
if !canPlace:
  właściwy slot, wolny, pokój pełny -> 'Pokój pełny (cap)' / 'Korytarz pełny (cap)'
  crate -> faza != build ? 'Tylko między falami' : 'Tu nie pasuje'
  inaczej -> 'Tu nie pasuje'
if build: pushUndo('postawienie: ' + nazwa)
crate: cells[pokój].objs.push([x, y, 'crate', 1]); essence -= ITEMS.crate.cost; bt.placed++, spent += cost;
       stats.built++; rebuildDungeon() (nie cicho); return               // UWAGA: bez saveRunSoon (7.13)
nowy element:
  hp = MONSTERS ? ITEMS[type].hp * mods.monster : 0
  {type, x, y, cd: (raid && TRAPS && !mods.quickArm) ? ARM_TIME : 0, anim: 0, disabled: false, hp, max: hp,
   power: mods.monster, shot: 0.5, flash: 0, preview: 1.4, gx: x+0.5, gy: y+0.5, lvl: 1, spent: cost}
  run.memSpots[key] == [type, wynik, 1] -> it.memRes = wynik, memLvl = 1     // pamięć checku wraca na to samo miejsce (sekcja 05)
  essence -= cost; bt.placed++, bt.spent += cost
  build: saveRunSoon()
  raid: stats.built++; tl('bd', type, x, y)
        pułapka postawiona na oczach: żywy bohater w tym pokoju (kind 'room') albo w promieniu 3 kafelków -> learnTrap(it, 'seen') i kwestia SAY.seenBuilt
        potwór -> fl.threatDirty; łup -> replanAll()
```
Komunikaty (`note`) pojawiają się przy stukniętym miejscu (sekcja 08). `preview: 1.4` = obszar elementu podświetlony przez 1,4 s czasu rzeczywistego.

### 7.7.6 Pola elementu `fl.items` (wspólne z `run.items`: to ta sama `Map`)

Stałe przez run: `type, x, y, lvl, spent, gx, gy, hp, max, power, sys` (pułapka startowa), `dropped, item, gold, noGreed` (łup upuszczony przez bohatera: `spent: 0`), `memRes, memLvl` (pamięć checku), `lf, lh, lp, lk` (statystyki z ostatniej fali, z `it.w` w `finishWave`). Odnawiane na początku każdej budowy w `setupFl` (wszystko naprawione i uzbrojone): `worn, cd, disabled, bent, anim, sleep, detected, rumored, uses, seenWave, preview, noGreed, cursedKnown, jamUntil, skipUntil, lastFire, broken`; potwory odzyskują `hp = max`, `gx, gy` wracają na środek kafelka, `foeT = 0`. Pamięć checku jest kasowana, gdy element był wyłączony przez bohaterów (`memRes && !worn && (disabled || broken)`).

### 7.7.7 Walidacja po zmianie mapy (`p3_flow.js: validateItems`)

```
dla każdego elementu:
  ok = BUILDINGS ? blockerOk(x,y) : slotOf(x,y) == ITEMS[type].slot
  !ok -> usuń i zwróć it.spent || ITEMS[type].cost
suma zwrotów > 0: fl.essence += suma; jeśli nie cicho: napis '+N Esencji' przy wejściu
```
Wywoływana w `setupFl` (cicho) i `rebuildDungeon`. Tak giną elementy w zburzonym pokoju, pułapki ścienne na ścianie, która stała się drzwiami albo podłogą, i stare budowle blokujące drzwi.

---

## 7.8 Przenoszenie, ulepszanie, zdejmowanie, cofanie

### 7.8.1 Gesty w budowie (`p8b_ui.js`)

| Gest | Stała | Skutek |
|---|---|---|
| stuknięcie | ruch palca <= 8 px | `handleTap` -> `buildTap` (podnieś, odłóż, przenieś) albo stawianie/narzędzie |
| dwa stuknięcia w ten sam element | `DOUBLE_TAP_MS = 380` | ulepszenie (`tapUpgrade`); pierwsze stuknięcie podniosło element, więc jest odkładany |
| przytrzymanie na elemencie lub meblu | `HOLD_DEL = 0.55` s, bez ruchu > 8 px | zdjęcie ze zwrotem (`holdRemove`); pierścień rysuje się od 15% czasu |
| przeciągnięcie | ruch > 8 px | przesuwanie kamery (anuluje przytrzymanie) |
| dwa palce | | zoom (sekcja 08) |

Klawiatura (tylko prototyp; w Unity niepotrzebne): Spacja = odpowiedź na check, P = pasek/pauza, F = przyspieszenie, Esc = odznacz i odłóż, Ctrl/Cmd+Z = cofnij.

### 7.8.2 Drzewo decyzji stuknięcia w budowie (`p8b_ui.js: handleTap, buildTap`)

```
handleTap(wx, wy) w budowie:
  it2 = element na kafelku albo (bez wyboru lub z trybem) itemAt(wx, wy)     // itemAt: kafelek albo 8 sąsiadów, środek < 0,85
  jeśli it2 == poprzednio stuknięty i < 380 ms: odłóż z ręki, tapUpgrade(it2), koniec
  selected == 'upgrade': tapUpgrade(itemAt) (martwe w UI, 7.13)
  buildTap(wx, wy) zwróciło true: koniec
  wybrane narzędzie: najbliższy znacznik toolMarkers w promieniu 1,8 -> applyTool, inaczej podpowiedź
  wybrany element: snapTile -> tryPlace
  bez wyboru, w promieniu 1,1 od wyłomu: arkusz wyłomu (łatanie)
  wybrany element bez dobrego miejsca: tryPlace(surowy kafelek) -> komunikat błędu
  inaczej: podpowiedź o rodzaju miejsca

buildTap(wx, wy):
  w ręce element (cur) albo mebel (curO):
    stuknięcie w ten sam kafelek (mebel: o ile nie stoi na nim inny element) -> odłóż
    stuknięcie wprost w inny element -> podnieś go zamiast
    cur:  moveTarget -> moveItem; inaczej stuknięty mebel -> podnieś mebel; inaczej 'Tu nie pasuje'
    curO: inny mebel -> podnieś go; objTarget -> moveObj; inaczej 'Tu nie pasuje'
    return true
  wybrane narzędzie i stuknięcie < 0,7 od znacznika -> false (znacznik wygrywa)
  element wprost pod palcem -> podnieś
  wybrany element (nie narzędzie, nie tryb) ma snapTile i nie (stuknięty mebel a slot != 'object') -> false (postaw)
  bez wyboru: itemAt w pobliżu -> podnieś
  mebel pod palcem -> podnieś mebel
  false
```
Podniesienie (`pickUp`, `pickUpObj`) tylko zaznacza `movingKey`/`movingObj`; element zostaje na miejscu do czasu odłożenia. Dozwolone miejsca dla rzeczy w ręce są obrysowane (lista liczona raz na podniesienie, `p7_draw.js: drawCarry`, z elementem tymczasowo zdjętym z mapy).

### 7.8.3 Przeniesienie elementu (`p8b_ui.js: moveTarget, moveItem`)

```
moveTarget(it, wx, wy): zdejmij it z fl.items na czas testu; loads = roomLoads()
  z 3×3 kafelków wokół stuknięcia: (x,y) != (it.x,it.y), canPlace(it.type, x, y, loads), odległość środka < 1,0, najbliższy
moveItem(it, x, y): tylko build; pushUndo('przeniesienie: ...'); x, y, gx, gy nowe; preview = 1.4; fl.threatDirty
```
Za darmo, poziom, `spent` i pamięć checku zostają. Plotki są przypisane do kafelka (`run.rumor.traps` po kluczu), więc po przeniesieniu plotka o starym miejscu przestaje pasować ("Plotki o starym miejscu są już nieaktualne").

### 7.8.4 Przeniesienie mebla (`p8b_ui.js: objTargetOk, objTarget, moveObj`)

- Cel: test `crateOk(x, y)` przy meblu tymczasowo usuniętym z układu i z `fl.objects` (przywracany w `finally`). Mebel można przenieść do DOWOLNEGO pokoju (nie korytarza), na wolną podłogę, nie przy drzwiach ani sercu, tak by pokój został spójny.
- `moveObj`: `pushUndo`; wpis przenoszony z `c0.objs` do `c1.objs` (komórka celu); element stojący na meblu (proch, mimik, pozytywka) jedzie razem z nim; `rebuildDungeon(true)`.

### 7.8.5 Ulepszanie (`p8b_ui.js: upgCost, tapUpgrade, upgradeItem`)

```
UPG_COST = [0, 0, 2, 4]; LVL_POW = [1, 1, 1.6, 2.4]; LVL_MON = [1, 1, 1.5, 2.2]     // p1_config.js
upgCost(it) = ceil(ITEMS[it.type].cost * UPG_COST[(it.lvl || 1) + 1])            // poziom 2: 2× cena bazowa, poziom 3: 4×
tapUpgrade: !ACTIVE -> 'Nie ulepsza się'; lvl >= 3 -> 'Poziom 3 to maks'; essence < c -> 'Za mało Esencji (c)'
upgradeItem (tylko build, tylko ACTIVE, lvl < 3, stać nas):
  pushUndo; essence -= c; it.spent = (it.spent || cost) + c; it.lvl++
  potwór: k = LVL_MON[nowy] / LVL_MON[stary]; max = round(max*k); hp = max; power *= k
  bt.spent += c; bt.upgraded++; stats.upgrades++
```
Łączny koszt poziomu 3 = 7× cena bazowa (bez rabatów kart). Ulepszają się tylko pułapki i potwory (nie łup, nie budowle). Poziom 3 dodaje cechę (`TRAITS`, sekcja 05); zmiana poziomu unieważnia pamięć checku (`memLvl`, sekcja 05).

### 7.8.6 Zdejmowanie ze zwrotem (`p8b_ui.js: holdTarget, holdRemove, removeItem, removeObj`)

```
holdTarget: element na kafelku albo (bez wyboru) itemAt w pobliżu; inaczej mebel na kafelku
removeItem(it): pushUndo; back = it.spent ?? ITEMS[type].cost; usuń; essence += back
  jeśli !it.dropped: bt.placed--, bt.spent -= back
  it.memRes -> run.memSpots[key] = [type, memRes, memLvl]     // postawiony ponownie TU, ten sam typ: pamięta (tylko poziom 1)
removeObj(o): pushUndo; element na meblu zwraca swoje spent; mebel z cells[].objs usunięty
  o.built (skrzynia gracza): + ITEMS.crate.cost; mebel lochu: 0; rebuildDungeon(true)
```
Zwrot obejmuje ulepszenia (bo są w `spent`). Łup upuszczony przez bohatera ma `spent: 0` (zdjęcie bez zwrotu). Pułapki startowe oddają koszt. Mebel lochu można usunąć bez zwrotu (otwiera przejście). Zdjęcie działa tylko w budowie (`holdRemove` sprawdza fazę; samo `removeItem` nie).

### 7.8.7 Cofanie (`p8b_ui.js: pushUndo, undo, cloneLayout`)

```
pushUndo(label): tylko build; stos max 30 (najstarszy wypada)
  zapis: {label, layout: głęboka kopia, items: płytkie kopie [k, {...it}], essence, freeDigs,
          byType: kopia JSON, built: stats.built, rumorTiles: kopia Map}
undo(): przywraca powyższe; rebuildDungeon(true); threatDirty; odkłada rzecz z ręki; saveRunSoon()
clearUndo(): w startBuild i startWave
```
Cofnąć można: postawienie, ulepszenie, przeniesienie (element i mebel), zdjęcie, usunięcie mebla, narzędzia (kopanie, przejście, rozbudowa, wyburzenie, typ pokoju), łatanie wyłomu. NIE są przywracane: `run.rumor.traps`, `run.rumor.loot`, `run.memSpots`, `run.essence` (ustawiane przy zapisie), `stats.upgrades`, `bt.upgraded`, zakupy w sklepie. Nieudane narzędzie zdejmuje swój wpis ze stosu.

W Unity: stos poleceń (Command) albo migawki stanu budowy; ta sama granica 30 i czyszczenie na starcie budowy i fali.

---

## 7.9 Narzędzia lochu (zakładka Loch) i przebudowa

### 7.9.1 Znaczniki: `toolMarkers(tool)` (`p3_flow.js`)

`cellCenter(cx, cy) = [cx*CELL + 4.5, cy*CELL + 4.5]`.

| Narzędzie | Znaczniki |
|---|---|
| `dig` | dla każdej komórki i każdego z 4 kierunków: komórka docelowa `inGrid` i pusta; znacznik `{from, tx, ty}` w `cellCenter(t) - d*2.2` (przesunięty ku pokojowi źródłowemu). Ta sama pusta komórka obok dwóch pokoi ma dwa znaczniki (dwa możliwe korytarze) |
| `tunnel` | dla każdej komórki i kierunków w prawo i w dół: sąsiad istnieje, krawędzi brak; znacznik w połowie między środkami |
| `expand` | każdy pokój (środek prostokąta + 0,5) i każdy korytarz (jego środkowy kafelek); niesie `lvl` |
| `demolish` | pokoje z `canDemolishRoom` i korytarze z `canDemolishEdge` |
| `r_*` (typy pokoi) | każdy pokój; `has` = ma już ten typ (stuknięcie zdejmie), `other` = ma inny typ (zostanie zastąpiony, napis "zamiast: ...") |

Stuknięcie wybiera najbliższy znacznik w promieniu 1,8 kafelka. Kolory i znaki znaczników: sekcja 08 (`p7_draw.js: drawToolMarkers`; pod znacznikiem rozbudowy jej cena).

### 7.9.2 Koszt: `toolCost(t, m)` (`p3_flow.js`)

```
ROOMTYPES[t]: m && m.has ? 0 : ITEMS[t].cost                          // zdjęcie typu nic nie kosztuje
expand:       ceil(ITEMS.expand.cost * 2 ^ (m ? m.lvl : 0) * mods.expandCost)      // 4, 8, 16, 32... za to samo miejsce
dig:          run.freeDigs > 0 ? 0
              : max(0, ITEMS.dig.cost + 3 * max(0, cells.size - 7) - mods.digDiscount)   // 8, od 8. pokoju +3 za każdy
tunnel:       max(0, ITEMS.tunnel.cost - mods.digDiscount)            // 4
demolish:     max(0, 0) = 0
```
Ceny bazowe: `dig` 8, `tunnel` 4, `expand` 4, `demolish` 0, typy pokoi 8 lub 10 (`ITEMS.json`).

### 7.9.3 Zastosowanie: `applyTool(m)` (`p3_flow.js`)

```
if faza != build: note 'Tylko między falami'
cost = toolCost(m.tool, m); if essence < cost: note 'Za mało Esencji (cost)'
pushUndo(nazwa)
dig:      ok = digRoom(L, m.from, m.tx, m.ty)
          ok -> freeDigs-- (jeśli > 0); refund = rebuildDungeon(); forgetTiles(nowy pokój i nowy korytarz)
tunnel:   ok = addPassage(L, m.a, m.b); ok -> refund = rebuildDungeon(); forgetTiles(nowy korytarz)
demolish: forgetTiles(kafelki burzonego pokoju lub korytarza)       // UWAGA: przed sprawdzeniem (7.13)
          pokój i canDemolishRoom: forgetTiles korytarzy pokoju; back = 5 + expandRefund(cell.lvl); demolishRoom; essence += back
          korytarz i canDemolishEdge: back = expandRefund(edge.lvl); usuń krawędź; essence += back
          ok -> refund = rebuildDungeon()
expand:   spec.lvl++; R.lvl = spec.lvl                               // bez przebudowy mapy, pojemność liczy się z R.lvl
r_*:      ten sam typ -> usuń c.rt, R.rt; essence += floor(ITEMS[t].cost / 2)
          inny lub brak -> c.rt = R.rt = typ (poprzedni typ przepada bez zwrotu)
!ok: zdejmij wpis cofania; note 'Tu się nie da'
ok:  essence -= cost; stats.built++; bt(tool).placed++, spent += cost; run.next = run.next || makeWave(run.wave)
     podpowiedź z liczbą Esencji zwróconej za elementy, które straciły miejsce
```
- `digRoom(L, from, tx, ty)`: wymaga `inGrid`, pustej komórki i istniejącej `from`; tworzy `newRoomSpec`, potem `makeEdge(from, nowy)`; gdy krawędź się nie da (brak wolnego wiersza w `from`), pokój jest cofany; na końcu `genFurniture` nowego pokoju.
- `addPassage(L, a, b)`: obie komórki istnieją, krawędzi jeszcze nie ma, sąsiedztwo manhattan 1, `makeEdge` się udał.
- `forgetTiles(tiles)`: usuwa te kafelki z `run.rumor.tiles`; nowy pokój jest więc nieznany plotkom ("Następna fala nic o nim nie wie").
- Koszt narzędzia przy zdjęciu typu pokoju = 0, a zwrot połowy ceny działa jak dochód.
- `applyTool` nie wywołuje `saveRunSoon` (7.13).

### 7.9.4 Wyburzanie (`p2_state_map.js: canDemolishRoom, canDemolishEdge, demolishRoom`)

```
canDemolishRoom(L, k) = k != entrance && k != heartKey && k istnieje
                        && allConnected(L, cells bez k, edges bez krawędzi k)
canDemolishEdge(L, ek) = ek istnieje && allConnected(L, cells, edges bez ek)
demolishRoom(L, k): usuń komórkę i wszystkie jej krawędzie
expandRefund(lvl) = floor(ITEMS.expand.cost * (2^lvl - 1) / 2)     // połowa wydanych rozbudów: 0, 2, 6, 14, 30...
```
Wejścia i serca nie da się zburzyć, a żadne wyburzenie nie odetnie żadnego pokoju (a więc i serca) od wejścia. Zwrot za pokój: 5 + połowa rozbud; elementy wracają przez `validateItems` (pełne `spent`); meble nic; typ pokoju nic. `expandRefund` nie uwzględnia `mods.expandCost`.

### 7.9.5 Darmowe kopanie (Kret)

`startBuild`: gdy `mods.mole` i fala parzysta i `run.moleWave != run.wave`: `run.freeDigs += mods.mole`, `run.moleWave = run.wave`. Dopóki `freeDigs > 0`, `dig` kosztuje 0, a udane kopanie zmniejsza licznik (sekcja 03: karty).

### 7.9.6 Przebudowa mapy: `rebuildDungeon(quiet)` (`p3_flow.js`)

```
Object.assign(fl, buildMap(run.layout))            // nowe tiles, rooms, doors, objects...
if L.breach && !fl.breach: delete L.breach          // ściana wyłomu zniknęła
fl.known = new Uint8Array(WW*WH); fl.danger = new Float32Array(WW*WH)
refund = validateItems(quiet); updateTray(); return refund
```
Wywoływana po każdej zmianie układu: narzędzia, skrzynia, przeniesienie/usunięcie mebla, łatanie wyłomu, cofanie, nowy wyłom. Nowa tablica `fl.tiles` unieważnia `AREA_MEMO`.

### 7.9.7 Każda budowa od nowa: `startBuild` i `setupFl` (`p3_flow.js`)

```
startBuild(resume):
  setupFl('build')                         // fl = buildMap(layout) + świeży stan fali (stats = newStats())
  oferta sklepu, następna fala (makeWave), jeśli jeszcze nie ma (sekcja 03)
  raz na falę (run.builtFor != run.wave): Kret; nowy wyłom (7.9.8); wyłom bez ściany -> usuń
  czyszczenie: floats, particles, orbs, selected, movingKey, movingObj, holdInfo, paused, ff; clearUndo()
  pasek: UI.trayBuild || samouczek; kamera między wejściem a sercem (sekcja 08); saveRun('build')
setupFl(phase): fl = buildMap(run.layout) + {items: run.items, phase, time 0, essence: run.essence, greed 1, ...}
  validateItems(true); naprawa elementów (7.7.6); fl.bRooms = computeBRooms()
```
`fl.stats` powstaje w `setupFl` budowy i trwa przez następną falę, więc liczniki z budowy (`built`, `upgrades`, `patched`) trafiają do statystyk NASTĘPNEJ fali.

### 7.9.8 Wyłom (`p3_flow.js: planBreach, patchBreach, chooseEntrance`)

Kiedy (szczegóły w sekcji 03): w `startBuild`, raz na falę, gdy nie ma wyłomu, `run.wave >= 6`, bez samouczka, `Math.random() < BREACH_P = 0.35`, etap nauki 4 (`stageOf() >= 4`). Geometria:
```
kandydaci: pokoje (kind 'room'), nie wejście, nie serce, odległość od serca w krokach komórek >= 2,
           bez budowli 'fortify' (Bastion) w pokoju
  danger = liczba plotkowanych pułapek, które nadal stoją, w tym pokoju
  miejsca: kafelek ściany obwodu pokoju (x0-1, x1+1, y0-1, y1+1) gdzie: tile == WALL, na zewnątrz ROCK,
           brak elementu na ścianie, kafelek wewnątrz walkable, manhattan do każdych drzwi pokoju > 2
  wynik = dist(od wejścia) * 2 - danger + random
pokój z najwyższym wynikiem, losowe miejsce: L.breach = {cell, x, y, ox, oy, fresh: true, born: wave}
```
Pierwsza fala po wyłomie wchodzi nim (`fresh`); `finishWave` ustawia `fresh = false`, a kolejne fale wybierają wejście (`chooseEntrance`, sekcja 03/06). Łatanie: w budowie, bez wybranego elementu, stuknięcie w promieniu 1,1 od wyłomu otwiera arkusz; `patchBreach` kosztuje `BREACH_PATCH = 20`, ma cofanie, usuwa `L.breach`, `stats.patched++`, `rebuildDungeon(true)`.

---

## 7.10 Pętla główna

### 7.10.1 `frame` i `frameBody` (`p6_loop.js`)

```
frame(now):                                     // requestAnimationFrame
  try frameBody(now) catch e: perfErr(e); rzuć ponownie poza pętlą (setTimeout)   // błąd jednej klatki nie zatrzymuje gry
  perfNote(now, czas JS)
  requestAnimationFrame(frame)

frameBody(now):
  rdt = min(0.05, (now - lastT) / 1000); realNow += rdt          // czas rzeczywisty, przycięty do 50 ms
  trayTick(rdt)                                                   // animacja paska (sekcja 08)
  if run && fl:
    fl.check: modal lub pauza -> przesuń zegary checku o rdt; inaczej updateCheck()   // sekcja 05
    pauza w fali -> stats.pauseTime += rdt
    ffWant = autoFFOn() ? S.autoFF : 1
    ffAuto = ffWant > ffAuto ? min(ffWant, ffAuto + rdt*4) : ffWant          // rośnie płynnie 4/s, spada od razu
    dt = rdt * timeScale()
    if dt > 0: n = ceil(dt / 0.05); powtórz n razy (dopóki faza raid): step(dt / n)
    faza raid, fl.ending != null, brak modala, brak pauzy: fl.ending -= rdt; <= 0 -> fl.ending = null; finishWave()
    preview elementów -= rdt; życie efektów fl.fx -= rdt (usuń <= 0)
    autoCam(rdt); updateHud(); samouczek: tutTick()
  orby: t += rdt; dolatujące uderzają w liczniki (sekcja 08)
  napisy (floats) i cząsteczki: życie -= rdt
  shake -= rdt
  idle = budowa i brak dotyku > 2 s i nic w ręce i brak przytrzymania i pasek i kamera w spoczynku
  rysuj co klatkę, a w idle co drugą klatkę
```
Krok symulacji NIE jest stały: `step` dostaje `dt / n`, czyli zwykle 1/60 s przy 60 fps i ×1, a najwyżej 0,05 s czasu gry na podkrok (przy ×6: `rdt` 0,05 s daje `dt` 0,3 i 6 podkroków). Wynik zależy od liczby klatek, więc prototyp nie jest deterministyczny.

W Unity: symulacja w stałym kroku (np. 0,05 s albo 1/60 s z akumulatorem czasu: `acc += rdt * timeScale; while acc >= STEP: Step(STEP)`), rysowanie i UI w `Update`; to warunek powtarzalnych powtórek i testów zgodności.

### 7.10.2 Skala czasu: `timeScale()` (`p6_loop.js`)

| Warunek (w tej kolejności) | Skala |
|---|---|
| brak `fl`, otwarty modal, faza != `raid`, `paused` | 0 |
| aktywny, nierozstrzygnięty skill check | `CHECK_SLOW = 0.25` |
| `ff` (palec przytrzymany >= 280 ms bez ruchu, albo klawisz F) | `max(S.ffSpeed, 1)`; domyślnie ×3, ustawienie 2-6 |
| inaczej | `max(1, ffAuto)`; spokój domyślnie ×1,5, ustawienie 1-4 (1 = wyłączone) |

```
autoFFOn() = S.autoFF > 1 && faza raid && fl.quietT > 0.3 && !fl.check && fl.gateOpen
GATE_T = 1.8
```
Przyspieszenie palcem: w fali bez pauzy przytrzymanie 280 ms bez ruchu ustawia `ff = true` (`tl('ff', 1)`); puszczenie, drugi palec albo pauza wyłącza (`tl('ff', 0)`). W czasie `ff` checki się nie pojawiają, a pułapki biją same (sekcja 05).

### 7.10.3 Spokój: `QUIET` i `quietWhy` (`p6_loop.js`)

```
QUIET = { r: 1, cd: 1 }
quietWhy() (null = spokój):
  fl.ending != null           -> 'ending'
  fl.party.prep               -> 'prep'
  brak żywych                 -> 'empty'
  ktoś w stanie fight / disarm / boss / free -> ten stan;  ktoś w klatce -> 'caged'
  hot = kafelki i areaOf wszystkich "żywych" elementów z cd <= QUIET.cd
        (żywy: ACTIVE, nie disabled, potwór z hp > 0; albo dowolny łup)
  dla każdego bohatera: jego kafelek w hot -> 'near'; sąsiedzi w 4 kierunkach (BFS do QUIET.r = 1 kroku
        po passable; sam sąsiad jest sprawdzany nawet, gdy nieprzechodni) w hot -> 'near'
  null
gałąź QUIET.r == 0 (stara reguła "cały pokój zajęty") jest martwa przy r = 1
```
`fl.quiet` liczone co 0,1 s czasu gry (`fl.quietCheckT`); `fl.quietT` rośnie, gdy spokój, i zeruje się, gdy nie; `fl.autoFFTime` sumuje czas autoprzyspieszenia (do logu).

### 7.10.4 Kolejność operacji w `step(dt)` (`p6_loop.js: step`)

1. `fl.time += dt`; `fl.cardMult = cardMultNow()` (zawsze 1).
2. Co 0,1 s: `fl.quiet = quietNow()`; aktualizacja `quietT`, `autoFFTime`.
3. `fl.cclock += dt × (fl.quiet ? S.comboQuiet : 1)` (1.12.1: w ciszy 4 razy wolniej); `chainTick()`: wypłata zakończonego łańcucha combo (sekcja 03).
4. Karta Nawiedzona galeria: `fl.portraitRooms = portraitRooms()`.
5. Kolejka echa (`fl.echoQ`, karta Echo mechanizmów): odpalenie elementów, którym minął czas.
6. Liczniki `stats.ffTime` (przy `ff`), `stats.speedTime` (martwe).
7. Wpuszczanie bohaterów z `fl.queue`: jeśli drużyna w środku ucieka (`party.plan == 'flee'`) i ktoś w środku żyje, reszta czeka przy drzwiach, dopóki `fl.holdT` (suma dt) < 8 s; po 8 s albo gdy w środku nikt już nie żyje: `regroupAtDoor()` (`tl('rg')`, druga grupa) i wpuszczanie; normalnie: `spawnTimer -= dt`, przy `<= 0` wchodzi następny i `spawnTimer = 0.3`. Pierwszy wchodzi w pierwszym kroku (stoi do otwarcia bramy).
8. Elementy: `cd` maleje do 0 (wykryta pułapka przechodząca przez 0,3 s ustawia `threatDirty`); koniec `jamUntil` ustawia `threatDirty`; `anim` maleje.
9. Wygasłe strefy `fl.zones` usunięte.
10. `regenTick(dt)`: `S.regenBase / 10 * mods.regen` Esencji na sekundę (domyślnie 0).
11. `stats.silenceTime` (martwe: `fl.silence` nigdy nie jest `true`).
12. `fl.threatDirty` -> `rebuildThreat()` (mapa niebezpieczeństwa, sekcja 06).
13. Drzwi, którym właśnie minęło zamknięcie (`wasClosed && closedUntil <= time`): `wasClosed = false`, `replanAll()`.
14. `party.thinkT -= dt`; przy `<= 0`: `partyThink(0.25 - thinkT)`, `thinkT = 0.25`, `checkThresholds` (rangi).
15. `sayTick()`: kolejka kwestii (sekcja 06).
16. Próbka do logu co 1 s (7.12.5).
17. `fl.disarmKeys` = kafelki obszarów pułapek, które ktoś właśnie rozbraja.
18. Brama: przy `fl.time >= GATE_T (1.8)` `fl.gateOpen = true` i kwestia przywódcy.
19. Jeśli brama otwarta: `updateHero(h, dt)` dla każdego, kto nie zginął i nie wyszedł (ruch, spadek strachu, decyzje: sekcja 06); potem `checkTick()` (samodzielne odpalanie pułapek i nowe skill checki, sekcja 05).
20. `monstersTick(dt)` (zawsze, także przed bramą).
21. Serce: bohaterowie w stanie `boss` przy planie `assault` i `fl.ending == null`: `P.steal += dt * (1 + 0.5*(n-1))`; serce parzy pierwszego `damage(5*dt, HEART)`; fala 1 odpycha przy `0.85 * stealNeed`; przy `P.steal >= stealNeed() = 4 / 2^mods.glass` kradzież (`takeCrystal`). Szczegóły: sekcja 03/05.
22. `fl.heartHit -= dt`.
23. Cierpliwość (1.12.1): `fl.patT += dt × (narada albo odpoczynek ? 0,5 : 1)`; `!fl.fearless && fl.ending == null && fl.patT >= S.waveTime` (domyślnie 120 s) -> `becomeImpatient()` (raz, ustawia `fearless`).
24. Siatka bezpieczeństwa: `fl.patT >= S.waveTime + 60` -> każdy w środku wychodzi (`heroExit`).
25. Koniec fali: kolejka pusta, są bohaterowie i każdy zginął albo wyszedł -> `fl.ending = 1.2`.
26. Dymki mowy, którym minął czas, znikają.

### 7.10.5 Pauza i koniec fali

- Pauza (`p8b_ui.js: setPaused`): tylko w fali. Otwarty pasek budowy w fali = pauza (`setTrayOpen(true)` pauzuje i liczy `stats.trayPauses`; zwinięcie wznawia, jeśli nie wisi karta samouczka, i wyłącza `ff`). Gdy pasek jest otwarty, `setPaused(false)` nie odpauzuje. Każdy modal (karta bohatera, menu, karta samouczka) zatrzymuje czas niezależnie od `paused` (`timeScale` = 0). Wyjście z aplikacji w fali (`visibilitychange`) otwiera pasek (pauza). Zmiana pauzy loguje `tl('pa', 1/0)`. W pauzie można stawiać elementy (7.7.1).
- `fl.ending` odlicza 1,2 s CZASU RZECZYWISTEGO (nie gry), tylko bez modala i pauzy; potem `finishWave()` (sekcja 03): wypłata łańcucha, plotki, karmienie serca, przychód, `recordWave`, `logWave(false)`, `saveRun('summary')`, faza `summary`, ekran fali. Dalej `afterSummary` -> `proceedToBuild` -> `run.wave++` i `startBuild`.
- Fazy `fl.phase`: `build`, `raid`, `summary`, `over` (po `endRun`).

### 7.10.6 Liczniki wydajności (tylko prototyp; w Unity: Unity Profiler i własne próbki FPS do telemetrii)

```
PERF = { gaps: [], js: [], last: 0, made0: 0, direct: 0, split: 0, errs: [], fz: 0, ms: 0 }
perfReset(): w startWave
perfNote(now, js): liczy tylko w fali bez pauzy, bez modala, przy widocznej karcie
  ms += min(100, now - last); pod checkiem fz += to samo
  gaps i js (do 40000 klatek) zaokrąglone do 0,1 ms; direct++ gdy TC.direct; split++ gdy SPLIT.k > 0.5
perfErr(e): do 8 błędów: komunikat (160 znaków) + ' @funkcja:linia' zbudowanego pliku
perfSummary(): null przy < 20 klatkach, inaczej
  {frames, fps, gapMed, gapP90, gapMax, slow (% przerw > 50 ms), jsMed, jsP90, jsMax,
   realSec, frozen (% czasu pod checkiem), dpr, w, h, direct (%), split (%), chunks}
```
`TC` (pamięć podręczna kafli) i `SPLIT` (podzielony ekran) to rysowanie, sekcja 08.

### 7.10.7 Liczby losowe

Prototyp używa wyłącznie `Math.random` (95 wywołań: `p3_flow.js` 32, `p5_ai.js` 34, `p6_loop.js` 11, `p4_traps.js` 8, `p1_config.js` 3, `p2_state_map.js` 3, `p8b_ui.js` 3, `p7_draw.js` 1) plus pomocnicze `rand`, `pick`, `shuffle`. Brak ziarna, brak możliwości powtórki.

W Unity: własny RNG z ziarnem (np. xorshift lub PCG) w kilku niezależnych strumieniach: generowanie lochu, fale i bohaterowie, symulacja fali, sklep, kosmetyka (cząsteczki, wybór kwestii). Ziarno runu zapisać w zapisie gry i w logu; razem ze stałym krokiem (7.10.1) daje to powtórki i testy zgodności z prototypem.

---

## 7.11 Zapis gry i ustawienia

### 7.11.1 Ustawienia: `S`, `DEFAULTS`, `GAME_SETTINGS`, `SLIDERS` (`p2_state_map.js`, `p1_config.js`)

- `S = Object.assign({}, DEFAULTS)` (`DEFAULTS.json`): balans (`waveTime`, `scale`, `heroHp`, `heroSpeed`, `dmg`, `monDmg`, `essence`, `deckSize`, `waveIncome`, `regenBase`, `fearRate`, `essenceCap`, `crystals`, `comboWin`, `thrBase`, `depthMax`, `hungerBase`, `hungerGrowth`, `greedW`, `earlyHp`) i ustawienia gracza (`volume`, `music`, `haptics`, `series`, `split`, `checkDiff`, `autoFF`, `ffSpeed`, `topPad`, `trayAuto`).
- `GAME_SETTINGS.json`: 9 ustawień gracza widocznych w menu Ustawienia (`renderSettings`): `volume`, `music`, `haptics`, `series`, `split`, `checkDiff`, `autoFF`, `ffSpeed`, `topPad`. Suwaki i przełączniki (0/1). Zmiana działa od razu i zapisuje się (`saveSettings`); `topPad` ustawia zmienną CSS `--top-extra` (`applyLook`).
- `SLIDERS.json`: suwaki balansu do testów (`renderTests`, modal `tests`). W 1.12 nic tego modala nie otwiera (martwy UI); wartości balansu są zawsze z `DEFAULTS`.
- Wczytanie:
```
saved = JSON(localStorage['yatd12-settings'])
if saved:
  skip = saved.speedsV != 109 ? ['autoFF', 'ffSpeed'] : []      // jednorazowy reset prędkości do nowych domyślnych (1.08, 1.09)
  dla każdego klucza z GAME_SETTINGS: jeśli saved[k] jest liczbą i k nie w skip: S[k] = saved[k]
else:
  old = yatd11-settings || yatd10-settings || yatd8-settings || yatd7-settings
  z old tylko 'volume' i 'checkDiff'
S.speedsV = 109
```
- Zapis: `saveSettings()` zapisuje CAŁE `S` (z balansem i `speedsV`), ale przy wczytaniu wraca tylko 9 kluczy gracza.
- Parametry runu brane z `S` w `newRun`: `crystals`, `essence`, `deckSize || DECK_SIZE (7)`.
- `trayAuto` nie jest nigdzie używane (martwe).

W Unity: ustawienia gracza w `PlayerPrefs` (albo w małym pliku JSON) z polem wersji; balans jako `ScriptableObject` (bez zapisu po stronie gracza).

### 7.11.2 Wszystkie klucze `localStorage`

| Klucz | Zawartość | Odczyt / zapis |
|---|---|---|
| `yatd12-settings` | JSON `S` | `p2_state_map.js` (start) / `saveSettings` |
| `yatd11-settings`, `yatd10-settings`, `yatd8-settings`, `yatd7-settings` | stare ustawienia | tylko odczyt, gdy brak `yatd12-settings` |
| `yatd-name` | imię testera (max 40 znaków w polu) | start / pole na ekranie startowym |
| `yatd15-best` | najlepszy wynik runu (Esencja, liczba całkowita) | `loadBest` / `saveBest` w `finishWave`, gdy `run.total > run.best` |
| `yatd15-records` | `{best, wave, wins, runs}` | `loadRecords` / `saveRecords` w `renderEnd` (raz na run, `run.recorded`) |
| `yatd-tab` | ostatnia zakładka paska | start `p8b_ui.js` / kliknięcie zakładki |
| `yatd12-ui` | preferencje UI (7.11.5) | start / `saveUI` |
| `yatd12-save` (`SAVE_KEY`) | zapis runu | `loadSave` / `saveRun` / `clearSave` |
| `yatd-device` | identyfikator urządzenia | tworzony raz (7.11.6) |
| `yatd-survey` | `''`, `'done'`, `'skipped'` | ankieta (7.12.8) |
| `yatd-pops` (`POPS_KEY`) | `{id: 1}` widziane karty samouczka | `tutPop`; kasowane przy "Samouczek" od nowa |
| `yatd-onb` (`ONB_KEY`) | etap nauki 1-5 | `onbStage` / `setOnb` |
| `yatd-coach` (`COACH_KEY`) | `'1'` = przewodnik ukończony | `tutEnd`; kasowane przy "Samouczek" od nowa |

Poza `localStorage`: Service Worker strony WWW trzyma pamięć podręczną `yatd-v1` (Cache Storage, tylko prototyp). Wszystkie odczyty i zapisy są w `try/catch` (brak pamięci nie psuje gry).

### 7.11.3 Zapis runu (`p8b_ui.js: saveRun, loadSave, clearSave, resumeRun`)

```
SAVE_KEY = 'yatd12-save', SAVE_VER = 1
saveRun(stage):                                   // stage = 'build' | 'summary'
  if !userStarted or !run or run.over: return false        // demonstracyjny loch za ekranem startowym nigdy się nie zapisuje
  if fl.phase == 'build' and stage == 'build': run.essence = fl.essence
  data = JSON.stringify({ v: SAVE_VER, gv: LOG_VERSION, stage, at: Date.now(), run }, replacer)
  localStorage[SAVE_KEY] = data          // błąd (np. brak miejsca) = return false, bez komunikatu
replacer(k, v):
  k == 'afterModals' or 'lastLog'  -> pomiń
  k == 'waveDocs'                  -> kopie dokumentów fal z timeline = null
  k == 'items' i Map               -> { __m: [[klucz, prim(el)]] }   // prim: tylko wartości proste + kopia el.item
  Map                              -> { __m: [...entries] }
  Set                              -> { __s: [...values] }
loadSave: JSON.parse z reviverem (__m -> Map, __s -> Set); ważny, gdy v == SAVE_VER i jest run.layout
clearSave: w endRun (koniec runu każdym sposobem)
```
W zapisie jest cały obiekt `run`: układ lochu (`layout` z `Map` komórek i krawędzi), elementy, plotki (`rumor.tiles`, `rumor.traps`, `rumor.loot`), talia, schowek, sklep, następna fala (`next`), powracający, liczniki, `waveDocs` (bez osi czasu), `waveStart`, `memSpots`, stan samouczka itd. Stanu fali (`fl`) w zapisie nie ma: po wczytaniu mapa i stan fali są budowane od nowa.

Kiedy zapisuje:
| Moment | Wywołanie |
|---|---|
| start budowy (`startBuild`), także po wczytaniu | `saveRun('build')` |
| pułapki startowe (`seedStartTraps`), start runu nauki (`startGuided`) | `saveRun('build')` |
| zmiany w budowie: postawienie (oprócz skrzyni), ulepszenie, przeniesienie, zdjęcie, mebel, cofnięcie, łatanie wyłomu, sklep (kupno, odświeżenie, schowek), kryształ | `saveRunSoon()`: `saveRun('build')` po 700 ms ciszy (debounce) |
| tuż przed falą (`startWave`) | `saveRun('build')` |
| koniec fali, jeśli zostały kryształy (`finishWave`) | `saveRun('summary')` |
| wylosowanie darmowych kart po fali | `saveRunSoonSummary()`: po 300 ms, tylko w fazie `summary` |
| menu "Zapisz i wyjdź" (w budowie), ekran fali "Zapisz i wyjdź" | `saveRun('build')` / `saveRun('summary')` |

W trakcie fali nic się nie zapisuje: zamknięcie karty w fali wraca do budowy przed tą falą (zapis z `startWave`). Narzędzia lochu i skrzynia nie wywołują zapisu od razu (7.13).

Wczytanie (`resumeRun`), migracje starszych zapisów:
```
run = sv.run
run.stage ||= ONB_FULL (4)
afterModals = null, over = false, best = loadBest(), resumed++, logState = ''
run.stacks ||= {}; returners ||= []; stash ||= []; freePicks liczba lub 0
gv < 40 (lub brak): run.total /= 150, waves[].score /= 150, rankIdx od nowa     // punkty -> Esencja (v15)
rankIdx == null -> rankOf(total).i
delete run.hungerStore; shopOwed ||= 1; nextFor ??= wave; builtFor ??= wave
stage >= 3: odblokuj 'howl', 'shackles'
gv < 38: run.shop = null
deck i stash: tylko karty istniejące w UPG; mods przeliczone z talii
stage == 'summary': setupFl('summary'), kamera, afterSummary()       // dokończ wybory po fali, potem budowa
inaczej:            startBuild(true); gv < 38: nowa fala (makeWave) i zapis; tutResume()
```
Ekran startowy pokazuje przycisk "Kontynuuj run" (albo "Kontynuuj samouczek") z falą, sumą Esencji i datą zapisu; rozpoczęcie nowego runu nadpisuje zapis (zapisany run przepada).

W Unity: zapis JSON w `Application.persistentDataPath` (zapis atomowy: plik tymczasowy i podmiana), z polem wersji schematu i łańcuchem migracji; `Dictionary`/`HashSet` serializowane jawnie; zapis także przy `OnApplicationPause(true)`. Dokumenty logu trzymać osobno (nie w zapisie gry), bo w prototypie `waveDocs` mogą zapełnić limit `localStorage`.

### 7.11.4 Rekordy

- `yatd15-best`: aktualizowany w `finishWave`, gdy `run.total > run.best`.
- `yatd15-records`: `renderEnd` raz na run: `runs++`, `wins++` przy wygranej, `best = max(poprzedni, round(run.total))`, `wave = max(wave, liczba fal bez partial)`. Pokazywane na ekranie startowym.

### 7.11.5 Preferencje UI (`yatd12-ui`, `p8b_ui.js: UI, saveUI`)

| Pole | Znaczenie |
|---|---|
| `trayBuild` | czy pasek jest otwarty w budowie (zapamiętane zwinięcie/rozwinięcie przez gracza) |
| `listOpen` | rozwinięta lista bohaterów na mapie |
| `trayPauseHint` | ile razy pokazano "Pauza: budujesz" (max 3) |
| `carryTips` | ile razy pokazano pełny opis rzeczy w ręce (max 3) |
| `holdTips` | ile razy pokazano "Przytrzymaj kafelek..." (max 3) |
| `noFull` | gracz wyszedł z pełnego ekranu (wersja WWW) |
| `hintOpen`, `speed` | domyślne, nieużywane (przycisk prędkości usunięty) |

### 7.11.6 Etap nauki, imię, urządzenie

- `yatd-onb`: `onbStage()` = wartość 1-5; brak lub błąd: `loadRecords().runs > 0 ? 5 : 1`. `onbDone(r)` po runie nauki (`r.guided`, nie przerwany przed falą 5): `setOnb(min(5, r.stage + 1))`. "Pomiń samouczek" ustawia 5. Szczegóły: sekcja 08.
- `yatd-coach = '1'`: przewodnik pierwszego runu skończony (`tutEnd`).
- `yatd-name`: imię z pola "Kto testuje", wysyłane w logu jako `player` (max 40 znaków).
- `deviceId` (`yatd-device`): `Date.now().toString(36) + Math.random().toString(36).slice(2, 8)`, tworzony przy pierwszym uruchomieniu; bez pamięci: `'nostore'`.
- `run.id`: `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)`.

W Unity: identyfikator instalacji (losowy GUID w `PlayerPrefs`), nie `SystemInfo.deviceUniqueIdentifier` (prywatność).

---

## 7.12 Dane testowe (telemetria; tylko prototyp, ale Unity może zbierać to samo)

### 7.12.1 Przegląd

Po każdej fali gra wysyła dokument fali i podsumowanie runu do bazy, a gracz może pobrać cały run jako plik JSON. Służy to autorowi do analizy balansu (także przez Claude). Wersja formatu: `LOG_VERSION = 57` (`p8b_ui.js`); komentarz przy stałej to historia zmian formatu od wersji 31 (np. 57: Prototype 1.12.1, jedno pole na bohatera z nowymi statystykami fali `sidesteps` (zejścia z pola i objazdy) i `squeezes` (przeciśnięcia), dłuższe narady i odpoczynki, cierpliwość `fl.patT`, zegar combo w ciszy ×`S.comboQuiet`, okno 3 s, Groza z ran bez dodatku HP, `S.essK`; 56: etapy nauki, combo +12% na krok, okno 2,5 s; 55: serce znowu je, `stats.essHeart`; 53: `slips`, `naps`, `hushUnlearned`, `hushLost`; 52: `memLost`, `memFires`, `frozen`; 50: `trayPauses`, `pauseTime`; 48: `cpm`, `frozen`, `perf.realSec`, `tut`; 47: `perf`, `errors`).

W Unity: ten sam podział na dokument runu i dokument fali, wysyłka `UnityWebRequest` POST w tle po fali (kolejka offline w pliku), adres i znacznik z konfiguracji builda (`web_config.json`), nie z kodu w repo.

### 7.12.2 Transport (`p2_state_map.js: getDb, remoteDb`; `p8b_ui.js: pushLog`)

```
getDb():                                  // raz, wynik zapamiętany
  window.claude.use('db')    -> baza strony-artefaktu Claude (wersja dist/artifact.html)
  window.YATD_REMOTE.url     -> remoteDb(YATD_REMOTE) (wersja WWW; url i token wstrzykuje build.py z web_config.json)
  inaczej                    -> null
remoteDb(R).collection(c).doc(id).set(d):
  fetch(R.url, POST, mode 'no-cors', Content-Type 'text/plain;charset=utf-8',
        body JSON {t: R.token, c, id, d}) -> zawsze true, chyba że sieć zawiedzie (odpowiedzi nie da się przeczytać)
pushLog(waveDoc):
  run.logState 'denied' lub 'off' -> nic
  db null -> logState = 'off'
  waveDoc -> collection 'waves', id = runId + '_' + numer fali dopełniony do 2 cyfr ('_01')
  potem   -> collection 'runs', id = runId, dokument = runSummary()
  sukces 'ok'; błąd z code 'invalid_argument' -> 'denied'; inny błąd -> 'fail'
```
Kiedy: `logWave(false)` w `finishWave` (każda zakończona fala); `logWave(true)` w `quitRun` w trakcie fali (fala niedokończona, `partial`); `pushLog(null)` (samo podsumowanie runu) na ekranie końca runu (`renderEnd`), na ekranie zwycięstwa (`renderVictory`) i na ekranie fali, gdy fala dała zwycięstwo. Status (`logText`) pokazuje się na ekranie fali, końca i w menu.

### 7.12.3 Odbiornik: Google Apps Script (`apps-script/Code.gs`, tylko prototyp)

| Element | Zasada |
|---|---|
| `doPost(e)` | blokada `LockService` (czekanie do 20 s); treść to JSON `{t, c, id, d}` |
| znacznik | `p.t` musi być równe stałej `TOKEN` w skrypcie (ta sama wartość co `token` w `web_config.json`; nie przepisywać jej do dokumentacji) -> inaczej odpowiedź `'bad token'` |
| kolekcja | `c` oczyszczone do liter `a-z`, max 10 znaków |
| identyfikator | `id` oczyszczone do `[A-Za-z0-9_-]`, max 60 znaków; puste `c` lub `id` -> `'bad id'` |
| rozmiar | `JSON.stringify(d).length > 600000` -> `'too big'` |
| zapis | plik `c + '_' + id + '.json'` w folderze Dysku Google `'YATD wyniki testów'` (tworzony, jeśli go nie ma); istniejący plik jest nadpisywany (`setContent`) |
| odpowiedzi | tekst: `'ok'`, `'bad token'`, `'bad id'`, `'too big'`, `'error: ...'` (klient i tak ich nie widzi, `no-cors`) |
| `doGet(e)` | `?ping=<TOKEN>` zapisuje `ping.json` `{ok, at}` i zwraca potwierdzenie; bez parametru: `'YATD: skrypt działa.'` |

Pliki na Dysku: `waves_<runId>_<NN>.json`, `runs_<runId>.json` (nadpisywany po każdej fali), `survey_<deviceId>_<runId|menu>.json`.

### 7.12.4 Dokument runu: `runSummary()` (`p8b_ui.js`)

| Pole | Znaczenie |
|---|---|
| `version` | `LOG_VERSION` (57) |
| `runId`, `startedAt`, `at` | identyfikator, start i chwila wysłania (ISO) |
| `player`, `device`, `web` | imię (max 40), `deviceId`, 1 = wersja WWW |
| `tutorial`, `stage`, `guided` | run z przewodnikiem, etap nauki 1-4, run nauki |
| `status`, `won` | `run.result` (`'active'`, `'win'`, `'end'`, `'quit'`), czy wygrany |
| `waves`, `total`, `best` | liczba zapisanych fal, Esencja runu, rekord przeglądarki |
| `resumed` | ile razy run wczytano z zapisu |
| `stacks` | liczniki rosnących kart (`run.stacks`) |
| `crystals`, `continueUsed` | kryształy, użycie kontynuacji (zawsze `false` w 1.12) |
| `upgrades`, `deck`, `deckSize`, `sold` | wzięte karty (kolejno), talia, rozmiar talii, sprzedane |
| `fires` | liczba odpaleń pułapek w runie |
| `durationSec`, `buildSec`, `raidSec` | czas runu (zegar ścienny), suma czasu budowy (rzeczywisty), suma czasu fal (czas gry) |
| `settings` | kopia całego `S` |
| `waveMini[]` | `{w, sc, t, lost, k, s, lv[], part, fps, cpm, fz}`: fala, Esencja, czas, kryształ stracony, zabici, wypędzeni, poziomy bohaterów, niedokończona, FPS, checki na minutę, % czasu pod checkiem |
| `tut` | tylko run z przewodnikiem: `{steps, now, max, skipped[], ended}` (sekcja 08) |

### 7.12.5 Dokument fali: `logWave(partial)` (`p8b_ui.js`) i `recordWave` (`p3_flow.js`)

| Pole | Znaczenie |
|---|---|
| `version`, `runId`, `wave`, `at`, `partial` | jak wyżej; `partial` = fala przerwana przez gracza |
| `summary` | ostatni wpis `run.waves` z `recordWave` (niżej) |
| `heroes[]` | `{id, name, female, type, lvl, boss, trait, max, courage, kit[], end[], gold, cursed, lost, hunter, out}`; `kit`/`end` = ekwipunek na wejściu i na końcu jako `typ + rzadkość` (np. `potion1`); `out`: `dead`, `crystal`, `scared`, `left`, `inside` |
| `entry` | `fl.spawnAt`: `'ent'` albo `'breach'` |
| `checkShapes` | mapa `CHECK_SHAPE` (typ -> kształt checku, sekcja 05) |
| `layout` | `run.waveStart` = `snapshotLayout()` z początku fali (niżej) |
| `timeline` | `{ev, smp, thinned?, cut?}` (niżej) albo `null` |
| `upgrades`, `deck`, `deckSize` | karty |
| `mods` | kopia całego obiektu `mods` |

`snapshotLayout()` (w `startWave`, po budowie):
```
{ WW, WH, entrance, heart: heartKey, entX, essence (zaokr.), breach (kopia lub null), greedKeep (2 miejsca),
  cells: [[cx, cy, x0, y0, x1, y1, lvl, objs: [[x, y, kind, built 0/1]], rt|null]],
  edges: [[a, b, horiz 0/1, pa, pb, lvl]],
  items: [[type, x, y, lvl, dropped 0/1]] }
```
To wystarcza, żeby odtworzyć loch w narzędziu analitycznym (albo w Unity w teście zgodności).

`recordWave(rr, rt, partial)` -> wpis `run.waves`:
| Pole | Znaczenie |
|---|---|
| `wave`, `score`, `time`, `buildSec` | numer, Esencja z fali, czas fali (s gry), czas budowy przed falą (s rzeczywiste) |
| `crystalLost`, `crystals` | kryształ wyniesiony w tej fali, kryształy po fali |
| `heroes[]` | `{type, lvl, boss, rank, trait, out, fear, hp}`; `out`: `dead`, `scared`, `crystal`, `left` |
| `hunger` | `fl.hunger`: `{need, got, fedAmt, fedAt, fed, ate?}` albo `null` (sekcja 03) |
| `groza`, `grozaTotal`, `greedRep`, `greed` | Groza fali, suma w runie, chciwość zapamiętana przez gildię, chciwość na końcu |
| `guild` | rodzaj gildii albo `null` |
| `autoFF` | sekundy autoprzyspieszenia |
| `rumorRooms`, `rumorTraps` | pokoje i pułapki, które trafiły do plotek po tej fali |
| `rooms`, `essence` | liczba komórek lochu, Esencja po fali |
| `stats` | `roundStats(fl.stats)`: KAŻDA wartość zaokrąglona do liczby całkowitej (także zagnieżdżone `fearSrc`); małe ułamki (np. `greedKept`, `treasureTale`) giną |
| `items` | `fl.byType` zaokrąglone, tylko typy z `placed`, `fires`, `dmg`, `passiveDmg` albo `fear` różnym od 0 |
| `partial`, `perf`, `errors` | `perfSummary()`, błędy z `PERF.errs` (opróżniane) |
| `checks`, `cpm`, `frozen` | liczba checków (crit+ok+miss+skip), checki na minutę czasu rzeczywistego (`perf.realSec`, gdy > 5 s, inaczej czas gry), % czasu pod checkiem |
| `memFires`, `skullOff`, `classes`, `trayPauses` | odpalenia z pamięci, uśpione czaszką, klasy drużyny, pauzy paskiem |

Limit rozmiaru (`logWave`): gdy JSON dokumentu > 230000 bajtów, najpierw zostaje co trzecia próbka (`smp`, `thinned: 3`), potem zdarzenia są przycinane do 70% długości, dopóki dokument jest za duży i zdarzeń jest > 100 (`cut: true`). Dokument trafia do `run.waveDocs` (pobranie pliku) i do `pushLog`.

Oś czasu (`fl.tl = {ev: [], smp: [], smpT: 0}`, tworzona w `startWave`):
- zdarzenia: `tl(code, ...args)` dopisuje `[czas gry zaokr. do 0,1 s, code, ...args]` tylko w fazie `raid` i do 8000 zdarzeń (`p3_flow.js: tl`);
- próbki: co 1 s czasu gry, do 1200 wierszy: `[czas_s, potem dla każdego bohatera w lochu (nie martwy, nie wyszedł): id, tx, ty, hp, fear, kod]`; kod stanu `heroCode`: `g` pod lochem (zapadnia), `c` klatka, `k` niesie kryształ, `f` ucieka, `r` odpoczywa, `b` walczy, `x` rozbraja, `h` przy sercu, `l` zgubiony, `p` panika, `w` inne (chód).

Kody zdarzeń:
| Kod | Argumenty | Znaczenie (źródło) |
|---|---|---|
| `sp` | id | bohater wszedł (`spawnHero`) |
| `rg` | ile w kolejce | druga grupa wchodzi po ucieczce pierwszej (`regroupAtDoor`) |
| `br` | x, y | fala weszła wyłomem (`startWave`) |
| `pl` | plan | zmiana planu drużyny (`partyThink`) |
| `ip` | 0/1 | koniec cierpliwości: 0 = odwrót, 1 = szturm serca (`becomeImpatient`) |
| `fi` | type, x, y, trafieni, moc | odpalenie elementu (`p4_traps.js: fire`) |
| `ch` | type, x, y, wynik, w obszarze, dodatkowe w serii, maks. poziom, odchylenie % | wynik skill checku (`resolveCheck`); przy odpuszczeniu: type, x, y, `'skip'`, w obszarze (`skipCheck`) |
| `cp` | Groza, mnożnik combo, Esencja | wypłata łańcucha combo, gdy combo > 1 albo Esencja >= 1 (`payChain`) |
| `hg` | `'full'`/`'fed'`/`'ate'`, liczba | serce syte w trakcie / nakarmione na końcu / zjadło kryształ (brakująca kwota) |
| `rk` | indeks | nowa ranga (`checkThresholds`) |
| `k` | id, źródło | śmierć bohatera (`kill`) |
| `sc` | id | wypędzony strachem (`heroExit`) |
| `ex` | id | wyszedł zwyczajnie |
| `cx` | id | wyniósł kryształ |
| `ct` | id niosącego | kradzież kryształu (`takeCrystal`) |
| `cd` | id | upuścił kryształ ze strachu (`dropCrystal`) |
| `cs` | id | kryształ wraca do serca (`crystalReturns`) |
| `fl` | id | zaczął uciekać (`startFlee`) |
| `rg2` | id, powód | furia (`startRage`) |
| `tr` | id, typ obrażeń | trauma (`damage`) |
| `tr` | id | wpadł do zapadni (`p4_traps.js`); ten sam kod co trauma, rozróżnia liczba argumentów |
| `lo` | id, powód | zgubił się (`getLost`; `'fall'` po zapadni) |
| `cg` | id | uwięziony w klatce |
| `cf` | id, sposób | uwolniony: `'rescue'`, `'time'`, inny powód; `'death'` = zginął w klatce |
| `rs` | id uwięzionego, 0/1 | decyzja o ratunku (`p5_ai.js`) |
| `mn` | type, x, y | potwór zginął |
| `al` | x, y, ile odpaliło | alarm wabika |
| `ds` | id, type, x, y, 0/1 | rozbrojone (1 = rozmontowane na stałe); wabik rozbrojony = alarm, z 0 |
| `df` | id, type, x, y | nieudane rozbrojenie |
| `lg` | id złodzieja, x, y | podważona krata |
| `ls` | x, y, rzadkość | łup zauważony |
| `lp` | id, rzadkość, rodzaj | łup zabrany |
| `sw` | id, stary, nowy | wymiana przedmiotu |
| `cu` | id | przeklęty |
| `cw` | x, y | kapłan rozpoznał przeklęty łup |
| `cl` | id kapłana, id | klątwa zdjęta |
| `rv` | id, `'phys'`/`'phobia'` | ujawnione ciało albo fobia |
| `dp` | id chciwego, 0/1 | spór na rozwidleniu (1 = przekonał) |
| `fg` | id pokoju | błądzenie lidera we mgle |
| `pg` | id dającego, id biorącego | podana mikstura |
| `po` | id | wypita mikstura (niskie HP) |
| `pw` | id, `'charm'`/`'amulet'`/`'boots'` | użyta moc |
| `pp` | pokój, kapłan, mag, złodziej, wojownik (0/1) | przygotowanie przed pokojem |
| `pf` | pokój | szarża po przygotowaniu |
| `an` | id odpowiadającego, id zgubionego | odpowiedź na wołanie |
| `se` | id | poszukiwanie zgubionego |
| `dt` | x, y drzwi | objazd |
| `sm` | id, x, y | barbarzyńca rozbija |
| `bc` | id, ilu usłyszało | wołanie barda |
| `sg` | id, ilu w pobliżu | pieśń barda |
| `fo` | id | kapłanowi skończyła się wiara |
| `sl` | id, x, y | poślizg w Lodowni |
| `bd` | type, x, y | element postawiony w trakcie fali |
| `pa` | 1/0 | pauza / wznowienie |
| `ff` | 1/0 | przyspieszenie palcem start / koniec |
| `cb` | koszt | kupiony kryształ; martwe w logu (kupno tylko w budowie, a `tl` zapisuje tylko w fali) |

### 7.12.6 Liczniki per typ: `bt(type)` (`p3_flow.js`)

`fl.byType[type]` (także dla narzędzi): `placed, spent, checks, crit, ok, miss, skip, fires, hits, dmg, pts, fear, fearPts, kills, disarmed, died, passiveDmg, passivePts, skipLethal, slept` oraz dopisywane w locie: `upgraded, sapped, smashed, memFires, memLost`. Znaczenia: `placed`/`spent` = postawione sztuki i wydana Esencja (zdjęcie odejmuje), `checks..skip` = checki i ich wyniki, `fires`/`hits` = odpalenia i trafienia, `dmg`/`pts` = obrażenia i Esencja z nich, `fear`/`fearPts` = strach i Esencja ze strachu, `kills`, `disarmed`, `died` (potwory), `passive*` = obrażenia i Esencja potworów poza checkiem, `slept` martwe. Szczegóły liczenia: sekcja 05.

### 7.12.7 Statystyki fali: `newStats()` (`p3_flow.js`)

"Esencja" w polach `*Pts` to wartość zdarzenia przy mnożnikach z chwili zdarzenia (`addPts` zwraca `g * greed * combo * mods.regen`); dopłata za combo naliczone wstecz jest w `comboPts`. Wyjątek: `edgePts` jest w jednostkach Grozy.

| Pole | Znaczenie |
|---|---|
| `dmgPts` | Esencja z ran (pułapki, łup-pułapka, ogień, potwory) i ze spowolnienia siecią |
| `fearPts` | Esencja ze strachu |
| `scarePts` | Esencja za wypędzonych strachem |
| `killPts` | Esencja za zabitych |
| `lootPts` | Esencja za zabrany łup |
| `crystalPts` | Esencja za odzyskany kryształ |
| `wavePts` | zawsze 0 (od v15) |
| `lostPts`, `lonePts` | Esencja z błądzenia i samotności |
| `healPts` | Esencja z leczenia przez kapłana |
| `edgePts` | połowa premii "Na skraju" (rany przy HP < 30%), w Grozie |
| `kills`, `killsMon`, `killsTrap`, `killsHeart` | zabici razem i wg źródła |
| `scared` | wypędzeni strachem |
| `escaped` | wszyscy, którzy wyszli z lochu |
| `left` | wyszli bez kryształu i bez strachu |
| `crystalTaken`, `crystalLost`, `crystalSaved` | kradzieże u serca, wyniesione, odzyskane |
| `loot`, `lootSeen` | łupy zabrane i zauważone |
| `lootSkipped`, `lootRisked` | decyzja "nie biorę"; "biorę" mimo ryzyka > 2 |
| `rooms` | pokoje odkryte w fali |
| `rumorRooms`, `rumorTraps`, `rumorFalse` | pokoje i pułapki znane z plotek na starcie; obalone fałszywe plotki |
| `maxCombo` | najwyższe combo |
| `disarmed`, `disarmFails` | rozbrojenia udane (także krata, przygotowania) i nieudane |
| `detected`, `learned`, `notLearned` | pułapki wyczute skanem; zapamiętane po odpaleniu; widziane, ale niezapamiętane |
| `retreats`, `panics`, `flees`, `partyFlees` | odwroty, paniki, ucieczki pojedyncze i całej drużyny |
| `scouts`, `wanders`, `talks`, `regroups` | zwiady złodzieja, samotne wędrówki, rozmowy (postoje), czekanie na maruderów |
| `fearDealt` | suma zadanego strachu (surowe punkty) |
| `checks`, `checkOk`, `checkCrit`, `checkMiss`, `checkSkip` | skill checki i ich wyniki |
| `skipLethal` | odpuszczone checki, w których i draśnięcie, i krytyk by zabiły |
| `souls` | dusze (= zabójstwa) |
| `itemsGot`, `itemsUsed` | przedmioty zdobyte i użyte przez bohaterów |
| `dodges`, `shields`, `charms`, `bombs`, `potions` | uniki, tarcze, talizmany, bomby, mikstury (wypite i podane) |
| `heals`, `cleanses`, `barriers`, `dispels`, `blessed` | leczenia, oczyszczenia, bariery kapłana, rozproszenia sieci, odczynione pułapki |
| `lines` | wypowiedziane kwestie |
| `slept` | martwe (drzemki liczy `naps`) |
| `silenceTime` | martwe (`fl.silence` nigdy nie jest prawdą) |
| `pauseTime`, `ffTime` | czas pauzy w fali (s rzeczywiste), czas przyspieszenia palcem (s gry) |
| `essBase` | Esencja z regeneracji (`S.regenBase`, domyślnie 0) |
| `essFear`, `essDrop` | Esencja z karty Żniwa strachu, z zabranej relikwii (+4) |
| `essSoul` | martwe |
| `built` | użycia narzędzi, skrzynie i elementy postawione w fali (zwykłe stawianie w budowie się nie liczy) |
| `monstersLost` | potwory zabite |
| `falls`, `cages`, `rescues`, `abandons` | zapadnie, klatki, uwolnienia, porzucenia uwięzionych |
| `timing` | weteran przebiegł przez przeładowującą się pułapkę |
| `healed` | suma wyleczonych HP |
| `lostTime`, `loneTime` | sekundy zgubienia i samotności |
| `fearSrc` | mapa źródło -> suma strachu |
| `preps`, `wards`, `jams`, `prepDisarms` | przygotowania przed pokojem: ile, osłony kapłana, zakłócenia maga, rozbrojenia złodzieja |
| `breach` | 1 = fala weszła wyłomem |
| `sapped`, `sensed` | pułapki rozmontowane na stałe; wyczute zmysłem |
| `greedKept` | chciwość dodana na stałe z zabranego łupu |
| `swaps`, `potionsGiven`, `amulets`, `boots`, `goldPicked` | wymiany, podane mikstury, amulety, buty, monety |
| `cursed`, `curseLifts`, `faithOut` | przeklęci, zdjęte klątwy, koniec wiary kapłana |
| `detours`, `gotLost`, `searches` | objazdy, zgubienia, poszukiwania |
| `deathFear` | strach dodany innym przez śmierć towarzysza |
| `roomsVisited` | odwiedzone pokoje i korytarze |

Pola dopisywane w locie (nie ma ich w `newStats`): `alarms`, `altarBlocks`, `altarHeals`, `answers`, `autoFires` (odpalenia przy `ff`), `bardCalls`, `bardHeard`, `batScatter`, `breachOpen`, `broken`, `cageDeaths`, `charmSoak`, `chorus`, `comboPts`, `crystalDropped`, `cursedSeen`, `disputes`, `echoes`, `essGlut`, `essHeart` (porcja serca), `essWave` (Esencja do sakiewki), `fogGrope`, `healCalls`, `howlBlocks`, `hungerAte`, `hushLost`, `hushUnlearned`, `lootArgue`, `lootWeighed`, `memFires`, `memLost`, `naps`, `panicExits`, `panicked`, `patched`, `phobiaFear`, `prophecy`, `rage`, `rageNoPanic`, `rages`, `regroupsDoor`, `repelled`, `reroutes`, `returnersOut`, `revealed`, `revenge`, `rigged`, `rumorLoot`, `runeBlocks`, `shackleBlocks`, `shouts`, `skullOff`, `slips`, `smashedObj`, `smashes`, `songs`, `speedTime` (martwe), `traumas`, `trayPauses`, `treasureTale`, `upgrades`, `volleys`, `volleyTraps`, `wildfire`. Każde jest licznikiem albo flagą 0/1 ustawianą tam, gdzie zdarzenie zachodzi (nazwa opisuje zdarzenie; miejsca: `grep "stats.<pole>"`).

W Unity: stały, typowany słownik statystyk (np. `enum StatId`) zamiast pól dodawanych w locie; zaokrąglanie dopiero w eksporcie i nie do liczb całkowitych dla wartości ułamkowych.

### 7.12.8 Ankieta (tylko wersja WWW)

- Pokazywana przed ekranem końca pierwszego zakończonego runu na urządzeniu, gdy `WEB` i `yatd-survey` jest puste (`openModal`), oraz z menu, dopóki stan != `'done'`.
- Pytania `SURVEY`: `fun` (1-5), `clear`, `best`, `worst`, `again` + pole tekstowe (max 1000 znaków); wszystkie opcjonalne.
- "Wyślij": `yatd-survey = 'done'`; dokument do kolekcji `survey`, id `deviceId + '_' + (runId || 'menu')`: `{version, device, runId, at, player, answers, text, run: {result, waves, total, tutorial, minutes} | null}`. "Pomiń": `'skipped'` (jeśli puste).

### 7.12.9 "Pobierz wyniki" (`p8b_ui.js: downloadRun, getDownloads, copyFallback`)

- Dostępne w menu (gdy run ma co najmniej jedną falę zapisaną albo trwa fala) i na ekranie końca runu.
- Zawartość: `{format: 'yatd-run', run: runSummary(), waves: run.waveDocs}`, nazwa `yatd-run-<runId>.json`.
- Kolejność prób: API pobierania strony Claude (`window.claude.use('downloads')`); w wersji WWW link `Blob`; inaczej kopia do schowka; ostatecznie pole tekstowe do ręcznego skopiowania.
- Po wczytaniu runu z zapisu `waveDocs` sprzed wczytania nie mają osi czasu (zapis ją pomija).

---

## 7.13 Błędy, martwy kod i niespójności (do decyzji przy przenoszeniu)

Błędy (prawdopodobne; w Unity naprawić, chyba że autor zdecyduje inaczej):
1. `remapRunState` przy przesunięciu siatki nie przesuwa `run.rumor.loot` ani `run.memSpots` (klucze kafelków): po wykopaniu pokoju w lewo plotki o łupie i pamięć checku wskazują złe kafelki (`p2_state_map.js: remapRunState`).
2. Cofnięcie kopania, które zmieniło `WW` albo przesunęło siatkę: przywrócona kopia `rumor.tiles` (indeksy dla starego `WW`) jest dekodowana z bieżącym `WW` w `remapRunState`, a `rumor.traps` nie jest przywracane wcale (`p8b_ui.js: undo`).
3. `applyTool` (demolish) wywołuje `forgetTiles` przed sprawdzeniem, czy wyburzenie się uda; przy porażce plotki o pokoju i tak znikają (stos cofania zdejmuje wpis bez przywracania) (`p3_flow.js: applyTool`). W praktyce rzadkie, bo znaczniki pokazują tylko dozwolone wyburzenia.
4. Narzędzia lochu (`applyTool`) i postawienie skrzyni (`tryPlace`, gałąź `crate`) nie wywołują `saveRunSoon`; zmiany zapisze dopiero następny zapis (np. `startWave`). Zamknięcie karty zaraz po kopaniu cofa kopanie.
5. Zapis zawiera `waveDocs` (bez osi czasu, ale z resztą dokumentów); przy długim runie może przekroczyć limit `localStorage`, a `saveRun` cicho zwraca `false`.
6. Kod `tr` w osi czasu oznacza dwie różne rzeczy (trauma i zapadnia).
7. `roundStats` zaokrągla do całości także wartości ułamkowe (`greedKept`, `treasureTale`, `essGlut`).
8. `fl.stats` z budowy trafia do statystyk następnej fali (np. `built`, `upgrades`, `patched`); przy analizie trzeba o tym pamiętać.
9. `recordWave` zapisuje `heroes[].out = 'crystal'` tylko dla `h.crystal`, a `heroExit` zeruje `h.crystal` i ustawia `h.carriedOut`; niosący, który wyniósł kryształ, ma więc w `summary.heroes` wartość `'left'` (dokument fali `heroes[]` z `logWave` używa `carriedOut` i jest poprawny) (`p3_flow.js: recordWave`).

Martwy kod (nie przenosić albo przenieść świadomie):
- `tapMove`, `trapNear` (`p8b_ui.js`): nigdzie niewywoływane; tryb `move` nie ma kafelka w pasku, gałąź `selected === 'move'` w `drawSlots` jest nieosiągalna.
- Tryb `upgrade`: jest w `ITEM_ORDER`, ale w żadnej zakładce, więc `selected === 'upgrade'` nie zdarza się w UI (ulepsza podwójne stuknięcie).
- `sizeMult`, `cardMultNow`, `infMult`, `loneMult` (zawsze 1), `stats.wavePts` (zawsze 0), `stats.slept`, `stats.essSoul`, `stats.silenceTime`, `stats.speedTime`, `bt().slept`, `DEFAULTS.trayAuto`, `UI.hintOpen`, `UI.speed`, `updateSpeedBtn`, `updatePauseBtn`, `essPulse`, `setHint` (pusta od 1.12), gałąź `QUIET.r == 0`, gałąź pętli w `genStartLayout` (dla N = 3 nie ma pętli), modal `tests` (`renderTests`, `SLIDERS`), `tl('cb')`.
- `run.continueUsed` jest zawsze `false`.

Niespójności:
- Komentarz przy `toolCost` mówi "3, 6, 12, 24", a przy cenie bazowej 4 rozbudowy kosztują 4, 8, 16, 32 (×`mods.expandCost`).
- `expandRefund` liczy zwrot z ceny bazowej, bez `mods.expandCost`.
- `canPlace` dla typu z `slot: null` (tryby) zwraca prawdę na kafelku, którego `slotOf` jest `null`; nieszkodliwe, bo tryby nie trafiają do `tryPlace`.
- `HEART` w `p1_config.js` (`{kind: 'heart'}`) to źródło obrażeń, a nie serce na mapie (`fl.heart`).

