# Mateusz's wave 2 (run mvh8nl1a0g9d): the real layout and the real party (thief 4, cowardly warrior 3, mage 3), played with
# the check model; a per-0.5 s trace of every hero, and "dither" episodes: a hero who is not resting/talking/fighting/disarming
# and for 6 s keeps stepping between at most 2 tiles.
import asyncio, json, sys, os
from playwright.async_api import async_playwright
PAGE = sys.argv[1]; REPS = int(sys.argv[2]); DOC = sys.argv[3] if len(sys.argv) > 3 else '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/real1133/waves/mvh8nl1a0g9d_02.json'
TRACE = os.environ.get('TRACE')
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/' + PAGE + '.html'
doc = json.load(open(DOC))
JS = r"""
([doc, party, acc]) => {
  const G = __yatd; while (G.modalKind) G.closeModal();
  G.newRun(false); while (G.modalKind) G.closeModal();
  const run = G.run, L0 = doc.layout;
  const L = { cells: new Map(), edges: new Map(), entrance: L0.entrance, heartKey: L0.heart, entX: L0.entX };
  L0.cells.forEach(c => L.cells.set(c[0] + ',' + c[1], { cx: c[0], cy: c[1], x0: c[2], y0: c[3], x1: c[4], y1: c[5], lvl: c[6], born: 0, objs: c[7].map(o => o[3] ? [o[0], o[1], o[2], 1] : [o[0], o[1], o[2]]), rt: c[8] || undefined, rk: c[9] || undefined }));
  [...L.cells.values()].forEach(c => { if (!c.rt) delete c.rt; if (!c.rk) delete c.rk; });
  L0.edges.forEach(e => { const k = e[0] < e[1] ? e[0] + '|' + e[1] : e[1] + '|' + e[0]; L.edges.set(k, { key: k, a: e[0], b: e[1], horiz: !!e[2], pa: e[3], pb: e[4], lvl: e[5], born: 0 }); });
  run.layout = L; run.wave = doc.wave; run.total = 39;
  run.deck = []; G.recomputeMods(); run.items.clear();
  const LM = [1, 1, 1.5, 2.2];
  L0.items.forEach(([type, x, y, lvl, dropped]) => { const T = G.ITEMS[type]; lvl = lvl || 1; const hp = T.hp ? T.hp * G.mods.monster * LM[lvl] : 0; run.items.set(x + ',' + y, { type, x, y, cd: 0, anim: 0, disabled: false, hp, max: hp, power: G.mods.monster * (T.hp ? LM[lvl] : 1), shot: 0.5, flash: 0, preview: 0, gx: x + 0.5, gy: y + 0.5, lvl, spent: dropped ? 0 : T.cost, dropped: !!dropped }); run.unlocked.add(type); });
  G.startBuild(true);
  run.next = party.map(p => { const e = G.makeHero(p[0], p[1], doc.wave); if (p[2] !== undefined) e.trait = p[2]; return e; });
  G.startWave();
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const trace = [], hist = new Map(), eps = [], hitsOn = {};
  let guard = 0, nextT = 0;
  while (guard++ < 200000) {
    const f = G.fl; if (G.modalKind || f.phase !== 'raid') break;
    if (f.check) { const c = f.check; if (!c.result) {
        const pc = (c.r0 + c.r1) / 2; let u0 = null, prev = G.checkPos(c, 0);
        for (let u = 0.002; u <= 1.0001; u += 0.002) { const q = G.checkPos(c, u); if ((prev - pc) * (q - pc) <= 0 && u * c.dur >= 0.12) { u0 = u; break; } prev = q; }
        if (u0 === null) u0 = pc;
        const sig = acc * (c.shape === 'swing' ? 1.9 : 1), t = u0 * c.dur + gauss() * sig;
        G.resolveCheck(t / c.dur > 1 || t < 0 ? -1 : G.checkPos(c, t / c.dur)); } G.clearCheck(); continue; }
    const hp0 = new Map(f.heroes.map(h => [h.id, h.hp]));
    G.step(0.05);
    if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } }
    if (f.time >= nextT) {
      nextT += 0.5;
      const P = f.party, row = [Math.round(f.time * 10) / 10, P.plan];
      f.heroes.forEach(h => {
        if (h.dead || h.fled || h.gone) return;
        const pe = h.path.length ? h.path[h.path.length - 1] : null;
        row.push([h.id, h.x, h.y, h.state, Math.round(h.hp), h.intent || '', h.path.length, pe ? pe.join(',') : '', f.danger[h.y * G.WW + h.x] || 0, h.disarmT ? h.disarmT.type + '@' + h.disarmT.x + ',' + h.disarmT.y : '', h.toSafe ? 1 : 0, h.talkUntil > f.time ? 1 : 0]);
        const H = hist.get(h.id) || []; H.push([f.time, h.x, h.y, h.state, h.hp]); while (H.length && H[0][0] < f.time - 6) H.shift(); hist.set(h.id, H);
        const free = H.every(q => q[3] === 'walk');
        const tiles = new Set(H.map(q => q[1] + ',' + q[2]));
        let moves = 0; for (let i = 1; i < H.length; i++) if (H[i][1] !== H[i - 1][1] || H[i][2] !== H[i - 1][2]) moves++;
        if (H.length >= 12 && free && tiles.size <= 2 && moves >= 4) {
          const last = eps.length ? eps[eps.length - 1] : null;
          if (last && last.id === h.id && f.time - last.t1 <= 0.6) { last.t1 = f.time; last.hpEnd = Math.round(h.hp); }
          else eps.push({ id: h.id, type: h.type, t0: Math.round((f.time - 6) * 10) / 10, t1: f.time, tiles: [...tiles], hpStart: Math.round(H[0][4]), hpEnd: Math.round(h.hp), plan: P.plan });
        }
      });
      trace.push(row);
    }
  }
  const w = run.waves[run.waves.length - 1] || {}, s = w.stats || {};
  return { t: w.time, k: s.kills, left: s.left, retreats: s.retreats, eps: eps.map(e => Object.assign(e, { t1: Math.round(e.t1 * 10) / 10 })), trace, dbg: G.fl.dbg || [], dbg2: G.fl.dbg2 || [], types: G.fl.heroes.map(h => h.type + h.lvl) };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        party = [['thief', 4], ['warrior', 3, 'coward'], ['mage', 3]]
        tot = 0; dith = 0
        for r in range(REPS):
            res = await page.evaluate(JS, [doc, party, float(os.environ.get('SIG', '0.037'))])
            d = sum(e['t1'] - e['t0'] for e in res['eps']); dith += d; tot += 1
            print('rep', r, 't', res['t'], 'k', res['k'], 'left', res['left'], 'retreats', res['retreats'], 'dither s %.1f' % d, json.dumps(res['eps'])[:600], flush=True)
            if TRACE and res['eps']:
                json.dump(res, open(TRACE + '_%d.json' % r, 'w'))
        print('SUM reps', tot, 'dither total %.1f' % dith, 'errs', errs[:2])
        await b.close()
asyncio.run(main())
