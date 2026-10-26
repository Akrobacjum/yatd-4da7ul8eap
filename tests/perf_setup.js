([doc, hush, wave]) => {
  const G = __yatd; while (G.modalKind) G.closeModal();
  G.newRun(false); while (G.modalKind) G.closeModal();
  const run = G.run, L0 = doc.layout;
  const L = { cells: new Map(), edges: new Map(), entrance: L0.entrance, heartKey: L0.heart, entX: L0.entX };
  L0.cells.forEach(c => { const o = { cx: c[0], cy: c[1], x0: c[2], y0: c[3], x1: c[4], y1: c[5], lvl: c[6], born: 0, objs: c[7].map(o => o[3] ? [o[0], o[1], o[2], 1] : [o[0], o[1], o[2]]) }; if (c[8]) o.rt = c[8]; if (c[9]) o.rk = c[9]; if (hush.includes(c[0] + ',' + c[1])) o.rt = 'hush'; L.cells.set(c[0] + ',' + c[1], o); });
  L0.edges.forEach(e => { const k = e[0] < e[1] ? e[0] + '|' + e[1] : e[1] + '|' + e[0]; L.edges.set(k, { key: k, a: e[0], b: e[1], horiz: !!e[2], pa: e[3], pb: e[4], lvl: e[5], born: 0 }); });
  run.layout = L; run.wave = wave; run.total = 763; run.crystals = 3;
  run.deck = (doc.deck || []).slice(); G.recomputeMods();
  (doc.upgrades || []).forEach(id => { const u = G.UPG[id]; if (u && u.kind === 'unlock') run.unlocked.add(u.unlock); });
  run.items.clear();
  const LM = [1, 1, 1.5, 2.2];
  L0.items.forEach(([type, x, y, lvl, dropped]) => { if (dropped) return; const T = G.ITEMS[type]; lvl = lvl || 1; const hp = T.hp ? T.hp * G.mods.monster * LM[lvl] : 0; run.items.set(x + ',' + y, { type, x, y, cd: 0, anim: 0, disabled: false, hp, max: hp, power: G.mods.monster * (T.hp ? LM[lvl] : 1), shot: 0.5, flash: 0, preview: 0, gx: x + 0.5, gy: y + 0.5, lvl, spent: T.cost, dropped: false }); run.unlocked.add(type); });
  G.startBuild(true);
  run.next = G.makeWave(run.wave);
  