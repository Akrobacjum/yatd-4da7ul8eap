# 1.07: the music: it starts with the first touch, Loch while building, Fala in a running wave, Loch again when the tray
# pauses the wave; the setting at 0 keeps it silent; nothing breaks the game.
import asyncio
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
async def main():
    fails = []
    ok = lambda c, m: None if c else fails.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(BASE); await page.wait_for_timeout(600)
        st0 = await page.evaluate("({ timer: !!__yatd.MUS.timer, bus: !!__yatd.MUS.bus })")
        ok(not st0['timer'], 'no music before a touch')
        await page.click('#start-play'); await page.wait_for_timeout(700)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.wait_for_timeout(400)
        st1 = await page.evaluate("({ timer: !!__yatd.MUS.timer, want: __yatd.MUS.want, step: __yatd.MUS.step, a: __yatd.MUS.g.A.gain.value })")
        print('after the first touch', st1)
        ok(st1['timer'] and st1['want'] == 'A' and st1['step'] > 0, 'music plays (Loch) in the build phase')
        await page.evaluate("__yatd.startWave()"); await page.wait_for_timeout(1800)
        st2 = await page.evaluate("({ want: __yatd.MUS.want, a: __yatd.MUS.g.A.gain.value, b: __yatd.MUS.g.B.gain.value })")
        print('in the wave', st2)
        ok(st2['want'] == 'B' and st2['b'] > 0.8 and st2['a'] < 0.2, 'Fala in a running wave (crossfaded)')
        await page.evaluate("__yatd.setTrayOpen(true)"); await page.wait_for_timeout(1600)
        st3 = await page.evaluate("({ want: __yatd.MUS.want, a: __yatd.MUS.g.A.gain.value, paused: __yatd.paused })")
        print('tray open', st3)
        ok(st3['want'] == 'A' and st3['paused'] and st3['a'] > 0.8, 'the tray pauses the wave and the music goes back to Loch')
        await page.evaluate("__yatd.setTrayOpen(false)"); await page.wait_for_timeout(300)
        await page.evaluate("__yatd.S.music = 0"); await page.wait_for_timeout(800)
        st4 = await page.evaluate("({ bus: __yatd.MUS.bus.gain.value })")
        print('music 0', st4)
        ok(st4['bus'] < 0.02, 'the setting at 0 silences it')
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
