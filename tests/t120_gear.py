# 1.20 Ekwipunek i łup: where an item comes from, the dead's things (no relics, a body to search, a predecessor's pile), a curse that
# passes on, sharing and swapping, an amulet in a crisis, weight, who takes the loot (the leader's word, an offer, rivals), the lantern,
# the crowbar, a crit and the mimic's belly, bombs in a fire, a returner's trophy, the hero card and the log; the new lines; organic
# waves with no page errors. Prints FAILS [...] and exits 1 on any. (--only=gear,share,...: just these sections)
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t118_cards.py').read().split('# ---------- 1.')[0])   # LIB (T.fresh, T.raid, T.put, T.tough, T.place, T.withRandom, T.stepS)
from playwright.async_api import async_playwright
LIB2 = r"""() => { const { G } = T;
  T.quiet = () => { G.fl.heroes.forEach(o => { o.bubble = null; o.saidUntil = -9; o.sayQ = null; }); G.fl.party.queueSay = []; };
  T.said = []; G.setSayHook((h, t) => T.said.push([h.id, t]));
  T.clearPiles = () => { G.fl.items.forEach((o, k) => { if (o.dropped) G.fl.items.delete(k); }); };
  T.pile = (x, y, o) => { const p = Object.assign({ type: 'loot2', x, y, cd: 0, anim: 0, disabled: false, hp: 0, max: 0, power: 1, shot: 0, flash: 0, preview: 0, dropped: true, spent: 0, item: null, gold: 0, noGreed: false,
    from: null, fromNm: null, fromFem: null, fromWave: G.run.wave, body: null, knocked: null, seenWave: 0 }, o || {}); G.fl.items.set(T.key(x, y), p); return p; };
  T.big = () => T.rooms().slice().sort((a, b) => b.tiles.length - a.tiles.length);
  T.setup = (types, room) => { T.fresh(7); const rs = T.big(), R = rs[0], R2 = rs[1]; if (room) T.setRoom(R, room); if (T.pre) T.pre(T.room(R)); T.pre = null; const f = T.raid(types); G.fl.known.fill(1); return { f, R: T.room(R), R2: T.room(R2) }; };
  T.revive = h => { h.dead = false; h.hp = h.max; h.outR = undefined; h.state = 'wait'; };
  T.of = t => G.alive().find(h => h.type === t);
  T.away = (h, R2) => { const t = T.walkT(R2)[h.id % 3]; T.put(h, t[0], t[1]); };
  T.it = (type, r, o) => Object.assign({ type, r, cdUntil: 0, src: 'kit', charges: G.HITEMS[type].use === 'power' ? 1 : undefined }, o || {});
  // the fear at which lootDecision stops going: a lower one means the pile is worth less to him (or riskier)
  T.thr = (h, it) => { const b = G.bfs(h.x, h.y, { known: true }), idx = it.y * G.WW + it.x;
    const go = fear => { h.fear = fear; h.lootMemo.clear(); return T.withRandom(0.99, () => G.lootDecision(h, it, b, idx)); };
    let lo = 0, hi = 60 * h.courage; if (!go(0)) return 0; if (go(hi)) return hi;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (go(m)) lo = m; else hi = m; } h.fear = 0; h.lootMemo.clear(); return lo; };
  T.near = (x, y, n) => { const out = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a = x + dx, b = y + dy; if ((dx || dy) && G.walkable(a, b) && !G.fl.items.has(T.key(a, b))) out.push([a, b]); } return out.sort((p, q) => Math.hypot(p[0] - x, p[1] - y) - Math.hypot(q[0] - x, q[1] - y)).slice(0, n || 9); };
  return true; }"""
