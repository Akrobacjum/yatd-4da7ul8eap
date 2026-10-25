# 1.24 Part B (UI and tutorial): no frame round the map (the canvas is the whole screen, the HUD stands on it on a gradient, taps
# still reach their buttons and the map), the near walls (a marker on a cut wall, a wall trap placed there by a tap), the tutorial in
# one run (the stage follows the wave: 1-2 / 3-4 / 5-6 / 7+, a card at waves 3, 5, 7, later runs full, a save and the found collection
# keep working), the slim guide walked by taps (placing once, the held tile with its description, the move step's next line, the
# spikes on the way and sure to fire, stepTimes), the long press on a tile (its description, Rani / Straszy), the animations of the
# heroes' skills and items and of every trap (counted; none with reduced motion), the next wave's preview in the build (the same
# party comes in, 10 waves; healer and champion marks; fits 380 px), the fear bar (readable, a tap counted, the summary line even at 0),
# and screenshots portrait 390x844 and landscape 844x390 (e124/shots/b_*.png). Prints FAILS [...] and exits 1 on any.
# (--only=frame,walls,onb,tut,spikes,hold,fx,preview,fear,shots; --reps=6)
import asyncio, sys, json, os
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t118_cards.py').read().split('# ---------- 1.')[0])   # LIB (T.fresh, T.raid, T.put, T.tough, T.place, T.withRandom, T.stepS)
from playwright.async_api import async_playwright
PAGE = 'file://' + SC + 'test/page15.html'
SHOTS = SC + 'e124/shots/'
os.makedirs(SHOTS, exist_ok=True)
LIB2 = r"""() => { const { G } = T;
  T.clean = () => { while (G.modalKind) G.closeModal(); };
  T.play = (ans, maxSec) => { const f = G.fl; for (let i = 0; i < (maxSec || 400) / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { const p = ans ? ans(c) : null; if (p == null) G.skipCheck(); else G.resolveCheck(p); G.clearCheck(); continue; } G.step(0.05); if (f.ending !== null) { f.ending = null; G.finishWave(); } } };
  T.okPos = c => (c.g0 + c.g1) / 2;
  T.missPos = c => { for (let p = 0.005; p < 1; p += 0.01) { const z = c.z2, inZ = (p >= c.g0 && p <= c.g1) || (p >= c.r0 && p <= c.r1) || (z && ((p >= z.g0 && p <= z.g1) || (p >= z.r0 && p <= z.r1))); if (!inZ) return p; } return 0.999; };
  T.page = (x, y) => { const r = document.querySelector('#cv').getBoundingClientRect(), o = G.OXY; return [r.left + o[0] + x, r.top + o[1] + y]; };   // a point of the view on the page
  T.tileXY = t => { const r = document.querySelector('#cv').getBoundingClientRect(), p = G.w2s(t[0] + 0.5, t[1] + 0.5, 0); return [r.left + p[0], r.top + p[1]]; };
  T.lips = type => { const out = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(type, x, y) && G.wallH(x, y) <= 0.2) out.push([x, y]); return out; };
  T.ink = (x, y, w, h) => { const cv = document.querySelector('#cv'), k = cv.width / cv.getBoundingClientRect().width, d = cv.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k)).data; return d; };
  return true; }"""

async def fresh_page(b, w=390, h=844, dsf=1, ls=None, motion=None):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, reduced_motion=motion or 'no-preference')
    if ls: await ctx.add_init_script('(() => { try { ' + ''.join("localStorage.setItem(%s, %s);" % (json.dumps(k), json.dumps(v)) for k, v in ls.items()) + ' } catch (e) {} })()')
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.clock.install(); await pg.goto(PAGE); await pg.clock.run_for(500)
    await pg.evaluate(LIB); await pg.evaluate(LIB2)
    return ctx, pg, errs

async def start_full(pg):
    await pg.evaluate("localStorage['yatd-noask-ess'] = '1'")
    await pg.click('#start-play'); await pg.clock.run_for(500)
    await pg.evaluate("T.clean()"); await pg.clock.run_for(300)

# ---------- 1. no frame ----------
FRAME = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const st = getComputedStyle(document.querySelector('#stage')), cvr = document.querySelector('#cv').getBoundingClientRect(), sr = document.querySelector('#stage').getBoundingClientRect();
  out.stage = { shadow: st.boxShadow, radius: st.borderRadius, after: getComputedStyle(document.querySelector('#stage'), '::after').position };
  ok(st.boxShadow === 'none' && parseFloat(st.borderRadius || '0') === 0, 'no frame round the map: ' + JSON.stringify(out.stage));
  out.cv = [cvr.left, cvr.top, cvr.width, cvr.height, innerWidth, innerHeight];
  ok(cvr.left === 0 && cvr.top === 0 && Math.abs(cvr.width - innerWidth) < 1 && Math.abs(cvr.height - innerHeight) < 1, 'the canvas is the whole screen: ' + out.cv);
  const o = G.OXY, c = G.cwch; out.oxy = o; out.cwch = c;
  ok(o[0] === Math.round(sr.left) && o[1] === Math.round(sr.top) && c[0] === Math.floor(sr.width) && c[1] === Math.floor(sr.height), 'the camera frames the free part (#stage): ' + JSON.stringify([o, c, sr.left, sr.top, sr.width, sr.height]));
  // the HUD stands on the map: a gradient under it, no panel; between its pieces the map takes the tap
  const hb = getComputedStyle(document.querySelector('.hud'), '::before').backgroundImage, db = getComputedStyle(document.querySelector('.drawer'), '::before').backgroundImage;
  ok(/linear-gradient/.test(hb) && /linear-gradient/.test(db), 'a soft gradient under the top and the bottom bars');
  ok(getComputedStyle(document.querySelector('.hud')).backgroundColor === 'rgba(0, 0, 0, 0)', 'the HUD has no panel');
  const eq = document.querySelector('#h-eq').getBoundingClientRect(), hud = document.querySelector('.hud').getBoundingClientRect();
  const blank = document.elementFromPoint(hud.right - 4, eq.top + eq.height / 2);
  out.blank = blank && (blank.id || blank.className);
  ok(blank && blank.id === 'cv', 'a tap between the HUD pieces reaches the map: ' + out.blank);
  const hit = sel => { const e = document.querySelector(sel); if (!e || e.hidden) return 'missing'; const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)) ? 'ok' : (t ? (t.id || t.className) : 'none'); };
  out.taps = {}; ['#btn-action', '#btn-settings', '#btn-undo', '#tray-toggle', '#h-wave', '#h-score', '#tab-traps', '#item-spikes'].forEach(s => { out.taps[s] = hit(s); });
  ok(Object.values(out.taps).every(v => v === 'ok'), 'the buttons and tiles take their taps: ' + JSON.stringify(out.taps));
  // the map is drawn under the HUD too (FRAME_INK, after a frame zoomed into the middle of the dungeon)
  // the middle of the way, put (unclamped) in the middle of the part of the screen outside the view: above it (portrait) or right of it (landscape)
  const P = G.shortestPath(), m = P[Math.floor(P.length / 2)]; G.cam.s = 56; G.centerOn(m[0] + 0.5, m[1] + 0.5); G.cam.manualUntil = 1e12;
  if (o[1] > 40) G.cam.oy += c[1] / 2 + o[1] / 2; else G.cam.ox -= c[0] / 2 + (o[2] - o[0] - c[0]) / 2;
  return { fails, out }; }"""
FRAME_INK = r"""() => { const { G } = T, o = G.OXY, c = G.cwch, top = o[1] > 40;   // portrait: the band above the view; landscape: the column right of it
  const d = top ? T.ink(0, 0, innerWidth, o[1]) : T.ink(o[0] + c[0] + 2, 0, innerWidth - o[0] - c[0] - 2, innerHeight); let n = 0;
  for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 6) + Math.abs(d[i + 1] - 7) + Math.abs(d[i + 2] - 9) > 24) n++;
  return { n, where: top ? 'above the view' : 'right of the view', px: d.length / 4 }; }"""

# ---------- 2. the near walls ----------
WALLS1 = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  G.fl.essence = 99; for (let i = 0; i < 2; i++) { const m = G.toolMarkers('dig'); if (m.length) G.applyTool(m[0]); G.fl.essence = 99; }
  G.setTab('traps');
  const L = T.lips('arrows'); let far = 0; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('arrows', x, y) && G.wallH(x, y) > 0.2) far++;
  out.spots = { near: L.length, far };
  ok(L.length > 0 && far > 0, 'wall traps fit on far and near (cut) walls: ' + JSON.stringify(out.spots));
  ['fire', 'portrait', 'eyes', 'mirror'].forEach(t => { G.run.unlocked.add(t); ok(T.lips(t).length > 0, t + ': near walls too'); });
  const t = L[Math.floor(L.length / 2)]; out.t = t;
  G.cam.s = 56; G.centerOn(t[0] + 0.5, t[1] + 0.5); G.cam.manualUntil = 1e12;
  return { fails, out }; }"""
