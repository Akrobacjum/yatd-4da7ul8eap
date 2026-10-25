# 1.24 Part A (gameplay): the end of a wave (worn out at patience + 60 s the heroes walk out; only at + 150 s a stuck one runs out
# where he stands, counted in stats.forcedOut; a crystal he holds goes back), the trapdoor (cost 6, 2 falls a hero a wave, 1 for an
# elite or level 12+, then trapdoors do not fire on him and he sees them; the hero card), the early waves (wave 1 like the old
# wave 3, 2 like 3,75, 3-4 a little more, 5-10 as before; the tutorial's first wave as before), the hero events in organic waves
# (the author's dungeons, a whole run: each dramatic one happens and shows its float), and fused ★ cards (power 2,5 and the
# property of each group, one slot, a slot freed when the deck is full, the stash, no third copy, unique cards never, growing
# cards keep their stacks, selling gives two, the shop and card texts, an old save with two copies). Prints FAILS [...] and exits 1
# on any. (--only=exhaust,trapdoor,waves,events,fuse; --reps=3)
import asyncio, sys, json, glob
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t118_cards.py').read().split('# ---------- 1.')[0])   # LIB (T.fresh, T.raid, T.put, T.tough, T.place, T.withRandom, T.stepS)
from playwright.async_api import async_playwright
PAGE = 'test/page15.html'
LIB2 = r"""() => { const { G } = T;
  T.of = t => G.alive().find(h => h.type === t);
  T.big = () => T.rooms().slice().sort((a, b) => b.tiles.length - a.tiles.length);
  T.planOf = h => h.plan || G.fl.party.plan;
  T.out = h => ['leave', 'escape', 'flee'].includes(T.planOf(h)) || h.fleeing || h.crystal;
  T.floatTexts = new Set(); T.grab = () => { (G.floats || []).forEach(f => T.floatTexts.add(f.text)); };
  T.run = (sec, each) => { const f = G.fl; for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); T.grab(); if (each && each()) break; } };
  return true; }"""
