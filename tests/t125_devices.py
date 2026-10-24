# 1.25 Telefon, tablet, komputer: the layout follows the screen (phone portrait and sideways as in 1.24; a tablet or a monitor:
# --ui zoom 1-1.3; wider than tall and taller than 560 px: the build panel on the right, the HUD top left), every button takes its
# tap at every size, the camera frames the free part, the canvas panels grow with --ui, the tips and the toast sit right; the
# mouse and the touchpad (a drag after the fast-forward started, a drag with the dungeon in view, the middle button, the wheel
# zooms, two fingers move, a pinch zooms, a right click asks then takes down, a right click or a hover reads a tile, a hover
# reads an element or a hero on the map) and the keys (WASD, + -, 1-9, Q/E, Enter, B, the Sterowanie card).
# Screenshots in e125/shots/. Prints FAILS [...] and exits 1 on any. (--only=layout,mouse,keys)
import asyncio, sys, json, os
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])   # LIB, LIB2, fresh_page, start_full
SHOTS = SC + 'e125/shots/'
os.makedirs(SHOTS, exist_ok=True)
ONLY = next((a.split('=')[1].split(',') for a in sys.argv if a.startswith('--only=')), None)
on = lambda k: ONLY is None or k in ONLY

VIEWS = [('phone', 390, 844, 1, False), ('phone-side', 844, 390, 1, False), ('small-phone', 360, 640, 1, False), ('tablet', 820, 1180, 1.3, False),
         ('tablet-big', 1024, 1366, 1.3, False), ('tablet-side', 1180, 820, 1.3, True), ('laptop', 1366, 768, 1.3, True), ('monitor', 1920, 1080, 1.3, True),
         ('window', 1000, 700, 1.15, True)]

