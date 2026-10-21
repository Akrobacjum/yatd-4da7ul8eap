# 1.17 heroes: the council at the end of patience (votes, decision, the outvoted going home alone, +30 s once), curiosity
# (looking around a room, searching furniture), a trap heard from another room, names in the genitive
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
PRE = r"""const G = __yatd; while (G.modalKind) G.closeModal();
  G.newRun(false); while (G.modalKind) G.closeModal();
  if (big) {
    const Rn = a => a[Math.floor(Math.random() * a.length)]; G.fl.essence = 999;
    for (let k = 0; k < 60 && G.roomCount() < big; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(Rn(dm)); G.fl.essence = 999; }
    for (let k = 0; k < 6; k++) { const tm = G.toolMarkers('tunnel'); if (tm.length) G.applyTool(Rn(tm)); G.fl.essence = 999; }
    G.run.wave = 6; G.startBuild(true);
  }
  const nx = G.makeWave(6).slice(0, types.length); nx.forEach((e, i) => { e.type = types[i]; e.trait = traits ? traits[i] : null; e.lvl = Math.max(e.lvl, 6); e.boss = null; }); G.run.next = nx;
  G.startWave(); const f = G.fl; const said = []; const run = (sec) => { for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05);
    G.alive().forEach(h => { if (h.bubble && h.bubble.text !== h._lastSaid) { h._lastSaid = h.bubble.text; said.push(h.bubble.text); } }); } };
"""
COUNCIL = "async ([types, traits, big, known, hurt]) => { " + PRE + r"""
  run(10);
  const P = f.party; if (!G.leader()) return { err: 'no party' };
  if (known) { f.heartKnown = true; P.heartSaid = true; }
  if (hurt) G.alive().forEach(h => { h.hp = 0.3 * h.max; h.fear = 0.7 * h.courage; });
  else G.alive().forEach(h => { h.hp = h.max; h.fear = 0; });
  P.plan = 'explore'; f.patT = G.S.waveTime;
  const res = { opened: false, stage: [], plan0: P.plan };
  for (let i = 0; i < 400 && f.phase === 'raid'; i++) { run(0.05); if (P.council) { res.opened = true; if (!res.stage.includes(P.council.stage)) res.stage.push(P.council.stage); if (P.council.votes) res.votes = P.council.votes; if (P.council.res) res.res = P.council.res; } else if (res.opened) break; }
  const s = f.stats;
  res.after = { plan: P.plan, fearless: f.fearless, storm: !!f.storm, more: P.councilMore, patLeft: Math.round(G.S.waveTime - f.patT), goHome: s.goHome || 0, gh: G.alive().filter(h => h.goHome).length,
    homeExiting: G.alive().filter(h => h.goHome).every(h => h.intent === 'exit' || h.nx !== null || h.path.length >= 0) };
  res.councils = s.councils || 0; res.said = said.slice(-12);
  // a second council after the extra time: no 'more' this time
  if (P.councilMore && !f.fearless) { f.patT = G.S.waveTime; let o2 = false; for (let i = 0; i < 400 && f.phase === 'raid'; i++) { run(0.05); if (P.council) { o2 = true; if (P.council.res) res.res2 = P.council.res; } else if (o2 || f.fearless) break; } res.second = { opened: o2, plan: P.plan, fearless: f.fearless }; }
  return res; }"""
LOOK = "async ([types, traits, big]) => { " + PRE + r"""
  run(6);
  const L = G.leader(), P = f.party; if (!L) return { err: 'no party' };
  const r = L.room >= 0 ? L.room : G.roomOf(L.x, L.y); if (r < 0) return { err: 'no room' };
  // bring the whole party into the leader's room, calm and whole
  G.alive().forEach(h => { h.hp = h.max; h.fear = 0; });
  const spots = G.lookSpots(r, L);
  P.plan = 'explore'; P.lookCd = 0; P.detour = null; P.prep = null; f.patT = 10; P.morale = 1;
  let tries = 0, started = false;
  for (; tries < 12 && !started; tries++) { if (P.lookRolled) P.lookRolled.delete(r); G.lookRoll(L, r); started = !!P.look; }
  const res = { spots: spots.length, kinds: [...new Set(spots.map(s => s.kind))], started, tries, n: started ? P.look.ids.length : 0 };
  if (!started) return res;
  let arrived = 0, maxApart = 0, waited = 0, looked = new Set();
  for (let i = 0; i < 260 && f.phase === 'raid' && P.look; i++) {
    run(0.05);
    G.alive().forEach(h => { if (h.look && h.look.at >= 0) looked.add(h.id); if (h !== L) maxApart = Math.max(maxApart, Math.hypot(h.x - L.x, h.y - L.y)); });
    if (L.state === 'talk' || L.state === 'wait') waited++;
  }
  res.looked = looked.size; res.maxApart = Math.round(maxApart * 10) / 10; res.leaderStill = Math.round(waited * 0.05 * 10) / 10; res.ended = !P.look;
  res.stats = { looks: f.stats.looks || 0, lookTraps: f.stats.lookTraps || 0, goldFound: f.stats.goldFound || 0 };
  res.said = said.slice(-10);
  run(4); res.movedOn = Math.hypot(L.x - (L._x0 || 0), 0) >= 0;
  return res; }"""
