import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal();
  const run = G.run, f = G.fl;
  // hunger: store first, then the purse, else a crystal
  run.wave = 3; f.essence = 5; run.hungerStore = 2; f.score = 0; G.feedHeart();
  out.ate = { hunger: f.hunger, crystals: run.crystals, ess: f.essence, store: run.hungerStore };
  ok(f.hunger.ate && run.crystals === 2 && f.essence === 0, 'short: eats all and a crystal');
  f.essence = 20; run.hungerStore = 3; G.feedHeart();
  out.fed = { hunger: f.hunger, crystals: run.crystals, ess: f.essence, store: run.hungerStore };
  ok(f.hunger.fed && f.essence === 15 && run.hungerStore === 0, 'fed: store then purse');
  // overflow: what does not fit goes to the heart's store
  G.startWave(); const cap = G.essCap(); G.fl.essence = cap - 1; run.hungerStore = 0;
  G.fl.greed = 2; const e = G.kill ? 0 : 0;
  const h = G.fl.heroes[0] || null;
  G.overflowToHeart(5); out.over = { store: run.hungerStore, cap: G.storeCap() };
  ok(run.hungerStore === 5, 'overflow to store');
  // crystal bought in the shop
  G.fl.phase = 'build'; G.fl.essence = 30; const c0 = G.crystalCost(); const okb = G.buyCrystal();
  out.buy = { okb, c0, crystals: run.crystals, ess: G.fl.essence, next: G.crystalCost() };
  ok(okb && run.crystals === 3 && G.fl.essence === 30 - c0, 'crystal bought');
  return { out, fails }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(400)
        r = await page.evaluate(JS); print(json.dumps(r['out'], ensure_ascii=False)); print('FAILS', r['fails']); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
