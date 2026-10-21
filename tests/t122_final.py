# 1.22 Finał fali: the escort walks next to the carrier and a guard soaks a monster's blow, the crystal is handed over, a last stand
# holds a monster and then leaves, a sacrifice sets a trap off and the others pass, "ty pierwszy" sends the other one in first,
# tapping finds a hidden spikes trap (30 tries, 20%+), "nie tędy" changes the target, the formation (frontLine, the wounded steps
# back, the back line keeps off), the new lines; organic waves with crystal thefts with no page errors and no stuck run.
# Prints FAILS [...] and exits 1 on any. (--only=escort,hand,...; --seeds=0,1,2)
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t118_cards.py').read().split('# ---------- 1.')[0])   # LIB (T.fresh, T.raid, T.put, T.tough, T.place, T.withRandom, T.stepS)
from playwright.async_api import async_playwright
LIB2 = r"""() => { const { G } = T;
  T.quiet = () => { G.fl.heroes.forEach(o => { o.bubble = null; o.saidUntil = -9; o.sayQ = null; }); G.fl.party.queueSay = []; G.fl.party.convoT = 0; };
  T.said = []; G.setSayHook((h, t) => T.said.push([h.id, t]));
  T.saidBy = (h, key, o) => T.said.some(s => s[0] === h.id && [].concat(G.SAY[key] || [], G.SOLO[key] || []).some(x => (o ? G.nameFill(x, o) : x) === s[1]));
  T.queued = (h, key, o) => G.fl.party.queueSay.some(q => q.id === h.id && G.SAY[key].some(x => (o ? G.nameFill(x, o) : x) === q.text));
  T.spoke = (h, key, o) => T.saidBy(h, key, o) || T.queued(h, key, o) || (h.sayQ || []).some(e => [].concat(G.SAY[key] || [], G.SOLO[key] || []).some(x => (o ? G.nameFill(x, o) : x) === e.text));
  T.big = () => T.rooms().slice().sort((a, b) => b.tiles.length - a.tiles.length);
  T.of = t => G.alive().find(h => h.type === t);
  T.walk = h => { h.state = 'walk'; h.timer = 0; h.needPlan = true; };
  T.setup = (types, pre, n) => { T.fresh(n || 7); const rs = T.big(), R = rs[0], R2 = rs[1]; if (pre) pre(T.room(R), T.room(R2)); const f = T.raid(types); G.fl.known.fill(1);
    const w = T.of('warrior'); if (w) { f.party.leaderId = w.id; w.rank = 1; } return { f, R: T.room(R), R2: T.room(R2) }; };
  T.near = (h, R, n) => { const t = T.walkT(R).sort((p, q) => Math.hypot(p[0] - h.x, p[1] - h.y) - Math.hypot(q[0] - h.x, q[1] - h.y)); return t.slice(1, 1 + (n || 1)); };
  T.cheb = (a, b) => Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));
  T.exitD = () => { const f = G.fl, b = G.bfs(f.ent.x, f.ent.y, { noDanger: true }); return h => b.dist[h.ty * G.WW + h.tx]; };
  // the room furthest from the way in (the crystal run starts there)
  T.deep = () => { const d = T.exitD(); return T.big().map(T.room).sort((a, b) => d({ tx: b.tiles[0][0], ty: b.tiles[0][1] }) - d({ tx: a.tiles[0][0], ty: a.tiles[0][1] }))[0]; };
  T.steal = c => { G.takeCrystal([c]); G.alive().forEach(o => { o.plan = 'escape'; o.needPlan = true; if (o.state === 'wait') o.state = 'walk'; }); };
  T.resolve = (hit) => { const c = G.fl.check; if (c && !c.result) { G.resolveCheck(hit ? (c.g0 + c.g1) / 2 : 0.001); G.clearCheck(); return true; } return false; };
  T.run = (sec, each, hit) => { const f = G.fl; for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { if (T.resolve(hit !== false)) continue; G.step(0.05); if (each && each()) break; } };
  return true; }"""
