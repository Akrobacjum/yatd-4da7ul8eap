# 1.27.5 "Serce hamuje" (the brief's tests 1-6): A at most 1 heart level a wave cycle (the rest waits for the next build, one
# shop window, Ofiara after a level gives none); B Heart's Gift cards take no deck slots (deckFull counts the ordinary cards, a
# gift never goes to the stash, levels add no slots, Kopista copies no gift, Rezonans counts the ordinary cards); C Serce lochu,
# Rezonans, Głodomór out of the Gift (in the shop), Żarłoczne serce once a run; D the Release button shows hunger and reserve
# (red only at risk and under 20%); E every Gift pick logged, the new wave-log fields. Prints FAILS [...] and exits 1 on any.
import asyncio, sys, json
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
exec(open(SC + 'test/t124b_ui.py').read().split('# ---------- 1. no frame')[0])
RUN = r"""() => { const { G } = T, fails = [], out = {}; const ok = (c, m) => { if (!c) fails.push(m); };
  const closeAll = () => { let n = 0; while (G.modalKind && n++ < 20) G.closeModal(); };
  T.fresh(4); let run = G.run; run.tutorial = false; run.omens = {};
  // ---------- A: one level a cycle
  run.satiety = 0; run.heartLv = 0; run.heartLvMax = 0; run.heartPicks = []; run.heartUpWave = null; const ds = run.deckSize;
  let f = T.raid(['warrior']);
  const u1 = G.satietyAdd(G.heartLvAt(3) + 5, 'test'), u2 = G.satietyAdd(50, 'test');
  out.A1 = { u1, u2, lv: run.heartLv, picks: run.heartPicks.length, blocked: G.heartUpBlocked(), st: f.stats.heartUpBlocked, up: f.stats.heartUp };
  ok(u1 === 1 && u2 === 0 && run.heartLv === 1 && run.heartPicks.length === 1, 'A: a big satietyAdd in a wave = +1 level, a second one 0 ' + JSON.stringify(out.A1));
  ok(G.heartUpBlocked() && f.stats.heartUpBlocked === 1 && f.stats.heartUp === 1, 'A: the block is seen and counted ' + JSON.stringify(out.A1));
  // the next cycle: startBuild gives the waiting level, the build's shop is the only window
  closeAll(); run.wave++; G.startBuild(); const kinds = [];
  G.queueModal({ type: 'shop', between: true });
  for (let n = 0; G.modalKind && n < 20; n++) { kinds.push(G.modalKind); G.closeModal(); }
  out.A2 = { lv: run.heartLv, picks: run.heartPicks.length, kinds, up: G.fl.stats.heartUp };
  ok(run.heartLv === 2 && run.heartPicks.length === 2, 'A: the next build gives the waiting level ' + JSON.stringify(out.A2));
  ok(kinds.filter(k => k === 'shop').length === 1, 'A: one shop window, not two ' + JSON.stringify(out.A2));
  ok(G.heartUpBlocked(), 'A: still over the next threshold: waits again');
  // the Gift row shows in that shop
  G.openModal({ type: 'shop', between: true }); out.A3 = !!document.querySelector('#heart-head') && !!document.querySelector('#heart-offer-0'); ok(out.A3, 'A: the Gift row in the shop'); closeAll();
  // Ofiara after this cycle's level: Satiety grows, no level, no window
  run.satiety = G.heartLvAt(3) - 10; G.fl.essence = 100; const lvO = run.heartLv; G.ofiara(25);
  out.A4 = { lv: run.heartLv, lvO, sat: Math.round(run.satiety), modal: G.modalKind }; ok(run.heartLv === lvO && !G.modalKind && run.satiety >= G.heartLvAt(3), 'A: Ofiara after a level: no level until the next build ' + JSON.stringify(out.A4));
  // a fresh cycle: Ofiara over a threshold gives the level and its window at once
  run.wave++; run.heartUpWave = null; G.ofiara(1); out.A5 = { lv: run.heartLv, modal: G.modalKind }; ok(run.heartLv === lvO + 1 && G.modalKind === 'shop', 'A: Ofiara in a fresh cycle: a level and the Gift window ' + JSON.stringify(out.A5)); closeAll();
  // ---------- B: gift cards take no slots
  T.fresh(5); run = G.run; run.tutorial = false; run.deckSize = 7;
  const ord = ['cooldown', 'sharp', 'heavy', 'copyist', 'resonance', 'heartcore', 'glutton'], gifts = ['heartguide', 'heartdread', 'heartgreed'];
  run.deck = ord.concat(gifts); G.recomputeMods();
  out.B1 = { used: G.deckUsed(), full: G.deckFull() }; ok(G.deckUsed() === 7 && G.deckFull(), 'B: 7 ordinary + 3 gifts at 7 slots: full ' + JSON.stringify(out.B1));
  run.deck = ord.slice(0, 6).concat(gifts); ok(!G.deckFull() && G.deckUsed() === 6, 'B: 6 ordinary + 3 gifts: not full');
  // heartTake with the ordinary slots full: the gift goes to the deck
  run.deck = ord.concat(gifts.slice(0, 1)); run.stash = []; run.heartPicks = [{ lv: 2, ids: ['heartpatience', 'heartgrowth', 'secondheart'], regrow: false }];
  const r1 = G.heartTake(0); out.B2 = { r1, deck: run.deck.slice(-2), stash: run.stash.slice() };
  ok(r1 === 'ok' && run.deck.includes('heartpatience') && !run.stash.includes('heartpatience'), 'B: a gift with the deck full goes to the deck ' + JSON.stringify(out.B2));
  ok(run.deck[run.deck.length - 1] === 'heartpatience', 'B: gifts at the end of the deck');
  // an ordinary card goes before the gifts
  run.deck = ord.slice(0, 5).concat(gifts); G.deckAdd('sharp2' in G.UPG ? 'sharp2' : 'cooldown'); out.B3 = run.deck.slice(); ok(run.deck.slice(-3).join() === gifts.join(), 'B: an ordinary card goes in before the gifts ' + JSON.stringify(out.B3));
  // gift cards never go to the stash
  run.deck = ord.slice(0, 5).concat(gifts); run.stash = []; const ts = G.toStash(run.deck.length - 1); ok(!run.stash.length && run.deck.length === 8, 'B: a gift will not go to the stash ' + JSON.stringify(ts));
  // levels 2, 4, 6: no slots
  run.satiety = 0; run.heartLv = 0; run.heartPicks = []; run.heartUpWave = null; const ds2 = run.deckSize;
  for (let i = 0; i < 6; i++) { run.wave++; run.heartUpWave = null; G.satietyAdd(G.heartLvAt(run.heartLv + 1) - run.satiety + 1, 'test'); }
  out.B4 = { lv: run.heartLv, ds: run.deckSize, ds2 }; ok(run.heartLv === 6 && run.deckSize === ds2, 'B: 6 levels, the deck size the same ' + JSON.stringify(out.B4));
  // Kopista before a gift copies nothing; Rezonans counts ordinary cards
  run.deck = ['cooldown', 'copyist', 'heartguide']; G.recomputeMods(); out.B5 = G.copyTarget('copyist'); ok(out.B5 === null && !G.copyOk(G.UPG.heartguide), 'B: Kopista copies no gift ' + out.B5);
  run.deck = ['cooldown', 'copyist', 'sharp']; ok(G.copyTarget('copyist') === 'sharp', 'B: Kopista still copies an ordinary card');
  run.deck = []; G.recomputeMods(); const e0 = G.essMultNow();
  run.deck = ['resonance', 'cooldown', 'sharp', 'heartguide', 'heartdread', 'heartgreed']; G.recomputeMods(); const e1 = G.essMultNow();
  out.B6 = Math.round(e1 / e0 * 1000) / 1000; ok(Math.abs(e1 / e0 - 1.09) < 0.005, 'B: Rezonans + 2 ordinary + 3 gifts = +9% ' + out.B6);
  // ---------- C: the pool of the Gift
  run.deck = []; run.stash = []; run.heartCards = []; run.crystals = run.maxCrystals; G.recomputeMods();
  const bad = new Set(), seen = {};
  for (let i = 0; i < 200; i++) { run.heartPicks = [{ lv: 2 }]; const hk = G.heartOffer(); (hk ? hk.ids : []).forEach(id => { seen[id] = (seen[id] || 0) + 1; if (['heartcore', 'resonance', 'glutton'].includes(id)) bad.add(id); }); }
  out.C1 = { bad: [...bad], crystal: seen.crystal || 0 }; ok(!bad.size, 'C: 200 Gift offers without the three ' + JSON.stringify(out.C1)); ok(seen.crystal > 0, 'C: Żarłoczne serce can be offered');
  const inShop = new Set(); for (let i = 0; i < 400; i++) G.upgradePicks(3).forEach(u => { const id = typeof u === 'string' ? u : u.id; if (['heartcore', 'resonance', 'glutton'].includes(id)) inShop.add(id); });
  out.C2 = [...inShop]; ok(inShop.size === 3, 'C: the shop with a forced legend shows the three ' + JSON.stringify(out.C2));
  run.deck = ['heartcore']; let again = 0; for (let i = 0; i < 300; i++) G.upgradePicks(3).forEach(u => { if ((u.id || u) === 'heartcore') again++; }); ok(!again, 'C: unique: not offered while owned');
  run.deck = []; run.heartCards = ['crystal']; let cr = 0;
  for (let i = 0; i < 200; i++) { run.heartPicks = [{ lv: 2 }]; const hk = G.heartOffer(); if (hk && hk.ids.includes('crystal')) cr++; }
  ok(cr === 0, 'C: Żarłoczne serce once a run (' + cr + ' after taking it)');
  run.heartPicks = [];
  // ---------- D: the Release button
  T.fresh(4); run = G.run; run.wave = 1; run.tut = -1; G.updateAction(); const sm1 = document.querySelector('#btn-action small'); out.D1 = sm1 ? sm1.textContent : '';
  ok(!/głód|hunger/.test(out.D1), 'D: wave 1 as before: ' + out.D1);
  T.fresh(3); run = G.run; run.tutorial = false; run.tut = -1; G.fl.essence = 0; G.updateAction();
  const need = G.hungerNeed(run.wave), sm = document.querySelector('#btn-action small');
  out.D2 = { text: sm && sm.textContent, low: sm && sm.classList.contains('low'), need, risk: G.hungerRisk() };
  ok(sm && new RegExp('(głód|hunger) ' + need + ' · (zapas|reserve) 0').test(sm.textContent), 'D: hunger and reserve: ' + JSON.stringify(out.D2));
  ok(need > 0 && G.hungerRisk() > 0 && sm.classList.contains('low'), 'D: red at risk with no reserve ' + JSON.stringify(out.D2));
  G.fl.essence = Math.ceil(need * 0.25); G.updateAction(); const sm2 = document.querySelector('#btn-action small'); out.D3 = { low: sm2.classList.contains('low'), ess: G.fl.essence, risk: G.hungerRisk() };
  ok(!sm2.classList.contains('low'), 'D: not red over 20% ' + JSON.stringify(out.D3));
  G.fl.essence = need + 5; G.updateAction(); ok(!document.querySelector('#btn-action small').classList.contains('low') && !G.hungerRisk(), 'D: not red with no risk');
  G.fl.essence = 0; G.startWave(); out.D4 = { at: G.fl.reserveAtGo, warn: G.fl.reserveWarn }; ok(G.fl.reserveAtGo === 0 && G.fl.reserveWarn, 'D/E: startWave keeps the reserve and the warning ' + JSON.stringify(out.D4));
  // ---------- E: telemetry
  T.fresh(4); run = G.run; run.tutorial = false; run.stash = []; run.heartCards = []; G.fl.heartPicksLog = [];
  run.heartPicks = [{ lv: 1 }, { lv: 2 }, { lv: 3 }]; for (let i = 0; i < 3; i++) { const hk = G.heartOffer(); G.heartTake(hk.ids.indexOf('regrow') === 0 ? 1 : 0); }
  out.E1 = G.fl.heartPicksLog.map(p => [p.lv, p.took, p.offer.length, p.phase]); ok(G.fl.heartPicksLog.length === 3 && G.fl.heartPicksLog.every(p => p.lv && p.took && p.offer.length && p.phase === 'build'), 'E: three Gifts = three entries ' + JSON.stringify(out.E1));
  const log0 = G.fl.heartPicksLog.slice(); G.startWave(); G.fl.heartPicksLog = log0; G.alive().forEach(T.tough); G.finishWave();
  const W = run.waves[run.waves.length - 1]; out.E2 = { heartPicks: (W.heartPicks || []).length, keys: ['heartUpBlocked', 'satietyOver', 'deckUsed', 'giftCards', 'reserveAtGo', 'reserveWarn'].filter(k => !(k in W)) };
  ok(W.heartPicks && W.heartPicks.length === 3, 'E: heartPicks in the wave log ' + JSON.stringify(out.E2)); ok(!out.E2.keys.length, 'E: the new fields ' + JSON.stringify(out.E2));
  ok(W.giftCards === run.deck.filter(G.isGift).length && W.deckUsed === G.deckUsed(), 'E: the deck counts');
  ok(G.LOG_VERSION === undefined || G.LOG_VERSION === 63, 'LOG_VERSION 63');
  return { fails, out }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); fails = []
        ctx, pg, errs = await fresh_page(b)
        r = await pg.evaluate(RUN); print(json.dumps(r['out'], ensure_ascii=False)); fails += r['fails']
        fails += ['page error: ' + e for e in errs]
        await ctx.close(); await b.close()
        print('FAILS', fails); sys.exit(1 if fails else 0)
asyncio.run(main())