WALLS_INK = r"""(t) => { const { G } = T, p = T.tileXY(t), d = T.ink(p[0] - 30, p[1] - 30, 60, 60); let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1]; return s; }"""

# ---------- 3. the tutorial in one run: the stage by wave ----------
ONB_STATE = r"""() => { const G = __yatd, R = G.run; return { wave: R.wave, stage: R.stage, onbW: !!R.onbW, guided: !!R.guided, tut: R.tut, onb: G.onbStage(), portrait: R.unlocked.has('portrait'), crate: R.unlocked.has('crate'), fog: R.unlocked.has('r_fog'), web: R.unlocked.has('web'), mirror: R.unlocked.has('mirror'),
  tabs: G.TABS.map(t => t.id).filter(id => !document.querySelector('#tab-' + id).hidden), modal: G.modalKind }; }"""
ONB_WAVE = r"""() => { const { G } = T, seen = []; const R = G.run; R.crystals = R.maxCrystals = 9;
  G.fl.essence = 99; G.startWave(); const f = G.fl; for (let i = 0; i < 60 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); }
  if (f.phase === 'raid') G.finishWave();
  const nx = (R.next || []).map(e => ({ phys: !!e.phys, phobia: !!e.phobia, hunter: !!e.hunter }));
  T.clean(); G.afterSummary();
  for (let k = 0; k < 8 && G.modalKind; k++) { const m = G.modalKind, txt = (document.querySelector('#card') || {}).textContent || ''; seen.push(m === 'onb' ? 'onb: ' + txt.slice(0, 90) : m); G.closeModal(); }
  return { seen, nx }; }"""

# ---------- 4. the guide by taps ----------
STEP = r"""() => { const G = __yatd, s = G.TUT[G.run.tut]; return { i: G.run.tut, id: s ? s.id : null, phase: G.fl.phase, modal: G.modalKind, check: !!(G.fl.check && !G.fl.check.result), pop: G.tutPopNow, coach: document.querySelector('#coach').hidden ? null : document.querySelector('#coach').innerText.slice(0, 110) }; }"""
TARGET = r"""() => { const G = __yatd, s = G.TUT[G.run.tut]; if (!s || !s.tile) return null; if (s.cached === undefined) s.cached = s.tile(); return s.cached; }"""
SHOW = r"""(t) => { const G = __yatd; G.cam.s = 40; G.centerOn(t[0] + 0.5, t[1] + 0.5); G.cam.manualUntil = 1e12; }"""

# ---------- 5. P1-5: the guide's spikes go off ----------
SPIKES = r"""(reps) => { const { G } = T, fails = [], out = { fires: [], tut: [], how: [] }; const ok = (c, m) => { if (!c) fails.push(m); };
  for (let rep = 0; rep < reps; rep++) {
    T.clean(); localStorage.removeItem('yatd-coach'); G.setUser(false); G.newRun(true); T.clean();
    const i = G.TUT.findIndex(s => s.id === 'place'); G.run.tut = i;
    const P = G.shortestPath(), t = (() => { for (let k = Math.floor(P.length * (0.25 + 0.45 * rep / Math.max(1, reps - 1))); k < P.length; k++) if (G.canPlace('spikes', P[k][0], P[k][1])) return P[k]; return null; })();
    if (!t) { out.fires.push('none'); continue; }
    G.fl.essence = 99; G.tryPlace('spikes', t[0], t[1]); const it = G.fl.items.get(t[0] + ',' + t[1]);
    G.run.tut = G.TUT.findIndex(s => s.id === 'go');
    G.startWave(); const f = G.fl; let asked = 0;
    for (let s = 0; s < 3000 && f.phase === 'raid'; s++) { const c = f.check; if (c && !c.result) { if (c.it === it) asked++; G.resolveCheck(T.missPos(c)); G.clearCheck(); continue; } G.step(0.05); if (f.ending !== null) break; if ((it.w && it.w.f) && s > 200) break; }
    out.fires.push((it.w ? it.w.f : 0) + '/' + asked); out.tut.push(f.stats.tutSpike || 0); out.how.push({ t, len: P.length, time: Math.round(f.time), kills: f.stats.kills, esc: f.stats.escaped, crys: f.stats.crystalTaken || 0, ent: f.ending, items: [...f.items.values()].filter(o => o.type === 'spikes').length });
    ok((it.w && it.w.f) >= 1, 'rep ' + rep + ': the guide\'s spikes went off in wave 1 (every check missed): ' + out.fires[rep]);
  }
  // not in the full game (a miss stays a miss)
  T.clean(); G.setUser(false); G.newRun(false); T.clean();
  { const P = G.shortestPath(); let t = null; for (let k = Math.floor(P.length * 0.4); k < P.length && !t; k++) if (G.canPlace('spikes', P[k][0], P[k][1])) t = P[k];
    G.fl.essence = 99; G.tryPlace('spikes', t[0], t[1]); G.startWave(); const f = G.fl, it = G.fl.items.get(t[0] + ',' + t[1]); let miss = 0;
    for (let s = 0; s < 3000 && f.phase === 'raid'; s++) { const c = f.check; if (c && !c.result) { if (c.it === it) miss++; G.resolveCheck(T.missPos(c)); G.clearCheck(); continue; } G.step(0.05); if (f.ending !== null) break; }
    out.full = { asked: miss, tutSpike: f.stats.tutSpike || 0 }; ok(!f.stats.tutSpike, 'the full game: no help for the spikes'); }
  return { fails, out }; }"""