# ---------- 5.1 where it comes from, the dead's things, the curse on the item, the 10 piles ----------
GEAR = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(7);
  const e = G.makeHero('warrior', 12, 6, new Set());
  for (let i = 0; i < 20 && !e.inv.length; i++) Object.assign(e, { inv: G.makeHero('warrior', 12, 6, new Set()).inv });
  ok(e.inv.length && e.inv.every(x => x.src === 'kit'), 'kit items have src kit: ' + JSON.stringify(e.inv));
  const nx = G.makeWave(4).slice(0, 4); ['warrior', 'thief', 'mage', 'priest'].forEach((t, i) => { nx[i].type = t; nx[i].boss = null; }); nx[0] = e; G.run.next = nx;
  G.startWave(); const f = G.fl; for (let i = 0; i < 600 && f.queue.length; i++) T.stepS(0.05);
  const h = f.heroes.find(x => x.entry === e);
  ok(h && h.inv.length && h.inv.every(x => x.owner === h.id && x.ownerNm[0] === h.nm[0] && x.src === 'kit' && x.wave === G.run.wave), 'spawned: owner, ownerNm, src, wave');
  G.alive().forEach(T.tough); G.fl.known.fill(1);
  const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), R = T.room(T.big()[0]), tl = T.walkT(R);
  // 2. a power-3 bomb of a dead hero is plain gear; a relic of yours stays a relic
  T.put(th, tl[0][0], tl[0][1]); th.lvl = 12; th.inv = [T.it('bomb', 3)]; th.hp = 0; th.dead = true; G.kill(th, 'trap', 'spikes');
  let p = [...f.items.values()].find(o => o.body === th.id);
  ok(p && p.type === 'loot2' && p.fromNm && p.fromNm[0] === th.nm[0] && p.fromWave === G.run.wave, 'a dead hero\'s r3 bomb: loot2 with his name: ' + (p && p.type));
  T.put(mg, tl[3][0], tl[3][1]); mg.inv = [T.it('charm', 3, { src: 'relic' })]; mg.hp = 0; mg.dead = true; G.kill(mg, 'trap', 'spikes');
  p = [...f.items.values()].find(o => o.body === mg.id);
  ok(p && p.type === 'loot3', 'a relic of yours on a body stays loot3: ' + (p && p.type));
  // 3. the greed of a body's pile is half a plain one's; one who knows of the death says whose it is
  T.clearPiles();
  const t0 = tl[6], t1 = tl[8], t2 = tl[10];
  const nm = ['Borys', 'Borysa', 'Borysie'];
  const a = T.pile(t0[0], t0[1], { item: T.it('armor', 2) }), b = T.pile(t1[0], t1[1], { item: T.it('armor', 2), body: 77, fromNm: nm, fromFem: false });
  G.setGreed(1.2); f.stats.lootSeen = 0; let g0 = f.greed; G.noticeLoot(a, null); const d1 = f.greed - g0;
  G.setGreed(1.2); f.stats.lootSeen = 0; g0 = f.greed; G.noticeLoot(b, null); const d2 = f.greed - g0;
  out.greed = [d1, d2]; ok(d1 > 0 && Math.abs(d2 / d1 - 0.5) < 0.08, 'body greed is half: ' + d1 + ' / ' + d2);
  ok(f.stats.greedBody > 0, 'greedBody counted');
  f.deaths = (f.deaths || []).concat([{ id: 77, t: f.time, knows: new Set([w.id]) }]);
  const c = T.pile(t2[0], t2[1], { item: T.it('bomb', 1), body: 77, fromNm: nm, fromFem: false });
  T.put(w, tl[1][0], tl[1][1]); T.quiet(); T.said = [];
  G.noticeLoot(c, w);
  const fallen = G.SAY.lootFallen.map(x => G.nameFill(x, { nm, female: false }));
  out.fallen = T.said.map(s => s[1]); ok(T.said.some(s => s[0] === w.id && fallen.includes(s[1])), 'lootFallen with the dead one\'s name: ' + JSON.stringify(out.fallen));
  ok(f.stats.lootFallen === 1, 'lootFallen stat');
  // 4. a cursed item: it curses the next one who takes it; a priest lifting the curse cleans the items
  T.clearPiles(); f.stats.cursePassed = 0;
  const v = th; T.revive(v);   // the thief again
  const cz = T.it('armor', 2, { src: 'loot' }); v.inv = []; T.put(v, tl[5][0], tl[5][1]);
  G.curse(v, cz); ok(cz.cursed && v.inv.includes(cz), 'curse marks the item');
  v.hp = 0; v.dead = true; G.kill(v, 'trap', 'spikes');
  const cp = [...f.items.values()].find(o => o.body === v.id && o.item && o.item.cursed);
  ok(!!cp, 'the cursed item stays cursed on the floor');
  pr.inv = []; pr.cursed = false; T.put(pr, cp.x, cp.y);
  if (cp) G.bodyLoot(pr, cp);
  ok(pr.cursed === true && f.stats.cursePassed === 1, 'taking it curses him: ' + pr.cursed + ' ' + f.stats.cursePassed);
  ok(pr.inv.some(x => x.cursed), 'he holds the cursed item');
  // giveItem: a cursed one is never swapped
  T.quiet(); T.said = []; ok(!G.giveItem(pr, T.it('armor', 3)), 'a cursed armour is not swapped for a better one');
  // the priest lifts it (from himself: no friend cursed)
  pr.lvl = 6; pr.faith = 9; pr.cast = 0; G.heroAbilities(pr, 0.05);
  ok(!pr.cursed && pr.inv.every(x => !x.cursed), 'a lifted curse cleans his items: ' + pr.cursed);
  // 5. at most 10 piles: the plain ones go first
  T.clearPiles();
  const spots = T.walkT(R).concat(T.walkT(T.room(T.big()[1])));
  const plain = []; for (let i = 0; i < 8; i++) { const s = spots[i * 2]; G.dropAt(s[0], s[1], T.it('potion', 1), 0, false); }
  f.items.forEach(o => { if (o.dropped) { o.fromWave = G.run.wave - 1; plain.push(o); } });
  const d = mg; T.revive(d); const s9 = spots[spots.length - 1]; T.put(d, s9[0], s9[1]); d.inv = [T.it('potion', 1), T.it('bomb', 1), T.it('charm', 1)]; d.hp = 0; d.dead = true; G.kill(d, 'trap', 'spikes');
  const left = [...f.items.values()].filter(o => o.dropped);
  out.limit = { n: left.length, body: left.filter(o => o.body === d.id).length, firstGone: !f.items.has(key(plain[0].x, plain[0].y)) };
  ok(left.length === 10 && out.limit.body === 3 && out.limit.firstGone, 'limit 10: the oldest plain pile goes: ' + JSON.stringify(out.limit));
  return { fails, out }; }"""
# ---------- 5.2 a predecessor's things ----------
PRED = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest']); const tl = T.walkT(R);
  const [w, th, mg] = ['warrior', 'thief', 'mage'].map(T.of);
  const nm = ['Wanda', 'Wandę', 'Wando'];
  const mk = (i, o) => T.pile(tl[i][0], tl[i][1], Object.assign({ item: T.it('charm', 2), body: 5, fromNm: nm, fromFem: true, fromWave: G.run.wave - 1 }, o || {}));
  [w, th, mg].forEach((h, i) => { T.put(h, tl[12 + i][0], tl[12 + i][1]); h.courage = 100; h.fear = 0; });
  T.quiet(); T.said = [];
  T.withRandom(0.1, () => G.noticeLoot(mk(0), w));
  const lines = G.SAY.predecessorGear.map(x => G.nameFill(x, { nm, female: true }));
  out.said = T.said.map(s => s[1]);
  ok(T.said.some(s => s[0] === w.id && lines.includes(s[1])), 'predecessorGear with the name: ' + JSON.stringify(out.said));
  out.fear = w.fear; ok(w.fear > 0.03 * w.courage && w.fear < 0.12 * w.courage, 'fear about 5% of courage: ' + w.fear);
  ok(f.stats.predecessorSeen === 1, 'predecessorSeen 1');
  T.quiet(); T.said = []; T.withRandom(0.1, () => G.noticeLoot(mk(1), w));
  ok(f.stats.predecessorSeen === 1 && !T.said.some(s => lines.includes(s[1])), 'once a hero a wave');
  T.withRandom(0.9, () => G.noticeLoot(mk(2), th)); ok(f.stats.predecessorSeen === 1 && th.fear === 0, 'roll 0.9: nothing');
  T.withRandom(0.1, () => G.noticeLoot(mk(3, { fromWave: G.run.wave }), mg)); ok(f.stats.predecessorSeen === 1 && mg.fear === 0, 'a pile of this wave: never');
  return { fails, out }; }"""
