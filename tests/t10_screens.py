import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots151/'
PLAY = r'''(n) => { const G = __yatd; const out = [];
  for (let w = 0; w < n; w++) {
    while (G.modalKind) { if (G.modalKind === 'wave') { G.closeModal(); G.afterSummary(); } else G.closeModal(); }
    const f = G.fl; f.essence = 60; let k = 0;
    for (let y = 0; y < G.WH && k < 6; y++) for (let x = 0; x < G.WW && k < 6; x++) { const t = ['spikes', 'arrows', 'portrait', 'eyes'][k % 4]; if (G.canPlace(t, x, y) && G.tryPlace(t, x, y)) k++; }
    if (w === 1) { const P = G.shortestPath(); for (const q of P.slice(5)) if (G.canPlace('loot', q[0], q[1])) { G.tryPlace('loot', q[0], q[1]); break; } }
    G.startWave(); let g = 0;
    while (g++ < 20000) { const fl = G.fl; if (G.modalKind) break; if (fl.check) { if (!fl.check.result) G.resolveCheck((fl.check.g0 + fl.check.g1) / 2); G.clearCheck(); continue; } if (fl.phase !== 'raid') break; G.step(0.05); if (fl.ending !== null) { fl.ending -= 0.05; if (fl.ending <= 0) { fl.ending = null; G.finishWave(); } } }
    out.push(G.modalKind);
    if (G.run.crystals <= 0) break;
  }
  return out; }'''
FIT = r'''() => { const c = document.querySelector('#card'); const lists = [...c.querySelectorAll('.flist, .offers, .scr-body')].map(e => [e.className, e.scrollHeight, e.clientHeight]);
  return { card: [c.scrollHeight, c.clientHeight], over: lists.filter(l => l[1] > l[2] + 1), cls: c.className }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for (W, H) in [(360, 640), (360, 780), (412, 915)]:
            page = await (await b.new_context(viewport={'width':W,'height':H}, device_scale_factor=2)).new_page()
            errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
            await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
            await page.evaluate("(() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal(); G.run.crystals = 9; G.run.maxCrystals = 9; })()")
            r = await page.evaluate(PLAY, 4)
            await page.evaluate("if (__yatd.modalKind === 'settle') __yatd.closeModal()")   # 1.01: the reckoning first
            await page.clock.run_for(1200)
            print(W, H, 'modals', r, 'now', await page.evaluate("__yatd.modalKind"))
            if await page.evaluate("__yatd.modalKind") == 'wave':
                print(' wave fit', await page.evaluate(FIT))
                await page.screenshot(path=OUT+f'scr_wave_{W}x{H}.png')
                for tb in ['heroes', 'items', 'nums']:
                    await page.click('#wtab-' + tb); await page.clock.run_for(200)
                    print(' wave tab', tb, await page.evaluate(FIT))
                    if W == 360 and H == 780: await page.screenshot(path=OUT+f'scr_wave_{tb}.png')
                await page.click('#wave-next'); await page.clock.run_for(1200)
            print(' after next', await page.evaluate("__yatd.modalKind"))
            if await page.evaluate("__yatd.modalKind") == 'shop':
                await page.evaluate("(() => { const G = __yatd; const ids = G.UPGRADES.filter(u => u.kind === 'card').slice(0, 9).map(u => u.id); G.run.deck = ids.slice(0, 5); G.run.stash = ids.slice(5, 6); G.recomputeMods(); G.closeModal(); G.openModal({ type: 'shop' }); })()")
                await page.clock.run_for(1200)
                print(' shop fit', await page.evaluate(FIT), 'tiles fit', await page.evaluate("[...document.querySelectorAll('#card .offer')].map(o => o.dataset.fit)"))
                await page.screenshot(path=OUT+f'scr_shop_{W}x{H}.png')
                geo0 = await page.evaluate("[...document.querySelectorAll('#card .offers, #card .acts, #card .deckp, #shop-close')].map(e => Math.round(e.getBoundingClientRect().top))")
                await page.click('#offer-buy-1'); await page.clock.run_for(200)
                print(' bought', await page.evaluate("[document.querySelector('#offer-1').className, __yatd.run.deck.length, document.querySelector('#toast').hidden ? null : document.querySelector('#toast').innerText]"))
                geo1 = await page.evaluate("[...document.querySelectorAll('#card .offers, #card .acts, #card .deckp, #shop-close')].map(e => Math.round(e.getBoundingClientRect().top))")
                print(' layout before/after buy', geo0, geo1, 'same' if geo0 == geo1 else 'MOVED')
                await page.screenshot(path=OUT+f'scr_shop_bought_{W}x{H}.png')
                await page.click('#card .slot'); await page.clock.run_for(200)
                await page.screenshot(path=OUT+f'scr_shop_deck_{W}x{H}.png')
                print(' sheet', await page.evaluate("(() => { const s = document.querySelector('#shop-sheet'); return s ? [s.dataset.fit, s.querySelector('b').textContent] : null; })()"))
                geo2 = await page.evaluate("[...document.querySelectorAll('#card .offers, #card .acts, #card .deckp, #shop-close')].map(e => Math.round(e.getBoundingClientRect().top))")
                await page.click('#sheet-close'); await page.clock.run_for(200)
                print(' sheet closed', await page.evaluate("!document.querySelector('#shop-sheet')"))
                print(' layout after deck tap', geo2, 'same' if geo2 == geo0 else 'MOVED')
                await page.click('#shop-close'); await page.clock.run_for(200)
            await page.evaluate("(() => { const G = __yatd; G.run.result = 'end'; G.run.reason = 'Bohaterowie wynieśli wszystkie kryształy.'; G.openModal({ type: 'end' }); })()")
            await page.clock.run_for(1200)
            print(' end fit', await page.evaluate(FIT))
            await page.screenshot(path=OUT+f'scr_end_{W}x{H}.png')
            print(' errs', errs[:3])
            await page.close()
        await b.close()
asyncio.run(main())
