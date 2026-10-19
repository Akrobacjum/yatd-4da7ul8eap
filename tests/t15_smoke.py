import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots15/'
RUNW = r'''(stopAt) => { const G = __yatd; let g = 0; while (g++ < 40000) { const f = G.fl; if (G.modalKind) return G.modalKind;
    if (stopAt && f.time >= stopAt) return 'mid';
    if (f.check) { if (!f.check.result) G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); continue; } if (f.phase !== 'raid') return f.phase; G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } } return 'guard'; }'''
BUILD = r'''() => { const G=__yatd, P=G.shortestPath(); let n=0; for (const t of ['spikes','arrows','loot']) for (const q of P) { if (n > 12) break; for (const d of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) { const x=q[0]+d[0], y=q[1]+d[1]; if (G.canPlace(t,x,y) && G.fl.essence >= 2) { G.tryPlace(t,x,y); n++; break; } } } return { n, ess: G.fl.essence }; }'''
STATE = r'''() => { const G=__yatd, f=G.fl, r=G.run, s=f.stats; return { wave: r.wave, phase: f.phase, ess: Math.round(f.essence*10)/10, base: Math.round(f.base*100)/100, score: Math.round(f.score*10)/10, greed: f.greed, total: Math.round(r.total*10)/10, fed: Math.round((f.fed||0)*10)/10, cry: r.crystals, need: G.hungerNeed(r.wave), hunger: f.hunger, k: s.kills, sc: s.scared, heart: s.essHeart, combo: s.comboPts, hud: document.querySelector('#h-score').textContent + ' | ' + document.querySelector('#h-best').textContent + ' | ' + document.querySelector('#h-hlabel').textContent + ' | ' + document.querySelector('#h-mult').innerText + ' | ' + document.querySelector('#h-rank').textContent }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        for w in range(1, 6):
            print('build', await page.evaluate(BUILD))
            print('pre', json.dumps(await page.evaluate(STATE), ensure_ascii=False))
            await page.click('#btn-action'); await page.clock.run_for(300)
            r = await page.evaluate(RUNW, 12)
            await page.clock.run_for(200)
            st = await page.evaluate(STATE); print('mid', json.dumps(st, ensure_ascii=False))
            if w == 2: await page.screenshot(path=OUT+'raid_w2.png')
            r = await page.evaluate(RUNW, 0)
            st = await page.evaluate(STATE); print('end', r, json.dumps(st, ensure_ascii=False))
            if w == 2: await page.screenshot(path=OUT+'summary_w2.png', full_page=True)
            for i in range(8):
                k = await page.evaluate("__yatd.modalKind")
                if not k: break
                if k == 'shop':
                    if w == 3: await page.screenshot(path=OUT+'shop_w3.png')
                    await page.evaluate("(() => { const G=__yatd; if (G.run.freePicks>0) { const c=[...document.querySelectorAll('#card .choices .btn')].find(b=>!b.disabled); if (c) { c.click(); return; } } document.querySelector('#shop-close').click(); })()")
                elif k in ('over',): print('OVER'); break
                else: await page.evaluate("(() => { const b = document.querySelector('#card .btn.primary'); if (b) b.click(); else __yatd.closeModal(); })()")
                await page.clock.run_for(200)
            if await page.evaluate("__yatd.modalKind") == 'over': break
        print('errs', errs[:3])
        await b.close()
asyncio.run(main())
