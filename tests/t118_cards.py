# 1.18 Karty: the 28 new cards (every komnata and room effect has one, offered only while it is in the dungeon; the heroes'
# behaviour from 1.16-1.17 has some too) and the fixed old ones. Every new card applies (a mods field changes, and that field
# is in freshMods), a komnata/effect card is offered only with its element in the dungeon (req, the shop's sampling, and the
# fit hint "Brak w lochu: Kuźnia."), and a functional check of what each card does in the game (most of them), u-portrait
# gone (a deck or a save with it does not crash). Prints FAILS [...] and exits 1 on any.
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
LIB = r"""() => {
  const G = __yatd, key = (x, y) => x + ',' + y;
  const T = window.T = { G, key };
  T.stepS = sec => { const f = G.fl; for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); } };
  // a new run with n rooms, the build phase of wave 4, everything unlocked, Esencja to spare, no komnaty or effects, empty deck
  T.fresh = n => {
    while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal();
    G.fl.essence = 9999;
    for (let k = 0; k < 90 && G.roomCount() < (n || 7); k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(dm[Math.floor(Math.random() * dm.length)]); G.fl.essence = 9999; }
    G.run.layout.cells.forEach(c => { c.rk = null; c.rt = null; });
    G.run.items.forEach((it, k) => { if (!it.sys) return; G.run.items.delete(k); });   // the two start traps would muddle the checks
    G.rebuildDungeon(true); G.run.wave = 4; G.startBuild(true); G.fl.essence = 9999;
    Object.keys(G.ITEMS).forEach(t => { if (!G.ITEMS[t].tool) G.run.unlocked.add(t); });
    G.run.deck = []; G.recomputeMods();
  };
  T.rooms = () => G.fl.rooms.filter(R => R.kind === 'room' && R.id !== G.fl.heart.room && !R.doors.some(d => d.entrance));
  T.room = R => G.fl.rooms.find(q => q.key === R.key);
  T.setRoom = (R, o) => { const c = G.run.layout.cells.get(R.key); if ('rk' in o) c.rk = o.rk; if ('rt' in o) c.rt = o.rt; G.rebuildDungeon(true); G.fl.essence = 9999; return T.room(R); };
  T.floorSpots = (R, type) => T.room(R).tiles.filter(q => G.canPlace(type || 'spikes', q[0], q[1]));
  T.objSpots = (R, type) => [...G.fl.objects.values()].filter(o => G.roomOf(o.x, o.y) === T.room(R).id && G.canPlace(type, o.x, o.y));
  T.wallSpots = (R, type) => { const Q = T.room(R), out = []; for (let y = Q.y0 - 1; y <= Q.y1 + 1; y++) for (let x = Q.x0 - 1; x <= Q.x1 + 1; x++) if (G.canPlace(type, x, y) && G.slotRoom(type, x, y) === Q.id) out.push([x, y]); return out; };
  T.place = (type, t) => { G.fl.essence = 9999; return G.tryPlace(type, t[0], t[1]) ? G.fl.items.get(key(t[0], t[1])) : null; };
  T.deck = ids => { G.run.deck = ids.slice(); G.recomputeMods(); };
  // the wave: these classes, plain (no trait, no boss), all in, then made unbreakable (no deaths, no flight, nothing carried)
  T.raid = types => {
    const nx = G.makeWave(4).slice(0, types.length); nx.forEach((e, i) => { e.type = types[i]; e.trait = null; e.boss = null; e.lvl = 5; e.returning = false; e.bond = null; }); G.run.next = nx;   // 1.21: no bonds
    G.startWave(); const f = G.fl;
    for (let i = 0; i < 600 && f.queue.length; i++) T.stepS(0.05);
    T.stepS(0.3);
    G.alive().forEach(T.tough);
    return f;
  };
  T.tough = h => { h.max = h.hp = 1e5; h.courage = 1e5; h.fear = 0; h.inv = []; h.gold = 0; h.trait = null; h.phobia = null; };
  T.put = (h, x, y) => { h.x = h.tx = x; h.y = h.ty = y; h.nx = null; h.ny = null; h.prog = 0; h.room = G.roomOf(x, y); h.path = []; h.state = 'wait'; h.timer = 30; h.gone = false; h.lost = false; };
  T.walkT = R => T.room(R).tiles.filter(q => G.walkable(q[0], q[1]) && !G.fl.items.has(key(q[0], q[1])));
  T.withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
  return true;
}"""
# ---------- 1. every new card applies, rarity / unique / grows / stage as decided ----------
APPLY = r"""() => { const { G } = T, fails = [], out = { fields: {} }; const ok = (c, m) => { if (!c) fails.push(m); };
  const RAR = { drawers: 'c', lure: 'r', onemore: 'c', thickwalls: 'r', risen: 'l', cell: 'r', vaultsnap: 'r', wisps: 'c', body: 'r', falsecall: 'r', frames: 'r', restock: 'c',
    lullsleep: 'r', ambush: 'r', cocoons: 'c', cauldron: 'c', batscatter: 'c', skullwall: 'r', strip: 'c', mire: 'c', farecho: 'r', deepsleep: 'c', gearlink: 'c', blackice: 'c',
    badnews: 'c', coins: 'c', tainted: 'c', rhythm: 'c' };
  const UNIQ = ['thickwalls', 'risen', 'cell', 'vaultsnap', 'falsecall', 'restock', 'ambush'], ROOMC = ['drawers', 'risen', 'cell', 'vaultsnap', 'wisps', 'body', 'falsecall', 'frames', 'restock', 'lullsleep', 'ambush', 'cocoons', 'cauldron', 'batscatter', 'skullwall', 'strip', 'mire', 'farecho', 'deepsleep', 'gearlink', 'blackice'];
  const k0 = Object.keys(G.freshMods());
  Object.keys(RAR).forEach(id => {
    const u = G.UPG[id]; ok(u && u.kind === 'card', id + ' exists as a card'); if (!u) return;
    const m0 = G.freshMods(), m1 = G.freshMods(); u.apply(m1);
    ok(JSON.stringify(Object.keys(m1)) === JSON.stringify(k0), id + ': no field outside freshMods');
    const diff = k0.filter(k => JSON.stringify(m0[k]) !== JSON.stringify(m1[k])); out.fields[id] = diff.join('+');
    ok(diff.length >= 1, id + ' changes a mods field');
    ok(u.rar === RAR[id], id + ' rarity ' + u.rar + ' (want ' + RAR[id] + ')');
    ok(!!u.unique === UNIQ.includes(id), id + ' unique ' + !!u.unique);
    ok(!!u.grows === (id === 'skullwall'), id + ' grows');
    ok((G.ONB_CARD[id] || 1) === (ROOMC.includes(id) ? 3 : 1), id + ' stage ' + (G.ONB_CARD[id] || 1));
    ok(typeof u.req === (ROOMC.includes(id) ? 'function' : 'undefined'), id + ' req');
    ok(u.name && u.tag && u.text && !/[–—]/.test(u.text + u.name + u.tag), id + ': name, tag, text, plain hyphens');
  });
  out.n = Object.keys(RAR).length;
  ok(G.UPGRADES.filter(u => u.kind === 'card').length === 94 + 28 + 15 + 26 + 7, 'card count ' + G.UPGRADES.filter(u => u.kind === 'card').length);
  // the deck path: two copies stack, every field set
  T.fresh(5); T.deck(Object.keys(RAR).concat(['lure', 'wisps']));
  ok(G.mods.drawers === 1 && G.mods.lure === 2 && G.mods.wisps === 2 && G.mods.risen === true && G.mods.rhythm === 1, 'deck applies, copies stack');
  // fixed texts
  const tx = id => (G.UPG[id] || {}).text || '';
  ok(/oczy i lustra/.test(tx('walls')), 'walls text: eyes and mirrors');
  ok(!/pojemno/.test(tx('infusion')), 'infusion: no "capacity"');
  ok(/kradzieży kryształu/.test(tx('bank')), 'bank: theft');
  ok(/spowolnionym/.test(tx('sticky')), 'sticky: slowed');
  ok(/potworów/.test(tx('cooldown')) && /potworów/.test(tx('overload')), 'cooldown, overload: monsters too');
  ok(/nietoperze/.test(tx('sharp')), 'sharp: bats');
  ok(/12 s/.test(tx('maze')), 'maze: 12 s');
  ok(/łupu/.test(tx('deaf')), 'deaf: loot stories');
  ok(/3\. poziomu/.test(tx('portrait')), 'portrait: the level 3 trait');
  ok(/słyszą/.test(tx('screams')), 'screams: who hears it');
  ok(/\+50%/.test(tx('quickarm')), 'quickarm: +50%');
  ok(/2 s dłużej/.test(tx('spider')), 'spider: 2 s longer');
  ok(G.CARD_NEEDS.walls.includes('eyes') && G.CARD_NEEDS.walls.includes('mirror') && G.CARD_NEEDS.sharp.includes('bats') && !G.CARD_NEEDS.venom.includes('lcursed') && G.CARD_NEEDS.hgallery.includes('portrait'), 'CARD_NEEDS fixed');
  return { fails, out }; }"""