# ---------- 1. the escort; a guard soaks a blow ----------
ESCORT = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  { const { f } = T.setup(['warrior', 'thief', 'mage', 'priest'], null, 8);
    const D = T.deep(), tl = T.walkT(D), hs = ['thief', 'warrior', 'mage', 'priest'].map(T.of), c = hs[0];
    hs.forEach((h, i) => { T.put(h, tl[i * 4 % tl.length][0], tl[i * 4 % tl.length][1]); T.walk(h); });
    T.quiet(); T.said = [];
    T.steal(c); T.run(0.3);
    ok(f.stats.escortForms === 1, 'the escort formed: ' + f.stats.escortForms);
    ok(hs.slice(1).every(h => h.escort), 'everyone who sees him guards: ' + hs.map(h => h.escort ? 1 : 0));
    T.run(2.5);
    ok(hs.slice(1).some(h => T.spoke(h, 'escortForm')), 'escortForm said');
    ok(hs.some(h => T.spoke(h, 'escortGuard', c)) && T.spoke(c, 'carrierThanks'), 'a guard speaks to the carrier, he answers: ' + JSON.stringify(T.said.slice(0, 8)));
    // while the carrier walks: how close the guards are (the mean of the guards, the nearest one); the warrior in front is
    // reported only (in a passage nobody gets past the carrier)
    let n = 0, sum = 0, one = 0, front = 0, fn = 0;
    const ex = T.exitD();
    T.run(10, () => { if (!c.crystal || c.fled) return true; if (c.nx === null) return false;
      const d = hs.slice(1).filter(h => !h.dead && !h.fled).map(h => G.hdist(h, c)); if (!d.length) return true;
      n++; sum += d.reduce((a, x) => a + x, 0) / d.length; if (Math.min(...d) <= 2.3) one++;
      const w = hs[1]; if (!w.fled && G.hdist(w, c) <= 3) { fn++; if (ex(w) <= ex(c)) front++; } return false; });
    out.escort = { samples: n, mean: Math.round(10 * sum / Math.max(1, n)) / 10, nearest: n ? Math.round(100 * one / n) : 0, warriorFront: fn ? Math.round(100 * front / fn) : -1, intents: hs.map(h => h.intent) };
    ok(n > 40 && sum / n <= 4, 'the guards keep close to the carrier (mean 4 tiles at most): ' + JSON.stringify(out.escort));
    ok(one / Math.max(1, n) >= 0.8, 'a guard is next to him (2 tiles) most of the way: ' + JSON.stringify(out.escort));
  }
  // a guard next to the carrier takes half of a goblin's blow (a warrior 70%)
  { let gob = null;
    const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], R => { const s = T.floorSpots(R, 'goblin'); T.place('goblin', s[Math.floor(s.length / 2)]); });
    gob = [...f.items.values()].find(o => o.type === 'goblin'); ok(gob, 'a goblin placed');
    if (gob) {
      const [w, th, mg] = ['warrior', 'thief', 'mage'].map(T.of);
      const adj = T.walkT(R).filter(t => Math.max(Math.abs(t[0] - gob.x), Math.abs(t[1] - gob.y)) === 1);
      const c = th; T.put(c, adj[0][0], adj[0][1]);
      const nb = T.walkT(R).filter(t => Math.max(Math.abs(t[0] - c.x), Math.abs(t[1] - c.y)) === 1 && !(t[0] === gob.x && t[1] === gob.y));
      T.put(mg, nb[0][0], nb[0][1]); T.put(w, nb[1][0], nb[1][1]); w.x = w.tx = 1; w.y = w.ty = 1;   // the warrior away first
      c.crystal = true; f.party.carrierId = c.id; c.state = 'fight'; c.foe = gob; gob.hp = gob.max = 1e6;
      const hit = (fn) => { const a = c.hp, b = mg.hp, d = w.hp; fn(); G.monstersTick(0.2); c.state = 'fight'; c.foe = gob; return [a - c.hp, b - mg.hp, d - w.hp]; };
      const base = hit(() => { mg.escort = false; w.escort = false; });
      const half = hit(() => { mg.escort = true; });
      w.x = w.tx = nb[1][0]; w.y = w.ty = nb[1][1]; w.room = G.roomOf(w.x, w.y);
      const war = hit(() => { mg.escort = true; w.escort = true; });
      out.soak = { base, half, war };
      ok(base[0] > 0 && Math.abs(half[0] / base[0] - 0.5) < 0.02 && half[1] > 0, 'a guard takes half of the blow: ' + JSON.stringify(out.soak));
      ok(Math.abs(war[0] / base[0] - 0.3) < 0.02 && war[2] > 0 && war[1] === 0, 'a warrior guard takes 70%: ' + JSON.stringify(out.soak));
      ok(f.stats.guardSoaks >= 2, 'guard soaks counted: ' + f.stats.guardSoaks);
    }
  }
  return { fails, out }; }"""
# ---------- 2. the hand-over ----------
HAND = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f } = T.setup(['warrior', 'thief', 'mage', 'priest'], null, 8);
  const D = T.deep(), tl = T.walkT(D), [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  T.put(th, tl[0][0], tl[0][1]); const nb = T.near(th, D, 3); T.put(mg, nb[0][0], nb[0][1]); T.put(w, nb[2][0], nb[2][1]); T.put(pr, tl[tl.length - 1][0], tl[tl.length - 1][1]);
  [w, th, mg, pr].forEach(T.walk);
  T.steal(th); const taken = f.stats.crystalTaken;
  T.quiet(); T.said = [];
  th.hp = 0.3 * th.max; mg.hp = mg.max; w.hp = 0.5 * w.max;
  G.finalThink(G.alive(), G.leader(), 0.25);
  out.hand = { th: th.crystal, mg: mg.crystal, carrier: f.party.carrierId, n: f.stats.handOvers };
  ok(!th.crystal && mg.crystal && f.party.carrierId === mg.id && f.stats.handOvers === 1, 'the crystal moves to the healthier one next to him: ' + JSON.stringify(out.hand));
  ok(f.stats.crystalTaken === taken && !f.stats.crystalLost, 'the theft stats unchanged');
  ok(T.spoke(th, 'handOver', mg), 'handOver said ({v} = the receiver)');
  ok(T.spoke(mg, 'handTake') || f.stats.convos > 0, 'handTake (or a talk)');
  mg.hp = 0.2 * mg.max; th.hp = th.max;
  G.finalThink(G.alive(), G.leader(), 0.25);
  ok(mg.crystal && f.stats.handOvers === 1, 'not twice within 6 s');
  f.time += 6.5; G.finalThink(G.alive(), G.leader(), 0.25);
  ok(th.crystal && f.stats.handOvers === 2, 'after 6 s again (the old carrier, whole again): ' + f.stats.handOvers);
  th.hp = 0.2 * th.max; mg.hp = mg.max; f.time += 6.5; G.finalThink(G.alive(), G.leader(), 0.25);
  ok(th.crystal && f.stats.handOvers === 2, 'at most twice a wave');
  T.run(1);
  ok(!G.fl.heroes.some(h => h.crystal && h !== th), 'one carrier');
  return { fails, out }; }"""
