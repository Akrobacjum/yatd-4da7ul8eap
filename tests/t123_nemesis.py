# 1.23 Nemezis: a returner back the 2nd time (or out with a crystal) becomes a Nemezis with a title; he comes stronger (+2 levels,
# courage x1,4, rank 1+, a talisman/amulet) and the party knows his rooms and traps; his grudge (a thief disarms the trap, a
# barbarian smashes it, others mark it x2, a monster he fights +25%); killing him pays the bounty, escaping brings him back with
# times+1; at most two; fallenMemory in the room where someone died before; save/resume with the new fields (and an old save
# without them); the lines; organic waves (stage 4, returners on) with no page errors. Prints FAILS [...] and exits 1 on any.
# (--only=make,spawn,...; --seeds=0,1)
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t118_cards.py').read().split('# ---------- 1.')[0])   # LIB (T.fresh, T.raid, T.put, T.tough, T.place, T.withRandom, T.stepS)
from playwright.async_api import async_playwright
LIB2 = r"""() => { const { G } = T;
  T.quiet = () => { G.fl.heroes.forEach(o => { o.bubble = null; o.saidUntil = -9; o.sayQ = null; o.talkUntil = -1; }); G.fl.party.queueSay = []; G.fl.party.convoT = 0; G.fl.party.talkUntil = -1; };
  T.said = []; G.setSayHook((h, t) => T.said.push([h.id, t]));
  T.lines = (key, o) => [].concat(G.SAY[key] || [], G.SOLO[key] || []).map(x => o ? G.nameFill(x, o) : x);
  T.saidBy = (h, key, o) => { const L = T.lines(key, o); return T.said.some(s => s[0] === h.id && L.includes(s[1])); };
  T.spoke = (h, key, o) => { const L = T.lines(key, o); return T.saidBy(h, key, o) || G.fl.party.queueSay.some(q => q.id === h.id && L.includes(q.text)) || (h.sayQ || []).some(e => L.includes(e.text)); };
  T.anySaid = (key, o) => { const L = T.lines(key, o); return T.said.some(s => L.includes(s[1])) || G.fl.party.queueSay.some(q => L.includes(q.text)) || G.fl.heroes.some(h => (h.sayQ || []).some(e => L.includes(e.text))); };
  T.big = () => T.rooms().slice().sort((a, b) => b.tiles.length - a.tiles.length);
  T.of = t => G.alive().find(h => h.type === t);
  T.walk = h => { h.state = 'walk'; h.timer = 0; h.needPlan = true; };
  T.setup = (types, pre, n) => { T.fresh(n || 7); const rs = T.big(), R = rs[0], R2 = rs[1]; if (pre) pre(T.room(R), T.room(R2)); const f = T.raid(types); G.fl.known.fill(1);
    return { f, R: T.room(R), R2: T.room(R2) }; };
  T.nem = (h, grudge, times) => { h.nemesis = h.entry.nemesis = { title: G.NEM_TITLE.steady[h.female ? 1 : 0], grudge: grudge || null, since: 2, rooms: [], traps: [] }; h.entry.times = times || 2; h.nemTraps = new Set(); h.returning = h.entry.returning = true; return h; };
  T.run = (sec, each) => { const f = G.fl; for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); if (each && each()) break; } };
  return true; }"""