# ---------- 5.3 a body to search ----------
BODY = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']); let tl = T.walkT(R);
  let [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  [th, pr].forEach(h => T.away(h, R2));
  const c0 = tl[Math.floor(tl.length / 2)];
  T.put(mg, c0[0], c0[1]); mg.inv = [T.it('potion', 1), T.it('armor', 2, { src: 'loot' }), T.it('bomb', 1)]; mg.hp = 0; mg.dead = true; G.kill(mg, 'trap', 'spikes');
  const piles = () => [...f.items.values()].filter(o => o.body === mg.id);
  const p0 = piles().find(o => o.x === c0[0] && o.y === c0[1]) || piles()[0];
  out.piles = piles().length;
  w.inv = []; T.put(w, p0.x, p0.y); w.state = 'walk'; G.onEnter(w);
  ok(w.state === 'loot' && w.dur === 1, 'kneels for 1 s: ' + w.state + ' ' + w.dur);
  for (let i = 0; i < 120 && w.state === 'loot'; i++) G.step(0.05);   // (a death slows the game for a moment)
  out.got = w.inv.map(x => x.type + ':' + x.src);
  ok(w.inv.some(x => x.type === 'armor') && w.inv.some(x => x.type === 'potion'), 'took the armour and the potion: ' + out.got);
  ok(w.inv.some(x => x.type === 'potion' && x.src === 'body'), 'a kit item of the dead one becomes src body');
  ok(piles().length === 3 - w.inv.length, 'the taken piles are gone');
  ok((f.party.lootedDead || []).length === 1 && f.stats.bodyLoot >= 2, 'onLootDead: ' + JSON.stringify(f.party.lootedDead) + ' ' + f.stats.bodyLoot);
  ok(f.stats.bodyLootBy && f.stats.bodyLootBy.warrior >= 2, 'bodyLootBy');
  // 2. a thief kneels 0.5 s
  ({ f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest'])); tl = T.walkT(R); [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  T.put(mg, tl[5][0], tl[5][1]); mg.inv = [T.it('potion', 1)]; mg.hp = 0; mg.dead = true; G.kill(mg, 'trap', 'spikes');
  let pp = piles()[0]; th.inv = []; T.put(th, pp.x, pp.y); th.state = 'walk'; G.onEnter(th);
  ok(th.state === 'loot' && th.dur === 0.5, 'a thief 0.5 s: ' + th.dur);
  // 4. a panic breaks it off: nothing taken
  th.panicUntil = f.time + 3; for (let i = 0; i < 60 && th.state === 'loot'; i++) G.step(0.05);
  ok(th.state !== 'loot' && !th.inv.length && piles().length === 1, 'panic: walks away with nothing');
  // 3. a priest who saw the death holds back more than a warrior who did not
  T.clearPiles(); th.panicUntil = -1;
  [w, pr].forEach((h, i) => { T.put(h, tl[i][0], tl[i][1]); h.rank = 1; h.courage = 100; h.inv = []; });
  const a = T.pile(tl[8][0], tl[8][1], { item: T.it('armor', 2) }), b = T.pile(tl[9][0], tl[9][1], { item: T.it('armor', 2), body: 66, fromNm: ['Ala', 'Alę', 'Alo'], fromFem: true });
  [a, b].forEach(o => { o.seenWave = G.run.wave; });
  f.deaths = (f.deaths || []).concat([{ id: 66, t: f.time, knows: new Set([pr.id]) }]);
  const tp = [T.thr(pr, a), T.thr(pr, b)], tw = [T.thr(w, a), T.thr(w, b)];
  out.thr = { priest: tp, warrior: tw };
  ok(tp[1] < tp[0] * 0.9, 'the priest who saw it goes for the body\'s things less: ' + tp);
  ok(Math.abs(tw[1] - tw[0]) <= 0.02 * tw[0] + 0.01, 'the warrior who did not see it: the same: ' + tw);
  // the dead's gear keys come from the 1.21 pass
  ok(G.SAY.lootDead.length >= 6 && G.SAY.lootDeadObject.length >= 6 && G.SAY.lootDeadReply.length >= 6 && G.SOLO.lootDead.length >= 3, 'lootDead keys');
  return { fails, out }; }"""
# ---------- 5.4 sharing, swapping, an amulet in a crisis ----------
SHARE = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']); let tl = T.walkT(R);
  let [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  const pair = (a, b) => { T.put(a, tl[0][0], tl[0][1]); const n = T.near(tl[0][0], tl[0][1], 1)[0]; T.put(b, n[0], n[1]); };
  const P = f.party, reset = () => { P.shareT = 0; P.shareCd = 0; G.alive().forEach(h => { h.shareCd = 0; h.giveCd = 0; }); };
  [th, pr].forEach(h => T.away(h, R2));
  // 5. what armour is worth
  out.val = [G.itemValue(mg, T.it('armor', 2)), G.itemValue(w, T.it('armor', 2))];
  ok(out.val[0] < 1 && Math.abs(out.val[1] - 3.12) < 0.01, 'armour r2: mage ' + out.val[0] + ', warrior ' + out.val[1]);
  // 1. the mage hands his armour to the warrior at a talk
  pair(mg, w); mg.inv = [T.it('armor', 2, { src: 'loot' })]; w.inv = []; mg.state = 'talk'; reset();
  G.shareThink(G.alive(), G.leader(), 1.1);
  const ar = w.inv.find(x => x.type === 'armor');
  ok(ar && ar.gaveNm && ar.gaveNm[0] === mg.nm[0] && f.stats.gearGiven === 1 && (P.gifts || []).length === 1, 'the armour went to the warrior: ' + JSON.stringify(w.inv) + ' ' + f.stats.gearGiven);
  reset(); G.shareThink(G.alive(), G.leader(), 1.1);
  ok(w.inv.some(x => x.type === 'armor') && f.stats.gearGiven === 1, 'it does not come back');
  // 2. a goblin they know of in the room: nobody hands anything over
  mg.inv = [T.it('armor', 2)]; w.inv = []; reset();
  const gs = T.floorSpots(R, 'goblin').find(t => Math.hypot(t[0] - tl[0][0], t[1] - tl[0][1]) > 2.5);
  f.phase = 'build'; const gob = T.place('goblin', gs); f.phase = 'raid';
  if (!gob) { const g2 = { type: 'goblin', x: gs[0], y: gs[1], hp: 50, max: 50, cd: 0, gx: gs[0] + 0.5, gy: gs[1] + 0.5, lvl: 1, power: 1 }; f.items.set(key(gs[0], gs[1]), g2); }
  f.known.fill(1);
  G.shareThink(G.alive(), G.leader(), 1.1);
  ok(!w.inv.length && f.stats.gearGiven === 1, 'no handing over with a goblin in the room');
  f.items.delete(key(gs[0], gs[1]));
  // 3. a swap: the mage's armour for one of the warrior's two bombs; with one bomb no swap
  w.inv = [T.it('bomb', 3), T.it('bomb', 3)]; mg.inv = [T.it('armor', 2)]; reset();
  G.shareThink(G.alive(), G.leader(), 1.1);
  out.swap = [w.inv.map(x => x.type), mg.inv.map(x => x.type), f.stats.gearTrades];
  ok(w.inv.some(x => x.type === 'armor') && mg.inv.some(x => x.type === 'bomb') && f.stats.gearTrades === 1, 'swap: ' + JSON.stringify(out.swap));
  w.inv = [T.it('bomb', 3)]; mg.inv = [T.it('armor', 2)]; reset();
  G.shareThink(G.alive(), G.leader(), 1.1);
  ok(w.inv.some(x => x.type === 'armor') && !mg.inv.length && f.stats.gearTrades === 1, 'one bomb: a gift, no swap: ' + JSON.stringify([w.inv.map(x => x.type), mg.inv.map(x => x.type)]));
  // 4. the crisis: a calm priest gives his amulet to a thief about to panic
  [w, mg].forEach(h => T.away(h, R2)); pair(pr, th); reset();
  th.courage = 100; th.fear = 65; th.inv = []; pr.courage = 100; pr.fear = 0; pr.inv = [T.it('amulet', 1, { charges: 1 })]; th.calmUntil = -1;
  G.shareThink(G.alive(), G.leader(), 1.1);
  out.crisis = { thInv: th.inv.map(x => x.type), fear: th.fear, giveCd: pr.giveCd - f.time };
  ok(th.inv.some(x => x.type === 'amulet') && th.fear < 65 && pr.giveCd > f.time && f.stats.amuletGiven === 1, 'amulet in a crisis: ' + JSON.stringify(out.crisis));
  th.inv = []; th.fear = 65; th.calmUntil = -1; pr.inv = [T.it('amulet', 1, { charges: 1 })]; pr.fear = 50; reset();
  G.shareThink(G.alive(), G.leader(), 1.1);
  ok(!th.inv.length && f.stats.amuletGiven === 1, 'a scared priest keeps it');
  return { fails, out }; }"""
# ---------- 5.5 weight ----------
LOAD = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f } = T.setup(['warrior', 'thief', 'mage', 'priest']); const mg = T.of('mage');
  mg.lvl = 5; mg.invCap = 4; mg.inv = [T.it('bomb', 1), T.it('amulet', 1)];
  ok(Math.abs(G.carryOf(mg) - 9.5) < 1e-9, 'carry of a level 5 mage 9.5: ' + G.carryOf(mg));
  ok(G.giveItem(mg, T.it('armor', 2), true), 'mage L5 takes armour (8.5 of 9.5)');
  out.burden = G.burden(mg); ok(Math.abs(out.burden - (1 - 0.4 * (8.5 / 9.5 - 0.6))) < 1e-6, 'burden ' + out.burden);
  mg.lvl = 1; mg.inv = [T.it('bomb', 1), T.it('bomb', 1)]; const n0 = f.stats.tooHeavy || 0;
  ok(!G.giveItem(mg, T.it('armor', 2), true) && f.stats.tooHeavy === n0 + 1, 'mage L1 with two bombs: armour too heavy');
  mg.inv = [T.it('armor', 2), T.it('bomb', 1)];
  ok(G.giveItem(mg, T.it('armor', 3), true) && mg.inv.some(x => x.type === 'armor' && x.r === 3), 'a better armour of the same weight: swapped (8 of 8.3)');
  // kits fit: 200 random heroes
  const cls = ['warrior', 'barbarian', 'priest', 'bard', 'thief', 'mage']; let fit = 0;
  for (let i = 0; i < 200; i++) { const e = G.makeHero(cls[i % 6], 1 + (i % 20), 6, new Set()); if (G.loadOf(e) / G.carryOf(e) <= 1) fit++; }
  out.fit = fit; ok(fit >= 198, 'kits within the carry: ' + fit + '/200');
  return { fails, out }; }"""
# ---------- 5.6 who takes the loot ----------
CLAIM = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']); let tl = T.walkT(R);
  let [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  const P = f.party;
  T.put(w, tl[0][0], tl[0][1]); T.put(th, tl[1][0], tl[1][1]); T.put(pr, tl[2][0], tl[2][1]); T.away(mg, R2);
  const sp = tl[6], p = T.pile(sp[0], sp[1], { type: 'lpotion', dropped: false, fromWave: null, seenWave: G.run.wave }), k = key(sp[0], sp[1]);
  const claimTh = () => { P.lootClaim = new Map([[k, th.id]]); th.intent = 'loot'; th.lootKey = k; w.lootMemo.clear(); };
  w.hp = 0.3 * w.max; P.leaderId = pr.id; pr.rank = 1; claimTh(); P.queueSay = [];
  G.planHero(w);
  out.assign = { claim: P.lootClaim.get(k), w: w.id, q: P.queueSay.map(q => q.text) };
  ok(P.lootClaim.get(k) === w.id && f.stats.lootAssign === 1, 'the leader gives the potion to the wounded warrior: ' + JSON.stringify(out.assign));
  ok(P.queueSay.some(q => q.id === pr.id && (q.text.includes(w.nm[0]) || q.text.includes(w.nm[2]))), 'lootAssign with his name');
  // 2. no leader of rank 1+, both greedy: the claim stays, rivals once
  pr.rank = 0; w.trait = 'greedy'; th.trait = 'greedy'; claimTh();
  G.planHero(w); claimTh(); G.planHero(w);
  ok(P.lootClaim.get(k) === th.id && (P.lootRivals || []).length === 1 && f.stats.lootRival === 1, 'rivals: claim stays, one entry: ' + JSON.stringify(P.lootRivals));
  // 4. who saw it first; reset by startWave (in the last section)
  const q = T.pile(tl[8][0], tl[8][1], { fromWave: null, dropped: false });
  G.noticeLoot(q, th); G.noticeLoot(q, w); ok(q.firstBy === th.id, 'firstBy = the first one');
  ok(Math.abs(G.claimScore(th, q) - G.claimScore(w, q) - 0.5) < 1e-9, 'first seen: +0.5');
  // 3. a mage with a full pack finds armour: it stays known, the warrior next to him is told and goes for it
  ({ f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest'])); tl = T.walkT(R); [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  [th, pr].forEach(h => T.away(h, R2));
  mg.invCap = 4; mg.inv = [T.it('potion', 3), T.it('bomb', 3), T.it('amulet', 3), T.it('charm', 3)];
  const s2 = tl[4], lp = T.pile(s2[0], s2[1], { dropped: false, fromWave: null, seenWave: G.run.wave });
  T.put(mg, s2[0], s2[1]); const n = T.near(s2[0], s2[1], 3)[2]; T.put(w, n[0], n[1]); w.inv = [];
  const okP = T.withRandom(0.95, () => G.pickup(mg, lp));
  out.offer = { ok: okP, item: lp.item && lp.item.type, offerKey: w.offerKey, stat: f.stats.lootOffer };
  ok(!okP && lp.item && lp.item.type === 'armor' && w.offerKey === key(s2[0], s2[1]) && f.stats.lootOffer === 1, 'offer: ' + JSON.stringify(out.offer));
  const away = T.near(s2[0], s2[1], 9).filter(t => t[0] !== n[0] || t[1] !== n[1]).pop(); T.put(mg, away[0], away[1]); mg.timer = 30;
  w.state = 'walk'; w.needPlan = true; w.timer = 0;
  T.stepS(5);
  out.took = w.inv.map(x => x.type);
  ok(w.inv.some(x => x.type === 'armor') && f.stats.lootOfferTaken === 1, 'the warrior took what he was offered: ' + JSON.stringify(out.took) + ' ' + f.stats.lootOfferTaken);
  return { fails, out }; }"""