# ---------- 1. the end of the wave: worn out, they walk out; the true safety net at + 150 s ----------
EXHAUST = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(7); const R = T.big()[0], sp = T.floorSpots(R, 'spikes'); const trap = T.place('spikes', sp[0]), gob = T.place('goblin', T.floorSpots(R, 'goblin').slice(-1)[0]);
  const f = T.raid(['warrior', 'thief', 'mage', 'priest']), P = f.party;
  const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  ok(w && th && mg && pr, 'four heroes in');
  G.alive().forEach(h => { h.trait = null; h.plan = null; });
  ok(G.g2Start(th, [mg], 'explore', -1, 'restless'), 'a second group to call off');
  trap.detected = true; trap.cd = 0; ok(G.betStart(w, pr, trap), 'a bet to call off');
  ok(gob, 'a goblin for the last stand'); pr.stand = { m: gob, goal: -1, door: false, until: f.time + 99, at: f.time, done: false, cid: w.id, cr: false };
  w.lost = true;
  T.floatTexts = new Set();
  f.patT = G.S.waveTime + 59.97; f.ending = null;
  T.run(0.5, () => f.exhausted);   // (a skill check up holds the world: T.run answers it)
  out.at60 = { ex: !!f.exhausted, n: f.stats.exhausted, g2: !!P.g2, bet: w.bet && w.bet.done, stand: pr.stand.done, plans: G.alive().map(h => h.type + ':' + T.planOf(h)), fled: f.heroes.filter(h => h.fled).length };
  ok(f.exhausted && f.stats.exhausted === 1, 'worn out at patience + 60 s');
  ok(!P.g2, 'the second group ended');
  ok(w.bet && w.bet.done, 'the bet called off');
  ok(pr.stand.done, 'the last stand called off');
  ok(!w.lost, 'a lost one finds his way');
  ok(G.alive().every(T.out), 'everyone inside goes out: ' + out.at60.plans);
  ok(out.at60.fled === 0, 'nobody vanished at + 60 s (up to 1.23 all of them did)');
  ok([...T.floatTexts].filter(t => /^Wyczerpan[ay]$/.test(t)).length >= 1, 'a float over them: ' + [...T.floatTexts].join(' | '));
  // they walk out: every one leaves through a way out, none is forced out
  T.run(140, () => !G.alive().length && !f.heroes.some(h => h.gone && !h.dead && !h.fled));
  const fl2 = f.heroes.filter(h => h.fled);
  out.walk = { fled: fl2.length, atExit: fl2.filter(h => G.isExitTile(h.x, h.y)).length, forced: f.stats.forcedOut || 0, patT: Math.round(f.patT - G.S.waveTime) };
  ok(fl2.length === 4 && out.walk.atExit === 4, 'all four walked out through a way out: ' + JSON.stringify(out.walk));
  ok(!f.stats.forcedOut, 'nobody forced out');
  // a stuck one (in a cage that never opens) with the crystal: worn out at + 60, forced out at + 150 with a float, the crystal back
  T.fresh(7); const f2 = T.raid(['warrior', 'thief', 'mage']), P2 = f2.party, st = T.of('thief');
  st.state = 'caged'; st.cageUntil = 1e9; st.crystal = true; P2.carrierId = st.id; P2.plan = 'escape'; const cr0 = G.run.crystals;
  f2.patT = G.S.waveTime + 59.97; T.run(0.5, () => f2.exhausted);
  ok(f2.exhausted, 'worn out (2)');
  T.run(120, () => G.alive().length === 1);
  ok(!st.fled && G.alive().length === 1, 'the stuck one still inside before + 150 s');
  T.floatTexts = new Set(); f2.patT = G.S.waveTime + 149.97; T.run(0.5, () => st.fled);
  out.forced = { fled: st.fled, forced: f2.stats.forcedOut, kind: st.outKind, crystals: [cr0, G.run.crystals], lost: f2.crystalLost, floats: [...T.floatTexts] };
  ok(st.fled && f2.stats.forcedOut === 1 && st.outKind === 'out', 'forced out at + 150 s, counted, with the fade: ' + JSON.stringify(out.forced));
  ok(T.floatTexts.has('Ucieka'), 'the float "Ucieka"');
  ok(!f2.crystalLost && G.run.crystals === cr0, 'the crystal he held went back to the heart');
  ok((f2.tl ? f2.tl.ev : []).some(e => e[1] === 'fo') && (f2.tl ? f2.tl.ev : []).some(e => e[1] === 'xh'), 'timeline xh and fo');
  return { fails, out }; }"""
# ---------- 2. the trapdoor: cost 6, 2 falls a wave (1 for an elite or level 12+), then it does not fire on him ----------
TRAPDOOR = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  ok(G.ITEMS.trapdoor.cost === 4 && G.costOf('trapdoor') === 4, 'cost 4 (1.26): ' + G.costOf('trapdoor'));
  ok(G.upgCost({ type: 'trapdoor', lvl: 1 }) === 8 && G.upgCost({ type: 'trapdoor', lvl: 2 }) === 16, 'the upgrade costs follow the price (x2, x4): ' + G.upgCost({ type: 'trapdoor', lvl: 1 }));
  const fallsOf = (rank, lvl) => {
    T.fresh(7); const tds = [];
    for (const R of T.big()) for (const t of T.floorSpots(R, 'trapdoor')) { if (tds.length >= 3) break; const it = T.place('trapdoor', t); if (it) tds.push(it); }
    const f = T.raid(['warrior', 'thief']), h = T.of('thief'); h.rank = rank; h.lvl = lvl;
    T.of('warrior').gone = true;   // out of the way
    const res = [];
    tds.forEach(td => { T.put(h, td.x, td.y); td.cd = 0; td.jamUntil = 0; const want = G.checkWanted(td); G.fire(td, 1); res.push((h.gone ? 'F' : '-') + (want ? 'w' : '')); if (h.gone) G.landFallen(h); });
    return { res, n: h.tdFalls || 0, cap: G.tdCap(h), h, tds, f };
  };
  const a = fallsOf(0, 5);
  out.rookie = a.res;
  ok(a.res.length === 3 && a.n === 2 && a.res.join() === 'Fw,Fw,-', 'a rookie falls twice, the third one does not open (nor ask for a check): ' + a.res);
  // he sees the trapdoor he stands at (the party knows it from then on)
  const td = a.tds[2]; td.detected = false; td.cd = 0; T.put(a.h, td.x, td.y); G.checkWanted(td);
  ok(td.detected, 'one past his falls sees an unknown trapdoor');
  // the hero card
  G.openModal({ type: 'hero', id: a.h.id }); const tx = (document.querySelector('#card') || {}).textContent || ''; while (G.modalKind) G.closeModal();
  out.card = (tx.match(/Zapadnie: [^.]*\./) || [''])[0];
  ok(/Zapadnie: 2\/2/.test(tx), 'the hero card: ' + out.card);
  const b = fallsOf(2, 9), c = fallsOf(1, 12);
  out.elite = b.res; out.lv12 = c.res;
  ok(b.res.length === 3 && b.n === 1 && b.res.join() === 'Fw,-,-', 'an elite falls once: ' + b.res);
  ok(c.res.length === 3 && c.n === 1 && c.res.join() === 'Fw,-,-', 'level 12+ falls once: ' + c.res);
  return { fails, out }; }"""
