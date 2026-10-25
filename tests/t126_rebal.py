# 1.26 "Serce zabiera": the hunger table and the purse (the heart takes from the purse, a crystal only on bankruptcy), the
# Danina and heart levels (deck slots at 2/4/6, Odrost at 3/5/7 when a crystal is missing, the Dar serca row), Ofiara, the
# monsters' revival (+1 hunger each), statuses and a reaction, the new classes (from wave 4/6, a cultist only with Pielgrzymka),
# traits and phobias, omens (waves 3/6/8, never twice, none in the guided run, the wave-3 exclusions), the 34 new cards
# (each applies; Kopista and Lustro duszy copy; the multipliers), the UI texts (start screen, hunger card, heart modal, news
# with the omen box, hero card with statuses) and a few full waves with every new element (no page errors).
# Prints FAILS [...] and exits 1 on any.
import asyncio, sys, json, os
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])   # LIB, LIB2, fresh_page, start_full
SHOTS = SC + 'e126/shots/'
os.makedirs(SHOTS, exist_ok=True)

ECON = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(6); const run = G.run;
  // the hunger table (no tutorial, no omen, no demons, nothing revived)
  run.tutorial = false; run.omens = {}; run.revive = null; run.credit = null; run.bloodHunger = null; G.recomputeMods();
  const want = [0, 0, 38, 50, 72, 104, 150, 190, 230, 272, 350];
  const got = [2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => G.hungerParts(n).base);
  out.hunger = got; ok(JSON.stringify(got) === JSON.stringify(want.slice(2)), 'hunger table: ' + JSON.stringify(got));
  ok(Math.abs(G.hungerParts(11).base - Math.round(350 * 1.2)) <= 1, 'wave 11 = x1,2: ' + G.hungerParts(11).base);
  // a revived monster: +1 hunger each
  run.revive = { w: run.wave, n: 3 }; const hp = G.hungerParts(run.wave); out.revive = hp.revive; ok(hp.revive === 3, 'revive +1 a monster: ' + JSON.stringify(hp));
  run.revive = null;
  // the purse pays the shortfall: no crystal lost
  run.wave = 4; G.startBuild(true); G.fl.essence = 200; run.essence = 200;
  const c0 = run.crystals; G.startWave(); const f = G.fl; const need = G.hungerNeed(run.wave);
  G.alive().forEach(T.tough); f.fed = 0; f.essence = need + 30; G.finishWave();
  const W = run.waves[run.waves.length - 1], H = W.hunger || {};
  out.purse = { need, took: H.tookPurse, bankrupt: H.bankrupt, crystals: run.crystals, c0, ess: Math.round(run.essence) };
  ok(run.crystals === c0, 'the purse covers it: no crystal lost ' + JSON.stringify(out.purse));
  ok(Math.abs((H.tookPurse || 0) - need) < 1.5, 'the heart took the shortfall from the purse ' + JSON.stringify(out.purse));
  // the purse is short: bankruptcy, a crystal, the purse empty before the income
  run.wave = 5; G.startBuild(true); G.startWave(); const f2 = G.fl, need2 = G.hungerNeed(run.wave); G.alive().forEach(T.tough);
  f2.fed = 0; f2.essence = 10; const c1 = run.crystals; G.finishWave();
  const H2 = run.waves[run.waves.length - 1].hunger || {};
  out.bank = { need2, bankrupt: H2.bankrupt, c1, c2: run.crystals, ess: Math.round(run.essence) };
  ok(run.crystals === c1 - 1 && H2.bankrupt, 'bankruptcy breaks a crystal ' + JSON.stringify(out.bank));
  // Danina, levels, deck slots, Odrost
  run.satiety = 0; run.heartLv = 0; run.heartLvMax = 0; run.heartPicks = []; const ds = run.deckSize;
  G.satietyAdd(G.heartLvAt(2) + 1, 'test');
  out.lv = { lv: run.heartLv, picks: run.heartPicks.length, deck: run.deckSize, ds };
  ok(run.heartLv === 2 && run.heartPicks.length === 2, 'two heart levels, two picks waiting ' + JSON.stringify(out.lv));
  ok(run.deckSize === ds + 1, 'level 2 gives a deck slot ' + JSON.stringify(out.lv));
  G.startBuild(true); const hk = G.heartOffer(); out.offer = hk;
  ok(hk && hk.ids.length === 3 && hk.ids.every(id => G.UPG[id] && G.UPG[id].group === 'heart'), 'Dar serca: 3 cards of the Serce group ' + JSON.stringify(hk));
  ok(hk && !hk.ids.includes('regrow'), 'no Odrost at level 1-2');
  // level 3 with a crystal missing: Odrost among them
  run.heartPicks = []; run.crystals = Math.max(1, run.crystals - 1); G.satietyAdd(G.heartLvAt(3) - run.satiety + 1, 'test');
  const hk3 = G.heartOffer(); out.offer3 = hk3; ok(hk3 && hk3.ids.includes('regrow'), 'level 3, a crystal missing: Odrost offered ' + JSON.stringify(hk3));
  if (hk3) { const i = hk3.ids.indexOf('regrow'), cr = run.crystals; G.heartTake(i); ok(run.crystals === cr + 1, 'Odrost gives a crystal back'); }
  // Ofiara: 1:1, at most 40 a break
  G.fl.essence = 100; const s0 = run.satiety; G.ofiara(25); G.ofiara(25);
  out.ofiara = { gained: Math.round(run.satiety - s0), ess: Math.round(G.fl.essence), left: G.ofiaraLeft() };
  ok(Math.round(run.satiety - s0) === 40 && Math.round(G.fl.essence) === 60, 'Ofiara 1:1, at most 40 ' + JSON.stringify(out.ofiara));
  return { fails, out }; }"""

HEROES = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(6); const run = G.run; run.tutorial = false; run.omens = {}; run.omenAlways = true;
  const NEW = ['paladin', 'ranger', 'alchemist'];
  ok(!G.partyPool(3).some(t => NEW.includes(t) || t === 'cultist'), 'waves 1-3: the classic four');
  ok(G.partyPool(4).includes('paladin') && G.partyPool(4).includes('ranger') && !G.partyPool(4).includes('alchemist'), 'wave 4: paladin and ranger');
  ok(G.partyPool(6).includes('alchemist') && !G.partyPool(9).includes('cultist'), 'wave 6: alchemist; never a cultist in the pool');
  const seen = new Set(); let cult = 0, traits = 0, heroes = 0; const tr = new Set(), ph = new Set();
  for (let k = 0; k < 60; k++) { run.omens = {}; run.omens[7] = null; G.makeWave(7).forEach(e => { seen.add(e.type); if (e.type === 'cultist') cult++; heroes++; if (e.trait) { traits++; tr.add(e.trait); } if (e.phobia) ph.add(e.phobia); }); }
  out.seen = [...seen]; out.traitShare = Math.round(100 * traits / heroes); out.traits = [...tr]; out.phobias = [...ph];
  ok(NEW.every(t => seen.has(t)), 'the new classes come by wave 7: ' + out.seen);
  ok(cult === 0, 'no cultist without the omen');
  ok(['superstitious', 'curious', 'loyal', 'hothead'].every(t => tr.has(t)), 'the new traits: ' + out.traits);
  ok(['dead', 'abyss', 'noise', 'swarm'].every(t => ph.has(t)), 'the new phobias: ' + out.phobias);
  ok(out.traitShare >= 48 && out.traitShare <= 72, 'about 60% have a trait: ' + out.traitShare);
  run.omens = { 7: 'pilgrimage' }; const pw = G.makeWave(7); out.pilgr = pw.map(e => e.type);
  ok(pw.filter(e => e.type === 'cultist').length === 2 && !pw[0].boss === !pw.find(e => e.boss), 'Pielgrzymka: 2 cultists ' + out.pilgr);
  // omens: waves 3, 6, 8, never twice; wave 3 without Elita, Saperzy, Pielgrzymka; none in the guided run
  let bad3 = 0, dup = 0;
  for (let k = 0; k < 80; k++) { run.omens = {}; const o3 = G.omenOf(3), o6 = G.omenOf(6), o8 = G.omenOf(8); if (['elite', 'sappers', 'pilgrimage'].includes(o3)) bad3++; if (o3 === o6 || o6 === o8 || o3 === o8 || !o3 || !o6 || !o8) dup++; if (G.omenOf(4) || G.omenOf(5) || G.omenOf(10)) dup++; }
  ok(!bad3, 'wave 3 omen exclusions: ' + bad3); ok(!dup, 'omens on 3/6/8 only, never twice: ' + dup);
  run.omens = {}; run.tutorial = true; ok(G.omenOf(3) === null, 'no omen in the guided run'); run.tutorial = false;
  run.omens = { 6: 'siege' }; const sz = G.makeWave(6).length; run.omens = { 6: null }; const sz0 = G.makeWave(6).length; out.siege = [sz0, sz];
  ok(sz === Math.min(sz0 + 2, 8), 'Oblężenie: +2 heroes ' + out.siege);
  run.omens = { 6: 'sappers' }; ok(G.makeWave(6).filter(e => e.type === 'thief' || e.type === 'ranger').length >= 2, 'Saperzy: thief and ranger');
  run.omens = { 6: 'inquisition' }; const iq = G.makeWave(6).map(e => e.type); ok(iq.includes('priest') && iq.includes('paladin'), 'Inkwizycja: priest and paladin ' + iq);
  run.omens = { 6: 'warfog' }; ok(G.makeWave(6).every(e => e.fog), 'Mgła wojny: the preview is hidden');
  return { fails, out }; }"""

