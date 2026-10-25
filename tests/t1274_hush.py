# 1.27.4: Głusza nerf (fear x1,1; a lost hero in a Głusza finds his way after 8 s; a lost one gets the way home once patience is
# over) and the long-wave report (at 4 min of a wave, then every 2 min: LONG_DOCS + the waves/<run>_<wave>_long<n> log).
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])
RUN = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(5); const rs = T.rooms(); const R = T.setRoom(rs[0], { rt: 'hush' });
  const f = T.raid(['warrior', 'thief']); const [w, th] = G.alive(); const tl = T.walkT(R);
  // fear in a Głusza: x1,1 (fog x1,15)
  T.put(th, tl[0][0], tl[0][1]); th.fear = 0; th.courage = 1e5; const a0 = th.fear; G.addFear(th, 10, null, 'test'); out.hushFear = Math.round((th.fear - a0) * 100) / 100;
  const R2 = T.room(rs[1]); const t2 = T.walkT(R2); T.put(w, t2[0][0], t2[0][1]); const b0 = w.fear; G.addFear(w, 10, null, 'test'); out.plainFear = Math.round((w.fear - b0) * 100) / 100;
  ok(Math.abs(out.hushFear / out.plainFear - 1.1) < 0.02, 'Głusza fear x1,1: ' + JSON.stringify([out.hushFear, out.plainFear]));
  // lost in a Głusza: found after 8 s
  T.put(th, tl[0][0], tl[0][1]); th.lost = true; th.lostT = 0; th.lostCallT = f.time + 99; th.hushLostT = 0; th.state = 'wait'; th.timer = 99;
  let tf = -1; for (let i = 0; i < 240 && tf < 0; i++) { th.state = 'wait'; th.timer = 99; th.lostCallT = f.time + 99; G.partyThink(0.05); f.time += 0.05; if (!th.lost) tf = Math.round(i * 0.05 * 10) / 10; }
  out.found = tf; ok(tf >= 7.5 && tf <= 9, 'lost in a Głusza: finds the way after about 8 s: ' + tf);
  ok((f.stats.hushFound || 0) === 1, 'stats.hushFound');
  // a lost one gets the way home once patience is over (not exiting, not exhausted)
  T.put(w, t2[0][0], t2[0][1]); w.lost = true; w.homeRun = false; w.homeBest = null; f.patT = G.S.waveTime + 1; f.exhausted = false; w.plan = 'explore';
  for (let i = 0; i < 200; i++) { G.homeRunTick(0.05); f.time += 0.05; w.lost = true; }
  out.hr = { homeRun: !!w.homeRun, st: f.stats.homeRun }; ok(w.homeRun, 'a lost hero after patience gets the way home: ' + JSON.stringify(out.hr));
  // the long-wave report
  const n0 = G.LONG_DOCS.length; f.patT = 10; f.time = 239.9; G.step(0.05); G.step(0.05);
  const d = G.LONG_DOCS[G.LONG_DOCS.length - 1]; out.long = d && { kind: d.kind, n: d.n, t: d.t, heroes: d.heroes.length, keys: Object.keys(d.heroes[0]).length, layout: !!d.layout, bytes: JSON.stringify(d).length };
  ok(G.LONG_DOCS.length === n0 + 1 && d && d.kind === 'long' && d.heroes.length >= 2 && d.layout, 'a report at 4 min: ' + JSON.stringify(out.long));
  ok(d && JSON.stringify(d).length < 230000, 'small enough for the log');
  G.step(0.05); ok(G.LONG_DOCS.length === n0 + 1, 'one report, not one a step');
  f.time = 360; G.step(0.05); ok(G.LONG_DOCS.length === n0 + 2 && G.LONG_DOCS[G.LONG_DOCS.length - 1].n === 2, 'the next one 2 min later');
  return { fails, out }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); fails = []
        ctx, pg, errs = await fresh_page(b)
        r = await pg.evaluate(RUN); print(json.dumps(r['out'])); fails += r['fails']
        # the card text
        t = await pg.evaluate("__yatd.ITEMS.r_hush.more"); print('more:', t)
        if '+10%' not in t or '8 s' not in t: fails.append('card text: ' + t)
        fails += ['page error: ' + e for e in errs]
        await ctx.close(); await b.close()
        print('FAILS', fails); sys.exit(1 if fails else 0)
asyncio.run(main())