# ---------- 3. the early waves ----------
WAVES = r"""() => { const { G } = T, fails = [], out = { table: [] }; const ok = (c, m) => { if (!c) fails.push(m); };
  while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal();
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  // 1.25.1: halfway back (wave 1 like the old 2, then 2,75 / 3,5 / 4,25)
  // 1.26 (5.1): wave 1 like the old 1,5, then 2,25 / 3 / 4
  ok(near(G.waveBase(1), (G.waveBase0(1) + G.waveBase0(2)) / 2), 'wave 1 = the old 1,5');
  ok(near(G.waveBase(2), G.waveBase0(2) * 0.75 + G.waveBase0(3) * 0.25), 'wave 2 = the old 2,25');
  ok(near(G.waveBase(3), G.waveBase0(3)), 'wave 3 = the old 3');
  ok(near(G.waveBase(4), G.waveBase0(4)), 'wave 4 = the old 4');
  for (let n = 5; n <= 10; n++) { ok(near(G.waveBase(n), G.waveBase0(n)), 'wave ' + n + ' unchanged'); ok(near(G.earlyHpK(n), G.hpK0(n)), 'wave ' + n + ' HP unchanged'); }
  ok(near(G.earlyHpK(1), Math.max(G.hpK0(1), (G.hpK0(1) + G.hpK0(2)) / 2)), 'wave 1 HP bonus = the old wave 1,5 (or its own)');
  const stat = n => { let lv = 0, hp = 0, k = 0, size = 0; for (let i = 0; i < 150; i++) { const L = G.makeWave(n); size += L.length; L.forEach(e => { lv += e.lvl; hp += e.max; k++; }); } return { n, base: Math.round(G.waveBase(n) * 100) / 100, old: Math.round(G.waveBase0(n) * 100) / 100, lvl: Math.round(lv / k * 100) / 100, hp: Math.round(hp / k), size: size / 150 }; };
  for (let n = 1; n <= 7; n++) out.table.push(stat(n));
  const T1 = out.table[0];
  ok(T1.lvl >= 1.6 && T1.lvl <= 3.4 && T1.size === 3, 'wave 1: 3 heroes about level 2-3 (the old wave 1,5): ' + JSON.stringify(T1));
  ok(out.table[1].lvl > T1.lvl && out.table[2].lvl > out.table[1].lvl, 'waves 1-3 climb');
  ok(G.makeWave(1).every(e => ['warrior', 'thief', 'mage', 'priest'].includes(e.type)), 'the classic classes in wave 1');
  // the tutorial's first wave as before: 2 rookies, levels at most 2
  G.run.tutorial = true;
  const tw = []; for (let i = 0; i < 60; i++) G.makeWave(1).forEach(e => tw.push(e));
  out.tut = { size: G.makeWave(1).length, maxLvl: Math.max(...tw.map(e => e.lvl)), base: G.waveBase(1), old: G.waveBase0(1) };
  ok(out.tut.size === 2 && out.tut.maxLvl <= 2 && near(out.tut.base, out.tut.old), 'the tutorial wave 1 unchanged: ' + JSON.stringify(out.tut));
  // 1.25.1: the guided run plays the v58 curve in waves 2-4 (and its cap of 4 in wave 2)
  for (let n = 2; n <= 4; n++) ok(near(G.waveBase(n), G.waveBase0(n)) && near(G.earlyHpK(n), G.hpK0(n)), 'the guided run: wave ' + n + ' as in v58');
  const t2 = []; for (let i = 0; i < 80; i++) G.makeWave(2).forEach(e => t2.push(e.lvl)); out.tut2max = Math.max(...t2);
  ok(out.tut2max <= 4, 'the guided run: wave 2 at most level 4: ' + out.tut2max);
  G.run.tutorial = false;
  return { fails, out }; }"""
