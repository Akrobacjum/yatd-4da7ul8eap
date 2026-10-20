
  /* ================= Esencja ================= */
  // Carried over between waves, refilled after each wave, and during a wave fed by pain, fear and souls.
  let orbs = [];
  function regenParts() { const base = S.regenBase / 10 * mods.regen; return { base, total: base }; }
  // Prototype 1.01: no purse limit. heart = the part the hungry heart took first.
  // 1.02 (author): two separate flights. While a combo lasts, violet Groza orbs fly from the heroes into the Groza box of the
  // equation, in real time (grozaOrbs); when the chain is cashed in, red Esencja orbs leave the result box (from = 'eq') for
  // the big number (the purse) and the ♥ (the heart's share).
  const ORB_MAX = 90;
  function gainEssence(from, amt, stat, heart) {
    if (!fl || !((amt || 0) + (heart || 0) > 0)) return;
    const before = Math.floor(fl.essence);
    if (amt > 0) { fl.essence += amt; fl.stats[stat] = (fl.stats[stat] || 0) + amt; }
    if (from === 'eq') {
      const e = $('#eq-e'), r = e && e.getBoundingClientRect();
      if (r && r.width) {
        const put = (n, to) => { for (let i = 0; i < n && orbs.length < ORB_MAX; i++) orbs.push({ ax: r.left + r.width * (0.25 + 0.5 * Math.random()), ay: r.top + r.height * (0.3 + 0.4 * Math.random()), t: -i * 0.035 - Math.random() * 0.05, dur: 0.5 + Math.random() * 0.2, to }); };
        put(Math.min(24, Math.max(heart > 0 ? 1 : 0, Math.round((heart || 0) / 0.6))), 'heart');
        put(Math.min(30, Math.max(amt > 0 ? 1 : 0, Math.round((amt || 0) / 0.4))), 'score');
      }
    }
    if (Math.floor(fl.essence) !== before) { updateTray(); essPulse(); }
  }
  // violet orbs carrying Groza from a hero to the equation (the Groza number there grows as they land)
  function grozaOrbs(h, g) {
    if (!fl || !h || !(g > 0) || reduceMotion) return;
    if (h.gOrbC !== fl.chain) { h.gOrb = 0; h.gOrbC = fl.chain; }   // a crumb left from the last chain stays there
    h.gOrb = (h.gOrb || 0) + g;
    const n = Math.min(5, Math.floor(h.gOrb / 0.08)); if (!n) return;
    const v = h.gOrb / n; h.gOrb = 0;
    const p = heroScreen(h), C = fl.chain;
    for (let i = 0; i < n; i++) {
      if (orbs.length >= ORB_MAX) { break; }
      orbs.push({ x: p.x + (Math.random() - 0.5) * 12, y: p.y + (Math.random() - 0.5) * 12, t: -i * 0.06, dur: 0.45 + Math.random() * 0.2, to: 'groza', v, c: C });
      if (C) C.fly = (C.fly || 0) + v;   // counted per chain, so orbs still flying from a cashed-in chain never dent the next one
    }
  }
  const lootMult = h => 1 + 0.25 * Math.min(4, h.inv.length);   // a hero carrying gear sheds more when hurt
  function regenTick(dt) {
    const r = regenParts();
    if (r.total <= 0) return;
    const before = Math.floor(fl.essence);
    const gain = r.total * dt;
    fl.essence += gain; fl.stats.essBase += gain;
    if (Math.floor(fl.essence) !== before) { updateTray(); essPulse(); }
  }
  function essPulse() {}   // Prototype 1.0: the big number counts up by itself (tickScore); an orb landing in it gives it a knock (scoreHit)
  function scoreHit() { const e = $('#h-score'); if (!e || realNow - (scoreHit.t || -1) < 0.1) return; scoreHit.t = realNow; e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); }
  function grozaHit() { const e = $('#eq-g'); if (!e || realNow - (grozaHit.t || -1) < 0.09) return; grozaHit.t = realNow; e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); }
  function heartHit() { const e = $('#h-heart'); if (!e || realNow - (heartHit.t || -1) < 0.12) return; heartHit.t = realNow; e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); }

  /* ================= sound ================= */
  let actx = null;
  function sfx(type) {
    if (!(S.volume > 0)) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const cfg = { warn: [880, 'triangle', 0.12, 1320], go: [1480, 'square', 0.04], crit: [220, 'square', 0.22, 55], ok: [620, 'sine', 0.14, 520], miss: [150, 'sawtooth', 0.18, 70] }[type];
      if (!cfg) return;
      const t = actx.currentTime, g = actx.createGain(), o = actx.createOscillator();
      o.type = cfg[1]; o.frequency.setValueAtTime(cfg[0], t);
      if (cfg[3]) o.frequency.exponentialRampToValueAtTime(cfg[3], t + cfg[2]);
      g.gain.setValueAtTime(S.volume * (type === 'go' ? 0.08 : 0.2), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + cfg[2]);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + cfg[2] + 0.02);
    } catch (e) {}
  }

  // Vibration on phones that have it (Android); a game setting turns it off.
  function buzz(ms) { if (!S.haptics || !navigator.vibrate) return; try { navigator.vibrate(ms); } catch (e) {} }

  /* ================= skill checks ================= */
  // A hero walks into a ready trap: time slows and a bar appears at the trap. Tap the MAP on green (graze 70%)
  // or red (critical 180%, may kill). Taps on buttons and the tray never answer a check. No tap = the trap waits.
  const CHECK_DUR = 1.15;
  const CHECK_PREP = 0.5;
  const BASE_DMG = { spikes: 35, arrows: 25, fire: 20, gate: 60, powder: 60, mimic: 40, trapdoor: 20, goblin: 35, archer: 22, spider: 30, ogre: 45, ghost: 5, web: 0, cage: 0, portrait: 0, shaman: 0,
    eyes: 0, bones: 0, mirror: 0, creak: 0, coffin: 0, musicbox: 0, shade: 0, bats: 6 };
  function predictedDmg(it, pw) {
    const D = S.dmg, burn = 18 * D;   // the skull counts the burn too
    pw *= lvlPow(it) * mods.pactPower;   // the skull knows about upgrades too
    if (it.type === 'fire') return 20 * D * mods.fireDmg * pw * trapBoost(it) + burn * (it.lvl >= 3 ? 2 : 1);
    if (it.type === 'arrows') return 25 * D * pw * trapBoost(it) + (mods.arrowBurn ? burn : 0);
    if (it.type === 'spikes') return 35 * D * mods.spikeDmg * (1 + 0.04 * (run.stacks.hunger || 0) * mods.hunger) * pw * trapBoost(it) + (it.lvl >= 3 ? burn : 0);
    const m = { spikes: mods.spikeDmg, gate: mods.gateCrush, mimic: mods.mimicDmg, trapdoor: mods.fallDmg }[it.type] || 1;
    return BASE_DMG[it.type] * D * m * (MONSTERS[it.type] ? it.power : 1) * pw * trapBoost(it);
  }
  function heroesInArea(it) {
    if (it.type === 'ghost') { const r = roomOf(it.x, it.y); return alive().filter(h => h.room === r); }
    const keys = new Set(areaOf(it).map(t => key(t[0], t[1]))); return alive().filter(h => keys.has(key(h.tx, h.ty)));
  }
  function checkWanted(it) {
    if (!ACTIVE[it.type] || it.disabled || it.cd > 0 || it.jamUntil > fl.time || (it.skipUntil || 0) > fl.time || (MONSTERS[it.type] && it.hp <= 0)) return false;
    if (it.type === 'gate') return alive().some(h => (h.tx === it.x && h.ty === it.y) || h.path.slice(0, 2).some(p => p[0] === it.x && p[1] === it.y));
    if (it.type === 'shaman') {
      const r = roomOf(it.x, it.y); let need = false;
      fl.items.forEach(m => { if (MONSTERS[m.type] && m !== it && m.hp > 0 && m.hp < 0.6 * m.max && roomOf(m.x, m.y) === r) need = true; });
      return need;
    }
    if (it.type === 'ghost') return alive().some(h => { const p = heroPos(h); return h.room === roomOf(it.x, it.y) && Math.hypot(p.x - it.gx, p.y - it.gy) <= 3; });
    if (it.type === 'trapdoor') return heroesInArea(it).some(h => !(h.fellFrom && h.fellFrom.has(it)));
    if (it.type === 'cage') return heroesInArea(it).some(h => !caged(h));   // v14.1: the one inside does not trigger it again
    return heroesInArea(it).length > 0;
  }
  const NO_KILL = { web: 1, shaman: 1, cage: 1, portrait: 1, eyes: 1, bones: 1, mirror: 1, creak: 1, coffin: 1, musicbox: 1, shade: 1 };
  // what reaches the hero after his own protection: a talisman's ward, armour (acid halves both), a curse (+30%)
  function takenK(h, it) {
    const acid = inB('acid', h.room) ? 0.5 : 1, ar = gearR(h, 'armor');
    return (fl.time < h.wardUntil && !(it.type === 'arrows' && it.lvl >= 3) ? 1 - h.wardK * acid : 1) * (ar ? 1 - (1 - Math.pow(0.92, ar * itemPow(h))) * acid : 1) * (h.cursed ? 1.3 : 1);
  }
  const lethalFor = (it, pw) => !NO_KILL[it.type] && heroesInArea(it).some(h => (it.type !== 'gate' || (h.tx === it.x && h.ty === it.y)) && h.hp + h.shield <= predictedDmg(it, pw) * trapMult(h, it.type, it) * takenK(h, it));
  const SERIES_MAX = 6;
  // Shapes: a bar (blades and mechanisms), a ring (fire, the portrait, webs), a pulse closing in (falls and cages), a swinging
  // needle (monsters, three passes). The zones sit at a random spot of the shape. The needle is faster against stronger heroes
  // (the strongest one in the area); an upgraded trap gets wider zones (level 2: +15%, level 3: +30%).
  // v14: seven shapes, every kind of element has its own: bar (blades and bars), dial (fire), fuse (powder: the spark speeds up),
  // double dial (scares: two chances), spiral (webs and spiders), closing ring (falls and cages), pendulum (monsters).
  const CHECK_SHAPE = { spikes: 'bar', arrows: 'bar', gate: 'bar', mimic: 'bar', powder: 'fuse', fire: 'ring', portrait: 'double', ghost: 'double', web: 'spiral', spider: 'spiral',
    trapdoor: 'pulse', cage: 'pulse', goblin: 'swing', archer: 'swing', ogre: 'swing', shaman: 'swing',
    eyes: 'double', bones: 'pulse', mirror: 'ring', creak: 'bar', coffin: 'fuse', musicbox: 'spiral', shade: 'double', bats: 'swing' };   // v15.1
  const SHAPE_NAME = { bar: 'pasek', ring: 'tarcza', fuse: 'lont', double: 'podwójna tarcza', spiral: 'spirala', pulse: 'krąg', swing: 'wahadło' };
  const SHAPE_DUR = { bar: 1, ring: 1.15, pulse: 0.95, swing: 1.55, fuse: 1.25, double: 1.2, spiral: 1.25 }, LVL_ZONE = [1, 1, 1.15, 1.3];
  // Swing: there and back (two passes). It speeds up towards the middle and slows near the ends (±35%), a pendulum.
  // v12 had three passes of a full pendulum (20% crits in the real run), v12.1 two slow ones (86%, "too slow").
  const SWING_PASSES = 2, SWING_EASE = 0.35;
  const checkPos = (c, u) => {
    u = clamp(u, 0, 1);
    if (c.shape === 'fuse') return Math.pow(u, 1.7);   // the spark crawls, then races
    if (c.shape !== 'swing') return u;
    const k = Math.min(SWING_PASSES - 1, Math.floor(u * SWING_PASSES)), s = u * SWING_PASSES - k;
    const q = s - SWING_EASE * Math.sin(2 * Math.PI * s) / (2 * Math.PI);
    return k % 2 ? 1 - q : q;
  };
  // A stronger hero makes the needle quicker: +1.5% "difficulty" a level, the needle by its square root (level 11 +7%, level 21 +14%).
  const CHECK_LV_SPEED = 0.015;
  // 1.05 (testers: no time to watch the heroes, a check every 2-5 s and the world standing ~38% of a wave; the author's rules):
  // one check decides how a trap works for the rest of the wave. A crit or a graze is remembered and the trap then fires by
  // itself with that strength; a miss (or no tap) asks again the next time it fires. A hit that would kill always asks (the
  // skull), and letting that one go switches the trap off until it can hit without killing.
  const memOf = it => it.mem && it.mem.wave === run.wave ? it.mem.res : null;
  const memPw = it => { const m = memOf(it); return m === 'crit' ? mods.critPw : m === 'ok' ? mods.okPw : 0; };
  function skullHolds(it) {   // switched off at a skull: it stays off while its hit (the remembered one, or a graze) would kill
    if (!it.skullOff) return false;
    if (lethalFor(it, memPw(it) || mods.okPw)) return true;
    it.skullOff = false; return false;
  }
  const needsCheck = it => { const pw = memPw(it); return !pw || lethalFor(it, pw); };
  function checkTick() {
    if (fl.check || fl.ending !== null) return;
    // what already has this wave's answer fires by itself; with a finger held on the map (fast-forward) everything does,
    // and what has no answer yet fires at graze strength (v14)
    for (const it of fl.items.values()) {
      if (!checkWanted(it) || skullHolds(it)) continue;
      const pw = memPw(it);
      if (ff) { if (fire(it, pw || mods.okPw)) { fl.stats.autoFires = (fl.stats.autoFires || 0) + 1; if (!pw) bt(it.type).ok++; } }
      else if (pw && !lethalFor(it, pw) && fire(it, pw)) { fl.stats.memFires = (fl.stats.memFires || 0) + 1; bt(it.type).memFires = (bt(it.type).memFires || 0) + 1; }
    }
    if (ff || fl.time < fl.checkGap) return;
    for (const it of fl.items.values()) {
      if (!checkWanted(it) || skullHolds(it) || !needsCheck(it)) continue;
      const inA = heroesInArea(it), shape = CHECK_SHAPE[it.type] || 'bar';
      const maxL = inA.reduce((a, h) => Math.max(a, h.lvl), 1);
      const kz = S.checkDiff * (1 + 0.02 * Math.min(10, run.wave - 1)) / LVL_ZONE[it.lvl || 1], ks = S.checkDiff * (1 + CHECK_LV_SPEED * Math.min(20, maxL - 1));
      const gw = 0.4 / kz, rw = 0.09 / kz;
      // where the zones sit: anywhere on the shape (the critical strip before or after the green one; in a pulse always inside)
      const lo = shape === 'swing' ? 0.08 : 0.12, start = lo + Math.random() * Math.max(0, 0.96 - lo - gw - rw);
      let g0, g1, r0, r1, z2 = null;
      if (shape === 'double') {   // two smaller windows, one in each half of the dial: two chances, less room
        const g = gw * 0.7, r = rw * 0.85, a = 0.08 + Math.random() * Math.max(0, 0.46 - 0.08 - g - r), b = 0.52 + Math.random() * Math.max(0, 0.94 - 0.52 - g - r);
        g0 = a; g1 = a + g; r0 = g1; r1 = r0 + r; z2 = { g0: b, g1: b + g, r0: b + g, r1: b + g + r };
      } else if (shape !== 'pulse' && Math.random() < 0.5) { r0 = start; r1 = r0 + rw; g0 = r1; g1 = g0 + gw; }
      else { g0 = start; g1 = g0 + gw; r0 = g1; r1 = r0 + rw; }
      // Seria: everything else that is ready to fire right now joins this check, so one tap answers the whole volley
      const extra = [];
      if (S.series) for (const o of fl.items.values()) { if (o !== it && extra.length < SERIES_MAX && checkWanted(o) && !skullHolds(o) && needsCheck(o)) extra.push(o); }
      const all = [it].concat(extra);
      fl.check = { it, extra, shape, maxL, t0: realNow + CHECK_PREP, prepT0: realNow, go: false, dur: CHECK_DUR / Math.sqrt(ks) * SHAPE_DUR[shape], g0, g1, r0, r1, z2, rot: Math.random() * Math.PI * 2,
        lethalOk: all.some(o => lethalFor(o, mods.okPw)), lethalCrit: all.some(o => lethalFor(o, mods.critPw)), result: null, resT: 0 };
      fl.stats.checks++; all.forEach(o => { bt(o.type).checks++; });
      if (extra.length) { fl.stats.volleys = (fl.stats.volleys || 0) + 1; fl.stats.volleyTraps = (fl.stats.volleyTraps || 0) + extra.length; }
      fl.check.note = [inA.some(h => h.state === 'disarm' && h.item === it) ? 'rozbraja ją!' : '',
        inA.some(h => h.crystal) ? 'niesie kryształ!' : '',
        it.type === 'spikes' && inA.some(held) ? 'stoi: ×1,5' : '',
        inA.some(caged) ? 'w klatce +50%' : '',
        inA.some(webbed) && it.type !== 'web' ? 'w sieci +30%' : '',
        it.type === 'spikes' && mods.stickySpikes && inA.some(webbed) ? 'lepkie kolce ×' + (1 + mods.stickySpikes) : '',
        calmReady(it) ? 'cisza ×' + (1 + mods.calmStorm) : '',
        TRAPS[it.type] && mods.bloodRite && fl.stats.kills ? 'krew ×' + fmt2(1 + mods.bloodRite * fl.stats.kills) : '',
        inA.some(h => h.type === 'warrior' && fl.time < h.shieldUpUntil) ? 'tarcza -' + Math.round((1 - Math.min(...inA.filter(h => h.type === 'warrior' && fl.time < h.shieldUpUntil).map(h => h.R.shield))) * 100) + '%' : '',
        inA.some(h => h.fear >= 0.6 * h.courage) ? 'blisko ucieczki' : '',
        inA.some(h => fl.time < h.wardUntil) ? 'talizman' : '',
        maxL >= 12 ? 'poz. ' + maxL + ': szybciej' : ''].filter(Boolean).join(' · ');
      sfx('warn');
      if (run.checkHints > 0 && run.tut < 0) { run.checkHints--; setHint('Skill check: po "Uwaga!" stuknij w MAPĘ. Obwódka = draśnięcie, pełne pole = krytyk, czaszka = ktoś zginie. Trafiony wynik pułapka pamięta do końca fali (znaczek na polu) i dalej bije sama.'); }
      if (run.tut >= 0) tutEvent('check');
      return;
    }
  }
  function resolveCheck(p) {   // p (tests): a position on the shape; a tap: where the needle is right now
    const c = fl.check;
    if (!c || c.result) return;
    if (p === undefined) { if (realNow < c.t0) return; p = checkPos(c, (realNow - c.t0) / c.dur); }
    let res = 'miss', pw = 0;
    const z = c.z2;
    if ((p >= c.r0 && p <= c.r1) || (z && p >= z.r0 && p <= z.r1)) { res = 'crit'; pw = mods.critPw; }
    else if ((p >= c.g0 && p <= c.g1) || (z && p >= z.g0 && p <= z.g1)) { res = 'ok'; pw = mods.okPw; }
    c.result = res; c.resT = realNow; c.p = p;
    const all = [c.it].concat(c.extra || []);
    // 1.05: the answer stays for the rest of the wave (a skull check of a trap that already had one decides only this hit)
    if (res !== 'miss') all.forEach(o => { if (!memOf(o)) o.mem = { res, wave: run.wave }; o.skullOff = false; });
    tl('ch', c.it.type, c.it.x, c.it.y, res, heroesInArea(c.it).length, all.length - 1, c.maxL || 1, Math.round((p - (c.r0 + c.r1) / 2) * 100));   // v36: the strongest level near it and how far from the red strip the tap landed (in % of the shape)
    sfx(res); if (res === 'crit') buzz(25);
    all.forEach(o => { bt(o.type)[res === 'crit' ? 'crit' : res === 'ok' ? 'ok' : 'miss']++; });
    if (run.tut >= 0) tutEvent('resolved');
    // 1.04: a tester grazed 37 times in a row and never aimed at the crit: after 6 checks without one, say it once a run
    if (res === 'crit') run.noCrit = 0; else run.noCrit = (run.noCrit || 0) + 1;
    if (run.noCrit >= 6 && !run.critHinted) { run.critHinted = true; setHint('Celuj w pełne pole: krytyk bije ok. 2,5 raza mocniej niż draśnięcie (obwódka).'); }
    if (res === 'miss') {
      all.forEach(o => { o.cd = cdOf(o.type) * 0.5 || 1; });
      floatTile(c.it.x, c.it.y, 'Pudło', '#a69bbb', 15, -0.8); fl.stats.checkMiss++;
      return;
    }
    const victims = new Set();
    all.forEach(o => heroesInArea(o).forEach(h => victims.add(h)));
    fire(c.it, pw);
    (c.extra || []).forEach(o => { if (fl.items.get(key(o.x, o.y)) === o && !o.disabled && !(o.jamUntil > fl.time) && !(MONSTERS[o.type] && o.hp <= 0)) fire(o, pw); });
    if (res === 'crit') {
      fl.stats.checkCrit++; shake = Math.max(shake, 0.22); floatTile(c.it.x, c.it.y, all.length > 1 ? 'SERIA: KRYTYK!' : 'KRYTYK!', '#ff6b6b', 19, -1.2);
      victims.forEach(h => {   // a critical knocks a piece of gear out of the hero's pack (v13: no Esencja for it, so loot is a risk again)
        if (h.dead || !h.inv.length) return;
        const lost = h.inv.splice(rand(0, h.inv.length - 1), 1)[0];
        const q = heroPos(h); burst(q.x, q.y, rarColor(lost.r), 10);
        floatHero(h, G3(HITEMS[lost.type].g, 'Wypadł', 'Wypadła', 'Wypadły') + ' ' + HITEMS[lost.type].name + '!', '#c3b2ff', 14, -1.0);
      });
    }
    else { fl.stats.checkOk++; floatTile(c.it.x, c.it.y, 'Draśnięcie', '#8be38f', 14, -1.2); }
  }
  function skipCheck() {
    const c = fl.check; if (!c || c.result) return;
    c.result = 'skip'; c.resT = realNow; fl.stats.checkSkip++;
    // 1.05: let go at a skull, the trap stays quiet while its hit would kill; otherwise it asks again next time
    [c.it].concat(c.extra || []).forEach(o => { o.skipUntil = fl.time + 1.2; bt(o.type).skip++; if ((c.lethalOk || c.lethalCrit) && lethalFor(o, memPw(o) || mods.okPw)) { o.skullOff = true; fl.stats.skullOff = (fl.stats.skullOff || 0) + 1; } });
    tl('ch', c.it.type, c.it.x, c.it.y, 'skip', heroesInArea(c.it).length);
    if (c.lethalOk && c.lethalCrit) { fl.stats.skipLethal++; bt(c.it.type).skipLethal++; }
  }
  function clearCheck() { fl.check = null; fl.checkGap = fl.time + 0.25; }
  function updateCheck() {
    const c = fl.check;
    if (!c) return;
    if (c.result) { if (realNow - c.resT > 0.35) clearCheck(); return; }
    if (!c.go && realNow >= c.t0) { c.go = true; sfx('go'); }
    if ((realNow - c.t0) / c.dur >= 1) skipCheck();
  }

  /* ================= simulation step (game time) ================= */
  const heroCode = h => h.gone ? 'g' : h.state === 'caged' ? 'c' : h.crystal ? 'k' : h.fleeing ? 'f' : h.state === 'rest' ? 'r' : h.state === 'fight' ? 'b' : h.state === 'disarm' ? 'x' : h.state === 'boss' ? 'h' : h.lost ? 'l' : fl.time < h.panicUntil ? 'p' : 'w';
  function takeCrystal(atHeart) {
    const P = fl.party, carrier = atHeart.slice().sort((a, b) => b.hp - a.hp)[0];
    if (!carrier) return;
    carrier.crystal = true; carrier.fleeing = false; P.carrierId = carrier.id; P.plan = 'escape'; P.steal = 0;
    fl.stats.crystalTaken++; tl('ct', carrier.id); buzz(70);
    floatTile(fl.heart.x, fl.heart.y, 'Kryształ skradziony!', '#ff6b6b', 18, -1.2); shake = Math.max(shake, 0.2);
    say(carrier, pick(SAY.steal), 4, 2.2);
    alive().forEach(h => { if (h.state === 'boss' || h.state === 'rest' || h.state === 'talk') h.state = 'walk'; h.needPlan = true; if (h !== carrier && Math.random() < 0.4) say(h, pick(SAY.escape), 2); });
    if (!tutPop('theft')) setHint('Kryształ skradziony! Zabij niosącego, zanim dojdzie do wyjścia, a kryształ wróci do serca.');
  }
  const stealNeed = () => 4 / Math.pow(2, mods.glass);   // Szklane serce: the crystal comes loose 2 times faster per copy
  function step(dt) {
    fl.time += dt;
    fl.cardMult = cardMultNow();
    fl.quietCheckT = (fl.quietCheckT || 0) - dt;
    if (fl.quietCheckT <= 0) { fl.quietCheckT = 0.1; fl.quiet = quietNow(); }   // v15.1: checked 10 times a second (was 5)
    if (fl.quiet) { fl.quietT += dt; if (autoFFOn()) fl.autoFFTime += dt; } else { fl.quietT = 0; fl.cclock += dt; }   // the combo clock waits while nothing happens
    chainTick();   // Prototype 1.01: a combo chain that ran out is cashed in
    if (mods.hauntedGallery) fl.portraitRooms = portraitRooms();
    if (fl.echoQ && fl.echoQ.length) {   // Echo mechanizmów
      const due = fl.echoQ.filter(e => e.at <= fl.time);
      fl.echoQ = fl.echoQ.filter(e => e.at > fl.time);
      due.forEach(e => { if (fl.items.get(key(e.it.x, e.it.y)) === e.it && fire(e.it, e.pw, { echo: true })) { floatTile(e.it.x, e.it.y, 'Echo!', '#ffd27a', 14, -1.1); fl.stats.echoes = (fl.stats.echoes || 0) + 1; } });
    }
    if (ff) fl.stats.ffTime += dt;
    if ((UI.speed || 1) > 1) fl.stats.speedTime = (fl.stats.speedTime || 0) + dt;
    if (fl.queue.length) {
      // the rest of the party waits at the door while the ones inside run out; then they go in as a new group
      const routed = fl.party.plan === 'flee' && fl.heroes.length > 0;
      if (routed && alive().length && (fl.holdT = (fl.holdT || 0) + dt) < 8) { /* waiting outside */ }
      else {
        if (routed) regroupAtDoor();
        fl.spawnTimer -= dt;
        if (fl.spawnTimer <= 0) { spawnHero(fl.queue.shift()); fl.spawnTimer = 0.3; }   // they come in together
      }
    }
    fl.items.forEach(it => {
      if (it.cd > 0) { it.cd = Math.max(0, it.cd - dt); if (it.detected && it.cd <= 0.3 && it.cd + dt > 0.3) fl.threatDirty = true; }
      if (it.jamUntil && it.jamUntil <= fl.time && it.jamUntil > fl.time - dt - 1e-6) fl.threatDirty = true;
      if (it.anim > 0) it.anim = Math.max(0, it.anim - dt);
    });
    if (fl.zones.length) fl.zones = fl.zones.filter(z => z.until > fl.time);
    regenTick(dt);
    if (fl.silence) fl.stats.silenceTime += dt;
    if (fl.threatDirty) rebuildThreat();
    fl.doors.forEach(d => { if (d.wasClosed && d.closedUntil <= fl.time) { d.wasClosed = false; replanAll(); } });
    fl.party.thinkT -= dt;
    if (fl.party.thinkT <= 0) { partyThink(0.25 - fl.party.thinkT); fl.party.thinkT = 0.25; checkThresholds(run.total + fl.score); }
    if (fl.tl) {   // once a second: where everyone is, how hurt and how scared (for the test log)
      fl.tl.smpT -= dt;
      if (fl.tl.smpT <= 0 && fl.tl.smp.length < 1200) {
        fl.tl.smpT = 1;
        const row = [Math.round(fl.time)];
        fl.heroes.forEach(h => { if (!h.dead && !h.fled) row.push(h.id, h.tx, h.ty, Math.round(h.hp), Math.round(h.fear), heroCode(h)); });
        fl.tl.smp.push(row);
      }
    }
    fl.disarmKeys = null;
    fl.heroes.forEach(h => { if (h.state === 'disarm' && h.item && !h.dead && h.item.detected) { fl.disarmKeys = fl.disarmKeys || new Set(); areaOf(h.item).forEach(t => fl.disarmKeys.add(key(t[0], t[1]))); } });
    // 1.04: the party gathers at the door while "Fala N" shows, then goes in (testers met the first check 0,1-0,9 s after
    // the start and often missed it): no hero moves and no trap fires until then
    if (!fl.gateOpen && fl.time >= GATE_T) { fl.gateOpen = true; const L = alive()[0]; if (L) say(L, pick(SAY.gate), 2, 1.6); }
    if (fl.gateOpen) {
      fl.heroes.forEach(h => { if (!h.dead && !h.fled) updateHero(h, dt); });
      checkTick();
    }
    monstersTick(dt);
    // at the heart: they pry a crystal loose while the heart burns them
    const P = fl.party, atHeart = alive().filter(h => h.state === 'boss');
    if (atHeart.length && P.plan === 'assault' && fl.ending === null) {
      P.steal += dt * (1 + 0.5 * (atHeart.length - 1));
      fl.heartHit = 0.12;
      damage(atHeart[0], 5 * dt, HEART);
      // 1.05 (author: wave 1 should not be able to take a crystal even from an empty dungeon): the heart will not let the first
      // party have it. It burns their courage and the crystal does not come loose; sooner or later they run
      // (a replay of an empty dungeon: without giving up they circled the heart for 100 s, panicking and coming back)
      if (run.wave === 1) {
        atHeart.forEach(h => addFear(h, 0.3 * h.courage * dt, null, 'heart'));
        if (P.steal >= 0.85 * stealNeed()) {
          P.steal = 0.85 * stealNeed(); fl.stats.repelled = 1;
          say(atHeart[0], pick(SAY.heartRepel), 4, 2.2); floatTile(fl.heart.x, fl.heart.y, 'Serce ich odpycha!', '#ff9ab0', 15, -1);
          atHeart.forEach(h => { addFear(h, 0.4 * h.courage, null, 'heart'); if (!h.fleeing && !h.dead) startFlee(h); });
          P.plan = 'leave'; alive().forEach(h => { h.needPlan = true; if (h.state === 'rest' || h.state === 'talk' || h.state === 'boss') h.state = 'walk'; });
          const L = alive().find(h => !h.fleeing); if (L) say(L, pick(SAY.leave), 3);
        }
      }
      // 1.04: the heart's burn can kill the last one prying in this very tick (a bot found it: the step threw, the game froze)
      if (P.steal >= stealNeed()) { const by = alive().filter(h => h.state === 'boss'); if (by.length) takeCrystal(by); }
    }
    if (fl.heartHit > 0) fl.heartHit -= dt;
    if (!fl.fearless && fl.ending === null && fl.time >= S.waveTime) becomeImpatient();
    if (fl.ending === null && fl.time >= S.waveTime + 60) {   // safety net: nobody stays forever
      fl.heroes.forEach(h => { if (!h.dead && !h.fled) { h.gone = false; heroExit(h); } });
    }
    if (fl.ending === null && fl.queue.length === 0 && fl.heroes.length && fl.heroes.every(h => h.dead || h.fled)) fl.ending = 1.2;
    fl.heroes.forEach(h => { if (h.bubble && h.bubble.until <= fl.time) h.bubble = null; });
  }

  /* ================= main loop (real time) ================= */
  function timeScale() {
    if (!fl || modalOpen || fl.phase !== 'raid' || paused) return 0;
    if (fl.check && !fl.check.result) return 0.06;
    const sp = 1;   // v14: no speed button; holding the finger speeds up
    if (ff) return Math.max(S.ffSpeed, sp);
    return Math.max(sp, ffAuto);   // nothing happening: the game hurries on by itself (1.02: speeds up smoothly, slows down at once)
  }
  let ffAuto = 1;
  const GATE_T = 1.8;   // s at the door before a wave goes in
  const autoFFOn = () => S.autoFF > 1 && fl && fl.phase === 'raid' && fl.quietT > 0.3 && !fl.check && fl.gateOpen;   // v15.1: after 0,3 s of quiet (was 0,8)
  // "Quiet" = nobody near anything of yours: no hero within a step of the tiles a ready trap, a monster or loot reaches
  // (1.02; up to 1.01 the whole room counted), nobody fighting, caged, disarming, at the heart or about to rush a room.
  // Resting after a retreat counts as quiet.
  const QUIET = { r: 1, cd: 1 };   // 1.02: steps from a hero to anything of yours that still count as quiet (0 = the old room rule)
  const quietNow = () => !quietWhy();
  function quietWhy() {   // 1.02: names what keeps it from being quiet (null = quiet); the tests read it
    if (fl.ending !== null) return 'ending';
    if (fl.party.prep) return 'prep';
    const crew = alive();
    if (!crew.length) return 'empty';
    for (const h of crew) {
      if (h.state === 'fight' || h.state === 'disarm' || h.state === 'boss' || h.state === 'free') return h.state;
      if (caged(h)) return 'caged';
    }
    const live = it => (ACTIVE[it.type] && !it.disabled && !(MONSTERS[it.type] && it.hp <= 0)) || isLoot(it.type);
    if (!QUIET.r) {   // the old rule (up to 1.01): a whole room is busy if anything of yours is in it or reaches into it
      const busyRooms = new Set();
      fl.items.forEach(it => { if (live(it)) { busyRooms.add(slotRoom(it.type, it.x, it.y)); areaOf(it).forEach(t => busyRooms.add(roomOf(t[0], t[1]))); } });
      for (const h of crew) {
        if (busyRooms.has(roomOf(h.tx, h.ty))) return 'room';
        if (h.nx !== null && busyRooms.has(roomOf(h.nx, h.ny))) return 'next';
      }
      return null;
    }
    // 1.02: busy only when a hero is a few steps from the tiles a trap, monster or loot actually reaches
    const hot = new Set();
    fl.items.forEach(it => { if (live(it) && !((it.cd || 0) > QUIET.cd)) { hot.add(it.y * WW + it.x); areaOf(it).forEach(t => hot.add(t[1] * WW + t[0])); } });   // a trap still reloading can't surprise anyone
    for (const h of crew) {
      let front = [[h.tx, h.ty]]; const seen = new Set([h.ty * WW + h.tx]);
      if (hot.has(h.ty * WW + h.tx)) return 'near';
      for (let d = 0; d < QUIET.r && front.length; d++) {
        const nxt = [];
        for (const [x, y] of front) for (const [dx, dy] of DIRS) {
          const tx = x + dx, ty = y + dy, k = ty * WW + tx;
          if (seen.has(k)) continue; seen.add(k);
          if (hot.has(k)) return 'near';
          if (passable(tx, ty)) nxt.push([tx, ty]);
        }
        front = nxt;
      }
    }
    return null;
  }
  let lastT = performance.now(), lastInputAt = 0, frameNo = 0;
  ['pointerdown', 'pointermove', 'wheel', 'keydown'].forEach(ev => window.addEventListener(ev, () => { lastInputAt = realNow; }, { capture: true, passive: true }));
  // 1.04: how smoothly the wave runs on the player's device goes to the wave log (a lag was reported in wave 1 only and could not
  // be reproduced here): the gaps between frames and the time the game's own code takes, counted only while the wave is on screen
  // and running (no pause, no card open). An error in a frame no longer stops the game (the next frame is always asked for) and
  // the first few go to the log too.
  // 1.05: also how long the world stood still under a skill check (ms of frames with a check up) and the wave's real running time
  const PERF = { gaps: [], js: [], last: 0, made0: 0, direct: 0, split: 0, errs: [], fz: 0, ms: 0 };
  function perfReset() { PERF.gaps = []; PERF.js = []; PERF.last = 0; PERF.made0 = TC.made || 0; PERF.direct = 0; PERF.split = 0; PERF.fz = 0; PERF.ms = 0; }
  const perfErr = e => {   // the message and where: the function and the line of the built file
    if (PERF.errs.length >= 8) return;
    const at = /at (?:(\S+) \()?.*?:(\d+):\d+\)?/.exec(String((e && e.stack) || '').split('\n')[1] || '');
    PERF.errs.push(String((e && e.message) || e).slice(0, 160) + (at ? ' @' + (at[1] || '?') + ':' + at[2] : ''));
  };
  window.addEventListener('error', ev => { if (!(ev.error && ev.error.seen)) perfErr(ev.error || ev.message); });
  function perfNote(now, js) {
    const on = !!(fl && fl.phase === 'raid' && !paused && !modalOpen && document.visibilityState !== 'hidden');
    if (on && PERF.last) { const g = Math.min(100, now - PERF.last); PERF.ms += g; if (fl.check && !fl.check.result) PERF.fz += g; }
    if (on && PERF.last && PERF.gaps.length < 40000) {
      PERF.gaps.push(Math.round((now - PERF.last) * 10) / 10); PERF.js.push(Math.round(js * 10) / 10);
      if (TC.direct) PERF.direct++;
      if (SPLIT.k > 0.5) PERF.split++;
    }
    PERF.last = on ? now : 0;
  }
  function perfSummary() {
    const n = PERF.gaps.length; if (n < 20) return null;
    const g = PERF.gaps.slice().sort((a, b) => a - b), j = PERF.js.slice().sort((a, b) => a - b), q = (a, k) => a[Math.min(a.length - 1, Math.floor(a.length * k))];
    let sum = 0; PERF.gaps.forEach(x => { sum += x; });
    return { frames: n, fps: Math.round(n / sum * 10000) / 10, gapMed: q(g, 0.5), gapP90: q(g, 0.9), gapMax: g[n - 1], slow: Math.round(g.filter(x => x > 50).length / n * 1000) / 10,
      jsMed: q(j, 0.5), jsP90: q(j, 0.9), jsMax: j[n - 1], realSec: Math.round(PERF.ms / 100) / 10, frozen: PERF.ms > 0 ? Math.round(PERF.fz / PERF.ms * 1000) / 10 : 0, dpr: DPR, w: Math.round(cw), h: Math.round(ch), direct: Math.round(PERF.direct / n * 100), split: Math.round(PERF.split / n * 100), chunks: (TC.made || 0) - PERF.made0 };
  }
  function frame(now) {
    const t0 = performance.now();
    try { frameBody(now); } catch (e) { perfErr(e); try { e.seen = 1; } catch (_) { } setTimeout(() => { throw e; }); }   // thrown again outside the loop: the console (and the tests) still see it
    perfNote(now, performance.now() - t0);
    requestAnimationFrame(frame);
  }
  function frameBody(now) {
    const rdt = Math.min(0.05, (now - lastT) / 1000); lastT = now; realNow += rdt;
    if (run && fl) {
      if (fl.check) { if (modalOpen || paused) { fl.check.t0 += rdt; fl.check.prepT0 += rdt; fl.check.resT += rdt; } else updateCheck(); }
      if (paused && fl.phase === 'raid') fl.stats.pauseTime += rdt;
      const ffWant = autoFFOn() ? S.autoFF : 1; ffAuto = ffWant > ffAuto ? Math.min(ffWant, ffAuto + rdt * 4) : ffWant;
      const dt = rdt * timeScale();
      if (dt > 0) {   // fast-forward runs in small steps so nothing tunnels through
        const n = Math.ceil(dt / 0.05);
        for (let i = 0; i < n && fl.phase === 'raid'; i++) step(dt / n);
      }
      if (fl.phase === 'raid' && fl.ending !== null && !modalOpen && !paused) {
        fl.ending -= rdt;
        if (fl.ending <= 0) { fl.ending = null; finishWave(); }
      }
      fl.items.forEach(it => { if (it.preview > 0) it.preview -= rdt; });
      fl.fx.forEach(f => { f.life -= rdt; });
      fl.fx = fl.fx.filter(f => f.life > 0);
      autoCam(rdt);
      updateHud();
      if (run.tut >= 0) tutTick();
    }
    orbs.forEach(o => { o.t += rdt; });
    if (orbs.some(o => o.t >= o.dur && o.to === 'score')) scoreHit();
    if (orbs.some(o => o.t >= o.dur && o.to === 'heart')) heartHit();
    if (orbs.some(o => o.t >= o.dur && o.to === 'groza')) { grozaHit(); orbs.forEach(o => { if (o.t >= o.dur && o.to === 'groza' && o.c) { o.c.fly = (o.c.fly || 0) - o.v; if (o.c.fly < 1e-6) o.c.fly = 0; } }); }
    orbs = orbs.filter(o => o.t < o.dur);
    floats.forEach(f => { f.life -= rdt; f.y -= 0.9 * rdt; });
    floats = floats.filter(f => f.life > 0);
    particles.forEach(p => {
      p.life -= rdt;
      if (p.ring) p.r += (p.maxR - p.r) * Math.min(1, rdt * 12);
      else { p.x += p.vx * rdt; p.y += p.vy * rdt; p.vx *= 0.9; p.vy *= 0.9; }
    });
    particles = particles.filter(p => p.life > 0);
    if (shake > 0) shake = Math.max(0, shake - rdt);
    // 1.03: building with nothing touched for 2 s: every other frame is enough (torches and treasure still move)
    const idle = fl && fl.phase === 'build' && realNow - lastInputAt > 2 && !movingKey && !holdInfo;
    if (!idle || (frameNo++ & 1)) draw();
  }

  /* ================= camera ================= */
  // Building: you move it. Raid: it follows the party and zooms out as they spread; a drag takes over for a few seconds.
  const fitScale = () => Math.min(cw / WW, ch / WH);
  const buildScale = () => clamp(cw / 12.5, fitScale(), 44);
  const MAX_S = 56;
  function clampCam() {
    const mw = WW * cam.s, mh = WH * cam.s;
    cam.ox = mw <= cw ? (mw - cw) / 2 : clamp(cam.ox, -cw * 0.3, mw - cw * 0.7);
    cam.oy = mh <= ch ? (mh - ch) / 2 : clamp(cam.oy, -ch * 0.3, mh - ch * 0.7);
  }
  function centerOn(tx, ty) { cam.ox = tx * cam.s - cw / 2; cam.oy = ty * cam.s - ch / 2; clampCam(); }
  function zoomAt(ns, sx, sy) {
    const wx = (sx + cam.ox) / cam.s, wy = (sy + cam.oy) / cam.s;
    cam.s = clamp(ns, fitScale() * 0.95, MAX_S);
    cam.ox = wx * cam.s - sx; cam.oy = wy * cam.s - sy; clampCam(); updateZoomBtn();
  }
  const toWorld = (sx, sy) => { const V = splitViews(), c = V ? V[splitSide(sx, sy)] : cam; return { x: (sx + c.ox) / c.s, y: (sy + c.oy) / c.s }; };
  function autoCam(rdt) {
    if (!fl || fl.phase !== 'raid') { SPLIT.k = 0; SPLIT.want = false; SPLIT.c = null; return; }
    if (paused) return;
    if (realNow < cam.manualUntil) { SPLIT.want = false; SPLIT.k = Math.max(0, SPLIT.k - rdt * 3); return; }   // a drag takes the camera: one screen
    const pts = alive().map(heroPos);
    if (fl.check && fl.check.it) pts.push({ x: fl.check.it.x + 0.5, y: fl.check.it.y + 0.5 });
    if (!pts.length) { pts.push({ x: fl.ent.x + 0.5, y: fl.ent.y + 0.5 }); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    const m = 3.2, bw = x1 - x0 + 2 * m, bh = y1 - y0 + 2 * m;
    // 1.04: with the tutorial coach at the top of the map the party is framed in the space below it (the door is at the top)
    const ins = coachInset, hc = ins + (ch - ins) / 2;
    const ts = clamp(Math.min(cw / bw, (ch - ins) / bh), fitScale(), 34);
    const k = 1 - Math.exp(-rdt * 2.6);
    const cx = (cam.ox + cw / 2) / cam.s, cy = (cam.oy + hc) / cam.s;
    const tx = (x0 + x1) / 2, ty = (y0 + y1) / 2;
    cam.s += (ts - cam.s) * k;
    const nx = cx + (tx - cx) * k, ny = cy + (ty - cy) * k;
    cam.ox = nx * cam.s - cw / 2; cam.oy = ny * cam.s - hc; clampCam();
    // the automatic camera keeps the dungeon in frame instead of showing the void around it
    const mw = WW * cam.s, mh = WH * cam.s, pad = cam.s * 0.6;
    if (mw > cw) cam.ox = clamp(cam.ox, -pad, mw - cw + pad);
    if (mh > ch) cam.oy = clamp(cam.oy, -pad - ins, mh - ch + pad);
    splitCam(rdt, Math.min(cw / bw, ch / bh));
  }
  // 1.03 (author's idea, like the LEGO games): when the party is in two places too far apart to fit on one screen at a
  // readable size (16 px a tile), a line through the middle of the screen, square to the line between the two groups, splits
  // it. Each half follows its group, one zoom fits both groups, and the halves slide back into one when the groups meet.
  const SPLIT = { k: 0, want: false, ang: 0, c: null, gid: new Map(), polys: null, tg: [null, null], cams: [null, null] };
  const SPLIT_T = 16;
  const splitSide = (sx, sy) => ((sx - cw / 2) * Math.cos(SPLIT.ang) + (sy - ch / 2) * Math.sin(SPLIT.ang)) > 0 ? 1 : 0;
  function splitPolys(ang) {   // the screen cut in two: [the side away from the direction, the side towards it]
    const n = [Math.cos(ang), Math.sin(ang)], c = [cw / 2, ch / 2], R = [[0, 0], [cw, 0], [cw, ch], [0, ch]];
    const cut = sg => {
      const out = [];
      for (let i = 0; i < 4; i++) {
        const p = R[i], q = R[(i + 1) % 4], dp = sg * ((p[0] - c[0]) * n[0] + (p[1] - c[1]) * n[1]), dq = sg * ((q[0] - c[0]) * n[0] + (q[1] - c[1]) * n[1]);
        if (dp <= 0) out.push(p);
        if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
      }
      return out;
    };
    return [cut(1), cut(-1)];
  }
  function polyCentroid(P) {
    let a = 0, x = 0, y = 0;
    for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], f = p[0] * q[1] - q[0] * p[1]; a += f; x += (p[0] + q[0]) * f; y += (p[1] + q[1]) * f; }
    return Math.abs(a) < 1e-6 ? [cw / 2, ch / 2] : [x / (3 * a), y / (3 * a)];
  }
  function rayOut(P, o, d) {   // how far from o along d until the polygon's edge
    let best = 1e9;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length], ex = q[0] - p[0], ey = q[1] - p[1], den = d[0] * ey - d[1] * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((p[0] - o[0]) * ey - (p[1] - o[1]) * ex) / den, u = ((p[0] - o[0]) * d[1] - (p[1] - o[1]) * d[0]) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
    }
    return best;
  }
  function splitCam(rdt, sMerge) {
    const crew = alive().filter(h => !h.gone);
    let want = S.split !== 0 && crew.length >= 2 && fitScale() < SPLIT_T && sMerge < SPLIT_T * (SPLIT.want ? 1.12 : 1);
    if (crew.length >= 2 && (want || SPLIT.k > 0)) {
      const P = crew.map(h => { const p = heroPos(h); return { x: p.x, y: p.y, id: h.id }; });
      const mean = g => ({ x: g.reduce((s, p) => s + p.x, 0) / g.length, y: g.reduce((s, p) => s + p.y, 0) / g.length });
      const group = (a, b) => {   // two groups by k-means, a few rounds
        let ga = [], gb = [];
        for (let r = 0; r < 4; r++) {
          ga = []; gb = [];
          P.forEach(p => ((p.x - a.x) ** 2 + (p.y - a.y) ** 2 <= (p.x - b.x) ** 2 + (p.y - b.y) ** 2 ? ga : gb).push(p));
          if (!ga.length || !gb.length) break;
          a = mean(ga); b = mean(gb);
        }
        return [ga, gb];
      };
      let G = SPLIT.c ? group(SPLIT.c[0], SPLIT.c[1]) : null;
      if (!G || !G[0].length || !G[1].length) {   // the two heroes farthest apart start it
        let best = -1, a = P[0], b = P[1];
        P.forEach(p => P.forEach(q => { const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (d > best) { best = d; a = p; b = q; } }));
        G = group({ x: a.x, y: a.y }, { x: b.x, y: b.y });
      }
      if (G[0].length && G[1].length) {
        const ca = mean(G[0]), cb = mean(G[1]);
        SPLIT.c = [ca, cb]; SPLIT.gid = new Map(); G[0].forEach(p => SPLIT.gid.set(p.id, 0)); G[1].forEach(p => SPLIT.gid.set(p.id, 1));
        const box = G.map(g => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; g.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }); return [x0, y0, x1, y1]; });
        if (fl.check && fl.check.it) {   // the trap of a running check belongs on the screen of the group it is closest to
          const t = { x: fl.check.it.x + 0.5, y: fl.check.it.y + 0.5 }, i = (t.x - ca.x) ** 2 + (t.y - ca.y) ** 2 <= (t.x - cb.x) ** 2 + (t.y - cb.y) ** 2 ? 0 : 1, B = box[i];
          box[i] = [Math.min(B[0], t.x), Math.min(B[1], t.y), Math.max(B[2], t.x), Math.max(B[3], t.y)];
        }
        const ta = Math.atan2(cb.y - ca.y, cb.x - ca.x);
        if (SPLIT.k <= 0) SPLIT.ang = ta;
        else { let d = ta - SPLIT.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; SPLIT.ang += clamp(d, -2.4 * rdt, 2.4 * rdt); }
        SPLIT.polys = splitPolys(SPLIT.ang);
        const m = 2.2, fit = [0, 1].map(i => {
          const B = box[i], P2 = SPLIT.polys[i], o = polyCentroid(P2);
          const ex = Math.min(rayOut(P2, o, [1, 0]), rayOut(P2, o, [-1, 0])), ey = Math.min(rayOut(P2, o, [0, 1]), rayOut(P2, o, [0, -1]));
          return { o, cx: (B[0] + B[2]) / 2, cy: (B[1] + B[3]) / 2, s: 0.9 * Math.min(ex / ((B[2] - B[0]) / 2 + m), ey / ((B[3] - B[1]) / 2 + m)) };
        });
        const s = clamp(Math.min(fit[0].s, fit[1].s), fitScale(), 34), kk = 1 - Math.exp(-rdt * 3);
        fit.forEach((f, i) => {
          const tg = { s, wx: f.cx, wy: f.cy, ax: f.o[0], ay: f.o[1] };
          const cur = SPLIT.k <= 0 || !SPLIT.cams[i] ? { s: cam.s, wx: (f.o[0] + cam.ox) / cam.s, wy: (f.o[1] + cam.oy) / cam.s, ax: f.o[0], ay: f.o[1] } : SPLIT.cams[i];
          SPLIT.cams[i] = { s: cur.s + (tg.s - cur.s) * kk, wx: cur.wx + (tg.wx - cur.wx) * kk, wy: cur.wy + (tg.wy - cur.wy) * kk, ax: cur.ax + (tg.ax - cur.ax) * kk, ay: cur.ay + (tg.ay - cur.ay) * kk };
        });
      } else want = false;
    } else want = false;
    SPLIT.want = want;
    SPLIT.k = clamp(SPLIT.k + (want ? 1 : -1) * rdt * 2, 0, 1);
    if (SPLIT.k <= 0) { SPLIT.c = null; SPLIT.cams = [null, null]; }
  }
  // the camera(s) to draw with: null = one screen; else for each half its outline and a camera blended in from the main one
  function splitViews() {
    if (!(SPLIT.k > 0.01) || !SPLIT.polys || !SPLIT.cams[0] || !SPLIT.cams[1]) return null;
    const e = SPLIT.k * SPLIT.k * (3 - 2 * SPLIT.k);
    return [0, 1].map(i => {
      const c = SPLIT.cams[i], mx = (c.ax + cam.ox) / cam.s, my = (c.ay + cam.oy) / cam.s;   // where the main camera has this half's anchor
      const s = cam.s + (c.s - cam.s) * e, wx = mx + (c.wx - mx) * e, wy = my + (c.wy - my) * e;
      return { poly: SPLIT.polys[i], s, ox: wx * s - c.ax, oy: wy * s - c.ay, e };
    });
  }
  // a hero's place on the screen (in a split screen: in the half of his group)
  function heroScreen(h) {
    const p = heroPos(h), V = splitViews(), c = V ? V[SPLIT.gid.get(h.id) || 0] : cam;
    return { x: p.x * c.s - c.ox, y: p.y * c.s - c.oy };
  }
  function resize() {
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));   // 1.03: at most 2x (3x is 2,25 times the pixels for little to see)
    const rect = stage.getBoundingClientRect();
    const had = cw > 0, cx = had ? (cam.ox + cw / 2) / cam.s : 0, cy = had ? (cam.oy + ch / 2) / cam.s : 0;
    cw = Math.max(60, Math.floor(rect.width)); ch = Math.max(60, Math.floor(rect.height));
    cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
    if (had) { cam.s = clamp(cam.s, fitScale() * 0.95, MAX_S); centerOn(cx, cy); }
  }
  function updateZoomBtn() {
    const b = $('#btn-zoom'); if (!b) return; const zoomedOut = cam.s < buildScale() * 0.92;
    b.setAttribute('aria-label', zoomedOut ? 'Przybliż' : 'Pokaż cały loch');
    b.innerHTML = zoomedOut
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>';
  }
