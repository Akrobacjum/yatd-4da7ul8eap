
  /* ================= state ================= */
  let S = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem('yatd12-settings') || 'null');
    // 1.08 (author): quiet ×2,5 and a held finger ×5 for everyone, once: older saves kept the speeds of their day (e.g. quiet ×2);
    // 1.09 (author: more time to watch the heroes): quiet ×1,5 and a held finger ×3, once again for everyone
    const speeds108 = saved && saved.speedsV !== 109 ? ['autoFF', 'ffSpeed'] : [];
    if (saved) { GAME_SETTINGS.forEach(sd => { if (typeof saved[sd.k] === 'number' && !speeds108.includes(sd.k)) S[sd.k] = saved[sd.k]; }); }   // v14: no balance sliders, so only the player's own settings come back
    else {   // new balance (v12): from older saves keep only personal settings, so old slider values do not override the new defaults
      const old = JSON.parse(localStorage.getItem('yatd11-settings') || localStorage.getItem('yatd10-settings') || localStorage.getItem('yatd8-settings') || localStorage.getItem('yatd7-settings') || 'null');
      if (old) ['volume', 'checkDiff'].forEach(k => { if (typeof old[k] === 'number') S[k] = old[k]; });
    }
  } catch (e) {}
  S.speedsV = 109;   // saved with the settings from now on
  let playerName = '';
  try { playerName = localStorage.getItem('yatd-name') || ''; } catch (e) {}
  // 1.24 (D, P0-5; two testers shared one device, two runs had no name): playerId, made the first time a name is used (or the
  // name prompt is skipped) and kept on the device with that name ('yatd-player'); a different name on this device = a new id
  let pidMem = null;
  function playerIdNow() {
    const nm = (playerName || '').trim().slice(0, 40);
    let rec = pidMem;
    try { rec = JSON.parse(localStorage.getItem('yatd-player') || 'null') || pidMem; } catch (e) {}
    if (!rec || typeof rec.id !== 'string' || (rec.name || '') !== nm) {
      rec = { name: nm, id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) };
      try { localStorage.setItem('yatd-player', JSON.stringify(rec)); } catch (e) {}
    }
    pidMem = rec; return rec.id;
  }
  function loadBest() { try { return parseInt(localStorage.getItem('yatd15-best') || '0', 10) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem('yatd15-best', String(Math.round(v))); } catch (e) {} }

  let run = null, fl = null, mods = null;
  let selected = null, paused = false, ff = false, movingKey = null, movingObj = null, holdInfo = null, carryCache = null;   // v15.1: movingKey / movingObj = the element / piece of furniture in hand (a tap picks it up); holdInfo = a finger held on something (taking it down)
  const uiRects = { list: null };   // canvas areas that react to a tap (the folding hero list)
  let modalOpen = false, modalQueue = [], modalKind = null, curModal = null;
  let floats = [], particles = [], shake = 0, realNow = 0;
  const cam = { s: 24, ox: 0, oy: 0, manualUntil: 0 };
  let cw = 0, ch = 0, DPR = 1, coachInset = 0;   // 1.04: coachInset = how much of the map's top the tutorial coach covers
  let OX = 0, OY = 0, FW = 0, FH = 0;   // 1.24 (B): the canvas covers the whole screen (FW x FH); the camera's view (cw x ch, #stage) starts at OX, OY in it

  const $ = s => document.querySelector(s);
  const cv = $('#cv'), ctx = cv.getContext('2d'), stage = $('#stage');

  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const key = (x, y) => x + ',' + y;
  const fmt2 = v => v.toFixed(2).replace('.', ',');
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function saveSettings() { try { localStorage.setItem('yatd12-settings', JSON.stringify(S)); } catch (e) {} }

  /* ================= database (test log) ================= */
  let dbPromise = null;
  // Prototype 1.0, the web version (GitHub Pages): the same documents go to a small Google Apps Script web app that saves
  // them as files on the author's Google Drive. Its answer cannot be read across sites (no-cors), so a send counts as done
  // unless the network fails.
  function remoteDb(R) {
    const send = (c, id, d) => fetch(R.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ t: R.token, c, id, d }) }).then(() => true);
    return { collection: c => ({ doc: id => ({ set: d => send(c, id, d) }) }) };
  }
  function getDb() {
    if (!dbPromise) {
      dbPromise = (window.claude && typeof window.claude.use === 'function')
        ? Promise.resolve(window.claude.use('db')).catch(() => null)
        : Promise.resolve(window.YATD_REMOTE && window.YATD_REMOTE.url ? remoteDb(window.YATD_REMOTE) : null);
    }
    return dbPromise;
  }
  getDb();

  /* ================= the dungeon layout (lives for the whole run) ================= */
  // Cells hold rooms; edges are corridors between neighbouring cells. Everything random is decided once, when a room or
  // corridor is created, so rebuilding the tile map after a change gives back exactly the same rooms.
  const cellKey = (cx, cy) => cx + ',' + cy;
  const parseCell = k => k.split(',').map(Number);
  const edgeKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  const inGrid = (cx, cy) => cy >= 0;   // above the entrance row is the surface; everything else can be dug
  const inStart = (cx, cy) => cx >= 0 && cy >= 0 && cx < CGX && cy < CGY;
  // The grid follows the dungeon: the leftmost room column is kept at cell 1 and one ring of rock cells stays free
  // (left, right, bottom) for digging. Shifting moves the layout and everything that remembers tile positions.
  function regrid(L) {
    let minCx = Infinity, maxCx = -Infinity, maxCy = 0;
    L.cells.forEach(c => { minCx = Math.min(minCx, c.cx); maxCx = Math.max(maxCx, c.cx); maxCy = Math.max(maxCy, c.cy); });
    const d = 1 - minCx, oldWW = WW, wc = (run && fl && cw > 0) ? camCentre() : null;   // 1.07: the view keeps its spot
    if (d) shiftLayout(L, d);
    WW = (maxCx + d + 2) * CELL + 1; WH = (maxCy + 2) * CELL + 1;
    if (run && (d || WW !== oldWW)) remapRunState(oldWW, d * CELL);
    if (wc) centerOn(wc.x + d * CELL, wc.y);
  }
  function shiftLayout(L, d) {
    const dx = d * CELL, remap = k => { const p = parseCell(k); return cellKey(p[0] + d, p[1]); };
    const cells = new Map(), edges = new Map();
    L.cells.forEach(c => { c.cx += d; c.x0 += dx; c.x1 += dx; c.objs.forEach(o => { o[0] += dx; }); cells.set(cellKey(c.cx, c.cy), c); });
    L.edges.forEach(e => { e.a = remap(e.a); e.b = remap(e.b); if (!e.horiz) { e.pa += dx; e.pb += dx; } e.key = edgeKey(e.a, e.b); edges.set(e.key, e); });
    L.cells = cells; L.edges = edges; L.entrance = remap(L.entrance); if (L.heartKey) L.heartKey = remap(L.heartKey); L.entX += dx;
    if (L.breach) { L.breach.x += dx; L.breach.cell = remap(L.breach.cell); }   // the breach stays open across waves, so it moves with the map
  }
  function remapRunState(oldWW, dx) {
    const items = [...run.items.values()]; run.items.clear();
    items.forEach(it => { it.x += dx; if (it.gx !== undefined) it.gx += dx; run.items.set(key(it.x, it.y), it); });
    const RU = run.rumor, tiles = new Map(), traps = new Map();
    RU.tiles.forEach((w, i) => { const x = i % oldWW, y = Math.floor(i / oldWW); tiles.set(y * WW + x + dx, w); });
    RU.traps.forEach((v, k) => { const p = k.split(',').map(Number); traps.set(key(p[0] + dx, p[1]), v); });
    RU.tiles = tiles; RU.traps = traps;
  }
  function newRoomSpec(cx, cy) {
    const w = rand(3, 5), h = rand(3, 5), ox = cx * CELL, oy = cy * CELL;
    const x0 = ox + 2 + rand(0, 5 - w), y0 = oy + 2 + rand(0, 5 - h);
    return { cx, cy, x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, objs: [], lvl: 0, born: run ? run.wave : 0 };
  }
  // doors of a corridor, from its stored bend coordinates
  function edgeDoors(L, e) {
    const A = L.cells.get(e.a), B = L.cells.get(e.b);
    return e.horiz ? [[A.x1 + 1, e.pa, e.a], [B.x0 - 1, e.pb, e.b]] : [[e.pa, A.y1 + 1, e.a], [e.pb, B.y0 - 1, e.b]];
  }
  function cellDoors(L, k) {
    const out = [];
    L.edges.forEach(e => { if (e.a === k || e.b === k) edgeDoors(L, e).forEach(d => { if (d[2] === k) out.push(d); }); });
    if (k === L.entrance) { const c = L.cells.get(k); out.push([L.entX, c.y0 - 1, k]); }
    return out;
  }
  const heartTile = L => { const c = L.cells.get(L.heartKey); return [Math.floor((c.x0 + c.x1) / 2), Math.floor((c.y0 + c.y1) / 2)]; };
  const objAt = (c, x, y) => c.objs.some(o => o[0] === x && o[1] === y);
  // A new corridor between two cells: pick door rows/columns whose inside tile is free (no furniture, not the heart).
  function makeEdge(L, ka, kb) {
    let A = L.cells.get(ka), B = L.cells.get(kb);
    const horiz = A.cy === B.cy;
    if ((horiz && A.cx > B.cx) || (!horiz && A.cy > B.cy)) { const t = ka; ka = kb; kb = t; A = L.cells.get(ka); B = L.cells.get(kb); }
    const ht = L.heartKey ? heartTile(L) : [-9, -9];
    const free = (c, x, y) => !objAt(c, x, y) && !(x === ht[0] && y === ht[1]);
    let pa, pb;
    if (horiz) {
      const ra = [], rb = [];
      for (let y = A.y0; y <= A.y1; y++) if (free(A, A.x1, y)) ra.push(y);
      for (let y = B.y0; y <= B.y1; y++) if (free(B, B.x0, y)) rb.push(y);
      if (!ra.length || !rb.length) return null;
      pa = pick(ra); pb = pick(rb);
    } else {
      const ra = [], rb = [];
      for (let x = A.x0; x <= A.x1; x++) if (free(A, x, A.y1)) ra.push(x);
      for (let x = B.x0; x <= B.x1; x++) if (free(B, x, B.y0)) rb.push(x);
      if (!ra.length || !rb.length) return null;
      pa = pick(ra); pb = pick(rb);
    }
    const e = { key: edgeKey(ka, kb), a: ka, b: kb, horiz, pa, pb, lvl: 0, born: run ? run.wave : 0 };
    L.edges.set(e.key, e);
    return e;
  }
  // Furniture: blocks walking and offers "object" slots; never seals a room off and never sits next to a door or the heart.
  function genFurniture(L, k) {
    const c = L.cells.get(k);
    const doors = cellDoors(L, k), ht = heartTile(L);
    const tiles = [];
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) tiles.push([x, y]);
    const blocked = (x, y) => doors.some(d => Math.abs(d[0] - x) + Math.abs(d[1] - y) <= 1) || Math.abs(x - ht[0]) + Math.abs(y - ht[1]) <= 1;
    const connected = () => {
      const free = tiles.filter(t => !objAt(c, t[0], t[1]) && !(t[0] === ht[0] && t[1] === ht[1])).map(t => key(t[0], t[1]));
      const set = new Set(free), seen = new Set([free[0]]), q = [free[0]];
      while (q.length) { const [x, y] = q.pop().split(',').map(Number); for (const d of DIRS) { const kk = key(x + d[0], y + d[1]); if (set.has(kk) && !seen.has(kk)) { seen.add(kk); q.push(kk); } } }
      return seen.size === free.length;
    };
    const area = tiles.length, special = k === L.entrance || k === L.heartKey;
    const n = special ? rand(0, 1) : area >= 20 ? rand(1, 3) : area >= 12 ? rand(0, 2) : rand(0, 1);
    let placed = 0, tries = 0;
    while (placed < n && tries++ < 40) {
      const t = pick(tiles);
      if (objAt(c, t[0], t[1]) || blocked(t[0], t[1])) continue;
      c.objs.push([t[0], t[1], pick(OBJ_KINDS)]);
      if (!connected()) { c.objs.pop(); continue; }
      placed++;
    }
  }
  function layoutDist(L) {
    const dist = new Map([[L.entrance, 0]]), q = [L.entrance], adj = new Map();
    L.cells.forEach((c, k) => adj.set(k, []));
    L.edges.forEach(e => { adj.get(e.a).push(e.b); adj.get(e.b).push(e.a); });
    while (q.length) { const c = q.shift(); adj.get(c).forEach(n => { if (!dist.has(n)) { dist.set(n, dist.get(c) + 1); q.push(n); } }); }
    return dist;
  }
  function allConnected(L, cells, edges) {
    const dist = layoutDist({ entrance: L.entrance, cells, edges });
    return dist.size === cells.size;
  }
  function genStartLayout() {
    for (let attempt = 0; attempt < 3000; attempt++) {
      const N = 3;   // a small start: entrance room, one room, the heart. The player grows it.
      const start = cellKey(rand(0, CGX - 1), 0), keys = [start], has = new Set([start]), pairs = [];
      let guard = 0;
      while (keys.length < N && guard++ < 1000) {
        const from = pick(keys), [fx, fy] = parseCell(from), d = DIRS[rand(0, 3)], tx = fx + d[0], ty = fy + d[1], k = cellKey(tx, ty);
        if (!inStart(tx, ty) || has.has(k)) continue;
        has.add(k); keys.push(k); pairs.push([from, k]);
      }
      if (keys.length < N) continue;
      const pk = new Set(pairs.map(p => edgeKey(p[0], p[1]))), loops = [];
      keys.forEach(k => { const [x, y] = parseCell(k); [[1, 0], [0, 1]].forEach(d => { const k2 = cellKey(x + d[0], y + d[1]); if (has.has(k2) && !pk.has(edgeKey(k, k2))) loops.push([k, k2]); }); });
      if (loops.length && Math.random() < 0.7) pairs.push(pick(loops));
      const L = { cells: new Map(), edges: new Map(), entrance: start, heartKey: null, entX: 0 };
      keys.forEach(k => { const [x, y] = parseCell(k); L.cells.set(k, newRoomSpec(x, y)); });
      // the heart sits in the room farthest from the entrance
      const tmp = { entrance: start, cells: L.cells, edges: new Map(pairs.map(p => [edgeKey(p[0], p[1]), { a: p[0], b: p[1] }])) };
      const dist = layoutDist(tmp), maxD = Math.max(...dist.values());
      if (maxD < N - 1) continue;
      L.heartKey = pick([...dist.keys()].filter(k => dist.get(k) === maxD));
      const e0 = L.cells.get(start); L.entX = rand(e0.x0, e0.x1);
      let ok = true;
      pairs.forEach(p => { if (!makeEdge(L, p[0], p[1])) ok = false; });
      if (!ok) continue;
      L.cells.forEach((c, k) => genFurniture(L, k));
      return L;
    }
    throw new Error('map generation failed');
  }

  /* ================= digging, passages, demolition ================= */
  function digRoom(L, from, tx, ty) {
    const k = cellKey(tx, ty);
    if (!inGrid(tx, ty) || L.cells.has(k) || !L.cells.has(from)) return false;
    L.cells.set(k, newRoomSpec(tx, ty));
    if (!makeEdge(L, from, k)) { L.cells.delete(k); return false; }
    genFurniture(L, k);
    return true;
  }
  function addPassage(L, ka, kb) {
    if (!L.cells.has(ka) || !L.cells.has(kb) || L.edges.has(edgeKey(ka, kb))) return false;
    const [ax, ay] = parseCell(ka), [bx, by] = parseCell(kb);
    if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) return false;
    return !!makeEdge(L, ka, kb);
  }
  function canDemolishRoom(L, k) {
    if (k === L.entrance || k === L.heartKey || !L.cells.has(k)) return false;
    const cells = new Map(L.cells); cells.delete(k);
    const edges = new Map(); L.edges.forEach((e, ek) => { if (e.a !== k && e.b !== k) edges.set(ek, e); });
    return allConnected(L, cells, edges);
  }
  function canDemolishEdge(L, ek) {
    if (!L.edges.has(ek)) return false;
    const edges = new Map(L.edges); edges.delete(ek);
    return allConnected(L, L.cells, edges);
  }
  function demolishRoom(L, k) { L.cells.delete(k); [...L.edges.keys()].forEach(ek => { const e = L.edges.get(ek); if (e.a === k || e.b === k) L.edges.delete(ek); }); }

  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function tint(t, dark) {
    const f = clamp(t, 0, 1) * (ROOM_TINT.length - 1), i = Math.min(ROOM_TINT.length - 2, Math.floor(f)), u = f - i;
    const a = hexToRgb(ROOM_TINT[i]), b = hexToRgb(ROOM_TINT[i + 1]);
    return 'rgb(' + a.map((v, k) => Math.round((v + (b[k] - v) * u) * (dark ? 0.62 : 1))).join(',') + ')';
  }

  // Tile map from the layout. Deterministic: the same layout always gives the same tiles.
  function buildMap(L) {
    regrid(L);
    const tiles = new Uint8Array(WW * WH), roomAt = new Int16Array(WW * WH).fill(-1);
    const dist = layoutDist(L), maxD = Math.max(1, ...dist.values());
    const rooms = [], byCell = new Map();
    L.cells.forEach((c, k) => {
      const d = dist.has(k) ? dist.get(k) : maxD;
      const r = { id: rooms.length, kind: 'room', key: k, cx: c.cx, cy: c.cy, x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, dist: d, doors: [], tiles: [], color: tint(d / maxD), born: c.born, lvl: c.lvl || 0, rt: c.rt || null, rk: c.rk || null };
      rooms.push(r); byCell.set(k, r);
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { tiles[y * WW + x] = FLOOR; roomAt[y * WW + x] = r.id; r.tiles.push([x, y]); }
    });
    const doors = new Map();
    const addDoor = (x, y, a, b, horiz) => {
      tiles[y * WW + x] = DOOR;
      const d = { x, y, a, b, closedUntil: -1, wasClosed: false, entrance: false, horiz };
      doors.set(key(x, y), d); return d;
    };
    L.edges.forEach(e => {
      const A = byCell.get(e.a), B = byCell.get(e.b);
      const hall = { id: rooms.length, kind: 'hall', key: e.key, tiles: [], dist: (A.dist + B.dist) / 2, doors: [], x0: 1e9, y0: 1e9, x1: 0, y1: 0, born: e.born, lvl: e.lvl || 0 };
      const put = (x, y) => {
        const i = y * WW + x;
        if (tiles[i] === FLOOR && roomAt[i] === hall.id) return;
        tiles[i] = FLOOR; roomAt[i] = hall.id; hall.tiles.push([x, y]);
        hall.x0 = Math.min(hall.x0, x); hall.y0 = Math.min(hall.y0, y); hall.x1 = Math.max(hall.x1, x); hall.y1 = Math.max(hall.y1, y);
      };
      let dA, dB;
      if (e.horiz) {
        const ya = e.pa, yb = e.pb, gx = (A.cx + 1) * CELL;
        for (let x = A.x1 + 2; x <= gx; x++) put(x, ya);
        for (let y = Math.min(ya, yb); y <= Math.max(ya, yb); y++) put(gx, y);
        for (let x = gx; x <= B.x0 - 2; x++) put(x, yb);
        dA = addDoor(A.x1 + 1, ya, A.id, hall.id, true); dB = addDoor(B.x0 - 1, yb, B.id, hall.id, true);
      } else {
        const xa = e.pa, xb = e.pb, gy = (A.cy + 1) * CELL;
        for (let y = A.y1 + 2; y <= gy; y++) put(xa, y);
        for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) put(x, gy);
        for (let y = gy; y <= B.y0 - 2; y++) put(xb, y);
        dA = addDoor(xa, A.y1 + 1, A.id, hall.id, false); dB = addDoor(xb, B.y0 - 1, B.id, hall.id, false);
      }
      A.doors.push(dA); B.doors.push(dB); hall.doors.push(dA, dB);
      hall.color = tint(hall.dist / maxD, true);
      rooms.push(hall);
    });
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {   // walls around everything walkable
      if (tiles[y * WW + x] !== ROCK) continue;
      for (const d of DIRS8) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= WW || ny >= WH) continue;
        const t = tiles[ny * WW + nx];
        if (t === FLOOR || t === DOOR) { tiles[y * WW + x] = WALL; break; }
      }
    }
    const r0 = byCell.get(L.entrance), ent = { x: L.entX, y: r0.y0 - 1, ix: L.entX, iy: r0.y0 };
    const entDoor = addDoor(ent.x, ent.y, r0.id, -1, false); entDoor.entrance = true; r0.doors.push(entDoor);
    // a breach: for one wave the guild has tunnelled into another room (see planBreach)
    let breach = null;
    const B = L.breach, BR = B && byCell.get(B.cell);
    if (BR && tiles[B.y * WW + B.x] === WALL && tiles[(B.y + B.oy) * WW + B.x + B.ox] === ROCK) {
      const bd = addDoor(B.x, B.y, BR.id, -1, B.ox !== 0); bd.entrance = true; bd.breach = true; BR.doors.push(bd);
      breach = { x: B.x, y: B.y, ix: B.x - B.ox, iy: B.y - B.oy, room: BR.id };
    }
    const hr = byCell.get(L.heartKey), ht = heartTile(L), heart = { x: ht[0], y: ht[1], room: hr.id };
    const heartAdj = DIRS.map(d => [heart.x + d[0], heart.y + d[1]]).filter(t => tiles[t[1] * WW + t[0]] === FLOOR && roomAt[t[1] * WW + t[0]] === hr.id);
    const objects = new Map();
    L.cells.forEach(c => c.objs.forEach(o => objects.set(key(o[0], o[1]), { kind: o[2], x: o[0], y: o[1], built: !!o[3] })));
    return { tiles, roomAt, rooms, doors, ent, heart, heartAdj, objects, maxD, breach };
  }

  /* ================= map queries ================= */
  const tileAt = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH) ? ROCK : fl.tiles[y * WW + x];
  const isHeart = (x, y) => x === fl.heart.x && y === fl.heart.y;
  const doorClosed = d => d.closedUntil > fl.time;
  const roomOf = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH) ? -1 : fl.roomAt[y * WW + x];
  function wallDirs(x, y) { return DIRS.filter(d => tileAt(x + d[0], y + d[1]) === FLOOR); }
  function slotOf(x, y) {
    const t = tileAt(x, y);
    if (t === FLOOR) { if (isHeart(x, y)) return null; return fl.objects.has(key(x, y)) ? 'object' : 'floor'; }
    if (t === DOOR) { const d = fl.doors.get(key(x, y)); return d && !d.entrance ? 'door' : null; }
    if (t === WALL) return wallDirs(x, y).length ? 'wall' : null;
    return null;
  }
  const blockerAt = (x, y) => { const it = fl.items.get(key(x, y)); return !!(it && BUILDINGS[it.type] && !it.broken); };   // 1.05: a building smashed by a barbarian is rubble you can walk over   // Prototype 1.0: a building stands in the way like a crate
  const walkable = (x, y) => tileAt(x, y) === FLOOR && !isHeart(x, y) && !fl.objects.has(key(x, y)) && !blockerAt(x, y);
  // room types (Pokoje tab): fog, swamp, grotto, crypt, vault
  const rtOf = r => (fl && r >= 0 && fl.rooms[r] && fl.rooms[r].rt) || null;
  const isRt = (r, t) => rtOf(r) === t;
  // 1.15: the komnata of a room (KIND_INFO), and what it does: its family has the level 3 trait (t3), and those already at
  // level 3 get KIND_POW more power (kindPow). A trap counts in the room it serves (slotRoom: a wall trap the room it faces),
  // a monster in the room it stands (floats) for, a door trap (Krata, Zawiasy) in both rooms of its door (slotRoom alone
  // would often give the corridor, and a corridor has no komnata).
  const rkOf = r => (fl && r >= 0 && fl.rooms[r] && fl.rooms[r].rk) || null;
  function servedRooms(type, x, y) { if (ITEMS[type].slot !== 'door') return [slotRoom(type, x, y)]; const dd = fl.doors.get(key(x, y)); return dd ? [dd.a, dd.b] : []; }
  const inKind = it => { const k = it && KIND_OF[it.type]; return !!k && !!fl && servedRooms(it.type, it.x, it.y).some(r => rkOf(r) === k); };
  const t3 = it => !!it && ((it.lvl || 1) >= 3 || inKind(it));
  const kindPow = it => (it.lvl || 1) >= 3 && inKind(it) ? KIND_POW : 1;
  // rooms and corridors right next to a room (through its doors), for the grotto's echo
  function nbrRooms(r) {
    const R = fl && fl.rooms[r]; if (!R) return [];
    if (R.nbrs) return R.nbrs;
    const out = new Set();
    R.doors.forEach(d => [d.a, d.b].forEach(id => {
      if (id < 0 || id === r) return; out.add(id);
      const H = fl.rooms[id]; if (H && H.kind === 'hall') H.doors.forEach(d2 => [d2.a, d2.b].forEach(j => { if (j >= 0 && j !== r) out.add(j); }));
    }));
    R.nbrs = [...out];
    return R.nbrs;
  }
  function roomTilesNear(x, y, R, rid) {
    const Rm = fl.rooms && rid >= 0 ? fl.rooms[rid] : null;
    if (Rm && Rm.tiles) return Rm.tiles.filter(t => Math.hypot(t[0] - x, t[1] - y) <= R && tileAt(t[0], t[1]) === FLOOR);   // 1.03: walk the room, not a 200x200 square (R 99 = the whole room)
    const out = [];
    for (let ty = y - R - 1; ty <= y + R + 1; ty++) for (let tx = x - R - 1; tx <= x + R + 1; tx++) {
      if (tileAt(tx, ty) === FLOOR && roomOf(tx, ty) === rid && Math.hypot(tx - x, ty - y) <= R) out.push([tx, ty]);
    }
    return out;
  }
  // 1.03: an item's area is remembered until the map, the item or the deck changes (the author's 300-item dungeon spent a
  // quarter of every frame here). Arrows, eyes and fire stop at whatever stands in the way: those are always worked out.
  const AREA_MEMO = new WeakMap();
  function areaOf(it) {
    if (it.type === 'arrows' || it.type === 'eyes' || it.type === 'fire') return areaOfRaw(it);   // these stop at anything standing in the way
    const k = it.type + '|' + it.x + '|' + it.y + '|' + (it.lvl || 1) + (t3(it) ? 't' : '') + '|' + mods.portraitR + '|' + mods.powderR + (DRIFT[it.type] ? '|' + Math.floor(it.gx) + '|' + Math.floor(it.gy) : '');
    const m = AREA_MEMO.get(it);
    if (m && m.tiles === fl.tiles && m.k === k) return m.out;
    const out = areaOfRaw(it); AREA_MEMO.set(it, { tiles: fl.tiles, k, out });
    return out;
  }
  function areaOfRaw(it) {
    const out = [], x = it.x, y = it.y;
    const addIf = (tx, ty, doorsToo) => {
      const t = tileAt(tx, ty);
      if (t === FLOOR || (doorsToo && t === DOOR)) out.push([tx, ty]);
    };
    switch (it.type) {
      case 'spikes': case 'gate': case 'trapdoor': case 'cage': case 'decoy': out.push([x, y]); break;
      case 'web': for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) addIf(x + dx, y + dy, true); break;
      case 'arrows': case 'eyes':   // eyes: the same line of sight as an arrow
        wallDirs(x, y).forEach(d => {
          for (let k = 1; k < 12; k++) { const tx = x + d[0] * k, ty = y + d[1] * k; if (!walkable(tx, ty)) break; out.push([tx, ty]); }
        });
        break;
      case 'fire':
        wallDirs(x, y).forEach(d => {
          const px = d[1], py = d[0];
          for (let k = 1; k <= 2; k++) for (let p = -1; p <= 1; p++) { const tx = x + d[0] * k + px * p, ty = y + d[1] * k + py * p; if (walkable(tx, ty)) out.push([tx, ty]); }
        });
        break;
      case 'portrait': {
        const d = wallDirs(x, y)[0]; if (!d) break;
        const rid = roomOf(x + d[0], y + d[1]);
        roomTilesNear(x, y, t3(it) ? 99 : mods.portraitR, rid).forEach(t => out.push(t));   // level 3: Całun grozy
        break;
      }
      case 'mirror': {
        const d = wallDirs(x, y)[0]; if (!d) break;
        roomTilesNear(x, y, t3(it) ? 99 : 3, roomOf(x + d[0], y + d[1])).forEach(t => out.push(t));   // level 3: the whole room
        break;
      }
      case 'bones': { const R = t3(it) ? 2 : 1; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) addIf(x + dx, y + dy, true); break; }
      case 'creak': {   // the doorway and everything up to 2 tiles from it, on both sides
        out.push([x, y]);
        const dd = fl.doors.get(key(x, y)), rs = dd ? [dd.a, dd.b] : [];
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const tx = x + dx, ty = y + dy; if ((dx || dy) && Math.hypot(dx, dy) <= 2.01 && tileAt(tx, ty) === FLOOR && rs.includes(roomOf(tx, ty))) out.push([tx, ty]); }
        break;
      }
      case 'coffin': roomTilesNear(x, y, 2, roomOf(x, y)).forEach(t => out.push(t)); break;
      case 'musicbox': roomTilesNear(x, y, 99, roomOf(x, y)).forEach(t => out.push(t)); break;
      case 'shade': case 'bats': {   // around where the floating monster is right now
        const R = it.type === 'bats' ? (t3(it) ? 3 : 2) : 3, gx = it.gx !== undefined ? it.gx : x + 0.5, gy = it.gy !== undefined ? it.gy : y + 0.5;
        roomTilesNear(Math.floor(gx), Math.floor(gy), R, roomOf(x, y)).forEach(t => out.push(t));
        break;
      }
      case 'powder': { const R = mods.powderR + (t3(it) ? 1 : 0); for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) addIf(x + dx, y + dy, true); break; }
      case 'mimic': DIRS8.forEach(d => addIf(x + d[0], y + d[1], true)); break;
      case 'goblin': case 'ogre': case 'spider': for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) addIf(x + dx, y + dy, true); break;
      case 'archer': roomTilesNear(x, y, 4, roomOf(x, y)).forEach(t => out.push(t)); break;
      case 'shaman': case 'ghost': roomTilesNear(x, y, 99, roomOf(x, y)).forEach(t => out.push(t)); break;
    }
    return out;
  }
  function passable(x, y) {
    const t = tileAt(x, y);
    if (t === FLOOR) return !isHeart(x, y) && !fl.objects.has(key(x, y)) && !blockerAt(x, y);
    if (t === DOOR) { const d = fl.doors.get(key(x, y)); return !d || !doorClosed(d); }
    return false;
  }
  // Dijkstra. Heroes only walk where they know the way (known), and pay extra for danger they know about (avoid = how much they care).
  function bfs(sx, sy, opt) {
    opt = opt || {};
    const N = WW * WH, dist = new Float32Array(N).fill(-1), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const useKnown = opt.known && fl.known, avoidK = opt.noDanger || !fl.danger || fl.fearless ? 0 : (opt.avoid === undefined ? 1 : opt.avoid);
    const cR = opt.costRoom >= 0 ? opt.costRoom : -1;   // 1.22: a room they will not cross if there is another way (notThisWay)
    const heap = [];
    const push = (c, i) => {
      heap.push([c, i]); let k = heap.length - 1;
      while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last; let k = 0;
        for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; }
      }
      return top;
    };
    const s0 = sy * WW + sx; dist[s0] = 0; push(0, s0);
    while (heap.length) {
      const [c, i] = pop();
      if (done[i]) continue; done[i] = 1;
      const cx = i % WW, cy = (i / WW) | 0;
      for (const d of DIRS) {
        const nx = cx + d[0], ny = cy + d[1];
        if (nx < 0 || ny < 0 || nx >= WW || ny >= WH || !passable(nx, ny)) continue;
        const ni = ny * WW + nx;
        if (useKnown && !fl.known[ni]) continue;
        const nc = c + 1 + (avoidK ? Math.min(12, fl.danger[ni] * 3 * avoidK) : 0) + (cR >= 0 && fl.roomAt[ni] === cR ? 20 : 0);
        if (dist[ni] < 0 || nc < dist[ni]) { dist[ni] = nc; prev[ni] = i; push(nc, ni); }
      }
    }
    return { dist, prev };
  }
  function pathFrom(b, target) {
    const p = [];
    let c = target;
    while (c >= 0 && b.prev[c] >= 0) { p.push([c % WW, (c / WW) | 0]); c = b.prev[c]; }
    return p.reverse();
  }
  function shortestPath() {   // the true shortest way in (used by the tutorial and the test bots)
    const b = bfs(fl.ent.x, fl.ent.y, { noDanger: true });
    let best = -1;
    fl.heartAdj.forEach(t => { const i = t[1] * WW + t[0]; if (b.dist[i] >= 0 && (best < 0 || b.dist[i] < b.dist[best])) best = i; });
    return best < 0 ? [] : pathFrom(b, best);
  }

  /* ================= what the heroes know ================= */
  // The party shares one map in their heads: what they were told in the tavern (rumours) plus what they see.
  // A room is seen whole the moment someone steps in (or into its doorway); in a corridor they see a few tiles around them.
  function markKnown(x, y) {
    const i = y * WW + x;
    if (x < 0 || y < 0 || x >= WW || y >= WH || fl.known[i]) return false;
    fl.known[i] = 1; return true;
  }
  function revealRoom(r) {
    const R = fl.rooms[r];
    if (!R) return false;
    let n = false;
    if (R.kind === 'room') {
      for (let y = R.y0 - 1; y <= R.y1 + 1; y++) for (let x = R.x0 - 1; x <= R.x1 + 1; x++) n = markKnown(x, y) || n;
      if (!R.seen) { R.seen = true; fl.stats.rooms++; if (r === fl.heart.room && !fl.heartKnown) { fl.heartKnown = true; fl.heartBy = fl.revealBy; } }   // 1.17: who saw it
    }
    return n;
  }
  function revealAround(x, y, rad) {
    let n = false;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const tx = x + dx, ty = y + dy, t = tileAt(tx, ty);
      if (t === ROCK) continue;
      if (t === FLOOR && roomOf(tx, ty) >= 0 && fl.rooms[roomOf(tx, ty)].kind === 'room' && !(Math.abs(dx) <= 1 && Math.abs(dy) <= 1)) continue;   // rooms are seen only from inside or the doorway
      n = markKnown(tx, ty) || n;
    }
    return n;
  }
  function reveal(h) {
    const x = h.tx, y = h.ty; fl.revealBy = h.id;
    let n = false;
    const r = roomOf(x, y);
    if (tileAt(x, y) === DOOR) {
      const d = fl.doors.get(key(x, y));
      if (d) { [d.a, d.b].forEach(id => { if (id < 0) return; if (fl.rooms[id].kind === 'room') n = revealRoom(id) || n; }); }
      n = revealAround(x, y, 2) || n;
    } else if (r >= 0 && fl.rooms[r].kind === 'room') n = revealRoom(r) || n;
    else n = revealAround(x, y, 3) || n;
    if (n) { fl.knowDirty = true; fl.newKnowAt = fl.time; fl.threatDirty = true; checkGhostRumors(h); }
    return n;
  }
  // A rumoured trap that is not there: once they can see the spot, the false rumour is gone.
  function checkGhostRumors(h) {
    if (!fl.ghosts.length) return;
    const before = fl.ghosts.length;
    fl.ghosts = fl.ghosts.filter(g => !fl.known[g.y * WW + g.x]);
    if (fl.ghosts.length < before) { fl.stats.rumorFalse += before - fl.ghosts.length; fl.threatDirty = true; if (h) say(h, pick(SAY.rumorFalse), 2); }
  }
  // Frontier: tiles they know, next to walkable tiles they do not know yet. That is where exploring goes.
  function frontier() {
    const out = [];
    for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) {
      const i = y * WW + x;
      if (!fl.known[i] || !passable(x, y)) continue;
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1], ni = ny * WW + nx;
        if (!fl.known[ni] && (tileAt(nx, ny) === FLOOR || tileAt(nx, ny) === DOOR)) { out.push(i); break; }
      }
    }
    return out;
  }