# ---------- 6. the animations ----------
FX_ORG = r"""(reps) => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  Object.keys(G.AFXN).forEach(k => delete G.AFXN[k]);
  const types = ['spikes', 'arrows', 'fire', 'portrait', 'eyes', 'mirror', 'bones', 'coffin', 'creak', 'gate', 'web', 'trapdoor', 'cage', 'goblin', 'ogre', 'ghost', 'loot', 'loot2', 'lpotion', 'rune', 'altar'];
  for (let w = 0; w < reps; w++) {
    T.fresh(7); G.run.wave = 4 + (w % 5); let i = 0;
    G.shortestPath().forEach((q, k) => { if (k % 2) return; for (let n = 0; n < types.length; n++) { const t = types[(i + n) % types.length]; for (const d of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) { if (G.canPlace(t, q[0] + d[0], q[1] + d[1])) { G.fl.essence = 9999; if (G.tryPlace(t, q[0] + d[0], q[1] + d[1])) { i++; return; } } } } });
    G.run.next = G.makeWave(G.run.wave + 2); G.startWave(); const f = G.fl;
    for (let s = 0; s < 4000 && f.phase === 'raid'; s++) { const c = f.check; if (c && !c.result) { G.resolveCheck(T.okPos(c)); G.clearCheck(); continue; } G.step(0.05); if (f.ending !== null) break; }
  }
  out.organic = Object.assign({}, G.AFXN);
  ok(Object.keys(out.organic).length >= 12, 'organic waves start many kinds of animations: ' + Object.keys(out.organic).length);
  return { fails, out }; }"""
FX_SKILLS = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const N = () => Object.assign({}, G.AFXN), d = (a, k) => (G.AFXN[k] || 0) - (a[k] || 0);
  const tries = {};
  const want = (k, why, fn) => { const a = N(); try { fn(); } catch (e) { fails.push(why + ': ' + e); } tries[why] = d(a, k); ok(d(a, k) >= 1, why + ': the ' + k + ' animation'); };
  T.fresh(7); G.run.wave = 6;
  const R = T.rooms(), r0 = R[0], r1 = R[1] || R[0], r2 = R[2] || R[0];
  // a ghost and a known trap in one room: the priest's exorcism and the mage's jam before it
  const fs = T.floorSpots(r0, 'spikes'); const sp = T.place('spikes', fs[0]); T.place('ghost', fs[fs.length - 1]);
  const cg = T.place('cage', T.floorSpots(r1, 'cage')[0]), gb = T.place('goblin', T.floorSpots(r2, 'goblin')[0]);
  const types = ['warrior', 'priest', 'mage', 'bard', 'barbarian', 'thief'];
  let nx = G.makeWave(9); while (nx.length < types.length) nx = nx.concat(G.makeWave(9)); nx = nx.slice(0, types.length);
  nx.forEach((e, i) => { e.type = types[i]; e.trait = null; e.boss = null; e.lvl = 8; e.returning = false; e.bond = null; e.nemesis = false; e.inv = []; }); G.run.next = nx;
  G.startWave(); const f = G.fl; for (let i = 0; i < 800 && f.queue.length; i++) T.stepS(0.05); T.stepS(0.3); G.alive().forEach(T.tough);
  const H = t => G.alive().find(h => h.type === t), room = T.room(r0), walk = T.walkT(r0);
  G.alive().forEach((h, i) => { T.put(h, walk[i % walk.length][0], walk[i % walk.length][1]); h.lvl = 8; h.rank = 1; h.inv = []; h.state = 'walk'; h.talkUntil = -1; });
  f.party.talkUntil = -1; f.party.prep = null;
  const pr = H('priest'), mg = H('mage'), wr = H('warrior'), bd = H('bard'), bb = H('barbarian'), th = H('thief');
  out.team = G.alive().map(h => h.type);
  pr.faith = pr.faithMax = 12; mg.jamCd = 0; sp.detected = true;
  const a0 = N(); G.startPrep(room.id); out.prepSet = !!f.party.prep; for (let i = 0; i < 400 && f.party.prep; i++) G.step(0.05);
  out.prep = { ward: d(a0, 'ward'), shield: d(a0, 'shield'), jam: d(a0, 'jam'), exorcism: d(a0, 'exorcism') };
  ok(out.prep.ward >= 1, 'the priest\'s ward before a deadly room');
  ok(out.prep.shield >= 1, 'the warrior raises his shield (the prep)');
  ok(out.prep.jam >= 1, 'the mage jams the room\'s traps (a pulse on each)');
  ok(out.prep.exorcism >= 1, 'the exorcism of the ghost (a pillar of light)');
  want('heal', 'the priest heals', () => { T.put(wr, pr.x, pr.y); wr.hp = wr.max * 0.4; pr.cast = 0; pr.faith = 10; G.heroAbilities(pr, 0.05); });
  want('heal', 'the priest puts out a fire (cleanse)', () => { wr.burnUntil = f.time + 5; wr.burnBy = 'fire'; pr.cast = 0; pr.faith = 10; G.heroAbilities(pr, 0.05); });
  want('fireball', 'the mage\'s fireball', () => { T.put(mg, gb.x, gb.y + 0); mg.room = G.roomOf(gb.x, gb.y); gb.hp = 500; mg.cast = 0; G.heroAbilities(mg, 0.05); });
  want('notes', 'the bard\'s song', () => { f.party.morale = 0.3; bd.songs = 3; bd.songCd = 0; bd.callCd = 99; G.heroAbilities(bd, 0.05); });
  want('rage', 'the barbarian\'s rage', () => { bb.rageCd = 0; bb.rageUntil = 0; G.startRage(bb, 'hit'); });
  want('charm', 'a talisman', () => { th.inv = [{ type: 'charm', r: 2, cdUntil: 0 }]; th.wardUntil = 0; G.useCharm(th, 'prep'); });
  want('charm', 'an amulet', () => { th.inv = [{ type: 'amulet', r: 2, cdUntil: 0 }]; th.calmUntil = 0; th.fear = th.courage * 0.8; G.useAmulet(th); });
  want('boots', 'boots', () => { th.inv = [{ type: 'boots', r: 2, cdUntil: 0 }]; th.sprintUntil = 0; G.useBoots(th, 'run'); });
  want('potion', 'a potion drunk', () => { bb.inv = [{ type: 'potion', r: 2 }]; bb.max = 300; bb.hp = 20; bb.state = 'walk'; for (let i = 0; i < 20 && bb.inv.length; i++) G.step(0.05); });
  want('dodge', 'the thief dodges', () => { th.max = 1e5; th.hp = 1e5; th.state = 'walk'; th.slowUntil = 0; th.cageIt = null; T.withRandom(0.0, () => { for (let i = 0; i < 4; i++) { th.dodgeCd = 0; G.damage(th, 10, sp, 1); } }); });
  want('light', 'a lantern in the fog', () => { th.inv = [{ type: 'lantern', r: 1 }]; th.outUntil = 0; T.put(wr, th.x, th.y); T.withRandom(0.2, () => { for (let i = 0; i < 5; i++) G.fogRoll(wr, 1.4); }); });
  want('pry', 'a crowbar on a cage', () => { wr.inv = [{ type: 'crowbar', r: 1 }]; T.put(wr, cg.x, cg.y); G.cageHero(wr, cg, 6, 1); wr.cagedAt = f.time - 5; for (let i = 0; i < 10; i++) G.step(0.05); });
  want('sparks', 'the thief disarms a trap', () => { const s2 = T.place('spikes', T.floorSpots(r1, 'spikes')[0] || T.floorSpots(r2, 'spikes')[0]); s2.detected = true; s2.cd = 1; T.put(th, s2.x, s2.y); th.state = 'disarm'; th.item = s2; th.timer = 0.01; th.dur = 1; th.R = Object.assign({}, th.R, { fail: 0, sapper: 0 }); for (let i = 0; i < 6 && th.state === 'disarm'; i++) G.step(0.05); });
  want('throw', 'a bomb thrown at a monster', () => { gb.hp = 500; bb.inv = [{ type: 'bomb', r: 2 }]; bb.rank = 0; bb.rageUntil = 0; T.put(bb, gb.x, gb.y); bb.state = 'fight'; bb.foe = gb; for (let i = 0; i < 60 && bb.inv.length; i++) G.step(0.05); });
  out.tries = tries;
  // a slot of the pool is on and drawn
  out.active = G.AFX.filter(a => a.on).map(a => a.kind);
  ok(out.active.length > 0, 'the pool has running animations');
  return { fails, out }; }"""
FX_TRAPS = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const KIND = { spikes: 'spikes', arrows: 'arrow', fire: 'fire', gate: 'gate', trapdoor: 'trapdoor', cage: 'cage', web: 'web', powder: 'powder', mimic: 'mimic', portrait: 'glare', eyes: 'gaze', mirror: 'flash', coffin: 'mist', bones: 'rattle', musicbox: 'notes', creak: 'creak' };
  out.n = {};
  Object.keys(KIND).forEach(type => {
    T.fresh(7); G.run.wave = 5;
    let it = null;
    for (const R of T.rooms()) {
      if (G.ITEMS[type].slot === 'object') { const sp = T.floorSpots(R, 'crate').find(t => G.canPlace('crate', t[0], t[1])); if (!sp) continue; T.place('crate', sp); if (!G.canPlace(type, sp[0], sp[1])) continue; it = T.place(type, sp); }
      else if (G.ITEMS[type].slot === 'wall') { const ws = T.wallSpots(R, type); if (ws.length) it = T.place(type, ws[0]); }
      else if (G.ITEMS[type].slot === 'door') { for (const d of G.fl.doors.values()) if (!d.entrance && G.canPlace(type, d.x, d.y)) { it = T.place(type, [d.x, d.y]); break; } }
      else { const fsp = T.floorSpots(R, type); if (fsp.length) it = T.place(type, fsp[Math.floor(fsp.length / 2)]); }
      if (it) break;
    }
    if (!it) { fails.push(type + ': no spot'); return; }
    const f = T.raid(['warrior']), h = G.alive()[0], a = G.areaOf(it).find(t => G.walkable(t[0], t[1])) || [it.x, it.y];
    T.put(h, a[0], a[1]);
    const k = KIND[type], n0 = G.AFXN[k] || 0; it.cd = 0; it.disabled = false; it.jamUntil = 0;
    G.fire(it, 1);
    out.n[type] = (G.AFXN[k] || 0) - n0;
    ok(out.n[type] >= 1, type + ': its firing animation (' + k + ')');
  });
  return { fails, out }; }"""

