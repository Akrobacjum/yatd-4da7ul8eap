# 1.16 deliberate split (scouting): pays GZ.split instead of 'alone', a scout who gets lost turns lost, the mate follows the scout,
# a rest scout goes out while the party rests, and the UI shows it (ring/glyph state, hero card, summary rows)
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
PRE = r"""const G = __yatd; while (G.modalKind) G.closeModal();
  G.newRun(false); while (G.modalKind) G.closeModal();
  if (typeof big !== 'undefined' && big) {   // a bigger dungeon with loops (as in t12_big), so there are forks to split at
    const Rn = a => a[Math.floor(Math.random() * a.length)]; G.fl.essence = 999;
    for (let k = 0; k < 60 && G.roomCount() < big; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(Rn(dm)); G.fl.essence = 999; }
    for (let k = 0; k < 6; k++) { const tm = G.toolMarkers('tunnel'); if (tm.length) G.applyTool(Rn(tm)); G.fl.essence = 999; }
    G.run.wave = 6; G.startBuild(true);
  }
  const nx = G.makeWave(6).slice(0, types.length); nx.forEach((e, i) => { e.type = types[i]; e.trait = null; e.lvl = Math.max(e.lvl, 6); }); G.run.next = nx;
  G.startWave(); const f = G.fl; const run = (sec) => { for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); } };
  const far = (h, L) => { let best = null, bd = -1; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) { if (!G.walkable(x, y) || G.roomOf(x, y) < 0 || G.roomOf(x, y) === L.room || !f.known[y * G.WW + x]) continue; const d = Math.hypot(x - L.x, y - L.y); if (d > bd) { bd = d; best = [x, y]; } }
    if (best) { h.x = h.tx = best[0]; h.y = h.ty = best[1]; h.nx = null; h.ny = null; h.prog = 0; h.room = G.roomOf(best[0], best[1]); h.path = []; h.needPlan = true; } return bd; };
"""
RATES = "async ([types]) => { " + PRE + r"""
  run(14);
  const L = G.leader(), h = G.alive().filter(o => o !== L && !o.lost).sort((a, b) => b.id - a.id)[0];
  if (!L || !h) return { err: 'no party' };
  const res = { d: Math.round(far(h, L)) };
  h.sepRolled = true; h.speed0 = h.speed;
  const S = f.stats, fs = () => [S.lonePts || 0, S.splitPts || 0, h.fearBy.alone || 0, h.fearBy.split || 0, S.splitTime || 0, S.loneTime || 0];
  // alone (not on purpose): 1,5 s; lonePts counts every lonely hero, so divide by the hero-seconds alone
  let a0 = fs(), heroSec = 0; for (let i = 0; i < 30 && f.phase === 'raid'; i++) { run(0.05); heroSec += 0.05 * G.alive().filter(o => o.alone && !o.split).length; } let a1 = fs();
  res.alone = h.alone; res.lost1 = h.lost;
  // now the same hero on purpose (a rookie's errand to a far opening): 1,5 s
  const fr = G.frontier(); h.wanderTarget = fr.length ? fr[0] : -1; h.wanderUntil = f.time + 30; G.startSplit(h, 'test');
  let b0 = fs(); run(1.5); let b1 = fs();
  res.split = h.split; res.splitting = G.splitting(h); res.lost2 = h.lost;
  res.aloneE = heroSec > 0 ? (a1[0] - a0[0]) / heroSec : 0; res.heroSec = heroSec; res.splitE_whileAlone = (a1[1] - a0[1]) / 1.5;
  res.splitE = (b1[1] - b0[1]) / 1.5; res.aloneE_whileSplit = (b1[0] - b0[0]) / 1.5;
  res.fearAlone = a1[2] - a0[2]; res.fearSplitWhileAlone = a1[3] - a0[3]; res.fearSplit = b1[3] - b0[3]; res.fearAloneWhileSplit = b1[2] - b0[2];
  res.splitT = b1[4] - b0[4]; res.ratio = res.aloneE > 0 ? res.splitE / res.aloneE : null; res.gz = [G.GZ.alone, G.GZ.split, G.GZ.lost];
  res.card = G.heroStatus ? G.heroStatus(h) : null;
  // getting lost ends the split and books it
  G.getLost(h, 'test'); run(0.1);
  res.afterLost = { split: h.split, lost: h.lost, splitLost: S.splitLost || 0, wander: h.wanderUntil };
  return res; }"""
