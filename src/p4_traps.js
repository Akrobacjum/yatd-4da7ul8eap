
  /* ================= traps ================= */
  // A trap that went off in front of the heroes may be remembered (veterans almost always, rookies often not);
  // the thief, elites and amulets spot traps before they fire. Known traps are avoided if they can be.
  function learnTrap(it, how, by) {
    if (it.detected) return;
    it.detected = true; fl.threatDirty = true;
    if (how === 'seen') { fl.stats.learned++; floatTile(it.x, it.y, 'Zapamiętali', '#ffe066', 12, -0.5); }
    if (by) { sawAdd(by, itemTags(it)); sayNow(itemTags(it), () => say(by, how === 'seen' ? pick(SAY.learn) : how === 'tap' ? pick(SAY.tapFound) : (gearR(by, 'amulet') && by.type !== 'thief' ? pick(SAY.amulet) : pick(SAY.detect)), 2)); }   // 1.17.1: he sees what he found (1.22: 'tap', found with a stick)
    else if (how === 'seen' && fl.party && Math.random() < 0.5) {   // 1.17 (6.8 #1: never said): one who saw it go off tells the others, after the shout
      const r = slotRoom(it.type, it.x, it.y), w = alive().find(h => h.room === r && !h.lost && !panicking(h) && !caged(h));
      if (w) fl.party.queueSay.push({ id: w.id, text: pick(SAY.learn), at: fl.time + 1.2, prio: 2, late: 3 });
    }
    if (t3(it)) {   // a level 3 trap makes an impression
      const r = slotRoom(it.type, it.x, it.y), w = by || alive().find(h => h.room === r);
      if (w && Math.random() < 0.7) sayNow(itemTags(it), () => say(w, pick(SAY.nastyTrap), 3));
    }
  }
  // Path cost: known loaded traps hard, reloading ones barely; rumoured traps that are not there count as real;
  // monsters they can see make them look for another way.
  function rebuildThreat() {
    fl.threatDirty = false;
    fl.knownTypes = new Set(); fl.items.forEach(it => { if (LOOKS_TRAP(it.type) && it.detected) fl.knownTypes.add(it.type); });
    fl.danger.fill(0);
    const add = (tiles, w) => tiles.forEach(t => { const i = t[1] * WW + t[0]; fl.danger[i] = Math.min(6, fl.danger[i] + w); });
    fl.items.forEach(it => {
      if (LOOKS_TRAP(it.type) && it.detected && !it.disabled) add(areaOf(it), (SCARE[it.type] ? 1 : (it.cd > 0.3 || it.jamUntil > fl.time) ? 0.4 : 4) * (it.grudgeW === run.wave ? 2 : 1));   // 1.23: a Nemezis' grudge they walk round
      else if (MONSTERS[it.type] && it.hp > 0 && fl.known[it.y * WW + it.x] && !hiddenAmbush(it)) add(DRIFT[it.type] ? roomTilesNear(Math.floor(it.gx), Math.floor(it.gy), 1.5, roomOf(it.x, it.y)) : areaOf(it), it.type === 'archer' ? 1 : DRIFT[it.type] ? 1.5 : 2);
    });
    fl.ghosts.forEach(g => add(g.tiles, 4));
    replanAll();
  }
  // 1.18 Zasadzka w norze: goblins and shamans in their Goblinia nora sit hidden: no danger on the map (rebuildThreat), nobody walks
  // round them or picks a fight with them, until one strikes or a hero runs into it (it.shown, reset every wave in setupFl)
  const hiddenAmbush = m => !!mods.ambush && !!m && !m.shown && (m.type === 'goblin' || m.type === 'shaman') && inKind(m);
  function showAmbush(m) {
    if (m.shown) return;
    m.shown = true; m.ambushUntil = fl.time + 1; fl.threatDirty = true; fl.stats.ambushes = (fl.stats.ambushes || 0) + 1; tl('ab', m.type, m.x, m.y);
    floatTile(m.x, m.y, 'Zasadzka!', '#a7d060', 15, -0.9);
  }
  // 1.18 Mur z czaszek: kości, trumny and archers in a Kaplica czaszek, +5% for every hero killed in a Kaplica this run (at most +50%)
  const skullK = it => mods.skullwall && KIND_OF[it.type] === 'ossuary' && inKind(it) ? 1 + Math.min(0.5, 0.05 * (run.stacks.skullwall || 0) * mods.skullwall) : 1;
  // 1.18 Zdarte pancerze: spikes or arrows in a Zbrojownia may knock a talisman, an amulet or armour off him (50% a copy); it lands
  // next to him as loot, and loot is something to come back for, through the same spikes
  function stripGear(h, it) {
    if (!mods.strip || h.dead || !inKind(it)) return false;
    const g = h.inv.filter(x => x.type === 'charm' || x.type === 'amulet' || x.type === 'armor');
    if (!g.length || Math.random() >= Math.min(1, 0.5 * mods.strip)) return false;
    const x = pick(g);
    if (!dropItem(h, x, 0, false, { knocked: true })) return false;   // nowhere to fall: he keeps it (1.20: knocked, he wants it back)
    h.inv.splice(h.inv.indexOf(x), 1); fl.stats.stripped = (fl.stats.stripped || 0) + 1; tl('st', h.id, x.type);   // 1.20: 'st' (it was 'sp', the code of a hero coming in)
    floatHero(h, 'Strącone: ' + HITEMS[x.type].name, '#c9d5e2', 12, -0.6);
    return true;
  }
  // 1.20: a mimic blown up by a bomb or smashed by an axe spits out what it ate (its belly, up to 6 items, kept between waves)
  // around its furniture, as loot
  function mimicSpill(it, h) {
    if (!it || it.type !== 'mimic' || !it.belly || !it.belly.length) return 0;
    let n = 0; it.belly.forEach(x => { if (dropAt(it.x, it.y, x, 0, false)) n++; });
    it.belly = [];
    if (!n) return 0;
    fl.stats.mimicSpill = (fl.stats.mimicSpill || 0) + n; tl('mx', it.x, it.y, n);
    floatTile(it.x, it.y, 'Wypluwa ' + n + (n === 1 ? ' przedmiot' : n < 5 ? ' przedmioty' : ' przedmiotów'), '#d8434f', 13, -0.7);
    const o = h && !h.dead ? h : alive().sort((a, b) => Math.hypot(a.tx - it.x, a.ty - it.y) - Math.hypot(b.tx - it.x, b.ty - it.y))[0];
    if (o) { sawAdd(o, ['mimic']); sayNow(['mimic'], () => say(o, pick(SAY.mimicSpill), 3)); }
    return n;
  }
  // 1.20 Latarnia: a ghost, a shade or bats hitting its bearer may blow it out for 8 s (half the time; a level 3 shade always)
  function douseLantern(h, it) {
    const lt = h.inv.find(x => x.type === 'lantern');
    if (!lt || h.dead || fl.time < (lt.outUntil || 0) || Math.random() >= (it.type === 'shade' && t3(it) ? 1 : 0.5)) return false;
    lt.outUntil = fl.time + 8; floatHero(h, 'Zgasła!', '#ffe08a', 13, -0.8); say(h, pick(SAY.lanternOut), 3);
    fl.stats.lanternOut = (fl.stats.lanternOut || 0) + 1; tl('la', h.id);
    return true;
  }
  function disarmSpots(it) {
    const x = it.x, y = it.y;
    if (it.type === 'spikes' || it.type === 'web' || it.type === 'gate' || it.type === 'trapdoor' || it.type === 'cage' || it.type === 'bones' || it.type === 'creak') return [[x, y]];
    if (WALL_TRAP[it.type]) return wallDirs(x, y).map(d => [x + d[0], y + d[1]]);
    return DIRS.map(d => [x + d[0], y + d[1]]).filter(t => walkable(t[0], t[1]));
  }
  function heroesOn(keys) { return alive().filter(h => keys.has(key(h.tx, h.ty))); }
  const WALL_TRAP = { arrows: 1, fire: 1, portrait: 1, eyes: 1, mirror: 1 };
  // Nawiedzona galeria: a ghost haunting a room that has a portrait scares (1 + copies) times harder
  const galleryK = g => mods.hauntedGallery && fl.portraitRooms && fl.portraitRooms.has(roomOf(g.x, g.y)) ? 1 + mods.hauntedGallery : 1;
  const cdOf = type => ITEMS[type].cd * mods.cooldown * (WALL_TRAP[type] ? mods.wallCd : 1);
  // Card boosts on a trap's power: Cisza przed burzą (idle 20 s or not fired yet this wave) and Krwawy rytuał (kills this wave).
  const calmReady = it => mods.calmStorm > 0 && TRAPS[it.type] && (it.lastFire == null || fl.time - it.lastFire >= 20);
  const heartFed = () => { if (!mods.heartbeat) return false; const n = hungerNeed(run.wave); return n > 0 && fl.fed >= n; };   // Bijące serce (1.01: the heart is fed in this wave)   // Bijące serce (v15: you hold enough to feed the heart)
  const trapBoost = it => !TRAPS[it.type] ? 1 : (heartFed() ? 1 + mods.heartbeat : 1) * (calmReady(it) ? 1 + mods.calmStorm : 1) * (1 + mods.bloodRite * fl.stats.kills) * (1 + 0.01 * Math.floor((run.stacks.tempered || 0) / 4) * mods.tempered);
  const lvlPow = it => TRAPS[it.type] ? LVL_POW[it.lvl || 1] : 1;   // monsters grow through HP and power instead
  // Setting a hero on fire; with Pożoga the flames jump to the heroes right next to him (one hop).
  function ignite(h, by, dur) {
    h.burnUntil = Math.max(h.burnUntil, fl.time + (dur || 3)); h.burnBy = by;
    if (!mods.wildfire) return;
    const p = heroPos(h), R = 1 + 0.5 * mods.wildfire;
    alive().forEach(o => {
      if (o === h || fl.time < o.burnUntil) return;
      const q = heroPos(o);
      if (Math.hypot(p.x - q.x, p.y - q.y) <= R) { o.burnUntil = fl.time + (dur || 3); o.burnBy = by; floatHero(o, 'Pożoga!', '#ff9a3c', 13, -0.6); fl.stats.wildfire = (fl.stats.wildfire || 0) + 1; }
    });
  }
  // Mechanizm samobójczy: the trap being taken apart fires in the face of whoever is doing it.
  function rigged(it) {
    if (!mods.suicideMech || Math.random() >= mods.suicideMech) return false;
    it.cd = 0; it.jamUntil = 0;
    floatTile(it.x, it.y, 'Mechanizm samobójczy!', '#ff9a3c', 14, -0.9);
    fl.stats.rigged = (fl.stats.rigged || 0) + 1;
    fire(it, 1);
    return true;
  }
  // Wabik: taking it apart rings the alarm and every ready trap in its room goes off at once.
  function decoyAlarm(it, by) {
    if (!it || it.type !== 'decoy' || it.alarmed) return;
    it.alarmed = true; it.disabled = true; fl.threatDirty = true;
    const r = roomOf(it.x, it.y); let n = 0;
    floatTile(it.x, it.y, 'Alarm!', '#ff9a3c', 17, -1); shake = Math.max(shake, 0.18);
    fl.items.forEach(o => { if (TRAPS[o.type] && slotRoom(o.type, o.x, o.y) === r && !o.disabled && o.cd <= 0 && fire(o, 1)) n++; });
    fl.stats.alarms = (fl.stats.alarms || 0) + 1; tl('al', it.x, it.y, n);
    const w = by && !by.dead ? by : alive().find(h => h.room === r); sawItem(it, w ? [w] : null, ['decoy']); if (w) { sayNow(['decoy'], () => say(w, pick(SAY.bDecoy), 4)); }
  }
  // 1.05: while a trap fires, the wounds and the fright it causes are remembered by each hero (what he will tell in the tavern)
  function fire(it, pw, opt) { const prev = fl.firing, nb = nemBefore(it); fl.firing = it; try { const r = sayNow(itemTags(it, true), () => fireRaw(it, pw, opt)); if (r && nb) nemMissed(it, nb); return r; } finally { fl.firing = prev; } }   // 1.17.1: what went off is the thing of the moment; 1.23: a trap a Nemezis knew misses him
  function feltBy(h, v) { const it = fl && fl.firing; if (!it || !h.felt || !(v > 0)) return; const k = key(it.x, it.y); h.felt.set(k, (h.felt.get(k) || 0) + v); }
  function fireRaw(it, pw, opt) {
    pw = pw || 1; opt = opt || {};
    if (!fl || fl.phase !== 'raid' || !ACTIVE[it.type] || it.disabled || (it.cd > 0 && !opt.echo) || it.jamUntil > fl.time || (MONSTERS[it.type] && it.hp <= 0)) return false;
    const basePw = pw, boost = trapBoost(it), s0 = fl.prov || 0, k0 = fl.stats.kills;   // 1.16.1: s0 counts what this firing is worth (fl.score only moves when a chain is cashed in, so a card nearly always said 0)
    if (calmReady(it) && !opt.echo) floatTile(it.x, it.y, 'Cisza przed burzą ×' + fmt2(1 + mods.calmStorm).replace(',00', ''), '#ffd27a', 13, -1.4);
    pw *= boost * lvlPow(it) * kindPow(it) * mods.pactPower * skullK(it);   // upgrade level, 1.15: its komnata, and Krwawa umowa; 1.18: Mur z czaszek
    if (it.quick && !opt.echo) { it.quick = false; pw *= 1.5; floatTile(it.x, it.y, 'Szybki montaż ×1,5', '#ffd27a', 13, -1.2); }   // 1.18 Szybki montaż: built during the wave, its first shot +50%
    if (TRAPS[it.type]) it.lastFire = fl.time;
    // Echo mechanizmów: every k-th trap firing goes off a second time a moment later
    if (mods.echoFire && TRAPS[it.type] && !opt.echo && !opt.choir) {
      fl.trapFires = (fl.trapFires || 0) + 1;
      if (fl.trapFires % Math.max(2, 6 - mods.echoFire) === 0 && it.type !== 'powder') (fl.echoQ = fl.echoQ || []).push({ it, at: fl.time + 0.4, pw: basePw });
    }
    const chorus = [];
    // combo: a different trap within the window (on the combo clock, which waits while the party walks through empty rooms)
    if (fl.cclock - fl.lastTrapC < (fl.comboWinNow || S.comboWin)) { if ((fl.lastTrapType !== it.type || isRt(slotRoom(it.type, it.x, it.y), 'gears')) && fl.combo < 7) { fl.combo++; comboOrbs(it.x, it.y); } }   // 1.10: in Zębatki the same trap again counts too   // only a different type builds combo (1.10: its orbs fly to the Combo box)
    else { if (fl.chain && fl.chain.trap) payChain(); fl.combo = 1; comboReset(); }   // 1.01: the old chain is cashed in before a new one starts
    fl.lastTrapAt = fl.time; fl.lastTrapC = fl.cclock; fl.lastTrapType = it.type; fl.lastTrapRoom = slotRoom(it.type, it.x, it.y);
    fl.comboWinNow = (S.comboWin + mods.rhythm) * (isRt(slotRoom(it.type, it.x, it.y), 'grotto') ? 1.5 : 1);   // Grota: the echo holds the combo longer; 1.18 Rytm lochu +1 s a copy
    bt(it.type).fires++;
    fl.stats.maxCombo = Math.max(fl.stats.maxCombo, fl.combo);
    // 1.12 (author: combo should also make the traps hit and scare harder, so fewer, well grouped traps pay): the combo step
    // adds COMBO_POW to the power of a trap's wounds and scares (x1,72 at combo 7; scare traps had x1,25 a step since v14,
    // wounding ones nothing). comboMult stays the Esencja multiplier shown over the trap.
    const comboMult = 1 + 0.25 * (fl.combo - 1), cpow = 1 + COMBO_POW * (fl.combo - 1), D = S.dmg;
    run.fires++;
    fl.heroes.forEach(h => {
      if (h.item !== it || h.state !== 'disarm') return;
      h.state = 'walk'; h.item = null; h.needPlan = true; say(h, pick(CURSED[it.type] ? SAY.blessHit : SAY.disarmHit), 3, null, 'loud');   // 1.17: a priest's broken prayer
      // 1.13.4: he keeps trying the trap he chose (disarmJob), but not forever: the 2nd time it goes off in his face he leaves it
      const hm = h.disarmHits || (h.disarmHits = new Map()), n = (hm.get(it) || 0) + 1; hm.set(it, n);
      if (n >= 2) { h.disarmT = null; fl.stats.disarmQuit = (fl.stats.disarmQuit || 0) + 1; }
    });
    const area = areaOf(it), keys = new Set(area.map(t => key(t[0], t[1])));
    let list = heroesOn(keys);
    if (opt.lock && opt.lock.length) list = [...new Set(list.concat(opt.lock.filter(h => !h.dead && !h.fled && !h.gone && !h.fleeing)))];   // 1.09: a check's targets stay its targets
    fl.surprise = TRAPS[it.type] && !it.detected;
    sawItem(it, list);   // 1.17.1: whoever sees it go off (or gets it) remembers it
    if (TRAPS[it.type]) hearFar(it, list);   // 1.17: heard from another room
    if (TRAPS[it.type]) {
      const rooms = new Set(area.map(t => roomOf(t[0], t[1])));
      const witnesses = alive().filter(h => rooms.has(h.room));
      if (witnesses.length) {
        if (!it.detected) say(list[0] || witnesses[0], pickS(SAY.trap[it.type] || SAY.trapGeneric), 3, 1.4, 'loud');   // 1.10: a shout, over anyone
        const p = Math.max(...witnesses.map(h => h.R.learn));
        if (isRt(slotRoom(it.type, it.x, it.y), 'hush')) { if (!it.detected) fl.stats.hushUnlearned = (fl.stats.hushUnlearned || 0) + 1; }   // 1.10: Głusza: nobody can call out what he saw
        else if (Math.random() < p) learnTrap(it, 'seen', null);
        else if (!it.detected) { fl.stats.notLearned++; say(witnesses[0], pick(SAY.noLearn), 2); }
      }
      if (it.detected) fl.threatDirty = true;
      // two traps on the party within a couple of seconds = an ambush: they stop and their nerves fray
      const P = fl.party;
      const Lh = leader();   // 1.17: only traps on the leader's group make an ambush
      if (list.some(h => Lh && (h === Lh || canSee(h, Lh) || canHear(h, Lh)))) { if (fl.time - P.ambushT < 3) P.ambushN++; else P.ambushN = 1; P.ambushT = fl.time; }
    }
    const cdBase = cdOf(it.type) * (isRt(slotRoom(it.type, it.x, it.y), 'gears') ? 0.75 : 1);   // 1.10: Zębatki
    let hit = 0;
    switch (it.type) {
      case 'spikes':
        it.cd = cdBase; it.anim = 0.45;
        list.forEach(h => {
          damage(h, 35 * D * mods.spikeDmg * (1 + 0.04 * (run.stacks.hunger || 0) * mods.hunger) * pw, it, cpow); hit++;
          if (t3(it) && !h.dead) { h.burnUntil = Math.max(h.burnUntil, fl.time + 3); h.burnBy = 'spikes'; floatHero(h, 'Krwawi', '#ff6b6b', 12, -0.4); }   // Krwawienie
          stripGear(h, it);   // 1.18
        });
        break;
      case 'web': {
        it.cd = cdBase;
        const dur = 3 * mods.webDur * pw;
        fl.zones.push({ keys, tiles: area, until: fl.time + dur, src: it });
        list.forEach(h => {
          h.slowUntil = fl.time + dur;
          if (t3(it)) h.acidWebUntil = h.slowUntil;   // Kwaśna sieć
          const pts = addPts(GZ.web * depthMult(h.room) * loneMult(h), 'dmgPts', h); bt('web').pts += pts;
          floatHero(h, '+' + fmtE(pts) + ' sieć', '#ff7a86', 14); addFear(h, 6, 'web'); hit++;
        });
        break;
      }
      case 'trapdoor':
        it.cd = cdBase; it.anim = 0.6;
        list.filter(h => !(h.fellFrom && h.fellFrom.has(it))).forEach(h => { damage(h, 20 * D * mods.fallDmg * pw, it, cpow); if (!h.dead) fall(h, pw, it); hit++; });
        break;
      case 'cage':
        it.cd = cdBase; it.anim = 0.4;
        list.filter(h => !caged(h)).slice(0, 1).forEach(h => { cageHero(h, it, 6 * mods.cageTime * Math.max(1, pw), t3(it) ? 2 : 1); const pts = addPts(GZ.cage * depthMult(h.room), 'dmgPts', h); bt('cage').pts += pts; floatHero(h, '+' + fmtE(pts) + ' klatka', '#ff7a86', 14); hit++; });
        break;
      case 'arrows':
        it.cd = cdBase;
        wallDirs(it.x, it.y).forEach(d => {
          let k = 1; while (walkable(it.x + d[0] * k, it.y + d[1] * k)) k++;
          if (k > 1) fxLine(it.x + 0.5, it.y + 0.5, it.x + d[0] * (k - 1) + 0.5, it.y + d[1] * (k - 1) + 0.5, 0.28);
        });
        list.forEach(h => { damage(h, 25 * D * pw, it, cpow); if (mods.arrowBurn && !h.dead) ignite(h, 'arrows'); stripGear(h, it); hit++; });   // level 3: piercing (trapMult, talismans); 1.18: Zdarte pancerze
        break;
      case 'fire':
        it.cd = cdBase;
        fxTiles(area, '255,140,50', 0.5);
        list.forEach(h => { damage(h, 20 * D * mods.fireDmg * pw, it, cpow); if (!h.dead) ignite(h, 'fire', t3(it) ? 6 : 3); hit++; });   // level 3: Napalm
        break;
      case 'portrait':
        it.cd = cdBase; it.anim = 0.8;
        fxTiles(area, '170,120,255', 0.5);
        list.forEach(h => { addFear(h, 22 * pw * mods.portraitFear * cpow, 'portrait'); floatHero(h, 'Groza!', '#c3b2ff', 14, -0.5); hit++; });
        if (list.length) say(list[0], pickS(SAY.trap.portrait), 3);
        if (mods.choir && !opt.choir) {   // Chór potępionych: the other ready portraits in the room join in
          const r = slotRoom('portrait', it.x, it.y);
          fl.items.forEach(o => { if (o !== it && o.type === 'portrait' && !o.disabled && o.cd <= 0 && !(o.jamUntil > fl.time) && slotRoom('portrait', o.x, o.y) === r) chorus.push(o); });
        }
        break;
      // v15.1: the new things that only scare
      case 'eyes':
        it.cd = cdBase; it.anim = 0.7;
        fxTiles(area, '255,224,102', 0.3);
        list.forEach(h => { const lone = h.alone || h.lost, k = lone ? (t3(it) ? 3 : 2) : 1; addFear(h, 14 * k * pw * cpow, 'eyes'); floatHero(h, lone ? 'Patrzą na mnie!' : 'Groza!', '#c3b2ff', 13, -0.5); hit++; });
        break;
      case 'bones':
        it.cd = cdBase; it.anim = 0.5;
        fxTiles(area, '232,224,208', 0.3);
        list.forEach(h => { addFear(h, 20 * (h.rank === 0 ? 1.5 : 1) * pw * cpow, 'bones'); floatHero(h, 'Grzechot!', '#e8e0d0', 13, -0.5); hit++; });
        break;
      case 'mirror':
        it.cd = cdBase; it.anim = 0.8;
        fxTiles(area, '190,220,255', 0.4);
        list.forEach(h => { const k = 1 + 1.5 * clamp(h.fear / h.courage, 0, 1); addFear(h, 12 * k * pw * cpow, 'mirror'); floatHero(h, k >= 1.75 ? 'Odbicie!' : 'Groza!', '#bfe0ff', 13, -0.5); hit++; });
        if (list.length) say(list[0], pickS(SAY.trap.mirror), 3);
        break;
      case 'creak':
        it.cd = cdBase; it.anim = 0.7;
        list.forEach(h => { const close = Math.abs(h.tx - it.x) + Math.abs(h.ty - it.y) <= 1; addFear(h, (close ? 24 : 12) * pw * cpow, 'creak'); if (close && t3(it)) h.slowUntil = Math.max(h.slowUntil, fl.time + 2); hit++; });
        floatTile(it.x, it.y, 'Skrzyp!', '#d9c9a8', 14, -0.6);
        break;
      case 'coffin': {
        it.cd = cdBase; it.anim = 1;
        const crypt = isRt(roomOf(it.x, it.y), 'crypt') ? 1.5 : 1;
        let near = null, bd = 99; list.forEach(h => { const dd = Math.hypot(h.tx - it.x, h.ty - it.y); if (dd < bd) { bd = dd; near = h; } });
        list.forEach(h => { const main = h === near; addFear(h, (main ? 36 * (t3(it) ? 1.5 : 1) : 14) * crypt * pw * cpow, 'coffin'); if (main && t3(it)) h.slowUntil = Math.max(h.slowUntil, fl.time + 3); hit++; });
        if (near) floatHero(near, 'Trumna!', '#c3b2ff', 15, -0.6);
        shake = Math.max(shake, 0.08);
        break;
      }
      case 'musicbox': {
        it.cd = cdBase; it.anim = 0.6;
        const dur = t3(it) ? 8 : 4, r = roomOf(it.x, it.y);
        it.playUntil = fl.time + dur;
        list.forEach(h => { addFear(h, 6 * pw * cpow, 'musicbox'); h.lullUntil = fl.time + dur; h.lullK = 5 * pw; h.lullRoom = r; hit++; });
        if (list.length) say(list[0], pick(SAY.lull), 3);
        floatTile(it.x, it.y, '♪ Kołysanka', '#e6d2ff', 14, -0.6);
        break;
      }
      case 'gate': {
        // Prototype 1.01: shut for a fixed time (power crushes harder, it does not hold longer) and the cooldown starts when it
        // opens again, so there is always a gap. Level 3 (Żelazna krata) gives 2 more closings instead of endless ones.
        const shut = 4 * mods.gateDur;
        it.cd = shut + cdBase;
        const d = fl.doors.get(key(it.x, it.y));
        d.closedUntil = fl.time + shut; d.wasClosed = true;
        it.uses = (it.uses || 0) + 1;
        if (it.uses >= mods.gateUses + (t3(it) ? 2 : 0)) { it.disabled = true; it.worn = true; fl.threatDirty = true; floatTile(it.x, it.y, 'Ostatnie zamknięcie', '#c9c2d8', 13, -0.6); }
        fl.heroes.forEach(h => { if (!h.dead && !h.fled && h.nx === it.x && h.ny === it.y && h.prog < 0.5) { h.nx = null; h.ny = null; h.prog = 0; } });
        list.forEach(h => { damage(h, 60 * D * mods.gateCrush * pw, it, cpow); hit++; });
        const near = alive().find(h => Math.abs(h.tx - it.x) + Math.abs(h.ty - it.y) <= 2);
        if (near) { say(near, pick(SAY.gateBlocked), 3, null, 'loud'); addFear(near, 5, 'gate'); }
        replanAll();
        shake = Math.max(shake, 0.12);
        break;
      }
      case 'powder': {
        const forge = mods.restock && inKind(it);   // 1.18 Beczki z kuźni (asked before the furniture goes)
        fl.items.delete(key(it.x, it.y));
        fl.objects.delete(key(it.x, it.y)); fl.threatDirty = true;
        const L = run.layout, c = L.cells.get(cellKey(Math.floor(it.x / CELL), Math.floor(it.y / CELL)));
        const ob = c && c.objs.find(o => o[0] === it.x && o[1] === it.y);
        if (forge && ob) (run.restock || (run.restock = [])).push({ x: it.x, y: it.y, obj: ob.slice(), lvl: it.lvl || 1, spent: it.spent });   // back next wave (startBuild)
        if (c) c.objs = c.objs.filter(o => !(o[0] === it.x && o[1] === it.y));   // the furniture is gone for good (1.18: unless Beczki z kuźni bring it back)
        list.forEach(h => { damage(h, 60 * D * pw, it, cpow); if (t3(it) && !h.dead) ignite(h, 'powder'); hit++; });   // level 3: Ognisty proch
        burst(it.x + 0.5, it.y + 0.5, '#ff9a3c', 26); burst(it.x + 0.5, it.y + 0.5, '#ffd27a', 12);
        particles.push({ ring: true, x: it.x + 0.5, y: it.y + 0.5, r: 0.3, maxR: mods.powderR + 0.5, life: 0.35, color: '#ffb35c' });
        shake = 0.35;
        replanAll();
        break;
      }
      case 'mimic':
        it.cd = cdBase; it.anim = 0.35;
        fxTiles(area, '216,67,79', 0.3);
        list.forEach(h => {
          damage(h, 40 * D * mods.mimicDmg * pw * (1 + 0.1 * Math.min(6, (it.belly || []).length)), it, cpow); hit++;   // 1.20: +10% for each item in its belly
          if (t3(it) && !h.dead && h.inv.length) {   // Pożeracz (1.20: the item goes into its belly, at most 6, kept between waves)
            const lost = h.inv.splice(rand(0, h.inv.length - 1), 1)[0]; floatHero(h, 'Pożarte: ' + HITEMS[lost.type].name, '#d8434f', 12, -0.6);
            (it.belly || (it.belly = [])).push(Object.assign({}, lost, { cdUntil: 0 })); if (it.belly.length > 6) it.belly.shift(); fl.stats.mimicAte = (fl.stats.mimicAte || 0) + 1;
          }
        });
        break;
      case 'goblin': {
        it.cd = cdBase; it.anim = 0.3;
        const near = alive().filter(h => Math.max(Math.abs(h.tx - it.x), Math.abs(h.ty - it.y)) <= 1);
        const tgt = near.find(h => h.foe === it) || near[0];
        const amb = !!tgt && hiddenAmbush(it);   // 1.18 Zasadzka w norze: the first blow from hiding hits twice as hard
        if (tgt) { damage(tgt, 35 * D * it.power * pw * (amb ? 2 : 1), actSrc(it.type), cpow); hit++; if (t3(it) && !tgt.dead) tgt.slowUntil = Math.max(tgt.slowUntil, fl.time + 1.5); }   // Podcięcie
        if (amb) showAmbush(it);
        break;
      }
      case 'archer':
        it.cd = cdBase;
        list.forEach(h => { const p = heroPos(h); fxLine(it.x + 0.5, it.y + 0.5, p.x, p.y, 0.25); damage(h, 22 * D * it.power * pw, actSrc(it.type), cpow); if (t3(it) && !h.dead) ignite(h, 'archer'); hit++; });
        break;
      case 'spider':
        it.cd = cdBase; it.anim = 0.35;
        const hold = mods.spiderNest ? 2 : 0;   // 1.18 Pajęcze gniazdo: a spider's web holds 2 s longer
        fl.zones.push({ keys, tiles: area, until: fl.time + 4 * pw + hold, src: it });
        fxTiles(area, '220,230,255', 0.35);
        list.forEach(h => { h.slowUntil = fl.time + 4 * pw + hold; damage(h, 30 * D * it.power * pw, actSrc(it.type), cpow); hit++; });
        break;
      case 'ogre':
        it.cd = cdBase; it.anim = 0.35; shake = Math.max(shake, 0.2);
        fxTiles(area, '200,180,140', 0.35);
        list.forEach(h => { damage(h, 45 * D * it.power * pw, actSrc(it.type), cpow); if (t3(it) && !h.dead) addFear(h, 15 * pw, 'ogre'); hit++; });   // Grzmot
        break;
      case 'shaman': {
        it.cd = cdBase;
        const r = roomOf(it.x, it.y);
        fl.items.forEach(m => { if (MONSTERS[m.type] && m.hp > 0 && roomOf(m.x, m.y) === r) m.hp = Math.min(m.max, m.hp + 60 * pw); });
        fxTiles(area, '120,220,130', 0.4);
        floatTile(it.x, it.y, 'Leczenie potworów', '#8be38f', 13, -0.6);
        hit = -1;
        break;
      }
      case 'ghost':
        it.cd = cdBase; it.anim = 0.6;
        fxTiles(area, '200,210,255', 0.4);
        list.forEach(h => { addFear(h, 40 * pw * mods.ghostAura * galleryK(it) * cpow, 'ghost'); damage(h, 5 * D * pw, actSrc(it.type), cpow); douseLantern(h, it); hit++; });   // 1.20: douseLantern
        floatTile(it.x, it.y, 'Wrzask!', '#dfe6ff', 15, -0.6);
        break;
      case 'shade': {   // a whisper: the one it follows hears it best (the lonely twice as well)
        it.cd = cdBase; it.anim = 0.6;
        let tgt = null, bs = -1e9;
        list.forEach(h => { const p = heroPos(h), sc = (h.alone || h.lost ? 100 : 0) - Math.hypot(p.x - it.gx, p.y - it.gy); if (sc > bs) { bs = sc; tgt = h; } });
        list.forEach(h => { addFear(h, (h === tgt ? 30 : 10) * (h.alone || h.lost ? 2 : 1) * pw * cpow, 'shade'); douseLantern(h, it); hit++; });   // 1.20: douseLantern
        if (tgt) {
          floatHero(tgt, 'Szept...', '#9a8fb8', 14, -0.6); say(tgt, pick(SAY.shade), 3, null, 'loud');
          if (t3(it) && tgt.alone && !tgt.lost && leader() !== tgt) getLost(tgt, 'shade');   // Pożeracz światła
        }
        break;
      }
      case 'bats': {   // the swarm: bites, scares and sends them running blind
        it.cd = cdBase; it.anim = 0.5;
        fxTiles(area, '70,56,84', 0.3);
        const L = leader();
        list.forEach(h => {
          addFear(h, 16 * pw * cpow, 'bats'); damage(h, 6 * D * pw, actSrc(it.type), cpow); douseLantern(h, it); hit++;   // 1.20: douseLantern
          if (!h.dead && !h.fleeing && !h.crystal && !caged(h) && h !== L && Math.random() < (h.rank === 0 ? 0.6 : 0.35) * (t3(it) ? 1.3 : 1)) {
            h.panicUntil = fl.time + 2.5; h.needPlan = true; fl.stats.batScatter = (fl.stats.batScatter || 0) + 1;
            floatHero(h, 'Spłoszony!', '#c9c0d8', 13, -0.8); say(h, pick(SAY.batScatter), 2, null, 'loud');
            // 1.18 Spłoszeni w mrok: from a Gniazdo nietoperzy he runs blind and may lose the party (40%, a rookie 60%, +20% a copy)
            if (mods.batscatter && inKind(it) && !h.lost && Math.random() < Math.min(1, (h.rank === 0 ? 0.6 : 0.4) + 0.2 * (mods.batscatter - 1))) { getLost(h, 'bats'); fl.stats.batLost = (fl.stats.batLost || 0) + 1; }
          }
        });
        break;
      }
    }
    fl.surprise = false;
    // 1.18 Sprzężone tryby: a trap going off in Zębatki winds the other traps of that room on by 1 s a copy (not an echo or a choir, no loops)
    if (mods.gearlink && TRAPS[it.type] && !opt.echo && !opt.choir) {
      const gr = slotRoom(it.type, it.x, it.y);
      if (gr >= 0 && isRt(gr, 'gears')) fl.items.forEach(o => { if (o !== it && TRAPS[o.type] && o.cd > 0 && slotRoom(o.type, o.x, o.y) === gr) { o.cd = Math.max(0, o.cd - mods.gearlink); fl.stats.gearLinks = (fl.stats.gearLinks || 0) + 1; } });
    }
    if (TRAPS[it.type] && hit > 0 && mods.tempered) run.stacks.tempered = (run.stacks.tempered || 0) + hit;   // Zaprawione mechanizmy
    if (mods.overload && TRAPS[it.type] && it.type !== 'powder' && !opt.echo && fl.items.get(key(it.x, it.y)) === it && Math.random() < mods.overload) {   // Przeciążenie
      it.disabled = true; it.worn = true; fl.threatDirty = true; floatTile(it.x, it.y, 'Zepsuta!', '#a69bbb', 13, -1.1); fl.stats.broken = (fl.stats.broken || 0) + 1;
    }
    if (TRAPS[it.type] && list.some(h => h.rank === 0) && Math.random() < 0.3) {   // a veteran has seen this before
      const v = alive().find(o => o.rank >= 2 && !list.includes(o) && hdist(o, list[0]) < 7);
      if (v) say(v, pick(SAY.vetWarn), 2);
    }
    tl('fi', it.type, it.x, it.y, Math.max(0, hit), Math.round(pw * 10) / 10);
    if (chorus.length) {
      const k = 0.6 + 0.4 * (mods.choir - 1);
      floatTile(it.x, it.y, 'Chór! ×' + (chorus.length + 1), '#c3b2ff', 15, -1.6);
      fl.stats.chorus = (fl.stats.chorus || 0) + chorus.length;
      chorus.forEach(o => fire(o, basePw * k, { choir: true }));
    }
    const w = it.w || (it.w = { f: 0, h: 0, p: 0, k: 0 }); w.f++; w.h += Math.max(0, hit); w.p += (fl.prov || 0) - s0; w.k += fl.stats.kills - k0;
    if (hit > 0) {
      bt(it.type).hits += hit;
      if (fl.combo > 1) floatTile(it.x, it.y, 'Combo ×' + fmt2(comboMult), '#cbb0ff', 14, -0.75, 'combo');
    } else if (hit === 0 && it.type !== 'gate') {
      floatTile(it.x, it.y, 'pudło', '#857a99', 13);
    }
    return true;
  }
  // Trapdoor: down into the dark, out somewhere else a few seconds later, alone and shaken.
  // A hero falls through a given trapdoor once per wave: after that he knows where the edge is and steps around it.
  function fall(h, pw, it) {
    if (it) { (h.fellFrom = h.fellFrom || new Set()).add(it); learnTrap(it, 'seen', null); if (t3(it)) h.deepFall = true; }
    h.fallRoom = it ? slotRoom('trapdoor', it.x, it.y) : -1; h.fallRk = it ? rkOf(h.fallRoom) : null;   // 1.18: Cela pod zapadnią
    h.gone = true; h.state = 'fallen'; h.fallUntil = fl.time + mods.fallTime * Math.max(1, pw); h.outR = realNow; h.outKind = 'fall';   // 1.09: sinks into the floor
    h.path = []; h.nx = null; h.ny = null; h.prog = 0; h.foe = null; h.item = null;
    fl.stats.falls++; say(h, pick(SAY.fall), 4); tl('tr', h.id);
    if (h.crystal && mods.bottomless) { floatHero(h, 'Kryształ przepadł w studni!', '#ff9ab0', 15, -1); crystalReturns(h); }
    const p = heroPos(h); burst(p.x, p.y, '#3a2e4a', 12);
    addFear(h, 25, 'trapdoor');
    if (fl.party.leaderId === h.id) fl.party.leaderId = -1;
    if (fl.party.scoutId === h.id) fl.party.scoutId = -1;
    if (fl.party.scoutMate === h.id) fl.party.scoutMate = -1;
    h.split = false;
  }
  // 1.18 Cela pod zapadnią: down a trapdoor of a Więzienie he lands in a ready cage of a Więzienie (the one in that room first) and it
  // shuts on him: the cage fires on him (its Groza, the combo, the party's rescue, as for any cage). No ready cage: the usual landing.
  function cellLand(h) {
    const cages = [...fl.items.values()].filter(c => c.type === 'cage' && !c.disabled && c.cd <= 0 && !(c.jamUntil > fl.time) && rkOf(slotRoom('cage', c.x, c.y)) === 'prison' && walkable(c.x, c.y) && !heroBlock(h, c.x, c.y));
    if (!cages.length) return false;
    const c = cages.find(q => slotRoom('cage', q.x, q.y) === h.fallRoom) || pick(cages);
    h.x = c.x; h.y = c.y; h.tx = c.x; h.ty = c.y; h.nx = null; h.ny = null; h.prog = 0; h.gone = false; h.state = 'walk'; h.needPlan = true; h.deepFall = false;
    h.room = roomOf(h.x, h.y); h.lost = false; h.noPathT = 0;
    reveal(h);
    fl.stats.cellDrops = (fl.stats.cellDrops || 0) + 1; tl('ce', h.id, c.x, c.y);
    fire(c, 1);
    addFear(h, 10, 'trapdoor');
    if (mods.firepit) { ignite(h, 'trapdoor', 3 * mods.firepit); floatHero(h, 'Płonie!', '#ff9a3c', 13, -0.9); }   // Ognista otchłań
    return true;
  }
  function landFallen(h) {
    h.inR = realNow;   // 1.09: pops in where he climbs out
    if (mods.cell && h.fallRk === 'prison' && cellLand(h)) return;   // 1.18
    const L = leader(), lp = L ? heroPos(L) : { x: fl.ent.x, y: fl.ent.y };
    const rooms = fl.rooms.filter(r => r.kind === 'room' && r.id !== fl.heart.room);
    // With the crystal he comes out as far from every way out as possible (picking "far from the leader" used to drop him at the door).
    let exitD = null;
    if (h.crystal) {
      const a = bfs(fl.ent.x, fl.ent.y, { noDanger: true }).dist, b = fl.breach ? bfs(fl.breach.x, fl.breach.y, { noDanger: true }).dist : null;
      exitD = i => { const da = a[i], db = b ? b[i] : -1; return da < 0 ? db : db < 0 ? da : Math.min(da, db); };
    }
    let best = null, bd = -1;
    for (let k = 0; k < 30; k++) {
      const R = pick(rooms), t = pick(R.tiles);
      if (!walkable(t[0], t[1]) || heroBlock(h, t[0], t[1])) continue;   // 1.12.1: not onto another hero
      const d = exitD ? exitD(t[1] * WW + t[0]) + Math.random() * 2 : Math.hypot(t[0] - lp.x, t[1] - lp.y) + Math.random() * 3;
      if (d > bd) { bd = d; best = t; }
    }
    if (!best) best = [fl.ent.x, fl.ent.y + 1];
    h.x = best[0]; h.y = best[1]; h.tx = h.x; h.ty = h.y; h.gone = false; h.state = 'walk'; h.needPlan = true;
    h.room = roomOf(h.x, h.y);
    reveal(h);
    h.lost = !!(L && (hdist(h, L) > 6 || isRt(h.room, 'fog'))); h.noPathT = 0;   // in the fog he has no idea where he is
    if (h.lost) { fl.stats.gotLost++; tl('lo', h.id, 'fall'); }
    say(h, pick(SAY.landed), 4);
    addFear(h, 10, 'trapdoor');
    if (h.deepFall) { h.deepFall = false; h.lost = true; h.noPathT = 0; addFear(h, 25, 'trapdoor'); floatHero(h, 'Zgubiony w ciemności', '#c3b2ff', 12, -0.6); }   // Bezdenny szyb
    if (mods.firepit) { ignite(h, 'trapdoor', 3 * mods.firepit); floatHero(h, 'Płonie!', '#ff9a3c', 13, -0.9); }   // Ognista otchłań
  }
  // Cage: stuck for a while, taking extra damage. The party decides whether to come back for him.
  function cageHero(h, it, dur, fearK) {
    if (h.nx !== null) { if (h.prog >= 0.5) { h.x = h.nx; h.y = h.ny; } h.nx = null; h.ny = null; h.prog = 0; }
    h.tx = h.x; h.ty = h.y;
    h.state = 'caged'; h.cageUntil = fl.time + dur; h.cagedAt = fl.time; h.cageIt = it; h.path = []; h.foe = null; h.item = null;
    fl.stats.cages++; say(h, pick(SAY.cage), 4); tl('cg', h.id);
    addFear(h, 20 * mods.cageFear * (fearK || 1), 'cage');
    fl.party.cageDecided.delete(h.id);
  }
  // Once a cage has been opened (pried by a friend, worn through, or torn apart in panic) its bars are bent: no more catches this wave.
  function freeCaged(h, rescued, how) {
    if (h.state !== 'caged') return;
    const it = h.cageIt;
    if (it && fl.items.get(key(it.x, it.y)) === it && !it.disabled) { it.disabled = true; it.bent = true; fl.threatDirty = true; floatTile(it.x, it.y, 'Klatka wygięta', '#a69bbb', 12, -0.5); }
    h.state = 'walk'; h.cageUntil = -1; h.cageIt = null; h.needPlan = true;
    tl('cf', h.id, how || (rescued ? 'rescue' : 'time'));
    if (fl.party.rescueId === h.id) fl.party.rescueId = -1;
    if (rescued) { fl.stats.rescues++; say(h, pick(SAY.freed), 3); h.fear = Math.max(0, h.fear - 15); if (h.fear >= h.courage && !h.fleeing && !h.crystal) startFlee(h); }
  }
  // v14.1: the cage's time is up. A friend on the way gets a few more seconds; nobody coming = he dies in the cage.
  // A boss is too strong for the bars: he tears them apart (the cage is bent for this wave).
  function cageEnds(h) {
    const P = fl.party, it = h.cageIt;
    if (h.boss) { freeCaged(h, false, 'break'); say(h, pick(SAY.cageBreak), 4); floatHero(h, 'Wyłamał kraty!', '#ffd27a', 14, -0.9); return; }
    const helper = (P.rescueId === h.id && alive().some(o => o !== h && !caged(o) && !o.fleeing && !o.lost && !o.gone)) || (P.g2 && P.g2.plan === 'rescue' && P.g2.partner === h.id);   // 1.21: his pair on the way
    if (helper && fl.time < h.cageUntil + 8) return;   // someone is coming: wait for him (up to 8 s more)
    h.state = 'walk'; h.cageUntil = -1; h.cageIt = null; if (P.rescueId === h.id) P.rescueId = -1;
    tl('cf', h.id, 'death'); fl.stats.cageDeaths = (fl.stats.cageDeaths || 0) + 1;
    say(h, pick(SAY.cageDie), 4, 2); floatHero(h, 'Zmarł w klatce', '#d8434f', 15, -1);
    h.hp = 0; h.dead = true; kill(h, 'trap', 'cage');
    if (it && fl.items.get(key(it.x, it.y)) === it) { it.anim = 0.4; it.cd = Math.max(it.cd, ITEMS.cage.cd * 0.5); }   // the bars open on a body: the cage is ready again soon
  }
  function hurtMonster(m, dmg) {
    if (m.hp <= 0) return;
    const r = roomOf(m.x, m.y);
    if ([...fl.items.values()].some(o => o.type === 'shaman' && t3(o) && o.hp > 0 && roomOf(o.x, o.y) === r)) dmg *= 0.7;   // Tarcza ducha
    m.hp -= dmg; m.flash = 0.12;
    if (m.hp <= 0) {   // dead for good: monsters do not come back
      m.hp = 0; fl.stats.monstersLost++; bt(m.type).died++; tl('mn', m.type, m.x, m.y);
      fl.items.delete(key(m.x, m.y));
      if (!DRIFT[m.type]) { const gx = m.gx !== undefined ? m.gx : m.x + 0.5, gy = m.gy !== undefined ? m.gy : m.y + 0.5; fl.fx.push({ kind: 'corpse', type: m.type, x: gx, y: gy, face: m.face || 1, h: { ogre: 1.25, goblin: 0.8, archer: 0.95, shaman: 0.9, spider: 0.6 }[m.type] || 0.9, life: 0.75, max: 0.75 }); burst(gx, gy, '#8a8378', 8); }   // 1.09: it falls
      floatTile(m.x, m.y, ITEMS[m.type].name + ' ginie', '#9be37a', 14);
      const killer = fl.heroes.find(h => h.foe === m && !h.dead && !h.fled && !h.gone);   // 1.13: whoever fought it may brag about it
      if (killer) convoStart(killer, 'monsterDown');
      burst((m.gx || m.x + 0.5), (m.gy || m.y + 0.5), '#7fbf5a', 12);
      fl.heroes.forEach(h => { if (h.foe === m) { h.state = 'walk'; h.foe = null; h.needPlan = true; } });
      fl.threatDirty = true;
    }
  }
  const monDmg = m => S.monDmg * m.power * kindPow(m) * mods.pactPower * skullK(m) * (heartFed() ? 1 + mods.heartbeat : 1) *   // 1.18: Mur z czaszek
    (mods.pack && [...fl.items.values()].some(o => o !== m && MONSTERS[o.type] && o.hp > 0 && roomOf(o.x, o.y) === roomOf(m.x, m.y)) ? 1 + mods.pack : 1);   // Stado
  // v15.1: the floating monsters. The ghost follows the nearest hero, the shade the lonely one or the last in line,
  // the bats flit from one hero to another. They never block the way and nobody fights them hand to hand.
  const DRIFT_SPEED = { ghost: 0.9, shade: 1.1, bats: 2.2 };
  function driftTarget(m, room) {
    const crew = alive().filter(h => h.room === room);
    if (!crew.length) return null;
    const dist = h => { const p = heroPos(h); return Math.hypot(p.x - m.gx, p.y - m.gy); };
    const ls = crew.find(h => standing(h) && dist(h) <= 3); if (ls) return ls;   // 1.22: one making a last stand draws it
    let best = null, bs = -1e9;
    if (m.type === 'shade') {
      const L = leader();
      crew.forEach(h => { const sc = (h.alone || h.lost ? 100 : 0) + (L && h !== L ? Math.min(12, hdist(h, L)) : 0) - 0.3 * dist(h); if (sc > bs) { bs = sc; best = h; } });
      return best;
    }
    if (m.type === 'bats') {
      const t = m.batTgt;
      if (!t || t.dead || t.fled || t.gone || t.room !== room || fl.time > (m.batT || 0)) { m.batTgt = pick(crew); m.batT = fl.time + 1.2 + Math.random(); }
      return m.batTgt;
    }
    crew.forEach(h => { const d = -dist(h); if (d > bs) { bs = d; best = h; } });
    return best;
  }
  function driftTick(m, room, dt) {
    const R = fl.rooms[room], tgt = driftTarget(m, room);
    if (!tgt) { if (R) { m.gx += ((m.x + 0.5) - m.gx) * Math.min(1, dt); m.gy += ((m.y + 0.5) - m.gy) * Math.min(1, dt); } return; }
    const p = heroPos(tgt), d = Math.max(0.01, Math.hypot(p.x - m.gx, p.y - m.gy)), sp = Math.min(d, DRIFT_SPEED[m.type] * dt);
    m.gx += (p.x - m.gx) / d * sp; m.gy += (p.y - m.gy) / d * sp;
    if (m.type === 'bats') { m.gx += Math.sin(fl.time * 9 + m.x) * 0.9 * dt; m.gy += Math.cos(fl.time * 7 + m.y) * 0.9 * dt; }   // the swarm flutters
    if (R) { m.gx = clamp(m.gx, R.x0 + 0.3, R.x1 + 0.7); m.gy = clamp(m.gy, R.y0 + 0.3, R.y1 + 0.7); }
    alive().forEach(h => {
      const q = heroPos(h), dd = Math.hypot(q.x - m.gx, q.y - m.gy);
      if (m.type === 'ghost') {   // chills everyone close
        if (dd <= (t3(m) ? 2.6 : 1.6)) { sawAdd(h, itemTags(m)); addFear(h, 10 * dt * mods.ghostAura * galleryK(m), 'ghost'); if (!h.ghostSaid) { h.ghostSaid = true; say(h, pick(SAY.ghost), 3, null, 'loud'); if (h.type === 'warrior') say(h, pick(SAY.ghostOnly), 2); } }
        if (dd <= 0.8) damage(h, 5 * monDmg(m) * dt, m);
      } else if (m.type === 'shade') {   // a cold breath on the neck, twice as bad for the lonely
        if (dd <= 1.4) { sawAdd(h, itemTags(m)); addFear(h, 7 * dt * (h.alone || h.lost ? 2 : 1), 'shade'); if (!h.shadeSaid) { h.shadeSaid = true; say(h, pick(SAY.shade), 3, null, 'loud'); } }
      } else if (dd <= (t3(m) ? 1.6 : 1.0)) {   // bats: tiny bites and wings in the face
        sawAdd(h, itemTags(m)); addFear(h, 4 * dt, 'bats'); damage(h, 3 * monDmg(m) * dt, m);
        if (!h.batSaid) { h.batSaid = true; say(h, pick(SAY.bats), 3, null, 'loud'); }
      }
    });
  }
  function monstersTick(dt) {
    fl.items.forEach(m => {
      if (!MONSTERS[m.type] || m.hp <= 0) return;
      if (m.flash > 0) m.flash -= dt;
      const room = roomOf(m.x, m.y);
      if (m.type === 'shaman') fl.items.forEach(o => {
        if (MONSTERS[o.type] && o.hp > 0 && o.hp < o.max && Math.max(Math.abs(o.x - m.x), Math.abs(o.y - m.y)) <= 2) o.hp = Math.min(o.max, o.hp + 8 * dt);
      });
      if (m.type === 'archer') {
        m.shot -= dt;
        if (m.shot <= 0) {
          let tgt = null, bd = 4.01;
          alive().forEach(h => { if (roomOf(h.tx, h.ty) !== room) return; const d = Math.hypot(h.tx - m.x, h.ty - m.y); if (d < bd) { bd = d; tgt = h; } });
          if (tgt) { m.shot = 1.2; const p = heroPos(tgt); fxLine(m.x + 0.5, m.y + 0.5, p.x, p.y, 0.15); damage(tgt, 12 * monDmg(m), m); if (t3(m) && !tgt.dead) ignite(tgt, 'archer'); }
          else m.shot = 0.3;
        }
      }
      if (DRIFT[m.type]) { driftTick(m, room, dt); return; }
      const fighters = fl.heroes.filter(h => !h.dead && !h.fled && !h.gone && h.state === 'fight' && h.foe === m);
      if (!fighters.length) return;
      if (hiddenAmbush(m)) showAmbush(m);   // 1.18 Zasadzka w norze: he ran into it; its first second of fighting hits twice as hard
      const ambK = fl.time < (m.ambushUntil || 0) ? 2 : 1;
      // 1.22: the warrior holding the front takes the blows first; a guard next to the carrier steps into half of a blow meant for
      // him (a warrior 70%)
      (m.type === 'ogre' ? fighters : [fighters.find(h => h.type === 'warrior' && h.front === m) || fighters[0]]).forEach(h => {
        let d = ITEMS[m.type].melee * monDmg(m) * ambK * dt;
        const gd = h.crystal ? guardOf(h, m) : null;
        if (gd) { const k = gd.type === 'warrior' ? 0.7 : 0.5; damage(gd, d * k, m); d *= 1 - k; fl.stats.guardSoakDmg = (fl.stats.guardSoakDmg || 0) + d * k / (1 - k); }
        damage(h, d, m); if (m.type === 'ogre' && t3(m)) addFear(h, 4 * dt, 'ogre');
      });
      if (m.type === 'spider') {
        m.webT = (m.webT || 0) - dt;
        if (m.webT <= 0) {
          m.webT = 3; const t = fighters[0];
          const hold = mods.spiderNest ? 2 : 0;   // 1.18 Pajęcze gniazdo: 3x3 without the trait (as before) and every spider's web 2 s longer
          if (mods.spiderNest || t3(m)) { const tiles = areaOf(m); fl.zones.push({ keys: new Set(tiles.map(q => key(q[0], q[1]))), tiles, until: fl.time + 3 + hold, src: m }); }
          if (t) { t.slowUntil = fl.time + 2.5 + hold; sawAdd(t, ['web', 'spider', 'monster']); if (!t.spiderSaid) { t.spiderSaid = true; say(t, pick(SAY.spider), 2, null, 'loud'); } }
        }
      }
      let dmgIn = 0;
      fighters.forEach(h => { dmgIn += h.T.dps * h.R.dps * (h.type === 'warrior' ? 1.4 : 1) * (raging(h) ? 1.5 : 1) * vowK(h) * nemK(h, m) * (1 + 0.25 * gearR(h, 'weapon') * itemPow(h)) * dt; });   // a weapon from your loot cuts monsters down faster; 1.05: so does fury; 1.21: a vow; 1.23: a grudge
      hurtMonster(m, dmgIn);
    });
  }
