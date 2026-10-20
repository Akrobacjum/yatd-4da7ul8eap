
  /* ================= scoring helpers ================= */
  function isEdgeRoom(r) { return fl.rooms[r].dist >= fl.maxD - 1; }
  function depthMult(r) {
    if (r < 0 || !fl.rooms[r]) return 1;
    const R = fl.rooms[r];
    return 1 + (S.depthMax - 1) * R.dist / fl.maxD + (isEdgeRoom(r) ? mods.depthBonus : 0) + (R.rt === 'vault' ? 0.15 : 0);
  }
  // Points, like Balatro: every wound, every scare, every kill and every hero scared away adds to the wave's GROZA (the base,
  // how deadly and scary the dungeon is); at the end the whole Groza is multiplied by CHCIWOŚĆ (the mult, how tempting it is).
  // The Esencja a wave brings is FOOD. Prototype 1.01 (author's decision): from wave 2 the heart takes its need out of
  // THIS wave's Esencja first (hungerNeed(n), much higher than the old hunger); only the rest goes to your purse. A wave that
  // brings less: the heart eats what it got and a crystal. No store, no purse limit: like a Balatro blind, the wave's score is
  // the goal, so you want the heroes to stay in the dungeon, not to throw them out at once.
  const hungerNeed = n => (run && run.tutorial) || n < 2 || !(S.hungerBase > 0) ? 0 :
    Math.max(1, Math.round(S.hungerBase * Math.pow(S.hungerGrowth, n - 2) * ((mods && mods.hungerK) || 1) - (run.stacks.granary || 0) * ((mods && mods.granary) || 0)));   // Spichlerz dusz: every kill feeds it for good
  // extra levels of the leader from greed. Up to 1.02 at most 3, so greed 23 was as safe as greed 4 (the author's run: 42 798
  // Esencja). 1.03: no ceiling, but past 4 it creeps up slowly (6: +3,7, 8: +4,2, 12: +5,0, 23: +6,1).
  const greedLv = g => g <= 4 ? Math.max(0, g - 1) : 3 + 1.8 * Math.log(g / 4);
  const huntersLv = () => S.greedW * greedLv(run.greedRep || 1);
  // treasure hunters replacing ordinary heroes: 1 from greed 3, 2 from 4,5, then one more each time greed doubles (9, 18...)
  const huntersN = g => g < 3 ? 0 : g < 4.5 ? 1 : 2 + Math.max(0, Math.floor(Math.log2(g / 4.5)));
  // g = the Groza of one event. Prototype 1.01, the combo like Balatro: Groza piles up while the combo lasts (the CHAIN) and is
  // cashed in when it ends: chain Groza x Chciwość x the chain's final Combo (Żyła esencji on top). A chain with no trap behind
  // it (a lost hero, a ghost's aura) closes after 1,2 s of quiet. fl.base = Groza of the wave, fl.score = Esencja the wave
  // brought (heart's share included), run.total = the harvest of the run.
  // addPts returns what the event is worth at the multipliers now (the stats per element use it); the chain pays at least that,
  // the extra from the combo working backwards is booked as 'comboPts'.
  const comboLive = () => !!fl && fl.cclock - fl.lastTrapC < (fl.comboWinNow || S.comboWin);
  function addPts(g, stat, h) {
    if (!(g > 0) || !fl) return 0;
    const cm = 1 + 0.25 * (comboNow() - 1);
    const e = g * fl.greed * cm * mods.regen;
    fl.base += g;
    let C = fl.chain;
    if (!C) C = fl.chain = { g: 0, prov: 0, cm: 1, greed: fl.greed, t0: fl.time, last: fl.time, trap: false, who: new Map(), n: 0 };
    C.g += g; C.prov += e; C.last = fl.time; C.n++; C.cm = Math.max(C.cm, cm); C.greed = Math.max(C.greed, fl.greed);
    if (comboLive()) C.trap = true;
    if (h && h.id != null) { C.who.set(h.id, (C.who.get(h.id) || 0) + g); h.accG = (h.accG || 0) + g; grozaOrbs(h, g); }   // the numbers over the heroes show Groza now (violet); 1.02: violet orbs fly to the equation
    if (stat) fl.stats[stat] = (fl.stats[stat] || 0) + e;
    return e;
  }
  // the chain ends: a trap chain when the combo clock runs out, a chain without a trap after 1,2 s without Groza (at most 4 s)
  function chainTick() {
    const C = fl.chain; if (!C) return;
    if (C.trap ? !comboLive() : (fl.time - C.last > 1.2 || fl.time - C.t0 > 4)) payChain();
  }
  let payN = 0;
  function payChain() {
    const C = fl && fl.chain; if (!C) return 0;
    fl.chain = null;
    const e = C.g * C.greed * C.cm * mods.regen;
    fl.stats.comboPts = (fl.stats.comboPts || 0) + Math.max(0, e - C.prov);
    fl.score += e;
    fl.lastPay = { g: C.g, greed: C.greed, cm: C.cm, e, t: fl.time, n: ++payN };
    if (C.cm > 1 || e >= 1) tl('cp', Math.round(C.g * 100) / 100, Math.round(C.cm * 100) / 100, Math.round(e * 10) / 10);
    essIn(e, C.who);
    if (e >= 1) tutPop('pay');
    return e;
  }
  // Esencja comes in: the hungry heart takes its share first, the rest goes to the purse (Obżarstwo: x1,25 once it is fed)
  function essIn(e, who) {
    if (!(e > 0)) return;
    const need = hungerNeed(run.wave);
    let heart = 0;
    if (need > 0 && fl.fed < need) {
      heart = Math.min(e, need - fl.fed); fl.fed += heart;
      if (fl.fed >= need - 1e-6) { fl.fed = need; fl.fedAt = fl.time; tl('hg', 'full', need); floatTile(fl.heart.x, fl.heart.y, 'Serce syte!', '#ff9aa4', 16, -1.4); }
    }
    let rest = e - heart;
    if (rest > 0 && need > 0 && fl.fed >= need && mods.storeK > 1) { const x = rest * (mods.storeK - 1); rest += x; fl.stats.essGlut = (fl.stats.essGlut || 0) + x; }
    fl.stats.essHeart = (fl.stats.essHeart || 0) + heart;
    gainEssence('eq', rest, 'essWave', heart);   // 1.02: the Esencja leaves the equation's result box
  }
  function setGreed(v) { fl.greed = v; }
  const infMult = () => 1;   // v14: no hidden multipliers on Groza; everything global became greed (greedBonusNow)
  // counter-buildings: which rooms hold which (computed when a wave starts)
  function computeBRooms() {
    const o = {}; Object.keys(BUILDINGS).forEach(t => { o[t] = new Set(); });
    fl.items.forEach(it => { if (BUILDINGS[it.type] && !it.broken) o[it.type].add(roomOf(it.x, it.y)); });   // 1.05: a smashed one does nothing
    return o;
  }
  const inB = (t, r) => !!(fl && fl.bRooms && r >= 0 && fl.bRooms[t] && fl.bRooms[t].has(r));
  // The combo clock only runs while something is happening (see quietNow): a walk down an empty corridor between two trap rooms
  // does not break the combo, so traps spread over a big dungeon still chain.
  const comboNow = () => (fl && fl.cclock - fl.lastTrapC < (fl.comboWinNow || S.comboWin)) ? fl.combo : 1;
  const alive = () => fl.heroes.filter(h => !h.dead && !h.fled && !h.gone);
  const webbed = h => fl.time < h.slowUntil;
  const caged = h => h.state === 'caged';
  const held = h => h.state === 'fight' || h.state === 'wait' || h.state === 'talk' || h.state === 'rest' || h.state === 'disarm' || h.state === 'boss' || h.state === 'free' || caged(h) || webbed(h);
  function trapMult(h, type, src) {
    const pierce = type === 'arrows' && src && src.lvl >= 3;   // level 3 arrows go through shields
    const sh = k => inB('acid', h.room) ? (1 + k) / 2 : k;   // acid: shields protect half as well
    return (type === 'spikes' && held(h) ? 1.5 : 1) * (caged(h) ? (h.cageIt && h.cageIt.lvl >= 3 ? 2 : 1.5) : 1) * (webbed(h) ? (fl.time < (h.acidWebUntil || -1) ? 1.6 : 1.3) : 1)
      * (type === 'spikes' && mods.stickySpikes && webbed(h) ? 1 + mods.stickySpikes : 1)
      * (pierce ? 1 : (h.type === 'warrior' && fl.time < h.shieldUpUntil ? sh(h.R.shield) : 1) * sh(shieldCover(h)));
  }
  // a warrior with his shield up covers the friends right behind him (half his protection)
  function shieldCover(h) {
    let k = 1;
    for (const o of fl.heroes) {
      if (o === h || o.type !== 'warrior' || o.dead || o.fled || o.gone || fl.time >= o.shieldUpUntil) continue;
      const p = heroPos(o), q = heroPos(h);
      if (Math.hypot(p.x - q.x, p.y - q.y) <= 1.8) k = Math.min(k, (1 + o.R.shield) / 2);
    }
    return k;
  }
  const loneMult = h => 1;   // v14: loneliness pays a steady Groza instead of a multiplier (see updateHero)
  const heroName = h => h.nm[0];
  const rankName = h => h.boss ? BOSS_NAME[h.boss][h.female ? 1 : 0] : h.R.name[h.female ? 1 : 0];
  const traitName = h => h.trait ? HERO_TRAITS[h.trait].name[h.female ? 1 : 0] : '';
  const lvlLabel = h => 'poz. ' + h.lvl + ' ' + rankName(h).toLowerCase() + (h.trait ? ', ' + traitName(h) : '');
  // timeline of the wave for the test log: [time, code, ...data]
  function tl(code, ...a) { if (fl && fl.tl && fl.phase === 'raid' && fl.tl.ev.length < 8000) fl.tl.ev.push([Math.round(fl.time * 10) / 10, code].concat(a)); }
  const className = h => h.T.name[h.female ? 1 : 0];

  /* ================= floats, particles, effects (tile units) ================= */
  // Floating numbers: a tagged one (greed, combo) replaces its older twin nearby; others step up instead of piling on each other.
  // 1.07: a float stands on its spot of the floor (x, gy) and rises (lift, in tiles up the screen); dy < 0 = higher
  function addFloat(x, y, text, color, size, dy, tag, base) {
    const l0 = (base === undefined ? 0.35 : base) - (dy || 0);
    if (tag) { const f = floats.find(o => o.tag === tag && Math.abs(o.x - x) < 1.6 && Math.abs(o.gy - y) < 1.6); if (f) { f.text = text; f.color = color; f.life = 1.2; f.lift = l0; f.l0 = l0; return; } }
    let ol = 0;
    for (let k = 0; k < 6; k++) { if (!floats.some(o => o.life > 0.8 && Math.abs(o.x - x) < 0.9 && Math.abs(o.gy - y) < 0.9 && Math.abs(o.lift - (l0 + ol)) < 0.3)) break; ol += 0.34; }
    floats.push({ x, gy: y, lift: l0 + ol, l0, text, color, size: size || 15, life: 1.2, tag });
  }
  function floatTile(x, y, text, color, size, dy, tag) { addFloat(x + 0.5, y + 0.5, text, color, size, dy, tag); }
  function heroPos(h) {
    const off = (h.id % 3 - 1) * 0.14;
    const moving = h.nx !== null;
    const fx = moving ? h.x + (h.nx - h.x) * h.prog : h.x, fy = moving ? h.y + (h.ny - h.y) * h.prog : h.y;
    return { x: fx + 0.5 + off, y: fy + 0.5 + off * 0.5 };
  }
  function floatHero(h, text, color, size, dy) { const p = heroPos(h); addFloat(p.x, p.y, text, color, size, dy, undefined, 0.6); }
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.6 + Math.random()) * 2.2;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.3, color });
    }
  }
  function fxTiles(tiles, rgb, life) { fl.fx.push({ kind: 'tiles', tiles, rgb, life, max: life }); }
  function fxLine(x0, y0, x1, y1, life, rgb) { fl.fx.push({ kind: 'line', x0, y0, x1, y1, life, max: life, rgb: rgb || '255,240,200' }); }
  // Speech bubbles: every decision a hero makes is said out loud. Higher priority lines push out lower ones.
  function say(h, text, prio, dur) {
    if (!h || h.dead || h.fled || h.gone || !text) return;
    prio = prio || 1;
    const b = h.bubble;
    if (b && b.until > fl.time && b.prio > prio) return;
    if (b && b.until > fl.time && b.prio === prio && fl.time - b.at < 0.7) return;
    h.bubble = { text: gtext(text, h.female), prio, at: fl.time, until: fl.time + (dur || 1.9) };
    fl.stats.lines++;
  }

  /* ================= run flow ================= */
  function freshMods() {
    return { spikeDmg: 1, cooldown: 1, powderR: 1, webDur: 1, greedMult: 1, depthBonus: 0, lootTrap: 0, monster: 1, disarm: 1, arrowBurn: false,
      gateDur: 1, gateUses: 3, gateCrush: 1, mimicDmg: 1, fireDmg: 1, regen: 1, loneMult: 1, soulMult: 1, lostMult: 1, itemPower: 1,
      fearMult: 1, scareMult: 1, rumorKeep: 1, falseTrails: false, crystalPts: 0, carrierSlow: 1, carrierFear: 0, income: 0, digDiscount: 0,
      greedStart: 0, fallTime: 5, fallDmg: 1, cageTime: 1, cageFear: 1, spiderNest: false, ghostAura: 1, ghostPriestOnly: false, portraitR: 4, portraitFear: 1,
      wallCd: 1, suicideMech: 0, usurer: 0, mole: 0, fearHarvest: 0, labyrinth: 0, collector: 0, miser: 0, panic: 0, hauntedGallery: 0, stickySpikes: 0,
      wildfire: 0, bloodRite: 0, calmStorm: 0, echoFire: 0, glass: 0, pickGreed: 1, critPw: 1.8, okPw: 0.7, choir: 0, bottomless: false,
      hunger: 0, chronicle: 0, granary: 0, bank: 0, tempered: 0, pactPower: 1, pactLevels: 0, overload: 0, expandCost: 1, buildingCost: 1, firepit: 0, cageHaunt: 0, monsterFear: 0,
      // v14
      dmgType: { pierce: 1, blunt: 1, fire: 1, poison: 1 }, weakK: 0, revealAll: false, arsenal: 0, phobiaK: 0, oddBodies: 0, traumaK: 0, badMemories: 0, moreReturn: 0, returnGreed: 0,
      calmK: 1, fleeShock: 0, isolation: 0, heavyAir: 0, lastGasp: 0, shopDisc: 0, freeReroll: 0, sellK: 1, stashPlus: 0, patron: 0, stashGreed: 0,
      greedFlat: 0, hungerK: 1, storeK: 1, heartbeat: 0, gilded: 0, goldDust: 0, reliquary: false, pack: 0, quickArm: false };
  }
  // The deck decides the mods: start from scratch and lay every card on top (two copies = applied twice). Selling a card really removes it.
  function recomputeMods() {
    mods = freshMods();
    run.deck.forEach(id => { const u = UPG[id]; if (u && u.apply) u.apply(mods); });
    Object.keys(run.stacks || {}).forEach(id => { if (!run.deck.includes(id)) delete run.stacks[id]; });   // a growing card sold for good starts from zero
    if (fl) fl.threatDirty = true;
    updateTray();
  }
  // Point multipliers from cards that look at the dungeon as it stands right now.
  // Rozległość lochu: a bigger dungeon is a louder legend, +3% points for every room over 5.
  const roomCount = () => fl.rooms.reduce((a, r) => a + (r.kind === 'room' ? 1 : 0), 0);
  const sizeMult = () => 1;
  function cardMultNow() { return 1; }
  // v14: the score is Groza (depth and combo only, both visible) x Chciwość. Everything global adds to greed at the start of a wave:
  // a big dungeon, Szklane serce, Kolekcjoner, Skąpiec, Zła sława.
  function greedBonusParts() {
    let n = 0; const types = new Set();
    if (fl) fl.items.forEach(it => { if (ACTIVE[it.type] && !(MONSTERS[it.type] && it.hp <= 0)) { types.add(it.type); n++; } });
    const parts = [['rozległość lochu', SIZE_BONUS * Math.max(0, (fl ? roomCount() : 0) - 5)], ['Szklane serce', mods.glass], ['Kolekcjoner', mods.collector * types.size],
      ['Skąpiec', mods.miser * Math.max(0, 15 - n)], ['Zła sława', mods.crystalPts * Math.max(0, run.crystals)], ['karty', mods.greedFlat],
      ['Pozłacane pułapki', mods.gilded * (fl ? [...fl.items.values()].filter(it => ACTIVE[it.type] && (it.lvl || 1) >= 2).length : 0)],
      ['schowek', mods.stashGreed * ((run.stash || []).length)], ['powracający', mods.returnGreed * ((run.next || []).filter(e => e.returning).length)],
      ['opowieści o skarbach', run.greedNext || 0]];   // v15.1: the scared ones told the tavern about the gold they saw (this wave only)
    return parts.filter(p => Math.abs(p[1]) > 0.001);
  }
  const greedBonusNow = () => greedBonusParts().reduce((a, p) => a + p[1], 0);
  function portraitRooms() {
    const out = new Set();
    fl.items.forEach(it => { if (it.type === 'portrait' && !it.disabled) out.add(slotRoom('portrait', it.x, it.y)); });
    return out;
  }
  function newStats() {
    return { dmgPts: 0, fearPts: 0, scarePts: 0, killPts: 0, lootPts: 0, crystalPts: 0, wavePts: 0, lostPts: 0, lonePts: 0, healPts: 0, edgePts: 0,
      kills: 0, killsMon: 0, killsTrap: 0, killsHeart: 0, scared: 0, escaped: 0, left: 0, crystalTaken: 0, crystalLost: 0, crystalSaved: 0,
      loot: 0, lootSeen: 0, lootSkipped: 0, lootRisked: 0, rooms: 0, rumorRooms: 0, rumorTraps: 0, rumorFalse: 0, maxCombo: 1, disarmed: 0, disarmFails: 0,
      detected: 0, learned: 0, notLearned: 0, retreats: 0, panics: 0, flees: 0, partyFlees: 0, scouts: 0, wanders: 0, talks: 0, regroups: 0, fearDealt: 0,
      checks: 0, checkOk: 0, checkCrit: 0, checkMiss: 0, checkSkip: 0, skipLethal: 0, souls: 0, itemsGot: 0, itemsUsed: 0,
      dodges: 0, shields: 0, charms: 0, bombs: 0, potions: 0, heals: 0, cleanses: 0, barriers: 0, dispels: 0, blessed: 0, lines: 0, slept: 0,
      silenceTime: 0, pauseTime: 0, ffTime: 0, essBase: 0, essFear: 0, essSoul: 0, essDrop: 0, built: 0, monstersLost: 0,
      falls: 0, cages: 0, rescues: 0, abandons: 0, timing: 0, healed: 0, lostTime: 0, loneTime: 0, fearSrc: {}, preps: 0, wards: 0, jams: 0, prepDisarms: 0, breach: 0, sapped: 0, sensed: 0, greedKept: 0,
      // v12: gear and powers, getting lost, detours, curses, faith
      swaps: 0, potionsGiven: 0, amulets: 0, boots: 0, goldPicked: 0, cursed: 0, curseLifts: 0, faithOut: 0, detours: 0, gotLost: 0, searches: 0, deathFear: 0, roomsVisited: 0 };
  }
  function newRun(tutorial) {
    run = { wave: 1, total: 0, waves: [], crystals: S.crystals, maxCrystals: S.crystals, grozaTotal: 0, greedRep: 1, returners: [], stash: [], freePicks: 0, shop: null, shopOwed: 1, stacks: {}, guild: null, resumed: 0, moleWave: 0, essence: S.essence,
      items: new Map(), layout: null, rumor: { tiles: new Map(), traps: new Map(), loot: new Map(), heart: -1, gold: 0 }, upgrades: [], unlocked: new Set(START_UNLOCKED),
      pendingUpgrades: [], continueUsed: false, startedAt: Date.now(), result: null, reason: '', checkHints: 3, tut: tutorial ? 0 : -1, tutorial: !!tutorial,
      mode: 'check', fires: 0, buildSec: 0, raidSec: 0, best: loadBest(), next: null, lastIncome: 0, afterModals: null, over: false,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), thrIdx: 0, greedKeep: 0, greedNext: 0, waveDocs: [], won: false, logState: '', waveStart: null, deck: [], deckSize: S.deckSize || DECK_SIZE, freeDigs: 0, lastInterest: 0 };
    mods = freshMods();
    floats = []; particles = []; paused = false; ff = false;
    run.layout = genStartLayout();
    startBuild();
    seedStartTraps();
    if (run.tut >= 0) tutStart();
  }
  // v15.1: the first wave starts with two traps on the heroes' way, paid from the starting Esencja (1.01: 30 - 6 = 24; taken down,
  // they give it back). On their own they do not hold the wave (a bot with only these: the crystal is lost nearly every time).
  // 1.04 (author: they should be set so that the heroes do not carry the crystal out): both stand on the last stretch of the way,
  // which the thief walks twice: the spikes at 70-95 % of it, the arrows on the wall that covers most of 60-100 %. Tutorial wave 1
  // (2 rookies), a player who hits every check on the outline only (never a crit, like a tester), plus what the tutorial makes him
  // add: the crystal went out in 3-5 of 20 tries (at 20 % and 45 % of the way: 5-9 of 20); with some crits, about never.
  const START_TRAPS = [['spikes', 0.7, 0.95], ['arrows', 0.6, 1]];
  function startTrapSpot(type, P, f0, f1) {
    if (ITEMS[type].slot === 'wall') {   // the wall that covers most of this stretch of the way (any stretch, if none does)
      for (const on of [new Set(P.slice(Math.floor(P.length * f0), Math.ceil(P.length * f1)).map(p => key(p[0], p[1]))), new Set(P.map(p => key(p[0], p[1])))]) {
        let t = null, bs = 0;
        for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (canPlace(type, x, y)) { const s = areaOf({ type, x, y }).filter(a => on.has(key(a[0], a[1]))).length; if (s > bs) { bs = s; t = [x, y]; } }
        if (t) return t;
      }
      return null;
    }
    for (let k = Math.min(P.length - 1, Math.floor(P.length * f1)); k >= 0; k--) if (canPlace(type, P[k][0], P[k][1])) return P[k];   // the last free tile before f1
    return null;
  }
  function seedStartTraps() {
    const P = shortestPath(); if (!P.length) return;
    let n = 0;
    START_TRAPS.forEach(([type, f0, f1]) => {
      const cost = ITEMS[type].cost; if (fl.essence < cost) return;
      const t = startTrapSpot(type, P, f0, f1);
      if (!t) return;
      fl.items.set(key(t[0], t[1]), { type, x: t[0], y: t[1], cd: 0, anim: 0, disabled: false, hp: 0, max: 0, power: mods.monster, shot: 0.5, flash: 0, preview: 0, gx: t[0] + 0.5, gy: t[1] + 0.5, lvl: 1, spent: cost, sys: true });
      fl.essence -= cost; bt(type).placed++; bt(type).spent += cost; n++;
    });
    run.essence = fl.essence; updateTray(); updateAction();
    if (n && run.tut < 0) setHint(waveHint() + ' Loch postawił ' + (n === 1 ? 'pułapkę' : n + ' pułapki') + ' blisko serca (z Twojej Esencji): dostaw więcej. Stuknij element, żeby go przenieść; przytrzymaj, żeby zdjąć.');
    saveRun('build');
  }
  function freshParty() {
    return { plan: 'explore', target: -1, leaderId: -1, talkUntil: -1, waitUntil: -1, retreatRoom: -1, retreatLock: -99, restSince: -1, morale: 1, scoutId: -1,
      junctions: new Set(), hesitated: new Set(), thinkT: 0, lastSay: {}, ambushT: -9, ambushN: 0, steal: 0, carrierId: -1, rescueId: -1,
      cageDecided: new Set(), abandoned: new Set(), lastTalkAt: -99, chatT: 6, heartSaid: false, queueSay: [], prepped: new Set(), prep: null, prepCd: 0, rushUntil: -1,
      searchId: -1, searchUntil: -1, detour: null, detourCd: 0, wantSearch: true, targetRoom: -1 };
  }
  // A fresh wave state around the dungeon as it stands (used by the build phase, and by a run resumed after a wave summary).
  function setupFl(phase) {
    const map = buildMap(run.layout);
    fl = Object.assign(map, {
      items: run.items, heroes: [], queue: [], spawnTimer: 0, time: 0, phase: phase || 'build', essence: run.essence,
      greed: 1, base: 0, combo: 1, lastTrapAt: -99, lastTrapType: null, cclock: 0, lastTrapC: -99, comboWinNow: S.comboWin, fearless: false, byType: {}, score: 0, fed: 0, fedAt: -1, chain: null, lastPay: null, ending: null, endReason: null, spawnAt: 'ent',
      fx: [], zones: [], danger: new Float32Array(WW * WH), ghosts: [], check: null, checkGap: 0, known: new Uint8Array(WW * WH), heartKnown: false,
      knowDirty: false, newKnowAt: -9, threatDirty: true, silence: false, surprise: false, crystalLost: false, buildStart: realNow, rerolled: false,
      party: freshParty(), stats: newStats(), disarmKeys: null
    });
    validateItems(true);
    fl.items.forEach(it => {   // between waves everything is repaired and re-armed; monsters lick their wounds
      if (it.memRes && !it.worn && (it.disabled || it.broken)) it.memRes = null;   // 1.09: put out of use by the heroes: it asks again
      it.worn = false; it.cd = 0; it.disabled = false; it.bent = false; it.anim = 0; it.sleep = false; it.detected = false; it.rumored = false; it.uses = 0; it.seenWave = 0; it.preview = 0; it.noGreed = false; it.cursedKnown = false;
      it.jamUntil = 0; it.skipUntil = 0; it.lastFire = null; it.broken = false;   // wave clocks restart at 0: stale timers from last wave would jam or mute a trap; smashed buildings stand again
      if (MONSTERS[it.type]) { it.hp = it.max; it.gx = it.x + 0.5; it.gy = it.y + 0.5; it.foeT = 0; }
    });
    fl.bRooms = computeBRooms();
  }
  function startBuild(resume) {
    setupFl('build');
    if (!run.shop || run.shop.wave !== run.wave) shopRefresh(true);   // v14: a fresh offer every wave
    if (!run.next || run.nextFor !== run.wave) { run.next = makeWave(run.wave); run.nextFor = run.wave; }   // 1.05: usually made at the end of the last wave
    if (run.builtFor !== run.wave) {
      run.builtFor = run.wave;
      if (mods.mole && run.wave % 2 === 0 && run.moleWave !== run.wave) { run.freeDigs += mods.mole; run.moleWave = run.wave; }   // Kret: a free room every second wave
      // a breach stays until you patch it; from wave 6 the guild may dig a new one (one at a time)
      if (!run.layout.breach && run.wave >= 6 && run.tut < 0 && Math.random() < BREACH_P && planBreach()) { rebuildDungeon(true); run.breachNew = run.wave; }
      if (run.layout.breach && !fl.breach) delete run.layout.breach;   // its wall is gone (dug over, demolished): nothing left to come through
    }
    fl.cardMult = cardMultNow();
    floats = []; particles = []; orbs = [];
    selected = null; movingKey = null; movingObj = null; holdInfo = null; paused = false; ff = false;
    clearUndo(); setTrayOpen(UI.trayBuild || run.tut >= 0);
    resize();
    cam.s = buildScale(); centerOn((fl.ent.x + fl.heart.x) / 2 + 0.5, (fl.ent.y + fl.heart.y) / 2 + 0.5); cam.manualUntil = 0;   // 1.07: between the door and the heart
    updateTray(); updateAction(); updateZoomBtn(); updatePauseBtn();
    setHint(waveHint());
    saveRun('build');
  }
  function waveHint() {
    const list = run.next, lv = list.map(e => e.lvl), lo = Math.min(...lv), hi = Math.max(...lv), boss = list.find(e => e.boss);
    const rt = rumorView();
    return waveName() + ': ' + list.length + ' bohaterów, poziom ' + (lo === hi ? lo : lo + '-' + hi) + (boss ? ', prowadzi ' + BOSS_NAME[boss.boss][boss.female ? 1 : 0] + ' (poz. ' + boss.lvl + ')' : '') + '. ' +
      (hungerNeed(run.wave) ? 'GŁÓD: serce weźmie pierwsze ' + hungerNeed(run.wave) + ' Esencji z tej fali; fala da mniej, to zje kryształ. Trzymaj bohaterów w lochu. ' : '') +
      (fl.breach ? (run.layout.breach && run.layout.breach.fresh ? 'WYŁOM: gildia przebiła tunel do Twojego pokoju (czerwony znacznik) i tę falę wpuści tamtędy. ' : 'WYŁOM wciąż otwarty: bohaterowie wybiorą, czy wejść nim, czy drzwiami. ') + 'Stuknij wyłom, żeby go załatać (' + BREACH_PATCH + ' Esencji). ' : '') +
      (run.guild ? 'GILDIA: ' + run.guild.text + ' ' : '') +
      (rt.traps || rt.rooms ? 'Plotki: znają ' + rt.rooms + ' pokoi i ' + rt.traps + ' pułapek (oko na mapie).' : 'Nic o Tobie nie wiedzą.') +
      (run.wave === 1 ? ' Stawiaj elementy z paska; każdy pokój mieści kilka (licznik w rogu), w zakładce Loch kopiesz nowe.' : '');
  }
  // what the next wave has heard about the dungeon (shown in the build phase)
  function rumorView() {
    const rooms = new Set();
    run.rumor.tiles.forEach((w, i) => { const r = fl.roomAt[i]; if (r >= 0 && fl.rooms[r].kind === 'room') rooms.add(r); });
    let traps = 0;
    run.rumor.traps.forEach((v, k) => { const it = fl.items.get(k); if (it && it.type === v.type) traps++; });
    return { rooms: rooms.size, traps };
  }
  // After a change to the layout (between waves): rebuild the tiles, drop and refund whatever lost its place.
  function rebuildDungeon(quiet) {
    Object.assign(fl, buildMap(run.layout));
    if (run.layout.breach && !fl.breach) delete run.layout.breach;   // its wall is gone (dug over or demolished): that closes it too
    fl.known = new Uint8Array(WW * WH); fl.danger = new Float32Array(WW * WH);
    const refund = validateItems(!!quiet);
    updateTray();
    return refund;
  }
  function validateItems(silent) {
    let refund = 0;
    [...fl.items.values()].forEach(it => {
      if (BUILDINGS[it.type] ? blockerOk(it.x, it.y) : slotOf(it.x, it.y) === ITEMS[it.type].slot) return;   // Prototype 1.0: a building in the way of a door (an older save) goes back as Esencja
      fl.items.delete(key(it.x, it.y)); refund += it.spent || ITEMS[it.type].cost;
    });
    if (refund) { fl.essence += refund; if (!silent) floatTile(fl.ent.x, fl.ent.y + 1, '+' + refund + ' Esencji', '#ff7a86', 15); }
    return refund;
  }
  // Breaches: from wave 6, on random waves (35%), the guild tunnels into a deep room, preferring rooms close to the heart that the
  // tavern says are quiet. Announced in the build phase. The first wave comes through it; the breach then STAYS until you patch it
  // (a tap on it between waves), and every later wave picks: the breach or the front door, whichever looks safer.
  const BREACH_P = 0.35, BREACH_PATCH = 20;   // Prototype 1.01: 5 was pocket change
  function planBreach() {
    const L = run.layout; delete L.breach;
    if (run.tut >= 0) return false;
    const dist = layoutDist(L), fromHeart = layoutDist({ entrance: L.heartKey, cells: L.cells, edges: L.edges }), cands = [];
    fl.rooms.forEach(R => {   // never next door to the heart: the guild always has to cross at least one of your rooms
      if (R.kind !== 'room' || R.key === L.entrance || R.key === L.heartKey || (fromHeart.get(R.key) || 0) < 2) return;
      if ([...fl.items.values()].some(it => it.type === 'fortify' && roomOf(it.x, it.y) === R.id)) return;   // Bastion: no tunnel through these walls
      let danger = 0;
      run.rumor.traps.forEach((v, k) => { const it = fl.items.get(k); if (it && it.type === v.type && slotRoom(it.type, it.x, it.y) === R.id) danger++; });
      const spots = [];
      const tryS = (x, y, ox, oy) => {
        if (tileAt(x, y) !== WALL || tileAt(x + ox, y + oy) !== ROCK || fl.items.has(key(x, y)) || !walkable(x - ox, y - oy)) return;
        if (R.doors.some(d => Math.abs(d.x - x) + Math.abs(d.y - y) <= 2)) return;
        spots.push([x, y, ox, oy]);
      };
      for (let x = R.x0; x <= R.x1; x++) { tryS(x, R.y0 - 1, 0, -1); tryS(x, R.y1 + 1, 0, 1); }
      for (let y = R.y0; y <= R.y1; y++) { tryS(R.x0 - 1, y, -1, 0); tryS(R.x1 + 1, y, 1, 0); }
      if (spots.length) cands.push({ R, spots, sc: (dist.get(R.key) || 0) * 2 - danger + Math.random() });
    });
    if (!cands.length) return false;
    cands.sort((a, b) => b.sc - a.sc);
    const s = pick(cands[0].spots);
    L.breach = { cell: cands[0].R.key, x: s[0], y: s[1], ox: s[2], oy: s[3], fresh: true, born: run.wave };
    return true;
  }
  // Patching the breach: between waves, a tap on it (see the breach sheet).
  function patchBreach() {
    if (!fl || fl.phase !== 'build' || !run.layout.breach) return false;
    if (fl.essence < BREACH_PATCH) { setHint('Za mało Esencji: łatanie wyłomu kosztuje ' + BREACH_PATCH + '.'); return false; }
    pushUndo('łatanie wyłomu');
    delete run.layout.breach; fl.essence -= BREACH_PATCH; fl.stats.patched = (fl.stats.patched || 0) + 1;
    rebuildDungeon(true); fl.threatDirty = true;
    updateTray(); setHint(waveHint()); saveRunSoon();
    return true;
  }
  // Which way in: a fresh breach is the guild's plan; after that the party weighs the two ways (what the tavern says about the traps).
  function chooseEntrance() {
    fl.spawnAt = 'ent';
    const B = run.layout.breach;
    if (!fl.breach || !B) return;
    if (B.fresh) { fl.spawnAt = 'breach'; return; }
    rebuildThreat();
    let pB = 0.5;
    const lv = Math.max(...fl.queue.map(e => e.lvl));
    if (lv >= 3) {   // rookies just pick one; the others compare the known danger on the way (to the heart, if they know where it is)
      const score = sp => {
        const b = bfs(sp.x, sp.y, { avoid: 1 });
        if (fl.heartKnown) { let best = 1e9; fl.heartAdj.forEach(t => { const d = b.dist[t[1] * WW + t[0]]; if (d >= 0) best = Math.min(best, d); }); return best; }
        let s = 0; const r = roomOf(sp.ix, sp.iy); if (r >= 0) fl.rooms[r].tiles.forEach(t => { s += fl.danger[t[1] * WW + t[0]]; });
        return 20 + 2 * s;
      };
      const se = score(fl.ent), sb = score(fl.breach);
      pB = clamp(0.5 + 1.5 * (se - sb) / Math.max(10, se + sb), 0.1, 0.9);
    }
    if (Math.random() < pB) fl.spawnAt = 'breach';
  }
  const spawnPt = () => (fl.spawnAt === 'breach' && fl.breach) ? fl.breach : fl.ent;
  const isExitTile = (x, y) => (x === fl.ent.x && y === fl.ent.y) || (fl.breach && x === fl.breach.x && y === fl.breach.y);
  function makeHero(type, lvl, n, used, boss, pre) {
    pre = pre || {};
    const female = pre.nm ? pre.female : Math.random() < 0.4, pool = (female ? NAMES_F : NAMES_M).filter(nm => !used.has(nm[0]));
    const nm = pre.nm || pick(pool.length ? pool : (female ? NAMES_F : NAMES_M)); used.add(nm[0]);
    const R = levelStats(lvl), T = HEROES[type], bm = boss === 'final' ? 3 : boss ? 1.7 : 1;
    const max = Math.round(T.hp * R.hp * bm * S.heroHp / 100 * (1 + (EARLY_HP[n] || 0) * S.earlyHp));
    let trait = null;
    if (!boss && Math.random() < 0.5) trait = pick(Object.keys(HERO_TRAITS));   // about half of them have a personality
    if (pre.trait !== undefined) trait = pre.trait;
    const ck = trait === 'coward' ? 0.8 : trait === 'brave' ? 1.2 : 1;
    // v14: a body (a weakness or a toughness) and a phobia; the tavern knows some of it (shown before the wave), the rest shows in the dungeon
    const phys = pre.phys !== undefined ? pre.phys : (Math.random() < 0.35 + 0.1 * (mods.oddBodies || 0) ? pick(Object.keys(PHYS)) : null);
    const phobia = pre.phobia !== undefined ? pre.phobia : (!boss && Math.random() < 0.3 + 0.1 * (mods.oddBodies || 0) ? pick(Object.keys(PHOBIAS)) : null);
    const known = pre.known || [phys && (mods.revealAll || Math.random() < 0.3) ? 'phys' : null, phobia && (mods.revealAll || Math.random() < 0.3) ? 'phobia' : null].filter(Boolean);
    return { type, lvl, rank: tierOf(lvl), boss: boss || null, female, nm, hp: max, max, inv: makeKit(type, lvl + (boss ? 2 : 0)), trait,
      courage: Math.round(R.courage * (boss === 'final' ? 2 : boss ? 1.5 : 1) * ck), phys, phobia, known, returning: !!pre.returning, scar: pre.scar || null, times: pre.times || 0 };
  }
  // The guild reads the last wave's report and sends the right people (from wave 3): priests and amulets against fear,
  // warriors and talismans against a slaughterhouse, thieves against a minefield, a mage against monsters.
  const GUILD_WANT = { fear: 'priest', kill: 'warrior', traps: 'thief', monsters: 'mage', lost: 'bard', block: 'barbarian' };
  function guildAdapt(n) {
    const w = run.waves[run.waves.length - 1];
    if (n < 3 || !w) return null;
    const st = w.stats, fearShare = (st.fearPts + st.scarePts) / Math.max(1, st.fearPts + st.scarePts + st.dmgPts + st.killPts);
    const killShare = st.kills / Math.max(1, w.heroes.length);
    let traps = 0, mons = 0, blocks = 0; run.items.forEach(it => { if (TRAPS[it.type]) traps++; else if (MONSTERS[it.type]) mons++; if (BUILDINGS[it.type]) blocks++; });
    run.layout.cells.forEach(c => (c.objs || []).forEach(o => { if (o[2] === 'crate' && o[3]) blocks++; }));   // crates you built
    const lostShare = (st.lostPts + st.lonePts) / Math.max(1, st.fearPts + st.scarePts + st.dmgPts + st.killPts + st.lostPts + st.lonePts);
    const opts = [
      { kind: 'fear', sc: fearShare > 0.55 ? fearShare : 0, text: 'wie, że straszysz: przysyła kapłana z amuletem (od fali 6 amulet ma każdy). Kontra: Ołtarz (zakładka Obiekty).' },
      { kind: 'kill', sc: killShare >= 0.5 ? killShare : 0, text: 'wie, że zabijasz: przysyła wojownika z talizmanem (od fali 6 talizman ma każdy). Kontra: Kwas (zakładka Obiekty).' },
      // a clear style (fear or kills) wins over a plain count of traps or monsters: counts top out at 0.8
      { kind: 'traps', sc: traps >= 12 ? 0.5 + 0.3 * Math.min(1, (traps - 12) / 20) : 0, text: 'słyszała o masie pułapek: przysyła złodzieja. Kontra: Wabik (zakładka Obiekty).' },
      { kind: 'monsters', sc: mons >= 4 ? 0.5 + 0.3 * Math.min(1, (mons - 4) / 6) : 0, text: 'słyszała o potworach: przysyła maga. Kontra: Runa (zakładka Obiekty).' },
      // 1.05: a dungeon where people get lost and wander alone gets a bard; one walled with crates and buildings gets a barbarian
      { kind: 'lost', sc: (st.gotLost >= 2 || lostShare >= 0.15) ? 0.5 + Math.min(0.3, lostShare) : 0, text: 'słyszała, że w Twoim lochu ludzie błądzą i giną samotnie: przysyła barda. Kontra: Kamień wyjec (zakładka Obiekty).' },
      { kind: 'block', sc: blocks >= 5 || (st.reroutes || 0) >= 2 ? 0.5 + 0.3 * Math.min(1, Math.max(blocks - 5, 2 * ((st.reroutes || 0) - 2)) / 6) : 0, text: 'słyszała o zastawionych przejściach: przysyła barbarzyńcę. Kontra: Okowy (zakładka Obiekty).' }
    ].filter(o => o.sc > 0).sort((a, b) => b.sc - a.sc);
    return opts[0] || null;
  }
  // The guild's level for wave n: a climb by wave number, no ceiling. v13: Groza no longer adds levels (the hunger already asks
  // for Groza; two penalties would punish feeding the heart). GROZA_TYP is what Groza used to add in the recorded runs.
  // (the lower part of the range: fear builds made less Groza and used to meet weaker heroes; the hunger now asks the rest)
  const GROZA_TYP = [0, 0, 0.2, 0.5, 0.8, 1.2, 1.6, 2.0, 2.4, 2.7, 3.0];
  const grozaTyp = n => n <= 10 ? GROZA_TYP[Math.max(0, n)] : 3.0 + 0.3 * (n - 10);
  // v12.1: waves 2-6 a little stronger (the real run: heroes died in the first room in waves 1-5), the step at wave 7 softer
  const EARLY_LV = [0, 0, 0, 0.3, 0.6, 0.3, 0.9, 0.3, 0, 0.5, 0.7];   // wave 6 (evenly easy in every recorded run) gets the most; 9-10 make up for the easier checks
  // ...and more HP only (courage stays): levels hit fear builds harder than kill builds, and only kill layouts melted waves 1-5
  const EARLY_HP = [0, 0.25, 0.25, 0.4, 0.4, 0.15, 0.25, 0, 0, 0, 0];   // 1.01: waves 1-4 more; 1.05: wave 2 +25% (was +35%: a tester lost the crystal there)
  // Prototype 1.01 (author: the heroes were far too weak at the start; wave 1 of his run was over in 3 s): 3 heroes in wave 1,
  // a small head start in levels (fading out by wave 6) and more HP in waves 1-4. Replays of the 7 recorded runs (8 tries a
  // wave): wave 1 lasts ~15-60 s instead of 3-13 s; crystals lost in waves 1-4: 23/21/32/36% of tries (1.0: 7/2/18/23%).
  // A head start of +2 levels (wave 1 like the old wave 3) made the recorded fear layouts lose in 3-8 of 8 tries: too much.
  const START_LV = [0, 0.5, 0.7, 0.7, 0.4, 0.2, 0.1, 0, 0, 0, 0];
  const tutW1 = n => n === 1 && !!run && !!run.tutorial;   // the tutorial's first wave stays gentle: 2 rookies
  const waveCurve = n => 1 + (1.12 * (n - 1) + 0.007 * (n - 1) * (n - 1) + (EARLY_LV[n] || 0) + (tutW1(n) ? 0 : START_LV[n] || 0)) * S.scale;
  // 1.05: six classes, one of each at most, so six heroes at most; in the endless waves the guild sends better people instead of more
  const partySize = n => tutW1(n) ? 2 : n <= 3 ? 3 : n <= 6 ? 4 : n <= 9 ? 5 : 6;
  const endlessLv = n => n >= 15 ? 1.5 * Math.floor((n - 10) / 5) : 0;   // what the 7th, 8th... hero used to add
  const waveBase = n => waveCurve(n) + grozaTyp(n) * S.scale + mods.pactLevels + endlessLv(n);
  const bossOf = n => n % 5 === 0 ? (n % 10 === 0 ? 'final' : 'champion') : null;
  const waveName = () => 'Fala ' + run.wave + (run.wave <= RUN_WAVES ? '/' + RUN_WAVES : '');
  // Each wave is new people: the first ones are rookies, then they keep getting better. Every 5th wave a boss leads them.
  function makeWave(n) {
    const size = partySize(n);
    // v12.1: treasure hunters TAKE THE PLACE of ordinary heroes (greed brings stronger and greedier people, not more of them)
    const hunters = n >= 3 ? Math.min(size - 2, huntersN(run.greedRep || 1)) : 0;
    const recruit = n >= 4 && size > partySize(n - 1) && !bossOf(n);   // the newest member is a rookie for one wave: the step in numbers is softer (not in boss waves)
    // 1.05: never two of a class (6 classes, at most 6 heroes); the first three waves bring only the four classic ones
    const classes = shuffle((n <= 3 ? CLASSIC : PARTY).slice()).slice(0, size);
    const g = run.guild = guildAdapt(n);
    if (g && !classes.includes(GUILD_WANT[g.kind])) classes[size > 1 ? 1 : 0] = GUILD_WANT[g.kind];   // the guild makes sure its specialist comes (one: no class twice)
    const base = waveBase(n), used = new Set();
    const hl = huntersLv();   // greed: the leader is a seasoned treasure hunter (+hl), everybody else half that
    const list = classes.slice(0, size).map((t, i) => {
      const isHunter = i >= size - hunters, isRecruit = recruit && !isHunter && i === size - hunters - 1 && i >= 2;
      const bonus = i === 0 ? 1 + hl : isRecruit ? -3 : hl / 2;
      let L = Math.max(1, Math.round(base + bonus + Math.random() * 1.7 - 1.2));
      if (n <= 2) L = Math.min(L, tutW1(n) ? 2 : 4);
      const e = makeHero(t, L, n, used);
      if (isHunter) { e.trait = 'greedy'; e.hunter = true; }   // 1.05: a treasure hunter is a mark on any class (the bag), not a thief
      if (isRecruit) e.recruit = true;
      return e;
    });
    // v14: those who got away come back after 2-3 waves, with a name, what they remember and a scar (a phobia or a toughness)
    let back = 0;
    (run.returners || []).filter(r => r.back <= n && (!r.used || r.used === n)).forEach(r => {
      if (back >= (n >= 8 ? 2 : 1)) return;
      // 1.05: no class twice: he takes the place of his own class (the leader's too: he knows the way), or of someone ordinary
      // when his class is not in the party. In a boss wave the boss leads: a returner of the boss's class waits for the next wave.
      const same = list.findIndex(e => e.type === r.type);
      if ((same === 0 && bossOf(n)) || (same >= 0 && list[same].returning)) return;
      let idx = same; if (idx < 0) for (let i = list.length - 1; i >= 1; i--) if (!list[i].hunter && !list[i].recruit && !list[i].returning && list[i].type !== GUILD_WANT[g && g.kind]) { idx = i; break; }
      if (idx < 0) return;
      back++;
      const L = Math.max(list[idx].lvl, r.lvl + 1 + (r.crystal ? 1 : 0));
      list[idx] = makeHero(r.type, L, n, used, null, { nm: r.nm, female: r.female, phys: r.phys, phobia: r.phobia, trait: r.trait, known: [r.phys ? 'phys' : null, r.phobia ? 'phobia' : null].filter(Boolean), returning: true, scar: r.scar, times: r.times });
      r.used = n;
    });
    const boss = bossOf(n);
    if (boss) list[0] = makeHero(list[0].type, Math.round(base + hl) + (boss === 'final' ? 5 : 2), n, used, boss);
    // amulets / charms: only the specialists carry them at first, everybody from wave 6
    if (g && (g.kind === 'fear' || g.kind === 'kill')) list.forEach(e => {
      if (!(n >= 6 || e.type === { fear: 'priest', kill: 'warrior' }[g.kind]) || e.inv.length >= 3 + Math.floor(e.lvl / 3)) return;
      const t = g.kind === 'fear' ? 'amulet' : 'charm', r = 1 + Math.floor(e.lvl / 6), cur = e.inv.find(x => x.type === t);
      if (cur) { cur.r = Math.max(cur.r, r); cur.charges = (cur.charges || 0) + 1; } else e.inv.push({ type: t, r, charges: 1 });   // one power of a kind is enough (one use from the guild)
    });
    return list;
  }
  const TALE_PER = 0.04, TALE_LOOT = 4, TALE_CAP = 0.3;   // v15.1: +0,04 greed per treasure seen (up to 4) for every hero scared away, at most +0,3 a wave
  const greedStartNow = () => 1 + mods.greedStart + run.rumor.gold + run.greedKeep + greedBonusNow();
  function startWave() {
    if (!fl || fl.phase !== 'build') return;
    run.buildSec += Math.max(0, realNow - fl.buildStart); fl.buildSec = Math.round(realNow - fl.buildStart);
    saveRun('build');   // a tab closed during the wave comes back to this build
    perfReset();
    fl.items.forEach(it => { it.skullOff = false; });   // a let-go skull belongs to a wave (1.09: the answer itself stays with the trap)
    fl.phase = 'raid'; fl.time = 0; fl.spawnTimer = 0; fl.gateOpen = false; fl.threatDirty = true; fl.bRooms = computeBRooms(); fl.bSaid = new Set(); fl.quietT = 0; fl.autoFFTime = 0;
    fl.queue = run.next.slice();
    { const ty = new Set(); fl.items.forEach(it => { if (ACTIVE[it.type] && DMG_OF[it.type]) ty.add(DMG_OF[it.type]); }); fl.arsenal4 = ty.size >= 4; }   // Pełen arsenał
    if (run.returners) run.returners = run.returners.filter(r => r.used !== run.wave);   // the returners of this wave are in
    fl.base = 0; setGreed(greedStartNow());   // tales of gold, and gold already carried off, make them greedier
    run.greedNext = 0;   // the tales of treasure from the last wave are used up
    fl.chain = null; fl.lastPay = null; fl.fed = 0; fl.fedAt = -1;   // 1.01: a fresh combo chain and an empty heart for this wave
    applyRumors();
    chooseEntrance();
    fl.items.forEach(m => { if (MONSTERS[m.type] && m.hp > 0 && isRt(roomOf(m.x, m.y), 'crypt')) m.hp = Math.round(m.max * 1.25); });   // Krypta: +25% HP for this wave
    selected = null; movingKey = null; movingObj = null; holdInfo = null; cam.manualUntil = 0; ff = false; clearUndo(); setTrayOpen(false); updateTray(); updateAction();   // 1.05: in the tutorial too; 1.07: always (an open tray is the pause); 1.09 (author): back after 1.08 (his complaint was the button's width)
    { const bossE = fl.queue.find(e => e.boss), n = fl.queue.length;   // Prototype 1.0: a banner over the map says who is coming
      showBanner('Fala ' + run.wave, (bossE ? 'prowadzi ich ' + (bossE.boss === 'final' ? 'bohater z przepowiedni' : 'czempion') : n === 1 ? '1 bohater' : n + ' bohaterów') +
        (fl.spawnAt === 'breach' ? ' · wchodzą przez wyłom!' : fl.breach ? ' · wchodzą drzwiami' : ''));
      if (run.wave === 1 && run.tut < 0) setHint('Kamera śledzi drużynę. Przytrzymaj palec na mapie, żeby przyspieszyć. Skill check odpalasz stuknięciem w mapę.'); }
    fl.tl = { ev: [], smp: [], smpT: 0 };
    run.waveStart = snapshotLayout();
    if (fl.breach) { fl.stats.breachOpen = 1; if (fl.spawnAt === 'breach') { tl('br', fl.breach.x, fl.breach.y); fl.stats.breach = 1; } }
  }
  // What the tavern says: rooms and traps that earlier survivors saw. The better the heroes, the more they take in.
  const RUMOR_LIFE = 2, RUMOR_PER = 3;
  function applyRumors() {
    const RU = run.rumor, uptake = Math.max(...fl.queue.map(e => levelStats(e.lvl).rumor));
    // 1.05 (a tester got bored moving traps around every wave because of the rumours): a rumour lives 2 waves (was 4)
    RU.tiles.forEach((w, i) => { if (run.wave - w > RUMOR_LIFE) RU.tiles.delete(i); });
    RU.traps.forEach((v, k) => { if (run.wave - v.wave > RUMOR_LIFE) RU.traps.delete(k); });
    if (RU.loot) RU.loot.forEach((v, k) => { if (run.wave - v.wave > RUMOR_LIFE) RU.loot.delete(k); });
    fl.rooms.forEach(R => {
      if (!R.tiles.length) return;
      const n = R.tiles.filter(t => RU.tiles.has(t[1] * WW + t[0])).length;
      if (n < 0.6 * R.tiles.length || Math.random() > uptake) return;
      R.tiles.forEach(t => { fl.known[t[1] * WW + t[0]] = 1; });
      R.doors.forEach(d => { fl.known[d.y * WW + d.x] = 1; });
      if (R.kind === 'room') {
        for (let y = R.y0 - 1; y <= R.y1 + 1; y++) for (let x = R.x0 - 1; x <= R.x1 + 1; x++) if (tileAt(x, y) !== ROCK) fl.known[y * WW + x] = 1;
        R.seen = true; R.rumored = true; fl.stats.rumorRooms++;
        if (R.id === fl.heart.room) fl.heartKnown = true;
      }
    });
    RU.traps.forEach((v, k) => {
      if (Math.random() > uptake) return;
      const [x, y] = k.split(',').map(Number), it = fl.items.get(k);
      if (it && it.type === v.type) { it.detected = true; it.rumored = true; fl.stats.rumorTraps++; return; }
      if (slotOf(x, y) !== ITEMS[v.type].slot || it) return;
      const tiles = areaOf({ type: v.type, x, y });
      if (tiles.length) fl.ghosts.push({ x, y, type: v.type, tiles });
    });
    // treasure the survivors saw (and that is still there): they come in knowing where it lies, and wanting it
    if (!RU.loot) RU.loot = new Map();
    RU.loot.forEach((v, k) => {
      const it = fl.items.get(k);
      if (run.wave - v.wave > 3 || !it || it.type !== v.type) { RU.loot.delete(k); return; }
      if (Math.random() > uptake) return;
      noticeLoot(it, null); it.rumored = true; fl.stats.rumorLoot = (fl.stats.rumorLoot || 0) + 1;
    });
    fl.threatDirty = true;
  }
  function spawnHero(e) {
    const T = HEROES[e.type], R = levelStats(e.lvl), sp = spawnPt();
    const h = { entry: e, id: fl.heroes.length, type: e.type, T, R, rank: e.rank, lvl: e.lvl, boss: e.boss, female: e.female, nm: e.nm, hp: e.hp, max: e.max,
      x: sp.x, y: sp.y, nx: null, ny: null, prog: 0, tx: sp.x, ty: sp.y, path: [], needPlan: true, thinkT: 0, intent: 'follow',
      room: roomOf(sp.ix, sp.iy), state: 'walk', timer: 0, dur: 1, slowUntil: -1, burnUntil: -1, burnBy: null, foe: null, item: null,
      dead: false, fled: false, gone: false, flash: 0, acc: 0, accT: 0, cast: e.type === 'priest' ? 1.5 : e.type === 'mage' ? 2 : 0,
      barrierCd: 0, dispelCd: 0, scan: 0.5, hurtAt: -9, edgeAt: -9, playerDmg: 0, loot: 0, orbAcc: 0, inv: e.inv.map(it => Object.assign({}, it, { cdUntil: 0 })),
      shield: 0, shieldUpUntil: -1, shieldCd: 0, dodgeCd: 0, panicUntil: -1, lost: false, noPathT: 0, alone: false, aloneSaid: false, bubble: null,
      disarmT: null, scoutTarget: -1, scoutUntil: -1, fear: 0, courage: e.courage || R.courage, fleeing: false, crystal: false, fallUntil: -1, cageUntil: -1, cageIt: null,
      freeT: null, lostT: 0, lootMemo: new Map(), saidTiming: new Set(), felt: new Map(), wanderUntil: -1, wanderTarget: -1, rumorSaid: false, invCap: 3 + Math.floor(e.lvl / 3),
      trait: e.trait || null, rageUntil: -1, raged: false, shoutCd: 0, saidB: new Set(),
      // 1.05: the bard's songs (a few a wave) and calls, the barbarian's fury and axe, a lost one following a voice
      songs: e.type === 'bard' ? 2 + Math.floor(e.lvl / 4) : 0, songCd: 6, callCd: 0, rageCd: 0, smashCd: 0, smashIt: null, hearUntil: -1, hearId: -1,
      // v12: purse, curse, the priest's faith, powers in use, getting separated, shaken by a death
      gold: 0, cursed: false, faith: e.type === 'priest' ? 6 + Math.floor(e.lvl / 2) : 0, faithMax: e.type === 'priest' ? 6 + Math.floor(e.lvl / 2) : 0, faithT: 0,
      wardUntil: -1, wardK: 0, sprintUntil: -1, sprintK: 1, calmUntil: -1, giveCd: 0, sepT: 0, sepRolled: false, shakenUntil: -1, rtSaid: new Set(), lostCallT: 0, hunter: !!e.hunter,
      phys: e.phys || null, phobia: e.phobia || null, known: new Set(e.known || []), returning: !!e.returning, scar: e.scar || null, trauma: {}, fearBy: {}, dmgBy: {}, phobiaSeen: new Set() };
    h.inR = realNow;   // 1.09: pops in
    fl.heroes.push(h);
    tl('sp', h.id);
    reveal(h);
    if (fl.heroes.length === 1 && fl.breach) say(h, pick(fl.spawnAt === 'breach' ? SAY.breachUse : SAY.doorUse), 3, 2.2);
    else if (h.returning) say(h, pick(SAY.returnBack), 3, 2.4);
    if (h.returning && mods.badMemories) h.fear = Math.max(h.fear, mods.badMemories * h.courage);   // Złe wspomnienia
    else if (h.hunter && Math.random() < 0.6) say(h, pick(SAY.hunters), 2, 2.2);
    if (fl.secondGroup) {   // they saw their friends run out screaming
      h.fear = 0.2 * h.courage;
      if (fl.heroes.filter(o => o.entry && fl.secondGroup && !o.fled && !o.dead).length === 1 || Math.random() < 0.3) say(h, pick(SAY.secondGroup), 3, 2.2);
    }
    // opening lines: what the guild planned, what the tavern said, how famous this place is
    const n1 = fl.heroes.length, rt = run.rumor.traps.size, fame = rankOf(run.total).i;
    if (n1 === 1) {
      const g = run.guild;
      const line = h.boss === 'final' ? pick(SAY.finalAura) : h.boss ? pick(SAY.champion) :
        g ? pick(SAY['guild' + g.kind.charAt(0).toUpperCase() + g.kind.slice(1)]) :
        fl.heartKnown ? pick(SAY.heartRumor) : rt ? pick(SAY.rumorStart).replace('{k}', rt) :
        h.rank === 0 ? pick(SAY.rookieBoast) : pick(SAY.enter);
      say(h, line, 2, 2.4);
    } else if (n1 === 2 && fame >= 2 && Math.random() < 0.7) say(h, pick(fame >= 4 ? SAY.fame2 : SAY.fame1), 2, 2.2);
    else if (h.rank === 0 && Math.random() < 0.35) say(h, pick(Math.random() < 0.5 ? SAY.rookieBoast : SAY.rookie), 1);
    else if (h.trait === 'careful' && Math.random() < 0.4) say(h, pick(SAY.cautious), 1);
  }
  // The first ones ran out screaming before everyone was in: those still outside go in as a new group, a little shaken.
  function regroupAtDoor() {
    const P = fl.party;
    P.plan = 'explore'; P.leaderId = -1; P.target = -1; P.prep = null; P.steal = 0; P.detour = null; P.searchId = -1;
    fl.holdT = 0; fl.secondGroup = (fl.secondGroup || 0) + 1; fl.stats.regroupsDoor = (fl.stats.regroupsDoor || 0) + 1; tl('rg', fl.queue.length);
  }
  // Patience runs out. Prototype 1.01 (author's decision): the party retreats and goes home, heart known or not (the old
  // "szarża" is gone). Only the hero of the prophecy never goes home: the prophecy shows the way and the party storms the heart.
  function becomeImpatient() {
    fl.fearless = true;
    const P = fl.party, L = alive()[0];
    if (P.plan === 'escape' || P.plan === 'flee' || P.plan === 'leave') return;
    const prophet = alive().find(h => h.boss === 'final' && !h.fleeing);
    if (!prophet) {
      fl.storm = false; tl('ip', 0); P.plan = 'leave';
      alive().forEach(h => { h.needPlan = true; if (h.state === 'rest' || h.state === 'talk') h.state = 'walk'; });
      if (L) say(L, pick(SAY.leave), 3);
      setHint('Bohaterom skończyła się cierpliwość: odwrót, wracają do domu.');
      return;
    }
    fl.storm = true;
    if (prophet && !fl.heartKnown) {
      fl.heartKnown = true; fl.stats.prophecy = 1;
      shortestPath().forEach(t => { fl.known[t[1] * WW + t[0]] = 1; });
      const HR = fl.rooms[fl.heart.room]; if (HR) HR.tiles.forEach(t => { fl.known[t[1] * WW + t[0]] = 1; });
      say(prophet, pick(SAY.prophecy), 4, 2.6);
    }
    tl('ip', fl.heartKnown ? 1 : 0);
    if (fl.heartKnown) { P.plan = 'assault'; alive().forEach(h => { if (h.state === 'rest' || h.state === 'talk') h.state = 'walk'; h.needPlan = true; }); if (L) say(L, pick(SAY.impatient), 3); }
    else { P.plan = 'leave'; alive().forEach(h => { h.needPlan = true; if (h.state === 'rest' || h.state === 'talk') h.state = 'walk'; }); if (L) say(L, pick(SAY.leave), 3); }
    setHint(fl.heartKnown ? 'Bohaterom skończyła się cierpliwość: szturmują serce i mniej uważają na pułapki.' : 'Bohaterom skończyła się cierpliwość: nie znaleźli serca i wracają do domu.');
  }
  // A hero walks out of the dungeon. With a crystal it is your loss; scared out of his wits it is your win. Either way, he talks.
  function heroExit(h) {
    if (h.fled || h.dead) return;
    if (!h.crystal && !h.fleeing && fl.time < h.panicUntil) { h.fleeing = true; fl.stats.panicExits = (fl.stats.panicExits || 0) + 1; }   // ran out in a panic: that is a hero scared away
    h.fled = true; h.bubble = null; fl.stats.escaped++; h.outR = realNow; h.outKind = 'out';   // 1.09: fades at the door
    const P = fl.party;
    if (h.crystal) {
      h.crystal = false; h.carriedOut = true; fl.crystalLost = true; run.crystals = Math.max(0, run.crystals - 1); fl.stats.crystalLost++;
      floatTile(fl.ent.x, fl.ent.y, 'Kryształ stracony!', '#ff6b6b', 18, -0.6); shake = Math.max(shake, 0.3); tl('cx', h.id); buzz([90, 60, 90]);
      if (P.carrierId === h.id) P.carrierId = -1;
    } else if (h.fleeing) {
      const pts = addPts(GZ.scare * (h.boss ? 2 : 1) * mods.scareMult, 'scarePts', h); fl.stats.scared++; tl('sc', h.id);
      if (mods.fearHarvest) gainEssence(null, mods.fearHarvest, 'essFear');   // Żniwa strachu
      if (mods.chronicle) run.stacks.chronicle = (run.stacks.chronicle || 0) + 1;   // Kronika grozy
      floatTile(fl.ent.x, fl.ent.y, (h.female ? 'Uciekła' : 'Uciekł') + ' z krzykiem! +' + fmtE(pts) + ' Esencji', '#ff7a86', 16, -0.4);
      // v15.1: scared out of his wits, he still tells the tavern about the treasure he saw: the next wave starts greedier
      if (fl.stats.lootSeen > 0) {
        const cur = fl.stats.treasureTale || 0, got = Math.min(TALE_PER * Math.min(TALE_LOOT, fl.stats.lootSeen), TALE_CAP - cur);
        if (got > 0.001) { fl.stats.treasureTale = cur + got; floatTile(fl.ent.x, fl.ent.y, 'Opowie o skarbach: chciwość +' + fmt2(got) + ' w następnej fali', '#f2b94b', 13, -1.3); }
      }
    } else { fl.stats.left++; tl('ex', h.id); }
    if (h.loot) run.rumor.gold += 0.05 * h.loot + 0.02 * (h.gold || 0);   // gold carried out of the dungeon makes the next wave greedier
    fl.anyOut = true;
  }
  function finishWave() {
    if (fl.phase !== 'raid') return;
    fl.check = null; ff = false; fl.finishing = true;   // 1.05: no tutorial card from here on (it used to pop up over the summary)
    payChain();   // Prototype 1.01: an unfinished combo chain is cashed in before the heart is counted
    run.greedNext = fl.stats.treasureTale || 0;   // v15.1: tales of treasure from the scared ones, for the next wave only
    fl.items.forEach(it => { const w = it.w || {}; it.lf = w.f || 0; it.lh = w.h || 0; it.lp = Math.round(w.p || 0); it.lk = w.k || 0; it.w = null; });   // what each element did this wave (shown on its card)
    run.raidSec += fl.time;
    // rumours: if anyone made it out alive, what the party knew walks out with them
    const out = fl.anyOut;
    let rr = 0, rt = 0;
    if (out) {
      const keep = mods.rumorKeep, roomsSeen = new Set();
      for (let i = 0; i < WW * WH; i++) {
        if (!fl.known[i] || (fl.tiles[i] !== FLOOR && fl.tiles[i] !== DOOR)) continue;
        const r = fl.roomAt[i];
        if (r >= 0 && inB('veil', r)) continue;   // Zasłona: nobody remembers this room
        if (r >= 0 && fl.rooms[r].rumorDrop === undefined) fl.rooms[r].rumorDrop = Math.random() > keep;
        if (r >= 0 && fl.rooms[r].rumorDrop) continue;
        if (!run.rumor.tiles.has(i) || run.rumor.tiles.get(i) < run.wave) run.rumor.tiles.set(i, run.wave);
        if (r >= 0 && fl.rooms[r].kind === 'room') roomsSeen.add(r);
      }
      rr = roomsSeen.size;
      // 1.05: each one who got out tells only of the traps that hurt or scared him most (up to 3), not of all the party saw
      const told = new Map();
      fl.heroes.forEach(h => {
        if (!h.fled || h.dead || !h.felt) return;
        [...h.felt.entries()].sort((a, b) => b[1] - a[1]).slice(0, RUMOR_PER).forEach(([k]) => { const it = fl.items.get(k); if (it && LOOKS_TRAP(it.type) && !inB('veil', slotRoom(it.type, it.x, it.y))) told.set(k, it.type); });
      });
      told.forEach((type, k) => { if (Math.random() < keep) { run.rumor.traps.set(k, { type, wave: run.wave }); rt++; } });
      if (!run.rumor.loot) run.rumor.loot = new Map();
      fl.items.forEach((it, k) => { if (isLoot(it.type) && it.seenWave === run.wave && !inB('veil', roomOf(it.x, it.y)) && Math.random() < keep) run.rumor.loot.set(k, { type: it.type, wave: run.wave }); });   // tales of treasure
      if (fl.heartKnown) run.rumor.heart = run.wave;
      if (mods.falseTrails) {   // tall tales: traps that do not exist
        for (let n = 0, tries = 0; n < 2 && tries < 60; tries++) {
          const R = pick(fl.rooms.filter(r => r.kind === 'room')), t = pick(R.tiles), k = key(t[0], t[1]);
          if (fl.items.has(k) || !walkable(t[0], t[1])) continue;
          run.rumor.traps.set(k, { type: 'spikes', wave: run.wave }); n++;
        }
      }
    }
    if (run.layout.breach) run.layout.breach.fresh = false;   // the guild's tunnel stays open: from now on each wave chooses its way in
    if (!fl.crystalLost && mods.bank) run.stacks.bank = (run.stacks.bank || 0) + 1;   // Skarbiec
    fl.stats.wavePts = 0;   // v15: no bonus for the wave itself; a small flat income comes after it
    feedHeart();
    if (run.wave === RUN_WAVES && run.crystals > 0 && !run.won) { run.won = true; fl.victory = true; }   // the prophecy hero is beaten (and the heart fed): the run is won
    run.grozaTotal = (run.grozaTotal || 0) + fl.base; run.greedRep = fl.greed;   // what the guild hears: how deadly, how rich
    checkThresholds(run.total + fl.score);
    run.pendingUpgrades.push({ r: bossOf(run.wave) ? 3 : 1, src: bossOf(run.wave) ? 'boss' : 'wave', wave: run.wave });   // every wave held back earns a buff
    run.lastInterest = Math.min(Math.floor(fl.essence * mods.usurer), 12 * Math.round(mods.usurer / 0.15));   // Lichwiarz: interest on what you did not spend (at most 12 a copy)
    const income = S.waveIncome + mods.income + run.lastInterest + 2 * (run.stacks.bank || 0) * mods.bank;   // a small flat income, the rest comes from Groza
    run.lastIncome = income;
    run.essence = fl.essence + income;   // Prototype 1.01: no purse limit
    fl.essence = run.essence;
    collectReturners();
    recordWave(rr, rt);
    run.total += fl.score;
    if (run.total > run.best) { run.best = run.total; saveBest(run.best); }
    // 1.05: the next party is known right away: the wave summary shows who comes (classes, skills, gear, what the tavern knows)
    if (run.crystals > 0) { run.next = makeWave(run.wave + 1); run.nextFor = run.wave + 1; }
    logWave(false);
    if (run.crystals > 0) saveRun('summary');
    fl.phase = 'summary'; updateAction();
    queueModal({ type: 'wave', rr, rt, out });   // 1.05: one screen (the reckoning is part of it)
  }
  // Głód serca: the wave's score feeds the heart. Short: the reserve pays first, then a crystal. Surplus: the reserve
  // (at most 2 needs); a full reserve grows a lost crystal back.
  function collectReturners() {
    if (run.tutorial) return;
    run.returners = run.returners || [];
    fl.heroes.forEach(h => {
      if (!h.fled || h.dead || h.boss || run.returners.length >= 8) return;
      if (Math.random() >= (h.fleeing ? 0.55 : 0.4) * (1 + (mods.moreReturn || 0))) return;
      let phys = h.phys, phobia = h.phobia, scar = null;
      const topFear = Object.entries(h.fearBy || {}).sort((a, b) => b[1] - a[1])[0], topDmg = Object.entries(h.dmgBy || {}).sort((a, b) => b[1] - a[1])[0];
      if (h.fleeing && topFear && !phobia) {   // what scared him away becomes a phobia
        const k = PHOBIA_OF_ATTR[topFear[0]] || (topFear[0] === 'death' ? 'blood' : DMG_OF[topFear[0]] === 'fire' ? 'fire' : null);
        if (k) { phobia = k; scar = 'fobia: ' + PHOBIAS[k].name + ', ' + (h.female ? 'wyniosła' : 'wyniósł') + ' ją z Twojego lochu'; }
      }
      if (!scar && topDmg && topDmg[1] > 0.3 * h.max) { phys = SCAR_RES[topDmg[0]]; scar = PHYS[phys].name[h.female ? 1 : 0] + ' po ranach z Twojego lochu'; }   // the wound that nearly killed him hardened him
      run.returners.push({ nm: h.nm, female: h.female, type: h.type, lvl: h.lvl, back: run.wave + 2 + (Math.random() < 0.5 ? 1 : 0), phys, phobia, trait: h.trait,
        scar: scar || 'pamięta Twój loch', times: ((h.entry && h.entry.times) || 0) + 1, crystal: !!h.carriedOut });
      fl.stats.returnersOut = (fl.stats.returnersOut || 0) + 1;
    });
  }
  // Prototype 1.01: the heart has been eating its share of this wave's Esencja all along (essIn). When the wave ends it is
  // either fed, or it eats what it got and a crystal. Crystals do not grow back by themselves (1.05: and cannot be bought; a card may give one).
  function feedHeart() {
    const need = hungerNeed(run.wave);
    fl.hunger = null;
    if (!need || run.crystals <= 0) return;
    const h = fl.hunger = { need, got: Math.round(fl.score * 10) / 10, fedAmt: Math.round(fl.fed * 10) / 10, fedAt: fl.fedAt >= 0 ? Math.round(fl.fedAt) : null };
    h.fed = fl.fed >= need - 0.001;
    if (h.fed) tl('hg', 'fed', need);
    else { run.crystals = Math.max(0, run.crystals - 1); h.ate = true; fl.stats.hungerAte = 1; tl('hg', 'ate', Math.round(need - fl.fed)); }
  }
  function roundStats(s) { const o = {}; for (const k in s) o[k] = typeof s[k] === 'object' ? roundStats(s[k]) : Math.round(s[k]); return o; }
  // Points thresholds: each one crossed earns a buff after the wave (rare pick). They grow by 60% each.
  // v14.1: points no longer give cards (author's decision 19.10). They feed the heart and set the rank; a new rank is announced.
  const nextThr = () => { const r = rankOf(0); return r.next ? r.next[0] : 0; };   // kept for old callers
  function checkThresholds(total) {
    const r = rankOf(total);
    while ((run.rankIdx || 0) < r.i) {
      run.rankIdx = (run.rankIdx || 0) + 1;
      if (fl.phase === 'raid') { floatTile(fl.heart.x, fl.heart.y, 'Nowa ranga: ' + RANKS[run.rankIdx][1] + '!', '#cbb0ff', 16, -1.6); tl('rk', run.rankIdx); }
    }
  }
  function recordWave(rr, rt, partial) {
    const items = {}, ps = perfSummary(), s0 = fl.stats, nChk = s0.checkCrit + s0.checkOk + s0.checkMiss + s0.checkSkip;
    // 1.05: checks per minute of real play (game time when the device did not report, e.g. in tests) and the share frozen by checks
    const realMin = (ps && ps.realSec > 5 ? ps.realSec : fl.time) / 60;
    for (const k in fl.byType) { const r = roundStats(fl.byType[k]); if (r.placed || r.fires || r.dmg || r.passiveDmg || r.fear) items[k] = r; }
    run.waves.push({ wave: run.wave, score: Math.round(fl.score), time: Math.round(fl.time), buildSec: fl.buildSec || 0, crystalLost: fl.crystalLost,
      heroes: fl.heroes.map(h => ({ type: h.type, lvl: h.lvl, boss: h.boss, rank: h.rank, trait: h.trait, out: h.dead ? 'dead' : h.fleeing ? 'scared' : h.crystal ? 'crystal' : 'left', fear: Math.round(h.fear), hp: Math.round(h.hp) })),
      hunger: fl.hunger || null, groza: Math.round(fl.base), grozaTotal: Math.round(run.grozaTotal || 0), greedRep: Math.round((run.greedRep || 1) * 100) / 100, guild: run.guild ? run.guild.kind : null,
      autoFF: Math.round(fl.autoFFTime || 0), crystals: run.crystals, greed: Math.round(fl.greed * 100) / 100, rumorRooms: rr, rumorTraps: rt, rooms: run.layout.cells.size,
      essence: Math.round(fl.essence), stats: roundStats(fl.stats), items, partial: !!partial, perf: ps, errors: PERF.errs.length ? PERF.errs.splice(0) : undefined,
      checks: nChk, cpm: realMin > 0 ? Math.round(nChk / realMin * 10) / 10 : 0, frozen: ps ? ps.frozen : null, memFires: s0.memFires || 0, skullOff: s0.skullOff || 0, classes: fl.heroes.map(h => h.type), trayPauses: s0.trayPauses || 0 });
  }
  // after the wave summary: game over, or upgrades and the next build phase
  function afterSummary() {
    if (run.crystals <= 0) { queueModal({ type: 'over' }); return; }
    if (run.wave === RUN_WAVES && run.won && !run.victoryDone) { queueModal({ type: 'victory' }); return; }   // after a reload at the final summary: win or play on
    proceedToBuild();
  }
  function proceedToBuild() {
    // v14: the cards earned (wave held, points thresholds, boss) become free picks in the shop, a screen of its own after every wave
    const picks = run.pendingUpgrades.splice(0);
    run.freePicks = (run.freePicks || 0) + picks.length + (mods.patron && run.wave % 2 === 0 ? mods.patron : 0);
    run.shopOwed = Math.max(run.shopOwed || 1, ...picks.map(p => p.r), 1);
    run.afterModals = () => { run.wave++; startBuild(); queueModal({ type: 'shop', between: true }); if (run.tut >= 0) tutOnBuild(); if (run.breachNew === run.wave && fl.breach) queueModal({ type: 'breach', fresh: true }); if (run.wave === 2 && !run.tutorial && !run.hungerTip) { run.hungerTip = true; queueModal({ type: 'hungerTip' }); } };   // v12.1: a new breach asks right away (patch or leave)
    const f = run.afterModals; run.afterModals = null; f();
  }
  function endRun(reason, result) {
    run.result = result || 'end'; run.reason = reason; run.over = true;
    if (run.won && run.result !== 'win') { run.endless = run.wave - RUN_WAVES; run.result = 'win'; }   // won at wave 10, ended later: still a win
    clearSave();
    fl.phase = 'over'; ff = false; updateAction();
    queueModal({ type: 'end' });
  }
  // Quitting mid-run still logs everything so far, including the unfinished wave.
  function quitRun() {
    if (!run || run.over) return;
    if (fl.phase === 'raid') {
      fl.check = null; run.raidSec += fl.time;
      recordWave(0, 0, true); run.total += fl.score; logWave(true);
    }
    endRun('Run przerwany przez gracza.', 'quit');
  }

  /* ================= building tools: dig, passage, demolish ================= */
  const cellCenter = (cx, cy) => [cx * CELL + 4.5, cy * CELL + 4.5];
  const expandRefund = lvl => Math.floor(ITEMS.expand.cost * (Math.pow(2, lvl) - 1) / 2);   // half of what the expansions cost
  function toolCost(t, m) {
    if (ROOMTYPES[t]) return m && m.has ? 0 : ITEMS[t].cost;   // taking a room type off costs nothing (half comes back)
    if (t === 'expand') return Math.ceil(ITEMS.expand.cost * Math.pow(2, m ? m.lvl : 0) * mods.expandCost);   // 3, 6, 12, 24...: stacking one room gets expensive fast
    if (t === 'dig' && run.freeDigs > 0) return 0;   // Kret
    return Math.max(0, ITEMS[t].cost + (t === 'dig' ? 3 * Math.max(0, run.layout.cells.size - 7) : 0) - (t === 'dig' || t === 'tunnel' ? mods.digDiscount : 0));
  }
  function toolMarkers(tool) {
    const L = run.layout, out = [];
    if (tool === 'dig') {
      L.cells.forEach((c, k) => DIRS.forEach(d => {
        const tx = c.cx + d[0], ty = c.cy + d[1];
        if (!inGrid(tx, ty) || L.cells.has(cellKey(tx, ty))) return;
        const [mx, my] = cellCenter(tx, ty);
        out.push({ tool, from: k, tx, ty, x: mx - d[0] * 2.2, y: my - d[1] * 2.2 });
      }));
    } else if (tool === 'tunnel') {
      L.cells.forEach((c, k) => [[1, 0], [0, 1]].forEach(d => {
        const k2 = cellKey(c.cx + d[0], c.cy + d[1]);
        if (!L.cells.has(k2) || L.edges.has(edgeKey(k, k2))) return;
        const [ax, ay] = cellCenter(c.cx, c.cy);
        out.push({ tool, a: k, b: k2, x: ax + d[0] * CELL / 2, y: ay + d[1] * CELL / 2 });
      }));
    } else if (tool === 'expand') {
      fl.rooms.forEach(R => {
        if (R.kind === 'room') out.push({ tool, room: R.key, lvl: R.lvl || 0, x: (R.x0 + R.x1) / 2 + 0.5, y: (R.y0 + R.y1) / 2 + 0.5 });
        else if (R.tiles.length) { const t = R.tiles[Math.floor(R.tiles.length / 2)]; out.push({ tool, edge: R.key, lvl: R.lvl || 0, x: t[0] + 0.5, y: t[1] + 0.5 }); }
      });
    } else if (tool === 'demolish') {
      fl.rooms.forEach(R => {
        if (R.kind === 'room' && canDemolishRoom(L, R.key)) out.push({ tool, room: R.key, x: (R.x0 + R.x1) / 2 + 0.5, y: (R.y0 + R.y1) / 2 + 0.5 });
        if (R.kind === 'hall' && canDemolishEdge(L, R.key)) { const t = R.tiles[Math.floor(R.tiles.length / 2)]; out.push({ tool, edge: R.key, x: t[0] + 0.5, y: t[1] + 0.5 }); }
      });
    } else if (ROOMTYPES[tool]) {   // every room can get a character (one at a time)
      const rt = ROOMTYPES[tool];
      fl.rooms.forEach(R => { if (R.kind === 'room') out.push({ tool, room: R.key, has: R.rt === rt, other: R.rt && R.rt !== rt ? R.rt : null, x: (R.x0 + R.x1) / 2 + 0.5, y: (R.y0 + R.y1) / 2 + 0.5 }); });
    }
    return out;
  }
  function forgetTiles(tiles) { tiles.forEach(t => { run.rumor.tiles.delete(t[1] * WW + t[0]); }); }
  function applyTool(m) {
    const L = run.layout, cost = toolCost(m.tool, m);
    if (fl.phase !== 'build') { setHint('Przebudowa lochu tylko między falami.'); return false; }
    if (fl.essence < cost) { setHint('Za mało Esencji (' + ITEMS[m.tool].name + ': ' + cost + ').'); return false; }
    pushUndo(ITEMS[m.tool].name.toLowerCase());
    let ok = false, refund = 0, msg = '';
    if (m.tool === 'dig') {
      ok = digRoom(L, m.from, m.tx, m.ty);
      if (ok) {
        if (run.freeDigs > 0) run.freeDigs--;
        refund = rebuildDungeon();
        const R = fl.rooms.find(r => r.key === cellKey(m.tx, m.ty)), H = fl.rooms.find(r => r.key === edgeKey(m.from, cellKey(m.tx, m.ty)));
        if (R) forgetTiles(R.tiles); if (H) forgetTiles(H.tiles);
        msg = 'Nowy pokój wykopany. Następna fala nic o nim nie wie.';
      }
    } else if (m.tool === 'tunnel') {
      ok = addPassage(L, m.a, m.b);
      if (ok) { refund = rebuildDungeon(); const H = fl.rooms.find(r => r.key === edgeKey(m.a, m.b)); if (H) forgetTiles(H.tiles); msg = 'Nowe przejście. Więcej dróg, więcej błędów.'; }
    } else if (m.tool === 'demolish') {
      const R = fl.rooms.find(r => r.key === (m.room || m.edge));
      if (R) forgetTiles(R.tiles);
      if (m.room && canDemolishRoom(L, m.room)) {
        fl.rooms.filter(r => r.kind === 'hall' && (r.key.split('|').includes(m.room))).forEach(hh => forgetTiles(hh.tiles));
        const back = 5 + expandRefund((L.cells.get(m.room) || {}).lvl || 0);
        demolishRoom(L, m.room); ok = true; fl.essence += back; msg = 'Pokój zasypany (+' + back + ' Esencji).';
      } else if (m.edge && canDemolishEdge(L, m.edge)) { const back = expandRefund((L.edges.get(m.edge) || {}).lvl || 0); L.edges.delete(m.edge); fl.essence += back; ok = true; msg = 'Przejście zasypane' + (back ? ' (+' + back + ' Esencji).' : '.'); }
      if (ok) refund = rebuildDungeon();
    } else if (m.tool === 'expand') {
      const spec = m.room ? L.cells.get(m.room) : L.edges.get(m.edge), R = fl.rooms.find(r => r.key === (m.room || m.edge));
      if (spec && R) { spec.lvl = (spec.lvl || 0) + 1; R.lvl = spec.lvl; ok = true; msg = (m.room ? 'Pokój' : 'Korytarz') + ' rozbudowany: mieści teraz ' + roomCap(R) + ' elementy.'; }
    } else if (ROOMTYPES[m.tool]) {
      const c = L.cells.get(m.room), R = fl.rooms.find(r => r.key === m.room), rt = ROOMTYPES[m.tool];
      if (c && R) {
        ok = true;
        if (c.rt === rt) { delete c.rt; R.rt = null; const back = Math.floor(ITEMS[m.tool].cost / 2); fl.essence += back; msg = 'Pokój znów zwykły (+' + back + ' Esencji).'; }
        else { const was = c.rt; c.rt = rt; R.rt = rt; msg = 'Pokój: ' + RT_INFO[rt].name + (was ? ' (zamiast: ' + RT_INFO[was].name + ')' : '') + '. ' + ITEMS[m.tool].desc.split(': ').slice(1).join(': ').replace(/ Stuknij znacznik pokoju\.$/, ''); }
      }
    }
    if (!ok) { undoStack.pop(); updateUndoBtn(); setHint('Tu się nie da.'); return false; }
    fl.essence -= cost;
    fl.stats.built++; bt(m.tool).placed++; bt(m.tool).spent += cost;
    run.next = run.next || makeWave(run.wave);
    updateTray();
    setHint(msg + (refund ? ' Elementy, które straciły miejsce, wróciły jako ' + refund + ' Esencji.' : ''));
    if (run.tut >= 0) tutEvent('tool');
    return true;
  }

  /* ================= scoring, damage and fear ================= */
  // v14: damage types, bodies, phobias, traumas
  function typeMult(h, dtp) {
    let k = (CLASS_RES[h.type] || {})[dtp] || 1;
    const P = h.phys && PHYS[h.phys]; if (P && P.res[dtp]) k *= P.res[dtp] > 1 ? 1 + (P.res[dtp] - 1) * (1 + (mods.weakK || 0)) : P.res[dtp];
    return k * ((mods.dmgType && mods.dmgType[dtp]) || 1) * (mods.arsenal && fl.arsenal4 ? 1 + mods.arsenal : 1);
  }
  function revealPhys(h, dtp, tk) {
    const P = h.phys && PHYS[h.phys];
    if (!P || !P.res[dtp] || h.known.has('phys')) return;
    h.known.add('phys'); if (h.entry) h.entry.known = [...h.known]; fl.stats.revealed = (fl.stats.revealed || 0) + 1; tl('rv', h.id, 'phys');
    say(h, pick(P.res[dtp] > 1 ? SAY.weakHit[dtp] : SAY.resistHit[dtp]), 3, 1.8);
    floatHero(h, (P.res[dtp] > 1 ? 'Słabość: ' : 'Odporność: ') + DMG_TYPES[dtp], P.res[dtp] > 1 ? '#ffb35c' : '#9fc6ff', 13, -1.0);
  }
  function phobiaOn(h, attr, src, dtp) {
    const F = h.phobia && PHOBIAS[h.phobia];
    if (!F) return false;
    return (attr && (F.attrs || []).includes(attr)) || (dtp && (F.types || []).includes(dtp)) || (src && (F.srcs || []).includes(src)) ||
      (F.dark && (isRt(h.room, 'fog') || h.alone || h.lost));
  }
  function revealPhobia(h) {
    if (h.known.has('phobia')) return;
    h.known.add('phobia'); if (h.entry) h.entry.known = [...h.known]; fl.stats.revealed = (fl.stats.revealed || 0) + 1; tl('rv', h.id, 'phobia');
    say(h, pick(SAY.phobia[h.phobia]), 4, 2.2); floatHero(h, 'Fobia: ' + PHOBIAS[h.phobia].name, '#c3b2ff', 13, -1.1);
  }
  function phobiaMult(h, attr, src, dtp) {
    let k = 1;
    if (phobiaOn(h, attr, src, dtp)) { k *= (PHOBIAS[h.phobia].dark ? 1.6 : 2) + (mods.phobiaK || 0); revealPhobia(h); fl.stats.phobiaFear = (fl.stats.phobiaFear || 0) + 1; }
    const tt = dtp || (attr && DMG_OF[attr]);
    if (tt && h.trauma && h.trauma[tt]) k *= 1.5 + 0.5 * (mods.traumaK || 0);
    if (mods.isolation && (h.alone || h.lost)) k *= src === 'alone' ? 2.5 : 1.25;   // Izolacja
    if (mods.heavyAir && (isRt(h.room, 'fog') || isRt(h.room, 'crypt'))) k *= 1 + mods.heavyAir;   // Ciężkie powietrze
    return k;
  }
  // seeing what he fears: a jolt the first time (15% of courage), once per element
  function phobiaSight(h, r) {
    const F = h.phobia && PHOBIAS[h.phobia];
    if (!F || !F.sees || h.fleeing || r < 0) return;
    fl.items.forEach(it => {
      if (!F.sees.includes(it.type) || h.phobiaSeen.has(it) || slotRoom(it.type, it.x, it.y) !== r || it.disabled) return;
      if (TRAPS[it.type] && !it.detected && !SCARE[it.type] && it.type !== 'fire') return;   // hidden traps scare nobody (the scary things are there to be seen)
      h.phobiaSeen.add(it); addFear(h, 0.15 * h.courage * (1 + (mods.phobiaK || 0) / 2), null, 'phobia'); revealPhobia(h);
    });
  }
  function bt(type) { return fl.byType[type] || (fl.byType[type] = { placed: 0, spent: 0, checks: 0, crit: 0, ok: 0, miss: 0, skip: 0, fires: 0, hits: 0, dmg: 0, pts: 0, fear: 0, fearPts: 0, kills: 0, disarmed: 0, died: 0, passiveDmg: 0, passivePts: 0, skipLethal: 0, slept: 0 }); }
  function srcKind(src) {
    if (src.kind) return src.kind;
    if (TRAPS[src.type]) return 'trap';
    if (MONSTERS[src.type]) return 'monster';
    return 'other';
  }
  function damage(h, amt, src, comboMult) {
    if (h.dead || h.fled || amt <= 0 || fl.ending !== null) return;
    const kind = srcKind(src);
    comboMult = comboMult || 1;
    const tkey = kind === 'trap' && src.type ? src.type : null;
    if (tkey) {
      // self-defence first: the thief may dodge a single hit, a talisman's ward (a power the hero switches on) soaks part of it
      if (h.type === 'thief' && (tkey === 'spikes' || tkey === 'arrows') && !held(h) && fl.time > h.dodgeCd && Math.random() < h.R.dodge) {
        h.dodgeCd = fl.time + 3; fl.stats.dodges++; say(h, pick(SAY.dodge), 2); floatHero(h, 'Unik', '#c9f0b0', 14, -0.6); return;
      }
      if (fl.time < h.wardUntil && !(tkey === 'arrows' && src.lvl >= 3)) {   // piercing arrows go through; acid corrodes the ward
        amt *= 1 - h.wardK * (inB('acid', h.room) ? 0.5 : 1); fl.stats.charmSoak = (fl.stats.charmSoak || 0) + 1;
        if (amt <= 0.5) return;
      }
      amt *= trapMult(h, tkey, src);
      const ar = gearR(h, 'armor');   // armour takes the edge off every trap (acid eats half of that too)
      if (ar) amt *= 1 - (1 - Math.pow(0.92, ar * itemPow(h))) * (inB('acid', h.room) ? 0.5 : 1);
    } else if (caged(h)) amt *= 1.5;
    if (h.cursed && kind !== 'heart') amt *= 1.3;   // a cursed treasure: everything hurts more
    // v14: the damage type against the hero's class, body and scars (a weakness shows the first time it bites)
    const dtp = kind === 'burn' ? 'fire' : kind === 'heart' ? null : DMG_OF[tkey || (src && src.type) || (kind === 'loot' ? 'loot' : '')] || null;
    if (dtp) { const tk = typeMult(h, dtp); amt *= tk; if (tk !== 1) revealPhys(h, dtp, tk); }
    const attr = tkey || (kind === 'monster' ? src.type : kind === 'burn' ? (h.burnBy || 'fire') : kind === 'loot' ? 'loot' : null);
    const real = Math.min(h.hp + h.shield, amt);
    let rest = amt;
    if (h.shield > 0) { const ab = Math.min(h.shield, rest * (inB('acid', h.room) ? 0.5 : 1)); h.shield -= ab; rest -= ab; }   // acid eats through half of a ward
    h.hp -= rest; h.flash = 0.12; h.hurtAt = fl.time;
    if (kind !== 'heart') h.playerDmg += real * (kind === 'monster' ? MON_FACTOR : 1);
    feltBy(h, real / h.max);   // 1.05: what hurt him (told in the tavern)
    if (attr) { const b = bt(attr); if (kind === 'monster') b.passiveDmg += real; else b.dmg += real; }
    if (kind === 'trap') fl.party.morale = Math.max(0.15, fl.party.morale - 0.03);
    if (h.hp <= 0) { h.hp = 0; h.dead = true; kill(h, kind, attr); return; }
    if (kind === 'trap' && real >= 0.25 * h.max && fl.time - (fl.party.lastSay.friendHit || -99) > 5) {   // 1.05: a friend sees it and reacts
      const o = alive().find(q => q !== h && !q.fleeing && !panicking(q) && !q.lost && hdist(q, h) <= 4);
      if (o) { fl.party.lastSay.friendHit = fl.time; fl.party.queueSay.push({ id: o.id, text: nameFill(pick(SAY.friendHit), h), at: fl.time + 0.5 }); }
    }
    if (h.type === 'barbarian' && real >= 0.2 * h.max && kind !== 'heart' && fl.time > h.rageCd && !raging(h)) startRage(h, 'hit');   // 1.05: a hard blow wakes the fury
    if (h.boss === 'final' && !h.raged && h.hp < 0.5 * h.max) {   // the hero of the prophecy, half dead, gets back up angrier
      h.raged = true; h.hp = Math.min(h.max, h.hp + 0.2 * h.max); h.shield = Math.max(h.shield, 0.2 * h.max); fl.stats.rage = 1;
      alive().forEach(o => { if (o !== h) o.fear = Math.max(0, o.fear - 0.2 * o.courage); });
      say(h, pick(SAY.finalRage), 4, 2.4); floatHero(h, 'Gniew!', '#ff6b6b', 16, -1); shake = Math.max(shake, 0.25);
    }
    if (dtp && real > 0) {
      h.dmgBy[dtp] = (h.dmgBy[dtp] || 0) + real;
      // trauma: a wound that nearly kills him makes that kind of thing terrifying for the rest of the wave
      const tl0 = mods.traumaK ? 0.5 : 0.35;
      if (!h.trauma[dtp] && h.hp < tl0 * h.max && h.hp + real >= tl0 * h.max) {
        h.trauma[dtp] = true; fl.stats.traumas = (fl.stats.traumas || 0) + 1; tl('tr', h.id, dtp);
        say(h, pick(SAY.trauma[dtp]), 4, 2.2); floatHero(h, 'Trauma: ' + DMG_TYPES[dtp], '#ff9a9a', 13, -1.1);
      }
    }
    let pts = real / h.max * GZ.dmg * DMG_FACTOR[kind] * depthMult(h.room) * lootMult(h);   // v15: Groza against his max HP (gear-laden heroes bleed more); the combo is applied in addPts
    if (pts > 0 && h.hp < 0.3 * h.max && (kind === 'trap' || kind === 'loot' || kind === 'burn')) {
      fl.stats.edgePts += pts * 0.5; pts *= 1.5;
      if (fl.time - h.edgeAt > 1.5) { h.edgeAt = fl.time; floatHero(h, 'Na skraju!', '#ff9a3c', 15, -0.9); }
    }
    if (pts > 0) {
      const gz = pts; pts = addPts(pts, null, h);
      if (attr) { const b = bt(attr); if (kind === 'monster') b.passivePts += pts; else b.pts += pts; }
      if (kind === 'trap' || kind === 'loot') { fl.stats.dmgPts += pts; h.accG = Math.max(0, (h.accG || 0) - gz); floatHero(h, '+' + fmtG(gz) + (h.alone ? (h.female ? ' sama!' : ' sam!') : ''), h.alone ? '#e6dcff' : '#c3b2ff', 16); }   // 1.01: Groza over the hero; the Esencja comes when the combo ends
      else if (kind === 'burn') { fl.stats.dmgPts += pts; h.acc += pts; }
      else { fl.stats.dmgPts += pts; h.acc += pts; }
    }
    // wounds scare too, less than a scare trap: losing all HP is worth 25% of courage (monsters 18%; Ryk potworów: x2,5 per copy)
    // v15.1: was 35% / 25%; fear pays more Groza now (1,6), so the fear from wounds pays about what it did and scares less
    if (kind !== 'heart' && kind !== 'loot') addFear(h, real / h.max * h.courage * (kind === 'monster' ? 0.18 * (1 + mods.monsterFear) : 0.25) * (fl.surprise && kind === 'trap' ? 1.3 : 1), attr, kind === 'monster' && mods.monsterFear ? 'roar' : 'dmg', dtp);
    if (kind === 'trap' && real >= 8 && Math.random() < 0.35) say(h, pick(h.hp < 0.3 * h.max ? SAY.hurtScared : SAY.hurt), h.hp < 0.3 * h.max ? 2 : 1, 1.4);
    if (kind === 'trap' && !h.dead && h.hp < 0.6 * h.max) useCharm(h, 'hit');   // a hard hit: switch the talisman on for what comes next
  }
  // Fear: the second currency of the dungeon. Every bit of it scores; past a hero's courage he runs for the exit.
  function fearResist(h, attr) {
    let k = 1;
    if (attr && fl.knownTypes && fl.knownTypes.has(attr)) k *= 0.6;   // they knew about it: less of a shock
    if (fl.heroes.some(o => o !== h && o.type === 'priest' && o.rank >= 1 && !o.dead && !o.fled && !o.gone && hdist(o, h) <= 3)) k *= inB('altar', h.room) ? 0.875 : 0.75;   // a priest calms those around him (half as well at the altar)
    if (fl.heroes.some(o => o !== h && o.boss === 'final' && !o.dead && !o.fled && !o.gone && hdist(o, h) <= 3)) k *= 0.75;   // the prophecy walks with them
    if (fl.heroes.some(o => o.boss && !o.dead && !o.fled)) k *= 0.85;
    if (fl.time < (h.braveUntil || 0)) k *= h.braveK;   // a priest's blessing before a deadly room
    if (fl.time < h.calmUntil) k *= 0.7;   // an amulet just steadied the nerves (a power with a cooldown, see useAmulet)
    return k;
  }
  // 1.05: fury, one mechanic for everyone (it used to be a brave one's answer to a death): +25% speed, half the fear, hits monsters
  // harder. The barbarian lives in it: a death, a hard hit or panic makes him rage (panic turns into fury instead). Okowy stop it.
  function startRage(h, why, dead) {
    if (h.dead || h.fled || h.fleeing || caged(h)) return false;
    if (inB('shackles', h.room)) {
      if (!h.saidB.has('shackles' + h.room)) { h.saidB.add('shackles' + h.room); say(h, pick(SAY.bShackles), 3); fl.stats.shackleBlocks = (fl.stats.shackleBlocks || 0) + 1; }
      return false;
    }
    const barb = h.type === 'barbarian';
    h.rageUntil = fl.time + (barb ? 8 : 6); h.rageCd = fl.time + (barb ? 14 : 20); fl.stats.rages = (fl.stats.rages || 0) + 1; tl('rg2', h.id, why);
    say(h, why === 'death' && dead ? nameFill(pick(SAY.revenge), dead) : why === 'panic' ? pick(SAY.rageNoPanic) : pick(SAY.rage), 4, 2.2);
    floatHero(h, 'Furia!', '#ff9a9a', 13, -0.8);
    return true;
  }
  const raging = h => fl.time < h.rageUntil && !inB('shackles', h.room);
  function addFear(h, amt, attr, src, dtp) {
    if (h.dead || h.fled || amt <= 0) return;
    const raw = amt;
    amt *= mods.fearMult * fearResist(h, attr) * (1 + 0.03 * (run.stacks.chronicle || 0) * mods.chronicle) * (isRt(h.room, 'fog') ? 1.15 : 1);   // Mgła: +15%
    if (raging(h)) amt *= 0.5;   // 1.05: fury dulls fear
    amt *= phobiaMult(h, attr, src, dtp);   // v14: phobias (x2) and this wave's traumas (x1,5)
    if (attr) h.fearBy[attr] = (h.fearBy[attr] || 0) + amt; else if (src) h.fearBy[src] = (h.fearBy[src] || 0) + amt;
    if (attr && fl.firing && fl.firing.type === attr) feltBy(h, amt / h.courage);   // 1.05: what scared him (told in the tavern)
    const sk = src || attr || 'other'; fl.stats.fearSrc[sk] = (fl.stats.fearSrc[sk] || 0) + amt;
    const before = h.fear;
    h.fear += amt;
    const pts = addPts(amt / h.courage * GZ.fear * depthMult(h.room) * loneMult(h), 'fearPts', h); fl.stats.fearDealt += amt; h.acc += pts;   // v15: Groza against his courage
    if (attr) { const b = bt(attr); b.fear += amt; b.fearPts += pts; }
    // Grota: the scream echoes into the rooms and corridors next door (40%, and the echo does not echo again)
    if (src !== 'echo' && isRt(h.room, 'grotto')) { const nb = nbrRooms(h.room); alive().forEach(o => { if (o !== h && nb.includes(o.room)) addFear(o, raw * 0.4, attr, 'echo'); }); }
    const lim = h.courage * (fl.fearless ? 1.3 : 1);
    if (!h.fleeing && !h.crystal && h.fear >= [0.85, 0.7, 0.6, 0.6][h.rank] * lim) useAmulet(h);   // the amulet, before the nerves go (rookies late)
    const pk = h.trait === 'coward' ? 0.55 : 0.7;   // cowards panic early
    // 1.05: a barbarian on the edge of panic gets angry instead (once in a while; not in Okowy)
    if (h.type === 'barbarian' && before < pk * lim && h.fear >= pk * lim && !h.fleeing && !h.crystal && fl.time > h.rageCd && startRage(h, 'panic')) { h.fear = Math.max(0, h.fear - 0.25 * lim); fl.stats.rageNoPanic = (fl.stats.rageNoPanic || 0) + 1; return; }
    if (before < pk * lim && h.fear >= pk * lim && !h.fleeing && !h.crystal && fl.time > h.panicUntil) {
      h.panicUntil = fl.time + 2 + Math.random() * 2; h.needPlan = true; fl.stats.panics++; say(h, pick(SAY.panic), 3, 1.8);
    }
    if (h.fear >= lim && h.crystal && !caged(h)) dropCrystal(h);   // v14.1: terror beats greed: the carrier throws the crystal away and runs
    if (h.fear >= lim && !h.fleeing && !h.crystal && !caged(h)) startFlee(h);   // v14.1: the cage holds, fear or not (see cage deaths)
  }
  function dropCrystal(h) {
    fl.stats.crystalDropped = (fl.stats.crystalDropped || 0) + 1; tl('cd', h.id);
    say(h, pick(SAY.crystalFear), 4, 2.2); floatHero(h, 'Rzuca kryształ!', '#ff9ab0', 15, -1);
    crystalReturns(h);
    if (!h.fleeing) startFlee(h);
  }
  function startFlee(h) {
    if (caged(h)) { freeCaged(h, false, 'panic'); say(h, pick(SAY.cageBreak), 4); }
    h.fleeing = true; h.needPlan = true; fl.stats.flees++; tl('fl', h.id); tutPop('flee');
    if (mods.fleeShock) alive().forEach(o => { if (o !== h && !o.fleeing) addFear(o, mods.fleeShock * o.courage, null, 'screams'); });   // Krzyki w ścianach
    if (h.state === 'rest' || h.state === 'talk' || h.state === 'wait' || h.state === 'boss' || h.state === 'disarm' || h.state === 'free') { h.state = 'walk'; h.item = null; }
    say(h, pick(h.trait === 'coward' ? SAY.cowardRun : SAY.flee), 4, 2);
    floatHero(h, 'Ucieka!', '#c3b2ff', 14, -0.8);
    // the champion will not have it: a battle cry steadies everyone else (once every 15 s)
    const ch = fl.heroes.find(o => o.boss === 'champion' && o !== h && !o.dead && !o.fled && !o.gone && !o.fleeing && !caged(o));
    if (ch && fl.time > (ch.shoutCd || 0)) {
      ch.shoutCd = fl.time + 15; fl.stats.shouts = (fl.stats.shouts || 0) + 1;
      say(ch, pick(SAY.champShout), 4, 2.2); floatHero(ch, 'Okrzyk!', '#ffd27a', 15, -0.9);
      alive().forEach(o => { if (o !== h && !o.fleeing) o.fear = Math.max(0, o.fear - 0.25 * o.courage); });
    }
    const P = fl.party, crew = alive();
    const L = leader();
    if (L && L !== h && L.R.coord && Math.random() < 0.6) say(L, pick(SAY.fleeShout), 2);
    if (P.plan !== 'flee' && P.plan !== 'escape' && crew.filter(o => o.fleeing).length >= Math.max(2, Math.ceil(crew.length / 2))) partyFlee();
    if (mods.panic) {   // Panika: a hero who bolts scares everyone close by (and they may bolt too)
      fl.stats.panicked = (fl.stats.panicked || 0) + 1;
      alive().forEach(o => { if (o !== h && !o.fleeing && hdist(o, h) <= 3) addFear(o, 25 * mods.panic, null, 'panic'); });
    }
  }
  function partyFlee() {
    const P = fl.party;
    if (P.plan === 'flee' || P.plan === 'escape') return;
    P.plan = 'flee'; fl.stats.partyFlees++;
    alive().forEach(o => { if (!o.crystal) { o.fleeing = true; } o.needPlan = true; if (o.state === 'rest' || o.state === 'talk' || o.state === 'boss' || o.state === 'wait') o.state = 'walk'; });
    const L = leader(); if (L) say(L, pick(SAY.partyFlee), 4, 2.2);
  }
  // The carrier loses the crystal (killed, or down a bottomless well): it rolls back to the heart and the others decide what now.
  function crystalReturns(h) {
    const P = fl.party;
    h.crystal = false; P.carrierId = -1; fl.stats.crystalSaved++; tl('cs', h.id);
    const cp = addPts(GZ.crystal, 'crystalPts');
    floatTile(fl.heart.x, fl.heart.y, 'Kryształ wraca! +' + fmtE(cp) + ' Esencji', '#ff7a86', 17, -1);
    const crew = alive();
    crew.forEach(o => say(o, pick(SAY.crystalDrop), 4));
    if (crew.length >= 2 && crew.reduce((a, o) => a + o.fear / o.courage, 0) / crew.length < 0.55 && !crew.some(o => o.fleeing)) { P.plan = 'assault'; P.steal = 0; }
    else partyFlee();
    crew.forEach(o => { o.needPlan = true; });
  }
  // A dead hero: points, a soul for the dungeon, a louder legend (Infamy), panic among the others. His secrets die with him.
  function kill(h, kind, attr) {
    const p = heroPos(h);
    h.acc = 0; h.foe = null; h.bubble = null; h.outR = realNow; h.outKind = 'dead';   // 1.09: he tips over
    fl.stats.kills++; buzz(14);
    if (kind === 'heart') fl.stats.killsHeart++; else if (kind === 'monster') fl.stats.killsMon++; else fl.stats.killsTrap++;
    if (attr) bt(attr).kills++;
    burst(p.x, p.y, '#d8434f', 16);
    const crypt = isRt(h.room, 'crypt');
    const pts = addPts(GZ.kill * (h.boss ? 2 : 1) * mods.soulMult * (crypt ? 1.5 : 1), 'killPts', h); tl('k', h.id, attr || kind);   // v15: a death is Groza like everything else (Żniwiarz x2, Krypta x1,5)
    fl.stats.souls++;
    if (mods.granary) run.stacks.granary = (run.stacks.granary || 0) + 1;   // Spichlerz dusz: the heart wants 1 less for good (1.01)
    if (attr === 'spikes' && mods.hunger) run.stacks.hunger = (run.stacks.hunger || 0) + 1;   // Głodne kolce
    addFloat(p.x, p.y - 0.1, 'Śmierć +' + fmtE(pts) + ' Esencji', '#ff7a86', 15, -0.4);
    const P = fl.party;
    if (h.crystal) crystalReturns(h);   // the crystal falls and rolls back to the heart
    // his gear and his purse spill out as loot around the body: the exact items, free for the next one who dares (no Esencja back for these)
    h.inv.forEach(it => dropItem(h, it, 0));
    if (h.gold > 0) dropItem(h, null, h.gold);
    h.inv = []; h.gold = 0;
    // the others react: a death scares everyone (a lot up close, more in a crypt, cowards most), less than a scare trap does,
    // and it stays with them for a while (fear fades slowly when shaken). Veterans feel it too: it scales with courage.
    P.morale = Math.max(0.15, P.morale - 0.25);
    if (mods.lastGasp) alive().forEach(o => { if (o.room === h.room) addFear(o, mods.lastGasp * o.courage, null, 'death'); });   // Ostatnie tchnienie
    alive().forEach(o => {
      const q = heroPos(o), near = Math.hypot(q.x - p.x, q.y - p.y) < 8;
      const base = (near ? Math.max(15 * o.R.panic, 0.12 * o.courage + 4) : Math.max(5 * o.R.panic, 0.05 * o.courage + 2)) * (crypt ? 2 : 1);   // v14: softer for rookies (was max(30 x panic, ...))
      o.shakenUntil = fl.time + (near ? 9 : 5);
      // a brave one (and now and then a warrior) turns grief into fury instead of fear
      if (!o.fleeing && (o.trait === 'brave' || o.type === 'barbarian' || (o.type === 'warrior' && Math.random() < 0.3)) && startRage(o, 'death', h)) {
        fl.stats.revenge = (fl.stats.revenge || 0) + 1;
        addFear(o, base * 0.3, null, 'death');
        return;
      }
      if (Math.random() < 0.55) say(o, nameFill(pick(o.fleeing || goingOut() ? SAY.deathFlee : SAY.death), h), 4, 2.2);   // 1.05: no talk of revenge while running
      const f0 = o.fear;
      addFear(o, base * (o.trait === 'coward' ? 1.5 : 1), null, 'death');
      fl.stats.deathFear += Math.max(0, o.fear - f0);
      if (near && o.fear - f0 >= 8) floatHero(o, 'Groza', '#c3b2ff', 12, -1.0);
    });
    if (P.leaderId === h.id) P.leaderId = -1;
    if (P.scoutId === h.id) P.scoutId = -1;
  }

  /* ================= loot, greed and hero gear ================= */
  function rollItem(r, pool) {
    const types = pool || Object.keys(HITEMS).filter(t => !HITEMS[t].loot), total = types.reduce((a, t) => a + HITEMS[t].w, 0);
    let x = Math.random() * total, t = types[0];
    for (const k of types) { x -= HITEMS[k].w; if (x <= 0) { t = k; break; } }
    return { type: t, r, cdUntil: 0, charges: powerCharges(t, r) };
  }
  const itemPow = h => mods.itemPower * (h && h.cursed ? 0.5 : 1);   // Rdza and a curse weaken gear
  const potionHeal = it => Math.min(0.55, 1 - Math.pow(0.7, it.r));   // a potion heals 30% of max HP, a rare one 51%, never more than 55%
  const gearR = (h, t) => h.inv.reduce((a, x) => x.type === t ? Math.max(a, x.r) : a, 0);
  function itemLabel(it) { const H = HITEMS[it.type]; return H.name + (it.r > 1 ? ' (' + adj(H.g, it.r) + ')' : ''); }
  function itemAcc(it) { const H = HITEMS[it.type]; return (it.r > 1 ? (H.g === 'f' ? adj('fAcc', it.r) : adj(H.g, it.r)) + ' ' : '') + H.acc; }
  // What a piece of gear is worth to this hero right now (0 = no use for it): potions matter when hurt, a second power of a kind
  // only if it is better, each class has its favourite (warrior: talisman, weapon, armour; priest: amulet; thief: boots).
  function itemValue(h, it) {
    const P = it.type, r = it.r, others = h.inv.filter(x => x !== it && x.type === P);
    if (P === 'potion') return r * (h.hp < 0.6 * h.max ? 2.5 : 1) / (1 + 0.7 * others.length);
    if (P === 'bomb') return 0.8 * r / (1 + 0.5 * others.length);
    const pref = { charm: 'warrior', amulet: 'priest', boots: 'thief', weapon: 'warrior', armor: 'warrior' }[P];
    const best = others.reduce((a, x) => Math.max(a, x.r), 0);
    return best ? Math.max(0, r - best) * 1.2 : r * 1.2 * (pref === h.type ? 1.3 : 1);
  }
  // Something lands on the floor next to the hero (swapped out, or spilled from a body): the exact item, loot for anyone.
  function dropItem(h, item, gold, noGreed) {
    const spots = [[h.tx, h.ty]].concat(DIRS8.map(d => [h.tx + d[0], h.ty + d[1]]));
    const s = spots.find(t => walkable(t[0], t[1]) && !fl.items.has(key(t[0], t[1])));
    if (!s) return false;
    const type = gold ? 'loot' : item.type === 'potion' ? 'lpotion' : item.r >= 3 ? 'loot3' : 'loot2';
    fl.items.set(key(s[0], s[1]), { type, x: s[0], y: s[1], cd: 0, anim: 0, disabled: false, hp: 0, max: 0, power: 1, shot: 0, flash: 0, preview: 0,
      dropped: true, spent: 0, item: item ? Object.assign({}, item, { cdUntil: 0 }) : null, gold: gold || 0, noGreed: !!noGreed });   // a power keeps the uses it has left
    const d = [...fl.items.values()].filter(o => o.dropped);   // at most 10 piles of spilled gear lie around (the oldest are trampled into the dirt)
    while (d.length > 10) { const o = d.shift(); fl.items.delete(key(o.x, o.y)); }
    return true;
  }
  // A hero takes a piece of gear. One power, weapon and armour of a kind: a better one replaces the old one (left on the floor);
  // a full pack swaps out its least useful item if the new one is worth more, otherwise he leaves it.
  function giveItem(h, item, quiet) {
    const H = HITEMS[item.type]; item.cdUntil = item.cdUntil || 0;
    if (H.use === 'power' || H.use === 'gear') {
      const cur = h.inv.find(x => x.type === item.type);
      if (cur) {
        if (cur.r >= item.r) { if (!quiet) say(h, pick(SAY.noNeed), 1); return false; }
        h.inv.splice(h.inv.indexOf(cur), 1); dropItem(h, cur, 0, true);
        h.inv.push(item); fl.stats.swaps++; fl.stats.itemsGot++; tl('sw', h.id, cur.type + cur.r, item.type + item.r);
        if (!quiet) { say(h, pick(SAY.swap), 2); floatHero(h, itemLabel(cur) + ' → ' + itemLabel(item), '#c3b2ff', 12, -0.7); }
        return true;
      }
    }
    if (h.inv.length >= (h.invCap || 3)) {
      const v = itemValue(h, item);
      let low = -1, lv = 1e9; h.inv.forEach((o, i) => { const ov = itemValue(h, o); if (ov < lv) { lv = ov; low = i; } });
      if (low < 0 || lv >= v) { if (!quiet) say(h, pick(SAY.full), 1); return false; }
      const old = h.inv.splice(low, 1)[0]; dropItem(h, old, 0, true);
      fl.stats.swaps++; tl('sw', h.id, old.type + old.r, item.type + item.r);
      if (!quiet) { say(h, pick(SAY.swap), 2); floatHero(h, itemLabel(old) + ' → ' + itemLabel(item), '#c3b2ff', 12, -0.7); }
    } else if (!quiet) say(h, 'Mam ' + itemAcc(item) + '!', item.r >= 2 ? 3 : 2);
    h.inv.push(item); fl.stats.itemsGot++;
    return true;
  }
  // Greed grows when they SEE treasure (each kind its own pull, a Sezam doubles it); picking it up adds a little more.
  function noticeLoot(it, by) {
    if (it.seenWave === run.wave) return;
    it.seenWave = run.wave;
    if (it.noGreed) return;   // their own old gear, just put down
    const kind = LOOT_KIND[it.type], r = ITEMS[it.type].rarity || 1;
    const g = LOOT_GREED[kind][0] * mods.greedMult * (isRt(roomOf(it.x, it.y), 'vault') ? 2 : 1) * (kind === 'gold' ? 1 + mods.goldDust : 1) * (kind === 'relic' && mods.reliquary ? 1.5 : 1) / (1 + 0.15 * fl.stats.lootSeen);
    setGreed(fl.greed + g); fl.stats.lootSeen++; tl('ls', it.x, it.y, r);
    floatTile(it.x, it.y, 'Chciwość ×' + fmt2(fl.greed), '#f2b94b', 14, -0.6, 'greed');
    if (by && (by.fleeing || by.crystal || panicking(by) || goingOut())) { if (r >= 2) say(by, pick(SAY.lootFlee), 2); }   // 1.05: running for his life, he has no joy for gold
    else if (by) say(by, kind === 'potion' ? pick(['Mikstura!', 'Tam leży mikstura.', 'Lekarstwo!']) : pick(SAY['loot' + Math.min(3, r)]), r >= 2 ? 3 : 2);
  }
  // Picking it up: coins go to the purse, the rest is a real item (or the exact one that was dropped). No use or no room: it stays.
  function pickup(h, it) {
    const kind = LOOT_KIND[it.type], r = ITEMS[it.type].rarity || 1;
    noticeLoot(it, null);
    let item = null;
    if (it.item) item = Object.assign({}, it.item);
    else if (kind === 'potion') item = { type: 'potion', r: 1, cdUntil: 0 };   // (powers rolled from gear come with their uses)
    else if (kind === 'gear' || kind === 'cursed') item = rollItem(2, GEAR_POOL);
    else if (kind === 'relic' && !mods.reliquary) item = rollItem(3, Object.keys(HITEMS));
    if (item && kind !== 'cursed' && !giveItem(h, item)) { h.lootMemo.set(key(it.x, it.y), { go: false, t: fl.time + 60 }); return false; }   // he leaves it lying (and will not come back for it)
    fl.items.delete(key(it.x, it.y));
    h.loot++;
    const kg = LOOT_GREED[kind];
    // 1.03: taking it pulls less each time, like seeing it (Odwrotna chciwość x3 on top), and the greed that stays for good
    // grows ever slower: in replays of the author's 223-relic run both kept climbing without end
    setGreed(fl.greed + kg[1] * mods.greedMult * mods.pickGreed / (1 + 0.15 * fl.stats.loot)); tl('lp', h.id, r, kind);
    if (!it.dropped) { const keep = 0.5 * kg[0] * mods.greedMult / (1 + 0.5 * run.greedKeep); run.greedKeep += keep; fl.stats.greedKept = (fl.stats.greedKept || 0) + keep; }   // part of its pull stays for good
    const pts = addPts(GZ.loot * r * depthMult(roomOf(it.x, it.y)), 'lootPts', h); fl.stats.loot++;
    floatTile(it.x, it.y, '+' + fmtE(pts) + ' łup', '#ff7a86', 16);
    if (kind === 'gold') { const n = Math.max(1, it.gold || 1); h.gold += n; fl.stats.goldPicked += n; say(h, pick(h.gold >= 3 ? SAY.goldHeavy : SAY.gold), 2); }
    if (kind === 'cursed') curse(h, item);
    if (mods.lootTrap > 0) damage(h, mods.lootTrap * r, LOOTTRAP);
    if (kind === 'relic' && !it.dropped) gainEssence(null, 4, 'essDrop');
    updateTray();   // 1.03: the price of that loot drops again
    replanAll();
    return true;
  }
  function curse(h, item) {
    h.cursed = true; fl.stats.cursed++; tl('cu', h.id);
    if (item) giveItem(h, item, true);   // he keeps the (cursed) gear if he has room
    say(h, pick(SAY.cursedPick), 3, 2.2); floatHero(h, 'Klątwa!', '#b48cff', 15, -0.8);
    const p = heroPos(h); burst(p.x, p.y, '#b48cff', 12);
  }
