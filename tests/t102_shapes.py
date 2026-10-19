# 1.02: every check shape rendered mid-way (live), in prep, and with a result; screenshots for a look
import asyncio, sys
from playwright.async_api import async_playwright
URL = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots102/' + (sys.argv[1] if len(sys.argv) > 1 else 'after') + '_'
SH = [('bar','spikes'),('fuse','powder'),('ring','fire'),('double','portrait'),('spiral','web'),('pulse','cage'),('swing','goblin')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.install(); await pg.goto(URL); await pg.clock.run_for(500)
        await pg.evaluate("""() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal(); G.startWave(); for (let i = 0; i < 40; i++) G.step(0.05); }""")
        await pg.clock.run_for(3000)
        for sh, typ in SH:
            for mode in ['live', 'prep', 'crit']:
                await pg.evaluate("""([sh, typ, mode]) => { const G = __yatd, f = G.fl, now = G.realNow, dur = 6000;
                  const P = G.shortestPath(), q = P[Math.floor(P.length * 0.3)];
                  f.check = { it: { type: typ, x: q[0], y: q[1] }, extra: sh === 'bar' ? [{ type: 'arrows', x: q[0] + 1, y: q[1] }] : [], shape: sh, maxL: 9, t0: mode === 'prep' ? now + 1e6 : now - 0.38 * dur, prepT0: now, go: true, dur,
                    g0: 0.2, g1: 0.42, r0: 0.42, r1: 0.5, z2: sh === 'double' ? { g0: 0.6, g1: 0.75, r0: 0.75, r1: 0.81 } : null, rot: 0.6, lethalOk: false, lethalCrit: true,
                    result: mode === 'crit' ? 'crit' : null, p: mode === 'crit' ? 0.46 : undefined, resT: 1e12, note: ' · 3 bohaterów' }; }""", [sh, typ, mode])
                await pg.evaluate('document.querySelector("#toast").hidden = true'); await pg.clock.run_for(40)
                r = await pg.evaluate("(() => { const c = __yatd.fl.check, cv = document.querySelector('#cv').getBoundingClientRect(); return [cv.top + c.box.y, cv.top + c.box.y + c.box.h]; })()")
                y0 = max(0, r[1] - 300)
                await pg.screenshot(path=OUT + '%s_%s.png' % (sh, mode), clip={"x": 0, "y": y0, "width": 390, "height": 300})
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
