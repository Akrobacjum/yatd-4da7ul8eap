import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/look/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':360,'height':780}, device_scale_factor=2)).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.evaluate("(() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal(); })()")
        await page.clock.run_for(300)
        fails = []
        # spending: the number goes down with a red flash and a -N
        s0 = await page.evaluate("document.querySelector('#h-score').textContent")
        await page.evaluate("(() => { const G = __yatd; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('spikes', x, y)) { G.tryPlace('spikes', x, y); return; } })()")
        await page.clock.run_for(50)
        d = await page.evaluate("({ cls: document.querySelector('#h-score').className, fl: [...document.querySelectorAll('.floater')].map(f => f.className + ':' + f.textContent), ess: Math.floor(__yatd.fl.essence) })")
        print('spend', s0, d)
        if 'down' not in d['cls'] or not any('spend' in f for f in d['fl']): fails.append('spend shows')
        await page.clock.run_for(1500)
        s1 = await page.evaluate("document.querySelector('#h-score').textContent")
        if s1 != str(d['ess']): fails.append('score settles on the value: ' + s1)
        # the wave banner
        await page.evaluate("__yatd.startWave(); __yatd.setTrayOpen(false)"); await page.clock.run_for(100)   # 1.08: an open tray holds the wave
        bn = await page.evaluate("(() => { const b = document.querySelector('#banner'); return [b.hidden, b.className, b.innerText]; })()")
        print('banner', bn)
        if bn[0] or 'Fala' not in bn[2]: fails.append('banner')
        await page.clock.run_for(2500)
        if not await page.evaluate("document.querySelector('#banner').hidden"): fails.append('banner goes away')
        # gains: orbs fly to the score, it counts up and glows, +N rises
        got = None
        for i in range(400):
            await page.evaluate("(() => { const G = __yatd, f = G.fl; if (f.check) { if (!f.check.result) G.resolveCheck((f.check.g0 + f.check.g1) / 2); G.clearCheck(); } })()")
            await page.clock.run_for(50)
            st = await page.evaluate("(() => { const c = document.querySelector('#fx'), x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 3; k < x.length; k += 16) if (x[k] > 0) n++; return { px: n, cls: document.querySelector('#h-score').className, fl: document.querySelectorAll('.floater:not(.spend)').length, score: __yatd.fl.score }; })()")
            if st['px'] > 0 and got is None: got = st; await page.screenshot(path=OUT + 'anim_orbs.png')
            if st['fl'] and 'up' in st['cls'] and got: break
        print('gain', got, st)
        if not got: fails.append('orbs drawn on the page canvas')
        if not st['fl']: fails.append('+N floater')
        # a crystal goes missing in a wave: shake + red flash
        await page.evaluate("__yatd.run.crystals -= 1"); await page.clock.run_for(60)
        al = await page.evaluate("[document.querySelector('#h-cry').className, document.querySelector('#stage').className]")
        print('alarm', al)
        if 'lost' not in al[0] or 'alarm' not in al[1]: fails.append('crystal alarm')
        # the wave summary: the big number counts up
        await page.evaluate("(() => { const G = __yatd; G.fl.score = 57; G.openModal({ type: 'wave' }); })()")
        await page.clock.run_for(100)
        a = await page.evaluate("document.querySelector('#card .scr-big b').textContent")
        await page.clock.run_for(1200)
        z = await page.evaluate("document.querySelector('#card .scr-big b').textContent")
        print('count', a, z)
        if z != '+57' or a == z: fails.append('count up')
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