# ---------- 3. the last stand ----------
STAND = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let tries = 0, done = false;
  while (!done && tries++ < 4) {
    const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], R => { const s = T.floorSpots(R, 'ghost'); T.place('ghost', s[Math.floor(s.length / 2)]); }, 8);
    const gh = [...f.items.values()].find(o => o.type === 'ghost'); if (!gh) continue;
    const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), tl = T.walkT(R);
    gh.hp = gh.max = 1e6;
    const near = tl.filter(t => Math.hypot(t[0] + 0.5 - gh.gx, t[1] + 0.5 - gh.gy) <= 2.5 && Math.hypot(t[0] + 0.5 - gh.gx, t[1] + 0.5 - gh.gy) >= 1.2);
    if (near.length < 3) continue;
    T.put(th, near[0][0], near[0][1]); T.put(w, near[1][0], near[1][1]); T.put(mg, near[2][0], near[2][1]); T.put(pr, tl[0][0], tl[0][1]);
    w.trait = 'brave'; [w, th, mg, pr].forEach(T.walk);
    T.steal(th); T.quiet(); T.said = [];
    G.finalThink(G.alive(), G.leader(), 0.25);
    done = true;
    ok(f.stats.lastStands === 1 && G.standing(w), 'the brave warrior makes a last stand: ' + f.stats.lastStands);
    ok(T.spoke(w, 'lastStand'), 'lastStand said');
    ok([th, mg, pr].some(o => T.spoke(o, 'lastStandReply', w)) || f.stats.convos > 0, 'a friend answers');
    const goal = w.stand.goal, room = G.roomOf(gh.x, gh.y);
    let drawn = 0, n = 0, away = 0;
    T.run(5, () => { n++; if (G.driftTarget(gh, room) === w) drawn++; if (w.nx === null && w.ty * G.WW + w.tx !== goal) away++; return false; });
    out.stand = { door: w.stand.door, n, drawn, away, state: w.state, intent: w.intent };
    ok(G.standing(w) && w.intent === 'stand', 'he still stands after 5 s: ' + JSON.stringify(out.stand));
    ok(drawn > 0.5 * n, 'the ghost goes for him: ' + JSON.stringify(out.stand));
    const ex = T.exitD(), d0 = ex(w);
    T.run(4);
    ok(!G.standing(w), 'the stand is over after 8 s');
    T.run(4);
    out.stand.left = [d0, ex(w), w.fled];
    ok(w.fled || ex(w) < d0, 'then he runs for the exit: ' + JSON.stringify(out.stand.left));
    // the hp limit: a stand ends under 25% HP
    w.stand = { m: gh, goal, door: false, until: f.time + 8, at: f.time, done: false }; w.hp = 0.2 * w.max; G.finalThink(G.alive(), G.leader(), 0.25);
    ok(!G.standing(w), 'a stand ends under 25% HP');
  }
  ok(done, 'a ghost layout for the stand');
  return { fails, out }; }"""
# ---------- 4. the sacrifice ----------
SAC = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let done = false;
  for (let k = 0; k < 8 && !done; k++) {
    T.fresh(8);
    // a room with one door; a web next to it covers the door: the only way out goes through it
    const R = T.rooms().map(T.room).find(R => R.doors.length === 1 && T.floorSpots(R, 'web').some(t => Math.abs(t[0] - R.doors[0].x) + Math.abs(t[1] - R.doors[0].y) === 1));
    if (!R) continue;
    const d = R.doors[0], s = T.floorSpots(R, 'web').find(t => Math.abs(t[0] - d.x) + Math.abs(t[1] - d.y) === 1);
    const web = T.place('web', s); if (!web) continue;
    const f = T.raid(['warrior', 'thief', 'mage', 'priest']); G.fl.known.fill(1);
    const Rr = T.room(R), wb = [...f.items.values()].find(o => o.type === 'web'); if (!wb) continue;
    const area = new Set(G.areaOf(wb).map(t => t[1] * G.WW + t[0]));
    const tl = T.walkT(Rr).filter(t => !area.has(t[1] * G.WW + t[0])).sort((a, b) => Math.hypot(a[0] - d.x, a[1] - d.y) - Math.hypot(b[0] - d.x, b[1] - d.y));
    if (tl.length < 4) continue;
    const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
    [th, w, mg, pr].forEach((h, i) => { T.put(h, tl[i][0], tl[i][1]); T.walk(h); });
    w.trait = 'brave'; wb.detected = true; wb.cd = 0; G.rebuildThreat();
    f.party.leaderId = mg.id;
    T.steal(th); T.quiet(); T.said = [];
    T.run(1.1, null, false);
    done = true;
    ok(f.stats.sacrifices === 1 && w.sac, 'the brave one goes to set it off: ' + f.stats.sacrifices);
    ok(T.spoke(w, 'sacrifice'), 'sacrifice said');
    ok([th, mg, pr].some(o => T.spoke(o, 'sacrificeReply', w)), 'a friend answers');
    // the others wait before it until it has gone off (the check is resolved as a hit)
    let early = 0, fired = -1, inT = -1;
    T.run(25, () => { const ti = th.ty * G.WW + th.tx; if (area.has(ti) && wb.cd <= 0 && fired < 0) early++; if (fired < 0 && wb.cd > 0) fired = f.time; if (inT < 0 && area.has(ti)) inT = f.time; return th.fled || G.roomOf(th.tx, th.ty) !== Rr.id && th.ty * G.WW + th.tx !== d.y * G.WW + d.x && fired > 0 && inT > 0; });
    out.sac = { fired: Math.round(fired), carrierIn: Math.round(inT), early, stat: f.stats.sacrificeFired, out: G.roomOf(th.tx, th.ty) !== Rr.id, wState: w.state };
    ok(fired > 0 && f.stats.sacrificeFired === 1, 'the trap went off: ' + JSON.stringify(out.sac));
    ok(early === 0, 'the carrier did not step in before it went off: ' + JSON.stringify(out.sac));
    ok(inT >= fired && out.sac.out, 'the carrier passed during its cooldown: ' + JSON.stringify(out.sac));
    ok(T.spoke(w, 'sacrificeDone') || w.dead, 'sacrificeDone said');
  }
  ok(done, 'a one-door room for the sacrifice');
  return { fails, out }; }"""
