# 1.24 Part D (the testers' data brief, e124/playtest_brief.md): the run status (won => win, 0 crystals => end), every crystal change
# logged with its cause (crystals0 + the deltas = crystals, per wave and per run; hunger eating one says so on the map, in the summary
# and warns in the build), the time really played (activeSec, sessions), total = the waves' scores + endBonus, the player's id and the
# name prompt (web version), the new wave fields (essenceAtStart, essenceAtWaveStart, itemsCount, roomsCount, previewOpened, fearUi,
# checkByShape), unspent Esencja (the counter pulses; the question before a wave, "Nie pytaj więcej"), one check at a time with a
# 1,5 s gap in waves 1-2 (auto grazes meanwhile; wave 3 as before), the wider graze windows of the pulse and the swing (widths before
# and after), and what shaman, spider, gate, archer and powder do (P1-7). Prints FAILS [...] and exits 1 on any.
# (--only=status,crystals,time,records,name,unspent,calm,widths,items; --reps=6)
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t118_cards.py').read().split('# ---------- 1.')[0])   # LIB (T.fresh, T.raid, T.put, T.tough, T.place, T.withRandom, T.stepS)
from playwright.async_api import async_playwright
PAGE = 'test/page15.html'
LIB2 = r"""() => { const { G } = T;
  T.clean = () => { while (G.modalKind) G.closeModal(); };
  T.newRun = () => { T.clean(); G.setUser(false); G.newRun(false); T.clean(); return G.run; };
  // play the wave out: checks answered by ans(c) (a position on the shape) or let go (null), the end as the frame loop does it
  T.play = (ans, maxSec, each) => { const f = G.fl; for (let i = 0; i < (maxSec || 400) / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { const p = ans ? ans(c) : null; if (p == null) G.skipCheck(); else G.resolveCheck(p); G.clearCheck(); if (each) each('check', c); continue; } G.step(0.05); if (each) each('step'); if (f.ending !== null) { f.ending = null; G.finishWave(); } } };
  T.rnd = c => { const r = Math.random(); return r < 0.4 ? (c.r0 + c.r1) / 2 : r < 0.82 ? (c.g0 + c.g1) / 2 : 0.995; };
  T.onPath = (type, n) => { const P = G.shortestPath(), out = []; for (const q of P.slice(1)) { if (out.length >= n) break; for (const d of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[0] + d[0], y = q[1] + d[1]; if (G.canPlace(type, x, y)) { G.fl.essence = 9999; if (G.tryPlace(type, x, y)) { out.push(G.fl.items.get(T.key(x, y))); break; } } } } return out; };
  return true; }"""
