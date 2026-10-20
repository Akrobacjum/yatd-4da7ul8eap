# 1.08: the build tray folds and unfolds only on a tap of its button, in step with the camera's tilt (same 0,45 s, same curve);
# the canvas is not made anew while it moves and the middle of the map stays put; a wave let out with the tray open waits
# for the fold; the speeds (quiet x2,5, held finger x5) also replace older saved ones.
import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
SAMPLE = """() => new Promise(res => { const out = [], t0 = performance.now(), b = document.querySelector('#drawer-body'), st = document.querySelector('#stage');
  const f = () => { const G = __yatd, c = G.cwch; out.push({ t: performance.now() - t0, bh: b.style.display === 'none' ? 0 : b.getBoundingClientRect().height, sh: st.getBoundingClientRect().height, p: G.VIEW.p, ch: c[1], cvh: c[3], k: G.TRAY.k });
    if (performance.now() - t0 < 700) requestAnimationFrame(f); else res(out); };
  document.querySelector('#tray-toggle').click(); requestAnimationFrame(f); })"""
async def main():
    fails = []
    ok = lambda c, m: None if c else fails.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        await ctx.add_init_script("try { if (!localStorage.getItem('yatd12-settings')) localStorage.setItem('yatd12-settings', JSON.stringify({ autoFF: 2, ffSpeed: 3, volume: 0.3 })); } catch (e) {}")
        page = await ctx.new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(BASE); await page.wait_for_timeout(500)
        sp = await page.evaluate("({ a: __yatd.S.autoFF, f: __yatd.S.ffSpeed, v: __yatd.S.volume })")
        print('speeds from an old save', sp)
        ok(sp['a'] == 2.5 and sp['f'] == 5 and abs(sp['v'] - 0.3) < 1e-9, 'quiet x2,5 and finger x5 replace old saved speeds, other settings stay')
        await page.click('#start-play'); await page.wait_for_timeout(700)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.wait_for_timeout(600)
        ok(await page.evaluate("__yatd.trayIsOpen()"), 'the tray is open in the build phase')
        bh0 = await page.evaluate("document.querySelector('#drawer-body').getBoundingClientRect().height")
        for label in ('fold', 'unfold'):
            c0 = await page.evaluate("__yatd.camCentre()")
            S = await page.evaluate(SAMPLE)
            c1 = await page.evaluate("__yatd.camCentre()")
            mid = [s for s in S if 0 < s['k'] < 1]
            end = next((s['t'] for s in S if s['k'] in (0, 1) and s['t'] > 50), None)
            # the tray's share against the camera's share (both 0..1 from open to folded)
            worst = max((abs(s['bh'] / bh0 - (s['p'] - 30) / 25) for s in mid), default=1)
            cvh = set(s['cvh'] for s in S)
            dc = abs(c1['x'] - c0['x']) + abs(c1['y'] - c0['y'])
            sums = [round(s['sh'] + s['bh'] + 6 * s['k']) for s in S]
            print(label, 'frames moving', len(mid), 'ends at ~ms', round(S[[i for i, s in enumerate(S) if s in mid][-1]]['t']) if mid else None, 'worst tray vs tilt', round(worst, 3), 'canvas heights', cvh, 'centre moved', round(dc, 3), 'stage+tray', min(sums), max(sums))
            ok(len(mid) >= 10, label + ': the tray moves over many frames')
            ok(worst < 0.06, label + ': the tray moves with the tilt')
            ok(len(cvh) == 1, label + ': the canvas is not made anew while the tray moves')
            ok(dc < 0.15, label + ': the middle of the map stays put')
            ok(max(sums) - min(sums) <= 2, label + ': stage and tray share the height without a jump')
            ok(all(s['ch'] == int(s['sh']) for s in S[3:]), label + ': ch follows the stage frame by frame')
        last = S[-1]; ok(last['k'] == 1 and abs(last['p'] - 55) < 0.01, 'unfolded: building view')
        # a wave let out with the tray open waits for the fold
        await page.evaluate("__yatd.startWave()"); await page.wait_for_timeout(1200)
        w = await page.evaluate("({ open: __yatd.trayIsOpen(), paused: __yatd.paused, t: __yatd.fl.time, lab: document.querySelector('#btn-action').textContent })")
        print('wave let out with the tray open', w)
        ok(w['open'] and w['paused'] and w['t'] == 0 and 'Fala czeka' in w['lab'], 'the wave waits, the tray stays open, the button says so')
        await page.click('#tray-toggle'); await page.wait_for_timeout(1500)
        w2 = await page.evaluate("({ open: __yatd.trayIsOpen(), paused: __yatd.paused, t: __yatd.fl.time, lab: document.querySelector('#btn-action').textContent, p: __yatd.VIEW.p })")
        print('after the fold', w2)
        ok(not w2['open'] and not w2['paused'] and w2['t'] > 0.5 and 'Fala trwa' in w2['lab'] and abs(w2['p'] - 30) < 0.01, 'the fold lets the wave go, wave view')
        # a bubble, for the eye
        await page.evaluate("""(() => { const G = __yatd, hs = G.fl.heroes.filter(h => !h.dead); if (!hs.length) return;
          hs[0].bubble = { text: 'Słyszysz to? Coś skrzypi pod podłogą...', prio: 1, at: G.fl.time - 1, until: G.fl.time + 60 };
          if (hs[1]) hs[1].bubble = { text: 'Kryształ! Biegnę po niego!', prio: 3, at: G.fl.time - 1, until: G.fl.time + 60 };
          G.setTrayOpen(true); })()""")
        await page.wait_for_timeout(900)
        await page.screenshot(path='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/e108/bubbles_raid.png')
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
