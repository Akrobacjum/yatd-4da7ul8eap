import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => {
  const G = __yatd, out = {}, fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };
  const setup = () => { while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal(); G.startWave(); let g = 0; while (G.fl.heroes.filter(h => !h.gone && !h.dead).length < G.fl.heroes.length || G.fl.queue.length) { G.step(0.05); if (++g > 400) break; } return G.fl; };
  // 1. the carrier, scared to the limit, throws the crystal away and runs
  let f = setup(); let h = f.heroes[0];
  h.crystal = true; f.party.carrierId = h.id; const cr0 = G.run.crystals;
  G.addFear(h, h.courage * 3, null, 'test');
  out.drop = { crystal: h.crystal, fleeing: h.fleeing, crystals: G.run.crystals, cr0, dropped: f.stats.crystalDropped || 0, carrier: f.party.carrierId };
  ok(!h.crystal && h.fleeing && G.run.crystals === cr0 && (f.stats.crystalDropped || 0) === 1, 'carrier drops crystal');
  // 2. caged, nobody coming: dies when the cage time runs out
  f = setup(); h = f.heroes[0];
  f.heroes.forEach(o => { if (o !== h) { o.gone = true; } });
  h.state = 'caged'; h.cageUntil = f.time + 1; h.cageIt = null; h.boss = null;
  G.addFear(h, h.courage * 3, 'cage', 'test');
  out.cagedFear = { state: h.state, fleeing: h.fleeing };
  ok(h.state === 'caged' && !h.fleeing, 'fear does not break the cage');
  for (let i = 0; i < 40 && !h.dead; i++) G.step(0.05);
  out.cageDeath = { dead: h.dead, deaths: f.stats.cageDeaths || 0, kills: f.stats.kills };
  ok(h.dead && (f.stats.cageDeaths || 0) === 1, 'dies in the cage');
  // 3. a friend is on the way: the cage waits for him
  f = setup(); h = f.heroes[0]; const fr = f.heroes[1];
  h.state = 'caged'; h.cageUntil = f.time + 0.5; h.cageIt = null; h.boss = null; f.party.rescueId = h.id; f.party.cageDecided.add(h.id);
  for (let i = 0; i < 30; i++) G.step(0.05);
  out.wait = { dead: h.dead, state: h.state, rescueId: f.party.rescueId };
  ok(!h.dead, 'waits for a rescuer');
  // 4. a boss tears the cage apart
  f = setup(); h = f.heroes[0];
  f.heroes.forEach(o => { if (o !== h) { o.gone = true; } });
  h.state = 'caged'; h.cageUntil = f.time + 0.5; h.cageIt = null; h.boss = 'champion';
  for (let i = 0; i < 30; i++) G.step(0.05);
  out.boss = { dead: h.dead, state: h.state };
  ok(!h.dead && h.state !== 'caged', 'boss breaks out');
  return { out, fails };
}'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(400)
        r = await page.evaluate(JS)
        print(json.dumps(r['out'], ensure_ascii=False)); print('FAILS', r['fails']); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