# ---------- 1. P0-1 the status ----------
STATUS = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const R = T.newRun(), st = () => G.runSummary().status, cases = [];
  const set = (won, res, c) => { R.won = won; R.result = res; R.crystals = c; return st(); };
  cases.push(['going on', set(false, null, 2), 'active']);
  cases.push(['no crystal left, the choice not made yet (or the tab closed there)', set(false, null, 0), 'end']);
  cases.push(['quit from the menu', set(false, 'quit', 2), 'quit']);
  cases.push(['lost', set(false, 'end', 0), 'end']);
  cases.push(['won, playing on (the bug: active + won)', set(true, null, 2), 'win']);
  cases.push(['won, fell later', set(true, null, 0), 'win']);
  cases.push(['won, quit later', set(true, 'quit', 1), 'win']);
  cases.forEach(c => ok(c[1] === c[2], 'status, ' + c[0] + ': ' + c[1]));
  let bad = 0; for (const won of [false, true]) for (const res of [null, 'end', 'quit', 'win']) for (const c of [0, 1, 3]) { const s = set(won, res, c); if (!['win', 'end', 'quit', 'active'].includes(s) || (won && s !== 'win')) bad++; }
  ok(!bad, 'no record with won true and another status, every status of the set: ' + bad);
  ok(G.runSummary().version >= 59, 'log version 59+');
  out.cases = cases.map(c => c[0] + ' -> ' + c[1]);
  return { fails, out }; }"""
# ---------- 2. P0-2 the crystals: every change with its cause; hunger says so ----------
CRY1 = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(5); const R = G.run; R.crystals = 3; R.maxCrystals = 4; R.crystals0 = 3; R.crystalEv = []; R.crystalEvW = 0; R.crystalsSeen = 3; R.waves = []; R.total = 0;
  // the build before: a card gives one (Żarłoczne serce), Pakt takes one
  G.applyUpgrade(G.UPG.crystal); G.applyUpgrade(G.UPG.pact);
  out.afterCards = R.crystals;
  // the wave: a thief carries one out, then the wave ends hungry (nothing for the heart)
  const f = T.raid(['warrior', 'thief']), th = G.alive().find(h => h.type === 'thief');
  th.crystal = true; f.party.carrierId = th.id; G.heroExit(th);
  ok(R.crystals === 2 && f.crystalLost, 'stolen: ' + R.crystals);
  f.score = 1; f.fed = 0; f.chain = null; f.essence = 0; T.floats0 = G.floats.length;   // 1.26: an empty purse (the heart takes from it first)
  G.finishWave();
  const W = R.waves[R.waves.length - 1];
  out.wave = { crystals: W.crystals, ev: W.crystalEvents, hunger: W.hunger };
  ok(W.hunger && W.hunger.ate && R.crystals === 1, 'hunger ate one: ' + R.crystals);
  ok(JSON.stringify(W.crystalEvents.map(e => e.cause + e.delta)) === JSON.stringify(['card1', 'card-1', 'stolen-1', 'hunger-1']), 'the wave record: card +1, card -1, stolen, hunger: ' + JSON.stringify(W.crystalEvents));
  ok(W.crystalEvents.filter(e => e.cause === 'stolen' || e.cause === 'hunger').every(e => typeof e.t === 'number') && W.crystalEvents.filter(e => e.cause === 'card').every(e => e.t === null), 't: wave time in the wave, null in the build');
  ok(3 + W.crystalEvents.reduce((a, e) => a + e.delta, 0) === W.crystals, 'per wave: 3 + the deltas = crystals');
  ok(G.floats.some(x => x.text === 'Głód rozbija kryształ!'), 'the float over the heart when hunger eats a crystal');
  ok(G.modalKind === 'wave', 'the summary is up: ' + G.modalKind);
  const why = (document.querySelector('#wave-crystal-why') || {}).textContent || '';
  out.why = why;
  ok(/Głód rozbił kryształ: serce chciało \d+ Esencji/.test(why) && /Kryształ skradziony: .+ wyniósł go z lochu|Kryształ skradziony: .+ wyniosła go z lochu/.test(why), 'the summary says why both crystals went: ' + why);
  // to the next build: the warning (the last wave brought less than the heart wants)
  T.clean(); G.afterSummary(); T.clean(); G.fl.essence = 0;   // 1.26: a purse that covers the hunger is no risk
  out.build = { phase: G.fl.phase, wave: R.wave, risk: G.hungerRisk(), need: G.hungerNeed(R.wave) };
  ok(G.fl.phase === 'build' && G.hungerRisk() === G.hungerNeed(R.wave) && G.hungerRisk() > 0, 'hunger threatens the coming wave: ' + JSON.stringify(out.build));
  return { fails, out }; }"""