CARDS = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(6);
  const NEWC = ['tithe', 'stoneheart', 'bloodcredit', 'glutton', 'bloodflow', 'kingsfeast', 'lastbreath', 'heartpulse', 'fearcrown', 'bloodbath', 'lonewolf', 'palette', 'minimalist', 'cursedcrown',
    'skulls', 'execdiary', 'risinglegend', 'pantry', 'copyist', 'soulmirror', 'doubleedge', 'sharedmech', 'chainreact', 'heartecho', 'tarsulfur', 'conduct', 'toxicfume', 'plague', 'hellpack',
    'bonesunbroken', 'undyingarmy', 'abysspact', 'goldendream', 'croesus'];
  const missing = NEWC.filter(id => !G.UPG[id]); ok(!missing.length, 'all 34 new cards exist: missing ' + missing);
  const base = JSON.stringify(G.buildMods ? (T.deck([]), G.mods) : {});
  const noEffect = NEWC.filter(id => { if (id === 'copyist' || id === 'soulmirror') return false; T.deck([id]); return JSON.stringify(G.mods) === base; });
  ok(!noEffect.length, 'every new card changes the mods: ' + noEffect);
  T.deck(['copyist', 'echo']); const k2 = G.mods.scareMult; T.deck(['echo']); const k1 = G.mods.scareMult;
  out.copy = [k1, k2]; ok(Math.abs(k2 - k1 * k1) < 1e-9, 'Kopista copies the card to its right ' + out.copy);
  T.deck(['echo', 'soulmirror']); ok(Math.abs(G.mods.scareMult - k1 * k1) < 1e-9, 'Lustro duszy copies the first card');
  T.deck(['copyist', 'arrows']); ok(G.copyTarget('copyist') === null, 'Kopista skips a unique card');
  T.deck(['cursedcrown']); G.startWave(); out.crown = G.essMultNow(); ok(Math.abs(out.crown - 1.35) < 1e-9, 'Przeklęta korona x1,35: ' + out.crown);
  return { fails, out }; }"""

STATUS = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  T.fresh(6); const f = T.raid(['warrior', 'thief']); const h = G.alive()[0];
  G.setStatus(h, 'oiled', 8, 'test'); ok(G.statusOn(h, 'oiled'), 'oiled on');
  const r0 = f.stats.reactN || 0; G.damage(h, 10, { type: 'fire' }); out.react = (f.stats.reactN || 0) - r0;
  ok(out.react === 1 && !G.statusOn(h, 'oiled'), 'olej + ogień = Pożar, the oil is gone ' + out.react);
  G.setStatus(h, 'root', 20, 'test'); out.root = G.statusList(h); ok(G.rooted(h), 'rooted');
  // a monster knocked down stays (down) and stands again in the next build; the heart wants +1 for it
  const R = T.rooms()[0], sp = T.floorSpots(R, 'goblin')[0]; const m = T.place('goblin', sp); ok(!!m, 'a goblin placed');
  if (m) { G.hurtMonster(m, 1e6, h); out.down = { down: !!m.down, inMap: G.fl.items.has(m.x + ',' + m.y) }; ok(m.down && out.down.inMap, 'a knocked-down goblin stays in the map ' + JSON.stringify(out.down)); }
  return { fails, out }; }"""