# ---------- 5. "ty pierwszy" ----------
FIRST = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let f, R, R2, door, out1, nb;
  for (let k = 0; k < 6; k++) {   // R2 with a door that has free floor outside it (and a second free tile next to that)
    ({ f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest'], (R, R2) => { const s = T.floorSpots(R2, 'spikes'); T.place('spikes', s[Math.floor(s.length / 2)]); }));
    door = R2.doors.find(d => !d.entrance && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(q => G.walkable(d.x + q[0], d.y + q[1]) && G.roomOf(d.x + q[0], d.y + q[1]) !== R2.id));
    if (!door) continue;
    out1 = [[door.x + 1, door.y], [door.x - 1, door.y], [door.x, door.y + 1], [door.x, door.y - 1]].find(t => G.walkable(t[0], t[1]) && G.roomOf(t[0], t[1]) !== R2.id);
    nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(q => [out1[0] + q[0], out1[1] + q[1]]).filter(t => G.walkable(t[0], t[1]) && G.roomOf(t[0], t[1]) !== R2.id);
    if (nb.length && [...f.items.values()].some(o => o.type === 'spikes')) break; door = null;
  }
  ok(door, 'a door to walk in by'); if (!door) return { fails, out };
  const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), sp = [...f.items.values()].find(o => o.type === 'spikes');
  sp.detected = true; G.rebuildThreat();
  // the coward stands at the door of R2 (on the side away from it) and walks in
  T.put(mg, out1[0], out1[1]); mg.trait = 'coward'; f.party.leaderId = mg.id; f.party.plan = 'explore';
  T.put(th, nb[0][0], nb[0][1]); th.rank = 0; T.put(w, T.walkT(R)[0][0], T.walkT(R)[0][1]); T.put(pr, T.walkT(R)[2][0], T.walkT(R)[2][1]);
  [mg, th].forEach(T.walk);
  const tgt = T.walkT(R2).sort((a, b) => Math.hypot(b[0] - door.x, b[1] - door.y) - Math.hypot(a[0] - door.x, a[1] - door.y))[0];
  const b = G.bfs(mg.x, mg.y, { known: true }); mg.path = G.pathFrom(b, tgt[1] * G.WW + tgt[0]);
  const n = mg.path.find(p => G.roomOf(p[0], p[1]) === R2.id);
  T.quiet(); T.said = [];
  const r = T.withRandom(0.1, () => G.youFirst(mg, n));
  ok(r && th.firstInto && th.firstInto.room === R2.id, 'the rookie is sent first: ' + JSON.stringify(th.firstInto));
  ok(mg.state === 'wait' && Math.abs(mg.timer - 1.5) < 0.01, 'the coward waits 1,5 s');
  ok(T.spoke(mg, 'youFirst', th), 'youFirst said ({v} = the rookie)');
  ok(T.spoke(th, 'youFirstReply') || f.stats.convos > 0, 'the rookie answers');
  f.party.detour = { goal: tgt[1] * G.WW + tgt[0], until: f.time + 30 };   // the coward goes on into R2 after his wait
  let tTh = -1, tMg = -1;
  T.run(12, () => { if (tTh < 0 && th.room === R2.id) tTh = f.time; if (tMg < 0 && mg.room === R2.id && G.roomOf(mg.tx, mg.ty) === R2.id) tMg = f.time; return tTh > 0 && tMg > 0; });
  out.first = { th: Math.round(tTh * 10) / 10, mg: Math.round(tMg * 10) / 10 };
  ok(tTh > 0 && (tMg < 0 || tTh <= tMg), 'the named one walks in first: ' + JSON.stringify(out.first));
  ok(G.youFirst(mg, n) === false, 'not again at once');
  return { fails, out }; }"""
# ---------- 6. tapping the floor ----------
TAP = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R, R2 } = T.setup(['warrior'], (R, R2) => { const s = T.floorSpots(R2, 'spikes'); T.place('spikes', s[Math.floor(s.length / 2)]); });
  const h = T.of('warrior'), sp = [...f.items.values()].find(o => o.type === 'spikes'), P = f.party;
  h.trait = 'careful'; h.R = Object.assign({}, h.R, { detect: 0, caution: 0 }); h.inv = [];
  const door = R2.doors.find(dd => !dd.entrance);
  const start = [[door.x + 1, door.y], [door.x - 1, door.y], [door.x, door.y + 1], [door.x, door.y - 1]].find(t => G.walkable(t[0], t[1]) && G.roomOf(t[0], t[1]) !== R2.id);
  // the far side of the room, beyond the spikes from the door
  const far = T.walkT(R2).filter(t => !(t[0] === sp.x && t[1] === sp.y)).sort((a, b) => Math.hypot(b[0] - door.x, b[1] - door.y) - Math.hypot(a[0] - door.x, a[1] - door.y))[0];
  let tries = 0, rolled = 0, found = 0, slow = 0;
  for (let k = 0; k < 60 && tries < 30; k++) {
    sp.detected = false; sp.disabled = false; sp.cd = 0; G.rebuildThreat();
    R2.visited = false; G.fl.rooms[R2.id].visited = false; h.taps = 0; h.tap = null; h.enteredRoom = -1;
    T.put(h, start[0], start[1]); T.walk(h); h.hp = h.max;
    h.tapRolled = new Set(); h.tap = { room: R2.id, found: 0, rolled: h.tapRolled };   // he will tap this one (the 60% roll is the room's, tested in the waves)
    P.plan = 'explore'; f.fearless = false; h.plan = null; P.detour = { goal: far[1] * G.WW + far[0], until: f.time + 30 };   // (the storm after 130 s would end the exploring)
    const f0 = f.stats.tapFound || 0; tries++;
    // the path goes past the spikes: put them on it
    G.planHero(h); const pth = h.path.slice(); const on = pth.find(p => G.roomOf(p[0], p[1]) === R2.id && Math.max(Math.abs(p[0] - sp.x), Math.abs(p[1] - sp.y)) <= 1);
    if (!on) { tries--; continue; }
    T.run(8, () => (h.tap && h.tap.rolled.size > 0 && (h.tap.found || h.x === sp.x && h.y === sp.y)) || h.ty * G.WW + h.tx === P.detour.goal, false);
    if (h.tap && h.tap.rolled.size) rolled++;
    if ((f.stats.tapFound || 0) > f0) found++;
  }
  out.tap = { tries, rolled, found, rate: rolled ? Math.round(100 * found / rolled) : 0 };
  ok(rolled >= 20, 'the stick was used near the spikes: ' + JSON.stringify(out.tap));
  ok(found / Math.max(1, rolled) >= 0.2 && found < rolled, 'tapping finds the hidden spikes sometimes (20%+): ' + JSON.stringify(out.tap));
  // the start (60%), the slower step, tapNothing, at most 3 rooms
  h.tap = null; h.taps = 0; T.quiet(); T.said = []; T.put(h, start[0], start[1]); T.walk(h); h.fear = 0; P.plan = 'explore'; h.plan = null; f.fearless = false;
  out.why = { fleeing: h.fleeing, crystal: h.crystal, goHome: h.goHome, lost: h.lost, st: h.state, plan: P.plan, hplan: h.plan, panic: h.panicUntil - f.time, fearless: f.fearless, taps: h.taps, tap: !!h.tap, kind: f.rooms[R2.id].kind };
  T.withRandom(0.1, () => G.tapRoom(h, R2.id, true));
  ok(h.tap && h.tap.room === R2.id && f.stats.taps >= 1 && T.spoke(h, 'tapFloor'), 'a careful one starts tapping in a fresh room: ' + JSON.stringify(out.why));
  T.quiet(); T.withRandom(0.1, () => G.tapRoom(h, R.id, true));
  ok(h.tap && h.tap.room === R.id && T.spoke(h, 'tapNothing'), 'leaving with nothing found: tapNothing');
  h.taps = 3; h.tap = null; T.withRandom(0.1, () => G.tapRoom(h, R2.id, true)); ok(!h.tap, 'at most 3 rooms a wave');
  h.taps = 0; h.trait = null; T.withRandom(0.1, () => G.tapRoom(h, R2.id, true)); ok(!h.tap, 'only the careful (or a rookie thief)');
  h.trait = 'careful'; T.withRandom(0.1, () => G.tapRoom(h, R2.id, false)); ok(!h.tap, 'not in a room they walked through');
  return { fails, out }; }"""
