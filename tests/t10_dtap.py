import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
OUT='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/look/'
async def tile_xy(page, t):
    return await page.evaluate("""(t) => { const G=__yatd, c=document.querySelector('canvas').getBoundingClientRect(); return { x: c.left + (t[0]+0.5)*G.cam.s - G.cam.ox, y: c.top + (t[1]+0.5)*G.cam.s - G.cam.oy }; }""", t)
async def center_on(page, t):
    await page.evaluate("t => { const G=__yatd; const c=document.querySelector('canvas').getBoundingClientRect(); G.cam.s = 40; G.cam.ox = (t[0]+0.5)*G.cam.s - c.width/2; G.cam.oy = (t[1]+0.5)*G.cam.s - c.height/2; G.cam.manualUntil = 1e12; }", t)
async def click(page, t, wait=100):
    xy = await tile_xy(page, t); await page.mouse.click(xy['x'], xy['y']); await page.clock.run_for(wait)
async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        await page.evaluate("(() => { const G = __yatd; G.fl.essence = 99; for (let i = 0; i < 3; i++) { const m = G.toolMarkers('dig'); if (m.length) G.applyTool(m[i % m.length]); G.fl.essence = 99; } })()")
        # tabs: object traps in Pułapki, buildings in Obiekty, no Budowle tab, no Ulepsz tile
        tabs = await page.evaluate("__yatd.TABS.map(t => t.id + ':' + t.items.join(','))")
        print('tabs', tabs)
        T = {t.split(':')[0]: t.split(':')[1].split(',') for t in tabs}
        if 'build' in T: fails.append('no Budowle tab')
        if not ('powder' in T['traps'] and 'mimic' in T['traps']): fails.append('powder, mimic in traps')
        if not all(x in T['object'] for x in ['rune', 'altar', 'decoy', 'acid', 'veil', 'fortify']): fails.append('buildings in objects')
        if 'upgrade' in T['dungeon']: fails.append('no Ulepsz tile')
        if await page.evaluate("!document.querySelector('#item-upgrade').hidden"): fails.append('Ulepsz tile hidden')
        # ---- double tap upgrades ----
        sp = await page.evaluate("(() => { const G=__yatd, P=G.shortestPath(); for (const q of P.slice(2)) if (G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); return q; } return null; })()")
        await page.evaluate("__yatd.setMode(null)")
        await center_on(page, sp); await page.clock.run_for(100)
        e0 = await page.evaluate("__yatd.fl.essence")
        await click(page, sp, 120); await click(page, sp, 200)
        st = await page.evaluate("(t => ({ lvl: __yatd.fl.items.get(t[0]+','+t[1]).lvl, ess: __yatd.fl.essence, mk: __yatd.movingKey }))", sp)
        print('double tap', st, 'ess before', e0)
        if st['lvl'] != 2 or st['ess'] >= e0 or st['mk']: fails.append('double tap upgrades and puts it down')
        # two slow taps: pick up, then put down; no upgrade
        await page.clock.run_for(600)
        await click(page, sp, 120)
        mk1 = await page.evaluate("__yatd.movingKey")
        await page.screenshot(path=OUT + 'dtap_carry.png')
        await page.clock.run_for(600); await click(page, sp, 120)
        st2 = await page.evaluate("(t => ({ lvl: __yatd.fl.items.get(t[0]+','+t[1]).lvl, mk: __yatd.movingKey }))", sp)
        print('slow taps', mk1, st2)
        if not mk1 or st2['lvl'] != 2 or st2['mk']: fails.append('slow taps: pick up then put down')
        # a double tap on a building: no upgrade, a message
        # ---- buildings block the way like a crate ----
        info = await page.evaluate("""(() => { const G = __yatd, f = G.fl;
          const spots = []; for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace('rune', x, y)) spots.push([x, y]);
          const nearDoor = (() => { for (const R of f.rooms) if (R.kind === 'room') for (const d of R.doors) for (const dd of [[1,0],[-1,0],[0,1],[0,-1]]) { const x = d.x + dd[0], y = d.y + dd[1]; if (G.slotOf(x, y) === 'floor' && G.roomOf(x, y) === f.rooms.indexOf(R)) return [x, y]; } return null; })();
          const s = spots[0]; const before = G.walkable(s[0], s[1]); G.tryPlace('rune', s[0], s[1]);
          const it = f.items.get(s[0] + ',' + s[1]);
          return { n: spots.length, spot: s, placed: !!it, walkBefore: before, walkAfter: G.walkable(s[0], s[1]), pass: G.passable(s[0], s[1]), nearDoor, nearDoorOk: nearDoor ? G.canPlace('altar', nearDoor[0], nearDoor[1]) : null,
                   path: G.shortestPath().some(q => q[0] === s[0] && q[1] === s[1]) }; })()""")
        print('building', info)
        if not info['placed'] or not info['walkBefore'] or info['walkAfter'] or info['pass'] or info['path']: fails.append('a building blocks the way')
        if info['nearDoorOk']: fails.append('no building right by a door')
        # an old save with a building by a door: it goes back as Esencja
        old = await page.evaluate("""(() => { const G = __yatd, f = G.fl; let s = null;
          for (const R of f.rooms) if (R.kind === 'room') for (const d of R.doors) for (const dd of [[1,0],[-1,0],[0,1],[0,-1]]) { const x = d.x + dd[0], y = d.y + dd[1]; if (!s && G.slotOf(x, y) === 'floor' && !f.items.has(x + ',' + y) && G.roomOf(x, y) === f.rooms.indexOf(R)) s = [x, y]; }
          f.items.set(s[0] + ',' + s[1], { type: 'veil', x: s[0], y: s[1], cd: 0, anim: 0, disabled: false, hp: 0, max: 0, power: 1, shot: 0.5, flash: 0, preview: 0, gx: s[0] + 0.5, gy: s[1] + 0.5, lvl: 1, spent: 5 });
          const e0 = f.essence; G.rebuildDungeon(true); return { gone: !G.fl.items.has(s[0] + ',' + s[1]), back: G.fl.essence - e0 }; })()""")
        print('old save', old)
        if not old['gone'] or old['back'] != 5: fails.append('an old building by a door is refunded')
        # heroes walk around a building: a whole wave with buildings placed, nobody stands on one
        res = await page.evaluate("""(() => { const G = __yatd; G.startWave(); let g = 0, on = 0;
          while (g++ < 6000) { const f = G.fl; if (G.modalKind) break; if (f.check) { if (!f.check.result) G.resolveCheck((f.check.g0 + f.check.g1) / 2); G.clearCheck(); continue; } if (f.phase !== 'raid') break; G.step(0.05);
            f.heroes.forEach(h => { if (!h.dead && !h.fled && !h.gone) { const it = f.items.get(h.tx + ',' + h.ty); if (it && G.BUILDINGS && G.BUILDINGS[it.type]) on++; } });
            if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } }
          return { steps: g, on, modal: G.modalKind }; })()""")
        print('wave', res)
        if res['on']: fails.append('nobody walks onto a building')
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
