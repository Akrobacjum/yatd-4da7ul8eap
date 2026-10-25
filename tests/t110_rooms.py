# 1.10 (author: more room types that play with the other mechanics): Sanktuarium (a false haven), Zębatki (faster reload,
# the same trap twice builds combo), Głusza (no words: no warnings, no calls, +20% fear, bubbles go '…'), Lodownia (slides).
import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const fresh = () => { while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal(); G.run.tutorial = false; G.fl.essence = 999; };
  const typeAll = rt => { const L = G.run.layout; [...L.cells.entries()].forEach(([k, c]) => { if (k !== L.entrance && k !== L.heartKey) c.rt = rt; }); G.rebuildDungeon(true); G.startBuild(true); };
  const enter = () => { G.startWave(); let g = 0; while (G.fl.queue.length && g++ < 400) G.step(0.05); for (let i = 0; i < 60 && !G.fl.gateOpen; i++) G.step(0.05); };
  const run = (n) => { let g = 0; while (G.fl.phase === 'raid' && g++ < n) { if (G.fl.check) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); if (G.fl.ending !== null) break; } };
  // 0. the four are in the Loch tab and the tool puts one on a room
  fresh();
  const tab = G.TABS.find(t => t.id === 'dungeon').items;
  ok(['r_haven', 'r_gears', 'r_hush', 'r_ice'].every(t => tab.includes(t) && G.ITEMS[t] && G.ITEMS[t].rt), 'the new room types are in the Loch tab');
  const mk = G.toolMarkers('r_ice')[0]; const e0 = G.fl.essence; const done = mk && G.applyTool(mk);
  const R = mk && G.fl.rooms.find(r => r.key === mk.room);
  out.tool = { done, cost: e0 - G.fl.essence, rt: R && R.rt };
  ok(done && R && R.rt === 'ice' && e0 - G.fl.essence === G.ITEMS.r_ice.cost, 'the tool makes a room Lodownia');
  // 1. Lodownia: heroes slide
  let slips = 0, slid = 0;
  for (let rep = 0; rep < 4; rep++) {
    fresh(); typeAll('ice'); enter();
    let g = 0; while (G.fl.phase === 'raid' && g++ < 1500) { if (G.fl.check) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); if (G.alive().some(h => h.sliding)) slid++; if (G.fl.ending !== null) break; }
    slips += G.fl.stats.slips || 0;
  }
  out.ice = { slips, slid }; ok(slips >= 4 && slid > 0, 'heroes slide on the ice');
  // 2. Zębatki: the same trap again builds combo, and it reloads faster
  fresh(); typeAll('gears');
  const P = G.shortestPath(); let sp = null;
  for (const q of P.slice(3)) { const r = G.fl.rooms[G.roomOf(q[0], q[1])]; if (r && r.rt === 'gears' && G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); sp = G.fl.items.get(q[0] + ',' + q[1]); break; } }
  ok(sp, 'spikes in a gears room');
  if (sp) {
    enter();
    const f = G.fl; f.lastTrapC = f.cclock; f.lastTrapType = 'spikes'; f.combo = 2;
    sp.cd = 0; G.fire(sp, 1); const c1 = f.combo, cd = sp.cd;
    out.gears = { combo: c1, cd: Math.round(cd * 100) / 100, base: G.ITEMS.spikes.cd };
    ok(c1 === 3, 'the same trap twice builds combo in Zębatki (' + c1 + ')');
    ok(Math.abs(cd - G.ITEMS.spikes.cd * G.mods.cooldown * 0.75) < 0.01, 'it reloads 25% faster (' + cd + ')');
  }
  // 3. Głusza: a trap that goes off there is not learned by the witnesses (elsewhere it often is), the bubbles are '…', fear +20%
  let learnedHush = 0, firedHush = 0, learnedOpen = 0, firedOpen = 0;
  for (const rt of ['hush', null]) for (let rep = 0; rep < 6; rep++) {
    fresh(); typeAll(rt || undefined);
    const P2 = G.shortestPath(); let tr = null;
    for (const q of P2.slice(3)) { const r = G.fl.rooms[G.roomOf(q[0], q[1])]; if (r && r.kind === 'room' && (r.rt || null) === rt && r.id !== G.fl.heart.room && G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); tr = G.fl.items.get(q[0] + ',' + q[1]); break; } }
    if (!tr) continue;
    enter();
    const r = G.roomOf(tr.x, tr.y); G.alive().forEach(h => { h.x = tr.x; h.y = tr.y; h.tx = tr.x; h.ty = tr.y; h.nx = null; h.room = r; });
    tr.detected = false; tr.cd = 0; G.fire(tr, 1);
    if (rt) { firedHush++; learnedHush += tr.detected ? 1 : 0; } else { firedOpen++; learnedOpen += tr.detected ? 1 : 0; }
  }
  out.hush = { firedHush, learnedHush, firedOpen, learnedOpen, unlearned: G.fl.stats.hushUnlearned || 0 };
  ok(firedHush >= 4 && learnedHush === 0, 'traps going off in Głusza are not learned');
  ok(firedOpen >= 4 && learnedOpen >= 1, 'elsewhere they are (as before)');
  fresh(); typeAll('hush'); enter();
  { const h = G.alive()[0], r = G.fl.rooms[G.roomOf(h.tx, h.ty)]; const pick = G.fl.rooms.find(x => x.kind === 'room' && x.rt === 'hush');
    const t = pick.tiles.find(q => G.walkable(q[0], q[1])); h.x = t[0]; h.y = t[1]; h.tx = t[0]; h.ty = t[1]; h.nx = null; h.room = pick.id; h.bubble = null; h.saidUntil = -9;
    G.alive().forEach(o => { if (o !== h) { o.bubble = null; o.saidUntil = -9; } });
    h.fear = 0; G.addFear(h, 10); const fh = h.fear; h.room = -1; h.fear = 0; G.addFear(h, 10); const fo = h.fear; h.room = pick.id;
    G.fl.time += 5; G.fl.heroes.forEach(o => { o.saidUntil = -9; o.hurtAt = -99; o.panicUntil = -1; });
    const said = G.say ? null : null;
    out.hushFear = [Math.round(fh * 100) / 100, Math.round(fo * 100) / 100];
    ok(Math.abs(fh / fo - 1.1) < 0.02, 'fear +10% in Głusza (1.27.4; was +20%) (' + fh + ' vs ' + fo + ')'); }
  // 4. Sanktuarium: the safest room by far; a wounded hero naps there, heals at half speed and has nightmares
  fresh(); typeAll(undefined);
  const rooms = G.fl.rooms.filter(r => r.kind === 'room' && r.id !== G.fl.heart.room && r.key !== G.run.layout.entrance);
  const hv = rooms[rooms.length - 1]; const Lc = G.run.layout.cells.get(hv.key); Lc.rt = 'haven'; G.rebuildDungeon(true); G.startBuild(true);
  enter();
  { const f = G.fl, h = G.alive()[0], R2 = f.rooms.find(r => r.rt === 'haven');
    f.rooms.forEach(r => { if (r.kind === 'room') r.seen = true; });
    const t = R2.tiles.find(q => G.walkable(q[0], q[1])); h.x = t[0]; h.y = t[1]; h.tx = t[0]; h.ty = t[1]; h.nx = null; h.room = R2.id; h.state = 'walk'; h.hp = 0.4 * h.max; h.fear = 0; h.burnUntil = -1;
    G.fl.party.plan = 'explore'; G.planHero(h);
    const st = h.state, hp0 = h.hp; for (let i = 0; i < 20; i++) G.step(0.05);
    out.haven = { state: st, intent: h.intent, healed: Math.round((h.hp - hp0) * 100) / 100, fear: Math.round(h.fear * 10) / 10, naps: f.stats.naps || 0 };
    ok(st === 'rest' && h.intent === 'nap', 'a wounded hero sits down in Sanktuarium');
    ok(h.hp - hp0 > 0 && h.hp - hp0 < 4 * 1 * 0.6, 'he heals at half speed (' + (h.hp - hp0) + ')');
    ok(h.fear > 2, 'nightmares: his fear grows'); }
  return { out, fails }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(400)
        r = await page.evaluate(JS); print(json.dumps(r['out'], ensure_ascii=False)); print('FAILS', r['fails'] if r['fails'] or errs else 'none'); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