HEAR = "async ([types, traits, big]) => { " + PRE + r"""
  run(8);
  const L = G.leader(), P = f.party; if (!L) return { err: 'no party' };
  // a trap in a room away from everyone, within 12 tiles of the leader
  const dR = R => Math.min(...R.tiles.map(q => Math.hypot(q[0] - L.tx, q[1] - L.ty)));
  const rooms = f.rooms.filter(R => R.kind === 'room' && !G.alive().some(h => h.room === R.id) && dR(R) <= 10).sort((a, b) => dR(a) - dR(b));
  if (!rooms.length) return { err: 'no room near' };
  const R = rooms[0], t = R.tiles.filter(q => G.walkable(q[0], q[1])).sort((a, b) => Math.hypot(a[0] - L.tx, a[1] - L.ty) - Math.hypot(b[0] - L.tx, b[1] - L.ty))[0];
  const it = { type: 'spikes', x: t[0], y: t[1] };
  P.soundCd = 0; const h0 = f.stats.heard || 0;
  G.hearFar(it, []);
  run(1.5);
  return { heard: (f.stats.heard || 0) - h0, sound: !!P.sound, said: said.slice(-4) }; }"""
DEATH = "async ([types, traits, big]) => { " + PRE + r"""
  run(8);
  const L = G.leader(); if (!L) return { err: 'no party' };
  const others = G.alive().filter(o => o !== L);
  const far = others[0], victim = others[1]; if (!far || !victim) return { err: 'small party' };
  // send one far away (another room, out of earshot and shouting range), kill one next to the leader
  let best = null, bd = -1;
  for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) { if (!G.walkable(x, y) || G.roomOf(x, y) < 0 || G.roomOf(x, y) === L.room) continue; const d = Math.hypot(x - L.x, y - L.y); if (d > bd) { bd = d; best = [x, y]; } }
  if (!best || bd < 15) return { err: 'no far spot', bd };
  const put = (h, x, y) => { h.x = h.tx = x; h.y = h.ty = y; h.nx = null; h.ny = null; h.prog = 0; h.room = G.roomOf(x, y); h.path = []; h.needPlan = true; };
  put(far, best[0], best[1]); far.fear = 0; far.fearBy = {}; far.wanderTarget = -1; far.wanderUntil = f.time + 30; far.state = 'wait'; far.timer = 30;
  put(victim, L.tx, L.ty);
  G.damage(victim, 99999, { kind: 'heart' }); run(0.3);
  const d = (f.deaths || [])[0]; if (!d) return { err: 'no death record' };
  const res = { bd: Math.round(bd), farKnows: d.knows.has(far.id), farFear: Math.round((far.fearBy.death || 0) * 10) / 10, leaderKnows: d.knows.has(L.id), shaken: far.shakenUntil > f.time };
  // bring him back next to the leader: he hears the news
  put(far, L.tx, L.ty); far.state = 'walk'; far.wanderUntil = -1; run(2);
  res.later = { knows: d.knows.has(far.id), fear: Math.round((far.fearBy.death || 0) * 10) / 10, news: f.stats.newsDeaths || 0 };
  return res; }"""
