# 1.13.3 (author: shorten the scene before a deadly room): at most two specialists speak, the leader's "go" is the rush line
# after it (not one more line here), with no specialist a friend answers; every specialist still does his part.
import asyncio, json
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal();
  G.run.wave = 4; G.startBuild(); G.fl.essence = 900;
  for (let k = 0; k < 3; k++) { const dm = G.toolMarkers('dig'); if (dm.length) G.applyTool(dm[0]); G.fl.essence = 900; }
  G.run.next = G.makeWave(4); G.startWave();
  let g = 0; while (G.fl.queue.length && g++ < 400) G.step(0.05);
  for (let i = 0; i < 50; i++) G.step(0.05);
  const f = G.fl, A = G.alive(), P = f.party;
  const R = f.rooms.filter(r => r.kind === 'room' && r.id !== f.heart.room), tl = r => r.tiles.filter(t => G.walkable(t[0], t[1]) && !f.items.has(t[0] + ',' + t[1]));
  const r0 = R.find(r => tl(r).length >= 4) || R[0], rid = R[R.length - 1].id;
  const put = (h, t) => { h.x = h.tx = t[0]; h.y = h.ty = t[1]; h.nx = null; h.path = []; h.state = 'walk'; h.room = G.roomOf(t[0], t[1]); h.talkUntil = -1; h.bubble = null; h.saidUntil = -9; h.sayQ = null; h.panicUntil = -1; h.fleeing = false; h.lost = false; h.gone = false; };
  const reset = () => { P.queueSay = []; P.talkUntil = -1; P.convoT = -1; P.prep = null; f.gateOpen = true; A.forEach((h, i) => put(h, tl(r0)[Math.min(i, tl(r0).length - 1)])); P.leaderId = A[0].id; };
  const scene = () => { const t0 = f.time; G.startPrep(rid); return { n: P.queueSay.length, who: P.queueSay.map(q => q.id), dur: P.prep ? +(P.prep.until - t0).toFixed(2) : null, prep: P.prep }; };
  ok(A.length >= 4, 'four heroes for the test (got ' + A.length + ')');
  const types = A.map(h => [h.type, h.lvl, h.faith]);
  // 1. four specialists: two speak, all four act
  reset(); ['priest', 'mage', 'thief', 'warrior'].forEach((t, i) => { if (A[i]) { A[i].type = t; A[i].lvl = 8; A[i].faith = 5; A[i].jamCd = 0; } });
  const s1 = scene(); out.full = { n: s1.n, dur: s1.dur };
  ok(s1.n === 3, 'leader + two specialists (got ' + s1.n + ' lines)');
  ok(s1.dur !== null && s1.dur <= 10, 'the scene is short (' + s1.dur + ' s)');
  ok(s1.prep && s1.prep.pr >= 0 && s1.prep.mg >= 0 && s1.prep.th >= 0 && s1.prep.wr >= 0, 'every specialist still does his part');
  // 2. no specialist: a friend answers the leader
  A.forEach((h, i) => { h.type = types[i][0]; h.lvl = 2; h.faith = types[i][2]; });
  reset(); const s2 = scene(); out.none = { n: s2.n, who: s2.who, dur: s2.dur };
  ok(s2.n === 2 && s2.who[0] === A[0].id && s2.who[1] !== A[0].id, 'with no specialist a friend answers the leader');
  // 3. alone: the leader says his own "go", nobody answers nobody
  reset(); A.slice(1).forEach(o => { o.gone = true; }); const s3 = scene(); out.alone = { n: s3.n, who: s3.who, dur: s3.dur };
  ok(s3.n === 2 && s3.who.every(id => id === A[0].id), 'alone, the leader talks for himself');
  A.slice(1).forEach(o => { o.gone = false; });
  A.forEach((h, i) => { h.type = types[i][0]; h.lvl = types[i][1]; });
  return { out, fails }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        r = await page.evaluate(JS); print(json.dumps(r['out'], ensure_ascii=False))
        fails = r['fails'] + (['page errors %s' % errs[:2]] if errs else [])
        print('FAILS', fails)
        await b.close()
asyncio.run(main())
