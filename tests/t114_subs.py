# 1.14 (author: subcategories in the build bar, side by side): Pułapki and Potwory have sub-tabs Rany / Strach in a row under
# the tabs; a sub shows only its tiles, the choice is remembered per tab; the row keeps its height on every tab (the map does
# not jump); in a stage with only one sub's tiles the row is hidden and the tab shows everything; the guide goes to the sub
# of the tile it points at.
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
        # a stage that brings only wounding traps: no row, everything of the tab
        one = await page.evaluate("""() => { const T = __yatd.TABS.find(t => t.id === 'traps'), keep = T.subs[1].items.slice(); T.subs[1].items = [];
            document.querySelector('#tab-loot').click(); document.querySelector('#tab-traps').click();
            const r = { none: document.querySelector('#subs').classList.contains('none'), vis: [...document.querySelectorAll('#tray > .item')].filter(b => !b.hidden).map(b => b.id.slice(5)) };
            T.subs[1].items = keep; return r; }""")
        ok(one['none'] and 'spikes' in one['vis'] and 'portrait' in one['vis'], 'one sub only: no row, the whole tab')
        out['one'] = one
        print(json.dumps(out, ensure_ascii=False))
        print('FAILS', fails + (['page errors %s' % errs[:2]] if errs else []))
        await b.close()
asyncio.run(main())
