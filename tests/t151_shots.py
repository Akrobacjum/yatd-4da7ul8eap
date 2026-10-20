import asyncio, json, os
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots151/'
os.makedirs(OUT, exist_ok=True)
PLACE = r'''() => {
  const G = __yatd, key = (x, y) => x + ',' + y, NEW = ['eyes', 'bones', 'mirror', 'creak', 'coffin', 'musicbox', 'shade', 'bats', 'portrait', 'ghost'];
  NEW.forEach(t => G.run.unlocked.add(t));
  G.fl.essence = 999;
  for (let i = 0; i < 3; i++) { const m = G.toolMarkers('dig'); if (!m.length) break; G.applyTool(m[i % m.length]); G.fl.essence = 999; }
  // expand rooms so everything fits
  for (let i = 0; i < 8; i++) { const m = G.toolMarkers('expand'); if (!m.length) break; G.applyTool(m[i % m.length]); G.fl.essence = 999; }
  const spots = t => { const r = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(t, x, y)) r.push([x, y]); return r; };
  const c = spots('crate'); if (c.length) G.tryPlace('crate', c[0][0], c[0][1]);
  const placed = {};
  NEW.forEach(t => { const s = spots(t); if (!s.length) { placed[t] = null; return; } const p = s[Math.floor(s.length / 3)]; G.fl.essence = 999; placed[t] = G.tryPlace(t, p[0], p[1]) ? p : 'fail'; });
  return placed;
}'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':360,'height':760}, device_scale_factor=2)).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        # tab bar at 360 px: is any label cut?
        fit = await page.evaluate("[...document.querySelectorAll('#tabs .tab')].map(t => [t.textContent, t.clientWidth, t.scrollWidth])")
        print('tabs', fit)
        await page.click('#tab-traps'); await page.clock.run_for(200)
        await page.screenshot(path=OUT+'tray_fear0.png', clip={'x':0,'y':560,'width':360,'height':200})
        await page.evaluate("document.querySelector('#tray').scrollLeft = 2000"); await page.clock.run_for(200)
        await page.screenshot(path=OUT+'tray_fear1.png', clip={'x':0,'y':560,'width':360,'height':200})
        placed = await page.evaluate(PLACE)
        print('placed', placed)
        await page.evaluate("__yatd.setTab('traps')"); await page.clock.run_for(300)
        # zoom on each placed element
        for t, pos in placed.items():
            if not pos or pos == 'fail': continue
            await page.evaluate(f"(() => {{ const c = __yatd.cam; c.s = 56; c.ox = {pos[0]} * 56 - 150; c.oy = {pos[1]} * 56 - 150; c.manualUntil = 1e12; }})()")
            await page.clock.run_for(120)
            r = await page.evaluate(f"(() => {{ const c = __yatd.cam, cv = document.querySelector('#cv').getBoundingClientRect(); return [cv.left + ({pos[0]} + 0.5) * c.s - c.ox, cv.top + ({pos[1]} + 0.5) * c.s - c.oy, c.s]; }})()")
            cx, cy = max(80, min(280, r[0])), max(80, min(600, r[1]))
            await page.screenshot(path=OUT+f'el_{t}.png', clip={'x':cx-80,'y':cy-80,'width':160,'height':160})
        # a raid: the floating ones and the music
        await page.evaluate("__yatd.startWave(); __yatd.setTrayOpen(false)"); await page.clock.run_for(200)   # 1.08: an open tray holds the wave
        for i in range(30): await page.evaluate("__yatd.step(0.1)")
        await page.evaluate("(() => { const G = __yatd; G.fl.items.forEach(it => { if (G.SCARE[it.type] || G.DRIFT[it.type]) { it.cd = 0; G.fire(it, 1); } }); })()")
        await page.clock.run_for(100)
        await page.evaluate("(() => { const c = __yatd.cam; c.s = 30; c.manualUntil = 0; })()")
        await page.clock.run_for(300)
        await page.screenshot(path=OUT+'raid.png')
        print('errs', errs[:3])
        await b.close()
asyncio.run(main())
