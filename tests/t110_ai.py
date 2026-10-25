# 1.10 (author: the heroes talked all at once and ignored free loot): one speaks at a time within earshot, an answer waits for
# the line it answers, chaos talks over the others, separate rooms talk at once; loot a few steps away is weighed and taken
# even across known danger; one hero per treasure; the greed curve; four heroes a wave (+ the boss).
import asyncio, json
from playwright.async_api import async_playwright
BASE='file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const fresh = () => { while (G.modalKind) G.closeModal(); G.setUser(true); G.newRun(false); while (G.modalKind) G.closeModal(); G.run.tutorial = false; G.fl.essence = 999; };
  const enter = () => { G.startWave(); let g = 0; while (G.fl.queue.length && g++ < 400) G.step(0.05); };
  // 1.12.1: a clean floor also means no party lines waiting (scenes, the search for one left alone) and the door line said
  const quiet = () => { G.fl.party.queueSay = []; G.fl.party.talkUntil = -1; G.fl.party.searchId = -1; G.fl.gateOpen = true;
    G.fl.heroes.forEach(o => { o.bubble = null; o.saidUntil = -9; o.sayQ = null; o.hurtAt = -99; o.panicUntil = -1; o.fleeing = false; o.burnUntil = -1; o.state = 'walk'; o.lost = false; o.sepT = 0; }); };
  const put = (h, x, y) => { h.x = x; h.y = y; h.tx = x; h.ty = y; h.nx = null; h.room = G.roomOf(x, y); h.path = []; };
  fresh(); enter();
  const f = G.fl, A = G.alive(); const [a, b, c] = A;
  const R = f.rooms.filter(r => r.kind === 'room'), r0 = R[0];
  const tl = r => r.tiles.filter(t => G.walkable(t[0], t[1]));
  // 1.12.1: the other room is the one furthest from the first, so the lonely one there is surely out of earshot
  const gap = r => Math.min(...tl(r).map(t => Math.min(...tl(r0).map(u => Math.abs(t[0] - u[0]) + Math.abs(t[1] - u[1])))));
  const r1 = R.filter(r => r !== r0 && r.id !== f.heart.room && tl(r).length).sort((x, y) => gap(y) - gap(x))[0] || R[1];
  // 1. the same room: one at a time
  f.party.queueSay = []; f.party.talkUntil = -1;
  // c goes to the walkable tile furthest from the two (a small dungeon may have its rooms within 7 steps: earshot)
  const allT = f.rooms.flatMap(r => tl(r)), dd = t => Math.min(...[tl(r0)[0], tl(r0)[1]].map(u => Math.hypot(t[0] - u[0], t[1] - u[1])));
  const cT = allT.reduce((m, t) => dd(t) > dd(m) ? t : m, tl(r1)[0]);
  quiet(); put(a, ...tl(r0)[0]); put(b, ...tl(r0)[1]); put(c, ...cT); out.cDist = Math.round(dd(cT) * 10) / 10;
  const s1 = G.say(a, 'Słyszycie to?', 2), s2 = G.say(b, 'Nic nie słyszę, cicho bądź.', 2);
  out.turn = { s1, s2, q: b.sayQ ? b.sayQ.length : 0, aLen: Math.round((a.bubble.until - a.bubble.at) * 100) / 100 };
  ok(s1 && !s2 && b.sayQ && b.sayQ.length === 1, 'a calm line waits for its turn');
  ok(a.bubble.until - a.bubble.at >= G.readT('Słyszycie to?') - 1e-6, 'a bubble stays as long as it takes to read');
  let tB = null; for (let i = 0; i < 120 && tB === null; i++) { G.step(0.05); if (b.bubble && b.bubble.until > f.time) tB = f.time; }
  out.turn.bAt = tB; out.turn.aEnd = a.saidUntil;
  ok(tB !== null && tB >= a.saidUntil + 0.25, 'the answer comes after the line it answers (and a breath)');
  // 2. another room, out of earshot (over 7 steps): at the same time
  { quiet(); let far = null; R.forEach(x => R.forEach(y => { if (far || x === y) return; for (const p of tl(x)) for (const q of tl(y)) if (!far && Math.hypot(p[0] - q[0], p[1] - q[1]) > 8) far = [p, q]; }));
    out.far = !!far;
    if (far) { put(a, ...far[0]); put(c, ...far[1]); ok(G.say(a, 'Trzymajcie się blisko.', 2) && G.say(c, 'Patrzcie pod nogi.', 2), 'heroes far apart in different rooms talk at once'); } }
  // 3. chaos: a cry of pain goes over the others, an ordinary line of a wounded one does not (1.11)
  quiet(); put(a, ...tl(r0)[0]); put(b, ...tl(r0)[1]);
  G.say(a, 'Trzymajcie się blisko.', 2); b.hurtAt = f.time;
  ok(G.say(b, 'Aaa! Moja noga!', 2, null, 'loud'), 'a cry of pain goes over the others');
  quiet(); G.say(a, 'Trzymajcie się blisko.', 2); b.hurtAt = f.time;
  ok(!G.say(b, 'Kto pierwszy, ten lepszy!', 2), 'a wounded hero says an ordinary line in his turn');
  quiet(); G.say(a, 'Trzymajcie się blisko.', 2); b.panicUntil = f.time + 3;
  ok(G.say(b, 'Uciekajmy stąd!', 2), 'a panicking hero talks over the others');
  // 3b. a corridor is no room: four steps apart there they still hear each other (1.11)
  { quiet(); let cA = null, cB = null;
    for (let y = 0; y < G.WH && !cA; y++) for (let x = 0; x < G.WW && !cA; x++) if (G.walkable(x, y) && G.roomOf(x, y) < 0) { for (const [dx, dy] of [[4, 0], [0, 4], [3, 2], [2, 3]]) if (G.walkable(x + dx, y + dy)) { cA = [x, y]; cB = [x + dx, y + dy]; break; } }
    if (cA) { put(a, ...cA); put(b, ...cB); G.say(a, 'Trzymajcie się blisko.', 2); ok(!G.say(b, 'Patrzcie pod nogi.', 2), 'four steps apart in a corridor they still take turns'); } }
  quiet(); G.say(a, 'Trzymajcie się blisko.', 2);
  ok(G.say(b, 'Uwaga!', 4), 'a cry (prio 4) goes over the others');
  // 4. a talk: lines one after another, never two at once in the same room
  quiet(); put(a, ...tl(r0)[0]); put(b, ...tl(r0)[1]); put(c, ...tl(r0)[2] || tl(r0)[0]); f.party.queueSay = []; f.party.talkUntil = -1;
  G.talkAs(1.4, [[a, 'Którędy teraz? Lewo czy prawo?'], [b, 'W prawo, tam było złoto.'], [c, 'Wolniej. Którędy bezpieczniej?'], [a, 'Dobra, w prawo, ale ostrożnie.']]);
  let both = 0, seen = new Set(), order = [];
  for (let i = 0; i < 400; i++) { G.step(0.05); const sp = [a, b, c].filter(h => h.bubble && h.bubble.until > f.time); const ear = (x, y) => (G.roomOf(x.tx, x.ty) >= 0 && G.roomOf(x.tx, x.ty) === G.roomOf(y.tx, y.ty)) || Math.hypot(x.tx - y.tx, x.ty - y.ty) <= 2.5;
    for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) if (!sp[i].bubble.loud && !sp[j].bubble.loud && ear(sp[i], sp[j])) both++; sp.forEach(h => { const k = h.id + ':' + h.bubble.at; if (!seen.has(k)) { seen.add(k); order.push(h.bubble.text); } }); if (!f.party.queueSay.length && !sp.length && order.length >= 4) break; }
  out.talk = { both, order };
  ok(both === 0, 'nobody talks over anyone in a calm talk (' + both + ')');
  ok(order.slice(0, 4).join('|') === 'Którędy teraz? Lewo czy prawo?|W prawo, tam było złoto.|Wolniej. Którędy bezpieczniej?|Dobra, w prawo, ale ostrożnie.', 'the talk goes in order: ' + order.join(' / '));
  // 5. Głusza: the mouth moves, nothing comes out
  { const L = G.run.layout, c0 = L.cells.get(r1.key); if (c0) { c0.rt = 'hush'; r1.rt = 'hush'; }
    quiet(); put(c, ...tl(r1)[0]); G.say(c, 'Patrzcie pod nogi.', 2); out.hush = c.bubble && c.bubble.text; ok(c.bubble && c.bubble.text === '…', 'in Głusza a line is just "…"'); r1.rt = undefined; if (c0) c0.rt = undefined; }
  // 6. loot: a few steps away across known danger it is weighed and taken; one hero per treasure
  { fresh(); const P = G.shortestPath(); let lk = null;
    for (const q of P.slice(4)) if (G.canPlace('loot', q[0], q[1])) { G.tryPlace('loot', q[0], q[1]); lk = q; break; }
    enter(); const f2 = G.fl, it = f2.items.get(lk[0] + ',' + lk[1]), hs = G.alive();
    const r = f2.rooms[G.roomOf(lk[0], lk[1])], spots = r.tiles.filter(t => G.walkable(t[0], t[1]) && Math.abs(t[0] - lk[0]) + Math.abs(t[1] - lk[1]) >= 3 && Math.abs(t[0] - lk[0]) + Math.abs(t[1] - lk[1]) <= 4);
    const sp = spots[0] || r.tiles.find(t => G.walkable(t[0], t[1]) && (t[0] !== lk[0] || t[1] !== lk[1]));
    hs.forEach(h => { put(h, sp[0], sp[1]); h.fear = 0; h.hp = h.max; h.state = 'walk'; h.lootMemo = new Map(); h.intent = null; h.lootKey = null; });
    it.seenWave = G.run.wave; f2.items.forEach(o => { if (o !== it && !G.LOOT_KIND[o.type]) f2.items.delete(o.x + ',' + o.y); });
    for (let i = 0; i < G.WW * G.WH; i++) { f2.known[i] = 1; f2.danger[i] = 0; } r.tiles.forEach(t => { f2.danger[t[1] * G.WW + t[0]] = 0.8; }); f2.danger[lk[1] * G.WW + lk[0]] = 0;
    f2.fearless = false; f2.party.plan = 'explore'; f2.party.lootClaim = new Map();
    const b0 = G.bfs(sp[0], sp[1], { known: true }), i0 = lk[1] * G.WW + lk[0];
    hs.forEach(h => G.planHero(h));
    const goers = hs.filter(h => h.intent === 'loot').length;
    out.loot = { cost: Math.round(b0.dist[i0] * 10) / 10, steps: Math.abs(sp[0] - lk[0]) + Math.abs(sp[1] - lk[1]), goers, intents: hs.map(h => h.type + ':' + h.intent) };
    ok(goers === 1, 'one hero goes for the loot across known danger, the others do not all run for it (' + out.loot.intents.join(' ') + ')');
    let got = false; for (let i = 0; i < 300 && !got; i++) { G.step(0.05); got = f2.items.get(lk[0] + ',' + lk[1]) !== it; }
    ok(got, 'he takes it'); }
  // 6b. a whole calm wave (1.11, author: they still talked at once when nothing happened): nobody starts a calm line while
  // another one within 7 steps is still up
  { fresh(); enter(); const f4 = G.fl, st = new Map(); let lines = 0, over = 0, ex = [];
    for (let i = 0; i < 1600 && f4.phase === 'raid'; i++) { const c = f4.check; if (c) { if (!c.result) G.resolveCheck((c.r0 + c.r1) / 2); G.clearCheck(); continue; } G.step(0.05);
      const A2 = G.alive(); A2.forEach(h => { const b2 = h.bubble; if (!b2 || b2.until <= f4.time || st.get(h.id) === b2.at) return; st.set(h.id, b2.at); lines++;
        if (b2.loud) return; const o = A2.find(x => x !== h && x.bubble && x.bubble.until > f4.time && x.bubble.at < b2.at && !x.bubble.loud && Math.hypot(x.tx - h.tx, x.ty - h.ty) <= 7);
        if (o) { over++; if (ex.length < 3) ex.push(o.bubble.text + ' / ' + b2.text); } }); }
    out.calmWave = { lines, over, ex }; ok(lines >= 5 && over === 0, 'a calm line never starts over another one nearby (' + over + ' of ' + lines + ': ' + ex.join(' | ') + ')'); }
  // 7. greed: the curve
  { fresh(); enter(); const f3 = G.fl; f3.greed = 1; const d1 = G.addGreed(0.5); f3.greed = 3; const d3 = G.addGreed(0.5);
    out.greed = { d1: Math.round(d1 * 1000) / 1000, d3: Math.round(d3 * 1000) / 1000, c538: Math.round(G.greedCurve(5.38) * 100) / 100 };
    ok(Math.abs(G.greedCurve(5.38) - 3.12) < 0.01 && Math.abs(G.greedRaw(G.greedCurve(4)) - 4) < 1e-9, 'greed = sqrt(2 raw - 1)');
    ok(d3 < d1 / 2.5, 'at x3 the same treasure adds about a third of what it adds at x1'); }
  // 8. four heroes a wave from wave 4, the bosses as a fifth, more again past the finale
  { [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 15].forEach(w => { G.run.omens[w] = null; });   // 1.26: no omen (Oblężenie, Elita change the size)
    const n = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 15].map(w => G.makeWave(w).length); out.sizes = n;
    ok(n.join(',') === '3,3,3,4,5,4,4,4,5,5,6', 'party sizes ' + n.join(',')); }
  return { out, fails }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(400)
        r = await page.evaluate(JS); print(json.dumps(r['out'], ensure_ascii=False)); print('FAILS', r['fails'] if r['fails'] or errs else 'none'); print('errs', errs[:3])
        await b.close()
asyncio.run(main())