# ---------- 4. the hero events in organic waves (a whole run in the author's dungeons, as e124/evcount.py) ----------
EV = r"""([docs, reps]) => { const { G } = T, fails = [], out = { n: 0, agg: {} }; const ok = (c, m) => { if (!c) fails.push(m); };
  const K = ['bets', 'quarrels', 'mutinies', 'rifts', 'griefs', 'lastStands', 'rivalMock', 'handOvers', 'exhausted', 'forcedOut'];
  T.floatTexts = new Set();
  const load = doc => {
    const run = G.run, L0 = doc.layout;
    const L = { cells: new Map(), edges: new Map(), entrance: L0.entrance, heartKey: L0.heart, entX: L0.entX };
    L0.cells.forEach(c => L.cells.set(c[0] + ',' + c[1], { cx: c[0], cy: c[1], x0: c[2], y0: c[3], x1: c[4], y1: c[5], lvl: c[6], born: 0, objs: c[7].map(o => o[3] ? [o[0], o[1], o[2], 1] : [o[0], o[1], o[2]]), rt: c[8] || undefined, rk: c[9] || undefined }));
    [...L.cells.values()].forEach(c => { if (!c.rt) delete c.rt; if (!c.rk) delete c.rk; });
    L0.edges.forEach(e => { const k = e[0] < e[1] ? e[0] + '|' + e[1] : e[1] + '|' + e[0]; L.edges.set(k, { key: k, a: e[0], b: e[1], horiz: !!e[2], pa: e[3], pb: e[4], lvl: e[5], born: 0 }); });
    if (L0.breach) L.breach = Object.assign({}, L0.breach, { fresh: false });
    run.layout = L; run.deck = (doc.deck || []).slice(); G.recomputeMods();
    run.items.clear(); const LM = [1, 1, 1.5, 2.2];
    L0.items.forEach(([type, x, y, lvl, dropped]) => { const Ti = G.ITEMS[type]; lvl = lvl || 1; const hp = Ti.hp ? Ti.hp * G.mods.monster * LM[lvl] : 0; run.items.set(x + ',' + y, { type, x, y, cd: 0, anim: 0, disabled: false, hp, max: hp, power: G.mods.monster * (Ti.hp ? LM[lvl] : 1), shot: 0.5, flash: 0, preview: 0, gx: x + 0.5, gy: y + 0.5, lvl, spent: dropped ? 0 : Ti.cost, dropped: !!dropped }); run.unlocked.add(type); });
    G.startBuild(true); while (G.modalKind) G.closeModal();
  };
  docs.forEach(D => { for (let r = 0; r < reps; r++) {
    while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal();
    for (let w = 1; w <= 10 && D[w]; w++) {
      G.run.crystals = Math.max(G.run.crystals, 3); load(D[w]);
      if (!G.run.next || G.run.nextFor !== G.run.wave) G.run.next = G.makeWave(G.run.wave);
      G.startWave(); const f = G.fl;
      for (let i = 0; i < 400 / 0.05 && f.phase === 'raid'; i++) {
        const c = f.check; if (c && !c.result) { const q = Math.random(); G.resolveCheck(q < 0.4 ? (c.r0 + c.r1) / 2 : q < 0.82 ? (c.g0 + c.g1) / 2 : -1); G.clearCheck(); continue; }
        G.step(0.05); if (i % 4 === 0) T.grab();
        if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } }
      }
      if (f.phase === 'raid') { fails.push('a wave did not end in 400 s'); G.finishWave(); }
      out.n++; K.forEach(k => { if (f.stats[k]) out.agg[k] = (out.agg[k] || 0) + 1; });
      while (G.modalKind) G.closeModal(); G.proceedToBuild(); while (G.modalKind) G.closeModal();
    }
  } });
  ['bets', 'quarrels', 'mutinies', 'rifts', 'griefs', 'lastStands', 'rivalMock', 'handOvers'].forEach(k => ok((out.agg[k] || 0) > 0, 'happens in organic waves: ' + k));
  const F = [...T.floatTexts]; out.floats = ['Zakład!', 'Kłótnia!', 'Bunt!', 'Rozłam', 'Obrażony', 'Obrażona', 'Ostatni bastion!', 'Przekazuje kryształ', 'Żałoba', 'Drwina', 'Zemsta!'].filter(t => F.includes(t));
  ['Zakład!', 'Kłótnia!', 'Bunt!', 'Ostatni bastion!', 'Przekazuje kryształ', 'Żałoba', 'Drwina'].forEach(t => ok(F.includes(t), 'the float shows: ' + t));
  ok(F.includes('Rozłam') || F.includes('Obrażony') || F.includes('Obrażona'), 'the rift float shows');
  ok(!(out.agg.forcedOut > 0), 'nobody forced out in organic waves: ' + (out.agg.forcedOut || 0));
  return { fails, out }; }"""
