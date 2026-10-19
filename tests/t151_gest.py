import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots151/'
async def tile_xy(page, t):
    return await page.evaluate("""(t) => { const G=__yatd, c=document.querySelector('canvas').getBoundingClientRect(); return { x: c.left + (t[0]+0.5)*G.cam.s - G.cam.ox, y: c.top + (t[1]+0.5)*G.cam.s - G.cam.oy }; }""", t)
async def center_on(page, t):
    await page.evaluate("t => { const G=__yatd; const c=document.querySelector('canvas').getBoundingClientRect(); G.cam.s = 40; G.cam.ox = (t[0]+0.5)*G.cam.s - c.width/2; G.cam.oy = (t[1]+0.5)*G.cam.s - c.height/2; G.cam.manualUntil = 1e12; }", t)
async def tap(page, t):
    await center_on(page, t); await page.clock.run_for(50); xy = await tile_xy(page, t); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(100)
async def hold(page, t, ms=800):
    await center_on(page, t); await page.clock.run_for(50); xy = await tile_xy(page, t)
    await page.mouse.move(xy['x'], xy['y']); await page.mouse.down(); await page.clock.run_for(ms); await page.mouse.up(); await page.clock.run_for(100)
async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.evaluate("(() => { const G = __yatd; G.fl.essence = 99; for (let i = 0; i < 3; i++) { const m = G.toolMarkers('dig'); if (m.length) G.applyTool(m[i % m.length]); G.fl.essence = 99; } })()")
        tray = await page.evaluate("!!document.querySelector('#item-move') && !document.querySelector('#item-move').hidden")
        print('move button visible', tray); 
        if tray: fails.append('move button still in tray')
        sp = await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); for (const q of P.slice(2)) if (G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); return q; } return null; })()")
        # select arrows on the tray: a tap on the spikes must still pick them up
        await page.evaluate("__yatd.setTab('traps')"); await page.click('#item-arrows'); await page.clock.run_for(100)
        await tap(page, sp)
        mk = await page.evaluate("__yatd.movingKey")
        print('picked', mk, sp)
        if mk != '%d,%d' % (sp[0], sp[1]): fails.append('tap did not pick up')
        tgt = await page.evaluate("(sp => { const G=__yatd; const it = G.fl.items.get(sp[0]+','+sp[1]); G.fl.items.delete(sp[0]+','+sp[1]); let r = null; for (let y=0;y<G.WH && !r;y++) for (let x=0;x<G.WW;x++) if (G.canPlace('spikes',x,y) && Math.abs(x-sp[0])+Math.abs(y-sp[1]) >= 2) { r=[x,y]; break; } G.fl.items.set(sp[0]+','+sp[1], it); return r; })", sp)
        await page.screenshot(path=OUT+'gest_carry.png')
        await tap(page, tgt)
        moved = await page.evaluate("(t => { const it = __yatd.fl.items.get(t[0]+','+t[1]); return it ? it.type : null; })", tgt)
        print('moved to', tgt, moved, 'carry', await page.evaluate("__yatd.movingKey"))
        if moved != 'spikes': fails.append('move failed')
        e0 = await page.evaluate("__yatd.fl.essence")
        await hold(page, tgt)
        gone = await page.evaluate("(t => !__yatd.fl.items.get(t[0]+','+t[1]))", tgt)
        e1 = await page.evaluate("__yatd.fl.essence")
        print('hold removed', gone, 'refund', e1 - e0)
        if not gone or abs(e1 - e0 - await page.evaluate('__yatd.ITEMS.spikes.cost')) > 0.01: fails.append('hold remove/refund')
        # furniture: a system piece and a crate with powder on it
        ob = await page.evaluate("(() => { const G=__yatd; for (const o of G.fl.objects.values()) if (!o.built) return [o.x, o.y]; return null; })()")
        print('furniture', ob)
        if ob:
            await page.click('#item-arrows'); await page.clock.run_for(50)   # deselect
            await page.evaluate("__yatd.setMode(null)")
            await tap(page, ob)
            print('obj picked', await page.evaluate("__yatd.movingObj"))
            ot = await page.evaluate("(ob => { const G=__yatd, o=G.fl.objects.get(ob[0]+','+ob[1]); const r = G.roomOf(ob[0], ob[1]); for (const t of G.fl.rooms[r].tiles) if (G.objTargetOk(o, t[0], t[1])) return t; return null; })", ob)
            print('obj target', ot)
            if ot:
                await page.screenshot(path=OUT+'gest_carry_obj.png')
                await tap(page, ot)
                ok = await page.evaluate("(t => !!__yatd.fl.objects.get(t[0]+','+t[1]))", ot)
                print('obj moved', ok)
                if not ok: fails.append('furniture move')
                e0 = await page.evaluate("__yatd.fl.essence")
                await hold(page, ot)
                print('obj removed', await page.evaluate("(t => !__yatd.fl.objects.get(t[0]+','+t[1]))", ot), 'refund', await page.evaluate("__yatd.fl.essence") - e0)
                if not await page.evaluate("(t => !__yatd.fl.objects.get(t[0]+','+t[1]))", ot): fails.append('furniture remove')
        # crate + powder rides along
        r = await page.evaluate("""(() => { const G=__yatd; G.fl.essence = 99; let c = null; for (let y=0;y<G.WH && !c;y++) for (let x=0;x<G.WW;x++) if (G.canPlace('crate',x,y)) { c=[x,y]; break; }
            if (!c) return null; G.tryPlace('crate', c[0], c[1]); const okp = G.tryPlace('powder', c[0], c[1]); return [c, okp]; })()""")
        print('crate+powder', r)
        if r and r[1]:
            c = r[0]
            await tap(page, c)   # picks the powder (an element on the crate)
            print('picked on crate', await page.evaluate("[__yatd.movingKey, __yatd.movingObj]"))
            await page.evaluate("(() => { const G=__yatd; G.setMode(null); })()")
            await page.evaluate("__yatd.dropCarry && __yatd.dropCarry()")
        print('undo n', await page.evaluate("__yatd.undoN"))
        await page.click('#btn-undo'); await page.clock.run_for(100)
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
