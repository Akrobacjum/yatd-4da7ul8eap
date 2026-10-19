
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
    essenceCap: 40, crystals: 3, comboWin: 3.5, checkDiff: 1, ffSpeed: 3, thrBase: 1500, depthMax: 2.4, volume: 0.6, hungerBase: 20, hungerGrowth: 1.25, greedW: 1.0, autoFF: 2.5, earlyHp: 1,
    haptics: 1, trayAuto: 1, series: 1   // game settings (0/1): vibration, tray folds during a wave, one check for a volley
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
    { k: 'hungerBase', label: 'Głód serca: Esencja z fali 2', min: 0, max: 80, step: 1 },
    { k: 'hungerGrowth', label: 'Głód serca: wzrost progu na falę', min: 1.2, max: 2, step: 0.05, fmt: x2 },
    { k: 'greedW', label: 'Chciwość: poziomy przywódcy za każde +1 chciwości', min: 0, max: 3, step: 0.1, fmt: v => v.toFixed(1).replace('.', ',') },
    { k: 'crystals', label: 'Kryształy w sercu (od nowego runu)', min: 1, max: 6, step: 1 },
    { k: 'deckSize', label: 'Miejsca w talii (od nowego runu)', min: 3, max: 12, step: 1 },
    { k: 'comboWin', label: 'Okno combo (s)', min: 1, max: 6, step: 0.5, fmt: f1 },
    { k: 'thrBase', label: 'Pierwszy próg karty (pkt)', min: 500, max: 5000, step: 100 },
    { k: 'depthMax', label: 'Mnożnik pokoju z sercem', min: 1, max: 5, step: 0.1, fmt: x1 }
  ];
  const GAME_SETTINGS = [
    { k: 'volume', label: 'Głośność', min: 0, max: 1, step: 0.1, fmt: v => Math.round(v * 100) + '%' },
    { k: 'haptics', label: 'Wibracje (telefony z Androidem)', toggle: true },
    { k: 'series', label: 'Seria: jeden skill check na kilka pułapek naraz', toggle: true },
    { k: 'trayAuto', label: 'Chowaj pasek elementów w trakcie fali', toggle: true },
    { k: 'checkDiff', label: 'Trudność skill checków', min: 0.6, max: 1.8, step: 0.1, fmt: x1 },
    { k: 'autoFF', label: 'Auto-przyspieszenie, gdy nic się nie dzieje (1 = wyłączone)', min: 1, max: 4, step: 0.5, fmt: x1 },
    { k: 'ffSpeed', label: 'Przyspieszenie (przytrzymanie palca)', min: 2, max: 6, step: 0.5, fmt: x1 }
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
    r_vault: { name: 'Sezam', cost: 10, slot: 'roomtype', tag: 'łup ×2', tool: true, rt: 'vault', desc: 'Sezam (pokój): łup podbija chciwość 2 razy mocniej i kusi 1,5 raza bardziej, mnożnik pokoju +0,15. Stuknij znacznik pokoju.' }
  };
  const TABS = [
    // Prototype 1.01 (author's layout): what wounds and what scares together, every monster in one tab, loot apart,
    // Obiekty = what stands in a room like a crate (the crate and the counter-buildings), Loch = digging and room types.
    { id: 'traps', label: 'Pułapki', items: ['spikes', 'arrows', 'web', 'trapdoor', 'cage', 'fire', 'gate', 'powder', 'mimic', 'portrait', 'eyes', 'bones', 'mirror', 'creak', 'coffin', 'musicbox'] },
    { id: 'monster', label: 'Potwory', items: ['goblin', 'archer', 'spider', 'ogre', 'shaman', 'ghost', 'shade', 'bats'] },
    { id: 'loot', label: 'Łup', items: ['loot', 'lpotion', 'loot2', 'loot3', 'lcursed'] },
    { id: 'object', label: 'Obiekty', items: ['crate', 'rune', 'altar', 'decoy', 'acid', 'veil', 'fortify'] },
    { id: 'dungeon', label: 'Loch', items: ['dig', 'tunnel', 'expand', 'demolish', 'r_fog', 'r_swamp', 'r_grotto', 'r_crypt', 'r_vault'] },   // no Przenieś (a tap moves), no Ulepsz (a double tap upgrades)
    { id: 'deck', label: 'Talia', items: [] }
  ];
  const ITEM_ORDER = TABS.flatMap(t => t.items).concat(['upgrade']);   // Ulepsz stays as a mode the code knows, with no tile in any tab
  const START_UNLOCKED = ['spikes', 'trapdoor', 'arrows', 'portrait', 'eyes', 'bones', 'gate', 'crate', 'powder', 'goblin', 'archer', 'loot', 'lpotion', 'loot2', 'loot3', 'lcursed', 'dig', 'tunnel', 'expand', 'demolish', 'rune', 'altar', 'decoy', 'acid', 'veil', 'fortify', 'upgrade', 'move',
    'r_fog', 'r_swamp', 'r_grotto', 'r_crypt', 'r_vault'];
  const TRAPS = { spikes: 1, web: 1, trapdoor: 1, cage: 1, arrows: 1, fire: 1, portrait: 1, gate: 1, powder: 1, mimic: 1, eyes: 1, bones: 1, mirror: 1, creak: 1, coffin: 1, musicbox: 1 };
  const MONSTERS = { goblin: 1, archer: 1, spider: 1, ogre: 1, shaman: 1, ghost: 1, shade: 1, bats: 1 };
  // v15.1: traps that only scare (no wounds), the cursed ones a priest lifts (the thief and bombs leave them alone),
  // and monsters that float after the heroes (never block the way, never fight hand to hand)
  const SCARE = { portrait: 1, eyes: 1, bones: 1, mirror: 1, creak: 1, coffin: 1, musicbox: 1 };
  const CURSED = { portrait: 1, eyes: 1, bones: 1, mirror: 1 };
  const DRIFT = { ghost: 1, shade: 1, bats: 1 };
  const ROOMTYPES = { r_fog: 'fog', r_swamp: 'swamp', r_grotto: 'grotto', r_crypt: 'crypt', r_vault: 'vault' };
  const RT_INFO = { fog: { name: 'Mgła', item: 'r_fog', glyph: '≋', color: '#b9c4d8' }, swamp: { name: 'Bagno', item: 'r_swamp', glyph: '~', color: '#8fbf6a' }, grotto: { name: 'Grota', item: 'r_grotto', glyph: ')', color: '#9fb6ff' },
    crypt: { name: 'Krypta', item: 'r_crypt', glyph: '✝', color: '#c9b6e8' }, vault: { name: 'Sezam', item: 'r_vault', glyph: '◆', color: '#ffd27a' } };
  const TOOLS = { dig: 1, tunnel: 1, expand: 1, demolish: 1, r_fog: 1, r_swamp: 1, r_grotto: 1, r_crypt: 1, r_vault: 1 };
  const MODES = { upgrade: 1, move: 1 };   // tray buttons that change what a tap on the map does (no cost of their own)
  const ACTIVE = Object.assign({}, TRAPS, MONSTERS);   // everything that can fire
  // Loot comes in kinds the player picks: coins (pure greed), a potion (a lure for the wounded), gear, a relic, a cursed treasure.
  // rarity = how far it can be seen from (1: the same room, 2: the next room, 3: across the dungeon).
  const LOOT_KIND = { loot: 'gold', lpotion: 'potion', loot2: 'gear', loot3: 'relic', lcursed: 'cursed' };
  const LOOT_GREED = { gold: [0.08, 0.06], potion: [0.03, 0.02], gear: [0.15, 0.08], relic: [0.35, 0.15], cursed: [0.15, 0.08] };   // [seen, picked up]
  const isLoot = t => !!LOOT_KIND[t];
  const RARITY_NAME = ['', 'zwykły', 'rzadki', 'legendarny'];
  const RARITY_COLOR = ['#f2b94b', '#f2b94b', '#6fb7ff', '#ff8a3c'];
  const LOOT_COLOR = { loot: '#f2b94b', lpotion: '#8be38f', loot2: '#6fb7ff', loot3: '#ff8a3c', lcursed: '#b48cff' };
  const SIZE_BONUS = 0.05;   // Rozległość lochu: +0,05 greed for every room over 5 (v14: everything global is greed)
  const DISARMABLE = { spikes: 1, web: 1, trapdoor: 1, cage: 1, gate: 1, arrows: 1, fire: 1, powder: 1, decoy: 1, creak: 1, coffin: 1, musicbox: 1 };
  // Counter-buildings: placed between waves on a room floor, take a slot, one of each kind per room.
  const BUILDINGS = { rune: 1, altar: 1, decoy: 1, acid: 1, veil: 1, fortify: 1 };
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
  const CLASS_RES = { warrior: { pierce: 0.75, blunt: 1.25 }, thief: { fire: 1.25, poison: 0.75 }, priest: { pierce: 1.1, fire: 0.85, poison: 0.85 }, mage: { pierce: 1.25, blunt: 1.1, fire: 0.7 } };
  const CLASS_RES_TEXT = { warrior: 'płyty: kłute -25%, obuchowe +25%', thief: 'skóra: ogień +25%, trucizna -25% (odtrutki)', priest: 'szaty i modlitwa: kłute +10%, ogień -15%, trucizna -15%', mage: 'szata i bariera: kłute +25%, obuchowe +10%, ogień -30%' };
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
    warrior: { name: ['Wojownik', 'Wojowniczka'], hp: 120, speed: 1.5, dps: 18, color: '#cdd6ea', letter: 'W', greed: 0.6 },
    thief: { name: ['Złodziej', 'Złodziejka'], hp: 70, speed: 1.9, dps: 10, color: '#9be37a', letter: 'Z', greed: 1.5 },
    priest: { name: ['Kapłan', 'Kapłanka'], hp: 80, speed: 1.3, dps: 6, color: '#ffe9a8', letter: 'K', greed: 0.9 },
    mage: { name: ['Mag', 'Czarodziejka'], hp: 65, speed: 1.3, dps: 8, color: '#b9a4ff', letter: 'M', greed: 1.0 }
  };
  const PARTY = ['warrior', 'thief', 'priest', 'mage'];
  const LEADER_ORDER = ['warrior', 'priest', 'mage', 'thief'];
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
  const KIT = { warrior: { potion: 3, charm: 3, bomb: 2, amulet: 1 }, thief: { boots: 3, amulet: 2, potion: 2, bomb: 1 }, priest: { potion: 3, amulet: 3, charm: 2 }, mage: { bomb: 3, potion: 2, amulet: 2, charm: 1 } };
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
    { id: 'nopick', kind: 'card', rar: 'l', unique: true, tag: 'chciwość ×2,5', name: 'Odwrotna chciwość', text: 'Bohaterowie nigdy nie zabierają łupu, a zobaczony łup podbija chciwość 2,5 raza mocniej.', apply: m => { m.noPickup = true; } },
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
    prepStart: ['Stop. Za tymi drzwiami jest pokój śmierci.', 'Słyszeliśmy o tym pokoju. Przygotujmy się.', 'Tam czeka masa pułapek. Plan!'],
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
    bRune: ['Runa! Moje zaklęcia tu nie sięgają.', 'Ten kamień zjada magię...'],
    bAltar: ['Bluźnierczy ołtarz... moja modlitwa tu nie sięga!', 'To miejsce jest przeklęte, bogowie mnie nie słyszą.'],
    bAcid: ['Kwas! Tarcza mi się topi!', 'Ten opar przeżera osłony...'],
    bVeil: ['Tego pokoju nie było w opowieściach...', 'Nikt nam nie mówił o tym miejscu!'],
    bDecoy: ['To była zmyłka!', 'Pułapka w pułapce!', 'Alarm! Wszystko odpala!'],
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
    friendLow: ['Trzymaj się, {n}!', '{n}, wycofaj się!', 'Osłońcie {a}!']
  };
  const gtext = (t, female) => t.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => female ? f : m);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const nameFill = (t, h) => t.replace('{n}', h.nm[0]).replace('{a}', h.nm[1]).replace('{v}', h.nm[2]);
