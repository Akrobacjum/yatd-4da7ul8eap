# 1.02: how often the auto fast-forward ("spokój") switches off, and why. Replays recorded waves (layout + heroes) on a page.
# usage: DOCS=real101 python3 test/ff102.py PAGE RUNID WAVES REPS
import asyncio, json, sys, glob, os, re
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
src = open(SC + 'test/replay101.py').read()
JS = re.search(r'JS = r"""(.*?)"""', src, re.S).group(1)
JS = JS.replace("  G.startWave();\n", "  G.startWave();\n  const FF = window.__ff = { t: 0, quiet: 0, ffT: 0, segs: [], why: {}, cur: 0, qT: 0, checks: 0, lastEnd: -9, during: 0, lead: [], gap: null, gaps: [] };\n", 1)
JS = JS.replace("    if (f.check) { const c = f.check;", "    if (f.check && FF.gap) FF.gap.ev = 1;\n    if (f.check) { FF.checks++; if (FF.cur > 0) { FF.during++; FF.segs.push([FF.cur, 'check']); FF.cur = 0; FF.lastEnd = FF.t; } else FF.lead.push(FF.t - FF.lastEnd); FF.qT = 0; }\n    if (f.check) { const c = f.check;", 1)
JS = JS.replace("    G.step(0.05);\n", """    { const why = G.quietWhy(); FF.t += 0.05;
      if (why === 'fight' && FF.gap) FF.gap.ev = 1;
      if (!why) { FF.quiet += 0.05; FF.qT += 0.05; if (FF.qT > 0.3) { if (FF.gap) { FF.gaps.push([FF.t - FF.gap.t0, FF.gap.ev ? 1 : 0]); FF.gap = null; } FF.ffT += 0.05; FF.cur += 0.05; } }
      else { FF.why[why] = (FF.why[why] || 0) + 0.05; if (FF.cur > 0) { FF.segs.push([FF.cur, why]); FF.cur = 0; FF.lastEnd = FF.t; FF.gap = { t0: FF.t, ev: 0 }; } FF.qT = 0; } }
    G.step(0.05);
""", 1)
assert JS.count('FF.') > 10
PAGE, RUN = sys.argv[1], sys.argv[2]; WAVES = [int(x) for x in sys.argv[3].split(',')]; REPS = int(sys.argv[4])
BASE = SC + 'test/' + PAGE + '.html'
docs = {}
for f in glob.glob(SC + os.environ.get('DOCS', 'real101') + '/waves/' + RUN + '_*.json'):
    d = json.load(open(f)); d = d.get('data', d); docs[d['wave']] = d
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto('file://' + BASE); await page.clock.run_for(300)
        allw = []
        for n in WAVES:
            if n not in docs: continue
            tot = sum(docs[k]['summary']['score'] for k in docs if k < n)
            fame = [docs[n-1]['summary'].get('grozaTotal', 0) if n - 1 in docs else 0, (docs[n-1]['summary'].get('greed', 1) or 1) if n - 1 in docs else 1]
            prev = docs[n-1]['summary'] if n - 1 in docs else None
            res = []
            for _ in range(REPS):
                await page.evaluate('__yatd.QUIET.r = ' + os.environ.get('QR', '2') + '; __yatd.QUIET.cd = ' + os.environ.get('QCD', '1'))
                await page.evaluate(JS, [docs[n], tot, fame, 0.9, prev, {}, 'v12', [1.0, 1.0, []], ['gauss', 0.037, 1.9]])
                res.append(await page.evaluate('window.__ff'))
            T = sum(r['t'] for r in res); Q = sum(r['quiet'] for r in res); F = sum(r['ffT'] for r in res); C = sum(r['checks'] for r in res)
            segs = [s for r in res for s in r['segs']]; why = {}
            for r in res:
                for k, v in r['why'].items(): why[k] = why.get(k, 0) + v
            ends = {}
            for s in segs: ends[s[1]] = ends.get(s[1], 0) + 1
            short = sum(1 for s in segs if s[0] < 1.0)
            D = sum(r['during'] for r in res); L = [x for r in res for x in r['lead'] if x < 1.0]
            G2 = [g for r in res for g in r['gaps']]; pl = [g[0] for g in G2 if not g[1]]
            print('   breaks in spokój: %.1f/wave, of which with nothing happening (no check, no fight) %.1f/wave, avg %.1f s of game time' % (len(G2) / REPS, len(pl) / REPS, sum(pl) / max(1, len(pl))))
            print('   checks inside spokój %.1f/wave, checks within 1 s after it ended %.1f/wave (avg lead %.2f s)' % (D / REPS, len(L) / REPS, sum(L) / max(1, len(L))))
            print('W%d game %.0f s | quiet %d%% | spokój %d%% (%d odcinków, śr %.1f s gry, %d krótszych niż 1 s) | koniec przez %s | nie-cisza przez %s | checki %.1f' % (
                n, T / REPS, 100 * Q / T, 100 * F / T, len(segs) / REPS, (sum(s[0] for s in segs) / max(1, len(segs))), short / REPS,
                {k: round(v / REPS, 1) for k, v in sorted(ends.items(), key=lambda x: -x[1])}, {k: round(100 * v / T) for k, v in sorted(why.items(), key=lambda x: -x[1])}, C / REPS), flush=True)
            allw.append((T, F, len(segs)))
        print('errs', errs[:3])
        await b.close()
asyncio.run(main())
