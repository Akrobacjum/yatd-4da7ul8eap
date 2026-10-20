# 1.03: split screen. Two groups far apart on the author's 73x41 dungeon: the screen splits along the line between them,
# each half shows its group, a tap maps to the right half, and the halves join again when the groups meet.
import asyncio, json, sys, glob, re, math
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
src = open(SC + 'test/replay101.py').read()
JS = re.search(r'JS = r"""(.*?)"""', src, re.S).group(1)
SETUP = JS[:JS.index('  G.startWave();\n')] + '  G.startWave(); return 1;\n}'
doc = json.load(open(SC + 'real103/waves/mvf7u7ufx25j_16.json')); prev = json.load(open(SC + 'real103/waves/mvf7u7ufx25j_15.json'))['summary']
OUT = SC + 'shots103/'
FAILS = []
def ok(c, m):
    if not c: FAILS.append(m)
# 1.04: the heroes are held on their spots (re-placed every 50 ms): the camera is what is tested, not where the party walks
TELE = """(spots) => { const G = __yatd, f = G.fl; const hs = f.heroes.filter(h => !h.dead && !h.fled && !h.gone);
  window.__hold = spots; if (!window.__holdOn) window.__holdOn = setInterval(() => { const sp = window.__hold; if (!sp) return;
    __yatd.fl.heroes.filter(h => !h.dead && !h.fled && !h.gone).forEach((h, i) => { const s = sp[i % sp.length]; h.x = h.tx = s[0]; h.y = h.ty = s[1]; h.nx = null; h.ny = null; h.prog = 0; h.path = []; }); }, 50);
  hs.forEach((h, i) => { const s = spots[i % spots.length]; h.x = h.tx = s[0]; h.y = h.ty = s[1]; h.nx = null; h.ny = null; h.prog = 0; h.path = []; h.needPlan = true; h.state = 'rest'; h.restUntil = f.time + 60; });
  return hs.length; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto('file://' + SC + 'test/page15.html'); await page.clock.run_for(500)
        await page.evaluate(SETUP, [doc, 0, [0, 1], 0.9, prev, {}, 'v12', [1.0, 1.0, []], ['gauss', 0.037, 1.9]])
        # let everyone come in, answer checks
        for i in range(60):
            await page.evaluate("(() => { const G = __yatd, f = G.fl; if (f.check && !f.check.result) { G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); } })()")
            await page.clock.run_for(100)
            if await page.evaluate("__yatd.fl.queue.length === 0 && __yatd.fl.heroes.length > 0"): break
        # floor tiles far apart: the leftmost and the rightmost room floors
        spots = await page.evaluate("""(() => { const G = __yatd, f = G.fl; const fl0 = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.walkable(x, y) && G.roomOf(x, y) >= 0 && f.rooms[G.roomOf(x, y)].kind === 'room') fl0.push([x, y]);
          fl0.sort((a, b) => a[0] - b[0]); const L = fl0.slice(0, 3), R = fl0.slice(-3); return [L, R, fl0[Math.floor(fl0.length / 2)]]; })()""")
        L, R, mid = spots
        print('left', L[0], 'right', R[0], 'map', await page.evaluate("[__yatd.WW, __yatd.WH]"))
        n = await page.evaluate(TELE, [L[0], R[0], L[1], R[1], L[2], R[2]])
        print('heroes', n)
        ks = []
        for i in range(25):
            await page.evaluate("(() => { const G = __yatd, f = G.fl; if (f.check && !f.check.result) { G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); } })()")
            await page.clock.run_for(100); ks.append(round(await page.evaluate("__yatd.SPLIT.k"), 2))
        st = await page.evaluate("""(() => { const G = __yatd, S = G.SPLIT, V = G.splitViews(); const hs = G.fl.heroes.filter(h => !h.dead && !h.fled && !h.gone);
          const scr = hs.map(h => { const p = G.heroScreen(h); return [Math.round(p.x), Math.round(p.y), S.gid.get(h.id)]; });
          const c = document.querySelector('canvas'), cw = c.clientWidth, ch = c.clientHeight, side = (x, y) => ((x - cw / 2) * Math.cos(S.ang) + (y - ch / 2) * Math.sin(S.ang)) > 0 ? 1 : 0;
          const sides = hs.map(h => { const p = G.heroScreen(h); return side(p.x, p.y) === S.gid.get(h.id); });
          return { k: S.k, want: S.want, ang: S.ang, s: V ? V.map(v => +v.s.toFixed(1)) : null, mainS: G.cam.s, scr, sides, fit: 0 }; })()""")
        print('k over time', ks); print(st)
        ok(st['k'] > 0.95 and st['want'], 'split on')
        # 1.07 (isometric camera): the cut is square to the line between the groups ON THE SCREEN (where the main camera has them)
        la = await page.evaluate("(sp) => { const G = __yatd, m = q => q.reduce((a, t) => [a[0] + t[0] / q.length, a[1] + t[1] / q.length], [0, 0]); const a = m(sp[0]), b = m(sp[1]); const pa = G.w2s(a[0] + 0.5, a[1] + 0.5, 0.5), pb = G.w2s(b[0] + 0.5, b[1] + 0.5, 0.5); return Math.atan2(pb[1] - pa[1], pb[0] - pa[0]); }", [L, R])
        print('line between the groups on the screen', round(math.degrees(la)), 'cut normal', round(math.degrees(st['ang'])))
        ok(abs(math.cos(st['ang'] - la)) > 0.9, 'line square to the groups (the cut across the line between them)')
        ok(st['s'] and st['s'][0] > st['mainS'] * 1.5, 'halves zoomed in more than one screen would be')
        ok(all(0 <= x <= 390 and 0 <= y <= 844 for x, y, g in st['scr']), 'every hero on the screen')
        ok(all(st['sides']), 'each group in its own half')
        # a tap on each group's figure maps to that group's spot of the floor
        w = await page.evaluate("(scr) => scr.map(q => __yatd.toWorld(q[0], q[1]))", [st['scr'][0], st['scr'][1]])
        print('taps ->', w)
        near = lambda q, spots: min(abs(q['x'] - (t[0] + 0.5)) + abs(q['y'] - (t[1] + 0.5)) for t in spots) < 3
        ok(all(near(q, L) or near(q, R) for q in w) and near(w[0], L) != near(w[1], L), 'taps map to the right half')
        await page.evaluate("document.querySelectorAll('#toast,#hint').forEach(e => e.hidden = true)")
        await page.screenshot(path=OUT + 'split_lr.png')
        # diagonal: one group top-left, the other bottom-right
        diag = await page.evaluate("""((LA) => { const G = __yatd, f = G.fl; const fl0 = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.walkable(x, y) && G.roomOf(x, y) >= 0 && f.rooms[G.roomOf(x, y)].kind === 'room') fl0.push([x, y]);
          let best = null, bs = -1e9; for (let i = 0; i < fl0.length; i += 2) for (let j = 0; j < fl0.length; j += 2) { const dx = fl0[j][0] - fl0[i][0], dy = fl0[j][1] - fl0[i][1], du = (dx - dy) * 0.707, dv = (dx + dy) * 0.354; if (dv <= 0) continue; let da = Math.abs(Math.atan2(dv, du) - LA) % Math.PI; da = Math.min(da, Math.PI - da); if (da < 0.5) continue; const sc = Math.max(Math.abs(du) / 342, dv / 478); if (sc > bs) { bs = sc; best = [fl0[i], fl0[j]]; } } const near = (p) => fl0.filter(q => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) <= 2).slice(0, 3); return [near(best[0]), near(best[1])]; })(""" + str(la) + """)""")
        await page.evaluate(TELE, [diag[0][0], diag[1][0], diag[0][1], diag[1][1], diag[0][2], diag[1][2]])
        for i in range(30):
            await page.evaluate("(() => { const G = __yatd, f = G.fl; if (f.check && !f.check.result) { G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); } })()")
            await page.clock.run_for(100)
        a2 = await page.evaluate("__yatd.SPLIT.ang")
        want = await page.evaluate("(sp) => { const G = __yatd, m = q => q.reduce((a, t) => [a[0] + t[0] / q.length, a[1] + t[1] / q.length], [0, 0]); const a = m(sp[0]), b = m(sp[1]); const pa = G.w2s(a[0] + 0.5, a[1] + 0.5, 0.5), pb = G.w2s(b[0] + 0.5, b[1] + 0.5, 0.5); return Math.atan2(pb[1] - pa[1], pb[0] - pa[0]); }", [diag[0], diag[1]])
        print('second pair: cut', round(math.degrees(a2)), 'between the groups on the screen', round(math.degrees(want)), diag[0][0], diag[1][0])
        k2 = await page.evaluate("__yatd.SPLIT.k"); print('second pair split', k2)
        ok(k2 > 0.9 and abs(math.cos(a2 - want)) > 0.93, 'the cut follows the line between the groups')
        await page.screenshot(path=OUT + 'split_diag.png')
        # together again: everyone in the middle room
        await page.evaluate(TELE, [mid, mid, mid])
        ks = []
        for i in range(30):
            await page.evaluate("(() => { const G = __yatd, f = G.fl; if (f.check && !f.check.result) { G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); } })()")
            await page.clock.run_for(100); ks.append(round(await page.evaluate("__yatd.SPLIT.k"), 2))
        print('merging', ks[::3])
        ok(ks[-1] == 0, 'one screen again')
        await page.screenshot(path=OUT + 'split_merged.png')
        # the setting turns it off
        await page.evaluate("__yatd.S.split = 0"); await page.evaluate(TELE, [L[0], R[0], L[1], R[1], L[2], R[2]])
        for i in range(20): await page.clock.run_for(100)
        ok(await page.evaluate("__yatd.SPLIT.k") == 0, 'setting off: no split')
        print('FAILS', FAILS); print('errs', errs[:3]); await b.close()
asyncio.run(main())
