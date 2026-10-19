import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal();
  const run = G.run, f = G.fl;
  // 1.01: the heart eats first from the wave's Esencja; short at the end of the wave: a crystal
  run.wave = 3; const need = G.hungerNeed(3); f.essence = 5; f.fed = 0; f.score = 0;
  G.essIn(need * 0.5); out.half = { fed: f.fed, ess: f.essence };
  ok(Math.abs(f.fed - need * 0.5) < 1e-6 && f.essence === 5, 'half a need: all to the heart');
  G.feedHeart(); out.ate = { hunger: f.hunger, crystals: run.crystals, ess: f.essence };
  ok(f.hunger.ate && run.crystals === 2 && f.essence === 5, 'short: the heart eats a crystal, the purse is left alone');
  f.fed = 0; G.essIn(need + 7); out.fed = { fed: f.fed, ess: f.essence };
  ok(f.fed === need && Math.abs(f.essence - 12) < 1e-6, 'fed: the rest to the purse');
  G.feedHeart(); ok(f.hunger.fed && run.crystals === 2, 'fed: no crystal');
  // no purse limit
  f.essence = 0; G.essIn(5000); ok(f.essence === 5000, 'no limit');
  // crystal bought in the shop
  G.fl.phase = 'build'; G.fl.essence = 50; const c0 = G.crystalCost(); const okb = G.buyCrystal();
  out.buy = { okb, c0, crystals: run.crystals, ess: G.fl.essence, next: G.crystalCost() };
  ok(okb && run.crystals === 3 && G.fl.essence === 50 - c0 && c0 === 40, 'crystal bought for 40');
  return { out, fails }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(400)
        r = await page.evaluate(JS); print(json.dumps(r['out'], ensure_ascii=False)); print('FAILS', r['fails']); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