# ---------- 5. fused ★ cards ----------
FUSE = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
  T.fresh(6); G.fl.essence = 9999; G.run.freePicks = 0; G.run.stash = []; G.run.fused = [];
  const offer = id => { G.run.shop.ids[0] = id; return G.shopBuy(0); };
  // power 2,5 with the property of each group
  const one = (id, ks) => { G.run.deck = [id]; G.run.fused = []; G.run.stash = []; G.recomputeMods(); const a = {}; ks.forEach(k => { a[k] = JSON.parse(JSON.stringify(G.mods[k])); });
    const r = offer(id); const b = {}; ks.forEach(k => { b[k] = JSON.parse(JSON.stringify(G.mods[k])); }); return { r, a, b, deck: G.run.deck.slice(), fz: G.isFused(id) }; };
  let x = one('spikes', ['spikeDmg', 'fuseLv']);
  ok(x.r === 'fused' && x.deck.length === 1 && x.fz, 'a second copy fuses into one ★ card: ' + JSON.stringify(x));
  ok(near(x.b.spikeDmg, Math.pow(1.5, 2.5)) && x.b.fuseLv.spikes === 1, 'named: x1,5 as 2,5 copies and the spikes a level up: ' + JSON.stringify(x.b));
  ok(near(G.lvlPow({ type: 'spikes', lvl: 1 }), 1.6) && near(G.lvlPow({ type: 'spikes', lvl: 3 }), 2.4 * 1.5) && near(G.lvlPow({ type: 'arrows', lvl: 1 }), 1), 'lvlPow one level up for the spikes only');
  x = one('cooldown', ['cooldown']); ok(near(x.b.cooldown, Math.pow(0.75, 2.75)), 'power: +10% (2,75 copies): ' + x.b.cooldown);
  x = one('haunt', ['fearMult']); ok(near(x.b.fearMult, Math.pow(1.25, 2.5) * 1.15), 'fear: +15% fear: ' + x.b.fearMult);
  x = one('lure', ['lure']); ok(near(x.b.lure, 3.125), 'hero: +25% (3,125 copies): ' + x.b.lure);
  x = one('income', ['income']); ok(near(x.b.income, 3 * 2.5 + 2), 'Esencja (1.26: +3 a copy): +2 a wave: ' + x.b.income);
  x = one('fever', ['greedStart', 'greedFlat']); ok(near(x.b.greedStart, 0.75) && near(x.b.greedFlat, 0.1), 'greed: +0,1 at the start: ' + JSON.stringify(x.b));
  x = one('luckydraw', ['freeReroll']); ok(x.b.freeReroll === 3 && G.rerollCost() === 0, 'shop: a free refresh (2 + 1, counts rounded down): ' + x.b.freeReroll);
  x = one('patron', ['patron']); ok(x.b.patron === 2, 'counts rounded down (patron 2,5 -> 2): ' + x.b.patron);
  x = one('sharp', ['dmgType']); ok(near(x.b.dmgType.pierce, Math.pow(1.25, 2.75)), 'nested fields too: ' + x.b.dmgType.pierce);
  x = one('gate', ['gateUses']); ok(x.b.gateUses === 3 + Math.floor(2 * 2.5), 'gate uses: ' + x.b.gateUses);
  // a full deck: the second copy needs no slot
  G.run.fused = []; G.run.stash = []; G.run.deck = ['spikes', 'cooldown', 'walls', 'powder', 'gate', 'web', 'fire']; G.recomputeMods();
  ok(offer('cooldown') === 'fused' && G.run.deck.length === 7 && !G.run.stash.length && G.isFused('cooldown'), 'a full deck: it fuses, not to the stash');
  // the stash: a copy in the stash fuses there; moved to the deck it stays ★
  G.run.deck = ['spikes']; G.run.fused = []; G.run.stash = ['haunt']; G.recomputeMods();
  ok(offer('haunt') === 'fused' && G.run.stash.length === 1 && G.isFused('haunt') && !G.run.deck.includes('haunt'), 'a copy in the stash fuses there');
  ok(G.fromStash(0) && G.run.deck.includes('haunt') && G.isFused('haunt') && near(G.mods.fearMult, Math.pow(1.25, 2.5) * 1.15), 'from the stash it works as ★');
  // no third copy
  let third = 0; for (let i = 0; i < 300; i++) { if (G.upgradePicks(1 + (i % 3)).some(u => u.id === 'haunt' || u.id === 'spikes')) third++; }
  G.run.deck.push('spikes'); G.run.deck = [...new Set(G.run.deck)]; G.run.fused.push('spikes');
  let t2 = 0; for (let i = 0; i < 300; i++) { if (G.upgradePicks(1 + (i % 3)).some(u => u.id === 'haunt' || u.id === 'spikes')) t2++; }
  ok(t2 === 0, 'a fused card is not offered again: ' + t2);
  // unique cards never fuse (and are not offered while owned)
  G.run.deck = ['arrows']; G.run.fused = []; G.recomputeMods();
  ok(!G.fuseCard('arrows') && !G.isFused('arrows'), 'a unique card does not fuse');
  // a growing card keeps its stacks
  G.run.deck = ['hunger']; G.run.fused = []; G.run.stacks = { hunger: 5 }; G.recomputeMods();
  ok(offer('hunger') === 'fused' && G.run.stacks.hunger === 5 && near(G.mods.hunger, 2.75), 'a growing card keeps its stacks: ' + JSON.stringify([G.run.stacks, G.mods.hunger]));
  // selling: the price of two
  G.run.deck = ['spikes', 'walls']; G.run.fused = ['spikes']; G.recomputeMods();
  const p1 = G.sellFor('walls'), p2 = G.sellFor('spikes'), e0 = G.fl.essence, got = G.sellCard(0);
  ok(p2 === 2 * p1 && got === p2 && G.fl.essence === e0 + p2 && !G.isFused('spikes') && G.run.deck.join() === 'walls', 'selling ★ gives two: ' + [p1, p2, got]);
  // the texts: the shop offer, the deck tile, the card
  G.run.deck = ['spikes']; G.run.fused = []; G.recomputeMods(); G.run.shop.ids[0] = 'spikes';
  G.openModal({ type: 'shop' }); let tx = (document.querySelector('#offer-0') || {}).textContent || ''; while (G.modalKind) G.closeModal();
  out.offer = tx; ok(/połączy się w ★/i.test(tx) && /Połączy się w ★: /.test(tx), 'the shop says it fuses: ' + tx.slice(0, 160));
  G.run.fused = ['spikes']; G.recomputeMods(); G.renderDeckTiles(true);
  const tile = [...document.querySelectorAll('#tray .dslot.fused')]; ok(tile.length === 1 && /★ /.test(tile[0].textContent), 'the deck tile: gold, ★');
  G.openModal({ type: 'card', idx: 0 }); tx = (document.querySelector('#card') || {}).textContent || ''; while (G.modalKind) G.closeModal();
  out.card = tx.slice(0, 260); ok(/★ Ostrzejsze kolce/.test(tx) && /★ Połączona: działa jak 2,5 kopii, Kolce: moc jak o poziom wyżej/.test(tx) && tx.includes('+' + G.sellFor('spikes') + ' Esencji'), 'the card: ★, the property, the price of two: ' + out.card);
  G.openModal({ type: 'shop', sel: { k: 'd', i: 0 } }); tx = (document.querySelector('#shop-sheet') || {}).textContent || ''; while (G.modalKind) G.closeModal();
  ok(/★ Ostrzejsze kolce/.test(tx) && /Sprzedaj \+4/.test(tx), 'the shop sheet: ★ and two prices: ' + tx.slice(0, 200));
  // the groups of every card that can fuse
  out.groups = {}; G.UPGRADES.filter(u => u.kind === 'card' && !u.unique).forEach(u => { const g = G.fuseGroup(u); (out.groups[g] = out.groups[g] || []).push(u.id); });
  ok(G.UPGRADES.filter(u => u.kind === 'card' && !u.unique).every(u => /^★ Połączona: działa jak 2,5 kopii, .+\.$/.test(G.fuseText(u))), 'every card has its property line');
  // an old save with two copies in the deck: one ★ card after the resume
  G.setUser(true); G.run.deck = ['spikes', 'spikes', 'walls']; G.run.fused = undefined; G.saveRun('build');
  const r = G.resumeRun(); while (G.modalKind) G.closeModal();
  out.resume = { r, deck: G.run.deck, fused: G.run.fused, sd: G.mods.spikeDmg };
  ok(r && G.run.deck.join() === 'spikes,walls' && G.run.fused.join() === 'spikes' && near(G.mods.spikeDmg, Math.pow(1.5, 2.5)), 'an old save with two copies: one ★: ' + JSON.stringify(out.resume));
  // saved and loaded again: still ★
  G.saveRun('build'); const r2 = G.resumeRun(); while (G.modalKind) G.closeModal();
  ok(r2 && G.isFused('spikes') && near(G.mods.spikeDmg, Math.pow(1.5, 2.5)), 'the ★ survives a save');
  localStorage.removeItem('yatd12-save'); G.setUser(false);
  return { fails, out }; }"""
SECTIONS = [('exhaust', EXHAUST), ('trapdoor', TRAPDOOR), ('waves', WAVES), ('events', EV), ('fuse', FUSE)]
async def main():
    only = None; reps = 3
    for a in sys.argv:
        if a.startswith('--only='): only = a[7:].split(',')
        if a.startswith('--reps='): reps = int(a[7:])
    docs = []
    for rid in ['mvgkfs0v1x2z', 'mvgegs03hviw']:
        d = {}
        for fn in glob.glob(SC + 'real112/waves/' + rid + '_*.json'):
            j = json.load(open(fn)); j = j.get('data', j); d[str(j['wave'])] = j
        docs.append(d)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 900, 'height': 760})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + SC + PAGE)
        await pg.wait_for_timeout(600)
        await pg.evaluate(LIB); await pg.evaluate(LIB2)
        fails = []
        for name, js in SECTIONS:
            if only and name not in only: continue
            try:
                r = await (pg.evaluate(js, [docs, reps]) if name == 'events' else pg.evaluate(js))
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