# ---------- 2. a komnata/effect card only with its element in the dungeon ----------
REQ = r"""() => { const { G } = T, fails = [], out = { hits: {} }; const ok = (c, m) => { if (!c) fails.push(m); };
  const REQ = { drawers: 'rk:junk', risen: 'rt:crypt', cell: 'rk:prison', vaultsnap: 'rt:vault', wisps: 'rt:fog', body: 'rt:hush', falsecall: 'rk:haunt', frames: 'rk:gallery',
    restock: 'rk:forge', lullsleep: 'rk:nursery', ambush: 'rk:goblin', cocoons: 'rk:spider', cauldron: 'rk:ogre', batscatter: 'rk:bats', skullwall: 'rk:ossuary', strip: 'rk:armory',
    mire: 'rt:swamp', farecho: 'rt:grotto', deepsleep: 'rt:haven', gearlink: 'rt:gears', blackice: 'rt:ice' };
  T.fresh(6);
  Object.keys(REQ).forEach(id => ok(!G.reqOk(G.UPG[id]), id + ': req false with nothing in the dungeon'));
  const seen = new Set(); for (let i = 0; i < 400; i++) { G.upgradePicks(3).forEach(u => seen.add(u.id)); G.upgradePicks(1).forEach(u => seen.add(u.id)); }
  out.leak = Object.keys(REQ).filter(id => seen.has(id)); ok(!out.leak.length, 'offered without its element: ' + out.leak);
  out.behaviour = ['lure', 'onemore', 'thickwalls', 'badnews', 'coins', 'tainted', 'rhythm'].filter(id => !seen.has(id)); ok(!out.behaviour.length, 'behaviour cards offered freely, missing: ' + out.behaviour);
  ok(!seen.has('u-portrait'), 'u-portrait never offered');
  const R = T.rooms()[0];
  Object.entries(REQ).forEach(([id, w]) => {
    const [k, v] = w.split(':'); T.setRoom(R, k === 'rk' ? { rk: v, rt: null } : { rk: null, rt: v });
    ok(G.reqOk(G.UPG[id]), id + ': req true with ' + v);
    const other = Object.entries(REQ).filter(([i2, w2]) => w2 !== w && G.reqOk(G.UPG[i2])).map(e => e[0]); ok(!other.length, v + ' also lets in ' + other);
    let n = 0; for (let i = 0; i < 1200; i++) if (G.upgradePicks(3).some(u => u.id === id)) n++;   // 1.26: 163 cards in the pool
    out.hits[id] = n; ok(n > 0, id + ' never offered with ' + v);
    const fit = G.cardFit(G.UPG[id]); ok(fit && fit.ok, id + ': fits with ' + v);
  });
  T.setRoom(R, { rk: null, rt: null });
  const f1 = G.cardFit(G.UPG.restock), f2 = G.cardFit(G.UPG.vaultsnap), f3 = G.cardFit(G.UPG.drawers);
  out.fit = [f1 && f1.text, f2 && f2.text, f3 && f3.text];
  ok(f1 && !f1.ok && f1.text === ' Brak w lochu: Kuźnia.', 'restock: ' + out.fit[0]);
  ok(f2 && !f2.ok && f2.text === ' Brak w lochu: Sezam.', 'vaultsnap: ' + out.fit[1]);
  ok(f3 && !f3.ok && f3.text === ' Brak w lochu: Graciarnia.', 'drawers: ' + out.fit[2]);
  // the shop renders it (an offer rolled before the komnata came down)
  G.run.shop.ids = ['restock', 'drawers', 'lure', 'rhythm']; G.openModal({ type: 'shop' });
  const o0 = document.querySelector('#offer-0 .fit'); out.shopFit = o0 && o0.textContent; ok(o0 && /Brak w lochu: Kuźnia/.test(o0.textContent), 'the shop says Brak w lochu: Kuźnia');
  while (G.modalKind) G.closeModal();
  // all of them (Nawiedzona galeria: a ghost and a portrait), any of them (Głodne ściany: eyes alone)
  const R2 = T.rooms()[1], fs = T.floorSpots(R2, 'ghost'); T.place('ghost', fs[0]);
  const h1 = G.cardFit(G.UPG.hgallery); out.hg1 = h1 && h1.text; ok(h1 && !h1.ok && /Portret/.test(h1.text) && !/Duch/.test(h1.text), 'hgallery without a portrait: ' + out.hg1);
  const ws = T.wallSpots(R2, 'portrait'); if (ws.length) { T.place('portrait', ws[0]); const h2 = G.cardFit(G.UPG.hgallery); ok(h2 && h2.ok, 'hgallery with both'); }
  const ws2 = T.wallSpots(T.rooms()[2], 'eyes'); if (ws2.length) { T.place('eyes', ws2[0]); ok(G.cardFit(G.UPG.walls).ok, 'walls fits with eyes'); }
  return { fails, out }; }"""