# ---------- 1. who becomes a Nemezis (collectReturners: nemesisEntry), the title, the grudge, at most two ----------
MAKE = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], R => { const s = T.floorSpots(R, 'spikes'); T.place('spikes', s[0]); T.place('goblin', s[s.length - 1]); });
  const sp = [...f.items.values()].find(o => o.type === 'spikes'), gob = [...f.items.values()].find(o => o.type === 'goblin');
  ok(sp && gob, 'spikes and a goblin placed');
  const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of);
  G.run.returners = [];
  // the thief: his second escape (times 1 -> 2); the spikes hurt him most, the goblin a little; he walked into R; the spikes known
  th.entry.times = 1; G.grudgeAdd(th, sp, 0.5); G.grudgeAdd(th, gob, 0.2); th.rooms.add(R.key); sp.detected = true;
  // the mage: a first escape with a crystal; the priest: a plain first escape (stays plain)
  mg.carriedOut = true; mg.entry.times = 0; pr.entry.times = 0;
  [th, mg, pr].forEach(h => { h.fled = true; });
  T.withRandom(0.01, () => G.collectReturners());
  const E = n => G.run.returners.find(r => r.nm[0] === n.nm[0]);
  const et = E(th), em = E(mg), ep = E(pr);
  out.th = et && et.nemesis; out.mg = em && em.nemesis && em.nemesis.title;
  ok(et && et.times === 2 && et.nemesis, 'times 2: a Nemezis');
  ok(et && et.nemesis && Object.values(G.NEM_TITLE).some(t => t.includes(et.nemesis.title)), 'with a title: ' + (et && et.nemesis && et.nemesis.title));
  ok(et && et.nemesis && et.nemesis.grudge && et.nemesis.grudge.type === 'spikes' && et.nemesis.grudge.x === sp.x && et.nemesis.grudge.y === sp.y, 'the grudge: the spikes and where they stood');
  ok(et && et.nemesis && et.nemesis.rooms.includes(R.key) && et.nemesis.traps.some(t => t.k === sp.x + ',' + sp.y), 'his rooms and the traps known there');
  ok(et && et.nemesis && et.nemesis.since === G.run.wave, 'since this wave');
  ok(em && em.nemesis && em.nemesis.title === G.NEM_TITLE.thief[mg.female ? 1 : 0], 'out with a crystal: a Nemezis, Złodziej(ka) Kryształu: ' + out.mg);
  ok(ep && !ep.nemesis, 'a plain first returner stays plain');
  ok(G.bountyOf(et) === 20, 'the bounty 10 + 5 x 2: ' + G.bountyOf(et));
  // a third one: fewer returns than both stays plain; more returns takes the place of the weakest
  const fake = (nm, times) => ({ nm: [nm, nm + 'a', nm + 'ie'], female: false, type: 'warrior', lvl: 5, back: 99, times, crystal: false });
  const third = Object.assign({}, th, { nm: ['Zenon', 'Zenona', 'Zenonie'], entry: { times: 0 }, nemesis: null, fled: true, dead: false, boss: null, rooms: new Set(), grudgeBy: new Map(), carriedOut: true, inv: [], fearBy: {}, dmgBy: {} });
  const e3 = fake('Zenon', 1); e3.crystal = true; G.nemesisEntry(third, e3);
  ok(!e3.nemesis && G.run.returners.filter(r => r.nemesis).length === 2, 'a third with fewer returns stays plain');
  const fourth = Object.assign({}, third, { nm: ['Ziemowit', 'Ziemowita', 'Ziemowicie'], entry: { times: 3 } }), e4 = fake('Ziemowit', 4);
  G.nemesisEntry(fourth, e4); G.run.returners.push(e4);
  out.after = G.run.returners.map(r => r.nm[0] + ':' + r.times + ':' + (r.nemesis ? r.nemesis.title : '-'));
  ok(e4.nemesis && G.run.returners.filter(r => r.nemesis).length === 2 && !em.nemesis, 'one with more returns takes the weakest one\'s place: ' + out.after);
  return { fails, out }; }"""
# ---------- 2. he comes in stronger, his rooms and traps known, his words ----------
SPAWN = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(8);
  const rs = T.big(), R = T.room(rs[0]), s = T.floorSpots(R, 'spikes'); const sp = T.place('spikes', s[0]);
  ok(sp, 'spikes placed');
  const nm = G.makeWave(6)[1];   // a name, a class
  const ent = { nm: nm.nm, female: nm.female, type: 'thief', lvl: 5, back: 6, phys: null, phobia: null, trait: null, scar: 'pamięta Twój loch', times: 2, crystal: false, gear: [], wasLost: false,
    nemesis: { title: G.NEM_TITLE.scar[nm.female ? 1 : 0], grudge: { type: 'spikes', x: sp.x, y: sp.y }, since: 3, rooms: [R.key], traps: [{ k: sp.x + ',' + sp.y, type: 'spikes' }] } };
  const plain = Object.assign({}, ent, { nemesis: null, nm: ['Zenon', 'Zenona', 'Zenonie'], female: false, type: 'thief' });
  G.run.wave = 6; G.run.returners = [ent];
  const list = G.makeWave(6), e = list.find(x => x.nemesis);
  ok(e && e.returning && e.type === 'thief', 'the Nemezis is in the party');
  if (!e) return { fails, out };
  out.e = { lvl: e.lvl, rank: e.rank, courage: e.courage, inv: e.inv.map(i => i.type) };
  ok(e.lvl >= ent.lvl + 1 + 2, '+2 levels over the returner rule: ' + e.lvl);
  ok(e.rank >= 1, 'never a rookie: ' + e.rank);
  ok(Math.abs(e.courage - Math.round(G.levelStats(e.lvl).courage * 1.4)) <= 1, 'courage x1,4: ' + e.courage + ' vs ' + Math.round(G.levelStats(e.lvl).courage * 1.4));
  ok(e.inv.some(i => i.type === 'charm' || i.type === 'amulet') || e.inv.length >= 3 + Math.floor(e.lvl / 3), 'a talisman or an amulet (if room)');
  // the same entry without nemesis: no +2
  G.run.returners = [plain]; const l2 = G.makeWave(6), p2 = l2.find(x => x.nm[0] === 'Zenon');
  ok(p2 && !p2.nemesis && p2.lvl < e.lvl + 1, 'a plain returner has no +2: ' + (p2 && p2.lvl));
  // the wave: he comes in; R known, the spikes detected, nemesisIntro said
  G.run.returners = []; list.forEach(x => { x.bond = null; }); G.run.next = list;
  G.startWave(); const f = G.fl;
  T.said = [];
  for (let i = 0; i < 600 && f.queue.length; i++) T.stepS(0.05);
  const h = f.heroes.find(x => x.nemesis);
  ok(h, 'the Nemezis spawned');
  if (!h) return { fails, out };
  const Rn = T.room(R);
  ok(Rn.tiles.every(t => f.known[t[1] * G.WW + t[0]]), 'his room is known to the party');
  ok(sp.detected, 'the trap he knew is detected');
  ok(f.stats.nemeses === 1, 'stats.nemeses');
  ok(T.saidBy(h, 'nemesisIntro') || T.spoke(h, 'nemesisIntro') || T.anySaid('breachUse') || T.anySaid('doorUse'), 'nemesisIntro said: ' + JSON.stringify(T.said.slice(0, 6)));
  ok(!T.saidBy(h, 'returnBack'), 'not returnBack');
  const L = G.leader(); out.leader = [L && L.nm[0], L && L.rank, h.rank, h.nm[0]];
  ok(L === h || (L && L.rank > h.rank) || (L && L.boss), 'he leads unless someone outranks him: ' + out.leader);
  T.run(6);
  ok(f.stats.nemesisReply >= 1 || f.stats.convos >= 1 || G.alive().length < 2, 'the others answer him (or a talk): ' + f.stats.nemesisReply);
  return { fails, out }; }"""
