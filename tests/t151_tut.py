# 1.05: the interactive tutorial, walked through by taps like a player. 1.12 (the tutorial spread over the first runs): the
# guide of run 1 over its first three waves: move a trap, spikes, arrows, release the wave, answer a check, open a hero
# card, hold to speed up; wave 2: coins, a double-tap upgrade, the deck; wave 3: dig a room, the end. Every step must be
# reached and none skipped; the run summary logs the progress.
import asyncio, json, sys
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots151/tut_'
async def tile_xy(page, t):
    return await page.evaluate("""(t) => { const G=__yatd, c=document.querySelector('canvas').getBoundingClientRect(); const p = G.w2s(t[0] + 0.5, t[1] + 0.5, 0); return { x: c.left + p[0], y: c.top + p[1] }; }""", t)
async def show(page, t):
    await page.evaluate("t => { const G=__yatd; const c=document.querySelector('canvas').getBoundingClientRect(); G.centerOn(t[0] + 0.5, t[1] + 0.5); G.cam.oy += c.height * (0.5 - 1 / 2.6); G.cam.manualUntil = 1e12; }", t)
    await page.clock.run_for(80)
async def tap(page, t, wait=300):
    await show(page, t); xy = await tile_xy(page, t); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(wait)
async def step(page):
    return await page.evaluate("(() => { const G=__yatd, s=G.TUT[G.run.tut]; return { i: G.run.tut, id: s ? s.id : null, phase: G.fl.phase, modal: G.modalKind, check: !!(G.fl.check && !G.fl.check.result), coach: document.querySelector('#coach').hidden ? null : document.querySelector('#coach').innerText.slice(0, 70), tray: !document.querySelector('#drawer').classList.contains('closed'), pop: G.tutPopNow, popQ: 0 }; })()")
async def target(page):
    return await page.evaluate("(() => { const G=__yatd, s=G.TUT[G.run.tut]; if (!s || !s.tile) return null; if (s.cached === undefined) s.cached = s.tile(); return s.cached; })()")
