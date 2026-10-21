# 1.19 Rozłam: a second group goes its own way and comes back, loses its leader, stays at the council while the rest go
# home, a mutiny changes the leader, a sulker leaves and returns; organic waves with no errors and bounded second groups
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
JS = r"""async ([runs]) => {
  const G = __yatd, fails = [], out = {};
  const ok = (c, m) => { if (!c) fails.push(m); };
  const Rn = a => a[Math.floor(Math.random() * a.length)];
  const step = (f, sec, each) => { for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); if (each && each()) break; } };
  const setup = (types, traits) => {
    while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal();
    G.fl.essence = 999;
    for (let k = 0; k < 60 && G.roomCount() < 8; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(Rn(dm)); G.fl.essence = 999; }
    G.run.wave = 5; G.startBuild(true);
    const nx = G.makeWave(5).slice(0, types.length); nx.forEach((e, i) => { e.type = types[i]; e.trait = traits[i]; e.lvl = Math.max(e.lvl, 6); e.boss = null; e.rank = e.rank || 1; }); G.run.next = nx;
    G.startWave(); const f = G.fl; step(f, 8); return f;
  };
  // 1. a second group goes its own way, is away (split Groza), and meets the rest again
  { const f = setup(['warrior', 'thief', 'barbarian', 'mage', 'priest'], [null, 'greedy', 'brave', null, null]);
    const L = G.leader(), P = f.party, others = G.alive().filter(o => o !== L);
    const D = others[0], J = others[1];
    G.alive().forEach(h => { h.courage = 999; h.hp = h.max; });
    const okS = G.g2Start(D, [J], 'explore', -1, 'fork');
    ok(okS && P.g2 && G.inG2(D) && G.inG2(J) && !G.inG2(L), 'second group made');
    ok(G.leader() === L, 'the main leader stays');
    ok(G.groupLeaderOf(J) === D, 'a member follows the second group leader');
    let maxApart = 0, ended = -1;
    step(f, 90, () => { if (P.g2) { maxApart = Math.max(maxApart, Math.hypot(D.x - L.x, D.y - L.y)); return false; } ended = f.time; return true; });
    out.fork = { maxApart: Math.round(maxApart), ended: Math.round(ended), splitT: Math.round(f.stats.splitTime || 0), merges: f.stats.merges || 0, rifts: f.stats.rifts };
    ok(maxApart > 4.5, 'the second group went away: ' + maxApart);
    ok(ended > 0, 'the second group ended (met the rest or rejoined) within 90 s');
    ok((f.stats.splitTime || 0) > 0, 'away on purpose pays split Groza');
  }
  // 2. the second group loses its leader: another one leads them back
  { const f = setup(['warrior', 'thief', 'barbarian', 'mage', 'priest'], [null, 'greedy', 'brave', null, null]);
    const L = G.leader(), P = f.party, others = G.alive().filter(o => o !== L);
    G.g2Start(others[0], [others[1], others[2]], 'explore', -1, 'fork');
    step(f, 3);
    const D = others[0]; D.hp = 0; D.dead = true; G.kill(D, 'trap', 'spikes');
    step(f, 0.5);
    ok(!P.g2 || (P.g2.leaderId !== D.id && P.g2.plan === 'regroup'), 'a new leader takes the group back: ' + JSON.stringify(P.g2 && { l: P.g2.leaderId, p: P.g2.plan }));
  }
  // 3. the council: the rest go home, the minority stays and explores
  { const f = setup(['warrior', 'thief', 'barbarian', 'mage', 'priest'], [null, 'greedy', 'brave', null, null]);
    const L = G.leader(), P = f.party, others = G.alive().filter(o => o !== L);
    G.councilDone({ res: 'home', leave: [], rift: { ids: [others[0].id, others[1].id], plan: 'explore' } }, L);
    ok(P.g2 && P.g2.why === 'council', 'the council group made');
    step(f, 6);
    ok(P.plan === 'leave', 'the rest go home');
    ok(!P.g2 || [...P.g2.ids].every(id => { const h = f.heroes.find(o => o.id === id); return h.plan !== 'leave'; }), 'the ones who stayed are not going home');
  }
  // 4. a mutiny: a brave veteran takes the lead
  { const f = setup(['warrior', 'thief', 'barbarian', 'mage'], [null, null, 'brave', null]);
    const P = f.party, L = G.leader(), C = G.alive().find(o => o !== L && o.type === 'barbarian');
    f.time = Math.max(f.time, 31); L.rank = 0; C.rank = 2; C.hp = C.max; C.fear = 0; P.morale = 0.3; P.lastTalkAt = -99; P.leaderId = L.id;
    G.alive().forEach(h => { h.talkUntil = -1; if (h !== C) { h.fear = 0.7 * h.courage; h.hp = 0.4 * h.max; } });
    f.deaths = [{ id: 99, t: f.time, knows: new Set([L.id]) }];
    const mr = Math.random; Math.random = () => 0.001;
    try { G.mutinyThink(L, G.alive(), 1, 0.4, 0.7); } finally { Math.random = mr; }
    ok(f.stats.mutinies === 1, 'a mutiny happened');
    out.mutiny = { wins: f.stats.mutinyWins || 0, leader: P.leaderId, C: C.id };
    if (f.stats.mutinyWins) ok(P.leaderId === C.id, 'the challenger leads');
    step(f, 12);
    ok(!f.party.g2 || f.party.g2.why === 'sulk', 'only a sulk group after a mutiny');
  }
  // 5. a sulker leaves and comes back
  { const f = setup(['warrior', 'thief', 'barbarian', 'mage'], [null, 'greedy', null, null]);
    const P = f.party, L = G.leader(), S = G.alive().find(o => o !== L && o.trait === 'greedy') || G.alive().find(o => o !== L);
    G.alive().forEach(h => { h.courage = 999; });
    P.sulkAfter = { id: S.id, at: f.time };
    step(f, 0.3);
    ok(P.g2 && P.g2.why === 'sulk' && P.g2.ids.size === 1, 'the sulker goes alone');
    let back = false; step(f, 80, () => { if (!P.g2) { back = true; return true; } return false; });
    ok(back, 'the sulker is back (or the group ended) within 80 s');
  }
  // 6. organic waves
  const agg = { rifts: 0, mutinies: 0, sulks: 0, merges: 0, g2Time: 0, waves: 0, maxG2: 0 };
  for (let n = 0; n < runs; n++) {
    const f = setup(Rn([['warrior', 'thief', 'barbarian', 'mage', 'priest'], ['warrior', 'bard', 'thief', 'priest'], ['barbarian', 'warrior', 'thief', 'mage', 'bard', 'priest']]), [null, 'greedy', 'brave', 'careful', null, 'coward']);
    let g2From = -1;
    step(f, 200, () => { const P = f.party; if (P.g2 && g2From < 0) g2From = f.time; if (!P.g2 && g2From >= 0) { agg.maxG2 = Math.max(agg.maxG2, f.time - g2From); g2From = -1; } return !G.alive().length; });
    const s = f.stats; agg.waves++; agg.rifts += s.rifts || 0; agg.mutinies += s.mutinies || 0; agg.sulks += s.sulks || 0; agg.merges += s.merges || 0; agg.g2Time += Math.round(s.g2Time || 0);
  }
  ok(agg.maxG2 < 120, 'a second group does not last forever: ' + agg.maxG2);
  out.agg = agg;
  return { fails, out };
}"""
async def main():
    runs = 4
    for a in sys.argv:
        if a.startswith('--runs='): runs = int(a[7:])
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 900, 'height': 700})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + SC + 'test/page15.html')
        await pg.wait_for_timeout(600)
        r = await pg.evaluate(JS, [runs])
        print(json.dumps(r['out'], ensure_ascii=False))
        fails = r['fails'] + ['page error: ' + e for e in errs[:5]]
        print('FAILS', fails)
        await b.close()
        sys.exit(1 if fails else 0)
asyncio.run(main())
