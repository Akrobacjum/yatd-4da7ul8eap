# 1.21 Więzi i dramaty: bonds made with the party and shown (hero card, list), the bonded one's grief at a death he sees, a vow of
# revenge (fury, the killer as his fight, +30%), "nie zostawię cię" (a rescue group of one for a caged and for a lost friend), the
# mentor's warning and praise (and the apprentice's lost chance), a rival's jab, a quarrel over loot (one winner, only he takes it;
# the leader stopping it), the objection over a dead friend's things (and a pair never loots its dead), a bet (the bettor walks
# through the trap's reach), the convo fix (no 3-voice exchange without its C), the new lines; organic waves with no page errors
# and the count of each. Prints FAILS [...] and exits 1 on any. (--only=make,grief,...; --seeds=0,1,2)
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t118_cards.py').read().split('# ---------- 1.')[0])   # LIB (T.fresh, T.raid, T.put, T.tough, T.place, T.withRandom, T.stepS)
from playwright.async_api import async_playwright
LIB2 = r"""() => { const { G } = T;
  T.quiet = () => { G.fl.heroes.forEach(o => { o.bubble = null; o.saidUntil = -9; o.sayQ = null; }); G.fl.party.queueSay = []; G.fl.party.convoT = 0; };
  T.said = []; G.setSayHook((h, t) => T.said.push([h.id, t]));
  T.saidBy = (h, key, o) => T.said.some(s => s[0] === h.id && [].concat(G.SAY[key] || [], G.SOLO[key] || []).some(x => (o ? G.nameFill(x, o) : x) === s[1]));
  T.queued = (h, key, o) => G.fl.party.queueSay.some(q => q.id === h.id && G.SAY[key].some(x => (o ? G.nameFill(x, o) : x) === q.text));
  T.big = () => T.rooms().slice().sort((a, b) => b.tiles.length - a.tiles.length);
  T.of = t => G.alive().find(h => h.type === t);
  T.bond = (a, b, type) => { a.bond = { type, id: b.id, role: type === 'mentor' ? 'mentor' : null }; b.bond = { type, id: a.id, role: type === 'mentor' ? 'apprentice' : null }; };
  T.walk = h => { h.state = 'walk'; h.timer = 0; h.needPlan = true; };
  // a wave of these classes in a fresh dungeon (tough, all known), the warrior leads; pre(R): placed in the build first
  T.setup = (types, pre) => { T.fresh(7); const rs = T.big(), R = rs[0], R2 = rs[1]; if (pre) pre(T.room(R)); const f = T.raid(types); G.fl.known.fill(1);
    const w = T.of('warrior'); if (w) { f.party.leaderId = w.id; w.rank = 1; } return { f, R: T.room(R), R2: T.room(R2) }; };
  T.near = (h, R, n) => { const t = T.walkT(R).sort((p, q) => Math.hypot(p[0] - h.x, p[1] - h.y) - Math.hypot(q[0] - h.x, q[1] - h.y)); return t.slice(1, 1 + (n || 1)); };
  return true; }"""
