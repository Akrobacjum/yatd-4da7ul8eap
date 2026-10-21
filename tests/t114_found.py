# 1.14 (author: the traps you discover stay discovered between runs): an unlock card opens its trap for good; the next run
# starts with it, its card no longer comes up in the shop, a run of an earlier stage still shows only what that stage brings,
# and the run log says what the run started with.
import asyncio, json
from playwright.async_api import async_playwright
BASE = 'file:///tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/test/page15.html'
JS = r'''() => { const G = __yatd, out = {}, fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  localStorage.removeItem('yatd-found');
  while (G.modalKind) G.closeModal(); G.setUser(false); G.newRun(false); while (G.modalKind) G.closeModal();
  out.fire0 = G.run.unlocked.has('fire'); ok(!out.fire0, 'Ogień starts locked');
  G.applyUpgrade(G.UPG['u-fire']);
  out.stored = JSON.parse(localStorage.getItem('yatd-found') || '[]');
  ok(out.stored.includes('fire'), 'the unlock is stored');
  G.newRun(false); while (G.modalKind) G.closeModal();
  out.fire1 = G.run.unlocked.has('fire'); ok(out.fire1, 'the next run starts with Ogień');
  out.found = G.run.foundAtStart; ok((G.run.foundAtStart || []).includes('fire'), 'the run knows what it started with');
  let seen = 0; for (let i = 0; i < 200; i++) if (G.upgradePicks(2).some(u => u.id === 'u-fire')) seen++;
  out.cardSeen = seen; ok(seen === 0, 'its card no longer comes up');
  let other = 0; for (let i = 0; i < 50; i++) if (G.upgradePicks(2).some(u => u.kind === 'unlock')) other++;
  out.otherUnlocks = other; ok(other > 0, 'other unlock cards still come up');
  G.applyUpgrade(G.UPG['u-ghost']);   // Duch comes with stage 2 of the first runs
  G.newRun(true, 1); while (G.modalKind) G.closeModal();
  out.stage1 = [G.run.unlocked.has('ghost'), G.run.unlocked.has('fire')]; ok(!out.stage1[0] && out.stage1[1], 'a stage-1 run shows only what stage 1 brings (Ogień yes, Duch no)');
  G.newRun(false); while (G.modalKind) G.closeModal();
  out.full = G.run.unlocked.has('ghost'); ok(out.full, 'the full game has Duch');
  localStorage.removeItem('yatd-found');
  return { out, fails }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
        await page.clock.install(); await page.goto(BASE); await page.clock.run_for(300)
        r = await page.evaluate(JS); print(json.dumps(r['out'], ensure_ascii=False))
        print('FAILS', r['fails'] + (['page errors %s' % errs[:2]] if errs else []))
        await b.close()
asyncio.run(main())
