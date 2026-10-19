import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
ST = "(() => { const G = __yatd; return { tut: G.run.tut, tutorial: G.run.tutorial, wave: G.run.wave, phase: G.fl.phase, modal: G.modalKind, coach: document.querySelector('#coach').hidden ? null : document.querySelector('#coach').innerText.slice(0, 50), save: !!localStorage.getItem('yatd12-save') }; })()"
async def boot(page):
    await page.goto(BASE); await page.wait_for_timeout(700)
async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':390,'height':844})
        page = await ctx.new_page(); errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await boot(page)
        await page.click('#start-tut'); await page.wait_for_timeout(500)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        # move on two steps: step 0 has Dalej, step 1 (move) can be skipped by advancing the counter like the player would
        await page.evaluate("document.querySelector('#coach .next') && document.querySelector('#coach .next').click()"); await page.wait_for_timeout(300)
        s1 = await page.evaluate(ST); print('in tutorial', s1)
        await page.evaluate("__yatd.fl.essence -= 0")   # nothing
        await page.wait_for_timeout(1000)   # the save is written 0,7 s after a change; a build start saves at once
        await page.evaluate("(() => { const G = __yatd; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('spikes', x, y)) { G.tryPlace('spikes', x, y); return; } })()")
        await page.wait_for_timeout(1000)
        s2 = await page.evaluate(ST); print('after a placement', s2)
        if not s2['save']: fails.append('a tutorial run is saved')
        # close and come back
        await boot(page)
        lbl = await page.evaluate("document.querySelector('#start-continue') ? document.querySelector('#start-continue').innerText : null")
        sub = await page.evaluate("document.querySelector('#start-tut').innerText")
        print('start screen', lbl, '|', sub)
        if not lbl or 'Kontynuuj samouczek' not in lbl: fails.append('start offers to continue the tutorial')
        if 'przepadnie' not in sub: fails.append('starting the tutorial over a save warns')
        await page.click('#start-continue'); await page.wait_for_timeout(800)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.wait_for_timeout(300)
        s3 = await page.evaluate(ST); print('resumed', s3)
        if s3['tut'] != s2['tut'] or not s3['coach']: fails.append('the coach comes back at the same step')
        # release the wave, then close mid-wave: back to the build with the coach at "release the wave"
        await page.evaluate("__yatd.run.tut = 7"); await page.evaluate("__yatd.startWave()"); await page.wait_for_timeout(600)   # step 7 = release the wave; the save right before the wave holds it
        s4 = await page.evaluate(ST); print('in the wave', s4)
        await boot(page)
        await page.click('#start-continue'); await page.wait_for_timeout(800)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.wait_for_timeout(300)
        s5 = await page.evaluate(ST); print('resumed after a wave cut short', s5)
        if s5['phase'] != 'build' or not s5['coach'] or 'Wypuść' not in s5['coach']: fails.append('back to the build, coach says release the wave')
        # a save that holds a step of the wave itself (8 = novice): back to "release the wave"
        await page.evaluate("__yatd.run.tut = 8")
        await page.evaluate("(() => { const G = __yatd; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('spikes', x, y)) { G.tryPlace('spikes', x, y); return; } })()")
        await page.wait_for_timeout(1000)
        await boot(page); await page.click('#start-continue'); await page.wait_for_timeout(800)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        s5b = await page.evaluate(ST); print('resumed with a wave step saved', s5b)
        if s5b['tut'] != 7 or not s5b['coach'] or 'Wypuść' not in s5b['coach']: fails.append('a wave step goes back to release the wave')
        # end the tutorial: a reload offers "Kontynuuj run", no coach
        await page.evaluate("(() => { const c = document.querySelector('#coach .skip'); if (c) c.click(); })()"); await page.wait_for_timeout(300)
        await page.evaluate("(() => { const G = __yatd; G.fl.essence -= 0; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('arrows', x, y)) { G.tryPlace('arrows', x, y); return; } })()")
        await page.wait_for_timeout(1000)
        await boot(page)
        lbl2 = await page.evaluate("document.querySelector('#start-continue') ? document.querySelector('#start-continue').innerText : null")
        await page.click('#start-continue'); await page.wait_for_timeout(800)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        s6 = await page.evaluate(ST); print('after the tutorial ended', lbl2, s6)
        if not lbl2 or 'Kontynuuj run' not in lbl2 or s6['coach'] or s6['tut'] != -1: fails.append('after the tutorial: continue the run, no coach')
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
