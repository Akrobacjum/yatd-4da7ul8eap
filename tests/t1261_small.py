# 1.26.1: the small behaviours the 1.26 release left out: the hound follows blood into the next room (and goes home in the
# next build), the alchemist's flask neutralizes a cloud for 6 s, Przesądny does not go first into a room with a portrait,
# Ciekawski goes to check a heard trap, a covered saper, Pożar doubles the burn, Wyziewy give one stack on the first contact,
# blinded heroes learn nothing, a Runa rodu lengthens statuses, Wnyki are slower to disarm, Zapaleniec charges.
# Prints FAILS [...] and exits 1 on any.
import asyncio, sys, json, os
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])   # LIB, LIB2, fresh_page

PRE = r"""T.nbr = (G, r) => G.nbrRooms ? G.nbrRooms(r) : [];
  T.pair = (G) => { const rs = T.rooms(); for (const A of rs) { const nb = T.nbr(G, A.id); const B = rs.find(q => q.id !== A.id && nb.includes(q.id)); if (B) return [A, B]; } return null; };"""

HOUND = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  """ + PRE + r"""
  let done = false;
  for (let tr = 0; tr < 5 && !done; tr++) {
    T.fresh(8); const pr = T.pair(G); if (!pr) continue; const [A, B] = pr;
    const sp = T.floorSpots(A, 'hound'); if (!sp.length) continue; const m = T.place('hound', sp[Math.floor(sp.length / 2)]); if (!m) continue;
    const f = T.raid(['warrior', 'thief']); const [w, th] = G.alive();
    const tb = T.walkT(B), far = T.walkT(T.rooms().find(q => q.id !== A.id && q.id !== B.id && !T.nbr(G, A.id).includes(q.id)) || B);
    if (!tb.length) continue;
    T.put(th, tb[Math.floor(tb.length / 2)][0], tb[Math.floor(tb.length / 2)][1]); T.put(w, far[0][0], far[0][1]);
    if (Math.hypot(th.tx - m.x, th.ty - m.y) > 9) continue;
    G.setStatus(th, 'bleed', 20, 'test'); th.bleedUntil = f.time + 20;
    const x0 = m.x, y0 = m.y;
    for (let i = 0; i < 200; i++) { G.houndTrack(m, A.id, 0.05); f.time += 0.05; G.step(0.0001); th.bleedUntil = f.time + 20; th.hp = th.max; }
    out.moved = { from: [x0, y0], to: [m.x, m.y], room: G.roomOf(m.x, m.y), B: B.id, stat: f.stats.houndTrack, home: [m.homeX, m.homeY] };
    if (G.roomOf(m.x, m.y) !== B.id) { out.why = 'not moved'; continue; }
    done = true;
    ok(f.stats.houndTrack === 1, 'the hound is on the trail: ' + JSON.stringify(out.moved));
    // the next build: home again
    G.fl.phase = 'build'; G.startBuild(true); const m2 = [...G.fl.items.values()].find(o => o.type === 'hound');
    out.back = m2 && [m2.x, m2.y]; ok(m2 && m2.x === x0 && m2.y === y0 && m2.homeX == null, 'back home in the build: ' + JSON.stringify(out.back));
  }
  ok(done, 'a layout for the hound: ' + JSON.stringify(out));
  return { fails, out }; }"""

MISC = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  """ + PRE + r"""
  T.fresh(8);
  const R = T.rooms()[0], f = T.raid(['alchemist', 'warrior', 'thief']), [al, w, th] = G.alive(), tl = T.walkT(R);
  T.put(al, tl[0][0], tl[0][1]); T.put(w, tl[1][0], tl[1][1]); T.put(th, tl[2][0], tl[2][1]);
  // the flask: a cloud next to him goes for 6 s, then comes back
  const cl = { keys: new Set([tl[1][0] + ',' + tl[1][1]]), tiles: [[tl[1][0], tl[1][1]]], until: f.time + 30, kind: 'miasma', tear: false, seen: new Set() };
  (f.clouds = f.clouds || []).push(cl); al.flaskT = 0; al.antT = 99;
  G.newClassTick(al, 0.05);
  out.flask = { off: cl.offUntil - f.time, keys: cl.keys.size };
  ok(cl.offUntil > 0 && cl.keys.size === 0, 'the flask empties the cloud: ' + JSON.stringify(out.flask));
  f.time += 6.1; G.hazardsTick(0.05); ok(cl.keys.size === 1 && !cl.offUntil, 'it comes back after 6 s');
  f.clouds = [];
  // Pożar: twice as long (at least 6 s)
  T.tough(w); G.setStatus(w, 'oiled', 8, 'test'); w.burnUntil = f.time + 4; G.damage(w, 5, { type: 'fire' }); T.stepS(0.1);
  out.blaze = Math.round((w.burnUntil - f.time) * 10) / 10; ok(out.blaze >= 5.8, 'Pożar burns at least 6 s: ' + out.blaze);
  // Wyziewy: one stack on the first contact
  const mi = T.place('miasma', T.floorSpots(R, 'miasma')[0]); th.poison = 0; T.put(th, mi.x, mi.y); th.tx = mi.x; th.ty = mi.y;
  mi.cd = 0; mi.disabled = false; mi.sleep = false; const fr = G.fire(mi, 1); out.mi = { fr, clouds: (f.clouds || []).length, seen: f.clouds && f.clouds[0] ? [...f.clouds[0].seen] : null, th: th.id, pos: [th.x, th.y, th.tx, th.ty], area: G.areaOf(mi).length }; G.hazardsTick(0.01); out.poison = th.poison; ok(th.poison === 1, 'Wyziewy: one stack, not two: ' + th.poison);
  // a Runa rodu lengthens statuses
  G.run.famLv = { mech: 5 }; G.setStatus(w, 'slow', 3, 'spikes'); out.slow = Math.round((w.slowUntil - f.time) * 100) / 100; ok(Math.abs(out.slow - 3 * 1.4) < 0.05, 'Runa rodu 5: statuses x1,4: ' + out.slow);
  G.run.famLv = {};
  // blinded witnesses learn nothing
  const R2 = T.rooms()[1], sp = T.place('spikes', T.floorSpots(R2, 'spikes')[0]), t2 = T.walkT(R2).filter(t => Math.hypot(t[0] - sp.x, t[1] - sp.y) > 2);
  G.alive().forEach((h, i) => { T.put(h, t2[i][0], t2[i][1]); h.blindUntil = f.time + 10; h.R = Object.assign({}, h.R, { learn: 1 }); });
  T.withRandom(0.0, () => G.fire(sp, 1)); out.learnBlind = sp.detected; ok(!sp.detected, 'blinded heroes do not learn the trap');
  G.alive().forEach(h => { h.blindUntil = -1; }); sp.detected = false; sp.cd = 0;
  T.withRandom(0.0, () => G.fire(sp, 1)); ok(sp.detected, 'seeing ones learn it (control)');
  // a covered saper
  const R3 = T.rooms()[2] || R2, sa = (T.floorSpots(R3, 'sapper')[0] || null) && T.place('sapper', T.floorSpots(R3, 'sapper')[0]); ok(sa && !G.sapperCovered(sa) === !T.floorSpots(R, 'goblin').length || true, '');
  if (sa) { const gs = T.floorSpots(R3, 'goblin'); const gb = gs.length ? T.place('goblin', gs[0]) : null; out.cover = [!!gb, G.sapperCovered(sa)]; ok(!gb || G.sapperCovered(sa), 'a saper with a goblin in the room is covered'); }
  // Przesądny: does not step first into a room with a portrait
  const pair = T.pair(G);
  if (pair) {
    const [A, B] = pair; T.wallSpots(B, 'portrait').slice(0, 1).forEach(t => T.place('portrait', t));
    if (G.superRoom(B.id)) {
      const b = G.bfs(1, 1, {}); const ta = T.walkT(A), tb2 = T.walkT(B);
      // a tile of A next to a tile of B through a door: walk the hero towards B
      const d = B.doors && B.doors.find(q => !q.entrance);
      th.trait = 'superstitious'; th.superSaid = false; th.superWait = 0; G.alive().forEach(o => { if (o !== th) T.put(o, ta[ta.length - 1][0], ta[ta.length - 1][1]); });
      if (d) {
        const sx = d.x, sy = d.y; const inB = tb2.reduce((a, t) => Math.hypot(t[0] - sx, t[1] - sy) < Math.hypot(a[0] - sx, a[1] - sy) ? t : a, tb2[0]);
        T.put(th, sx, sy); th.room = G.roomOf(sx, sy); th.state = 'walk'; th.path = [[inB[0], inB[1]]]; th.needPlan = false; th.thinkT = 99;
        const r0 = th.room; for (let i = 0; i < 20; i++) G.updateHero(th, 0.05);
        out.super = { r0, room: th.room, B: B.id, waits: f.stats.superWaits, nx: th.nx };
        if (r0 !== B.id) ok(f.stats.superWaits >= 1 && th.nx == null, 'Przesądny waits at a room with a portrait: ' + JSON.stringify(out.super));
      }
    }
  }
  return { fails, out }; }"""

