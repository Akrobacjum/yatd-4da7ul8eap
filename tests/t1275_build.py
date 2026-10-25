# 1.27.5: faster building (6.7 of the 1.26 plan): "Ulepsz wszystkie w pokoju" (all of a type and level in one room, one undo step,
# the trait window once for all at level 2) and two quick taps on a free spot repeat the last placed element.
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])
RUN = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(5); const R = T.rooms()[0]; const a = T.place('spikes', T.floorSpots(R, 'spikes')[0]), b = T.place('spikes', T.floorSpots(R, 'spikes')[0]), c = b;
  const R2 = T.rooms()[1]; const o = T.place('spikes', T.floorSpots(R2, 'spikes')[0]);
  ok(a && b && c && o, 'placed');
  out.same = G.sameInRoom(a).length; ok(out.same === 2, 'two of a kind in the room: ' + out.same);
  G.fl.essence = 999; const e0 = G.fl.essence, und0 = G.undoStack ? G.undoStack.length : null;
  // the element card has the button
  G.openModal({ type: 'item', k: a.x + ',' + a.y }); const bt = document.querySelector('#sheet-upgrade-all'); out.btn = bt && bt.textContent; ok(bt && !bt.disabled, 'the card offers Ulepsz wszystkie: ' + out.btn);
  bt.click(); out.lv = [a.lvl, b.lvl, c.lvl, o.lvl]; ok(a.lvl === 2 && b.lvl === 2 && c.lvl === 2 && o.lvl === 1, 'all three in the room to level 2, not the one elsewhere: ' + out.lv);
  out.paid = e0 - G.fl.essence; while (G.modalKind) G.closeModal();
  // level 2 -> 3: the trait window once, for all
  G.openModal({ type: 'item', k: a.x + ',' + a.y }); document.querySelector('#sheet-upgrade-all').click();
  out.kind = G.modalKind; ok(G.modalKind === 'branch', 'level 3: the trait window opens');
  const sub = document.querySelector('#card .sub'); out.sub = sub && sub.textContent; ok(/× 2/.test(out.sub || ''), 'it says × 2: ' + out.sub);
  document.querySelector('#branch-B').click(); out.br = [a.branch, b.branch, c.branch, a.lvl, b.lvl, c.lvl]; ok(a.branch === 'B' && b.branch === 'B' && c.branch === 'B' && c.lvl === 3, 'all three level 3 with B: ' + out.br);
  while (G.modalKind) G.closeModal();
  // one undo step brings all three back to level 2
  if (G.undo) { G.undo(); const a2 = G.fl.items.get(a.x + ',' + a.y), c2 = G.fl.items.get(c.x + ',' + c.y); out.undo = [a2 && a2.lvl, c2 && c2.lvl]; ok(a2 && a2.lvl === 2 && c2 && c2.lvl === 2, 'one undo: all back to level 2: ' + out.undo); }
  // two taps on a free spot repeat the last placed element
  const free = T.floorSpots(R2, 'spikes').filter(t => !G.fl.items.has(t[0] + ',' + t[1]))[0]; const n0 = G.fl.items.size;
  ok(G.lastPlaced === 'spikes', 'lastPlaced: ' + G.lastPlaced);
  G.handleTap(free[0] + 0.5, free[1] + 0.5); ok(G.fl.items.size === n0, 'one tap places nothing');
  G.handleTap(free[0] + 0.5, free[1] + 0.5); out.rep = [G.fl.items.size - n0, (G.fl.items.get(free[0] + ',' + free[1]) || {}).type]; ok(G.fl.items.size === n0 + 1 && out.rep[1] === 'spikes', 'two quick taps put spikes there: ' + out.rep);
  return { fails, out }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx, pg, errs = await fresh_page(b)
        r = await pg.evaluate(RUN); print(json.dumps(r['out'])); fails = r['fails'] + ['page error: ' + e for e in errs]
        await b.close(); print('FAILS', fails); sys.exit(1 if fails else 0)
asyncio.run(main())
