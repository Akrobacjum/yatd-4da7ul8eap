# 1.12 (author: the tutorial spread over a few runs): the first four runs open the game step by step (run 1: the core with
# the guide, wounds by traps and monsters; 2: scares; 3: the guild, the counter-buildings, room types; 4: bodies, phobias, returners, hunters,
# the breach), each with a card of what is new; "Pomiń samouczek" opens everything. Plus the guide's card that stayed on
# the screen in the next run (bug), and the hero HP that grows with the waves (comboHp).
# 1.24 (B, author: unlocking over a single run): the stages now go by the waves of the first run (sections 4 and 5 changed on
# purpose; the rest as before).
import asyncio, json
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
fails = []
def ok(c, m):
    if not c: fails.append(m)

STATE = r'''() => { const G = __yatd, vis = id => { const e = document.querySelector(id); return !!e && !e.hidden && e.offsetParent !== null; };
  return { stage: G.run.stage, guided: !!G.run.guided, tutorial: G.run.tutorial, tut: G.run.tut, onb: G.onbStage(), modal: G.modalKind,
    tabs: G.TABS.map(t => t.id).filter(id => { const e = document.querySelector('#tab-' + id); return !e.hidden && !e.classList.contains('off'); }),
    unl: [...G.run.unlocked], coach: vis('#coach'), coachTxt: (document.querySelector('#coach') || {}).textContent || '',
    card: (document.querySelector('#card') || {}).textContent || '' }; }'''

