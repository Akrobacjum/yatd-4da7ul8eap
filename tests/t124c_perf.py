# 1.24 Part C: the author's addendum 2 (the shaman's heals shown as "+N" floats merged per second and paying a trace of Groza on its
# card; the gate closes only with a hero at most 1 tile from the door) and the optimisation (frame pacing: the running raid at most 60
# frames a second also on a 120 Hz display, building 30, still when nothing moves and nothing was touched for 2 s with the endless CSS
# decorations paused, woken at once by a tap; a test hook wakes it too).
# The frame-time numbers and the picture-by-picture comparison are in e124/c (perf.py, vis.py, determ.py; CHANGES124.md Part C).
# Prints FAILS [...] and exits 1 on any. (--only=shaman,gate,pace,hz)
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t118_cards.py').read().split('# ---------- 1.')[0])   # LIB (T.fresh, T.place, ...)
PAGE = 'test/page15.html'
ONLY = None
for a in sys.argv[1:]:
    if a.startswith('--only='): ONLY = a[7:].split(',')
FAILS = []
def ok(c, m):
    if not c: FAILS.append(m)
SHAMAN = r"""() => { const { G, key } = T, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  let sh = null, gob = null;
  for (let n = 0; n < 12 && !gob; n++) {
    T.fresh(5); const R = T.rooms()[0], sp = T.floorSpots(R, 'shaman');
    for (const s of sp) { const nb = sp.filter(q => Math.max(Math.abs(q[0] - s[0]), Math.abs(q[1] - s[1])) === 1); if (!nb.length) continue; sh = T.place('shaman', s); gob = sh && T.place('goblin', nb[0]); if (gob) break; if (sh) { G.fl.items.delete(key(s[0], s[1])); sh = null; } }
  }
  ok(sh && gob, 'a shaman and a goblin next to it'); if (!gob) return { fails, out };
  G.run.next = G.makeWave(4); G.startWave(); const f = G.fl;
  gob.hp = gob.max * 0.5; const hp0 = gob.hp, base0 = f.base, prov0 = f.prov || 0, fl0 = G.floats.length;
  for (let i = 0; i < 10; i++) G.monstersTick(0.05);   // 0,5 s: healed, nothing shown yet
  ok(Math.abs(gob.hp - hp0 - 8 * 0.5) < 1e-6, 'the heal itself unchanged (8 HP/s): ' + (gob.hp - hp0));
  ok(!G.floats.some(x => /^\+\d+$/.test(x.text)), 'no float before a second');
  f.time += 1.0; G.monstersTick(0.05);   // a second later: one merged float
  const fs = G.floats.filter(x => /^\+\d+$/.test(x.text));
  out.float = fs.map(x => [x.text, x.color]);
  ok(fs.length === 1 && fs[0].text === '+' + Math.round(8 * 0.5) && fs[0].color === '#7fe08a' && Math.abs(fs[0].x - (gob.x + 0.5)) < 0.01, 'one green "+N" over the goblin, merged: ' + JSON.stringify(out.float));
  const hl = sh.w ? sh.w.hl : 0, g = f.base - base0, want = G.SHAMAN_GZ * hl / gob.max;   // the heals of the second before (with the showing tick's own when the shaman comes first in the list)
  out.groza = g; out.healed = hl;
  ok((Math.abs(hl - 4) < 1e-6 || Math.abs(hl - 4.4) < 1e-6) && Math.abs(g - want) < 1e-9, 'Groza 0,02 x healed / max: ' + g + ' vs ' + want);
  ok(f.byType.shaman && f.byType.shaman.passivePts > 0 && sh.w && sh.w.p > 0 && Math.abs(sh.w.hl - hl) < 1e-9, 'the shaman is credited (passivePts, its card)');
  ok(Math.abs((f.stats.shamanHeal || 0) - hl) < 1e-9, 'stats.shamanHeal');
  // the big heal (its check): 60 HP at once, shown in the next second's float
  gob.hp = 10; const exp = Math.min(gob.max, 70) - 10; G.fire(sh, 1); out.big = [gob.hp, gob.max]; ok(Math.abs(gob.hp - 10 - exp) < 1e-6, 'Wielkie leczenie heals 60 as before: ' + gob.hp);
  f.time += 1.1; G.monstersTick(0.05);
  ok(G.floats.some(x => x.text === '+' + Math.round(exp + 0.4)), 'the big heal shows +' + Math.round(exp + 0.4) + ': ' + JSON.stringify(G.floats.map(x => x.text)));
  // a full monster gets nothing (no float, no Groza)
  gob.hp = gob.max; const b1 = f.base; for (let i = 0; i < 30; i++) G.monstersTick(0.05); f.time += 1.1; G.monstersTick(0.05);
  ok(f.base === b1, 'nothing for a full monster');
  // the wave ends: the card says how much it healed
  G.alive().forEach(h => { h.hp = 0; h.dead = true; }); G.finishWave(); while (G.modalKind) G.closeModal();
  out.lhl = sh.lhl; out.line = G.healLine(sh);
  ok(sh.lhl >= 40 && /Wyleczył potworom \d+ HP\./.test(G.healLine(sh)), 'the card line: ' + G.healLine(sh));
  return { fails, out }; }"""
