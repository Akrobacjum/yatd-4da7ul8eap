# 1.02: full screen keeps a gap at the top (28px at least), the setting adds more; the normal page is unchanged
import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots101/'
PAD = "(() => { const a = document.querySelector('#app'), o = document.querySelector('#overlay'); return { app: getComputedStyle(a).paddingTop, hudTop: Math.round(document.querySelector('.hud').getBoundingClientRect().top), overlay: getComputedStyle(o).paddingTop, full: !!document.fullscreenElement, stageH: Math.round(document.querySelector('#stage').getBoundingClientRect().height), cvH: document.querySelector('#cv').height }; })()"
async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
        page = await ctx.new_page(); errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(BASE); await page.wait_for_timeout(600)
        n = await page.evaluate(PAD); print('normal', n)
        if n['app'] != '8px': fails.append('normal page changed: ' + n['app'])
        # full screen from a tap (as the web version does on Start)
        await page.evaluate("document.body.addEventListener('click', () => document.documentElement.requestFullscreen().catch(e => console.log('fs', e)), { once: true })")
        await page.mouse.click(5, 5); await page.wait_for_timeout(500)
        f = await page.evaluate(PAD); print('fullscreen', f)
        if not f['full']: print('  (headless gave no full screen; checking the display-mode rule instead)')
        else:
            if f['app'] != '28px' or f['overlay'] != '28px': fails.append('full screen top gap: %s / %s' % (f['app'], f['overlay']))
        # the setting adds to it
        await page.evaluate("(() => { const G = __yatd; G.S.topPad = 16; document.documentElement.style.setProperty('--top-extra', '16px'); })()")
        await page.wait_for_timeout(400)
        g = await page.evaluate(PAD); print('fullscreen +16', g)
        if f['full'] and g['app'] != '44px': fails.append('extra gap: ' + g['app'])
        # 1.24: the canvas covers the whole screen under the UI (no frame), so it does not shrink with the gap
        await page.screenshot(path=OUT + 'top_fullscreen.png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 200})
        # the settings screen has the slider
        await page.evaluate("(() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.openModal({ type: 'settings' }); })()"); await page.wait_for_timeout(300)
        has = await page.evaluate("!!document.querySelector('#sl-topPad')"); print('slider', has)
        if not has: fails.append('no slider')
        await page.fill('#sl-topPad', '8'); await page.dispatch_event('#sl-topPad', 'input'); await page.wait_for_timeout(200)
        v = await page.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--top-extra').trim(), JSON.parse(localStorage.getItem('yatd12-settings')).topPad]"); print('after slider', v)
        if v != ['8px', 8]: fails.append('slider does not apply / save')
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