async def start(page, which):
    await page.evaluate('() => { while (__yatd.modalKind) __yatd.closeModal(); __yatd.openModal({ type: "start" }); }')
    txt = await page.evaluate('() => [...document.querySelectorAll("#card .startbtns button")].map(b => b.id + ": " + b.textContent)')
    await page.click('#' + which)
    await page.wait_for_timeout(50)
    return txt

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}); page = await ctx.new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        out = {}
        # 1. a fresh browser: Samouczek = run 1 with the guide, the core only
        btns = await start(page, 'start-tut'); out['btns1'] = btns
        ok(any('start-tut: Samouczek' in t for t in btns) and any('start-play: Pomiń samouczek' in t for t in btns), 'a fresh browser: Samouczek + Pomiń samouczek')
        s = await page.evaluate(STATE); out['run1'] = {k: s[k] for k in ('stage', 'guided', 'tutorial', 'tut', 'onb', 'tabs')}
        ok(s['stage'] == 1 and s['guided'] and s['tutorial'] and s['tut'] == 0, 'run 1: stage 1, guided, with the guide')
        ok(s['tabs'] == ['traps', 'monster', 'loot', 'dungeon', 'deck'], 'run 1: tabs Pułapki, Potwory, Łup, Loch, Talia (got %s)' % s['tabs'])
        ok(not any(t in s['unl'] for t in ['portrait', 'eyes', 'bones', 'crate', 'altar', 'r_fog', 'r_ice']) and all(t in s['unl'] for t in ['spikes', 'arrows', 'goblin', 'archer', 'loot', 'dig', 'expand']), 'run 1: only the core is unlocked')
        ok(s['coach'] and 'Samouczek 1/' in s['coachTxt'], 'run 1: the guide is up')
        hid = await page.evaluate('''() => { __yatd.setTab("traps"); return ["portrait", "eyes", "spikes", "arrows"].map(t => document.querySelector("#item-" + t).hidden); }''')
        ok(hid == [True, True, False, False], 'run 1: no scaring traps in the Pułapki tab (%s)' % hid)
        r1 = await page.evaluate('''() => { const G = __yatd, bad = new Set();
          for (let i = 0; i < 300; i++) { G.run.wave = 1 + (i % 10); G.upgradePicks(1 + (i % 3)).forEach(u => { if (u.kind === 'unlock' ? !G.onbOk(u.unlock) : (G.ONB_CARD[u.id] || 1) > 1) bad.add(u.id); }); }
          G.run.wave = 1;
          let phys = 0, phob = 0, hunt = 0; for (let n = 3; n <= 10; n++) { G.run.greedRep = 9; const L = G.makeWave(n); L.forEach(e => { if (e.phys) phys++; if (e.phobia) phob++; if (e.hunter) hunt++; }); }
          G.run.greedRep = 1;
          G.run.waves.push({ stats: { fearPts: 900, scarePts: 0, dmgPts: 1, killPts: 1, kills: 0, lostPts: 0, lonePts: 0, gotLost: 0 }, heroes: [1, 2, 3] });
          const g = G.guildAdapt(5); G.run.waves.pop();
          const bp = G.planBreach();
          return { bad: [...bad], phys, phob, hunt, guild: g, breach: bp, hunger: G.hungerNeed(2) }; }''')
        out['run1rules'] = r1
        ok(not r1['bad'], 'run 1: the shop offers nothing of a later run (%s)' % r1['bad'])
        ok(r1['phys'] == 0 and r1['phob'] == 0 and r1['hunt'] == 0, 'run 1: no bodies, phobias or treasure hunters')
        ok(r1['guild'] is None and r1['breach'] is False, 'run 1: no guild specialist, no breach')
        ok(r1['hunger'] == 32, 'run 1: the heart is hungry from wave 2 (1.26: 38 x 0,85 in the guided run = 32, got %s)' % r1['hunger'])
        # 2. the guide's steps: wave 2 jumps to loot, wave 3 to dig
        st = await page.evaluate('''() => { const G = __yatd, ids = G.TUT.map(s => s.id), w = {}; G.TUT.forEach(s => { if (s.wave) w[s.id] = s.wave; });
          return { n: ids.length, ids, w }; }''')
        out['tut'] = st
        ok(st['n'] <= 16 and 'portrait' not in st['ids'] and 'object' not in st['ids'], 'the guide is shorter and has no scares or objects')
        ok(st['w'].get('loot') == 2 and st['w'].get('dig') == 3, 'loot comes with wave 2, digging with wave 3')
        # 3. the bug: Samouczek -> save and leave -> a new run: the guide's card is gone
        await page.evaluate('() => { __yatd.saveRun("build"); }')
        btns = await start(page, 'start-play')
        s = await page.evaluate(STATE)
        ok(not s['coach'], 'a new run after leaving the guided one: no guide card (bug 1.11.1)')
        ok(s['stage'] == 4 and not s['guided'] and s['onb'] == 5, 'Pomiń samouczek: the full game, the first runs done (stage %s, onb %s)' % (s['stage'], s['onb']))
        ok(len(s['tabs']) == 6, 'the full game: all six tabs')
        # 4. 1.24 (B, author: unlocking over a single run): the first run opens the game with its waves (1-2 / 3-4 / 5-6 / 7+), the
        # tabs follow; ending it makes the next run the full game (t124b_ui plays it wave by wave with the cards)
        await page.evaluate('() => { __yatd.setOnb(1); localStorage.setItem("yatd-coach", "1"); }')
        prog = []
        btns = await start(page, 'start-tut')
        s = await page.evaluate(STATE)
        ok(s['stage'] == 1 and s['guided'] and s['tut'] == -1 and s['modal'] in (None, 'shop'), 'the first run again (guide done): stage 1, no guide, no card (%s)' % {k: s[k] for k in ('stage', 'guided', 'tut', 'modal')})
        for w, stg in ((3, 2), (5, 3), (7, 4)):
            await page.evaluate('w => { __yatd.onbAdvance(w); }', w)
            s = await page.evaluate(STATE)
            prog.append({'wave': w, 'stage': s['stage'], 'tabs': s['tabs']})
            ok(s['stage'] == stg, 'wave %d of the first run: stage %d (got %s)' % (w, stg, s['stage']))
        out['prog'] = prog
        ok(prog[0]['tabs'] == ['traps', 'monster', 'loot', 'dungeon', 'deck'], 'wave 3: the same tabs (%s)' % prog[0]['tabs'])
        ok(prog[1]['tabs'] == ['traps', 'monster', 'loot', 'object', 'dungeon', 'deck'], 'wave 5: + Obiekty (%s)' % prog[1]['tabs'])
        ok(len(prog[2]['tabs']) == 6, 'wave 7: everything')
        ok(await page.evaluate('() => __yatd.onbStage()') == 5, 'the full game reached in the first run: learnt')
        await page.evaluate('() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.endRun("test", "end"); while (G.modalKind) G.closeModal(); }')
        btns = await start(page, 'start-play'); out['btns5'] = btns
        ok(any('start-play: Nowy run' in t for t in btns) and any('start-tut: Samouczek' in t for t in btns), 'learnt: Nowy run + Samouczek (%s)' % btns)
        s = await page.evaluate(STATE)
        ok(s['stage'] == 4 and not s['guided'], 'the next run is the full game (%s)' % s['stage'])
        # 5. a first run quit early does not count as learnt, one left after wave 5 does (1.24 B: then the next run is full)
        q = await page.evaluate('''() => { const G = __yatd; G.setOnb(1); const r = [];
          G.onbDone({ guided: true, stage: 1, wave: 3, result: 'quit' }); r.push(G.onbStage());
          G.onbDone({ guided: true, stage: 3, wave: 6, result: 'quit' }); r.push(G.onbStage());
          G.setOnb(1); G.onbDone({ guided: false, stage: 4, wave: 9, result: 'end' }); r.push(G.onbStage()); return r; }''')
        ok(q == [1, 5, 1], 'quit before wave 5: not learnt; after: learnt; not guided: nothing (%s)' % q)
        # 6. the first-time cards (the full game of the first runs): a phobia shows its card once
        pp = await page.evaluate('''() => { const G = __yatd; localStorage.removeItem('yatd-pops'); G.setOnb(4); G.setUser(true); G.startGuided(); while (G.modalKind) G.closeModal();
          G.startWave(); let g = 0; while (!G.fl.heroes.length && g++ < 400) G.step(0.05);
          const h = G.fl.heroes[0]; h.phobia = 'fire'; h.known = new Set(); G.revealPhobia(h); const a = G.tutPopNow;
          const box = document.querySelector('#coach'); const vis = !box.hidden; document.querySelector('#coach .next').click();
          const h2 = G.fl.heroes[0]; h2.known = new Set(); G.revealPhobia(h2); const b2 = G.tutPopNow;
          return { a, vis, b: b2, stage: G.run.stage }; }''')
        out['pop'] = pp
        ok(pp['a'] == 'phobia' and pp['vis'] and pp['b'] is None, 'a phobia: its card once (%s)' % pp)
        # 7. hero HP grows with the waves: +0 % in wave 1, +10 % in wave 3, +20 % from wave 5
        hp = await page.evaluate('() => [1, 2, 3, 4, 5, 9].map(n => +__yatd.comboHp(n).toFixed(3))')
        ok(hp == [1, 1.05, 1.1, 1.15, 1.2, 1.2], 'comboHp %s' % hp)
        out['hp'] = hp
        ok(not errs, 'page errors: %s' % errs[:3])
        print(json.dumps(out, ensure_ascii=False, indent=1)[:4000])
        print('FAILS', fails)
        await b.close()
asyncio.run(main())