# ---------- 5.7 the lantern ----------
LANT = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], { rt: 'fog' }); const tl = T.walkT(R);
  const [w, th, mg] = ['warrior', 'thief', 'mage'].map(T.of);
  T.put(w, tl[0][0], tl[0][1]); const n = T.near(tl[0][0], tl[0][1], 1)[0]; T.put(mg, n[0], n[1]);
  w.inv = []; const l0 = G.lostChance(mg);
  w.inv = [T.it('lantern', 1, { src: 'guild' })]; const l1 = G.lostChance(mg);
  out.lost = [l0, l1]; ok(G.lanternNear(mg) && Math.abs(l0 - l1 - 0.3) < 1e-9, 'lostChance in the fog: +0.45 without, +0.15 with a lantern: ' + out.lost);
  // the fog's roll
  const pp = 1 * 0.22 * Math.max(0.35, 1 - 0.03 * mg.lvl), s0 = f.stats.lanternSaves || 0;
  w.inv = []; const r0 = T.withRandom(0.5 * pp, () => G.fogRoll(mg, 1));
  w.inv = [T.it('lantern', 1)]; const r1 = T.withRandom(0.5 * pp, () => G.fogRoll(mg, 1));
  ok(r0 === true && r1 === false && f.stats.lanternSaves === s0 + 1, 'the fog roll: lost without, saved with: ' + r0 + ' ' + r1);
  // a level 3 shade blows it out for 8 s
  const lt = w.inv[0]; G.douseLantern(w, { type: 'shade', lvl: 3, x: 0, y: 0 });
  ok(lt.outUntil === f.time + 8 && !G.lanternNear(mg) && f.stats.lanternOut === 1, 'out for 8 s');
  f.time += 8.1; ok(G.lanternNear(mg), 'lit again after 8 s'); f.time -= 8.1;
  // never from loot
  let bad = 0; for (let i = 0; i < 1000; i++) { const t = G.rollItem(3, Object.keys(G.HITEMS)).type; if (G.HITEMS[t].tool) bad++; } ok(!bad, 'rollItem never gives a tool: ' + bad);
  // the guild's answer to 'lost': one lantern in the party
  G.run.waves.push({ wave: G.run.wave, stats: { fearPts: 0, scarePts: 0, dmgPts: 50, killPts: 0, kills: 0, gotLost: 3, lostPts: 20, lonePts: 0, reroutes: 0 }, heroes: [{}, {}, {}, {}] });
  const list = G.makeWave(6), nl = list.reduce((a, e) => a + e.inv.filter(x => x.type === 'lantern').length, 0);
  out.guild = [G.run.guild && G.run.guild.kind, nl]; ok(G.run.guild && G.run.guild.kind === 'lost' && nl === 1, 'one lantern for a lost dungeon: ' + out.guild);
  ok(list.every(e => e.inv.every(x => x.type !== 'lantern' || x.src === 'guild')), 'the lantern is from the guild');
  G.run.waves.pop();
  return { fails, out }; }"""
# ---------- 5.8 the crowbar ----------
BAR = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let gate = null;
  T.pre = R => { for (let y = 0; y < G.WH && !gate; y++) for (let x = 0; x < G.WW && !gate; x++) if (G.canPlace('gate', x, y)) gate = T.place('gate', [x, y]); };
  const { f } = T.setup(['barbarian', 'warrior', 'thief', 'priest']);
  ok(!!gate, 'a gate placed'); if (!gate) return { fails, out };
  gate = f.items.get(key(gate.x, gate.y));
  const d = f.doors.get(key(gate.x, gate.y)); const [bb, w, th, pr] = ['barbarian', 'warrior', 'thief', 'priest'].map(T.of), P = f.party;
  d.closedUntil = f.time + 100; gate.detected = true;
  const side = T.near(gate.x, gate.y, 24).filter(t => G.bfs(t[0], t[1], {}).dist[w.y * G.WW + w.x] >= 0);
  const far = side.filter(t => Math.hypot(t[0] - gate.x, t[1] - gate.y) >= 2).pop() || side[side.length - 1];
  T.put(w, side[0][0], side[0][1]); P.leaderId = w.id; T.put(pr, far[0], far[1]); pr.inv = [T.it('crowbar', 1, { src: 'guild' })];
  P.blockSaid = true; P.plan = 'assault'; pr.state = 'walk';
  G.planHero(pr);
  const last = pr.path[pr.path.length - 1];
  out.pry = { intent: pr.intent, last };
  ok((pr.intent === 'pry' && last && Math.hypot(last[0] - gate.x, last[1] - gate.y) <= 1.01) || Math.hypot(pr.tx - gate.x, pr.ty - gate.y) <= 1.6, 'one with a crowbar goes to the gate: ' + JSON.stringify(out.pry));
  pr.inv = [];
  // levering: 3 / 1.5 = 2 s for a barbarian with a crowbar
  const lever = h => { const n = T.near(gate.x, gate.y, 4).find(t => G.bfs(t[0], t[1], {}).dist[w.y * G.WW + w.x] >= 0); T.put(h, n[0], n[1]); P.liftT = 0; let k = 0;
    for (; k < 400 && d.closedUntil > f.time; k++) { w.blocked = f.time; P.blockSaid = true; P.plan = 'assault'; G.partyThink(0.05); } return k; };
  bb.inv = [T.it('crowbar', 1, { src: 'guild' })]; const k1 = lever(bb); out.bar = k1;
  ok(k1 >= 38 && k1 <= 42 && f.stats.crowbarGate === 1, 'a crowbar levers the gate in 2 s: ' + k1 + ' ticks');
  // a level 3 gate, a thief with a crowbar: 3 / (1.5 * 0.5) = 4 s
  T.away(bb, T.room(T.big()[2])); bb.inv = []; gate.disabled = false; gate.lvl = 3; d.closedUntil = f.time + 100; th.inv = [T.it('crowbar', 1)]; th.lvl = 5;
  const k2 = lever(th); out.thief3 = k2;
  ok(k2 >= 78 && k2 <= 82 && f.stats.crowbarGate === 2, 'a thief with a crowbar at a level 3 gate: 4 s: ' + k2);
  // caged with a crowbar: out after 4 s
  const t0 = T.walkT(T.room(T.big()[1]))[3]; T.put(pr, t0[0], t0[1]); pr.inv = [T.it('crowbar', 1)];
  pr.state = 'caged'; pr.cageUntil = f.time + 30; pr.cagedAt = f.time; pr.cageIt = null;
  let i = 0; for (; i < 120 && pr.state === 'caged'; i++) { f.time += 0.05; G.updateHero(pr, 0.05); }
  out.cage = i * 0.05; ok(i * 0.05 >= 3.95 && i * 0.05 <= 4.1 && f.stats.crowbarCage === 1, 'free after 4 s: ' + out.cage);
  ok(f.tl.ev.some(e => e[1] === 'cf' && e[2] === pr.id && e[3] === 'pry'), 'cf with pry');
  // a rescuer with a crowbar: 0.6 s
  pr.inv = []; pr.state = 'caged'; pr.cageUntil = f.time + 30; pr.cagedAt = f.time;
  const n = T.near(t0[0], t0[1], 9).find(t => Math.abs(t[0] - t0[0]) + Math.abs(t[1] - t0[1]) === 1); T.put(w, n[0], n[1]); w.inv = [T.it('crowbar', 1)]; w.state = 'walk';
  P.rescueId = pr.id; P.rescuerId = w.id; P.blockSaid = false; G.planHero(w);
  ok(w.state === 'free' && Math.abs(w.timer - 0.6) < 1e-9, 'a rescuer with a crowbar: ' + w.state + ' ' + w.timer);
  return { fails, out }; }"""