# ---------- 7. "nie tędy" ----------
NTW = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let done = false;
  for (let k = 0; k < 6 && !done; k++) {
    const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], null, 8);
    const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), P = f.party, tl = T.walkT(R);
    [w, th, mg, pr].forEach((h, i) => { T.put(h, tl[i][0], tl[i][1]); T.walk(h); });
    f.rooms.forEach(r => { if (r.kind === 'room') { r.seen = true; r.visited = false; } }); f.rooms[R.id].visited = true;
    P.plan = 'explore'; P.wantSearch = true; P.leaderId = w.id; w.rank = 1;
    G.chooseTarget(w);
    if (P.target < 0 || P.targetRoom < 0) continue;
    const B = f.rooms[P.targetRoom];
    // a known trap in the target's room that hurt the thief this wave
    const spot = B.tiles.find(t => G.walkable(t[0], t[1]) && !f.items.has(t[0] + ',' + t[1]));
    const trap = { type: 'spikes', x: spot[0], y: spot[1], cd: 0, lvl: 1, detected: true, disabled: false };
    f.items.set(spot[0] + ',' + spot[1], trap); G.rebuildThreat();
    P.hurt = new Map([[trap, new Set([th.id])]]);
    const before = P.target, bRoom = P.targetRoom;
    T.quiet(); T.said = [];
    G.notThisWay(w, G.alive());
    done = true;
    out.ntw = { before, after: P.target, room: bRoom, newRoom: P.targetRoom, n: f.stats.notThisWay, moved: f.stats.notThisWayMoved || 0 };
    ok(f.stats.notThisWay === 1, 'the hurt one objects: ' + JSON.stringify(out.ntw));
    ok(T.spoke(th, 'notThisWay'), 'notThisWay said by the one it hurt');
    ok(P.target !== before && P.targetRoom !== bRoom, 'the leader picks another target: ' + JSON.stringify(out.ntw));
    G.notThisWay(w, G.alive()); ok(f.stats.notThisWay === 1, 'once a wave');
    f.items.delete(spot[0] + ',' + spot[1]); G.rebuildThreat();
  }
  ok(done, 'a target for "nie tędy"');
  return { fails, out }; }"""
# ---------- 8. the formation ----------
FORM = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let f, R, gob, adj, far;
  for (let k = 0; k < 6; k++) {   // a goblin with room round it (two free tiles next to it, two at 3 tiles)
    ({ f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], R => { const s = T.floorSpots(R, 'goblin').filter(t => t[0] >= R.x0 + 1 && t[0] <= R.x1 - 1 && t[1] >= R.y0 + 1 && t[1] <= R.y1 - 1); if (s.length) T.place('goblin', s[Math.floor(s.length / 2)]); }));
    gob = [...f.items.values()].find(o => o.type === 'goblin'); if (!gob) continue;
    adj = T.walkT(R).filter(t => Math.max(Math.abs(t[0] - gob.x), Math.abs(t[1] - gob.y)) === 1);
    far = T.walkT(R).filter(t => Math.max(Math.abs(t[0] - gob.x), Math.abs(t[1] - gob.y)) >= 2).sort((p, q) => Math.hypot(p[0] - gob.x, p[1] - gob.y) - Math.hypot(q[0] - gob.x, q[1] - gob.y));
    if (adj.length >= 4 && far.length >= 4) break; gob = null;
  }
  ok(gob, 'a goblin with room round it'); if (!gob) return { fails, out };
  gob.hp = gob.max = 1e6;
  const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  T.put(th, adj[0][0], adj[0][1]); T.put(mg, adj[adj.length - 1][0], adj[adj.length - 1][1]);
  T.put(w, far[2][0], far[2][1]); T.put(pr, far[far.length - 1][0], far[far.length - 1][1]);
  [w, th, mg, pr].forEach(T.walk);
  th.state = 'fight'; th.foe = gob; mg.state = 'fight'; mg.foe = gob; th.hp = 0.25 * th.max;
  f.party.leaderId = pr.id;
  T.quiet(); T.said = [];
  G.formThink(G.alive(), G.finOf(f.party));
  ok(w.front === gob && f.stats.frontLines === 1 && T.spoke(w, 'frontLine'), 'the warrior holds the front: frontLine');
  ok(th.state !== 'fight' && th.woundBack && f.stats.woundedBack === 1 && T.spoke(th, 'woundedBack'), 'the wounded one steps back: woundedBack');
  ok(mg.state !== 'fight', 'the mage steps out of the melee');
  let wf = false, thFight = 0, mgNear = 0, n = 0;
  T.run(3.5, () => { n++; if (w.state === 'fight' && w.foe === gob) wf = true; if (th.state === 'fight') thFight++; if (wf && Math.max(Math.abs(mg.tx - gob.x), Math.abs(mg.ty - gob.y)) < 2 && mg.nx === null) mgNear++; return false; });
  const ch = h => Math.max(Math.abs(h.tx - gob.x), Math.abs(h.ty - gob.y));
  out.form = { wf, thFight, mgNear, n, th: ch(th), mg: ch(mg), w: ch(w), ints: [w, th, mg, pr].map(h => h.intent + ':' + h.state) };
  ok(wf, 'the warrior goes and fights it: ' + JSON.stringify(out.form));
  ok(thFight === 0 && out.form.th >= 2, 'the wounded one does not fight for 4 s and stands 2+ off it: ' + JSON.stringify(out.form));
  ok(out.form.mg >= 2 && mgNear < 0.3 * n, 'the mage keeps 2+ tiles off it: ' + JSON.stringify(out.form));
  // the warrior takes the blows
  const a = w.hp, b = mg.hp; mg.state = 'fight'; mg.foe = gob; w.state = 'fight'; w.foe = gob; G.monstersTick(0.2);
  ok(w.hp < a && mg.hp === b, 'the goblin hits the warrior first');
  G.formThink(G.alive(), G.finOf(f.party)); ok(f.stats.frontLines === 1, 'frontLine once a fight');
  th.state = 'fight'; th.foe = gob; G.formThink(G.alive(), G.finOf(f.party)); ok(f.stats.woundedBack === 1, 'woundedBack once a hero a wave');
  return { fails, out }; }"""