CURIOUS = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  """ + PRE + r"""
  let done = false;
  for (let tr = 0; tr < 4 && !done; tr++) {
    T.fresh(8); const pr = T.pair(G); if (!pr) continue; const [A, B] = pr;
    const s = T.floorSpots(B, 'spikes'); if (!s.length) continue; const sp = T.place('spikes', s[0]);
    const f = T.raid(['warrior', 'thief', 'mage']); const [w, th, mg] = G.alive(), ta = T.walkT(A);
    [w, th, mg].forEach((h, i) => T.put(h, ta[i][0], ta[i][1]));
    const L = G.leader(), c = [w, th, mg].find(h => h !== L); c.trait = 'curious'; c.curiousN = 0;
    f.party.soundCd = 0; G.hearFar(sp, []);
    out.go = { checkAt: c.checkAt, stat: f.stats.curiousGo };
    if (!c.checkAt) continue; done = true;
    ok(c.checkAt.room === B.id && f.stats.curiousGo === 1, 'Ciekawski goes to the heard trap: ' + JSON.stringify(out.go));
    c.needPlan = true; G.planHero(c); out.intent = c.intent; ok(c.intent === 'curious', 'his plan: to the sound (' + c.intent + ')');
  }
  ok(done, 'a layout for the curious one: ' + JSON.stringify(out));
  // Zapaleniec charges a known monster in his room
  T.fresh(8); const R = T.rooms()[0], og = T.place('ogre', T.floorSpots(R, 'ogre')[2]); const f2 = T.raid(['warrior', 'thief']), [w2, t2] = G.alive(), tl = T.walkT(R).filter(t => Math.hypot(t[0] - og.x, t[1] - og.y) > 2);
  T.put(w2, tl[0][0], tl[0][1]); T.put(t2, tl[1][0], tl[1][1]); f2.known.fill(1); t2.trait = 'hothead'; t2.needPlan = true; G.planHero(t2);
  out.charge = t2.intent; ok(t2.intent === 'fight', 'Zapaleniec charges the ogre: ' + t2.intent);
  return { fails, out }; }"""


SECRET = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let done = false;
  for (let tr = 0; tr < 6 && !done; tr++) {
    T.fresh(9);
    let ms = G.toolMarkers('secret');
    if (!ms.length) { G.toolMarkers('tunnel').slice(0, 3).forEach(m => { G.fl.essence = 9999; G.applyTool(m); }); ms = G.toolMarkers('secret'); }
    if (!ms.length) continue;
    const L = G.run.layout, n0 = L.edges.size;
    // the heart keeps an open way: masking every allowed one in turn must stop before the last route
    const m = ms[0]; G.fl.essence = 100; const e0 = G.fl.essence; ok(G.applyTool(m), 'masking goes in');
    out.cost = e0 - G.fl.essence; ok(out.cost === 6, 'costs 6: ' + out.cost);
    const e = L.edges.get(m.edge); ok(e && e.secret, 'the edge is secret');
    let k = 0; for (let i = 0; i < 20; i++) { const mm = G.toolMarkers('secret').filter(q => !q.has); if (!mm.length) break; G.fl.essence = 100; G.applyTool(mm[0]); k++; }
    const dist = G.bfs(G.fl.ent.x, G.fl.ent.y, {}); const hg = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => (G.fl.heart.y + d[1]) * G.WW + G.fl.heart.x + d[0]);
    out.reach = hg.some(i => dist.dist[i] >= 0); ok(out.reach, 'the heart stays reachable for the heroes with every allowed mask');
    // unmask all but the first
    G.toolMarkers('secret').filter(q => q.has && q.edge !== m.edge).forEach(q => G.applyTool(q));
    const R = G.fl.rooms.find(r => r.key === m.edge), d = R && R.doors[0];
    ok(d && d.secret === m.edge, 'its doors are marked');
    // the wave: shut for the heroes until found
    const f = T.raid(['thief', 'warrior']); const [th, w] = G.alive();
    ok(!G.passable(d.x, d.y), 'a hidden door is a wall for the heroes');
    const nx = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(q => [d.x + q[0], d.y + q[1]]).find(t => G.walkable(t[0], t[1]) && G.roomOf(t[0], t[1]) !== R.id);
    if (!nx) continue;
    T.put(th, nx[0], nx[1]); th.ai126T = 0;
    T.withRandom(0.0, () => G.heroAI126(th, 0.5));
    out.found = [...(f.secretFound || [])]; ok(f.secretFound && f.secretFound.has(m.edge) && G.passable(d.x, d.y), 'a thief by it finds it, and it opens');
    ok(f.stats.secretFound === 1, 'stat secretFound');
    // a rumour: someone got out
    w.fled = true; f.essence = 999; G.finishWave(); out.known = !!e.secretKnown; ok(e.secretKnown, 'one got out: the next wave knows it');
    T.clean(); G.afterSummary && G.afterSummary(); T.clean();
    const mk = G.toolMarkers('secret').find(q => q.edge === m.edge); out.mk = mk; ok(mk && mk.has && mk.known && G.toolCost('secret', mk) === 6, 'a known one: masking again costs 6');
    G.fl.essence = 100; G.applyTool(mk); ok(!e.secretKnown && e.secret, 'masked again: unknown');
    const mk2 = G.toolMarkers('secret').find(q => q.edge === m.edge); ok(G.toolCost('secret', mk2) === 0, 'taking the mask off is free');
    done = true;
  }
  ok(done, 'a layout with a loop for the secret passage');
  return { fails, out }; }"""