# ---------- 3. what the cards do ----------
FUNC = r"""(only) => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const S = (name, fn) => { if (only && !only.includes(name)) return; try { fn(); } catch (e) { fails.push(name + ' threw: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  // drawers: the furniture's trap goes off 0,55 -> 0,95 in a Graciarnia
  S('drawers', () => {
    T.fresh(7); let R = null, o = null;
    for (const Q of T.rooms()) { const s = T.objSpots(Q, 'mimic'); if (s.length) { R = Q; o = s[0]; break; } }
    if (!R) { fails.push('drawers: no furniture'); return; }
    R = T.setRoom(R, { rk: 'junk' }); const mim = T.place('mimic', [o.x, o.y]); ok(!!mim, 'drawers: mimic placed');
    const f = T.raid(['warrior']), h = G.alive()[0];
    const trial = n => { let c = 0; for (let i = 0; i < n; i++) { mim.cd = 0; mim.detected = false; mim.disabled = false; mim.jamUntil = 0; const s0 = f.stats.lookTraps || 0; G.lookDone(h, { kind: 'obj', sub: o.kind, x: o.x, y: o.y, it: mim, done: false }); if ((f.stats.lookTraps || 0) > s0) c++; } return c / n; };
    T.deck([]); const p0 = trial(300); T.deck(['drawers']); const p1 = trial(300);
    out.drawers = [p0, p1].map(v => Math.round(v * 100) / 100);
    ok(p0 > 0.42 && p0 < 0.68 && p1 > 0.88, 'drawers: mimic 0,55 -> 0,95: ' + out.drawers);
  });
  // lure: a careful leader goes towards a sound he would have kept away from. The party is made to know just the tiles within R
  // steps of the leader, so the openings are a ring at the same distance; the sound comes from one far (> 7,5) from the best one that
  // scores close to it (chooseTarget's sum for a careful leader: 1,15 x steps - 0,18 x distance from the entrance, plus up to 1 by chance)
  S('lure', () => {
    let done = false; const why = [];
    for (let tr = 0; tr < 45 && !done; tr++) {   // 1.26: more layouts (the setup needs a far frontier that scores close)
      if (tr % 5 === 0) { T.fresh(12); T.raid(['warrior', 'thief', 'priest']); }
      const f = G.fl, L = G.leader(), P = f.party; if (!L) { why.push('no leader'); continue; }
      L.trait = 'careful'; L.rank = 2;
      const b0 = G.bfs(L.x, L.y, { noDanger: true }), Rr = 6 + 2 * (tr % 5);
      f.known.fill(0); for (let i = 0; i < b0.dist.length; i++) if (b0.dist[i] >= 0 && b0.dist[i] <= Rr) f.known[i] = 1;
      const b = G.bfs(L.x, L.y, { known: true, avoid: L.R.avoid }), xy = i => [i % G.WW, (i / G.WW) | 0], d = (i, j) => Math.hypot(xy(i)[0] - xy(j)[0], xy(i)[1] - xy(j)[1]);
      const sc = i => b.dist[i] * 1.15 - 0.18 * (Math.abs(xy(i)[0] - f.ent.x) + Math.abs(xy(i)[1] - f.ent.y));
      const fr = G.frontier().filter(i => b.dist[i] >= 0).sort((i, j) => sc(i) - sc(j)); if (fr.length < 2) { why.push('frontier ' + fr.length); continue; }
      const best = fr[0], cand = fr.find(i => d(i, best) > 7.5);
      if (cand === undefined || sc(cand) - sc(best) > 2.4) { why.push('gap ' + (cand === undefined ? '-' : Math.round(sc(cand) - sc(best)))); continue; }
      const near = n => { let c = 0; for (let k = 0; k < n; k++) { P.lastTalkAt = f.time; P.wantSearch = false; G.chooseTarget(L); if (P.target >= 0 && d(P.target, cand) <= 7) c++; } return c; };
      P.sound = { x: xy(cand)[0], y: xy(cand)[1], t: f.time - 30, room: G.roomOf(xy(cand)[0], xy(cand)[1]) };   // 30 s ago: past the 25 s, inside the 40 s
      T.deck([]); const c0 = near(80); T.deck(['lure']); const c1 = near(80);
      P.sound.t = f.time - 5; T.deck([]); const c2 = near(80); T.deck(['lure']); const c3 = near(80);   // a fresh sound: without the card the careful one keeps away
      out.lure = { c0, c1, c2, c3, gap: Math.round((sc(cand) - sc(best)) * 10) / 10, tr };
      if (c1 > c0 + 10 && c3 > c2 + 10) done = true; else why.push(JSON.stringify(out.lure));
    }
    ok(done, 'lure: the sound never pulled a careful leader: ' + why);
  });
  // onemore: more votes for "more", 45 s
  S('onemore', () => {
    T.fresh(6); const f = T.raid(['warrior', 'thief']), h = G.alive()[0], L = G.leader(); h.trait = 'careful'; h.fear = 0; h.hp = h.max; f.heartKnown = false;
    const votes = () => { let n = 0; for (let i = 0; i < 400; i++) if (G.councilVote(h, ['home', 'more']) === 'more') n++; return n / 400; };
    T.deck([]); const v0 = votes(); T.deck(['onemore']); const v1 = votes();
    out.onemore = [v0, v1].map(v => Math.round(v * 100) / 100);
    ok(v1 > v0 + 0.2, 'onemore: more votes for more: ' + out.onemore);
    f.patT = 200; G.councilDone({ res: 'more', leave: [] }, L); ok(f.patT === G.S.waveTime - 45, 'onemore: 45 s more: ' + (G.S.waveTime - f.patT));
    T.deck([]); f.patT = 200; f.party.councilMore = false; G.councilDone({ res: 'more', leave: [] }, L); ok(f.patT === G.S.waveTime - 30, 'onemore: 30 s without the card');
  });
  // thickwalls and farecho: the reach of a shout
  S('thickwalls', () => {
    let done = false;
    for (let tr = 0; tr < 6 && !done; tr++) {
      T.fresh(10);
      const tiles = []; G.fl.rooms.forEach(R => { if (R.kind === 'room') R.tiles.forEach(q => { if (G.walkable(q[0], q[1])) tiles.push(q); }); });
      const findPair = (lo, hi, hmax) => { for (let k = 0; k < 120; k++) { const a = tiles[Math.floor(Math.random() * tiles.length)], bb = G.bfs(a[0], a[1], { noDanger: true });
        const c = tiles.filter(q => { const s = bb.dist[q[1] * G.WW + q[0]], hy = Math.hypot(q[0] - a[0], q[1] - a[1]); return s >= lo && s <= hi && hy > 7.6 && hy <= hmax && G.roomOf(q[0], q[1]) !== G.roomOf(a[0], a[1]); });
        if (c.length) return [a, c[0]]; } return null; };
      const p1 = findPair(10, 13, 13), p2 = findPair(16, 24, 26); if (!p1 || !p2) continue;
      const rg = G.fl.rooms[G.roomOf(p2[0][0], p2[0][1])]; T.setRoom(rg, { rt: 'grotto' });
      const f = T.raid(['warrior', 'thief']); const [v, o] = G.alive();
      T.put(v, p1[0][0], p1[0][1]); T.put(o, p1[1][0], p1[1][1]);
      T.deck([]); const a0 = G.canHearShout(o, v); T.deck(['thickwalls']); const a1 = G.canHearShout(o, v);
      T.put(v, p2[0][0], p2[0][1]); T.put(o, p2[1][0], p2[1][1]);
      T.deck([]); const b0 = G.canHearShout(o, v); T.deck(['farecho']); const b1 = G.canHearShout(o, v); const r1 = G.shoutRange(v); T.deck(['farecho', 'thickwalls']); const r2 = G.shoutRange(v);
      // a death in the Grota with Niosące się echo: the far one fears it like a witness
      T.deck(['farecho']); const f0 = o.fear; v.hp = 0; v.dead = true; G.kill(v, 'trap', 'spikes'); const df = o.fear - f0, d = f.deaths[f.deaths.length - 1];
      out.shout = { a0, a1, b0, b1, r1, r2, df: Math.round(df * 10) / 10, knows: d.knows.has(o.id) }; done = true;
      ok(a0 && !a1, 'thickwalls: 10-13 steps heard, not with Grube mury: ' + [a0, a1]);
      ok(!b0 && b1 && r1 === 28 && r2 === 16, 'farecho: a shout from a Grota 2 times as far: ' + JSON.stringify(out.shout));
      ok(d.knows.has(o.id) && df > 0, 'farecho: the far one hears the death');
    }
    ok(done, 'thickwalls: no pair of spots');
  });
  // risen: a death in a Krypta, a ghost of yours (temp), 2 at most, gone at the build
  S('risen', () => {
    T.fresh(6); let R = T.rooms()[0]; R = T.setRoom(R, { rt: 'crypt' });
    T.place('spikes', T.floorSpots(T.rooms()[1])[0]);   // one of yours: Kolekcjoner counts 1 kind
    const f = T.raid(['warrior', 'thief', 'priest', 'mage']); T.deck(['risen', 'collector']);
    const g0 = G.greedBonusParts().find(p => p[0] === 'Kolekcjoner'), w = T.walkT(R);
    G.alive().slice(0, 3).forEach((h, i) => { T.put(h, w[i][0], w[i][1]); h.hp = 0; h.dead = true; G.kill(h, 'trap', 'spikes'); });
    const ghosts = [...f.items.values()].filter(it => it.temp);
    const g1 = G.greedBonusParts().find(p => p[0] === 'Kolekcjoner');
    out.risen = { n: ghosts.length, type: ghosts.map(g => g.type), stat: f.stats.risen, inRoom: ghosts.every(g => G.roomOf(g.x, g.y) === T.room(R).id), coll: [g0 && g0[1], g1 && g1[1]] };
    ok(ghosts.length === 2 && ghosts.every(g => g.type === 'ghost' && g.hp > 0 && g.spent === 0), 'risen: 2 ghosts: ' + JSON.stringify(out.risen));
    ok(out.risen.inRoom, 'risen: in the Krypta');
    ok(g0 && JSON.stringify(g0) === JSON.stringify(g1), 'risen: not counted by Kolekcjoner');
    T.stepS(1);
    G.startBuild(); ok(![...G.fl.items.values()].some(it => it.temp) && ![...G.run.items.values()].some(it => it.temp), 'risen: gone at the build');
    T.deck([]); T.fresh(6); R = T.setRoom(T.rooms()[0], { rt: 'crypt' }); const f2 = T.raid(['warrior', 'thief']); const h = G.alive()[1], w2 = T.walkT(R); T.put(h, w2[0][0], w2[0][1]); h.hp = 0; h.dead = true; G.kill(h, 'trap', 'spikes');
    ok(![...f2.items.values()].some(it => it.temp), 'risen: nothing without the card');
  });
  // cell: down the trapdoor of a Więzienie, into its cage
  S('cell', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'prison' }); const sp = T.floorSpots(R);
    const td = T.place('trapdoor', sp[0]), cg = T.place('cage', sp[sp.length - 1]); ok(td && cg, 'cell: trapdoor and cage');
    const f = T.raid(['warrior', 'thief', 'priest']); const [a, h, h2] = G.alive();
    T.deck(['cell']); T.put(h, td.x, td.y); G.fall(h, 1, td); G.landFallen(h);
    out.cell = { state: h.state, at: [h.x, h.y], cage: [cg.x, cg.y], lost: h.lost, cellDrops: f.stats.cellDrops };
    ok(h.state === 'caged' && h.x === cg.x && h.y === cg.y && !h.lost && h.cageIt === cg, 'cell: lands in the cage: ' + JSON.stringify(out.cell));
    T.deck([]); cg.cd = 0; cg.disabled = false; T.put(h2, td.x, td.y); G.fall(h2, 1, td); G.landFallen(h2);
    ok(h2.state !== 'caged', 'cell: no cage without the card');
  });
  // vaultsnap: loot taken in a Sezam sets off its ready traps, once in 6 s
  S('vaultsnap', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rt: 'vault' }); const sp = T.floorSpots(R);
    const spk = T.place('spikes', sp[0]), l1 = T.place('loot', sp[1]), l2 = T.place('loot', sp[2]);
    const f = T.raid(['warrior']), h = G.alive()[0]; T.deck(['vaultsnap']);
    spk.cd = 0; spk.disabled = false; G.pickup(h, l1);
    const c1 = spk.cd; spk.cd = 0; G.pickup(h, l2);
    out.vault = { c1, c2: spk.cd, snaps: f.stats.vaultSnaps };
    ok(c1 > 0 && f.stats.vaultSnaps === 1 && spk.cd === 0, 'vaultsnap: one alarm, not a second within 6 s: ' + JSON.stringify(out.vault));
  });
  // cauldron: a death in a Jaskinia ogra: Esencja, nothing spilled
  S('cauldron', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'ogre' });
    const f = T.raid(['warrior', 'thief', 'priest']); T.deck(['cauldron']); const [, h, h2] = G.alive(), w = T.walkT(R);
    const piles = () => [...f.items.values()].filter(it => it.dropped).length;
    T.put(h, w[0][0], w[0][1]); h.inv = [G.rollItem(1), G.rollItem(1)]; h.gold = 3; const p0 = piles(), e0 = f.stats.essDrop || 0;
    h.hp = 0; h.dead = true; G.kill(h, 'trap', 'spikes');
    out.cauldron = { ess: (f.stats.essDrop || 0) - e0, piles: piles() - p0, stat: f.stats.cauldron };
    ok(out.cauldron.ess === 7 && out.cauldron.piles === 0, 'cauldron: 2 an item + 1 a coin, nothing spilled: ' + JSON.stringify(out.cauldron));
    T.deck([]); T.put(h2, w[1][0], w[1][1]); h2.inv = [G.rollItem(1)]; h2.gold = 2; const p1 = piles(); h2.hp = 0; h2.dead = true; G.kill(h2, 'trap', 'spikes');
    ok(piles() - p1 === 2, 'cauldron: spilled without the card');
  });
  // strip: spikes in a Zbrojownia knock the talisman off (2 copies: always)
  S('strip', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'armory' }); const sp = T.floorSpots(R), spk = T.place('spikes', sp[0]);
    const f = T.raid(['warrior']), h = G.alive()[0]; T.deck(['strip', 'strip']);
    T.put(h, spk.x, spk.y); h.inv = [{ type: 'charm', r: 1, cdUntil: 0, charges: 1 }]; spk.cd = 0; G.fire(spk, 1);
    const pile = [...f.items.values()].find(it => it.dropped && it.item && it.item.type === 'charm');
    out.strip = { inv: h.inv.map(x => x.type), pile: !!pile, stat: f.stats.stripped };
    ok(!h.inv.length && pile, 'strip: the talisman lies next to him: ' + JSON.stringify(out.strip));
  });
  // gearlink and rhythm: a trap in Zębatki winds the other on by 1 s; the combo window 3 + 1 s
  S('gearlink', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rt: 'gears' }); const sp = T.floorSpots(R), a = T.place('spikes', sp[0]), b = T.place('spikes', sp[sp.length - 1]);
    const f = T.raid(['warrior']); T.deck(['gearlink']);
    a.cd = 0; b.cd = 5; G.fire(a, 1); const g1 = b.cd;
    T.deck([]); a.cd = 0; b.cd = 5; G.fire(a, 1); const g0 = b.cd;
    out.gear = [g1, g0]; ok(Math.abs(g1 - 4) < 1e-6 && g0 === 5, 'gearlink: 5 -> 4 s: ' + out.gear);
    T.deck(['rhythm']); a.cd = 0; G.fire(a, 1); const w1 = f.comboWinNow; T.deck([]); a.cd = 0; G.fire(a, 1); const w0 = f.comboWinNow;
    out.rhythm = [w1, w0]; ok(w1 === G.S.comboWin + 1 && w0 === G.S.comboWin, 'rhythm: the combo window +1 s: ' + out.rhythm);
  });
  // quickarm: built during the wave: ready at once, the first shot x1,5
  S('quickarm', () => {
    T.fresh(6); const R = T.rooms()[0]; const f = T.raid(['warrior']), h = G.alive()[0]; const sp = T.floorSpots(R);
    T.deck([]); const n0 = T.place('spikes', sp[0]); ok(n0 && n0.cd > 0 && !n0.quick, 'quickarm: without the card it arms (' + (n0 && n0.cd) + ')');
    T.deck(['quickarm']); const it = T.place('spikes', sp[1]); ok(it && it.cd === 0 && it.quick, 'quickarm: ready at once');
    T.put(h, it.x, it.y);
    h.shield = 0; let hp0 = h.hp; G.fire(it, 1); const d1 = hp0 - h.hp; it.cd = 0; h.shield = 0; hp0 = h.hp; G.fire(it, 1); const d2 = hp0 - h.hp;
    out.quick = { d1: Math.round(d1 * 10) / 10, d2: Math.round(d2 * 10) / 10, quick: it.quick };
    ok(d2 > 0 && Math.abs(d1 / d2 - 1.5) < 0.06 && !it.quick, 'quickarm: the first shot x1,5: ' + JSON.stringify(out.quick));
  });
  // screams: only those who hear the shout
  S('screams', () => {
    let done = false;
    for (let tr = 0; tr < 6 && !done; tr++) {
      T.fresh(10); const f = T.raid(['warrior', 'thief', 'priest']); const [a, b, c] = G.alive();
      const tiles = []; f.rooms.forEach(R => { if (R.kind === 'room' && !(R.rt === 'hush')) R.tiles.forEach(q => { if (G.walkable(q[0], q[1])) tiles.push(q); }); });
      const bb = G.bfs(a.x, a.y, { noDanger: true });
      const far = tiles.filter(q => bb.dist[q[1] * G.WW + q[0]] > 18 && Math.hypot(q[0] - a.x, q[1] - a.y) > 15)[0]; if (!far) continue;
      const nb = tiles.find(q => Math.abs(q[0] - a.x) + Math.abs(q[1] - a.y) === 1) || [a.x, a.y];
      T.put(b, nb[0], nb[1]); T.put(c, far[0], far[1]); [a, b, c].forEach(h => { h.fearBy = {}; });
      T.deck(['screams']); G.startFlee(a);
      out.screams = { near: Math.round(b.fearBy.screams || 0), far: Math.round(c.fearBy.screams || 0) }; done = true;
      ok(out.screams.near > 0 && !c.fearBy.screams, 'screams: the near one fears it, the far one does not hear: ' + JSON.stringify(out.screams));
    }
    ok(done, 'screams: no far spot');
  });
  // spider: a spider's web holds 2 s longer
  S('spider', () => {
    T.fresh(6); const R = T.rooms()[0], sp = T.floorSpots(R, 'spider'); const s = T.place('spider', sp[0]);
    const f = T.raid(['warrior']), h = G.alive()[0]; const ar = G.areaOf(s); const t = ar.find(q => G.walkable(q[0], q[1]) && !(q[0] === s.x && q[1] === s.y)) || ar[0];
    T.put(h, t[0], t[1]); s.cd = 0; T.deck([]); G.fire(s, 1); const s0 = h.slowUntil - f.time; s.cd = 0; T.deck(['spider']); G.fire(s, 1); const s1 = h.slowUntil - f.time;
    out.spider = [Math.round(s0 * 100) / 100, Math.round(s1 * 100) / 100]; ok(Math.abs(s1 - s0 - 2) < 0.05, 'spider: +2 s: ' + out.spider);
  });
  // skullwall: +5% a death in the Kaplica, at most +50%; a death there counts
  S('skullwall', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'ossuary' }); const bn = T.place('bones', T.floorSpots(R, 'bones')[0]);
    const f = T.raid(['warrior', 'thief']); T.deck(['skullwall']); G.run.stacks.skullwall = 4; const k4 = G.skullK(bn); G.run.stacks.skullwall = 30; const k30 = G.skullK(bn); G.run.stacks.skullwall = 0;
    const h = G.alive()[1], w = T.walkT(R); T.put(h, w[0][0], w[0][1]); h.hp = 0; h.dead = true; G.kill(h, 'trap', 'spikes');
    out.skull = [k4, k30, G.run.stacks.skullwall]; ok(Math.abs(k4 - 1.2) < 1e-9 && k30 === 1.5 && G.run.stacks.skullwall === 1, 'skullwall: ' + out.skull);
  });
  // restock: the powder of a Kuźnia comes back with its furniture
  S('restock', () => {
    T.fresh(7); let R = null, o = null; for (const Q of T.rooms()) { const s = T.objSpots(Q, 'powder'); if (s.length) { R = Q; o = s[0]; break; } }
    if (!R) { fails.push('restock: no furniture'); return; }
    R = T.setRoom(R, { rk: 'forge' }); const pw = T.place('powder', [o.x, o.y]); pw.lvl = 2; const sp0 = pw.spent;
    const f = T.raid(['warrior']); T.deck(['restock']); pw.cd = 0; G.fire(pw, 1);
    const gone = !G.fl.items.has(key(o.x, o.y)) && !G.fl.objects.has(key(o.x, o.y)), kept = (G.run.restock || []).length;
    G.startBuild(); const back = G.fl.items.get(key(o.x, o.y));
    out.restock = { gone, kept, back: back && back.type, lvl: back && back.lvl, obj: G.fl.objects.has(key(o.x, o.y)), spent: back && back.spent === sp0 };
    ok(gone && kept === 1 && back && back.type === 'powder' && back.lvl === 2 && out.restock.obj && out.restock.spent, 'restock: back with its furniture: ' + JSON.stringify(out.restock));
  });
  // ambush: a goblin in its nora is no danger on the map until it strikes; the first blow x2
  S('ambush', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'goblin' }); const gb = T.place('goblin', T.floorSpots(R, 'goblin')[0]);
    const f = T.raid(['warrior']), h = G.alive()[0]; T.deck(['ambush']); f.known.fill(1); gb.shown = false;
    const dz = () => { G.rebuildThreat(); return f.danger[gb.y * G.WW + gb.x]; };
    const d0 = dz(), hid = G.hiddenAmbush(gb);
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [gb.x + d[0], gb.y + d[1]]).find(q => G.walkable(q[0], q[1]) && !f.items.has(key(q[0], q[1])));
    T.put(h, nb[0], nb[1]); T.deck([]); gb.cd = 0; G.fire(gb, 1); T.deck(['ambush']); gb.shown = false;   // a first blow without the card: he is slowed (Podcięcie) for both blows below
    gb.cd = 0; h.shield = 0; let hp0 = h.hp; G.fire(gb, 1); const a1 = hp0 - h.hp; gb.cd = 0; h.shield = 0; hp0 = h.hp; G.fire(gb, 1); const a2 = hp0 - h.hp;
    const d1 = dz();
    out.ambush = { d0, hid, shown: gb.shown, d1, ratio: Math.round(a1 / a2 * 100) / 100 };
    ok(d0 === 0 && hid && gb.shown && d1 > 0 && Math.abs(a1 / a2 - 2) < 0.1, 'ambush: hidden, then known, first blow x2: ' + JSON.stringify(out.ambush));
  });
  // frames: a portrait in a Galeria fires on the one who looks at it
  S('frames', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'gallery' }); const ws = T.wallSpots(R, 'portrait'); if (!ws.length) { fails.push('frames: no wall'); return; }
    const pt = T.place('portrait', ws[0]); const f = T.raid(['warrior']), h = G.alive()[0];
    const lk = { kind: 'prop', sub: 'portrait', x: pt.x, y: pt.y };
    T.deck([]); pt.cd = 0; const r0 = G.framesWake(h, lk); T.deck(['frames']); pt.cd = 0; pt.detected = false; const r1 = G.framesWake(h, lk);
    out.frames = [r0, r1, pt.cd > 0]; ok(!r0 && r1 && pt.cd > 0, 'frames: ' + out.frames);
  });
  // tainted: a potion from your loot is spoilt
  S('tainted', () => {
    T.fresh(6); const R = T.rooms()[0], sp = T.floorSpots(R); const lp = T.place('lpotion', sp[0]);
    const f = T.raid(['warrior']), h = G.alive()[0]; T.deck(['tainted']); h.inv = []; G.pickup(h, lp);
    const pot = h.inv.find(x => x.type === 'potion'); const f0 = h.fear; const k = G.taintedSip(h, pot);
    out.tainted = { tainted: !!(pot && pot.tainted), k, fear: Math.round(h.fear - f0) }; ok(pot && pot.tainted && k === 0.5 && h.fear > f0, 'tainted: ' + JSON.stringify(out.tainted));
    ok(G.taintedSip(h, { type: 'potion', r: 1 }) === 1, 'tainted: their own potion is fine');
  });
  // body: a body in a Głusza, found later
  S('body', () => {
    T.fresh(7); let R = T.setRoom(T.rooms()[0], { rt: 'hush' });
    const f = T.raid(['warrior', 'thief', 'priest']), L = G.leader(); const others = G.alive().filter(o => o !== L); const [v, fd] = others; T.deck(['body']);
    const w = T.walkT(R); T.put(v, w[0][0], w[0][1]);
    const away = [...f.rooms].filter(Q => Q.kind === 'room' && Q.id !== T.room(R).id && Q.id !== L.room).flatMap(Q => Q.tiles).find(q => G.walkable(q[0], q[1]) && Math.hypot(q[0] - v.x, q[1] - v.y) > 9);
    T.put(fd, away[0], away[1]); v.hp = 0; v.dead = true; G.kill(v, 'trap', 'spikes');
    const d = f.deaths[f.deaths.length - 1], k0 = d.knows.has(fd.id);
    T.put(fd, w[1][0], w[1][1]); fd.fearBy = {}; G.perceiveThink(G.leader(), G.alive());
    const q = f.party.queueSay.find(e => e.id === fd.id);
    out.body = { before: k0, after: d.knows.has(fd.id), fear: Math.round(fd.fearBy.death || 0), line: q && q.text, tag: q && G.lineTags(q.text) };
    ok(!k0 && d.knows.has(fd.id) && (fd.fearBy.death || 0) > 0 && q && (G.lineTags(q.text) || []).includes('death'), 'body: ' + JSON.stringify(out.body));
  });
  // falsecall: the lost one walks to the voice from the Nawiedzona sala
  S('falsecall', () => {
    let done = false;
    for (let tr = 0; tr < 5 && !done; tr++) {
      T.fresh(8); let R = T.setRoom(T.rooms()[0], { rk: 'haunt' }); const f = T.raid(['warrior', 'thief']); const h = G.alive()[1]; T.deck(['falsecall']);
      const Rid = T.room(R).id, tiles = []; f.rooms.forEach(Q => { if (Q.kind === 'room' && Q.id !== Rid) Q.tiles.forEach(q => { if (G.walkable(q[0], q[1])) tiles.push(q); }); });
      const cand = tiles.find(q => { const bb = G.bfs(q[0], q[1], {}); return T.room(R).tiles.some(t => { const s = bb.dist[t[1] * G.WW + t[0]]; return s >= 0 && s <= 12; }); }); if (!cand) continue;
      T.put(h, cand[0], cand[1]); h.lost = true; h.state = 'walk';
      const r = G.falseCall(h, G.bfs(h.x, h.y, {})); G.planHero(h); const end = h.path.length ? h.path[h.path.length - 1] : null;
      out.falsecall = { r, goalRoom: h.hearGoal >= 0 ? G.roomOf(h.hearGoal % G.WW, (h.hearGoal / G.WW) | 0) : -9, room: Rid, end, q: f.party.queueSay.some(e => e.id === h.id && G.SAY.hearVoice.includes(e.text)) }; done = true;
      ok(r && out.falsecall.goalRoom === Rid && end && G.roomOf(end[0], end[1]) === Rid && out.falsecall.q, 'falsecall: ' + JSON.stringify(out.falsecall));
    }
    ok(done, 'falsecall: no spot near the hall');
  });
  // lullsleep: a wounded one falls asleep to the lullaby in a Pokój dziecięcy, and has nightmares
  S('lullsleep', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'nursery' }); const f = T.raid(['warrior', 'thief']); const h = G.alive()[1]; T.deck(['lullsleep']);
    const w = T.walkT(R); T.put(h, w[0][0], w[0][1]); h.state = 'walk'; h.hp = 0.5 * h.max; h.lullUntil = f.time + 4; h.lullRoom = h.room; h.lullK = 0; h.napped = false;
    G.partyThink(0.05); const st = h.state, dr = !!h.dream; const f0 = f.stats.fearSrc.nightmare || 0; G.updateHero(h, 1); const nm = (f.stats.fearSrc.nightmare || 0) - f0;
    out.lull = { st, dr, nm: Math.round(nm * 10) / 10, until: Math.round((h.napUntil - f.time) * 10) / 10 };
    ok(st === 'rest' && dr && nm > 0 && out.lull.until > 3 && out.lull.until <= 4, 'lullsleep: ' + JSON.stringify(out.lull));
  });
  // mire: a slow runs out half as fast in a Bagno; blackice: a slip slows him; deepsleep: x2 on the ones resting in a Sanktuarium
  S('mire', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rt: 'swamp' }); const f = T.raid(['warrior']), h = G.alive()[0]; const w = T.walkT(R); T.put(h, w[0][0], w[0][1]);
    T.deck(['mire']); h.slowUntil = f.time + 2; G.updateHero(h, 1); const m1 = h.slowUntil - f.time; T.put(h, w[0][0], w[0][1]); T.deck([]); h.slowUntil = f.time + 2; G.updateHero(h, 1); const m0 = h.slowUntil - f.time;
    out.mire = [m1, m0]; ok(Math.abs(m1 - 2.5) < 0.01 && Math.abs(m0 - 2) < 0.01, 'mire: ' + out.mire);
  });
  S('blackice', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rt: 'ice' }); const f = T.raid(['warrior']), h = G.alive()[0];
    const Q = T.room(R), st = Q.tiles.find(q => G.walkable(q[0], q[1]) && G.walkable(q[0] + 1, q[1]) && G.roomOf(q[0] + 1, q[1]) === Q.id && !f.items.has(key(q[0] + 1, q[1])));
    if (!st) { fails.push('blackice: no spot'); return; }
    T.deck(['blackice']); T.put(h, st[0], st[1]); h.state = 'walk'; h.ldx = 1; h.ldy = 0; h.slid = false; h.slowUntil = -1;
    T.withRandom(0, () => G.onEnter(h)); out.ice = { sliding: !!h.sliding, slow: Math.round((h.slowUntil - f.time) * 10) / 10 };
    ok(h.sliding && out.ice.slow === 1.8, 'blackice: ' + JSON.stringify(out.ice));
  });
  S('deepsleep', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rt: 'haven' }); const spk = T.place('spikes', T.floorSpots(R)[0]); const f = T.raid(['warrior']), h = G.alive()[0];
    const w = T.walkT(R); T.put(h, w[0][0], w[0][1]); h.state = 'rest';
    const hit = () => { const hp0 = h.hp; G.damage(h, 10, spk); return hp0 - h.hp; };
    T.deck([]); const d0 = hit(); T.deck(['deepsleep']); const d1 = hit(); h.state = 'wait'; const d2 = hit();
    out.deep = [d0, d1, d2].map(v => Math.round(v * 100) / 100); ok(Math.abs(d1 / d0 - 2) < 0.01 && Math.abs(d2 - d0) < 0.01, 'deepsleep: ' + out.deep);
  });
  // wisps: the leader groping in the fog walks onto the trap they do not know
  S('wisps', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rt: 'fog' }); const sp = T.floorSpots(R); const spk = T.place('spikes', sp[sp.length - 1]);
    const f = T.raid(['warrior', 'thief']), L = G.leader(), P = f.party; T.deck(['wisps']);
    T.put(L, sp[0][0], sp[0][1]); P.detour = null; P.fogDone = new Set(); spk.detected = false; G.partyThink(0.05);
    const g = P.detour && P.detour.goal, gt = g >= 0 ? [g % G.WW, (g / G.WW) | 0] : null;
    out.wisps = { wisp: P.detour && P.detour.wisp, onTrap: !!gt && G.areaOf(spk).some(q => q[0] === gt[0] && q[1] === gt[1]) };
    ok(out.wisps.wisp && out.wisps.onTrap, 'wisps: ' + JSON.stringify(out.wisps));
  });
  // batscatter: scattered from a Gniazdo nietoperzy, lost
  S('batscatter', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'bats' }); const bt = T.place('bats', T.floorSpots(R, 'bats')[0]);
    const f = T.raid(['warrior', 'thief']), h = G.alive().find(o => o !== G.leader()); T.deck(['batscatter']);
    const ar = G.areaOf(bt).filter(q => G.walkable(q[0], q[1])); T.put(h, ar[0][0], ar[0][1]); bt.cd = 0;
    T.withRandom(0, () => G.fire(bt, 1)); out.bats = { lost: h.lost, stat: f.stats.batLost }; ok(h.lost && f.stats.batLost === 1, 'batscatter: ' + JSON.stringify(out.bats));
  });
  // cocoons: webbed in a Leże pająków, fear every second
  S('cocoons', () => {
    T.fresh(6); let R = T.setRoom(T.rooms()[0], { rk: 'spider' }); const wb = T.place('web', T.floorSpots(R, 'web')[0]);
    const f = T.raid(['warrior', 'thief']), h = G.alive()[1]; T.deck(['cocoons']); T.put(h, wb.x, wb.y); wb.cd = 0; G.fire(wb, 1);
    const c0 = f.stats.fearSrc.cocoon || 0; G.partyThink(0.5); const c1 = f.stats.fearSrc.cocoon || 0;
    out.cocoons = Math.round((c1 - c0) * 10) / 10; ok(c1 - c0 > 0, 'cocoons: ' + out.cocoons);
  });
  // coins: a coin found pulls greed
  S('coins', () => {
    T.fresh(6); let o = null; for (const Q of T.rooms()) { o = [...G.fl.objects.values()].find(x => G.roomOf(x.x, x.y) === Q.id && ['crate', 'barrel', 'shelf'].includes(x.kind)); if (o) break; }
    if (!o) { fails.push('coins: no furniture'); return; }
    const f = T.raid(['warrior']), h = G.alive()[0]; const lk = () => ({ kind: 'obj', sub: o.kind, x: o.x, y: o.y, it: null, done: false });
    T.deck([]); let g0 = f.greed; T.withRandom(0, () => G.lookDone(h, lk())); const a = f.greed - g0;
    T.deck(['coins']); g0 = f.greed; T.withRandom(0, () => G.lookDone(h, lk())); const b = f.greed - g0;
    out.coins = [a, Math.round(b * 1000) / 1000, h.gold]; ok(a === 0 && b > 0 && h.gold === 2, 'coins: ' + out.coins);
  });
  return { fails, out }; }"""
