# 1.27.7: the Archer is a goblin (Greenskins), and element descriptions carry tags: place, reach, family (beside Rani / Straszy)
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])
RUN = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); }; T.fresh(4);
  const W = t => G.tagChips(t).map(x => x[0]);
  out.archer = W('archer'); ok(JSON.stringify(out.archer) === JSON.stringify(['Rani', 'Potwór', 'Dystans', '♣ Zielonoskórzy']), 'archer ' + out.archer);
  out.spikes = W('spikes'); ok(out.spikes.includes('Podłoga') && out.spikes.includes('Jedno pole'), 'spikes ' + out.spikes);
  out.portrait = W('portrait'); ok(out.portrait.includes('Ściana') && out.portrait.includes('Dystans') && out.portrait.includes('Straszy'), 'portrait ' + out.portrait);
  out.goblin = W('goblin'); ok(out.goblin.includes('Zwarcie'), 'goblin melee');
  const miss = Object.keys(G.ITEMS).filter(t => ['floor', 'wall', 'door', 'object'].includes(G.ITEMS[t].slot) && G.tagChips(t).filter(x => x[1] === 'place').length !== 1);
  ok(!miss.length, 'every element has one place tag: ' + miss);
  const noReach = Object.keys(G.ITEMS).filter(t => (G.TRAPS[t] || G.MONSTERS && G.MONSTERS[t]) && !G.tagChips(t).some(x => x[1] === 'reach'));
  out.noReach = noReach;
  return { fails, out }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx, pg, errs = await fresh_page(b)
        r = await pg.evaluate(RUN); print(json.dumps(r['out'], ensure_ascii=False)); fails = r['fails'] + ['page error: ' + e for e in errs]
        await ctx.close(); await b.close(); print('FAILS', fails); sys.exit(1 if fails else 0)
asyncio.run(main())
