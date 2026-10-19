import asyncio, json, sys
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots151/tut_'
async def tile_xy(page, t):
    return await page.evaluate("""(t) => { const G=__yatd, c=document.querySelector('canvas').getBoundingClientRect(); return { x: c.left + (t[0]+0.5)*G.cam.s - G.cam.ox, y: c.top + (t[1]+0.5)*G.cam.s - G.cam.oy }; }""", t)
async def state(page):
    return await page.evaluate("(() => { const G=__yatd; return { tut: G.run.tut, phase: G.fl.phase, modal: G.modalKind, sel: null, check: !!(G.fl.check && !G.fl.check.result), coach: document.querySelector('#coach').hidden ? null : document.querySelector('#coach').innerText.slice(0,60) } })()")
async def main():
    W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await (await b.new_context(viewport={'width':W,'height':844}, device_scale_factor=2)).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.screenshot(path=OUT+'00_start.png')
        await page.click('#start-tut'); await page.clock.run_for(400)
        await page.screenshot(path=OUT+'01_tut0.png'); print(await state(page))
        await page.click('#coach .next'); await page.clock.run_for(300)
        print('move step', await state(page), 'ess', await page.evaluate("__yatd.fl.essence"), 'sys', await page.evaluate("[...__yatd.fl.items.values()].filter(o => o.sys).map(o => o.type).join(',')"))
        t = await page.evaluate("__yatd.TUT[1].cached || null")
        if t:
            xy = await tile_xy(page, t); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(300)
            await page.screenshot(path=OUT+'01b_move.png')
            tg = await page.evaluate("(t => { const G=__yatd, it=G.fl.items.get(t[0]+','+t[1]); G.fl.items.delete(t[0]+','+t[1]); let r=null; for (const q of G.shortestPath()) if (G.canPlace(it.type, q[0], q[1]) && Math.abs(q[0]-t[0])+Math.abs(q[1]-t[1]) <= 6 && (q[0]!==t[0]||q[1]!==t[1])) { r=q; break; } G.fl.items.set(t[0]+','+t[1], it); return r; })", t)
            print('move target', tg)
            if tg:
                xy = await tile_xy(page, tg); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(400)
        print('after move', await state(page))
        await page.click('#item-spikes'); await page.clock.run_for(300); print(await state(page))
        await page.screenshot(path=OUT+'02_tut2.png')
        t = await page.evaluate("__yatd.TUT[3].cached || null")
        print('target', t)
        if t:
            xy = await tile_xy(page, t); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(300)
        print(await state(page))
        await page.click('#item-arrows'); await page.clock.run_for(300)
        t = await page.evaluate("__yatd.TUT[4].cached || null"); print('wall target', t)
        await page.screenshot(path=OUT+'03_tut3.png')
        if t:
            xy = await tile_xy(page, t); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(300)
        print(await state(page))
        await page.click('#tab-loot'); await page.click('#item-loot'); await page.clock.run_for(200)
        lt = await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); for (let k=Math.floor(P.length*0.5);k<P.length;k++){ if (G.canPlace('loot',P[k][0],P[k][1])) return P[k]; } return null; })()")
        if lt:
            await page.evaluate("t => { const G=__yatd; const c=document.querySelector('canvas').getBoundingClientRect(); G.cam.ox = (t[0]+0.5)*G.cam.s - c.width/2; G.cam.oy = (t[1]+0.5)*G.cam.s - c.height/2; }", lt)
            await page.clock.run_for(100)
            xy = await tile_xy(page, lt); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(300)
        print(await state(page))
        await page.screenshot(path=OUT+'04_tut5.png')
        print('spend step', await state(page), 'ess', await page.evaluate("__yatd.fl.essence"))
        for i in range(12):
            st = await state(page)
            if not st['coach'].startswith('Masz jeszcze'): break
            await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); for (const t of ['spikes','arrows']) { for (let y=0;y<G.WH;y++) for (let x=0;x<G.WW;x++) { if (G.canPlace(t,x,y) && G.fl.essence >= 2 && G.areaOf({type:t,x,y}).some(a => P.some(p => p[0]===a[0] && p[1]===a[1]))) { G.tryPlace(t,x,y); return; } } } })()")
            await page.clock.run_for(300)
        print('after spending', await state(page), 'ess', await page.evaluate("__yatd.fl.essence"), 'items', await page.evaluate("__yatd.fl.items.size"))
        await page.screenshot(path=OUT+'04b_spent.png')
        await page.click('#btn-action'); await page.clock.run_for(500); print(await state(page))
        got_check = False; held = False
        for i in range(400):
            await page.clock.run_for(250)
            st = await state(page)
            if st['modal'] == 'upgrade': await page.evaluate("document.querySelector('#card .choices .btn').click()")
            if st['check'] and not got_check:
                if await page.evaluate("__yatd.tutPopNow"): await page.screenshot(path=OUT+'05p_check.png'); await page.click('#coach .next'); await page.clock.run_for(200)
                await page.clock.run_for(600); await page.screenshot(path=OUT+'05_check.png')
                await page.mouse.click(W/2, 400); got_check = True; await page.clock.run_for(300); print('after check', await state(page))
            elif st['check']:
                await page.evaluate("__yatd.skipCheck(); __yatd.clearCheck()")
            if await page.evaluate("__yatd.tutPopNow"):   # 1.04: a card that stops the game
                await page.screenshot(path=OUT+'05p_' + await page.evaluate("__yatd.tutPopNow") + '.png'); await page.click('#coach .next'); await page.clock.run_for(200); continue
            if st['tut'] == 10 and not held:
                await page.mouse.move(W/2, 420); await page.mouse.down(); await page.clock.run_for(1500)
                print('ff', await page.evaluate("__yatd.ff")); await page.screenshot(path=OUT+'06_ff.png'); await page.mouse.up(); held = True
            if st['modal'] in ('wave', 'settle'): break
        RUNW = r'''() => { const G = __yatd; let g = 0; while (g++ < 20000) { const f = G.fl; if (G.modalKind) return G.modalKind;
            if (f.check) { if (!f.check.result) G.skipCheck(); G.clearCheck(); continue; } if (f.phase !== 'raid') return f.phase; G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } } return 'guard'; }'''
        for i in range(4):
            mk = await page.evaluate(RUNW)
            if mk == 'upgrade': await page.evaluate("document.querySelector('#card .choices .btn').click()"); continue
            break
        print('wave end', await state(page))
        await page.screenshot(path=OUT+'08_wave.png', full_page=True)
        for i in range(8):
            if not await page.evaluate("__yatd.modalKind"): break
            what = await page.evaluate("(() => { const G=__yatd; const k=G.modalKind; if (!k) return null; if (k==='shop') { if (G.run.freePicks>0) { const c=[...document.querySelectorAll('#card .choices .btn')].find(b=>!b.disabled); if (c) { c.click(); return 'shop-pick'; } } document.querySelector('#shop-close').click(); return 'shop-close'; } const c = document.querySelector('#card .choices .btn'); if (c) { c.click(); return 'pick:' + k; } const b = document.querySelector('#card .btn.primary'); if (b) { b.click(); return 'next:' + k; } return 'none'; })()")
            print('wave modal action', what); await page.clock.run_for(300)
        await page.clock.run_for(300)
        for i in range(5):
            st = await state(page)
            if st['modal'] == 'upgrade': await page.screenshot(path=OUT+'09_upgrade.png'); await page.evaluate("document.querySelector('#card .choices .btn').click()"); await page.clock.run_for(200)
        print('build', await state(page))
        await page.screenshot(path=OUT+'10_tut10.png')
        await page.click('#item-dig'); await page.clock.run_for(300)
        await page.screenshot(path=OUT+'11_dig.png')
        m = await page.evaluate("(() => { const G=__yatd; const ms=G.toolMarkers('dig'); if (!ms[0]) return null; const c=document.querySelector('canvas').getBoundingClientRect(); G.cam.ox = ms[0].x*G.cam.s - c.width/2; G.cam.oy = ms[0].y*G.cam.s - c.height/3; G.cam.manualUntil = 1e12; return [ms[0].x - 0.5, ms[0].y - 0.5]; })()")
        await page.clock.run_for(100)
        if m:
            xy = await tile_xy(page, m); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(300)
        print('after dig', await state(page), await page.evaluate("__yatd.run.layout.cells.size"))
        await page.screenshot(path=OUT+'12_tut11.png')
        print('deck tab selected', await page.evaluate("document.querySelector('#tab-deck').getAttribute('aria-selected')"), 'tiles', await page.evaluate("document.querySelectorAll('#tray .dslot:not(.empty)').length"))
        await page.click('#coach .next'); await page.clock.run_for(200)
        print('upgrade step', await state(page), 'build tab', await page.evaluate("document.querySelector('#tab-object').getAttribute('aria-selected')"))
        await page.screenshot(path=OUT+'12b_upgrade.png')
        await page.click('#coach .next'); await page.clock.run_for(200)
        print('types step', await state(page))
        await page.screenshot(path=OUT+'12c_types.png')
        await page.click('#coach .next'); await page.clock.run_for(200)
        print('tales step', await state(page))
        await page.click('#coach .next'); await page.clock.run_for(200)
        print('last step', await state(page))
        await page.screenshot(path=OUT+'13_tut12.png')
        await page.click('#coach .next'); await page.clock.run_for(200)
        print('end', await state(page))
        print('errs', errs[:5])
        await b.close()
asyncio.run(main())
