# replays wave 7 of run mvh4wnpcy54a (the author's stuck raid) and looks for the shuffle: heroes in the crypt for long
import asyncio, json, sys, re
from playwright.async_api import async_playwright
src = open('e111/replay112.py').read()
js = src[src.index('JS = r"""') + 9: src.index('"""', src.index('JS = r"""') + 9)]
setup = js[:js.index('  G.startWave();')]
FORCE = r'''
  if (window.__force) run.next = run.next.slice(0, 4).map((e, i) => Object.assign(e, window.__force[i] || {}));
  G.startWave();
  const out = { t: 0, crypt: 0, samples: [], makeWay: 0, why: {} }; let guard = 0;
  while (guard++ < 40000) {
    const f = G.fl; if (f.phase !== 'raid') break;
    if (f.check) { const c = f.check; if (!c.result) G.resolveCheck((c.r0 + c.r1) / 2); G.clearCheck(); continue; }
    G.step(0.05);
    if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); break; } }
    const hs = f.heroes.filter(h => !h.dead && !h.fled && !h.gone);
    if (hs.length && hs.every(h => h.x >= 10 && h.x <= 14 && h.y >= 1 && h.y <= 6)) out.crypt += 0.05;
    if (Math.abs(f.time % 2) < 0.05) out.samples.push([Math.round(f.time), hs.map(h => h.id + ':' + h.x + ',' + h.y + ':' + h.state[0] + (h.intent ? ':' + h.intent : '') + (h.lootKey ? '>' + h.lootKey : ''))].join(' '));
  }
  out.t = Math.round(G.fl.time); out.makeWay = (G.run.waves[G.run.waves.length - 1] || {}).stats ? G.run.waves[G.run.waves.length - 1].stats.makeWay : null;
  out.heroes = G.run.next ? null : null;
  return out; }'''
JS = setup + FORCE
doc = json.load(open('real113/w7.json'))
async def main():
    page_name = sys.argv[1] if len(sys.argv) > 1 else 'page15'; reps = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    force = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        await page.clock.install(); await page.goto('file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/' + page_name + '.html'); await page.clock.run_for(300)
        if force: await page.evaluate('f => { window.__force = f; }', force)
        for r in range(reps):
            o = await page.evaluate(JS, [doc, 2000, [doc['summary'].get('grozaTotal', 300), doc['summary'].get('greedRep', 3)], 0.9, None, {}, 'v12', [1, 1, []], ['flat', 0, 1]])
            print('rep', r, 't', o['t'], 'crypt', round(o['crypt']), 'makeWay', o['makeWay'])
            if o['crypt'] > 38 and len(sys.argv) > 4: print('\n'.join(o['samples'][:70]))
        await b.close()
asyncio.run(main())