CRY2 = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const R = G.run, row = document.querySelector('#h-hrow'), lab = document.querySelector('#h-hlabel').textContent;
  out.hud = { cls: row.className, lab, title: row.title };
  ok(row.classList.contains('warn') && /^⚠ \d+ · sakiewka \d+$/.test(lab), 'the build warning in the heart row: ' + JSON.stringify(out.hud));
  ok(/serce weźmie brak z sakiewki/.test(row.title) && /pęknie kryształ/.test(row.title), 'its long text');
  // the next wave: fed; a crystal bought, the continue ad (here as its code), a change nobody logged
  G.fl.essence = 9999; ok(G.buyCrystal(), 'a crystal bought');
  R.crystals += 1;   // unlogged on purpose
  const f = T.raid(['warrior']); f.fed = G.hungerNeed(R.wave) + 1; f.score = f.fed; f.chain = null;
  G.finishWave();
  const W = R.waves[R.waves.length - 1], P = R.waves[R.waves.length - 2];
  out.wave2 = W.crystalEvents;
  ok(W.crystalEvents.some(e => e.cause === 'other' && e.why === 'buy') && W.crystalEvents.some(e => e.cause === 'other' && e.why === 'unlogged'), 'bought and unlogged as other: ' + JSON.stringify(W.crystalEvents));
  ok(P.crystals + W.crystalEvents.reduce((a, e) => a + e.delta, 0) === W.crystals, 'wave to wave: the deltas add up');
  T.clean();
  const s = G.runSummary();
  out.run = { c0: s.crystals0, sum: s.crystalEvents.reduce((a, e) => a + e.delta, 0), crystals: s.crystals, n: s.crystalEvents.length };
  ok(s.crystals0 + out.run.sum === s.crystals, 'per run: crystals0 + the deltas = crystals: ' + JSON.stringify(out.run));
  ok(s.crystalEvents.every(e => ['stolen', 'hunger', 'saved', 'card', 'other'].includes(e.cause)), 'causes of the set');
  // a carrier killed: the crystal comes back (saved, delta 0)
  G.afterSummary(); T.clean();
  const f3 = T.raid(['warrior', 'thief']), th = G.alive().find(h => h.type === 'thief'); th.crystal = true; f3.party.carrierId = th.id; th.hp = 0; th.dead = true; G.kill(th, 'trap', 'spikes');
  ok(R.crystalEv.some(e => e.cause === 'saved' && e.delta === 0), 'a crystal carried back: saved, delta 0');
  return { fails, out }; }"""
# ---------- 4. P0-4, P0-6: the records ----------
RECORDS = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(6); const R = G.run; R.waves = []; R.total = 0; R.waveDocs = []; R.crystals = R.maxCrystals = 9;   // crystals to spare: three waves in a row
  R.essAtStart = 120; G.fl.essence = 120;
  const its = T.onPath('spikes', 2).concat(T.onPath('arrows', 2)); G.fl.essence = 70;
  G.openModal({ type: 'news' }); T.clean(); G.openModal({ type: 'news' }); T.clean();
  const n0 = G.fl.items.size, r0 = R.layout.cells.size;
  G.run.next = G.makeWave(4); G.startWave(); const f = G.fl;
  for (let i = 0; i < 400 && f.queue.length; i++) G.step(0.05);
  G.step(0.3); const h = G.alive()[0]; if (h) { G.openModal({ type: 'hero', id: h.id }); T.clean(); }
  T.play(T.rnd, 300);
  const W = R.waves[R.waves.length - 1], st = W.stats, B = st.checkByShape || {};
  const sum = k => Object.values(B).reduce((a, o) => a + (o[k] || 0), 0);
  out.fields = { essenceAtStart: W.essenceAtStart, essenceAtWaveStart: W.essenceAtWaveStart, itemsCount: W.itemsCount, roomsCount: W.roomsCount, previewOpened: W.previewOpened, fearUi: W.fearUi, checkByShape: B };
  ok(W.essenceAtStart === 120 && W.essenceAtWaveStart === 70, 'essenceAtStart / essenceAtWaveStart');
  ok(W.itemsCount === n0 && W.roomsCount === r0 && n0 >= 4, 'itemsCount / roomsCount: ' + [n0, r0]);
  ok(W.previewOpened === 2, 'previewOpened: the news card twice');
  ok(W.fearUi && W.fearUi.card === (h ? 1 : 0), 'fearUi: a hero card in the wave');
  ok(sum('ok') === st.checkOk && sum('crit') === st.checkCrit && sum('miss') === st.checkMiss && sum('skip') === st.checkSkip && sum('auto') === (st.calmAuto || 0), 'checkByShape adds up to the totals: ' + JSON.stringify(B));
  ok(st.checks > 0 && B.bar, 'checks on the bar shape counted');
  // a second wave, a partial third (quit): total = the waves + endBonus
  T.clean(); G.afterSummary(); T.clean(); G.fl.essence = 9999;
  G.run.next = G.makeWave(R.wave); G.startWave(); T.play(T.rnd, 300); T.clean(); G.afterSummary(); T.clean();
  G.run.next = G.makeWave(R.wave); G.startWave(); T.play(T.rnd, 8); G.quitRun(); T.clean();
  const s = G.runSummary(), scs = s.waveMini.map(w => w.sc);
  out.total = { total: s.total, sc: scs, endBonus: s.endBonus, status: s.status };
  ok(s.total === scs.reduce((a, b) => a + b, 0) + s.endBonus && s.endBonus === 0, 'total = the waves + endBonus (0): ' + JSON.stringify(out.total));
  ok(s.status === 'quit' && s.waveMini.length === 3 && s.waveMini[2].part === 1, 'the partial wave of a quit counts');
  const doc = R.waveDocs[R.waveDocs.length - 1];
  ok(doc && doc.version >= 59 && 'essenceAtWaveStart' in doc.summary && 'crystalEvents' in doc.summary && 'checkByShape' in doc.summary.stats, 'the wave document carries the fields');
  ['playerId', 'crystals0', 'crystalEvents', 'activeSec', 'sessions', 'endBonus', 'status'].forEach(k => ok(k in s, 'runs record: ' + k));
  ok(typeof s.playerId === 'string' && s.playerId.length > 4 && s.playerId === G.playerIdNow(), 'playerId');
  ok(['calmWaves', 'calmGap', 'okPulse', 'okSwing'].every(k => k in s.settings), 'the new settings are logged');
  return { fails, out }; }"""