SCOUT = "async ([types, big]) => { " + PRE + r"""
  run(9);
  const L = G.leader(), P = f.party, crew = G.alive().filter(o => o !== L && !o.lost);
  const sc = crew.find(o => o.type === 'thief') || crew[0], mt = crew.find(o => o !== sc && o.type !== 'priest');
  if (!L || !sc || !mt) return { err: 'no party' };
  // a room the party passed (the start dungeon has no forks): forget what is inside, so its door is a way into the unknown
  const R = f.rooms.filter(r => r.kind === 'room' && r.id !== L.room && r.id !== sc.room && r.tiles.some(t => f.known[t[1] * G.WW + t[0]])).sort((a, b) => Math.hypot(b.cx - L.x, b.cy - L.y) - Math.hypot(a.cx - L.x, a.cy - L.y))[0];
  if (!R) return { err: 'no room' };
  R.tiles.forEach(t => { f.known[t[1] * G.WW + t[0]] = 0; });
  const fr = R.doors.map(d => d.y * G.WW + d.x).filter(i => G.isFrontierTile ? G.isFrontierTile(i) : G.frontier().includes(i)).map(i => [i, Math.hypot(i % G.WW - L.x, ((i / G.WW) | 0) - L.y)]);
  if (!fr.length) return { err: 'no frontier' };
  P.scoutId = sc.id; sc.scoutTarget = fr[0][0]; sc.scoutUntil = f.time + 16; sc.needPlan = true; G.startSplit(sc, 'test');
  P.scoutMate = mt.id; mt.needPlan = true; G.startSplit(mt, 'test');
  const res = { target: Math.round(fr[0][1]), scType: sc.type };
  let maxApart = 0, maxPair = 0, away = 0, intents = new Set();
  for (let i = 0; i < 160 && f.phase === 'raid'; i++) {
    run(0.05);
    if (P.scoutId !== sc.id) break;
    const dL = Math.hypot(sc.x - L.x, sc.y - L.y), dp = Math.hypot(sc.x - mt.x, sc.y - mt.y);
    maxApart = Math.max(maxApart, dL); if (P.scoutMate === mt.id) maxPair = Math.max(maxPair, dp); intents.add(mt.intent);
  }
  res.maxApart = Math.round(maxApart * 10) / 10; res.maxPair = Math.round(maxPair * 10) / 10; res.mateIntents = [...intents];
  res.splitTime = Math.round((f.stats.splitTime || 0) * 10) / 10; res.splitPts = f.stats.splitPts || 0; res.stillScout = P.scoutId === sc.id;
  res.onScout = G.onScout(mt) || P.scoutMate === -1;
  // the scout dies: the mate is released
  if (P.scoutId === sc.id) { G.damage(sc, 99999, { kind: 'heart' }); run(0.2); res.mateAfterDeath = P.scoutMate; }
  run(20);
  res.endSplit = [sc.split && !sc.dead, mt.split];
  return res; }"""
REST = "async ([types, big]) => { " + PRE + r"""
  run(10);
  const L = G.leader(), P = f.party;
  const th = G.alive().find(o => o.type === 'thief' && o !== L);
  if (!L || !th) return { err: 'no thief' };
  let n = 0, out = 0, said = 0;
  for (let k = 0; k < 8; k++) {
    // a retreat with a resting party
    const room = L.room >= 0 ? L.room : G.roomOf(L.x, L.y); if (room < 0) { run(1); continue; }
    P.plan = 'retreat'; P.retreatRoom = room; P.restSince = -1; P.restScouted = false; P.scoutId = -1; P.scoutMate = -1;
    G.alive().forEach(o => { o.hp = (o === th ? 0.8 : 0.45) * o.max; o.needPlan = true; });   // hurt enough to rest, the thief nearly whole
    const s0 = f.stats.restScouts || 0;
    run(10);
    if ((f.stats.restScouts || 0) > s0) { n++; if (P.scoutId === th.id || th.split) out++; }
    P.plan = 'explore'; P.restSince = -1; G.alive().forEach(o => { if (o.state === 'rest') o.state = 'walk'; o.needPlan = true; });
    run(3);
  }
  return { tries: 8, restScouts: n, out }; }"""
