import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots151/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for W in [360, 412]:
            page = await (await b.new_context(viewport={'width':W,'height':780}, device_scale_factor=2)).new_page()
            errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
            await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
            await page.click('#start-play'); await page.clock.run_for(400)
            while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
            await page.screenshot(path=OUT+f'hud_build_{W}.png', clip={'x':0,'y':0,'width':W,'height':150})
            fit = await page.evaluate("(() => { const r = document.querySelector('#h-eq').getBoundingClientRect(); return { l: r.left, r: r.right, sw: document.documentElement.scrollWidth, kids: [...document.querySelectorAll('#h-eq > *')].filter(e => !e.hidden).map(e => Math.round(e.getBoundingClientRect().right)) }; })()")
            print(W, 'fit', fit)
            # place spikes and arrows on the path, start the wave, wait for a burst
            await page.evaluate("""(() => { const G = __yatd; G.fl.essence = 99; const P = G.shortestPath(); let n = 0;
              for (const q of P.slice(2)) { if (n >= 3) break; if (G.canPlace('spikes', q[0], q[1]) && G.tryPlace('spikes', q[0], q[1])) n++; }
              G.startWave(); })()""")
            got = None
            for i in range(400):
                await page.evaluate("__yatd.step(0.05)")
                st = await page.evaluate("(() => { const f = __yatd.fl; if (f.check) { __yatd.resolveCheck(0.5); } return f.chain ? [f.chain.g, f.chain.cm, f.time - f.chain.last] : null; })()")
                if st and st[2] < 0.3 and st[0] > 0.05: got = st; break
            await page.clock.run_for(120)
            print(W, 'burst', got, await page.evaluate("[...document.querySelectorAll('#h-eq .eq b')].map(b => b.textContent).join(' | ')"))
            await page.screenshot(path=OUT+f'hud_raid_{W}.png', clip={'x':0,'y':0,'width':W,'height':150})
            await page.click('#h-eq'); await page.clock.run_for(300)
            print(W, 'modal', await page.evaluate("__yatd.modalKind"))
            await page.screenshot(path=OUT+f'esencja_modal_{W}.png')
            print('errs', errs[:3])
            await page.close()
        await b.close()
asyncio.run(main())