# ---------- 3. the grudge: thief disarms, barbarian smashes, others mark it x2, a monster he fights +25% ----------
GRUDGE = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const trapCase = (type, typ2) => {
    let res = null;
    for (let k = 0; k < 4 && !res; k++) {
      const { f, R } = T.setup(['warrior', type, 'priest', typ2]);
      const tl = T.walkT(R); const s = T.floorSpots(R, 'spikes').filter(t => tl.some(q => Math.abs(q[0] - t[0]) + Math.abs(q[1] - t[1]) === 1));
      if (!s.length) continue;
      const sp = T.place('spikes', s[Math.floor(s.length / 2)]); if (!sp) continue;
      const h = T.of(type); T.nem(h, { type: 'spikes', x: sp.x, y: sp.y });
      const far = T.walkT(R).filter(t => Math.hypot(t[0] - sp.x, t[1] - sp.y) >= 3)[0] || T.walkT(R)[0];
      T.put(h, far[0], far[1]); T.walk(h); h.R = Object.assign({}, h.R, { fail: 0, sapper: 0 });
      G.alive().filter(o => o !== h).forEach(o => { T.put(o, 1, 1); o.gone = true; });   // out of the way
      T.quiet(); T.said = [];
      const before = f.stats.grudgeHits || 0;
      G.nemesisThink(G.alive().filter(o => !o.gone), h);
      res = { f, h, sp, seen: (f.stats.grudgeHits || 0) - before, said: T.spoke(h, 'nemesisGrudge') };
      T.run(10, () => sp.disabled || sp.broken || !f.items.has(sp.x + ',' + sp.y));
      res.done = sp.disabled || sp.broken; res.st = h.state; res.int = h.intent; res.gd = f.stats.grudgeDone || 0; res.boast = T.spoke(h, 'nemesisBoast');
    }
    return res;
  };
  const a = trapCase('thief', 'mage');
  if (a) { out.thief = { seen: a.seen, said: a.said, done: a.done, gd: a.gd, boast: a.boast };
    ok(a.seen === 1 && a.said, 'the thief sees his grudge, nemesisGrudge: ' + JSON.stringify(out.thief));
    ok(a.done && !a.sp.broken && a.gd === 1 && a.boast, 'the thief disarms it, then boasts: ' + JSON.stringify(out.thief)); } else fails.push('thief case: no layout');
  const b = trapCase('barbarian', 'mage');
  if (b) { out.barb = { seen: b.seen, said: b.said, done: b.done, broken: b.sp.broken, gd: b.gd, boast: b.boast };
    ok(b.seen === 1 && b.sp.broken && b.gd === 1 && b.boast, 'the barbarian smashes it: ' + JSON.stringify(out.barb)); } else fails.push('barbarian case: no layout');
  // a mage: he marks it, the party walks round it at twice the danger
  { const { f, R } = T.setup(['warrior', 'mage', 'priest', 'thief']);
    const s = T.floorSpots(R, 'spikes'), sp = T.place('spikes', s[0]); const h = T.of('mage'); T.nem(h, { type: 'spikes', x: sp.x, y: sp.y });
    const t = T.walkT(R)[0]; T.put(h, t[0], t[1]); T.walk(h);
    sp.detected = true; G.rebuildThreat(); const i = sp.y * G.WW + sp.x, d0 = f.danger[i];
    G.nemesisThink(G.alive(), h); G.rebuildThreat(); const d1 = f.danger[i];
    out.mage = { d0, d1, w: sp.grudgeW, wave: G.run.wave };
    ok(sp.grudgeW === G.run.wave && d1 === Math.min(6, 2 * d0) && d0 > 0, 'the mage marks it: danger x2: ' + JSON.stringify(out.mage));
    ok(!G.grudgeJob(h, G.bfs(h.x, h.y, { known: true })), 'no job for a mage against a trap');
  }
  // a monster: a priest Nemezis goes and fights it, +25% damage
  { let gob = null;
    const { f, R } = T.setup(['warrior', 'priest', 'mage', 'thief'], R => { const s = T.floorSpots(R, 'goblin'); T.place('goblin', s[Math.floor(s.length / 2)]); });
    gob = [...f.items.values()].find(o => o.type === 'goblin');
    if (!gob) fails.push('no goblin'); else {
      gob.hp = gob.max = 1e6;
      const h = T.of('priest'); T.nem(h, { type: 'goblin', x: gob.x, y: gob.y });
      const wt = T.walkT(R).sort((p, q) => Math.hypot(q[0] - gob.x, q[1] - gob.y) - Math.hypot(p[0] - gob.x, p[1] - gob.y)), far = wt[0]; T.put(h, far[0], far[1]); T.walk(h);
      G.alive().filter(o => o !== h).forEach(o => { T.put(o, 1, 1); o.gone = true; });
      T.quiet(); T.said = [];
      let fought = false; T.run(8, () => { G.nemesisThink(G.alive().filter(o => !o.gone), h); if (h.state === 'fight' && h.foe === gob) { fought = true; return true; } return false; });
      out.mon = { fought, st: h.state, int: h.intent, on: h.grudgeOn === gob };
      ok(fought, 'the priest Nemezis goes and fights his goblin: ' + JSON.stringify(out.mon));
      const hit = on => { h.grudgeOn = on ? gob : null; const a = gob.hp; h.state = 'fight'; h.foe = gob; G.monstersTick(0.2); return a - gob.hp; };
      const x0 = hit(false), x1 = hit(true); out.mon.k = x1 / x0;
      ok(x0 > 0 && Math.abs(x1 / x0 - 1.25) < 0.02, '+25% damage to his grudge: ' + out.mon.k);
      ok(G.nemK(h, gob) === 1.25 && G.nemK(h, null) === 1, 'nemK');
    }
  }
  return { fails, out }; }"""
# ---------- 4. the bounty, the escape, he does not flee by fear ----------
BOUNTY = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  { const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], R => { const s = T.floorSpots(R, 'spikes'); T.place('spikes', s[0]); });
    const sp = [...f.items.values()].find(o => o.type === 'spikes'), h = T.nem(T.of('thief'), null, 2), w = T.of('warrior');
    const tl = T.walkT(R); T.put(h, tl[0][0], tl[0][1]); T.put(w, tl[1][0], tl[1][1]);
    G.run.returners = []; T.quiet(); T.said = [];
    const e0 = f.essence; h.hp = 5; h.max = 100; G.damage(h, 1e4, sp);
    out.kill = { dead: h.dead, got: Math.round((f.essence - e0) * 10) / 10, bounty: G.bountyOf(h.entry), stat: f.stats.bounties, ess: f.stats.essBounty };
    ok(h.dead && f.stats.bounties === 1 && f.stats.essBounty === 20 && f.essence - e0 >= 20 - 0.01, 'killing him pays the bounty (20): ' + JSON.stringify(out.kill));
    ok(T.spoke(w, 'nemesisDown', h) || G.alive().some(o => T.spoke(o, 'nemesisDown', h)), 'a companion: nemesisDown');
    const fa = G.run.fallen[G.run.fallen.length - 1];
    ok(fa && fa.nm[0] === h.nm[0] && fa.nemesis === h.nemesis.title && fa.roomKey === R.key && fa.wave === G.run.wave, 'remembered as fallen: ' + JSON.stringify(fa));
    T.withRandom(0.01, () => G.collectReturners());
    ok(!G.run.returners.some(r => r.nm[0] === h.nm[0]), 'dead: never back');
  }
  { const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest']);
    const h = T.nem(T.of('mage'), { type: 'spikes', x: 1, y: 1 }, 2); const title = h.nemesis.title;
    // fear: nothing while above 15% HP; below it he runs
    h.courage = 50; h.fear = 0; h.max = 100; h.hp = 60;
    h.fear = 200; G.startFlee(h); ok(!h.fleeing, 'above 15% HP he does not flee');
    h.hp = 10; G.startFlee(h); ok(h.fleeing, 'below 15% he may'); h.fleeing = false; h.hp = 60; h.fear = 0;
    G.run.returners = []; h.fled = true;
    G.collectReturners();   // no roll for a Nemezis
    const e = G.run.returners.find(r => r.nm[0] === h.nm[0]);
    out.esc = e && { times: e.times, title: e.nemesis && e.nemesis.title, bounty: G.bountyOf(e) };
    ok(e && e.times === 3 && e.nemesis && e.nemesis.title === title && G.bountyOf(e) === 25, 'escaped: back with times+1, the same title, bounty 25: ' + JSON.stringify(out.esc));
  }
  return { fails, out }; }"""
