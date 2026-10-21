# 1.16.1: the heart eats as the Groza comes (not when the combo chain is cashed in); the totals stay what they were:
# fl.score = what went to the heart + to the purse (without the Obżarstwo extra), the heart never past its need,
# an element's Esencja on its card is what its firings were worth (never more than the wave's provisional sum)
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
JS = r"""async ([wave]) => { const G = __yatd; while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal();
  const Rn = a => a[Math.floor(Math.random() * a.length)]; G.fl.essence = 999;
  for (let k = 0; k < 40 && G.roomCount() < 8; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(Rn(dm)); G.fl.essence = 999; }
  const rs = G.fl.rooms.filter(r => r.kind === 'room' && r.id !== G.fl.heart.room); let n = 0, guard = 0;
  while (n < 10 && guard++ < 3000) { const r = Rn(rs), q = Rn(r.tiles), t = Rn(['spikes', 'spikes', 'web']); if (G.canPlace(t, q[0], q[1]) && G.tryPlace(t, q[0], q[1])) n++; G.fl.essence = 999; }
  G.run.wave = wave; G.run.next = G.makeWave(wave); G.startBuild(true); G.run.next = G.makeWave(wave);
  G.startWave(); const f = G.fl, need = G.hungerNeed(wave);
  let liveFeeds = 0, maxFed = 0, overNeed = false, scoreBelowFed = false, g = 0, lastFed = 0;
  while (g++ < 60000) { if (G.modalKind || f.phase !== 'raid') break;
    if (f.check) { const c = f.check; if (!c.result) G.resolveCheck((c.r0 + c.r1) / 2); G.clearCheck(); continue; }
    const C0 = f.chain, fed0 = f.fed;
    G.step(0.05);
    if (f.fed > fed0 + 1e-9 && f.chain && f.chain === C0) liveFeeds++;   // the heart ate while the same chain is still open
    if (f.fed > need + 1e-6) overNeed = true;
    if (f.score + 1e-6 < f.fed) scoreBelowFed = true;
    if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } }
  const w = G.run.waves[G.run.waves.length - 1], s = f.stats;   // the raw numbers (the wave record rounds them)
  const lpSum = [...G.fl.items.values()].reduce((a, it) => a + (it.lp || 0), 0);
  return { need, fed: Math.round(f.fed * 100) / 100, fedAt: f.fedAt, score: f.score, heart: s.essHeart || 0, purse: s.essWave || 0, glut: s.essGlut || 0, liveFeeds, overNeed, scoreBelowFed,
    lpSum, prov: f.prov, hunger: w.hunger, t: Math.round(w.time) }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.install(); await pg.goto('file://' + SC + 'test/page15.html'); await pg.clock.run_for(800)
        await pg.evaluate("__yatd.setUser && __yatd.setUser(true)")
        fails = []
        N = int(sys.argv[1]) if len(sys.argv) > 1 else 4
        rs = [await pg.evaluate(JS, [w]) for w in ([2, 3, 4, 6] * 3)[:N]]
        for r in rs: print(json.dumps(r))
        if sum(r['liveFeeds'] for r in rs) < 1: fails.append('the heart never ate while a chain was open')
        for r in rs:
            if r['overNeed']: fails.append('the heart ate past its need'); break
        for r in rs:
            if r['scoreBelowFed']: fails.append("the wave's Esencja was below what the heart ate"); break
        for r in rs:
            if abs(r['score'] - (r['heart'] + r['purse'] - r['glut'])) > 0.01: fails.append('score != heart + purse - glut (%.3f vs %.3f)' % (r['score'], r['heart'] + r['purse'] - r['glut'])); break
        for r in rs:
            if abs(r['heart'] - min(r['need'], r['score'])) > 0.01: fails.append('the heart took %.2f, not min(need, score)' % r['heart']); break
        for r in rs:
            if r['lpSum'] > r['prov'] + len(rs) * 1.0: fails.append('cards claim more Esencja than the events were worth'); break
        if errs: fails.append('page errors')
        print('FAILS', fails); print('errs', errs[:4]); await b.close()
asyncio.run(main())