# ---------- 5.9 a crit knocks it out, the mimic's belly ----------
KNOCK = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let spk = null, mim = null;
  T.pre = R => { spk = T.place('spikes', T.floorSpots(R, 'spikes')[3]); const os = T.objSpots(R, 'mimic'); if (os.length) mim = T.place('mimic', [os[0].x, os[0].y]); if (mim) mim.lvl = 3; };
  const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'barbarian']); const [w, th, mg, bb] = ['warrior', 'thief', 'mage', 'barbarian'].map(T.of);
  spk = f.items.get(key(spk.x, spk.y));
  // 1. the crit
  T.put(w, spk.x, spk.y); w.inv = [T.it('charm', 1), T.it('potion', 1)]; spk.cd = 0;
  f.check = { it: spk, extra: [], r0: 0.4, r1: 0.6, g0: 0.2, g1: 0.8, z2: null, lock: null, shape: 'arc' };
  G.resolveCheck(0.5); G.clearCheck && G.clearCheck();
  const kp = [...f.items.values()].find(o => o.knocked === w.id);
  out.crit = { inv: w.inv.length, pile: kp && [kp.x, kp.y, kp.noGreed] };
  ok(w.inv.length === 1 && kp && kp.noGreed && Math.max(Math.abs(kp.x - w.tx), Math.abs(kp.y - w.ty)) <= 1 && f.stats.gearKnocked === 1, 'a crit knocks it next to him: ' + JSON.stringify(out.crit));
  // 2. the owner goes back for it where a stranger would not
  if (kp) { kp.seenWave = G.run.wave; const t1 = T.walkT(R)[0]; T.put(th, t1[0], t1[1]); th.rank = 1; th.courage = 100; th.inv = [];
    kp.knocked = th.id; const a = T.thr(th, kp); kp.knocked = w.id; const b = T.thr(th, kp); out.owner = [a, b];
    ok(a > b * 1.2, 'the owner risks more for his own: ' + out.owner);
    const l0 = f.stats.loot, g0 = f.greed; T.put(w, kp.x, kp.y); const back = G.pickup(w, kp);
    ok(back && w.inv.length === 2 && f.stats.loot === l0 && f.greed === g0 && f.stats.gearBack === 1, 'he takes his own back: not loot (no greed, no Groza): ' + [back, w.inv.length, f.stats.loot - l0, f.greed - g0]); }
  // 3. Pożeracz: three bites fill its belly, the fourth bites 30% harder
  ok(!!mim, 'a mimic placed');
  if (mim) {
    mim = f.items.get(key(mim.x, mim.y));
    const n = T.near(mim.x, mim.y, 9).find(t => G.areaOf(mim).some(q => q[0] === t[0] && q[1] === t[1]));
    [w, th, bb].forEach(h => T.away(h, R2));   // only the mage within its reach
    T.put(mg, n[0], n[1]); mg.inv = [T.it('potion', 1), T.it('potion', 1), T.it('potion', 1), T.it('potion', 1)];
    const bite = () => { mim.cd = 0; f.combo = 1; f.lastTrapC = -99; f.chain = null; const h0 = mg.hp; G.fire(mim, 1); return h0 - mg.hp; };
    const d1 = bite(); bite(); bite(); const d4 = bite();
    out.mimic = { belly: (mim.belly || []).length, d1, d4 };
    ok(mim.belly && mim.belly.length === 4 && f.stats.mimicAte === 4, 'the belly fills: ' + JSON.stringify(out.mimic));
    ok(d1 > 0 && Math.abs(d4 / d1 - 1.3) < 0.06, 'the 4th bite x1.3: ' + d1 + ' / ' + d4);
    // 4. a bomb or an axe: it spits it all out
    const before = [...f.items.values()].filter(o => o.dropped).length;
    const nSp = G.mimicSpill(mim, mg);
    ok(nSp === 4 && !mim.belly.length && f.stats.mimicSpill === 4 && [...f.items.values()].filter(o => o.dropped).length === before + 4, 'spilled: ' + nSp);
    T.clearPiles(); mim.belly = [T.it('charm', 2), T.it('boots', 1)]; const t2 = T.near(mim.x, mim.y, 9)[0]; T.put(bb, t2[0], t2[1]);
    G.smashDone(bb, { kind: 'o', x: mim.x, y: mim.y, ref: null });
    ok(!mim.belly.length && f.stats.mimicSpill === 6, 'the axe: it spits it out too: ' + f.stats.mimicSpill);
  }
  return { fails, out }; }"""
# ---------- 5.10 bombs in a fire, a bomb among friends ----------
BOMB = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let og = null; T.pre = R => { og = T.place('ogre', T.floorSpots(R, 'ogre')[4]); };
  const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']); const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  og = f.items.get(key(og.x, og.y));
  const far = T.walkT(R2);
  T.put(mg, far[0][0], far[0][1]); const n = T.near(far[0][0], far[0][1], 1)[0]; T.put(pr, n[0], n[1]);
  mg.inv = [T.it('bomb', 1), T.it('bomb', 1), T.it('bomb', 1)]; mg.burnUntil = f.time + 5; const h0 = mg.hp, p0 = pr.hp;
  T.withRandom(0.0, () => G.updateHero(mg, 1));
  out.cook = { bombs: mg.inv.length, dm: h0 - mg.hp, dp: p0 - pr.hp, stat: f.stats.bombCook };
  ok(mg.inv.length === 2 && h0 - mg.hp >= 0.5 * 40 * 0.7 && p0 - pr.hp >= 0.5 * 20 * 0.7 && f.stats.bombCook === 1, 'a bomb goes off in a burning pack: ' + JSON.stringify(out.cook));
  mg.burnUntil = -1; T.withRandom(0.0, () => G.updateHero(mg, 1)); ok(mg.inv.length === 2 && f.stats.bombCook === 1, 'no fire: nothing');
  // the fight: a veteran holds his bomb with a friend next to the ogre; a rookie throws it
  og.hp = og.max = 100;
  const adj = T.near(og.x, og.y, 9).filter(t => Math.max(Math.abs(t[0] - og.x), Math.abs(t[1] - og.y)) === 1);
  T.put(w, adj[0][0], adj[0][1]); T.put(th, adj[1][0], adj[1][1]); w.inv = [T.it('bomb', 1)]; w.rank = 1;
  const fight = () => { w.state = 'fight'; w.foe = og; w.rageUntil = -1; G.updateHero(w, 0.05); };
  fight(); ok(w.inv.length === 1 && f.stats.bombHeld === 1, 'a veteran holds it: ' + f.stats.bombHeld);
  w.rank = 0; const t0 = th.hp; fight();
  out.fight = { inv: w.inv.length, th: t0 - th.hp, fr: f.stats.bombFriendly };
  ok(!w.inv.length && t0 - th.hp > 0 && f.stats.bombFriendly === 1, 'a rookie throws it and hurts the thief: ' + JSON.stringify(out.fight));
  return { fails, out }; }"""
