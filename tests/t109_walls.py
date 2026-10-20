# 1.09 (author): standing walls are 2x high (1,7); which walls lie flat is as before (worked out for 0,85); in a wave every wall
# that would hide a room with heroes lies flat, and so do all the walls of the rooms standing between the camera and them; the
# blocks move with an ease and a pop, and stand up again after the party leaves; a thing behind a high wall is covered by it.
import asyncio
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
STATE = r'''() => { const G = __yatd, A = G.WA, n = G.WW * G.WH; let stand = 0, up = 0, lip = 0, moving = A.moving.size, maxH = 0;
  for (let i = 0; i < n; i++) { if (!A.stand || !A.stand[i]) continue; stand++; if (A.cur[i] > 1.69) up++; else if (A.cur[i] < 0.07) lip++; maxH = Math.max(maxH, A.cur[i]); }
  return { stand, up, lip, moving, maxH, sig: A.sig }; }'''
CHECK = r'''() => { const G = __yatd, A = G.WA, F = new Set(A.sig.split(':')[1].split(',').filter(Boolean).map(Number)); let bad = 0, flatHid = 0, between = new Set();
  A.occ.forEach((areas, i) => { if (areas.some(a => F.has(a))) { flatHid++; if (A.to[i] > 0.07) bad++; (A.own.get(i) || []).forEach(a => { if (!F.has(a)) between.add(a); }); } });
  let badB = 0; between.forEach(a => (A.roomWalls.get(a) || []).forEach(i => { if (A.to[i] > 0.07) badB++; }));
  return { focus: [...F], flatHid, bad, between: between.size, badB }; }'''
async def main():
    fails = []
    ok = lambda c, m: None if c else fails.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.evaluate("""(() => { const G = __yatd; for (let i = 0; i < 5; i++) { G.fl.essence = 99; const m = G.toolMarkers('dig'); if (m.length) G.applyTool(m[(i * 3) % m.length]); } G.setMode(null); })()""")
        await page.clock.run_for(800)
        s0 = await page.evaluate(STATE); print('build', s0)
        ok(s0['stand'] > 0 and s0['up'] == s0['stand'] and abs(s0['maxH'] - 1.7) < 1e-6, 'building: every standing wall is 1,7 high')
        # the cut is the old one: a wall that would hide floor at 0,85 lies flat, the rest stands
        await page.evaluate("__yatd.setTrayOpen(false)"); await page.clock.run_for(900)   # the wave view's tilt (the high one hides less)
        cov = await page.evaluate("""(() => { const G = __yatd, A = G.WA; for (let y = 1; y < G.WH; y++) for (let x = 1; x < G.WW; x++) { const i = y * G.WW + x; if (!A.stand[i]) continue;
            for (const d of [[-2, -2], [-2, -1], [-1, -2], [-3, -2], [-2, -3], [-3, -3], [-4, -3], [-3, -4]]) { const tx = x + d[0], ty = y + d[1]; if (G.fl.tiles[ty * G.WW + tx] === 2 && G.wallCovers(tx + 0.5, ty + 0.5, 1.0)) return { wall: [x, y], behind: [tx, ty], covers: true }; } }
            return null; })()""")
        print('cover', cov)
        await page.evaluate("__yatd.setTrayOpen(true)"); await page.clock.run_for(900)
        await page.evaluate("__yatd.startWave()")
        seen_focus = False; seen_pop = False
        for k in range(80):
            await page.clock.run_for(250)
            st = await page.evaluate(STATE)
            if st['moving']: 
                pp = await page.evaluate("(() => { const A = __yatd.WA; let m = 0; A.moving.forEach(i => { m = Math.max(m, A.pp[i]); }); return m; })()")
                if pp > 0: seen_pop = True
            c = await page.evaluate(CHECK)
            if c['focus'] and st['moving'] == 0:
                seen_focus = True
                ok(c['bad'] == 0, 'every wall that would hide the party lies flat (%s)' % c)
                ok(c['badB'] == 0, 'the rooms between the camera and the party lie flat whole (%s)' % c)
            if await page.evaluate("__yatd.fl.phase") != 'raid': break
            if await page.evaluate("!!(__yatd.fl.check && !__yatd.fl.check.result)"): await page.evaluate("(() => { const c = __yatd.fl.check; __yatd.resolveCheck((c.r0 + c.r1) / 2); })()")
        print('wave', st, c)
        ok(seen_focus, 'the party had open rooms at some point')
        ok(seen_pop, 'the blocks moved (with the pop)')
        # after the wave: everything stands again
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.evaluate("(() => { const G = __yatd; if (G.fl.phase === 'raid') { G.fl.heroes.forEach(h => { h.fled = true; }); } })()")
        await page.clock.run_for(3000)
        s2 = await page.evaluate(STATE); print('after', s2)
        ok(s2['moving'] == 0 and s2['up'] == s2['stand'], 'with nobody in, every standing wall is up again')
        if cov: ok(cov['covers'], 'a thing right behind a high wall is drawn under it')
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
