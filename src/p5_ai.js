
  /* ================= heroes: the party brain ================= */
  // The party has a leader (the most experienced) who picks where to go, calls retreats and the push for the crystal.
  // Each hero has a job: the thief scouts and disarms, the priest heals, exorcises and blesses, the mage burns monsters
  // and webs, the warrior charges monsters and raises his shield. They only know what they have seen or heard,
  // and rookies make the mistakes rookies make.
  function replanAll() { if (fl) fl.heroes.forEach(h => { h.needPlan = true; }); }
  const byId = id => fl.heroes.find(h => h.id === id);
  const tIdx = h => h.ty * WW + h.tx;
  const hdist = (a, b) => { const p = heroPos(a), q = heroPos(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const panicking = h => fl.time < h.panicUntil;
  const goingOut = () => { const p = fl.party.plan; return p === 'flee' || p === 'leave' || p === 'escape'; };
  const exiting = h => h.fleeing || h.crystal || goingOut();
  const heartGoals = () => fl.heartAdj.map(t => t[1] * WW + t[0]);
  const exitGoals = () => fl.breach ? [fl.ent.y * WW + fl.ent.x, fl.breach.y * WW + fl.breach.x] : [fl.ent.y * WW + fl.ent.x];
  const exitGoal = () => { const g = exitGoals(); return g.length > 1 && planB ? (nearestOf(planB, g) >= 0 ? nearestOf(planB, g) : g[0]) : g[0]; };
  let planB = null;   // the current hero's path search, so the nearest way out can be picked
  function leader() {
    const P = fl.party;
    let L = byId(P.leaderId);
    if (!L || L.dead || L.fled || L.gone || L.lost || panicking(L) || caged(L) || (L.fleeing && P.plan !== 'flee')) {
      const c = alive().filter(o => !o.lost && !panicking(o) && !caged(o) && !(o.fleeing && P.plan !== 'flee'));
      c.sort((a, b) => (b.rank - a.rank) || (LEADER_ORDER.indexOf(a.type) - LEADER_ORDER.indexOf(b.type)));
      L = c[0] || alive()[0] || null;
      P.leaderId = L ? L.id : -1;
    }
    return L;
  }
  function partySay(k, prio, who) {
    const P = fl.party;
    if (fl.time - (P.lastSay[k] || -99) < 5) return false;
    P.lastSay[k] = fl.time; say(who || leader(), pick(SAY[k]), prio); return true;
  }
  // The party stops and talks it over: a few lines from different heroes, one after another.
  function talk(dur, lines) {
    const P = fl.party;
    if (fl.fearless || fl.time < P.talkUntil || goingOut()) return;
    P.talkUntil = fl.time + dur; fl.stats.talks++;
    const crew = alive().filter(h => !h.lost && !panicking(h) && h.id !== P.scoutId && !caged(h));
    P.queueSay = P.queueSay.concat(lines.map((t, i) => ({ id: (crew[i % Math.max(1, crew.length)] || {}).id, text: t, at: fl.time + i * 0.65 })));
  }
  function lootLevel(it) { return ITEMS[it.type].rarity || 0; }
  // Common loot is noticed from the same room, rare from the next one, legendary glitters across the dungeon.
  function lootSeen(it) {
    if (it.seenWave === run.wave) { if (it.type === 'lcursed') checkCursed(it); return true; }
    const r = lootLevel(it), R = r === 3 ? 12 : r === 2 ? 7 : 5, ir = roomOf(it.x, it.y);
    const by = alive().find(h => (h.room === ir && fl.known[it.y * WW + it.x]) || (r >= 2 && Math.hypot(h.tx - it.x, h.ty - it.y) <= R) || (r === 1 && fl.known[it.y * WW + it.x] && Math.hypot(h.tx - it.x, h.ty - it.y) <= R));
    if (!by) return false;
    noticeLoot(it, by);
    if (it.type === 'lcursed') checkCursed(it);
    return true;
  }
  // An experienced priest (level 6+) feels the curse on a treasure close by and warns the others: nobody touches it.
  function checkCursed(it) {
    if (it.cursedKnown) return;
    const pr = alive().find(h => h.type === 'priest' && h.lvl >= 6 && !h.lost && !h.fleeing && Math.hypot(h.tx - it.x, h.ty - it.y) <= 6);
    if (!pr) return;
    it.cursedKnown = true; fl.stats.cursedSeen = (fl.stats.cursedSeen || 0) + 1; tl('cw', it.x, it.y);
    say(pr, pick(SAY.cursedWarn), 4, 2.2); floatTile(it.x, it.y, 'Przeklęte!', '#b48cff', 14, -0.6);
    replanAll();
  }
  // Worth it? What the loot is worth to THIS hero (gold to the greedy, a potion to the wounded, gear he can use)
  // against the danger they know about on the way and around it.
  function lootDecision(h, it, b, idx) {
    if (mods.noPickup || it.cursedKnown) return false;   // Odwrotna chciwość: they look, they want, they never take
    const k = key(it.x, it.y), memo = h.lootMemo.get(k);
    if (memo && fl.time - memo.t < 8) return memo.go;
    const r = lootLevel(it), kind = LOOT_KIND[it.type], hurt = h.hp < 0.4 * h.max;
    let need = 1;
    if (kind === 'potion') need = hurt ? 3.2 : h.hp < 0.7 * h.max ? 1.6 : (h.inv.some(x => x.type === 'potion') ? 0.25 : 0.6);
    else if (kind === 'gold') need = h.type === 'thief' || h.trait === 'greedy' || h.hunter ? 1.6 : 1;
    else if (it.item) need = Math.min(2, itemValue(h, it.item) / Math.max(0.6, 1.2 * it.item.r));   // a dropped item: better than his own?
    if (it.item && need <= 0.05) { h.lootMemo.set(k, { go: false, t: fl.time }); return false; }
    let value = [0, 1, 2.6, 6][r] * need * h.T.greed * (h.rank === 0 ? 1.6 : h.rank === 1 ? 1 : 0.85) * (0.6 + 0.4 * fl.greed);
    if (h.rank >= 2 && kind === 'gold' && h.type !== 'thief' && !h.hunter) value *= 0.3;   // elites do not stoop for small change...
    if (r >= 2) value *= 1 + 0.06 * (h.lvl - 1);   // ...but glory and rare treasure pull harder the better they are
    if (h.trait === 'greedy') value *= 1.8; else if (h.trait === 'careful') value *= 0.6;
    if (isRt(roomOf(it.x, it.y), 'vault')) value *= 1.5;   // Sezam
    let risk = 0;
    pathFrom(b, idx).forEach(p => { risk += fl.danger[p[1] * WW + p[0]]; });
    risk *= 0.35;
    fl.items.forEach(m => { if (MONSTERS[m.type] && m.hp > 0 && fl.known[m.y * WW + m.x] && Math.hypot(m.x - it.x, m.y - it.y) <= 2.5) risk += 2.5; });
    risk += 2 * h.fear / h.courage + (hurt && kind !== 'potion' ? 2 : 0);
    const nerve = Math.max(0.8, h.R.risk) * (h.trait === 'greedy' ? 1.3 : 1) * (kind === 'potion' && hurt ? 1.5 : 1);   // caution grows with experience, but never to zero; the wounded risk it for a potion
    const go = h.rank === 0 ? (value * 2 * nerve > risk || Math.random() < 0.7) : value * 2 * nerve > risk;
    h.lootMemo.set(k, { go, t: fl.time });
    if (!memo) {   // they think out loud
      fl.stats.lootWeighed = (fl.stats.lootWeighed || 0) + 1;
      if (go) {
        if (risk > 2) fl.stats.lootRisked++;
        say(h, kind === 'potion' && hurt ? pick(['Mikstura! Muszę ją mieć!', 'Ledwo żyję, biorę tę miksturę!']) : pick(h.trait === 'greedy' ? SAY.lootGreedy : r === 3 ? SAY.lootLegend : h.rank === 0 ? SAY.lootRookie : risk > 2 ? SAY.lootGo : SAY['loot' + r]), 2);
        const L = leader();   // the leader does not always like it
        if (L && L !== h && L.rank >= 1 && risk > 1.5 && Math.random() < 0.4) {
          fl.party.queueSay.push({ id: L.id, text: pick(SAY.lootStop), at: fl.time + 0.8 });
          fl.party.queueSay.push({ id: h.id, text: pick(SAY.lootReply), at: fl.time + 1.8 });
          fl.stats.lootArgue = (fl.stats.lootArgue || 0) + 1;
        }
      } else {
        fl.stats.lootSkipped++;
        if (Math.random() < 0.6) say(h, pick(h.trait === 'careful' ? SAY.lootCareful : h.rank >= 2 && kind === 'gold' ? SAY.lootPetty : SAY.lootRisk), 2);
      }
    }
    return go;
  }
  function safestRoom(from) {
    const b = from ? bfs(from.x, from.y, { known: true }) : null;
    let best = -1, bestSc = 1e9;
    fl.rooms.forEach(r => {
      if (r.kind !== 'room' || !r.seen || r.id === fl.heart.room || r.rt === 'swamp') return;   // nobody rests knee-deep in a swamp
      let danger = 0, near = 1e9;
      r.tiles.forEach(t => { const i = t[1] * WW + t[0]; danger += fl.danger[i]; if (b && b.dist[i] >= 0 && b.dist[i] < near) near = b.dist[i]; });
      if (b && near >= 1e9) return;
      let threats = 0; fl.items.forEach(it => { if (roomOf(it.x, it.y) !== r.id) return; if (MONSTERS[it.type] && it.hp > 0) threats += 5; else if (LOOKS_TRAP(it.type) && it.detected && !it.disabled) threats += 3; });
      const sc = danger + threats + (b ? near * 0.2 : 0);
      if (sc < bestSc) { bestSc = sc; best = r.id; }
    });
    return best;
  }
  // Rooms they know of (from the tavern or from the doorway) but have not walked through yet this wave: there may be treasure.
  function searchTargets() {
    const out = [];
    fl.rooms.forEach(R => {
      if (R.kind !== 'room' || R.visited || !R.seen || R.id === fl.heart.room) return;
      const cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2;
      const c = R.tiles.filter(t => walkable(t[0], t[1])).sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
      if (c) out.push({ i: c[1] * WW + c[0], room: R.id });
    });
    return out;
  }
  function chooseTarget(L) {
    const P = fl.party, fr = frontier(), st = P.wantSearch ? searchTargets() : [];
    P.targetRoom = -1;
    if (!fr.length && !st.length) { P.target = -1; return; }
    const b = bfs(L.x, L.y, { known: true, avoid: L.R.avoid });
    const seenLoot = [...fl.items.values()].filter(it => isLoot(it.type) && it.seenWave === run.wave);
    const cands = [];
    const add = (f, room, bonus) => {
      const d = b.dist[f]; if (d < 0) return;
      const fx = f % WW, fy = (f / WW) | 0;
      let sc = d - 0.18 * (Math.abs(fx - fl.ent.x) + Math.abs(fy - fl.ent.y)) + Math.random() * 1.5 + bonus;
      seenLoot.forEach(it => { if (Math.hypot(it.x - fx, it.y - fy) <= 6) sc -= 3 * lootLevel(it); });
      if (room >= 0 && isRt(room, 'vault')) sc -= 4;   // a treasure room pulls them in
      cands.push({ f, sc, d, fx, fy, room });
    };
    fr.forEach(f => add(f, -1, 0));
    st.forEach(t => add(t.i, t.room, 2));   // the unknown is more tempting than a room they have heard of
    if (!cands.length) { P.target = -1; return; }
    cands.sort((a, c) => a.sc - c.sc);
    const prev = P.target;
    if (L.rank === 0) {   // a rookie leader just picks something and goes
      const c = cands[Math.min(cands.length - 1, rand(0, 2))];
      P.target = c.f; P.targetRoom = c.room;
      if (prev !== c.f && Math.random() < 0.3) partySay('rookieLead', 1, L);
      return;
    }
    const best = cands[0];
    P.target = best.f; P.targetRoom = best.room;
    // a second, different way that looks almost as good: talk it over, maybe send the thief
    const alt = cands.find(c => c !== best && c.sc < best.sc + 5 && Math.abs(c.fx - best.fx) + Math.abs(c.fy - best.fy) > 5);
    let room = roomOf(L.tx, L.ty);
    if (room < 0) for (const d of DIRS) { const r = roomOf(L.tx + d[0], L.ty + d[1]); if (r >= 0 && !P.junctions.has(r)) { room = r; break; } }
    if (alt && room >= 0 && !P.junctions.has(room) && !fl.fearless && fl.time - P.lastTalkAt > 6) {
      P.lastTalkAt = fl.time;
      P.junctions.add(room);
      const lines = [pick(SAY.deliberate), pick(SAY.deliberate)];
      const thief = alive().find(h => h.type === 'thief' && h !== L && !h.lost && !panicking(h) && !h.fleeing);
      const lureAlt = seenLoot.some(it => Math.hypot(it.x - alt.fx, it.y - alt.fy) <= 6);
      if (thief && alive().length >= 3 && P.scoutId < 0 && thief.hp > 0.5 * thief.max && Math.random() < (lureAlt ? 0.9 : 0.55)) {
        P.scoutId = thief.id; thief.scoutTarget = alt.f; thief.scoutUntil = fl.time + 16; thief.needPlan = true; fl.stats.scouts++;
        lines.push(pick(SAY.scout));
        P.queueSay.push({ id: L.id, text: pick(SAY.scoutReply), at: fl.time + 2.1 });
      }
      talk(1.6, lines);
    } else if (prev !== best.f && Math.random() < 0.35) partySay('explore', 1, L);
  }
  // A friend in a cage: elites always go back for him; others weigh their own fear.
  function decideCage(c, L) {
    const P = fl.party;
    P.cageDecided.add(c.id);
    const others = alive().filter(o => o !== c && !o.fleeing && !caged(o));
    if (!others.length || goingOut()) return;
    const fearR = others.reduce((a, o) => a + o.fear / o.courage, 0) / others.length;
    const rescue = L.rank >= 2 || (fearR < 0.6 && Math.random() < (L.rank === 0 ? 0.5 : 0.8));
    const who = L === c ? others[0] : L;
    tl('rs', c.id, rescue ? 1 : 0);
    if (rescue) { P.rescueId = c.id; P.rescuerId = -1; say(who, nameFill(pick(SAY.rescue), c), 3); }
    else { P.abandoned.add(c.id); fl.stats.abandons++; say(who, nameFill(pick(SAY.abandon), c), 3); P.queueSay.push({ id: c.id, text: pick(SAY.abandoned), at: fl.time + 1 }); addFear(c, 15, 'cage'); }
  }
  // Runs a few times per second: who leads, where they go, retreat, push for the crystal or run, who got separated.
  function partyThink(dt) {
    const P = fl.party, crew = alive();
    if (P.plan !== P.loggedPlan) { P.loggedPlan = P.plan; tl('pl', P.plan); }
    if (P.queueSay.length) P.queueSay = P.queueSay.filter(q => { if (q.at > fl.time) return true; const h = byId(q.id); if (h && !h.dead) say(h, q.text, 2, 1.8); return false; });
    fl.items.forEach(it => { if (isLoot(it.type)) lootSeen(it); });
    if (!crew.length) return;
    const L = leader();
    P.morale = Math.min(1, P.morale + 0.012 * dt);
    // Prototype 1.01, Mgła: the leader walks into the fog and gropes for the way for a few seconds (once per fog room per wave)
    if (L && !goingOut() && !fl.fearless && L.room >= 0 && isRt(L.room, 'fog') && !P.detour) {
      P.fogDone = P.fogDone || new Set();
      if (!P.fogDone.has(L.room)) {
        P.fogDone.add(L.room);
        const R = fl.rooms[L.room], spots = R.tiles.filter(t => walkable(t[0], t[1]) && Math.hypot(t[0] - L.tx, t[1] - L.ty) >= 2);
        if (spots.length) { const t = pick(spots); P.detour = { goal: t[1] * WW + t[0], until: fl.time + 3 + 0.25 * Math.max(0, 8 - L.lvl / 2) }; fl.stats.fogGrope = (fl.stats.fogGrope || 0) + 1; tl('fg', L.room); say(L, pick(['Nic nie widać... gdzie są drzwi?', 'Trzymajcie się blisko, ta mgła...', 'Którędy? Nie widzę ściany!']), 3); }
      }
    }
    crew.forEach(h => {
      const others = crew.filter(o => o !== h);
      const nearest = others.length ? Math.min(...others.map(o => hdist(h, o))) : 0;
      h.alone = others.length > 0 && fl.queue.length === 0 && nearest > 4.5;
      if (h.alone) { fl.stats.loneTime += dt; addFear(h, 2.5 * dt, null, 'alone'); h.acc += addPts(GZ.alone * dt * depthMult(h.room) * mods.loneMult, 'lonePts', h); /* v14: steady Groza for every second alone */ if (!h.aloneSaid && !panicking(h)) { say(h, pick(SAY.alone), 2); h.aloneSaid = true; } }
      else h.aloneSaid = false;
      if (h.hp < 0.35 * h.max) addFear(h, 2.2 * dt, null, 'lowhp');   // v15.1: was 3/s (heavy wounds scare less, fear pays more)
      if (h.crystal && mods.carrierFear) addFear(h, mods.carrierFear * dt, null, 'carrier');
      if (caged(h) && mods.cageHaunt) addFear(h, mods.cageHaunt * dt, 'cage', 'haunt');   // Nawiedzone klatki
      // counter-buildings: the first one to walk in (preferably the one it hurts) reacts out loud
      if (h.room >= 0 && fl.bRooms && fl.bSaid) ['altar', 'rune', 'acid', 'veil'].forEach(t => {
        const kk = t + ':' + h.room;
        if (!inB(t, h.room) || fl.bSaid.has(kk)) return;
        const pref = { altar: 'priest', rune: 'mage', acid: 'warrior' }[t];
        if (pref && h.type !== pref && crew.some(o => o.type === pref && o.room === h.room)) return;
        fl.bSaid.add(kk); say(h, pick(SAY['b' + t.charAt(0).toUpperCase() + t.slice(1)]), 3);
      });
      // caged with nobody coming: the fear builds until he tears the bars apart and runs
      if (caged(h) && (P.abandoned.has(h.id) || !crew.some(o => o !== h && !caged(o) && !o.fleeing && !o.lost))) addFear(h, 8 * dt * mods.cageFear, 'cage', 'cageAlone');
      if (h.cursed) addFear(h, 2 * dt, null, 'curse');   // a cursed treasure whispers
      if (fl.time < (h.lullUntil || 0) && h.room === h.lullRoom) addFear(h, h.lullK * dt, 'musicbox', 'lull');   // v15.1: the music box's lullaby, while he stays in that room
      if (h === L) { h.lost = false; h.sepT = 0; return; }
      const d = L ? hdist(h, L) : 0;
      if (h.lost) { if (d < (isRt(h.room, 'fog') || isRt(L ? L.room : -1, 'fog') ? 1.6 : 4.5)) { h.lost = false; h.noPathT = 0; h.sepT = 0; h.sepRolled = false; say(h, pick(SAY.found), 3); h.needPlan = true; if (P.searchId === h.id) P.searchId = -1; } }
      else if (!fl.fearless && !exiting(h) && h.id !== P.scoutId && !caged(h) && !(h.wanderUntil > fl.time)) {
        // cut off from the leader (another room, far away): in a big dungeon, or in the fog, he may lose his way
        const apart = !!L && d > 7 && h.room !== L.room;
        h.sepT = apart ? h.sepT + dt : 0;
        if (!apart) h.sepRolled = false;
        if (h.noPathT > 3 && d > 6) getLost(h, 'nopath');
        else if (h.sepT > 3 && !h.sepRolled) { h.sepRolled = true; if (Math.random() < lostChance(h)) getLost(h, 'sep'); }
        else if (h.room >= 0 && isRt(h.room, 'fog') && d > 1.5 && Math.random() < dt * 0.22 * Math.max(0.35, 1 - 0.03 * h.lvl) * (h.type === 'thief' ? 0.6 : 1)) getLost(h, 'fog');   // 1.01: in the fog anyone a step away from the leader can lose the party
      }
      if (h.lost) {
        addFear(h, 4 * dt, null, 'lost');
        if (h.lostT < 12) {
          h.lostT += dt;
          const pts = addPts(GZ.lost * dt * depthMult(h.room) * mods.lostMult, 'lostPts', h); fl.stats.lostTime += dt; h.acc += pts;
        }
        if (fl.time > h.lostCallT && !panicking(h)) { h.lostCallT = fl.time + 6 + 3 * Math.random(); say(h, pick(SAY.lostCall), 2); }
      }
    });
    // a spare potion for a friend who is about to die
    crew.forEach(g => {
      if (fl.time < g.giveCd || exiting(g) || caged(g) || panicking(g) || g.lost) return;
      const pots = g.inv.filter(x => x.type === 'potion');
      if (!pots.length || (pots.length === 1 && g.hp < 0.7 * g.max)) return;
      const f = crew.find(o => o !== g && o.hp < 0.3 * o.max && !o.inv.some(x => x.type === 'potion') && !caged(o) && hdist(o, g) <= 2);
      if (!f) return;
      const pot = pots.sort((a, b) => a.r - b.r)[0];
      g.inv.splice(g.inv.indexOf(pot), 1); g.giveCd = fl.time + 10;
      f.hp = Math.min(f.max, f.hp + f.max * potionHeal(pot) * itemPow(f));
      fl.stats.potionsGiven++; fl.stats.potions++; fl.stats.itemsUsed++; tl('pg', g.id, f.id);
      say(g, pick(SAY.potionGive), 3); P.queueSay.push({ id: f.id, text: pick(SAY.potionThanks), at: fl.time + 1.1 });
      floatHero(f, 'Mikstura!', '#8be38f', 14, -0.7);
    });
    if (!L) return;
    if (P.prep && fl.time >= P.prep.until) finishPrep();
    else if (!P.prep) checkPrep(L);
    crew.forEach(h => { if (caged(h) && !P.cageDecided.has(h.id)) decideCage(h, L); });
    if (P.rescueId >= 0) { const c = byId(P.rescueId); if (!c || !caged(c) || c.dead) P.rescueId = -1; }
    const avgHp = crew.reduce((a, h) => a + h.hp / h.max, 0) / crew.length;
    const fearR = crew.reduce((a, h) => a + h.fear / h.courage, 0) / crew.length;
    // scout coming back
    const sc = byId(P.scoutId);
    if (sc && (sc.dead || sc.fled || fl.time > sc.scoutUntil || sc.hp < 0.45 * sc.max || (sc.scoutTarget >= 0 && !isFrontierTile(sc.scoutTarget)))) {
      if (!sc.dead && !sc.fled) say(sc, pick(SAY.scoutBack), 2);
      P.scoutId = -1; sc.scoutTarget = -1; sc.needPlan = true;
    }
    if (goingOut()) { /* everyone heads for the exit */ }
    else if (fl.fearless) { if (P.plan !== 'assault' && fl.heartKnown) { P.plan = 'assault'; replanAll(); } }
    else if (P.plan === 'retreat') {
      if (P.restSince < 0 && crew.some(h => h.state === 'rest')) P.restSince = fl.time;
      if (avgHp >= 0.7 || (P.restSince > 0 && fl.time - P.restSince > 20)) {
        P.plan = fl.heartKnown ? 'assault' : 'explore'; P.retreatLock = fl.time + 15; P.restSince = -1;
        partySay('restDone', 2, L);
        crew.forEach(h => { if (h.state === 'rest') h.state = 'walk'; h.needPlan = true; });
      }
    } else if (L.R.coord && fl.time > P.retreatLock && (avgHp < (P.plan === 'assault' ? 0.32 : 0.42) || (crew.some(h => h.hp < 0.22 * h.max) && !crew.some(h => h.type === 'priest')))) {
      const room = safestRoom(L);
      if (room >= 0) { P.plan = 'retreat'; P.retreatRoom = room; P.restSince = -1; fl.stats.retreats++; partySay('retreat', 3, L); replanAll(); }
    }
    // when spirits break, everyone runs (rookies break first)
    if (!goingOut() && (fearR > [0.75, 0.85, 0.95, 1][L.rank] || (P.morale < 0.2 && L.rank < 2))) partyFlee();
    // how much of the dungeon they have really searched: rooms walked through count fully, rooms only heard of in the tavern half.
    // They came for treasure too: the greedier they are, the more they search before the push for the crystal.
    const roomsAll = fl.rooms.filter(r => r.kind === 'room'), seenShare = roomsAll.reduce((a, r) => a + (r.visited ? 1 : r.seen ? 0.3 : 0), 0) / roomsAll.length;
    if (fl.heartKnown && !P.heartSaid && !goingOut()) { P.heartSaid = true; say(L, pick(seenShare < 0.65 && L.rank > 0 ? SAY.heartLater : SAY.heartSeen), 3); }
    const need = Math.min(0.85, (L.rank === 0 ? 0.5 : 0.6) + 0.1 * clamp(fl.greed - 1, 0, 2) - (L.rank >= 2 ? 0.1 : 0));
    const tLimit = S.waveTime * Math.min(0.6, 0.45 + 0.01 * Math.max(0, roomsAll.length - 6));   // a big dungeon takes longer to search
    const detourG = P.gateDetourUntil > fl.time;   // 1.01: sent round by a closed gate, they search what they have not seen
    const wasSearch = P.wantSearch; P.wantSearch = (seenShare < need && fl.time < tLimit) || detourG;   // still searching the rooms they know of (for treasure)
    if (wasSearch !== P.wantSearch) fl.knowDirty = true;
    if (P.plan === 'explore' && !detourG && fl.heartKnown && avgHp >= 0.5 && (seenShare >= need || fl.time > tLimit)) { P.plan = 'assault'; P.detour = null; partySay('assault', 3, L); replanAll(); }
    if (P.searchId >= 0) { const c = byId(P.searchId); if (!c || !c.lost || c.dead || c.fled || fl.time > P.searchUntil || goingOut()) P.searchId = -1; }
    if (P.plan === 'explore') {
      const valid = P.target >= 0 && (isFrontierTile(P.target) || (P.targetRoom >= 0 && !fl.rooms[P.targetRoom].visited));
      if (!valid || (fl.knowDirty && fl.time - fl.newKnowAt < 0.5)) { chooseTarget(L); fl.knowDirty = false; replanAll(); }
      if (P.target < 0 && fl.heartKnown) { P.plan = 'assault'; partySay('assault', 3, L); replanAll(); }   // nothing left to explore: go for it
    }
    // A closed gate between the leader and where he wants to go. Prototype 1.01: even on the way to the heart they go and search
    // the rooms they have not been to in this wave (that is what a gate is for: it sends them through the rest of your dungeon).
    // Nothing left to search: they wait, and a thief tries to lever the gate up.
    const gateShut = [...fl.doors.values()].some(d => d.closedUntil > fl.time);
    if (gateShut && L.blocked >= 0 && !goingOut()) {
      P.blockT = (P.blockT || 0) + dt;
      if (P.blockT > 1.2 && !P.blockSaid) {
        P.blockSaid = true;
        const before = P.target, wasPlan = P.plan;
        if (P.plan === 'assault') { P.plan = 'explore'; P.gateDetourUntil = fl.time + 18; P.wantSearch = true; }
        if (P.plan === 'explore') { chooseTarget(L); replanAll(); }
        const moved = P.plan === 'explore' && P.target >= 0 && (P.target !== before || wasPlan !== 'explore');
        if (!moved && wasPlan === 'assault') { P.plan = 'assault'; P.gateDetourUntil = 0; }
        if (moved) fl.stats.reroutes = (fl.stats.reroutes || 0) + 1;
        say(L, pick(moved ? SAY.gateReroute : SAY.gateWait), 3, 2.2);
        if (!moved) P.liftT = 0;
      }
      if (P.blockSaid && P.plan !== 'explore') {   // waiting at the gate: a thief next to it levers it up in 3 s
        const door = [...fl.doors.values()].filter(d => d.closedUntil > fl.time).sort((a, b) => Math.hypot(a.x - L.tx, a.y - L.ty) - Math.hypot(b.x - L.tx, b.y - L.ty))[0];
        const it = door && fl.items.get(key(door.x, door.y)), th = door && alive().find(h => h.type === 'thief' && !panicking(h) && !h.fleeing && Math.hypot(h.tx - door.x, h.ty - door.y) <= 1.6);
        if (it && it.type === 'gate' && th) {
          if (!P.liftT) say(th, 'Podważę ją, osłaniajcie mnie!', 3, 2);
          P.liftT = (P.liftT || 0) + dt * (th.lvl >= 6 ? 1.5 : 1);
          if (P.liftT >= 3) {
            door.closedUntil = fl.time; it.disabled = true; it.detected = true; fl.threatDirty = true; P.liftT = 0;
            bt('gate').disarmed++; fl.stats.disarmed++; tl('lg', th.id, door.x, door.y);
            floatTile(door.x, door.y, 'Krata podważona', '#c9c2d8', 13, -0.6); replanAll();
          }
        }
      }
    } else { P.blockT = 0; P.liftT = 0; if (!gateShut) P.blockSaid = false; }
    if (P.gateDetourUntil && P.plan === 'explore' && (fl.time > P.gateDetourUntil || P.target < 0) && fl.heartKnown && !gateShut) { P.gateDetourUntil = 0; P.plan = 'assault'; replanAll(); }
    if (P.ambushN >= 3 && fl.time - P.ambushT < 0.6 && fl.time - (P.ambushSaid || -99) > 12) { P.ambushN = 0; P.ambushSaid = fl.time; talk(1.0, [pick(SAY.ambush)]); crew.forEach(h => addFear(h, 6, null, 'ambush')); }
    // small talk, flavoured by experience
    P.chatT -= dt;
    if (P.chatT <= 0) {
      P.chatT = 7 + Math.random() * 6;
      const h = pick(crew), lines = [];
      if (h.hp < 0.4 * h.max) lines.push('Ledwo stoję...', 'Potrzebuję chwili.');
      if (h.inv.length) { const H = HITEMS[h.inv[0].type]; lines.push(G3(H.g, 'Ten', 'Ta', 'Te') + ' ' + H.name + ' ' + G3(H.g, 'może', 'może', 'mogą') + ' się przydać.', 'Dobrze, że mam ' + H.acc + '.'); }
      if (h.fear > 0.5 * h.courage) lines.push('Nie podoba mi się to wszystko.', 'Wracajmy, póki możemy...');
      if (fl.time < h.shakenUntil + 6) lines.push(...SAY.shaken, ...SAY.shaken);   // a death is still on their mind
      if (h.gold >= 2) lines.push(...SAY.goldHeavy, 'Jeszcze trochę złota i wracam do domu.');
      if (h.cursed) lines.push(...SAY.cursedPick);
      if (h.type === 'priest' && h.faith <= 1) lines.push(...SAY.faithLow);
      const low = crew.find(o => o !== h && o.hp < 0.3 * o.max);
      if (low) lines.push(nameFill(pick(SAY.friendLow), low));
      if (fl.greed > 1.5) lines.push('Ile tu złota!', 'Wszyscy będziemy bogaci.');
      if (h.rank === 0) lines.push(...SAY.rookie); else if (h.rank >= 2) lines.push(...SAY.elite);
      lines.push('Słyszycie to?', 'Trzymajcie się blisko.', 'Patrzcie pod nogi.');
      if (!h.bubble) say(h, pick(lines), 1, 2.2);
    }
    if (P.plan !== 'retreat' && !fl.fearless && !goingOut() && L.R.coord) {
      const far = crew.filter(h => h !== L && !h.lost && h.id !== P.scoutId && !panicking(h) && h.state !== 'fight' && !caged(h) && hdist(h, L) > 7);
      if (far.length && fl.time > P.waitUntil + 2) { P.waitUntil = fl.time + 1.6; fl.stats.regroups++; partySay('regroup', 2, L); }
    }
    // rookies wander off on their own
    if (P.plan === 'explore') crew.forEach(h => {
      if (h.rank !== 0 || h === L || h.lost || h.wanderUntil > fl.time || caged(h) || Math.random() > 0.004) return;
      const fr = frontier().filter(f => Math.hypot(f % WW - h.tx, ((f / WW) | 0) - h.ty) > 4);
      if (!fr.length) return;
      h.wanderTarget = pick(fr); h.wanderUntil = fl.time + 10; h.needPlan = true; fl.stats.wanders++; say(h, pick(SAY.wander), 2);
    });
  }
  /* ----- getting lost, wrong turns ----- */
  // The chance to lose the way once cut off from the leader: bigger dungeon and fog = more, experience and a thief's sense = less.
  function lostChance(h) {
    const p = 0.12 + 0.03 * Math.max(0, roomCount() - 6) + (isRt(h.room, 'fog') ? 0.45 : 0) - 0.01 * h.lvl - (h.type === 'thief' ? 0.1 : 0);
    return clamp(p, 0.02, 0.6);
  }
  function getLost(h, why) {
    if (h.lost) return;
    h.lost = true; h.sepRolled = true; h.lostT = 0; h.lostCallT = fl.time + 5; h.needPlan = true;
    fl.stats.gotLost++; tl('lo', h.id, why); say(h, pick(SAY.lost), 3);
    // the leader decides: go back for him, or let him find his own way
    const P = fl.party, L = leader();
    if (!L || L === h || P.searchId >= 0 || goingOut() || fl.fearless) return;
    const crew = alive(), fearR = crew.reduce((a, o) => a + o.fear / o.courage, 0) / crew.length;
    if (L.rank >= 1 && fearR < 0.6 && Math.random() < 0.6) {
      P.searchId = h.id; P.searchUntil = fl.time + 12; fl.stats.searches++; tl('se', h.id);
      P.queueSay.push({ id: L.id, text: nameFill(pick(SAY.searchLost), h), at: fl.time + 0.8 });
      L.needPlan = true;
    } else P.queueSay.push({ id: L.id, text: nameFill(pick(SAY.leaveLost), h), at: fl.time + 0.8 });
  }
  // A wrong turn at a junction (a room with 3+ ways out): more likely in a big dungeon and in the fog, rarer for veterans who know the way.
  function maybeDetour(L, r) {
    const P = fl.party;
    if (P.detour || fl.fearless || goingOut() || L.lost || P.plan === 'retreat' || fl.time < (P.detourCd || 0)) return;
    const R = fl.rooms[r]; if (!R || R.kind !== 'room') return;
    const doors = R.doors.filter(d => !d.entrance), fog = isRt(r, 'fog');
    if (doors.length < 3 && !(fog && doors.length >= 2)) return;
    let p = 0.05 + 0.02 * Math.max(0, roomCount() - 6) + (fog ? 0.25 : 0) - 0.004 * L.lvl - (L.type === 'thief' ? 0.03 : 0);
    if (fl.heartKnown && P.plan === 'assault' && L.rank >= 2) p *= 0.5;
    if (Math.random() >= clamp(p, 0, 0.4)) return;
    const next = new Set(L.path.slice(0, 10).map(t => key(t[0], t[1])));
    const cand = doors.filter(d => !next.has(key(d.x, d.y)) && !(d.x === L.x && d.y === L.y) && fl.known[d.y * WW + d.x]);
    if (!cand.length) return;
    const d = pick(cand), H = fl.rooms[d.b];
    let goal = d.y * WW + d.x;
    if (H && H.kind === 'hall') { const far = H.doors.find(o => o !== d); if (far && fl.known[far.y * WW + far.x]) goal = far.y * WW + far.x; }   // down that corridor to its far end
    P.detour = { goal, until: fl.time + 10 }; P.detourCd = fl.time + 15; fl.stats.detours++; tl('dt', d.x, d.y);
    say(L, pick(SAY.detour), 3); L.needPlan = true;
  }
  /* ----- powers with a cooldown (talisman, amulet, boots): the hero decides when ----- */
  const powerReady = (h, t) => h.inv.find(x => x.type === t && fl.time >= (x.cdUntil || 0) && (x.charges === undefined || x.charges > 0));
  function usePower(h, it) { it.cdUntil = fl.time + HITEMS[it.type].cd * (h.cursed ? 1.5 : 1); if (it.charges !== undefined) it.charges--; fl.stats.itemsUsed++; }
  // Talisman: a 3 s ward against trap damage (25% at the first level, +5% a level, at most 40%). A few uses a wave. Rookies switch it on
  // after a hard hit, veterans also right before a trap they know about.
  function useCharm(h, why) {
    if (h.dead || fl.time < h.wardUntil) return false;
    const it = powerReady(h, 'charm'); if (!it) return false;
    if (why === 'danger' && (h.rank < 1 || (h.rank < 2 && Math.random() < 0.5))) return false;
    usePower(h, it);
    h.wardUntil = fl.time + 3; h.wardK = Math.min(0.4, 0.25 + 0.05 * (it.r - 1)) * Math.min(1, itemPow(h));
    fl.stats.charms++; tl('pw', h.id, 'charm'); say(h, pick(SAY.charmUse), 3); floatHero(h, 'Talizman', '#7fb8ff', 13, -0.7);
    return true;
  }
  // Amulet: when the nerves are about to go, it takes a chunk of fear away (12% of courage at the first level, +4% a level)
  // and dulls new fear for 4 s. Rookies reach for it late (at 85% of what makes them run), veterans at 70%, elites at 60%.
  function useAmulet(h) {
    if (h.dead || fl.time < h.calmUntil) return false;
    const it = powerReady(h, 'amulet'); if (!it) return false;
    usePower(h, it);
    const alt = inB('altar', h.room);   // a blasphemous altar smothers holy amulets too
    h.fear = Math.max(0, h.fear - (0.08 + 0.04 * Math.min(4, it.r)) * itemPow(h) * (alt ? 0.5 : 1) * h.courage); h.calmUntil = fl.time + (alt ? 2 : 4);
    if (alt) fl.stats.altarBlocks = (fl.stats.altarBlocks || 0) + 1;
    fl.stats.amulets++; tl('pw', h.id, 'amulet'); say(h, pick(SAY.amuletUse), 3); floatHero(h, 'Amulet', '#c3b2ff', 13, -0.7);
    const p = heroPos(h); particles.push({ ring: true, x: p.x, y: p.y, r: 0.2, maxR: 1.3, life: 0.45, color: '#c3b2ff' });
    return true;
  }
  // Boots: a 3 s sprint, for running out (with or without the crystal), dashing past a known trap, or finding the others.
  function useBoots(h, why) {
    if (h.dead || fl.time < h.sprintUntil) return false;
    const it = powerReady(h, 'boots'); if (!it) return false;
    usePower(h, it);
    h.sprintUntil = fl.time + 3; h.sprintK = 1 + (0.3 + 0.1 * Math.min(3, it.r)) * Math.min(1, itemPow(h));
    fl.stats.boots++; tl('pw', h.id, 'boots'); if (why !== 'quiet') say(h, pick(SAY.bootsUse), 2);
    return true;
  }
  /* ----- a room they know is deadly: stop at the door, prepare, then rush through ----- */
  // Known threat in a room: traps they know about (wall traps count for the room they face) and monsters they can see.
  function roomThreat(r) {
    let t = 0;
    fl.items.forEach(it => {
      if (LOOKS_TRAP(it.type) && it.detected && !it.disabled && !(it.jamUntil > fl.time) && slotRoom(it.type, it.x, it.y) === r) t += SCARE[it.type] ? 0.7 : 1;
      else if (MONSTERS[it.type] && it.hp > 0 && fl.known[it.y * WW + it.x] && roomOf(it.x, it.y) === r) t += 1.5;
    });
    return t;
  }
  function checkPrep(L) {
    const P = fl.party;
    if (fl.fearless || goingOut() || L.lvl < 3 || !L.path.length || fl.time < P.prepCd) return;
    const cur = roomOf(L.tx, L.ty);
    for (let i = 0; i < Math.min(5, L.path.length); i++) {
      const r = roomOf(L.path[i][0], L.path[i][1]);
      if (r < 0 || r === cur || fl.rooms[r].kind !== 'room') continue;
      if (!P.prepped.has(r) && roomThreat(r) >= 3) startPrep(r);
      return;
    }
  }
  function startPrep(r) {
    const P = fl.party, crew = alive().filter(h => !h.lost && !caged(h) && !h.fleeing && !h.gone);
    if (!crew.length) return;
    P.prepped.add(r); fl.stats.preps++;
    const dur = 2.4, find = (t, lv, extra) => crew.find(h => h.type === t && h.lvl >= lv && (!extra || extra(h)));
    const pr = find('priest', 3, h => h.faith >= 2), mg = find('mage', 5, h => fl.time >= (h.jamCd || 0)), th = find('thief', 4), wr = find('warrior', 3);
    P.prep = { room: r, until: fl.time + dur, pr: pr ? pr.id : -1, mg: mg ? mg.id : -1, th: th ? th.id : -1, wr: wr ? wr.id : -1 };
    P.talkUntil = Math.max(P.talkUntil, fl.time + dur);
    const L = leader(), lines = [[L, pick(SAY.prepStart)]];
    if (pr) lines.push([pr, pick(SAY.prepWard)]); if (mg) lines.push([mg, pick(SAY.prepJam)]); if (th) lines.push([th, pick(SAY.prepDisarm)]); if (wr) lines.push([wr, pick(SAY.prepShield)]);
    lines.forEach((l, i) => P.queueSay.push({ id: l[0].id, text: l[1], at: fl.time + i * 0.5 }));
    crew.forEach(h => {   // experienced heroes drink up before walking into it
      if (h.lvl < 4 || h.hp >= 0.7 * h.max) return;
      const pot = h.inv.filter(x => x.type === 'potion').sort((a, c) => c.r - a.r)[0];
      if (pot) { h.inv.splice(h.inv.indexOf(pot), 1); h.hp = Math.min(h.max, h.hp + h.max * potionHeal(pot) * itemPow(h)); fl.stats.potions++; fl.stats.itemsUsed++; floatHero(h, 'Mikstura', '#8be38f', 14, -0.7); }
    });
    tl('pp', r, pr ? 1 : 0, mg ? 1 : 0, th ? 1 : 0, wr ? 1 : 0);
  }
  function finishPrep() {
    const P = fl.party, pp = P.prep, r = pp.room, R = fl.rooms[r];
    P.prep = null; P.prepCd = fl.time + 4;
    const ok = id => { const h = byId(id); return h && !h.dead && !h.fled && !h.gone && !caged(h) && !h.fleeing ? h : null; };
    const pr0 = ok(pp.pr), mg = ok(pp.mg), th = ok(pp.th), wr = ok(pp.wr);
    const pr = pr0 && pr0.faith >= 2 ? pr0 : null;
    if (pr0 && !pr) { say(pr0, pick(SAY.faithLow), 3); fl.stats.faithOut++; }
    alive().forEach(o => { if (!o.lost && !caged(o) && !o.fleeing) useCharm(o, 'prep'); });   // talismans on before the rush
    if (pr) {   // a ward on everyone, stronger with the priest's level (half as strong under a blasphemous altar); it costs 2 faith
      pr.faith -= 2;
      const alt = inB('altar', r);
      const frac = (0.15 + 0.012 * pr.lvl) * (alt ? 0.5 : 1), brave0 = Math.pow(0.85, 1 + pr.lvl / 5), brave = alt ? 1 - (1 - brave0) / 2 : brave0;
      alive().forEach(o => { o.shield = Math.max(o.shield, o.max * frac); o.braveUntil = fl.time + 10; o.braveK = brave; });
      if (alt) { say(pr, pick(SAY.bAltar), 4); fl.stats.altarBlocks = (fl.stats.altarBlocks || 0) + 1; }
      if (pr.lvl >= 6) {
        fl.items.forEach(m => { if ((m.type === 'ghost' || m.type === 'shade') && m.hp > 0 && roomOf(m.x, m.y) === r) { hurtMonster(m, 40 * pr.R.pow * (alt ? 0.5 : 1)); burst(m.gx || m.x + 0.5, m.gy || m.y + 0.5, '#fff2c0', 12); } });   // exorcism (half as strong at the altar)
        let nb = 2 + Math.floor((pr.lvl - 6) / 2);   // and a few known portraits there lose their curse for this wave (half as many at the altar)
        if (alt) nb = Math.max(1, Math.floor(nb / 2));
        fl.items.forEach(it => { if (nb <= 0 || !CURSED[it.type] || !it.detected || it.disabled || slotRoom(it.type, it.x, it.y) !== r) return; nb--; it.disabled = true; fl.stats.blessed++; bt(it.type).disarmed++; floatTile(it.x, it.y, 'Odczyniony', '#fff2c0', 13); });
        fl.threatDirty = true;
      }
      fl.stats.wards++; const p = heroPos(pr); particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 3.5, life: 0.5, color: '#7fb8ff' }); floatHero(pr, 'Osłona!', '#7fb8ff', 14, -0.8);
    }
    if (mg && inB('rune', r)) {   // the rune stone swallows the spell
      mg.jamCd = fl.time + 12; fl.stats.runeBlocks = (fl.stats.runeBlocks || 0) + 1;
      say(mg, pick(SAY.bRune), 4); floatTile((R.x0 + R.x1) >> 1, (R.y0 + R.y1) >> 1, 'Runa tłumi czar', '#9fd0ff', 14, -0.6);
    } else if (mg) {   // every trap in that room goes quiet for a few seconds
      const dur = 2 + 0.25 * mg.lvl;
      fl.items.forEach(it => { if (TRAPS[it.type] && slotRoom(it.type, it.x, it.y) === r) it.jamUntil = fl.time + dur; });
      mg.jamCd = fl.time + 12; fl.stats.jams++; fl.threatDirty = true;
      fxTiles(R.tiles, '170,120,255', Math.min(dur, 3)); floatTile((R.x0 + R.x1) >> 1, (R.y0 + R.y1) >> 1, 'Pułapki zakłócone!', '#c3b2ff', 15, -0.6);
    }
    if (th) {   // the thief takes apart what he can reach from the doorway
      let k = 1 + Math.floor((th.lvl - 4) / 4);
      fl.items.forEach(it => {
        if (k <= 0 || !DISARMABLE[it.type] || !it.detected || it.disabled || slotRoom(it.type, it.x, it.y) !== r) return;
        k--; fl.stats.prepDisarms++;
        if (it.type === 'decoy') { decoyAlarm(it, th); return; }
        if (Math.random() < th.R.fail && it.cd <= 0) { fl.stats.disarmFails++; fire(it, 1); return; }
        if (rigged(it)) return;
        if (Math.random() < th.R.sapper) { fl.items.delete(key(it.x, it.y)); fl.stats.sapped++; bt(it.type).sapped = (bt(it.type).sapped || 0) + 1; floatTile(it.x, it.y, 'Rozmontowane!', '#ff9a9a', 14); }
        else { it.disabled = true; floatTile(it.x, it.y, 'Rozbrojone', '#a69bbb', 13); }
        fl.stats.disarmed++; bt(it.type).disarmed++; fl.threatDirty = true;
      });
    }
    if (wr) { wr.shieldUpUntil = fl.time + 5; wr.shieldCd = fl.time + 5 + wr.R.shieldCd; fl.stats.shields++; }
    P.rushUntil = fl.time + 6;
    const L = leader(); if (L) say(L, pick(SAY.rush), 3);
    alive().forEach(h => { h.needPlan = true; if (h.state === 'talk') h.state = 'walk'; });
    P.talkUntil = fl.time;
    tl('pf', r);
  }
  function isFrontierTile(i) {
    const x = i % WW, y = (i / WW) | 0;
    if (!fl.known[i]) return false;
    for (const d of DIRS) { const nx = x + d[0], ny = y + d[1], ni = ny * WW + nx; if (!fl.known[ni] && (tileAt(nx, ny) === FLOOR || tileAt(nx, ny) === DOOR)) return true; }
    return false;
  }
  function randomKnownFar(h) {
    let best = -1, bd = -1;
    for (let k = 0; k < 40; k++) {
      const x = rand(1, WW - 2), y = rand(1, WH - 2), i = y * WW + x;
      if (!fl.known[i] || !passable(x, y)) continue;
      const d = Math.hypot(x - h.tx, y - h.ty) - 0.3 * Math.hypot(x - fl.ent.x, y - fl.ent.y);
      if (d > bd) { bd = d; best = i; }
    }
    return best;
  }
  function nearestOf(b, list) { let best = -1, bd = 1e9; list.forEach(i => { const d = b.dist[i]; if (d >= 0 && d < bd) { bd = d; best = i; } }); return best; }
  // One hero decides what to do next and finds a path there (only through tiles the party knows).
  function planHero(h) {
    h.needPlan = false; h.thinkT = 0.45 + Math.random() * 0.3;
    if (h.gone || caged(h)) { h.path = []; return; }
    const P = fl.party, L = leader();
    let goal = -1, intent = 'follow', noDanger = false, b = null;
    const B = () => b || (b = bfs(h.x, h.y, { known: true, noDanger, avoid: h.R.avoid * (h.fleeing ? 0.6 : 1) * (h.trait === 'careful' ? 1.3 : h.trait === 'greedy' ? 0.85 : 1) }));
    planB = null;
    const exitG = () => { planB = B(); return exitGoal(); };
    // the heart, or (when rumours told them where it is but not how to get there) the opening that looks closest to it
    const heartGoal = () => {
      const g = nearestOf(B(), heartGoals()); if (g >= 0) return g;
      let best = -1, bs = 1e9;
      frontier().forEach(f => { const d = B().dist[f]; if (d < 0) return; const sc = d + 0.6 * (Math.abs(f % WW - fl.heart.x) + Math.abs(((f / WW) | 0) - fl.heart.y)); if (sc < bs) { bs = sc; best = f; } });
      return best;
    };
    if (panicking(h)) { intent = 'panic'; noDanger = true; goal = h.fleeing ? exitG() : randomKnownFar(h); }
    else if (exiting(h)) { intent = h.crystal ? 'carry' : 'exit'; goal = exitG(); }
    else if (fl.fearless && P.plan === 'assault') { intent = 'heart'; goal = heartGoal(); }
    else if (P.plan === 'retreat' && !h.lost) {
      intent = 'retreat';
      if (roomOf(h.tx, h.ty) === P.retreatRoom) { h.state = 'rest'; h.path = []; h.intent = intent; return; }
      const R = fl.rooms[P.retreatRoom];
      goal = nearestOf(B(), R.tiles.filter(t => walkable(t[0], t[1])).map(t => t[1] * WW + t[0]));
    } else if (h.lost) {
      intent = 'lost';
      const lt = L ? tIdx(L) : -1;
      if (lt >= 0 && B().dist[lt] >= 0 && B().dist[lt] < 14 && Math.random() < 0.5) goal = lt;   // he hears their voices and follows them
      else {   // otherwise he wanders: through some door of this room, or into the unknown
        const R = h.room >= 0 ? fl.rooms[h.room] : null;
        const doors = R ? R.doors.filter(d => !d.entrance && !(d.x === h.x && d.y === h.y)).map(d => d.y * WW + d.x).filter(i => B().dist[i] > 0) : [];
        if (doors.length && Math.random() < 0.65) goal = pick(doors);
        else { const fr = frontier(); goal = fr.length && Math.random() < 0.6 ? nearestOf(B(), fr) : randomKnownFar(h); }
      }
    } else if (h.wanderUntil > fl.time && h.wanderTarget >= 0 && isFrontierTile(h.wanderTarget)) {
      intent = 'wander'; goal = h.wanderTarget;
    } else {
      let job = null;
      // a friend in a cage
      if (P.rescueId >= 0 && P.rescueId !== h.id) {
        const c = byId(P.rescueId);
        if (c && caged(c)) {
          let rs = byId(P.rescuerId);
          if (!rs || rs.dead || rs.fled || rs.gone || caged(rs) || rs.fleeing) {
            const cand = alive().filter(o => o !== c && !caged(o) && !o.fleeing).sort((a, o) => ((o.type === 'thief') - (a.type === 'thief')) || (hdist(a, c) - hdist(o, c)));
            rs = cand[0]; P.rescuerId = rs ? rs.id : -1;
          }
          if (rs === h) {
            if (Math.abs(h.x - c.x) + Math.abs(h.y - c.y) <= 1) { h.state = 'free'; h.timer = h.type === 'thief' ? 0.8 : 1.8; h.dur = h.timer; h.freeT = c.id; h.path = []; h.intent = 'rescue'; return; }
            const g = nearestOf(B(), DIRS.map(d => [c.x + d[0], c.y + d[1]]).filter(t => walkable(t[0], t[1])).map(t => t[1] * WW + t[0]));
            if (g >= 0) job = { intent: 'rescue', goal: g };
          }
        }
      }
      if (!job && L && L !== h && L.state === 'fight' && L.foe && L.foe.hp > 0 && !DRIFT[L.foe.type]) job = { intent: 'fight', goal: L.foe.y * WW + L.foe.x };
      if (!job && h.type === 'priest') {
        const hurt = alive().filter(o => o !== h && o.hp < 0.5 * o.max && hdist(o, h) > 2.5).sort((a, c) => a.hp / a.max - c.hp / c.max)[0];
        if (hurt && B().dist[tIdx(hurt)] >= 0 && B().dist[tIdx(hurt)] <= 12) job = { intent: 'heal', goal: tIdx(hurt) };
      }
      if (!job && h.type === 'thief') job = disarmJob(h, B());
      if (!job && h.type === 'priest' && h.rank >= 1) job = blessJob(h, B());
      if (!job) job = bombJob(h, B());
      if (!job) {
        let best = -1, bd = 1e9;
        fl.items.forEach(it => {
          if (!isLoot(it.type) || it.seenWave !== run.wave || it.cursedKnown) return;
          const i = it.y * WW + it.x, d = B().dist[i], r = lootLevel(it);
          const reach = r === 3 ? 30 : r === 2 ? 16 : (LOOT_KIND[it.type] === 'potion' && h.hp < 0.5 * h.max ? 14 : h.type === 'thief' ? 10 : h.rank === 0 ? 8 : 6);
          if (d >= 0 && d <= reach && d < bd && lootDecision(h, it, B(), i)) { bd = d; best = i; }
          else if (d < 0 && r === 3 && h.type !== 'priest') {   // legendary in an unknown spot: head for the nearest opening towards it
            const fr = frontier().filter(f => Math.hypot(f % WW - it.x, ((f / WW) | 0) - it.y) < 8);
            const g = nearestOf(B(), fr); if (g >= 0 && B().dist[g] < bd) { bd = B().dist[g]; best = g; }
          }
        });
        if (best >= 0) job = { intent: 'loot', goal: best };
      }
      if (!job && h.type === 'warrior') {   // rookies charge anything; veterans pick fights they can win or must fight
        let best = -1, bd = 1e9, skip = null;
        fl.items.forEach(m => {
          if (!MONSTERS[m.type] || DRIFT[m.type] || m.hp <= 0 || roomOf(m.x, m.y) !== h.room) return;
          const i = m.y * WW + m.x, d = B().dist[i];
          const smart = h.rank === 0 || m.type === 'archer' || (h.hp > 0.6 * h.max && m.type !== 'ogre');
          if (!smart) { skip = m; return; }
          if (d > 0 && d <= 6 && d < bd) { bd = d; best = i; }
        });
        if (best >= 0) { job = { intent: 'fight', goal: best }; if (h.intent !== 'fight') say(h, pick(SAY.fight), 2); }
        else if (skip && h.intent !== 'avoid' && Math.random() < 0.3) { say(h, pick(SAY.avoid), 2); h.intent = 'avoid'; }
      }
      if (!job && P.scoutId === h.id && h.scoutTarget >= 0) job = { intent: 'scout', goal: h.scoutTarget };
      if (job) { intent = job.intent; goal = job.goal; }
      else if (h === L) {
        const dt = P.detour;
        if (dt && (fl.time > dt.until || tIdx(h) === dt.goal || B().dist[dt.goal] < 0)) { P.detour = null; if (tIdx(h) === dt.goal) say(h, pick(SAY.detourBack), 2); }
        const sc = P.searchId >= 0 ? byId(P.searchId) : null;
        if (P.detour) { intent = 'detour'; goal = P.detour.goal; }   // a wrong turn: the whole party follows him
        else if (sc && sc.lost && B().dist[tIdx(sc)] >= 0) { intent = 'search'; goal = tIdx(sc); }   // back for the lost one
        else if (P.plan === 'assault') { intent = 'heart'; goal = heartGoal(); if (h.intent !== 'heart') say(h, pick(SAY.assault), 2); }
        else { intent = 'lead'; goal = P.target; }
      } else if (L) {
        intent = 'follow';
        const lt = tIdx(L), d = B().dist[lt];
        const gap = h.type === 'priest' || h.type === 'mage' ? 3.5 : 2.5;   // the back line keeps a step behind
        if (d >= 0 && d <= gap && L.state !== 'boss') { h.intent = intent; h.path = []; h.state = 'wait'; h.timer = 0.35; return; }
        goal = (L.state === 'boss' || P.plan === 'assault') && !P.detour && P.searchId < 0 ? heartGoal() : lt;
        if (goal < 0) goal = lt;
      }
    }
    h.intent = intent;
    if (goal < 0) { h.path = []; return; }
    const bb = B();
    if (bb.dist[goal] < 0) {
      if (intent === 'exit' || intent === 'carry' || intent === 'panic') {   // on the way out they will find a way, known or not
        const b2 = bfs(h.x, h.y, { noDanger: true }), g2 = nearestOf(b2, exitGoals());
        if (g2 >= 0) { h.path = pathFrom(b2, g2); h.blocked = -1; return; }
      }
      h.path = []; h.blocked = fl.time; return;
    }
    h.blocked = -1;
    h.path = pathFrom(bb, goal);
    h.noPathT = 0;
  }
  // The thief deals with known traps that still sit on the leader's way. Rookies are slow and sometimes set them off.
  function disarmJob(h, b) {
    if (fl.fearless || panicking(h)) return null;
    const L = leader(), way = new Set((L && L.path.length ? L.path : h.path).map(p => key(p[0], p[1])));
    let tBest = null, tSpot = -1, tCost = 1e9;
    fl.items.forEach(it => {
      if (!DISARMABLE[it.type] || !it.detected || it.disabled) return;
      if (!areaOf(it).some(t => way.has(key(t[0], t[1])))) return;
      if (fl.heroes.some(o => o !== h && o.disarmT === it && !o.dead)) return;
      const bias = it.type === 'decoy' ? -4 : 0;   // the decoy looks like the juiciest mechanism in the room
      disarmSpots(it).forEach(t => { const i = t[1] * WW + t[0], d = b.dist[i]; if (d >= 0 && d + bias < tCost) { tCost = d + bias; tBest = it; tSpot = i; } });
    });
    h.disarmT = tBest;
    if (!tBest) return null;
    if (tCost <= 0 && b.dist[tSpot] === 0) {
      h.state = 'disarm'; h.timer = (tBest.type === 'arrows' || tBest.type === 'fire' || tBest.type === 'powder' ? 1.5 : 1.0) * mods.disarm * h.R.disarm * (isRt(h.room, 'swamp') ? 1.5 : 1);   // knee-deep in a swamp it takes longer
      h.dur = h.timer; h.item = tBest; h.path = []; say(h, pick(SAY.disarm), 3);
      return { intent: 'disarm', goal: -1 };
    }
    return { intent: 'disarm', goal: tSpot };
  }
  // An experienced priest lifts the curse from a known portrait near their way.
  function blessJob(h, b) {
    if (fl.fearless || panicking(h) || h.faith < 1) return null;   // lifting a curse off a portrait costs 1 faith
    const L = leader(); if (!L) return null;
    const lp = heroPos(L);
    let tBest = null, tSpot = -1, tCost = 1e9;
    fl.items.forEach(it => {
      if (!CURSED[it.type] || !it.detected || it.disabled || Math.hypot(it.x - lp.x, it.y - lp.y) > 8) return;
      if (fl.heroes.some(o => o !== h && o.disarmT === it && !o.dead)) return;
      disarmSpots(it).forEach(t => { const i = t[1] * WW + t[0], d = b.dist[i]; if (d >= 0 && d < tCost) { tCost = d; tBest = it; tSpot = i; } });
    });
    h.disarmT = tBest;
    if (!tBest) return null;
    if (tCost === 0) { const alt = inB('altar', slotRoom(tBest.type, tBest.x, tBest.y)); h.faith--; h.state = 'disarm'; h.timer = 1.5 * h.R.disarm * (alt ? 2 : 1); h.dur = h.timer; h.item = tBest; h.path = []; say(h, pick(alt ? SAY.bAltar : SAY.bless), 3); if (alt) fl.stats.altarBlocks = (fl.stats.altarBlocks || 0) + 1; return { intent: 'bless', goal: -1 }; }
    return { intent: 'bless', goal: tSpot };
  }
  // Anyone with a bomb throws it at a known trap blocking the leader's way, from up to 3 tiles.
  function bombJob(h, b) {
    const bomb = h.inv.find(it => it.type === 'bomb');
    if (!bomb || fl.fearless || panicking(h)) return null;
    const L = leader(); if (!L || !L.path.length) return null;
    const way = new Set(L.path.slice(0, 8).map(p => key(p[0], p[1])));
    for (const it of fl.items.values()) {
      if (!TRAPS[it.type] || !it.detected || it.disabled || it.type === 'gate' || CURSED[it.type]) continue;
      if (!areaOf(it).some(t => way.has(key(t[0], t[1])))) continue;
      if (Math.hypot(it.x - h.tx, it.y - h.ty) <= 3) {
        h.inv.splice(h.inv.indexOf(bomb), 1); fl.stats.bombs++; fl.stats.itemsUsed++;
        if (it.type === 'powder') fire(it, 0.5);
        else { it.disabled = true; fl.threatDirty = true; bt(it.type).disarmed++; }
        burst(it.x + 0.5, it.y + 0.5, '#ffb35c', 14); floatTile(it.x, it.y, 'Zniszczone bombą', '#ffb35c', 13, -0.5); say(h, pick(SAY.bomb), 3);
        return null;
      }
      const g = nearestOf(b, areaOf(it).map(t => t[1] * WW + t[0]).concat(disarmSpots(it).map(t => t[1] * WW + t[0])));
      if (g >= 0) return { intent: 'bomb', goal: g };
    }
    return null;
  }
  // Priest heals, puts out fires, raises a barrier and burns ghosts with holy light; mage burns monsters and clears webs.
  function heroAbilities(h, dt) {
    if (h.type !== 'priest' && h.type !== 'mage') return;
    h.cast -= dt; h.barrierCd -= dt; h.dispelCd -= dt;
    if (h.type === 'priest') {   // faith: a small pool (6 + level/2) that refills slowly (+1 every 12 s); every prayer spends it
      h.faithT += dt; if (h.faithT >= 12) { h.faithT -= 12; if (h.faith < h.faithMax) h.faith++; }
      if (h.faith >= 2) h.faithSaid = false;
    }
    const p = heroPos(h);
    if (h.type === 'mage' && h.dispelCd <= 0 && !panicking(h)) {
      const z = fl.zones.find(zz => alive().some(o => hdist(o, h) <= 4 && zz.keys.has(key(o.tx, o.ty))));
      if (z) { z.until = fl.time; alive().forEach(o => { if (z.keys.has(key(o.tx, o.ty))) o.slowUntil = fl.time; }); h.dispelCd = 8; fl.stats.dispels++; say(h, pick(SAY.dispel), 3); fxTiles(z.tiles, '200,180,255', 0.3); }
    }
    if (h.cast > 0) return;
    if (h.type === 'priest') {
      h.cast = 1;   // looks around every second; a prayer takes 3
      let healed = 0, cleansed = false;
      const alt = inB('altar', h.room), ak = alt ? 0.5 : 1;   // a blasphemous altar halves every power of the priest
      const near = alive().filter(o => { const q = heroPos(o); return Math.hypot(q.x - p.x, q.y - p.y) <= 3; });
      const spend = n => {
        if (h.faith >= n) { h.faith -= n; return true; }
        if (!h.faithSaid) { h.faithSaid = true; say(h, pick(SAY.faithLow), 3); fl.stats.faithOut++; tl('fo', h.id); }
        return false;
      };
      // holy light burns ghosts close by (free, part of every prayer)
      const ghosts = [...fl.items.values()].filter(m => DRIFT[m.type] && m.hp > 0 && Math.hypot(m.gx - p.x, m.gy - p.y) <= 3);   // ghosts, shades and bats
      // a curse on a friend (level 4+): 3 faith
      const cu = h.lvl >= 4 && h.faith >= 3 ? near.find(o => o.cursed) : null;
      if (cu && spend(3)) {
        cu.cursed = false; fl.stats.curseLifts++; tl('cl', h.id, cu.id); h.cast = 3;
        say(h, nameFill(pick(SAY.curseLift), cu), 3); floatHero(cu, 'Klątwa zdjęta', '#fff2c0', 13, -0.7);
        particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 2, life: 0.45, color: '#fff2c0' });
        return;
      }
      // heal when it matters (someone under 75%, or a lot of wounds around) or put out a fire: 1 faith
      const worst = near.reduce((a, o) => Math.min(a, o.hp / o.max), 1), missing = near.reduce((a, o) => a + (o.max - o.hp), 0);
      const burning = near.some(o => fl.time < o.burnUntil);
      if ((burning || worst < 0.75 || missing > 0.6 * h.max) && spend(1)) {
        h.cast = 3;
        near.forEach(o => {
          if (fl.time < o.burnUntil) { o.burnUntil = fl.time; cleansed = true; return; }   // putting out a fire takes the heal
          if (o.hp < o.max) { const a = Math.min(22 * h.R.pow * ak, o.max - o.hp); o.hp += a; healed += a; }
        });
      }
      if (ghosts.length && (h.cast === 3 || h.faith > 0)) { h.cast = 3; ghosts.forEach(m => { hurtMonster(m, 25 * h.R.pow * ak); burst(m.gx, m.gy, '#fff2c0', 8); }); }
      if (alt && healed > 0) { fl.stats.altarHeals = (fl.stats.altarHeals || 0) + 1; if (Math.random() < 0.25) say(h, pick(SAY.bAltar), 2); }
      if (cleansed) { fl.stats.cleanses++; say(h, pick(SAY.cleanse), 3); }
      // a barrier for everyone around (ambush, or someone close to dying): 3 faith
      if (h.barrierCd <= 0 && near.length >= 2 && (fl.time - fl.party.ambushT < 2 || near.some(o => o.hp < 0.45 * o.max)) && h.faith >= 3 && spend(3)) {
        near.forEach(o => { o.shield = Math.max(o.shield, 12 * h.R.pow * ak); }); h.barrierCd = 14; fl.stats.barriers++; say(h, pick(SAY.barrier), 3); h.cast = 3;
        particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 3, life: 0.5, color: '#7fb8ff' });
      }
      if (healed > 0) {
        const pts = addPts(healed / h.max * GZ.heal * depthMult(h.room), 'healPts', h); fl.stats.healed += healed; fl.stats.heals++;
        if (!cleansed) say(h, pick(SAY.heal), 1);
        floatHero(h, 'Leczenie +' + fmtE(pts), '#ff7a86', 14, -0.5);
        particles.push({ ring: true, x: p.x, y: p.y, r: 0.3, maxR: 3, life: 0.45, color: '#8be38f' });
      }
      return;
    }
    let target = null, bd = 4.5;
    fl.items.forEach(m => {
      if (!MONSTERS[m.type] || m.hp <= 0 || roomOf(m.x, m.y) !== h.room) return;
      if (m.type === 'shade' || (m.type === 'ghost' && mods.ghostPriestOnly)) return;   // only a priest touches a shade
      const mx = DRIFT[m.type] ? m.gx : m.x + 0.5, my = DRIFT[m.type] ? m.gy : m.y + 0.5;
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < bd) { bd = d; target = m; }
    });
    if (!target) { h.cast = 0.5; return; }
    h.cast = 4;
    const tx = DRIFT[target.type] ? target.gx : target.x + 0.5, ty = DRIFT[target.type] ? target.gy : target.y + 0.5;
    fxLine(p.x, p.y, tx, ty, 0.3, '255,150,60');
    const area = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tileAt(Math.floor(tx) + dx, Math.floor(ty) + dy) === FLOOR) area.push([Math.floor(tx) + dx, Math.floor(ty) + dy]);
    fxTiles(area, '255,140,50', 0.45);
    say(h, pick(SAY.fireball), 1);
    if (DRIFT[target.type]) hurtMonster(target, 30 * h.R.pow);
    area.forEach(t => { const m = fl.items.get(key(t[0], t[1])); if (m && MONSTERS[m.type] && !DRIFT[m.type]) hurtMonster(m, 30 * h.R.pow); });
  }
  function heroTile(h) { return (h.nx !== null && h.prog >= 0.5) ? [h.nx, h.ny] : [h.x, h.y]; }
  const RT_SAY = { fog: 'rtFog', swamp: 'rtSwamp', grotto: 'rtGrotto', crypt: 'rtCrypt', vault: 'rtVault' };
  function onEnter(h) {
    const P = fl.party;
    const r = roomOf(h.x, h.y), changed = r >= 0 && r !== h.enteredRoom;
    if (r >= 0) { h.room = r; h.enteredRoom = r; }
    reveal(h);
    if (r >= 0 && fl.rooms[r].kind === 'room') {
      if (!fl.rooms[r].visited) { fl.rooms[r].visited = true; fl.stats.roomsVisited++; }
      const rt = fl.rooms[r].rt;   // the first one into a room with a character says what it is
      if (rt && !exiting(h) && !(fl.rtSaid || (fl.rtSaid = new Set())).has(r)) { fl.rtSaid.add(r); say(h, pick(SAY[RT_SAY[rt]]), 3); }
      if (changed && h.id === P.leaderId) maybeDetour(h, r);
      if (changed && !exiting(h)) phobiaSight(h, r);
    }
    if (isExitTile(h.x, h.y) && exiting(h)) { heroExit(h); return; }
    const it = fl.items.get(key(h.x, h.y));
    if (it && isLoot(it.type) && !h.crystal && !h.fleeing && !mods.noPickup) pickup(h, it);
    if (P.plan === 'retreat' && !h.lost && r === P.retreatRoom && !panicking(h) && !exiting(h)) { h.state = 'rest'; h.path = []; return; }
    if (P.plan === 'assault' && !exiting(h) && Math.abs(h.x - fl.heart.x) + Math.abs(h.y - fl.heart.y) === 1 && !panicking(h)) { h.state = 'boss'; h.path = []; return; }
    // veterans time their run through a known trap while it reloads
    if (h.rank >= 1) fl.items.forEach(t => {
      if (!TRAPS[t.type] || !t.detected || t.disabled || t.cd <= 0.3 || h.saidTiming.has(t)) return;
      if (areaOf(t).some(q => q[0] === h.x && q[1] === h.y)) { h.saidTiming.add(t); fl.stats.timing++; say(h, pick(SAY.timing), 2); }
    });
    if (r >= 0 && fl.rooms[r].rumored && !h.rumorSaid && Math.random() < 0.5) { h.rumorSaid = true; say(h, pick(SAY.rumor), 1); }
    // an experienced mage feels the magic of every trap in a room the moment she walks in
    if (h.type === 'mage' && h.R.sight && r >= 0 && fl.rooms[r].kind === 'room' && !fl.rooms[r].sensed && !exiting(h) && !inB('rune', r) && !inB('veil', r) && !isRt(r, 'fog')) {
      fl.rooms[r].sensed = true; let n = 0;
      fl.items.forEach(t => { if (LOOKS_TRAP(t.type) && !t.detected && !t.disabled && roomOf(t.x, t.y) === r) { learnTrap(t, 'scan', null); fl.stats.detected++; n++; floatTile(t.x, t.y, 'Wyczuta!', '#c3b2ff', 13, -0.6); } });
      if (n) { fl.stats.sensed = (fl.stats.sensed || 0) + n; say(h, pick(SAY.sense), 3); }
    }
    h.needPlan = true;
  }
  function inZone(x, y) { const k = key(x, y); return fl.zones.some(z => z.keys.has(k)); }
  function scanTraps(h) {
    const am = gearR(h, 'amulet');
    const R = (h.type === 'thief' ? 2 : 0) + h.R.detect + Math.max(0, Math.round(am * itemPow(h)));
    if (R <= 0) return;
    fl.items.forEach(it => {
      if (!LOOKS_TRAP(it.type) || it.detected || it.disabled) return;
      if (Math.max(Math.abs(it.x - h.tx), Math.abs(it.y - h.ty)) > R) return;
      if (isRt(slotRoom(it.type, it.x, it.y), 'fog')) return;   // Mgła: nothing to see in there
      learnTrap(it, 'scan', h); fl.stats.detected++;
      floatTile(it.x, it.y, 'Wykryta!', '#ffe066', 13, -0.6);
    });
  }
  function updateHero(h, dt) {
    const P = fl.party;
    if (h.gone) { if (fl.time >= h.fallUntil) landFallen(h); return; }
    if (h.flash > 0) h.flash -= dt;
    h.accT += dt;
    if (h.accT >= 0.6) { if ((h.accG || 0) >= 0.1) floatHero(h, '+' + fmtG(h.accG), '#c3b2ff', 13); h.acc = 0; h.accG = 0; h.accT = 0; }   // 1.01: Groza (violet)
    const ot = heroTile(h); h.tx = ot[0]; h.ty = ot[1];
    const rr = roomOf(h.tx, h.ty); if (rr >= 0) h.room = rr;
    if (fl.time < h.burnUntil) { damage(h, 6 * S.dmg * dt, BURN); if (h.dead) return; }
    if (h.hp < h.R.potion * h.max) {   // a potion when it gets bad (rookies wait far too long)
      const pot = h.inv.filter(x => x.type === 'potion').sort((a, c) => c.r - a.r)[0];
      if (pot) { h.inv.splice(h.inv.indexOf(pot), 1); h.hp = Math.min(h.max, h.hp + h.max * potionHeal(pot) * itemPow(h)); fl.stats.potions++; fl.stats.itemsUsed++; say(h, pick(SAY.potion), 3); floatHero(h, 'Mikstura', '#8be38f', 14, -0.7); tl('po', h.id); }
    }
    heroAbilities(h, dt);
    if (inZone(h.tx, h.ty)) h.slowUntil = Math.max(h.slowUntil, fl.time + 0.15);
    // v14: fear always fades by a steady amount (level-based), half as fast alone, lost or caged, slower right after a wound,
    // after a death (shaken) and under a curse
    if (!h.fleeing && h.fear > 0) h.fear = Math.max(0, h.fear - h.R.calm * mods.calmK * dt * (h.alone || h.lost || caged(h) ? 0.5 : 1) * (fl.time - h.hurtAt < 1.5 ? 0.5 : 1) * (fl.time < h.shakenUntil ? 0.35 : 1) * (h.cursed ? 0.5 : 1));
    h.scan -= dt;
    if (h.scan <= 0) { h.scan = 0.5; scanTraps(h); }
    h.thinkT -= dt;
    if (caged(h)) { if (fl.time >= h.cageUntil) cageEnds(h); return; }
    if (h.state === 'rest') {
      if (fl.time >= h.burnUntil) h.hp = Math.min(h.max, h.hp + 4 * dt);
      if (P.plan !== 'retreat' || panicking(h) || exiting(h)) { h.state = 'walk'; h.needPlan = true; }
      return;
    }
    if (h.state === 'disarm') {
      h.timer -= dt;
      if (exiting(h)) { h.state = 'walk'; h.item = null; h.disarmT = null; h.needPlan = true; return; }
      if (h.timer <= 0) {
        const it = h.item;
        if (it && fl.items.get(key(it.x, it.y)) === it && !it.disabled && it.type === 'decoy') { decoyAlarm(it, h); tl('ds', h.id, it.type, it.x, it.y, 0); }
        else if (it && fl.items.get(key(it.x, it.y)) === it && !it.disabled) {
          if (!CURSED[it.type] && Math.random() < h.R.fail && it.cd <= 0) {   // a rookie's hand slips
            fl.stats.disarmFails++; say(h, pick(SAY.disarmFail), 3); tl('df', h.id, it.type, it.x, it.y); fire(it, 1);
          } else if (rigged(it)) {
            say(h, pick(SAY.disarmFail), 3); tl('df', h.id, it.type, it.x, it.y);
          } else if (h.type === 'thief' && !CURSED[it.type] && Math.random() < h.R.sapper) {   // a seasoned thief with a sapper's kit takes it apart for good
            fl.items.delete(key(it.x, it.y)); fl.threatDirty = true; fl.stats.disarmed++; fl.stats.sapped = (fl.stats.sapped || 0) + 1; bt(it.type).disarmed++; bt(it.type).sapped = (bt(it.type).sapped || 0) + 1;
            burst(it.x + 0.5, it.y + 0.5, '#a69bbb', 10); floatTile(it.x, it.y, 'Rozmontowane!', '#ff9a9a', 15); say(h, pick(SAY.sapped), 3); tl('ds', h.id, it.type, it.x, it.y, 1);
          } else {
            it.disabled = true; fl.threatDirty = true; fl.stats[CURSED[it.type] ? 'blessed' : 'disarmed']++; bt(it.type).disarmed++;
            floatTile(it.x, it.y, CURSED[it.type] ? (it.type === 'portrait' ? 'Odczyniony' : 'Odczynione') : 'Rozbrojone', '#a69bbb', 14); say(h, pick(SAY.disarmDone), 2); tl('ds', h.id, it.type, it.x, it.y, 0);
          }
        }
        h.state = 'walk'; h.item = null; h.disarmT = null; h.needPlan = true;
      }
      return;
    }
    if (h.state === 'free') {
      const c = byId(h.freeT);
      if (!c || !caged(c) || exiting(h)) { h.state = 'walk'; h.needPlan = true; return; }
      h.timer -= dt;
      if (h.timer <= 0) { freeCaged(c, true); h.state = 'walk'; h.needPlan = true; }
      return;
    }
    if (h.state === 'fight') {
      const g = h.foe;
      if (!g || g.hp <= 0 || fl.items.get(key(g.x, g.y)) !== g || exiting(h)) { h.state = 'walk'; h.foe = null; h.needPlan = true; }
      else {
        const bomb = h.inv.find(x => x.type === 'bomb');
        if (bomb && g.hp > 60) { h.inv.splice(h.inv.indexOf(bomb), 1); fl.stats.bombs++; fl.stats.itemsUsed++; say(h, pick(SAY.bomb), 3); burst(g.x + 0.5, g.y + 0.5, '#ffb35c', 16); hurtMonster(g, 80 * Math.pow(Math.min(4, bomb.r), 1.3) * itemPow(h)); }
        return;
      }
    }
    if (h.state === 'boss') { if (P.plan !== 'assault' || exiting(h) || panicking(h)) { h.state = 'walk'; h.needPlan = true; } return; }
    if (h.state === 'talk') { if ((fl.time >= P.talkUntil && !(h.id === P.leaderId && fl.time < P.waitUntil)) || exiting(h)) { h.state = 'walk'; h.needPlan = true; } else return; }
    if (h.state === 'wait') { h.timer -= dt; if (h.timer > 0) return; h.state = 'walk'; h.needPlan = true; }
    if (exiting(h) && h.nx === null && isExitTile(h.x, h.y)) { heroExit(h); return; }
    // the party stops to talk, or the leader waits for stragglers
    if (!fl.fearless && !exiting(h) && !h.lost && !panicking(h) && h.nx === null && (fl.time < P.talkUntil || (h.id === P.leaderId && fl.time < P.waitUntil)) && h.id !== P.scoutId && !(h.wanderUntil > fl.time)) { h.state = 'talk'; return; }
    if (h.nx === null) {
      if (h.needPlan || h.thinkT <= 0 || !h.path.length) planHero(h);
      if (h.state !== 'walk') return;
      if (h.path.length && !passable(h.path[0][0], h.path[0][1])) planHero(h);
      if (!h.path.length || !passable(h.path[0][0], h.path[0][1])) {
        if (h.intent !== 'follow' || (leader() && hdist(h, leader()) > 3)) h.noPathT += 0.4;
        h.state = 'wait'; h.timer = 0.4; return;
      }
      const n = h.path[0], g = fl.items.get(key(n[0], n[1]));
      if (g && MONSTERS[g.type] && !DRIFT[g.type] && g.hp > 0) { h.state = 'fight'; h.foe = g; return; }
      if (h.R.coord && h.type !== 'thief' && !fl.fearless && !exiting(h) && fl.disarmKeys && fl.disarmKeys.has(key(n[0], n[1])) && !fl.disarmKeys.has(key(h.x, h.y))) { h.state = 'wait'; h.timer = 0.4; return; }
      // a careful leader hesitates before stepping into the unknown when morale is low; rookies just barge in
      if (h.id === P.leaderId && h.rank >= 1 && !fl.fearless && !exiting(h) && P.morale < 0.75 && isFrontierTile(n[1] * WW + n[0]) && !P.hesitated.has(n[1] * WW + n[0])) {
        P.hesitated.add(n[1] * WW + n[0]); talk(0.9, [pick(SAY.hesitate)]); h.state = 'talk'; return;
      }
      // the warrior raises his shield stepping into a trap they know about
      const dng = fl.danger[n[1] * WW + n[0]];
      if (h.type === 'warrior' && !fl.fearless && dng > 1 && fl.time > h.shieldCd) { h.shieldUpUntil = fl.time + 2.5; h.shieldCd = fl.time + h.R.shieldCd; fl.stats.shields++; say(h, pick(SAY.shield), 2); }
      // powers: a talisman before a known trap (veterans), boots to run out, to dash past a trap, or to find the others
      if (h.inv.length) {
        if (dng > 1.5 && !fl.fearless && !exiting(h)) useCharm(h, 'danger');
        if (exiting(h) || (h.lost && h.rank >= 1) || (dng > 1 && h.rank >= 1 && !fl.fearless)) useBoots(h, exiting(h) ? 'out' : 'dash');
      }
      h.path.shift(); h.nx = n[0]; h.ny = n[1]; h.prog = 0;
    }
    const slow = fl.time < h.slowUntil ? 0.35 : 1;
    const dash = !fl.fearless && h.rank >= 1 && fl.danger[h.ny * WW + h.nx] > 0 ? 1.3 : 1;
    const careful = h.R.caution && !exiting(h) && !fl.fearless && isFrontierTile(h.ny * WW + h.nx) ? 0.8 : 1;   // elites test the floor in unknown places
    const sprint = fl.time < h.sprintUntil ? h.sprintK : 1;   // boots (a power)
    const bog = isRt(roomOf(h.nx, h.ny), 'swamp') || isRt(roomOf(h.x, h.y), 'swamp') ? 0.65 : 1;   // Bagno
    const purse = h.gold > 0 ? Math.max(0.8, 1 - 0.04 * h.gold) : 1;   // a heavy purse
    const spd = h.T.speed * h.R.speed * (S.heroSpeed / 100) * slow * (fl.fearless ? 1.3 : 1) * dash * careful * sprint * bog * purse *
      (panicking(h) ? 1.2 : 1) * (h.fleeing ? 1.15 : 1) * (h.crystal ? 0.9 * mods.carrierSlow : 1) * (fl.time < P.rushUntil && !exiting(h) ? 1.25 : 1) * (fl.time < h.rageUntil ? 1.25 : 1);
    h.prog += spd * dt;
    if (h.prog >= 1) { h.x = h.nx; h.y = h.ny; h.nx = null; h.ny = null; h.prog = 0; onEnter(h); }
  }
