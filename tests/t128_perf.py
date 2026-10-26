# 1.28.0: frame-time budget on the author's wave-17 dungeon (test/fixture_f17.json via perf_lib) and the graphics settings.
# Budgets were set on the build machine (software canvas): 1.27.8 took ~16.4 ms JS a frame at 1280x720, tile 16; 1.28.0 Full
# ~13.5 ms, Saver ~6.6 ms. A budget fails only on a clear step back (Full over 16 ms = as slow as before the wall cache).
import sys, json, statistics
sys.path.insert(0, '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test'); from perf_lib import run
fails = []; out = {}
def med(res, k): v = [s[k] for s, n, e in res if s and s.get(k) is not None]; return statistics.median(v) if v else None
for mode, budget in [('full', 16), ('eco', 9)]:
    res = run('page15.html', 2, w=1280, h=720, tile=16, setup="() => __yatd.setGfxMode('%s')" % mode)
    out[mode] = {k: med(res, k) for k in ['jsMed', 'drawMed', 'fps', 'gfxLvl', 'wcHit', 'soMed']}
    if out[mode]['jsMed'] is None or out[mode]['jsMed'] > budget: fails.append('%s: jsMed %s over %s ms' % (mode, out[mode]['jsMed'], budget))
    if (out[mode]['wcHit'] or 0) < 95: fails.append('%s: wall cache hits %s%%' % (mode, out[mode]['wcHit']))
    errs = [x for s, n, e in res for x in e]; fails += ['%s: %s' % (mode, x) for x in errs]
if out['eco']['gfxLvl'] != 2 or out['full']['gfxLvl'] != 0: fails.append('levels: ' + json.dumps(out))
res = run('page15.html', 1, w=1280, h=720, tile=16, warm=6, setup="() => __yatd.setGfxMode('auto')"); out['auto_big'] = med(res, 'gfxLvl')
if (out['auto_big'] or 0) < 1: fails.append('auto on a heavy frame stays at level 0')
res = run('page15.html', 1, w=390, h=844, tile=16, warm=6, setup="() => __yatd.setGfxMode('auto')"); out['auto_small'] = med(res, 'gfxLvl')
if out['auto_small'] != 0: fails.append('auto on a light frame left level 0: %s' % out['auto_small'])
print(json.dumps(out)); print('FAILS', fails); sys.exit(1 if fails else 0)