ORGANIC = "async ([types, big]) => { " + PRE + r"""
  let g = 0; while (g++ < 200000) { if (G.modalKind || f.phase !== 'raid') break;
    if (f.check) { const c = f.check; if (!c.result) G.resolveCheck((c.r0 + c.r1) / 2); G.clearCheck(); continue; }
    G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } }
  const w = G.run.waves[G.run.waves.length - 1], s = w.stats;
  return { rooms: G.roomCount(), t: Math.round(w.time), talks: s.talks, scouts: s.scouts, pairs: s.scoutPairs || 0, rest: s.restScouts || 0, ahead: s.aheadScouts || 0, wanders: s.wanders, splits: s.splits || 0, splitT: Math.round(s.splitTime || 0), splitE: Math.round((s.splitPts || 0) * 10) / 10,
    splitLost: s.splitLost || 0, steps: s.scoutSteps || 0, lost: s.gotLost, loneT: Math.round(s.loneTime || 0), score: Math.round(w.score) }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.install(); await pg.goto('file://' + SC + 'test/page15.html'); await pg.clock.run_for(800)
        await pg.evaluate("__yatd.setUser && __yatd.setUser(true)")
        fails = []
        N = int(sys.argv[1]) if len(sys.argv) > 1 else 5
        rs = [await pg.evaluate(RATES, [['warrior', 'mage', 'thief', 'priest']]) for _ in range(N)]
        print('RATES', json.dumps(rs))
        ok = [r for r in rs if not r.get('err') and r.get('alone') and r.get('split') and not r.get('lost2')]
        if len(ok) < max(2, N // 2): fails.append('too few clean rate tries (%d)' % len(ok))
        for r in ok:
            if r['fearAloneWhileSplit'] > 1e-9 or r['fearSplit'] <= 0: fails.append('fear source while split'); break
        for r in ok:
            if r['splitE_whileAlone'] > 1e-9 or r['fearSplitWhileAlone'] > 1e-9: fails.append('split pays while only alone'); break
        rat = [r['ratio'] for r in ok if r.get('ratio')]
        print('ratios', [round(x, 2) for x in rat])
        if rat and not (0.25 <= sum(rat) / len(rat) <= 0.7): fails.append('split rate is not about GZ.split/GZ.alone of alone (%.2f)' % (sum(rat) / len(rat)))
        if not all(r['afterLost']['lost'] and not r['afterLost']['split'] and r['afterLost']['splitLost'] >= 1 for r in ok): fails.append('getting lost ends the split')
        rs2 = [await pg.evaluate(SCOUT, [['warrior', 'thief', 'barbarian', 'priest'], 0]) for _ in range(N)]
        print('SCOUT', json.dumps(rs2))
        ok2 = [r for r in rs2 if not r.get('err')]
        if len(ok2) < max(2, N // 2): fails.append('too few scout tries')
        if sum(1 for r in ok2 if r['maxApart'] > 2.5) < len(ok2) // 2: fails.append('the scout leaves the party')
        if sum(1 for r in ok2 if 'scout' in r['mateIntents']) < len(ok2) // 2: fails.append('the mate goes with the scout')
        if any(r.get('mateAfterDeath', -1) != -1 for r in ok2): fails.append('the mate is released when the scout dies')
        if any(r['endSplit'][1] for r in ok2): fails.append('the split ends back with the party')
        rs4 = [await pg.evaluate(ORGANIC, [['warrior', 'thief', 'mage', 'priest'], 12]) for _ in range(N)]
        print('ORGANIC', json.dumps(rs4))
        print('pairs', sum(r['pairs'] for r in rs4), 'scouts', sum(r['scouts'] for r in rs4), 'ahead', sum(r['ahead'] for r in rs4))
        if sum(r['splits'] for r in rs4) < 1: fails.append('nobody split up on purpose in %d waves' % N)
        if sum(r['splitT'] for r in rs4) <= 0: fails.append('no time on a scouting trip')
        rs3 = [await pg.evaluate(REST, [['warrior', 'thief', 'mage', 'priest'], 12]) for _ in range(3)]
        print('REST', json.dumps(rs3))
        if sum(r.get('restScouts', 0) for r in rs3) < 2: fails.append('a thief scouts while the party rests')
        if errs: fails.append('page errors')
        print('FAILS', fails); print('errs', errs[:4]); await b.close()
asyncio.run(main())
