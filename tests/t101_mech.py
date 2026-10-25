# 1.01 mechanics: the gate (fixed 4 s, cooldown after it opens, level 3 = 2 more closings), retreat after patience, fog loses heroes
import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const fresh = () => { while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal(); G.fl.essence = 999; };
  // 1. the gate
  let door = null;
  for (let t = 0; t < 12 && !door; t++) { fresh(); for (const d of G.fl.doors.values()) if (!d.entrance && G.canPlace('gate', d.x, d.y)) { door = d; break; } }   // a fresh dungeon now and then has no free door
  G.tryPlace('gate', door.x, door.y); const it = G.fl.items.get(door.x + ',' + door.y); it.lvl = 3;
  G.startWave(); let g = 0; while (G.fl.queue.length && g++ < 400) G.step(0.05);
  G.fire(it, 2.43 * 2.4);   // a critical hit with Hazardzista on a level 3 gate: used to shut it for ~23 s
  const shut = door.closedUntil - G.fl.time;
  out.gate = { shut: Math.round(shut * 100) / 100, cd: Math.round(it.cd * 100) / 100 };
  ok(Math.abs(shut - 6) < 0.01, 'gate shut 6 s whatever the power (1.26)'); ok(it.cd > shut + 7.9, 'cooldown starts when it opens');
  for (let k = 0; k < 6; k++) { it.cd = 0; it.disabled = false; G.fire(it, 1); }
  out.gate.uses = it.uses; out.gate.disabled = it.disabled;
  ok(it.uses <= 7, 'level 3: 3 + 2 closings');
  // 2. patience: retreat (not the old charge)
  fresh(); G.startWave(); g = 0; while (G.fl.queue.length && g++ < 400) G.step(0.05);
  G.fl.heartKnown = true; G.becomeImpatient();
  out.retreat = { plan: G.fl.party.plan, storm: G.fl.storm, council: !!G.fl.party.council, fearless: G.fl.fearless };
  // 1.17: patience over opens a council (t117_ai tests its outcomes); with no choice left (heart not known to the leader,
  // the extra time used) they go home as before
  ok(G.fl.party.council && !G.fl.fearless, 'patience over: a council');
  fresh(); G.startWave(); g = 0; while (G.fl.queue.length && g++ < 400) G.step(0.05);
  G.fl.party.councilMore = true; G.becomeImpatient();
  out.retreat2 = { plan: G.fl.party.plan, storm: G.fl.storm };
  ok(G.fl.party.plan === 'leave' && G.fl.storm === false, 'patience over, no choice left: retreat');
  // 3. fog: a fog room on the way, heroes inside lose the party
  fresh();
  const L = G.run.layout, cells = [...L.cells.entries()].filter(([k, c]) => k !== L.entrance && k !== L.heartKey);
  cells.forEach(([k, c]) => { c.rt = 'fog'; }); G.rebuildDungeon(true); G.startBuild(true);
  let lost = 0, grope = 0;
  for (let rep = 0; rep < 6; rep++) {
    fresh(); const L2 = G.run.layout; [...L2.cells.entries()].forEach(([k, c]) => { if (k !== L2.entrance && k !== L2.heartKey) c.rt = 'fog'; }); G.rebuildDungeon(true); G.startBuild(true);
    G.startWave(); g = 0; while (G.fl.phase === 'raid' && g++ < 1200) { if (G.fl.check) { G.skipCheck(); G.clearCheck(); continue; } G.step(0.05); if (G.fl.ending !== null) break; }
    lost += G.fl.stats.gotLost; grope += G.fl.stats.fogGrope || 0;
  }
  out.fog = { lost, grope }; ok(grope >= 3, 'the leader gropes in the fog'); ok(lost >= 3, 'heroes get lost in the fog');
  return { out, fails }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(400)
        r = await page.evaluate(JS); print(json.dumps(r['out'], ensure_ascii=False)); print('FAILS', r['fails']); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