LAYOUT = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const de = document.documentElement; out.cls = de.className; out.ui = G.UIZ;
  // every control takes its tap (the element under its middle is itself or inside it) and is on the screen
  const hit = sel => { const e = document.querySelector(sel); if (!e || e.hidden) return 'missing'; const r = e.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) return 'off screen ' + [r.left, r.top, r.right, r.bottom].map(Math.round);
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)) ? 'ok' : 'covered by ' + (t && (t.id || t.className)); };
  out.taps = {}; ['#btn-action', '#btn-settings', '#btn-undo', '#tray-toggle', '#h-wave', '#h-score', '#tab-traps', '#tab-monster', '#item-spikes', '#item-arrows', '#eq-g'].forEach(s => { out.taps[s] = hit(s); });
  ok(Object.values(out.taps).every(v => v === 'ok'), 'every control takes its tap: ' + JSON.stringify(out.taps));
  // the camera frames #stage, which does not run under the panel (wide) and starts under the HUD
  const sr = document.querySelector('#stage').getBoundingClientRect(), o = G.OXY, c = G.cwch;
  ok(Math.abs(o[0] - sr.left) <= 1 && Math.abs(o[1] - sr.top) <= 1 && Math.abs(c[0] - sr.width) <= 1, 'the camera frames the stage: ' + JSON.stringify([o, c, sr.left, sr.top, sr.width]));
  const hud = document.querySelector('.hud').getBoundingClientRect(), dr = document.querySelector('.drawer').getBoundingClientRect(), ac = document.querySelector('.actions').getBoundingClientRect();
  out.rects = { stage: [sr.left, sr.top, sr.width, sr.height].map(Math.round), hud: [hud.left, hud.top, hud.width, hud.height].map(Math.round), drawer: [dr.left, dr.top, dr.width, dr.height].map(Math.round) };
  if (de.classList.contains('wide')) {
    ok(dr.left >= sr.right - 1 && ac.left >= sr.right - 1, 'wide: the panel is right of the map');
    ok(dr.top < innerHeight * 0.1 && dr.bottom <= ac.top + 1, 'wide: the panel runs from the top to the action bar');
    ok(hud.right <= sr.right + 1 && hud.left < innerWidth * 0.05, 'wide: the HUD is top left over the map');
    // the tiles are a grid: no tile of this tab is cut off sideways
    const tray = document.querySelector('#tray'), tr = tray.getBoundingClientRect(), tiles = [...tray.querySelectorAll(':scope > .item')].filter(b => !b.hidden);
    out.tiles = tiles.length; out.trayScroll = [tray.scrollWidth, tray.clientWidth];
    ok(tray.scrollWidth <= tray.clientWidth + 1 && tiles.every(b => { const r = b.getBoundingClientRect(); return r.left >= tr.left - 1 && r.right <= tr.right + 1; }), 'wide: every tile fits across the panel: ' + JSON.stringify(out.trayScroll));
    ok(sr.width >= innerWidth * 0.5, 'wide: the map has at least half the width: ' + sr.width);
  } else ok(sr.width >= innerWidth * 0.8 || innerHeight < 560, 'the map is as wide as the screen: ' + sr.width);
  // the size: tiles and texts grow with --ui (a tile ~ 74 x 60 CSS px, zoomed)
  const it = document.querySelector('#item-spikes').getBoundingClientRect(); out.tile = [Math.round(it.width), Math.round(it.height)];
  ok(Math.abs(it.height - (de.classList.contains('wide') ? 62 : innerHeight <= 560 ? 54 : 60) * G.UIZ) < 4, 'a tile is ' + G.UIZ + ' x as tall as on a phone: ' + out.tile);
  // the dungeon in the middle of the map
  const P = G.shortestPath(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; P.forEach(p => { const q = G.w2s(p[0] + 0.5, p[1] + 0.5, 0); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  out.way = [x0, y0, x1, y1].map(Math.round);
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  ok(mx > sr.left && mx < sr.right && my > sr.top && my < sr.bottom, 'the heroes\' way is in the map\'s frame: ' + JSON.stringify([out.way, out.rects.stage]));
  return { fails, out }; }"""

CANVAS = r"""() => { const { G } = T, r = G.uiRects.list; return { list: r && [r.x, r.y, r.w, r.h].map(Math.round), ui: G.UIZ }; }"""

MODAL = r"""() => { const fails = [], out = {}, card = document.querySelector('#card').getBoundingClientRect();
  out.card = [card.left, card.top, card.width, card.height].map(Math.round);
  if (card.left < 0 || card.top < 0 || card.right > innerWidth + 1 || card.bottom > innerHeight + 1) fails.push('the menu card is on the screen: ' + out.card);
  const b = document.querySelector('#menu-back').getBoundingClientRect(), t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  if (!t || !t.closest('#menu-back')) fails.push('the menu\'s first button takes its tap');
  return { fails, out }; }"""

async def layout(b, fails):
    res = {}
    for name, w, h, ui, wide in VIEWS:
        ctx, pg, errs = await fresh_page(b, w, h)
        await start_full(pg)
        r = await pg.evaluate(LAYOUT); res[name] = r['out']
        cls = r['out']['cls'].split()
        if abs(r['out']['ui'] - ui) > 0.001: fails.append('%s: --ui %s (want %s)' % (name, r['out']['ui'], ui))
        if ('wide' in cls) != wide: fails.append('%s: wide %s (want %s)' % (name, 'wide' in cls, wide))
        fails += [name + ': ' + f for f in r['fails']]
        cvs = await pg.evaluate(CANVAS); res[name]['preview'] = cvs['list']
        await pg.screenshot(path=SHOTS + 'build_%s.png' % name)
        # the tip of a tile (a right click): the whole tip on the screen, beside the panel when wide, above the tray otherwise
        await pg.click('#item-arrows', button='right'); await pg.clock.run_for(100)
        tip = await pg.evaluate("""() => { const t = document.querySelector('#tip'), r = t.getBoundingClientRect(), d = document.querySelector('#drawer').getBoundingClientRect();
            return { hidden: t.hidden, r: [r.left, r.top, r.right, r.bottom].map(Math.round), dl: Math.round(d.left), dt: Math.round(d.top), text: t.innerText.slice(0, 40) }; }""")
        res[name]['tip'] = tip
        if tip['hidden'] or 'Strzały' not in tip['text']: fails.append(name + ': a right click on a tile shows its tip: ' + str(tip))
        elif tip['r'][0] < 0 or tip['r'][1] < 0 or tip['r'][2] > w + 1 or tip['r'][3] > h + 1: fails.append(name + ': the tip is on the screen: ' + str(tip))
        elif wide and tip['r'][2] > tip['dl']: fails.append(name + ': the tip stands left of the panel: ' + str(tip))
        elif not wide and h > 560 and tip['r'][3] > tip['dt'] + 1: fails.append(name + ': the tip stands above the tray: ' + str(tip))
        await pg.screenshot(path=SHOTS + 'tip_%s.png' % name)
        await pg.mouse.click(5, 5); await pg.clock.run_for(100)
        await pg.evaluate("__yatd.hideTip ? __yatd.hideTip() : document.querySelector('#tip').hidden = true")
        # the menu card
        await pg.click('#btn-settings'); await pg.clock.run_for(300)
        m = await pg.evaluate(MODAL); fails += [name + ': ' + f for f in m['fails']]; res[name]['menu'] = m['out']['card']
        await pg.screenshot(path=SHOTS + 'menu_%s.png' % name)
        await pg.evaluate("T.clean()")
        # a wave: the party chips grow with --ui, folded panel gives the map its column (wide)
        await pg.click('#btn-action'); await pg.clock.run_for(3000); await pg.evaluate("T.clean()"); await pg.clock.run_for(1500)
        rr = await pg.evaluate("""() => { const G = T.G, s = document.querySelector('#stage').getBoundingClientRect(), r = G.uiRects.list; return { phase: G.fl.phase, stage: [s.left, s.width].map(Math.round), list: r && [r.w, r.h].map(Math.round), s: Math.round(G.cam.s) }; }""")
        res[name]['raid'] = rr
        if rr['phase'] != 'raid': fails.append(name + ': the wave started: ' + str(rr))
        elif rr['list'] and abs(rr['list'][1] - 30 * ui) > 2: fails.append(name + ': the party chips are %s x as tall: %s' % (ui, rr['list']))
        if wide and rr['stage'][1] < w * 0.9: fails.append(name + ': in a wave (panel folded) the map takes the whole width: ' + str(rr['stage']))
        await pg.screenshot(path=SHOTS + 'raid_%s.png' % name)
        if errs: fails.append(name + ': page errors ' + str(errs[:2]))
        await ctx.close()
    for k, v in res.items(): print('==', k, json.dumps(v))

async def cam(pg): return await pg.evaluate("[T.G.cam.ox, T.G.cam.oy, T.G.cam.s]")
async def drag(pg, x, y, dx, dy, wait=0, button='left'):
    await pg.mouse.move(x, y); await pg.mouse.down(button=button); await pg.clock.run_for(wait)
    for i in range(1, 11): await pg.mouse.move(x + dx * i / 10, y + dy * i / 10); await pg.clock.run_for(16)
    await pg.mouse.up(button=button); await pg.clock.run_for(60)

async def mouse(b, fails):
    for name, w, h in [('monitor', 1600, 900), ('phone', 390, 844)]:
        ctx, pg, errs = await fresh_page(b, w, h)
        await start_full(pg)
        sr = await pg.evaluate("(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
        cx, cy = sr[0] + sr[2] * 0.5, sr[1] + sr[3] * 0.55
        out = {}
        # a drag moves the map, also with the whole dungeon in view (zoomed out to fit)
        c0 = await cam(pg); await drag(pg, cx, cy, 90, 50); c1 = await cam(pg); out['drag'] = [round(c1[0] - c0[0]), round(c1[1] - c0[1])]
        if abs(c1[0] - c0[0] + 90) > 3 or abs(c1[1] - c0[1] + 50) > 3: fails.append(name + ': a drag moves the map with the mouse: ' + str(out['drag']))
        await pg.evaluate("(() => { const G = T.G; G.cam.s = G.fitScale(); G.centerOn(G.fl.heart.x, G.fl.heart.y); })()")
        await pg.evaluate("(() => { const G = T.G, b = G.cam; const r = document.querySelector('#stage'); })()")
        c0 = await cam(pg); await drag(pg, cx, cy, 60, 0); c1 = await cam(pg); out['dragFit'] = round(c1[0] - c0[0])
        if abs(c1[0] - c0[0] + 60) > 3: fails.append(name + ': with the whole dungeon in view a drag still moves it: ' + str(out['dragFit']))
        # the middle button drags too
        c0 = await cam(pg); await drag(pg, cx, cy, -40, 0, button='middle'); c1 = await cam(pg); out['middle'] = round(c1[0] - c0[0])
        if abs(c1[0] - c0[0] - 40) > 3: fails.append(name + ': the middle button drags: ' + str(out['middle']))
        # the wheel: a mouse wheel zooms; two fingers on a touchpad move; a pinch (ctrl + wheel) zooms
        await pg.evaluate("(() => { const G = T.G; G.cam.s = G.buildScale(); G.centerOn(G.fl.heart.x, G.fl.heart.y); })()")
        await pg.mouse.move(cx, cy); c0 = await cam(pg); await pg.mouse.wheel(0, -100); await pg.clock.run_for(50); c1 = await cam(pg); out['wheel'] = [round(c0[2], 1), round(c1[2], 1)]
        if not c1[2] > c0[2] * 1.05 and not c0[2] >= await pg.evaluate("T.G.cwch && 56 * T.G.UIZ") - 0.5: fails.append(name + ': a mouse wheel zooms in: ' + str(out['wheel']))
        await pg.clock.run_for(600)
        c0 = await cam(pg); await pg.mouse.wheel(24, 18.5); await pg.clock.run_for(50); c1 = await cam(pg); out['pad'] = [round(c1[0] - c0[0]), round(c1[1] - c0[1]), round(c1[2] - c0[2], 2)]
        if abs(c1[2] - c0[2]) > 0.01 or abs(c1[0] - c0[0] - 24) > 2 or abs(c1[1] - c0[1] - 18.5) > 2: fails.append(name + ': two fingers on a touchpad move the map (no zoom): ' + str(out['pad']))
        await pg.clock.run_for(600)
        await pg.keyboard.down('Control'); c0 = await cam(pg); await pg.mouse.wheel(0, 30); await pg.clock.run_for(50); c1 = await cam(pg); await pg.keyboard.up('Control')
        out['pinch'] = [round(c0[2], 1), round(c1[2], 1)]
        if not c1[2] < c0[2] * 0.95: fails.append(name + ': a pinch on a touchpad (ctrl + wheel) zooms out: ' + str(out['pinch']))
        # a right click on a placed trap: the first asks, the second takes it down, Ctrl+Z puts it back
        t = await pg.evaluate("""(() => { const G = T.G, H = G.fl.heart, P = G.shortestPath(); for (let k = Math.floor(P.length * 0.5); k < P.length; k++) if (G.canPlace('spikes', P[k][0], P[k][1])) return P[k]; return null; })()""")
        await pg.evaluate("t => { T.place('spikes', t); T.G.fl.essence = 50; T.G.cam.s = T.G.buildScale(); T.G.centerOn(t[0] + 0.5, t[1] + 0.5); T.G.cam.manualUntil = 1e12; }", t)
        await pg.clock.run_for(100)
        xy = await pg.evaluate("t => T.tileXY(t)", t)
        e0 = await pg.evaluate("T.G.fl.essence")
        await pg.mouse.click(xy[0], xy[1], button='right'); await pg.clock.run_for(100)
        s1 = await pg.evaluate("t => [!!T.G.fl.items.get(t[0] + ',' + t[1]), T.G.fl.essence, document.querySelector('#toast').innerText]", t)
        await pg.clock.run_for(500)
        await pg.mouse.click(xy[0], xy[1], button='right'); await pg.clock.run_for(100)
        s2 = await pg.evaluate("t => [!!T.G.fl.items.get(t[0] + ',' + t[1]), T.G.fl.essence]", t)
        await pg.keyboard.press('Control+z'); await pg.clock.run_for(100)
        s3 = await pg.evaluate("t => !!T.G.fl.items.get(t[0] + ',' + t[1])", t)
        out['right'] = [s1[:2], s2, s3, s1[2][:60]]
        if not s1[0] or s1[1] != e0: fails.append(name + ': the first right click asks (nothing taken down): ' + str(s1))
        if s2[0] or s2[1] <= e0: fails.append(name + ': the second right click takes it down and pays back: ' + str(s2))
        if not s3: fails.append(name + ': Ctrl+Z puts it back')
        # the hover tip over a placed element (and none while a button is down)
        await pg.mouse.move(xy[0] + 40, xy[1] + 40); await pg.clock.run_for(50); await pg.mouse.move(xy[0], xy[1]); await pg.clock.run_for(500)
        hv = await pg.evaluate("(() => { const b = document.querySelector('#hov'), r = b.getBoundingClientRect(); return { hidden: b.hidden, text: b.innerText.replace(/\\n/g, ' | ').slice(0, 90), r: [r.left, r.top, r.right, r.bottom].map(Math.round), pt: document.documentElement.classList.contains('hovpt') }; })()")
        out['hover'] = hv
        if hv['hidden'] or 'Kolce' not in hv['text'] or not hv['pt']: fails.append(name + ': a hover over a trap shows its tip and a hand pointer: ' + str(hv))
        elif hv['r'][2] > w + 1 or hv['r'][3] > h + 1 or hv['r'][0] < 0: fails.append(name + ': the hover tip is on the screen: ' + str(hv))
        await pg.mouse.move(5, h - 5); await pg.clock.run_for(50)
        if not await pg.evaluate("document.querySelector('#hov').hidden"): fails.append(name + ': the hover tip goes when the mouse leaves')
        # a hover on a tile shows its tip, leaving it hides it
        ib = await pg.evaluate("(() => { const r = document.querySelector('#item-spikes').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
        await pg.mouse.move(ib[0], ib[1]); await pg.clock.run_for(600)
        tp = await pg.evaluate("(() => { const t = document.querySelector('#tip'); return [t.hidden, t.innerText.slice(0, 20)]; })()")
        await pg.mouse.move(cx, cy); await pg.clock.run_for(100)
        tp2 = await pg.evaluate("document.querySelector('#tip').hidden")
        out['tileHover'] = [tp, tp2]
        if tp[0] or 'Kolce' not in tp[1]: fails.append(name + ': a hover on a tile shows its tip: ' + str(tp))
        if not tp2: fails.append(name + ': the tile tip goes when the mouse leaves')
        # a click on a tile still picks it (the hover tip does not eat it)
        await pg.mouse.move(ib[0], ib[1]); await pg.clock.run_for(600); await pg.mouse.down(); await pg.clock.run_for(80); await pg.mouse.up(); await pg.clock.run_for(100)
        sel = await pg.evaluate("__yatd.selected"); out['pick'] = sel
        if sel != 'spikes': fails.append(name + ': a click after the hover tip picks the tile: ' + str(sel))
        await pg.keyboard.press('Escape')
        # a wave: press still (the fast-forward starts), then drag: the map moves and the fast-forward ends
        await pg.click('#btn-action'); await pg.clock.run_for(2500); await pg.evaluate("T.clean()"); await pg.clock.run_for(500)
        sr = await pg.evaluate("(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
        cx, cy = sr[0] + sr[2] * 0.5, sr[1] + sr[3] * 0.6
        await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.clock.run_for(450)
        ff1 = await pg.evaluate("__yatd.ff"); c0 = await cam(pg)
        for i in range(1, 11): await pg.mouse.move(cx + 9 * i, cy + 5 * i); await pg.clock.run_for(16)
        ff2 = await pg.evaluate("__yatd.ff"); c1 = await cam(pg)
        await pg.mouse.up(); await pg.clock.run_for(60)
        out['ffDrag'] = [ff1, ff2, round(c1[0] - c0[0]), round(c1[1] - c0[1])]
        if not ff1: fails.append(name + ': holding the mouse still speeds the wave up')
        if ff2 or abs(c1[0] - c0[0]) < 40: fails.append(name + ': a drag after the speed-up moves the map and ends the speed-up: ' + str(out['ffDrag']))
        # the hover tip over a hero in the wave
        hs = await pg.evaluate("(() => { const G = T.G, h = G.alive().find(q => !q.gone); if (!h) return null; const p = G.heroScreen(h), r = document.querySelector('#cv').getBoundingClientRect(), o = G.OXY; return [r.left + o[0] + p.x, r.top + o[1] + p.y - 10, h.nm[0]]; })()")
        if hs:
            await pg.evaluate("T.G.setPaused ? T.G.setPaused(true) : 0")
            await pg.mouse.move(hs[0] + 30, hs[1] + 30); await pg.clock.run_for(50); await pg.mouse.move(hs[0], hs[1]); await pg.clock.run_for(500)
            hv = await pg.evaluate("(() => { const b = document.querySelector('#hov'); return [b.hidden, b.innerText.replace(/\\n/g, ' | ').slice(0, 90)]; })()")
            out['heroHover'] = hv
            if hv[0] or hs[2] not in hv[1]: fails.append(name + ': a hover over a hero shows his name: ' + str(hv) + ' ' + hs[2])
        print('== mouse', name, json.dumps(out))
        await pg.screenshot(path=SHOTS + 'mouse_%s.png' % name)
        if errs: fails.append(name + ': page errors ' + str(errs[:2]))
        await ctx.close()

async def keys(b, fails):
    ctx, pg, errs = await fresh_page(b, 1600, 900)
    await start_full(pg)
    out = {}
    await pg.mouse.click(800, 450); await pg.clock.run_for(50); await pg.keyboard.press('Escape')
    # 1 picks the first tile (its number is on it), 2 the second
    k = await pg.evaluate("[...document.querySelectorAll('#tray > .item')].filter(b => !b.hidden).slice(0, 3).map(b => [b.id, b.dataset.k])")
    await pg.keyboard.press('Digit1'); await pg.clock.run_for(50); s1 = await pg.evaluate("__yatd.selected")
    await pg.keyboard.press('Digit2'); await pg.clock.run_for(50); s2 = await pg.evaluate("__yatd.selected")
    out['digits'] = [k, s1, s2]
    if k[0][1] != '1' or k[1][1] != '2' or s1 != k[0][0].replace('item-', '') or s2 != k[1][0].replace('item-', ''): fails.append('keys: 1 and 2 pick the first two tiles: ' + str(out['digits']))
    await pg.keyboard.press('Escape')
    # Q / E switch the tabs
    t0 = await pg.evaluate("document.querySelector('#tabs [aria-selected=true]').id")
    await pg.keyboard.press('KeyE'); await pg.clock.run_for(50); t1 = await pg.evaluate("document.querySelector('#tabs [aria-selected=true]').id")
    await pg.keyboard.press('KeyQ'); await pg.clock.run_for(50); t2 = await pg.evaluate("document.querySelector('#tabs [aria-selected=true]').id")
    out['tabs'] = [t0, t1, t2]
    if t1 == t0 or t2 != t0: fails.append('keys: E and Q switch the tabs: ' + str(out['tabs']))
    # WASD and the arrows move the camera while held; + and - zoom
    c0 = await cam(pg); await pg.keyboard.down('KeyD'); await pg.clock.run_for(400); await pg.keyboard.up('KeyD'); await pg.clock.run_for(50); c1 = await cam(pg)
    await pg.keyboard.down('ArrowUp'); await pg.clock.run_for(300); await pg.keyboard.up('ArrowUp'); await pg.clock.run_for(50); c2 = await cam(pg)
    out['pan'] = [round(c1[0] - c0[0]), round(c2[1] - c1[1])]
    if c1[0] - c0[0] < 60 or c2[1] - c1[1] > -40: fails.append('keys: D moves the map right, the up arrow up: ' + str(out['pan']))
    await pg.evaluate("(() => { const G = T.G; G.cam.s = G.buildScale() * 0.8; })()")
    c0 = await cam(pg); await pg.keyboard.press('Equal'); await pg.clock.run_for(50); c1 = await cam(pg); await pg.keyboard.press('Minus'); await pg.clock.run_for(50); c2 = await cam(pg)
    out['zoom'] = [round(c0[2], 1), round(c1[2], 1), round(c2[2], 1)]
    if not (c1[2] > c0[2] and c2[2] < c1[2]): fails.append('keys: + zooms in, - out: ' + str(out['zoom']))
    # B folds and unfolds the build panel
    o0 = await pg.evaluate("__yatd.trayIsOpen()"); await pg.keyboard.press('KeyB'); await pg.clock.run_for(100); o1 = await pg.evaluate("__yatd.trayIsOpen()")
    await pg.keyboard.press('KeyB'); await pg.clock.run_for(100); o2 = await pg.evaluate("__yatd.trayIsOpen()")
    out['b'] = [o0, o1, o2]
    if o1 == o0 or o2 != o0: fails.append('keys: B folds and unfolds the build: ' + str(out['b']))
    # the Sterowanie card in the menu
    await pg.click('#btn-settings'); await pg.clock.run_for(200)
    has = await pg.evaluate("[...document.querySelectorAll('#card .btn b')].some(b => b.textContent === 'Sterowanie')")
    if has:
        await pg.evaluate("[...document.querySelectorAll('#card .btn')].find(b => b.querySelector('b').textContent === 'Sterowanie').click()"); await pg.clock.run_for(200)
        rows = await pg.evaluate("document.querySelectorAll('#card table.keys tr').length"); out['keysCard'] = rows
        await pg.screenshot(path=SHOTS + 'keys_card.png')
        if rows < 12: fails.append('keys: the Sterowanie card lists the keys: ' + str(rows))
        await pg.evaluate("T.clean()")
    else: fails.append('keys: Menu has Sterowanie with a mouse')
    # Enter lets the wave out (the focus on a tile does not matter)
    await pg.click('#item-spikes'); await pg.keyboard.press('Escape'); await pg.keyboard.press('Enter'); await pg.clock.run_for(200)
    ph = await pg.evaluate("__yatd.fl.phase"); out['enter'] = ph
    if ph != 'raid': fails.append('keys: Enter lets the wave out: ' + str(ph))
    print('== keys', json.dumps(out))
    if errs: fails.append('keys: page errors ' + str(errs[:2]))
    await ctx.close()

async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        if on('layout'): await layout(b, fails)
        if on('mouse'): await mouse(b, fails)
        if on('keys'): await keys(b, fails)
        await b.close()
    print('FAILS', fails)
    sys.exit(1 if fails else 0)
asyncio.run(main())
