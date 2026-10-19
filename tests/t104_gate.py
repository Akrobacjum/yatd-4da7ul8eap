# 1.04: the party waits at the door for 1,8 s while "Fala N" shows; no hero moves and no check fires before that.
# The testers' layouts (first check 0,1-0,9 s after the start on 1.02/1.03) replayed.
import asyncio, json, glob, re
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
src = open(SC + 'test/replay101.py').read()
JS = re.search(r'JS = r"""(.*?)"""', src, re.S).group(1)
SETUP = JS[:JS.index('  G.startWave();\n')] + '  G.startWave(); return 1;\n}'
FAILS = []
def ok(c, m):
    if not c: FAILS.append(m)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto('file://' + SC + 'test/page15.html'); await page.clock.run_for(500)
        for f in ['mvffw4cz2nci_04', 'mvffw4cz2nci_03', 'mvffw4cz2nci_01', 'mvfangk12omy_01']:
            d = json.load(open(SC + 'real104/waves/' + f + '.json'))
            firsts = []
            for rep in range(3):
                await page.evaluate(SETUP, [d, 0, [0, 1], 0.9, None, {}, 'v12', [1.0, 1.0, []], ['gauss', 0.037, 1.9]])
                r = await page.evaluate("""(() => { const G = __yatd, f = G.fl; let moved = false, first = null, said = null; const p0 = {};
                  for (let i = 0; i < 400 && f.phase === 'raid'; i++) {
                    if (f.check && first === null) first = f.time;
                    if (f.check && !f.check.result) { G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); }
                    f.heroes.forEach(h => { const k = h.id; if (!(k in p0)) p0[k] = [h.x, h.y]; else if (f.time < 1.75 && (h.x !== p0[k][0] || h.y !== p0[k][1] || h.nx !== null)) moved = true; });
                    G.step(0.05); if (first !== null && f.time > 3) break;
                  }
                  return { first, moved, open: f.gateOpen, n: f.heroes.length }; })()""")
                firsts.append(r['first']); ok(not r['moved'], f + ': nobody moves at the door'); ok(r['first'] is None or r['first'] >= 1.8, f + ': no check before 1,8 s')
            print(f, 'first check at', [round(x, 2) if x is not None else None for x in firsts], 'heroes', r['n'])
        print('FAILS', FAILS); print('errs', errs[:3]); await b.close()
asyncio.run(main())
