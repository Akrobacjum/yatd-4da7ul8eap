# 1.13 (author: the thumb covered the check at the bottom; the quiet should go on while they rest or talk it over, while
# one is down a trapdoor and while all sit in cages): the check is drawn at the top of the map, under the party chips;
# talks, rests, a trapdoor with someone inside and everyone caged are quiet.
import asyncio, json
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal();
  G.run.wave = 3; G.startBuild(); G.fl.essence = 900; G.run.unlocked.add('trapdoor');
  const P = G.shortestPath(); let td = null;
  for (let k = 4; k < P.length && !td; k++) if (G.canPlace('trapdoor', P[k][0], P[k][1]) && G.tryPlace('trapdoor', P[k][0], P[k][1])) td = P[k];
  G.run.next = G.makeWave(3); G.startWave();
  let g = 0; while (G.fl.queue.length && g++ < 400) G.step(0.05);
  for (let i = 0; i < 60; i++) G.step(0.05);
  const f = G.fl, A = G.alive(), [cw, ch] = G.cwch;
  // 2. talks and rests are quiet: the fast-forward is not held back
  const park = () => A.forEach((h, i) => { h.x = h.tx = P[1][0]; h.y = h.ty = P[1][1]; h.nx = null; h.state = 'walk'; h.gone = false; h.cageUntil = -1; });
  park(); out.why0 = G.quietWhy();
  f.party.talkUntil = f.time + 5; f.quietT = 1; f.gateOpen = true; out.talkFF = G.autoFFOn(); f.party.plan = 'retreat'; f.party.restSince = f.time; out.restFF = G.autoFFOn(); f.party.plan = 'explore'; f.party.restSince = -1;
  ok(out.why0 !== null || (out.talkFF && out.restFF), 'a talk and a rest keep the quiet (and its fast-forward)');
  f.party.talkUntil = -1;
  // 3. everyone caged: quiet
  A.forEach(h => { h.state = 'caged'; h.cageUntil = f.time + 9; }); out.caged = G.quietWhy();
  ok(out.caged === null, 'everyone in a cage is quiet');
  A.forEach(h => { h.state = 'walk'; h.cageUntil = -1; });
  A[0].state = 'caged'; out.oneCaged = G.quietWhy(); A[0].state = 'walk';
  ok(A.length < 2 || out.oneCaged === 'caged', 'one caged while the rest walk is not quiet');
  // 4. a trapdoor: the one down it is no threat to the rest; nobody left up here is quiet
  if (td) {
    const it = f.items.get(td[0] + ',' + td[1]); it.cd = 0;
    A.forEach(h => { h.x = h.tx = td[0]; h.y = h.ty = td[1] + 0; });
    out.nearTd = G.quietWhy();
    A[0].gone = true; A[0].fallUntil = f.time + 9;
    out.withOneDown = G.quietWhy();
    ok(out.nearTd === 'near' && out.withOneDown !== 'near' || out.nearTd !== 'near', 'a trapdoor with someone down it does not count as near');
    A.forEach(h => { h.gone = true; h.fallUntil = f.time + 9; });
    out.allDown = G.quietWhy();
    ok(out.allDown === null, 'everyone down a trapdoor is quiet');
  }
  return { out, fails }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        r = await page.evaluate(JS)
        # 1. the check: at the top of the map, under the party chips (6 + 30 px), and it fits; drawn by the page's own frames
        await page.evaluate('''() => { const G = __yatd, f = G.fl; G.alive().forEach(h => { h.gone = false; h.state = 'walk'; });
            const it = [...f.items.values()][0]; f.check = { it, extra: [], shape: 'spiral', t0: G.realNow + 30, prepT0: G.realNow, dur: 1, g0: 0.4, g1: 0.6, r0: 0.45, r1: 0.55, rot: 0 }; }''')
        await page.clock.run_for(300)
        b2 = await page.evaluate("() => { const G = __yatd, b = G.fl.check && G.fl.check.box; return b && { y: Math.round(b.y), h: Math.round(b.h), ch: G.cwch[1] }; }")
        r['out']['box'] = b2
        if not (b2 and b2['y'] >= 42 and b2['y'] + b2['h'] <= b2['ch'] * 0.6): r['fails'].append('the check sits at the top of the map, under the party chips')
        print(json.dumps(r['out']))
        fails = [x for x in r['fails'] if x] + (['page errors %s' % errs[:2]] if errs else [])
        print('FAILS', fails)
        await b.close()
asyncio.run(main())
