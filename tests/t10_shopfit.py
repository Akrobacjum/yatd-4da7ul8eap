import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/look/'
SETUP = r'''() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal();
  const ids = G.UPGRADES.slice().sort((a, b) => (b.text.length + b.name.length * 3) - (a.text.length + a.name.length * 3)).map(u => u.id);
  G.run.deck = ids.slice(0, 7); G.run.stash = ids.slice(7, 10); G.recomputeMods(); return ids; }'''
SHOW = r'''(four) => { const G = __yatd; G.run.shop.ids = four; G.run.freePicks = 0; G.fl.essence = 30; G.closeModal(); G.openModal({ type: 'shop' }); }'''
CHECK = r'''() => { const c = document.querySelector('#card');
  const tiles = [...c.querySelectorAll('.cdetail, .sheet')].map(o => ({ id: o.id, fit: o.dataset.fit, fs: o.querySelector('.tx').style.fontSize, nm: o.querySelector('b').style.fontSize, name: o.querySelector('b').textContent }));
  return { tiles, card: [c.scrollHeight, c.clientHeight], body: [c.querySelector('.scr-body').scrollHeight, c.querySelector('.scr-body').clientHeight] }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for (W, H) in [(360, 640), (360, 780), (412, 915), (320, 568)]:
            page = await (await b.new_context(viewport={'width':W,'height':H}, device_scale_factor=2)).new_page()
            errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
            await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
            ids = await page.evaluate(SETUP)
            bad = []; minfs = 99; n = 0
            for k in range(0, len(ids), 4):
                four = ids[k:k+4]
                if len(four) < 4: four = (four + ids)[:4]
                await page.evaluate(SHOW, four); await page.clock.run_for(1000)
                rs = []
                for j in range(4):   # 1.27.3: every card's whole text shows in the panel under the cards
                    if j: await page.click('#offer-%d' % j); await page.clock.run_for(300)
                    rs.append(await page.evaluate(CHECK))
                r = {'tiles': [t for x in rs for t in x['tiles']], 'card': max((x['card'] for x in rs), key=lambda v: v[0] - v[1]), 'body': max((x['body'] for x in rs), key=lambda v: v[0] - v[1])}
                for t in r['tiles']:
                    n += 1; fs = float(t['fs'][:-2]) if t['fs'] else 99; minfs = min(minfs, fs)
                    if t['fit'] != 'ok': bad.append((t['name'], t['fs'], t['nm']))
                if r['card'][0] > r['card'][1] + 1 or r['body'][0] > r['body'][1] + 1: bad.append(('OVERFLOW', r['card'], r['body']))
                if k == 0: await page.screenshot(path=OUT + f'shopfit_{W}x{H}.png')
            # the deck sheet with the longest texts
            sheet_bad = []
            for i in range(7):
                await page.evaluate("(i) => { const G = __yatd; G.closeModal(); G.openModal({ type: 'shop' }); }", i); await page.clock.run_for(300)
                await page.click(f'#card .slots .slot >> nth={i}'); await page.clock.run_for(400)
                r = await page.evaluate(CHECK)
                sh = [t for t in r['tiles'] if t['id'] == 'shop-sheet']
                if not sh or sh[0]['fit'] != 'ok': sheet_bad.append((i, sh))
                if i == 0: await page.screenshot(path=OUT + f'shopsheet_{W}x{H}.png')
            print(W, H, 'tiles', n, 'min font', minfs, 'BAD', bad[:6], 'sheet bad', sheet_bad[:3], 'errs', errs[:2])
            await page.close()
        await b.close()
asyncio.run(main())