async def ui(b, fails):
    ctx, pg, errs = await fresh_page(b, 390, 844)
    t = await pg.evaluate("document.querySelector('#card').innerText")
    if 'Prototype 1.2' not in t: fails.append('start screen: Prototype 1.2x')
    await pg.evaluate("document.querySelector('#start-new').open = true; document.querySelector('#start-how').open = true; document.querySelectorAll('#start-new details').forEach(d => d.open = true)")
    t = await pg.evaluate("document.querySelector('#card').innerText")
    for w in ['serce zabiera', 'Dary serca są kartami', 'omeny', 'paladyn', 'Runa rodu', 'reakcj']:
        if w.lower() not in t.lower(): fails.append('start screen mentions ' + w)
    await pg.screenshot(path=SHOTS + 'start.png', full_page=True)
    await start_full(pg)
    # the hunger card
    await pg.evaluate("__yatd.openModal({ type: 'hungerTip' })"); await pg.clock.run_for(100)
    t = await pg.evaluate("document.querySelector('#card').innerText")
    if 'sakiewki' not in t: fails.append('hunger card explains the purse (1.27 review: the Danina is told by the heart card): ' + t[:120])
    await pg.screenshot(path=SHOTS + 'hunger_card.png')
    await pg.evaluate("T.clean()")
    # the heart modal
    await pg.evaluate("document.querySelector('#h-hrow').click()"); await pg.clock.run_for(100)
    k = await pg.evaluate("__yatd.modalKind"); t = await pg.evaluate("document.querySelector('#card').innerText")
    if k != 'heart' or 'Nasycen' not in t: fails.append('the heart row opens the heart card: ' + str(k))
    await pg.screenshot(path=SHOTS + 'heart_modal.png')
    await pg.evaluate("T.clean()")
    # news with an omen
    await pg.evaluate("(() => { const G = __yatd; G.run.omens[G.run.wave] = 'bloodmoon'; G.run.next = G.makeWave(G.run.wave); G.openModal({ type: 'news', omen: true }); })()"); await pg.clock.run_for(100)
    n = await pg.evaluate("({ box: !!document.querySelector('#card .omenbox'), img: !!document.querySelector('#card .omenbox img'), txt: document.querySelector('#card').innerText.slice(0, 300) })")
    print('== news', json.dumps(n))
    if not n['box'] or 'Krwawy' not in n['txt']: fails.append('news shows the omen box: ' + json.dumps(n))
    await pg.screenshot(path=SHOTS + 'news_omen.png')
    await pg.evaluate("T.clean()")
    # warfog preview in the build (canvas) does not crash; then a wave with statuses: the hero card lists them
    await pg.evaluate("(() => { const G = __yatd; G.run.omens[G.run.wave] = 'warfog'; G.run.next = G.makeWave(G.run.wave); })()"); await pg.clock.run_for(300)
    await pg.screenshot(path=SHOTS + 'warfog_build.png')
    await pg.evaluate("(() => { const G = __yatd; G.run.omens[G.run.wave] = null; G.run.next = G.makeWave(G.run.wave); G.startWave(); })()"); await pg.clock.run_for(200)
    await pg.evaluate("(() => { const G = __yatd; for (let i = 0; i < 400 && G.fl.queue.length; i++) G.step(0.05); const h = G.alive()[0]; G.setStatus(h, 'bleed', 6, 'test'); G.setStatus(h, 'wet', 6, 'test'); G.openModal({ type: 'hero', id: h.id }); })()"); await pg.clock.run_for(100)
    t = await pg.evaluate("document.querySelector('#card').innerText")
    if 'Statusy:' not in t or 'Krwawiący' not in t: fails.append('hero card lists statuses: ' + t[:200])
    await pg.screenshot(path=SHOTS + 'hero_status.png')
    if errs: fails.append('ui: page errors ' + str(errs[:3]))
    await ctx.close()

async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, code in [('econ', ECON), ('heroes', HEROES), ('cards', CARDS), ('status', STATUS)]:
            ctx, pg, errs = await fresh_page(b, 390, 844)
            try:
                r = await pg.evaluate(code); fails += [name + ': ' + f for f in r['fails']]; print('==', name, json.dumps(r['out'])[:900])
            except Exception as e: fails.append(name + ': ' + str(e)[:300])
            if errs: fails.append(name + ': page errors ' + str(errs[:3]))
            await ctx.close()
        try: await ui(b, fails)
        except Exception as e: fails.append('ui: ' + str(e)[:300])
        await b.close()
    print('FAILS', fails)
    sys.exit(1 if fails else 0)
asyncio.run(main())
