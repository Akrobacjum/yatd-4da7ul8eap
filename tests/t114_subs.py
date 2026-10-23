# 1.14 (author: subcategories in the build bar, side by side): Pułapki and Potwory have sub-tabs Rany / Strach in a row under
# the tabs; a sub shows only its tiles, the choice is remembered per tab; the row keeps its height on every tab (the map does
# not jump); the guide goes to the sub of the tile it points at. 1.15.1: in a stage with only one sub's tiles the row still
# shows, the other subs dimmed with a lock (1.14 hid the row).
import asyncio, json
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        fails = []; out = {}
        def ok(c, m):
            if not c: fails.append(m)
        vis = "() => [...document.querySelectorAll('#tray > .item')].filter(b => !b.hidden).map(b => b.id.slice(5))"
        await page.evaluate("() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal(); G.run.wave = 3; G.startBuild(); G.fl.essence = 300; }")
        await page.click('#tab-traps'); await page.click('#sub-dmg'); await page.clock.run_for(500)
        out['dmg'] = await page.evaluate(vis)
        ok(out['dmg'] and 'spikes' in out['dmg'] and 'portrait' not in out['dmg'], 'Rany shows wounding traps only')
        stage1 = await page.evaluate("() => document.querySelector('#stage').getBoundingClientRect().height")
        await page.click('#sub-fear'); await page.clock.run_for(500)
        out['fear'] = await page.evaluate(vis)
        ok(out['fear'] and 'portrait' in out['fear'] and 'spikes' not in out['fear'], 'Strach shows scare traps only')
        ok(await page.evaluate("() => document.querySelector('#sub-fear').getAttribute('aria-pressed') === 'true'"), 'the chosen sub is marked')
        await page.click('#tab-monster'); await page.clock.run_for(500)
        out['mon'] = await page.evaluate(vis)
        ok(out['mon'] and 'goblin' in out['mon'] and 'ghost' not in out['mon'], 'monsters start on Rany')
        await page.click('#tab-loot'); await page.clock.run_for(500)
        r = await page.evaluate("() => ({ none: document.querySelector('#subs').classList.contains('none'), h: document.querySelector('#stage').getBoundingClientRect().height })")
        ok(r['none'], 'no sub row content on Łup')
        ok(abs(r['h'] - stage1) < 0.5, 'the map keeps its height across tabs (%.1f vs %.1f)' % (r['h'], stage1))
        await page.click('#tab-traps'); await page.clock.run_for(500)
        out['back'] = await page.evaluate(vis)
        ok('portrait' in out['back'], 'Pułapki remembers Strach')
        stored = await page.evaluate("() => localStorage.getItem('yatd-sub')")
        ok(stored and json.loads(stored).get('traps') == 'fear', 'the choice is stored')
        # the guide points at Kolce while Strach is chosen: the bar goes to Rany
        await page.evaluate("() => __yatd.pickTab('traps', 'spikes')"); await page.clock.run_for(300)
        out['guide'] = await page.evaluate(vis)
        ok('spikes' in out['guide'] and 'portrait' not in out['guide'], 'the guide shows the sub of its tile')
        # 1.15.1 (author: in the first run the sub-tabs did not show, so they could not be switched): a stage with only one
        # sub's tiles still shows the row; the other sub is dimmed with a lock, a tap on it says when it comes and switches nothing
        await page.evaluate("() => { const G = __yatd; G.newRun(false, 1); while (G.modalKind) G.closeModal(); G.startBuild(); }"); await page.clock.run_for(300)
        await page.click('#tab-traps'); await page.clock.run_for(300)
        one = await page.evaluate("""() => ({ none: document.querySelector('#subs').classList.contains('none'), fearOff: document.querySelector('#sub-fear').classList.contains('off'), fearHidden: document.querySelector('#sub-fear').hidden,
            dmgOn: document.querySelector('#sub-dmg').getAttribute('aria-pressed'), vis: [...document.querySelectorAll('#tray > .item')].filter(b => !b.hidden).map(b => b.id.slice(5)) })""")
        ok(not one['none'] and one['fearOff'] and not one['fearHidden'] and one['dmgOn'] == 'true', 'stage 1: the row shows, Strach dimmed with a lock, Rany chosen (%s)' % one)
        ok('spikes' in one['vis'] and 'portrait' not in one['vis'], 'stage 1: Rany shows its tiles')
        await page.click('#sub-fear', force=True); await page.clock.run_for(100)   # aria-disabled: a finger still taps it
        one['tap'] = await page.evaluate("() => [document.querySelector('#sub-dmg').getAttribute('aria-pressed'), document.querySelector('#sub-fear').textContent]")
        ok(one['tap'][0] == 'true' and ('od 2. runu' in one['tap'][1] or 'od fali' in one['tap'][1]), 'a tap on the dimmed Strach says when it comes and switches nothing (%s)' % one['tap'])
        await page.click('#tab-dungeon'); await page.clock.run_for(300)
        one['loch'] = await page.evaluate("() => ['dig', 'kind', 'effect'].map(id => { const b = document.querySelector('#sub-' + id); return b ? (b.classList.contains('off') ? 'off' : 'on') : 'none'; })")
        ok(one['loch'] == ['on', 'off', 'off'], 'stage 1 Loch: Kopanie on, Komnaty and Efekty dimmed (%s)' % one['loch'])
        out['one'] = one
        print(json.dumps(out, ensure_ascii=False))
        print('FAILS', fails + (['page errors %s' % errs[:2]] if errs else []))
        await b.close()
asyncio.run(main())
