# 1.04: zoomed in, the tiles are drawn directly (no chunk canvases), zoomed out the chunk cache is back; the wave log gets the
# frame times; an error inside a frame no longer stops the game loop; the drawing looks the same either way (vs 1.03's chunks).
import asyncio, json, re, base64, io
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
src = open(SC + 'test/replay101.py').read()
JS = re.search(r'JS = r"""(.*?)"""', src, re.S).group(1)
SETUP = JS[:JS.index('  G.startWave();\n')] + '  return 1;\n}'
FAILS = []
def ok(c, m):
    if not c: FAILS.append(m)
D = json.load(open(SC + 'real104/waves/mvfangk12omy_01.json'))
ARGS = [D, 0, [0, 1], 0.9, None, {}, 'v12', [1.0, 1.0, []], ['gauss', 0.037, 1.9]]
async def shot(page, s):
    await page.evaluate("s => { const G = __yatd; const c = document.querySelector('canvas'); G.cam.s = s; G.centerOn(G.fl.heart.x + 0.5, G.fl.heart.y + 0.5); G.cam.manualUntil = 1e9; }", s)
    await page.clock.run_for(200)
    return await page.evaluate("document.querySelector('canvas').toDataURL('image/png')")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        imgs = {}
        for pg in ['page15']:   # 1.07: no comparison with 1.03's picture any more (the camera is isometric now)
            page = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)).new_page()
            errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
            await page.clock.install(); await page.goto('file://' + SC + 'test/' + pg + '.html'); await page.clock.run_for(500)
            await page.evaluate(SETUP, ARGS); await page.clock.run_for(100)
            imgs[pg] = [await shot(page, 34), await shot(page, 12)]
            if pg == 'page15':
                await shot(page, 34); r = await page.evaluate("(() => { const T = __yatd.TC; return [!!T.direct, T.map.size]; })()")
                ok(r[0] and r[1] == 0, 'zoom 34: direct, no chunks (%s)' % r)
                await shot(page, 12); r = await page.evaluate("(() => { const T = __yatd.TC; return [!!T.direct, T.map.size]; })()")
                ok(r[0], 'a small dungeon whole on screen: direct (%s)' % r)
                big = json.load(open(SC + 'real103/waves/mvf7u7ufx25j_07.json'))
                await page.evaluate(SETUP, [big] + ARGS[1:]); await page.clock.run_for(100)
                await shot(page, 10); r = await page.evaluate("(() => { const T = __yatd.TC; return [!!T.direct, T.map.size]; })()")
                ok(not r[0] and r[1] > 0, 'a big dungeon zoomed out: chunks (%s)' % r)
                await shot(page, 34); r = await page.evaluate("(() => { const T = __yatd.TC; return [!!T.direct, T.map.size]; })()")
                ok(r[0] and r[1] == 0, 'back to zoom 34: direct, chunks freed (%s)' % r)
                await page.evaluate(SETUP, ARGS); await page.clock.run_for(100); await shot(page, 34)
                # a wave: frame times end up in the wave summary
                await page.evaluate("(() => { const G = __yatd; G.startWave(); G.setTrayOpen(false); setInterval(() => { const f = G.fl; if (f.check && !f.check.result) { G.resolveCheck((f.check.r0 + f.check.r1) / 2); } }, 200); })()")
                await page.clock.run_for(4000)
                ps = await page.evaluate("__yatd.perfSummary()")
                ok(ps is not None and ps['frames'] > 100 and 0 < ps['fps'] < 200 and ps['dpr'] == 2 and ps['direct'] > 50, 'perf summary %s' % ps)
                # an error inside a frame: the loop goes on, the error is noted
                before = await page.evaluate("__yatd.realNow")
                await page.evaluate("(() => { const f = __yatd.fl; window.__fx = f.fx; f.fx = null; })()")
                thrown = 0
                for _ in range(3):
                    try: await page.clock.run_for(20)
                    except Exception as e: thrown += 1   # the error thrown again from a timer stops the fake clock's run (not the game)
                await page.evaluate("(() => { __yatd.fl.fx = window.__fx || []; })()")
                for _ in range(10):   # 1.06: errors queued from the broken frames can still be thrown again here; they stop the fake clock's run, not the game
                    try: await page.clock.run_for(100)
                    except Exception as e: thrown += 1
                ok(thrown >= 1, 'the error was thrown again outside the loop (%d)' % thrown)
                after = await page.evaluate("[__yatd.realNow, __yatd.PERF.errs.slice()]")
                ok(after[0] - before > 0.5, 'the loop goes on after an error (%.2f s)' % (after[0] - before))
                ok(len(after[1]) >= 1 and 'null' in after[1][0] and '@frameBody:' in after[1][0], 'the error is noted: %s' % after[1][:1])
                errs.clear()
                # the wave ends: the summary carries perf
                await page.evaluate("(() => { const G = __yatd; G.fl.heroes.forEach(h => { h.hp = 0; h.dead = true; }); })()")
                await page.clock.run_for(6000)
                w = await page.evaluate("(() => { const r = __yatd.run; const w = r.waves[r.waves.length - 1]; return w ? [w.perf, w.errors || null] : null; })()")
                ok(w is not None and w[0] is not None and w[0]['frames'] > 100, 'wave summary has perf: %s' % (w and w[0]))
                ok(w is not None and w[1] and len(w[1]) >= 1, 'wave summary has the error: %s' % (w and w[1]))
                print('perf in the summary:', w and w[0]); print('errors:', w and w[1])
            print(pg, 'page errors', errs[:2])
        await b.close()
    print('FAILS', FAILS)
asyncio.run(main())