GATE = r"""() => { const { G, key } = T, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  let gate = null, P = null;
  for (let n = 0; n < 12 && !gate; n++) { T.fresh(5); P = G.shortestPath(); for (let k = 3; k < P.length - 3 && !gate; k++) if (G.canPlace('gate', P[k][0], P[k][1])) { gate = T.place('gate', P[k]); if (gate) { out.k = k; } } }
  ok(gate, 'a gate on the way'); if (!gate) return { fails, out };
  const k = out.k;
  G.run.next = G.makeWave(4); G.startWave(); const f = G.fl; T.stepS(2.5); const h = G.alive()[0]; G.alive().slice(1).forEach(o => T.put(o, G.fl.ent.x, G.fl.ent.y));
  const at = (i, path, nx) => { T.put(h, P[i][0], P[i][1]); h.state = 'walk'; h.path = path; if (nx) { h.nx = nx[0]; h.ny = nx[1]; h.prog = 0.2; } gate.cd = 0; return G.checkWanted(gate); };
  out.two = at(k - 2, [P[k - 1], P[k], P[k + 1]]);
  out.twoMoving = at(k - 2, [P[k], P[k + 1]], P[k - 1]);   // stepping to the tile before the door (half way): still 2 tiles from it
  out.one = at(k - 1, [P[k], P[k + 1]]);
  out.into = at(k - 1, [P[k + 1]], P[k]);
  out.on = at(k, [P[k + 1]]);
  out.oneAway = at(k - 1, [P[k - 2]]);   // next to it but going the other way
  ok(!out.two && !out.twoMoving, 'two steps away: the gate waits (was: closes) ' + JSON.stringify(out));
  ok(out.one && out.into && out.on, 'next to it going in, stepping in, in the doorway: it closes ' + JSON.stringify(out));
  ok(!out.oneAway, 'next to it going away: no');
  return { fails, out }; }"""
async def page_new(b, w=390, h=844):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=3)
    p = await ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    await p.goto('file://' + SC + PAGE); await p.wait_for_timeout(600)
    return ctx, p, errs
