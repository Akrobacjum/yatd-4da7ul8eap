  const LOCK = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
  let tab = 'traps';
  try { tab = localStorage.getItem('yatd-tab') || 'traps'; } catch (e) {}
  if (!TABS.some(t => t.id === tab)) tab = 'traps';
  // Small preferences of this browser: which panels are open, and the speed button.
  const UI = (() => { const d = { hintOpen: false, trayBuild: true, listOpen: false, speed: 1 }; try { return Object.assign(d, JSON.parse(localStorage.getItem('yatd12-ui') || '{}')); } catch (e) { return d; } })();
  function saveUI() { try { localStorage.setItem('yatd12-ui', JSON.stringify(UI)); } catch (e) {} }
  // 1.03: every further loot of the same kind already lying in the dungeon makes the next one 25% dearer (author's run: 223
  // Relikwie at 10 each). Loot the heroes dropped does not count; what you paid comes back when you take it off.
  const LOOT_STEP = 1.15;   // 1.26: 1,25 -> 1,15 (greed builds were the weakest)
  const lootCount = t => { let n = 0; if (fl) fl.items.forEach(it => { if (it.type === t && !it.dropped) n++; }); return n; };
  const costOf = t => MODES[t] ? 0 : TOOLS[t] ? toolCost(t) : BUILDINGS[t] ? Math.ceil(ITEMS[t].cost * mods.buildingCost) : LOOT_KIND[t] ? Math.ceil(ITEMS[t].cost * Math.pow(LOOT_STEP, lootCount(t)) - 1e-9) : ITEMS[t].cost;
  const upgCost = it => Math.ceil(ITEMS[it.type].cost * UPG_COST[(it.lvl || 1) + 1] * (1 - (mods.upgDisc || 0)));   // 1.26 Kuźnia ciemności
  // v14.1: the tray is one row scrolled sideways; each tab remembers where it was scrolled to
  const trayScroll = {}; let trayTab = null;
  // 1.15: a komnata opens once one of its family is unlocked (nothing to make better before that)
  const isOpenT = t => !!run && run.unlocked.has(t) && (!KINDS[t] || KIND_INFO[KINDS[t]].items.some(x => run.unlocked.has(x)));
  // 1.14 (author: subcategories in the build bar, side by side like the tabs): the sub of each tab with subs (TABS[].subs),
  // remembered in this browser; a row of sub-tabs under the tabs shows only when at least two of the tab's subs have something
  // this stage brings (else all of the tab, as before). The row keeps its height on every tab, so the map does not jump.
  let subOf = {};
  try { subOf = JSON.parse(localStorage.getItem('yatd-sub') || '{}') || {}; } catch (e) {}
  const subsOn = tb => (tb.subs || []).filter(s => s.items.some(t => onbOk(t)));
  // 1.15.1 (author: the sub-tabs did not show in the first run, so there was nothing to switch): a tab with sub-tabs always shows
  // them; one with nothing of this stage of learning yet is dimmed with a lock and says in which run it comes (subStage)
  const curSub = tb => { const on = subsOn(tb); return !on.length ? null : on.find(s => s.id === subOf[tb.id]) || on[0]; };
  const subStage = s => Math.min(...s.items.map(t => ONB_ITEM[t] || 1));
  const subWhen = s => run && run.onbW ? L('od fali ' + ONB_WAVE[subStage(s)], 'from wave ' + ONB_WAVE[subStage(s)]) : L('od ' + subStage(s) + '. runu', 'from run ' + subStage(s));   // 1.24 (B): the first run opens it with a wave
  function pickTab(id, t) {   // to a tab, and to the sub that holds t (the guide points at a tile)
    tab = id; const tb = TABS.find(x => x.id === id), s = tb && t && (tb.subs || []).find(x => x.items.includes(t));
    if (s) subOf[id] = s.id; updateTray();
  }
  function trayFade() { const t = $('#tray'); t.classList.toggle('fade-l', t.scrollLeft > 4); t.classList.toggle('fade-r', t.scrollLeft + t.clientWidth < t.scrollWidth - 4); }
  function updateTray() {
    const tray = $('#tray'), tabs = $('#tabs');
    if (!tray.dataset.scrollHook) { tray.dataset.scrollHook = '1'; tray.addEventListener('scroll', () => { if (trayTab) trayScroll[trayTab] = tray.scrollLeft; trayFade(); }, { passive: true }); }
    if (!tabs.children.length) {
      TABS.forEach(tb => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tab'; b.id = 'tab-' + tb.id; b.setAttribute('role', 'tab'); b.textContent = tb.label;
        b.addEventListener('click', () => {
          if (b.classList.contains('off')) { nope(b, ''); note(tb.label + ': ' + subWhen(tb) + '.'); return; }   // 1.27.1: a tab of a later stage stays in its place, locked
          if (trayTab) trayScroll[trayTab] = tray.scrollLeft; tab = tb.id; try { localStorage.setItem('yatd-tab', tab); } catch (e) {} updateTray();
          if (tb.id === 'dungeon' && run) { const fl2 = Object.keys(FAMILIES).filter(f => run.famLv && run.famLv[f]); setHint(L('Loch: kopanie, przejścia, komnaty i klimat pokoi. Rodziny: ', 'Dungeon: digging, passages, lairs and room moods. Families: ') + (fl2.length ? fl2.map(f => FAMILIES[f].name + ' ' + run.famLv[f]).join(', ') : L('żadna nie ma jeszcze poziomu', 'none has a level yet')) + '.'); }   // 1.26
          if (tb.id === 'deck' && run) setHint(L('Talia: ' + deckUsed() + ' z ' + run.deckSize + ' kart. Stuknij kartę, żeby ją przeczytać albo sprzedać (sprzedajesz tylko między falami).', 'Deck: ' + deckUsed() + ' of ' + run.deckSize + ' cards. Tap a card to read or sell it (selling only between waves).'));
        });
        tabs.appendChild(b);
      });
      ITEM_ORDER.forEach(t => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'item' + (TOOLS[t] ? ' tool' : ''); b.id = 'item-' + t;
        if (ART.has(t)) { b.classList.add('art'); b.innerHTML = '<span class="scene"><img alt="" draggable="false"><span class="cost"></span></span><span class="nm"></span><span class="sl"></span>'; }   // 1.26: a painted scene (its picture comes when the tile is first shown)
        else b.innerHTML = '<span class="top">' + (ICONS[t] || genIcon(t)) + '<span class="cost"></span></span><span class="nm"></span><span class="sl"></span>';
        b.querySelector('.nm').textContent = ITEMS[t].name;
        { const tn = ART.tintOf && ART.tintOf(t); if (tn) { b.style.setProperty('--fam', tn[1]); b.classList.add('fam'); } }   // 1.27.1: the family colour on the tile
        if (ITEMS[t].name.length >= 9) b.classList.add('longnm');
        b.querySelector('.sl').textContent = ITEMS[t].tag;
        if (LOOT_COLOR[t]) b.querySelector('.sl').style.color = LOOT_COLOR[t];
        else if (ROOMTYPES[t]) b.querySelector('.sl').style.color = RT_INFO[ROOMTYPES[t]].color;
        else if (KINDS[t]) b.querySelector('.sl').style.color = KIND_INFO[KINDS[t]].color;   // 1.15
        b.addEventListener('pointerdown', e => {   // Prototype 1.0: hold a tile to read what it does
          if (e.button > 0) return;
          hideTip(); tipEat = false; tipAt = [e.clientX, e.clientY];
          tipTimer = setTimeout(() => { tipTimer = 0; tipEat = true; showTip(t, b); }, 380);
        });
        b.addEventListener('pointermove', e => { if (tipTimer && e.buttons && Math.hypot(e.clientX - tipAt[0], e.clientY - tipAt[1]) > 10) { clearTimeout(tipTimer); tipTimer = 0; } });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, e => { if (ev === 'pointerup' && e.button === 2) return; if (tipTimer || tipFor) hideTip(); }));
        // 1.25: with a mouse the tip comes when the pointer rests on the tile, and a right click shows it at once
        b.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse' || e.buttons) return; clearTimeout(tipTimer); tipAt = [e.clientX, e.clientY]; tipTimer = setTimeout(() => { tipTimer = 0; if (b.matches(':hover')) showTip(t, b, 'hover'); }, 420); });
        b.addEventListener('contextmenu', e => { e.preventDefault(); if (tipFor === t || (e.pointerType && e.pointerType !== 'mouse')) return; clearTimeout(tipTimer); tipTimer = 0; showTip(t, b, 'hover'); });   // 1.27.2: a phone's long press also fires contextmenu: the tip played its animation twice
        b.addEventListener('click', () => {
          if (tipEat) { tipEat = false; return; }   // the end of a hold is not a tap
          if (!fl || !run || (fl.phase !== 'build' && fl.phase !== 'raid')) return;
          if (MODES[t]) {
            if (fl.phase !== 'build') { nope(b, L('między falami', 'between waves')); return; }
            selected = selected === t ? null : t; movingKey = null; movingObj = null; updateTray();
            if (selected) setHint(ITEMS[t].desc);   // a mode: how to use it
            return;
          }
          if (!isOpenT(t)) { nope(b, KINDS[t] && run.unlocked.has(t) ? L('brak rodziny', 'no family yet') : L('zablokowane', 'locked')); return; }
          if ((TOOLS[t] || ITEMS[t].build) && fl.phase !== 'build') { nope(b, L('między falami', 'between waves')); return; }
          if (fl.essence < costOf(t)) { nope(b, L('za mało Esencji', 'need Essence')); return; }
          selected = selected === t ? null : t; movingKey = null; movingObj = null;   // choosing from the tray puts down what was in hand
          updateTray();
          // 1.05 (a tester paid 256 for one more slot in a room he had expanded ten times; a new room cost about 8): say the prices side by side
          if (selected === 'expand') {
            const ms = toolMarkers('expand'), lo = ms.length ? Math.min(...ms.map(m => toolCost('expand', m))) : null, dg = toolMarkers('dig').length ? toolCost('dig', null) : null;
            setHint(L('Rozbuduj: każda kolejna rozbudowa tego samego miejsca kosztuje 2 razy tyle. Cena stoi nad każdym miejscem' + (lo !== null ? ', najtaniej ' + lo : '') + '.' + (dg !== null ? ' Nowy pokój (zakładka Loch): ' + dg + '.' : ''),
              'Expand: each further expansion of the same spot costs twice as much. The price shows above each spot' + (lo !== null ? ', cheapest ' + lo : '') + '.' + (dg !== null ? ' A new room (Dungeon tab): ' + dg + '.' : '')));
          } else if (selected && (UI.holdTips || 0) < 3) { UI.holdTips = (UI.holdTips || 0) + 1; saveUI(); setHint(PC() ? L('Najedź myszką na kafelek (albo kliknij go prawym przyciskiem), żeby przeczytać, co robi.', 'Hover over a tile (or right-click it) to read what it does.') : L('Przytrzymaj kafelek w pasku, żeby przeczytać, co robi.', 'Hold a tile in the bar to read what it does.')); }
        });
        tray.appendChild(b);
      });
    }
    // 1.12: what a later run brings is not in the tray at all (a tab with nothing in it yet is gone too)
    const tabOn = tb => !tb.items.length || tb.items.some(t => onbOk(t));
    if (!tabOn(TABS.find(tb => tb.id === tab) || TABS[0])) tab = 'traps';
    const cur = TABS.find(tb => tb.id === tab) || TABS[0];
    // 1.27.1 (author: in the tutorial the Obiekty tab vanished): a tab with nothing of this stage yet stays, dimmed with a lock, like the sub-tabs
    TABS.forEach(tb => { const tbb = $('#tab-' + tb.id), on = tabOn(tb); tbb.hidden = false; tbb.classList.toggle('off', !on); tbb.setAttribute('aria-disabled', String(!on)); tbb.title = on ? '' : tb.label + ': ' + subWhen(tb); tbb.setAttribute('aria-selected', String(tb === cur)); });
    const cs = curSub(cur), sb = $('#subs'), view = cur.id + (cs ? '/' + cs.id : '');
    sb.classList.toggle('none', !cs);
    if (cs && sb.dataset.tab !== cur.id) {
      sb.dataset.tab = cur.id; sb.innerHTML = '';
      cur.subs.forEach(s => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sub'; b.id = 'sub-' + s.id; b.dataset.sub = s.id; b.innerHTML = '<span class="sl"></span>' + LOCK; b.querySelector('.sl').textContent = s.label;
        b.addEventListener('click', () => {
          if (b.classList.contains('off')) { nope(b, s.label + ': ' + subWhen(s)); return; }   // 1.15.1: not in this stage yet (1.24 B: a wave of the first run)
          if (trayTab) trayScroll[trayTab] = tray.scrollLeft;
          subOf[cur.id] = s.id; try { localStorage.setItem('yatd-sub', JSON.stringify(subOf)); } catch (e) {}
          updateTray();
        });
        sb.appendChild(b);
      });
    }
    if (cs) sb.querySelectorAll('.sub').forEach(b => { const s = cur.subs.find(q => q.id === b.dataset.sub), on = subsOn(cur).includes(s); b.hidden = false; b.classList.toggle('off', !on); b.setAttribute('aria-disabled', String(!on)); b.title = on ? '' : s.label + ': ' + subWhen(s); b.setAttribute('aria-pressed', String(b.dataset.sub === cs.id)); });
    let shown = 0;
    ITEM_ORDER.forEach(t => {
      const b = $('#item-' + t);
      b.hidden = !cur.items.includes(t) || !onbOk(t) || (cs && !cs.items.includes(t));
      if (!b.hidden) { b.style.setProperty('--d', String(Math.min(9, shown++))); if (b.classList.contains('art') && !b.dataset.art) { b.dataset.art = '1'; b.querySelector('.scene img').src = ART.tile(t); } }
      const cst = b.querySelector('.cost');
      cst.textContent = MODES[t] ? '' : String(costOf(t)); cst.classList.toggle('nocost', !!MODES[t]);
      const locked = !run || !isOpenT(t);
      const playable = fl && (fl.phase === 'build' || (fl.phase === 'raid' && !TOOLS[t] && !ITEMS[t].build && !MODES[t]));
      const off = locked || !playable || fl.essence < costOf(t);
      if (off && selected === t) selected = null;
      b.classList.toggle('off', off);
      b.setAttribute('aria-pressed', String(selected === t));
      b.setAttribute('aria-label', ITEMS[t].name + ' ' + ITEMS[t].tag + L(', koszt ', ', costs ') + costOf(t) + L(' Esencji', ' Essence') + (locked ? L(', zablokowane', ', locked') : ''));
      const lk = b.querySelector('.lock');
      if (locked && !lk) b.insertAdjacentHTML('beforeend', LOCK);
      if (!locked && lk) lk.remove();
    });
    renderDeckTiles(cur.id === 'deck' && !!run);
    { let n = 0; tray.querySelectorAll(':scope > .item').forEach(b => { if (!b.hidden && n < 10) b.dataset.k = String(++n % 10); else delete b.dataset.k; }); }   // 1.25: the number keys 1-9 and 0 take these tiles
    if (trayTab !== view) { trayTab = view; tray.scrollLeft = trayScroll[view] || 0; tray.classList.remove('deal'); void tray.offsetWidth; tray.classList.add('deal'); clearTimeout(updateTray.dealT); updateTray.dealT = setTimeout(() => tray.classList.remove('deal'), 700); }   // 1.09: a new tab deals its tiles in
    trayFade();
    if (fl && fl.phase === 'build') updateAction();
  }
  // Prototype 1.0: what a tile does shows while you hold it (the description no longer sits under the map for good)
  let tipTimer = 0, tipFor = null, tipEat = false, tipAt = [0, 0];
  function showTip(t, b, how) {
    if (tipFor === t && !$('#tip').hidden) return;   // 1.27.2: already up, do not play it again
    const box = $('#tip'), I = ITEMS[t]; box.innerHTML = '';
    const h = el('div', 'th'); h.appendChild(el('b', null, I.name)); if (!MODES[t]) h.appendChild(el('span', null, costOf(t) + L(' Esencji', ' Essence'))); box.appendChild(h);
    if (I.tag) box.appendChild(el('div', 'tg', I.tag));
    if (tagChips(t).length) box.appendChild(tagRow(t));   // 1.24 (B, P1-4) Rani / Straszy; 1.27.6: place, reach, family
    box.appendChild(el('p', null, I.desc));
    // 1.27 (UI/UX, author: details in small print): numbers and exceptions (I.more), the family, the loot price step
    { const fine = [];
      if (I.more) fine.push(I.more);
      if (FAMILY_OF[t] && FAMILIES[FAMILY_OF[t]]) { const f = FAMILY_OF[t], lv = (run && run.famLv && run.famLv[f]) || 0; if (lv) fine.push(L('Rodzina: ', 'Family: ') + FAMILIES[f].glyph + ' ' + FAMILIES[f].name + (lv ? L(', poziom ' + lv + ' (+' + 8 * lv + '% mocy)', ', level ' + lv + ' (+' + 8 * lv + '% power)') : '') + '.'); }   // 1.26 (1.27.6: only with a level; the family is a tag now)
      if (LOOT_KIND[t]) { const n = lootCount(t); fine.push(L('Każdy kolejny taki łup jest o 15% droższy' + (n ? ' (w lochu już: ' + n + ')' : '') + '.', 'Each extra one costs 15% more' + (n ? ' (placed: ' + n + ')' : '') + '.')); }
      if (fine.length) box.appendChild(el('div', 'fine', fine.join(' '))); }
    if (run && KINDS[t] && run.unlocked.has(t) && !isOpenT(t)) box.appendChild(el('div', 'tw', L('Zablokowana. Najpierw odblokuj kartą ze sklepu: ' + KIND_INFO[KINDS[t]].items.map(x => ITEMS[x].name).join(' albo ') + '.', 'Locked. First unlock ' + KIND_INFO[KINDS[t]].items.map(x => ITEMS[x].name).join(' or ') + ' with a shop card.')));
    else if (run && !MODES[t] && !run.unlocked.has(t)) box.appendChild(el('div', 'tw', L('Do odblokowania kartą ze sklepu, na stałe.', 'Locked. A shop card unlocks it for good.')));
    box.hidden = false; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    // 1.25: zoomed on a big screen, so its place is given in its own (unzoomed) pixels; in the side panel it stands left of the panel, level with the tile
    const z = UIZ, side = document.documentElement.classList.contains('wide');
    box.classList.toggle('side', side); box.style.top = ''; box.style.right = ''; box.style.bottom = '';
    if (side) { const dr = $('#drawer').getBoundingClientRect(), br = b.getBoundingClientRect(); box.style.right = ((innerWidth - dr.left + 10) / z).toFixed(1) + 'px'; box.style.top = (Math.max(8, Math.min(br.top, innerHeight - box.offsetHeight * z - 8)) / z).toFixed(1) + 'px'; }
    else box.style.bottom = ((innerHeight - $('#drawer').getBoundingClientRect().top + 6) / z).toFixed(1) + 'px';
    tipFor = t; if (how !== 'hover') b.classList.add('holding');
    tutFlags.tipN = (tutFlags.tipN || 0) + 1;   // 1.24 (B): the guide's 'hold' step (1.25: a hover or a right click counts)
    if (how !== 'hover') buzz(12);
  }
  const effWords = t => (HURTS(t) ? [L('Rani', 'Hurts')] : []).concat(SCARES(t) ? [L('Straszy', 'Scares')] : []);   // 1.24 (B, P1-4)
  // 1.27.6 (author: more tags in the descriptions): where it goes, how far it reaches, its family, beside Rani / Straszy
  const TAG_REACH = { far: ['archer', 'arrows', 'eyes', 'portrait', 'mirror', 'bolt'],
    area: ['web', 'bones', 'miasma', 'oilslick', 'flood', 'musicbox', 'bell', 'powder', 'shaman', 'lich', 'siren', 'coffin', 'fire', 'pendulum', 'creak'],
    tile: ['spikes', 'trapdoor', 'cage', 'snare', 'bait', 'gate', 'tar', 'falsedoor'] };
  const reachOf = t => TAG_REACH.far.includes(t) ? 'far' : TAG_REACH.area.includes(t) ? 'area' : TAG_REACH.tile.includes(t) ? 'tile' : MONSTERS[t] || t === 'mimic' ? 'near' : null;
  function tagChips(t) {   // [[text, class]]: Rani / Straszy, then the place, the reach, the family
    const I = ITEMS[t], out = effWords(t).map(w => [w, w === L('Rani', 'Hurts') ? 'hurt' : 'scare']); if (!I) return out;
    const place = MONSTERS[t] ? L('Potwór', 'Monster') : BUILDINGS[t] || t === 'crate' ? L('Obiekt', 'Object') : LOOT_KIND[t] || t === 'bait' ? L('Łup', 'Loot') : ({ floor: L('Podłoga', 'Floor'), wall: L('Ściana', 'Wall'), door: L('Drzwi', 'Door'), object: L('Na meblu', 'On furniture') })[I.slot];
    if (place) out.push([place, 'place']);
    const r = reachOf(t); if (r) out.push([({ near: L('Zwarcie', 'Melee'), far: L('Dystans', 'Ranged'), area: L('Obszar', 'Area'), tile: L('Jedno pole', 'One tile') })[r], 'reach']);
    const f = FAMILY_OF[t] && FAMILIES[FAMILY_OF[t]]; if (f) { out.push([f.glyph + ' ' + f.name, 'fam']); out[out.length - 1].push(f.color); }
    return out;
  }
  const tagRow = t => { const r = el('div', 'tlb'); tagChips(t).forEach(([w, c, col]) => { const s = el('span', c, w); if (col) s.style.setProperty('--fam', col); r.appendChild(s); }); return r; };
  function hideTip() {
    clearTimeout(tipTimer); tipTimer = 0;
    if (tipFor) { const b = $('#item-' + tipFor); if (b) b.classList.remove('holding'); tipFor = null; }
    $('#tip').hidden = true;
  }
  // The deck tab: one tile per slot, filled or empty. Rebuilt only when the deck changes.
  const trayDnD = { tray: true, blocked: () => modalOpen, slots: () => [...$('#tray').querySelectorAll('.dslot[data-ck]')], done: () => { $('#tray').dataset.deck = ''; updateTray(); } };   // 1.27.8
  function renderDeckTiles(show) {
    const tray = $('#tray'), k = show ? run.deck.join(',') + '|' + (run.fused || []).join(',') + '|' + run.deckSize + '|' + JSON.stringify(run.stacks || {}) + '|' + (run.stash || []).join(',') + '|' + (run.freePicks || 0) + '|' + (run.heartPicks || []).length + '|' + (fl ? fl.phase : '') + '|' + JSON.stringify(run.famLv || {}) : '';
    if (tray.dataset.deck === k) return;
    tray.dataset.deck = k;
    tray.querySelectorAll('.dslot').forEach(e => e.remove());
    if (!show) return;
    const raidNow = !!(fl && fl.phase === 'raid');   // v14: during a wave the shop and the stash are out of reach and out of sight
    if (!raidNow) { const b = document.createElement('button'), build = fl && fl.phase === 'build';   // the shop tile: back to the shop screen while building
      const hp = (run.heartPicks || []).length;
      b.type = 'button'; b.className = 'item dslot shoptile' + ((run.freePicks > 0 || hp) && build ? ' gift' : '') + (hp && build ? ' heartgift' : ''); b.id = 'tile-shop';
      b.innerHTML = '<span class="dtag"></span><span class="dnm">' + L('Sklep', 'Shop') + '</span>';
      b.querySelector('.dtag').textContent = !build ? L('między falami', 'between waves') : hp ? L('♥ Dar serca', "♥ Heart's Gift") + (run.freePicks > 0 ? ' + ' + run.freePicks : '') : run.freePicks > 0 ? L('gratis: ', 'free: ') + run.freePicks : L('wróć do sklepu', 'back to shop');
      b.disabled = !build; b.addEventListener('click', () => { if (!modalOpen && build) openModal({ type: 'shop' }); });
      tray.appendChild(b); }
    { // 1.27.1 (author): the families' levels (what the Family Runes do) are one tap away in the Deck tab
      const lv = run.famLv || {}, tot = Object.keys(FAMILIES).reduce((s, f) => s + Math.min(RUNE_MAX, lv[f] || 0), 0), b = document.createElement('button');
      b.type = 'button'; b.className = 'item dslot famtile'; b.id = 'tile-families';
      b.innerHTML = '<span class="dtag"></span><span class="dnm">' + L('Rodziny', 'Families') + '</span>';
      b.querySelector('.dtag').textContent = tot ? L('runy: ', 'runes: ') + tot : L('bez run', 'no runes');
      b.addEventListener('click', () => { if (!modalOpen && run) { const un = fl && fl.phase === 'raid' && !paused; if (un) setPaused(true); openModal({ type: 'families', unpause: un }); } });
      tray.appendChild(b); }
    // 1.27.5 (brief B): the ordinary cards in the deck's slots, then the Heart's Gift cards (no slots) in their own row
    const ordI = run.deck.map((id, i) => i).filter(i => !isGift(run.deck[i])), giftI = run.deck.map((id, i) => i).filter(i => isGift(run.deck[i]));
    for (let s = 0; s < Math.max(run.deckSize, ordI.length) + giftI.length; s++) {
      const gift = s >= Math.max(run.deckSize, ordI.length), i = gift ? giftI[s - Math.max(run.deckSize, ordI.length)] : ordI[s] != null ? ordI[s] : -1;
      const u = i >= 0 ? UPG[run.deck[i]] : null, b = document.createElement('button');
      b.type = 'button'; b.className = 'item dslot ' + (u ? 'rar-' + u.rar : 'empty') + (u && isFused(u.id) ? ' fused' : '') + (gift ? ' giftcard' : '');   // 1.24: ★
      if (u) {
        b.innerHTML = '<span class="dtag"></span><span class="dnm"></span>';
        { const ca = ART.cardImg(u.id); if (ca) { b.prepend(ca); b.classList.add('hasart'); } }   // 1.26: the card's picture on its tile
        b.querySelector('.dtag').textContent = gift ? L('♥ Serce', '♥ Heart') : u.grows ? L('rośnie: ', 'grows: ') + (run.stacks[u.id] || 0) : u.tag; b.querySelector('.dnm').textContent = cardName(u.id);
        b.setAttribute('aria-label', u.name + ', ' + RAR_NAME[u.rar] + L(' karta. ', ' card. ') + u.text);
        b.addEventListener('click', () => { if (!modalOpen && run) { if (fl && fl.phase === 'raid' && !paused) setPaused(true); openModal({ type: 'card', idx: i }); } });
        if (u.id === 'copyist' || u.id === 'soulmirror') { const t = copyTarget(u.id); b.querySelector('.dtag').textContent = t ? L('kopiuje: ', 'copies: ') + cardName(t) : L('nic nie kopiuje', 'copies nothing'); }   // 1.27.8: what it copies, right on the tile
        cardGestures(b, 'd', i, trayDnD);   // 1.27.8: drag to move, hold to sell
      } else { b.innerHTML = '<span class="dnm">' + L('wolne miejsce', 'free slot') + '</span>'; b.disabled = true; b.dataset.ck = 'd'; b.dataset.ci = -1; }   // 1.27.8: a drop target
      tray.appendChild(b);
    }
    if (!raidNow) for (let i = 0; i < stashCap(); i++) {   // the stash: inactive cards waiting for their turn (hidden during a wave)
      const u = UPG[(run.stash || [])[i]], b = document.createElement('button');
      b.type = 'button'; b.className = 'item dslot stash ' + (u ? 'rar-' + u.rar : 'empty');
      b.innerHTML = '<span class="dtag"></span><span class="dnm"></span>';
      b.querySelector('.dtag').textContent = L('schowek', 'stash'); b.querySelector('.dnm').textContent = u ? cardName(u.id) : L('pusto', 'empty');   // 1.24: ★
      if (u) { b.addEventListener('click', () => { if (!modalOpen && fl && fl.phase === 'build') openModal({ type: 'shop' }); }); cardGestures(b, 's', i, trayDnD); } else { b.disabled = true; b.dataset.ck = 's'; b.dataset.ci = -1; }   // 1.27.8
      tray.appendChild(b);
    }
  }
  // 1.27.8 (author: rearrange the deck to choose what Kopista copies, and move / sell cards like the objects on the map): a card in the
  // deck or the stash (between waves) is dragged to a new place (another deck slot = the order, a stash slot = to the stash, and back;
  // onto a card = they swap), and held still to sell it (a red bar fills, CARD_HOLD s). A plain tap still opens the card.
  const CARD_HOLD = 0.8;
  function moveCard(fk, fi, tk, ti) {
    if (!run || !fl || fl.phase !== 'build') return false;
    const ordN = deckUsed(); run.stash = run.stash || [];
    if (fk === 'd') {
      const id = run.deck[fi]; if (!id || isGift(id)) return false;   // a Heart's Gift card stays where it is (no slot, no order)
      if (tk === 'd') { const to = ti < 0 || ti >= ordN || isGift(run.deck[ti]) ? ordN - 1 : ti; if (to === fi) return false; run.deck.splice(fi, 1); run.deck.splice(to, 0, id); }
      else { const sid = ti >= 0 ? run.stash[ti] : null; if (sid) { run.deck[fi] = sid; run.stash[ti] = id; } else { if (run.stash.length >= stashCap()) return false; run.deck.splice(fi, 1); run.stash.push(id); } }
    } else {
      const id = run.stash[fi]; if (!id) return false;
      if (tk === 's') { if (ti === fi) return false; run.stash.splice(fi, 1); run.stash.splice(ti < 0 ? run.stash.length : Math.min(ti, run.stash.length), 0, id); }
      else { const did = ti >= 0 ? run.deck[ti] : null; if (did && !isGift(did)) { run.deck[ti] = id; run.stash[fi] = did; } else { if (deckFull()) return false; run.stash.splice(fi, 1); deckAdd(id); const j = run.deck.indexOf(id), to = ti >= 0 && ti < deckUsed() ? ti : -1; if (to >= 0 && to !== j) { run.deck.splice(j, 1); run.deck.splice(to, 0, id); } } }
    }
    fl.stats.cardDrags = (fl.stats.cardDrags || 0) + 1;
    recomputeMods(); updateTray(); saveRunSoon(); return true;
  }
  function holdSellCard(k, i) {
    if (!run || !fl || fl.phase !== 'build') return 0;
    const g = k === 'd' ? sellCard(i) : sellStash(i); if (g) { fl.stats.cardHoldSells = (fl.stats.cardHoldSells || 0) + 1; updateTray(); saveRunSoon(); } return g;
  }
  // pointer handling for one card tile b (k 'd' / 's', index i); opt.tray: in the build tray (a sideways swipe scrolls it, so a
  // drag starts when the finger goes up first); opt.done(msg): after a move or a sale; opt.slots(): the drop targets
  function cardGestures(b, k, i, opt) {
    b.dataset.ck = k; b.dataset.ci = i;
    b.addEventListener('pointerdown', e => {
      if (e.button > 0 || !fl || fl.phase !== 'build' || (opt.blocked && opt.blocked())) return;
      const arr = k === 'd' ? run.deck : run.stash, id = arr[i]; if (!id) return;
      const sx = e.clientX, sy = e.clientY, pid = e.pointerId; let drag = null, held = false, tgt = null;
      const canDrag = !(k === 'd' && isGift(id));
      b.classList.add('pressing');
      const holdT = setTimeout(() => { if (drag) return; b.classList.remove('pressing'); b.classList.add('sellhold'); b.style.setProperty('--hold', CARD_HOLD + 's'); }, 160);
      const sellT = setTimeout(() => { if (drag) return; held = true; b._eat = true; cleanup(); const u = UPG[id], g = holdSellCard(k, i); buzz(25); opt.done(g ? L('Sprzedane: ', 'Sold: ') + u.name + ' (+' + g + L(' Esencji).', ' Essence).') : ''); }, (0.16 + CARD_HOLD) * 1000);
      const over = (x, y) => { const el0 = document.elementFromPoint(x, y), s = el0 && el0.closest('[data-ck]'); return s && opt.slots().includes(s) ? s : null; };
      const move = ev => {
        if (ev.pointerId !== pid || held) return;
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!drag) {
          if (Math.hypot(dx, dy) < 9) return;
          clearTimeout(holdT); clearTimeout(sellT); b.classList.remove('pressing', 'sellhold');
          if (!canDrag || (opt.tray && Math.abs(dx) > Math.abs(dy) * 1.2 && -dy < 9)) { stop(); return; }   // the tray: a sideways swipe scrolls
          drag = el('div', 'cardghost ' + [...b.classList].filter(c => /^rar-|fused|giftcard/.test(c)).join(' '), UPG[id] ? cardName(id) : '');
          document.body.appendChild(drag); b.classList.add('dragging'); try { b.setPointerCapture(pid); } catch (er) {}
        }
        ev.preventDefault();
        drag.style.left = (ev.clientX / UIZ) + 'px'; drag.style.top = (ev.clientY / UIZ) + 'px';
        const t = over(ev.clientX, ev.clientY); if (t !== tgt) { if (tgt) tgt.classList.remove('droptarget'); tgt = t; if (tgt && tgt !== b) tgt.classList.add('droptarget'); }
        if (opt.tray) { const tr = b.parentElement, r = tr.getBoundingClientRect(); if (ev.clientX < r.left + 30) tr.scrollLeft -= 8; else if (ev.clientX > r.right - 30) tr.scrollLeft += 8; }
      };
      const up = ev => {
        if (ev.pointerId !== pid) return;
        const was = drag, t = tgt; stop();
        if (held) return;
        if (was) {
          b._eat = true; setTimeout(() => { b._eat = false; }, 400);
          if (t && t !== b) { const tk = t.dataset.ck, ti = +t.dataset.ci, u = UPG[id];
            const ok = moveCard(k, i, tk, ti); buzz(ok ? 12 : 20);
            opt.done(ok ? (k !== tk ? u.name + (tk === 's' ? L(': w schowku.', ': to the stash.') : L(': w talii.', ': into the deck.')) : '') : (tk === 'd' && deckFull() ? L('Talia pełna: upuść kartę na inną, żeby je zamienić.', 'The deck is full: drop it on a card to swap them.') : L('Schowek pełny.', 'The stash is full.')));
          }
        }
      };
      const cleanup = () => { clearTimeout(holdT); clearTimeout(sellT); b.classList.remove('pressing', 'sellhold', 'dragging'); if (drag) drag.remove(); drag = null; if (tgt) tgt.classList.remove('droptarget'); };
      const stop = () => { cleanup(); removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); };
      addEventListener('pointermove', move, { capture: true, passive: false }); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
    });
    b.addEventListener('click', e => { if (b._eat) { e.stopImmediatePropagation(); e.preventDefault(); b._eat = false; } }, true);
    b.addEventListener('contextmenu', e => e.preventDefault());
  }
  function actLabel(b, main, sub) {
    const k = main + '|' + (sub || '');
    if (b.dataset.k === k) return false;
    b.dataset.k = k; b.textContent = main;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; b.appendChild(s); }
    return true;
  }
  function updateAction() {
    const b = $('#btn-action'), build = !!(fl && fl.phase === 'build'), raid = !!(fl && fl.phase === 'raid');
    $('#btn-undo').hidden = raid;   // 1.07: no pause button: in a wave the build tray is the pause
    updateUndoBtn();
    b.classList.remove('focus-on', 'silence-on', 'ready');
    if (!fl || !run) { b.disabled = true; return; }
    if (build) {
      const left = Math.floor(fl.essence), need = run.tut >= 0 ? 0 : hungerNeed(run.wave), nH = (run.next ? run.next.length : 0) + L(' bohaterów', ' heroes');
      b.disabled = false; b.classList.add('ready');
      // 1.27.5 (brief D): from wave 2 the heart's hunger and your reserve under the button; red when the heart is at risk and the
      // reserve is under 20% of the hunger (the same rule as the warning on the heart's bar)
      if (need > 0) { actLabel(b, L('Wypuść falę ', 'Release wave ') + run.wave, nH + L(' · głód ' + need + ' · zapas ' + left, ' · hunger ' + need + ' · reserve ' + left)); const sm = b.querySelector('small'); if (sm) sm.classList.toggle('low', reserveLow()); }
      else actLabel(b, L('Wypuść falę ', 'Release wave ') + run.wave, nH + (left >= 6 ? L(' · zostało ' + left + ' Esencji', ' · ' + left + ' Essence left') : ''));
      return;
    }
    if (fl.phase === 'raid') {   // v14: no silence: the button only says how to speed up
      b.disabled = true;
      if (paused && trayIsOpen()) { actLabel(b, L('Pauza', 'Paused'), L('zwiń ▼ Budowa, żeby grać', 'fold ▼ Build to play')); return; }   // 1.08
      actLabel(b, L('Fala trwa', 'Wave running'), PC() ? L('przytrzymaj F albo mapę: szybciej', 'hold F or the map: faster') : L('przytrzymaj mapę: szybciej', 'hold the map: faster'));
      return;
    }
    b.disabled = true; actLabel(b, L('Koniec fali', 'Wave over'));
  }
  function updatePauseBtn() { }   // 1.07: the pause button is gone (kept as a name for older callers)
  function setPaused(v, quiet) {   // quiet: the tutorial's own pause says it itself
    if (!fl || fl.phase !== 'raid') { paused = false; return; }
    if (!v && trayIsOpen()) v = true;   // 1.07: while the build tray is open in a wave, time stands still whatever else closes
    if (paused !== v) tl('pa', v ? 1 : 0);
    paused = v; if (paused) ff = false;
    updateAction();   // 1.08: the button says when the game stands
    if (!quiet) setHint(paused ? L('Pauza. Możesz przesuwać mapę, budować i stuknąć bohatera, żeby zobaczyć jego kartę.', 'Paused. You can move the map, build, and tap a hero to see their card.') : L('Gramy dalej.', 'Playing on.'));
  }
  const hudCache = {};
  // Prototype 1.0: the big number counts up to what you have (and down when you spend); it glows while it grows and a +N rises from it.
  const SC = { shown: null, last: null, t: 0, acc: 0, accT: 0, upTo: 0, downTo: 0, cry: null };
  const reduceMotion = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  function tickScore() {
    const target = Math.floor(fl.essence), now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - SC.t) / 1000)), e = $('#h-score');
    SC.t = now;
    if (SC.shown === null || reduceMotion) SC.shown = target;
    if (SC.last !== null && target !== SC.last) {
      const d = target - SC.last;
      if (d > 0) { SC.acc += d; SC.upTo = now + 420; } else { SC.downTo = now + 450; floater(String(d), true); }
    }
    SC.last = target;
    const diff = target - SC.shown;
    if (diff) SC.shown += Math.sign(diff) * Math.min(Math.abs(diff), Math.max(1, Math.ceil(Math.abs(diff) * Math.min(1, dt * 8))));
    setText('h-score', String(SC.shown));
    if (SC.acc > 0 && now - SC.accT > 480) { floater('+' + SC.acc); SC.acc = 0; SC.accT = now; }   // the gains of the last half second in one +N
    const up = now < SC.upTo || SC.shown < target, down = !up && (now < SC.downTo || SC.shown > target);
    if (hudCache.scoreUp !== up) { hudCache.scoreUp = up; e.classList.toggle('up', up); }
    if (hudCache.scoreDown !== down) { hudCache.scoreDown = down; e.classList.toggle('down', down); }
  }
  function floater(txt, spend) {
    const host = $('#h-mid'); if (!host || reduceMotion || host.querySelectorAll('.floater').length >= 4) return;
    const f = el('span', 'floater' + (spend ? ' spend' : ''), txt); host.appendChild(f);
    f.addEventListener('animationend', () => f.remove()); setTimeout(() => f.remove(), 1600);
  }
  function crystalAlarm() {
    const c = $('#h-cry'), s = $('#stage');
    c.classList.remove('lost'); s.classList.remove('alarm'); void c.offsetWidth; c.classList.add('lost'); s.classList.add('alarm');
    clearTimeout(crystalAlarm.t); crystalAlarm.t = setTimeout(() => { c.classList.remove('lost'); s.classList.remove('alarm'); }, 1000);
  }
  // the banner over the map when a wave comes in
  function showBanner(big, small) {
    const b = $('#banner'); if (!b) return;
    b.querySelector('b').textContent = big; b.querySelector('span').textContent = small || '';
    b.hidden = false; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(showBanner.t); showBanner.t = setTimeout(() => { b.hidden = true; b.classList.remove('show'); }, 2200);
  }
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $('#' + id).textContent = v; } }
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const fmtK = n => n >= 10000 ? dec((n / 1000).toFixed(1)) + 'k' : String(Math.round(n));
  function updateHud() {
    setText('h-wave', run.wave <= RUN_WAVES ? L('Fala ', 'Wave ') + run.wave + '/' + RUN_WAVES : L('Fala ', 'Wave ') + run.wave + ' ∞');
    const tot = run.total + (fl.phase === 'raid' ? fl.score : 0), raidNow = fl.phase === 'raid';
    // the big number is the Esencja in your purse; in a wave, under it, what this wave has brought so far (the heart's share too)
    tickScore();
    { const af = fl.phase === 'build' && !modalOpen && Math.floor(fl.essence) >= cheapestItem().cost; if (hudCache.afford !== af) { hudCache.afford = af; $('#h-score').classList.toggle('afford', af); } }   // 1.24 (D, P1-2): Esencja that buys something pulses
    setText('h-best', raidNow ? L('Esencja · fala +', 'Essence · wave +') + fmtE(fl.score) : L('Esencja', 'Essence'));
    { const rk = rankOf(tot); setText('h-rank', raidNow ? '' : rk.next ? rk.name + ' · ' + rk.next[1] + L(' za ', ' in ') + Math.ceil(Math.max(0, rk.next[0] - tot)) : L('ranga: ', 'rank: ') + rk.name); }   // the run's harvest gives the rank (hidden in a wave: the formula needs the room)
    // Prototype 1.01: the heart takes its share of THIS wave's Esencja first. In a wave the bar fills as it eats; between waves
    // the row says how much the next wave has to bring.
    // 1.26: the heart's row: the hunger (red) until it is fed, then the Nasycenie to the next level (gold); the thin gold line under it
    // is the Nasycenie at any time; the small number is the heart's level. In the build: what it wants and what the purse covers.
    { const need = hungerNeed(run.wave), inW = fl.phase === 'raid' || fl.phase === 'summary', fed = inW ? Math.min(fl.fed || 0, need) : 0, ok = !!need && fed >= need - 0.001;
      const risk = !inW && hungerRisk(), last = run.waves[run.waves.length - 1], purse = Math.floor(fl.essence);
      const HL = run.heartLv || 0, s0 = heartLvAt(HL), s1 = heartLvAt(HL + 1), sf = clamp(((run.satiety || 0) - s0) / Math.max(1, s1 - s0), 0, 1);
      const row = $('#h-hrow'), k = (need ? 1 : 0) + '|' + (ok ? 1 : 0) + '|' + Math.floor(fed) + '|' + need + '|' + (inW ? 1 : 0) + '|' + (risk ? 1 : 0) + '|' + HL + '|' + Math.floor(run.satiety || 0) + '|' + (inW ? 0 : purse) + '|' + (heartUpBlocked() ? 1 : 0);
      if (hudCache.hunger !== k) {
        hudCache.hunger = k;
        row.classList.toggle('off', !need); row.classList.toggle('fed', ok); row.classList.toggle('hungry', !!need && !ok && inW); row.classList.toggle('warn', !!risk);
        row.title = risk ? L('Głód: ' + need + ' Esencji. Jeśli fala da mniej, serce weźmie brak z sakiewki (masz ' + purse + '), a gdy i tego zabraknie, pęknie kryształ' + (last ? ' (ostatnia fala dała ' + Math.round(last.score) + ')' : '') + '.',
          'Hunger: ' + need + ' Essence. If the wave brings less, the heart takes the rest from your purse (you have ' + purse + '), and if that runs out too, a crystal breaks' + (last ? ' (last wave: ' + Math.round(last.score) + ')' : '') + '.') : L('Serce: stuknij, żeby zobaczyć Głód, Nasycenie i Ofiarę', 'Heart: tap to see Hunger, Satiety and Offering');
        $('#h-hfill').style.width = (need ? (ok ? sf : Math.min(1, fed / need)) * 100 : 0).toFixed(1) + '%';
        $('#h-sfill').style.width = (sf * 100).toFixed(1) + '%';
        { const wt = heartUpBlocked(); row.classList.toggle('waiting', wt); if (wt && !risk) row.title = L('Nasycenie pełne: następny poziom w kolejnej fali', 'Satiety full: next level next wave'); }   // 1.27.5 (brief A)
        $('#h-hlv').textContent = HL ? String(HL) : '';
        $('#h-hlabel').textContent = !need ? (HL ? L('serce poz. ' + HL, 'heart lvl ' + HL) : L('serce głodne od fali 2', 'hungry from wave 2')) : ok ? L('syte · Danina ' + Math.round(titheNow() * 100) + '% → poz. ' + (HL + 1), 'full · Tithe ' + Math.round(titheNow() * 100) + '% → lvl ' + (HL + 1)) : inW ? L('serce ', 'heart ') + Math.floor(fed) + '/' + need
          : purse >= need ? L('serce chce ' + need + ' · sakiewka ' + purse, 'heart wants ' + need + ' · purse ' + purse) : risk ? '⚠ ' + need + L(' · sakiewka ', ' · purse ') + purse : L('serce chce ' + need + ' · sakiewka ' + purse, 'heart wants ' + need + ' · purse ' + purse);
      }
    }
    const out = fl.party && fl.party.carrierId >= 0 && fl.phase === 'raid' ? 1 : 0;
    setText('h-cry', '◆'.repeat(Math.max(0, run.crystals - out)) + (out ? '◈' : '') + '◇'.repeat(Math.max(0, run.maxCrystals - run.crystals)));
    { const c = 2 * run.crystals - out; if (SC.cry != null && c < SC.cry && fl.phase !== 'build') crystalAlarm(); SC.cry = c; }   // stolen or eaten: the crystals shake, the map flashes red
    setText('h-time', fl.phase === 'build' ? L('budowa', 'build') : fl.phase === 'raid' ? (paused ? L('pauza', 'paused') : fl.fearless ? (fl.storm ? L('szturm!', 'assault!') : L('odwrót', 'retreat')) : fl.party && fl.party.council ? L('narada', 'council') : mmss(Math.max(0, S.waveTime - (fl.patT || 0)))) : L('koniec', 'over'));
    { const bw = (fl.phase === 'raid' ? Math.min(1, (fl.patT || 0) / S.waveTime) * 100 : 0).toFixed(1) + '%'; if (hudCache.bar !== bw) { hudCache.bar = bw; const bar = $('#h-bar'); bar.style.width = bw; bar.classList.toggle('ok', false); } }   // 1.24 (C): written only when it changes (a style written every frame made the browser lay the page out again)
    const pipsOn = fl.phase !== 'raid';
    if (hudCache.pipsOn !== pipsOn) { hudCache.pipsOn = pipsOn; $('#h-barwrap').hidden = pipsOn; $('#h-pips').hidden = !pipsOn; }
    if (pipsOn) renderPips();
    // The equation row (the Balatro line). Prototype 1.01: while a combo lasts its Groza piles up here and the line shows what it
    // will pay (Groza x Chciwość x Combo = Esencja); when the combo ends it is cashed in (the line glows for a moment, orbs fly).
    // Nothing going on: Groza 0 and the multipliers as they stand now (dim). Between waves: the greed a wave starts with.
    const cm = 1 + 0.25 * (comboNow() - 1), raid = fl.phase === 'raid', wait = false;   // 1.12: the combo clock never waits now
    const C = raid ? fl.chain : null, PY = raid && !C && fl.lastPay && fl.time - fl.lastPay.t <= 1.6 ? fl.lastPay : null, B = C || PY;
    const gNow = C ? Math.max(0, C.g - (C.fly || 0)) : 0;   // 1.02: the Groza box grows as the violet orbs land in it
    // 1.10: Chciwość and Combo grow as their orbs land too (what is still flying is not shown yet)
    let vC = B ? B.greed : raid ? fl.greed : greedStartNow(), vK = B ? B.cm : raid ? cm : 1;
    if (raid && fl.gFly > 1e-6) vC = Math.min(vC, fl.greed - fl.gFly);
    if (raid && fl.kFly > 1e-6 && comboLive() && (C || !PY)) vK = Math.max(1, Math.min(vK, cm - fl.kFly));
    const eqG = C ? '+' + fmtG(gNow) : PY ? fmtG(PY.g) : '0', eqC = fmt2(vC), eqK = fmt2(vK);
    const eqE = C ? '+' + fmtE(gNow * C.greed * C.cm * mods.regen * S.essK) : PY ? '+' + fmtE(PY.e) : '+0';   // 1.16.1: × S.essK, as the payout (the box showed ~10% less, then jumped)
    const txt = [eqG, eqC, eqK, eqE, C ? 1 : PY ? 2 : 0, wait ? 1 : 0, raid ? 1 : 0, mods.regen].join('|');
    const eq = $('#h-eq');
    if (hudCache.eqOn !== raid) { hudCache.eqOn = raid; eq.hidden = false; eq.classList.toggle('eq-off', !raid); eq.setAttribute('aria-hidden', String(!raid)); eq.tabIndex = raid ? 0 : -1; $('#h-rankrow').hidden = true; }   // 1.27 (UI/UX): the equation is a wave thing; in the build it showed zeros. 1.27.1 (author): it slides in and out
    if (!eq.dataset.hook) { eq.dataset.hook = '1'; const open = () => { if (!run || !fl || modalOpen) return; const un = fl.phase === 'raid' && !paused; if (un) setPaused(true); openModal({ type: 'esencja', unpause: un }); };
      eq.addEventListener('click', open); eq.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); }
    if (hudCache.mult !== txt) {
      hudCache.mult = txt;
      const now = performance.now(), pops = hudCache.pops = hudCache.pops || {};
      const set = (id, v) => { const b = $('#' + id + ' b'); if (b.textContent !== v) { b.textContent = v; if (B && now - (pops[id] || 0) > 220) { pops[id] = now; const e = $('#' + id); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); } } };
      set('eq-g', eqG); set('eq-c', eqC); set('eq-k', eqK); set('eq-e', eqE);
      $('#eq-c i').textContent = raid ? L('Chciwość', 'Greed') : L('Chciwość start', 'Greed start'); $('#eq-k i').textContent = wait ? L('Combo czeka', 'Combo waits') : 'Combo';
      const vein = mods.regen !== 1; $('#eq-r').hidden = !vein; $('#eq-rop').hidden = !vein; if (vein) $('#eq-r b').textContent = fmt2(mods.regen);
      eq.classList.toggle('idle', !B); eq.classList.toggle('chain', !!C); eq.classList.toggle('paid', !!PY);
    }
  }
  const fmtG = v => v < 1 ? dec((Math.round(v * 100) / 100).toFixed(2)) : fmtE(v);   // small Groza with two decimals
  // Prototype 1.0: no hint box under the map any more. A message pops up for a moment (a longer one stays longer) and goes away;
  // a tap closes it. Over the map in the game, just above the big button on the screens between waves.
  let hintMsg = null;
  // Ten pips for the run between waves: green = held, red = a crystal lost, gold = the next wave; a diamond marks a boss.
  function renderPips() {
    const base = Math.floor((run.wave - 1) / 10) * 10, k = run.wave + '|' + run.waves.map(w => w.crystalLost || (w.hunger && w.hunger.ate) ? 1 : 0).join('');
    if (hudCache.pips === k) return; hudCache.pips = k;
    const box = $('#h-pips'); box.innerHTML = '';
    for (let n = base + 1; n <= base + 10; n++) {
      const w = run.waves.find(x => x.wave === n), i = el('i');
      if (w) i.className = w.crystalLost || (w.hunger && w.hunger.ate) ? 'lost' : 'done'; else if (n === run.wave) i.className = 'cur';
      if (n % 5 === 0) i.classList.add('boss');
      i.title = L('Fala ', 'Wave ') + n + (n % 10 === 0 ? L(' (finał)', ' (finale)') : n % 5 === 0 ? L(' (czempion)', ' (champion)') : '');
      box.appendChild(i);
    }
    box.setAttribute('aria-label', L('Postęp runu: fala ' + run.wave + ' z ' + RUN_WAVES, 'Run progress: wave ' + run.wave + ' of ' + RUN_WAVES));
  }
  // 1.12 (author: the message box at the top of the map goes, all of it): what it explained is in the onboarding cards (Nowe w
  // tym runie), in the tile tips (hold a tile) and on the screens; what a tap did wrong is said for a moment right where you
  // tapped (note), and a tray tile you cannot take shakes and says why on itself (nope). setHint stays, as a no-op.
  function setHint(t) {}
  let lastTapT = null;
  function note(t, x, y) {
    if (!fl || !t) return;
    const p = x != null ? { x, y } : lastTapT; if (!p) return;
    addFloat(p.x + 0.5, p.y + 0.5, t, '#ffc2b8', 13, -0.3, 'note');
  }
  function nope(b, t) {
    if (!b) return; const sl = b.querySelector('.sl'); buzz(15);
    b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
    if (sl) { if (sl.dataset.was == null) sl.dataset.was = sl.textContent; sl.textContent = t; }
    clearTimeout(b.nopeT); b.nopeT = setTimeout(() => { b.classList.remove('nope'); if (sl && sl.dataset.was != null) { sl.textContent = sl.dataset.was; delete sl.dataset.was; } }, 1500);
  }
  function hideToast() {
    const box = $('#toast'); clearTimeout(setHint.t1); if (box.hidden) return;
    box.classList.add('bye'); clearTimeout(setHint.t2);
    setHint.t2 = setTimeout(() => { box.hidden = true; box.classList.remove('bye'); hintMsg = null; }, 300);
  }
  function placeToast() {
    const box = $('#toast'), foot = modalOpen ? document.querySelector('#card .scr-foot') : null, fr = foot && foot.getBoundingClientRect();
    box.style.top = ''; box.style.bottom = ''; box.style.left = '';
    const z = UIZ;   // 1.25: zoomed on a big screen: its place in its own pixels
    if (fr && fr.height) box.style.bottom = ((innerHeight - fr.top + 8) / z).toFixed(1) + 'px';
    else if (modalOpen) box.style.top = 'max(12px, var(--safe-top))';
    else {   // 1.04: under the coach when it sits at the top of the map
      const co = $('#coach'), cr = !co.hidden && co.classList.contains('top') ? co.getBoundingClientRect() : null, sr = stage.getBoundingClientRect();
      box.style.top = ((cr ? cr.bottom + 8 : sr.top + 8) / z).toFixed(1) + 'px';
      if (document.documentElement.classList.contains('wide')) box.style.left = ((sr.left + sr.width / 2) / z).toFixed(1) + 'px';   // 1.25: over the map, not over the panel
    }
  }
  $('#toast').addEventListener('click', hideToast);
  $('#h-wave').addEventListener('click', () => { if (run && fl && !modalOpen && fl.phase === 'build') openModal({ type: 'news' }); });   // the wave's news again (1.12.1: a card, the top hint is gone)

  // The element tray folds away and comes back on a tap of its handle; a wave folds it as it starts (1.09: again, after 1.08 took
  // that out: the author's complaint was the handle's width, a whole-row hit area). Between waves it remembers you.
  function trayIsOpen() { const d = $('#drawer'); return !!d && !d.classList.contains('closed'); }
  // 1.07 (author): in a wave the tray is the pause: open = time stops and the camera tilts to the building view (high isometry),
  // folded = the game goes on in the wave view (2:1). Between waves a folded tray previews the wave view.
  function setTrayOpen(open, byUser) {
    const d = $('#drawer'), was = !d.classList.contains('closed');
    d.classList.toggle('closed', !open); $('#app').classList.toggle('trayclosed', !open);
    $('#tray-toggle').setAttribute('aria-expanded', String(open));
    $('#tray-label').textContent = open ? L('▼ Budowa', '▼ Build') : L('▲ Budowa', '▲ Build');   // 1.06 (author): one button that looks the same both ways, only the arrow turns
    if (byUser && fl && fl.phase === 'build') { UI.trayBuild = open; saveUI(); }
    if (byUser && !open) tutFlags.trayFolded = true;   // 1.08: the tutorial asks you to fold it and unfold it
    if (was !== open) { if (!open && selected && fl && fl.phase === 'raid') { selected = null; } hideTip(); }   // 1.08: the stage follows the tray frame by frame (trayPaint)
    if (was !== open && fl && fl.phase === 'raid') {
      if (open) { setPaused(true, true); fl.stats.trayPauses = (fl.stats.trayPauses || 0) + 1; if ((UI.trayPauseHint || 0) < 3 && run && run.tut < 0) { UI.trayPauseHint = (UI.trayPauseHint || 0) + 1; saveUI(); setHint(L('Pauza na budowanie. Zwiń ▼ Budowa, żeby grać dalej.', 'Paused while you build. Fold ▼ Build to play on.')); } }
      else if (!tutPopNow) { setPaused(false, true); ff = false; }
      updateAction();
    }
  }
  // 1.08 (author): the tray folds and unfolds in the time the camera takes to tilt, on the same curve, so the two are one motion.
  // The frame loop sets its body's height frame by frame; the map's stage takes what is left and keeps its middle.
  const TRAY = { k: 1, from: 1, to: 1, t: 1 }, TRAY_GAP = 6;   // TRAY_GAP: .drawer's gap in the CSS
  function trayTick(rdt) {
    const want = trayIsOpen() ? 1 : 0;
    if (want !== TRAY.to) { TRAY.from = TRAY.k; TRAY.to = want; TRAY.t = 0; }
    if (TRAY.t >= 1) return;
    TRAY.t = reduceMotion || document.documentElement.classList.contains('wide') ? 1 : Math.min(1, TRAY.t + rdt / VIEW.dur);   // 1.25: the side panel folds at once (it is not under the map)
    const e = TRAY.t * TRAY.t * (3 - 2 * TRAY.t);   // the camera's curve (viewTick)
    trayPaint(TRAY.from + (TRAY.to - TRAY.from) * e);
  }
  function trayPaint(k) {
    const b = $('#drawer-body'), d = $('#drawer'); TRAY.k = k;
    if (k <= 0.002) { b.style.display = 'none'; b.style.height = ''; b.style.overflow = ''; d.style.rowGap = ''; }
    else if (k >= 0.998) { b.style.display = ''; b.style.height = ''; b.style.overflow = ''; d.style.rowGap = ''; }
    else { b.style.display = ''; b.style.overflow = 'hidden'; b.style.height = (b.scrollHeight * k).toFixed(1) + 'px'; d.style.rowGap = (TRAY_GAP * k).toFixed(2) + 'px'; }
    if (fl) { const r = stage.getBoundingClientRect(); if (Math.floor(r.height) !== ch || Math.floor(r.width) !== cw) resize(); }
  }
  // how much of the map's full height the tray's body takes now (0 when folded): the canvas is drawn that much taller
  function trayCover() { const b = $('#drawer-body'); if (!b || b.style.display === 'none') return 0; return b.getBoundingClientRect().height + (parseFloat(getComputedStyle($('#drawer')).rowGap) || 0); }
  $('#tray-toggle').addEventListener('click', () => setTrayOpen($('#drawer').classList.contains('closed'), true));
  /* ================= undo (between waves) ================= */
  // Every change to the dungeon in the build phase can be taken back: placing, upgrading, moving, removing, digging.
  let undoStack = [];
  function cloneLayout(L) {
    try { return structuredClone(L); } catch (e) {}
    const c = Object.assign({}, L);
    c.cells = new Map([...L.cells].map(([k, v]) => [k, Object.assign({}, v, { objs: v.objs.map(o => o.slice()) })]));
    c.edges = new Map([...L.edges].map(([k, v]) => [k, Object.assign({}, v)]));
    if (L.breach) c.breach = Object.assign({}, L.breach);
    return c;
  }
  function pushUndo(label) {
    if (!fl || fl.phase !== 'build' || !run) return;
    undoStack.push({ label, layout: cloneLayout(run.layout), items: [...run.items.entries()].map(([k, it]) => [k, Object.assign({}, it)]), essence: fl.essence,
      freeDigs: run.freeDigs, byType: JSON.parse(JSON.stringify(fl.byType)), built: fl.stats.built, rumorTiles: new Map(run.rumor.tiles) });
    if (undoStack.length > 30) undoStack.shift();
    updateUndoBtn();
  }
  function undo() {
    const u = undoStack.pop(); if (!u || !fl || fl.phase !== 'build') { updateUndoBtn(); return; }
    run.layout = u.layout; run.items.clear(); u.items.forEach(([k, it]) => run.items.set(k, it));
    fl.essence = u.essence; run.freeDigs = u.freeDigs; fl.byType = u.byType; fl.stats.built = u.built; run.rumor.tiles = u.rumorTiles;
    rebuildDungeon(true); fl.threatDirty = true; movingKey = null; movingObj = null; carryCache = null;
    updateTray(); updateUndoBtn(); setHint(L('Cofnięte: ', 'Undone: ') + u.label + '.'); saveRunSoon();
  }
  function clearUndo() { undoStack = []; updateUndoBtn(); }
  function updateUndoBtn() {
    const b = $('#btn-undo'), n = undoStack.length, badge = $('#undo-n');
    b.disabled = !n || !fl || fl.phase !== 'build'; badge.hidden = !n; badge.textContent = String(n);
    b.setAttribute('aria-label', n ? L('Cofnij: ', 'Undo: ') + undoStack[n - 1].label : L('Nic do cofnięcia', 'Nothing to undo'));
  }
  $('#btn-undo').addEventListener('click', () => { if (!modalOpen) undo(); });
  /* ================= speed ================= */
  function updateSpeedBtn() { return; const b = $('#btn-speed'), v = UI.speed || 1; $('#speed-l').textContent = '×' + v; b.classList.toggle('on', v > 1); b.setAttribute('aria-label', L('Prędkość ×' + v + ' (stuknij, żeby zmienić)', 'Speed ×' + v + ' (tap to change)')); }


  /* ================= modals ================= */
  function queueModal(m) { if (modalOpen) modalQueue.push(m); else openModal(m); }
  function closeModal() {
    modalOpen = false; modalKind = null; curModal = null; $('#overlay').hidden = true;
    if (modalQueue.length) { openModal(modalQueue.shift()); return; }
    if (run && run.afterModals) { const f = run.afterModals; run.afterModals = null; f(); }
  }
  function openModal(m) {
    if (m.type === 'end' && WEB && !m.afterSurvey && !surveyState()) m = { type: 'survey', next: m };   // the first finished run on this phone: the survey first
    if (fl && run && fl.phase === 'build' && (m.type === 'news' || (m.type === 'hero' && m.entry))) notePreview();   // 1.24 (D, P0-6): the next wave looked at
    if (fl && run && fl.phase === 'raid' && m.type === 'hero') noteFearUi('card');   // 1.24 (D, P0-6): a hero card in the wave (it shows his fear)
    modalOpen = true; modalKind = m.type; curModal = m; ff = false; updateAction(); hideToast(); hideTip();
    const card = $('#card'); card.innerHTML = ''; const scr = m.type === 'shop' || m.type === 'wave' || m.type === 'end', top = m.type === 'breach'; card.className = 'card enter' + (scr ? ' screen' : '') + (top ? ' topsheet' : '');
    card.scrollTop = 0; $('#overlay').classList.toggle('screenbg', scr); $('#overlay').classList.toggle('top', top);   // 1.01: the breach sheet sits at the top, the map stays in view
    clearTimeout(openModal.t); openModal.t = setTimeout(() => card.classList.remove('enter'), 900);   // the entrance plays once, not on every tap inside
    ({ start: renderStart, menu: renderMenu, settings: renderSettings, tests: renderTests, upgrade: renderUpgrade, wave: renderWave, over: renderOver, name: renderName, unspent: renderUnspent, end: renderEnd, survey: renderSurvey, victory: renderVictory, card: renderCard, families: renderFamilies, item: renderItem, breach: renderBreach, hungerTip: renderHungerTip, onb: renderOnb, news: renderNews, shop: renderShop, hero: renderHero, esencja: renderEsencja, keys: renderKeys, heart: renderHeart, branch: renderBranch })[m.type](card, m);
    $('#overlay').hidden = false;
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(cls, title, sub, onClick) {
    const b = el('button', 'btn ' + (cls || '')); b.type = 'button';
    b.appendChild(el('b', null, title)); if (sub) b.appendChild(el('span', null, sub));
    b.addEventListener('click', onClick); return b;
  }
  // Records of this browser: best score, furthest wave, wins.
  function loadRecords() {
    const d = { best: loadBest(), wave: 0, wins: 0, runs: 0 };
    try { return Object.assign(d, JSON.parse(localStorage.getItem('yatd15-records') || '{}')); } catch (e) { return d; }
  }
  function saveRecords(r) { try { localStorage.setItem('yatd15-records', JSON.stringify(r)); } catch (e) {} }
  // Prototype 1.0, the web version: full screen from the tap that starts the game (Android; on an iPhone only "Add to Home Screen"
  // takes the browser away), the browser's install prompt when it offers one, and a plain line about what gets saved.
  const WEB = !!window.YATD_WEB;
  const deviceId = (() => { try { let d = localStorage.getItem('yatd-device'); if (!d) { d = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('yatd-device', d); } return d; } catch (e) { return 'nostore'; } })();
  // The survey after the first finished run (web version only). This phone remembers that it was answered or skipped, so it never
  // comes back on its own; the menu still offers it until it is answered.
  const surveyState = () => { try { return localStorage.getItem('yatd-survey') || ''; } catch (e) { return ''; } };
  const setSurveyState = v => { try { localStorage.setItem('yatd-survey', v); } catch (e) {} };
  const SURVEY = [
    { id: 'fun', q: L('Jak Ci się grało?', 'How was the game?'), nums: true, o: ['1', '2', '3', '4', '5'], scale: L(['nudno', 'świetnie'], ['boring', 'great']) },
    { id: 'clear', q: L('Czy było jasne, co masz robić?', 'Was it clear what to do?'), o: ['Tak, od początku', 'Po chwili tak', 'Długo nie', 'Do końca nie'], oe: ['Yes, from the start', 'After a while', 'Not for a long time', 'Not even at the end'] },
    { id: 'best', q: L('Co było najfajniejsze?', 'What was the most fun?'), o: ['Budowanie lochu', 'Pułapki w akcji', 'Skill checki', 'Straszenie bohaterów', 'Karty i sklep', 'Nic szczególnego'], oe: ['Building the dungeon', 'Traps in action', 'Skill checks', 'Scaring heroes', 'Cards and the shop', 'Nothing really'] },
    { id: 'worst', q: L('Co najbardziej przeszkadzało?', 'What bothered you most?'), o: ['Za dużo zasad i tekstu', 'Za długie fale albo run', 'Za trudno', 'Za łatwo', 'Sterowanie na telefonie', 'Nic'], oe: ['Too many rules and text', 'Waves or run too long', 'Too hard', 'Too easy', 'Phone controls', 'Nothing'] },
    { id: 'again', q: L('Zagrasz jeszcze raz?', 'Will you play again?'), o: ['Tak', 'Może', 'Nie'], oe: ['Yes', 'Maybe', 'No'] }
  ];
  function renderSurvey(card, m) {
    m.ans = m.ans || {};
    card.appendChild(el('div', 'sub', L('Ankieta · 5 pytań · około minuty', 'Survey · 5 questions · about a minute')));
    card.appendChild(el('h2', null, L('Jak było?', 'How was it?')));
    card.appendChild(el('p', 'note', L('Odpowiedzi trafią do autora razem z przebiegiem gry. Każde pytanie możesz pominąć.', 'Your answers go to the author with a record of your game. Every question is optional.')));
    const box = el('div', 'survey');
    SURVEY.forEach(Q => {
      const q = el('div', 'q'); q.appendChild(el('b', null, Q.q));
      const row = el('div', 'opts' + (Q.nums ? ' nums' : ''));
      Q.o.forEach((o, oi) => { const b = el('button', m.ans[Q.id] === o ? 'on' : '', PL || !Q.oe ? o : Q.oe[oi]); b.type = 'button'; b.dataset.v = o; b.addEventListener('click', () => { m.ans[Q.id] = m.ans[Q.id] === o ? undefined : o; row.querySelectorAll('button').forEach(x => x.classList.toggle('on', m.ans[Q.id] === x.dataset.v)); }); row.appendChild(b); });
      q.appendChild(row);
      if (Q.scale) { const s = el('div', 'scale'); s.appendChild(el('span', null, Q.scale[0])); s.appendChild(el('span', null, Q.scale[1])); q.appendChild(s); }
      box.appendChild(q);
    });
    const tq = el('div', 'q'); tq.appendChild(el('b', null, L('Coś jeszcze? (opcjonalnie)', 'Anything else? (optional)')));
    const ta = el('textarea'); ta.id = 'survey-text'; ta.maxLength = 1000; ta.placeholder = L('co zmienić, co dodać, co nie działa...', 'what to change, what to add, what is broken...'); ta.value = m.text || ''; ta.addEventListener('input', () => { m.text = ta.value; });
    tq.appendChild(ta); box.appendChild(tq);
    card.appendChild(box);
    const after = () => { if (m.next) openModal(Object.assign({}, m.next, { afterSurvey: true })); else { closeModal(); if (m.unpause && fl && fl.phase === 'raid') setPaused(false); } };
    const send = btn('primary', L('Wyślij', 'Send'), L('dzięki!', 'thanks!'), () => {
      const doc = { version: LOG_VERSION, device: deviceId, runId: run ? run.id : null, at: new Date().toISOString(), player: (playerName || '').slice(0, 40), playerId: playerIdNow(), lang: LANG, answers: Object.assign({}, m.ans), text: (m.text || '').slice(0, 1000),   // 1.24 (D): playerId
        run: run ? { result: runStatus(), waves: run.waves.length, total: Math.round(run.total), tutorial: run.tutorial, minutes: Math.round((Date.now() - run.startedAt) / 60000) } : null };
      setSurveyState('done');
      getDb().then(db => db && db.collection('survey').doc(deviceId + '_' + (run ? run.id : 'menu')).set(doc)).catch(() => {});
      after();
    }); send.id = 'survey-send';
    const skip = el('button', 'link', L('Pomiń ankietę', 'Skip the survey')); skip.type = 'button'; skip.id = 'survey-skip'; skip.addEventListener('click', () => { if (!surveyState()) setSurveyState('skipped'); after(); });
    card.appendChild(send); card.appendChild(skip);
  }
  const standalone = () => { try { return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function goFullscreen() {
    if (!WEB || standalone() || isFull() || UI.noFull) return;
    const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen; if (!f) return;
    try { const p = f.call(d, { navigationUI: 'hide' }); if (p && p.then) p.then(lockPhone, () => {}); } catch (e) {}
  }
  // 1.25: only a phone is held upright (a tablet may lie sideways: the panel layout); the installed app's manifest says 'any' now
  const phoneScreen = () => Math.min(screen.width || 0, screen.height || 0) < 600;
  function lockPhone() { if (phoneScreen()) try { screen.orientation.lock('portrait').catch(() => {}); } catch (e) {} }
  if (WEB && standalone()) lockPhone();
  function leaveFullscreen() { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f && isFull()) try { f.call(document); } catch (e) {} }
  let installEvt = null;
  const restart = () => { if (modalKind === 'start') { const c = $('#card'); c.innerHTML = ''; renderStart(c); } };   // the start card again, in place
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; restart(); });
  window.addEventListener('appinstalled', () => { installEvt = null; });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#start-tut, #start-play, #start-continue, #name-ok, #name-skip')) goFullscreen(); }, true);   // 1.24 (D): the name prompt's buttons start the run too
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });   // iPhone: no pinch zoom of the whole page
  function webStartRow(card) {
    if (!WEB) return;
    const row = el('div', 'webrow');
    if (!standalone()) {
      if (installEvt) { const ib = btn('', L('Zainstaluj grę', 'Install the game'), L('ikona na ekranie, pełny ekran, bez paska przeglądarki', 'home screen icon, full screen, no browser bar'), () => { const ev = installEvt; installEvt = null; ev.prompt(); (ev.userChoice || Promise.resolve()).then(restart); }); ib.id = 'start-install'; row.appendChild(ib); }
      else if (isIOS()) row.appendChild(el('p', 'note', L('iPhone: stuknij Udostępnij, a potem "Do ekranu początkowego". Gra otworzy się wtedy z ikony, na pełnym ekranie.', 'iPhone: tap Share, then "Add to Home Screen". The game then opens from its icon, full screen.')));
      else row.appendChild(el('p', 'note', L('Gra przejdzie na pełny ekran, gdy zaczniesz. Możesz też wybrać w menu przeglądarki "Dodaj do ekranu głównego".', 'The game goes full screen when you start. You can also pick "Add to Home screen" in the browser menu.')));
    }
    row.appendChild(el('p', 'note', L('Ta testowa wersja wysyła autorowi przebieg Twoich gier, żeby mógł ją poprawić. Bez danych osobowych, imię tylko wtedy, gdy je wpiszesz.', 'This test version sends the author a record of your games to help improve it. No personal data, and your name only if you type one.')));
    card.appendChild(row);
  }
  // 1.24 (D, P0-5): the web version asks for a name (or a nickname) before the first new run while none is set; "Pomiń" skips it
  // for good on this device (the field on the start card stays). Either way the run gets a playerId (p2 playerIdNow).
  const NAME_ASKED = 'yatd-name-asked';
  function withName(go) {
    let asked = ''; try { asked = localStorage.getItem(NAME_ASKED) || ''; } catch (e) {}
    if (!WEB || (playerName || '').trim() || asked) { go(); return; }
    openModal({ type: 'name', go });
  }
  function renderName(card, m) {
    card.appendChild(el('div', 'sub', L('Zanim zaczniesz', 'Before you start')));
    card.appendChild(el('h2', null, L('Jak masz na imię?', 'What is your name?')));
    card.appendChild(el('p', null, L('Imię albo pseudonim. Dzięki temu autor odróżni Twoje gry od gier innych osób, nawet na tym samym telefonie.', "A name or a nickname. It lets the author tell your games from other people's, even on the same phone.")));
    const lab = el('label', 'field'); lab.textContent = L('Imię albo pseudonim', 'Name or nickname');
    const inp = el('input'); inp.type = 'text'; inp.id = 'name-ask'; inp.maxLength = 40; inp.placeholder = L('np. Kasia', 'e.g. Sam'); inp.value = playerName || '';
    lab.appendChild(inp); card.appendChild(lab);
    const setAsked = v => { try { localStorage.setItem(NAME_ASKED, v); } catch (e) {} };
    const ok = btn('primary', L('Graj', 'Play'), null, () => {
      const v = inp.value.trim().slice(0, 40); if (!v) { inp.focus(); return; }
      playerName = v; try { localStorage.setItem('yatd-name', v); } catch (e) {}
      setAsked('name'); playerIdNow(); m.go();
    }); ok.id = 'name-ok';
    const skip = el('button', 'link', L('Pomiń', 'Skip')); skip.type = 'button'; skip.id = 'name-skip';
    skip.addEventListener('click', () => { setAsked('skipped'); playerIdNow(); m.go(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } });
    card.appendChild(ok); card.appendChild(skip);
  }
  function renderStart(card) {
    card.appendChild(el('div', 'sub', 'Prototype 1.28.0 · ' + L('10 fal', '10 waves')));
    card.appendChild(el('h1', null, 'You are the dungeon'));
    card.appendChild(el('p', null, L('Jesteś lochem. Bohaterowie przychodzą falami po kryształy z Twojego serca, a Ty bronisz go pułapkami, potworami i łupem. Przetrwaj 10 fal.', 'You are the dungeon. Heroes come in waves to steal the crystals from your heart, and you defend it with traps, monsters and loot. Survive 10 waves.')));
    const rec = loadRecords();
    if (rec.best || rec.runs) card.appendChild(el('p', 'note', L('Twój rekord: ' + Math.round(rec.best) + ' Esencji w jednym runie (ranga: ' + rankOf(rec.best).name + ')', 'Your best: ' + Math.round(rec.best) + ' Essence in one run (rank: ' + rankOf(rec.best).name + ')') + (rec.wave ? L(' · najdalej: fala ', ' · furthest: wave ') + rec.wave : '') + (rec.runs ? L(' · wygrane: ' + rec.wins + ' z ' + rec.runs, ' · wins: ' + rec.wins + ' of ' + rec.runs) : '') + '.'));
    const lab = el('label', 'field'); lab.textContent = L('Imię testera (opcjonalnie)', 'Tester name (optional)');
    const inp = el('input'); inp.type = 'text'; inp.id = 'player-name'; inp.maxLength = 40; inp.value = playerName; inp.placeholder = L('np. imię znajomego', "e.g. a friend's name");
    inp.addEventListener('input', () => { playerName = inp.value; try { localStorage.setItem('yatd-name', playerName); } catch (e) {} });
    lab.appendChild(inp);
    { const tw = el('details', 'testers'); tw.id = 'start-testers'; tw.appendChild(el('summary', null, L('Dla testerów', 'For testers'))); tw.appendChild(lab); if (playerName) tw.open = true; card.appendChild(tw); }   // 1.27: a tester thing, folded
    const box = el('div', 'startbtns');
    const sv = loadSave();
    if (sv) {
      const c = btn('primary big', sv.run.tutorial && sv.run.tut >= 0 ? L('Kontynuuj samouczek', 'Continue tutorial') : L('Kontynuuj run', 'Continue run'), L('fala ', 'wave ') + sv.run.wave + (sv.stage === 'summary' ? L(' zakończona', ' over') : '') + L(' · zebrano ' + Math.round(sv.run.total) + ' Esencji · zapis z ', ' · ' + Math.round(sv.run.total) + ' Essence gathered · saved ') + new Date(sv.at).toLocaleString(PL ? 'pl-PL' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }), () => { closeModal(); userStarted = true; if (!resumeRun()) { setHint(L('Nie udało się wczytać zapisu.', 'Could not load the save.')); openModal({ type: 'start' }); } });
      c.id = 'start-continue'; box.appendChild(c);
    }
    // 1.12: the first four runs open the game step by step (the first one with the guide); "Pomiń samouczek" opens it all
    const onb = onbStage(), lost = sv ? L(' · zapisany run przepadnie', ' · your saved run will be lost') : '';
    const drop = () => { if (sv) onbDone(Object.assign({}, sv.run, { result: 'quit' })); };   // a run of the first ones left after wave 5 counts as played
    if (onb <= 1) {   // 1.24 (B): one guided run opens the game with its waves; a browser in the middle of the old four runs plays the full game
      const first = !coachDone();
      const a = btn((sv ? '' : 'primary ') + 'big', first ? L('Samouczek', 'Tutorial') : L('Nowy run', 'New run'), (first ? L('Pierwszy run z przewodnikiem', 'Your first run, with a guide') : L('Pierwszy run: gra odsłania się fala po fali', 'First run: the game opens up wave by wave')) + lost, () => withName(() => { closeModal(); userStarted = true; drop(); startGuided(); })); a.id = 'start-tut';   // 1.24 (D): withName
      const b = btn('big', L('Pomiń samouczek', 'Skip tutorial'), L('Cała gra od razu', 'The whole game at once') + lost, () => withName(() => { closeModal(); userStarted = true; setOnb(5); newRun(false); })); b.id = 'start-play';
      box.appendChild(a); box.appendChild(b);
    } else {
      const b = btn((sv ? '' : 'primary ') + 'big', L('Nowy run', 'New run'), sv ? L('zapisany run przepadnie', 'your saved run will be lost') : L('Pełna gra', 'Full game'), () => withName(() => { closeModal(); userStarted = true; newRun(false); })); b.id = 'start-play';   // 1.24 (D): withName
      const a = btn('big', L('Samouczek', 'Tutorial'), L('Od nowa: run z przewodnikiem, gra odsłania się fala po fali', 'From scratch: a guided run that opens up wave by wave') + lost, () => withName(() => { closeModal(); userStarted = true; setOnb(1); try { localStorage.removeItem(COACH_KEY); localStorage.removeItem(POPS_KEY); } catch (e) {} startGuided(); })); a.id = 'start-tut';
      box.appendChild(b); box.appendChild(a);
    }
    card.appendChild(box);
    webStartRow(card);
    const how = el('details'); how.id = 'start-how'; how.appendChild(el('summary', null, L('Jak grać', 'How to play')));
    // 1.27 (UI/UX, author: general things clear, details in small print): a few short sections, one idea per line
    [[L('Cel', 'Goal'), [
       L('Bohaterowie chcą kryształu z Twojego serca (ostatni pokój). Kto go wyniesie z lochu, zabiera Ci go na dobre. Bez kryształów run się kończy.', 'Heroes want a crystal from your heart (the last room). If one carries it out, it is gone for good. Lose them all and the run is over.'),
       L('Przetrwaj 10 fal. Ostatnią prowadzi bohater z przepowiedni.', 'Survive 10 waves. The hero of the prophecy leads the last one.')]],
     [L('Budowa', 'Building'), [
       L('Między falami stawiasz elementy z paska budowy. Przytrzymaj kafelek, żeby zobaczyć, co robi.', 'Between waves you place elements from the build bar. Hold a tile to see what it does.'),
       L('Postawiony element: stuknij, żeby przenieść, stuknij dwa razy, żeby ulepszyć, przytrzymaj, żeby sprzedać.', 'A placed element: tap to move it, double-tap to upgrade it, hold to sell it.'),
       L('Szybciej: dwa stuknięcia w wolne miejsce stawiają jeszcze raz ostatni element, a w karcie elementu "Ulepsz wszystkie w pokoju" ulepsza wszystkie takie same naraz.', 'Faster: double-tap a free spot to place your last element again, and "Upgrade all in this room" in an element\'s card upgrades all the same ones at once.'),
       L('Karty w talii i schowku (w sklepie albo w zakładce Talia, między falami): przeciągnij kartę na inne miejsce, żeby zmienić kolejność (Kopista kopiuje kartę po prawej) albo przenieść ją do schowka i z powrotem; upuszczona na inną kartę zamienia się z nią. Przytrzymaj kartę, żeby ją sprzedać.', 'Cards in the deck and the stash (in the shop or the Deck tab, between waves): drag a card to another place to change the order (Copyist copies the card to its right) or to move it to the stash and back; dropped on another card, they swap. Hold a card to sell it.'),
       L('Liczba przy pokoju to głębia: im bliżej serca, tym więcej dostajesz za bohaterów. Kropki to wolne miejsca.', 'The number by a room is its depth: the closer to the heart, the more the heroes are worth. Dots are free slots.')]],
     [L('Esencja', 'Essence'), [
       L('Rany i strach dają Grozę. Groza × Chciwość × Combo to Esencja, za którą budujesz.', 'Wounds and fear give Dread. Dread × Greed × Combo is Essence, which you build with.'),
       L('Combo rośnie, gdy różne pułapki trafiają jedna po drugiej. Chciwość rośnie, gdy bohaterowie widzą i zbierają łup.', 'Combo grows when different traps hit one after another. Greed grows when heroes see and grab loot.')]],
     [L('Serce', 'The heart'), [
       L('Od fali 2 serce je pierwsze: bierze swoją porcję Esencji z fali. Gdy fala da za mało, dopłacasz z sakiewki, a gdy i tego zabraknie, pęka kryształ.', 'From wave 2 the heart eats first: it takes its share of the Essence a wave brings. If the wave falls short, you pay from your purse, and if that runs out too, a crystal breaks.'),
       L('Syte serce rośnie i daje darmowe karty. Stuknij serce u góry ekranu, żeby zobaczyć szczegóły.', 'A full heart grows and gives free cards. Tap the heart at the top of the screen for details.')]],
     [L('Fala', 'The wave'), [
       L('Gdy bohater wejdzie w pułapkę, pojawi się skill check: stuknij mapę, gdy koralik jest w obwódce. Wypełniona strefa to krytyk.', 'When a hero steps into a trap, a skill check appears: tap the map while the bead is inside the outline. The filled zone is a crit.'),
       L('Przytrzymaj palec na mapie, żeby przyspieszyć. Pułapki biją wtedy same, bez skill checków, więc nie trafisz nowego krytyka.', "Hold a finger on the map to speed up. Traps then fire on their own, with no skill checks, so you won't land a new crit."),
       L('Stuknij bohatera, żeby zobaczyć, kim jest i czego się boi.', 'Tap a hero to see who they are and what they fear.')]],
     [L('Karty', 'Cards'), [
       L('Po każdej przetrwanej fali dostajesz darmową kartę, a w sklepie kupisz kolejne. Karty z talii działają do końca runu.', 'After every wave you survive you get a free card, and you can buy more in the shop. Cards in your deck work for the rest of the run.')]],
     [L('Z czasem', 'Later on'), [
       L('Z kolejnymi falami dochodzą straszenie, omeny, gildia ze specjalistami, obiekty i komnaty. Gra powie o nich, gdy się pojawią.', 'As the waves go on you unlock fear, omens, the guild and its specialists, objects and lairs. The game tells you about each one when it appears.')]]
    ].forEach(([hd, items]) => { how.appendChild(el('h3', 'howh', hd)); const ul = el('ul', 'conseq'); items.forEach(t => ul.appendChild(el('li', null, t))); how.appendChild(ul); });
    card.appendChild(how);
    const nw = el('details'); nw.id = 'start-new'; nw.appendChild(el('summary', null, L('Co nowego w Prototype 1.28.0', "What's new in Prototype 1.28.0")));
    const ul0 = el('ul', 'conseq');
    [L('1.28.0: płynniej na dużym lochu. Ściany rysują się raz i są potem tylko wklejane, a gdy kafelki są małe, drobne detale znikają wcześniej.', '1.28.0: smoother on big dungeons. Walls are drawn once and then just pasted, and when tiles are small, tiny details drop out sooner.'),
     L('1.28.0: w Ustawieniach Grafika: Auto (sama zmniejsza detale, gdy urządzenie nie nadąża), Pełna albo Oszczędna.', '1.28.0: Graphics in the Settings: Auto (lowers details by itself when the device cannot keep up), Full or Saver.'),
     L('1.27.8: karty w talii i schowku przeciągasz jak obiekty: na inne miejsce (kolejność, np. co kopiuje Kopista), do schowka i z powrotem, na inną kartę, żeby je zamienić. Przytrzymanie sprzedaje kartę. Kafelek Kopisty mówi, co kopiuje.', '1.27.8: you drag deck and stash cards like objects: to another place (the order, e.g. what Copyist copies), to the stash and back, onto another card to swap them. Holding a card sells it. Copyist\'s tile says what it copies.'),
     L('1.27.7: Łucznik to teraz goblin z łukiem i kołczanem (należy do Zielonoskórych), a nie szkielet.', '1.27.7: the Archer is now a goblin with a bow and a quiver (he is a Greenskin), not a skeleton.'),
     L('1.27.7: opisy elementów mają więcej znaczników: gdzie stoi (Podłoga, Ściana, Drzwi, Na meblu, Potwór, Łup, Obiekt), jak daleko sięga (Zwarcie, Dystans, Obszar, Jedno pole) i rodzinę.', '1.27.7: element descriptions have more tags: where it goes (Floor, Wall, Door, On furniture, Monster, Loot, Object), its reach (Melee, Ranged, Area, One tile) and its family.'),
     L('1.27.6: opis karty w sklepie już nie znika. Gdy przy pięciu ofertach i pełnej talii brakuje miejsca, karty układają się w jeden rząd przewijany w bok.', '1.27.6: the card text in the shop no longer vanishes. When five offers and a full deck leave no room, the cards line up in one row you swipe sideways.'),
     L('1.27.5: serce rośnie najwyżej o 1 poziom na falę. Nadmiar Nasycenia czeka w pasku i da poziom na początku następnej budowy.', '1.27.5: the heart grows at most 1 level per wave. Extra Satiety waits in the bar and gives a level when the next build starts.'),
     L('1.27.5: karty z Daru serca nie zajmują miejsc w talii (mają swój rząd Serce). Poziomy serca nie dają już miejsc w talii.', "1.27.5: Heart's Gift cards no longer take deck slots (they have their own Heart row). Heart levels no longer add deck slots."),
     L('1.27.5: Serce lochu, Rezonans i Głodomór są zwykłymi legendarnymi kartami w sklepie (każda raz na run). Żarłoczne serce trafia się w Darze najwyżej raz na run.', "1.27.5: Heart of the Dungeon, Resonance and Glutton are ordinary legendary shop cards (one of each per run). Ravenous Heart shows up in the Heart's Gift at most once a run."),
     L('1.27.5: przycisk Wypuść falę pokazuje głód serca i Twój zapas. Czerwony napis: zapasu prawie nie ma, a słabsza fala może kosztować kryształ.', '1.27.5: the Release wave button shows the heart\'s hunger and your reserve. Red text: almost no reserve, and a weaker wave may cost a crystal.'),
     L('1.27.5: wszystko poza bohaterami i potworami jest teraz bryłą 3D: pułapki (Portret, Lustro, Oczy, Strzały, Ogień, Wahadło, Runa piorunów, Wnyki, Przynęta, Zapadnia, Klatka, Sieć), serce, drzwi, pochodnie, łup, rekwizyty i ozdoby ścian komnat i efektów. Przy wystrzale lecą iskry, bełty, płomień albo błyskawice.', '1.27.5: everything except heroes and monsters is now a solid 3D shape: traps (Portrait, Mirror, Eyes, Arrows, Fire, Pendulum, Lightning Rune, Snare, Bait, Trapdoor, Cage, Web), the heart, doors, torches, loot, and the props and wall pieces of rooms and effects. When traps fire you see sparks, bolts, a flame or lightning.'),
     L('1.27.5: efekty pokojów wyglądają jak komnaty: własna podłoga, małe przedmioty 3D, cząsteczki w powietrzu i ozdoby na ścianach (np. bąble w Bagnie, krople w Grocie, śnieg w Lodowni, kręcące się zębatki).', '1.27.5: room effects look like proper rooms: their own floor, small 3D props, particles in the air and wall details (bubbles in the Swamp, drips in the Grotto, snow in the Icehouse, turning cogs).'),
     L('1.27.5: szybsza budowa. W opisie elementu przycisk Ulepsz wszystkie w pokoju (te same na tym samym poziomie), a dwa stuknięcia w wolne pole stawiają jeszcze raz to, co ostatnio.', '1.27.5: faster building. The element card has Upgrade all in room (the same ones at the same level), and a double tap on a free spot places your last element again.'),
     L('1.27.4: Głusza słabsza. Zgubiony w niej bohater po 8 s sam znajduje drogę, a strach rośnie tam o 10% (było 20%). Po końcu cierpliwości zgubieni też sami wracają do wyjścia.', '1.27.4: a weaker Hush. A hero lost in it finds his own way after 8 s, and fear there grows by 10% (was 20%). Once patience runs out, lost heroes also walk out on their own.'),
     L('1.27.4: karty w sklepie są pionowe jak prawdziwe karty: obrazek na całą kartę, nazwa i cena na dole. Na niskim telefonie przewijasz je w bok jak pasek budowy. Odśwież działa też w Darze serca.', '1.27.4: shop cards stand upright like real cards: the picture fills the card, the name and price sit at the bottom. On a short phone you scroll them sideways like the build bar. Refresh works in the Heart\'s Gift too.'),
     L('1.27.4: fala trwająca ponad 4 minuty sama wysyła do analizy, co robią bohaterowie, a plik runu z Menu zawiera też trwającą falę.', '1.27.4: a wave that lasts over 4 minutes reports what the heroes are doing, and the run file from the Menu includes the wave in progress.'),
     L('1.27.3: bohaterowie już nie znikają przy końcu fali. Kto utknie albo kręci się w miejscu, sam idzie do wyjścia najkrótszą drogą, mija przyjaciół i walczy tylko z potworem, który zastąpi mu drogę.', '1.27.3: heroes no longer vanish at the end of a wave. One who gets stuck or shuffles in place walks out on his own by the shortest way, past his friends, fighting only a monster that blocks his way.'),
     L('1.27.3: sklep jak w karciance. Oferty to karty z obrazkiem, nazwą, ramką rzadkości i ceną. Stuknij kartę, a jej opis i przycisk pojawią się pod spodem. Runa rodu i Dar serca też są kartami, w swojej ramce.', '1.27.3: a card-game shop. Offers are cards with a picture, a name, a rarity frame and a price. Tap a card and its text and button show below. The Family Rune and the Heart\'s Gift are cards too, in their own frame.'),
     L('1.27.2: poprawki. Zakładka Obiekty nie znika w samouczku (do fali 5 jest wyszarzona z kłódką), potwory po odrodzeniu nie są już białe, a opis kafelka po przytrzymaniu palca pojawia się raz.', '1.27.2: fixes. The Objects tab no longer vanishes in the tutorial (until wave 5 it is dimmed with a lock), revived monsters are no longer white, and a tile description shows once when you hold a finger.'),
     L('1.27.1: kafelki w pasku budowy mają tło w kolorze rodziny (Mechanizmy niebieskie, Ogień pomarańczowy, Nawiedzenie fioletowe...), więc łatwiej je rozróżnić.', '1.27.1: tiles in the build bar have a backdrop in their family colour (Mechanisms blue, Fire orange, Haunting violet...), so they are easier to tell apart.'),
     L('1.27.1: w zakładce Talia kafelek Rodziny pokazuje poziom każdej rodziny i to, co dają Runy rodów.', '1.27.1: in the Deck tab the Families tile shows each family level and what the Family Runes give.'),
     L('1.27.1: Danina napełnia złoty pasek od razu, jak głód serca, bez czekania na koniec combo.', '1.27.1: the Tithe fills the gold bar right away, like the hunger bar, without waiting for the combo to end.'),
     L('1.27.1: po kupnie Runy rodu jej miejsce w sklepie zostaje puste i nic się nie przesuwa. Równanie Esencji wysuwa się na początku fali i chowa po jej końcu, a znaczek omenu wygląda jak reszta interfejsu.', '1.27.1: after you buy a Family Rune its shop slot stays empty and nothing moves. The Essence equation slides in when a wave starts and away when it ends, and the omen badge matches the rest of the UI.'),
     L('Gra jest teraz po angielsku, a polski wybierzesz w Ustawieniach. Polskie teksty są przepisane: krótsze i prostsze.', 'The game is now in English; Polish is in the Settings. The Polish texts were rewritten to be shorter and plainer.'),
     L('Pasek budowy po nowemu: pułapki dzielą się na Ranią, Trzymają, Osłabiają i Straszą, potwory na Walczą, Wspierają i Straszą.', 'A new build bar: traps are split into Hurt, Bind, Weaken and Scare, monsters into Fight, Support and Scare.'),
     L('Opis elementu mówi jednym zdaniem, co robi, a liczby i wyjątki są drobnym drukiem pod spodem.', "An element's description says what it does in one sentence, with the numbers and exceptions in small print below."),
     L('Czempion i bohater z przepowiedni mają swoją kartę w wieściach z karczmy i na ekranie po fali, jak omeny: kto to, co robi i co dostaniesz.', 'The champion and the hero of the prophecy get their own card in the tavern news and on the summary screen, like omens: who they are, what they do and what you get.'),
     L('Spokojniejszy ekran: równanie Esencji widać tylko w fali, wolne miejsca w pokoju to kropki, a koszt na kafelku ma znaczek kropli Esencji.', 'A calmer screen: the Essence equation shows only during a wave, free room slots are dots, and tile costs carry an Essence drop.')
    ].forEach(t => ul0.appendChild(el('li', null, t)));
    nw.appendChild(ul0);
    const ul2 = el('ul', 'conseq');
    if (PL) [
     '1.26.1: Ukryte przejście (zakładka Loch, 6 Esencji). Maskujesz przejście między pokojami fałszywą ścianą: bohaterowie widzą mur i idą dłuższą drogą, dopóki ktoś go nie odkryje (najczęściej złodziej i tropiciel). Odkryte jest zwykłym skrótem, a uciekinier opowie o nim następnej fali. Do serca musi zostać jawna droga.',
     '1.26.1: brakujące zachowania. Ogar piekielny idzie za krwawiącym do sąsiedniego pokoju (i wraca na miejsce w następnej budowie). Goblin saper chowa się za innymi potworami. Przesądny nie wchodzi pierwszy do pokoju z portretem albo lustrem, Ciekawski idzie sprawdzić usłyszaną pułapkę i dokładniej przeszukuje meble, Zapaleniec szarżuje na każdego potwora.',
     '1.26.1: Dar serca po nowemu. Karty grupy Serce są tylko w rzędzie Dar serca (nie ma ich w zwykłym sklepie, więc darmowa karta z poziomu serca nie jest już tańsza od tego, co kupisz za Esencję). W rzędzie są tylko karty rzadkie (70%) i legendarne (30%), a do grupy doszło 8 uniwersalnych kart: Wola serca, Groza serca, Złote tętno, Cierpliwość serca, Rozrost serca, Serce lochu, Drugie serce i Rezonans.',
     '1.26.1: poprawki zasad. Wnyki rozbraja się 1,5 raza dłużej, flaszka alchemika wyłącza strefę na 6 s (potem wraca), oślepieni bohaterowie nie zapamiętują pułapek, Pożar podpala 2 razy dłużej, Wyziewy przy pierwszym kontakcie dają jeden stos trucizny, Runa rodu wydłuża też statusy swojej rodziny, karty i Strażnik wzmacniają też zdolności potworów.',
     '1.26: serce zabiera. Głodne serce po fali bierze brak z Twojej sakiewki, a kryształ pęka dopiero, gdy sakiewka nie wystarczy. Syte serce bierze Daninę (30% wypłat) w Nasycenie i rośnie poziomami. Stuknij serce u góry: zasady, z czego jest głód i co da następny poziom.',
     '1.26: Dary serca są kartami. Po każdym poziomie serca w sklepie czeka rząd Dar serca: 3 karty grupy Serce, jedna za darmo. Poziomy 2, 4 i 6 dają miejsce w talii, 3, 5 i 7 mogą odrodzić kryształ (Odrost). Ofiara w budowie: Esencja w Nasycenie 1:1.',
     '1.26: 10 nowych pułapek (wahadło, wnyki, wyziewy, plama oleju, runa piorunów, zalewnia, dzwon żałobny, fałszywe przejście, kocioł smoły, przynęta) i 10 nowych potworów (szkielet, zombie, licz, chochlik, ogar piekielny, kusicielka, demon otchłani, goblin saper, herszt, rój szczurów). Odblokujesz je kartami.',
     '1.26: statusy i reakcje. Elementy nakładają stany (ikonki nad bohaterem), a status z właściwymi obrażeniami daje reakcję: Pożar, Detonację, Porażenie, Parę. Nowy typ obrażeń: porażenie.',
     '1.26: rodziny i Runy rodów. Każdy element należy do rodziny, a Runa rodu ze sklepu wzmacnia całą rodzinę (do 5 poziomów). Trzy nowe komnaty: Laboratorium, Cmentarz, Wrota otchłani.',
     '1.26: 3. poziom z wyborem A albo B dla każdego elementu, także starych.',
     '1.26: potwory się odradzają. Powalony potwór wstaje w następnej budowie, a serce zje za niego o 1 Esencję więcej. Bohater zabity przez potwora karmi serce (Uczta).',
     '1.26: nowi bohaterowie. Paladyn i tropiciel od fali 4, alchemik od fali 6, kultysta z omenem Pielgrzymka. 4 nowe cechy (przesądny, ciekawski, lojalny, zapaleniec) i 4 fobie (umarli, otchłań, hałas, roje). Serce krzyczy na kradnących, a zgraja potworów odstrasza drużynę od pokoju.',
     '1.26: omeny fal 3, 6 i 8 (Oblężenie, Elita, Inkwizycja, Saperzy, Pośpiech, Krwawy księżyc, Złoty szał, Mgła wojny, Pielgrzymka, Noc strachu).',
     '1.26: 34 nowe karty, w tym mnożniki Esencji (Koronacja strachu, Krwawa łaźnia, Przeklęta korona...), karty rosnące, Kopista i Lustro duszy (kolejność talii ma znaczenie: przesuniesz kartę w jej opisie).',
     '1.26: nowa ekonomia. Tańsze elementy i budowle, dochód 6 po fali, start z 25 Esencji. Ilustracje kart, ikonki statusów, nowe kafelki i więcej detalu w pikselowej grafice; posąg jest teraz trójwymiarowy jak inne obiekty.',
     '1.25.1: łagodniejszy początek runu. Fale 1-4 w połowie drogi między 1.24 a wcześniejszymi wersjami (fala 1 jak dawna druga), od fali 5 bez zmian. Pierwszy run z przewodnikiem ma znowu dawną, łagodną krzywą.',
     '1.25.1: pytanie o niewydaną Esencję podpowiada, co kupić: jeden albo dwa elementy z powodem (np. pasuje na trasę bohaterów). Stuknięcie wybiera element, a Buduj dalej podświetla podpowiedzi w pasku.',
     '1.25: telefon, tablet i komputer. Na tablecie i dużym ekranie interfejs jest większy, a na ekranie szerszym niż wysokim budowa jest w panelu po prawej, HUD w lewym górnym rogu mapy, a mapa zajmuje resztę.',
     '1.25: mysz i touchpad. Przeciąganie przesuwa mapę także po włączeniu przyspieszenia i gdy widać cały loch, kółko przybliża, touchpad przesuwa mapę dwoma palcami i przybliża szczypaniem. Prawy przycisk: na kafelku opis, na postawionym elemencie zdjęcie (drugie kliknięcie potwierdza). Najechanie myszką pokazuje opis kafelka, elementu i bohatera.',
     '1.25: klawiatura. WASD i strzałki przesuwają mapę, + i - przybliżają, 1-9 wybierają kafelki (numer w rogu), Q i E zmieniają zakładkę, Enter wypuszcza falę, B zwija budowę. Pełna lista: Menu > Sterowanie.',
     '1.24: połączone karty. Druga kopia karty (ze sklepu, darmowego wyboru albo ze schowka) łączy się z pierwszą w złotą kartę ★: zajmuje jedno miejsce, działa jak 2,5 kopii i dostaje cechę swojej grupy (np. jej pułapka działa jak o poziom wyżej, +2 Esencji po fali, darmowe odświeżenie sklepu). Sprzedana daje cenę dwóch. Sklep pisze "Połączy się w ★".',
     '1.24: zapadnia kosztuje 6. Bohater spada najwyżej 2 razy na falę (elita i poziom 12+: raz), potem widzi zapadnie i już mu nie grożą ("Zapadnie: 2/2" na karcie bohatera).',
     '1.24: koniec fali. Minutę po końcu cierpliwości bohaterowie są wyczerpani ("Wyczerpany") i wychodzą z lochu na własnych nogach, zamiast znikać. Tylko ktoś, kto utknął, ucieka sam ("Ucieka") 2,5 minuty po końcu cierpliwości.',
     '1.24: trudniejszy początek runu. Pierwsza fala jest jak dawna trzecia, druga i trzecia są trochę mocniejsze, od piątej fali bez zmian. Pierwsza fala samouczka zostaje łagodna.',
     '1.24: spokojniejsze checki na start. W falach 1-2 (i w samouczku) po każdym checku następny dopiero po 1,5 s; pułapki, które w tym czasie chcą checku, biją same jak draśnięcie. Okno draśnięcia w kręgu (zapadnia, klatka, kości) i w wahadle (potwory) jest szersze, krytyk bez zmian.',
     '1.24: niewydana Esencja. Licznik Esencji pulsuje, gdy stać Cię na jakiś element, a przed falą, gdy zostało ponad pół Esencji z początku budowy, gra pyta, czy na pewno ("Nie pytaj więcej" zapamiętuje ten telefon).',
     '1.24: głód widać. Gdy serce zje kryształ, mówi to napis nad sercem i linia w podsumowaniu fali, a w budowie wiersz serca ostrzega (⚠), gdy ostatnia fala dała za mało na następną.',
     '1.24: więcej dramatów. Zakłady, kłótnie, bunty, rozłamy, żałoba, docinki rywali, ostatni bastion (także za ciężko rannym przyjacielem) i przekazanie kryształu zdarzają się częściej, a każdy ma napis nad bohaterem.',
     '1.24: mapa bez ramki. Loch wypełnia cały ekran, a pasek u góry, równanie, pasek budowy i przyciski stoją na nim na lekkim cieniu. Trzymając telefon poziomo, masz przyciski w kolumnie po prawej, a mapę po lewej.',   // 1.24 (B)
     '1.24: ściany od frontu. Na niskich, ściętych ścianach też postawisz pułapkę ścienną: przy wyborze strzał, ognia, portretu, oczu albo lustra pokazują ramkę ze strzałką w stronę pokoju, w który strzelą.',
     '1.24: nauka w jednym runie. Pierwszy run odsłania grę z falami: od fali 3 straszenie, od fali 5 gildię, budowle i typy pokoi, od fali 7 ciała, fobie, powracających i wyłom. Kolejne runy to od razu cała gra. Samouczek jest krótszy: stawiasz raz (kolce na trasie), przytrzymujesz kafelek, żeby przeczytać opis, a łup i kopanie tylko poznajesz.',
     '1.24: kto przyjdzie. W budowie u góry mapy widać następną drużynę bez stukania: ile ich jest, klasy i poziomy, czempiona (korona), uzdrowicieli (zielony krzyżyk) i ich charaktery. Stuknięcie rozwija listę.',
     '1.24: strach widać. Nad każdym bohaterem pod paskiem życia jest grubszy fioletowy pasek strachu (pełny: ucieka), w podsumowaniu fali linia "Wystraszeni: X (Y pkt)", a w opisie elementu słowo Rani albo Straszy.',
     '1.24: animacje. Tarcza wojownika, światło kapłana, kula ognia i zakłócenie maga, nuty barda, furia i cios barbarzyńcy, iskry przy rozbrajaniu, unik, mikstura, talizman, amulet, buty, rzucona bomba, latarnia i łom; każda pułapka ma swój ruch (kolce, strzały, płomień, krata, zapadnia, klatka, sieć, proch, mimik, portret, oczy, lustro, trumna, kości, pozytywka, zawiasy). Bez nich przy ograniczonym ruchu.',
     '1.24: telefon się nie grzeje. Gdy nic się nie dzieje (budujesz i 2 s niczego nie dotykasz, pauza, ekrany między falami), obraz stoi i nie jest rysowany od nowa; budowa idzie w 30 klatkach na sekundę, fala najwyżej w 60 (także na ekranach 90/120 Hz). Wygląd i zasady bez zmian.',   // 1.24 (C)
     '1.24: szaman i krata. Leczenie szamana widać (zielone "+N" nad potworem), a za każde leczenie dostajesz odrobinę Grozy (karta szamana pokazuje Esencję i wyleczone HP). Krata zamyka się dopiero, gdy bohater jest najwyżej pole od drzwi.',   // 1.24 (C, addendum 2)
     '1.23: Nemezis. Bohater, który wraca drugi raz albo uciekł z kryształem, staje się Nemezis: ma przydomek ("Borys Niezłomny", "Wanda Złodziejka Kryształu"), +2 poziomy, o 40% więcej odwagi, talizman albo amulet więcej i nie ucieka ze strachu, dopóki ma więcej niż 15% życia. Najwyżej dwóch naraz.',
     '1.23: Nemezis pamięta. Pokoje, w których był, drużyna zna od wejścia (jak z mocnej plotki), a znane tam pułapki są od razu wykryte. Ostrzega przed pokojem z pułapką, którą pamięta, i prowadzi drużynę, jeśli nikt nie ma wyższej rangi.',
     '1.23: uraza. To, co go najbardziej zraniło albo przestraszyło (pułapka albo potwór), jest na jego karcie ("Uraza: ..."). Gdy to zobaczy, idzie po to: złodziej rozbraja, barbarzyńca rozbija, inni omijają (podwójne niebezpieczeństwo), a z potworem walczy o 25% mocniej.',
     '1.23: nagroda za głowę. Gdy w fali jest Nemezis, lista drużyny i podsumowanie pokazują "Nagroda za głowę: N Esencji" (10 + 5 za każdy powrót). Zabij go, a dostaniesz ją od razu. Ucieknie: wróci znowu, z wyższą nagrodą.',
     '1.23: polegli. Karczma pamięta, gdzie w Twoim lochu ginęli bohaterowie (ostatnich 12): bohater następnych fal, wchodząc do takiego pokoju, czasem wspomina poległego po imieniu (najwyżej 3 razy na falę). Liczby: nowa komórka "Nemezis".',
     '1.22: eskorta kryształu. Gdy ktoś niesie kryształ, przywódca (albo najsilniejszy) każe go otoczyć: kto widzi niosącego, idzie tuż przy nim (wojownik z przodu) zamiast każdy swoją drogą do wyjścia. Strażnik obok niosącego bierze na siebie połowę ciosu potwora (wojownik 70%). Eskorta ma słaby złoty krąg.',
     '1.22: przekazanie kryształu. Niosący z mniej niż 35% życia oddaje kryształ zdrowszemu (60%+) towarzyszowi tuż obok (najwyżej 2 razy na falę, nie częściej niż co 6 s).',
     '1.22: ostatni bastion. Gdy duch, cień, nietoperze albo potwór, z którym ktoś walczy, są 3 pola od niosącego, odważny (wojownik i barbarzyńca co drugi raz) staje w najbliższych drzwiach między nim a niosącym i trzyma go do 8 s albo do 25% życia, a potem ucieka. Latające potwory biorą się za niego. Raz na falę.',
     '1.22: poświęcenie. Gdy jedyna znana droga do wyjścia prowadzi przez znaną, naładowaną pułapkę, jeden z nich wchodzi w nią celowo, a reszta czeka, aż się odpali, i przebiega w czasie odnowienia. Raz na falę.',
     '1.22: "ty pierwszy". Tchórz albo ostrożny przed pokojem ze znaną pułapką posyła przodem kogoś innego (najchętniej rekruta albo rywala) i sam czeka 1,5 s. Ostrożny (albo złodziej-rekrut) wchodząc do nowego pokoju czasem opukuje podłogę: idzie tam o 30% wolniej, ale ukryte kolce, zapadnię, klatkę czy sieć tuż przy swojej drodze znajduje z szansą 35%.',
     '1.22: "nie tędy". Weteran albo ten, kogo zraniła tam pułapka, nie chce iść przez pokój ze znaną pułapką, która w tej fali kogoś zraniła, i przywódca wybiera inny cel, jeśli jakiś jest (raz na falę).',
     '1.22: szyk w walce. Wojownik staje z przodu i to on dostaje ciosy, kapłan i mag trzymają się 2+ pola od potwora, a ranny poniżej 30% cofa się za wojownika na 4 s. Niosący 6 pól od wyjścia mówi, że już blisko. Liczby: nowa komórka "Finał".',
     '1.21: więzi. Część bohaterów przychodzi parami: przyjaciele, rodzeństwo, rywale, mistrz z uczniem (rekrutem). Para pokazuje się na liście następnej drużyny i na karcie bohatera ("Przyjaciel: Borys", "Rywalka: Wanda"); na początku fali i czasem w pogawędce mówią coś do siebie.',
     '1.21: żałoba i zemsta. Gdy ginie ktoś z pary, drugi (jeśli to widzi, słyszy albo się dowie) opłakuje go po imieniu i boi się o połowę bardziej. Odważny, barbarzyńca, a czasem wojownik przysięga zemstę: furia, przez 30 s rzuca się na potwora, który zabił, i bije potwory o 30% mocniej. Uczeń po śmierci mistrza boi się bardziej, ale jeśli przeżyje 20 s, dorasta (+15% odwagi). Rywal przeżywa krótki szok.',
     '1.21: "Nie zostawię cię". Gdy przywódca zostawia kogoś z pary w klatce albo zgubionego, drugi się nie zgadza i wraca po niego sam (druga grupa, jednoosobowa): otwiera klatkę albo szuka zgubionego, a potem obaj wracają do drużyny. Przy ratowaniu z klatki para idzie pierwsza.',
     '1.21: mistrz i uczeń. Mistrz ostrzega ucznia, gdy ten wchodzi do pokoju ze znaną pułapką albo oberwie, i chwali go za rozbrojoną pułapkę albo przeżyty ciężki cios; uczeń trzyma się blisko mistrza i rzadziej się gubi.',
     '1.21: rywale i kłótnie o łup. Rywal kpi, gdy drugiego zrani pułapka. Gdy chciwy, łowca albo rywal chce łupu, po który idzie już ktoś inny, a się widzą, kłócą się: wygrywa wyższy rangą (chciwy, barbarzyńca i przywódca +1), przegrany odpuszcza na 10 s, czasem się obraża i odchodzi; przywódca może przerwać kłótnię i wtedy nikt tego nie bierze przez 10 s. Rywal przywódcy częściej odchodzi własną drogą (Rozłam).',
     '1.21: grabienie poległych. Kto bierze rzeczy z ciała, słyszy sprzeciw pary zmarłego (zawsze) albo kapłana czy ostrożnego, który wie o tej śmierci (co drugi raz); sprzeciw trochę obniża morale. Para nigdy nie grabi swojego zmarłego.',
     '1.21: zakłady. Odważny albo rywal (weteran, zdrowy) zakłada się o monetę, że przejdzie przez znaną, naładowaną pułapkę bez draśnięcia, i idzie prosto przez nią (rzadko, mniej więcej raz na 3 fale): dobra okazja dla Ciebie. Liczby: nowa komórka "Więzi". Poprawka: rozmowa na trzy głosy nie zaczyna się bez trzeciego, który mógłby powiedzieć swoje kwestie.',
     '1.20: ekwipunek i łup. Rzeczy poległego bohatera to już nie relikwie, tylko jego rzeczy: leżą jako zwykły ekwipunek (relikwią zostaje tylko relikwia z Twojego lochu) i ciągną chciwość o połowę słabiej. Kto wie o tej śmierci, mówi, czyje to; nowa drużyna czasem rozpozna rzeczy kogoś z poprzedniej wyprawy i trochę się boi.',
     '1.20: ciało do przeszukania. Kto wejdzie na rzeczy poległego, klęka przy nich na sekundę (złodziej pół) i zabiera to, co mu się przyda; trafiony w tym czasie nie wstaje. Kapłan i ten, kto widział śmierć, rzadziej idą po rzeczy zmarłych, złodziej i chciwy chętniej; przyjaciel zmarłego może zaprotestować.',
     '1.20: dzielenie się. Na postoju bohaterowie, którzy się widzą, podają sobie to, co komuś innemu bardziej się przyda (zbroja do wojownika, bomby do maga), albo się wymieniają; spokojny podaje swój amulet temu, kto zaraz wpadnie w panikę. Kto znajdzie coś, czego nie weźmie, mówi o tym, a ten, komu się przyda, idzie po to. Przywódca może przydzielić łup temu, kto go bardziej potrzebuje.',
     '1.20: udźwig. Każdy przedmiot coś waży (zbroja 6 kg, bomba 2, amulet 0,5), a każda klasa unosi inaczej (barbarzyńca 16 kg, mag 8, +0,3 kg na poziom). Ponad 60% udźwigu bohater zwalnia (strzałka pod plecakiem) i częściej poślizgnie się na Lodowni; za ciężkiego nie weźmie.',
     '1.20: narzędzia od gildii (od fali 4): latarnia (gdy w Twoim lochu ludzie błądzą albo jest Mgła) chroni przed zgubieniem się w Mgle tych, którzy są blisko niej; duch, cień i nietoperze mogą ją zgasić na 8 s. Łom (gdy zastawiasz przejścia albo masz kratę) podważa kratę i otwiera klatkę. Powracający, który kiedyś zabłądził, przynosi latarnię, a ten, kto wyniósł coś z Twojego lochu, wraca z tym.',
     '1.20: przedmioty nie znikają. Krytyk wybija przedmiot na podłogę (właściciel chce go odzyskać), Pożeracz trzyma zjedzone przedmioty w brzuchu (do 6, gryzie o 10% mocniej za każdy) i wypluwa je, gdy wysadzi go bomba albo rozbije topór. Przeklęty przedmiot przeklina następnego, kto go weźmie. Płonący bohater z bombami może wylecieć w powietrze, a bomba rzucona w potwora rani stojących przy nim (weteran wtedy jej nie rzuca).',
     '1.20: karta bohatera mówi, skąd ma każdy przedmiot (z domu, od gildii, z Twojego lochu, z rzeczy poległego, od przyjaciela, trofeum) i ile dźwiga; karta stosu mówi, czyje to rzeczy.',
     '1.19: Rozłam. Drużyna może się podzielić na dwie grupy z dwoma przywódcami (obwódka bursztynowa). Przy rozwidleniu ktoś, kogo przywódca nie posłuchał (chciwy) albo uparty weteran, idzie drugą drogą, a 1-2 podobnych mu idzie z nim; obie grupy zwiedzają osobno i łączą się, gdy się spotkają (po ok. 40 s druga grupa wraca szukać reszty). Kto jest w drugiej grupie, nabija Grozę jak zwiadowca.',
     '1.19: na naradzie po 2 minutach, gdy drużyna wraca do domu, 2-3 chcących szukać dalej albo szturmować może zostać razem jako druga grupa; gdy drużyna zostaje, a kilku chce do domu, wracają razem ("Idę z tobą").',
     '1.19: bunt. Gdy idzie źle (śmierć, ciężkie rany albo strach, niskie morale), a przywódca prowadzi dalej, odważniejszy albo wyższy rangą rzuca mu wyzwanie przy całej grupie. Każdy staje po którejś stronie (wystraszeni i ranni za buntownikiem); wygrany prowadzi, a gdy drużyna jest wystraszona, zabiera ją do domu. Dumny przegrany odchodzi obrażony sam i wraca, gdy spotka resztę. Obrażony może też odejść ten, komu dwa razy kazano zostawić łup.',
     '1.18: 28 nowych kart. Każda komnata i każdy efekt pokoju ma swoją kartę (21), a sklep pokazuje ją tylko wtedy, gdy ta komnata albo efekt jest w Twoim lochu: Zastawione szuflady (Graciarnia), Cela pod zapadnią (Więzienie), Spojrzenie z ramy (Galeria), Beczki z kuźni (Kuźnia), Usypianka (Pokój dziecięcy), Zasadzka w norze (Goblinia nora), Kokony (Leże pająków), Kocioł ogra (Jaskinia ogra), Spłoszeni w mrok (Gniazdo nietoperzy), Mur z czaszek (Kaplica czaszek), Zdarte pancerze (Zbrojownia), Fałszywe wołanie (Nawiedzona sala), Błędne ogniki (Mgła), Grzęzawisko (Bagno), Niosące się echo (Grota), Wstający umarli (Krypta), Zatrzask sezamu (Sezam), Sen bez przebudzenia (Sanktuarium), Sprzężone tryby (Zębatki), Odnalezione ciało (Głusza) i Gołoledź (Lodownia). Przychodzą od 3. runu, razem z komnatami i efektami.',
     '1.18: karty na to, jak bohaterowie zwiedzają, słuchają i naradzają się: Wabiący hałas (pułapka usłyszana zza ściany ciągnie każdego przywódcę, także ostrożnego i tchórza), Jeszcze chwila (narada częściej wybiera "jeszcze chwila", która trwa 45 s), Grube mury (krzyk niesie się 8 kroków zamiast 14, więc wieści idą wolniej), Złe wieści (śmierć, o której dowiedzą się później, straszy 2 razy mocniej) i Podrzucone grosze (przeszukane meble częściej kryją monetę, a ta podbija chciwość). Do tego Zepsute mikstury (mikstura z Twojego łupu leczy słabiej i straszy) i Rytm lochu (okno combo o 1 s dłuższe).',
     '1.18: poprawione karty. Szybki montaż: pułapka postawiona w fali ma pierwsze odpalenie o 50% mocniejsze. Pajęcze gniazdo nie dubluje już cechy z Leża pająków: pajęczyna każdego pająka trzyma 2 s dłużej. Krzyki w ścianach straszą tylko tych, którzy słyszą krzyk uciekiniera. Karta "Nowa pułapka: Portret" zniknęła (portret jest od początku i nigdy jej nie było w sklepie).',
     '1.18: teksty kart mówią to, co karta robi: Głodne ściany (też oczy i lustra), Galeria grozy (portret z cechą 3. poziomu i tak straszy cały pokój), Zastrzyk Esencji, Skarbiec (bez kradzieży kryształu), Lepkie kolce (każdy spowolniony), Szybkie przeładowanie i Przeciążenie (też zdolności potworów), Hartowane ostrza (też nietoperze), Kręte korytarze (pierwsze 12 s) i Głuche ściany (przepada też połowa opowieści o łupie). Podpowiedź w sklepie "Pasuje do Twojego lochu" liczy oczy i lustra, nietoperze, Nawiedzoną galerię tylko z duchem i portretem, a przy kartach komnat i efektów pisze np. "Brak w lochu: Kuźnia".',
     '1.17.1: bohaterowie mówią tylko o tym, co widzieli albo poczuli w tej fali. Każdy pamięta pokoje, w których był (efekt, komnata, budowle), potwory, łup, pułapki, które odpaliły przy nim albo o których wie, krew i śmierć towarzyszy. Kwestia o ogniu, ogrze czy mgle pada tylko u kogoś, kto je widział, a reszta mówi coś innego z tej samej puli. Kwestia o tym, co dzieje się właśnie teraz (łup, na który patrzy, pułapka, która odpaliła, potwór, na którego idzie, to, co go zraniło), musi dotyczyć właśnie tego.',
     '1.17.1: nowe kwestie: 522 pogaduszki o tym, co widzieli w tej fali (po 9 na każdą pułapkę, potwora, rodzaj łupu, efekt, komnatę i budowlę; najczęściej o tym, co widzieli przed chwilą), 108 kwestii przy wejściu do komnaty (pierwszy, kto wejdzie, mówi, co to za miejsce) i 23 nowe rozmowy. Karta bohatera pokazuje, co widział w tej fali.',
     '1.17.1: krwawienie z kolców (3. poziom albo Zbrojownia) to teraz rana kłuta, a nie ogień. Wcześniej liczyło się jako obrażenia od ognia, stąd trauma i fobia ognia oraz płomienie, które miały się śnić, w lochu bez ognia. Kapłan tamuje krwawienie innymi słowami niż gasi ogień.',
     '1.17: bohaterowie zwiedzają. Gdy przywódca wejdzie do nowego pokoju, czasem pozwala się rozejrzeć: każdy podchodzi do czegoś (mebel, portret, lustro, trumna, kości, środek komnaty, goła ściana), ogląda to przez chwilę i mówi, co widzi. Meble przeszukują: czasem znajdą monetę, a mimik, beczka prochu albo pozytywka na meblu może przy tym odpalić (pod koniec, więc pierwsza szansa jest Twoja). Tchórz woli zostać przy przywódcy, a chciwy może poprosić o przeszukanie i usłyszeć "Nie ma czasu".',
     '1.17: po 2 minutach nie ma już sztywnego odwrotu, tylko narada. Każdy, kto stoi przy przywódcy, głosuje według swojego stanu i charakteru: do domu, szturm na serce (tylko gdy wiedzą, gdzie jest) albo "jeszcze chwila" (+30 s, raz na falę). Przegłosowany przywódca ustępuje, a przegłosowany tchórz albo ranny może sam wrócić do domu. Bohater z przepowiedni dalej prowadzi szturm jak dotąd.',
     '1.17: bohaterowie wiedzą tylko to, co widzą i słyszą. Na śmierć w pełni reagują ci, którzy ją widzieli; kto tylko usłyszał krzyk, boi się mniej i nie wie, kto zginął; reszta dowiaduje się, gdy spotka kogoś, kto wie ("Straciliśmy Borysa." - "Co?! Nie..."). Tak samo z ucieczką drużyny, kryształem, klatką, wołaniem kapłana i sercem wypatrzonym przez zwiadowcę. Zgubionego przywódca zauważa po chwili i wraca tam, gdzie go ostatnio widział. Kto nie usłyszał decyzji, robi swoje, dopóki nie dołączy do reszty.',
     '1.17: dymków jest kilka razy więcej: ok. 2500 kwestii (było ok. 680), ok. 500 rozmów (było 143), ok. 430 kwestii w samotności (było 89) i ok. 200 odpowiedzi na small talk (było 31). Rozmowy zaczynają się też od kwestii mówionych po kolei w scenkach. Kwestie poprawiono tak, żeby mówiły prawdę: "Za mną" woła tylko wojownik, który naprawdę prowadzi, kapłan przy egzorcyzmie ma własne słowa, po miksturę nikt nie woła "Złoto!", a kto mówi, że coś zrobi, zwykle to robi.',
     '1.17: pułapka odpalona w pokoju obok jest słyszana ("Słyszeliście?"): bohaterowie odwracają się w tę stronę, a odważny, chciwy albo zielony przywódca idzie sprawdzić, co to było (ostrożny i tchórz to omijają). Charakter przywódcy wpływa też na to, którędy idą.',
     '1.17: poprawki AI: uwięziony w klatce nie ucieka już razem z drużyną (wcześniej nikt go potem nie uwalniał), przywódca, który każe zostawić łup, zwykle zostaje posłuchany (chciwy, łowca skarbów i nowicjusz się kłócą i idą), mag i kapłan nie czarują w panice, napoczęty kryształ powoli osiada z powrotem, gdy nikt przy nim nie stoi, druga osoba w klatce czeka na swoją kolej ratunku, a kapłan wezwany na pomoc idzie do tego, kto wołał.',
     '1.16.1: pasek serca nie czeka na koniec combo. Serce je każde zdarzenie od razu, według mnożników z tej chwili, a gdy combo się kończy, dochodzi tylko to, co combo dołożyło (najpierw serce, potem Twoja sakiewka). Sumy z fali są takie same jak wcześniej.',
     '1.16.1: ekran dzieli się trochę wcześniej, gdy grupy są ok. 1/5 bliżej siebie niż dotąd (próg 19 zamiast 16 pikseli na pole).',
     '1.16.1: okienko Esencji w równaniu u góry pokazuje w trakcie serii tę samą wartość co przy wypłacie (wcześniej bez mnożnika ×1,1, więc przy wypłacie podskakiwało o ok. 10%).',
     '1.16.1: Esencja na karcie pułapki ("Ostatnia fala: ... Esencji") to teraz to, ile były warte jej odpalenia. Wcześniej było tam prawie zawsze 0, bo Esencja wpływa przy wypłacie serii, a nie w chwili odpalenia.',
     '1.16: bohaterowie mogą się rozdzielić celowo. Na naradzie przy rozwidleniu złodziej (a gdy go nie ma, czasem ktoś odważny) idzie na zwiad, w drużynie 4+ czasem z kimś do pary ("Idę z tobą"). Przy wejściu do nowego pokoju złodziej może powiedzieć "Zaczekajcie tu, sprawdzę, co dalej" i pójść przodem, a drużyna czeka na niego do 8 s (to działa także w lochu bez rozwidleń). Zwiadowca, który zobaczy jedno przejście, idzie do następnego po swojej stronie, dopóki ma czas. Na postoju zdrowy złodziej może iść się rozejrzeć, a nowicjusz, który rusza sam "sprawdzić tamte drzwi", też jest na zwiadzie. Taki bohater ma turkusowy pierścień i znaczek ›, a w karcie bohatera "na zwiadzie".',
     '1.16: zwiad nabija Grozę wolniej niż zgubienie: 0,04 na sekundę i lekki strach, dopóki zwiadowca jest z dala od drużyny (sam bez planu: 0,09; zgubiony: 0,12, zwykle do tego samotność i mocny strach). Zwiadowca, który zabłądzi we mgle, nie znajdzie drogi albo zgubi się w drodze powrotnej, staje się zgubionym i od razu płaci pełną stawkę. Pułapki, które polują na samotnych (oczy, cień), widzą samotnego zwiadowcę jako samotnego.',
     '1.16: podsumowanie fali ma wiersz Zwiad (celowo osobno), Szczegóły pokazują czas na zwiadzie, w samotności i zgubionych, a wśród ciekawostek może trafić się Rozdzieleni.',
     '1.16: zły skręt przywódcy i błądzenie we mgle kończą się po swoim czasie. Wcześniej potrafiły wisieć dłużej, gdy przywódca zbierał łup, i blokowały nowe pomyłki.',
     '1.15.1: każda porada samouczka w fali zatrzymuje grę, dopóki jej nie zatwierdzisz albo nie zrobisz tego, o co prosi. Pierwsza (o nowicjuszach) ma przycisk Rozumiem; przy pierwszym skill checku świat stoi, dopóki nie stukniesz; porada o karcie bohatera czeka, aż go stukniesz, a porada o przyspieszaniu, aż przytrzymasz palec (gra rusza wtedy od razu przyspieszona). Wcześniej pierwsza porada nie zatrzymywała gry.',
     '1.15.1: porada samouczka w sklepie to kartka u góry sklepu, która zostaje, aż stukniesz Rozumiem albo weźmiesz kartę. Wcześniej gasła po ok. 2 s i zasłaniała talię.',
     '1.15.1: podzakładki są widoczne zawsze. Ta, w której na tym etapie nauki nic jeszcze nie ma, jest wyszarzona z kłódką, a po stuknięciu mówi, od którego runu się pojawi (np. Strach od 2. runu, Komnaty i Efekty od 3.). Wcześniej w pierwszym runie rząd podzakładek znikał.',
     '1.15: komnaty. Zakładka Loch dzieli się teraz na Kopanie (kopanie, tunel, poszerzanie, burzenie), Komnaty i Efekty (dawne typy pokoi: Mgła, Bagno, Grota i reszta). Komnata mówi, komu pokój służy: Goblinia nora, Leże pająków, Jaskinia ogra, Nawiedzona sala, Gniazdo nietoperzy, Kaplica czaszek, Zbrojownia, Kuźnia, Więzienie, Graciarnia, Galeria i Pokój dziecięcy. Każda pułapka i każdy potwór należy do jednej z nich.',
     '1.15: pułapki i potwory z rodziny komnaty, postawione w jej pokoju (pułapka na ścianie liczy się w pokoju, w który patrzy), mają cechę 3. poziomu bez ulepszania, a te już na 3. poziomie dostają +25% mocy. Komnata kosztuje 12 Esencji, nie zajmuje miejsca w pokoju i może być w pokoju razem z efektem. Stuknięcie pokoju, który już ma tę komnatę, zdejmuje ją (wraca połowa), a inna komnata ją zastępuje. Komnata jest zablokowana, dopóki nie odblokujesz nikogo z jej rodziny.',
     '1.15: w każdej komnacie stoją drobne przedmioty w 3D: w norze świecące grzybki, kamienie, totem i ognisko z polanami, w leżu kokony, skupiska jaj i małe pająki, u ogra kocioł z bulgoczącą zupą i stosy kości, w nawiedzonej sali świece z niebieskim płomieniem i przewrócone krzesła, u nietoperzy stalagmity, w kaplicy piramidki czaszek i świece, w zbrojowni stojaki z bronią, tarcze, strzały w podłodze i tarcza strzelecka, w kuźni kowadło, palenisko, wiadra i sztaby, w więzieniu wiadra, snopki słomy, kajdany i szczur, w graciarni skrzynki, beczki, butelki i książki, w galerii popiersia, wazy, kandelabry i słupki z liną, w pokoju dziecięcym klocki, piłki, bębenki, bączki i miś. Bohaterowie chodzą za nimi i przed nimi, a nic nie stoi na polu z pułapką, potworem albo meblem. Do tego trochę życia (zarodniki, para, iskry, ogniki, kurz, krople, nutki) i poświata w kolorze komnaty pod każdym elementem jej rodziny.',
     '1.15: ściany komnaty są z innego materiału, mają inny kształt i rzeczy, które z nich wystają: belki i korzenie w norze, zwisający jedwab i kokony w leżu, bryły skał i czaszka na kolcu u ogra, kinkiety z niebieską świecą w nawiedzonej sali, sople skalne i wiszące nietoperze, kości wystające ze ściany czaszek, tarcze na skrzyżowanych włóczniach i blanki w zbrojowni, okap paleniska i kominy w kuźni, łańcuchy z kajdanami i kolce w więzieniu, półki ze słojami w graciarni, złocone ramy, kinkiety i gzyms w galerii, półeczki z zabawkami w pokoju dziecięcym.',
     '1.15: wszystko poza postaciami ma bryłę: rzeczy dotąd płaskie (sieć, zapadnia, otwarta klatka, gruz po budowli, pułapki na ścianach, uchwyty pochodni, ozdoby ścian) lekko odstają od podłogi albo ściany i rzucają krótki cień. Wielkie pajęczyny malowane na podłodze leża zniknęły.',
     '1.15: komnata i efekt nakładają się: pokój może być np. Goblinią norą we Mgle. Działają oba, a na obrazie efekt leży na podłodze komnaty i zostawia ślad na jej ścianach (mgła przy ich podstawie, szron i sople w Lodowni, mokry pas i mech w Bagnie, złote błyski w Sezamie, zębatka w Zębatkach, fiolet Krypty, ciepłe światło Sanktuarium, ciemność Głuszy, odblaski wody w Grocie).',
     '1.15: zwykłe podłogi pokoi są szare (wcześniej im głębiej, tym bardziej czerwonobrązowe), więc komnaty i efekty bardziej się odróżniają.',
     '1.14: podkategorie w pasku budowy: Pułapki i Potwory mają pod zakładkami przełącznik Rany / Strach (pasek pamięta wybór dla każdej zakładki). Pułapki, które zatrzymują, rozdzielają i spowalniają, są w Ranach.',
     '1.14: odkryte pułapki i potwory zostają na stałe: to, co odblokujesz kartą ze sklepu, masz od początku w kolejnych runach (w pierwszych runach nadal tylko to, co dany etap wprowadza), a jego karta nie wraca do sklepu. Liczy się od tej wersji.',
     '1.13.4: naprawione: złodziej prowadzący drużynę potrafił przestępować między dwoma polami przed pułapką ze strzałami i dostawać strzałę za strzałą (u jednego z testerów od 55 do 10 HP). Na miejscu rozbrajania gra uznawała, że pułapka nie leży już na drodze, więc ruszał dalej, a krok później wracał. Teraz drogą jest to, dokąd idzie drużyna, złodziej trzyma się wybranej pułapki, a gdy ta dwa razy odpali mu w twarz, odpuszcza. Tak samo poprawione: przywódca z bombą (podchodzi na bezpieczne pole w zasięgu rzutu) i odwrót, gdy przyjaciel odpoczywa tuż za drzwiami (reszta siada obok, zamiast przestępować w drzwiach).',
     '1.13.3: krótsza scenka przed groźnym pokojem: mówi przywódca i najwyżej dwóch specjalistów (wcześniej każdy z nich, do 7 dymków i nawet ~19 s postoju). Pozostali specjaliści i tak robią swoje (osłona, zakłócenie, rozbrajanie, tarcza), a sygnałem do biegu jest okrzyk przywódcy na koniec. Średnio postój trwa ok. 8 s zamiast ok. 12,5 s.',
     '1.13.2: naprawione: drużyna potrafiła utknąć w ślepym przejściu (np. wąski pas łupu między skrzyniami): przywódca w środku, reszta gęsiego za nim, i całe najazdy mijały na przesuwaniu się o jedno pole w tę i z powrotem. Teraz ten, kto stoi bezczynnie na drodze idącego, a nie ma jak zejść w bok, zamienia się z nim miejscem (mijają się), a bohater idący po skarb może poprosić stojącego na nim, żeby się przesunął.',
     '1.13.1: sam bohater nie mówi do powietrza. Gdy nikt go nie słyszy, kwestie dla drużyny zamieniają się w myślenie na głos („Nie ma kogo zapytać. Idę tędy.”, „Usiądę na chwilę.”, „Mówię do siebie. To chyba zły znak.”), odpowiedzi i zachęty dla innych w ogóle nie padają, a samotny nie naradza się sam ze sobą. Okrzyki zostają okrzykami.',
     '1.13.1: rozmowa zaczyna się, gdy pierwszy skończy mówić, więc rzadziej się urywa (wcześniej odpowiedź mogła przepaść, zanim pierwszy domówił).',
     '1.13: bohaterowie naprawdę ze sobą rozmawiają. Kwestia jednego może zacząć krótką wymianę zdań: ktoś obok odpowiada, pierwszy odpowiada mu, czasem wtrąca się trzeci. Komentują wpadki (pułapka, zapadnia, nieudane rozbrajanie, poślizg), sukcesy (rozbrojenie, unik, zabity potwór, łup), swoje moce i lęki, a to, co powie słuchający, zależy od jego klasy i charakteru (chciwy, tchórzliwy, bohaterski, ostrożny). Jedna wymiana naraz w zasięgu słuchu; kwestia, która przyszłaby za późno, przepada razem z resztą wymiany.',
     '1.13: narada dotyczy tylko tych, którzy stoją razem (ten sam pokój albo kilka kroków w korytarzu). Reszta robi swoje, a dwie grupy mogą się naradzać naraz. Wcześniej cała drużyna stawała w miejscu, także w innych pokojach i na pułapkach. Scenka odpoczynku też jest dla tych, którzy już siedzą razem.',
     '1.13: bohater nie stoi i nie odpoczywa w pułapce. Gdy w trakcie narady, czekania albo odpoczynku stoi tam, gdzie drużyna zna zagrożenie, gdzie właśnie coś go trafiło (pamięta to pół minuty) albo na czymś Twoim, przechodzi na bezpieczne pole najwyżej 3 kroki dalej, przy przywódcy. Na odpoczynek wybiera wolne, bezpieczne miejsce w pokoju.',
     '1.13: skill check jest teraz u góry mapy, pod ikonami drużyny (a w pierwszym runie pod kartą samouczka). Odpowiada się jak dotąd stuknięciem w dowolne miejsce mapy, więc kciuk, który stuka niżej, nie zasłania koralika. Dymek, który wpadłby na check, pokazuje się pod nim.',
     '1.13: spokój trwa też wtedy, gdy bohaterowie odpoczywają albo się naradzają (także na postoju przed groźnym pokojem), gdy ktoś siedzi w zapadni (zapadnia z bohaterem w środku nie liczy się jako zagrożenie dla reszty, a gdy na górze nie ma nikogo, jest spokój) i gdy wszyscy siedzą w klatkach. Gra sama przyspiesza (×1,5), a zegar combo płynie wolniej, jak w każdej innej cichej chwili. W 1.12.1 scenki wyłączały spokój. Cierpliwość drużyny nadal płynie w scenkach 2 razy wolniej.',
     '1.12.1: przychód Esencji wraca do poziomu sprzed 1.12. Zegar combo w ciszy (drużyna idzie, a nic jej nie grozi) płynie 4 razy wolniej, zamiast stać (do 1.11.1) albo biec jak zwykle (1.12); okno combo to 3 s. Groza i strach z ran liczą się od HP bohatera bez dodatku z 1.12, więc najazdy są dłuższe, a rany nie tanieją. Esencja z Grozy ×1,1. Odtworzenia dwóch runów autora: przychód z fal 2-10 o 3% i 5% wyższy niż w 1.11.1, serce syte mniej więcej tak samo często, najazdy o ok. 25-30% dłuższe.',
     '1.12.1: jeden bohater na polu, tak jak potwory. Nikt nie wejdzie na zajęte pole, a mijający się odsuwają się lekko w bok. Kto stoi bezczynnie na drodze idącego, robi mu miejsce (krok w bok albo krok naprzód). Zablokowany chwilę czeka, potem obchodzi, a przeciska się dopiero, gdy nie ma innej drogi i za stojącym jest wolne pole (uciekający od razu).',
     '1.12.1: dłuższe przerwy ze scenkami. Przed groźnym pokojem i na rozwidleniu drużyna zbiera się wokół przywódcy i omawia plan: każdy mówi swoje, przywódca zamyka. Na odpoczynku siadają, kapłan opatruje rany, ktoś marudzi, ktoś odpowiada; odpoczynek trwa co najmniej 10 s (najwyżej 26 s). W trakcie narady i na początku odpoczynku gra nie przyspiesza sama, a cierpliwość drużyny płynie wtedy 2 razy wolniej.',
     '1.12.1: poprawki: komunikaty sklepu (np. "Za mało Esencji", "Talia i schowek są pełne") znowu widać, nad przyciskiem w sklepie; stuknięcie w "Fala X/10" znowu pokazuje wieści o fali (jako karta), "Jeszcze raz" w pierwszych runach prowadzi do kolejnego runu nauki, wszystkie źródła strachu mają polskie nazwy, ulepszenie pokazuje "Poziom N" raz.',
     '1.12: samouczek rozłożony na pierwsze 4 runy. Run 1 to podstawy (pułapki i potwory, które ranią, łup, kopanie, sklep i talia, serce) z przewodnikiem przez pierwsze 3 fale. Run 2 dokłada to, co straszy (pułapki i potwory), run 3 gildię z jej specjalistami, budowle-kontry i typy pokoi, a run 4 to pełna gra: ciała i fobie bohaterów, powracający, łowcy skarbów i wyłom. Na starcie runów 2-4 karta mówi, co nowego, a pierwsze spotkanie z fobią, ciałem albo powracającym ma swoją krótką kartę. Pomiń samouczek otwiera wszystko od razu (kto grał wcześniej, ma już wszystko).',
     '1.12: w pierwszym runie serce jest głodne od fali 2, jak w każdym (wcześniej w samouczku spało), a run liczy się do rekordów.',
     '1.12: combo wzmacnia pułapki: każdy krok combo to +12% obrażeń i strachu kolejnych pułapek (wcześniej combo wzmacniało tylko strach, o 25% na krok). Combo trwa, póki następna pułapka odpali w ciągu 2,5 s (było 3,5 s), a ten czas płynie zawsze (wcześniej stał, gdy nic się nie działo). Combo wymaga więc pułapek ustawionych blisko siebie.',
     '1.12: bohaterowie mają więcej życia: +10% w fali 3, +20% od fali 5. Kilka mądrze zgrupowanych pułapek ma wygrywać z masą porozrzucanych.',
     '1.12: nie ma już podpowiedzi u góry ekranu. Gdy coś się nie uda, krótki napis pojawia się przy stukniętym miejscu, a kafelek w pasku drga i mówi, czego brakuje.',
     '1.12: naprawione: karta samouczka zostawała na ekranie w nowym runie, gdy wyszło się z samouczka w trakcie.',
     '1.11.1: serce znowu zabiera swoją porcję z każdej fali (tyle, ile wynosi próg), ale próg pasuje teraz do tego, ile naprawdę dają fale: to mniej więcej połowa typowej fali. Fala 2: 37, fala 5: 72, fala 8: 141, fala 10: 221 (+25% na falę). Fala, która da mniej, oddaje sercu wszystko i kryształ. Spichlerz dusz znowu −1 za zabitego.',
     '1.11: serce nie zabiera już Esencji. Zamiast tego każda fala od fali 2 musi przebić próg serca: 60 Esencji w fali 2, potem o 25% więcej co falę (fala 10: 358, trzy razy więcej niż dawny głód). Cała Esencja zostaje u Ciebie, ale fala poniżej progu kosztuje kryształ. Spichlerz dusz obniża próg o 3 za zabitego.',
     '1.11: rozmowy naprawione. Korytarz nie liczył się jako pokój, więc drużyna idąca korytarzem "nie słyszała się" i mówiła naraz, a każdy trafiony w ostatnich 1,5 s mógł przekrzykiwać innych. Teraz słyszą się na 7 pól, a przekrzykują się tylko okrzyki (ból, trafienie, strach, krzyk na pułapkę) i bohaterowie w panice albo w ucieczce.',
     '1.10: bohaterowie rozmawiają po kolei. W jednym pokoju mówi jeden naraz, odpowiedź czeka, aż przeczytasz poprzednią kwestię (dymek wisi tyle, ile trzeba na przeczytanie), a mówiący odwraca się do słuchacza. Przekrzykują się tylko w chaosie (ranni, w panice, w ucieczce, w walce, przy krzyku) i w osobnych pokojach.',
     '1.10: bohaterowie naprawdę biorą łup leżący blisko (wcześniej przez błąd uznawali go za "za daleko", gdy po drodze było jakieś znane niebezpieczeństwo). Po jeden skarb idzie jeden, a przywódca na niego czeka. Na postoju rozstawiają się obok siebie zamiast stać jeden na drugim, rozglądają się i odwracają do rannego.',
     '1.10: orby chciwości (złote) i combo (lodowe) lecą do równania u góry, tak jak fioletowe orby grozy. Liczba w okienku rośnie, gdy dolatują.',
     '1.10: w falach 4-10 przychodzi 4 bohaterów (w falach 1-3 trzech), a czempion (fala 5) i legenda (fala 10) dochodzą jako piąty. Tam, gdzie kiedyś było ich 5-6, są za to mocniejsi. Po finale stopniowo więcej: 5 od fali 11, 6 od fali 15.',
     '1.10: chciwość rośnie coraz wolniej: każdy przyrost dzieli się przez obecną chciwość (przy ×2 połowa, przy ×3 jedna trzecia). To samo dotyczy chciwości na start fali.',
     '1.10: cztery nowe typy pokoi w zakładce Loch. Sanktuarium: fałszywy azyl, ranni chcą tu odpocząć, ale leczą się 2 razy wolniej i mają koszmary. Zębatki: pułapki przeładowują się o 25% szybciej, a ta sama pułapka drugi raz z rzędu też podbija combo. Głusza: nic nie słychać, więc bohaterowie nie ostrzegają się, nie wołają kapłana, a strach rośnie o 20%. Lodownia: co trzeci krok bohater jedzie pole dalej, prosto w to, co tam leży.',
     '1.09.1: ściany, których ruch drużyny nie dotyczy, już nie podskakują, a ściany położone płasko nie mrugają, gdy drużyna przechodzi między pokojami.',
     '1.09: ściany są dwa razy wyższe. Które leżą płasko, zostaje jak było, a w fali kładą się całe pokoje stojące między kamerą a drużyną (i pokój, do którego ktoś właśnie wchodzi). Bloczki chowają się i wyskakują z popem, falą od drużyny, a pokój, z którego drużyna wyszła, staje z powrotem po chwili.',
     '1.09: skill check pamięta wynik na kolejne fale. Pułapka pyta znowu po ulepszeniu albo gdy bohaterowie ją wyłączą (rozbroją, rozbiją, zabiją potwora, zablokują). Przeniesienie i ponowne postawienie w tym samym miejscu wyniku nie kasują. Pudło pyta znowu, czaszka zawsze. Znaczek wyniku widać też w budowie.',
     '1.09: w trakcie checku świat zwalnia (×0,25) zamiast prawie stanąć, więc widać, co robią bohaterowie. Cios trafia tych, w których celował, nawet jeśli zdążą zrobić krok.',
     '1.09: spokój ×1,5 i przytrzymanie palca ×3 (ustawią się tak raz u wszystkich). Pasek budowy znowu sam chowa się na starcie fali, a przycisk ▼/▲ Budowa reaguje tylko na siebie.',
     '1.09: nowe animacje: bohater wskakuje w drzwiach, ugina się od ciosu, przewraca się, gdy ginie, zapada się w zapadnię i znika przy wyjściu; potwór ugina się i przewraca; postawiona, przeniesiona i ulepszona rzecz wyskakuje z kurzem; nowa zakładka paska rozdaje kafelki.',
     '1.08: pasek budowy zwija się i rozwija razem z kamerą (ten sam czas, ten sam ruch).',
     '1.08: dymki bohaterów w stylu reszty gry: ciemna płyta z żelazną krawędzią, pasek w kolorze mówiącego, ważne kwestie w mosiądzu. Dymek przesunięty w górę, żeby nie zasłaniać innego, ma nitkę do głowy mówiącego.',
     '1.07: nowa kamera: loch jest obrócony o 45° (izometria). Z rozwiniętym paskiem budowy widzisz go z wysoka (wysoka izometria), a w fali i po zwinięciu paska w izometrii 2:1. Przy przełączaniu zmienia się tylko nachylenie, kierunki zostają te same.',
     '1.07: w fali ▲ Budowa zatrzymuje grę i pokazuje widok budowy, a ▼ Budowa gra dalej. Przycisku pauzy już nie ma. Gdy wyjdziesz z gry w trakcie fali, pasek sam się rozwinie, więc po powrocie gra stoi.',
     '1.07: ściany od strony kamery są ścięte do podłogi, więc nic się za nimi nie chowa. Pułapka na takiej ścianie stoi przy niej jak tabliczka, na pozostałych wisi na ścianie.',
     '1.07: bohaterowie i potwory w pixel arcie (przygaszone kolory, 4 klatki chodu), a meble, pułapki, budowle, łup i serce stoją w lochu jako bryły. Co płaskie, leży na podłodze albo wisi na ścianie.',
     '1.07: muzyka w stylu retro, jak w Balatro: jeden utwór w dwóch aranżacjach, które grają równo i płynnie przechodzą jedna w drugą. Spokojny "Loch" gra w budowie, sklepie i pauzie, mocniejsza "Fala" w trakcie fali. Głośność muzyki ustawisz osobno w Ustawieniach (0 wyłącza). Zaczyna grać po pierwszym stuknięciu.',
     '1.06: przycisk paska budowy wygląda tak samo, gdy pasek jest rozwinięty i zwinięty: ▼ Budowa chowa, ▲ Budowa wysuwa.',
     '1.05: skill check działa na całą falę. Trafiony krytyk albo draśnięcie pułapka pamięta (znaczek w rogu pola) i dalej bije sama z tą siłą. Pudło albo brak stuknięcia: check wraca przy następnym razie. Gdy cios miałby zabić, check z czaszką pyta zawsze, a odpuszczona czaszka usypia pułapkę, dopóki nie może trafić bez zabijania. W powtórkach Waszych runów checków było ok. 55% mniej.',
     '1.05: dwie nowe klasy. Bard (lutnia) krzepi pieśnią po śmierci towarzysza i przy niskim morale, a zgubionych woła muzyką. Barbarzyńca (topór) wpada w furię (po śmierci towarzysza, po mocnym ciosie i zamiast paniki) i rozbija skrzynie, beczki, regały i budowle. Nowe kontry w zakładce Obiekty: Kamień wyjec i Okowy.',
     '1.05: ikony klas na krążkach bohaterów (miecz, sztylet, krzyż, różdżka, lutnia, topór) i nigdy dwóch bohaterów tej samej klasy w drużynie (najwyżej 6, w falach bez końca rosną za to poziomy). Łowca skarbów to znak sakiewki przy dowolnej klasie, gildia przysyła jednego specjalistę, a nowe rodzaje gildii odpowiadają na loch, w którym ludzie błądzą (bard), i na zastawione przejścia (barbarzyńca).',
     '1.05: bohaterowie mówią do rzeczy: nie cieszą się z bogactwa, gdy uciekają, odpowiadają sobie, wołają kapłana, zgubiony idzie na głos drużyny, a na rozwidleniach kłócą się charaktery (chciwy chce po złoto, ostrożny zwalnia, tchórz chce wracać, odważny go zawstydza).',
     '1.05: plotki: uciekinier opowie tylko o pułapkach, które go zraniły albo przestraszyły (najwyżej o 3), a plotka żyje 2 fale zamiast 4.',
     '1.05: kryształu nie da się już kupić za Esencję (wyjątek: karta Żarłoczne serce). Pierwsza fala nie ukradnie kryształu nawet z pustego lochu, bo serce ją odpycha, a fala 2 jest odrobinę łagodniejsza.',
     '1.05: nowy ekran po fali: Esencja, serce, kryształy, rozliczenie, wykres (liczba na dole słupka), 2-3 ciekawostki i następna drużyna z klasami, umiejętnościami, sprzętem i słabościami. Reszta jest pod Szczegóły, a osobny ekran rozliczenia zniknął.',
     '1.05: sklep podpowiada, czy karta pasuje do Twojego lochu. Rozbuduj pokazuje koszt kolejnej rozbudowy obok ceny nowego pokoju.',
     '1.05: nowy font cyfr (Jersey 10): 2 i 8 już się nie mylą.',
     '1.05: w fali pasek budowy się chowa (także w samouczku), a wysuwa go wyraźny przycisk ▲ Pułapki. Samouczek uczy przez działanie: rozwiń pasek, postaw portret, ulepsz pułapkę podwójnym stuknięciem, stuknij bohatera, przytrzymaj palec, żeby przyspieszyć.',
     '1.05: logi zapisują checki na minutę, jaką część fali świat stał pod checkami i jak daleko doszedł samouczek.',
     '1.04: skill check jak w Dead by Daylight: obwódka to draśnięcie, pełne pole to krytyk (bije ok. 2,5 raza mocniej). Po 6 checkach bez krytyka gra raz podpowie, gdzie celować.',
     '1.04: na starcie fali drużyna czeka chwilę przy wejściu (ok. 2 s, gdy widać "Fala N"), więc pierwszy skill check nie wyskakuje od razu.',
     '1.04: samouczek nie zasłania gry. W trakcie fali to jedna-dwie linijki u góry mapy, a kamera kadruje drużynę pod nimi. Ważne chwile (pierwszy skill check, pierwsza wypłata Esencji, kradzież kryształu, pierwsza ucieczka ze strachu) raz zatrzymują grę krótką kartą z przyciskiem Rozumiem, a skill check czeka pod kartą. Doszedł krok z przyspieszeniem (przytrzymaj palec na mapie), a dłuższa teoria przeszła do budowy przed falą 2.',
     '1.04: dwie pułapki, które loch stawia na start, stoją na ostatnim odcinku drogi do serca, który złodziej przechodzi dwa razy.',
     '1.04: przy dużym przybliżeniu (np. fala 1, gdy dwóch nowicjuszy idzie razem) podłogi i ściany znów rysują się bezpośrednio, jak w 1.02. W teście na komputerze fala 1 miała ok. 1,6-1,8 raza więcej klatek niż w 1.03. Logi fali zapisują teraz płynność (klatki na sekundę, najwolniejsze klatki).',
     '1.04: naprawione zawieszenie gry: gdy ostatni bohater przy sercu ginął od jego oparzenia dokładnie w chwili, gdy odrywał kryształ, gra stawała. Błąd w jednej klatce nie zatrzymuje już gry, tylko trafia do logów.',
     '1.03: dzielony ekran: gdy drużyna rozejdzie się po dużym lochu tak daleko, że nie mieści się już na ekranie, linia przez środek (pozioma, pionowa albo ukośna, prostopadła do kierunku między grupami) dzieli go na dwie części, a każda pokazuje swoją grupę. Gdy grupy się zejdą, połówki znów się łączą. Wyłączysz to w Ustawieniach.',
     '1.03: Chciwość ma koszt bez sufitu: z chciwego lochu przychodzą coraz silniejsi bohaterowie (wcześniej najwyżej +3 poziomy przywódcy i 2 łowców skarbów). Rośnie to powoli: przy chciwości 8 przywódca ma ok. +4,2 poziomu, przy 23 ok. +6,1, od chciwości 9 przychodzi trzeci łowca.',
     '1.03: każdy kolejny łup tego samego rodzaju w lochu kosztuje o 25% więcej (Relikwie: 10, 13, 16, 20, 25...). Zdjęty oddaje tyle, ile za niego zapłaciłeś.',
     '1.03: Odwrotna chciwość po nowemu: bohaterowie zabierają łup jak zwykle, a zabrany łup podbija chciwość 3 razy mocniej. Każdy kolejny zabrany łup podbija ją trochę słabiej, tak jak zobaczony.',
     '1.03: mniej grzania telefonu: podłogi i ściany rysują się raz i potem są tylko wklejane, poświaty to gotowe obrazki, nie rysuje się tego, czego nie widać, ekran ma najwyżej podwójną gęstość, a w budowie bez dotykania gra rysuje co drugą klatkę.',
     '1.02: na pełnym ekranie telefonu góra nie jest już ucięta (aparat w ekranie, zaokrąglone rogi): gra zostawia u góry odstęp. Gdyby wciąż coś było ucięte, w Ustawieniach jest suwak "Odstęp od góry ekranu".',
     '1.02: skill checki w stylu reszty gry i wszystkie w jednej oprawie: ta sama kamienna płyta z gotyckim tytułem, ten sam tor z żelazną krawędzią, zielona strefa jak mech, krwista strefa krytyku, która się żarzy, czaszka na strefie, która zabija, i jeden kościany koralik. Różnią się tylko kształtem toru: prosty pasek, falisty lont, zwisający łuk, okrąg, spirala, zamykający się pierścień.',
     '1.02: ekran rozliczenia po fali czeka na przycisk Dalej (stuknięcie w ekran tylko przyspiesza liczenie).',
     '1.02: w trakcie combo fioletowe kule Grozy lecą od bohatera do okienka Groza i liczba rośnie, gdy dolatują. Gdy combo się zamyka, wynik równania osobno zamienia się w Esencję: czerwone kule wylatują z okienka wyniku do serca i do sakiewki.',
     '1.02: autoprzyspieszenie (▶▶ spokój) działa częściej i dłużej. Gra zwalnia dopiero, gdy bohater jest krok od pola, w które sięga gotowa pułapka, potwór albo łup, a nie od razu po wejściu do pokoju, w którym cokolwiek stoi. Pułapka, która się jeszcze przeładowuje, nie przerywa spokoju. Przyspieszenie rośnie płynnie, a zwalnia od razu.',
     '1.01: combo jak w Balatro: Groza zbiera się, dopóki trwa combo (widać to w linii u góry), i wypłaca się na końcu po końcowym combo, więc combo działa wstecz na całą serię. Liczby nad bohaterami pokazują teraz Grozę (fiolet), a czerwona Esencja wpada przy wypłacie.',
     '1.01: serce bierze pierwsze porcje Esencji z każdej fali, aż się naje, i chce dużo więcej niż wcześniej. Fala da za mało: zje to, co dostało, i kryształ. Nie ma już zapasu serca ani limitu Esencji. Na koniec fali rozliczenie: Groza, Esencja, porcja serca, reszta dla Ciebie (od 1.02 czeka na Dalej).',
     '1.01: po końcu cierpliwości bohaterowie robią odwrót i wracają do domu (tylko bohater z przepowiedni szturmuje serce).',
     '1.01: wyższe, stałe ceny: pułapki, potwory i łup ok. 1,4 raza, budowle i typy pokoi 2-2,5 raza (np. Runa 14, Mgła 10), łatanie wyłomu 20, kryształ 40. Na start 30 Esencji, po fali +8.',
     '1.01: krata zamyka zawsze na 4 s i odnawia się dopiero 8 s po otwarciu; poziom 3 daje 2 zamknięcia więcej (zamiast bez limitu). Zablokowani przez kratę idą szukać w innych pokojach, a złodziej potrafi ją podważyć.',
     '1.01: mgła naprawdę gubi: lider błądzi w niej po omacku, a każdy, kto odejdzie od niego choć na krok, może się zgubić.',
     '1.01: silniejsi bohaterowie na starcie: w fali 1 jest 3 bohaterów, a w falach 1-5 są trochę silniejsi i mają więcej HP (przewaga znika w fali 6). Fala 1 nie kończy się już po 3 sekundach.',
     '1.01: zakładki: Pułapki (ranią i straszą), Potwory (wszystkie), Łup, Obiekty (skrzynia i budowle), Loch (z typami pokoi), Talia. Proch, mimik i pozytywka stoją na meblu.',
     '1.01: nowy wyłom: kamera jedzie do niego, a okno zajmuje tylko górę ekranu.',
     '1.0: nowa oprawa dark fantasy: zimny szary kamień, czarne żelazo, kość i krew, pochodnie na ścianach, gotyckie nagłówki. Esencja ma wszędzie ten sam czerwony kolor: licznik, ceny, kulki, liczby nad bohaterami, wykres fal. Fiolet to teraz groza i strach.',
     '1.0: animacje: Esencja nabija się u góry ekranu (licznik rośnie, wyskakuje +N), kulki dusz lecą z mapy prosto do licznika, baner na start fali, alarm, gdy znika kryształ, wjazd ekranów i wykresów.',
     '1.0: opis pod mapą zniknął: przytrzymaj kafelek w pasku, żeby przeczytać, co robi. Krótkie komunikaty wyskakują na chwilę i same znikają (stuknięcie zamyka). Stuknięcie w Fala X/10 pokazuje wieści o fali jeszcze raz.',
     '1.0: run z samouczkiem też się zapisuje: po zamknięciu strony wrócisz do niego razem z podpowiedziami.',
     '1.0: ulepszanie: dwa szybkie stuknięcia w pułapkę albo potwora (kafelek Ulepsz zniknął). Koszt widać nad podniesionym elementem.',
     '1.0: budowle stoją jak skrzynia i blokują przejście (nie przy drzwiach ani sercu, nie mogą przeciąć pokoju) i są teraz w zakładce Obiekty. Proch i Mimik przeszły do zakładki Pułapki. Zakładki: 7 zamiast 8.',
     '1.0: w sklepie cały opis karty zawsze mieści się w kafelku, a każda karta ma własny przycisk kupna. Kartę z talii albo schowka otwierasz stuknięciem, na miejscu ofert.',
     '15.2: stuknięcie elementu przenosi go, przytrzymanie zdejmuje (z Esencją), także pułapki od lochu i meble; przycisk Przenieś zniknął. Fala 1 startuje z dwiema pułapkami (18 Esencji na start zamiast 22).',
     '15.2: sklep, podsumowanie fali i koniec runu mieszczą się na jednym ekranie: kafelki, wykres Esencji z fal, pasek źródeł Esencji, zakładki. Kartę w sklepie stukasz, czytasz i dopiero kupujesz; układ się nie przesuwa.',
     '15.1: nowa zakładka Strach i 8 nowych elementów, które tylko straszą: Oczy, Kości, Lustro, Zawiasy, Trumna, Pozytywka oraz potwory Cień i Nietoperze. Oczy i Kości masz od startu, resztę odblokujesz kartami.',
     '15.1: nowa linia u góry: Groza × Chciwość × Combo = Esencja dla każdej serii zdarzeń (stuknij ją: co nalicza Grozę i skąd Esencja w tej fali). Okrągłe skill checki są dwa razy większe, a auto-przyspieszenie w ciszy rusza szybciej.',
     '15.1: strach daje więcej Grozy: pełny pasek strachu 1,6 zamiast 1,2, ucieczka 2,5 zamiast 1,8. Rany straszą za to o ok. 30% słabiej. Przestraszony uciekinier, który widział łup, podnosi chciwość na start następnej fali (do +0,3).',
     '15: jedna waluta. Rany i strach to Groza, a Groza × Chciwość × Combo to Esencja, którą dostajesz od razu i możesz wydać jeszcze w tej samej fali. Nie ma już osobnych punktów, odnawiania co sekundę ani Esencji z dusz.',
     '15: po każdej fali (od fali 2) serce zjada część Esencji: najpierw ze swojego zapasu, potem z Twojej puli. Zabraknie: zjada kryształ. Pasek z sercem pokazuje, czy masz dość.',
     '15: limit Esencji na start 40 (+10 na falę). Esencja ponad limit trafia do zapasu serca. Po fali stały przychód +5. Utracony kryształ odkupisz w sklepie.',
     '15: punkty nie dają już kart: darmowa karta tylko za przetrwaną falę (po bossie legendarna w ofercie). Zebrana w runie Esencja wyznacza rangę.',
     '14.1: przestraszony bohater rzuca kryształ, uwięziony bez ratunku umiera w klatce, pasek elementów w jednym rzędzie przewijanym w bok, dłuższe opisy.',
     '14: sklep między falami ze schowkiem, typy obrażeń, słabości ciała, fobie, trauma, powracający bohaterowie, karta bohatera, 7 kształtów skill checków, ok. 100 kart.'].forEach(t => ul2.appendChild(el('li', null, t)));
    if (PL) { const old = el('details', 'older'); old.appendChild(el('summary', null, 'Starsze wersje')); old.appendChild(ul2); nw.appendChild(old); }
    card.appendChild(nw);
    const links = el('div', 'row small');
    links.appendChild(btn('', L('Ustawienia', 'Settings'), L('język, dźwięk, wibracje, skill checki', 'language, sound, vibration, skill checks'), () => { closeModal(); openModal({ type: 'settings', back: 'start' }); }));
    card.appendChild(links);
  }
  // The menu (the button bottom left): back to the game, settings, save and leave, download, end the run.
  function renderMenu(card, m) {
    const live = run && !run.over && fl && (fl.phase === 'build' || fl.phase === 'raid' || fl.phase === 'summary');
    const back = () => { closeModal(); if (m.unpause && fl && fl.phase === 'raid') setPaused(false); };
    card.appendChild(el('div', 'sub', live ? waveName() + L(' · Esencja ', ' · Essence ') + Math.floor(fl.essence) : 'Menu'));
    card.appendChild(el('h2', null, 'Menu'));
    const box = el('div', 'choices');
    const g = btn('primary', L('Wróć do gry', 'Back to game'), null, back); g.id = 'menu-back'; box.appendChild(g);
    box.appendChild(btn('', L('Ustawienia', 'Settings'), L('język, dźwięk, wibracje, skill checki', 'language, sound, vibration, skill checks'), () => { closeModal(); openModal({ type: 'settings', back: 'menu', unpause: m.unpause }); }));
    if (PC()) box.appendChild(btn('', L('Sterowanie', 'Controls'), L('mysz, touchpad i klawiatura', 'mouse, touchpad and keyboard'), () => { closeModal(); openModal({ type: 'keys', unpause: m.unpause }); }));   // 1.25
    if (WEB && surveyState() !== 'done') box.appendChild(btn('', L('Ankieta', 'Survey'), L('5 krótkich pytań o grę', '5 quick questions about the game'), () => openModal({ type: 'survey', unpause: m.unpause })));
    if (WEB && !standalone() && (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) {   // the web version: full screen on and off
      const full = isFull(); box.appendChild(btn('', full ? L('Wyjdź z pełnego ekranu', 'Exit full screen') : L('Pełny ekran', 'Full screen'), full ? L('wróci pasek przeglądarki', 'the browser bar comes back') : L('bez paska przeglądarki', 'no browser bar'), () => { UI.noFull = full; saveUI(); if (full) leaveFullscreen(); else goFullscreen(); back(); }));
    }
    const note = el('p', 'note', run && run.logState ? logText(run.logState) : '');
    if (live) box.appendChild(btn('', L('Zapisz i wyjdź', 'Save and quit'), fl.phase === 'raid' ? L('wrócisz do budowy przed tą falą', 'you come back to the build before this wave') : L('wrócisz w to samo miejsce', 'you come back right here'), () => { if (fl.phase === 'build') saveRun('build'); closeModal(); openModal({ type: 'start' }); }));
    if (live && run.waves.length + (fl.phase === 'raid' ? 1 : 0) > 0) {
      box.appendChild(btn('', L('Pobierz wyniki', 'Download results'), L('dla testerów: plik z przebiegiem runu', 'for testers: a file with the run log'), () => downloadRun(note)));
      const q = btn('', L('Zakończ run', 'End run'), L('zapisze dotychczasowy przebieg', 'saves what you have so far'), () => {
        if (!q.dataset.sure) { q.dataset.sure = '1'; q.querySelector('b').textContent = L('Na pewno? Stuknij jeszcze raz', 'Sure? Tap again'); return; }
        closeModal(); quitRun();
      });
      box.appendChild(q);
    }
    card.appendChild(box); card.appendChild(note);
  }
  // 1.25: the controls on a computer
  function renderKeys(card, m) {
    card.appendChild(el('div', 'sub', 'Menu')); card.appendChild(el('h2', null, L('Sterowanie', 'Controls')));
    const t = el('table', 'keys');
    L([['Lewy przycisk', 'jak stuknięcie: wybór, stawianie, przenoszenie, skill check; dwuklik ulepsza'],
     ['Przeciągnij', 'przesuwa mapę (lewym albo środkowym przyciskiem)'],
     ['Prawy przycisk', 'na kafelku: opis; na postawionym elemencie: zdejmij (kliknij drugi raz, żeby potwierdzić)'],
     ['Najechanie', 'opis kafelka, elementu na mapie albo bohatera'],
     ['Kółko', 'przybliża i oddala'], ['Touchpad', 'dwa palce przesuwają mapę, szczypanie przybliża'],
     ['W A S D, strzałki', 'przesuwają mapę'], ['+ / -', 'przybliża i oddala'],
     ['1-9, 0', 'kafelki w pasku (numer w rogu kafelka)'], ['Q / E', 'poprzednia i następna zakładka'],
     ['Enter', 'wypuść falę'], ['Spacja', 'skill check'], ['F (przytrzymaj)', 'przyspieszenie w fali'],
     ['B, P', 'pasek budowy (w fali: pauza)'], ['Ctrl+Z', 'cofnij (między falami)'], ['Esc', 'odłóż to, co masz w ręce']],
     [['Left button', 'like a tap: select, place, move, skill check; double-click to upgrade'],
     ['Drag', 'moves the map (left or middle button)'],
     ['Right button', 'on a tile: its description; on a placed item: remove it (click again to confirm)'],
     ['Hover', 'describes a tile, an item on the map or a hero'],
     ['Wheel', 'zooms in and out'], ['Touchpad', 'two fingers move the map, pinch to zoom'],
     ['W A S D, arrows', 'move the map'], ['+ / -', 'zoom in and out'],
     ['1-9, 0', 'tiles in the bar (number in the tile corner)'], ['Q / E', 'previous and next tab'],
     ['Enter', 'release the wave'], ['Space', 'skill check'], ['F (hold)', 'speed up a wave'],
     ['B, P', 'build bar (in a wave: pause)'], ['Ctrl+Z', 'undo (between waves)'], ['Esc', 'put down what you are holding']]).forEach(r => {
      const tr = el('tr'); const a = el('td'); r[0].split(', ').forEach((x, i) => { if (i) a.appendChild(document.createTextNode(', ')); a.appendChild(el('kbd', null, x)); }); tr.appendChild(a); tr.appendChild(el('td', null, r[1])); t.appendChild(tr); });
    card.appendChild(t);
    const g = btn('primary', L('Wróć do gry', 'Back to game'), null, () => { closeModal(); if (m.unpause && fl && fl.phase === 'raid') setPaused(false); }); card.appendChild(g);
  }
  const settingsBack = m => () => { closeModal(); if (m.back === 'start') openModal({ type: 'start' }); else if (m.back === 'menu') openModal({ type: 'menu', unpause: m.unpause }); };
  function sliderRow(sd) {
    if (sd.toggle) {
      const lab = el('label', 'toggle'); lab.appendChild(el('span', null, sd.label));
      const inp = el('input'); inp.type = 'checkbox'; inp.id = 'sl-' + sd.k; inp.checked = !!S[sd.k];
      inp.addEventListener('change', () => { S[sd.k] = inp.checked ? 1 : 0; saveSettings(); });
      lab.appendChild(inp); return lab;
    }
    const wrap = el('div', 'slider'), lab = el('label'); lab.setAttribute('for', 'sl-' + sd.k);
    const val = el('b'), show = () => { val.textContent = sd.fmt ? sd.fmt(S[sd.k]) : String(S[sd.k]); };
    show(); lab.appendChild(el('span', null, sd.label)); lab.appendChild(val);
    const inp = el('input'); inp.type = 'range'; inp.id = 'sl-' + sd.k; inp.min = sd.min; inp.max = sd.max; inp.step = sd.step; inp.value = S[sd.k];
    inp.addEventListener('input', () => { S[sd.k] = parseFloat(inp.value); show(); saveSettings(); applyLook(); });
    wrap.appendChild(lab); wrap.appendChild(inp); return wrap;
  }
  // 1.02: settings that change the page itself (the extra gap at the top of the screen)
  function applyLook() { try { document.documentElement.style.setProperty('--top-extra', Math.max(0, S.topPad || 0) + 'px'); } catch (e) {} }
  applyLook();
  // Player settings: what a player of the finished game would see.
  function renderSettings(card, m) {
    card.appendChild(el('h2', null, L('Ustawienia', 'Settings')));
    { // 1.27: the language, first; a change reloads the game (a run in the build is saved first)
      const lw = el('div', 'langrow'); lw.appendChild(el('span', null, 'Język / Language'));
      const sg = el('div', 'seg'); sg.id = 'lang-seg';
      [['en', 'English'], ['pl', 'Polski']].forEach(([v, nm]) => { const b = el('button', LANG === v ? 'on' : '', nm); b.type = 'button'; b.dataset.lang = v;
        b.addEventListener('click', () => { if (v === LANG) return; try { localStorage.setItem('yatd-lang', v); } catch (e) {} try { if (run && fl && fl.phase === 'build' && run.crystals > 0) saveRun('build'); } catch (e) {} location.reload(); });
        sg.appendChild(b); });
      lw.appendChild(sg); card.appendChild(lw); }
    { // 1.28.0: graphics: Auto / Full / Saver (saved on this device; p6_loop.js setGfxMode)
      const GM = [['auto', L('Auto', 'Auto'), L('Gra sama upraszcza obraz, gdy telefon nie nadąża.', 'Simpler graphics when the phone cannot keep up.')],
        ['full', L('Pełna', 'Full'), L('Zawsze wszystkie szczegóły i pełna ostrość.', 'Always every detail at full sharpness.')],
        ['eco', L('Oszczędna', 'Saver'), L('Mniej drobiazgów i mniej pikseli: płynniej, chłodniejszy telefon.', 'Fewer small details and fewer pixels: smoother, a cooler phone.')]];
      const gw = el('div', 'langrow'); gw.appendChild(el('span', null, L('Grafika', 'Graphics')));
      const sg = el('div', 'seg'); sg.id = 'gfx-seg'; const why = el('p', 'note gfxwhy');
      const show = () => { sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.gfx === GFX.mode)); const g = GM.find(q => q[0] === GFX.mode); why.textContent = g ? g[2] : ''; };
      GM.forEach(([v, nm]) => { const b = el('button', '', nm); b.type = 'button'; b.dataset.gfx = v; b.addEventListener('click', () => { setGfxMode(v); show(); }); sg.appendChild(b); });
      gw.appendChild(sg); card.appendChild(gw); card.appendChild(why); show(); }
    GAME_SETTINGS.forEach(sd => card.appendChild(sliderRow(sd)));
    if (/perf/.test(location.hash + location.search)) card.appendChild(btn('', L('Test wydajności', 'Performance test'), L('loch z fali 17 i licznik klatek; zastępuje obecny run', 'the wave-17 dungeon and a frame counter; replaces the current run'), () => { closeModal(); perfTest(); }));   // 1.28.0: the author's phone test (#perf)
    card.appendChild(el('p', 'note', L('Ustawienia działają od razu i zapisują się w tej przeglądarce.', 'Settings apply at once and are saved in this browser.')));
    const row = el('div', 'row');
    row.appendChild(btn('primary', L('Gotowe', 'Done'), null, settingsBack(m)));
    card.appendChild(row);
  }
  // 1.28.0: the author's phone test. With #perf in the address the Settings show "Test wydajności": it loads the wave-17 dungeon of
  // the analysis (26.10: 18 rooms, 107 elements; the same loader as the frame-time benchmark) in the build, its wave ready to go,
  // and shows a small counter in the top corner: frames a second, the frame's median JS ms, the graphics level (L0-L2, xscale).
  const PERF_F17 = '{"cells":[[4,0,34,2,37,6,1,[[36,5,"crate",1],[36,2,"crate",1],[36,3,"crate",1]],"crypt","goblin"],[4,1,36,10,38,12,0,[],null,null],[3,1,26,11,29,14,6,[],"crypt","goblin"],[4,2,34,18,38,22,2,[[37,21,"shelf",0],[36,21,"crate",0],[35,21,"crate",1],[37,20,"shelf",0],[34,21,"crate",1],[37,19,"crate",1],[36,19,"crate",1],[35,19,"crate",1]],"swamp","goblin"],[3,2,26,19,29,22,7,[[28,19,"crate",1],[27,21,"crate",1]],"gears","armory"],[2,2,18,19,21,22,3,[[21,20,"crate",1],[20,20,"crate",1],[19,20,"crate",1],[19,21,"crate",1]],"vault","goblin"],[2,1,18,12,22,14,1,[[22,13,"crate",1],[21,13,"crate",1],[20,13,"crate",1],[19,13,"crate",1]],"fog","goblin"],[2,0,18,3,20,6,1,[],"fog","goblin"],[3,0,26,2,30,5,1,[[28,4,"crate",1],[29,4,"crate",1],[30,4,"crate",1],[26,4,"crate",1]],"crypt","ogre"],[1,0,10,3,14,6,0,[[14,4,"crate",0]],null,"haunt"],[1,1,11,11,14,13,0,[[11,12,"barrel",0],[14,12,"statue",0]],null,"haunt"],[3,3,26,26,30,30,0,[[26,30,"crate",0],[29,27,"barrel",0],[30,27,"shelf",0]],"fog","haunt"],[3,4,27,35,29,38,0,[],"fog","haunt"],[2,4,18,34,21,37,0,[],"grotto","prison"],[3,5,26,42,30,44,0,[[29,43,"shelf",0],[26,43,"crate",0]],"grotto","prison"],[4,4,34,36,38,38,0,[[38,36,"barrel",0],[37,38,"statue",0]],"grotto","prison"],[4,3,34,26,38,30,0,[[37,27,"statue",0]],"grotto","prison"],[2,3,18,26,21,29,0,[[19,27,"crate",0]],"grotto","prison"]],"edges":[["4,0","4,1",0,35,37,0],["4,1","4,2",0,37,36,0],["3,2","4,2",1,19,20,0],["2,2","3,2",1,19,20,0],["2,1","2,2",0,21,19,1],["2,0","2,1",0,18,20,1],["2,0","3,0",1,5,2,0],["3,0","3,1",0,27,28,0],["1,0","2,0",1,3,5,0],["1,1","2,1",1,11,13,0],["3,2","3,3",0,28,29,0],["3,3","3,4",0,27,28,0],["2,4","3,4",1,37,38,0],["3,4","3,5",0,27,27,0],["3,4","4,4",1,36,38,0],["3,3","4,3",1,26,29,0],["2,3","3,3",1,26,29,0]],"entrance":"4,0","heart":"3,1","entX":35,"items":[["lpotion",30,2,1],["lpotion",30,3,1],["trapdoor",32,19,1],["trapdoor",19,17,1],["trapdoor",36,8,1],["trapdoor",20,8,1],["trapdoor",24,5,1],["goblin",28,12,3],["goblin",27,11,3],["goblin",29,11,3],["archer",28,14,3],["goblin",34,18,3],["goblin",35,20,3],["goblin",37,5,3],["shackles",36,6,1],["acid",26,14,1],["goblin",37,3,3],["ogre",28,11,3],["ogre",27,4,3],["shade",12,12,3],["shade",13,12,3],["shade",12,5,3],["shade",12,4,3],["trapdoor",28,8,1],["archer",21,12,3],["goblin",19,12,3],["goblin",19,19,3],["pendulum",29,18,3],["pendulum",29,23,3],["loot",35,22,1],["lpotion",34,22,1],["altar",37,11,1],["lcursed",38,11,1],["lcursed",37,10,1],["lcursed",36,11,1],["lcursed",37,12,1],["lcursed",36,12,1],["lcursed",36,10,1],["lcursed",38,10,1],["lcursed",38,12,1],["loot",26,19,1],["loot",21,22,1],["loot",20,22,1],["loot",11,11,1],["loot",11,13,1],["loot",10,3,1],["loot",10,6,1],["loot",18,3,1],["loot",19,3,1],["loot",20,3,1],["shackles",28,20,1],["pendulum",27,18,3],["pendulum",27,23,3],["pendulum",30,21,3],["falsedoor",21,15,1],["falsedoor",18,7,1],["loot2",37,6,1],["lpotion",37,2,1],["ogre",37,4,3],["ogre",26,20,3],["rune",28,21,1],["warlord",27,13,3],["shaman",29,13,3],["shaman",19,4,3],["goblin",18,21,3],["archer",18,22,3],["loot3",20,21,1],["sapper",18,20,3],["shaman",19,22,3],["loot",22,12,1],["shaman",27,19,3],["goblin",38,22,3],["archer",37,22,3],["shaman",36,22,3],["goblin",28,2,3],["goblin",28,3,3],["shaman",29,3,3],["cage",34,38,1],["cage",27,42,1],["cage",21,37,1],["cage",21,26,1],["cage",34,29,1],["gate",27,41,1],["gate",22,37,1],["gate",22,26,1],["gate",31,26,1],["gate",33,38,1],["shade",36,37,1],["shade",28,43,1],["shade",19,36,1],["shade",19,28,1],["ghost",28,28,1],["ghost",28,36,1],["ghost",29,29,1],["ghost",27,29,1],["ghost",29,37,1],["goblin",20,5,3],["goblin",18,6,3]],"deck":["monsterroar","cursed","resonance","pack","monster","essence","copyist","secondheart","warden","heartpatience","heartdread","kingsfeast","heartguide","heavycrystal"],"upgrades":["monsterroar","u-web","cursed","u-falsedoor","secondheart","warden","resonance","u-snare","u-shade","pack","monster","u-hound","heartpatience","u-pendulum","cursed","monster","u-siren","warden","infusion","infusion","u-lich","u-tar","u-spider","monsterroar","essence","usurer","u-skeleton","u-bell","u-miasma","heartpatience","copyist","u-demon","u-coffin","u-oilslick","heartdread","kingsfeast","u-ogre","u-mirror","u-bats","essence","pack","u-shaman","crystal","u-zombie","infusion","heartguide","u-musicbox","u-sapper","u-bait","u-ghost","u-cage","heartdread","kingsfeast","u-creak","u-imp","u-mimic","u-fire","u-flood","cooldown","u-rats","u-bolt","u-warlord","heavycrystal","infusion"]}';
  function perfTest() {
    const doc = JSON.parse(PERF_F17);
    while (modalKind) closeModal();
    newRun(false); while (modalKind) closeModal();
    const Lt = { cells: new Map(), edges: new Map(), entrance: doc.entrance, heartKey: doc.heart, entX: doc.entX };
    doc.cells.forEach(c => { const o = { cx: c[0], cy: c[1], x0: c[2], y0: c[3], x1: c[4], y1: c[5], lvl: c[6], born: 0, objs: c[7].map(q => q[3] ? [q[0], q[1], q[2], 1] : [q[0], q[1], q[2]]) }; if (c[8]) o.rt = c[8]; if (c[9]) o.rk = c[9]; Lt.cells.set(c[0] + ',' + c[1], o); });
    doc.edges.forEach(e => { const k = e[0] < e[1] ? e[0] + '|' + e[1] : e[1] + '|' + e[0]; Lt.edges.set(k, { key: k, a: e[0], b: e[1], horiz: !!e[2], pa: e[3], pb: e[4], lvl: e[5], born: 0 }); });
    run.layout = Lt; run.wave = 17; run.total = 763; run.crystals = 3;
    run.deck = (doc.deck || []).slice(); recomputeMods();
    (doc.upgrades || []).forEach(id => { const u = UPG[id]; if (u && u.kind === 'unlock') run.unlocked.add(u.unlock); });
    run.items.clear();
    const LM = [1, 1, 1.5, 2.2];
    doc.items.forEach(([type, x, y, lvl]) => { const T = ITEMS[type]; if (!T) return; lvl = lvl || 1; const hp = T.hp ? T.hp * mods.monster * LM[lvl] : 0; run.items.set(x + ',' + y, { type, x, y, cd: 0, anim: 0, disabled: false, hp, max: hp, power: mods.monster * (T.hp ? LM[lvl] : 1), shot: 0.5, flash: 0, preview: 0, gx: x + 0.5, gy: y + 0.5, lvl, spent: T.cost, dropped: false }); run.unlocked.add(type); });
    startBuild(true);
    run.next = makeWave(run.wave);
    perfHud(true);
  }
  // Test sliders: the balance knobs for testing, kept apart from the player's settings.
  function renderTests(card, m) {
    card.appendChild(el('h2', null, L('Ustawienia testowe', 'Test settings')));
    card.appendChild(el('p', 'note', L('Suwaki balansu do testów. Działają od razu i zapisują się w tej przeglądarce. Kryształy, Esencja na start i miejsca w talii zmieniają się od nowego runu.', 'Balance sliders for testing. They apply at once and are saved in this browser. Crystals, starting Essence and deck slots change from the next run.')));
    SLIDERS.forEach(sd => card.appendChild(sliderRow(sd)));
    const row = el('div', 'row');
    row.appendChild(btn('', L('Przywróć domyślne', 'Reset to defaults'), L('także ustawienia gry', 'game settings too'), () => { S = Object.assign({}, DEFAULTS); saveSettings(); closeModal(); openModal(m); }));
    row.appendChild(btn('primary', L('Gotowe', 'Done'), null, settingsBack(m)));
    card.appendChild(row);
  }
  // Three cards to choose from. Rarity follows the source: a wave gives mostly common cards (a rare one now and then),
  // a points threshold opens all rare cards, a boss guarantees a legendary. New traps and monsters come as unlocks (no slot).
  const reqOk = u => !u.req || (typeof u.req === 'function' ? u.req() : run.unlocked.has(u.req));
  function upgradePicks(r) {
    const has = id => run.deck.includes(id) || (run.stash || []).includes(id);
    const locked = shuffle(UPGRADES.filter(u => u.kind === 'unlock' && !run.unlocked.has(u.unlock) && onbOk(u.unlock)));   // 1.12: nothing from a later run
    const f = 0.75 * Math.max(0, run.wave - 1), rareP = r >= 2 ? 1 : Math.min(0.6, 0.15 + 0.02 * f), legP = r >= 3 ? 1 : r >= 2 ? Math.min(0.4, 0.15 + 0.01 * f) : Math.min(0.15, 0.03 + 0.005 * f);
    const rarOk = u => u.rar === 'c' || (u.rar === 'r' && Math.random() < rareP) || (u.rar === 'l' && Math.random() < legP);   // the more famous the dungeon, the better the cards
    const pool = UPGRADES.filter(u => u.kind !== 'unlock' && !u.heartOnly && u.group !== 'heart' && reqOk(u) && (ONB_CARD[u.id] || 1) <= stageOf() && !(u.unique && has(u.id)) && !isFused(u.id) && rarOk(u));   // 1.26: Odrost only in the Dar serca row   // 1.24: no third copy of a fused ★ card
    const picks = [];
    if (r === 3) { const leg = shuffle(pool.filter(u => u.rar === 'l')); if (leg.length) picks.push(leg[0]); }
    if (locked.length && (r >= 2 || Math.random() < 0.5)) picks.push(locked[0]);
    const rest = shuffle(pool.filter(u => !picks.includes(u)));
    while (picks.length < 3 && rest.length) picks.push(rest.shift());
    return shuffle(picks);
  }
  // v14: the shop between waves (like Balatro): free picks for waves held and points thresholds, four cards for Esencja,
  // a reroll that gets dearer (back to the base price every wave), selling, and a stash of inactive cards.
  const SHOP_PRICE = { c: 5, r: 9, l: 14 }, STASH_BASE = 3;   // Prototype 1.01: higher prices; 1.26: 5 / 9 / 14 (less Esencja in the game)
  const stashCap = () => STASH_BASE + (mods.stashPlus || 0);
  const priceOf = u => Math.max(1, Math.round((u.kind === 'unlock' ? 7 : SHOP_PRICE[u.rar]) * (1 - (mods.shopDisc || 0))));
  const sellOf = u => Math.round(RAR_SELL[u.rar] * (mods.sellK || 1));
  const sellFor = id => UPG[id] ? sellOf(UPG[id]) * (isFused(id) ? 2 : 1) : 0;   // 1.24: a fused ★ card sells for two
  const fuses = u => !!u && u.kind === 'card' && !u.unique && ownsCard(u.id) && !isFused(u.id);   // 1.24: taking it fuses it with the one you have
  const unfuse = id => { if (run.fused) run.fused = run.fused.filter(x => x !== id); };   // 1.24: sold: the ★ goes with it
  const cardName = id => (isFused(id) ? '★ ' : '') + (UPG[id] ? UPG[id].name : id);   // 1.24
  const rerollCost = () => run.shop && run.shop.rerolls < (mods.freeReroll || 0) ? 0 : 2 + (run.shop ? run.shop.rerolls - (mods.freeReroll || 0) : 0);   // 1.26: 2, 3, 4...
  function shopRoll() {
    const owed = run.shopOwed || 1, ids = upgradePicks(owed).map(u => u.id);
    const n = 4 + (mods.shopPlus || 0);   // 1.26 Wiedza mroku: one more
    for (let k = 0; k < 6 && ids.length < n; k++) { const more = upgradePicks(1).map(u => u.id).filter(id => !ids.includes(id)); if (more.length) ids.push(more[0]); }
    return ids.filter(id => !(UPG[id].unique && (run.stash || []).includes(id)) && !isFused(id)).slice(0, n);   // 1.24: isFused
  }
  // 1.26 (10.2) Runa rodu: one in every shop, a family weighted 3 when one of its elements stands in the dungeon (else 1), never one at 5
  function runeRoll() {
    const has = new Set(); if (fl) fl.items.forEach(it => { if (FAMILY_OF[it.type] && !it.temp && !it.dropped) has.add(FAMILY_OF[it.type]); });
    const fs = Object.keys(FAMILIES).filter(f => (run.famLv[f] || 0) < RUNE_MAX && (stageOf() >= 2 || has.has(f))), w = fs.map(f => has.has(f) ? 3 : 1), tot = w.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot; for (let i = 0; i < fs.length; i++) { x -= w[i]; if (x <= 0) return fs[i]; }
    return fs[0] || null;
  }
  function runeBuy() {
    const f = run.shop && run.shop.rune; if (!f || !fl || fl.phase !== 'build') return 'no';
    const lv = run.famLv[f] || 0, c = runePrice(lv); if (fl.essence < c) return 'ess';
    fl.essence -= c; run.famLv[f] = lv + 1; run.shop.rune = null; run.shop.runeDone = f; (run.runes = run.runes || []).push(f); fl.stats.runes = (fl.stats.runes || 0) + 1;   // 1.27.1: its slot stays, empty (1.27.5: the two counts were cut off by this comment since 1.27.1)
    run.essence = fl.essence; fl.threatDirty = true; updateTray(); saveRunSoon(); return 'ok';
  }
  function shopRefresh(fresh) {
    const same = run.shop && run.shop.wave === run.wave;
    run.famLv = run.famLv || {};
    run.shop = { wave: run.wave, ids: shopRoll(), rerolls: same && !fresh ? run.shop.rerolls : 0, ad: same && !fresh ? run.shop.ad : false, rune: runeRoll() };
    if (fresh) run.shopOwed = 1;
    run.stash = run.stash || [];
  }
  function shopBuy(i) {
    const id = run.shop.ids[i], u = UPG[id]; if (!u || !fl || fl.phase !== 'build') return 'no';
    const free = run.freePicks > 0, price = free ? 0 : priceOf(u);
    if (!free && fl.essence < price) return 'ess';
    const fz = fuses(u), toStash = u.kind === 'card' && !fz && !isGift(id) && deckFull();   // 1.24: a second copy needs no slot (1.27.5: deckFull counts the ordinary cards)
    if (toStash && run.stash.length >= stashCap()) return 'full';
    if (free) run.freePicks--; else fl.essence -= price;
    run.shop.ids[i] = null;
    if (toStash) { run.stash.push(id); run.upgrades.push(id); } else applyUpgrade(u);
    run.essence = fl.essence; recomputeMods(); updateTray(); saveRunSoon();
    return toStash ? 'stash' : fz ? 'fused' : 'ok';
  }
  // 1.26 Dar serca (4.5; 1.26.1: rare 70% / legendary 30%, the Serce cards only here): every heart level waits in run.heartPicks for a free card from the Serce group: 3 to choose from (Dziesięcina:
  // 4), rarity 55 / 35 / 10%; at levels 3, 5, 7 (and every second after) one of them is Odrost when a crystal is missing. A pick waits
  // (in the shop) until taken; the offer of a pick stays the same once rolled (pk.ids).
  function heartOffer() {
    const pk = run && run.heartPicks && run.heartPicks[0]; if (!pk) return null;
    const regrow = heartRegrowLv(pk.lv) && run.crystals < run.maxCrystals;
    if (pk.ids && (pk.regrow === regrow)) return pk;
    const has = id => run.deck.includes(id) || (run.stash || []).includes(id);
    const pool = UPGRADES.filter(u => u.group === 'heart' && !u.heartOnly && u.kind !== 'unlock' && reqOk(u) && !(u.unique && has(u.id)) && !isFused(u.id) && !(u.id === 'crystal' && (run.heartCards || []).includes('crystal')));   // 1.27.5 (brief C): Żarłoczne serce once a run
    const n = 3 + (mods.titheChoice || 0), ids = [];
    for (let k = 0; k < n; k++) {
      const r = Math.random(), want = r < 0.7 ? 'r' : 'l';   // 1.26.1: rare 70%, legendary 30% (the Serce cards are only here)
      const left = pool.filter(u => !ids.includes(u.id)), of = left.filter(u => u.rar === want);
      const u = (of.length ? pick(of) : left.length ? pick(left) : null); if (u) ids.push(u.id);
    }
    if (regrow) ids.splice(0, ids.length >= n ? 1 : 0, 'regrow');
    pk.ids = ids; pk.regrow = regrow;
    return pk;
  }
  function heartTake(i) {
    const pk = heartOffer(); if (!pk || !fl || fl.phase !== 'build') return 'no';
    const id = pk.ids[i], u = UPG[id]; if (!u) return 'no';
    const fz = fuses(u), toS = u.kind === 'card' && !fz && !isGift(id) && deckFull();   // 1.27.5 (brief B): a gift card never goes to the stash
    if (toS && run.stash.length >= stashCap()) return 'full';
    run.heartPicks.shift();
    if (toS) { run.stash.push(id); run.upgrades.push(id); } else applyUpgrade(u);
    (run.heartCards = run.heartCards || []).push(id);
    fl.heartPick = { lv: pk.lv, took: id, offer: pk.ids.slice() }; fl.stats.heartPicks = (fl.stats.heartPicks || 0) + 1; (fl.heartPicksLog = fl.heartPicksLog || []).push({ lv: pk.lv, took: id, offer: pk.ids.slice(), phase: fl.phase });   // 1.27.5 (brief E): every pick of the build
    run.essence = fl.essence; recomputeMods(); updateTray(); saveRunSoon();
    return toS ? 'stash' : fz ? 'fused' : 'ok';
  }
  function shopReroll(ad, heart) {
    if (!fl || fl.phase !== 'build') return false;
    if (ad) { if (run.shop.ad) return false; run.shop.ad = true; }
    else { const c = rerollCost(); if (fl.essence < c) return false; fl.essence -= c; run.shop.rerolls++; }
    // 1.27.4 (author: Refresh did nothing over the Heart's Gift): with the Heart's Gift open it draws new heart cards (the offers stay)
    const pk = heart && run.heartPicks && run.heartPicks[0];
    if (pk) { delete pk.ids; delete pk.regrow; heartOffer(); fl.stats.heartRerolls = (fl.stats.heartRerolls || 0) + 1; run.essence = fl.essence; updateTray(); saveRunSoon(); return true; }
    run.shop.ids = shopRoll(); run.shop.rune = runeRoll(); run.shop.runeDone = null; run.essence = fl.essence; updateTray(); saveRunSoon(); return true;
  }
  function toStash(i) {
    if (run.stash.length >= stashCap() || !run.deck[i] || isGift(run.deck[i])) return false;   // 1.27.5: a gift card frees no slot, it stays
    run.stash.push(run.deck.splice(i, 1)[0]); recomputeMods(); updateTray(); saveRunSoon(); return true;
  }
  function fromStash(i) {
    if (deckFull() || !run.stash[i]) return false;
    deckAdd(run.stash.splice(i, 1)[0]); recomputeMods(); updateTray(); saveRunSoon(); return true;
  }
  function sellStash(i) {
    const u = UPG[run.stash[i]]; if (!u) return 0;
    const g = sellFor(u.id); run.stash.splice(i, 1); (run.sold = run.sold || []).push(u.id); unfuse(u.id); addEss(g); return g;   // 1.24: sellFor, unfuse
  }
  // v15.1: the screens between waves (shop, wave summary, end of the run) fill one screen and never scroll. Their layout stays
  // put whatever you tap: the same boxes in the same places; a list that would not fit its box drops its last rows (and says so).
  function fitList(box) {
    const go = () => {
      const old = box.querySelector('.more'); if (old) old.remove();
      const rows = [...box.children]; rows.forEach(r => { r.style.display = ''; });
      if (box.scrollHeight <= box.clientHeight + 1) return;
      const gap = parseFloat(getComputedStyle(box).rowGap) || 0, H = box.clientHeight;
      let hidden = 0;
      const more = el('div', 'more', '');
      if (!box.classList.contains('grid2')) {   // keep rows in their order while they fit; a long one that does not fit makes way for shorter ones after it
        const hs = rows.map(r => r.getBoundingClientRect().height), room = H - 16 - gap;
        let used = 0;
        rows.forEach((r, i) => { const need = (used ? gap : 0) + hs[i]; if (used + need <= room) used += need; else { r.style.display = 'none'; hidden++; } });
      }
      box.appendChild(more);
      while (box.scrollHeight > box.clientHeight + 1) { const vis = rows.filter(r => r.style.display !== 'none'); if (vis.length <= 1) break; vis[vis.length - 1].style.display = 'none'; hidden++; more.textContent = '+' + hidden + L(' więcej', ' more'); }
      if (hidden) more.textContent = '+' + hidden + L(' więcej', ' more'); else more.remove();
    };
    requestAnimationFrame(go);
  }
  function scrHead(card, sub, title, big, bigSub, count) {
    const h = el('div', 'scr-head'), t = el('div', 'ttl');
    t.appendChild(el('div', 'sub', sub)); t.appendChild(el('h2', null, title)); h.appendChild(t);
    if (big != null) {
      const b = el('div', 'scr-big'), n = el('b', null, big); b.appendChild(n); if (bigSub) b.appendChild(el('span', null, bigSub)); h.appendChild(b);
      if (count && card.classList.contains('enter') && !reduceMotion) countUp(n, count[0], count[1]);   // Prototype 1.0: the harvest counts up when the screen opens
    }
    card.appendChild(h); return h;
  }
  function countUp(e, to, fmt) {
    const t0 = performance.now(), ms = 900;
    const tick = now => { const u = Math.min(1, Math.max(0, (now - t0) / ms)); e.textContent = fmt(to * (1 - Math.pow(1 - u, 3))); if (u < 1 && e.isConnected) requestAnimationFrame(tick); else e.textContent = fmt(to); };
    e.style.minWidth = fmt(to).length + 'ch'; e.style.textAlign = 'right';   // the box keeps its final width: the title next to it never re-wraps mid-count
    e.textContent = fmt(0); requestAnimationFrame(tick);
  }
  function panel(parent, title, right, cls) {
    const p = el('div', 'panel' + (cls ? ' ' + cls : ''));
    if (title) { const h = el('h3'); h.appendChild(el('span', null, title)); if (right) h.appendChild(el('span', 'r', right)); p.appendChild(h); }
    parent.appendChild(p); return p;
  }
  // Esencja wave by wave. Every wave of the run has its place from the start (nothing moves); red = a crystal lost or eaten;
  // the pink tick = what the heart ate after that wave.
  function waveChart(parent, W, curWave) {
    const n = Math.max(RUN_WAVES, curWave || 0, ...W.map(w => w.wave));
    const maxS = Math.max(1, ...W.map(w => w.score), ...W.map(w => (w.hunger && w.hunger.need) || 0));
    const ch = el('div', 'wchart'); ch.setAttribute('aria-label', L('Esencja w kolejnych falach', 'Essence per wave'));
    for (let k = 1; k <= n; k++) {
      const w = W.find(q => q.wave === k), c = el('div', 'wc' + (k === curWave ? ' cur' : '') + (w ? '' : ' future')), col = el('div', 'col');
      if (w) {
        const pct = Math.max(3, Math.round(100 * w.score / maxS)), bar = el('i', w.crystalLost || (w.hunger && w.hunger.ate) ? 'lost' : '');
        bar.style.height = pct + '%'; bar.title = L('Fala ', 'Wave ') + k + ': ' + w.score + L(' Esencji', ' Essence'); col.appendChild(bar);
        if (w.hunger && w.hunger.need) { const t = el('u'); t.style.bottom = Math.round(100 * w.hunger.need / maxS) + '%'; col.appendChild(t); }
        if (k === curWave) col.appendChild(el('em', null, String(w.score)));   // 1.05: at the foot of the bar (CSS), readable on any height
      }
      c.appendChild(col); c.appendChild(el('span', null, String(k))); ch.appendChild(c);
    }
    parent.appendChild(ch); return ch;
  }
  const frow = (list, text, k) => list.appendChild(el('div', 'frow' + (k ? ' k-' + k : ''), text));
  const ordEn = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');   // 1.27: 2nd, 3rd (English only)

  /* ----- the wave summary ----- */
  // 1.05 (testers: the summary was a lot): one screen with what matters now: the harvest and the heart's share (the old reckoning
  // screen is folded in), Esencja, the heart, the crystals, the chart, three curiosities of the wave and the next party at a glance.
  // Where the Esencja came from, the hero list, the elements and the numbers sit under Szczegóły.
  // 1.26: the heart's part of the wave summary: the purse it took from (an animated bar), the Danina, a new level, Odrodzenie, the theft near-miss
  function heartLines(body, H) {
    const s = fl.stats, box = el('div', 'heartsum'); box.id = 'wave-heart';
    if (H && !H.fedWave && (H.tookPurse || 0) > 0) {
      const p0 = Math.max(1, H.purse0 || 0), p1 = Math.max(0, p0 - (H.tookPurse || 0)) - (H.ate ? (H.lostPurse || 0) : 0);
      const r = el('div', 'purse-take' + (H.ate ? ' ate' : '')), bar = el('div', 'pbar'), fill = el('i'); bar.appendChild(fill);
      r.appendChild(el('span', null, H.ate ? L('♥ Serce zjadło całą sakiewkę (' + Math.round(p0) + ') i kryształ', '♥ The heart ate your purse (' + Math.round(p0) + ') and a crystal') : L('♥ Serce wzięło ' + fmtE(H.tookPurse) + ' z sakiewki (', '♥ The heart took ' + fmtE(H.tookPurse) + ' from your purse (') + Math.round(p0) + ' → ' + Math.round(Math.max(0, p1)) + ')'));
      r.appendChild(bar); box.appendChild(r);
      fill.style.width = '100%';
      setTimeout(() => { fill.style.width = (100 * Math.max(0, p1) / p0).toFixed(1) + '%'; }, reduceMotion ? 0 : 450);
    }
    const bits = [];
    if ((s.satietyGain || 0) >= 1) bits.push(L('Nasycenie +', 'Satiety +') + Math.round(s.satietyGain) + L(' (Danina ', ' (Tithe ') + fmtE(s.essTithe || 0) + ')');
    if (s.heartUp) bits.push(L('serce ma poziom ' + (run.heartLv || 0) + ': w sklepie czeka Dar serca', 'heart level ' + (run.heartLv || 0) + ": a Heart's Gift waits in the shop"));
    if (heartUpBlocked()) bits.push(L('Nasycenie pełne: poziom serca wejdzie na początku budowy', 'Satiety full: the heart levels up when the build starts'));   // 1.27.5 (brief A)
    if (s.revived) bits.push(L('powalone potwory wstaną: ' + s.revived + ' (Głód następnej fali +' + s.revived + ')', 'fallen monsters will rise: ' + s.revived + ' (next Hunger +' + s.revived + ')'));
    if (s.feastPts >= 1) bits.push(L('Uczta: +', 'Feast: +') + fmtE(s.feastPts) + L(' (zabici przez potwory)', ' (monster kills)'));
    if (!fl.crystalLost && (s.stealMax || 0) >= 0.3) { const left = Math.max(0, (1 - s.stealMax) * stealNeed()), ls = fmt2(left).replace(/[.,]?0+$/, ''); if (left < 3) bits.push(L('o włos: złodziej był ' + ls + ' s od kryształu', 'close call: a thief was ' + ls + ' s from a crystal')); }
    if (s.reactN) bits.push(L('reakcje: ', 'reactions: ') + Object.entries(s.reactions || {}).map(([k, v]) => REACTIONS[k].name + ' ' + v).join(', '));
    if (bits.length) box.appendChild(el('p', 'note', bits.join(' · ') + '.'));
    if (box.children.length) body.appendChild(box);
  }
  const ITEM_GLYPH = {
    potion: '<path d="M9 2h6v2h-1v4.2l4.6 7.6A3.6 3.6 0 0 1 15.5 21h-7a3.6 3.6 0 0 1-3.1-5.2L10 8.2V4H9z"/>',
    charm: '<path d="M12 2l8 3v6c0 5-3.6 9-8 11-4.4-2-8-6-8-11V5z"/>',
    amulet: '<path d="M7 2l5 8 5-8h2l-5.6 9.2A5 5 0 1 1 10.6 11.2L5 2z"/>',
    boots: '<path d="M7 2h7v10l6 3.5V21H4v-4h3z"/>',
    bomb: '<path d="M10.5 7.4V5h3v2.4a7.5 7.5 0 1 1-3 0z M14 4.2l2.6-2.4 1.4 1.4-2.4 2.6z"/>',
    weapon: '<path d="M18.5 2H22v3.5L9.5 18l1.5 1.5-1.5 1.5-1.5-1.5L5 22.5 1.5 19 4.5 16 3 14.5 4.5 13 6 14.5z"/>',
    armor: '<path d="M6 3l3 1.5h6L18 3l4 4-3 3v11H5V10L2 7z"/>',
    lantern: '<path d="M9 2h6v2h2v3l-1 1v9l1 1v3H7v-3l1-1V8L7 7V4h2z M10 9v7h4V9z"/>',   // 1.20
    crowbar: '<path d="M18 2l3 1-1 3-2-1L6 19c-1 1-1 2 0 3l-1 1c-2-1-2-3-1-5L17 4z"/>'
  };
  // 1.20: where a hero's item comes from (the hero card, the next party's icons)
  function srcText(it, h) {
    if (it.gaveNm) return L(' - od ', ' - from ') + nameGen({ nm: it.gaveNm, female: it.gaveFem });
    const s = it.src || 'kit';
    if (s === 'trophy') return L(' - trofeum z fali ', ' - trophy from wave ') + (it.wave || '?');
    if (s === 'relic') return L(' - relikwia z Twojego lochu', ' - a relic from your dungeon');
    if (s === 'loot') return L(' - z Twojego lochu', ' - from your dungeon');
    if ((s === 'body' || (h && it.ownerNm && it.ownerNm[0] !== h.nm[0])) && it.ownerNm) { const on = nameGen({ nm: it.ownerNm, female: it.ownerFem }); return L(' - z rzeczy ' + on, ' - from ' + on + "'s things"); }
    return s === 'guild' ? L(' - od gildii', ' - from the guild') : L(' - z domu', ' - from home');
  }
  const svgI = (inner, color, cls) => '<svg class="' + (cls || 'gi') + '" viewBox="0 0 24 24" aria-hidden="true"><g fill="' + color + '" fill-rule="evenodd">' + inner + '</g></svg>';
  function classIconSvg(type, color, cls) {
    const ic = CLASS_ICON[type]; if (!ic) return '';
    return '<svg class="' + (cls || 'ci') + '" viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(' + ic.rot + ' 12 12)"><path fill-rule="evenodd" fill="' + color + '" d="' + ic.d + '"/></g></svg>';
  }
  const DMG_SHORT = L({ pierce: 'kłute', blunt: 'obuch.', fire: 'ogień', poison: 'trucizna', shock: 'porażenie' }, { pierce: 'pierce', blunt: 'blunt', fire: 'fire', poison: 'poison', shock: 'shock' });
  // what a hero entry is weak to: class and (when known) body; the strongest first
  function weakOf(e, known) {
    const k = Object.assign({}, CLASS_RES[e.type] || {});
    if (e.phys && known) { const P = PHYS[e.phys]; for (const t in P.res) k[t] = (k[t] || 1) * P.res[t]; }
    return Object.keys(k).filter(t => k[t] >= 1.1).sort((a, b) => k[b] - k[a]).map(t => DMG_SHORT[t]);
  }
  // one row of the next party: icon, name, class and level, character; what the class does; gear; weaknesses and what is known
  function nextRow(e) {
    if (e.fog && !mods.revealAll) {   // 1.26 Mgła wojny: a shape in the fog
      const r = el('div', 'np fog'); const ic = el('span', 'npi', '?'); r.appendChild(ic);
      const l1 = el('div', 'np1'); l1.appendChild(el('b', null, '???')); l1.appendChild(el('small', null, L(' ktoś we mgle', ' someone in the fog'))); r.appendChild(l1);
      r.appendChild(el('div', 'np2', L('Mgła wojny: klasę, poziom i sprzęt zobaczysz dopiero w fali.', 'Fog of War: class, level and gear stay hidden until the wave.')));
      return r;
    }
    const T = HEROES[e.type], fem = e.female, kn = new Set(e.known || []), all = mods.revealAll;
    const r = el('div', 'np'); r.dataset.cls = e.type;
    const ic = el('span', 'npi'); ic.innerHTML = classIconSvg(e.type, T.color); r.appendChild(ic);
    const l1 = el('div', 'np1');
    const nm = el('b', null, nemName(e)); nm.style.color = T.color; l1.appendChild(nm);   // 1.23: with his title
    l1.appendChild(el('small', null, ' ' + T.name[fem ? 1 : 0] + ' ' + e.lvl));
    if (e.boss) l1.appendChild(el('i', 'tg boss', e.boss === 'final' ? L('przepowiednia', 'prophecy') : L('czempion', 'champion')));
    if (e.trait) l1.appendChild(el('i', 'tg', HERO_TRAITS[e.trait].name[fem ? 1 : 0]));
    if (e.hunter) { const b = el('i', 'tg bag'); b.innerHTML = classIconSvg('bag', '#f2b94b', 'gi'); b.title = L(fem ? 'łowczyni skarbów' : 'łowca skarbów', 'treasure hunter'); l1.appendChild(b); }
    if (e.returning) { const b = el('i', 'tg back', '↺'); b.title = L('wraca z blizną', 'back with a scar'); l1.appendChild(b); }
    if (e.nemesis) { const b = el('i', 'tg boss', L('☠ nemezis', '☠ nemesis')); b.title = L('Nagroda za głowę: ', 'Bounty: ') + bountyOf(e) + L(' Esencji', ' Essence'); l1.appendChild(b); }   // 1.23
    if (e.recruit) l1.appendChild(el('i', 'tg', L('rekrut', 'recruit')));
    { const bm = bondMate(e, null); if (bm) l1.appendChild(el('i', 'tg', bondLabel(e.bond, bm))); }   // 1.21: his bond
    r.appendChild(l1);
    const kit = el('div', 'kit');
    if (!e.inv.length) kit.appendChild(el('small', null, L('bez sprzętu', 'no gear')));
    e.inv.forEach(it => { const s = el('span'); s.innerHTML = svgI(ITEM_GLYPH[it.type] || '', ITEM_COLOR[it.type] || '#ccc') + (it.charges > 1 ? '<small>' + it.charges + '</small>' : ''); s.title = itemLabel(it) + srcText(it, e); if (HITEMS[it.type].tool || it.src === 'trophy') { s.style.outline = '1px solid ' + (it.src === 'trophy' ? '#ff8a3c' : '#ffffff'); s.style.borderRadius = '3px'; } kit.appendChild(s); });   // 1.20: src, a tool or a trophy framed
    r.appendChild(kit);
    // second line, under the name and the gear: what the class does, its weak spots and what the tavern does not know
    const l2 = el('div', 'np2'); l2.appendChild(document.createTextNode(CLASS_SKILL[e.type] || ''));
    const wk = weakOf(e, kn.has('phys') || all);
    if (wk.length) l2.appendChild(el('span', 'bad', L(' · słaby na: ', ' · weak to: ') + wk.slice(0, 2).join(', ')));
    const ph = e.phobia && (kn.has('phobia') || all) ? PHOBIAS[e.phobia].name : null;
    if (ph) l2.appendChild(el('span', 'bad', L(' · boi się: ', ' · fears: ') + ph));
    const unk = [!(kn.has('phys') || all) ? L('ciało', 'body') : '', !(kn.has('phobia') || all) ? L('fobia', 'phobia') : ''].filter(Boolean);
    if (unk.length) l2.appendChild(el('span', 'unk', ' · ? ' + unk.join('/')));
    if (e.nemesis) { const s = el('span', null, L(' · Nagroda za głowę: ', ' · Bounty: ') + bountyOf(e) + L(' Esencji', ' Essence')); s.style.color = '#ffd27a'; l2.appendChild(s); }   // 1.23
    r.appendChild(l2);
    r.addEventListener('click', () => openModal({ type: 'hero', entry: e, back: lastWaveModal }));   // the hero card, then back to the summary
    return r;
  }
  let lastWaveModal = {};
  // 2-3 curiosities of the wave: the favourite trap is the usual first, the rest by lot (kept while the screen is open)
  function waveFun() {
    const s = fl.stats, out = [], B = fl.byType, act = Object.keys(B).filter(k => ITEMS[k] && !TOOLS[k] && (TRAPS[k] || MONSTERS[k]));
    const best = (f, ok) => act.filter(k => ok ? ok(B[k]) : true).sort((a, b) => f(B[b]) - f(B[a]))[0];
    const fav = best(b => b.fires, b => b.fires >= 2);
    if (fav) out.push({ k: 'fav', l: L('Ulubiona pułapka', 'Favourite trap'), v: ITEMS[fav].name, d: L(B[fav].fires + '× w akcji', 'fired ' + B[fav].fires + '×') });
    const pool = [];
    const killer = best(b => b.kills, b => b.kills >= 1);
    if (killer) pool.push({ k: 'kill', l: L('Zabójca fali', 'Top killer'), v: ITEMS[killer].name, d: B[killer].kills + (B[killer].kills === 1 ? L(' zabity', ' kill') : L(' zabitych', ' kills')) });
    const quiet = best(b => b.passivePts + (b.memFires || 0), b => b.passivePts >= 1 || (b.memFires || 0) >= 3);
    if (quiet) { const b = B[quiet]; pool.push({ k: 'quiet', l: b.kills ? L('Cichy zabójca', 'Silent killer') : L('Cichy pomocnik', 'Silent helper'), v: ITEMS[quiet].name, d: (b.memFires || 0) >= 3 ? L(b.memFires + ' ' + plural(b.memFires, 'cios', 'ciosy', 'ciosów') + ' bez stuknięcia', b.memFires + ' hits without a tap') : L(fmtE(b.passivePts) + ' Esencji bez skill checku', fmtE(b.passivePts) + ' Essence, no skill check') }); }
    const hs = fl.heroes.filter(h => h.entry);
    const taken = h => Object.values(h.dmgBy || {}).reduce((a, v) => a + v, 0);
    const mvp = hs.filter(h => !h.dead).sort((a, b) => taken(b) - taken(a))[0];
    if (mvp && taken(mvp) >= 20) { const tk = Math.round(taken(mvp)); pool.push({ k: 'mvp', l: L('MVP bohaterów', 'Hero MVP'), v: mvp.nm[0] + ' (' + className(mvp).toLowerCase() + ')', d: L('przyjął' + (mvp.female ? 'a' : '') + ' ' + tk + ' ' + plural(tk, 'obrażenie', 'obrażenia', 'obrażeń') + ' i ' + fate(mvp), 'took ' + tk + ' damage and ' + fate(mvp)) }); }
    const scared = hs.filter(h => h.fleeing && !h.dead && !h.carriedOut).sort((a, b) => (b.fear / b.courage) - (a.fear / a.courage))[0];
    if (scared) { const top = Object.entries(scared.fearBy || {}).sort((a, b) => b[1] - a[1])[0]; pool.push({ k: 'scared', l: L(scared.female ? 'Najbardziej przerażona' : 'Najbardziej przerażony', 'Most scared'), v: scared.nm[0] + ' (' + className(scared).toLowerCase() + ')', d: top ? L('najbardziej bał' + (scared.female ? 'a' : '') + ' się: ', 'feared most: ') + fearSrcName(top[0]) : L('uciekł' + (scared.female ? 'a' : ''), 'fled') }); }
    if (s.maxCombo >= 3) pool.push({ k: 'combo', l: L('Najwyższe combo', 'Top combo'), v: '×' + fmt2(1 + 0.25 * (s.maxCombo - 1)), d: L(s.maxCombo + (s.maxCombo >= 5 ? ' różnych pułapek' : ' różne pułapki') + ' pod rząd', s.maxCombo + ' different traps in a row') });
    const ck = s.checkCrit + s.checkOk + s.checkMiss;
    if (ck >= 3) pool.push({ k: 'crit', l: L('Krytyki', 'Crits'), v: s.checkCrit + L(' z ', ' of ') + ck, d: L('skill checków w tej fali', 'skill checks this wave') });
    if (s.gotLost >= 1) pool.push({ k: 'lost', l: L('Zgubieni', 'Got lost'), v: String(s.gotLost), d: L(Math.round(s.loneTime || 0) + ' s w samotności', Math.round(s.loneTime || 0) + ' s alone') });
    if (s.splits >= 1 && (s.splitTime || 0) >= 4) pool.push({ k: 'split', l: L('Rozdzieleni', 'Split up'), v: L(s.splits + (s.splits === 1 ? ' raz' : ' razy'), s.splits + (s.splits === 1 ? ' time' : ' times')), d: L(Math.round(s.splitTime) + ' s na zwiadzie' + (s.splitLost ? ', zabłądzili: ' + s.splitLost : ''), Math.round(s.splitTime) + ' s scouting' + (s.splitLost ? ', got lost: ' + s.splitLost : '')) });   // 1.16
    if ((s.looks || 0) >= 2) pool.push({ k: 'look', l: L('Zwiedzali', 'Looked around'), v: L(s.looks + ' razy', s.looks + ' times'), d: L((s.goldFound ? 'znaleźli ' + s.goldFound + ' ' + (s.goldFound === 1 ? 'monetę' : s.goldFound < 5 ? 'monety' : 'monet') : 'nic nie znaleźli') + (s.lookTraps ? ', obudzili pułapkę: ' + s.lookTraps : ''), (s.goldFound ? 'found ' + s.goldFound + (s.goldFound === 1 ? ' coin' : ' coins') : 'found nothing') + (s.lookTraps ? ', woke a trap: ' + s.lookTraps : '')) });
    if (s.councils) pool.push({ k: 'council', l: L('Narada', 'Council'), v: s.councilStorm ? L('szturm', 'attack') : s.councilMore ? L('jeszcze chwila', 'a bit longer') : L('do domu', 'go home'), d: s.goHome ? L('przegłosowani wrócili sami: ', 'the outvoted went home: ') + s.goHome : L('zdecydowali razem', 'decided together') });
    if (s.disarmed >= 2) pool.push({ k: 'dis', l: L('Rozbrojone', 'Disarmed'), v: L(s.disarmed + (s.disarmed >= 5 ? ' pułapek' : ' pułapki'), s.disarmed + ' traps'), d: L('wyłączyli bohaterowie', 'by the heroes') });
    if (s.lootSeen >= 2) pool.push({ k: 'loot', l: L('Łup', 'Loot'), v: s.loot + L(' z ', ' of ') + s.lootSeen, d: L('zobaczonych skarbów zabrali', 'treasures seen were taken') });
    shuffle(pool); while (out.length < 3 && pool.length) out.push(pool.shift());
    return out;
  }
  function renderWave(card, m) {
    const s = fl.stats, won = !!fl.victory, H = fl.hunger;
    lastWaveModal = m;
    if (won) card.classList.add('vic');
    const heart = H ? Math.min(H.need, fl.fed || 0) : 0, ate = !!(H && !H.fed), mine = ate ? 0 : Math.max(0, fl.score - heart - ((H && H.tithe) || 0));   // 1.26: the purse's part and the Danina are not yours
    scrHead(card, waveName() + ' · ' + mmss(fl.time), won ? L('Zwycięstwo!', 'Victory!') : fl.crystalLost ? L('Skradli kryształ', 'Crystal stolen') : ate ? L('Głód rozbił kryształ', 'Hunger broke a crystal') : H && H.tookPurse > 0 ? L('Serce sięgnęło do sakiewki', 'The heart took from your purse') : L('Fala odparta', 'Wave held'), '+' + fmtE(fl.score), L('Esencji z fali', 'Essence this wave'), [fl.score, v => '+' + fmtE(v)]);
    const body = el('div', 'scr-body'); card.appendChild(body);
    if (m.details) waveDetails(body, card, m);
    else {
      const tiles = el('div', 'statrow');
      statTile(tiles, String(Math.floor(run.essence)), L('masz Esencji', 'your Essence'), 'ess');
      if (H) statTile(tiles, '♥ ' + H.need, H.fedWave ? L('serce syte', 'heart full') : H.ate ? L('pękł kryształ', 'crystal broke') : H.credit ? L('kredyt krwi', 'blood credit') : L('wzięło ', 'took ') + Math.round(H.tookPurse || 0), H.fedWave ? 'good' : H.ate ? 'bad' : 'warn');
      else statTile(tiles, '-', run.wave < 2 ? L('Głód od fali 2', 'Hunger from wave 2') : L('serce', 'heart'));
      statTile(tiles, run.crystals + '/' + run.maxCrystals, L('kryształy', 'crystals'), fl.crystalLost || ate ? 'bad' : 'good');
      statTile(tiles, s.kills + ' · ' + s.scared, L('zabici · wystr.', 'killed · scared'));
      body.appendChild(tiles);
      { const fp = el('p', 'note fearline'); fp.id = 'wave-fear-line';   // 1.24 (B, P1-4): scaring is a way too, so it is said even at 0
        fp.innerHTML = L('Zabici: ', 'Killed: ') + '<b>' + s.kills + '</b> (' + fmtE((s.killPts || 0) + (s.dmgPts || 0)) + L(' pkt z ran)', ' from wounds)') + ' · <span class="sc">' + L('Wystraszeni: ', 'Scared off: ') + '<b>' + s.scared + '</b> (' + fmtE((s.scarePts || 0) + (s.fearPts || 0)) + L(' pkt ze strachu)', ' from fear)') + '</span>';
        body.appendChild(fp); }
      crystalWhy(body, H, heart);   // 1.24 (D, P0-2)
      heartLines(body, H);   // 1.26: what the heart took, the Danina, a new level, the monsters that will stand up
      // the reckoning (1.01-1.04 had a screen of its own): Groza x the multipliers = Esencja, the heart's share, what is yours
      const rk = el('div', 'reck' + (ate ? ' ate' : ''));
      const part = (cls, html) => { const sp = el('span', cls); sp.innerHTML = html; rk.appendChild(sp); };
      part('g', L('Groza ', 'Dread ') + '<b>' + fmtG(fl.base) + '</b> × ' + L('Chciwość ', 'Greed ') + fmt2(fl.base > 0 ? fl.score / fl.base : 1) + ' = <b class="e">' + fmtE(fl.score) + '</b>');
      if (H) part('h', H.fedWave ? '♥ <b>−' + fmtE(H.need) + '</b>' : H.ate ? '♥ ' + L('za mało: ', 'short: ') + '<b>−' + fmtE(heart) + ' −' + fmtE(H.tookPurse || 0) + L(' z sakiewki · kryształ', ' from purse · a crystal') + '</b>' : '♥ <b>−' + fmtE(heart) + '</b> ' + L('i', 'and') + ' <b>−' + fmtE(H.tookPurse || 0) + '</b>' + L(' z sakiewki', ' from purse'));
      if (H && (H.tithe || 0) >= 1) part('t', L('Danina ', 'Tithe ') + '<b>' + fmtE(H.tithe) + '</b>');
      part('m', L('dla Ciebie ', 'yours ') + '<b>+' + fmtE(mine) + '</b>' + (run.lastIncome ? ' <small>' + L('+' + run.lastIncome + ' dochodu po fali', '+' + run.lastIncome + ' income after the wave') + '</small>' : ''));
      body.appendChild(rk);
      fl.heroes.filter(h => h.nemesis).forEach(h => {   // 1.23: the bounty on a Nemezis of this wave: paid, or he got away (and comes back)
        const p = el('p', 'note', L('Nagroda za głowę: ', 'Bounty: ') + bountyOf(h.entry) + L(' Esencji · ', ' Essence · ') + heroName(h) + ': ' + (h.dead ? L('wypłacona.', 'paid.') : h.fled ? L((h.female ? 'uciekła' : 'uciekł') + ', wróci z wyższą nagrodą.', 'got away, will be back with a higher bounty.') : L('wciąż w lochu.', 'still in the dungeon.'))); p.style.color = '#ffd27a'; body.appendChild(p);
      });
      if (ate && !m.alarmed) { m.alarmed = true; setTimeout(() => { if (modalKind === 'wave') crystalAlarm(); }, reduceMotion ? 0 : 900); }
      waveChart(panel(body, L('Esencja z fal', 'Essence per wave'), L('kreska: porcja serca', "tick: the heart's share")), run.waves, run.wave);
      m.fun = m.fun || waveFun();
      if (m.fun.length) {
        const fr = el('div', 'fun');
        m.fun.forEach(f => { const d = el('div', 'fs'); d.appendChild(el('span', null, f.l)); d.appendChild(el('b', null, f.v)); d.appendChild(el('small', null, f.d)); fr.appendChild(d); });
        body.appendChild(fr);
      }
      const nx = run.crystals > 0 && run.nextFor === run.wave + 1 ? run.next : null;
      if (nx && nx.length) {
        const lv = nx.map(e => e.lvl), lo = Math.min(...lv), hi = Math.max(...lv), g = run.guild;
        const fogN = nx.some(e => e.fog) && !mods.revealAll, om = OMENS[run.omens && run.omens[run.wave + 1]];
        const pn = panel(body, L('Fala ', 'Wave ') + (run.wave + 1) + ': ' + nx.length + L(nx.length === 1 ? ' bohater' : ' bohaterów', nx.length === 1 ? ' hero' : ' heroes') + (fogN ? L(' we mgle', ' in the fog') : L(', poz. ', ', lvl ') + (lo === hi ? lo : lo + '-' + hi)), g ? L('gildia: ', 'guild: ') + HEROES[GUILD_WANT[g.kind]].name[0].toLowerCase() : hungerNeed(run.wave + 1) ? L('serce chce ', 'heart wants ') + hungerNeed(run.wave + 1) : '', 'nextp');
        if (om) pn.appendChild(omenBox(run.omens[run.wave + 1]));   // 1.26 (15): the omen of the next wave
        { const be = nx.find(e => e.boss); if (be) pn.appendChild(bossBox(be)); }   // 1.27
        const list = el('div', 'nplist'); nx.forEach(e => list.appendChild(nextRow(e))); pn.appendChild(list);
        nx.filter(e => e.nemesis).forEach(e => { const p = el('p', 'note', '☠ ' + nemName(e) + L(' wraca po raz ' + (e.times || 1) + '. Nagroda za głowę: ' + bountyOf(e) + ' Esencji.', ' is back for the ' + ordEn(e.times || 1) + ' time. Bounty: ' + bountyOf(e) + ' Essence.')); p.style.color = '#ffd27a'; pn.appendChild(p); });   // 1.23
        fitList(list);
      }
    }
    // the way on
    const foot = el('div', 'scr-foot'); card.appendChild(foot);
    if (won) {
      const row = el('div', 'row');
      const go = btn('primary', L('Graj dalej', 'Keep going'), L('fale bez końca', 'endless waves'), () => { run.victoryDone = true; closeModal(); afterSummary(); }); go.id = 'vic-continue';
      const end = btn('', L('Zakończ run', 'End run'), L('jako zwycięstwo', 'as a win'), () => { run.victoryDone = true; closeModal(); endRun(L('Loch przetrwał wszystkie ' + RUN_WAVES + ' fal.', 'Your dungeon held all ' + RUN_WAVES + ' waves.'), 'win'); }); end.id = 'vic-end';
      row.appendChild(go); row.appendChild(end); foot.appendChild(row);
    } else {
      const pu = run.pendingUpgrades, fp = pu.length + (run.freePicks || 0), alive = run.crystals > 0 && !(run.wave === RUN_WAVES && !run.won);
      const nb = btn('primary', run.crystals > 0 ? L('Dalej: sklep', 'Next: shop') : L('Dalej', 'Next'), alive && fp ? L('darmowe karty: ', 'free cards: ') + fp + (pu.some(p => p.src === 'boss') ? L(', w tym legendarna', ', one legendary') : '') : null, () => { closeModal(); afterSummary(); });
      nb.id = 'wave-next'; foot.appendChild(nb);
    }
    const mr = el('div', 'minirow'), dn = el('p', 'note', '');
    const det = el('button', 'mini' + (m.details ? '' : ' strong'), m.details ? L('‹ Wróć', '‹ Back') : L('Szczegóły', 'Details')); det.type = 'button'; det.id = 'wave-details';
    det.addEventListener('click', () => { m.details = !m.details; card.classList.remove('enter'); card.innerHTML = ''; renderWave(card, m); });
    mr.appendChild(det);
    if (run.crystals > 0 && !won) { const sq = el('button', 'mini', L('Wyjdź', 'Save & exit')); sq.type = 'button'; sq.title = L('Zapisz run i wróć do menu', 'Save the run and go to the menu'); sq.addEventListener('click', () => { saveRun('summary'); closeModal(); openModal({ type: 'start' }); }); mr.appendChild(sq); }
    if (run.crystals > 0 && !won) {
      const q = el('button', 'mini', L('Zakończ run', 'End run')); q.type = 'button';
      q.addEventListener('click', () => { if (!q.dataset.sure) { q.dataset.sure = '1'; q.textContent = L('Na pewno?', 'Sure?'); return; } closeModal(); endRun(L('Run zakończony po fali ' + run.wave + '.', 'You ended the run after wave ' + run.wave + '.'), 'quit'); });
      mr.appendChild(q);
    }
    foot.appendChild(mr);
    dn.textContent = m.logNote || L('Zapisuję falę...', 'Saving the wave...'); if (m.details) foot.appendChild(dn);   // 1.27: the save note is for testers: only under Szczegóły
    if (!m.logNote) Promise.resolve(run.lastLog).then(() => { m.logNote = (logText(run.logState) || '') + L(' Run zapisany w tej przeglądarce.', ' Run saved in this browser.'); if (dn.isConnected) dn.textContent = m.logNote; });
    if (won && !m.pushed) { m.pushed = true; pushLog(null); }
  }
  // Szczegóły: where the Esencja came from, then four views in one box (what comes next, the heroes, the elements, the numbers)
  function waveDetails(body, card, m) {
    const s = fl.stats, H = fl.hunger;
    const src = [[L('Rany', 'Wounds'), s.dmgPts, '#ff8a7a'], [L('Strach', 'Fear'), s.fearPts, '#c3b2ff'], [L('Ucieczki', 'Fled'), s.scarePts, '#8a6fe0'], [L('Zabici', 'Kills'), s.killPts, '#d8434f'], [L('Łup', 'Loot'), s.lootPts, '#f2b94b'],
      ['Combo', s.comboPts || 0, '#a9d4da'], [L('Reakcje', 'Reactions'), s.reactPts || 0, '#ff9a3c'], [L('Uczta', 'Feast'), s.feastPts || 0, '#ff9aa4'], [L('Inne', 'Other'), (s.crystalPts || 0) + (s.lostPts || 0) + (s.lonePts || 0) + (s.splitPts || 0) + (s.healPts || 0), '#7d7590']].filter(r => r[1] > 0.05);
    const tot = src.reduce((a, r) => a + r[1], 0) || 1;
    const ps = panel(body, L('Skąd Esencja', 'Where Essence came from'), L('Groza ', 'Dread ') + fmtE(fl.base) + L(' × średnio ', ' × avg ') + fmt2(fl.base > 0 ? fl.score / fl.base : 1));
    const sb = el('div', 'srcbar'); src.forEach(r => { const i = el('i'); i.style.width = (100 * r[1] / tot).toFixed(1) + '%'; i.style.background = r[2]; i.title = r[0]; sb.appendChild(i); }); ps.appendChild(sb);
    const lg = el('div', 'srclg');
    src.slice().sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(r => { const d = el('span'), dot = el('i'); dot.style.background = r[2]; d.appendChild(dot); d.appendChild(document.createTextNode(r[0] + ' ' + fmtE(r[1]))); lg.appendChild(d); });
    if (!src.length) lg.appendChild(el('span', null, L('Ta fala nic nie dała.', 'This wave earned nothing.')));
    ps.appendChild(lg);
    const TABS_W = [['next', L('Co dalej', 'Next')], ['heroes', L('Bohaterowie', 'Heroes')], ['items', L('Elementy', 'Elements')], ['nums', L('Liczby', 'Numbers')]], cur = m.tab || 'next';
    const seg = el('div', 'seg');
    TABS_W.forEach(([id, label]) => { const b = el('button', id === cur ? 'on' : '', label); b.type = 'button'; b.id = 'wtab-' + id; b.addEventListener('click', () => { if (m.tab === id) return; m.tab = id; card.classList.remove('enter'); card.innerHTML = ''; renderWave(card, m); }); seg.appendChild(b); });
    body.appendChild(seg);
    const box = el('div', 'panel segpanel'), list = el('div', 'flist' + (cur === 'nums' ? ' grid2' : '')); box.appendChild(list); body.appendChild(box);
    if (cur === 'next') {
      const nb = bossOf(run.wave + 1), items = [s.swaps ? L('wymiany: ', 'swaps: ') + s.swaps : '', s.potionsGiven ? L('podane mikstury: ', 'potions given: ') + s.potionsGiven : '', s.charms ? L('talizmany: ', 'charms: ') + s.charms : '', s.amulets ? L('amulety: ', 'amulets: ') + s.amulets : '', s.boots ? L('buty: ', 'boots: ') + s.boots : '',
        s.gearGiven ? L('przekazane: ', 'handed over: ') + s.gearGiven : '', s.bodyLoot ? L('z ciał: ', 'from bodies: ') + s.bodyLoot : '', s.gearKnocked ? L('wybite: ', 'knocked away: ') + s.gearKnocked : '', s.lanternOut ? L('zgaszone latarnie: ', 'lanterns out: ') + s.lanternOut : '', s.bombCook ? L('bomby w ogniu: ', 'bombs in fire: ') + s.bombCook : ''].filter(Boolean);   // 1.20
      if (H && H.ate) frow(list, L('Serce chciało ' + H.need + ' Esencji. Fala dała ' + fmtE(fl.score) + ', z sakiewki wzięło ' + fmtE(H.tookPurse || 0) + '. Za mało: pękł kryształ.', 'The heart wanted ' + H.need + ' Essence. The wave gave ' + fmtE(fl.score) + ', your purse ' + fmtE(H.tookPurse || 0) + '. Not enough: a crystal broke.'), 'heart');
      else if (H && !H.fedWave) frow(list, L('Serce chciało ' + H.need + ' Esencji, fala dała ' + fmtE(fl.score) + '. Brakujące ' + fmtE(H.tookPurse || 0) + ' wzięło z Twojej sakiewki' + (H.credit ? ' (Kredyt krwi: Głód następnej fali +' + H.credit + ')' : '') + '.', 'The heart wanted ' + H.need + ' Essence, the wave gave ' + fmtE(fl.score) + '. It took the missing ' + fmtE(H.tookPurse || 0) + ' from your purse' + (H.credit ? ' (Blood Credit: next Hunger +' + H.credit + ')' : '') + '.'), 'heart');
      else if (H) frow(list, L('Serce wzięło pierwsze ' + H.need + ' Esencji' + (H.fedAt != null ? ' (syte w ' + mmss(H.fedAt) + ')' : '') + ', potem Daninę ' + fmtE(H.tithe || 0) + ' do Nasycenia. Reszta trafiła do Ciebie.', 'The heart took the first ' + H.need + ' Essence' + (H.fedAt != null ? ' (full at ' + mmss(H.fedAt) + ')' : '') + ', then a Tithe of ' + fmtE(H.tithe || 0) + ' for Satiety. The rest went to you.'), 'heart');
      if (run.wave < RUN_WAVES || run.won) frow(list, L('Fala ' + (run.wave + 1) + ': poziom ok. ' + Math.round(waveBase(run.wave + 1)) + (nb ? ', prowadzi ' + (nb === 'final' ? 'bohater z przepowiedni' : 'czempion') : '') + '.', 'Wave ' + (run.wave + 1) + ': about level ' + Math.round(waveBase(run.wave + 1)) + (nb ? ', led by ' + (nb === 'final' ? 'the hero of the prophecy' : 'a champion') : '') + '.'), 'wave');
      if (run.guild && run.crystals > 0) frow(list, L('Gildia ', 'The guild ') + run.guild.text, 'wave');
      if (hungerNeed(run.wave + 1)) frow(list, L('Następna fala: serce chce ' + hungerNeed(run.wave + 1) + ' Esencji (w sakiewce masz ' + Math.floor(run.essence) + '). Trzymaj bohaterów w lochu jak najdłużej.', 'Next wave: the heart wants ' + hungerNeed(run.wave + 1) + ' Essence (your purse: ' + Math.floor(run.essence) + '). Keep heroes in the dungeon as long as you can.'), 'heart');
      frow(list, L('Esencja: +' + run.lastIncome + ' po fali' + (run.lastInterest ? ' (odsetki ' + run.lastInterest + ')' : '') + ', masz ' + Math.floor(run.essence) + '.', 'Essence: +' + run.lastIncome + ' after the wave' + (run.lastInterest ? ' (interest ' + run.lastInterest + ')' : '') + ', you have ' + Math.floor(run.essence) + '.'), 'ess');
      frow(list, m.out ? L('Plotki: uciekinierzy opowiedzą o ' + nWord(m.rr, 'pokoju', 'pokojach', 'pokojach') + ' i ' + nWord(m.rt, 'pułapce', 'pułapkach', 'pułapkach') + ', które ich zraniły albo przestraszyły. Przestaw je albo postaw Zasłonę.', 'Rumours: runaways will tell of ' + nWord(m.rr, '', '', '', 'room', 'rooms') + ' and ' + nWord(m.rt, '', '', '', 'trap', 'traps') + ' that hurt or scared them. Move them or place a Veil.') : L('Nikt nie wyszedł żywy: Twoje sekrety są bezpieczne.', 'Nobody got out alive: your secrets are safe.'));
      if (s.treasureTale) frow(list, L('Opowieści o skarbach: następna fala zaczyna z Chciwością +', 'Treasure tales: the next wave starts with Greed +') + fmt2(s.treasureTale) + '.', 'ess');
      if (s.greedKept) frow(list, L('Zabrany łup: chciwość +' + fmt2(s.greedKept) + ' do końca runu (razem +' + fmt2(run.greedKeep) + ').', 'Loot taken: greed +' + fmt2(s.greedKept) + ' for the rest of the run (total +' + fmt2(run.greedKeep) + ').'), 'ess');
      frow(list, L('Gildia słyszy o chciwości ×' + fmt2(run.greedRep || 1) + ': przywódca +' + f1(huntersLv()) + ' poziomu' + (huntersN(run.greedRep || 1) ? ', przyjdą łowcy skarbów (' + huntersN(run.greedRep || 1) + ')' : '') + '.', 'The guild hears of greed ×' + fmt2(run.greedRep || 1) + ': leader +' + f1(huntersLv()) + ' levels' + (huntersN(run.greedRep || 1) ? ', treasure hunters coming (' + huntersN(run.greedRep || 1) + ')' : '') + '.'));
      if (s.breach || s.breachOpen) frow(list, s.breach ? L('Ta fala weszła przez wyłom. W budowie stuknij go, żeby załatać.', 'This wave came in through a breach. Tap it while building to patch it.') : L('Wyłom wciąż jest otwarty. W budowie stuknij go, żeby załatać.', 'The breach is still open. Tap it while building to patch it.'), 'wave');
      if (s.preps) frow(list, L('Drużyna szykowała się ' + s.preps + '× przed groźnym pokojem. Przeciw temu: Runa, Ołtarz, Wabik.', 'The party got ready ' + s.preps + '× before a dangerous room. Counters: Rune, Altar, Decoy.'));
      if (s.runeBlocks || s.altarBlocks || s.alarms) frow(list, L('Budowle zadziałały: ', 'Buildings worked: ') + [s.runeBlocks ? L('runa ', 'rune ') + s.runeBlocks + '×' : '', s.altarBlocks ? L('ołtarz ', 'altar ') + s.altarBlocks + '×' : '', s.alarms ? L('wabik ', 'decoy ') + s.alarms + '×' : ''].filter(Boolean).join(', ') + '.');
      if (s.detours || s.gotLost) frow(list, L('Błądzenie: złe skręty ' + s.detours + ', zgubieni ' + s.gotLost + '.', 'Wandering: wrong turns ' + s.detours + ', got lost ' + s.gotLost + '.'));
      if (items.length) frow(list, L('Przedmioty bohaterów: ', 'Hero items: ') + items.join(', ') + '.');
      if (s.faithOut) frow(list, L('Kapłanowi zabrakło wiary ' + s.faithOut + '×.', 'The priest ran out of faith ' + s.faithOut + '×.'));
      if (s.sapped) frow(list, L('Saperzy rozmontowali na dobre: ', 'Sappers took apart for good: ') + s.sapped + '.');
      { const rk = rankOf(run.total); frow(list, L('Ranga runu: ', 'Run rank: ') + rk.name + ' (' + Math.round(run.total) + L(' Esencji', ' Essence') + (rk.next ? L(', następna: ' + rk.next[1] + ' od ' + rk.next[0], ', next: ' + rk.next[1] + ' at ' + rk.next[0]) : '') + ').'); }
    } else if (cur === 'heroes') {
      fl.heroes.forEach(h => {
        const r = el('div', 'hrow'), l = el('span');
        const ic = el('span', 'hi'); ic.innerHTML = classIconSvg(h.type, h.T.color); l.appendChild(ic);
        l.appendChild(el('b', null, heroName(h))); l.appendChild(el('small', null, ' ' + className(h).toLowerCase() + ' ' + h.lvl + (h.boss ? ' · boss' : '')));
        r.appendChild(l); r.appendChild(el('span', 'f-' + (h.dead ? 'dead' : h.carriedOut ? 'crystal' : h.fleeing ? 'scared' : 'left'), fate(h)));
        list.appendChild(r);
      });
      if (!fl.heroes.length) frow(list, L('Brak bohaterów.', 'No heroes.'));
    } else if (cur === 'items') {
      const rows = Object.keys(fl.byType).filter(k => !TOOLS[k] && ITEMS[k]).map(k => ({ k, b: fl.byType[k], pts: fl.byType[k].pts + fl.byType[k].passivePts + fl.byType[k].fearPts })).filter(r => r.pts > 0.05 || r.b.placed > 0).sort((a, b) => b.pts - a.pts);
      const mx = Math.max(0.01, ...rows.map(r => r.pts));
      rows.forEach(r => { const d = el('div', 'irow'), bar = el('i'); bar.style.width = Math.max(2, Math.round(100 * r.pts / mx)) + '%'; const bw = el('span', 'bw'); bw.appendChild(bar); d.appendChild(el('span', null, ITEMS[r.k].name)); d.appendChild(bw); d.appendChild(el('b', null, fmtE(r.pts) + ' · ' + r.b.hits + L(' traf.', ' hits'))); list.appendChild(d); });
      if (!rows.length) frow(list, L('Żaden element nic nie dał w tej fali.', 'No element earned anything this wave.'));
    } else {
      const cell = (label, v) => { const c = el('div', 'cell'); c.appendChild(el('span', null, label)); c.appendChild(el('b', null, String(v))); list.appendChild(c); };
      cell(L('Krytyk / draśn. / pudło', 'Crit / graze / miss'), s.checkCrit + ' / ' + s.checkOk + ' / ' + s.checkMiss);
      cell(L('Ciosy z pamięci', 'Hits from memory'), String(s.memFires || 0));
      cell(L('Najwyższe combo', 'Top combo'), '×' + fmt2(1 + 0.25 * (s.maxCombo - 1)));
      cell(L('Łup: zobaczony / zabrany', 'Loot: seen / taken'), s.lootSeen + ' / ' + s.loot);
      cell(L('Rozbrojone / odczynione', 'Disarmed / dispelled'), s.disarmed + ' / ' + s.blessed);
      cell(L('Plotki: pokoje / pułapki', 'Rumours: rooms / traps'), s.rumorRooms + ' / ' + s.rumorTraps);
      cell(L('Zapadnie / klatki', 'Trapdoors / cages'), s.falls + ' / ' + s.cages);
      cell(L('Serce / dla Ciebie', 'Heart / yours'), Math.round(s.essHeart || 0) + ' / ' + Math.round(Math.max(0, fl.score - (s.essHeart || 0))));
      cell(L('Czas / przyspieszenie', 'Time / fast-forward'), mmss(fl.time) + ' / ' + Math.round(s.ffTime) + ' s');
      cell(L('Osobno: zwiad / sam / zgubiony (s)', 'Apart: scouting / alone / lost (s)'), Math.round(s.splitTime || 0) + ' / ' + Math.round(s.loneTime || 0) + ' / ' + Math.round(s.lostTime || 0));   // 1.17: these rows were only in the unused statsTable
      cell(L('Rozglądania / monety / pułapki z szukania', 'Look-arounds / coins / traps found searching'), (s.looks || 0) + ' / ' + (s.goldFound || 0) + ' / ' + (s.lookTraps || 0));
      cell(L('Narada: dom / szturm / chwila · sami do domu', 'Council: home / attack / wait · went home alone'), (s.councilHome || 0) + ' / ' + (s.councilStorm || 0) + ' / ' + (s.councilMore || 0) + ' · ' + (s.goHome || 0));
      cell(L('Słyszane zza ściany / wieści o śmierci', 'Heard through walls / news of deaths'), (s.heard || 0) + ' / ' + (s.newsDeaths || 0));
      cell(L('Rozłam: grupy / bunty (udane) / obrażeni / powroty', 'Rifts: groups / mutinies (won) / sulking / rejoined'), (s.rifts || 0) + ' / ' + (s.mutinies || 0) + ' (' + (s.mutinyWins || 0) + ') / ' + (s.sulks || 0) + ' / ' + (s.merges || 0));   // 1.19
      cell(L('Ekwipunek: z ciał / podane (amulety) / przydział / oferty / za ciężkie / latarnia ratuje / łom', 'Gear: from bodies / given (amulets) / assigned / offers / too heavy / lantern saves / crowbar'), (s.bodyLoot || 0) + ' / ' + (s.gearGiven || 0) + ' (' + (s.amuletGiven || 0) + ') / ' + (s.lootAssign || 0) + ' / ' + (s.lootOffer || 0) + ' / ' + (s.tooHeavy || 0) + ' / ' + (s.lanternSaves || 0) + ' / ' + ((s.crowbarGate || 0) + (s.crowbarCage || 0)));   // 1.20
      cell(L('Więzi: pary / żałoba (zemsta) / nie zostawię (uratowani) / mistrz: uwagi, pochwały / kpiny / kłótnie (przerwane) / sprzeciw nad ciałem / zakłady: wygrane-przegrane', 'Bonds: pairs / grief (revenge) / leave no one (saved) / mentor: notes, praise / mockery / quarrels (stopped) / protest over a body / bets: won-lost'),
        (s.bonds || 0) + ' / ' + (s.griefs || 0) + ' (' + (s.revengeVows || 0) + ') / ' + (s.noLeave || 0) + ' (' + (s.noLeaveSaved || 0) + ') / ' + (s.mentorWatch || 0) + ', ' + (s.mentorProud || 0) + ' / ' + (s.rivalMock || 0) + ' / ' +
        (s.quarrels || 0) + ' (' + (s.quarrelStops || 0) + ') / ' + (s.lootDeadObject || 0) + ' / ' + (s.betsWon || 0) + '-' + (s.betsLost || 0));   // 1.21
      cell(L('Finał: eskorta / przekazania / ostatni bastion / poświęcenia / ty pierwszy / opukane / nie tędy / szyk', 'Finale: escort / hand-overs / last stand / sacrifices / you first / walls tapped / not this way / formation'),
        (s.escortForms || 0) + ' (' + (s.guardSoaks || 0) + ') / ' + (s.handOvers || 0) + ' / ' + (s.lastStands || 0) + ' / ' + (s.sacrifices || 0) + ' (' + (s.sacrificeFired || 0) + ') / ' + (s.youFirst || 0) + ' / ' +
        (s.taps || 0) + ' (' + (s.tapFound || 0) + ') / ' + (s.notThisWay || 0) + ' / ' + (s.frontLines || 0) + ', ' + (s.woundedBack || 0));   // 1.22
      cell(L('Nemezis: w fali / nagrody (Esencja) / urazy (załatwione) / ostrzeżenia / pamięć poległych', 'Nemesis: in wave / bounties (Essence) / grudges (settled) / warnings / memory of the fallen'),
        (s.nemeses || 0) + ' / ' + (s.bounties || 0) + ' (' + Math.round(s.essBounty || 0) + ') / ' + (s.grudgeHits || 0) + ' (' + (s.grudgeDone || 0) + ') / ' + (s.nemesisWarn || 0) + ' / ' + (s.fallenMemory || 0));   // 1.23
      cell(L('Kwestie o tym, co widzieli / zamienione / pominięte', 'Lines about what they saw / swapped / dropped'), (s.sawTalk || 0) + ' / ' + (s.lineSwap || 0) + ' / ' + (s.lineDrop || 0));   // 1.17.1
    }
    fitList(list);
  }

  /* ----- the shop ----- */
  // 1.05 (a tester bought Chór potępionych without a single portrait): does the card work with what stands in the dungeon?
  const MON_T = ['goblin', 'archer', 'spider', 'ogre', 'shaman', 'ghost', 'shade', 'bats'], LOOT_T = ['loot', 'lpotion', 'loot2', 'loot3', 'lcursed'];
  const CARD_NEEDS = { spikes: ['spikes'], walls: ['arrows', 'fire', 'portrait', 'eyes', 'mirror'], powder: ['powder'], arrows: ['arrows'], gate: ['gate'], web: ['web'], fire: ['fire'], mimic: ['mimic'],
    trapdoor: ['trapdoor'], cage: ['cage'], portrait: ['portrait'], spider: ['spider'], ghost: ['ghost'], monster: MON_T, loottrap: LOOT_T, sticky: ['spikes'], wildfire: ['fire', 'powder', 'arrows'],
    choir: ['portrait'], hgallery: ['ghost', 'portrait'], firepit: ['trapdoor'], cageghost: ['cage'], monsterroar: MON_T, sharp: ['spikes', 'arrows', 'archer', 'goblin', 'mimic', 'bats'], heavy: ['gate', 'ogre', 'trapdoor'],
    oil: ['fire', 'powder'], venom: ['spider', 'shaman'], pack: MON_T, well: ['trapdoor'], golddust: ['loot'], reliquary: ['loot3'], greed: LOOT_T, nopick: LOOT_T,
    // 1.18: a komnata (k_) or a room effect (r_) in the dungeon; the card's req asks the same when the shop rolls it, this says it
    // again when it was taken down after the roll ("Brak w lochu: Kuźnia.")
    drawers: ['k_junk'], cell: ['k_prison'], frames: ['k_gallery'], restock: ['k_forge'], lullsleep: ['k_nursery'], ambush: ['k_goblin'], cocoons: ['k_spider'],
    cauldron: ['k_ogre'], batscatter: ['k_bats'], skullwall: ['k_ossuary'], strip: ['k_armory'], falsecall: ['k_haunt'], wisps: ['r_fog'], mire: ['r_swamp'],
    farecho: ['r_grotto'], risen: ['r_crypt'], vaultsnap: ['r_vault'], deepsleep: ['r_haven'], gearlink: ['r_gears'], body: ['r_hush'], blackice: ['r_ice'], tainted: ['lpotion'] };
  const CARD_ALL = { hgallery: true };   // 1.18: needs every one of them (a ghost in a room with a portrait), not just one
  const needHas = t => ITEMS[t] && ITEMS[t].tool && (KINDS[t] || ITEMS[t].rt) ? fl.rooms.some(R => KINDS[t] ? R.rk === KINDS[t] : R.rt === ITEMS[t].rt) : [...fl.items.values()].some(it => it.type === t && !it.temp);
  function cardFit(u) {
    const need = CARD_NEEDS[u.id]; if (!need || u.kind !== 'card' || !fl) return null;
    const miss = need.filter(t => !needHas(t)), have = CARD_ALL[u.id] ? !miss.length : miss.length < need.length;
    if (have) return { ok: true, text: L(' Pasuje do Twojego lochu.', ' Fits your dungeon.') };
    return { ok: false, text: need === MON_T ? L(' Brak potworów w lochu.', ' No monsters in your dungeon.') : need === LOOT_T ? L(' Brak łupu w lochu.', ' No loot in your dungeon.') : L(' Brak w lochu: ', ' Not in your dungeon: ') + (CARD_ALL[u.id] ? miss : need).map(t => ITEMS[t] ? ITEMS[t].name : t).join(', ') + '.' };
  }
  function kindShort(u) {
    if (u.kind === 'unlock') return L('odblokowanie', 'unlock') + effWords(u.unlock).map(w => ' · ' + w.toLowerCase()).join('');   // 1.24 (B, P1-4)
    if (u.kind === 'instant') return RAR_NAME[u.rar] + L(' · od razu', ' · instant');
    const n = run.deck.filter(x => x === u.id).length;
    return RAR_NAME[u.rar] + (u.unique ? L(' · unikat', ' · unique') : '') + (fuses(u) ? L(' · połączy się w ★', ' · fuses into ★') : n ? L(' · w talii: ', ' · in deck: ') + n : '');   // 1.24
  }
  function renderShop(card, m) {
    const build = fl && fl.phase === 'build';
    run.stash = run.stash || [];
    const free = run.freePicks > 0, rerender = () => { card.classList.remove('enter'); card.innerHTML = ''; renderShop(card, m); };
    if (build && !UI.cardDragTip && run.deck.length >= 2 && !m.msg) { UI.cardDragTip = 1; saveUI(); m.msg = L('Talia: przeciągnij kartę, żeby ją przestawić albo schować. Przytrzymaj, żeby sprzedać.', 'Deck: drag a card to move it or stash it. Hold it to sell it.'); }   // 1.27.8: once
    scrHead(card, L('Przed falą ', 'Before wave ') + run.wave, L('Sklep', 'Shop'), String(Math.floor(fl.essence)), free ? L(run.freePicks === 1 ? 'Esencji · 1 darmowa karta' : 'Esencji · darmowe karty: ' + run.freePicks, 'Essence · ' + run.freePicks + (run.freePicks === 1 ? ' free card' : ' free cards')) : L('Esencji', 'Essence'));
    if (!build) { card.appendChild(el('p', 'note', L('Sklep działa między falami.', 'The shop opens between waves.'))); card.appendChild(btn('primary', L('Zamknij', 'Close'), null, closeModal)); return; }
    // 1.15.1 (author: the tutorial's tip in the shop was gone at once, before it could be read): a card over the top of the shop
    // that stays until Rozumiem or until a card is taken (it was a message over the big button, fading after 2 s)
    if (run.tutorial && !run.shopTipDone) {
      const tip = el('div', 'shoptip'); tip.id = 'shop-tip';
      tip.appendChild(el('div', null, L('Po każdej fali jedna karta jest za darmo. Kolejne kupujesz za Esencję. Karta trafia do talii na dole i działa do końca runu. Odblokowanie (fioletowy pasek) daje na stałe nową pułapkę albo potwora.', 'After every wave one card is free. More cost Essence. A card goes to your deck below and works for the rest of the run. An unlock (purple bar) gives you a new trap or monster for good.')));
      const row = el('div', 'crow'); row.appendChild(el('span', 'step', L('Samouczek', 'Tutorial')));
      const ok = el('button', 'next', L('Rozumiem', 'Got it')); ok.type = 'button'; ok.id = 'shop-tip-ok'; ok.addEventListener('click', () => { run.shopTipDone = true; rerender(); }); row.appendChild(ok);
      tip.appendChild(row); card.appendChild(tip);
    }
    const body = el('div', 'scr-body'); card.appendChild(body);
    const sel = m.sel && (m.sel.k === 'd' || m.sel.k === 's') ? m.sel : null;
    // 1.27.3 (author: five offers squeezed into the old 2 x 2 grid were unreadable): the offers are cards, as in the build tray:
    // a picture, the name, a rarity frame and the price. Tap a card (a held finger ends in a tap too) and its whole text and its
    // button show in the panel under the cards. Three to a row, so five offers and the Family Rune fit with room to spare; the
    // Family Rune and the Heart's Gift are cards too, in a frame of their own. (Up to 1.27.2: every offer showed its whole text
    // and its buy button in its own box.)
    const stage = el('div', 'shopstage'); body.appendChild(stage);
    const og = el('div', 'offers cards');
    // 1.26 Dar serca: a heart level waits: its cards take the offers' place until one is taken (or Później)
    const hk = heartOffer(), heartView = !!hk && !m.heartLater && !sel;
    const same = (a, c) => !!a && !!c && a.k === c.k && a.i === c.i;
    const runeOn = !heartView && run.shop.rune && FAMILIES[run.shop.rune];
    const picks = heartView ? hk.ids.map((_, i) => ({ k: 'h', i })) : run.shop.ids.map((id, i) => UPG[id] ? { k: 'o', i } : null).filter(Boolean).concat(runeOn ? [{ k: 'r', i: 0 }] : []);
    if (!picks.some(q => same(q, m.pick))) m.pick = picks[0] || null;
    const cardTile = o => {
      const b = el('div', 'offer ccard ' + o.cls); b.id = o.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', o.name + (o.price ? ', ' + o.price : ''));
      b.appendChild(o.art || el('div', 'cardart blank'));
      b.appendChild(el('b', null, o.name));
      b.appendChild(el('span', 'pr' + (o.ess ? ' ess' : ''), o.price));
      if (o.badge) b.appendChild(el('i', 'cbadge', o.badge));
      if (same(o.pick, m.pick)) { b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); }
      const go = () => { if (same(o.pick, m.pick) && !m.sel) return; m.pick = o.pick; m.sel = null; rerender(); };
      b.addEventListener('click', go); b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      og.appendChild(b); return b;
    };
    const boughtTile = (id, extra) => { const b = el('div', 'offer ccard bought'); b.id = id; b.appendChild(el('b', null, L('Kupione', 'Bought'))); if (extra) b.appendChild(el('span', 'rdone', extra)); og.appendChild(b); return b; };
    if (heartView) {
      stage.classList.add('heartview');
      const hd = el('div', 'hearthead'); hd.id = 'heart-head';
      hd.appendChild(el('b', null, L('♥ Dar serca · poziom ', "♥ Heart's Gift · level ") + hk.lv));
      hd.appendChild(el('span', null, L('Serce urosło. Weź jedną kartę za darmo.', 'Your heart grew. Take one card for free.') + (run.heartPicks.length > 1 ? L(' Czeka jeszcze ' + (run.heartPicks.length - 1) + '.', ' ' + (run.heartPicks.length - 1) + ' more waiting.') : '')));
      stage.appendChild(hd);
      hk.ids.forEach((id, i) => { const u = UPG[id]; cardTile({ id: 'heart-offer-' + i, cls: 'heart rar-' + u.rar, art: ART.cardImg(u.id, false, true), name: u.name, price: L('za darmo', 'free'), badge: fuses(u) ? '★' : '', pick: { k: 'h', i } }); });
    } else {
      run.shop.ids.forEach((id, i) => {
        const u = UPG[id]; if (!u) { boughtTile('offer-' + i); return; }
        const price = priceOf(u), poor = !free && fl.essence < price, fit = cardFit(u);
        cardTile({ id: 'offer-' + i, cls: 'rar-' + u.rar + (u.kind === 'unlock' ? ' unlock' : '') + (poor ? ' poor' : '') + (fuses(u) ? ' fuse' : ''), art: ART.cardImg(u.id, false, true), name: u.name,
          price: free ? L('za darmo', 'free') : String(price), ess: !free, badge: fuses(u) ? '★' : fit && !fit.ok ? '!' : '', pick: { k: 'o', i } });
      });
      // 1.26 Runa rodu: one rune a shop, a card in its family's colour (1.27.1: once bought its place stays, empty)
      if (runeOn) {
        const f = run.shop.rune, F = FAMILIES[f], lv = run.famLv[f] || 0, c = runePrice(lv);
        let art = null; { const ru = ART.rune && ART.rune(f); if (ru) { art = el('img', 'cardart runeart'); art.src = ru; art.alt = ''; art.draggable = false; } }
        const b = cardTile({ id: 'shop-rune', cls: 'rune' + (fl.essence < c ? ' poor' : ''), art, name: L('Runa rodu: ', 'Family Rune: ') + F.name, price: String(c), ess: true, pick: { k: 'r', i: 0 } });
        b.style.setProperty('--fam', F.color);
      } else if (!heartView && run.shop.runeDone && FAMILIES[run.shop.runeDone]) {
        const F = FAMILIES[run.shop.runeDone], b = boughtTile('shop-rune', F.glyph + ' ' + F.name + ' · ' + L('poz. ', 'lvl ') + (run.famLv[run.shop.runeDone] || 0));
        b.classList.add('rune'); b.style.setProperty('--fam', F.color);
      }
    }
    og.classList.add('n' + og.children.length); if (m.tight) og.classList.add('tight');   // 1.27.6: see below
    og.addEventListener('scroll', () => { m.cardsX = og.scrollLeft; }, { passive: true });   // a short phone scrolls the row: it keeps its place over a re-render   // four (the Heart's Gift with Dziesięcina): one row of four; five or six: two rows of three
    stage.appendChild(og);
    // the picked card: its whole text and its button
    const dt = el('div', 'cdetail'); dt.id = 'shop-detail'; const P = m.pick;
    const dtText = (u, txt) => {
      const tx = el('span', 'tx', txt || u.text), fit = cardFit(u);
      if (fuses(u)) tx.appendChild(el('i', 'fit good fz', L(' Połączy się w ★: ', ' Fuses into ★: ') + fuseText(u).replace(/^★ [^:]+: /, '')));   // 1.24
      if (fit) tx.appendChild(el('i', 'fit ' + (fit.ok ? 'good' : 'bad'), fit.text));
      dt.appendChild(tx);
    };
    const drow = el('div', 'drow');
    const dbuy = (id, txt, off, label, fn) => { const by = el('button', 'buy', txt); by.type = 'button'; by.id = id; by.disabled = !!off; if (label) by.setAttribute('aria-label', label); by.addEventListener('click', fn); drow.appendChild(by); return by; };
    if (P && P.k === 'h') {
      const i = P.i, id = hk.ids[i], u = UPG[id];
      dt.classList.add('heart', 'rar-' + u.rar);
      dt.appendChild(el('span', 'ok', id === 'regrow' ? L('kryształ · od razu', 'crystal · instant') : kindShort(u))); dt.appendChild(el('b', null, u.name)); dtText(u);
      dbuy('heart-take-' + i, L('Weź za darmo', 'Take for free'), false, L('Weź za darmo: ', 'Take for free: ') + u.name, () => { const r = heartTake(i); m.pick = null; m.msg = r === 'full' ? L('Talia i schowek są pełne: najpierw sprzedaj kartę.', 'Deck and stash are full: sell a card first.') : r === 'stash' ? u.name + L(': do schowka (talia pełna).', ': to stash (deck full).') : r === 'fused' ? u.name + L(': połączona w ★.', ': fused into ★.') : r === 'no' ? '' : id === 'regrow' ? L('Odrost: kryształ wraca do serca.', 'Regrowth: a crystal returns to your heart.') : L('Dar serca: ' + u.name + ' w talii.', "Heart's Gift: " + u.name + ' added to deck.'); rerender(); });
      const later = el('button', 'mini heartlater', L('Później', 'Later')); later.type = 'button'; later.id = 'heart-later'; later.addEventListener('click', () => { m.heartLater = true; m.pick = null; rerender(); }); drow.appendChild(later);
    } else if (P && P.k === 'o') {
      const i = P.i, u = UPG[run.shop.ids[i]], price = priceOf(u), poor = !free && fl.essence < price;
      dt.classList.add('rar-' + u.rar); if (u.kind === 'unlock') dt.classList.add('unlock');
      dt.appendChild(el('span', 'ok', kindShort(u))); dt.appendChild(el('b', null, u.name)); dtText(u);
      dbuy('offer-buy-' + i, free ? L('Weź za darmo', 'Take for free') : poor ? L('Za mało (', 'Not enough (') + price + ')' : L('Kup za ' + price + ' Esencji', 'Buy for ' + price + ' Essence'), poor,
        (free ? L('Weź za darmo: ', 'Take for free: ') : L('Kup za ' + price + ' Esencji: ', 'Buy for ' + price + ' Essence: ')) + u.name, () => {
          const r = shopBuy(i);
          if (r === 'ess') m.msg = L('Za mało Esencji (', 'Not enough Essence (') + price + ').';
          else if (r === 'full') m.msg = L('Talia i schowek są pełne: najpierw sprzedaj kartę.', 'Deck and stash are full: sell a card first.');
          else { m.sel = null; m.pick = null; run.shopTipDone = true; m.msg = r === 'fused' ? u.name + L(': połączona w ★ (jedno miejsce).', ': fused into ★ (one slot).') : r === 'stash' ? u.name + L(': do schowka (talia pełna).', ': to stash (deck full).') : u.kind === 'unlock' ? u.name + L(': odblokowane na stałe.', ': unlocked for good.') : u.kind === 'instant' ? u.name + '.' : L('W talii: ', 'Added to deck: ') + u.name + '.'; }
          rerender();
        });
    } else if (P && P.k === 'r') {
      const f = run.shop.rune, F = FAMILIES[f], lv = run.famLv[f] || 0, c = runePrice(lv);
      dt.classList.add('rune'); dt.style.setProperty('--fam', F.color);
      dt.appendChild(el('span', 'ok', L('Runa rodu · poziom ', 'Family Rune · level ') + lv + ' → ' + (lv + 1) + ' (max ' + RUNE_MAX + ')'));
      const nm = el('b', null, F.glyph + ' ' + F.name); nm.style.color = F.color; dt.appendChild(nm);
      const tx = el('span', 'tx', f === 'treasure' ? L('Łup podbija chciwość o 8% mocniej.', 'Loot raises greed 8% more.') : L('Elementy rodziny: +8% mocy, -4% odnowienia.', 'Family elements: +8% power, -4% cooldown.'));
      tx.appendChild(el('small', 'fine', F.items.filter(t => ITEMS[t]).map(t => ITEMS[t].name).join(', ') + L('. Działa od razu, bez miejsca w talii.', '. Works at once, takes no deck slot.')));
      dt.appendChild(tx);
      dbuy('rune-buy', fl.essence < c ? L('Za mało (', 'Not enough (') + c + ')' : L('Kup za ' + c + ' Esencji', 'Buy for ' + c + ' Essence'), fl.essence < c, null, () => { const r = runeBuy(); m.pick = null; m.msg = r === 'ok' ? L('Runa rodu: ' + F.name + ', poziom ' + (lv + 1) + '.', 'Family Rune: ' + F.name + ', level ' + (lv + 1) + '.') : L('Za mało Esencji.', 'Not enough Essence.'); rerender(); });
    } else dt.appendChild(el('span', 'tx empty', L('Wszystko kupione. Odśwież ofertę albo wróć do budowy.', 'All bought. Refresh the offer or go back to building.')));
    if (drow.children.length) dt.appendChild(drow);
    stage.appendChild(dt);
    // a card from the deck or the stash opens over the offers: the rest of the screen does not move
    if (sel) {
      const arr = sel.k === 'd' ? run.deck : run.stash, u = UPG[arr[sel.i]];
      if (u) {
        const fz = isFused(u.id), sh = el('div', 'sheet rar-' + u.rar + (fz ? ' fused' : '')); sh.id = 'shop-sheet';   // 1.24: a fused ★ card
        sh.appendChild(el('div', 'dk', (sel.k === 'd' ? L('w talii · ', 'in deck · ') : L('w schowku, nie działa · ', 'in stash, inactive · ')) + RAR_NAME[u.rar]));
        sh.appendChild(el('b', null, cardName(u.id))); sh.appendChild(el('div', 'tx', u.text + (fz ? ' ' + fuseText(u) : '')));
        const da = el('div', 'da');
        const mini = (id, txt, fn, cls, off) => { const b = el('button', 'mini' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; if (id) b.id = id; b.disabled = !!off; b.addEventListener('click', fn); da.appendChild(b); return b; };
        if (sel.k === 'd') mini('deck-stash', L('Do schowka', 'To stash'), () => { if (toStash(sel.i)) { m.sel = null; m.msg = u.name + L(': w schowku.', ': moved to stash.'); } rerender(); }, '', run.stash.length >= stashCap() || isGift(u.id));
        else mini('stash-deck', L('Do talii', 'To deck'), () => { if (fromStash(sel.i)) { m.sel = null; m.msg = u.name + L(': z powrotem w talii.', ': back in deck.'); } rerender(); }, '', deckFull());
        const sb = mini('card-sell', L('Sprzedaj +', 'Sell +') + sellFor(u.id), () => {   // 1.24: sellFor
          if (!sb.dataset.sure) { sb.dataset.sure = '1'; sb.textContent = L('Na pewno? +', 'Sure? +') + sellFor(u.id); sb.classList.add('warn'); return; }
          const g = sel.k === 'd' ? sellCard(sel.i) : sellStash(sel.i); m.sel = null; m.msg = L('Sprzedane: ', 'Sold: ') + u.name + ' (+' + g + L(' Esencji).', ' Essence).'); rerender();
        });
        sh.appendChild(da);
        const x = el('button', 'x', '×'); x.type = 'button'; x.id = 'sheet-close'; x.setAttribute('aria-label', L('Zamknij kartę', 'Close card')); x.addEventListener('click', () => { m.sel = null; rerender(); }); sh.appendChild(x);
        stage.appendChild(sh);
      }
    }
    // refresh, refresh for an ad: two buttons that are always there (1.05, author: crystals are no longer bought back for Esencja)
    const acts = el('div', 'acts');
    const act = (id, title, sub, off, fn) => { const b = el('button'); b.type = 'button'; b.id = id; b.appendChild(el('b', null, title)); b.appendChild(el('span', / (Esencji|Essence)$/.test(sub) ? 'ess' : null, sub)); b.disabled = !!off; b.addEventListener('click', fn); acts.appendChild(b); return b; };
    const rc = rerollCost();
    act('shop-reroll', L('Odśwież', 'Refresh'), rc ? rc + L(' Esencji', ' Essence') : L('gratis', 'free'), fl.essence < rc, () => { if (shopReroll(false, heartView)) { m.pick = null; m.sel = null; m.msg = L('Nowa oferta.', 'New offer.'); } else m.msg = L('Za mało Esencji na odświeżenie.', 'Not enough Essence to refresh.'); rerender(); });
    act('shop-ad', L('Za reklamę', 'Watch ad'), run.shop.ad ? L('już użyte', 'used') : L('odśwież raz', 'one refresh'), run.shop.ad, () => { shopReroll(true, heartView); m.pick = null; m.sel = null; m.msg = L('Nowa oferta (reklama, symulacja).', 'New offer (ad, simulated).'); rerender(); });
    body.appendChild(acts);
    // the deck and the stash: every slot has its place, empty ones too
    const dk = panel(body, L('Talia ', 'Deck ') + deckUsed() + '/' + run.deckSize + (run.deck.length > deckUsed() ? L(' · ♥ Serce ', ' · ♥ Heart ') + (run.deck.length - deckUsed()) : ''), L('schowek ', 'stash ') + run.stash.length + '/' + stashCap() + L(' · karty tu nie działają', ' · cards here are inactive'), 'deckp');
    const g = el('div', 'slots');
    const shopDnD = { slots: () => [...g.querySelectorAll('.slot[data-ck]')], done: msg => { m.sel = null; if (msg) m.msg = msg; rerender(); } };   // 1.27.8
    const slot = (u, k, i, empty) => {
      const b = el('button', 'slot' + (k === 's' ? ' st' : '') + (u ? ' rar-' + u.rar : ' empty') + (u && isFused(u.id) ? ' fused' : '') + (sel && sel.k === k && sel.i === i ? ' sel' : ''), u ? cardName(u.id) : empty); b.type = 'button';   // 1.24: ★
      if (u) { b.addEventListener('click', () => { m.sel = sel && sel.k === k && sel.i === i ? null : { k, i }; rerender(); }); cardGestures(b, k, i, shopDnD); } else { b.disabled = true; b.dataset.ck = k; b.dataset.ci = -1; }   // 1.27.8: drag to move, hold to sell
      if (u && (u.id === 'copyist' || u.id === 'soulmirror') && k === 'd') { const t = copyTarget(u.id); b.title = t ? L('kopiuje: ', 'copies: ') + cardName(t) : L('nic nie kopiuje', 'copies nothing'); b.appendChild(el('small', 'cpy', t ? '→ ' + cardName(t) : L('→ nic', '→ nothing'))); }
      g.appendChild(b);
    };
    { const ordI = run.deck.map((id, i) => i).filter(i => !isGift(run.deck[i])), giftI = run.deck.map((id, i) => i).filter(i => isGift(run.deck[i]));   // 1.27.5: the slots, then the gift cards
      for (let s = 0; s < Math.max(run.deckSize, ordI.length); s++) slot(ordI[s] != null ? UPG[run.deck[ordI[s]]] : null, 'd', ordI[s] != null ? ordI[s] : -1, L('wolne', 'empty'));
      giftI.forEach(i => { slot(UPG[run.deck[i]], 'd', i, ''); g.lastChild.classList.add('giftslot'); }); }
    for (let i = 0; i < stashCap(); i++) slot(UPG[run.stash[i]], 's', i, L('schowek', 'stash'));
    dk.appendChild(g);
    const foot = el('div', 'scr-foot'); card.appendChild(foot);
    const hp = (run.heartPicks || []).length;
    const done = btn('primary', L('Do budowy fali ', 'Build wave ') + run.wave, free || hp ? [free ? L('darmowe karty: ', 'free cards: ') + run.freePicks : '', hp ? L('Dar serca: ', "Heart's Gift: ") + hp : ''].filter(Boolean).join(' · ') + L(' poczekają', ' will wait') : L('sklep otworzysz w zakładce Talia', 'reopen the shop from the Deck tab'), closeModal); done.id = 'shop-close';
    if (!heartView && hk) { const hb = el('button', 'mini heartback', L('♥ Dar serca czeka (', "♥ Heart's Gift (") + hp + ')'); hb.type = 'button'; hb.id = 'heart-back'; hb.addEventListener('click', () => { m.heartLater = false; m.sel = null; rerender(); }); foot.appendChild(hb); }
    foot.appendChild(done);
    if (m.msg) { foot.appendChild(el('div', 'shopmsg', m.msg)); m.msg = ''; }   // what just happened: a message over the big button (1.12.1: in the shop itself, the top hint is gone)
    { const row = card.querySelector('.offers.cards'); if (row && m.cardsX) row.scrollLeft = m.cardsX; }
    requestAnimationFrame(() => {
      // 1.27.6 (author: the descriptions vanished): two rows of cards over a full deck left the text no room; then one row that scrolls
      { const tx = card.querySelector('#shop-detail .tx'), row = card.querySelector('.offers.cards'); if (tx && row && !m.tight && tx.clientHeight < 64) { m.tight = true; row.classList.add('tight'); } }
      card.querySelectorAll('.sheet, .cdetail').forEach(fitText); card.querySelectorAll('.slot:not(.empty)').forEach(fitSlot); });
  }
  // Prototype 1.0: the whole text has to fit its box, nothing is cut. The letters shrink step by step down to a readable minimum;
  // a long name shrinks too. The tile says data-fit="no" if even that is not enough (the tests look for it).
  function fitSlot(s) {   // a card name in a deck slot: smaller letters rather than a cut word
    s.style.fontSize = ''; let f = parseFloat(getComputedStyle(s).fontSize) || 11.5;
    while (s.scrollHeight > s.clientHeight + 1 && f > 9) { f -= 0.5; s.style.fontSize = f + 'px'; }
  }
  function fitText(box) {
    const tx = box.querySelector('.tx'), nm = box.querySelector('b'); if (!tx) return;
    const sheet = box.classList.contains('sheet') || box.classList.contains('cdetail'), max = sheet ? 14 : 13, min = sheet ? 11 : 10;
    const over = () => tx.scrollHeight > tx.clientHeight + 1;
    tx.style.fontSize = max + 'px'; tx.style.lineHeight = ''; if (nm) nm.style.fontSize = '';
    for (let f = max; over() && f > min; ) { f = Math.round((f - 0.5) * 10) / 10; tx.style.fontSize = f + 'px'; }
    if (over() && nm && !sheet) { nm.style.fontSize = '13px'; }
    if (over()) tx.style.lineHeight = '1.15';
    box.dataset.fit = over() ? 'no' : 'ok';
  }

  /* ----- the end of the run ----- */
  function renderEnd(card, m) {
    m = m || {};
    const dur = (Date.now() - run.startedAt) / 1000;
    if (run.result === 'end' && run.won) run.result = 'win';   // won earlier, fell later in the endless part: still a win
    const W = run.waves, held = W.filter(w => !w.partial).length, rec = loadRecords(), wasBest = m.wasBest != null ? m.wasBest : (rec.best || 0);
    if (!run.recorded) {   // this browser's records (1.12: the first run with the guide is a real run too)
      run.recorded = true; rec.runs++; if (run.result === 'win') rec.wins++;
      rec.best = Math.max(wasBest, Math.round(run.total)); rec.wave = Math.max(rec.wave || 0, held); saveRecords(rec);
    }
    m.wasBest = wasBest;
    const isBest = run.total > wasBest && run.total > 0;
    if (run.result === 'win') card.classList.add('vic');
    scrHead(card, L('Koniec runu · ', 'Run over · ') + mmss(dur), run.result === 'win' ? L('Zwycięstwo', 'Victory') : run.result === 'quit' ? L('Run przerwany', 'Run ended') : L('Loch upadł', 'Your dungeon fell'), String(Math.round(run.total)), L('Esencji w runie', 'Essence this run'), [run.total, v => String(Math.round(v))]);
    const body = el('div', 'scr-body'); card.appendChild(body);
    body.appendChild(el('p', 'note', run.reason + (run.endless > 0 ? L(' Fale bez końca po zwycięstwie: ', ' Endless waves after the win: ') + run.endless + '.' : '')));
    const rk = rankOf(run.total), rr = el('div', 'rankrow'), pill = el('div', 'rank', L('Ranga: ', 'Rank: ') + rk.name);
    if (rk.next) pill.appendChild(el('small', null, L('następna: ' + rk.next[1] + ' od ' + rk.next[0], 'next: ' + rk.next[1] + ' at ' + rk.next[0])));
    rr.appendChild(pill); if (isBest) rr.appendChild(el('span', 'newrec', L('Nowy rekord!', 'New record!'))); body.appendChild(rr);
    const sum = k => W.reduce((a, w) => a + (w.stats[k] || 0), 0);
    const tiles = el('div', 'statrow');
    statTile(tiles, String(held), L(plural(held, 'fala', 'fale', 'fal'), held === 1 ? 'wave' : 'waves'), run.result === 'win' ? 'good' : ''); statTile(tiles, String(sum('kills')), L('zabici', 'killed')); statTile(tiles, String(sum('scared')), L('wystraszeni', 'scared off')); statTile(tiles, String(W.filter(w => w.hunger && w.hunger.ate).length), L('zjedzone kryształy', 'crystals eaten'));
    body.appendChild(tiles);
    waveChart(panel(body, L('Esencja z fal', 'Essence per wave'), L('szare: stracony kryształ', 'grey: crystal lost')), W, 0);
    const tot = {};
    W.forEach(w => Object.keys(w.items || {}).forEach(k => { const b = w.items[k]; if (!ITEMS[k] || TOOLS[k]) return; tot[k] = (tot[k] || 0) + (b.pts || 0) + (b.passivePts || 0) + (b.fearPts || 0); }));
    const best = Object.entries(tot).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 5), mx = best.length ? best[0][1] : 1;
    const pb = panel(body, L('Najlepsze elementy runu', 'Best elements of the run'), null, 'segpanel'), list = el('div', 'flist'); pb.appendChild(list);
    best.forEach(([k, v]) => { const d = el('div', 'irow'), bar = el('i'), bw = el('span', 'bw'); bar.style.width = Math.max(2, Math.round(100 * v / mx)) + '%'; bw.appendChild(bar); d.appendChild(el('span', null, ITEMS[k].name)); d.appendChild(bw); d.appendChild(el('b', null, Math.round(v) + L(' Esencji', ' Essence'))); list.appendChild(d); });
    if (!best.length) frow(list, L('Brak danych o elementach.', 'No element data.'));
    if (run.deck.length) frow(list, L('Talia: ', 'Deck: ') + run.deck.map(id => UPG[id] ? UPG[id].name : id).join(', ') + '.');
    frow(list, L('Rekordy na tym urządzeniu: ' + Math.round(rec.best) + ' Esencji w runie · najdalej fala ' + rec.wave + ' · wygrane ' + rec.wins + ' z ' + rec.runs + '.', 'Records on this device: ' + Math.round(rec.best) + ' Essence in a run · furthest wave ' + rec.wave + ' · wins ' + rec.wins + ' of ' + rec.runs + '.'));
    fitList(list);
    const foot = el('div', 'scr-foot'); card.appendChild(foot);
    const row = el('div', 'row');
    const again = btn('primary', L('Jeszcze raz', 'Play again'), null, () => { closeModal(); if (onbStage() <= 4) startGuided(); else newRun(false); }); again.id = 'end-again';   // 1.12.1: the first runs go on in order
    row.appendChild(again); row.appendChild(btn('', 'Menu', null, () => { closeModal(); openModal({ type: 'start' }); })); foot.appendChild(row);
    const mr = el('div', 'minirow'), dn = el('p', 'note', m.logNote || L('Zapisuję wynik do analizy...', 'Saving the result for analysis...'));
    const db = el('button', 'mini', L('Pobierz wyniki (.json)', 'Download results (.json)')); db.type = 'button'; db.addEventListener('click', () => downloadRun(dn)); mr.appendChild(db);
    foot.appendChild(mr); foot.appendChild(dn);
    if (!m.pushed) { m.pushed = true; pushLog(null).then(res => { m.logNote = res === 'ok' ? L('Wynik zapisany. Claude może go przeanalizować przy balansie.', 'Result saved. Claude can analyse it for balancing.') : logText(res); if (dn.isConnected) dn.textContent = m.logNote; }); }
  }
  // 1.05: buying a crystal back for Esencja is gone (only a card, Żarłoczne serce, or the continue after a lost run give one back);
  // kept for old tests only, nothing in the game calls it
  const crystalCost = () => 40 + 30 * (run.crystalsBought || 0);
  // 1.24 (D, P1-2; testers started waves 6-9 with 119-449 Esencja unspent): the cheapest element the player could put down now (traps,
  // monsters, loot, buildings; no tools, room types or komnaty), for the pulsing counter and the question before a wave
  let cheapK = '', cheapV = Infinity, cheapT = null;
  function cheapestItem() {
    if (!run || !fl) return { cost: Infinity, t: null };
    const k = fl.items.size + '|' + run.unlocked.size + '|' + (run.stage || 0) + '|' + mods.buildingCost;
    if (k !== cheapK) {
      cheapK = k; cheapV = Infinity; cheapT = null;
      ITEM_ORDER.forEach(t => { if (!ITEMS[t] || TOOLS[t] || MODES[t] || ROOMTYPES[t] || KINDS[t] || !onbOk(t) || !isOpenT(t)) return; const c = costOf(t); if (c > 0 && c < cheapV) { cheapV = c; cheapT = t; } });
    }
    return { cost: cheapV, t: cheapT };
  }
  // the question before a wave: more than half of the build's starting Esencja left and enough for the cheapest element; never in the
  // guide; "Nie pytaj więcej" is kept on this device ('yatd-noask-ess'). stats.unspentAsk / unspentGo go to the wave record.
  const NOASK_KEY = 'yatd-noask-ess';
  function askUnspent() {
    if (!run || !fl || fl.phase !== 'build' || run.tut >= 0) return false;
    let no = ''; try { no = localStorage.getItem(NOASK_KEY) || ''; } catch (e) {}
    if (no) return false;
    const e = Math.floor(fl.essence), e0 = run.essAtStart != null ? run.essAtStart : e, ch = cheapestItem();
    if (!ch.t || e < ch.cost || !(e > 0.5 * e0)) return false;
    if (e <= hungerNeed(run.wave)) return false;   // 1.26: a purse kept for the hunger is a choice (the heart takes from it after a hungry wave)
    fl.stats.unspentAsk = (fl.stats.unspentAsk || 0) + 1;
    openModal({ type: 'unspent', e, ch });
    return true;
  }
  // 1.25.1 (playtest brief: say what to buy, not only "you have X"): one or two things worth the Esencja left, each with why.
  // Candidates: what the tray offers now (open, unlocked, affordable) with a free spot in the dungeon. Score: a trap 3, a monster
  // 2,6, loot 1,6, a building 1; + up to 1,5 for the dearer (stronger) of what is affordable; + 1-2 for what scored in the last wave;
  // + 2 for loot when the heart is hungry (greed multiplies Esencja); + 0,6 when it fits on (or covers) the heroes' way. The second
  // is of another kind and fits in what the first leaves, when there is one.
  function suggestBuys(e) {
    if (!run || !fl) return [];
    const onWay = new Set(shortestPath().map(p => key(p[0], p[1]))), last = run.waves.length ? run.waves[run.waves.length - 1] : null;
    const lastPts = t => { const r = last && last.items && last.items[t]; return r ? (r.pts || 0) + (r.fearPts || 0) : 0; };
    const hr = hungerRisk(), C = [];
    ITEM_ORDER.forEach(t => {
      const I = ITEMS[t]; if (!I || TOOLS[t] || MODES[t] || ROOMTYPES[t] || KINDS[t] || !onbOk(t) || !isOpenT(t)) return;
      const c = costOf(t); if (!(c > 0) || c > e) return;
      let spots = 0, way = false;
      for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
        if (!canPlace(t, x, y)) continue;
        spots++;
        if (!way && (onWay.has(key(x, y)) || (ACTIVE[t] && areaOf({ type: t, x, y }).some(a => onWay.has(key(a[0], a[1])))))) way = true;
      }
      if (!spots) return;
      const kind = TRAPS[t] ? 'trap' : MONSTERS[t] ? 'monster' : isLoot(t) ? 'loot' : BUILDINGS[t] ? 'building' : 'other';
      let sc = { trap: 3, monster: 2.6, loot: 1.6, building: 1, other: 0.5 }[kind] + Math.min(1.5, 1.5 * c / Math.max(3, e));
      const lp = lastPts(t), why = [];
      if (lp > 0) { sc += 1 + Math.min(1, lp / 200); why.push(L('mocne w ostatniej fali (' + Math.round(lp) + ' pkt)', 'strong last wave (' + Math.round(lp) + ' pts)')); }
      if (kind === 'loot' && hr) { sc += 2; why.push(L('chciwość pomoże nakarmić serce', 'greed helps feed the heart')); }
      if (way) { sc += 0.6; if (kind !== 'loot') why.push(L('stoi na trasie bohaterów', "on the heroes' path")); }
      if (!why.length) why.push(I.tag || '');
      C.push({ t, c, kind, sc, why: why[0] });
    });
    C.sort((a, b) => b.sc - a.sc);
    if (!C.length) return [];
    const a = C[0], rest = C.slice(1);
    const b = rest.find(q => q.kind !== a.kind && q.c <= e - a.c) || rest.find(q => q.c <= e - a.c) || rest.find(q => q.kind !== a.kind);
    return b ? [a, b] : [a];
  }
  function flashSuggest(ts) {   // the suggested tiles pulse in the tray for 6 s
    document.querySelectorAll('#tray .item.suggest').forEach(b => b.classList.remove('suggest'));
    ts.forEach(t => { const b = $('#item-' + t); if (b) b.classList.add('suggest'); });
    clearTimeout(flashSuggest.t); flashSuggest.t = setTimeout(() => document.querySelectorAll('#tray .item.suggest').forEach(b => b.classList.remove('suggest')), 6000);
  }
  function renderUnspent(card, m) {
    card.appendChild(el('div', 'sub', L('Przed falą ', 'Before wave ') + run.wave));
    card.appendChild(el('h2', null, L('Masz ' + m.e + ' Esencji', 'You have ' + m.e + ' Essence')));
    const hr = hungerRisk(), sg = suggestBuys(m.e);
    fl.stats.unspentPicks = sg.map(q => q.t);
    card.appendChild(el('p', null, (sg.length ? L('Niewydana Esencja nie broni lochu. Warto jeszcze postawić:', 'Unspent Essence does not defend. Worth placing:') : L('Wypuścić falę mimo to? Niewydana Esencja nie broni lochu. Najtańszy element: ', 'Start the wave anyway? Unspent Essence does not defend. Cheapest element: ') + ITEMS[m.ch.t].name + ' (' + m.ch.cost + ').') + (hr ? L(' Uwaga na głód: serce chce ' + hr + ' Esencji z tej fali.', ' Mind the hunger: the heart wants ' + hr + ' Essence from this wave.') : '')));
    const lab = el('label', 'askno'), cb = el('input'); cb.type = 'checkbox'; cb.id = 'unspent-noask'; lab.appendChild(cb); lab.appendChild(document.createTextNode(L(' Nie pytaj więcej', " Don't ask again")));
    const keep = () => { if (cb.checked) try { localStorage.setItem(NOASK_KEY, '1'); } catch (e) {} };
    // a suggestion: to its tab, the tile picked (its free spots light up on the map), the tile pulses
    const take = t => {
      keep(); fl.stats.unspentPick = t; closeModal();
      const tb = TABS.find(x => x.items.includes(t)); if (!trayIsOpen()) setTrayOpen(true, true); if (tb) pickTab(tb.id, t);
      selected = t; movingKey = null; movingObj = null; updateTray(); flashSuggest([t]);
    };
    if (sg.length) {
      const box = el('div', 'choices sugg');
      sg.forEach(q => { const b = btn('gold', ITEMS[q.t].name + ' · ' + q.c + L(' Esencji', ' Essence'), q.why, () => take(q.t)); b.id = 'unspent-sug-' + q.t; b.dataset.t = q.t; box.appendChild(b); });
      card.appendChild(box);
    }
    const row = el('div', 'row');
    const back = btn(sg.length ? '' : 'primary', L('Buduj dalej', 'Keep building'), null, () => { keep(); closeModal(); if (sg.length) { const tb = TABS.find(x => x.items.includes(sg[0].t)); if (!trayIsOpen()) setTrayOpen(true, true); if (tb) pickTab(tb.id, sg[0].t); flashSuggest(sg.map(q => q.t)); } }); back.id = 'unspent-back';
    const go = btn('', L('Wypuść falę', 'Release wave'), L('mimo to', 'anyway'), () => { keep(); fl.stats.unspentGo = (fl.stats.unspentGo || 0) + 1; closeModal(); startWave(); }); go.id = 'unspent-go';
    row.appendChild(back); row.appendChild(go); card.appendChild(row); card.appendChild(lab);
  }
  function buyCrystal() {
    const c = crystalCost();
    if (!fl || fl.phase !== 'build' || run.crystals >= run.maxCrystals || fl.essence < c) return false;
    fl.essence -= c; run.essence = fl.essence; run.crystals++; run.crystalsBought = (run.crystalsBought || 0) + 1; crystalEv(1, 'other', 'buy');   // 1.24 (D, P0-2)
    tl('cb', c); updateTray(); saveRunSoon(); return true;
  }
  function addEss(n) { fl.essence += n; run.essence = fl.essence; updateTray(); }
  function applyUpgrade(u) {
    if (u.kind === 'unlock') { run.unlocked.add(u.unlock); saveFound(u.unlock); }   // 1.14: for good, in later runs too
    else if (u.kind === 'instant') { const c0 = run.crystals; u.apply(); crystalEv(run.crystals - c0, 'card', u.id); }   // 1.24 (D, P0-2): Żarłoczne serce, Pakt
    else if (fuses(u)) fuseCard(u.id);   // 1.24: the second copy fuses with the first
    else { deckAdd(u.id); recomputeMods(); }   // 1.27.5: ordinary cards before the gift cards
    run.upgrades.push(u.id); updateTray();
  }
  function sellCard(i) {
    const id = run.deck[i], u = UPG[id]; if (!u) return 0;
    const g = sellFor(id); run.deck.splice(i, 1); (run.sold = run.sold || []).push(id); unfuse(id);   // 1.24: a fused ★ card sells for two
    addEss(g); recomputeMods();
    return g;
  }
  // plural(): p1_config.js (1.27)
  const slotsTxt = n => n + ' ' + plural(n, 'miejsce', 'miejsca', 'miejsc');
  const capFirst = t => t.charAt(0).toUpperCase() + t.slice(1);
  function kindLabel(u) {
    if (u.kind === 'unlock') return L('Odblokowanie na stałe · bez miejsca w talii', 'Permanent unlock · no deck slot') + effWords(u.unlock).map(w => ' · ' + w).join('');   // 1.24 (B, P1-4)
    if (u.kind === 'instant') return capFirst(RAR_NAME[u.rar]) + L(' · jednorazowa, bez miejsca w talii', ' · one-off, no deck slot');
    const n = run.deck.filter(x => x === u.id).length;
    return capFirst(RAR_NAME[u.rar]) + L(' karta', ' card') + (u.unique ? L(' · tylko jedna', ' · unique') : '') + (fuses(u) ? L(' · połączy się w ★', ' · fuses into ★') : n ? L(' · w talii: ', ' · in deck: ') + n : '');   // 1.24
  }
  function cardBtn(u, onClick, extra) {
    const b = el('button', 'btn cardpick rar-' + u.rar + (u.kind === 'unlock' ? ' unlock' : '')); b.type = 'button';
    b.appendChild(el('span', 'ck', kindLabel(u)));
    b.appendChild(el('b', null, u.name)); b.appendChild(el('span', null, u.text));
    if (fuses(u)) { b.classList.add('fuse'); b.appendChild(el('span', 'cx', L('Połączy się w ★: ', 'Fuses into ★: ') + fuseText(u).replace(/^★ [^:]+: /, ''))); }   // 1.24
    if (extra) b.appendChild(el('span', 'cx', extra));
    b.addEventListener('click', onClick); return b;
  }
  // The three cards (and the reroll), used by the card modal and by the wave summary.
  function renderPickSection(box, card, m) {
    // the same three when you come back from the "deck full" screen, and after "save and quit" (kept on the pending pick, so it lands in the save)
    const src = m.src || null;
    if (!m.picks && src && src.picks) m.picks = src.picks.map(id => UPG[id]).filter(Boolean);
    if (!m.picks || !m.picks.length) m.picks = upgradePicks((m && m.rarity) || 1);
    if (src && !src.picks) { src.picks = m.picks.map(u => u.id); saveRunSoonSummary(); }
    const ch = el('div', 'choices');
    m.picks.forEach(u => ch.appendChild(cardBtn(u, () => takeCard(card, m, u))));
    box.appendChild(ch);
    if (!fl.rerolled && !(src && src.rerolled)) {
      const rb = el('button', 'link', L('Losuj ponownie (reklama, raz na falę)', 'Reroll (ad, once per wave)')); rb.type = 'button';
      rb.addEventListener('click', () => { fl.rerolled = true; if (src) { src.rerolled = true; src.picks = null; } m.picks = null; box.innerHTML = ''; renderPickSection(box, card, m); });
      box.appendChild(rb);
    }
  }
  const pickSub = src => src.src === 'thr' ? L('Próg ' + src.thr + ' pkt: rzadkie karty', src.thr + ' pts reached: rare cards') : src.src === 'boss' ? (src.wave === RUN_WAVES ? L('Finał przetrwany', 'Finale survived') : L('Fala z bossem przetrwana', 'Boss wave survived')) + L(': legendarna karta', ': legendary card') : L('Fala ' + (src.wave || run.wave) + ' odparta', 'Wave ' + (src.wave || run.wave) + ' held');
  function renderUpgrade(card, m) {
    const src = (m && m.src) || {};
    card.appendChild(el('div', 'sub', pickSub(src)));
    card.appendChild(el('h2', null, L('Wybierz kartę', 'Pick a card')));
    if (run.tutorial && !run.upgrades.length) card.appendChild(el('p', 'tipnote', L('Twoja pierwsza karta! Trafia do talii (' + slotsTxt(run.deckSize) + ') i działa w każdej fali, dopóki jej nie sprzedasz. Odblokowanie (fioletowa ramka) daje nową pułapkę albo potwora i nie zajmuje miejsca. Talia jest w zakładce Talia.', 'Your first card! It goes to your deck (' + run.deckSize + ' slots) and works every wave until you sell it. An unlock (purple frame) gives a new trap or monster and takes no slot. Your deck is in the Deck tab.')));
    card.appendChild(el('p', 'note', L('Talia: ' + run.deck.length + ' z ' + run.deckSize + '. Druga kopia karty łączy się z pierwszą w ★ (jedno miejsce, moc ×2,5 i cecha).', 'Deck: ' + run.deck.length + ' of ' + run.deckSize + '. A second copy fuses with the first into ★ (one slot, ×2.5 power and a trait).')));   // 1.24
    const box = el('div'); renderPickSection(box, card, m); card.appendChild(box);
    card.appendChild(el('p', 'note', L('Kartę dostajesz za każdą przetrwaną falę. Im dalej, tym częściej trafiają się rzadkie i legendarne.', 'You get a card for every wave you hold. The further you go, the more often rare and legendary ones show up.')));
  }
  function finishPick(m) { closeModal(); if (m && m.onDone) m.onDone(); }
  function takeCard(card, m, u) {
    if (u.kind === 'card' && !fuses(u) && !isGift(u.id) && deckFull()) { card.innerHTML = ''; card.scrollTop = 0; renderReplace(card, m, u); return; }   // 1.24: a second copy needs no slot
    applyUpgrade(u); finishPick(m);
    setHint(u.kind === 'unlock' ? u.name + L(': odblokowane na stałe.', ': unlocked for good.') : u.kind === 'instant' ? u.name + '.' : L('Nowa karta w talii: ', 'New card in deck: ') + u.name + ' (' + run.deck.length + '/' + run.deckSize + ').');
  }
  // Deck full: sell one card to make room, or pass on the new one (it is sold for you).
  function renderReplace(card, m, u) {
    card.appendChild(el('div', 'sub', L('Talia pełna · ', 'Deck full · ') + run.deck.length + L(' z ', ' of ') + run.deckSize));
    card.appendChild(el('h2', null, L('Co sprzedajesz?', 'Which card do you sell?')));
    card.appendChild(el('p', null, L('Nowa karta: ', 'New card: ') + u.name + ' (' + u.tag + L('). Sprzedana karta przestaje działać i oddaje Esencję.', '). A sold card stops working and gives back Essence.')));
    const box = el('div', 'choices');
    run.deck.forEach((id, i) => {
      const c = UPG[id]; if (!c) return;   // 1.18: a card gone from the game (u-portrait) in an old save
      box.appendChild(cardBtn(c, () => {
        const got = sellCard(i);
        deckAdd(u.id); run.upgrades.push(u.id); recomputeMods();
        finishPick(m); setHint(L('Sprzedane: ', 'Sold: ') + c.name + ' (+' + got + L(' Esencji). Nowa karta: ', ' Essence). New card: ') + u.name + '.');
      }, L('Sprzedaj za ' + sellFor(id) + ' Esencji', 'Sell for ' + sellFor(id) + ' Essence')));   // 1.24: sellFor
    });
    const no = el('button', 'btn pass'); no.type = 'button';
    no.appendChild(el('b', null, L('Nie biorę: ', 'Skip: ') + u.name)); no.appendChild(el('span', null, L('Talia bez zmian, za odrzuconą kartę +' + RAR_SELL[u.rar] + ' Esencji.', 'Your deck stays as is, +' + RAR_SELL[u.rar] + ' Essence for the skipped card.')));
    no.addEventListener('click', () => { addEss(RAR_SELL[u.rar]); (run.sold = run.sold || []).push(u.id); finishPick(m); setHint(L('Odrzucona karta: ', 'Skipped card: ') + u.name + ' (+' + RAR_SELL[u.rar] + L(' Esencji).', ' Essence).')); });
    box.appendChild(no);
    card.appendChild(box);
    const back = el('button', 'link', L('Wróć do wyboru', 'Back to the cards')); back.type = 'button';
    back.addEventListener('click', () => { card.innerHTML = ''; card.scrollTop = 0; if (m.back) m.back(card); else renderUpgrade(card, m); });
    card.appendChild(back);
  }
  // A placed element, tapped between waves: what it does, its level, upgrade it or take it down (full refund).
  // 1.26: going to level 3 takes a branch, A or B (tapUpgrade and the item card ask first; a call without one takes A)
  // 1.26: an icon for a tile that has no drawing yet (the family's colour and glyph, or the first letter)
  function genIcon(t) {
    const f = FAMILY_OF[t] || (KINDS[t] ? FAMILY_OF[(KIND_INFO[KINDS[t]].items || [])[0]] : null), F = f ? FAMILIES[f] : null, col = F ? F.color : '#c9c2d8', g = KINDS[t] ? KIND_INFO[KINDS[t]].glyph : F ? F.glyph : (ITEMS[t] ? ITEMS[t].name[0] : '?');
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" fill="#1b1a20" stroke="' + col + '" stroke-width="1.4"/><text x="12" y="16.5" text-anchor="middle" font-size="12" fill="' + col + '" font-family="serif">' + g + '</text></svg>';
  }
  // 1.27.5 (6.7 of the 1.26 plan, faster building): every element of this type and level in the same room in one tap, one undo
  // step (the element card's "Ulepsz wszystkie w pokoju"; at level 2 the trait window asks once for all of them)
  function sameInRoom(it) { const r = slotRoom(it.type, it.x, it.y), lv = it.lvl || 1; return [...fl.items.values()].filter(o => o.type === it.type && (o.lvl || 1) === lv && !o.dropped && slotRoom(o.type, o.x, o.y) === r); }
  const upgradeAllCost = list => list.reduce((s, o) => s + upgCost(o), 0);
  function upgradeAll(it, branch) {
    const list = sameInRoom(it); if (list.length < 2 || !fl || fl.phase !== 'build' || (it.lvl || 1) >= 3 || !ACTIVE[it.type]) return 0;
    if (fl.essence < upgradeAllCost(list)) return 0;
    pushUndo(L('ulepszenie wszystkich: ', 'upgrade all: ') + ITEMS[it.type].name);
    let n = 0; list.forEach(o => { if (upgradeItem(o, branch, true)) n++; });
    fl.stats.upgradeAll = (fl.stats.upgradeAll || 0) + 1; return n;
  }
  function upgradeItem(it, branch, noUndo) {
    const c = upgCost(it); if (fl.phase !== 'build' || !ACTIVE[it.type] || (it.lvl || 1) >= 3 || fl.essence < c) return false;
    if (!noUndo) pushUndo(L('ulepszenie: ', 'upgrade: ') + ITEMS[it.type].name);
    const was = it.lvl || 1;
    fl.essence -= c; it.spent = (it.spent || ITEMS[it.type].cost) + c; it.lvl = was + 1;
    if (it.lvl === 3) it.branch = branch === 'B' && TRAITS_B[it.type] ? 'B' : 'A';
    if (mods.heartMem && it.memRes && it.memLvl === was) it.memLvl = it.lvl;   // 1.26 Pamięć serca
    if (MONSTERS[it.type]) { const k = LVL_MON[it.lvl] / LVL_MON[was]; it.max = Math.round(it.max * k); it.hp = it.max; it.power *= k; if (it.baseMax) it.baseMax = Math.round(it.baseMax * k); }
    bt(it.type).spent += c; bt(it.type).upgraded = (bt(it.type).upgraded || 0) + 1; fl.stats.upgrades = (fl.stats.upgrades || 0) + 1; tutFlags.upgraded = true;
    floatTile(it.x, it.y, L('Poziom ', 'Level ') + it.lvl + (it.lvl === 3 && branchTrait(it) ? ': ' + branchTrait(it)[0] : ''), '#ffb35c', 15, -0.8);
    it.popR = realNow; burst(it.x + 0.5, it.y + 0.5, '#ffb35c', 12); particles.push({ ring: true, x: it.x + 0.5, y: it.y + 0.5, r: 0.2, maxR: 1.1, life: 0.4, color: '#ffb35c' });   // 1.09: an upgrade glows and pops
    updateTray(); saveRunSoon();
    return true;
  }
  // 1.09: a puff of dust and a ring on a tile (placing, moving, taking down)
  function dustAt(x, y) { if (reduceMotion) return; burst(x + 0.5, y + 0.5, '#9a9286', 7); particles.push({ ring: true, x: x + 0.5, y: y + 0.5, r: 0.15, maxR: 0.85, life: 0.32, color: '#b9b2a6' }); }
  function removeItem(it) {
    pushUndo(L('zdjęcie: ', 'remove: ') + ITEMS[it.type].name);
    const back = it.spent != null ? it.spent : ITEMS[it.type].cost;   // loot left by heroes (spent 0) gives nothing back
    fl.items.delete(key(it.x, it.y)); fl.essence += back; if (!it.dropped) { bt(it.type).placed--; bt(it.type).spent -= back; } fl.threatDirty = true;
    if (it.memRes) { run.memSpots = run.memSpots || {}; run.memSpots[key(it.x, it.y)] = [it.type, it.memRes, it.memLvl || 1]; }   // 1.09: put back here, it remembers
    dustAt(it.x, it.y);   // 1.09: a puff where it stood
    updateTray(); saveRunSoon();
    return back;
  }
  // Przenieś: free, keeps the level. The element is lifted off for the check, so its own spot does not count as taken.
  function moveTarget(it, wx, wy) {
    const k0 = key(it.x, it.y); fl.items.delete(k0);
    const loads = roomLoads();
    let best = null, bd = 1.0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.floor(wx) + dx, y = Math.floor(wy) + dy;
      if ((x === it.x && y === it.y) || !canPlace(it.type, x, y, loads)) continue;
      const d = Math.hypot(wx - (x + 0.5), wy - (y + 0.5)); if (d < bd) { bd = d; best = [x, y]; }
    }
    fl.items.set(k0, it);
    return best;
  }
  function moveItem(it, x, y) {
    if (!fl || fl.phase !== 'build') return false;
    pushUndo(L('przeniesienie: ', 'move: ') + ITEMS[it.type].name);
    fl.items.delete(key(it.x, it.y)); dustAt(it.x, it.y);
    it.x = x; it.y = y; it.gx = x + 0.5; it.gy = y + 0.5; it.preview = 1.4; it.popR = realNow; dustAt(x, y);   // 1.09: lifted with a puff, put down with a pop
    fl.items.set(key(x, y), it); fl.threatDirty = true;
    floatTile(x, y, L('Przeniesione', 'Moved'), '#d8d2c4', 13, -0.6); tutFlags.moved = true;
    updateTray(); saveRunSoon();
    return true;
  }
  // the element under (or right next to) a tap, any kind
  function itemAt(wx, wy) {
    const direct = fl.items.get(key(Math.floor(wx), Math.floor(wy)));
    if (direct) return direct;
    let best = null, bd = 0.85;
    for (const d of DIRS8) {
      const it = fl.items.get(key(Math.floor(wx) + d[0], Math.floor(wy) + d[1])); if (!it) continue;
      const dist = Math.hypot(wx - (it.x + 0.5), wy - (it.y + 0.5)); if (dist < bd) { bd = dist; best = it; }
    }
    return best;
  }
  const branchTrait = it => (it.lvl || 1) >= 3 ? (it.branch === 'B' ? TRAITS_B[it.type] : TRAITS[it.type]) : null;   // 1.26
  function tapUpgrade(it) {
    const T = ITEMS[it.type], lvl = it.lvl || 1;
    if (!ACTIVE[it.type]) { note(L('Tego nie ulepszysz', "Can't be upgraded"), it.x, it.y); return; }
    if (lvl >= 3) { note(L('Poziom 3 to maks', 'Level 3 is max'), it.x, it.y); return; }
    const c = upgCost(it);
    if (fl.essence < c) { note(L('Za mało Esencji (', 'Not enough Essence (') + c + ')', it.x, it.y); return; }
    if (lvl === 2 && TRAITS_B[it.type]) { openModal({ type: 'branch', k: key(it.x, it.y) }); return; }   // 1.26: level 3 asks A or B
    upgradeItem(it);   // it says "Poziom N" over the tile itself (1.12.1: the second, same note is gone)
  }
  function tapMove(wx, wy) {
    const cur = movingKey && fl.items.get(movingKey);
    if (!cur) {
      const it = itemAt(wx, wy);
      if (!it) { movingKey = null; setHint(L('Stuknij element, który chcesz przenieść.', 'Tap an element to move it.')); return; }
      movingKey = key(it.x, it.y); setHint(L('Przenosisz: ' + ITEMS[it.type].name + '. Stuknij nowe miejsce (podświetlone) albo ten sam element, żeby go odłożyć.', 'Moving: ' + ITEMS[it.type].name + '. Tap a new spot (highlighted), or the element again to put it back.'));
      return;
    }
    if (Math.floor(wx) === cur.x && Math.floor(wy) === cur.y) { movingKey = null; setHint(L('Odłożone. Stuknij inny element, żeby go przenieść.', 'Put back. Tap another element to move it.')); return; }
    const t = moveTarget(cur, wx, wy);
    if (!t) { note(L('Tu nie pasuje', "Doesn't fit here")); return; }
    moveItem(cur, t[0], t[1]); movingKey = null;
    setHint(ITEMS[cur.type].name + L(' przeniesione za darmo. Plotki o starym miejscu są już nieaktualne.', ' moved for free. Rumours about its old spot are now out of date.'));
  }
  function renderItem(card, m) {
    const it = fl.items.get(m.k);
    if (!it || fl.phase !== 'build') { card.appendChild(el('p', null, L('Tego elementu już tu nie ma.', 'This element is gone.'))); card.appendChild(btn('primary', L('Zamknij', 'Close'), null, closeModal)); return; }
    const T = ITEMS[it.type], lvl = it.lvl || 1, up = !!ACTIVE[it.type], tr = TRAITS[it.type], loot = isLoot(it.type);
    card.appendChild(el('div', 'sub', (BUILDINGS[it.type] ? L('Obiekt', 'Object') : MONSTERS[it.type] ? L('Potwór', 'Monster') : TRAPS[it.type] ? L('Pułapka', 'Trap') : loot ? (it.dropped ? L('Łup po bohaterze', 'Dropped by a hero') : L('Łup', 'Loot')) : 'Element') + (up ? L(' · poziom ' + lvl + ' z 3', ' · level ' + lvl + ' of 3') : '')));
    card.appendChild(el('h2', null, T.name + (lvl > 1 ? ' ' + 'I'.repeat(lvl) : '')));
    if (tagChips(it.type).length) { const tr0 = tagRow(it.type); tr0.classList.add('sheettags'); card.appendChild(tr0); }   // 1.27.6
    if (up) {   // what it did last wave: the quickest way to see what deserves an upgrade
      const s = (it.lf === undefined ? L('Nowy: jeszcze nie walczył.', 'New: has not fought yet.') : it.lf === 0 ? L('Ostatnia fala: ani razu nie zadziałał.', 'Last wave: never fired.') :
        L('Ostatnia fala: zadziałał ' + it.lf + '×, trafienia: ' + it.lh + ', Esencja: ' + it.lp + (it.lk ? ', zabici: ' + it.lk : '') + '.', 'Last wave: fired ' + it.lf + '×, ' + it.lh + ' hits, ' + it.lp + ' Essence' + (it.lk ? ', kills: ' + it.lk : '') + '.')) + healLine(it);   // 1.24 (C, addendum 2)
      card.appendChild(el('p', 'lead', s));
    }
    if (loot && it.dropped) {   // 1.20: whose things they are
      const who = it.fromNm ? { nm: it.fromNm, female: it.fromFem } : null;
      card.appendChild(el('p', 'lead', it.body != null && who ? L('Rzeczy poległego: ' + it.fromNm[0] + ' (fala ' + it.fromWave + '): ' + (it.gold ? it.gold + (it.gold === 1 ? ' moneta' : ' monet') : itemLabel(it.item)) + '. Następni mogą to zabrać.', 'A fallen hero\'s things: ' + it.fromNm[0] + ' (wave ' + it.fromWave + '): ' + (it.gold ? it.gold + (it.gold === 1 ? ' coin' : ' coins') : itemLabel(it.item)) + '. Others may take them.') :
        it.knocked != null && who ? L('Wybite bohaterowi ' + nameGen(who) + ' krytykiem: ' + itemLabel(it.item) + '.', 'Knocked from ' + nameGen(who) + ' by a crit: ' + itemLabel(it.item) + '.') :
        it.gold ? L('Sakwa poległego bohatera: ' + it.gold + (it.gold === 1 ? ' moneta.' : ' monet.'), 'A fallen hero\'s pouch: ' + it.gold + (it.gold === 1 ? ' coin.' : ' coins.')) : it.item ? L('Zostawił to bohater: ' + itemLabel(it.item) + '. Następni mogą to podnieść.', 'A hero left this: ' + itemLabel(it.item) + '. Others may pick it up.') : L('Zostawił to bohater.', 'A hero left this.')));
    }
    if (loot && it.item && it.item.cursed) card.appendChild(el('p', 'note', L('Przeklęty: klątwa przejdzie na tego, kto go weźmie.', 'Cursed: the curse passes to whoever takes it.')));
    if (it.type === 'mimic' && it.belly && it.belly.length) card.appendChild(el('p', 'note', L('W brzuchu: ' + it.belly.length + (it.belly.length === 1 ? ' przedmiot' : it.belly.length < 5 ? ' przedmioty' : ' przedmiotów') + ' (gryzie o ' + 10 * Math.min(6, it.belly.length) + '% mocniej). Wypluje je, gdy wysadzi go bomba albo rozbije topór.', 'In its belly: ' + it.belly.length + (it.belly.length === 1 ? ' item' : ' items') + ' (bites ' + 10 * Math.min(6, it.belly.length) + '% harder). It spits them out if a bomb blows it up or an axe smashes it.')));
    const r = roomOf(it.x, it.y), rt = rtOf(r);
    const d = el('details'); d.appendChild(el('summary', null, L('Opis', 'Description')));
    d.appendChild(el('p', null, T.desc));
    if (T.more) d.appendChild(el('p', 'note', T.more));   // 1.27: the details under the one-line description
    if (up) d.appendChild(el('p', 'note', L('Moc teraz: ', 'Power now: ') + (TRAPS[it.type] ? '×' + fmt2(LVL_POW[lvl]) : L('HP i siła ×', 'HP and strength ×') + fmt2(LVL_MON[lvl])) + '. ' + (lvl >= 3 && branchTrait(it) ? L('Cecha ', 'Trait ') + (it.branch || 'A') + ': ' + branchTrait(it)[0] + ' (' + branchTrait(it)[1] + ').' : tr ? L('Poziom 3 daje cechę do wyboru: A ', 'Level 3 adds a trait of your choice: A ') + tr[0] + ' (' + tr[1] + ')' + (TRAITS_B[it.type] ? L(' albo B ', ' or B ') + TRAITS_B[it.type][0] + ' (' + TRAITS_B[it.type][1] + ')' : '') + '.' : '') + L(' Ulepszenie nie zajmuje miejsca w pokoju. Wyższy poziom pułapki poszerza strefy skill checku.', ' Upgrades take no room space. A higher trap level widens the skill check zones.')));
    if (rt) d.appendChild(el('p', 'note', L('Pokój: ', 'Room: ') + RT_INFO[rt].name + '. ' + ITEMS[RT_INFO[rt].item].desc.replace(/^[^\s:]+ \([^)]*\): /, '').replace(/ (Stuknij znacznik pokoju|Tap the room marker)\.$/, '')));
    if (KIND_OF[it.type] && inKind(it)) d.appendChild(el('p', 'note', L('Komnata: ', 'Lair: ') + KIND_INFO[KIND_OF[it.type]].name + '. ' + (lvl >= 3 ? L('Ma już 3. poziom, więc komnata daje mu +', 'Already level 3, so the lair gives it +') + Math.round((KIND_POW - 1) * 100) + L('% mocy.', '% power.') : L('Cecha 3. poziomu działa bez ulepszania', 'Its level 3 trait works without upgrading') + (tr ? ': ' + tr[0] + ' (' + tr[1] + ')' : '') + '.')));
    else if (KIND_OF[it.type]) d.appendChild(el('p', 'note', L('Pasuje do komnaty: ' + KIND_INFO[KIND_OF[it.type]].name + ' (zakładka Loch, Komnaty). Tam ma cechę 3. poziomu bez ulepszania.', 'Fits a lair: ' + KIND_INFO[KIND_OF[it.type]].name + ' (Dungeon tab, Lairs). There it gets its level 3 trait without upgrading.')));
    if (it.dropped) d.appendChild(el('p', 'note', L('Łup po bohaterach nic Cię nie kosztował, więc zdjęcie nic nie zwraca. Możesz go przenieść.', 'Dropped loot cost you nothing, so removing it refunds nothing. You can move it.')));
    if (it.lf === undefined || !up) d.open = true;
    card.appendChild(d);
    const row = el('div', 'row');
    if (up && lvl < 3) {
      const c = upgCost(it), next = lvl + 1;
      const ub = btn('primary', L('Ulepsz → ', 'Upgrade → ') + next, c + L(' Esencji · ', ' Essence · ') + (next === 3 && tr ? (TRAITS_B[it.type] ? L('cecha A albo B', 'trait A or B') : L('cecha: ', 'trait: ') + tr[0]) : L('moc ×', 'power ×') + fmt2(TRAPS[it.type] ? LVL_POW[next] : LVL_MON[next])), () => {
        if (lvl === 2 && TRAITS_B[it.type]) { closeModal(); openModal({ type: 'branch', k: m.k, back: m }); return; }   // 1.26
        if (upgradeItem(it)) { card.innerHTML = ''; renderItem(card, m); setHint(T.name + L(': poziom ', ': level ') + it.lvl + '.'); }
      });
      ub.id = 'sheet-upgrade';
      if (fl.essence < c) { ub.disabled = true; ub.querySelector('span').textContent = c + L(' Esencji (masz ' + Math.floor(fl.essence) + ')', ' Essence (you have ' + Math.floor(fl.essence) + ')'); }
      row.appendChild(ub);
      const all = sameInRoom(it);   // 1.27.5: all of this kind in the room
      if (all.length >= 2) {
        const ca = upgradeAllCost(all), arow = el('div', 'row');
        const ab = btn('', L('Ulepsz wszystkie w pokoju', 'Upgrade all in this room'), all.length + ' × → ' + next + ' · ' + ca + L(' Esencji', ' Essence'), () => {
          if (lvl === 2 && TRAITS_B[it.type]) { closeModal(); openModal({ type: 'branch', k: m.k, back: m, all: true }); return; }
          const n = upgradeAll(it); if (n) { card.innerHTML = ''; renderItem(card, m); setHint(T.name + L(': ulepszone ' + n + ', poziom ', ': ' + n + ' upgraded, level ') + next + '.'); }
        });
        ab.id = 'sheet-upgrade-all'; if (fl.essence < ca) { ab.disabled = true; ab.querySelector('span').textContent = all.length + ' × · ' + ca + L(' Esencji (masz ' + Math.floor(fl.essence) + ')', ' Essence (you have ' + Math.floor(fl.essence) + ')'); }
        arow.appendChild(ab); card.appendChild(arow);
      }
    }
    const mb = btn('', L('Przenieś', 'Move'), L('za darmo, poziom zostaje', 'free, keeps level'), () => { closeModal(); pickUp(it); });
    mb.id = 'sheet-move'; row.appendChild(mb);
    const back = it.spent != null ? it.spent : T.cost;
    const rb = btn('', L('Zdejmij', 'Remove'), back ? '+' + back + L(' Esencji', ' Essence') : L('bez zwrotu', 'no refund'), () => { const got = removeItem(it); closeModal(); setHint(T.name + L(' zdjęte', ' removed') + (got ? ' (+' + got + L(' Esencji).', ' Essence).') : '.')); });
    rb.id = 'sheet-remove'; row.appendChild(rb);
    card.appendChild(row);
    card.appendChild(btn('', L('Zamknij', 'Close'), null, closeModal));
  }
  // 1.26: the level 3 choice: two traits side by side (A is the one a komnata gives free)
  function renderBranch(card, m) {
    const it = fl.items.get(m.k); if (!it || fl.phase !== 'build' || (it.lvl || 1) !== 2) { card.appendChild(el('p', null, L('Tego już nie ulepszysz.', "You can't upgrade this any more."))); card.appendChild(btn('primary', L('Zamknij', 'Close'), null, closeModal)); return; }
    const all = m.all ? sameInRoom(it) : null, many = all && all.length >= 2;   // 1.27.5: one choice for all of them in the room
    const T = ITEMS[it.type], A = TRAITS[it.type], B = TRAITS_B[it.type], c = many ? upgradeAllCost(all) : upgCost(it), poor = fl.essence < c, kind = KIND_OF[it.type] && inKind(it);
    card.appendChild(el('div', 'sub', T.name + (many ? ' × ' + all.length : '') + L(' · poziom 3 · ', ' · level 3 · ') + c + L(' Esencji', ' Essence')));
    card.appendChild(el('h2', null, L('Wybierz cechę', 'Pick a trait')));
    card.appendChild(el('p', 'note', L('Moc rośnie tak samo, różni się tylko cecha. Wyboru nie cofniesz (chyba że zdejmiesz element).', "Power grows the same way, only the trait differs. You can't undo the choice (unless you remove the element).") + (kind ? L(' Komnata i tak daje mu cechę A: wybierz B, a będzie miał obie.', ' Its lair already gives it trait A: pick B and it gets both.') : '')));
    const box = el('div', 'choices branch');
    [['A', A], ['B', B]].forEach(([k, t]) => { if (!t) return; const b = btn(k === 'B' ? 'gold' : '', k + ': ' + t[0], t[1], () => { if (many ? upgradeAll(it, k) : upgradeItem(it, k)) { closeModal(); setHint(T.name + L(': poziom 3, ', ': level 3, ') + t[0] + '.'); if (m.back) openModal(m.back); } }); b.id = 'branch-' + k; b.disabled = poor; box.appendChild(b); });
    card.appendChild(box);
    card.appendChild(btn('primary', poor ? L('Za mało Esencji (', 'Not enough Essence (') + c + ')' : L('Anuluj', 'Cancel'), null, () => { closeModal(); if (m.back) openModal(m.back); }));
  }
  // v14: the full card of a hero: tap him in a wave (the game pauses), or tap a row of the party list / the next-wave list
  const TRAIT_TEXT = L({ greedy: 'idzie po łup mimo ryzyka', coward: 'panikuje wcześniej, śmierć towarzysza straszy go mocniej', brave: 'śmierć towarzysza zamienia w furię', careful: 'sprawdza podłogę, rzadziej wpada w pułapki',
    superstitious: 'rekwizyty strachu i Nawiedzenie straszą go 1,4 raza mocniej, nie tknie przeklętego łupu, nie wejdzie pierwszy do pokoju z portretem albo lustrem', curious: 'widzi łup z daleka (+4 pola), idzie sprawdzić usłyszaną pułapkę, dwa razy dokładniej przeszukuje meble, jako przywódca chętniej się rozgląda', loyal: 'zawsze ratuje uwięzionych, biegnie na wołanie o pomoc nawet przez pułapki, za przyjaciela ślubuje zemstę', hothead: 'szarżuje na każdego potwora w pokoju (także na ogra), częściej idzie przez znane pułapki, raz na falę zamiast paniki wpada w furię, wytrzymuje 10% więcej strachu' },
    { greedy: 'goes for loot despite the risk', coward: "panics sooner, a friend's death scares them more", brave: "turns a friend's death into fury", careful: 'checks the floor, falls into traps less often',
    superstitious: "scare props and Haunting scare them 1.4× more, won't touch cursed loot, won't enter a room with a portrait or mirror first", curious: 'sees loot from afar (+4 tiles), checks out traps they hear, searches furniture twice as well, looks around more as leader', loyal: 'always frees the trapped, runs to calls for help even through traps, vows revenge for a friend', hothead: 'charges every monster in the room (even an ogre), walks through known traps more often, once a wave flies into a rage instead of panicking, takes 10% more fear' });   // 1.26
  const STATE_TEXT = L({ drink: 'pije Esencję z serca', walk: 'idzie', rest: 'odpoczywa', talk: 'naradza się', wait: 'czeka', boss: 'wyważa kryształ', disarm: 'rozbraja', free: 'uwalnia kogoś', fight: 'walczy', smash: 'rozbija' },
    { drink: 'drinks Essence from the heart', walk: 'walking', rest: 'resting', talk: 'conferring', wait: 'waiting', boss: 'prying a crystal loose', disarm: 'disarming', free: 'freeing someone', fight: 'fighting', smash: 'smashing' });
  // v15.1: a tap on the equation row: what each part means, and where this wave's Esencja came from
  function renderEsencja(card, m) {
    const raid = fl.phase === 'raid', s = fl.stats, cm = 1 + 0.25 * (comboNow() - 1);
    card.appendChild(el('div', 'sub', raid ? waveName() + L(' · fala trwa', ' · wave on') : waveName() + L(' · budowa', ' · building')));
    card.appendChild(el('h2', null, L('Skąd Esencja', 'Where Essence comes from')));
    card.appendChild(el('p', null, L('Esencja = Groza × Chciwość × Combo. Póki trwa combo, Groza się zbiera (linia u góry). Gdy combo się skończy, cała seria wypłaca się z końcowym mnożnikiem combo. Od fali 2 serce bierze pierwsze porcje Esencji z każdej fali, reszta jest Twoja.', "Essence = Dread × Greed × Combo. While a combo lasts, Dread builds up (the line at the top). When it ends, the whole streak pays out at the final combo. From wave 2 the heart takes the first share of each wave's Essence, the rest is yours.")));
    card.appendChild(el('h2', 'h2small', L('Groza: co przeżywają bohaterowie', 'Dread: what the heroes go through')));
    card.appendChild(el('p', 'note', L('To nie mnożnik, tylko suma zdarzeń. Każde liczy się względem bohatera, razy mnożnik pokoju (liczba w rogu pokoju: ×1 przy wejściu, do ×', "Not a multiplier: a sum of events. Each is scaled to the hero and multiplied by the room's depth (the number in its corner: ×1 at the entrance, up to ×") + fmtE(S.depthMax) + L(' przy sercu).', ' by the heart).')));
    const gt = el('table', 'stats');
    [[L('Rany (pułapki, łup)', 'Wounds (traps, loot)'), L('całe HP bohatera = ', "a hero's full HP = ") + fmtE(GZ.dmg)], [L('Rany od potworów walczących same', 'Wounds from monsters fighting alone'), L('całe HP = ', 'full HP = ') + fmt2(GZ.dmg * MON_FACTOR)], [L('Strach', 'Fear'), L('pełny pasek = ', 'full bar = ') + fmtE(GZ.fear)], [L('Ucieczka ze strachu', 'Fleeing in fear'), fmtE(GZ.scare) + L(' (boss 2 razy tyle)', ' (boss ×2)')],
     [L('Śmierć bohatera', 'Hero death'), fmtE(GZ.kill) + L(' (boss 2 razy tyle)', ' (boss ×2)')], [L('Zgubiony / samotny / na zwiadzie', 'Lost / alone / scouting'), fmt2(GZ.lost) + ' / ' + fmt2(GZ.alone) + ' / ' + fmt2(GZ.split) + L(' na sekundę', ' per second')], [L('Zabrany łup', 'Loot taken'), fmt2(GZ.loot) + L(' × rzadkość', ' × rarity')], [L('Leczenie kapłana', 'Priest healing'), fmt2(GZ.heal) + L(' za całe HP', ' per full HP')],
     [L('Sieć / klatka', 'Web / cage'), fmt2(GZ.web) + ' / ' + fmt2(GZ.cage)], [L('Odzyskany kryształ', 'Crystal recovered'), fmtE(GZ.crystal)]]
      .forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, r[1])); gt.appendChild(tr); });
    card.appendChild(gt);
    card.appendChild(el('h2', 'h2small', L('Chciwość ×', 'Greed ×') + fmt2(raid ? fl.greed : greedStartNow()) + (raid ? '' : L(' na start', ' at start'))));
    const gb = greedBonusParts();
    card.appendChild(el('p', 'note', L('Rośnie, gdy bohaterowie zobaczą łup (droższy łup daje więcej). Stałe dodatki: ', 'Grows when heroes see loot (pricier loot gives more). Permanent bonuses: ') + (gb.length ? gb.map(p => p[0] + ' +' + fmt2(p[1])).join(', ') : L('na razie brak', 'none yet')) + (run.greedKeep > 0.001 ? L(', zabrany łup +', ', loot taken +') + fmt2(run.greedKeep) : '') + L('. Im większa chciwość, tym wolniej rośnie (dodatki są podane przed tym spowolnieniem).', '. The higher your greed, the slower it grows (bonuses are shown before that slowdown).')));
    card.appendChild(el('h2', 'h2small', 'Combo ×' + fmt2(raid ? cm : 1)));
    { const cw = fmt2(S.comboWin).replace(/[.,]00$/, '').replace(/0$/, ''), p1 = Math.round(COMBO_POW * 100), p6 = Math.round(COMBO_POW * 600);
    card.appendChild(el('p', 'note', L('Różne pułapki pod rząd w ciągu ' + cw + ' s (w Zębatkach liczy się też ta sama, w Grocie okno jest 1,5 raza dłuższe): +0,25 za stopień, najwyżej ×2,5. Końcowe combo mnoży całą Grozę serii. Każdy stopień wzmacnia też rany i strach od pułapek o ' + p1 + '% (przy ×2,5 o ' + p6 + '%). Opłaca się więc stawiać różne pułapki blisko siebie.', "Different traps in a row within " + cw + ' s (in Gears the same one counts too, in a Grotto the window is 1.5× longer): +0.25 per step, up to ×2.5. The final combo multiplies the whole streak\'s Dread. Each step also boosts trap wounds and fear by ' + p1 + '% (at ×2.5 by ' + p6 + '%), so it pays to group different traps close together.') + (mods.regen !== 1 ? L(' Żyła esencji mnoży jeszcze ×', ' Essence Vein multiplies by another ×') + fmt2(mods.regen) + '.' : ''))); }
    if (raid || fl.phase === 'summary') {
      card.appendChild(el('h2', 'h2small', L('W tej fali', 'This wave')));
      const pt = el('table', 'stats');
      [[L('Rany', 'Wounds'), s.dmgPts], [L('Strach', 'Fear'), s.fearPts], [L('Ucieczki ze strachu (', 'Fled in fear (') + s.scared + ')', s.scarePts], [L('Zabici (', 'Kills (') + s.kills + ')', s.killPts], [L('Łup', 'Loot'), s.lootPts], [L('Kryształ odzyskany', 'Crystal recovered'), s.crystalPts], [L('Zgubieni i samotni', 'Lost and alone'), (s.lostPts || 0) + (s.lonePts || 0)], [L('Zwiad (celowo osobno)', 'Scouting (split on purpose)'), s.splitPts || 0], [L('Leczenie kapłana', 'Priest healing'), s.healPts], [L('Combo wstecz', 'Combo (retroactive)'), s.comboPts || 0]]
        .filter(r => r[1] > 0).forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, fmtE(r[1]) + L(' Esencji', ' Essence'))); pt.appendChild(tr); });
      [[L('Groza razem', 'Total Dread'), fmtE(fl.base)], [L('Średnio na punkt Grozy', 'Average per Dread point'), '×' + fmt2(fl.base > 0 ? fl.score / fl.base : 1)], [L('= Esencja z fali', '= Essence this wave'), fmtE(fl.score)]].forEach(r => { const tr = el('tr', 'sum'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, r[1])); pt.appendChild(tr); });
      card.appendChild(pt);
    }
    card.appendChild(btn('primary', L('Zamknij', 'Close'), null, () => { closeModal(); if (m.unpause) setPaused(false); }));
  }
  function renderHero(card, m) {
    tutFlags.heroCard = true;
    const live = m.id != null ? fl.heroes[m.id] : null, e = live ? live.entry : m.entry;
    if (!e) { card.appendChild(el('p', null, L('Tego bohatera już nie ma.', 'This hero is gone.'))); card.appendChild(btn('primary', L('Zamknij', 'Close'), null, () => { closeModal(); if (m.unpause) setPaused(false); })); return; }
    const h = live || e, T = HEROES[e.type], R = levelStats(e.lvl), fem = e.female, known = live ? live.known : new Set(e.known || []);
    const all = mods.revealAll;
    card.appendChild(el('div', 'sub', T.name[fem ? 1 : 0] + L(' · poz. ', ' · lvl ') + e.lvl + ' ' + (e.boss ? BOSS_NAME[e.boss][fem ? 1 : 0] : R.name[fem ? 1 : 0]).toLowerCase() + [e.returning ? (e.nemesis ? L(' · nemezis', ' · nemesis') : L(fem ? ' · powracająca' : ' · powracający', ' · returning')) : '', e.hunter ? L(fem ? ' · łowczyni skarbów' : ' · łowca skarbów', ' · treasure hunter') : '', e.recruit ? L(' · rekrut', ' · recruit') : ''].join('')));
    const hh = el('h2', null, nemName(e)); hh.style.color = T.color; card.appendChild(hh);   // 1.23: with his title
    const tiles = el('div', 'statrow');
    statTile(tiles, Math.round(live ? live.hp : e.hp) + '/' + e.max, 'HP', live && live.hp < 0.35 * e.max ? 'bad' : '');
    const cou = live ? live.courage : e.courage;
    statTile(tiles, live ? Math.round(100 * live.fear / cou) + '%' : '0%', L('strach · odwaga ', 'fear · courage ') + Math.round(cou), live && live.fear > 0.6 * cou ? 'bad' : '');
    if (e.type === 'priest' && live) statTile(tiles, live.faith + '/' + live.faithMax, L('wiara', 'faith'));
    else statTile(tiles, String((live ? live.inv : e.inv).length), L('przedmioty', 'items'));
    card.appendChild(tiles);
    const ul = el('ul', 'conseq');
    const add = t => { if (t) ul.appendChild(el('li', null, t)); };
    if (live) {
      const st = live.dead ? L(fem ? 'Zginęła.' : 'Zginął.', 'Dead.') : live.fled ? (live.carriedOut ? L((fem ? 'Wyniosła' : 'Wyniósł') + ' kryształ.', 'Carried out a crystal.') : live.fleeing ? L((fem ? 'Uciekła' : 'Uciekł') + ' ze strachu.', 'Fled in fear.') : L((fem ? 'Wyszła' : 'Wyszedł') + ' z lochu.', 'Left the dungeon.')) :
        [live.fleeing ? L('UCIEKA', 'FLEEING') : '', live.crystal ? L('NIESIE KRYSZTAŁ', 'CARRYING A CRYSTAL') : '', caged(live) ? L('w klatce', 'caged') : '', live.lost ? L(fem ? 'zgubiona' : 'zgubiony', 'lost') : live.goHome ? L(live.female ? 'wraca sama do domu' : 'wraca sam do domu', 'going home alone') : inG2(live) ? (fl.party.g2.leaderId === live.id ? L('prowadzi drugą grupę', 'leads the second group') : L('w drugiej grupie', 'in the second group')) : live.split ? L('na zwiadzie', 'scouting') : live.look && !live.look.done ? L('rozgląda się', 'looking around') : live.alone ? L(fem ? 'sama' : 'sam', 'alone') : '', fl.time < live.burnUntil ? (live.burnBy === 'spikes' ? L('krwawi', 'bleeding') : L('płonie', 'burning')) : '', live.cursed ? L(fem ? 'przeklęta' : 'przeklęty', 'cursed') : '', fl.time < live.shakenUntil ? L(fem ? 'wstrząśnięta śmiercią' : 'wstrząśnięty śmiercią', 'shaken by a death') : '', STATE_TEXT[live.state] || ''].filter(Boolean).join(', ');
      add(L('Teraz: ', 'Now: ') + st + '.');
      if (!live.dead && !live.fled) { const sl = statusList(live); if (sl.length) add(L('Statusy: ', 'Statuses: ') + sl.map(k => STATUS[k].name + ' (' + STATUS[k].desc + ')').join('; ') + '.'); }   // 1.26 (7)
      if (live.type === 'cultist' && live.drank > 0) add(L('Wypił' + (fem ? 'a' : '') + ' z serca ' + fmtE(live.drank) + ' Esencji (' + (fem ? 'zabita' : 'zabity') + ' odda połowę).', 'Drank ' + fmtE(live.drank) + ' Essence from the heart (gives back half if killed).'));
    }
    add(L('Charakter: ', 'Character: ') + (e.trait ? HERO_TRAITS[e.trait].name[fem ? 1 : 0] + ' (' + TRAIT_TEXT[e.trait] + ')' : L(fem ? 'zwyczajna' : 'zwyczajny', 'ordinary')) + '.');
    { const bm = bondMate(e, live); if (bm) add(bondLabel(e.bond, bm) + (bm.dead ? L(bm.female ? ' (zginęła)' : ' (zginął)', ' (dead)') : '') + '.'); }   // 1.21: his bond
    add(L('Umie: ', 'Skills: ') + CLASS_SKILL[e.type] + '.');
    add(L('Klasa: ', 'Class: ') + CLASS_RES_TEXT[e.type] + '.');
    if (e.hunter) add(L((fem ? 'Łowczyni' : 'Łowca') + ' skarbów: idzie po łup, nawet gdy to groźne (znak sakiewki).', 'Treasure hunter: goes for loot even when it is dangerous (bag icon).'));
    add(L('Ciało: ', 'Body: ') + (e.phys && (known.has('phys') || all) ? PHYS[e.phys].name[fem ? 1 : 0] + ' (' + PHYS[e.phys].text + ')' : L('nie wiadomo', 'unknown')) + '.');
    add(L('Fobia: ', 'Phobia: ') + (e.phobia && (known.has('phobia') || all) ? PHOBIAS[e.phobia].name + L(' (straszy 2 razy mocniej)', ' (scares 2× more)') : L('nie wiadomo', 'unknown')) + '.');
    if (e.scar) add(L('Blizna: ', 'Scar: ') + e.scar + (e.times > 1 && !e.nemesis ? L(' (wraca już po raz ' + e.times + '.)', ' (back for the ' + ordEn(e.times) + ' time)') : '') + '.');
    if (e.nemesis) {   // 1.23: what makes him a Nemezis
      const g = e.nemesis.grudge;
      add(L('Nemezis: wraca ' + (e.times || 1) + '. raz (od fali ' + e.nemesis.since + '). Zna pokoje, w których był' + (fem ? 'a' : '') + ', i nie ucieka ze strachu, póki ma ponad 15% życia.', 'Nemesis: back for the ' + ordEn(e.times || 1) + ' time (since wave ' + e.nemesis.since + '). Knows the rooms they have seen and won\'t flee in fear above 15% HP.'));
      if (g && ITEMS[g.type]) add(L('Uraza: ', 'Grudge: ') + ITEMS[g.type].name + (g.x != null ? '' : L(' (gdziekolwiek)', ' (anywhere)')) + '.');
      add(L('Nagroda za głowę: ', 'Bounty: ') + bountyOf(e) + L(' Esencji', ' Essence') + (e.bountyPaid ? L(' (wypłacona)', ' (paid)') : '') + '.');
    }
    { const n = live ? (live.tdFalls || 0) : 0, cap = tdCap(h); if (n || [...fl.items.values()].some(it => it.type === 'trapdoor')) add(L('Zapadnie: ', 'Trapdoors: ') + n + '/' + cap + (n >= cap ? L(fem ? ' (już jej nie grożą)' : ' (już mu nie grożą)', ' (no longer a threat)') : cap === 1 ? L(' (elita albo poz. 12+: spada raz)', ' (elite or lvl 12+: falls only once)') : '') + '.'); }   // 1.24
    if (live && live.trauma && Object.keys(live.trauma).length) add(L('Trauma w tej fali: ', 'Trauma this wave: ') + Object.keys(live.trauma).map(k => DMG_TYPES[k]).join(', ') + L(' (straszy 1,5 raza mocniej).', ' (scares 1.5× more).'));
    card.appendChild(ul);
    card.appendChild(el('h2', 'h2small', L('Ekwipunek', 'Gear')));
    const inv = live ? live.inv : e.inv, il = el('ul', 'conseq');
    if (!inv.length) il.appendChild(el('li', null, L('Nic przy sobie.', 'Carries nothing.')));
    inv.forEach(it => { const H = HITEMS[it.type]; const cd = live && fl.time < (it.cdUntil || 0) ? L(', odnowienie ', ', cooldown ') + Math.ceil(it.cdUntil - fl.time) + ' s' : '';
      const nm = H.tool ? capFirst(H.name) + (live && it.type === 'lantern' && fl.time < (it.outUntil || 0) ? L(' (zgaszona)', ' (out)') : '') : capFirst(adj(H.g, it.r) + ' ' + H.name) + L(' (moc ', ' (power ') + it.r + (it.charges != null ? L(', użycia: ', ', uses: ') + it.charges : '') + cd + ')';
      il.appendChild(el('li', null, nm + srcText(it, h) + (it.cursed ? L(', przeklęty', ', cursed') : ''))); });   // 1.20: where it comes from
    if (live && live.gold) il.appendChild(el('li', null, L('Sakwa: ' + live.gold + ' ' + plural(live.gold, 'moneta', 'monety', 'monet') + ' (spowalnia).', 'Pouch: ' + live.gold + (live.gold === 1 ? ' coin' : ' coins') + ' (slows them down).')));
    { const ld = loadOf(h), cy = carryOf(h), f1 = v => dec(v.toFixed(1)); il.appendChild(el('li', null, L('Ciężar: ', 'Load: ') + f1(ld) + ' / ' + f1(cy) + ' kg' + (burden(h) < 1 ? L(' (zwalnia)', ' (slowed)') : '') + '.')); }   // 1.20 Udźwig
    if (live && live.fled && !live.dead && (live.loot || live.gold)) il.appendChild(el('li', null, L((fem ? 'Zabrała' : 'Zabrał') + ' z lochu: ' + (live.loot || 0) + ' łupu, ' + (live.gold || 0) + ' monet.', 'Took from the dungeon: ' + (live.loot || 0) + ' loot, ' + (live.gold || 0) + ' coins.')));
    card.appendChild(il);
    if (live && !live.queued) {
      const db = Object.entries(live.dmgBy || {}).filter(x => x[1] >= 1).map(x => DMG_TYPES[x[0]] + ' ' + Math.round(x[1])).join(', ');
      const fb = Object.entries(live.fearBy || {}).filter(x => x[1] >= 1).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => fearSrcName(x[0]) + ' ' + Math.round(x[1])).join(', ');
      const sw = sawNames(live);   // 1.17.1: what he has seen (what he can talk about)
      if (db || fb || sw) { const dl = el('ul', 'conseq'); if (db) dl.appendChild(el('li', null, L('Rany w tej fali: ', 'Wounds this wave: ') + db + '.')); if (fb) dl.appendChild(el('li', null, L('Strach w tej fali: ', 'Fear this wave: ') + fb + '.')); if (sw) dl.appendChild(el('li', null, L((fem ? 'Widziała' : 'Widział') + ' w tej fali: ', 'Saw this wave: ') + sw + '.')); card.appendChild(el('h2', 'h2small', L('Ta fala', 'This wave'))); card.appendChild(dl); }
    }
    card.appendChild(el('p', 'note', L('Ciało i fobię poznajesz, gdy się zdradzą (dymek), z plotek z karczmy albo gdy bohater wraca z blizną.', 'You learn body and phobia when they show (speech bubble), from tavern rumours, or when a hero comes back with a scar.')));
    card.appendChild(btn('primary', m.back ? L('Wróć', 'Back') : L('Zamknij', 'Close'), null, () => { closeModal(); if (m.back) { openModal(m.back); $('#card').classList.remove('enter'); } else if (m.unpause) setPaused(false); }));
  }
  // v14: the first hungry wave explains itself once
  function renderHungerTip(card) {
    card.appendChild(el('div', 'sub', L('Fala 2', 'Wave 2')));
    card.appendChild(el('h2', null, L('Serce jest głodne', 'The heart is hungry')));
    card.appendChild(el('p', 'lead', L('Od tej fali serce zjada pierwsze porcje Esencji z każdej fali, aż się naje: teraz ' + hungerNeed(run.wave) + ', potem coraz więcej. Reszta jest Twoja.', "From now on the heart eats the first share of every wave's Essence until it is full: " + hungerNeed(run.wave) + ' now, more later. The rest is yours.')));
    const ul = el('ul', 'conseq');
    L(['Pasek ♥ u góry napełnia się w trakcie fali. Pełny pasek: serce jest syte.',
     'Fala dała za mało? Serce weźmie brak z Twojej sakiewki. Kryształ pęka dopiero wtedy, gdy sakiewka nie wystarczy.',
     'Zostawiaj więc trochę Esencji na następną falę. Stuknij serce u góry, żeby zobaczyć, ile chce.'],
     ['The ♥ bar at the top fills during the wave. When the bar is full, so is the heart.',
     "Did the wave bring too little? The heart takes the rest from your purse. A crystal breaks only if your purse can't cover it.",
     'So keep some Essence for the next wave. Tap the heart at the top to see how much it wants.']).forEach(t => ul.appendChild(el('li', null, t)));
    card.appendChild(ul);
    card.appendChild(btn('primary', L('Rozumiem', 'Got it'), null, closeModal));
  }
  // The breach, tapped between waves: what it means and the patch.
  function renderBreach(card, m) {
    const B = run.layout.breach;
    if (!B || !fl.breach || fl.phase !== 'build') { card.appendChild(el('p', null, L('Wyłomu już nie ma.', 'The breach is gone.'))); card.appendChild(btn('primary', L('Zamknij', 'Close'), null, closeModal)); return; }
    // 1.01: the camera goes to the breach and leaves it in view under this sheet (about two thirds down the map), with a pulse
    centerOn(fl.breach.x + 0.5, fl.breach.y + 0.5); cam.oy -= ch * 0.18; clampCam(); fl.breachPing = realNow;
    card.appendChild(el('div', 'sub', L('Wyłom', 'Breach') + (B.born ? L(' · od fali ', ' · since wave ') + B.born : '') + L(' · na mapie poniżej', ' · on the map below')));
    card.appendChild(el('h2', null, m && m.fresh ? L('Nowy wyłom!', 'New breach!') : L('Wyłom w ścianie', 'A breach in the wall')));
    card.appendChild(el('p', 'lead', B.fresh ? L('Gildia przebiła tunel do tego pokoju (czerwone kółko). Ta fala wejdzie właśnie tędy.', 'The guild dug a tunnel into this room (red circle). This wave comes in right here.') : L('Tunel gildii wciąż jest otwarty. Każda fala wybiera wyłom albo drzwi, zwykle tę drogę, na której według plotek jest mniej pułapek.', 'The guild tunnel is still open. Each wave picks the breach or the door, usually the way rumoured to have fewer traps.')));
    card.appendChild(el('p', 'note', L('Przez wyłom bohaterowie omijają część lochu. Załatany znika na dobre (Bastion chroni pokój przed nowym).', 'Through the breach heroes skip part of your dungeon. Once patched, it is gone for good (Bastion protects a room from new ones).')));
    const row = el('div', 'row');
    const pb = btn('primary', L('Załataj', 'Patch it'), BREACH_PATCH + L(' Esencji', ' Essence'), () => { if (patchBreach()) { closeModal(); setHint(L('Wyłom załatany. Gildia może przebić nowy w kolejnych falach (Bastion chroni pokój).', 'Breach patched. The guild may dig a new one later (Bastion protects a room).')); } });
    pb.id = 'sheet-patch';
    if (fl.essence < BREACH_PATCH) { pb.disabled = true; pb.querySelector('span').textContent = BREACH_PATCH + L(' Esencji (masz ' + Math.floor(fl.essence) + ')', ' Essence (you have ' + Math.floor(fl.essence) + ')'); }
    row.appendChild(pb); row.appendChild(btn('', L('Zostaw', 'Leave it'), L('niech wybierają', 'let them choose'), closeModal));
    card.appendChild(row);
  }
  // A card from the deck tab: read it, or sell it between waves.
  function renderCard(card, m) {
    const id = run.deck[m.idx], u = UPG[id];
    if (!u) { card.appendChild(el('p', null, L('Tej karty już nie ma.', 'This card is gone.'))); card.appendChild(btn('primary', L('Zamknij', 'Close'), null, closeModal)); return; }
    const n = run.deck.filter(x => x === id).length, fz = isFused(id);
    card.appendChild(el('div', 'sub', capFirst(RAR_NAME[u.rar]) + L(' karta', ' card') + (fz ? L(' · połączona', ' · fused') : '') + (isGift(id) ? L(' · ♥ Dar serca, bez miejsca w talii', " · ♥ Heart's Gift, no deck slot") : L(' · talia ', ' · deck ') + deckUsed() + L(' z ', '/') + run.deckSize)));
    { const ca = ART.cardImg(id, true); if (ca) card.appendChild(ca); }   // 1.26: the card's picture, twice as big
    const h = el('h2', null, cardName(id)); h.style.color = fz ? '#f2c94c' : RAR_COLOR[u.rar]; card.appendChild(h);   // 1.24: a fused ★ card is golden
    card.appendChild(el('p', null, u.text));
    if (fz) card.appendChild(el('p', 'fuseline', fuseText(u)));   // 1.24
    if (n > 1) card.appendChild(el('p', 'note', L('Masz ' + n + ' kopie tej karty. Działają razem.', 'You have ' + n + ' copies of this card. They work together.')));
    if (u.grows) card.appendChild(el('p', 'note', L('Zebrane w tym runie: ' + (run.stacks[u.id] || 0) + '. Sprzedaż ostatniej kopii zeruje licznik.', 'Collected this run: ' + (run.stacks[u.id] || 0) + '. Selling the last copy resets it.')));
    if (id === 'copyist' || id === 'soulmirror') { const t = copyTarget(id); card.appendChild(el('p', 'note', t ? L('Teraz kopiuje: ', 'Now copying: ') + cardName(t) + '.' : L('Teraz nic nie kopiuje: ' + (id === 'copyist' ? 'po prawej' : 'na pierwszym miejscu') + ' nie ma karty, którą może skopiować.', 'Copying nothing now: ' + (id === 'copyist' ? 'the card to its right' : 'the first card') + ' cannot be copied.'))); }
    // 1.26: the order of the deck matters for Kopista and Lustro duszy: move a card left or right (between waves)
    const nOrd = deckUsed();   // 1.27.5: moving only among the ordinary cards (the gift cards stay at the end)
    if (fl && fl.phase === 'build' && !isGift(id) && run.deck.some(x => x === 'copyist' || x === 'soulmirror') && nOrd > 1) {
      const mv = el('div', 'row'), go = d => { const j = m.idx + d; if (j < 0 || j >= nOrd) return; const a = run.deck[m.idx]; run.deck[m.idx] = run.deck[j]; run.deck[j] = a; recomputeMods(); saveRunSoon(); openModal({ type: 'card', idx: j }); };
      const lb = btn('', L('◀ W lewo', '◀ Left'), L('miejsce ', 'slot ') + m.idx + L(' z ', ' of ') + nOrd, () => go(-1)); lb.id = 'card-left'; if (m.idx === 0) lb.disabled = true;
      const rb = btn('', L('W prawo ▶', 'Right ▶'), L('miejsce ', 'slot ') + (m.idx + 2) + L(' z ', ' of ') + nOrd, () => go(1)); rb.id = 'card-right'; if (m.idx >= nOrd - 1) rb.disabled = true;
      mv.appendChild(lb); mv.appendChild(rb); card.appendChild(el('p', 'note', L('Kolejność ma znaczenie dla Kopisty i Lustra duszy.', 'The order matters for Copyist and Soul Mirror.'))); card.appendChild(mv);
    }
    const row = el('div', 'row');
    if (fl && fl.phase === 'build') {
      const tb = btn('', L('Do schowka', 'To stash'), isGift(id) ? L('Dar serca zostaje w talii', "a Heart's Gift stays in the deck") : run.stash && run.stash.length >= stashCap() ? L('schowek pełny', 'stash full') : L('czeka, nie działa', 'waits, does nothing'), () => { if (toStash(m.idx)) { closeModal(); setHint(u.name + L(': w schowku.', ': in the stash.')); } });
      if ((run.stash || []).length >= stashCap() || isGift(id)) tb.disabled = true; row.appendChild(tb);
      const sb = btn('', L('Sprzedaj', 'Sell'), '+' + sellFor(id) + L(' Esencji, karta przestanie działać', ' Essence, the card stops working'), () => {   // 1.24: sellFor
        if (!sb.dataset.sure) { sb.dataset.sure = '1'; sb.querySelector('b').textContent = L('Na pewno? Stuknij jeszcze raz', 'Sure? Tap again'); return; }
        const got = sellCard(m.idx); closeModal(); setHint(L('Sprzedane: ', 'Sold: ') + u.name + ' (+' + got + L(' Esencji).', ' Essence).'));
      });
      sb.id = 'card-sell'; row.appendChild(sb);
    } else card.appendChild(el('p', 'note', L('Karty sprzedajesz tylko między falami.', 'You can sell cards only between waves.')));
    row.appendChild(btn('primary', L('Zamknij', 'Close'), null, closeModal));
    card.appendChild(row);
  }
  const fate = h => h.dead ? L(h.female ? 'zginęła' : 'zginął', 'died') : h.carriedOut ? L(h.female ? 'wyniosła kryształ' : 'wyniósł kryształ', 'took a crystal') : h.fled ? (h.fleeing ? L(h.female ? 'uciekła ze strachu' : 'uciekł ze strachu', 'fled in fear') : L(h.female ? 'wyszła' : 'wyszedł', 'left')) : '?';
  // where the fear came from, in plain words
  const FEAR_SRC = { dmg: L('rany', 'wounds'), death: L('śmierć towarzyszy', 'fallen friends'), lost: L('zgubienie', 'getting lost'), alone: L('samotność', 'being alone'), split: L('rozdzielenie (zwiad)', 'split up (scouting)'), echo: L('echo groty', 'grotto echo'), curse: L('klątwa', 'curse'), panic: L('panika', 'panic'), lowhp: L('ciężkie rany', 'bad wounds'), ambush: L('zasadzki', 'ambushes'),
    carrier: L('klątwa kryształu', 'crystal curse'), roar: L('ryk potworów', 'monster roars'), haunt: L('nawiedzone klatki', 'haunted cages'), cageAlone: L('porzucenie w klatce', 'left in a cage'), lull: L('kołysanka', 'lullaby'), other: L('inne', 'other'),
    heart: L('żar serca', "heart's glow"), screams: L('krzyki uciekających', 'screams of the fleeing'), phobia: L('fobia', 'phobia'), nightmare: L('koszmary', 'nightmares'), heartcry: L('krzyk serca', "heart's cry"), burn: L('płomienie', 'flames'), siren: L('zew kusicielki', "Temptress's call"), steam: L('para', 'steam'), bell: L('dzwon żałobny', 'Funeral Bell') };   // 1.26   // 1.12.1: these showed as raw keys
  const fearSrcName = k => FEAR_SRC[k] || (ITEMS[k] ? ITEMS[k].name.toLowerCase() : k);
  function statTile(box, v, label, cls) { const d = el('div', 'stat' + (cls ? ' ' + cls : '')); d.appendChild(el('b', null, v)); d.appendChild(el('span', null, label)); box.appendChild(d); }
  function itemsTable(byType) {
    const rows = Object.keys(byType).filter(k => !TOOLS[k]).map(k => ({ k, b: byType[k], pts: byType[k].pts + byType[k].passivePts + byType[k].fearPts })).filter(r => r.b.placed > 0 || r.pts > 0).sort((a, b) => b.pts - a.pts);
    const wrap = el('div');
    if (!rows.length) return wrap;
    wrap.appendChild(el('p', 'note', L('Co zadziałało (trafienia · Esencja):', 'What worked (hits · Essence):')));
    const t = el('table', 'stats');
    rows.forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, ITEMS[r.k].name + (ITEMS[r.k].rarity ? ' ' + ITEMS[r.k].tag : ''))); tr.appendChild(el('td', null, r.b.hits + ' · ' + Math.round(r.pts))); t.appendChild(tr); });
    wrap.appendChild(t);
    return wrap;
  }
  function statsTable(s) {
    const t = el('table', 'stats');
    [[L('Skill checki: krytyk / draśnięcie / pudło / odpuszczone', 'Skill checks: crit / graze / miss / skipped'), s.checkCrit + ' / ' + s.checkOk + ' / ' + s.checkMiss + ' / ' + s.checkSkip],
     [L('Łup: zobaczony / zabrany / odpuszczony (ryzyko)', 'Loot: seen / taken / left (risk)'), s.lootSeen + ' / ' + s.loot + ' / ' + s.lootSkipped],
     [L('Narady · zwiady · samotne wypady · zbiórki · odwroty', 'Talks · scouting · solo trips · regroups · retreats'), s.talks + ' · ' + s.scouts + ' · ' + s.wanders + ' · ' + s.regroups + ' · ' + s.retreats],
     [L('Zwiedzanie: rozglądania / odmowy / znalezione monety / pułapki odpalone przy szukaniu', 'Exploring: looks / refusals / coins found / traps set off while searching'), (s.looks || 0) + ' / ' + (s.lookNo || 0) + ' / ' + (s.goldFound || 0) + ' / ' + (s.lookTraps || 0)],
     [L('Narada po 2 min: do domu / szturm / jeszcze chwila · wrócili sami', 'Council after 2 min: go home / storm / a bit longer · left on their own'), (s.councilHome || 0) + ' / ' + (s.councilStorm || 0) + ' / ' + (s.councilMore || 0) + ' · ' + (s.goHome || 0)],
     [L('Wieści: pułapki usłyszane zza ściany / śmierć przekazana później / łup zostawiony na rozkaz', 'News: traps heard through walls / deaths told later / loot left on orders'), (s.heard || 0) + ' / ' + (s.newsDeaths || 0) + ' / ' + (s.lootObey || 0)],
     [L('Osobno: na zwiadzie / sam / zgubiony (s)', 'Apart: scouting / alone / lost (s)'), Math.round(s.splitTime || 0) + ' / ' + Math.round(s.loneTime || 0) + ' / ' + Math.round(s.lostTime || 0) + (s.splitLost ? L(' · zabłądzili ze zwiadu: ', ' · lost while scouting: ') + s.splitLost : '')],
     [L('Paniki · ucieczki · ucieczki całej drużyny', 'Panics · flights · whole party fled'), s.panics + ' · ' + s.flees + ' · ' + s.partyFlees],
     [L('Pułapki zapamiętane / niezapamiętane / wykryte', 'Traps remembered / not remembered / spotted'), s.learned + ' / ' + s.notLearned + ' / ' + s.detected],
     [L('Rozbrojone (z tego rozmontowane) / nieudane / odczynione przez kapłana', 'Disarmed (of them dismantled) / failed / undone by a priest'), s.disarmed + ' (' + (s.sapped || 0) + ') / ' + s.disarmFails + ' / ' + s.blessed],
     [L('Pułapki wyczute przez maga', 'Traps sensed by a mage'), s.sensed || 0],
     [L('Przygotowania: razy / osłony / zakłócenia / rozbrojenia z progu', 'Preparations: times / wards / jams / disarmed from the door'), s.preps + ' / ' + s.wards + ' / ' + s.jams + ' / ' + s.prepDisarms],
     [L('Plotki: pokoje / pułapki / fałszywe', 'Rumours: rooms / traps / false'), s.rumorRooms + ' / ' + s.rumorTraps + ' / ' + s.rumorFalse],
     [L('Zapadnie · klatki · uratowani · porzuceni', 'Trapdoors · cages · rescued · abandoned'), s.falls + ' · ' + s.cages + ' · ' + s.rescues + ' · ' + s.abandons],
     [L('Samoobrona: uniki, tarcze, talizmany, bariery', 'Self-defence: dodges, shields, charms, barriers'), s.dodges + ', ' + s.shields + ', ' + s.charms + ', ' + s.barriers],
     [L('Przebiegnięcia przy przeładowaniu', 'Dashes past a reloading trap'), s.timing],
     [L('Najwyższe combo', 'Best combo'), '×' + fmt2(1 + 0.25 * (s.maxCombo - 1))],
     [L('Potwory, które zginęły', 'Monsters lost'), s.monstersLost],
     [L('Esencja: dla serca / dla Ciebie / z combo wstecz / relikwie', 'Essence: heart / you / combo back-pay / relics'), Math.round(s.essHeart || 0) + ' / ' + Math.round(s.essWave || 0) + ' / ' + Math.round(s.comboPts || 0) + ' / ' + Math.round(s.essDrop || 0)],
     [L('Czas · pauza · przyspieszenie', 'Time · pause · fast-forward'), mmss(fl.time) + ' · ' + Math.round(s.pauseTime) + ' s · ' + Math.round(s.ffTime) + ' s']
    ].forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, String(r[1]))); t.appendChild(tr); });
    return t;
  }
  function renderOver(card) {
    card.appendChild(el('div', 'sub', L('Serce lochu gaśnie', 'Your heart is fading')));
    const ate = fl.hunger && fl.hunger.ate;
    card.appendChild(el('h2', null, ate ? L('Serce zjadło ostatni kryształ', 'The heart ate its last crystal') : L('Ostatni kryształ skradziony', 'The last crystal is stolen')));
    card.appendChild(el('p', null, (ate ? L('Fale nie dały sercu dość Esencji, więc zjadło samo siebie.', 'The waves did not feed the heart enough Essence, so it ate itself.') : L('Bohaterowie wynieśli wszystkie kryształy.', 'The heroes carried out every crystal.')) + L(' W pełnej grze tu będzie reklama: po obejrzeniu kryształ wraca i grasz dalej (raz na run).', ' In the full game an ad goes here: watch it, get a crystal back and play on (once a run).')));
    const row = el('div', 'row');
    if (!run.continueUsed) {
      let gu = null;
      const rv = btn('primary', L('Kontynuuj z 1 kryształem', 'Continue with 1 crystal'), L('symulacja reklamy', 'simulated ad'), () => {
        rv.disabled = true; if (gu) gu.disabled = true;
        let n = 3; rv.querySelector('b').textContent = L('Reklama... ', 'Ad... ') + n;
        const timer = setInterval(() => {
          n--;
          if (n > 0) { rv.querySelector('b').textContent = L('Reklama... ', 'Ad... ') + n; return; }
          clearInterval(timer);
          { const c0 = run.crystals; run.continueUsed = true; run.crystals = 1; run.maxCrystals = Math.max(run.maxCrystals, 1); crystalEv(run.crystals - c0, 'other', 'continue'); }   // 1.24 (D, P0-2): the rewarded ad
          closeModal(); proceedToBuild(); setHint(L('Serce znowu bije. Nie zmarnuj tego.', 'Your heart beats again. Make it count.'));
        }, 700);
      });
      row.appendChild(rv);
      gu = btn('', L('Zakończ run', 'End run'), null, () => { closeModal(); endRun(ate ? L('Serce zjadło ostatni kryształ.', 'The heart ate its last crystal.') : L('Bohaterowie wynieśli wszystkie kryształy.', 'The heroes carried out every crystal.'), 'end'); });
      row.appendChild(gu);
    } else row.appendChild(btn('primary', L('Zakończ run', 'End run'), null, () => { closeModal(); endRun(ate ? L('Serce zjadło ostatni kryształ.', 'The heart ate its last crystal.') : L('Bohaterowie wynieśli wszystkie kryształy.', 'The heroes carried out every crystal.'), 'end'); }));
    card.appendChild(row);
  }
  // After a reload at the final summary: the same choice as on the summary (win now or play on).
  function renderVictory(card) {
    card.classList.add('vic');
    card.appendChild(el('div', 'sub', waveName() + L(' odparta', ' held')));
    card.appendChild(el('h2', null, L('Zwycięstwo!', 'Victory!')));
    card.appendChild(el('p', null, L('Bohater z przepowiedni nie zabrał Twojego serca. Run wygrany! Esencja: ' + Math.round(run.total) + ' · ranga: ' + rankOf(run.total).name + ' · kryształy: ' + run.crystals + ' z ' + run.maxCrystals + '.', 'The hero of the prophecy did not take your heart. You won the run! Essence: ' + Math.round(run.total) + ' · rank: ' + rankOf(run.total).name + ' · crystals: ' + run.crystals + '/' + run.maxCrystals + '.')));
    card.appendChild(el('p', 'note', L('Możesz grać dalej: fale bez końca, co 5 fal boss. Wygrana zostaje, nawet jeśli potem przegrasz.', 'You can play on: endless waves, a boss every 5. The win stays even if you fall later.')));
    pushLog(null);
    const row = el('div', 'row');
    const go = btn('primary', L('Graj dalej', 'Play on'), L('fale bez końca', 'endless waves'), () => { run.victoryDone = true; closeModal(); proceedToBuild(); }); go.id = 'vic-continue';
    const end = btn('', L('Zakończ: zwycięstwo', 'End with victory'), null, () => { run.victoryDone = true; closeModal(); endRun(L('Loch przetrwał wszystkie ' + RUN_WAVES + ' fal.', 'The dungeon survived all ' + RUN_WAVES + ' waves.'), 'win'); }); end.id = 'vic-end';
    row.appendChild(go); row.appendChild(end);
    card.appendChild(row);
  }
  /* ================= save between waves (this browser only) ================= */
  // Saved when a build phase starts, while you build, right before a wave and after each wave. A tab closed mid-wave
  // comes back to the build before that wave. The wave timelines stay out of the save (they are in the database).
  const SAVE_KEY = 'yatd12-save', SAVE_VER = 1;
  let saveTimer = null, userStarted = false;   // the demo dungeon behind the start screen never saves
  function saveRunSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveRun('build'), 700); }
  function saveRunSoonSummary() { if (fl && fl.phase === 'summary') { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveRun('summary'), 300); } }
  function saveRun(stage) {
    if (!userStarted || !run || run.over) return false;   // Prototype 1.0: the tutorial run is saved too (it goes on as a full run)
    try {
      if (fl && fl.phase === 'build' && stage === 'build') run.essence = fl.essence;
      const prim = o => { const c = {}; for (const k in o) { const v = o[k]; if (v === null || typeof v !== 'object' && typeof v !== 'function') c[k] = v; } if (o.item) c.item = Object.assign({}, o.item); if (o.fromNm) c.fromNm = o.fromNm.slice(); if (o.belly) c.belly = o.belly.map(x => Object.assign({}, x)); return c; };   // loot left by a hero keeps its exact item (1.20: and whose it was; a mimic its belly)
      const data = JSON.stringify({ v: SAVE_VER, gv: LOG_VERSION, stage, at: Date.now(), run }, function (k, v) {
        if (k === 'afterModals' || k === 'lastLog') return undefined;
        if (k === 'waveDocs') return v.map(d => Object.assign({}, d, { timeline: null }));
        if (k === 'items' && v instanceof Map) return { __m: [...v.entries()].map(e => [e[0], prim(e[1])]) };
        if (v instanceof Map) return { __m: [...v.entries()] };
        if (v instanceof Set) return { __s: [...v] };
        return v;
      });
      localStorage.setItem(SAVE_KEY, data);
      return true;
    } catch (e) { return false; }
  }
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
      const sv = JSON.parse(raw, (k, v) => v && typeof v === 'object' && v.__m ? new Map(v.__m) : v && typeof v === 'object' && v.__s ? new Set(v.__s) : v);
      return sv && sv.v === SAVE_VER && sv.run && sv.run.layout ? sv : null;
    } catch (e) { return null; }
  }
  function clearSave() { clearTimeout(saveTimer); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function resumeRun() {
    const sv = loadSave(); if (!sv) return false;
    coachHide();
    run = sv.run;
    if (!run.stage) run.stage = ONB_FULL;   // 1.12: a run saved before is the full game
    Object.assign(run, { afterModals: null, over: false, best: loadBest(), resumed: (run.resumed || 0) + 1, logState: '' });
    run.stacks = run.stacks || {};
    run.sessNew = true;   // 1.24 (D, P0-3): a resumed run is a new session
    // v14 fields for a run saved by v13: returning heroes, the stash, the shop; cards removed in v14 (Labirynt) drop out of the deck
    if (!run.returners) run.returners = [];
    if (!Array.isArray(run.fallen)) run.fallen = [];   // 1.23: a run saved before 1.23 has no fallen (its returners have no nemesis: plain returners)
    if (!run.stash) run.stash = [];
    if (typeof run.freePicks !== 'number') run.freePicks = 0;
    if (!sv.gv || sv.gv < 40) {   // v15: points became Esencja (about 150 old points = 1); the heart's store starts empty
      run.total = Math.round((run.total || 0) / 150); run.rankIdx = null;
      (run.waves || []).forEach(w => { w.score = Math.round((w.score || 0) / 150); });
    }
    if (run.rankIdx == null) run.rankIdx = rankOf(run.total || 0).i;   // v14.1: ranks are announced, no card thresholds
    delete run.hungerStore;   // 1.01: no heart store any more (what was in it is gone, the heart eats from the wave itself)
    if (!run.shopOwed) run.shopOwed = 1;
    if (run.nextFor == null) run.nextFor = run.wave;   // 1.05: a run saved by 1.04 (the next party was made at the start of the build)
    if (run.builtFor == null) run.builtFor = run.wave;
    if (run.stage >= 3) ['howl', 'shackles'].forEach(t => run.unlocked.add(t));   // 1.05: the new counter-buildings for a run saved before
    (run.upgrades || []).forEach(id => { const u = UPG[id]; if (u && u.kind === 'unlock') saveFound(u.unlock); });   // 1.14: a run saved before keeps what it opened
    loadFound().forEach(t => { if (onbOk(t, run.stage || ONB_FULL)) run.unlocked.add(t); });
    if (!sv.gv || sv.gv < 38) run.shop = null;
    run.deck = run.deck.filter(id => UPG[id]); run.stash = run.stash.filter(id => UPG[id]);
    if (!Array.isArray(run.fused)) run.fused = [];   // 1.24: a run saved before: two copies of a card become one ★ card (a third one is sold)
    { const seen = new Set(), keep = []; run.deck.forEach(id => { if (!seen.has(id)) { seen.add(id); keep.push(id); } else if (!UPG[id].unique && !run.fused.includes(id)) run.fused.push(id); else run.essence = (run.essence || 0) + RAR_SELL[UPG[id].rar]; });
      run.deck = keep; run.stash = run.stash.filter(id => { if (!seen.has(id)) { seen.add(id); return true; } if (!UPG[id].unique && !run.fused.includes(id)) run.fused.push(id); else run.essence = (run.essence || 0) + RAR_SELL[UPG[id].rar]; return false; }); }
    run.fused = run.fused.filter(id => run.deck.includes(id) || run.stash.includes(id));
    if (run.shop && run.shop.ids) run.shop.ids = run.shop.ids.map(id => id && UPG[id] ? id : null);   // 1.18: a card gone from the game (u-portrait) is no offer
    mods = buildMods();   // 1.24: with the fused ★ cards
    floats = []; particles = []; paused = false; ff = false; selected = null;
    if (sv.stage === 'summary') {   // the wave was over: show what was left to pick, then build
      setupFl('summary');
      resize(); cam.s = buildScale(); centerOn((fl.ent.x + fl.heart.x) / 2 + 0.5, (fl.ent.y + fl.heart.y) / 2 + 0.5);
      updateTray(); updateAction();
      afterSummary();
    } else {
      startBuild(true);
      if (!sv.gv || sv.gv < 38) { run.next = makeWave(run.wave); setHint(waveHint()); saveRun('build'); }   // a run saved before v14: the next party by the new rules (bodies, phobias, returners)
      tutResume();   // a tutorial run: the coach comes back at its step
    }
    return true;
  }

  /* ================= test log: database + download ================= */
  // Version 31. runs/<runId> holds the summary (status active / win / end / quit), updated after every wave and at the end.
  // waves/<runId>_<nn> holds one wave: its summary, the heroes, the dungeon as it stood when the wave started, and a timeline
  // (events plus a sample of every hero once a second). Closing the tab loses at most the wave in progress.
  const LOG_VERSION = 64;   // 1.28.0: waves.summary.perf gets simMed/P90, drawMed/P90, stepsMed/Max, tileMed/Min, wallsMed, soMed/Max, dev {cores, mem, model} and the graphics level fields; 63: 1.27.5 (brief "Serce hamuje" E): waves.summary heartPicks (every Heart's Gift pick of the build: lv, took, offer, phase), heartUpBlocked, satietyOver, deckUsed, giftCards, reserveAtGo, reserveWarn; stats heartUpBlocked, heartRerolls, upgradeAll, repeatPlace, homeRun, hushFound
  //   // 1.26: waves.summary satiety, satietyGain, heartLv, heartPick, regrow, feastPts, tithePts, ofiara, revived, stealMax, omen; stats essTithe, essDrained, reactN, antidotes, flasks, tracked, calls, freed, lootRetreat, crownPays...
  // 61:   // 1.25.1: waves.summary.previewVis {buildSec, sec, openSec, coveredSec, firstAt} (how long the next wave's preview was on screen in the build), stats.unspentPick / unspentPicks (the buy hint in the unspent-Esencja question). 1.25 (60): runs.screen (w, h, ui, wide, mouse, touch: which layout and pointer the run was played with). Before: 1.24 Part B (the same 59): runs: tut.stepTimes (seconds on each step, by TUT order) and tut.stepIds; stage now follows the wave in the first run (runs.stage = the stage reached); waves: fearUi.bar (taps on a fear bar), stats.tutSpike (the guide's spikes sprung once). 1.24 Part D (59):runs: status one of win/end/quit/active (won => win), playerId, crystals0 + crystalEvents [{t, delta, cause, wave, why}] (cause stolen/hunger/saved/card/other), activeSec, sessions [{start, end}], endBonus (total = sum of waveMini.sc + endBonus); waves summary: crystalEvents, essenceAtStart, essenceAtWaveStart, itemsCount, roomsCount, previewOpened, fearUi {card, bar}, stats.checkByShape {shape: {ok, crit, miss, skip, auto}}, stats.calmAuto, unspentAsk, unspentGo; settings calmWaves, calmGap, okPulse, okSwing. 58, 1.24 Part A adds runs/waves fused (the fused ★ card ids), stats: exhausted, forcedOut, tdSeen; timeline xh (worn out: how many inside) fo (forced out: id, x, y, state). 1.23 adds heroes[].nem and stats: nemeses, nemesisNew, nemesisDropped, nemRooms, nemTraps, nemesisReply, nemesisWarn, nemesisBoast, nemesisRage, nemesisDown, nemesisOut, nemesisCrystal, grudgeHits, grudgeDone, bounties, essBounty, bountyTalk, fallenMemory; timeline nn nm ng nd nx nr nb no nw2 bn fm. 1.22 adds stats: escortForms, escortGuards, guardSoaks, guardSoakDmg, handOvers, lastStands, lastStandT, sacrifices, sacrificeFired, youFirst, taps, tapFound, notThisWay, notThisWayMoved, frontLines, woundedBack, nearExit; timeline ef gs ho lx le sf sd yf tp tf nw fm wb ne. 1.21 adds heroes[].bond (type[:role]:id) and stats: bonds, bondsBy, bondLines, griefs, revengeVows, revengeFights, grownUp, noLeave, noLeaveSaved, mentorWatch, mentorProud, rivalMock, quarrels, quarrelStops, quarrelWins, quarrelSulks, bets, betsWon, betsLost, betsOff; timeline bo bk gf vw gu rm mw mp qq nl ns ob bt be. 1.20 adds heroes[].endSrc/took/load and stats: lootFallen, predecessorSeen, bodyLoot, bodyLootBy, gearGiven, gearTrades, amuletGiven, tooHeavy, loadSlowT, lootAssign, lootRival, lootOffer, lootOfferTaken, lanternSaves, lanternOut, lanterns, lanternGrope, crowbarGate, crowbarCage, gearKnocked, gearBack, mimicAte, mimicSpill, bombCook, bombFriendly, bombHeld, returnGear, cursePassed, greedBody, lootDeadObject; timeline gv bl pr qa qo qr la lm kn mx bx bf2 rq st (st: gear knocked off in a Zbrojownia, it was sp). 58: Prototype 1.13 (1.13.1 the same fields: solo lines when alone; 1.13.2 adds stats.swapWay: idle heroes who swapped places to let one pass; 1.13.3 the same fields: a shorter scene before a deadly room; 1.14 adds found (runs file): what the run started with from earlier discoveries; 1.15 adds layout cell [9]: the room's komnata (KIND_INFO id or null); 1.13.4 adds stats.disarmQuit: a thief who gave up a trap after it went off in his face twice, and stats.restBy: a retreating hero who sat down next to a friend resting in his way): conversations (stats.convos = exchanges started, stats.convoNo = why one did not start: breath, talk, queue, luck, hush, alone, fit), talks only for the ones standing together (h.talkUntil), alone a hero talks to himself (SOLO) or keeps quiet, nobody stands still in a trap (stats.toSafety); the check at the top of the map; talks, rests, the stop before a room, a hero down a trapdoor and everyone caged are quiet
  // 57: Prototype 1.12.1: one hero a tile (stats.sidesteps, squeezes, makeWay), longer talks and rests, patience at half speed in scenes (fl.patT), combo clock x S.comboQuiet in the quiet, window 3 s, wound Groza and fear against HP without comboHp
  // 56: Prototype 1.12: the first runs (stage 1-4, guided), combo +12% damage and fear a step, the combo window 2,5 s of wave time
  // 55: Prototype 1.11.1: the heart eats its need again (stats.essHeart is back), the need is 37 x 1,25^(wave-2), about half a typical wave
  // 54: Prototype 1.11: the heart takes no Esencja, a wave must reach hungerNeed (60 x 1,25^(wave-2)) or a crystal goes (hunger.fedAmt = how far the bar got; stats.essHeart is gone)
  // 53: Prototype 1.10: 4 heroes a wave (+ the boss), the greed curve, room types haven/gears/hush/ice (stats.slips, naps, hushUnlearned, hushLost), loot taken by steps
  // 52: Prototype 1.09: a check answer stays with the trap between waves (stats.memLost: answers lost to the heroes; memFires counts every remembered hit), checks slow the world to x0,25 instead of stopping it (frozen = the share of the wave under a check, slowed), quiet x1,5 and a held finger x3 for everyone (settings.autoFF 1.5, ffSpeed 3), the tray folds at a wave's start again, walls 2x high; 51: Prototype 1.08: the tray folds only on a tap (a wave let out with it open starts paused: in stats.pauseTime), a held finger x5 (settings.ffSpeed 5, was 3), quiet x2,5 for old saves too; 50: Prototype 1.07: the isometric camera, the build tray is the pause (a wave has trayPauses: how often the tray stopped it; stats.pauseTime: how long); 49: Prototype 1.06: heroes drawn as figurines, one build-bar button (no change in the data); 48: Prototype 1.05: a check's result kept for the wave (memFires, skullOff), checks per minute (cpm) and the share of the wave frozen by checks (frozen, perf.realSec), the classes of each party (bard, barbarian), rumours only of what hurt or scared (max 3, 2 waves), tutorial progress in the run summary (tut: furthest step, skipped, how it ended), new stats (songs, bardCalls, answers, rages, smashes, disputes, healCalls); 47: Prototype 1.04: wave summaries carry perf (frame gaps, js time, dpr, direct tiles share) and errors, the party waits at the gate 1,8 s, start traps near the heart, tutorial cards; 46: Prototype 1.03: greed risk without a ceiling (leader levels, hunters), loot dearer per copy, Odwrotna chciwość reworked (taken loot x3), split screen; 45: Prototype 1.02: auto fast-forward (autoFF time) counts steps to the tiles a ready trap reaches instead of whole rooms, the settle screen waits for Dalej; 44: Prototype 1.01: combo chains cashed in at the end (cp event), the heart eats first from the wave (fed, fedAt, essHeart), no purse limit or store, retreat after patience, new prices, fixed gate, fog loses heroes, stronger early waves, 6 tabs; 43: Prototype 1.0: new look, hold a tile for its text, full card texts in the shop, a double tap upgrades, buildings block like a crate, 7 tabs; 42: v15.2 tap moves / hold removes, two starting traps (18 Esencja), one-screen shop and summaries; 41: v15.1 scare elements (Strach tab), fear 1.6, scare 2.5, wound fear 25%/18%, tales of treasure;  40: v15 one currency (score = Esencja harvested, hunger in Esencja, crystal bought); 39: crystal dropped in fear, cage deaths; 38: v14 shop, damage types, phobias, returners, hunger bar; 33: deck of cards; 34: fame, item levels, buildings, traits, guild; 35: Groza x Chciwość, typed loot, powers, faith, room types, lasting breach, check shapes; 36: check event + level near it and tap offset, hunters replace, rookies
  function snapshotLayout() {
    const L = run.layout;
    return { WW, WH, entrance: L.entrance, heart: L.heartKey, entX: L.entX, essence: Math.round(fl.essence), breach: L.breach ? Object.assign({}, L.breach) : null, greedKeep: Math.round(run.greedKeep * 100) / 100,
      cells: [...L.cells.values()].map(c => [c.cx, c.cy, c.x0, c.y0, c.x1, c.y1, c.lvl || 0, c.objs.map(o => [o[0], o[1], o[2], o[3] ? 1 : 0]), c.rt || null, c.rk || null]),   // 1.15: [9] the komnata
      edges: [...L.edges.values()].map(e => [e.a, e.b, e.horiz ? 1 : 0, e.pa, e.pb, e.lvl || 0]),
      items: [...fl.items.values()].map(it => [it.type, it.x, it.y, it.lvl || 1, it.dropped ? 1 : 0]) };
  }
  // 1.24 (D, P0-1; two runs had status active with won true): one status: win (won at wave 10, also when it went on and fell later),
  // end (lost: no crystal left, also while the player still has to pick "Zakończ run" or the ad, or closed the tab there), quit (left
  // from the menu), active (going on, or the tab was closed in the middle)
  const runStatus = () => run.won ? 'win' : run.result === 'quit' ? 'quit' : (run.result === 'end' || run.crystals <= 0) ? 'end' : 'active';
  function runSummary() {
    const dur = Math.round((Date.now() - run.startedAt) / 1000), scSum = run.waves.reduce((a, w) => a + (w.score || 0), 0);   // 1.24 (D)
    crystalSync();   // 1.24 (D, P0-2): a change nobody logged shows up as 'other'
    return { version: LOG_VERSION, runId: run.id, startedAt: new Date(run.startedAt).toISOString(), at: new Date().toISOString(),
      player: (playerName || '').slice(0, 40), playerId: playerIdNow(), device: deviceId, web: WEB ? 1 : 0, tutorial: run.tutorial, stage: run.stage || ONB_FULL, guided: !!run.guided, status: runStatus(), won: run.won, waves: run.waves.length,   // 1.24 (D): playerId, status
      total: Math.round(run.total), endBonus: Math.round(run.total) - scSum, best: loadBest(), resumed: run.resumed || 0, stacks: Object.assign({}, run.stacks), crystals: run.crystals, continueUsed: run.continueUsed,   // 1.24 (D, P0-4): endBonus
      crystals0: run.crystals0 != null ? run.crystals0 : null, crystalEvents: (run.crystalEv || []).slice(),   // 1.24 (D, P0-2)
      screen: { w: innerWidth, h: innerHeight, ui: UIZ, wide: document.documentElement.classList.contains('wide') ? 1 : 0, mouse: PC() ? 1 : 0, touch: (navigator.maxTouchPoints || 0) > 0 ? 1 : 0 },   // 1.25
      activeSec: Math.min(dur, Math.round(run.activeSec || 0)), sessions: (run.sessions || []).map(s => ({ start: new Date(s[0]).toISOString(), end: new Date(s[1]).toISOString() })),   // 1.24 (D, P0-3)
      upgrades: run.upgrades.slice(), deck: run.deck.slice(), fused: (run.fused || []).slice(), deckSize: run.deckSize, found: (run.foundAtStart || []).slice(), sold: (run.sold || []).slice(), fires: run.fires, durationSec: Math.round((Date.now() - run.startedAt) / 1000), buildSec: Math.round(run.buildSec), raidSec: Math.round(run.raidSec),
      settings: Object.assign({}, S),
      waveMini: run.waves.map(w => ({ w: w.wave, sc: w.score, t: w.time, lost: w.crystalLost ? 1 : 0, k: w.stats.kills, s: w.stats.scared, lv: w.heroes.map(h => h.lvl), part: w.partial ? 1 : 0, fps: w.perf ? w.perf.fps : null, cpm: w.cpm, fz: w.frozen })),
      tut: run.tutorial ? Object.assign({ steps: TUT.length, now: run.tut }, run.tutLog || {}, { stepIds: TUT.map(q => q.id), stepTimes: TUT.map((q, k) => run.tutLog && run.tutLog.stepTimes && run.tutLog.stepTimes[k] != null ? Math.round(run.tutLog.stepTimes[k] * 10) / 10 : null) }) : null };   // 1.05: how far the tutorial got (1.24 B, P1-5: seconds on each step)
  }
  const docBytes = d => new TextEncoder().encode(JSON.stringify(d)).length;
  // 1.24 (D, P0-6): the next wave looked at in the build phase (the news card, the party list, a card of the next party; Part B's
  // preview calls it too) and the fear shown in the wave (card: a hero card opened in the wave; bar: Part B's fear bar tapped)
  function notePreview() { if (run && fl && fl.phase === 'build') run.previewN = (run.previewN || 0) + 1; }
  function noteFearUi(k) { if (!fl || fl.phase !== 'raid') return; const F = fl.fearUi || (fl.fearUi = { card: 0, bar: 0 }); F[k] = (F[k] || 0) + 1; }
  // 1.24 (D, P0-3; durationSec is wall time: 68494 s for a run played over days): run.activeSec counts real seconds while the page is
  // visible, the run is the player's and he is there (a wave running on screen, or a touch in the last ACT_IDLE s); run.sessions =
  // [start, end] (ms) of every sitting: a new run, a resumed one, or back after SESSION_GAP s away. A 1 s timer, so it does not
  // depend on the frame loop.
  const ACT_IDLE = 60, SESSION_GAP = 300;
  let actLast = Date.now(), actInput = Date.now();
  ['pointerdown', 'keydown', 'wheel'].forEach(ev => window.addEventListener(ev, () => { actInput = Date.now(); }, { capture: true, passive: true }));
  function activeTick() {
    const now = Date.now(), dt = Math.min(5, Math.max(0, (now - actLast) / 1000)); actLast = now;
    if (!run || run.over || !userStarted || document.visibilityState === 'hidden') return;
    const playing = !!(fl && fl.phase === 'raid' && !paused && !modalOpen);
    if (!playing && now - actInput > ACT_IDLE * 1000) return;
    run.activeSec = (run.activeSec || 0) + dt;
    pvTick(dt);   // 1.25.1
    const ss = run.sessions || (run.sessions = []), cur = ss[ss.length - 1];
    if (!cur || run.sessNew || now - cur[1] > SESSION_GAP * 1000) { ss.push([Math.round(now - dt * 1000), now]); run.sessNew = false; } else cur[1] = now;
    if (ss.length > 80) ss.splice(0, ss.length - 80);
  }
  setInterval(() => { try { activeTick(); } catch (e) {} }, 1000);
  // 1.25.1: how long the next wave's preview was on the screen in the build, not only how often it was unfolded (previewOpened).
  // Every second of the build the player is there for (the same gate as activeSec): buildSec; with the panel drawn and most of it
  // the topmost thing on the screen (2 of 3 points along it: no card, coach, tip or HUD over it): sec (openSec of them with the full
  // list); drawn but covered: coveredSec; firstAt = the build second it was first seen. One record per build (run.pv), in the wave's
  // summary as previewVis.
  function previewState() {
    const r = uiRects.list; if (!r || !fl || fl.phase !== 'build') return 'none';
    if (modalOpen) return 'covered';
    const cr = cv.getBoundingClientRect(), x0 = cr.left + OX + r.x, y0 = cr.top + OY + r.y, ym = y0 + r.h / 2;
    let on = 0;
    [0.12, 0.5, 0.88].forEach(f => { const x = x0 + r.w * f; if (x < 0 || ym < 0 || x > innerWidth || ym > innerHeight) return; const t = document.elementFromPoint(x, ym); if (t === cv) on++; });
    return on >= 2 ? 'vis' : 'covered';
  }
  function pvTick(dt) {
    if (!run || !fl || fl.phase !== 'build') return;
    const P = run.pv || (run.pv = { buildSec: 0, sec: 0, openSec: 0, coveredSec: 0, firstAt: null });
    P.buildSec += dt;
    const s = previewState();
    if (s === 'vis') { P.sec += dt; if (UI.listOpen) P.openSec += dt; if (P.firstAt == null) P.firstAt = P.buildSec; }
    else if (s === 'covered') P.coveredSec += dt;
  }
  function pvTake() { const P = run && run.pv; if (!P) return null; const r1 = x => x == null ? null : Math.round(x * 10) / 10; return { buildSec: r1(P.buildSec), sec: r1(P.sec), openSec: r1(P.openSec), coveredSec: r1(P.coveredSec), firstAt: r1(P.firstAt) }; }
  // 1.24 (D, P0-2): the summary says in one red line why a crystal went (the testers lost crystals to hunger without noticing)
  function crystalWhy(body, H, heart) {
    const lines = [];
    if (H && H.ate) lines.push(L('Głód rozbił kryształ: serce chciało ' + H.need + ' Esencji, fala dała ' + fmtE(heart) + ', a sakiewka tylko ' + fmtE(H.tookPurse || 0) + '. Serce zjadło też resztę sakiewki.', 'Hunger cost you a crystal: the heart wanted ' + H.need + ' Essence, the wave gave ' + fmtE(heart) + ' and your purse only ' + fmtE(H.tookPurse || 0) + '. The heart ate the rest of your purse too.'));
    fl.heroes.filter(h => h.carriedOut).forEach(h => lines.push(L('Kryształ skradziony: ' + heroName(h) + ' (' + className(h).toLowerCase() + ' ' + h.lvl + ') ' + (h.female ? 'wyniosła' : 'wyniósł') + ' go z lochu.', 'Crystal stolen: ' + heroName(h) + ' (' + className(h).toLowerCase() + ', level ' + h.lvl + ') carried it out.')));
    if (!lines.length) return;
    const p = el('p', 'note crywhy', lines.join(' ')); p.id = 'wave-crystal-why'; body.appendChild(p);
  }
  // 1.24 (D, P0-2): in the build phase, a warning when hunger may eat a crystal in the coming wave: the last wave brought less than
  // 1,25 x what the heart wants now, or the heart ate a crystal last time
  const reserveLow = () => { const need = run && run.tut < 0 ? hungerNeed(run.wave) : 0; return need > 0 && hungerRisk() > 0 && Math.floor(fl.essence) < 0.2 * need; };   // 1.27.5 (brief D)
  function hungerRisk() {
    const need = run ? hungerNeed(run.wave) : 0; if (!need || !fl || fl.phase !== 'build') return 0;
    const last = run.waves[run.waves.length - 1];
    return (!last || last.score < need * 1.25 || (last.hunger && last.hunger.ate)) && fl.essence < need ? need : 0;   // 1.26: a purse that covers the hunger is no risk
  }
  // 1.26: the heart's card (a tap on the heart's row): this wave's hunger and where it comes from, the purse, the Danina and the
  // Nasycenie to the next level, what the levels give, and the Ofiara (in the build)
  // 1.27.1 (author): every family, its level from the Family Runes and what that does in the game
  function renderFamilies(card, m) {
    card.appendChild(el('div', 'sub', L('Talia · rodziny', 'Deck · families')));
    card.appendChild(el('h2', null, L('Rodziny i Runy rodów', 'Families and Family Runes')));
    card.appendChild(el('p', 'note', L('Każdy element należy do jednej rodziny. Runa rodu ze sklepu podnosi poziom rodziny (najwyżej ' + RUNE_MAX + ') i działa od razu na wszystkie jej elementy.', 'Every element belongs to one family. A Family Rune from the shop raises the family level (up to ' + RUNE_MAX + ') and works at once on all its elements.')));
    const lv = run.famLv || {}, placed = {}; if (fl && fl.items) fl.items.forEach(it => { const f = FAMILY_OF[it.type]; if (f) placed[f] = (placed[f] || 0) + 1; });
    const list = el('div', 'famlist');
    Object.keys(FAMILIES).sort((a, b) => (lv[b] || 0) - (lv[a] || 0) || (placed[b] || 0) - (placed[a] || 0)).forEach(f => {
      const F = FAMILIES[f], n = Math.min(RUNE_MAX, lv[f] || 0), row = el('div', 'famrow' + (n ? ' on' : ''));
      { const ru = ART.rune && ART.rune(f); if (ru) { const im = el('img', 'runeimg'); im.src = ru; im.alt = ''; row.appendChild(im); } else row.appendChild(el('span', 'fg', F.glyph)); }
      const tx = el('div', 'ft'), hd = el('div', 'fh'); hd.innerHTML = '<b style="color:' + F.color + '">' + F.glyph + ' ' + F.name + '</b>';
      const pips = el('span', 'fpips'); for (let i = 1; i <= RUNE_MAX; i++) pips.appendChild(el('i', i <= n ? 'f' : '')); hd.appendChild(pips); tx.appendChild(hd);
      tx.appendChild(el('span', 'fe', !n ? L('Poziom 0: bez premii.', 'Level 0: no bonus.') : f === 'treasure' ? L('Poziom ' + n + ': łup podbija Chciwość o ' + 8 * n + '% mocniej.', 'Level ' + n + ': loot raises Greed ' + 8 * n + '% more.') : L('Poziom ' + n + ': +' + 8 * n + '% mocy, -' + 4 * n + '% odnowienia, statusy o ' + 8 * n + '% dłużej.', 'Level ' + n + ': +' + 8 * n + '% power, -' + 4 * n + '% cooldown, statuses last ' + 8 * n + '% longer.')));
      tx.appendChild(el('span', 'fi', F.items.filter(t => ITEMS[t]).map(t => ITEMS[t].name).join(', ') + (placed[f] ? L(' · w lochu: ', ' · in the dungeon: ') + placed[f] : '')));
      row.appendChild(tx); list.appendChild(row);
    });
    card.appendChild(list);
    card.appendChild(btn('primary', L('Zamknij', 'Close'), null, () => { closeModal(); if (m.unpause) setPaused(false); }));
  }
  function renderHeart(card, m) {
    const hl = run.heartLv || 0, s0 = heartLvAt(hl), s1 = heartLvAt(hl + 1), sat = Math.floor(run.satiety || 0), build = fl.phase === 'build';
    const n = build ? run.wave : fl.phase === 'summary' ? run.wave + 1 : run.wave, P = hungerParts(n), need = hungerNeed(n), purse = Math.floor(fl.essence);
    card.appendChild(el('div', 'sub', L('Serce · poziom ', 'Heart · level ') + hl));
    card.appendChild(el('h2', null, need ? L('Głód fali ' + n + ': ' + need, 'Wave ' + n + ' Hunger: ' + need) : L('Serce', 'Heart')));
    const ul = el('ul', 'conseq');
    ul.appendChild(el('li', null, L('Serce je pierwsze: z wypłat w fali bierze swoje, aż się naje (czerwony pasek). Reszta jest Twoja.', 'The heart eats first: it takes its share of each payout until it is full (red bar). The rest is yours.')));
    ul.appendChild(el('li', null, L('Fala dała za mało? Po fali serce bierze brak z sakiewki' + (mods.stoneHeart ? ' (Kamienne serce: 75% braku)' : '') + '. Gdy sakiewka nie wystarczy, pęka kryształ, a serce zjada całą sakiewkę.', 'Wave fell short? Afterwards the heart takes the rest from your purse' + (mods.stoneHeart ? ' (Stone Heart: 75% of it)' : '') + '. If the purse is short too, a crystal breaks and the heart eats the whole purse.')));
    ul.appendChild(el('li', null, L('Syte serce bierze Daninę: ' + Math.round(titheNow() * 100) + '% dalszych wypłat idzie w Nasycenie (złoty pasek). Pełne Nasycenie to nowy poziom serca.', 'A full heart takes a Tithe: ' + Math.round(titheNow() * 100) + '% of later payouts goes to Satiety (gold bar). Fill it to level up the heart.')));
    ul.appendChild(el('li', null, L('Każdy poziom daje darmową kartę z rzędu Dar serca. Karty Daru nie zajmują miejsc w talii. Najwyżej 1 poziom na falę. Poziomy 3, 5, 7: może trafić się Odrost (kryształ wraca).', "Each level gives a free card from the Heart's Gift row. Heart's Gift cards take no deck slots. At most 1 level per wave. Levels 3, 5, 7: Regrowth may show up (a crystal back).")));   // 1.27.5 (brief A, B)
    card.appendChild(ul);
    if (P) {
      const parts = [L('podstawa ', 'base ') + P.base];
      if (P.revive) parts.push('+' + P.revive + L(' powalone potwory', ' downed monsters')); if (P.demon) parts.push('+' + P.demon + L(' demony', ' demons')); if (P.credit) parts.push('+' + P.credit + L(' Kredyt krwi', ' Blood Credit'));
      if (P.granary) parts.push('−' + P.granary + L(' Spichlerz dusz', ' Soul Granary')); if (P.blood) parts.push('−' + P.blood + L(' Głód krwi', ' Bloodlust'));
      card.appendChild(el('p', 'note', (parts.length > 1 ? L('Głód ', 'Hunger ') + need + ': ' + parts.join(', ') + '.' : '') + (build ? (() => { const k = mods.stoneHeart ? 0.75 : 1; return L(' W sakiewce masz ', ' Your purse: ') + purse + (purse >= need * k ? L(': wystarczy na cały głód', ', enough for all of it') + (k < 1 ? L(' (Kamienne serce: 75% braku).', ' (Stone Heart: 75% of it).') : '.') : L(': fala musi dać co najmniej ' + Math.ceil(need - purse / k) + ', inaczej pęknie kryształ.', '. The wave must bring at least ' + Math.ceil(need - purse / k) + ' or a crystal breaks.')); })() : '')));
    }
    const sb = el('div', 'satbar'); const si = el('i'); si.style.width = (100 * clamp((sat - s0) / Math.max(1, s1 - s0), 0, 1)).toFixed(1) + '%'; sb.appendChild(si); sb.appendChild(el('span', null, L('Nasycenie ', 'Satiety ') + sat + ' / ' + s1 + (heartUpBlocked() ? L(' · poziom w następnej fali', ' · level next wave') : L(' do poziomu ', ' to level ') + (hl + 1))));
    card.appendChild(sb);
    const nx = hl + 1, gift = [L('karta Dar serca', "a Heart's Gift card")].concat(heartRegrowLv(nx) ? [L('może trafić się Odrost', 'maybe Regrowth')] : []);
    card.appendChild(el('p', 'note', L('Poziom ', 'Level ') + nx + ': ' + gift.join(', ') + '.' + ((run.heartPicks || []).length ? L(' Dar serca czeka w sklepie: ', " Heart's Gift waiting in the shop: ") + run.heartPicks.length + '.' : '')));
    const row = el('div', 'row');
    if (build) {
      const left = ofiaraLeft(), done = run.ofiaraW === run.wave ? run.ofiaraN : 0;
      const ob = btn('gold', L('Ofiaruj sercu ', 'Offer ') + Math.min(left, 10), left ? L('Esencja z sakiewki w Nasycenie 1:1 (do ' + OFIARA_MAX + ' między falami, użyte ' + done + ')', 'purse Essence to Satiety 1:1 (up to ' + OFIARA_MAX + ' per build, used ' + done + ')') : done >= OFIARA_MAX ? L('limit na tę przerwę wykorzystany', 'limit for this build used') : L('brak Esencji', 'no Essence'), () => { ofiara(10); closeModal(); if (modalKind !== 'shop') openModal({ type: 'heart' }); });
      ob.id = 'heart-ofiara'; ob.disabled = !left; row.appendChild(ob);
      if (left > 10) { const oa = btn('', L('Ofiaruj ', 'Offer ') + left, L('cały limit', 'the whole limit'), () => { ofiara(left); closeModal(); if (modalKind !== 'shop') openModal({ type: 'heart' }); }); oa.id = 'heart-ofiara-all'; row.appendChild(oa); }
    }
    row.appendChild(btn('primary', L('Zamknij', 'Close'), null, () => { closeModal(); if (m.unpause) setPaused(false); }));
    card.appendChild(row);
  }
  function logWave(partial) {
    const w = run.waves[run.waves.length - 1];
    const doc = { version: LOG_VERSION, runId: run.id, wave: run.wave, at: new Date().toISOString(), partial: !!partial, summary: w,
      heroes: fl.heroes.map(h => ({ id: h.id, name: h.nm[0], female: h.female, type: h.type, lvl: h.lvl, boss: h.boss, trait: h.trait, max: h.max, courage: h.courage,
        kit: h.entry.inv.map(i => i.type + i.r), end: h.inv.map(i => i.type + i.r), endSrc: h.inv.map(i => (i.src || 'kit')[0]), took: h.loot || 0, load: Math.round(loadOf(h) * 10) / 10, gold: h.gold || 0, cursed: h.cursed ? 1 : 0, lost: h.lost ? 1 : 0, hunter: h.hunter ? 1 : 0,   // 1.20: endSrc, took, load (1.21: the comment stood before cursed, lost and hunter and cut them off)
        bond: h.bond ? h.bond.type + (h.bond.role ? ':' + h.bond.role : '') + ':' + h.bond.id : null,   // 1.21
        nem: h.nemesis ? (h.entry.times || 1) : 0,   // 1.23: a Nemezis (his return count)
        out: h.dead ? 'dead' : h.carriedOut ? 'crystal' : h.fleeing ? 'scared' : h.fled ? 'left' : 'inside' })),
      entry: fl.spawnAt || 'ent', checkShapes: CHECK_SHAPE,
      layout: run.waveStart, timeline: fl.tl ? { ev: fl.tl.ev, smp: fl.tl.smp } : null, upgrades: run.upgrades.slice(), deck: run.deck.slice(), fused: (run.fused || []).slice(), deckSize: run.deckSize, mods: Object.assign({}, mods) };   // 1.24: fused
    // stay well under the 256 KiB document limit: drop the per-second samples first, then trim events
    if (doc.timeline && docBytes(doc) > 230000) { doc.timeline.smp = doc.timeline.smp.filter((r, i) => i % 3 === 0); doc.timeline.thinned = 3; }
    while (doc.timeline && docBytes(doc) > 230000 && doc.timeline.ev.length > 100) { doc.timeline.ev = doc.timeline.ev.slice(0, Math.floor(doc.timeline.ev.length * 0.7)); doc.timeline.cut = true; }
    run.waveDocs.push(doc);
    run.lastLog = pushLog(doc);
  }
  // 1.27.4 (author: a hero stood still for minutes; the run file holds only finished waves, so that wave was never saved): a
  // wave that drags on (4 min, then every 2 min) sends what everyone is doing right now to the log
  // (waves/<run>_<wave>_long<n>, kind 'long'); the run file (Menu) adds the same snapshot of a wave still going on.
  const LONG_DOCS = [];
  function longDoc() {
    const P = fl.party, r2 = v => Math.round(v * 10) / 10, near = new Map();
    const heroes = fl.heroes.map(h => {
      if (!h.dead && !h.fled) fl.items.forEach(it => { if (Math.abs(it.x - h.tx) <= 3 && Math.abs(it.y - h.ty) <= 3) near.set(key(it.x, it.y), [it.type, it.x, it.y, r2(it.cd || 0), it.disabled ? 1 : 0, Math.round(it.hp || 0), it.down ? 1 : 0]); });
      return { id: h.id, type: h.type, lvl: h.lvl, out: h.dead ? 'dead' : h.fled ? 'left' : h.gone ? 'gone' : 'in', x: h.tx, y: h.ty, nx: h.nx, ny: h.ny, prog: r2(h.prog || 0),
        state: h.state, intent: h.intent, plan: h.plan || null, planOf: planOf(h), room: h.room, rt: h.room >= 0 && fl.rooms[h.room] ? fl.rooms[h.room].rt || null : null,
        path: (h.path || []).slice(0, 8), timer: r2(h.timer || 0), thinkT: r2(h.thinkT || 0), needPlan: !!h.needPlan, hp: Math.round(h.hp), max: Math.round(h.max), fear: Math.round(h.fear), courage: Math.round(h.courage),
        panic: r2(Math.max(0, (h.panicUntil || 0) - fl.time)), fleeing: !!h.fleeing, crystal: !!h.crystal, lost: !!h.lost, alone: !!h.alone, homeRun: !!h.homeRun, homeStuckT: r2(h.homeStuckT || 0),
        homeBest: h.homeBest == null ? null : Math.round(h.homeBest), homeBestAgo: h.homeBestT == null ? null : r2(fl.time - h.homeBestT), noPathT: r2(h.noPathT || 0), blockT: r2(h.blockT || 0),
        foe: h.foe ? [h.foe.type, h.foe.x, h.foe.y, Math.round(h.foe.hp || 0)] : null, rooted: !!rooted(h), slow: fl.time < h.slowUntil, cageLeft: caged(h) ? r2((h.cageUntil || 0) - fl.time) : null,
        stand: !!(h.stand && !h.stand.done), sac: !!(h.sac && !h.sac.done), split: !!h.split, wander: r2(Math.max(0, (h.wanderUntil || 0) - fl.time)), talk: r2(Math.max(0, (h.talkUntil || 0) - fl.time)), passing: h.passing == null ? null : h.passing };
    });
    const doors = []; fl.doors.forEach((d, k) => { if (doorClosed(d) || secretShut(d)) doors.push([k, doorClosed(d) ? r2(d.closedUntil - fl.time) : 'secret']); });
    const tlx = fl.tl ? { ev: fl.tl.ev.slice(-400), smp: fl.tl.smp.slice(-90) } : null;
    return { version: LOG_VERSION, runId: run.id, wave: run.wave, kind: 'long', at: new Date().toISOString(), t: r2(fl.time), patT: r2(fl.patT || 0), waveTime: S.waveTime, exhausted: !!fl.exhausted, fearless: !!fl.fearless,
      ending: fl.ending, queue: fl.queue.length, score: Math.round(fl.score || 0), essence: Math.round(fl.essence), party: { plan: P.plan, leaderId: P.leaderId, council: !!P.council, councilMore: !!P.councilMore, waitUntil: r2((P.waitUntil || 0) - fl.time), talkUntil: r2((P.talkUntil || 0) - fl.time), g2: !!P.g2, steal: r2(P.steal || 0) },
      heroes, near: [...near.values()], doors, stats: roundStats(fl.stats), timeline: tlx, layout: run.waveStart, deck: run.deck.slice(), fused: (run.fused || []).slice(), upgrades: run.upgrades.slice() };
  }
  function logLong() {
    const doc = longDoc(); doc.n = LONG_DOCS.filter(d => d.runId === run.id && d.wave === run.wave).length + 1;
    LONG_DOCS.push(doc); if (LONG_DOCS.length > 6) LONG_DOCS.shift();
    if (run.logState === 'denied' || run.logState === 'off') return;
    getDb().then(db => db && db.collection('waves').doc(run.id + '_' + String(run.wave).padStart(2, '0') + '_long' + doc.n).set(doc)).catch(() => {});
  }
  function pushLog(waveDoc) {
    if (run.logState === 'denied' || run.logState === 'off') return Promise.resolve(run.logState);
    return getDb().then(db => {
      if (!db) { run.logState = 'off'; return 'off'; }
      const fail = err => { run.logState = (err && err.code === 'invalid_argument') ? 'denied' : 'fail'; return run.logState; };
      const wr = waveDoc ? db.collection('waves').doc(run.id + '_' + String(waveDoc.wave).padStart(2, '0')).set(waveDoc) : Promise.resolve();
      return wr.then(() => db.collection('runs').doc(run.id).set(runSummary())).then(() => { run.logState = 'ok'; return 'ok'; }, fail);
    }).catch(() => { run.logState = 'fail'; return 'fail'; });
  }
  const logText = st => st === 'ok' ? L('Zapisane do analizy.', 'Saved for analysis.') : st === 'off' ? ''
    : st === 'denied' ? L('Ten widok nie może zapisać wyników (możesz pobrać plik).', 'This view cannot save results (you can download the file).') : st === 'fail' ? L('Nie udało się zapisać (możesz pobrać plik).', 'Could not save (you can download the file).') : '';
  let dlPromise = null;
  function getDownloads() {
    if (!dlPromise) dlPromise = (window.claude && typeof window.claude.use === 'function') ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null);
    return dlPromise;
  }
  function downloadRun(note) {
    if (!run || (!run.waveDocs.length && !(fl && fl.phase === 'raid'))) { note.textContent = L('Ten run nie ma jeszcze zapisanej fali.', 'No wave saved in this run yet.'); return; }
    const live = fl && fl.phase === 'raid' ? [longDoc()] : [];   // 1.27.4: the wave still going on, as it is now
    const data = JSON.stringify({ format: 'yatd-run', run: runSummary(), waves: run.waveDocs, long: LONG_DOCS.filter(d => d.runId === run.id).concat(live) }), name = 'yatd-run-' + run.id + '.json';
    note.textContent = L('Przygotowuję plik...', 'Preparing the file...');
    getDownloads().then(dl => {
      if (!dl && WEB) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); note.textContent = L('Pobrano plik ', 'Downloaded ') + name + '.'; return; } catch (e) {} }
      if (!dl) { copyFallback(data, note); return; }
      dl.save({ filename: name, data: new Blob([data], { type: 'application/json' }) })
        .then(() => { note.textContent = L('Zapisano plik ' + name + '. Możesz go wysłać albo wrzucić do rozmowy z Claude.', 'Saved ' + name + '. You can send it or drop it into a chat with Claude.'); },
          err => { if (err && err.code === 'declined') note.textContent = L('Pobieranie anulowane.', 'Download cancelled.'); else copyFallback(data, note); });
    });
  }
  function copyFallback(data, note) {
    const show = () => {
      note.textContent = L('Pobieranie tu nie działa. Zaznacz i skopiuj ten tekst, potem wklej go Claude albo do pliku .json:', 'Downloads do not work here. Select and copy this text, then paste it to Claude or into a .json file:');
      const ta = el('textarea', 'dump'); ta.value = data; ta.readOnly = true; ta.rows = 4; note.after(ta); ta.focus(); ta.select();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data).then(() => { note.textContent = L('Pobieranie tu nie działa, więc wyniki są skopiowane: wklej je Claude albo do pliku .json.', 'Downloads do not work here, so the results are copied: paste them to Claude or into a .json file.'); }, show);
    else show();
  }

  /* ================= input ================= */
  function trapNear(wx, wy) {
    const tx = Math.floor(wx), ty = Math.floor(wy);
    const direct = fl.items.get(key(tx, ty));
    if (direct && ACTIVE[direct.type]) return direct;
    let best = null, bd = 0.85;
    for (const d of DIRS8) {
      const it = fl.items.get(key(tx + d[0], ty + d[1]));
      if (!it || !ACTIVE[it.type]) continue;
      const dist = Math.hypot(wx - (it.x + 0.5), wy - (it.y + 0.5));
      if (dist < bd) { bd = dist; best = it; }
    }
    return best;
  }
  function snapTile(type, wx, wy) {
    let best = null, bd = 1.0;
    const loads = roomLoads();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.floor(wx) + dx, y = Math.floor(wy) + dy;
      if (!canPlace(type, x, y, loads)) continue;
      const d = Math.hypot(wx - (x + 0.5), wy - (y + 0.5));
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  }
  // v15.1: between waves a tap picks a thing up (tap the new spot to put it down there), a finger held on it takes it down
  // with a refund, whatever is chosen on the tray. It works on everything: your traps, monsters, loot, buildings and crates,
  // the traps the dungeon starts with and the dungeon's own furniture (that one gives nothing back: you never paid for it).
  const HOLD_DEL = 0.55;
  const objOn = (x, y) => (fl && fl.objects.get(key(x, y))) || null;
  function cellOf(x, y) { const r = roomOf(x, y), R = r >= 0 ? fl.rooms[r] : null; return R && R.kind === 'room' ? run.layout.cells.get(R.key) || null : null; }
  const itemBack = it => it.spent != null ? it.spent : ITEMS[it.type].cost;
  const healLine = it => it.type === 'shaman' && it.lhl > 0 ? L(' Wyleczył potworom ' + it.lhl + ' HP.', ' Healed monsters for ' + it.lhl + ' HP.') : '';   // 1.24 (C, addendum 2): the shaman's heals of the last wave
  function itemInfo(it) {
    const T = ITEMS[it.type], lvl = it.lvl || 1, back = itemBack(it);
    const last = (!ACTIVE[it.type] ? '' : it.lf === undefined ? '' : it.lf === 0 ? L(' Ostatnia fala: ani razu.', ' Last wave: never fired.') : L(' Ostatnia fala: ' + it.lf + '× w akcji, trafienia: ' + it.lh + ', Esencja: ' + it.lp + '.', ' Last wave: ' + it.lf + '× fired, ' + it.lh + ' hits, ' + it.lp + ' Essence.')) + healLine(it);   // 1.24 (C, addendum 2)
    const up = ACTIVE[it.type] && lvl < 3 ? upgCost(it) : 0, full = (UI.carryTips || 0) < 3;
    if (full) { UI.carryTips = (UI.carryTips || 0) + 1; saveUI(); }
    if (!full) return T.name + (ACTIVE[it.type] ? L(' (poziom ', ' (level ') + lvl + ')' : '') + L(': stuknij nowe miejsce.', ': tap a new spot.') + (up ? L(' Dwa stuknięcia: ulepsz za ' + up + '.', ' Double tap: upgrade for ' + up + '.') : '') + last;
    return T.name + (ACTIVE[it.type] ? L(' (poziom ', ' (level ') + lvl + ')' : '') + L(' w ręce: stuknij nowe miejsce albo ten sam element, żeby odłożyć.', ' in hand: tap a new spot, or tap it again to put it back.') + (up ? L(' Dwa szybkie stuknięcia: ulepsz za ' + up + ' Esencji.', ' Double tap: upgrade for ' + up + ' Essence.') : '') + L(' Przytrzymaj, żeby zdjąć (', ' Hold to remove (') + (back ? '+' + back + L(' Esencji', ' Essence') : L('bez zwrotu', 'no refund')) + ').' + last;
  }
  const objName = o => o.built ? L('Skrzynia', 'Crate') : L('Mebel', 'Furniture');
  const objBack = o => o.built ? ITEMS.crate.cost : 0;
  function objInfo(o) { return objName(o) + L(' w ręce: stuknij wolne pole w pokoju (nie przy drzwiach). Stuknij ' + (o.built ? 'ją' : 'go') + ' jeszcze raz, żeby odłożyć.', ' in hand: tap a free spot in a room (not by a door), or tap it again to put it back.') + L(' Przytrzymaj, żeby ' + (o.built ? 'zdjąć (+' + ITEMS.crate.cost + ' Esencji).' : 'usunąć (bez zwrotu, to mebel lochu).'), ' Hold to remove it' + (o.built ? ' (+' + ITEMS.crate.cost + ' Essence).' : ' (no refund, it came with the dungeon).')) + (fl.items.get(key(o.x, o.y)) ? L(' To, co na ' + (o.built ? 'niej' : 'nim') + ' stoi, przeniesiesz razem z ' + (o.built ? 'nią' : 'nim') + '.', ' What stands on it moves with it.') : ''); }
  function pickUp(it) { movingObj = null; movingKey = key(it.x, it.y); carryCache = null; setHint(itemInfo(it)); }
  function pickUpObj(o) { movingKey = null; movingObj = key(o.x, o.y); carryCache = null; setHint(objInfo(o)); }
  function dropCarry(msg) { movingKey = null; movingObj = null; carryCache = null; if (msg) setHint(msg); }
  // furniture goes where a crate could stand: free floor of a room, not by a door or the heart, the room stays in one piece
  function objTargetOk(o, x, y) {
    if (fl.phase !== 'build' || (x === o.x && y === o.y)) return false;
    const c0 = cellOf(o.x, o.y); if (!c0) return false;
    const idx = c0.objs.findIndex(q => q[0] === o.x && q[1] === o.y); if (idx < 0) return false;
    const saved = c0.objs.splice(idx, 1)[0]; fl.objects.delete(key(o.x, o.y));
    let ok = false;
    try { ok = crateOk(x, y); } finally { c0.objs.splice(idx, 0, saved); fl.objects.set(key(o.x, o.y), o); }
    return ok;
  }
  function objTarget(o, wx, wy) {
    let best = null, bd = 1.0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.floor(wx) + dx, y = Math.floor(wy) + dy;
      if (!objTargetOk(o, x, y)) continue;
      const d = Math.hypot(wx - (x + 0.5), wy - (y + 0.5)); if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  }
  function moveObj(o, x, y) {
    const c0 = cellOf(o.x, o.y), c1 = cellOf(x, y); if (!c0 || !c1) return false;
    const idx = c0.objs.findIndex(q => q[0] === o.x && q[1] === o.y); if (idx < 0) return false;
    pushUndo(L('przeniesienie: ', 'move: ') + objName(o).toLowerCase());
    const e = c0.objs.splice(idx, 1)[0]; e[0] = x; e[1] = y; c1.objs.push(e);
    const on = fl.items.get(key(o.x, o.y));   // powder, a mimic or a music box rides along
    if (on) { fl.items.delete(key(o.x, o.y)); on.x = x; on.y = y; on.gx = x + 0.5; on.gy = y + 0.5; fl.items.set(key(x, y), on); }
    rebuildDungeon(true); fl.threatDirty = true;
    floatTile(x, y, L('Przeniesione', 'Moved'), '#d8d2c4', 13, -0.6); updateTray(); saveRunSoon();
    return true;
  }
  function removeObj(o) {
    pushUndo(L('usunięcie: ', 'remove: ') + objName(o).toLowerCase());
    let back = 0;
    const on = fl.items.get(key(o.x, o.y));
    if (on) { const b = itemBack(on); fl.items.delete(key(o.x, o.y)); back += b; if (!on.dropped) { bt(on.type).placed--; bt(on.type).spent -= b; } }
    const c = cellOf(o.x, o.y); if (c) c.objs = c.objs.filter(q => !(q[0] === o.x && q[1] === o.y));
    if (o.built) { back += ITEMS.crate.cost; bt('crate').placed--; bt('crate').spent -= ITEMS.crate.cost; }
    fl.essence += back; rebuildDungeon(true); fl.threatDirty = true; updateTray(); saveRunSoon();
    return back;
  }
  // what a finger is on: an element (exact tile, or right next to it when nothing is chosen), else a piece of furniture
  function holdTarget(wx, wy) {
    const x = Math.floor(wx), y = Math.floor(wy);
    const it = fl.items.get(key(x, y)) || (!selected ? itemAt(wx, wy) : null);
    if (it) return { it, x: it.x, y: it.y };
    const o = objOn(x, y); return o ? { o, x: o.x, y: o.y } : null;
  }
  function holdRemove(t) {
    if (!fl || fl.phase !== 'build') return;
    if (t.it) {
      if (fl.items.get(key(t.it.x, t.it.y)) !== t.it) return;
      if (movingKey === key(t.it.x, t.it.y)) dropCarry();
      const T = ITEMS[t.it.type], got = removeItem(t.it);
      floatTile(t.x, t.y, got ? '+' + got + L(' Esencji', ' Essence') : L('Zdjęte', 'Removed'), got ? '#ff7a86' : '#d8d2c4', 14, -0.6);
      setHint(T.name + L(': zdjęte', ': removed') + (got ? ' (+' + got + L(' Esencji).', ' Essence).') : L(' (bez zwrotu).', ' (no refund).')) + L(' Cofnij przywróci.', ' Undo brings it back.'));
    } else if (t.o) {
      if (fl.objects.get(key(t.o.x, t.o.y)) !== t.o) return;
      if (movingObj === key(t.o.x, t.o.y)) dropCarry();
      const nm = objName(t.o), got = removeObj(t.o);
      floatTile(t.x, t.y, got ? '+' + got + L(' Esencji', ' Essence') : L('Usunięte', 'Removed'), got ? '#ff7a86' : '#d8d2c4', 14, -0.6);
      setHint(nm + L(': usunięte', ': removed') + (got ? ' (+' + got + L(' Esencji).', ' Essence).') : '.') + L(' Cofnij przywróci.', ' Undo brings it back.'));
    }
    buzz(30); updateUndoBtn();
  }
  // a tap between waves: true = handled here (pick up, put down, swap what is in hand)
  function buildTap(wx, wy) {
    const x = Math.floor(wx), y = Math.floor(wy);
    let cur = movingKey && fl.items.get(movingKey), curO = movingObj && fl.objects.get(movingObj);
    if (!cur) movingKey = null; if (!curO) movingObj = null;
    const direct = fl.items.get(key(x, y)), dirO = objOn(x, y);
    if (cur || curO) {
      if ((cur && x === cur.x && y === cur.y) || (curO && x === curO.x && y === curO.y && !(direct && direct !== cur))) { dropCarry(L('Odłożone. Stuknij inny element, żeby go przenieść.', 'Put back. Tap another one to move it.')); return true; }
      if (direct && direct !== cur) { pickUp(direct); return true; }
      if (cur) {
        const t = moveTarget(cur, wx, wy);
        if (t) { moveItem(cur, t[0], t[1]); dropCarry(ITEMS[cur.type].name + L(': przeniesione za darmo. Plotki o starym miejscu są już nieaktualne.', ': moved for free. Rumours about the old spot are now out of date.')); return true; }
        if (dirO) { pickUpObj(dirO); return true; }
        note(L('Tu nie pasuje', 'Does not fit here')); if (0) setHint(ITEMS[cur.type].name + L(' tu nie pasuje: potrzebne miejsce typu ' + SLOT_LABEL[ITEMS[cur.type].slot] + ' w pokoju z wolnym miejscem. Stuknij ' + ITEMS[cur.type].name.toLowerCase() + ' jeszcze raz, żeby odłożyć.', ' does not fit here. Tap it again to put it back.'));
        return true;
      }
      if (dirO && dirO !== curO) { pickUpObj(dirO); return true; }
      const t = objTarget(curO, wx, wy);
      if (t) { const nm = objName(curO); moveObj(curO, t[0], t[1]); dropCarry(nm + L(': przeniesione.', ': moved.')); return true; }
      note(L('Tu nie pasuje', 'Does not fit here'));
      return true;
    }
    if (selected && TOOLS[selected] && toolMarkers(selected).some(m => Math.hypot(wx - m.x, wy - m.y) < 0.7)) return false;   // a tool's marker wins
    if (direct) { pickUp(direct); return true; }
    const sel = selected && !TOOLS[selected] && !MODES[selected] ? selected : null;
    if (sel && snapTile(sel, wx, wy) && !(dirO && ITEMS[sel].slot !== 'object')) return false;   // a free spot for what is chosen: place it
    const near = !sel ? itemAt(wx, wy) : null;
    if (near) { pickUp(near); return true; }
    if (dirO) { pickUpObj(dirO); return true; }
    return false;
  }
  // 1.07: a tap in the isometric view. The floor under the finger is the default; but what stands (a trap, a monster, a piece
  // of furniture) or hangs on a wall shows above its own tile, so a tap on its picture counts as a tap on its tile. With a
  // wall trap in hand, a tap on a wall's face or a cut wall picks that wall.
  let TAP = null;   // the screen point of the tap being handled (for the heroes, picked on the screen)
  function withTapCam(sx, sy, fn) {
    const V = splitViews(); if (!V) return fn();
    const v = V[splitSide(sx, sy)], keep = { s: cam.s, ox: cam.ox, oy: cam.oy };
    cam.s = v.s; cam.ox = v.ox; cam.oy = v.oy;
    try { return fn(); } finally { cam.s = keep.s; cam.ox = keep.ox; cam.oy = keep.oy; }
  }
  function tapWorld(sx, sy) {
    return withTapCam(sx, sy, () => {
      const g = fromView((sx + cam.ox) / cam.s, (sy + cam.oy) / cam.s), T = cam.s, gx = Math.floor(g.x), gy = Math.floor(g.y);
      let best = null, bd = 1e9, bdep = -1e9;
      const hit = (x, y, p, hw, hh, dep) => {   // the tap inside the picture (a box around p): the nearest to the camera wins
        const dx = Math.abs(sx - p[0]) / hw, dy = Math.abs(sy - p[1]) / hh;
        if (dx > 1 || dy > 1) return;
        const d = dx + dy;
        if (dep > bdep + 0.01 || (Math.abs(dep - bdep) <= 0.01 && d < bd)) { best = { x: x + 0.5, y: y + 0.5 }; bd = d; bdep = dep; }
      };
      const wallType = selected && ITEMS[selected] && ITEMS[selected].slot === 'wall' ? selected : null, loads = wallType ? roomLoads() : null;
      for (let y = gy - 1; y <= gy + 3; y++) for (let x = gx - 1; x <= gx + 3; x++) {
        if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
        const it = fl.items.get(key(x, y)), o = fl.objects.get(key(x, y));
        if (it && !DRIFT[it.type] && !flatItem(it)) {
          if (WALL_ITEM[it.type]) { const w = wallSpot(it); hit(x, y, W2S(w.x, w.y, w.z), T * 0.42, T * 0.42, x + y + 1.2); }
          else hit(x, y, W2S(x + 0.5, y + 0.5, 0.42), T * 0.4, T * 0.55, x + y + 1);
        }
        if (o) hit(x, y, W2S(x + 0.5, y + 0.5, 0.4), T * 0.42, T * 0.5, x + y + 0.9);
        if (wallType && fl.tiles[y * WW + x] === WALL && !it && canPlace(wallType, x, y, loads)) { const w = wallSpot({ x, y }); hit(x, y, W2S(w.x, w.y, w.z), T * 0.5, T * 0.5, -1000); }   // 1.24: free wall spots lose to anything standing there and, among themselves, the nearest wins (by depth a neighbouring low wall stole the tap: 15-30% of near-wall spots could not be tapped)
      }
      return best || g;
    });
  }
  // the hero whose figure is under the finger (or close to it), on the screen
  function heroAtScreen(sx, sy) {
    let best = null, bd = 1e9;
    alive().forEach(h => {
      if (h.gone) return;
      const p = heroPos(h), V = splitViews(), c = V ? V[SPLIT.gid.get(h.id) || 0] : cam;
      const fx = vX(p.x, p.y) * c.s - c.ox, fy = vY(p.x, p.y, 0) * c.s - c.oy, H = figH(c.s, h.boss), top = fy - H;
      const d = Math.hypot(sx - fx, clamp(sy, top, fy) - sy), lim = Math.max(22, H * 0.45);
      if (d < lim && d < bd) { bd = d; best = h; }
    });
    return best;
  }
  const DOUBLE_TAP_MS = 380; let lastTap = null, lastEmptyTap = null, lastPlaced = null;
  function handleTap(wx, wy) {
    if (!fl || !run) return;
    const x = Math.floor(wx), y = Math.floor(wy); lastTapT = { x, y };
    if (fl.phase === 'build') {   // Prototype 1.0: two quick taps on a placed element upgrade it (the first tap picked it up: put it back)
      const tx = Math.floor(wx), ty = Math.floor(wy), now = performance.now(), it2 = fl.items.get(key(tx, ty)) || (!selected || MODES[selected] ? itemAt(wx, wy) : null);
      if (it2 && lastTap && lastTap.it === it2 && now - lastTap.t < DOUBLE_TAP_MS) { lastTap = null; if (movingKey === key(it2.x, it2.y)) dropCarry(); tapUpgrade(it2); return; }
      lastTap = it2 ? { it: it2, t: now } : null;
      // 1.27.5 (6.7 of the 1.26 plan: repeat the last action where you tap): with nothing in hand, two quick taps on a free spot
      // put the last placed element there again (if it fits and you can pay)
      if (!it2 && !selected && !movingKey && !movingObj && lastPlaced && ITEMS[lastPlaced] && run.unlocked.has(lastPlaced)) {
        if (lastEmptyTap && now - lastEmptyTap.t < DOUBLE_TAP_MS && Math.hypot(wx - lastEmptyTap.wx, wy - lastEmptyTap.wy) < 0.9) {
          lastEmptyTap = null; const t = snapTile(lastPlaced, wx, wy) || [tx, ty]; if (tryPlace(lastPlaced, t[0], t[1])) fl.stats.repeatPlace = (fl.stats.repeatPlace || 0) + 1; return;
        }
        lastEmptyTap = { t: now, wx, wy };
      } else lastEmptyTap = null;
    }
    if (fl.phase === 'build' && selected === 'upgrade') { const it = itemAt(wx, wy); if (it) tapUpgrade(it); else setHint(L('Stuknij postawioną pułapkę albo potwora. Koszt ulepszenia widać nad nim.', 'Tap a placed trap or monster. The upgrade cost shows above it.')); return; }
    if (fl.phase === 'build' && buildTap(wx, wy)) return;
    if (fl.phase === 'build' && selected && TOOLS[selected]) {
      let best = null, bd = 1.8;
      toolMarkers(selected).forEach(m => { const d = Math.hypot(wx - m.x, wy - m.y); if (d < bd) { bd = d; best = m; } });
      if (best) applyTool(best); else setHint(L('Stuknij jeden ze znaczników na mapie.', 'Tap one of the markers on the map.'));
      return;
    }
    const outside = x < 0 || y < 0 || x >= WW || y >= WH;   // 1.24 (B): a tap above a hero at the map's top edge lands outside it, but his figure and bars are on the screen
    if (outside && fl.phase !== 'raid') return;
    const k = key(x, y), it = fl.items.get(k);
    if (fl.phase === 'build') {
      if (selected && !TOOLS[selected]) { const t = snapTile(selected, wx, wy); if (tutWayOnly(selected, t || [x, y])) return; if (t) { tryPlace(selected, t[0], t[1]); return; } }   // 1.24 (B, P1-5): tutWayOnly
      if (fl.breach && !selected && Math.hypot(wx - (fl.breach.x + 0.5), wy - (fl.breach.y + 0.5)) <= 1.1) { openModal({ type: 'breach' }); return; }   // patch it?
      if (selected) { const t = snapTile(selected, wx, wy) || [x, y]; tryPlace(selected, t[0], t[1]); return; }
      const s = slotOf(x, y);
      setHint((s ? L('To miejsce: ' + SLOT_LABEL[s] + '. Wybierz na pasku budowy coś, co tu pasuje.', 'This spot: ' + SLOT_LABEL[s] + '. Pick something from the build bar that fits here.') : L('Wybierz element na pasku budowy, a pasujące miejsca się podświetlą.', 'Pick an element from the build bar and the spots that fit will light up.')) + L(' Postawiony element: stuknij, żeby przenieść, przytrzymaj, żeby zdjąć.', ' Placed ones: tap to move, hold to remove.'));
      return;
    }
    if (fl.phase !== 'raid') return;
    if (selected && !TOOLS[selected] && !outside) { const t = snapTile(selected, wx, wy) || [x, y]; tryPlace(selected, t[0], t[1]); return; }
    // v14: no more putting traps to sleep; a tap on a hero opens his full card (the game pauses)
    const fb = TAP ? fearBarAt(TAP[0], TAP[1]) : null; if (fb) noteFearUi('bar');   // 1.24 (B, P1-4): the fear bar looked at
    const best = (TAP ? heroAtScreen(TAP[0], TAP[1]) : null) || fb;   // 1.07: the figure under the finger, on the screen   // the distance to the figure, feet to head
    if (best) { if (!paused) setPaused(true); openModal({ type: 'hero', id: best.id, unpause: true }); }
  }
  function tryPlace(type, x, y) {
    const T = ITEMS[type], cost = costOf(type);
    if (T.tool) return false;
    if (!run.unlocked.has(type)) { note(L('Zablokowane', 'Locked'), x, y); return false; }
    if (fl.essence < cost) { note(L('Za mało Esencji', 'Not enough Essence'), x, y); return false; }
    if (BUILDINGS[type] && !canPlace(type, x, y)) {
      const r = roomOf(x, y);
      if (fl.phase !== 'build') { note(L('Tylko między falami', 'Only between waves'), x, y); return false; }
      if (r >= 0 && fl.rooms[r].kind !== 'room') { note(L('Tylko w pokoju', 'Only in a room'), x, y); return false; }
      if (r >= 0 && [...fl.items.values()].some(o => o.type === type && roomOf(o.x, o.y) === r)) { note(L('Już stoi w tym pokoju', 'Already in this room'), x, y); return false; }
      if (!fl.items.has(key(x, y)) && !blockerOk(x, y)) { note(L('Zablokuje przejście', 'Would block the way'), x, y); return false; }
    }
    if (!canPlace(type, x, y)) {
      if (slotOf(x, y) === T.slot && !fl.items.has(key(x, y)) && roomFull(type, x, y)) { const R = fl.rooms[slotRoom(type, x, y)]; note(L((R.kind === 'hall' ? 'Korytarz' : 'Pokój') + ' pełny (', (R.kind === 'hall' ? 'Corridor' : 'Room') + ' full (') + roomCap(R) + ')', x, y); if (0) setHint(L((R.kind === 'hall' ? 'Ten korytarz' : 'Ten pokój') + ' jest pełny (' + roomCap(R) + '). Rozbuduj go albo wykop nowy pokój (zakładka Loch), albo zdejmij coś stąd.', 'Full (' + roomCap(R) + '). Expand it, dig a new room (Dungeon tab) or remove something.')); return false; }
      if (type === 'crate') { note(fl.phase !== 'build' ? L('Tylko między falami', 'Only between waves') : L('Tu nie pasuje', 'Does not fit here'), x, y); return false; }
      note(L('Tu nie pasuje', 'Does not fit here'), x, y); return false;
    }
    if (fl.phase === 'build') pushUndo(L('postawienie: ', 'place: ') + T.name);
    lastPlaced = type;   // 1.27.5: two taps on a free spot put it down again
    if (type === 'crate') {
      const c = run.layout.cells.get(fl.rooms[roomOf(x, y)].key);
      c.objs.push([x, y, 'crate', 1]);
      fl.essence -= T.cost; bt(type).placed++; bt(type).spent += T.cost; fl.stats.built++;
      rebuildDungeon(); updateTray();
      setHint(L('Skrzynia stoi. Możesz postawić na niej Proch albo Mimika (zakładka Pułapki).', 'Crate placed. You can put Gunpowder or a Mimic on it (Traps tab).'));
      return true;
    }
    const hp = MONSTERS[type] ? ITEMS[type].hp * mods.monster : 0;
    fl.items.set(key(x, y), { type, x, y, cd: fl.phase === 'raid' && TRAPS[type] && !mods.quickArm ? ARM_TIME : 0, quick: fl.phase === 'raid' && !!TRAPS[type] && !!mods.quickArm, anim: 0,   /* 1.18 Szybki montaż: its first shot +50% */ disabled: false, hp, max: hp, power: mods.monster, shot: 0.5, flash: 0, preview: 1.4, gx: x + 0.5, gy: y + 0.5, lvl: 1, spent: cost });
    { const ms = run.memSpots && run.memSpots[key(x, y)]; if (ms && ms[0] === type && ms[2] === 1) { const it = fl.items.get(key(x, y)); it.memRes = ms[1]; it.memLvl = 1; } }   // 1.09: put back on its spot, it remembers its answer
    fl.items.get(key(x, y)).popR = realNow; dustAt(x, y);   // 1.09: it lands with a pop
    fl.essence -= cost; bt(type).placed++; bt(type).spent += cost;
    if (fl.phase === 'build') saveRunSoon();
    if (fl.phase === 'raid') {
      fl.stats.built++; tl('bd', type, x, y);
      // built in plain sight: whoever stands in that room (or within 3 tiles) sees it appear
      const it = fl.items.get(key(x, y)), r = roomOf(x, y);
      const witness = TRAPS[type] && alive().find(h => (r >= 0 && h.room === r && fl.rooms[r].kind === 'room') || Math.hypot(h.tx - x, h.ty - y) <= 3);
      if (witness) { learnTrap(it, 'seen', null); say(witness, pick(SAY.seenBuilt), 3); }
      if (MONSTERS[type]) fl.threatDirty = true;
    }
    updateTray();
    if (fl.phase === 'raid' && isLoot(type)) replanAll();
    if (ACTIVE[type]) setHint(T.name + L(': podświetlony obszar to zasięg. Stuknij, żeby przenieść, stuknij dwa razy, żeby ulepszyć, przytrzymaj, żeby zdjąć.', ': the lit area is its range. Tap to move, double tap to upgrade, hold to remove.'));   // 1.05: it still said one tap upgrades
    else if (BUILDINGS[type]) { const d = T.desc; setHint(T.name + L(' stoi. ', ' placed. ') + d.charAt(0).toUpperCase() + d.slice(1)); }
    return true;
  }
  /* ================= 1.25: a mouse, a touchpad and the keys ================= */
  // A right click on a placed element (or furniture) asks first: the element is marked and the hint says what it gives back; a second
  // right click on it within 3 s takes it down (as a held finger does). In a wave a right click does nothing.
  let rcMark = null;
  function rightClick(p) {
    if (!fl || fl.phase !== 'build') return;
    const w = tapWorld(p.x, p.y), t = holdTarget(w.x, w.y);
    if (!t) { rcMark = null; return; }
    if (rcMark && rcMark.x === t.x && rcMark.y === t.y && realNow - rcMark.t < 3) { rcMark = null; holdRemove(t); return; }
    rcMark = { x: t.x, y: t.y, t: realNow };
    const back = t.it ? itemBack(t.it) : 0;
    floatTile(t.x, t.y, L('Zdjąć' + (back ? ' za +' + back : '') + '? Prawy jeszcze raz', 'Remove' + (back ? ' for +' + back : '') + '? Right-click again'), '#d8d2c4', 13, -0.6);   // (the hint line is gone since 1.17: the question floats over the element)
  }
  // the tip over what rests under the mouse on the map: a hero (in a wave), an element, a piece of furniture
  let hovT = 0, hovKey = '';
  function hideHov() { clearTimeout(hovT); hovT = 0; const h = $('#hov'); if (h && !h.hidden) h.hidden = true; hovKey = ''; document.documentElement.classList.remove('hovpt'); }
  function hovWhat(p) {
    if (fl.phase === 'raid') { const h = heroAtScreen(p.x, p.y); if (h) return { k: 'h' + h.id, h }; }
    if (fl.phase !== 'build' && fl.phase !== 'raid') return null;
    const w = tapWorld(p.x, p.y), it = fl.items.get(key(Math.floor(w.x), Math.floor(w.y))) || itemAt(w.x, w.y);
    if (it && ITEMS[it.type]) return { k: 'i' + it.x + ',' + it.y, it };
    const o = fl.phase === 'build' ? objOn(Math.floor(w.x), Math.floor(w.y)) : null;
    return o ? { k: 'o' + o.x + ',' + o.y, o } : null;
  }
  function hoverAt(p, cx, cy) {
    if (!fl || modalOpen || pointers.size) { hideHov(); return; }
    const w = hovWhat(p), k = w ? w.k : '';
    document.documentElement.classList.toggle('hovpt', !!w);
    const box = $('#hov');
    if (k && k === hovKey && !box.hidden) { placeHov(box, cx, cy); return; }
    clearTimeout(hovT); if (!box.hidden) box.hidden = true; hovKey = k;
    if (!w) return;
    hovT = setTimeout(() => { hovT = 0; if (hovKey === k && fl && !modalOpen && !pointers.size) showHov(w, cx, cy); }, 300);
  }
  function placeHov(box, cx, cy) {
    const z = UIZ, bw = box.offsetWidth * z, bh = box.offsetHeight * z;
    const x = cx + 18 + bw > innerWidth - 8 ? cx - 14 - bw : cx + 18, y = Math.min(innerHeight - bh - 8, cy + 20);
    box.style.left = (Math.max(8, x) / z).toFixed(1) + 'px'; box.style.top = (Math.max(8, y) / z).toFixed(1) + 'px';
  }
  function showHov(w, cx, cy) {
    const box = $('#hov'); box.innerHTML = '';
    if (w.h) {
      const h = w.h; box.appendChild(el('b', null, h.nm[0] + (h.nemesis ? ' ' + h.nemesis.title : '')));
      box.appendChild(el('div', 'hs', h.T.name[h.female ? 1 : 0] + L(' · poz. ', ' · lvl ') + h.lvl + (h.boss ? ' · ' + BOSS_NAME[h.boss][h.female ? 1 : 0] : '')));
      box.appendChild(el('div', null, L('Życie ', 'HP ') + Math.max(0, Math.ceil(h.hp)) + '/' + Math.round(h.max) + L(' · strach ', ' · fear ') + Math.round(100 * clamp(h.fear / h.courage, 0, 1)) + '%' + (h.crystal ? L(' · niesie kryształ!', ' · has a crystal!') : '')));
      box.appendChild(el('div', 'hk', L('Kliknij: karta bohatera', 'Click: hero card')));
    } else if (w.it) {
      const it = w.it, I = ITEMS[it.type], lb = effWords(it.type);
      box.appendChild(el('b', null, I.name + ((it.lvl || 1) > 1 ? L(' · poz. ', ' · lvl ') + it.lvl : '')));
      if (I.tag) box.appendChild(el('div', 'hs', I.tag));
      if (lb.length || tagChips(it.type).length) box.appendChild(tagRow(it.type));   // 1.27.6: with place, reach, family
      const d = I.desc; box.appendChild(el('div', null, d.charAt(0).toUpperCase() + d.slice(1)));
      if (fl.phase === 'build') box.appendChild(el('div', 'hk', L('Kliknij: przenieś · dwa razy: ulepsz · prawy: zdejmij', 'Click: move · double: upgrade · right: remove')));
    } else if (w.o) {
      box.appendChild(el('b', null, objName(w.o)));
      box.appendChild(el('div', 'hk', L('Kliknij: przenieś · prawy: ' + (w.o.built ? 'zdejmij' : 'usuń'), 'Click: move · right: remove')));
    }
    box.hidden = false; placeHov(box, cx, cy);
  }
  // a touchpad: two fingers move the map, a pinch zooms (the browser sends it as a wheel with Ctrl); a mouse wheel zooms
  let padUntil = 0, gs0 = 0;
  function wheelIsPad(e, dx, dy) { return e.deltaMode === 0 && (dx !== 0 || Math.abs(dy) < 40 || dy % 1 !== 0); }
  // WASD and the arrows move the camera while they are held
  const PANKEYS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  const keyPan = new Set(); let keyPanRaf = 0, keyPanT = 0;
  function keyPanGo() {
    if (keyPanRaf) return; keyPanT = performance.now();
    const step = now => {
      const dt = Math.min(0.05, Math.max(0, (now - keyPanT) / 1000)); keyPanT = now;
      if (!keyPan.size || !fl || modalOpen) { keyPanRaf = 0; keyPan.clear(); return; }
      let vx = 0, vy = 0; keyPan.forEach(k => { vx += PANKEYS[k][0]; vy += PANKEYS[k][1]; });
      const sp = 650 * dt; cam.ox += vx * sp; cam.oy += vy * sp; clampCam(true); cam.manualUntil = realNow + 4; FP.input = FP.touch = performance.now(); kick();
      keyPanRaf = requestAnimationFrame(step);
    };
    keyPanRaf = requestAnimationFrame(step);
  }
  window.addEventListener('blur', () => keyPan.clear());
  function keyZoom(k) { if (!fl) return; zoomAt(cam.s * (k > 0 ? 1.15 : 1 / 1.15), cw / 2, ch / 2); cam.manualUntil = realNow + 5; }
  function keyTab(d) {
    const tabs = [...document.querySelectorAll('#tabs .tab')].filter(b => !b.hidden), i = tabs.findIndex(b => b.getAttribute('aria-selected') === 'true');
    if (tabs.length) tabs[(i + d + tabs.length) % tabs.length].click();
  }
  const pointers = new Map();
  let gesture = null, holdTimer = null;
  const localXY = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left - OX, y: e.clientY - r.top - OY }; };   // 1.24 (B): in the view (the canvas is the whole screen)
  cv.addEventListener('pointerdown', e => {
    if (!fl || modalOpen) return;
    e.preventDefault(); hideHov();
    if (e.button === 2) { if (!pointers.size) rightClick(localXY(e)); return; }   // 1.25: a right click = a held finger, after asking
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    const p = localXY(e); pointers.set(e.pointerId, p);
    if (pointers.size === 1 && e.button === 1) { gesture = { type: 'pan', sx: p.x, sy: p.y, ox: cam.ox, oy: cam.oy, moved: false, handled: true }; return; }   // 1.25: the middle button only drags
    if (pointers.size === 1) {
      // a skill check is answered by a tap on the MAP (and only there)
      if (fl.phase === 'raid' && fl.check && !fl.check.result && !paused) {
        resolveCheck();
        gesture = { type: 'pan', sx: p.x, sy: p.y, ox: cam.ox, oy: cam.oy, moved: false, handled: true };
        return;
      }
      gesture = { type: 'pan', sx: p.x, sy: p.y, ox: cam.ox, oy: cam.oy, moved: false, handled: false };
      clearTimeout(holdTimer); holdInfo = null;
      if (fl.phase === 'build') {   // v15.1: a finger held on something takes it down
        const w = tapWorld(p.x, p.y), t = holdTarget(w.x, w.y);
        if (t) {
          holdInfo = { x: t.x, y: t.y, t0: realNow, dur: HOLD_DEL };
          holdTimer = setTimeout(() => { if (gesture && !gesture.moved && pointers.size === 1 && fl.phase === 'build' && !modalOpen) { gesture.handled = true; holdRemove(t); } holdInfo = null; }, HOLD_DEL * 1000);
        }
      }
      if (fl.phase === 'raid' && (!paused || tutHoldOk())) holdTimer = setTimeout(() => {   // hold still = fast-forward (1.15.1: also the hold the guide asks for, which lets the game go)
        if (gesture && !gesture.moved && pointers.size === 1 && fl.phase === 'raid' && (!paused || tutHoldOk())) { if (paused) { tutPausedIt = false; setPaused(false, true); } if (paused) return; ff = true; gesture.handled = true; tutFlags.ffUsed = true; tl('ff', 1); }
      }, 280);
    } else if (pointers.size === 2) {
      ff = false; clearTimeout(holdTimer); holdInfo = null;
      const [a, b] = [...pointers.values()];
      gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: cam.s };
      cam.manualUntil = realNow + 5;
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) { if (e.pointerType === 'mouse' && !e.buttons) hoverAt(localXY(e), e.clientX, e.clientY); return; }   // 1.25: the hover tip
    const p = localXY(e); pointers.set(e.pointerId, p);
    if (!gesture) return;
    if (gesture.type === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      zoomAt(gesture.s0 * (Math.hypot(a.x - b.x, a.y - b.y) || 1) / gesture.d0, (a.x + b.x) / 2, (a.y + b.y) / 2);
      cam.manualUntil = realNow + 5;
    } else if (gesture.type === 'pan') {
      const dx = p.x - gesture.sx, dy = p.y - gesture.sy;
      // 1.25 (author: dragging did not work on a computer): a mouse pressed still for 0,3 s turned on the fast-forward and the drag
      // after it moved nothing. Now moving away (14 px with a mouse, 26 with a finger, which trembles) ends the fast-forward and drags.
      if (ff && !gesture.moved && Math.hypot(dx, dy) > (e.pointerType === 'mouse' ? 14 : 26)) { ff = false; tl('ff', 0); gesture.moved = true; }
      if (!gesture.moved && Math.hypot(dx, dy) > 8 && !ff) { gesture.moved = true; clearTimeout(holdTimer); holdInfo = null; }
      if (gesture.moved) { document.documentElement.classList.add('dragging'); cam.ox = gesture.ox - dx; cam.oy = gesture.oy - dy; clampCam(true); cam.manualUntil = realNow + 4; }
    }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId); if (!pointers.size) document.documentElement.classList.remove('dragging');
    clearTimeout(holdTimer); holdInfo = null;
    if (ff) { ff = false; gesture = null; tl('ff', 0); return; }
    if (!gesture) return;
    if (gesture.type === 'pinch') { if (!pointers.size) gesture = null; return; }
    if (!gesture.moved && !gesture.handled && e.type === 'pointerup') {
      const r = uiRects.list;
      if (r && gesture.sx >= r.x && gesture.sx <= r.x + r.w && gesture.sy >= r.y && gesture.sy <= r.y + r.h) {
        const row = UI.listOpen && (uiRects.rows || []).find(q => gesture.sy >= q.y0 && gesture.sy < q.y1);   // v14: a row opens the hero's card
        if (row) { const pause = fl.phase === 'raid' && !paused; if (pause) setPaused(true); openModal(Object.assign({ type: 'hero', unpause: pause }, row.ref)); gesture = null; return; }
        UI.listOpen = !UI.listOpen; saveUI(); gesture = null; if (UI.listOpen) notePreview(); return;   // 1.24 (D, P0-6)
      }
      const w = tapWorld(gesture.sx, gesture.sy); TAP = [gesture.sx, gesture.sy]; try { handleTap(w.x, w.y); } finally { TAP = null; }
    }
    gesture = null;
  }
  cv.addEventListener('pointerup', endPointer);
  cv.addEventListener('pointercancel', endPointer);
  cv.addEventListener('wheel', e => {
    if (!fl) return;
    e.preventDefault(); hideHov();
    const p = localXY(e), u = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? ch : 1, dx = e.deltaX * u, dy = e.deltaY * u;
    if (e.ctrlKey) zoomAt(cam.s * Math.exp(-clamp(dy, -50, 50) * 0.01), p.x, p.y);   // 1.25: a touchpad pinch (and Ctrl + wheel)
    else if (realNow < padUntil || wheelIsPad(e, dx, dy)) { padUntil = realNow + 0.35; cam.ox += dx; cam.oy += dy; clampCam(true); }   // 1.25: two fingers on a touchpad move the map (they zoomed)
    else zoomAt(cam.s * (dy < 0 ? 1.15 : 1 / 1.15), p.x, p.y);   // a mouse wheel: a step of zoom
    cam.manualUntil = realNow + 5;
  }, { passive: false });
  // 1.25: Safari sends a touchpad pinch as its own gesture (a touch pinch on an iPad comes as two pointers and is handled above)
  cv.addEventListener('gesturestart', e => { e.preventDefault(); gs0 = cam.s; });
  cv.addEventListener('gesturechange', e => { if (!fl || pointers.size > 1 || !gs0) return; e.preventDefault(); const p = localXY(e); zoomAt(gs0 * e.scale, p.x, p.y); cam.manualUntil = realNow + 5; });
  cv.addEventListener('gestureend', () => { gs0 = 0; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerleave', hideHov);
  $('#btn-action').addEventListener('click', () => {
    if (!fl || modalOpen) return;
    if (fl.phase === 'build') { if (askUnspent()) return; startWave(); return; }   // 1.24 (D, P1-2): the question about unspent Esencja first
  });
  // 1.07: leaving the app in a wave opens the build tray: the game waits paused, and folding the tray plays on
  document.addEventListener('visibilitychange', () => { if (document.hidden && fl && fl.phase === 'raid') { if (!trayIsOpen()) setTrayOpen(true); else if (!paused) setPaused(true); } });
  document.addEventListener('keydown', e => {
    if (!fl || modalOpen || (e.target && e.target.tagName === 'INPUT')) return;
    if (e.code === 'Space' && fl.phase === 'raid') { e.preventDefault(); if (fl.check && !fl.check.result) resolveCheck(); }
    if (e.code === 'KeyP' && fl.phase === 'raid' && !tutPopNow) setTrayOpen(!trayIsOpen(), true);
    if (e.code === 'KeyF' && fl.phase === 'raid' && (!paused || tutHoldOk()) && !ff) { if (paused) { tutPausedIt = false; setPaused(false, true); } if (!paused) { ff = true; tutFlags.ffUsed = true; tl('ff', 1); } }
    if (e.code === 'Escape' && (selected || movingKey || movingObj)) { selected = null; movingKey = null; movingObj = null; updateTray(); setHint(L('Wybierz element i stuknij pasujące miejsce.', 'Pick an element and tap a spot where it fits.')); }
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && fl.phase === 'build') { e.preventDefault(); undo(); }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // 1.25: the keys (the list: Menu > Sterowanie)
    const k = e.code, game = !e.target || e.target === document.body || !!(e.target.closest && e.target.closest('#app'));
    if (PANKEYS[k] && game) { e.preventDefault(); keyPan.add(k); keyPanGo(); return; }
    if (k === 'Equal' || k === 'NumpadAdd') { keyZoom(1); return; }
    if (k === 'Minus' || k === 'NumpadSubtract') { keyZoom(-1); return; }
    const dg = /^(?:Digit|Numpad)([0-9])$/.exec(k);
    if (dg && game) { const b = document.querySelector('#tray > .item[data-k="' + dg[1] + '"]'); if (b && !b.hidden) { e.preventDefault(); b.click(); } return; }
    if ((k === 'KeyQ' || k === 'KeyE') && game) { keyTab(k === 'KeyQ' ? -1 : 1); return; }
    if ((k === 'Enter' || k === 'NumpadEnter') && game && fl.phase === 'build') { e.preventDefault(); $('#btn-action').click(); return; }
    if (k === 'KeyB' && (fl.phase === 'build' || (fl.phase === 'raid' && !tutPopNow))) setTrayOpen(!trayIsOpen(), true);
  });
  document.addEventListener('keyup', e => { keyPan.delete(e.code); if (e.code === 'KeyF' && ff) { ff = false; tl('ff', 0); } });
  function dungeonBounds() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    fl.rooms.forEach(R => R.tiles.forEach(t => { x0 = Math.min(x0, t[0]); y0 = Math.min(y0, t[1]); x1 = Math.max(x1, t[0]); y1 = Math.max(y1, t[1]); }));
    return x0 > x1 ? { x0: 0, y0: 0, x1: WW, y1: WH } : { x0: x0 - 1.5, y0: Math.max(-1, y0 - 2), x1: x1 + 2.5, y1: y1 + 2.5 };
  }
  if ($('#btn-zoom')) $('#btn-zoom').addEventListener('click', () => {
    if (!fl) return;
    if (cam.s < buildScale() * 0.92) zoomAt(buildScale(), cw / 2, ch / 2);
    else {   // 1.07: the whole dungeon in view (its turned corners)
      const b = dungeonBounds(), C = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]], us = C.map(q => vX(q[0], q[1])), vs = C.map(q => vY(q[0], q[1], 0));
      const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs) - WALL_H * CP, v1 = Math.max(...vs);
      cam.s = clamp(Math.min(cw / (u1 - u0), ch / (v1 - v0)), fitScale() * 0.95, buildScale() * 0.9); centerOnView((u0 + u1) / 2, (v0 + v1) / 2); updateZoomBtn();
    }
    cam.manualUntil = realNow + 6;
  });
  { const hr = $('#h-hrow'), go = () => { if (modalOpen || !run || !fl) return; const pause = fl.phase === 'raid' && !paused; if (pause) setPaused(true); openModal({ type: 'heart', unpause: pause }); }; hr.addEventListener('click', go); hr.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); }   // 1.26: the heart's card
  $('#btn-settings').addEventListener('click', () => { if (!modalOpen) { const pause = !!(fl && fl.phase === 'raid' && !paused); if (pause) setPaused(true); openModal({ type: 'menu', unpause: pause }); } });
  window.addEventListener('resize', () => { applyLayout(); if (fl) resize(); coachSync(); hideHov(); });   // 1.25: the layout follows the screen (a tablet turned, a window resized)
  try { new ResizeObserver(() => { if (fl) resize(); }).observe(stage); } catch (e) {}   // the tray grows to two rows on the deck tab

  /* ================= interactive tutorial ================= */
  // A coach panel over the bottom of the map, one step at a time. Each step waits for the thing it asks for.
  let tutFlags = {}, tutT = 0, tutLast = 0, tutPausedIt = false;   // 1.15.1: the game stands because a step of the guide said so
  const countType = t => [...fl.items.values()].filter(it => it.type === t).length;
  // 1.24 (B, P1-5: a tester's spikes never fired in the guide): the guide's spikes go on the heroes' way (from a quarter of it on,
  // like the ring), so a hero steps on them in wave 1 (and tutSpikeSure makes them go off)
  function tutWayOnly(type, t) {
    const st = run && run.tut >= 0 ? TUT[run.tut] : null;
    if (!st || st.id !== 'place' || type !== 'spikes' || !t || !fl || fl.phase !== 'build') return false;
    const P = shortestPath(), n = P.length, k0 = Math.floor(n * 0.25);
    for (let k = k0; k < n; k++) if (P[k][0] === t[0] && P[k][1] === t[1]) return false;
    note(L('Na ich trasie: pole z kółkiem', 'On their path: the ringed tile'), t[0], t[1]); tutFlags.offWay = (tutFlags.offWay || 0) + 1;
    return true;
  }
  function tutPathTile(frac, type) {
    const P = shortestPath();
    for (let k = Math.floor(P.length * frac); k < P.length; k++) if (canPlace(type, P[k][0], P[k][1])) return P[k];
    return null;
  }
  function tutWallTile(type) {
    type = type || 'arrows';
    const P = shortestPath(), on = new Set(P.slice(0, Math.ceil(P.length * 0.7)).map(p => key(p[0], p[1])));
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (canPlace(type, x, y) && areaOf({ type, x, y }).some(a => on.has(key(a[0], a[1])))) return [x, y];
    return null;
  }
  const trayOpen = () => !$('#drawer').classList.contains('closed');
  // 1.05: the item to upgrade in the tutorial: the newest trap the player placed (or any trap)
  const tutUpTarget = () => { const its = [...fl.items.values()].filter(o => TRAPS[o.type] && (o.lvl || 1) < 3); return its.find(o => !o.sys && o.type === 'spikes') || its.find(o => !o.sys) || its[0] || null; };
  // 1.04 (testers: the coach covered much of the map, and the checks): short steps; in a wave the coach sits at the top of the map
  // in a line or two, and the moments that matter stop the game once with a short card (TUT_POP). The theory moved to wave 2's build.
  // 1.05 (author: as much as possible by doing): open the build bar, move, place spikes, arrows, a portrait and coins, upgrade
  // something; in the wave tap a check, a hero and hold to speed up (no timeouts: each waits for the player or Pomiń krok).
  // 1.12 (author: the tutorial spread over a few runs): the guide covers the first run only, step by step over its first three
  // waves (wave 1: placing, the check, the equation; wave 2: the heart, loot, upgrades, the deck; wave 3: digging). What the
  // later runs add comes as a card at their start (ONB_STAGES) and as a short card the first time it happens (TUT_POP).
  // 1.24 (B, author: slim the tutorial, show placing once, show that a held finger opens a tile's description): placing is shown once
  // (spikes on the heroes' way); a held finger on a tile opens what it does; moving is optional; loot and digging are said, not
  // demanded. What the rest of the run brings comes as a card at the wave it opens (ONB_WAVE).
  const TUT = [
    { id: 'intro', text: L('To Twój loch. Bohaterowie przyjdą falami, żeby ukraść kryształy z serca (ostatni pokój). Dwie pułapki już stoją, ale to za mało.', 'This is your dungeon. Heroes come in waves to steal crystals from your heart (the last room). Two traps are already there, but that is not enough.'), next: true },
    { id: 'spikes', text: L('Wybierz Kolce na pasku budowy.', 'Pick Spikes from the build bar.'), hl: ['#tab-traps', '#item-spikes'], prep: () => { movingKey = null; movingObj = null; pickTab('traps', 'spikes'); updateTray(); setTrayOpen(true); }, done: () => selected === 'spikes' || countType('spikes') > (tutFlags.sp0 || 0) },
    { id: 'place', text: L('Stuknij pole z pulsującym kółkiem. Kolce staną na trasie bohaterów.', "Tap the tile with the pulsing ring. The spikes go on the heroes' path."), tile: () => tutPathTile(0.25, 'spikes'), done: () => countType('spikes') > (tutFlags.sp0 || 0) },
    { id: 'hold', text: () => PC() ? L('Najedź myszką na kafelek Strzały (albo kliknij go prawym przyciskiem). Zobaczysz, co robią. Tak sprawdzisz każdy element.', 'Hover over the Arrows tile (or right-click it) to see what it does. This works for every element.') : L('Przytrzymaj palec na kafelku Strzały. Zobaczysz, co robią. Tak sprawdzisz każdy element.', 'Hold your finger on the Arrows tile to see what it does. This works for every element.'), hl: ['#item-arrows'], prep: () => { selected = null; tutFlags.tip0 = tutFlags.tipN || 0; pickTab('traps', 'arrows'); setTrayOpen(true); }, done: () => (tutFlags.tipN || 0) > (tutFlags.tip0 || 0), skip: true },
    { id: 'move', text: () => movingKey ? L('Masz ją w ręce. Stuknij pole z przerywaną ramką.', 'It is in your hand. Tap the tile with the dashed frame.') : L('Pułapki przenosisz za darmo. Stuknij tę w kółku, żeby ją podnieść.', 'Moving traps is free. Tap the ringed one to pick it up.'), tile: () => { const it = [...fl.items.values()].find(o => o.sys); return it ? [it.x, it.y] : null; }, prep: () => { selected = null; updateTray(); }, done: () => !!tutFlags.moved, skip: true },
    { id: 'spend', text: () => L('Masz jeszcze ' + Math.floor(fl.essence) + ' Esencji. Wydaj ją teraz: postaw więcej pułapek przy trasie. Kolce idą na podłogę, Strzały na ścianę.', 'You still have ' + Math.floor(fl.essence) + ' Essence. Spend it now: place more traps along the path. Spikes go on the floor, Arrows on a wall.'), hl: ['#tab-traps'], prep: () => { selected = null; tab = 'traps'; updateTray(); }, done: () => fl.phase !== 'build' || fl.essence < 3 || !tutAnySpot(), skip: true },
    { id: 'go', text: L('Gotowe. Stuknij „Wypuść falę”.', 'Ready. Tap "Release wave".'), hl: ['#btn-action'], done: () => fl.phase === 'raid' },
    // the wave: one line at the top; the first check jumps to 'check' (after its card)
    { id: 'novice', text: L('Nadchodzą nowicjusze. Każda rana daje Grozę, a linia u góry zamienia Grozę w Esencję.', 'Rookies are coming. Every wound gives Dread, and the line at the top turns Dread into Essence.'), hl: ['#h-eq'], raid: true, ack: true },   // 1.15.1: the game stands until Rozumiem (was: gone after 9 s, the game going on)
    { id: 'check', text: L('Stuknij w mapę, gdy koralik będzie w obwódce. Wypełniona strefa to krytyk.', 'Tap the map when the bead is inside the outline. The filled zone is a crit.'), raid: true, done: () => tutFlags.resolved || (!fl.check && tutT > 2) },
    { id: 'herocard', text: L('Stuknij bohatera albo listę w rogu, żeby zobaczyć jego kartę.', 'Tap a hero, or the list in the corner, to see their card.'), raid: true, skip: true, done: () => tutFlags.heroCard },
    { id: 'ff', text: () => L((PC() ? 'Przytrzymaj F (albo lewy przycisk myszy na mapie)' : 'Przytrzymaj palec na mapie') + ', żeby przyspieszyć grę. Pułapki biją wtedy same, bez skill checków, więc nie trafisz nowego krytyka.', (PC() ? 'Hold F (or the left mouse button on the map)' : 'Hold your finger on the map') + " to speed up. Traps then fire on their own, with no skill checks, so you won't land a new crit."), raid: true, skip: true, hold: true, done: () => tutFlags.ffUsed },
    // wave 2 (after the first card from the shop and the card about the heart)
    { id: 'loot', wave: 2, text: L('Łup wabi bohaterów i podbija Chciwość, a Chciwość mnoży Esencję. Stawiaj go na ich trasie.', 'Loot lures heroes and raises Greed, and Greed multiplies your Essence. Put it on their path.'), build: true, hl: ['#tab-loot'], prep: () => { pickTab('loot'); setTrayOpen(true); }, next: true },
    { id: 'upgrade', wave: 2, text: () => { const it = tutUpTarget(); return L('Ulepszenie: stuknij dwa razy ' + (it ? ITEMS[it.type].name.toLowerCase() : 'pułapkę') + ' w kółku (' + (it ? upgCost(it) : 6) + ' Esencji). Ulepszona pułapka bije mocniej.', 'To upgrade, double tap the ringed ' + (it ? ITEMS[it.type].name : 'trap') + ' (' + (it ? upgCost(it) : 6) + ' Essence). Upgraded traps hit harder.'); }, build: true, tile: () => { const it = tutUpTarget(); return it ? [it.x, it.y] : null; }, prep: () => { selected = null; updateTray(); const it = tutUpTarget(); if (it && fl.essence < upgCost(it)) fl.essence = upgCost(it); }, done: () => !!tutFlags.upgraded, skip: true },
    { id: 'deck', wave: 2, text: () => L('Twoja karta leży w talii i działa do końca runu. Po każdej fali dostajesz darmową kartę. Pierwszy kafelek otwiera sklep.', 'Your card is in your deck and works for the rest of the run. After each wave you get a free card. The first tile opens the shop.'), build: true, hl: ['#tab-deck'], prep: () => { tab = 'deck'; updateTray(); setTrayOpen(true); }, next: true },
    // wave 3
    { id: 'dig', wave: 3, text: L('Pokój mieści tylko kilka elementów. Gdy zabraknie miejsca, wykop nowy pokój w zakładce Loch.', 'A room holds only a few elements. When you run out of space, dig a new room in the Dungeon tab.'), build: true, hl: ['#tab-dungeon', '#item-dig'], prep: () => { pickTab('dungeon', 'dig'); setTrayOpen(true); }, next: true },
    { id: 'end', wave: 3, text: L('To koniec samouczka. Resztę gry poznasz w tym runie, fala po fali. Powodzenia!', 'That is the end of the tutorial. You will meet the rest of the game in this run, wave by wave. Good luck!'), build: true, next: true }
  ];
  // 1.04: the moments that matter stop the game once, with a card at the top of the map (the check waits under it)
  const TUT_POP = {
    check: L('Skill check! Stuknij w mapę, gdy koralik wjedzie w obwódkę. Wypełniona strefa to krytyk. Po trafieniu ta pułapka bije dalej sama z tym wynikiem, bez pytania.', "Skill check! Tap the map when the bead enters the outline. The filled zone is a crit. After a hit, this trap keeps firing with that result on its own."),
    pay: L('Koniec combo! Groza zamienia się w Esencję (czerwone kulki). Możesz ją wydać od razu, nawet w trakcie fali.', "Combo over! Your Dread turns into Essence (the red orbs). You can spend it right away, even mid-wave."),
    theft: L('Kryształ skradziony! Zabij albo wystrasz tego, kto go niesie, zanim dotrze do wyjścia. Wtedy kryształ wróci.', "A crystal is stolen! Kill or scare whoever carries it before they reach the exit, and it comes back."),
    flee: L('Bohater ucieka ze strachu (pełny fioletowy pasek). Dostaniesz za to Esencję, ale opowie innym o Twoich pułapkach.', "A hero flees in fear (full purple bar). You get Essence for it, but they will tell others about your traps."),
    // 1.12: the full game (run 4 of the first ones): the first time each of these shows up
    body: L('Słabość albo odporność! Ten bohater obrywa mocniej albo słabiej od jednego typu obrażeń. Stuknij go, żeby sprawdzić.', "Weakness or resistance! This hero takes more or less damage from one damage type. Tap them to check."),
    phobia: L('Fobia! Ten bohater właśnie zobaczył to, czego boi się najbardziej. Stuknij go, żeby sprawdzić, co to.', "Phobia! This hero just saw the thing they fear most. Tap them to see what it is."),
    returner: L('Powracający! Ten bohater kiedyś Ci uciekł. Wraca silniejszy i pamięta Twój loch.', "A returner! This hero escaped you once. Now they are back, stronger, and they remember your dungeon."),
    // 1.26: the new rules explain themselves the first time they happen, in every run (once in this browser)
    heartLv: L('Serce rośnie! Każdy poziom daje darmową kartę w sklepie (Dar serca). Złoty pasek to Nasycenie: napełnia go Danina, czyli część wypłat po tym, jak serce się naje. Najwyżej 1 poziom na falę.', "Your heart grows! Each level gives a free card in the shop (Heart's Gift). The gold bar is Satiety: the Tithe fills it with part of your payouts once the heart is full. At most 1 level per wave."),
    heartCry: L('Serce krzyczy! Kto wyrywa kryształ, z każdą sekundą traci odwagę. Kradzież trwa 5 s: zrań go albo wystrasz, zanim skończy.', "The heart screams! Whoever pulls out a crystal loses courage every second. Stealing takes 5 s: hurt or scare them before they finish."),
    status: L('Status! Ikonka nad bohaterem to stan, np. Spowolniony albo Podpalony. Co nakłada pułapka, zobaczysz w jej opisie.', "Status! The icon over the hero is a status, like Slowed or Burning. A trap's description tells you what it applies."),
    reaction: L('Reakcja! Status i pasujące obrażenia dały coś mocniejszego, np. olej i ogień to Pożar. Reakcja daje Grozę i krok combo.', "Reaction! A status met the right damage and made something stronger, like oil and fire making a Blaze. Reactions give Dread and a combo step."),
    revive: L('Potwór powalony! Wstanie przed następną falą, ale serce będzie wtedy głodniejsze o 1 Esencję.', "Monster down! It gets back up before the next wave, but the heart will want 1 more Essence then."),
    omen: L('Omen! Ta fala ma specjalną zasadę. Trudniejszy omen daje nagrodę, łatwiejszy podnosi głód serca.', "Omen! This wave has a special rule. A harder omen gives a reward; an easier one makes the heart hungrier."),
    cultist: L('Kultysta! Nie kradnie kryształów, tylko wypija Esencję, którą zjadło serce. Zabij go szybko: zabity oddaje połowę.', "Cultist! They don't steal crystals: they drink the Essence your heart has eaten. Kill them fast: a slain cultist gives half back.")
  };
  const TUT_NEW = { heartLv: 1, heartCry: 1, status: 1, reaction: 1, revive: 1, omen: 1, cultist: 1 };   // 1.26: shown in any run, not only in the first ones
  let tutPopNow = null; const tutPopQ = [];
  function coachSync() { const co = $('#coach'); coachInset = !co.hidden && co.classList.contains('top') ? Math.round(co.getBoundingClientRect().bottom - stage.getBoundingClientRect().top) : 0; }   // 1.25: on the screen (the coach is zoomed on a big screen)   // read once per change, not every frame
  // 1.12: the cards show in the first runs (with the guide or not), each once in this browser
  const POPS_KEY = 'yatd-pops';
  const popsSeen = () => { try { return JSON.parse(localStorage.getItem(POPS_KEY) || '{}') || {}; } catch (e) { return {}; } };
  function tutPop(id) {   // true if the card shows (or waits for the one up now)
    if (!run || !(run.guided || (run.tutorial && run.tut >= 0) || TUT_NEW[id]) || !fl || fl.phase !== 'raid' || fl.ending !== null || fl.finishing || modalOpen || !TUT_POP[id]) return false;   // not as the wave ends
    const seen = popsSeen();
    if (seen[id]) return false;
    seen[id] = 1; try { localStorage.setItem(POPS_KEY, JSON.stringify(seen)); } catch (e) {}
    if (tutPopNow) tutPopQ.push(id); else tutPopShow(id);
    return true;
  }
  function tutPopShow(id) {
    const box = $('#coach');
    tutPopNow = id; tutClearHl(); hideToast();
    box.innerHTML = ''; box.classList.add('top', 'pop');
    box.appendChild(el('div', null, TUT_POP[id]));
    const row = el('div', 'crow'); row.appendChild(el('span', 'step', L('Gra stoi', 'Paused')));
    const ok = el('button', 'next', L('Rozumiem', 'Got it')); ok.type = 'button'; ok.addEventListener('click', tutPopClose); row.appendChild(ok);
    box.appendChild(row); box.hidden = false; coachSync();
    setPaused(true, true);
  }
  function tutPopDrop() { if (!tutPopNow && !tutPopQ.length) return; tutPopNow = null; tutPopQ.length = 0; const box = $('#coach'); box.classList.remove('pop', 'top'); box.hidden = true; coachSync(); }   // the guide's own step comes back with the build (tutOnBuild)
  function tutPopClose() {
    if (tutPopQ.length) { tutPopShow(tutPopQ.shift()); return; }
    tutPopNow = null; $('#coach').classList.remove('pop');
    setPaused(false, true);
    if (run && run.tut >= 0) tutShow(); else $('#coach').hidden = true;
    coachSync();
  }
  // 1.12 (bug): a new run (or a saved one) never inherits the guide's card of the run before
  function coachHide() { tutPopNow = null; tutPopQ.length = 0; tutClearHl(); const box = $('#coach'); box.hidden = true; box.classList.remove('top', 'pop'); coachSync(); }
  // 1.12: the first runs: 1-4 = the run to play next (ONB_STAGES), 5 = learnt (the full game, no cards). A browser that
  // has played before 1.12 starts at 5. A run moves it on when it ends (one quit before wave 5 does not).
  const ONB_KEY = 'yatd-onb', COACH_KEY = 'yatd-coach';
  function onbStage() { try { const v = parseInt(localStorage.getItem(ONB_KEY), 10); if (v >= 1 && v <= 5) return v; } catch (e) {} return loadRecords().runs > 0 ? 5 : 1; }
  function setOnb(v) { try { localStorage.setItem(ONB_KEY, String(v)); } catch (e) {} }
  const coachDone = () => { try { return localStorage.getItem(COACH_KEY) === '1'; } catch (e) { return false; } };
  function onbDone(r) {
    if (!r || !r.guided || (r.result === 'quit' && r.wave < 5)) return;
    if (onbStage() <= 4) setOnb(5);   // 1.24 (B): the guided run (one now) teaches the game; the next run is the full game
  }
  // a run of the first ones: the guide with the first (once: a first run left in the middle starts again without it), a card with what is new for the others
  function startGuided() {   // 1.24 (B): the first run: stage 1, opening the rest with its waves (onbAdvance); the guide unless done before
    newRun(!coachDone(), 1); run.guided = true;
    saveRun('build');
  }
  // 1.26 (15): an omen as a small box: its picture, name, rule, and the reward or the price
  // 1.27 (author: the champion and the hero of the prophecy get a card like an omen on the screens between waves)
  function bossBox(e) {
    const d = el('div', 'omenbox bossbox'); if (!e || !e.boss) return d;
    const T = HEROES[e.type], fem = !!e.female, fin = e.boss === 'final';
    const ic = el('div', 'bossimg' + (fin ? ' fin' : '')); ic.innerHTML = classIconSvg(e.type, fin ? '#ffd27a' : '#ffb07a', 'bossic'); d.appendChild(ic);
    const t = el('div', 'omentx');
    t.appendChild(el('b', null, BOSS_NAME[e.boss][fem ? 1 : 0] + (e.nm && e.nm[0] ? ': ' + e.nm[0] : '')));
    t.appendChild(el('span', null, T.name[fem ? 1 : 0] + ', ' + L('poziom ', 'level ') + e.lvl + '. ' + (fin
      ? L('Zna drogę do serca i prowadzi drużynę prosto do niego. Gdy straci połowę zdrowia, wpada w szał, a kto idzie obok ' + (fem ? 'niej' : 'niego') + ', boi się mniej.', 'Knows the way to the heart and leads the party straight to it. At half health ' + (fem ? 'she' : 'he') + ' flies into a rage, and those beside ' + (fem ? 'her' : 'him') + ' fear less.')
      : L('Prowadzi drużynę i nie ucieka z resztą. Gdy ktoś wpada w panikę, ' + (fem ? 'jej' : 'jego') + ' okrzyk dodaje innym odwagi.', 'Leads the party and does not run with the others. When someone panics, ' + (fem ? 'her' : 'his') + ' battle cry steadies the rest.'))));
    t.appendChild(el('span', 'good', fin ? L('Przetrwaj tę falę, a run jest wygrany.', 'Survive this wave and the run is won.') : L('Nagroda: po fali legendarna karta w ofercie.', 'Reward: a legendary card on offer after the wave.')));
    d.appendChild(t); return d;
  }
  function omenBox(id) {
    const O = OMENS[id], d = el('div', 'omenbox'); if (!O) return d;
    { const u = ART.omen && ART.omen(id); if (u) { const im = el('img', 'omenimg'); im.src = u; im.alt = ''; d.appendChild(im); } }
    const t = el('div', 'omentx'); t.appendChild(el('b', null, 'Omen: ' + O.name)); t.appendChild(el('span', null, O.text));
    if (O.reward) t.appendChild(el('span', 'good', L('Nagroda: ', 'Reward: ') + O.reward + '.')); if (O.cost) t.appendChild(el('span', 'bad', L('Za to ', 'Price: ') + O.cost + '.'));
    if (!O.reward && !O.cost) t.appendChild(el('span', 'unk', L('Bez nagrody: zmienia tylko zasady.', 'No reward: it only changes the rules.')));
    d.appendChild(t); return d;
  }
  function renderNews(card) {   // 1.12.1: what the tavern says about the next wave (a tap on "Fala X/10" in the build)
    card.appendChild(el('div', 'sub', L('Wieści z karczmy', 'Tavern news')));
    card.appendChild(el('h2', null, waveName()));
    if (run.omens && OMENS[run.omens[run.wave]]) {   // 1.26: the omen first; the first time in this browser, what an omen is
      card.appendChild(omenBox(run.omens[run.wave]));
      const seen = popsSeen(); if (!seen.omenNews) { seen.omenNews = 1; try { localStorage.setItem(POPS_KEY, JSON.stringify(seen)); } catch (e) {} card.appendChild(el('p', 'note', L('Omen to specjalna zasada tylko tej fali. Trudniejszy omen daje nagrodę, łatwiejszy podnosi głód serca. Buduj pod niego.', 'An omen is a special rule for this wave only. A harder omen gives a reward; an easier one makes the heart hungrier. Build for it.'))); }
    }
    { const be = (run.nextFor === run.wave ? run.next : []).find(e => e.boss); if (be) card.appendChild(bossBox(be)); }   // 1.27: the champion or the hero of the prophecy
    waveHint().split(/(?<=[.!?])\s+(?=[A-ZŁŚŻŹĆŃÓĘĄ])/).forEach(t => card.appendChild(el('p', null, t)));
    const b = btn('primary', L('Zamknij', 'Close'), null, closeModal); b.id = 'news-close'; card.appendChild(b);
  }
  function renderOnb(card) {   // 1.24 (B): the stages this wave of the first run opens (m.stages), or the run's stage (a run saved before)
    const m = curModal || {}, list = (m.stages && m.stages.length ? m.stages : [run.stage || ONB_FULL]).filter(k => ONB_STAGES[k]), s = list[list.length - 1], perWave = !!(m.stages && m.stages.length);
    card.appendChild(el('div', 'sub', (perWave ? L('Fala ', 'Wave ') + run.wave : 'Run ' + s + L(' z 4', ' of 4')) + L(' · nauka', ' · learning')));
    card.appendChild(el('h2', null, L('Nowe: ', 'New: ') + list.map(k => ONB_STAGES[k].name.toLowerCase()).join(', ')));
    const ul = el('ul', 'conseq'); list.forEach(k => ONB_STAGES[k].news.forEach(t => ul.appendChild(el('li', null, t)))); card.appendChild(ul);
    card.appendChild(el('p', 'note', s < ONB_FULL ? (perWave ? L('Od fali ', 'From wave ') + ONB_WAVE[s + 1] + ': ' : L('Następny run doda: ', 'Next run adds: ')) + ONB_STAGES[s + 1].name.toLowerCase() + '.' : L('To już cała gra. Kolejne runy zaczną się od niej. Wszystkie zasady znajdziesz w Jak grać na ekranie startowym.', 'That is the whole game. Your next runs start with all of it. All the rules are in How to play on the start screen.')));
    const b = btn('primary', L('Gramy', "Let's go"), null, closeModal); b.id = 'onb-go'; card.appendChild(b);
  }
  function tutStart() { tutFlags = { sp0: countType('spikes'), ar0: countType('arrows'), po0: countType('portrait') }; run.tut = 0; run.tutLog = { max: 0, skipped: [], ended: null }; tutShow(); }
  // 1.05: how far the tutorial got (logged with the run): the furthest step, the steps skipped, how it ended
  const tutLogOf = () => run.tutLog || (run.tutLog = { max: 0, skipped: [], ended: null });
  function tutClearHl() { document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); }
  function tutShow() {
    const st = TUT[run.tut], box = $('#coach');
    tutClearHl();
    if (!st) { tutEnd(); return; }
    if (st.skipIf && st.skipIf() && (fl.phase === 'raid') === !!st.raid) { run.tut++; tutShow(); return; }   // 1.08: a step already done is not shown
    tutT = 0; tutLast = realNow; st.cached = undefined;
    { const lg = tutLogOf(); lg.max = Math.max(lg.max, run.tut + 1); }
    if (tutPopNow) return;   // a card is up: the step shows when it is closed
    const raid = fl.phase === 'raid';
    const letGo = () => { if (tutPausedIt) { tutPausedIt = false; if (paused) setPaused(false, true); } };
    if ((st.build && raid) || (st.raid && !raid) || (st.wave && run.wave < st.wave) || (st.acked && raid)) { letGo(); box.hidden = true; coachSync(); return; }   // 1.04: a step of the other phase waits out of sight (1.12: and one of a later wave; 1.15.1: and one already read)
    if (st.prep) st.prep();
    box.classList.toggle('top', raid);   // 1.04: in a wave the coach sits at the top of the map (1.12.1: and the check right under it)
    box.innerHTML = '';
    box.appendChild(el('div', null, typeof st.text === 'function' ? st.text() : st.text));
    const row = el('div', 'crow');
    const holds = raid && st.raid;   // 1.15.1 (author: every tip stops the game until you confirm it or do what it says)
    row.appendChild(el('span', 'step', holds ? (st.id === 'check' ? L('Gra czeka na Twój ruch', 'Your move') : L('Gra stoi', 'Paused')) : L('Samouczek ', 'Tutorial ') + (run.tut + 1) + '/' + TUT.length));
    const right = el('span'); right.style.display = 'flex'; right.style.alignItems = 'center'; right.style.whiteSpace = 'nowrap';
    const end = el('button', 'skip', L('Zakończ', 'End')); end.type = 'button';
    end.addEventListener('click', () => { tutLogOf().ended = 'quit@' + (st.id || run.tut); tutEnd(); });
    if (run.tut < TUT.length - 1) right.appendChild(end);
    if (st.skip) { const sk = el('button', 'skip', L('Pomiń krok', 'Skip step')); sk.type = 'button'; sk.style.marginLeft = '12px'; sk.addEventListener('click', () => { tutLogOf().skipped.push(st.id || run.tut); tutAdvance(); }); right.appendChild(sk); }
    if (st.ack) { const ok = el('button', 'next', L('Rozumiem', 'Got it')); ok.type = 'button'; ok.style.marginLeft = '12px'; ok.addEventListener('click', () => { st.acked = true; tutClearHl(); letGo(); box.hidden = true; coachSync(); }); right.appendChild(ok); }
    if (st.next) { const nx = el('button', 'next', run.tut === TUT.length - 1 ? L('Gramy!', "Let's play!") : L('Dalej', 'Next')); nx.type = 'button'; nx.style.marginLeft = '12px'; nx.addEventListener('click', () => { if (st.pause) setPaused(false, true); if (run.tut === TUT.length - 1) tutLogOf().ended = 'done'; tutAdvance(); }); right.appendChild(nx); }
    row.appendChild(right); box.appendChild(row);
    box.hidden = false; coachSync();
    (st.hl || []).forEach(sel => { const e = $(sel); if (e) { e.classList.add('tut-hl'); if (e.classList.contains('item') && e.parentElement) { const t = e.parentElement; t.scrollLeft = Math.max(0, e.offsetLeft - 8); } } });   // a highlighted tile scrolls into view
    if (holds && st.id !== 'check') { if (!paused) setPaused(true, true); tutPausedIt = true; } else letGo();   // the check step: the world stands while the check waits (timeScale)
    const t = tutTarget(); if (t && fl.phase === 'build') { centerOn(t[0] + 0.5, t[1] + 0.5); cam.oy += ch * 0.14; clampCam(); cam.manualUntil = 0; }   // 1.07: the target a bit above the middle (the coach is at the bottom)
  }
  function tutTarget() {
    const st = run && run.tut >= 0 ? TUT[run.tut] : null;
    if (!st || !st.tile || fl.phase !== 'build') return null;
    if (st.cached === undefined) st.cached = st.tile();
    return st.cached;
  }
  function tutAdvance() { run.tut++; tutShow(); }
  const tutHoldOk = () => !!run && run.tut >= 0 && !!TUT[run.tut] && !!TUT[run.tut].hold && tutPausedIt && !modalOpen;   // the guide's pause that a held finger ends
  const tutCheckHold = () => !!run && run.tut >= 0 && !!TUT[run.tut] && TUT[run.tut].id === 'check';   // the guide's first check: the world stands
  function tutTick() {
    const st = TUT[run.tut];
    if (!st) return;
    const dT = Math.min(0.1, realNow - tutLast);
    tutT += dT; tutLast = realNow;
    { const lg = tutLogOf(), a = lg.stepTimes || (lg.stepTimes = []); a[run.tut] = (a[run.tut] || 0) + dT; }   // 1.24 (B, P1-5): seconds on each step (tut.stepTimes)
    if (st.id === 'move' && !!movingKey !== !!st.held && !$('#coach').hidden && $('#coach').firstChild) { st.held = !!movingKey; $('#coach').firstChild.textContent = st.text(); }   // 1.24 (B, P1-5): the trap in hand: what next
    if (st.raid && fl.phase !== 'raid') return;
    if (st.build && fl.phase !== 'build') return;
    if (st.wave && run.wave < st.wave) return;
    if (st.next || tutPopNow || (st.ack && !st.acked)) return;
    if (st.hideAfter && tutT >= st.hideAfter && !$('#coach').hidden) { $('#coach').hidden = true; tutClearHl(); coachSync(); }   // said; the step waits for its event
    if ((st.done && st.done()) || (st.wait && tutT >= st.wait)) tutAdvance();
  }
  function tutEvent(ev) {
    if (ev === 'check') {   // the first check: its card (the check waits under it), then the line that goes with it
      const jump = TUT[run.tut] && TUT[run.tut].id === 'novice';
      if (jump) run.tut = TUT.findIndex(s => s.id === 'check');
      if (!tutPop('check') && jump) tutShow();
    }
    if (ev === 'resolved') tutFlags.resolved = true;
    if (ev === 'tool') tutFlags.tool = true;
  }
  // 1.12: a new wave's build jumps to its first step (what was left of the wave before is let go)
  function tutOnBuild() { const i = TUT.findIndex(s => s.wave === run.wave); if (run.tut >= 0 && i >= 0 && run.tut < i) { run.tut = i; tutShow(); } else if (run.tut >= 0 && $('#coach').hidden) tutShow(); }
  // Prototype 1.0: a tutorial run comes back from a save with its coach where it was. A step of the wave itself waits for the
  // next wave, so it goes back to "release the wave"; the "place more" steps count from what stands now.
  function tutResume() {
    if (!run || !run.tutorial || run.tut < 0) return;
    tutFlags = { sp0: countType('spikes'), ar0: countType('arrows'), po0: countType('portrait') };
    { const i = TUT.findIndex(s => s.wave === run.wave); if (i >= 0 && run.tut < i) run.tut = i; }   // 1.12: the steps of this wave
    const st = TUT[run.tut];
    if (st && st.raid && run.wave === 1) { const go = TUT.findIndex(s => s.hl && s.hl.includes('#btn-action')); if (go >= 0) run.tut = go; }
    if (fl && fl.phase === 'build') tutShow();
  }
  // Is there still a free spot the player can afford for spikes or arrows? (cached until the dungeon or the purse changes)
  let tutSpotKey = '', tutSpotVal = true;
  function tutAnySpot() {
    const k = fl.items.size + '|' + Math.floor(fl.essence);
    if (tutSpotKey === k) return tutSpotVal;
    tutSpotKey = k; tutSpotVal = false;
    for (let y = 0; y < WH && !tutSpotVal; y++) for (let x = 0; x < WW; x++) {
      if ((fl.essence >= costOf('spikes') && canPlace('spikes', x, y)) || (fl.essence >= costOf('arrows') && canPlace('arrows', x, y))) { tutSpotVal = true; break; }
    }
    return tutSpotVal;
  }
  function tutEnd() { tutPausedIt = false; if (run) run.tut = -1; try { localStorage.setItem(COACH_KEY, '1'); } catch (e) {} tutClearHl(); tutPopNow = null; tutPopQ.length = 0; const box = $('#coach'); box.hidden = true; box.classList.remove('top', 'pop'); coachSync(); if (paused) setPaused(false, true); }

  /* ================= boot ================= */
  // An example dungeon sits behind the start screen so the page is never empty.
  newRun(false);
  openModal({ type: 'start' });
  kick();   // 1.24 (C): the paced loop (p6 FP)

  // Hook for automated checks; no effect on normal play.
  const yatd = { longDoc: () => longDoc(), logLong: () => logLong(), get LONG_DOCS() { return LONG_DOCS; }, homeRunTick: dt => homeRunTick(dt), tapUpgrade: it => tapUpgrade(it), upgradeAll: (it, b) => upgradeAll(it, b), sameInRoom: it => sameInRoom(it), handleTap: (x, y) => handleTap(x, y), get lastPlaced() { return lastPlaced; },   /* 1.27.4 */ deckUsed: () => deckUsed(), deckFull: () => deckFull(), deckAdd: id => deckAdd(id), isGift: id => isGift(id), heartLevelCheck: s => heartLevelCheck(s), heartUpBlocked: () => heartUpBlocked(), reserveLow: () => reserveLow(), updateAction: () => updateAction(), copyOk: v => copyOk(v),   /* 1.27.5 */ tagChips: t => tagChips(t), get DRAWN() { return DRAWN; }, get WC() { return WC; }, drawNow: () => draw(),   /* 1.28.0 */ devInfo: () => devInfo(), get TRAPS() { return TRAPS; }, get MONSTERS() { return MONSTERS; },   /* 1.27.7 */ get MUS() { return MUS; }, get WA() { return WA; }, wallCovers, memOf, needsCheck, timeScale, get CHECK_SLOW() { return CHECK_SLOW; }, musicWant, camCentre, TRAY, get cwch() { return [cw, ch, cv.width, cv.height]; }, w2s: (x, y, z) => { const p = W2S(x, y, z || 0); return [p[0] + OX, p[1] + OY]; }, get OXY() { return [OX, OY, FW, FH]; }, get UIZ() { return UIZ; }, get uiRects() { return uiRects; }, fitScale: () => fitScale(), buildScale: () => buildScale(), applyLayout,   /* 1.25 */ suggestBuys, previewState, pvTake, flashSuggest, isOpenT,   /* 1.25.1 */ satietyAdd, ofiara, ofiaraLeft, hungerParts, hungerTab, heartOffer, heartTake, heartLvAt, titheNow, feastIn, setStatus, statusOn, statusList, clearStatus, rooted, reaction, reactHit, gateSplit, bestHealer, t3B, t3b, STATUS, REACTIONS, OMENS, omenK, omenOf, secretFind, secretOk, heroAI126, partyPool, essMultNow, copyTarget, hurtMonster, statusList, newClassTick, hazardsTick, houndTrack, superRoom, sapperCovered, demonCount, OFIARA_MAX, roomLoads, roomCap, ACTIVE, /* 1.26 */   /* 1.24 (B): w2s on the canvas (the tests add the canvas' corner) */ centerOn, trayIsOpen, get VIEW() { return VIEW; }, wallH, tapWorld, tutPop, get tutPopNow() { return tutPopNow; }, get paused() { return paused; }, get TC() { return TC; }, get PERF() { return PERF; }, perfSummary, frame, quietWhy, autoFFOn: () => autoFFOn(), standOk: (h, x, y) => standOk(h, x, y), talkGroup: h => talkGroup(h), startPrep: r => startPrep(r), pickTab: (id, t) => pickTab(id, t), makeHero: (t, l, n) => makeHero(t, l, n, new Set()), QUIET, get SPLIT() { return SPLIT; }, splitViews, heroScreen, toWorld, lootCount, walkable, passable, blockerOk, rebuildDungeon, BUILDINGS, get realNow() { return realNow; }, crystalCost, buyCrystal, payChain, chainTick, essIn, comboLive, becomeImpatient: () => becomeImpatient(), partyThink: dt => partyThink(dt), hungerNeed, feedHeart, typeMult, phobiaMult, collectReturners, damage, addFear, shopBuy, shopReroll, toStash, fromStash, sellStash, shopRefresh, stashCap, priceOf, rerollCost, greedBonusParts,
    get S() { return S; }, get fl() { return fl; }, get run() { return run; }, get mods() { return mods; }, get modalKind() { return modalKind; }, get cam() { return cam; },
    get ff() { return ff; }, setFF: v => { ff = v; }, setArm: v => { ARM_TIME = v; },
    step, fire, tryPlace, canPlace, startWave, newRun, closeModal, setPaused, finishWave: () => finishWave(), afterSummary, proceedToBuild,
    resolveCheck: p => resolveCheck(p), skipCheck: () => skipCheck(), clearCheck: () => clearCheck(), areaOf, slotOf, shortestPath, frontier, toolMarkers, applyTool, toolCost, get WW() { return WW; }, get WH() { return WH; }, TUT, UPGRADES, UPG, ITEMS, startBuild, applyUpgrade, makeWave, levelStats, recomputeMods, sellCard, upgradePicks, cardMultNow, openModal, queueModal, renderDeckTiles, saveRun, loadSave, resumeRun, clearSave, upgradeItem, removeItem, waveCurve, waveBase, computeBRooms, inB, decoyAlarm, guildAdapt, quietNow, setUser: v => { userStarted = v; }, get userStarted() { return userStarted; }, ignite, trapBoost, calmReady, landFallen, fall, planBreach: () => planBreach(), tutAnySpot, galleryK, stealNeed, portraitRooms, addFear, setTab: t => { tab = t; updateTray(); }, undo, pushUndo, get undoN() { return undoStack.length; }, setTrayOpen, UI, moveItem, moveTarget, setMode: (m, k) => { selected = m; movingKey = k || null; updateTray(); }, get selected() { return selected; }, get movingKey() { return movingKey; }, rankOf, dungeonBounds, regroupAtDoor: () => regroupAtDoor(),
    lookDone, councilDone, chooseTarget, canHearShout, answerLost, perceiveThink: (L, c) => perceiveThink(L, c), startFlee, cardFit, CARD_NEEDS, monstersTick, rebuildThreat, updateHero, onEnter, hiddenAmbush, skullK, cellLand, vaultSnap, riseGhost, restockForge, stripGear, framesWake, falseCall, taintedSip, reqOk, freshMods, shoutRange,   // 1.18
    crystalEv, crystalSync, runSummary: () => runSummary(), runStatus: () => runStatus(), activeTick, playerIdNow, askUnspent, cheapestItem, hungerRisk, calmChecks, calmFire, OK_WIDE, shapeStat, notePreview, noteFearUi, withName, recordWave, logWave, quitRun, get WEB() { return WEB; },   // 1.24 D
    shamanHeal, healFlush, SHAMAN_GZ, healLine,   // 1.24 C
    get AFXN() { return AFXN; }, AFX, afx, heroFx, trapFx, drawAfx: () => drawAfx(cam.s), tutWayOnly, tutSpikeSure, onbAdvance, onbWaveStage, ONB_WAVE, fearBarAt, get fearRects() { return FEARR.slice(0, fearRN); }, drawPreview, PV, effWords, HURTS, SCARES, tutLogOf: () => tutLogOf(), get tutFlags() { return tutFlags; }, startRage: (h, w, d) => startRage(h, w, d), fogRoll: (h, dt) => fogRoll(h, dt), handleTap: (x, y) => handleTap(x, y), setTap: v => { TAP = v; },   // 1.24 B
    buildMods, fuseCard, isFused, ownsCard, fuseGroup, fuseElems, fusePow, fuseText, applyFrac, fuseApply, sellFor, fuses, cardName, FUSE_GROUP, FUSE_POW, waveExhausted, waveForceOut, tdCap, tdSafe, earlyW, waveBase0, earlyHpK, lvlPow, EARLY_W, renderHero: (c, m) => renderHero(c, m), checkWanted, heroesInArea, get floats() { return floats; }, costOf, upgCost, isExitTile, hpK0, atW, rivalJab, rivalScare, tutW1,   // 1.24
    nemesisEntry, nemesisSpawn, nemesisThink, grudgeItem, grudgeJob, grudgeAdd, nemName, bountyOf, nemHold, nemK, nemOf, nemBoast, nemWarn, nemGrudgeLook, nemesisKilled, rememberFallen, fallenRoom, bountyTalk, NEM_TITLE,   // 1.23
    finalThink, finOf, carrierOf, escortThink, escortGoal, guardOf, handThink, threatNear, standStart, standThink, standing, sacrificing, sacStart, sacTick, sacHold, reachAvoid, youFirst, tapRoom, tapStep, notThisWay, formThink, formedFoe, backTile, takeCrystal, crystalReturns, learnTrap, pathFrom, exitGoals, LINE_NEEDS, byId, heroPos, hdist,   // 1.22
    makeBonds, bondOf, bondLabel, bondMate, bondTalk, griefOf, bondHurt, mentorWatch, mentorProud, quarrel, quarrelWon, noLeave, rescueThink, betThink, betStart, betEnd, bondThink, decideCage, missLost, lootBanned, mateBody, vowK, convoStart, riftThink, CONVO, raging, cageHero,   // 1.21
    shareThink, loadOf, carryOf, burden, claimScore, lootReassign, onLootDead, onLootRival, lanternNear, litLantern, dropAt, bodyLoot, CLASS_FIT, CARRY, fitOf, canTake, lootOffer, mimicSpill, douseLantern, bombCook, fogRoll, hasCrowbar, srcText, smashDone, bombJob, heroAbilities, scanTraps, LOOT_GREED, itemLabel, canSee, setGreed, freeCaged, SOLO,   // 1.20
    patchBreach, chooseEntrance, useCharm, useAmulet, useBoots, giveItem, dropItem, pickup, itemValue, getLost, startSplit, onScout, splitting, lookRoll, lookSpots, hearFar, councilVote, nameGen, g2Start, g2End, g2Think, g2Leader, inG2, groupLeaderOf, mutinyThink, sulkThink, councilDone, lineOk, lineTags, fitLine, TRAPS, MONSTERS, isLoot, SAY, knowsTag, sawSweep, sawItem, sawAdd, itemTags, sayNow, LINE_NEEDS, setSayHook: f => { sayHook = f; }, say, nameFill, GZ, maybeDetour, lostChance, checkPos, CHECK_SHAPE, isRt, rtOf, t3, kindPow, inKind, slotRoom, servedRooms, kindProps, PROP, PROP_PLAN, KIND_WALL3D, snapshotLayout, KINDS, KIND_INFO, KIND_OF, RT_INFO, nbrRooms, roomCount, sizeMult,
    rollItem, curse, comboNow, get orbs() { return orbs; }, boxOrbs, tileScreen, bfs, say: (h, t, p, d, how) => say(h, t, p, d, how), sayTick, floorBusy, readT, talkAs: (d, l) => talkAs(d, l), greedCurve, greedRaw, addGreed, waveSize, partySize, safestRoom: h => safestRoom(h), planHero: h => planHero(h), lootSeen: it => lootSeen(it), kill: (h, k, a) => kill(h, k, a), damage, loadRecords, BREACH_PATCH, HITEMS, LOOT_KIND, noticeLoot, lootDecision, leader, alive, heroExit, driftTarget, SCARE, CURSED, DRIFT, TABS, objTargetOk, roomOf, dropCarry, holdRemove, buildTap, onbStage, setOnb, onbDone, startGuided, endRun: (r, x) => endRun(r, x), revealPhobia, revealPhys, ONB_STAGES, ONB_CARD, ONB_ITEM, comboHp, onbOk, coachDone,
    get movingObj() { return movingObj; },
    get FP() { return FP; }, frameIv, frameSig, IV_FAST, IV_CALM, IV_STILL,   // 1.24 C
    GFX, GQ, setGfxMode, gfxSet, perfTest, perfHud, detT,   // 1.28.0
  };
  // 1.24 (C): a test reaching into the game through its hooks wakes the paced loop (as a tap does), so what it changed is drawn
  window.__yatd = new Proxy(yatd, { get(t, k) { if (k !== 'FP') { FP.input = FP.touch = performance.now(); kick(); } return t[k]; } });   // (reading FP itself wakes nothing: the tests watch the pacing through it)
})();
</script>
