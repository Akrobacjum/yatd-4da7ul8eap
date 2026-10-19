  const LOCK = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
  let tab = 'traps';
  try { tab = localStorage.getItem('yatd-tab') || 'traps'; } catch (e) {}
  if (!TABS.some(t => t.id === tab)) tab = 'traps';
  // Small preferences of this browser: which panels are open, and the speed button.
  const UI = (() => { const d = { hintOpen: false, trayBuild: true, listOpen: false, speed: 1 }; try { return Object.assign(d, JSON.parse(localStorage.getItem('yatd12-ui') || '{}')); } catch (e) { return d; } })();
  function saveUI() { try { localStorage.setItem('yatd12-ui', JSON.stringify(UI)); } catch (e) {} }
  const costOf = t => MODES[t] ? 0 : TOOLS[t] ? toolCost(t) : BUILDINGS[t] ? Math.ceil(ITEMS[t].cost * mods.buildingCost) : ITEMS[t].cost;
  const upgCost = it => Math.ceil(ITEMS[it.type].cost * UPG_COST[(it.lvl || 1) + 1]);
  // v14.1: the tray is one row scrolled sideways; each tab remembers where it was scrolled to
  const trayScroll = {}; let trayTab = null;
  function trayFade() { const t = $('#tray'); t.classList.toggle('fade-l', t.scrollLeft > 4); t.classList.toggle('fade-r', t.scrollLeft + t.clientWidth < t.scrollWidth - 4); }
  function updateTray() {
    const tray = $('#tray'), tabs = $('#tabs');
    if (!tray.dataset.scrollHook) { tray.dataset.scrollHook = '1'; tray.addEventListener('scroll', () => { if (trayTab) trayScroll[trayTab] = tray.scrollLeft; trayFade(); }, { passive: true }); }
    if (!tabs.children.length) {
      TABS.forEach(tb => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tab'; b.id = 'tab-' + tb.id; b.setAttribute('role', 'tab'); b.textContent = tb.label;
        b.addEventListener('click', () => {
          trayScroll[tab] = tray.scrollLeft; tab = tb.id; try { localStorage.setItem('yatd-tab', tab); } catch (e) {} updateTray();
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
            if (fl.phase !== 'build') { setHint(ITEMS[t].name + ': tylko między falami.'); return; }
            selected = selected === t ? null : t; movingKey = null; movingObj = null; updateTray();
            if (selected) setHint(ITEMS[t].desc);   // a mode: how to use it
            return;
          }
          if (!run.unlocked.has(t)) { setHint(ITEMS[t].name + ' jest zablokowany. Odblokujesz go kartą ze sklepu.'); return; }
          if ((TOOLS[t] || ITEMS[t].build) && fl.phase !== 'build') { setHint(ITEMS[t].name + ': przebudowa lochu tylko między falami.'); return; }
          if (fl.essence < costOf(t)) { setHint('Za mało Esencji na: ' + ITEMS[t].name + ' (' + costOf(t) + ').'); return; }
          selected = selected === t ? null : t; movingKey = null; movingObj = null;   // choosing from the tray puts down what was in hand
          updateTray();
          if (selected && (UI.holdTips || 0) < 3) { UI.holdTips = (UI.holdTips || 0) + 1; saveUI(); setHint('Przytrzymaj kafelek w pasku, żeby przeczytać, co robi.'); }
        });
        tray.appendChild(b);
      });
    }
    const cur = TABS.find(tb => tb.id === tab) || TABS[0];
    TABS.forEach(tb => $('#tab-' + tb.id).setAttribute('aria-selected', String(tb === cur)));
    ITEM_ORDER.forEach(t => {
      const b = $('#item-' + t);
      b.hidden = !cur.items.includes(t);
      const cst = b.querySelector('.cost');
      cst.textContent = MODES[t] ? '' : String(costOf(t)); cst.classList.toggle('nocost', !!MODES[t]);
      const locked = !run || !run.unlocked.has(t);
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
    if (trayTab !== cur.id) { trayTab = cur.id; tray.scrollLeft = trayScroll[cur.id] || 0; }
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
    if (run && !MODES[t] && !run.unlocked.has(t)) box.appendChild(el('div', 'tw', 'Zablokowany: odblokujesz go kartą ze sklepu.'));
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
    $('#btn-pause').disabled = !raid;   // pause only means something during a wave
    $('#btn-undo').hidden = raid; $('#btn-pause').hidden = !raid;
    updateUndoBtn();
    b.classList.remove('focus-on', 'silence-on', 'ready');
    if (!fl || !run) { b.disabled = true; return; }
    if (build) { const left = Math.floor(fl.essence); b.disabled = false; b.classList.add('ready'); actLabel(b, 'Wypuść falę ' + run.wave, (run.next ? run.next.length : 0) + ' bohaterów' + (left >= 6 ? ' · zostało ' + left + ' Esencji' : '')); return; }
    if (fl.phase === 'raid') {   // v14: no silence: the button only says how to speed up
      b.disabled = true;
      actLabel(b, 'Fala trwa', 'przytrzymaj mapę: szybciej');
      return;
    }
    b.disabled = true; actLabel(b, 'Koniec fali');
  }
  function updatePauseBtn() { const b = $('#btn-pause'); b.classList.toggle('on', paused); b.setAttribute('aria-label', paused ? 'Wznów' : 'Pauza'); b.setAttribute('aria-pressed', String(paused)); }
  function setPaused(v) {
    if (!fl || fl.phase !== 'raid') { paused = false; updatePauseBtn(); return; }
    if (paused !== v) tl('pa', v ? 1 : 0);
    paused = v; if (paused) ff = false; updatePauseBtn();
    setHint(paused ? 'Pauza. Możesz przesuwać mapę, stawiać elementy i stuknąć bohatera, żeby zobaczyć jego kartę.' : 'Gramy dalej.');
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
        $('#h-hlabel').textContent = !need ? (run.tutorial ? 'serce śpi (samouczek)' : 'serce głodne od fali 2') : ok ? 'serce syte' : inW ? 'serce ' + Math.floor(fed) + '/' + need : 'serce chce ' + need + ' z fali';
      }
    }
    const out = fl.party && fl.party.carrierId >= 0 && fl.phase === 'raid' ? 1 : 0;
    setText('h-cry', '◆'.repeat(Math.max(0, run.crystals - out)) + (out ? '◈' : '') + '◇'.repeat(Math.max(0, run.maxCrystals - run.crystals)));
    { const c = 2 * run.crystals - out; if (SC.cry != null && c < SC.cry && fl.phase !== 'build') crystalAlarm(); SC.cry = c; }   // stolen or eaten: the crystals shake, the map flashes red
    setText('h-time', fl.phase === 'build' ? 'budowa' : fl.phase === 'raid' ? (paused ? 'pauza' : fl.fearless ? (fl.storm ? 'szturm!' : 'odwrót') : mmss(Math.max(0, S.waveTime - fl.time))) : 'koniec');
    const bar = $('#h-bar'); bar.style.width = (fl.phase === 'raid' ? Math.min(1, fl.time / S.waveTime) * 100 : 0).toFixed(1) + '%'; bar.classList.toggle('ok', false);
    const pipsOn = fl.phase !== 'raid';
    if (hudCache.pipsOn !== pipsOn) { hudCache.pipsOn = pipsOn; $('#h-barwrap').hidden = pipsOn; $('#h-pips').hidden = !pipsOn; }
    if (pipsOn) renderPips();
    // The equation row (the Balatro line). Prototype 1.01: while a combo lasts its Groza piles up here and the line shows what it
    // will pay (Groza x Chciwość x Combo = Esencja); when the combo ends it is cashed in (the line glows for a moment, orbs fly).
    // Nothing going on: Groza 0 and the multipliers as they stand now (dim). Between waves: the greed a wave starts with.
    const cm = 1 + 0.25 * (comboNow() - 1), raid = fl.phase === 'raid', wait = raid && cm > 1 && !!fl.quiet;   // the combo waits while nothing happens
    const C = raid ? fl.chain : null, PY = raid && !C && fl.lastPay && fl.time - fl.lastPay.t <= 1.6 ? fl.lastPay : null, B = C || PY;
    const eqG = C ? '+' + fmtG(C.g) : PY ? fmtG(PY.g) : '0', eqC = fmt2(B ? B.greed : raid ? fl.greed : greedStartNow()), eqK = fmt2(B ? B.cm : raid ? cm : 1);
    const eqE = C ? '+' + fmtE(C.g * C.greed * C.cm * mods.regen) : PY ? '+' + fmtE(PY.e) : '+0';
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
  function setHint(t) {
    if (!t) return;
    const box = $('#toast'), same = t === hintMsg && !box.hidden && !box.classList.contains('bye');
    hintMsg = t;
    if (!same) { box.textContent = t; box.hidden = false; box.classList.remove('bye'); box.style.animation = 'none'; void box.offsetWidth; box.style.animation = ''; }
    placeToast(); requestAnimationFrame(placeToast);
    clearTimeout(setHint.t1); clearTimeout(setHint.t2);
    setHint.t1 = setTimeout(hideToast, Math.min(9000, Math.max(2600, 1400 + t.length * 45)));
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
    else if (modalOpen) box.style.top = 'max(12px, env(safe-area-inset-top, 0px))';
    else box.style.top = Math.round(stage.getBoundingClientRect().top + 8) + 'px';
  }
  $('#toast').addEventListener('click', hideToast);
  $('#h-wave').addEventListener('click', () => { if (run && fl && !modalOpen && fl.phase === 'build') setHint(waveHint()); });   // the wave's news again

  // The element tray folds away (a tap on the handle); in a wave it folds by itself (game setting), between waves it remembers you.
  function setTrayOpen(open, byUser) {
    const d = $('#drawer'), was = !d.classList.contains('closed');
    d.classList.toggle('closed', !open); $('#app').classList.toggle('trayclosed', !open);
    $('#tray-toggle').setAttribute('aria-expanded', String(open));
    $('#tray-label').textContent = open ? 'Schowaj pasek' : 'Pokaż pasek elementów';
    if (byUser && fl && fl.phase === 'build') { UI.trayBuild = open; saveUI(); }
    if (was !== open) { if (!open && selected && fl && fl.phase === 'raid') { selected = null; } setTimeout(() => { if (fl) resize(); }, 0); hideTip(); }
  }
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
    if (modalKind === 'settle' && curModal && curModal.next) { const n = curModal.next; curModal = null; openModal(n); return; }   // the reckoning always leads to the wave summary
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
    ({ start: renderStart, menu: renderMenu, settings: renderSettings, tests: renderTests, upgrade: renderUpgrade, wave: renderWave, over: renderOver, end: renderEnd, survey: renderSurvey, victory: renderVictory, card: renderCard, item: renderItem, breach: renderBreach, settle: renderSettle, hungerTip: renderHungerTip, shop: renderShop, hero: renderHero, esencja: renderEsencja })[m.type](card, m);
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
    card.appendChild(el('div', 'sub', 'Prototype 1.01 · 10 fal i finał'));
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
    const a = btn((sv ? '' : 'primary ') + 'big', 'Samouczek', sv ? 'od nowa · zapisany run przepadnie' : 'Pierwsza fala krok po kroku', () => { closeModal(); userStarted = true; newRun(true); }); a.id = 'start-tut';
    const b = btn('big', sv ? 'Nowy run' : 'Pomiń samouczek', sv ? 'zapisany run przepadnie' : 'Od razu do gry', () => { closeModal(); userStarted = true; newRun(false); }); b.id = 'start-play';
    box.appendChild(a); box.appendChild(b); card.appendChild(box);
    webStartRow(card);
    const how = el('details'); how.id = 'start-how'; how.appendChild(el('summary', null, 'Jak grać'));
    const ul = el('ul', 'conseq');
    ['Między falami budujesz z paska na dole. Zakładki: Pułapki (te, które ranią, i te, które straszą), Potwory, Łup, Obiekty (skrzynia i budowle-kontry), Loch (nowe pokoje, przejścia, rozbudowa i typy pokoi), Talia. Każdy pokój mieści kilka elementów (licznik w rogu pokoju). Pasek zwiniesz uchwytem nad nim.',
     'Stuknięcie postawionego elementu albo mebla podnosi go (stuknij nowe miejsce, żeby przenieść), dwa szybkie stuknięcia ulepszają pułapkę albo potwora, przytrzymanie zdejmuje i oddaje Esencję. Przytrzymanie kafelka w pasku pokazuje, co robi. Działa też na pułapki, z którymi loch startuje (meble lochu nic nie oddają).',
     'W fali stukasz w mapę przy skill checku: zielone to draśnięcie, czerwone to krytyk, czaszka znaczy, że ktoś zginie. Każda pułapka ma swój kształt checku, a im silniejszy bohater, tym szybsza wskazówka.',
     'Przytrzymaj palec na mapie: gra przyspiesza, checków nie ma, a pułapki biją same jak draśnięcie. Puścisz palec i checki wracają.',
     'Strach wypędza bohaterów; rany i śmierć towarzyszy też straszą, a strach powoli opada. Niosący kryształ rzuca go ze strachu. Uciekinier opowie innym o Twoich pułapkach i może wrócić z blizną. Uwięzionego w klatce, którego nikt nie uwolni, klatka zabija.',
     'Część pułapek nie rani, tylko straszy: portret, oczy, kości, lustro, zawiasy, trumna, pozytywka (w zakładce Pułapki, za raniącymi), a w zakładce Potwory duch, cień i nietoperze. Przestraszony uciekinier, który widział łup, opowie o nim i następna fala przyjdzie bardziej chciwa.',
     'Rany mają typ: kłute, obuchowe, ogień i trucizna. Klasa i ciało bohatera zmieniają obrażenia, a fobie podwajają strach. Stuknij bohatera (w fali albo na liście u góry), żeby zobaczyć jego kartę.',
     'Rany i strach to Groza. Dopóki trwa combo (różne pułapki pod rząd), Groza się zbiera, a gdy combo się skończy, wypłaca się jako Esencja: Groza × Chciwość (łup, rozległy loch, karty) × Combo. Esencję wydasz jeszcze w tej samej fali.',
     'Od fali 2 serce bierze pierwsze porcje Esencji z każdej fali, aż się naje (♥ u góry pokazuje ile). Fala da za mało: serce zje to, co dostało, i kryształ. Trzymaj bohaterów w lochu jak najdłużej: wypędzeni od razu nie nakarmią serca. Limitu Esencji nie ma.',
     'Za każdą przetrwaną falę (nawet z utratą kryształu) dostajesz darmową kartę, po bossie legendarną w ofercie. Wybierasz ją w sklepie po fali; tam też kupisz karty za Esencję, odświeżysz ofertę, sprzedasz kartę, odłożysz ją do schowka albo odkupisz kryształ.',
     'Gildia czyta raporty z fal i przysyła odpowiedź: kontruj ją budowlami. Od fali 6 może przebić wyłom.'].forEach(t => ul.appendChild(el('li', null, t)));
    how.appendChild(ul); card.appendChild(how);
    const nw = el('details'); nw.id = 'start-new'; nw.appendChild(el('summary', null, 'Co nowego w Prototype 1.01'));
    const ul2 = el('ul', 'conseq');
    ['1.01: combo jak w Balatro: Groza zbiera się, dopóki trwa combo (widać to w linii u góry), i wypłaca się na końcu po końcowym combo, więc combo działa wstecz na całą serię. Liczby nad bohaterami pokazują teraz Grozę (fiolet), a czerwona Esencja wpada przy wypłacie.',
     '1.01: serce bierze pierwsze porcje Esencji z każdej fali, aż się naje, i chce dużo więcej niż wcześniej. Fala da za mało: zje to, co dostało, i kryształ. Nie ma już zapasu serca ani limitu Esencji. Na koniec fali rozliczenie: Groza, Esencja, porcja serca, reszta dla Ciebie.',
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
    inp.addEventListener('input', () => { S[sd.k] = parseFloat(inp.value); show(); saveSettings(); });
    wrap.appendChild(lab); wrap.appendChild(inp); return wrap;
  }
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
    const locked = shuffle(UPGRADES.filter(u => u.kind === 'unlock' && !run.unlocked.has(u.unlock)));
    const f = 0.75 * Math.max(0, run.wave - 1), rareP = r >= 2 ? 1 : Math.min(0.6, 0.15 + 0.02 * f), legP = r >= 3 ? 1 : r >= 2 ? Math.min(0.4, 0.15 + 0.01 * f) : Math.min(0.15, 0.03 + 0.005 * f);
    const rarOk = u => u.rar === 'c' || (u.rar === 'r' && Math.random() < rareP) || (u.rar === 'l' && Math.random() < legP);   // the more famous the dungeon, the better the cards
    const pool = UPGRADES.filter(u => u.kind !== 'unlock' && reqOk(u) && !(u.unique && has(u.id)) && rarOk(u));
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
        if (k === curWave) { const v = el('em', null, String(w.score)); v.style.bottom = Math.min(pct, 78) + '%'; col.appendChild(v); }   // 1.01: never over the panel title
      }
      c.appendChild(col); c.appendChild(el('span', null, String(k))); ch.appendChild(c);
    }
    parent.appendChild(ch); return ch;
  }
  const frow = (list, text, k) => list.appendChild(el('div', 'frow' + (k ? ' k-' + k : ''), text));

  /* ----- the wave summary ----- */
  function renderWave(card, m) {
    const s = fl.stats, won = !!fl.victory, H = fl.hunger;
    if (won) card.classList.add('vic');
    scrHead(card, waveName() + ' · ' + mmss(fl.time), won ? 'Zwycięstwo!' : fl.crystalLost ? 'Kryształ skradziony' : 'Fala odparta', '+' + fmtE(fl.score), 'Esencji z fali', [fl.score, v => '+' + fmtE(v)]);
    const body = el('div', 'scr-body'); card.appendChild(body);
    const tiles = el('div', 'statrow');
    statTile(tiles, String(s.kills), 'zabici'); statTile(tiles, String(s.scared), 'przestraszeni');
    statTile(tiles, run.crystals + '/' + run.maxCrystals, 'kryształy', fl.crystalLost || (H && H.ate) ? 'bad' : 'good');
    if (H) statTile(tiles, String(H.need), H.fed ? 'serce syte' : 'zjadło kryształ', H.fed ? 'good' : 'bad');
    else statTile(tiles, run.wave < 2 ? '0' : '-', run.tutorial ? 'serce śpi' : run.wave < 2 ? 'głód od fali 2' : 'serce');
    body.appendChild(tiles);
    waveChart(panel(body, 'Esencja z fal', 'kreska: porcja serca'), run.waves, run.wave);
    // where this wave's Esencja came from: one bar, the biggest parts named
    const src = [['Rany', s.dmgPts, '#ff8a7a'], ['Strach', s.fearPts, '#c3b2ff'], ['Ucieczki', s.scarePts, '#8a6fe0'], ['Zabici', s.killPts, '#d8434f'], ['Łup', s.lootPts, '#f2b94b'],
      ['Combo', s.comboPts || 0, '#a9d4da'], ['Inne', (s.crystalPts || 0) + (s.lostPts || 0) + (s.lonePts || 0) + (s.healPts || 0), '#7d7590']].filter(r => r[1] > 0.05);
    const tot = src.reduce((a, r) => a + r[1], 0) || 1;
    const ps = panel(body, 'Skąd Esencja', 'Groza ' + fmtE(fl.base) + ' × średnio ' + fmt2(fl.base > 0 ? fl.score / fl.base : 1));
    const sb = el('div', 'srcbar'); src.forEach(r => { const i = el('i'); i.style.width = (100 * r[1] / tot).toFixed(1) + '%'; i.style.background = r[2]; i.title = r[0]; sb.appendChild(i); }); ps.appendChild(sb);
    const lg = el('div', 'srclg');
    src.slice().sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(r => { const d = el('span'), dot = el('i'); dot.style.background = r[2]; d.appendChild(dot); d.appendChild(document.createTextNode(r[0] + ' ' + fmtE(r[1]))); lg.appendChild(d); });
    if (!src.length) lg.appendChild(el('span', null, 'Ta fala nic nie dała.'));
    ps.appendChild(lg);
    // four views in one box: what comes next, the heroes, the elements, the numbers (the box never changes size)
    const TABS_W = [['next', 'Co dalej'], ['heroes', 'Bohaterowie'], ['items', 'Elementy'], ['nums', 'Liczby']], cur = m.tab || 'next';
    const seg = el('div', 'seg');
    TABS_W.forEach(([id, label]) => { const b = el('button', id === cur ? 'on' : '', label); b.type = 'button'; b.id = 'wtab-' + id; b.addEventListener('click', () => { if (m.tab === id) return; m.tab = id; card.classList.remove('enter'); card.innerHTML = ''; renderWave(card, m); }); seg.appendChild(b); });
    body.appendChild(seg);
    const box = el('div', 'panel segpanel'), list = el('div', 'flist' + (cur === 'nums' ? ' grid2' : '')); box.appendChild(list); body.appendChild(box);
    if (cur === 'next') {
      const nb = bossOf(run.wave + 1), items = [s.swaps ? 'wymiany: ' + s.swaps : '', s.potionsGiven ? 'mikstury podane: ' + s.potionsGiven : '', s.charms ? 'talizmany: ' + s.charms : '', s.amulets ? 'amulety: ' + s.amulets : '', s.boots ? 'buty: ' + s.boots : ''].filter(Boolean);
      if (H && !H.fed) frow(list, 'Serce chciało ' + H.need + ' Esencji z fali, a fala dała ' + fmtE(fl.score) + ': zjadło wszystko i kryształ. Kryształ odkupisz w sklepie.', 'heart');
      else if (H) frow(list, 'Serce wzięło pierwsze ' + H.need + ' Esencji' + (H.fedAt != null ? ' (najadło się w ' + mmss(H.fedAt) + ')' : '') + ', reszta (' + fmtE(Math.max(0, fl.score - H.need)) + ') trafiła do Ciebie.', 'heart');
      if (run.wave < RUN_WAVES || run.won) frow(list, 'Fala ' + (run.wave + 1) + ': poziom ok. ' + Math.round(waveBase(run.wave + 1)) + (nb ? ', prowadzi ' + (nb === 'final' ? 'bohater z przepowiedni' : 'czempion') : '') + '.', 'wave');
      if (hungerNeed(run.wave + 1)) frow(list, 'Następna fala: serce weźmie pierwsze ' + hungerNeed(run.wave + 1) + ' Esencji. Trzymaj bohaterów w lochu, żeby było z czego.', 'heart');
      frow(list, 'Esencja: +' + run.lastIncome + ' po fali' + (run.lastInterest ? ' (odsetki ' + run.lastInterest + ')' : '') + ', masz ' + Math.floor(run.essence) + '.', 'ess');
      frow(list, m.out ? 'Plotki: uciekinierzy opowiedzą o ' + m.rr + ' pokojach i ' + m.rt + ' pułapkach. Przestaw je albo postaw Zasłonę.' : 'Nikt nie wyszedł żywy: Twoje sekrety są bezpieczne.');
      if (s.treasureTale) frow(list, 'Opowieści o skarbach: chciwość na start następnej fali +' + fmt2(s.treasureTale) + '.', 'ess');
      if (s.greedKept) frow(list, 'Zabrany łup: chciwość +' + fmt2(s.greedKept) + ' do końca runu (razem +' + fmt2(run.greedKeep) + ').', 'ess');
      frow(list, 'Gildia słyszy o chciwości ×' + fmt2(run.greedRep || 1) + ': przywódca +' + f1(huntersLv()) + ' poziomu' + ((run.greedRep || 1) >= 3 ? ', przyjdą łowcy skarbów' : '') + '.');
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
      cell('Najwyższe combo', '×' + fmt2(1 + 0.25 * (s.maxCombo - 1)));
      cell('Łup: zobaczony / zabrany', s.lootSeen + ' / ' + s.loot);
      cell('Rozbrojone / odczynione', s.disarmed + ' / ' + s.blessed);
      cell('Plotki: pokoje / pułapki', s.rumorRooms + ' / ' + s.rumorTraps);
      cell('Zapadnie / klatki', s.falls + ' / ' + s.cages);
      cell('Serce / dla Ciebie', Math.round(s.essHeart || 0) + ' / ' + Math.round(Math.max(0, fl.score - (s.essHeart || 0))));
      cell('Czas / przyspieszenie', mmss(fl.time) + ' / ' + Math.round(s.ffTime) + ' s');
    }
    fitList(list);
    // the way on
    const foot = el('div', 'scr-foot'); card.appendChild(foot);
    if (won) {
      const row = el('div', 'row');
      const go = btn('primary', 'Graj dalej', 'fale bez końca', () => { run.victoryDone = true; closeModal(); afterSummary(); }); go.id = 'vic-continue';
      const end = btn('', 'Zakończ: zwycięstwo', 'zapisze wygrany run', () => { run.victoryDone = true; closeModal(); endRun('Loch przetrwał wszystkie ' + RUN_WAVES + ' fal.', 'win'); }); end.id = 'vic-end';
      row.appendChild(go); row.appendChild(end); foot.appendChild(row);
    } else {
      const pu = run.pendingUpgrades, fp = pu.length + (run.freePicks || 0), alive = run.crystals > 0 && !(run.wave === RUN_WAVES && !run.won);
      const nx = btn('primary', run.crystals > 0 ? 'Dalej: sklep przed falą ' + (run.wave + 1) : 'Dalej', alive && fp ? 'darmowe karty: ' + fp + (pu.some(p => p.src === 'boss') ? ' (legendarna w ofercie)' : '') : null, () => { closeModal(); afterSummary(); });
      nx.id = 'wave-next'; foot.appendChild(nx);
    }
    const mr = el('div', 'minirow'), dn = el('p', 'note', '');
    const dl = el('button', 'mini', 'Pobierz wyniki'); dl.type = 'button'; dl.addEventListener('click', () => downloadRun(dn)); mr.appendChild(dl);
    if (run.crystals > 0 && !won) { const sq = el('button', 'mini', 'Zapisz i wyjdź'); sq.type = 'button'; sq.addEventListener('click', () => { saveRun('summary'); closeModal(); openModal({ type: 'start' }); }); mr.appendChild(sq); }
    if (run.crystals > 0 && !won) {
      const q = el('button', 'mini', 'Zakończ run'); q.type = 'button';
      q.addEventListener('click', () => { if (!q.dataset.sure) { q.dataset.sure = '1'; q.textContent = 'Na pewno?'; return; } closeModal(); endRun('Run zakończony przez gracza po fali ' + run.wave + '.', 'quit'); });
      mr.appendChild(q);
    }
    foot.appendChild(mr);
    dn.textContent = m.logNote || 'Zapisuję falę...'; foot.appendChild(dn);
    if (!m.logNote) Promise.resolve(run.lastLog).then(() => { m.logNote = (logText(run.logState) || '') + (run.tutorial ? '' : ' Run zapisany w tej przeglądarce.'); if (dn.isConnected) dn.textContent = m.logNote; });
    if (won && !m.pushed) { m.pushed = true; pushLog(null); }
  }

  /* ----- the shop ----- */
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
    if (run.tutorial && !run.shopTipShown) { run.shopTipShown = true; m.msg = 'Samouczek: po każdej fali bierzesz tu darmową kartę (Weź); inne kupisz za Esencję.'; }
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
      b.appendChild(el('span', 'ok', kindShort(u))); b.appendChild(el('b', null, u.name)); b.appendChild(el('span', 'tx', u.text));
      const by = el('button', 'buy', free ? 'Weź za darmo' : poor ? 'Za mało (' + price + ')' : 'Kup za ' + price + ' Esencji'); by.type = 'button'; by.id = 'offer-buy-' + i; by.disabled = poor;
      by.setAttribute('aria-label', (free ? 'Weź za darmo: ' : 'Kup za ' + price + ' Esencji: ') + u.name);
      by.addEventListener('click', () => {
        const r = shopBuy(i);
        if (r === 'ess') m.msg = 'Za mało Esencji (' + price + ').';
        else if (r === 'full') m.msg = 'Talia i schowek są pełne: sprzedaj albo odłóż kartę.';
        else { m.sel = null; m.msg = r === 'stash' ? u.name + ': do schowka (talia pełna).' : u.kind === 'unlock' ? u.name + ': odblokowane.' : u.kind === 'instant' ? u.name + '.' : 'W talii: ' + u.name + '.'; }
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
    // refresh, refresh for an ad, buy back a crystal: three buttons that are always there
    const acts = el('div', 'acts');
    const act = (id, title, sub, off, fn) => { const b = el('button'); b.type = 'button'; b.id = id; b.appendChild(el('b', null, title)); b.appendChild(el('span', / Esencji$/.test(sub) ? 'ess' : null, sub)); b.disabled = !!off; b.addEventListener('click', fn); acts.appendChild(b); return b; };
    const rc = rerollCost();
    act('shop-reroll', 'Odśwież', rc ? rc + ' Esencji' : 'gratis', fl.essence < rc, () => { if (shopReroll(false)) { m.sel = null; m.msg = 'Nowa oferta.'; } else m.msg = 'Za mało Esencji na odświeżenie.'; rerender(); });
    act('shop-ad', 'Za reklamę', run.shop.ad ? 'już użyte' : 'odśwież raz', run.shop.ad, () => { shopReroll(true); m.sel = null; m.msg = 'Nowa oferta (reklama, symulacja).'; rerender(); });
    const canCry = run.crystals < run.maxCrystals && !run.tutorial, cc = crystalCost();
    act('shop-crystal', 'Kryształ', canCry ? cc + ' Esencji' : 'komplet ' + run.crystals + '/' + run.maxCrystals, !canCry || fl.essence < cc, () => { if (buyCrystal()) m.msg = 'Kryształ wrócił do serca (' + run.crystals + '/' + run.maxCrystals + ').'; else m.msg = 'Za mało Esencji na kryształ (' + cc + ').'; rerender(); });
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
    if (m.msg) { const t = m.msg; m.msg = ''; setTimeout(() => setHint(t), 0); }   // what just happened: a message over the big button
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
    if (!run.recorded && !run.tutorial) {   // this browser's records
      run.recorded = true; rec.runs++; if (run.result === 'win') rec.wins++;
      rec.best = Math.max(wasBest, Math.round(run.total)); rec.wave = Math.max(rec.wave || 0, held); saveRecords(rec);
    }
    m.wasBest = wasBest;
    const isBest = !run.tutorial && run.total > wasBest && run.total > 0;
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
    if (!run.tutorial) frow(list, 'Rekordy tutaj: ' + Math.round(rec.best) + ' Esencji w runie · najdalej fala ' + rec.wave + ' · wygrane ' + rec.wins + ' z ' + rec.runs + '.');
    fitList(list);
    const foot = el('div', 'scr-foot'); card.appendChild(foot);
    const row = el('div', 'row');
    const again = btn('primary', 'Jeszcze raz', null, () => { closeModal(); newRun(false); }); again.id = 'end-again';
    row.appendChild(again); row.appendChild(btn('', 'Menu', null, () => { closeModal(); openModal({ type: 'start' }); })); foot.appendChild(row);
    const mr = el('div', 'minirow'), dn = el('p', 'note', m.logNote || 'Zapisuję wynik do analizy...');
    const db = el('button', 'mini', 'Pobierz wyniki tego runu (.json)'); db.type = 'button'; db.addEventListener('click', () => downloadRun(dn)); mr.appendChild(db);
    foot.appendChild(mr); foot.appendChild(dn);
    if (!m.pushed) { m.pushed = true; pushLog(null).then(res => { m.logNote = res === 'ok' ? 'Wynik zapisany. Claude może go przeanalizować przy balansie.' : logText(res); if (dn.isConnected) dn.textContent = m.logNote; }); }
  }
  const crystalCost = () => 40 + 30 * (run.crystalsBought || 0);   // 1.01: 40, 70, 100... (was 25, 45, 65)
  function buyCrystal() {
    const c = crystalCost();
    if (!fl || fl.phase !== 'build' || run.crystals >= run.maxCrystals || fl.essence < c) return false;
    fl.essence -= c; run.essence = fl.essence; run.crystals++; run.crystalsBought = (run.crystalsBought || 0) + 1;
    tl('cb', c); updateTray(); saveRunSoon(); return true;
  }
  function addEss(n) { fl.essence += n; run.essence = fl.essence; updateTray(); }
  function applyUpgrade(u) {
    if (u.kind === 'unlock') run.unlocked.add(u.unlock);
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
    if (u.kind === 'unlock') return 'Odblokowanie · bez miejsca w talii';
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
    setHint(u.kind === 'unlock' ? u.name + ': odblokowane.' : u.kind === 'instant' ? u.name + '.' : 'Nowa karta w talii: ' + u.name + ' (' + run.deck.length + '/' + run.deckSize + ').');
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
    bt(it.type).spent += c; bt(it.type).upgraded = (bt(it.type).upgraded || 0) + 1; fl.stats.upgrades = (fl.stats.upgrades || 0) + 1;
    floatTile(it.x, it.y, 'Poziom ' + it.lvl + (it.lvl === 3 && TRAITS[it.type] ? ': ' + TRAITS[it.type][0] : ''), '#ffb35c', 15, -0.8);
    updateTray(); saveRunSoon();
    return true;
  }
  function removeItem(it) {
    pushUndo('zdjęcie: ' + ITEMS[it.type].name);
    const back = it.spent != null ? it.spent : ITEMS[it.type].cost;   // loot left by heroes (spent 0) gives nothing back
    fl.items.delete(key(it.x, it.y)); fl.essence += back; if (!it.dropped) { bt(it.type).placed--; bt(it.type).spent -= back; } fl.threatDirty = true;
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
    fl.items.delete(key(it.x, it.y));
    it.x = x; it.y = y; it.gx = x + 0.5; it.gy = y + 0.5; it.preview = 1.4;
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
    if (!ACTIVE[it.type]) { setHint(T.name + ' się nie ulepsza. Ulepszysz pułapki i potwory.'); return; }
    if (lvl >= 3) { setHint(T.name + ' ma już poziom 3' + (TRAITS[it.type] ? ' (' + TRAITS[it.type][0] + ').' : '.')); return; }
    const c = upgCost(it);
    if (fl.essence < c) { setHint('Za mało Esencji: ulepszenie ' + T.name.toLowerCase() + ' kosztuje ' + c + '.'); return; }
    upgradeItem(it);
    setHint(T.name + ': poziom ' + it.lvl + (it.lvl === 3 && TRAITS[it.type] ? ', cecha: ' + TRAITS[it.type][0] : '') + ' (-' + c + ' Esencji).');
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
    if (!t) { setHint(ITEMS[cur.type].name + ' tu nie pasuje: potrzebne jest miejsce typu ' + SLOT_LABEL[ITEMS[cur.type].slot] + ' w pokoju z wolnym miejscem.'); return; }
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
  const STATE_TEXT = { walk: 'idzie', rest: 'odpoczywa', talk: 'naradza się', wait: 'czeka', boss: 'wyważa kryształ', disarm: 'rozbraja', free: 'uwalnia kogoś', fight: 'walczy' };
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
     ['Śmierć bohatera', fmtE(GZ.kill) + ' (boss 2 razy tyle)'], ['Zgubiony / samotny', fmt2(GZ.lost) + ' / ' + fmt2(GZ.alone) + ' na sekundę'], ['Zabrany łup', fmt2(GZ.loot) + ' × rzadkość'], ['Leczenie kapłana', fmt2(GZ.heal) + ' za całe HP'],
     ['Sieć / klatka', fmt2(GZ.web) + ' / ' + fmt2(GZ.cage)], ['Odzyskany kryształ', fmtE(GZ.crystal)]]
      .forEach(r => { const tr = el('tr'); tr.appendChild(el('td', null, r[0])); tr.appendChild(el('td', null, r[1])); gt.appendChild(tr); });
    card.appendChild(gt);
    card.appendChild(el('h2', 'h2small', 'Chciwość ×' + fmt2(raid ? fl.greed : greedStartNow()) + (raid ? '' : ' na start')));
    const gb = greedBonusParts();
    card.appendChild(el('p', 'note', 'Rośnie, gdy bohaterowie zobaczą łup (droższy łup więcej). Stałe dodatki: ' + (gb.length ? gb.map(p => p[0] + ' +' + fmt2(p[1])).join(', ') : 'na razie żadnych') + (run.greedKeep > 0.001 ? ', zabrany łup +' + fmt2(run.greedKeep) : '') + '.'));
    card.appendChild(el('h2', 'h2small', 'Combo ×' + fmt2(raid ? cm : 1)));
    card.appendChild(el('p', 'note', 'Różne pułapki pod rząd w ciągu ' + fmt2(S.comboWin).replace(',00', '').replace(/0$/, '') + ' s: +0,25 za każdy stopień, najwyżej ×2,5. Końcowe combo mnoży całą zebraną Grozę serii. Zegar combo stoi, gdy drużyna idzie pustym korytarzem.' + (mods.regen !== 1 ? ' Żyła esencji mnoży jeszcze ×' + fmt2(mods.regen) + '.' : '')));
    if (raid || fl.phase === 'summary') {
      card.appendChild(el('h2', 'h2small', 'W tej fali'));
      const pt = el('table', 'stats');
      [['Rany', s.dmgPts], ['Strach', s.fearPts], ['Ucieczki ze strachu (' + s.scared + ')', s.scarePts], ['Zabici (' + s.kills + ')', s.killPts], ['Łup', s.lootPts], ['Kryształ odzyskany', s.crystalPts], ['Zgubieni i samotni', (s.lostPts || 0) + (s.lonePts || 0)], ['Leczenie kapłana', s.healPts], ['Combo wstecz', s.comboPts || 0]]
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
        [live.fleeing ? 'UCIEKA' : '', live.crystal ? 'NIESIE KRYSZTAŁ' : '', caged(live) ? 'w klatce' : '', live.lost ? 'zgubiony' : live.alone ? 'sam' : '', fl.time < live.burnUntil ? 'płonie' : '', live.cursed ? 'przeklęty' : '', fl.time < live.shakenUntil ? 'wstrząśnięty śmiercią' : '', STATE_TEXT[live.state] || ''].filter(Boolean).join(', ');
      add('Teraz: ' + st + '.');
    }
    add('Charakter: ' + (e.trait ? HERO_TRAITS[e.trait].name[fem ? 1 : 0] + ' (' + TRAIT_TEXT[e.trait] + ')' : 'zwyczajny') + '.');
    add('Klasa: ' + CLASS_RES_TEXT[e.type] + '.');
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
    card.appendChild(btn('primary', 'Zamknij', null, () => { closeModal(); if (m.unpause) setPaused(false); }));
  }
  // Prototype 1.01: the end of a wave reckons itself up before the summary: the wave's Groza, times the multipliers it was paid at
  // = Esencja, the heart's share taken off (or the crystal it eats), and what is left for you. A tap jumps to the end; then it
  // goes on to the summary by itself (or with Dalej).
  function renderSettle(card, m) {
    card.classList.add('settle');
    const H = fl.hunger, need = H ? H.need : 0, E = fl.score, G = fl.base, mult = G > 0 ? E / G : 1, heart = H ? Math.min(need, fl.fed || 0) : 0, mine = Math.max(0, E - heart);
    card.appendChild(el('div', 'sub', waveName() + ' · rozliczenie'));
    const box = el('div', 'stl'); card.appendChild(box);
    const row = (cls, label) => { const r = el('div', 'stl-row ' + cls), l = el('span', 'stl-l'), v = el('b', 'stl-v num', ''); l.innerHTML = label; r.appendChild(l); r.appendChild(v); box.appendChild(r); return { r, v }; };
    const rG = row('g', 'Groza fali'), rE = row('e', 'Esencja <small>= Groza × ' + fmt2(mult) + ' (Chciwość × Combo)</small>'), rH = need ? row('h' + (H.fed ? ' fed' : ' ate'), H.fed ? '<i>♥</i> Serce bierze swoje' : '<i>♥</i> Serce chciało ' + need + ': za mało') : null, rM = row('m', 'Dla Ciebie');
    const note = el('p', 'note stl-note', ''); card.appendChild(note);
    const foot = el('div', 'row'); const go = btn('primary', 'Dalej', 'podsumowanie fali', () => next()); go.id = 'settle-next'; foot.appendChild(go); card.appendChild(foot);
    const fG = v => fmtG(v), fE = v => fmtE(v);
    const timers = []; let done = false, left = false;
    const tween = (e, a, b, ms, fmt) => { const t0 = performance.now(); const tick = now => { if (done || !e.isConnected) return; const u = Math.min(1, (now - t0) / ms), k = 1 - Math.pow(1 - u, 3); e.textContent = fmt(a + (b - a) * k); if (u < 1) requestAnimationFrame(tick); }; e.textContent = fmt(a); requestAnimationFrame(tick); };
    const show = r => { r.r.classList.add('on'); };
    const finalState = () => {
      done = true; timers.forEach(clearTimeout);
      [rG, rE, rH, rM].forEach(r => { if (r) r.r.classList.add('on', 'still'); });
      rG.v.textContent = fG(G); rE.v.textContent = fE(E); if (rH) rH.v.textContent = H.fed ? '−' + fE(need) : '−' + fE(heart) + ' · ◆'; rM.v.textContent = '+' + fE(H && !H.fed ? 0 : mine);
      note.textContent = H && !H.fed ? 'Fala dała za mało: serce zjadło całą Esencję z fali i kryształ.' : (H ? 'Serce syte. ' : '') + 'Po fali dostajesz jeszcze +' + run.lastIncome + ' Esencji.';
      go.classList.add('ready');
      timers.push(setTimeout(next, 1400));
    };
    const next = () => { if (left) return; left = true; done = true; timers.forEach(clearTimeout); if (modalKind === 'settle') openModal(m.next); };
    card.addEventListener('click', e => { if (e.target.closest('#settle-next')) return; if (!done) finalState(); else next(); });
    if (reduceMotion) { finalState(); return; }
    show(rG); tween(rG.v, 0, G, 650, fG);
    timers.push(setTimeout(() => { show(rE); rG.r.classList.add('fly'); tween(rE.v, 0, E, 750, fE); }, 750));
    let t = 1600;
    if (rH) {   // the heart's share comes off: what is left for you counts down from the whole wave
      timers.push(setTimeout(() => {
        show(rH); show(rM);
        if (H.fed) { tween(rH.v, 0, need, 700, v => '−' + fE(v)); tween(rM.v, E, mine, 700, v => '+' + fE(v)); }
        else { rH.v.textContent = '−' + fE(heart) + ' · ◆'; tween(rM.v, E, 0, 700, v => '+' + fE(v)); card.classList.add('ate'); crystalAlarm(); }
      }, t));
      t += 900;
    } else { timers.push(setTimeout(() => { show(rM); tween(rM.v, 0, mine, 600, v => '+' + fE(v)); }, t)); t += 700; }
    timers.push(setTimeout(finalState, t + 300));
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
     'Fala da za mało: serce zje to, co dostało, i kryształ. Utracony kryształ odkupisz w sklepie.'].forEach(t => ul.appendChild(el('li', null, t)));
    card.appendChild(ul);
    card.appendChild(btn('primary', 'Rozumiem', null, closeModal));
  }
  // The breach, tapped between waves: what it means and the patch.
  function renderBreach(card, m) {
    const B = run.layout.breach;
    if (!B || !fl.breach || fl.phase !== 'build') { card.appendChild(el('p', null, 'Wyłomu już nie ma.')); card.appendChild(btn('primary', 'Zamknij', null, closeModal)); return; }
    // 1.01: the camera goes to the breach and leaves it in view under this sheet (about two thirds down the map), with a pulse
    centerOn(fl.breach.x + 0.5, fl.breach.y + 0.5 - (ch / cam.s) * 0.18); fl.breachPing = realNow;
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
  const FEAR_SRC = { dmg: 'rany', death: 'śmierć towarzyszy', lost: 'zgubienie', alone: 'samotność', echo: 'echo groty', curse: 'klątwa', panic: 'panika', lowhp: 'ciężkie rany', ambush: 'zasadzki',
    carrier: 'klątwa kryształu', roar: 'ryk potworów', haunt: 'nawiedzone klatki', cageAlone: 'porzucenie w klatce', lull: 'kołysanka', other: 'inne' };
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
    run = sv.run;
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
    if (!sv.gv || sv.gv < 38) run.shop = null;
    run.deck = run.deck.filter(id => UPG[id]); run.stash = run.stash.filter(id => UPG[id]);
    mods = freshMods(); run.deck.forEach(id => { const u = UPG[id]; if (u && u.apply) u.apply(mods); });
    floats = []; particles = []; paused = false; ff = false; selected = null;
    if (sv.stage === 'summary') {   // the wave was over: show what was left to pick, then build
      setupFl('summary');
      resize(); cam.s = buildScale(); centerOn(fl.ent.x + 0.5, fl.ent.y + 5);
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
  const LOG_VERSION = 44;   // 44: Prototype 1.01: combo chains cashed in at the end (cp event), the heart eats first from the wave (fed, fedAt, essHeart), no purse limit or store, retreat after patience, new prices, fixed gate, fog loses heroes, stronger early waves, 6 tabs; 43: Prototype 1.0: new look, hold a tile for its text, full card texts in the shop, a double tap upgrades, buildings block like a crate, 7 tabs; 42: v15.2 tap moves / hold removes, two starting traps (18 Esencja), one-screen shop and summaries; 41: v15.1 scare elements (Strach tab), fear 1.6, scare 2.5, wound fear 25%/18%, tales of treasure;  40: v15 one currency (score = Esencja harvested, hunger in Esencja, crystal bought); 39: crystal dropped in fear, cage deaths; 38: v14 shop, damage types, phobias, returners, hunger bar; 33: deck of cards; 34: fame, item levels, buildings, traits, guild; 35: Groza x Chciwość, typed loot, powers, faith, room types, lasting breach, check shapes; 36: check event + level near it and tap offset, hunters replace, rookies
  function snapshotLayout() {
    const L = run.layout;
    return { WW, WH, entrance: L.entrance, heart: L.heartKey, entX: L.entX, essence: Math.round(fl.essence), breach: L.breach ? Object.assign({}, L.breach) : null, greedKeep: Math.round(run.greedKeep * 100) / 100,
      cells: [...L.cells.values()].map(c => [c.cx, c.cy, c.x0, c.y0, c.x1, c.y1, c.lvl || 0, c.objs.map(o => [o[0], o[1], o[2], o[3] ? 1 : 0]), c.rt || null]),
      edges: [...L.edges.values()].map(e => [e.a, e.b, e.horiz ? 1 : 0, e.pa, e.pb, e.lvl || 0]),
      items: [...fl.items.values()].map(it => [it.type, it.x, it.y, it.lvl || 1, it.dropped ? 1 : 0]) };
  }
  function runSummary() {
    return { version: LOG_VERSION, runId: run.id, startedAt: new Date(run.startedAt).toISOString(), at: new Date().toISOString(),
      player: (playerName || '').slice(0, 40), device: deviceId, web: WEB ? 1 : 0, tutorial: run.tutorial, status: run.result || 'active', won: run.won, waves: run.waves.length,
      total: Math.round(run.total), best: loadBest(), resumed: run.resumed || 0, stacks: Object.assign({}, run.stacks), crystals: run.crystals, continueUsed: run.continueUsed,
      upgrades: run.upgrades.slice(), deck: run.deck.slice(), deckSize: run.deckSize, sold: (run.sold || []).slice(), fires: run.fires, durationSec: Math.round((Date.now() - run.startedAt) / 1000), buildSec: Math.round(run.buildSec), raidSec: Math.round(run.raidSec),
      settings: Object.assign({}, S),
      waveMini: run.waves.map(w => ({ w: w.wave, sc: w.score, t: w.time, lost: w.crystalLost ? 1 : 0, k: w.stats.kills, s: w.stats.scared, lv: w.heroes.map(h => h.lvl), part: w.partial ? 1 : 0 })) };
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
        setHint(ITEMS[cur.type].name + ' tu nie pasuje: potrzebne miejsce typu ' + SLOT_LABEL[ITEMS[cur.type].slot] + ' w pokoju z wolnym miejscem. Stuknij ' + ITEMS[cur.type].name.toLowerCase() + ' jeszcze raz, żeby odłożyć.');
        return true;
      }
      if (dirO && dirO !== curO) { pickUpObj(dirO); return true; }
      const t = objTarget(curO, wx, wy);
      if (t) { const nm = objName(curO); moveObj(curO, t[0], t[1]); dropCarry(nm + ' przeniesiony.'); return true; }
      setHint(objName(curO) + ' tu nie pasuje: wolna podłoga pokoju, nie przy drzwiach ani sercu, i pokój nie może zostać przecięty.');
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
  const DOUBLE_TAP_MS = 380; let lastTap = null;
  function handleTap(wx, wy) {
    if (!fl || !run) return;
    const x = Math.floor(wx), y = Math.floor(wy);
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
    let best = null, bd = 0.9;
    fl.heroes.forEach(h => { if (h.dead || h.fled || h.gone) return; const p = heroPos(h), d = Math.hypot(p.x - wx, p.y - wy); if (d < bd) { bd = d; best = h; } });
    if (best) { if (!paused) setPaused(true); openModal({ type: 'hero', id: best.id, unpause: true }); }
  }
  function tryPlace(type, x, y) {
    const T = ITEMS[type], cost = costOf(type);
    if (T.tool) return false;
    if (!run.unlocked.has(type)) { setHint(T.name + ' jest zablokowany.'); return false; }
    if (fl.essence < cost) { setHint('Za mało Esencji.'); return false; }
    if (BUILDINGS[type] && !canPlace(type, x, y)) {
      const r = roomOf(x, y);
      if (fl.phase !== 'build') { setHint('Budowle stawiasz tylko między falami.'); return false; }
      if (r >= 0 && fl.rooms[r].kind !== 'room') { setHint('Budowle stoją tylko w pokojach, nie w korytarzach.'); return false; }
      if (r >= 0 && [...fl.items.values()].some(o => o.type === type && roomOf(o.x, o.y) === r)) { setHint('W tym pokoju już stoi: ' + T.name + '. Jedna budowla danego rodzaju na pokój.'); return false; }
      if (!fl.items.has(key(x, y)) && !blockerOk(x, y)) { setHint(T.name + ' blokuje przejście jak skrzynia: wolna podłoga pokoju, nie przy drzwiach ani sercu, i nie może odciąć części pokoju.'); return false; }
    }
    if (!canPlace(type, x, y)) {
      if (slotOf(x, y) === T.slot && !fl.items.has(key(x, y)) && roomFull(type, x, y)) { const R = fl.rooms[slotRoom(type, x, y)]; setHint((R.kind === 'hall' ? 'Ten korytarz' : 'Ten pokój') + ' jest pełny (' + roomCap(R) + '). Rozbuduj go albo wykop nowy pokój (zakładka Loch), albo zdejmij coś stąd.'); return false; }
      if (type === 'crate') { setHint(fl.phase !== 'build' ? 'Skrzynie stawiasz tylko między falami.' : 'Skrzynia: wolna podłoga pokoju, nie przy drzwiach ani sercu, i nie może odciąć części pokoju.'); return false; }
      setHint(T.name + ' pasuje tylko na: ' + SLOT_LABEL[T.slot] + '. Pasujące wolne miejsca są podświetlone.'); return false;
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
    if (ACTIVE[type]) setHint(T.name + ': podświetlony obszar to zasięg. Stuknij postawiony element między falami, żeby go ulepszyć albo zdjąć.');
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
        const w = toWorld(p.x, p.y), t = holdTarget(w.x, w.y);
        if (t) {
          holdInfo = { x: t.x, y: t.y, t0: realNow, dur: HOLD_DEL };
          holdTimer = setTimeout(() => { if (gesture && !gesture.moved && pointers.size === 1 && fl.phase === 'build' && !modalOpen) { gesture.handled = true; holdRemove(t); } holdInfo = null; }, HOLD_DEL * 1000);
        }
      }
      if (fl.phase === 'raid' && !paused) holdTimer = setTimeout(() => {   // hold still = fast-forward
        if (gesture && !gesture.moved && pointers.size === 1 && fl.phase === 'raid' && !paused) { ff = true; gesture.handled = true; tutFlags.ffUsed = true; tl('ff', 1); }
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
      const w = toWorld(gesture.sx, gesture.sy); handleTap(w.x, w.y);
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
  $('#btn-pause').addEventListener('click', () => { if (fl && fl.phase === 'raid' && !modalOpen) setPaused(!paused); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && fl && fl.phase === 'raid' && !paused) setPaused(true); });
  document.addEventListener('keydown', e => {
    if (!fl || modalOpen || (e.target && e.target.tagName === 'INPUT')) return;
    if (e.code === 'Space' && fl.phase === 'raid') { e.preventDefault(); if (fl.check && !fl.check.result) resolveCheck(); }
    if (e.code === 'KeyP' && fl.phase === 'raid') setPaused(!paused);
    if (e.code === 'KeyF' && fl.phase === 'raid' && !paused && !ff) { ff = true; tutFlags.ffUsed = true; tl('ff', 1); }
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
    else { const b = dungeonBounds(); cam.s = clamp(Math.min(cw / (b.x1 - b.x0), ch / (b.y1 - b.y0)), fitScale() * 0.95, buildScale() * 0.9); centerOn((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); updateZoomBtn(); }
    cam.manualUntil = realNow + 6;
  });
  $('#btn-settings').addEventListener('click', () => { if (!modalOpen) { const pause = !!(fl && fl.phase === 'raid' && !paused); if (pause) setPaused(true); openModal({ type: 'menu', unpause: pause }); } });
  window.addEventListener('resize', () => { if (fl) resize(); });
  try { new ResizeObserver(() => { if (fl) resize(); }).observe(stage); } catch (e) {}   // the tray grows to two rows on the deck tab

  /* ================= interactive tutorial ================= */
  // A coach panel over the bottom of the map, one step at a time. Each step waits for the thing it asks for.
  let tutFlags = {}, tutT = 0, tutLast = 0;
  const countType = t => [...fl.items.values()].filter(it => it.type === t).length;
  function tutPathTile(frac, type) {
    const P = shortestPath();
    for (let k = Math.floor(P.length * frac); k < P.length; k++) if (canPlace(type, P[k][0], P[k][1])) return P[k];
    return null;
  }
  function tutWallTile() {
    const P = shortestPath(), on = new Set(P.slice(0, Math.ceil(P.length * 0.7)).map(p => key(p[0], p[1])));
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (canPlace('arrows', x, y) && areaOf({ type: 'arrows', x, y }).some(a => on.has(key(a[0], a[1])))) return [x, y];
    return null;
  }
  const TUT = [
    { text: 'To Twój loch: wejście i trzy pokoje, w ostatnim serce z kryształami. Bohaterowie przyjdą falami, żeby wynieść kryształy. Na start loch postawił za Ciebie dwie pułapki na ich trasie, zapłacone z Twojej Esencji. Same nie utrzymają fali, więc dostawisz więcej. Twoje zadanie: straszyć, ranić i nie dać się okraść.', next: true },
    { id: 'move', text: 'Stuknij jedną z tych pułapek (kółko), żeby ją podnieść, a potem stuknij inne podświetlone pole, żeby ją tam przenieść. To nic nie kosztuje. Przytrzymanie palca na elemencie zdejmuje go i oddaje Esencję.', tile: () => { const it = [...fl.items.values()].find(o => o.sys); return it ? [it.x, it.y] : null; }, prep: () => { selected = null; updateTray(); }, done: () => !!tutFlags.moved, skip: true },
    { text: 'Teraz dostaw więcej. Wybierz Kolce z paska na dole (zakładka Pułapki). Przytrzymaj kafelek, a zobaczysz, co robi.', hl: ['#tab-traps', '#item-spikes'], prep: () => { movingKey = null; movingObj = null; tab = 'traps'; updateTray(); setTrayOpen(true); }, done: () => selected === 'spikes' || countType('spikes') > (tutFlags.sp0 || 0) },
    { text: 'Postaw je na trasie bohaterów: stuknij pole z pulsującym kółkiem (albo inne podświetlone pole).', tile: () => tutPathTile(0.25, 'spikes'), done: () => countType('spikes') > (tutFlags.sp0 || 0) },
    { text: 'Strzały idą na ściany: wybierz Strzały (ta sama zakładka) i stuknij ścianę przy trasie (kółko).', hl: ['#item-arrows'], prep: () => { tab = 'traps'; updateTray(); }, tile: tutWallTile, done: () => countType('arrows') > (tutFlags.ar0 || 0) },
    { text: 'Łup wabi bohaterów, a kiedy go zobaczą, rośnie chciwość, czyli mnożnik Esencji. Postaw Monety (zakładka Łup): najtańszy łup, który najmocniej podbija chciwość. Inne łupy: mikstura wabi rannych, ekwipunek i relikwia widać z daleka.', hl: ['#tab-loot', '#item-loot'], prep: () => { tab = 'loot'; updateTray(); }, done: () => [...fl.items.values()].some(o => isLoot(o.type)) },
    { id: 'spend', text: () => 'Masz jeszcze ' + Math.floor(fl.essence) + ' Esencji. W pierwszej fali nie oszczędzaj: postaw więcej kolców i strzał przy trasie (zakładka Pułapki). Każdy pokój mieści tylko kilka pułapek, licznik jest w rogu pokoju. Gdy wydasz prawie wszystko albo zabraknie miejsca, przejdziemy dalej.', hl: ['#tab-traps'], prep: () => { selected = null; tab = 'traps'; updateTray(); }, done: () => fl.phase !== 'build' || fl.essence < 3 || !tutAnySpot(), skip: true },   // drop the loot from the hand, or every tap adds more loot
    { text: 'Gotowe. Wypuść pierwszą falę przyciskiem w prawym dolnym rogu.', hl: ['#btn-action'], done: () => fl.phase === 'raid' },
    { id: 'novice', text: 'To nowicjusze: czytaj dymki. Pod paskiem życia mają fioletowy pasek strachu. Każda rana i każdy strach to Groza. Linia u góry zbiera Grozę, dopóki trwa combo, a gdy combo się skończy, wypłaca ją jako Esencję (czerwone kuleczki): Groza × Chciwość × Combo. Za Esencję stawiasz jeszcze w tej fali. Stuknij linię, żeby zobaczyć, skąd się bierze.', hl: ['#h-eq'], wait: 8, raid: true },
    { id: 'check', text: 'Skill check! Stuknij w MAPĘ, kiedy biała wskazówka będzie na zielonym (draśnięcie) albo czerwonym (krytyk). Kształt zależy od pułapki: pasek, lont, krąg, dwa okna, spirala, puls albo wahadło. Przyciski i pasek pułapek go nie odpalą.', raid: true, wait: 30, done: () => tutFlags.resolved },
    { text: 'Pełny pasek strachu = bohater ucieka i daje sporo Grozy; rany i śmierć towarzyszy też straszą. Niosący kryształ rzuca go ze strachu i kryształ wraca do serca. Uciekinier opowie innym o Twoich pułapkach (a jeśli widział łup, także o skarbach, więc następna fala będzie bardziej chciwa) i może wrócić za 2-3 fale silniejszy. Elementy, które tylko straszą, są w zakładce Pułapki (za raniącymi), a straszące potwory w zakładce Potwory.', raid: true, next: true, pause: true },
    { text: 'Przytrzymaj palec na mapie, żeby przyspieszyć grę. Skill checków wtedy nie ma, pułapki biją same jak draśnięcie. Puść, a checki wrócą.', raid: true, done: () => tutFlags.ffUsed || tutT > 15 },
    { id: 'herocard', text: 'Stuknij bohatera na mapie albo na liście u góry: zobaczysz jego kartę (HP, strach, ekwipunek, ciało, fobie). Gra stoi, dopóki ją czytasz.', raid: true, skip: true, done: () => tutFlags.heroCard || tutT > 14 },
    { id: 'dig', text: 'Między falami przebudujesz loch. Każdy pokój mieści tylko kilka pułapek (licznik w rogu pokoju), więc kop nowe pokoje albo je rozbudowuj. Zakładka Loch: Nowy pokój, Przejście, Rozbuduj, Wyburz, a na końcu typy pokoi. Spróbuj wykopać pokój.', build: true, hl: ['#tab-dungeon', '#item-dig'], prep: () => { tab = 'dungeon'; updateTray(); }, done: () => tutFlags.tool, skip: true },
    { text: () => 'To Twoja talia: ' + slotsTxt(run.deckSize) + '. Karta działa do końca runu, dopóki jej nie sprzedasz albo nie odłożysz do schowka (kafelki z przerywaną ramką; w trakcie fali schowka nie widać). Kopie tej samej karty się sumują. Pierwszy kafelek otwiera sklep.', build: true, hl: ['#tab-deck'], prep: () => { tab = 'deck'; updateTray(); }, next: true },
    { id: 'upgrade', text: 'Pułapki i potwory ulepszasz dwoma szybkimi stuknięciami w element (koszt widać nad podniesionym elementem). Poziom 2 i 3 to więcej mocy, poziom 3 dodaje cechę (np. strzały przebijają tarcze), a ulepszenie nie zajmuje miejsca w pokoju. Budowle w zakładce Obiekty to kontry na sztuczki gildii (stoją jak skrzynia i blokują przejście): runa na magów, ołtarz na kapłanów, wabik na złodziei, kwas na tarcze i talizmany i inne. Typy pokoi na końcu zakładki Loch nadają pokojowi charakter: mgła, bagno, grota, krypta albo sezam.', build: true, hl: ['#tab-object', '#tab-dungeon'], prep: () => { tab = 'object'; updateTray(); }, next: true },
    { id: 'types', text: 'Każda pułapka i potwór zadaje typ obrażeń: kłute, obuchowe, ogień albo trucizna. Klasy znoszą je różnie (wojownik dobrze znosi kłute, mag źle), a niektórzy mają słabe ciało albo fobię. Lista u góry mapy pokazuje, co o następnej drużynie wiadomo; stuknij wiersz, żeby zobaczyć kartę.', build: true, next: true },
    { text: 'Klatka zabija, jeśli drużyna nie uwolni uwięzionego. Oko na pułapce = następna fala zna ją z plotek. W zwykłym runie od fali 2 serce bierze pierwsze porcje Esencji z każdej fali, aż się naje (pasek ♥). Fala da za mało: zje to, co dostało, i kryształ, który odkupisz w sklepie. Dlatego trzymaj bohaterów w lochu, zamiast wyrzucać ich od razu. Od fali 6 gildia może przebić wyłom. Powodzenia!', build: true, next: true }
  ];
  function tutStart() { tutFlags = { sp0: countType('spikes'), ar0: countType('arrows') }; run.tut = 0; tutShow(); }
  function tutClearHl() { document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); }
  function tutShow() {
    const st = TUT[run.tut], box = $('#coach');
    tutClearHl();
    if (!st) { tutEnd(); return; }
    tutT = 0; tutLast = realNow; st.cached = undefined;
    if (st.prep) st.prep();
    box.innerHTML = '';
    box.appendChild(el('div', null, typeof st.text === 'function' ? st.text() : st.text));
    const row = el('div', 'crow');
    row.appendChild(el('span', 'step', 'Samouczek ' + (run.tut + 1) + '/' + TUT.length));
    const right = el('span'); right.style.display = 'flex'; right.style.alignItems = 'center'; right.style.whiteSpace = 'nowrap';
    const end = el('button', 'skip', 'Zakończ'); end.type = 'button';
    end.addEventListener('click', () => tutEnd());
    if (run.tut < TUT.length - 1) right.appendChild(end);
    if (st.skip) { const sk = el('button', 'skip', 'Pomiń krok'); sk.type = 'button'; sk.style.marginLeft = '12px'; sk.addEventListener('click', () => tutAdvance()); right.appendChild(sk); }
    if (st.next) { const nx = el('button', 'next', run.tut === TUT.length - 1 ? 'Gramy!' : 'Dalej'); nx.type = 'button'; nx.style.marginLeft = '12px'; nx.addEventListener('click', () => { if (st.pause) setPaused(false); tutAdvance(); }); right.appendChild(nx); }
    row.appendChild(right); box.appendChild(row);
    box.hidden = false;
    (st.hl || []).forEach(sel => { const e = $(sel); if (e) { e.classList.add('tut-hl'); if (e.classList.contains('item') && e.parentElement) { const t = e.parentElement; t.scrollLeft = Math.max(0, e.offsetLeft - 8); } } });   // a highlighted tile scrolls into view
    if (st.pause && fl.phase === 'raid') setPaused(true);
    const t = tutTarget(); if (t && fl.phase === 'build') { centerOn(t[0] + 0.5, t[1] + 2.5); cam.manualUntil = 0; }
  }
  function tutTarget() {
    const st = run && run.tut >= 0 ? TUT[run.tut] : null;
    if (!st || !st.tile || fl.phase !== 'build') return null;
    if (st.cached === undefined) st.cached = st.tile();
    return st.cached;
  }
  function tutAdvance() { run.tut++; tutShow(); }
  function tutTick() {
    const st = TUT[run.tut];
    if (!st) return;
    tutT += Math.min(0.1, realNow - tutLast); tutLast = realNow;
    if (st.raid && fl.phase !== 'raid') return;
    if (st.build && fl.phase !== 'build') return;
    if (st.next) return;
    if ((st.done && st.done()) || (st.wait && tutT >= st.wait)) tutAdvance();
  }
  function tutEvent(ev) {
    if (ev === 'check' && TUT[run.tut] && TUT[run.tut].id === 'novice') { run.tut = TUT.findIndex(s => s.id === 'check'); tutShow(); }
    if (ev === 'resolved') tutFlags.resolved = true;
    if (ev === 'tool') tutFlags.tool = true;
  }
  function tutOnBuild() { const dig = TUT.findIndex(s => s.id === 'dig'); if (run.tut >= 0 && run.tut < dig) { run.tut = dig; tutShow(); } else if (run.tut >= 0 && $('#coach').hidden) tutShow(); }
  // Prototype 1.0: a tutorial run comes back from a save with its coach where it was. A step of the wave itself waits for the
  // next wave, so it goes back to "release the wave"; the "place more" steps count from what stands now.
  function tutResume() {
    if (!run || !run.tutorial || run.tut < 0) return;
    tutFlags = { sp0: countType('spikes'), ar0: countType('arrows') };
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
  function tutEnd() { if (run) run.tut = -1; tutClearHl(); $('#coach').hidden = true; if (paused) setPaused(false); }

  /* ================= boot ================= */
  // An example dungeon sits behind the start screen so the page is never empty.
  newRun(false);
  openModal({ type: 'start' });
  requestAnimationFrame(frame);

  // Hook for automated checks; no effect on normal play.
  window.__yatd = { walkable, passable, blockerOk, rebuildDungeon, BUILDINGS, crystalCost, buyCrystal, payChain, chainTick, essIn, comboLive, becomeImpatient: () => becomeImpatient(), partyThink: dt => partyThink(dt), hungerNeed, feedHeart, typeMult, phobiaMult, collectReturners, damage, addFear, shopBuy, shopReroll, toStash, fromStash, sellStash, shopRefresh, stashCap, priceOf, rerollCost, greedBonusParts,
    get S() { return S; }, get fl() { return fl; }, get run() { return run; }, get mods() { return mods; }, get modalKind() { return modalKind; }, get cam() { return cam; },
    get ff() { return ff; }, setFF: v => { ff = v; }, setArm: v => { ARM_TIME = v; },
    step, fire, tryPlace, canPlace, startWave, newRun, closeModal, setPaused, finishWave: () => finishWave(), afterSummary, proceedToBuild,
    resolveCheck: p => resolveCheck(p), skipCheck: () => skipCheck(), clearCheck: () => clearCheck(), areaOf, slotOf, shortestPath, frontier, toolMarkers, applyTool, toolCost, get WW() { return WW; }, get WH() { return WH; }, TUT, UPGRADES, UPG, ITEMS, startBuild, applyUpgrade, makeWave, levelStats, recomputeMods, sellCard, upgradePicks, cardMultNow, openModal, queueModal, renderDeckTiles, saveRun, loadSave, resumeRun, clearSave, upgradeItem, removeItem, waveCurve, waveBase, computeBRooms, inB, decoyAlarm, guildAdapt, quietNow, setUser: v => { userStarted = v; }, get userStarted() { return userStarted; }, ignite, trapBoost, calmReady, landFallen, fall, planBreach: () => planBreach(), tutAnySpot, galleryK, stealNeed, portraitRooms, addFear, setTab: t => { tab = t; updateTray(); }, undo, pushUndo, get undoN() { return undoStack.length; }, setTrayOpen, UI, moveItem, moveTarget, setMode: (m, k) => { selected = m; movingKey = k || null; updateTray(); }, get selected() { return selected; }, get movingKey() { return movingKey; }, rankOf, dungeonBounds, regroupAtDoor: () => regroupAtDoor(),
    patchBreach, chooseEntrance, useCharm, useAmulet, useBoots, giveItem, dropItem, pickup, itemValue, getLost, maybeDetour, lostChance, checkPos, CHECK_SHAPE, isRt, rtOf, nbrRooms, roomCount, sizeMult,
    rollItem, curse, comboNow, kill: (h, k, a) => kill(h, k, a), damage, loadRecords, BREACH_PATCH, HITEMS, LOOT_KIND, noticeLoot, lootDecision, leader, alive, heroExit, driftTarget, SCARE, CURSED, DRIFT, TABS, objTargetOk, roomOf, dropCarry, holdRemove, buildTap,
    get movingObj() { return movingObj; }
  };
})();
</script>
