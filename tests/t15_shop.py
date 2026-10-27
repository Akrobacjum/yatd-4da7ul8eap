import asyncio, json
from playwright.async_api import async_playwright
URL = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/shots121/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.install(); await pg.goto(URL); await pg.clock.run_for(500)
        r = await pg.evaluate("""() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
          while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal();
          const run = G.run; G.fl.essence = 60;
          // a wave held: pending -> free picks -> shop opens on the next build
          run.pendingUpgrades.push({ r: 1, src: 'wave', wave: 1 }, { r: 2, src: 'thr', thr: 1500 });
          G.proceedToBuild();
          out.after = { wave: run.wave, free: run.freePicks, modal: G.modalKind, offers: run.shop.ids.length, owedReset: run.shopOwed };
          ok(run.freePicks === 2 && ['shop', 'hungerTip'].includes(G.modalKind) && run.shop.ids.length === 4, 'free picks and shop');
          while (G.modalKind) G.closeModal();
          G.fl.essence = 60;
          const r1 = G.shopBuy(0), r2 = G.shopBuy(1);
          out.free2 = { r1, r2, free: run.freePicks, deck: run.deck.length, ess: G.fl.essence };
          ok(run.freePicks === 0 && G.fl.essence === 60, 'free buys cost nothing');
          const e0 = G.fl.essence, id2 = run.shop.ids[2], u2 = G.UPG[id2]; const r3 = G.shopBuy(2);
          out.paid = { r3, price: G.priceOf(u2), paid: e0 - G.fl.essence };
          ok(r3 === 'ok' || r3 === 'stash', 'paid buy'); ok(e0 - G.fl.essence === G.priceOf(u2), 'paid the price');
          const c1 = G.rerollCost(); G.shopReroll(false); const c2 = G.rerollCost();
          out.reroll = { c1, c2 }; ok(c2 === c1 + 2, 'reroll gets dearer (1.28.2: +2)');
          // stash
          run.deck = ['sharp', 'heavy', 'oil', 'venom', 'dread', 'broker', 'pack']; G.recomputeMods();
          out.stashMove = G.toStash(0); out.deckN = run.deck.length; out.stash = run.stash.slice();
          ok(run.stash.includes('sharp') && G.mods.dmgType.pierce === 1, 'stash makes a card inactive');
          G.fromStash(0); ok(G.mods.dmgType.pierce === 1.25, 'back from stash works');
          out.sellStash = (G.toStash(0), G.sellStash(0));
          // shop price discount
          run.deck.push('broker'); G.recomputeMods(); out.priceC = G.priceOf({ rar: 'c', kind: 'card' });
          G.openModal({ type: 'shop' });
          return { out, fails }; }""")
        print(json.dumps(r['out'], ensure_ascii=False)); print('FAILS', r['fails'])
        await pg.clock.run_for(300); await pg.screenshot(path=OUT + 'v14_shop.png', full_page=False)
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
