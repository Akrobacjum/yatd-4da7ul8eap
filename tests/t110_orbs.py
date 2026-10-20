# 1.10 (author, for consistency with Groza): gold orbs carry Chciwość from loot to its box in the equation, ice-blue ones carry
# Combo from a trap to its box; each box grows as its orbs land (what is still flying is not shown yet).
import asyncio
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
async def main():
    fails = []
    ok = lambda c, m: None if c else fails.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        lk = await page.evaluate("""(() => { const G = __yatd; G.fl.essence = 99; const P = G.shortestPath();
          for (const q of P.slice(3)) if (G.canPlace('loot', q[0], q[1])) { G.tryPlace('loot', q[0], q[1]); G.setMode(null); return q[0] + ',' + q[1]; } return null; })()""")
        ok(lk, 'loot placed')
        await page.evaluate("__yatd.startWave(); __yatd.setTrayOpen(false)"); await page.clock.run_for(300)
        await page.evaluate("__yatd.setPaused(true)"); await page.clock.run_for(900)   # (a hero may have seen it already: let those land)
        await page.evaluate("(k => { __yatd.fl.items.get(k).seenWave = null; })", lk)
        # greed: seeing the loot
        g = await page.evaluate("""(k => { const G = __yatd, f = G.fl, it = f.items.get(k), g0 = f.greed; G.noticeLoot(it, null);
            return { g0, g1: f.greed, fly: f.gFly, n: G.orbs.filter(o => o.to === 'greed').length }; })""", lk)
        await page.clock.run_for(60)
        shown0 = await page.evaluate("document.querySelector('#eq-c b').textContent")
        print('greed', g, 'shown while flying', shown0)
        ok(g['g1'] > g['g0'] and g['n'] >= 1 and abs(g['fly'] - (g['g1'] - g['g0'])) < 1e-9, 'gold orbs carry the greed it rose by (%s)' % g)
        fmt = lambda v: ('%.2f' % v).replace('.', ',')
        ok(shown0 == fmt(g['g0']), 'the box shows the old greed while its orbs fly (%s vs %s)' % (shown0, fmt(g['g0'])))
        mid = None; hit = False; px = 0
        for i in range(30):
            await page.clock.run_for(40)
            st = await page.evaluate("""(() => { const c = document.querySelector('#fx'), x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 3; k < x.length; k += 16) if (x[k] > 0) n++;
              return { t: document.querySelector('#eq-c b').textContent, hit: document.querySelector('#eq-c').classList.contains('hit'), px: n, fly: __yatd.fl.gFly }; })()""")
            px = max(px, st['px']); hit = hit or st['hit']
            if st['t'] not in (fmt(g['g0']), fmt(g['g1'])): mid = st['t']
        print('after', st, 'mid', mid, 'hit', hit, 'px', px)
        ok(st['fly'] == 0 and st['t'] == fmt(g['g1']), 'the box shows the new greed once they land (%s)' % st)
        ok(hit, 'the Chciwość box glows as they land')
        ok(px > 0, 'gold orbs drawn')
        # combo: two different traps one after another
        k = await page.evaluate("""(() => { const G = __yatd, f = G.fl; const h = G.alive()[0]; f.lastTrapC = f.cclock; f.lastTrapType = 'x'; f.combo = 1;
            const c0 = f.combo, n0 = G.orbs.filter(o => o.to === 'combo').length;
            const it = { type: 'spikes', x: Math.floor(h.x), y: Math.floor(h.y), cd: 0, lvl: 1 }; G.fire(it, 1);
            return { c0, c1: f.combo, fly: f.kFly, n: G.orbs.filter(o => o.to === 'combo').length - n0, live: G.comboLive() }; })()""")
        await page.clock.run_for(60)
        sk = await page.evaluate("document.querySelector('#eq-k b').textContent")
        print('combo', k, 'shown', sk)
        ok(k['c1'] == k['c0'] + 1 and k['n'] == 3 and abs(k['fly'] - 0.25) < 1e-9, 'ice orbs carry +0,25 combo (%s)' % k)
        ok(sk == '1,00', 'the Combo box shows the old combo while they fly (%s)' % sk)
        hitk = False
        for i in range(25):
            await page.clock.run_for(40)
            st = await page.evaluate("[document.querySelector('#eq-k b').textContent, document.querySelector('#eq-k').classList.contains('hit'), __yatd.fl.kFly]")
            hitk = hitk or st[1]
        print('combo after', st, hitk)
        ok(st[2] == 0 and st[0] == '1,25', 'the Combo box shows the new combo once they land (%s)' % st)
        ok(hitk, 'the Combo box glows as they land')
        # a combo that ends: the orbs still flying from it never dent the new one
        r = await page.evaluate("""(() => { const G = __yatd, f = G.fl, h = G.alive()[0]; f.lastTrapC = f.cclock; f.lastTrapType = 'x';
            G.fire({ type: 'blade', x: Math.floor(h.x), y: Math.floor(h.y), cd: 0, lvl: 1 }, 1);
            const run0 = f.kRun || 0; f.lastTrapC = -99; G.fire({ type: 'spikes', x: Math.floor(h.x), y: Math.floor(h.y), cd: 0, lvl: 1 }, 1);
            return { run0, run1: f.kRun, fly: f.kFly, combo: f.combo }; })()""")
        await page.clock.run_for(900)
        r2 = await page.evaluate("__yatd.fl.kFly")
        print('reset', r, r2)
        ok(r['run1'] == r['run0'] + 1 and r['fly'] == 0 and r['combo'] == 1 and r2 == 0, 'a new combo starts its own count (%s %s)' % (r, r2))
        ok(not errs, 'no page errors: %s' % errs[:3])
        await b.close()
    print('FAILS', fails if fails else 'none')
asyncio.run(main())
