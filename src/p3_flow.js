
  /* ================= scoring helpers ================= */
  function isEdgeRoom(r) { return fl.rooms[r].dist >= fl.maxD - 1; }
  function depthMult(r) {
    if (r < 0 || !fl.rooms[r]) return 1;
    const R = fl.rooms[r];
    return 1 + (S.depthMax - 1) * R.dist / fl.maxD + (isEdgeRoom(r) ? mods.depthBonus : 0) + (R.rt === 'vault' ? 0.15 : 0);
  }
  // Points, like Balatro: every wound, every scare, every kill and every hero scared away adds to the wave's GROZA (the base,
  // how deadly and scary the dungeon is); at the end the whole Groza is multiplied by CHCIWOŚĆ (the mult, how tempting it is).
  // The Esencja a wave brings is FOOD. Prototype 1.01 (author's decision): from wave 2 the heart takes its need out of THIS
  // wave's Esencja first; only the rest goes to your purse. A wave that brings less: the heart eats what it got and a crystal.
  // Like a Balatro blind, the wave's score is the goal, so you want the heroes to stay in the dungeon, not to throw them out.
  // 1.11.1 (author: the heart takes the value of its bar, and the bar has to follow how Esencja really comes in): the bar is
  // half of what a typical wave brings. Fitted to the author's three runs with the 1.10 economy (4 heroes, the greed curve) a
  // typical wave brings about 73 x 1,257^(wave - 2) (73, 146 in wave 5, 289 in wave 8, 457 in wave 10), so the heart wants
  // 37 x 1,25^(wave - 2): 37, 72 in wave 5, 141 in wave 8, 221 in wave 10 (1.10: 20 to 119, about a quarter of a wave).
  // A wave under half of the usual feeds nothing and costs a crystal; the heart's half keeps the purse from piling up.
  // 1.12: the first run (with the guide) is a real run, so its heart is hungry from wave 2 too
  // 1.26 "Serce zabiera" (plan 4.2): the hunger is a table (waves 2-10, then x1,2 a wave) times the cards (hungerK, Głodomór) and
  // the omen, plus what the dungeon adds: +1 for every monster knocked down in the wave before (Odrodzenie), +2 for every Demon
  // otchłani in the dungeon, a Kredyt krwi owed; minus Spichlerz dusz (at most 40 a run) and a demon's Głód krwi. The guided first
  // run: waves 2-4 x0,85. In a wave the need is frozen at its start (fl.needNow), so the bar never moves under the player.
  const HUNGER_T = [0, 0, 38, 50, 72, 104, 150, 190, 230, 272, 350];
  const hungerTab = n => n < HUNGER_T.length ? HUNGER_T[n] : HUNGER_T[HUNGER_T.length - 1] * Math.pow(1.2, n - HUNGER_T.length + 1);
  const demonCount = () => { let n = 0; if (fl && fl.items) fl.items.forEach(it => { if (it.type === 'demon' && !it.temp) n++; }); return n; };
  // 1.26 (15): the omen of wave n, rolled once when its party is made (waves 3, 6, 8; endless: every wave without a boss)
  function omenOf(n) {
    if (!run) return null; run.omens = run.omens || {};   // a run saved before 1.26
    if (run.omens[n] !== undefined) return run.omens[n];
    let o = null;
    if (!run.tutorial && ((userStarted && stageOf() >= 4) || run.omenAlways) && (OMEN_WAVES.includes(n) || (n > RUN_WAVES && !bossOf(n)))) {   // (scripted runs: tests and bots, only when they ask)
      const used = new Set(Object.values(run.omens)), pool = Object.keys(OMENS).filter(k => (OMENS[k].minW || 0) <= n);
      const fresh = pool.filter(k => !used.has(k)); o = pick(fresh.length ? fresh : pool);
    }
    run.omens[n] = o; return o;
  }
  const omenName = n => { const o = run && run.omens && run.omens[n]; return o && OMENS[o] ? OMENS[o].name : null; };
  const omenK = (n, k) => { const o = run && run.omens && run.omens[n], O = o && OMENS[o]; return O && O[k] || 0; };   // 1.26 (F6): an omen's number for wave n
  function hungerParts(n) {
    if (n < 2 || !run || !(S.hungerK > 0)) return null;
    let mul = S.hungerK * ((mods && mods.hungerK) || 1);
    if (run.tutorial && n <= 4) mul *= 0.85;
    if (omenK(n, 'hunger')) mul *= omenK(n, 'hunger');
    const at = o => o && o.w === n ? o.n : 0;
    const p = { table: hungerTab(n), base: Math.round(hungerTab(n) * mul), revive: at(run.revive), demon: (2 - Math.min(1, mods.abyssPact || 0)) * (n >= run.wave ? demonCount() : 0), credit: at(run.credit),
      granary: Math.min(40, Math.round((run.stacks.granary || 0) * ((mods && mods.granary) || 0))), blood: at(run.bloodHunger) };
    p.need = Math.max(1, Math.round(hungerTab(n) * mul + p.revive + p.demon + p.credit - p.granary - p.blood));
    return p;
  }
  const hungerNeed = n => { if (fl && fl.needFor === n && fl.phase !== 'build') return fl.needNow; const p = hungerParts(n); return p ? p.need : 0; };
  // 1.26 Danina (4.3): a fed heart keeps taking 30% of every payout into Nasycenie (cards add, 60% at most); Nasycenie raises the
  // heart's level (4.5): every level a free card from the "Dar serca" row in the shop, levels 2, 4 and 6 a slot in the deck, levels
  // 3, 5, 7 (and every second after) an Odrost card in that row when a crystal is missing
  const titheNow = () => Math.min(0.6, Math.max(0, (S.tithe != null ? S.tithe : 0.3) + (mods.titheAdd || 0) + (omenK(run.wave, 'tithe') || 0)));
  const HEART_LV = [0, 30, 75, 135, 210, 300, 410, 540];
  const heartLvAt = k => k < HEART_LV.length ? HEART_LV[k] : HEART_LV[HEART_LV.length - 1] + 150 * (k - HEART_LV.length + 1);
  const heartRegrowLv = L => L >= 3 && L % 2 === 1;
  const heartSlotLv = L => L === 2 || L === 4 || L === 6;
  function satietyAdd(v, src) {
    if (!(v > 0) || !run) return 0;
    run.satiety = (run.satiety || 0) + v;
    if (fl && fl.stats) { fl.stats.satietyGain = (fl.stats.satietyGain || 0) + v; if (src) fl.stats['sat_' + src] = (fl.stats['sat_' + src] || 0) + v; }
    let up = 0; while (run.satiety >= heartLvAt((run.heartLv || 0) + 1) - 1e-6) { heartLevelUp(src); up++; }
    return up;
  }
  function heartLevelUp(src) {
    const L = run.heartLv = (run.heartLv || 0) + 1;
    run.heartLvMax = Math.max(run.heartLvMax || 0, L);
    (run.heartPicks || (run.heartPicks = [])).push({ lv: L });
    if (heartSlotLv(L)) run.deckSize++;
    if (fl && fl.stats) fl.stats.heartUp = (fl.stats.heartUp || 0) + 1;
    if (fl && fl.phase === 'raid') { tl('hl', L); floatTile(fl.heart.x, fl.heart.y, 'Serce rośnie! Poziom ' + L, '#ffd27a', 17, -1.9); burst(fl.heart.x + 0.5, fl.heart.y + 0.5, '#ffd27a', 18); heartHit(); tutPop('heartLv'); }
    else if (fl && fl.phase === 'build') queueModal({ type: 'shop', heartNow: true });   // Ofiara crossed a level: pick at once
    updateTray();
  }
  // extra levels of the leader from greed. Up to 1.02 at most 3, so greed 23 was as safe as greed 4 (the author's run: 42 798
  // Esencja). 1.03: no ceiling, but past 4 it creeps up slowly (6: +3,7, 8: +4,2, 12: +5,0, 23: +6,1).
  const greedLv = g => g <= 4 ? Math.max(0, g - 1) : 3 + 1.8 * Math.log(g / 4);
  const huntersLv = () => S.greedW * greedLv(greedRaw(run.greedRep || 1));
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
    const cm = 1 + 0.25 * (comboNow() - 1), mx = essMultNow();
    const e = g * greedE(fl.greed) * cm * mods.regen * S.essK * mx;   // 1.26: the multipliers (essMultNow), Krezus (greedE)   // 1.12.1: S.essK (1,1) brings the Esencja back to what 1.11.1 paid (replays of the author's two runs)
    fl.base += g;
    let C = fl.chain;
    if (!C) C = fl.chain = { g: 0, prov: 0, cm: 1, greed: fl.greed, t0: fl.time, last: fl.time, trap: false, who: new Map(), n: 0, mx: 1 };
    C.mx = Math.max(C.mx || 1, mx); if (stat === 'scarePts') C.fled = true;
    C.g += g; C.prov += e; C.last = fl.time; C.n++; C.cm = Math.max(C.cm, cm); C.greed = Math.max(C.greed, fl.greed);
    if (comboLive()) C.trap = true;
    if (h && h.id != null) { C.who.set(h.id, (C.who.get(h.id) || 0) + g); h.accG = (h.accG || 0) + g; grozaOrbs(h, g); }   // the numbers over the heroes show Groza now (violet); 1.02: violet orbs fly to the equation
    if (stat) fl.stats[stat] = (fl.stats[stat] || 0) + e;
    fl.prov = (fl.prov || 0) + e;   // 1.16.1: what the events were worth at the moment (an element's Esencja on its card)
    heartLive(e, C);
    return e;
  }
  // 1.16.1 (author: the heart's bar should not wait for the combo to end): the hungry heart eats every event's worth at the
  // multipliers of the moment, as it comes. That much of the wave's Esencja is in at once (fl.score); when the chain is cashed
  // in, only what the combo made on top of it is left to share out (the heart first, then your purse), so the totals are the
  // same as before: the payout is never less than what the chain was worth as it went (greed and combo only go up in a chain).
  function heartLive(e, C) {
    const need = hungerNeed(run.wave);
    if (!(e > 0) || !(need > 0) || fl.fed >= need || fl.phase !== 'raid') return;
    const take = Math.min(e, need - fl.fed);
    fl.fed += take; C.fedLive = (C.fedLive || 0) + take; fl.score += take; fl.stats.essHeart = (fl.stats.essHeart || 0) + take;
    fl.heartOrb = (fl.heartOrb || 0) + take;
    const full = fl.fed >= need - 1e-6;
    if (fl.heartOrb >= 0.6 || full) { gainEssence('eq', 0, 'essWave', fl.heartOrb); fl.heartOrb = 0; }   // red orbs from the equation to the heart, a few, not one per event
    if (full) heartFull(need);
  }
  // 1.26 (13.2): the Esencja multipliers of this moment (they multiply each other; nothing caps them, like Balatro's xMult)
  const greedE = g => mods.croesus && g > 1 ? g * g : g;   // Krezus: greed squared in the Esencja
  function essMultNow() {
    if (!fl) return 1;
    let k = mods.cursedCrown;
    if (mods.lonewolf > 1 && fl.heroes.length > 1 && alive().length === 1) k *= mods.lonewolf;
    if (mods.palette > 1 && (fl.famN || 0) >= 5) k *= mods.palette;
    if (mods.minimalist > 1 && fl.elemN != null && fl.elemN <= 12) k *= mods.minimalist;
    if (mods.bloodbath && fl.bathK > 1) k *= fl.bathK;
    if (mods.skulls) k *= 1 + Math.min(0.6, 0.03 * (run.stacks.skulls || 0)) * mods.skulls;
    return k;
  }
  const kataK = t => mods.execDiary && run.kata && run.kata[t] ? 1 + run.kata[t] : 1;   // Pamiętnik kata
  function heartFull(need) { fl.fed = need; fl.fedAt = fl.time; tl('hg', 'full', need); floatTile(fl.heart.x, fl.heart.y, 'Serce syte!', '#ff9aa4', 16, -1.4); }
  // the chain ends: a trap chain when the combo clock runs out, a chain without a trap after 1,2 s without Groza (at most 4 s)
  function chainTick() {
    const C = fl.chain; if (!C) return;
    if (C.trap ? !comboLive() : (fl.time - C.last > 1.2 || fl.time - C.t0 > 4)) payChain();
  }
  let payN = 0;
  function payChain() {
    const C = fl && fl.chain; if (!C) return 0;
    fl.chain = null;
    const crown = C.fled && mods.fearCrown > 1 ? mods.fearCrown : 1;
    const e = C.g * greedE(C.greed) * C.cm * mods.regen * S.essK * (C.mx || 1) * crown;   // 1.26: the multipliers, Koronacja strachu
    if (crown > 1) { fl.stats.crownPays = (fl.stats.crownPays || 0) + 1; floatTile(fl.heart.x, fl.heart.y, 'Koronacja strachu ×' + fmt2(crown), '#ffd27a', 13, -1.6); }
    fl.stats.comboPts = (fl.stats.comboPts || 0) + Math.max(0, e - C.prov);
    const pre = Math.min(e, C.fedLive || 0);   // 1.16.1: the heart's share it already ate as the chain went
    fl.score += e - pre;
    fl.lastPay = { g: C.g, greed: C.greed, cm: C.cm, e, t: fl.time, n: ++payN };
    if (C.cm > 1 || e >= 1) tl('cp', Math.round(C.g * 100) / 100, Math.round(C.cm * 100) / 100, Math.round(e * 10) / 10);
    essIn(e - pre, C.who);
    if (mods.bloodflow && C.cm >= 2 - 1e-9 && hungerNeed(run.wave) > 0 && fl.fed >= hungerNeed(run.wave) - 1e-6) satietyAdd(mods.bloodflow, 'bloodflow');   // 1.26 Krwiobieg
    if (e >= 1) tutPop('pay');
    return e;
  }
  // Esencja comes in: the hungry heart takes its share first, the rest goes to the purse (Obżarstwo: x1,25 once it is fed)
  // 1.26: the fed heart takes its Danina first (it goes to Nasycenie), Obżarstwo only grows what goes to the purse
  function essIn(e, who) {
    if (!(e > 0)) return;
    const need = hungerNeed(run.wave);
    let heart = 0, tithe = 0;
    if (need > 0 && fl.fed < need) {
      heart = Math.min(e, need - fl.fed); fl.fed += heart;
      if (fl.fed >= need - 1e-6) heartFull(need);
    }
    let rest = e - heart;
    if (rest > 0 && need > 0 && fl.fed >= need - 1e-6) {
      tithe = rest * titheNow(); rest -= tithe;
      if (tithe > 0) { fl.stats.essTithe = (fl.stats.essTithe || 0) + tithe; satietyAdd(tithe * (mods.satietyK || 1), 'tithe'); if (fl.time - (fl.titheFloatT || -9) > 2.5) { fl.titheFloatT = fl.time; floatTile(fl.heart.x, fl.heart.y, 'Danina +' + fmtE(tithe), '#ffd27a', 13, -1.3); } }
      if (mods.storeK > 1) { const x = rest * (mods.storeK - 1); rest += x; fl.stats.essGlut = (fl.stats.essGlut || 0) + x; }
    }
    fl.stats.essHeart = (fl.stats.essHeart || 0) + heart;
    gainEssence('eq', rest, 'essWave', heart + tithe);   // 1.02: the Esencja leaves the equation's result box
  }
  // 1.26 Uczta (4.8): a hero killed by a monster feeds the heart 0,8 x his level, no multipliers; it is paid like any payout
  // (the hunger first, then the Danina and the purse) and counts in the wave's score
  function feastIn(h) {
    const e = 0.8 * h.lvl * (mods.feastK || 1) * (omenK(run.wave, 'feast') || 1);
    if (!(e > 0) || !fl || fl.phase !== 'raid') return 0;
    fl.score += e; fl.stats.feastPts = (fl.stats.feastPts || 0) + e;
    essIn(e, null);
    const p = heroPos(h); addFloat(p.x, p.y - 0.3, 'Uczta +' + fmtE(e), '#ff9aa4', 14, -0.9);
    return e;
  }
  function setGreed(v) { fl.greed = v; }
  // 1.10 (author: the more greed, the slower it grows): every rise is divided by the greed there is: at x2 a treasure pulls
  // half as hard as at x1, at x3 a third. Exactly: greed = sqrt(2 x raw - 1), where raw is the plain sum of what made it (the
  // way greed was counted up to 1.09.1): raw 2 = x1,73, raw 3 = x2,24, raw 5,4 = x3,12. The greed a wave starts with goes
  // through the same curve; the guild and the heroes' own judgement still go by the raw amount (they are as greedy as before).
  const greedCurve = raw => raw <= 1 ? raw : Math.sqrt(2 * raw - 1);
  const greedRaw = g => g <= 1 ? g : (g * g + 1) / 2;
  function addGreed(dg) { const g0 = fl.greed; if (dg > 0) setGreed(greedCurve(greedRaw(g0) + dg)); return fl.greed - g0; }
  const infMult = () => 1;   // v14: no hidden multipliers on Groza; everything global became greed (greedBonusNow)
  // counter-buildings: which rooms hold which (computed when a wave starts)
  function computeBRooms() {
    const o = {}; Object.keys(BUILDINGS).forEach(t => { o[t] = new Set(); });
    fl.items.forEach(it => { if (BUILDINGS[it.type] && !it.broken) o[it.type].add(roomOf(it.x, it.y)); });   // 1.05: a smashed one does nothing
    return o;
  }
  const inB = (t, r) => !!(fl && fl.bRooms && r >= 0 && fl.bRooms[t] && fl.bRooms[t].has(r));
  // The combo clock only ran while something was happening (up to 1.11.1: a walk down an empty corridor between two trap rooms
  // did not break the combo, so traps spread over a big dungeon still chained). 1.12 (author: a combo should not last too long
  // and should ask for traps grouped together): it runs all the time and the window is 2,5 s (Grota x1,5).
  const comboNow = () => (fl && fl.cclock - fl.lastTrapC < (fl.comboWinNow || S.comboWin)) ? fl.combo : 1;
  const alive = () => fl.heroes.filter(h => !h.dead && !h.fled && !h.gone);
  const webbed = h => fl.time < h.slowUntil;
  const caged = h => h.state === 'caged';
  const held = h => rooted(h) || h.state === 'fight' || h.state === 'wait' || h.state === 'talk' || h.state === 'rest' || h.state === 'disarm' || h.state === 'boss' || h.state === 'free' || h.state === 'loot' || caged(h) || webbed(h);   // 1.20: loot = kneeling by a body
  function trapMult(h, type, src) {
    const pierce = type === 'arrows' && src && t3(src);   // level 3 arrows go through shields
    const sh = k => inB('acid', h.room) ? (1 + k) / 2 : k;   // acid: shields protect half as well
    const holdK = rooted(h) ? ((type === 'spikes' || type === 'pendulum') ? 1 : 1.15) : 1, slowK = webbed(h) ? (fl.time < (h.acidWebUntil || -1) ? 1.6 : 1.3) : 1;   // 1.26: Unieruchomiony x1,15, not stacking with Spowolniony (the higher counts)
    return ((type === 'spikes' || type === 'pendulum') && held(h) ? 1.5 : 1) * (caged(h) ? (h.cageIt && t3(h.cageIt) ? 2 : 1.5) : 1) * Math.max(holdK, slowK)
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
  const heroName = h => h.nm[0] + (h.nemesis ? ' ' + h.nemesis.title : '');   // 1.23: a Nemezis' title after his name
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
  // 1.12.1: one hero a tile, so a hero stands in the middle of his tile (the old small shift by id now only when two stand on one
  // tile for a moment); two passing each other lean aside, each to his right, most in the middle of the step
  function heroPos(h) {
    const moving = h.nx !== null;
    const fx = moving ? h.x + (h.nx - h.x) * h.prog : h.x, fy = moving ? h.y + (h.ny - h.y) * h.prog : h.y;
    let ox = 0, oy = 0;
    if (moving && h.passing != null) { const s = 0.24 * Math.sin(Math.PI * Math.min(1, h.prog)); ox = -(h.ny - h.y) * s; oy = (h.nx - h.x) * s; }
    else if (!moving && fl && fl.heroes.some(o => o !== h && !o.dead && !o.fled && !o.gone && o.nx === null && o.x === h.x && o.y === h.y)) { const off = (h.id % 3 - 1) * 0.14; ox = off; oy = off * 0.5; }
    return { x: fx + 0.5 + ox, y: fy + 0.5 + oy };
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
  // 1.10 (author: they all talked at once instead of talking to each other): one at a time within earshot (the same room or
  // corridor, or two steps apart). A calm line waits until the line before it has been read, plus a breath, and is dropped
  // if its moment passes (h.sayQ); a bubble stays up as long as it takes to read. Only chaos talks over the others: cries
  // (prio 4), shouts at a trap that just went off ('loud'), and anyone wounded a moment ago, panicking, running, fighting,
  // caged or burning. Heroes in different rooms talk at the same time. The speaker turns to whoever he talks to.
  const SAY_GAP = 0.3;
  // 1.11 (author: they still talked at once when nothing was going on): earshot was the same room or 2,5 steps, and a
  // corridor is no room (roomOf -1), so a party walking down a corridor never heard itself; and anyone hit in the last 1,5 s
  // counted as "chaos", so in a room with an archer nearly every line was a shout. Now earshot is 7 steps (or the same room)
  // and only the lines that ARE a shout go over the others: cries, pain, a hit, a scare, the shout at a trap; besides them
  // only a hero who panics or runs for his life talks over anyone.
  const earshot = (a, b) => { const ra = roomOf(a.tx, a.ty); return (ra >= 0 && ra === roomOf(b.tx, b.ty)) || Math.hypot(a.tx - b.tx, a.ty - b.ty) <= 7; };
  const inChaos = h => fl.time < h.panicUntil || h.fleeing || h.state === 'caged';
  const readT = t => clamp(1.1 + 0.042 * t.length, 1.6, 3.4);
  const SAYQ_LIFE = [0, 1.4, 2.6, 4];   // how long a calm line can wait for its turn, by priority
  function floorBusy(h) {
    for (const o of fl.heroes) if (!o.dead && !o.fled && !o.gone && (o.saidUntil || -9) + SAY_GAP > fl.time && earshot(h, o)) return true;
    return false;
  }
  // a new line also waits for the lines already waiting around him (a talk going on, an answer due): first come, first said
  function othersWaiting(h, prio) {
    for (const o of fl.heroes) if (o.sayQ && o.sayQ.length && !o.dead && !o.fled && !o.gone && o.sayQ.some(e => e.exp > fl.time && e.prio >= prio) && earshot(h, o)) return true;
    const P = fl.party, Q = P && (P.queueCur ? P.queueCur.filter(q => !q.done && q !== P.sayingQ).concat(P.queueSay) : P.queueSay);   // 1.17: also while the queue is being worked through
    if (Q && Q.length) for (const q of Q) { if (q.at > fl.time) continue; const o = fl.heroes.find(x => x.id === q.id); if (o && !o.dead && !o.fled && !o.gone && earshot(h, o)) return true; }
    return false;
  }
  function lookAt(h, x, y) { if (h.nx !== null) return; const s = (x - h.x) - (y - h.y); if (Math.abs(s) > 0.3) h.face = s > 0 ? 1 : -1; }
  // 1.13 (author: alone, they talked to the air): nobody in earshot (the ones down a trapdoor do not count)
  const aloneNow = h => !(fl.queue.length && Math.hypot(h.tx - fl.ent.x, h.ty - fl.ent.y) <= 5) &&   // the rest are still coming in at the door
    !fl.heroes.some(o => o !== h && !o.dead && !o.fled && !o.gone && earshot(h, o));
  let sayHook = null;
  function say(h, text, prio, dur, how) {
    if (!h || h.dead || h.fled || h.gone || !text || !fl) return false;
    prio = prio || 1;
    let pool = null;
    if (fl.phase === 'raid' && aloneNow(h)) {   // 1.13: alone he talks to himself (SOLO) or keeps a line meant for others to himself
      const k = lineKey(text), b = k ? k.split(':')[0] : null;
      if (k && (SOLO[k] || SOLO[b])) { pool = (SOLO[k] || SOLO[b]).filter(x => !/\{[navg]\}/.test(x)); if (!pool.length) return true; text = pick(pool); }   // 1.21: not one with a name to fill
      else if (b && SOLO_MUTE.has(b)) return true;
    }
    if (fl.phase === 'raid') { text = fitLine(h, text, pool); if (!text) return true; }   // 1.17.1: only what he has seen (p5_ai.js)
    const loud = how === 'loud' || prio >= 4 || inChaos(h), b = h.bubble;
    if (b && b.until > fl.time && b.prio > prio) return false;
    if (b && b.until > fl.time && b.prio === prio && fl.time - b.at < 0.7) return false;
    if (!loud && (floorBusy(h) || (how !== 'q' && othersWaiting(h, prio)))) {   // not his turn yet
      if (how !== 'q') {
        const q = h.sayQ || (h.sayQ = []);
        if (!q.some(e => e.text === text)) { q.push({ text, prio, dur, exp: fl.time + SAYQ_LIFE[Math.min(3, prio)] }); if (q.length > 2) q.splice(q.reduce((m, e, i) => e.prio < q[m].prio ? i : m, 0), 1); }
      }
      return false;
    }
    const hush = h.room >= 0 && isRt(h.room, 'hush');   // 1.10: Głusza: the mouth moves, nothing comes out
    const t = hush ? (loud ? '…!' : '…') : gtext(text, h.female), len = hush ? 1.4 : loud ? (dur || 1.9) : Math.max(dur || 1.9, readT(t));
    h.bubble = { text: t, prio, at: fl.time, until: fl.time + len, loud }; h.saidUntil = fl.time + len;
    if (sayHook) sayHook(h, text, SAY_NOW);   // tests
    if ((lineKey(text) || '').startsWith('saw:')) fl.stats.sawTalk = (fl.stats.sawTalk || 0) + 1;   // 1.17.1
    fl.stats.lines++;
    if (!hush) convoAfter(h, text);   // 1.13: a line can start a conversation
    if (!loud) {   // he turns to the nearest one listening, and they turn to him
      let to = null, bd = 1e9;
      fl.heroes.forEach(o => { if (o === h || o.dead || o.fled || o.gone || !earshot(h, o)) return; const d = Math.hypot(o.tx - h.tx, o.ty - h.ty); if (d < bd) { bd = d; to = o; } if (d <= 4) lookAt(o, h.x, h.y); });
      if (to) lookAt(h, to.x, to.y);
    }
    return true;
  }
  // the lines waiting for their turn: the most important first, the oldest among equals
  function sayTick() {
    let wait = null;
    fl.heroes.forEach(h => { if (!h.sayQ || !h.sayQ.length) return; h.sayQ = h.sayQ.filter(e => e.exp > fl.time); if (h.sayQ.length && !h.dead && !h.fled && !h.gone) (wait || (wait = [])).push(h); else h.sayQ = null; });
    if (!wait) return;
    wait.sort((a, b) => (b.sayQ[0].prio - a.sayQ[0].prio) || (a.sayQ[0].exp - b.sayQ[0].exp));
    wait.forEach(h => { const e = h.sayQ[0]; if (say(h, e.text, e.prio, e.dur, 'q')) h.sayQ.shift(); });
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
      greedFlat: 0, hungerK: 1, storeK: 1, heartbeat: 0, gilded: 0, goldDust: 0, reliquary: false, pack: 0, quickArm: false,
      // 1.18: the new cards (komnaty, room effects, the heroes' behaviour)
      drawers: 0, lure: 0, onemore: 0, thickwalls: false, risen: false, cell: false, vaultsnap: false, wisps: 0, body: 0, falsecall: false, frames: 0,
      restock: false, lullsleep: 0, ambush: false, cocoons: 0, cauldron: 0, batscatter: 0, skullwall: 0, strip: 0, mire: 0, farecho: 0, deepsleep: 0,
      gearlink: 0, blackice: 0, badnews: 0, coins: 0, tainted: 0, rhythm: 0,
      // 1.26: the heart (4.6, 13.2) and the rest of the new cards (13.2)
      heartCry: 0, heavyCrystal: 0, heartRoom: 0, warden: 0, upgDisc: 0, shopPlus: 0, heartMem: false, titheAdd: 0, titheChoice: 0, stoneHeart: false, satietyK: 1, bloodCredit: false,
      bloodflow: 0, feastK: 1, lastBreath: 0, heartPulse: 0,
      fearCrown: 1, bloodbath: 0, lonewolf: 1, palette: 1, minimalist: 1, cursedCrown: 1, crownLv: 0, skulls: 0, execDiary: 0, risingLegend: 0, pantry: 0,
      doubleEdge: 0, sharedMech: false, chainReact: 0, heartEcho: false, tarSulfur: 0, conduct: false, toxicCap: 0, toxicDet: 1, plagueAir: false, hellPack: false,
      bonesUp: 0, undyingArmy: false, abyssPact: 0, goldenDream: false, croesus: false, reactGz: 0,
      fuseLv: {} };   // 1.24: element type -> extra levels from a fused card (lvlPow)
  }
  // The deck decides the mods: start from scratch and lay every card on top (two copies = applied twice). Selling a card really removes it.
  // 1.24: a fused ★ card (run.fused) is laid on 2,5 times (2,75 or 3,125 by its group) and adds its property (fuseApply)
  function recomputeMods() {
    mods = buildMods();
    Object.keys(run.stacks || {}).forEach(id => { if (!run.deck.includes(id)) delete run.stacks[id]; });   // a growing card sold for good starts from zero
    if (fl) fl.threatDirty = true;
    updateTray();
  }
  // 1.24 Połączone karty (p1: FUSE_GROUP): the deck's mods (recomputeMods and a resumed run)
  function buildMods() {
    const m = freshMods(), fz = new Set(run.fused || []);
    run.deck.forEach(id => { const u = UPG[id]; if (!u || !u.apply) return; if (fz.has(id) && !u.unique) fuseApply(u, m); else u.apply(m); });
    // 1.26 Kopista (the card to its right) and Lustro duszy (the first card): a copy of a plain card, not a unique or a copying one
    run.deck.forEach((id, i) => { const t = id === 'copyist' ? run.deck[i + 1] : id === 'soulmirror' ? run.deck[0] : null, v = t && UPG[t]; if (v && copyOk(v)) v.apply(m); });
    return m;
  }
  const copyOk = v => !!v && v.kind === 'card' && !v.unique && v.id !== 'copyist' && v.id !== 'soulmirror';   // 1.26
  const copyTarget = id => { const i = run.deck.indexOf(id); const t = id === 'copyist' ? run.deck[i + 1] : id === 'soulmirror' ? run.deck[0] : null; return t && copyOk(UPG[t]) ? t : null; };
  const fuseElems = u => [u.id, typeof u.req === 'string' ? u.req : null].filter(t => t && ITEMS[t] && (TRAPS[t] || MONSTERS[t]));   // 1.24: the element(s) a card names
  const fuseGroup = u => fuseElems(u).length ? 'named' : FUSE_GROUP[u.id] || 'power';   // 1.24
  const fusePow = u => FUSE_POW * (FUSE_K[fuseGroup(u)] || 1);   // 1.24: 2,5, 2,75 (power) or 3,125 (hero)
  const fuseText = u => '★ Połączona: działa jak ' + fmt2(FUSE_POW).replace(/,?0+$/, '') + ' kopii, ' + FUSE_TEXT[fuseGroup(u)](fuseElems(u).map(t => ITEMS[t].name).join(' i ')) + '.';   // 1.24: the property line
  // a card laid on p times, p fractional: the whole copies, then the share f of one more copy, field by field: a field the copies
  // multiplied (the same ratio twice) grows by that ratio to the power f, one they added to by f of the step
  function applyFrac(u, m, p) {
    const n = Math.floor(p + 1e-9), f = p - n, snap = () => JSON.parse(JSON.stringify(m));
    if (f < 1e-6 || n < 2) { for (let i = 0; i < Math.max(1, Math.round(p)); i++) u.apply(m); return; }
    const s0 = snap(); u.apply(m); const s1 = snap(); u.apply(m); const s2 = snap();
    for (let i = 2; i < n; i++) u.apply(m);
    const step = (o, a, b, c) => { for (const k in o) {
      if (a[k] && typeof a[k] === 'object') { step(o[k], a[k], b[k], c[k]); continue; }
      if (typeof c[k] !== 'number' || typeof b[k] !== 'number' || c[k] === b[k]) continue;
      if (a[k] !== 0 && b[k] !== 0 && Math.abs(b[k] / a[k] - c[k] / b[k]) < 1e-9) o[k] *= Math.pow(c[k] / b[k], f); else o[k] += (c[k] - b[k]) * f;
    } };
    step(m, s0, s1, s2);
  }
  function fuseApply(u, m) {
    const g = fuseGroup(u), was = {}; FUSE_INT.forEach(k => { was[k] = m[k]; });
    applyFrac(u, m, fusePow(u));
    FUSE_INT.forEach(k => { if (m[k] !== was[k]) m[k] = Math.floor(m[k] + 1e-6); });
    if (g === 'named') fuseElems(u).forEach(t => { m.fuseLv[t] = (m.fuseLv[t] || 0) + 1; });
    else if (g === 'fear') m.fearMult *= 1.15;
    else if (g === 'ess') m.income += 2;
    else if (g === 'greed') m.greedFlat += 0.1;
    else if (g === 'shop') m.freeReroll += 1;
  }
  const isFused = id => !!run && (run.fused || []).includes(id);   // 1.24
  const ownsCard = id => !!run && (run.deck.includes(id) || (run.stash || []).includes(id));   // 1.24: in the deck or the stash (a copy taken now fuses with it)
  function fuseCard(id) {   // 1.24: the second copy: the one in the deck or the stash becomes ★ (no new slot)
    const u = UPG[id]; if (!u || u.unique || isFused(id) || !ownsCard(id)) return false;
    (run.fused = run.fused || []).push(id); recomputeMods();
    return true;
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
    if (fl) fl.items.forEach(it => { if (ACTIVE[it.type] && !it.temp && !(MONSTERS[it.type] && it.hp <= 0)) { types.add(it.type); n++; } });   // 1.18: not a risen ghost (temp)
    const parts = [['rozległość lochu', SIZE_BONUS * Math.max(0, (fl ? roomCount() : 0) - 5)], ['Szklane serce', mods.glass], ['Kolekcjoner', mods.collector * types.size],
      ['Skąpiec', mods.miser * Math.max(0, 15 - n)], ['Zła sława', mods.crystalPts * Math.max(0, run.crystals)], ['karty', mods.greedFlat],
      ['Pozłacane pułapki', mods.gilded * (fl ? [...fl.items.values()].filter(it => ACTIVE[it.type] && !it.temp && (it.lvl || 1) >= 2).length : 0)],
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
    return { dmgPts: 0, fearPts: 0, scarePts: 0, killPts: 0, lootPts: 0, crystalPts: 0, wavePts: 0, lostPts: 0, lonePts: 0, splitPts: 0, healPts: 0, edgePts: 0,
      kills: 0, killsMon: 0, killsTrap: 0, killsHeart: 0, scared: 0, escaped: 0, left: 0, crystalTaken: 0, crystalLost: 0, crystalSaved: 0,
      loot: 0, lootSeen: 0, lootSkipped: 0, lootRisked: 0, rooms: 0, rumorRooms: 0, rumorTraps: 0, rumorFalse: 0, maxCombo: 1, disarmed: 0, disarmFails: 0,
      detected: 0, learned: 0, notLearned: 0, retreats: 0, panics: 0, flees: 0, partyFlees: 0, scouts: 0, wanders: 0, talks: 0, regroups: 0, fearDealt: 0,
      checks: 0, checkOk: 0, checkCrit: 0, checkMiss: 0, checkSkip: 0, skipLethal: 0, souls: 0, itemsGot: 0, itemsUsed: 0,
      dodges: 0, shields: 0, charms: 0, bombs: 0, potions: 0, heals: 0, cleanses: 0, barriers: 0, dispels: 0, blessed: 0, lines: 0, slept: 0,
      silenceTime: 0, pauseTime: 0, ffTime: 0, essBase: 0, essFear: 0, essSoul: 0, essDrop: 0, built: 0, monstersLost: 0,
      falls: 0, cages: 0, rescues: 0, abandons: 0, timing: 0, healed: 0, lostTime: 0, loneTime: 0, splitTime: 0, splits: 0, splitLost: 0, restScouts: 0, fearSrc: {}, preps: 0, wards: 0, jams: 0, prepDisarms: 0, breach: 0, sapped: 0, sensed: 0, greedKept: 0,
      // v12: gear and powers, getting lost, detours, curses, faith
      swaps: 0, potionsGiven: 0, amulets: 0, boots: 0, goldPicked: 0, cursed: 0, curseLifts: 0, faithOut: 0, detours: 0, gotLost: 0, searches: 0, deathFear: 0, roomsVisited: 0,
      checkByShape: {} };   // 1.24 (D, P0-6): filled by shapeStat (p6)
  }
  // 1.12: stage = which of the first runs this is (ONB_STAGES); the guide (tutorial) goes with the first one. Anything else is the full game.
  const stageOf = () => (run && run.stage) || ONB_FULL;
  const onbOk = (t, stg) => (ONB_ITEM[t] || 1) <= (stg || stageOf());
  // 1.14 (author: the traps you discover stay discovered between runs): what an unlock card opened goes into this browser's
  // collection; every later run starts with it (still only what the run's stage brings), so its card no longer comes up in
  // the shop
  const FOUND_KEY = 'yatd-found';
  function loadFound() { try { const a = JSON.parse(localStorage.getItem(FOUND_KEY) || '[]'); return Array.isArray(a) ? a.filter(t => ITEMS[t]) : []; } catch (e) { return []; } }
  function saveFound(t) { const a = loadFound(); if (!ITEMS[t] || a.includes(t)) return; a.push(t); try { localStorage.setItem(FOUND_KEY, JSON.stringify(a)); } catch (e) {} }
  function newRun(tutorial, stage) {
    stage = Math.max(1, Math.min(ONB_FULL, stage || (tutorial ? 1 : ONB_FULL)));
    coachHide();   // 1.12 (bug): the guide's card from a run left in the middle stayed on the screen in the next run
    run = { wave: 1, total: 0, waves: [], crystals: S.crystals, maxCrystals: S.crystals, grozaTotal: 0, greedRep: 1, returners: [], fallen: [], stash: [], freePicks: 0, shop: null, shopOwed: 1, stacks: {}, guild: null, resumed: 0, moleWave: 0, essence: S.essence,
      items: new Map(), layout: null, rumor: { tiles: new Map(), traps: new Map(), loot: new Map(), heart: -1, gold: 0 }, upgrades: [], unlocked: new Set(START_UNLOCKED.concat(loadFound()).filter(t => onbOk(t, stage))), foundAtStart: loadFound().filter(t => onbOk(t, stage) && !START_UNLOCKED.includes(t)), stage, onbW: stage < ONB_FULL, onbNews: [],   /* 1.24 (B): a run below the full game opens it wave by wave */
      pendingUpgrades: [], continueUsed: false, startedAt: Date.now(), result: null, reason: '', checkHints: 3, tut: tutorial ? 0 : -1, tutorial: !!tutorial,
      mode: 'check', fires: 0, buildSec: 0, raidSec: 0, best: loadBest(), next: null, lastIncome: 0, afterModals: null, over: false,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), thrIdx: 0, greedKeep: 0, greedNext: 0, waveDocs: [], won: false, logState: '', waveStart: null, deck: [], deckSize: S.deckSize || DECK_SIZE, freeDigs: 0, lastInterest: 0,
      crystals0: S.crystals, crystalEv: [], crystalEvW: 0, crystalsSeen: S.crystals, activeSec: 0, sessions: [], playerId: playerIdNow(),
      satiety: 0, heartLv: 0, heartLvMax: 0, heartPicks: [], famLv: {}, heartCards: [], regrowCount: 0, ofiaraW: 0, ofiaraN: 0, revive: null, credit: null, bloodHunger: null, omens: {} };   // 1.26 (4.5, 4.7, 15)   // 1.24 (D): the crystal log (P0-2), the time played (P0-3), who plays (P0-5)
    mods = freshMods();
    floats = []; particles = []; paused = false; ff = false;
    run.layout = genStartLayout();
    startBuild();
    seedStartTraps();
    if (run.tut >= 0) tutStart();
  }
  // 1.24 (B, item 3): the guided run's stage follows the wave it gets to (ONB_WAVE); what the new stage opens is unlocked at the end of
  // the wave before (so the next party, the summary and the shop already belong to it) and its card comes with the next build
  // (onbNews). Reaching the full game counts the first run as learnt: the next run is the full game.
  function onbAdvance(w) {
    if (!run || !run.onbW) return false;
    const s = onbWaveStage(w), from = run.stage || ONB_FULL;
    if (s <= from) return false;
    run.stage = s;
    START_UNLOCKED.concat(loadFound()).forEach(t => { if (onbOk(t, s)) run.unlocked.add(t); });
    run.foundAtStart = loadFound().filter(t => onbOk(t, s) && !START_UNLOCKED.includes(t));
    for (let k = from + 1; k <= s; k++) (run.onbNews || (run.onbNews = [])).push(k);
    if (s >= ONB_FULL) { run.onbW = false; setOnb(5); }
    updateTray();
    return true;
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
      const t = startTrapSpot(type, P, f0, f1);   // 1.26 (4.9): the two start traps are free (25 Esencji to spend instead of 30 - 6); taken down they give nothing back
      if (!t) return;
      fl.items.set(key(t[0], t[1]), { type, x: t[0], y: t[1], cd: 0, anim: 0, disabled: false, hp: 0, max: 0, power: mods.monster, shot: 0.5, flash: 0, preview: 0, gx: t[0] + 0.5, gy: t[1] + 0.5, lvl: 1, spent: 0, sys: true });
      bt(type).placed++; n++;
    });
    run.essence = fl.essence; updateTray(); updateAction();
    if (n && run.tut < 0) setHint(waveHint() + ' Loch postawił ' + (n === 1 ? 'pułapkę' : n + ' pułapki') + ' blisko serca (za darmo): dostaw więcej. Stuknij element, żeby go przenieść; przytrzymaj, żeby zdjąć.');
    saveRun('build');
  }
  function freshParty() {
    return { plan: 'explore', target: -1, leaderId: -1, talkUntil: -1, waitUntil: -1, retreatRoom: -1, retreatLock: -99, restSince: -1, morale: 1, scoutId: -1, scoutMate: -1, aheadWait: -1, aheadUntil: -1,
      junctions: new Set(), hesitated: new Set(), thinkT: 0, lastSay: {}, ambushT: -9, ambushN: 0, steal: 0, carrierId: -1, rescueId: -1,
      cageDecided: new Set(), abandoned: new Set(), lastTalkAt: -99, chatT: 6, heartSaid: false, queueSay: [], prepped: new Set(), prep: null, prepCd: 0, rushUntil: -1,
      searchId: -1, searchUntil: -1, detour: null, detourCd: 0, wantSearch: true, targetRoom: -1,
      council: null, councilMore: false, look: null, lookCd: 0, sound: null, soundCd: 0 };   // 1.17
  }
  // A fresh wave state around the dungeon as it stands (used by the build phase, and by a run resumed after a wave summary).
  function setupFl(phase) {
    const map = buildMap(run.layout);
    fl = Object.assign(map, {
      items: run.items, heroes: [], queue: [], spawnTimer: 0, time: 0, phase: phase || 'build', essence: run.essence,
      greed: 1, base: 0, combo: 1, lastTrapAt: -99, lastTrapType: null, cclock: 0, lastTrapC: -99, comboWinNow: S.comboWin + mods.rhythm, fearless: false, byType: {}, score: 0, fed: 0, fedAt: -1, chain: null, lastPay: null, ending: null, endReason: null, spawnAt: 'ent',
      fx: [], zones: [], danger: new Float32Array(WW * WH), ghosts: [], check: null, checkGap: 0, known: new Uint8Array(WW * WH), heartKnown: false,
      knowDirty: false, newKnowAt: -9, threatDirty: true, silence: false, surprise: false, crystalLost: false, buildStart: realNow, rerolled: false,
      party: freshParty(), stats: newStats(), disarmKeys: null
    });
    fl.items.forEach((it, k) => { if (it.temp) fl.items.delete(k); });   // 1.18 Wstający umarli: a risen ghost lasts its wave only (no refund)
    validateItems(true);
    fl.items.forEach(it => {   // between waves everything is repaired and re-armed; monsters lick their wounds
      if (it.memRes && !it.worn && (it.disabled || it.broken)) it.memRes = null;   // 1.09: put out of use by the heroes: it asks again
      it.worn = false; it.cd = 0; it.disabled = false; it.bent = false; it.anim = 0; it.sleep = false; it.detected = false; it.rumored = false; it.uses = 0; it.seenWave = 0; it.preview = 0; it.noGreed = false; it.cursedKnown = false;
      it.jamUntil = 0; it.skipUntil = 0; it.lastFire = null; it.broken = false; it.shown = false; it.ambushUntil = 0; it.quick = false; it.alarmed = false;   // 1.26 (14.5): the decoy alarms once a wave   // wave clocks restart at 0: stale timers from last wave would jam or mute a trap; smashed buildings stand again; 1.18: Zasadzka w norze hides again, Szybki montaż's first shot is spent
      if (MONSTERS[it.type]) { it.hp = it.max; it.gx = it.x + 0.5; it.gy = it.y + 0.5; it.foeT = 0; it.down = false; it.downR = null; it.healGot = 0; it.raised = 0; it.reN = 0; it.reAt = 0; it.rangerHit = false; it.rewound = false; }   // 1.26: per-wave counters   // 1.26 Odrodzenie: knocked down, it stands again
    });
    fl.bRooms = computeBRooms();
  }
  function startBuild(resume) {
    tutPopDrop();   // 1.12: a card of the wave never outlives it
    restockForge();   // 1.18: Beczki z kuźni
    setupFl('build');
    if (!run.shop || run.shop.wave !== run.wave) shopRefresh(true);   // v14: a fresh offer every wave
    if (!run.next || run.nextFor !== run.wave) { run.next = makeWave(run.wave); run.nextFor = run.wave; }   // 1.05: usually made at the end of the last wave
    if (run.builtFor !== run.wave) {
      run.builtFor = run.wave;
      if (run.onbNews && run.onbNews.length) { queueModal({ type: 'onb', stages: run.onbNews.slice() }); run.onbNews = []; }   // 1.24 (B): what this wave of the first run opens
      if (mods.mole && run.wave % 2 === 0 && run.moleWave !== run.wave) { run.freeDigs += mods.mole; run.moleWave = run.wave; }   // Kret: a free room every second wave
      // a breach stays until you patch it; from wave 6 the guild may dig a new one (one at a time)
      if (!run.layout.breach && run.wave >= 6 && run.tut < 0 && Math.random() < BREACH_P && planBreach()) { rebuildDungeon(true); run.breachNew = run.wave; }
      if (run.layout.breach && !fl.breach) delete run.layout.breach;   // its wall is gone (dug over, demolished): nothing left to come through
      if (run.omens && OMENS[run.omens[run.wave]] && !resume) queueModal({ type: 'news', omen: true });   // 1.26 (15): a wave with an omen shows the tavern's news (the omen box) once
    }
    fl.cardMult = cardMultNow();
    if (run.essAtStartW !== run.wave) { run.essAtStartW = run.wave; run.essAtStart = fl.essence; run.previewN = 0; run.pv = null; }   // 1.24 (D, P0-6): essenceAtStart, previewOpened (a resumed build keeps them)
    floats = []; particles = []; orbs = [];
    selected = null; movingKey = null; movingObj = null; holdInfo = null; paused = false; ff = false;
    clearUndo(); setTrayOpen(UI.trayBuild || run.tut >= 0);
    resize();
    cam.s = buildScale(); centerOn((fl.ent.x + fl.heart.x) / 2 + 0.5, (fl.ent.y + fl.heart.y) / 2 + 0.5); cam.manualUntil = 0;   // 1.07: between the door and the heart
    updateTray(); updateAction(); updateZoomBtn(); updatePauseBtn();
    setHint(waveHint());
    saveRun('build');
  }
  // 1.18 Beczki z kuźni: the powder that blew up in a Kuźnia (fireRaw keeps it in run.restock) is back for the next wave, with its
  // furniture, free and at its level, if its spot is still free (nothing changes the map between the wave and this)
  function restockForge() {
    const list = run.restock; run.restock = null;
    if (!list || !list.length) return;
    list.forEach(r => {
      const c = run.layout.cells.get(cellKey(Math.floor(r.x / CELL), Math.floor(r.y / CELL)));
      if (!c || run.items.has(key(r.x, r.y)) || (c.objs || []).some(o => o[0] === r.x && o[1] === r.y)) return;
      c.objs.push(r.obj.slice());
      run.items.set(key(r.x, r.y), { type: 'powder', x: r.x, y: r.y, cd: 0, anim: 0, disabled: false, hp: 0, max: 0, power: 1, shot: 0.5, flash: 0, preview: 0, gx: r.x + 0.5, gy: r.y + 0.5, lvl: r.lvl || 1, spent: r.spent, restocked: true });
      run.restocked = (run.restocked || 0) + 1;
    });
  }
  function waveHint() {
    const list = run.next, lv = list.map(e => e.lvl), lo = Math.min(...lv), hi = Math.max(...lv), boss = list.find(e => e.boss);
    const rt = rumorView();
    if (list.some(e => e.fog)) return waveName() + ': ' + list.length + ' bohaterów w MGLE WOJNY: nie wiadomo, kto przyjdzie ani jak silny. ' + (hungerNeed(run.wave) ? 'GŁÓD: serce weźmie pierwsze ' + hungerNeed(run.wave) + ' Esencji z tej fali. ' : '') + 'OMEN MGŁA WOJNY: ' + OMENS.warfog.text + ' Nagroda: ' + OMENS.warfog.reward + '.';   // 1.26
    return waveName() + ': ' + list.length + ' bohaterów, poziom ' + (lo === hi ? lo : lo + '-' + hi) + (boss ? ', prowadzi ' + BOSS_NAME[boss.boss][boss.female ? 1 : 0] + ' (poz. ' + boss.lvl + ')' : '') + '. ' +
      (hungerNeed(run.wave) ? 'GŁÓD: serce weźmie pierwsze ' + hungerNeed(run.wave) + ' Esencji z tej fali; fala da mniej, to zje kryształ. Trzymaj bohaterów w lochu. ' : '') +
      (fl.breach ? (run.layout.breach && run.layout.breach.fresh ? 'WYŁOM: gildia przebiła tunel do Twojego pokoju (czerwony znacznik) i tę falę wpuści tamtędy. ' : 'WYŁOM wciąż otwarty: bohaterowie wybiorą, czy wejść nim, czy drzwiami. ') + 'Stuknij wyłom, żeby go załatać (' + BREACH_PATCH + ' Esencji). ' : '') +
      (run.omens && OMENS[run.omens[run.wave]] ? 'OMEN ' + OMENS[run.omens[run.wave]].name.toUpperCase() + ': ' + OMENS[run.omens[run.wave]].text + (OMENS[run.omens[run.wave]].reward ? ' Nagroda: ' + OMENS[run.omens[run.wave]].reward + '.' : '') + (OMENS[run.omens[run.wave]].cost ? ' Za to ' + OMENS[run.omens[run.wave]].cost + '.' : '') + ' ' : '') +
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
  const BREACH_P = 0.35, BREACH_PATCH = 15;   // Prototype 1.01: 5 was pocket change; 1.26: 20 -> 15
  function planBreach() {
    const L = run.layout; delete L.breach;
    if (run.tut >= 0 || stageOf() < 4) return false;   // 1.12: the breach comes with the full game
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
    if (fl.essence < BREACH_PATCH) { note('Za mało Esencji (' + BREACH_PATCH + ')', fl.breach.x, fl.breach.y); return false; }
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
    const R = levelStats(lvl), T = HEROES[type], bm = boss === 'final' ? 3 : boss ? 1.3 : 1;   // 1.26 (5.2): the champion x1,3 (was x1,7)
    const max = Math.round(T.hp * R.hp * bm * S.heroHp / 100 * earlyHpK(n) * (omenK(n, 'hpK') || 1));   // 1.26: Krwawy księżyc   // 1.12: comboHp; 1.24: earlyHpK (the HP of the wave it plays like)
    let trait = null;
    if (!boss && type !== 'cultist' && Math.random() < 0.6) trait = pick(Object.keys(HERO_TRAITS));   // about half of them have a personality (1.26: 60%, 8 traits)
    if (pre.trait !== undefined) trait = pre.trait;
    const ck = (trait === 'coward' ? 0.8 : trait === 'brave' ? 1.2 : 1) * (type === 'paladin' ? 1.4 : type === 'ranger' ? 0.9 : 1) * (omenK(n, 'courage') || 1);   // 1.26: Noc strachu   // 1.26: the paladin's oath, the ranger's nerves
    // v14: a body (a weakness or a toughness) and a phobia; the tavern knows some of it (shown before the wave), the rest shows in the dungeon
    const deep = stageOf() >= 4;   // 1.12: bodies and phobias come with the full game
    const phys = pre.phys !== undefined ? pre.phys : (deep && Math.random() < 0.35 + 0.1 * (mods.oddBodies || 0) ? pick(Object.keys(PHYS)) : null);
    const phobia = pre.phobia !== undefined ? pre.phobia : (deep && !boss && Math.random() < 0.3 + 0.1 * (mods.oddBodies || 0) ? pick(Object.keys(PHOBIAS)) : null);
    const known = pre.known || [phys && (mods.revealAll || Math.random() < 0.3) ? 'phys' : null, phobia && (mods.revealAll || Math.random() < 0.3) ? 'phobia' : null].filter(Boolean);
    const inv = makeKit(type, lvl + (boss ? 2 : 0));
    // 1.20 (hook for 1.23): a returner brings back the best two things he carried out of your dungeon (src trophy): a better one
    // replaces his own power or gear of that kind, the rest comes on top of his kit (past invCap). One who got lost in here brings
    // a lantern from home.
    (pre.gear || []).slice(0, 2).forEach(g => {
      const tr = Object.assign({}, g, { src: 'trophy', kit: false }), U = HITEMS[g.type].use, cur = (U === 'power' || U === 'gear' || U === 'tool') && inv.find(x => x.type === g.type);
      if (cur) { if (g.r > cur.r) inv[inv.indexOf(cur)] = tr; } else inv.push(tr);
    });
    if (pre.wasLost && !inv.some(x => x.type === 'lantern')) inv.push({ type: 'lantern', r: 1, src: 'kit' });
    if (pre.nemesis && inv.length < 3 + Math.floor(lvl / 3)) {   // 1.23: a Nemezis comes better prepared: the talisman or the amulet he lacks, if he has room
      const t = inv.some(x => x.type === 'charm') ? 'amulet' : 'charm', r = 1 + Math.floor(lvl / 6);
      if (!inv.some(x => x.type === t)) inv.push({ type: t, r, kit: true, src: 'kit', charges: powerCharges(t, r) });
    }
    return { type, lvl, rank: pre.nemesis ? Math.max(1, tierOf(lvl)) : tierOf(lvl), boss: boss || null, female, nm, hp: max, max, hpK: atW(comboHp, earlyW(n)), inv, trait,   // 1.23: a Nemezis is never a rookie; 1.24: atW
      courage: Math.round(R.courage * (boss === 'final' ? 2 : boss ? 1.3 : 1) * ck * (pre.nemesis ? 1.4 : 1)), phys, phobia, known, returning: !!pre.returning, scar: pre.scar || null, times: pre.times || 0,   // 1.23: x1,4 for a Nemezis
      nemesis: pre.nemesis || null };
  }
  // The guild reads the last wave's report and sends the right people (from wave 3): priests and amulets against fear,
  // warriors and talismans against a slaughterhouse, thieves against a minefield, a mage against monsters.
  const GUILD_WANT = { fear: 'priest', kill: 'warrior', traps: 'thief', monsters: 'mage', lost: 'bard', block: 'barbarian', reactions: 'alchemist', holy: 'paladin', flyers: 'ranger' };   // 1.26
  function guildAdapt(n) {
    const w = run.waves[run.waves.length - 1];
    if (n < 3 || !w || stageOf() < 3) return null;   // 1.12: the guild's specialists come with run 3 (with the counter-buildings)
    const st = w.stats, fearShare = (st.fearPts + st.scarePts) / Math.max(1, st.fearPts + st.scarePts + st.dmgPts + st.killPts);
    const killShare = st.kills / Math.max(1, w.heroes.length);
    let traps = 0, mons = 0, blocks = 0, holyN = 0, flyN = 0; run.items.forEach(it => { if (it.temp) return; if (TRAPS[it.type]) traps++; else if (MONSTERS[it.type]) mons++; if (BUILDINGS[it.type]) blocks++; if (FAMILY_OF[it.type] === 'undead' || FAMILY_OF[it.type] === 'demons') holyN++; if (DRIFT[it.type]) flyN++; });
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
      { kind: 'block', sc: blocks >= 5 || (st.reroutes || 0) >= 2 ? 0.5 + 0.3 * Math.min(1, Math.max(blocks - 5, 2 * ((st.reroutes || 0) - 2)) / 6) : 0, text: 'słyszała o zastawionych przejściach: przysyła barbarzyńcę. Kontra: Okowy (zakładka Obiekty).' },
      // 1.26 (5.6): the new styles (their specialist only from the waves his class comes in)
      { kind: 'reactions', sc: n >= 6 && (st.reactPts || 0) >= 0.4 * Math.max(1, st.fearPts + st.scarePts + st.dmgPts + st.killPts) ? 0.85 : 0, text: 'słyszała o płonących i zatrutych: przysyła alchemika z antidotum. Kontra: Laboratorium, Zalewnia.' },
      { kind: 'holy', sc: n >= 4 && holyN >= 4 ? 0.6 + 0.2 * Math.min(1, (holyN - 4) / 6) : 0, text: 'słyszała o nieumarłych i demonach: przysyła paladyna. Kontra: Ołtarz (osłabia przysięgę), Kusicielka.' },
      { kind: 'flyers', sc: n >= 4 && flyN >= 3 ? 0.6 + 0.2 * Math.min(1, (flyN - 3) / 5) : 0, text: 'słyszała o latających potworach: przysyła tropiciela. Kontra: Zasłona, Mgła.' }
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
  // 1.10 (author: four heroes, a little stronger, instead of five and six): three in waves 1-3, four in waves 4-10, the
  // champion (wave 5) and the legend (wave 10) come as a fifth; past the finale more again, step by step (5 from wave 11, 6
  // from 15). Where there used to be more of them, the four get levels instead (SIZE_LV: about +1,5 levels for five -> four
  // is about +20% HP, courage and strength each).
  const partySize = n => tutW1(n) ? 2 : n <= 3 ? 3 : n <= 10 ? 4 : n <= 14 ? 5 : 6;
  const waveSize = n => Math.min(6, partySize(n) + (bossOf(n) && !tutW1(n) ? 1 : 0));
  const SIZE_LV = [0, 0, 0, 0, 0, 0, 0, 1.5, 1.5, 1.5, 1.0, 1.0, 1.0, 1.0, 1.0];
  const sizeLv = n => n < SIZE_LV.length ? SIZE_LV[n] : 0;
  const endlessLv = n => n >= 15 ? 1.5 * Math.floor((n - 10) / 5) : 0;   // what the 7th, 8th... hero used to add
  const waveBase0 = n => waveCurve(n) + grozaTyp(n) * S.scale + mods.pactLevels + endlessLv(n) + sizeLv(n) * S.scale;   // 1.24: the curve up to 1.23
  // 1.24 (author: the first 2 runs are too easy; the first run should be as hard as the third is now, the second half of the run
  // unchanged. Our reading: the first waves of a run): waves 1-4 play like a later wave of the old curve: wave 1 like the old
  // wave 3, wave 2 like 3,75, wave 3 like 4,3, wave 4 like 4,6; from wave 5 as before. Levels, the HP bonus (EARLY_HP, comboHp)
  // and the level cap follow (the old cap of 4 levels in waves 1-2 is gone); the party size (3 in waves 1-3), the four classic
  // classes in waves 1-3, patience, the hunger (from wave 2) and the heart that will not give the crystal up in wave 1 stay.
  // The tutorial's first wave (tutW1: run.tutorial and wave 1) stays as it was: 2 rookies.
  // 1.25.1 (playtests of 1.24-1.25, 5 runs against 23 of v58: crystals lost in wave 2 11% -> 40%, wave 3 7% -> 75%, wave 4
  // 21% -> 33%; a new player lost his first run, the guided one, in wave 3; the build lags: wave 2-3 meets wave 4-5 levels with
  // a wave 2-3 dungeon): halfway back. Wave 1 like the old wave 2, then 2,75 / 3,5 / 4,25, from wave 5 as before. The guided
  // first run (run.tutorial) plays the v58 curve again, the cap of 4 levels in waves 1-2 included (EARLY_W_TUT).
  const EARLY_W = [0, 1.5, 2.25, 3, 4], EARLY_W_TUT = [0, 1, 2, 3, 4];   // 1.26 (5.1): a smaller dungeon in waves 2-4 (less Esencja)
  const earlyW = n => { if (tutW1(n) || !(n < EARLY_W.length)) return n; return (run && run.tutorial ? EARLY_W_TUT : EARLY_W)[n]; };   // 1.24: the old wave a wave plays like
  const atW = (f, w) => { const a = Math.floor(w), k = w - a; return k > 1e-9 ? f(a) * (1 - k) + f(a + 1) * k : f(a); };   // 1.24: f between two waves
  const hpK0 = m => (1 + (EARLY_HP[m] || 0) * S.earlyHp) * comboHp(m);   // 1.24: the HP bonus up to 1.23
  const earlyHpK = n => Math.max(hpK0(n), atW(hpK0, earlyW(n)));   // 1.24: never below its own (wave 4: the old wave 5 has less bonus)
  const waveBase = n => atW(waveBase0, earlyW(n));   // 1.24
  const bossOf = n => n % 5 === 0 ? (n % 10 === 0 ? 'final' : 'champion') : null;
  const waveName = () => 'Fala ' + run.wave + (run.wave <= RUN_WAVES ? '/' + RUN_WAVES : '');
  // Each wave is new people: the first ones are rookies, then they keep getting better. Every 5th wave a boss leads them.
  function makeWave(n) {
    const om = OMENS[omenOf(n)] || {};   // 1.26 (15)
    const size = Math.max(1, waveSize(n) + (om.extra || 0));
    // v12.1: treasure hunters TAKE THE PLACE of ordinary heroes (greed brings stronger and greedier people, not more of them)
    const hunters = n >= 3 && stageOf() >= 4 ? Math.max(0, Math.min(size - 2, huntersN(greedRaw(run.greedRep || 1)) + (om.hunters || 0))) : 0;
    const recruit = n >= 4 && partySize(n) > partySize(n - 1) && !bossOf(n);   // the newest member is a rookie for one wave: the step in numbers is softer (not in boss waves)
    // 1.05: never two of a class (6 classes, at most 6 heroes); the first three waves bring only the four classic ones
    const classes = shuffle(partyPool(n).slice()).slice(0, size);   // 1.26: paladin and ranger from wave 4, alchemist from wave 6
    if (classes.length < size) { const more = shuffle(partyPool(Math.max(n, 6)).filter(t => !classes.includes(t))); while (classes.length < size) classes.push(more.length ? more.shift() : pick(PARTY)); }   // Oblężenie: more people than classes
    const g = run.guild = guildAdapt(n);
    if (g && !classes.includes(GUILD_WANT[g.kind])) classes[size > 1 ? 1 : 0] = GUILD_WANT[g.kind];   // the guild makes sure its specialist comes (one: no class twice)
    if (om.force) {   // Inkwizycja, Saperzy: these classes for sure (Saperzy before wave 6: two thieves)
      const want = om.force.map(t => t === 'ranger' && n < 6 ? 'thief' : t), keep = new Array(classes.length).fill(false);
      want.forEach(t => { let j = classes.findIndex((c, q) => c === t && !keep[q]); if (j < 0) { j = classes.length - 1; while (j > 0 && keep[j]) j--; classes[j] = t; } keep[j] = true; });
    }
    const base = waveBase(n), used = new Set();
    const hl = huntersLv() * (mods.croesus ? 1.5 : 1);   // 1.26 Krezus; greed: the leader is a seasoned treasure hunter (+hl), everybody else half that
    const list = classes.slice(0, size).map((t, i) => {
      const isHunter = i >= size - hunters, isRecruit = recruit && !isHunter && i === size - hunters - 1 && i >= 2;
      const bonus = i === 0 ? 1 + hl : isRecruit ? -3 : hl / 2;
      let L = Math.max(1, Math.round(base + bonus + Math.random() * 1.7 - 1.2) + (mods.crownLv || 0) + (om.lvAdd || 0));   // 1.26 Przeklęta korona, omen
      if (tutW1(n)) L = Math.min(L, 2);   // 1.24: only the tutorial's first wave keeps a cap (waves 1-2 had 4)
      else if (n <= 2 && run.tutorial) L = Math.min(L, 4);   // 1.25.1: the guided run keeps v58's cap of 4 in waves 1-2
      const e = makeHero(t, L, n, used);
      if (isHunter) { e.trait = 'greedy'; e.hunter = true; }   // 1.05: a treasure hunter is a mark on any class (the bag), not a thief
      if (om.greedAll && !e.boss) e.trait = 'greedy';   // Złoty szał
      if (om.gear) e.inv = (e.inv || []).concat([rollItem(2, GEAR_POOL)].filter(Boolean));   // Elita
      if (om.fog) e.fog = true;   // Mgła wojny: the preview hides who he is
      if (isRecruit) e.recruit = true;
      return e;
    });
    // v14: those who got away come back after 2-3 waves, with a name, what they remember and a scar (a phobia or a toughness)
    let back = 0;
    (run.returners || []).filter(r => r.back <= n && (!r.used || r.used === n)).sort((a, b) => !!b.nemesis - !!a.nemesis).forEach(r => {   // 1.23: a Nemezis takes the first place
      if (back >= (n >= 8 ? 2 : 1)) return;
      // 1.05: no class twice: he takes the place of his own class (the leader's too: he knows the way), or of someone ordinary
      // when his class is not in the party. In a boss wave the boss leads: a returner of the boss's class waits for the next wave.
      const same = list.findIndex(e => e.type === r.type);
      if ((same === 0 && bossOf(n)) || (same >= 0 && list[same].returning)) return;
      let idx = same; if (idx < 0) for (let i = list.length - 1; i >= 1; i--) if (!list[i].hunter && !list[i].recruit && !list[i].returning && list[i].type !== GUILD_WANT[g && g.kind]) { idx = i; break; }
      if (idx < 0) return;
      back++;
      const L = Math.max(list[idx].lvl, r.lvl + 1 + (r.crystal ? 1 : 0)) + (r.nemesis ? 2 : 0);   // 1.23: a Nemezis +2 levels
      list[idx] = makeHero(r.type, L, n, used, null, { nm: r.nm, female: r.female, phys: r.phys, phobia: r.phobia, trait: r.trait, known: [r.phys ? 'phys' : null, r.phobia ? 'phobia' : null].filter(Boolean), returning: true, scar: r.scar, times: r.times, gear: r.gear, wasLost: r.wasLost,   // 1.20: gear, wasLost
        nemesis: r.nemesis ? Object.assign({}, r.nemesis) : null });   // 1.23
      r.used = n;
    });
    const boss = bossOf(n);
    if (boss) list[0] = makeHero(list[0].type, Math.round(base + hl) + (boss === 'final' ? 5 : 0), n, used, boss);   // 1.26 (5.2): the champion +0 levels (was +2)
    // amulets / charms: only the specialists carry them at first, everybody from wave 6
    if (g && (g.kind === 'fear' || g.kind === 'kill')) list.forEach(e => {
      if (!(n >= 6 || e.type === { fear: 'priest', kill: 'warrior' }[g.kind]) || e.inv.length >= 3 + Math.floor(e.lvl / 3)) return;
      const t = g.kind === 'fear' ? 'amulet' : 'charm', r = 1 + Math.floor(e.lvl / 6), cur = e.inv.find(x => x.type === t);
      if (cur) { cur.r = Math.max(cur.r, r); cur.charges = (cur.charges || 0) + 1; } else e.inv.push({ type: t, r, charges: 1, src: 'guild' });   // one power of a kind is enough (one use from the guild)
    });
    // 1.20: the guild's tools, one of each a party, from wave 4 of the full game. A lantern for a party going where people got
    // lost (the guild's 'lost' answer), otherwise now and then when your dungeon has a Mgła (35%); a crowbar for a dungeon of
    // shut ways (its 'block' answer, the barbarian first), otherwise now and then when you have a gate (30%, a fighter first).
    if (n >= 4 && stageOf() >= 3) {
      const room = e => e.inv.length < 3 + Math.floor(e.lvl / 3), has = t => list.some(e => e.inv.some(x => x.type === t));
      const give = (e, t) => { if (e) e.inv.push({ type: t, r: 1, src: 'guild' }); };
      if (!has('lantern')) {
        if (g && g.kind === 'lost') give(list.find(room), 'lantern');
        else if ([...run.layout.cells.values()].some(c => c.rt === 'fog') && Math.random() < 0.35) { const c = list.filter(e => !e.boss && room(e)); if (c.length) give(pick(c), 'lantern'); }
      }
      if (!has('crowbar')) {
        if (g && g.kind === 'block') give(list.find(e => e.type === 'barbarian' && room(e)) || list.find(room), 'crowbar');
        else if ([...run.items.values()].some(it => it.type === 'gate') && Math.random() < 0.3) { const c = list.filter(room); give(c.find(e => e.type === 'warrior' || e.type === 'barbarian') || (c.length ? pick(c) : null), 'crowbar'); }
      }
    }
    // 1.26 (14.1.4, author: only with the omen): Pielgrzymka: 2 cultists take the place of the last two ordinary heroes (not the boss, not a hunter)
    if (omenK(n, 'cultists')) { let k = 0; for (let i = list.length - 1; i >= 1 && k < omenK(n, 'cultists'); i--) { const e = list[i]; if (e.boss || e.hunter || e.returning) continue; list[i] = makeHero('cultist', e.lvl, n, used); k++; } }
    makeBonds(list, n);   // 1.21
    return list;
  }
  // 1.21 Więzi i dramaty: some of them come in pairs. A party gets 0-2 bonds (the first 55%, a second 30%; 1.24: 75% and 45%, rivals 45%, mentors 20%), one bond a hero at
  // most, none for a returner (1.23 may give him one) and none in the tutorial's first wave: siblings 15%, a mentor (rank 1+) and
  // his apprentice (a rookie) 25% when there is such a pair, rivals 25% (two of a kind: both greedy or brave, else any two),
  // friends the rest. e.bond = { type, with: the other's index in this list, role: 'mentor' / 'apprentice' / null }; the hero
  // gets h.bond = { type, id, role } (spawnHero: they come in in this order, so the index is his id).
  function makeBonds(list, n) {
    if (tutW1(n) || list.length < 2) return;
    const tough = e => e.trait === 'greedy' || e.trait === 'brave' || e.hunter;
    for (let k = 0; k < 2; k++) {
      if (Math.random() >= (k ? 0.45 : 0.75)) break;   // 1.24: more pairs (was 55% and 30%): grief, rivals' jabs and bets were seldom seen
      const f = list.map((e, i) => i).filter(i => !list[i].bond && !list[i].returning);
      if (f.length < 2) break;
      const ment = [], riv = [];
      const app = (m, a) => m.rank >= 1 && (a.rank === 0 || a.recruit || m.rank >= a.rank + 1);   // 1.24: an apprentice is a rookie, the recruit or one a rank lower (the harder first waves have no rookies)
      f.forEach(i => f.forEach(j => { if (i === j) return; if (app(list[i], list[j])) ment.push([i, j]); if (i < j && tough(list[i]) && tough(list[j])) riv.push([i, j]); }));
      const r = Math.random();
      let type = 'friend', pr = null;
      if (r < 0.15) type = 'sibling';
      else if (r < 0.35) { if (ment.length) { type = 'mentor'; pr = pick(ment); } }   // 1.24: a mentor 20% (was 25%)
      else if (r < 0.8) { type = 'rival'; if (riv.length) pr = pick(riv); }   // 1.24: rivals 45% (was 25%: a rival's jab came in 1 wave of 5)
      if (!pr) { const a = pick(f); pr = [a, pick(f.filter(i => i !== a))]; }
      list[pr[0]].bond = { type, with: pr[1], role: type === 'mentor' ? 'mentor' : null };
      list[pr[1]].bond = { type, with: pr[0], role: type === 'mentor' ? 'apprentice' : null };
    }
  }
  // what the other one is to him, by the other's gender: "Przyjaciel: Borys", "Rywalka: Wanda", "Mistrz: ..." (his mentor), "Uczeń: ..."
  const BOND_NOUN = { friend: ['Przyjaciel', 'Przyjaciółka'], sibling: ['Brat', 'Siostra'], rival: ['Rywal', 'Rywalka'], mentor: ['Mistrz', 'Mistrzyni'], apprentice: ['Uczeń', 'Uczennica'] };
  const bondLabel = (b, o) => BOND_NOUN[b.type === 'mentor' ? (b.role === 'mentor' ? 'apprentice' : 'mentor') : b.type][o.female ? 1 : 0] + ': ' + o.nm[0];
  // the other one of an entry's pair: the hero in the dungeon, or his entry in the party list (before the wave, or not in yet)
  function bondMate(e, live) {
    if (!e || !e.bond) return null;
    if (live && live.bond && fl && fl.heroes[live.bond.id]) return fl.heroes[live.bond.id];
    const L = (run && run.next) || [];
    return L.includes(e) ? L[e.bond.with] || null : null;
  }
  const TALE_PER = 0.04, TALE_LOOT = 4, TALE_CAP = 0.3;   // v15.1: +0,04 greed per treasure seen (up to 4) for every hero scared away, at most +0,3 a wave
  const greedStartNow = () => greedCurve(1 + mods.greedStart + (omenK(run.wave, 'greedStart') || 0) + 0.1 * (run.stacks.risinglegend || 0) * mods.risingLegend + run.rumor.gold + run.greedKeep + greedBonusNow());
  function startWave() {
    if (!fl || fl.phase !== 'build') return;
    run.buildSec += Math.max(0, realNow - fl.buildStart); fl.buildSec = Math.round(realNow - fl.buildStart);
    saveRun('build');   // a tab closed during the wave comes back to this build
    perfReset();
    fl.items.forEach(it => { it.skullOff = false; it.firstBy = null; it.knocked = null; });   // a let-go skull belongs to a wave (1.09: the answer itself stays with the trap); 1.20: so do who saw a pile first and whose gear a crit knocked out
    { const hp = hungerParts(run.wave); fl.needParts = hp; fl.needNow = hp ? hp.need : 0; fl.needFor = run.wave; fl.ofiara = 0; }   // 1.26: the need of this wave, frozen
    { const fams = new Set(); let n = 0; fl.items.forEach(it => { if (it.temp || !(TRAPS[it.type] || MONSTERS[it.type])) return; n++; if (FAMILY_OF[it.type]) fams.add(FAMILY_OF[it.type]); }); fl.famN = fams.size; fl.elemN = n; fl.bathK = 1; fl.armyN = 0; fl.heartEchoW = 0; }
    { const o = OMENS[run.omens && run.omens[run.wave]]; if (o) { floatTile(fl.ent.x, fl.ent.y, 'Omen: ' + o.name, '#d9b8ff', 16, -1.6); setHint('Omen: ' + o.name + '. ' + o.text); } }   // 1.26 (15)   // 1.26 Pełna paleta, Minimalista, Krwawa łaźnia
    fl.phase = 'raid'; fl.time = 0; fl.patT = 0; fl.spawnTimer = 0; fl.gateOpen = false; fl.threatDirty = true; fl.bRooms = computeBRooms(); fl.bSaid = new Set(); fl.quietT = 0; fl.autoFFTime = 0;
    fl.queue = run.next.slice();
    { const ty = new Set(); fl.items.forEach(it => { if (ACTIVE[it.type] && DMG_OF[it.type]) ty.add(DMG_OF[it.type]); }); fl.arsenal4 = ty.size >= 4; }   // Pełen arsenał (1.26: 4 of the 5 types)
    fl.items.forEach(m => { if (MONSTERS[m.type] && m.hp > 0 && mods.warden && roomOf(m.x, m.y) === fl.heart.room) m.hp = Math.round(m.hp * (1 + mods.warden)); });   // 1.26 Strażnik
    if (run.returners) run.returners = run.returners.filter(r => r.used !== run.wave);   // the returners of this wave are in
    fl.base = 0; setGreed(greedStartNow());   // tales of gold, and gold already carried off, make them greedier
    run.greedNext = 0;   // the tales of treasure from the last wave are used up
    fl.chain = null; fl.lastPay = null; fl.fed = 0; fl.fedAt = -1; fl.prov = 0; fl.heartOrb = 0;   // 1.01: a fresh combo chain and an empty heart for this wave
    applyRumors();
    chooseEntrance();
    fl.items.forEach(m => { if (MONSTERS[m.type] && m.hp > 0 && isRt(roomOf(m.x, m.y), 'crypt')) m.hp = Math.round(m.max * 1.25); });   // Krypta: +25% HP for this wave
    selected = null; movingKey = null; movingObj = null; holdInfo = null; cam.manualUntil = 0; ff = false; clearUndo(); setTrayOpen(false); updateTray(); updateAction();   // 1.05: in the tutorial too; 1.07: always (an open tray is the pause); 1.09 (author): back after 1.08 (his complaint was the button's width)
    { const bossE = fl.queue.find(e => e.boss), n = fl.queue.length;   // Prototype 1.0: a banner over the map says who is coming
      showBanner('Fala ' + run.wave, (bossE ? 'prowadzi ich ' + (bossE.boss === 'final' ? 'bohater z przepowiedni' : 'czempion') : n === 1 ? '1 bohater' : n + ' bohaterów') +
        (fl.spawnAt === 'breach' ? ' · wchodzą przez wyłom!' : fl.breach ? ' · wchodzą drzwiami' : ''));
      if (run.wave === 1 && run.tut < 0) setHint(PC() ? 'Kamera śledzi drużynę. Przytrzymaj F (albo przycisk myszy na mapie), żeby przyspieszyć. Skill check odpalasz kliknięciem w mapę albo spacją.' : 'Kamera śledzi drużynę. Przytrzymaj palec na mapie, żeby przyspieszyć. Skill check odpalasz stuknięciem w mapę.'); }
    fl.tl = { ev: [], smp: [], smpT: 0 };
    fl.essW0 = fl.essence; fl.itemsW0 = fl.items.size; fl.roomsW0 = run.layout.cells.size;   // 1.24 (D, P0-6): essenceAtWaveStart, itemsCount, roomsCount
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
    const T = HEROES[e.type], R = levelStats(e.lvl), sp = spawnPt(), id = fl.heroes.length;
    const h = { entry: e, id, type: e.type, T, R, rank: e.rank, lvl: e.lvl, boss: e.boss, female: e.female, nm: e.nm, hp: e.hp, max: e.max, hpK: e.hpK || 1,
      x: sp.x, y: sp.y, nx: null, ny: null, prog: 0, tx: sp.x, ty: sp.y, path: [], needPlan: true, thinkT: 0, intent: 'follow',
      room: roomOf(sp.ix, sp.iy), state: 'walk', timer: 0, dur: 1, slowUntil: -1, burnUntil: -1, burnBy: null, foe: null, item: null,
      dead: false, fled: false, gone: false, flash: 0, acc: 0, accT: 0, cast: e.type === 'priest' ? 1.5 : e.type === 'mage' ? 2 : 0,
      barrierCd: 0, dispelCd: 0, scan: 0.5, hurtAt: -9, edgeAt: -9, playerDmg: 0, loot: 0, orbAcc: 0, inv: e.inv.map(it => Object.assign({}, it, { cdUntil: 0, owner: it.owner != null ? it.owner : id, ownerNm: it.ownerNm || e.nm, ownerFem: it.ownerNm ? it.ownerFem : e.female, wave: it.wave || run.wave, src: it.src || 'kit' })), shareCd: 0,   // 1.20: owner, src
      shield: 0, shieldUpUntil: -1, shieldCd: 0, dodgeCd: 0, panicUntil: -1, lost: false, noPathT: 0, alone: false, aloneSaid: false, bubble: null,
      disarmT: null, scoutTarget: -1, scoutUntil: -1, split: false, fear: 0, courage: e.courage || R.courage, fleeing: false, crystal: false, fallUntil: -1, cageUntil: -1, cageIt: null,
      freeT: null, lostT: 0, lootMemo: new Map(), saidTiming: new Set(), felt: new Map(), wanderUntil: -1, wanderTarget: -1, rumorSaid: false, invCap: 3 + Math.floor(e.lvl / 3),
      trait: e.trait || null, rageUntil: -1, raged: false, shoutCd: 0, saidB: new Set(),
      // 1.05: the bard's songs (a few a wave) and calls, the barbarian's fury and axe, a lost one following a voice
      songs: e.type === 'bard' ? 2 + Math.floor(e.lvl / 4) : 0, songCd: 6, callCd: 0, rageCd: 0, smashCd: 0, smashIt: null, hearUntil: -1, hearId: -1,
      // v12: purse, curse, the priest's faith, powers in use, getting separated, shaken by a death
      gold: 0, cursed: false, faith: e.type === 'priest' ? 6 + Math.floor(e.lvl / 2) : 0, faithMax: e.type === 'priest' ? 6 + Math.floor(e.lvl / 2) : 0, faithT: 0,
      wardUntil: -1, wardK: 0, sprintUntil: -1, sprintK: 1, calmUntil: -1, giveCd: 0, sepT: 0, sepRolled: false, shakenUntil: -1, rtSaid: new Set(), lostCallT: 0, hunter: !!e.hunter,
      phys: e.phys || null, phobia: e.phobia || null, known: new Set(e.known || []), returning: !!e.returning, scar: e.scar || null, trauma: {}, fearBy: {}, dmgBy: {}, phobiaSeen: new Set(), saw: new Set(),
      bond: e.bond ? { type: e.bond.type, id: id + e.bond.with - Math.max(0, (run.next || []).indexOf(e)), role: e.bond.role || null } : null,   // 1.21
      nemesis: e.nemesis || null, rooms: new Set(), grudgeBy: new Map() };   // 1.23: the rooms he walked into, what hurt or scared him and where (for a Nemezis)
    h.inR = realNow;   // 1.09: pops in
    fl.heroes.push(h);
    if (h.bond && bondOf(h)) { const st = fl.stats, by = st.bondsBy || (st.bondsBy = {}); st.bonds = (st.bonds || 0) + 1; by[h.bond.type] = (by[h.bond.type] || 0) + 1; tl('bo', h.bond.id, h.id, h.bond.type); }   // 1.21: the pair is in
    if (h.returning) tutPop('returner');   // 1.12: the first returner in the first runs
    if (h.nemesis) nemesisSpawn(h, !(fl.heroes.length === 1 && fl.breach));   // 1.23: what he remembers; nemesisIntro instead of returnBack
    tl('sp', h.id);
    reveal(h);
    if (fl.heroes.length === 1 && fl.breach) say(h, pick(fl.spawnAt === 'breach' ? SAY.breachUse : SAY.doorUse), 3, 2.2);
    else if (h.returning) {   // 1.20: one who brings back something of yours may say so
      const tr = h.inv.some(x => x.src === 'trophy');
      if (tr) { fl.stats.returnGear = (fl.stats.returnGear || 0) + 1; tl('rq', h.id); }
      if (!h.nemesis) say(h, pick(tr && Math.random() < 0.5 ? SAY.returnGear : SAY.returnBack), 3, 2.4);   // 1.23: a Nemezis said his own line
    }
    if (h.inv.some(x => x.type === 'lantern')) fl.stats.lanterns = (fl.stats.lanterns || 0) + 1;   // 1.20: parties with a lantern
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
  // Patience runs out. Prototype 1.01 (author's decision): the party went home, heart known or not (the old "szarża" was gone).
  // 1.17 (author: after 2 minutes not a rigid retreat or charge: let them decide, maybe together, by talking it over): they
  // hold a council (p5_ai.js: councilThink) and vote: home, storm the heart (only when they know where it is) or "a little
  // longer" (+30 s, once a wave). With one choice left (heart unknown and the extra time used up) they just go home. Only the
  // hero of the prophecy never goes home: the prophecy shows the way and the party storms the heart, as before.
  function becomeImpatient() {
    const P = fl.party, L = leader();
    if (P.plan === 'escape' || P.plan === 'flee' || P.plan === 'leave') { fl.fearless = true; return; }
    if (P.council) return;
    const prophet = alive().find(h => h.boss === 'final' && !h.fleeing);
    if (!prophet) {
      if (L && (heartP() || !P.councilMore)) {
        P.council = { stage: 'wait', t0: fl.time }; fl.stats.councils = (fl.stats.councils || 0) + 1;
        setHint('Bohaterom kończy się cierpliwość: naradzają się, co dalej.');
        return;
      }
      goHome(L);
      return;
    }
    fl.fearless = true; fl.storm = true; P.heartSaid = true;
    if (prophet && !fl.heartKnown) {
      fl.heartKnown = true; fl.heartBy = null; P.heartSaid = true; fl.stats.prophecy = 1;   // 1.17: the prophet knows and says so
      shortestPath().forEach(t => { fl.known[t[1] * WW + t[0]] = 1; });
      const HR = fl.rooms[fl.heart.room]; if (HR) HR.tiles.forEach(t => { fl.known[t[1] * WW + t[0]] = 1; });
      say(prophet, pick(SAY.prophecy), 4, 2.6);
    }
    tl('ip', fl.heartKnown ? 1 : 0);
    if (fl.heartKnown) { P.plan = 'assault'; alive().forEach(h => { if (h.state === 'rest' || h.state === 'talk') h.state = 'walk'; h.needPlan = true; }); if (L) say(L, pick(SAY.impatient), 3); }
    else { P.plan = 'leave'; alive().forEach(h => { h.needPlan = true; if (h.state === 'rest' || h.state === 'talk') h.state = 'walk'; }); if (L) say(L, pick(SAY.leave), 3); }
    setHint(fl.heartKnown ? 'Bohaterom skończyła się cierpliwość: szturmują serce i mniej uważają na pułapki.' : 'Bohaterom skończyła się cierpliwość: nie znaleźli serca i wracają do domu.');
  }
  // the old end of patience: everyone goes home
  function goHome(L) {
    const P = fl.party;
    fl.fearless = true; fl.storm = false; tl('ip', 0); P.plan = 'leave'; P.council = null;
    alive().forEach(h => { h.needPlan = true; if (h.state === 'rest' || h.state === 'talk') h.state = 'walk'; });
    if (L) say(L, pick(SAY.leave), 3);
    setHint('Bohaterom skończyła się cierpliwość: odwrót, wracają do domu.');
  }
  // 1.24 (author: at the end of a raid the heroes sometimes vanished and the wave ended at random): up to 1.23 everyone still
  // inside 60 s after the end of patience was teleported out (councils, storms, second groups, sulkers and last stands made that
  // common). Now at that moment they are worn out: every one still inside gets the plan to go home and walks out (the second
  // group ends, bets, last stands and sacrifices are called off, nobody sulks or wanders off, a lost one finds his way, the party
  // fears nothing on the way out, the ones still waiting at the door do not come in), with a float over each.
  function waveExhausted() {
    const P = fl.party, L = leader(), crew = alive();
    fl.exhausted = true; fl.stats.exhausted = (fl.stats.exhausted || 0) + 1; tl('xh', crew.length);   // 1.24
    if (P.g2) g2End('out');
    P.council = null; P.councilMore = true; P.sulkAfter = null; P.mutinyHome = 0; P.scoutId = -1; P.scoutMate = -1; P.prep = null; P.detour = null;
    const F = P.fin; if (F && F.sac) F.sac.done = true;
    fl.fearless = true; fl.storm = false; fl.queue = [];   // the rest of the party stays outside
    if (P.plan !== 'escape' && P.plan !== 'flee') P.plan = 'leave';
    fl.heroes.forEach(h => {
      if (h.dead || h.fled) return;
      if (h.bet && !h.bet.done) betEnd(h, false);
      if (h.stand && !h.stand.done) h.stand.done = true;
      if (h.sac) h.sac.done = true;
      if (!h.crystal && h.plan !== 'escape') h.plan = null;
      h.split = false; h.wanderUntil = -1; h.vowUntil = 0; h.vowOn = null; h.lootKey = null; h.needPlan = true;
      if (h.lost) { h.lost = false; h.hearUntil = -1; h.noPathT = 0; h.sepT = 0; h.sepRolled = false; if (!h.gone) reveal(h); }
      if (h.state === 'rest' || h.state === 'talk' || h.state === 'wait' || h.state === 'boss') h.state = 'walk';
      if (!h.gone) floatHero(h, 'Wyczerpan' + (h.female ? 'a' : 'y'), '#c9c2d8', 12, -0.9);
    });
    if (L) say(L, pick(SAY.leave), 3);
    setHint('Bohaterowie są wyczerpani: wychodzą.');
  }
  // 1.24: the true safety net (a hero stuck somewhere): 150 s after the end of patience the ones still inside run out where they
  // stand, with a float and the fade; a crystal one of them carries goes back to the heart (stats.forcedOut, timeline 'fo')
  function waveForceOut() {
    const P = fl.party;
    fl.heroes.forEach(h => {
      if (h.dead || h.fled) return;
      if (h.crystal) { h.crystal = false; if (P.carrierId === h.id) P.carrierId = -1; fl.stats.crystalSaved++; floatTile(fl.heart.x, fl.heart.y, 'Kryształ wraca!', '#ff7a86', 15, -1); crystalEv(0, 'saved', 'forcedOut'); }   // 1.24 (D): logged
      h.gone = false; floatHero(h, 'Ucieka', '#c9c2d8', 13, -0.9);
      fl.stats.forcedOut = (fl.stats.forcedOut || 0) + 1; tl('fo', h.id, h.tx, h.ty, h.state);   // 1.24
      heroExit(h);
    });
  }
  // A hero walks out of the dungeon. With a crystal it is your loss; scared out of his wits it is your win. Either way, he talks.
  function heroExit(h) {
    if (h.fled || h.dead) return;
    if (!h.crystal && !h.fleeing && fl.time < h.panicUntil) { h.fleeing = true; fl.stats.panicExits = (fl.stats.panicExits || 0) + 1; }   // ran out in a panic: that is a hero scared away
    h.fled = true; h.bubble = null; fl.stats.escaped++; h.outR = realNow; h.outKind = 'out';   // 1.09: fades at the door
    if (h.nemesis) { fl.stats.nemesisOut = (fl.stats.nemesisOut || 0) + 1; if (h.crystal) fl.stats.nemesisCrystal = (fl.stats.nemesisCrystal || 0) + 1; tl('no', h.id, h.crystal ? 1 : 0); }   // 1.23: he got away (he comes back)
    const P = fl.party;
    if (h.crystal) {
      const c0 = run.crystals; h.crystal = false; h.carriedOut = true; fl.crystalLost = true; run.crystals = Math.max(0, run.crystals - 1); fl.stats.crystalLost++;
      crystalEv(run.crystals - c0, 'stolen', h.type + ' ' + h.lvl);   // 1.24 (D, P0-2)
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
    fl.items.forEach(m => { if (m.healAcc > 0) healFlush(m); });   // 1.24 (C, addendum 2): the shaman's last heals count
    payChain();   // Prototype 1.01: an unfinished combo chain is cashed in before the heart is counted
    run.greedNext = fl.stats.treasureTale || 0;   // v15.1: tales of treasure from the scared ones, for the next wave only
    fl.items.forEach(it => { const w = it.w || {}; it.lf = w.f || 0; it.lh = w.h || 0; it.lp = Math.round(w.p || 0); it.lk = w.k || 0; it.lhl = Math.round(w.hl || 0); it.w = null; });   // 1.24 (C, addendum 2): lhl = HP healed (shaman)   // what each element did this wave (shown on its card)
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
    fl.items.forEach(m => { if (m.type === 'rats' && !m.temp) { m.baseMax = m.baseMax || m.max; if (m.down) m.grow = 0; else m.grow = Math.min(3, (m.grow || 0) + 1); m.max = Math.round(m.baseMax * (1 + 0.8 * m.grow)); } });   // 1.26 Rój szczurów: grows a wave it was not knocked down
    { let dn = 0; fl.items.forEach(m => { if (MONSTERS[m.type] && m.down && !m.temp && !(m.type === 'lich' && t3b(m, 'A'))) dn++; }); run.revive = dn ? { w: run.wave + 1, n: dn } : null; fl.stats.revived = dn; }   // 1.26 Odrodzenie: +1 hunger next wave a monster knocked down
    feedHeart();
    if (mods.pantry && fl.hunger && (fl.stats.sat_tithe || 0) >= 0.5 * fl.hunger.need) { run.stacks.pantry = Math.min(5 * mods.pantry, (run.stacks.pantry || 0) + 1); fl.stats.pantryUp = 1; }   // 1.26 Spiżarnia: +2 income for good (at most +10)
    run.lastBreathW = mods.lastBreath && fl.hunger && fl.essence <= 0.5 ? run.wave + 1 : 0;   // 1.26 Ostatni oddech
    if (mods.risingLegend) run.stacks.risinglegend = fl.crystalLost || (fl.hunger && fl.hunger.ate) ? 0 : (run.stacks.risinglegend || 0) + 1;   // 1.26 Rosnąca legenda
    if (run.wave === RUN_WAVES && run.crystals > 0 && !run.won) { run.won = true; fl.victory = true; }   // the prophecy hero is beaten (and the heart fed): the run is won
    run.grozaTotal = (run.grozaTotal || 0) + fl.base; run.greedRep = fl.greed;   // what the guild hears: how deadly, how rich
    checkThresholds(run.total + fl.score);
    run.pendingUpgrades.push({ r: bossOf(run.wave) ? 3 : 1, src: bossOf(run.wave) ? 'boss' : 'wave', wave: run.wave });   // every wave held back earns a buff
    run.lastInterest = Math.min(Math.floor(fl.essence * mods.usurer), 10 * Math.round(mods.usurer / 0.15));   // Lichwiarz: interest on what you did not spend (at most 10 a copy; 1.26: 12 -> 10, after the heart took its share)
    const income = S.waveIncome + mods.income + run.lastInterest + 2 * (run.stacks.bank || 0) * mods.bank + 2 * (run.stacks.pantry || 0);   // 1.26: Spiżarnia   // a small flat income, the rest comes from Groza
    run.lastIncome = income;
    { const o = OMENS[run.omens && run.omens[run.wave]]; if (o && o.free) { run.freePicks = (run.freePicks || 0) + o.free; fl.stats.omenFree = o.free; } if (o && o.satiety) { satietyAdd(o.satiety, 'omen'); fl.stats.omenSat = o.satiety; } }   // 1.26 (15): the omen's reward
    run.essence = fl.essence + income;   // Prototype 1.01: no purse limit
    fl.essence = run.essence;
    collectReturners();
    recordWave(rr, rt);
    run.total += run.waves[run.waves.length - 1].score;   // 1.24 (D, P0-4): the wave's recorded (rounded) score, so total = the sum of the waves (was fl.score: 5724 against 5722)
    if (run.total > run.best) { run.best = run.total; saveBest(run.best); }
    // 1.05: the next party is known right away: the wave summary shows who comes (classes, skills, gear, what the tavern knows)
    onbAdvance(run.wave + 1);   // 1.24 (B): the guided run opens the next stage before the next party is made
    if (run.crystals > 0) { run.next = makeWave(run.wave + 1); run.nextFor = run.wave + 1; }
    logWave(false);
    if (run.crystals > 0) saveRun('summary');
    fl.phase = 'summary'; updateAction();
    queueModal({ type: 'wave', rr, rt, out });   // 1.05: one screen (the reckoning is part of it)
  }
  // Głód serca: the wave's score feeds the heart. Short: the reserve pays first, then a crystal. Surplus: the reserve
  // (at most 2 needs); a full reserve grows a lost crystal back.
  function collectReturners() {
    if (stageOf() < 4) return;   // 1.12: the returners come with the full game
    run.returners = run.returners || [];
    fl.heroes.forEach(h => {
      if (!h.fled || h.dead || h.boss || h.type === 'cultist' || (run.returners.length >= 8 && !h.nemesis)) return;   // 1.26: a cultist comes only with Pielgrzymka   // 1.23: a Nemezis who got away always comes back (also past the 8)
      if (!h.nemesis && Math.random() >= (h.fleeing ? 0.55 : 0.4) * (1 + (mods.moreReturn || 0))) return;
      let phys = h.phys, phobia = h.phobia, scar = null;
      const topFear = Object.entries(h.fearBy || {}).sort((a, b) => b[1] - a[1])[0], topDmg = Object.entries(h.dmgBy || {}).sort((a, b) => b[1] - a[1])[0];
      if (h.fleeing && topFear && !phobia) {   // what scared him away becomes a phobia
        const k = PHOBIA_OF_ATTR[topFear[0]] || (topFear[0] === 'death' ? 'blood' : DMG_OF[topFear[0]] === 'fire' ? 'fire' : null);
        if (k) { phobia = k; scar = 'fobia: ' + PHOBIAS[k].name + ', ' + (h.female ? 'wyniosła' : 'wyniósł') + ' ją z Twojego lochu'; }
      }
      if (!scar && topDmg && topDmg[1] > 0.3 * h.max) { phys = SCAR_RES[topDmg[0]]; scar = PHYS[phys].name[h.female ? 1 : 0] + ' po ranach z Twojego lochu'; }   // the wound that nearly killed him hardened him
      const e = { nm: h.nm, female: h.female, type: h.type, lvl: h.lvl, back: run.wave + 2 + (Math.random() < 0.5 ? 1 : 0), phys, phobia, trait: h.trait,
        scar: scar || (h.nemesis && h.entry && h.entry.scar) || 'pamięta Twój loch', times: ((h.entry && h.entry.times) || 0) + 1, crystal: !!h.carriedOut,   // 1.23: a Nemezis keeps his old scar
        // 1.20 (hook for 1.23): the best two things he took from your dungeon come back with him, and one who got lost brings a lantern
        gear: h.inv.filter(x => ['loot', 'relic', 'body', 'trophy'].includes(x.src)).sort((a, b) => b.r - a.r).slice(0, 2).map(x => ({ type: x.type, r: x.r, src: x.src, wave: x.wave || run.wave,
          ownerNm: x.ownerNm, ownerFem: x.ownerFem, wasRelic: x.src === 'relic' || !!x.wasRelic, charges: powerCharges(x.type, x.r) })), wasLost: !!h.lostEver, goldOut: h.gold || 0 };
      nemesisEntry(h, e);   // 1.23: back 2+ times or out with a crystal: a Nemezis (title, grudge, the rooms and traps he knows)
      run.returners.push(e);
      fl.stats.returnersOut = (fl.stats.returnersOut || 0) + 1;
    });
  }
  // Prototype 1.01: the heart has been eating its share of this wave's Esencja all along (essIn). When the wave ends it is
  // either fed, or it eats what it got and a crystal. Crystals do not grow back by themselves (1.05: and cannot be bought; a card may give one).
  // 1.26 "Serce zabiera" (4.4): a wave that did not feed the heart: it takes what is missing from your purse (what is left from
  // earlier waves). Only when the purse cannot cover it does a crystal crack, and the heart eats the rest of the purse. Kamienne serce:
  // 75% of what is missing is enough; Kredyt krwi (once a run): the rest x2 goes onto the next wave's hunger instead of a crystal.
  function feedHeart() {
    const need = hungerNeed(run.wave);
    fl.hunger = null;
    if (!need || run.crystals <= 0) return;
    const P = fl.needParts || {}, h = fl.hunger = { need, got: Math.round(fl.score * 10) / 10, fedAmt: Math.round(fl.fed * 10) / 10, fedAt: fl.fedAt >= 0 ? Math.round(fl.fedAt) : null,
      needBase: P.base, needRevive: P.revive || 0, needDemon: P.demon || 0, needCredit: P.credit || 0, needGranary: P.granary || 0, needBlood: P.blood || 0, tookPurse: 0, bankrupt: false, fed: false, fedWave: false,
      purse0: Math.round(fl.essence), tithe: Math.round(fl.stats.essTithe || 0), satiety: Math.round(run.satiety || 0), heartLv: run.heartLv || 0 };
    h.fedWave = fl.fed >= need - 0.001;
    if (h.fedWave) { h.fed = true; tl('hg', 'fed', need); return; }
    const short = need - fl.fed, want = short * (mods.stoneHeart ? 0.75 : 1), pay = Math.min(Math.max(0, fl.essence), want);
    fl.essence -= pay; h.tookPurse = Math.round(pay * 10) / 10; fl.stats.heartTook = pay;
    if (pay >= want - 1e-6) {
      h.fed = true; tl('hg', 'took', Math.round(pay));
      floatTile(fl.heart.x, fl.heart.y, 'Serce zabrało ' + fmtE(pay) + ' z zapasów', '#ff9aa4', 16, -1.2);
      return;
    }
    if (mods.bloodCredit && !run.creditUsed) {   // Kredyt krwi
      run.creditUsed = true; run.credit = { w: run.wave + 1, n: Math.round((want - pay) * 2) }; h.fed = true; h.credit = run.credit.n; tl('hg', 'credit', run.credit.n);
      floatTile(fl.heart.x, fl.heart.y, 'Kredyt krwi: +' + run.credit.n + ' głodu w następnej fali', '#ff9aa4', 15, -1.2);
      return;
    }
    const c0 = run.crystals; run.crystals = Math.max(0, run.crystals - 1); h.ate = true; h.bankrupt = true; h.lostPurse = Math.round(fl.essence); fl.essence = 0;
    fl.stats.hungerAte = 1; tl('hg', 'ate', Math.round(want - pay));
    crystalEv(run.crystals - c0, 'hunger', Math.round(fl.fed) + '+' + Math.round(pay) + '/' + need);   // 1.24 (D, P0-2)
    floatTile(fl.heart.x, fl.heart.y, 'Głód pękł kryształ!', '#ff6b6b', 18, -1.2); shake = Math.max(shake, 0.25); buzz([90, 60, 90]);
  }
  // 1.26 Ofiara (4.10): in the build, Esencja from the purse straight into Nasycenie, 1:1, at most 40 a break between waves
  const OFIARA_MAX = 40;
  const ofiaraLeft = () => !run || !fl || fl.phase !== 'build' ? 0 : Math.max(0, Math.min(Math.floor(fl.essence), OFIARA_MAX - (run.ofiaraW === run.wave ? run.ofiaraN : 0)));
  function ofiara(n) {
    n = Math.floor(Math.min(n, ofiaraLeft())); if (!(n > 0)) return 0;
    if (run.ofiaraW !== run.wave) { run.ofiaraW = run.wave; run.ofiaraN = 0; }
    run.ofiaraN += n; fl.essence -= n; run.essence = fl.essence; fl.stats.ofiara = (fl.stats.ofiara || 0) + n;
    floatTile(fl.heart.x, fl.heart.y, 'Ofiara +' + n + ' Nasycenia', '#ffd27a', 15, -1.3); burst(fl.heart.x + 0.5, fl.heart.y + 0.5, '#ffd27a', 10);
    satietyAdd(n, 'ofiara');
    updateTray(); saveRunSoon();
    return n;
  }
  // 1.24 (D, P0-2): every change of run.crystals with its cause (stolen | hunger | saved | card | other): run.crystalEv for the whole run
  // (the runs record) and each wave record's crystalEvents (what came since the last wave record, the build phase before it
  // included), so crystals0 + the sum of the deltas = crystals. 'saved' (a crystal carried back to the heart) has delta 0. A change
  // made anywhere else is caught by crystalSync as 'other' (why 'unlogged'), so the sum always holds.
  function crystalEv(delta, cause, why) {
    if (!run || (!delta && cause !== 'saved')) return;
    if (!run.crystalEv) { run.crystalEv = []; run.crystalEvW = 0; }
    if (run.crystalsSeen == null) run.crystalsSeen = run.crystals - delta;
    const e = { t: fl && fl.phase === 'raid' ? Math.round(fl.time * 10) / 10 : null, delta, cause, wave: run.wave };
    if (why) e.why = String(why);
    run.crystalEv.push(e); run.crystalsSeen += delta;
  }
  function crystalSync() {
    if (!run) return;
    if (run.crystalsSeen == null) { run.crystalsSeen = run.crystals; return; }   // a run saved before 1.24: the log starts here
    if (run.crystalsSeen !== run.crystals) crystalEv(run.crystals - run.crystalsSeen, 'other', 'unlogged');
  }
  function crystalEvTake() { crystalSync(); const L = run.crystalEv || [], out = L.slice(run.crystalEvW || 0); run.crystalEvW = L.length; return out; }
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
      checks: nChk, cpm: realMin > 0 ? Math.round(nChk / realMin * 10) / 10 : 0, frozen: ps ? ps.frozen : null, memFires: s0.memFires || 0, skullOff: s0.skullOff || 0, classes: fl.heroes.map(h => h.type), trayPauses: s0.trayPauses || 0,
      crystalEvents: crystalEvTake(), essenceAtStart: run.essAtStart != null ? Math.round(run.essAtStart) : null, essenceAtWaveStart: fl.essW0 != null ? Math.round(fl.essW0) : null,   // 1.24 (D, P0-2, P0-6)
      itemsCount: fl.itemsW0 != null ? fl.itemsW0 : fl.items.size, roomsCount: fl.roomsW0 != null ? fl.roomsW0 : run.layout.cells.size, previewOpened: run.previewN || 0, previewVis: pvTake(), fearUi: Object.assign({ card: 0, bar: 0 }, fl.fearUi || {}),   // 1.24 (D, P0-6)
      satiety: Math.round(run.satiety || 0), satietyGain: Math.round(fl.stats.satietyGain || 0), heartLv: run.heartLv || 0, heartPick: fl.heartPick || null, regrow: fl.stats.regrow || 0, feastPts: Math.round(fl.stats.feastPts || 0), tithePts: Math.round(fl.stats.essTithe || 0), ofiara: fl.stats.ofiara || 0, revived: fl.stats.revived || 0, stealMax: Math.round((fl.stats.stealMax || 0) * 10) / 10, omen: (run.omens || {})[run.wave] || null });   // 1.26 (4.11)
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
    run.afterModals = () => { run.wave++; startBuild(); queueModal({ type: 'shop', between: true }); if (run.tut >= 0) tutOnBuild(); if (run.breachNew === run.wave && fl.breach) queueModal({ type: 'breach', fresh: true }); if (run.wave === 2 && !run.hungerTip) { run.hungerTip = true; queueModal({ type: 'hungerTip' }); } };   // v12.1: a new breach asks right away (patch or leave)
    const f = run.afterModals; run.afterModals = null; f();
  }
  function endRun(reason, result) {
    run.result = result || 'end'; run.reason = reason; run.over = true;
    if (run.won && run.result !== 'win') { run.endless = run.wave - RUN_WAVES; run.result = 'win'; }   // won at wave 10, ended later: still a win
    onbDone(run);   // 1.12: the next run opens more of the game
    clearSave();
    fl.phase = 'over'; ff = false; updateAction();
    queueModal({ type: 'end' });
  }
  // Quitting mid-run still logs everything so far, including the unfinished wave.
  function quitRun() {
    if (!run || run.over) return;
    if (fl.phase === 'raid') {
      fl.check = null; run.raidSec += fl.time;
      recordWave(0, 0, true); run.total += run.waves[run.waves.length - 1].score; logWave(true);   // 1.24 (D, P0-4)
    }
    endRun('Run przerwany przez gracza.', 'quit');
  }

  /* ================= building tools: dig, passage, demolish ================= */
  const cellCenter = (cx, cy) => [cx * CELL + 4.5, cy * CELL + 4.5];
  const expandRefund = lvl => Math.floor(ITEMS.expand.cost * (Math.pow(2, lvl) - 1) / 2);   // half of what the expansions cost
  function toolCost(t, m) {
    if (ROOMTYPES[t] || KINDS[t]) return m && m.has ? 0 : ITEMS[t].cost;   // taking a room type (1.15: or a komnata) off costs nothing (half comes back)
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
    } else if (KINDS[tool]) {   // 1.15: what a room is for (one komnata at a time; an effect may stay beside it)
      const k = KINDS[tool];
      fl.rooms.forEach(R => { if (R.kind === 'room') out.push({ tool, room: R.key, has: R.rk === k, other: R.rk && R.rk !== k ? R.rk : null, x: (R.x0 + R.x1) / 2 + 0.5, y: (R.y0 + R.y1) / 2 + 0.5 }); });
    }
    return out;
  }
  function forgetTiles(tiles) { tiles.forEach(t => { run.rumor.tiles.delete(t[1] * WW + t[0]); }); }
  function applyTool(m) {
    const L = run.layout, cost = toolCost(m.tool, m);
    if (fl.phase !== 'build') { note('Tylko między falami'); return false; }
    if (fl.essence < cost) { note('Za mało Esencji (' + cost + ')'); return false; }
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
    } else if (KINDS[m.tool]) {
      const c = L.cells.get(m.room), R = fl.rooms.find(r => r.key === m.room), k = KINDS[m.tool], K = KIND_INFO[k];
      if (c && R) {
        ok = true;
        if (c.rk === k) { delete c.rk; R.rk = null; const back = Math.floor(ITEMS[m.tool].cost / 2); fl.essence += back; msg = 'Pokój bez komnaty (+' + back + ' Esencji).'; }
        else {
          const was = c.rk; c.rk = k; R.rk = k;
          const mine = [...fl.items.values()].filter(it => KIND_OF[it.type] === k && servedRooms(it.type, it.x, it.y).includes(R.id)).length;
          msg = 'Komnata: ' + K.name + (was ? ' (zamiast: ' + KIND_INFO[was].name + ')' : '') + '. ' + ITEMS[m.tool].desc.split(' w tym pokoju ')[0].split(': ').slice(1).join(': ') + ' w tym pokoju ' + (K.items.length > 1 ? 'mają' : 'ma') + ' cechę 3. poziomu' + (mine ? ' (działa już na ' + mine + ')' : ', postaw je tutaj') + '.';
        }
        fl.threatDirty = true;
      }
    }
    if (!ok) { undoStack.pop(); updateUndoBtn(); note('Tu się nie da'); return false; }
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
    say(h, pick(P.res[dtp] > 1 ? SAY.weakHit[dtp] : SAY.resistHit[dtp]), 3, 1.8, 'loud');
    floatHero(h, (P.res[dtp] > 1 ? 'Słabość: ' : 'Odporność: ') + DMG_TYPES[dtp], P.res[dtp] > 1 ? '#ffb35c' : '#9fc6ff', 13, -1.0);
    tutPop('body');
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
    tutPop('phobia');
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
      h.phobiaSeen.add(it); sawAdd(h, itemTags(it)); sayNow(itemTags(it), () => { addFear(h, 0.15 * h.courage * (1 + (mods.phobiaK || 0) / 2), null, 'phobia'); revealPhobia(h); });   // 1.17.1: he has seen it
    });
  }
  function bt(type) { return fl.byType[type] || (fl.byType[type] = { placed: 0, spent: 0, checks: 0, crit: 0, ok: 0, miss: 0, skip: 0, fires: 0, hits: 0, dmg: 0, pts: 0, fear: 0, fearPts: 0, kills: 0, disarmed: 0, died: 0, passiveDmg: 0, passivePts: 0, skipLethal: 0, slept: 0 }); }
  function srcKind(src) {
    if (src.kind) return src.kind;
    if (TRAPS[src.type]) return 'trap';
    if (MONSTERS[src.type]) return 'monster';
    return 'other';
  }
  // 1.13 (author: they stood and rested in traps): a hero remembers where a trap just got him (the whole reach of it, for
  // half a minute), even if the party learnt nothing; he will not stand still there (p5_ai.js: unsafeAt, toSafety)
  function markOuch(h, it) { if (it && it.x !== undefined && ITEMS[it.type] && fl.items.get(key(it.x, it.y)) === it) h.ouch = { until: fl.time + 30, tiles: new Set(areaOf(it).map(t => t[1] * WW + t[0]).concat([it.y * WW + it.x])) }; }
  // 1.17.1: what hurts him is the thing of the moment for every line it wakes (trauma, weakness, phobia, death cries), and he
  // has felt it (bleeding from spikes is not fire: before 1.17.1 it counted as fire damage, hence a hero dreaming of flames
  // where there were none)
  const BURN_TAGS = { spikes: ['spikes', 'blood'], arrows: ['arrows', 'fire'], powder: ['blast', 'fire'], fire: ['fire'], archer: ['archer', 'monster', 'fire'], trapdoor: ['trapdoor', 'fire'] };
  const hurtTags = (h, src) => { const k = srcKind(src); return k === 'burn' ? BURN_TAGS[h.burnBy] || ['fire'] : k === 'bleed' ? ['spikes', 'blood'] : k === 'trap' || k === 'monster' ? itemTags(src, true) : null; };
  function damage(h, amt, src, comboMult) {
    if (h.dead || h.fled || amt <= 0 || fl.ending !== null) return;
    const now = hurtTags(h, src);
    if (!now) return damageRaw(h, amt, src, comboMult);
    sawAdd(h, now); if (srcKind(src) === 'burn') sawNear(h, now);   // the others see him burn or bleed
    return sayNow(now, () => damageRaw(h, amt, src, comboMult));
  }
  function damageRaw(h, amt, src, comboMult) {
    if (fl.firing) markOuch(h, fl.firing);
    const kind = srcKind(src);
    comboMult = comboMult || 1; amt *= comboMult;   // 1.12: a combo makes the wounds hit harder too
    const tkey = kind === 'trap' && src.type ? src.type : null;
    if (tkey) {
      // self-defence first: the thief may dodge a single hit, a talisman's ward (a power the hero switches on) soaks part of it
      if (h.type === 'thief' && (tkey === 'spikes' || tkey === 'arrows') && !held(h) && fl.time > h.dodgeCd && Math.random() < h.R.dodge) {
        h.dodgeCd = fl.time + 3; fl.stats.dodges++; say(h, pick(SAY.dodge), 2, null, 'loud'); floatHero(h, 'Unik', '#c9f0b0', 14, -0.6); heroFx('dodge', h); return;   // 1.24 (B): an afterimage
      }
      if (fl.time < h.wardUntil && !(tkey === 'arrows' && t3(src))) {   // piercing arrows go through; acid corrodes the ward
        amt *= 1 - h.wardK * (inB('acid', h.room) ? 0.5 : 1); fl.stats.charmSoak = (fl.stats.charmSoak || 0) + 1;
        if (amt <= 0.5) return;
      }
      amt *= trapMult(h, tkey, src);
      const ar = gearR(h, 'armor');   // armour takes the edge off every trap (acid eats half of that too)
      if (ar) amt *= 1 - (1 - Math.pow(0.92, ar * itemPow(h))) * (inB('acid', h.room) ? 0.5 : 1);
    } else if (caged(h)) amt *= 1.5;
    if (h.cursed && kind !== 'heart') amt *= 1.3;   // a cursed treasure: everything hurts more
    if ((kind === 'trap' || kind === 'monster') && inB('acid', h.room)) amt *= 1.1;   // 1.26 (6.4): Kwas +10%
    if (kind === 'trap' && h.oilA && fl.time < (h.oilUntil || -1) && Math.random() < 0.15 && setStatus(h, 'burn', 3, 'oilslick')) floatHero(h, 'Zapłon!', '#ff9a3c', 12, -0.7);   // 1.26 Plama oleju A: Łatwopalna
    if (fl.time < (h.hexUntil || -1) && kind !== 'heart') amt *= 1.2;   // 1.26 Szaman B: Klątwa
    if (mods.deepsleep && (kind === 'trap' || kind === 'monster') && h.state === 'rest' && isRt(h.room, 'haven')) amt *= 1 + mods.deepsleep;   // 1.18 Sen bez przebudzenia
    // v14: the damage type against the hero's class, body and scars (a weakness shows the first time it bites)
    const dtp = kind === 'burn' ? (h.burnBy === 'spikes' ? 'pierce' : 'fire') : kind === 'bleed' ? 'pierce' : kind === 'poison' ? 'poison' : kind === 'react' ? src.dtp : kind === 'heart' ? null : DMG_OF[tkey || (src && src.type) || (kind === 'loot' ? 'loot' : '')] || null;
    if (dtp) { const tk = typeMult(h, dtp); amt *= tk; if (tk !== 1) revealPhys(h, dtp, tk); }
    if (dtp === 'pierce' && mods.tarSulfur && fl.time < (h.oilUntil || -1)) amt *= 1 + mods.tarSulfur;   // 1.26 Smoła i siarka
    if (dtp === 'shock') { const ar = gearR(h, 'armor'); if (ar) amt *= 1 + 0.05 * ar; }   // 1.26 (7.3): armour draws the lightning
    if (dtp === 'fire' || dtp === 'shock') { amt = reactHit(h, amt, dtp, kind, src); if (h.dead) return; }   // 1.26: Pożar, Detonacja, Porażenie
    const attr = tkey || (kind === 'monster' ? src.type : kind === 'burn' ? (h.burnBy || 'fire') : kind === 'loot' ? 'loot' : null);
    const real = Math.min(h.hp + h.shield, amt);
    let rest = amt;
    if (h.shield > 0) { const ab = Math.min(h.shield, rest * (inB('acid', h.room) ? 0.5 : 1)); h.shield -= ab; rest -= ab; }   // acid eats through half of a ward
    h.hp -= rest; if (kind !== 'burn' && kind !== 'bleed' && kind !== 'poison') h.flash = 0.12; h.hurtAt = fl.time;   // 1.26: a tick of a status does not blink the hero white
    if (h.hp < 0.4 * h.max && kind !== 'heart') sawNear(h, ['blood']);   // 1.17.1: badly hurt: the others see the blood
    fl.heroes.forEach(o => { if (o !== h && !o.dead && !o.fled && !o.gone && Math.abs(o.tx - h.tx) + Math.abs(o.ty - h.ty) <= 5) lookAt(o, h.x, h.y); });   // 1.10: the others turn to him
    if (kind !== 'heart') h.playerDmg += real * (kind === 'monster' ? MON_FACTOR : 1);
    feltBy(h, real / h.max);   // 1.05: what hurt him (told in the tavern)
    if ((kind === 'trap' || kind === 'monster') && src && src.x !== undefined) grudgeAdd(h, src, real / h.max);   // 1.23: and where it stood (a Nemezis' grudge)
    if (attr) { const b = bt(attr); if (kind === 'monster') b.passiveDmg += real; else b.dmg += real; }
    if (kind === 'trap') fl.party.morale = Math.max(0.15, fl.party.morale - 0.03);
    if (kind === 'trap' && real > 0 && src && src.x !== undefined) { const hm = fl.party.hurt || (fl.party.hurt = new Map()); (hm.get(src) || hm.set(src, new Set()).get(src)).add(h.id); }   // 1.22: who a trap hurt this wave (notThisWay)
    if (h.hp <= 0) { h.hp = 0; h.dead = true; h.killer = kind === 'monster' ? src : (src && MONSTERS[src.type] && fl.firing && fl.firing.type === src.type ? fl.firing : null); kill(h, kind, attr); return; }   // 1.26: a monster's ability (a check) is its kill too   // 1.21: killer
    bondHurt(h, real, kind, src);   // 1.21
    if (h.nemesis && !h.nemRaged && h.hp < 0.3 * h.max) nemesisRage(h);   // 1.23: badly hurt, he will not run this time
    if (kind === 'trap' && real >= 0.25 * h.max && fl.time - (fl.party.lastSay.friendHit || -99) > 5) {   // 1.05: a friend sees it and reacts
      const o = alive().find(q => q !== h && !q.fleeing && !panicking(q) && !q.lost && hdist(q, h) <= 4);
      if (o) { fl.party.lastSay.friendHit = fl.time; fl.party.queueSay.push({ id: o.id, text: nameFill(pick(SAY.friendHit), h), at: fl.time + 0.5, how: 'loud' }); }
    }
    if (h.type === 'barbarian' && real >= 0.2 * h.max && kind !== 'heart' && fl.time > h.rageCd && !raging(h)) startRage(h, 'hit');   // 1.05: a hard blow wakes the fury
    if (h.boss === 'final' && !h.raged && h.hp < 0.5 * h.max) {   // the hero of the prophecy, half dead, gets back up angrier
      h.raged = true; h.hp = Math.min(h.max, h.hp + 0.2 * h.max); h.shield = Math.max(h.shield, 0.2 * h.max); fl.stats.rage = 1;
      alive().forEach(o => { if (o !== h && canHearShout(o, h)) o.fear = Math.max(0, o.fear - 0.2 * o.courage); });   // 1.17: those who hear him
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
    const gmax = h.max / (h.hpK || 1);   // 1.12.1: Groza and the fear of a wound count against his HP without the 1.12 bonus (the bonus makes raids longer, not wounds cheaper)
    let pts = real / gmax * GZ.dmg * DMG_FACTOR[kind] * depthMult(h.room) * lootMult(h);   // v15: Groza against his max HP (gear-laden heroes bleed more); the combo is applied in addPts
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
    if (kind !== 'heart' && kind !== 'loot') addFear(h, real / gmax * h.courage * (kind === 'monster' ? 0.18 * (1 + mods.monsterFear) : 0.25) * (fl.surprise && kind === 'trap' ? 1.3 : 1), attr, kind === 'monster' && mods.monsterFear ? 'roar' : 'dmg', dtp);
    if (kind === 'trap' && real >= 8 && Math.random() < 0.35) say(h, pick(h.hp < 0.3 * h.max ? SAY.hurtScared : SAY.hurt), h.hp < 0.3 * h.max ? 2 : 1, 1.4, 'loud');
    if (kind === 'trap' && !h.dead && h.hp < 0.6 * h.max) useCharm(h, 'hit');   // a hard hit: switch the talisman on for what comes next
  }
  // Fear: the second currency of the dungeon. Every bit of it scores; past a hero's courage he runs for the exit.
  function fearResist(h, attr) {
    let k = 1;
    if (attr && fl.knownTypes && fl.knownTypes.has(attr)) k *= 0.6;   // they knew about it: less of a shock
    { const alt = inB('altar', h.room), pr = fl.heroes.some(o => o !== h && o.type === 'priest' && o.rank >= 1 && !o.dead && !o.fled && !o.gone && hdist(o, h) <= 3), pa = fl.heroes.some(o => o !== h && o.type === 'paladin' && !o.dead && !o.fled && !o.gone && hdist(o, h) <= 3);
      k *= Math.min(pr ? (alt ? 0.875 : 0.75) : 1, pa ? (alt ? 0.9 : 0.8) : 1); }   // a priest calms those around him (half as well at the altar); 1.26: a paladin's oath, the stronger counts
    if (h.trait === 'superstitious' && attr && (SCARE[attr] || FAMILY_OF[attr] === 'haunt')) k *= 1.4;   // 1.26 Przesądny
    if (omenK(run.wave, 'fearK')) k *= omenK(run.wave, 'fearK');   // 1.26 Inkwizycja
    if (fl.heroes.some(o => o !== h && o.boss === 'final' && !o.dead && !o.fled && !o.gone && hdist(o, h) <= 3)) k *= 0.75;   // the prophecy walks with them
    if (fl.heroes.some(o => o.boss && !o.dead && !o.fled && !o.gone && !caged(o) && (o === h || canSee(h, o) || canHear(h, o)))) k *= 0.85;   // 1.17: a boss he is with
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
    say(h, why === 'vow' && dead ? bondText(h, 'revengeVow', dead) : why === 'death' && dead ? nameFill(pick(SAY.revenge), dead) : why === 'panic' ? pick(SAY.rageNoPanic) : pick(SAY.rage), 4, 2.2);   // 1.21: vow
    floatHero(h, 'Furia!', '#ff9a9a', 13, -0.8); heroFx('rage', h);   // 1.24 (B): a red aura
    return true;
  }
  const raging = h => fl.time < h.rageUntil && !inB('shackles', h.room);
  function addFear(h, amt, attr, src, dtp) {
    if (h.dead || h.fled || amt <= 0) return;
    if (fl.firing && (TRAPS[fl.firing.type] || SCARE[fl.firing.type])) markOuch(h, fl.firing);   // 1.13: a scare that went off here too
    const raw = amt;
    amt *= mods.fearMult * fearResist(h, attr) * (1 + 0.03 * (run.stacks.chronicle || 0) * mods.chronicle) * (isRt(h.room, 'fog') ? 1.15 : isRt(h.room, 'hush') ? 1.2 : 1);   // Mgła: +15%, 1.10 Głusza: +20%
    if (inB('altar', h.room)) amt *= 1.1; if (inB('howl', h.room)) amt *= 1.1;   // 1.26 (6.4): Ołtarz and Kamień wyjec: +10% fear in their room
    if (raging(h)) amt *= 0.5;   // 1.05: fury dulls fear
    if (fl.time < (h.markUntil || -1)) amt *= 1.3;   // 1.26 Naznaczony
    if (fl.time < (h.reflectUntil || -1) && attr !== 'mirror') { amt *= 1.2; h.reflectUntil = -1; }   // 1.26 Lustro B: Odbicie (once)
    if (mods.deepsleep && attr && ACTIVE[attr] && h.state === 'rest' && isRt(h.room, 'haven')) amt *= 1 + mods.deepsleep;   // 1.18 Sen bez przebudzenia: from your traps and monsters, not his own nightmares
    amt *= phobiaMult(h, attr, src, dtp);   // v14: phobias (x2) and this wave's traumas (x1,5)
    if (attr) h.fearBy[attr] = (h.fearBy[attr] || 0) + amt; else if (src) h.fearBy[src] = (h.fearBy[src] || 0) + amt;
    if (attr && fl.firing && fl.firing.type === attr) { feltBy(h, amt / h.courage); grudgeAdd(h, fl.firing, amt / h.courage); }   // 1.05: what scared him (told in the tavern); 1.23: and where (a grudge)
    const sk = src || attr || 'other'; fl.stats.fearSrc[sk] = (fl.stats.fearSrc[sk] || 0) + amt;
    const before = h.fear;
    h.fear += amt;
    if (attr && ACTIVE[attr] && amt >= 0.08 * h.courage && h.bond && h.bond.type === 'rival') rivalScare(h);   // 1.24: his rival saw him scared
    const pts = addPts(amt / h.courage * GZ.fear * depthMult(h.room) * loneMult(h), 'fearPts', h); fl.stats.fearDealt += amt; h.acc += pts;   // v15: Groza against his courage
    if (attr) { const b = bt(attr); b.fear += amt; b.fearPts += pts; }
    // Grota: the scream echoes into the rooms and corridors next door (40%, and the echo does not echo again)
    if (src !== 'echo' && isRt(h.room, 'grotto')) { const nb = nbrRooms(h.room); alive().forEach(o => { if (o !== h && nb.includes(o.room)) addFear(o, raw * 0.4, attr, 'echo'); }); }
    const lim = h.courage * (fl.fearless ? 1.3 : 1) * (h.trait === 'hothead' ? 1.1 : 1);   // 1.26 Zapaleniec
    if (!h.fleeing && !h.crystal && h.fear >= [0.85, 0.7, 0.6, 0.6][h.rank] * lim) useAmulet(h);   // the amulet, before the nerves go (rookies late)
    const pk = h.trait === 'coward' ? 0.55 : 0.7;   // cowards panic early
    // 1.05: a barbarian on the edge of panic gets angry instead (once in a while; not in Okowy)
    if (h.trait === 'hothead' && h.hotW !== run.wave && before < pk * lim && h.fear >= pk * lim && !h.fleeing && !h.crystal && startRage(h, 'panic')) { h.hotW = run.wave; h.fear = Math.max(0, h.fear - 0.25 * lim); fl.stats.rageNoPanic = (fl.stats.rageNoPanic || 0) + 1; return; }   // 1.26 Zapaleniec: once a wave fury instead of panic
    if (h.type === 'barbarian' && before < pk * lim && h.fear >= pk * lim && !h.fleeing && !h.crystal && fl.time > h.rageCd && startRage(h, 'panic')) { h.fear = Math.max(0, h.fear - 0.25 * lim); fl.stats.rageNoPanic = (fl.stats.rageNoPanic || 0) + 1; return; }
    if (before < pk * lim && h.fear >= pk * lim && !h.fleeing && !h.crystal && fl.time > h.panicUntil && !nemHold(h)) {   // 1.23: not a Nemezis above 15% HP
      h.panicUntil = fl.time + 2 + Math.random() * 2; h.needPlan = true; fl.stats.panics++; say(h, pick(SAY.panic), 3, 1.8, 'loud');
    }
    if (h.fear >= lim && h.crystal && !caged(h) && !nemHold(h)) dropCrystal(h);   // 1.23: nemHold   // v14.1: terror beats greed: the carrier throws the crystal away and runs
    if (h.fear >= lim && !h.fleeing && !h.crystal && !caged(h)) startFlee(h);   // v14.1: the cage holds, fear or not (see cage deaths)
  }
  const nemHold = h => !!h.nemesis && h.hp > 0.15 * h.max;   // 1.23: a Nemezis does not panic or flee by fear while above 15% HP
  function dropCrystal(h) {
    fl.stats.crystalDropped = (fl.stats.crystalDropped || 0) + 1; tl('cd', h.id);
    say(h, pick(SAY.crystalFear), 4, 2.2); floatHero(h, 'Rzuca kryształ!', '#ff9ab0', 15, -1);
    crystalReturns(h);
    if (!h.fleeing) startFlee(h);
  }
  function startFlee(h) {
    if (nemHold(h)) return;   // 1.23: a Nemezis above 15% HP does not run from fear (nor from a heart that repels them)
    if (caged(h)) { freeCaged(h, false, 'panic'); say(h, pick(SAY.cageBreak), 4); }
    h.fleeing = true; h.needPlan = true; fl.stats.flees++; tl('fl', h.id); tutPop('flee');
    if (mods.fleeShock) alive().forEach(o => { if (o !== h && !o.fleeing && canHearShout(o, h)) addFear(o, mods.fleeShock * o.courage, null, 'screams'); });   // Krzyki w ścianach (1.18: who hears his shout, as for every other shout since 1.17)
    if (h.state === 'rest' || h.state === 'talk' || h.state === 'wait' || h.state === 'boss' || h.state === 'disarm' || h.state === 'free' || h.state === 'loot') { h.state = 'walk'; h.item = null; h.lootIt = null; }   // 1.20: loot
    say(h, pick(h.trait === 'coward' ? SAY.cowardRun : SAY.flee), 4, 2);
    floatHero(h, 'Ucieka!', '#c3b2ff', 14, -0.8);
    // the champion will not have it: a battle cry steadies everyone else (once every 15 s)
    // 1.17: only when he sees or hears the one who bolts; his cry steadies those who hear it
    const ch = fl.heroes.find(o => o.boss === 'champion' && o !== h && !o.dead && !o.fled && !o.gone && !o.fleeing && !caged(o) && perceives(o, h, true));
    if (ch && fl.time > (ch.shoutCd || 0)) {
      ch.shoutCd = fl.time + 25; fl.stats.shouts = (fl.stats.shouts || 0) + 1;
      say(ch, pick(SAY.champShout), 4, 2.2); floatHero(ch, 'Okrzyk!', '#ffd27a', 15, -0.9);
      alive().forEach(o => { if (o !== h && !o.fleeing && canHearShout(o, ch)) o.fear = Math.max(0, o.fear - 0.25 * o.courage); });
    }
    const P = fl.party, L = leader(), crew = L ? groupOf(L) : alive();   // 1.17: "half of us run" counts the leader's group
    if (L && L !== h && L.R.coord && Math.random() < 0.6 && perceives(L, h)) say(L, pick(SAY.fleeShout), 2);
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
    // 1.17: a caged one is not marked fleeing (nobody could free him then, 6.8 #6), and the champion who just swore he never runs
    // walks out with them instead of fleeing
    // 1.17: the cry reaches whoever hears the leader (14 steps); the others learn of the flight when they rejoin (h.plan)
    const L = leader();
    alive().forEach(o => {
      if (L && o !== L && !canHearShout(o, L) && !o.fleeing) return;
      o.plan = 'flee'; if (!o.crystal && !caged(o) && o.boss !== 'champion' && !nemHold(o)) { o.fleeing = true; }   // 1.23: a Nemezis walks out with them like the champion
      o.needPlan = true; if (o.state === 'rest' || o.state === 'talk' || o.state === 'boss' || o.state === 'wait') o.state = 'walk';
    });
    if (L) say(L, pick(SAY.partyFlee), 4, 2.2);
  }
  // The carrier loses the crystal (killed, or down a bottomless well): it rolls back to the heart and the others decide what now.
  function crystalReturns(h) {
    const P = fl.party;
    h.crystal = false; P.carrierId = -1; fl.stats.crystalSaved++; tl('cs', h.id); crystalEv(0, 'saved', h.type);   // 1.24 (D, P0-2)
    const cp = addPts(GZ.crystal, 'crystalPts');
    floatTile(fl.heart.x, fl.heart.y, 'Kryształ wraca! +' + fmtE(cp) + ' Esencji', '#ff7a86', 17, -1);
    // 1.17: only those who see it or hear the cry shout and turn back; the decision is the leader's group's, and the others learn
    // of it when they rejoin (h.plan; meanwhile they walk on towards the exit, thinking the crystal is ahead of them)
    const L = leader(), crew = L ? groupOf(L) : alive();
    const at = { tx: h.tx, ty: h.ty, room: h.room, gone: false };   // where it happened (the carrier may be down a bottomless well)
    alive().forEach(o => { if (perceives(o, at, true)) { say(o, pick(SAY.crystalDrop), 4); o.needPlan = true; } });
    if (crew.length >= 2 && crew.reduce((a, o) => a + o.fear / o.courage, 0) / crew.length < 0.55 && !crew.some(o => o.fleeing)) { P.plan = 'assault'; P.steal = 0; crew.forEach(o => { o.plan = 'assault'; o.needPlan = true; }); }
    else partyFlee();
  }
  // A dead hero: points, a soul for the dungeon, a louder legend (Infamy), panic among the others. His secrets die with him.
  function kill(h, kind, attr) {
    const p = heroPos(h);
    h.acc = 0; h.foe = null; h.bubble = null; h.outR = realNow; h.outKind = 'dead';   // 1.09: he tips over
    if (h.bet) betEnd(h, true);   // 1.21: a bet he did not live through
    fl.stats.kills++; buzz(14);
    if (kind === 'heart') fl.stats.killsHeart++; else if (kind === 'monster') fl.stats.killsMon++; else fl.stats.killsTrap++;
    if (attr) bt(attr).kills++;
    burst(p.x, p.y, '#d8434f', 16);
    const crypt = isRt(h.room, 'crypt');
    const pts = addPts(GZ.kill * (h.boss ? 2 : 1) * (h.type === 'cultist' ? 1.5 : 1) * (omenK(run.wave, 'killK') || 1) * mods.soulMult * (crypt ? 1.5 : 1), 'killPts', h); tl('k', h.id, attr || kind);   // v15: a death is Groza like everything else (Żniwiarz x2, Krypta x1,5)
    if (h.type === 'cultist' && h.drank > 0) { const back = 0.5 * h.drank, need = hungerNeed(run.wave); fl.fed = Math.min(need, fl.fed + back); fl.stats.drainBack = (fl.stats.drainBack || 0) + back; floatTile(fl.heart.x, fl.heart.y, 'Serce odzyskuje ' + fmtE(back), '#ff9aa4', 14, -1.2); if (fl.fed >= need - 1e-6) heartFull(need); }   // 1.26: half of what he drank comes back tl('k', h.id, attr || kind);   // v15: a death is Groza like everything else (Żniwiarz x2, Krypta x1,5)
    fl.stats.souls++;
    if (mods.bloodbath && h.room === fl.heart.room) { fl.bathK = Math.min(2, (fl.bathK || 1) * Math.pow(1.1, mods.bloodbath)); floatTile(fl.heart.x, fl.heart.y, 'Krwawa łaźnia ×' + fmt2(fl.bathK), '#ff7a86', 13, -1.7); }   // 1.26
    if (mods.skulls) run.stacks.skulls = Math.min(20, (run.stacks.skulls || 0) + 1);   // 1.26 Kolekcja czaszek
    { const kt = h.killer ? h.killer.type : attr; if (mods.execDiary && kt && ITEMS[kt]) { run.kata = run.kata || {}; run.kata[kt] = Math.min(0.3, (run.kata[kt] || 0) + 0.02 * mods.execDiary); } }   // 1.26 Pamiętnik kata
    if (mods.granary) run.stacks.granary = Math.min(40, (run.stacks.granary || 0) + 1);   // Spichlerz dusz: the heart wants 1 less for good (1.01; 1.26: at most 40 a run)
    if (kind === 'monster' || (h.killer && MONSTERS[h.killer.type])) feastIn(h);   // 1.26 Uczta (a blow, an ability)
    killHooks(h, kind);   // 1.26: the bell, Powstanie, the hound's hunt, Głód krwi, Grabież
    if (attr === 'spikes' && mods.hunger) run.stacks.hunger = (run.stacks.hunger || 0) + 1;   // Głodne kolce
    if (mods.skullwall && rkOf(h.room) === 'ossuary') run.stacks.skullwall = (run.stacks.skullwall || 0) + 1;   // 1.18 Mur z czaszek
    addFloat(p.x, p.y - 0.1, 'Śmierć +' + fmtE(pts) + ' Esencji', '#ff7a86', 15, -0.4);
    const P = fl.party;
    if (h.nemesis) nemesisKilled(h, p);   // 1.23: the bounty on his head is paid
    rememberFallen(h);   // 1.23: the tavern will know where he died
    if (h.crystal) crystalReturns(h);   // the crystal falls and rolls back to the heart
    // 1.18 Kocioł ogra: in a Jaskinia ogra nothing spills: 2 Esencji an item and 1 a coin (at most 8 a hero, times the copies)
    if (mods.cauldron && rkOf(h.room) === 'ogre' && (h.inv.length || h.gold > 0)) {
      const n = Math.min(8, 2 * h.inv.length + (h.gold || 0)) * mods.cauldron;
      h.inv = []; h.gold = 0; gainEssence(null, n, 'essDrop'); fl.stats.cauldron = (fl.stats.cauldron || 0) + n; tl('cn2', h.id, n);
      addFloat(p.x, p.y - 0.5, 'Kocioł +' + n + ' Esencji', '#ff7a86', 14, -0.6);
    }
    // his gear and his purse spill out as loot around the body: the exact items, free for the next one who dares (no Esencja back for these)
    // 1.20: the piles know whose body they are (it.body, fromNm): the others see the dead one's things, not a relic (dropItem)
    if (h.killer && h.killer.type === 'goblin' && t3B(h.killer)) dropItem(h, null, 2, false, { body: true });   // 1.26 Goblin B: Łupieżca (a goblin's B in its room counts too: warlord B, below)
    h.inv.forEach(it => dropItem(h, it, 0, false, { body: true }));
    if (h.gold > 0) dropItem(h, null, h.gold, false, { body: true });
    h.inv = []; h.gold = 0;
    // the others react: a death scares everyone (a lot up close, more in a crypt, cowards most), less than a scare trap does,
    // and it stays with them for a while (fear fades slowly when shaken). Veterans feel it too: it scales with courage.
    // 1.17 (author: "they know about each other in other rooms, e.g. when someone dies"): only the ones who see it (the same
    // place) react in full; the ones who only hear the death cry (14 steps, not through a Głusza) get the smaller fright and no
    // name; the rest learn later from someone who knows (perceiveThink: news), and the party's morale drops when the leader knows
    const d = { id: h.id, t: fl.time, crypt, knows: new Set(), x: h.tx, y: h.ty, room: h.room, hush: isRt(h.room, 'hush'), killer: kind === 'monster' ? h.killer : null }; (fl.deaths || (fl.deaths = [])).push(d);   // 1.18: where the body lies (Odnalezione ciało); 1.21: killer
    const echo = mods.farecho && isRt(h.room, 'grotto');   // 1.18 Niosące się echo: who hears a death in a Grota fears it like a witness
    const Lnow = leader();
    if (mods.lastGasp) alive().forEach(o => { if (o.room === h.room) addFear(o, mods.lastGasp * o.courage, null, 'death'); });   // Ostatnie tchnienie
    const nd = h.nemesis ? alive().find(o => !o.fleeing && !panicking(o) && !caged(o) && canSee(o, h)) : null;   // 1.23: a companion who sees a Nemezis fall
    if (nd) { say(nd, nameFill(pick(SAY.nemesisDown), h), 4, 2.4); fl.stats.nemesisDown = (fl.stats.nemesisDown || 0) + 1; }
    alive().forEach(o => {
      const near = canSee(o, h), hears = !near && canHearShout(o, h);
      if (!near && !hears) return;
      d.knows.add(o.id); if (near) sawAdd(o, ['blood']); if (o === Lnow && !d.morale) { d.morale = true; P.morale = Math.max(0.15, P.morale - 0.25); }
      const base = (near || echo ? Math.max(15 * o.R.panic, 0.12 * o.courage + 4) : 1.3 * Math.max(5 * o.R.panic, 0.05 * o.courage + 2) * (1 + mods.badnews)) * (crypt ? 2 : 1);   // v14: softer for rookies (was max(30 x panic, ...)); 1.18: Złe wieści x2 for one who only hears it, Niosące się echo
      o.shakenUntil = fl.time + (near ? 9 : 5);
      if (bondOf(o) === h) { griefOf(o, h, base, d, 0); return; }   // 1.21: his pair (he knows the voice too): grief, maybe a vow
      if (hears) {   // a cry from somewhere: no name, no fury
        if (Math.random() < 0.55) say(o, pick(SAY.deathHeard), 3, 2);
        const f1 = o.fear; addFear(o, base * (o.trait === 'coward' ? 1.5 : 1), null, 'death'); fl.stats.deathFear += Math.max(0, o.fear - f1);
        return;
      }
      // a brave one (and now and then a warrior) turns grief into fury instead of fear
      if (!o.fleeing && (o.trait === 'brave' || o.type === 'barbarian' || (o.type === 'warrior' && Math.random() < 0.3)) && startRage(o, 'death', h)) {
        fl.stats.revenge = (fl.stats.revenge || 0) + 1;
        addFear(o, base * 0.3, null, 'death');
        return;
      }
      if (o !== nd && Math.random() < 0.55) say(o, nameFill(pick(o.fleeing || goingOut() ? SAY.deathFlee : SAY.death), h), 4, 2.2);   // 1.05: no talk of revenge while running (1.23: nd said nemesisDown)
      const f0 = o.fear;
      addFear(o, base * (o.trait === 'coward' ? 1.5 : 1), null, 'death');
      fl.stats.deathFear += Math.max(0, o.fear - f0);
      if (near && o.fear - f0 >= 8) floatHero(o, 'Groza', '#c3b2ff', 12, -1.0);
    });
    if (P.leaderId === h.id) P.leaderId = -1;
    if (P.scoutId === h.id) P.scoutId = -1;
    if (P.scoutMate === h.id) P.scoutMate = -1;
    riseGhost(h);   // 1.18 Wstający umarli
  }
  // 1.18 Wstający umarli: a hero killed in a Krypta gets up as a ghost on your side, a real monster for the rest of the wave on the free
  // floor tile nearest the body. It is temp: no cost, no slot, no part of the dungeon's greed or the guild's count, and setupFl takes it
  // away before the next build (nothing back). At most 2 a wave.
  // 1.26: what a death sets off among the new elements
  function killHooks(h, kind) {
    const nb = Math.min(2, [...fl.items.values()].filter(b => b.type === 'bell' && !b.disabled).length);
    if (nb) {   // Dzwon żałobny: everyone alive hears the death (fobia hałasu); A Requiem: +0,5 Groza a hearer
      const req = [...fl.items.values()].some(b => b.type === 'bell' && !b.disabled && t3(b));
      alive().forEach(o => { addFear(o, 24 * nb * famK('bell'), 'bell'); if (req) addPts(0.5, 'fearPts', o); });
      const b = [...fl.items.values()].find(q => q.type === 'bell' && !q.disabled); if (b) { b.anim = 0.8; floatTile(b.x, b.y, 'Dzwon żałobny!', '#c9d4b0', 14, -1); }
      fl.stats.bellTolls = (fl.stats.bellTolls || 0) + 1;
    }
    if ((h.plague || 0) > 0 && (fl.risenZ || 0) < 2) riseZombie(h);   // Powstanie
    const k = h.killer;
    if (k && k.type === 'hound' && (h.fleeing || panicking(h))) { addPts(GZ.scare * mods.scareMult, 'scarePts', h); fl.stats.houndHunt = (fl.stats.houndHunt || 0) + 1; }   // Polowanie: a kill and an escape
    if (mods.undyingArmy && k && FAMILY_OF[k.type] === 'undead' && (fl.armyN || 0) < 3 && riseZombie(h, 'skeleton')) { fl.armyN = (fl.armyN || 0) + 1; fl.stats.armyRisen = (fl.armyN); }   // 1.26 Nieśmiertelna armia
    if (k && k.type === 'demon' && t3B(k)) run.bloodHunger = { w: run.wave + 1, n: ((run.bloodHunger && run.bloodHunger.w === run.wave + 1) ? run.bloodHunger.n : 0) + 3 };   // Głód krwi
    if (fl.items && [...fl.items.values()].some(w => w.type === 'warlord' && w.hp > 0 && t3B(w) && roomOf(w.x, w.y) === h.room)) dropItem(h, null, 2, false, { body: true });   // Grabież
  }
  // Powstanie: a Zarażony who dies gets up as your zombie for the rest of the wave (no slot, no cost; at most 2 a wave)
  function riseZombie(h, tp) {
    const R = fl.rooms[h.room], p = heroPos(h); if (!R || !R.tiles) return null;
    const free = R.tiles.filter(q => slotOf(q[0], q[1]) === 'floor' && walkable(q[0], q[1]) && !fl.items.has(key(q[0], q[1])));
    if (!free.length) return null;
    const t = free.reduce((a, q) => Math.hypot(q[0] + 0.5 - p.x, q[1] + 0.5 - p.y) < Math.hypot(a[0] + 0.5 - p.x, a[1] + 0.5 - p.y) ? q : a, free[0]);
    const z = { type: tp || 'zombie', x: t[0], y: t[1], cd: 1, anim: 0, disabled: false, hp: tp ? 90 : 120, max: tp ? 90 : 120, power: 1, shot: 0.5, flash: 0, preview: 0, gx: t[0] + 0.5, gy: t[1] + 0.5, lvl: 1, spent: 0, temp: true };
    fl.items.set(key(t[0], t[1]), z); if (!tp) fl.risenZ = (fl.risenZ || 0) + 1; fl.threatDirty = true;
    reaction(h, 'rise'); floatTile(t[0], t[1], 'Wstaje jako zombie!', '#a8c86a', 15, -0.9);
    return z;
  }
  function riseGhost(h) {
    if (!mods.risen || fl.phase !== 'raid' || !isRt(h.room, 'crypt') || (fl.risen || 0) >= 2) return null;
    const R = fl.rooms[h.room], p = heroPos(h); if (!R || !R.tiles) return null;
    const free = R.tiles.filter(q => slotOf(q[0], q[1]) === 'floor' && walkable(q[0], q[1]) && !fl.items.has(key(q[0], q[1])));
    if (!free.length) return null;
    const t = free.reduce((a, q) => Math.hypot(q[0] + 0.5 - p.x, q[1] + 0.5 - p.y) < Math.hypot(a[0] + 0.5 - p.x, a[1] + 0.5 - p.y) ? q : a, free[0]);
    const hp = ITEMS.ghost.hp, g = { type: 'ghost', x: t[0], y: t[1], cd: 1, anim: 0, disabled: false, hp, max: hp, power: 1, shot: 0.5, flash: 0, preview: 0, gx: p.x, gy: p.y, lvl: 1, spent: 0, temp: true };
    fl.items.set(key(t[0], t[1]), g); fl.risen = (fl.risen || 0) + 1; fl.stats.risen = (fl.stats.risen || 0) + 1; fl.threatDirty = true; tl('rs', h.id, t[0], t[1]);
    floatTile(t[0], t[1], 'Wstaje jako duch!', '#dfe6ff', 15, -0.9); burst(p.x, p.y, '#dfe6ff', 14);
    return g;
  }

  /* ================= loot, greed and hero gear ================= */
  function rollItem(r, pool) {
    const types = (pool || Object.keys(HITEMS).filter(t => !HITEMS[t].loot)).filter(t => !HITEMS[t].tool), total = types.reduce((a, t) => a + HITEMS[t].w, 0);   // 1.20: tools never come from loot
    let x = Math.random() * total, t = types[0];
    for (const k of types) { x -= HITEMS[k].w; if (x <= 0) { t = k; break; } }
    return { type: t, r, cdUntil: 0, charges: powerCharges(t, r) };
  }
  const itemPow = h => mods.itemPower * (h && h.cursed ? 0.5 : 1);   // Rdza and a curse weaken gear
  // 1.20 Udźwig: what he carries (kg) against what his class can carry; past 60% he slows down (at most to x0,84)
  const loadOf = h => h.inv.reduce((a, x) => a + (HITEMS[x.type].kg || 0), 0);
  const carryOf = h => (CARRY[h.type] || 10) + 0.3 * h.lvl;
  const burden = h => Math.max(0.84, 1 - 0.4 * Math.max(0, loadOf(h) / carryOf(h) - 0.6));
  // could he take this one from a friend: room in the pack (or it replaces one of a kind, not a cursed one) and the weight
  function canTake(o, x) {
    const U = HITEMS[x.type].use, same = (U === 'power' || U === 'gear' || U === 'tool') ? o.inv.find(y => y.type === x.type) : null;
    if (same && same.cursed) return false;
    if (!same && o.inv.length >= (o.invCap || 3)) return false;
    return loadOf(o) + (HITEMS[x.type].kg || 0) - (same ? HITEMS[same.type].kg || 0 : 0) <= carryOf(o);
  }
  // 1.20 Latarnia: lit (a ghost, a shade or bats may blow it out for 8 s), it keeps the fog off everyone within 2 tiles in his room
  const litLantern = h => !h.dead && !h.gone && h.inv.some(x => x.type === 'lantern' && fl.time >= (x.outUntil || 0));
  const lanternNear = h => alive().some(o => litLantern(o) && o.room === h.room && hdist(o, h) <= 2);
  const hasCrowbar = h => h.inv.some(x => x.type === 'crowbar');
  const potionHeal = it => Math.min(0.55, 1 - Math.pow(0.7, it.r));   // a potion heals 30% of max HP, a rare one 51%, never more than 55%
  const gearR = (h, t) => h.inv.reduce((a, x) => x.type === t ? Math.max(a, x.r) : a, 0);
  function itemLabel(it) { const H = HITEMS[it.type]; return H.name + (it.r > 1 ? ' (' + adj(H.g, it.r) + ')' : ''); }
  function itemAcc(it) { const H = HITEMS[it.type]; return (it.r > 1 ? (H.g === 'f' ? adj('fAcc', it.r) : adj(H.g, it.r)) + ' ' : '') + H.acc; }
  // What a piece of gear is worth to this hero right now (0 = no use for it): potions matter when hurt, a second power of a kind
  // only if it is better. 1.20: how well each kind fits his class (CLASS_FIT) instead of one favourite class a kind, so armour is
  // worth 3,1 to a warrior and 1 to a mage; a tool is worth 1,5 to one who has none of its kind.
  function itemValue(h, it) {
    const P = it.type, r = it.r, others = h.inv.filter(x => x !== it && x.type === P);
    if (P === 'potion') return r * (h.hp < 0.6 * h.max ? 2.5 : 1) / (1 + 0.7 * others.length);
    if (P === 'bomb') return 0.8 * r * fitOf('bomb', h.type) / (1 + 0.5 * others.length);
    if (HITEMS[P].tool) return others.length ? 0 : 1.5;
    const best = others.reduce((a, x) => Math.max(a, x.r), 0);
    return best ? Math.max(0, r - best) * 1.2 * fitOf(P, h.type) : r * 1.2 * fitOf(P, h.type);
  }
  // Something lands on the floor next to the hero (swapped out, or spilled from a body): the exact item, loot for anyone.
  // 1.20: dropAt puts it next to a spot (the mimic spitting out its belly), dropItem next to the hero, with his name on the pile.
  // A relic of yours (src relic, or a returner's trophy that was one) stays a relic; everything else a hero had is plain gear
  // (it used to glitter as a relic from power 3 on: a dead friend's bomb across the dungeon). opt.body: spilled from his body;
  // opt.knocked: knocked out of his hands (a crit, the Zbrojownia), he wants it back.
  function dropAt(x, y, item, gold, noGreed, opt) {
    const spots = [[x, y]].concat(DIRS8.map(d => [x + d[0], y + d[1]]));
    const s = spots.find(t => walkable(t[0], t[1]) && !fl.items.has(key(t[0], t[1])));
    if (!s) return false;
    const h = opt && opt.from;
    const type = gold ? 'loot' : item.type === 'potion' ? 'lpotion' : (item.src === 'relic' || (item.src === 'trophy' && item.wasRelic)) && item.r >= 3 ? 'loot3' : 'loot2';
    const pile = { type, x: s[0], y: s[1], cd: 0, anim: 0, disabled: false, hp: 0, max: 0, power: 1, shot: 0, flash: 0, preview: 0,
      dropped: true, spent: 0, item: item ? Object.assign({}, item, { cdUntil: 0 }) : null, gold: gold || 0, noGreed: !!noGreed,   // a power keeps the uses it has left
      from: h ? h.id : null, fromNm: h ? h.nm : null, fromFem: h ? h.female : null, fromWave: run.wave, body: h && opt.body ? h.id : null, knocked: h && opt.knocked ? h.id : null };
    fl.items.set(key(s[0], s[1]), pile);
    // at most 10 piles of spilled gear lie around (the oldest are trampled into the dirt). 1.20: plain piles go first, then the bodies
    // of earlier waves, the bodies of this wave last (never the pile just dropped)
    const d = [...fl.items.values()].filter(o => o.dropped);
    if (d.length > 10) {
      const rank = o => o.body == null ? 0 : (o.fromWave || 0) < run.wave ? 1 : 2;
      d.map((o, i) => [o, i]).filter(e => e[0] !== pile).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).slice(0, d.length - 10).forEach(e => fl.items.delete(key(e[0].x, e[0].y)));
    }
    return true;
  }
  function dropItem(h, item, gold, noGreed, opt) { return dropAt(h.tx, h.ty, item, gold, noGreed, Object.assign({ from: h }, opt || {})); }
  // A hero takes a piece of gear. One power, weapon and armour of a kind: a better one replaces the old one (left on the floor);
  // a full pack swaps out its least useful item if the new one is worth more, otherwise he leaves it.
  // 1.20: never past what he can carry (tooHeavy; a better one of the same kind weighs the same), and a cursed item is never let go:
  // not swapped for a better one, not the one thrown out of a full pack.
  function giveItem(h, item, quiet) {
    const H = HITEMS[item.type]; item.cdUntil = item.cdUntil || 0;
    const kg = x => HITEMS[x.type].kg || 0;
    const heavy = out => { if (loadOf(h) + kg(item) - (out ? kg(out) : 0) <= carryOf(h)) return false; if (!quiet) say(h, pick(SAY.tooHeavy), 1); fl.stats.tooHeavy = (fl.stats.tooHeavy || 0) + 1; return true; };
    if (H.use === 'power' || H.use === 'gear' || H.use === 'tool') {
      const cur = h.inv.find(x => x.type === item.type);
      if (cur) {
        if (cur.cursed) { if (!quiet) say(h, pick(SAY.cursedKeep), 2); return false; }
        if (cur.r >= item.r) { if (!quiet) say(h, pick(SAY.noNeed), 1); return false; }
        if (heavy(cur)) return false;
        h.inv.splice(h.inv.indexOf(cur), 1); dropItem(h, cur, 0, true);
        h.inv.push(item); fl.stats.swaps++; fl.stats.itemsGot++; tl('sw', h.id, cur.type + cur.r, item.type + item.r);
        if (!quiet) { say(h, pick(SAY.swap), 2); floatHero(h, itemLabel(cur) + ' → ' + itemLabel(item), '#c3b2ff', 12, -0.7); }
        return true;
      }
    }
    if (h.inv.length >= (h.invCap || 3)) {
      const v = itemValue(h, item);
      let low = -1, lv = 1e9; h.inv.forEach((o, i) => { if (o.cursed) return; const ov = itemValue(h, o); if (ov < lv) { lv = ov; low = i; } });
      if (low < 0 || lv >= v) { if (!quiet) say(h, pick(SAY.full), 1); return false; }
      if (heavy(h.inv[low])) return false;
      const old = h.inv.splice(low, 1)[0]; dropItem(h, old, 0, true);
      fl.stats.swaps++; tl('sw', h.id, old.type + old.r, item.type + item.r);
      if (!quiet) { say(h, pick(SAY.swap), 2); floatHero(h, itemLabel(old) + ' → ' + itemLabel(item), '#c3b2ff', 12, -0.7); }
    } else { if (heavy(null)) return false; if (!quiet) say(h, 'Mam ' + itemAcc(item) + '!', item.r >= 2 ? 3 : 2); }
    h.inv.push(item); fl.stats.itemsGot++;
    return true;
  }
  // Greed grows when they SEE treasure (each kind its own pull, a Sezam doubles it); picking it up adds a little more.
  // 1.20: a dead hero's things (it.body) pull half as much as gear, with no Sezam or Relikwiarz on top (LOOT_GREED.body); one who
  // knows of that death says whose they are (lootFallen); a new party may recognise the things of one who did not come back from an
  // earlier wave (60%, once a hero: predecessorGear and a little fear). it.firstBy: who saw it first this wave (claimScore).
  function noticeLoot(it, by) {
    if (by && it.firstBy == null && it.seenWave !== run.wave) it.firstBy = by.id;
    if (it.seenWave === run.wave) return;
    it.seenWave = run.wave;
    if (it.noGreed) return;   // their own old gear, just put down
    const kind = LOOT_KIND[it.type], r = ITEMS[it.type].rarity || 1, body = it.body != null;
    const g = body ? LOOT_GREED.body[0] * mods.greedMult / (1 + 0.15 * fl.stats.lootSeen) :
      LOOT_GREED[kind][0] * mods.greedMult * (isRt(roomOf(it.x, it.y), 'vault') ? 2 : 1) * (kind === 'gold' ? 1 + mods.goldDust : 1) * (kind === 'relic' && mods.reliquary ? 1.5 : 1) / (1 + 0.15 * fl.stats.lootSeen);
    const dg = addGreed(g * famK(it.type) * (dreamLoot(it) ? 1.5 : 1)); greedOrbs(it.x, it.y, dg); fl.stats.lootSeen++; tl('ls', it.x, it.y, r);   // 1.26: Runa rodu (Skarby)
    if (body) fl.stats.greedBody = (fl.stats.greedBody || 0) + dg;
    floatTile(it.x, it.y, 'Chciwość ×' + fmt2(fl.greed), '#f2b94b', 14, -0.6, 'greed');
    if (!by) return;
    sawAdd(by, itemTags(it));   // 1.17.1
    const dead = { nm: it.fromNm, female: it.fromFem };
    const d = body && it.fromWave === run.wave ? (fl.deaths || []).find(x => x.id === it.body) : null;
    const pred = body && it.fromNm && it.fromWave != null && it.fromWave < run.wave && !by.predSaid && !by.fleeing && !panicking(by) && Math.random() < 0.6;
    sayNow(itemTags(it), () => {
      if (by.fleeing || by.crystal || panicking(by) || goingOut()) { if (r >= 2) say(by, pick(SAY.lootFlee), 2); }   // 1.05: running for his life, he has no joy for gold
      else if (pred) {
        by.predSaid = true; say(by, nameFill(pick(SAY.predecessorGear), dead), 3); addFear(by, 0.05 * by.courage, null, 'death');
        fl.stats.predecessorSeen = (fl.stats.predecessorSeen || 0) + 1; tl('pr', by.id, it.x, it.y);
        alive().forEach(o => { if (o !== by && earshot(o, by)) sawAdd(o, ['gear']); });
      } else if (d && d.knows.has(by.id)) { say(by, nameFill(pick(SAY.lootFallen), dead), 2); fl.stats.lootFallen = (fl.stats.lootFallen || 0) + 1; }
      else say(by, kind === 'potion' ? pick(SAY.lootPotionSeen) : pick(SAY['loot' + Math.min(3, r)]), r >= 2 ? 3 : 2);
    });
  }
  // Picking it up: coins go to the purse, the rest is a real item (or the exact one that was dropped). No use or no room: it stays.
  // 1.26 Złoty sen: loot in the heart's room or a room next to it (not a body)
  const dreamLoot = it => !!mods.goldenDream && it.body == null && fl.heart && (roomOf(it.x, it.y) === fl.heart.room || nbrRooms(fl.heart.room).includes(roomOf(it.x, it.y)));
  function pickup(h, it) {
    const kind = LOOT_KIND[it.type], r = ITEMS[it.type].rarity || 1, k = key(it.x, it.y);
    if (lootBanned(h, it)) return false;   // 1.21: the loser of a quarrel over it (or everyone, when the leader stopped it) for 10 s
    if (it.type === 'bait') { noticeLoot(it, h); baitBite(h, it); return false; }   // 1.26 Przynęta: it bites, it stays
    if (dreamLoot(it)) { noticeLoot(it, h); h.lootMemo.set(k, { go: false, t: fl.time + 120 }); h.state = 'wait'; h.timer = 3; h.path = []; floatTile(it.x, it.y, 'Złoty sen: nie da się podnieść', '#f2b94b', 12, -0.6); fl.stats.dreamTries = (fl.stats.dreamTries || 0) + 1; return false; }   // 1.26 Złoty sen
    // 1.20: a body's things: he kneels and goes through them (updateHero: the 'loot' state, then bodyLoot), not while running or
    // in a panic, and not again over a body he found nothing on
    if (it.body != null) {
      const m = h.lootMemo.get(k);
      if ((m && m.body && !m.go && m.t > fl.time) || exiting(h) || panicking(h) || caged(h) || mateBody(h, it)) return false;   // 1.21: never his pair's
      h.state = 'loot'; h.timer = h.type === 'thief' ? 0.5 : 1.0; h.dur = h.timer; h.lootIt = it; h.path = [];
      return false;
    }
    noticeLoot(it, null);
    let item = null;
    if (it.item) item = Object.assign({}, it.item);
    else if (kind === 'potion') item = { type: 'potion', r: 1, cdUntil: 0 };   // (powers rolled from gear come with their uses)
    else if (kind === 'gear' || kind === 'cursed') item = rollItem(2, GEAR_POOL);
    else if (kind === 'relic' && !mods.reliquary) item = rollItem(3, Object.keys(HITEMS));
    if (item && !it.item) Object.assign(item, { src: kind === 'relic' ? 'relic' : 'loot', owner: h.id, ownerNm: h.nm, ownerFem: h.female, wave: run.wave });   // 1.20: from your dungeon
    if (item && kind === 'potion' && !it.dropped && mods.tainted) item.tainted = true;   // 1.18 Zepsute mikstury: only a potion from your loot, not from their gear
    if (item && kind !== 'cursed' && !giveItem(h, item, it.knocked === h.id)) {   // he leaves it lying (and will not come back for it)
      h.lootMemo.set(k, { go: false, t: fl.time + 60 });
      // 1.20: what he rolled stays there (it used to vanish, and the next one rolled anew): everyone knows what lies there now,
      // and one who sees a friend it would suit tells him (lootOffer)
      if (!it.item) it.item = Object.assign({}, item);
      lootOffer(h, it, item);
      return false;
    }
    fl.items.delete(k);
    // 1.20: his own, knocked out of his hands (a crit, the Zbrojownia): he has it back, and it is not loot (no greed, no Groza;
    // in 1.19 it vanished and gave nothing; counted as loot it gave the replays +15-25% Esencja)
    if (it.knocked === h.id) { fl.party.queueSay.push({ id: h.id, text: pick(SAY.gearBack), at: fl.time + 0.2, prio: 2 }); fl.stats.gearBack = (fl.stats.gearBack || 0) + 1; tl('lp', h.id, 0, 'back'); replanAll(); return true; }
    h.loot++;
    quarrelWon(h, k);   // 1.21
    if (h.offerKey === k) { fl.stats.lootOfferTaken = (fl.stats.lootOfferTaken || 0) + 1; h.offerKey = null; }   // 1.20: he took what he was offered
    const kg = LOOT_GREED[kind];
    // 1.03: taking it pulls less each time, like seeing it (Odwrotna chciwość x3 on top), and the greed that stays for good
    // grows ever slower: in replays of the author's 223-relic run both kept climbing without end
    greedOrbs(it.x, it.y, addGreed(kg[1] * mods.greedMult * mods.pickGreed / (1 + 0.15 * fl.stats.loot))); tl('lp', h.id, r, kind);
    if (!it.dropped) { const keep = 0.5 * kg[0] * mods.greedMult / (1 + 0.5 * run.greedKeep); run.greedKeep += keep; fl.stats.greedKept = (fl.stats.greedKept || 0) + keep; }   // part of its pull stays for good
    const pts = addPts(GZ.loot * r * depthMult(roomOf(it.x, it.y)), 'lootPts', h); fl.stats.loot++;
    floatTile(it.x, it.y, '+' + fmtE(pts) + ' łup', '#ff7a86', 16);
    sawAdd(h, itemTags(it));
    if (kind === 'gold') { const n = Math.max(1, it.gold || 1); h.gold += n; fl.stats.goldPicked += n; sayNow(['gold'], () => say(h, pick(h.gold >= 3 ? SAY.goldHeavy : SAY.gold), 2)); }
    if (kind === 'cursed') curse(h, item);
    else if (item && item.cursed) { curse(h, null); fl.stats.cursePassed = (fl.stats.cursePassed || 0) + 1; }   // 1.20: a cursed item curses the next one who takes it
    if (mods.lootTrap > 0) damage(h, mods.lootTrap * r, LOOTTRAP);
    fl.items.forEach(mm => { if (mm.type === 'mimic' && t3B(mm) && !mm.disabled && mm.cd <= 0 && Math.max(Math.abs(mm.x - it.x), Math.abs(mm.y - it.y)) <= 1 && !h.dead) { floatTile(mm.x, mm.y, 'Zachłanny!', '#d8434f', 14, -1); fire(mm, 2, { lock: [h] }); } });   // 1.26 Mimik B: Zachłanny
    if (kind === 'relic' && !it.dropped) gainEssence(null, 4, 'essDrop');
    vaultSnap(it, h);   // 1.18 Zatrzask sezamu
    updateTray();   // 1.03: the price of that loot drops again
    replanAll();
    return true;
  }
  // 1.18 Zatrzask sezamu: loot taken in a Sezam sets off every ready trap in that room (the decoy's alarm, without using it up),
  // at most once in 6 s a room, so two treasures side by side make one alarm
  function vaultSnap(it, h) {
    const r = roomOf(it.x, it.y);
    if (!mods.vaultsnap || fl.phase !== 'raid' || r < 0 || !isRt(r, 'vault')) return 0;
    const at = fl.snapAt || (fl.snapAt = {}); if (fl.time - (at[r] == null ? -99 : at[r]) < 6) return 0;
    at[r] = fl.time; let n = 0;
    floatTile(it.x, it.y, 'Zatrzask!', '#ffd27a', 16, -1); shake = Math.max(shake, 0.12);
    fl.items.forEach(o => { if (TRAPS[o.type] && slotRoom(o.type, o.x, o.y) === r && !o.disabled && o.cd <= 0 && fire(o, 1)) n++; });
    fl.stats.vaultSnaps = (fl.stats.vaultSnaps || 0) + 1; tl('vs', h.id, r, n);
    return n;
  }
  // 1.20 Ciało do przeszukania: after kneeling by a body he takes from its piles (this one and the dead one's others within 1,5
  // tiles) every coin and each item worth 0,6 to him that fits in his pack; the rest stays. A kit or guild item of the dead one
  // becomes src body (the card says whose it was; a returner keeps it). Counted like loot (greed of a body, Groza of rarity 2).
  function bodyLoot(h, it) {
    const got = [], from = { nm: it.fromNm, female: it.fromFem };
    const piles = [...fl.items.values()].filter(o => o.body != null && o.body === it.body && o.fromWave === it.fromWave && isLoot(o.type) && Math.hypot(o.x - it.x, o.y - it.y) <= 1.5);
    piles.forEach(o => {
      if (o.gold) { h.gold += o.gold; fl.stats.goldPicked += o.gold; got.push({ type: 'gold', n: o.gold }); }
      else if (o.item && itemValue(h, o.item) >= 0.6) {
        const x = Object.assign({}, o.item); if (x.src === 'kit' || x.src === 'guild') x.src = 'body';
        if (!giveItem(h, x, true)) return;
        got.push(x);
        if (x.cursed) { curse(h, null); fl.stats.cursePassed = (fl.stats.cursePassed || 0) + 1; }
      } else return;
      fl.items.delete(key(o.x, o.y)); h.loot++;
      greedOrbs(o.x, o.y, addGreed(LOOT_GREED.body[1] * mods.greedMult * mods.pickGreed / (1 + 0.15 * fl.stats.loot)));
      const pts = addPts(GZ.loot * 2 * depthMult(roomOf(o.x, o.y)), 'lootPts', h); fl.stats.loot++;
      floatTile(o.x, o.y, '+' + fmtE(pts) + ' łup', '#ff7a86', 16);
    });
    // what he left there he has looked at: he does not come back to kneel over it (60 s)
    piles.concat([it]).forEach(o => { if (fl.items.get(key(o.x, o.y)) === o) h.lootMemo.set(key(o.x, o.y), { go: false, t: fl.time + 60, body: true }); });
    if (got.length) {
      quarrelWon(h, key(it.x, it.y));   // 1.21
      sawAdd(h, ['gear']); floatHero(h, 'Zabiera rzeczy ' + nameGen(from), '#c9c2b8', 12, -0.7);
      if (mods.lootTrap > 0) damage(h, mods.lootTrap * 2, LOOTTRAP);
      vaultSnap(it, h); updateTray(); replanAll();
    }
    onLootDead(h, it.body, got, it);
    return got.length;
  }
  // 1.20: a bomb in a burning pack goes off: it hurts him (40 x power), half that to anyone within 1,5 tiles, a scare to 3 tiles
  function bombCook(h, b) {
    h.inv.splice(h.inv.indexOf(b), 1);
    const k = Math.sqrt(Math.min(4, b.r)), p = heroPos(h);
    const near = alive().filter(o => o !== h && hdist(o, h) <= 1.5), scared = alive().filter(o => hdist(o, h) <= 3);
    damage(h, 40 * S.dmg * k, BURN);
    near.forEach(o => damage(o, 20 * S.dmg * k, BURN));
    scared.forEach(o => addFear(o, 10, null, 'blast'));
    burst(p.x, p.y, '#ffb35c', 16); shake = Math.max(shake, 0.15); floatHero(h, 'Bomba w plecaku!', '#ffb35c', 14, -0.9);
    fl.stats.bombCook = (fl.stats.bombCook || 0) + 1; tl('bx', h.id);
  }
  // 1.20: the item he gets with a curse carries it (item.cursed): it curses whoever takes it after him (pickup, bodyLoot)
  function curse(h, item) {
    if (item) item.cursed = true;
    h.cursed = true; fl.stats.cursed++; tl('cu', h.id);
    if (item) giveItem(h, item, true);   // he keeps the (cursed) gear if he has room
    sawAdd(h, ['cursed']); sayNow(['cursed', 'gear'], () => say(h, pick(SAY.cursedPick), 3, 2.2)); floatHero(h, 'Klątwa!', '#b48cff', 15, -0.8);
    const p = heroPos(h); burst(p.x, p.y, '#b48cff', 12);
  }
