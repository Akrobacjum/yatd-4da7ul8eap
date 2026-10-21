# 1.15.1 (author: the first tip in a wave did not stop the game; every tip should stop it until you confirm it or do what it
# says; the tutorial's tip in the shop was gone before it could be read): in the guide's first wave the first tip stops the
# game until Rozumiem; the first check's card stops it, and while that check waits the world stands; the hero-card tip and the
# hold tip stop it until done (the hold itself lets the game go, fast); the shop's tutorial card stays until Rozumiem.
import asyncio, json
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
ST = "() => { const G = __yatd, c = document.querySelector('#coach'); return { tut: G.run.tut, id: (G.TUT[G.run.tut] || {}).id, paused: G.paused, ts: G.timeScale(), coach: !c.hidden, text: c.textContent.slice(0, 50), pop: G.tutPopNow, check: !!(G.fl.check && !G.fl.check.result), ff: G.ff }; }"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        fails = []; out = {}
        def ok(c, m):
            if not c: fails.append(m)
        await page.evaluate("() => { const G = __yatd; localStorage.clear(); while (G.modalKind) G.closeModal(); G.setUser(false); G.startGuided(); while (G.modalKind) G.closeModal(); G.run.tut = G.TUT.findIndex(s => s.id === 'go'); G.startWave(); }")
        await page.clock.run_for(600)
        s = await page.evaluate(ST); out['novice'] = s
        ok(s['id'] == 'novice' and s['coach'] and s['paused'] and s['ts'] == 0, 'the first tip of the wave stops the game (%s)' % s)
        await page.clock.run_for(3000)
        t0 = await page.evaluate("() => __yatd.fl.time")
        ok(t0 < 0.05, 'and the wave stands while it is up (%.2f s)' % t0)
        await page.click('#coach .next'); await page.clock.run_for(800)
        s = await page.evaluate(ST); out['ack'] = s
        ok(not s['paused'] and not s['coach'] and s['id'] == 'novice', 'Rozumiem lets the game go, the tip goes (%s)' % s)
        for k in range(240):   # the first check
            await page.clock.run_for(500)
            s = await page.evaluate(ST)
            if s['pop'] == 'check' or s['id'] == 'check': break
        out['pop'] = s
        ok(s['pop'] == 'check' and s['paused'], 'the first check comes with its card and the game stands (%s)' % s)
        await page.click('#coach .next'); await page.clock.run_for(300)
        s = await page.evaluate(ST); out['check'] = s
        ok(s['id'] == 'check' and s['coach'] and (not s['check'] or s['ts'] == 0), 'under the check step the world stands while the check waits (%s)' % s)
        if s['check']:
            t1 = await page.evaluate("() => __yatd.fl.time"); await page.clock.run_for(200); t2 = await page.evaluate("() => __yatd.fl.time")
            ok(abs(t2 - t1) < 1e-6, 'no wave time passes under the first check (%.3f)' % (t2 - t1))
            await page.evaluate("() => { const G = __yatd, c = G.fl.check; G.resolveCheck((c.r0 + c.r1) / 2); }")
        for k in range(20):
            await page.clock.run_for(500)
            s = await page.evaluate(ST)
            if s['id'] == 'herocard' and s['coach']: break
        out['hero'] = s
        ok(s['id'] == 'herocard' and s['paused'] and s['ts'] == 0, 'the hero-card tip stops the game (%s)' % s)
        await page.evaluate("() => [...document.querySelectorAll('#coach .skip')].find(b => b.textContent === 'Pomiń krok').click()"); await page.clock.run_for(300)
        s = await page.evaluate(ST); out['ff'] = s
        ok(s['id'] == 'ff' and s['paused'], 'the hold tip stops the game too (%s)' % s)
        box = await page.evaluate("() => { const r = document.querySelector('#cv').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.6]; }")
        await page.mouse.move(box[0], box[1]); await page.mouse.down(); await page.clock.run_for(500)
        s = await page.evaluate(ST); out['hold'] = s
        await page.mouse.up(); await page.clock.run_for(300)
        ok(s['ff'] and not s['paused'], 'the held finger lets the game go, fast (%s)' % s)
        s = await page.evaluate(ST); out['after'] = s
        ok(s['id'] != 'ff' and not s['paused'], 'the hold tip is done, nothing holds the game (%s)' % s)
        # the shop: the tutorial's card stays until Rozumiem, a card taken also ends it
        await page.evaluate("() => { const G = __yatd; G.fl.heroes.forEach(h => { h.hp = 0; h.dead = true; }); }")
        for k in range(40):
            await page.clock.run_for(500)
            if await page.evaluate("() => __yatd.modalKind"): break
        for k in range(6):
            if await page.evaluate("() => __yatd.modalKind") == 'shop': break
            await page.evaluate("() => { const b = document.querySelector('#card .primary'); if (b) b.click(); }"); await page.clock.run_for(600)
        await page.clock.run_for(5000)
        tip = await page.evaluate("() => { const t = document.querySelector('#shop-tip'); return t ? getComputedStyle(t).opacity : null; }")
        out['shopTip'] = tip
        ok(tip == '1', 'the shop tip is still up after 5 s (%s)' % tip)
        await page.click('#shop-tip-ok'); await page.clock.run_for(300)
        ok(not await page.evaluate("() => !!document.querySelector('#shop-tip')"), 'Rozumiem closes the shop tip')
        print(json.dumps(out, ensure_ascii=False))
        print('FAILS', fails + (['page errors %s' % errs[:2]] if errs else []))
        await b.close()
asyncio.run(main())
