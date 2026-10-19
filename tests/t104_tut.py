# 1.04 tutorial: in a wave the coach sits at the top (never over the check), the first check stops the game with a short card
# and waits under it, "Rozumiem" goes on; the fast-forward step waits for a held finger; pay / theft / flee cards come once each;
# no "Pauza" toast with a card; the build steps of wave 2 sit at the bottom again and are short.
import asyncio, sys
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
OUT = SC + 'shots104/tut_'
FAILS = []
def ok(c, m):
    if not c: FAILS.append(m)
ST = """(() => { const G = __yatd, co = document.querySelector('#coach'), r = co.getBoundingClientRect(), s = document.querySelector('#stage').getBoundingClientRect();
  const st = G.TUT[G.run.tut];
  return { tut: G.run.tut, id: st ? st.id || null : null, phase: G.fl.phase, paused: G.paused, pop: G.tutPopNow, check: !!(G.fl.check && !G.fl.check.result),
    t0: G.fl.check ? G.fl.check.t0 - G.realNow : null, box: G.fl.check && G.fl.check.box ? G.fl.check.box : null,
    coach: co.hidden ? null : co.innerText.split('\\n')[0], top: co.classList.contains('top'), cy0: r.top - s.top, cy1: r.bottom - s.top,
    toast: !document.querySelector('#toast').hidden ? document.querySelector('#toast').innerText : null }; })()"""