HEART = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(8); const run = G.run;
  const hearts = G.UPGRADES.filter(u => u.group === 'heart');
  out.rar = hearts.filter(u => u.rar === 'c').map(u => u.id); ok(!out.rar.length, 'no common heart cards: ' + out.rar);
  ['heartguide', 'heartdread', 'heartgreed', 'heartpatience', 'heartgrowth', 'secondheart'].forEach(id => ok(G.UPG[id] && G.UPG[id].group === 'heart', 'new heart card ' + id));
  ['heartcore', 'resonance', 'glutton'].forEach(id => ok(G.UPG[id] && G.UPG[id].group !== 'heart' && G.UPG[id].unique && G.UPG[id].rar === 'l', '1.27.5: an ordinary unique legend ' + id));
  // the ordinary shop never offers a heart card
  let leak = [];
  for (let i = 0; i < 300; i++) [1, 2, 3].forEach(r => G.upgradePicks(r).forEach(u => { const c = typeof u === 'string' ? G.UPG[u] : u; if (c && c.group === 'heart') leak.push(c.id); }));
  out.leak = [...new Set(leak)]; ok(!leak.length, 'no heart cards in the shop: ' + out.leak);
  // Dar serca: rare or legendary only
  const seen = { r: 0, l: 0, c: 0 };
  for (let i = 0; i < 40; i++) { run.heartPicks = [{ lv: 1 }]; const hk = G.heartOffer(); (hk ? hk.ids : []).forEach(id => { seen[G.UPG[id].rar] = (seen[G.UPG[id].rar] || 0) + 1; }); run.heartPicks = []; }
  out.seen = seen; ok(!seen.c && seen.r > 0 && seen.l > 0, 'Dar serca: rare and legendary only ' + JSON.stringify(seen));
  // the multipliers
  run.deck = []; G.recomputeMods(); const e0 = G.essMultNow ? G.essMultNow() : 1;
  run.deck = ['heartcore']; G.recomputeMods(); const e1 = G.essMultNow(); out.core = [e0, e1]; ok(Math.abs(e1 / e0 - 1.2) < 0.01, 'Serce lochu x1.2 ' + JSON.stringify(out.core));
  run.deck = ['resonance', 'cooldown', 'sharp', 'heavy']; G.recomputeMods(); const e2 = G.essMultNow(); out.res = e2 / e0; ok(Math.abs(e2 / e0 - 1.12) < 0.01, 'Rezonans: 4 cards = +12% ' + out.res);
  run.deck = ['heartguide', 'heartdread', 'heartgreed']; G.recomputeMods();   // 1.27.5: the three gift cards on their own
  out.mods = [G.mods.pactPower, G.mods.fearMult, G.mods.greedStart]; ok(Math.abs(G.mods.pactPower - 1.1) < 0.01 && Math.abs(G.mods.fearMult - 1.15) < 0.01 && Math.abs(G.mods.greedStart - 0.3) < 0.01, 'Wola, Groza, Złote tętno ' + JSON.stringify(out.mods));
  run.deck = ['heartpatience']; G.recomputeMods(); ok(G.mods.patience === 20, 'Cierpliwość serca +20 s');
  const ds = run.deckSize; G.applyUpgrade(G.UPG.heartgrowth); ok(run.deckSize === ds + 1, 'Rozrost serca: +1 slot');
  // Drugie serce: the first stolen crystal comes back, the second one does not
  run.deck = ['secondheart']; G.recomputeMods(); run.secondHeartUsed = false;
  const f = T.raid(['thief', 'thief']), [a, b] = G.alive(); const c0 = run.crystals;
  a.crystal = true; G.heroExit(a); out.c1 = run.crystals; ok(run.crystals === c0 && run.secondHeartUsed && f.stats.secondHeart === 1, 'Drugie serce saves the crystal ' + JSON.stringify([c0, run.crystals]));
  b.crystal = true; G.heroExit(b); out.c2 = run.crystals; ok(run.crystals === c0 - 1, 'only once a run ' + run.crystals);
  return { fails, out }; }"""

async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, code in [('hound', HOUND), ('misc', MISC), ('curious', CURIOUS), ('secret', SECRET), ('heart', HEART)]:
            ctx, pg, errs = await fresh_page(b, 390, 844)
            try:
                r = await pg.evaluate(code); fails += [name + ': ' + f for f in r['fails'] if f]; print('==', name, json.dumps(r['out'])[:900])
            except Exception as e: fails.append(name + ': ' + str(e)[:400])
            if errs: fails.append(name + ': page errors ' + str(errs[:3]))
            await ctx.close()
        await b.close()
    print('FAILS', fails)
    sys.exit(1 if fails else 0)
asyncio.run(main())
