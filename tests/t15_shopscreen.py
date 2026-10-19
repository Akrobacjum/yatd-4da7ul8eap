import asyncio
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots15/'
RUNW = r'''() => { const G = __yatd; let g = 0; while (g++ < 40000) { const f = G.fl; if (G.modalKind) return G.modalKind;
    if (f.check) { if (!f.check.result) G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); continue; } if (f.phase !== 'raid') return f.phase; G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } } return 'guard'; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); let n=0; for (const q of P) if (n<4 && G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); n++; } })()")
        await page.click('#btn-action'); await page.clock.run_for(300)
        print('end', await page.evaluate(RUNW))
        await page.clock.run_for(500)
        if await page.query_selector('#settle-next'): await page.clock.run_for(4000); await page.click('#settle-next'); await page.clock.run_for(400)   # 1.02: the settle screen waits for Dalej
        print('btn', await page.evaluate("document.querySelector('#wave-next') ? document.querySelector('#wave-next').innerText : null"))
        await page.click('#wave-next'); await page.clock.run_for(500)
        print('modal', await page.evaluate("__yatd.modalKind"))
        await page.screenshot(path=OUT+'shop_screen.png')
        await page.click('#shop-close'); await page.clock.run_for(300)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.click('#tab-deck'); await page.clock.run_for(200)
        print('build tiles', await page.evaluate("[...document.querySelectorAll('#tray .dslot')].map(e => e.innerText.replace(/\\n/g,' ')).join(' | ')"))
        await page.click('#btn-action'); await page.clock.run_for(800)
        await page.evaluate("__yatd.setTrayOpen && __yatd.setTrayOpen(true)"); await page.evaluate("__yatd.setTab('deck')"); await page.clock.run_for(300)
        print('raid tiles', await page.evaluate("[...document.querySelectorAll('#tray .dslot')].map(e => e.innerText.replace(/\\n/g,' ')).join(' | ')"))
        await page.screenshot(path=OUT+'raid_deck.png')
        print('errs', errs[:3])
        await b.close()
asyncio.run(main())
