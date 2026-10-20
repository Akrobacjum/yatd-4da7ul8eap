# 1.12.1 (author: a hero takes up one tile like a monster; two may share one only while passing each other): over many waves,
# two heroes almost never stand on one tile (the door out aside), they pass each other in corridors, nobody gets stuck.
import asyncio, json, sys
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/' + (sys.argv[1] if len(sys.argv) > 1 else 'page15') + '.html'
JS = r'''(n) => { const G = __yatd, out = { waves: 0, frames: 0, stackStill: 0, stackMove: 0, swaps: 0, ends: {}, t: [], squeezes: 0, sidesteps: 0, stuck: 0, kills: 0 };
  const key = (x, y) => x + ',' + y;
  for (let w = 0; w < n; w++) {
    while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal();
    const R = a => a[Math.floor(Math.random() * a.length)];
    G.run.wave = 3 + (w % 6); G.startBuild(); G.fl.essence = 400;
    for (let k = 0; k < 3; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(R(dm)); G.fl.essence = 400; }
    const P = G.shortestPath(); let placed = 0;
    for (const t of ['spikes', 'arrows', 'goblin', 'portrait', 'loot', 'spikes', 'arrows']) for (const q of P.slice(3)) { if (G.canPlace(t, q[0], q[1]) && G.tryPlace(t, q[0], q[1])) { placed++; break; } }
    G.run.next = G.makeWave(G.run.wave);
    G.startWave(); out.waves++;
    let g = 0, still = new Map();
    while (G.fl.phase === 'raid' && g++ < 6000) {
      if (G.fl.check) { G.skipCheck(); G.clearCheck(); continue; }
      G.step(0.05); if (G.fl.ending !== null) { G.fl.ending -= 0.05; if (G.fl.ending <= 0) { G.fl.ending = null; G.finishWave(); break; } }
      out.frames++;
      const hs = G.fl.heroes.filter(h => !h.dead && !h.fled && !h.gone);
      const ent = G.fl.ent, br = G.fl.breach, exitT = (x, y) => (x === ent.x && y === ent.y) || (br && x === br.x && y === br.y);
      for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
        const a = hs[i], b = hs[j];
        const ta = a.nx !== null && a.prog >= 0.5 ? [a.nx, a.ny] : [a.x, a.y], tb = b.nx !== null && b.prog >= 0.5 ? [b.nx, b.ny] : [b.x, b.y];
        if (ta[0] !== tb[0] || ta[1] !== tb[1] || exitT(ta[0], ta[1])) continue;
        if (a.nx === null && b.nx === null) out.stackStill++; else out.stackMove++;
      }
      hs.forEach(h => { if (h.passing != null && h.nx !== null) out.swaps++; });
    }
    out.t.push(Math.round(G.fl.time)); out.squeezes += G.fl.stats.squeezes || 0; out.sidesteps += G.fl.stats.sidesteps || 0; out.kills += G.fl.stats.kills || 0;
    if (g >= 6000) out.stuck++;
  }
  return out; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        r = await page.evaluate(JS, 12)
        fails = []
        if r['stackStill'] > r['frames'] * 0.01: fails.append('heroes stand on one tile too often (%d of %d frames)' % (r['stackStill'], r['frames']))
        if r['stuck']: fails.append('waves stuck: %d' % r['stuck'])
        if errs: fails.append('page errors %s' % errs[:2])
        r['tmean'] = sum(r['t']) / len(r['t'])
        print(json.dumps(r))
        print('FAILS', fails)
        await b.close()
asyncio.run(main())
