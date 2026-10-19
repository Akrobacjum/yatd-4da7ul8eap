# 1.04: wave 1 (2 heroes walking together, camera zoomed in): frame times 1.02 vs 1.03, and what the tile cache does
import asyncio, json, sys, re
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
src = open(SC + 'test/replay101.py').read()
JS = re.search(r'JS = r"""(.*?)"""', src, re.S).group(1)
SETUP = JS[:JS.index('  G.startWave();\n')] + '  G.startWave(); return 1;\n}'
DOCS = [('mateusz_w1', SC + 'real104/waves/mvfangk12omy_01.json'), ('irys_w1', SC + 'real104/waves/mvffw4cz2nci_01.json')]
PAGES = sys.argv[1].split(',') if len(sys.argv) > 1 else ['page102', 'page15']
INIT = """(() => { const W = window; W.__ft = []; const raf = W.requestAnimationFrame.bind(W); let last = 0;
  W.requestAnimationFrame = cb => raf(ts => { const t0 = performance.now(); cb(ts); const t1 = performance.now(); if (W.__ftOn) W.__ft.push([t0 - last, t1 - t0]); last = t0; }); })();"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for pg in PAGES:
            for name, f in DOCS:
                ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2.75); await ctx.add_init_script(INIT)
                page = await ctx.new_page(); cdp = await ctx.new_cdp_session(page); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
                await page.goto('file://' + SC + 'test/' + pg + '.html'); await page.wait_for_timeout(1000)
                d = json.load(open(f))
                await page.evaluate(SETUP, [d, 0, [0, 1], 0.9, None, {}, 'v12', [1.0, 1.0, []], ['gauss', 0.037, 1.9]])
                await page.evaluate("(() => { const G = __yatd; window.__log = []; setInterval(() => { const f = G.fl; if (f.check && !f.check.result && G.realNow - f.check.t0 > 0.4) { G.resolveCheck((f.check.r0 + f.check.r1) / 2); } }, 100);"
                    " setInterval(() => { const T = G.TC; window.__log.push([+G.cam.s.toFixed(1), T ? (T.made || 0) : -1, T ? T.map.size : -1, T ? Math.round(T.px / 1e3) : -1, G.SPLIT ? +G.SPLIT.k.toFixed(2) : -1, G.fl.phase]); }, 1000); })()")
                await page.evaluate("window.__ft = []; window.__ftOn = true")
                await page.wait_for_timeout(12000)
                ft = await page.evaluate("window.__ftOn = false, window.__ft")
                log = await page.evaluate("window.__log")
                gaps = sorted(x[0] for x in ft[1:]); js = sorted(x[1] for x in ft)
                q = lambda a, k: a[min(len(a) - 1, int(len(a) * k))] if a else 0
                print('%-8s %-10s frames %3d in 12 s | gap median %5.1f p90 %5.1f max %5.1f | js median %5.1f p90 %5.1f max %5.1f' % (pg, name, len(ft), q(gaps, 0.5), q(gaps, 0.9), gaps[-1] if gaps else 0, q(js, 0.5), q(js, 0.9), js[-1] if js else 0), flush=True)
                print('   per second [zoom, chunks made total, cache size, kpx, split]:', [l[:5] for l in log], flush=True)
                await ctx.close()
        await b.close()
asyncio.run(main())