async def main():
    W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
    H = int(sys.argv[2]) if len(sys.argv) > 2 else 844
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await (await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2)).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto('file://' + SC + 'test/page15.html'); await page.clock.run_for(500)
        await page.click('#start-tut'); await page.clock.run_for(400)
        st = await page.evaluate(ST); ok(not st['top'], 'build: the coach at the bottom'); ok(len(st['coach'] or '') < 200, 'intro is short')
        lens = await page.evaluate("__yatd.TUT.map(s => (typeof s.text === 'function' ? s.text() : s.text).length)")
        print('step lengths', lens); ok(max(lens) <= 230, 'no step over 230 characters (%d)' % max(lens))
        raid_lens = await page.evaluate("__yatd.TUT.filter(s => s.raid).map(s => s.text.length)")
        ok(max(raid_lens) <= 160, 'wave steps are a line or two (%s)' % raid_lens)
        # build quickly: what the steps ask for, done by hand
        for i in range(30):
            st = await page.evaluate(ST)
            if st['phase'] == 'raid': break
            sid = st['id']
            if await page.evaluate("!!document.querySelector('#coach .next')") and not st['coach'].startswith('Gotowe'):
                await page.click('#coach .next')
            elif await page.evaluate("!!document.querySelector('#coach .skip:last-child')") and sid in ('move', 'spend'):
                await page.evaluate("[...document.querySelectorAll('#coach .skip')].find(b => b.textContent === 'Pomiń krok').click()")
            else:
                await page.evaluate("""(() => { const G = __yatd, P = G.shortestPath(); const st = G.TUT[G.run.tut];
                  const put = t => { for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(t, x, y) && (G.ITEMS[t].slot === 'wall' ? G.areaOf({ type: t, x, y }).some(a => P.some(p => p[0] === a[0] && p[1] === a[1])) : P.some(p => p[0] === x && p[1] === y))) { G.tryPlace(t, x, y); return; } };
                  if (/Kolce/.test(st.text)) put('spikes'); else if (/Strzały/.test(st.text)) put('arrows'); else if (/Monety/.test(st.text)) { G.run.unlocked.add('loot'); put('loot'); }
                  else if (/Wypuść/.test(st.text)) document.querySelector('#btn-action').click(); })()""")
            await page.clock.run_for(300)
        st = await page.evaluate(ST); print('raid start', st)
        ok(st['phase'] == 'raid' and st['id'] == 'novice' and st['top'], 'wave: novice line at the top (%s)' % st)
        ok(st['cy0'] >= 36, 'the coach sits under the party chips (%s)' % st['cy0'])
        await page.screenshot(path=OUT + '01_novice.png')
        got = None
        for i in range(400):
            await page.clock.run_for(100)
            st = await page.evaluate(ST)
            if st['pop'] == 'check': got = st; break
            if st['pop']: await page.click('#coach .next')
        ok(got is not None, 'the first check brings its card')
        if got:
            ok(got['paused'] and got['top'] and 'Skill check' in (got['coach'] or ''), 'the card: paused, at the top (%s)' % got)
            ok(got['toast'] is None or 'Pauza' not in got['toast'], 'no "Pauza" toast with the card (%s)' % got['toast'])
            await page.clock.run_for(300); await page.screenshot(path=OUT + '02_checkcard.png')
            st = await page.evaluate(ST)
            ok(st['box'] is not None and st['cy1'] + 4 <= st['box']['y'], 'the card does not cover the check (coach to %.0f, check from %s)' % (st['cy1'], st['box'] and st['box']['y']))
            t0a = st['t0']; await page.clock.run_for(4000); st = await page.evaluate(ST)
            ok(st['check'] and abs(st['t0'] - t0a) < 0.05, 'the check waits under the card (%.2f -> %.2f)' % (t0a, st['t0']))
            await page.click('#coach .next'); await page.clock.run_for(200)
            st = await page.evaluate(ST); print('after Rozumiem', st)
            ok(not st['paused'] and st['id'] == 'check' and st['top'] and st['pop'] is None, 'Rozumiem: the game goes on, the check line (%s)' % st)
            ok(st['toast'] is None or 'Gramy dalej' not in st['toast'], 'no "Gramy dalej" toast (%s)' % st['toast'])
            for i in range(60):
                st = await page.evaluate(ST)
                if st['check'] and st['t0'] is not None and st['t0'] < -0.3: break
                await page.clock.run_for(100)
            await page.screenshot(path=OUT + '03_check.png')
            box = await page.evaluate("document.querySelector('canvas').getBoundingClientRect().toJSON()")
            await page.mouse.click(box['x'] + W / 2, box['y'] + box['height'] * 0.6); await page.clock.run_for(300)
        for i in range(80):
            st = await page.evaluate(ST)
            if st['pop']: await page.screenshot(path=OUT + '04_pop_' + st['pop'] + '.png'); await page.click('#coach .next'); await page.clock.run_for(200); continue
            if st['id'] == 'ff': break
            if st['check']: await page.evaluate("__yatd.skipCheck(); __yatd.clearCheck()")
            await page.clock.run_for(250)
        st = await page.evaluate(ST); print('ff step', st)
        ok(st['id'] == 'ff' and 'Przytrzymaj' in (st['coach'] or ''), 'the fast-forward step (%s)' % st)
        await page.clock.run_for(3000); st = await page.evaluate(ST)
        ok(st['id'] == 'ff' or st['pop'], 'it waits for the finger (%s)' % st['id'])
        while (await page.evaluate(ST))['pop']: await page.click('#coach .next'); await page.clock.run_for(200)
        await page.evaluate("__yatd.fl.check && (__yatd.skipCheck(), __yatd.clearCheck())")
        box = await page.evaluate("document.querySelector('canvas').getBoundingClientRect().toJSON()")
        await page.mouse.move(box['x'] + W / 2, box['y'] + box['height'] * 0.6); await page.mouse.down(); await page.clock.run_for(1200)
        ffon = await page.evaluate("__yatd.ff"); await page.mouse.up(); await page.clock.run_for(300)
        st = await page.evaluate(ST); print('after hold', ffon, st)
        ok(ffon and st['id'] == 'herocard', 'holding the finger speeds up and ends the step (%s, %s)' % (ffon, st['id']))
        # the other cards: once each, only in a wave
        seen = await page.evaluate("Object.keys(__yatd.run.tutSeen || {})"); print('cards seen', seen)
        for k in ['pay', 'theft', 'flee']:
            if k in seen: continue
            r = await page.evaluate("k => __yatd.tutPop(k)", k); await page.clock.run_for(100)
            st = await page.evaluate(ST); ok(r and st['pop'] == k and st['paused'], k + ': card and pause (%s)' % st)
            await page.screenshot(path=OUT + '05_' + k + '.png')
            await page.click('#coach .next'); await page.clock.run_for(100)
        again = await page.evaluate("['pay', 'theft', 'flee', 'check'].map(k => __yatd.tutPop(k))")
        ok(not any(again), 'each card only once (%s)' % again)
        st = await page.evaluate(ST); ok(not st['paused'], 'not paused after the cards')
        # finish the wave
        RUNW = r'''() => { const G = __yatd; let g = 0; while (g++ < 20000) { const f = G.fl; if (G.modalKind) return G.modalKind;
            if (f.check) { if (!f.check.result) G.skipCheck(); G.clearCheck(); continue; } if (f.phase !== 'raid') return f.phase; G.step(0.05); if (f.ending !== null) { f.ending -= 0.05; if (f.ending <= 0) { f.ending = null; G.finishWave(); } } } return 'guard'; }'''
        await page.evaluate(RUNW)
        for i in range(12):
            if not await page.evaluate("__yatd.modalKind"): break
            await page.evaluate("(() => { const G=__yatd; const k=G.modalKind; if (k==='shop') { document.querySelector('#shop-close').click(); return; } const c = document.querySelector('#card .choices .btn'); if (c) { c.click(); return; } const b = document.querySelector('#settle-next') || document.querySelector('#card .btn.primary'); if (b) b.click(); })()")
            await page.clock.run_for(300)
        st = await page.evaluate(ST); print('wave 2 build', st)
        ok(st['phase'] == 'build' and st['id'] == 'dig' and not st['top'] and st['coach'], 'wave 2 build: dig at the bottom (%s)' % st)
        await page.screenshot(path=OUT + '06_dig.png')
        print('errs', errs[:3]); ok(not errs, 'no page errors')
        await b.close()
    print('FAILS', FAILS)
asyncio.run(main())