# ---------- 4. u-portrait gone: a deck, a shop and a save with it do not crash ----------
PORT = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  ok(!G.UPG['u-portrait'] && !G.UPGRADES.some(u => u.id === 'u-portrait'), 'u-portrait is gone');
  T.fresh(5); G.run.deck = ['u-portrait', 'spikes']; G.recomputeMods(); ok(G.mods.spikeDmg === 1.5, 'the rest of the deck still works');
  G.renderDeckTiles(true); G.setTab && G.setTab('deck');
  G.run.shop.ids[0] = 'u-portrait'; G.openModal({ type: 'shop' }); while (G.modalKind) G.closeModal();
  G.openModal({ type: 'card', idx: 0 }); while (G.modalKind) G.closeModal();
  ok(G.sellCard(0) === 0, 'selling a card that is gone gives nothing');
  G.run.deck = ['spikes', 'u-portrait']; G.run.stash = ['u-portrait'];
  G.setUser(true); G.saveRun('build');
  const raw = localStorage.getItem('yatd12-save'); ok(!!raw, 'saved');
  if (raw) { const sv = JSON.parse(raw); sv.run.deck = ['u-portrait', 'spikes']; sv.run.stash = ['u-portrait']; if (sv.run.shop) sv.run.shop.ids = ['u-portrait', 'spikes', null, 'lure']; localStorage.setItem('yatd12-save', JSON.stringify(sv));
    const r = G.resumeRun(); while (G.modalKind) G.closeModal();
    out.resume = { r, deck: G.run.deck, stash: G.run.stash, shop: G.run.shop && G.run.shop.ids };
    ok(r && G.run.deck.join() === 'spikes' && !G.run.stash.length && !(G.run.shop.ids || []).includes('u-portrait'), 'resume drops it: ' + JSON.stringify(out.resume));
    G.openModal({ type: 'shop' }); while (G.modalKind) G.closeModal(); }
  localStorage.removeItem('yatd12-save'); G.setUser(false);
  // an old run's pick list with it
  G.openModal({ type: 'card' , idx: 5 }); while (G.modalKind) G.closeModal();
  return { fails, out }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 900, 'height': 760})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + SC + 'test/page15.html')
        await pg.wait_for_timeout(600)
        await pg.evaluate(LIB)
        fails = []
        only = None   # --only=lure,ambush: just these functional checks (when working on them)
        for a in sys.argv:
            if a.startswith('--only='): only = a[7:].split(',')
        for name, js in [('apply', APPLY), ('req', REQ), ('func', FUNC), ('portrait', PORT)]:
            if only and name != 'func': continue
            try:
                r = await (pg.evaluate(js, only) if name == 'func' else pg.evaluate(js))
            except Exception as e:
                fails.append(name + ': ' + str(e)[:400]); continue
            print('==', name, json.dumps(r['out'], ensure_ascii=False)[:3000])
            fails += [name + ': ' + f for f in r['fails']]
        fails += ['page error: ' + e for e in errs]
        print('FAILS', fails)
        await b.close()
        sys.exit(1 if fails else 0)
asyncio.run(main())
