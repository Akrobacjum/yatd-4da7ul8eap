import asyncio
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); let n=0; for (const q of P) if (n<3 && G.canPlace('spikes', q[0], q[1])) { G.fl.essence += 5; G.tryPlace('spikes', q[0], q[1]); n++; } })()")
        await page.click('#btn-action'); await page.clock.run_for(500)
        await page.evaluate("(() => { const b = document.querySelector('#unspent-go'); if (b) b.click(); })()")   # 1.24 D: past the question about unspent Esencja
        cv = await page.evaluate("(() => { const r=document.querySelector('canvas').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height*0.6]; })()")
        # hold with no check
        for i in range(40):
            if not await page.evaluate("!!(__yatd.fl.check)"): break
            await page.evaluate("__yatd.skipCheck(); __yatd.clearCheck()")
        await page.mouse.move(cv[0], cv[1]); await page.mouse.down(); await page.clock.run_for(1000)
        print('ff while held', await page.evaluate("__yatd.ff"), 'check', await page.evaluate("!!__yatd.fl.check"))
        t0 = await page.evaluate("__yatd.fl.time"); await page.clock.run_for(2000); t1 = await page.evaluate("__yatd.fl.time")
        print('game time per 2 s real held', round(t1-t0,2), 'autoFires', await page.evaluate("__yatd.fl.stats.autoFires||0"))
        await page.mouse.up(); await page.clock.run_for(300)
        print('ff after release', await page.evaluate("__yatd.ff"))
        # wait for a check, then tap
        for i in range(400):
            await page.clock.run_for(100)
            c = await page.evaluate("(() => { const c=__yatd.fl.check; return c ? { res: !!c.result, warn: c.warn||0, t: c.t||0, shape: c.shape } : null; })()")
            if c and not c['res']:
                await page.clock.run_for(700)
                c = await page.evaluate("(() => { const c=__yatd.fl.check; return c ? { res: !!c.result, warn: c.warn, keys: Object.keys(c).join(',') } : null; })()")
                print('check before tap', c)
                await page.mouse.click(cv[0], cv[1]); await page.clock.run_for(50)
                print('after tap', await page.evaluate("(() => { const c=__yatd.fl.check; return c ? { res: c.result || null } : null; })()"))
                break
        print('errs', errs[:3])
        await b.close()
asyncio.run(main())
