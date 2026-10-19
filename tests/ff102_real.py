# 1.02: the auto fast-forward in real frames: how long a recorded wave takes in real seconds and how often "spokój" switches.
# usage: DOCS=real101 python3 test/ff102_real.py RUNID WAVES REPS   (QR = QUIET.r, 0 = the old room rule)
import asyncio, json, sys, glob, os, re
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
src = open(SC + 'test/replay101.py').read()
JS = re.search(r'JS = r"""(.*?)"""', src, re.S).group(1)
JS = JS[:JS.index('  G.startWave();\n')] + '  G.startWave(); return 1;\n}'
RUN = sys.argv[1]; WAVES = [int(x) for x in sys.argv[2].split(',')]; REPS = int(sys.argv[3])
docs = {}
for f in glob.glob(SC + os.environ.get('DOCS', 'real101') + '/waves/' + RUN + '_*.json'):
    d = json.load(open(f)); d = d.get('data', d); docs[d['wave']] = d
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto('file://' + SC + 'test/page15.html'); await page.clock.run_for(300)
        for n in WAVES:
            out = []
            for _ in range(REPS):
                prev = docs[n-1]['summary'] if n - 1 in docs else None
                await page.evaluate('__yatd.QUIET.r = ' + os.environ.get('QR', '1'))
                await page.evaluate(JS, [docs[n], 0, [0, 1], 0.9, prev, {}, 'v12', [1.0, 1.0, []], ['gauss', 0.037, 1.9]])
                real = 0; on = False; flips = 0; onT = 0; seen = None
                while real < 400:
                    st = await page.evaluate("(() => { const G = __yatd, f = G.fl; if (G.modalKind) return 'modal'; if (f.phase !== 'raid') return 'done'; const c = f.check; if (c && !c.result && G.realNow - (c.seen || (c.seen = G.realNow)) > 0.9) { G.resolveCheck((c.r0 + c.r1) / 2); } return [f.quietT > 0.3 && !f.check, f.time]; })()")
                    if not isinstance(st, list): break
                    if st[0] != on: flips += 1 if st[0] else 0; on = st[0]
                    if on: onT += 0.1
                    await page.clock.run_for(100); real += 0.1
                out.append((round(real, 1), flips, round(onT, 1), round(st[1] if isinstance(st, list) else 0, 1)))
            print('W%d QR=%s real s / spokój starts / spokój real s: %s' % (n, os.environ.get('QR', '1'), out), flush=True)
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