# ---------- 5. fallenMemory in the room where someone died earlier ----------
FALLEN = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']);
  G.run.fallen = [{ nm: ['Borys', 'Borysa', 'Borysie'], female: false, type: 'warrior', roomKey: R.key, wave: G.run.wave - 1, nemesis: null },
                  { nm: ['Wanda', 'Wandę', 'Wando'], female: true, type: 'mage', roomKey: R2.key, wave: G.run.wave - 2, nemesis: 'Niezłomna' },
                  { nm: ['Zenon', 'Zenona', 'Zenonie'], female: false, type: 'thief', roomKey: R.key, wave: G.run.wave, nemesis: null }];
  const [w, th] = ['warrior', 'thief'].map(T.of), tl = T.walkT(R), tl2 = T.walkT(R2);
  T.put(w, tl[0][0], tl[0][1]); T.put(th, tl[1][0], tl[1][1]); w.enteredRoom = -1; T.walk(w); T.walk(th);
  G.alive().filter(o => o !== w && o !== th).forEach(o => { T.put(o, tl2[2][0], tl2[2][1]); });
  T.quiet(); T.said = [];
  T.withRandom(0.1, () => G.onEnter(w));
  const bor = { nm: ['Borys', 'Borysa', 'Borysie'], female: false }, wan = { nm: ['Wanda', 'Wandę', 'Wando'], female: true };
  out.said = T.said.slice(0, 4);
  ok(f.stats.fallenMemory === 1 && T.saidBy(w, 'fallenMemory', bor), 'fallenMemory ({g} = Borysa) in the room where he died: ' + JSON.stringify(out.said));
  ok(!T.said.some(s => /Zenona/.test(s[1])), 'not one who died in this wave');
  th.enteredRoom = -1; T.withRandom(0.1, () => G.onEnter(th)); ok(f.stats.fallenMemory === 1, 'once a room a wave');
  // the fallen Nemezis: nemesisFallen; alone: a SOLO line (filled)
  const mg = T.of('mage'); G.alive().filter(o => o !== mg).forEach(o => { T.put(o, 1, 1); o.gone = true; });
  T.put(mg, tl2[0][0], tl2[0][1]); mg.enteredRoom = -1; T.quiet(); T.said = [];
  T.withRandom(0.1, () => G.onEnter(mg));
  ok(T.saidBy(mg, 'nemesisFallen', wan), 'nemesisFallen for a fallen Nemezis ({g} = Wandy): ' + JSON.stringify(T.said.slice(0, 3)));
  ok(!T.said.some(s => /\{/.test(s[1])), 'no raw {g}');
  // alone in a room of a plain fallen: SOLO.fallenMemory
  G.run.fallen.push({ nm: ['Borys', 'Borysa', 'Borysie'], female: false, type: 'warrior', roomKey: T.big()[2].key, wave: 1, nemesis: null });
  const R3 = T.room(T.big()[2]), t3 = T.walkT(R3)[0]; T.put(mg, t3[0], t3[1]); mg.enteredRoom = -1; T.quiet(); T.said = [];
  T.withRandom(0.1, () => G.onEnter(mg));
  ok(T.said.some(s => s[0] === mg.id && G.SOLO.fallenMemory.map(x => G.nameFill(x, bor)).includes(s[1])), 'alone: SOLO.fallenMemory: ' + JSON.stringify(T.said.slice(0, 2)));
  ok(f.stats.fallenMemory === 3, 'three a wave');
  G.run.fallen.push({ nm: ['Ala', 'Alę', 'Alo'], female: true, type: 'thief', roomKey: T.big()[3].key, wave: 1, nemesis: null });
  const R4 = T.room(T.big()[3]), t4 = T.walkT(R4)[0]; T.put(mg, t4[0], t4[1]); mg.enteredRoom = -1;
  T.withRandom(0.1, () => G.onEnter(mg)); ok(f.stats.fallenMemory === 3, 'at most 3 a wave');
  // kill() keeps at most 12
  G.run.fallen = []; for (let i = 0; i < 14; i++) { const h = { nm: ['X' + i, 'X', 'X'], female: false, type: 'thief', room: R.id, nemesis: null }; G.rememberFallen(h); }
  ok(G.run.fallen.length === 12 && G.run.fallen[0].nm[0] === 'X2', 'up to 12, the oldest goes');
  return { fails, out }; }"""
# ---------- 6. save / resume ----------
SAVE = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(7); G.setUser(true);
  const nem = { title: 'Niezłomny', grudge: { type: 'spikes', x: 3, y: 4 }, since: 3, rooms: ['1,1'], traps: [{ k: '3,4', type: 'spikes' }] };
  G.run.returners = [{ nm: ['Borys', 'Borysa', 'Borysie'], female: false, type: 'warrior', lvl: 5, back: 9, times: 2, nemesis: nem, scar: 'x' }];
  G.run.fallen = [{ nm: ['Wanda', 'Wandę', 'Wando'], female: true, type: 'mage', roomKey: '1,1', wave: 3, nemesis: null }];
  G.run.next[0].nemesis = Object.assign({}, nem); G.run.next[0].times = 2; G.run.next[0].returning = true;
  ok(G.saveRun('build'), 'saved');
  const sv = G.loadSave();
  ok(sv && sv.run.returners[0].nemesis && sv.run.returners[0].nemesis.grudge.type === 'spikes' && sv.run.fallen[0].nm[0] === 'Wanda', 'the save holds returners[].nemesis and fallen');
  while (G.modalKind) G.closeModal();
  ok(G.resumeRun(), 'resumed'); while (G.modalKind) G.closeModal();
  ok(G.run.fallen.length === 1 && G.run.returners[0].nemesis.title === 'Niezłomny' && G.run.next[0].nemesis && G.run.next[0].nemesis.rooms[0] === '1,1', 'resumed with the fields');
  try { G.openModal({ type: 'hero', entry: G.run.next[0] }); const tx = (document.querySelector('#card') || {}).textContent || ''; out.card = tx.slice(0, 400);
    ok(tx.includes('Niezłomny') && tx.includes('Uraza: ') && tx.includes('Nagroda za głowę: 20 Esencji') && tx.includes('Nemezis: wraca 2. raz'), 'the hero card: title, Uraza, bounty, Nemezis line'); } catch (e) { fails.push('hero card: ' + e); }
  while (G.modalKind) G.closeModal();
  // an old save without fallen and nemesis
  const raw = JSON.parse(localStorage.getItem('yatd12-save')); delete raw.run.fallen; raw.run.returners.forEach(r => { delete r.nemesis; }); (raw.run.next || []).forEach(e => { delete e.nemesis; });
  localStorage.setItem('yatd12-save', JSON.stringify(raw));
  ok(G.resumeRun(), 'an old save resumes'); while (G.modalKind) G.closeModal();
  ok(Array.isArray(G.run.fallen) && G.run.fallen.length === 0 && !G.run.returners[0].nemesis, 'old save: fallen = [], plain returner');
  // a wave from the old save runs
  G.run.next.forEach(e => { e.bond = null; }); G.startWave(); T.stepS(5); ok(G.fl.phase === 'raid', 'the old save plays');
  G.setUser(false); try { localStorage.removeItem('yatd12-save'); } catch (e) {}
  return { fails, out }; }"""
