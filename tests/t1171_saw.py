# 1.17.1: heroes talk only about what they have seen. Unit checks of the line filter (tags, the thing of the moment,
# re-picking), bleeding is not fire, and organic waves in random dungeons: no hero remembers a thing that is not in the
# dungeon, no line is said by a hero who has not seen what it mentions, and with no fire anywhere nobody talks of flames.
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
JS = r"""async ([seed, nofire, runs]) => {
  const G = __yatd, fails = [], out = {};
  const ok = (c, m) => { if (!c) fails.push(m); };
  const key = (x, y) => x + ',' + y;
  const Rn = a => a[Math.floor(Math.random() * a.length)];
  const spotsFor = t => { const r = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(t, x, y)) r.push([x, y]); return r; };
  const runWave = (f, sec, each) => { for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); if (each) each(); } };
  // ---------- 1. the filter itself ----------
  { while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal();
    G.startWave(); const f = G.fl; runWave(f, 3);
    const h = G.alive()[0]; h.saw = new Set();
    const flame = 'Każdy płomień będzie mi się śnił...';
    ok(G.lineTags(flame) && G.lineTags(flame).includes('fire'), 'the flames line is tagged fire');
    ok(!G.lineOk(h, flame), 'no fire seen: the flames line is not his');
    for (let i = 0; i < 30; i++) { const t = G.fitLine(h, flame); ok(t !== flame && (t === null || G.lineOk(h, t)), 'refit gives another fitting line: ' + t); }
    G.sawAdd(h, ['fire']); ok(G.lineOk(h, flame), 'fire seen: he may say it');
    h.saw = new Set(['gold']);
    ok(G.lineOk(h, 'Złoto!'), 'gold seen: "Złoto!" fits');
    ok(G.sayNow(['potion'], () => !G.lineOk(h, 'Złoto!')), 'looking at a potion: not "Złoto!" even if he saw gold before');
    ok(G.sayNow(['gold'], () => G.lineOk(h, 'Złoto!')), 'looking at gold: "Złoto!"');
    h.saw = new Set(); ok(G.sayNow(['gate'], () => G.lineOk(h, G.LINE_NEEDS.gate[0])), 'the thing of the moment counts as known');
    const dl = G.LINE_NEEDS.death[0]; ok(!G.lineOk(h, dl), 'no death known: no death line');
    f.deaths = (f.deaths || []).concat([{ id: 99, t: f.time, knows: new Set([h.id]) }]); ok(G.lineOk(h, dl), 'a death he knows of: the line fits'); f.deaths.pop();
    out.needs = Object.fromEntries(Object.entries(G.LINE_NEEDS).map(([k, v]) => [k, v.length]));
    // bleeding (level 3 spikes) is piercing, not fire
    h.saw = new Set(); h.dmgBy = {}; h.hp = h.max; h.burnUntil = f.time + 2; h.burnBy = 'spikes'; h.courage = 999;
    runWave(f, 1);
    ok(!h.dmgBy.fire && h.dmgBy.pierce > 0, 'bleeding hurts as piercing: ' + JSON.stringify(h.dmgBy));
    ok(!h.saw.has('fire') && h.saw.has('blood'), 'bleeding: blood, no fire: ' + [...h.saw]);
  }
  // ---------- 2. organic waves ----------
  const TYPES = Object.keys(G.ITEMS).filter(t => G.ITEMS[t] && !G.ITEMS[t].tool && (G.TRAPS[t] || G.MONSTERS[t] || G.isLoot(t) || G.BUILDINGS[t]) && !(nofire && (t === 'fire' || t === 'powder')));
  const RTS = ['fog', 'swamp', 'grotto', 'crypt', 'vault', 'haven', 'gears', 'hush', 'ice'];
  const RKS = ['goblin', 'spider', 'ogre', 'haunt', 'bats', 'ossuary', 'armory', 'forge', 'prison', 'junk', 'gallery', 'nursery'].filter(k => !(nofire && (k === 'ossuary' || k === 'forge')));
  const agg = { said: 0, tagged: 0, bad: [], phantom: [], sawLines: 0, rkLines: 0, swap: 0, drop: 0, dropK: {}, fireLines: 0, heroes: 0, sawTags: {} };
  const SAWL = new Set(Object.values(G.SAY.saw || {}).flat()), RKL = new Set(Object.values(G.SAY.rkEnter || {}).flat());
  for (let n = 0; n < runs; n++) {
    while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal();
    G.fl.essence = 999;
    for (let k = 0; k < 60 && G.roomCount() < 7; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(Rn(dm)); G.fl.essence = 999; }
    const rooms = G.fl.rooms.filter(R => R.kind === 'room' && R.id !== G.fl.heart.room);
    rooms.sort(() => Math.random() - 0.5).slice(0, 4).forEach((R, i) => { const c = G.run.layout.cells.get(R.key); if (!c) return; if (i < 2) c.rt = Rn(RTS); else c.rk = Rn(RKS); if (i === 3) c.rt = Rn(RTS); });
    G.rebuildDungeon(true); G.run.wave = 4; G.startBuild(true);
    TYPES.forEach(t => G.run.unlocked.add(t));
    const pickT = TYPES.slice().sort(() => Math.random() - 0.5).slice(0, 9);
    let placed = 0;
    for (let k = 0; k < 40 && placed < 10; k++) { const t = Rn(pickT), sp = spotsFor(t); G.fl.essence = 999; if (sp.length) { const s = Rn(sp); if (G.tryPlace(t, s[0], s[1])) placed++; } }
    G.run.next = G.makeWave(5);
    G.startWave(); const f = G.fl;
    if (nofire) { G.mods.arrowBurn = false; G.mods.firepit = 0; }
    const board = new Set(['blood', 'death', 'heartSeen']);
    const scanBoard = () => {
      f.items.forEach(it => { G.itemTags(it, true).forEach(t => board.add(t)); if (it.type === 'lcursed') { board.add('cursed'); board.add('gear'); } if (it.type === 'archer') board.add('fire'); if (it.type === 'spider') board.add('web'); if (it.type === 'trapdoor' && G.mods.firepit) board.add('fire'); });
      f.rooms.forEach(R => { if (R.rt) board.add(R.rt); if (R.rk) board.add('k_' + R.rk); });
    };
    scanBoard();
    G.setSayHook((h, text, now) => {
      agg.said++; if (n === 0 && (agg.log = agg.log || []).length < 70) agg.log.push(Math.round(f.time) + ' ' + h.type + ': ' + text);
      if (SAWL.has(text)) agg.sawLines++; if (RKL.has(text)) agg.rkLines++;
      const tg = G.lineTags(text); if (!tg) return;
      agg.tagged++; if (tg.includes('fire')) agg.fireLines++;
      const miss = tg.filter(t => !G.knowsTag(h, t)); if (miss.length && agg.bad.length < 12) agg.bad.push(text + ' [' + miss + ']');
    });
    runWave(f, 220, scanBoard);
    G.setSayHook(null);
    f.heroes.forEach(h => { agg.heroes++; (h.saw ? [...h.saw] : []).forEach(t => { agg.sawTags[t] = (agg.sawTags[t] || 0) + 1; if (!board.has(t) && agg.phantom.length < 12) agg.phantom.push(t + ' (board: ' + [...board].join(',') + ')'); }); });
    (agg.waves = agg.waves || []).push([Math.round(f.time), f.stats.lines, f.stats.kills, f.stats.escaped || 0, f.heroes.length, f.phase]);
    agg.swap += f.stats.lineSwap || 0; agg.drop += f.stats.lineDrop || 0;
    Object.entries(f.stats.lineDropK || {}).forEach(([k, v]) => { agg.dropK[k] = (agg.dropK[k] || 0) + v; });
  }
  ok(!agg.bad.length, 'a line said without its thing: ' + agg.bad.join(' | '));
  ok(!agg.phantom.length, 'a hero remembers a thing not in the dungeon: ' + agg.phantom.join(' | '));
  if (nofire) ok(!agg.fireLines && !agg.sawTags.fire, 'no fire in the dungeon: nobody talks of flames (' + agg.fireLines + ' lines, ' + (agg.sawTags.fire || 0) + ' heroes)');
  ok(agg.said > 25 * runs, 'they still talk: ' + agg.said);
  out.agg = agg;
  return { fails, out };
}"""
async def main():
    seed = 1; nofire = '--nofire' in sys.argv; runs = 4
    for a in sys.argv:
        if a.startswith('--runs='): runs = int(a[7:])
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 900, 'height': 700})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + SC + 'test/page15.html')
        await pg.wait_for_timeout(600)
        r = await pg.evaluate(JS, [seed, nofire, runs])
        o = r['out']; a = o['agg']
        print('needs', o['needs'])
        print('said', a['said'], 'tagged', a['tagged'], 'saw lines', a['sawLines'], 'rkEnter', a['rkLines'], 'swap', a['swap'], 'drop', a['drop'], 'fire lines', a['fireLines'], 'heroes', a['heroes'])
        print('waves', a.get('waves'))
        if '--log' in sys.argv: print('\n'.join(a.get('log', [])))
        print('drop by key', sorted(a['dropK'].items(), key=lambda x: -x[1])[:15])
        print('memory', sorted(a['sawTags'].items(), key=lambda x: -x[1]))
        fails = r['fails'] + ['page error: ' + e for e in errs]
        print('FAILS', fails)
        await b.close()
        sys.exit(1 if fails else 0)
asyncio.run(main())
