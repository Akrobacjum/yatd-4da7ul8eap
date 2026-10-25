# 1.15 (author: room kinds that work on given monsters or traps; Loch split into Kopanie / Komnaty / Efekty): a komnata
# gives its family the level-3 trait without upgrading (+25% power to those already at level 3), costs 12, takes no room
# space, sits beside an effect, comes off for half back, swaps with another komnata; locked until a family member is open;
# undo brings it back; the run log keeps it as cell [9]; every kind draws without errors (floor, walls, life, glows), every
# komnata has small raised things standing in it and raised pieces for its walls.
import asyncio, json
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal();
  G.run.wave = 3; G.startBuild(); G.fl.essence = 900;
  for (let k = 0; k < 3; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(dm[0]); G.fl.essence = 900; }
  const f = G.fl, R = f.rooms.filter(r => r.kind === 'room' && r.id !== f.heart.room)[0];
  // the Loch tab: three sub-tabs, 12 komnaty in the middle one
  const loch = G.TABS.find(t => t.id === 'dungeon');
  out.subs = loch.subs.map(s => s.id + ':' + s.label + ':' + s.items.length);
  ok(out.subs.join() === 'dig:Kopanie:4,kind:Komnaty:15,effect:Efekty:' + loch.subs[2].items.length && loch.subs[2].items.every(t => t.startsWith('r_')), 'Loch = Kopanie (4) / Komnaty (15) / Efekty (r_*)');
  ok(Object.keys(G.KIND_INFO).length === 15, '15 komnaty (1.26: Laboratorium, Cmentarz, Wrota otchłani)');
  Object.values(G.KIND_INFO).forEach(K => K.items.forEach(t => ok(G.KIND_OF[t] === Object.keys(G.KIND_INFO).find(k => G.KIND_INFO[k] === K), t + ' belongs to its komnata')));
  const ALL = 'spikes web trapdoor cage arrows fire portrait gate powder mimic eyes bones mirror creak coffin musicbox goblin archer spider ogre shaman ghost shade bats pendulum snare miasma oilslick bolt flood bell falsedoor tar skeleton zombie lich imp hound siren demon sapper warlord rats'.split(' ');
  out.noKind = ALL.filter(t => !G.KIND_OF[t]); ok(!out.noKind.length, 'every trap and monster has a komnata');
  ok(Object.values(G.KIND_INFO).reduce((a, K) => a + K.items.length, 0) === ALL.length, 'each in exactly one');
  // a trap of the family: no trait, then the trait for free
  const t0 = R.tiles.find(q => G.canPlace('spikes', q[0], q[1])); G.tryPlace('spikes', t0[0], t0[1]);
  const sp = f.items.get(t0[0] + ',' + t0[1]);
  let wx = null; for (let y = R.y0 - 1; y <= R.y1 + 1 && !wx; y++) for (let x = R.x0 - 1; x <= R.x1 + 1; x++) if (G.canPlace('arrows', x, y) && G.slotRoom('arrows', x, y) === R.id) { wx = [x, y]; break; }
  if (wx) G.tryPlace('arrows', wx[0], wx[1]);
  const ar = wx && f.items.get(wx[0] + ',' + wx[1]);
  out.before = [G.t3(sp), ar && G.t3(ar)]; ok(!out.before[0] && !out.before[1], 'no trait at level 1 before');
  const m = G.toolMarkers('k_armory').find(q => q.room === R.key);
  out.cost = G.toolCost('k_armory', m); ok(out.cost === 10, 'a komnata costs 10 (1.26)');
  const e0 = f.essence;
  ok(G.applyTool(m), 'Zbrojownia goes in');
  out.paid = e0 - f.essence; ok(out.paid === 10, 'paid 10');
  out.after = [G.t3(sp), ar && G.t3(ar)]; ok(out.after[0], 'Kolce get the trait'); ok(!wx || out.after[1], 'Strzały on the wall facing the room get it too');
  out.pow = [G.kindPow(sp)]; sp.lvl = 3; out.pow.push(G.kindPow(sp)); sp.lvl = 1;
  ok(out.pow[0] === 1 && out.pow[1] === 1.25, 'level 1: no extra power; level 3: x1,25');
  // an effect beside it
  ok(G.applyTool(G.toolMarkers('r_fog').find(q => q.room === R.key)), 'Mgła beside it');
  out.both = [R.rk, R.rt]; ok(R.rk === 'armory' && R.rt === 'fog', 'a komnata and an effect together');
  // the log keeps it
  const snap = G.snapshotLayout(), cell = snap.cells.find(c => c[2] === R.x0 && c[3] === R.y0);
  out.cell9 = cell && cell[9]; ok(out.cell9 === 'armory' && cell[8] === 'fog', 'layout cell [8] effect, [9] komnata');
  // swap for another komnata
  const mf = G.toolMarkers('k_forge').find(q => q.room === R.key); out.swapOther = mf.other || null;
  ok(G.applyTool(mf), 'Kuźnia replaces it'); out.swapped = R.rk; ok(R.rk === 'forge' && !G.t3(sp), 'swapped: Kolce lose the trait');
  out.hint = (document.querySelector('#hint') || {}).textContent || '';
  // undo brings Zbrojownia back
  G.undo(); const R2 = G.fl.rooms.find(r => r.key === R.key); out.undo = R2.rk; ok(R2.rk === 'armory', 'undo brings the komnata back');
  // off for half back
  const m3 = G.toolMarkers('k_armory').find(q => q.room === R.key); out.has = m3.has; out.offCost = G.toolCost('k_armory', m3);
  const e1 = G.fl.essence; G.applyTool(m3); out.refund = G.fl.essence - e1;
  ok(m3.has && out.offCost === 0 && out.refund === 5 && !R2.rk && R2.rt === 'fog', 'off for 5 back, the effect stays');
  // a door trap counts in both rooms of its door (its slotRoom is often the corridor)
  G.run.unlocked.add('gate'); G.run.unlocked.add('k_prison'); G.fl.essence = 900;
  const dr = [...G.fl.doors.values()].find(d => (d.a === R2.id || d.b === R2.id) && G.canPlace('gate', d.x, d.y));
  if (dr) { G.tryPlace('gate', dr.x, dr.y); const gt = G.fl.items.get(dr.x + ',' + dr.y);
    out.gate0 = G.t3(gt); ok(G.applyTool(G.toolMarkers('k_prison').find(q => q.room === R.key)), 'Więzienie goes in');
    out.gate1 = G.t3(gt); out.gateSlot = G.slotRoom('gate', dr.x, dr.y) === R2.id ? 'room' : 'other side';
    ok(!out.gate0 && out.gate1, 'Krata on a door of the Więzienie gets the trait'); } else fails.push('no door for a gate');
  // locked while no member of the family is open
  G.run.unlocked.delete('mimic');
  out.junkLocked = G.run.unlocked.has('k_junk') && !G.KIND_INFO.junk.items.some(x => G.run.unlocked.has(x));
  return { out, fails }; }'''
DRAW = r'''() => { const G = __yatd, out = {};
  G.run.wave = 6; G.startBuild(); G.fl.essence = 9999; Object.keys(G.ITEMS).forEach(k => G.run.unlocked.add(k));
  for (let k = 0; k < 16; k++) { const dm = G.toolMarkers('dig'); if (!dm.length) break; G.applyTool(dm[Math.floor(dm.length / 2)]); G.fl.essence = 9999; }
  const rooms = G.fl.rooms.filter(r => r.kind === 'room' && r.id !== G.fl.heart.room), kinds = Object.keys(G.KIND_INFO);
  const effs = Object.keys(G.RT_INFO);
  rooms.forEach((R, i) => { const m = G.toolMarkers(G.KIND_INFO[kinds[i % kinds.length]].item).find(q => q.room === R.key); if (m) G.applyTool(m); G.fl.essence = 9999;
    const me = G.toolMarkers(G.RT_INFO[effs[i % effs.length]].item).find(q => q.room === R.key); if (me) G.applyTool(me); G.fl.essence = 9999; });   // author: a kind and an effect stack
  out.kinds = [...new Set(G.fl.rooms.filter(r => r.rk).map(r => r.rk))].length;
  out.props = G.fl.rooms.filter(r => r.rk).map(r => [r.rk, G.kindProps(r).length]);
  out.noDraw = [...new Set(G.fl.rooms.filter(r => r.rk).flatMap(r => G.kindProps(r).map(p => p.t)))].filter(t => !G.PROP[t]);
  out.plans = Object.keys(G.KIND_INFO).filter(k => !G.PROP_PLAN[k] || !G.KIND_WALL3D[k]);
  out.bothN = G.fl.rooms.filter(r => r.rk && r.rt).length; out.effs = [...new Set(G.fl.rooms.filter(r => r.rk && r.rt).map(r => r.rt))].length;
  return out; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        r = await page.evaluate(JS); fails = r['fails']
        await page.clock.run_for(300)
        await page.click('#tab-dungeon'); await page.click('#sub-kind'); await page.clock.run_for(300)
        lk = await page.evaluate("() => { const b = document.querySelector('#item-k_junk'); return [!b.hidden, b.classList.contains('off'), !!b.querySelector('.lock') && getComputedStyle(b.querySelector('.lock')).display !== 'none']; }")
        r['out']['junkTray'] = lk
        if r['out']['junkLocked'] and not (lk[0] and lk[1]): fails.append('Graciarnia is off in the tray while no mimic is open')
        d = await page.evaluate(DRAW); r['out'].update(d)
        if d['kinds'] < 15: fails.append('could not set all 15 komnaty (%d)' % d['kinds'])
        if d['effs'] < 9: fails.append('every effect sits with a komnata somewhere (%d of 9)' % d['effs'])
        if any(n < 1 for k, n in d['props']): fails.append('a komnata without anything standing in it: %s' % d['props'])
        if d['noDraw'] or d['plans']: fails.append('props or wall pieces without a drawing: %s %s' % (d['noDraw'], d['plans']))
        for zoom in (14, 30, 52):   # far, middle, near: every layer of the art runs
            await page.evaluate('(s) => { const G = __yatd; G.cam.s = s; const R = G.fl.rooms.find(r => r.rk); G.centerOn((R.x0 + R.x1 + 1) / 2, (R.y0 + R.y1 + 1) / 2); }', zoom)
            await page.clock.run_for(400)
        print(json.dumps(r['out'], ensure_ascii=False))
        print('FAILS', fails + (['page errors %s' % errs[:2]] if errs else []))
        await b.close()
asyncio.run(main())