# ---------- 6. P1-2 unspent Esencja ----------
UNSP1 = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  localStorage.removeItem('yatd-noask-ess');
  const R = T.newRun();
  out.start = { e: Math.floor(G.fl.essence), e0: R.essAtStart, cheap: G.cheapestItem() };
  ok(R.essAtStart === 25 && G.fl.essence === 25 && G.cheapestItem().cost === 3, 'wave 1 (1.26): 25 at the start, the start traps free, the cheapest costs 3: ' + JSON.stringify(out.start));
  return { fails, out }; }"""
UNSP2 = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const R = G.run, sc = document.querySelector('#h-score'), act = () => document.querySelector('#btn-action').click();
  ok(sc.classList.contains('afford'), 'the counter pulses while something is affordable');
  act(); out.ask1 = { kind: G.modalKind, phase: G.fl.phase, txt: (document.querySelector('#card') || {}).textContent.slice(0, 140) };
  ok(G.modalKind === 'unspent' && G.fl.phase === 'build' && /Masz 25 Esencji/.test(out.ask1.txt) && /Rozpocząć falę mimo to\?|Warto jeszcze postawić/.test(out.ask1.txt), 'the question: ' + JSON.stringify(out.ask1));
  document.querySelector('#unspent-back').click();
  ok(!G.modalKind && G.fl.phase === 'build', 'Buduj dalej: back to building');
  act(); ok(G.modalKind === 'unspent', 'asked again');
  document.querySelector('#unspent-noask').checked = true; document.querySelector('#unspent-go').click();
  ok(G.fl.phase === 'raid' && localStorage.getItem('yatd-noask-ess') === '1', 'Wypuść falę mimo to + Nie pytaj więcej: the wave runs, kept on the device');
  ok(G.fl.stats.unspentAsk === 2 && G.fl.stats.unspentGo === 1, 'stats.unspentAsk / unspentGo: ' + [G.fl.stats.unspentAsk, G.fl.stats.unspentGo]);
  T.play(c => (c.g0 + c.g1) / 2, 300); T.clean(); G.afterSummary(); T.clean();
  ok(G.fl.phase === 'build' && R.waves[0].stats.unspentAsk === 2, 'in the wave record');
  G.fl.essence = 500; act(); ok(G.fl.phase === 'raid' && !G.modalKind, 'Nie pytaj więcej holds (wave 2)');
  T.play(c => (c.g0 + c.g1) / 2, 300); T.clean(); G.afterSummary(); T.clean();
  localStorage.removeItem('yatd-noask-ess');
  // a new run (the device remembers across runs): set again, a new run, no question
  localStorage.setItem('yatd-noask-ess', '1'); T.newRun(); act(); ok(G.fl.phase === 'raid', 'across runs too'); localStorage.removeItem('yatd-noask-ess');
  const cases = [];
  const askIf = (e, e0, tut) => { T.newRun(); G.run.essAtStart = e0; G.fl.essence = e; G.run.tut = tut ? 0 : -1; const a = G.askUnspent(); T.clean(); return a; };
  cases.push(['2 left (the cheapest costs 3)', askIf(2, 30, false), false]);
  cases.push(['40 of 100 left', askIf(40, 100, false), false]);
  cases.push(['60 of 100 left', askIf(60, 100, false), true]);
  cases.push(['the guide', askIf(60, 100, true), false]);
  cases.forEach(c => ok(c[1] === c[2], 'question when ' + c[0] + ': ' + c[1]));
  out.cases = cases.map(c => c[0] + ' -> ' + c[1]);
  T.newRun(); G.fl.essence = 2;
  return { fails, out }; }"""
UNSP3 = r"""() => { const { G } = T, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  ok(!document.querySelector('#h-score').classList.contains('afford'), 'no pulse when nothing is affordable');
  return { fails, out: {} }; }"""
# ---------- 7. P1-3 one check at a time in waves 1-2 ----------
CALM = r"""(wave) => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const R = T.newRun(); R.wave = wave; G.startBuild(true); T.clean(); G.fl.essence = 9999;
  const ar = T.onPath('arrows', 4), sp = T.onPath('spikes', 3);
  G.run.next = G.makeWave(wave); G.startWave(); const f = G.fl;
  for (let i = 0; i < 600 && f.queue.length; i++) G.step(0.05);
  G.alive().forEach(T.tough);
  const at = [];
  T.play(c => { at.push(f.time); return 0.995; }, 60);   // every check missed: the trap asks again (the testers' case)
  const gaps = at.slice(1).map((t, i) => Math.round((t - at[i]) * 100) / 100);
  out.n = at.length; out.minGap = gaps.length ? Math.min(...gaps) : null; out.auto = f.stats.calmAuto || 0; out.traps = [ar.length, sp.length]; out.perMin = Math.round(at.length / (f.time / 60) * 10) / 10;
  return { fails, out }; }"""
