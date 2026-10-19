# Prototype 1.01: combo chains cashed in at the end, the heart eats first from the wave, no purse limit, the reckoning screen
import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots101/'
RUNW = r'''(stopAt) => { const G = __yatd; let g = 0; while (g++ < 40000) { const f = G.fl; if (G.modalKind) return G.modalKind;
    if (stopAt && f.time >= stopAt) return 'mid';
    if (f.check) { if (!f.check.result) G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); continue; } if (f.phase !== 'raid') return f.phase; G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } } return 'guard'; }'''
BUILD = r'''() => { const G=__yatd, P=G.shortestPath(); let n=0; for (const t of ['spikes','arrows','loot','bones','eyes','portrait']) for (const q of P) { if (n > 14) break; for (const d of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) { const x=q[0]+d[0], y=q[1]+d[1]; if (G.canPlace(t,x,y) && G.fl.essence >= G.ITEMS[t].cost) { G.tryPlace(t,x,y); n++; break; } } } return { n, ess: G.fl.essence }; }'''
STATE = r'''() => { const G=__yatd, f=G.fl, r=G.run, s=f.stats, ev=(f.tl && f.tl.ev) || []; return { wave: r.wave, phase: f.phase, ess: Math.round(f.essence*10)/10, base: Math.round(f.base*100)/100, score: Math.round(f.score*10)/10, fed: Math.round((f.fed||0)*10)/10, need: G.hungerNeed(r.wave), greed: Math.round(f.greed*100)/100, cry: r.crystals, hunger: f.hunger, comboPts: Math.round((s.comboPts||0)*10)/10, essHeart: Math.round((s.essHeart||0)*10)/10, essWave: Math.round((s.essWave||0)*10)/10, pays: ev.filter(e => e[1]==='cp').length, chain: f.chain ? Math.round(f.chain.g*100)/100 : null, lvls: (r.next||[]).map(e=>e.lvl), store: r.hungerStore, hud: document.querySelector('#h-score').textContent + ' | ' + document.querySelector('#h-best').textContent + ' | ' + document.querySelector('#h-hlabel').textContent + ' | ' + document.querySelector('#h-eq').innerText.replace(/\n/g,' ') + ' | ' + document.querySelector('#h-time').textContent }; }'''
async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        st0 = await page.evaluate(STATE); print('start', json.dumps(st0, ensure_ascii=False))
        if len(st0['lvls']) != 3: fails.append('wave 1: 3 heroes ' + str(st0['lvls']))
        for w in range(1, 5):
            print('build', await page.evaluate(BUILD))
            await page.click('#btn-action'); await page.clock.run_for(300)
            # watch a chain pile up and get cashed in
            seen_chain = False
            for k in range(60):
                r = await page.evaluate(RUNW, 1.0 + k * 0.5)
                s = await page.evaluate(STATE)
                if s['chain']: seen_chain = True
                if r != 'mid': break
                if k == 6 and w == 2: await page.screenshot(path=OUT + 'raid_w2.png')
            r = await page.evaluate(RUNW, 0)
            st = await page.evaluate(STATE); print('end', r, json.dumps(st, ensure_ascii=False))
            if w == 1 and not seen_chain: fails.append('no chain seen in wave 1')
            if st['pays'] < 1: fails.append('wave %d: no chain paid' % w)
            if abs(st['essHeart'] + st['essWave'] - st['score']) > 1.0 + 0.02 * st['score']: fails.append('wave %d: heart %s + purse %s != score %s' % (w, st['essHeart'], st['essWave'], st['score']))
            if w >= 2 and st['hunger'] and st['hunger']['fed'] != (st['score'] >= st['need'] - 0.01): fails.append('wave %d: fed flag mismatch' % w)
            if st['store'] is not None: fails.append('heart store still there')
            k = await page.evaluate("__yatd.modalKind")
            if k != 'settle': fails.append('wave %d: reckoning first, got %s' % (w, k))
            else:
                await page.clock.run_for(900)
                if w == 2: await page.screenshot(path=OUT + 'settle_mid_w2.png')
                txt = await page.evaluate("document.querySelector('#card').innerText.replace(/\\n/g,' | ')"); print('settle', txt[:220])
                await page.clock.run_for(4000)
                if w == 2: await page.screenshot(path=OUT + 'settle_end_w2.png')
                await page.clock.run_for(6000)
                k1 = await page.evaluate("__yatd.modalKind")
                if k1 != 'settle': fails.append('wave %d: 1.02 the reckoning waits for Dalej, got %s' % (w, k1))
                await page.mouse.click(195, 200); await page.clock.run_for(500)   # a tap on the card does not move on
                if await page.evaluate("__yatd.modalKind") != 'settle': fails.append('wave %d: a tap on the card left the reckoning' % w)
                await page.click('#settle-next'); await page.clock.run_for(500)
                k2 = await page.evaluate("__yatd.modalKind"); print('after settle', k2)
                if k2 != 'wave': fails.append('wave %d: Dalej leads to the summary, got %s' % (w, k2))
            if w == 2: await page.screenshot(path=OUT + 'summary_w2.png')
            for i in range(8):
                k = await page.evaluate("__yatd.modalKind")
                if not k: break
                if k == 'shop': await page.evaluate("(() => { const G=__yatd; if (G.run.freePicks>0) { const c=[...document.querySelectorAll('#card .offer-buy, #card [id^=offer-buy]')].find(b=>!b.disabled); if (c) { c.click(); return; } } const x = document.querySelector('#shop-close'); if (x) x.click(); else G.closeModal(); })()")
                elif k == 'over': print('OVER'); break
                else: await page.evaluate("(() => { const b = document.querySelector('#card .btn.primary'); if (b) b.click(); else __yatd.closeModal(); })()")
                await page.clock.run_for(250)
            if await page.evaluate("__yatd.modalKind") == 'over': break
            print('next build', json.dumps(await page.evaluate(STATE), ensure_ascii=False))
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