# ---------- 7. the preview: the party in the build is the party that comes ----------
PREVIEW = r"""(nw) => { const { G } = T, fails = [], out = { waves: [] }; const ok = (c, m) => { if (!c) fails.push(m); };
  T.clean(); G.setUser(false); G.newRun(false); T.clean(); const R = G.run;
  const sig = e => [e.type, e.lvl, e.boss || '', e.trait || '', e.nm ? e.nm[0] : ''].join(':');
  for (let w = 1; w <= nw; w++) {
    R.crystals = R.maxCrystals = 9; G.fl.essence = 999;
    const want = R.next.map(sig);
    G.drawPreview(R.next);
    const pv = { l1: G.PV.l1, l2: G.PV.l2, heal: !!G.PV.heal, w: G.PV.w };
    const lv = R.next.map(e => e.lvl), lo = Math.min(...lv), hi = Math.max(...lv), heal = R.next.some(e => e.type === 'priest' || e.type === 'bard'), boss = R.next.find(e => e.boss);
    ok(pv.l1.includes(R.next.length + ' bohater') && pv.l1.includes('poz. ' + (lo === hi ? lo : lo + '-' + hi)), 'wave ' + w + ': count and levels in the preview: ' + pv.l1);
    ok(pv.heal === heal && (!heal || /leczy|✚/.test(pv.l2)), 'wave ' + w + ': healer marked: ' + pv.l2);
    ok(!boss || /czempion|przepowiedni/.test(pv.l2), 'wave ' + w + ': the leader marked: ' + pv.l2);
    G.startWave(); const f = G.fl;
    const q = f.queue.map(sig);
    for (let i = 0; i < 2000 && f.queue.length; i++) G.step(0.05);
    const inn = f.heroes.map(h => h.entry ? sig(h.entry) : sig(h));
    out.waves.push({ w, n: want.length, l1: pv.l1, l2: pv.l2, same: JSON.stringify(q) === JSON.stringify(want) && JSON.stringify(inn.slice(0, want.length)) === JSON.stringify(want) });
    ok(JSON.stringify(q) === JSON.stringify(want), 'wave ' + w + ': the queue is the preview');
    ok(JSON.stringify(inn.slice(0, want.length)) === JSON.stringify(want), 'wave ' + w + ': the heroes who came in are the preview: ' + JSON.stringify([want, inn]));
    G.finishWave(); T.clean(); G.afterSummary(); T.clean();
  }
  return { fails, out }; }"""

# ---------- 8. the fear bar ----------
FEAR1 = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(5); G.run.wave = 4;
  const f = T.raid(['warrior', 'priest', 'thief']); G.setTrayOpen(false);
  G.alive().forEach((h, i) => { h.fear = h.courage * [0.2, 0.55, 0.9][i]; });
  const p = G.heroPos(G.alive()[1]); G.cam.s = 48; G.centerOn(p.x, p.y); G.cam.manualUntil = 1e12;
  G.setPaused(true);   // they stand still for the look and the tap
  return { fails, out }; }"""
FEAR2 = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const R = G.fearRects; out.rects = R.map(r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: +r.h.toFixed(1), id: r.id }));
  ok(R.length >= 2, 'a fear bar over each hero on the screen: ' + R.length);
  ok(R.every(r => r.h >= 3 && r.w >= 22), 'readable on a phone: at least 3 px high, 22 px wide');
  // under the HP bar, not over it: the pixels just above the fear bar are the HP bar's (green), not violet
  const r = R[0], q = T.page(r.x + 2, r.y - 3), d = T.ink(q[0], q[1], 4, 1); out.abovePx = [d[0], d[1], d[2]];
  ok(d[1] > d[2] && d[1] > 80, 'the HP bar sits right above the fear bar (green pixels): ' + out.abovePx);
  return { fails, out }; }"""
