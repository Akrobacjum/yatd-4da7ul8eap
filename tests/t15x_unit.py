import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r"""
() => {
  const G = __yatd; while (G.modalKind) G.closeModal();
  const out = {}, R = a => a[Math.floor(Math.random() * a.length)], key = (x, y) => x + ',' + y;
  function setup(deck, unl) { G.newRun(false); const run = G.run; (unl || []).forEach(t => run.unlocked.add(t)); run.deck = deck || []; G.recomputeMods(); G.startBuild(); G.fl.essence = 400; }
  function grow(n) { for (let k = 0; k < n; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(R(dm)); G.fl.essence = 400; } }
  function spawnAll() { G.startWave(); for (let i = 0; i < 300 && G.fl.queue.length; i++) G.step(0.05); return G.fl.heroes.filter(h => !h.dead && !h.fled); }
  function placeOnPath(t, from) { for (const p of G.shortestPath().slice(from || 3)) if (G.canPlace(t, p[0], p[1]) && G.tryPlace(t, p[0], p[1])) return G.fl.items.get(key(p[0], p[1])); return null; }
  function placeInRoom(t, room) { for (const q of room.tiles) if (G.canPlace(t, q[0], q[1]) && G.tryPlace(t, q[0], q[1])) return G.fl.items.get(key(q[0], q[1])); return null; }
  // 1. fame
  setup(); G.run.total = 16000;
  out.fame = { base5: Math.round(G.waveBase(5) * 100) / 100, curve5: Math.round(G.waveCurve(5) * 100) / 100 };
  // 2. upgrades: cost, level, damage ratio, bleed
  setup();
  const sp = placeOnPath('spikes'); const c2 = G.fl.essence;
  G.upgradeItem(sp); const c3 = G.fl.essence; G.upgradeItem(sp); const c4 = G.fl.essence;
  out.upg = { lvl: sp.lvl, spent: sp.spent, paid2: Math.round(c2 - c3), paid3: Math.round(c3 - c4), fourth: G.upgradeItem(sp) };
  let hs = spawnAll(); const h = hs[0];
  h.x = sp.x; h.y = sp.y; h.tx = sp.x; h.ty = sp.y; h.nx = null; h.prog = 0; h.state = 'walk'; h.hp = h.max = 99999; h.shield = 0; h.inv = [];
  G.fl.combo = 1; G.fl.lastTrapAt = -99; let hp0 = h.hp; G.fire(sp, 1); const d3 = hp0 - h.hp;
  out.upg.l3dmg = Math.round(d3); out.upg.expect = Math.round(35 * 0.7 * 2.4); out.upg.bleeding = h.burnUntil > G.fl.time && h.burnBy === 'spikes';
  // monster upgrade
  setup(); const gb = placeOnPath('goblin'); const hp1 = gb.max; G.upgradeItem(gb); out.monUpg = { hp1, hp2: gb.max, pow: Math.round(gb.power * 100) / 100 };
  // 3. buildings: rules
  setup(); grow(2);
  const room = G.fl.rooms.filter(r => r.kind === 'room').sort((a, b) => b.tiles.length - a.tiles.length)[0];
  const hall = G.fl.rooms.find(r => r.kind === 'hall' && r.tiles.length);
  const rune = placeInRoom('rune', room);
  out.bRules = { placed: !!rune, second: !!placeInRoom('rune', room), inHall: hall ? hall.tiles.some(q => G.canPlace('altar', q[0], q[1])) : 'no hall', altarSame: !!placeInRoom('altar', room) };
  // rune blocks the mage's jam; altar halves the ward
  setup(); grow(3);
  const r2 = G.fl.rooms.filter(r => r.kind === 'room' && r.id !== G.fl.heart.room).sort((a, b) => b.tiles.length - a.tiles.length)[0];
  for (let k = 0; k < 3; k++) { const em = G.toolMarkers('expand').find(m => m.room === r2.key); if (em) G.applyTool(em); G.fl.essence = 400; }
  const t1 = placeInRoom('spikes', r2), t2 = placeInRoom('spikes', r2), rn = placeInRoom('rune', r2), al = placeInRoom('altar', r2);
  hs = spawnAll();
  const mg = hs[0], pr = hs[1] || hs[0];
  mg.type = 'mage'; mg.lvl = 12; pr.type = 'priest'; pr.lvl = 12; pr.faith = pr.faithMax = 12;
  t1.detected = true; t2.detected = true;
  G.fl.party.prep = { room: r2.id, until: G.fl.time - 1, pr: pr.id, mg: mg.id, th: -1, wr: -1 };
  hs.forEach(o => { o.shield = 0; });
  G.step(0.3);
  out.counters = { jammed: (t1.jamUntil || 0) > G.fl.time, runeBlocks: G.fl.stats.runeBlocks || 0, altarBlocks: G.fl.stats.altarBlocks || 0, shieldFrac: Math.round(hs[0].shield / hs[0].max * 1000) / 1000, fullFrac: Math.round((0.15 + 0.012 * 12) * 1000) / 1000 };
  // decoy: alarm fires the room's traps
  setup(); grow(3);
  const r3 = G.fl.rooms.filter(r => r.kind === 'room' && r.id !== G.fl.heart.room).sort((a, b) => b.tiles.length - a.tiles.length)[0];
  for (let k = 0; k < 3; k++) { const em = G.toolMarkers('expand').find(m => m.room === r3.key); if (em) G.applyTool(em); G.fl.essence = 400; }
  const s1 = placeInRoom('spikes', r3), s2 = placeInRoom('spikes', r3), dc = placeInRoom('decoy', r3);
  spawnAll();
  const f0 = G.run.fires; G.decoyAlarm(dc, null);
  out.decoy = { fired: G.run.fires - f0, decoyDisabled: dc.disabled, alarms: G.fl.stats.alarms };
  // acid halves warrior shield
  setup(); grow(2);
  const r4 = G.fl.rooms.filter(r => r.kind === 'room').sort((a, b) => b.tiles.length - a.tiles.length)[0];
  const sp4 = placeInRoom('spikes', r4), ac = placeInRoom('acid', r4);
  hs = spawnAll(); const w = hs[0]; w.type = 'warrior'; w.shieldUpUntil = G.fl.time + 99; w.x = sp4.x; w.y = sp4.y; w.tx = sp4.x; w.ty = sp4.y; w.room = r4.id; w.nx = null; w.state = 'walk';
  out.acid = { inAcid: G.inB('acid', r4.id), shield: Math.round(w.R.shield * 100) / 100 };
  // veil: no rumours of that room; fortify: no breach there (tested statistically below)
  setup(); grow(3);
  const r5 = G.fl.rooms.filter(r => r.kind === 'room' && r.id !== G.fl.heart.room)[0];
  const vt = placeInRoom('spikes', r5), vl = placeInRoom('veil', r5);
  hs = spawnAll(); vt.detected = true;
  G.fl.anyOut = true; G.fl.heroes.forEach(o => { o.fled = true; o.fleeing = true; });
  for (let i = 0; i < r5.tiles.length; i++) G.fl.known[r5.tiles[i][1] * G.WW + r5.tiles[i][0]] = 1;
  G.finishWave(); while (G.modalKind) G.closeModal();
  out.veil = { trapRumor: G.run.rumor.traps.has(key(vt.x, vt.y)), tileRumor: r5.tiles.some(q => G.run.rumor.tiles.has(q[1] * G.WW + q[0])) };
  // 4. guild adaptation
  setup(); G.run.wave = 4;
  G.run.waves.push({ wave: 3, heroes: [{}, {}, {}], stats: { fearPts: 5000, scarePts: 3000, dmgPts: 1000, killPts: 0, kills: 0 } });
  const g = G.guildAdapt(4), list = G.makeWave(4);
  out.guild = { kind: g && g.kind, priests: list.filter(e => e.type === 'priest').length, amulets: list.filter(e => e.inv.some(i => i.type === 'amulet')).length, size: list.length };
  // traits
  setup(); let tr = {}; for (let k = 0; k < 40; k++) G.makeWave(6).forEach(e => { tr[e.trait || 'none'] = (tr[e.trait || 'none'] || 0) + 1; }); out.traits = tr;
  // 5. auto fast-forward when nobody is near anything
  setup(); hs = spawnAll(); for (let i = 0; i < 20; i++) G.step(0.05);
  out.quiet = { quiet: G.quietNow(), quietT: Math.round(G.fl.quietT * 10) / 10 };
  // 6. champion shout
  setup(); G.run.wave = 5; G.startBuild(); G.fl.essence = 400; hs = spawnAll();
  const champ = G.fl.heroes.find(o => o.boss === 'champion'); const other = hs.find(o => o !== champ);
  hs.forEach(o => { o.fear = 0.6 * o.courage; });
  const victim = hs.find(o => o !== champ && o !== other) || other;
  victim.fear = victim.courage + 1; G.addFear(victim, 1, null);
  out.champ = { champ: !!champ, shouts: G.fl.stats.shouts || 0, otherFear: other ? Math.round(other.fear / other.courage * 100) / 100 : null };
  // 7. save and resume
  G.setUser(true);
  setup(); grow(2); const spS = placeOnPath('spikes'); G.upgradeItem(spS); G.run.deck = ['spikes', 'calm']; G.recomputeMods();
  const ess = G.fl.essence; G.saveRun('build');
  const snap = { wave: G.run.wave, items: G.fl.items.size, lvl: spS.lvl, deck: G.run.deck.join(','), cells: G.run.layout.cells.size, ess: Math.floor(ess), id: G.run.id };
  G.setUser(false); G.newRun(false);   // something else in between (the demo does not save)
  G.setUser(true); const ok = G.resumeRun();
  const it2 = G.fl.items.get(key(spS.x, spS.y));
  out.resume = { ok, same: snap.wave === G.run.wave && snap.items === G.fl.items.size && snap.deck === G.run.deck.join(',') && snap.cells === G.run.layout.cells.size && snap.id === G.run.id, lvl: it2 && it2.lvl, ess: Math.floor(G.fl.essence), essWas: snap.ess, spikeMod: G.mods.spikeDmg, resumed: G.run.resumed };
  G.clearSave(); G.setUser(false);
  return out;
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':360,'height':740})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e) + ' ' + (e.stack or '')[:400]))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        r = await page.evaluate(JS)
        for k,v in r.items(): print(k, v)
        print('pageerrors', errs[:5])
        await b.close()
asyncio.run(main())
