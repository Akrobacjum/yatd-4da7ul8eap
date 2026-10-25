import asyncio, json, sys
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page121.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots12/'
RUNW = r'''() => { const G = __yatd; let g = 0; while (g++ < 40000) { const f = G.fl; if (G.modalKind) return G.modalKind;
    if (f.check) { if (!f.check.result) G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); continue; } if (f.phase !== 'raid') return f.phase; G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } } return 'guard'; }'''
async def tile_xy(page, t):
    return await page.evaluate("""(t) => { const G=__yatd, c=document.querySelector('canvas').getBoundingClientRect(); return { x: c.left + (t[0]+0.5)*G.cam.s - G.cam.ox, y: c.top + (t[1]+0.5)*G.cam.s - G.cam.oy }; }""", t)
async def center_on(page, t):
    await page.evaluate("t => { const G=__yatd; const c=document.querySelector('canvas').getBoundingClientRect(); G.cam.ox = (t[0]+0.5)*G.cam.s - c.width/2; G.cam.oy = (t[1]+0.5)*G.cam.s - c.height/2; G.cam.manualUntil = 1e12; }", t)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        page = await ctx.new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        print('fresh continue?', await page.evaluate("!!document.querySelector('#start-continue')"))
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.click('#tab-build'); await page.clock.run_for(200)
        await page.screenshot(path=OUT+'20_build_tab.png')
        print('build tab items', await page.evaluate("[...document.querySelectorAll('#tray .item')].map(e => e.id + ':' + e.innerText.replace(/\\n/g,' '))"))
        await page.click('#item-rune'); await page.clock.run_for(200)
        spot = await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(), on=new Set(P.map(p=>p[0]+','+p[1])); for (let y=0;y<G.WH;y++) for (let x=0;x<G.WW;x++) if (G.canPlace('rune',x,y) && !on.has(x+','+y)) return [x,y]; return null; })()")
        print('rune spot', spot)
        await center_on(page, spot); await page.clock.run_for(100)
        xy = await tile_xy(page, spot); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(300)
        print('rune placed', await page.evaluate("(t => { const it = __yatd.fl.items.get(t[0]+','+t[1]); return it ? it.type + ' lvl ' + it.lvl : null; })", spot), 'hint', await page.evaluate("document.querySelector('#hint') ? document.querySelector('#hint').innerText.slice(0,90) : ''"))
        await page.screenshot(path=OUT+'21_rune_placed.png')
        # spikes on the path, then deselect and tap them to open the item card
        sp = await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); for (const q of P) if (G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); return q; } return null; })()")
        await page.click('#item-rune'); await page.clock.run_for(200)
        print('selected after 2nd tap', await page.evaluate("__yatd.selected === undefined ? 'n/a' : __yatd.selected"))
        await page.evaluate("__yatd.fl.essence = 30")
        await center_on(page, sp); await page.clock.run_for(100)
        xy = await tile_xy(page, sp); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(300)
        print('modal after tap on spikes', await page.evaluate("__yatd.modalKind"))
        await page.screenshot(path=OUT+'22_item_modal.png')
        if await page.evaluate("!!document.querySelector('#sheet-upgrade')"):
            await page.click('#sheet-upgrade'); await page.clock.run_for(300)
        print('spikes lvl', await page.evaluate("(t => __yatd.fl.items.get(t[0]+','+t[1]).lvl)", sp), 'ess', await page.evaluate("__yatd.fl.essence"))
        await page.screenshot(path=OUT+'23_item_upgraded.png')
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.click('#btn-action'); await page.clock.run_for(300)
        mk = await page.evaluate(RUNW)
        print('after wave modal', mk, 'save stage', await page.evaluate("(__yatd.loadSave() || {}).stage"))
        await page.screenshot(path=OUT+'24_wave_summary.png', full_page=True)
        await page.clock.run_for(800)
        print('wave buttons', await page.evaluate("[...document.querySelectorAll('#card .btn')].map(b => b.innerText.replace(/\\n/g,' / ')).slice(0, 12)"))
        # save and quit from the summary
        await page.evaluate("[...document.querySelectorAll('#card .btn')].find(b => /^(Zapisz i wyjdź|Wyjdź)/.test(b.innerText)).click()"); await page.clock.run_for(300)
        print('after save&quit modal', await page.evaluate("__yatd.modalKind"), 'continue', await page.evaluate("!!document.querySelector('#start-continue')"))
        await page.screenshot(path=OUT+'25_start_continue.png')
        # reload the page: the save must survive
        page2 = await ctx.new_page(); page2.on('pageerror', lambda e: errs.append('p2 ' + str(e)))
        await page2.clock.install(); await page2.goto(BASE); await page2.clock.run_for(500)
        print('reload continue?', await page2.evaluate("!!document.querySelector('#start-continue')"), await page2.evaluate("document.querySelector('#start-continue') ? document.querySelector('#start-continue').innerText.replace(/\\n/g,' / ') : ''"))
        await page2.click('#start-continue'); await page2.clock.run_for(400)
        st = await page2.evaluate("({ modal: __yatd.modalKind, phase: __yatd.fl.phase, wave: __yatd.run.wave, items: [...__yatd.fl.items.values()].filter(i => i.type==='rune' || (i.lvl||1) > 1).map(i => i.type + i.lvl), resumed: __yatd.run.resumed })")
        print('resumed state', st)
        print('same cards after resume?', await page2.evaluate("[...document.querySelectorAll('#card .choices .btn')].map(b => b.innerText.split('\\n')[1])"))
        await page2.screenshot(path=OUT+'26_resumed.png', full_page=True)
        for i in range(4):
            if not await page2.evaluate("__yatd.modalKind"): break
            what = await page2.evaluate("(() => { const c = document.querySelector('#card .choices .btn'); if (c) { c.click(); return 'pick'; } const b = document.querySelector('#card .btn.primary'); if (b) { b.click(); return 'next'; } return 'none'; })()")
            print('resume modal action', what); await page2.clock.run_for(300)
        st = await page2.evaluate("({ modal: __yatd.modalKind, phase: __yatd.fl.phase, wave: __yatd.run.wave, deck: __yatd.run.deck.length, ups: __yatd.run.upgrades.length, items: [...__yatd.fl.items.values()].filter(i => i.type==='rune' || (i.lvl||1) > 1).map(i => i.type + i.lvl), save: (__yatd.loadSave()||{}).stage })")
        print('after pick', st)
        await page2.screenshot(path=OUT+'27_build2.png')
        print('errs', errs[:5])
        await b.close()
asyncio.run(main())