# ---------- 8. P1-6 the graze windows ----------
WIDTHS = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  // 16 checks of each shape (the zones sit at random spots): the mean graze window (share of the shape), crit strip, how long the
  // bead stays in the graze window (ms; the swing per pass, it has two) and its size on a 390 px phone (px along the bead's way)
  const one = (type, k) => {
    G.S.okPulse = k; G.S.okSwing = k;
    T.fresh(6); const R = T.rooms().slice().sort((a, b) => b.tiles.length - a.tiles.length)[0];
    const it = T.place(type, T.floorSpots(R, type)[0]);
    const f = T.raid(['warrior']), h = G.alive()[0], L = [];
    for (let n = 0; n < 16; n++) {
      T.put(h, it.x, it.y); it.cd = 0; it.skipUntil = 0; f.checkGap = 0; h.fellFrom = null; h.tdFalls = 0;
      for (let i = 0; i < 60 && !f.check; i++) G.step(0.05);
      const c = f.check; if (!c) break;
      let inG = 0; const N = 4000; for (let i = 0; i < N; i++) { const p = G.checkPos(c, i / N); if (p >= c.g0 && p <= c.g1) inG++; }
      const [cw, ch] = G.cwch, DR = Math.max(40, Math.min(52, Math.min(cw, ch) * 0.12)), w = Math.min(320, cw - 28), RM = DR + 7 - 1;
      const len = c.shape === 'bar' ? w - 14 : c.shape === 'pulse' ? RM : c.shape === 'swing' ? DR * 1.45 * 2.2 : 0;
      L.push({ shape: c.shape, g: c.g1 - c.g0, r: c.r1 - c.r0, dur: c.dur, okMs: inG / N * c.dur * 1000 / (c.shape === 'swing' ? 2 : 1), okMin: 0, px: (c.g1 - c.g0) * len });
      G.skipCheck(); G.clearCheck();
    }
    if (!L.length) return null;
    const m = k2 => L.reduce((a, x) => a + x[k2], 0) / L.length;
    return { shape: L[0].shape, n: L.length, g: Math.round(m('g') * 1000) / 1000, r: Math.round(m('r') * 1000) / 1000, durMs: Math.round(m('dur') * 1000), okMs: Math.round(m('okMs')), okMsMin: Math.round(Math.min(...L.map(x => x.okMs))), px: Math.round(m('px')) };
  };
  for (const [type, nm] of [['spikes', 'bar'], ['trapdoor', 'pulse'], ['goblin', 'swing']]) out[nm] = { before: one(type, 1), after: one(type, nm === 'pulse' ? 1.6 : 1.65) };
  G.S.okPulse = 1.6; G.S.okSwing = 1.65;
  const b = out.bar.after, p = out.pulse.after, s = out.swing.after;
  ok(b && p && s && out.pulse.before && out.swing.before, 'checks of each shape');
  if (b && p && s) {
    ok(Math.abs(p.g / b.g - 1.6) < 0.01 && Math.abs(s.g / b.g - 1.65) < 0.01, 'the graze windows: pulse x1,6, swing x1,65 of the bar: ' + [p.g, s.g, b.g]);
    ok(p.r === b.r && s.r === b.r, 'the crit strips unchanged');
    ok(Math.abs(out.pulse.before.g - b.g) < 0.001 && Math.abs(out.swing.before.g - b.g) < 0.001, 'before: the same share of the shape for all');
    ok(p.okMs >= b.okMs && s.okMs >= b.okMs, 'on average the bead now stays at least as long in the graze window as on the bar: ' + [b.okMs, p.okMs, s.okMs]);
  }
  return { fails, out }; }"""
# ---------- 9. P1-7 shaman, spider, gate, archer, powder ----------
ITEMS = r"""([reps]) => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); }; const key = T.key;
  const run1 = (type, where) => {
    T.fresh(6); G.run.unlocked.add(type); G.run.unlocked.add('crate'); G.run.unlocked.add('goblin');
    const P = G.shortestPath(), on = new Set(P.map(p => key(p[0], p[1]))), mid = P.slice(Math.floor(P.length * 0.25), Math.floor(P.length * 0.85));
    let it = null, gob = null; const spots = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(type, x, y)) spots.push([x, y]);
    if (type === 'powder') {
      const cs = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('crate', x, y) && !on.has(key(x, y)) && (where === 'any' || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => on.has(key(x + d[0], y + d[1]))))) cs.push([x, y]);
      for (let k = 0; k < 20 && !it && cs.length; k++) { const c = cs[Math.floor(Math.random() * cs.length)]; G.fl.essence = 9999; G.tryPlace('crate', c[0], c[1]); if (G.canPlace('powder', c[0], c[1])) it = T.place('powder', c); }
    } else if (where === 'path') {
      const s = spots.filter(t => type === 'archer' || type === 'shaman' ? mid.some(p => G.roomOf(p[0], p[1]) === G.roomOf(t[0], t[1]) && G.roomOf(t[0], t[1]) >= 0) : type === 'gate' ? on.has(key(t[0], t[1])) : mid.some(p => p[0] === t[0] && p[1] === t[1]));
      if (s.length) it = T.place(type, s[Math.floor(Math.random() * s.length)]);
    } else if (spots.length) it = T.place(type, spots[Math.floor(Math.random() * spots.length)]);
    if (it && type === 'shaman' && where === 'path') { const r = G.roomOf(it.x, it.y), gs = mid.filter(p => G.roomOf(p[0], p[1]) === r && G.canPlace('goblin', p[0], p[1])); if (gs.length) gob = T.place('goblin', gs[0]); }
    if (!it) return null;
    let wanted = 0;
    G.run.next = G.makeWave(4); G.startWave();
    T.play(T.rnd, 400, ev => { if (ev === 'step' && type === 'shaman' && !gob && G.fl.items.get(key(it.x, it.y)) === it && G.checkWanted(it)) wanted++; });
    T.clean();
    const b = G.fl.byType[type] || {};
    return { fires: b.fires || 0, hits: b.hits || 0, dmg: Math.round(b.dmg || 0), pdmg: Math.round(b.passiveDmg || 0), checks: b.checks || 0, gob: !!gob, wanted };
  };
  for (const type of ['shaman', 'spider', 'gate', 'archer', 'powder']) for (const where of ['path', 'any']) {
    const L = []; for (let n = 0; n < reps; n++) { const r = run1(type, where); if (r) L.push(r); }
    const m = k => Math.round(L.reduce((a, r) => a + r[k], 0) / Math.max(1, L.length) * 10) / 10;
    out[type + ' ' + where] = { n: L.length, fired: L.filter(r => r.fires > 0).length, idle: L.filter(r => !r.fires && !r.dmg && !r.pdmg).length, fires: m('fires'), hits: m('hits'), dmg: m('dmg'), passiveDmg: m('pdmg'), checks: m('checks'), shamanAloneWanted: type === 'shaman' && where === 'any' ? L.reduce((a, r) => a + r.wanted, 0) : undefined };
    if (where === 'path') ok(L.length >= reps - 1 && L.filter(r => r.fires > 0 || r.pdmg > 0).length >= Math.ceil(L.length * 0.6), type + ' on the heroes\' way works: ' + JSON.stringify(out[type + ' ' + where]));
  }
  // a shaman with no other monster in its room never wants to heal (nothing to heal): by design
  T.fresh(5); G.run.unlocked.add('shaman'); const R0 = T.rooms()[0], sh = T.place('shaman', T.floorSpots(R0, 'shaman')[0]);
  const f = T.raid(['warrior']); T.put(G.alive()[0], sh.x, sh.y + 0); ok(sh && !G.checkWanted(sh), 'a shaman alone: nothing to heal, no check');
  return { fails, out }; }"""
SECTIONS = ['status', 'crystals', 'time', 'records', 'name', 'unspent', 'calm', 'widths', 'items']
async def main():
    only = None; reps = 6
    for a in sys.argv:
        if a.startswith('--only='): only = a[7:].split(',')
        if a.startswith('--reps='): reps = int(a[7:])
    want = lambda s: not only or s in only
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + SC + PAGE); await pg.wait_for_timeout(600)
        await pg.evaluate(LIB); await pg.evaluate(LIB2)
        async def sec(name, js, arg=None):
            try: r = await (pg.evaluate(js, arg) if arg is not None else pg.evaluate(js))
            except Exception as e: fails.append(name + ': ' + str(e)[:600]); return None
            print('==', name, json.dumps(r['out'], ensure_ascii=False)[:3000]); fails.extend(name + ': ' + f for f in r['fails']); return r
        if want('status'): await sec('status', STATUS)
        if want('crystals'):
            if await sec('crystals', CRY1): await pg.wait_for_timeout(300); await sec('crystals2', CRY2)
        if want('records'): await sec('records', RECORDS)
        if want('unspent'):
            if await sec('unspent', UNSP1):
                await pg.wait_for_timeout(300); r = await sec('unspent2', UNSP2)
                if r: await pg.wait_for_timeout(300); await sec('unspent3', UNSP3)
        if want('calm'):
            res = {}
            for w in [1, 2, 3]:
                r = await sec('calm w%d' % w, CALM, w); res[w] = r and r['out']
            if res.get(1) and res.get(3):
                for w in [1, 2]:
                    o = res[w]
                    if not o or o['n'] < 3 or o['minGap'] is None or o['minGap'] < 1.5 + 1.15 * 0 - 0.01: fails.append('calm: wave %d: checks at least 1,5 s apart: %s' % (w, o))
                    if not o or o['auto'] < 1: fails.append('calm: wave %d: what wanted a check in the gap fired by itself: %s' % (w, o))
                o3 = res[3]
                if o3['auto'] != 0 or o3['minGap'] is None or o3['minGap'] >= 1.5: fails.append('calm: wave 3 as before (no gap, no auto): %s' % o3)
        if want('widths'): await sec('widths', WIDTHS)
        if want('items'): await sec('items', ITEMS, [reps])
        await pg.wait_for_timeout(300)
        # ---------- 3. P0-3 the time played (a fake clock) ----------
        if want('time'):
            ctx2 = await b.new_context(viewport={'width': 390, 'height': 844}); p2 = await ctx2.new_page(); e2 = []
            p2.on('pageerror', lambda e: e2.append(str(e)))
            await p2.clock.install(); await p2.goto('file://' + SC + PAGE); await p2.clock.run_for(500)
            act = "() => __yatd.run.activeSec"
            await p2.evaluate("() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal(); window.dispatchEvent(new Event('pointerdown')); }")
            await p2.clock.run_for(10000); a1 = await p2.evaluate(act)
            await p2.clock.run_for(60000); a2 = await p2.evaluate(act)   # no touch: counted up to 60 s after the last one
            await p2.evaluate("() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); window.dispatchEvent(new Event('pointerdown')); }")
            await p2.clock.run_for(5000); a3 = await p2.evaluate(act)   # hidden: nothing
            await p2.evaluate("() => { delete document.visibilityState; window.dispatchEvent(new Event('pointerdown')); }")
            await p2.clock.run_for(3000); a4 = await p2.evaluate(act); s1 = await p2.evaluate("() => __yatd.run.sessions.length")
            await p2.evaluate("() => { const ss = __yatd.run.sessions, l = ss[ss.length - 1]; l[0] -= 400000; l[1] -= 400000; __yatd.run.startedAt -= 400000; }")   # as if the last counted second was 400 s ago (away), then back
            await p2.evaluate("() => window.dispatchEvent(new Event('pointerdown'))"); await p2.clock.run_for(3000); s2 = await p2.evaluate("() => __yatd.run.sessions.length")
            await p2.evaluate("() => { __yatd.run.sessNew = true; window.dispatchEvent(new Event('pointerdown')); }"); await p2.clock.run_for(2000)   # as a resumed run
            rs = await p2.evaluate("() => { const s = __yatd.runSummary(); return { activeSec: s.activeSec, durationSec: s.durationSec, sessions: s.sessions, buildSec: s.buildSec, raidSec: s.raidSec }; }")
            await p2.evaluate("() => __yatd.setUser(false)")
            out = {'a1': a1, 'a2': a2, 'a3': a3, 'a4': a4, 's1': s1, 's2': s2, 'run': rs}
            print('== time', json.dumps(out)[:1500])
            if not (9 <= a1 <= 11.5): fails.append('time: 10 s with a touch: %s' % a1)
            if not (58 <= a2 <= 62.5): fails.append('time: idle in the build counts 60 s after the last touch: %s' % a2)
            if abs(a3 - a2) > 0.01: fails.append('time: a hidden page does not count: %s %s' % (a2, a3))
            if not (a4 - a3 >= 2): fails.append('time: visible again: %s %s' % (a3, a4))
            if s1 != 1 or s2 != 2 or len(rs['sessions']) != 3: fails.append('time: sessions: one, a new one after 400 s away, one after a resume: %s %s %s' % (s1, s2, len(rs['sessions'])))
            if not (rs['activeSec'] <= rs['durationSec']): fails.append('time: activeSec <= durationSec: %s' % rs)
            if not all('start' in s and 'end' in s and s['start'] <= s['end'] for s in rs['sessions']): fails.append('time: {start, end}')
            fails.extend('time page error: ' + e for e in e2[:3])
            await ctx2.close()
        # ---------- 5. P0-5 the player: the name prompt in the web version, the id ----------
        if want('name'):
            ctx3 = await b.new_context(viewport={'width': 390, 'height': 844}); p3 = await ctx3.new_page(); e3 = []
            p3.on('pageerror', lambda e: e3.append(str(e)))
            await p3.add_init_script("window.YATD_WEB = 1;")
            await p3.goto('file://' + SC + PAGE); await p3.wait_for_timeout(500)
            out = {}
            out['web'] = await p3.evaluate("() => __yatd.WEB")
            await p3.click('#start-play'); await p3.wait_for_timeout(200)
            out['ask'] = await p3.evaluate("() => ({ kind: __yatd.modalKind, field: !!document.querySelector('#name-ask'), txt: document.querySelector('#card').textContent.slice(0, 120) })")
            await p3.click('#name-skip'); await p3.wait_for_timeout(200)
            out['skipped'] = await p3.evaluate("() => ({ kind: __yatd.modalKind, asked: localStorage.getItem('yatd-name-asked'), pid: __yatd.run.playerId, sum: __yatd.runSummary().playerId, user: __yatd.userStarted, wave: __yatd.run.wave })")
            await p3.evaluate("() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.openModal({ type: 'start' }); }")
            await p3.click('#start-play'); await p3.wait_for_timeout(200)
            out['again'] = await p3.evaluate("() => __yatd.modalKind")
            await p3.evaluate("() => { const G = __yatd; while (G.modalKind) G.closeModal(); localStorage.removeItem('yatd-name-asked'); G.openModal({ type: 'start' }); }")
            await p3.click('#start-play'); await p3.wait_for_timeout(200)
            await p3.fill('#name-ask', 'Kasia'); await p3.click('#name-ok'); await p3.wait_for_timeout(200)
            out['named'] = await p3.evaluate("() => ({ kind: __yatd.modalKind, name: localStorage.getItem('yatd-name'), rec: JSON.parse(localStorage.getItem('yatd-player')), pid: __yatd.runSummary().playerId, player: __yatd.runSummary().player, run: __yatd.run.playerId })")
            out['ids'] = await p3.evaluate("""() => { const G = __yatd, a = G.playerIdNow(), b = G.playerIdNow(); while (G.modalKind) G.closeModal(); G.openModal({ type: 'start' });
              const inp = document.querySelector('#player-name'); inp.value = 'Ola'; inp.dispatchEvent(new Event('input')); const c = G.playerIdNow(); inp.value = 'Kasia'; inp.dispatchEvent(new Event('input')); const d = G.playerIdNow(); G.closeModal(); return { a, b, c, d }; }""")
            print('== name', json.dumps(out, ensure_ascii=False)[:2000])
            if not out['web']: fails.append('name: the page in web mode')
            if out['ask']['kind'] != 'name' or not out['ask']['field']: fails.append('name: the prompt before the first run: %s' % out['ask'])
            sk = out['skipped']
            if sk['kind'] == 'name' or sk['asked'] != 'skipped' or not sk['pid'] or sk['pid'] != sk['sum'] or not sk['user']: fails.append('name: Pomiń starts the run with a playerId: %s' % sk)
            if out['again'] == 'name': fails.append('name: not asked again after Pomiń')
            nm = out['named']
            if nm['kind'] == 'name' or nm['name'] != 'Kasia' or not nm['rec'] or nm['rec']['name'] != 'Kasia' or nm['rec']['id'] != nm['pid'] or nm['player'] != 'Kasia' or nm['run'] != nm['pid']: fails.append('name: Graj keeps the name and its id: %s' % nm)
            i = out['ids']
            if not (i['a'] == i['b'] and i['c'] != i['a'] and i['d'] != i['c']): fails.append('name: one id a name, a new name a new id: %s' % i)
            fails.extend('name page error: ' + e for e in e3[:3])
            await ctx3.close()
            # the test page (not web): no prompt
            p4 = await ctx.new_page(); await p4.goto('file://' + SC + PAGE); await p4.wait_for_timeout(400)
            await p4.evaluate("() => localStorage.clear()"); await p4.reload(); await p4.wait_for_timeout(400)
            await p4.click('#start-play'); await p4.wait_for_timeout(200)
            k = await p4.evaluate("() => __yatd.modalKind")
            if k == 'name': fails.append('name: no prompt outside the web version')
            await p4.evaluate("() => __yatd.setUser(false)"); await p4.close()
        fails += ['page error: ' + e for e in errs[:5]]
        print('FAILS', fails)
        await b.close()
        sys.exit(1 if fails else 0)
asyncio.run(main())
