# Prototype 1.05 classes: party composition (no duplicates), guild kinds, bard songs/calls, barbarian rage/smash, errors
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
PAGE = sys.argv[1] if len(sys.argv) > 1 else 'page15'
JS = r"""async (reps) => { const G = __yatd; const out = { dup: 0, parties: 0, classes: {}, sizes: {}, hunters: {}, stats: {}, waves: 0, errs: [] };
  for (let r = 0; r < reps; r++) {
    while (G.modalKind) G.closeModal();
    G.newRun(false); while (G.modalKind) G.closeModal();
    for (let w = 1; w <= 9; w++) {
      const f = G.fl, P = G.shortestPath(); f.essence += 120; G.run.crystals = G.run.maxCrystals;
      // a mixed dungeon: crates and buildings (barbarians), traps on the way, a bigger maze (bards)
      for (let k = 2; k < P.length - 1 && f.essence >= 6; k += 3) { const q = P[k]; if (G.canPlace('spikes', q[0], q[1])) G.tryPlace('spikes', q[0], q[1]); }
      ['rune', 'altar', 'acid', 'howl', 'shackles', 'veil'].forEach(t => { for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (f.essence >= 15 && G.canPlace(t, x, y) && Math.random() < 0.02) G.tryPlace(t, x, y); });
      const nx = G.run.next; out.parties++; const ty = nx.map(e => e.type); if (new Set(ty).size !== ty.length) out.dup++;
      out.sizes[nx.length] = (out.sizes[nx.length] || 0) + 1; ty.forEach(t => out.classes[t] = (out.classes[t] || 0) + 1); nx.filter(e => e.hunter).forEach(e => out.hunters[e.type] = (out.hunters[e.type] || 0) + 1);
      G.startWave();
      for (let i = 0; i < 5000 && G.fl.phase === 'raid'; i++) {
        const c = G.fl.check; if (c && !c.result) { G.resolveCheck(Math.random() < 0.6 ? (c.r0 + c.r1) / 2 : (c.g0 + c.g1) / 2); G.clearCheck(); continue; }
        G.step(0.05); if (G.fl.ending !== null) { G.fl.ending -= 0.05; if (G.fl.ending <= 0) { G.fl.ending = null; G.finishWave(); } }
      }
      const s = G.fl.stats; ['songs', 'bardCalls', 'bardHeard', 'answers', 'rages', 'rageNoPanic', 'smashes', 'smashedObj', 'howlBlocks', 'shackleBlocks', 'gotLost', 'revenge'].forEach(k => out.stats[k] = (out.stats[k] || 0) + (s[k] || 0));
      out.waves++;
      if (G.run.guild) out.stats['guild_' + G.run.guild.kind] = (out.stats['guild_' + G.run.guild.kind] || 0) + 1;
      while (G.modalKind) G.closeModal(); if (G.run.crystals <= 0) break; G.afterSummary(); while (G.modalKind) G.closeModal();
    }
  }
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.install(); await pg.goto('file://' + SC + 'test/' + PAGE + '.html'); await pg.clock.run_for(800)
        await pg.evaluate("__yatd.setUser && __yatd.setUser(true)")
        out = await pg.evaluate(JS, int(sys.argv[2]) if len(sys.argv) > 2 else 3)
        print(json.dumps(out)); fails = []
        if out['dup']: fails.append('a class twice in a party (%d)' % out['dup'])
        if not out['classes'].get('bard') or not out['classes'].get('barbarian'): fails.append('bards and barbarians come')
        if max(int(k) for k in out['sizes']) > 6: fails.append('at most 6 heroes')
        if not out['stats'].get('smashes'): fails.append('a barbarian smashed something')
        if errs: fails.append('page errors')
        print('FAILS', fails); print('errs', errs[:5])
        await b.close()
asyncio.run(main())
