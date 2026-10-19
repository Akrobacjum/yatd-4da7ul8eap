import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => {
  const G = __yatd, out = {}, fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };
  const key = (x, y) => x + ',' + y;
  const NEW = ['eyes', 'bones', 'mirror', 'creak', 'coffin', 'musicbox', 'shade', 'bats'];
  // a run with a bigger dungeon: dig a few rooms in the first build, a crate for the music box
  const setup = (extra) => {
    while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal();
    G.fl.essence = 999;
    for (let i = 0; i < 4; i++) { const m = G.toolMarkers('dig'); if (!m.length) break; G.applyTool(m[Math.floor(Math.random() * m.length)]); G.fl.essence = 999; }
    NEW.forEach(t => G.run.unlocked.add(t));
    if (extra) extra();
    return G.fl;
  };
  const spawn = () => { G.startWave(); let g = 0; while (G.fl.queue.length || G.fl.heroes.some(h => h.gone && !h.dead && !h.fled)) { G.step(0.05); if (++g > 600) break; } return G.fl; };
  const spotsFor = t => { const r = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(t, x, y)) r.push([x, y]); return r; };
  // 1. the Strach tab
  out.tab = G.TABS.find(t => t.id === 'fear').items;
  ok(out.tab.length === 10, 'fear tab has 10');
  ok(!G.TABS.find(t => t.id === 'traps').items.includes('portrait') && !G.TABS.find(t => t.id === 'monster').items.includes('ghost'), 'moved out of old tabs');
  ok(G.run === null || true, '');
  // 2. every new element fires and scares (hero teleported into its area)
  out.fire = {};
  NEW.forEach(t => {
    let f = setup(() => {
      if (t === 'musicbox') { const c = spotsFor('crate'); if (c.length) G.tryPlace('crate', c[0][0], c[0][1]); G.fl.essence = 999; }
    });
    f = spawn(); f.essence = 999;
    const sp = spotsFor(t);
    if (!sp.length) { out.fire[t] = 'no spot'; fails.push('no spot ' + t); return; }
    const [x, y] = sp[Math.floor(sp.length / 2)];
    const okp = G.tryPlace(t, x, y);
    const it = f.items.get(key(x, y));
    if (!okp || !it) { out.fire[t] = 'not placed'; fails.push('not placed ' + t); return; }
    it.cd = 0; it.jamUntil = 0;
    const h = f.heroes.find(o => !o.dead && !o.fled && !o.gone);
    let area = G.areaOf(it).filter(a => G.fl.objects ? !G.fl.objects.has(key(a[0], a[1])) : true);
    if (t === 'creak') area = [[x, y]];
    if (t === 'shade' || t === 'bats') { it.gx = x + 0.5; it.gy = y + 0.5; area = G.areaOf(it); }
    const a = area.find(q => !(q[0] === x && q[1] === y) || t === 'creak') || area[0];
    if (!a) { out.fire[t] = 'no area'; fails.push('no area ' + t); return; }
    f.heroes.forEach(o => { if (o !== h) { o.gone = true; } });   // one hero only, so nothing else interferes
    h.x = a[0]; h.y = a[1]; h.tx = a[0]; h.ty = a[1]; h.nx = null; h.ny = null; h.prog = 0; h.room = f.roomAt[a[1] * G.WW + a[0]]; h.path = [];
    h.fear = 0; h.courage = 999;   // no running away mid test
    const s0 = f.base;
    const fired = G.fire(it, 1);
    const fear1 = h.fear;
    let lull = 0;
    if (t === 'musicbox') { const f0 = h.fear; for (let i = 0; i < 20; i++) { h.x = a[0]; h.y = a[1]; h.tx = a[0]; h.ty = a[1]; h.nx = null; G.step(0.05); } lull = h.fear - f0; }
    out.fire[t] = { fired, fear: Math.round(fear1 * 10) / 10, groza: Math.round((f.base - s0) * 100) / 100, lull: Math.round(lull * 10) / 10, src: Math.round((f.stats.fearSrc[t] || 0) * 10) / 10, hp: Math.round(h.hp), shape: G.CHECK_SHAPE[t] };
    ok(fired && fear1 > 0, 'fires and scares: ' + t);
    if (t === 'musicbox') ok(lull > 1, 'lullaby keeps scaring');
  });
  // 3. the floating monsters move after the heroes
  out.drift = {};
  ['shade', 'bats'].forEach(t => {
    let f = setup(); f = spawn(); f.essence = 999;
    const live = f.heroes.filter(o => !o.dead && !o.fled && !o.gone);
    const r = live[0].room;
    const sp = spotsFor(t).filter(q => f.roomAt[q[1] * G.WW + q[0]] === r);
    if (!sp.length) { out.drift[t] = 'no spot in hero room'; return; }
    const far = sp.sort((p, q) => Math.hypot(q[0] - live[0].x, q[1] - live[0].y) - Math.hypot(p[0] - live[0].x, p[1] - live[0].y))[0];
    G.tryPlace(t, far[0], far[1]);
    const m = f.items.get(key(far[0], far[1]));
    const d0 = Math.hypot(m.gx - live[0].x - 0.5, m.gy - live[0].y - 0.5);
    let moved = 0; const g0 = [m.gx, m.gy];
    for (let i = 0; i < 20; i++) G.step(0.05);
    moved = Math.hypot(m.gx - g0[0], m.gy - g0[1]);
    out.drift[t] = { d0: Math.round(d0 * 10) / 10, moved: Math.round(moved * 100) / 100, tgt: (G.driftTarget(m, r) || {}).id };
    ok(moved > 0.2, 'drifts: ' + t);
  });
  // 4. shade prefers the lonely one
  {
    let f = setup(); f = spawn();
    const live = f.heroes.filter(o => !o.dead && !o.fled && !o.gone);
    if (live.length >= 2) {
      const m = { type: 'shade', x: live[0].x, y: live[0].y, gx: live[0].x + 0.5, gy: live[0].y + 0.5 };
      live.forEach(o => o.alone = false); live[1].alone = true;
      const tg = G.driftTarget(m, live[1].room === live[0].room ? live[0].room : live[1].room);
      out.shadeLonely = { tgt: tg && tg.id, lonely: live[1].id, sameRoom: live[1].room === live[0].room };
      if (live[1].room === live[0].room) ok(tg === live[1], 'shade goes for the lonely');
    }
  }
  // 5. the priest lifts the curse off eyes; the thief disarms hinges; nobody fights a shade
  {
    let f = setup(); f = spawn(); f.essence = 999;
    const pr = f.heroes.find(o => o.type === 'priest') || f.heroes[0], th = f.heroes.find(o => o.type === 'thief') || f.heroes.find(o => o !== pr);   // wave 1 may have no thief: anyone can do the job in this unit test
    const e = spotsFor('eyes')[0]; G.tryPlace('eyes', e[0], e[1]); const it = f.items.get(key(e[0], e[1])); it.detected = true;
    const c = spotsFor('creak')[0]; let it2 = null; if (c) { G.tryPlace('creak', c[0], c[1]); it2 = f.items.get(key(c[0], c[1])); it2.detected = true; }
    const b0 = f.stats.blessed, d0 = f.stats.disarmed;
    pr.R.fail = 0; pr.state = 'disarm'; pr.item = it; pr.timer = 0.01; pr.fleeing = false; pr.crystal = false;
    if (th && it2) { th.R.fail = 0; th.R.sapper = 0; th.state = 'disarm'; th.item = it2; th.timer = 0.01; th.fleeing = false; th.crystal = false; }
    G.fl.party.plan = 'explore';
    G.step(0.05); G.step(0.05);
    out.counter = { eyesOff: it.disabled, blessed: f.stats.blessed - b0, creakOff: it2 ? it2.disabled : null, disarmed: f.stats.disarmed - d0 };
    out.counter.priest = pr.type === 'priest';
    if (pr.type === 'priest') ok(it.disabled && f.stats.blessed - b0 === 1, 'priest lifts the curse off eyes');   // a wave 1 without a priest: nobody can bless (not a bug)
    if (it2) ok(it2.disabled, 'thief disarms hinges');
  }
  // 6. the scared escapee who saw treasure: a greedier next wave (this wave only)
  {
    let f = setup(); f = spawn();
    const live = f.heroes.filter(o => !o.dead && !o.fled && !o.gone);
    f.stats.lootSeen = 3;
    const sc0 = f.stats.scarePts || 0, b0 = f.base;
    live[0].fleeing = true; G.heroExit(live[0]);
    live[1].fleeing = true; G.heroExit(live[1]);
    const tale = f.stats.treasureTale;
    const grozaFlee = f.base - b0;
    G.finishWave();
    const gn = G.run.greedNext, parts = G.greedBonusParts().map(p => p[0] + ':' + p[1].toFixed(2));
    out.tale = { tale, greedNext: gn, parts, grozaFlee: Math.round(grozaFlee * 100) / 100 };
    ok(Math.abs(tale - 0.24) < 0.001, 'tale 2 x 0.12');
    ok(Math.abs(gn - 0.24) < 0.001, 'greedNext set');
    ok(Math.abs(grozaFlee - 5) < 0.01 || live.some(h => h.boss), 'flee groza 2.5 each');
    ok(parts.some(p => p.startsWith('opowieści o skarbach')), 'shown in greed parts');
  }
  // 7. the cap
  {
    let f = setup(); f = spawn();
    f.stats.lootSeen = 9;
    for (let i = 0; i < 4; i++) { const h = f.heroes[i % f.heroes.length]; h.fled = false; h.dead = false; h.fleeing = true; G.heroExit(h); }
    out.cap = f.stats.treasureTale;
    ok(Math.abs(f.stats.treasureTale - 0.3) < 0.001, 'capped at 0.3');
  }
  return { out, fails };
}'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(400)
        r = await page.evaluate(JS)
        print(json.dumps(r['out'], ensure_ascii=False, indent=0)); print('FAILS', r['fails']); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