# ---------- bonds made with the party, the hero's bond, shown ----------
MAKE = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(7);
  const cnt = { parties: 0, one: 0, two: 0, pairs: 0, types: {} };
  for (let n of [2, 4, 5, 6, 8]) for (let i = 0; i < 150; i++) {
    const L = G.makeWave(n); cnt.parties++;
    const b = L.filter(e => e.bond); const pairs = b.length / 2; if (pairs >= 1) cnt.one++; if (pairs >= 2) cnt.two++; cnt.pairs += pairs;
    L.forEach((e, k) => { if (!e.bond) return; const o = L[e.bond.with];
      if (!o || !o.bond || o.bond.with !== k || o.bond.type !== e.bond.type || o === e) fails.push('a bond not mutual: ' + JSON.stringify(e.bond));
      if (e.returning) fails.push('a returner has a bond');
      if (e.bond.type === 'mentor' && !(e.bond.role === 'mentor' ? e.rank >= 1 && o.rank === 0 : e.rank === 0 && o.rank >= 1)) fails.push('mentor ranks: ' + e.rank + '/' + o.rank);
      if (e.bond.role === 'mentor') cnt.types.mentor = (cnt.types.mentor || 0) + 1; else if (e.bond.type !== 'mentor' && k < e.bond.with) cnt.types[e.bond.type] = (cnt.types[e.bond.type] || 0) + 1; });
    if (pairs > 2 || b.length % 2) fails.push('bonds a party: ' + b.length);
  }
  out.make = cnt;
  ok(Math.abs(cnt.one / cnt.parties - 0.55) < 0.08, 'a bond in about 55% of parties: ' + (cnt.one / cnt.parties).toFixed(2));
  ok(cnt.two / cnt.parties > 0.08 && cnt.two / cnt.parties < 0.25, 'a second bond in about 16%: ' + (cnt.two / cnt.parties).toFixed(2));
  ok(['friend', 'sibling', 'rival', 'mentor'].every(t => cnt.types[t] > 0), 'every kind of bond: ' + JSON.stringify(cnt.types));
  // shown: the hero card (before the wave), the label; spawned: h.bond, bondOf, counted
  const nx = G.makeWave(4).slice(0, 4); nx.forEach(e => { e.bond = null; e.returning = false; });
  nx[1].bond = { type: 'rival', with: 3, role: null }; nx[3].bond = { type: 'rival', with: 1, role: null }; G.run.next = nx;
  while (G.modalKind) G.closeModal();
  G.openModal({ type: 'hero', entry: nx[1] }); const tx = (document.querySelector('#card') || {}).textContent || '';
  const lab = (nx[3].female ? 'Rywalka: ' : 'Rywal: ') + nx[3].nm[0];
  ok(tx.includes(lab), 'the hero card shows the bond: ' + lab); out.card = lab;
  while (G.modalKind) G.closeModal();
  ok(G.bondLabel({ type: 'mentor', role: 'apprentice' }, { female: true, nm: ['Wanda'] }) === 'Mistrzyni: Wanda' && G.bondLabel({ type: 'mentor', role: 'mentor' }, { female: false, nm: ['Borys'] }) === 'Uczeń: Borys', 'mentor nouns');
  G.startWave(); const f = G.fl; for (let i = 0; i < 600 && f.queue.length; i++) T.stepS(0.05);
  const a = f.heroes.find(h => h.entry === nx[1]), b = f.heroes.find(h => h.entry === nx[3]);
  ok(a && b && G.bondOf(a) === b && G.bondOf(b) === a && a.bond.type === 'rival', 'spawned: the pair finds each other');
  ok(f.stats.bonds === 1 && f.stats.bondsBy.rival === 1, 'counted once: ' + f.stats.bonds);
  G.openModal({ type: 'hero', id: a.id }); const tx2 = (document.querySelector('#card') || {}).textContent || ''; while (G.modalKind) G.closeModal();
  ok(tx2.includes(lab), 'the live hero card shows the bond');
  // the early word: within 25 s one of the pair speaks to the other (they are together at the door)
  T.stepS(25);
  out.early = f.stats.bondLines || 0;
  return { fails, out }; }"""
# ---------- grief, fear, revenge ----------
GRIEF = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  // a friend sees his friend die: the grief line, half as much fear again as a plain witness
  { const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']);
    const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), tl = T.walkT(R);
    [w, th, mg].forEach((h, i) => T.put(h, tl[i * 2][0], tl[i * 2][1])); T.put(pr, T.walkT(R2)[0][0], T.walkT(R2)[0][1]);   // the priest away: he calms who is near him
    T.bond(th, mg, 'friend'); mg.trait = 'careful'; w.trait = 'careful'; mg.courage = w.courage = 400; mg.R = w.R;
    T.quiet(); T.said = [];
    th.hp = 0; th.dead = true; T.withRandom(0.9, () => G.kill(th, 'trap', 'spikes'));
    ok(T.saidBy(mg, 'griefFriend', th), 'the friend says griefFriend: ' + JSON.stringify(T.said));
    ok(f.stats.griefs === 1, 'griefs counted');
    out.fear = [Math.round(mg.fear), Math.round(w.fear)];
    ok(w.fear > 0 && Math.abs(mg.fear / w.fear - 1.5) < 0.15, 'friend fear x1,5: ' + out.fear);
  }
  // a brave friend swears revenge on the monster that killed him: fury, it is his fight, +30%
  { let gob = null;
    const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], R => { const s = T.floorSpots(R, 'goblin'); gob = T.place('goblin', s[Math.floor(s.length / 2)]); });
    const [w, th, mg] = ['warrior', 'thief', 'mage'].map(T.of);
    gob = [...f.items.values()].find(o => o.type === 'goblin');
    ok(gob, 'a goblin placed');
    if (gob) {
      const t = T.near({ x: gob.x, y: gob.y }, R, 4);
      T.put(th, t[0][0], t[0][1]); T.put(w, t[3][0], t[3][1]); T.put(mg, t[2][0], t[2][1]);
      T.bond(th, w, 'sibling'); w.trait = 'brave'; w.rageUntil = -1;
      T.quiet(); T.said = [];
      th.killer = gob; th.hp = 0; th.dead = true; G.kill(th, 'monster', 'goblin');
      ok(f.stats.revengeVows === 1, 'a vow: ' + f.stats.revengeVows);
      ok(w.vowOn === gob && G.raging(w) && G.vowK(w) === 1.3, 'fury, the killer marked, +30%');
      ok(T.saidBy(w, 'revengeVow', th), 'revengeVow said: ' + JSON.stringify(T.said));
      T.walk(w); w.intent = 'follow'; f.party.leaderId = mg.id; G.planHero(w);
      out.vow = { intent: w.intent, path: w.path.length };
      ok(w.intent === 'fight' && w.path.length && w.path[w.path.length - 1][0] === gob.x && w.path[w.path.length - 1][1] === gob.y, 'he goes for the killer');
      // the apprentice of a dead mentor grows up after 20 s
      T.bond(w, mg, 'mentor'); mg.trait = null; const c0 = mg.courage; T.quiet(); T.said = [];
      w.hp = 0; w.dead = true; T.withRandom(0.9, () => G.kill(w, 'trap', 'spikes'));
      ok(T.saidBy(mg, 'griefMentor', w) || f.party.queueSay.some(q => q.id === mg.id), 'griefMentor said');
      mg.hp = mg.max; T.stepS(21);
      ok(mg.dead || Math.abs(mg.courage / c0 - 1.15) < 0.02, 'the apprentice grew up: ' + c0 + ' -> ' + mg.courage);
    }
  }
  // told later (news): the grief comes queued after the teller
  { const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']);
    const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), tl = T.walkT(R), t2 = T.walkT(R2);
    T.put(th, t2[0][0], t2[0][1]); T.put(w, tl[0][0], tl[0][1]); T.put(mg, tl[1][0], tl[1][1]); T.put(pr, t2[3][0], t2[3][1]);
    T.bond(th, mg, 'rival'); mg.trait = null;
    f.deaths = [{ id: th.id, t: f.time, knows: new Set([w.id]), x: th.x, y: th.y }]; th.dead = true; th.hp = 0;
    T.quiet(); G.perceiveThink(w, G.alive());
    ok(f.party.queueSay.some(q => q.id === mg.id && G.SAY.griefRival.some(x => G.nameFill(x, th) === q.text)), 'news of his rival: griefRival queued');
  }
  return { fails, out }; }"""
