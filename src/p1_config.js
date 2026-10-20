
  /* ================= config ================= */
  // One dungeon for the whole run, on a grid of cells: a cell holds a room (3-5 tiles a side) or rock.
  // The run starts inside a 4x5 block; after that you can dig left, right and down without limit (above the entrance is the surface).
  // Neighbouring rooms are joined by corridors that bend in the gap column/row between cells, so they never cross.
  // Between waves you dig new rooms, cut passages and demolish what you no longer want.
  const CGX = 4, CGY = 5, CELL = 8;
  let WW = (CGX + 2) * CELL + 1, WH = (CGY + 1) * CELL + 1;   // recomputed from the layout (one spare ring of rock cells)
  const ROCK = 0, WALL = 1, FLOOR = 2, DOOR = 3;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  const DEFAULTS = {
    waveTime: 120, scale: 1, heroHp: 100, heroSpeed: 100, dmg: 0.7, monDmg: 1, essence: 30, deckSize: 7, waveIncome: 8, regenBase: 0, fearRate: 1,
    essenceCap: 40, crystals: 3, comboWin: 3, comboQuiet: 0.25, essK: 1.1, checkDiff: 1, ffSpeed: 3, thrBase: 1500, depthMax: 2.4, volume: 0.6, hungerBase: 37, hungerGrowth: 1.25, greedW: 1.0, autoFF: 1.5, earlyHp: 1,
    music: 0.5,   // 1.07: the music's volume (0 = off)
    haptics: 1, trayAuto: 1, series: 1, split: 1,   // game settings (0/1): vibration, tray folds during a wave, one check for a volley, split screen (1.03)
    topPad: 0   // 1.02: extra gap at the top of the screen (px), for phones whose camera or corners still cut the top
  };
  const RUN_WAVES = 10;   // wave 5: a champion, wave 10: the hero of the prophecy. Survive it and the run is won (you may play on).
  const f1 = v => v.toFixed(1).replace('.', ','), x1 = v => '×' + f1(v), x2 = v => '×' + v.toFixed(2).replace('.', ',');
  const SLIDERS = [
    { k: 'waveTime', label: 'Cierpliwość fali (s)', min: 60, max: 300, step: 10 },
    { k: 'scale', label: 'Tempo wzrostu fal', min: 0.5, max: 2, step: 0.1, fmt: x1 },
    { k: 'dmg', label: 'Siła Twoich pułapek', min: 0.3, max: 1.5, step: 0.05, fmt: x2 },
    { k: 'monDmg', label: 'Siła potworów', min: 0.3, max: 2, step: 0.1, fmt: x1 },
    { k: 'heroHp', label: 'HP bohaterów (%)', min: 50, max: 200, step: 10 },
    { k: 'earlyHp', label: 'Dodatkowe HP w falach 2-6 (1 = jak w grze, 0 = bez, 2 = podwójne)', min: 0, max: 3, step: 0.25, fmt: x2 },
    { k: 'heroSpeed', label: 'Szybkość bohaterów (%)', min: 50, max: 200, step: 10 },
    { k: 'essence', label: 'Esencja na start', min: 0, max: 60, step: 1 },
    { k: 'waveIncome', label: 'Esencja po każdej fali', min: 0, max: 30, step: 1 },
    { k: 'regenBase', label: 'Odnawianie w trakcie fali (na 10 s)', min: 0, max: 6, step: 0.1, fmt: f1 },
    { k: 'fearRate', label: 'Esencja z ran i strachu', min: 0, max: 6, step: 0.5, fmt: f1 },
    { k: 'hungerBase', label: 'Głód serca: Esencja z fali 2', min: 0, max: 200, step: 1 },
    { k: 'hungerGrowth', label: 'Głód serca: wzrost na falę', min: 1.2, max: 2, step: 0.05, fmt: x2 },
    { k: 'greedW', label: 'Chciwość: poziomy przywódcy za każde +1 chciwości', min: 0, max: 3, step: 0.1, fmt: v => v.toFixed(1).replace('.', ',') },
    { k: 'crystals', label: 'Kryształy w sercu (od nowego runu)', min: 1, max: 6, step: 1 },
    { k: 'deckSize', label: 'Miejsca w talii (od nowego runu)', min: 3, max: 12, step: 1 },
    { k: 'comboWin', label: 'Okno combo (s)', min: 1, max: 6, step: 0.5, fmt: f1 },
    { k: 'comboQuiet', label: 'Zegar combo w ciszy (×)', min: 0, max: 1, step: 0.05, fmt: f1 },
    { k: 'essK', label: 'Mnożnik Esencji z Grozy (×)', min: 0.5, max: 2, step: 0.05, fmt: f1 },
    { k: 'thrBase', label: 'Pierwszy próg karty (pkt)', min: 500, max: 5000, step: 100 },
    { k: 'depthMax', label: 'Mnożnik pokoju z sercem', min: 1, max: 5, step: 0.1, fmt: x1 }
  ];
  const GAME_SETTINGS = [
    { k: 'volume', label: 'Głośność efektów', min: 0, max: 1, step: 0.1, fmt: v => Math.round(v * 100) + '%' },
    { k: 'music', label: 'Muzyka', min: 0, max: 1, step: 0.1, fmt: v => v ? Math.round(v * 100) + '%' : 'wyłączona' },
    { k: 'haptics', label: 'Wibracje (telefony z Androidem)', toggle: true },
    { k: 'series', label: 'Seria: jeden skill check na kilka pułapek naraz', toggle: true },
    { k: 'split', label: 'Dziel ekran, gdy drużyna rozejdzie się za daleko', toggle: true },
    { k: 'checkDiff', label: 'Trudność skill checków', min: 0.6, max: 1.8, step: 0.1, fmt: x1 },
    { k: 'autoFF', label: 'Auto-przyspieszenie, gdy nic się nie dzieje (1 = wyłączone)', min: 1, max: 4, step: 0.5, fmt: x1 },
    { k: 'ffSpeed', label: 'Przyspieszenie (przytrzymanie palca)', min: 2, max: 6, step: 0.5, fmt: x1 },
    { k: 'topPad', label: 'Odstęp od góry ekranu (gdy aparat albo róg ucina górę)', min: 0, max: 48, step: 4, fmt: v => v ? '+' + v + ' px' : 'auto' }
  ];
  // Points are the measure of HOW WELL a run went (surviving the waves is the measure of success): the rank at the end.
  const RANKS = [[0, 'Nora'], [150, 'Piwnica'], [400, 'Loch'], [1000, 'Labirynt'], [2500, 'Twierdza grozy'], [6000, 'Legenda']];   // v15: Esencja harvested in the run
  const rankOf = pts => { let i = 0; RANKS.forEach((r, k) => { if (pts >= r[0]) i = k; }); return { i, name: RANKS[i][1], next: RANKS[i + 1] || null }; };
  const SLOT_LABEL = { floor: 'podłoga', wall: 'ściana', door: 'drzwi', object: 'mebel', dig: 'skała przy lochu', tunnel: 'dwa sąsiednie pokoje', demolish: 'pokój albo przejście', expand: 'pokój albo korytarz', roomtype: 'cały pokój' };
  const ITEMS = {
    spikes: { name: 'Kolce', cost: 3, slot: 'floor', tag: 'szybkie', cd: 1.5, desc: 'Kolce (podłoga, kłute): jedno pole, szybkie odnowienie. +50%, gdy bohater stoi: walczy, czeka, w sieci albo w klatce. Najlepsze tuż za drzwiami.' },
    web: { name: 'Sieć', cost: 3, slot: 'floor', tag: 'spowalnia', cd: 7, desc: 'Sieć (podłoga): spowalnia w kwadracie 3×3 na 3 s, a bohater w sieci dostaje +30% obrażeń. Mag potrafi ją rozproszyć.' },
    trapdoor: { name: 'Zapadnia', cost: 4, slot: 'floor', tag: 'rozdziela', cd: 8, desc: 'Zapadnia (podłoga, obuchowe): bohater spada pod loch i po chwili wychodzi sam w innym pokoju, często zgubiony. Złodziej ją rozbroi.' },
    cage: { name: 'Klatka', cost: 4, slot: 'floor', tag: 'więzi', cd: 10, desc: 'Klatka (podłoga): więzi bohatera na 6 s, uwięziony dostaje +50% obrażeń. Jeśli drużyna go nie uwolni, umiera w klatce (boss wyłamie kraty).' },
    arrows: { name: 'Strzały', cost: 3, slot: 'wall', tag: 'linia', cd: 3, desc: 'Strzały (ściana, kłute): strzała leci przez cały pokój w linii prostej i trafia każdego. Mebel ją zatrzymuje.' },
    fire: { name: 'Ogień', cost: 4, slot: 'wall', tag: 'podpala', cd: 5, desc: 'Ogień (ściana, ogień): płomień 2×3 przed ścianą i podpalenie na 3 s. Podpalonego nie leczy odpoczynek, kapłan musi go ugasić.' },
    portrait: { name: 'Portret', cost: 4, slot: 'wall', tag: 'strach', cd: 6, desc: 'Portret (ściana): nie rani, tylko straszy wszystkich w zasięgu 4 pól. Doświadczony kapłan potrafi go odczynić.' },
    gate: { name: 'Krata', cost: 4, slot: 'door', tag: 'rozdziela', cd: 8, desc: 'Krata (drzwi, obuchowe): zamyka przejście na 4 s i rozdziela drużynę. Odcięci szukają innej drogi albo się gubią. Odnawia się 8 s po otwarciu, 3 zamknięcia na falę.' },
    crate: { name: 'Skrzynia', cost: 3, slot: 'floor', tag: 'blokuje', build: true, desc: 'Skrzynia (podłoga pokoju, między falami): blokuje przejście i jest meblem pod proch, mimika albo pozytywkę. Przytrzymanie w budowie zwraca Esencję.' },
    powder: { name: 'Proch', cost: 3, slot: 'object', tag: 'wybuch', cd: 0, desc: 'Proch (mebel, ogień): wybuch 3×3, mebel znika i otwiera nowe przejście. Jednorazowy.' },
    mimic: { name: 'Mimik', cost: 4, slot: 'object', tag: 'gryzie', cd: 4, desc: 'Mimik (mebel, kłute): mebel gryzie wszystkich dookoła. Złodziej go nie rozbroi.' },
    goblin: { name: 'Goblin', cost: 4, slot: 'floor', cd: 3, hp: 110, melee: 14, tag: 'blokuje', desc: 'Goblin (potwór, kłute): blokuje przejście i mocno bije tego, kto z nim walczy. Ginie na dobre. Skill check: Dźgnięcie.' },
    archer: { name: 'Łucznik', cost: 4, slot: 'floor', cd: 4, hp: 50, melee: 4, tag: 'strzela', desc: 'Łucznik (potwór, kłute): sam strzela do bohaterów w swoim pokoju (zasięg 4). Ginie na dobre. Skill check: Salwa.' },
    spider: { name: 'Pająk', cost: 5, slot: 'floor', cd: 5, hp: 90, melee: 12, tag: 'oplata', desc: 'Pająk (potwór, trucizna): blokuje przejście, gryzie i oplata siecią. Skill check: Oplątanie 3×3 z ugryzieniem.' },
    ogre: { name: 'Ogr', cost: 7, slot: 'floor', cd: 6, hp: 240, melee: 18, tag: 'tank', desc: 'Ogr (potwór, obuchowe): bardzo dużo życia, bije wszystkich, którzy z nim walczą. Skill check: Uderzenie 3×3.' },
    shaman: { name: 'Szaman', cost: 5, slot: 'floor', cd: 8, hp: 60, melee: 3, tag: 'leczy', desc: 'Szaman (potwór): leczy potwory w promieniu 2 pól. Skill check: Wielkie leczenie wszystkich potworów w pokoju.' },
    ghost: { name: 'Duch', cost: 5, slot: 'floor', cd: 7, hp: 60, melee: 5, tag: 'straszy', desc: 'Duch (potwór): krąży przy bohaterach i straszy, nie blokuje przejścia. Ranią go tylko kapłan i mag. Skill check: Wrzask.' },
    // v15.1: more things that only scare (as many as the things that wound)
    eyes: { name: 'Oczy', cost: 3, slot: 'wall', tag: 'samotni ×2', cd: 3, desc: 'Oczy (ściana): patrzą w linii przez cały pokój i straszą każdego na tej linii. Samotny albo zgubiony boi się 2 razy bardziej. Kapłan je odczyni.' },
    bones: { name: 'Kości', cost: 3, slot: 'floor', tag: 'nowicjusze', cd: 4, desc: 'Kości (podłoga): grzechoczą i straszą w kwadracie 3×3. Nowicjusze boją się 1,5 raza bardziej. Kapłan je odczyni.' },
    mirror: { name: 'Lustro', cost: 4, slot: 'wall', tag: 'dobija', cd: 6, desc: 'Lustro (ściana): straszy w zasięgu 3 pól, tym mocniej, im bardziej bohater już się boi (do 2,5 raza). Kapłan je odczyni.' },
    creak: { name: 'Zawiasy', cost: 3, slot: 'door', tag: 'próg', cd: 4, desc: 'Skrzypiące zawiasy (drzwi): mocno straszą tego, kto jest w drzwiach albo tuż przy nich, słabiej każdego do 2 pól. Złodziej je rozbroi.' },
    coffin: { name: 'Trumna', cost: 5, slot: 'floor', tag: 'mocny strach', cd: 9, desc: 'Trumna (podłoga): wieko się uchyla. Najbliższy bohater bardzo się boi, inni do 2 pól trochę. W Krypcie +50%. Złodziej zabije ją gwoździami.' },
    musicbox: { name: 'Pozytywka', cost: 4, slot: 'object', tag: 'cały pokój', cd: 9, desc: 'Pozytywka (mebel): gra kołysankę w całym pokoju i przez 4 s każdy, kto tam jest, boi się coraz bardziej. Złodziej ją rozbroi.' },
    shade: { name: 'Cień', cost: 5, slot: 'floor', cd: 8, hp: 50, melee: 0, tag: 'samotni', desc: 'Cień (potwór): sunie za samotnym albo ostatnim w szyku i szepcze mu do ucha. Samotny boi się 2 razy bardziej. Rani go tylko kapłan. Skill check: Szept.' },
    bats: { name: 'Nietoperze', cost: 4, slot: 'floor', cd: 6, hp: 40, melee: 0, tag: 'płoszą', desc: 'Nietoperze (potwór, kłute): szybki rój krąży między bohaterami, gryzie i straszy. Ranią go tylko mag i kapłan. Skill check: rój płoszy bohaterów (uciekają na oślep).' },
    loot: { name: 'Monety', cost: 3, slot: 'floor', tag: 'chciwość', cd: 0, rarity: 1, desc: 'Monety (łup): widać je dopiero z pokoju. Tanio i mocno podbijają chciwość, kuszą chciwych i złodziei. Połowa chciwości zostaje do końca runu.' },
    lpotion: { name: 'Mikstura', cost: 4, slot: 'floor', tag: 'wabi rannych', cd: 0, rarity: 1, desc: 'Mikstura (łup): prawie bez chciwości, ale ranny bohater pójdzie po nią nawet przez pułapki. Postaw ją w pokoju śmierci.' },
    loot2: { name: 'Ekwipunek', cost: 5, slot: 'floor', tag: 'rzadki', cd: 0, rarity: 2, desc: 'Ekwipunek (łup): widać go z sąsiedniego pokoju, mocno podbija chciwość. Zabrany daje rzadki przedmiot, gorszy zostaje na podłodze.' },
    loot3: { name: 'Relikwia', cost: 10, slot: 'floor', tag: 'legendarny', cd: 0, rarity: 3, desc: 'Relikwia (łup): lśni przez kilka pokoi, bardzo podbija chciwość i rozdziela drużynę. Zabrana: 4 Esencji i legendarny przedmiot.' },
    lcursed: { name: 'Przeklęty', cost: 5, slot: 'floor', tag: 'klątwa', cd: 0, rarity: 2, desc: 'Przeklęty skarb (łup, trucizna): wygląda jak ekwipunek. Kto go weźmie: +30% obrażeń, słabsze przedmioty, rosnący strach. Kapłan zdejmie klątwę.' },
    rune: { name: 'Runa', cost: 14, slot: 'floor', tag: 'magowie', build: true, desc: 'Runa (budowla, blokuje przejście jak skrzynia): magowie nie zakłócą ani nie wyczują pułapek w tym pokoju. Kontra na gildię z magami. Jedna na pokój.' },
    altar: { name: 'Ołtarz', cost: 14, slot: 'floor', tag: 'kapłani', build: true, desc: 'Ołtarz (budowla, blokuje przejście jak skrzynia): moce kapłana i amulety działają tu o połowę słabiej. Kontra na kapłanów i leczenie. Jeden na pokój.' },
    decoy: { name: 'Wabik', cost: 10, slot: 'floor', tag: 'złodzieje', build: true, desc: 'Wabik (budowla, blokuje przejście jak skrzynia): wygląda jak pułapka. Złodziej rozbraja go najpierw i podnosi alarm: odpalają wszystkie gotowe pułapki w pokoju.' },
    acid: { name: 'Kwas', cost: 12, slot: 'floor', tag: 'tarcze', build: true, desc: 'Kwas (budowla, blokuje przejście jak skrzynia): tarcza wojownika, osłona kapłana i talizmany chronią tu o połowę słabiej. Kontra na wojowników. Jeden na pokój.' },
    veil: { name: 'Zasłona', cost: 12, slot: 'floor', tag: 'plotki', build: true, desc: 'Zasłona (budowla, blokuje przejście jak skrzynia): uciekinierzy nie zapamiętają tego pokoju ani jego pułapek. Jedna na pokój.' },
    // 1.05: counters to the two new classes
    howl: { name: 'Kamień wyjec', cost: 12, slot: 'floor', tag: 'bardowie', build: true, desc: 'Kamień wyjec (budowla, blokuje przejście jak skrzynia): wiatr wyje w jego otworach. Pieśń barda tu nie działa, a echo myli głosy: zgubiony nie trafi tu do drużyny po głosie. Kontra na bardów. Jeden na pokój.' },
    shackles: { name: 'Okowy', cost: 12, slot: 'floor', tag: 'furia', build: true, desc: 'Okowy (budowla, blokuje przejście jak skrzynia): w tym pokoju nikt nie wpada w furię, a skrzyń i budowli nie da się tu rozbić. Kontra na barbarzyńców. Jeden na pokój.' },
    fortify: { name: 'Bastion', cost: 10, slot: 'floor', tag: 'wyłomy', build: true, desc: 'Bastion (budowla, blokuje przejście jak skrzynia): przez ściany tego pokoju gildia nie przebije wyłomu. Jeden na pokój.' },
    upgrade: { name: 'Ulepsz', cost: 0, slot: null, tag: 'poziom +1', mode: true, desc: 'Ulepsz: stuknij pułapkę albo potwora (koszt nad elementem). Poziom 2 i 3 to więcej mocy, poziom 3 dodaje cechę. Stuknij Ulepsz znowu, żeby wyjść.' },
    move: { name: 'Przenieś', cost: 0, slot: null, tag: 'za darmo', mode: true, desc: 'Przenieś: stuknij element, potem nowe miejsce. Za darmo, poziom zostaje. Tak przestawisz pułapki znane z plotek.' },
    dig: { name: 'Nowy pokój', cost: 8, slot: 'dig', tag: 'kopanie', tool: true, desc: 'Nowy pokój: stuknij plus przy krawędzi lochu. Nowego pokoju nie znają plotki, więc bohaterowie muszą go odkryć.' },
    tunnel: { name: 'Przejście', cost: 4, slot: 'tunnel', tag: 'pętla', tool: true, desc: 'Przejście między dwoma sąsiednimi pokojami. Więcej dróg to więcej wyborów i więcej błędów bohaterów.' },
    expand: { name: 'Rozbuduj', cost: 4, slot: 'expand', tag: '+1 miejsce', tool: true, desc: 'Rozbuduj pokój albo korytarz: +1 miejsce na element. Każda kolejna rozbudowa tego miejsca kosztuje 2 razy więcej.' },
    demolish: { name: 'Wyburz', cost: 0, slot: 'demolish', tag: 'zwrot', tool: true, desc: 'Wyburz pokój albo przejście. Elementy wracają jako Esencja, pokój zwraca jeszcze 5. Serca nie odetniesz od wejścia.' },
    // room types: a whole room gets a character (one type per room, tap it again with the same type to take it off for half back)
    r_fog: { name: 'Mgła', cost: 10, slot: 'roomtype', tag: 'gubią się', tool: true, rt: 'fog', desc: 'Mgła (pokój): widać na 2 pola, drużyna się rozłazi i każdy łatwo się gubi, nikt nie wykrywa pułapek, strach +15%. Stuknij znacznik pokoju.' },
    r_swamp: { name: 'Bagno', cost: 8, slot: 'roomtype', tag: 'spowalnia', tool: true, rt: 'swamp', desc: 'Bagno (pokój): ruch o 35% wolniej, bez odpoczynku, rozbrajanie trwa o połowę dłużej. Stuknij znacznik pokoju.' },
    r_grotto: { name: 'Grota', cost: 10, slot: 'roomtype', tag: 'echo strachu', tool: true, rt: 'grotto', desc: 'Grota (pokój): 40% strachu słychać w sąsiednich pokojach, combo z groty czeka o połowę dłużej. Stuknij znacznik pokoju.' },
    r_crypt: { name: 'Krypta', cost: 10, slot: 'roomtype', tag: 'śmierć ×2', tool: true, rt: 'crypt', desc: 'Krypta (pokój): śmierć straszy 2 razy mocniej i daje +50% Grozy, potwory mają +25% HP. Stuknij znacznik pokoju.' },
    r_vault: { name: 'Sezam', cost: 10, slot: 'roomtype', tag: 'łup ×2', tool: true, rt: 'vault', desc: 'Sezam (pokój): łup podbija chciwość 2 razy mocniej i kusi 1,5 raza bardziej, mnożnik pokoju +0,15. Stuknij znacznik pokoju.' },
    // 1.10 (author: more room types, each playing with the other mechanics)
    r_haven: { name: 'Sanktuarium', cost: 10, slot: 'roomtype', tag: 'fałszywy azyl', tool: true, rt: 'haven', desc: 'Sanktuarium (pokój): wygląda na najbezpieczniejsze miejsce w lochu. Ranni chcą tu odpocząć (sami, w biegu, i cała drużyna przy odwrocie), ale rany goją się tu 2 razy wolniej, a śpiących dręczą koszmary: strach rośnie. Stuknij znacznik pokoju.' },
    r_gears: { name: 'Zębatki', cost: 10, slot: 'roomtype', tag: 'combo z jednej', tool: true, rt: 'gears', desc: 'Zębatki (pokój): pułapki w tym pokoju przeładowują się o 25% szybciej, a ta sama pułapka odpalona drugi raz z rzędu też podbija combo. Stuknij znacznik pokoju.' },
    r_hush: { name: 'Głusza', cost: 8, slot: 'roomtype', tag: 'bez słów', tool: true, rt: 'hush', desc: 'Głusza (pokój): nic tu nie słychać. Bohaterowie nie ostrzegą się nawzajem (pułapki, które tu odpalą, nie trafią do ich wiedzy), nie zawołają kapłana, nie dodadzą sobie otuchy, a zgubiony nie usłyszy odpowiedzi. Strach +20%. Stuknij znacznik pokoju.' },
    r_ice: { name: 'Lodownia', cost: 10, slot: 'roomtype', tag: 'poślizg', tool: true, rt: 'ice', desc: 'Lodownia (pokój): ślisko. Co trzeci krok bohater jedzie jedno pole dalej, prosto w to, co tam leży (doświadczeni i złodziej rzadziej). Nikt tu nie odpoczywa. Stuknij znacznik pokoju.' }
  };
  const TABS = [
    // Prototype 1.01 (author's layout): what wounds and what scares together, every monster in one tab, loot apart,
    // Obiekty = what stands in a room like a crate (the crate and the counter-buildings), Loch = digging and room types.
    { id: 'traps', label: 'Pułapki', items: ['spikes', 'arrows', 'web', 'trapdoor', 'cage', 'fire', 'gate', 'powder', 'mimic', 'portrait', 'eyes', 'bones', 'mirror', 'creak', 'coffin', 'musicbox'] },
    { id: 'monster', label: 'Potwory', items: ['goblin', 'archer', 'spider', 'ogre', 'shaman', 'ghost', 'shade', 'bats'] },
    { id: 'loot', label: 'Łup', items: ['loot', 'lpotion', 'loot2', 'loot3', 'lcursed'] },
    { id: 'object', label: 'Obiekty', items: ['crate', 'rune', 'altar', 'decoy', 'acid', 'howl', 'shackles', 'veil', 'fortify'] },
    { id: 'dungeon', label: 'Loch', items: ['dig', 'tunnel', 'expand', 'demolish', 'r_fog', 'r_swamp', 'r_grotto', 'r_crypt', 'r_vault', 'r_haven', 'r_gears', 'r_hush', 'r_ice'] },   // no Przenieś (a tap moves), no Ulepsz (a double tap upgrades)
    { id: 'deck', label: 'Talia', items: [] }
  ];
  const ITEM_ORDER = TABS.flatMap(t => t.items).concat(['upgrade']);   // Ulepsz stays as a mode the code knows, with no tile in any tab
  const START_UNLOCKED = ['spikes', 'trapdoor', 'arrows', 'portrait', 'eyes', 'bones', 'gate', 'crate', 'powder', 'goblin', 'archer', 'loot', 'lpotion', 'loot2', 'loot3', 'lcursed', 'dig', 'tunnel', 'expand', 'demolish', 'rune', 'altar', 'decoy', 'acid', 'veil', 'fortify', 'howl', 'shackles', 'upgrade', 'move',
    'r_fog', 'r_swamp', 'r_grotto', 'r_crypt', 'r_vault', 'r_haven', 'r_gears', 'r_hush', 'r_ice'];
  // 1.12 (author: the tutorial spread over a few runs): the first runs open the game step by step. Run 1 is the core
  // (what wounds: traps and monsters; loot, digging, the shop and the deck, the heart), run 2 adds what scares, run 3
  // the guild's specialists with the counter-buildings and the room types, run 4 the heroes' bodies and phobias, the
  // returners, the treasure hunters and the breach. The stage lives in the browser ('yatd-onb'): a run that ends (or one
  // left after wave 5) moves it on, "Pomiń samouczek" opens everything at once. A run started any other way (the dungeon
  // behind the start screen, the tests) is the full game.
  const ONB_FULL = 4;
  // (both of the author's winning runs leaned on monsters: the kill run on the ogre, the archer and the goblin, so the wounding
  // monsters stay in run 1; a run 1 of traps only would be another game)
  const ONB_ITEM = { ghost: 2, shade: 2, bats: 2, portrait: 2, eyes: 2, bones: 2, mirror: 2, creak: 2, coffin: 2, musicbox: 2,
    crate: 3, rune: 3, altar: 3, decoy: 3, acid: 3, howl: 3, shackles: 3, veil: 3, fortify: 3,
    r_fog: 3, r_swamp: 3, r_grotto: 3, r_crypt: 3, r_vault: 3, r_haven: 3, r_gears: 3, r_hush: 3, r_ice: 3 };
  // cards that only make sense with what a later run brings (a card that needs a locked trap or monster is filtered by its req)
  const ONB_CARD = { monsterroar: 2, haunt: 2, echo: 2, panic: 2, harvest: 2, chronicle: 2, dread: 2, screams: 2, lastgasp: 2, cageghost: 2, isolation: 2,
    heavyair: 3, cheapwalls: 3, weakspot: 4, anatomy: 4, nightmares: 4, oddbodies: 4, scars: 4, memories: 4, survivors: 4 };
  const ONB_STAGES = [null,
    { name: 'Podstawy', news: [] },
    { name: 'Strach', news: [
      'Pułapki, które straszą (w zakładce Pułapki, za raniącymi): portret, oczy i kości od razu, a z kart lustro, zawiasy, trumna i pozytywka. Nie ranią, ale strach to też Groza, a pełny fioletowy pasek wygania bohatera z lochu.',
      'Potwory, które straszą (z kart w sklepie): duch, cień i nietoperze.',
      'Wystraszony uciekinier daje Esencję, ale opowie następnej fali o pułapkach, które go zraniły albo przestraszyły. Nowe karty w sklepie grają strachem.'] },
    { name: 'Gildia i loch', news: [
      'Gildia czyta raporty z fal. Od fali 3 przysyła specjalistę na Twój styl: kapłana z amuletem na strach, wojownika z talizmanem na zabijanie, złodzieja na masę pułapek, maga na potwory, barda na błądzenie, barbarzyńcę na zastawione przejścia. Kogo i po co przysyła, zobaczysz przed falą.',
      'Zakładka Obiekty: skrzynia i budowle-kontry na specjalistów (Ołtarz, Runa, Wabik, Kwas, Kamień wyjec, Okowy, Zasłona, Bastion).',
      'Typy pokoi na końcu zakładki Loch: Mgła, Bagno, Grota, Krypta, Sezam, Sanktuarium, Zębatki, Głusza i Lodownia. Każdy zmienia zasady w jednym pokoju (przytrzymaj kafelek, żeby przeczytać).'] },
    { name: 'Pełna gra', news: [
      'Ciała i fobie: część bohaterów ma słabość albo odporność ciała i fobię, przez którą jedna rzecz straszy ich 2 razy mocniej. Karczma zdradza część z tego przed falą, resztę zobaczysz w lochu (stuknij bohatera).',
      'Powracający: uciekinier może wrócić po 2-3 falach, silniejszy, z blizną i z pamięcią Twojego lochu.',
      'Łowcy skarbów: przy dużej chciwości część drużyny to łowcy (sakiewka przy figurce), chciwsi od reszty.',
      'Wyłom: od fali 6 gildia może przebić tunel do głębszego pokoju. Załatasz go za Esencję albo zostawisz.'] }];
  const TRAPS = { spikes: 1, web: 1, trapdoor: 1, cage: 1, arrows: 1, fire: 1, portrait: 1, gate: 1, powder: 1, mimic: 1, eyes: 1, bones: 1, mirror: 1, creak: 1, coffin: 1, musicbox: 1 };
  const MONSTERS = { goblin: 1, archer: 1, spider: 1, ogre: 1, shaman: 1, ghost: 1, shade: 1, bats: 1 };
  // v15.1: traps that only scare (no wounds), the cursed ones a priest lifts (the thief and bombs leave them alone),
  // and monsters that float after the heroes (never block the way, never fight hand to hand)
  const SCARE = { portrait: 1, eyes: 1, bones: 1, mirror: 1, creak: 1, coffin: 1, musicbox: 1 };
  const CURSED = { portrait: 1, eyes: 1, bones: 1, mirror: 1 };
  const DRIFT = { ghost: 1, shade: 1, bats: 1 };
  const ROOMTYPES = { r_fog: 'fog', r_swamp: 'swamp', r_grotto: 'grotto', r_crypt: 'crypt', r_vault: 'vault', r_haven: 'haven', r_gears: 'gears', r_hush: 'hush', r_ice: 'ice' };
  const RT_INFO = { fog: { name: 'Mgła', item: 'r_fog', glyph: '≋', color: '#b9c4d8' }, swamp: { name: 'Bagno', item: 'r_swamp', glyph: '~', color: '#8fbf6a' }, grotto: { name: 'Grota', item: 'r_grotto', glyph: ')', color: '#9fb6ff' },
    crypt: { name: 'Krypta', item: 'r_crypt', glyph: '✝', color: '#c9b6e8' }, vault: { name: 'Sezam', item: 'r_vault', glyph: '◆', color: '#ffd27a' },
    haven: { name: 'Sanktuarium', item: 'r_haven', glyph: '✚', color: '#f3e2b0' }, gears: { name: 'Zębatki', item: 'r_gears', glyph: '⚙', color: '#d6a86a' },
    hush: { name: 'Głusza', item: 'r_hush', glyph: '◌', color: '#9aa6bb' }, ice: { name: 'Lodownia', item: 'r_ice', glyph: '❄', color: '#bfe6ff' } };
  const TOOLS = { dig: 1, tunnel: 1, expand: 1, demolish: 1, r_fog: 1, r_swamp: 1, r_grotto: 1, r_crypt: 1, r_vault: 1, r_haven: 1, r_gears: 1, r_hush: 1, r_ice: 1 };
  const MODES = { upgrade: 1, move: 1 };   // tray buttons that change what a tap on the map does (no cost of their own)
  const ACTIVE = Object.assign({}, TRAPS, MONSTERS);   // everything that can fire
  // Loot comes in kinds the player picks: coins (pure greed), a potion (a lure for the wounded), gear, a relic, a cursed treasure.
  // rarity = how far it can be seen from (1: the same room, 2: the next room, 3: across the dungeon).
  const LOOT_KIND = { loot: 'gold', lpotion: 'potion', loot2: 'gear', loot3: 'relic', lcursed: 'cursed' };
  // 1.12: how much one combo step adds to the power of a trap's wounds and scares (see fireRaw)
  const COMBO_POW = 0.12;
  // ...and the heroes get more HP to make up for it (author: longer raids, a reward for grouped traps rather than for more of
  // them): +20% from wave 5, half of it in wave 3 (a young dungeon has few traps to group). Replays of the author's two 1.11.1
  // runs (his own dungeons, waves 4-10, 4-5 tries a wave, so rough): the kill run's raids +6% and Esencja -8%, the fear
  // run's raids +33% and Esencja -14% (its scares lost more: +12% a combo step instead of +25%).
  const COMBO_HP = 0.2;
  const comboHp = n => 1 + COMBO_HP * Math.min(1, Math.max(0, n - 1) / 4);
  const LOOT_GREED = { gold: [0.08, 0.06], potion: [0.03, 0.02], gear: [0.15, 0.08], relic: [0.35, 0.15], cursed: [0.15, 0.08] };   // [seen, picked up]
  const isLoot = t => !!LOOT_KIND[t];
  const RARITY_NAME = ['', 'zwykły', 'rzadki', 'legendarny'];
  const RARITY_COLOR = ['#f2b94b', '#f2b94b', '#6fb7ff', '#ff8a3c'];
  const LOOT_COLOR = { loot: '#f2b94b', lpotion: '#8be38f', loot2: '#6fb7ff', loot3: '#ff8a3c', lcursed: '#b48cff' };
  const SIZE_BONUS = 0.05;   // Rozległość lochu: +0,05 greed for every room over 5 (v14: everything global is greed)
  const DISARMABLE = { spikes: 1, web: 1, trapdoor: 1, cage: 1, gate: 1, arrows: 1, fire: 1, powder: 1, decoy: 1, creak: 1, coffin: 1, musicbox: 1 };
  // Counter-buildings: placed between waves on a room floor, take a slot, one of each kind per room.
  const BUILDINGS = { rune: 1, altar: 1, decoy: 1, acid: 1, veil: 1, fortify: 1, howl: 1, shackles: 1 };
  const SMASHABLE_OBJ = { crate: 1, barrel: 1, shelf: 1 };   // 1.05: what a barbarian's axe goes through (wood; not the stone statues)
  const LOOKS_TRAP = t => !!TRAPS[t] || t === 'decoy';   // what the heroes take for a trap
  const SLOTTED = t => !!ACTIVE[t] || !!BUILDINGS[t];   // what counts towards a room's limit
  // Upgrades: level 2 costs 2x the base price, level 3 another 4x; the level multiplies the power, level 3 adds a trait.
  const UPG_COST = [0, 0, 2, 4], LVL_POW = [1, 1, 1.6, 2.4], LVL_MON = [1, 1, 1.5, 2.2];
  const TRAITS = {
    spikes: ['Krwawienie', 'trafiony krwawi przez 3 s'],
    web: ['Kwaśna sieć', 'bohater w tej sieci dostaje +60% obrażeń od pułapek zamiast +30%'],
    trapdoor: ['Bezdenny szyb', 'spadający wychodzi zgubiony i dużo bardziej przestraszony'],
    cage: ['Kolczasta klatka', 'uwięziony dostaje 2 razy więcej obrażeń i boi się 2 razy bardziej'],
    arrows: ['Przebijające groty', 'strzały przebijają tarczę wojownika i talizmany'],
    fire: ['Napalm', 'podpalenie trwa 6 s zamiast 3'],
    portrait: ['Całun grozy', 'portret straszy cały pokój'],
    gate: ['Żelazna krata', '+2 zamknięcia na falę'],
    powder: ['Ognisty proch', 'wybuch sięga o pole dalej i podpala'],
    mimic: ['Pożeracz', 'ugryziony traci jeden przedmiot'],
    goblin: ['Podcięcie', 'trafiony zwalnia na 1,5 s'],
    archer: ['Ogniste strzały', 'trafiony płonie'],
    ogre: ['Grzmot', 'każde uderzenie mocno straszy'],
    spider: ['Gniazdo', 'oplata siecią cały kwadrat 3×3'],
    shaman: ['Tarcza ducha', 'potwory w jego pokoju dostają 30% mniej obrażeń'],
    ghost: ['Wycie', 'straszy z dalszej odległości'],
    eyes: ['Wszystkowidzące', 'samotny albo zgubiony boi się 3 razy bardziej'],
    bones: ['Kostnica', 'grzechoczą w kwadracie 5×5'],
    mirror: ['Krzywe zwierciadło', 'lustro straszy cały pokój'],
    creak: ['Trzask', 'ten w drzwiach zwalnia na 2 s'],
    coffin: ['Pogrzebany żywcem', 'najbliższy boi się 1,5 raza bardziej i zwalnia na 3 s'],
    musicbox: ['Kołysanka śmierci', 'kołysanka trwa 8 s'],
    shade: ['Pożeracz światła', 'szept gubi samotnego bohatera'],
    bats: ['Chmara', 'rój sięga 3 pól i płoszy częściej']
  };
  // Hero personalities: about half of the heroes have one; it shows on their plate and changes how they decide.
  const HERO_TRAITS = {
    greedy: { name: ['chciwy', 'chciwa'], w: 1 },
    coward: { name: ['tchórzliwy', 'tchórzliwa'], w: 1 },
    brave: { name: ['bohaterski', 'bohaterska'], w: 1 },
    careful: { name: ['ostrożny', 'ostrożna'], w: 1 }
  };
  let ARM_TIME = 2;   // a trap built during a wave needs a moment to arm
  // v14: damage types. Every hit is piercing, blunt, fire or poison; heroes take more or less by class, body and scars.
  const DMG_TYPES = { pierce: 'kłute', blunt: 'obuchowe', fire: 'ogień', poison: 'trucizna' };
  const DMG_OF = { spikes: 'pierce', arrows: 'pierce', archer: 'pierce', goblin: 'pierce', mimic: 'pierce', gate: 'blunt', ogre: 'blunt', trapdoor: 'blunt',
    fire: 'fire', powder: 'fire', spider: 'poison', shaman: 'poison', loot: 'poison', bats: 'pierce' };
  const CLASS_RES = { warrior: { pierce: 0.75, blunt: 1.25 }, thief: { fire: 1.25, poison: 0.75 }, priest: { pierce: 1.1, fire: 0.85, poison: 0.85 }, mage: { pierce: 1.25, blunt: 1.1, fire: 0.7 },
    bard: { blunt: 1.2, poison: 1.1 }, barbarian: { blunt: 0.8, fire: 1.2, poison: 1.1 } };
  const CLASS_RES_TEXT = { warrior: 'płyty: kłute -25%, obuchowe +25%', thief: 'skóra: ogień +25%, trucizna -25% (odtrutki)', priest: 'szaty i modlitwa: kłute +10%, ogień -15%, trucizna -15%', mage: 'szata i bariera: kłute +25%, obuchowe +10%, ogień -30%',
    bard: 'lekki strój: obuchowe +20%, trucizna +10%', barbarian: 'futra i krzepa: obuchowe -20%, ogień +20%, trucizna +10%' };
  // 1.05: what each class does, in a few words (the list of the next party, the hero card)
  const CLASS_SKILL = { warrior: 'tarcza, walczy z potworami', thief: 'wykrywa i rozbraja pułapki', priest: 'leczy, osłania, odczynia', mage: 'kula ognia, zakłóca pułapki',
    bard: 'pieśń krzepi, woła zgubionych', barbarian: 'furia, rozbija skrzynie i budowle' };
  // 1.05: class icons (24x24, drawn on the map and in the lists): sword, dagger, cross, wand, lute, axe; the bag marks a treasure hunter
  const CLASS_ICON = {
    warrior: { rot: 0, d: 'M11 1.5h2l1.2 2.3V14h-4.4V3.8z M6.5 14h11v2.3h-11z M10.9 16.3h2.2v4h-2.2z M12 19.6a1.7 1.7 0 1 1-0.01 0z' },
    thief: { rot: 45, d: 'M12 3l2 3.4V14h-4V6.4z M7.6 14h8.8v2.1H7.6z M11 16.1h2v3.6h-2z M12 19.2a1.5 1.5 0 1 1-0.01 0z' },
    priest: { rot: 0, d: 'M10 1.5h4v6h6.5v4H14V22.5h-4V11.5H3.5v-4H10z' },
    mage: { rot: 0, d: 'M3.2 19.4l10.6-10.6 1.8 1.8L5 21.2z M17.5 1.5l1.3 3 3.2 1.2-3.2 1.3-1.3 3-1.3-3-3.2-1.3 3.2-1.2z' },
    bard: { rot: 0, d: 'M8.5 9a6.2 6.2 0 1 1-0.01 0z M8.5 13.6a1.6 1.6 0 1 0 0.01 0z M11.6 10.6l6.6-6.6 1.6 1.6-6.6 6.6z M17.4 3.2l2.2-1.7 2.9 2.9-1.7 2.2z' },
    barbarian: { rot: 0, d: 'M12 2h2.2v20.5H12z M12 4.6L5.4 2.2C2.6 6.2 2.6 11.6 5.4 15.6L12 12.6z M14.2 6.2h2.8v4.4h-2.8z' },
    bag: { rot: 0, d: 'M8.8 6.6h6.4l-1.1-3.6H9.9z M5 15.2c0-4.9 3.3-7.6 7-7.6s7 2.7 7 7.6c0 4.2-3 6.3-7 6.3s-7-2.1-7-6.3z' }
  };

  // body: a weakness or a toughness (some heroes have one; a scar from your dungeon gives one too)
  const PHYS = {
    thickskin: { name: ['gruboskóry', 'gruboskóra'], res: { pierce: 0.7 }, text: 'kłute -30%' },
    pierced: { name: ['dawne rany kłute', 'dawne rany kłute'], res: { pierce: 1.35 }, text: 'kłute +35%' },
    sturdy: { name: ['krzepki', 'krzepka'], res: { blunt: 0.75 }, text: 'obuchowe -25%' },
    brittle: { name: ['kruche kości', 'kruche kości'], res: { blunt: 1.4 }, text: 'obuchowe +40%' },
    fireproof: { name: ['hartowany ogniem', 'hartowana ogniem'], res: { fire: 0.6 }, text: 'ogień -40%' },
    burned: { name: ['dawne oparzenia', 'dawne oparzenia'], res: { fire: 1.4 }, text: 'ogień +40%' },
    venomproof: { name: ['odporny na jady', 'odporna na jady'], res: { poison: 0.6 }, text: 'trucizna -40%' },
    allergic: { name: ['wrażliwy na jady', 'wrażliwa na jady'], res: { poison: 1.4 }, text: 'trucizna +40%' }
  };
  const SCAR_RES = { pierce: 'thickskin', blunt: 'sturdy', fire: 'fireproof', poison: 'venomproof' };   // what a survivor learns from the wound that nearly killed him
  // phobias: fear from these things counts twice; seeing them for the first time hurts (15% of courage)
  const PHOBIAS = {
    fire: { name: 'ogień', attrs: ['fire', 'powder'], types: ['fire'], sees: ['fire', 'powder'] },
    spiders: { name: 'pająki', attrs: ['spider', 'web'], sees: ['spider', 'web'] },
    closed: { name: 'ciasnota', attrs: ['cage', 'trapdoor', 'gate', 'creak', 'coffin'], sees: ['cage', 'gate', 'creak', 'coffin'] },
    ghosts: { name: 'duchy', attrs: ['ghost', 'portrait', 'eyes', 'mirror'], sees: ['ghost', 'portrait', 'eyes', 'mirror'] },
    blood: { name: 'krew i kości', srcs: ['death'], attrs: ['bones'], sees: ['bones'] },
    dark: { name: 'ciemność', dark: true, attrs: ['shade', 'bats'], sees: ['shade', 'bats'] }
  };
  const PHOBIA_OF_ATTR = {};
  Object.keys(PHOBIAS).forEach(k => (PHOBIAS[k].attrs || []).forEach(a => { PHOBIA_OF_ATTR[a] = k; }));

  // Heroes: four classes, each wave brings new people with names, and ranks that decide how much they know and how well they think.
  const HEROES = {
    warrior: { name: ['Wojownik', 'Wojowniczka'], hp: 120, speed: 1.5, dps: 18, color: '#6f9cff', letter: 'W', greed: 0.6 },
    thief: { name: ['Złodziej', 'Złodziejka'], hp: 70, speed: 1.9, dps: 10, color: '#6fd64f', letter: 'Z', greed: 1.5 },
    priest: { name: ['Kapłan', 'Kapłanka'], hp: 80, speed: 1.3, dps: 6, color: '#ffd23f', letter: 'K', greed: 0.9 },
    mage: { name: ['Mag', 'Czarodziejka'], hp: 65, speed: 1.3, dps: 8, color: '#b76dff', letter: 'M', greed: 1.0 },
    bard: { name: ['Bard', 'Bardka'], hp: 75, speed: 1.4, dps: 7, color: '#2fd3c4', letter: 'B', greed: 1.2 },   // 1.05
    barbarian: { name: ['Barbarzyńca', 'Barbarzynka'], hp: 135, speed: 1.45, dps: 20, color: '#ff7a33', letter: 'R', greed: 0.7 }   // 1.05
  };
  // 1.05: six classes and never two of one class in a party (the first waves bring the four classic ones)
  const PARTY = ['warrior', 'thief', 'priest', 'mage', 'bard', 'barbarian'];
  const CLASSIC = ['warrior', 'thief', 'priest', 'mage'];
  const LEADER_ORDER = ['warrior', 'barbarian', 'priest', 'bard', 'mage', 'thief'];
  // [mianownik, biernik, wołacz]
  const NAMES_M = [['Borys', 'Borysa', 'Borysie'], ['Wit', 'Wita', 'Wicie'], ['Radek', 'Radka', 'Radku'], ['Zbych', 'Zbycha', 'Zbychu'], ['Mirek', 'Mirka', 'Mirku'],
    ['Bogdan', 'Bogdana', 'Bogdanie'], ['Lech', 'Lecha', 'Lechu'], ['Gniewko', 'Gniewka', 'Gniewku'], ['Lis', 'Lisa', 'Lisie'], ['Jarek', 'Jarka', 'Jarku'],
    ['Staszek', 'Staszka', 'Staszku'], ['Wojtek', 'Wojtka', 'Wojtku'], ['Bolko', 'Bolka', 'Bolku'], ['Ziemowit', 'Ziemowita', 'Ziemowicie'], ['Mieszko', 'Mieszka', 'Mieszku'], ['Ratibor', 'Ratibora', 'Ratiborze']];
  const NAMES_F = [['Ilsa', 'Ilsę', 'Ilso'], ['Wanda', 'Wandę', 'Wando'], ['Jaga', 'Jagę', 'Jago'], ['Mira', 'Mirę', 'Miro'], ['Dobrawa', 'Dobrawę', 'Dobrawo'],
    ['Zofia', 'Zofię', 'Zofio'], ['Hela', 'Helę', 'Helu'], ['Bogna', 'Bognę', 'Bogno'], ['Ewa', 'Ewę', 'Ewo'], ['Marta', 'Martę', 'Marto'],
    ['Jadwiga', 'Jadwigę', 'Jadwigo'], ['Rogneda', 'Rognedę', 'Rognedo'], ['Grzymisława', 'Grzymisławę', 'Grzymisławo']];
  // Levels: no ceiling. Each wave the guild sends people a bit better than the last; Infamy (your kills) makes them better faster.
  // Everything grows with the level: HP, courage, damage, speed, how well they read the dungeon, and the kit they carry.
  // The old ranks remain as behaviour tiers (0 rookie, 1 veteran, 2 elite, 3 master and above) for the decisions that are yes/no.
  const TIERS = [
    { min: 1, name: ['Nowicjusz', 'Nowicjuszka'], color: '#9be37a' },
    { min: 3, name: ['Weteran', 'Weteranka'], color: '#6fb7ff' },
    { min: 6, name: ['Elita', 'Elita'], color: '#c39bff' },
    { min: 10, name: ['Mistrz', 'Mistrzyni'], color: '#ff8a3c' },
    { min: 15, name: ['Legenda', 'Legenda'], color: '#ff5a6a' },
    { min: 20, name: ['Mit', 'Mit'], color: '#ffe066' }
  ];
  const BOSS_NAME = { champion: ['Czempion', 'Czempionka'], final: ['Bohater z przepowiedni', 'Bohaterka z przepowiedni'] };
  const tierOf = L => L <= 2 ? 0 : L <= 5 ? 1 : L <= 9 ? 2 : 3;
  // avoid = how hard they steer around known danger, learn = chance to remember a trap that went off in front of them,
  // rumor = how much tavern talk they take in, risk = danger accepted for loot (higher = more reckless), panic = how badly a death shakes them.
  function levelStats(L) {
    const k = L - 1, t = TIERS.filter(x => L >= x.min).pop();
    return { lvl: L, name: t.name, color: t.color, hp: 0.85 * Math.pow(1.13, k), courage: 60 * Math.pow(1.175, k), dps: 0.9 * Math.pow(1.08, k), pow: Math.pow(1.08, k),
      speed: 1 + 0.02 * k, avoid: 0.35 + 0.16 * k, learn: 1 - 0.5 * Math.pow(0.7, k), detect: L >= 6 ? 1 + Math.floor((L - 6) / 4) : 0,
      disarm: 1.7 * Math.pow(0.88, k), fail: 0.35 * Math.pow(0.5, k), rumor: Math.min(1, 0.4 + 0.15 * k), risk: 2.2 * Math.pow(0.82, k),
      panic: 1.5 * Math.pow(0.86, k), potion: Math.min(0.5, 0.15 + 0.03 * k), coord: L >= 3, caution: L >= 6,
      dodge: 1 - 0.75 * Math.pow(0.95, k), shield: 0.5 * Math.pow(0.94, k), shieldCd: Math.max(2, 6 - 0.3 * k), calm: 2 + 0.4 * L,
      sapper: L >= 7 ? Math.min(1, 0.08 * (L - 6)) : 0, sight: L >= 8 };   // sapper = chance that a disarm takes the trap apart for good
  }
  // The kit grows with the level: more pieces and better ones (power r has no ceiling either).
  const KIT = { warrior: { potion: 3, charm: 3, bomb: 2, amulet: 1 }, thief: { boots: 3, amulet: 2, potion: 2, bomb: 1 }, priest: { potion: 3, amulet: 3, charm: 2 }, mage: { bomb: 3, potion: 2, amulet: 2, charm: 1 },
    bard: { potion: 2, amulet: 3, boots: 2 }, barbarian: { potion: 3, bomb: 2, charm: 1 } };
  function makeKit(type, L) {
    const n = L <= 2 ? (Math.random() < 0.3 ? 1 : 0) : Math.floor((L + 1) / 3), r = 1 + Math.floor((L - 1) / 4), w = KIT[type], out = [];
    const tot = Object.values(w).reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      let x = Math.random() * tot, t = 'potion';
      for (const kk in w) { x -= w[kk]; if (x <= 0) { t = kk; break; } }
      const same = out.find(o => o.type === t);
      if (same && (t === 'charm' || t === 'amulet' || t === 'boots')) { same.charges++; continue; }   // one power of a kind: a second roll is one more use
      out.push({ type: t, r, kit: true, charges: powerCharges(t, r) });
    }
    return out;
  }
  const rarColor = r => r >= 5 ? '#ffe066' : r >= 4 ? '#ff5a6a' : RARITY_COLOR[Math.max(1, r)];
  // What heroes carry: their kit (from the level) plus whatever loot they pick up (at the loot's rarity).
  // potion and bomb are used up; talisman, amulet and boots are powers with a cooldown the hero decides when to use;
  // a weapon (against monsters) and armour (against traps) just work. One of each power, weapon and armour is enough: a better one replaces the old.
  const HITEMS = {
    potion: { name: 'mikstura', acc: 'miksturę', g: 'f', w: 30, use: 'once' },
    charm: { name: 'talizman', acc: 'talizman', g: 'm', w: 22, use: 'power', cd: 20 },
    amulet: { name: 'amulet', acc: 'amulet', g: 'm', w: 16, use: 'power', cd: 30 },
    boots: { name: 'buty', acc: 'buty', g: 'pl', w: 14, use: 'power', cd: 15 },
    bomb: { name: 'bomba', acc: 'bombę', g: 'f', w: 18, use: 'once' },
    weapon: { name: 'broń', acc: 'broń', g: 'f', w: 14, use: 'gear', loot: true },
    armor: { name: 'zbroja', acc: 'zbroję', g: 'f', w: 14, use: 'gear', loot: true }
  };
  const GEAR_POOL = ['charm', 'amulet', 'boots', 'bomb', 'weapon', 'armor'];
  // Powers have a few uses per wave (better ones more) and a cooldown between them: the hero has to pick his moments.
  function powerCharges(t, r) { return t === 'boots' ? 2 + Math.floor(r / 3) : (t === 'charm' || t === 'amulet') ? 1 + Math.floor(r / 3) : undefined; }
  const ITEM_COLOR = { potion: '#8be38f', charm: '#7fb8ff', amulet: '#c3b2ff', boots: '#e8c27a', bomb: '#ff9a3c', weapon: '#d9dbe6', armor: '#9aa3b8' };
  // Polish needs the adjective to agree with the item: rzadki talizman, rzadka mikstura, rzadkie buty (and "mam rzadką miksturę").
  const ADJ = { m: ['', 'zwykły', 'rzadki', 'legendarny'], f: ['', 'zwykła', 'rzadka', 'legendarna'], pl: ['', 'zwykłe', 'rzadkie', 'legendarne'], fAcc: ['', 'zwykłą', 'rzadką', 'legendarną'] };
  const adj = (g, r) => ADJ[g][Math.min(3, Math.max(1, r))];
  const G3 = (g, m, f, pl) => g === 'f' ? f : g === 'pl' ? pl : m;
  // Cards. "card" = lives in the deck (7 slots; a second copy takes another slot and stacks), "unlock" = a new trap or monster
  // for good (no slot), "instant" = happens once (no slot). Rarity: c common, r rare, l legendary.
  // Every card's apply() is re-run on fresh mods whenever the deck changes, so a card sold is a card gone.
  const UPGRADES = [
    { id: 'u-web', kind: 'unlock', rar: 'c', unlock: 'web', name: 'Nowa pułapka: Sieć', text: 'Na podłogę. Spowalnia w kwadracie 3×3, bohater w sieci dostaje +30% obrażeń.' },
    { id: 'u-fire', kind: 'unlock', rar: 'c', unlock: 'fire', name: 'Nowa pułapka: Ogień', text: 'Na ścianę. Płomień 2×3 pola i podpalenie.' },
    { id: 'u-mimic', kind: 'unlock', rar: 'c', unlock: 'mimic', name: 'Nowa pułapka: Mimik', text: 'Na obiekt. Mebel gryzie wszystkich dookoła.' },
    { id: 'u-cage', kind: 'unlock', rar: 'c', unlock: 'cage', name: 'Nowa pułapka: Klatka', text: 'Na podłogę. Więzi bohatera; jeśli drużyna go nie uwolni, umiera w klatce.' },
    { id: 'u-portrait', kind: 'unlock', rar: 'c', unlock: 'portrait', name: 'Nowa pułapka: Portret', text: 'Na ścianę. Nie rani, tylko straszy cały kawałek pokoju.' },
    { id: 'u-spider', kind: 'unlock', rar: 'c', unlock: 'spider', name: 'Nowy potwór: Pająk', text: 'Blokuje przejście, gryzie i oplata siecią.' },
    { id: 'u-ogre', kind: 'unlock', rar: 'c', unlock: 'ogre', name: 'Nowy potwór: Ogr', text: 'Dużo życia, bije wszystkich, którzy z nim walczą.' },
    { id: 'u-shaman', kind: 'unlock', rar: 'c', unlock: 'shaman', name: 'Nowy potwór: Szaman', text: 'Leczy potwory dookoła, w skill checku cały pokój.' },
    { id: 'u-ghost', kind: 'unlock', rar: 'c', unlock: 'ghost', name: 'Nowy potwór: Duch', text: 'Krąży przy bohaterach i ich straszy. Tkną go tylko kapłan i mag.' },
    { id: 'u-mirror', kind: 'unlock', rar: 'c', unlock: 'mirror', name: 'Nowa pułapka: Lustro', text: 'Na ścianę. Straszy tym mocniej, im bardziej bohater już się boi.' },
    { id: 'u-creak', kind: 'unlock', rar: 'c', unlock: 'creak', name: 'Nowa pułapka: Zawiasy', text: 'Na drzwi. Skrzypią i mocno straszą każdego w progu.' },
    { id: 'u-coffin', kind: 'unlock', rar: 'c', unlock: 'coffin', name: 'Nowa pułapka: Trumna', text: 'Na podłogę. Bardzo mocno straszy najbliższego bohatera, w Krypcie jeszcze mocniej.' },
    { id: 'u-musicbox', kind: 'unlock', rar: 'c', unlock: 'musicbox', name: 'Nowa pułapka: Pozytywka', text: 'Na obiekt. Kołysanka straszy cały pokój przez kilka sekund.' },
    { id: 'u-shade', kind: 'unlock', rar: 'c', unlock: 'shade', name: 'Nowy potwór: Cień', text: 'Sunie za samotnym bohaterem i szepcze. Rani go tylko kapłan.' },
    { id: 'u-bats', kind: 'unlock', rar: 'c', unlock: 'bats', name: 'Nowy potwór: Nietoperze', text: 'Szybki rój: gryzie, straszy i płoszy bohaterów.' },
    // instants
    { id: 'crystal', kind: 'instant', rar: 'r', name: 'Żarłoczne serce', text: 'Od razu: serce dostaje dodatkowy kryształ (także maksymalnie, do końca runu).', apply: () => { run.crystals += 1; run.maxCrystals += 1; } },
    { id: 'infusion', kind: 'instant', rar: 'c', name: 'Zastrzyk Esencji', text: 'Od razu: +20 Esencji, nawet ponad pojemność.', apply: () => { fl.essence += 20; run.essence = fl.essence; } },
    { id: 'gift', kind: 'instant', rar: 'r', name: 'Hojny kupiec', text: 'Od razu: 2 darmowe karty do wybrania w sklepie.', apply: () => { run.freePicks = (run.freePicks || 0) + 2; } },
    { id: 'pact', kind: 'instant', rar: 'l', name: 'Pakt', text: 'Do końca runu +1 miejsce w talii, ale serce traci 1 kryształ (także maksymalnie, zawsze zostaje co najmniej 1).', apply: () => { run.deckSize += 1; run.maxCrystals = Math.max(1, run.maxCrystals - 1); run.crystals = Math.max(1, Math.min(run.crystals - 1, run.maxCrystals)); } },
    // cards: traps and monsters
    { id: 'spikes', kind: 'card', rar: 'c', tag: 'kolce ×1,5', name: 'Ostrzejsze kolce', text: 'Kolce zadają +50% obrażeń.', apply: m => { m.spikeDmg *= 1.5; } },
    { id: 'cooldown', kind: 'card', rar: 'c', tag: 'odnowa -25%', name: 'Szybkie przeładowanie', text: 'Odnowienie wszystkich pułapek krótsze o 25%.', apply: m => { m.cooldown *= 0.75; } },
    { id: 'walls', kind: 'card', rar: 'c', tag: 'ściany -20%', name: 'Głodne ściany', text: 'Strzały, ogień i portrety przeładowują się o 20% szybciej.', apply: m => { m.wallCd *= 0.8; } },
    { id: 'powder', kind: 'card', rar: 'c', tag: 'proch +1', name: 'Więcej prochu', text: 'Wybuch prochu sięga o 1 pole dalej.', apply: m => { m.powderR += 1; } },
    { id: 'arrows', kind: 'card', rar: 'r', unique: true, tag: 'podpalenie', name: 'Płonące groty', text: 'Strzały podpalają trafionych.', apply: m => { m.arrowBurn = true; } },
    { id: 'gate', kind: 'card', rar: 'c', tag: 'krata', name: 'Ciężka krata', text: 'Każda krata wytrzymuje 2 zamknięcia więcej i miażdży o 50% mocniej.', apply: m => { m.gateUses += 2; m.gateCrush *= 1.5; } },
    { id: 'web', kind: 'card', rar: 'c', req: 'web', tag: 'sieć ×2', name: 'Lepka sieć', text: 'Sieć trzyma 2 razy dłużej.', apply: m => { m.webDur *= 2; } },
    { id: 'fire', kind: 'card', rar: 'c', req: 'fire', tag: 'ogień ×1,5', name: 'Smocza smoła', text: 'Ogień zadaje +50% obrażeń.', apply: m => { m.fireDmg *= 1.5; } },
    { id: 'mimic', kind: 'card', rar: 'c', req: 'mimic', tag: 'mimik ×1,5', name: 'Wygłodniały mimik', text: 'Mimik gryzie o 50% mocniej.', apply: m => { m.mimicDmg *= 1.5; } },
    { id: 'trapdoor', kind: 'card', rar: 'c', tag: 'zapadnia', name: 'Głęboka zapadnia', text: 'Spadający bohater leci dłużej (+4 s) i obija się o 50% mocniej.', apply: m => { m.fallTime += 4; m.fallDmg *= 1.5; } },
    { id: 'cage', kind: 'card', rar: 'c', req: 'cage', tag: 'klatka ×2', name: 'Żelazne klatki', text: 'Klatka trzyma 2 razy dłużej (drużyna ma więcej czasu na ratunek), a uwięziony boi się o 50% bardziej.', apply: m => { m.cageTime *= 2; m.cageFear *= 1.5; } },
    { id: 'portrait', kind: 'card', rar: 'c', req: 'portrait', tag: 'portret +', name: 'Galeria grozy', text: 'Portret sięga o 2 pola dalej i straszy o 30% mocniej.', apply: m => { m.portraitR += 2; m.portraitFear *= 1.3; } },
    { id: 'spider', kind: 'card', rar: 'r', req: 'spider', unique: true, tag: 'gniazdo', name: 'Pajęcze gniazdo', text: 'Ugryzienie pająka oplata siecią cały kwadrat 3×3.', apply: m => { m.spiderNest = true; } },
    { id: 'ghost', kind: 'card', rar: 'r', req: 'ghost', unique: true, tag: 'zimny dotyk', name: 'Zimny dotyk', text: 'Duch straszy o 50% mocniej, a zranić go może już tylko kapłan.', apply: m => { m.ghostAura *= 1.5; m.ghostPriestOnly = true; } },
    { id: 'monster', kind: 'card', rar: 'c', tag: 'weterani', name: 'Weterani', text: 'Nowo postawione potwory mają +40% HP i biją o 40% mocniej.', apply: m => { m.monster *= 1.4; } },
    { id: 'loottrap', kind: 'card', rar: 'c', tag: 'zatruty łup', name: 'Zatruty łup', text: 'Podniesienie łupu zadaje obrażenia (więcej przy rzadszym).', apply: m => { m.lootTrap += 15; } },
    { id: 'disarm', kind: 'card', rar: 'c', tag: 'zamki ×2', name: 'Zardzewiałe zamki', text: 'Złodziej rozbraja 2 razy wolniej (masz więcej czasu, żeby go przyłapać).', apply: m => { m.disarm *= 2; } },
    { id: 'suicide', kind: 'card', rar: 'c', tag: 'zemsta 30%', name: 'Mechanizm samobójczy', text: 'Rozbrajana pułapka ma 30% szans, że odpali w twarz rozbrajającemu.', apply: m => { m.suicideMech += 0.3; } },
    // cards: economy
    { id: 'essence', kind: 'card', rar: 'c', tag: 'Esencja +30%', name: 'Żyła esencji', text: 'Esencja z Grozy +30% (Groza × Chciwość × Combo × 1,3).', apply: m => { m.regen *= 1.3; } },
    { id: 'income', kind: 'card', rar: 'c', tag: '+4 po fali', name: 'Mroczny dochód', text: '+4 Esencji po każdej fali.', apply: m => { m.income += 4; } },
    { id: 'usurer', kind: 'card', rar: 'c', tag: 'odsetki', name: 'Lichwiarz', text: 'Po fali dostajesz 15% niewydanej Esencji (najwyżej 12).', apply: m => { m.usurer += 0.15; } },
    { id: 'dig', kind: 'card', rar: 'c', tag: 'kopanie -2', name: 'Kopacze', text: 'Pokój i przejście kosztują o 2 Esencji mniej.', apply: m => { m.digDiscount += 2; } },
    { id: 'mole', kind: 'card', rar: 'c', tag: 'pokój za 0', name: 'Kret', text: 'Co drugą falę jedno kopanie pokoju za darmo.', apply: m => { m.mole += 1; } },
    { id: 'harvest', kind: 'card', rar: 'c', tag: 'żniwa +2', name: 'Żniwa strachu', text: 'Każdy bohater, który ucieknie ze strachu, daje dodatkowo 2 Esencji (bez mnożników).', apply: m => { m.fearHarvest += 2; } },
    { id: 'soul', kind: 'card', rar: 'r', tag: 'śmierć ×2', name: 'Żniwiarz', text: 'Śmierć bohatera daje 2 razy więcej Grozy.', apply: m => { m.soulMult *= 2; } },
    // cards: points and greed
    { id: 'greed', kind: 'card', rar: 'c', tag: 'chciwość ×1,5', name: 'Złote runo', text: 'Zobaczony łup podbija chciwość o połowę mocniej.', apply: m => { m.greedMult *= 1.5; } },
    { id: 'fever', kind: 'card', rar: 'c', tag: 'gorączka', name: 'Gorączka złota', text: 'Każda fala zaczyna z chciwością wyższą o 0,3.', apply: m => { m.greedStart += 0.3; } },
    { id: 'depth', kind: 'card', rar: 'c', tag: 'głębia +0,5', name: 'Głębia mroku', text: 'Mnożnik pokoju z sercem i pokoi tuż przed nim +0,5.', apply: m => { m.depthBonus += 0.5; } },
    { id: 'infamous', kind: 'card', rar: 'c', tag: '+0,15 chciwości/kryształ', name: 'Zła sława', text: 'Każdy kryształ w sercu daje +0,15 chciwości (liczone na starcie fali).', apply: m => { m.crystalPts += 0.15; } },
    { id: 'collector', kind: 'card', rar: 'r', tag: '+0,05 chciwości/rodzaj', name: 'Kolekcjoner', text: '+0,05 chciwości za każdy inny rodzaj pułapki lub potwora w lochu (na starcie fali).', apply: m => { m.collector += 0.05; } },
    { id: 'miser', kind: 'card', rar: 'r', tag: 'minimalizm', name: 'Skąpiec', text: '+0,05 chciwości za każdy element mniej niż 15 w lochu (pułapki i potwory, na starcie fali).', apply: m => { m.miser += 0.05; } },
    { id: 'lonely', kind: 'card', rar: 'r', tag: 'samotność ×2', name: 'Echo samotności', text: 'Samotność bohatera daje 2 razy więcej Grozy.', apply: m => { m.loneMult *= 2; } },
    { id: 'maze', kind: 'card', rar: 'r', tag: 'zgubieni ×2', name: 'Kręte korytarze', text: 'Zgubiony bohater daje 2 razy więcej Grozy.', apply: m => { m.lostMult *= 2; } },
    // cards: fear
    { id: 'haunt', kind: 'card', rar: 'c', tag: 'strach +25%', name: 'Nawiedzenie', text: 'Każdy strach jest o 25% silniejszy (więcej Grozy, szybsze ucieczki).', apply: m => { m.fearMult *= 1.25; } },
    { id: 'echo', kind: 'card', rar: 'r', tag: 'ucieczka ×2', name: 'Echo krzyku', text: 'Bohater, który ucieknie ze strachu, daje 2 razy więcej Grozy.', apply: m => { m.scareMult *= 2; } },
    { id: 'panic', kind: 'card', rar: 'r', tag: 'panika', name: 'Panika', text: 'Bohater, który zaczyna uciekać, straszy wszystkich w promieniu 3 pól (25 strachu).', apply: m => { m.panic += 1; } },
    { id: 'hgallery', kind: 'card', rar: 'r', req: 'ghost', tag: 'galeria ×2', name: 'Nawiedzona galeria', text: 'Duch w pokoju z portretem straszy 2 razy mocniej.', apply: m => { m.hauntedGallery += 1; } },
    { id: 'curse', kind: 'card', rar: 'r', tag: 'klątwa', name: 'Klątwa kryształu', text: 'Niosący kryształ idzie o 35% wolniej i boi się coraz bardziej.', apply: m => { m.carrierSlow *= 0.65; m.carrierFear += 4; } },
    { id: 'deaf', kind: 'card', rar: 'r', tag: 'plotki /2', name: 'Głuche ściany', text: 'Uciekinierzy pamiętają tylko połowę tego, co widzieli.', apply: m => { m.rumorKeep *= 0.5; } },
    { id: 'trails', kind: 'card', rar: 'r', unique: true, tag: 'fałszywki', name: 'Fałszywe tropy', text: 'Uciekinierzy opowiadają też o pułapkach, których nie ma. Następna fala omija puste miejsca.', apply: m => { m.falseTrails = true; } },
    { id: 'cursed', kind: 'card', rar: 'r', tag: 'sprzęt /2', name: 'Rdza', text: 'Przedmioty bohaterów (także z ich wyposażenia) działają o połowę słabiej.', apply: m => { m.itemPower *= 0.5; } },
    // cards: synergies, chains, odd ones
    { id: 'sticky', kind: 'card', rar: 'r', req: () => run.unlocked.has('web') || run.unlocked.has('spider'), tag: 'kolce+sieć', name: 'Lepkie kolce', text: 'Kolce zadają 2 razy więcej bohaterom oplątanym siecią lub pajęczyną.', apply: m => { m.stickySpikes += 1; } },
    { id: 'wildfire', kind: 'card', rar: 'r', req: 'fire', tag: 'pożoga', name: 'Pożoga', text: 'Podpalenie przeskakuje na bohaterów w promieniu 1,5 pola (każda kolejna kopia +0,5 pola).', apply: m => { m.wildfire += 1; } },
    { id: 'blood', kind: 'card', rar: 'r', tag: 'krew = moc', name: 'Krwawy rytuał', text: 'Każde zabójstwo w tej fali wzmacnia pułapki o 10% (obrażenia, strach, czas działania) do końca fali.', apply: m => { m.bloodRite += 0.1; } },
    { id: 'calm', kind: 'card', rar: 'r', tag: 'cisza ×2,5', name: 'Cisza przed burzą', text: 'Pułapka, która nie odpaliła od 20 s (albo jeszcze wcale w tej fali), działa 2,5 raza mocniej (kolejna kopia: 4 razy, 5,5 raza...).', apply: m => { m.calmStorm += 1.5; } },
    { id: 'well', kind: 'card', rar: 'r', unique: true, tag: 'studnia', name: 'Bezdenna studnia', text: 'Bohater z kryształem, który spadnie w zapadnię, gubi go w ciemności: kryształ wraca do serca.', apply: m => { m.bottomless = true; } },
    { id: 'echofire', kind: 'card', rar: 'r', tag: 'echo ×2', name: 'Echo mechanizmów', text: 'Co 5. odpalenie pułapki odpala ją drugi raz (kolejna kopia: co 4., co 3...).', apply: m => { m.echoFire += 1; } },
    { id: 'glass', kind: 'card', rar: 'l', tag: 'chciwość +1', name: 'Szklane serce', text: 'Chciwość +1, ale bohaterowie wyważają kryształ 2 razy szybciej.', apply: m => { m.glass += 1; } },
    { id: 'nopick', kind: 'card', rar: 'l', unique: true, tag: 'zabrany łup ×3', name: 'Odwrotna chciwość', text: 'Bohaterowie zabierają łup jak zwykle, ale zabrany łup podbija chciwość 3 razy mocniej. Opłaca się dać im coś ukraść.', apply: m => { m.pickGreed *= 3; } },   // 1.03 (author: loot is fun because they can take it; up to 1.02 they never took it and seen loot was x2,5)
    { id: 'gambler', kind: 'card', rar: 'l', tag: 'krytyk ×2,4', name: 'Hazardzista', text: 'Krytyk w skill checku uderza ×1,35 mocniej (×2,4 zamiast ×1,8), ale draśnięcie tylko ×0,4 zamiast ×0,7.', apply: m => { m.critPw *= 1.35; m.okPw *= 0.57; } },
    { id: 'choir', kind: 'card', rar: 'l', req: 'portrait', tag: 'chór', name: 'Chór potępionych', text: 'Odpalony portret odpala też wszystkie gotowe portrety w tym samym pokoju (z 60% mocy, każda kolejna kopia +40%).', apply: m => { m.choir += 1; } },
    // cards that grow during the run (they count only while the card is in the deck; selling the last copy resets the count)
    { id: 'hunger', kind: 'card', rar: 'r', tag: 'rośnie', grows: true, name: 'Głodne kolce', text: 'Kolce zadają do końca runu +4% obrażeń za każde zabójstwo kolcami (licznik rośnie przez cały run).', apply: m => { m.hunger += 1; } },
    { id: 'chronicle', kind: 'card', rar: 'r', tag: 'rośnie', grows: true, name: 'Kronika grozy', text: 'Strach jest o 3% silniejszy za każdego bohatera, który w tym runie uciekł ze strachu (do końca runu).', apply: m => { m.chronicle += 1; } },
    { id: 'granary', kind: 'card', rar: 'c', tag: 'rośnie', grows: true, name: 'Spichlerz dusz', text: 'Każdy zabity bohater zmniejsza głód serca o 1 do końca runu.', apply: m => { m.granary += 1; } },
    { id: 'bank', kind: 'card', rar: 'c', tag: 'rośnie', grows: true, name: 'Skarbiec', text: 'Każda fala bez utraty kryształu dodaje +2 Esencji do przychodu po każdej kolejnej fali (do końca runu).', apply: m => { m.bank += 1; } },
    { id: 'tempered', kind: 'card', rar: 'r', tag: 'rośnie', grows: true, name: 'Zaprawione mechanizmy', text: 'Pułapki działają o 1% mocniej za każde 4 trafienia pułapek w tym runie (do końca runu).', apply: m => { m.tempered += 1; } },
    // cards with a price
    { id: 'bloodpact', kind: 'card', rar: 'l', tag: 'moc ×1,6, cena', name: 'Krwawa umowa', text: 'Pułapki i potwory działają ×1,6 mocniej, ale bohaterowie przychodzą o 2 poziomy silniejsi.', apply: m => { m.pactPower *= 1.6; m.pactLevels += 2; } },
    { id: 'overload', kind: 'card', rar: 'r', tag: 'odnowa -40%, cena', name: 'Przeciążenie', text: 'Pułapki odnawiają się o 40% szybciej, ale każde odpalenie ma 6% szans zepsuć pułapkę do końca fali.', apply: m => { m.cooldown *= 0.6; m.overload += 0.06; } },
    { id: 'cheapwalls', kind: 'card', rar: 'c', tag: 'rozbudowa /2', name: 'Tanie mury', text: 'Rozbudowa pokoi kosztuje o połowę mniej, ale budowle są o 50% droższe.', apply: m => { m.expandCost *= 0.5; m.buildingCost *= 1.5; } },
    // cards that tie two kinds of things together
    { id: 'firepit', kind: 'card', rar: 'r', tag: 'zapadnia + ogień', name: 'Ognista otchłań', text: 'Bohater, który spadnie przez zapadnię, wychodzi podpalony.', apply: m => { m.firepit += 1; } },
    { id: 'cageghost', kind: 'card', rar: 'r', req: 'cage', tag: 'klatka + strach', name: 'Nawiedzone klatki', text: 'Uwięziony w klatce dostaje 12 strachu na sekundę.', apply: m => { m.cageHaunt += 12; } },
    { id: 'monsterroar', kind: 'card', rar: 'c', tag: 'rany od potworów straszą', name: 'Ryk potworów', text: 'Rany zadane przez potwory straszą 2,5 raza mocniej (kolejna kopia: 4 razy...).', apply: m => { m.monsterFear += 1.5; } },
    // v14: damage types, bodies and phobias
    { id: 'sharp', kind: 'card', rar: 'c', tag: 'kłute +25%', name: 'Hartowane ostrza', text: 'Obrażenia kłute (kolce, strzały, łucznik, goblin, mimik) +25%.', apply: m => { m.dmgType.pierce *= 1.25; } },
    { id: 'heavy', kind: 'card', rar: 'c', tag: 'obuchowe +25%', name: 'Ciężkie mechanizmy', text: 'Obrażenia obuchowe (krata, ogr, upadek w zapadnię) +25%.', apply: m => { m.dmgType.blunt *= 1.25; } },
    { id: 'oil', kind: 'card', rar: 'c', tag: 'ogień +25%', name: 'Olej w szczelinach', text: 'Obrażenia od ognia (ogień, proch, podpalenia) +25%.', apply: m => { m.dmgType.fire *= 1.25; } },
    { id: 'venom', kind: 'card', rar: 'c', tag: 'trucizna +30%', name: 'Jadowite gruczoły', text: 'Obrażenia od trucizny (pająk, szaman, Zatruty łup) +30%.', apply: m => { m.dmgType.poison *= 1.3; } },
    { id: 'weakspot', kind: 'card', rar: 'r', tag: 'słabości ×2', name: 'Słabe punkty', text: 'Słabości ciała bohaterów działają 2 razy mocniej (np. kruche kości: obuchowe +80% zamiast +40%).', apply: m => { m.weakK += 1; } },
    { id: 'anatomy', kind: 'card', rar: 'r', unique: true, tag: 'wszystko jawne', name: 'Anatomia ofiar', text: 'Przed falą znasz ciało i fobie każdego bohatera.', apply: m => { m.revealAll = true; } },
    { id: 'arsenal', kind: 'card', rar: 'r', tag: '4 typy: +20%', name: 'Pełen arsenał', text: 'Jeśli na starcie fali masz w lochu wszystkie 4 typy obrażeń, wszystkie obrażenia +20%.', apply: m => { m.arsenal += 0.2; } },
    { id: 'nightmares', kind: 'card', rar: 'r', tag: 'fobie ×3', name: 'Koszmary', text: 'Fobie straszą 3 razy mocniej zamiast 2 (kolejna kopia: 4 razy).', apply: m => { m.phobiaK += 1; } },
    { id: 'oddbodies', kind: 'card', rar: 'c', tag: 'więcej fobii', name: 'Przeklęta karczma', text: 'Więcej bohaterów przychodzi z fobią albo słabością ciała (+10% szans na każdą).', apply: m => { m.oddBodies += 1; } },
    { id: 'scars', kind: 'card', rar: 'r', tag: 'trauma ×2', name: 'Blizny na duszy', text: 'Trauma łapie już poniżej 50% HP i straszy 2 razy (zamiast 1,5 raza).', apply: m => { m.traumaK += 1; } },
    { id: 'memories', kind: 'card', rar: 'r', tag: 'powracający +30% strachu', name: 'Złe wspomnienia', text: 'Powracający bohaterowie wchodzą do lochu z 30% strachu.', apply: m => { m.badMemories += 0.3; } },
    { id: 'survivors', kind: 'card', rar: 'c', tag: 'więcej powrotów', name: 'Legenda ocalałych', text: 'Uciekinierzy wracają 1,5 raza częściej, a każdy powracający w drużynie daje +0,2 chciwości.', apply: m => { m.moreReturn += 0.5; m.returnGreed += 0.2; } },
    // v14: fear
    { id: 'dread', kind: 'card', rar: 'c', tag: 'strach mija wolniej', name: 'Gęsta atmosfera', text: 'Strach bohaterów opada o połowę wolniej.', apply: m => { m.calmK *= 0.5; } },
    { id: 'screams', kind: 'card', rar: 'c', tag: 'ucieczka straszy', name: 'Krzyki w ścianach', text: 'Każdy bohater, który ucieknie ze strachu, straszy pozostałych (10% ich odwagi).', apply: m => { m.fleeShock += 0.1; } },
    { id: 'isolation', kind: 'card', rar: 'r', tag: 'samotni ×1,25', name: 'Izolacja', text: 'Samotny albo zgubiony bohater boi się wszystkiego o 25% bardziej, a sama samotność straszy go 2 razy mocniej.', apply: m => { m.isolation += 1; } },
    { id: 'heavyair', kind: 'card', rar: 'c', tag: 'Mgła i Krypta +25%', name: 'Ciężkie powietrze', text: 'W Mgle i w Krypcie każdy strach jest o 25% silniejszy.', apply: m => { m.heavyAir += 0.25; } },
    { id: 'lastgasp', kind: 'card', rar: 'r', tag: 'śmierć straszy pokój', name: 'Ostatnie tchnienie', text: 'Umierający bohater straszy wszystkich w swoim pokoju (20% ich odwagi).', apply: m => { m.lastGasp += 0.2; } },
    // v14: the shop and the stash
    { id: 'broker', kind: 'card', rar: 'c', tag: 'sklep -25%', name: 'Pośrednik', text: 'Karty w sklepie kosztują o 25% mniej.', apply: m => { m.shopDisc += 0.25; } },
    { id: 'luckydraw', kind: 'card', rar: 'c', tag: 'odświeżenie gratis', name: 'Szczęśliwy los', text: 'Pierwsze odświeżenie sklepu w każdej fali jest darmowe.', apply: m => { m.freeReroll += 1; } },
    { id: 'pawnshop', kind: 'card', rar: 'c', tag: 'sprzedaż ×2', name: 'Lombard', text: 'Sprzedane karty dają 2 razy więcej Esencji.', apply: m => { m.sellK *= 2; } },
    { id: 'deepstash', kind: 'card', rar: 'r', tag: 'schowek +2', name: 'Głęboki schowek', text: 'Schowek mieści 2 karty więcej.', apply: m => { m.stashPlus += 2; } },
    { id: 'patron', kind: 'card', rar: 'r', tag: 'karta co 2 fale', name: 'Mecenas', text: 'Co drugą falę dostajesz dodatkową darmową kartę.', apply: m => { m.patron += 1; } },
    { id: 'hoard', kind: 'card', rar: 'r', tag: 'schowek = chciwość', name: 'Kolekcja w schowku', text: 'Każda karta w schowku daje +0,1 chciwości.', apply: m => { m.stashGreed += 0.1; } },
    // v14: the heart's hunger
    { id: 'wager', kind: 'card', rar: 'l', tag: 'chciwość +0,8, głód +30%', name: 'Zakład z sercem', text: 'Chciwość +0,8, ale serce chce o 30% więcej.', apply: m => { m.greedFlat += 0.8; m.hungerK *= 1.3; } },
    { id: 'gluttony', kind: 'card', rar: 'r', tag: 'po sytości ×1,25', name: 'Obżarstwo', text: 'Gdy serce jest już syte, Esencja z fali wpada o 25% większa.', apply: m => { m.storeK *= 1.25; } },
    { id: 'fasting', kind: 'card', rar: 'c', tag: 'głód -15%', name: 'Post', text: 'Serce chce o 15% mniej, ale chciwość -0,2.', apply: m => { m.hungerK *= 0.85; m.greedFlat -= 0.2; } },
    { id: 'heartbeat', kind: 'card', rar: 'r', tag: 'pełne serce +20%', name: 'Bijące serce', text: 'Gdy serce jest już syte w tej fali, pułapki i potwory działają o 20% mocniej.', apply: m => { m.heartbeat += 0.2; } },
    // v14: greed and loot
    { id: 'gilded', kind: 'card', rar: 'c', tag: 'ulepszone = chciwość', name: 'Pozłacane pułapki', text: '+0,05 chciwości za każdą pułapkę i potwora na poziomie 2 lub 3.', apply: m => { m.gilded += 0.05; } },
    { id: 'golddust', kind: 'card', rar: 'c', tag: 'monety ×1,5', name: 'Złoty pył', text: 'Monety podbijają chciwość o połowę mocniej.', apply: m => { m.goldDust += 0.5; } },
    { id: 'reliquary', kind: 'card', rar: 'r', unique: true, tag: 'relikwie ×1,5', name: 'Relikwiarz', text: 'Relikwie podbijają chciwość 1,5 raza mocniej, a bohater, który zabierze relikwię, nie dostaje z niej przedmiotu.', apply: m => { m.reliquary = true; } },
    // v14: monsters and building
    { id: 'pack', kind: 'card', rar: 'c', tag: 'potwory w parach +20%', name: 'Stado', text: 'Potwór, który ma w swoim pokoju innego potwora, bije o 20% mocniej.', apply: m => { m.pack += 0.2; } },
    { id: 'quickarm', kind: 'card', rar: 'c', unique: true, tag: 'od razu gotowe', name: 'Szybki montaż', text: 'Pułapki postawione w trakcie fali są gotowe od razu.', apply: m => { m.quickArm = true; } }
  ];
  const UPG = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
  const RAR_NAME = { c: 'zwykła', r: 'rzadka', l: 'legendarna' }, RAR_COLOR = { c: '#c9c2d8', r: '#6fb7ff', l: '#ff8a3c' }, RAR_SELL = { c: 2, r: 4, l: 6 };
  const DECK_SIZE = 7;
  const ROOM_TINT = ['#3f4246', '#43424a', '#4a3e45', '#533941', '#5f3239'];   // Prototype 1.0: cold grey stone near the entrance, dried blood deep down
  const OBJ_KINDS = ['barrel', 'crate', 'statue', 'shelf'];
  const HEART = { kind: 'heart' }, LOOTTRAP = { kind: 'loot' }, BURN = { kind: 'burn' };
  const MON_FACTOR = 0.4;   // monsters acting on their own score and feed fear at a reduced rate
  const DMG_FACTOR = { trap: 1, loot: 1, burn: 1, monster: MON_FACTOR, heart: 0, other: 0 };
  // v15: one currency. Every event gives a little Groza, measured against the hero (all his HP lost or his whole fear bar filled
  // is about 1,5 Groza), and Esencja = Groza x Chciwość x Combo is paid out at once.
  const GZ = { dmg: 1.5, fear: 1.6, kill: 1.2, scare: 2.5, lost: 0.12, alone: 0.09, loot: 0.4, heal: 0.45, web: 0.25, cage: 0.45, crystal: 4 };
  const fmtE = v => v >= 10 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',').replace(',0', '');
  const ACTS = {};
  const actSrc = type => ACTS[type] || (ACTS[type] = { kind: 'trap', type });   // a tapped monster ability scores like a trap

  // What the heroes say. Each decision shows up as a bubble. {m|f} picks the masculine or feminine form.
  const SAY = {
    enter: ['Wchodzimy. Trzymajcie się razem.', 'Gdzieś tu są kryształy.', 'Cicho, idziemy.'],
    gate: ['Wchodzimy!', 'Za mną!', 'Do środka!', 'Naprzód!'],   // 1.04: when the party steps in from the door
    champion: ['Za mną! Ten loch padnie!', 'Pokażę wam, jak to się robi.', 'Kryształ będzie nasz.'],
    explore: ['Idziemy tędy.', 'Sprawdźmy te drzwi.', 'Dalej, w głąb!', 'Tędy chyba prowadzi dalej.'],
    rookieLead: ['Za mną!', 'Tędy, na pewno tędy!', 'Ja prowadzę!'],
    deliberate: ['Lewo czy prawo?', 'Ja bym sz{edł|ła} tędy.', 'Mam złe przeczucia...', 'Rozdzielmy się?', 'Nie, trzymajmy się razem.', 'Słyszę coś za tymi drzwiami.'],
    scout: ['Sprawdzę tamte drzwi!', 'Pójdę na zwiad.', 'Zaraz wracam!'],
    scoutReply: ['Tylko szybko!', 'Uważaj na siebie.', 'Nie oddalaj się.'],
    scoutBack: ['Wracam do was!', 'Tam nic ciekawego.'],
    wander: ['Ja sprawdzę tamte drzwi!', 'Idę sam{|a}, dam radę!', 'Zobaczę, co tam jest!'],
    trap: { spikes: 'Kolce!', arrows: 'Strzały!', fire: 'Ogień!', gate: 'Krata!', powder: 'Wybuch!', mimic: 'Ta skrzynia gryzie!', web: 'Sieć!', trapdoor: 'Zapadnia!', cage: 'Klatka!', portrait: 'Ten obraz się rusza!',
      eyes: 'Coś na mnie patrzy ze ściany!', bones: 'Te kości... ruszają się!', mirror: 'To nie jest moje odbicie!', creak: 'Drzwi same skrzypią!', coffin: 'Trumna się otwiera!', musicbox: 'Skąd ta melodia?!' },
    learn: ['Zapamiętajcie to miejsce.', 'Tędy nie idziemy.', 'Omijamy to.'],
    noLearn: ['Co to było?', 'Pewnie przypadek.', 'Nic się nie stało!'],
    detect: ['Tu jest pułapka, omijajcie.', 'Widzę mechanizm.', 'Stop, coś tu jest.'],
    disarm: ['Rozbroję to, czekajcie.', 'Dajcie mi chwilę.', 'Spokojnie, znam ten typ.'],
    disarmDone: ['Gotowe, czysto.', 'Rozbrojone!'],
    disarmHit: ['Au! Prawie miał{em|am}!', 'Zacięło się!'],
    disarmFail: ['Ups...', 'Oj, chyba nie ten drut!', 'To miało tak kliknąć?'],
    bless: ['Odczyniam ten obraz.', 'Precz, zły duchu!'],
    shield: ['Tarcza!', 'Za mną, osłonię was!'],
    dodge: ['Unik!', 'Pudło!', 'Za wolno!'],
    heal: ['Leczę!', 'Trzymaj się!', 'Światło, ulecz ich.'],
    cleanse: ['Gaszę ogień!', 'Nie ruszaj się, gaszę!'],
    barrier: ['Bariera!', 'Osłona dla wszystkich!'],
    dispel: ['Rozpraszam sieć!', 'Precz, pajęczyno!'],
    fireball: ['Kula ognia!', 'Spłoń!'],
    fight: ['Biorę go!', 'Na potwora!', 'Ja się nim zajmę.'],
    avoid: ['Omijamy tego potwora.', 'Nie wdawajmy się w bójkę.'],
    loot1: ['Złoto!', 'Coś błyszczy.', 'Moje!'],
    loot2: ['Rzadki łup!', 'Ooo, to coś cennego.', 'Widzę rzadki skarb!'],
    loot3: ['Legendarny skarb!!', 'Widzicie to?!', 'To musi być moje!'],
    lootRisk: ['Za dużo pułapek przy tym złocie.', 'Nie warto, to pułapka.', 'Zostawmy to.'],
    lootGo: ['Warto zaryzykować!', 'Biorę, osłaniajcie mnie!'],
    lootRookie: ['Złoto! Moje!', 'Bogactwo!', 'Kto pierwszy, ten lepszy!'],
    potion: ['Piję miksturę!', 'Mikstura, szybko!'],
    charm: ['Talizman mnie osłonił!', 'Talizman zadziałał!'],
    amulet: ['Amulet drży...', 'Amulet coś wyczuwa.'],
    bomb: ['Bomba!', 'Padnij!'],
    retreat: ['Odwrót!', 'Wycofujemy się, opatrzmy rany.', 'Za dużo ran, wracamy!'],
    restDone: ['Dobra, ruszamy.', 'Jestem got{ów|owa}.', 'Lepiej. Idziemy.'],
    regroup: ['Zbiórka!', 'Czekajcie na resztę!', 'Trzymajmy się razem!'],
    lost: ['Gdzie jesteście?!', 'Halo?!', 'Chyba się zgubił{em|am}...', 'Który to był korytarz?'],
    found: ['Jesteście!', 'Uff, znalazł{em|am} was.', 'Już myślał{em|am}, że po mnie.'],
    panic: ['Uciekać!', 'Nie chcę umierać!', 'To loch śmierci!', 'Ratunku!'],
    death: ['Nie! {n}!', 'Straciliśmy {a}!', 'Pomścimy cię, {v}!'],
    alone: ['Został{em|am} sam{|a}...', 'Jest tu ktoś?', 'Nie podoba mi się ta cisza.'],
    heartSeen: ['Serce lochu! Tam są kryształy!', 'Widzę kryształy!'],
    heartLater: ['Serce! Ale najpierw przeszukajmy resztę.'],
    assault: ['Po kryształ!', 'Do serca!', 'Bierzemy kryształ!'],
    steal: ['Mam kryształ! Uciekamy!', 'Kryształ jest nasz! Do wyjścia!'],
    heartRepel: ['Ono parzy! Kryształ ani drgnie!', 'Serce nas odpycha!', 'Nie da się go wyrwać, za gorąco!'],   // 1.05: wave 1
    crystalDrop: ['Kryształ! Nie!', 'Zgubiliśmy kryształ!'],
    escape: ['Do wyjścia!', 'Szybciej, zanim nas dopadnie!', 'Osłaniajcie niosącego!'],
    flee: ['Wynoszę się stąd!', 'Mam dość, wracam!', 'Nie zapłacą mi za to!', 'Mamo!'],
    partyFlee: ['Odwrót! Wynosimy się!', 'Wszyscy do wyjścia!', 'To nie na nasze siły, uciekamy!'],
    fleeShout: ['Wracaj, tchórzu!', 'Nie zostawiaj nas!'],
    hesitate: ['Coś tu nie gra...', 'Za cicho tu...', 'Ostrożnie...', 'Ja pierws{zy|za} nie wchodzę.'],
    ambush: ['Zasadzka!', 'Ostrożnie, to pułapka!', 'Cofnąć się!'],
    gateBlocked: ['Krata! Utknęliśmy.', 'Zamknęło się!', 'Odcięło mnie!'],
    impatient: ['Dość tego! Po kryształ!', 'Koniec zabawy!'],
    secondGroup: ['Uciekli? Tchórze. Idziemy sami!', 'Słyszałeś te krzyki? ...Idziemy, ale ostrożnie.', 'Nie wierzę w duchy. Za mną!'],
    prophecy: ['Przepowiednia wskazuje drogę do serca!', 'Czuję serce lochu. Za mną, do końca!'],
    leave: ['Nic tu po nas. Wracamy.', 'Szkoda czasu, idziemy stąd.'],
    hurt: ['Ał!', 'Uch!', 'To boli!'],
    rumor: ['W karczmie mówili o tej pułapce.', 'Słyszał{em|am}, że tu coś jest.', 'Ten pokój znam z opowieści.', 'Omijamy, ostrzegali nas.'],
    rumorFalse: ['Tu miało coś być...', 'Plotki kłamały.', 'Nic tu nie ma?'],
    rookie: ['Co robi ten guzik?', 'Ja pójdę pierws{zy|za}!', 'Łatwizna!', 'To mój pierwszy loch!'],
    elite: ['Ostrożnie, sprawdzam podłogę.', 'Krok po kroku.', 'Patrzcie na ściany.'],
    timing: ['Teraz, przeładowuje się!', 'Biegiem, póki stoi!'],
    cage: ['Wypuśćcie mnie!', 'Pomocy, klatka!'],
    rescue: ['Ratujemy {a}!', 'Trzymaj się, {v}!'],
    abandon: ['Zostawiamy {a}!', 'Nie ma czasu, idziemy!'],
    abandoned: ['Nie zostawiajcie mnie!', 'Wracajcie!'],
    freed: ['Wolny!', 'Dzięki!'],
    cageBreak: ['Wyrwał{em|am} się!', 'Precz z tą klatką!', 'Nie zostanę tu!'],
    cageDie: ['Nikt... nie wróci...', 'Zostawili mnie...', 'Tak tu ciemno...'],
    crystalFear: ['Bierzcie sobie ten kamień!', 'Nie chcę go! Uciekam!', 'Przeklęty kryształ!'],
    sapped: ['Rozmontowane, nie odpali już nigdy.', 'Zabieram mechanizm na pamiątkę.', 'Ta pułapka jest już moja.'],
    sense: ['Czuję tu magię pułapek.', 'Stop. Widzę, gdzie są mechanizmy.', 'Ten pokój jest zaminowany.'],
    prepStart: ['Stop. Za tymi drzwiami jest pokój śmierci.', 'Słyszeliśmy o tym pokoju. Przygotujmy się.', 'Tam czeka masa pułapek. Potrzebujemy planu.'],
    // 1.12.1 (author: longer breaks, little scenes with bubbles when they rest or talk it over, not a shout and a freeze)
    prepGo: ['Wszyscy wiedzą, co robić?', 'Na mój znak. Raz, dwa...', 'Dobra. Razem i szybko.'],
    prepReply: ['Tak jest.', 'Got{ów|owa}.', 'Miejmy to za sobą.', 'Nie podoba mi się to.'],
    councilReply: ['Zgoda.', 'Mnie tam wszystko jedno.', 'Byle nie pod te kolce.', 'Prowadź.', 'Ostatnio też tak było.', 'Dobra, ale ja idę na końcu.'],
    restStart: ['Siadamy. Opatrzmy rany.', 'Tu jest spokojnie. Odpoczynek.', 'Stop. Złapmy oddech.'],
    restPriest: ['Pokażcie rany, pomodlę się.', 'Światło was opatrzy, siedźcie spokojnie.', 'Kto najbardziej krwawi? Do mnie.'],
    restScene: ['Auć! Delikatniej z tym bandażem!', 'Nogi mi odpadają.', 'Zjadł{bym|abym} coś ciepłego.', 'Ten loch nas powoli zjada.', 'Nie zasypiać mi tu!', 'Słyszeliście to skrzypienie?', 'Ile jeszcze tych pokoi?', 'Kto wziął ostatni bandaż?', 'Moja zbroja jest cała we krwi. Nie mojej. Chyba.', 'Jeszcze chwila i ruszamy.'],
    restReply: ['Cicho, odpoczywam.', 'Też to słyszał{em|am}.', 'Wytrzymaj, zaraz ruszamy.', 'Nie marudź.', 'Ja też.', 'Lepiej nie pytaj.'],
    prepWard: ['Błogosławię was. Osłona na wszystkich!', 'Światło, chroń nas!', 'Odwagi! Światło jest z nami.'],
    prepJam: ['Zagłuszę ich mechanizmy. Biegniemy na mój znak!', 'Zakłócam pułapki, szybko przez pokój!'],
    prepDisarm: ['Rozbroję, co się da, z progu.', 'Dajcie mi chwilę przy drzwiach.'],
    prepShield: ['Za mną, pod tarczą!', 'Idę pierwsz{y|a}, trzymajcie się za mną.'],
    rush: ['Teraz! Biegiem!', 'Naprzód, póki cisza!', 'Już! Przez pokój!'],
    fall: ['Aaaa!', 'Podłoga zniknęła!'],
    landed: ['Gdzie ja jestem?!', 'Ciemno tu...', 'Halo? Jest tu kto?'],
    ghost: ['Duch!', 'Coś zimnego mnie dotknęło!'],
    ghostOnly: ['Na ducha tylko kapłan!', 'Mieczem go nie tkniesz!'],
    shade: ['Ktoś szepcze moje imię...', 'Ten cień idzie za mną!', 'Kto tam? Kto szepcze?'],
    bats: ['Nietoperze!', 'Precz! Precz ode mnie!', 'Moje włosy! Zabierzcie je!'],
    lull: ['Ta melodia... skądś ją znam...', 'Przestańcie grać! Przestańcie!'],
    batScatter: ['Uciekam!', 'Nie widzę, gdzie biegnę!'],
    spider: ['Pająk!', 'Fuj, pająk!'],
    seenBuilt: ['Widział{em|am} to! Ściana się ruszyła!', 'Coś tam się pojawiło!', 'Loch zastawia na nas pułapki!'],
    gateReroute: ['Krata! Szukamy innej drogi.', 'Zamknięte. Obejdziemy to.', 'Tędy nie przejdziemy, wracamy na rozwidlenie.'],
    gateWait: ['Nie ma innej drogi, czekamy na kratę.', 'Utknęliśmy. Poczekajmy, aż się podniesie.'],
    lootPetty: ['Zwykłe błyskotki, szkoda czasu.', 'Takie drobne? Nie schylam się.'],
    lootLegend: ['Legendarne! Choćby przez piekło!', 'Po to tu przyszliśmy!'],
    lootGreedy: ['Moje! Wszystko moje!', 'Złoto woła mnie po imieniu!'],
    lootCareful: ['Za łatwo leży. To pułapka.', 'Nie ruszam, coś tu śmierdzi.'],
    lootWait: ['Bierz to, poczekamy.', 'Tylko szybko!', 'Dobra, łap to i idziemy.', 'Weź to, osłaniam cię.'],
    lootStop: ['Zostaw to złoto!', 'Wracaj, to przynęta!', 'Nie teraz, trzymaj się planu!'],
    lootReply: ['Tylko szybko!', 'Sekunda, zaraz wracam!', 'Nie zostawię tego!'],
    revenge: ['Pomszczę cię, {v}!', 'Za {a}! Do ataku!', 'Zapłacą za {a}!'],
    cowardRun: ['Ja tu nie zostaję!', 'Każdy za siebie!'],
    cautious: ['Spokojnie, krok po kroku.', 'Najpierw patrzę, potem idę.'],
    rumorStart: ['W karczmie mówili o {k} pułapkach w środku.', 'Uciekinierzy opowiadali o tym lochu. Uważajcie.', 'Podobno w środku czeka {k} pułapek.'],
    heartRumor: ['Wiemy, gdzie jest serce. Idziemy prosto.', 'Mapa z karczmy prowadzi do serca.'],
    fame1: ['O tym lochu już się mówi.', 'Słyszałem, że stąd wracają nieliczni.'],
    fame2: ['Ten loch to żywa legenda...', 'Mówią, że stąd nikt nie wraca.', 'Bardowie śpiewają o tym miejscu.'],
    rookieBoast: ['Pierwszy raz w lochu, ale dam radę!', 'Zobaczycie, wrócę z kryształem!', 'Mama by była dumna!'],
    vetWarn: ['Mówił{em|am}: patrz pod nogi!', 'Uważaj, młody!', 'Nowicjusze...'],
    nastyTrap: ['Ta pułapka wygląda paskudnie...', 'Ktoś tu się postarał.', 'To nie jest zwykły mechanizm.'],
    guildFear: ['Gildia przysłała kapłanów. Nie damy się nastraszyć!', 'Mamy amulety. Strach na nas nie działa!'],
    guildKill: ['Gildia dała nam tarcze. Nie zginiemy jak tamci.', 'Wojownicy przodem, tym razem przeżyjemy.'],
    guildTraps: ['Złodzieje przodem, tu jest pełno pułapek.', 'Gildia mówi: pułapka na pułapce. Biorę zestaw do rozbrajania.'],
    guildMonsters: ['Mamy maga na potwory.', 'Tym razem potwory spłoną.'],
    guildLost: ['Gildia dała nam barda. Tym razem nikt się nie zgubi.', 'Mamy lutnię. Trzymajcie się dźwięku.'],
    guildBlock: ['Gildia przysłała barbarzyńcę. Skrzynie nas nie zatrzymają.', 'Topór przodem, tu wszystko zastawione!'],
    bRune: ['Runa! Moje zaklęcia tu nie sięgają.', 'Ten kamień zjada magię...'],
    bAltar: ['Bluźnierczy ołtarz... moja modlitwa tu nie sięga!', 'To miejsce jest przeklęte, bogowie mnie nie słyszą.'],
    bAcid: ['Kwas! Tarcza mi się topi!', 'Ten opar przeżera osłony...'],
    bVeil: ['Tego pokoju nie było w opowieściach...', 'Nikt nam nie mówił o tym miejscu!'],
    bDecoy: ['To była zmyłka!', 'Pułapka w pułapce!', 'Alarm! Wszystko odpala!'],
    bHowl: ['Ten kamień wyje... zagłusza mi lutnię!', 'Nic nie słychać przez to wycie!', 'Wiatr gra głośniej niż ja...'],
    bShackles: ['Łańcuchy... czuję, jak furia gaśnie.', 'Okowy! Nie mogę się wściec!', 'Te kajdany... ręce mi ciążą.'],
    // 1.05: the bard and the barbarian
    song: ['Zagram wam coś na odwagę!', 'Głowy do góry! Ballada o tych, co wrócili!', 'Słuchajcie! Pieśń o bohaterach!', 'Raz, dwa... śpiewajcie ze mną!'],
    songThanks: ['Od razu raźniej.', 'Graj dalej!', 'Dzięki, bardzie.', 'Dobra, dam radę.'],
    bardCall: ['{n}! Idź na moją lutnię!', 'Gram głośniej! {n}, idź za dźwiękiem!', 'Słyszysz mnie, {n}? Tędy!'],
    lostHear: ['Słyszę lutnię! Idę!', 'To nasz bard! Tędy!', 'Muzyka... tam są!'],
    answer: ['Tutaj! Na mój głos!', 'Jesteśmy tu! Idź na głos!', '{n}! Tędy!'],
    hearVoice: ['Słyszę ich! Idę na głos!', 'To oni! Już idę!'],
    echoLost: ['To echo... skąd to idzie?!', 'Głosy ze wszystkich stron!', 'Wołają, ale skąd?!'],
    rage: ['AAARGH!', 'Krew za krew!', 'Teraz się wściekł{em|am}!', 'Rozwalę ten loch!'],
    rageNoPanic: ['Nie uciekam! Wściekam się!', 'Strach? Strach mnie tylko wkurza!', 'Bój się mnie, lochu!'],
    smash: ['Z drogi, skrzynio!', 'Rozwalę to!', 'Topór lepszy niż klucz!', 'Drzazgi!'],
    smashB: ['Precz z tym kamieniem!', 'Zaraz z tego będzie gruz!', 'Nic mnie nie zatrzyma!'],
    bardIdle: ['Ułożę o tym balladę...', 'Ten loch to dobry temat na pieśń.', 'Rym do "kolce"? Hmm...'],
    barbIdle: ['Za cicho. Chcę się bić.', 'Gdzie te potwory?', 'Mój topór się nudzi.'],
    champShout: ['Stać! Nikt nie ucieka!', 'Do mnie! Trzymamy szyk!', 'Tchórze nie dostaną złota!'],
    finalRage: ['Nie zatrzymasz przeznaczenia!', 'Teraz zobaczysz prawdziwą siłę!'],
    finalAura: ['Jestem z wami. Nie lękajcie się.', 'Przepowiednia nas prowadzi.'],
    // v12: fear that stays, gear, powers, getting lost, room types, the breach
    shaken: ['Widział{em|am}, jak zginął... Ręce mi się trzęsą.', 'To mogł{em|am} być ja.', 'Nie mogę przestać o tym myśleć.', 'Ten loch zabija.'],
    hurtScared: ['Krwawię... Długo tak nie pociągnę.', 'Jeszcze jedno takie i po mnie.', 'Wszystko mnie boli.'],
    potionGive: ['Masz, pij! Szybko!', 'Trzymaj moją miksturę!', 'Łap, nie umieraj mi tu!'],
    potionThanks: ['Dzięki, ratujesz mi skórę!', 'Ratunek w samą porę!'],
    swap: ['Biorę lepsze, stare zostawiam.', 'To mi się bardziej przyda.', 'Wymiana! Stare niech tu leży.'],
    full: ['Nie mam już miejsca.', 'Plecak pełny, zostawiam.', 'Nic więcej nie uniosę.'],
    noNeed: ['Mam lepsze.', 'Na co mi to?', 'Nie potrzebuję.'],
    gold: ['Złoto! Do sakwy!', 'Ciężkie, ale moje!', 'Liczę: jedna, dwie... wszystkie moje!'],
    goldHeavy: ['Ta sakwa mnie spowalnia...', 'Ciężko się biega ze złotem.'],
    cursedPick: ['Coś jest nie tak... zimno mi.', 'Ten skarb szepcze...', 'Czemu nie mogę go puścić?'],
    cursedWarn: ['Nie ruszać! Ten skarb jest przeklęty!', 'Czuję klątwę. Zostawcie to.', 'To przynęta lochu, przeklęta!'],
    curseLift: ['Zdejmuję z ciebie klątwę!', 'Światło, oczyść {a}!'],
    faithLow: ['Moja wiara słabnie...', 'Nie mam już sił na modlitwy.', 'Bogowie milczą...'],
    charmUse: ['Talizman, chroń mnie!', 'Osłona talizmanu!', 'Teraz, talizmanie!'],
    amuletUse: ['Amulecie, uspokój mnie...', 'Oddycham... spokojnie.', 'Amulet grzeje. Lepiej.'],
    bootsUse: ['Biegiem!', 'Buty, nie zawiedźcie!', 'Szybciej niż wiatr!'],
    detour: ['Chyba tędy...', 'Ten korytarz wygląda znajomo.', 'Skręćmy tu, na pewno tędy.', 'Zaufajcie mi, znam drogę.'],
    detourBack: ['Ślepa uliczka. Wracamy.', 'Chyba zabłądziliśmy...', 'To nie ta droga!'],
    searchLost: ['Gdzie jest {n}? Szukamy!', 'Wracamy po {a}!', 'Nie zostawimy {a}!'],
    leaveLost: ['{n} nas dogoni.', 'Nie ma czasu szukać {a}.', 'Trudno, idziemy bez {a}.'],
    lostCall: ['Halo?! Gdzie wy jesteście?!', 'Słyszy mnie ktoś?!', 'Który to był korytarz?!', 'Wszystkie te pokoje wyglądają tak samo...'],
    rtFog: ['Nic nie widać w tej mgle...', 'Trzymajcie się blisko, mgła!', 'Gdzie podłoga, gdzie pułapka?'],
    rtSwamp: ['Grzęzniemy w tym błocie!', 'Fuj, bagno...', 'Nogi mi się zapadają!'],
    rtGrotto: ['Słyszycie to echo?', 'Każdy krzyk tu wraca...', 'Cicho! Echo niesie.'],
    rtCrypt: ['Krypta... Tu leżą umarli.', 'Nie podoba mi się ta cisza grobów.', 'Coś tu patrzy z trumien.'],
    rtHaven: ['Tu jest spokojnie. Odpocznijmy.', 'Kaplica! Tu nic nam nie grozi.', 'Wreszcie bezpieczne miejsce.'],
    rtGears: ['Słyszycie te tryby?', 'Cały pokój tyka...', 'Mechanizm! Patrzcie pod nogi.'],
    rtHush: ['...', 'Nic nie słyszę...', '(cisza)'],
    rtIce: ['Ślisko! Ostrożnie!', 'Lód! Trzymajcie się ściany.', 'Zimno tu jak w grobie.'],
    slip: ['Ślisko!', 'Łoo!', 'Nie mogę stanąć!', 'Jadę!'],
    nap: ['Chwila odpoczynku...', 'Tylko przymknę oczy.', 'Usiądę na moment.'],
    nightmare: ['Koszmary... nie mogę spać.', 'Ktoś szepcze mi do ucha...', 'To miejsce nie jest święte...'],
    rtVault: ['Skarbiec! Ile tu złota!', 'Tu musi być fortuna!', 'Bogactwo! Rozglądajcie się!'],
    breachUse: ['Idziemy przez wyłom! Krócej.', 'Wyłom! Ominiemy ich pułapki.'],
    doorUse: ['Drzwiami. Wyłom to pułapka.', 'Przez wyłom? Nie, za ciasno. Drzwiami.'],
    // v14: returners, traumas, bodies, phobias
    returnBack: ['Wrócił{em|am}. Tym razem wiem, gdzie stąpać.', 'Pamiętam cię, lochu. Pamiętam każdą pułapkę.', 'Znowu tu... ale teraz jestem gotow{y|a}.', 'Uciekł{em|am} raz. Drugi raz nie ucieknę.'],
    trauma: { pierce: ['Krwawię... nie chcę więcej ostrzy!', 'Te kolce... nie, nie znowu!'], blunt: ['Moje kości... coś pękło!', 'Jeszcze jeden taki cios i po mnie.'],
      fire: ['Płonę! Tylko nie ogień, nie znowu!', 'Czuję jeszcze ten żar...'], poison: ['Jad... cała drżę od środka.', 'Trucizna... robi mi się ciemno.'] },
    weakHit: { pierce: ['Stare rany się otwierają!', 'Zawsze mnie biorą ostrza...'], blunt: ['Moje kości! Zawsze były kruche...', 'To boli bardziej niż powinno!'],
      fire: ['Dawne oparzenia znowu palą!', 'Nie znoszę ognia, skóra mi pęka!'], poison: ['Jestem wrażliw{y|a} na jady!', 'Trucizna działa na mnie od razu...'] },
    resistHit: { pierce: ['Ha! Mam grubą skórę.', 'Ledwo drasnęło.'], blunt: ['Wytrzymam więcej!', 'Krzepk{i|a} jestem, nie przewrócisz mnie.'],
      fire: ['Ogień? Był{em|am} już w gorszych piecach.', 'Hartowan{y|a} w ogniu, nie strasznie mi.'], poison: ['Jady mnie nie biorą.', 'Pił{em|am} gorsze trucizny.'] },
    phobia: { fire: ['Ogień! Nie, tylko nie ogień!', 'Boję się płomieni... od dziecka.'], spiders: ['Pająki! Nienawidzę pająków!', 'Nie, nie, tylko nie pająki!'],
      closed: ['Tu jest za ciasno... nie mogę oddychać!', 'Ściany się zamykają!'], ghosts: ['Duchy... wiedział{em|am}, że tu są duchy!', 'Ten wzrok... on patrzy na mnie!'],
      blood: ['Tyle krwi... robi mi się słabo.', 'Kości... nie chcę tu skończyć jak oni!'], dark: ['Nic nie widzę... ciemność mnie zjada!', 'Sam{|a} w ciemności... nie, nie!'] },
    hunters: ['Słyszał{em|am} o złocie w tym lochu!', 'Gdzie te skarby, o których śpiewają?', 'Przyszł{em|am} po złoto, nie po kryształy.'],
    friendLow: ['Trzymaj się, {n}!', '{n}, wycofaj się!', 'Osłońcie {a}!'],
    // 1.05: talk that knows what is going on: on the way out, at rest, reactions, a healer called, councils with traits
    chatFlee: ['Szybciej!', 'Nie oglądaj się!', 'Już blisko wyjścia!', 'Byle dalej stąd...', 'Biegiem, biegiem!'],
    chatCarrier: ['Mam go! Osłaniajcie mnie!', 'Kryształ jest ciężki... nie zatrzymujcie się!'],
    chatHurtOut: ['Ledwo idę...', 'Nie zostawiajcie mnie!'],
    chatRest: ['Opatrzmy rany.', 'Chwila oddechu...', 'Kto ma bandaże?', 'Nie siadaj na tej płycie!'],
    chat_coward: ['Może jednak wrócimy?', 'Ja tu tylko noszę bagaże...', 'Czemu zawsze ja idę w środku?'],
    chat_brave: ['Nie bój się, jestem z tobą.', 'Niech tylko coś wyskoczy!', 'Idziemy dalej, głowa do góry.'],
    chat_careful: ['Patrzcie, gdzie stawiacie stopy.', 'Ta płyta jest luźna. Omijamy.', 'Powoli, nie ma pośpiechu.'],
    chat_greedy: ['Gdzieś tu musi być skarbiec.', 'Czuję złoto.', 'Podział po równo, tak?'],
    reassure: ['Spokojnie, damy radę.', 'Trzymaj się mnie.', 'Nie panikuj, jesteśmy razem.'],
    surviveFirst: ['Najpierw przeżyjmy, potem liczmy.', 'Złoto nic nie da w grobie.'],
    friendHit: ['Uważaj, {n}!', '{n}! Żyjesz?', 'Trzymaj się, {n}!', 'Cofnij się, {n}!'],
    callHealer: ['{n}, tutaj! Krwawię!', '{n}! Potrzebuję leczenia!', 'Pomóż mi, {n}!'],
    healerReply: ['Idę, wytrzymaj!', 'Już biegnę!', 'Nie ruszaj się, zaraz będę!'],
    lootFlee: ['Nie ma czasu na złoto!', 'Zostawiam to! Uciekam!', 'Złoto? Życie ważniejsze!'],
    deathFlee: ['{n} nie żyje! Uciekać!', 'Straciliśmy {a}! Szybciej!', 'Nie! {n}! ...Biegiem!'],
    argueLoot: ['Tam coś błyszczy! Idźmy tamtędy!', 'Po złoto! Pokój obok!', 'Tamte drzwi, tam był skarb!'],
    argueCareful: ['Wolniej. Którędy bezpieczniej?', 'Nie pchajmy się na ślepo.', 'Najpierw sprawdźmy podłogę.'],
    argueCoward: ['A może po prostu wróćmy?', 'Mam złe przeczucia, chodźmy stąd.', 'Ja dalej nie idę...'],
    argueBrave: ['Tchórzysz? Idziemy dalej!', 'Nie po to tu szliśmy, żeby zawrócić!'],
    decideYes: ['Dobra, sprawdźmy tamto. Szybko!', 'Niech będzie, po złoto.', 'Zgoda, ale trzymamy się razem.'],
    decideNo: ['Nie. Idziemy tędy.', 'Złoto poczeka. Za mną.', 'Ja prowadzę. Tędy.'],
    argueSearch: ['Jeszcze nie przeszukaliśmy wszystkiego!', 'A skarby? Szliśmy tu po złoto!'],
    replySearch: ['Kryształ jest ważniejszy.', 'Później. Najpierw serce.', 'Nie ma czasu, idziemy do serca.'],
    argueRetreat: ['Nie cofamy się przed byle pułapką!', 'Odwrót? Teraz?!'],
    agreeRetreat: ['Nareszcie ktoś rozsądny.', 'Tak, tak, wycofajmy się!']
  };
  // 1.10: answers to the everyday lines (someone close by says one now and then)
  const CHAT_REPLY = {
    'Słyszycie to?': ['Nic nie słyszę.', 'Ciii... Słucham.', 'To tylko wiatr. Chyba.'],
    'Trzymajcie się blisko.': ['Jestem tuż za tobą.', 'Jasne.'],
    'Patrzcie pod nogi.': ['Patrzę, patrzę.', 'Wiem, nie jestem {ślepy|ślepa}.'],
    'Ledwo stoję...': ['Wytrzymaj, jeszcze trochę.', 'Oprzyj się o mnie.'],
    'Potrzebuję chwili.': ['Nie mamy chwili.', 'Złap oddech, osłaniam cię.'],
    'Jeszcze trochę złota i wracam do domu.': ['Wszyscy tak mówią.', 'Jak przeżyjesz.'],
    'Opatrzmy rany.': ['Daj, pomogę.', 'Szybko, zanim coś przyjdzie.'],
    'Kto ma bandaże?': ['Ja mam. Trzymaj.', 'Zostały mi ostatnie.'],
    'Chwila oddechu...': ['Tylko krótka.'],
    'Nie siadaj na tej płycie!': ['Spokojnie, nie siadam.'],
    'Może jednak wrócimy?': ['Nie ma mowy.', 'Idziemy dalej. Głowa do góry.'],
    'Czemu zawsze ja idę w środku?': ['Bo w środku najbezpieczniej.'],
    'Ja tu tylko noszę bagaże...': ['To noś i nie marudź.'],
    'Podział po równo, tak?': ['Po równo. Jak przeżyjemy.', 'Zobaczymy.'],
    'Gdzieś tu musi być skarbiec.': ['Najpierw przeżyjmy, potem skarbiec.', 'Oby.'],
    'Czuję złoto.': ['Ja czuję tylko stęchliznę.'],
    'Ta płyta jest luźna. Omijamy.': ['Dobrze, że patrzysz.'],
    'Powoli, nie ma pośpiechu.': ['Jest pośpiech. Czas leci.'],
    'Niech tylko coś wyskoczy!': ['Nie kuś losu.']
  };
  // 1.13 (author: "let them really talk to each other, comment on each other's lines, actions, mistakes and successes"):
  // conversations. A line a hero says (its SAY key, a nested one as 'trap:spikes') can start a short exchange: a friend in
  // earshot answers, the first one answers back, sometimes a third one chips in. Each set is a list of exchanges:
  // l = the lines in order, speaker 'A' (the one whose line started it), 'B' (a friend in earshot), 'C' (another one);
  // b / bt = B's class / character (one or a list), br / bv = B's rank at most / at least, ac / at = A's class / character,
  // w = weight. In a text {m|f} is the speaker's own gender, {A:m|f} {B:m|f} {C:m|f} somebody else's,
  // {An} {Aa} {Av} (and B, C) their name: nominative, accusative, vocative. 'monsterDown' has no line of its own: it starts
  // when a hero kills a monster. CONVO_P = how likely a line starts an exchange (the rest stays a single bubble).
  const CONVO = {
    trap: [
      { l: [['B', 'Wszyscy cali?'], ['A', 'Chyba tak. Ledwo.']] },
      { l: [['B', 'Mówił{em|am}, żeby patrzeć pod nogi!'], ['A', 'To trzeba było iść pierws{B:zy|za}!']] },
      { l: [['B', 'Kto stawia takie rzeczy w piwnicy?!'], ['A', 'Ktoś, kto nas bardzo nie lubi.']] },
      { bt: 'careful', l: [['B', 'Widział{em|am} ten mechanizm. Trzeba było mnie słuchać.'], ['A', 'Następnym razem posłucham.'], ['B', 'Akurat.']] },
      { bt: ['brave', 'greedy'], l: [['B', 'Ha! Ale podskoczył{A:eś|aś}, {Av}!'], ['A', 'Bardzo śmieszne.']] },
      { b: 'priest', l: [['B', 'Pokaż. Zaraz cię opatrzę.'], ['A', 'Tylko szybko, cieknie ze mnie.']] },
      { at: 'coward', l: [['B', 'Nic ci nie jest, {Av}?'], ['A', 'Wszystko mi jest! Wracajmy stąd!'], ['B', 'Nie marudź.']] },
      { l: [['B', '{Av}, żyjesz?'], ['A', 'Żyję. Ale ten loch mnie nie lubi.'], ['C', 'Nikogo nie lubi.']] }
    ],
    'trap:web': [
      { l: [['B', 'Wyglądasz jak mucha, {Av}.'], ['A', 'Zamiast gadać, pomóż mi to zdjąć!']] },
      { b: 'mage', l: [['B', 'Nie ruszaj się, spalę to.'], ['A', 'Spalisz sieć, nie mnie, tak?'], ['B', 'Postaram się.']] }
    ],
    'trap:trapdoor': [
      { l: [['B', '{An} wpadł{A:|a} pod podłogę!'], ['C', 'Spokojnie. Takie doły mają drugie wyjście.']] },
      { l: [['B', '{Av}! Słyszysz mnie?!'], ['C', 'Nic nie słychać...'], ['B', 'Wyjdzie. Musi wyjść.']] },
      { bt: 'greedy', l: [['B', 'Mam nadzieję, że {An} nie miał{A:|a} przy sobie naszego złota.'], ['C', 'Serio? Teraz?']] }
    ],
    'trap:cage': [
      { l: [['B', 'Trzymaj się, {Av}, wyciągniemy cię!'], ['A', 'Szybciej, tu jest ciasno!']] },
      { bt: ['greedy', 'coward'], l: [['B', 'Może tam zostanie? Mniej gęb do dzielenia łupu.'], ['A', 'Słyszał{em|am} to!']] },
      { b: 'thief', l: [['B', 'Prosty zamek. Daj mi chwilę.'], ['A', 'Chwil mam tu aż nadto.']] }
    ],
    scare: [
      { l: [['B', 'Spokojnie, to tylko sztuczki.'], ['A', 'To czemu ty też się trzęsiesz?']] },
      { bt: 'brave', l: [['B', 'Boisz się starych gratów, {Av}?'], ['A', 'Nie boję się! Tylko... uważam.']] },
      { b: 'priest', l: [['B', 'Czuję tu coś złego. Trzymajcie się blisko.'], ['A', 'Bliżej się nie da.']] },
      { at: 'coward', l: [['B', 'To nic takiego, {Av}.'], ['A', 'Dla ciebie nic! Ja widział{em|am}, jak się ruszało!']] }
    ],
    'trap:portrait': [
      { l: [['B', 'To tylko obraz, {Av}.'], ['A', 'Obraz, który mruga?!'], ['B', '...Chodźmy dalej.']] }
    ],
    hurt: [
      { l: [['B', 'Wytrzymasz?'], ['A', 'Muszę.']] },
      { b: 'priest', l: [['B', 'Zaraz to opatrzę.'], ['A', 'Dzięki. Tylko się pospiesz.']] }
    ],
    disarmDone: [
      { l: [['B', 'Ładnie, {Av}.'], ['A', 'Wiem.']] },
      { l: [['B', 'Skąd ty to umiesz?'], ['A', 'Nie pytaj, a nie skłamię.']] },
      { bt: 'careful', l: [['B', 'Na pewno rozbrojone?'], ['A', 'Na pewno. Prawie na pewno.'], ['B', 'Prawie?!']] },
      { bt: 'brave', l: [['B', 'Szkoda. Chciał{em|am} sprawdzić, czy wytrzymam.'], ['A', 'Następną zostawię dla ciebie.']] },
      { l: [['B', 'Jeden problem mniej.'], ['A', 'A ile jeszcze przed nami?'], ['C', 'Lepiej nie liczyć.']] }
    ],
    disarmFail: [
      { l: [['B', 'Co znaczy „ups”?!'], ['A', 'Nic! Nic nie znaczy!']] },
      { l: [['B', 'Ty w ogóle wiesz, co robisz?'], ['A', 'Wiem. Ten drut był krzywy.']] },
      { bt: 'coward', l: [['B', 'Następnym razem uprzedź, odsunę się!'], ['A', 'Gdybym wiedział{|a}, sam{|a} bym się odsunął{|a}.']] },
      { l: [['B', 'Mistrz rozbrajania, panie i panowie.'], ['A', 'Każdemu się zdarza.'], ['C', 'Tobie jakoś często.']] }
    ],
    disarmHit: [
      { l: [['B', 'Prawie to za mało, {Av}.'], ['A', 'Wiem. Następna będzie moja.']] },
      { b: 'priest', l: [['B', 'Pokaż rękę.'], ['A', 'Nic mi nie jest. Prawie.']] }
    ],
    dodge: [
      { l: [['B', 'Niezły unik!'], ['A', 'Lata praktyki.']] },
      { bt: ['greedy', 'brave'], l: [['B', 'Ale szczęście, {Av}.'], ['A', 'Szczęście sprzyja zdolnym.']] },
      { at: 'coward', l: [['B', '{A:Szybki|Szybka} jesteś, jak trzeba uciekać.'], ['A', 'To nie ucieczka. To taktyka.']] }
    ],
    shield: [
      { l: [['B', 'Dzięki, {Av}!'], ['A', 'Od tego jestem.']] },
      { bt: 'coward', l: [['B', 'Stoję za tobą. Bardzo za tobą.'], ['A', 'Widzę.']] },
      { l: [['B', 'Ta tarcza widziała już niejedno.'], ['A', 'I jeszcze niejedno zobaczy.']] }
    ],
    heal: [
      { l: [['B', 'Dobrze mieć cię w drużynie, {Av}.'], ['A', 'Przypomnij to sobie przy podziale łupu.']] },
      { l: [['B', 'Twoje światło grzeje.'], ['A', 'To nie moje. Ja je tylko pożyczam.']] },
      { bt: ['brave', 'greedy'], l: [['B', 'Starczy, zostaw trochę na później.'], ['A', 'Na później to ty wpadniesz w następną pułapkę.']] }
    ],
    fireball: [
      { l: [['B', 'Ej, uważaj z tym ogniem!'], ['A', 'Gdybym chciał{|a} w ciebie trafić, już byś się palił{B:|a}.']] },
      { b: ['warrior', 'barbarian'], l: [['B', 'Zostaw coś dla mnie!'], ['A', 'Nie nadążasz, to twój problem.']] },
      { l: [['B', 'Pachnie pieczenią.'], ['A', 'Nie pytaj, czyją.']] }
    ],
    fight: [
      { l: [['B', 'Pomóc ci, {Av}?'], ['A', 'Sam{|a} dam radę!']] },
      { bt: 'coward', l: [['B', 'Ja popilnuję tyłów.'], ['A', 'Jasne. Tyłów.']] },
      { l: [['B', 'Tylko nie daj się zjeść!'], ['A', 'Nie zamierzam.']] }
    ],
    monsterDown: [
      { l: [['A', 'Jeden mniej!'], ['B', 'Nieźle, {Av}!']] },
      { l: [['B', 'Ładny cios, {Av}.'], ['A', 'Następny!']] },
      { bt: 'careful', l: [['A', 'Załatwione.'], ['B', 'Nie ciesz się. Gdzie jeden, tam więcej.']] },
      { at: 'brave', l: [['A', 'Kto następny?!'], ['B', 'Nie wywołuj wilka z lasu.']] },
      { l: [['A', 'Leży.'], ['B', 'I niech leży.'], ['C', 'Brzydkie to było.']] }
    ],
    loot1: [
      { l: [['B', 'Zostaw, to może być pułapka.'], ['A', 'Wszystko tu może być pułapką.']] },
      { bt: 'greedy', l: [['B', 'Dzielimy się po połowie, {Av}.'], ['A', 'Jasne. Po mojej połowie.']] }
    ],
    loot2: [
      { l: [['B', 'Ostrożnie z tym, {Av}.'], ['A', 'Ostrożność to moje drugie imię.'], ['C', 'Pierwsze to chyba „chciwość”.']] },
      { bt: 'greedy', l: [['B', 'Ja to pierws{zy|za} zobaczył{em|am}!'], ['A', 'Ale ja pierws{zy|za} wezmę.']] }
    ],
    loot3: [
      { l: [['B', 'Widzę! Tylko spokojnie...'], ['A', 'Spokojnie?! To legenda!']] },
      { bt: 'careful', l: [['B', 'Za piękne, żeby było prawdziwe.'], ['A', 'To sprawdźmy!'], ['B', 'Ty sprawdź.']] }
    ],
    gold: [
      { l: [['B', 'Dużo tego?'], ['A', 'Starczy na piwo. Dla mnie.']] },
      { bt: 'greedy', l: [['B', 'A dla mnie?'], ['A', 'Znajdź sobie własne.']] },
      { b: 'priest', l: [['B', 'Chciwość to grzech, {Av}.'], ['A', 'To pomódl się za mnie.']] }
    ],
    goldHeavy: [
      { l: [['B', 'Może się podzielisz? Będzie ci lżej.'], ['A', 'Dźwigam i nie narzekam.']] }
    ],
    cursedPick: [
      { b: 'priest', l: [['B', 'Rzuć to! Ten skarb jest przeklęty!'], ['A', 'Nie mogę... Nie chcę.']] },
      { l: [['B', '{Av}, coś ty podniósł{A:|a}?'], ['A', 'Nic. Moje. Nie patrz.']] }
    ],
    panic: [
      { l: [['B', '{Av}, wracaj!'], ['C', 'Zostaw. Wróci, jak ochłonie.']] },
      { bt: 'brave', l: [['B', 'Tchórz!'], ['C', 'Każdy się kiedyś boi.']] },
      { bt: 'coward', l: [['B', '{An} ma rację, trzeba stąd uciekać!'], ['C', 'Nikt nigdzie nie ucieka!']] }
    ],
    found: [
      { l: [['B', '{Av}! Gdzie ty się podziewał{A:eś|aś}?'], ['A', 'Nie pytaj. Ciemno było.']] },
      { l: [['B', 'Myśleliśmy, że już po tobie.'], ['A', 'Ja też tak myślał{em|am}.']] },
      { bt: 'greedy', l: [['B', 'Wrócił{A:eś|aś}? A już dzieliliśmy twoje rzeczy.'], ['A', 'Bardzo zabawne.'], ['C', 'To nie był żart.']] }
    ],
    landed: [
      { l: [['B', '{Av}! Żyjesz! Jak tam na dole?'], ['A', 'Ciemno i mokro. Nie polecam.']] }
    ],
    freed: [
      { l: [['B', 'Mówił{em|am}, że cię wyciągnę.'], ['A', 'Jestem ci win{ien|na}.']] },
      { l: [['B', 'Następnym razem patrz, gdzie stajesz.'], ['A', 'Dobrze, mamo.']] },
      { bt: 'greedy', l: [['B', 'To będzie kosztowało, {Av}.'], ['A', 'Wiedział{em|am}, że nic nie jest za darmo.']] }
    ],
    slip: [
      { l: [['B', 'Ha! Jak na łyżwach!'], ['A', 'Zamiast się śmiać, łap mnie!']] },
      { l: [['B', 'Kto tu tak wylał wodę?'], ['A', 'To nie woda, to lód!']] }
    ],
    nap: [
      { l: [['B', 'Tylko nie chrap.'], ['A', 'Ja nigdy nie chrapię.'], ['C', 'Chrapiesz.']] },
      { bt: 'careful', l: [['B', 'Śpij. Popilnuję.'], ['A', 'Obudź mnie, jak coś się ruszy.']] }
    ],
    nightmare: [
      { l: [['B', 'Też to słyszysz?'], ['A', 'Słyszę. I wolał{bym|abym} nie słyszeć.']] }
    ],
    phobia: [
      { l: [['B', 'Spokojnie, {Av}. Oddychaj.'], ['A', 'Oddycham! To nie pomaga!']] }
    ],
    'phobia:spiders': [
      { l: [['B', 'To tylko pająk, {Av}.'], ['A', 'Tylko?! Ma osiem nóg!']] }
    ],
    'phobia:fire': [
      { l: [['B', 'Ogień jest daleko, {Av}.'], ['A', 'Za blisko. Zawsze jest za blisko.']] }
    ],
    'phobia:closed': [
      { l: [['B', 'Oddychaj. Zaraz stąd wyjdziemy.'], ['A', 'Obiecujesz?'], ['B', 'Obiecuję.']] }
    ],
    'phobia:ghosts': [
      { l: [['B', 'Duchów nie ma, {Av}.'], ['A', 'To kto mnie przed chwilą dotknął?!']] }
    ],
    'phobia:blood': [
      { l: [['B', 'Nie patrz na to. Patrz na mnie.'], ['A', 'Dobrze... Dobrze.']] }
    ],
    'phobia:dark': [
      { l: [['B', 'Jestem tu, {Av}. Słyszysz? Jestem tu.'], ['A', 'Nie odchodź.']] }
    ],
    weakHit: [
      { l: [['B', 'Znowu to samo, {Av}?'], ['A', 'Stare rany. Nie gadajmy o tym.']] }
    ],
    resistHit: [
      { l: [['B', 'Z czego ty jesteś zrobion{A:y|a}?'], ['A', 'Z gorszych lochów niż ten.']] }
    ],
    smash: [
      { l: [['B', 'Można było otworzyć.'], ['A', 'Można było. Tak szybciej.']] },
      { b: 'thief', l: [['B', 'Miał{em|am} wytrych!'], ['A', 'A ja topór.']] }
    ],
    rage: [
      { l: [['B', 'Nie stój {A:mu|jej} na drodze.'], ['C', 'Nie zamierzam.']] }
    ],
    song: [
      { l: [['B', 'Tylko nie ta ballada znowu...'], ['A', 'Ta jest nowa! Prawie.']] },
      { bt: 'brave', l: [['B', 'Głośniej! Niech cały loch słyszy!'], ['A', 'Dla ciebie wszystko.']] },
      { bt: 'coward', l: [['B', 'Ciszej! Wszystko nas usłyszy!'], ['A', 'Muzyka dodaje odwagi.'], ['B', 'Mnie nie dodaje.']] }
    ],
    bless: [
      { l: [['B', 'Dzięki, {Av}. Ten obraz mnie przerażał.'], ['A', 'Mnie też. Dlatego go odczynił{em|am}.']] }
    ],
    potion: [
      { l: [['B', 'Zostaw mi łyk.'], ['A', 'Za późno.']] }
    ],
    rookieBoast: [
      { bv: 2, l: [['B', 'Każdy tak mówi na początku.'], ['A', 'Ja naprawdę dam radę!'], ['B', 'Zobaczymy.']] },
      { l: [['B', 'Trzymaj się blisko mnie, {A:młody|młoda}.'], ['A', 'Nie potrzebuję niańki!']] }
    ],
    vetWarn: [
      { br: 1, l: [['B', 'Przecież uważam!'], ['A', 'Za mało.']] },
      { br: 1, l: [['B', 'Skąd miał{em|am} wiedzieć?'], ['A', 'Patrzysz pod nogi, to wiesz.']] }
    ],
    ghost: [
      { l: [['B', 'Ja nic nie widzę.'], ['A', 'Bo ty nigdy nic nie widzisz!']] },
      { b: 'priest', l: [['B', 'Stój za mną. Duchy nie lubią światła.'], ['A', 'Ja też nie lubię duchów.']] }
    ],
    bats: [
      { l: [['B', 'Machaj rękami!'], ['A', 'Macham! Nie pomaga!']] }
    ],
    spider: [
      { l: [['B', 'Zgnieć go!'], ['A', 'Ty go zgnieć!']] }
    ],
    detect: [
      { l: [['B', 'Dobre oko, {Av}.'], ['A', 'Dlatego mnie zabraliście.']] },
      { bt: 'greedy', l: [['B', 'A skarbu przypadkiem nie widzisz?'], ['A', 'Skarbu nie. Tylko kłopoty.']] }
    ],
    learn: [
      { l: [['B', 'Zapamiętam. Bolało.'], ['A', 'O to chodzi.']] }
    ],
    cowardRun: [
      { l: [['B', 'Wracaj, tchórzu!'], ['C', 'Niech idzie. Więcej łupu dla nas.']] }
    ],
    cautious: [
      { bt: ['brave', 'greedy'], l: [['B', 'Krok po kroku to my tu zanocujemy.'], ['A', 'Lepiej zanocować, niż zostać tu na zawsze.']] }
    ],
    lull: [
      { l: [['B', 'Zatkaj uszy!'], ['A', 'Wtedy nie usłyszę pułapek!']] }
    ],
    charmUse: [
      { l: [['B', 'Skąd masz takie cacko?'], ['A', 'Z poprzedniego lochu. Z poprzedniego właściciela.']] }
    ],
    cleanse: [
      { l: [['B', 'Szybciej, płonę!'], ['A', 'Stój spokojnie, to szybciej zgaśnie!']] }
    ],
    enter: [
      { l: [['B', 'Ostatnim razem też tak mówił{A:eś|aś}.'], ['A', 'I ostatnim razem wrócił{em|am}.']] },
      { bt: 'coward', l: [['B', 'Ja idę na końcu.'], ['C', 'Ty zawsze idziesz na końcu.']] },
      { bt: 'greedy', l: [['B', 'Byle szybko. Złoto samo się nie zbierze.'], ['A', 'Najpierw przeżyj, potem zbieraj.']] },
      { bt: 'careful', l: [['B', 'Patrzcie pod nogi. I na ściany.'], ['A', 'I na sufit, jak już przy tym jesteśmy.']] }
    ],
    champion: [
      { l: [['B', 'Skromności to ci nie brakuje.'], ['A', 'Skromni nie wracają z kryształem.']] }
    ],
    rookie: [
      { bv: 1, l: [['B', 'Niczego nie dotykaj, {Av}.'], ['A', 'Ale ja tylko...'], ['B', 'Niczego.']] },
      { l: [['B', 'Łatwizna, mówi. Zobaczymy za godzinę.'], ['A', 'Za godzinę będę bogat{y|a}!']] }
    ],
    elite: [
      { br: 0, l: [['B', 'Po co tak wolno?'], ['A', 'Bo chcę stąd wyjść. W całości.']] }
    ],
    explore: [
      { bt: 'careful', l: [['B', 'Na pewno tędy?'], ['A', 'Na pewno. Prawie.']] },
      { bt: 'coward', l: [['B', 'A może jednak tamtędy? Tam jest... ciszej.'], ['A', 'Tędy.']] }
    ],
    timing: [
      { l: [['B', 'Skąd wiesz, kiedy biec?'], ['A', 'Liczę. Raz, dwa... teraz.']] },
      { l: [['B', 'A jak się pomylisz?'], ['A', 'To dowiesz się pierws{B:zy|za}.']] }
    ],
    heartSeen: [
      { l: [['B', 'Wreszcie! Bierzemy i wychodzimy.'], ['C', 'Mówisz, jakby to było takie proste.']] },
      { bt: 'greedy', l: [['B', 'Tyle bogactwa w jednym miejscu...'], ['A', 'Najpierw przeżyć, potem liczyć.']] }
    ],
    assault: [
      { l: [['B', 'Za tobą!'], ['C', 'Wszyscy za tobą!']] },
      { bt: 'coward', l: [['B', 'Może jednak nie?'], ['A', 'Za późno. Naprzód!']] }
    ],
    steal: [
      { l: [['B', 'Biegiem, zanim loch się obudzi!'], ['C', 'On już nie śpi.']] },
      { bt: 'greedy', l: [['B', 'Daj, poniosę!'], ['A', 'Akurat. Sam{|a} poniosę.']] }
    ],
    retreat: [
      { bt: 'brave', l: [['B', 'Uciekamy? Serio?'], ['A', 'Wracamy. Na chwilę. Opatrzymy się i znowu ruszamy.']] },
      { bt: ['coward', 'careful'], l: [['B', 'Wreszcie ktoś rozsądny.'], ['A', 'Nie przyzwyczajaj się.']] }
    ],
    restDone: [
      { l: [['B', 'Już? Dopiero usiadł{em|am}.'], ['A', 'Wstawaj. Kryształy same nie przyjdą.']] }
    ],
    bootsUse: [
      { l: [['B', 'Zaczekaj na nas!'], ['A', 'Nie mogę, buty same niosą!']] }
    ],
    rumor: [
      { l: [['B', 'W karczmie mówią różne rzeczy.'], ['A', 'Tym razem chyba nie kłamali.']] }
    ],
    fame2: [
      { bt: 'brave', l: [['B', 'Tym lepiej. Będzie o nas pieśń.'], ['C', 'Raczej nagrobek.']] }
    ],
    alone: [
      { l: [['B', 'Tu jestem, {Av}! Idź na mój głos!'], ['A', 'Idę! Nie ruszaj się!']] }
    ],
    seenBuilt: [
      { l: [['B', 'Ściany się nie ruszają, {Av}.'], ['A', 'Te tutaj się ruszają!'], ['C', 'Ten loch żyje...']] }
    ],
    gateWait: [
      { bt: 'brave', l: [['B', 'Może ją wyważymy?'], ['A', 'Spróbuj. Popatrzę.']] }
    ],
    crystalDrop: [
      { l: [['B', 'Jak można zgubić kryształ?!'], ['C', 'Krzycz dalej, to na pewno pomoże.']] }
    ],
    barrier: [
      { l: [['B', 'Przyda się, {Av}.'], ['A', 'Długo nie wytrzyma. Ruszajmy.']] }
    ]
  };
  const CONVO_ALIAS = { 'trap:eyes': 'scare', 'trap:bones': 'scare', 'trap:mirror': 'scare', 'trap:creak': 'scare', 'trap:coffin': 'scare', 'trap:musicbox': 'scare' };
  const CONVO_P = { trap: 0.5, 'trap:trapdoor': 0.8, 'trap:cage': 0.8, 'trap:web': 0.65, scare: 0.65, hurt: 0.15, disarmDone: 0.8, disarmFail: 0.9, disarmHit: 0.8,
    dodge: 0.65, shield: 0.45, heal: 0.4, fireball: 0.5, fight: 0.3, monsterDown: 0.65, loot1: 0.4, loot2: 0.65, loot3: 0.9, gold: 0.5, goldHeavy: 0.65,
    cursedPick: 0.9, panic: 0.65, found: 0.9, landed: 0.8, freed: 0.9, slip: 0.5, nap: 0.65, nightmare: 0.65, phobia: 0.9, weakHit: 0.5, resistHit: 0.5,
    smash: 0.65, rage: 0.65, song: 0.65, bless: 0.8, potion: 0.4, rookieBoast: 0.9, vetWarn: 0.9, ghost: 0.65, bats: 0.65, spider: 0.65, detect: 0.45, learn: 0.4,
    cowardRun: 0.9, cautious: 0.8, lull: 0.65, charmUse: 0.5, cleanse: 0.8, barrier: 0.5 , enter: 0.4, champion: 0.5, rookie: 0.5, elite: 0.5, explore: 0.25, timing: 0.5, heartSeen: 0.7, assault: 0.4, steal: 0.6, retreat: 0.6,
    restDone: 0.5, bootsUse: 0.5, rumor: 0.5, fame2: 0.6, alone: 0.6, seenBuilt: 0.7, gateWait: 0.6, crystalDrop: 0.8 };
  const gtext = (t, female) => t.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => female ? f : m);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const nameFill = (t, h) => t.replace('{n}', h.nm[0]).replace('{a}', h.nm[1]).replace('{v}', h.nm[2]);