FP = "(() => { const F = __yatd.FP; return { iv: F.iv, drawn: F.drawn, modes: Object.assign({}, F.modes), still: document.documentElement.classList.contains('still') }; })()"
async def pace(b):
    ctx, p, errs = await page_new(b); out = {}
    await p.evaluate(LIB); await p.evaluate("(() => { T.fresh(5); })()")
    await p.wait_for_timeout(2600)   # building, nothing touched for 2 s
    a = await p.evaluate(FP); await p.wait_for_timeout(1500); c = await p.evaluate(FP)
    out['build idle'] = [a, c]
    ok(a['iv'] == 1000 and c['iv'] == 1000 and c['drawn'] == a['drawn'] and a['still'], 'building idle: still, nothing drawn in 1,5 s, html.still: %s' % [a, c])
    anim = await p.evaluate("(() => { const n = document.querySelector('#stage'); return getComputedStyle(n, '::before').animationPlayState; })()")
    ok(anim == 'paused', 'the candle light stands still: %s' % anim)
    await p.mouse.click(200, 500); await p.wait_for_timeout(20); d = await p.evaluate(FP)
    ok(d['iv'] < 40 and not d['still'] and d['drawn'] > c['drawn'], 'a tap wakes it at once: %s' % d)
    await p.mouse.move(200, 500); await p.wait_for_timeout(600); e1 = await p.evaluate(FP); await p.wait_for_timeout(1000); e2 = await p.evaluate(FP)
    n = e2['drawn'] - e1['drawn']; out['build calm 1 s'] = n
    ok(e1['iv'] > 30 and 24 <= n <= 34, 'building after a tap: about 30 frames a second (%d)' % n)
    # the running raid: 60 (the headless display is 60 Hz)
    await p.evaluate("(() => { const G = __yatd; G.run.next = G.makeWave(4); G.startWave(); G.setTrayOpen(false); })()")
    await p.wait_for_timeout(2500); r1 = await p.evaluate(FP); await p.wait_for_timeout(1000); r2 = await p.evaluate(FP)
    out['raid 1 s'] = r2['drawn'] - r1['drawn']
    ok(r1['iv'] < 17 and 35 <= r2['drawn'] - r1['drawn'] <= 62, 'the raid runs at up to 60: %s' % out['raid 1 s'])
    # paused (the tray open): 30, then still
    await p.evaluate("__yatd.setTrayOpen(true, true)"); await p.wait_for_timeout(700); s1 = await p.evaluate(FP); await p.wait_for_timeout(500); s2 = await p.evaluate(FP)
    out['paused 0,5 s'] = s2['drawn'] - s1['drawn']
    ok(s1['iv'] > 30 and s2['drawn'] - s1['drawn'] <= 18, 'paused: 30 a second at most (%d in 0,5 s)' % (s2['drawn'] - s1['drawn']))
    await p.wait_for_timeout(2500); s3 = await p.evaluate(FP)
    ok(s3['iv'] == 1000 and s3['still'], 'paused and untouched: still %s' % s3)
    # a hook call (a test changing the state) wakes it and gets drawn
    await p.evaluate("(() => { const G = __yatd; G.cam.s *= 0.9; })()"); await p.wait_for_timeout(100); s4 = await p.evaluate(FP)
    ok(s4['drawn'] > s3['drawn'], 'a test hook wakes the loop: %s' % s4)
    ok(not errs, 'page errors %s' % errs[:2])
    await ctx.close(); return out
async def hz(b):
    ctx, p, errs = await page_new(b)
    await p.evaluate(LIB); await p.evaluate("(() => { T.fresh(5); const G = __yatd; G.run.next = G.makeWave(4); G.startWave(); G.setTrayOpen(false); })()"); await p.wait_for_timeout(2500)
    r = await p.evaluate("""(() => { const G = __yatd, F = G.FP; let t = performance.now() + 1000; const d0 = F.drawn, t0 = G.fl.time;
      for (let i = 0; i < 120; i++) { t += 1000 / 120; G.frame(t); }   // one second of a 120 Hz display
      const a = F.drawn - d0, gt = G.fl.time - t0;
      return [a, gt]; })()""")
    ok(55 <= r[0] <= 61, 'a 120 Hz display: 60 frames a second drawn (%s)' % r)
    ok(not errs, 'page errors %s' % errs[:2])
    await ctx.close(); return {'120 Hz: frames drawn in 1 s, game time': r}

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={'width': 900, 'height': 760}); p = await ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        await p.goto('file://' + SC + PAGE); await p.wait_for_timeout(500); await p.evaluate(LIB)
        for nm, js in [('shaman', SHAMAN), ('gate', GATE)]:
            if ONLY and nm not in ONLY: continue
            r = await p.evaluate(js); FAILS.extend(nm + ': ' + f for f in r['fails']); print(nm, json.dumps(r['out']))
        ok(not errs, 'page errors %s' % errs[:2]); await ctx.close()
        if not ONLY or 'pace' in ONLY: print('pace', json.dumps(await pace(b)))
        if not ONLY or 'hz' in ONLY: print('hz', json.dumps(await hz(b)))
        await b.close()
    print('FAILS', FAILS)
    sys.exit(1 if FAILS else 0)
asyncio.run(main())