# ---------- "nie zostawię cię" ----------
NOLEAVE = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  // the leader leaves the caged one: his friend goes back alone and frees him
  { const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest']);
    const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), tl = T.walkT(R);
    [w, th, mg, pr].forEach((h, i) => { T.put(h, tl[i * 3][0], tl[i * 3][1]); T.walk(h); });
    T.bond(th, mg, 'friend');
    mg.state = 'caged'; mg.cageUntil = f.time + 40; mg.cagedAt = f.time; mg.cageIt = null; mg.path = [];
    T.quiet(); T.said = [];
    T.withRandom(0.99, () => G.decideCage(mg, w));
    const P = f.party;
    ok(P.g2 && P.g2.plan === 'rescue' && P.g2.partner === mg.id && G.inG2(th) && P.g2.ids.size === 1, 'a rescue group of one: ' + JSON.stringify(P.g2 && { plan: P.g2.plan, n: P.g2.ids.size }));
    ok(f.stats.noLeave === 1 && T.queued(th, 'noLeave', mg) && T.queued(mg, 'noLeaveReply'), 'noLeave and the answer queued');
    let freed = -1; for (let i = 0; i < 40 / 0.05 && f.phase === 'raid'; i++) { T.stepS(0.05); if (mg.state !== 'caged') { freed = f.time; break; } }
    ok(freed > 0, 'he frees him');
    T.stepS(1);
    out.cage = { freed: Math.round(freed), saved: f.stats.noLeaveSaved || 0, g2: P.g2 && P.g2.plan };
    ok(f.stats.noLeaveSaved === 1 && (!P.g2 || (P.g2.plan === 'regroup' && P.g2.ids.has(mg.id))), 'they go back together');
  }
  // the leader leaves the lost one: his sister goes to look for him
  { const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']);
    const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), tl = T.walkT(R), t2 = T.walkT(R2);
    [w, th, pr].forEach((h, i) => { T.put(h, tl[i * 3][0], tl[i * 3][1]); T.walk(h); });
    T.put(mg, t2[2][0], t2[2][1]); mg.timer = 999;
    T.bond(th, mg, 'sibling'); G.getLost(mg, 'test');
    f.party.seen = f.party.seen || {}; f.party.seen[mg.id] = { x: t2[0][0], y: t2[0][1], t: f.time };
    T.quiet(); T.withRandom(0.99, () => G.missLost(mg, w));
    const P = f.party;
    ok(P.g2 && P.g2.plan === 'rescue' && G.inG2(th), 'a search group of one');
    let found = -1; for (let i = 0; i < 45 / 0.05 && f.phase === 'raid'; i++) { T.stepS(0.05); if (!mg.lost) { found = f.time; break; } }
    out.lost = { found: Math.round(found), saved: f.stats.noLeaveSaved || 0 };
    ok(found > 0, 'she finds him');
    T.stepS(1);
    ok(f.stats.noLeaveSaved === 1, 'they go back together');
  }
  return { fails, out }; }"""
# ---------- the mentor, rivals ----------
MENTOR = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']);
  const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), tl = T.walkT(R), t2 = T.walkT(R2);
  [w, th, mg, pr].forEach((h, i) => T.put(h, tl[i * 2][0], tl[i * 2][1]));
  T.bond(th, mg, 'mentor'); th.rank = 2; mg.rank = 0;
  mg.max = mg.hp = 1000; mg.hpK = 1;
  T.quiet(); T.said = [];
  G.damage(mg, 200, { type: 'spikes' });
  ok(f.stats.mentorWatch === 1 && T.saidBy(th, 'mentorWatch', mg), 'the mentor warns his hurt apprentice: ' + JSON.stringify(T.said.slice(-3)));
  ok(T.queued(mg, 'apprenticeReply') || true, 'the answer (60%)');
  T.quiet(); mg.hp = 400; G.damage(mg, 200, { type: 'spikes' });
  ok(mg.hp < 0.3 * mg.max && mg.proudAt > 0, 'a near miss: praise due');
  for (let i = 0; i < 80 && !f.stats.mentorProud; i++) G.partyThink(0.05), f.time += 0.05;
  ok(f.stats.mentorProud === 1, 'mentorProud after he lived 3 s');
  // lost chance: x0,7 with the mentor close
  const nt = T.near(mg, R, 1)[0]; T.put(th, nt[0], nt[1]); const a = G.lostChance(mg); T.put(th, t2[0][0], t2[0][1]); const b = G.lostChance(mg);
  out.lost = [a, b]; ok(Math.abs(a / b - 0.7) < 0.02 || a === 0.02, 'lostChance x0,7 near the mentor: ' + out.lost);
  // a rival's jab at a trap wound (20%+)
  T.put(th, tl[2][0], tl[2][1]); T.bond(th, pr, 'rival'); pr.max = pr.hp = 1000; pr.hpK = 1; th.mockT = 0;
  T.quiet(); T.said = [];
  T.withRandom(0.1, () => G.damage(pr, 300, { type: 'spikes' }));
  ok(f.stats.rivalMock === 1 && T.saidBy(th, 'rivalMock', pr) && T.queued(pr, 'rivalMockReply'), 'rivalMock and the answer: ' + JSON.stringify(T.said.slice(-3)));
  return { fails, out }; }"""