# ---------- 5.11 a returner's trophy; 5.12 the cards, the log ----------
BACK = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let arm = null; T.pre = R => { arm = R; };
  const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest']); const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  // 5.11.1: one who ran with a relic of yours, and got lost on the way
  th.fled = true; th.fleeing = true; th.inv = [T.it('weapon', 3, { src: 'relic', ownerNm: th.nm, ownerFem: th.female, wave: G.run.wave })]; th.lostEver = true; th.gold = 2;
  G.run.returners = []; T.withRandom(0, () => G.collectReturners());
  const r = (G.run.returners || []).find(x => x.nm[0] === th.nm[0]);
  out.ret = r && { gear: r.gear, wasLost: r.wasLost, goldOut: r.goldOut };
  ok(r && r.gear && r.gear[0] && r.gear[0].wasRelic === true && r.wasLost === true && r.goldOut === 2, 'collectReturners: gear, wasLost: ' + JSON.stringify(out.ret));
  // 5.11.2: he comes back with it, and with a lantern
  const nb = G.run.wave + 2; let list = [], e = null;   // (not a boss wave; his class must find a place: a few tries)
  for (let i = 0; i < 20 && r && !e; i++) { r.back = nb; r.used = 0; list = G.makeWave(nb); e = list.find(x => x.returning && x.nm[0] === th.nm[0]); }
  out.back = e && e.inv.map(x => x.type + ':' + x.src);
  ok(e && e.inv.some(x => x.type === 'weapon' && x.src === 'trophy' && x.wasRelic) && e.inv.some(x => x.type === 'lantern'), 'the returner brings his trophy and a lantern: ' + JSON.stringify(out.back));
  // 5.11.3: killed again, the trophy that was a relic is a relic
  th.fled = false; th.fleeing = false; const t0 = T.walkT(R)[2]; T.put(th, t0[0], t0[1]);
  th.inv = [Object.assign({}, e ? e.inv.find(x => x.src === 'trophy') : T.it('weapon', 3, { src: 'trophy', wasRelic: true }))]; th.hp = 0; th.dead = true; G.kill(th, 'trap', 'spikes');
  const tp = [...f.items.values()].find(o => o.body === th.id);
  ok(tp && tp.type === 'loot3', 'his trophy spills as a relic: ' + (tp && tp.type));
  // 5.12.1: the hero card says where things come from
  w.inv = [T.it('armor', 2, { src: 'body', ownerNm: ['Ala', 'Alę', 'Alo'], ownerFem: true }), T.it('amulet', 1, { gaveNm: mg.nm, gaveFem: mg.female }), T.it('lantern', 1, { src: 'guild' })];
  G.openModal({ type: 'hero', id: w.id }); const txt = (document.querySelector('#card') || {}).textContent || ''; while (G.modalKind) G.closeModal();
  out.card = txt.slice(txt.indexOf('Ekwipunek'), txt.indexOf('Ekwipunek') + 260);
  ok(txt.includes('z rzeczy ' + G.nameGen({ nm: ['Ala'], female: true })), 'card: z rzeczy Ali: ' + out.card);
  ok(txt.includes('od ' + G.nameGen(mg)), 'card: od + the giver');
  ok(txt.includes('od gildii') && /Ciężar: \d+,\d \/ \d+,\d kg/.test(txt), 'card: od gildii, Ciężar');
  ok(G.srcText(T.it('charm', 3, { src: 'trophy', wave: 4 })) === ' - trofeum z fali 4' && G.srcText(T.it('charm', 1)) === ' - z domu' && G.srcText(T.it('charm', 1, { src: 'relic' })) === ' - relikwia z Twojego lochu', 'srcText');
  return { fails, out }; }"""
STRIP = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let spk = null; T.pre = R => { spk = T.place('spikes', T.floorSpots(R, 'spikes')[2]); };
  const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], { rk: 'armory' }); const w = T.of('warrior');
  spk = f.items.get(key(spk.x, spk.y)); G.mods.strip = 1; T.put(w, spk.x, spk.y); w.inv = [T.it('charm', 1)];
  const r = T.withRandom(0, () => G.stripGear(w, spk));
  const ev = f.tl.ev, sp = ev.filter(e => e[1] === 'sp').length, st = ev.filter(e => e[1] === 'st').length;
  out.tl = { sp, st, heroes: f.heroes.length, r };
  ok(r && st === 1 && sp === f.heroes.length, 'stripGear logs st, sp = heroes: ' + JSON.stringify(out.tl));
  const kp = [...f.items.values()].find(o => o.knocked === w.id); ok(!!kp, 'stripped gear is knocked (he wants it back)');
  // the summary row and the numbers cell render (the wave summary)
  return { fails, out }; }"""
