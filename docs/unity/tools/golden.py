import asyncio, json, os, sys
# Wartości wzorcowe z działającego prototypu (sekcja 09). Użycie z katalogu repo po python3 build.py: python3 docs/unity/tools/golden.py [dist/artifact.html] [docs/unity/data/golden.json]
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        await page.clock.install(); await page.goto('file://' + os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/artifact.html')); await page.clock.run_for(400)
        r = await page.evaluate('''() => { const G = __yatd; while (G.modalKind) G.closeModal(); G.newRun(false); while (G.modalKind) G.closeModal();
          const out = { note: 'Prototype 1.13.1, newRun(false) (pełna gra), domyślne ustawienia i mods; liczone przez __yatd w przeglądarce', waves: [], greedCurve: [], comboHp: [], prices: {}, mods: G.mods, S: G.S };
          for (let n = 1; n <= 20; n++) out.waves.push({ n, partySize: G.partySize(n), waveSize: G.waveSize(n), waveCurve: +G.waveCurve(n).toFixed(4), waveBase: +G.waveBase(n).toFixed(4), hungerNeed: G.hungerNeed(n), comboHp: G.comboHp(n) });
          for (const raw of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 8, 12, 23]) out.greedCurve.push({ raw, greed: +G.greedCurve(raw).toFixed(4) });
          ['c', 'r', 'l'].forEach(r => { const u = G.UPGRADES.find(x => x.rar === r && x.kind === 'card'); out.prices[r] = G.priceOf(u); });
          out.prices.unlock = G.priceOf(G.UPGRADES.find(x => x.kind === 'unlock'));
          out.rerollCost0 = G.rerollCost(); out.stashCap = G.stashCap();
          out.toolCosts = {}; ['dig', 'tunnel', 'expand', 'demolish', 'r_fog'].forEach(t => { const ms = G.toolMarkers(t); out.toolCosts[t] = ms.slice(0, 3).map(m => G.toolCost(t, m)); });
          out.crystals = G.run.crystals; out.essenceStart = G.run.essence; out.deckSize = G.run.deckSize;
          return out; }''')
        json.dump(r, open(sys.argv[2] if len(sys.argv) > 2 else 'docs/unity/data/golden.json', 'w'), ensure_ascii=False, indent=1)
        print(json.dumps(r['waves'][:12]), r['greedCurve'], r['prices'], r['toolCosts'], r['crystals'], r['essenceStart'])
        await b.close()
asyncio.run(main())