# ---------- 7. the lines ----------
LINES = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const K = ['nemesisIntro', 'nemesisGrudge', 'nemesisWarn', 'nemesisReply', 'nemesisFollow', 'nemesisRage', 'nemesisBoast', 'nemesisEscape', 'nemesisDown', 'nemesisFallen', 'fallenMemory', 'fallenReply', 'bountyTalk', 'bountyReply'];
  const Gk = ['nemesisDown', 'nemesisFallen', 'fallenMemory'], Vk = ['nemesisFollow'];
  out.n = {};
  K.forEach(k => { const a = G.SAY[k]; out.n[k] = a ? a.length : 0; ok(a && a.length >= 9, k + ': 9+ lines');
    (a || []).forEach(t => { ok(!/[—–\n]/.test(t), 'lint ' + k + ': ' + t); ok(/\{g\}/.test(t) ? Gk.includes(k) : true, '{g} only where filled: ' + k); ok(/\{v\}/.test(t) ? Vk.includes(k) : true, '{v} only where filled: ' + k); ok(!/\{[na]\}/.test(t), 'no other name: ' + t); }); });
  ['nemesisIntro', 'nemesisGrudge', 'fallenMemory'].forEach(k => ok(G.SOLO[k] && G.SOLO[k].length >= 5, 'SOLO.' + k));
  ['nemesisIntro', 'fallenMemory', 'bountyTalk'].forEach(k => ok(G.CONVO[k] && G.CONVO[k].length >= 6, 'CONVO.' + k));
  return { fails, out }; }"""
# ---------- 8. organic waves: stage 4, returners on (a plain times-2 returner and a Nemezis seeded), several waves ----------
WAVES = r"""(seeds) => { const { G } = T, fails = [], out = { waves: [] }; const ok = (c, m) => { if (!c) fails.push(m); };
  const K = ['nemeses', 'nemesisNew', 'bounties', 'essBounty', 'grudgeHits', 'grudgeDone', 'nemesisWarn', 'nemesisBoast', 'nemesisRage', 'nemesisDown', 'nemesisOut', 'nemesisCrystal', 'bountyTalk', 'fallenMemory', 'nemesisReply', 'returnersOut', 'kills', 'escaped', 'crystalLost'];
  const agg = {}, Rn = a => a[Math.floor(Math.random() * a.length)];
  const S0 = G.S.dmg; G.S.dmg = S0 * 2;
  seeds.forEach(seed => {
    T.fresh(8); G.run.stage = 4;
    const put = (R, tp) => { const s = ['arrows', 'fire'].includes(tp) ? T.wallSpots(R, tp) : T.floorSpots(R, tp); if (s.length) T.place(tp, Rn(s)); };
    T.rooms().forEach(R => { put(R, Rn(['goblin', 'ghost', 'bats', 'spider', 'shade'])); put(R, Rn(['spikes', 'web', 'trapdoor', 'cage'])); put(R, Rn(['arrows', 'fire', 'spikes'])); });
    G.mods.moreReturn = 1.5;
    const R0 = T.big()[0], tr = [...G.fl.items.values()].find(it => it.type === 'spikes') || [...G.fl.items.values()][0];
    const nm = G.makeWave(5);
    G.run.returners = [
      { nm: nm[1].nm, female: nm[1].female, type: nm[1].type, lvl: 5, back: 5, phys: null, phobia: null, trait: null, scar: 'pamięta Twój loch', times: 2, crystal: false, gear: [], wasLost: false,
        nemesis: { title: G.NEM_TITLE.steady[nm[1].female ? 1 : 0], grudge: tr ? { type: tr.type, x: tr.x, y: tr.y } : null, since: 3, rooms: T.rooms().slice(0, 2).map(R => R.key), traps: [] } },
      { nm: nm[2].nm, female: nm[2].female, type: nm[2].type, lvl: 5, back: 6, phys: null, phobia: null, trait: null, scar: 'pamięta Twój loch', times: 1, crystal: false, gear: [], wasLost: false } ];
    G.run.fallen = [{ nm: ['Borys', 'Borysa', 'Borysie'], female: false, type: 'warrior', roomKey: T.rooms()[0].key, wave: 2, nemesis: null }, { nm: ['Wanda', 'Wandę', 'Wando'], female: true, type: 'mage', roomKey: T.rooms()[1].key, wave: 3, nemesis: 'Niezłomna' }];
    G.run.wave = 5; G.run.next = G.makeWave(5);
    for (let w = 0; w < 4 && G.run.crystals > 0; w++) {
      const n = G.run.wave; G.run.crystals = Math.max(G.run.crystals, 4); G.run.next.forEach(e => { e.bond = e.bond || null; });
      G.startWave(); const f = G.fl;
      let end = -1;
      for (let i = 0; i < 300 / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.resolveCheck(Math.random() < 0.5 ? (c.r0 + c.r1) / 2 : (c.g0 + c.r0) / 2); G.clearCheck(); continue; } G.step(0.05); if (f.time > 5 && !G.alive().length && !f.queue.length) { end = f.time; break; } }
      if (f.phase !== 'raid' && end < 0) end = f.time;
      if (f.phase === 'raid') G.finishWave();
      const s = f.stats, o = { seed, w: n, t: Math.round(f.time), end: Math.round(end), nem: f.heroes.filter(h => h.nemesis).map(h => G.nemName(h) + ':' + (h.dead ? 'dead' : h.fled ? 'out' : 'in')).join(' '), ret: (G.run.returners || []).map(r => r.times + (r.nemesis ? 'N' : '')).join(','), fallen: (G.run.fallen || []).length };
      K.forEach(k => { if (s[k]) { o[k] = Math.round(s[k]); agg[k] = (agg[k] || 0) + s[k]; } });
      out.waves.push(o);
      ok(end > 0, 'the wave ends within 300 s: ' + JSON.stringify(o));
      // the summary (main and Liczby) and a Nemezis' card render
      try { const tx0 = (document.querySelector('#card') || {}).textContent || ''; if (f.heroes.some(h => h.nemesis) && !tx0.includes('Nagroda za głowę')) fails.push('wave ' + n + ': the summary shows no bounty');
        while (G.modalKind) G.closeModal(); G.openModal({ type: 'wave', details: true, tab: 'nums', rr: 0, rt: 0, out: [] }); const tx = (document.querySelector('#card') || {}).textContent || ''; if (tx.includes('Nemezis: w fali')) out.nums = (out.nums || 0) + 1;
        while (G.modalKind) G.closeModal(); const ne = (G.run.next || []).find(e => e.nemesis); if (ne) { G.openModal({ type: 'hero', entry: ne }); const t2 = (document.querySelector('#card') || {}).textContent || ''; if (!t2.includes('Nagroda za głowę')) fails.push('the next Nemezis card'); out.cards = (out.cards || 0) + 1; } } catch (e) { fails.push('summary/card: ' + e); }
      while (G.modalKind) G.closeModal();
      if (G.run.crystals <= 0) break;
      G.proceedToBuild(); while (G.modalKind) G.closeModal(); G.fl.essence = 9999;
      try { G.step(0.05); } catch (e) { fails.push('build draw: ' + e); }
    }
  });
  G.S.dmg = S0;
  out.agg = agg;
  ok(out.nums === out.waves.length, 'the Liczby cell renders: ' + out.nums + '/' + out.waves.length);
  ok((agg.nemeses || 0) > 0, 'a Nemezis came in');
  return { fails, out }; }"""
SECTIONS = [('make', MAKE), ('spawn', SPAWN), ('grudge', GRUDGE), ('bounty', BOUNTY), ('fallen', FALLEN), ('save', SAVE), ('lines', LINES), ('waves', WAVES)]
async def main():
    only = None
    seeds = [0, 1]
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