# ---------- 9. the lines ----------
LINES = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const K = ['escortForm', 'escortGuard', 'carrierThanks', 'handOver', 'handTake', 'lastStand', 'lastStandReply', 'sacrifice', 'sacrificeReply', 'sacrificeDone', 'youFirst', 'youFirstReply', 'tapFloor', 'tapFound', 'tapNothing', 'notThisWay', 'frontLine', 'woundedBack', 'nearExit'];
  const V = ['escortGuard', 'handOver', 'lastStandReply', 'sacrificeReply', 'youFirst'];
  out.n = {};
  K.forEach(k => { const a = G.SAY[k]; out.n[k] = a ? a.length : 0; ok(a && a.length >= 9, k + ': 9+ lines');
    (a || []).forEach(t => { ok(!/[—–"\n]/.test(t) && t.length <= 62, 'lint ' + k + ': ' + t); ok(/\{v\}/.test(t) ? V.includes(k) : true, 'a name only where the code fills it: ' + k + ': ' + t); ok(!/\{[nag]\}/.test(t), 'no other name: ' + t); }); });
  V.forEach(k => ok(G.SAY[k].filter(t => /\{v\}/.test(t)).length >= 5, k + ' names the other one'));
  ['tapFloor', 'nearExit', 'lastStand'].forEach(k => ok(G.SOLO[k] && G.SOLO[k].length >= 6 && G.SOLO[k].every(t => !/\{[navg]\}/.test(t)), 'SOLO.' + k));
  ['handOver', 'lastStand', 'youFirst', 'notThisWay'].forEach(k => ok(G.CONVO[k] && G.CONVO[k].length >= 6, 'CONVO.' + k));
  ok(G.LINE_NEEDS.blood.includes('Krwawię... Zasłońcie mnie!') && G.LINE_NEEDS.blood.includes('Dalej ty, {v}. Krwawię jak prosię.'), 'the bleeding lines need blood');
  ok(G.lineTags(G.nameFill('Dalej ty, {v}. Krwawię jak prosię.', { nm: ['Borys', 'Borysa', 'Borysie'] })).includes('blood'), 'a filled bleeding line is found');
  return { fails, out }; }"""
# ---------- 10. organic waves with crystal thefts ----------
WAVES = r"""(seeds) => { const { G } = T, fails = [], out = { waves: [] }; const ok = (c, m) => { if (!c) fails.push(m); };
  const K = ['crystalTaken', 'crystalLost', 'crystalSaved', 'escortForms', 'guardSoaks', 'handOvers', 'lastStands', 'sacrifices', 'sacrificeFired', 'youFirst', 'taps', 'tapFound', 'notThisWay', 'notThisWayMoved', 'frontLines', 'woundedBack', 'nearExit', 'kills'];
  const agg = {}, Rn = a => a[Math.floor(Math.random() * a.length)];
  const S0 = G.S.dmg; G.S.dmg = S0 * 3;
  seeds.forEach(seed => {
    T.fresh(8);
    // traps and monsters in the rooms (a few of each), so fights, stands and sacrifices have something to happen with
    const put = (R, tp) => { const s = ['arrows', 'fire'].includes(tp) ? T.wallSpots(R, tp) : T.floorSpots(R, tp); if (s.length) T.place(tp, Rn(s)); };
    T.rooms().forEach(R => { for (let j = 0; j < 2; j++) { put(R, Rn(['goblin', 'ghost', 'bats', 'ogre', 'spider', 'goblin', 'shade'])); put(R, Rn(['spikes', 'web', 'trapdoor', 'cage', 'spikes'])); put(R, Rn(['arrows', 'fire', 'spikes'])); } });
    G.fl.items.forEach(it => { if (G.ITEMS[it.type] && G.ITEMS[it.type].hp) it.lvl = 2; });
    for (let w = 0; w < 3; w++) {
      const nx = G.makeWave(5 + w); nx.forEach((e, i) => { if (i % 3 === 0) e.trait = Rn(['careful', 'coward', 'brave', e.trait]); }); G.run.next = nx;
      G.startWave(); const f = G.fl; f.heartKnown = true;   // they know where the heart is: thefts happen
      let end = -1;
      for (let i = 0; i < 300 / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.resolveCheck(Math.random() < 0.5 ? (c.r0 + c.r1) / 2 : (c.g0 + c.r0) / 2); G.clearCheck(); continue; } G.step(0.05); if (f.time > 5 && !G.alive().length && !f.queue.length) { end = f.time; break; } }
      const s = f.stats, o = { seed, w: 5 + w, t: Math.round(f.time), end: Math.round(end), items: [...f.items.values()].filter(it => G.ITEMS[it.type] && !G.ITEMS[it.type].build).map(it => it.type).join(' ') };
      K.forEach(k => { if (s[k]) { o[k] = s[k]; agg[k] = (agg[k] || 0) + s[k]; } });
      out.waves.push(o);
      ok(end > 0, 'the wave ends within 300 s: ' + JSON.stringify(o) + ' alive: ' + G.alive().map(h => h.type + ':' + h.state + ':' + h.intent + ':' + (h.plan || '-') + (h.crystal ? ':C' : '') + (h.escort ? ':E' : '')).join(' '));
      while (G.modalKind) G.closeModal();
      try { G.openModal({ type: 'wave', details: true, tab: 'nums', rr: 0, rt: 0, out: [] }); const tx = (document.querySelector('#card') || {}).textContent || ''; if (tx.includes('Finał: eskorta')) out.nums = (out.nums || 0) + 1; } catch (e) { fails.push('the summary (nums): ' + e); }
      while (G.modalKind) G.closeModal();
      G.run.wave++; G.startBuild(); while (G.modalKind) G.closeModal(); G.fl.essence = 9999;
    }
  });
  G.S.dmg = S0;
  out.agg = agg;
  ok(out.nums === out.waves.length, 'the Liczby cell renders: ' + out.nums);
  ok((agg.crystalTaken || 0) > 0 && (agg.escortForms || 0) > 0, 'thefts and escorts happen');
  return { fails, out }; }"""
SECTIONS = [('escort', ESCORT), ('hand', HAND), ('stand', STAND), ('sac', SAC), ('first', FIRST), ('tap', TAP), ('ntw', NTW), ('form', FORM), ('lines', LINES), ('waves', WAVES)]
async def main():
    only = None
    seeds = [0, 1, 2]
    for a in sys.argv:
        if a.startswith('--only='): only = a[7:].split(',')
        if a.startswith('--seeds='): seeds = [int(x) for x in a[8:].split(',')]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 900, 'height': 760})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + SC + 'test/page15.html')
        await pg.wait_for_timeout(600)
        await pg.evaluate(LIB); await pg.evaluate(LIB2)
        fails = []
        for name, js in SECTIONS:
            if only and name not in only: continue
            try:
                r = await (pg.evaluate(js, seeds) if name == 'waves' else pg.evaluate(js))
            except Exception as e:
                fails.append(name + ': ' + str(e)[:600]); continue
            print('==', name, json.dumps(r['out'], ensure_ascii=False)[:3000])
            fails += [name + ': ' + f for f in r['fails']]
        await pg.wait_for_timeout(400)
        fails += ['page error: ' + e for e in errs[:5]]
        print('FAILS', fails)
        await b.close()
        sys.exit(1 if fails else 0)
asyncio.run(main())
