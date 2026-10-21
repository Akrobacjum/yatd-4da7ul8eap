import asyncio, json, sys, glob, os
from playwright.async_api import async_playwright
# usage: replay12.py PAGE RUNID WAVES REPS MODE(v11|v12) [ACC]
PAGE, RUN = sys.argv[1], sys.argv[2]
WAVES = [int(x) for x in sys.argv[3].split(',')]
REPS = int(sys.argv[4]); MODE = sys.argv[5]; ACC = float(sys.argv[6]) if len(sys.argv) > 6 else 0.9
DEED = float(os.environ.get('GW', '1.0')); FW = float(os.environ.get('HW', '1.0')); EXTRA = [x for x in os.environ.get('EXTRA', '').split(',') if x]
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/' + PAGE + '.html'
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
docs = {}
DOCS = os.environ.get('DOCS', 'real11')
SIG = float(os.environ.get('SIG', '0.037')); SWF = float(os.environ.get('SWF', '1.9')); MODEL = os.environ.get('MODEL', 'gauss')
for f in glob.glob(SC + DOCS + '/waves/' + RUN + '_*.json'):
    d = json.load(open(f)); d = d.get('data', d); docs[d['wave']] = d
JS = r"""
([doc, prevTotal, fame, acc, prevSum, stacks, mode, deed, model]) => {
  const shapeRes = {}; const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const G = __yatd; while (G.modalKind) G.closeModal();
  if (mode === 'v12') { G.S.grozaW = deed[0]; G.S.greedW = deed[1]; }
  G.newRun(false); while (G.modalKind) G.closeModal();
  const run = G.run, L0 = doc.layout;
  const L = { cells: new Map(), edges: new Map(), entrance: L0.entrance, heartKey: L0.heart, entX: L0.entX };
  L0.cells.forEach(c => L.cells.set(c[0] + ',' + c[1], { cx: c[0], cy: c[1], x0: c[2], y0: c[3], x1: c[4], y1: c[5], lvl: c[6], born: 0, objs: c[7].map(o => o[3] ? [o[0], o[1], o[2], 1] : [o[0], o[1], o[2]]), rt: c[8] || undefined, rk: c[9] || undefined }));
  [...L.cells.values()].forEach(c => { if (!c.rt) delete c.rt; if (!c.rk) delete c.rk; });
  L0.edges.forEach(e => { const k = e[0] < e[1] ? e[0] + '|' + e[1] : e[1] + '|' + e[0]; L.edges.set(k, { key: k, a: e[0], b: e[1], horiz: !!e[2], pa: e[3], pb: e[4], lvl: e[5], born: 0 }); });
  if (L0.breach) L.breach = Object.assign({}, L0.breach, { fresh: true });
  run.layout = L; run.wave = doc.wave; run.total = prevTotal;
  if (mode === 'v12') { run.grozaTotal = fame[0]; run.greedRep = fame[1]; } else run.fameKill = fame;
  run.deck = (doc.deck || []).slice(); run.stacks = Object.assign({}, stacks); G.recomputeMods(); run.stacks = Object.assign({}, stacks);
  (doc.upgrades || []).forEach(id => { const u = G.UPG[id]; if (u && u.kind === 'unlock') run.unlocked.add(u.unlock); });
  run.items.clear();
  if (prevSum) run.waves.push({ stats: prevSum.stats, heroes: prevSum.heroes });
  const LM = [1, 1, 1.5, 2.2];
  L0.items.forEach(([type, x, y, lvl, dropped]) => { const T = G.ITEMS[type]; lvl = lvl || 1; const hp = T.hp ? T.hp * G.mods.monster * LM[lvl] : 0; run.items.set(x + ',' + y, { type, x, y, cd: 0, anim: 0, disabled: false, hp, max: hp, power: G.mods.monster * (T.hp ? LM[lvl] : 1), shot: 0.5, flash: 0, preview: 0, gx: x + 0.5, gy: y + 0.5, lvl, spent: dropped ? 0 : T.cost, dropped: !!dropped }); run.unlocked.add(type); });
  G.startBuild(true);
  if (deed[2] && deed[2].length) {   // experiment: extra elements spread along the entrance-to-heart path (ignores room capacity)
    const P = G.shortestPath(), want = deed[2].slice(), n = want.length, D8 = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[-2,0],[0,2],[0,-2]];
    want.forEach((type, i) => {
      const T = G.ITEMS[type], start = Math.floor(P.length * (0.1 + 0.8 * i / Math.max(1, n)));
      for (let j = 0; j < P.length; j++) { const q = P[(start + j) % P.length]; let done = false;
        for (const d of D8) { const x = q[0] + d[0], y = q[1] + d[1], k = x + ',' + y;
          if (G.slotOf(x, y) !== T.slot || G.fl.items.has(k)) continue;
          const hp = T.hp ? T.hp * G.mods.monster : 0;
          G.fl.items.set(k, { type, x, y, cd: 0, anim: 0, disabled: false, hp, max: hp, power: G.mods.monster, shot: 0.5, flash: 0, preview: 0, gx: x + 0.5, gy: y + 0.5, lvl: 1, spent: T.cost }); G.run.unlocked.add(type); done = true; break; }
        if (done) break; }
    });
  }
  run.next = G.makeWave(run.wave);
  if (L0.breach && !G.fl.breach) { /* breach from the doc is kept by startBuild(true) */ }
  // what the tavern knows: as many rooms (nearest the entrance) and traps as the last wave's survivors really told about
  const rrN = prevSum ? (prevSum.rumorRooms || 0) : 0, rtN = prevSum ? (prevSum.rumorTraps || 0) : 0;
  if (rrN > 0) {
    const rms = G.fl.rooms.filter(r => r.kind === 'room').sort((a, b) => a.dist - b.dist).slice(0, rrN), ids = new Set(rms.map(r => r.id));
    G.fl.rooms.forEach(r => { if (r.kind === 'hall' && r.doors.some(d => ids.has(d.a))) ids.add(r.id); });
    for (let i = 0; i < G.WW * G.WH; i++) if (ids.has(G.fl.roomAt[i])) run.rumor.tiles.set(i, run.wave - 1);
    const traps = [...G.fl.items.entries()].filter(([k, it]) => !G.ITEMS[it.type].rarity && !G.LOOT_KIND[it.type] && !G.ITEMS[it.type].hp && !G.ITEMS[it.type].build);
    for (let n = 0; n < rtN && traps.length; n++) { const [k, it] = traps.splice(Math.floor(Math.random() * traps.length), 1)[0]; run.rumor.traps.set(k, { type: it.type, wave: run.wave - 1 }); }
    if (rms.some(r => r.id === G.fl.heart.room)) run.rumor.heart = run.wave - 1;
  }
  const lvls = run.next.map(e => e.lvl), fm = G.fameNow ? Math.round(G.fameNow() * 10) / 10 : (G.hungerNeed ? G.hungerNeed(doc.wave) : 0);
  G.startWave();
  // what the player built during the real wave goes up at the same moment (free: the essence was spent in the real run)
  const builds = ((doc.timeline && doc.timeline.ev) || []).filter(e => e[1] === 'bd').map(e => ({ t: e[0], type: e[2], x: e[3], y: e[4] }));
  let guard = 0;
  while (guard++ < 200000) {
    if (G.modalKind) break;
    const f = G.fl;
    if (f.phase !== 'raid') break;
    while (builds.length && builds[0].t <= f.time) { const b = builds.shift(); run.unlocked.add(b.type); if (G.canPlace(b.type, b.x, b.y)) { f.essence += G.ITEMS[b.type].cost; G.tryPlace(b.type, b.x, b.y); } }
    if (f.check) { const c = f.check; if (!c.result) {
        let p;
        if (model[0] === 'gauss') {   // the player aims at the middle of the red strip and taps with a timing error (seconds, Gaussian)
          const pc = (c.r0 + c.r1) / 2; let u0 = null, prev = G.checkPos(c, 0);
          for (let u = 0.002; u <= 1.0001; u += 0.002) { const q = G.checkPos(c, u); if ((prev - pc) * (q - pc) <= 0 && u * c.dur >= 0.12) { u0 = u; break; } prev = q; }
          if (u0 === null) u0 = pc;
          const sig = model[1] * (c.shape === 'swing' ? model[2] : 1), t = u0 * c.dur + gauss() * sig;
          p = t / c.dur > 1 || t < 0 ? -1 : G.checkPos(c, t / c.dur);
        } else {
          const base = 1.15 * ({ bar: 1, ring: 1.15, pulse: 0.95, swing: 1.75 }[c.shape] || 1), pc = acc * Math.min(1, (c.dur || base) / base);
          p = Math.random() < pc ? (c.r0 + c.r1) / 2 : (Math.random() < 0.6 ? (c.g0 + c.g1) / 2 : Math.min(c.g0, c.r0) - 0.06);
        }
        G.resolveCheck(p); const sr = shapeRes[c.shape] = shapeRes[c.shape] || { crit: 0, ok: 0, miss: 0 }; sr[c.result] = (sr[c.result] || 0) + 1; } G.clearCheck(); continue; }
    G.step(0.05);
    if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } }
  }
  const w = run.waves[run.waves.length - 1] || {}, s = w.stats || {};
  const ev = (G.fl.tl && G.fl.tl.ev) || [], cps = ev.filter(e => e[1] === 'cp');
  return { pays: cps.length, comboPts: Math.round(s.comboPts || 0), essHeart: Math.round(s.essHeart || 0), fedAt: w.hunger ? w.hunger.fedAt : null, wave: doc.wave, lv: lvls.join(','), fame: fm, t: w.time, lost: w.crystalLost ? 1 : 0, k: s.kills, sc: s.scared, left: s.left, ch: s.checks, vol: s.volleys || 0, pts: Math.round(w.score || 0), fed: w.hunger && w.hunger.need ? (w.hunger.fed ? 1 : 0) : -1, need: w.hunger ? w.hunger.need : 0, rets: (G.run.returners || []).length, groza: w.groza || 0, greed: w.greed, heals: s.healed || 0, charms: s.charms || 0, guild: w.guild, prophecy: s.prophecy || 0,
    amu: s.amulets || 0, boots: s.boots || 0, faithOut: s.faithOut || 0, det: s.detours || 0, lostN: s.gotLost || 0, swaps: s.swaps || 0, dFear: Math.round(s.deathFear || 0), fearPts: Math.round(s.fearPts || 0), scarePts: Math.round(s.scarePts || 0), dmgPts: Math.round(s.dmgPts || 0), killPts: Math.round(s.killPts || 0), shapeRes, crystals: run.crystals, rooms: s.roomsVisited || 0 };
}"""
def hits(d): return sum(v.get('hits', 0) for v in d['summary']['items'].values())
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        for n in WAVES:
            if n not in docs: continue
            tot = sum(docs[k]['summary']['score'] for k in docs if k < n)
            if MODE == 'v12':   # the run's Groza so far (v11 score / greed), and the last wave's greed
                g = docs[n-1]['summary']['grozaTotal'] if (n - 1 in docs and 'grozaTotal' in docs[n-1]['summary']) else sum(docs[k]['summary']['score'] / max(1.0, docs[k]['summary'].get('greed', 1) or 1) for k in docs if k < n)
                fame = [g, (docs[n-1]['summary'].get('greed', 1) or 1) if n - 1 in docs else 1]
                if os.environ.get('GREP'): fame[1] = min(fame[1], float(os.environ['GREP']))
            else:
                fame = docs[n-1]['summary'].get('fameKill', 0) if n - 1 in docs else 0
            stacks = {}
            for k in sorted(docs):
                if k >= n: break
                dk = docs[k]; st = dk['summary']['stats']; deck = dk['deck']
                if 'chronicle' in deck: stacks['chronicle'] = stacks.get('chronicle', 0) + st['scared']
                if 'tempered' in deck: stacks['tempered'] = stacks.get('tempered', 0) + hits(dk)
                if 'bank' in deck and not dk['summary']['crystalLost']: stacks['bank'] = stacks.get('bank', 0) + 1
                if 'granary' in deck: stacks['granary'] = stacks.get('granary', 0) + st['kills']
                if 'hunger' in deck: stacks['hunger'] = stacks.get('hunger', 0) + dk['summary']['items'].get('spikes', {}).get('kills', 0)
            prev = docs[n-1]['summary'] if n - 1 in docs else None
            res = [await page.evaluate(JS, [docs[n], tot, fame, ACC, prev, stacks, MODE, [DEED, FW, EXTRA], [MODEL, SIG, SWF]]) for _ in range(REPS)]
            real = docs[n]['summary']
            agg = {}
            for r in res:
                for sh, v in (r.get('shapeRes') or {}).items():
                    a = agg.setdefault(sh, [0, 0, 0]); a[0] += v.get('crit', 0); a[1] += v.get('ok', 0); a[2] += v.get('miss', 0)
            print('W%d SHAPES %s rooms %.1f' % (n, ' '.join('%s %d/%d/%d' % (k, round(100 * v[0] / max(1, sum(v))), round(100 * v[1] / max(1, sum(v))), round(100 * v[2] / max(1, sum(v)))) for k, v in sorted(agg.items())), sum(r['rooms'] for r in res) / REPS), flush=True)
            mean = lambda a: round(sum(a) / max(1, len(a)))
            print('JSON ' + json.dumps({'w': n, 'reps': REPS, 'lost': sum(r['lost'] for r in res), 'fedN': sum(1 for r in res if r['fed'] == 1), 'need': res[0]['need'], 'pts': sorted(r['pts'] for r in res), 't': sorted(r['t'] or 0 for r in res), 'pays': mean([r['pays'] for r in res]), 'combo': mean([r['comboPts'] for r in res]), 'lv': res[0]['lv'], 'k': sum(r['k'] or 0 for r in res) / REPS, 's': sum(r['sc'] or 0 for r in res) / REPS, 'real': {'pts': real['score'], 't': real['time'], 'lost': 1 if real['crystalLost'] else 0}}), flush=True)
            print('W%d FED %d/%d need %d rets %.1f' % (n, sum(1 for r in res if r['fed'] == 1), sum(1 for r in res if r['fed'] >= 0), res[0]['need'], sum(r['rets'] for r in res) / REPS), flush=True)
            print('W%d SUM lost %d/%d tmean %d chk %d pts %d groza %d lvmax %d | k %.1f s %.1f left %.1f | fear %d scare %d dmg %d kill %d | amu %.1f boots %.1f faithOut %.1f det %.1f lost %.1f swaps %.1f dFear %d' % (n, sum(r['lost'] for r in res), REPS, mean([r['t'] or 0 for r in res]), mean([r['ch'] or 0 for r in res]), mean([r['pts'] for r in res]), mean([r['groza'] for r in res]), max(int(x) for x in res[0]['lv'].split(',')),
                sum(r['k'] or 0 for r in res) / REPS, sum(r['sc'] or 0 for r in res) / REPS, sum(r['left'] or 0 for r in res) / REPS, mean([r['fearPts'] for r in res]), mean([r['scarePts'] for r in res]), mean([r['dmgPts'] for r in res]), mean([r['killPts'] for r in res]),
                sum(r['amu'] for r in res) / REPS, sum(r['boots'] for r in res) / REPS, sum(r['faithOut'] for r in res) / REPS, sum(r['det'] for r in res) / REPS, sum(r['lostN'] for r in res) / REPS, sum(r['swaps'] for r in res) / REPS, mean([r['dFear'] for r in res])), flush=True)
            print('W%d lost %d/%d | t %s | lv %s fame %s | k/s/left %s | checks %s vol %s | pts %s | heals %s charms %s | guild %s proph %s || real: lost %d t %d k %d s %d pts %d' % (
                n, sum(r['lost'] for r in res), REPS, [r['t'] for r in res], res[0]['lv'], res[0]['fame'], [(r['k'], r['sc'], r['left']) for r in res],
                [r['ch'] for r in res], [r['vol'] for r in res], [r['pts'] for r in res], [r['heals'] for r in res], [r['charms'] for r in res], res[0]['guild'], [r['prophecy'] for r in res],
                1 if real['crystalLost'] else 0, real['time'], real['stats']['kills'], real['stats']['scared'], real['score']), flush=True)
        print('errs', errs[:3])
        await b.close()
asyncio.run(main())