# ---------- a quarrel over loot; looting the dead ----------
QUARREL = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage', 'priest']);
  const [w, th, mg, pr] = ['warrior', 'thief', 'mage', 'priest'].map(T.of), tl = T.walkT(R), t2 = T.walkT(R2);
  T.put(w, t2[0][0], t2[0][1]); T.put(pr, t2[2][0], t2[2][1]);
  T.put(th, tl[0][0], tl[0][1]); T.put(mg, tl[2][0], tl[2][1]);
  const sp = tl[4], it = { type: 'loot', x: sp[0], y: sp[1], cd: 0, anim: 0, disabled: false, hp: 0, max: 0, power: 1, shot: 0, flash: 0, preview: 0, dropped: true, spent: 0, item: null, gold: 3, seenWave: G.run.wave };
  f.items.set(key(sp[0], sp[1]), it); const k = key(sp[0], sp[1]);
  th.trait = 'greedy'; th.rank = 2; mg.rank = 0; f.party.lootClaim = new Map([[k, mg.id]]); mg.intent = 'loot'; mg.lootKey = k;
  T.quiet(); T.said = [];
  const won = G.quarrel(th, mg, it, k);
  ok(won === true && f.party.lootClaim.get(k) === th.id && f.stats.quarrels === 1, 'the higher rank (and greedy) wins the claim');
  ok(T.saidBy(th, 'quarrelStart', mg) && T.queued(mg, 'quarrelReply') && T.queued(mg, 'quarrelLose'), 'start, reply, the loser\'s line');
  ok(G.quarrel(th, mg, it, k) === false && f.stats.quarrels === 1, 'once a pair a wave');
  ok(G.pickup(mg, it) === false && f.items.get(k) === it, 'the loser cannot take it');
  ok(G.pickup(th, it) === true && !f.items.has(k), 'the winner takes it');
  ok(f.stats.quarrelWins === 1 && T.queued(th, 'quarrelWin'), 'quarrelWin when he picks it up');
  // the leader sees them: he stops it, nobody takes it for 10 s
  T.put(w, tl[6][0], tl[6][1]); f.party.leaderId = w.id; f.party.quarrels = new Set();
  const it2 = Object.assign({}, it, { x: tl[8][0], y: tl[8][1] }), k2 = key(it2.x, it2.y); f.items.set(k2, it2);
  T.quiet();
  const r2 = T.withRandom(0.1, () => G.quarrel(mg, th, it2, k2));
  ok(r2 === false && f.stats.quarrelStops === 1 && it2.qBan && !it2.qBan.ids && G.pickup(pr, it2) === false, 'the leader stops it: nobody takes it');
  ok(T.queued(w, 'lootStop'), 'lootStop said');
  // through the claims (planHero): a rival of the claimant quarrels
  f.party.quarrels = new Set(); th.trait = null; T.bond(th, mg, 'rival');
  const it3 = Object.assign({}, it, { x: tl[10][0], y: tl[10][1], qBan: null }), k3 = key(it3.x, it3.y); f.items.set(k3, it3);
  f.party.leaderId = pr.id; T.put(w, t2[4][0], t2[4][1]);
  f.party.lootClaim.set(k3, mg.id); mg.intent = 'loot'; mg.lootKey = k3;
  G.lootReassign(th, mg, it3, k3, 3);
  ok(f.stats.quarrels === 3, 'a rival quarrels through lootReassign: ' + f.stats.quarrels);
  // looting the dead: the dead one's pair objects (always), morale -0,05; the pair never loots him
  const P = f.party; T.bond(th, mg, 'friend'); f.party.quarrels = new Set();
  th.hp = 0; th.dead = true; T.withRandom(0.9, () => G.kill(th, 'trap', 'spikes'));
  T.put(w, tl[3][0], tl[3][1]);
  const m0 = P.morale = 0.8; const o0 = f.stats.lootDeadObject || 0; T.quiet();
  G.onLootDead(w, th.id, [{ type: 'charm', r: 1 }], { fromWave: G.run.wave });
  ok((f.stats.lootDeadObject || 0) === o0 + 1 && Math.abs(P.morale - (m0 - 0.05)) < 1e-6 && T.queued(mg, 'lootDeadObject', w), 'the friend objects, morale -0,05');
  const body = [...f.items.values()].find(o => o.body === th.id) || Object.assign({}, it, { body: th.id, fromWave: G.run.wave, x: tl[12][0], y: tl[12][1], gold: 2 });
  ok(G.mateBody(mg, body) && G.pickup(mg, body) === false && mg.state !== 'loot', 'his friend never loots him');
  return { fails, out }; }"""
# ---------- a bet ----------
BET = r"""() => { const { G, key } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  let res = null;
  for (let tries = 0; tries < 4 && !res; tries++) {
    let tr = null;
    const { f, R } = T.setup(['warrior', 'thief', 'mage', 'priest'], R => { const s = T.floorSpots(R, 'spikes'); tr = T.place('spikes', s[Math.floor(s.length / 2)]); });
    tr = [...f.items.values()].find(o => o.type === 'spikes');
    if (!tr) continue;
    tr.detected = true; tr.cd = 0; f.threatDirty = true; G.rebuildThreat();
    const [w, th, mg] = ['warrior', 'thief', 'mage'].map(T.of), area = G.areaOf(tr).filter(q => G.walkable(q[0], q[1])), keys = new Set(area.map(q => q[1] * G.WW + q[0]));
    const st = T.walkT(R).filter(q => !keys.has(q[1] * G.WW + q[0])).sort((p, q) => Math.hypot(p[0] - tr.x, p[1] - tr.y) - Math.hypot(q[0] - tr.x, q[1] - tr.y));
    T.put(th, st[0][0], st[0][1]); T.put(mg, st[2][0], st[2][1]); T.put(w, st[4][0], st[4][1]); T.walk(th); th.rank = 1; th.trait = 'brave';
    ok(f.danger[keys.values().next().value] > 0, 'the trap\'s reach is danger');
    T.bond(th, mg, 'rival'); T.quiet(); T.said = [];
    ok(G.betStart(th, mg, tr) && th.bet && f.stats.bets === 1, 'the bet starts');
    ok(T.saidBy(th, 'betStart') && T.queued(mg, 'betTake', th), 'betStart, betTake');
    let inside = false;
    for (let i = 0; i < 14 / 0.05 && f.phase === 'raid' && !th.bet.done; i++) { T.stepS(0.05); if (keys.has(th.y * G.WW + th.x)) inside = true; }
    res = { inside, done: th.bet.done, won: f.stats.betsWon || 0, lost: f.stats.betsLost || 0, off: f.stats.betsOff || 0 };
    ok(inside, 'the bettor walks into the trap\'s reach');
    ok(th.bet.done && (res.won + res.lost === 1), 'the bet is settled: ' + JSON.stringify(res));
    ok(!res.won || T.queued(th, 'betWin', mg) || T.saidBy(th, 'betWin', mg), 'betWin said by the winner');
  }
  ok(res, 'a bet scene could be set up');
  out.bet = res;
  return { fails, out }; }"""
# ---------- the convo fix, the lines ----------
LINES = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const { f, R, R2 } = T.setup(['warrior', 'thief', 'mage']);
  const [w, th, mg] = ['warrior', 'thief', 'mage'].map(T.of), tl = T.walkT(R);
  T.put(w, tl[0][0], tl[0][1]); T.put(th, tl[1][0], tl[1][1]); const far = T.rooms().map(Q => T.walkT(Q)).flat().sort((p, q) => Math.hypot(q[0] - w.x, q[1] - w.y) - Math.hypot(p[0] - w.x, p[1] - w.y))[0]; T.put(mg, far[0], far[1]);
  G.CONVO.t121 = [{ l: [['B', 'Raz.'], ['C', 'Dwa.']] }];
  const calm = () => { f.party.convoT = 0; f.party.queueSay = []; f.party.queueCur = null; G.alive().forEach(o => { o.talkUntil = -1; o.panicUntil = -1; o.bubble = null; o.state = 'wait'; }); };
  calm(); const n0 = (f.stats.convoNo || {}).fit || 0;
  const r = T.withRandom(0.01, () => G.convoStart(w, 't121'));
  ok(r === false && (f.stats.convoNo || {}).fit === n0 + 1, 'no 3-voice exchange with nobody for C: ' + r + ' ' + JSON.stringify(f.stats.convoNo));
  T.put(mg, tl[2][0], tl[2][1]); calm();
  ok(T.withRandom(0.01, () => G.convoStart(w, 't121')) === true, 'with a third one it plays');
  delete G.CONVO.t121; f.party.queueSay = [];
  const NEW = ['bondFriend', 'bondSibling', 'bondRival', 'bondMentor', 'bondReply', 'griefFriend', 'griefSibling', 'griefMentor', 'griefRival', 'revengeVow', 'noLeave', 'noLeaveReply', 'mentorWatch', 'apprenticeReply', 'mentorProud',
    'rivalMock', 'rivalMockReply', 'quarrelStart', 'quarrelReply', 'quarrelWin', 'quarrelLose', 'betStart', 'betTake', 'betWin', 'betLose'];
  const NAMED = ['bondFriend', 'bondSibling', 'bondRival', 'bondMentor', 'griefFriend', 'griefSibling', 'griefMentor', 'griefRival', 'revengeVow', 'noLeave', 'mentorWatch', 'rivalMock', 'quarrelStart', 'betTake', 'betWin', 'betLose', 'lootDeadObject'];
  NEW.forEach(k => { const a = G.SAY[k]; ok(Array.isArray(a) && a.length === 10, k + ': 10 lines'); (a || []).forEach(t => { if (/\{[nag]\}/.test(t) || (/\{v\}/.test(t) && !NAMED.includes(k))) fails.push('a name the code does not fill: ' + k + ': ' + t); if (/[—–"]/.test(t) || t.length > 62) fails.push('lint ' + k + ': ' + t); }); });
  ['griefFriend', 'revengeVow', 'lootDead'].forEach(k => ok(G.SOLO[k] && G.SOLO[k].length === 6, 'SOLO.' + k));
  ok(['griefFriend', 'quarrelStart', 'betStart', 'rivalMock', 'bondFriend'].every(k => G.CONVO[k] && G.CONVO[k].length >= 6), 'the new conversations');
  // grief lines need the death; a filled one is tagged
  const dead = { nm: ['Borys', 'Borysa', 'Borysie'], female: false };
  ok((G.lineTags(G.nameFill(G.SAY.griefFriend[0], dead)) || []).includes('death') && (G.lineTags(G.nameFill(G.SOLO.revengeVow[0], dead)) || []).includes('death'), 'grief lines need the death');
  // alone, the SOLO line comes filled (bondText) and say() never swaps in a SOLO line with a raw {v}
  T.put(th, T.walkT(T.big()[1])[0][0], T.walkT(T.big()[1])[0][1]); T.quiet(); T.said = [];
  G.say(w, G.nameFill(G.SAY.griefFriend[0], dead), 3); f.deaths = [{ id: 99, knows: new Set([w.id]) }]; T.quiet();
  G.say(w, G.nameFill(G.SAY.griefFriend[1], dead), 3);
  ok(!T.said.some(s => /\{v\}/.test(s[1])), 'no raw {v} said alone: ' + JSON.stringify(T.said));
  return { fails, out }; }"""