FEAR3 = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  out.fearUi = G.fl.fearUi; out.modal = G.modalKind;
  ok(G.fl.fearUi && G.fl.fearUi.bar === 1, 'a tap on the fear bar is counted (fearUi.bar): ' + JSON.stringify(G.fl.fearUi));
  ok(G.modalKind === 'hero', 'and opens the hero\'s card');
  T.clean(); G.setPaused(false);
  // the summary: Wystraszeni even at 0
  G.alive().forEach(h => { h.fear = 0; }); G.fl.stats.scared = 0; G.fl.stats.scarePts = 0; G.fl.stats.fearPts = 0;
  G.finishWave();
  const ln = (document.querySelector('#wave-fear-line') || {}).textContent || ''; out.line = ln;
  ok(/Zabici: \d+ \(\d+ pkt z ran\) · Wystraszeni: 0 \(0 pkt ze strachu\)/.test(ln), 'the summary says Wystraszeni even at 0: ' + ln);
  const rec = G.run.waves[G.run.waves.length - 1]; out.recFearUi = rec.fearUi;
  ok(rec.fearUi && rec.fearUi.bar === 1, 'the wave record carries fearUi.bar');
  // Rani / Straszy on every element
  const bad = Object.keys(G.ITEMS).filter(t => { const w = G.effWords(t); return (G.SCARE[t] || G.DRIFT[t]) ? !w.includes('Straszy') : (G.HURTS(t) ? !w.includes('Rani') : false); });
  ok(!bad.length, 'every element that scares says Straszy, every one that wounds Rani: ' + bad);
  out.words = { spikes: G.effWords('spikes'), portrait: G.effWords('portrait'), bats: G.effWords('bats'), loot: G.effWords('loot'), web: G.effWords('web') };
  ok(out.words.spikes.join() === 'Rani' && out.words.portrait.join() === 'Straszy' && out.words.bats.join() === 'Rani,Straszy' && !out.words.loot.length, 'the words: ' + JSON.stringify(out.words));
  return { fails, out }; }"""

async def main():
    only = None; reps = 6
    for a in sys.argv:
        if a.startswith('--only='): only = a[7:].split(',')
        if a.startswith('--reps='): reps = int(a[7:])
    want = lambda s: not only or s in only
    fails = []; allerrs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        async def sec(pg, name, js, arg=None):
            try: r = await (pg.evaluate(js, arg) if arg is not None else pg.evaluate(js))
            except Exception as e: fails.append(name + ': ' + str(e)[:600]); return None
            print('==', name, json.dumps(r['out'], ensure_ascii=False)[:3000]); fails.extend(name + ': ' + f for f in r['fails'] if f); return r
        # ---------- frame (portrait and landscape) ----------
        if want('frame'):
            for (w, h) in [(390, 844), (844, 390)]:
                ctx, pg, errs = await fresh_page(b, w, h)
                await start_full(pg)
                r = await sec(pg, 'frame %dx%d' % (w, h), FRAME)
                await pg.clock.run_for(300); ink = await pg.evaluate(FRAME_INK); print('ink outside the view', ink)
                await pg.screenshot(path=SHOTS + 'b_frame_%dx%d.png' % (w, h))
                if ink['n'] < 0.05 * ink['px']: fails.append('frame %dx%d: the dungeon shows under the HUD (%s)' % (w, h, ink))
                # a tap on the map still works: pick up a start trap
                t = await pg.evaluate("(() => { const G = __yatd; const it = [...G.fl.items.values()].find(o => o.sys); G.cam.s = 40; G.centerOn(it.x + 0.5, it.y + 0.5); G.cam.manualUntil = 1e12; return [it.x, it.y]; })()")
                await pg.clock.run_for(100)
                xy = await pg.evaluate("t => T.tileXY(t)", t); await pg.mouse.click(xy[0], xy[1]); await pg.clock.run_for(150)
                mk = await pg.evaluate("__yatd.movingKey")
                print('tap on the map', t, mk)
                if mk != '%d,%d' % (t[0], t[1]): fails.append('frame %dx%d: a tap on the map picks a trap up (%s)' % (w, h, mk))
                allerrs.extend(errs); await ctx.close()
        # ---------- near walls ----------
        if want('walls'):
            ctx, pg, errs = await fresh_page(b, 390, 844, 2)
            await start_full(pg)
            r = await sec(pg, 'walls', WALLS1)
            if r:
                t = r['out']['t']
                await pg.clock.run_for(300); s0 = await pg.evaluate(WALLS_INK, t)
                await pg.click('#item-arrows'); await pg.clock.run_for(300); s1 = await pg.evaluate(WALLS_INK, t)
                await pg.screenshot(path=SHOTS + 'b_walls_near.png')
                print('near wall ink: plain', s0, 'arrows chosen', s1)
                if abs(s1 - s0) < 2000: fails.append('walls: a near wall shows the marker when a wall trap is chosen (%s -> %s)' % (s0, s1))
                xy = await pg.evaluate("t => T.tileXY(t)", t); await pg.mouse.click(xy[0], xy[1]); await pg.clock.run_for(300)
                got = await pg.evaluate("t => { const it = __yatd.fl.items.get(t[0] + ',' + t[1]); return it ? it.type : null; }", t)
                print('placed on the near wall by a tap', got)
                if got != 'arrows': fails.append('walls: a tap on a near wall places the arrows (%s)' % got)
                await pg.screenshot(path=SHOTS + 'b_walls_placed.png')
            allerrs.extend(errs); await ctx.close()
        # ---------- the stage by wave in one run ----------
        if want('onb'):
            ctx, pg, errs = await fresh_page(b, 390, 844, 1, {'yatd-coach': '1', 'yatd-noask-ess': '1', 'yatd-found': json.dumps(['web', 'mirror'])})
            btns = await pg.evaluate('() => [...document.querySelectorAll("#card .startbtns button")].map(b => b.id + ": " + b.textContent)')
            print('start', btns)
            if not any('start-tut: Nowy run' in t and 'odsłania się fala po fali' in t for t in btns): fails.append('onb: a fresh browser (guide done) starts the first run that opens with the waves: %s' % btns)
            await pg.click('#start-tut'); await pg.clock.run_for(400); await pg.evaluate("T.clean()")
            prog = []
            for wave in range(1, 9):
                s = await pg.evaluate(ONB_STATE); prog.append(s)
                exp = 1 if wave <= 2 else 2 if wave <= 4 else 3 if wave <= 6 else 4
                print('wave', wave, {k: s[k] for k in ('wave', 'stage', 'onbW', 'portrait', 'crate', 'fog', 'web', 'mirror', 'onb')})
                if s['wave'] != wave or s['stage'] != exp: fails.append('onb: wave %d: stage %d (got %s, wave %s)' % (wave, exp, s['stage'], s['wave']))
                if s['portrait'] != (wave >= 3) or s['crate'] != (wave >= 5) or s['fog'] != (wave >= 5): fails.append('onb: wave %d: what is open: %s' % (wave, s))
                if not s['web'] or s['mirror'] != (wave >= 3): fails.append('onb: wave %d: the found collection (web from the start, mirror with stage 2): %s' % (wave, s))
                if wave == 4:   # a save in the middle comes back with its stage and goes on
                    await pg.evaluate("__yatd.saveRun('build')"); await pg.reload(); await pg.clock.run_for(500); await pg.evaluate(LIB); await pg.evaluate(LIB2)
                    await pg.click('#start-continue'); await pg.clock.run_for(400); await pg.evaluate("T.clean()")
                    s2 = await pg.evaluate(ONB_STATE); print('resumed', {k: s2[k] for k in ('wave', 'stage', 'onbW', 'portrait', 'crate')})
                    if s2['stage'] != 2 or not s2['onbW'] or not s2['portrait'] or s2['crate']: fails.append('onb: a saved first run resumes in its stage: %s' % s2)
                r = await pg.evaluate(ONB_WAVE)
                cards = [x for x in r['seen'] if x.startswith('onb')]
                print('  after wave', wave, r['seen'])
                if wave in (2, 4, 6):
                    nm = {2: 'strach', 4: 'gildia i loch', 6: 'pełna gra'}[wave]
                    if not cards or ('Nowe: ' + nm) not in cards[0]: fails.append('onb: the card of wave %d: %s' % (wave + 1, cards))
                elif cards: fails.append('onb: no card after wave %d (%s)' % (wave, cards))
                if wave >= 6 and r['nx'] and not any(e['phys'] or e['phobia'] for e in r['nx']) and wave == 6: print('  (no body or phobia rolled in the party of wave 7)')
            s = await pg.evaluate(ONB_STATE)
            if s['onb'] != 5: fails.append('onb: the first run reached the full game: the next run is full (onb %s)' % s['onb'])
            await pg.evaluate('() => { T.clean(); __yatd.openModal({ type: "start" }); }')
            btns = await pg.evaluate('() => [...document.querySelectorAll("#card .startbtns button")].map(b => b.id + ": " + b.textContent)')
            await pg.click('#start-play'); await pg.clock.run_for(300); await pg.evaluate("T.clean()")
            s = await pg.evaluate(ONB_STATE); print('the next run', btns, {k: s[k] for k in ('stage', 'onbW', 'guided', 'tabs')})
            if s['stage'] != 4 or s['onbW'] or len(s['tabs']) != 6: fails.append('onb: the run after it is the full game: %s' % s)
            # a run saved before 1.24 in a stage keeps it (no onbW)
            o = await pg.evaluate("() => { const G = __yatd; G.run.stage = 2; G.run.onbW = false; const a = G.onbAdvance(7); return [a, G.run.stage]; }")
            if o != [False, 2]: fails.append('onb: an old staged run keeps its stage: %s' % o)
            allerrs.extend(errs); await ctx.close()
        # ---------- the guide by taps ----------
        if want('tut'):
            ctx, pg, errs = await fresh_page(b, 390, 844, 2)
            await pg.click('#start-tut'); await pg.clock.run_for(400)
            seen = []
            async def st(): return await pg.evaluate(STEP)
            async def expect(sid):
                s = await st(); seen.append(s['id']); print(s)
                if s['id'] != sid: fails.append('tut: expected step %s, got %s' % (sid, s['id']))
                return s
            async def tap(t, wait=300):
                await pg.evaluate(SHOW, t); await pg.clock.run_for(80); xy = await pg.evaluate("t => T.tileXY(t)", t); await pg.mouse.click(xy[0], xy[1]); await pg.clock.run_for(wait)
            ids = await pg.evaluate("__yatd.TUT.map(s => s.id)"); print('steps', ids)
            if ids != ['intro', 'spikes', 'place', 'hold', 'move', 'spend', 'go', 'novice', 'check', 'herocard', 'ff', 'loot', 'upgrade', 'deck', 'dig', 'end']: fails.append('tut: the slim guide: %s' % ids)
            req = await pg.evaluate("__yatd.TUT.filter(s => s.done && !s.skip && !s.next && !s.raid && !s.ack).map(s => s.id)")
            print('steps that must be done', req)
            if sorted(req) != ['go', 'place', 'spikes']: fails.append('tut: only one placing is demanded (spikes, place) besides the wave itself: %s' % req)
            await expect('intro'); await pg.click('#coach .next'); await pg.clock.run_for(300)
            await expect('spikes'); await pg.click('#item-spikes'); await pg.clock.run_for(300)
            await expect('place')
            t = await pg.evaluate(TARGET)
            off = await pg.evaluate("""() => { const G = __yatd, P = G.shortestPath(), on = new Set(P.slice(Math.floor(P.length * 0.25)).map(p => p[0] + ',' + p[1]));
                for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('spikes', x, y) && !on.has(x + ',' + y)) return [x, y]; return null; }""")
            if off:
                n0 = await pg.evaluate("__yatd.fl.items.size"); await tap(off)
                n1 = await pg.evaluate("__yatd.fl.items.size"); s = await st()
                print('a tap off the way', off, n0, n1, s['id'])
                if n1 != n0 or s['id'] != 'place': fails.append('tut: spikes off the heroes\' way are not taken in the place step')
            await tap(t)
            await expect('hold')
            box = await pg.evaluate("(() => { const r = document.querySelector('#item-arrows').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
            await pg.mouse.move(box[0], box[1]); await pg.mouse.down(); await pg.clock.run_for(500)
            tip = await pg.evaluate("(() => { const b = document.querySelector('#tip'); return b.hidden ? null : b.innerText; })()")
            await pg.screenshot(path=SHOTS + 'b_tut_hold.png')
            await pg.mouse.up(); await pg.clock.run_for(300)
            print('tip', tip and tip.replace('\n', ' | ')[:200])
            if not tip or 'Strzały' not in tip or 'Rani' not in tip: fails.append('tut: holding a tile opens its description with Rani: %s' % tip)
            s = await expect('move')
            t = await pg.evaluate(TARGET)
            c0 = s['coach'] or ''
            await tap(t); await pg.clock.run_for(200)
            c1 = (await st())['coach'] or ''
            print('move texts', c0[:60], '->', c1[:60])
            if 'Masz ją w ręce' not in c1: fails.append('tut: with the trap in hand the move step says what next: %s' % c1)
            await pg.screenshot(path=SHOTS + 'b_tut_move.png')
            dst = await pg.evaluate("""(t => { const G = __yatd, k = t[0] + ',' + t[1], it = G.fl.items.get(k); G.fl.items.delete(k); let r = null; for (const q of G.shortestPath()) if (G.canPlace(it.type, q[0], q[1]) && Math.abs(q[0] - t[0]) + Math.abs(q[1] - t[1]) <= 6 && (q[0] !== t[0] || q[1] !== t[1])) { r = q; break; } G.fl.items.set(k, it); return r; })""", t)
            if dst: await tap(dst, 400)
            await expect('spend')
            await pg.evaluate("(() => { const b = [...document.querySelectorAll('#coach .skip')].find(x => x.textContent.includes('Pomiń')); if (b) b.click(); })()"); await pg.clock.run_for(200)
            await expect('go'); await pg.click('#btn-action'); await pg.clock.run_for(500)
            if await pg.evaluate("__yatd.modalKind") == 'unspent': fails.append('tut: no unspent question in the guide')
            # the wave: acknowledge, answer, skip the optional steps
            for i in range(400):
                s = await st()
                if s['phase'] != 'raid' or s['modal'] == 'wave': break
                if s['pop']: await pg.click('#coach .next'); await pg.clock.run_for(150); continue
                if s['id'] == 'novice' and await pg.evaluate("!!document.querySelector('#coach .next') && !document.querySelector('#coach').hidden"): await pg.click('#coach .next'); await pg.clock.run_for(150); continue
                if s['modal'] == 'hero': await pg.evaluate("__yatd.closeModal(); __yatd.setPaused(false)"); continue
                if s['check']: await pg.evaluate("(() => { const c = __yatd.fl.check; __yatd.resolveCheck((c.g0 + c.g1) / 2); __yatd.clearCheck(); })()"); await pg.clock.run_for(100); continue
                if s['id'] in ('herocard', 'ff') and s['coach']: seen.append(s['id']); await pg.evaluate("(() => { const b = [...document.querySelectorAll('#coach .skip')].find(x => x.textContent.includes('Pomiń')); if (b) b.click(); })()"); await pg.clock.run_for(150); continue
                await pg.evaluate("(() => { const G = __yatd; for (let k = 0; k < 20 && G.fl.phase === 'raid' && !(G.fl.check && !G.fl.check.result) && !G.tutPopNow; k++) { G.step(0.05); if (G.fl.ending !== null) { G.fl.ending = null; G.finishWave(); } } })()")
                await pg.clock.run_for(50)
            spk = await pg.evaluate("(() => { const b = __yatd.fl.byType.spikes; return b ? b.fires : 0; })()")
            print('wave 1: spikes fired', spk)
            if not spk: fails.append('tut: the spikes fired in the guide\'s wave 1')
            async def to_build():
                for i in range(10):
                    k = await pg.evaluate("__yatd.modalKind")
                    if not k: break
                    if k == 'onb': seen.append('card:' + (await pg.evaluate("document.querySelector('#card h2').textContent")))
                    await pg.evaluate("(() => { const G = __yatd, k = G.modalKind; if (k === 'wave') { G.closeModal(); G.afterSummary(); return; } G.closeModal(); })()"); await pg.clock.run_for(250)
            await to_build()
            await expect('loot'); await pg.click('#coach .next'); await pg.clock.run_for(200)
            await expect('upgrade'); await pg.evaluate("(() => { const b = [...document.querySelectorAll('#coach .skip')].find(x => x.textContent.includes('Pomiń')); if (b) b.click(); })()"); await pg.clock.run_for(200)
            await expect('deck'); await pg.click('#coach .next'); await pg.clock.run_for(200)
            await pg.click('#btn-action'); await pg.clock.run_for(300)
            await pg.evaluate("(() => { const G = __yatd; let g = 0; while (g++ < 20000) { const f = G.fl; if (G.tutPopNow) { document.querySelector('#coach .next').click(); continue; } if (G.modalKind === 'hero') { G.closeModal(); G.setPaused(false); } if (G.modalKind) return; if (f.check) { if (!f.check.result) G.skipCheck(); G.clearCheck(); continue; } if (f.phase !== 'raid') return; G.step(0.05); if (f.ending !== null) { f.ending = null; G.finishWave(); } } })()")
            await to_build()
            await expect('dig'); await pg.click('#coach .next'); await pg.clock.run_for(200)
            await expect('end'); await pg.screenshot(path=SHOTS + 'b_tut_end.png'); await pg.click('#coach .next'); await pg.clock.run_for(200)
            rs = await pg.evaluate("__yatd.runSummary().tut")
            print('seen', seen); print('tut record', json.dumps(rs)[:600])
            if not any(x.startswith('card:') and 'strach' in x for x in seen): fails.append('tut: the wave 3 card (strach) in the guided run: %s' % seen)
            if not rs or rs.get('ended') != 'done' or rs.get('now') != -1: fails.append('tut: the guide ends')
            stt = (rs or {}).get('stepTimes') or []
            if len(stt) != 16 or any(x is None or x <= 0 for x in stt[:7]) or stt[-1] is None: fails.append('tut: stepTimes in the run record (seconds on each step): %s' % stt)
            allerrs.extend(errs); await ctx.close()
        # ---------- P1-5: the spikes fire ----------
        if want('spikes'):
            ctx, pg, errs = await fresh_page(b)
            await sec(pg, 'spikes', SPIKES, reps)
            allerrs.extend(errs); await ctx.close()
        # ---------- the long press on a tile ----------
        if want('hold'):
            ctx, pg, errs = await fresh_page(b, 390, 844, 2)
            await start_full(pg)
            res = {}
            for t, word in [('spikes', 'Rani'), ('portrait', 'Straszy'), ('loot', None)]:
                tab = 'loot' if t == 'loot' else 'traps'
                await pg.evaluate("t => __yatd.pickTab(%s, t)" % json.dumps(tab), t); await pg.clock.run_for(200)
                box = await pg.evaluate("t => { const e = document.querySelector('#item-' + t); e.scrollIntoView({ inline: 'center' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }", t)
                await pg.mouse.move(box[0], box[1]); await pg.mouse.down(); await pg.clock.run_for(250)
                early = await pg.evaluate("document.querySelector('#tip').hidden")
                await pg.clock.run_for(250)
                tip = await pg.evaluate("(() => { const b = document.querySelector('#tip'); return b.hidden ? null : b.innerText; })()")
                if t == 'portrait': await pg.screenshot(path=SHOTS + 'b_hold_portrait.png')
                await pg.mouse.up(); await pg.clock.run_for(200)
                gone = await pg.evaluate("document.querySelector('#tip').hidden")
                res[t] = (early, tip and tip.replace('\n', ' | ')[:120], gone)
                if not early or not tip or not gone: fails.append('hold %s: the description opens after a held finger (not at once) and goes when it is lifted: %s' % (t, res[t]))
                if word and word not in (tip or ''): fails.append('hold %s: it says %s' % (t, word))
                if not word and tip and ('Rani' in tip.split('|')[1] if '|' in tip else False): fails.append('hold loot: no Rani/Straszy')
            print('== hold', json.dumps(res, ensure_ascii=False))
            allerrs.extend(errs); await ctx.close()
        # ---------- the animations ----------
        if want('fx'):
            ctx, pg, errs = await fresh_page(b, 390, 844, 2)
            r = await sec(pg, 'fx organic', FX_ORG, reps)
            await sec(pg, 'fx skills', FX_SKILLS)
            await sec(pg, 'fx traps', FX_TRAPS)
            # a look: heroes and traps mid-animation
            await pg.evaluate("""(() => { const { G } = T; T.fresh(5); G.run.wave = 4; const f = T.raid(['warrior', 'priest', 'mage', 'bard']); G.setTrayOpen(false);
                const R = T.rooms()[0], w = T.walkT(R); G.alive().forEach((h, i) => T.put(h, w[(i * 3) % w.length][0], w[(i * 3) % w.length][1]));
                const c = G.heroPos(G.alive()[1]); G.cam.s = 52; G.centerOn(c.x, c.y); G.cam.manualUntil = 1e12; G.AFX.forEach(a => { a.on = false; }); })()""")
            await pg.clock.run_for(2400)   # the wave's banner goes first
            await pg.evaluate("""(() => { const { G } = T; const H = t => G.alive().find(h => h.type === t), p = h => G.heroPos(h);
                G.heroFx('shield', H('warrior')); G.heroFx('heal', H('priest'), { col: '#ffe9a8' }); G.heroFx('notes', H('bard'), { col: '#73d6c6' }); G.heroFx('rage', H('warrior')); G.heroFx('potion', H('mage'));
                const a = p(H('mage')), b2 = p(H('bard')); G.afx('fireball', a.x, a.y, { x2: b2.x, y2: b2.y }); })()""")
            await pg.clock.run_for(200); await pg.screenshot(path=SHOTS + 'b_fx_heroes.png')
            await pg.evaluate("""(() => { const { G } = T; const R = T.rooms()[0], w = T.walkT(R), h = G.alive()[0]; let k = 0;
                ['spikes', 'trapdoor', 'web', 'cage'].forEach((kind, i) => { const t = w[(i * 3 + 1) % w.length]; G.afx(kind, t[0] + 0.5, t[1] + 0.5); });
                const t2 = w[w.length - 1]; G.afx('powder', t2[0] + 0.5, t2[1] + 0.5, { z: 0.5 }); G.afx('mist', w[2][0] + 0.5, w[2][1] + 0.5); G.afx('rattle', w[4][0] + 0.5, w[4][1] + 0.5); })()""")
            await pg.clock.run_for(200); await pg.screenshot(path=SHOTS + 'b_fx_traps.png')
            allerrs.extend(errs); await ctx.close()
            # reduced motion: nothing starts
            ctx, pg, errs = await fresh_page(b, 390, 844, 1, None, 'reduce')
            rm = await pg.evaluate("""(() => { const { G } = T; T.fresh(5); const f = T.raid(['warrior']); const a = G.heroFx('shield', G.alive()[0]); return { got: a, on: G.AFX.filter(x => x.on).length, counted: G.AFXN.shield || 0 }; })()""")
            print('== fx reduced motion', rm)
            if rm['got'] is not None or rm['on'] != 0: fails.append('fx: no animation with reduced motion: %s' % rm)
            allerrs.extend(errs); await ctx.close()
        # ---------- the preview ----------
        if want('preview'):
            ctx, pg, errs = await fresh_page(b, 380, 800)
            await start_full(pg)
            # visible without a tap; a tap on it opens the list and counts as looking (previewOpened)
            await pg.evaluate("(() => { const G = __yatd; G.UI.listOpen = false; })()"); await pg.clock.run_for(300)
            vis = await pg.evaluate("(() => { const G = __yatd; return { l1: G.PV.l1, list: G.PV.list === G.run.next, w: G.PV.w, cw: G.cwch[0] }; })()")
            print('preview drawn', vis)
            if not vis['list'] or not vis['l1'] or vis['w'] > vis['cw'] - 12: fails.append('preview: drawn in the build without a tap, within the view: %s' % vis)
            n0 = await pg.evaluate("__yatd.run.previewN || 0")
            xy = await pg.evaluate("T.page(40, 18)"); await pg.mouse.click(xy[0], xy[1]); await pg.clock.run_for(200)
            n1 = await pg.evaluate("__yatd.run.previewN || 0"); op = await pg.evaluate("__yatd.UI.listOpen")
            print('preview tap', n0, n1, op)
            if not (n1 == n0 + 1 and op): fails.append('preview: a tap opens the list and is counted (%s -> %s, %s)' % (n0, n1, op))
            await pg.evaluate("(() => { __yatd.UI.listOpen = false; })()")
            await sec(pg, 'preview', PREVIEW, 10)
            allerrs.extend(errs); await ctx.close()
        # ---------- the fear bar ----------
        if want('fear'):
            ctx, pg, errs = await fresh_page(b, 390, 844, 2)
            await start_full(pg)
            await sec(pg, 'fear1', FEAR1)
            await pg.clock.run_for(2400)   # the wave's banner goes first (the game stands: paused)
            r = await sec(pg, 'fear2', FEAR2)
            await pg.screenshot(path=SHOTS + 'b_fear_bars.png')
            if r and r['out']['rects']:
                rc = await pg.evaluate("(() => { const q = __yatd.fearRects; const r = q[q.length - 1]; return { x: r.x, y: r.y, w: r.w, h: r.h }; })()")   # the last drawn (on top)
                xy = await pg.evaluate("r => T.page(r.x + r.w / 2, r.y + r.h / 2)", rc)
                await pg.mouse.click(xy[0], xy[1]); await pg.clock.run_for(200)
                await sec(pg, 'fear3', FEAR3)
                await pg.clock.run_for(600); await pg.screenshot(path=SHOTS + 'b_summary.png')
            allerrs.extend(errs); await ctx.close()
        # ---------- screenshots ----------
        if want('shots'):
            for (w, h, tag) in [(390, 844, 'port'), (844, 390, 'land')]:
                ctx, pg, errs = await fresh_page(b, w, h, 2)
                await start_full(pg)
                await pg.evaluate("(() => { const G = __yatd; G.fl.essence = 60; for (let i = 0; i < 2; i++) { const m = G.toolMarkers('dig'); if (m.length) G.applyTool(m[0]); G.fl.essence = 60; } })()")
                await pg.clock.run_for(400); await pg.screenshot(path=SHOTS + 'b_%s_build.png' % tag)
                await pg.click('#btn-action'); await pg.clock.run_for(300)
                if await pg.evaluate("__yatd.modalKind") == 'unspent': await pg.click('#unspent-go'); await pg.clock.run_for(300)
                await pg.evaluate("(() => { const G = __yatd; for (let i = 0; i < 160; i++) { const c = G.fl.check; if (c && !c.result) { G.resolveCheck((c.g0 + c.g1) / 2); G.clearCheck(); continue; } G.step(0.05); } G.alive().forEach((h, i) => { h.fear = h.courage * (0.3 + 0.25 * i); }); })()")
                await pg.clock.run_for(2600); await pg.screenshot(path=SHOTS + 'b_%s_raid.png' % tag)
                allerrs.extend(errs); await ctx.close()
        await b.close()
    if allerrs: fails.append('page errors: %s' % allerrs[:3])
    print('FAILS', fails)
    sys.exit(1 if fails else 0)
asyncio.run(main())
