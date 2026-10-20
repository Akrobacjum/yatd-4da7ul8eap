# 1.13 (author: give the heroes real conversations; they froze wherever they stood while the party talked, in other rooms and
# on traps): a line can start an exchange (a friend in earshot answers, lines come one after another); a talk stops only
# the ones standing together; a hero who stands still on a known danger walks off it.
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
  const r0 = R.find(r => tl(r).length >= 4) || R[0];
  const far = R.filter(r => r !== r0 && tl(r).length).sort((a, b) => Math.hypot(tl(b)[0][0] - tl(r0)[0][0], tl(b)[0][1] - tl(r0)[0][1]) - Math.hypot(tl(a)[0][0] - tl(r0)[0][0], tl(a)[0][1] - tl(r0)[0][1]))[0];
  const put = (h, t) => { h.x = h.tx = t[0]; h.y = h.ty = t[1]; h.nx = null; h.path = []; h.state = 'walk'; h.room = G.roomOf(t[0], t[1]); h.talkUntil = -1; h.bubble = null; h.saidUntil = -9; h.sayQ = null; h.panicUntil = -1; h.fleeing = false; h.lost = false; };
  const quiet = () => { P.queueSay = []; P.talkUntil = -1; P.convoT = -1; f.gateOpen = true; };
  // 1. a talk is for the ones standing together
  quiet(); put(A[0], tl(r0)[0]); put(A[1], tl(r0)[1]); if (A[2] && far) put(A[2], tl(far)[0]);
  P.leaderId = A[0].id;
  const grp = G.talkAs(3, [[A[0], 'Którędy teraz?'], [A[1], 'Tędy.'], [A[2] || null, 'Ja tam nie idę.']]);
  out.group = grp ? grp.map(h => h.id) : null;
  ok(grp && grp.includes(A[1]) && (!A[2] || !far || !grp.includes(A[2])), 'only the ones in the same place talk');
  ok(!A[2] || !far || !(A[2].talkUntil > f.time), 'the one in another room does not stop');
  for (let i = 0; i < 80; i++) G.step(0.05);
  // 2. a line starts a conversation (luck made sure of)
  quiet(); A.forEach(h => { h.talkUntil = -1; if (h.state === 'talk') h.state = 'walk'; });
  put(A[0], tl(r0)[0]); put(A[1], tl(r0)[1]);
  const mr = Math.random; Math.random = () => 0.01;
  try { G.say(A[0], 'Ups...', 3); } finally { Math.random = mr; }
  out.queue = P.queueSay.map(q => [q.id, q.text, !!q.cv]);
  ok(P.queueSay.length >= 1 && P.queueSay.every(q => q.cv) && P.queueSay.some(q => q.id !== A[0].id), 'a failed disarm starts an exchange with a friend');
  const heard = []; for (let i = 0; i < 200 && P.queueSay.length; i++) { G.step(0.05); A.forEach(h => { if (h.bubble && h.bubble.at > f.time - 0.051 && !heard.includes(h.bubble.text)) heard.push(h.bubble.text); }); }
  out.heard = heard;
  ok(out.queue.every(q => heard.includes(q[1].replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, w) => (G.alive().find(h => h.id === q[0]) || {}).female ? w : m))), 'every line of the exchange is said, in turn');
  ok((f.stats.convos || 0) >= 1, 'counted');
  // 3. nobody stands still on a known danger
  quiet(); const h = A[1], t = tl(r0)[2] || tl(r0)[1]; put(h, t); f.danger[t[1] * G.WW + t[0]] = 3;
  h.talkUntil = f.time + 5; h.state = 'talk';
  for (let i = 0; i < 60; i++) G.step(0.05);
  out.moved = [h.x, h.y, f.danger[h.y * G.WW + h.x]];
  ok(f.danger[h.y * G.WW + h.x] === 0 || G.standOk(h, h.x, h.y), 'a hero talking on a known danger walks off it');
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
