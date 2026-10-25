# 1.27.8: deck and stash cards are dragged to a new place (the order matters for Kopista) and held to sell, in the shop and in the tray
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])
SET = r"""() => { const { G } = T; T.fresh(5); const run = G.run; run.tut = -1; run.deckSize = 5; run.deck = ['cooldown', 'copyist', 'sharp', 'heavy', 'heartguide']; run.stash = ['essence' in G.UPG ? 'essence' : 'sharp']; run.heartPicks = []; G.recomputeMods(); G.fl.essence = 50;
  while (G.modalKind) G.closeModal(); G.openModal({ type: 'shop', between: true }); return true; }"""
async def center(pg, sel):
    r = await pg.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }", sel)
    return r
async def drag(pg, a, b, steps=12):
    await pg.mouse.move(a[0], a[1]); await pg.mouse.down(); await pg.wait_for_timeout(40)
    for k in range(1, steps + 1): await pg.mouse.move(a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps); await pg.wait_for_timeout(16)
    await pg.mouse.up(); await pg.wait_for_timeout(200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); fails = []; out = {}
        ctx, pg, errs = await fresh_page(b, 390, 844)
        await pg.evaluate(SET); await pg.wait_for_timeout(700)
        D = lambda: pg.evaluate("[__yatd.run.deck.slice(), __yatd.run.stash.slice(), Math.round(__yatd.fl.essence), __yatd.copyTarget('copyist'), __yatd.modalKind]")
        out['start'] = await D()
        # 1. reorder: heavy (deck index 3) onto slot 1 (copyist) -> Kopista copies what is right of it
        await drag(pg, await center(pg, '.slots .slot[data-ck="d"][data-ci="3"]'), await center(pg, '.slots .slot[data-ck="d"][data-ci="1"]'))
        out['reorder'] = d = await D()
        if d[0][:4] != ['cooldown', 'heavy', 'copyist', 'sharp'] or d[3] != 'sharp': fails.append('reorder: ' + json.dumps(d))
        # 2. deck card onto an empty stash slot
        await drag(pg, await center(pg, '.slots .slot[data-ck="d"][data-ci="0"]'), await center(pg, '.slots .slot[data-ck="s"][data-ci="-1"]'))
        out['tostash'] = d = await D()
        if 'cooldown' in d[0] or 'cooldown' not in d[1]: fails.append('to stash: ' + json.dumps(d))
        # 3. a stash card onto a deck card: they swap
        await drag(pg, await center(pg, '.slots .slot[data-ck="s"][data-ci="0"]'), await center(pg, '.slots .slot[data-ck="d"][data-ci="0"]'))
        out['swap'] = d = await D()
        if d[0][0] == 'heavy' or 'heavy' not in d[1]: fails.append('swap: ' + json.dumps(d))
        # 4. a gift card does not move
        g0 = await D(); gi = g0[0].index('heartguide')
        await drag(pg, await center(pg, '.slots .slot[data-ck="d"][data-ci="%d"]' % gi), await center(pg, '.slots .slot[data-ck="d"][data-ci="0"]'))
        if (await D())[0] != g0[0]: fails.append('a gift card moved')
        # 5. hold to sell
        e0 = (await D())[2]; c = await center(pg, '.slots .slot[data-ck="d"][data-ci="0"]'); name0 = (await D())[0][0]
        await pg.mouse.move(*c); await pg.mouse.down(); await pg.wait_for_timeout(1150); await pg.mouse.up(); await pg.wait_for_timeout(250)
        out['sell'] = d = await D()
        if d[2] <= e0 or len(d[0]) != len(g0[0]) - 1: fails.append('hold to sell: ' + json.dumps([e0, d]))
        sheet = await pg.evaluate("!!document.querySelector('#shop-sheet')")
        if sheet: fails.append('the hold also opened the card')
        # 6. a tap still opens the card
        c = await center(pg, '.slots .slot[data-ck="d"][data-ci="0"]'); await pg.mouse.click(*c); await pg.wait_for_timeout(250)
        if not await pg.evaluate("!!document.querySelector('#shop-sheet')"): fails.append('a tap opens the card')
        # 7. the tray: up then sideways moves a card; a sideways swipe does not
        await pg.evaluate("() => { while (__yatd.modalKind) __yatd.closeModal(); __yatd.setTrayOpen && __yatd.setTrayOpen(true); __yatd.setTab('deck'); }"); await pg.wait_for_timeout(400)
        await pg.evaluate("() => { const t = document.querySelector('#tray'), e = t.querySelector('.dslot[data-ck=\"d\"][data-ci=\"0\"]'); t.scrollLeft = e.offsetLeft - 10; }"); await pg.wait_for_timeout(300)
        t0 = (await D())[0]
        a = await center(pg, '#tray .dslot[data-ck="d"][data-ci="0"]'); bb = await center(pg, '#tray .dslot[data-ck="d"][data-ci="1"]')
        if a and bb:
            await pg.mouse.move(*a); await pg.mouse.down()
            for k in range(1, 6): await pg.mouse.move(a[0], a[1] - 4 * k); await pg.wait_for_timeout(16)
            for k in range(1, 13): await pg.mouse.move(a[0] + (bb[0] - a[0]) * k / 12, a[1] - 20 + (bb[1] - a[1] + 20) * k / 12); await pg.wait_for_timeout(16)
            await pg.mouse.up(); await pg.wait_for_timeout(250)
            out['tray'] = t1 = (await D())[0]
            if t1 == t0: fails.append('tray drag: ' + json.dumps([t0, t1]))
        else: fails.append('tray tiles missing')
        out['copytag'] = await pg.evaluate("[...document.querySelectorAll('#tray .dslot .dtag')].map(e => e.textContent).filter(t => /kopiuje|nic nie/.test(t))")
        fails += ['page error: ' + e for e in errs]
        print(json.dumps(out, ensure_ascii=False)); await ctx.close(); await b.close(); print('FAILS', fails); sys.exit(1 if fails else 0)
asyncio.run(main())