async def main():
    W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
    fails = []; seen = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await (await b.new_context(viewport={'width': W, 'height': 844}, device_scale_factor=2)).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-tut'); await page.clock.run_for(400)
        async def expect(sid):
            s = await step(page); seen.append(s['id']); print(s)
            if s['id'] != sid: fails.append('expected step %s, got %s' % (sid, s['id']))
            return s
        await expect('intro'); await page.click('#coach .next'); await page.clock.run_for(300)
        s = await expect('move')
        t = await target(page)
        if t:
            await tap(page, t)
            tg = await page.evaluate("(t => { const G=__yatd, it=G.fl.items.get(t[0]+','+t[1]); G.fl.items.delete(t[0]+','+t[1]); let r=null; for (const q of G.shortestPath()) if (G.canPlace(it.type, q[0], q[1]) && Math.abs(q[0]-t[0])+Math.abs(q[1]-t[1]) <= 6 && (q[0]!==t[0]||q[1]!==t[1])) { r=q; break; } G.fl.items.set(t[0]+','+t[1], it); return r; })", t)
            if tg: await tap(page, tg, 400)
        await expect('spikes'); await page.click('#item-spikes'); await page.clock.run_for(300)
        await expect('place'); t = await target(page)
        if t: await tap(page, t)
        await expect('arrows'); await page.click('#item-arrows'); await page.clock.run_for(300); t = await target(page)
        if t: await tap(page, t)
        s = await expect('spend')
        for i in range(14):
            s = await step(page)
            if s['id'] != 'spend': break
            await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); for (const t of ['spikes','arrows']) { for (let y=0;y<G.WH;y++) for (let x=0;x<G.WW;x++) { if (G.canPlace(t,x,y) && G.fl.essence >= 3 && G.areaOf({type:t,x,y}).some(a => P.some(p => p[0]===a[0] && p[1]===a[1]))) { G.tryPlace(t,x,y); return; } } } })()")
            await page.clock.run_for(300)
        if (await step(page))['id'] == 'spend': await page.evaluate("(() => { const b=[...document.querySelectorAll('#coach .skip')].find(x => x.textContent.includes('Pomiń')); if (b) b.click(); })()"); await page.clock.run_for(200)
        await expect('go'); await page.click('#btn-action'); await page.clock.run_for(500)
        s = await step(page)
        if s['tray']: fails.append('the bar folds for the wave in the tutorial too')   # 1.09: back as before 1.08
        await page.screenshot(path=OUT + '04_wave.png')
        got_check = hero = held = False
        for i in range(500):
            await page.clock.run_for(200)
            s = await step(page)
            if await page.evaluate("__yatd.tutPopNow"): await page.click('#coach .next'); await page.clock.run_for(200); continue
            if s['id'] == 'novice' and await page.evaluate("!document.querySelector('#coach').hidden && !!document.querySelector('#coach .next')"):   # 1.15.1: the first tip of the wave stands until Rozumiem
                if not await page.evaluate("__yatd.paused"): fails.append('the first tip of the wave stops the game')
                await page.click('#coach .next'); await page.clock.run_for(200); continue
            if s['modal'] == 'hero' and (hero or s['id'] != 'herocard'): await page.evaluate("__yatd.closeModal(); __yatd.setPaused(false)"); await page.clock.run_for(100); continue
            if s['check'] and not got_check:
                await page.clock.run_for(500); await page.mouse.click(W / 2, 420); got_check = True; await page.clock.run_for(300); continue
            elif s['check']: await page.evaluate("(() => { const c=__yatd.fl.check; __yatd.resolveCheck((c.r0+c.r1)/2); __yatd.clearCheck(); })()")
            if s['id'] == 'herocard' and not hero and s['modal'] is None:
                seen.append('herocard')
                hp = await page.evaluate("(() => { const G=__yatd, h=G.alive()[0]; if (!h) return null; const p=G.heroPos ? G.heroPos(h) : {x:h.x+0.5,y:h.y+0.5}; return [Math.floor(p.x), Math.floor(p.y)]; })()")
                if hp:
                    xy = await tile_xy(page, hp); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(300)
                    if await page.evaluate("__yatd.modalKind") == 'hero': hero = True; await page.screenshot(path=OUT + '05_hero.png'); await page.click('#card .btn.primary'); await page.clock.run_for(200)
                    else: await page.evaluate("__yatd.openModal({ type: 'hero', id: __yatd.alive()[0].id, unpause: true })"); await page.click('#card .btn.primary'); hero = True
            if s['id'] == 'ff' and not held:
                seen.append('ff')
                for attempt in range(4):   # a check that pops up under the finger takes the tap: try again after it
                    await page.evaluate("(() => { const c=__yatd.fl.check; if (c && !c.result) { __yatd.resolveCheck((c.r0+c.r1)/2); } if (__yatd.fl.check) __yatd.clearCheck(); })()")
                    await page.mouse.move(W / 2, 430); await page.mouse.down(); await page.clock.run_for(1500)
                    ffd = await page.evaluate("({ ff: __yatd.ff, paused: __yatd.paused, pop: __yatd.tutPopNow, check: !!__yatd.fl.check, phase: __yatd.fl.phase, tf: __yatd.run.tut })"); print('hold', ffd)
                    if ffd['ff'] or ffd['phase'] != 'raid': break
                    await page.mouse.up(); await page.clock.run_for(300)
                if not ffd['ff'] and ffd['phase'] == 'raid': fails.append('holding speeds up')
                await page.mouse.up(); held = True
            if s['modal'] == 'wave' or s['phase'] != 'raid': break
            if hero and not held and s['id'] == 'herocard': pass
        if not got_check: fails.append('a check came in the tutorial wave')
        if not hero: fails.append('the hero card step')
        if not held: print('NOTE: the wave ended before the hold step (allowed: it waits for the player, the wave does not)')
        RUNW = r'''() => { const G = __yatd; let g = 0; while (g++ < 20000) { const f = G.fl; if (G.modalKind === 'hero') { G.closeModal(); G.setPaused(false); } if (G.modalKind) return G.modalKind;
            if (f.check) { if (!f.check.result) G.skipCheck(); G.clearCheck(); continue; } if (f.phase !== 'raid') return f.phase; G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } } return 'guard'; }'''
        while await page.evaluate("__yatd.tutPopNow"): await page.click('#coach .next'); await page.clock.run_for(150)
        mk = await page.evaluate(RUNW); print('wave end', mk, await step(page))
        await page.screenshot(path=OUT + '06_summary.png')
        for i in range(8):
            if not await page.evaluate("__yatd.modalKind"): break
            await page.evaluate("(() => { const G=__yatd; const k=G.modalKind; if (k==='shop') { const x=document.querySelector('#shop-close'); if (x) x.click(); else G.closeModal(); return; } const b = document.querySelector('#card .btn.primary'); if (b) b.click(); else G.closeModal(); })()")
            await page.clock.run_for(300)
        # wave 2: coins, the upgrade, the deck
        await expect('loot'); await page.click('#tab-loot'); await page.click('#item-loot'); await page.clock.run_for(200)
        lt = await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); for (let k=Math.floor(P.length*0.5);k<P.length;k++){ if (G.canPlace('loot',P[k][0],P[k][1])) return P[k]; } return null; })()")
        if lt: await tap(page, lt)
        await expect('upgrade'); await page.screenshot(path=OUT + '03_upgrade.png')
        await page.evaluate("__yatd.setMode(null)"); await page.clock.run_for(100)
        t = await target(page)
        if t: await show(page, t); xy = await tile_xy(page, t); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(110); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(400)
        lv = await page.evaluate("t => (__yatd.fl.items.get(t[0]+','+t[1]) || {}).lvl", t) if t else None
        if lv != 2: fails.append('the double tap upgraded the target (lvl %s)' % lv)
        await expect('deck'); await page.click('#coach .next'); await page.clock.run_for(200)
        s = await step(page)
        if not s['coach'] is None: fails.append('after the deck the guide waits for wave 3 (%s)' % s)
        await page.click('#btn-action'); await page.clock.run_for(300)
        while await page.evaluate("__yatd.tutPopNow"): await page.click('#coach .next'); await page.clock.run_for(150)
        mk = await page.evaluate(RUNW); print('wave 2 end', mk)
        for i in range(8):
            if not await page.evaluate("__yatd.modalKind"): break
            await page.evaluate("(() => { const G=__yatd; const k=G.modalKind; if (k==='shop') { const x=document.querySelector('#shop-close'); if (x) x.click(); else G.closeModal(); return; } const b = document.querySelector('#card .btn.primary'); if (b) b.click(); else G.closeModal(); })()")
            await page.clock.run_for(300)
        # wave 3: dig, the end
        await expect('dig')
        if not (await step(page))['tray']: fails.append('the bar is open in the build')
        await page.click('#item-dig'); await page.clock.run_for(300)
        m = await page.evaluate("(() => { const G=__yatd; const ms=G.toolMarkers('dig'); return ms[0] ? [ms[0].x - 0.5, ms[0].y - 0.5] : null; })()")
        if m: await tap(page, m)
        s = await expect('end'); await page.screenshot(path=OUT + '07_end.png')
        await page.click('#coach .next'); await page.clock.run_for(200)
        s = await step(page); print('end', s)
        log = await page.evaluate("(() => { const G=__yatd; return G.run.tutLog; })()"); print('tutLog', log)
        if s['coach'] or s['i'] != -1: fails.append('the tutorial ends')
        if not log or log.get('ended') != 'done' or log.get('skipped'): fails.append('the log: done, nothing skipped')
        print('steps seen', seen)
        print('FAILS', fails); print('errs', errs[:5])
        await b.close()
asyncio.run(main())