# ---------- the new lines ----------
LINES = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const NEW = { lootFallen: 8, predecessorGear: 8, cursedKeep: 6, lootDead: 6, lootDeadObject: 6, lootDeadReply: 6, giveGear: 8, giveGearThanks: 6, amuletGive: 6, tooHeavy: 8, heavyLoad: 6,
    lootAssign: 8, lootOffer: 8, lootOfferTake: 6, lanternLight: 6, lanternOut: 6, crowbarGate: 6, crowbarCage: 4, gearKnocked: 6, gearBack: 6, mimicSpill: 4, bombCook: 6, bombFriendly: 6, returnGear: 6 };
  const NAMES = { lootFallen: 1, predecessorGear: 1, lootAssign: 1, lootDeadObject: 1 };
  const norm = s => s.replace(/\{[ABC]?:?([^{}|]*)\|[^{}]*\}/g, '$1').replace(/\{[ABC]?[navkg]\}/g, 'X').toLowerCase().replace(/[^a-ząćęłńóśźż]/g, '');
  const seen = new Map(), walk = (v, f, p) => Array.isArray(v) ? v.forEach(x => walk(x, f, p)) : typeof v === 'string' ? f(v, p) : v && typeof v === 'object' ? Object.entries(v).forEach(([k, x]) => walk(x, f, p + '.' + k)) : 0;
  const mine = new Set(); Object.keys(NEW).forEach(k => (G.SAY[k] || []).forEach(x => mine.add('SAY.' + k + '|' + x))); ['lootDead', 'cursedKeep', 'crowbarGate', 'bombCook'].forEach(k => (G.SOLO[k] || []).forEach(x => mine.add('SOLO.' + k + '|' + x)));
  const all = []; walk(G.SAY, (t, p) => all.push([p.replace(/^\./, 'SAY.'), t]), ''); walk(G.SOLO, (t, p) => all.push([p.replace(/^\./, 'SOLO.'), t]), '');
  all.forEach(([p, t]) => { const k = norm(t), src = p.split('.').slice(0, 2).join('.'); if (seen.has(k) && (mine.has(src + '|' + t) || mine.has(seen.get(k)))) fails.push('duplicate line: ' + t + ' (' + src + ', ' + seen.get(k) + ')'); seen.set(k, src + '|' + t); });
  let n = 0;
  mine.forEach(e => { const [p, t] = [e.slice(0, e.indexOf('|')), e.slice(e.indexOf('|') + 1)], k = p.split('.')[1]; n++;
    if (t.length > 60) fails.push('too long: ' + t);
    if (/[—–"„”“\n\t]/.test(t)) fails.push('forbidden character: ' + t);
    const br = t.match(/\{[^{}]*\}/g) || [];
    if ((t.match(/\{/g) || []).length !== br.length) fails.push('braces: ' + t);
    br.forEach(b => { if (!/^\{[^{}|]*\|[^{}|]*\}$|^\{[navg]\}$/.test(b)) fails.push('bad template ' + b + ': ' + t); if (/^\{[navg]\}$/.test(b) && (!NAMES[k] || p.startsWith('SOLO'))) fails.push('a name where the code fills none: ' + p + ': ' + t); });
  });
  Object.entries(NEW).forEach(([k, m]) => ok((G.SAY[k] || []).length >= m, 'SAY.' + k + ' has ' + (G.SAY[k] || []).length + ' (want ' + m + ')'));
  ['lootDead', 'cursedKeep', 'crowbarGate', 'bombCook'].forEach(k => ok((G.SOLO[k] || []).length >= 3, 'SOLO.' + k));
  // the 1.21 lines are the R2 ones (not rewritten)
  ok(G.SAY.lootDeadObject.every(x => x.includes('{v}')), 'lootDeadObject: {v} = the looter');
  // tagged lines are real lines and every tag is known
  ['fog', 'fire', 'gate', 'cage', 'mimic'].forEach(t => ok(Array.isArray(G.LINE_NEEDS[t]), 'LINE_NEEDS.' + t));
  out.lines = n;
  return { fails, out }; }"""
# ---------- between waves (startWave), the returner's line, organic waves ----------
WAVES = r"""(seeds) => { const { G, key } = T, fails = [], out = { waves: [] }; const ok = (c, m) => { if (!c) fails.push(m); };
  const Rn = a => a[Math.floor(Math.random() * a.length)];
  // startWave: firstBy and knocked belong to a wave; a mimic's belly stays; a returner with a trophy may say so
  T.fresh(7);
  const R = T.rooms()[0], t = T.walkT(R)[0], os = T.objSpots(R, 'mimic');
  const p = T.pile(t[0], t[1], { item: T.it('charm', 1), firstBy: 2, knocked: 1 });
  const mim = os.length ? T.place('mimic', [os[0].x, os[0].y]) : null; if (mim) mim.belly = [T.it('charm', 2)];
  const nx = G.makeWave(4); nx[1].returning = true; nx[1].inv.push({ type: 'weapon', r: 3, src: 'trophy', wave: 2 }); G.run.next = nx;
  G.startWave(); const f0 = G.fl;
  ok(p.firstBy === null && p.knocked === null, 'startWave clears firstBy and knocked');
  ok(!mim || (mim.belly && mim.belly.length === 1), 'the belly stays');
  for (let i = 0; i < 400 && f0.queue.length; i++) T.stepS(0.05);
  ok(f0.stats.returnGear === 1, 'returnGear counted: ' + f0.stats.returnGear);
  // organic waves: every komnata and effect, a fog, a gate, level 3 mimics, deadlier wounds and real crits
  const agg = {};
  const S0 = G.S.dmg;
  seeds.forEach(seed => {
    T.fresh(13); const RK = ['goblin', 'spider', 'ogre', 'haunt', 'bats', 'ossuary', 'armory', 'forge', 'prison', 'junk', 'gallery', 'nursery'], RT = ['fog', 'swamp', 'grotto', 'crypt', 'vault', 'haven', 'gears', 'hush', 'ice'];
    T.rooms().forEach((R, i) => { const c = G.run.layout.cells.get(R.key); c.rk = RK[(i + seed) % RK.length]; c.rt = RT[(i * 2 + seed) % RT.length]; });
    G.rebuildDungeon(true); G.fl.essence = 9999;
    const TYPES = Object.keys(G.ITEMS).filter(t => !G.ITEMS[t].tool && (G.TRAPS[t] || G.MONSTERS[t] || G.isLoot(t) || t === 'crate'));
    const spots = t => { const r = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(t, x, y)) r.push([x, y]); return r; };
    ['gate', 'gate', 'mimic', 'mimic', 'lcursed', 'loot3', 'loot2', 'loot2'].concat([...Array(110)].map(() => Rn(TYPES))).forEach(t => { const s = spots(t); if (s.length) T.place(t, Rn(s)); });
    G.fl.items.forEach(it => { if (it.type === 'mimic') it.lvl = 3; });
    G.S.dmg = S0 * 2.5;
    for (let w = 0; w < 3; w++) {
      G.run.next = G.makeWave(5 + w); G.startWave(); const f = G.fl;
      for (let i = 0; i < 260 / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.resolveCheck(Math.random() < 0.5 ? (c.r0 + c.r1) / 2 : (c.g0 + c.r0) / 2); G.clearCheck(); continue; } G.step(0.05); }
      const s = f.stats, o = { seed, w: 5 + w, t: Math.round(f.time), kills: s.kills };
      ['loot', 'lootFallen', 'predecessorSeen', 'bodyLoot', 'gearGiven', 'gearTrades', 'amuletGiven', 'tooHeavy', 'loadSlowT', 'lootAssign', 'lootRival', 'lootOffer', 'lootOfferTaken', 'lanternSaves', 'lanternOut', 'lanterns',
        'crowbarGate', 'crowbarCage', 'gearKnocked', 'gearBack', 'mimicAte', 'mimicSpill', 'bombCook', 'bombFriendly', 'bombHeld', 'returnGear', 'cursePassed', 'lootDeadObject', 'lineDrop'].forEach(k => { if (s[k]) { o[k] = Math.round(s[k] * 10) / 10; agg[k] = (agg[k] || 0) + s[k]; } }); if (s.lineDropK) o.dropK = s.lineDropK;
      const l3 = [...f.items.values()].filter(it => it.type === 'loot3' && it.dropped && !(it.item && (it.item.src === 'relic' || (it.item.src === 'trophy' && it.item.wasRelic))));
      ok(!l3.length, 'a loot3 pile that is not your relic: ' + JSON.stringify(l3.map(x => x.item)));
      out.waves.push(o);
      while (G.modalKind) G.closeModal();
      try { G.openModal({ type: 'wave', details: true, tab: 'nums', rr: 0, rt: 0, out: [] }); const tx = (document.querySelector('#card') || {}).textContent || ''; if (tx.includes('Ekwipunek: z ciał')) out.nums = (out.nums || 0) + 1; } catch (e) { fails.push('the summary: ' + e); }
      while (G.modalKind) G.closeModal();
      try { G.openModal({ type: 'wave', details: true, tab: 'next', rr: 0, rt: 0, out: [] }); } catch (e) { fails.push('the summary (next): ' + e); }
      while (G.modalKind) G.closeModal();
      G.run.wave++; G.startBuild(); while (G.modalKind) G.closeModal(); G.fl.essence = 9999;
    }
  });
  G.S.dmg = S0;
  out.agg = agg;
  ok(out.nums > 0, 'the numbers tab shows the 1.20 cell');
  ['bodyLoot', 'gearGiven', 'lootFallen'].forEach(k => ok(agg[k] > 0, 'organic: ' + k + ' happens'));
  return { fails, out }; }"""
DRAW = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], { rt: 'fog' }); const tl = T.walkT(R); const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  T.put(w, tl[0][0], tl[0][1]); T.put(mg, tl[1][0], tl[1][1]); T.put(th, tl[2][0], tl[2][1]);
  w.inv = [T.it('lantern', 1), T.it('crowbar', 1), T.it('armor', 2, { cursed: true }), T.it('weapon', 3)]; mg.inv = [T.it('armor', 2), T.it('bomb', 1)]; mg.lvl = 1;
  th.state = 'loot'; th.timer = 0.5; th.dur = 1; th.lootIt = null;
  T.pile(tl[5][0], tl[5][1], { item: T.it('charm', 2, { cursed: true }), body: 3, fromNm: ['Ala', 'Alę', 'Alo'], fromFem: true });
  G.centerOn && G.centerOn(w.x, w.y);
  for (let i = 0; i < 5; i++) G.frame(performance.now() + i * 16);
  ok(G.burden(mg) < 1 && G.litLantern(w), 'drawn: a heavy pack, a lit lantern, a cursed item, a body search');
  th.state = 'wait';
  return { fails, out }; }"""
