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
        b.addEventListener('pointermove', e => { if (tipTimer && Math.hypot(e.clientX - tipAt[0], e.clientY - tipAt[1]) > 10) { clearTimeout(tipTimer); tipTimer = 0; } });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => { if (tipTimer || tipFor) hideTip(); }));
        b.addEventListener('contextmenu', e => e.preventDefault());
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
          } else if (selected && (UI.holdTips || 0) < 3) { UI.holdTips = (UI.holdTips || 0) + 1; saveUI(); setHint('Przytrzymaj kafelek w pasku, żeby przeczytać, co robi.'); }
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
          if (b.classList.contains('off')) { nope(b, s.label + ': od ' + subStage(s) + '. runu'); return; }   // 1.15.1: not in this stage yet
          if (trayTab) trayScroll[trayTab] = tray.scrollLeft;
          subOf[cur.id] = s.id; try { localStorage.setItem('yatd-sub', JSON.stringify(subOf)); } catch (e) {}
          updateTray();
        });
        sb.appendChild(b);
      });
    }
    if (cs) sb.querySelectorAll('.sub').forEach(b => { const s = cur.subs.find(q => q.id === b.dataset.sub), on = subsOn(cur).includes(s); b.hidden = false; b.classList.toggle('off', !on); b.setAttribute('aria-disabled', String(!on)); b.title = on ? '' : s.label + ': od ' + subStage(s) + '. runu nauki'; b.setAttribute('aria-pressed', String(b.dataset.sub === cs.id)); });
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
    if (trayTab !== view) { trayTab = view; tray.scrollLeft = trayScroll[view] || 0; tray.classList.remove('deal'); void tray.offsetWidth; tray.classList.add('deal'); clearTimeout(updateTray.dealT); updateTray.dealT = setTimeout(() => tray.classList.remove('deal'), 700); }   // 1.09: a new tab deals its tiles in
    trayFade();
    if (fl && fl.phase === 'build') updateAction();
  }
  // Prototype 1.0: what a tile does shows while you hold it (the description no longer sits under the map for good)
  let tipTimer = 0, tipFor = null, tipEat = false, tipAt = [0, 0];
  function showTip(t, b) {
    const box = $('#tip'), I = ITEMS[t]; box.innerHTML = '';
    const h = el('div', 'th'); h.appendChild(el('b', null, I.name)); if (!MODES[t]) h.appendChild(el('span', null, costOf(t) + ' Esencji')); box.appendChild(h);
    if (I.tag) box.appendChild(el('div', 'tg', I.tag));
    box.appendChild(el('p', null, I.desc));
    if (LOOT_KIND[t]) { const n = lootCount(t); box.appendChild(el('div', 'tg', 'Każdy kolejny taki łup w lochu: +25% ceny' + (n ? ' (leży już: ' + n + ', bazowo ' + I.cost + ')' : '') + '.')); }
    if (run && KINDS[t] && run.unlocked.has(t) && !isOpenT(t)) box.appendChild(el('div', 'tw', 'Zablokowana: najpierw odblokuj ' + KIND_INFO[KINDS[t]].items.map(x => ITEMS[x].name).join(' albo ') + ' (kartą ze sklepu).'));
    else if (run && !MODES[t] && !run.unlocked.has(t)) box.appendChild(el('div', 'tw', 'Zablokowany: odblokujesz go kartą ze sklepu (na stałe, także w kolejnych runach).'));
    box.hidden = false; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    box.style.bottom = Math.round(innerHeight - $('#drawer').getBoundingClientRect().top + 6) + 'px';
    tipFor = t; b.classList.add('holding');
    buzz(12);
  }
  function hideTip() {
    clearTimeout(tipTimer); tipTimer = 0;
    if (tipFor) { const b = $('#item-' + tipFor); if (b) b.classList.remove('holding'); tipFor = null; }
    $('#tip').hidden = true;
  }
  // The deck tab: one tile per slot, filled or empty. Rebuilt only when the deck changes.
  function renderDeckTiles(show) {
    const tray = $('#tray'), k = show ? run.deck.join(',') + '|' + run.deckSize + '|' + JSON.stringify(run.stacks || {}) + '|' + (run.stash || []).join(',') + '|' + (run.freePicks || 0) + '|' + (fl ? fl.phase : '') : '';
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
      b.type = 'button'; b.className = 'item dslot ' + (u ? 'rar-' + u.rar : 'empty');
      if (u) {
        b.innerHTML = '<span class="dtag"></span><span class="dnm"></span>';
        b.querySelector('.dtag').textContent = u.grows ? 'rośnie: ' + (run.stacks[u.id] || 0) : u.tag; b.querySelector('.dnm').textContent = u.name;
        b.setAttribute('aria-label', u.name + ', ' + RAR_NAME[u.rar] + ' karta. ' + u.text);
        b.addEventListener('click', () => { if (!modalOpen && run) { if (fl && fl.phase === 'raid' && !paused) setPaused(true); openModal({ type: 'card', idx: i }); } });
      } else { b.innerHTML = '<span class="dnm">wolne miejsce</span>'; b.disabled = true; }
      tray.appendChild(b);
    }
    if (!raidNow) for (let i = 0; i < stashCap(); i++) {   // the stash: inactive cards waiting for their turn (hidden during a wave)
      const u = UPG[(run.stash || [])[i]], b = document.createElement('button');
      b.type = 'button'; b.className = 'item dslot stash ' + (u ? 'rar-' + u.rar : 'empty');
      b.innerHTML = '<span class="dtag"></span><span class="dnm"></span>';
      b.querySelector('.dtag').textContent = 'schowek'; b.querySelector('.dnm').textContent = u ? u.name : 'pusto';
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
      actLabel(b, 'Fala trwa', 'przytrzymaj mapę: szybciej');
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
    setText('h-best', raidNow ? 'Esencja · fala +' + fmtE(fl.score) : 'Esencja');
    { const rk = rankOf(tot); setText('h-rank', raidNow ? '' : rk.next ? rk.name + ' · ' + rk.next[1] + ' za ' + Math.ceil(Math.max(0, rk.next[0] - tot)) : 'ranga: ' + rk.name); }   // the run's harvest gives the rank (hidden in a wave: the formula needs the room)
    // Prototype 1.01: the heart takes its share of THIS wave's Esencja first. In a wave the bar fills as it eats; between waves
    // the row says how much the next wave has to bring.
    { const need = hungerNeed(run.wave), inW = fl.phase === 'raid' || fl.phase === 'summary', fed = inW ? Math.min(fl.fed || 0, need) : 0, ok = !!need && fed >= need - 0.001;
      const row = $('#h-hrow'), k = (need ? 1 : 0) + '|' + (ok ? 1 : 0) + '|' + Math.floor(fed) + '|' + need + '|' + (inW ? 1 : 0);
      if (hudCache.hunger !== k) {
        hudCache.hunger = k;
        row.classList.toggle('off', !need); row.classList.toggle('fed', ok); row.classList.toggle('hungry', !!need && !ok && inW);
        $('#h-hfill').style.width = (need ? Math.min(1, fed / need) * 100 : 0).toFixed(1) + '%';
        $('#h-hlabel').textContent = !need ? 'serce głodne od fali 2' : ok ? 'serce syte' : inW ? 'serce ' + Math.floor(fed) + '/' + need : 'serce chce ' + need + ' z fali';
      }
    }
    const out = fl.party && fl.party.carrierId >= 0 && fl.phase === 'raid' ? 1 : 0;
    setText('h-cry', '◆'.repeat(Math.max(0, run.crystals - out)) + (out ? '◈' : '') + '◇'.repeat(Math.max(0, run.maxCrystals - run.crystals)));
    { const c = 2 * run.crystals - out; if (SC.cry != null && c < SC.cry && fl.phase !== 'build') crystalAlarm(); SC.cry = c; }   // stolen or eaten: the crystals shake, the map flashes red
    setText('h-time', fl.phase === 'build' ? 'budowa' : fl.phase === 'raid' ? (paused ? 'pauza' : fl.fearless ? (fl.storm ? 'szturm!' : 'odwrót') : mmss(Math.max(0, S.waveTime - (fl.patT || 0)))) : 'koniec');
    const bar = $('#h-bar'); bar.style.width = (fl.phase === 'raid' ? Math.min(1, (fl.patT || 0) / S.waveTime) * 100 : 0).toFixed(1) + '%'; bar.classList.toggle('ok', false);
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
    const eqE = C ? '+' + fmtE(gNow * C.greed * C.cm * mods.regen) : PY ? '+' + fmtE(PY.e) : '+0';
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
    box.style.top = ''; box.style.bottom = '';
    if (fr && fr.height) box.style.bottom = Math.round(innerHeight - fr.top + 8) + 'px';
    else if (modalOpen) box.style.top = 'max(12px, var(--safe-top))';
    else {   // 1.04: under the coach when it sits at the top of the map
      const co = $('#coach'), cr = !co.hidden && co.classList.contains('top') ? co.getBoundingClientRect() : null;
      box.style.top = Math.round(cr ? cr.bottom + 8 : stage.getBoundingClientRect().top + 8) + 'px';
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
    TRAY.t = reduceMotion ? 1 : Math.min(1, TRAY.t + rdt / VIEW.dur);
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
    modalOpen = true; modalKind = m.type; curModal = m; ff = false; updateAction(); hideToast(); hideTip();
    const card = $('#card'); card.innerHTML = ''; const scr = m.type === 'shop' || m.type === 'wave' || m.type === 'end', top = m.type === 'breach'; card.className = 'card enter' + (scr ? ' screen' : '') + (top ? ' topsheet' : '');
    card.scrollTop = 0; $('#overlay').classList.toggle('screenbg', scr); $('#overlay').classList.toggle('top', top);   // 1.01: the breach sheet sits at the top, the map stays in view
    clearTimeout(openModal.t); openModal.t = setTimeout(() => card.classList.remove('enter'), 900);   // the entrance plays once, not on every tap inside
    ({ start: renderStart, menu: renderMenu, settings: renderSettings, tests: renderTests, upgrade: renderUpgrade, wave: renderWave, over: renderOver, end: renderEnd, survey: renderSurvey, victory: renderVictory, card: renderCard, item: renderItem, breach: renderBreach, hungerTip: renderHungerTip, onb: renderOnb, news: renderNews, shop: renderShop, hero: renderHero, esencja: renderEsencja })[m.type](card, m);
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
      const doc = { version: LOG_VERSION, device: deviceId, runId: run ? run.id : null, at: new Date().toISOString(), player: (playerName || '').slice(0, 40), answers: Object.assign({}, m.ans), text: (m.text || '').slice(0, 1000),
        run: run ? { result: run.result || 'active', waves: run.waves.length, total: Math.round(run.total), tutorial: run.tutorial, minutes: Math.round((Date.now() - run.startedAt) / 60000) } : null };
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
    try { const p = f.call(d, { navigationUI: 'hide' }); if (p && p.then) p.then(() => { try { screen.orientation.lock('portrait').catch(() => {}); } catch (e) {} }, () => {}); } catch (e) {}
  }
  function leaveFullscreen() { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f && isFull()) try { f.call(document); } catch (e) {} }
  let installEvt = null;
  const restart = () => { if (modalKind === 'start') { const c = $('#card'); c.innerHTML = ''; renderStart(c); } };   // the start card again, in place
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; restart(); });
  window.addEventListener('appinstalled', () => { installEvt = null; });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#start-tut, #start-play, #start-continue')) goFullscreen(); }, true);
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
  function renderStart(card) {
    card.appendChild(el('div', 'sub', 'Prototype 1.16 · 10 fal i finał'));
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
    if (onb <= 4) {
      const first = onb === 1 && !coachDone();
      const a = btn((sv ? '' : 'primary ') + 'big', first ? 'Samouczek' : 'Nowy run', (first ? 'Pierwszy run z przewodnikiem' : 'Run ' + onb + ' z 4: ' + ONB_STAGES[onb].name.toLowerCase()) + lost, () => { closeModal(); userStarted = true; drop(); startGuided(); }); a.id = 'start-tut';
      const b = btn('big', 'Pomiń samouczek', 'Cała gra od razu' + lost, () => { closeModal(); userStarted = true; setOnb(5); newRun(false); }); b.id = 'start-play';
      box.appendChild(a); box.appendChild(b);
    } else {
      const b = btn((sv ? '' : 'primary ') + 'big', 'Nowy run', sv ? 'zapisany run przepadnie' : 'Pełna gra', () => { closeModal(); userStarted = true; newRun(false); }); b.id = 'start-play';
      const a = btn('big', 'Samouczek', 'Nauka od nowa: 4 runy, pierwszy z przewodnikiem' + lost, () => { closeModal(); userStarted = true; setOnb(1); try { localStorage.removeItem(COACH_KEY); localStorage.removeItem(POPS_KEY); } catch (e) {} startGuided(); }); a.id = 'start-tut';
      box.appendChild(b); box.appendChild(a);
    }
    card.appendChild(box);
    webStartRow(card);
    const how = el('details'); how.id = 'start-how'; how.appendChild(el('summary', null, 'Jak grać'));
    const ul = el('ul', 'conseq');
    ['Pierwsze 4 runy odsłaniają grę po kawałku: run 1 to rany (pułapki i potwory), łup, kopanie, sklep i serce, run 2 dokłada straszenie, run 3 gildię, budowle i typy pokoi, run 4 ciała, fobie, powracających, łowców i wyłom. Pomiń samouczek otwiera wszystko od razu.',
     'Między falami budujesz z paska na dole. Zakładki: Pułapki (te, które ranią, i te, które straszą), Potwory, Łup, Obiekty (skrzynia i budowle-kontry), Loch (nowe pokoje, przejścia, rozbudowa i typy pokoi), Talia. Każdy pokój mieści kilka elementów (licznik w rogu pokoju). Z rozwiniętym paskiem widzisz loch z wysoka (wysoka izometria), zwinięty pasek (▼ Budowa) pokazuje go tak jak w fali (izometria 2:1). W fali pasek sam się chowa, a rozwinięcie go (▲ Budowa) zatrzymuje grę: budujesz w spokoju, a ▼ Budowa gra dalej. Przycisku pauzy nie ma.',
     'Ściany od strony kamery są ścięte do podłogi, więc nic się za nimi nie chowa. Pułapka ścienna na takiej ścianie stoi przy niej jak tabliczka.',
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
    const nw = el('details'); nw.id = 'start-new'; nw.appendChild(el('summary', null, 'Co nowego w Prototype 1.16'));
    const ul2 = el('ul', 'conseq');
    ['1.16: bohaterowie mogą się rozdzielić celowo. Na naradzie przy rozwidleniu złodziej (a gdy go nie ma, czasem ktoś odważny) idzie na zwiad, w drużynie 4+ czasem z kimś do pary ("Idę z tobą"). Przy wejściu do nowego pokoju złodziej może powiedzieć "Zaczekajcie tu, sprawdzę, co dalej" i pójść przodem, a drużyna czeka na niego do 8 s (to działa także w lochu bez rozwidleń). Zwiadowca, który zobaczy jedno przejście, idzie do następnego po swojej stronie, dopóki ma czas. Na postoju zdrowy złodziej może iść się rozejrzeć, a nowicjusz, który rusza sam "sprawdzić tamte drzwi", też jest na zwiadzie. Taki bohater ma turkusowy pierścień i znaczek ›, a w karcie bohatera "na zwiadzie".',
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
    const pool = UPGRADES.filter(u => u.kind !== 'unlock' && reqOk(u) && (ONB_CARD[u.id] || 1) <= stageOf() && !(u.unique && has(u.id)) && rarOk(u));
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
  const rerollCost = () => run.shop && run.shop.rerolls < (mods.freeReroll || 0) ? 0 : 3 + (run.shop ? run.shop.rerolls - (mods.freeReroll || 0) : 0);
  function shopRoll() {
    const owed = run.shopOwed || 1, ids = upgradePicks(owed).map(u => u.id);
    const more = upgradePicks(1).map(u => u.id).filter(id => !ids.includes(id));
    if (more.length) ids.push(more[0]);
    return ids.filter(id => !(UPG[id].unique && (run.stash || []).includes(id))).slice(0, 4);
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
    const toStash = u.kind === 'card' && run.deck.length >= run.deckSize;
    if (toStash && run.stash.length >= stashCap()) return 'full';
    if (free) run.freePicks--; else fl.essence -= price;
    run.shop.ids[i] = null;
    if (toStash) { run.stash.push(id); run.upgrades.push(id); } else applyUpgrade(u);
    run.essence = fl.essence; recomputeMods(); updateTray(); saveRunSoon();
    return toStash ? 'stash' : 'ok';
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
    run.stash.splice(i, 1); (run.sold = run.sold || []).push(u.id); const g = sellOf(u); addEss(g); return g;
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
    armor: '<path d="M6 3l3 1.5h6L18 3l4 4-3 3v11H5V10L2 7z"/>'
  };
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
    const nm = el('b', null, e.nm[0]); nm.style.color = T.color; l1.appendChild(nm);
    l1.appendChild(el('small', null, ' ' + T.name[fem ? 1 : 0] + ' ' + e.lvl));
    if (e.boss) l1.appendChild(el('i', 'tg boss', e.boss === 'final' ? 'przepowiednia' : 'czempion'));
    if (e.trait) l1.appendChild(el('i', 'tg', HERO_TRAITS[e.trait].name[fem ? 1 : 0]));
    if (e.hunter) { const b = el('i', 'tg bag'); b.innerHTML = classIconSvg('bag', '#f2b94b', 'gi'); b.title = 'łowca skarbów'; l1.appendChild(b); }
    if (e.returning) { const b = el('i', 'tg back', '↺'); b.title = 'wraca z blizną'; l1.appendChild(b); }
    if (e.recruit) l1.appendChild(el('i', 'tg', 'rekrut'));
    r.appendChild(l1);
    const kit = el('div', 'kit');
    if (!e.inv.length) kit.appendChild(el('small', null, 'bez sprzętu'));
    e.inv.forEach(it => { const s = el('span'); s.innerHTML = svgI(ITEM_GLYPH[it.type] || '', ITEM_COLOR[it.type] || '#ccc') + (it.charges > 1 ? '<small>' + it.charges + '</small>' : ''); s.title = itemLabel(it); kit.appendChild(s); });
    r.appendChild(kit);
    // second line, under the name and the gear: what the class does, its weak spots and what the tavern does not know
    const l2 = el('div', 'np2'); l2.appendChild(document.createTextNode(CLASS_SKILL[e.type] || ''));
    const wk = weakOf(e, kn.has('phys') || all);
    if (wk.length) l2.appendChild(el('span', 'bad', ' · słaby: ' + wk.slice(0, 2).join(', ')));
    const ph = e.phobia && (kn.has('phobia') || all) ? PHOBIAS[e.phobia].name : null;
    if (ph) l2.appendChild(el('span', 'bad', ' · boi się: ' + ph));
    const unk = [!(kn.has('phys') || all) ? 'ciało' : '', !(kn.has('phobia') || all) ? 'fobia' : ''].filter(Boolean);
    if (unk.length) l2.appendChild(el('span', 'unk', ' · ? ' + unk.join('/')));
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
      // the reckoning (1.01-1.04 had a screen of its own): Groza x the multipliers = Esencja, the heart's share, what is yours
      const rk = el('div', 'reck' + (ate ? ' ate' : ''));
      const part = (cls, html) => { const sp = el('span', cls); sp.innerHTML = html; rk.appendChild(sp); };
      part('g', 'Groza <b>' + fmtG(fl.base) + '</b> × ' + fmt2(fl.base > 0 ? fl.score / fl.base : 1) + ' = <b class="e">' + fmtE(fl.score) + '</b>');
      if (H) part('h', H.fed ? '♥ <b>−' + fmtE(H.need) + '</b>' : '♥ za mało: <b>−' + fmtE(heart) + ' · kryształ</b>');
      part('m', 'dla Ciebie <b>+' + fmtE(mine) + '</b>' + (run.lastIncome ? ' <small>(+' + run.lastIncome + ' po fali)</small>' : ''));
      body.appendChild(rk);
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
      const nb = bossOf(run.wave + 1), items = [s.swaps ? 'wymiany: ' + s.swaps : '', s.potionsGiven ? 'mikstury podane: ' + s.potionsGiven : '', s.charms ? 'talizmany: ' + s.charms : '', s.amulets ? 'amulety: ' + s.amulets : '', s.boots ? 'buty: ' + s.boots : ''].filter(Boolean);
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
    }
    fitList(list);
  }

  /* ----- the shop ----- */
  // 1.05 (a tester bought Chór potępionych without a single portrait): does the card work with what stands in the dungeon?
  const MON_T = ['goblin', 'archer', 'spider', 'ogre', 'shaman', 'ghost', 'shade', 'bats'], LOOT_T = ['loot', 'lpotion', 'loot2', 'loot3', 'lcursed'];
  const CARD_NEEDS = { spikes: ['spikes'], walls: ['arrows', 'fire', 'portrait'], powder: ['powder'], arrows: ['arrows'], gate: ['gate'], web: ['web'], fire: ['fire'], mimic: ['mimic'],
    trapdoor: ['trapdoor'], cage: ['cage'], portrait: ['portrait'], spider: ['spider'], ghost: ['ghost'], monster: MON_T, loottrap: LOOT_T, sticky: ['spikes'], wildfire: ['fire', 'powder', 'arrows'],
    choir: ['portrait'], hgallery: ['ghost'], firepit: ['trapdoor'], cageghost: ['cage'], monsterroar: MON_T, sharp: ['spikes', 'arrows', 'archer', 'goblin', 'mimic'], heavy: ['gate', 'ogre', 'trapdoor'],
    oil: ['fire', 'powder'], venom: ['spider', 'shaman', 'lcursed'], pack: MON_T, well: ['trapdoor'], golddust: ['loot'], reliquary: ['loot3'], greed: LOOT_T, nopick: LOOT_T };
  function cardFit(u) {
    const need = CARD_NEEDS[u.id]; if (!need || u.kind !== 'card' || !fl) return null;
    const have = [...fl.items.values()].some(it => need.includes(it.type));
    if (have) return { ok: true, text: ' Pasuje do Twojego lochu.' };
    return { ok: false, text: need === MON_T ? ' Brak potworów w lochu.' : need === LOOT_T ? ' Brak łupu w lochu.' : ' Brak w lochu: ' + need.map(t => ITEMS[t] ? ITEMS[t].name : t).join(', ') + '.' };
  }
  function kindShort(u) {
    if (u.kind === 'unlock') return 'odblokowanie';
    if (u.kind === 'instant') return RAR_NAME[u.rar] + ' · od razu';
    const n = run.deck.filter(x => x === u.id).length;
    return RAR_NAME[u.rar] + (u.unique ? ' · jedna' : '') + (n ? ' · w talii ' + n : '');
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
      if (fit) tx.appendChild(el('i', 'fit ' + (fit.ok ? 'good' : 'bad'), fit.text));
      b.appendChild(tx);
      const by = el('button', 'buy', free ? 'Weź za darmo' : poor ? 'Za mało (' + price + ')' : 'Kup za ' + price + ' Esencji'); by.type = 'button'; by.id = 'offer-buy-' + i; by.disabled = poor;
      by.setAttribute('aria-label', (free ? 'Weź za darmo: ' : 'Kup za ' + price + ' Esencji: ') + u.name);
      by.addEventListener('click', () => {
        const r = shopBuy(i);
        if (r === 'ess') m.msg = 'Za mało Esencji (' + price + ').';
        else if (r === 'full') m.msg = 'Talia i schowek są pełne: sprzedaj albo odłóż kartę.';
        else { m.sel = null; run.shopTipDone = true; m.msg = r === 'stash' ? u.name + ': do schowka (talia pełna).' : u.kind === 'unlock' ? u.name + ': odblokowane na stałe.' : u.kind === 'instant' ? u.name + '.' : 'W talii: ' + u.name + '.'; }
        rerender();
      });
      b.appendChild(by); og.appendChild(b);
    });
    // a card from the deck or the stash opens over the offers: the rest of the screen does not move
    if (sel) {
      const arr = sel.k === 'd' ? run.deck : run.stash, u = UPG[arr[sel.i]];
      if (u) {
        const sh = el('div', 'sheet rar-' + u.rar); sh.id = 'shop-sheet';
        sh.appendChild(el('div', 'dk', (sel.k === 'd' ? 'w talii · ' : 'w schowku (nie działa) · ') + RAR_NAME[u.rar]));
        sh.appendChild(el('b', null, u.name)); sh.appendChild(el('div', 'tx', u.text));
        const da = el('div', 'da');
        const mini = (id, txt, fn, cls, off) => { const b = el('button', 'mini' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; if (id) b.id = id; b.disabled = !!off; b.addEventListener('click', fn); da.appendChild(b); return b; };
        if (sel.k === 'd') mini('deck-stash', 'Do schowka', () => { if (toStash(sel.i)) { m.sel = null; m.msg = u.name + ': do schowka.'; } rerender(); }, '', run.stash.length >= stashCap());
        else mini('stash-deck', 'Do talii', () => { if (fromStash(sel.i)) { m.sel = null; m.msg = u.name + ': z powrotem w talii.'; } rerender(); }, '', run.deck.length >= run.deckSize);
        const sb = mini('card-sell', 'Sprzedaj +' + sellOf(u), () => {
          if (!sb.dataset.sure) { sb.dataset.sure = '1'; sb.textContent = 'Na pewno? +' + sellOf(u); sb.classList.add('warn'); return; }
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
      const b = el('button', 'slot' + (k === 's' ? ' st' : '') + (u ? ' rar-' + u.rar : ' empty') + (sel && sel.k === k && sel.i === i ? ' sel' : ''), u ? u.name : empty); b.type = 'button';
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
  function buyCrystal() {
    const c = crystalCost();
    if (!fl || fl.phase !== 'build' || run.crystals >= run.maxCrystals || fl.essence < c) return false;
    fl.essence -= c; run.essence = fl.essence; run.crystals++; run.crystalsBought = (run.crystalsBought || 0) + 1;
    tl('cb', c); updateTray(); saveRunSoon(); return true;
  }
  function addEss(n) { fl.essence += n; run.essence = fl.essence; updateTray(); }
  function applyUpgrade(u) {
    if (u.kind === 'unlock') { run.unlocked.add(u.unlock); saveFound(u.unlock); }   // 1.14: for good, in later runs too
    else if (u.kind === 'instant') u.apply();
    else { run.deck.push(u.id); recomputeMods(); }
    run.upgrades.push(u.id); updateTray();
  }
  function sellCard(i) {
    const id = run.deck[i], u = UPG[id]; if (!u) return 0;
    run.deck.splice(i, 1); (run.sold = run.sold || []).push(id);
    const g = sellOf(u); addEss(g); recomputeMods();
    return g;
  }
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? few : many;
  const slotsTxt = n => n + ' ' + plural(n, 'miejsce', 'miejsca', 'miejsc');
  const capFirst = t => t.charAt(0).toUpperCase() + t.slice(1);
  function kindLabel(u) {
    if (u.kind === 'unlock') return 'Odblokowanie na stałe · bez miejsca w talii';
    if (u.kind === 'instant') return capFirst(RAR_NAME[u.rar]) + ' · jednorazowa, bez miejsca w talii';
    const n = run.deck.filter(x => x === u.id).length;
    return capFirst(RAR_NAME[u.rar]) + ' karta' + (u.unique ? ' · tylko jedna' : '') + (n ? ' · w talii: ' + n : '');
  }
  function cardBtn(u, onClick, extra) {
    const b = el('button', 'btn cardpick rar-' + u.rar + (u.kind === 'unlock' ? ' unlock' : '')); b.type = 'button';
    b.appendChild(el('span', 'ck', kindLabel(u)));
    b.appendChild(el('b', null, u.name)); b.appendChild(el('span', null, u.text));
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
    card.appendChild(el('p', 'note', 'Talia: ' + run.deck.length + ' z ' + run.deckSize + '. Karty działają, dopóki są w talii. Kopie tej samej karty się sumują.'));
    const box = el('div'); renderPickSection(box, card, m); card.appendChild(box);
    card.appendChild(el('p', 'note', 'Kartę dostajesz za każdą przetrwaną falę. Im dalsza fala, tym częściej trafiają się rzadkie i legendarne.'));
  }
  function finishPick(m) { closeModal(); if (m && m.onDone) m.onDone(); }
  function takeCard(card, m, u) {
    if (u.kind === 'card' && run.deck.length >= run.deckSize) { card.innerHTML = ''; card.scrollTop = 0; renderReplace(card, m, u); return; }
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
      const c = UPG[id];
      box.appendChild(cardBtn(c, () => {
        const got = sellCard(i);
        run.deck.splice(i, 0, u.id); run.upgrades.push(u.id); recomputeMods();
        finishPick(m); setHint('Sprzedane: ' + c.name + ' (+' + got + ' Esencji). Nowa karta: ' + u.name + '.');
      }, 'Sprzedaj za ' + RAR_SELL[c.rar] + ' Esencji'));
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
      const s = it.lf === undefined ? 'Nowy: jeszcze nie walczył.' : it.lf === 0 ? 'Ostatnia fala: nie odpalił ani razu.' :
        'Ostatnia fala: ' + it.lf + '× odpalony, ' + it.lh + ' trafień, ' + it.lp + ' Esencji' + (it.lk ? ', zabici: ' + it.lk : '') + '.';
      card.appendChild(el('p', 'lead', s));
    }
    if (loot && it.dropped) card.appendChild(el('p', 'lead', it.gold ? 'Sakwa poległego bohatera: ' + it.gold + (it.gold === 1 ? ' moneta.' : ' monet.') : it.item ? 'Zostawił to bohater: ' + itemLabel(it.item) + '. Następni mogą to podnieść.' : 'Zostawił to bohater.'));
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
    card.appendChild(el('div', 'sub', T.name[fem ? 1 : 0] + ' · poz. ' + e.lvl + ' ' + (e.boss ? BOSS_NAME[e.boss][fem ? 1 : 0] : R.name[fem ? 1 : 0]).toLowerCase() + [e.returning ? ' · powracający' : '', e.hunter ? ' · łowca skarbów' : '', e.recruit ? ' · rekrut' : ''].join('')));
    const hh = el('h2', null, e.nm[0]); hh.style.color = T.color; card.appendChild(hh);
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
        [live.fleeing ? 'UCIEKA' : '', live.crystal ? 'NIESIE KRYSZTAŁ' : '', caged(live) ? 'w klatce' : '', live.lost ? 'zgubiony' : live.split ? 'na zwiadzie' : live.alone ? 'sam' : '', fl.time < live.burnUntil ? 'płonie' : '', live.cursed ? 'przeklęty' : '', fl.time < live.shakenUntil ? 'wstrząśnięty śmiercią' : '', STATE_TEXT[live.state] || ''].filter(Boolean).join(', ');
      add('Teraz: ' + st + '.');
    }
    add('Charakter: ' + (e.trait ? HERO_TRAITS[e.trait].name[fem ? 1 : 0] + ' (' + TRAIT_TEXT[e.trait] + ')' : 'zwyczajny') + '.');
    add('Umie: ' + CLASS_SKILL[e.type] + '.');
    add('Klasa: ' + CLASS_RES_TEXT[e.type] + '.');
    if (e.hunter) add('Łowca skarbów: idzie po łup, nawet gdy to groźne (znak sakiewki).');
    add('Ciało: ' + (e.phys && (known.has('phys') || all) ? PHYS[e.phys].name[fem ? 1 : 0] + ' (' + PHYS[e.phys].text + ')' : 'nie wiadomo') + '.');
    add('Fobia: ' + (e.phobia && (known.has('phobia') || all) ? PHOBIAS[e.phobia].name + ' (straszy 2 razy mocniej)' : 'nie wiadomo') + '.');
    if (e.scar) add('Blizna: ' + e.scar + (e.times > 1 ? ' (wraca już ' + e.times + '. raz)' : '') + '.');
    if (live && live.trauma && Object.keys(live.trauma).length) add('Trauma w tej fali: ' + Object.keys(live.trauma).map(k => DMG_TYPES[k]).join(', ') + ' (straszy 1,5 raza mocniej).');
    card.appendChild(ul);
    card.appendChild(el('h2', 'h2small', 'Ekwipunek'));
    const inv = live ? live.inv : e.inv, il = el('ul', 'conseq');
    if (!inv.length) il.appendChild(el('li', null, 'Nic przy sobie.'));
    inv.forEach(it => { const H = HITEMS[it.type]; const cd = live && fl.time < (it.cdUntil || 0) ? ', odnowienie ' + Math.ceil(it.cdUntil - fl.time) + ' s' : ''; il.appendChild(el('li', null, capFirst(adj(H.g, it.r) + ' ' + H.name) + ' (moc ' + it.r + (it.charges != null ? ', użycia: ' + it.charges : '') + cd + ')')); });
    if (live && live.gold) il.appendChild(el('li', null, 'Sakwa: ' + live.gold + ' monet (spowalnia).'));
    card.appendChild(il);
    if (live && !live.queued) {
      const db = Object.entries(live.dmgBy || {}).filter(x => x[1] >= 1).map(x => DMG_TYPES[x[0]] + ' ' + Math.round(x[1])).join(', ');
      const fb = Object.entries(live.fearBy || {}).filter(x => x[1] >= 1).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => fearSrcName(x[0]) + ' ' + Math.round(x[1])).join(', ');
      if (db || fb) { const dl = el('ul', 'conseq'); if (db) dl.appendChild(el('li', null, 'Rany w tej fali: ' + db + '.')); if (fb) dl.appendChild(el('li', null, 'Strach w tej fali: ' + fb + '.')); card.appendChild(el('h2', 'h2small', 'Ta fala')); card.appendChild(dl); }
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
    const n = run.deck.filter(x => x === id).length;
    card.appendChild(el('div', 'sub', capFirst(RAR_NAME[u.rar]) + ' karta · talia ' + run.deck.length + ' z ' + run.deckSize));
    const h = el('h2', null, u.name); h.style.color = RAR_COLOR[u.rar]; card.appendChild(h);
    card.appendChild(el('p', null, u.text));
    if (n > 1) card.appendChild(el('p', 'note', 'Masz ' + n + ' kopie tej karty, działają razem.'));
    if (u.grows) card.appendChild(el('p', 'note', 'Zebrane w tym runie: ' + (run.stacks[u.id] || 0) + '. Sprzedaż ostatniej kopii zeruje licznik.'));
    const row = el('div', 'row');
    if (fl && fl.phase === 'build') {
      const tb = btn('', 'Do schowka', run.stash && run.stash.length >= stashCap() ? 'schowek pełny' : 'nie działa, czeka', () => { if (toStash(m.idx)) { closeModal(); setHint(u.name + ': w schowku.'); } });
      if ((run.stash || []).length >= stashCap()) tb.disabled = true; row.appendChild(tb);
      const sb = btn('', 'Sprzedaj', '+' + sellOf(u) + ' Esencji, karta przestaje działać', () => {
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
          run.continueUsed = true; run.crystals = 1; run.maxCrystals = Math.max(run.maxCrystals, 1);
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
      const prim = o => { const c = {}; for (const k in o) { const v = o[k]; if (v === null || typeof v !== 'object' && typeof v !== 'function') c[k] = v; } if (o.item) c.item = Object.assign({}, o.item); return c; };   // loot left by a hero keeps its exact item
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
    // v14 fields for a run saved by v13: returning heroes, the stash, the shop; cards removed in v14 (Labirynt) drop out of the deck
    if (!run.returners) run.returners = [];
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
    mods = freshMods(); run.deck.forEach(id => { const u = UPG[id]; if (u && u.apply) u.apply(mods); });
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
  const LOG_VERSION = 58;   // 58: Prototype 1.13 (1.13.1 the same fields: solo lines when alone; 1.13.2 adds stats.swapWay: idle heroes who swapped places to let one pass; 1.13.3 the same fields: a shorter scene before a deadly room; 1.14 adds found (runs file): what the run started with from earlier discoveries; 1.15 adds layout cell [9]: the room's komnata (KIND_INFO id or null); 1.13.4 adds stats.disarmQuit: a thief who gave up a trap after it went off in his face twice, and stats.restBy: a retreating hero who sat down next to a friend resting in his way): conversations (stats.convos = exchanges started, stats.convoNo = why one did not start: breath, talk, queue, luck, hush, alone, fit), talks only for the ones standing together (h.talkUntil), alone a hero talks to himself (SOLO) or keeps quiet, nobody stands still in a trap (stats.toSafety); the check at the top of the map; talks, rests, the stop before a room, a hero down a trapdoor and everyone caged are quiet
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
  function runSummary() {
    return { version: LOG_VERSION, runId: run.id, startedAt: new Date(run.startedAt).toISOString(), at: new Date().toISOString(),
      player: (playerName || '').slice(0, 40), device: deviceId, web: WEB ? 1 : 0, tutorial: run.tutorial, stage: run.stage || ONB_FULL, guided: !!run.guided, status: run.result || 'active', won: run.won, waves: run.waves.length,
      total: Math.round(run.total), best: loadBest(), resumed: run.resumed || 0, stacks: Object.assign({}, run.stacks), crystals: run.crystals, continueUsed: run.continueUsed,
      upgrades: run.upgrades.slice(), deck: run.deck.slice(), deckSize: run.deckSize, found: (run.foundAtStart || []).slice(), sold: (run.sold || []).slice(), fires: run.fires, durationSec: Math.round((Date.now() - run.startedAt) / 1000), buildSec: Math.round(run.buildSec), raidSec: Math.round(run.raidSec),
      settings: Object.assign({}, S),
      waveMini: run.waves.map(w => ({ w: w.wave, sc: w.score, t: w.time, lost: w.crystalLost ? 1 : 0, k: w.stats.kills, s: w.stats.scared, lv: w.heroes.map(h => h.lvl), part: w.partial ? 1 : 0, fps: w.perf ? w.perf.fps : null, cpm: w.cpm, fz: w.frozen })),
      tut: run.tutorial ? Object.assign({ steps: TUT.length, now: run.tut }, run.tutLog || {}) : null };   // 1.05: how far the tutorial got
  }
  const docBytes = d => new TextEncoder().encode(JSON.stringify(d)).length;
  function logWave(partial) {
    const w = run.waves[run.waves.length - 1];
    const doc = { version: LOG_VERSION, runId: run.id, wave: run.wave, at: new Date().toISOString(), partial: !!partial, summary: w,
      heroes: fl.heroes.map(h => ({ id: h.id, name: h.nm[0], female: h.female, type: h.type, lvl: h.lvl, boss: h.boss, trait: h.trait, max: h.max, courage: h.courage,
        kit: h.entry.inv.map(i => i.type + i.r), end: h.inv.map(i => i.type + i.r), gold: h.gold || 0, cursed: h.cursed ? 1 : 0, lost: h.lost ? 1 : 0, hunter: h.hunter ? 1 : 0,
        out: h.dead ? 'dead' : h.carriedOut ? 'crystal' : h.fleeing ? 'scared' : h.fled ? 'left' : 'inside' })),
      entry: fl.spawnAt || 'ent', checkShapes: CHECK_SHAPE,
      layout: run.waveStart, timeline: fl.tl ? { ev: fl.tl.ev, smp: fl.tl.smp } : null, upgrades: run.upgrades.slice(), deck: run.deck.slice(), deckSize: run.deckSize, mods: Object.assign({}, mods) };
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
  function itemInfo(it) {
    const T = ITEMS[it.type], lvl = it.lvl || 1, back = itemBack(it);
    const last = !ACTIVE[it.type] ? '' : it.lf === undefined ? '' : it.lf === 0 ? ' Ostatnia fala: ani razu.' : ' Ostatnia fala: ' + it.lf + '× odpalony, ' + it.lh + ' trafień, ' + it.lp + ' Esencji.';
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
        if (wallType && fl.tiles[y * WW + x] === WALL && !it && canPlace(wallType, x, y, loads)) { const w = wallSpot({ x, y }); hit(x, y, W2S(w.x, w.y, w.z), T * 0.5, T * 0.5, x + y + 1.1); }
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
    if (x < 0 || y < 0 || x >= WW || y >= WH) return;
    const k = key(x, y), it = fl.items.get(k);
    if (fl.phase === 'build') {
      if (selected && !TOOLS[selected]) { const t = snapTile(selected, wx, wy); if (t) { tryPlace(selected, t[0], t[1]); return; } }
      if (fl.breach && !selected && Math.hypot(wx - (fl.breach.x + 0.5), wy - (fl.breach.y + 0.5)) <= 1.1) { openModal({ type: 'breach' }); return; }   // patch it?
      if (selected) { const t = snapTile(selected, wx, wy) || [x, y]; tryPlace(selected, t[0], t[1]); return; }
      const s = slotOf(x, y);
      setHint(s ? 'To miejsce: ' + SLOT_LABEL[s] + '. Wybierz na dole element, który tu pasuje. Stuknięcie postawionego elementu go przenosi, przytrzymanie zdejmuje.' : 'Wybierz element na dole, pasujące miejsca się podświetlą. Stuknięcie postawionego elementu go przenosi, przytrzymanie zdejmuje.');
      return;
    }
    if (fl.phase !== 'raid') return;
    if (selected && !TOOLS[selected]) { const t = snapTile(selected, wx, wy) || [x, y]; tryPlace(selected, t[0], t[1]); return; }
    // v14: no more putting traps to sleep; a tap on a hero opens his full card (the game pauses)
    const best = TAP ? heroAtScreen(TAP[0], TAP[1]) : null;   // 1.07: the figure under the finger, on the screen   // the distance to the figure, feet to head
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
    fl.items.set(key(x, y), { type, x, y, cd: fl.phase === 'raid' && TRAPS[type] && !mods.quickArm ? ARM_TIME : 0, anim: 0, disabled: false, hp, max: hp, power: mods.monster, shot: 0.5, flash: 0, preview: 1.4, gx: x + 0.5, gy: y + 0.5, lvl: 1, spent: cost });
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
  const pointers = new Map();
  let gesture = null, holdTimer = null;
  const localXY = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => {
    if (!fl || modalOpen) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    const p = localXY(e); pointers.set(e.pointerId, p);
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
    if (!pointers.has(e.pointerId)) return;
    const p = localXY(e); pointers.set(e.pointerId, p);
    if (!gesture) return;
    if (gesture.type === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      zoomAt(gesture.s0 * (Math.hypot(a.x - b.x, a.y - b.y) || 1) / gesture.d0, (a.x + b.x) / 2, (a.y + b.y) / 2);
      cam.manualUntil = realNow + 5;
    } else if (gesture.type === 'pan') {
      const dx = p.x - gesture.sx, dy = p.y - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) > 8 && !ff) { gesture.moved = true; clearTimeout(holdTimer); holdInfo = null; }
      if (gesture.moved) { cam.ox = gesture.ox - dx; cam.oy = gesture.oy - dy; clampCam(); cam.manualUntil = realNow + 4; }
    }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    clearTimeout(holdTimer); holdInfo = null;
    if (ff) { ff = false; gesture = null; tl('ff', 0); return; }
    if (!gesture) return;
    if (gesture.type === 'pinch') { if (!pointers.size) gesture = null; return; }
    if (!gesture.moved && !gesture.handled && e.type === 'pointerup') {
      const r = uiRects.list;
      if (r && gesture.sx >= r.x && gesture.sx <= r.x + r.w && gesture.sy >= r.y && gesture.sy <= r.y + r.h) {
        const row = UI.listOpen && (uiRects.rows || []).find(q => gesture.sy >= q.y0 && gesture.sy < q.y1);   // v14: a row opens the hero's card
        if (row) { const pause = fl.phase === 'raid' && !paused; if (pause) setPaused(true); openModal(Object.assign({ type: 'hero', unpause: pause }, row.ref)); gesture = null; return; }
        UI.listOpen = !UI.listOpen; saveUI(); gesture = null; return;
      }
      const w = tapWorld(gesture.sx, gesture.sy); TAP = [gesture.sx, gesture.sy]; try { handleTap(w.x, w.y); } finally { TAP = null; }
    }
    gesture = null;
  }
  cv.addEventListener('pointerup', endPointer);
  cv.addEventListener('pointercancel', endPointer);
  cv.addEventListener('wheel', e => {
    if (!fl) return;
    e.preventDefault();
    const p = localXY(e);
    zoomAt(cam.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), p.x, p.y);
    cam.manualUntil = realNow + 5;
  }, { passive: false });
  $('#btn-action').addEventListener('click', () => {
    if (!fl || modalOpen) return;
    if (fl.phase === 'build') { startWave(); return; }
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
  });
  document.addEventListener('keyup', e => { if (e.code === 'KeyF' && ff) { ff = false; tl('ff', 0); } });
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
  window.addEventListener('resize', () => { if (fl) resize(); coachSync(); });
  try { new ResizeObserver(() => { if (fl) resize(); }).observe(stage); } catch (e) {}   // the tray grows to two rows on the deck tab

  /* ================= interactive tutorial ================= */
  // A coach panel over the bottom of the map, one step at a time. Each step waits for the thing it asks for.
  let tutFlags = {}, tutT = 0, tutLast = 0, tutPausedIt = false;   // 1.15.1: the game stands because a step of the guide said so
  const countType = t => [...fl.items.values()].filter(it => it.type === t).length;
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
  const TUT = [
    { id: 'intro', text: 'To Twój loch. Bohaterowie przyjdą falami po kryształy z serca (ostatni pokój). Loch postawił za Ciebie dwie pułapki blisko serca, ale same nie wystarczą: dostawisz więcej.', next: true },
    { id: 'move', text: 'Stuknij pułapkę w kółku, żeby ją podnieść, a potem inne podświetlone pole, żeby ją przenieść (za darmo). Przytrzymanie palca zdejmuje element i oddaje Esencję.', tile: () => { const it = [...fl.items.values()].find(o => o.sys); return it ? [it.x, it.y] : null; }, prep: () => { selected = null; updateTray(); }, done: () => !!tutFlags.moved, skip: true },
    { id: 'spikes', text: 'Teraz dostaw więcej. Wybierz Kolce z paska na dole (zakładka Pułapki). Przytrzymaj kafelek, żeby zobaczyć, co robi.', hl: ['#tab-traps', '#item-spikes'], prep: () => { movingKey = null; movingObj = null; pickTab('traps', 'spikes'); updateTray(); setTrayOpen(true); }, done: () => selected === 'spikes' || countType('spikes') > (tutFlags.sp0 || 0) },
    { id: 'place', text: 'Postaw je na trasie bohaterów: stuknij pole z pulsującym kółkiem.', tile: () => tutPathTile(0.25, 'spikes'), done: () => countType('spikes') > (tutFlags.sp0 || 0) },
    { id: 'arrows', text: 'Strzały idą na ściany: wybierz Strzały i stuknij ścianę przy trasie (kółko).', hl: ['#item-arrows'], prep: () => { pickTab('traps', 'arrows'); setTrayOpen(true); }, tile: () => tutWallTile('arrows'), done: () => countType('arrows') > (tutFlags.ar0 || 0) },
    { id: 'spend', text: () => 'Masz jeszcze ' + Math.floor(fl.essence) + ' Esencji. W pierwszej fali nie oszczędzaj: dostaw kolce i strzały przy trasie. Pokój mieści kilka pułapek (licznik w rogu).', hl: ['#tab-traps'], prep: () => { selected = null; tab = 'traps'; updateTray(); }, done: () => fl.phase !== 'build' || fl.essence < 3 || !tutAnySpot(), skip: true },
    { id: 'go', text: 'Gotowe. Wypuść falę przyciskiem w prawym dolnym rogu. Pasek budowy schowa się na czas fali, a w fali ▲ Budowa zatrzymuje grę, żebyś mógł spokojnie dostawić pułapki.', hl: ['#btn-action'], done: () => fl.phase === 'raid' },
    // the wave: one line at the top; the first check jumps to 'check' (after its card)
    { id: 'novice', text: 'Nadchodzą nowicjusze. Każda rana to Groza, a linia u góry zamienia ją w Esencję: Groza × Chciwość × Combo.', hl: ['#h-eq'], raid: true, ack: true },   // 1.15.1: the game stands until Rozumiem (was: gone after 9 s, the game going on)
    { id: 'check', text: 'Stuknij w mapę, gdy koralik będzie w obwódce (draśnięcie) albo w pełnym polu (krytyk). Trafiony wynik pułapka pamięta (znaczek w rogu pola), także w kolejnych falach.', raid: true, done: () => tutFlags.resolved || (!fl.check && tutT > 2) },
    { id: 'herocard', text: 'Stuknij bohatera (albo listę w rogu): zobaczysz jego kartę i klasę. Gra stoi, dopóki jej nie przeczytasz.', raid: true, skip: true, done: () => tutFlags.heroCard },
    { id: 'ff', text: 'Teraz przytrzymaj palec na mapie: gra ruszy przyspieszona, a pułapki biją same (z zapamiętaną siłą albo jak draśnięcie). Gdy nic się nie dzieje, gra przyspiesza sama (▶▶ spokój).', raid: true, skip: true, hold: true, done: () => tutFlags.ffUsed },
    // wave 2 (after the first card from the shop and the card about the heart)
    { id: 'loot', wave: 2, text: 'Serce chce Esencji, a Esencję mnoży chciwość. Łup wabi bohaterów i ją podbija (złote orby w równaniu). Postaw Monety z zakładki Łup w pokoju, przez który przejdą.', build: true, hl: ['#tab-loot', '#item-loot'], prep: () => { tab = 'loot'; updateTray(); setTrayOpen(true); if (fl.essence < costOf('loot')) fl.essence = costOf('loot'); }, done: () => [...fl.items.values()].some(o => isLoot(o.type) && !o.dropped), skip: true },   // not what the dead left behind
    { id: 'upgrade', wave: 2, text: () => { const it = tutUpTarget(); return 'Dwa szybkie stuknięcia w element to ulepszenie: mocniej bije i ma szersze strefy checku. Stuknij dwa razy ' + (it ? ITEMS[it.type].name.toLowerCase() : 'pułapkę') + ' w kółku (koszt: ' + (it ? upgCost(it) : 6) + ' Esencji).'; }, build: true, tile: () => { const it = tutUpTarget(); return it ? [it.x, it.y] : null; }, prep: () => { selected = null; updateTray(); const it = tutUpTarget(); if (it && fl.essence < upgCost(it)) fl.essence = upgCost(it); }, done: () => !!tutFlags.upgraded, skip: true },
    { id: 'deck', wave: 2, text: () => 'Karta ze sklepu leży w talii: ' + slotsTxt(run.deckSize) + '. Działa do końca runu albo do sprzedaży, a kopie tej samej karty się sumują. Po każdej fali dostajesz darmową kartę; inne kupisz za Esencję. Pierwszy kafelek otwiera sklep.', build: true, hl: ['#tab-deck'], prep: () => { tab = 'deck'; updateTray(); setTrayOpen(true); }, next: true },
    // wave 3
    { id: 'dig', wave: 3, text: 'Pokój mieści tylko kilka pułapek (licznik w rogu), więc między falami kop nowe pokoje. Zakładka Loch: Nowy pokój, Przejście, Rozbuduj, Wyburz. Spróbuj wykopać pokój.', build: true, hl: ['#tab-dungeon', '#item-dig'], prep: () => { pickTab('dungeon', 'dig'); setTrayOpen(true); }, done: () => tutFlags.tool, skip: true },
    { id: 'end', wave: 3, text: 'To wszystko na pierwszy run. Każdy kolejny run dołoży coś nowego: straszenie, potem gildię z budowlami i typy pokoi, a na końcu ciała i fobie bohaterów. Powodzenia!', build: true, next: true }
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
  function coachSync() { const co = $('#coach'); coachInset = !co.hidden && co.classList.contains('top') ? co.offsetTop + co.offsetHeight : 0; }   // read once per change, not every frame
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
    const cur = onbStage();
    if (cur <= 4 && r.stage >= cur) setOnb(Math.min(5, r.stage + 1));
  }
  // a run of the first ones: the guide with the first (once: a first run left in the middle starts again without it), a card with what is new for the others
  function startGuided() {
    const st = Math.min(4, onbStage());
    newRun(st === 1 && !coachDone(), st); run.guided = true;
    if (st > 1) queueModal({ type: 'onb' });
    saveRun('build');
  }
  function renderNews(card) {   // 1.12.1: what the tavern says about the next wave (a tap on "Fala X/10" in the build)
    card.appendChild(el('div', 'sub', 'Wieści z karczmy'));
    card.appendChild(el('h2', null, waveName()));
    waveHint().split(/(?<=[.!?])\s+(?=[A-ZŁŚŻŹĆŃÓĘĄ])/).forEach(t => card.appendChild(el('p', null, t)));
    const b = btn('primary', 'Zamknij', null, closeModal); b.id = 'news-close'; card.appendChild(b);
  }
  function renderOnb(card) {
    const s = run.stage || ONB_FULL, O = ONB_STAGES[s];
    card.appendChild(el('div', 'sub', 'Run ' + s + ' z 4 · nauka'));
    card.appendChild(el('h2', null, 'Nowe: ' + O.name.toLowerCase()));
    const ul = el('ul', 'conseq'); O.news.forEach(t => ul.appendChild(el('li', null, t))); card.appendChild(ul);
    card.appendChild(el('p', 'note', s < ONB_FULL ? 'Następny run doda: ' + ONB_STAGES[s + 1].name.toLowerCase() + '.' : 'To już cała gra. Wszystkie zasady znajdziesz w Jak grać na ekranie startowym.'));
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
    tutT += Math.min(0.1, realNow - tutLast); tutLast = realNow;
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
  requestAnimationFrame(frame);

  // Hook for automated checks; no effect on normal play.
  window.__yatd = { get MUS() { return MUS; }, get WA() { return WA; }, wallCovers, memOf, needsCheck, timeScale, get CHECK_SLOW() { return CHECK_SLOW; }, musicWant, camCentre, TRAY, get cwch() { return [cw, ch, cv.width, cv.height]; }, w2s: (x, y, z) => W2S(x, y, z || 0), centerOn, trayIsOpen, get VIEW() { return VIEW; }, wallH, tapWorld, tutPop, get tutPopNow() { return tutPopNow; }, get paused() { return paused; }, get TC() { return TC; }, get PERF() { return PERF; }, perfSummary, frame, quietWhy, autoFFOn: () => autoFFOn(), standOk: (h, x, y) => standOk(h, x, y), talkGroup: h => talkGroup(h), startPrep: r => startPrep(r), pickTab: (id, t) => pickTab(id, t), makeHero: (t, l, n) => makeHero(t, l, n, new Set()), QUIET, get SPLIT() { return SPLIT; }, splitViews, heroScreen, toWorld, lootCount, walkable, passable, blockerOk, rebuildDungeon, BUILDINGS, get realNow() { return realNow; }, crystalCost, buyCrystal, payChain, chainTick, essIn, comboLive, becomeImpatient: () => becomeImpatient(), partyThink: dt => partyThink(dt), hungerNeed, feedHeart, typeMult, phobiaMult, collectReturners, damage, addFear, shopBuy, shopReroll, toStash, fromStash, sellStash, shopRefresh, stashCap, priceOf, rerollCost, greedBonusParts,
    get S() { return S; }, get fl() { return fl; }, get run() { return run; }, get mods() { return mods; }, get modalKind() { return modalKind; }, get cam() { return cam; },
    get ff() { return ff; }, setFF: v => { ff = v; }, setArm: v => { ARM_TIME = v; },
    step, fire, tryPlace, canPlace, startWave, newRun, closeModal, setPaused, finishWave: () => finishWave(), afterSummary, proceedToBuild,
    resolveCheck: p => resolveCheck(p), skipCheck: () => skipCheck(), clearCheck: () => clearCheck(), areaOf, slotOf, shortestPath, frontier, toolMarkers, applyTool, toolCost, get WW() { return WW; }, get WH() { return WH; }, TUT, UPGRADES, UPG, ITEMS, startBuild, applyUpgrade, makeWave, levelStats, recomputeMods, sellCard, upgradePicks, cardMultNow, openModal, queueModal, renderDeckTiles, saveRun, loadSave, resumeRun, clearSave, upgradeItem, removeItem, waveCurve, waveBase, computeBRooms, inB, decoyAlarm, guildAdapt, quietNow, setUser: v => { userStarted = v; }, get userStarted() { return userStarted; }, ignite, trapBoost, calmReady, landFallen, fall, planBreach: () => planBreach(), tutAnySpot, galleryK, stealNeed, portraitRooms, addFear, setTab: t => { tab = t; updateTray(); }, undo, pushUndo, get undoN() { return undoStack.length; }, setTrayOpen, UI, moveItem, moveTarget, setMode: (m, k) => { selected = m; movingKey = k || null; updateTray(); }, get selected() { return selected; }, get movingKey() { return movingKey; }, rankOf, dungeonBounds, regroupAtDoor: () => regroupAtDoor(),
    patchBreach, chooseEntrance, useCharm, useAmulet, useBoots, giveItem, dropItem, pickup, itemValue, getLost, startSplit, onScout, splitting, GZ, maybeDetour, lostChance, checkPos, CHECK_SHAPE, isRt, rtOf, t3, kindPow, inKind, slotRoom, servedRooms, kindProps, PROP, PROP_PLAN, KIND_WALL3D, snapshotLayout, KINDS, KIND_INFO, KIND_OF, RT_INFO, nbrRooms, roomCount, sizeMult,
    rollItem, curse, comboNow, get orbs() { return orbs; }, boxOrbs, tileScreen, bfs, say: (h, t, p, d, how) => say(h, t, p, d, how), sayTick, floorBusy, readT, talkAs: (d, l) => talkAs(d, l), greedCurve, greedRaw, addGreed, waveSize, partySize, safestRoom: h => safestRoom(h), planHero: h => planHero(h), lootSeen: it => lootSeen(it), kill: (h, k, a) => kill(h, k, a), damage, loadRecords, BREACH_PATCH, HITEMS, LOOT_KIND, noticeLoot, lootDecision, leader, alive, heroExit, driftTarget, SCARE, CURSED, DRIFT, TABS, objTargetOk, roomOf, dropCarry, holdRemove, buildTap, onbStage, setOnb, onbDone, startGuided, endRun: (r, x) => endRun(r, x), revealPhobia, revealPhys, ONB_STAGES, ONB_CARD, ONB_ITEM, comboHp, onbOk, coachDone,
    get movingObj() { return movingObj; }
  };
})();
</script>
