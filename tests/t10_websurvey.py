import asyncio, json, subprocess, time
from playwright.async_api import async_playwright
D='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
srv = subprocess.Popen(['python3', '-m', 'http.server', '8766', '--bind', '127.0.0.1'], cwd=D + 'webtest', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
PLAY1 = r'''() => { const G = __yatd; const f = G.fl; f.essence = 60; let k = 0;
    for (let y = 0; y < G.WH && k < 6; y++) for (let x = 0; x < G.WW && k < 6; x++) { const t = ['spikes', 'arrows'][k % 2]; if (G.canPlace(t, x, y) && G.tryPlace(t, x, y)) k++; }
    G.startWave(); let g = 0;
    while (g++ < 20000) { const fl = G.fl; if (G.modalKind) break; if (fl.check) { if (!fl.check.result) G.resolveCheck((fl.check.g0 + fl.check.g1) / 2); G.clearCheck(); continue; } if (fl.phase !== 'raid') break; G.step(0.05); if (fl.ending !== null) { fl.ending -= 0.05; if (fl.ending <= 0) { fl.ending = null; G.finishWave(); } } }
    return G.modalKind; }'''
async def quit_run(page):
    while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
    await page.click('#btn-settings'); await page.wait_for_timeout(200)
    q = await page.locator('#card .btn', has_text='Zakończ run').element_handle()
    await q.click(); await page.wait_for_timeout(100); await q.click(); await page.wait_for_timeout(500)
async def main():
    fails = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for variant in ['send', 'skip']:
                ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
                page = await ctx.new_page(); errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
                posts = []
                async def handle(route):
                    try: posts.append(json.loads(route.request.post_data))
                    except Exception as e: posts.append({'bad': str(e)})
                    await route.fulfill(status=200, body='ok')
                await page.route('https://script.google.com/**', handle)
                await page.route('https://fonts.googleapis.com/**', lambda r: r.abort()); await page.route('https://fonts.gstatic.com/**', lambda r: r.abort())
                await page.goto('http://127.0.0.1:8766/'); await page.wait_for_timeout(1000)
                await page.click('#start-play'); await page.wait_for_timeout(300)
                while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
                await page.evaluate(PLAY1); await page.wait_for_timeout(500)
                await quit_run(page)
                mk = await page.evaluate("__yatd.modalKind")
                print(variant, 'after first run end', mk)
                if mk != 'survey': fails.append(variant + ': survey after the first run')
                await page.screenshot(path=D + f'look/survey_{variant}.png', full_page=False)
                if variant == 'send':
                    for t in ['4', 'Po chwili tak', 'Pułapki w akcji', 'Za długie fale albo run', 'Tak']:
                        await page.locator('.survey .opts button', has_text=t).first.click()
                    await page.fill('#survey-text', 'Test ankiety')
                    await page.click('#survey-send'); await page.wait_for_timeout(600)
                else:
                    await page.click('#survey-skip'); await page.wait_for_timeout(400)
                mk2 = await page.evaluate("__yatd.modalKind")
                sv = [q for q in posts if q.get('c') == 'survey']
                print(variant, 'then', mk2, 'survey posts', [(q['id'], q['d']['answers'], q['d']['text'], q['d']['device'][:6]) for q in sv])
                if mk2 != 'end': fails.append(variant + ': the run summary after the survey')
                if variant == 'send' and (len(sv) != 1 or sv[0]['d']['answers'].get('fun') != '4' or sv[0]['d']['text'] != 'Test ankiety'): fails.append('survey sent with the answers')
                if variant == 'skip' and sv: fails.append('skip sends nothing')
                runs = [q for q in posts if q.get('c') == 'runs']
                if not runs or not runs[-1]['d'].get('device'): fails.append(variant + ': runs carry the device id')
                # a second run on the same phone: straight to the summary
                await page.evaluate("(() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal(); })()")
                await page.evaluate(PLAY1); await page.wait_for_timeout(300)
                await quit_run(page)
                mk3 = await page.evaluate("__yatd.modalKind")
                print(variant, 'second run end', mk3)
                if mk3 != 'end': fails.append(variant + ': no survey the second time')
                # the menu: offers the survey only until it is answered
                while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
                await page.evaluate("(() => { const G = __yatd; G.newRun(false); while (G.modalKind) G.closeModal(); })()")
                await page.click('#btn-settings'); await page.wait_for_timeout(200)
                has = await page.locator('#card .btn', has_text='Ankieta').count()
                print(variant, 'menu has survey', has)
                if (variant == 'send') != (has == 0): fails.append(variant + ': menu survey button')
                print(variant, 'errs', errs[:3])
                await ctx.close()
            print('FAILS', fails)
            await b.close()
    finally:
        srv.terminate()
asyncio.run(main())