ORGANIC = "async ([types, traits, big]) => { " + PRE + r"""
  let g = 0; while (g++ < 200000) { if (G.modalKind || f.phase !== 'raid') break;
    if (f.check) { const c = f.check; if (!c.result) G.resolveCheck((c.r0 + c.r1) / 2); G.clearCheck(); continue; }
    G.step(0.05); G.alive().forEach(h => { if (h.bubble && h.bubble.text !== h._lastSaid) { h._lastSaid = h.bubble.text; said.push(h.bubble.text); } });
    if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } }
  const w = G.run.waves[G.run.waves.length - 1], s = w.stats;
  return { rooms: G.roomCount(), t: Math.round(w.time), looks: s.looks || 0, lookNo: s.lookNo || 0, lookTraps: s.lookTraps || 0, gold: s.goldFound || 0, heard: s.heard || 0,
    councils: s.councils || 0, cH: s.councilHome || 0, cS: s.councilStorm || 0, cM: s.councilMore || 0, goHome: s.goHome || 0, score: Math.round(w.score), braces: said.filter(x => /[{}]/.test(x)).length }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.install(); await pg.goto('file://' + SC + 'test/page15.html'); await pg.clock.run_for(800)
        await pg.evaluate("__yatd.setUser && __yatd.setUser(true)")
        fails = []
        N = int(sys.argv[1]) if len(sys.argv) > 1 else 4
        T4 = ['warrior', 'thief', 'mage', 'priest']
        # names in the genitive
        gen = await pg.evaluate("""() => { const G = __yatd; return [G.nameGen({ female: true, nm: ['Wanda', 'Wandę', 'Wando'] }), G.nameGen({ female: true, nm: ['Jadwiga', 'Jadwigę', 'Jadwigo'] }), G.nameGen({ female: true, nm: ['Zofia', 'Zofię', 'Zofio'] }),
          G.nameGen({ female: true, nm: ['Hela', 'Helę', 'Helu'] }), G.nameGen({ female: false, nm: ['Borys', 'Borysa', 'Borysie'] }), G.nameFill('bez {g}', { female: true, nm: ['Ewa', 'Ewę', 'Ewo'] })]; }""")
        print('GEN', gen)
        if gen != ['Wandy', 'Jadwigi', 'Zofii', 'Heli', 'Borysa', 'bez Ewy']: fails.append('genitive names')
        # council: brave and healthy with the heart known -> mostly storm; cowards hurt and scared -> home; heart unknown -> home or more
        cs = [await pg.evaluate(COUNCIL, [T4, ['brave', 'brave', 'greedy', 'brave'], 0, True, False]) for _ in range(N)]
        print('COUNCIL brave', json.dumps(cs))
        ch = [await pg.evaluate(COUNCIL, [T4, ['coward', 'coward', 'careful', 'coward'], 0, True, True]) for _ in range(N)]
        print('COUNCIL scared', json.dumps(ch))
        cu = [await pg.evaluate(COUNCIL, [T4, ['greedy', 'greedy', 'greedy', 'brave'], 0, False, False]) for _ in range(N)]
        print('COUNCIL unknown', json.dumps(cu))
        allc = [r for r in cs + ch + cu if not r.get('err')]
        if len(allc) < N * 2: fails.append('too few council tries')
        if not all(r['opened'] and 'talk' in r['stage'] for r in allc): fails.append('the council opens and talks')
        if any(r.get('res') not in ('home', 'storm', 'more') for r in allc): fails.append('a council decides')
        for r in allc:
            a = r['after']
            if r.get('res') == 'home' and not (a['plan'] == 'leave' and a['fearless']): fails.append('home -> leave'); break
            if r.get('res') == 'storm' and not (a['plan'] == 'assault' and a['fearless'] and a['storm']): fails.append('storm -> assault'); break
            if r.get('res') == 'more' and not (a['more'] and not a['fearless'] and 20 <= a['patLeft'] <= 31): fails.append('more -> +30 s'); break
        if any(r.get('res') == 'storm' for r in cu): fails.append('no storm when the heart is unknown')
        if sum(1 for r in cs if r.get('res') == 'storm') < max(1, N // 2): fails.append('a brave healthy party mostly storms')
        if sum(1 for r in ch if r.get('res') == 'home') < max(1, N // 2): fails.append('a scared hurt party mostly goes home')
        for r in allc:
            if 'second' in r and r.get('res2') == 'more': fails.append('a second +30 s'); break
        # curiosity in a bigger dungeon
        ls = [await pg.evaluate(LOOK, [T4, ['greedy', 'careful', 'brave', 'greedy'], 10]) for _ in range(N + 2)]
        print('LOOK', json.dumps(ls))
        okl = [r for r in ls if r.get('started')]
        if len(okl) < max(2, N // 2): fails.append('too few look-arounds started (%d)' % len(okl))
        if okl and sum(1 for r in okl if r['looked'] >= 1) < len(okl) * 0.6: fails.append('they walk up and look')
        if okl and not all(r['ended'] for r in okl): fails.append('a look-around ends')
        hs = [await pg.evaluate(HEAR, [T4, None, 10]) for _ in range(N)]
        print('HEAR', json.dumps(hs))
        okh = [r for r in hs if not r.get('err')]
        if okh and not all(r['heard'] == 1 for r in okh): fails.append('a far trap is heard')
        ds = [await pg.evaluate(DEATH, [T4, None, 12]) for _ in range(N)]
        print('DEATH', json.dumps(ds))
        okd = [r for r in ds if not r.get('err')]
        if len(okd) < 1: fails.append('no clean death tries')
        for r in okd:
            if r['farKnows'] or r['farFear'] > 0 or r['shaken']: fails.append('a far hero reacts to a death at once'); break
        for r in okd:
            if not r['leaderKnows']: fails.append('the leader saw the death'); break
        for r in okd:
            if not (r['later']['knows'] and r['later']['fear'] > 0 and r['later']['news'] >= 1): fails.append('he learns of it when he rejoins'); break
        os_ = [await pg.evaluate(ORGANIC, [T4, None, 12]) for _ in range(N)]
        print('ORGANIC', json.dumps(os_))
        if sum(r['looks'] for r in os_) < 1: fails.append('nobody looked around in %d waves' % N)
        if any(r['braces'] for r in os_): fails.append('a bubble with a raw template')
        if errs: fails.append('page errors')
        print('FAILS', fails); print('errs', errs[:4]); await b.close()
asyncio.run(main())
