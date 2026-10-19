import asyncio
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
ST = "(() => { const G = __yatd; return { tut: G.run.tut, wave: G.run.wave, phase: G.fl.phase, modal: G.modalKind, coach: document.querySelector('#coach').hidden ? null : document.querySelector('#coach').innerText.slice(0, 60) }; })()"
PLAY = r'''() => { const G = __yatd; G.run.tut = 8; G.startWave(); let g = 0;
  while (g++ < 20000) { const fl = G.fl; if (G.modalKind) break; if (fl.check) { if (!fl.check.result) G.resolveCheck((fl.check.g0 + fl.check.g1) / 2); G.clearCheck(); continue; } if (fl.phase !== 'raid') break; G.step(0.05); if (fl.ending !== null) { fl.ending -= 0.05; if (fl.ending <= 0) { fl.ending = null; G.finishWave(); } } }
  return G.modalKind; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':390,'height':844}); page = await ctx.new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(BASE); await page.wait_for_timeout(600)
        await page.click('#start-tut'); await page.wait_for_timeout(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        print('wave ends with', await page.evaluate(PLAY)); await page.wait_for_timeout(800)
        print('save stage', await page.evaluate("JSON.parse(localStorage.getItem('yatd12-save')).stage"), await page.evaluate(ST))
        await page.goto(BASE); await page.wait_for_timeout(600)
        await page.click('#start-continue'); await page.wait_for_timeout(600)
        seen = []
        for i in range(8):
            mk = await page.evaluate("__yatd.modalKind")
            if not mk: break
            seen.append(mk); await page.evaluate("__yatd.closeModal()"); await page.wait_for_timeout(300)
        s = await page.evaluate(ST); print('modals', seen, 'then', s)
        ok = s['phase'] == 'build' and s['wave'] == 2 and s['coach'] and 'kop' in s['coach'].lower() or (s['coach'] and 'przebudujesz' in s['coach'])
        print('FAILS', [] if ok else ['after a saved summary the coach goes on at the dig step']); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
