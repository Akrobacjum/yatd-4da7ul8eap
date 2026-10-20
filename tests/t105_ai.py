# 1.05 AI checks: a lost hero found by a bard's call vs. by the party's answer; barbarian fury on a death and instead of panic
import asyncio, sys, json
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
JS = r"""async ([types, mode]) => { const G = __yatd; while (G.modalKind) G.closeModal();
  G.newRun(false); while (G.modalKind) G.closeModal();
  const nx = G.makeWave(6).slice(0, types.length); nx.forEach((e, i) => { e.type = types[i]; e.trait = null; }); G.run.next = nx;
  G.startWave(); const f = G.fl; const run = (sec) => { for (let i = 0; i < sec / 0.05 && f.phase === 'raid'; i++) { const c = f.check; if (c && !c.result) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); } };
  run(12);
  const res = { t0: f.time };
  if (mode === 'lost') {
    const L = G.leader(); const h = G.alive().filter(o => o !== L && o.type !== 'bard').sort((a, b) => b.id - a.id)[0];
    if (!h) return { err: 'no hero' };
    // carry him far away from the leader (another room), as if he had wandered off
    let best = null, bd = -1; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) { if (!G.walkable(x, y) || G.roomOf(x, y) < 0 || G.roomOf(x, y) === L.room) continue; const d = Math.hypot(x - L.tx, y - L.ty); if (d > bd && d < 16) { bd = d; best = [x, y]; } }
    if (best) { h.x = h.tx = best[0]; h.y = h.ty = best[1]; h.nx = null; h.ny = null; h.prog = 0; h.room = G.roomOf(best[0], best[1]); h.path = []; }
    res.dist = Math.round(bd);
    G.getLost(h, 'test'); h.lostCallT = f.time + 0.5; res.who = h.type;
    let found = -1; for (let i = 0; i < 600 && f.phase === 'raid'; i++) { run(0.05); if (!h.lost && found < 0) { found = f.time; break; } if (h.dead || h.fled) break; }
    res.found = found < 0 ? null : Math.round((found - res.t0) * 10) / 10; res.calls = f.stats.bardCalls || 0; res.heard = f.stats.bardHeard || 0; res.answers = f.stats.answers || 0;
  } else {
    const B = G.alive().find(o => o.type === 'barbarian'), V = G.alive().find(o => o !== B);
    if (!B || !V) return { err: 'no party' };
    const trap = [...f.items.values()].find(it => G.ITEMS[it.type] && it.type === 'spikes');
    G.damage(V, 99999, trap); res.rageAfterDeath = B.rageUntil > f.time; res.fearAfter = Math.round(B.fear / B.courage * 100);
    run(16); B.inv = B.inv.filter(x => x.type !== 'amulet'); B.calmUntil = -1; B.fear = 0.6 * B.courage; G.addFear(B, 0.25 * B.courage, null, 'test'); res.fearNow = Math.round(B.fear / B.courage * 100); res.dbg = [Math.round(f.time), Math.round(B.rageCd), Math.round(B.rageUntil), B.fleeing, B.crystal, Math.round(B.panicUntil), B.dead, B.fled, G.inB('shackles', B.room)];
    res.rageInsteadOfPanic = B.rageUntil > f.time && !(B.panicUntil > f.time); res.rages = f.stats.rages; res.noPanic = f.stats.rageNoPanic || 0;
  }
  return res; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.clock.install(); await pg.goto('file://' + SC + 'test/page15.html'); await pg.clock.run_for(800)
        await pg.evaluate("__yatd.setUser && __yatd.setUser(true)")
        res = {}
        for name, types, mode in [('bard', ['warrior', 'bard', 'thief', 'priest'], 'lost'), ('no bard', ['warrior', 'mage', 'thief', 'priest'], 'lost'), ('barbarian', ['warrior', 'barbarian', 'thief', 'priest'], 'rage')]:
            rs = [await pg.evaluate(JS, [types, mode]) for _ in range(int(sys.argv[1]) if len(sys.argv) > 1 else 6)]
            print(name, json.dumps(rs)); res[name] = rs
        fails = []
        fb = sum(1 for r in res['bard'] if r.get('found') is not None); fn = sum(1 for r in res['no bard'] if r.get('found') is not None)
        print('found with a bard', fb, 'without', fn)
        if fb < len(res['bard']) // 2: fails.append('a bard finds the lost one in most tries')
        if not all(r.get('calls') for r in res['bard']): fails.append('the bard calls')
        if not all(r.get('rageAfterDeath') for r in res['barbarian']): fails.append('a barbarian rages at a death')
        if errs: fails.append('page errors')
        print('FAILS', fails); print('errs', errs[:4]); await b.close()
asyncio.run(main())
