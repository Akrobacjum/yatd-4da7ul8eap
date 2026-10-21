
  /* ================= heroes: the party brain ================= */
  // The party has a leader (the most experienced) who picks where to go, calls retreats and the push for the crystal.
  // Each hero has a job: the thief scouts and disarms, the priest heals, exorcises and blesses, the mage burns monsters
  // and webs, the warrior charges monsters and raises his shield. They only know what they have seen or heard,
  // and rookies make the mistakes rookies make.
  function replanAll() { if (fl) fl.heroes.forEach(h => { h.needPlan = true; }); }
  const byId = id => fl.heroes.find(h => h.id === id);
  const tIdx = h => h.ty * WW + h.tx;
  const hdist = (a, b) => { const p = heroPos(a), q = heroPos(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const panicking = h => fl.time < h.panicUntil;
  // 1.16 (author: they can get lost, which pays Groza as before, but they can also split up on purpose, e.g. to scout, which
  // pays slower): the scout, his mate, and a rookie on his own errand left the party on purpose. While they are away from the
  // rest (4,5+ tiles) they pay GZ.split a second and fear 1/s instead of 'alone' (0,09 and 2,5/s). The way back counts too,
  // until they stand with the party again. Getting lost on the way (fog, no way, a roll on the way back) ends it: then he pays
  // as a lost one. Traps that hunt the lonely (eyes, the shade) still see him alone, he is.
  const onScout = h => !!h && !!fl.party && (h.id === fl.party.scoutId || h.id === fl.party.scoutMate);
  const splitting = h => onScout(h) || inG2(h) || (h.wanderUntil > fl.time && h.wanderTarget >= 0 && isFrontierTile(h.wanderTarget));
  function startSplit(h, why) {
    if (!h || h.split) return;
    h.split = true; fl.stats.splits = (fl.stats.splits || 0) + 1; tl('rz', h.id, why);
    floatHero(h, 'Zwiad', '#9fe0cf', 12, -0.7);
  }
  const goingOut = () => { const p = fl.party.plan; return p === 'flee' || p === 'leave' || p === 'escape'; };
  // 1.17 (author: "the heroes know about each other in other rooms"): each hero acts on the plan he knows (h.plan). The leader
  // and whoever can see or hear him have the party's plan (perceiveThink, every party tick); a shout (flight, escape) reaches
  // 14 steps; the rest keep what they last knew until they rejoin, or until nobody is left to rejoin.
  const planOf = h => h.plan || fl.party.plan;
  // 1.17: the party knows where the heart is once the leader does: from the tavern or the prophecy (heartBy unset), or the one
  // who saw it is with him (or he stands in the heart's room himself); until then they go on exploring
  const heartP = () => fl.heartKnown && fl.party.heartSaid;
  function heartTold(L) {
    if (fl.heartBy === undefined || fl.heartBy === null || !L || L.id === fl.heartBy) return true;
    const by = byId(fl.heartBy);
    return (by && !by.dead && !by.fled && (canSee(L, by) || canHear(L, by))) || roomOf(L.tx, L.ty) === fl.heart.room;
  }
  const goingOutH = h => { const p = planOf(h); return p === 'flee' || p === 'leave' || p === 'escape'; };
  const exiting = h => h.fleeing || h.crystal || h.goHome || goingOutH(h);   // 1.17: goHome = outvoted at the council, goes home alone
  // 1.17: what a hero can perceive. He SEES what happens in his own place (samePlace), HEARS a voice in earshot, and a SHOUT (a
  // death cry, a cage, "Kryształ!", "Odwrót!") carries 14 steps; nothing is heard into or out of a Głusza, and a Kamień wyjec
  // swallows shouts (as for the lost call, answerLost).
  const hushAt = h => h.room >= 0 && isRt(h.room, 'hush');
  const canSee = (o, v) => !o.gone && !v.gone && samePlace(o, v);
  const canHear = (o, v) => !o.gone && !v.gone && !hushAt(o) && !hushAt(v) && earshot(o, v);
  function stepsWithin(a, b, n) {   // walking steps from a to b (any walkable or door tile), searched up to n steps
    const s = a.ty * WW + a.tx, g = b.ty * WW + b.tx; if (s === g) return true;
    const dep = new Map([[s, 0]]), q = [s];
    for (let i = 0; i < q.length; i++) {
      const c = q[i], d = dep.get(c); if (d >= n) continue;
      const cx = c % WW, cy = (c / WW) | 0;
      for (const v of DIRS) { const x = cx + v[0], y = cy + v[1], j = y * WW + x; if (dep.has(j) || !passable(x, y)) continue; if (j === g) return true; dep.set(j, d + 1); q.push(j); }
    }
    return false;
  }
  // 1.18: Grube mury: a shout carries 8 steps instead of 14; Niosące się echo: a shout from a Grota carries 2 times as far (3 times with
  // a second copy), with Grube mury 16
  const shoutRange = v => (mods.thickwalls ? 8 : 14) * (mods.farecho && v.room >= 0 && isRt(v.room, 'grotto') ? 1 + mods.farecho : 1);
  function canHearShout(o, v) {
    if (canHear(o, v)) return true;
    const R = shoutRange(v);
    if (o.gone || v.gone || hushAt(o) || hushAt(v) || inB('howl', o.room) || inB('howl', v.room) || Math.hypot(o.tx - v.tx, o.ty - v.ty) > R) return false;
    return stepsWithin(v, o, R);
  }
  const perceives = (o, v, shout) => o === v || canSee(o, v) || (shout ? canHearShout(o, v) : canHear(o, v));
  const groupOf = L => alive().filter(o => o === L || (!o.lost && !caged(o) && (canSee(o, L) || canHear(o, L))));   // the leader's group: who decides and counts
  // 1.17.1 (author: "a warrior said those flames would haunt his dreams, and there was no fire anywhere on the board; let them
  // talk about the rooms, effects, monsters, loot and traps they see or have seen"): each hero remembers what he has seen or
  // felt this wave (h.saw, the tags of LINE_NEEDS in the config): the effect, komnata and buildings of every room he stands in,
  // the heart, the monsters, loot, scare props and known traps in sight (sawSweep each party tick, sawRoom the moment he walks
  // in), a trap going off in sight or on him and what wounded him (sawItem), someone bleeding or dying next to him ('blood'),
  // and a death he knows of ('death', from fl.deaths). A line that mentions a thing (LINE_TAGS) is said only by a hero who
  // knows it, otherwise another line of the same set, or none (fitLine, in say()). A line about the thing of the moment
  // (SAY_NOW: the loot he looks at, the trap that went off, the monster he goes for, what just hurt him) must name the right
  // one: the traps, monsters and loot it mentions must be the ones of the moment, not just ones he saw before.
  const TAG_CAT = {};
  ['fire', 'blast', 'spikes', 'arrows', 'gate', 'trapdoor', 'cage', 'web', 'mimic', 'portrait', 'mirror', 'coffin', 'bones', 'eyes', 'musicbox', 'creak',
    'goblin', 'archer', 'spider', 'ogre', 'shaman', 'ghost', 'shade', 'bats', 'monster', 'gold', 'potion', 'gear', 'relic', 'cursed'].concat(Object.keys(BUILDINGS)).forEach(t => { TAG_CAT[t] = 1; });
  let SAY_NOW = null;
  function sayNow(tags, f) { const prev = SAY_NOW; SAY_NOW = tags && tags.length ? new Set(tags) : null; try { return f(); } finally { SAY_NOW = prev; } }
  // what a thing is to the eye (fired: what it does when it goes off: burning arrows, a fiery keg)
  function itemTags(it, fired) {
    const t = it && it.type; if (!t) return [];
    if (MONSTERS[t]) return [t, 'monster'];
    if (t === 'lcursed' || (it.item && it.item.cursed)) return it.cursedKnown ? ['cursed', 'gear'] : ['gear'];   // it looks like gear till a priest feels the curse (1.20: a cursed item left by a hero too)
    if (LOOT_KIND[t]) return [LOOT_KIND[t]];
    if (t === 'powder') return fired && t3(it) ? ['blast', 'fire'] : ['blast'];
    if (t === 'arrows' && fired && mods.arrowBurn) return ['arrows', 'fire'];
    if (TRAPS[t] || BUILDINGS[t]) return [t];
    return [];
  }
  const sawOf = h => h.saw || (h.saw = new Set());
  function sawAdd(h, tags) { if (h && tags && tags.length) { const s = sawOf(h), at = h.sawAt || (h.sawAt = new Map()); tags.forEach(t => { if (!s.has(t)) { s.add(t); at.set(t, fl.time); } }); } }
  // the things to talk about: the two he saw last and one more from earlier (each with its SAY.saw lines)
  function sawTalk(h) {
    if (!h.saw || !SAY.saw) return [];
    const at = h.sawAt || new Map(), ts = [...h.saw].filter(t => SAY.saw[t]).sort((a, b) => (at.get(b) || 0) - (at.get(a) || 0));
    const pickT = ts.slice(0, 2).concat(ts.length > 2 ? [pick(ts.slice(2))] : []);
    return pickT.flatMap(t => SAY.saw[t]);
  }
  // the hero card: what he has seen this wave, in the order he saw it
  const SAW_NAME = { blast: 'wybuch prochu', gold: 'monety', potion: 'mikstura', gear: 'ekwipunek', relic: 'relikwia', cursed: 'przeklęty łup', heartSeen: 'serce lochu', blood: 'krew' };
  function sawName(t) {
    if (SAW_NAME[t]) return SAW_NAME[t];
    if (t.startsWith('k_')) { const K = KIND_INFO[t.slice(2)]; return K ? K.name.toLowerCase() : ''; }
    const I = ITEMS[t] || ITEMS['r_' + t]; return I ? I.name.toLowerCase() : '';
  }
  function sawNames(h) { const at = h.sawAt || new Map(); return [...(h.saw || [])].filter(t => t !== 'monster').sort((a, b) => (at.get(a) || 0) - (at.get(b) || 0)).map(sawName).filter(Boolean).join(', '); }
  const itemSpot = it => MONSTERS[it.type] && it.gx !== undefined ? [Math.floor(it.gx), Math.floor(it.gy)] : [it.x, it.y];
  const itemRooms = it => { if (TRAPS[it.type]) return servedRooms(it.type, it.x, it.y); const p = itemSpot(it); return [roomOf(p[0], p[1])]; };
  // in a room he sees his room (a door thing from both its rooms); in a corridor, a few steps around him
  function seesSpot(h, x, y, rooms) { const r = roomOf(h.tx, h.ty); return r >= 0 ? rooms.includes(r) : Math.hypot(h.tx - x, h.ty - y) <= 3.5; }
  function sawItem(it, also, tags) {
    tags = tags || itemTags(it, true); if (!tags.length) return;
    const p = itemSpot(it), rooms = itemRooms(it);
    fl.heroes.forEach(h => { if (!h.dead && !h.fled && !h.gone && ((also && also.includes(h)) || seesSpot(h, p[0], p[1], rooms))) sawAdd(h, tags); });
  }
  function sawNear(h, tags) {   // he and the ones who see him (burning, bleeding, dying)
    fl.heroes.forEach(o => { if (!o.dead && !o.fled && !o.gone && (o === h || canSee(o, h))) sawAdd(o, tags); });
  }
  // what can be seen of a thing: a monster alive, loot, a building, a scare prop, the fire (it burns in the open), a shut gate,
  // and a trap they know of; a hidden trap only when it goes off (sawItem in fireRaw)
  function sawVisible(it) {
    const t = it.type;
    if (MONSTERS[t]) return it.hp > 0;
    if (t === 'decoy') return !!it.alarmed;   // it looks like spikes till the alarm
    if (LOOT_KIND[t] || BUILDINGS[t]) return true;
    if (!TRAPS[t]) return false;
    if (t === 'gate') { const d = fl.doors.get(key(it.x, it.y)); return !!it.detected || !!(d && d.closedUntil > fl.time); }
    if (t === 'musicbox' || t === 'creak') return false;   // these are heard when they go off, not seen
    return !!it.detected || !!SCARE[t] || t === 'fire';
  }
  function sawRoomTags(h, r) {
    if (r < 0 || !fl.rooms[r]) return;
    const R = fl.rooms[r], a = [];
    if (R.rt) a.push(R.rt); if (R.rk) a.push('k_' + R.rk);
    if (r === fl.heart.room) a.push('heartSeen');
    for (const b in BUILDINGS) if (b !== 'decoy' && inB(b, r)) a.push(b);
    sawAdd(h, a);
  }
  function sawRoom(h, r) {
    sawRoomTags(h, r);
    fl.items.forEach(it => { if (sawVisible(it) && itemRooms(it).includes(r)) sawAdd(h, itemTags(it)); });
  }
  function sawSweep() {
    const hs = fl.heroes.filter(h => !h.dead && !h.fled && !h.gone); if (!hs.length) return;
    hs.forEach(h => sawRoomTags(h, roomOf(h.tx, h.ty)));
    fl.items.forEach(it => {
      if (!sawVisible(it)) return;
      const tags = itemTags(it); if (!tags.length) return;
      const p = itemSpot(it), rooms = itemRooms(it);
      hs.forEach(h => { if (seesSpot(h, p[0], p[1], rooms)) sawAdd(h, tags); });
    });
  }
  let LINE_TAGS = null, TAG_RX = null;
  function lineTags(t) {
    if (!LINE_TAGS) {
      LINE_TAGS = new Map(); TAG_RX = [];
      const add = (x, tag) => { const a = LINE_TAGS.get(x) || []; if (!a.includes(tag)) a.push(tag); LINE_TAGS.set(x, a); };
      for (const [tag, lines] of Object.entries(LINE_NEEDS)) lines.forEach(x => add(x, tag));
      for (const [tag, lines] of Object.entries(SAY.saw || {})) [].concat(lines).forEach(x => add(x, tag));   // talk about a thing needs the thing
      LINE_TAGS.forEach((a, x) => { if (/\{[navg]\}/.test(x)) TAG_RX.push([new RegExp('^' + x.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[navg]\}/g, '.+?').replace(/[{}]/g, '\\$&') + '$'), a]); });
    }
    const a = LINE_TAGS.get(t); if (a) return a;
    for (const [rx, aa] of TAG_RX) if (rx.test(t)) return aa;
    return null;
  }
  function knowsTag(h, t) {
    if (t === 'death') return (fl.deaths || []).some(d => d.knows.has(h.id));
    if ((t === 'gold' && h.gold > 0) || (t === 'cursed' && h.cursed)) return true;   // what he carries
    return !!(SAY_NOW && SAY_NOW.has(t)) || !!(h.saw && h.saw.has(t));
  }
  function lineOk(h, t) {
    const tg = lineTags(t); if (!tg) return true;
    return tg.every(x => SAY_NOW && TAG_CAT[x] ? SAY_NOW.has(x) : knowsTag(h, x));
  }
  const linePool = k => { if (!k) return null; const i = k.indexOf(':'), v = i < 0 ? SAY[k] : SAY[k.slice(0, i)] && SAY[k.slice(0, i)][k.slice(i + 1)]; return v ? [].concat(v) : null; };
  function fitLine(h, text, pool) {
    let t = text;
    if (!lineOk(h, t)) {
      const st = fl.stats, k = lineKey(t);
      const alt = (pool || linePool(k) || []).filter(x => !/\{[navg]\}/.test(x) && lineOk(h, x));
      if (!alt.length) { st.lineDrop = (st.lineDrop || 0) + 1; const dk = st.lineDropK || (st.lineDropK = {}); dk[k || '?'] = (dk[k || '?'] || 0) + 1; return null; }
      st.lineSwap = (st.lineSwap || 0) + 1; t = pick(alt);
    }
    if (SAY_NOW) { const tg = lineTags(t); if (tg) sawAdd(h, tg.filter(x => SAY_NOW.has(x))); }   // what he talks about now, he knows of
    return t;
  }
  const okLines = (h, a) => a.filter(x => lineOk(h, x));
  const heartGoals = () => fl.heartAdj.map(t => t[1] * WW + t[0]);
  const exitGoals = () => fl.breach ? [fl.ent.y * WW + fl.ent.x, fl.breach.y * WW + fl.breach.x] : [fl.ent.y * WW + fl.ent.x];
  const exitGoal = () => { const g = exitGoals(); return g.length > 1 && planB ? (nearestOf(planB, g) >= 0 ? nearestOf(planB, g) : g[0]) : g[0]; };
  let planB = null;   // the current hero's path search, so the nearest way out can be picked
  // 1.19 Rozłam (author: "plan rozbudowy bohaterów: rozłam"): the party can break in two. A second group (P.g2: its leader,
  // its members, its own plan and goal) explores on its own and joins the rest again when they meet; it is born at a fork
  // (one of them will not go the leader's way and 1-2 like him follow), at the council (2+ who wanted more stay while the
  // rest go home), or from a quarrel (a mutiny, a sulk: a group of one). Its members are away on purpose (h.split: Groza of
  // a scout, GZ.split) until they are back with the others. One second group at a time.
  const inG2 = h => !!(h && fl.party && fl.party.g2 && fl.party.g2.ids.has(h.id));
  function g2Leader() {
    const P = fl.party, G = P.g2; if (!G) return null;
    let L = byId(G.leaderId);
    if (!L || L.dead || L.fled || L.gone || L.lost || caged(L) || panicking(L) || L.goHome || L.fleeing || !G.ids.has(L.id)) {
      const was = L, c = alive().filter(o => G.ids.has(o.id) && !o.lost && !caged(o) && !panicking(o) && !o.goHome && !o.fleeing);
      if (!c.length) { g2End('gone'); return null; }
      c.sort((a, b) => b.rank - a.rank); L = c[0]; G.leaderId = L.id;
      if (was && G.plan !== 'regroup') {   // the group lost its head: back to the others
        G.plan = 'regroup'; c.forEach(o => { o.plan = 'regroup'; o.needPlan = true; });
        const t = pick((aloneNow(L) ? SOLO.g2LeaderDown : null) || SAY.g2LeaderDown);
        P.queueSay.push({ id: L.id, text: nameFill(t, was), at: fl.time + 0.4, prio: 3, late: 4 });
      }
    }
    return L;
  }
  const groupLeaderOf = h => (inG2(h) && g2Leader()) || leader();
  function g2Start(D, joiners, plan, target, why) {
    const P = fl.party; if (P.g2 || !D) return false;
    const all = [D].concat(joiners);
    P.g2 = { leaderId: D.id, ids: new Set(all.map(o => o.id)), plan, target, born: fl.time, why, until: fl.time + (why === 'sulk' || why === 'mutiny' ? 25 : 40), said: false };
    all.forEach(o => { o.plan = plan; o.needPlan = true; o.split = false; startSplit(o, 'rift'); o.wanderUntil = -1; o.lootKey = null; });
    const st = fl.stats; st.rifts = (st.rifts || 0) + 1; st['rift_' + why] = (st['rift_' + why] || 0) + 1; tl('rf', D.id, all.length, why);
    if (why === 'rescue') setHint(D.nm[0] + ' nie zostawi przyjaciela: wraca po niego sam' + (D.female ? 'a' : '') + '.');   // 1.21
    else if (why !== 'sulk') setHint(why === 'council' ? 'Rozłam: część drużyny zostaje i szuka dalej.' : 'Rozłam: ' + all.length + (all.length > 1 ? ' bohaterów idzie' : ' idzie') + ' własną drogą. Wrócą, gdy spotkają resztę.');
    floatHero(D, why === 'rescue' ? 'Nie zostawię!' : why === 'sulk' || why === 'mutiny' ? 'Obrażon' + (D.female ? 'a' : 'y') : 'Rozłam', '#e8b26a', 13, -0.9);   // 1.21: rescue
    return true;
  }
  function g2End(why) {
    const P = fl.party, G = P.g2; if (!G) return;
    P.g2 = null;
    alive().forEach(o => { if (G.ids.has(o.id)) { o.needPlan = true; if (why === 'merge') o.plan = P.plan; } });
    const st = fl.stats; st['g2end_' + why] = (st['g2end_' + why] || 0) + 1; st.g2Time = (st.g2Time || 0) + (fl.time - G.born); if (why === 'merge') st.merges = (st.merges || 0) + 1; tl('rj', why, Math.round(fl.time - G.born));
  }
  // where the second group goes: an opening of its own, away from where the others are going
  function g2Target(L2, Lm) {
    const P = fl.party, b = bfs(L2.x, L2.y, { known: true, avoid: L2.R.avoid }), away = P.target >= 0 ? P.target : (Lm ? tIdx(Lm) : -1);
    let best = -1, bs = 1e9;
    frontier().forEach(f => {
      const d = b.dist[f]; if (d < 0) return;
      const ax = away >= 0 ? Math.hypot(f % WW - away % WW, ((f / WW) | 0) - ((away / WW) | 0)) : 0;
      const sc = d - 0.6 * Math.min(ax, 12) + Math.random() * 2; if (sc < bs) { bs = sc; best = f; }
    });
    return best;
  }
  function g2Think(Lm) {
    const P = fl.party, G = P.g2; if (!G) return;
    const L2 = g2Leader(); if (!L2 || !P.g2) return;
    const mem = alive().filter(o => G.ids.has(o.id));
    mem.forEach(o => { if (o !== L2 && (canSee(o, L2) || canHear(o, L2)) && o.plan !== G.plan) { o.plan = G.plan; o.needPlan = true; } });
    if (!Lm) return;
    // the others run or go home and they hear it: they go too (a group that chose to stay at the council stays)
    if (goingOut() && G.why !== 'council' && G.why !== 'sulk' && G.plan !== 'rescue' && mem.some(o => canHearShout(o, Lm))) { g2End('out'); return; }   // 1.21: not before the rescue is done
    if (G.plan === 'rescue') { rescueThink(G, L2); return; }   // 1.21
    if (fl.fearless && fl.storm && G.plan !== 'assault' && mem.some(o => canHearShout(o, Lm))) { G.plan = 'assault'; mem.forEach(o => { o.plan = 'assault'; o.needPlan = true; }); }
    // they have to part first (out of each other's sight), else after 20 s it comes to nothing
    const near = mem.some(o => alive().some(m => !G.ids.has(m.id) && !m.lost && !caged(m) && samePlace(o, m)));
    if (!G.apart) { if (!near) G.apart = true; else if (fl.time - G.born > 20) { g2End('fizzle'); return; } }
    // meeting again
    if (G.apart && fl.time - G.born > 8 && mem.some(o => alive().some(m => !G.ids.has(m.id) && !m.lost && !caged(m) && samePlace(o, m) && (canSee(o, m) || canHear(o, m))))) {
      const sulk = G.why === 'sulk' || G.why === 'mutiny';
      const a = sulk ? L2 : pick(mem), b2 = alive().find(m => !G.ids.has(m.id) && !m.lost && !caged(m) && samePlace(a, m));
      if (sulk) P.queueSay.push({ id: a.id, text: pick(SAY.sulkBack), at: fl.time + 0.2, prio: 2, late: 3 });
      else {
        P.queueSay.push({ id: a.id, text: pick(SAY.mergeG2), at: fl.time + 0.2, prio: 2, late: 3 });
        if (b2 && Math.random() < 0.7) P.queueSay.push({ id: b2.id, text: pick(SAY.mergeReply), at: fl.time + 1.4, prio: 2, late: 4 });
      }
      g2End('merge'); return;
    }
    // time is up, or nothing left to explore: back to the others
    if (G.plan === 'explore' && (fl.time > G.until || !frontier().length)) { G.plan = 'regroup'; mem.forEach(o => { o.plan = 'regroup'; o.needPlan = true; }); }
    if (G.plan === 'assault' && !fl.heartKnown) G.plan = 'explore';
    if (G.plan === 'explore' && (G.target < 0 || !isFrontierTile(G.target) || tIdx(L2) === G.target)) { G.target = g2Target(L2, Lm); L2.needPlan = true; if (G.target < 0) G.plan = 'regroup'; }
    if (!G.said && fl.time - G.born > 5 && mem.length > 1 && !talking(L2)) { G.said = true; say(L2, pick(SAY.g2Lead), 2); }
  }
  // the goal of the second group's leader
  function g2Goal(h, heartGoal) {
    const G = fl.party.g2, Lm = leader();
    if (G.plan === 'assault') return heartGoal();
    if (G.plan === 'regroup') return Lm && Lm !== h ? tIdx(Lm) : -1;
    return G.target;
  }
  // 1.19 Bunt: when things go badly (a death the leader knows of, heavy wounds or fear, low morale) and the leader pushes on,
  // a braver or higher-ranked one challenges him in front of the group. They take sides (the scared and the hurt with the
  // challenger, the brave and the lower ranks with the leader); the winner leads. A proud loser may storm off on his own.
  function mutinyThink(L, grp, dt, avgHp, fearR) {
    const P = fl.party;
    if (P.mutinyDone || P.council || P.g2 || goingOut() || fl.fearless || !L || grp.length < 3 || fl.time < 30 || P.morale > 0.55 || grp.some(talking) || fl.time - P.lastTalkAt < 6) return;
    const dead = (fl.deaths || []).some(d => d.knows.has(L.id));
    if (!dead && avgHp > 0.55 && fearR < 0.45) return;
    if (Math.random() > dt * 0.1) return;
    const C = grp.filter(o => o !== L && !o.lost && !o.crystal && o.hp > 0.5 * o.max && o.fear < 0.5 * o.courage && (o.rank > L.rank || (o.trait === 'brave' && o.rank >= L.rank) || (L.rank === 0 && o.rank >= 1)))
      .sort((a, b) => (b.rank - a.rank) || ((b.trait === 'brave') - (a.trait === 'brave')))[0];
    if (!C) return;
    P.mutinyDone = true; P.lastTalkAt = fl.time;
    const rest = grp.filter(o => o !== L && o !== C);
    const side = o => { const fr = clamp(o.fear / Math.max(1, o.courage), 0, 1.5); return 0.4 + fr + (1 - o.hp / o.max) + (o.trait === 'coward' || o.trait === 'careful' ? 0.5 : 0) - (o.trait === 'brave' ? 0.5 : 0) + 0.25 * (C.rank - L.rank) + (Math.random() - 0.5) * 0.8 > 0.9; };
    let forC = C.rank >= 2 ? 1.25 : 1, forL = 1.5; const lines = [[C, nameFill(pick(SAY.mutinyStart), L)]];
    rest.forEach((o, i) => { const s = side(o); if (s) forC += 1; else forL += 1; if (i < 3) lines.push([o, pick(s ? SAY.mutinyBack : SAY.mutinyStay)]); });
    const win = forC > forL, proud = L.trait === 'brave' || L.trait === 'greedy' || L.hunter || L.rank >= 2;
    const st = fl.stats; st.mutinies = (st.mutinies || 0) + 1; tl('mu', C.id, L.id, win ? 1 : 0);
    P.convoNot = { key: 'mutinyStart', ids: new Set([L.id]) };
    if (win) {
      const refuse = proud && Math.random() < 0.6;
      lines.push([L, pick(refuse ? SAY.mutinyRefuse : SAY.mutinyYield)], [C, pick(SAY.mutinyWin)]);
      if (refuse) lines.push([L, pick(SAY.sulkOff)]);
      st.mutinyWins = (st.mutinyWins || 0) + 1;
      talkAs(2, lines, L);
      P.leaderId = C.id; P.lastL = C.id;
      if (fearR > 0.55 || avgHp < 0.45 || C.trait === 'coward' || C.trait === 'careful') P.mutinyHome = fl.time + Math.max(3, P.talkUntil - fl.time);   // they go home once it is said
      if (refuse) { P.sulkAfter = { id: L.id, at: P.talkUntil }; }
    } else {
      lines.push([C, pick(SAY.mutinyLose)]);
      const sulk = (C.trait === 'brave' || C.trait === 'greedy') && Math.random() < 0.45;
      if (sulk) { lines.push([C, pick(SAY.sulkOff)]); P.sulkAfter = { id: C.id, at: 0 }; }
      talkAs(2, lines, L);
      if (sulk) P.sulkAfter.at = P.talkUntil;
    }
    floatHero(C, 'Bunt!', '#e8b26a', 14, -0.9);
  }
  // 1.19: a restless one (greedy, brave, a treasure hunter, a barbarian; not a rookie) tired of the leader's pace says he goes his
  // own way, now and then, when there is more than one way into the unknown; 1-2 like him go too
  function riftThink(L, grp, dt) {
    const P = fl.party;
    if (P.g2 || P.council || P.plan !== 'explore' || fl.fearless || goingOut() || P.scoutId >= 0 || grp.length < 3 || fl.time < 20 || (fl.stats.rifts || 0) >= 2 || grp.some(talking) || fl.time - P.lastTalkAt < 8) return;
    const rv = bondType(L, 'rival') ? bondOf(L) : null;   // 1.21: the leader's rival is a likelier dissenter (x1,5), restless or not
    const restless = o => o.trait === 'greedy' || o.trait === 'brave' || o.hunter || o.type === 'barbarian' || o === rv;
    const cands = grp.filter(o => o !== L && restless(o) && o.rank >= 1 && !o.crystal && !o.lost && o.hp > 0.5 * o.max && o.fear < 0.5 * o.courage);
    if (Math.random() > dt * 0.025 * (P.morale < 0.6 ? 1.5 : 1) * (cands.includes(rv) ? 1.5 : 1)) return;
    const D = cands.includes(rv) ? rv : cands.sort(() => Math.random() - 0.5)[0];
    if (!D) return;
    const t = g2Target(D, L); if (t < 0 || (P.target >= 0 && Math.hypot(t % WW - P.target % WW, ((t / WW) | 0) - ((P.target / WW) | 0)) < 6)) return;
    const like = o => restless(o) || o.rank === 0;
    const joiners = grp.filter(o => o !== L && o !== D && !o.crystal && !caged(o) && !o.lost && like(o)).sort(() => Math.random() - 0.5).slice(0, Math.min(2, grp.length - 3));
    P.lastTalkAt = fl.time;
    if (!g2Start(D, joiners, 'explore', t, 'restless')) return;
    const lines = [[D, nameFill(pick(SAY.riftStart), L)]]; joiners.forEach(j => lines.push([j, pick(SAY.riftJoin)])); lines.push([L, nameFill(pick(SAY.riftLeader), D)]);
    P.convoNot = { key: 'riftStart', ids: new Set(joiners.map(o => o.id)) };
    talkAs(1.4, lines, L);
  }
  // a sulker leaves when the quarrel has been said (a group of one, he comes back when he meets them)
  function sulkThink(Lm) {
    const P = fl.party;
    if (P.mutinyHome && fl.time >= P.mutinyHome) { P.mutinyHome = 0; if (!goingOut() && !fl.fearless) { goHome(leader()); fl.stats.mutinyHomes = (fl.stats.mutinyHomes || 0) + 1; } }
    const S = P.sulkAfter; if (!S || fl.time < S.at) return;
    P.sulkAfter = null;
    const h = byId(S.id); if (!h || h.dead || h.fled || h.gone || h.lost || caged(h) || P.g2 || h.crystal) return;
    if (P.leaderId === h.id) return;
    if (g2Start(h, [], fl.heartKnown && (h.trait === 'brave' || h.hunter) ? 'assault' : 'explore', -1, 'sulk')) { fl.stats.sulks = (fl.stats.sulks || 0) + 1; if (aloneNow(h)) say(h, pick(SOLO.sulkOff), 2); }
  }
  function leader() {
    const P = fl.party;
    let L = byId(P.leaderId);
    if (!L || L.dead || L.fled || L.gone || L.lost || L.goHome || panicking(L) || caged(L) || (L.fleeing && P.plan !== 'flee') || inG2(L)) {
      const c = alive().filter(o => !o.lost && !o.goHome && !panicking(o) && !caged(o) && !(o.fleeing && P.plan !== 'flee') && !inG2(o));
      if (!c.length && P.g2 && alive().some(inG2)) { g2End('last'); return leader(); }   // 1.19: only the second group is left: it is the party now
      const away = o => onScout(o) || o.split ? 1 : 0;   // 1.17: one off on his own errand takes the lead only if nobody else can
      c.sort((a, b) => (away(a) - away(b)) || (b.rank - a.rank) || (LEADER_ORDER.indexOf(a.type) - LEADER_ORDER.indexOf(b.type)));
      L = c[0] || alive()[0] || null;
      P.leaderId = L ? L.id : -1;
    }
    return L;
  }
  function partySay(k, prio, who) {
    const P = fl.party;
    if (fl.time - (P.lastSay[k] || -99) < 5) return false;
    P.lastSay[k] = fl.time; say(who || leader(), pick(SAY[k]), prio); return true;
  }
  // 1.13 (author: they froze wherever they stood, in other rooms and on traps, while the party talked): a talk is for the
  // ones in the same place as the one who starts it (the same room, or a few steps away in a corridor); the rest go on with
  // what they were doing. Two groups can talk at the same time. h.talkUntil = till when this one stands and talks.
  const samePlace = (a, b) => { const ra = roomOf(a.tx, a.ty); return (ra >= 0 && ra === roomOf(b.tx, b.ty)) || Math.hypot(a.tx - b.tx, a.ty - b.ty) <= 3.5; };
  function talkGroup(c) {
    const P = fl.party;
    if (!c || c.lost || caged(c)) return [];
    return [c].concat(alive().filter(h => h !== c && !h.lost && !panicking(h) && !caged(h) && !h.fleeing && !onScout(h) && !exiting(h) && samePlace(c, h)));
  }
  const talking = h => fl.time < (h.talkUntil || -1);
  // 1.13: where a hero may stand still (talking, waiting, resting): not where the party knows of danger, not where a trap
  // just got him, not on anything of yours (a trap, loot, a monster), not at the heart
  const unsafeAt = (h, x, y) => fl.danger[y * WW + x] > 0 || (!!h.ouch && fl.time < h.ouch.until && h.ouch.tiles.has(y * WW + x));
  const standOk = (h, x, y) => walkable(x, y) && !unsafeAt(h, x, y) && !fl.items.has(key(x, y)) && !(x === fl.heart.x && y === fl.heart.y);
  // a hero who stands still somewhere unsafe walks to a good tile (at most 3 steps, the one nearest the leader; one who rests
  // stays in his room, so the rest does not walk out of it; none: he stays)
  function toSafety(h) {
    if (h.nx !== null || isExitTile(h.x, h.y) || standOk(h, h.x, h.y)) return false;
    const s0 = h.y * WW + h.x, prev = new Map([[s0, -1]]), q = [s0], dep = new Map([[s0, 0]]), r0 = h.state === 'rest' ? roomOf(h.x, h.y) : -1;
    // the good tiles within 3 steps; of those the one nearest the leader, so stepping off a trap never splits the party
    const L = leader(), near = [], withL = L && L !== h && samePlace(h, L), rL = L ? roomOf(L.tx, L.ty) : -1;
    const byL = (x, y) => !withL || (rL >= 0 && roomOf(x, y) === rL) || Math.hypot(x - L.tx, y - L.ty) <= 3.5;   // one standing with the leader stays with him
    for (let qi = 0; qi < q.length && q.length < 120; qi++) {
      const i = q[qi], cx = i % WW, cy = (i / WW) | 0;
      if (i !== s0 && standOk(h, cx, cy) && !heroBlock(h, cx, cy) && (r0 < 0 || roomOf(cx, cy) === r0) && byL(cx, cy)) near.push(i);
      if (dep.get(i) >= 3) continue;
      for (const d of DIRS) {
        const nx = cx + d[0], ny = cy + d[1], j = ny * WW + nx;
        if (prev.has(j) || !passable(nx, ny) || heroBlock(h, nx, ny)) continue;
        const g = fl.items.get(key(nx, ny)); if (g && MONSTERS[g.type] && !DRIFT[g.type] && g.hp > 0) continue;
        prev.set(j, i); dep.set(j, dep.get(i) + 1); q.push(j);
      }
    }
    if (!near.length) return false;
    const far = i => (L && L !== h ? Math.hypot(i % WW - L.x, ((i / WW) | 0) - L.y) : 0) + dep.get(i) * 0.5;
    const goal = near.reduce((m, i) => far(i) < far(m) ? i : m, near[0]);
    const way = []; for (let k = goal; k !== s0; k = prev.get(k)) way.unshift([k % WW, (k / WW) | 0]);
    h.path = way; h.toSafe = true; h.state = 'walk'; fl.stats.toSafety = (fl.stats.toSafety || 0) + 1;
    return true;
  }
  // 1.17 (author: after 2 minutes not a rigid retreat or charge: let them decide, maybe together, by talking it over): the
  // council at the end of patience (opened by becomeImpatient, p3_flow.js). It waits for a quiet moment (at most 4 s, then it
  // cuts a talk short), every hero standing with the leader votes by his state and character, the leader sums it up (his vote
  // counts 1,5, an elite's 1,25), and when the last line has been said the decision takes effect. An outvoted hero who wanted
  // to go home may go home alone (scared, hurt or a coward: more likely).
  const COUNCIL_LINE = { home: 'voteHome', storm: 'voteStorm', more: 'voteMore' };
  function councilVote(h, opts) {
    const fr = clamp(h.fear / Math.max(1, h.courage), 0, 1.5), hp = h.hp / h.max, t = h.trait, P = fl.party, sc = {};
    sc.home = 0.9 + 1.8 * fr + 1.4 * (1 - hp) + (t === 'coward' ? 1.4 : t === 'careful' ? 0.4 : 0) + ((h.gold || 0) >= 2 ? 0.4 : 0) + (fl.time < h.shakenUntil ? 0.5 : 0);
    sc.storm = 0.6 + (t === 'brave' ? 1 : t === 'greedy' ? 0.5 : t === 'coward' ? -0.9 : 0) + (h.type === 'barbarian' ? 0.6 : 0) + (h.boss === 'champion' || h.hunter ? 0.8 : 0) +
      (hp > 0.6 ? 0.5 : 0) + 0.2 * h.rank - 1.4 * fr + (P.plan === 'assault' ? 0.4 : 0);
    sc.more = 0.5 + (heartP() ? 0 : 0.7) + (t === 'greedy' ? 0.8 : t === 'brave' ? 0.2 : 0) + (h.hunter ? 0.6 : 0) - (hp < 0.4 ? 0.6 : 0) - fr +
      0.6 * mods.onemore * (t === 'greedy' || h.hunter ? 2 : 1);   // 1.18 Jeszcze chwila (the greedy and the treasure hunters twice)
    let best = opts[0], bv = -1e9;
    opts.forEach(k => { const v = sc[k] + Math.random() * 0.8; if (v > bv) { bv = v; best = k; } });
    return best;
  }
  function councilThink(L) {
    const P = fl.party, C = P.council;
    if (goingOut() || fl.ending !== null || fl.fearless || !L) { P.council = null; return; }   // they ran (or the wave ended) meanwhile
    if (C.stage === 'wait') {
      if (fl.time - C.t0 > 8) { goHome(L); return; }   // no way to gather them (the leader lost or caged): home, as before 1.17
      let g = talkGroup(L);
      if (g.some(talking)) { if (fl.time - C.t0 < 4) return; g.forEach(h => { h.talkUntil = fl.time; }); }
      g = g.filter(o => o === L || (!o.crystal && !exiting(o) && !panicking(o)));
      const opts = ['home'].concat(heartP() ? ['storm'] : [], P.councilMore ? [] : ['more']);
      const votes = new Map(g.map(o => [o, councilVote(o, opts)])), tally = {};
      g.forEach(o => { const v = votes.get(o); tally[v] = (tally[v] || 0) + (o === L ? 1.5 : o.rank >= 2 ? 1.25 : 1); });
      let res = votes.get(L); opts.forEach(k => { if ((tally[k] || 0) > (tally[res] || 0)) res = k; });
      const others = g.filter(o => o !== L).sort(() => Math.random() - 0.5).slice(0, 4);
      const lines = [[L, pick(SAY.councilOpen)]];
      others.forEach(o => lines.push([o, pick(SAY[COUNCIL_LINE[votes.get(o)]])]));
      if (votes.get(L) !== res) lines.push([L, pick(SAY.councilGiveIn)]);   // outvoted, the leader gives in
      lines.push([L, pick(SAY[res === 'home' ? 'decideHome' : res === 'storm' ? 'decideStorm' : 'decideMore'])]);
      C.leave = []; let grumbles = 0;
      others.forEach(o => {
        const v = votes.get(o); if (v === res) return;
        const fr = clamp(o.fear / Math.max(1, o.courage), 0, 1), hp = o.hp / o.max;
        if (v === 'home' && Math.random() < Math.min(0.85, 0.2 + (o.trait === 'coward' ? 0.35 : 0) + 0.3 * fr + (hp < 0.35 ? 0.25 : 0) + (C.leave.length ? 0.2 : 0))) {   // 1.19: easier with one already going
          C.leave.push(o.id); lines.push([o, C.leave.length > 1 ? nameFill(pick(SAY.homeTogether), byId(C.leave[0])) : pick(SAY.goHomeAlone)]);
        }
        else if (grumbles < 2 && Math.random() < 0.6) { grumbles++; lines.push([o, pick(SAY[v === 'home' ? 'outvotedHome' : v === 'storm' ? 'outvotedStorm' : 'outvotedMore'])]); }
      });
      // 1.19: going home, but 2+ who wanted more (or the storm) stay together and go on as a second group
      if (res === 'home' && !P.g2 && alive().length >= 4) for (const v of ['storm', 'more']) {
        const mino = g.filter(o => o !== L && votes.get(o) === v && !C.leave.includes(o.id) && !o.crystal && o.hp > 0.4 * o.max);
        if (mino.length >= 2 && Math.random() < (mino.some(o => o.trait === 'brave' || o.trait === 'greedy' || o.hunter) ? 0.65 : 0.35)) {
          C.rift = { ids: mino.slice(0, 3).map(o => o.id), plan: v === 'storm' && heartP() ? 'assault' : 'explore' };
          lines.push([mino[0], pick(v === 'storm' ? SAY.riftCouncilStorm : SAY.riftCouncilMore)]); break;
        }
      }
      if (!talkAs(2, lines, L)) return;   // nobody there (should not happen): try again next tick
      C.stage = 'talk'; C.res = res; C.endAt = P.talkUntil; C.votes = g.map(o => votes.get(o));
      P.waitUntil = Math.max(P.waitUntil, P.talkUntil);
      tl('cn', res, g.length, C.leave.length);
    } else if (fl.time >= C.endAt) councilDone(C, L);
  }
  function councilDone(C, L) {
    const P = fl.party, crew = alive();
    P.council = null;
    const st = fl.stats, k = 'council' + C.res[0].toUpperCase() + C.res.slice(1); st[k] = (st[k] || 0) + 1;
    if (C.res === 'more') {
      const more = 30 + 15 * mods.onemore;   // 1.18 Jeszcze chwila: 45 s
      P.councilMore = true; fl.patT = Math.min(fl.patT, S.waveTime - more);
      setHint('Narada: jeszcze chwila. Bohaterowie szukają dalej przez ' + more + ' s.');
    } else if (C.res === 'storm') {
      fl.fearless = true; fl.storm = true; P.plan = 'assault'; P.detour = null; tl('ip', 1);
      crew.forEach(h => { if (h.state === 'rest' || h.state === 'talk') h.state = 'walk'; h.needPlan = true; });
      setHint('Narada: szturm. Bohaterowie idą po kryształ i mniej uważają na pułapki.');
    } else {
      goHome(null); setHint('Narada: wracają do domu.');
      if (C.rift) { const m = C.rift.ids.map(byId).filter(o => o && !o.dead && !o.fled && !o.gone && !caged(o)); if (m.length >= 2 && g2Start(m[0], m.slice(1), C.rift.plan, -1, 'council')) setHint('Narada: wracają do domu, ale ' + m.length + ' zostaje i szuka dalej.'); }   // 1.19
    }
    if (C.res !== 'home') C.leave.forEach(id => {
      const o = byId(id);
      if (!o || o.dead || o.fled || o.gone || o.crystal || caged(o) || o === leader()) return;
      o.goHome = true; o.split = false; o.needPlan = true; if (o.state === 'rest' || o.state === 'talk') o.state = 'walk';
      st.goHome = (st.goHome || 0) + 1; tl('gh', o.id); floatHero(o, 'Wraca sam' + (o.female ? 'a' : ''), '#c9c2d8', 12, -0.8);
    });
  }
  // The party stops and talks it over: a few lines from different heroes, one after another.
  function talk(dur, lines, c) {
    const P = fl.party, g = talkGroup(c || leader());
    if (fl.fearless || goingOut() || !g.length || g.some(talking)) return null;
    const end = fl.time + Math.max(dur, talkLen(lines)); fl.stats.talks++;   // 1.10: they stand as long as it takes to say it, one after another
    g.forEach(h => { h.talkUntil = end; }); P.talkUntil = Math.max(P.talkUntil, end);
    P.queueSay = P.queueSay.concat(lines.map((t, i) => ({ id: g[i % g.length].id, text: t, at: fl.time + i * 0.65 })));
    return g;
  }
  // 1.05: the same, but each line has its speaker (null: anyone there). 1.13: a speaker who is not there says nothing.
  function talkAs(dur, lines, c) {
    const P = fl.party, g = talkGroup(c || leader());
    if (fl.fearless || goingOut() || !g.length || g.some(talking)) return null;
    const keep = lines.filter(l => !l[0] || g.includes(l[0]));
    const end = fl.time + Math.max(dur, talkLen(keep.map(l => l[1]))); fl.stats.talks++;
    g.forEach(h => { h.talkUntil = end; }); P.talkUntil = Math.max(P.talkUntil, end);
    let o = 0;   // 1.13: a line for "anyone" goes to someone other than the one who started it (alone he does not answer himself)
    keep.forEach((l, i) => { const who = l[0] || (g.length > 1 ? g[1 + (o++ % (g.length - 1))] : null); if (who) P.queueSay.push({ id: who.id, text: l[1], at: fl.time + i * 0.7 }); });
    return g;
  }
  // 1.13 (author: real conversations, not single bubbles): a line a hero says can start a short exchange (CONVO in the
  // config): a friend in earshot answers, the first one answers back, sometimes a third one chips in. The lines go through
  // the party's queue, so they come one after another like any talk. One exchange at a time, a few seconds of breath
  // between them; none while the party talks something over, in a Głusza, or with nobody calm enough to listen.
  let LINE_KEY = null;
  let LINE_RX = null;
  function lineKey(t) {   // which SAY key a line comes from ('trap:spikes' for the nested ones); built once
    if (!LINE_KEY) {
      LINE_KEY = new Map(); LINE_RX = [];
      const add = (x, k) => {
        if (!LINE_KEY.has(x)) LINE_KEY.set(x, k);
        // 1.17: a line with a name in it ({n} {a} {v} {g}) is said filled in: it is found by a pattern
        if (/\{[navg]\}/.test(x)) LINE_RX.push([new RegExp('^' + x.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[navg]\}/g, '.+?').replace(/[{}]/g, '\\$&') + '$'), k]);
      };
      for (const [k, v] of Object.entries(SAY)) {
        if (Array.isArray(v)) v.forEach(x => add(x, k));
        else for (const [s, a] of Object.entries(v)) [].concat(a).forEach(x => add(x, k + ':' + s));
      }
    }
    const k = LINE_KEY.get(t); if (k || !/\S/.test(t)) return k;
    for (const [rx, kk] of LINE_RX) if (rx.test(t)) return kk;
    return undefined;
  }
  function convoAfter(h, text) { const k = lineKey(text); if (k) convoStart(h, k); }
  const convoFill = (t, who) => t.replace(/\{([ABC]):([^|}]*)\|([^}]*)\}/g, (_, r, m, f) => who[r] && who[r].female ? f : m)
    .replace(/\{([ABC])([nav])\}/g, (_, r, c) => who[r] ? who[r].nm['nav'.indexOf(c)] : '');
  function convoStart(A, key) {
    const P = fl.party, why = w => { const s = fl.stats.convoNo || (fl.stats.convoNo = {}); s[w] = (s[w] || 0) + 1; return false; };
    if (!P || fl.phase !== 'raid' || fl.ending !== null) return false;
    if (fl.time < (P.convoT || 0)) return why('breath');
    if (talking(A)) return why('talk');
    if ((P.queueCur || []).concat(P.queueSay).some(q => { if (q === P.sayingQ || q.done) return false; const o = byId(q.id); return o && earshot(A, o); })) return why('queue');   // another exchange going on right there   // a talk or another exchange going on right there
    const base = key.split(':')[0], alias = CONVO_ALIAS[key], set = CONVO[key] || CONVO[alias] || CONVO[base];
    if (!set) return false;
    if (Math.random() > (CONVO_P[key] ?? CONVO_P[alias] ?? CONVO_P[base] ?? 0.5)) return why('luck');
    if (A.room >= 0 && isRt(A.room, 'hush')) return why('hush');
    const ex = P.convoNot && P.convoNot.key === base ? P.convoNot.ids : null;   // 1.19: the old leader does not comment on his own mutiny, a joiner on his own rift
    const ears = alive().filter(o => o !== A && !o.lost && !caged(o) && !inChaos(o) && !talking(o) && earshot(A, o) && !(ex && ex.has(o.id)));
    if (!ears.length) return why('alone');
    const is = (o, v) => !v || [].concat(v).includes(o);
    const knows = (o, t, r) => t.l.every(l => l[0] !== r || lineOk(o, l[1]));   // 1.17.1: each one only says what he has seen
    const opts = [];
    set.forEach(t => {
      const sp = new Set(t.l.map(l => l[0]));
      if (sp.has('A') && (A.gone || A.dead || A.fled)) return;
      if (!is(A.type, t.ac) || !is(A.trait, t.at) || !knows(A, t, 'A')) return;
      let Bs = ears.filter(o => is(o.type, t.b) && is(o.trait, t.bt) && (t.br === undefined || o.rank <= t.br) && (t.bv === undefined || o.rank >= t.bv) && knows(o, t, 'B'));
      if (sp.has('C')) Bs = Bs.filter(b => ears.some(o => o !== b && knows(o, t, 'C')));   // 1.21: a 3-voice exchange needs its C (it used to play without his lines)
      if (!Bs.length) return;
      opts.push({ t, Bs, w: (t.w || 1) * (t.b || t.bt || t.br !== undefined || t.bv !== undefined || t.ac || t.at ? 1.6 : 1) });   // the fitting ones first
    });
    if (!opts.length) return why('fit');
    let r = Math.random() * opts.reduce((a, o) => a + o.w, 0), pickO = opts[0];
    for (const o of opts) { r -= o.w; if (r <= 0) { pickO = o; break; } }
    const B = pick(pickO.Bs), C = pick(ears.filter(o => o !== B && knows(o, pickO.t, 'C'))) || null, who = { A, B, C };
    // all its lines are due at once (so nobody in earshot cuts in: othersWaiting), they come in order (the queue holds the
    // later ones till the earlier is said), and a line more than 3,5 s past its expected moment is stale: the exchange ends
    const t0 = Math.max(fl.time + 0.3, (A.saidUntil || 0) + SAY_GAP), cv = (P.convoN = (P.convoN || 0) + 1);   // from when the line that started it ends
    let at = t0;
    pickO.t.l.forEach(([s, tx]) => {
      const h = who[s]; if (!h) return;
      const text = convoFill(tx, who);
      P.queueSay.push({ id: h.id, text, at: t0, prio: 2, cv, late: at - t0 + 3.5 });
      at += readT(gtext(text, h.female)) + SAY_GAP + 0.1;
    });
    P.convoT = at + 1.5 + Math.random() * 2.5; fl.stats.convos = (fl.stats.convos || 0) + 1;
    return true;
  }
  // 1.12.1: the stop lasts the whole exchange (since 1.10 the lines come one after another) plus a breath (it used to be about half)
  const talkLen = lines => lines.reduce((a, t) => a + readT(t) + SAY_GAP, 0) + 0.6;
  // 1.12.1: when the party stops to talk it over, the ones further off come up to the leader (to a free tile at most 2 steps from
  // him) and everyone turns to him: a huddle, not a freeze
  function huddleUp(L) {
    if (!L || L.lost) return;
    const P = fl.party, taken = new Set([L.y * WW + L.x]);
    const crew = alive().filter(h => h !== L && talking(h) && !h.lost && !caged(h) && !h.fleeing && !panicking(h) && !onScout(h) && h.state !== 'fight' && h.state !== 'disarm' && h.state !== 'free' && h.state !== 'smash' && !exiting(h));   // 1.13: only the ones in this talk
    crew.sort((a, b) => hdist(a, L) - hdist(b, L)).forEach(h => {
      const k0 = (h.nx !== null ? h.ny : h.y) * WW + (h.nx !== null ? h.nx : h.x);
      if (Math.abs(h.x - L.x) + Math.abs(h.y - L.y) <= 2 && !taken.has(k0)) { taken.add(k0); h.huddleId = L.id; return; }
      if (h.nx !== null) return;   // mid-step: he turns to the leader when he stops
      const s0 = h.y * WW + h.x, prev = new Map([[s0, -1]]), q = [s0];
      let goal = -1;
      for (let qi = 0; qi < q.length && q.length < 220; qi++) {
        const i = q[qi], cx = i % WW, cy = (i / WW) | 0;
        if (i !== s0 && Math.abs(cx - L.x) + Math.abs(cy - L.y) <= 2 && !taken.has(i) && !isExitTile(cx, cy) && standOk(h, cx, cy)) { goal = i; break; }   // 1.13: not on a trap
        for (const d of DIRS) {
          const nx = cx + d[0], ny = cy + d[1], j = ny * WW + nx;
          if (prev.has(j) || !passable(nx, ny) || heroBlock(h, nx, ny)) continue;
          const g = fl.items.get(key(nx, ny)); if (g && MONSTERS[g.type] && !DRIFT[g.type] && g.hp > 0) continue;
          prev.set(j, i); q.push(j);
        }
      }
      if (goal < 0) { h.huddleId = L.id; return; }
      const way = []; for (let k = goal; k !== s0; k = prev.get(k)) way.unshift([k % WW, (k / WW) | 0]);
      if (way.length > 7) { h.huddleId = L.id; return; }
      taken.add(goal); h.path = way; h.huddle = true; h.huddleId = L.id; h.state = 'walk';
    });
  }
  function lootLevel(it) { return ITEMS[it.type].rarity || 0; }
  // Common loot is noticed from the same room, rare from the next one, legendary glitters across the dungeon.
  function lootSeen(it) {
    const cur = it.type === 'lcursed' || (it.item && it.item.cursed);   // 1.20: a cursed item a hero left
    if (it.seenWave === run.wave) { if (cur) checkCursed(it); return true; }
    const r = lootLevel(it), R = r === 3 ? 12 : r === 2 ? 7 : 5, ir = roomOf(it.x, it.y);
    const by = alive().find(h => (h.room === ir && fl.known[it.y * WW + it.x]) || (r >= 2 && Math.hypot(h.tx - it.x, h.ty - it.y) <= R) || (r === 1 && fl.known[it.y * WW + it.x] && Math.hypot(h.tx - it.x, h.ty - it.y) <= R));
    if (!by) return false;
    noticeLoot(it, by);
    if (cur) checkCursed(it);
    return true;
  }
  // An experienced priest (level 6+) feels the curse on a treasure close by and warns the others: nobody touches it.
  function checkCursed(it) {
    if (it.cursedKnown) return;
    const pr = alive().find(h => h.type === 'priest' && h.lvl >= 6 && !h.lost && !h.fleeing && Math.hypot(h.tx - it.x, h.ty - it.y) <= 6);
    if (!pr) return;
    it.cursedKnown = true; fl.stats.cursedSeen = (fl.stats.cursedSeen || 0) + 1; tl('cw', it.x, it.y);
    sayNow(['cursed', 'gear'], () => say(pr, pick(SAY.cursedWarn), 4, 2.2)); floatTile(it.x, it.y, 'Przeklęte!', '#b48cff', 14, -0.6);
    replanAll();
  }
  // Worth it? What the loot is worth to THIS hero (gold to the greedy, a potion to the wounded, gear he can use)
  // against the danger they know about on the way and around it.
  function lootDecision(h, it, b, idx) {
    if (it.cursedKnown || lootBanned(h, it) || mateBody(h, it)) return false;   // 1.21: a quarrel's 10 s, his pair's things
    const k = key(it.x, it.y), memo = h.lootMemo.get(k);
    if (memo && fl.time - memo.t < 8) return memo.go;
    const r = lootLevel(it), kind = LOOT_KIND[it.type], hurt = h.hp < 0.4 * h.max;
    let need = 1;
    if (kind === 'potion') need = hurt ? 3.2 : h.hp < 0.7 * h.max ? 1.6 : (h.inv.some(x => x.type === 'potion') ? 0.25 : 0.6);
    else if (kind === 'gold') need = h.type === 'thief' || h.trait === 'greedy' || h.hunter ? 1.6 : 1;
    else if (it.item) need = Math.min(2, itemValue(h, it.item) / Math.max(0.6, 1.2 * it.item.r));   // a dropped item: better than his own?
    if (h.offerKey === k) need = Math.max(need, 1.2);   // 1.20: a friend told him it is for him (lootOffer)
    if (it.knocked === h.id) need *= 1.5;   // 1.20: his own, knocked out of his hands: he wants it back
    if (it.item && need <= 0.05) { h.lootMemo.set(k, { go: false, t: fl.time }); return false; }
    let value = [0, 1, 2.6, 6][r] * need * h.T.greed * (h.rank === 0 ? 1.6 : h.rank === 1 ? 1 : 0.85) * (0.6 + 0.4 * greedRaw(fl.greed));   // 1.10: they judge by the raw greed (as greedy as before the curve)
    if (h.rank >= 2 && kind === 'gold' && h.type !== 'thief' && !h.hunter) value *= 0.3;   // elites do not stoop for small change...
    if (r >= 2) value *= 1 + 0.06 * (h.lvl - 1);   // ...but glory and rare treasure pull harder the better they are
    if (h.trait === 'greedy') value *= 1.8; else if (h.trait === 'careful') value *= 0.6;
    if (isRt(roomOf(it.x, it.y), 'vault')) value *= 1.5;   // Sezam
    if (it.body != null) {   // 1.20: a dead friend's things: one who knows of the death holds back (not the greedy), a priest more, a thief or a greedy one less
      const knows = it.fromWave === run.wave && (fl.deaths || []).some(d => d.id === it.body && d.knows.has(h.id));
      if (knows && h.trait !== 'greedy' && !h.hunter) value *= 0.7;
      if (h.type === 'priest' && !(kind === 'potion' && hurt)) value *= 0.5;
      if (h.type === 'thief' || h.trait === 'greedy' || h.hunter) value *= 1.2;
    }
    let risk = 0;
    pathFrom(b, idx).forEach(p => { risk += fl.danger[p[1] * WW + p[0]]; });
    risk *= 0.35;
    fl.items.forEach(m => { if (MONSTERS[m.type] && m.hp > 0 && fl.known[m.y * WW + m.x] && Math.hypot(m.x - it.x, m.y - it.y) <= 2.5) risk += 2.5; });
    risk += 2 * h.fear / h.courage + (hurt && kind !== 'potion' ? 2 : 0);
    if (it.knocked === h.id) risk *= 0.8;   // 1.20
    const nerve = Math.max(0.8, h.R.risk) * (h.trait === 'greedy' ? 1.3 : 1) * (kind === 'potion' && hurt ? 1.5 : 1);   // caution grows with experience, but never to zero; the wounded risk it for a potion
    const go = h.rank === 0 ? (value * 2 * nerve > risk || Math.random() < 0.7) : value * 2 * nerve > risk;
    h.lootMemo.set(k, { go, t: fl.time });
    if (!memo) {   // they think out loud
      fl.stats.lootWeighed = (fl.stats.lootWeighed || 0) + 1;
      if (go) {
        if (risk > 2) fl.stats.lootRisked++;
        say(h, kind === 'potion' ? pick(hurt ? SAY.lootPotionNeed : SAY.lootPotion) : pick(h.trait === 'greedy' ? SAY.lootGreedy : r === 3 ? SAY.lootLegend : h.rank === 0 ? SAY.lootRookie : risk > 2 ? SAY.lootGo : SAY['loot' + r]), 2);   // 1.17: a potion is not 'gold'
        const L = leader();   // the leader does not always like it
        if (L && L !== h && L.rank >= 1 && risk > 1.5 && Math.random() < 0.4 && earshot(L, h)) {
          // 1.17 (it was words only, 6.8 #11): a greedy one, a treasure hunter, a rookie or one going for a potion he needs answers
          // back and goes anyway; the rest give in and leave it (for 15 s)
          const defy = h.trait === 'greedy' || h.hunter || h.rank === 0 || (kind === 'potion' && hurt) || Math.random() < 0.25;
          fl.party.queueSay.push({ id: L.id, text: pick(SAY.lootStop), at: fl.time + 0.8 });
          fl.party.queueSay.push({ id: h.id, text: pick(defy ? SAY.lootReply : SAY.lootObey), at: fl.time + 1.8 });
          fl.stats.lootArgue = (fl.stats.lootArgue || 0) + 1;
          if (!defy) {
            fl.stats.lootObey = (fl.stats.lootObey || 0) + 1; h.lootMemo.set(k, { go: false, t: fl.time + 7 });
            h.obeyN = (h.obeyN || 0) + 1;   // 1.19: told twice to leave the loot, he may storm off on his own for a while
            const P = fl.party;
            if (h.obeyN >= 2 && h.trait !== 'careful' && h.trait !== 'coward' && !P.g2 && !P.sulkAfter && !h.crystal && Math.random() < 0.4) { P.queueSay.push({ id: h.id, text: pick(SAY.sulkOff), at: fl.time + 2.9, prio: 2, late: 3 }); P.sulkAfter = { id: h.id, at: fl.time + 3.6 }; }
            return false;
          }
        }
      } else {
        fl.stats.lootSkipped++;
        if (Math.random() < 0.6) say(h, pick(h.trait === 'careful' ? SAY.lootCareful : h.rank >= 2 && kind === 'gold' ? SAY.lootPetty : SAY.lootRisk), 2);
      }
    }
    return go;
  }
  // 1.20 Kto bierze łup: how much a hero should have this loot (what it is worth to him; for one nobody knows: a potion for the
  // wounded, coins for a thief or the greedy, anything for the greedy), +0,5 for the one who saw it first
  function claimScore(h, it) {
    const kind = LOOT_KIND[it.type], hurt = h.hp < 0.4 * h.max, greedy = h.trait === 'greedy' || h.hunter;
    const s = it.item ? itemValue(h, it.item) : kind === 'potion' ? (hurt ? 3 : 0.5) : kind === 'gold' ? (h.type === 'thief' || greedy ? 1.5 : 0.6) : 1 + (greedy ? 0.5 : 0);
    return s + (it.firstBy === h.id ? 0.5 : 0);
  }
  // another one has set out for it: one who needs it clearly more (+0,8), both close to it (8 steps), takes it over when a leader
  // of rank 1+ (neither of them) hears both and gives it to him; with no such leader two greedy ones become rivals (the hook for
  // the 1.21 quarrels; in 1.20 the first keeps it without a word)
  function lootReassign(h, cl, it, k, steps) {
    const P = fl.party;
    if (steps < 0 || steps > 8 || Math.hypot(cl.tx - it.x, cl.ty - it.y) > 8) return false;
    const L = groupLeaderOf(h);
    if (claimScore(h, it) >= claimScore(cl, it) + 0.8 && L && L !== h && L !== cl && L.rank >= 1 && !panicking(L) && earshot(L, h) && earshot(L, cl)) {
      P.lootClaim.set(k, h.id); cl.lootMemo.set(k, { go: false, t: fl.time + 7 }); cl.needPlan = true;
      P.queueSay.push({ id: L.id, text: nameFill(pick(SAY.lootAssign), h), at: fl.time + 0.3, prio: 2 });
      fl.stats.lootAssign = (fl.stats.lootAssign || 0) + 1; tl('qa', L.id, h.id, cl.id);
      return true;
    }
    if ((h.trait === 'greedy' || h.hunter) && (cl.trait === 'greedy' || cl.hunter)) onLootRival(h, cl, it, k);
    // 1.21: one who wants it (greedy, a treasure hunter, or the claimant's rival) quarrels over it; the winner has the claim
    if ((h.trait === 'greedy' || h.hunter || (bondOf(h) === cl && h.bond.type === 'rival')) && !lootBanned(h, it)) return quarrel(h, cl, it, k);
    return false;
  }
  // 1.20 (hook for 1.21: a quarrel over the loot): two greedy ones after the same thing, once a pair and a pile
  function onLootRival(a, b, it, k) {
    const P = fl.party, seen = P.rivalSeen || (P.rivalSeen = new Set()), sk = Math.min(a.id, b.id) + '|' + Math.max(a.id, b.id) + '|' + k;
    if (seen.has(sk)) return false;
    seen.add(sk); (P.lootRivals || (P.lootRivals = [])).push({ a: a.id, b: b.id, k, t: fl.time });
    fl.stats.lootRival = (fl.stats.lootRival || 0) + 1; tl('qr', a.id, b.id);
    return true;
  }
  // 1.20: he cannot use what he found (no need, no room, too heavy): a friend who sees him and whom it would suit (worth 1+) is
  // told, and goes for it (offerKey: lootDecision wants it; the lootMemo 'no' is gone)
  function lootOffer(h, it, item) {
    const P = fl.party, k = key(it.x, it.y);
    if (fl.phase !== 'raid' || !P) return false;
    const o = alive().filter(x => x !== h && inG2(x) === inG2(h) && canSee(x, h) && !x.lost && !caged(x) && !panicking(x) && !exiting(x) && canTake(x, item))
      .sort((a, b) => itemValue(b, item) - itemValue(a, item))[0];
    if (!o || itemValue(o, item) < 1.0) return false;
    say(h, pick(SAY.lootOffer), 2); o.lootMemo.delete(k); o.needPlan = true; o.offerKey = k;
    P.queueSay.push({ id: o.id, text: pick(SAY.lootOfferTake), at: fl.time + 1.0 });
    fl.stats.lootOffer = (fl.stats.lootOffer || 0) + 1; tl('qo', h.id, o.id);
    return true;
  }
  // 1.20 (hook for 1.21: looting the dead, a friend's objection): called after every search of a body, taken or not.
  // 1.21: one who sees him take a dead friend's things objects (lootDeadObject, {v} = the looter; the looter's lootDeadReply): the
  // dead one's pair always, a priest or a careful one who knows of that death half the time; it costs the party a little morale
  // (-0,05). His pair never loots him (mateBody).
  function onLootDead(h, deadId, items, it) {
    const P = fl.party, wave = it ? it.fromWave : run.wave;
    (P.lootedDead || (P.lootedDead = [])).push({ by: h.id, dead: deadId, wave, t: fl.time, n: items.length });
    if (!items.length) return;
    fl.stats.bodyLoot = (fl.stats.bodyLoot || 0) + items.length;
    const by = fl.stats.bodyLootBy || (fl.stats.bodyLootBy = {}); by[h.type] = (by[h.type] || 0) + items.length;
    tl('bl', h.id, deadId, items.length);
    if (Math.random() < 0.6) say(h, pick(SAY.lootDead), 2);   // alone: SOLO.lootDead (say)
    const d = wave === run.wave ? (fl.deaths || []).find(x => x.id === deadId) : null;
    const w = x => x !== h && !x.dead && !x.fled && !x.gone && canSee(x, h) && !panicking(x) && !caged(x) && !exiting(x) && !x.lost;
    const dead = d ? byId(deadId) : null, mate = dead && bondOf(dead) && w(bondOf(dead)) ? bondOf(dead) : null;   // ids are this wave's: only a death of this wave has a pair here
    const o = mate || (d && alive().find(x => w(x) && d.knows.has(x.id) && (x.type === 'priest' || x.trait === 'careful') && x.trait !== 'greedy' && !x.hunter));
    if (o && (o === mate || Math.random() < 0.5)) {
      P.queueSay.push({ id: o.id, text: nameFill(pick(SAY.lootDeadObject), h), at: fl.time + 1.2, prio: 2 }, { id: h.id, text: pick(SAY.lootDeadReply), at: fl.time + 2.4, prio: 2 });
      fl.stats.lootDeadObject = (fl.stats.lootDeadObject || 0) + 1; P.morale = Math.max(0.15, P.morale - 0.05); tl('ob', o.id, h.id);
    }
  }
  // 1.21 Więzi i dramaty (author's plan): some heroes come in pairs (makeBonds, p3): friends, siblings, rivals, a mentor and his
  // apprentice (h.bond = { type, id, role }). A bond shows in what they say (a word to the other early in the wave and now and
  // then in the small talk), in grief and revenge when one dies, in one who will not leave the other in a cage or lost, in the
  // mentor's eye on his apprentice, in a rival's jabs, in quarrels over loot and in bets. All of it only between two who see each
  // other; lines with {v} name the other one (never his gender).
  const BOND_KEY = { friend: 'bondFriend', sibling: 'bondSibling', rival: 'bondRival', mentor: 'bondMentor' };
  function bondOf(h) {   // the other one of his pair, whatever became of him (null: no bond, or not in the dungeon yet)
    const o = h && h.bond && fl ? fl.heroes[h.bond.id] : null;
    return o && o !== h && o.bond && o.bond.id === h.id ? o : null;
  }
  const bondType = (h, t) => !!bondOf(h) && h.bond.type === t;
  const calmFor = o => !!o && !o.dead && !o.fled && !o.gone && !o.lost && !caged(o) && !panicking(o) && !o.fleeing;
  // a line naming the other one ({v}); alone, its SOLO version (say() itself only swaps in SOLO lines without a name)
  const bondText = (h, k, o) => nameFill(pick(fl.phase === 'raid' && SOLO[k] && aloneNow(h) ? SOLO[k] : SAY[k]), o);
  const pairKey = (a, b) => Math.min(a.id, b.id) + '|' + Math.max(a.id, b.id);
  const mateBody = (h, it) => it.body != null && it.fromWave === run.wave && !!bondOf(h) && h.bond.id === it.body;
  const lootBanned = (h, it) => !!it.qBan && fl.time < it.qBan.until && (!it.qBan.ids || it.qBan.ids.includes(h.id));
  // a word to the other one (bondFriend... with his name) and, unless a talk starts from it, his answer (bondReply); the mentor
  // speaks to his apprentice, not the other way round. gap: seconds since that pair's last word. q: through the party's queue (the
  // first word of the wave: the door is full of talk, it waits for its turn; then the answer, 60%, or else a talk may start from
  // it), otherwise now (the small talk picks a silent moment) or not at all.
  function bondTalk(h, gap, q) {
    const o = bondOf(h), P = fl.party;
    if (!o || !calmFor(h) || !calmFor(o) || exiting(h) || exiting(o) || fl.fearless || (!q && talking(h)) || !canSee(h, o) || (h.bond.type === 'mentor' && h.bond.role !== 'mentor')) return false;
    const T = P.bondT || (P.bondT = {}), pk = pairKey(h, o);
    if (fl.time - (T[pk] == null ? -99 : T[pk]) < gap) return false;
    const n0 = P.convoN || 0, text = nameFill(pick(SAY[BOND_KEY[h.bond.type]]), o), rep = Math.random() < 0.6;
    P.convoNot = { key: BOND_KEY[h.bond.type], ids: new Set([o.id]) };   // the other one does not comment on what was said to him
    if (q) { P.queueSay.push({ id: h.id, text, at: fl.time + 0.2, prio: 2, late: 8 }); if (rep) P.queueSay.push({ id: o.id, text: pick(SAY.bondReply), at: fl.time + 0.4, prio: 2, late: 10 }); }
    else if (!say(h, text, 2, null, 'q')) return false;   // 'q': now or not at all
    else if ((P.convoN || 0) === n0 && rep) P.queueSay.push({ id: o.id, text: pick(SAY.bondReply), at: fl.time + 0.2, prio: 2, late: 4 });
    T[pk] = fl.time; fl.stats.bondLines = (fl.stats.bondLines || 0) + 1; tl('bk', h.id, o.id);
    return true;
  }
  // his pair died and he knows it (kill: he saw it or heard the cry; perceiveThink: told, or he found the body): the grief line
  // instead of the usual one (q: queued, after the one who told him). Friends, siblings, a mentor who lost his apprentice: half
  // as much fear again, or (a brave one, a barbarian, a warrior half the time) fury and a vow: 30 s against the monster that did
  // it (planHero) and +30% damage to monsters (vowK). The apprentice of a dead mentor: fear x1,5, and if he lives 20 s more he
  // grows up (+15% courage for the rest of the wave, bondThink). A rival: a short shock (half the fear).
  const GRIEF_KEY = { friend: 'griefFriend', sibling: 'griefSibling', rival: 'griefRival' };
  function griefOf(o, dead, base, d, q) {
    const P = fl.party, b = o.bond, st = fl.stats;
    const k = b.type === 'mentor' ? (b.role === 'apprentice' ? 'griefMentor' : 'griefFriend') : GRIEF_KEY[b.type];
    st.griefs = (st.griefs || 0) + 1; tl('gf', o.id, dead.id);
    const line = () => { const t = bondText(o, k, dead); if (q) P.queueSay.push({ id: o.id, text: t, at: fl.time + q, prio: 3, late: 4 }); else say(o, t, 4, 2.2); };
    const fear = m => { const f0 = o.fear; addFear(o, base * m * (o.trait === 'coward' ? 1.5 : 1), null, 'death'); st.deathFear += Math.max(0, o.fear - f0); };
    if (b.type === 'rival') { line(); fear(0.5); return; }
    if (b.role === 'apprentice') { line(); fear(1.5); o.growAt = fl.time + 20; return; }
    if (!o.fleeing && (o.trait === 'brave' || o.type === 'barbarian' || (o.type === 'warrior' && Math.random() < 0.5)) && startRage(o, 'vow', dead)) {
      o.vowUntil = fl.time + 30; o.vowOn = d && d.killer && MONSTERS[d.killer.type] && d.killer.hp > 0 ? d.killer : null; o.needPlan = true;
      st.revengeVows = (st.revengeVows || 0) + 1; st.revenge = (st.revenge || 0) + 1; tl('vw', o.id, dead.id);
      fear(0.3); return;
    }
    line(); fear(1.5);
  }
  const vowK = h => fl.time < (h.vowUntil || 0) ? 1.3 : 1;   // revenge: +30% damage to monsters
  // a wound his pair sees: a rival's jab (a trap, 20%+ HP, 30%, once in 20 s), the mentor's warning when his apprentice is hurt
  // (once in 25 s), or, when the hit leaves him under 30% HP and he lives, the mentor's praise 3 s later; a bet lost to the trap
  function bondHurt(h, real, kind, src) {
    if (h.bet && !h.bet.done && src === h.bet.trap) betEnd(h, true);
    const o = bondOf(h), P = fl.party;
    if (!o || (kind !== 'trap' && kind !== 'monster') || !calmFor(o) || !canSee(o, h)) return;
    if (h.bond.type === 'rival') {
      if (kind !== 'trap' || real < 0.2 * h.max || fl.time < (o.mockT || 0) || Math.random() >= 0.3) return;
      o.mockT = fl.time + 20;
      P.convoNot = { key: 'rivalMock', ids: new Set([h.id]) };
      if (!say(o, nameFill(pick(SAY.rivalMock), h), 2)) return;
      fl.stats.rivalMock = (fl.stats.rivalMock || 0) + 1; tl('rm', o.id, h.id);
      P.queueSay.push({ id: h.id, text: pick(SAY.rivalMockReply), at: fl.time + 0.2, prio: 2, late: 4 });
    } else if (h.bond.role === 'apprentice') {
      if (h.hp < 0.3 * h.max) { if (!h.proudAt) h.proudAt = fl.time + 3; }
      else if (real >= 0.1 * h.max) mentorWatch(o, h);
    }
  }
  // the mentor's warning ({v} = the apprentice; once in 25 s) and the apprentice's answer
  function mentorWatch(m, a) {
    const P = fl.party;
    if (fl.time < (m.watchT || 0) || !calmFor(m) || exiting(m) || !canSee(m, a)) return false;
    m.watchT = fl.time + 25;
    if (!say(m, nameFill(pick(SAY.mentorWatch), a), 2)) return false;
    fl.stats.mentorWatch = (fl.stats.mentorWatch || 0) + 1; tl('mw', m.id, a.id);
    if (Math.random() < 0.6) P.queueSay.push({ id: a.id, text: pick(SAY.apprenticeReply), at: fl.time + 0.2, prio: 2, late: 4 });
    return true;
  }
  // the mentor's praise (his apprentice disarmed a trap, or lived through a hit that left him under 30% HP); once in 25 s
  function mentorProud(a, q) {
    const m = a.bond && a.bond.role === 'apprentice' ? bondOf(a) : null;
    if (!m || a.dead || !calmFor(m) || !canSee(m, a) || fl.time < (m.proudT || 0)) return false;
    m.proudT = fl.time + 25; fl.stats.mentorProud = (fl.stats.mentorProud || 0) + 1; tl('mp', m.id, a.id);
    fl.party.queueSay.push({ id: m.id, text: pick(SAY.mentorProud), at: fl.time + (q || 0.3), prio: 2, late: 4 });
    return true;
  }
  // an apprentice walks into a room where they know of a trap: the mentor warns him
  function mentorRoom(h, r) {
    const m = h.bond && h.bond.role === 'apprentice' ? bondOf(h) : null;
    if (!m || exiting(h) || r < 0) return false;
    for (const t of fl.items.values()) if (TRAPS[t.type] && t.detected && !t.disabled && slotRoom(t.type, t.x, t.y) === r) return mentorWatch(m, h);
    return false;
  }
  const mentorNear = h => { const m = h.bond && h.bond.role === 'apprentice' ? bondOf(h) : null; return !!m && calmFor(m) && hdist(m, h) <= 3 && canSee(h, m); };
  // 1.21: a quarrel over loot. One wants what another has claimed (he is greedy, a treasure hunter, or the claimant's rival) and
  // they see each other: quarrelStart ({v} = the other), quarrelReply; the higher rank wins (greedy or a treasure hunter, a
  // barbarian, the leader: +1 each; ties at random): the claim is his (quarrelWin when he picks it up), the loser keeps away 10 s
  // (quarrelLose) and, greedy or a rival, may storm off (the 1.19 sulk, 30%). Once a pair a wave. The leader, when he sees both
  // (40%), stops it (lootStop): nobody takes it for 10 s. Returns true when h won it.
  function quarrel(h, cl, it, k) {
    const P = fl.party, st = fl.stats, seen = P.quarrels || (P.quarrels = new Set()), pk = pairKey(h, cl);
    if (seen.has(pk) || !canSee(h, cl) || !calmFor(h) || !calmFor(cl) || exiting(h) || exiting(cl) || talking(h) || talking(cl)) return false;
    seen.add(pk); st.quarrels = (st.quarrels || 0) + 1;
    const n0 = P.convoN || 0;
    P.convoNot = { key: 'quarrelStart', ids: new Set([cl.id]) };   // the onlookers comment, not the other one
    say(h, nameFill(pick(SAY.quarrelStart), cl), 3);
    P.queueSay.push({ id: cl.id, text: pick(SAY.quarrelReply), at: fl.time + 0.2, prio: 2, late: 4 });   // before the onlookers' talk, if one starts
    const tEnd = (P.convoN || 0) !== n0 ? Math.max(fl.time + 2.8, (P.convoT || 0) - 1.2) : fl.time + 2.8;
    const L = groupLeaderOf(h), claims = P.lootClaim || (P.lootClaim = new Map());
    if (L && L !== h && L !== cl && calmFor(L) && canSee(L, h) && canSee(L, cl) && Math.random() < 0.4) {
      claims.delete(k); it.qBan = { until: fl.time + 10, ids: null };
      [h, cl].forEach(o => { o.lootMemo.set(k, { go: false, t: fl.time + 2 }); o.needPlan = true; });
      P.queueSay.push({ id: L.id, text: pick(SAY.lootStop), at: tEnd, prio: 2, late: 6 });
      st.quarrelStops = (st.quarrelStops || 0) + 1; tl('qq', h.id, cl.id, -1);
      return false;
    }
    const sc = o => o.rank + (o.trait === 'greedy' || o.hunter ? 1 : 0) + (o.type === 'barbarian' ? 1 : 0) + (o === L ? 1 : 0) + Math.random() * 0.5;
    const W = sc(h) > sc(cl) ? h : cl, Lo = W === h ? cl : h;
    claims.set(k, W.id); it.qBan = { until: fl.time + 10, ids: [Lo.id] }; W.qWin = k;
    Lo.lootMemo.set(k, { go: false, t: fl.time + 2 }); Lo.needPlan = true; if (Lo.lootKey === k) Lo.lootKey = null;
    P.queueSay.push({ id: Lo.id, text: pick(SAY.quarrelLose), at: tEnd, prio: 2, late: 6 });
    tl('qq', h.id, cl.id, W.id);
    if ((Lo.trait === 'greedy' || Lo.hunter || bondType(Lo, 'rival')) && Lo.id !== P.leaderId && !P.g2 && !P.sulkAfter && !Lo.crystal && Math.random() < 0.3) {
      P.queueSay.push({ id: Lo.id, text: pick(SAY.sulkOff), at: tEnd + 1.5, prio: 2, late: 4 }); P.sulkAfter = { id: Lo.id, at: tEnd + 2.2 }; st.quarrelSulks = (st.quarrelSulks || 0) + 1;
    }
    return W === h;
  }
  // the winner picks up what they quarrelled over
  function quarrelWon(h, k) {
    if (h.qWin !== k) return;
    h.qWin = null; fl.stats.quarrelWins = (fl.stats.quarrelWins || 0) + 1;
    fl.party.queueSay.push({ id: h.id, text: pick(SAY.quarrelWin), at: fl.time + 0.3, prio: 2, late: 4 });
  }
  // 1.21 "Nie zostawię cię": the leader leaves a friend, a brother or sister, an apprentice or a mentor behind (in a cage, or
  // lost): the other one of the pair, if he hears it, will not have it (noLeave {v} = the friend; the caged one answers,
  // noLeaveReply) and goes back for him alone: a second group of one (g2Start, plan 'rescue') to the cage, to open it, or to
  // where the lost one was last seen and then to his voice; then the two go back to the others ('regroup', rescueThink). It ends
  // like any second group (40 s at most). goal: the tile to go to.
  function noLeave(c, L, goal) {
    const P = fl.party, m = bondOf(c);
    if (!m || m.bond.type === 'rival' || !calmFor(m) || exiting(m) || m.crystal || P.g2 || m.id === P.leaderId || onScout(m) || goal < 0) return false;
    if (!(L && (m === L || canHear(m, L))) && !perceives(m, c, true)) return false;
    if (!g2Start(m, [], 'rescue', goal, 'rescue')) return false;
    P.g2.partner = c.id; P.g2.apart = true; P.abandoned.delete(c.id);
    fl.stats.noLeave = (fl.stats.noLeave || 0) + 1; tl('nl', m.id, c.id);
    P.queueSay.push({ id: m.id, text: nameFill(pick(SAY.noLeave), c), at: fl.time + 1.6, prio: 3, late: 4 });
    if (caged(c)) P.queueSay.push({ id: c.id, text: pick(SAY.noLeaveReply), at: fl.time + 2.6, prio: 2, late: 4 });
    return true;
  }
  // the rescue group's progress (g2Think): the lost one found (he is close and sees him), the caged one free: he joins and they
  // go back to the others; the friend dead, gone, or the time up: back to the others
  function rescueThink(G, L2) {
    const P = fl.party, c = byId(G.partner);
    if (c && c.lost && !c.dead && samePlace(c, L2) && hdist(c, L2) <= 2.5) {
      c.lost = false; c.hearUntil = -1; c.noPathT = 0; c.sepT = 0; c.sepRolled = false; c.needPlan = true; if (P.searchId === c.id) P.searchId = -1;
      say(c, pick(SAY.found), 3);
    }
    if (c && !c.dead && !c.fled && !c.gone && (caged(c) || c.lost) && fl.time <= G.until) return;
    if (c && !c.dead && !c.fled && !c.gone && !c.lost && !caged(c) && !c.fleeing && hdist(c, L2) <= 6) { G.ids.add(c.id); fl.stats.noLeaveSaved = (fl.stats.noLeaveSaved || 0) + 1; tl('ns', L2.id, c.id); }
    G.plan = 'regroup'; alive().forEach(o => { if (G.ids.has(o.id)) { o.plan = 'regroup'; o.needPlan = true; } });
  }
  // the rescuer's way (planHero, the second group's leader with the plan 'rescue'): next to the cage (then he opens it), or to
  // where the lost one was last seen, then to his voice (any way, known or not, like a lost one following a voice)
  function rescueJob(h, G, B, setB) {
    const c = byId(G.partner); if (!c) return null;
    if (caged(c)) {
      if (Math.abs(h.x - c.x) + Math.abs(h.y - c.y) <= 1) return { free: c };
      const g = nearestOf(B(), DIRS.map(d => [c.x + d[0], c.y + d[1]]).filter(t => walkable(t[0], t[1])).map(t => t[1] * WW + t[0]));
      return g >= 0 ? { intent: 'rescue', goal: g } : null;
    }
    if (!c.lost) return null;
    if (G.target >= 0 && tIdx(h) === G.target) G.target = -1;   // where he was last seen: not here, so to his voice
    if (G.target >= 0 && !canSee(h, c) && !canHear(h, c) && B().dist[G.target] >= 0) return { intent: 'search', goal: G.target };
    const bv = bfs(h.x, h.y, {}), g = tIdx(c);
    if (bv.dist[g] < 0) return null;
    setB(bv); return { intent: 'search', goal: g };
  }
  // 1.21 Zakład: a brave one or a rival (rank 1+, 60%+ HP) in a room with a known, loaded trap on the party's way bets he walks
  // through it unhurt (betStart); his rival, or anyone who sees him, takes it (betTake {v} = the bettor). For 8 s he walks across
  // its reach, danger or not (planHero: his goal is its far tile). Out of it unhurt: betWin ({v} = the taker), a coin from the
  // taker; hit by it: the taker's betLose ({v} = the bettor), a coin from the bettor. Once a wave, and a 70% roll for each bettor
  // and trap that could (about one bet in 3-4 waves; 30% gave one in 8): it is good for you (he walks into a trap on purpose), so it stays rare.
  function betThink(crew, L) {
    const P = fl.party, st = fl.stats;
    crew.forEach(h => { if (h.bet && !h.bet.done && fl.time > h.bet.until + 4) betEnd(h, false); });
    if (P.betDone || fl.fearless || goingOut() || !L || P.plan === 'retreat' || fl.time < 10 || P.convoT > fl.time + 3) return;
    for (const h of crew) {
      if (h === L || h.rank < 1 || h.hp <= 0.6 * h.max || !calmFor(h) || exiting(h) || inG2(h) || onScout(h) || h.split || talking(h) || h.state !== 'walk' || h.room < 0 || h.crystal) continue;
      const rv = bondType(h, 'rival') && calmFor(bondOf(h)) && canSee(bondOf(h), h) ? bondOf(h) : null;
      if ((h.trait !== 'brave' && !rv) || fl.time < (h.betLookT || 0)) continue;
      h.betLookT = fl.time + 1;   // a look once a second (the party's way is a path search)
      const tried = P.betTried || (P.betTried = new Set());
      const ts = [...fl.items.values()].filter(x => TRAPS[x.type] && x.detected && !x.disabled && x.cd <= 0 && slotRoom(x.type, x.x, x.y) === h.room && !tried.has(h.id + ':' + key(x.x, x.y)));
      if (!ts.length) continue;
      const way = new Set(L.path.concat(h.path).map(p => p[1] * WW + p[0])); partyWay(h, bfs(h.x, h.y, { known: true }), 0).forEach(k => { const [x, y] = k.split(',').map(Number); way.add(y * WW + x); });   // the party's way too
      const t = ts.find(x => areaOf(x).some(q => way.has(q[1] * WW + q[0])));
      if (!t) continue;
      tried.add(h.id + ':' + key(t.x, t.y));   // one roll for each bettor and trap
      if (Math.random() >= 0.7) continue;
      const tk2 = rv || crew.find(o => o !== h && calmFor(o) && canSee(o, h) && !talking(o));
      if (!tk2 || !betStart(h, tk2, t)) continue;
      return;
    }
  }
  function betStart(h, tk2, t) {
    const P = fl.party, area = areaOf(t).filter(q => walkable(q[0], q[1]));
    if (!area.length) return false;
    const far = area.slice().sort((a, b) => Math.hypot(b[0] - h.tx, b[1] - h.ty) - Math.hypot(a[0] - h.tx, a[1] - h.ty))[0];
    P.betDone = true; fl.stats.bets = (fl.stats.bets || 0) + 1; tl('bt', h.id, tk2.id, t.type);
    h.bet = { trap: t, taker: tk2.id, until: fl.time + 8, goal: far[1] * WW + far[0], keys: new Set(area.map(q => q[1] * WW + q[0])), inside: false, done: false };
    P.convoNot = { key: 'betStart', ids: new Set([tk2.id]) };
    say(h, pick(SAY.betStart), 3);
    P.queueSay.push({ id: tk2.id, text: nameFill(pick(SAY.betTake), h), at: fl.time + 0.2, prio: 2, late: 4 });
    h.needPlan = true; h.path = []; floatHero(h, 'Zakład!', '#ffd27a', 13, -0.8);
    return true;
  }
  // the bet is settled: hit by that trap (lost), out of its reach after walking into it (won), or he never went in (off)
  function betEnd(h, hit) {
    const b = h.bet; if (!b || b.done) return;
    b.done = true; h.needPlan = true;
    const tk = byId(b.taker), P = fl.party, st = fl.stats, pay = (a, c) => { if (a && c && a.gold > 0 && !a.dead && !c.dead) { a.gold--; c.gold++; } };
    if (hit || h.dead) {   // killed on the way counts as lost too
      st.betsLost = (st.betsLost || 0) + 1; tl('be', h.id, 0);
      if (tk && calmFor(tk) && !h.dead) { P.queueSay.push({ id: tk.id, text: nameFill(pick(SAY.betLose), h), at: fl.time + 0.6, prio: 2, late: 4 }); pay(h, tk); }
    } else if (b.inside) {
      st.betsWon = (st.betsWon || 0) + 1; tl('be', h.id, 1);
      if (tk && !tk.dead && !tk.fled) { P.queueSay.push({ id: h.id, text: nameFill(pick(SAY.betWin), tk), at: fl.time + 0.2, prio: 2, late: 4 }); pay(tk, h); }
      floatHero(h, 'Wygrany zakład', '#ffd27a', 12, -0.8);
    } else { st.betsOff = (st.betsOff || 0) + 1; tl('be', h.id, -1); }
  }
  // a step of the bettor (onEnter): into the trap's reach, and out of it again unhurt = won
  function betStep(h) {
    const b = h.bet; if (!b || b.done) return;
    const i = h.y * WW + h.x;
    if (b.keys.has(i)) b.inside = true;
    else if (b.inside) betEnd(h, false);
  }
  // every party tick: the first word of each pair (4-25 s into the wave, once the gate is open, at a random moment), the
  // mentor's praise after a near miss, the apprentice growing up after his mentor's death, the bet
  function bondThink(crew, L) {
    const P = fl.party, st = fl.stats, at = P.bondAt || (P.bondAt = {});
    crew.forEach(h => {
      if (h.growAt && fl.time >= h.growAt) { h.growAt = 0; h.courage = Math.round(h.courage * 1.15); st.grownUp = (st.grownUp || 0) + 1; tl('gu', h.id); floatHero(h, 'Dorasta', '#9fe0cf', 12, -0.8); }
      if (h.proudAt && fl.time >= h.proudAt) { h.proudAt = 0; mentorProud(h); }
      const o = bondOf(h); if (!o || o.id < h.id || !fl.gateOpen) return;
      const pk = pairKey(h, o); if (at[pk] === undefined) at[pk] = 4 + Math.random() * 16;
      if (at[pk] < 0 || fl.time < at[pk]) return;
      if (fl.time > 25) { at[pk] = -1; return; }
      const sp = h.bond.type === 'mentor' ? (h.bond.role === 'mentor' ? h : o) : Math.random() < 0.5 ? h : o;
      if (bondTalk(sp, 0, true)) at[pk] = -1;
    });
    betThink(crew, L);
  }
  // 1.20 Dzielenie się (author: they share nothing but potions): once a second. 1) In a crisis a calm one hands his ready amulet to
  // a friend about to panic (2 tiles, they see each other) and it works at once. 2) At ease (a talk, a rest, the stop before a
  // room: always; otherwise 35%) two of the same group side by side, neither in a fight, a panic or a trap, no monster they know
  // in the room, hand over an item worth 1+ more to the other (CLASS_FIT), or swap two. 8 s a hero, 4 s the party; an item never
  // goes back to one who gave it; no potions (they have their own rule), nothing cursed. P.gifts: the hook for 1.21-1.22.
  function shareThink(crew, L, dt) {
    const P = fl.party;
    P.shareT = (P.shareT || 0) - dt; if (P.shareT > 0) return; P.shareT = 1;
    for (const g of crew) for (const o of crew) {
      if (g === o || fl.time < g.giveCd || panicking(g) || caged(g) || g.lost || exiting(g)) continue;
      if (o.fear < 0.6 * o.courage || powerReady(o, 'amulet') || fl.time < o.calmUntil || panicking(o) || caged(o) || hdist(g, o) > 2) continue;
      const am = powerReady(g, 'amulet'); if (!am || am.cursed || g.fear >= 0.4 * g.courage || !canSee(g, o)) continue;
      g.inv.splice(g.inv.indexOf(am), 1); am.gaveNm = g.nm; am.gaveFem = g.female; am.gaveBy = (am.gaveBy || []).concat(g.id); o.inv.push(am);   // into his hand: no pack or weight check
      useAmulet(o); g.giveCd = fl.time + 10; fl.stats.amuletGiven = (fl.stats.amuletGiven || 0) + 1; tl('gv', g.id, o.id, 'amulet' + am.r);
      (P.gifts || (P.gifts = [])).push({ from: g.id, to: o.id, type: 'amulet', t: fl.time });
      say(g, pick(SAY.amuletGive), 3); floatHero(o, 'Od ' + nameGen(g) + ': amulet', ITEM_COLOR.amulet, 12, -0.7);
      return;
    }
    if (fl.fearless || goingOut() || P.plan === 'retreat' || fl.time < (P.shareCd || 0)) return;
    const monRooms = new Set(); fl.items.forEach(m => { if (MONSTERS[m.type] && !DRIFT[m.type] && m.hp > 0 && fl.known[m.y * WW + m.x]) monRooms.add(roomOf(m.x, m.y)); });
    const calm = x => !panicking(x) && !caged(x) && !x.lost && !exiting(x) && x.state !== 'fight' && x.state !== 'loot' && !fl.danger[tIdx(x)] && x.room >= 0 && !monRooms.has(x.room);
    const chance = P.prep || crew.some(x => x.state === 'talk' || x.state === 'rest' || x.huddle) ? 1 : 0.35;
    if (Math.random() >= chance) return;
    const gain = (g, o, x) => itemValue(o, x) - itemValue(g, x);
    const gives = (g, o) => g.inv.filter(x => x.type !== 'potion' && !x.cursed && !(x.gaveBy && x.gaveBy.includes(o.id)) && gain(g, o, x) >= 1.0 && canTake(o, x));
    let best = null;
    for (const g of crew) for (const o of crew) {
      if (g === o || inG2(g) !== inG2(o) || hdist(g, o) > 2 || !canSee(g, o) || !calm(g) || !calm(o) || fl.time < (g.shareCd || 0) || fl.time < (o.shareCd || 0)) continue;
      gives(g, o).forEach(x => { const v = gain(g, o, x); if (!best || v > best.v) best = { g, o, x, v }; });
    }
    if (!best) return;
    const { g, o, x } = best;
    const hand = (a, b, y) => {   // a gives y to b; a better one of a kind sends b's old one back to a (or to the floor)
      a.inv.splice(a.inv.indexOf(y), 1);
      y.gaveBy = (y.gaveBy || []).concat(a.id); y.gaveNm = a.nm; y.gaveFem = a.female;
      const U = HITEMS[y.type].use, same = (U === 'power' || U === 'gear' || U === 'tool') ? b.inv.find(z => z.type === y.type) : null;
      if (same) { b.inv.splice(b.inv.indexOf(same), 1); if (itemValue(a, same) > 0 && canTake(a, same)) a.inv.push(same); else dropItem(a, same, 0, true); }
      b.inv.push(y);
      floatHero(b, 'Od ' + nameGen(a) + ': ' + itemLabel(y), ITEM_COLOR[y.type] || '#c3b2ff', 12, -0.7);
      (P.gifts || (P.gifts = [])).push({ from: a.id, to: b.id, type: y.type, t: fl.time });
      tl('gv', a.id, b.id, y.type + y.r);
    };
    hand(g, o, x); fl.stats.gearGiven = (fl.stats.gearGiven || 0) + 1;
    const back = gives(o, g).filter(y => y !== x).sort((a, b) => gain(o, g, b) - gain(o, g, a))[0];   // a swap: something of his is worth 1+ more to the giver
    if (back) { hand(o, g, back); fl.stats.gearTrades = (fl.stats.gearTrades || 0) + 1; }
    g.shareCd = o.shareCd = fl.time + 8; P.shareCd = fl.time + 4;
    say(g, pick(SAY.giveGear), 2); P.queueSay.push({ id: o.id, text: pick(SAY.giveGearThanks), at: fl.time + 1.1 });
  }
  // 1.22 Finał fali (e122/SPEC122.md): the crystal run (a guard round the carrier, the crystal handed over, a last stand, a trap set
  // off on purpose, "nearly out") and care on the way ("ty pierwszy", tapping the floor, "nie tędy", the fight formation). What
  // happened this wave is in P.fin (P is a wave's). finalThink runs every party tick (partyThink, after bondThink).
  const finOf = P => P.fin || (P.fin = { escortFor: -1, handTo: -1, hand: 0, handT: -99, stand: false, sac: null, sacDone: false, sacLook: 0, near: false, yfT: 0, yfN: 0, yfRooms: new Set(), ntw: false, front: new Set() });
  function carrierOf() { const P = fl.party, c = P && P.carrierId >= 0 ? byId(P.carrierId) : null; return c && c.crystal && !c.dead && !c.fled && !c.gone ? c : null; }
  function standing(h) { return !!h.stand && !h.stand.done; }   // a last stand (also asked by driftTarget, p4)
  function sacrificing(h) { return !!h.sac && !h.sac.done; }
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  const FLOOR_TAP = { spikes: 1, trapdoor: 1, cage: 1, web: 1 };   // what a stick on the floor can find
  const lsBrave = o => o.trait === 'brave' || ((o.type === 'warrior' || o.type === 'barbarian') && (o.lsRoll === undefined ? (o.lsRoll = Math.random() < 0.5) : o.lsRoll));   // rolled once a wave
  function finalThink(crew, L, dt) {
    const P = fl.party, F = finOf(P), c = carrierOf();
    if (c && P.plan === 'escape') {
      escortThink(c, crew, L, F);
      handThink(c, crew, F);
      standStart(c, crew, F);
      sacStart(c, crew, F);
      // 9. nearly out: once a wave, the carrier within 6 tiles of the way out (through the queue: a busy moment does not lose it)
      if (!F.near && Math.min(...exitGoals().map(i => Math.hypot(i % WW - c.tx, ((i / WW) | 0) - c.ty))) <= 6) {
        F.near = true; fl.stats.nearExit = (fl.stats.nearExit || 0) + 1; tl('ne', c.id);
        P.queueSay.push({ id: c.id, text: pick(SAY.nearExit), at: fl.time, prio: 3, late: 3 });
      }
    }
    standThink(crew);
    if (F.sac) sacTick(F);
    formThink(crew, F);
  }
  // 1. the escort: when someone carries the crystal, those who see him (on the escape plan, 35%+ HP) walk next to him (planHero:
  // escortGoal) instead of each taking his own way out. The leader (or the strongest of them) calls it, one guard speaks to the
  // carrier and he answers. A crystal handed over keeps its guard (no new call). One who sees the carrier later joins.
  function escortThink(c, crew, L, F) {
    const P = fl.party;
    const can = o => o !== c && calmFor(o) && planOf(o) === 'escape' && !o.goHome && !standing(o) && !sacrificing(o) && o.hp >= 0.35 * o.max && canSee(o, c);
    if (F.escortFor !== c.id) {
      const g = crew.filter(can), handed = F.handTo === c.id;
      if (!g.length && !handed) return;   // nobody sees him yet: they form up when someone does
      F.escortFor = c.id;
      crew.forEach(o => { o.escort = false; }); g.forEach(o => { o.escort = true; o.needPlan = true; });
      if (handed || !g.length) return;
      const caller = L && g.includes(L) ? L : g.slice().sort((a, b) => b.hp - a.hp)[0];
      const gd = g.filter(o => o !== caller).sort((a, b) => ((b.type === 'warrior') - (a.type === 'warrior')) || (hdist(a, c) - hdist(b, c)))[0] || caller;
      fl.stats.escortForms = (fl.stats.escortForms || 0) + 1; fl.stats.escortGuards = (fl.stats.escortGuards || 0) + g.length; tl('ef', c.id, g.length);
      say(caller, pick(SAY.escortForm), 3, 2.2);
      P.queueSay.push({ id: gd.id, text: nameFill(pick(SAY.escortGuard), c), at: fl.time + 1.0, prio: 2, late: 5 }, { id: c.id, text: pick(SAY.carrierThanks), at: fl.time + 1.2, prio: 2, late: 6 });
      return;
    }
    crew.forEach(o => { if (!o.escort && can(o)) { o.escort = true; o.needPlan = true; } });
  }
  // where a guard goes: a free tile 1-2 steps from where the carrier will be in two steps, off his next steps; a warrior in front
  // (towards where the carrier goes), the others close at his side. Measured from his next tile, not the one he leaves, or the
  // guard arrives where the carrier was and falls behind. No free spot (a passage): right behind him (his tile: the guard stops a
  // step before it; the way out could part from the carrier's). -1: the carrier is far (another room, 2+ away): the exit as before.
  function escortGoal(h, c, b) {
    const ct = tIdx(c);
    if (b.dist[ct] < 0 || !(canSee(h, c) || hdist(h, c) <= 8)) return -1;   // a guard who fell a little behind catches up (escortPace)
    const nt = c.path.length ? c.path[0][1] * WW + c.path[0][0] : c.nx !== null ? c.ny * WW + c.nx : ct, cx = nt % WW, cy = (nt / WW) | 0;
    const ahead = c.path.slice(0, 3).map(p => p[1] * WW + p[0]), on = new Set([ct, nt].concat(ahead));
    const fr = ahead.length ? ahead[ahead.length - 1] : nt, fx = fr % WW, fy = (fr / WW) | 0, war = h.type === 'warrior';
    let best = -1, bs = 1e9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = (war ? fx : cx) + dx, y = (war ? fy : cy) + dy, i = y * WW + x;   // the warrior: round the tile 3 steps ahead of him
      if (Math.abs(dx) + Math.abs(dy) > 2 || !walkable(x, y) || on.has(i) || b.dist[i] < 0 || fl.danger[i] > 1) continue;
      if (alive().some(o => o !== h && o !== c && ((o.nx === null && o.x === x && o.y === y) || (o.nx === x && o.ny === y)))) continue;
      const sc = (war ? 2 * Math.hypot(x - fx, y - fy) : Math.hypot(x - cx, y - cy)) + 0.25 * b.dist[i];
      if (sc < bs) { bs = sc; best = i; }
    }
    return best >= 0 ? best : ct;
  }
  // a guard keeps up with the carrier: walking to his spot he goes at least at the carrier's pace (a thief with the crystal outran a
  // priest and a mage, and the guard fell behind in the first test), a warrior a bit faster (he has to get round him to the front);
  // up to 1,4 times his own
  function escortPace(h) {
    const c = h.intent === 'escort' ? carrierOf() : null; if (!c) return 1;
    return clamp(c.T.speed * c.R.speed * 0.9 * mods.carrierSlow * (h.type === 'warrior' ? 1.2 : 1.05) / (h.T.speed * h.R.speed), 1, 1.4);
  }
  // a guard next to the carrier steps into a monster's blow meant for him (monstersTick, p4): the best of them (a warrior first)
  function guardOf(c, m) {
    const g = alive().filter(o => o !== c && o.escort && !caged(o) && !panicking(o) && o.hp >= 0.25 * o.max && cheb(o.tx, o.ty, c.tx, c.ty) <= 1)
      .sort((a, b) => ((b.type === 'warrior') - (a.type === 'warrior')) || (b.hp - a.hp))[0];
    if (g && m.soakBy !== g.id) { m.soakBy = g.id; fl.stats.guardSoaks = (fl.stats.guardSoaks || 0) + 1; tl('gs', g.id, c.id, m.type); }
    return g || null;
  }
  // 2. the hand-over: the carrier under 35% HP gives the crystal to a healthier friend (60%+ HP) within 1,5 tiles who sees him;
  // at most twice a wave, not twice within 6 s. The theft stats stay as they were.
  function handThink(c, crew, F) {
    const P = fl.party;
    if (c.hp >= 0.35 * c.max || F.hand >= 2 || fl.time - F.handT < 6 || caged(c)) return;
    const r = crew.filter(o => o !== c && o.hp >= 0.6 * o.max && calmFor(o) && !o.goHome && !standing(o) && !sacrificing(o) && hdist(o, c) <= 1.5 && canSee(o, c))
      .sort((a, b) => b.hp / b.max - a.hp / a.max)[0];
    if (!r) return;
    F.hand++; F.handT = fl.time; F.handTo = r.id;
    c.crystal = false; c.escort = false; r.crystal = true; r.escort = false; r.fleeing = false; r.plan = 'escape'; P.carrierId = r.id;
    [c, r].forEach(o => { o.needPlan = true; if (o.state === 'fight' || o.state === 'wait' || o.state === 'talk' || o.state === 'rest') { o.state = 'walk'; o.foe = null; } });
    fl.stats.handOvers = (fl.stats.handOvers || 0) + 1; tl('ho', c.id, r.id);
    floatHero(r, 'Niesie kryształ', '#ff9ab0', 14, -0.8);
    const n0 = P.convoN || 0, text = pick(okLines(c, SAY.handOver.map(x => nameFill(x, r)))), take = pick(SAY.handTake);   // the bleeding line only if he knows he bleeds (every line names him: say() could not swap it)
    if (say(c, text, 3, 2.2, 'q')) { if ((P.convoN || 0) === n0) P.queueSay.push({ id: r.id, text: take, at: fl.time + 0.3, prio: 3, late: 4 }); }   // a talk that starts from it is the answer
    else P.queueSay.push({ id: c.id, text, at: fl.time, prio: 3, late: 3 }, { id: r.id, text: take, at: fl.time + 0.2, prio: 3, late: 5 });
  }
  // 3. the last stand: a drifting monster (ghost, shade, bats), or a melee one somebody fights, within 3 tiles of the carrier
  function threatNear(c) {
    const p = heroPos(c); let best = null, bd = 3.01;
    fl.items.forEach(m => {
      if (!MONSTERS[m.type] || m.hp <= 0 || hiddenAmbush(m)) return;
      let d;
      if (DRIFT[m.type]) d = Math.hypot(m.gx - p.x, m.gy - p.y);
      else if (alive().some(h => h.state === 'fight' && h.foe === m)) d = Math.hypot(m.x + 0.5 - p.x, m.y + 0.5 - p.y);
      else return;
      if (d < bd) { bd = d; best = m; }
    });
    return best;
  }
  // once a wave: a brave one (a warrior or a barbarian half the time) with 40%+ HP, not the carrier, stops in the nearest doorway
  // between the monster and the carrier (or where he is) and holds it there (planHero: a fight with a melee one in reach, else
  // he waits; drifting ones pick him, driftTarget) for up to 8 s or until he is under 25% HP (standThink); then he runs out.
  function standStart(c, crew, F) {
    const P = fl.party;
    if (F.stand) return;
    const m = threatNear(c); if (!m) return;
    const mp = DRIFT[m.type] ? [m.gx, m.gy] : [m.x + 0.5, m.y + 0.5], cp = heroPos(c), dcm = Math.hypot(cp.x - mp[0], cp.y - mp[1]);
    const s = crew.filter(o => o !== c && calmFor(o) && planOf(o) === 'escape' && !o.goHome && o.hp >= 0.4 * o.max && !sacrificing(o) && hdist(o, c) <= 6 && lsBrave(o))
      .sort((a, b) => Math.hypot(heroPos(a).x - mp[0], heroPos(a).y - mp[1]) - Math.hypot(heroPos(b).x - mp[0], heroPos(b).y - mp[1]))[0];
    if (!s) return;
    const b = bfs(s.x, s.y, { known: true, noDanger: true }), cpath = new Set(c.path.map(q => q[1] * WW + q[0]));
    let goal = tIdx(s), door = false, bd = 1e9;
    new Set([c.room, roomOf(Math.floor(mp[0]), Math.floor(mp[1])), s.room]).forEach(r => {
      if (r < 0 || !fl.rooms[r]) return;
      fl.rooms[r].doors.forEach(d => {
        const i = d.y * WW + d.x, dm = Math.hypot(d.x + 0.5 - mp[0], d.y + 0.5 - mp[1]), dc = Math.hypot(d.x + 0.5 - cp.x, d.y + 0.5 - cp.y);
        if (d.entrance || cpath.has(i) || b.dist[i] < 0 || b.dist[i] > 6 || dm >= dcm || dc >= dcm + 1 || dc > 5 || heroBlock(s, d.x, d.y)) return;
        if (b.dist[i] < bd) { bd = b.dist[i]; goal = i; door = true; }
      });
    });
    F.stand = true;
    s.stand = { m, goal, door, until: fl.time + 8, at: fl.time, done: false }; s.escort = false; s.needPlan = true;
    if (s.state === 'wait' || s.state === 'talk') s.state = 'walk';
    fl.stats.lastStands = (fl.stats.lastStands || 0) + 1; tl('lx', s.id, m.type, door ? 1 : 0);
    floatHero(s, 'Zostaje!', '#ffd27a', 14, -0.8);
    // a line about the door only in a doorway; alone his own words (SOLO), which say() would pick at random
    const alone = aloneNow(s), pool = (alone ? SOLO.lastStand : SAY.lastStand).filter(x => door || !/drzwi|próg|Ciasne/.test(x));
    const n0 = P.convoN || 0;
    sayNow(itemTags(m), () => say(s, pick(pool), 4, 2.2, 'loud'));
    if (!alone && (P.convoN || 0) === n0) {
      const f = crew.find(o => o !== s && !o.lost && !caged(o) && !panicking(o) && canHear(o, s));
      if (f) P.queueSay.push({ id: f.id, text: nameFill(pick(SAY.lastStandReply), s), at: fl.time + 0.4, prio: 3, late: 4 });
    }
  }
  function standThink(crew) {
    crew.forEach(s => {
      if (!standing(s)) return;
      const S = s.stand, m = S.m;
      if (fl.time < S.until && s.hp >= 0.25 * s.max && calmFor(s) && m.hp > 0 && fl.items.get(key(m.x, m.y)) === m && carrierOf()) return;
      S.done = true; s.needPlan = true; if (s.state === 'fight' || s.state === 'wait') { s.state = 'walk'; s.foe = null; }
      fl.stats.lastStandT = Math.round(((fl.stats.lastStandT || 0) + fl.time - S.at) * 10) / 10; tl('le', s.id, Math.round(fl.time - S.at));
    });
  }
  // 4. the sacrifice: once a wave, when the carrier's known way out goes through a known, loaded floor or wall trap (not a cage, not
  // a scare) within 12 steps and there is no other known way, one of them (a brave one, a priest 30% of the time, else the one with
  // the most HP; not the carrier) walks into its reach on purpose (planHero, noDanger) and stands there till it goes off on him as
  // usual; the others hold before it (sacHold, updateHero) until it has fired, at most 4 s after he could be there.
  function reachAvoid(h, goals, block) {   // a known way from him to one of goals, not through block
    const gs = new Set(goals), s = tIdx(h), seen = new Uint8Array(WW * WH), q = [s]; seen[s] = 1;
    for (let i = 0; i < q.length; i++) {
      const cc = q[i]; if (gs.has(cc)) return true;
      const x = cc % WW, y = (cc / WW) | 0;
      for (const d of DIRS) { const nx = x + d[0], ny = y + d[1], j = ny * WW + nx; if (nx < 0 || ny < 0 || nx >= WW || ny >= WH || seen[j] || block.has(j) || !fl.known[j] || !passable(nx, ny)) continue; seen[j] = 1; q.push(j); }
    }
    return false;
  }
  function sacStart(c, crew, F) {
    const P = fl.party;
    if (F.sac || F.sacDone || fl.time < F.sacLook) return;
    F.sacLook = fl.time + 1;   // a look once a second
    const b = bfs(c.x, c.y, { known: true, noDanger: true }), eg = nearestOf(b, exitGoals()); if (eg < 0) return;
    const way = pathFrom(b, eg).slice(0, 12).map(p => p[1] * WW + p[0]);
    let t = null, ti = 99;
    fl.items.forEach(it => {
      if (!TRAPS[it.type] || SCARE[it.type] || it.type === 'cage' || !it.detected || it.disabled || it.cd > 0.3 || it.jamUntil > fl.time) return;
      const sl = ITEMS[it.type].slot; if (sl !== 'floor' && sl !== 'wall') return;
      const ar = new Set(areaOf(it).map(q => q[1] * WW + q[0])), k = way.findIndex(i => ar.has(i) && fl.danger[i] >= 1);
      if (k >= 0 && k < ti) { ti = k; t = it; }
    });
    if (!t) return;
    const area = new Set(areaOf(t).map(q => q[1] * WW + q[0]));
    if (area.has(tIdx(c)) || reachAvoid(c, exitGoals(), area)) return;   // in it already, or another way out
    const pool = crew.filter(o => o !== c && calmFor(o) && planOf(o) === 'escape' && !o.goHome && !standing(o) && o.hp >= 0.35 * o.max && hdist(o, c) <= 8);
    if (!pool.length) return;
    const s = pool.find(o => o.trait === 'brave') || pool.find(o => o.type === 'priest' && Math.random() < 0.3) || pool.slice().sort((a, o) => o.hp - a.hp)[0];
    const b2 = bfs(s.x, s.y, { known: true, noDanger: true });
    const tiles = [...area].filter(i => walkable(i % WW, (i / WW) | 0) && b2.dist[i] >= 0).sort((i, j) => ((way.includes(j)) - (way.includes(i))) || (b2.dist[i] - b2.dist[j]));
    if (!tiles.length) return;
    const g = tiles[0], steps = pathFrom(b2, g).length;
    F.sacDone = true;
    F.sac = { id: s.id, t, area, goal: g, at: fl.time, until: fl.time + 6 + 0.6 * steps, wait: fl.time + 4 + 0.6 * steps, fired: false, done: false };
    s.sac = F.sac; s.escort = false; s.needPlan = true; if (s.state === 'wait' || s.state === 'talk' || s.state === 'fight') { s.state = 'walk'; s.foe = null; }
    fl.stats.sacrifices = (fl.stats.sacrifices || 0) + 1; tl('sf', s.id, t.type);
    floatHero(s, 'Poświęca się', '#ffd27a', 13, -0.8);
    const text = pick(SAY.sacrifice), f = crew.find(o => o !== s && !o.lost && !caged(o) && !panicking(o) && canHear(o, s)), rep = f ? nameFill(pick(SAY.sacrificeReply), s) : null;
    if (say(s, text, 3, 2.2, 'q')) { if (f) P.queueSay.push({ id: f.id, text: rep, at: fl.time + 0.4, prio: 3, late: 4 }); }
    else { P.queueSay.push({ id: s.id, text, at: fl.time, prio: 3, late: 3 }); if (f) P.queueSay.push({ id: f.id, text: rep, at: fl.time + 0.2, prio: 3, late: 5 }); }
  }
  function sacTick(F) {
    const S = F.sac; if (S.done) return;
    const s = byId(S.id), t = S.t;
    if (!S.fired && t.cd > 0) {
      S.fired = true; fl.stats.sacrificeFired = (fl.stats.sacrificeFired || 0) + 1; tl('sd', S.id, t.type);
      if (s && !s.dead && !s.fled && !s.gone) say(s, pick(SAY.sacrificeDone), 4, 1.8, 'loud');   // hurt or not
    }
    if (S.fired || fl.time > S.until || !s || !calmFor(s) || fl.items.get(key(t.x, t.y)) !== t || t.disabled) { S.done = true; if (s) s.needPlan = true; replanAll(); }
  }
  function sacHold(h) {   // one of the others, a step or two before the trap, waits for it to go off
    const S = fl.party.fin && fl.party.fin.sac;
    if (!S || S.done || S.id === h.id || !exiting(h) || panicking(h) || S.t.cd > 0 || fl.time > S.wait) return false;
    return h.path.slice(0, 2).some(p => S.area.has(p[1] * WW + p[0]));
  }
  // 5. "ty pierwszy": exploring, a coward or a careful one about to walk into a room with a known trap sends another one first (his
  // rival or a rookie if he can): the named one walks in (planHero: firstInto), he waits 1,5 s. Once in 40 s, 2 a wave at most,
  // each room once (60%).
  function youFirst(h, n) {
    const P = fl.party;
    if ((h.trait !== 'coward' && h.trait !== 'careful') || P.plan !== 'explore' || fl.fearless || exiting(h) || panicking(h) || h.lost || inG2(h) || onScout(h) || caged(h)) return false;
    const r = roomOf(n[0], n[1]); if (r < 0 || r === roomOf(h.x, h.y) || fl.rooms[r].kind !== 'room') return false;
    const F = finOf(P); if (F.yfN >= 2 || fl.time < F.yfT || F.yfRooms.has(r)) return false;
    let tr = false; fl.items.forEach(it => { if (!tr && LOOKS_TRAP(it.type) && it.detected && !it.disabled && slotRoom(it.type, it.x, it.y) === r) tr = true; });
    if (!tr) return false;
    F.yfRooms.add(r);
    if (Math.random() >= 0.6) return false;
    const pool = alive().filter(o => o !== h && calmFor(o) && !exiting(o) && !inG2(o) && !onScout(o) && !o.firstInto && o.state !== 'fight' && canSee(h, o) && hdist(o, h) <= 4);
    if (!pool.length) return false;
    const pr = o => (bondType(h, 'rival') && bondOf(h) === o ? 2 : 0) + (o.rank === 0 ? 1 : 0);
    const o = pool.sort((a, c) => (pr(c) - pr(a)) || (hdist(a, h) - hdist(c, h)))[0];
    const k = h.path.findIndex(p => roomOf(p[0], p[1]) === r), q = k >= 0 ? h.path[Math.min(h.path.length - 1, k + 1)] : n;
    o.firstInto = { room: r, goal: roomOf(q[0], q[1]) === r ? q[1] * WW + q[0] : n[1] * WW + n[0], until: fl.time + 6 }; o.needPlan = true;
    if (o.state === 'wait') o.timer = 0;
    F.yfT = fl.time + 40; F.yfN++;
    h.state = 'wait'; h.timer = 1.5;
    fl.stats.youFirst = (fl.stats.youFirst || 0) + 1; tl('yf', h.id, o.id);
    const n0 = P.convoN || 0, text = nameFill(pick(SAY.youFirst), o), rep = pick(SAY.youFirstReply);
    if (say(h, text, 2, 2.2, 'q')) { if ((P.convoN || 0) === n0) P.queueSay.push({ id: o.id, text: rep, at: fl.time + 0.3, prio: 2, late: 4 }); }
    else P.queueSay.push({ id: h.id, text, at: fl.time, prio: 2, late: 3 }, { id: o.id, text: rep, at: fl.time + 0.2, prio: 2, late: 5 });
    return true;
  }
  // 6. tapping the floor: a careful one (or a rookie thief) walking into a room nobody has walked through yet (or right behind the
  // first one in) may tap his way across it (60%, 3 rooms a wave): 30% slower there (updateHero), and each hidden floor trap
  // within 1 tile of his next step has one 35% roll to be found (tapStep) before he steps on it. Leaving the room having found
  // nothing: tapNothing (40%).
  function tapRoom(h, r, fresh) {
    if (h.tap && h.tap.room !== r) { if (!h.tap.found && !exiting(h) && Math.random() < 0.4) say(h, pick(SAY.tapNothing), 2); h.tap = null; }
    if (h.tap || !fresh || fl.rooms[r].kind !== 'room' || (h.taps || 0) >= 3 || exiting(h) || fl.fearless || panicking(h) || caged(h) || h.lost) return;
    if (!(h.trait === 'careful' || (h.type === 'thief' && h.rank === 0)) || Math.random() >= 0.6) return;
    h.taps = (h.taps || 0) + 1; h.tap = { room: r, found: 0, rolled: h.tapRolled || (h.tapRolled = new Set()) };   // one roll a trap a wave (walking in again is no new chance)
    fl.stats.taps = (fl.stats.taps || 0) + 1; tl('tp', h.id, r);
    say(h, pick(SAY.tapFloor), 2);
  }
  function tapStep(h, n) {   // true: he found one and stops to think again
    const T = h.tap; if (!T || exiting(h) || roomOf(n[0], n[1]) !== T.room) return false;
    let hit = null;
    fl.items.forEach(it => {
      if (hit || !FLOOR_TAP[it.type] || it.detected || it.disabled || T.rolled.has(it) || cheb(it.x, it.y, n[0], n[1]) > 1) return;
      T.rolled.add(it); if (Math.random() < 0.35) hit = it;
    });
    if (!hit) return false;
    T.found++; fl.stats.tapFound = (fl.stats.tapFound || 0) + 1; fl.stats.detected++; tl('tf', h.id, hit.type, hit.x, hit.y);
    learnTrap(hit, 'tap', h); floatTile(hit.x, hit.y, 'Opukana!', '#ffe066', 13, -0.6);
    h.path = []; h.needPlan = true; h.state = 'wait'; h.timer = 0.4;
    return true;
  }
  // 7. "nie tędy": once a wave, a new explore target whose way goes through a room with a known trap that hurt someone this wave
  // (P.hurt, damageRaw): a veteran (rank 2+) or one it hurt says so, and the leader picks another target if there is one
  // (chooseTarget with that room's tiles costed higher). One who was not hurt there does not say he was.
  function notThisWay(L, crew) {
    const P = fl.party, F = finOf(P);
    if (F.ntw || !P.hurt || P.target < 0 || P.plan !== 'explore' || fl.fearless || goingOut()) return;
    const b = bfs(L.x, L.y, { known: true, avoid: L.R.avoid }); if (b.dist[P.target] < 0) return;
    const rooms = new Set(pathFrom(b, P.target).map(p => roomOf(p[0], p[1])).filter(r => r >= 0 && r !== L.room));
    let room = -1, ids = null;
    P.hurt.forEach((s, t) => { if (room >= 0 || !t.detected || t.disabled || fl.items.get(key(t.x, t.y)) !== t) return; const r = slotRoom(t.type, t.x, t.y); if (rooms.has(r)) { room = r; ids = s; } });
    if (room < 0) return;
    const sp = crew.filter(o => o !== L && calmFor(o) && !exiting(o) && !inG2(o) && !onScout(o) && canHear(o, L) && (o.rank >= 2 || ids.has(o.id))).sort((a, c) => ids.has(c.id) - ids.has(a.id))[0];   // a talk about the way may be going on: he says it there
    if (!sp) return;
    F.ntw = true;
    const before = P.target; chooseTarget(L, room);
    const moved = P.target !== before;
    fl.stats.notThisWay = (fl.stats.notThisWay || 0) + 1; if (moved) fl.stats.notThisWayMoved = (fl.stats.notThisWayMoved || 0) + 1; tl('nw', sp.id, room, moved ? 1 : 0);
    P.queueSay.push({ id: sp.id, text: pick(SAY.notThisWay.filter(x => ids.has(sp.id) || !/Był\{|Raz mi|Pamiętam/.test(x))), at: fl.time, prio: 3, late: 4 });   // after a talk about the way that may be going on
  }
  // 8. the formation: in a fight with a melee monster (two of them or more there), the warrior holds the front (frontLine once a
  // fight; planHero sends him at it, monstersTick hits him first), the priest and the mage step out of it and keep 2+ tiles away
  // (planHero), and one fighting under 30% HP steps back behind the warrior for 4 s (woundedBack, once a hero a wave).
  function formThink(crew, F) {
    const fights = new Set();
    crew.forEach(o => { if (o.state === 'fight' && o.foe && o.foe.hp > 0 && !DRIFT[o.foe.type] && !exiting(o)) fights.add(o.foe); });
    fights.forEach(m => {
      const r = roomOf(m.x, m.y);
      const w = crew.find(o => o.type === 'warrior' && calmFor(o) && !exiting(o) && !inG2(o) && o.hp >= 0.3 * o.max && fl.time >= (o.backUntil || 0) && (o.room === r || cheb(o.tx, o.ty, m.x, m.y) <= 2));
      if (!w || !crew.some(o => o !== w && !o.lost && !caged(o) && (o.room === r || cheb(o.tx, o.ty, m.x, m.y) <= 2))) return;
      if (w.front !== m) { w.front = m; w.needPlan = true; }
      if (!F.front.has(m)) { F.front.add(m); fl.stats.frontLines = (fl.stats.frontLines || 0) + 1; tl('fm', w.id, m.type); say(w, pick(SAY.frontLine), 3); }
      crew.forEach(o => { if ((o.type === 'priest' || o.type === 'mage') && o.state === 'fight' && o.foe === m && !raging(o)) { o.state = 'walk'; o.foe = null; o.needPlan = true; } });
    });
    crew.forEach(o => {
      if (o.state !== 'fight' || !o.foe || DRIFT[o.foe.type] || o.hp >= 0.3 * o.max || o.woundBack || exiting(o) || standing(o)) return;
      const m = o.foe, w = crew.find(q => q !== o && q.type === 'warrior' && calmFor(q) && !exiting(q) && q.hp >= 0.3 * q.max && q.room === o.room);
      if (!w && !crew.some(q => q !== o && q.state === 'fight' && q.foe === m)) return;   // nobody to hold it
      o.woundBack = true; o.backUntil = fl.time + 4; o.backFrom = m; o.state = 'walk'; o.foe = null; o.needPlan = true;
      if (w && w.front !== m) { w.front = m; w.needPlan = true; }
      fl.stats.woundedBack = (fl.stats.woundedBack || 0) + 1; tl('wb', o.id, m.type);
      say(o, pick(SAY.woundedBack), 3);
    });
  }
  // a monster the warrior holds in his room (the priest and the mage keep off it)
  function formedFoe(h) {
    const F = fl.party.fin; if (!F || !F.front.size) return null;
    for (const m of F.front) if (m.hp > 0 && fl.items.get(key(m.x, m.y)) === m && roomOf(m.x, m.y) === h.room && alive().some(w => w !== h && w.front === m && calmFor(w) && !exiting(w) && fl.time >= (w.backUntil || 0) && (w.room === h.room || cheb(w.tx, w.ty, m.x, m.y) <= 2))) return m;   // also while he is on his way to it
    return null;
  }
  // a free, safe tile 2-3 tiles from the monster, behind the warrior who holds it if there is one, nearest to him
  function backTile(h, m, b) {
    const w = alive().find(o => o !== h && o.type === 'warrior' && o.front === m), dw = w ? Math.hypot(w.tx - m.x, w.ty - m.y) : 0;
    let best = -1, bs = 1e9;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = m.x + dx, y = m.y + dy, i = y * WW + x, c = Math.max(Math.abs(dx), Math.abs(dy));
      if (c < 2 || !walkable(x, y) || b.dist[i] < 0 || fl.danger[i] > 1) continue;
      if (alive().some(o => o !== h && ((o.nx === null && o.x === x && o.y === y) || (o.nx === x && o.ny === y)))) continue;
      const sc = b.dist[i] + (w ? (Math.hypot(x - m.x, y - m.y) < dw ? 3 : 0) + 0.3 * Math.hypot(x - w.tx, y - w.ty) : 0);
      if (sc < bs) { bs = sc; best = i; }
    }
    return best;
  }
  function safestRoom(from) {
    const b = from ? bfs(from.x, from.y, { known: true }) : null;
    let best = -1, bestSc = 1e9;
    fl.rooms.forEach(r => {
      if (r.kind !== 'room' || !r.seen || r.id === fl.heart.room || r.rt === 'swamp' || r.rt === 'ice') return;   // nobody rests knee-deep in a swamp (1.10: or on ice)
      let danger = 0, near = 1e9;
      r.tiles.forEach(t => { const i = t[1] * WW + t[0]; danger += fl.danger[i]; if (b && b.dist[i] >= 0 && b.dist[i] < near) near = b.dist[i]; });
      if (b && near >= 1e9) return;
      let threats = 0; fl.items.forEach(it => { if (roomOf(it.x, it.y) !== r.id) return; if (MONSTERS[it.type] && it.hp > 0) threats += 5; else if (LOOKS_TRAP(it.type) && it.detected && !it.disabled) threats += 3; });
      const sc = danger + threats + (b ? near * 0.2 : 0) - (r.rt === 'haven' ? 12 : 0);   // 1.10: Sanktuarium looks like the safest place there is
      if (sc < bestSc) { bestSc = sc; best = r.id; }
    });
    return best;
  }
  // Rooms they know of (from the tavern or from the doorway) but have not walked through yet this wave: there may be treasure.
  function searchTargets() {
    const out = [];
    fl.rooms.forEach(R => {
      if (R.kind !== 'room' || R.visited || !R.seen || R.id === fl.heart.room) return;
      const cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2;
      const c = R.tiles.filter(t => walkable(t[0], t[1])).sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
      if (c) out.push({ i: c[1] * WW + c[0], room: R.id });
    });
    return out;
  }
  function chooseTarget(L, avoidRoom) {
    const P = fl.party, fr = frontier(), st = P.wantSearch ? searchTargets() : [], av = avoidRoom === undefined ? -1 : avoidRoom;   // 1.22: av, a room they will not cross (notThisWay)
    P.targetRoom = -1;
    if (!fr.length && !st.length) { P.target = -1; return; }
    const b = bfs(L.x, L.y, { known: true, avoid: L.R.avoid, costRoom: av });   // 1.22: its tiles cost more
    const seenLoot = [...fl.items.values()].filter(it => isLoot(it.type) && it.seenWave === run.wave);
    const cands = [];
    // 1.17 (author: less rigid, more natural exploring): the leader's character shows in where he goes. A brave one goes deeper
    // and picks more on a whim, a careful one keeps to what is close, a coward stays nearer the way out; a sound heard in the
    // last 25 s (hearFar) draws a brave, greedy or green leader and keeps a careful one or a coward away.
    const tr = L.trait, deep = tr === 'brave' ? 0.24 : tr === 'coward' ? 0.1 : 0.18, whim = tr === 'brave' ? 2.5 : tr === 'careful' ? 1 : 1.5;
    // 1.18 Wabiący hałas: the sound draws every leader, a careful one and a coward too, and is remembered 40 s (15 s more a copy)
    const snd = P.sound && fl.time - P.sound.t < 25 + 15 * mods.lure ? P.sound : null, sndK = mods.lure || tr === 'brave' || tr === 'greedy' || L.rank === 0 ? -2.5 : tr === 'careful' || tr === 'coward' ? 2 : -1;
    const add = (f, room, bonus) => {
      const d = b.dist[f]; if (d < 0) return;
      const fx = f % WW, fy = (f / WW) | 0;
      let sc = d * (tr === 'careful' ? 1.15 : 1) - deep * (Math.abs(fx - fl.ent.x) + Math.abs(fy - fl.ent.y)) + Math.random() * whim + bonus;
      if (snd && Math.hypot(snd.x - fx, snd.y - fy) <= 7) sc += sndK;
      seenLoot.forEach(it => { if (Math.hypot(it.x - fx, it.y - fy) <= 6) sc -= 3 * lootLevel(it); });
      if (room >= 0 && isRt(room, 'vault')) sc -= 4;   // a treasure room pulls them in
      if (av >= 0 && (room === av || roomOf(fx, fy) === av)) sc += 1000;   // 1.22: not into the room they refuse (only if nothing else is left)
      cands.push({ f, sc, d, fx, fy, room });
    };
    fr.forEach(f => add(f, -1, 0));
    st.forEach(t => add(t.i, t.room, 2));   // the unknown is more tempting than a room they have heard of
    if (!cands.length) { P.target = -1; return; }
    cands.sort((a, c) => a.sc - c.sc);
    const prev = P.target;
    if (L.rank === 0) {   // a rookie leader just picks something and goes
      const c = cands[Math.min(cands.length - 1, rand(0, 2))];
      P.target = c.f; P.targetRoom = c.room;
      if (prev !== c.f && Math.random() < 0.3) partySay('rookieLead', 1, L);
      return;
    }
    const best = cands[0];
    P.target = best.f; P.targetRoom = best.room;
    // a second, different way that looks almost as good: talk it over, maybe send the thief
    const alt = cands.find(c => c !== best && c.sc < best.sc + 5 && Math.abs(c.fx - best.fx) + Math.abs(c.fy - best.fy) > 5);
    let room = roomOf(L.tx, L.ty);
    if (room < 0) for (const d of DIRS) { const r = roomOf(L.tx + d[0], L.ty + d[1]); if (r >= 0 && !P.junctions.has(r)) { room = r; break; } }
    if (alt && av < 0 && room >= 0 && !P.junctions.has(room) && !fl.fearless && fl.time - P.lastTalkAt > 6) {   // 1.22: no fork talk on a refused way
      P.lastTalkAt = fl.time;
      P.junctions.add(room); fl.stats.forkTalks = (fl.stats.forkTalks || 0) + 1;
      // 1.05: a council with characters: the greedy want the loot next door, the careful want it slow, a coward wants out and a
      // brave one shames him. The leader decides; a greedy or green leader gives in to the loot.
      const lureAlt = seenLoot.some(it => Math.hypot(it.x - alt.fx, it.y - alt.fy) <= 6);
      const crewT = talkGroup(L).filter(o => o !== L);   // 1.13: only the ones standing with him have a say
      const greedy = lureAlt ? crewT.find(o => o.trait === 'greedy' || o.hunter) : null, careful = crewT.find(o => o.trait === 'careful');
      const coward = P.morale < 0.8 ? crewT.find(o => o.trait === 'coward') : null, brave = coward ? crewT.find(o => o.trait === 'brave') : null;
      const lines = [[L, pick(SAY.deliberate)]];
      if (greedy) lines.push([greedy, pick(SAY.argueLoot)]);
      if (careful) lines.push([careful, pick(SAY.argueCareful)]);
      if (coward) lines.push([coward, pick(SAY.argueCoward)]);
      if (brave) lines.push([brave, pick(SAY.argueBrave)]);
      if (lines.length < 2 && crewT.length) lines.push([null, pick(SAY.deliberate2)]);   // 1.13: alone he does not argue with himself (1.17: a second voice of its own)
      if (greedy) {
        const sway = L.trait === 'greedy' || L.hunter || L.rank === 0 || Math.random() < 0.35;
        if (sway) { P.target = alt.f; P.targetRoom = alt.room; }
        lines.push([L, pick(sway ? SAY.decideYes : SAY.decideNo)]); fl.stats.disputes = (fl.stats.disputes || 0) + 1; tl('dp', greedy.id, sway ? 1 : 0);
      }
      // 1.19 Rozłam: one who will not go the leader's way (a greedy one he did not listen to, or a brave or greedy veteran) takes
      // the other way, and 1-2 like him go too; the leader lets them go. Two groups explore apart until they meet again.
      if (!P.g2 && P.plan === 'explore' && !fl.fearless && fl.time > 15 && P.scoutId < 0 && crewT.length >= 3 && (fl.stats.rift_fork || 0) < 2) {
        const swayed = P.target === alt.f;
        const rv = bondType(L, 'rival') && crewT.includes(bondOf(L)) ? bondOf(L) : null;   // 1.21: the leader's rival is a likelier dissenter (x1,5)
        const D = greedy && !swayed ? greedy : rv && rv.rank >= 1 && !rv.crystal && rv.hp > 0.5 * rv.max ? rv : crewT.find(o => (o.trait === 'brave' || o.trait === 'greedy' || o.hunter) && o.rank >= 1 && !o.crystal && o.hp > 0.5 * o.max);
        if (D && Math.random() < (D === greedy ? 0.5 : 0.2) * (P.morale < 0.6 ? 1.3 : 1) * (D === rv ? 1.5 : 1)) {
          const like = o => o.trait === 'greedy' || o.trait === 'brave' || o.hunter || o.type === 'barbarian' || o.rank === 0;
          const joiners = crewT.filter(o => o !== D && !o.crystal && !caged(o) && like(o)).sort(() => Math.random() - 0.5).slice(0, Math.min(2, crewT.length - 2));
          if (g2Start(D, joiners, 'explore', swayed ? best.f : alt.f, 'fork')) {
            lines.push([D, nameFill(pick(SAY.riftStart), L)]); joiners.forEach(j => lines.push([j, pick(SAY.riftJoin)])); lines.push([L, nameFill(pick(SAY.riftLeader), D)]);
            P.convoNot = { key: 'riftStart', ids: new Set(joiners.map(o => o.id)) };
          }
        }
      }
      const thief = crewT.find(h => h.type === 'thief');
      // 1.16: with no (healthy) thief a brave one may offer, less often; in a party of 4+ somebody may go with the scout
      const vol = thief && thief.hp > 0.5 * thief.max ? thief : crewT.find(o => o.trait === 'brave' && o.type !== 'priest' && o.hp > 0.6 * o.max && !o.crystal);
      const volP = vol && vol === thief ? (lureAlt ? 0.9 : 0.55) : (lureAlt ? 0.5 : 0.3);
      if (!greedy && vol && alive().length >= 3 && P.scoutId < 0 && !P.g2 && Math.random() < volP) {
        P.scoutId = vol.id; vol.scoutTarget = alt.f; vol.scoutUntil = fl.time + 16; vol.needPlan = true; fl.stats.scouts++; startSplit(vol, 'scout');
        lines.push([vol, pick(SAY.scout)]);   // 1.05: the thief himself offers (it used to be anyone)
        // the mate: anyone close by (the talk group is often just the ones right at the leader's side), not the priest, not a coward
        const mate = alive().length >= 4 && Math.random() < 0.45 ? alive().filter(o => o !== L && o !== vol && !o.lost && !caged(o) && !o.fleeing && !panicking(o) && o.type !== 'priest' &&
          o.trait !== 'coward' && o.hp > 0.5 * o.max && !o.crystal && hdist(o, vol) <= 6).sort((a, b) => ((b.trait === 'brave') - (a.trait === 'brave')) || (hdist(a, vol) - hdist(b, vol)))[0] : null;
        if (mate) { P.scoutMate = mate.id; mate.needPlan = true; startSplit(mate, 'mate'); fl.stats.scoutPairs = (fl.stats.scoutPairs || 0) + 1; lines.push([mate, pick(SAY.splitMate)], [L, pick(SAY.splitReply)]); }
        else lines.push([L, pick(SAY.scoutReply)]);
      }
      const quiet = crewT.find(o => !lines.some(l => l[0] === o) && o.type !== 'thief');   // 1.12.1: somebody else has a word too
      if (quiet) lines.push([quiet, pick(SAY.councilReply)]);
      talkAs(1.4 + 0.45 * lines.length, lines); huddleUp(L);
    } else if (prev !== best.f && Math.random() < 0.35) partySay('explore', 1, L);
  }
  // 1.12.1: when they sit down to rest: the leader calls it, the priest tends the wounds, somebody grumbles and gets an answer
  function restScene(L0, crew) {
    // 1.13: the ones already sitting there (and those in the same place) talk; the leader only if he is with them
    const P = fl.party, first = crew.find(h => h.state === 'rest');
    const pool = first ? crew.filter(h => !caged(h) && !h.lost && !h.fleeing && !panicking(h) && (h === first || samePlace(first, h))) : [];
    const L = pool.includes(L0) ? L0 : first;
    if (!L || !pool.length) return;
    const pr = pool.find(h => h.type === 'priest' && h !== L), others = pool.filter(h => h !== L && h !== pr);
    const lines = [[L, pick(SAY.restStart)]];
    if (pr) lines.push([pr, pick(SAY.restPriest)]);
    const a = others.length ? pick(others) : null, b = others.find(h => h !== a) || (a ? L : null);
    if (a) lines.push([a, pick(SAY.restScene)]);
    if (a && b) lines.push([b, pick(SAY.restReply)]);
    lines.forEach((l, i) => P.queueSay.push({ id: l[0].id, text: l[1], at: fl.time + 0.3 + i * 0.6 }));
  }
  // A friend in a cage: elites always go back for him; others weigh their own fear.
  function decideCage(c, L) {
    const P = fl.party;
    P.cageDecided.add(c.id);
    const others = alive().filter(o => o !== c && !o.fleeing && !caged(o));
    if (!others.length || goingOut()) return;
    const grpC = groupOf(L).filter(o => o !== c && !o.fleeing), fearR = (grpC.length ? grpC : others).reduce((a, o) => a + o.fear / o.courage, 0) / (grpC.length || others.length);   // 1.17: the leader's group
    const rescue = L.rank >= 2 || (bondOf(c) === L && L.bond.type !== 'rival') || (fearR < 0.6 && Math.random() < (L.rank === 0 ? 0.5 : 0.8));   // 1.21: not his own pair
    const who = L === c ? others[0] : L;
    tl('rs', c.id, rescue ? 1 : 0);
    if (rescue) {   // 1.17 (6.8 #14): a second one caged while they free the first waits his turn (it took the first one's rescuer)
      const cur = P.rescueId >= 0 ? byId(P.rescueId) : null;
      if (cur && caged(cur) && cur !== c) (P.rescueQ || (P.rescueQ = [])).push(c.id); else { P.rescueId = c.id; P.rescuerId = -1; }
      say(who, nameFill(pick(SAY.rescue), c), 3);
    }
    else { P.abandoned.add(c.id); fl.stats.abandons++; say(who, nameFill(pick(SAY.abandon), c), 3); P.queueSay.push({ id: c.id, text: pick(SAY.abandoned), at: fl.time + 1 }); addFear(c, 15, 'cage'); noLeave(c, L, tIdx(c)); }   // 1.21: noLeave
  }
  // Runs a few times per second: who leads, where they go, retreat, push for the crystal or run, who got separated.
  function partyThink(dt) {
    const P = fl.party, crew = alive();
    if (P.plan !== P.loggedPlan) { P.loggedPlan = P.plan; tl('pl', P.plan); }
    // 1.10: the lines of a talk, an answer, a call: in order, each when its turn comes (an answer waits for the line it answers,
    // and nobody in earshot of a line still waiting goes before it); a line whose moment has long passed is dropped
    if (P.queueSay.length) {
      // 1.17 (found by the 1.17 dialogue pass): a line said from the queue could never start a conversation: the check for
      // lines still waiting nearby saw the line itself, and lines queued during the filter were lost with the old array.
      // Now the queue being worked through is P.queueCur, new lines land in a fresh P.queueSay, and the line being said
      // (P.sayingQ) and the ones already said this tick (q.done) do not count as waiting.
      const held = [], cut = new Set(), cur = P.queueSay.sort((a, b) => a.at - b.at);
      P.queueSay = []; P.queueCur = cur;
      const keep = cur.filter(q => {
        if (q.cv && cut.has(q.cv)) return false;   // 1.13: the rest of an exchange that lost a line goes too
        if (q.at > fl.time) return true;
        const h = byId(q.id); if (!h || h.dead || h.fled || h.gone || fl.time - q.at > (q.late || 10)) { if (q.cv) cut.add(q.cv); q.done = true; return false; }
        if (q.how !== 'loud' && held.some(o => earshot(o, h))) { held.push(h); return true; }
        P.sayingQ = q; const ok = say(h, q.text, q.prio || 2, q.dur || 1.8, q.how || 'q'); P.sayingQ = null;
        if (ok) { q.done = true; return false; }
        held.push(h); return true;
      });
      P.queueCur = null; P.queueSay = keep.concat(P.queueSay);
    }
    fl.items.forEach(it => { if (isLoot(it.type)) lootSeen(it); });
    if (!crew.length) return;
    const L = leader();
    P.morale = Math.min(1, P.morale + (crew.some(o => o.type === 'bard' && !o.lost && !caged(o)) ? 0.02 : 0.012) * dt);   // 1.05: a bard's company lifts spirits faster
    // 1.16 (found in the author's replays: a fog grope of 3,7 s still hung 13 s later): a wrong turn or a grope was only cleared
    // when the leader planned with no errand of his own, so a leader busy with loot kept an old one, which blocked new wrong turns,
    // fog gropes and the thief's 'wait here'. Past its time it goes now.
    if (P.detour && fl.time > P.detour.until) { P.detour = null; if (L) L.needPlan = true; }
    perceiveThink(L, crew);   // 1.17: who knows what
    if (P.council) councilThink(L);   // 1.17: the council at the end of patience
    g2Think(L); sulkThink(L);   // 1.19: the second group, a sulker leaving, a mutiny's way home
    if (P.rescueId >= 0) { const c = byId(P.rescueId); if (!c || !caged(c)) { P.rescueId = -1; P.rescuerId = -1; } }   // 1.17: freed or gone: the next one in the queue
    while (P.rescueId < 0 && P.rescueQ && P.rescueQ.length) { const c = byId(P.rescueQ.shift()); if (c && caged(c)) { P.rescueId = c.id; P.rescuerId = -1; } }
    lookThink(L, crew);   // 1.17: curiosity
    // Prototype 1.01, Mgła: the leader walks into the fog and gropes for the way for a few seconds (once per fog room per wave)
    if (L && !goingOut() && !fl.fearless && L.room >= 0 && isRt(L.room, 'fog') && !P.detour) {
      P.fogDone = P.fogDone || new Set();
      if (!P.fogDone.has(L.room)) {
        P.fogDone.add(L.room);
        const R = fl.rooms[L.room], spots = R.tiles.filter(t => walkable(t[0], t[1]) && Math.hypot(t[0] - L.tx, t[1] - L.ty) >= 2);
        // 1.18 Błędne ogniki: the lights lead him onto the nearest tile in reach of a trap of this room the party does not know, and he gropes 2 s longer
        let wt = null;
        if (mods.wisps) { let bd = 1e9; fl.items.forEach(it => { if (!TRAPS[it.type] || it.detected || it.disabled || slotRoom(it.type, it.x, it.y) !== L.room) return; areaOf(it).forEach(t => { if (!walkable(t[0], t[1]) || roomOf(t[0], t[1]) !== L.room) return; const d = Math.hypot(t[0] - L.tx, t[1] - L.ty); if (d >= 1 && d < bd) { bd = d; wt = t; } }); }); }
        // 1.20: a lit lantern next to him: half the groping (the wisps' 2 s stay), and its bearer says so
        const lt = lanternNear(L) ? alive().find(o => litLantern(o) && o.room === L.room && hdist(o, L) <= 2) : null;
        if (wt || spots.length) { const t = wt || pick(spots); P.detour = { goal: t[1] * WW + t[0], until: fl.time + (lt ? 0.5 : 1) * (3 + 0.25 * Math.max(0, 8 - L.lvl / 2)) + 2 * mods.wisps, wisp: !!wt }; fl.stats.fogGrope = (fl.stats.fogGrope || 0) + 1; if (wt) fl.stats.wisps = (fl.stats.wisps || 0) + 1; tl('fg', L.room); if (lt) { fl.stats.lanternGrope = (fl.stats.lanternGrope || 0) + 1; say(lt, pick(SAY.lanternLight), 3); } else say(L, pick(SAY.fogGrope), 3); }
      }
    }
    crew.forEach(h => {
      const others = crew.filter(o => o !== h);
      const nearest = others.length ? Math.min(...others.map(o => hdist(h, o))) : 0;
      h.alone = others.length > 0 && fl.queue.length === 0 && nearest > 4.5;
      // 1.16: away on purpose: measured from the party (the ones not on the errand), so a scout and his mate are away together
      if (h.split && (h.lost || h === L)) h.split = false;
      let away = false;
      if (h.split) {
        const rest = others.filter(o => !o.split);
        away = rest.length > 0 && fl.queue.length === 0 && Math.min(...rest.map(o => hdist(h, o))) > 4.5;
        if (!away && !splitting(h)) h.split = false;   // back with the party
      }
      if (h.split && away) {
        fl.stats.splitTime += dt; addFear(h, 1 * dt, null, 'split');
        h.acc += addPts(GZ.split * dt * depthMult(h.room) * (h.alone ? mods.loneMult : 1), 'splitPts', h);
        h.aloneSaid = true;   // he went on his own: no 'where is everybody?'
      } else if (h.alone) { fl.stats.loneTime += dt; addFear(h, 2.5 * dt, null, 'alone'); h.acc += addPts(GZ.alone * dt * depthMult(h.room) * mods.loneMult, 'lonePts', h); /* v14: steady Groza for every second alone */ if (!h.aloneSaid && !panicking(h)) { say(h, pick(SAY.alone), 2); h.aloneSaid = true; } }
      else h.aloneSaid = false;
      if (h.hp < 0.35 * h.max) addFear(h, 2.2 * dt, null, 'lowhp');   // v15.1: was 3/s (heavy wounds scare less, fear pays more)
      if (h.crystal && mods.carrierFear) addFear(h, mods.carrierFear * dt, null, 'carrier');
      if (caged(h) && mods.cageHaunt) addFear(h, mods.cageHaunt * dt, 'cage', 'haunt');   // Nawiedzone klatki
      if (mods.cocoons && fl.time < h.slowUntil && rkOf(h.room) === 'spider' && fl.zones.some(z => z.src && (z.src.type === 'web' || z.src.type === 'spider') && z.keys.has(key(h.tx, h.ty)))) addFear(h, 6 * mods.cocoons * dt, 'web', 'cocoon');   // 1.18 Kokony (the web's attribute: fobia pająków x2)
      // counter-buildings: the first one to walk in (preferably the one it hurts) reacts out loud
      if (h.room >= 0 && fl.bRooms && fl.bSaid) ['altar', 'rune', 'acid', 'veil', 'howl', 'shackles'].forEach(t => {
        const kk = t + ':' + h.room;
        if (!inB(t, h.room) || fl.bSaid.has(kk)) return;
        const pref = { altar: 'priest', rune: 'mage', acid: 'warrior', howl: 'bard', shackles: 'barbarian' }[t];
        if (pref && h.type !== pref && crew.some(o => o.type === pref && o.room === h.room)) return;
        fl.bSaid.add(kk); sawAdd(h, [t]); sayNow([t], () => say(h, pick(SAY['b' + t.charAt(0).toUpperCase() + t.slice(1)]), 3));
      });
      // caged with nobody coming: the fear builds until he tears the bars apart and runs
      if (caged(h) && (P.abandoned.has(h.id) || !crew.some(o => o !== h && !caged(o) && !o.fleeing && !o.lost))) addFear(h, 8 * dt * mods.cageFear, 'cage', 'cageAlone');
      if (h.cursed) addFear(h, 2 * dt, null, 'curse');   // a cursed treasure whispers
      if (fl.time < (h.lullUntil || 0) && h.room === h.lullRoom) {
        addFear(h, h.lullK * dt, 'musicbox', 'lull');   // v15.1: the music box's lullaby, while he stays in that room
        // 1.18 Usypianka: a wounded one (under 60% HP) in a Pokój dziecięcy falls asleep where he stands: the Sanktuarium's nap (once a
        // wave, shared with it) with its nightmares (h.dream, see updateHero), 4 s (+2 s a copy)
        if (mods.lullsleep && rkOf(h.room) === 'nursery' && h.hp < 0.6 * h.max && !h.napped && h.nx === null && !caged(h) && !exiting(h) && !panicking(h) && fl.time >= h.burnUntil && (h.state === 'walk' || h.state === 'talk' || h.state === 'wait')) {
          h.napped = true; h.dream = true; h.napUntil = fl.time + 4 + 2 * (mods.lullsleep - 1); h.restAt = fl.time; h.dreamSaid = false; h.state = 'rest'; h.path = []; h.intent = 'nap';
          fl.stats.lullNaps = (fl.stats.lullNaps || 0) + 1; tl('ln', h.id); say(h, pick(SAY.lullNap), 2); floatHero(h, 'Zasypia', '#e6d2ff', 12, -0.8);
        }
      }
      if (h === L) { h.lost = false; h.sepT = 0; return; }
      const Lh = inG2(h) && g2Leader() && g2Leader() !== h ? g2Leader() : L;   // 1.19: one of the second group is with his own leader
      const d = Lh ? hdist(h, Lh) : 0;
      const hr = h.lost && h.hearUntil > fl.time ? byId(h.hearId) : null;   // 1.05: the one whose voice he follows counts as finding the party
      if (h.lost) { if (d < (isRt(h.room, 'fog') || isRt(L ? L.room : -1, 'fog') ? 1.6 : 4.5) || (hr && !hr.dead && !hr.fled && !hr.lost && hdist(h, hr) < 2.5)) { h.lost = false; h.hearUntil = -1; h.noPathT = 0; h.sepT = 0; h.sepRolled = false; say(h, pick(SAY.found), 3); h.needPlan = true; if (P.searchId === h.id) P.searchId = -1; } }
      else if (!fl.fearless && !exiting(h) && !caged(h) && splitting(h)) {
        // 1.16: away on purpose: being cut off is the plan, no roll for that; but the fog and a lost way still get him
        h.sepT = 0; h.sepRolled = false;
        if (h.noPathT > 3 && d > 6) getLost(h, 'nopath');
        else if (h.room >= 0 && isRt(h.room, 'fog') && d > 1.5 && fogRoll(h, dt)) getLost(h, 'fog');
      }
      else if (!fl.fearless && !exiting(h) && !caged(h)) {
        // cut off from the leader (another room, far away): in a big dungeon, or in the fog, he may lose his way
        const apart = !!L && d > 7 && h.room !== L.room;
        h.sepT = apart ? h.sepT + dt : 0;
        if (!apart) h.sepRolled = false;
        if (h.noPathT > 3 && d > 6) getLost(h, 'nopath');
        else if (h.sepT > 3 && !h.sepRolled) { h.sepRolled = true; if (Math.random() < lostChance(h)) getLost(h, 'sep'); }
        else if (h.room >= 0 && isRt(h.room, 'fog') && d > 1.5 && fogRoll(h, dt)) getLost(h, 'fog');   // 1.01: in the fog anyone a step away from the leader can lose the party
      }
      if (h.lost) {
        addFear(h, 4 * dt, null, 'lost');
        if (h.lostT < 12) {
          h.lostT += dt;
          const pts = addPts(GZ.lost * dt * depthMult(h.room) * mods.lostMult, 'lostPts', h); fl.stats.lostTime += dt; h.acc += pts;
        }
        if (fl.time > h.lostCallT && !panicking(h)) { h.lostCallT = fl.time + 6 + 3 * Math.random(); say(h, pick(SAY.lostCall), 2); answerLost(h); }
      }
    });
    // a spare potion for a friend who is about to die
    crew.forEach(g => {
      if (fl.time < g.giveCd || exiting(g) || caged(g) || panicking(g) || g.lost) return;
      const pots = g.inv.filter(x => x.type === 'potion');
      if (!pots.length || (pots.length === 1 && g.hp < 0.7 * g.max)) return;
      const f = crew.find(o => o !== g && o.hp < 0.3 * o.max && !o.inv.some(x => x.type === 'potion') && !caged(o) && hdist(o, g) <= 2);
      if (!f) return;
      const pot = pots.sort((a, b) => a.r - b.r)[0];
      g.inv.splice(g.inv.indexOf(pot), 1); g.giveCd = fl.time + 10;
      f.hp = Math.min(f.max, f.hp + f.max * potionHeal(pot) * itemPow(f) * taintedSip(f, pot));   // 1.18: Zepsute mikstury
      fl.stats.potionsGiven++; fl.stats.potions++; fl.stats.itemsUsed++; tl('pg', g.id, f.id);
      say(g, pick(SAY.potionGive), 3); P.queueSay.push({ id: f.id, text: pick(SAY.potionThanks), at: fl.time + 1.1 });
      floatHero(f, 'Mikstura!', '#8be38f', 14, -0.7);
    });
    shareThink(crew, L, dt);   // 1.20: an amulet in a crisis, gear handed over at ease
    bondThink(crew, L);   // 1.21
    finalThink(crew, L, dt);   // 1.22: the crystal run, the formation
    if (!L) return;
    if (P.prep && fl.time >= P.prep.until) finishPrep();
    else if (!P.prep) checkPrep(L);
    crew.forEach(h => { if (caged(h) && !P.cageDecided.has(h.id) && (canHearShout(L, h) || fl.time - (h.cagedAt || 0) > 20)) decideCage(h, L); });   // 1.17: when the leader hears the cage (or misses him)
    if (P.rescueId >= 0) { const c = byId(P.rescueId); if (!c || !caged(c) || c.dead) P.rescueId = -1; }
    const grp = groupOf(L);   // 1.17 (no knowledge through walls): the leader's group's wounds and fear decide retreat and flight
    const avgHp = grp.reduce((a, h) => a + h.hp / h.max, 0) / grp.length;
    const fearR = grp.reduce((a, h) => a + h.fear / h.courage, 0) / grp.length;
    mutinyThink(L, grp, dt, avgHp, fearR); riftThink(L, grp, dt);   // 1.19
    // scout coming back
    const sc = byId(P.scoutId);
    // 1.16: he has seen that opening: on to the next one on his side (further from the party than he is), while his time lasts
    if (sc && !sc.dead && !sc.fled && !sc.lost && sc !== L && fl.time <= sc.scoutUntil && sc.hp >= 0.45 * sc.max && sc.scoutTarget >= 0 && !isFrontierTile(sc.scoutTarget)) {
      const nb = nextScout(sc, L); if (nb >= 0) { sc.scoutTarget = nb; sc.needPlan = true; fl.stats.scoutSteps = (fl.stats.scoutSteps || 0) + 1; }
    }
    if (sc && (sc.dead || sc.fled || sc.lost || sc === L || fl.time > sc.scoutUntil || sc.hp < 0.45 * sc.max || (sc.scoutTarget >= 0 && !isFrontierTile(sc.scoutTarget)))) {
      if (!sc.dead && !sc.fled && !sc.lost && sc !== L) say(sc, pick(SAY.scoutBack), 2);
      P.scoutId = -1; sc.scoutTarget = -1; sc.needPlan = true;
    }
    // 1.16: 'wait here, I will take a look': as the party walks into a new room on its way into the unknown (still a way to go),
    // a healthy thief may go ahead alone while the rest wait for him (up to 8 s, less if he is back sooner). Not at a fork: this
    // one happens in a dungeon without forks too. One in 40 s at most, from 15 s into the wave, and with a leader who has been here before.
    if (P.plan === 'explore' && !fl.fearless && !goingOut() && P.scoutId < 0 && !P.detour && P.searchId < 0 && L.room >= 0 && L.room !== P.aheadRoom) {
      P.aheadRoom = L.room;
      const R = fl.rooms[L.room];
      if (R && R.kind === 'room' && L.rank >= 1 && fl.time > (P.aheadCd || 15) && crew.length >= 3 && P.target >= 0 && Math.random() < 0.4) {
        const th = crew.find(o => o.type === 'thief' && o !== L && o.hp > 0.6 * o.max && !o.crystal && !caged(o) && !o.lost && !panicking(o) && hdist(o, L) <= 8);
        if (th && Math.hypot(P.target % WW - L.tx, ((P.target / WW) | 0) - L.ty) >= 3) {
          P.scoutId = th.id; th.scoutTarget = P.target; th.scoutUntil = fl.time + 12; th.needPlan = true; fl.stats.scouts++; fl.stats.aheadScouts = (fl.stats.aheadScouts || 0) + 1;
          P.aheadCd = fl.time + 40; P.aheadUntil = fl.time + 8; P.waitUntil = Math.max(P.waitUntil, P.aheadUntil); P.aheadWait = th.id;
          startSplit(th, 'ahead'); say(th, pick(SAY.aheadScout), 2); P.queueSay.push({ id: L.id, text: pick(SAY.aheadReply), at: fl.time + 1.3 });
        }
      }
    }
    if (P.aheadWait >= 0 && P.scoutId !== P.aheadWait) { P.aheadWait = -1; if (P.waitUntil <= P.aheadUntil) P.waitUntil = Math.min(P.waitUntil, fl.time); }   // he is on his way back: they go on
    // 1.16: the mate comes back with the scout, or on his own when hurt (or when the scout is gone some other way)
    const mt = P.scoutMate >= 0 ? byId(P.scoutMate) : null;
    if (mt && (P.scoutId < 0 || mt.dead || mt.fled || mt.lost || mt === L || mt.hp < 0.45 * mt.max)) {
      if (P.scoutId >= 0 && !mt.dead && !mt.fled && !mt.lost && mt !== L) say(mt, pick(SAY.scoutBack), 2);
      P.scoutMate = -1; mt.needPlan = true;
    } else if (!mt) P.scoutMate = -1;
    if (goingOut()) { /* everyone heads for the exit */ }
    else if (fl.fearless) { if (P.plan !== 'assault' && heartP()) { P.plan = 'assault'; replanAll(); } }
    else if (P.plan === 'retreat') {
      if (P.restSince < 0 && crew.some(h => h.state === 'rest')) { P.restSince = fl.time; restScene(L, crew); }
      // 1.16: while they rest, a thief who is whole again (70%+ HP) may go and look around the nearest opening (one roll a rest,
      // a party of 3+)
      const th = P.restSince > 0 && !P.restScouted && fl.time - P.restSince > 3 && P.scoutId < 0 && crew.length >= 3 ?
        crew.find(o => o.type === 'thief' && o !== L && o.hp > 0.7 * o.max && !o.crystal && !caged(o) && !o.lost && !panicking(o)) : null;
      if (th) {
        P.restScouted = true;
        if (Math.random() < 0.5) {
          const b = bfs(th.x, th.y, { known: true }), f = nearestOf(b, frontier());
          if (f >= 0 && pathFrom(b, f).length <= 18) {
            P.scoutId = th.id; th.scoutTarget = f; th.scoutUntil = fl.time + 14; th.state = 'walk'; th.restAt = -1; th.needPlan = true; fl.stats.scouts++; fl.stats.restScouts++;
            startSplit(th, 'rest'); say(th, pick(SAY.restScout), 2); P.queueSay.push({ id: L.id, text: pick(SAY.scoutReply), at: fl.time + 1.4 });
          }
        }
      }
      // 1.12.1: a real break: at least 10 s once they sit (unless they come in nearly whole), at most 26 s (was: until 70% HP, at most 20 s)
      const restT = P.restSince > 0 ? fl.time - P.restSince : 0;
      if ((avgHp >= 0.7 && (restT >= 10 || (P.restSince < 0 && avgHp >= 0.85))) || restT > 26) {
        P.plan = heartP() ? 'assault' : 'explore'; P.retreatLock = fl.time + 15; P.restSince = -1; P.restScouted = false;
        partySay('restDone', 2, L);
        crew.forEach(h => { if (h.state === 'rest') h.state = 'walk'; h.needPlan = true; });
      }
    } else if (L.R.coord && fl.time > P.retreatLock && (avgHp < (P.plan === 'assault' ? 0.32 : 0.42) || (grp.some(h => h.hp < 0.22 * h.max) && !crew.some(h => h.type === 'priest')))) {
      const room = safestRoom(L);
      if (room >= 0) {
        P.plan = 'retreat'; P.retreatRoom = room; P.restSince = -1; P.restScouted = false; fl.stats.retreats++; partySay('retreat', 3, L); replanAll();
        const br = crew.find(o => o !== L && (o.trait === 'brave' || o.type === 'barbarian') && !panicking(o) && canHear(o, L)), cw = crew.find(o => o !== L && o.trait === 'coward' && !panicking(o) && canHear(o, L));   // 1.05: not everyone likes it (1.17: who hears him)
        if (br) P.queueSay.push({ id: br.id, text: pick(SAY.argueRetreat), at: fl.time + 1 });
        if (cw) P.queueSay.push({ id: cw.id, text: pick(SAY.agreeRetreat), at: fl.time + (br ? 2 : 1) });
      }
    }
    // when spirits break, everyone runs (rookies break first)
    if (!goingOut() && (fearR > [0.75, 0.85, 0.95, 1][L.rank] || (P.morale < 0.2 && L.rank < 2))) partyFlee();
    // how much of the dungeon they have really searched: rooms walked through count fully, rooms only heard of in the tavern half.
    // They came for treasure too: the greedier they are, the more they search before the push for the crystal.
    const roomsAll = fl.rooms.filter(r => r.kind === 'room'), seenShare = roomsAll.reduce((a, r) => a + (r.visited ? 1 : r.seen ? 0.3 : 0), 0) / roomsAll.length;
    const need = Math.min(0.85, (L.rank === 0 ? 0.5 : 0.6) + 0.1 * clamp(greedRaw(fl.greed) - 1, 0, 2) - (L.rank >= 2 ? 0.1 : 0));
    // 1.17: "but first the rest" only when they really search first (it used a fixed 0,65 and fired in the prophecy's storm too)
    if (fl.heartKnown && !P.heartSaid && !goingOut() && heartTold(L)) { P.heartSaid = true; say(L, pick(seenShare < need && L.rank > 0 && !fl.fearless ? SAY.heartLater : SAY.heartSeen), 3); }
    const tLimit = S.waveTime * Math.min(0.6, 0.45 + 0.01 * Math.max(0, roomsAll.length - 6));   // a big dungeon takes longer to search
    const detourG = P.gateDetourUntil > fl.time;   // 1.01: sent round by a closed gate, they search what they have not seen
    const wasSearch = P.wantSearch; P.wantSearch = (seenShare < need && fl.patT < tLimit) || detourG;   // 1.12.1: patience time (slower during scenes)   // still searching the rooms they know of (for treasure)
    if (wasSearch !== P.wantSearch) fl.knowDirty = true;
    if (P.plan === 'explore' && !detourG && heartP() && avgHp >= 0.5 && (seenShare >= need || fl.patT > tLimit)) {
      P.plan = 'assault'; P.detour = null; partySay('assault', 3, L); replanAll();
      const gr = crew.find(o => o !== L && (o.trait === 'greedy' || o.hunter) && !o.lost && !panicking(o) && canHear(o, L));   // 1.05: the greedy are not done yet (1.17: who hears him)
      if (gr && seenShare < 0.85) { P.queueSay.push({ id: gr.id, text: pick(SAY.argueSearch), at: fl.time + 1 }, { id: L.id, text: pick(SAY.replySearch), at: fl.time + 2 }); fl.stats.disputes = (fl.stats.disputes || 0) + 1; }
    }
    if (P.searchId >= 0) { const c = byId(P.searchId); if (!c || !c.lost || c.dead || c.fled || fl.time > P.searchUntil || goingOut()) P.searchId = -1; }
    if (P.plan === 'explore') {
      const valid = P.target >= 0 && (isFrontierTile(P.target) || (P.targetRoom >= 0 && !fl.rooms[P.targetRoom].visited));
      if (!valid || (fl.knowDirty && fl.time - fl.newKnowAt < 0.5)) { chooseTarget(L); fl.knowDirty = false; notThisWay(L, crew); replanAll(); }   // 1.22: notThisWay
      if (P.target < 0 && heartP()) { P.plan = 'assault'; partySay('assault', 3, L); replanAll(); }   // nothing left to explore: go for it
    }
    // A closed gate between the leader and where he wants to go. Prototype 1.01: even on the way to the heart they go and search
    // the rooms they have not been to in this wave (that is what a gate is for: it sends them through the rest of your dungeon).
    // Nothing left to search: they wait, and a thief tries to lever the gate up.
    const gateShut = [...fl.doors.values()].some(d => d.closedUntil > fl.time);
    if (gateShut && L.blocked >= 0 && !goingOut()) {
      P.blockT = (P.blockT || 0) + dt;
      if (P.blockT > 1.2 && !P.blockSaid) {
        P.blockSaid = true;
        const before = P.target, wasPlan = P.plan;
        if (P.plan === 'assault') { P.plan = 'explore'; P.gateDetourUntil = fl.time + 18; P.wantSearch = true; }
        if (P.plan === 'explore') { chooseTarget(L); replanAll(); }
        const moved = P.plan === 'explore' && P.target >= 0 && (P.target !== before || wasPlan !== 'explore');
        if (!moved && wasPlan === 'assault') { P.plan = 'assault'; P.gateDetourUntil = 0; }
        if (moved) fl.stats.reroutes = (fl.stats.reroutes || 0) + 1;
        sayNow(['gate'], () => say(L, pick(moved ? SAY.gateReroute : SAY.gateWait), 3, 2.2));
        if (!moved) P.liftT = 0;
      }
      if (P.blockSaid && P.plan !== 'explore') {   // waiting at the gate: a thief next to it levers it up in 3 s
        const door = [...fl.doors.values()].filter(d => d.closedUntil > fl.time).sort((a, b) => Math.hypot(a.x - L.tx, a.y - L.ty) - Math.hypot(b.x - L.tx, b.y - L.ty))[0];
        // 1.20 Łom: anyone with a crowbar levers it too (x1,5; a thief with one x2,25), a level 3 gate half as fast
        const near = h => !panicking(h) && !h.fleeing && Math.hypot(h.tx - door.x, h.ty - door.y) <= 1.6;
        const it = door && fl.items.get(key(door.x, door.y)), th = door && (alive().find(h => hasCrowbar(h) && near(h)) || alive().find(h => h.type === 'thief' && near(h)));
        if (it && it.type === 'gate' && th) {
          const bar = hasCrowbar(th);
          if (!P.liftT) { sawAdd(th, ['gate']); sayNow(['gate'], () => say(th, pick(bar ? SAY.crowbarGate : SAY.gateLever), 3, 2)); }
          P.liftT = (P.liftT || 0) + dt * (th.type === 'thief' ? (th.lvl >= 6 ? 1.5 : 1) : 1) * (bar ? 1.5 : 1) * ((it.lvl || 1) >= 3 ? 0.5 : 1);
          if (P.liftT >= 3) {
            door.closedUntil = fl.time; it.disabled = true; it.detected = true; fl.threatDirty = true; P.liftT = 0;
            if (bar) { fl.stats.crowbarGate = (fl.stats.crowbarGate || 0) + 1; tl('lm', th.id, 'gate'); }
            bt('gate').disarmed++; fl.stats.disarmed++; tl('lg', th.id, door.x, door.y);
            floatTile(door.x, door.y, 'Krata podważona', '#c9c2d8', 13, -0.6); replanAll();
          }
        }
      }
    } else { P.blockT = 0; P.liftT = 0; if (!gateShut) P.blockSaid = false; }
    if (P.gateDetourUntil && P.plan === 'explore' && (fl.time > P.gateDetourUntil || P.target < 0) && heartP() && !gateShut) { P.gateDetourUntil = 0; P.plan = 'assault'; replanAll(); }
    if (P.ambushN >= 3 && fl.time - P.ambushT < 0.6 && fl.time - (P.ambushSaid || -99) > 12) { P.ambushN = 0; P.ambushSaid = fl.time; talk(1.0, [pick(SAY.ambush)]); grp.forEach(h => addFear(h, 6, null, 'ambush')); }   // 1.17: the leader's group
    // small talk, flavoured by experience
    // small talk, flavoured by experience. 1.05 (author: they cheered about getting rich while running away): it knows what is
    // going on. On the way out it is about getting out, at rest about wounds; no talk of riches when scared, hurt or after a death.
    // Character speaks too, and sometimes someone answers.
    P.chatT -= dt;
    if (P.chatT <= 0) {
      P.chatT = P.plan === 'retreat' ? 3.5 + Math.random() * 3 : 7 + Math.random() * 6;   // 1.12.1: at rest they talk more
      const pool = crew.filter(o => !o.bubble && !panicking(o) && !caged(o) && !o.lost && o.state !== 'fight' && o.state !== 'smash' && !floorBusy(o));   // 1.10: small talk only into a silence
      const h0 = pool.length ? pick(pool) : null, h = h0 && Math.random() < 0.25 && bondTalk(h0, 30) ? null : h0, lines = [];   // 1.21: a word to his pair instead
      let mood = null;
      if (h && aloneNow(h) && !(h.fleeing || h.crystal || goingOut())) lines.push(...SOLO.chat, ...(h.trait === 'brave' && h.fear > 0.5 * h.courage ? [] : SOLO['chat_' + h.trait] || []), ...(SOLO['chat_' + h.type] || []));   // 1.13: alone he talks to himself (1.17: a scared brave one does not boast)
      else if (h && (h.fleeing || h.crystal || goingOut())) {
        lines.push(...SAY.chatFlee); if (h.crystal) lines.push(...SAY.chatCarrier, ...SAY.chatCarrier); if (h.hp < 0.4 * h.max) lines.push(...SAY.chatHurtOut);
      } else if (h && P.plan === 'retreat') lines.push(...SAY.chatRest, ...SAY.restScene);
      else if (h) {
        const scared = h.fear > 0.5 * h.courage, shaken = fl.time < h.shakenUntil + 6;
        if (h.hp < 0.4 * h.max) lines.push(...SAY.chatHurt);
        if (h.inv.length && !scared) { const H = HITEMS[h.inv[0].type]; lines.push(G3(H.g, 'Ten', 'Ta', 'Te') + ' ' + H.name + ' ' + G3(H.g, 'może', 'może', 'mogą') + ' się przydać.', 'Dobrze, że mam ' + H.acc + '.'); }
        if (scared) { lines.push(...SAY.chatScared); mood = 'fear'; }
        if (shaken) { lines.push(...SAY.shaken, ...SAY.shaken); mood = 'fear'; }   // a death is still on their mind
        if (h.gold >= 2) lines.push(...SAY.goldHeavy, ...SAY.chatGold);
        if (h.cursed) lines.push(...SAY.cursedPick);
        if (h.type === 'priest' && h.faith <= 1) lines.push(...SAY.faithLow);
        const low = crew.find(o => o !== h && o.hp < 0.3 * o.max && (canSee(h, o) || canHear(h, o)));   // 1.17: one he can see or hear
        if (low) lines.push(nameFill(pick(SAY.friendLow), low));
        if (fl.greed > 1.5 && !scared && !shaken && h.hp > 0.5 * h.max && !fl.stats.kills) { lines.push(...SAY.chatRich); if (!mood) mood = 'greed'; }
        if (h.trait && SAY['chat_' + h.trait] && !(h.trait === 'brave' && scared)) lines.push(...SAY['chat_' + h.trait]);
        if (h.type === 'bard') lines.push(...SAY.bardIdle); else if (h.type === 'barbarian') lines.push(...SAY.barbIdle);
        if (h.rank === 0 && !scared) lines.push(...SAY.rookie); else if (h.rank >= 2) lines.push(...SAY.elite);
        lines.push(...SAY.chatIdle);
      }
      // 1.17.1: only what he has seen; and now and then about something he saw this wave (two of the things he remembers)
      const sl = h && !aloneNow(h) && !(h.fleeing || h.crystal || goingOut()) ? sawTalk(h) : [];
      lines.push(...sl);
      const fit = h ? (sl.length && Math.random() < 0.45 ? sl : okLines(h, lines)) : [];   // almost half the time it is about what they saw
      const line = fit.length ? pick(fit) : null;
      if (h) fl.stats.chatTry = (fl.stats.chatTry || 0) + 1; if (line) fl.stats.chatPick = (fl.stats.chatPick || 0) + 1;
      if (line && say(h, line, 1, 2.2)) {
        // an answer now and then: courage for the scared, sense for the greedy
        const fearLine = mood === 'fear' && (SAY.shaken.includes(line) || SAY.chatScared.includes(line));
        const greedLine = mood === 'greed' && SAY.chatRich.includes(line);
        const ans = isRt(h.room, 'hush') ? null : fearLine ? crew.find(o => o !== h && !panicking(o) && !o.lost && (o.trait === 'brave' || o.id === P.leaderId || o.type === 'bard') && hdist(o, h) <= 6) : greedLine ? crew.find(o => o !== h && !o.lost && o.trait === 'careful' && hdist(o, h) <= 6) : null;
        if (ans && Math.random() < 0.6) P.queueSay.push({ id: ans.id, text: pick(fearLine ? SAY.reassure : SAY.surviveFirst), at: fl.time + 1.6 });
        else if (!ans && CHAT_REPLY[line] && Math.random() < 0.55) {   // 1.10: someone close by answers the everyday lines too
          const o = crew.find(x => x !== h && !x.lost && !panicking(x) && !caged(x) && earshot(x, h));
          const rep = o ? okLines(o, CHAT_REPLY[line]) : [];   // 1.17.1: an answer about what he has seen
          if (rep.length) P.queueSay.push({ id: o.id, text: pick(rep), at: fl.time + 0.4, prio: 1 });
        }
      }
    }
    // 1.05: the badly hurt call for the priest when he is not close; he answers and heads their way
    { const pr = crew.find(o => o.type === 'priest' && !o.lost && !panicking(o) && !caged(o));
      if (pr) crew.forEach(h => { if (h === pr || h.hp >= 0.4 * h.max || exiting(h) || h.lost || caged(h) || panicking(h) || fl.time < (h.healCallT || 0) || hdist(h, pr) <= 3 || isRt(h.room, 'hush') || !canHearShout(pr, h)) return;   // 1.10: in Głusza nobody hears him (1.17: nor out of shouting range)
        h.healCallT = fl.time + 14; say(h, nameFill(pick(SAY.callHealer), pr), 2); P.queueSay.push({ id: pr.id, text: pick(SAY.healerReply), at: fl.time + 1.1 }); pr.needPlan = true; pr.healFor = h.id; pr.healForUntil = fl.time + 10; fl.stats.healCalls = (fl.stats.healCalls || 0) + 1; }); }
    // 1.10: one of them goes for loot close by: the leader waits for him (at most 6 s) and may tell him to hurry
    if (P.plan !== 'retreat' && !fl.fearless && !goingOut() && L.intent !== 'loot') {
      const lt = crew.find(o => o !== L && o.intent === 'loot' && !o.lost && !panicking(o) && hdist(o, L) <= 8);
      if (lt) {
        if (P.lootWaitId !== lt.id) { P.lootWaitId = lt.id; P.lootWaitT = fl.time; if (Math.random() < 0.55) P.queueSay.push({ id: L.id, text: pick(SAY.lootWait), at: fl.time + 0.3, prio: 1 }); }
        if (fl.time - P.lootWaitT < 6) P.waitUntil = Math.max(P.waitUntil, fl.time + 0.4);
      } else P.lootWaitId = -1;
    }
    if (P.plan !== 'retreat' && !fl.fearless && !goingOut() && L.R.coord) {
      const far = crew.filter(h => h !== L && !h.lost && !onScout(h) && !inG2(h) && !panicking(h) && h.state !== 'fight' && !caged(h) && !exiting(h) && hdist(h, L) > 7);   // 1.17: not for one on his way out
      if (far.length && fl.time > P.waitUntil + 2) { P.waitUntil = fl.time + 1.6; fl.stats.regroups++; partySay('regroup', 2, L); }
    }
    // rookies wander off on their own
    if (P.plan === 'explore') crew.forEach(h => {
      if (h.rank !== 0 || h === L || h.lost || h.wanderUntil > fl.time || caged(h) || Math.random() > 0.004) return;
      const fr = frontier().filter(f => Math.hypot(f % WW - h.tx, ((f / WW) | 0) - h.ty) > 4);
      if (!fr.length) return;
      h.wanderTarget = pick(fr); h.wanderUntil = fl.time + 10; h.needPlan = true; fl.stats.wanders++; say(h, pick(SAY.wander), 2); startSplit(h, 'wander');
    });
  }
  // 1.05: a lost one calls and the party answers: the nearest one who hears him (14 steps, a bard 26) shouts back and he walks
  // towards the voice, through rooms he does not know too. A Kamień wyjec in his room turns the answer into echo.
  function answerLost(h) {
    const P = fl.party;
    if (fl.fearless || goingOut()) return;
    if (inB('howl', h.room)) { P.queueSay.push({ id: h.id, text: pick(SAY.echoLost), at: fl.time + 1.4 }); fl.stats.howlBlocks = (fl.stats.howlBlocks || 0) + 1; return; }
    if (isRt(h.room, 'hush')) { fl.stats.hushLost = (fl.stats.hushLost || 0) + 1; return; }   // 1.10: Głusza swallows his call
    const b = bfs(h.x, h.y, {});
    let best = null, bd = 1e9;
    alive().forEach(o => {
      if (o === h || o.lost || panicking(o) || caged(o) || o.fleeing || inB('howl', o.room)) return;
      const d = b.dist[tIdx(o)], range = o.type === 'bard' ? 26 : 14;
      if (d >= 0 && d <= range && d < bd) { bd = d; best = o; }
    });
    if (mods.falsecall && (!best || Math.random() < 0.6) && falseCall(h, b)) return;   // 1.18
    if (!best) return;
    h.hearUntil = fl.time + 7; h.hearId = best.id; h.needPlan = true; fl.stats.answers = (fl.stats.answers || 0) + 1; tl('an', best.id, h.id);
    P.queueSay.push({ id: best.id, text: nameFill(pick(best.type === 'bard' ? SAY.bardCall : SAY.answer), h), at: fl.time + 0.8 });
    P.queueSay.push({ id: h.id, text: pick(best.type === 'bard' ? SAY.lostHear : SAY.hearVoice), at: fl.time + 1.8 });
  }
  // 1.18 Fałszywe wołanie: a Nawiedzona sala within 14 steps of the lost one answers his call; he walks to the voice, to the middle of
  // the hall (h.hearGoal, planHero), and is still lost when he gets there. Kamień wyjec and Głusza still swallow his call (answerLost).
  function falseCall(h, b) {
    let goal = -1, gd = 1e9;
    fl.rooms.forEach(R => {
      if (R.rk !== 'haunt' || R.id === h.room || !R.tiles) return;
      const near = R.tiles.reduce((a, t) => { const d = b.dist[t[1] * WW + t[0]]; return d >= 0 && (a < 0 || d < a) ? d : a; }, -1);
      if (near < 0 || near > 14 || near >= gd) return;
      const mx = (R.x0 + R.x1 + 1) / 2, my = (R.y0 + R.y1 + 1) / 2;
      const c = R.tiles.filter(t => walkable(t[0], t[1]) && b.dist[t[1] * WW + t[0]] >= 0).sort((p, q) => Math.hypot(p[0] + 0.5 - mx, p[1] + 0.5 - my) - Math.hypot(q[0] + 0.5 - mx, q[1] + 0.5 - my))[0];
      if (c) { gd = near; goal = c[1] * WW + c[0]; }
    });
    if (goal < 0) return false;
    h.hearUntil = fl.time + 7; h.hearId = -1; h.hearGoal = goal; h.needPlan = true;
    fl.stats.falseCalls = (fl.stats.falseCalls || 0) + 1; tl('fc', h.id, goal);
    fl.party.queueSay.push({ id: h.id, text: pick(SAY.hearVoice), at: fl.time + 1.2 });
    return true;
  }
  // 1.16: the scout's next opening: the nearest known way into the unknown that does not lead back towards the party
  function nextScout(sc, L) {
    const b = bfs(sc.x, sc.y, { known: true }), dl = L ? Math.hypot(sc.tx - L.tx, sc.ty - L.ty) : 0;
    let best = -1, bd = 1e9;
    frontier().forEach(f => {
      const d = b.dist[f]; if (d < 0 || d > 14 || d >= bd) return;
      if (L && Math.hypot(f % WW - L.tx, ((f / WW) | 0) - L.ty) < dl) return;
      bd = d; best = f;
    });
    return best;
  }
  /* ----- getting lost, wrong turns ----- */
  // The chance to lose the way once cut off from the leader: bigger dungeon and fog = more, experience and a thief's sense = less.
  function lostChance(h) {
    const p = 0.12 + 0.03 * Math.max(0, roomCount() - 6) + (isRt(h.room, 'fog') ? (lanternNear(h) ? 0.15 : 0.45) : 0) - 0.01 * h.lvl - (h.type === 'thief' ? 0.1 : 0);   // 1.20: a lantern close by
    return clamp(p * (mentorNear(h) ? 0.7 : 1), 0.02, 0.6);   // 1.21: his mentor close by
  }
  // 1.20 Latarnia: the fog's roll on one a step away from the leader; a lit lantern within 2 tiles cuts it to 30% (lanternSaves)
  function fogRoll(h, dt) {
    const p = dt * 0.22 * Math.max(0.35, 1 - 0.03 * h.lvl) * (h.type === 'thief' ? 0.6 : 1), x = Math.random();
    if (x >= p) return false;
    if (x >= 0.3 * p && lanternNear(h)) { fl.stats.lanternSaves = (fl.stats.lanternSaves || 0) + 1; return false; }
    return true;
  }
  function getLost(h, why) {
    if (h.lost) return;
    h.lostEver = true;   // 1.20: a returner who got lost brings a lantern
    h.lost = true; h.sepRolled = true; h.lostT = 0; h.lostCallT = fl.time + 5; h.needPlan = true;
    if (h.split) { h.split = false; fl.stats.splitLost = (fl.stats.splitLost || 0) + 1; }   // 1.16: the errand went wrong: now he is lost
    h.wanderUntil = -1;
    fl.stats.gotLost++; tl('lo', h.id, why); say(h, pick(SAY.lost), 3);
    h.lostAt = fl.time; h.lostNoticed = false;   // 1.17: the leader decides when he notices him missing (perceiveThink)
  }
  // 1.17: the leader misses him (4 s out of his sight and earshot): go back for him (to where he was last seen), or go on
  function missLost(h, L) {
    const P = fl.party;
    h.lostNoticed = true;
    if (!L || L === h || P.searchId >= 0 || goingOut() || fl.fearless) return;
    const crew = groupOf(L), fearR = crew.reduce((a, o) => a + o.fear / o.courage, 0) / crew.length;
    const ls = P.seen && P.seen[h.id];
    if (L.rank >= 1 && fearR < 0.6 && Math.random() < 0.6 && ls) {
      P.searchId = h.id; P.searchUntil = fl.time + 14; P.searchGoal = ls.y * WW + ls.x; fl.stats.searches++; tl('se', h.id);
      P.queueSay.push({ id: L.id, text: nameFill(pick(SAY.searchLost), h), at: fl.time + 0.3 });
      L.needPlan = true;
    } else { P.queueSay.push({ id: L.id, text: nameFill(pick(SAY.leaveLost), h), at: fl.time + 0.3 }); if (ls) noLeave(h, L, ls.y * WW + ls.x); }   // 1.21: noLeave
  }
  // 1.17: who knows what. Every party tick: the leader's plan reaches those who see or hear him (h.plan); where each one was
  // last seen by the leader (P.seen); a death reaches those who did not see or hear it when they meet one who knows (one at a
  // time: the teller says it, the other takes it in, a smaller fright; the morale drops when the leader learns); a lost one is
  // missed after 4 s; one left behind when the rest are gone takes the plan and says so.
  function perceiveThink(L, crew) {
    const P = fl.party, seen = P.seen || (P.seen = {});
    sawSweep();   // 1.17.1: what each one sees
    // a new leader from somewhere else brings what he knows: the party goes by his plan (unless he is the last one in there)
    if (L && P.lastL !== L.id) { P.lastL = L.id; if (L.plan !== undefined && L.plan !== P.plan && crew.length > 1 && !L.crystal && !fl.stats.crystalTaken && !fl.fearless && !crew.some(o => o !== L && o.plan === P.plan)) P.plan = L.plan; }   // only when nobody who knew the old plan is left (never after a theft or once patience is over)
    crew.forEach(o => {
      if (o.plan === undefined) o.plan = P.plan;
      if (inG2(o)) { /* 1.19: the second group goes by its own leader's plan (g2Think) */ }
      else if (o === L || canSee(o, L) || canHear(o, L)) {
        if (o.plan !== P.plan) {
          const was = o.plan; o.plan = P.plan; o.needPlan = true;
          if (o === L && crew.length === 1 && goingOut() && !(was === 'flee' || was === 'leave' || was === 'escape')) say(o, pick(SAY.leftBehind), 3);
        }
      }
      if (L && (o === L || canSee(L, o) || canHear(L, o))) seen[o.id] = { x: o.tx, y: o.ty, t: fl.time };
      if (o.lost && !o.lostNoticed && fl.time - (o.lostAt || 0) >= 4 && L && !canHear(L, o) && !inG2(o)) missLost(o, L);
    });
    // 1.18 Odnalezione ciało: one who comes upon the body of a friend whose death he did not know of learns it there and then and
    // fears it like a witness (x2 when it lies in a Głusza, +50% a second copy)
    if (mods.body) (fl.deaths || []).forEach(d => {
      const dead = byId(d.id); if (!dead || d.x == null) return;
      const at = { tx: d.x, ty: d.y };
      crew.forEach(o => {
        if (d.knows.has(o.id) || panicking(o) || caged(o) || o.gone || !samePlace(o, at)) return;
        d.knows.add(o.id); sawAdd(o, ['blood']);   // he knows it before he says it (the line needs the death)
        const k = (d.hush ? 2 : 1) * (d.crypt ? 2 : 1) * (1 + 0.5 * (mods.body - 1)) * (o.trait === 'coward' ? 1.5 : 1), mate = bondOf(o) === dead;   // 1.21: his pair's body
        o.shakenUntil = fl.time + 9;
        if (mate) griefOf(o, dead, Math.max(15 * o.R.panic, 0.12 * o.courage + 4) * k / (o.trait === 'coward' ? 1.5 : 1), d, 0.2);
        else { const f0 = o.fear; addFear(o, Math.max(15 * o.R.panic, 0.12 * o.courage + 4) * k, null, 'death'); fl.stats.deathFear += Math.max(0, o.fear - f0); }
        if (o === L && !d.morale) { d.morale = true; P.morale = Math.max(0.15, P.morale - 0.25); }
        fl.stats.bodies = (fl.stats.bodies || 0) + 1; tl('bf', o.id, d.id);
        if (!mate) P.queueSay.push({ id: o.id, text: nameFill(pick(SAY.bodyFound), dead), at: fl.time + 0.2, prio: 3, late: 3 });
      });
    });
    (fl.deaths || []).forEach(d => {
      const dead = byId(d.id); if (!dead) return;
      for (const o of crew) {
        if (d.knows.has(o.id) || panicking(o) || caged(o)) continue;
        const k = crew.find(t => t !== o && d.knows.has(t.id) && !panicking(t) && (canSee(o, t) || canHear(o, t)));
        if (!k) continue;
        d.knows.add(o.id);
        const mate = bondOf(o) === dead, nb = 0.6 * Math.max(5 * o.R.panic, 0.05 * o.courage + 2) * (d.crypt ? 2 : 1) * (1 + mods.badnews);   // 1.21: his pair
        P.queueSay.push({ id: k.id, text: nameFill(pick(SAY.tellDeath), dead), at: fl.time + 0.2, prio: 3, late: 3 });
        o.shakenUntil = fl.time + 5;
        if (mate) griefOf(o, dead, nb, d, 0.4);
        else { P.queueSay.push({ id: o.id, text: pick(SAY.newsDeath), at: fl.time + 0.4, prio: 3, late: 4 }); const f0 = o.fear; addFear(o, nb, null, 'death'); fl.stats.deathFear += Math.max(0, o.fear - f0); }   // 1.18: Złe wieści
        if (o === L && !d.morale) { d.morale = true; P.morale = Math.max(0.15, P.morale - 0.25); }
        fl.stats.newsDeaths = (fl.stats.newsDeaths || 0) + 1;
        break;   // one at a time
      }
    });
  }
  // A wrong turn at a junction (a room with 3+ ways out): more likely in a big dungeon and in the fog, rarer for veterans who know the way.
  function maybeDetour(L, r) {
    const P = fl.party;
    if (P.detour || fl.fearless || goingOut() || L.lost || P.plan === 'retreat' || fl.time < (P.detourCd || 0)) return;
    const R = fl.rooms[r]; if (!R || R.kind !== 'room') return;
    const doors = R.doors.filter(d => !d.entrance), fog = isRt(r, 'fog');
    if (doors.length < 3 && !(fog && doors.length >= 2)) return;
    let p = 0.05 + 0.02 * Math.max(0, roomCount() - 6) + (fog ? 0.25 : 0) - 0.004 * L.lvl - (L.type === 'thief' ? 0.03 : 0);
    if (heartP() && P.plan === 'assault' && L.rank >= 2) p *= 0.5;
    if (Math.random() >= clamp(p, 0, 0.4)) return;
    const next = new Set(L.path.slice(0, 10).map(t => key(t[0], t[1])));
    const cand = doors.filter(d => !next.has(key(d.x, d.y)) && !(d.x === L.x && d.y === L.y) && fl.known[d.y * WW + d.x]);
    if (!cand.length) return;
    const d = pick(cand), H = fl.rooms[d.b];
    let goal = d.y * WW + d.x;
    if (H && H.kind === 'hall') { const far = H.doors.find(o => o !== d); if (far && fl.known[far.y * WW + far.x]) goal = far.y * WW + far.x; }   // down that corridor to its far end
    P.detour = { goal, until: fl.time + 10 }; P.detourCd = fl.time + 15; fl.stats.detours++; tl('dt', d.x, d.y);
    say(L, pick(SAY.detour), 3); L.needPlan = true;
  }
  /* ----- 1.17: curiosity ----- */
  // Author (21.10): "more realistic, more natural exploring, curiosity, let them look around". A leader walking into a room
  // the party has not looked around in this wave may stop there for a while (one roll a room): likelier for a careful, greedy
  // or green leader and in a room with something to see (furniture, a portrait, a mirror, a coffin, bones, a komnata), never
  // when they hurry, are scared, late, hurt or fighting. Each one standing with him picks something, walks up to it, looks at
  // it for 1,5-3 s and says what he sees; furniture gets searched: a coin now and then, and a mimic, a powder keg or a music
  // box sitting on it may go off in his hands at the end (so you get the first chance to fire it yourself). A coward may stay
  // by the leader. The leader waits, then calls them on. A trap going off, a wound, a panic, a new plan: it ends at once.
  const LOOK_PROP = { portrait: 1, mirror: 1, eyes: 1, coffin: 1, bones: 1 };
  const SEARCH_TRAP = { mimic: 0.55, musicbox: 0.45, powder: 0.2 };   // searching the furniture sets off what sits on it
  const SEARCH_GOLD = { crate: 1, barrel: 1, shelf: 1 };
  function lookSpots(r, L) {
    const R = fl.rooms[r], out = [];
    const stands = (x, y, wall) => (wall ? wallDirs(x, y) : DIRS).map(d => [x + d[0], y + d[1]])
      .filter(t => roomOf(t[0], t[1]) === r && fl.known[t[1] * WW + t[0]] && standOk(L, t[0], t[1])).map(t => t[1] * WW + t[0]);
    fl.objects.forEach(o => {
      if (roomOf(o.x, o.y) !== r) return;
      const it = fl.items.get(key(o.x, o.y));
      if (it && it.detected && !it.disabled) return;   // a trap they know about: they keep away
      const st = stands(o.x, o.y); if (st.length) out.push({ kind: 'obj', sub: o.kind, x: o.x, y: o.y, st, it: it && SEARCH_TRAP[it.type] ? it : null });
    });
    fl.items.forEach(it => {
      if (!LOOK_PROP[it.type] || (it.detected && !it.disabled) || slotRoom(it.type, it.x, it.y) !== r) return;
      const st = stands(it.x, it.y, !!WALL_TRAP[it.type]); if (st.length) out.push({ kind: 'prop', sub: it.type, x: it.x, y: it.y, st });
    });
    if (R.rk && SAY.lookKind[R.rk]) {
      const mx = Math.floor((R.x0 + R.x1 + 1) / 2), my = Math.floor((R.y0 + R.y1 + 1) / 2);
      let st = stands(mx, my); if (!st.length && roomOf(mx, my) === r && standOk(L, mx, my)) st = [my * WW + mx];   // next to its centre, looking at it
      if (st.length) out.push({ kind: 'rk', sub: R.rk, x: mx, y: my, st });
    }
    // a bare wall or two: a floor tile by the wall, looking at it
    const edge = R.tiles.filter(t => standOk(L, t[0], t[1]) && DIRS.some(d => tileAt(t[0] + d[0], t[1] + d[1]) === WALL || tileAt(t[0] + d[0], t[1] + d[1]) === ROCK));
    for (let k = 0; k < 2 && edge.length; k++) {
      const t = edge.splice(Math.floor(Math.random() * edge.length), 1)[0], d = DIRS.find(q => tileAt(t[0] + q[0], t[1] + q[1]) !== FLOOR && tileAt(t[0] + q[0], t[1] + q[1]) !== DOOR);
      out.push({ kind: 'wall', sub: 'wall', x: t[0] + d[0], y: t[1] + d[1], st: [t[1] * WW + t[0]] });
    }
    return out;
  }
  // how much a hero wants to look at a thing (lower = more): a greedy one or a thief goes for furniture, a priest for the dead,
  // a mage for mirrors and odd walls, a barbarian for weapons and fire, a bard for statues and the gallery
  const LOOK_LIKE = { greedy: { obj: 2.5 }, thief: { obj: 1.5 }, priest: { coffin: 2.5, bones: 2.5, ossuary: 2.5, haunt: 1.5 }, mage: { mirror: 2, eyes: 2, haunt: 1.5 },
    barbarian: { armory: 2.5, forge: 2.5, ogre: 1.5 }, bard: { statue: 2, gallery: 2.5, nursery: 1.5, portrait: 1.5 }, warrior: { armory: 2, statue: 1 } };
  const lookPref = (h, s) => { const a = LOOK_LIKE[h.trait] || {}, b = LOOK_LIKE[h.type] || {}; return (a[s.kind] || 0) + (a[s.sub] || 0) + (b[s.kind] || 0) + (b[s.sub] || 0) - (s.kind === 'wall' ? 1.5 : 0); };
  function lookRoll(L, r) {
    const P = fl.party, R = fl.rooms[r], crew = alive();
    (P.lookRolled || (P.lookRolled = new Set())).add(r);
    if (P.plan !== 'explore' || fl.fearless || goingOut() || P.council || P.detour || P.prep || P.aheadWait >= 0 || fl.time < P.lookCd || L.lost || talking(L)) return;
    if (fl.patT > 0.8 * S.waveTime || P.morale < 0.45 || groupOf(L).some(o => panicking(o) || o.state === 'fight') || roomOf(L.tx, L.ty) !== r) return;
    if ([...fl.items.values()].some(m => MONSTERS[m.type] && m.hp > 0 && roomOf(m.x, m.y) === r && !hiddenAmbush(m))) return;   // 1.18: not one hiding in ambush
    const grpL = groupOf(L), avgHp = grpL.reduce((a, o) => a + o.hp / o.max, 0) / grpL.length;
    const spots = lookSpots(r, L), objs = spots.filter(s => s.kind !== 'wall').length;
    const p = ({ careful: 0.5, greedy: 0.55, brave: 0.35, coward: 0.15 }[L.trait] || 0.4) + (L.rank === 0 ? 0.15 : 0) + (objs >= 2 ? 0.2 : objs ? 0.1 : -0.2) + (R.rk ? 0.15 : 0) - (avgHp < 0.5 ? 0.25 : 0) - (fl.patT > 0.6 * S.waveTime ? 0.15 : 0) + (R.rk === 'junk' ? 0.3 * mods.drawers : 0);   // 1.18: Zastawione szuflady
    const g = talkGroup(L);
    if (Math.random() >= p) {   // no time for sightseeing: a greedy one or a rookie may still ask, and hear no
      const w = spots.some(s => s.kind === 'obj') && Math.random() < 0.3 ? g.find(o => o !== L && (o.trait === 'greedy' || o.rank === 0) && !talking(o)) : null;   // asks about the furniture
      if (w) { talkAs(1.5, [[w, pick(SAY.lookWant)], [L, pick(SAY.lookHurry)]], L); fl.stats.lookNo = (fl.stats.lookNo || 0) + 1; }
      return;
    }
    const lookers = g.filter(o => o !== L && !o.crystal && !exiting(o) && !panicking(o) && !caged(o) && !onScout(o) && !talking(o) && o.hp > 0.3 * o.max);
    if (!lookers.length) lookers.push(L);   // on his own he looks around himself
    const left = spots.slice(), ids = [], stay = [];
    lookers.sort(() => Math.random() - 0.5).forEach(o => {
      if (o !== L && o.trait === 'coward' && Math.random() < 0.6) { if (Math.random() < 0.4) stay.push(o); return; }
      let best = -1, bs = 1e9;
      left.forEach((s, i) => {
        const d = Math.min(...s.st.map(j => Math.abs(j % WW - o.tx) + Math.abs(((j / WW) | 0) - o.ty)));
        if (o.trait === 'coward' && d > 3) return;
        const sc = d - lookPref(o, s) + Math.random() * 3; if (sc < bs) { bs = sc; best = i; }
      });
      if (best < 0) return;
      const s = left.splice(best, 1)[0];
      o.look = { kind: s.kind, sub: s.sub, x: s.x, y: s.y, st: s.st, it: s.it || null, dwell: 1.5 + Math.random() * 1.5, at: -1, done: false };
      o.needPlan = true; ids.push(o.id);
    });
    if (!ids.length) return;
    stay.forEach(o => P.queueSay.push({ id: o.id, text: pick(SAY.lookStay), at: fl.time + 1.2, prio: 1, late: 3 }));   // only when others do go
    P.look = { room: r, t0: fl.time, until: fl.time + 10, ids };
    fl.stats.looks = (fl.stats.looks || 0) + 1; tl('lk', r, ids.length);
    if (!ids.includes(L.id)) P.waitUntil = Math.max(P.waitUntil, fl.time + 1);
    say(L, pick(SAY.lookStart), 2);
  }
  function lookThink(L, crew) {
    const P = fl.party;
    if (P.lookAsk && fl.time >= P.lookAsk.at) { const a = P.lookAsk; P.lookAsk = null; if (L && !(P.lookRolled && P.lookRolled.has(a.room)) && L.room === a.room) lookRoll(L, a.room); }
    const lk = P.look; if (!lk) return;
    const ids = lk.ids.map(byId).filter(o => o && !o.dead && !o.fled && !o.gone);
    const near = L ? groupOf(L) : [];   // 1.17: what happens to them, or in this room, or close enough to hear
    const stop = P.plan !== 'explore' || fl.fearless || goingOut() || !!P.council || !L || L.lost || (fl.lastTrapAt > lk.t0 && (fl.lastTrapRoom === lk.room || (P.sound && P.sound.t > lk.t0))) ||
      near.some(o => panicking(o) || o.hurtAt > lk.t0 || o.state === 'fight');
    const done = ids.every(o => !o.look || o.look.done || o.lost || caged(o));
    if (stop || done || fl.time > lk.until) {
      P.look = null; P.lookCd = fl.time + 18; ids.forEach(o => { o.look = null; o.needPlan = true; });
      P.waitUntil = Math.min(P.waitUntil, fl.time);
      if (L) { L.needPlan = true; if (!stop) P.queueSay.push({ id: L.id, text: pick(SAY.lookEnd), at: fl.time + 0.4, prio: 2, late: 3 }); }
      return;
    }
    if (L && !(L.look && !L.look.done)) P.waitUntil = Math.max(P.waitUntil, fl.time + 0.5);   // the leader waits for them
  }
  // planHero: walk up to the thing, look at it, search it; null when there is nothing (left) to do
  function lookJob(h, B) {
    const lk = h.look, P = fl.party;
    if (!lk || lk.done || !P.look) return null;
    if (lk.st.includes(tIdx(h))) {
      if (lk.at < 0) { lk.at = fl.time; lookArrive(h, lk); }
      const left = lk.at + lk.dwell - fl.time;
      if (left > 0) { lookAt(h, lk.x, lk.y); h.glanceT = 1; return { stand: Math.min(0.5, left) }; }
      lookDone(h, lk); return null;
    }
    const g = nearestOf(B(), lk.st);
    if (g < 0 || pathFrom(B(), g).length > 12) { lk.done = true; return null; }
    return { intent: 'look', goal: g };
  }
  function lookArrive(h, lk) {
    const t = lk.kind === 'obj' ? SAY.lookObj[lk.sub] : lk.kind === 'prop' ? SAY.lookProp[lk.sub] : lk.kind === 'rk' ? SAY.lookKind[lk.sub] : SAY.lookWall;
    if (t && Math.random() < (lk.kind === 'wall' ? 0.5 : 0.8)) fl.party.queueSay.push({ id: h.id, text: pick(t), at: fl.time + 0.1, prio: 1, late: 2.5 });
  }
  function lookDone(h, lk) {
    lk.done = true; h.needPlan = true;
    if (lk.kind === 'prop') { framesWake(h, lk); return; }   // 1.18: Spojrzenie z ramy
    if (lk.kind !== 'obj') return;
    const it = lk.it;
    // 1.18 Zastawione szuflady: in a Graciarnia what sits on the furniture goes off (1 + copies) times as often, at most 95%
    const pT = it ? (mods.drawers && rkOf(roomOf(lk.x, lk.y)) === 'junk' ? Math.min(0.95, SEARCH_TRAP[it.type] * (1 + mods.drawers)) : SEARCH_TRAP[it.type]) : 0;
    if (it && fl.items.get(key(it.x, it.y)) === it && !it.disabled && !it.detected && it.cd <= 0 && Math.random() < pT) {
      fl.stats.lookTraps = (fl.stats.lookTraps || 0) + 1; tl('lt', h.id, it.type, it.x, it.y); fire(it, 1); return;
    }
    if (!SEARCH_GOLD[lk.sub]) return;
    if (Math.random() < (h.trait === 'greedy' || h.type === 'thief' ? 0.3 : 0.18) * (1 + mods.coins)) {   // 1.18: Podrzucone grosze x2
      h.gold = (h.gold || 0) + 1; sawAdd(h, ['gold']); fl.stats.goldFound = (fl.stats.goldFound || 0) + 1; floatHero(h, '+1 złota', '#f2c94c', 12, -0.7);
      if (mods.coins) {   // 1.18 Podrzucone grosze: the coin pulls like Monety seen (noticeLoot's formula, fading the same way)
        const g = LOOT_GREED.gold[0] * mods.greedMult * (1 + mods.goldDust) / (1 + 0.15 * fl.stats.lootSeen);
        greedOrbs(h.tx, h.ty, addGreed(g)); fl.stats.lootSeen++; fl.stats.coinGreed = (fl.stats.coinGreed || 0) + g;
      }
      fl.party.queueSay.push({ id: h.id, text: pick(SAY.lookFind), at: fl.time + 0.1, prio: 2, late: 2.5 });
    } else if (Math.random() < 0.45) fl.party.queueSay.push({ id: h.id, text: pick(SAY.lookNothing), at: fl.time + 0.1, prio: 1, late: 2.5 });
  }
  // 1.18 Spojrzenie z ramy: in a Galeria, the portrait, eyes or mirror he looks at wakes up: if it is ready (and they do not know it),
  // it goes off on him by itself with 1,5 times the power (+0,5 a copy)
  function framesWake(h, lk) {
    if (!mods.frames || !(lk.sub === 'portrait' || lk.sub === 'eyes' || lk.sub === 'mirror')) return false;
    const it = fl.items.get(key(lk.x, lk.y));
    if (!it || it.type !== lk.sub || it.disabled || it.detected || it.cd > 0 || it.jamUntil > fl.time || rkOf(slotRoom(it.type, it.x, it.y)) !== 'gallery') return false;
    fl.stats.frames = (fl.stats.frames || 0) + 1; tl('fw', h.id, it.type, it.x, it.y);
    return fire(it, 1 + 0.5 * mods.frames);
  }
  // 1.17: a trap goes off where none of them can see it: the nearest calm one within 12 tiles (not in that room, not in a
  // Głusza, and the trap not in one) hears it, may say so, and those in earshot of him turn that way. A scream when it caught
  // one of them. The party remembers where it was for 25 s (chooseTarget: a brave, greedy or green leader goes to look, a
  // careful one or a coward keeps away).
  function hearFar(it, hit) {
    const P = fl.party; if (!P || fl.phase !== 'raid' || fl.time < P.soundCd || goingOut()) return;
    const r = slotRoom(it.type, it.x, it.y); if (r >= 0 && isRt(r, 'hush')) return;
    const cx = it.x + 0.5, cy = it.y + 0.5, dd = o => Math.hypot(o.tx + 0.5 - cx, o.ty + 0.5 - cy);
    const c = alive().filter(o => !o.lost && !panicking(o) && !caged(o) && !exiting(o) && o.room !== r && !isRt(o.room, 'hush') && dd(o) <= 12 && !hit.includes(o));
    if (!c.length) return;
    const h = c.reduce((a, o) => dd(o) < dd(a) ? o : a, c[0]), v = hit.find(o => !o.dead);
    P.soundCd = fl.time + 10; const Lh = leader(); if (Lh && (h === Lh || canHear(Lh, h))) P.sound = { x: it.x, y: it.y, t: fl.time, room: r };   // 1.17: the leader steers by it only if he heard it too
    fl.stats.heard = (fl.stats.heard || 0) + 1; tl('hs', h.id, it.type);
    if (v || Math.random() < 0.65) P.queueSay.push({ id: h.id, text: v ? nameFill(pick(SAY.hearScream), v) : pick(SAY.hearSound), at: fl.time + 0.3, prio: 2, late: 2.5 });
    alive().forEach(o => { if (!o.lost && !panicking(o) && !caged(o) && (o === h || earshot(o, h))) { lookAt(o, it.x, it.y); o.glanceT = 2.5; } });
  }
  // 1.18 Zepsute mikstury: a potion from your loot (pickup marks it) heals half and scares the one who drinks it (10% of his courage a copy)
  function taintedSip(h, pot) {
    if (!pot || !pot.tainted) return 1;
    addFear(h, 0.1 * Math.max(1, mods.tainted) * h.courage, null, 'potion'); fl.stats.tainted = (fl.stats.tainted || 0) + 1; tl('ta', h.id);
    floatHero(h, 'Zepsuta!', '#9fbf6a', 12, -1.1);
    return 0.5;
  }
  /* ----- powers with a cooldown (talisman, amulet, boots): the hero decides when ----- */
  const powerReady = (h, t) => h.inv.find(x => x.type === t && fl.time >= (x.cdUntil || 0) && (x.charges === undefined || x.charges > 0));
  function usePower(h, it) { it.cdUntil = fl.time + HITEMS[it.type].cd * (h.cursed ? 1.5 : 1); if (it.charges !== undefined) it.charges--; fl.stats.itemsUsed++; }
  // Talisman: a 3 s ward against trap damage (25% at the first level, +5% a level, at most 40%). A few uses a wave. Rookies switch it on
  // after a hard hit, veterans also right before a trap they know about.
  function useCharm(h, why) {
    if (h.dead || fl.time < h.wardUntil) return false;
    const it = powerReady(h, 'charm'); if (!it) return false;
    if (why === 'danger' && (h.rank < 1 || (h.rank < 2 && Math.random() < 0.5))) return false;
    usePower(h, it);
    h.wardUntil = fl.time + 3; h.wardK = Math.min(0.4, 0.25 + 0.05 * (it.r - 1)) * Math.min(1, itemPow(h));
    fl.stats.charms++; tl('pw', h.id, 'charm'); say(h, pick(SAY.charmUse), 3); floatHero(h, 'Talizman', '#7fb8ff', 13, -0.7);
    return true;
  }
  // Amulet: when the nerves are about to go, it takes a chunk of fear away (12% of courage at the first level, +4% a level)
  // and dulls new fear for 4 s. Rookies reach for it late (at 85% of what makes them run), veterans at 70%, elites at 60%.
  function useAmulet(h) {
    if (h.dead || fl.time < h.calmUntil) return false;
    const it = powerReady(h, 'amulet'); if (!it) return false;
    usePower(h, it);
    const alt = inB('altar', h.room);   // a blasphemous altar smothers holy amulets too
    h.fear = Math.max(0, h.fear - (0.08 + 0.04 * Math.min(4, it.r)) * itemPow(h) * (alt ? 0.5 : 1) * h.courage); h.calmUntil = fl.time + (alt ? 2 : 4);
    if (alt) fl.stats.altarBlocks = (fl.stats.altarBlocks || 0) + 1;
    fl.stats.amulets++; tl('pw', h.id, 'amulet'); say(h, pick(SAY.amuletUse), 3); floatHero(h, 'Amulet', '#c3b2ff', 13, -0.7);
    const p = heroPos(h); particles.push({ ring: true, x: p.x, y: p.y, r: 0.2, maxR: 1.3, life: 0.45, color: '#c3b2ff' });
    return true;
  }
  // Boots: a 3 s sprint, for running out (with or without the crystal), dashing past a known trap, or finding the others.
  function useBoots(h, why) {
    if (h.dead || fl.time < h.sprintUntil) return false;
    const it = powerReady(h, 'boots'); if (!it) return false;
    usePower(h, it);
    h.sprintUntil = fl.time + 3; h.sprintK = 1 + (0.3 + 0.1 * Math.min(3, it.r)) * Math.min(1, itemPow(h));
    fl.stats.boots++; tl('pw', h.id, 'boots'); if (why !== 'quiet') say(h, pick(SAY.bootsUse), 2);
    return true;
  }
  /* ----- a room they know is deadly: stop at the door, prepare, then rush through ----- */
  // Known threat in a room: traps they know about (wall traps count for the room they face) and monsters they can see.
  function roomThreat(r) {
    let t = 0;
    fl.items.forEach(it => {
      if (LOOKS_TRAP(it.type) && it.detected && !it.disabled && !(it.jamUntil > fl.time) && slotRoom(it.type, it.x, it.y) === r) t += SCARE[it.type] ? 0.7 : 1;
      else if (MONSTERS[it.type] && it.hp > 0 && fl.known[it.y * WW + it.x] && roomOf(it.x, it.y) === r) t += 1.5;
    });
    return t;
  }
  function checkPrep(L) {
    const P = fl.party;
    if (fl.fearless || goingOut() || L.lvl < 3 || !L.path.length || fl.time < P.prepCd) return;
    const cur = roomOf(L.tx, L.ty);
    for (let i = 0; i < Math.min(5, L.path.length); i++) {
      const r = roomOf(L.path[i][0], L.path[i][1]);
      if (r < 0 || r === cur || fl.rooms[r].kind !== 'room') continue;
      if (!P.prepped.has(r) && roomThreat(r) >= 3) startPrep(r);
      return;
    }
  }
  function startPrep(r) {
    const P = fl.party, L0 = leader(), crew = talkGroup(L0);   // 1.13: the ones standing with the leader (the rest go on)
    if (!crew.length || crew.some(talking)) return;
    P.prepped.add(r); fl.stats.preps++;
    const find = (t, lv, extra) => crew.find(h => h.type === t && h.lvl >= lv && (!extra || extra(h)));
    const pr = find('priest', 3, h => h.faith >= 2), mg = find('mage', 5, h => fl.time >= (h.jamCd || 0)), th = find('thief', 4), wr = find('warrior', 3);
    const L = leader(), lines = [[L, pick(SAY.prepStart)]];
    // 1.13.3 (author: the scene was too long, up to 7 lines, 8-19 s): at most two of the specialists say what they will do
    // (picked at random; all of them still do it in finishPrep) and the leader's "go" is the rush line there, not one more
    // here; with no specialist a friend answers him (alone, he says his own "go")
    // 1.17: the mage and the thief only speak of traps when the room has traps they know of (it may be monsters only)
    const trapsKnown = [...fl.items.values()].some(it => LOOKS_TRAP(it.type) && it.detected && !it.disabled && slotRoom(it.type, it.x, it.y) === r);
    const spec = [[pr, 'prepWard'], [trapsKnown && mg, 'prepJam'], [trapsKnown && th, 'prepDisarm'], [wr, 'prepShield']].filter(s => s[0]);
    for (let i = spec.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spec[i], spec[j]] = [spec[j], spec[i]]; }
    spec.slice(0, 2).forEach(s => lines.push([s[0], pick(SAY[s[1]])]));
    if (lines.length === 1) { const rep = crew.find(h => h !== L); lines.push(rep ? [rep, pick(SAY.prepReply)] : [L, pick(SAY.prepGo)]); }
    // 1.12.1: the stop lasts as long as the scene (it was 2,4 s, most lines never came)
    const dur = Math.max(3, talkLen(lines.map(l => l[1])));
    P.prep = { room: r, until: fl.time + dur, pr: pr ? pr.id : -1, mg: mg ? mg.id : -1, th: th ? th.id : -1, wr: wr ? wr.id : -1 };
    P.talkUntil = Math.max(P.talkUntil, fl.time + dur); crew.forEach(h => { h.talkUntil = fl.time + dur; });
    lines.forEach((l, i) => P.queueSay.push({ id: l[0].id, text: l[1], at: fl.time + i * 0.5 }));
    huddleUp(L);
    crew.forEach(h => {   // experienced heroes drink up before walking into it
      if (h.lvl < 4 || h.hp >= 0.7 * h.max) return;
      const pot = h.inv.filter(x => x.type === 'potion').sort((a, c) => c.r - a.r)[0];
      if (pot) { h.inv.splice(h.inv.indexOf(pot), 1); h.hp = Math.min(h.max, h.hp + h.max * potionHeal(pot) * itemPow(h) * taintedSip(h, pot)); fl.stats.potions++; fl.stats.itemsUsed++; floatHero(h, 'Mikstura', '#8be38f', 14, -0.7); }   // 1.18: Zepsute mikstury
    });
    tl('pp', r, pr ? 1 : 0, mg ? 1 : 0, th ? 1 : 0, wr ? 1 : 0);
  }
  function finishPrep() {
    const P = fl.party, pp = P.prep, r = pp.room, R = fl.rooms[r];
    P.prep = null; P.prepCd = fl.time + 4;
    const ok = id => { const h = byId(id); return h && !h.dead && !h.fled && !h.gone && !caged(h) && !h.fleeing ? h : null; };
    const pr0 = ok(pp.pr), mg = ok(pp.mg), th = ok(pp.th), wr = ok(pp.wr);
    const pr = pr0 && pr0.faith >= 2 ? pr0 : null;
    if (pr0 && !pr) { say(pr0, pick(SAY.faithLow), 3); fl.stats.faithOut++; }
    alive().forEach(o => { if (!o.lost && !caged(o) && !o.fleeing) useCharm(o, 'prep'); });   // talismans on before the rush
    if (pr) {   // a ward on everyone, stronger with the priest's level (half as strong under a blasphemous altar); it costs 2 faith
      pr.faith -= 2;
      const alt = inB('altar', r);
      const frac = (0.15 + 0.012 * pr.lvl) * (alt ? 0.5 : 1), brave0 = Math.pow(0.85, 1 + pr.lvl / 5), brave = alt ? 1 - (1 - brave0) / 2 : brave0;
      alive().forEach(o => { o.shield = Math.max(o.shield, o.max * frac); o.braveUntil = fl.time + 10; o.braveK = brave; });
      if (alt) { sayNow(['altar'], () => say(pr, pick(SAY.bAltar), 4)); fl.stats.altarBlocks = (fl.stats.altarBlocks || 0) + 1; }
      if (pr.lvl >= 6) {
        fl.items.forEach(m => { if ((m.type === 'ghost' || m.type === 'shade') && m.hp > 0 && roomOf(m.x, m.y) === r) { hurtMonster(m, 40 * pr.R.pow * (alt ? 0.5 : 1)); burst(m.gx || m.x + 0.5, m.gy || m.y + 0.5, '#fff2c0', 12); } });   // exorcism (half as strong at the altar)
        let nb = 2 + Math.floor((pr.lvl - 6) / 2);   // and a few known portraits there lose their curse for this wave (half as many at the altar)
        if (alt) nb = Math.max(1, Math.floor(nb / 2));
        fl.items.forEach(it => { if (nb <= 0 || !CURSED[it.type] || !it.detected || it.disabled || slotRoom(it.type, it.x, it.y) !== r) return; nb--; it.disabled = true; fl.stats.blessed++; bt(it.type).disarmed++; floatTile(it.x, it.y, 'Odczyniony', '#fff2c0', 13); });
        fl.threatDirty = true;
      }
      fl.stats.wards++; const p = heroPos(pr); particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 3.5, life: 0.5, color: '#7fb8ff' }); floatHero(pr, 'Osłona!', '#7fb8ff', 14, -0.8);
    }
    if (mg && inB('rune', r)) {   // the rune stone swallows the spell
      mg.jamCd = fl.time + 12; fl.stats.runeBlocks = (fl.stats.runeBlocks || 0) + 1;
      sayNow(['rune'], () => say(mg, pick(SAY.bRune), 4)); floatTile((R.x0 + R.x1) >> 1, (R.y0 + R.y1) >> 1, 'Runa tłumi czar', '#9fd0ff', 14, -0.6);
    } else if (mg) {   // every trap in that room goes quiet for a few seconds
      const dur = 2 + 0.25 * mg.lvl;
      fl.items.forEach(it => { if (TRAPS[it.type] && slotRoom(it.type, it.x, it.y) === r) it.jamUntil = fl.time + dur; });
      mg.jamCd = fl.time + 12; fl.stats.jams++; fl.threatDirty = true;
      fxTiles(R.tiles, '170,120,255', Math.min(dur, 3)); floatTile((R.x0 + R.x1) >> 1, (R.y0 + R.y1) >> 1, 'Pułapki zakłócone!', '#c3b2ff', 15, -0.6);
    }
    if (th) {   // the thief takes apart what he can reach from the doorway
      let k = 1 + Math.floor((th.lvl - 4) / 4);
      fl.items.forEach(it => {
        if (k <= 0 || !DISARMABLE[it.type] || !it.detected || it.disabled || slotRoom(it.type, it.x, it.y) !== r) return;
        k--; fl.stats.prepDisarms++;
        if (it.type === 'decoy') { decoyAlarm(it, th); return; }
        if (Math.random() < th.R.fail && it.cd <= 0) { fl.stats.disarmFails++; fire(it, 1); return; }
        if (rigged(it)) return;
        if (Math.random() < th.R.sapper) { fl.items.delete(key(it.x, it.y)); fl.stats.sapped++; bt(it.type).sapped = (bt(it.type).sapped || 0) + 1; floatTile(it.x, it.y, 'Rozmontowane!', '#ff9a9a', 14); }
        else { it.disabled = true; floatTile(it.x, it.y, 'Rozbrojone', '#a69bbb', 13); }
        fl.stats.disarmed++; bt(it.type).disarmed++; fl.threatDirty = true;
      });
    }
    if (wr) { wr.shieldUpUntil = fl.time + 5; wr.shieldCd = fl.time + 5 + wr.R.shieldCd; fl.stats.shields++; }
    P.rushUntil = fl.time + 6;
    const L = leader(); if (L) say(L, pick(SAY.rush), 3);
    alive().forEach(h => { h.needPlan = true; if (h.state === 'talk') h.state = 'walk'; h.talkUntil = -1; });
    P.talkUntil = fl.time;
    tl('pf', r);
  }
  function isFrontierTile(i) {
    const x = i % WW, y = (i / WW) | 0;
    if (!fl.known[i]) return false;
    for (const d of DIRS) { const nx = x + d[0], ny = y + d[1], ni = ny * WW + nx; if (!fl.known[ni] && (tileAt(nx, ny) === FLOOR || tileAt(nx, ny) === DOOR)) return true; }
    return false;
  }
  function randomKnownFar(h) {
    let best = -1, bd = -1;
    for (let k = 0; k < 40; k++) {
      const x = rand(1, WW - 2), y = rand(1, WH - 2), i = y * WW + x;
      if (!fl.known[i] || !passable(x, y)) continue;
      const d = Math.hypot(x - h.tx, y - h.ty) - 0.3 * Math.hypot(x - fl.ent.x, y - fl.ent.y);
      if (d > bd) { bd = d; best = i; }
    }
    return best;
  }
  function nearestOf(b, list) { let best = -1, bd = 1e9; list.forEach(i => { const d = b.dist[i]; if (d >= 0 && d < bd) { bd = d; best = i; } }); return best; }
  // One hero decides what to do next and finds a path there (only through tiles the party knows).
  function planHero(h) {
    h.needPlan = false; h.thinkT = 0.45 + Math.random() * 0.3;
    if (h.huddle) { if (h.path.length && talking(h)) return; h.huddle = false; }   // 1.12.1: on his way into the huddle
    if (h.toSafe) { if (h.path.length) return; h.toSafe = false; }   // 1.13: on his way off a trap
    if (h.gone || caged(h)) { h.path = []; return; }
    const P = fl.party, L = groupLeaderOf(h), G2 = inG2(h) ? P.g2 : null;   // 1.19: one of the second group follows its own leader
    let goal = -1, intent = 'follow', noDanger = false, b = null;
    const B = () => b || (b = bfs(h.x, h.y, { known: true, noDanger, avoid: h.R.avoid * (h.fleeing ? 0.6 : 1) * (h.trait === 'careful' ? 1.3 : h.trait === 'greedy' ? 0.85 : 1) }));
    planB = null;
    const exitG = () => { planB = B(); return exitGoal(); };
    // the heart, or (when rumours told them where it is but not how to get there) the opening that looks closest to it
    const heartGoal = () => {
      const g = nearestOf(B(), heartGoals()); if (g >= 0) return g;
      let best = -1, bs = 1e9;
      frontier().forEach(f => { const d = B().dist[f]; if (d < 0) return; const sc = d + 0.6 * (Math.abs(f % WW - fl.heart.x) + Math.abs(((f / WW) | 0) - fl.heart.y)); if (sc < bs) { bs = sc; best = f; } });
      return best;
    };
    if (panicking(h)) { intent = 'panic'; noDanger = true; goal = h.fleeing ? exitG() : randomKnownFar(h); }
    else if (standing(h)) {   // 1.22: the last stand: in the doorway (or where he is); a melee monster in reach is his fight
      const S = h.stand, m = S.m; noDanger = true;
      if (tIdx(h) === S.goal || B().dist[S.goal] < 0) {
        h.intent = 'stand'; h.lootKey = null; h.path = [];
        if (!DRIFT[m.type] && cheb(h.tx, h.ty, m.x, m.y) <= 1) { h.state = 'fight'; h.foe = m; } else { h.state = 'wait'; h.timer = 0.5; }
        return;
      }
      intent = 'stand'; goal = S.goal;
    } else if (sacrificing(h)) {   // 1.22: into the trap's reach on purpose; he stands in it till it goes off (sacTick)
      noDanger = true;
      if (tIdx(h) === h.sac.goal || B().dist[h.sac.goal] < 0) { h.intent = 'sacrifice'; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = 0.4; return; }
      intent = 'sacrifice'; goal = h.sac.goal;
    } else if (exiting(h)) {
      intent = h.crystal ? 'carry' : 'exit';
      // 1.22: a guard walks next to the carrier (escortGoal, recomputed each think); with the carrier far away, the exit as before
      const c = !h.crystal && h.escort && !h.fleeing && !h.goHome ? carrierOf() : null, eg = c ? escortGoal(h, c, B()) : -1;
      if (eg >= 0 && eg === tIdx(h)) { h.intent = 'escort'; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = 0.15; h.thinkT = 0.15; return; }
      if (eg >= 0) { intent = 'escort'; goal = eg; h.thinkT = 0.25; } else goal = exitG();   // a guard looks again soon (the carrier moves on)
    }
    else if (fl.fearless && planOf(h) === 'assault') { intent = 'heart'; goal = heartGoal(); }
    else if (planOf(h) === 'retreat' && P.plan === 'retreat' && !h.lost && !onScout(h)) {   // 1.17: only one who knows of the retreat
      intent = 'retreat';
      const R = fl.rooms[P.retreatRoom], spots = R.tiles.filter(t => standOk(h, t[0], t[1]) && !heroBlock(h, t[0], t[1]));   // 1.13: a free, safe spot
      if (roomOf(h.tx, h.ty) === P.retreatRoom && (standOk(h, h.x, h.y) || !spots.length)) { h.state = 'rest'; h.path = []; h.intent = intent; return; }
      goal = nearestOf(B(), (spots.length ? spots : R.tiles.filter(t => walkable(t[0], t[1]))).map(t => t[1] * WW + t[0]));
      // 1.13.4 (replays: a friend resting just inside the door blocked the way in; he stopped in the doorway, which is no place
      // to stand, was sent a step back, and walked in again, for up to 15 s): when a resting friend stands on the first steps of
      // his way and where he stands is fine, he rests here, next to them
      if (goal >= 0 && standOk(h, h.x, h.y) && pathFrom(B(), goal).slice(0, 3).some(p => alive().some(o => o !== h && o.state === 'rest' && o.x === p[0] && o.y === p[1]))) {
        h.state = 'rest'; h.path = []; h.intent = intent; fl.stats.restBy = (fl.stats.restBy || 0) + 1; return;
      }
    } else if (h.lost) {
      intent = 'lost';
      const lt = L ? tIdx(L) : -1, hr = h.hearUntil > fl.time ? byId(h.hearId) : null;
      if (h.hearGoal >= 0 && (fl.time >= h.hearUntil || Math.abs(h.hearGoal % WW - h.tx) + Math.abs(((h.hearGoal / WW) | 0) - h.ty) <= 1)) h.hearGoal = -1;   // 1.18: there (still lost), or the voice is gone after 7 s
      if (h.hearGoal >= 0 && !inB('howl', h.room)) { const bv = bfs(h.x, h.y, {}); if (bv.dist[h.hearGoal] >= 0) { b = bv; goal = h.hearGoal; } }   // 1.18 Fałszywe wołanie: to the voice from the hall
      else if (hr && !hr.dead && !hr.fled && !hr.lost && !inB('howl', h.room)) { const bv = bfs(h.x, h.y, {}), g = tIdx(hr); if (bv.dist[g] >= 0) { b = bv; goal = g; } }   // 1.05: he follows the voice that answered him, known way or not
      if (goal >= 0) { /* following a voice */ }
      else if (lt >= 0 && B().dist[lt] >= 0 && B().dist[lt] < 14 && Math.random() < 0.5) goal = lt;   // he hears their voices and follows them
      else {   // otherwise he wanders: through some door of this room, or into the unknown
        const R = h.room >= 0 ? fl.rooms[h.room] : null;
        const doors = R ? R.doors.filter(d => !d.entrance && !(d.x === h.x && d.y === h.y)).map(d => d.y * WW + d.x).filter(i => B().dist[i] > 0) : [];
        if (doors.length && Math.random() < 0.65) goal = pick(doors);
        else { const fr = frontier(); goal = fr.length && Math.random() < 0.6 ? nearestOf(B(), fr) : randomKnownFar(h); }
      }
    } else if (h.wanderUntil > fl.time && h.wanderTarget >= 0 && isFrontierTile(h.wanderTarget)) {
      intent = 'wander'; goal = h.wanderTarget;
    } else {
      let job = null;
      // 1.21: back for his pair alone (noLeave): to the cage, then he opens it; to the lost one
      if (G2 && h === L && G2.plan === 'rescue') {
        const rj = rescueJob(h, G2, B, bv => { b = bv; });
        if (rj && rj.free) { const c = rj.free; h.state = 'free'; h.timer = hasCrowbar(h) ? (h.type === 'thief' ? 0.5 : 0.6) : h.type === 'thief' ? 0.8 : 1.8; h.dur = h.timer; h.freeT = c.id; h.path = []; h.intent = 'rescue'; return; }
        if (rj) job = rj;
      }
      // 1.21: a bet: across the trap's reach, its danger is nothing to him now
      if (!job && h.bet && !h.bet.done && fl.time < h.bet.until && tIdx(h) !== h.bet.goal) { noDanger = true; b = null; if (B().dist[h.bet.goal] >= 0) job = { intent: 'bet', goal: h.bet.goal }; }
      // a friend in a cage
      if (!job && P.rescueId >= 0 && P.rescueId !== h.id) {
        const c = byId(P.rescueId);
        if (c && caged(c)) {
          let rs = byId(P.rescuerId);
          if (!rs || rs.dead || rs.fled || rs.gone || caged(rs) || rs.fleeing || rs.lost || rs.goHome) {   // 1.17: a rescuer who got lost or went home is replaced
            const mt = bondOf(c) && c.bond.type !== 'rival' ? bondOf(c) : null;   // 1.21: his pair goes first
            const cand = alive().filter(o => o !== c && !caged(o) && !o.fleeing && !o.lost && !o.goHome && !onScout(o) && (canHearShout(o, c) || o === leader() || canHear(o, leader()))).sort((a, o) => ((o === mt) - (a === mt)) || ((o.type === 'thief') - (a.type === 'thief')) || (hdist(a, c) - hdist(o, c)));
            rs = cand[0]; P.rescuerId = rs ? rs.id : -1;
          }
          if (rs === h) {
            if (Math.abs(h.x - c.x) + Math.abs(h.y - c.y) <= 1) { h.state = 'free'; h.timer = hasCrowbar(h) ? (h.type === 'thief' ? 0.5 : 0.6) : h.type === 'thief' ? 0.8 : 1.8; h.dur = h.timer; h.freeT = c.id; h.path = []; h.intent = 'rescue'; return; }   // 1.20: a crowbar opens it in a moment
            const g = nearestOf(B(), DIRS.map(d => [c.x + d[0], c.y + d[1]]).filter(t => walkable(t[0], t[1])).map(t => t[1] * WW + t[0]));
            if (g >= 0) job = { intent: 'rescue', goal: g };
          }
        }
      }
      // 1.22: the formation: a wounded one steps back behind the warrior for 4 s (no fight meanwhile), the warrior goes for the
      // monster he holds, the priest and the mage do not join a fight the warrior holds (they keep 2+ tiles off it, below)
      const backing = fl.time < (h.backUntil || 0) && !!h.backFrom && h.backFrom.hp > 0, fm = h.type === 'priest' || h.type === 'mage' ? formedFoe(h) : null;
      if (!job && backing) {
        const g = backTile(h, h.backFrom, B());
        if (g >= 0 && g === tIdx(h)) { h.intent = 'back'; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = 0.4; return; }
        if (g >= 0) job = { intent: 'back', goal: g };
      }
      if (!job && !backing && h.type === 'warrior' && h.front && h.front.hp > 0 && fl.items.get(key(h.front.x, h.front.y)) === h.front && roomOf(h.front.x, h.front.y) === h.room && B().dist[h.front.y * WW + h.front.x] > 0) job = { intent: 'fight', goal: h.front.y * WW + h.front.x };
      // 1.22: sent first into a room they fear ("ty pierwszy"): a step or two into it
      if (!job && h.firstInto) { const fi = h.firstInto; if (fl.time > fi.until || h.room === fi.room) h.firstInto = null; else if (B().dist[fi.goal] >= 0) job = { intent: 'first', goal: fi.goal }; }
      if (!job && L && L !== h && !backing && !(fm && fm === L.foe) && L.state === 'fight' && L.foe && L.foe.hp > 0 && !DRIFT[L.foe.type] && !onScout(h) && canHear(h, L)) job = { intent: 'fight', goal: L.foe.y * WW + L.foe.x };   // 1.17: a fight he can hear (1.22: not while stepping back, nor the back line in a fight the warrior holds)
      // 1.21: a vow of revenge: the monster that killed his friend, when it is in his room (30 s)
      if (!job && !backing && h.vowOn && fl.time < (h.vowUntil || 0)) {   // 1.22: not while stepping back
        const m = h.vowOn, i = m.y * WW + m.x;
        if (m.hp > 0 && fl.items.get(key(m.x, m.y)) === m && !DRIFT[m.type] && roomOf(m.x, m.y) === h.room && B().dist[i] > 0) { job = { intent: 'fight', goal: i }; if (!h.vowFought) { h.vowFought = true; fl.stats.revengeFights = (fl.stats.revengeFights || 0) + 1; } }
      }
      if (!job && h.type === 'priest') {
        const cl = fl.time < (h.healForUntil || 0) ? byId(h.healFor) : null;   // 1.17: the one who called him comes first
        const hurt = cl && !cl.dead && !cl.fled && !cl.gone && cl.hp < 0.5 * cl.max && hdist(cl, h) > 2.5 ? cl : alive().filter(o => o !== h && o.hp < 0.5 * o.max && hdist(o, h) > 2.5).sort((a, c) => a.hp / a.max - c.hp / c.max)[0];
        if (hurt && B().dist[tIdx(hurt)] >= 0 && B().dist[tIdx(hurt)] <= (hurt === cl ? 20 : 12)) job = { intent: 'heal', goal: tIdx(hurt) };
      }
      if (!job && fm) {   // 1.22: the back line keeps 2-4 tiles off a monster the warrior holds
        const d = cheb(h.tx, h.ty, fm.x, fm.y);
        if (d < 2) { const g = backTile(h, fm, B()); if (g >= 0) job = { intent: 'back', goal: g }; }
        else if (d <= 4) { h.intent = 'back'; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = 0.4; return; }
      }
      // 1.10: Sanktuarium: a wounded hero passing through sits down for a few seconds (once a wave), and the party goes on
      if (!job && h.room >= 0 && isRt(h.room, 'haven') && h.hp < 0.6 * h.max && !h.napped && !h.lost && P.plan !== 'retreat' && fl.time >= h.burnUntil) {
        h.napped = true; h.napUntil = fl.time + 5; h.restAt = fl.time; h.dreamSaid = false; h.state = 'rest'; h.path = []; h.intent = 'nap'; say(h, pick(SAY.nap), 2); fl.stats.naps = (fl.stats.naps || 0) + 1; return;
      }
      if (!job && h.type === 'barbarian') job = smashJob(h, B());   // 1.05
      if (!job && h.type === 'thief') job = disarmJob(h, B());
      if (!job && h.type === 'priest' && h.rank >= 1) job = blessJob(h, B());
      // 1.20 Łom: while the party waits at a shut gate, one with a crowbar (or a thief) goes up to it and levers it (partyThink)
      if (!job && P.blockSaid && P.plan !== 'explore' && (hasCrowbar(h) || h.type === 'thief') && !panicking(h) && !inG2(h)) {
        const door = [...fl.doors.values()].filter(dd => dd.closedUntil > fl.time && (fl.items.get(key(dd.x, dd.y)) || {}).type === 'gate').sort((a, c) => Math.hypot(a.x - h.tx, a.y - h.ty) - Math.hypot(c.x - h.tx, c.y - h.ty))[0];
        if (door && Math.hypot(h.tx - door.x, h.ty - door.y) <= 1.6) { h.intent = 'pry'; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = 0.5; return; }
        if (door) { const g = nearestOf(B(), DIRS.map(dd => [door.x + dd[0], door.y + dd[1]]).filter(t => walkable(t[0], t[1])).map(t => t[1] * WW + t[0])); if (g >= 0) job = { intent: 'pry', goal: g }; }
      }
      if (!job) job = bombJob(h, B());
      if (!job) {
        // 1.10 (author: they ignored loot even when it was free): how far it is counts in steps on the way they would take. It
        // used to be the path cost, which also counts the danger on the way, so in a room full of known traps loot two steps
        // away was 'too far' and never even weighed; the danger is weighed once, in lootDecision. One hero goes for a
        // treasure, the others do not all run for the same one.
        let best = -1, bd = 1e9, bestK = null;
        const claims = P.lootClaim || (P.lootClaim = new Map());
        fl.items.forEach(it => {
          if (!isLoot(it.type) || it.seenWave !== run.wave || it.cursedKnown) return;
          const k = key(it.x, it.y), cl = byId(claims.get(k));
          const i = it.y * WW + it.x, d = B().dist[i], r = lootLevel(it), steps = d >= 0 ? pathFrom(B(), i).length : -1;
          if (cl && cl !== h && !cl.dead && !cl.fled && !cl.gone && cl.intent === 'loot' && cl.lootKey === k && !lootReassign(h, cl, it, k, steps)) return;   // 1.20: unless the leader gives it to him
          const reach = r === 3 ? 30 : r === 2 ? 16 : (LOOT_KIND[it.type] === 'potion' && h.hp < 0.5 * h.max ? 14 : h.type === 'thief' ? 11 : h.rank === 0 ? 9 : 8);
          if (steps >= 0 && steps <= reach && steps < bd && lootDecision(h, it, B(), i)) { bd = steps; best = i; bestK = k; }
          else if (d < 0 && r === 3 && h.type !== 'priest') {   // legendary in an unknown spot: head for the nearest opening towards it
            const fr = frontier().filter(f => Math.hypot(f % WW - it.x, ((f / WW) | 0) - it.y) < 8);
            const g = nearestOf(B(), fr), gs = g >= 0 ? pathFrom(B(), g).length : -1; if (g >= 0 && gs < bd) { bd = gs; best = g; bestK = null; }
          }
        });
        if (best >= 0) { job = { intent: 'loot', goal: best }; h.lootKey = bestK; if (bestK) claims.set(bestK, h.id); }
      }
      if (!job && !backing && h.type === 'warrior') {   // rookies charge anything; veterans pick fights they can win or must fight (1.22: not while stepping back)
        let best = -1, bd = 1e9, skip = null, bm = null;
        fl.items.forEach(m => {
          if (!MONSTERS[m.type] || DRIFT[m.type] || m.hp <= 0 || roomOf(m.x, m.y) !== h.room || hiddenAmbush(m)) return;   // 1.18: he does not see one in ambush
          const i = m.y * WW + m.x, d = B().dist[i];
          const smart = h.rank === 0 || m.type === 'archer' || (h.hp > 0.6 * h.max && m.type !== 'ogre');
          if (!smart) { skip = m; return; }
          if (d > 0 && d <= 6 && d < bd) { bd = d; best = i; bm = m; }
        });
        if (best >= 0) { job = { intent: 'fight', goal: best }; if (h.intent !== 'fight') { sawAdd(h, itemTags(bm)); sayNow(itemTags(bm), () => say(h, pick(SAY.fight), 2)); } }   // 1.17.1: about the one he goes for
        else if (skip && h.avoidM !== skip && Math.random() < 0.3) { sawAdd(h, itemTags(skip)); sayNow(itemTags(skip), () => say(h, pick(SAY.avoid), 2)); h.avoidM = skip; }   // 1.17 (6.8 #4): once a monster, not at every plan
      }
      if (!job && P.scoutId === h.id && h.scoutTarget >= 0) job = { intent: 'scout', goal: h.scoutTarget };
      if (!job && P.scoutMate === h.id) {   // 1.16: the mate keeps a step behind the scout
        const s = byId(P.scoutId);
        if (s && !s.lost) {
          const g = tIdx(s), sd = B().dist[g];
          if (sd >= 0 && sd <= 1.5) { h.intent = 'scout'; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = 0.3; return; }
          if (sd > 0) job = { intent: 'scout', goal: g };
        }
      }
      if (!job && h.look) {   // 1.17: looking around a room
        const lj = lookJob(h, B);
        if (lj && lj.stand) { h.intent = 'look'; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = lj.stand; return; }
        if (lj) job = lj;
      }
      if (job) { intent = job.intent; goal = job.goal; }
      else if (G2 && h === L) { intent = 'lead'; goal = g2Goal(h, heartGoal); }   // 1.19: the second group's own way
      else if (h === L) {
        const dt = P.detour;
        if (dt && (fl.time > dt.until || tIdx(h) === dt.goal || B().dist[dt.goal] < 0)) { P.detour = null; if (tIdx(h) === dt.goal) say(h, pick(SAY.detourBack), 2); }
        const sc = P.searchId >= 0 ? byId(P.searchId) : null;
        if (P.detour) { intent = 'detour'; goal = P.detour.goal; }   // a wrong turn: the whole party follows him
        else if (sc && sc.lost) {   // back for the lost one: 1.17: to where he was last seen, then to his voice once they hear him
          const g = canHear(h, sc) ? tIdx(sc) : P.searchGoal;
          if (g >= 0 && B().dist[g] >= 0 && g !== tIdx(h)) { intent = 'search'; goal = g; }
          else { if (g === tIdx(h)) { P.searchId = -1; P.queueSay.push({ id: h.id, text: pick(SAY.searchFail), at: fl.time + 0.2, prio: 2, late: 3 }); } intent = 'lead'; goal = P.target; }
        }
        else if (P.plan === 'assault') { intent = 'heart'; goal = heartGoal(); if (h.intent !== 'heart') say(h, pick(SAY.assault), 2); }
        else { intent = 'lead'; goal = P.target; }
      } else if (L) {
        intent = 'follow';
        // 1.21: an apprentice keeps to his mentor while the mentor walks with the leader (6 tiles of him) and he sees him
        const M = h.bond && h.bond.role === 'apprentice' ? bondOf(h) : null;
        const F = M && M !== L && calmFor(M) && !M.split && inG2(M) === inG2(h) && M.intent === 'follow' && hdist(M, L) <= 6 && canSee(h, M) ? M : L;
        const lt = tIdx(F), d = B().dist[lt];
        const gap = h.type === 'priest' || h.type === 'mage' ? 3.5 : 2.5;   // the back line keeps a step behind
        if (d >= 0 && d <= gap && L.state !== 'boss') {
          // 1.10: a group, not a heap: one standing on a friend's tile steps aside onto a free, safe tile still close to the leader
          if (!h.lost && ((F.x === h.x && F.y === h.y) || alive().some(o => o !== h && o.id < h.id && o.nx === null && o.x === h.x && o.y === h.y))) {
            const sp = DIRS.map(q => [h.x + q[0], h.y + q[1]]).filter(t => walkable(t[0], t[1]) && fl.known[t[1] * WW + t[0]] && !fl.danger[t[1] * WW + t[0]] && !fl.items.has(key(t[0], t[1])) &&
              Math.hypot(t[0] - F.x, t[1] - F.y) <= gap + 0.5 && !alive().some(o => o !== h && ((o.x === t[0] && o.y === t[1]) || (o.nx === t[0] && o.ny === t[1]))));
            if (sp.length) { h.intent = 'space'; h.lootKey = null; h.path = [pick(sp)]; return; }
          }
          h.intent = intent; h.lootKey = null; h.path = []; h.state = 'wait'; h.timer = 0.35; return;
        }
        goal = (L.state === 'boss' || planOf(h) === 'assault') && !P.detour && P.searchId < 0 ? heartGoal() : lt;
        if (goal < 0) goal = lt;
      }
    }
    h.intent = intent; if (intent !== 'loot') h.lootKey = null;
    if (goal < 0) { h.path = []; return; }
    const bb = B();
    if (bb.dist[goal] < 0) {
      if (intent === 'exit' || intent === 'carry' || intent === 'panic') {   // on the way out they will find a way, known or not
        const b2 = bfs(h.x, h.y, { noDanger: true }), g2 = nearestOf(b2, exitGoals());
        if (g2 >= 0) { h.path = pathFrom(b2, g2); h.blocked = -1; return; }
      }
      h.path = []; h.blocked = fl.time; return;
    }
    h.blocked = -1;
    h.path = pathFrom(bb, goal);
    h.noPathT = 0;
  }
  // 1.13.4: where the party is going: the leader's path while someone else leads and walks it, else the route (on b) to the
  // party's goal: a detour, the heart in an assault, the explore target. Not the hero's own path: a leader who walks his own
  // errand (a trap to disarm, a bomb to throw) made the errand vanish on the spot and come back one step later.
  function partyWay(h, b, n) {
    const L = leader(), P = fl.party;
    let wp = L && L !== h && L.path.length ? L.path : null;
    if (!wp) {
      const g = P.detour ? P.detour.goal : P.plan === 'assault' ? nearestOf(b, heartGoals()) : P.target;
      wp = g >= 0 && b.dist[g] >= 0 ? pathFrom(b, g) : h.path;
    }
    return new Set((n ? wp.slice(0, n) : wp).map(p => key(p[0], p[1])));
  }
  // The thief deals with known traps that still sit on the leader's way. Rookies are slow and sometimes set them off.
  function disarmJob(h, b) {
    if (fl.fearless || panicking(h)) return null;
    // 1.13.4 (tester's run: a thief stepped between two tiles in front of an arrow trap for 12 s and was shot from 55 to 10 HP):
    // "the leader's way" was the leader's current path, and a thief who leads walks his own detour to the trap: on the spot
    // his path is empty, so the trap was no longer on the way, he led on, one step later it was on the way again and he
    // stepped back, every 0,4 s, in the line of fire. The way is now where the party is going (the leader's path while he
    // walks it, else the route to the party's goal: detour, heart in an assault, the explore target), not the thief's own
    // detour; he keeps the trap he chose while it is still there and armed, nobody else took it and its spot is a few steps
    // away; and after 2 times it went off in his face he leaves it be (a trap that fires faster than he can take it apart).
    const way = partyWay(h, b);
    const prev = h.disarmT, hits = h.disarmHits;
    const keep = prev && fl.items.get(key(prev.x, prev.y)) === prev && DISARMABLE[prev.type] && prev.detected && !prev.disabled && !(hits && hits.get(prev) >= 2) ? prev : null;
    let tBest = null, tSpot = -1, tCost = 1e9;
    fl.items.forEach(it => {
      if (!DISARMABLE[it.type] || !it.detected || it.disabled) return;
      if (hits && hits.get(it) >= 2) return;
      if (it !== keep && !areaOf(it).some(t => way.has(key(t[0], t[1])))) return;
      if (fl.heroes.some(o => o !== h && o.disarmT === it && !o.dead)) return;
      const bias = it.type === 'decoy' ? -4 : 0;   // the decoy looks like the juiciest mechanism in the room
      disarmSpots(it).forEach(t => { const i = t[1] * WW + t[0], d = b.dist[i]; if (d >= 0 && d + bias < tCost && (it !== keep || way.has(key(t[0], t[1])) || pathFrom(b, i).length <= 6)) { tCost = d + bias; tBest = it; tSpot = i; } });
    });
    h.disarmT = tBest;
    if (!tBest) return null;
    if (tCost <= 0 && b.dist[tSpot] === 0) {
      h.state = 'disarm'; h.timer = (tBest.type === 'arrows' || tBest.type === 'fire' || tBest.type === 'powder' ? 1.5 : 1.0) * mods.disarm * h.R.disarm * (isRt(h.room, 'swamp') ? 1.5 : 1);   // knee-deep in a swamp it takes longer
      h.dur = h.timer; h.item = tBest; h.path = []; say(h, pick(SAY.disarm), 3);
      return { intent: 'disarm', goal: -1 };
    }
    return { intent: 'disarm', goal: tSpot };
  }
  // 1.05: the barbarian's axe: counter-buildings in his room (always worth it to him) and wooden furniture close by (further when
  // raging). A smashed building does nothing for the rest of the wave and stops blocking; a crate is gone (whatever stood on it
  // goes off: a powder keg blows up, a mimic bites). Nothing breaks in a room with Okowy.
  function smashJob(h, b) {
    if (fl.fearless || panicking(h) || h.lost || fl.time < h.smashCd || h.room < 0 || inB('shackles', h.room)) return null;
    const rage = raging(h), r = h.room;
    let best = null, bd = 1e9, spot = -1;
    const consider = (x, y, kind, ref) => {
      if (roomOf(x, y) !== r || Math.hypot(x - h.tx, y - h.ty) > (kind === 'b' ? 8 : rage ? 5 : 2.5)) return;
      DIRS.forEach(d => { const nx = x + d[0], ny = y + d[1]; if (!walkable(nx, ny)) return; const i = ny * WW + nx, dd = b.dist[i]; if (dd >= 0 && dd - (kind === 'b' ? 3 : 0) < bd) { bd = dd - (kind === 'b' ? 3 : 0); best = { kind, ref, x, y }; spot = i; } });
    };
    fl.items.forEach(it => { if (BUILDINGS[it.type] && !it.broken) consider(it.x, it.y, 'b', it); });
    fl.objects.forEach(o => { if (SMASHABLE_OBJ[o.kind]) consider(o.x, o.y, 'o', o); });
    if (!best) return null;
    if (b.dist[spot] === 0) {
      h.state = 'smash'; h.timer = rage ? 0.8 : 1.8; h.dur = h.timer; h.smashIt = best; h.path = [];
      sayNow(best.kind === 'b' ? [best.ref.type] : null, () => say(h, pick(best.kind === 'b' ? SAY.smashB : SAY.smash), 3));
      return { intent: 'smash', goal: -1 };
    }
    return { intent: 'smash', goal: spot };
  }
  function smashDone(h, t) {
    const k = key(t.x, t.y);
    if (t.kind === 'b') {
      const it = t.ref; if (fl.items.get(k) !== it || it.broken) return;
      if (it.type === 'decoy') decoyAlarm(it, h);   // the decoy goes off under the axe too
      it.broken = true; it.disabled = true; fl.bRooms = computeBRooms(); const b0 = bt(it.type); b0.smashed = (b0.smashed || 0) + 1;
      floatTile(t.x, t.y, ITEMS[it.type].name + ': gruz', '#ffb38a', 14, -0.6);
    } else {
      if (!fl.objects.has(k)) return;
      const on = fl.items.get(k);   // what stood on it: a powder keg blows up, a mimic bites, a music box falls silent
      if (on && !on.disabled) { if ((on.type === 'powder' || on.type === 'mimic') && on.cd <= 0) fire(on, 1); on.disabled = true; }
      if (on) mimicSpill(on, h);   // 1.20: the smashed mimic spits out its belly
      fl.objects.delete(k); fl.stats.smashedObj = (fl.stats.smashedObj || 0) + 1;
      floatTile(t.x, t.y, 'Rozbite!', '#ffb38a', 13, -0.5);
    }
    burst(t.x + 0.5, t.y + 0.5, '#b08050', 12); shake = Math.max(shake, 0.12);
    fl.stats.smashes = (fl.stats.smashes || 0) + 1; tl('sm', h.id, t.x, t.y);
    fl.threatDirty = true; fl.knowDirty = true; replanAll();
  }
  // An experienced priest lifts the curse from a known portrait near their way.
  function blessJob(h, b) {
    if (fl.fearless || panicking(h) || h.faith < 1) return null;   // lifting a curse off a portrait costs 1 faith
    const L = leader(); if (!L) return null;
    const lp = heroPos(L);
    let tBest = null, tSpot = -1, tCost = 1e9;
    fl.items.forEach(it => {
      if (!CURSED[it.type] || !it.detected || it.disabled || Math.hypot(it.x - lp.x, it.y - lp.y) > 8) return;
      if (fl.heroes.some(o => o !== h && o.disarmT === it && !o.dead)) return;
      disarmSpots(it).forEach(t => { const i = t[1] * WW + t[0], d = b.dist[i]; if (d >= 0 && d < tCost) { tCost = d; tBest = it; tSpot = i; } });
    });
    h.disarmT = tBest;
    if (!tBest) return null;
    if (tCost === 0) { const alt = inB('altar', slotRoom(tBest.type, tBest.x, tBest.y)); h.faith--; h.state = 'disarm'; h.timer = 1.5 * h.R.disarm * (alt ? 2 : 1); h.dur = h.timer; h.item = tBest; h.path = []; sayNow(alt ? ['altar'] : null, () => say(h, pick(alt ? SAY.bAltar : SAY.bless), 3)); if (alt) fl.stats.altarBlocks = (fl.stats.altarBlocks || 0) + 1; return { intent: 'bless', goal: -1 }; }
    return { intent: 'bless', goal: tSpot };
  }
  // Anyone with a bomb throws it at a known trap blocking the leader's way, from up to 3 tiles.
  function bombJob(h, b) {
    const bomb = h.inv.find(it => it.type === 'bomb');
    if (!bomb || fl.fearless || panicking(h)) return null;
    // 1.13.4 (replays: a warrior who led stepped between two tiles for seconds): the way is partyWay (the first 8 steps), and he
    // walks to a safe tile within throwing range, not into the trap's area (from where the rule that nobody stands in a trap
    // sent him back out, and the bomb run started again)
    // and the trap he already set out for stays his target while it is in the first 14 steps (with a hard 8 a step towards it
    // could push it to step 9 and back: on, off, on)
    if (!leader()) { h.bombT = null; return null; }
    const way = partyWay(h, b, 8), keepT = h.bombT, wayK = keepT ? partyWay(h, b, 14) : null;
    h.bombT = null;
    for (const it of fl.items.values()) {
      if (!TRAPS[it.type] || !it.detected || it.disabled || it.type === 'gate' || CURSED[it.type]) continue;
      if (!areaOf(it).some(t => way.has(key(t[0], t[1])) || (it === keepT && wayK.has(key(t[0], t[1]))))) continue;
      if (Math.hypot(it.x - h.tx, it.y - h.ty) <= 3) {
        h.inv.splice(h.inv.indexOf(bomb), 1); fl.stats.bombs++; fl.stats.itemsUsed++;
        if (it.type === 'powder') fire(it, 0.5);
        else { it.disabled = true; fl.threatDirty = true; bt(it.type).disarmed++; mimicSpill(it, h); }   // 1.20: a mimic spits out its belly
        burst(it.x + 0.5, it.y + 0.5, '#ffb35c', 14); floatTile(it.x, it.y, 'Zniszczone bombą', '#ffb35c', 13, -0.5); say(h, pick(SAY.bomb), 3);
        return null;
      }
      const near = [];
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const x = it.x + dx, y = it.y + dy, i = y * WW + x;
        if (Math.hypot(dx, dy) <= 3 && x > 0 && y > 0 && x < WW - 1 && y < WH - 1 && walkable(x, y) && fl.known[i] && !fl.danger[i]) near.push(i);
      }
      const g = nearestOf(b, near.length ? near : areaOf(it).map(t => t[1] * WW + t[0]).concat(disarmSpots(it).map(t => t[1] * WW + t[0])));
      if (g >= 0) { h.bombT = it; return { intent: 'bomb', goal: g }; }
    }
    return null;
  }
  // Priest heals, puts out fires, raises a barrier and burns ghosts with holy light; mage burns monsters and clears webs.
  // 1.05: the bard. A call when someone is lost (they walk to the music), and a song when spirits sag (after a death, low morale,
  // fear in the faces around): less fear for everyone within 5 tiles, morale back up. A few songs a wave; Kamień wyjec drowns both.
  function bardTick(h, dt) {
    h.songCd -= dt; h.callCd -= dt;
    if (panicking(h) || h.lost || caged(h) || h.fleeing || h.gone) return;
    const P = fl.party;
    const lost = alive().filter(o => o.lost && o !== h && !(o.hearUntil > fl.time && o.hearId === h.id));
    if (lost.length && h.callCd <= 0 && !goingOut() && !fl.fearless) {
      h.callCd = 9;
      if (inB('howl', h.room)) { sayNow(['howl'], () => say(h, pick(SAY.bHowl), 3)); fl.stats.howlBlocks = (fl.stats.howlBlocks || 0) + 1; return; }
      const b = bfs(h.x, h.y, {}); let n = 0;
      lost.forEach(o => { const d = b.dist[tIdx(o)]; if (d < 0 || d > 26 || inB('howl', o.room)) return; o.hearUntil = fl.time + 8; o.hearId = h.id; o.needPlan = true; n++; P.queueSay.push({ id: o.id, text: pick(SAY.lostHear), at: fl.time + 1.3 }); });
      say(h, nameFill(pick(SAY.bardCall), lost[0]), 3); fl.stats.bardCalls = (fl.stats.bardCalls || 0) + 1; if (n) fl.stats.bardHeard = (fl.stats.bardHeard || 0) + n; tl('bc', h.id, n);
      const p = heroPos(h); particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 5, life: 0.7, color: '#73d6c6' });
      return;
    }
    if (h.songs <= 0 || h.songCd > 0 || goingOut() || fl.fearless) return;
    const near = alive().filter(o => !o.lost && !caged(o) && hdist(o, h) <= 5);
    const fearR = near.reduce((a, o) => a + o.fear / o.courage, 0) / Math.max(1, near.length);
    if (!(P.morale < 0.65 || near.some(o => fl.time < o.shakenUntil) || fearR > 0.45)) return;
    h.songCd = 16;
    if (inB('howl', h.room)) { sayNow(['howl'], () => say(h, pick(SAY.bHowl), 3)); fl.stats.howlBlocks = (fl.stats.howlBlocks || 0) + 1; h.songCd = 6; return; }
    h.songs--;
    const k = (0.06 + 0.012 * h.lvl) * Math.min(1, itemPow(h) + 0.5);
    near.forEach(o => { o.fear = Math.max(0, o.fear - k * o.courage); if (o.shakenUntil > fl.time) o.shakenUntil = fl.time + 1; });
    P.morale = Math.min(1, P.morale + 0.25);
    fl.stats.songs = (fl.stats.songs || 0) + 1; tl('sg', h.id, near.length);
    say(h, pick(SAY.song), 3, 2.2); floatHero(h, 'Pieśń!', '#73d6c6', 14, -0.8);
    const o2 = near.find(o => o !== h && !panicking(o)); if (o2) P.queueSay.push({ id: o2.id, text: pick(SAY.songThanks), at: fl.time + 1.6 });
    const p = heroPos(h); particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 5, life: 0.6, color: '#73d6c6' });
  }
  function heroAbilities(h, dt) {
    if (h.type === 'bard') { bardTick(h, dt); return; }
    if (h.type !== 'priest' && h.type !== 'mage') return;
    h.cast -= dt; h.barrierCd -= dt; h.dispelCd -= dt;
    if (h.type === 'priest') {   // faith: a small pool (6 + level/2) that refills slowly (+1 every 12 s); every prayer spends it
      h.faithT += dt; if (h.faithT >= 12) { h.faithT -= 12; if (h.faith < h.faithMax) h.faith++; }
      if (h.faith >= 2) h.faithSaid = false;
    }
    if (panicking(h) || h.fleeing) return;   // 1.17 (6.8 #16): no spells or prayers while running scared (faith still refills)
    const p = heroPos(h);
    if (h.type === 'mage' && h.dispelCd <= 0 && !panicking(h)) {
      const z = fl.zones.find(zz => alive().some(o => hdist(o, h) <= 4 && zz.keys.has(key(o.tx, o.ty))));
      if (z) { z.until = fl.time; alive().forEach(o => { if (z.keys.has(key(o.tx, o.ty))) o.slowUntil = fl.time; }); h.dispelCd = 8; fl.stats.dispels++; say(h, pick(SAY.dispel), 3); fxTiles(z.tiles, '200,180,255', 0.3); }
    }
    if (h.cast > 0) return;
    if (h.type === 'priest') {
      h.cast = 1;   // looks around every second; a prayer takes 3
      let healed = 0, cleansed = false;
      const alt = inB('altar', h.room), ak = alt ? 0.5 : 1;   // a blasphemous altar halves every power of the priest
      const near = alive().filter(o => { const q = heroPos(o); return Math.hypot(q.x - p.x, q.y - p.y) <= 3; });
      const spend = n => {
        if (h.faith >= n) { h.faith -= n; return true; }
        if (!h.faithSaid) { h.faithSaid = true; say(h, pick(SAY.faithLow), 3); fl.stats.faithOut++; tl('fo', h.id); }
        return false;
      };
      // holy light burns ghosts close by (free, part of every prayer)
      const ghosts = [...fl.items.values()].filter(m => DRIFT[m.type] && m.hp > 0 && Math.hypot(m.gx - p.x, m.gy - p.y) <= 3);   // ghosts, shades and bats
      // a curse on a friend (level 4+): 3 faith
      const cu = h.lvl >= 4 && h.faith >= 3 ? (near.find(o => o.cursed && o !== h) || near.find(o => o.cursed)) : null;   // 1.17: a friend first, then himself
      if (cu && spend(3)) {
        cu.cursed = false; cu.inv.forEach(x => { x.cursed = false; }); fl.stats.curseLifts++; tl('cl', h.id, cu.id); h.cast = 3;   // 1.20: and his things
        say(h, cu === h ? pick(SAY.curseSelf) : nameFill(pick(SAY.curseLift), cu), 3); floatHero(cu, 'Klątwa zdjęta', '#fff2c0', 13, -0.7);
        particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 2, life: 0.45, color: '#fff2c0' });
        return;
      }
      // heal when it matters (someone under 75%, or a lot of wounds around) or put out a fire: 1 faith
      const worst = near.reduce((a, o) => Math.min(a, o.hp / o.max), 1), missing = near.reduce((a, o) => a + (o.max - o.hp), 0);
      const burning = near.some(o => fl.time < o.burnUntil);
      if ((burning || worst < 0.75 || missing > 0.6 * h.max) && spend(1)) {
        h.cast = 3;
        near.forEach(o => {
          if (fl.time < o.burnUntil) { cleansed = cleansed === 'fire' || o.burnBy !== 'spikes' ? 'fire' : 'blood'; o.burnUntil = fl.time; return; }   // putting out a fire (1.17.1: or stopping the bleeding) takes the heal
          if (o.hp < o.max) { const a = Math.min(22 * h.R.pow * ak, o.max - o.hp); o.hp += a; healed += a; }
        });
      }
      if (ghosts.length && (h.cast === 3 || h.faith > 0)) { h.cast = 3; ghosts.forEach(m => { hurtMonster(m, 25 * h.R.pow * ak); burst(m.gx, m.gy, '#fff2c0', 8); }); }
      if (alt && healed > 0) { fl.stats.altarHeals = (fl.stats.altarHeals || 0) + 1; if (Math.random() < 0.25) sayNow(['altar'], () => say(h, pick(SAY.bAltar), 2)); }
      if (cleansed) { fl.stats.cleanses++; sayNow(cleansed === 'fire' ? ['fire'] : ['spikes', 'blood'], () => say(h, pick(cleansed === 'fire' ? SAY.cleanse : SAY.staunch), 3)); }
      // a barrier for everyone around (ambush, or someone close to dying): 3 faith
      if (h.barrierCd <= 0 && near.length >= 2 && (fl.time - fl.party.ambushT < 2 || near.some(o => o.hp < 0.45 * o.max)) && h.faith >= 3 && spend(3)) {
        near.forEach(o => { o.shield = Math.max(o.shield, 12 * h.R.pow * ak); }); h.barrierCd = 14; fl.stats.barriers++; say(h, pick(SAY.barrier), 3); h.cast = 3;
        particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 3, life: 0.5, color: '#7fb8ff' });
      }
      if (healed > 0) {
        const pts = addPts(healed / h.max * GZ.heal * depthMult(h.room), 'healPts', h); fl.stats.healed += healed; fl.stats.heals++;
        if (!cleansed) say(h, pick(SAY.heal), 1);
        floatHero(h, 'Leczenie +' + fmtE(pts), '#ff7a86', 14, -0.5);
        particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 3, life: 0.45, color: '#8be38f' });
      }
      return;
    }
    let target = null, bd = 4.5;
    fl.items.forEach(m => {
      if (!MONSTERS[m.type] || m.hp <= 0 || roomOf(m.x, m.y) !== h.room) return;
      if (m.type === 'shade' || (m.type === 'ghost' && mods.ghostPriestOnly)) return;   // only a priest touches a shade
      const mx = DRIFT[m.type] ? m.gx : m.x + 0.5, my = DRIFT[m.type] ? m.gy : m.y + 0.5;
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < bd) { bd = d; target = m; }
    });
    if (!target) { h.cast = 0.5; return; }
    h.cast = 4;
    const tx = DRIFT[target.type] ? target.gx : target.x + 0.5, ty = DRIFT[target.type] ? target.gy : target.y + 0.5;
    fxLine(p.x, p.y, tx, ty, 0.3, '255,150,60');
    const area = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tileAt(Math.floor(tx) + dx, Math.floor(ty) + dy) === FLOOR) area.push([Math.floor(tx) + dx, Math.floor(ty) + dy]);
    fxTiles(area, '255,140,50', 0.45);
    say(h, pick(SAY.fireball), 1);
    if (DRIFT[target.type]) hurtMonster(target, 30 * h.R.pow * vowK(h));   // 1.21: a vow
    area.forEach(t => { const m = fl.items.get(key(t[0], t[1])); if (m && MONSTERS[m.type] && !DRIFT[m.type]) hurtMonster(m, 30 * h.R.pow * vowK(h)); });
  }
  // 1.10: standing, a hero looks around now and then: at a friend, at loot they saw, at a trap they know, or just away
  function glance(h) {
    h.glanceT = 1.6 + Math.random() * 2.8;
    if (h.bubble && h.bubble.until > fl.time) return;   // not while he speaks
    const pts = [];
    alive().forEach(o => { if (o !== h && earshot(o, h)) pts.push([o.x, o.y]); });
    fl.items.forEach(it => { if (Math.abs(it.x - h.x) + Math.abs(it.y - h.y) > 6) return; if ((isLoot(it.type) && it.seenWave === run.wave) || (it.detected && !it.disabled)) pts.push([it.x, it.y]); });
    if (pts.length && Math.random() < 0.75) { const t = pick(pts); lookAt(h, t[0], t[1]); } else h.face = -(h.face || 1);
  }
  const slipChance = h => 0.33 * (h.rank >= 2 ? 0.55 : 1) * (h.type === 'thief' ? 0.6 : 1) * (panicking(h) || h.fleeing ? 1.3 : 1);
  function heroTile(h) { return (h.nx !== null && h.prog >= 0.5) ? [h.nx, h.ny] : [h.x, h.y]; }
  // 1.12.1 (author: a hero takes up one tile, like a monster; two share one only while they pass each other). A tile is taken by
  // a hero standing on it (or mostly on it, past half a step) and by one stepping into it. The door out (and the breach) is
  // outside the dungeon: they gather there freely. A blocked hero waits a moment, then walks round (a short detour that
  // rejoins his way), and only when there is no way round squeezes past (passing); one running out or in a panic sooner.
  const SQUEEZE_T = 2.2, SQUEEZE_RUN = 0.6, SQUEEZE_LONG = 6, BLOCK_WAIT = 0.45;   // s: both stuck / running out / the other one busy
  function heroBlock(h, x, y) {
    if (isExitTile(x, y)) return null;
    for (const o of fl.heroes) {
      if (o === h || o.dead || o.fled || o.gone) continue;
      const t = heroTile(o);
      if ((t[0] === x && t[1] === y) || (o.nx === x && o.ny === y)) return o;
    }
    return null;
  }
  // a short way round the heroes in the way, back onto the rest of his path (a few steps at most)
  function detourAround(h) {
    const want = new Map(); h.path.forEach((p, i) => { if (i >= 1) want.set(p[1] * WW + p[0], i); });
    if (!want.size) return false;
    const s0 = h.y * WW + h.x, prev = new Map([[s0, -1]]), q = [s0];
    for (let qi = 0; qi < q.length && q.length < 160; qi++) {
      const i = q[qi], cx = i % WW, cy = (i / WW) | 0;
      if (i !== s0 && want.has(i)) {
        const way = []; for (let k = i; k !== s0; k = prev.get(k)) way.unshift([k % WW, (k / WW) | 0]);
        if (way.length > 8) return false;
        h.path = way.concat(h.path.slice(want.get(i) + 1)); fl.stats.sidesteps = (fl.stats.sidesteps || 0) + 1;
        return true;
      }
      for (const d of DIRS) {
        const nx = cx + d[0], ny = cy + d[1], j = ny * WW + nx;
        if (prev.has(j) || !passable(nx, ny) || heroBlock(h, nx, ny)) continue;
        const g = fl.items.get(key(nx, ny)); if (g && MONSTERS[g.type] && !DRIFT[g.type] && g.hp > 0) continue;
        prev.set(j, i); q.push(j);
      }
    }
    return false;
  }
  // two standing on one tile (a fall, a slide, a squeeze): the later one steps to a free tile next to it
  function stepAside(h) {
    if (isExitTile(h.x, h.y)) return false;
    const o = fl.heroes.find(o => o !== h && !o.dead && !o.fled && !o.gone && o.nx === null && o.x === h.x && o.y === h.y && o.id < h.id);
    if (!o) return false;
    const free = DIRS.map(d => [h.x + d[0], h.y + d[1]]).filter(t => passable(t[0], t[1]) && !heroBlock(h, t[0], t[1]) && !(Math.abs(t[0] - fl.heart.x) + Math.abs(t[1] - fl.heart.y) === 0) &&
      !(fl.items.get(key(t[0], t[1])) && MONSTERS[fl.items.get(key(t[0], t[1])).type] && !DRIFT[fl.items.get(key(t[0], t[1])).type] && fl.items.get(key(t[0], t[1])).hp > 0));
    if (!free.length) return false;
    const safe = free.filter(t => standOk(h, t[0], t[1])), t = pick(safe.length ? safe : free);   // 1.13: off the traps if he can
    h.state = 'walk'; h.path = []; h.nx = t[0]; h.ny = t[1]; h.prog = 0; h.needPlan = true; fl.stats.sidesteps = (fl.stats.sidesteps || 0) + 1;
    return true;
  }
  // 1.12.1: a hero standing idle in the way of one who walks makes way: a step to the side, or one ahead along his way
  // (and whoever stands there makes way too), so the leader never stands behind his own followers
  function idleIn(o) { return o.nx === null && !o.huddle && (o.state === 'wait' || o.state === 'talk' || (o.state === 'walk' && !o.path.length)) && !o.dead && !o.fled && !o.gone; }
  function makeWay(o, h, depth) {
    if (!idleIn(o) || isExitTile(o.x, o.y) || depth > 4) return false;
    const onWay = (x, y) => (x === h.x && y === h.y) || h.path.some(q => q[0] === x && q[1] === y);
    const ok = t => passable(t[0], t[1]) && !heroBlock(o, t[0], t[1]) && !(t[0] === fl.heart.x && t[1] === fl.heart.y) && !(t[0] === h.x && t[1] === h.y) &&
      !(fl.items.get(key(t[0], t[1])) && MONSTERS[fl.items.get(key(t[0], t[1])).type] && !DRIFT[fl.items.get(key(t[0], t[1])).type] && fl.items.get(key(t[0], t[1])).hp > 0);
    const side = DIRS.map(d => [o.x + d[0], o.y + d[1]]).filter(q => ok(q) && !onWay(q[0], q[1]) && !fl.items.has(key(q[0], q[1])) && !fl.danger[q[1] * WW + q[0]]);
    let t = side.length ? pick(side) : null;
    // 1.13.2 (author's run: in a dead-end strip the leader and his followers shuffled one tile back and forth for the whole
    // raid): with no room at the side they swap places, passing each other like any two heroes on their way. (Up to 1.13.1
    // the idle one stepped one tile ahead along the other's way and then walked straight back to his leader.)
    if (!t) {
      if (!h.path.length || h.path[0][0] !== o.x || h.path[0][1] !== o.y || h.nx !== null) return false;
      t = [h.x, h.y]; o.passing = h.id; fl.stats.swapWay = (fl.stats.swapWay || 0) + 1;
    }
    o.state = 'walk'; o.path = []; o.nx = t[0]; o.ny = t[1]; o.prog = 0; o.needPlan = true; o.blockT = 0; fl.stats.makeWay = (fl.stats.makeWay || 0) + 1;
    return true;
  }
  const RT_SAY = { fog: 'rtFog', swamp: 'rtSwamp', grotto: 'rtGrotto', crypt: 'rtCrypt', vault: 'rtVault', haven: 'rtHaven', gears: 'rtGears', hush: 'rtHush', ice: 'rtIce' };
  function onEnter(h) {
    const P = fl.party;
    const r = roomOf(h.x, h.y), changed = r >= 0 && r !== h.enteredRoom;
    if (r >= 0) { h.room = r; h.enteredRoom = r; }
    reveal(h);
    if (changed) sawRoom(h, r);   // 1.17.1: what he sees as he walks in
    if (r >= 0 && fl.rooms[r].kind === 'room') {
      const fresh = !fl.rooms[r].visited || fl.time - (fl.rooms[r].visitT || -99) < 4;   // 1.22: nobody has walked through it yet (or he is right behind the first one in)
      if (!fl.rooms[r].visited) { fl.rooms[r].visited = true; fl.rooms[r].visitT = fl.time; fl.stats.roomsVisited++; }
      const rt = fl.rooms[r].rt;   // the first one into a room with a character says what it is
      if (rt && !exiting(h) && !(fl.rtSaid || (fl.rtSaid = new Set())).has(r)) { fl.rtSaid.add(r); say(h, pick(SAY[RT_SAY[rt]]), 3); }
      const rk = fl.rooms[r].rk, rkL = rk && SAY.rkEnter && SAY.rkEnter['k_' + rk];   // 1.17.1: and what the room is for (a komnata)
      if (rkL && !exiting(h) && !(fl.rkSaid || (fl.rkSaid = new Set())).has(r)) { fl.rkSaid.add(r); fl.stats.rkEnter = (fl.stats.rkEnter || 0) + 1; if (rt) P.queueSay.push({ id: h.id, text: pick(rkL), at: fl.time + 0.2, prio: 2, late: 5 }); else say(h, pick(rkL), 3); }   // 1.18: after the effect line, not dropped by it
      if (changed && h.id === P.leaderId) { maybeDetour(h, r); if (!P.detour) P.lookAsk = { room: r, at: fl.time + 0.9 }; }   // 1.17: look around? (lookThink)
      if (changed && !exiting(h)) phobiaSight(h, r);
      if (changed) mentorRoom(h, r);   // 1.21
      if (changed) tapRoom(h, r, fresh);   // 1.22
    }
    if (h.bet) betStep(h);   // 1.21
    if (isExitTile(h.x, h.y) && exiting(h)) { heroExit(h); return; }
    const it = fl.items.get(key(h.x, h.y));
    if (it && isLoot(it.type) && !h.crystal && !h.fleeing) { pickup(h, it); if (h.state === 'loot') return; }   // 1.20: he kneels by a body
    // 1.10: Lodownia: a step may run on, one tile straight ahead, into whatever is there (not twice in a row)
    if (r >= 0 && isRt(r, 'ice') && !h.slid && (h.ldx || h.ldy) && h.state === 'walk' && Math.random() < slipChance(h) * (1 + 0.5 * mods.blackice) * (1 + Math.max(0, loadOf(h) / carryOf(h) - 0.5))) {   // 1.18: Gołoledź, half as many slips more; 1.20: a heavy pack slips more
      const sx = h.x + h.ldx, sy = h.y + h.ldy, g = fl.items.get(key(sx, sy));
      if (passable(sx, sy) && !(g && MONSTERS[g.type] && !DRIFT[g.type] && g.hp > 0) && !(Math.abs(sx - fl.heart.x) + Math.abs(sy - fl.heart.y) === 0) && !heroBlock(h, sx, sy)) {
        h.nx = sx; h.ny = sy; h.prog = 0; h.sliding = true; h.path = []; fl.stats.slips = (fl.stats.slips || 0) + 1; tl('sl', h.id, sx, sy);
        if (mods.blackice) { h.slowUntil = Math.max(h.slowUntil, fl.time + 1.8); fl.stats.iceFalls = (fl.stats.iceFalls || 0) + 1; }   // 1.18 Gołoledź: he falls: slowed 1,5 s after the slide (about 0,3 s)
        say(h, pick(SAY.slip), 2, 1.2, 'loud'); return;
      }
    }
    if (P.plan === 'retreat' && !h.lost && r === P.retreatRoom && !panicking(h) && !exiting(h) && (!h.path.length || standOk(h, h.x, h.y))) { h.state = 'rest'; h.path = []; return; }   // 1.13: on his way to a safe spot he walks on
    if (P.plan === 'assault' && !exiting(h) && Math.abs(h.x - fl.heart.x) + Math.abs(h.y - fl.heart.y) === 1 && !panicking(h)) { h.state = 'boss'; h.path = []; return; }
    // veterans time their run through a known trap while it reloads
    if (h.rank >= 1) fl.items.forEach(t => {
      if (!TRAPS[t.type] || !t.detected || t.disabled || t.cd <= 0.3 || h.saidTiming.has(t) || exiting(h)) return;   // 1.05: no tactics talk while running
      if (areaOf(t).some(q => q[0] === h.x && q[1] === h.y)) { h.saidTiming.add(t); fl.stats.timing++; say(h, pick(SAY.timing), 2); }
    });
    if (r >= 0 && fl.rooms[r].rumored && !h.rumorSaid && !exiting(h) && Math.random() < 0.5) { h.rumorSaid = true; say(h, pick(SAY.rumor), 1); }
    // an experienced mage feels the magic of every trap in a room the moment she walks in
    if (h.type === 'mage' && h.R.sight && r >= 0 && fl.rooms[r].kind === 'room' && !fl.rooms[r].sensed && !exiting(h) && !inB('rune', r) && !inB('veil', r) && !isRt(r, 'fog')) {
      fl.rooms[r].sensed = true; let n = 0;
      fl.items.forEach(t => { if (LOOKS_TRAP(t.type) && !t.detected && !t.disabled && roomOf(t.x, t.y) === r) { learnTrap(t, 'scan', null); fl.stats.detected++; n++; floatTile(t.x, t.y, 'Wyczuta!', '#c3b2ff', 13, -0.6); } });
      if (n) { fl.stats.sensed = (fl.stats.sensed || 0) + n; say(h, pick(SAY.sense), 3); }
    }
    h.needPlan = true;
  }
  function inZone(x, y) { const k = key(x, y); return fl.zones.some(z => z.keys.has(k)); }
  function scanTraps(h) {
    const am = gearR(h, 'amulet');
    const R = (h.type === 'thief' ? 2 : 0) + h.R.detect + Math.max(0, Math.round(am * itemPow(h))), lit = litLantern(h);
    if (R <= 0 && !lit) return;
    fl.items.forEach(it => {
      if (!LOOKS_TRAP(it.type) || it.detected || it.disabled) return;
      const dd = Math.max(Math.abs(it.x - h.tx), Math.abs(it.y - h.ty));
      if (isRt(slotRoom(it.type, it.x, it.y), 'fog')) { if (!(lit && dd <= 1)) return; }   // Mgła: nothing to see in there (1.20: but the tiles next to his lantern)
      else if (dd > R) return;
      learnTrap(it, 'scan', h); fl.stats.detected++;
      floatTile(it.x, it.y, 'Wykryta!', '#ffe066', 13, -0.6);
    });
  }
  function updateHero(h, dt) {
    const P = fl.party;
    if (h.gone) { if (fl.time >= h.fallUntil) landFallen(h); return; }
    if (h.flash > 0) h.flash -= dt;
    h.accT += dt;
    if (h.accT >= 0.6) { if ((h.accG || 0) >= 0.1) floatHero(h, '+' + fmtG(h.accG), '#c3b2ff', 13); h.acc = 0; h.accG = 0; h.accT = 0; }   // 1.01: Groza (violet)
    const ot = heroTile(h); h.tx = ot[0]; h.ty = ot[1];
    const rr = roomOf(h.tx, h.ty); if (rr >= 0) h.room = rr;
    if (fl.time < h.burnUntil) {
      damage(h, 6 * S.dmg * dt, BURN); if (h.dead) return;
      // 1.20: burning with bombs in the pack: one may go off (15% a second a bomb, at most 45%)
      const bs = h.inv.filter(x => x.type === 'bomb');
      if (bs.length) {
        if (!h.cookSaid) { h.cookSaid = true; sayNow(['fire'], () => say(h, pick(SAY.bombCook), 4, null, 'loud')); }
        if (Math.random() < dt * Math.min(0.45, 0.15 * bs.length)) { bombCook(h, bs[0]); if (h.dead) return; }
      }
    }
    if (h.hp < h.R.potion * h.max) {   // a potion when it gets bad (rookies wait far too long)
      const pot = h.inv.filter(x => x.type === 'potion').sort((a, c) => c.r - a.r)[0];
      if (pot) { h.inv.splice(h.inv.indexOf(pot), 1); h.hp = Math.min(h.max, h.hp + h.max * potionHeal(pot) * itemPow(h) * taintedSip(h, pot)); fl.stats.potions++; fl.stats.itemsUsed++; say(h, pick(SAY.potion), 3);   /* 1.18: Zepsute mikstury */ floatHero(h, 'Mikstura', '#8be38f', 14, -0.7); tl('po', h.id); }
    }
    heroAbilities(h, dt);
    if (inZone(h.tx, h.ty)) h.slowUntil = Math.max(h.slowUntil, fl.time + 0.15);
    if (mods.mire && h.slowUntil > fl.time && h.room >= 0 && isRt(h.room, 'swamp')) h.slowUntil += dt * (1 - 1 / (1 + mods.mire));   // 1.18 Grzęzawisko: a slow runs out half as fast in a Bagno (a third as fast with 2 copies)
    // v14: fear always fades by a steady amount (level-based), half as fast alone, lost or caged, slower right after a wound,
    // after a death (shaken) and under a curse
    if (!h.fleeing && h.fear > 0) h.fear = Math.max(0, h.fear - h.R.calm * mods.calmK * dt * (h.alone || h.lost || caged(h) ? 0.5 : 1) * (fl.time - h.hurtAt < 1.5 ? 0.5 : 1) * (fl.time < h.shakenUntil ? 0.35 : 1) * (h.cursed ? 0.5 : 1));
    h.scan -= dt;
    if (h.scan <= 0) { h.scan = 0.5; scanTraps(h); }
    h.thinkT -= dt;
    if (h.sliding && (h.state !== 'walk' || h.nx === null)) h.sliding = false;   // 1.10: a cage or a fall stops a slide
    if (caged(h)) {
      if (hasCrowbar(h) && fl.time - (h.cagedAt || 0) >= 4) { freeCaged(h, false, 'pry'); sayNow(['cage'], () => say(h, pick(SAY.crowbarCage), 3)); fl.stats.crowbarCage = (fl.stats.crowbarCage || 0) + 1; tl('lm', h.id, 'cage'); }   // 1.20: he levers the bars himself
      else if (fl.time >= h.cageUntil) cageEnds(h);
      return;
    }
    if (h.state === 'rest') {
      const haven = h.room >= 0 && isRt(h.room, 'haven'), dream = !!h.dream && fl.time < (h.napUntil || -1); if (!(h.restAt > 0)) h.restAt = fl.time;   // 1.18: dream = asleep to the lullaby (Usypianka)
      if (fl.time >= h.burnUntil) h.hp = Math.min(h.max, h.hp + 4 * dt * (haven || dream ? 0.5 : 1));
      if (haven || dream) { addFear(h, 3.5 * dt, null, 'nightmare'); if (!h.dreamSaid && fl.time - (h.restAt || fl.time) > 1.5) { h.dreamSaid = true; say(h, pick(dream && !haven ? SAY.lullDream : SAY.nightmare), 2); } }   // 1.10: Sanktuarium
      const nap = fl.time < (h.napUntil || -1);
      if ((P.plan !== 'retreat' && !nap) || panicking(h) || exiting(h)) { h.state = 'walk'; h.napUntil = -1; h.restAt = -1; h.needPlan = true; h.dream = false; }
      return;
    }
    if (h.state === 'disarm') {
      h.timer -= dt;
      if (exiting(h)) { h.state = 'walk'; h.item = null; h.disarmT = null; h.needPlan = true; return; }
      if (h.timer <= 0) {
        const it = h.item;
        if (it && fl.items.get(key(it.x, it.y)) === it && !it.disabled && it.type === 'decoy') { decoyAlarm(it, h); tl('ds', h.id, it.type, it.x, it.y, 0); }
        else if (it && fl.items.get(key(it.x, it.y)) === it && !it.disabled) {
          if (!CURSED[it.type] && Math.random() < h.R.fail && it.cd <= 0) {   // a rookie's hand slips
            fl.stats.disarmFails++; say(h, pick(SAY.disarmFail), 3); tl('df', h.id, it.type, it.x, it.y); fire(it, 1);
          } else if (rigged(it)) {
            say(h, pick(SAY.disarmFail), 3); tl('df', h.id, it.type, it.x, it.y);
          } else if (h.type === 'thief' && !CURSED[it.type] && Math.random() < h.R.sapper) {   // a seasoned thief with a sapper's kit takes it apart for good
            fl.items.delete(key(it.x, it.y)); fl.threatDirty = true; fl.stats.disarmed++; fl.stats.sapped = (fl.stats.sapped || 0) + 1; bt(it.type).disarmed++; bt(it.type).sapped = (bt(it.type).sapped || 0) + 1;
            burst(it.x + 0.5, it.y + 0.5, '#a69bbb', 10); floatTile(it.x, it.y, 'Rozmontowane!', '#ff9a9a', 15); say(h, pick(SAY.sapped), 3); tl('ds', h.id, it.type, it.x, it.y, 1);
          } else {
            it.disabled = true; fl.threatDirty = true; fl.stats[CURSED[it.type] ? 'blessed' : 'disarmed']++; bt(it.type).disarmed++;
            floatTile(it.x, it.y, CURSED[it.type] ? (it.type === 'portrait' ? 'Odczyniony' : 'Odczynione') : 'Rozbrojone', '#a69bbb', 14); say(h, pick(CURSED[it.type] ? SAY.blessDone : SAY.disarmDone), 2); tl('ds', h.id, it.type, it.x, it.y, 0);   // 1.17: the priest's own words
            mentorProud(h, 1.6);   // 1.21
          }
        }
        h.state = 'walk'; h.item = null; h.disarmT = null; h.needPlan = true;
      }
      return;
    }
    if (h.state === 'smash') {   // 1.05: the barbarian's axe at work
      h.timer -= dt;
      const t = h.smashIt;
      if (!t || exiting(h) || panicking(h) || inB('shackles', h.room)) { h.state = 'walk'; h.smashIt = null; h.needPlan = true; return; }
      if (h.timer <= 0) { smashDone(h, t); h.state = 'walk'; h.smashIt = null; h.smashCd = fl.time + (raging(h) ? 2 : 5); h.needPlan = true; }
      return;
    }
    if (h.state === 'free') {
      const c = byId(h.freeT);
      if (!c || !caged(c) || exiting(h)) { h.state = 'walk'; h.needPlan = true; return; }
      h.timer -= dt;
      if (h.timer <= 0) { freeCaged(c, true); if (hasCrowbar(h)) { fl.stats.crowbarCage = (fl.stats.crowbarCage || 0) + 1; tl('lm', h.id, 'cage'); } h.state = 'walk'; h.needPlan = true; }
      return;
    }
    // 1.20: kneeling by a body (pickup): a wound does not stop him (that is the price), running out or a panic does
    if (h.state === 'loot') {
      if (exiting(h) || panicking(h) || h.fleeing) { h.state = 'walk'; h.lootIt = null; h.needPlan = true; return; }
      h.timer -= dt;
      if (h.timer <= 0) { const it = h.lootIt; h.state = 'walk'; h.lootIt = null; h.needPlan = true; if (it) bodyLoot(h, it); }
      return;
    }
    if (h.state === 'fight') {
      const g = h.foe;
      if (!g || g.hp <= 0 || fl.items.get(key(g.x, g.y)) !== g || (exiting(h) && !standing(h))) { h.state = 'walk'; h.foe = null; h.needPlan = true; }   // 1.22: a last stand fights on the way out
      else {
        const bomb = h.inv.find(x => x.type === 'bomb');
        if (bomb && g.hp > 60) {
          // 1.20: the blast hurts a friend next to the monster: a veteran holds it (not in a fury), a rookie throws anyway
          const near = alive().filter(o => o !== h && Math.max(Math.abs(o.tx - g.x), Math.abs(o.ty - g.y)) <= 1);
          if (near.length && h.rank >= 1 && !raging(h)) { if (h.bombHeldFor !== g) { h.bombHeldFor = g; fl.stats.bombHeld = (fl.stats.bombHeld || 0) + 1; } }
          else {
            h.inv.splice(h.inv.indexOf(bomb), 1); fl.stats.bombs++; fl.stats.itemsUsed++; say(h, pick(SAY.bomb), 3); burst(g.x + 0.5, g.y + 0.5, '#ffb35c', 16); hurtMonster(g, 80 * Math.pow(Math.min(4, bomb.r), 1.3) * itemPow(h));
            near.forEach(o => damage(o, 20 * S.dmg * Math.sqrt(Math.min(4, bomb.r)), BURN));
            if (near.length) { fl.stats.bombFriendly = (fl.stats.bombFriendly || 0) + near.length; tl('bf2', h.id, near.length); P.queueSay.push({ id: near[0].id, text: pick(SAY.bombFriendly), at: fl.time + 0.4, prio: 3 }); }
          }
        }
        return;
      }
    }
    if (h.state === 'boss') { if (P.plan !== 'assault' || exiting(h) || panicking(h)) { h.state = 'walk'; h.needPlan = true; } return; }
    if (h.nx === null && (h.state === 'talk' || h.state === 'wait' || h.state === 'rest') && !standing(h) && !sacrificing(h) && toSafety(h)) return;   // 1.13: never stands still in a trap (1.22: unless he stands there on purpose)
    if (h.nx === null && (h.state === 'walk' || h.state === 'talk' || h.state === 'wait' || h.state === 'rest') && stepAside(h)) return;   // 1.12.1: one hero a tile
    if ((h.state === 'talk' || h.state === 'wait' || h.state === 'rest') && h.nx === null && (h.glanceT = (h.glanceT || 0) - dt) <= 0) glance(h);   // 1.10
    if (h.state === 'talk' && (h.huddle || h.toSafe) && h.path.length) h.state = 'walk';   // 1.12.1: still walking up to the huddle (1.13: or off a trap)
    if (h.state === 'talk') { if ((!talking(h) && !(h.id === P.leaderId && fl.time < P.waitUntil)) || exiting(h)) { h.state = 'walk'; h.needPlan = true; } else return; }
    if (h.state === 'wait') { h.timer -= dt; if (h.timer > 0) return; h.state = 'walk'; h.needPlan = true; }
    if (exiting(h) && h.nx === null && isExitTile(h.x, h.y)) { heroExit(h); return; }
    // the party stops to talk, or the leader waits for stragglers
    if (!fl.fearless && !exiting(h) && !h.lost && !panicking(h) && h.nx === null && (talking(h) || (h.id === P.leaderId && fl.time < P.waitUntil)) && !onScout(h) && !(h.wanderUntil > fl.time) && !((h.huddle || h.toSafe) && h.path.length)) {
      h.state = 'talk'; h.huddle = false; const hl = byId(h.huddleId); if (hl && hl !== h && !hl.dead) lookAt(h, hl.x, hl.y);   // 1.12.1: he faces the leader
      return;
    }
    if (h.nx === null) {
      if (h.needPlan || h.thinkT <= 0 || !h.path.length) planHero(h);
      if (h.state !== 'walk') return;
      if (h.path.length && !passable(h.path[0][0], h.path[0][1])) planHero(h);
      if (!h.path.length || !passable(h.path[0][0], h.path[0][1])) {
        if (h.intent !== 'follow' || (leader() && hdist(h, leader()) > 3)) h.noPathT += 0.4;
        h.state = 'wait'; h.timer = 0.4; return;
      }
      const n = h.path[0], g = fl.items.get(key(n[0], n[1]));
      if (g && MONSTERS[g.type] && !DRIFT[g.type] && g.hp > 0) { h.state = 'fight'; h.foe = g; return; }
      if (sacHold(h)) { h.state = 'wait'; h.timer = 0.3; return; }   // 1.22: the trap one of them sets off on purpose has not gone off yet
      if (youFirst(h, n) || tapStep(h, n)) return;   // 1.22: "ty pierwszy", a stick on the floor
      if (h.R.coord && h.type !== 'thief' && !fl.fearless && !exiting(h) && fl.disarmKeys && fl.disarmKeys.has(key(n[0], n[1])) && !fl.disarmKeys.has(key(h.x, h.y))) { h.state = 'wait'; h.timer = 0.4; return; }
      // a careful leader hesitates before stepping into the unknown when morale is low; rookies just barge in
      if (h.id === P.leaderId && h.rank >= 1 && !fl.fearless && !exiting(h) && P.morale < 0.75 && isFrontierTile(n[1] * WW + n[0]) && !P.hesitated.has(n[1] * WW + n[0])) {
        P.hesitated.add(n[1] * WW + n[0]); talk(0.9, [pick(SAY.hesitate)]); h.state = 'talk'; return;
      }
      // the warrior raises his shield stepping into a trap they know about
      const dng = fl.danger[n[1] * WW + n[0]];
      if (h.type === 'warrior' && !fl.fearless && dng > 1 && fl.time > h.shieldCd) { h.shieldUpUntil = fl.time + 2.5; h.shieldCd = fl.time + h.R.shieldCd; fl.stats.shields++; say(h, pick(h.id === fl.party.leaderId && !exiting(h) && (h.intent === 'lead' || h.intent === 'heart' || h.intent === 'detour') ? SAY.shieldLead : SAY.shield), 2); }   // 1.17: 'follow me' only from a warrior who leads them forward
      // powers: a talisman before a known trap (veterans), boots to run out, to dash past a trap, or to find the others
      if (h.inv.length) {
        if (dng > 1.5 && !fl.fearless && !exiting(h)) useCharm(h, 'danger');
        if (exiting(h) || (h.lost && h.rank >= 1) || (dng > 1 && h.rank >= 1 && !fl.fearless)) useBoots(h, exiting(h) ? 'out' : 'dash');
      }
      // 1.12.1: one hero a tile; passing each other is fine
      const o = heroBlock(h, n[0], n[1]);
      if (o) {
        const swap = (o.nx === h.x && o.ny === h.y) || (o.nx === null && o.state === 'walk' && o.path.length && o.path[0][0] === h.x && o.path[0][1] === h.y);
        if (!swap) {
          if (h.path.length === 1 && o.nx === null) {   // where he was going is taken: he stops next to it
            if (h.lootKey && makeWay(o, h, 0)) return;   // 1.13.2: unless it is the treasure he came for and the one on it just stands there
            h.path = []; h.blockT = 0; h.state = 'wait'; h.timer = 0.3; return;
          }
          h.blockT = (h.blockT || 0) + dt;
          if (h.blockT < BLOCK_WAIT) return;   // a moment for the other one to move on
          if (o.nx === null && makeWay(o, h, 0)) return;   // 1.12.1: an idle one steps out of his way
          if (!h.detoured) { h.detoured = true; if (detourAround(h)) { h.blockT = 0; return; } }
          const urgent = exiting(h) || panicking(h) || h.fleeing || h.crystal, jam = o.nx === null && o.state === 'walk' && (o.blockT || 0) > 0;
          if (h.blockT < (urgent ? SQUEEZE_RUN : jam ? SQUEEZE_T : SQUEEZE_LONG)) return;   // a busy one (resting, disarming...) is waited for longer
          // he only squeezes past: the tile behind the other one must be free, or he would stand on his tile (an urgent one may push on)
          const beyond = h.path[1];
          if (!urgent && (!beyond || heroBlock(h, beyond[0], beyond[1]))) { if (h.blockT > SQUEEZE_LONG + 2) { h.blockT = 0; h.detoured = false; h.path = []; h.needPlan = true; } return; }
          fl.stats.squeezes = (fl.stats.squeezes || 0) + 1;
        }
        h.passing = o.id; if (swap) o.passing = h.id;   // they pass each other (a step to the side, drawn)
      }
      h.blockT = 0; h.detoured = false;
      h.path.shift(); h.nx = n[0]; h.ny = n[1]; h.prog = 0;
    }
    const slow = fl.time < h.slowUntil ? 0.35 : 1;
    const dash = !fl.fearless && h.rank >= 1 && fl.danger[h.ny * WW + h.nx] > 0 ? 1.3 : 1;
    const careful = h.R.caution && !exiting(h) && !fl.fearless && isFrontierTile(h.ny * WW + h.nx) ? 0.8 : 1;   // elites test the floor in unknown places
    const sprint = fl.time < h.sprintUntil ? h.sprintK : 1;   // boots (a power)
    const bog = isRt(roomOf(h.nx, h.ny), 'swamp') || isRt(roomOf(h.x, h.y), 'swamp') ? 0.65 : 1;   // Bagno
    const purse = h.gold > 0 ? Math.max(0.8, 1 - 0.04 * h.gold) : 1;   // a heavy purse
    const load = burden(h);   // 1.20 Udźwig: a heavy pack
    if (load < 1) { fl.stats.loadSlowT = (fl.stats.loadSlowT || 0) + dt; if (!h.heavySaid) { h.heavySaid = true; say(h, pick(SAY.heavyLoad), 2); } }
    if (h.sliding) { h.prog += 3.2 * dt; if (h.prog >= 1) { h.ldx = h.nx - h.x; h.ldy = h.ny - h.y; h.slid = true; h.sliding = false; h.x = h.nx; h.y = h.ny; h.nx = null; h.ny = null; h.prog = 0; onEnter(h); } return; }   // 1.10: a slide on the ice: fast, nothing stops it
    const spd = h.T.speed * h.R.speed * (S.heroSpeed / 100) * slow * (fl.fearless ? 1.3 : 1) * dash * careful * sprint * bog * purse * load *
      (panicking(h) ? 1.2 : 1) * (h.fleeing ? 1.15 : 1) * (h.crystal ? 0.9 * mods.carrierSlow : 1) * (fl.time < P.rushUntil && !exiting(h) ? 1.25 : 1) * (fl.time < h.rageUntil ? 1.25 : 1) *
      (h.tap && !exiting(h) && roomOf(h.nx, h.ny) === h.tap.room ? 0.7 : 1) * escortPace(h);   // 1.22: tapping the floor; a guard keeps the carrier's pace
    h.prog += spd * dt;
    if (h.prog >= 1) { h.ldx = h.nx - h.x; h.ldy = h.ny - h.y; h.slid = !!h.sliding; h.sliding = false; h.passing = null; h.x = h.nx; h.y = h.ny; h.nx = null; h.ny = null; h.prog = 0; onEnter(h); }
  }