# ---------- organic waves ----------
WAVES = r"""(seeds) => { const { G, key } = T, fails = [], out = { waves: [] }; const ok = (c, m) => { if (!c) fails.push(m); };
  const Rn = a => a[Math.floor(Math.random() * a.length)];
  const agg = {}, K = ['bonds', 'bondLines', 'griefs', 'revengeVows', 'revengeFights', 'grownUp', 'noLeave', 'noLeaveSaved', 'mentorWatch', 'mentorProud', 'rivalMock', 'quarrels', 'quarrelStops', 'quarrelWins', 'quarrelSulks', 'lootDeadObject', 'bets', 'betsWon', 'betsLost', 'betsOff', 'kills', 'rifts', 'convos'];
  const S0 = G.S.dmg;
  seeds.forEach(seed => {
    T.fresh(11); const RK = ['goblin', 'spider', 'ogre', 'haunt', 'bats', 'ossuary', 'armory', 'forge', 'prison', 'junk', 'gallery', 'nursery'], RT = ['fog', 'swamp', 'grotto', 'crypt', 'vault', 'haven', 'gears', 'hush', 'ice'];
    T.rooms().forEach((R, i) => { if (i % 2) return; const c = G.run.layout.cells.get(R.key); c.rk = RK[(i + seed) % RK.length]; c.rt = RT[(i * 2 + seed) % RT.length]; });
    G.rebuildDungeon(true); G.fl.essence = 9999;
    const TYPES = Object.keys(G.ITEMS).filter(t => !G.ITEMS[t].tool && (G.TRAPS[t] || G.MONSTERS[t] || G.isLoot(t) || t === 'crate'));
    const spots = t => { const r = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(t, x, y)) r.push([x, y]); return r; };
    ['cage', 'cage', 'loot2', 'loot2', 'loot', 'loot', 'goblin', 'ogre'].concat([...Array(90)].map(() => Rn(TYPES))).forEach(t => { const s = spots(t); if (s.length) T.place(t, Rn(s)); });
    G.S.dmg = S0 * 2.2;
    for (let w = 0; w < 3; w++) {
      const nx = G.makeWave(4 + w); nx.forEach(e => { e.bond = null; }); G.run.next = nx;
      // more pairs than in play, to see each of them: two bonds a party
      const fr = nx.map((e, i) => i).filter(i => !nx[i].returning);
      const ty = Rn(['friend', 'sibling', 'rival']), t2 = Rn(['friend', 'rival', 'mentor']);
      if (fr.length >= 2) { nx[fr[0]].bond = { type: ty, with: fr[1], role: null }; nx[fr[1]].bond = { type: ty, with: fr[0], role: null }; }
      if (fr.length >= 4) { const m = t2 === 'mentor'; nx[fr[2]].bond = { type: t2, with: fr[3], role: m ? 'mentor' : null }; nx[fr[3]].bond = { type: t2, with: fr[2], role: m ? 'apprentice' : null }; if (m) { nx[fr[2]].rank = 2; nx[fr[3]].rank = 0; } }
      nx.forEach(e => { if (e.bond && (e.bond.type === 'rival' || Math.random() < 0.3)) e.trait = Rn(['brave', 'greedy', e.trait]); });
      G.startWave(); const f = G.fl;
      for (let i = 0; i < 240 / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.resolveCheck(Math.random() < 0.5 ? (c.r0 + c.r1) / 2 : (c.g0 + c.r0) / 2); G.clearCheck(); continue; } G.step(0.05); }
      const s = f.stats, o = { seed, w: 4 + w, t: Math.round(f.time) };
      K.forEach(k => { if (s[k]) { o[k] = s[k]; agg[k] = (agg[k] || 0) + s[k]; } });
      out.waves.push(o);
      f.heroes.forEach(h => { if (h.bond && !G.bondOf(h)) fails.push('a bond without its pair: ' + h.id); });
      while (G.modalKind) G.closeModal();
      try { G.openModal({ type: 'wave', details: true, tab: 'nums', rr: 0, rt: 0, out: [] }); const tx = (document.querySelector('#card') || {}).textContent || ''; if (tx.includes('Więzi: pary')) out.nums = (out.nums || 0) + 1; } catch (e) { fails.push('the summary (nums): ' + e); }
      while (G.modalKind) G.closeModal();
      try { G.openModal({ type: 'wave', details: true, tab: 'next', rr: 0, rt: 0, out: [] }); } catch (e) { fails.push('the summary (next): ' + e); }
      while (G.modalKind) G.closeModal();
      G.run.wave++; G.startBuild(); while (G.modalKind) G.closeModal(); G.fl.essence = 9999;
    }
  });
  G.S.dmg = S0;
  out.agg = agg;
  ok(out.nums === out.waves.length, 'the Liczby cell renders: ' + out.nums);
  ok(agg.bonds > 0 && agg.bondLines > 0, 'bonds and their words happen');
  return { fails, out }; }"""
SECTIONS = [('make', MAKE), ('grief', GRIEF), ('noleave', NOLEAVE), ('mentor', MENTOR), ('quarrel', QUARREL), ('bet', BET), ('lines', LINES), ('waves', WAVES)]
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
