  const LOCK = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
  let tab = 'traps';
  try { tab = localStorage.getItem('yatd-tab') || 'traps'; } catch (e) {}
  if (!TABS.some(t => t.id === tab)) tab = 'traps';
  // Small preferences of this browser: which panels are open, and the speed button.
  const UI = (() => { const d = { hintOpen: false, trayBuild: true, listOpen: false, speed: 1 }; try { return Object.assign(d, JSON.parse(localStorage.getItem('yatd12-ui') || '{}')); } catch (e) { return d; } })();
  function saveUI() { try { localStorage.setItem('yatd12-ui', JSON.stringify(UI)); } catch (e) {} }
  // 1.03: every further loot of the same kind already lying in the dungeon makes the next one 25% dearer (author's run: 223
  // Relikwie at 10 each). Loot the heroes dropped does not count; what you paid comes back when you take it off.
  const LOOT_STEP = 1.25;
  const lootCount = t => { let n = 0; if (fl) fl.items.forEach(it => { if (it.type === t && !it.dropped) n++; }); return n; };
  const costOf = t => MODES[t] ? 0 : TOOLS[t] ? toolCost(t) : BUILDINGS[t] ? Math.ceil(ITEMS[t].cost * mods.buildingCost) : LOOT_KIND[t] ? Math.ceil(ITEMS[t].cost * Math.pow(LOOT_STEP, lootCount(t)) - 1e-9) : ITEMS[t].cost;
  const upgCost = it => Math.ceil(ITEMS[it.type].cost * UPG_COST[(it.lvl || 1) + 1]);
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
  const subWhen = s => run && run.onbW ? 'od fali ' + ONB_WAVE[subStage(s)] : 'od ' + subStage(s) + '. runu';   // 1.24 (B): the first run opens it with a wave
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
          if (trayTab) trayScroll[trayTab] = tray.scrollLeft; tab = tb.id; try { localStorage.setItem('yatd-tab', tab); } catch (e) {} updateTray();
          if (tb.id === 'deck' && run) setHint('Talia: ' + run.deck.length + ' z ' + run.deckSize + ' kart. Stuknij kartę, żeby ją przeczytać albo sprzedać (sprzedaż tylko między falami).');
        });
        tabs.appendChild(b);
      });
      ITEM_ORDER.forEach(t => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'item' + (TOOLS[t] ? ' tool' : ''); b.id = 'item-' + t;
        b.innerHTML = '<span class="top">' + ICONS[t] + '<span class="cost"></span></span><span class="nm"></span><span class="sl"></span>';
        b.querySelector('.nm').textContent = ITEMS[t].name;
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
        b.addEventListener('contextmenu', e => { e.preventDefault(); clearTimeout(tipTimer); tipTimer = 0; showTip(t, b, 'hover'); });
        b.addEventListener('click', () => {
          if (tipEat) { tipEat = false; return; }   // the end of a hold is not a tap
          if (!fl || !run || (fl.phase !== 'build' && fl.phase !== 'raid')) return;
          if (MODES[t]) {
            if (fl.phase !== 'build') { nope(b, 'między falami'); return; }
            selected = selected === t ? null : t; movingKey = null; movingObj = null; updateTray();
            if (selected) setHint(ITEMS[t].desc);   // a mode: how to use it
            return;
          }
          if (!isOpenT(t)) { nope(b, KINDS[t] && run.unlocked.has(t) ? 'brak rodziny' : 'zablokowane'); return; }
          if ((TOOLS[t] || ITEMS[t].build) && fl.phase !== 'build') { nope(b, 'między falami'); return; }
          if (fl.essence < costOf(t)) { nope(b, 'za mało Esencji'); return; }
          selected = selected === t ? null : t; movingKey = null; movingObj = null;   // choosing from the tray puts down what was in hand
          updateTray();
          // 1.05 (a tester paid 256 for one more slot in a room he had expanded ten times; a new room cost about 8): say the prices side by side
          if (selected === 'expand') {
            const ms = toolMarkers('expand'), lo = ms.length ? Math.min(...ms.map(m => toolCost('expand', m))) : null, dg = toolMarkers('dig').length ? toolCost('dig', null) : null;
            setHint('Rozbuduj: każda kolejna rozbudowa tego samego miejsca kosztuje 2 razy więcej (cena nad każdym miejscem' + (lo !== null ? ', najtaniej ' + lo : '') + ').' + (dg !== null ? ' Nowy pokój (zakładka Loch): ' + dg + '.' : ''));
          } else if (selected && (UI.holdTips || 0) < 3) { UI.holdTips = (UI.holdTips || 0) + 1; saveUI(); setHint(PC() ? 'Najedź myszką na kafelek (albo kliknij go prawym), żeby przeczytać, co robi.' : 'Przytrzymaj kafelek w pasku, żeby przeczytać, co robi.'); }
        });
        tray.appendChild(b);
      });
    }
    // 1.12: what a later run brings is not in the tray at all (a tab with nothing in it yet is gone too)
    const tabOn = tb => !tb.items.length || tb.items.some(t => onbOk(t));
    if (!tabOn(TABS.find(tb => tb.id === tab) || TABS[0])) tab = 'traps';
    const cur = TABS.find(tb => tb.id === tab) || TABS[0];
    TABS.forEach(tb => { const tbb = $('#tab-' + tb.id); tbb.hidden = !tabOn(tb); tbb.setAttribute('aria-selected', String(tb === cur)); });
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
      if (!b.hidden) b.style.setProperty('--d', String(Math.min(9, shown++)));
      const cst = b.querySelector('.cost');
      cst.textContent = MODES[t] ? '' : String(costOf(t)); cst.classList.toggle('nocost', !!MODES[t]);
      const locked = !run || !isOpenT(t);
      const playable = fl && (fl.phase === 'build' || (fl.phase === 'raid' && !TOOLS[t] && !ITEMS[t].build && !MODES[t]));
      const off = locked || !playable || fl.essence < costOf(t);
      if (off && selected === t) selected = null;
      b.classList.toggle('off', off);
      b.setAttribute('aria-pressed', String(selected === t));
      b.setAttribute('aria-label', ITEMS[t].name + ' ' + ITEMS[t].tag + ', koszt ' + costOf(t) + ' Esencji' + (locked ? ', zablokowany' : ''));
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
    const box = $('#tip'), I = ITEMS[t]; box.innerHTML = '';
    const h = el('div', 'th'); h.appendChild(el('b', null, I.name)); if (!MODES[t]) h.appendChild(el('span', null, costOf(t) + ' Esencji')); box.appendChild(h);
    if (I.tag) box.appendChild(el('div', 'tg', I.tag));
    { const lb = effWords(t); if (lb.length) { const r = el('div', 'tlb'); lb.forEach(w => r.appendChild(el('span', w === 'Rani' ? 'hurt' : 'scare', w))); box.appendChild(r); } }   // 1.24 (B, P1-4)
    box.appendChild(el('p', null, I.desc));
    if (LOOT_KIND[t]) { const n = lootCount(t); box.appendChild(el('div', 'tg', 'Każdy kolejny taki łup w lochu: +25% ceny' + (n ? ' (leży już: ' + n + ', bazowo ' + I.cost + ')' : '') + '.')); }
    if (run && KINDS[t] && run.unlocked.has(t) && !isOpenT(t)) box.appendChild(el('div', 'tw', 'Zablokowana: najpierw odblokuj ' + KIND_INFO[KINDS[t]].items.map(x => ITEMS[x].name).join(' albo ') + ' (kartą ze sklepu).'));
    else if (run && !MODES[t] && !run.unlocked.has(t)) box.appendChild(el('div', 'tw', 'Zablokowany: odblokujesz go kartą ze sklepu (na stałe, także w kolejnych runach).'));
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
  const effWords = t => (HURTS(t) ? ['Rani'] : []).concat(SCARES(t) ? ['Straszy'] : []);   // 1.24 (B, P1-4)
  function hideTip() {
    clearTimeout(tipTimer); tipTimer = 0;
    if (tipFor) { const b = $('#item-' + tipFor); if (b) b.classList.remove('holding'); tipFor = null; }
    $('#tip').hidden = true;
  }
  // The deck tab: one tile per slot, filled or empty. Rebuilt only when the deck changes.
  function renderDeckTiles(show) {
    const tray = $('#tray'), k = show ? run.deck.join(',') + '|' + (run.fused || []).join(',') + '|' + run.deckSize + '|' + JSON.stringify(run.stacks || {}) + '|' + (run.stash || []).join(',') + '|' + (run.freePicks || 0) + '|' + (fl ? fl.phase : '') : '';
    if (tray.dataset.deck === k) return;
    tray.dataset.deck = k;
    tray.querySelectorAll('.dslot').forEach(e => e.remove());
    if (!show) return;
    const raidNow = !!(fl && fl.phase === 'raid');   // v14: during a wave the shop and the stash are out of reach and out of sight
    if (!raidNow) { const b = document.createElement('button'), build = fl && fl.phase === 'build';   // the shop tile: back to the shop screen while building
      b.type = 'button'; b.className = 'item dslot shoptile' + (run.freePicks > 0 && build ? ' gift' : ''); b.id = 'tile-shop';
      b.innerHTML = '<span class="dtag"></span><span class="dnm">Sklep</span>';
      b.querySelector('.dtag').textContent = !build ? 'między falami' : run.freePicks > 0 ? 'gratis: ' + run.freePicks : 'wróć do sklepu';
      b.disabled = !build; b.addEventListener('click', () => { if (!modalOpen && build) openModal({ type: 'shop' }); });
      tray.appendChild(b); }
    for (let i = 0; i < run.deckSize; i++) {
      const u = UPG[run.deck[i]], b = document.createElement('button');
      b.type = 'button'; b.className = 'item dslot ' + (u ? 'rar-' + u.rar : 'empty') + (u && isFused(u.id) ? ' fused' : '');   // 1.24: ★
      if (u) {
        b.innerHTML = '<span class="dtag"></span><span class="dnm"></span>';
        b.querySelector('.dtag').textContent = u.grows ? 'rośnie: ' + (run.stacks[u.id] || 0) : u.tag; b.querySelector('.dnm').textContent = cardName(u.id);
        b.setAttribute('aria-label', u.name + ', ' + RAR_NAME[u.rar] + ' karta. ' + u.text);
        b.addEventListener('click', () => { if (!modalOpen && run) { if (fl && fl.phase === 'raid' && !paused) setPaused(true); openModal({ type: 'card', idx: i }); } });
      } else { b.innerHTML = '<span class="dnm">wolne miejsce</span>'; b.disabled = true; }
      tray.appendChild(b);
    }
    if (!raidNow) for (let i = 0; i < stashCap(); i++) {   // the stash: inactive cards waiting for their turn (hidden during a wave)
      const u = UPG[(run.stash || [])[i]], b = document.createElement('button');
      b.type = 'button'; b.className = 'item dslot stash ' + (u ? 'rar-' + u.rar : 'empty');
      b.innerHTML = '<span class="dtag"></span><span class="dnm"></span>';
      b.querySelector('.dtag').textContent = 'schowek'; b.querySelector('.dnm').textContent = u ? cardName(u.id) : 'pusto';   // 1.24: ★
      if (u) b.addEventListener('click', () => { if (!modalOpen && fl && fl.phase === 'build') openModal({ type: 'shop' }); }); else b.disabled = true;
      tray.appendChild(b);
    }
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
    if (build) { const left = Math.floor(fl.essence); b.disabled = false; b.classList.add('ready'); actLabel(b, 'Wypuść falę ' + run.wave, (run.next ? run.next.length : 0) + ' bohaterów' + (left >= 6 ? ' · zostało ' + left + ' Esencji' : '')); return; }
    if (fl.phase === 'raid') {   // v14: no silence: the button only says how to speed up
      b.disabled = true;
      if (paused && trayIsOpen()) { actLabel(b, 'Pauza', 'zwiń ▼ Budowa: gramy'); return; }   // 1.08
      actLabel(b, 'Fala trwa', PC() ? 'przytrzymaj F albo mapę: szybciej' : 'przytrzymaj mapę: szybciej');
      return;
    }
    b.disabled = true; actLabel(b, 'Koniec fali');
  }
  function updatePauseBtn() { }   // 1.07: the pause button is gone (kept as a name for older callers)
  function setPaused(v, quiet) {   // quiet: the tutorial's own pause says it itself
    if (!fl || fl.phase !== 'raid') { paused = false; return; }
    if (!v && trayIsOpen()) v = true;   // 1.07: while the build tray is open in a wave, time stands still whatever else closes
    if (paused !== v) tl('pa', v ? 1 : 0);
    paused = v; if (paused) ff = false;
    updateAction();   // 1.08: the button says when the game stands
    if (!quiet) setHint(paused ? 'Pauza. Możesz przesuwać mapę, stawiać elementy i stuknąć bohatera, żeby zobaczyć jego kartę.' : 'Gramy dalej.');
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
  const fmtK = n => n >= 10000 ? (n / 1000).toFixed(1).replace('.', ',') + 'k' : String(Math.round(n));
  function updateHud() {
    setText('h-wave', run.wave <= RUN_WAVES ? 'Fala ' + run.wave + '/' + RUN_WAVES : 'Fala ' + run.wave + ' ∞');
    const tot = run.total + (fl.phase === 'raid' ? fl.score : 0), raidNow = fl.phase === 'raid';
    // the big number is the Esencja in your purse; in a wave, under it, what this wave has brought so far (the heart's share too)
    tickScore();
    { const af = fl.phase === 'build' && !modalOpen && Math.floor(fl.essence) >= cheapestItem().cost; if (hudCache.afford !== af) { hudCache.afford = af; $('#h-score').classList.toggle('afford', af); } }   // 1.24 (D, P1-2): Esencja that buys something pulses
    setText('h-best', raidNow ? 'Esencja · fala +' + fmtE(fl.score) : 'Esencja');
    { const rk = rankOf(tot); setText('h-rank', raidNow ? '' : rk.next ? rk.name + ' · ' + rk.next[1] + ' za ' + Math.ceil(Math.max(0, rk.next[0] - tot)) : 'ranga: ' + rk.name); }   // the run's harvest gives the rank (hidden in a wave: the formula needs the room)
    // Prototype 1.01: the heart takes its share of THIS wave's Esencja first. In a wave the bar fills as it eats; between waves
    // the row says how much the next wave has to bring.
    { const need = hungerNeed(run.wave), inW = fl.phase === 'raid' || fl.phase === 'summary', fed = inW ? Math.min(fl.fed || 0, need) : 0, ok = !!need && fed >= need - 0.001;
      const risk = !inW && hungerRisk(), last = run.waves[run.waves.length - 1];   // 1.24 (D, P0-2): the build phase warns
      const row = $('#h-hrow'), k = (need ? 1 : 0) + '|' + (ok ? 1 : 0) + '|' + Math.floor(fed) + '|' + need + '|' + (inW ? 1 : 0) + '|' + (risk ? 1 : 0);
      if (hudCache.hunger !== k) {
        hudCache.hunger = k;
        row.classList.toggle('off', !need); row.classList.toggle('fed', ok); row.classList.toggle('hungry', !!need && !ok && inW); row.classList.toggle('warn', !!risk);
        row.title = risk ? 'Głód: jeśli ta fala da mniej niż ' + need + ' Esencji, serce zje kryształ' + (last ? ' (ostatnia fala dała ' + Math.round(last.score) + ')' : '') + '.' : 'Głód serca: po fali serce zje tyle Esencji, inaczej zje kryształ';   // 1.24 (D)
        $('#h-hfill').style.width = (need ? Math.min(1, fed / need) * 100 : 0).toFixed(1) + '%';
        $('#h-hlabel').textContent = !need ? 'serce głodne od fali 2' : ok ? 'serce syte' : inW ? 'serce ' + Math.floor(fed) + '/' + need : risk ? '⚠ ' + need + ' z fali albo kryształ' : 'serce chce ' + need + ' z fali';   // 1.24 (D): the warning
      }
    }
    const out = fl.party && fl.party.carrierId >= 0 && fl.phase === 'raid' ? 1 : 0;
    setText('h-cry', '◆'.repeat(Math.max(0, run.crystals - out)) + (out ? '◈' : '') + '◇'.repeat(Math.max(0, run.maxCrystals - run.crystals)));
    { const c = 2 * run.crystals - out; if (SC.cry != null && c < SC.cry && fl.phase !== 'build') crystalAlarm(); SC.cry = c; }   // stolen or eaten: the crystals shake, the map flashes red
    setText('h-time', fl.phase === 'build' ? 'budowa' : fl.phase === 'raid' ? (paused ? 'pauza' : fl.fearless ? (fl.storm ? 'szturm!' : 'odwrót') : fl.party && fl.party.council ? 'narada' : mmss(Math.max(0, S.waveTime - (fl.patT || 0)))) : 'koniec');
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
    if (!eq.dataset.hook) { eq.dataset.hook = '1'; const open = () => { if (!run || !fl || modalOpen) return; const un = fl.phase === 'raid' && !paused; if (un) setPaused(true); openModal({ type: 'esencja', unpause: un }); };
      eq.addEventListener('click', open); eq.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); }
    if (hudCache.mult !== txt) {
      hudCache.mult = txt;
      const now = performance.now(), pops = hudCache.pops = hudCache.pops || {};
      const set = (id, v) => { const b = $('#' + id + ' b'); if (b.textContent !== v) { b.textContent = v; if (B && now - (pops[id] || 0) > 220) { pops[id] = now; const e = $('#' + id); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); } } };
      set('eq-g', eqG); set('eq-c', eqC); set('eq-k', eqK); set('eq-e', eqE);
      $('#eq-c i').textContent = raid ? 'Chciwość' : 'Chciwość start'; $('#eq-k i').textContent = wait ? 'Combo czeka' : 'Combo';
      const vein = mods.regen !== 1; $('#eq-r').hidden = !vein; $('#eq-rop').hidden = !vein; if (vein) $('#eq-r b').textContent = fmt2(mods.regen);
      eq.classList.toggle('idle', !B); eq.classList.toggle('chain', !!C); eq.classList.toggle('paid', !!PY);
      $('#h-rankrow').hidden = raid;
    }
  }
  const fmtG = v => v < 1 ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') : fmtE(v);   // small Groza with two decimals
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
      i.title = 'Fala ' + n + (n % 10 === 0 ? ' (finał)' : n % 5 === 0 ? ' (czempion)' : '');
      box.appendChild(i);
    }
    box.setAttribute('aria-label', 'Postęp runu: fala ' + run.wave + ' z ' + RUN_WAVES);
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
    $('#tray-label').textContent = open ? '▼ Budowa' : '▲ Budowa';   // 1.06 (author): one button that looks the same both ways, only the arrow turns
    if (byUser && fl && fl.phase === 'build') { UI.trayBuild = open; saveUI(); }
    if (byUser && !open) tutFlags.trayFolded = true;   // 1.08: the tutorial asks you to fold it and unfold it
    if (was !== open) { if (!open && selected && fl && fl.phase === 'raid') { selected = null; } hideTip(); }   // 1.08: the stage follows the tray frame by frame (trayPaint)
    if (was !== open && fl && fl.phase === 'raid') {
      if (open) { setPaused(true, true); fl.stats.trayPauses = (fl.stats.trayPauses || 0) + 1; if ((UI.trayPauseHint || 0) < 3 && run && run.tut < 0) { UI.trayPauseHint = (UI.trayPauseHint || 0) + 1; saveUI(); setHint('Pauza: budujesz. Zwiń ▼ Budowa, żeby grać dalej.'); } }
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
    updateTray(); updateUndoBtn(); setHint('Cofnięte: ' + u.label + '.'); saveRunSoon();
  }
  function clearUndo() { undoStack = []; updateUndoBtn(); }
  function updateUndoBtn() {
    const b = $('#btn-undo'), n = undoStack.length, badge = $('#undo-n');
    b.disabled = !n || !fl || fl.phase !== 'build'; badge.hidden = !n; badge.textContent = String(n);
    b.setAttribute('aria-label', n ? 'Cofnij: ' + undoStack[n - 1].label : 'Nic do cofnięcia');
  }
  $('#btn-undo').addEventListener('click', () => { if (!modalOpen) undo(); });
  /* ================= speed ================= */
  function updateSpeedBtn() { return; const b = $('#btn-speed'), v = UI.speed || 1; $('#speed-l').textContent = '×' + v; b.classList.toggle('on', v > 1); b.setAttribute('aria-label', 'Prędkość ×' + v + ' (stuknij, żeby zmienić)'); }


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
    ({ start: renderStart, menu: renderMenu, settings: renderSettings, tests: renderTests, upgrade: renderUpgrade, wave: renderWave, over: renderOver, name: renderName, unspent: renderUnspent, end: renderEnd, survey: renderSurvey, victory: renderVictory, card: renderCard, item: renderItem, breach: renderBreach, hungerTip: renderHungerTip, onb: renderOnb, news: renderNews, shop: renderShop, hero: renderHero, esencja: renderEsencja, keys: renderKeys })[m.type](card, m);
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
    { id: 'fun', q: 'Jak Ci się grało?', nums: true, o: ['1', '2', '3', '4', '5'], scale: ['nudno', 'świetnie'] },
    { id: 'clear', q: 'Czy było jasne, co masz robić?', o: ['Tak, od początku', 'Po chwili tak', 'Długo nie', 'Do końca nie'] },
    { id: 'best', q: 'Co było najfajniejsze?', o: ['Budowanie lochu', 'Pułapki w akcji', 'Skill checki', 'Straszenie bohaterów', 'Karty i sklep', 'Nic szczególnego'] },
    { id: 'worst', q: 'Co najbardziej przeszkadzało?', o: ['Za dużo zasad i tekstu', 'Za długie fale albo run', 'Za trudno', 'Za łatwo', 'Sterowanie na telefonie', 'Nic'] },
    { id: 'again', q: 'Zagrasz jeszcze raz?', o: ['Tak', 'Może', 'Nie'] }
  ];
  function renderSurvey(card, m) {
    m.ans = m.ans || {};
    card.appendChild(el('div', 'sub', 'Ankieta · 5 pytań · ok. 1 minuty'));
    card.appendChild(el('h2', null, 'Jak było?'));
    card.appendChild(el('p', 'note', 'Odpowiedzi trafiają do autora razem z przebiegiem gry. Wszystkie pytania są opcjonalne.'));
    const box = el('div', 'survey');
    SURVEY.forEach(Q => {
      const q = el('div', 'q'); q.appendChild(el('b', null, Q.q));
      const row = el('div', 'opts' + (Q.nums ? ' nums' : ''));
      Q.o.forEach(o => { const b = el('button', m.ans[Q.id] === o ? 'on' : '', o); b.type = 'button'; b.addEventListener('click', () => { m.ans[Q.id] = m.ans[Q.id] === o ? undefined : o; row.querySelectorAll('button').forEach(x => x.classList.toggle('on', m.ans[Q.id] === x.textContent)); }); row.appendChild(b); });
      q.appendChild(row);
      if (Q.scale) { const s = el('div', 'scale'); s.appendChild(el('span', null, Q.scale[0])); s.appendChild(el('span', null, Q.scale[1])); q.appendChild(s); }
      box.appendChild(q);
    });
    const tq = el('div', 'q'); tq.appendChild(el('b', null, 'Coś jeszcze? (opcjonalnie)'));
    const ta = el('textarea'); ta.id = 'survey-text'; ta.maxLength = 1000; ta.placeholder = 'co zmienić, co dodać, co zepsute...'; ta.value = m.text || ''; ta.addEventListener('input', () => { m.text = ta.value; });
    tq.appendChild(ta); box.appendChild(tq);
    card.appendChild(box);
    const after = () => { if (m.next) openModal(Object.assign({}, m.next, { afterSurvey: true })); else { closeModal(); if (m.unpause && fl && fl.phase === 'raid') setPaused(false); } };
    const send = btn('primary', 'Wyślij', 'dzięki!', () => {
      const doc = { version: LOG_VERSION, device: deviceId, runId: run ? run.id : null, at: new Date().toISOString(), player: (playerName || '').slice(0, 40), playerId: playerIdNow(), answers: Object.assign({}, m.ans), text: (m.text || '').slice(0, 1000),   // 1.24 (D): playerId
        run: run ? { result: runStatus(), waves: run.waves.length, total: Math.round(run.total), tutorial: run.tutorial, minutes: Math.round((Date.now() - run.startedAt) / 60000) } : null };
      setSurveyState('done');
      getDb().then(db => db && db.collection('survey').doc(deviceId + '_' + (run ? run.id : 'menu')).set(doc)).catch(() => {});
      after();
    }); send.id = 'survey-send';
    const skip = el('button', 'link', 'Pomiń ankietę'); skip.type = 'button'; skip.id = 'survey-skip'; skip.addEventListener('click', () => { if (!surveyState()) setSurveyState('skipped'); after(); });
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
      if (installEvt) { const ib = btn('', 'Zainstaluj grę', 'ikona na ekranie, pełny ekran, bez paska przeglądarki', () => { const ev = installEvt; installEvt = null; ev.prompt(); (ev.userChoice || Promise.resolve()).then(restart); }); ib.id = 'start-install'; row.appendChild(ib); }
      else if (isIOS()) row.appendChild(el('p', 'note', 'iPhone: stuknij Udostępnij, potem "Do ekranu początkowego". Gra otworzy się wtedy z ikony na pełnym ekranie.'));
      else row.appendChild(el('p', 'note', 'Gra przejdzie na pełny ekran, gdy zaczniesz. Możesz też w menu przeglądarki wybrać "Dodaj do ekranu głównego".'));
    }
    row.appendChild(el('p', 'note', 'Ta testowa wersja zapisuje autorowi przebieg Twoich gier (bez danych osobowych; imię tylko, jeśli je wpiszesz), żeby mógł poprawić grę.'));
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
    card.appendChild(el('div', 'sub', 'Zanim zaczniesz'));
    card.appendChild(el('h2', null, 'Jak masz na imię?'));
    card.appendChild(el('p', null, 'Imię albo pseudonim. Dzięki niemu autor odróżni Twoje gry od gier innych osób, także na tym samym telefonie.'));
    const lab = el('label', 'field'); lab.textContent = 'Imię albo pseudonim';
    const inp = el('input'); inp.type = 'text'; inp.id = 'name-ask'; inp.maxLength = 40; inp.placeholder = 'np. Kasia'; inp.value = playerName || '';
    lab.appendChild(inp); card.appendChild(lab);
    const setAsked = v => { try { localStorage.setItem(NAME_ASKED, v); } catch (e) {} };
    const ok = btn('primary', 'Graj', null, () => {
      const v = inp.value.trim().slice(0, 40); if (!v) { inp.focus(); return; }
      playerName = v; try { localStorage.setItem('yatd-name', v); } catch (e) {}
      setAsked('name'); playerIdNow(); m.go();
    }); ok.id = 'name-ok';
    const skip = el('button', 'link', 'Pomiń'); skip.type = 'button'; skip.id = 'name-skip';
    skip.addEventListener('click', () => { setAsked('skipped'); playerIdNow(); m.go(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } });
    card.appendChild(ok); card.appendChild(skip);
  }
  function renderStart(card) {
    card.appendChild(el('div', 'sub', 'Prototype 1.25.1 · 10 fal i finał'));
    card.appendChild(el('h1', null, 'You are the dungeon'));
    card.appendChild(el('p', null, 'Jesteś lochem. Bohaterowie przychodzą falami po kryształy z Twojego serca, z każdą falą silniejsi i sprytniejsi. Pułapkami i potworami ranisz i straszysz, łupem wabisz. Rany i strach to Groza, a Groza × Chciwość × Combo to Esencja: za nią budujesz i nią karmisz serce. Przetrwaj 10 fal i bohatera z przepowiedni: to jest wygrana.'));
    const rec = loadRecords();
    if (rec.best || rec.runs) card.appendChild(el('p', 'note', 'Twój rekord: ' + Math.round(rec.best) + ' Esencji zebranej w runie (ranga: ' + rankOf(rec.best).name + ')' + (rec.wave ? ' · najdalej: fala ' + rec.wave : '') + (rec.runs ? ' · wygrane: ' + rec.wins + ' z ' + rec.runs : '') + '.'));
    const lab = el('label', 'field'); lab.textContent = 'Kto testuje (opcjonalnie)';
    const inp = el('input'); inp.type = 'text'; inp.id = 'player-name'; inp.maxLength = 40; inp.value = playerName; inp.placeholder = 'np. imię znajomego';
    inp.addEventListener('input', () => { playerName = inp.value; try { localStorage.setItem('yatd-name', playerName); } catch (e) {} });
    lab.appendChild(inp); card.appendChild(lab);
    const box = el('div', 'startbtns');
    const sv = loadSave();
    if (sv) {
      const c = btn('primary big', sv.run.tutorial && sv.run.tut >= 0 ? 'Kontynuuj samouczek' : 'Kontynuuj run', 'fala ' + sv.run.wave + (sv.stage === 'summary' ? ' zakończona' : '') + ' · zebrane ' + Math.round(sv.run.total) + ' Esencji · zapisano ' + new Date(sv.at).toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }), () => { closeModal(); userStarted = true; if (!resumeRun()) { setHint('Nie udało się wczytać zapisu.'); openModal({ type: 'start' }); } });
      c.id = 'start-continue'; box.appendChild(c);
    }
    // 1.12: the first four runs open the game step by step (the first one with the guide); "Pomiń samouczek" opens it all
    const onb = onbStage(), lost = sv ? ' · zapisany run przepadnie' : '';
    const drop = () => { if (sv) onbDone(Object.assign({}, sv.run, { result: 'quit' })); };   // a run of the first ones left after wave 5 counts as played
    if (onb <= 1) {   // 1.24 (B): one guided run opens the game with its waves; a browser in the middle of the old four runs plays the full game
      const first = !coachDone();
      const a = btn((sv ? '' : 'primary ') + 'big', first ? 'Samouczek' : 'Nowy run', (first ? 'Pierwszy run z przewodnikiem' : 'Pierwszy run: gra odsłania się z falami') + lost, () => withName(() => { closeModal(); userStarted = true; drop(); startGuided(); })); a.id = 'start-tut';   // 1.24 (D): withName
      const b = btn('big', 'Pomiń samouczek', 'Cała gra od razu' + lost, () => withName(() => { closeModal(); userStarted = true; setOnb(5); newRun(false); })); b.id = 'start-play';
      box.appendChild(a); box.appendChild(b);
    } else {
      const b = btn((sv ? '' : 'primary ') + 'big', 'Nowy run', sv ? 'zapisany run przepadnie' : 'Pełna gra', () => withName(() => { closeModal(); userStarted = true; newRun(false); })); b.id = 'start-play';   // 1.24 (D): withName
      const a = btn('big', 'Samouczek', 'Nauka od nowa: run z przewodnikiem, gra odsłania się z falami' + lost, () => withName(() => { closeModal(); userStarted = true; setOnb(1); try { localStorage.removeItem(COACH_KEY); localStorage.removeItem(POPS_KEY); } catch (e) {} startGuided(); })); a.id = 'start-tut';
      box.appendChild(b); box.appendChild(a);
    }
    card.appendChild(box);
    webStartRow(card);
    const how = el('details'); how.id = 'start-how'; how.appendChild(el('summary', null, 'Jak grać'));
    const ul = el('ul', 'conseq');
    ['Pierwszy run odsłania grę z falami: fale 1-2 to rany (pułapki i potwory), łup, kopanie, sklep i serce, od fali 3 straszenie, od fali 5 gildia, budowle i typy pokoi, od fali 7 ciała, fobie, powracający, łowcy i wyłom. Kolejne runy to od razu cała gra; Pomiń samouczek otwiera wszystko od razu.',
     'Między falami budujesz z paska na dole. Zakładki: Pułapki (te, które ranią, i te, które straszą), Potwory, Łup, Obiekty (skrzynia i budowle-kontry), Loch (nowe pokoje, przejścia, rozbudowa i typy pokoi), Talia. Każdy pokój mieści kilka elementów (licznik w rogu pokoju). Z rozwiniętym paskiem widzisz loch z wysoka (wysoka izometria), zwinięty pasek (▼ Budowa) pokazuje go tak jak w fali (izometria 2:1). W fali pasek sam się chowa, a rozwinięcie go (▲ Budowa) zatrzymuje grę: budujesz w spokoju, a ▼ Budowa gra dalej. Przycisku pauzy nie ma.',
     'Ściany od strony kamery są ścięte do podłogi, więc nic się za nimi nie chowa. Pułapka ścienna na takiej ścianie stoi przy niej jak tabliczka (przy wyborze takiej pułapki ramka ze strzałką pokazuje, w który pokój zadziała).',
     'Stuknięcie postawionego elementu albo mebla podnosi go (stuknij nowe miejsce, żeby przenieść), dwa szybkie stuknięcia ulepszają pułapkę albo potwora, przytrzymanie zdejmuje i oddaje Esencję. Przytrzymanie kafelka w pasku pokazuje, co robi. Działa też na pułapki, z którymi loch startuje (meble lochu nic nie oddają).',
     'W fali stukasz w mapę przy skill checku: obwódka to draśnięcie, pełne pole to krytyk (najmocniej), czaszka znaczy, że ktoś zginie. Każda pułapka ma swój kształt checku, a im silniejszy bohater, tym szybszy koralik.',
     'Jeden check ustawia pułapkę na dobre: krytyk albo draśnięcie zostaje (pełny krążek albo obwódka w rogu pola) także w kolejnych falach i pułapka dalej bije sama z tą siłą. Zapomina go po ulepszeniu albo gdy bohaterowie ją wyłączą (rozbroją, rozbiją, zabiją potwora, zablokują); przeniesienie go nie kasuje. Pudło albo brak stuknięcia: check wraca przy następnym razie. Gdy cios miałby zabić, check z czaszką pyta zawsze, a odpuszczona czaszka usypia pułapkę (☠ w rogu), dopóki nie może trafić bez zabijania.',
     'Przytrzymaj palec na mapie: gra przyspiesza, checków nie ma, a pułapki biją same: z zapamiętaną siłą albo jak draśnięcie. Puścisz palec i checki wracają.',
     'Gdy drużyna rozejdzie się po dużym lochu za daleko, ekran dzieli się na dwie części, po jednej dla każdej grupy (wyłączysz to w Ustawieniach). Przeciągnięcie mapy w fali daje na chwilę jeden ekran i wolną kamerę.',
     'Strach wypędza bohaterów; rany i śmierć towarzyszy też straszą, a strach powoli opada. Niosący kryształ rzuca go ze strachu. Uciekinier opowie innym o pułapkach, które go zraniły albo przestraszyły (najwyżej o 3, plotka żyje 2 fale), i może wrócić z blizną. Uwięzionego w klatce, którego nikt nie uwolni, klatka zabija.',
     'Bohaterowie mają 6 klas i każdą poznasz po figurce: hełm, tarcza i miecz (wojownik), kaptur i sztylet (złodziej), aureola i szata z krzyżem (kapłan), spiczasty kapelusz i laska (mag), kapelusz z piórem i lutnia (bard), rogi i topór (barbarzyńca). W jednej drużynie nigdy nie ma dwóch tej samej klasy. Bard krzepi pieśnią i woła zgubionych, barbarzyńca wpada w furię i rozbija skrzynie i budowle. Sakiewka przy bohaterze znaczy łowcę skarbów.',
     'Część pułapek nie rani, tylko straszy: portret, oczy, kości, lustro, zawiasy, trumna, pozytywka (w zakładce Pułapki, za raniącymi), a w zakładce Potwory duch, cień i nietoperze. Przestraszony uciekinier, który widział łup, opowie o nim i następna fala przyjdzie bardziej chciwa.',
     'Rany mają typ: kłute, obuchowe, ogień i trucizna. Klasa i ciało bohatera zmieniają obrażenia, a fobie podwajają strach. Stuknij bohatera (w fali albo na liście u góry), żeby zobaczyć jego kartę.',
     'Rany i strach to Groza. Dopóki trwa combo (różne pułapki pod rząd, każda w ciągu 3 s od poprzedniej; gdy nic się nie dzieje, ten czas płynie wolniej), Groza się zbiera, a każdy krok combo wzmacnia rany i strach kolejnych pułapek o 12%. Gdy combo się skończy, Groza wypłaca się jako Esencja: Groza × Chciwość (łup, rozległy loch, karty) × Combo. Chciwość rośnie coraz wolniej: im jej więcej, tym mniej dokłada kolejny łup. Esencję wydasz jeszcze w tej samej fali.',
     'Od fali 2 serce bierze pierwsze porcje Esencji z każdej fali, aż się naje (♥ u góry pokazuje ile). Fala da za mało: serce zje to, co dostało, i kryształ. Trzymaj bohaterów w lochu jak najdłużej: wypędzeni od razu nie nakarmią serca. Limitu Esencji nie ma.',
     'Za każdą przetrwaną falę (nawet z utratą kryształu) dostajesz darmową kartę, po bossie legendarną w ofercie. Wybierasz ją w sklepie po fali; tam też kupisz karty za Esencję, odświeżysz ofertę, sprzedasz kartę albo odłożysz ją do schowka. Kryształu nie da się odkupić.',
     'Gildia czyta raporty z fal i przysyła specjalistę: kontruj go budowlami (Ołtarz, Runa, Wabik, Kwas, Kamień wyjec, Okowy). Od fali 6 może przebić wyłom.',
     'Po fali jeden ekran: Esencja, serce, kryształy, rozliczenie, kilka ciekawostek i następna drużyna (stuknij wiersz, żeby zobaczyć kartę bohatera). Resztę liczb znajdziesz pod Szczegóły.'].forEach(t => ul.appendChild(el('li', null, t)));
    how.appendChild(ul); card.appendChild(how);
    const nw = el('details'); nw.id = 'start-new'; nw.appendChild(el('summary', null, 'Co nowego w Prototype 1.25.1'));
    const ul2 = el('ul', 'conseq');
    [
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
    nw.appendChild(ul2); card.appendChild(nw);
    const links = el('div', 'row small');
    links.appendChild(btn('', 'Ustawienia', 'dźwięk, wibracje, skill checki', () => { closeModal(); openModal({ type: 'settings', back: 'start' }); }));
    card.appendChild(links);
  }
  // The menu (the button bottom left): back to the game, settings, save and leave, download, end the run.
  function renderMenu(card, m) {
    const live = run && !run.over && fl && (fl.phase === 'build' || fl.phase === 'raid' || fl.phase === 'summary');
    const back = () => { closeModal(); if (m.unpause && fl && fl.phase === 'raid') setPaused(false); };
    card.appendChild(el('div', 'sub', live ? waveName() + ' · Esencja ' + Math.floor(fl.essence) : 'Menu'));
    card.appendChild(el('h2', null, 'Menu'));
    const box = el('div', 'choices');
    const g = btn('primary', 'Wróć do gry', null, back); g.id = 'menu-back'; box.appendChild(g);
    box.appendChild(btn('', 'Ustawienia', 'dźwięk, wibracje, pasek elementów, skill checki', () => { closeModal(); openModal({ type: 'settings', back: 'menu', unpause: m.unpause }); }));
    if (PC()) box.appendChild(btn('', 'Sterowanie', 'mysz, touchpad i klawiatura', () => { closeModal(); openModal({ type: 'keys', unpause: m.unpause }); }));   // 1.25
    if (WEB && surveyState() !== 'done') box.appendChild(btn('', 'Ankieta', '5 krótkich pytań o grę', () => openModal({ type: 'survey', unpause: m.unpause })));
    if (WEB && !standalone() && (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) {   // the web version: full screen on and off
      const full = isFull(); box.appendChild(btn('', full ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran', full ? 'wróci pasek przeglądarki' : 'bez paska przeglądarki', () => { UI.noFull = full; saveUI(); if (full) leaveFullscreen(); else goFullscreen(); back(); }));
    }
    const note = el('p', 'note', run && run.logState ? logText(run.logState) : '');
    if (live) box.appendChild(btn('', 'Zapisz i wyjdź', fl.phase === 'raid' ? 'wrócisz do budowy przed tą falą' : 'wrócisz w tym miejscu', () => { if (fl.phase === 'build') saveRun('build'); closeModal(); openModal({ type: 'start' }); }));
    if (live && run.waves.length + (fl.phase === 'raid' ? 1 : 0) > 0) {
      box.appendChild(btn('', 'Pobierz wyniki', 'plik .json do analizy', () => downloadRun(note)));
      const q = btn('', 'Zakończ run', 'zapisze to, co już jest', () => {
        if (!q.dataset.sure) { q.dataset.sure = '1'; q.querySelector('b').textContent = 'Na pewno? Stuknij jeszcze raz'; return; }
        closeModal(); quitRun();
      });
      box.appendChild(q);
    }
    card.appendChild(box); card.appendChild(note);
  }
  // 1.25: the controls on a computer
  function renderKeys(card, m) {
    card.appendChild(el('div', 'sub', 'Menu')); card.appendChild(el('h2', null, 'Sterowanie'));
    const t = el('table', 'keys');
    [['Lewy przycisk', 'jak stuknięcie: wybór, stawianie, przenoszenie, skill check; dwa szybkie kliknięcia ulepszają'],
     ['Przeciągnij', 'przesuwa mapę (lewym albo środkowym przyciskiem)'],
     ['Prawy przycisk', 'na kafelku: opis; na postawionym elemencie: zdejmij (kliknij drugi raz, żeby potwierdzić)'],
     ['Najechanie', 'opis kafelka, elementu na mapie albo bohatera'],
     ['Kółko', 'przybliża i oddala'], ['Touchpad', 'dwa palce przesuwają mapę, szczypanie przybliża'],
     ['W A S D, strzałki', 'przesuwają mapę'], ['+ / -', 'przybliża i oddala'],
     ['1-9, 0', 'kafelki w pasku (numer w rogu kafelka)'], ['Q / E', 'poprzednia i następna zakładka'],
     ['Enter', 'wypuść falę'], ['Spacja', 'skill check'], ['F (przytrzymaj)', 'przyspieszenie w fali'],
     ['B, P', 'pasek budowy (w fali: pauza)'], ['Ctrl+Z', 'cofnij (między falami)'], ['Esc', 'odłóż to, co masz w ręce']].forEach(r => {
      const tr = el('tr'); const a = el('td'); r[0].split(', ').forEach((x, i) => { if (i) a.appendChild(document.createTextNode(', ')); a.appendChild(el('kbd', null, x)); }); tr.appendChild(a); tr.appendChild(el('td', null, r[1])); t.appendChild(tr); });
    card.appendChild(t);
    const g = btn('primary', 'Wróć do gry', null, () => { closeModal(); if (m.unpause && fl && fl.phase === 'raid') setPaused(false); }); card.appendChild(g);
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
    card.appendChild(el('h2', null, 'Ustawienia'));
    GAME_SETTINGS.forEach(sd => card.appendChild(sliderRow(sd)));
    card.appendChild(el('p', 'note', 'Zapisują się w tej przeglądarce i działają od razu.'));
    const row = el('div', 'row');
    row.appendChild(btn('primary', 'Gotowe', null, settingsBack(m)));
    card.appendChild(row);
  }
  // Test sliders: the balance knobs for testing, kept apart from the player's settings.
  function renderTests(card, m) {
    card.appendChild(el('h2', null, 'Ustawienia testowe'));
    card.appendChild(el('p', 'note', 'Suwaki balansu dla testów. Zmiany działają od razu i zapisują się w tej przeglądarce. Kryształy, Esencja na start i miejsca w talii liczą się od nowego runu.'));
    SLIDERS.forEach(sd => card.appendChild(sliderRow(sd)));
    const row = el('div', 'row');
    row.appendChild(btn('', 'Przywróć domyślne', 'także ustawienia gry', () => { S = Object.assign({}, DEFAULTS); saveSettings(); closeModal(); openModal(m); }));
    row.appendChild(btn('primary', 'Gotowe', null, settingsBack(m)));
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
    const pool = UPGRADES.filter(u => u.kind !== 'unlock' && reqOk(u) && (ONB_CARD[u.id] || 1) <= stageOf() && !(u.unique && has(u.id)) && !isFused(u.id) && rarOk(u));   // 1.24: no third copy of a fused ★ card
    const picks = [];
    if (r === 3) { const leg = shuffle(pool.filter(u => u.rar === 'l')); if (leg.length) picks.push(leg[0]); }
    if (locked.length && (r >= 2 || Math.random() < 0.5)) picks.push(locked[0]);
    const rest = shuffle(pool.filter(u => !picks.includes(u)));
    while (picks.length < 3 && rest.length) picks.push(rest.shift());
    return shuffle(picks);
  }
  // v14: the shop between waves (like Balatro): free picks for waves held and points thresholds, four cards for Esencja,
  // a reroll that gets dearer (back to the base price every wave), selling, and a stash of inactive cards.
  const SHOP_PRICE = { c: 6, r: 10, l: 16 }, STASH_BASE = 3;   // Prototype 1.01: higher prices
  const stashCap = () => STASH_BASE + (mods.stashPlus || 0);
  const priceOf = u => Math.max(1, Math.round((u.kind === 'unlock' ? 8 : SHOP_PRICE[u.rar]) * (1 - (mods.shopDisc || 0))));
  const sellOf = u => Math.round(RAR_SELL[u.rar] * (mods.sellK || 1));
  const sellFor = id => UPG[id] ? sellOf(UPG[id]) * (isFused(id) ? 2 : 1) : 0;   // 1.24: a fused ★ card sells for two
  const fuses = u => !!u && u.kind === 'card' && !u.unique && ownsCard(u.id) && !isFused(u.id);   // 1.24: taking it fuses it with the one you have
  const unfuse = id => { if (run.fused) run.fused = run.fused.filter(x => x !== id); };   // 1.24: sold: the ★ goes with it
  const cardName = id => (isFused(id) ? '★ ' : '') + (UPG[id] ? UPG[id].name : id);   // 1.24
  const rerollCost = () => run.shop && run.shop.rerolls < (mods.freeReroll || 0) ? 0 : 3 + (run.shop ? run.shop.rerolls - (mods.freeReroll || 0) : 0);
  function shopRoll() {
    const owed = run.shopOwed || 1, ids = upgradePicks(owed).map(u => u.id);
    const more = upgradePicks(1).map(u => u.id).filter(id => !ids.includes(id));
    if (more.length) ids.push(more[0]);
    return ids.filter(id => !(UPG[id].unique && (run.stash || []).includes(id)) && !isFused(id)).slice(0, 4);   // 1.24: isFused
  }
  function shopRefresh(fresh) {
    const same = run.shop && run.shop.wave === run.wave;
    run.shop = { wave: run.wave, ids: shopRoll(), rerolls: same && !fresh ? run.shop.rerolls : 0, ad: same && !fresh ? run.shop.ad : false };
    if (fresh) run.shopOwed = 1;
    run.stash = run.stash || [];
  }
  function shopBuy(i) {
    const id = run.shop.ids[i], u = UPG[id]; if (!u || !fl || fl.phase !== 'build') return 'no';
    const free = run.freePicks > 0, price = free ? 0 : priceOf(u);
    if (!free && fl.essence < price) return 'ess';
    const fz = fuses(u), toStash = u.kind === 'card' && !fz && run.deck.length >= run.deckSize;   // 1.24: a second copy needs no slot
    if (toStash && run.stash.length >= stashCap()) return 'full';
    if (free) run.freePicks--; else fl.essence -= price;
    run.shop.ids[i] = null;
    if (toStash) { run.stash.push(id); run.upgrades.push(id); } else applyUpgrade(u);
    run.essence = fl.essence; recomputeMods(); updateTray(); saveRunSoon();
    return toStash ? 'stash' : fz ? 'fused' : 'ok';
  }
  function shopReroll(ad) {
    if (!fl || fl.phase !== 'build') return false;
    if (ad) { if (run.shop.ad) return false; run.shop.ad = true; }
    else { const c = rerollCost(); if (fl.essence < c) return false; fl.essence -= c; run.shop.rerolls++; }
    run.shop.ids = shopRoll(); run.essence = fl.essence; updateTray(); saveRunSoon(); return true;
  }
  function toStash(i) {
    if (run.stash.length >= stashCap() || !run.deck[i]) return false;
    run.stash.push(run.deck.splice(i, 1)[0]); recomputeMods(); updateTray(); saveRunSoon(); return true;
  }
  function fromStash(i) {
    if (run.deck.length >= run.deckSize || !run.stash[i]) return false;
    run.deck.push(run.stash.splice(i, 1)[0]); recomputeMods(); updateTray(); saveRunSoon(); return true;
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
      while (box.scrollHeight > box.clientHeight + 1) { const vis = rows.filter(r => r.style.display !== 'none'); if (vis.length <= 1) break; vis[vis.length - 1].style.display = 'none'; hidden++; more.textContent = '+' + hidden + ' więcej'; }
      if (hidden) more.textContent = '+' + hidden + ' więcej'; else more.remove();
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
    const ch = el('div', 'wchart'); ch.setAttribute('aria-label', 'Esencja w kolejnych falach');
    for (let k = 1; k <= n; k++) {
      const w = W.find(q => q.wave === k), c = el('div', 'wc' + (k === curWave ? ' cur' : '') + (w ? '' : ' future')), col = el('div', 'col');
      if (w) {
        const pct = Math.max(3, Math.round(100 * w.score / maxS)), bar = el('i', w.crystalLost || (w.hunger && w.hunger.ate) ? 'lost' : '');
        bar.style.height = pct + '%'; bar.title = 'Fala ' + k + ': ' + w.score + ' Esencji'; col.appendChild(bar);
        if (w.hunger && w.hunger.need) { const t = el('u'); t.style.bottom = Math.round(100 * w.hunger.need / maxS) + '%'; col.appendChild(t); }
        if (k === curWave) col.appendChild(el('em', null, String(w.score)));   // 1.05: at the foot of the bar (CSS), readable on any height
      }
      c.appendChild(col); c.appendChild(el('span', null, String(k))); ch.appendChild(c);
    }
    parent.appendChild(ch); return ch;
  }
  const frow = (list, text, k) => list.appendChild(el('div', 'frow' + (k ? ' k-' + k : ''), text));

  /* ----- the wave summary ----- */
  // 1.05 (testers: the summary was a lot): one screen with what matters now: the harvest and the heart's share (the old reckoning
  // screen is folded in), Esencja, the heart, the crystals, the chart, three curiosities of the wave and the next party at a glance.
  // Where the Esencja came from, the hero list, the elements and the numbers sit under Szczegóły.
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
    if (it.gaveNm) return ' - od ' + nameGen({ nm: it.gaveNm, female: it.gaveFem });
    const s = it.src || 'kit';
    if (s === 'trophy') return ' - trofeum z fali ' + (it.wave || '?');
    if (s === 'relic') return ' - relikwia z Twojego lochu';
    if (s === 'loot') return ' - z Twojego lochu';
    if ((s === 'body' || (h && it.ownerNm && it.ownerNm[0] !== h.nm[0])) && it.ownerNm) return ' - z rzeczy ' + nameGen({ nm: it.ownerNm, female: it.ownerFem });
    return s === 'guild' ? ' - od gildii' : ' - z domu';
  }
  const svgI = (inner, color, cls) => '<svg class="' + (cls || 'gi') + '" viewBox="0 0 24 24" aria-hidden="true"><g fill="' + color + '" fill-rule="evenodd">' + inner + '</g></svg>';
  function classIconSvg(type, color, cls) {
    const ic = CLASS_ICON[type]; if (!ic) return '';
    return '<svg class="' + (cls || 'ci') + '" viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(' + ic.rot + ' 12 12)"><path fill-rule="evenodd" fill="' + color + '" d="' + ic.d + '"/></g></svg>';
  }
  const DMG_SHORT = { pierce: 'kłute', blunt: 'obuch.', fire: 'ogień', poison: 'trucizna' };
  // what a hero entry is weak to: class and (when known) body; the strongest first
  function weakOf(e, known) {
    const k = Object.assign({}, CLASS_RES[e.type] || {});
    if (e.phys && known) { const P = PHYS[e.phys]; for (const t in P.res) k[t] = (k[t] || 1) * P.res[t]; }
    return Object.keys(k).filter(t => k[t] >= 1.1).sort((a, b) => k[b] - k[a]).map(t => DMG_SHORT[t]);
  }
  // one row of the next party: icon, name, class and level, character; what the class does; gear; weaknesses and what is known
  function nextRow(e) {
    const T = HEROES[e.type], fem = e.female, kn = new Set(e.known || []), all = mods.revealAll;
    const r = el('div', 'np'); r.dataset.cls = e.type;
    const ic = el('span', 'npi'); ic.innerHTML = classIconSvg(e.type, T.color); r.appendChild(ic);
    const l1 = el('div', 'np1');
    const nm = el('b', null, nemName(e)); nm.style.color = T.color; l1.appendChild(nm);   // 1.23: with his title
    l1.appendChild(el('small', null, ' ' + T.name[fem ? 1 : 0] + ' ' + e.lvl));
    if (e.boss) l1.appendChild(el('i', 'tg boss', e.boss === 'final' ? 'przepowiednia' : 'czempion'));
    if (e.trait) l1.appendChild(el('i', 'tg', HERO_TRAITS[e.trait].name[fem ? 1 : 0]));
    if (e.hunter) { const b = el('i', 'tg bag'); b.innerHTML = classIconSvg('bag', '#f2b94b', 'gi'); b.title = 'łowca skarbów'; l1.appendChild(b); }
    if (e.returning) { const b = el('i', 'tg back', '↺'); b.title = 'wraca z blizną'; l1.appendChild(b); }
    if (e.nemesis) { const b = el('i', 'tg boss', '☠ nemezis'); b.title = 'Nagroda za głowę: ' + bountyOf(e) + ' Esencji'; l1.appendChild(b); }   // 1.23
    if (e.recruit) l1.appendChild(el('i', 'tg', 'rekrut'));
    { const bm = bondMate(e, null); if (bm) l1.appendChild(el('i', 'tg', bondLabel(e.bond, bm))); }   // 1.21: his bond
    r.appendChild(l1);
    const kit = el('div', 'kit');
    if (!e.inv.length) kit.appendChild(el('small', null, 'bez sprzętu'));
    e.inv.forEach(it => { const s = el('span'); s.innerHTML = svgI(ITEM_GLYPH[it.type] || '', ITEM_COLOR[it.type] || '#ccc') + (it.charges > 1 ? '<small>' + it.charges + '</small>' : ''); s.title = itemLabel(it) + srcText(it, e); if (HITEMS[it.type].tool || it.src === 'trophy') { s.style.outline = '1px solid ' + (it.src === 'trophy' ? '#ff8a3c' : '#ffffff'); s.style.borderRadius = '3px'; } kit.appendChild(s); });   // 1.20: src, a tool or a trophy framed
    r.appendChild(kit);
    // second line, under the name and the gear: what the class does, its weak spots and what the tavern does not know
    const l2 = el('div', 'np2'); l2.appendChild(document.createTextNode(CLASS_SKILL[e.type] || ''));
    const wk = weakOf(e, kn.has('phys') || all);
    if (wk.length) l2.appendChild(el('span', 'bad', ' · słaby: ' + wk.slice(0, 2).join(', ')));
    const ph = e.phobia && (kn.has('phobia') || all) ? PHOBIAS[e.phobia].name : null;
    if (ph) l2.appendChild(el('span', 'bad', ' · boi się: ' + ph));
    const unk = [!(kn.has('phys') || all) ? 'ciało' : '', !(kn.has('phobia') || all) ? 'fobia' : ''].filter(Boolean);
    if (unk.length) l2.appendChild(el('span', 'unk', ' · ? ' + unk.join('/')));
    if (e.nemesis) { const s = el('span', null, ' · Nagroda za głowę: ' + bountyOf(e) + ' Esencji'); s.style.color = '#ffd27a'; l2.appendChild(s); }   // 1.23
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
    if (fav) out.push({ k: 'fav', l: 'Ulubiona pułapka', v: ITEMS[fav].name, d: B[fav].fires + '× w akcji' });
    const pool = [];
    const killer = best(b => b.kills, b => b.kills >= 1);
    if (killer) pool.push({ k: 'kill', l: 'Zabójca fali', v: ITEMS[killer].name, d: B[killer].kills + (B[killer].kills === 1 ? ' zabity' : ' zabitych') });
    const quiet = best(b => b.passivePts + (b.memFires || 0), b => b.passivePts >= 1 || (b.memFires || 0) >= 3);
    if (quiet) { const b = B[quiet]; pool.push({ k: 'quiet', l: b.kills ? 'Cichy zabójca' : 'Cichy pomocnik', v: ITEMS[quiet].name, d: (b.memFires || 0) >= 3 ? b.memFires + ' ciosów bez stuknięcia' : fmtE(b.passivePts) + ' Esencji bez checku' }); }
    const hs = fl.heroes.filter(h => h.entry);
    const taken = h => Object.values(h.dmgBy || {}).reduce((a, v) => a + v, 0);
    const mvp = hs.filter(h => !h.dead).sort((a, b) => taken(b) - taken(a))[0];
    if (mvp && taken(mvp) >= 20) pool.push({ k: 'mvp', l: 'MVP bohaterów', v: mvp.nm[0] + ' (' + className(mvp).toLowerCase() + ')', d: 'przyjął' + (mvp.female ? 'a' : '') + ' ' + Math.round(taken(mvp)) + ' ran i ' + fate(mvp) });
    const scared = hs.filter(h => h.fleeing && !h.dead && !h.carriedOut).sort((a, b) => (b.fear / b.courage) - (a.fear / a.courage))[0];
    if (scared) { const top = Object.entries(scared.fearBy || {}).sort((a, b) => b[1] - a[1])[0]; pool.push({ k: 'scared', l: 'Najbardziej przerażony', v: scared.nm[0] + ' (' + className(scared).toLowerCase() + ')', d: top ? 'najbardziej bał' + (scared.female ? 'a' : '') + ' się: ' + fearSrcName(top[0]) : 'uciekł' + (scared.female ? 'a' : '') }); }
    if (s.maxCombo >= 3) pool.push({ k: 'combo', l: 'Najwyższe combo', v: '×' + fmt2(1 + 0.25 * (s.maxCombo - 1)), d: s.maxCombo + (s.maxCombo >= 5 ? ' różnych pułapek' : ' różne pułapki') + ' pod rząd' });
    const ck = s.checkCrit + s.checkOk + s.checkMiss;
    if (ck >= 3) pool.push({ k: 'crit', l: 'Krytyki', v: s.checkCrit + ' z ' + ck, d: 'checków w tej fali' });
    if (s.gotLost >= 1) pool.push({ k: 'lost', l: 'Zgubieni', v: String(s.gotLost), d: Math.round(s.loneTime || 0) + ' s samotności' });
    if (s.splits >= 1 && (s.splitTime || 0) >= 4) pool.push({ k: 'split', l: 'Rozdzieleni', v: s.splits + (s.splits === 1 ? ' raz' : ' razy'), d: Math.round(s.splitTime) + ' s na zwiadzie' + (s.splitLost ? ', zabłądzili: ' + s.splitLost : '') });   // 1.16
    if ((s.looks || 0) >= 2) pool.push({ k: 'look', l: 'Zwiedzali', v: s.looks + ' razy', d: (s.goldFound ? 'znaleźli ' + s.goldFound + ' ' + (s.goldFound === 1 ? 'monetę' : s.goldFound < 5 ? 'monety' : 'monet') : 'nic nie znaleźli') + (s.lookTraps ? ', obudzili pułapkę: ' + s.lookTraps : '') });
    if (s.councils) pool.push({ k: 'council', l: 'Narada', v: s.councilStorm ? 'szturm' : s.councilMore ? 'jeszcze chwila' : 'do domu', d: s.goHome ? 'przegłosowani wrócili sami: ' + s.goHome : 'zdecydowali razem' });
    if (s.disarmed >= 2) pool.push({ k: 'dis', l: 'Rozbrojone', v: s.disarmed + (s.disarmed >= 5 ? ' pułapek' : ' pułapki'), d: 'wyłączyli bohaterowie' });
    if (s.lootSeen >= 2) pool.push({ k: 'loot', l: 'Łup', v: s.loot + ' z ' + s.lootSeen, d: 'skarbów, które zobaczyli, zabrali' });
    shuffle(pool); while (out.length < 3 && pool.length) out.push(pool.shift());
    return out;
  }
  function renderWave(card, m) {
    const s = fl.stats, won = !!fl.victory, H = fl.hunger;
    lastWaveModal = m;
    if (won) card.classList.add('vic');
    const heart = H ? Math.min(H.need, fl.fed || 0) : 0, ate = !!(H && !H.fed), mine = ate ? 0 : Math.max(0, fl.score - heart);
    scrHead(card, waveName() + ' · ' + mmss(fl.time), won ? 'Zwycięstwo!' : fl.crystalLost ? 'Kryształ skradziony' : ate ? 'Serce zjadło kryształ' : 'Fala odparta', '+' + fmtE(fl.score), 'Esencji z fali', [fl.score, v => '+' + fmtE(v)]);
    const body = el('div', 'scr-body'); card.appendChild(body);
    if (m.details) waveDetails(body, card, m);
    else {
      const tiles = el('div', 'statrow');
      statTile(tiles, String(Math.floor(run.essence)), 'masz Esencji', 'ess');
      if (H) statTile(tiles, '♥ ' + H.need, H.fed ? 'serce syte' : 'zjadło kryształ', H.fed ? 'good' : 'bad');
      else statTile(tiles, '-', run.wave < 2 ? 'głód od fali 2' : 'serce');
      statTile(tiles, run.crystals + '/' + run.maxCrystals, 'kryształy', fl.crystalLost || ate ? 'bad' : 'good');
      statTile(tiles, s.kills + ' · ' + s.scared, 'zabici · przestr.');
      body.appendChild(tiles);
      { const fp = el('p', 'note fearline'); fp.id = 'wave-fear-line';   // 1.24 (B, P1-4): scaring is a way too, so it is said even at 0
        fp.innerHTML = 'Zabici: <b>' + s.kills + '</b> (' + fmtE((s.killPts || 0) + (s.dmgPts || 0)) + ' pkt z ran) · <span class="sc">Wystraszeni: <b>' + s.scared + '</b> (' + fmtE((s.scarePts || 0) + (s.fearPts || 0)) + ' pkt ze strachu)</span>';
        body.appendChild(fp); }
      crystalWhy(body, H, heart);   // 1.24 (D, P0-2)
      // the reckoning (1.01-1.04 had a screen of its own): Groza x the multipliers = Esencja, the heart's share, what is yours
      const rk = el('div', 'reck' + (ate ? ' ate' : ''));
      const part = (cls, html) => { const sp = el('span', cls); sp.innerHTML = html; rk.appendChild(sp); };
      part('g', 'Groza <b>' + fmtG(fl.base) + '</b> × ' + fmt2(fl.base > 0 ? fl.score / fl.base : 1) + ' = <b class="e">' + fmtE(fl.score) + '</b>');
      if (H) part('h', H.fed ? '♥ <b>−' + fmtE(H.need) + '</b>' : '♥ za mało: <b>−' + fmtE(heart) + ' · kryształ</b>');
      part('m', 'dla Ciebie <b>+' + fmtE(mine) + '</b>' + (run.lastIncome ? ' <small>(+' + run.lastIncome + ' po fali)</small>' : ''));
      body.appendChild(rk);
      fl.heroes.filter(h => h.nemesis).forEach(h => {   // 1.23: the bounty on a Nemezis of this wave: paid, or he got away (and comes back)
        const p = el('p', 'note', 'Nagroda za głowę: ' + bountyOf(h.entry) + ' Esencji · ' + heroName(h) + ': ' + (h.dead ? 'wypłacona.' : h.fled ? (h.female ? 'uciekła' : 'uciekł') + ', wróci z wyższą nagrodą.' : 'wciąż w lochu.')); p.style.color = '#ffd27a'; body.appendChild(p);
      });
      if (ate && !m.alarmed) { m.alarmed = true; setTimeout(() => { if (modalKind === 'wave') crystalAlarm(); }, reduceMotion ? 0 : 900); }
      waveChart(panel(body, 'Esencja z fal', 'kreska: porcja serca'), run.waves, run.wave);
      m.fun = m.fun || waveFun();
      if (m.fun.length) {
        const fr = el('div', 'fun');
        m.fun.forEach(f => { const d = el('div', 'fs'); d.appendChild(el('span', null, f.l)); d.appendChild(el('b', null, f.v)); d.appendChild(el('small', null, f.d)); fr.appendChild(d); });
        body.appendChild(fr);
      }
      const nx = run.crystals > 0 && run.nextFor === run.wave + 1 ? run.next : null;
      if (nx && nx.length) {
        const lv = nx.map(e => e.lvl), lo = Math.min(...lv), hi = Math.max(...lv), g = run.guild;
        const pn = panel(body, 'Fala ' + (run.wave + 1) + ': ' + nx.length + ' bohaterów, poz. ' + (lo === hi ? lo : lo + '-' + hi), g ? 'gildia: ' + HEROES[GUILD_WANT[g.kind]].name[0].toLowerCase() : hungerNeed(run.wave + 1) ? 'serce chce ' + hungerNeed(run.wave + 1) : '', 'nextp');
        const list = el('div', 'nplist'); nx.forEach(e => list.appendChild(nextRow(e))); pn.appendChild(list);
        nx.filter(e => e.nemesis).forEach(e => { const p = el('p', 'note', '☠ ' + nemName(e) + ' wraca ' + (e.times || 1) + '. raz. Nagroda za głowę: ' + bountyOf(e) + ' Esencji.'); p.style.color = '#ffd27a'; pn.appendChild(p); });   // 1.23
        fitList(list);
      }
    }
    // the way on
    const foot = el('div', 'scr-foot'); card.appendChild(foot);
    if (won) {
      const row = el('div', 'row');
      const go = btn('primary', 'Graj dalej', 'fale bez końca', () => { run.victoryDone = true; closeModal(); afterSummary(); }); go.id = 'vic-continue';
      const end = btn('', 'Zakończ: zwycięstwo', 'zapisze wygrany run', () => { run.victoryDone = true; closeModal(); endRun('Loch przetrwał wszystkie ' + RUN_WAVES + ' fal.', 'win'); }); end.id = 'vic-end';
      row.appendChild(go); row.appendChild(end); foot.appendChild(row);
    } else {
      const pu = run.pendingUpgrades, fp = pu.length + (run.freePicks || 0), alive = run.crystals > 0 && !(run.wave === RUN_WAVES && !run.won);
      const nb = btn('primary', run.crystals > 0 ? 'Dalej: sklep przed falą ' + (run.wave + 1) : 'Dalej', alive && fp ? 'darmowe karty: ' + fp + (pu.some(p => p.src === 'boss') ? ' (legendarna w ofercie)' : '') : null, () => { closeModal(); afterSummary(); });
      nb.id = 'wave-next'; foot.appendChild(nb);
    }
    const mr = el('div', 'minirow'), dn = el('p', 'note', '');
    const det = el('button', 'mini' + (m.details ? '' : ' strong'), m.details ? '‹ Wróć' : 'Szczegóły'); det.type = 'button'; det.id = 'wave-details';
    det.addEventListener('click', () => { m.details = !m.details; card.classList.remove('enter'); card.innerHTML = ''; renderWave(card, m); });
    mr.appendChild(det);
    const dl = el('button', 'mini', 'Pobierz wyniki'); dl.type = 'button'; dl.addEventListener('click', () => downloadRun(dn)); mr.appendChild(dl);
    if (run.crystals > 0 && !won) { const sq = el('button', 'mini', 'Zapisz i wyjdź'); sq.type = 'button'; sq.addEventListener('click', () => { saveRun('summary'); closeModal(); openModal({ type: 'start' }); }); mr.appendChild(sq); }
    if (run.crystals > 0 && !won) {
      const q = el('button', 'mini', 'Zakończ run'); q.type = 'button';
      q.addEventListener('click', () => { if (!q.dataset.sure) { q.dataset.sure = '1'; q.textContent = 'Na pewno?'; return; } closeModal(); endRun('Run zakończony przez gracza po fali ' + run.wave + '.', 'quit'); });
      mr.appendChild(q);
    }
    foot.appendChild(mr);
    dn.textContent = m.logNote || 'Zapisuję falę...'; foot.appendChild(dn);
    if (!m.logNote) Promise.resolve(run.lastLog).then(() => { m.logNote = (logText(run.logState) || '') + ' Run zapisany w tej przeglądarce.'; if (dn.isConnected) dn.textContent = m.logNote; });
    if (won && !m.pushed) { m.pushed = true; pushLog(null); }
  }
  // Szczegóły: where the Esencja came from, then four views in one box (what comes next, the heroes, the elements, the numbers)
  function waveDetails(body, card, m) {
    const s = fl.stats, H = fl.hunger;
    const src = [['Rany', s.dmgPts, '#ff8a7a'], ['Strach', s.fearPts, '#c3b2ff'], ['Ucieczki', s.scarePts, '#8a6fe0'], ['Zabici', s.killPts, '#d8434f'], ['Łup', s.lootPts, '#f2b94b'],
      ['Combo', s.comboPts || 0, '#a9d4da'], ['Inne', (s.crystalPts || 0) + (s.lostPts || 0) + (s.lonePts || 0) + (s.splitPts || 0) + (s.healPts || 0), '#7d7590']].filter(r => r[1] > 0.05);
    const tot = src.reduce((a, r) => a + r[1], 0) || 1;
    const ps = panel(body, 'Skąd Esencja', 'Groza ' + fmtE(fl.base) + ' × średnio ' + fmt2(fl.base > 0 ? fl.score / fl.base : 1));
    const sb = el('div', 'srcbar'); src.forEach(r => { const i = el('i'); i.style.width = (100 * r[1] / tot).toFixed(1) + '%'; i.style.background = r[2]; i.title = r[0]; sb.appendChild(i); }); ps.appendChild(sb);
    const lg = el('div', 'srclg');
    src.slice().sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(r => { const d = el('span'), dot = el('i'); dot.style.background = r[2]; d.appendChild(dot); d.appendChild(document.createTextNode(r[0] + ' ' + fmtE(r[1]))); lg.appendChild(d); });
    if (!src.length) lg.appendChild(el('span', null, 'Ta fala nic nie dała.'));
    ps.appendChild(lg);
    const TABS_W = [['next', 'Co dalej'], ['heroes', 'Bohaterowie'], ['items', 'Elementy'], ['nums', 'Liczby']], cur = m.tab || 'next';
    const seg = el('div', 'seg');
    TABS_W.forEach(([id, label]) => { const b = el('button', id === cur ? 'on' : '', label); b.type = 'button'; b.id = 'wtab-' + id; b.addEventListener('click', () => { if (m.tab === id) return; m.tab = id; card.classList.remove('enter'); card.innerHTML = ''; renderWave(card, m); }); seg.appendChild(b); });
    body.appendChild(seg);
    const box = el('div', 'panel segpanel'), list = el('div', 'flist' + (cur === 'nums' ? ' grid2' : '')); box.appendChild(list); body.appendChild(box);
    if (cur === 'next') {
      const nb = bossOf(run.wave + 1), items = [s.swaps ? 'wymiany: ' + s.swaps : '', s.potionsGiven ? 'mikstury podane: ' + s.potionsGiven : '', s.charms ? 'talizmany: ' + s.charms : '', s.amulets ? 'amulety: ' + s.amulets : '', s.boots ? 'buty: ' + s.boots : '',
        s.gearGiven ? 'przekazane: ' + s.gearGiven : '', s.bodyLoot ? 'z ciał: ' + s.bodyLoot : '', s.gearKnocked ? 'wybite: ' + s.gearKnocked : '', s.lanternOut ? 'zgaszone latarnie: ' + s.lanternOut : '', s.bombCook ? 'bomby w ogniu: ' + s.bombCook : ''].filter(Boolean);   // 1.20
      if (H && !H.fed) frow(list, 'Serce chciało ' + H.need + ' Esencji z fali, a fala dała ' + fmtE(fl.score) + ': zjadło wszystko i kryształ.', 'heart');
      else if (H) frow(list, 'Serce wzięło pierwsze ' + H.need + ' Esencji' + (H.fedAt != null ? ' (najadło się w ' + mmss(H.fedAt) + ')' : '') + ', reszta (' + fmtE(Math.max(0, fl.score - H.need)) + ') trafiła do Ciebie.', 'heart');
      if (run.wave < RUN_WAVES || run.won) frow(list, 'Fala ' + (run.wave + 1) + ': poziom ok. ' + Math.round(waveBase(run.wave + 1)) + (nb ? ', prowadzi ' + (nb === 'final' ? 'bohater z przepowiedni' : 'czempion') : '') + '.', 'wave');
      if (run.guild && run.crystals > 0) frow(list, 'Gildia ' + run.guild.text, 'wave');
      if (hungerNeed(run.wave + 1)) frow(list, 'Następna fala: serce weźmie pierwsze ' + hungerNeed(run.wave + 1) + ' Esencji. Trzymaj bohaterów w lochu, żeby było z czego.', 'heart');
      frow(list, 'Esencja: +' + run.lastIncome + ' po fali' + (run.lastInterest ? ' (odsetki ' + run.lastInterest + ')' : '') + ', masz ' + Math.floor(run.essence) + '.', 'ess');
      frow(list, m.out ? 'Plotki: uciekinierzy opowiedzą o ' + m.rr + ' pokojach i ' + m.rt + ' pułapkach (tylko o tych, które ich zraniły albo przestraszyły). Przestaw je albo postaw Zasłonę.' : 'Nikt nie wyszedł żywy: Twoje sekrety są bezpieczne.');
      if (s.treasureTale) frow(list, 'Opowieści o skarbach: chciwość na start następnej fali +' + fmt2(s.treasureTale) + '.', 'ess');
      if (s.greedKept) frow(list, 'Zabrany łup: chciwość +' + fmt2(s.greedKept) + ' do końca runu (razem +' + fmt2(run.greedKeep) + ').', 'ess');
      frow(list, 'Gildia słyszy o chciwości ×' + fmt2(run.greedRep || 1) + ': przywódca +' + f1(huntersLv()) + ' poziomu' + (huntersN(run.greedRep || 1) ? ', przyjdą łowcy skarbów (' + huntersN(run.greedRep || 1) + ')' : '') + '.');
      if (s.breach || s.breachOpen) frow(list, s.breach ? 'Ta fala weszła przez wyłom. Załatasz go stuknięciem w budowie.' : 'Wyłom wciąż otwarty (stuknij go w budowie, żeby załatać).', 'wave');
      if (s.preps) frow(list, 'Drużyna szykowała się ' + s.preps + '× przed groźnym pokojem. Kontry: Runa, Ołtarz, Wabik.');
      if (s.runeBlocks || s.altarBlocks || s.alarms) frow(list, 'Budowle zadziałały: ' + [s.runeBlocks ? 'runa ' + s.runeBlocks + '×' : '', s.altarBlocks ? 'ołtarz ' + s.altarBlocks + '×' : '', s.alarms ? 'wabik ' + s.alarms + '×' : ''].filter(Boolean).join(', ') + '.');
      if (s.detours || s.gotLost) frow(list, 'Błądzenie: złe skręty ' + s.detours + ', zgubieni ' + s.gotLost + '.');
      if (items.length) frow(list, 'Przedmioty bohaterów: ' + items.join(', ') + '.');
      if (s.faithOut) frow(list, 'Kapłanowi zabrakło wiary ' + s.faithOut + '×.');
      if (s.sapped) frow(list, 'Saperzy rozmontowali na dobre: ' + s.sapped + '.');
      { const rk = rankOf(run.total); frow(list, 'Ranga runu: ' + rk.name + ' (' + Math.round(run.total) + ' Esencji' + (rk.next ? ', ' + rk.next[1] + ' od ' + rk.next[0] : '') + ').'); }
    } else if (cur === 'heroes') {
      fl.heroes.forEach(h => {
        const r = el('div', 'hrow'), l = el('span');
        const ic = el('span', 'hi'); ic.innerHTML = classIconSvg(h.type, h.T.color); l.appendChild(ic);
        l.appendChild(el('b', null, heroName(h))); l.appendChild(el('small', null, ' ' + className(h).toLowerCase() + ' ' + h.lvl + (h.boss ? ' · boss' : '')));
        r.appendChild(l); r.appendChild(el('span', 'f-' + (h.dead ? 'dead' : h.carriedOut ? 'crystal' : h.fleeing ? 'scared' : 'left'), fate(h)));
        list.appendChild(r);
      });
      if (!fl.heroes.length) frow(list, 'Brak bohaterów.');
    } else if (cur === 'items') {
      const rows = Object.keys(fl.byType).filter(k => !TOOLS[k] && ITEMS[k]).map(k => ({ k, b: fl.byType[k], pts: fl.byType[k].pts + fl.byType[k].passivePts + fl.byType[k].fearPts })).filter(r => r.pts > 0.05 || r.b.placed > 0).sort((a, b) => b.pts - a.pts);
      const mx = Math.max(0.01, ...rows.map(r => r.pts));
      rows.forEach(r => { const d = el('div', 'irow'), bar = el('i'); bar.style.width = Math.max(2, Math.round(100 * r.pts / mx)) + '%'; const bw = el('span', 'bw'); bw.appendChild(bar); d.appendChild(el('span', null, ITEMS[r.k].name)); d.appendChild(bw); d.appendChild(el('b', null, fmtE(r.pts) + ' · ' + r.b.hits + ' traf.')); list.appendChild(d); });
      if (!rows.length) frow(list, 'Żaden element nic nie dał w tej fali.');
    } else {
      const cell = (label, v) => { const c = el('div', 'cell'); c.appendChild(el('span', null, label)); c.appendChild(el('b', null, String(v))); list.appendChild(c); };
      cell('Krytyk / draśn. / pudło', s.checkCrit + ' / ' + s.checkOk + ' / ' + s.checkMiss);
      cell('Ciosy z pamięci', String(s.memFires || 0));
      cell('Najwyższe combo', '×' + fmt2(1 + 0.25 * (s.maxCombo - 1)));
      cell('Łup: zobaczony / zabrany', s.lootSeen + ' / ' + s.loot);
      cell('Rozbrojone / odczynione', s.disarmed + ' / ' + s.blessed);
      cell('Plotki: pokoje / pułapki', s.rumorRooms + ' / ' + s.rumorTraps);
      cell('Zapadnie / klatki', s.falls + ' / ' + s.cages);
      cell('Serce / dla Ciebie', Math.round(s.essHeart || 0) + ' / ' + Math.round(Math.max(0, fl.score - (s.essHeart || 0))));
      cell('Czas / przyspieszenie', mmss(fl.time) + ' / ' + Math.round(s.ffTime) + ' s');
      cell('Osobno: zwiad / sam / zgubiony (s)', Math.round(s.splitTime || 0) + ' / ' + Math.round(s.loneTime || 0) + ' / ' + Math.round(s.lostTime || 0));   // 1.17: these rows were only in the unused statsTable
      cell('Rozglądania / monety / pułapki z szukania', (s.looks || 0) + ' / ' + (s.goldFound || 0) + ' / ' + (s.lookTraps || 0));
      cell('Narada: dom / szturm / chwila · sami do domu', (s.councilHome || 0) + ' / ' + (s.councilStorm || 0) + ' / ' + (s.councilMore || 0) + ' · ' + (s.goHome || 0));
      cell('Słyszane zza ściany / wieści o śmierci', (s.heard || 0) + ' / ' + (s.newsDeaths || 0));
      cell('Rozłam: grupy / bunty (udane) / obrażeni / powroty', (s.rifts || 0) + ' / ' + (s.mutinies || 0) + ' (' + (s.mutinyWins || 0) + ') / ' + (s.sulks || 0) + ' / ' + (s.merges || 0));   // 1.19
      cell('Ekwipunek: z ciał / podane (amulety) / przydział / oferty / za ciężkie / latarnia ratuje / łom', (s.bodyLoot || 0) + ' / ' + (s.gearGiven || 0) + ' (' + (s.amuletGiven || 0) + ') / ' + (s.lootAssign || 0) + ' / ' + (s.lootOffer || 0) + ' / ' + (s.tooHeavy || 0) + ' / ' + (s.lanternSaves || 0) + ' / ' + ((s.crowbarGate || 0) + (s.crowbarCage || 0)));   // 1.20
      cell('Więzi: pary / żałoba (zemsta) / nie zostawię (uratowani) / mistrz: uwagi, pochwały / kpiny / kłótnie (przerwane) / sprzeciw nad ciałem / zakłady: wygrane-przegrane',
        (s.bonds || 0) + ' / ' + (s.griefs || 0) + ' (' + (s.revengeVows || 0) + ') / ' + (s.noLeave || 0) + ' (' + (s.noLeaveSaved || 0) + ') / ' + (s.mentorWatch || 0) + ', ' + (s.mentorProud || 0) + ' / ' + (s.rivalMock || 0) + ' / ' +
        (s.quarrels || 0) + ' (' + (s.quarrelStops || 0) + ') / ' + (s.lootDeadObject || 0) + ' / ' + (s.betsWon || 0) + '-' + (s.betsLost || 0));   // 1.21
      cell('Finał: eskorta / przekazania / ostatni bastion / poświęcenia / ty pierwszy / opukane / nie tędy / szyk',
        (s.escortForms || 0) + ' (' + (s.guardSoaks || 0) + ') / ' + (s.handOvers || 0) + ' / ' + (s.lastStands || 0) + ' / ' + (s.sacrifices || 0) + ' (' + (s.sacrificeFired || 0) + ') / ' + (s.youFirst || 0) + ' / ' +
        (s.taps || 0) + ' (' + (s.tapFound || 0) + ') / ' + (s.notThisWay || 0) + ' / ' + (s.frontLines || 0) + ', ' + (s.woundedBack || 0));   // 1.22
      cell('Nemezis: w fali / nagrody (Esencja) / urazy (załatwione) / ostrzeżenia / pamięć poległych',
        (s.nemeses || 0) + ' / ' + (s.bounties || 0) + ' (' + Math.round(s.essBounty || 0) + ') / ' + (s.grudgeHits || 0) + ' (' + (s.grudgeDone || 0) + ') / ' + (s.nemesisWarn || 0) + ' / ' + (s.fallenMemory || 0));   // 1.23
      cell('Kwestie o tym, co widzieli / zamienione / pominięte', (s.sawTalk || 0) + ' / ' + (s.lineSwap || 0) + ' / ' + (s.lineDrop || 0));   // 1.17.1
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
    if (have) return { ok: true, text: ' Pasuje do Twojego lochu.' };
    return { ok: false, text: need === MON_T ? ' Brak potworów w lochu.' : need === LOOT_T ? ' Brak łupu w lochu.' : ' Brak w lochu: ' + (CARD_ALL[u.id] ? miss : need).map(t => ITEMS[t] ? ITEMS[t].name : t).join(', ') + '.' };
  }
  function kindShort(u) {
    if (u.kind === 'unlock') return 'odblokowanie' + effWords(u.unlock).map(w => ' · ' + w.toLowerCase()).join('');   // 1.24 (B, P1-4)
    if (u.kind === 'instant') return RAR_NAME[u.rar] + ' · od razu';
    const n = run.deck.filter(x => x === u.id).length;
    return RAR_NAME[u.rar] + (u.unique ? ' · jedna' : '') + (fuses(u) ? ' · połączy się w ★' : n ? ' · w talii ' + n : '');   // 1.24
  }
  function renderShop(card, m) {
    const build = fl && fl.phase === 'build';
    run.stash = run.stash || [];
    const free = run.freePicks > 0, rerender = () => { card.classList.remove('enter'); card.innerHTML = ''; renderShop(card, m); };
    scrHead(card, 'Przed falą ' + run.wave, 'Sklep', String(Math.floor(fl.essence)), free ? 'Esencji · darmowe: ' + run.freePicks : 'Esencji');
    if (!build) { card.appendChild(el('p', 'note', 'Sklep działa między falami.')); card.appendChild(btn('primary', 'Zamknij', null, closeModal)); return; }
    // 1.15.1 (author: the tutorial's tip in the shop was gone at once, before it could be read): a card over the top of the shop
    // that stays until Rozumiem or until a card is taken (it was a message over the big button, fading after 2 s)
    if (run.tutorial && !run.shopTipDone) {
      const tip = el('div', 'shoptip'); tip.id = 'shop-tip';
      tip.appendChild(el('div', null, 'Po każdej fali jedną kartę bierzesz tu za darmo (Weź za darmo), a kolejne kupisz za Esencję. Wzięta karta trafia do talii na dole i działa do końca runu. Odblokowanie (fioletowy pasek) daje nową pułapkę albo potwora na stałe.'));
      const row = el('div', 'crow'); row.appendChild(el('span', 'step', 'Samouczek'));
      const ok = el('button', 'next', 'Rozumiem'); ok.type = 'button'; ok.id = 'shop-tip-ok'; ok.addEventListener('click', () => { run.shopTipDone = true; rerender(); }); row.appendChild(ok);
      tip.appendChild(row); card.appendChild(tip);
    }
    const body = el('div', 'scr-body'); card.appendChild(body);
    const sel = m.sel && (m.sel.k === 'd' || m.sel.k === 's') ? m.sel : null;
    // Prototype 1.0: four offers, always in the same four places. Each shows its whole text (the letters shrink a little for a long one)
    // and has its own buy button: there is nothing to unfold.
    const og = el('div', 'offers');
    run.shop.ids.forEach((id, i) => {
      const u = UPG[id], b = el('div', 'offer'); b.id = 'offer-' + i;
      if (!u) { b.classList.add('bought'); b.appendChild(el('b', null, 'Kupione')); og.appendChild(b); return; }
      const price = priceOf(u), poor = !free && fl.essence < price;
      b.classList.add('rar-' + u.rar); if (u.kind === 'unlock') b.classList.add('unlock'); if (poor) b.classList.add('poor');
      b.appendChild(el('span', 'ok', kindShort(u))); b.appendChild(el('b', null, u.name));
      const tx = el('span', 'tx', u.text), fit = cardFit(u);
      if (fuses(u)) { b.classList.add('fuse'); tx.appendChild(el('i', 'fit good fz', ' Połączy się w ★: ' + fuseText(u).replace(/^★ Połączona: /, ''))); }   // 1.24
      if (fit) tx.appendChild(el('i', 'fit ' + (fit.ok ? 'good' : 'bad'), fit.text));
      b.appendChild(tx);
      const by = el('button', 'buy', free ? 'Weź za darmo' : poor ? 'Za mało (' + price + ')' : 'Kup za ' + price + ' Esencji'); by.type = 'button'; by.id = 'offer-buy-' + i; by.disabled = poor;
      by.setAttribute('aria-label', (free ? 'Weź za darmo: ' : 'Kup za ' + price + ' Esencji: ') + u.name);
      by.addEventListener('click', () => {
        const r = shopBuy(i);
        if (r === 'ess') m.msg = 'Za mało Esencji (' + price + ').';
        else if (r === 'full') m.msg = 'Talia i schowek są pełne: sprzedaj albo odłóż kartę.';
        else { m.sel = null; run.shopTipDone = true; m.msg = r === 'fused' ? u.name + ': połączona w ★ (jedno miejsce).' : r === 'stash' ? u.name + ': do schowka (talia pełna).' : u.kind === 'unlock' ? u.name + ': odblokowane na stałe.' : u.kind === 'instant' ? u.name + '.' : 'W talii: ' + u.name + '.'; }
        rerender();
      });
      b.appendChild(by); og.appendChild(b);
    });
    // a card from the deck or the stash opens over the offers: the rest of the screen does not move
    if (sel) {
      const arr = sel.k === 'd' ? run.deck : run.stash, u = UPG[arr[sel.i]];
      if (u) {
        const fz = isFused(u.id), sh = el('div', 'sheet rar-' + u.rar + (fz ? ' fused' : '')); sh.id = 'shop-sheet';   // 1.24: a fused ★ card
        sh.appendChild(el('div', 'dk', (sel.k === 'd' ? 'w talii · ' : 'w schowku (nie działa) · ') + RAR_NAME[u.rar]));
        sh.appendChild(el('b', null, cardName(u.id))); sh.appendChild(el('div', 'tx', u.text + (fz ? ' ' + fuseText(u) : '')));
        const da = el('div', 'da');
        const mini = (id, txt, fn, cls, off) => { const b = el('button', 'mini' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; if (id) b.id = id; b.disabled = !!off; b.addEventListener('click', fn); da.appendChild(b); return b; };
        if (sel.k === 'd') mini('deck-stash', 'Do schowka', () => { if (toStash(sel.i)) { m.sel = null; m.msg = u.name + ': do schowka.'; } rerender(); }, '', run.stash.length >= stashCap());
        else mini('stash-deck', 'Do talii', () => { if (fromStash(sel.i)) { m.sel = null; m.msg = u.name + ': z powrotem w talii.'; } rerender(); }, '', run.deck.length >= run.deckSize);
        const sb = mini('card-sell', 'Sprzedaj +' + sellFor(u.id), () => {   // 1.24: sellFor
          if (!sb.dataset.sure) { sb.dataset.sure = '1'; sb.textContent = 'Na pewno? +' + sellFor(u.id); sb.classList.add('warn'); return; }
          const g = sel.k === 'd' ? sellCard(sel.i) : sellStash(sel.i); m.sel = null; m.msg = 'Sprzedane: ' + u.name + ' (+' + g + ' Esencji).'; rerender();
        });
        sh.appendChild(da);
        const x = el('button', 'x', '×'); x.type = 'button'; x.id = 'sheet-close'; x.setAttribute('aria-label', 'Zamknij kartę'); x.addEventListener('click', () => { m.sel = null; rerender(); }); sh.appendChild(x);
        og.appendChild(sh);
      }
    }
    body.appendChild(og);
    // refresh, refresh for an ad: two buttons that are always there (1.05, author: crystals are no longer bought back for Esencja)
    const acts = el('div', 'acts');
    const act = (id, title, sub, off, fn) => { const b = el('button'); b.type = 'button'; b.id = id; b.appendChild(el('b', null, title)); b.appendChild(el('span', / Esencji$/.test(sub) ? 'ess' : null, sub)); b.disabled = !!off; b.addEventListener('click', fn); acts.appendChild(b); return b; };
    const rc = rerollCost();
    act('shop-reroll', 'Odśwież', rc ? rc + ' Esencji' : 'gratis', fl.essence < rc, () => { if (shopReroll(false)) { m.sel = null; m.msg = 'Nowa oferta.'; } else m.msg = 'Za mało Esencji na odświeżenie.'; rerender(); });
    act('shop-ad', 'Za reklamę', run.shop.ad ? 'już użyte' : 'odśwież raz', run.shop.ad, () => { shopReroll(true); m.sel = null; m.msg = 'Nowa oferta (reklama, symulacja).'; rerender(); });
    body.appendChild(acts);
    // the deck and the stash: every slot has its place, empty ones too
    const dk = panel(body, 'Talia ' + run.deck.length + '/' + run.deckSize, 'schowek ' + run.stash.length + '/' + stashCap() + ' (nie działa)', 'deckp');
    const g = el('div', 'slots');
    const slot = (u, k, i, empty) => {
      const b = el('button', 'slot' + (k === 's' ? ' st' : '') + (u ? ' rar-' + u.rar : ' empty') + (u && isFused(u.id) ? ' fused' : '') + (sel && sel.k === k && sel.i === i ? ' sel' : ''), u ? cardName(u.id) : empty); b.type = 'button';   // 1.24: ★
      if (u) b.addEventListener('click', () => { m.sel = sel && sel.k === k && sel.i === i ? null : { k, i }; rerender(); }); else b.disabled = true;
      g.appendChild(b);
    };
    for (let i = 0; i < run.deckSize; i++) slot(UPG[run.deck[i]], 'd', i, 'wolne');
    for (let i = 0; i < stashCap(); i++) slot(UPG[run.stash[i]], 's', i, 'schowek');
    dk.appendChild(g);
    const foot = el('div', 'scr-foot'); card.appendChild(foot);
    const done = btn('primary', 'Do budowy fali ' + run.wave, free ? 'darmowe karty poczekają: ' + run.freePicks : 'sklep: pierwszy kafelek w Talii', closeModal); done.id = 'shop-close';
    foot.appendChild(done);
    if (m.msg) { foot.appendChild(el('div', 'shopmsg', m.msg)); m.msg = ''; }   // what just happened: a message over the big button (1.12.1: in the shop itself, the top hint is gone)
    requestAnimationFrame(() => { card.querySelectorAll('.offer:not(.bought), .sheet').forEach(fitText); card.querySelectorAll('.slot:not(.empty)').forEach(fitSlot); });
  }
  // Prototype 1.0: the whole text has to fit its box, nothing is cut. The letters shrink step by step down to a readable minimum;
  // a long name shrinks too. The tile says data-fit="no" if even that is not enough (the tests look for it).
  function fitSlot(s) {   // a card name in a deck slot: smaller letters rather than a cut word
    s.style.fontSize = ''; let f = parseFloat(getComputedStyle(s).fontSize) || 11.5;
    while (s.scrollHeight > s.clientHeight + 1 && f > 9) { f -= 0.5; s.style.fontSize = f + 'px'; }
  }
  function fitText(box) {
    const tx = box.querySelector('.tx'), nm = box.querySelector('b'); if (!tx) return;
    const sheet = box.classList.contains('sheet'), max = sheet ? 14 : 13, min = sheet ? 11 : 10;
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
    scrHead(card, 'Koniec runu · ' + mmss(dur), run.result === 'win' ? 'Zwycięstwo' : run.result === 'quit' ? 'Run przerwany' : 'Loch upadł', String(Math.round(run.total)), 'Esencji w runie', [run.total, v => String(Math.round(v))]);
    const body = el('div', 'scr-body'); card.appendChild(body);
    body.appendChild(el('p', 'note', run.reason + (run.endless > 0 ? ' Po wygranej fale bez końca: ' + run.endless + '.' : '')));
    const rk = rankOf(run.total), rr = el('div', 'rankrow'), pill = el('div', 'rank', 'Ranga: ' + rk.name);
    if (rk.next) pill.appendChild(el('small', null, 'następna: ' + rk.next[1] + ' od ' + rk.next[0]));
    rr.appendChild(pill); if (isBest) rr.appendChild(el('span', 'newrec', 'Nowy rekord!')); body.appendChild(rr);
    const sum = k => W.reduce((a, w) => a + (w.stats[k] || 0), 0);
    const tiles = el('div', 'statrow');
    statTile(tiles, String(held), plural(held, 'fala', 'fale', 'fal'), run.result === 'win' ? 'good' : ''); statTile(tiles, String(sum('kills')), 'zabici'); statTile(tiles, String(sum('scared')), 'przestraszeni'); statTile(tiles, String(W.filter(w => w.hunger && w.hunger.ate).length), 'zjedzone kryształy');
    body.appendChild(tiles);
    waveChart(panel(body, 'Esencja z fal', 'szare: stracony kryształ'), W, 0);
    const tot = {};
    W.forEach(w => Object.keys(w.items || {}).forEach(k => { const b = w.items[k]; if (!ITEMS[k] || TOOLS[k]) return; tot[k] = (tot[k] || 0) + (b.pts || 0) + (b.passivePts || 0) + (b.fearPts || 0); }));
    const best = Object.entries(tot).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 5), mx = best.length ? best[0][1] : 1;
    const pb = panel(body, 'Najlepsze elementy runu', null, 'segpanel'), list = el('div', 'flist'); pb.appendChild(list);
    best.forEach(([k, v]) => { const d = el('div', 'irow'), bar = el('i'), bw = el('span', 'bw'); bar.style.width = Math.max(2, Math.round(100 * v / mx)) + '%'; bw.appendChild(bar); d.appendChild(el('span', null, ITEMS[k].name)); d.appendChild(bw); d.appendChild(el('b', null, Math.round(v) + ' Esencji')); list.appendChild(d); });
    if (!best.length) frow(list, 'Brak danych o elementach.');
    if (run.deck.length) frow(list, 'Talia: ' + run.deck.map(id => UPG[id] ? UPG[id].name : id).join(', ') + '.');
    frow(list, 'Rekordy tutaj: ' + Math.round(rec.best) + ' Esencji w runie · najdalej fala ' + rec.wave + ' · wygrane ' + rec.wins + ' z ' + rec.runs + '.');
    fitList(list);
    const foot = el('div', 'scr-foot'); card.appendChild(foot);
    const row = el('div', 'row');
    const again = btn('primary', 'Jeszcze raz', null, () => { closeModal(); if (onbStage() <= 4) startGuided(); else newRun(false); }); again.id = 'end-again';   // 1.12.1: the first runs go on in order
    row.appendChild(again); row.appendChild(btn('', 'Menu', null, () => { closeModal(); openModal({ type: 'start' }); })); foot.appendChild(row);
    const mr = el('div', 'minirow'), dn = el('p', 'note', m.logNote || 'Zapisuję wynik do analizy...');
    const db = el('button', 'mini', 'Pobierz wyniki tego runu (.json)'); db.type = 'button'; db.addEventListener('click', () => downloadRun(dn)); mr.appendChild(db);
    foot.appendChild(mr); foot.appendChild(dn);
    if (!m.pushed) { m.pushed = true; pushLog(null).then(res => { m.logNote = res === 'ok' ? 'Wynik zapisany. Claude może go przeanalizować przy balansie.' : logText(res); if (dn.isConnected) dn.textContent = m.logNote; }); }
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
      if (lp > 0) { sc += 1 + Math.min(1, lp / 200); why.push('mocne w ostatniej fali (' + Math.round(lp) + ' pkt)'); }
      if (kind === 'loot' && hr) { sc += 2; why.push('chciwość pomoże nakarmić serce'); }
      if (way) { sc += 0.6; if (kind !== 'loot') why.push('pasuje na trasę bohaterów'); }
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
    card.appendChild(el('div', 'sub', 'Przed falą ' + run.wave));
    card.appendChild(el('h2', null, 'Masz ' + m.e + ' Esencji'));
    const hr = hungerRisk(), sg = suggestBuys(m.e);
    fl.stats.unspentPicks = sg.map(q => q.t);
    card.appendChild(el('p', null, (sg.length ? 'Niewydana Esencja nie broni lochu. Warto jeszcze postawić:' : 'Rozpocząć falę mimo to? Niewydana Esencja nie broni lochu. Najtańszy element: ' + ITEMS[m.ch.t].name + ' (' + m.ch.cost + ').') + (hr ? ' Uwaga na głód: serce chce ' + hr + ' Esencji z tej fali.' : '')));
    const lab = el('label', 'askno'), cb = el('input'); cb.type = 'checkbox'; cb.id = 'unspent-noask'; lab.appendChild(cb); lab.appendChild(document.createTextNode(' Nie pytaj więcej'));
    const keep = () => { if (cb.checked) try { localStorage.setItem(NOASK_KEY, '1'); } catch (e) {} };
    // a suggestion: to its tab, the tile picked (its free spots light up on the map), the tile pulses
    const take = t => {
      keep(); fl.stats.unspentPick = t; closeModal();
      const tb = TABS.find(x => x.items.includes(t)); if (!trayIsOpen()) setTrayOpen(true, true); if (tb) pickTab(tb.id, t);
      selected = t; movingKey = null; movingObj = null; updateTray(); flashSuggest([t]);
    };
    if (sg.length) {
      const box = el('div', 'choices sugg');
      sg.forEach(q => { const b = btn('gold', ITEMS[q.t].name + ' · ' + q.c + ' Esencji', q.why, () => take(q.t)); b.id = 'unspent-sug-' + q.t; b.dataset.t = q.t; box.appendChild(b); });
      card.appendChild(box);
    }
    const row = el('div', 'row');
    const back = btn(sg.length ? '' : 'primary', 'Buduj dalej', null, () => { keep(); closeModal(); if (sg.length) { const tb = TABS.find(x => x.items.includes(sg[0].t)); if (!trayIsOpen()) setTrayOpen(true, true); if (tb) pickTab(tb.id, sg[0].t); flashSuggest(sg.map(q => q.t)); } }); back.id = 'unspent-back';
    const go = btn('', 'Wypuść falę', 'mimo to', () => { keep(); fl.stats.unspentGo = (fl.stats.unspentGo || 0) + 1; closeModal(); startWave(); }); go.id = 'unspent-go';
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
    else { run.deck.push(u.id); recomputeMods(); }
    run.upgrades.push(u.id); updateTray();
  }
  function sellCard(i) {
    const id = run.deck[i], u = UPG[id]; if (!u) return 0;
    const g = sellFor(id); run.deck.splice(i, 1); (run.sold = run.sold || []).push(id); unfuse(id);   // 1.24: a fused ★ card sells for two
    addEss(g); recomputeMods();
    return g;
  }
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? few : many;
  const slotsTxt = n => n + ' ' + plural(n, 'miejsce', 'miejsca', 'miejsc');
  const capFirst = t => t.charAt(0).toUpperCase() + t.slice(1);
  function kindLabel(u) {
    if (u.kind === 'unlock') return 'Odblokowanie na stałe · bez miejsca w talii' + effWords(u.unlock).map(w => ' · ' + w).join('');   // 1.24 (B, P1-4)
    if (u.kind === 'instant') return capFirst(RAR_NAME[u.rar]) + ' · jednorazowa, bez miejsca w talii';
    const n = run.deck.filter(x => x === u.id).length;
    return capFirst(RAR_NAME[u.rar]) + ' karta' + (u.unique ? ' · tylko jedna' : '') + (fuses(u) ? ' · połączy się w ★' : n ? ' · w talii: ' + n : '');   // 1.24
  }
  function cardBtn(u, onClick, extra) {
    const b = el('button', 'btn cardpick rar-' + u.rar + (u.kind === 'unlock' ? ' unlock' : '')); b.type = 'button';
    b.appendChild(el('span', 'ck', kindLabel(u)));
    b.appendChild(el('b', null, u.name)); b.appendChild(el('span', null, u.text));
    if (fuses(u)) { b.classList.add('fuse'); b.appendChild(el('span', 'cx', 'Połączy się w ★: ' + fuseText(u).replace(/^★ Połączona: /, ''))); }   // 1.24
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
      const rb = el('button', 'link', 'Losuj ponownie (symulacja reklamy, raz na falę)'); rb.type = 'button';
      rb.addEventListener('click', () => { fl.rerolled = true; if (src) { src.rerolled = true; src.picks = null; } m.picks = null; box.innerHTML = ''; renderPickSection(box, card, m); });
      box.appendChild(rb);
    }
  }
  const pickSub = src => src.src === 'thr' ? 'Próg ' + src.thr + ' pkt: rzadkie karty' : src.src === 'boss' ? (src.wave === RUN_WAVES ? 'Finał przetrwany' : 'Fala z bossem przetrwana') + ': legendarna karta' : 'Fala ' + (src.wave || run.wave) + ' odparta';
  function renderUpgrade(card, m) {
    const src = (m && m.src) || {};
    card.appendChild(el('div', 'sub', pickSub(src)));
    card.appendChild(el('h2', null, 'Wybierz kartę'));
    if (run.tutorial && !run.upgrades.length) card.appendChild(el('p', 'tipnote', 'Pierwsza karta! Karta trafia do talii (' + slotsTxt(run.deckSize) + ') i działa w każdej fali, dopóki jej nie sprzedasz. Odblokowanie (fioletowa ramka) daje nową pułapkę albo potwora i nie zajmuje miejsca. Talię zobaczysz w zakładce Talia.'));
    card.appendChild(el('p', 'note', 'Talia: ' + run.deck.length + ' z ' + run.deckSize + '. Karty działają, dopóki są w talii. Druga kopia karty łączy się z pierwszą w ★ (jedno miejsce, moc ×2,5 i cecha).'));   // 1.24
    const box = el('div'); renderPickSection(box, card, m); card.appendChild(box);
    card.appendChild(el('p', 'note', 'Kartę dostajesz za każdą przetrwaną falę. Im dalsza fala, tym częściej trafiają się rzadkie i legendarne.'));
  }
  function finishPick(m) { closeModal(); if (m && m.onDone) m.onDone(); }
  function takeCard(card, m, u) {
    if (u.kind === 'card' && !fuses(u) && run.deck.length >= run.deckSize) { card.innerHTML = ''; card.scrollTop = 0; renderReplace(card, m, u); return; }   // 1.24: a second copy needs no slot
    applyUpgrade(u); finishPick(m);
    setHint(u.kind === 'unlock' ? u.name + ': odblokowane na stałe.' : u.kind === 'instant' ? u.name + '.' : 'Nowa karta w talii: ' + u.name + ' (' + run.deck.length + '/' + run.deckSize + ').');
  }
  // Deck full: sell one card to make room, or pass on the new one (it is sold for you).
  function renderReplace(card, m, u) {
    card.appendChild(el('div', 'sub', 'Talia pełna · ' + run.deck.length + ' z ' + run.deckSize));
    card.appendChild(el('h2', null, 'Co sprzedajesz?'));
    card.appendChild(el('p', null, 'Nowa karta: ' + u.name + ' (' + u.tag + '). Sprzedana karta przestaje działać i oddaje Esencję.'));
    const box = el('div', 'choices');
    run.deck.forEach((id, i) => {
      const c = UPG[id]; if (!c) return;   // 1.18: a card gone from the game (u-portrait) in an old save
      box.appendChild(cardBtn(c, () => {
        const got = sellCard(i);
        run.deck.splice(i, 0, u.id); run.upgrades.push(u.id); recomputeMods();
        finishPick(m); setHint('Sprzedane: ' + c.name + ' (+' + got + ' Esencji). Nowa karta: ' + u.name + '.');
      }, 'Sprzedaj za ' + sellFor(id) + ' Esencji'));   // 1.24: sellFor
    });
    const no = el('button', 'btn pass'); no.type = 'button';
    no.appendChild(el('b', null, 'Nie biorę: ' + u.name)); no.appendChild(el('span', null, 'Talia bez zmian, za odrzuconą kartę +' + RAR_SELL[u.rar] + ' Esencji.'));
    no.addEventListener('click', () => { addEss(RAR_SELL[u.rar]); (run.sold = run.sold || []).push(u.id); finishPick(m); setHint('Odrzucona karta: ' + u.name + ' (+' + RAR_SELL[u.rar] + ' Esencji).'); });
    box.appendChild(no);
    card.appendChild(box);
    const back = el('button', 'link', 'Wróć do wyboru'); back.type = 'button';
    back.addEventListener('click', () => { card.innerHTML = ''; card.scrollTop = 0; if (m.back) m.back(card); else renderUpgrade(card, m); });
    card.appendChild(back);
  }
  // A placed element, tapped between waves: what it does, its level, upgrade it or take it down (full refund).
  function upgradeItem(it) {
    const c = upgCost(it); if (fl.phase !== 'build' || !ACTIVE[it.type] || (it.lvl || 1) >= 3 || fl.essence < c) return false;
    pushUndo('ulepszenie: ' + ITEMS[it.type].name);
    const was = it.lvl || 1;
    fl.essence -= c; it.spent = (it.spent || ITEMS[it.type].cost) + c; it.lvl = was + 1;
    if (MONSTERS[it.type]) { const k = LVL_MON[it.lvl] / LVL_MON[was]; it.max = Math.round(it.max * k); it.hp = it.max; it.power *= k; }
    bt(it.type).spent += c; bt(it.type).upgraded = (bt(it.type).upgraded || 0) + 1; fl.stats.upgrades = (fl.stats.upgrades || 0) + 1; tutFlags.upgraded = true;
    floatTile(it.x, it.y, 'Poziom ' + it.lvl + (it.lvl === 3 && TRAITS[it.type] ? ': ' + TRAITS[it.type][0] : ''), '#ffb35c', 15, -0.8);
    it.popR = realNow; burst(it.x + 0.5, it.y + 0.5, '#ffb35c', 12); particles.push({ ring: true, x: it.x + 0.5, y: it.y + 0.5, r: 0.2, maxR: 1.1, life: 0.4, color: '#ffb35c' });   // 1.09: an upgrade glows and pops
    updateTray(); saveRunSoon();
    return true;
  }
  // 1.09: a puff of dust and a ring on a tile (placing, moving, taking down)
  function dustAt(x, y) { if (reduceMotion) return; burst(x + 0.5, y + 0.5, '#9a9286', 7); particles.push({ ring: true, x: x + 0.5, y: y + 0.5, r: 0.15, maxR: 0.85, life: 0.32, color: '#b9b2a6' }); }
  function removeItem(it) {
    pushUndo('zdjęcie: ' + ITEMS[it.type].name);
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
    pushUndo('przeniesienie: ' + ITEMS[it.type].name);
    fl.items.delete(key(it.x, it.y)); dustAt(it.x, it.y);
    it.x = x; it.y = y; it.gx = x + 0.5; it.gy = y + 0.5; it.preview = 1.4; it.popR = realNow; dustAt(x, y);   // 1.09: lifted with a puff, put down with a pop
    fl.items.set(key(x, y), it); fl.threatDirty = true;
    floatTile(x, y, 'Przeniesione', '#d8d2c4', 13, -0.6); tutFlags.moved = true;
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
  function tapUpgrade(it) {
    const T = ITEMS[it.type], lvl = it.lvl || 1;
    if (!ACTIVE[it.type]) { note('Nie ulepsza się', it.x, it.y); return; }
    if (lvl >= 3) { note('Poziom 3 to maks', it.x, it.y); return; }
    const c = upgCost(it);
    if (fl.essence < c) { note('Za mało Esencji (' + c + ')', it.x, it.y); return; }
    upgradeItem(it);   // it says "Poziom N" over the tile itself (1.12.1: the second, same note is gone)
  }
  function tapMove(wx, wy) {
    const cur = movingKey && fl.items.get(movingKey);
    if (!cur) {
      const it = itemAt(wx, wy);
      if (!it) { movingKey = null; setHint('Stuknij element, który chcesz przenieść.'); return; }
      movingKey = key(it.x, it.y); setHint('Przenosisz: ' + ITEMS[it.type].name + '. Stuknij nowe miejsce (podświetlone). Stuknij element jeszcze raz, żeby odłożyć.');
      return;
    }
    if (Math.floor(wx) === cur.x && Math.floor(wy) === cur.y) { movingKey = null; setHint('Odłożone. Stuknij inny element, żeby go przenieść.'); return; }
    const t = moveTarget(cur, wx, wy);
    if (!t) { note('Tu nie pasuje'); return; }
    moveItem(cur, t[0], t[1]); movingKey = null;
    setHint(ITEMS[cur.type].name + ' przeniesione (za darmo). Plotki o starym miejscu są już nieaktualne.');
  }
  function renderItem(card, m) {
    const it = fl.items.get(m.k);
    if (!it || fl.phase !== 'build') { card.appendChild(el('p', null, 'Tego elementu już tu nie ma.')); card.appendChild(btn('primary', 'Zamknij', null, closeModal)); return; }
    const T = ITEMS[it.type], lvl = it.lvl || 1, up = !!ACTIVE[it.type], tr = TRAITS[it.type], loot = isLoot(it.type);
    card.appendChild(el('div', 'sub', (BUILDINGS[it.type] ? 'Budowla' : MONSTERS[it.type] ? 'Potwór' : TRAPS[it.type] ? 'Pułapka' : loot ? (it.dropped ? 'Łup po bohaterze' : 'Łup') : 'Element') + (up ? ' · poziom ' + lvl + ' z 3' : '')));
    card.appendChild(el('h2', null, T.name + (lvl > 1 ? ' ' + 'I'.repeat(lvl) : '')));
    if (up) {   // what it did last wave: the quickest way to see what deserves an upgrade
      const s = (it.lf === undefined ? 'Nowy: jeszcze nie walczył.' : it.lf === 0 ? 'Ostatnia fala: nie odpalił ani razu.' :
        'Ostatnia fala: ' + it.lf + '× odpalony, ' + it.lh + ' trafień, ' + it.lp + ' Esencji' + (it.lk ? ', zabici: ' + it.lk : '') + '.') + healLine(it);   // 1.24 (C, addendum 2)
      card.appendChild(el('p', 'lead', s));
    }
    if (loot && it.dropped) {   // 1.20: whose things they are
      const who = it.fromNm ? { nm: it.fromNm, female: it.fromFem } : null;
      card.appendChild(el('p', 'lead', it.body != null && who ? 'Rzeczy poległego: ' + it.fromNm[0] + ' (fala ' + it.fromWave + '): ' + (it.gold ? it.gold + (it.gold === 1 ? ' moneta' : ' monet') : itemLabel(it.item)) + '. Następni mogą to zabrać.' :
        it.knocked != null && who ? 'Wybite bohaterowi ' + nameGen(who) + ' krytykiem: ' + itemLabel(it.item) + '.' :
        it.gold ? 'Sakwa poległego bohatera: ' + it.gold + (it.gold === 1 ? ' moneta.' : ' monet.') : it.item ? 'Zostawił to bohater: ' + itemLabel(it.item) + '. Następni mogą to podnieść.' : 'Zostawił to bohater.'));
    }
    if (loot && it.item && it.item.cursed) card.appendChild(el('p', 'note', 'Przeklęty: klątwa przejdzie na tego, kto go weźmie.'));
    if (it.type === 'mimic' && it.belly && it.belly.length) card.appendChild(el('p', 'note', 'W brzuchu: ' + it.belly.length + (it.belly.length === 1 ? ' przedmiot' : it.belly.length < 5 ? ' przedmioty' : ' przedmiotów') + ' (gryzie o ' + 10 * Math.min(6, it.belly.length) + '% mocniej). Wypluje je, gdy wysadzi go bomba albo rozbije topór.'));
    const r = roomOf(it.x, it.y), rt = rtOf(r);
    const d = el('details'); d.appendChild(el('summary', null, 'Opis'));
    d.appendChild(el('p', null, T.desc));
    if (up) d.appendChild(el('p', 'note', 'Moc teraz: ' + (TRAPS[it.type] ? '×' + fmt2(LVL_POW[lvl]) : 'HP i siła ×' + fmt2(LVL_MON[lvl])) + '. ' + (tr ? 'Poziom 3 dodaje cechę: ' + tr[0] + ' (' + tr[1] + ').' : '') + ' Ulepszenie nie zajmuje miejsca w pokoju, a poziom pułapki poszerza strefy skill checku.'));
    if (rt) d.appendChild(el('p', 'note', 'Pokój: ' + RT_INFO[rt].name + '. ' + ITEMS[RT_INFO[rt].item].desc.split(': ').slice(1).join(': ').replace(/ Stuknij znacznik pokoju\.$/, '')));
    if (KIND_OF[it.type] && inKind(it)) d.appendChild(el('p', 'note', 'Komnata: ' + KIND_INFO[KIND_OF[it.type]].name + '. ' + (lvl >= 3 ? 'Ma już 3. poziom, więc komnata daje mu +' + Math.round((KIND_POW - 1) * 100) + '% mocy.' : 'Cecha 3. poziomu działa bez ulepszania' + (tr ? ': ' + tr[0] + ' (' + tr[1] + ')' : '') + '.')));
    else if (KIND_OF[it.type]) d.appendChild(el('p', 'note', 'Pasuje do komnaty: ' + KIND_INFO[KIND_OF[it.type]].name + ' (zakładka Loch, Komnaty). Tam ma cechę 3. poziomu bez ulepszania.'));
    if (it.dropped) d.appendChild(el('p', 'note', 'Łup po bohaterach nic Cię nie kosztował, więc zdjęcie nic nie zwraca. Możesz go przenieść.'));
    if (it.lf === undefined || !up) d.open = true;
    card.appendChild(d);
    const row = el('div', 'row');
    if (up && lvl < 3) {
      const c = upgCost(it), next = lvl + 1;
      const ub = btn('primary', 'Ulepsz do poziomu ' + next, c + ' Esencji · ' + (next === 3 && tr ? 'cecha: ' + tr[0] : 'moc ×' + fmt2(TRAPS[it.type] ? LVL_POW[next] : LVL_MON[next])), () => {
        if (upgradeItem(it)) { card.innerHTML = ''; renderItem(card, m); setHint(T.name + ': poziom ' + it.lvl + '.'); }
      });
      ub.id = 'sheet-upgrade';
      if (fl.essence < c) { ub.disabled = true; ub.querySelector('span').textContent = c + ' Esencji (masz ' + Math.floor(fl.essence) + ')'; }
      row.appendChild(ub);
    }
    const mb = btn('', 'Przenieś', 'za darmo, poziom zostaje', () => { closeModal(); pickUp(it); });
    mb.id = 'sheet-move'; row.appendChild(mb);
    const back = it.spent != null ? it.spent : T.cost;
    const rb = btn('', 'Zdejmij', back ? '+' + back + ' Esencji' : 'bez zwrotu', () => { const got = removeItem(it); closeModal(); setHint(T.name + ' zdjęte' + (got ? ' (+' + got + ' Esencji).' : '.')); });
    rb.id = 'sheet-remove'; row.appendChild(rb);
    card.appendChild(row);
    card.appendChild(btn('', 'Zamknij', null, closeModal));
  }
  // v14: the full card of a hero: tap him in a wave (the game pauses), or tap a row of the party list / the next-wave list
  const TRAIT_TEXT = { greedy: 'idzie po łup mimo ryzyka', coward: 'panikuje wcześniej, śmierć towarzysza straszy go mocniej', brave: 'śmierć towarzysza zamienia w furię', careful: 'sprawdza podłogę, rzadziej wpada w pułapki' };
  const STATE_TEXT = { walk: 'idzie', rest: 'odpoczywa', talk: 'naradza się', wait: 'czeka', boss: 'wyważa kryształ', disarm: 'rozbraja', free: 'uwalnia kogoś', fight: 'walczy', smash: 'rozbija' };
  // v15.1: a tap on the equation row: what each part means, and where this wave's Esencja came from
  function renderEsencja(card, m) {
    const raid = fl.phase === 'raid', s = fl.stats, cm = 1 + 0.25 * (comboNow() - 1);
    card.appendChild(el('div', 'sub', raid ? waveName() + ' · fala trwa' : waveName() + ' · budowa'));
    card.appendChild(el('h2', null, 'Skąd Esencja'));
    card.appendChild(el('p', null, 'Esencja = Groza × Chciwość × Combo. Dopóki trwa combo, Groza się zbiera (linia u góry), a gdy combo się skończy, cała seria wypłaca się po końcowym combo. Od fali 2 serce bierze pierwsze porcje Esencji z fali, reszta trafia do Ciebie.'));
    card.appendChild(el('h2', 'h2small', 'Groza: co przeżywają bohaterowie'));
    card.appendChild(el('p', 'note', 'To nie mnożnik, tylko suma zdarzeń. Każde liczy się względem bohatera i razy mnożnik pokoju (liczba w rogu pokoju: ×1 przy wejściu, do ×' + fmtE(S.depthMax) + ' przy sercu).'));
    const gt = el('table', 'stats');
    [['Rany (pułapki, łup)', 'całe HP bohatera = ' + fmtE(GZ.dmg)], ['Rany od potworów walczących same', 'całe HP = ' + fmt2(GZ.dmg * MON_FACTOR)], ['Strach', 'pełny pasek = ' + fmtE(GZ.fear)], ['Ucieczka ze strachu', fmtE(GZ.scare) + ' (boss 2 razy tyle)'],
     ['Śmierć bohatera', fmtE(GZ.kill) + ' (boss 2 razy tyle)'], ['Zgubiony / samotny / na zwiadzie', fmt2(GZ.lost) + ' / ' + fmt2(GZ.alone) + ' / ' + fmt2(GZ.split) + ' na sekundę'], ['Zabrany łup', fmt2(GZ.loot) + ' × rzadkość'], ['Leczenie kapłana', fmt2(GZ.heal) + ' za całe HP'],
     ['Sieć / klatka', fmt2(GZ.web) + ' / ' + fmt2(GZ.cage)], ['Odzyskany kryształ', fmtE(GZ.crystal)]]
      .forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, r[1])); gt.appendChild(tr); });
    card.appendChild(gt);
    card.appendChild(el('h2', 'h2small', 'Chciwość ×' + fmt2(raid ? fl.greed : greedStartNow()) + (raid ? '' : ' na start')));
    const gb = greedBonusParts();
    card.appendChild(el('p', 'note', 'Rośnie, gdy bohaterowie zobaczą łup (droższy łup więcej). Stałe dodatki: ' + (gb.length ? gb.map(p => p[0] + ' +' + fmt2(p[1])).join(', ') : 'na razie żadnych') + (run.greedKeep > 0.001 ? ', zabrany łup +' + fmt2(run.greedKeep) : '') + '. Im większa chciwość, tym wolniej rośnie: każdy przyrost dzieli się przez to, ile jej już jest (dodatki wyżej to wartości przed tym przeliczeniem).'));
    card.appendChild(el('h2', 'h2small', 'Combo ×' + fmt2(raid ? cm : 1)));
    card.appendChild(el('p', 'note', 'Różne pułapki pod rząd (w Zębatkach także ta sama) w ciągu ' + fmt2(S.comboWin).replace(',00', '').replace(/0$/, '') + ' s (w Grocie 1,5 raza dłużej): +0,25 za każdy stopień, najwyżej ×2,5. Końcowe combo mnoży całą zebraną Grozę serii. Każdy stopień combo wzmacnia też rany i strach od pułapek o ' + Math.round(COMBO_POW * 100) + '% (przy ×2,5 o ' + Math.round(COMBO_POW * 600) + '%), więc opłaca się grupować różne pułapki blisko siebie.' + (mods.regen !== 1 ? ' Żyła esencji mnoży jeszcze ×' + fmt2(mods.regen) + '.' : '')));
    if (raid || fl.phase === 'summary') {
      card.appendChild(el('h2', 'h2small', 'W tej fali'));
      const pt = el('table', 'stats');
      [['Rany', s.dmgPts], ['Strach', s.fearPts], ['Ucieczki ze strachu (' + s.scared + ')', s.scarePts], ['Zabici (' + s.kills + ')', s.killPts], ['Łup', s.lootPts], ['Kryształ odzyskany', s.crystalPts], ['Zgubieni i samotni', (s.lostPts || 0) + (s.lonePts || 0)], ['Zwiad (celowo osobno)', s.splitPts || 0], ['Leczenie kapłana', s.healPts], ['Combo wstecz', s.comboPts || 0]]
        .filter(r => r[1] > 0).forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, fmtE(r[1]) + ' Esencji')); pt.appendChild(tr); });
      [['Groza razem', fmtE(fl.base)], ['Średnio na punkt Grozy', '×' + fmt2(fl.base > 0 ? fl.score / fl.base : 1)], ['= Esencja z fali', fmtE(fl.score)]].forEach(r => { const tr = el('tr', 'sum'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, r[1])); pt.appendChild(tr); });
      card.appendChild(pt);
    }
    card.appendChild(btn('primary', 'Zamknij', null, () => { closeModal(); if (m.unpause) setPaused(false); }));
  }
  function renderHero(card, m) {
    tutFlags.heroCard = true;
    const live = m.id != null ? fl.heroes[m.id] : null, e = live ? live.entry : m.entry;
    if (!e) { card.appendChild(el('p', null, 'Tego bohatera już nie ma.')); card.appendChild(btn('primary', 'Zamknij', null, () => { closeModal(); if (m.unpause) setPaused(false); })); return; }
    const h = live || e, T = HEROES[e.type], R = levelStats(e.lvl), fem = e.female, known = live ? live.known : new Set(e.known || []);
    const all = mods.revealAll;
    card.appendChild(el('div', 'sub', T.name[fem ? 1 : 0] + ' · poz. ' + e.lvl + ' ' + (e.boss ? BOSS_NAME[e.boss][fem ? 1 : 0] : R.name[fem ? 1 : 0]).toLowerCase() + [e.returning ? (e.nemesis ? ' · nemezis' : ' · powracający') : '', e.hunter ? ' · łowca skarbów' : '', e.recruit ? ' · rekrut' : ''].join('')));
    const hh = el('h2', null, nemName(e)); hh.style.color = T.color; card.appendChild(hh);   // 1.23: with his title
    const tiles = el('div', 'statrow');
    statTile(tiles, Math.round(live ? live.hp : e.hp) + '/' + e.max, 'HP', live && live.hp < 0.35 * e.max ? 'bad' : '');
    const cou = live ? live.courage : e.courage;
    statTile(tiles, live ? Math.round(100 * live.fear / cou) + '%' : '0%', 'strach z ' + Math.round(cou) + ' odwagi', live && live.fear > 0.6 * cou ? 'bad' : '');
    if (e.type === 'priest' && live) statTile(tiles, live.faith + '/' + live.faithMax, 'wiara');
    else statTile(tiles, String((live ? live.inv : e.inv).length), 'przedmioty');
    card.appendChild(tiles);
    const ul = el('ul', 'conseq');
    const add = t => { if (t) ul.appendChild(el('li', null, t)); };
    if (live) {
      const st = live.dead ? (fem ? 'Zginęła.' : 'Zginął.') : live.fled ? (live.carriedOut ? 'Wyniósł kryształ.' : live.fleeing ? 'Uciekł ze strachu.' : 'Wyszedł z lochu.') :
        [live.fleeing ? 'UCIEKA' : '', live.crystal ? 'NIESIE KRYSZTAŁ' : '', caged(live) ? 'w klatce' : '', live.lost ? 'zgubiony' : live.goHome ? (live.female ? 'wraca sama do domu' : 'wraca sam do domu') : inG2(live) ? (fl.party.g2.leaderId === live.id ? 'prowadzi drugą grupę' : 'w drugiej grupie') : live.split ? 'na zwiadzie' : live.look && !live.look.done ? 'rozgląda się' : live.alone ? 'sam' : '', fl.time < live.burnUntil ? (live.burnBy === 'spikes' ? 'krwawi' : 'płonie') : '', live.cursed ? 'przeklęty' : '', fl.time < live.shakenUntil ? 'wstrząśnięty śmiercią' : '', STATE_TEXT[live.state] || ''].filter(Boolean).join(', ');
      add('Teraz: ' + st + '.');
    }
    add('Charakter: ' + (e.trait ? HERO_TRAITS[e.trait].name[fem ? 1 : 0] + ' (' + TRAIT_TEXT[e.trait] + ')' : 'zwyczajny') + '.');
    { const bm = bondMate(e, live); if (bm) add(bondLabel(e.bond, bm) + (bm.dead ? (bm.female ? ' (zginęła)' : ' (zginął)') : '') + '.'); }   // 1.21: his bond
    add('Umie: ' + CLASS_SKILL[e.type] + '.');
    add('Klasa: ' + CLASS_RES_TEXT[e.type] + '.');
    if (e.hunter) add('Łowca skarbów: idzie po łup, nawet gdy to groźne (znak sakiewki).');
    add('Ciało: ' + (e.phys && (known.has('phys') || all) ? PHYS[e.phys].name[fem ? 1 : 0] + ' (' + PHYS[e.phys].text + ')' : 'nie wiadomo') + '.');
    add('Fobia: ' + (e.phobia && (known.has('phobia') || all) ? PHOBIAS[e.phobia].name + ' (straszy 2 razy mocniej)' : 'nie wiadomo') + '.');
    if (e.scar) add('Blizna: ' + e.scar + (e.times > 1 && !e.nemesis ? ' (wraca już ' + e.times + '. raz)' : '') + '.');
    if (e.nemesis) {   // 1.23: what makes him a Nemezis
      const g = e.nemesis.grudge;
      add('Nemezis: wraca ' + (e.times || 1) + '. raz (od fali ' + e.nemesis.since + '), zna pokoje, w których był' + (fem ? 'a' : '') + ', nie ucieka ze strachu powyżej 15% życia.');
      if (g && ITEMS[g.type]) add('Uraza: ' + ITEMS[g.type].name + (g.x != null ? '' : ' (gdziekolwiek)') + '.');
      add('Nagroda za głowę: ' + bountyOf(e) + ' Esencji' + (e.bountyPaid ? ' (wypłacona)' : '') + '.');
    }
    { const n = live ? (live.tdFalls || 0) : 0, cap = tdCap(h); if (n || [...fl.items.values()].some(it => it.type === 'trapdoor')) add('Zapadnie: ' + n + '/' + cap + (n >= cap ? (fem ? ' (już jej nie grożą)' : ' (już mu nie grożą)') : cap === 1 ? ' (elita albo poz. 12+: spada raz)' : '') + '.'); }   // 1.24
    if (live && live.trauma && Object.keys(live.trauma).length) add('Trauma w tej fali: ' + Object.keys(live.trauma).map(k => DMG_TYPES[k]).join(', ') + ' (straszy 1,5 raza mocniej).');
    card.appendChild(ul);
    card.appendChild(el('h2', 'h2small', 'Ekwipunek'));
    const inv = live ? live.inv : e.inv, il = el('ul', 'conseq');
    if (!inv.length) il.appendChild(el('li', null, 'Nic przy sobie.'));
    inv.forEach(it => { const H = HITEMS[it.type]; const cd = live && fl.time < (it.cdUntil || 0) ? ', odnowienie ' + Math.ceil(it.cdUntil - fl.time) + ' s' : '';
      const nm = H.tool ? capFirst(H.name) + (live && it.type === 'lantern' && fl.time < (it.outUntil || 0) ? ' (zgaszona)' : '') : capFirst(adj(H.g, it.r) + ' ' + H.name) + ' (moc ' + it.r + (it.charges != null ? ', użycia: ' + it.charges : '') + cd + ')';
      il.appendChild(el('li', null, nm + srcText(it, h) + (it.cursed ? ', przeklęty' : ''))); });   // 1.20: where it comes from
    if (live && live.gold) il.appendChild(el('li', null, 'Sakwa: ' + live.gold + ' monet (spowalnia).'));
    { const ld = loadOf(h), cy = carryOf(h), f1 = v => v.toFixed(1).replace('.', ','); il.appendChild(el('li', null, 'Ciężar: ' + f1(ld) + ' / ' + f1(cy) + ' kg' + (burden(h) < 1 ? ' (zwalnia)' : '') + '.')); }   // 1.20 Udźwig
    if (live && live.fled && !live.dead && (live.loot || live.gold)) il.appendChild(el('li', null, (fem ? 'Zabrała' : 'Zabrał') + ' z lochu: ' + (live.loot || 0) + ' łupu, ' + (live.gold || 0) + ' monet.'));
    card.appendChild(il);
    if (live && !live.queued) {
      const db = Object.entries(live.dmgBy || {}).filter(x => x[1] >= 1).map(x => DMG_TYPES[x[0]] + ' ' + Math.round(x[1])).join(', ');
      const fb = Object.entries(live.fearBy || {}).filter(x => x[1] >= 1).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => fearSrcName(x[0]) + ' ' + Math.round(x[1])).join(', ');
      const sw = sawNames(live);   // 1.17.1: what he has seen (what he can talk about)
      if (db || fb || sw) { const dl = el('ul', 'conseq'); if (db) dl.appendChild(el('li', null, 'Rany w tej fali: ' + db + '.')); if (fb) dl.appendChild(el('li', null, 'Strach w tej fali: ' + fb + '.')); if (sw) dl.appendChild(el('li', null, (fem ? 'Widziała' : 'Widział') + ' w tej fali: ' + sw + '.')); card.appendChild(el('h2', 'h2small', 'Ta fala')); card.appendChild(dl); }
    }
    card.appendChild(el('p', 'note', 'Ciało i fobię poznajesz, gdy się zdradzą (dymek), z plotek z karczmy albo gdy bohater wraca z blizną.'));
    card.appendChild(btn('primary', m.back ? 'Wróć' : 'Zamknij', null, () => { closeModal(); if (m.back) { openModal(m.back); $('#card').classList.remove('enter'); } else if (m.unpause) setPaused(false); }));
  }
  // v14: the first hungry wave explains itself once
  function renderHungerTip(card) {
    card.appendChild(el('div', 'sub', 'Fala 2'));
    card.appendChild(el('h2', null, 'Serce jest głodne'));
    card.appendChild(el('p', 'lead', 'Od tej fali serce bierze pierwsze porcje Esencji z każdej fali, aż się naje: teraz ' + hungerNeed(run.wave) + ', potem coraz więcej. Dopiero reszta trafia do Ciebie.'));
    const ul = el('ul', 'conseq');
    ['Pasek ♥ pod czasem napełnia się w trakcie fali. Gdy się zapełni, serce jest syte i cała dalsza Esencja jest Twoja.',
     'Esencję daje Groza (rany, strach, śmierć, ucieczki) × Chciwość (łup, rozległy loch, karty) × Combo. Bez łupu nie ma show.',
     'Wypędzeni od razu bohaterowie nie nakarmią serca: trzymaj ich w lochu jak najdłużej, rań i strasz, ale nie wyrzucaj w pierwszym pokoju.',
     'Fala da za mało: serce zje to, co dostało, i kryształ. Kryształu nie da się odkupić (wyjątek: karta Żarłoczne serce).'].forEach(t => ul.appendChild(el('li', null, t)));
    card.appendChild(ul);
    card.appendChild(btn('primary', 'Rozumiem', null, closeModal));
  }
  // The breach, tapped between waves: what it means and the patch.
  function renderBreach(card, m) {
    const B = run.layout.breach;
    if (!B || !fl.breach || fl.phase !== 'build') { card.appendChild(el('p', null, 'Wyłomu już nie ma.')); card.appendChild(btn('primary', 'Zamknij', null, closeModal)); return; }
    // 1.01: the camera goes to the breach and leaves it in view under this sheet (about two thirds down the map), with a pulse
    centerOn(fl.breach.x + 0.5, fl.breach.y + 0.5); cam.oy -= ch * 0.18; clampCam(); fl.breachPing = realNow;
    card.appendChild(el('div', 'sub', 'Wyłom' + (B.born ? ' · od fali ' + B.born : '') + ' · na mapie poniżej'));
    card.appendChild(el('h2', null, m && m.fresh ? 'Nowy wyłom!' : 'Wyłom w ścianie'));
    card.appendChild(el('p', 'lead', B.fresh ? 'Gildia przebiła tunel do tego pokoju (czerwone kółko) i tę falę wpuści właśnie tędy.' : 'Tunel gildii wciąż jest otwarty. Każda fala wybiera: wyłom albo drzwi, zwykle tę drogę, przy której słyszała o mniejszej liczbie pułapek.'));
    card.appendChild(el('p', 'note', 'Przez wyłom bohaterowie omijają część lochu. Załatany znika na dobre (Bastion chroni pokój przed nowym).'));
    const row = el('div', 'row');
    const pb = btn('primary', 'Załataj wyłom', BREACH_PATCH + ' Esencji', () => { if (patchBreach()) { closeModal(); setHint('Wyłom załatany. Gildia może przebić nowy w kolejnych falach (Bastion chroni pokój).'); } });
    pb.id = 'sheet-patch';
    if (fl.essence < BREACH_PATCH) { pb.disabled = true; pb.querySelector('span').textContent = BREACH_PATCH + ' Esencji (masz ' + Math.floor(fl.essence) + ')'; }
    row.appendChild(pb); row.appendChild(btn('', 'Zostaw', 'niech wybierają', closeModal));
    card.appendChild(row);
  }
  // A card from the deck tab: read it, or sell it between waves.
  function renderCard(card, m) {
    const id = run.deck[m.idx], u = UPG[id];
    if (!u) { card.appendChild(el('p', null, 'Tej karty już nie ma.')); card.appendChild(btn('primary', 'Zamknij', null, closeModal)); return; }
    const n = run.deck.filter(x => x === id).length, fz = isFused(id);
    card.appendChild(el('div', 'sub', capFirst(RAR_NAME[u.rar]) + ' karta' + (fz ? ' · połączona' : '') + ' · talia ' + run.deck.length + ' z ' + run.deckSize));
    const h = el('h2', null, cardName(id)); h.style.color = fz ? '#f2c94c' : RAR_COLOR[u.rar]; card.appendChild(h);   // 1.24: a fused ★ card is golden
    card.appendChild(el('p', null, u.text));
    if (fz) card.appendChild(el('p', 'fuseline', fuseText(u)));   // 1.24
    if (n > 1) card.appendChild(el('p', 'note', 'Masz ' + n + ' kopie tej karty, działają razem.'));
    if (u.grows) card.appendChild(el('p', 'note', 'Zebrane w tym runie: ' + (run.stacks[u.id] || 0) + '. Sprzedaż ostatniej kopii zeruje licznik.'));
    const row = el('div', 'row');
    if (fl && fl.phase === 'build') {
      const tb = btn('', 'Do schowka', run.stash && run.stash.length >= stashCap() ? 'schowek pełny' : 'nie działa, czeka', () => { if (toStash(m.idx)) { closeModal(); setHint(u.name + ': w schowku.'); } });
      if ((run.stash || []).length >= stashCap()) tb.disabled = true; row.appendChild(tb);
      const sb = btn('', 'Sprzedaj', '+' + sellFor(id) + ' Esencji, karta przestaje działać', () => {   // 1.24: sellFor
        if (!sb.dataset.sure) { sb.dataset.sure = '1'; sb.querySelector('b').textContent = 'Na pewno? Stuknij jeszcze raz'; return; }
        const got = sellCard(m.idx); closeModal(); setHint('Sprzedane: ' + u.name + ' (+' + got + ' Esencji).');
      });
      sb.id = 'card-sell'; row.appendChild(sb);
    } else card.appendChild(el('p', 'note', 'Karty sprzedajesz tylko między falami.'));
    row.appendChild(btn('primary', 'Zamknij', null, closeModal));
    card.appendChild(row);
  }
  const fate = h => h.dead ? (h.female ? 'zginęła' : 'zginął') : h.carriedOut ? (h.female ? 'wyniosła kryształ' : 'wyniósł kryształ') : h.fled ? (h.fleeing ? (h.female ? 'uciekła ze strachu' : 'uciekł ze strachu') : (h.female ? 'wyszła' : 'wyszedł')) : '?';
  // where the fear came from, in plain words
  const FEAR_SRC = { dmg: 'rany', death: 'śmierć towarzyszy', lost: 'zgubienie', alone: 'samotność', split: 'rozdzielenie (zwiad)', echo: 'echo groty', curse: 'klątwa', panic: 'panika', lowhp: 'ciężkie rany', ambush: 'zasadzki',
    carrier: 'klątwa kryształu', roar: 'ryk potworów', haunt: 'nawiedzone klatki', cageAlone: 'porzucenie w klatce', lull: 'kołysanka', other: 'inne',
    heart: 'żar serca', screams: 'krzyki uciekających', phobia: 'fobia', nightmare: 'koszmary' };   // 1.12.1: these showed as raw keys
  const fearSrcName = k => FEAR_SRC[k] || (ITEMS[k] ? ITEMS[k].name.toLowerCase() : k);
  function statTile(box, v, label, cls) { const d = el('div', 'stat' + (cls ? ' ' + cls : '')); d.appendChild(el('b', null, v)); d.appendChild(el('span', null, label)); box.appendChild(d); }
  function itemsTable(byType) {
    const rows = Object.keys(byType).filter(k => !TOOLS[k]).map(k => ({ k, b: byType[k], pts: byType[k].pts + byType[k].passivePts + byType[k].fearPts })).filter(r => r.b.placed > 0 || r.pts > 0).sort((a, b) => b.pts - a.pts);
    const wrap = el('div');
    if (!rows.length) return wrap;
    wrap.appendChild(el('p', 'note', 'Co zadziałało (trafienia · Esencja):'));
    const t = el('table', 'stats');
    rows.forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, ITEMS[r.k].name + (ITEMS[r.k].rarity ? ' ' + ITEMS[r.k].tag : ''))); tr.appendChild(el('td', null, r.b.hits + ' · ' + Math.round(r.pts))); t.appendChild(tr); });
    wrap.appendChild(t);
    return wrap;
  }
  function statsTable(s) {
    const t = el('table', 'stats');
    [['Skill checki: krytyk / draśnięcie / pudło / odpuszczone', s.checkCrit + ' / ' + s.checkOk + ' / ' + s.checkMiss + ' / ' + s.checkSkip],
     ['Łup: zobaczony / zabrany / odpuszczony (ryzyko)', s.lootSeen + ' / ' + s.loot + ' / ' + s.lootSkipped],
     ['Narady · zwiady · samotne wypady · zbiórki · odwroty', s.talks + ' · ' + s.scouts + ' · ' + s.wanders + ' · ' + s.regroups + ' · ' + s.retreats],
     ['Zwiedzanie: rozglądania / odmowy / znalezione monety / pułapki odpalone przy szukaniu', (s.looks || 0) + ' / ' + (s.lookNo || 0) + ' / ' + (s.goldFound || 0) + ' / ' + (s.lookTraps || 0)],
     ['Narada po 2 min: do domu / szturm / jeszcze chwila · wrócili sami', (s.councilHome || 0) + ' / ' + (s.councilStorm || 0) + ' / ' + (s.councilMore || 0) + ' · ' + (s.goHome || 0)],
     ['Wieści: pułapki usłyszane zza ściany / śmierć przekazana później / łup zostawiony na rozkaz', (s.heard || 0) + ' / ' + (s.newsDeaths || 0) + ' / ' + (s.lootObey || 0)],
     ['Osobno: na zwiadzie / sam / zgubiony (s)', Math.round(s.splitTime || 0) + ' / ' + Math.round(s.loneTime || 0) + ' / ' + Math.round(s.lostTime || 0) + (s.splitLost ? ' · zabłądzili ze zwiadu: ' + s.splitLost : '')],
     ['Paniki · ucieczki · ucieczki całej drużyny', s.panics + ' · ' + s.flees + ' · ' + s.partyFlees],
     ['Pułapki zapamiętane / niezapamiętane / wykryte', s.learned + ' / ' + s.notLearned + ' / ' + s.detected],
     ['Rozbrojone (z tego rozmontowane) / nieudane / odczynione przez kapłana', s.disarmed + ' (' + (s.sapped || 0) + ') / ' + s.disarmFails + ' / ' + s.blessed],
     ['Pułapki wyczute przez maga', s.sensed || 0],
     ['Przygotowania: razy / osłony / zakłócenia / rozbrojenia z progu', s.preps + ' / ' + s.wards + ' / ' + s.jams + ' / ' + s.prepDisarms],
     ['Plotki: pokoje / pułapki / fałszywe', s.rumorRooms + ' / ' + s.rumorTraps + ' / ' + s.rumorFalse],
     ['Zapadnie · klatki · uratowani · porzuceni', s.falls + ' · ' + s.cages + ' · ' + s.rescues + ' · ' + s.abandons],
     ['Samoobrona: uniki, tarcze, talizmany, bariery', s.dodges + ', ' + s.shields + ', ' + s.charms + ', ' + s.barriers],
     ['Przebiegnięcia przy przeładowaniu', s.timing],
     ['Najwyższe combo', '×' + fmt2(1 + 0.25 * (s.maxCombo - 1))],
     ['Potwory, które zginęły', s.monstersLost],
     ['Esencja: dla serca / dla Ciebie / z combo wstecz / relikwie', Math.round(s.essHeart || 0) + ' / ' + Math.round(s.essWave || 0) + ' / ' + Math.round(s.comboPts || 0) + ' / ' + Math.round(s.essDrop || 0)],
     ['Czas · pauza · przyspieszenie', mmss(fl.time) + ' · ' + Math.round(s.pauseTime) + ' s · ' + Math.round(s.ffTime) + ' s']
    ].forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, String(r[1]))); t.appendChild(tr); });
    return t;
  }
  function renderOver(card) {
    card.appendChild(el('div', 'sub', 'Serce lochu gaśnie'));
    const ate = fl.hunger && fl.hunger.ate;
    card.appendChild(el('h2', null, ate ? 'Serce zjadło ostatni kryształ' : 'Ostatni kryształ wyniesiony'));
    card.appendChild(el('p', null, (ate ? 'Loch nie dostał dość grozy i chciwości, więc pożarł sam siebie.' : 'Bohaterowie wynieśli wszystkie kryształy.') + ' W grze tu jest reklama nagradzana: jeden kryształ wraca i grasz dalej (raz na run).'));
    const row = el('div', 'row');
    if (!run.continueUsed) {
      let gu = null;
      const rv = btn('primary', 'Kontynuuj z 1 kryształem', 'symulacja reklamy', () => {
        rv.disabled = true; if (gu) gu.disabled = true;
        let n = 3; rv.querySelector('b').textContent = 'Reklama... ' + n;
        const timer = setInterval(() => {
          n--;
          if (n > 0) { rv.querySelector('b').textContent = 'Reklama... ' + n; return; }
          clearInterval(timer);
          { const c0 = run.crystals; run.continueUsed = true; run.crystals = 1; run.maxCrystals = Math.max(run.maxCrystals, 1); crystalEv(run.crystals - c0, 'other', 'continue'); }   // 1.24 (D, P0-2): the rewarded ad
          closeModal(); proceedToBuild(); setHint('Serce znowu bije. Nie zmarnuj tego.');
        }, 700);
      });
      row.appendChild(rv);
      gu = btn('', 'Zakończ run', null, () => { closeModal(); endRun(ate ? 'Serce zjadło ostatni kryształ.' : 'Bohaterowie wynieśli wszystkie kryształy.', 'end'); });
      row.appendChild(gu);
    } else row.appendChild(btn('primary', 'Zakończ run', null, () => { closeModal(); endRun(ate ? 'Serce zjadło ostatni kryształ.' : 'Bohaterowie wynieśli wszystkie kryształy.', 'end'); }));
    card.appendChild(row);
  }
  // After a reload at the final summary: the same choice as on the summary (win now or play on).
  function renderVictory(card) {
    card.classList.add('vic');
    card.appendChild(el('div', 'sub', waveName() + ' odparta'));
    card.appendChild(el('h2', null, 'Zwycięstwo!'));
    card.appendChild(el('p', null, 'Bohater z przepowiedni nie wyniósł Twojego serca. Run wygrany: zebrane ' + Math.round(run.total) + ' Esencji, ranga: ' + rankOf(run.total).name + ', kryształy ' + run.crystals + ' z ' + run.maxCrystals + '.'));
    card.appendChild(el('p', 'note', 'Możesz grać dalej: fale bez końca, co 5 fal boss, bohaterowie coraz silniejsi. Wygrana zostaje, nawet jeśli później padniesz.'));
    pushLog(null);
    const row = el('div', 'row');
    const go = btn('primary', 'Graj dalej', 'fale bez końca', () => { run.victoryDone = true; closeModal(); proceedToBuild(); }); go.id = 'vic-continue';
    const end = btn('', 'Zakończ: zwycięstwo', null, () => { run.victoryDone = true; closeModal(); endRun('Loch przetrwał wszystkie ' + RUN_WAVES + ' fal.', 'win'); }); end.id = 'vic-end';
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
  const LOG_VERSION = 61;   // 1.25.1: waves.summary.previewVis {buildSec, sec, openSec, coveredSec, firstAt} (how long the next wave's preview was on screen in the build), stats.unspentPick / unspentPicks (the buy hint in the unspent-Esencja question). 1.25 (60): runs.screen (w, h, ui, wide, mouse, touch: which layout and pointer the run was played with). Before: 1.24 Part B (the same 59): runs: tut.stepTimes (seconds on each step, by TUT order) and tut.stepIds; stage now follows the wave in the first run (runs.stage = the stage reached); waves: fearUi.bar (taps on a fear bar), stats.tutSpike (the guide's spikes sprung once). 1.24 Part D (59):runs: status one of win/end/quit/active (won => win), playerId, crystals0 + crystalEvents [{t, delta, cause, wave, why}] (cause stolen/hunger/saved/card/other), activeSec, sessions [{start, end}], endBonus (total = sum of waveMini.sc + endBonus); waves summary: crystalEvents, essenceAtStart, essenceAtWaveStart, itemsCount, roomsCount, previewOpened, fearUi {card, bar}, stats.checkByShape {shape: {ok, crit, miss, skip, auto}}, stats.calmAuto, unspentAsk, unspentGo; settings calmWaves, calmGap, okPulse, okSwing. 58, 1.24 Part A adds runs/waves fused (the fused ★ card ids), stats: exhausted, forcedOut, tdSeen; timeline xh (worn out: how many inside) fo (forced out: id, x, y, state). 1.23 adds heroes[].nem and stats: nemeses, nemesisNew, nemesisDropped, nemRooms, nemTraps, nemesisReply, nemesisWarn, nemesisBoast, nemesisRage, nemesisDown, nemesisOut, nemesisCrystal, grudgeHits, grudgeDone, bounties, essBounty, bountyTalk, fallenMemory; timeline nn nm ng nd nx nr nb no nw2 bn fm. 1.22 adds stats: escortForms, escortGuards, guardSoaks, guardSoakDmg, handOvers, lastStands, lastStandT, sacrifices, sacrificeFired, youFirst, taps, tapFound, notThisWay, notThisWayMoved, frontLines, woundedBack, nearExit; timeline ef gs ho lx le sf sd yf tp tf nw fm wb ne. 1.21 adds heroes[].bond (type[:role]:id) and stats: bonds, bondsBy, bondLines, griefs, revengeVows, revengeFights, grownUp, noLeave, noLeaveSaved, mentorWatch, mentorProud, rivalMock, quarrels, quarrelStops, quarrelWins, quarrelSulks, bets, betsWon, betsLost, betsOff; timeline bo bk gf vw gu rm mw mp qq nl ns ob bt be. 1.20 adds heroes[].endSrc/took/load and stats: lootFallen, predecessorSeen, bodyLoot, bodyLootBy, gearGiven, gearTrades, amuletGiven, tooHeavy, loadSlowT, lootAssign, lootRival, lootOffer, lootOfferTaken, lanternSaves, lanternOut, lanterns, lanternGrope, crowbarGate, crowbarCage, gearKnocked, gearBack, mimicAte, mimicSpill, bombCook, bombFriendly, bombHeld, returnGear, cursePassed, greedBody, lootDeadObject; timeline gv bl pr qa qo qr la lm kn mx bx bf2 rq st (st: gear knocked off in a Zbrojownia, it was sp). 58: Prototype 1.13 (1.13.1 the same fields: solo lines when alone; 1.13.2 adds stats.swapWay: idle heroes who swapped places to let one pass; 1.13.3 the same fields: a shorter scene before a deadly room; 1.14 adds found (runs file): what the run started with from earlier discoveries; 1.15 adds layout cell [9]: the room's komnata (KIND_INFO id or null); 1.13.4 adds stats.disarmQuit: a thief who gave up a trap after it went off in his face twice, and stats.restBy: a retreating hero who sat down next to a friend resting in his way): conversations (stats.convos = exchanges started, stats.convoNo = why one did not start: breath, talk, queue, luck, hush, alone, fit), talks only for the ones standing together (h.talkUntil), alone a hero talks to himself (SOLO) or keeps quiet, nobody stands still in a trap (stats.toSafety); the check at the top of the map; talks, rests, the stop before a room, a hero down a trapdoor and everyone caged are quiet
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
    if (H && H.ate) lines.push('Głód pochłonął kryształ: serce chciało ' + H.need + ' Esencji z tej fali, a dostało ' + fmtE(heart) + '.');
    fl.heroes.filter(h => h.carriedOut).forEach(h => lines.push('Kryształ skradziony: ' + heroName(h) + ' (' + className(h).toLowerCase() + ' ' + h.lvl + ') ' + (h.female ? 'wyniosła' : 'wyniósł') + ' go z lochu.'));
    if (!lines.length) return;
    const p = el('p', 'note crywhy', lines.join(' ')); p.id = 'wave-crystal-why'; body.appendChild(p);
  }
  // 1.24 (D, P0-2): in the build phase, a warning when hunger may eat a crystal in the coming wave: the last wave brought less than
  // 1,25 x what the heart wants now, or the heart ate a crystal last time
  function hungerRisk() {
    const need = run ? hungerNeed(run.wave) : 0; if (!need || !fl || fl.phase !== 'build') return 0;
    const last = run.waves[run.waves.length - 1];
    return !last || last.score < need * 1.25 || (last.hunger && last.hunger.ate) ? need : 0;
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
  function pushLog(waveDoc) {
    if (run.logState === 'denied' || run.logState === 'off') return Promise.resolve(run.logState);
    return getDb().then(db => {
      if (!db) { run.logState = 'off'; return 'off'; }
      const fail = err => { run.logState = (err && err.code === 'invalid_argument') ? 'denied' : 'fail'; return run.logState; };
      const wr = waveDoc ? db.collection('waves').doc(run.id + '_' + String(waveDoc.wave).padStart(2, '0')).set(waveDoc) : Promise.resolve();
      return wr.then(() => db.collection('runs').doc(run.id).set(runSummary())).then(() => { run.logState = 'ok'; return 'ok'; }, fail);
    }).catch(() => { run.logState = 'fail'; return 'fail'; });
  }
  const logText = st => st === 'ok' ? 'Zapisane do analizy.' : st === 'off' ? 'Zapis wyników jest niedostępny w tym widoku (możesz pobrać plik).'
    : st === 'denied' ? 'Ten widok nie ma prawa zapisu wyników (możesz pobrać plik).' : st === 'fail' ? 'Nie udało się zapisać (możesz pobrać plik).' : '';
  let dlPromise = null;
  function getDownloads() {
    if (!dlPromise) dlPromise = (window.claude && typeof window.claude.use === 'function') ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null);
    return dlPromise;
  }
  function downloadRun(note) {
    if (!run || !run.waveDocs.length) { note.textContent = 'Ten run nie ma jeszcze żadnej zapisanej fali.'; return; }
    const data = JSON.stringify({ format: 'yatd-run', run: runSummary(), waves: run.waveDocs }), name = 'yatd-run-' + run.id + '.json';
    note.textContent = 'Przygotowuję plik...';
    getDownloads().then(dl => {
      if (!dl && WEB) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); note.textContent = 'Plik ' + name + ' pobrany.'; return; } catch (e) {} }
      if (!dl) { copyFallback(data, note); return; }
      dl.save({ filename: name, data: new Blob([data], { type: 'application/json' }) })
        .then(() => { note.textContent = 'Plik ' + name + ' zapisany. Możesz go wysłać i wrzucić do rozmowy z Claude.'; },
          err => { if (err && err.code === 'declined') note.textContent = 'Pobieranie anulowane.'; else copyFallback(data, note); });
    });
  }
  function copyFallback(data, note) {
    const show = () => {
      note.textContent = 'Pobieranie nie działa w tym widoku. Zaznacz i skopiuj ten tekst, potem wklej go Claude albo do pliku .json:';
      const ta = el('textarea', 'dump'); ta.value = data; ta.readOnly = true; ta.rows = 4; note.after(ta); ta.focus(); ta.select();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data).then(() => { note.textContent = 'Pobieranie nie działa w tym widoku, więc wyniki są w schowku: wklej je Claude albo do pliku .json.'; }, show);
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
  const healLine = it => it.type === 'shaman' && it.lhl > 0 ? ' Wyleczył potworom ' + it.lhl + ' HP.' : '';   // 1.24 (C, addendum 2): the shaman's heals of the last wave
  function itemInfo(it) {
    const T = ITEMS[it.type], lvl = it.lvl || 1, back = itemBack(it);
    const last = (!ACTIVE[it.type] ? '' : it.lf === undefined ? '' : it.lf === 0 ? ' Ostatnia fala: ani razu.' : ' Ostatnia fala: ' + it.lf + '× odpalony, ' + it.lh + ' trafień, ' + it.lp + ' Esencji.') + healLine(it);   // 1.24 (C, addendum 2)
    const up = ACTIVE[it.type] && lvl < 3 ? upgCost(it) : 0, full = (UI.carryTips || 0) < 3;
    if (full) { UI.carryTips = (UI.carryTips || 0) + 1; saveUI(); }
    if (!full) return T.name + (ACTIVE[it.type] ? ' (poziom ' + lvl + ')' : '') + ': stuknij nowe miejsce.' + (up ? ' Dwa stuknięcia: ulepsz za ' + up + '.' : '') + last;
    return T.name + (ACTIVE[it.type] ? ' (poziom ' + lvl + ')' : '') + ' w ręce: stuknij nowe miejsce albo ten sam element, żeby odłożyć.' + (up ? ' Dwa szybkie stuknięcia: ulepsz za ' + up + ' Esencji.' : '') + ' Przytrzymaj, żeby zdjąć (' + (back ? '+' + back + ' Esencji' : 'bez zwrotu') + ').' + last;
  }
  const objName = o => o.built ? 'Skrzynia' : 'Mebel';
  const objBack = o => o.built ? ITEMS.crate.cost : 0;
  function objInfo(o) { return objName(o) + ' w ręce: stuknij wolne miejsce w pokoju (nie przy drzwiach) albo ten sam mebel, żeby odłożyć. Przytrzymaj, żeby ' + (o.built ? 'zdjąć (+' + ITEMS.crate.cost + ' Esencji).' : 'go usunąć (bez zwrotu, to mebel lochu).') + (fl.items.get(key(o.x, o.y)) ? ' To, co na nim stoi, idzie razem z nim.' : ''); }
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
    pushUndo('przeniesienie: ' + objName(o).toLowerCase());
    const e = c0.objs.splice(idx, 1)[0]; e[0] = x; e[1] = y; c1.objs.push(e);
    const on = fl.items.get(key(o.x, o.y));   // powder, a mimic or a music box rides along
    if (on) { fl.items.delete(key(o.x, o.y)); on.x = x; on.y = y; on.gx = x + 0.5; on.gy = y + 0.5; fl.items.set(key(x, y), on); }
    rebuildDungeon(true); fl.threatDirty = true;
    floatTile(x, y, 'Przeniesione', '#d8d2c4', 13, -0.6); updateTray(); saveRunSoon();
    return true;
  }
  function removeObj(o) {
    pushUndo('usunięcie: ' + objName(o).toLowerCase());
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
      floatTile(t.x, t.y, got ? '+' + got + ' Esencji' : 'Zdjęte', got ? '#ff7a86' : '#d8d2c4', 14, -0.6);
      setHint(T.name + ' zdjęte' + (got ? ' (+' + got + ' Esencji).' : ' (bez zwrotu).') + ' Cofnij przywróci.');
    } else if (t.o) {
      if (fl.objects.get(key(t.o.x, t.o.y)) !== t.o) return;
      if (movingObj === key(t.o.x, t.o.y)) dropCarry();
      const nm = objName(t.o), got = removeObj(t.o);
      floatTile(t.x, t.y, got ? '+' + got + ' Esencji' : 'Usunięte', got ? '#ff7a86' : '#d8d2c4', 14, -0.6);
      setHint(nm + ' usunięty' + (got ? ' (+' + got + ' Esencji).' : '.') + ' Cofnij przywróci.');
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
      if ((cur && x === cur.x && y === cur.y) || (curO && x === curO.x && y === curO.y && !(direct && direct !== cur))) { dropCarry('Odłożone. Stuknij coś innego, żeby to przenieść.'); return true; }
      if (direct && direct !== cur) { pickUp(direct); return true; }
      if (cur) {
        const t = moveTarget(cur, wx, wy);
        if (t) { moveItem(cur, t[0], t[1]); dropCarry(ITEMS[cur.type].name + ' przeniesione (za darmo). Plotki o starym miejscu są już nieaktualne.'); return true; }
        if (dirO) { pickUpObj(dirO); return true; }
        note('Tu nie pasuje'); if (0) setHint(ITEMS[cur.type].name + ' tu nie pasuje: potrzebne miejsce typu ' + SLOT_LABEL[ITEMS[cur.type].slot] + ' w pokoju z wolnym miejscem. Stuknij ' + ITEMS[cur.type].name.toLowerCase() + ' jeszcze raz, żeby odłożyć.');
        return true;
      }
      if (dirO && dirO !== curO) { pickUpObj(dirO); return true; }
      const t = objTarget(curO, wx, wy);
      if (t) { const nm = objName(curO); moveObj(curO, t[0], t[1]); dropCarry(nm + ' przeniesiony.'); return true; }
      note('Tu nie pasuje');
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
  const DOUBLE_TAP_MS = 380; let lastTap = null;
  function handleTap(wx, wy) {
    if (!fl || !run) return;
    const x = Math.floor(wx), y = Math.floor(wy); lastTapT = { x, y };
    if (fl.phase === 'build') {   // Prototype 1.0: two quick taps on a placed element upgrade it (the first tap picked it up: put it back)
      const tx = Math.floor(wx), ty = Math.floor(wy), now = performance.now(), it2 = fl.items.get(key(tx, ty)) || (!selected || MODES[selected] ? itemAt(wx, wy) : null);
      if (it2 && lastTap && lastTap.it === it2 && now - lastTap.t < DOUBLE_TAP_MS) { lastTap = null; if (movingKey === key(it2.x, it2.y)) dropCarry(); tapUpgrade(it2); return; }
      lastTap = it2 ? { it: it2, t: now } : null;
    }
    if (fl.phase === 'build' && selected === 'upgrade') { const it = itemAt(wx, wy); if (it) tapUpgrade(it); else setHint('Stuknij postawioną pułapkę albo potwora. Koszt ulepszenia widać nad elementem.'); return; }
    if (fl.phase === 'build' && buildTap(wx, wy)) return;
    if (fl.phase === 'build' && selected && TOOLS[selected]) {
      let best = null, bd = 1.8;
      toolMarkers(selected).forEach(m => { const d = Math.hypot(wx - m.x, wy - m.y); if (d < bd) { bd = d; best = m; } });
      if (best) applyTool(best); else setHint('Stuknij jeden ze znaczników na mapie.');
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
      setHint(s ? 'To miejsce: ' + SLOT_LABEL[s] + '. Wybierz na dole element, który tu pasuje. Stuknięcie postawionego elementu go przenosi, przytrzymanie zdejmuje.' : 'Wybierz element na dole, pasujące miejsca się podświetlą. Stuknięcie postawionego elementu go przenosi, przytrzymanie zdejmuje.');
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
    if (!run.unlocked.has(type)) { note('Zablokowane', x, y); return false; }
    if (fl.essence < cost) { note('Za mało Esencji', x, y); return false; }
    if (BUILDINGS[type] && !canPlace(type, x, y)) {
      const r = roomOf(x, y);
      if (fl.phase !== 'build') { note('Tylko między falami', x, y); return false; }
      if (r >= 0 && fl.rooms[r].kind !== 'room') { note('Tylko w pokoju', x, y); return false; }
      if (r >= 0 && [...fl.items.values()].some(o => o.type === type && roomOf(o.x, o.y) === r)) { note('Już stoi w tym pokoju', x, y); return false; }
      if (!fl.items.has(key(x, y)) && !blockerOk(x, y)) { note('Zablokuje przejście', x, y); return false; }
    }
    if (!canPlace(type, x, y)) {
      if (slotOf(x, y) === T.slot && !fl.items.has(key(x, y)) && roomFull(type, x, y)) { const R = fl.rooms[slotRoom(type, x, y)]; note((R.kind === 'hall' ? 'Korytarz' : 'Pokój') + ' pełny (' + roomCap(R) + ')', x, y); if (0) setHint((R.kind === 'hall' ? 'Ten korytarz' : 'Ten pokój') + ' jest pełny (' + roomCap(R) + '). Rozbuduj go albo wykop nowy pokój (zakładka Loch), albo zdejmij coś stąd.'); return false; }
      if (type === 'crate') { note(fl.phase !== 'build' ? 'Tylko między falami' : 'Tu nie pasuje', x, y); return false; }
      note('Tu nie pasuje', x, y); return false;
    }
    if (fl.phase === 'build') pushUndo('postawienie: ' + T.name);
    if (type === 'crate') {
      const c = run.layout.cells.get(fl.rooms[roomOf(x, y)].key);
      c.objs.push([x, y, 'crate', 1]);
      fl.essence -= T.cost; bt(type).placed++; bt(type).spent += T.cost; fl.stats.built++;
      rebuildDungeon(); updateTray();
      setHint('Skrzynia stoi. Możesz postawić na niej proch albo mimika (zakładka Pułapki).');
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
    if (ACTIVE[type]) setHint(T.name + ': podświetlony obszar to zasięg. Stuknięcie postawionego elementu go przenosi, dwa szybkie ulepszają, przytrzymanie zdejmuje.');   // 1.05: it still said one tap upgrades
    else if (BUILDINGS[type]) { const d = T.desc.split(': ').slice(1).join(': '); setHint(T.name + ' stoi. ' + d.charAt(0).toUpperCase() + d.slice(1)); }
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
    floatTile(t.x, t.y, 'Zdjąć' + (back ? ' za +' + back : '') + '? Prawy jeszcze raz', '#d8d2c4', 13, -0.6);   // (the hint line is gone since 1.17: the question floats over the element)
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
      box.appendChild(el('div', 'hs', h.T.name[h.female ? 1 : 0] + ' · poz. ' + h.lvl + (h.boss ? ' · ' + BOSS_NAME[h.boss][h.female ? 1 : 0] : '')));
      box.appendChild(el('div', null, 'Życie ' + Math.max(0, Math.ceil(h.hp)) + '/' + Math.round(h.max) + ' · strach ' + Math.round(100 * clamp(h.fear / h.courage, 0, 1)) + '%' + (h.crystal ? ' · niesie kryształ!' : '')));
      box.appendChild(el('div', 'hk', 'Kliknij: karta bohatera'));
    } else if (w.it) {
      const it = w.it, I = ITEMS[it.type], lb = effWords(it.type);
      box.appendChild(el('b', null, I.name + ((it.lvl || 1) > 1 ? ' · poz. ' + it.lvl : '')));
      if (I.tag) box.appendChild(el('div', 'hs', I.tag));
      if (lb.length) { const r = el('div', 'tlb'); lb.forEach(x => r.appendChild(el('span', x === 'Rani' ? 'hurt' : 'scare', x))); box.appendChild(r); }
      const d = I.desc.split(': ').slice(1).join(': ') || I.desc; box.appendChild(el('div', null, d.charAt(0).toUpperCase() + d.slice(1)));
      if (fl.phase === 'build') box.appendChild(el('div', 'hk', 'Kliknij: przenieś · dwa razy: ulepsz · prawy: zdejmij'));
    } else if (w.o) {
      box.appendChild(el('b', null, objName(w.o)));
      box.appendChild(el('div', 'hk', 'Kliknij: przenieś · prawy: ' + (w.o.built ? 'zdejmij' : 'usuń')));
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
    if (e.code === 'Escape' && (selected || movingKey || movingObj)) { selected = null; movingKey = null; movingObj = null; updateTray(); setHint('Wybierz element i stuknij pasujące miejsce.'); }
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
    note('Na trasie: pole z kółkiem', t[0], t[1]); tutFlags.offWay = (tutFlags.offWay || 0) + 1;
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
    { id: 'intro', text: 'To Twój loch. Bohaterowie przyjdą falami po kryształy z serca (ostatni pokój). Loch postawił za Ciebie dwie pułapki blisko serca, ale same nie wystarczą: dostawisz więcej.', next: true },
    { id: 'spikes', text: 'Wybierz Kolce z paska na dole (zakładka Pułapki).', hl: ['#tab-traps', '#item-spikes'], prep: () => { movingKey = null; movingObj = null; pickTab('traps', 'spikes'); updateTray(); setTrayOpen(true); }, done: () => selected === 'spikes' || countType('spikes') > (tutFlags.sp0 || 0) },
    { id: 'place', text: 'Postaw je na trasie bohaterów: stuknij pole z pulsującym kółkiem (albo inne pole na ich drodze).', tile: () => tutPathTile(0.25, 'spikes'), done: () => countType('spikes') > (tutFlags.sp0 || 0) },
    { id: 'hold', text: () => PC() ? 'Najedź myszką na kafelek Strzały (albo kliknij go prawym przyciskiem): rozwinie się opis, co robi i gdzie stoi. Tak sprawdzisz każdy element.' : 'Przytrzymaj palec na kafelku Strzały na dole: rozwinie się opis, co robi i gdzie stoi. Tak sprawdzisz każdy element.', hl: ['#item-arrows'], prep: () => { selected = null; tutFlags.tip0 = tutFlags.tipN || 0; pickTab('traps', 'arrows'); setTrayOpen(true); }, done: () => (tutFlags.tipN || 0) > (tutFlags.tip0 || 0), skip: true },
    { id: 'move', text: () => movingKey ? 'Masz ją w ręce: stuknij pole z przerywaną ramką, żeby ją tam postawić.' : 'Postawioną pułapkę przeniesiesz za darmo: stuknij tę w kółku (podniesiesz ją), potem pole z przerywaną ramką.' + (PC() ? ' Prawy przycisk na postawionej (dwa razy) zdejmuje ją i oddaje Esencję.' : ' Przytrzymanie palca na postawionej zdejmuje ją i oddaje Esencję.'), tile: () => { const it = [...fl.items.values()].find(o => o.sys); return it ? [it.x, it.y] : null; }, prep: () => { selected = null; updateTray(); }, done: () => !!tutFlags.moved, skip: true },
    { id: 'spend', text: () => 'Masz jeszcze ' + Math.floor(fl.essence) + ' Esencji. W pierwszej fali nie oszczędzaj: dostaw pułapki przy trasie, kolce na podłogę, strzały na ścianę (też na niską od frontu, strzałka pokazuje, w który pokój strzelą). Pokój mieści kilka (licznik w rogu).', hl: ['#tab-traps'], prep: () => { selected = null; tab = 'traps'; updateTray(); }, done: () => fl.phase !== 'build' || fl.essence < 3 || !tutAnySpot(), skip: true },
    { id: 'go', text: 'Gotowe. Wypuść falę przyciskiem w prawym dolnym rogu. Pasek budowy schowa się na czas fali, a w fali ▲ Budowa zatrzymuje grę, żebyś mógł spokojnie dostawić pułapki.', hl: ['#btn-action'], done: () => fl.phase === 'raid' },
    // the wave: one line at the top; the first check jumps to 'check' (after its card)
    { id: 'novice', text: 'Nadchodzą nowicjusze. Każda rana to Groza, a linia u góry zamienia ją w Esencję: Groza × Chciwość × Combo.', hl: ['#h-eq'], raid: true, ack: true },   // 1.15.1: the game stands until Rozumiem (was: gone after 9 s, the game going on)
    { id: 'check', text: 'Stuknij w mapę, gdy koralik będzie w obwódce (draśnięcie) albo w pełnym polu (krytyk). Trafiony wynik pułapka pamięta (znaczek w rogu pola), także w kolejnych falach.', raid: true, done: () => tutFlags.resolved || (!fl.check && tutT > 2) },
    { id: 'herocard', text: 'Stuknij bohatera (albo listę w rogu): zobaczysz jego kartę i klasę. Gra stoi, dopóki jej nie przeczytasz.', raid: true, skip: true, done: () => tutFlags.heroCard },
    { id: 'ff', text: () => (PC() ? 'Teraz przytrzymaj F (albo lewy przycisk myszy na mapie): ' : 'Teraz przytrzymaj palec na mapie: ') + 'gra ruszy przyspieszona, a pułapki biją same (z zapamiętaną siłą albo jak draśnięcie). Gdy nic się nie dzieje, gra przyspiesza sama (▶▶ spokój).', raid: true, skip: true, hold: true, done: () => tutFlags.ffUsed },
    // wave 2 (after the first card from the shop and the card about the heart)
    { id: 'loot', wave: 2, text: 'Serce chce Esencji, a Esencję mnoży chciwość. Łup (zakładka Łup) wabi bohaterów i podbija chciwość: złote orby w równaniu. Stawiaj go w pokojach, przez które przejdą.', build: true, hl: ['#tab-loot'], prep: () => { pickTab('loot'); setTrayOpen(true); }, next: true },
    { id: 'upgrade', wave: 2, text: () => { const it = tutUpTarget(); return 'Dwa szybkie stuknięcia w element to ulepszenie: mocniej bije i ma szersze strefy checku. Stuknij dwa razy ' + (it ? ITEMS[it.type].name.toLowerCase() : 'pułapkę') + ' w kółku (koszt: ' + (it ? upgCost(it) : 6) + ' Esencji).'; }, build: true, tile: () => { const it = tutUpTarget(); return it ? [it.x, it.y] : null; }, prep: () => { selected = null; updateTray(); const it = tutUpTarget(); if (it && fl.essence < upgCost(it)) fl.essence = upgCost(it); }, done: () => !!tutFlags.upgraded, skip: true },
    { id: 'deck', wave: 2, text: () => 'Karta ze sklepu leży w talii: ' + slotsTxt(run.deckSize) + '. Działa do końca runu albo do sprzedaży; druga kopia łączy się z pierwszą w złotą kartę ★. Po każdej fali dostajesz darmową kartę; inne kupisz za Esencję. Pierwszy kafelek otwiera sklep.', build: true, hl: ['#tab-deck'], prep: () => { tab = 'deck'; updateTray(); setTrayOpen(true); }, next: true },
    // wave 3
    { id: 'dig', wave: 3, text: 'Pokój mieści tylko kilka elementów (licznik w rogu), więc między falami kop nowe pokoje: zakładka Loch (Nowy pokój, Przejście, Rozbuduj, Wyburz).', build: true, hl: ['#tab-dungeon', '#item-dig'], prep: () => { pickTab('dungeon', 'dig'); setTrayOpen(true); }, next: true },
    { id: 'end', wave: 3, text: 'To wszystko z przewodnikiem. Ten run odsłoni resztę gry z falami: teraz straszenie, od fali 5 gildię z budowlami i typy pokoi, od fali 7 ciała i fobie bohaterów, powracających i wyłom. Kolejne runy to od razu cała gra. Powodzenia!', build: true, next: true }
  ];
  // 1.04: the moments that matter stop the game once, with a card at the top of the map (the check waits under it)
  const TUT_POP = {
    check: 'Skill check! Gdy koralik wjedzie w obwódkę, stuknij w mapę: to draśnięcie. Pełne pole to krytyk, najmocniejszy cios. ☠ znaczy, że ten cios zabije. Trafiony wynik pułapka pamięta, także w kolejnych falach.',
    pay: 'Koniec combo: Groza × Chciwość × Combo zamienia się w Esencję (czerwone kuleczki). Możesz ją wydać od razu, nawet w trakcie fali.',
    theft: 'Kryształ skradziony! Zabij albo wystrasz niosącego, zanim dojdzie do wyjścia: kryształ wróci do serca. Jeśli wyjdzie z nim z lochu, kryształ przepada.',
    flee: 'Bohater ucieka ze strachu (pełny fioletowy pasek). Kiedy wybiegnie z lochu, dostaniesz Esencję, ale opowie innym o Twoich pułapkach.',
    // 1.12: the full game (run 4 of the first ones): the first time each of these shows up
    body: 'Słabość albo odporność ciała! Ten bohater obrywa od jednego typu obrażeń mocniej (słabość) albo słabiej (odporność). Stuknij go, żeby zobaczyć kartę.',
    phobia: 'Fobia! Ten bohater boi się jednej rzeczy 2 razy bardziej i właśnie ją zobaczył. Stuknij go, żeby zobaczyć, czego się boi.',
    returner: 'W drużynie jest powracający: uciekł Ci kiedyś, a teraz wraca silniejszy, z blizną i z pamięcią Twojego lochu (stuknij go na liście).'
  };
  let tutPopNow = null; const tutPopQ = [];
  function coachSync() { const co = $('#coach'); coachInset = !co.hidden && co.classList.contains('top') ? Math.round(co.getBoundingClientRect().bottom - stage.getBoundingClientRect().top) : 0; }   // 1.25: on the screen (the coach is zoomed on a big screen)   // read once per change, not every frame
  // 1.12: the cards show in the first runs (with the guide or not), each once in this browser
  const POPS_KEY = 'yatd-pops';
  const popsSeen = () => { try { return JSON.parse(localStorage.getItem(POPS_KEY) || '{}') || {}; } catch (e) { return {}; } };
  function tutPop(id) {   // true if the card shows (or waits for the one up now)
    if (!run || !(run.guided || (run.tutorial && run.tut >= 0)) || !fl || fl.phase !== 'raid' || fl.ending !== null || fl.finishing || modalOpen || !TUT_POP[id]) return false;   // not as the wave ends
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
    const row = el('div', 'crow'); row.appendChild(el('span', 'step', 'Gra stoi'));
    const ok = el('button', 'next', 'Rozumiem'); ok.type = 'button'; ok.addEventListener('click', tutPopClose); row.appendChild(ok);
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
  function renderNews(card) {   // 1.12.1: what the tavern says about the next wave (a tap on "Fala X/10" in the build)
    card.appendChild(el('div', 'sub', 'Wieści z karczmy'));
    card.appendChild(el('h2', null, waveName()));
    waveHint().split(/(?<=[.!?])\s+(?=[A-ZŁŚŻŹĆŃÓĘĄ])/).forEach(t => card.appendChild(el('p', null, t)));
    const b = btn('primary', 'Zamknij', null, closeModal); b.id = 'news-close'; card.appendChild(b);
  }
  function renderOnb(card) {   // 1.24 (B): the stages this wave of the first run opens (m.stages), or the run's stage (a run saved before)
    const m = curModal || {}, list = (m.stages && m.stages.length ? m.stages : [run.stage || ONB_FULL]).filter(k => ONB_STAGES[k]), s = list[list.length - 1], perWave = !!(m.stages && m.stages.length);
    card.appendChild(el('div', 'sub', (perWave ? 'Fala ' + run.wave : 'Run ' + s + ' z 4') + ' · nauka'));
    card.appendChild(el('h2', null, 'Nowe: ' + list.map(k => ONB_STAGES[k].name.toLowerCase()).join(', ')));
    const ul = el('ul', 'conseq'); list.forEach(k => ONB_STAGES[k].news.forEach(t => ul.appendChild(el('li', null, t)))); card.appendChild(ul);
    card.appendChild(el('p', 'note', s < ONB_FULL ? (perWave ? 'Od fali ' + ONB_WAVE[s + 1] + ': ' : 'Następny run doda: ') + ONB_STAGES[s + 1].name.toLowerCase() + '.' : 'To już cała gra. Kolejne runy zaczną się od niej. Wszystkie zasady znajdziesz w Jak grać na ekranie startowym.'));
    const b = btn('primary', 'Gramy', null, closeModal); b.id = 'onb-go'; card.appendChild(b);
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
    row.appendChild(el('span', 'step', holds ? (st.id === 'check' ? 'Gra czeka na Twój ruch' : 'Gra stoi') : 'Samouczek ' + (run.tut + 1) + '/' + TUT.length));
    const right = el('span'); right.style.display = 'flex'; right.style.alignItems = 'center'; right.style.whiteSpace = 'nowrap';
    const end = el('button', 'skip', 'Zakończ'); end.type = 'button';
    end.addEventListener('click', () => { tutLogOf().ended = 'quit@' + (st.id || run.tut); tutEnd(); });
    if (run.tut < TUT.length - 1) right.appendChild(end);
    if (st.skip) { const sk = el('button', 'skip', 'Pomiń krok'); sk.type = 'button'; sk.style.marginLeft = '12px'; sk.addEventListener('click', () => { tutLogOf().skipped.push(st.id || run.tut); tutAdvance(); }); right.appendChild(sk); }
    if (st.ack) { const ok = el('button', 'next', 'Rozumiem'); ok.type = 'button'; ok.style.marginLeft = '12px'; ok.addEventListener('click', () => { st.acked = true; tutClearHl(); letGo(); box.hidden = true; coachSync(); }); right.appendChild(ok); }
    if (st.next) { const nx = el('button', 'next', run.tut === TUT.length - 1 ? 'Gramy!' : 'Dalej'); nx.type = 'button'; nx.style.marginLeft = '12px'; nx.addEventListener('click', () => { if (st.pause) setPaused(false, true); if (run.tut === TUT.length - 1) tutLogOf().ended = 'done'; tutAdvance(); }); right.appendChild(nx); }
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
  const yatd = { get MUS() { return MUS; }, get WA() { return WA; }, wallCovers, memOf, needsCheck, timeScale, get CHECK_SLOW() { return CHECK_SLOW; }, musicWant, camCentre, TRAY, get cwch() { return [cw, ch, cv.width, cv.height]; }, w2s: (x, y, z) => { const p = W2S(x, y, z || 0); return [p[0] + OX, p[1] + OY]; }, get OXY() { return [OX, OY, FW, FH]; }, get UIZ() { return UIZ; }, get uiRects() { return uiRects; }, fitScale: () => fitScale(), buildScale: () => buildScale(), applyLayout,   /* 1.25 */ suggestBuys, previewState, pvTake, flashSuggest, isOpenT,   /* 1.25.1 */   /* 1.24 (B): w2s on the canvas (the tests add the canvas' corner) */ centerOn, trayIsOpen, get VIEW() { return VIEW; }, wallH, tapWorld, tutPop, get tutPopNow() { return tutPopNow; }, get paused() { return paused; }, get TC() { return TC; }, get PERF() { return PERF; }, perfSummary, frame, quietWhy, autoFFOn: () => autoFFOn(), standOk: (h, x, y) => standOk(h, x, y), talkGroup: h => talkGroup(h), startPrep: r => startPrep(r), pickTab: (id, t) => pickTab(id, t), makeHero: (t, l, n) => makeHero(t, l, n, new Set()), QUIET, get SPLIT() { return SPLIT; }, splitViews, heroScreen, toWorld, lootCount, walkable, passable, blockerOk, rebuildDungeon, BUILDINGS, get realNow() { return realNow; }, crystalCost, buyCrystal, payChain, chainTick, essIn, comboLive, becomeImpatient: () => becomeImpatient(), partyThink: dt => partyThink(dt), hungerNeed, feedHeart, typeMult, phobiaMult, collectReturners, damage, addFear, shopBuy, shopReroll, toStash, fromStash, sellStash, shopRefresh, stashCap, priceOf, rerollCost, greedBonusParts,
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
  };
  // 1.24 (C): a test reaching into the game through its hooks wakes the paced loop (as a tap does), so what it changed is drawn
  window.__yatd = new Proxy(yatd, { get(t, k) { if (k !== 'FP') { FP.input = FP.touch = performance.now(); kick(); } return t[k]; } });   // (reading FP itself wakes nothing: the tests watch the pacing through it)
})();
</script>
