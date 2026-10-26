# 1.28.0: the frame-time harness. The author's wave-17 dungeon (run mvigdgxeen84: 18 rooms, 107 elements; test/fixture_f17.json)
# loaded into a page, a wave started with fast-forward (x6, as the author plays), skill checks resolved at once; after a warm-up the
# game's own frame telemetry (perfSummary: JS, simulation, drawing per frame) is read. Headless Chromium draws in software, so only
# comparisons on the same machine mean something.
import asyncio, json, os, statistics
from playwright.async_api import async_playwright
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
DOC = json.load(open(SC + 'test/fixture_f17.json'))
SETUP = open(SC + 'test/perf_setup.js').read()
JS = SETUP + r"""
  while (G.modalKind) G.closeModal(); G.startWave(); G.setFF(true);
  window.__chk = setInterval(() => { const f = G.fl; while (G.modalKind) G.closeModal(); if (G.paused) { G.setTrayOpen && G.setTrayOpen(false); G.setPaused(false); } if (window.__T && G.DRAWN.T) { const k = window.__T / G.DRAWN.T; if (Math.abs(k - 1) > 0.03) G.cam.s *= k; G.cam.manualUntil = 1e12; } if (f && f.check && !f.check.result) { G.resolveCheck((f.check.r0 + f.check.r1) / 2); G.clearCheck(); } if (f && f.phase === 'raid') G.setFF(true); }, 100);
  return [G.fl.items.size, G.fl.heroes.length]; }"""
RESET = "() => { const P = __yatd.PERF; ['gaps','js','sim','drw','steps','T','walls','so'].forEach(k => { if (P[k]) P[k] = []; }); P.last = 0; P.ms = 0; P.fz = 0; P.direct = 0; P.split = 0; }"
async def measure(page_name, w=640, h=360, dsf=1, warm=1.5, secs=6, wave=17, setup=None, tile=16):
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf); pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('file://' + SC + 'test/' + page_name); await pg.wait_for_timeout(600)
        n = await pg.evaluate(JS, [DOC, [], wave])
        if tile: await pg.evaluate("(t) => { window.__T = t; }", tile)
        if setup: await pg.evaluate(setup)
        await pg.wait_for_timeout(int(warm * 1000)); await pg.evaluate(RESET); await pg.wait_for_timeout(int(secs * 1000))
        s = await pg.evaluate("__yatd.perfSummary()")
        if not s: errs.append('no summary: ' + json.dumps(await pg.evaluate("[__yatd.fl.phase, __yatd.PERF.gaps.length, __yatd.paused, __yatd.modalKind, document.visibilityState, Math.round(__yatd.fl.time)]")))
        await ctx.close(); await b.close()
        return s, n, errs
def run(page_name, reps=3, **kw):
    out = []
    for _ in range(reps): s, n, e = asyncio.run(measure(page_name, **kw)); out.append((s, n, e))
    return out
