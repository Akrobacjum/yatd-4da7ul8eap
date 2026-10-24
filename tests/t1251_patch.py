# 1.25.1: the unspent-Esencja question suggests what to buy (1-2 affordable things with a free spot and a reason; a tap picks
# the tile in its tab and it pulses; Buduj dalej makes them pulse; loot when the heart is hungry; what scored in the last wave
# first; stats.unspentPicks / unspentPick) and the preview's visibility (run.pv: seconds on screen, covered by a card, the first
# second; waves.summary.previewVis), phone and wide. The early curve itself is in t124a_play (section 3).
# Prints FAILS [...] and exits 1 on any.
import asyncio, sys, json, os
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])   # LIB, LIB2, fresh_page, start_full
SHOTS = SC + 'e1251/shots/'
os.makedirs(SHOTS, exist_ok=True)

SUG = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  localStorage.removeItem('yatd-noask-ess');
  document.querySelector('#btn-action').click();
  out.kind = G.modalKind;
  const bs = [...document.querySelectorAll('#card .choices.sugg .btn')].map(b => ({ t: b.dataset.t, txt: b.innerText.replace(/\n/g, ' | ') }));
  out.sug = bs; out.txt = document.querySelector('#card').innerText.slice(0, 160).replace(/\n/g, ' | ');
  ok(G.modalKind === 'unspent', 'the question comes: ' + G.modalKind);
  ok(bs.length >= 1 && bs.length <= 2, '1-2 suggestions: ' + JSON.stringify(bs));
  const e = Math.floor(G.fl.essence);
  bs.forEach(b => {
    ok(G.costOf(b.t) <= e && G.isOpenT(b.t), b.t + ': affordable and open');
    let spot = false; for (let y = 0; y < G.WH && !spot; y++) for (let x = 0; x < G.WW; x++) if (G.canPlace(b.t, x, y)) { spot = true; break; }
    ok(spot, b.t + ': has a free spot');
    ok(/·\s*\d+ Esencji/.test(b.txt) && b.txt.split('|').length >= 2, b.t + ': name, price and why: ' + b.txt);
  });
  if (bs.length === 2) ok(bs[0].t !== bs[1].t, 'two different things');
  ok(JSON.stringify(G.fl.stats.unspentPicks) === JSON.stringify(bs.map(b => b.t)), 'stats.unspentPicks');
  return { fails, out }; }"""

async def suggest(b, fails):
    for name, w, h in [('phone', 390, 844), ('wide', 1600, 900)]:
        ctx, pg, errs = await fresh_page(b, w, h)
        await pg.evaluate("localStorage['yatd-noask-ess'] = ''")
        await pg.click('#start-play'); await pg.clock.run_for(500); await pg.evaluate("T.clean()"); await pg.clock.run_for(200)
        r = await pg.evaluate(SUG); fails += [name + ': ' + f for f in r['fails']]; print('==', name, json.dumps(r['out']))
        await pg.screenshot(path=SHOTS + 'unspent_%s.png' % name)
        bs = r['out'].get('sug') or []
        if bs:
            t = bs[0]['t']
            await pg.click('#unspent-sug-' + t); await pg.clock.run_for(200)
            s = await pg.evaluate("""t => ({ modal: __yatd.modalKind, sel: __yatd.selected, pick: __yatd.fl.stats.unspentPick, pulse: document.querySelector('#item-' + t).classList.contains('suggest'),
                shown: !document.querySelector('#item-' + t).hidden, tray: __yatd.trayIsOpen() })""", t)
            print('   take', json.dumps(s))
            if s['modal'] or s['sel'] != t or s['pick'] != t or not s['pulse'] or not s['shown'] or not s['tray']: fails.append(name + ': a suggestion picks its tile in its tab, which pulses: ' + json.dumps(s))
            await pg.screenshot(path=SHOTS + 'unspent_take_%s.png' % name)
            await pg.clock.run_for(6500)
            if await pg.evaluate("t => document.querySelector('#item-' + t).classList.contains('suggest')", t): fails.append(name + ': the pulse ends after 6 s')
            # Buduj dalej: the suggestions pulse
            await pg.keyboard.press('Escape'); await pg.evaluate("__yatd.fl.essence = 24")
            await pg.evaluate("document.querySelector('#btn-action').click()"); await pg.clock.run_for(100)
            await pg.evaluate("document.querySelector('#unspent-back').click()"); await pg.clock.run_for(100)
            p = await pg.evaluate("[...document.querySelectorAll('#tray .item.suggest')].map(b => b.id)")
            print('   back', p)
            if not p: fails.append(name + ': Buduj dalej makes the suggestions pulse')
        if errs: fails.append(name + ': page errors ' + str(errs[:2]))
        await ctx.close()
    # the hungry heart: loot among them; what scored in the last wave first
    ctx, pg, errs = await fresh_page(b, 390, 844)
    await start_full(pg)
    r = await pg.evaluate(r"""() => { const { G } = T, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
      T.clean(); G.run.unlocked.add('loot'); G.run.stage = 4;
      const hr0 = G.hungerRisk; out.base = G.suggestBuys(30).map(q => q.t);
      // a last wave where the web scored a lot: it comes first (when affordable and placeable)
      G.run.unlocked.add('web'); G.run.waves = [{ items: { web: { pts: 900, fearPts: 0 } } }];
      out.last = G.suggestBuys(30).map(q => q.t + ':' + q.why);
      ok(G.suggestBuys(30)[0].t === 'web', 'what scored last wave comes first: ' + out.last);
      G.run.waves = [];
      return { fails, out }; }""")
    fails += r['fails']; print('== scoring', json.dumps(r['out']))
    await ctx.close()

PV = r"""() => { const { G } = T, P = G.run.pv; return P ? { buildSec: P.buildSec, sec: P.sec, coveredSec: P.coveredSec, firstAt: P.firstAt, openSec: P.openSec } : null; }"""
async def preview(b, fails):
    for name, w, h in [('phone', 390, 844), ('wide', 1600, 900)]:
        ctx, pg, errs = await fresh_page(b, w, h)
        await start_full(pg)
        sr = await pg.evaluate("(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.8]; })()")
        p0 = await pg.evaluate(PV)
        for i in range(5):   # the player is there: a touch every second
            await pg.mouse.move(sr[0], sr[1]); await pg.mouse.down(); await pg.mouse.up(); await pg.clock.run_for(1000)
        p1 = await pg.evaluate(PV)
        await pg.click('#btn-settings'); await pg.clock.run_for(3000)
        p2 = await pg.evaluate(PV)
        await pg.evaluate("T.clean()")
        out = {'p0': p0, 'p1': p1, 'p2': p2}
        if not p1 or p1['sec'] < 3.5 or p1['firstAt'] is None or p1['firstAt'] > 2: fails.append(name + ': the preview counted as seen: ' + json.dumps(p1))
        if not p2 or p2['coveredSec'] - (p1 or {}).get('coveredSec', 0) < 2.5 or abs(p2['sec'] - p1['sec']) > 0.6: fails.append(name + ': covered by the menu card: ' + json.dumps(p2))
        # into the wave record
        r = await pg.evaluate(r"""() => { const { G } = T; G.fl.essence = 0; localStorage['yatd-noask-ess'] = '1'; document.querySelector('#btn-action').click();
          T.play(c => (c.g0 + c.g1) / 2, 300); const W = G.run.waves[G.run.waves.length - 1], D = G.run.waveDocs && G.run.waveDocs[G.run.waveDocs.length - 1];
          return { pv: W && W.previewVis, doc: D && D.summary && D.summary.previewVis, v: D && D.version }; }""")
        out['rec'] = r
        if not r['pv'] or r['pv']['sec'] < 3.5 or r['pv']['coveredSec'] < 2.5 or r['pv']['buildSec'] < r['pv']['sec'] + r['pv']['coveredSec'] - 0.1: fails.append(name + ': previewVis in the wave record: ' + json.dumps(r))
        if r['doc'] is not None and r['doc'] != r['pv']: fails.append(name + ': the same in the wave document')
        print('== preview', name, json.dumps(out))
        if errs: fails.append(name + ': page errors ' + str(errs[:2]))
        await ctx.close()

async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await suggest(b, fails)
        await preview(b, fails)
        await b.close()
    print('FAILS', fails)
    sys.exit(1 if fails else 0)
asyncio.run(main())
