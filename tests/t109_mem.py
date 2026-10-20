# 1.09 (author): a trap keeps its check answer from wave to wave; an upgrade or the heroes putting it out of use make it ask
# again; moving it, or taking it down and putting it back on the same spot, keep it; a miss asks again; under a check the world
# runs at x0,25 (not stopped), and the heroes it aims at are pinned (a hit lands on them even if they step out).
import asyncio
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
RUNW = r'''() => { const G = __yatd; let g = 0; while (g++ < 20000) { const f = G.fl; if (G.modalKind === 'hero') { G.closeModal(); G.setPaused(false); } if (G.modalKind) return G.modalKind;
  if (f.check) { if (!f.check.result) G.skipCheck(); G.clearCheck(); continue; } if (f.phase !== 'raid') return f.phase; G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } } return 'guard'; }'''
TOBUILD = r'''() => { const G = __yatd; for (let i = 0; i < 12 && G.fl.phase !== 'build'; i++) { const k = G.modalKind; if (k === 'shop') { const x = document.querySelector('#shop-close'); if (x) x.click(); else G.closeModal(); } else if (k) { const b = document.querySelector('#card .btn.primary'); if (b) b.click(); else G.closeModal(); } else if (G.afterSummary) G.afterSummary(); } return G.fl.phase; }'''
async def main():
    fails = []
    ok = lambda c, m: None if c else fails.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        await page.click('#start-play'); await page.clock.run_for(400)
        while await page.evaluate("__yatd.modalKind"): await page.evaluate("__yatd.closeModal()")
        sp = await page.evaluate("""(() => { const G = __yatd; G.fl.essence = 99; const P = G.shortestPath();
          for (const q of P.slice(2)) if (G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); G.setMode(null); return q; } return null; })()""")
        K = "%d,%d" % (sp[0], sp[1])
        # wave 1: step until this trap asks, answer it with a crit
        await page.evaluate("__yatd.startWave()")
        got = await page.evaluate("""(k => { const G = __yatd; for (let i = 0; i < 6000; i++) { const c = G.fl.check;
            if (c && !c.result) { if (c.it === G.fl.items.get(k)) return { at: G.fl.time, lock: c.lock ? [...c.lock.values()].reduce((a, l) => a + l.length, 0) : -1 };
              G.resolveCheck((c.r0 + c.r1) / 2); G.clearCheck(); continue; }
            if (c) G.clearCheck(); if (G.fl.phase !== 'raid') return null; G.step(0.05); } return null; })""", K)
        print('the spikes ask', got)
        ok(got is not None, 'the new trap asks in its first wave')
        if got:
            ok(got['lock'] >= 1, 'the check pins whom it aims at')
            # slow motion: real frames under the check move the world at about x0,25
            t = await page.evaluate("[__yatd.fl.time, __yatd.timeScale(), __yatd.CHECK_SLOW]")
            ok(abs(t[1] - 0.25) < 1e-9 and t[2] == 0.25, 'under a check the world runs at x0,25 (%s)' % t[1])
            # pin: the hero it aims at steps out, the crit still hits him
            hp = await page.evaluate("""(k => { const G = __yatd, c = G.fl.check, h = c.lock.get(c.it)[0], hp0 = h.hp; h.x = Math.max(1, h.x - 6); h.tx = h.x; h.nx = null; h.path = [];
              G.resolveCheck((c.r0 + c.r1) / 2); const r = { hp0, hp1: h.hp, dead: h.dead, res: c.result, mem: G.fl.items.get(k).memRes }; G.clearCheck(); return r; })""", K)
            print('pinned hit', hp)
            ok(hp['res'] == 'crit' and (hp['hp1'] < hp['hp0'] or hp['dead']), 'the pinned hero is hit though he stepped out')
            ok(hp['mem'] == 'crit', 'the trap remembers the crit')
        await page.evaluate(RUNW); ph = await page.evaluate(TOBUILD)
        st = await page.evaluate("(k => { const G = __yatd, it = G.fl.items.get(k); return it ? { mem: G.memOf(it), res: it.memRes, lvl: it.lvl } : null; })", K)
        print('next build', ph, st)
        ok(st and st['mem'] == 'crit', 'the answer stays into the next wave (%s)' % st)
        # wave 2: it fires by itself (no check unless the hit would kill)
        await page.evaluate("__yatd.startWave()")
        w2 = await page.evaluate("""(k => { const G = __yatd, it = G.fl.items.get(k); let asked = 0, fired = 0, f0 = it.lastFire;
            for (let i = 0; i < 4000 && G.fl.phase === 'raid'; i++) { const c = G.fl.check; if (c && !c.result) { if (c.it === it || (c.extra || []).includes(it)) asked += c.lethalOk || c.lethalCrit ? 0 : 1; G.resolveCheck((c.r0 + c.r1) / 2); G.clearCheck(); continue; } if (c) G.clearCheck();
              G.step(0.05); if (it.lastFire !== f0 && it.lastFire !== null) { fired++; f0 = it.lastFire; } } return { asked, fired, mem: G.memOf(it) }; })""", K)
        print('wave 2', w2)
        ok(w2['asked'] == 0, 'a remembered trap does not ask again (skulls aside)')
        await page.evaluate(RUNW); await page.evaluate(TOBUILD)
        # put out of use by the heroes: forgotten; worn out by its own limit: kept
        r = await page.evaluate("""(k => { const G = __yatd, it = G.fl.items.get(k); G.startWave();
            const st = () => { if (G.fl.check) { if (!G.fl.check.result) G.skipCheck(); G.clearCheck(); } G.step(0.05); };
            for (let i = 0; i < 60 && !G.fl.gateOpen; i++) st();   // the check tick runs once the party goes in
            it.memRes = 'crit'; it.memLvl = it.lvl || 1;
            it.disabled = true; st(); const a = it.memRes; it.disabled = false;
            it.memRes = 'ok'; it.memLvl = it.lvl || 1; it.disabled = true; it.worn = true; st(); const b = it.memRes; it.disabled = false; it.worn = false;
            it.memRes = 'ok'; it.jamUntil = G.fl.time + 5; st(); const c = it.memRes; it.jamUntil = 0;
            return { disabled: a, worn: b, jammed: c, lost: G.fl.stats.memLost }; })""", K)
        print('put out of use', r)
        ok(r['disabled'] is None and r['worn'] == 'ok' and r['jammed'] is None, 'disarmed or jammed by heroes: it asks again; its own limit: it keeps the answer')
        await page.evaluate(RUNW); await page.evaluate(TOBUILD)
        # a miss asks again
        r2 = await page.evaluate("""(k => { const G = __yatd, it = G.fl.items.get(k); it.memRes = null; G.startWave();
            for (let i = 0; i < 6000 && G.fl.phase === 'raid'; i++) { const c = G.fl.check; if (c && !c.result) { if (c.it === it) { const bad = c.r1 < 0.5 ? 0.99 : 0.01; G.resolveCheck(bad); const res = c.result; G.clearCheck(); return { res, mem: it.memRes || null }; } G.resolveCheck((c.r0 + c.r1) / 2); G.clearCheck(); continue; } if (c) G.clearCheck(); G.step(0.05); } return null; })""", K)
        print('miss', r2)
        ok(r2 is None or (r2['res'] == 'miss' and r2['mem'] is None), 'a miss leaves it without an answer (asks next time)')
        await page.evaluate(RUNW); await page.evaluate(TOBUILD)
        # build: upgrade forgets, moving keeps, taking down and putting back on the same spot keeps (same level)
        r3 = await page.evaluate("""(k => { const G = __yatd, P = G.shortestPath(); G.fl.essence = 999; const it = G.fl.items.get(k); it.memRes = 'crit'; it.memLvl = it.lvl || 1;
            G.upgradeItem(it); const up = G.memOf(it);
            it.memRes = 'crit'; it.memLvl = it.lvl; let mv = null; for (const q of P) if (G.canPlace('spikes', q[0], q[1])) { mv = q; break; }
            G.moveItem(it, mv[0], mv[1]); const moved = G.memOf(it);
            let s2 = null; for (const q of P) if (G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); s2 = q; break; }
            const t2 = G.fl.items.get(s2[0] + ',' + s2[1]); t2.memRes = 'ok'; t2.memLvl = 1; G.removeItem(t2); G.tryPlace('spikes', s2[0], s2[1]);
            const back = G.memOf(G.fl.items.get(s2[0] + ',' + s2[1]));
            let s3 = null; for (const q of P) if (G.canPlace('spikes', q[0], q[1])) { G.tryPlace('spikes', q[0], q[1]); s3 = q; break; }
            const other = G.memOf(G.fl.items.get(s3[0] + ',' + s3[1])); G.setMode(null);
            return { up, moved, back, other }; })""", K)
        print('build', r3)
        ok(r3['up'] is None, 'an upgrade asks again')
        ok(r3['moved'] == 'crit', 'moving keeps the answer')
        ok(r3['back'] == 'ok', 'taken down and put back on the same spot: it remembers')
        ok(r3['other'] is None, 'a new trap on another spot asks')
        # the save keeps it
        sv = await page.evaluate("(() => { __yatd.saveRun && __yatd.saveRun('build'); const raw = localStorage.getItem('yatd12-save') || ''; return raw.includes('memRes'); })()")
        ok(sv, 'the save keeps the answers')
        print('FAILS', fails); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
