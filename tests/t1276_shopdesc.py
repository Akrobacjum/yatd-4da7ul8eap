# 1.27.6: the shop's card text must never collapse (author: descriptions vanished with 5 offers + a full deck + 3 gift cards)
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])
SET = r"""(n) => { const { G } = T; T.fresh(8); const run = G.run; run.tutorial = false; run.tut = -1;
  run.deckSize = 7; run.deck = ['silencebefore' in G.UPG ? 'silencebefore' : 'cooldown', 'sharp', 'heavy', 'copyist', 'cooldown', 'glutton', 'heartcore'].filter(id => G.UPG[id]);
  while (run.deck.length < 7) run.deck.push(['sharp','heavy','cooldown'][run.deck.length % 3]);
  run.deck = run.deck.concat(['heartcry', 'secondheart', 'heartroom'].filter(id => G.UPG[id])); run.stash = []; run.heartPicks = [];
  G.recomputeMods(); G.fl.essence = 163;
  const ids = G.UPGRADES.filter(u => u.kind === 'card' && u.group !== 'heart').slice(0, n).map(u => u.id); run.shop.ids = ids; run.shop.rune = Object.keys(G.FAMILIES || {})[0] || null;
  while (G.modalKind) G.closeModal(); G.openModal({ type: 'shop', between: true });
  const c = document.querySelector('#offer-0') || document.querySelector('.offer.ccard'); if (c) c.click(); return ids.length; }"""
MEAS = r"""() => { const tx = document.querySelector('#shop-detail .tx'), d = document.querySelector('#shop-detail'), sb = document.querySelector('.scr-body');
  const r = e => e ? Math.round(e.getBoundingClientRect().height) : -1; return { tx: r(tx), detail: r(d), text: tx ? tx.textContent.slice(0, 40) : null, body: sb ? [sb.scrollHeight, sb.clientHeight] : null, font: tx ? getComputedStyle(tx).fontSize : null }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); fails = []
        for w, h in [(430, 932), (390, 844), (412, 915), (360, 780), (320, 568)]:
            for n in (4, 5):
                ctx, pg, errs = await fresh_page(b, w, h)
                await pg.evaluate(SET, n); await pg.wait_for_timeout(900)
                m = await pg.evaluate(MEAS); print(w, h, n, json.dumps(m, ensure_ascii=False))
                if m['tx'] < 30: fails.append('%dx%d n%d: text %dpx' % (w, h, n, m['tx']))
                if w == 430 and n == 5: await pg.screenshot(path=SC + 'e1276/shop_%d_%d.png' % (w, n))
                fails += ['page error: ' + e for e in errs]; await ctx.close()
        await b.close(); print('FAILS', fails); sys.exit(1 if fails else 0)
asyncio.run(main())
