# 1.01: a new breach: the camera goes to it, the sheet sits at the top, the patch costs 20
import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots101/'
async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for (W, H) in [(390, 844), (360, 640)]:
            page = await (await b.new_context(viewport={'width':W,'height':H}, device_scale_factor=2)).new_page()
            errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
            await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
            r = await page.evaluate("""(() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal();
              const L = G.run.layout; let tries = 0;
              // dig a few rooms so a breach has somewhere to go
              G.fl.essence = 999;
              for (let k = 0; k < 6; k++) { const m = G.toolMarkers('dig'); if (m.length) G.applyTool(m[k % m.length]); }
              G.run.wave = 6; const ok = G.planBreach(); G.rebuildDungeon(true); G.startBuild(true);
              const cam0 = [G.cam.ox, G.cam.oy];
              G.openModal({ type: 'breach', fresh: true });
              const br = G.fl.breach, cr = document.querySelector('#card').getBoundingClientRect(), st = document.querySelector('#stage').getBoundingClientRect();
              const sx = (br.x + 0.5) * G.cam.s - G.cam.ox + document.querySelector('#cv').getBoundingClientRect().left, sy = (br.y + 0.5) * G.cam.s - G.cam.oy + document.querySelector('#cv').getBoundingClientRect().top;
              return { ok, breach: br ? [br.x, br.y] : null, cardBottom: Math.round(cr.bottom), screenH: innerHeight, breachOnScreen: [Math.round(sx), Math.round(sy)], stage: [Math.round(st.top), Math.round(st.bottom)], camMoved: cam0[0] !== G.cam.ox || cam0[1] !== G.cam.oy, ess: G.fl.essence, btn: document.querySelector('#sheet-patch').innerText.replace(/\\n/g, ' ') };
            })()""")
            print(W, H, json.dumps(r))
            if not r['ok']: fails.append('%d: no breach planned' % W)
            else:
                if r['cardBottom'] > r['screenH'] * 0.6: fails.append('%d: the sheet covers too much (%d of %d)' % (W, r['cardBottom'], r['screenH']))
                if not (r['cardBottom'] < r['breachOnScreen'][1] < r['stage'][1]): fails.append('%d: breach not visible under the sheet %s' % (W, r))
                if '20' not in r['btn']: fails.append('patch is 20')
            await page.clock.run_for(600)
            await page.screenshot(path=OUT + 'breach_%dx%d.png' % (W, H), timeout=120000)
            if r['ok']:
                e0 = await page.evaluate("__yatd.fl.essence")
                await page.click('#sheet-patch'); await page.clock.run_for(300)
                e1 = await page.evaluate("[__yatd.fl.essence, !!__yatd.fl.breach, __yatd.modalKind]"); print(' patched', e0, e1)
                if not (abs(e0 - e1[0] - 20) < 1e-6 and not e1[1] and not e1[2]): fails.append('patch failed')
            print(' errs', errs[:3])
        print('FAILS', fails)
        await b.close()
asyncio.run(main())
