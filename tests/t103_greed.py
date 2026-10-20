# 1.03: greed. Loot gets dearer per copy (refund = what was paid), the greed risk has no ceiling but grows slowly,
# Odwrotna chciwość: heroes take loot again and taken loot pulls greed x3 (less each time).
import asyncio
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
FAILS = []
def ok(c, m):
    if not c: FAILS.append(m)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(500)
        r = await page.evaluate("""(() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal();
          G.run.wave = 4; G.startBuild(); while (G.modalKind) G.closeModal(); G.fl.essence = 5000; ['loot3', 'loot'].forEach(t => G.run.unlocked.add(t));
          const place = t => { for (let y = 0; y < G.WH; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(t, x, y)) { const e = G.fl.essence; G.tryPlace(t, x, y); return e - G.fl.essence; } return null; };
          const relic = [], gold = []; for (let k = 0; k < 6; k++) relic.push(place('loot3')); for (let k = 0; k < 4; k++) gold.push(place('loot'));
          const rel = [...G.fl.items.values()].filter(i => i.type === 'loot3'), last = rel.find(i => i.spent === 31) || rel[rel.length - 1];
          const e0 = G.fl.essence, got = G.removeItem(last), refund = G.fl.essence - e0, next = place('loot3');
          const lv = {}; for (const g of [1, 3, 4, 4.5, 8, 9, 23]) { G.run.greedRep = g; let L = 0, H = 0; for (let i = 0; i < 12; i++) { const w = G.makeWave(8); L += w[0].lvl; H += w.filter(e => e.hunter).length; } lv[g] = [+(L / 12).toFixed(1), +(H / 12).toFixed(1)]; }
          G.run.greedRep = 1;
          return { relic, gold, refund, next, count: G.lootCount('loot3'), lv };
        })()""")
        print(r)
        ok(r['relic'] == [10, 13, 16, 20, 25, 31], 'relics 10, 13, 16, 20, 25, 31')
        ok(r['gold'] == [3, 4, 5, 6], 'coins 3, 4, 5, 6')
        ok(r['refund'] == 31 and r['next'] == 31, 'taking the last one off gives back what it cost, and the next costs that again')
        lv = r['lv']
        ok(lv['4'][0] > lv['1'][0] + 2 and lv['23'][0] > lv['4'][0] + 2 and lv['23'][0] < lv['4'][0] + 5.5, 'leader levels: +3 at greed 4, a few more at 23, no jump')
        ok(lv['1'][1] == 0 and lv['3'][1] == 1 and lv['4.5'][1] == 2 and lv['9'][1] == 3, 'hunters 0/1/2/3 at greed 1/3/4,5/9')
        # Odwrotna chciwość: a hero takes a relic; with the card greed grows 3x as much
        g = await page.evaluate("""(() => { const G = __yatd, out = {};
          for (const card of [false, true]) {
            G.run.deck = card ? ['nopick'] : []; G.recomputeMods();
            G.fl.essence = 500; G.startWave(); for (let i = 0; i < 40 && !G.fl.heroes.length; i++) G.step(0.05);
            const h = G.fl.heroes.slice().sort((a, c) => a.inv.length - c.inv.length)[0], rel = [...G.fl.items.values()].filter(i => i.type === 'loot3');
            const steps = rel.slice(0, 3).map(it => { h.inv = []; h.gold = 0; const g0 = G.fl.greed; G.pickup(h, it); return +(G.fl.greed - g0).toFixed(3); });   /* 1.07: empty hands before each (a hero with full hands left it lying: a flaky test since 1.05) */
            out[card ? 'card' : 'plain'] = steps; out.taken = rel.slice(0, 3).every(it => !G.fl.items.has(it.x + ',' + it.y));
            G.finishWave(); while (G.modalKind) G.closeModal(); if (G.afterSummary) G.afterSummary(); while (G.modalKind) G.closeModal(); if (G.fl.phase !== 'build') G.startBuild(); while (G.modalKind) G.closeModal();
            const ps = [...G.fl.items.values()].filter(i => i.type === 'loot3').length; for (let k = ps; k < 6; k++) { for (let y = 0; y < G.WH; y++) { let d = false; for (let x = 0; x < G.WW; x++) if (G.canPlace('loot3', x, y)) { G.tryPlace('loot3', x, y); d = true; break; } if (d) break; } }
          }
          const u = G.UPG.nopick; out.text = u.text; return out; })()""")
        print(g)
        pl = [x for x in g['plain'] if x > 0]; cd = [x for x in g['card'] if x > 0]   # (a hero with full hands leaves it lying)
        ok(len(pl) >= 2 and len(cd) >= 2 and abs(cd[0] / pl[0] - 3) < 0.4, 'taken loot pulls greed 3x with the card')
        ok(cd[-1] < cd[0] and pl[-1] < pl[0], 'each taken loot pulls a little less')
        ok('zabierają łup jak zwykle' in g['text'], 'card text says they take it')
        print('FAILS', FAILS); print('errs', errs[:3]); await b.close()
asyncio.run(main())