SECTIONS = [('draw', DRAW), ('gear', GEAR), ('pred', PRED), ('body', BODY), ('share', SHARE), ('load', LOAD), ('claim', CLAIM), ('lantern', LANT), ('crowbar', BAR), ('knock', KNOCK), ('bomb', BOMB), ('back', BACK), ('strip', STRIP), ('lines', LINES), ('waves', WAVES)]
async def main():
    only = None
    seeds = [0, 1, 2]
    for a in sys.argv:
        if a.startswith('--only='): only = a[7:].split(',')
        if a.startswith('--seeds='): seeds = [int(x) for x in a[8:].split(',')]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 900, 'height': 760})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + SC + 'test/page15.html')
        await pg.wait_for_timeout(600)
        await pg.evaluate(LIB); await pg.evaluate(LIB2)
        fails = []
        for name, js in SECTIONS:
            if only and name not in only: continue
            try:
                r = await (pg.evaluate(js, seeds) if name == 'waves' else pg.evaluate(js))
            except Exception as e:
                fails.append(name + ': ' + str(e)[:600]); continue
            print('==', name, json.dumps(r['out'], ensure_ascii=False)[:3000])
            fails += [name + ': ' + f for f in r['fails']]
        await pg.wait_for_timeout(400)
        fails += ['page error: ' + e for e in errs[:5]]
        print('FAILS', fails)
        await b.close()
        sys.exit(1 if fails else 0)
asyncio.run(main())
