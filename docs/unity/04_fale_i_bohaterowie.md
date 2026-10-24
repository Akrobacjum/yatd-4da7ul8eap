# 04. Fale i bohaterowie (kto przychodzi, jak silny, co niesie)

Sekcja specyfikacji portu prototypu "You are the dungeon" (Prototype 1.12.1, HTML/JS, uzupełniana do 1.24) do Unity 6 LTS (C#, Android, pion). Zmiany 1.18-1.24: więzi w drużynie (2.9), narzędzia gildii (2.6a), trudniejsze fale 1-4 (3.9), pochodzenie, ciężar i narzędzia przedmiotów (5.6), powracający z łupem (6.3), wyczerpanie zamiast teleportu na końcu fali (6.7), Nemezis (6.9), pamięć poległych (6.10), nauka w jednym runie (7). Opisuje skład każdej fali, siłę bohaterów, ich tożsamość (klasa, imię, charakter, ciało, fobia, blizna), ekwipunek, gildię, łowców skarbów, powracających, wyłom, plotki z karczmy i cierpliwość fali. Wszystkie liczby są skopiowane z kodu w `/home/claude/yatd-4da7ul8eap/src/`. Źródło każdej reguły podaję jako `plik.js: funkcja`.

Inne sekcje (nie powtarzam ich treści): **03** przebieg runu, ekonomia (Groza × Chciwość × Combo = Esencja), sklep, karty; **05** pułapki, obrażenia, strach, skill checki; **06** AI bohaterów (ruch, decyzje, drużyna, mowa); **07** mapa, stawianie, pętla, zapis; **08** UI, kamera, grafika, audio, samouczek.

Tabele treści są wyeksportowane do `data/*.json` (katalog obok tego pliku): `HEROES`, `HERO_TRAITS`, `PHYS`, `PHOBIAS`, `PHOBIA_OF_ATTR`, `SCAR_RES`, `CLASS_RES`, `CLASS_RES_TEXT`, `CLASS_SKILL`, `KIT`, `HITEMS`, `GEAR_POOL`, `TIERS`, `BOSS_NAME`, `NAMES_M`, `NAMES_F`, `PARTY`, `CLASSIC`, `LEADER_ORDER`, `levelStats_1_30`, `DMG_OF`, `DMG_TYPES`, `CURSED`, `SCARE`, `DRIFT`, `ONB_STAGES`, `ONB_ITEM`, `ONB_CARD`, `SAY`. Nie przepisuję ich; opisuję znaczenie pól i reguły. Małe tablice zdefiniowane poza `p1_config.js` są przepisane w całości.

Liczby w tej sekcji zapisuję z kropką dziesiętną (jak w kodzie).

---

## 0. Pojęcia i konwencje

| Pojęcie | Znaczenie |
|---|---|
| wpis (`e`, entry) | Obiekt opisujący bohatera przyszłej fali. Tworzy go `p3_flow.js: makeHero`, zbiera `p3_flow.js: makeWave` w tablicę `run.next`. Jest zapisywany w save, pokazywany na liście "następna drużyna" i na karcie bohatera. |
| bohater (`h`) | Obiekt w `fl.heroes` tworzony z wpisu przez `p3_flow.js: spawnHero` w trakcie fali. Ma wskaźnik `h.entry` na swój wpis. |
| `n` | Numer fali, dla której tworzymy wpisy. |
| `run.wave` | Numer bieżącej fali (w budowie: fali, która zaraz wejdzie). |
| `S` | Ustawienia (`DEFAULTS` + suwaki `SLIDERS`, `p1_config.js`). Tu ważne: `S.scale` = 1 (suwak 0.5-2, "Tempo wzrostu fal"), `S.heroHp` = 100 (50-200, procent), `S.earlyHp` = 1 (0-3), `S.greedW` = 1 (0-3), `S.heroSpeed` = 100 (50-200), `S.waveTime` = 120 (60-300 s, "Cierpliwość fali"). |
| `mods` | Modyfikatory z kart (sekcja 03, `p3_flow.js: freshMods`). Tu używane: `pactLevels`, `oddBodies`, `revealAll`, `phobiaK`, `weakK`, `traumaK`, `badMemories`, `moreReturn`, `returnGreed`, `itemPower`, `calmK`, `dmgType`, `arsenal`. |
| `stageOf()` | Etap onboardingu 1.12: `run.stage \|\| ONB_FULL` (`ONB_FULL = 4`), patrz rozdział 7. |

Losowość w prototypie: `Math.random()` daje [0, 1); `pick(a)` wybiera równomiernie; `shuffle(a)` to Fisher-Yates w miejscu (`p2_state_map.js: shuffle`); `rand(a, b)` to liczba całkowita z [a, b] (`p2_state_map.js: rand`).

**Zaokrąglanie (ważne dla portu):** JS `Math.round(x)` = `floor(x + 0.5)` (2.5 -> 3). W C# nie używać `Math.Round` (zaokrąglanie bankierskie, 2.5 -> 2). Odpowiednik: `Mathf.FloorToInt(x + 0.5f)`. Dotyczy wszystkich `round(...)` w tej sekcji (poziomy, HP, odwaga).

---

## 1. Cykl życia składu fali

1. **Koniec fali n** (`p3_flow.js: finishWave`): kolejno `payChain`, plotki (rozdz. 6.5), `feedHeart`, `run.greedRep = fl.greed` (chciwość, którą słyszy gildia), `collectReturners` (rozdz. 6.3), `recordWave` (zapis statystyk fali do `run.waves`, z nich korzysta gildia), potem **jeśli `run.crystals > 0`: `run.next = makeWave(run.wave + 1); run.nextFor = run.wave + 1`**. Skład następnej fali jest więc znany już na ekranie podsumowania fali.
2. **Start budowy** (`p3_flow.js: startBuild`): jeśli `!run.next || run.nextFor !== run.wave`, to `run.next = makeWave(run.wave)` (pierwsza fala runu albo stary zapis). Raz na falę (`run.builtFor`) może powstać wyłom (rozdz. 6.4).
3. **Budowa**: gracz widzi skład (rozdz. 4.8). Skład się już nie zmienia: decyzja gildii i liczba łowców wynikają ze stanu na koniec poprzedniej fali. Wyjątek: wczytanie zapisu sprzed wersji 38 przelicza `run.next` (`p8b_ui.js`, wznowienie; tylko prototyp, w Unity bez odpowiednika).
4. **Start fali** (`p3_flow.js: startWave`): `fl.queue = run.next.slice()` (płytka kopia: te same obiekty wpisów), usunięcie z `run.returners` tych, którzy wchodzą teraz (`r.used === run.wave`), chciwość startowa (sekcja 03), `applyRumors()` (rozdz. 6.5), `chooseEntrance()` (rozdz. 6.4), baner "Fala N" z podpisem: "prowadzi ich bohater z przepowiedni" / "prowadzi ich czempion" / "1 bohater" / "N bohaterów", plus " · wchodzą przez wyłom!" albo " · wchodzą drzwiami", gdy wyłom istnieje.
5. **Wejście** (`p6_loop.js: step`): bohaterowie z kolejki wchodzą co 0.3 s (rozdz. 6.6).

---

## 2. Skład fali: `makeWave(n)`

### 2.1 Liczebność i bossowie

```
tutW1(n)     = n == 1 && run.tutorial                      // pierwsza fala samouczka
partySize(n) = tutW1(n) ? 2 : n <= 3 ? 3 : n <= 10 ? 4 : n <= 14 ? 5 : 6
waveSize(n)  = min(6, partySize(n) + (bossOf(n) && !tutW1(n) ? 1 : 0))
bossOf(n)    = n % 5 == 0 ? (n % 10 == 0 ? 'final' : 'champion') : null
RUN_WAVES    = 10
```
Źródło: `p3_flow.js: tutW1, partySize, waveSize, bossOf`; `p1_config.js: RUN_WAVES`.

| Fala | 1 (samouczek) | 1-3 | 4 | 5 | 6-9 | 10 | 11-14 | 15 | 16-19 | 20 | 21+ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| partySize | 2 | 3 | 4 | 4 | 4 | 4 | 5 | 6 | 6 | 6 | 6 |
| boss | - | - | - | champion | - | final | - | champion | - | final | co 5 fal: champion, co 10: final |
| waveSize | 2 | 3 | 4 | 5 | 4 | 5 | 5 | 6 (limit 6) | 6 | 6 | 6 |

- Fala 5: Czempion/Czempionka (`BOSS_NAME.champion`). Fala 10: Bohater/Bohaterka z przepowiedni (`BOSS_NAME.final`). Przetrwanie fali 10 z kryształami = wygrana (sekcja 03); potem można grać dalej ("fale bez końca"), gdzie bossowie wracają: 15 champion, 20 final, 25 champion, 30 final itd.
- Od fali 15 limit 6 pochłania "+1 za bossa": boss zastępuje zwykłego członka drużyny.
- `waveName()` pokazuje "Fala N/10" do fali 10, potem "Fala N" (`p3_flow.js: waveName`).

### 2.2 Klasy: CLASSIC kontra PARTY, bez powtórzeń

```
classes = shuffle(copy(n <= 3 ? CLASSIC : PARTY)).slice(0, size)
g = run.guild = guildAdapt(n)                                   // rozdz. 6.1
if (g && !classes.includes(GUILD_WANT[g.kind]))
    classes[size > 1 ? 1 : 0] = GUILD_WANT[g.kind]              // specjalista gildii na indeksie 1
```
Źródło: `p3_flow.js: makeWave`.

- `CLASSIC` = 4 klasy klasyczne (wojownik, złodziej, kapłan, mag), `PARTY` = 6 klas (plus bard i barbarzyńca). Dane: `data/CLASSIC.json`, `data/PARTY.json`.
- Losowanie bez zwracania, więc **nigdy dwie postacie tej samej klasy** w fali (6 klas, maks. 6 bohaterów).
- Fale 1-3: tylko klasy klasyczne. Wyjątek: w fali 3 gildia może wstawić barda (`lost`) albo barbarzyńcę (`block`), bo podmiana działa niezależnie od puli.
- Podmiana gildii trafia zawsze w indeks 1 (nigdy przywódca, nigdy łowca, nigdy rekrut: patrz 2.3), chyba że klasa specjalisty już jest w składzie (wtedy nic się nie zmienia, nawet jeśli specjalista jest łowcą albo rekrutem).

### 2.3 Poziomy i role na liście

Kolejność na liście ma znaczenie: indeks 0 to "przywódca" (dostaje premię poziomów; w fali bossa to boss), ostatnie pozycje to łowcy skarbów, przed nimi ewentualny rekrut. Kolejność listy = kolejność wejścia do lochu.

```
size    = waveSize(n)
hunters = (n >= 3 && stageOf() >= 4) ? min(size - 2, huntersN(greedRaw(run.greedRep || 1))) : 0
recruit = n >= 4 && partySize(n) > partySize(n - 1) && !bossOf(n)
base    = waveBase(n)                       // rozdz. 3.1
hl      = huntersLv()                       // rozdz. 3.2 (premia z chciwości)
for i in 0 .. size-1:
    isHunter  = i >= size - hunters
    isRecruit = recruit && !isHunter && i == size - hunters - 1 && i >= 2
    bonus     = i == 0 ? 1 + hl : isRecruit ? -3 : hl / 2
    L = max(1, round(base + bonus + rnd() * 1.7 - 1.2))
    if (tutW1(n)) L = min(L, 2)                 // 1.24; do 1.23: if (n <= 2) L = min(L, tutW1(n) ? 2 : 4)
    e = makeHero(classes[i], L, n, used)
    if isHunter:  e.trait = 'greedy'; e.hunter = true
    if isRecruit: e.recruit = true
```
Źródło: `p3_flow.js: makeWave`.

- **Szum poziomu**: `rnd() * 1.7 - 1.2` daje przedział [-1.2, 0.5), średnio -0.35.
- **Przywódca** (indeks 0): +1 poziom + pełna premia chciwości `hl`. Pozostali (także łowcy): `hl / 2`.
- **Rekrut** ("najnowszy członek jest nowicjuszem przez jedną falę"): tylko w falach, w których drużyna rośnie (`partySize(n) > partySize(n-1)`), od fali 4 i nie w falach bossa. W praktyce: fala 4 (3 -> 4) i fala 11 (4 -> 5); fala 15 (5 -> 6) jest falą bossa, więc bez rekruta. Rekrut to ostatni nie-łowca, o ile ma indeks >= 2; poziom bazowy -3 zamiast `hl/2`. Przy 2 łowcach w fali 4 rekruta nie ma (wypadłby na indeks 1).
- **Limit poziomu**: od 1.24 tylko w pierwszej fali samouczka (maks. 2); do 1.23 także maks. 4 w falach 1-2. Nie dotyczy bossów ani powracających.
- Na końcu `makeWave` (od 1.20) gildia dokłada narzędzia (2.6a), a od 1.21 `makeBonds(list, n)` łączy część bohaterów w pary (2.9).
- `used` = zbiór imion (mianownik) już nadanych w tej fali (rozdz. 4.1).

### 2.4 Powracający wstawiani do fali

Po zbudowaniu listy `makeWave` wstawia powracających (zbieranych przez `collectReturners`, rozdz. 6.3):

```
back = 0
for r in run.returners (od 1.23 posortowani: Nemezis pierwszy)
        where r.back <= n && (!r.used || r.used == n):
    if back >= (n >= 8 ? 2 : 1): continue                  // maks. 1 na falę, od fali 8 maks. 2
    same = indeks pierwszego wpisu z type == r.type (albo -1)
    if (same == 0 && bossOf(n)) || (same >= 0 && list[same].returning): continue
    idx = same
    if idx < 0:
        idx = ostatni i od size-1 do 1, dla którego list[i] nie jest łowcą, rekrutem, powracającym
              i list[i].type != GUILD_WANT[g?.kind]
    if idx < 0: continue
    back++
    L = max(list[idx].lvl, r.lvl + 1 + (r.crystal ? 1 : 0)) + (r.nemesis ? 2 : 0)     // 1.23: Nemezis +2 poziomy
    list[idx] = makeHero(r.type, L, n, used, null, {
        nm: r.nm, female: r.female, phys: r.phys, phobia: r.phobia, trait: r.trait,
        known: [r.phys ? 'phys' : null, r.phobia ? 'phobia' : null] bez null,
        returning: true, scar: r.scar, times: r.times,
        gear: r.gear, wasLost: r.wasLost,                                              // 1.20 (6.3)
        nemesis: r.nemesis ? kopia(r.nemesis) : null })                                // 1.23 (6.9)
    r.used = n
```
Źródło: `p3_flow.js: makeWave`.

- Powracający zajmuje miejsce **własnej klasy** (także przywódcy, poza falą bossa) albo, gdy jego klasy nie ma w składzie, ostatniego "zwykłego" członka (indeksy od końca do 1, z pominięciem łowców, rekrutów, innych powracających i specjalisty gildii). W fali bossa powracający klasy bossa (indeks 0) czeka na następną falę.
- Poziom: co najmniej poziom zastępowanego miejsca (zachowuje premię przywódcy i chciwości), a co najmniej `r.lvl + 1`, plus 1, jeśli wtedy wyniósł kryształ (`r.crystal`).
- Powracający zachowuje imię, płeć, ciało, fobię, charakter (także `null`: nie losuje nowego), bliznę i licznik powrotów. Gracz zna jego ciało i fobię (`known`). Ekwipunek dostaje nowy (`makeKit` z nowego poziomu), a od 1.20 dodatkowo do dwóch trofeów z Twojego lochu i latarnię, jeśli się w nim zgubił (6.3). Nie jest łowcą ani rekrutem, nawet jeśli zastąpił łowcę lub rekruta tej samej klasy.
- `r.used = n` rezerwuje go dla tej fali; warunek `r.used == n` pozwala zbudować tę samą falę ponownie (wznowienie zapisu). `startWave` usuwa z `run.returners` tych z `used === run.wave`. Powracający, który się nie zmieścił, zostaje na liście i może wrócić w dowolnej późniejszej fali.

### 2.5 Boss

```
boss = bossOf(n)
if boss: list[0] = makeHero(list[0].type, round(base + hl) + (boss == 'final' ? 5 : 2), n, used, boss)
```
Źródło: `p3_flow.js: makeWave`, `makeHero`.

- Boss zastępuje indeks 0 (przywódcę), ma klasę wylosowaną dla tego miejsca, nowe imię, poziom bez szumu: `round(base + hl) + 2` (czempion) albo `+ 5` (przepowiednia).
- Mnożniki bossa w `makeHero`: HP ×1.7 (czempion) / ×3 (przepowiednia); odwaga ×1.5 / ×2; ekwipunek z poziomu `lvl + 2`.
- Boss **nie ma charakteru** (`trait` losowany tylko gdy `!boss`) i **nie ma fobii**, ale może mieć ciało (`phys`). Nie zostaje powracającym (`collectReturners` pomija `h.boss`).
- Zasady bossa w trakcie fali są w rozdz. 6.8.

### 2.6 Przedmioty od gildii (amulety i talizmany)

```
if g && (g.kind == 'fear' || g.kind == 'kill'):
    for e in list:
        if !(n >= 6 || e.type == {fear: 'priest', kill: 'warrior'}[g.kind]): continue
        if e.inv.length >= 3 + floor(e.lvl / 3): continue           // pełny plecak
        t = g.kind == 'fear' ? 'amulet' : 'charm'
        r = 1 + floor(e.lvl / 6)
        cur = e.inv.find(x => x.type == t)
        if cur: cur.r = max(cur.r, r); cur.charges = (cur.charges || 0) + 1
        else:   e.inv.push({ type: t, r, charges: 1 })
```
Źródło: `p3_flow.js: makeWave`.

- Do fali 5 włącznie przedmiot dostaje tylko specjalista (kapłan przy `fear`, wojownik przy `kill`); od fali 6 każdy członek drużyny (także boss), jeśli ma miejsce w plecaku.
- Przedmiot gildii ma zawsze **1 użycie** (nie `powerCharges`) i nie ma flagi `kit`. Jeśli bohater ma już przedmiot tego typu, ten dostaje +1 użycie i ewentualnie wyższą moc.

### 2.6a Narzędzia od gildii: latarnia i łom (1.20, `p3_flow.js: makeWave`)

Od fali 4 pełnej gry (`n >= 4 && stageOf() >= 3`), po przedmiotach gildii, najwyżej jedno narzędzie każdego rodzaju na drużynę (`src: 'guild'`, `r: 1`), tylko bohaterowi z miejscem w plecaku (`inv.length < 3 + floor(lvl / 3)`):
```
latarnia: odpowiedź gildii 'lost' -> pierwszy z miejscem
          inaczej: w lochu jest Mgła (komórka z rt 'fog') i rnd() < 0.35 -> losowy nie-boss z miejscem
łom:      odpowiedź gildii 'block' -> barbarzyńca z miejscem, inaczej pierwszy z miejscem
          inaczej: w lochu stoi krata i rnd() < 0.3 -> wojownik albo barbarzyńca z miejscem, inaczej losowy z miejscem
```
Narzędzia nigdy nie pochodzą z łupu (`rollItem` odfiltrowuje `HITEMS[t].tool`). Działanie: 5.6 i sekcja 06 (6.11).

### 2.9 Więzi w drużynie (1.21, zmienione w 1.24; `p3_flow.js: makeBonds, bondLabel, bondMate, spawnHero`)

```
makeBonds(list, n):                                // na końcu makeWave, po powracających i bossie
   if tutW1(n) || list.length < 2: return
   for k in 0, 1:
      if rnd() >= (k ? 0.45 : 0.75): break          // 1.24: pierwsza więź 75%, druga 45% (1.21: 55% i 30%)
      f = indeksy bez więzi i nie-powracający; jeśli < 2: break
      ment = pary (i, j): list[i].rank >= 1 && (list[j].rank == 0 || list[j].recruit || list[i].rank >= list[j].rank + 1)   // 1.24: uczeń to nowicjusz, rekrut albo ranga niżej
      riv  = pary i < j, obaj "twardzi" (chciwy, odważny albo łowca)
      r = rnd()
      r < 0.15 -> rodzeństwo (sibling)
      r < 0.35 -> mistrz i uczeń (mentor), jeśli jest para w ment (inaczej przyjaciele)        // 1.24: 20% (1.21: 25%)
      r < 0.80 -> rywale (rival), para z riv albo dowolna                                       // 1.24: 45% (1.21: 25%)
      inaczej  -> przyjaciele (friend)
      para bez wyboru: losowa z f
      list[a].bond = { type, with: b, role: mentor ? 'mentor' : null }; list[b].bond = { type, with: a, role: mentor ? 'apprentice' : null }
```
- Najwyżej jedna więź na bohatera, żadnej dla powracającego, żadnej w pierwszej fali samouczka. Dwóch tej samej klasy nie ma w drużynie (od 1.05), więc rywale to zawsze różne klasy.
- Zmiana w 1.24: bez nowicjuszy w falach 1-3 (trudniejszy początek, 3.9) mistrzów prawie nie było, więc uczniem może być nowicjusz, rekrut fali albo ktoś o randze niżej.
- Pomiar na 750 drużynach (fale 2-8, 1.21): 56-58% z więzią, 14-17% z dwiema; przyjaciele 53%, rywale 25%, rodzeństwo 16%, mistrzowie 4%. 1.24 (test `t121_bonds`): ok. 75% drużyn z więzią, ok. 27% z dwiema.
- `spawnHero`: `h.bond = { type, id: id + e.bond.with - indeks wpisu w run.next, role }` (wchodzą w kolejności listy, więc id partnera = jego indeks); gdy wejdzie drugi z pary: `stats.bonds`, `stats.bondsBy[type]`, oś czasu `bo`.
- Pokazanie: karta bohatera (po Charakterze, `bondLabel`: "Przyjaciel: Borys", "Rywalka: Wanda", "Mistrz/Mistrzyni" = jego mistrz, "Uczeń/Uczennica" = jego uczeń, według płci partnera; "(zginął/zginęła)" po śmierci partnera), następna drużyna w podsumowaniu (`nextRow`: znacznik), lista drużyny w budowie (`drawNextWave`: " · rywal: wanda"). Zapis i dziennik: `heroes[].bond` = "type[:role]:id".
- Zachowanie par (słowa, żałoba, zemsta, "Nie zostawię cię", mistrz, rywale, kłótnie, zakłady): sekcja 06, 6.12.

### 2.7 Przywódca w trakcie fali (`LEADER_ORDER`)

Indeks 0 na liście to tylko "przywódca" przy liczeniu poziomów. W trakcie fali przywódcę wybiera `p5_ai.js: leader()`: jeśli obecny przywódca nie żyje, wyszedł, zniknął (`gone`), zgubił się, panikuje, siedzi w klatce albo ucieka (gdy drużyna nie ucieka), to spośród żywych, niezgubionych, niepanikujących, niezamkniętych i nieuciekających wybiera najwyższy `rank` (tier, rozdz. 3.5), a przy remisie wcześniejszą klasę w `LEADER_ORDER` = wojownik, barbarzyńca, kapłan, bard, mag, złodziej (`data/LEADER_ORDER.json`). Brak kandydatów: pierwszy żywy. Szczegóły zachowania przywódcy: sekcja 06.

### 2.8 Fale bez końca (po 10)

Nic specjalnego poza wzorami: `partySize` rośnie do 5 (fale 11-14) i 6 (od 15), `grozaTyp` rośnie liniowo, `SIZE_LV` daje +1.0 w falach 10-14 i 0 od 15, `endlessLv` dodaje 1.5 poziomu co 5 fal od 15 (rozdz. 3.1). Bossowie co 5 fal. Tablice `EARLY_LV`, `EARLY_HP`, `START_LV` mają wartości tylko do fali 10 (dalej 0). `comboHp` = 1.2 na stałe.

---

## 3. Siła bohatera

### 3.1 Bazowy poziom fali `waveBase(n)`

```
waveCurve(n) = 1 + (1.12*(n-1) + 0.007*(n-1)^2 + (EARLY_LV[n] || 0) + (tutW1(n) ? 0 : (START_LV[n] || 0))) * S.scale
grozaTyp(n)  = n <= 10 ? GROZA_TYP[max(0, n)] : 3.0 + 0.3*(n - 10)
sizeLv(n)    = n < SIZE_LV.length ? SIZE_LV[n] : 0
endlessLv(n) = n >= 15 ? 1.5 * floor((n - 10) / 5) : 0
waveBase0(n) = waveCurve(n) + grozaTyp(n)*S.scale + mods.pactLevels + endlessLv(n) + sizeLv(n)*S.scale   // 1.24: krzywa do 1.23
waveBase(n)  = atW(waveBase0, earlyW(n))         // 1.24: fale 1-4 jak późniejsze fale starej krzywej (3.9); od fali 5 = waveBase0(n)
```
Źródło: `p3_flow.js: waveCurve, grozaTyp, sizeLv, endlessLv, waveBase0, earlyW, atW, waveBase`.

Tablice (przepisane w całości, `p3_flow.js`; indeks = numer fali, indeks 0 nieużywany):

```
GROZA_TYP = [0, 0, 0.2, 0.5, 0.8, 1.2, 1.6, 2.0, 2.4, 2.7, 3.0]
EARLY_LV  = [0, 0, 0, 0.3, 0.6, 0.3, 0.9, 0.3, 0, 0.5, 0.7]
START_LV  = [0, 0.5, 0.7, 0.7, 0.4, 0.2, 0.1, 0, 0, 0, 0]
SIZE_LV   = [0, 0, 0, 0, 0, 0, 0, 1.5, 1.5, 1.5, 1.0, 1.0, 1.0, 1.0, 1.0]
EARLY_HP  = [0, 0.25, 0.25, 0.4, 0.4, 0.15, 0.25, 0, 0, 0, 0]      // rozdz. 3.6
```

Znaczenie (z komentarzy w kodzie):
- `waveCurve`: wzrost z numerem fali, bez sufitu. `S.scale` ("Tempo wzrostu fal") skaluje wszystko poza stałą 1.
- `GROZA_TYP`: dawniej Groza dodawała poziomy; od v13 nie dodaje, a tablica oddaje typowy przyrost z nagranych runów. Skalowana przez `S.scale`.
- `EARLY_LV`: fale 3-10 trochę silniejsze (fala 6 najmocniej).
- `START_LV`: mała przewaga na start (fale 1-6), wyłączona w pierwszej fali samouczka.
- `SIZE_LV`: rekompensata za mniejsze drużyny (4 zamiast 5-6 w falach 7-14): ok. +1.5 poziomu ≈ +20% HP, odwagi i siły. Skalowana przez `S.scale`.
- `endlessLv`: w falach bez końca zamiast kolejnych bohaterów.
- `mods.pactLevels`: karta Krwawa umowa (+2 poziomy na kopię, sekcja 03). Nie jest skalowana.

### 3.2 Chciwość podnosi poziomy

```
greedRaw(g)  = g <= 1 ? g : (g*g + 1) / 2                     // odwrotność krzywej chciwości
greedLv(g)   = g <= 4 ? max(0, g - 1) : 3 + 1.8 * ln(g / 4)
huntersLv()  = S.greedW * greedLv(greedRaw(run.greedRep || 1))
huntersN(g)  = g < 3 ? 0 : g < 4.5 ? 1 : 2 + max(0, floor(log2(g / 4.5)))
```
Źródło: `p3_flow.js: greedRaw, greedLv, huntersLv, huntersN`.

- `run.greedRep` = chciwość (po krzywej, sekcja 03) z końca poprzedniej fali (`finishWave`), na starcie runu 1. Gildia ocenia ją w surowej skali (`greedRaw`).
- `hl = huntersLv()` dodaje się: przywódcy w całości (+1 stały), pozostałym w połowie, bossowi w całości (bez +1). Działa na każdym etapie onboardingu.
- `huntersN(raw)` = liczba łowców skarbów (rozdz. 6.2): 1 od surowej chciwości 3, 2 od 4.5, potem +1 przy każdym podwojeniu (9, 18, 36...). Limit w `makeWave`: `size - 2`.

| `greedRep` (po krzywej) | 1 | 1.5 | 2 | 2.24 | 2.5 | 2.83 | 3 | 3.5 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| surowa | 1 | 1.63 | 2.5 | 3.01 | 3.63 | 4.5 | 5 | 6.63 | 8.5 | 13 | 18.5 |
| `hl` (przywódca +1+hl) | 0 | 0.63 | 1.5 | 2.01 | 2.63 | 3.21 | 3.4 | 3.91 | 4.36 | 5.12 | 5.76 |
| łowcy (`huntersN`) | 0 | 0 | 0 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 4 |

### 3.3 Tabela `levelStats(L)` i kto używa każdego pola

`p1_config.js: levelStats(L)` zwraca obiekt; `k = L - 1`. Wartości dla poziomów 1-30: `data/levelStats_1_30.json`. Bohater ma go jako `h.R` (`spawnHero`), wpis liczy go w `makeHero`.

| Pole | Wzór | Kto używa (źródło) | Znaczenie |
|---|---|---|---|
| `lvl` | `L` | - | poziom |
| `name`, `color` | z `TIERS` (ostatni tier z `L >= min`) | UI: nazwa rangi i kolor obwódki (`p7_draw.js: drawNextWave`, `p8b_ui.js: renderHero`) | nazwa rangi, rozdz. 3.5 |
| `hp` | `0.85 * 1.13^k` | `p3_flow.js: makeHero` | mnożnik HP klasy |
| `courage` | `60 * 1.175^k` | `p3_flow.js: makeHero` | odwaga = próg strachu, po którym ucieka (sekcja 05) |
| `dps` | `0.9 * 1.08^k` | `p4_traps.js: monstersTick` (walka z potworem) | mnożnik `HEROES.dps` |
| `pow` | `1.08^k` | `p5_ai.js: heroAbilities` (leczenie 22×pow, bariera 12×pow, święte światło 25×pow, kula ognia 30×pow), `finishPrep` (egzorcyzm 40×pow) | siła zdolności kapłana i maga |
| `speed` | `1 + 0.02k` | `p5_ai.js: updateHero` | mnożnik `HEROES.speed` |
| `avoid` | `0.35 + 0.16k` | `p5_ai.js: planHero, chooseTarget` (parametr `avoid` w BFS) | jak mocno omija znane niebezpieczeństwo |
| `learn` | `1 - 0.5*0.7^k` | `p4_traps.js: fireRaw` (maks. wśród świadków) | szansa zapamiętania pułapki, która odpaliła przy nich |
| `detect` | `L >= 6 ? 1 + floor((L-6)/4) : 0` | `p5_ai.js: scanTraps` | promień wykrywania pułapek (pola, metryka Czebyszewa) |
| `disarm` | `1.7 * 0.88^k` | `p5_ai.js: disarmJob, blessJob` | mnożnik czasu rozbrajania / odczyniania |
| `fail` | `0.35 * 0.5^k` | `p5_ai.js: updateHero` (stan `disarm`), `finishPrep` | szansa, że rozbrajanie odpali pułapkę |
| `rumor` | `min(1, 0.4 + 0.15k)` | `p3_flow.js: applyRumors` (maks. w kolejce) | ile plotek z karczmy przyjmują |
| `risk` | `2.2 * 0.82^k` | `p5_ai.js: lootDecision` (`nerve = max(0.8, risk)...`) | brawura wobec łupu |
| `panic` | `1.5 * 0.86^k` | `p3_flow.js: kill` (strach po śmierci towarzysza; od 1.17 tylko u tych, którzy ją widzieli albo słyszeli krzyk), `p5_ai.js: perceiveThink` (wieść o śmierci, 0,6 dalekiego strachu) | jak mocno wstrząsa nimi śmierć |
| `potion` | `min(0.5, 0.15 + 0.03k)` | `p5_ai.js: updateHero` | próg HP (ułamek), poniżej którego pije miksturę |
| `coord` | `L >= 3` | `p5_ai.js: partyThink` (odwrót, zbiórka), `updateHero` (czekanie przy rozbrajaniu), `p3_flow.js: startFlee` (okrzyk) | koordynacja drużyny |
| `caution` | `L >= 6` | `p5_ai.js: updateHero` | szybkość ×0.8 na nieznanych polach (sprawdza podłogę) |
| `dodge` | `1 - 0.75*0.95^k` | `p3_flow.js: damage` (tylko złodziej) | szansa uniku kolców/strzał |
| `shield` | `0.5 * 0.94^k` | `p3_flow.js: trapMult, shieldCover` (wojownik) | mnożnik obrażeń pod tarczą |
| `shieldCd` | `max(2, 6 - 0.3k)` | `p5_ai.js: updateHero, finishPrep` | odnowienie tarczy (s) |
| `calm` | `2 + 0.4L` | `p5_ai.js: updateHero` | ile strachu na sekundę opada |
| `sapper` | `L >= 7 ? min(1, 0.08*(L-6)) : 0` | `p5_ai.js: updateHero, finishPrep` (złodziej) | szansa rozmontowania pułapki na stałe |
| `sight` | `L >= 8` | `p5_ai.js: onEnter` (mag) | mag wyczuwa wszystkie pułapki w pokoju po wejściu |

Dodatkowo poziom bohatera (`h.lvl`) wpływa na: szybkość skill checków (`p6_loop.js`, `CHECK_LV_SPEED = 0.015` na poziom, sekcja 05), szansę zgubienia się (`p5_ai.js: lostChance`, -0.01 na poziom), wiarę kapłana (6 + floor(lvl/2)), pieśni barda (2 + floor(lvl/4)), progi zdolności (rozdz. 4.3), pojemność plecaka (3 + floor(lvl/3)), wartość rzadkiego łupu (`lootDecision`: ×(1 + 0.06(lvl-1)) dla rzadkości >= 2).

### 3.4 Tier zachowania `tierOf` (szum poziomu: rozdz. 2.3, zaokrąglanie: rozdz. 0)

`rank = tierOf(L)` (`p1_config.js: tierOf`) to tier zachowania 0-3, używany w decyzjach tak/nie (sekcja 06):

```
tierOf(L) = L <= 2 ? 0 : L <= 5 ? 1 : L <= 9 ? 2 : 3
```

### 3.5 Nazwy rang: `TIERS` kontra `tierOf`

`TIERS` (`data/TIERS.json`): progi `min` 1, 3, 6, 10, 15, 20 i nazwy Nowicjusz/ka, Weteran/ka, Elita, Mistrz/Mistrzyni, Legenda, Mit oraz kolory. Pierwsze cztery progi pokrywają się z `tierOf` (0 = nowicjusz, 1 = weteran, 2 = elita, 3 = mistrz i wyżej). Legenda i Mit to tylko nazwy/kolory; zachowanie jak tier 3. Boss zamiast nazwy rangi pokazuje `BOSS_NAME` (`p3_flow.js: rankName`). Etykieta poziomu: `"poz. " + lvl + " " + ranga małymi literami + (", " + charakter)` (`p3_flow.js: lvlLabel`).

### 3.6 HP

```
comboHp(n) = 1 + COMBO_HP * min(1, max(0, n - 1) / 4)          // COMBO_HP = 0.2 (p1_config.js)
bm         = boss == 'final' ? 3 : boss ? 1.7 : 1
max        = round(HEROES[type].hp * levelStats(lvl).hp * bm * S.heroHp / 100 * earlyHpK(n))
hpK0(m)    = (1 + (EARLY_HP[m] || 0) * S.earlyHp) * comboHp(m)               // 1.24: dodatek HP do 1.23
earlyHpK(n) = max(hpK0(n), atW(hpK0, earlyW(n)))                             // 1.24: HP fali, jak którą gra (nigdy poniżej własnego)
h.hpK      = atW(comboHp, earlyW(n))                                         // Groza i strach z ran liczone względem max / hpK
hp         = max                                                // pełne HP na start
```
Źródło: `p3_flow.js: makeHero`; `p1_config.js: comboHp, COMBO_HP`.

- `HEROES[type].hp`: bazowe HP klasy (`data/HEROES.json`: wojownik 120, złodziej 70, kapłan 80, mag 65, bard 75, barbarzyńca 135).
- `EARLY_HP[n]`: dodatkowe HP w falach 1-6 (+25%, +25%, +40%, +40%, +15%, +25%), skalowane suwakiem `S.earlyHp` (0 = bez, 2 = podwójnie). Uwaga: etykieta suwaka mówi "fale 2-6", ale fala 1 też dostaje +25%.
- `comboHp(n)` (nowe w 1.12): rekompensata za mocniejsze combo pułapek (sekcja 05): fala 1 ×1.00, 2 ×1.05, 3 ×1.10, 4 ×1.15, od 5 ×1.20. Od 1.12.1 bohater pamięta ten mnożnik (`hpK: comboHp(n)` w `makeHero`, przepisywany w `spawnHero`), a Groza i strach z ran liczą się względem `h.max / h.hpK` (sekcja 05, `damage`): dodatek wydłuża najazd, ale nie obniża przychodu.
- `n` w `makeHero` to numer fali, dla której powstaje wpis (także u powracających).

### 3.7 Odwaga, szybkość, obrażenia

```
ck      = trait == 'coward' ? 0.8 : trait == 'brave' ? 1.2 : 1
courage = round(levelStats(lvl).courage * (boss == 'final' ? 2 : boss ? 1.5 : 1) * ck)
```
Źródło: `p3_flow.js: makeHero`. W `spawnHero`: `h.courage = e.courage || R.courage`, `h.fear = 0`.

- Szybkość (pola na sekundę): `T.speed * R.speed * S.heroSpeed/100 * (modyfikatory stanu)`; modyfikatory (sieć, panika, ucieczka, furia, buty, sakiewka, bagno, szarża...) są w sekcji 06 (`p5_ai.js: updateHero`). Bazowe `HEROES.speed`: wojownik 1.5, złodziej 1.9, kapłan 1.3, mag 1.3, bard 1.4, barbarzyńca 1.45.
- Obrażenia w walce z potworem na sekundę: `T.dps * R.dps * (wojownik ? 1.4 : 1) * (furia ? 1.5 : 1) * (1 + 0.25 * gearR(h, 'weapon') * itemPow(h))` (`p4_traps.js: monstersTick`). Bazowe `HEROES.dps`: 18, 10, 6, 8, 7, 20 (w kolejności jak wyżej). Bohaterowie nie ranią pułapek.
- `HEROES.greed` (0.6, 1.5, 0.9, 1.0, 1.2, 0.7) mnoży wartość łupu w `p5_ai.js: lootDecision` (sekcja 06).

### 3.8 Tabela przykładowa: fale 1-15

Stan 1.23: od 1.24 fale 1-4 są mocniejsze (3.9); wiersze fal 5-15 i bossów obowiązują dalej. Policzone node'em z kodu (`waveBase`, `levelStats`, `comboHp`, `EARLY_HP`) dla: zwykły run (nie samouczek), `S` domyślne, chciwość z poprzedniej fali 1 (`hl = 0`), bez kart. "E[L]" = wartość oczekiwana poziomu z szumem i limitem fal 1-2, w nawiasie zakres. "Typowy L" = `round(waveBase)` (z limitem 4 w falach 1-2). HP i odwaga dla typowego L, bez bossa i bez charakteru.

| Fala | party / fala | Boss | waveBase | Przywódca E[L] | Reszta E[L] | Typowy L | Ranga | R.hp | ×EARLY_HP | ×comboHp | HP razem (R.hp×E×C) | HP wojownika | HP maga | Odwaga |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 3/3 | - | 1.50 | 2.18 (1-3) | 1.29 (1-2) | 2 | Nowicjusz | 0.96 | 1.25 | 1.00 | 1.20 | 144 | 78 | 71 |
| 2 | 3/3 | - | 3.03 | 3.60 (3-4) | 2.62 (2-4) | 3 | Weteran | 1.09 | 1.25 | 1.05 | 1.42 | 171 | 93 | 83 |
| 3 | 3/3 | - | 4.77 | 5.45 (5-6) | 4.45 (4-5) | 5 | Weteran | 1.39 | 1.40 | 1.10 | 2.13 | 256 | 139 | 114 |
| 4 | 4/4 | - | 6.22 | 6.85 (6-8) | 5.85 (5-7), rekrut ok. 2.85 | 6 | Elita | 1.57 | 1.40 | 1.15 | 2.52 | 303 | 164 | 134 |
| 5 | 4/5 | czempion L9 | 7.29 | (boss) | 6.93 (6-8) | 7 | Elita | 1.77 | 1.15 | 1.20 | 2.44 | 293 | 159 | 158 |
| 6 | 4/4 | - | 9.38 | 10.03 (9-11) | 9.03 (8-10) | 9 | Elita | 2.26 | 1.25 | 1.20 | 3.39 | 407 | 220 | 218 |
| 7 | 4/4 | - | 11.77 | 12.45 (12-13) | 11.45 (11-12) | 12 | Mistrz | 3.26 | 1.00 | 1.20 | 3.91 | 470 | 254 | 354 |
| 8 | 4/4 | - | 13.08 | 13.69 (13-15) | 12.69 (12-14) | 13 | Mistrz | 3.68 | 1.00 | 1.20 | 4.42 | 531 | 287 | 416 |
| 9 | 4/4 | - | 15.11 | 15.72 (15-17) | 14.72 (14-16) | 15 | Legenda | 4.70 | 1.00 | 1.20 | 5.65 | 677 | 367 | 574 |
| 10 | 4/5 | przepowiednia L21 | 16.35 | (boss) | 16.00 (15-17) | 16 | Legenda | 5.32 | 1.00 | 1.20 | 6.38 | 766 | 415 | 674 |
| 11 | 5/5 | - | 17.20 | 17.82 (17-19) | 16.82 (16-18), rekrut ok. 13.8 | 17 | Legenda | 6.01 | 1.00 | 1.20 | 7.21 | 865 | 469 | 792 |
| 12 | 5/5 | - | 18.77 | 19.45 (19-20) | 18.45 (18-19) | 19 | Legenda | 7.67 | 1.00 | 1.20 | 9.20 | 1105 | 598 | 1094 |
| 13 | 5/5 | - | 20.35 | 21.00 (20-22) | 20.00 (19-21) | 20 | Mit | 8.67 | 1.00 | 1.20 | 10.40 | 1248 | 676 | 1285 |
| 14 | 5/5 | - | 21.94 | 22.55 (22-23) | 21.55 (21-22) | 22 | Mit | 11.07 | 1.00 | 1.20 | 13.28 | 1594 | 863 | 1774 |
| 15 | 6/6 | czempion L26 | 24.05 | (boss) | 23.65 (23-25) | 24 | Mit | 14.13 | 1.00 | 1.20 | 16.96 | 2035 | 1102 | 2449 |

Składniki `waveBase` (te same założenia):

| Fala | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| waveCurve | 1.50 | 2.83 | 4.27 | 5.42 | 6.09 | 7.78 | 8.27 | 9.18 | 10.91 | 12.35 | 12.90 | 14.17 | 15.45 | 16.74 | 18.05 | 24.81 |
| grozaTyp | 0 | 0.2 | 0.5 | 0.8 | 1.2 | 1.6 | 2.0 | 2.4 | 2.7 | 3.0 | 3.3 | 3.6 | 3.9 | 4.2 | 4.5 | 6.0 |
| sizeLv | 0 | 0 | 0 | 0 | 0 | 0 | 1.5 | 1.5 | 1.5 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 0 | 0 |
| endlessLv | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1.5 | 3.0 |

Pierwsza fala samouczka (`tutW1`): 2 bohaterów, `waveBase(1) = 1.00` (bez `START_LV`), przywódca poziom 1-2 (E = 1.59), drugi zawsze poziom 1.

Bossowie (te same założenia, `hl = 0`):

| Fala | Boss | Poziom | Poziom ekwipunku | Odwaga | HP: wojownik / złodziej / kapłan / mag / bard / barbarzyńca |
|---|---|---|---|---|---|
| 5 | czempion | 9 | 11 | 327 | 636 / 371 / 424 / 345 / 398 / 716 |
| 10 | przepowiednia | 21 | 23 | 3020 | 4231 / 2468 / 2821 / 2292 / 2645 / 4760 |
| 15 | czempion | 26 | 28 | 5072 | 4418 / 2577 / 2945 / 2393 / 2761 / 4970 |
| 20 | przepowiednia | 39 | 41 | 55033 | 38184 / 22274 / 25456 / 20683 / 23865 / 42957 |

### 3.9 Trudniejszy początek runu (1.24, w 1.25.1 w połowie cofnięty; `p3_flow.js: EARLY_W, EARLY_W_TUT, earlyW, atW, waveBase0, waveBase, hpK0, earlyHpK, tutW1`)

**1.25.1 (dane z playtestów 1.24-1.25):** 5 runów na 1.24/1.25 wobec 23 na v58: utracony kryształ w fali 2 11% -> 40%, w fali 3 7% -> 75%, w fali 4 21% -> 33%, w fali 5 62% -> 0% (próbka bardzo mała: 3 graczy). Nowy gracz przegrał pierwszy run z przewodnikiem w fali 3 (fala 2 przyszła z poziomami 5-7 zaraz po 2 nowicjuszach). Loch w fali 2-3 jest jeszcze mały, a poziomy były jak dawniej w fali 4-5. Zmiana:

```
EARLY_W     = [0, 2, 2.75, 3.5, 4.25]   // od 1.25.1: fala 1 jak dawna 2, potem 2,75 / 3,5 / 4,25; od fali 5 bez zmian
EARLY_W_TUT = [0, 1, 2, 3, 4]           // pierwszy run z przewodnikiem (run.tutorial): krzywa v58, z limitem poziomu 4 w falach 1-2
earlyW(n)   = tutW1(n) || n >= 5 ? n : (run.tutorial ? EARLY_W_TUT : EARLY_W)[n]
```
Średni poziom (test `t124a_play`, 150 drużyn): fala 1 2,9 (v58 1,5; 1.24 4,8), fala 2 4,3 (3,0; 5,9), fala 3 5,5 (4,8; 7,0), fala 4 5,7 (5,8; 6,9). Poniżej opis i wartości 1.24.


```
EARLY_W = [0, 3, 3.75, 4.3, 4.6]                  // 1.24 (od 1.25.1 inne, wyżej): fala 1 gra jak dawna fala 3, 2 jak 3,75, 3 jak 4,3, 4 jak 4,6
earlyW(n) = tutW1(n) || n >= EARLY_W.length ? n : EARLY_W[n]
atW(f, w) = f(floor(w)) * (1 - k) + f(floor(w) + 1) * k,   k = w - floor(w)      // liniowo między dwiema falami
```
Zmienia: poziom bazowy, dodatek HP (`EARLY_HP` × `comboHp`), `hpK` i limit poziomu (zniesiony poza samouczkiem). Bez zmian: liczebność (3 w falach 1-3), klasy klasyczne w falach 1-3, cierpliwość, głód od fali 2, serce w fali 1, poziom następnej fali w podsumowaniu liczony z nowego `waveBase`. Pierwsza fala samouczka (`tutW1`) gra po staremu (2 nowicjuszy, poziom <= 2).

Wartości (`S` domyślne, bez kart; policzone z kodu; średni poziom i HP z testu `t124a_play`, 150 drużyn na falę):

| Fala | `earlyW` | `waveBase` 1.23 -> 1.24 | `earlyHpK` 1.23 -> 1.24 | `hpK` | Średni poziom (1.23) | Średnie HP (1.23) | Bohaterów |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 1.50 -> 4.77 | 1.250 -> 1.540 | 1.100 | 4.76 (1.6) | 174 (95) | 3 |
| 2 | 3.75 | 3.03 -> 5.86 | 1.313 -> 1.593 | 1.137 | 5.82 (2.9) | 203 (121) | 3 |
| 3 | 4.3 | 4.77 -> 6.54 | 1.540 -> 1.541 | 1.165 | 6.60 (4.8) | 219 (176) | 3 |
| 4 | 4.6 | 6.22 -> 6.86 | 1.610 -> 1.610 (własny wyższy niż dawnej fali 5) | 1.180 | 6.01 (5.4; rekrut -3) | 234 (219) | 4 |
| 5-10 | bez zmian | bez zmian | bez zmian | 1.200 | bez zmian | bez zmian | bez zmian |

Skutek uboczny: w falach 1-3 nie ma już nowicjuszy (poziom <= 2), więc mistrzowie więzi 1.21 zniknęli; od 1.24 uczniem może być też rekrut albo ktoś o randze niżej (2.9). W odtworzeniach run strachu autora traci kryształ w fali 2 w 4 na 4 próby (1.23: 0-1), a w fali 3 w 3-4 na 4 (1.23: 1-4): cienka obrona strachem z wczesnego runu autora już nie wystarcza w falach 2-3 (sekcja 09, 11).

---

## 4. Tożsamość bohatera

### 4.1 Imię i płeć

```
female = pre.nm ? pre.female : rnd() < 0.4
pool   = (female ? NAMES_F : NAMES_M) bez imion z 'used'
nm     = pre.nm || pick(pool.length ? pool : pełna lista)
used.add(nm[0])
```
Źródło: `p3_flow.js: makeHero`.

- 40% kobiet. Imiona: `data/NAMES_M.json` (16), `data/NAMES_F.json` (13). Każde imię to trójka [mianownik, biernik, wołacz]; kwestie podstawiają je przez `{n}`, `{a}`, `{v}` (`p1_config.js: nameFill`).
- Płeć wybiera formę: nazwy klasy `HEROES[type].name[female ? 1 : 0]`, rangi `TIERS.name`, bossa `BOSS_NAME`, charakteru `HERO_TRAITS.name`, ciała `PHYS.name`, a w kwestiach szablon `{m|f}` (`p1_config.js: gtext`).
- W obrębie fali imiona się nie powtarzają, z wyjątkiem powracających (ich imię nie jest sprawdzane z `used`, więc może się zdublować).

### 4.2 Charakter (`HERO_TRAITS`)

Losowanie: `if (!boss && rnd() < 0.5) trait = pick(keys(HERO_TRAITS))`; `pre.trait` (powracający) nadpisuje, także wartością `null`. Łowca skarbów dostaje `'greedy'` na stałe. Pole `w` w `HERO_TRAITS` (wagi = 1) **nie jest używane** (losowanie równomierne). Źródło: `p3_flow.js: makeHero, makeWave`.

Opis dla gracza: `TRAIT_TEXT` (`p8b_ui.js`, przepisane w całości):
```
greedy:  'idzie po łup mimo ryzyka'
coward:  'panikuje wcześniej, śmierć towarzysza straszy go mocniej'
brave:   'śmierć towarzysza zamienia w furię'
careful: 'sprawdza podłogę, rzadziej wpada w pułapki'
```

Wszystkie skutki w kodzie:

| Charakter | Skutek | Źródło |
|---|---|---|
| greedy (chciwy/a) | odwaga bez zmian | `p3_flow.js: makeHero` |
| | złoto: `need = 1.6` (jak złodziej i łowca) | `p5_ai.js: lootDecision` |
| | wartość łupu ×1.8; odwaga wobec ryzyka `nerve` ×1.3 | `p5_ai.js: lootDecision` |
| | `avoid` ×0.85 przy planowaniu ścieżki | `p5_ai.js: planHero` |
| | na naradzie przy rozwidleniu (gdy alternatywa prowadzi do widzianego łupu) namawia na łup; przywódca chciwy (lub łowca, lub nowicjusz, lub 35%) ulega | `p5_ai.js: chooseTarget` |
| | gdy drużyna rusza na serce przy przeszukaniu < 85%: protestuje (`argueSearch`) | `p5_ai.js: partyThink` |
| | kwestie `lootGreedy`, `chat_greedy` | `p5_ai.js` |
| | 1.17: nie słucha rozkazu przywódcy "zostaw łup" (`lootReply`); prosi o przeszukanie mebli (`lookWant`), przy rozglądaniu wybiera meble (+2,5) i częściej znajduje monetę (0,3); jako przywódca najchętniej pozwala się rozglądać (0,55) i idzie sprawdzić pułapkę usłyszaną zza ściany; na naradzie po cierpliwości szturm +0,5, "jeszcze chwila" +0,8 | `p5_ai.js: lootDecision, lookRoll, lookPref, lookDone, chooseTarget, councilVote` |
| coward (tchórzliwy/a) | odwaga ×0.8 | `p3_flow.js: makeHero` |
| | próg paniki 0.55 zamiast 0.7 limitu strachu | `p3_flow.js: addFear` |
| | strach po śmierci towarzysza ×1.5 (od 1.17 gdy ją widział albo usłyszał krzyk; z wieści bez tego mnożnika) | `p3_flow.js: kill` |
| | kwestia ucieczki `cowardRun`; na naradzie (morale < 0.8) chce wracać; popiera odwrót | `p3_flow.js: startFlee`, `p5_ai.js: chooseTarget, partyThink` |
| | 1.17: przy rozglądaniu zwykle zostaje przy przywódcy (0,6) albo ogląda coś najwyżej 3 pola dalej; jako przywódca trzyma się bliżej wyjścia, omija pułapkę usłyszaną zza ściany i rzadko pozwala zwiedzać (0,15); na naradzie po cierpliwości dom +1,4, szturm -0,9, po przegranym głosowaniu częściej wraca sam (+0,35) | `p5_ai.js: lookRoll, chooseTarget, councilVote, councilThink` |
| brave (bohaterski/a) | odwaga ×1.2 | `p3_flow.js: makeHero` |
| | po śmierci towarzysza (jeśli nie ucieka; od 1.17 tylko gdy ją widział) wpada w furię (`startRage`), a strach z tej śmierci ×0.3 | `p3_flow.js: kill` |
| | odpowiada tchórzowi na naradzie, sprzeciwia się odwrotowi, uspokaja przestraszonych w rozmowach | `p5_ai.js: chooseTarget, partyThink` |
| | 1.17: jako przywódca idzie w głąb lochu i częściej "na czuja", idzie sprawdzić pułapkę usłyszaną zza ściany, rzadziej pozwala zwiedzać (0,35); na naradzie szturm +1, "jeszcze chwila" +0,2 | `p5_ai.js: chooseTarget, lookRoll, councilVote` |
| careful (ostrożny/a) | `avoid` ×1.3 | `p5_ai.js: planHero` |
| | wartość łupu ×0.6, kwestia `lootCareful` przy rezygnacji | `p5_ai.js: lootDecision` |
| | na naradzie mówi `argueCareful`; przy wejściu 40% na kwestię `cautious`; odpowiada na "chciwe" kwestie | `p5_ai.js: chooseTarget`, `p3_flow.js: spawnHero` |
| | 1.17: jako przywódca wybiera bliższe cele (odległość ×1,15, mało przypadku), omija pułapkę usłyszaną zza ściany, chętnie pozwala zwiedzać (0,5); na naradzie dom +0,4 | `p5_ai.js: chooseTarget, lookRoll, councilVote` |

Uwaga: tekst "sprawdza podłogę" nie ma pokrycia w kodzie dla charakteru (spowolnienie na nieznanych polach daje `R.caution`, zależne tylko od poziomu >= 6).

### 4.3 Klasa: dane, odporności, umiejętności

`HEROES[type]` (`data/HEROES.json`): `name` [m, f], `hp`, `speed`, `dps`, `color` (kolor postaci/listy), `letter` (litera klasy; w 1.12 nigdzie nieużywana, martwe dane), `greed` (mnożnik wartości łupu).

**Odporności klasy** `CLASS_RES` (`data/CLASS_RES.json`, opis dla gracza `CLASS_RES_TEXT`): mnożnik obrażeń danego typu; brak wpisu = 1. Typ obrażeń wynika z `DMG_OF` (`data/DMG_OF.json`): kłute (spikes, arrows, archer, goblin, mimic, bats), obuchowe (gate, ogre, trapdoor), ogień (fire, powder, a także podpalenie `BURN`; od 1.17.1 bez krwawienia z kolców, `burnBy 'spikes'`, które jest kłute, sekcja 05, 5.3.2), trucizna (spider, shaman, loot = karta Zatruty łup). Pułapki bez typu (np. web, cage, straszące) nie mają mnożnika typu. Pełny mnożnik:

```
typeMult(h, dtp):
    k = CLASS_RES[h.type][dtp] || 1
    P = PHYS[h.phys]
    if P && P.res[dtp]:
        k *= P.res[dtp] > 1 ? 1 + (P.res[dtp] - 1) * (1 + mods.weakK) : P.res[dtp]
    return k * (mods.dmgType[dtp] || 1) * (mods.arsenal && fl.arsenal4 ? 1 + mods.arsenal : 1)
```
Źródło: `p3_flow.js: typeMult` (wywoływane w `damage`, sekcja 05).

**Umiejętności klas** (`CLASS_SKILL` to krótki opis dla gracza, `data/CLASS_SKILL.json`). Liczby z kodu; zachowanie szczegółowo w sekcji 06.

| Klasa | Co umie (liczby) | Źródło |
|---|---|---|
| wojownik | Tarcza: wchodząc na znane niebezpieczeństwo (`danger > 1`) podnosi tarczę na 2.5 s, odnowienie `R.shieldCd`; przed szturmem pokoju (przygotowanie, lvl >= 3) na 5 s. Pod tarczą obrażenia od pułapek ×`R.shield`, przyjaciele w promieniu 1.8 pola ×`(1 + shield)/2`. Strzały poziomu 3 przebijają tarczę, Kwas połowi ochronę. W walce z potworem obrażenia ×1.4. Szuka walki z potworami w swoim pokoju (do 6 pól); nowicjusz atakuje każdego, wyżsi omijają ogra i walczą tylko przy HP > 60% (łucznika zawsze). 30% szans na furię po śmierci towarzysza. Ulubione przedmioty: talizman, broń, zbroja. | `p3_flow.js: trapMult, shieldCover, kill`, `p5_ai.js: updateHero, planHero, finishPrep, itemValue` |
| złodziej | Unik kolców i strzał (nie gdy stoi/walczy/w sieci), szansa `R.dodge`, odnowienie 3 s. Wykrywanie pułapek: promień +2. Rozbraja znane pułapki na drodze przywódcy: czas `(1.5 dla arrows/fire/powder, inaczej 1.0) * mods.disarm * R.disarm * (Bagno 1.5)`, porażka `R.fail` odpala pułapkę, `R.sapper` rozmontowuje na stałe. Przy przygotowaniu (lvl >= 4) rozbraja `1 + floor((lvl-4)/4)` pułapek z progu. Podważa kratę (3 s, lvl >= 6 szybciej ×1.5). Zwiadowca na rozwidleniach. Uwalnia z klatki w 0.8 s (inni 1.8 s). Złoto `need 1.6`, zasięg łupu 11. | `p3_flow.js: damage`, `p5_ai.js: scanTraps, disarmJob, finishPrep, chooseTarget, planHero, partyThink` |
| kapłan | Wiara: pula `6 + floor(lvl/2)`, +1 co 12 s. Co 1 s rozgląda się (modlitwa trwa 3 s): leczy wszystkich w promieniu 3 pól o `22*pow` (1 wiara; gdy ktoś płonie, ma < 75% HP albo braki > 60% jego maks. HP; gaszenie ognia zamiast leczenia), zdejmuje klątwę (lvl >= 4, 3 wiary), bariera `12*pow` tarczy (3 wiary, odnowienie 14 s, przy zasadzce albo kimś < 45% HP, min. 2 osoby), święte światło na duchy/cienie/nietoperze w promieniu 3: `25*pow`. Uspokaja (rank >= 1): strach bliskich (3 pola) ×0.75 (przy Ołtarzu ×0.875). Odczynia znane przeklęte pułapki (rank >= 1, 1 wiara, czas `1.5*R.disarm`, ×2 przy Ołtarzu). Przygotowanie (lvl >= 3, wiara >= 2, koszt 2): osłona `(0.15 + 0.012*lvl)` maks. HP i strach ×`0.85^(1 + lvl/5)` przez 10 s; lvl >= 6 egzorcyzm `40*pow` i odczynienie `2 + floor((lvl-6)/2)` portretów. Lvl >= 6 wyczuwa przeklęty łup w promieniu 6. Ołtarz połowi moce. | `p5_ai.js: heroAbilities, blessJob, finishPrep, checkCursed`, `p3_flow.js: fearResist` |
| mag | Kula ognia co 4 s w najbliższego potwora w pokoju (do 4.5 pola): `30*pow` w kwadracie 3×3 (dryfujące tylko cel); cienia nie rusza. Rozprasza strefy sieci w promieniu 4 (odnowienie 8 s). Lvl >= 8 (`R.sight`) wyczuwa pułapki w pokoju po wejściu (nie przy Runie, Zasłonie, we Mgle). Przygotowanie (lvl >= 5): zakłóca pułapki pokoju na `2 + 0.25*lvl` s, odnowienie 12 s; Runa tłumi. | `p5_ai.js: heroAbilities, onEnter, finishPrep` |
| bard | Pieśni: `2 + floor(lvl/4)` na falę, odnowienie 16 s (pierwsza po 6 s), gdy morale < 0.65, ktoś wstrząśnięty śmiercią albo średni strach > 45% w promieniu 5: strach -`(0.06 + 0.012*lvl) * min(1, itemPow + 0.5)` odwagi, morale +0.25. Wołanie zgubionych co 9 s (do 26 kroków, słyszą przez 8 s). Kamień wyjec blokuje oba. | `p5_ai.js: bardTick` |
| barbarzyńca | Furia: 8 s (inni 6 s), odnowienie 14 s (inni 20 s); w furii szybkość ×1.25, strach ×0.5, obrażenia potworom ×1.5. Wpada w nią po ciosie >= 20% maks. HP, zamiast paniki (strach -25% limitu) i po śmierci towarzysza. Topór: budowle-kontry w swoim pokoju (do 8 pól) i drewniane meble (2.5 pola, w furii 5), czas 1.8 s (w furii 0.8), odnowienie 5 s (2). Okowy blokują furię i topór. | `p3_flow.js: startRage, damage, addFear, kill`, `p5_ai.js: smashJob, smashDone` |

Dodatkowo każdy bohater z bombą rzuca ją w znane pułapki (rozdz. 5.3), a każdy może wpaść w furię z innych powodów (sekcja 06).

### 4.4 Ciało (`PHYS`)

```
deep   = stageOf() >= 4
phys   = pre.phys !== undefined ? pre.phys
       : (deep && rnd() < 0.35 + 0.1 * mods.oddBodies ? pick(keys(PHYS)) : null)
```
Źródło: `p3_flow.js: makeHero`.

- 35% bohaterów (od etapu 4) ma cechę ciała; karta Przeklęta karczma +10% na kopię. Boss też może ją mieć.
- `PHYS` (`data/PHYS.json`): 8 cech, po dwie na typ obrażeń (odporność / słabość): `res` = mnożnik typu (np. `thickskin` kłute 0.7, `brittle` obuchowe 1.4), `name` [m, f], `text` (opis procentowy).
- Słabość (`res > 1`) wzmacnia karta Słabe punkty: `1 + (res - 1) * (1 + weakK)`.
- **Ujawnienie** (`p3_flow.js: revealPhys`): przy pierwszym trafieniu typem, którego dotyczy cecha (i gdy łączny `typeMult != 1`), jeśli nie jest znana: `known.add('phys')`, kopiowane do `h.entry.known`, kwestia `SAY.weakHit[dtp]` albo `SAY.resistHit[dtp]`, napis "Słabość: <typ>" / "Odporność: <typ>", karta samouczka `body`.

### 4.5 Fobie (`PHOBIAS`)

```
phobia = pre.phobia !== undefined ? pre.phobia
       : (deep && !boss && rnd() < 0.3 + 0.1 * mods.oddBodies ? pick(keys(PHOBIAS)) : null)
```
Źródło: `p3_flow.js: makeHero`.

Pola `PHOBIAS` (`data/PHOBIAS.json`; odwrotna mapa `PHOBIA_OF_ATTR` z `attrs`):
- `name`: nazwa dla gracza.
- `attrs`: typy elementów (pułapek, potworów), których strach liczy się podwójnie.
- `types`: typy obrażeń (tylko `fire`: każdy strach z ran od ognia, także podpalenia; od 1.17.1 nie krwawienie z kolców, do 1.17 ono też budziło fobię ognia).
- `srcs`: źródła strachu bez elementu (tylko `blood`: `'death'`, czyli strach po śmierci towarzysza).
- `sees`: elementy, których pierwszy widok straszy.
- `dark`: fobia ciemności: działa także na każdy strach, gdy bohater jest we Mgle, sam albo zgubiony.

Fobie: `fire` (ogień, proch), `spiders` (pająk, sieć), `closed` (klatka, zapadnia, krata, zawiasy, trumna), `ghosts` (duch, portret, oczy, lustro), `blood` (kości + śmierć), `dark` (cień, nietoperze + Mgła/samotność/zgubienie). Pozytywka (`musicbox`) nie należy do żadnej fobii.

```
phobiaOn(h, attr, src, dtp) = F = PHOBIAS[h.phobia];
    F && ( (attr && F.attrs.includes(attr)) || (dtp && F.types.includes(dtp))
           || (src && F.srcs.includes(src)) || (F.dark && (Mgła w pokoju || h.alone || h.lost)) )

phobiaMult(h, attr, src, dtp):
    k = 1
    if phobiaOn(...): k *= (F.dark ? 1.6 : 2) + mods.phobiaK; revealPhobia(h)
    tt = dtp || DMG_OF[attr]
    if tt && h.trauma[tt]: k *= 1.5 + 0.5 * mods.traumaK                     // rozdz. 4.6
    if mods.isolation && (h.alone || h.lost): k *= src == 'alone' ? 2.5 : 1.25
    if mods.heavyAir && pokój to Mgła albo Krypta: k *= 1 + mods.heavyAir
    return k
```
Źródło: `p3_flow.js: phobiaOn, phobiaMult` (mnoży każdy strach w `addFear`, sekcja 05).

**Widok** (`p3_flow.js: phobiaSight`, wołane z `p5_ai.js: onEnter` przy wejściu do nowego pokoju, gdy nie wychodzi): dla każdego elementu z `F.sees` w tym pokoju, niewyłączonego, jeszcze niewidzianego przez tego bohatera: ukryte pułapki raniące (nie `SCARE`, nie `fire`, `!detected`) się nie liczą; w pozostałych przypadkach jednorazowo `addFear(h, 0.15 * courage * (1 + phobiaK/2), null, 'phobia')` i ujawnienie fobii. Uciekający nie reagują.

**Ujawnienie** (`p3_flow.js: revealPhobia`): pierwsze zadziałanie fobii: `known.add('phobia')`, kopia do `h.entry.known`, kwestia `SAY.phobia[h.phobia]`, napis "Fobia: <nazwa>", karta samouczka `phobia`.

### 4.6 Trauma (na jedną falę)

W `p3_flow.js: damage`, po trafieniu typem `dtp`:
```
tl0 = mods.traumaK ? 0.5 : 0.35
if !h.trauma[dtp] && h.hp < tl0 * max && h.hp + real >= tl0 * max:
    h.trauma[dtp] = true      // do końca fali: strach powiązany z tym typem ×(1.5 + 0.5*traumaK)
```
Trauma łapie, gdy cios danego typu zbija HP poniżej 35% (z kartą Blizny na duszy 50%). Kwestia `SAY.trauma[dtp]`, napis "Trauma: <typ>". Pokazywana na karcie bohatera ("straszy 1,5 raza mocniej"). Nie przechodzi na następne fale (`h.trauma = {}` przy wejściu).

### 4.7 Blizny i ślady (`h.dmgBy`, `h.fearBy`)

Każdy bohater zbiera w trakcie fali:
- `h.dmgBy[dtp]` = suma realnych obrażeń danego typu (`damage`),
- `h.fearBy[klucz]` = suma strachu wg elementu (`attr`, np. `'archer'`) albo, gdy brak elementu, wg źródła (`src`, np. `'death'`, `'dmg'`, `'alone'`, `'phobia'`, `'heart'`) (`addFear`),
- `h.felt` = co go najbardziej zraniło/przestraszyło (do plotek, rozdz. 6.5).

Z nich `collectReturners` robi bliznę powracającego (rozdz. 6.3). `SCAR_RES` (`data/SCAR_RES.json`) mapuje typ obrażeń na cechę-odporność (kłute -> `thickskin`, obuchowe -> `sturdy`, ogień -> `fireproof`, trucizna -> `venomproof`).

### 4.8 Co gracz wie przed falą (karczma)

```
known = pre.known || [
    phys   && (mods.revealAll || rnd() < 0.3) ? 'phys'   : null,
    phobia && (mods.revealAll || rnd() < 0.3) ? 'phobia' : null ] bez null
```
Źródło: `p3_flow.js: makeHero`. Karczma zdradza każdą cechę ciała i fobię osobno z szansą 30%; karta Anatomia ofiar (`revealAll`) zdradza wszystko (także w UI flaga `all`). Powracający: wszystko znane. W trakcie fali wiedza rośnie przez `revealPhys`/`revealPhobia` i jest dopisywana do wpisu.

Gdzie gracz widzi skład:
1. **Ekran podsumowania fali** (`p8b_ui.js: renderWave`): panel "Fala N+1: X bohaterów, poz. lo-hi", podtytuł "gildia: <klasa>" albo "serce chce <głód>"; wiersze `nextRow(e)`:
   - ikona klasy w kolorze klasy, imię, nazwa klasy (wg płci) i poziom,
   - znaczniki: "przepowiednia"/"czempion", charakter, sakiewka (łowca), "↺" (powracający, "wraca z blizną"), "rekrut",
   - ikony ekwipunku (liczba użyć, gdy > 1), albo "bez sprzętu",
   - druga linia: `CLASS_SKILL`, " · słaby: " do 2 typów z mnożnikiem >= 1.1 (klasa, a gdy ciało znane, także ciało; `weakOf`), " · boi się: <fobia>" (gdy znana), " · ? ciało/fobia" (czego nie wiadomo),
   - stuknięcie otwiera kartę bohatera.
   Zakładka "Następna" podsumowania (`p8b_ui.js: renderWave`): "Fala N+1: poziom ok. round(waveBase(N+1))" + boss, tekst gildii, głód serca, plotki, opowieści o skarbach, "Gildia słyszy o chciwości ×g: przywódca +hl poziomu, przyjdą łowcy skarbów (k)".
2. **Faza budowy**: zwijana lista na mapie (`p7_draw.js: drawNextWave`): zwinięta = żetony klas; rozwinięta = "Fala N (· FINAŁ / · boss):", wiersze "imię · poz. L ranga (· wraca / · łowca / · rekrut) (· boi się: X)", plus informacja o wyłomie. Podpowiedź `waveHint` (`p3_flow.js: waveHint`): "Fala N/10: X bohaterów, poziom lo-hi, prowadzi <boss> (poz. L). GŁÓD... WYŁOM... GILDIA: <tekst>. Plotki: znają R pokoi i T pułapek / Nic o Tobie nie wiedzą." Przycisk akcji "Wypuść falę N · X bohaterów".
3. **Karta bohatera** (`p8b_ui.js: renderHero`): klasa, poziom, ranga/boss, "powracający / łowca skarbów / rekrut"; HP, strach/odwaga, wiara (kapłan w fali) albo liczba przedmiotów; "Charakter: ... (TRAIT_TEXT)" albo "zwyczajny"; "Umie: CLASS_SKILL"; "Klasa: CLASS_RES_TEXT"; łowca; "Ciało: ..." / "nie wiadomo"; "Fobia: ... (straszy 2 razy mocniej)" / "nie wiadomo"; "Blizna: ... (wraca już N. raz)"; trauma w fali; ekwipunek ("<przymiotnik rzadkości> <nazwa> (moc r, użycia: c, odnowienie s)"), sakwa; rany i strach w tej fali.

---

## 5. Ekwipunek

### 5.1 Przedmiot i plecak

Przedmiot: `{ type, r, charges?, kit?, cdUntil }`, od 1.20 także `src`, `owner`, `ownerNm`, `ownerFem`, `wave`, przy przekazanym `gaveNm`, `gaveFem`, `gaveBy` (lista id), przy przeklętym `cursed`, przy latarni `outUntil`, przy zepsutej miksturze (1.18) `tainted`, przy trofeum `wasRelic` (5.6).
- `type` z `HITEMS` (`data/HITEMS.json`): `potion`, `charm`, `amulet`, `boots`, `bomb`, `weapon`, `armor`, od 1.20 narzędzia `lantern` (latarnia) i `crowbar` (łom).
- `r` = moc (bez sufitu). Przymiotnik w UI: 1 zwykły, 2 rzadki, 3+ legendarny (`p1_config.js: adj`); kolor `rarColor` (4 i 5+ mają własne).
- `charges` = liczba użyć mocy na falę (tylko `use: 'power'`); `undefined` = brak limitu (mikstura, bomba: jednorazowe same z siebie; broń, zbroja: pasywne).
- `kit: true` = z wyposażenia startowego (informacyjne).
- `cdUntil` = koniec odnowienia (czas fali); przy wejściu zerowane (kopie w `spawnHero`).

Pola `HITEMS`: `name`, `acc` (biernik), `g` (rodzaj gramatyczny m/f/pl), `w` (waga losowania w `rollItem`), `use` (`once` / `power` / `gear`, od 1.20 `tool`), `cd` (odnowienie mocy w s), `loot: true` (tylko z łupu, nie z wyposażenia), od 1.20 `kg` (ciężar) i `tool: true` (narzędzie, nigdy z łupu, `w: 0`).

Plecak: `h.invCap = 3 + floor(lvl / 3)` (`p3_flow.js: spawnHero`). Moce, broń i zbroja: tylko jedna sztuka danego typu (lepsza zastępuje gorszą).

### 5.2 Wyposażenie startowe: `makeKit(type, L)`

```
n   = L <= 2 ? (rnd() < 0.3 ? 1 : 0) : floor((L + 1) / 3)       // liczba losowań
r   = 1 + floor((L - 1) / 4)                                     // moc wszystkich sztuk
for i in 0 .. n-1:
    t = losowanie ważone wg KIT[type] (domyślnie 'potion')
    same = out.find(type == t)
    if same && t in (charm, amulet, boots): same.charges++; continue   // druga moc tego typu = +1 użycie
    out.push({ type: t, r, kit: true, charges: powerCharges(t, r) })

powerCharges(t, r) = t == 'boots' ? 2 + floor(r/3) : t in (charm, amulet) ? 1 + floor(r/3) : undefined
```
Źródło: `p1_config.js: makeKit, powerCharges`. Boss: `makeKit(type, lvl + 2)`.

- `KIT` (`data/KIT.json`): wagi typów dla klasy (np. wojownik: potion 3, charm 3, bomb 2, amulet 1). Barbarzyńca nie dostaje amuletu ani butów, kapłan bomb ani butów, bard bomb ani talizmanu.
- Mikstury i bomby mogą się powtarzać (osobne sztuki).
- Liczba losowań i moc wg poziomu:

| L | 1-2 | 3-4 | 5-7 | 8 | 9-10 | 11-12 | 13 | 14-16 | 17-19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| losowania | 0 (30%: 1) | 1 | 2 | 3 | 3 | 4 | 4 | 5 | 6 | 7 |
| moc r | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 |
- Użycia mocy: r1-2: buty 2, talizman/amulet 1; r3-5: 3 / 2; r6-8: 4 / 3; r9: 5 / 4.

### 5.3 Typy przedmiotów: działanie

`itemPow(h) = mods.itemPower * (h.cursed ? 0.5 : 1)` (`p3_flow.js: itemPow`; karta Rdza ×0.5). Użycie mocy: `cdUntil = time + HITEMS.cd * (cursed ? 1.5 : 1)`, `charges--` (`p5_ai.js: usePower`). Moc gotowa: jest, minęło odnowienie i `charges` nieokreślone albo > 0 (`p5_ai.js: powerReady`).

| Typ | Użycie | Działanie (wzór) | Kiedy | Źródło |
|---|---|---|---|---|
| `potion` mikstura | once | leczy `max * min(0.55, 1 - 0.7^r) * itemPow` (r1 30%, r2 51%, r3+ 55%) | sam: gdy `hp < R.potion * max` (najmocniejsza); przed szturmem pokoju: lvl >= 4 i HP < 70%; daje przyjacielowi (< 30% HP, bez mikstury, do 2 pól; dający oddaje najsłabszą, zatrzymuje ostatnią, gdy sam ma < 70% HP; odnowienie dawania 10 s) | `p5_ai.js: updateHero, startPrep, partyThink`; `p3_flow.js: potionHeal` |
| `charm` talizman | power, cd 20 | osłona na 3 s: obrażenia od pułapek ×`(1 - wardK)`, `wardK = min(0.4, 0.25 + 0.05(r-1)) * min(1, itemPow)`; nie chroni przed strzałami poziomu 3; Kwas połowi | `hit`: po trafieniu pułapką, gdy HP < 60%; `danger`: przed wejściem na znane pole z `danger > 1.5` (nowicjusz nigdy, weteran 50%, elita zawsze); `prep`: wszyscy przed szturmem pokoju | `p5_ai.js: useCharm`; `p3_flow.js: damage` |
| `amulet` | power, cd 30 | strach -`(0.08 + 0.04*min(4, r)) * itemPow * (Ołtarz 0.5) * courage` (r1 12%, r2 16%, r3 20%, r4+ 24%), potem 4 s (Ołtarz 2 s) nowego strachu ×0.7. **Pasywnie**: +`round(r * itemPow)` do promienia wykrywania pułapek (nawet bez użyć) | gdy strach >= `[0.85, 0.7, 0.6, 0.6][rank] * limit` (nie uciekający, nie niosący kryształu) | `p5_ai.js: useAmulet, scanTraps`; `p3_flow.js: addFear, fearResist` |
| `boots` buty | power, cd 15 | sprint 3 s, szybkość ×`1 + (0.3 + 0.1*min(3, r)) * min(1, itemPow)` (r1 1.4, r2 1.5, r3+ 1.6) | wychodzenie z lochu (ucieczka, niesienie kryształu, powrót do domu: `exiting(h)`); zgubiony (rank >= 1); znane niebezpieczeństwo `danger > 1` (rank >= 1, nie po cierpliwości) | `p5_ai.js: useBoots, updateHero` |
| `bomb` bomba | once | na pułapkę: wyłącza ją do końca fali (proch: odpala z mocą 0.5); na potwora: `80 * min(4, r)^1.3 * itemPow` (r1 80, r2 197, r3 333, r4+ 485) | `bombJob`: znana, niewyłączona pułapka (nie krata, nie przeklęta) na pierwszych 8 polach drogi przywódcy, rzut z <= 3 pól; w walce: potwór ma > 60 HP | `p5_ai.js: bombJob, updateHero` |
| `weapon` broń | gear (tylko łup) | obrażenia potworom ×`(1 + 0.25 * r * itemPow)` | zawsze (walka) | `p4_traps.js: monstersTick` |
| `armor` zbroja | gear (tylko łup) | obrażenia od pułapek ×`(1 - (1 - 0.92^(r * itemPow)) * (Kwas 0.5))` (r2 -15%, r3 -22%) | zawsze | `p3_flow.js: damage`; `p6_loop.js` (podgląd obrażeń) |

Ekonomia: im więcej przedmiotów, tym więcej Grozy z ran: `lootMult(h) = 1 + 0.25 * min(4, h.inv.length)` (`p6_loop.js: lootMult`, użyte w `damage`, sekcja 03/05).

### 5.4 Zdobywanie i zamiana przedmiotów

`p3_flow.js: giveItem(h, item, quiet)`:
1. Moc albo gear, a bohater ma już ten typ: jeśli stary `r >= nowy r`, odmawia ("nie potrzebuję"); inaczej stary ląduje na podłodze (`dropItem`, bez chciwości), nowy wchodzi.
2. Plecak pełny (`inv.length >= invCap`): porównuje `itemValue` nowego z najmniej wartościowym; jeśli nowy nie jest lepszy, odmawia; inaczej wyrzuca najgorszy na podłogę.
3. Kwestie "Mam <biernik>!" itp.

`p3_flow.js: itemValue(h, it)` (wartość dla tego bohatera teraz):
```
potion: r * (hp < 0.6*max ? 2.5 : 1) / (1 + 0.7 * liczba innych mikstur)
bomb:   0.8 * r / (1 + 0.5 * liczba innych bomb)
inne:   najlepszy inny tego typu ? max(0, r - best) * 1.2 : r * 1.2 * (ulubiona klasa ? 1.3 : 1)
        ulubione: charm/weapon/armor -> wojownik, amulet -> kapłan, boots -> złodziej
```
Od 1.20 (`CLASS_FIT`, `fitOf(type, cls)` = wartość z tabeli albo 1):
```
bomb:     0.8 * r * fitOf('bomb', klasa) / (1 + 0.5 * liczba innych bomb)
narzędzie: ma już takie ? 0 : 1.5
inne:     najlepszy inny tego typu ? max(0, r - best) * 1.2 * fit : r * 1.2 * fit
CLASS_FIT = { weapon: {warrior 1.3, barbarian 1.3, thief 0.8, bard 0.6, priest 0.5, mage 0.3},
              armor:  {warrior 1.3, barbarian 1.0, priest 0.9, bard 0.7, thief 0.5, mage 0.4},
              charm:  {warrior 1.3, barbarian 1.1}, amulet: {priest 1.3, bard 1.1, mage 1.1},
              boots:  {thief 1.3, bard 1.1}, bomb: {mage 1.2, barbarian 1.1, thief 1.1} }
```
Zbroja r2: wojownik 3,12, mag 0,96. `giveItem` od 1.20 odmawia też, gdy ciężar po wzięciu (minus to, co zastępuje) przekroczy udźwig (`SAY.tooHeavy` poza ciszą, `stats.tooHeavy`), i nigdy nie wymienia przeklętego przedmiotu (ten sam typ: odmowa z `SAY.cursedKeep`; pełny plecak: przeklęty nigdy nie jest wyrzucany).

**Z łupu** (`p3_flow.js: pickup`, decyzja o podniesieniu w sekcji 06):
- `loot` (monety): bez przedmiotu, do sakiewki.
- `lpotion`: `{ type: 'potion', r: 1 }`.
- `loot2` (ekwipunek) i `lcursed` (przeklęty): `rollItem(2, GEAR_POOL)`; przeklęty dodatkowo rzuca klątwę (`curse`: `h.cursed = true`, przedmiot dodany po cichu, jeśli się zmieści).
- `loot3` (relikwia): `rollItem(3, keys(HITEMS))` (wszystkie 7 typów); z kartą Relikwiarz bez przedmiotu.
- Przedmiot upuszczony wcześniej (`it.item`) jest podnoszony dokładnie taki, jaki był (z pozostałymi użyciami).
- Brak miejsca/potrzeby: łup zostaje, bohater zapamiętuje decyzję "nie" (`h.lootMemo`, wpis z czasem +60 s, a `lootDecision` ufa wpisom młodszym niż 8 s, więc w praktyce ok. 68 s).

```
rollItem(r, pool):
    types = pool || typy HITEMS bez loot:true            // gałąź bez pool nieużywana w grze
    t = losowanie ważone HITEMS[t].w
    return { type: t, r, cdUntil: 0, charges: powerCharges(t, r) }
```
`GEAR_POOL` (`data/GEAR_POOL.json`) = charm, amulet, boots, bomb, weapon, armor (bez mikstury).

**Klątwa** (`h.cursed`): obrażenia ×1.3 (poza sercem), `itemPow` ×0.5, odnowienie mocy ×1.5, opadanie strachu ×0.5; kapłan lvl >= 4 zdejmuje (3 wiary). Szczegóły: sekcja 05/06.

### 5.5 Utrata przedmiotów

- Krytyczny skill check: każdemu trafionemu wypada losowy przedmiot; od 1.20 ląduje obok jako łup "wybity" (`knocked`), który właściciel chce odzyskać (bez chciwości i Grozy, gdy go podniesie), a przepada tylko bez wolnego pola (sekcja 05, 5.9.13).
- Mimik poziomu 3 (Pożeracz): ugryziony traci losowy przedmiot (`p4_traps.js: fireRaw`); od 1.20 przedmiot trafia do brzucha mimika (najwyżej 6) i wraca na podłogę, gdy mimik zostanie wysadzony albo rozbity (sekcja 05, 5.13.2).
- Karta Zdarte pancerze (1.18): kolce i strzały w Zbrojowni strącają talizman, amulet albo zbroję jako łup "wybity".
- Śmierć: cały plecak i sakiewka wysypują się jako łup obok ciała (`p3_flow.js: kill, dropItem`, od 1.20 stosy z `body`); stosów upuszczonych rzeczy jest maks. 10 (od 1.20 najpierw znikają zwykłe stosy, najstarsze pierwsze, potem ciała z wcześniejszych fal, potem ciała tej fali; nigdy właśnie upuszczony). Karta Kocioł ogra (1.18): w Jaskini ogra nic nie wypada, a gracz dostaje Esencję (sekcja 03, 3.9).
- Bomba w płonącym plecaku może wybuchnąć (sekcja 05, 5.13.2).
- Użycie: mikstura, bomba znikają; moce tracą użycia.

### 5.6 Pochodzenie, ciężar i narzędzia (1.20, `p1_config.js: HITEMS, CARRY, CLASS_FIT`; `p3_flow.js: spawnHero, pickup, bodyLoot, dropAt, dropItem, loadOf, carryOf, burden, canTake, litLantern, lanternNear, hasCrowbar`)

**Pochodzenie** (`src`): `kit` (z domu, `makeKit`), `guild` (od gildii), `loot` (z Twojego łupu), `relic` (relikwia z Twojego łupu, `loot3`), `body` (z rzeczy poległego: przedmiot `kit`/`guild` wzięty z ciała), `trophy` (trofeum powracającego, 6.3). `spawnHero` dopisuje każdemu przedmiotowi `owner` (id bohatera), `ownerNm`, `ownerFem`, `wave` (gdy ich nie ma). Karta bohatera pokazuje pochodzenie (`srcText`: " - z domu", " - od gildii", " - z Twojego lochu", " - relikwia z Twojego lochu", " - trofeum z fali n", " - z rzeczy <dopełniacz>", " - od <dopełniacz>"; ", przeklęty"; sekcja 08).

**Stos łupu z bohatera** (`dropAt(x, y, item, gold, noGreed, opt)`, `dropItem` to jego nakładka przy bohaterze): typ stosu `loot` (monety), `lpotion` (mikstura), `loot3` tylko dla `src 'relic'` (albo trofeum z `wasRelic`) z `r >= 3`, wszystko inne `loot2` (do 1.19 rzecz zmarłego o mocy 3 była "relikwią"). Pola stosu: `from`, `fromNm`, `fromFem`, `fromWave`, `body` (`opt.body`: wysypany z ciała), `knocked` (`opt.knocked`: wybity z rąk).

**Ciężar** (`kg` w `HITEMS`): mikstura 1, talizman 0,5, amulet 0,5, buty 1,5, bomba 2, broń 3, zbroja 6, latarnia 1,5, łom 3.
```
CARRY     = { warrior: 14, barbarian: 16, priest: 10, bard: 10, thief: 9, mage: 8 }
loadOf(h) = suma kg w plecaku;  carryOf(h) = CARRY[klasa] + 0.3 * lvl
burden(h) = max(0.84, 1 - 0.4 * max(0, loadOf/carryOf - 0.6))           // prędkość × burden (updateHero)
canTake(o, x): miejsce w plecaku (albo zastępuje nieprzeklęty tego typu) i loadOf + kg(x) - kg(zastępowanego) <= carryOf
```
Ponad 60% udźwigu bohater zwalnia (najwyżej do ×0,84), za pierwszym razem mówi `SAY.heavyLoad` (`stats.loadSlowT` w bohatero-sekundach); na lodzie szansa poślizgu ×`(1 + max(0, load/carry - 0,5))`; ponad 100% nic więcej nie bierze. Pod stopami mały szary ▼ (sekcja 08).

**Latarnia** (narzędzie): zapalona (`litLantern`: nie zgaszona, `outUntil` minął) chroni przed mgłą każdego w 2 polach w tym samym pokoju (`lanternNear`): rzut mgły ×0,3 (`fogRoll`, `stats.lanternSaves`), część mgły w `lostChance` 0,15 zamiast 0,45, błądzenie przywódcy we mgle o połowę krótsze (niosący mówi `SAY.lanternLight` zamiast `fogGrope`, `stats.lanternGrope`), niosący widzi pułapki we mgle w 1 polu (`scanTraps`). Gaśnie na 8 s od ducha, cienia i nietoperzy (sekcja 05, 5.13.2). `stats.lanterns`: bohaterowie, którzy weszli z latarnią.

**Łom** (narzędzie, `hasCrowbar`): przy zamkniętej kracie podważa ten z łomem (albo złodziej) z tempem ×1,5 (złodziej poz. 6+ dodatkowo ×1,5, krata 3. poziomu ×0,5), pierwsza kwestia `SAY.crowbarGate`; ratownik z łomem otwiera klatkę w 0,6 s (złodziej 0,5 s), uwięziony z łomem wyłamuje się sam po 4 s (`SAY.crowbarCage`); `stats.crowbarGate`, `stats.crowbarCage`, oś czasu `lm`. Zachowanie: sekcja 06, 6.11.

---

## 6. Gildia, łowcy, powracający, wyłom, plotki, wejście, cierpliwość

### 6.1 Gildia: `guildAdapt(n)`

Gildia czyta raport z poprzedniej fali i przysyła specjalistę na styl gracza.

```
GUILD_WANT = { fear: 'priest', kill: 'warrior', traps: 'thief', monsters: 'mage', lost: 'bard', block: 'barbarian' }

guildAdapt(n):
    w = run.waves[ostatni]                  // zapis recordWave; liczby ZAOKRĄGLONE do całkowitych (roundStats)
    if n < 3 || !w || stageOf() < 3: return null
    st = w.stats
    fearShare = (st.fearPts + st.scarePts) / max(1, st.fearPts + st.scarePts + st.dmgPts + st.killPts)
    killShare = st.kills / max(1, w.heroes.length)
    traps  = liczba elementów w run.items z TRAPS[type]
    mons   = liczba elementów z MONSTERS[type]
    blocks = liczba budowli (BUILDINGS) + skrzynie postawione przez gracza (obiekty komórek [x, y, 'crate', 1])
    lostShare = (st.lostPts + st.lonePts) / max(1, fearPts + scarePts + dmgPts + killPts + lostPts + lonePts)
    opts:
      fear:     sc = fearShare > 0.55 ? fearShare : 0
      kill:     sc = killShare >= 0.5 ? killShare : 0
      traps:    sc = traps >= 12 ? 0.5 + 0.3 * min(1, (traps - 12) / 20) : 0
      monsters: sc = mons >= 4 ? 0.5 + 0.3 * min(1, (mons - 4) / 6) : 0
      lost:     sc = (st.gotLost >= 2 || lostShare >= 0.15) ? 0.5 + min(0.3, lostShare) : 0
      block:    sc = (blocks >= 5 || st.reroutes >= 2)
                     ? 0.5 + 0.3 * min(1, max(blocks - 5, 2 * (st.reroutes - 2)) / 6) : 0
    return opcja z największym sc > 0 (sortowanie stabilne: remis wygrywa wcześniejsza na liście) albo null
```
Źródło: `p3_flow.js: guildAdapt, GUILD_WANT`.

- `*Pts` w statystykach to Esencja zaksięgowana w chwili zdarzenia (Groza × Chciwość × Combo w tej chwili, `p3_flow.js: addPts`), nie surowa Groza; `kills` to liczba zabitych; `gotLost` liczba zgubień; `reroutes` liczba objazdów z powodu zamkniętej kraty (`p5_ai.js: partyThink`).
- Wyraźny styl (strach > 55% albo zabici >= połowa) daje sc 0.55-1 i wygrywa z liczeniem pułapek/potworów (maks. 0.8).
- `run.guild = { kind, sc, text }` ustawiane w `makeWave` (więc dla fali, której wpisy powstają).
- Teksty `text` (przepisane w całości):
  - fear: "wie, że straszysz: przysyła kapłana z amuletem (od fali 6 amulet ma każdy). Kontra: Ołtarz (zakładka Obiekty)."
  - kill: "wie, że zabijasz: przysyła wojownika z talizmanem (od fali 6 talizman ma każdy). Kontra: Kwas (zakładka Obiekty)."
  - traps: "słyszała o masie pułapek: przysyła złodzieja. Kontra: Wabik (zakładka Obiekty)."
  - monsters: "słyszała o potworach: przysyła maga. Kontra: Runa (zakładka Obiekty)."
  - lost: "słyszała, że w Twoim lochu ludzie błądzą i giną samotnie: przysyła barda. Kontra: Kamień wyjec (zakładka Obiekty)."
  - block: "słyszała o zastawionych przejściach: przysyła barbarzyńcę. Kontra: Okowy (zakładka Obiekty)."
- Wpływ: (1) skład: klasa specjalisty wstawiona na indeks 1, jeśli jej brak (rozdz. 2.2); (2) ekwipunek: przy `fear`/`kill` amulet/talizman (rozdz. 2.6); (3) powracający nie zastępuje specjalisty innej klasy (rozdz. 2.4); (4) tekst w `waveHint` ("GILDIA: " + text), w zakładce "Następna" podsumowania ("Gildia " + text), podtytuł panelu następnej drużyny ("gildia: " + nazwa klasy małymi literami); (5) pierwszy bohater fali mówi kwestię `SAY.guildFear/guildKill/guildTraps/guildMonsters/guildLost/guildBlock` (`spawnHero`); (6) `recordWave` zapisuje `guild: kind`.

### 6.2 Łowcy skarbów

- Liczba: `hunters` w `makeWave` (rozdz. 2.3): od fali 3, od etapu 4, `min(size - 2, huntersN(greedRaw(run.greedRep)))`. Łowcy **zastępują** zwykłych członków (ostatnie pozycje listy), nie dochodzą ponad liczebność.
- Łowca: dowolna klasa, `trait = 'greedy'` (nadpisuje wylosowany), `hunter = true`, premia poziomu `hl/2` jak reszta.
- Skutki flagi `hunter` (poza skutkami charakteru `greedy`, rozdz. 4.2): złoto `need 1.6` i brak kary elity za drobne złoto (`p5_ai.js: lootDecision`); liczy się jak chciwy na naradzie i przy proteście przed szturmem (`chooseTarget`, `partyThink`); 60% na kwestię `SAY.hunters` przy wejściu (`spawnHero`); znak sakiewki przy figurce (`p7_draw.js`) i na liście (`p8b_ui.js: nextRow`); opis na karcie "Łowca skarbów: idzie po łup, nawet gdy to groźne (znak sakiewki)."

### 6.3 Powracający: `collectReturners()`

Wołane w `finishWave` (rozdz. 1).

```
collectReturners():
    if stageOf() < 4: return
    for h in fl.heroes:
        if !h.fled || h.dead || h.boss || (run.returners.length >= 8 && !h.nemesis): continue    // 1.23: Nemezis zawsze wraca
        if !h.nemesis && rnd() >= (h.fleeing ? 0.55 : 0.4) * (1 + mods.moreReturn): continue
        phys = h.phys; phobia = h.phobia; scar = null
        topFear = wpis h.fearBy o największej wartości; topDmg = wpis h.dmgBy o największej wartości
        if h.fleeing && topFear && !phobia:
            k = PHOBIA_OF_ATTR[topFear.key] || (topFear.key == 'death' ? 'blood' : DMG_OF[topFear.key] == 'fire' ? 'fire' : null)
            if k: phobia = k; scar = 'fobia: ' + PHOBIAS[k].name + ', ' + (female ? 'wyniosła' : 'wyniósł') + ' ją z Twojego lochu'
        if !scar && topDmg && topDmg.value > 0.3 * h.max:
            phys = SCAR_RES[topDmg.key]                       // nadpisuje dotychczasowe ciało
            scar = PHYS[phys].name[female] + ' po ranach z Twojego lochu'
        e = { nm, female, type, lvl: h.lvl,
            back: run.wave + 2 + (rnd() < 0.5 ? 1 : 0),       // wraca po 2 albo 3 falach
            phys, phobia, trait: h.trait, scar: scar || (Nemezis ? stara blizna : null) || 'pamięta Twój loch',
            times: (h.entry.times || 0) + 1, crystal: !!h.carriedOut,
            gear: 2 najlepsze (wg r) przedmioty z src loot/relic/body/trophy: {type, r, src, wave, ownerNm, ownerFem, wasRelic, charges},   // 1.20
            wasLost: !!h.lostEver, goldOut: h.gold || 0 }                                                                              // 1.20
        nemesisEntry(h, e)                                    // 1.23: tytuł, uraza, pokoje i pułapki (6.9)
        run.returners.push(e)
```
Źródło: `p3_flow.js: collectReturners`.

- Kandydaci: ci, którzy wyszli żywi (`fled`): wypędzeni strachem (`fleeing`, 55%), zwykle wychodzący i niosący kryształ (40%); karta Legenda ocalałych mnoży szansę ×1.5 na kopię. Bossowie nigdy. Na liście maks. 8 oczekujących.
- Blizna: (a) wypędzony strachem bez fobii dostaje fobię tego, co go najbardziej przestraszyło (element z `PHOBIA_OF_ATTR`, śmierć -> krew, element zadający ogień -> ogień); (b) inaczej, jeśli jeden typ obrażeń zadał mu > 30% maks. HP, dostaje odporność na ten typ (`SCAR_RES`), zastępując dotychczasową cechę ciała (także słabość); (c) inaczej tylko napis "pamięta Twój loch".
- Wstawienie do fali: rozdz. 2.4 (maks. 1 na falę, od fali 8 maks. 2; poziom co najmniej `lvl + 1`, +1 za wyniesiony kryształ).
- W fali: kwestia `SAY.returnBack`, karta samouczka `returner`; karta Złe wspomnienia: wchodzi ze strachem `badMemories * courage` (0.3 na kopię); karta Legenda ocalałych: +0.2 chciwości na start za każdego powracającego w `run.next` (`p3_flow.js: greedBonusParts`).
- Powracający **nie ma mechanicznej pamięci mapy** (wiedza o lochu przychodzi tylko z plotek, rozdz. 6.5), mimo kwestii "Pamiętam każdą pułapkę". Wyjątek od 1.23: Nemezis zna swoje pokoje i pułapki (6.9).
- **Trofea** (1.20, `makeHero`): do dwóch przedmiotów z `gear` wraca jako `src: 'trophy'` (`kit: false`): lepsze od jego mocy albo sprzętu tego typu zastępuje go, inne trafia na wierzch (ponad `invCap`). Kto się zgubił (`wasLost`), przynosi latarnię (`src: 'kit'`, "z domu"; decyzja: nie "trofeum", bo to nie rzecz z Twojego lochu). Trofeum, które było relikwią, wysypuje się znów jako `loot3`. W fali: `stats.returnGear`, oś czasu `rq`, 50% kwestia `SAY.returnGear` zamiast `returnBack`.

### 6.4 Wyłom

Stałe (`p3_flow.js`): `BREACH_P = 0.35`, `BREACH_PATCH = 20` (Esencji).

**Powstanie** (`p3_flow.js: startBuild`, raz na falę): jeśli nie ma wyłomu, `run.wave >= 6`, `run.tut < 0` (samouczek nieaktywny) i `rnd() < 0.35`, to `planBreach()`; sukces: przebudowa mapy, `run.breachNew = run.wave`, po sklepie modal "breach" (świeży: załatać albo zostawić). Jeśli ściana wyłomu zniknęła (przekopana, zburzona), wyłom znika.

```
planBreach():
    delete L.breach
    if run.tut >= 0 || stageOf() < 4: return false
    dist     = odległość komórek od wejścia (graf układu); fromHeart = odległość od serca
    kandydaci: pokoje (kind 'room'), nie wejście, nie serce, fromHeart >= 2 (nigdy sąsiad serca),
               bez Bastionu (element 'fortify' w pokoju)
    danger(R) = liczba plotek o pułapkach (run.rumor.traps), których pułapka nadal stoi w R
    spots(R)  = pola ściany na obwodzie pokoju: ściana, za nią skała, bez elementu, wewnętrzne pole
                przechodnie, w odległości Manhattan > 2 od każdych drzwi pokoju
    sc(R) = dist(R) * 2 - danger(R) + rnd()           // głęboko i "cicho" wg plotek
    zwycięzca = max sc; pole = pick(spots)
    L.breach = { cell, x, y, ox, oy, fresh: true, born: run.wave }
```
Źródło: `p3_flow.js: planBreach`. Budowa mapy z wyłomem: sekcja 07.

**Wybór wejścia** (`p3_flow.js: chooseEntrance`, w `startWave`):
```
fl.spawnAt = 'ent'
if !fl.breach || !L.breach: return
if L.breach.fresh: fl.spawnAt = 'breach'; return        // pierwsza fala zawsze przez świeży wyłom
pB = 0.5
if max(poziom w kolejce) >= 3:
    score(sp) = heartKnown ? najkrótsza droga BFS (avoid: 1) od sp do pól przy sercu
                           : 20 + 2 * suma fl.danger po polach pokoju za wejściem sp
    pB = clamp(0.5 + 1.5 * (score(ent) - score(breach)) / max(10, score(ent) + score(breach)), 0.1, 0.9)
if rnd() < pB: fl.spawnAt = 'breach'
```
Nowicjusze (maks. poziom < 3) wybierają 50/50. Wejście i wyłom są oba wyjściami (`p3_flow.js: isExitTile`; `p5_ai.js: exitGoals`). Pierwszy wchodzący mówi `SAY.breachUse` albo `SAY.doorUse`.

**Po fali**: `fresh = false` (`finishWave`): wyłom zostaje do załatania. **Łatanie** (`p3_flow.js: patchBreach`): tylko w budowie, koszt 20 Esencji, z cofaniem (undo). **Bastion** (`fortify`, budowla 10 Esencji, etap >= 3): przez ściany jego pokoju gildia nie przebije nowego wyłomu (istniejącego nie zamyka).

### 6.5 Plotki i opowieści z karczmy

Stałe: `RUMOR_LIFE = 2`, `RUMOR_PER = 3` (`p3_flow.js`). Pamięć karczmy: `run.rumor = { tiles: Map(indeks pola -> fala), traps: Map(klucz -> {type, wave}), loot: Map(klucz -> {type, wave}), heart: -1, gold: 0 }`.

**Zapis** (`p3_flow.js: finishWave`), tylko jeśli ktoś wyszedł żywy (`fl.anyOut`), `keep = mods.rumorKeep`:
- pola: każde znane pole podłogi/drzwi (poza pokojami z Zasłoną); każdy pokój raz losuje zapomnienie (`rnd() > keep`); zapis z numerem fali;
- pułapki: każdy żywy, który wyszedł, opowiada o maks. 3 elementach, które go najbardziej zraniły/przestraszyły (`h.felt`), tylko wyglądające na pułapkę (`LOOKS_TRAP`), nie spod Zasłony; każda zapisana z szansą `keep`;
- łup widziany w tej fali (nie spod Zasłony), z szansą `keep`;
- `run.rumor.heart = run.wave`, jeśli znali serce (pole nigdzie nie odczytywane);
- karta Fałszywe tropy: 2 zmyślone kolce.

**Odczyt** (`p3_flow.js: applyRumors`, start fali):
```
uptake = max(levelStats(e.lvl).rumor for e in kolejka)
usuń wpisy tiles/traps/loot starsze niż RUMOR_LIFE fal (run.wave - w > 2)
pokój: jeśli >= 60% jego pól jest w plotkach i rnd() <= uptake:
       pola, drzwi i ściany wokół znane; R.seen = R.rumored = true; pokój serca -> fl.heartKnown = true
pułapka z plotki: rnd() <= uptake ->
       stoi tam ta sama: it.detected = it.rumored = true
       nic tam nie stoi, a pole pasuje do slotu: "duch" fałszywej pułapki (fl.ghosts), bohaterowie go omijają
łup z plotki (jeśli nadal leży): rnd() <= uptake -> noticeLoot (rośnie chciwość), it.rumored = true
```
Wynik dla gracza: "Plotki: znają R pokoi i T pułapek" (`p3_flow.js: rumorView`), oko na mapie. Plotka żyje 2 fale (w 1.05 skrócone z 4).

**Opowieści o złocie** (ekonomia, sekcja 03): wypędzony strachem, gdy w fali widziano łup, dodaje `min(0.04 * min(4, lootSeen), 0.3 - dotąd)` chciwości na start następnej fali (`TALE_PER = 0.04`, `TALE_LOOT = 4`, `TALE_CAP = 0.3`, `p3_flow.js: heroExit`); każdy wychodzący z łupem dodaje na stałe `0.05 * h.loot + 0.02 * h.gold` do `run.rumor.gold`.

**Wiedza na start fali** = to, co przyjęli z plotek (pokoje, serce, pułapki, fałszywe pułapki, łup) + odkrywanie od pierwszego pola (`p2_state_map.js: reveal`, sekcja 06/07). `fl.knownTypes` (typy znanych pułapek) zmniejsza ich szok strachu ×0.6 (`p3_flow.js: fearResist`).

### 6.6 Wejście do lochu (kolejka)

`p6_loop.js: step`:
```
if fl.queue.length:
    routed = fl.party.plan == 'flee' && fl.heroes.length > 0
    if routed && alive().length && (fl.holdT += dt) < 8: czekają przed drzwiami
    else:
        if routed: regroupAtDoor()          // nowa grupa: plan od nowa, fl.secondGroup++
        fl.spawnTimer -= dt
        if fl.spawnTimer <= 0: spawnHero(fl.queue.shift()); fl.spawnTimer = 0.3
```
- Pierwszy wchodzi w pierwszym kroku fali, kolejni co 0.3 s, w kolejności listy (przywódca/boss pierwszy, łowcy ostatni). Pojawiają się w punkcie `spawnPt()` (wejście albo wyłom).
- `GATE_T = 1.8` s (`p6_loop.js`): do tej chwili nikt się nie rusza i nic nie strzela (drużyna zbiera się przy drzwiach, pierwszy mówi `SAY.gate`).
- Druga grupa (`p3_flow.js: regroupAtDoor`, `spawnHero`): ci, którzy weszli po ucieczce pierwszych, mają strach `0.2 * courage` (nadpisuje strach Złych wspomnień) i kwestię `SAY.secondGroup`. W 1.12 to praktycznie nieosiągalne (5 odstępów × 0.3 s = 1.5 s < 1.8 s), patrz rozdz. 9.
- `spawnHero(e)` kopiuje z wpisu: typ, `T`, `R`, rank, lvl, boss, płeć, imię, hp, max, kopie przedmiotów (`cdUntil: 0`), odwagę, charakter, ciało, fobię, `known` (Set), returning, bliznę, `hunter`; ustawia stan początkowy: `fear 0`, `invCap`, `cast` (kapłan 1.5, mag 2), `songs` barda, `faith`/`faithMax` kapłana, puste `trauma`, `fearBy`, `dmgBy`, `phobiaSeen`, `felt`, od 1.17.1 `saw` (pamięć tego, co widział w tej fali, sekcja 06, 6.7.10), `gold 0`, `cursed false` oraz cały stan AI (sekcja 06). `h.id` = kolejny indeks w `fl.heroes`.
- Kwestie przy wejściu (szczegóły sekcja 06): pierwszy wchodzący: `finalAura` (przepowiednia), `champion`, kwestia gildii, `heartRumor` (znają serce z plotek), `rumorStart` z liczbą pułapek z plotek, `rookieBoast` (nowicjusz) albo `enter`; drugi: przy sławie lochu (ranga >= 2) 70% `fame1`/`fame2` (>= 4); dalsi: nowicjusz 35% przechwałka, ostrożny 40% `cautious`; powracający `returnBack`; łowca 60% `hunters`.

### 6.7 Cierpliwość (120 s), narada i odwrót

`p6_loop.js: step`: gdy czas cierpliwości `fl.patT >= S.waveTime` (domyślnie 120 s; od 1.12.1 `fl.patT` płynie 2 razy wolniej w trakcie narad i odpoczynku, sekcja 06), fala trwa i nie jest jeszcze "nieustraszona", woła `p3_flow.js: becomeImpatient()` (co krok, dopóki nie ustawi się `fl.fearless`):

```
becomeImpatient():
    if plan in (escape, flee, leave): fl.fearless = true; return
    if P.council: return                                        // 1.17: narada trwa
    prophet = żywy bohater z boss == 'final', który nie ucieka
    if !prophet:
        if przywódca jest && (przywódca zna serce: heartP() || "jeszcze chwila" nieużyta):   // 1.17
            P.council = {stage: 'wait'}; podpowiedź "Bohaterom kończy się cierpliwość: naradzają się, co dalej."; return
        goHome(L): fl.fearless = true; fl.storm = false; plan = 'leave'; wszyscy przeplanowują, przywódca mówi SAY.leave
            podpowiedź "Bohaterom skończyła się cierpliwość: odwrót, wracają do domu."
        return
    fl.fearless = true; fl.storm = true
    if !fl.heartKnown:
        fl.heartKnown = true; znane pola najkrótszej drogi do serca i pokój serca; prorok mówi SAY.prophecy
    plan = 'assault'; przywódca mówi SAY.impatient
    podpowiedź "...szturmują serce i mniej uważają na pułapki."
```
- **Narada** (1.17, szczegóły w sekcji 06, 6.3.10a): przywódca czeka do 4 s na ciszę, potem każdy, kto stoi przy nim (bez niosącego kryształ, wychodzących, panikujących), głosuje: do domu, szturm (tylko gdy przywódca wie, gdzie jest serce) albo "jeszcze chwila" (raz na falę). Głos zależy od strachu, ran, charakteru (tchórz i ostrożny wolą dom, odważny, chciwy, barbarzyńca, czempion i łowca szturm, chciwy i łowca "jeszcze chwila"), rangi i złota w sakiewce; przywódca liczy się 1,5, elita 1,25. Wynik: dom = `goHome` (jak wyżej, bez kwestii `leave`), szturm = `fl.fearless`, `fl.storm`, `plan 'assault'`, "jeszcze chwila" = cierpliwość cofnięta do 90 s (`fl.patT = min(fl.patT, S.waveTime - 30)`), po 30 s druga narada bez tej opcji. Przegłosowany, który chciał do domu, może wrócić sam (`h.goHome`, kwestia `goHomeAlone`; chętniej tchórz, przestraszony i ciężko ranny). Narada, której nie da się zebrać w 8 s (przywódca zgubiony, w klatce), kończy się powrotem do domu.
- Zasada finału: **tylko bohater z przepowiedni** (fala 10, 20, 30...) po czasie cierpliwości prowadzi szturm na serce bez narady (przepowiednia pokazuje drogę). Do 1.16 każda inna drużyna po 120 s odchodziła do domu, nawet jeśli znała serce (decyzja autora z 1.01); od 1.17 może też szturmować albo szukać 30 s dłużej, jeśli tak przegłosuje (decyzja autora z 21.10, sekcja 11: do potwierdzenia, bo wraca szturm usunięty w 1.01).
- `fl.fearless` = tryb po cierpliwości (od 1.17 dopiero po wyniku narady "dom" albo "szturm"): limit strachu ×1.3, szybkość ×1.3, bez narad i przygotowań itd. (sekcja 05/06). HUD pokazuje zamiast czasu "szturm!" albo "odwrót", a w trakcie narady "narada".
- Wyczerpanie (od 1.24, `p3_flow.js: waveExhausted`): przy `fl.patT >= S.waveTime + 60` (180 s czasu cierpliwości; po "jeszcze chwila" później w czasie fali) bohaterowie są wyczerpani: druga grupa i zakłady się kończą, wszyscy dostają plan `leave` (niosący kryształ zostaje przy ucieczce), zgubieni odnajdują drogę, czekający przy drzwiach nie wchodzą, napis "Wyczerpany/Wyczerpana", i wychodzą na własnych nogach (sekcja 03, 1.7). Do 1.23 w tym miejscu wszyscy żywi wychodzili natychmiast (`heroExit`), a niosący kryształ go wynosił.
- Siatka bezpieczeństwa (od 1.24, `waveForceOut`): przy `fl.patT >= S.waveTime + 150` każdy jeszcze w środku wychodzi tam, gdzie stoi ("Ucieka"), a jego kryształ wraca do serca (nie liczy się jako kradzież).
- Fala kończy się 1.2 s po tym, gdy kolejka jest pusta, a wszyscy nie żyją albo wyszli (`fl.ending = 1.2`).
- W fali 1 serce odpycha drużynę (nie da się wyrwać kryształu; strach 0.3 odwagi/s przy sercu, przy 85% postępu ucieczka), `p6_loop.js: step` (sekcja 05/06).

### 6.8 Bossowie w trakcie fali

| Reguła | Źródło |
|---|---|
| Groza za śmierć i za wypędzenie bossa ×2 (`GZ.kill`, `GZ.scare`) | `p3_flow.js: kill, heroExit` |
| Strach ×0.85 dla tych, którzy są z bossem (od 1.17: widzą go albo słyszą, boss nie w klatce i nie w zapadni; sam boss też); do 1.16 dla wszystkich, póki żył jakikolwiek boss | `p3_flow.js: fearResist` |
| Bohater z przepowiedni w promieniu 3 pól: strach pozostałych ×0.75 | `p3_flow.js: fearResist` |
| Przepowiednia, raz na falę, gdy HP spadnie < 50%: +20% maks. HP leczenia, tarcza 20% maks. HP, strach pozostałych, którzy słyszą jego krzyk (od 1.17; wcześniej wszystkich), -20% odwagi, kwestia `finalRage`, napis "Gniew!" | `p3_flow.js: damage` |
| Czempion: gdy ktoś inny zaczyna uciekać, a czempion to widzi albo słyszy (od 1.17), okrzyk (odnowienie 15 s): strach nieuciekających, którzy słyszą okrzyk (od 1.17; wcześniej wszystkich), -25% odwagi, kwestia `champShout`; przy ucieczce całej drużyny czempion wychodzi z nią, ale nie jest oznaczany jako uciekający (1.17) | `p3_flow.js: startFlee, partyFlee` |
| Boss w klatce nie ginie po czasie klatki: wyłamuje kraty | `p4_traps.js: cageEnds` |
| Po cierpliwości przepowiednia szturmuje serce bez narady (6.7) | `p3_flow.js: becomeImpatient` |
| Czempion i łowca skarbów głosują na naradzie chętniej za szturmem (+0,8) | `p5_ai.js: councilVote` |
| Nagroda za falę bossa ma poziom `r = 3` zamiast 1 (`run.pendingUpgrades`, sklep w sekcji 03) | `p3_flow.js: finishWave` |
| Wyróżnienie graficzne: korona, większa figura, pomarańczowa obwódka | `p7_draw.js` (sekcja 08) |

### 6.9 Nemezis (1.23, `p5_ai.js: nemesisEntry, NEM_TITLE, nemName, bountyOf, nemesisSpawn, nemesisKilled`; `p3_flow.js: collectReturners, makeWave, makeHero, kill`)

**Kto zostaje Nemezis** (`nemesisEntry`, wołane w `collectReturners` dla każdego nowego wpisu): wpis z `times >= 2` (wraca drugi raz albo więcej) albo z `crystal` (wyniósł kryształ). Najwyżej dwóch w `run.returners`: trzeci z liczbą powrotów mniejszą lub równą najsłabszemu zostaje zwykłym powracającym; z większą najsłabszy traci `nemesis` (`stats.nemesisDropped`). `stats.nemesisNew`, oś czasu `nn`.
```
e.nemesis = { title, grudge, since, rooms, traps }
title  (NEM_TITLE, według płci, pierwsze pasujące; Nemezis, który znów uciekł, zachowuje tytuł i since):
   wyniósł kryształ                                -> "Złodziej Kryształu" / "Złodziejka Kryształu"
   widział śmierć (d.knows w fl.deaths) albo zginął jego partner więzi -> "Mściciel" / "Mścicielka"
   rany ponad 30% HP (suma h.dmgBy)                -> "Blizna"
   wyszedł ze strachu (fleeing)                    -> "Ocalały" / "Ocalała"
   inaczej                                         -> "Niezłomny" / "Niezłomna"
grudge (uraza) = największy wpis h.grudgeBy (Map pole -> {type, x, y, v}: damageRaw dodaje ułamek HP od pułapki albo potwora z polem,
                 addFear w trakcie odpalenia ułamek odwagi) z typem pułapki albo potwora
                 inaczej największy klucz h.fearBy, który jest pułapką albo potworem (x, y = null: "gdziekolwiek"), inaczej stara uraza albo null
rooms  = pokoje, do których wszedł (h.rooms, Set kluczy, onEnter) + stare
traps  = wykryte pułapki (LOOKS_TRAP, nie temp) w tych pokojach na końcu fali: [{k, type}] + stare
```
Decyzja: `dmgBy` jest kluczowane typem obrażeń (kłute, ogień...), nie elementem, więc dodano `grudgeBy`. Nemezis, który znów ucieknie, zawsze wraca (bez losowania, także ponad limit 8), z `times + 1`, sumą pokoi i pułapek, nową urazą tylko wtedy, gdy ta fala ją dała, i starą blizną, gdy nie dostał nowej. Martwy Nemezis nigdy nie wraca.

**Siła** (`makeWave`, `makeHero`): bierze pierwsze miejsce wśród powracających, poziom = reguła powracającego + 2; `rank = max(1, tierOf(lvl))` (nigdy nowicjusz), odwaga ×1,4, talizman albo amulet, którego nie ma (gdy ma miejsce: `inv.length < 3 + lvl/3`; `r = 1 + floor(lvl / 6)`, `src 'kit'`).

**Wejście** (`nemesisSpawn`, w `spawnHero`): pola, drzwi i ściany jego pokoi stają się znane (`fl.known`), pokoje `R.seen`, `R.nemKnown`; serce znane, jeśli był w jego pokoju (jak mocna plotka); jego pułapki, które wciąż stoją (ten sam typ i pole), są wykryte bez kwestii (`stats.nemTraps`, `nemRooms`); `h.nemTraps` = te pułapki i jego uraza. Zostaje przywódcą, chyba że obecny ma wyższą rangę albo jest bossem; `leader()` przy remisie rangi woli Nemezis. Mówi `nemesisIntro` zamiast `returnBack` (kwestia wyłomu albo drzwi pierwszego wchodzącego zostaje); 3,5 s później ktoś, kto go słyszy, odpowiada (80%): `nemesisFollow` ({v} = on), gdy idzie za nim (on prowadzi albo 50%), inaczej `nemesisReply`; nie, gdy jego kwestia zaczęła rozmowę. `stats.nemeses`, `nemesisReply`, oś czasu `nm`. Zachowanie w lochu (uraza, ostrzeżenia, przechwałki, brak paniki): sekcja 06, 6.14.

**Nagroda za głowę** (`bountyOf(e) = 10 + 5 × max(1, times)`): zabicie Nemezis wypłaca graczowi Esencję (`gainEssence(null, N, 'essBounty')`, napis "Nagroda! +N Esencji", `stats.bounties`, `stats.essBounty`, oś czasu `nb`, `entry.bountyPaid`). W prawdziwym runie 20-30 Esencji. Odtworzenia fal (sekcja 09) nie pokazują nagród, bo każda fala zaczyna nowy run.

**Pokazanie**: tytuł po imieniu (`nemName`, `heroName`: "Borys Niezłomny") na karcie bohatera, w liście następnej drużyny ("☠ nemezis", "Nagroda za głowę: N Esencji"), w zakładce bohaterów, na liście drużyny w budowie (złoty "☠ Borys Niezłomny" i wiersz z nagrodą), złota obwódka żetonu; podsumowanie fali "Nagroda za głowę: N Esencji · Borys Niezłomny: wypłacona. / uciekł, wróci z wyższą nagrodą."; szczegóły w sekcji 08. Zapis: `run.returners[].nemesis` i `run.next[].nemesis` to zwykłe obiekty (sekcja 07); pola bohatera (`rooms`, `grudgeBy`, `nemTraps`) żyją tylko w fali.

### 6.10 Pamięć poległych (1.23, `p5_ai.js: rememberFallen, fallenRoom`)

`run.fallen`: `{ nm, female, type, roomKey, wave, nemesis (tytuł albo null) }` dla każdego bohatera, który zginie w pokoju albo korytarzu (tylko pełna gra, `stageOf() >= 4`, jak powracający); najwyżej 12, najstarszy wypada. Bohater późniejszej fali, który wejdzie do takiego miejsca, może to powiedzieć (sekcja 06, 6.14.5). `resumeRun` daje `run.fallen = []` runowi sprzed 1.23.

---

## 7. Onboarding 1.12: co dotyczy bohaterów

`stageOf() = run.stage || ONB_FULL` (`ONB_FULL = 4`). Od 1.24 etap rośnie z falami pierwszego runu (`ONB_WAVE = [0, 1, 3, 5, 7]`, `onbAdvance`, sekcja 03, 5.3): fale 1-2 etap 1, 3-4 etap 2, 5-6 etap 3, od 7 etap 4; kolejne runy to pełna gra. Do 1.23 etap ustalał `p8b_ui.js: startGuided` dla kolejnych czterech runów "z nauką" (`run.guided`); run uruchomiony inaczej (np. testy, "Pomiń samouczek") to pełna gra (etap 4). W tabeli niżej "od etapu" = od fali `ONB_WAVE[etap]` pierwszego runu. Samouczek z przewodnikiem (`run.tutorial`) tylko w etapie 1 i tylko gdy przewodnik nie był ukończony (`coachDone`). Teksty nowości: `data/ONB_STAGES.json`.

| Element | Od etapu | Warunek w kodzie | Źródło |
|---|---|---|---|
| Pierwsza fala: 2 nowicjuszy, bez `START_LV`, poziom maks. 2, bez trudniejszego początku 1.24 i bez więzi | samouczek (`run.tutorial`) | `tutW1(n)` | `p3_flow.js: tutW1, partySize, waveCurve, earlyW, makeWave, makeBonds` |
| Premia poziomów z chciwości (`hl`) | 1 | zawsze | `p3_flow.js: makeWave` |
| Straszące pułapki i potwory (istotne dla fobii) | 2 | `ONB_ITEM` | `p1_config.js: ONB_ITEM` |
| Specjaliści gildii (i jej przedmioty) | 3 | `stageOf() >= 3 && n >= 3` | `p3_flow.js: guildAdapt` |
| Budowle-kontry, w tym Bastion | 3 | `ONB_ITEM` | `p1_config.js` |
| Ciała (`phys`) i fobie | 4 | `deep = stageOf() >= 4` | `p3_flow.js: makeHero` |
| Łowcy skarbów | 4 | `n >= 3 && stageOf() >= 4` | `p3_flow.js: makeWave` |
| Powracający (nie są nawet zbierani wcześniej), a z nimi Nemezis | 4 | `stageOf() < 4: return` | `p3_flow.js: collectReturners` |
| Narzędzia gildii (latarnia, łom) | 3 | `n >= 4 && stageOf() >= 3` | `p3_flow.js: makeWave` |
| Pamięć poległych (`run.fallen`) | 4 | `stageOf() < 4: return` | `p5_ai.js: rememberFallen, fallenRoom` |
| Wyłom | 4 | `stageOf() >= 4`, `run.tut < 0`, fala >= 6 | `p3_flow.js: planBreach, startBuild` |
| Karty o ciałach, fobiach, traumie, powracających (weakspot, anatomy, nightmares, oddbodies, scars, memories, survivors) | 4 | `ONB_CARD` | `p1_config.js: ONB_CARD` |

---

## 8. Wskazówki dla implementacji w Unity

### 8.1 Model danych (propozycja)

- **ScriptableObjects (dane)**: `HeroClassDef` (HEROES + CLASS_RES + CLASS_RES_TEXT + CLASS_SKILL + KIT + ikona), `HeroTraitDef`, `PhysDef`, `PhobiaDef` (attrs, types, srcs, sees, dark), `HeroItemDef` (HITEMS), `TierDef` (TIERS), `NameList` (NAMES_M, NAMES_F jako trójki), `WaveTuning` (GROZA_TYP, EARLY_LV, EARLY_HP, START_LV, SIZE_LV, COMBO_HP, BREACH_P, BREACH_PATCH, RUMOR_LIFE, RUMOR_PER, GUILD_WANT, progi gildii, stałe spawnu).
- **`[Serializable] class HeroEntry`** (wpis, zapisywany w save): `string type; int lvl; int rank; string boss /* null|champion|final */; bool female; string[] nm /* 3 formy */; int hp, max; List<HeroItem> inv; string trait; int courage; string phys, phobia; List<string> known; bool returning; string scar; int times; bool hunter, recruit`.
- **`[Serializable] class HeroItem`**: `string type; int r; int? charges /* null = bez limitu */; bool kit; float cdUntil`.
- **`[Serializable] class Returner`**: `nm, female, type, lvl, back, phys, phobia, trait, scar, times, crystal, used`.
- **`GuildDecision`**: `kind, sc, text`.
- **`HeroRuntime`** (MonoBehaviour albo czysta klasa + widok): pola z rozdz. 6.6 plus stan AI (sekcja 06).
- Logikę `makeWave`, `makeHero`, `makeKit`, `guildAdapt`, `collectReturners`, `levelStats`, `waveBase` umieścić w czystych klasach C# (bez MonoBehaviour), z wstrzykiwanym generatorem losowym (`System.Random` z ziarnem), żeby dało się je testować w EditMode i odtwarzać.

### 8.2 Tylko prototyp

| Element prototypu | Odpowiednik w Unity |
|---|---|
| `window.__yatd` (eksport `makeWave`, `levelStats`, `guildAdapt`, `planBreach`...) do testów w przeglądarce | testy EditMode/PlayMode wołające statyczne klasy |
| `tl(...)` (oś czasu fali), `recordWave` z `perf`, `logWave` | opcjonalna telemetria/log debug |
| `localStorage 'yatd-onb'`, `'yatd-coach'` | PlayerPrefs albo plik postępu gracza |
| przeliczenie `run.next` dla zapisów sprzed wersji 38 | brak (nowy format zapisu) |
| rysowanie canvasem (`drawNextWave`), DOM (`nextRow`, `renderHero`), ikony SVG (`CLASS_ICON`, `ITEM_GLYPH`) | UI Toolkit/uGUI i sprite'y (sekcja 08) |
| `say()` z kolejką dymków | system dymków/kwestii (sekcja 06) |
| `Math.random()` | `System.Random`/własny RNG z ziarnem |

---

## 9. Błędy, martwy kod i niespójności zauważone w prototypie

1. **Liczba łowców w podsumowaniu jest liczona inaczej niż w grze.** `p8b_ui.js: renderWave` (zakładka "Następna") pokazuje `huntersN(run.greedRep)` (chciwość po krzywej), a `makeWave` używa `huntersN(greedRaw(run.greedRep))` (surowej) i dodatkowo limitu `size - 2`, warunku fali >= 3 i etapu >= 4. Gracz może zobaczyć 0 łowców, a dostać 1-2 (np. `greedRep` 2.83: UI 0, gra 2). W Unity liczyć tak jak `makeWave` albo pokazywać faktyczną liczbę z `run.next`.
2. **`TRAIT_TEXT.careful`** obiecuje "sprawdza podłogę, rzadziej wpada w pułapki", a charakter `careful` daje tylko `avoid` ×1.3, łup ×0.6 i kwestie. Testowanie podłogi to `R.caution` (poziom >= 6).
3. **Powracający "z pamięcią lochu"** (tekst `ONB_STAGES[4]`, kwestie `returnBack`) nie ma pamięci mapy w kodzie; ma tylko wyższy poziom i bliznę.
4. **`HERO_TRAITS.w`** (wagi) nieużywane; losowanie równomierne. Podobnie `HEROES.letter` nie jest nigdzie czytane.
5. **`rollItem` bez `pool`** (typy bez `loot`) nie jest wołane w grze (tylko eksport testowy).
6. **`applyRumors`**: warunek `run.wave - v.wave > 3` dla łupu jest martwy, bo wcześniej ta sama funkcja usuwa wpisy starsze niż `RUMOR_LIFE = 2`.
7. **`run.rumor.heart`** jest zapisywane w `finishWave`, ale nigdzie nie odczytywane (serce poznają tylko przez plotkę o pokoju serca).
8. **`becomeImpatient`**: w gałęzi z prorokiem `else` ("nie znaleźli serca i wracają do domu") jest nieosiągalne, bo chwilę wcześniej `fl.heartKnown = true`.
9. **Druga grupa przy drzwiach** (`regroupAtDoor`, `fl.secondGroup`) jest w 1.12 praktycznie nieosiągalna: maks. 6 bohaterów wchodzi w 1.5 s, a nikt się nie rusza przed `GATE_T = 1.8` s. Niepewne: sprawdź `p5_ai.js: partyThink` (ucieczka drużyny przed otwarciem bramy, np. powracający ze strachem z kart Złe wspomnienia, mogłaby ją wywołać).
10. **Suwak `earlyHp`** opisany "Dodatkowe HP w falach 2-6", a `EARLY_HP` daje też +25% w fali 1.
11. **Imiona**: powracający może mieć to samo imię co ktoś już wylosowany w tej fali (`pre.nm` nie jest sprawdzane z `used`).
12. **Powracający zastępujący łowcę lub rekruta tej samej klasy** (dopasowanie `same` po samej klasie) usuwa flagę `hunter`/`recruit`: łowców jest wtedy mniej niż wyliczono (a powracający łowca zachowuje charakter `greedy`).
13. **Blizna z ran nadpisuje ciało**: bohater ze słabością (np. `brittle`) może wrócić z odpornością innego typu, a słabość znika. Zgodne z komentarzem ("rana go zahartowała"), ale warto to świadomie zachować.
14. **Siatka bezpieczeństwa 180 s** (zmienione w 1.24): do 1.23 wyprowadzała też niosącego kryształ (stracony kryształ); od 1.24 po 180 s jest wyczerpanie (wychodzą sami), a po 270 s utknięci wychodzą z miejsca, kryształ wraca do serca (6.7).
15. **Pasywny bonus amuletu do wykrywania** (`scanTraps`, `gearR`) działa także przy 0 użyć.
16. **Przedmiot gildii** ma zawsze 1 użycie niezależnie od mocy; dołożony do istniejącej mocy daje +1 użycie i ewentualnie wyższą moc (bez sprawdzenia, czy to "ten sam" przedmiot).
17. **`fearResist`**: mnożnik 0.85 bossa działa także na samego bossa (do 1.16 brak warunku `o !== h`; od 1.17 jest to zapisane wprost: `o === h || canSee(h, o) || canHear(h, o)`, a dla reszty działa tylko, gdy są z nim).
18. **`phobiaSight`** nie sprawdza `hp` potwora, więc martwy pająk/duch w pokoju (element zostaje w `fl.items` z `hp <= 0`) też wywoła szok fobii. Prawdopodobnie błąd; w Unity pomijać martwe potwory.
19. **Fale >= 15**: limit `waveSize <= 6` sprawia, że boss nie dochodzi jako dodatkowy bohater (zastępuje zwykłego).
20. Komentarz w `makeWave` mówi, że pierwsze trzy fale to tylko klasy klasyczne, ale gildia w fali 3 może wstawić barda albo barbarzyńcę (zgodne z tekstem onboardingu "od fali 3").
21. Linia "Fala N+1: poziom ok. X" w podsumowaniu pokazuje `round(waveBase)`, bez premii chciwości i szumu (informacyjne; realne poziomy są na liście drużyny).
22. **Opis etapów w `p1_config.js`** (komentarz przy `ONB_FULL`) nadal mówi o czterech runach; od 1.24 obowiązuje `ONB_WAVE`.
23. **Więź mistrza przy braku pary** (1.21-1.24): rzut na mistrza (`0,15 <= r < 0,35`) bez pary w `ment` daje przyjaciół z losową parą, więc faktyczny udział przyjaciół jest wyższy niż 20% z tabeli.
24. **Nemezis a ranga przywódcy**: `nemesisSpawn` przejmuje prowadzenie, gdy obecny przywódca ma rangę <= jego (nie bossa), choć `leader()` przy następnym wyborze i tak sortuje po randze.

---

## 10. Testy akceptacyjne (minimum)

1. `waveSize` dla fal 1-20 (zwykły run i samouczek) zgodny z tabelą w 2.1.
2. `waveBase(n)` dla `S.scale = 1`, `pactLevels = 0`: od 1.24 4.77, 5.86, 6.54, 6.86 (fale 1-4, 3.9), potem jak w tabeli 3.8 (7.29, 9.38, 11.77, 13.08, 15.11, 16.35); `waveBase0` (krzywa do 1.23): 1.50, 3.03, 4.77, 6.22; samouczek fala 1: 1.00.
3. `levelStats(L)` dla L = 1-30 równe `data/levelStats_1_30.json` (tolerancja 1e-4).
4. `makeHero('warrior', 9, 5, used, 'champion')` przy `S` domyślnych: `max = 636`, `courage = 327`, brak charakteru i fobii, ekwipunek z poziomu 11.
5. W żadnej fali nie ma dwóch bohaterów tej samej klasy; w falach 1-3 bez gildii tylko klasy z `CLASSIC`.
6. Samouczek fala 1: żaden poziom > 2 (od 1.24 limit 4 w falach 1-2 zniesiony).
11. `makeBonds`: 0-2 więzi, najwyżej jedna na bohatera, żadna dla powracającego ani w fali samouczka; mistrz ma rangę >= 1, uczeń nowicjusza, rekruta albo rangę niżej.
12. `nemesisEntry`: `times >= 2` albo kryształ daje tytuł z `NEM_TITLE`; najwyżej dwóch Nemezis; nagroda `10 + 5 × times`; Nemezis wraca zawsze, z +2 poziomami, rangą >= 1 i odwagą ×1,4.
7. `guildAdapt`: dla statystyk z `fearPts + scarePts` > 55% zwraca `fear`; przy remisie sc wygrywa wcześniejsza opcja.
8. `makeKit`: dla L = 20 maks. 7 losowań, moc 5, powtórzone moce łączą się w `charges`.
9. `collectReturners`: boss nigdy, maks. 8 na liście, `back` = fala + 2 albo + 3; w `makeWave` maks. 1 (fala >= 8: 2) na falę.
10. `chooseEntrance`: świeży wyłom zawsze `breach`; drużyna nowicjuszy 50/50; `pB` w [0.1, 0.9].
