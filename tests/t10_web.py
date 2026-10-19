import asyncio, json, subprocess, time, os
from playwright.async_api import async_playwright
D='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd=D + 'webtest', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
PLAY = r'''() => { const G = __yatd; const f = G.fl; f.essence = 60; let k = 0;
    for (let y = 0; y < G.WH && k < 6; y++) for (let x = 0; x < G.WW && k < 6; x++) { const t = ['spikes', 'arrows'][k % 2]; if (G.canPlace(t, x, y) && G.tryPlace(t, x, y)) k++; }
    G.startWave(); let g = 0;
    while (g++ < 20000) { const fl = G.fl; if (G.modalKind) break; if (fl.check) { if (!fl.check.result) G.resolveCheck((fl.check.g0 + fl.check.g1) / 2); G.clearCheck(); continue; } if (fl.phase !== 'raid') break; G.step(0.05); if (fl.ending !== null) { fl.ending -= 0.05; if (fl.ending <= 0) { fl.ending = null; G.finishWave(); } } }
    return G.modalKind; }'''
async def main():
    fails = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=3, is_mobile=True, has_touch=True,
                user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')
            page = await ctx.new_page()
            errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
            posts = []
            async def handle(route):
                req = route.request
                try: posts.append(json.loads(req.post_data))
                except Exception as e: posts.append({'bad': str(e)})
                await route.fulfill(status=200, body='ok')
            await page.route('https://script.google.com/**', handle)
            await page.route('https://fonts.googleapis.com/**', lambda r: r.abort())
            await page.route('https://fonts.gstatic.com/**', lambda r: r.abort())
            await page.goto('http://127.0.0.1:8765/'); await page.wait_for_timeout(1200)
            info = await page.evaluate("""(() => ({ web: !!window.YATD_WEB, row: !!document.querySelector('.webrow'), note: [...document.querySelectorAll('.webrow .note')].map(n => n.textContent),
              manifest: !!document.querySelector('link[rel=manifest]'), robots: document.querySelector('meta[name=robots]').content, sw: 'serviceWorker' in navigator,
              vp: document.querySelector('meta[name=viewport]').content, doctype: document.compatMode }))()""")
            print('start', json.dumps(info, ensure_ascii=False))
            if not info['row'] or not any('zapisuje' in n for n in info['note']): fails.append('web start row with the data line')
            if info['doctype'] != 'CSS1Compat': fails.append('standards mode')
            await page.screenshot(path=D + 'look/web_start.png')
            await page.click('#start-play'); await page.wait_for_timeout(500)
            fs = await page.evaluate("!!document.fullscreenElement")
            print('fullscreen after start tap', fs)
            while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
            await page.wait_for_timeout(800)
            await page.screenshot(path=D + 'look/web_build.png')
            mk = await page.evaluate(PLAY); await page.wait_for_timeout(1500)
            print('after wave', mk, 'posts', [(q.get('c'), q.get('id'), q.get('t') == 'MbXRWYl39HSknxQLoxzSAqdJ', len(json.dumps(q.get('d', {})))) for q in posts])
            if not any(q.get('c') == 'waves' for q in posts) or not any(q.get('c') == 'runs' for q in posts): fails.append('a wave and a run sent')
            if not all(q.get('t') == 'MbXRWYl39HSknxQLoxzSAqdJ' for q in posts): fails.append('token on every send')
            st = await page.evaluate("__yatd.run.logState")
            print('logState', st)
            if st != 'ok': fails.append('logState ok')
            reg = await page.evaluate("navigator.serviceWorker.getRegistration().then(r => !!r)")
            print('sw registered', reg)
            # overscroll and dvh
            css = await page.evaluate("[getComputedStyle(document.documentElement).overscrollBehaviorY, getComputedStyle(document.querySelector('#app')).height, innerHeight]")
            print('css', css)
            print('FAILS', fails); print('errs', errs[:3])
            await b.close()
    finally:
        srv.terminate()
asyncio.run(main())
