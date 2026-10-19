# 1.04: tutorial wave 1 (2 rookies) with the two start traps placed in different ways: how often is the crystal carried out?
# Player models: 'graze' = taps every check on the outline (never a crit, like tester Mateusz), 'none' = never taps.
import asyncio, json, sys
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
PAGE = sys.argv[1] if len(sys.argv) > 1 else 'page15'
REPS = int(sys.argv[2]) if len(sys.argv) > 2 else 20
JS = r"""
([strategy, adds, model, tutorial]) => {
  const G = __yatd; while (G.modalKind) G.closeModal();
  G.newRun(tutorial); while (G.modalKind) G.closeModal(); if (G.run.tut >= 0 && G.tutEnd) G.tutEnd();
  const f = G.fl, P = G.shortestPath(), key = (x, y) => x + ',' + y;
  const sys = [...f.items.values()].filter(it => it.sys);
  if (strategy !== 'cur') {   // move the start traps
    sys.forEach(it => { f.items.delete(key(it.x, it.y)); f.essence += it.spent; });
    const heart = f.heart, onP = new Set(P.map(p => key(p[0], p[1])));
    const place = (type, frac0, frac1, wallNear) => {
      if (G.ITEMS[type].slot === 'wall') {
        const on = new Set(P.slice(Math.floor(P.length * frac0), Math.ceil(P.length * frac1)).map(p => key(p[0], p[1])));
        let best = null, bs = -1;
        for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(type, x, y)) { const a = G.areaOf({ type, x, y }); const s = a.filter(t => on.has(key(t[0], t[1]))).length; if (s > bs) { bs = s; best = [x, y]; } }
        if (best && bs > 0) { G.tryPlace(type, best[0], best[1]); return best; }
      } else for (let k = Math.floor(P.length * frac1); k >= Math.floor(P.length * frac0); k--) { const q = P[k]; if (q && G.canPlace(type, q[0], q[1])) { G.tryPlace(type, q[0], q[1]); return q; } }
      return null;
    };
    if (strategy === 'heart' || strategy === 'heart2' || strategy === 'heart3') { place('spikes', 0.7, 0.95); place('arrows', 0.6, 1); }
    if (strategy === 'heart2') f.items.forEach(it => { if (it.type === 'spikes' || it.type === 'arrows') { it.lvl = 2; } });
    if (strategy === 'heart3') place('spikes', 0.2, 0.5);
    if (strategy === 'old') {   // 1.03: spikes from 20 % on, arrows on the first wall facing 45-85 %
      for (let k = Math.floor(P.length * 0.2); k < P.length; k++) if (G.canPlace('spikes', P[k][0], P[k][1])) { G.tryPlace('spikes', P[k][0], P[k][1]); break; }
      const on = new Set(P.slice(Math.floor(P.length * 0.45), Math.ceil(P.length * 0.85)).map(p => key(p[0], p[1]))); let done = false;
      for (let y = 0; y < G.WH && !done; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('arrows', x, y) && G.areaOf({ type: 'arrows', x, y }).some(a => on.has(key(a[0], a[1])))) { G.tryPlace('arrows', x, y); done = true; break; }
    }
    if (strategy === 'split') { place('spikes', 0.75, 0.95); place('arrows', 0.15, 0.55); }
    if (strategy === 'mid') { place('spikes', 0.45, 0.7); place('arrows', 0.45, 0.85); }
    const nearHeart = type => { const hr = G.roomOf(heart.x, heart.y); let best = null, bd = 1e9; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.roomOf(x, y) === hr && G.canPlace(type, x, y)) { const d = Math.abs(x - heart.x) + Math.abs(y - heart.y); if (d < bd) { bd = d; best = [x, y]; } } if (best) { G.run.unlocked.add(type); f.essence += 20; G.tryPlace(type, best[0], best[1]); f.essence -= 20; } return best; };
    if (strategy === 'atheart' || strategy === 'atheart2') {   // spikes where they stand to pry the crystal, arrows over the same tiles
      const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [heart.x + d[0], heart.y + d[1]]).filter(t => G.canPlace('spikes', t[0], t[1]));
      const lastP = P[P.length - 1]; adj.sort((a, b) => (Math.abs(a[0] - lastP[0]) + Math.abs(a[1] - lastP[1])) - (Math.abs(b[0] - lastP[0]) + Math.abs(b[1] - lastP[1])));
      if (adj[0]) G.tryPlace('spikes', adj[0][0], adj[0][1]);
      const tiles = new Set([[heart.x + 1, heart.y], [heart.x - 1, heart.y], [heart.x, heart.y + 1], [heart.x, heart.y - 1]].map(t => key(t[0], t[1])));
      let best = null, bs = -1; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('arrows', x, y)) { const a = G.areaOf({ type: 'arrows', x, y }); const sc = a.filter(t => tiles.has(key(t[0], t[1]))).length * 3 + a.filter(t => onP.has(key(t[0], t[1]))).length; if (sc > bs) { bs = sc; best = [x, y]; } }
      if (best) G.tryPlace('arrows', best[0], best[1]);
      if (strategy === 'atheart2') f.items.forEach(it => { if (it.type === 'spikes' || it.type === 'arrows') it.lvl = 2; });
    }
    if (strategy === 'gob') { place('spikes', 0.4, 0.7); nearHeart('goblin'); }
    if (strategy === 'gob+arr') { place('arrows', 0.3, 0.8); nearHeart('goblin'); }
    if (strategy === 'arch') { place('spikes', 0.4, 0.7); nearHeart('archer'); }
    if (strategy === 'web') { place('spikes', 0.4, 0.7); nearHeart('web'); }
    if (strategy === 'gob2') { place('spikes', 0.4, 0.7); nearHeart('goblin'); nearHeart('goblin'); }
    f.items.forEach(it => { if (!sys.includes(it)) it.sys = true; });
  }
  if (adds) {   // what the tutorial walks the player through: spikes, arrows, coins, then spend the rest on the way
    const put = (type, frac) => { for (let k = Math.floor(P.length * frac); k < P.length; k++) { const q = P[k]; if (G.canPlace(type, q[0], q[1])) { G.tryPlace(type, q[0], q[1]); return true; } } return false; };
    const wall = frac => { const on = new Set(P.slice(0, Math.ceil(P.length * frac)).map(p => key(p[0], p[1]))); for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('arrows', x, y) && G.areaOf({ type: 'arrows', x, y }).some(a => on.has(key(a[0], a[1])))) { G.tryPlace('arrows', x, y); return true; } return false; };
    put('spikes', 0.25); wall(0.7); G.run.unlocked.add('loot'); put('loot', 0.5);
    for (let i = 0; i < 8 && f.essence >= 3; i++) { if (!(i % 2 ? wall(1) : put('spikes', 0.1 + 0.1 * i))) { if (!put('spikes', 0.05)) break; } }
  }
  const items = [...f.items.values()].map(it => it.type + (it.sys ? '*' : '') + '@' + Math.round(100 * P.findIndex(p => p[0] === it.x && p[1] === it.y) / P.length));
  G.startWave();
  for (let i = 0; i < 6000 && f.phase === 'raid'; i++) {
    if (f.check && !f.check.result) {
      const c = f.check;
      if (model === 'none') G.skipCheck();
      else G.resolveCheck(model === 'graze' || (model === 'mix' && Math.random() < 0.5) ? (c.g0 + c.g1) / 2 : (c.r0 + c.r1) / 2);
      G.clearCheck(); continue;
    }
    G.step(0.05);
    if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } }
  }
  const s = f.stats;
  return { taken: s.crystalTaken, lost: s.crystalLost, kills: s.kills, scared: s.scared, t: Math.round(f.time), items, heroes: f.heroes.map(h => h.lvl) };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto('file://' + SC + 'test/' + PAGE + '.html'); await page.clock.run_for(500)
        await page.evaluate("__yatd.setUser && __yatd.setUser(true)")
        tut = '--normal' not in sys.argv
        import os
        await page.evaluate('__yatd.S.earlyHp = ' + os.environ.get('EHP', '1'))
        MODELS = os.environ.get('MODELS', 'graze,none').split(','); ADDS = [x == '1' for x in os.environ.get('ADDS', '0,1').split(',')]
        for strategy in (sys.argv[3].split(',') if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else ['cur', 'heart', 'split', 'mid']):
            for adds in ADDS:
                for model in MODELS:
                    res = [await page.evaluate(JS, [strategy, adds, model, tut]) for _ in range(REPS)]
                    print('%-6s adds=%-5s %-5s | crystal taken %2d/%d, lost %2d/%d | kills %.1f scared %.1f | e.g. %s' % (strategy, adds, model, sum(1 for r in res if r['taken']), REPS, sum(1 for r in res if r['lost']), REPS,
                        sum(r['kills'] for r in res) / REPS, sum(r['scared'] for r in res) / REPS, res[0]['items']), flush=True)
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
