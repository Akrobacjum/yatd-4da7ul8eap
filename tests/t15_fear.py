import asyncio, json
from playwright.async_api import async_playwright
URL = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r"""
() => {
  const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal();
  const R = a => a[Math.floor(Math.random() * a.length)];
  G.startBuild(); G.fl.essence = 400; for (let k = 0; k < 3; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(R(dm)); G.fl.essence = 400; }
  G.startWave(); for (let i = 0; i < 300 && G.fl.queue.length; i++) G.step(0.05);
  const hs = G.fl.heroes.filter(h => !h.dead && !h.fled); const h = hs[0];
  // damage fear: 35% of courage for the whole HP from a trap, nothing else
  h.phys = null; h.phobia = null; h.fear = 0; h.trauma = {};
  const half = h.max * 0.5; G.damage(h, half / (G.typeMult ? 1 : 1), { type: 'gate', kind: 'trap', lvl: 1 });
  out.dmgFear = { fear: Math.round(h.fear), courage: Math.round(h.courage), share: +(h.fear / h.courage).toFixed(3), cls: h.type };
  // warrior takes blunt x1.25 etc: compare typeMult
  out.types = ['warrior', 'thief', 'priest', 'mage'].map(t => { const x = Object.assign({}, h, { type: t, phys: null }); return [t, ['pierce', 'blunt', 'fire', 'poison'].map(d => G.typeMult(x, d))]; });
  // body: brittle doubles nothing but blunt x1.4 and reveals
  const h2 = hs[1] || hs[0]; h2.phys = 'brittle'; h2.known = new Set(); h2.hp = h2.max; const before = h2.hp;
  G.damage(h2, 10, { type: 'gate', kind: 'trap', lvl: 1 });
  out.brittle = { taken: +(before - h2.hp).toFixed(2), known: [...h2.known], cls: h2.type };
  ok(h2.known.has('phys'), 'weakness revealed on hit');
  // phobia of fire: fire fear x2 and revealed
  h.phobia = 'fire'; h.known = new Set(); h.fear = 0; G.addFear(h, 10, 'fire', null, 'fire');
  out.phobia = { fear: +h.fear.toFixed(2), known: [...h.known] }; ok(h.known.has('phobia'), 'phobia revealed');
  // decay: alone half speed
  h.phobia = null; h.fear = 50; h.alone = false; h.hurtAt = -99; const f0 = h.fear; G.step(0.5); const dNorm = f0 - h.fear;
  h.fear = 50; h.alone = true; G.step(0.5); const dAlone = 50 - h.fear;
  out.decay = { normal: +dNorm.toFixed(2), alone: +dAlone.toFixed(2), calm: h.R.calm };
  // roar: monster wound fear x2.5
  G.run.deck = ['monsterroar']; G.recomputeMods(); out.monsterFear = G.mods.monsterFear;
  // returners: an escaped scared hero comes back
  const e = hs[hs.length - 1]; e.fled = true; e.fleeing = true; e.fearBy = { spider: 50 }; e.phobia = null;
  const R0 = Math.random; Math.random = () => 0.01; G.collectReturners && G.collectReturners(); Math.random = R0;
  out.ret = (G.run.returners || []).map(r => ({ nm: r.nm[0], back: r.back, phobia: r.phobia, scar: r.scar }));
  ok(out.ret.length >= 1 && out.ret[0].phobia === 'spiders', 'returner with spider phobia');
  const w = G.run.wave; G.run.returners.forEach(r => { r.back = w + 2; });
  G.run.wave = w + 2; const L = G.makeWave(w + 2); const ret = L.find(x => x.returning);
  out.retIn = ret ? { nm: ret.nm[0], lvl: ret.lvl, phobia: ret.phobia, known: ret.known, scar: ret.scar } : null;
  ok(!!ret, 'returner in the party');
  return { out, fails };
}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.install(); await pg.goto(URL); await pg.clock.run_for(500)
        r = await pg.evaluate(JS)
        print(json.dumps(r['out'], ensure_ascii=False)); print('FAILS', r['fails']); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
