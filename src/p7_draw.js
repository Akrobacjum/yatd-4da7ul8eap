  /* ================= drawing ================= */
  // 1.05 (testers mixed up 2 and 8 in Pixelify Sans): Jersey 10, one weight (no fake bold on the canvas)
  const numFont = (px, bold) => '400 ' + Math.round(px * 1.08) + 'px "Jersey 10", ui-monospace, monospace';
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#060709'; ctx.fillRect(0, 0, cw, ch);
    if (!fl) return;
    const V = splitViews();   // 1.03: one screen, or two halves with a camera each
    withViews(V, T => { drawWorld(T); if (!V) drawOffscreen(T); drawBubbles(T); });
    if (V) drawDivider(V);
    drawOrbs();
    drawCheck(cam.s);
    drawPause();
    drawFF();
  }
  function withViews(V, fn) {   // draw fn once, or once per half (clipped to it, with its camera)
    if (!V) { fn(cam.s); return; }
    const keep = { s: cam.s, ox: cam.ox, oy: cam.oy };
    V.forEach(v => {
      ctx.save(); ctx.beginPath(); v.poly.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
      cam.s = v.s; cam.ox = v.ox; cam.oy = v.oy; fn(cam.s);
      ctx.restore();
    });
    cam.s = keep.s; cam.ox = keep.ox; cam.oy = keep.oy;
  }
  function drawDivider(V) {   // an iron bar along the cut, fading in as the halves part
    const n = [Math.cos(SPLIT.ang), Math.sin(SPLIT.ang)], d = [-n[1], n[0]], c = [cw / 2, ch / 2], L = Math.hypot(cw, ch);
    const line = () => { ctx.beginPath(); ctx.moveTo(c[0] - d[0] * L, c[1] - d[1] * L); ctx.lineTo(c[0] + d[0] * L, c[1] + d[1] * L); ctx.stroke(); };
    ctx.save(); ctx.globalAlpha = V[0].e; ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 10; line();
    ctx.strokeStyle = '#464b53'; ctx.lineWidth = 6; line();
    ctx.strokeStyle = '#1d1f24'; ctx.lineWidth = 4; line();
    ctx.strokeStyle = 'rgba(230,225,214,0.35)'; ctx.lineWidth = 1; line();
    ctx.restore();
  }
  /* ================= 1.07: the world in isometry ================= */
  // The floor and everything painted on it (zones, fog, slots, flat traps) is drawn as before, in tile pixels, through floorT:
  // the floor plane turned and tilted. Walls are boxes. What stands (furniture, monsters, heroes, standing traps) is drawn
  // upright on the screen at its spot of the floor, nearest last.
  function floorT(z) { const T = cam.s, b = R2 * SP; ctx.setTransform(DPR * R2, DPR * b, -DPR * R2, DPR * b, DPR * (WH * R2 * T - cam.ox), DPR * ((HM - (z || 0)) * CP * T - cam.oy)); }
  // 1.07 (author: what is flat lies on a floor or a wall, only the figures face the camera): the unit square on a tile of the
  // floor at height z, turned so that its bottom edge looks the way d points (the art then reads from the room)
  function tileMap(x, y, z, d) {
    floorT(z); const T = cam.s;
    ctx.translate((x + 0.5) * T, (y + 0.5) * T);
    if (d) ctx.rotate(Math.atan2(d[1], d[0]) - Math.PI / 2);
    ctx.scale(T, T); ctx.translate(-0.5, -0.5);
  }
  // a wall trap's own plane: the face towards the room on a full wall, the top of a cut wall (its bottom edge towards the room)
  function wallPlane(it, lift) {   // 1.15: lift = how far off the face (or the lip) it stands
    const w = wallSpot(it), L = lift || 0;
    if (w.face) { const h = wallH(it.x, it.y), z1 = Math.min(h, 1.2), z0 = Math.max(0, z1 - 1); if (w.face[1] === 1) faceMap(it.x, it.y + 1 + L, it.x + 1, it.y + 1 + L, z0, z1); else faceMap(it.x + 1 + L, it.y, it.x + 1 + L, it.y + 1, z0, z1); }   // 1.09: a picture keeps its shape on a high wall
    else tileMap(it.x, it.y, WALL_LIP + L, w.d);
    return w;
  }
  function screenT() { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  // the tiles that can show on screen (with room for walls and figures standing out of them)
  function viewBox() {
    const P = [[0, 0], [cw, 0], [0, ch], [cw, ch]].map(p => fromView((p[0] + cam.ox) / cam.s, (p[1] + cam.oy) / cam.s));
    const xs = P.map(p => p.x), ys = P.map(p => p.y);
    return { x0: clamp(Math.floor(Math.min(...xs)) - 1, 0, WW - 1), y0: clamp(Math.floor(Math.min(...ys)) - 1, 0, WH - 1),
      x1: clamp(Math.ceil(Math.max(...xs)) + 3, 0, WW - 1), y1: clamp(Math.ceil(Math.max(...ys)) + 3, 0, WH - 1) };
  }
  const onScreen = (p, m) => p[0] > -m && p[0] < cw + m && p[1] > -m && p[1] < ch + m * 1.6;
  // 1.07: walls are blocks, and a wall that would hide floor from the camera lies flat (a lip).
  // 1.09 (author): the standing walls are twice as high (1,7 tiles); which walls lie flat stays as it was (worked out for the old
  // height, 0,85, in the wave view), so a room with nobody in it looks as before, only its far walls are higher. A high wall can
  // hide what is behind it, so in a wave every room that stands between the camera and the heroes lies flat whole, and so do
  // the rooms they are in or about to enter. The blocks sink and rise one by one with an ease and a pop of size, in a ripple
  // from the party; a room the party left stands up again a second later.
  const WALL_H = 1.7, WALL_H0 = 0.85, WALL_LIP = 0.06, DOOR_H = 1.25;
  const WALL_ANIM = 0.4, WALL_STAY = 1.0;   // s: one block's move; how long a room stays open after the party leaves
  const WA = { tiles: null, ww: 0, wh: 0, sig: '', focus: new Map(), moving: new Set() };
  function areaAt(x, y) { const r = roomOf(x, y); if (r >= 0) return r; for (const d of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const q = roomOf(x + d[0], y + d[1]); if (q >= 0) return q; } return -1; }
  // per map: which walls stand, which rooms each standing wall would hide (at full height, in the wave view), whose walls they are
  function wallSetup() {
    if (WA.tiles === fl.tiles && WA.ww === WW && WA.wh === WH) return WA;
    const n = WW * WH, stand = new Uint8Array(n), sp = Math.sin(PITCH_RAID * Math.PI / 180), cp = Math.cos(PITCH_RAID * Math.PI / 180);
    const walk = (x, y) => { const t = tileAt(x, y); return t === FLOOR || t === DOOR; };
    const hidesAt = Hs => (dx, dy) => {   // does a wall Hs high (on screen) hide the tile (dx, dy) away from it? (two diamonds overlap by more than a sliver)
      const du = Math.abs(dx - dy) * R2, dv = (dx + dy) * R2 * sp, t = clamp(-dv, 0, Hs);
      return du / R2 + Math.abs(dv + t) / (R2 * sp) < 1.85;
    };
    const hides0 = hidesAt(WALL_H0 * cp), hides1 = hidesAt(WALL_H * cp), RW = Math.ceil(WALL_H * cp / (R2 * sp)) + 1;
    const occ = new Map(), own = new Map(), roomWalls = new Map();
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const i = y * WW + x; if (fl.tiles[i] !== WALL) continue;
      let cut = false;
      for (let dy = -3; dy <= 0 && !cut; dy++) for (let dx = -3; dx <= 0 && !cut; dx++) if ((dx || dy) && walk(x + dx, y + dy) && hides0(dx, dy)) cut = true;
      if (cut) continue;
      stand[i] = 1;
      const hid = new Set();
      for (let dy = -RW; dy <= 0; dy++) for (let dx = -RW; dx <= 0; dx++) if ((dx || dy) && walk(x + dx, y + dy) && hides1(dx, dy)) { const a = areaAt(x + dx, y + dy); if (a >= 0) hid.add(a); }
      if (hid.size) occ.set(i, [...hid]);
      const o = new Set(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tileAt(x + dx, y + dy) === FLOOR) { const a = roomOf(x + dx, y + dy); if (a >= 0) o.add(a); }
      if (o.size) { own.set(i, [...o]); o.forEach(a => { if (!roomWalls.has(a)) roomWalls.set(a, []); roomWalls.get(a).push(i); }); }
    }
    // the torches: on some standing walls, on the face towards a floor
    const torches = [];
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const i = y * WW + x; if (!stand[i] || tileHash(x + 101, y + 37) % 5 !== 0) continue;
      const st = (x2, y2) => x2 >= 0 && y2 >= 0 && x2 < WW && y2 < WH && stand[y2 * WW + x2];
      if (!st(x, y + 1) && tileAt(x, y + 1) === FLOOR) torches.push({ x, y, fx: x + 0.5, fy: y + 1, gx: x + 0.5, gy: y + 1.2, face: 'S' });
      else if (!st(x + 1, y) && tileAt(x + 1, y) === FLOOR) torches.push({ x, y, fx: x + 1, fy: y + 0.5, gx: x + 1.2, gy: y + 0.5, face: 'E' });
    }
    // 1.09 fix (author: walls the party does not touch hopped, flat ones blinked): 64-bit, so a height compares equal to itself
    // (1,7 in 32 bits is not 1,7, and every wall was sent on a move to where it already stood)
    const cur = new Float64Array(n), from = new Float64Array(n), to = new Float64Array(n), t0 = new Float64Array(n), pp = new Float64Array(n);
    for (let i = 0; i < n; i++) if (fl.tiles[i] === WALL) cur[i] = from[i] = to[i] = stand[i] ? WALL_H : WALL_LIP;
    Object.assign(WA, { tiles: fl.tiles, ww: WW, wh: WH, stand, occ, own, roomWalls, torches, cur, from, to, t0, pp, RW, sig: '', focus: new Map(), moving: new Set() });
    return WA;
  }
  // which rooms and halls are open now: where the heroes stand, and past a door they are within 2 tiles of
  function wallFocus() {
    const F = WA.focus, now = realNow;
    if (fl.phase === 'raid') alive().forEach(h => {
      const p = heroPos(h), x = Math.floor(p.x), y = Math.floor(p.y), mark = a => { if (a >= 0) F.set(a, now + WALL_STAY); };
      mark(areaAt(x, y));
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (tileAt(x + dx, y + dy) === DOOR) [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(d => mark(roomOf(x + dx + d[0], y + dy + d[1])));
    });
    else if (fl.phase === 'build') F.clear();
    const open = []; F.forEach((u, a) => { if (u > now) open.push(a); else F.delete(a); });
    return open.sort((a, b) => a - b);
  }
  const easeOutBack = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const easeInBack = p => { const c = 1.7; return (c + 1) * p * p * p - c * p * p; };
  // once a frame: the heights each wall goes to, and the blocks on their way
  function wallTick() {
    const A = wallSetup(), open = wallFocus(), sig = fl.phase + ':' + open.join(',');
    if (sig !== A.sig) {
      A.sig = sig;
      const F = new Set(open), flat = new Set(), between = new Set();
      if (F.size) A.occ.forEach((areas, i) => {
        if (!areas.some(a => F.has(a))) return;
        flat.add(i); (A.own.get(i) || []).forEach(a => { if (!F.has(a)) between.add(a); });   // its rooms stand between the camera and the party
      });
      between.forEach(a => (A.roomWalls.get(a) || []).forEach(i => flat.add(i)));
      const hs = alive().map(h => heroPos(h));
      for (let i = 0; i < WW * WH; i++) {
        if (!A.stand[i]) continue;
        const target = flat.has(i) ? WALL_LIP : WALL_H;
        if (Math.abs(target - A.to[i]) < 1e-6) continue;   // already there or on its way
        const x = i % WW, y = (i - x) / WW;
        let d = 99; hs.forEach(p => { d = Math.min(d, Math.hypot(p.x - x - 0.5, p.y - y - 0.5)); });
        A.from[i] = A.cur[i]; A.to[i] = target; A.t0[i] = realNow + (reduceMotion ? 0 : Math.min(0.3, d * 0.025)); A.moving.add(i);
      }
    }
    A.moving.forEach(i => {
      const p = reduceMotion ? 1 : (realNow - A.t0[i]) / WALL_ANIM;
      if (p <= 0) return;
      if (p >= 1) { A.cur[i] = A.to[i]; A.pp[i] = 0; A.moving.delete(i); return; }
      const up = A.to[i] > A.from[i];
      A.cur[i] = Math.max(WALL_LIP, A.from[i] + (A.to[i] - A.from[i]) * (up ? easeOutBack(p) : easeInBack(p)));
      A.pp[i] = p;
    });
  }
  function wallHeights() { return wallSetup().cur; }
  const wallH = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH || fl.tiles[y * WW + x] !== WALL) ? 0 : wallHeights()[y * WW + x];
  const wallUp = h => h > WALL_LIP + 0.01;   // a standing (or moving) block, not a lip
  // a standing wall in front of a point that would cover something hz high standing there (so it is drawn among the walls)
  function wallCovers(px, py, hz) {
    const A = WA, ox = Math.floor(px), oy = Math.floor(py), R = A.RW || 5;
    const u0 = vX(px, py), vb = vY(px, py, 0), vt = vY(px, py, hz);
    for (let s = 1; s <= 2 * R; s++) for (let dd = -2; dd <= 2; dd++) {
      if ((s + dd) & 1) continue;
      const dx = (s + dd) / 2, dy = (s - dd) / 2, x = ox + dx, y = oy + dy;
      if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
      const i = y * WW + x; if (fl.tiles[i] !== WALL || !wallUp(A.cur[i])) continue;
      if (Math.abs(vX(x + 0.5, y + 0.5) - u0) > R2 + 0.45) continue;
      if (vY(x, y, A.cur[i]) < vb && vY(x + 1, y + 1, 0) > vt) return true;
    }
    return false;
  }
  function poly(pts, fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
  // maps the unit square (u along a to b, v from the top z1 down to z0) onto an upright face of the dungeon
  function faceMap(ax, ay, bx, by, z0, z1) {
    const A = W2S(ax, ay, z1), B = W2S(bx, by, z1), C = W2S(ax, ay, z0);
    ctx.setTransform(DPR * (B[0] - A[0]), DPR * (B[1] - A[1]), DPR * (C[0] - A[0]), DPR * (C[1] - A[1]), DPR * A[0], DPR * A[1]);
  }
  // A box standing on the floor: footprint centred on (cx, cy), w along x, d along y, h high, from z0. Colours: top, south, east.
  function isoBox(cx, cy, w, d, h, top, south, east, z0) {
    z0 = z0 || 0;
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2, z1 = z0 + h;
    if (south) poly([W2S(x0, y1, z0), W2S(x1, y1, z0), W2S(x1, y1, z1), W2S(x0, y1, z1)], south);
    if (east) poly([W2S(x1, y0, z0), W2S(x1, y1, z0), W2S(x1, y1, z1), W2S(x1, y0, z1)], east);
    if (top) poly([W2S(x0, y0, z1), W2S(x1, y0, z1), W2S(x1, y1, z1), W2S(x0, y1, z1)], top);
  }
  function groundShadow(x, y, rx, ry, a) {   // a soft dark ellipse on the floor (screen space)
    const p = W2S(x, y, 0), T = cam.s;
    ctx.fillStyle = 'rgba(0,0,0,' + (a || 0.45) + ')'; ctx.beginPath(); ctx.ellipse(p[0], p[1], rx * T, ry * T * SP, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Walls: the lips are a stone strip in the floor; the standing ones are blocks of stone with a lit south face and a darker east
  // face (the light comes from the left of the screen), courses of mortar, torches and the wall traps on the face towards the room.
  const WALL_TOP = '#3a3c43', WALL_S = '#2c2e34', WALL_E = '#202227', LIP_TOP = '#2b2d33';
  // the lips (and what hangs over them) go first, under everything; the standing blocks come back sorted by depth, to be drawn
  // among what stands (a high wall can hide it)
  function drawWalls(x0, y0, x1, y1, T, wallItems) {
    wallTick();
    const H = WA.cur, ups = [], lips = [];
    const quad = (a, b, c, d) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * WW + x; if (fl.tiles[i] !== WALL) continue;
      const c = W2S(x + 0.5, y + 0.5, 0); if (!onScreen(c, T * 3)) continue;
      if (wallUp(H[i]) || (WA.moving.has(i) && WA.pp[i] > 0)) ups.push(i); else lips.push(i);   // a block still waiting for its turn is drawn as what it is now
    }
    const L = WALL_LIP;
    ctx.beginPath(); lips.forEach(i => { const x = i % WW, y = (i - x) / WW; if (wallH(x, y + 1) < L + 0.001) quad(W2S(x, y + 1, 0), W2S(x + 1, y + 1, 0), W2S(x + 1, y + 1, L), W2S(x, y + 1, L)); }); ctx.fillStyle = WALL_S; ctx.fill();
    ctx.beginPath(); lips.forEach(i => { const x = i % WW, y = (i - x) / WW; if (wallH(x + 1, y) < L + 0.001) quad(W2S(x + 1, y, 0), W2S(x + 1, y + 1, 0), W2S(x + 1, y + 1, L), W2S(x + 1, y, L)); }); ctx.fillStyle = WALL_E; ctx.fill();
    ctx.beginPath(); lips.forEach(i => { const x = i % WW, y = (i - x) / WW; quad(W2S(x, y, L), W2S(x + 1, y, L), W2S(x + 1, y + 1, L), W2S(x, y + 1, L)); }); ctx.fillStyle = LIP_TOP; ctx.fill();
    drawKindLips(lips, T);   // 1.15
    // a fine joint where a lip meets the floor, so the outline of the rooms stays readable
    ctx.strokeStyle = 'rgba(150,155,170,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
    const walkT = (x, y) => { const t = tileAt(x, y); return t === FLOOR || t === DOOR; };
    lips.forEach(i => {
      const x = i % WW, y = (i - x) / WW, edge = (ax, ay, bx, by) => { const a = W2S(ax, ay, L), b = W2S(bx, by, L); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
      if (walkT(x, y - 1)) edge(x, y, x + 1, y);
      if (walkT(x - 1, y)) edge(x, y, x, y + 1);
      if (walkT(x, y + 1)) edge(x, y + 1, x + 1, y + 1);
      if (walkT(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
    });
    ctx.stroke();
    wallItems.forEach(it => { if (!wallUp(wallH(it.x, it.y))) drawWallItem(it, T, false); });
    ups.sort((a, b) => (a % WW + Math.floor(a / WW)) - (b % WW + Math.floor(b / WW)));
    WA.items = wallItems;
    return ups.map(i => ({ i, d: i % WW + Math.floor(i / WW) + 1 }));
  }
  // the standing blocks from a to b (sorted by depth): the still ones in one go (south faces, east faces, mortar, tops, edges),
  // a moving one by itself (it pops out of its tile); then the torches and the wall traps on them
  function drawWallRun(list, a, b, T) {
    const H = WA.cur, quad = (p, q, r, s) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.lineTo(r[0], r[1]); ctx.lineTo(s[0], s[1]); ctx.closePath(); };
    const sOpen = i => { const x = i % WW, y = (i - x) / WW; return wallH(x, y + 1) < H[i] - 0.001; }, eOpen = i => { const x = i % WW, y = (i - x) / WW; return wallH(x + 1, y) < H[i] - 0.001; };
    let run = []; const KWs = kindWalls();
    const flush = () => {
      if (!run.length) return;
      ctx.beginPath(); run.forEach(i => { if (!sOpen(i)) return; const x = i % WW, y = (i - x) / WW, h = H[i]; quad(W2S(x, y + 1, 0), W2S(x + 1, y + 1, 0), W2S(x + 1, y + 1, h), W2S(x, y + 1, h)); }); ctx.fillStyle = WALL_S; ctx.fill();
      ctx.beginPath(); run.forEach(i => { if (!eOpen(i)) return; const x = i % WW, y = (i - x) / WW, h = H[i]; quad(W2S(x + 1, y, 0), W2S(x + 1, y + 1, 0), W2S(x + 1, y + 1, h), W2S(x + 1, y, h)); }); ctx.fillStyle = WALL_E; ctx.fill();
      if (T >= 12) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); run.forEach(i => mortar(i, H[i], sOpen(i), eOpen(i), 1)); ctx.stroke(); }
      ctx.beginPath(); run.forEach(i => { const x = i % WW, y = (i - x) / WW, h = H[i]; quad(W2S(x, y, h), W2S(x + 1, y, h), W2S(x + 1, y + 1, h), W2S(x, y + 1, h)); }); ctx.fillStyle = WALL_TOP; ctx.fill();
      ctx.strokeStyle = 'rgba(205,210,225,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
      run.forEach(i => {
        const x = i % WW, y = (i - x) / WW, h = H[i];
        if (sOpen(i)) { const p = W2S(x, y + 1, h), q = W2S(x + 1, y + 1, h); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
        if (eOpen(i)) { const p = W2S(x + 1, y, h), q = W2S(x + 1, y + 1, h); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      });
      ctx.stroke();
      run.forEach(i => wallDressing(i, T));
      run = [];
    };
    for (let k = a; k < b; k++) {
      const i = list[k].i;
      if (WA.moving.has(i) && WA.pp[i] > 0) { flush(); drawBlockPop(i, T); wallDressing(i, T); }
      else if (wallUp(H[i])) { if (KWs.top[i] || KWs.s[i] || KWs.e[i]) { flush(); drawKindBlock(i, T); wallDressing(i, T); } else run.push(i); }   // 1.15: a komnata's block by itself
    }
    flush();
  }
  // mortar: courses of stone on the open faces (k: the block's size, 1 when still)
  function mortar(i, h, sO, eO, k) {
    const x = i % WW, y = (i - x) / WW, o = (tileHash(x, y) % 3 - 1) * 0.12, c = Math.max(2, Math.round(h / 0.42)), m0 = 0.5 - k / 2, m1 = 0.5 + k / 2;
    if (sO) { const m = (a, za, b, zb) => { const p = W2S(x + a, y + m1, za), q = W2S(x + b, y + m1, zb); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
      for (let j = 1; j < c; j++) m(m0, h * j / c, m1, h * j / c);
      for (let j = 0; j < c; j++) { const u = m0 + k * (j % 2 ? 0.5 + o : 0.25 - o / 2); m(u, h * j / c, u, h * (j + 1) / c); } }
    if (eO) { const m = (a, za, b, zb) => { const p = W2S(x + m1, y + a, za), q = W2S(x + m1, y + b, zb); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
      for (let j = 1; j < c; j++) m(m0, h * j / c, m1, h * j / c);
      for (let j = 0; j < c; j++) { const u = m0 + k * (j % 2 ? 0.5 - o : 0.3 + o / 2); m(u, h * j / c, u, h * (j + 1) / c); } }
  }
  // a block on its way up or down: it grows a little wider in the middle of the move (the pop) and its faces are all shown
  function drawBlockPop(i, T) {
    const x = i % WW, y = (i - x) / WW, h = WA.cur[i], k = 1 + 0.14 * Math.sin(Math.PI * WA.pp[i]), m0 = 0.5 - k / 2, m1 = 0.5 + k / 2;
    const P = (u, v, z) => W2S(x + u, y + v, z), K = kindWalls(), ss = kwStyle(K.s[i]), es = kwStyle(K.e[i]), ts = kwStyle(K.top[i]);   // 1.15: in its komnata's colours
    poly([P(m0, m1, 0), P(m1, m1, 0), P(m1, m1, h), P(m0, m1, h)], ss ? ss.s : WALL_S);
    poly([P(m1, m0, 0), P(m1, m1, 0), P(m1, m1, h), P(m1, m0, h)], es ? es.e : WALL_E);
    if (T >= 12) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); mortar(i, h, true, true, k); ctx.stroke(); }
    poly([P(m0, m0, h), P(m1, m0, h), P(m1, m1, h), P(m0, m1, h)], ts ? ts.top : WALL_TOP);
    ctx.strokeStyle = 'rgba(205,210,225,0.22)'; ctx.lineWidth = 1; ctx.beginPath();
    const a = P(m0, m1, h), b = P(m1, m1, h), c = P(m1, m0, h); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
  }
  /* ================= 1.15: the walls of a komnata (author: walls change with the style too: texture, shape, everything) ================= */
  // A wall takes the stuff of the komnata it looks into: its faces (S, E) the komnata of the room in front of them, its top the
  // komnata of any room it touches. Each komnata has the colours of its faces, top and lips, a texture painted once per kind and
  // variant (an offscreen canvas, laid on the face through faceMap), a little life on some faces (the forge's glow), and a crown
  // on top that changes the outline of its walls (merlons, skulls, rocks, spikes, a cornice, junk...).
  const KIDS = Object.keys(KIND_INFO);
  const KW = { tiles: null, sig: null, ww: 0, s: null, e: null, top: null };
  function kindWalls() {
    const sig = fl.rooms.map(r => r.rk ? r.id + r.rk : '').join('');
    if (KW.tiles === fl.tiles && KW.sig === sig && KW.ww === WW) return KW;
    const n = WW * WH, s = new Int8Array(n), e = new Int8Array(n), top = new Int8Array(n);
    const kAt = (x, y) => { if (tileAt(x, y) !== FLOOR) return 0; const r = roomOf(x, y), R = r >= 0 ? fl.rooms[r] : null; return R && R.kind === 'room' && R.rk ? KIDS.indexOf(R.rk) + 1 : 0; };
    if (sig) for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const i = y * WW + x; if (fl.tiles[i] !== WALL) continue;
      s[i] = kAt(x, y + 1) || (tileAt(x, y + 1) === WALL ? kAt(x, y + 2) : 0);   // across a lip too
      e[i] = kAt(x + 1, y) || (tileAt(x + 1, y) === WALL ? kAt(x + 2, y) : 0);
      top[i] = kAt(x, y + 1) || kAt(x + 1, y) || kAt(x, y - 1) || kAt(x - 1, y) || kAt(x + 1, y + 1) || kAt(x - 1, y - 1) || kAt(x + 1, y - 1) || kAt(x - 1, y + 1);
    }
    Object.assign(KW, { tiles: fl.tiles, sig, ww: WW, s, e, top });
    return KW;
  }
  const kwStyle = k => k ? WALL_STYLE[KIDS[k - 1]] : null;
  // painting helpers for the textures (g: a 2D context scaled to tile units; u across the face 0..1, v down from the top 0..WALL_H)
  const TEX_W = 128, TEX_H = Math.round(128 * WALL_H);
  function texRand(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const per = (g, fn) => { for (const o of [-1, 0, 1]) { g.save(); g.translate(o, 0); fn(); g.restore(); } };   // the face tiles along u
  function facets(g, rnd, cols, rows, base, dark, light, line) {   // raw rock: a jittered grid of facets, shaded one by one
    const J = []; for (let c = 0; c < cols; c++) { J.push([]); for (let r = 0; r <= rows; r++) J[c].push([(rnd() - 0.5) * 0.5 / cols, (rnd() - 0.5) * 0.6 * WALL_H / rows]); }
    const pt = (c, r) => { const j = J[((c % cols) + cols) % cols][r]; return [c / cols + j[0], Math.min(WALL_H, Math.max(0, r * WALL_H / rows + (r === 0 || r === rows ? 0 : j[1])))]; };
    per(g, () => {
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const a = pt(c, r), b = pt(c + 1, r), cc = pt(c + 1, r + 1), d = pt(c, r + 1), q = rnd();
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(cc[0], cc[1]); g.lineTo(d[0], d[1]); g.closePath();
        g.fillStyle = q < 0.45 ? dark.replace('A', (0.08 + 0.2 * rnd()).toFixed(2)) : light.replace('A', (0.03 + 0.08 * rnd()).toFixed(2)); g.fill();
        g.strokeStyle = line; g.lineWidth = 0.014; g.stroke();
        g.strokeStyle = light.replace('A', '0.14'); g.lineWidth = 0.008; g.beginPath(); g.moveTo(a[0] + 0.01, a[1] + 0.01); g.lineTo(b[0], b[1] + 0.01); g.stroke();
      }
    });
    void base;
  }
  function courses(g, rnd, h, w, fills, joint, bevel) {   // dressed stone or brick: courses h high, stones w wide, every other course shifted
    const rows = Math.round(WALL_H / h), salt = Math.floor(rnd() * 1000);
    per(g, () => {
      for (let r = 0; r < rows; r++) {
        const y0 = r * WALL_H / rows, y1 = (r + 1) * WALL_H / rows, off = (r % 2) * w / 2;
        for (let u = -off; u < 1; u += w) {
          g.fillStyle = fills[Math.floor(kH(r * 7 + salt, Math.round((((u % 1) + 1) % 1) * 997), 9) * fills.length) % fills.length]; g.fillRect(u, y0, w, y1 - y0);   // by position, so the stone cut by the edge matches the next block
          if (bevel) { g.fillStyle = 'rgba(255,245,230,0.07)'; g.fillRect(u, y0, w, 0.018); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(u, y1 - 0.02, w, 0.02); }
          g.strokeStyle = joint; g.lineWidth = 0.014; g.strokeRect(u, y0, w, y1 - y0);
        }
      }
    });
  }
  function skullT(g, x, y, s, col, sh, eye) {   // a skull seen from the front (wall textures, crowns)
    g.fillStyle = col; g.beginPath(); g.arc(x, y - s * 0.1, s * 0.5, 0, Math.PI * 2); g.fill(); g.fillRect(x - s * 0.3, y + s * 0.2, s * 0.6, s * 0.28);
    g.fillStyle = sh; g.beginPath(); g.arc(x + s * 0.12, y, s * 0.42, -0.3, 1.4); g.fill();
    g.fillStyle = eye; g.beginPath(); g.ellipse(x - s * 0.19, y - s * 0.06, s * 0.13, s * 0.15, 0, 0, Math.PI * 2); g.ellipse(x + s * 0.19, y - s * 0.06, s * 0.13, s * 0.15, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x, y + s * 0.08); g.lineTo(x - s * 0.06, y + s * 0.2); g.lineTo(x + s * 0.06, y + s * 0.2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (let k = -1; k <= 1; k++) g.fillRect(x + k * s * 0.13 - s * 0.02, y + s * 0.3, s * 0.04, s * 0.16);
  }
  function boneT(g, x, y, len, w, col) {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - len / 2, y); g.lineTo(x + len / 2, y); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = col; [-1, 1].forEach(e => [-1, 1].forEach(sd => { g.beginPath(); g.arc(x + e * len / 2, y + sd * w * 0.45, w * 0.62, 0, Math.PI * 2); g.fill(); }));
  }
  const WALL_STYLE = {
    goblin: { s: '#5a4630', e: '#463624', top: '#4f4030', lip: '#463a28',
      tex(g, rnd, v) {   // packed earth in bands, pebbles, roots from above, a timber lintel along the top and here and there a post
        g.fillStyle = '#5a4630'; g.fillRect(0, 0, 1, WALL_H);
        for (let k = 0; k < 5; k++) { const y = 0.28 + k * 0.29, a = rnd() * 6; g.fillStyle = k % 2 ? 'rgba(36,24,12,0.28)' : 'rgba(140,112,70,0.16)'; g.beginPath(); g.moveTo(0, y);
          for (let u = 0; u <= 1.001; u += 0.05) g.lineTo(u, y + 0.03 * Math.sin(u * Math.PI * 4 + a) + 0.02 * Math.sin(u * Math.PI * 2 + k)); for (let u = 1; u >= -0.001; u -= 0.05) g.lineTo(u, y + 0.13 + 0.03 * Math.sin(u * Math.PI * 4 + a + 1)); g.fill(); }
        per(g, () => { for (let k = 0; k < 14; k++) { const x = rnd(), y = 0.2 + rnd() * 1.4, r = 0.012 + rnd() * 0.022; g.fillStyle = 'rgba(20,12,6,0.4)'; g.beginPath(); g.ellipse(x + 0.006, y + 0.008, r, r * 0.75, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(160,138,104,0.75)'; g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0, 0, 7); g.fill(); } });
        per(g, () => { for (let k = 0; k < 3; k++) { let x = 0.15 + 0.3 * k + rnd() * 0.1, y = 0.1; g.strokeStyle = '#3a2614'; g.lineWidth = 0.018; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 5; s++) { x += (rnd() - 0.5) * 0.08; y += 0.08 + rnd() * 0.06; g.lineTo(x, y); if (rnd() < 0.4) { g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 0.12, y + 0.06); g.moveTo(x, y); } } g.stroke(); } });
        g.fillStyle = '#5e4024'; g.fillRect(0, 0.02, 1, 0.12); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0.12, 1, 0.025); g.fillStyle = 'rgba(255,220,170,0.1)'; g.fillRect(0, 0.02, 1, 0.02);
        g.strokeStyle = 'rgba(30,18,8,0.4)'; g.lineWidth = 0.006; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(0, 0.05 + k * 0.03); g.lineTo(1, 0.05 + k * 0.03 + 0.01); } g.stroke();
        if (v === 0) { g.fillStyle = '#6e4c2a'; g.fillRect(0.02, 0.12, 0.11, WALL_H); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0.11, 0.12, 0.02, WALL_H); g.strokeStyle = 'rgba(30,18,8,0.4)'; g.beginPath(); g.moveTo(0.05, 0.2); g.lineTo(0.05, WALL_H); g.moveTo(0.08, 0.3); g.lineTo(0.08, WALL_H); g.stroke();
          g.fillStyle = '#9a9aa0'; [[0.075, 0.08], [0.075, 0.3]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 0.012, 0, 7); g.fill(); }); }
        else { g.fillStyle = 'rgba(150,215,80,0.5)'; g.beginPath(); g.ellipse(0.62, 0.95, 0.06, 0.05, 0.2, 0, 7); g.fill(); for (let f = 0; f < 4; f++) { const a = -2.5 + f * 0.42; g.beginPath(); g.ellipse(0.62 + Math.cos(a) * 0.1, 0.95 + Math.sin(a) * 0.1, 0.016, 0.04, a + Math.PI / 2, 0, 7); g.fill(); } }
      },
      crown(x, y, h, T, t, i) {   // earth heaped on the top, a tuft of roots
        const r = tileHash(x * 7 + 3, y * 5 + 1);
        for (let k = 0; k < 2; k++) { const cx = x + 0.3 + 0.4 * ((r >> (k * 3)) % 7) / 6, cy = y + 0.3 + 0.4 * ((r >> (k * 3 + 1)) % 5) / 4, p = W2S(cx, cy, h), s = T * (0.2 + 0.07 * k);
          ctx.fillStyle = '#4a3a26'; ctx.beginPath(); ctx.moveTo(p[0] - s, p[1]);
          for (let j = 1; j < 8; j++) { const a = Math.PI + j * Math.PI / 8, q = 0.75 + 0.35 * (((r >> j) & 3) / 3); ctx.lineTo(p[0] + Math.cos(a) * s, p[1] + Math.sin(a) * s * 0.55 * q); }
          ctx.lineTo(p[0] + s, p[1]); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,220,170,0.1)'; ctx.beginPath(); ctx.ellipse(p[0] - s * 0.3, p[1] - s * 0.3, s * 0.35, s * 0.12, -0.2, 0, 7); ctx.fill();
          ctx.strokeStyle = '#6a8a3a'; ctx.lineWidth = Math.max(1, T * 0.018); ctx.beginPath(); for (let j = 0; j < 3; j++) { const bx = p[0] - s * 0.3 + j * s * 0.3, by = p[1] - s * 0.3; ctx.moveTo(bx, by); ctx.lineTo(bx + (j - 1) * s * 0.15, by - s * 0.45); } ctx.stroke(); }
        if (r % 3 === 0) { const p = W2S(x + 0.6, y + 0.4, h); ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(1, T * 0.025); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] + T * 0.1, p[1] - T * 0.2, p[0] + T * 0.04, p[1] - T * 0.32); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] - T * 0.12, p[1] - T * 0.12, p[0] - T * 0.16, p[1] - T * 0.22); ctx.stroke(); }
      } },
    spider: { s: '#2a2632', e: '#1f1c26', top: '#3a3644', lip: '#2c2834',
      tex(g, rnd, v) {   // dark stone smothered in silk: sheets hanging from the top, strands across; a cocoon, or eggs
        g.fillStyle = '#2a2632'; g.fillRect(0, 0, 1, WALL_H);
        courses(g, rnd, 0.43, 0.5, ['#2c2834', '#29252f', '#302b38'], 'rgba(0,0,0,0.4)', false);
        per(g, () => { for (let k = 0; k < 4; k++) { const a = rnd() * 0.9 - 0.1, b = a + 0.25 + rnd() * 0.3, d = 0.35 + rnd() * 0.7; g.fillStyle = 'rgba(226,222,238,' + (0.1 + rnd() * 0.08).toFixed(2) + ')'; g.beginPath(); g.moveTo(a, 0); g.lineTo(b, 0); g.quadraticCurveTo(b - 0.02, d * 0.7, (a + b) / 2, d); g.quadraticCurveTo(a + 0.02, d * 0.7, a, 0); g.fill(); } });
        g.strokeStyle = 'rgba(236,232,248,0.28)'; g.lineWidth = 0.006;
        per(g, () => { g.beginPath(); for (let k = 0; k < 9; k++) { const u = rnd(), y = rnd() * 1.4; g.moveTo(u, y); g.lineTo(u + 0.2 + rnd() * 0.3, y + (rnd() - 0.3) * 0.5); } g.stroke(); });
        if (v === 1) { g.strokeStyle = 'rgba(236,232,248,0.6)'; g.lineWidth = 0.008; g.beginPath(); g.moveTo(0.55, 0); g.lineTo(0.55, 0.8); g.stroke();
          g.fillStyle = '#d8d2c4'; g.beginPath(); g.ellipse(0.55, 1.05, 0.09, 0.25, 0.06, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(0.58, 1.08, 0.05, 0.22, 0.06, 0, 7); g.fill();
          g.strokeStyle = 'rgba(140,130,120,0.7)'; g.lineWidth = 0.008; g.beginPath(); for (let k = 0; k < 7; k++) { const y = 0.86 + k * 0.06; g.moveTo(0.47, y); g.lineTo(0.63, y + 0.04); } g.stroke(); }
        else { g.fillStyle = '#e8e2d2'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(0.2 + (k % 3) * 0.045 + (k > 2 ? 0.02 : 0), 1.55 - (k > 2 ? 0.04 : 0), 0.026, 0, 7); g.fill(); } }
      },
      crown(x, y, h, T, t) {   // a veil of silk over the top, pulled up into a tent of strands here and there
        const p = W2S(x + 0.5, y + 0.5, h), r = tileHash(x * 3 + 5, y * 11 + 2);
        if (r % 3 === 0) [[0.35, 0.4], [0.5, 0.55], [0.62, 0.42]].forEach(([u, w], k) => pBall(x + u, y + w, h - 0.01, 0.05 + 0.01 * k, '#eee8da', 'rgba(150,140,160,0.35)'));   // egg sacs left on the top (no more strand tents)
        void p;
      } },
    ogre: { s: '#4a3a30', e: '#36291f', top: '#4e3e32', lip: '#3e3026',
      tex(g, rnd, v) {   // raw rock of a cave, no mortar: facets; dried blood; or a hollow
        g.fillStyle = '#4a3a30'; g.fillRect(0, 0, 1, WALL_H);
        facets(g, rnd, 3, 5, '#4a3a30', 'rgba(14,8,4,A)', 'rgba(220,190,160,A)', 'rgba(16,10,6,0.55)');
        if (v === 1) { g.fillStyle = 'rgba(110,18,14,0.55)'; g.beginPath(); g.ellipse(0.45, 0.95, 0.12, 0.07, 0.3, 0, 7); g.fill(); g.strokeStyle = 'rgba(100,16,12,0.5)'; g.lineWidth = 0.02; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(0.36 + k * 0.06, 0.98); g.lineTo(0.36 + k * 0.06 + (rnd() - 0.5) * 0.03, 1.05 + rnd() * 0.25); } g.stroke(); }
        else { g.fillStyle = 'rgba(8,4,2,0.8)'; g.beginPath(); g.ellipse(0.6, 1.2, 0.13, 0.09, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(220,190,160,0.15)'; g.lineWidth = 0.012; g.beginPath(); g.ellipse(0.6, 1.2, 0.13, 0.09, 0, Math.PI, 0); g.stroke(); }
      },
      crown(x, y, h, T) { rockCrown(x, y, h, T, ['#5a4838', '#3e3026', '#2c2018'], 2, 0.34); } },
    haunt: { s: '#46505e', e: '#323a46', top: '#4c5462', lip: '#3a424e',
      tex(g, rnd, v) {   // cold pale ashlar, frost along the top; a blind pointed arch with a glow inside, or a long crack
        g.fillStyle = '#46505e'; g.fillRect(0, 0, 1, WALL_H);
        courses(g, rnd, 0.34, 0.5, ['#4a5462', '#434d5b', '#4e5867', '#46505e'], 'rgba(10,16,26,0.45)', true);
        if (v === 0) {
          const gl = g.createRadialGradient(0.5, 1.0, 0.02, 0.5, 1.0, 0.35); gl.addColorStop(0, 'rgba(170,230,255,0.25)'); gl.addColorStop(1, 'rgba(170,230,255,0)');
          g.fillStyle = 'rgba(8,14,24,0.55)'; g.beginPath(); g.moveTo(0.24, WALL_H); g.lineTo(0.24, 0.8); g.quadraticCurveTo(0.26, 0.48, 0.5, 0.38); g.quadraticCurveTo(0.74, 0.48, 0.76, 0.8); g.lineTo(0.76, WALL_H); g.fill();
          g.fillStyle = gl; g.fillRect(0.24, 0.38, 0.52, WALL_H);
          g.strokeStyle = 'rgba(190,226,250,0.35)'; g.lineWidth = 0.02; g.beginPath(); g.moveTo(0.21, WALL_H); g.lineTo(0.21, 0.8); g.quadraticCurveTo(0.23, 0.45, 0.5, 0.34); g.quadraticCurveTo(0.77, 0.45, 0.79, 0.8); g.lineTo(0.79, WALL_H); g.stroke();
        } else { g.strokeStyle = 'rgba(6,10,18,0.8)'; g.lineWidth = 0.016; g.beginPath(); let x = 0.4, y = 0.15; g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (rnd() - 0.5) * 0.14; y += 0.12 + rnd() * 0.05; g.lineTo(x, y); } g.stroke(); }
        per(g, () => { g.fillStyle = 'rgba(226,246,255,0.42)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(1, 0); for (let u = 1; u >= -0.001; u -= 0.0625) g.lineTo(u, 0.06 + (Math.round(u * 16) % 3 === 0 ? 0.08 + 0.06 * ((u * 37) % 1) : 0.02)); g.fill(); });
      },
      crown(x, y, h, T, t) {   // a broken stone resting askew, frost on the edges
        const r = tileHash(x * 13 + 1, y * 3 + 7);
        if (r % 3 === 0) isoBox(x + 0.35 + (r % 5) * 0.06, y + 0.4, 0.34, 0.3, 0.16, '#5e6876', '#46505e', '#323a46', h);
        const a = W2S(x, y + 1, h), b = W2S(x + 1, y + 1, h), c = W2S(x + 1, y, h); ctx.strokeStyle = 'rgba(226,246,255,0.45)'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      } },
    bats: { s: '#2c2436', e: '#1f1928', top: '#342b3e', lip: '#28202f',
      tex(g, rnd, v) {   // dark rock of a cave, holes to roost in, white droppings running down
        g.fillStyle = '#2c2436'; g.fillRect(0, 0, 1, WALL_H);
        facets(g, rnd, 3, 4, '#2c2436', 'rgba(6,2,10,A)', 'rgba(200,180,230,A)', 'rgba(8,4,12,0.55)');
        const holes = [[0.3, 0.45], [0.72, 0.85]]; if (v === 1) holes.push([0.42, 1.25]);
        holes.forEach(([x, y], k) => {
          g.fillStyle = 'rgba(4,2,8,0.92)'; g.beginPath(); g.ellipse(x, y, 0.08, 0.06, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(200,180,230,0.15)'; g.lineWidth = 0.01; g.beginPath(); g.ellipse(x, y, 0.08, 0.06, 0, Math.PI, 0); g.stroke();
          g.strokeStyle = 'rgba(226,220,206,0.5)'; g.lineWidth = 0.022; g.beginPath(); let yy = y + 0.06; g.moveTo(x - 0.03, yy); for (let s = 0; s < 4; s++) { yy += 0.07 + rnd() * 0.06; g.lineTo(x - 0.03 + (rnd() - 0.5) * 0.03, yy); } g.stroke();
          g.lineWidth = 0.014; g.beginPath(); g.moveTo(x + 0.03, y + 0.06); g.lineTo(x + 0.035, y + 0.2 + rnd() * 0.2); g.stroke();
          if (v === 1 && k === 0) { g.fillStyle = '#0c0812'; g.beginPath(); g.ellipse(x, y + 0.01, 0.03, 0.035, 0, 0, 7); g.fill(); g.fillStyle = '#ff5a6a'; g.fillRect(x - 0.016, y, 0.01, 0.01); g.fillRect(x + 0.006, y, 0.01, 0.01); }
        });
        per(g, () => { g.fillStyle = 'rgba(226,220,206,0.4)'; for (let k = 0; k < 18; k++) { g.beginPath(); g.arc(rnd(), 0.2 + rnd() * 1.45, 0.006 + rnd() * 0.01, 0, 7); g.fill(); } });
      },
      crown(x, y, h, T) { rockCrown(x, y, h, T, ['#3e3448', '#2a2232', '#1c1624'], 3, 0.4); } },
    ossuary: { s: '#5a5244', e: '#433d32', top: '#6a6252', lip: '#4e483c',
      tex(g, rnd, v) {   // a wall built of skulls and long bones in courses, set in grey mortar
        g.fillStyle = '#4a4438'; g.fillRect(0, 0, 1, WALL_H);
        for (let r = 0; r < 6; r++) {
          const y = 0.15 + r * 0.28;
          if (r % 2 === 0) per(g, () => { for (let n = 0; n < 4; n++) { const x = (n + 0.5 + (r % 4 ? 0.5 : 0)) / 4; if (v === 1 && r === 2 && n === 1) { g.fillStyle = 'rgba(10,8,6,0.85)'; g.beginPath(); g.arc(x, y, 0.1, 0, 7); g.fill(); continue; } skullT(g, x, y, 0.2, '#d9cfb4', 'rgba(150,138,110,0.45)', '#2a2420'); } });
          else per(g, () => { for (let n = 0; n < 2; n++) { const x = (n + 0.5 + (r % 4 === 3 ? 0.25 : 0)) / 2; boneT(g, x, y - 0.045, 0.4, 0.05, '#cfc4a8'); boneT(g, x + 0.04, y + 0.045, 0.4, 0.05, '#c2b698'); } });
        }
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 1, WALL_H);
      },
      topTex(g) { g.fillStyle = '#6a6252'; g.fillRect(0, 0, 1, 1); for (let k = 0; k < 4; k++) boneT(g, 0.5, 0.2 + k * 0.2, 0.7, 0.07, k % 2 ? '#bfb498' : '#cfc4a8'); },
      crown(x, y, h, T) {   // skulls standing along the top: the wall's edge is a row of heads
        const r = tileHash(x * 5 + 2, y * 9 + 4); if (r % 4 === 3) return;
        [[0.3, 0.7], [0.72, 0.32]].forEach(([u, w], k) => { if (k && r % 2) return; const p = W2S(x + u, y + w, h), s = T * 0.3; skullT(ctx, p[0], p[1] - s * 0.42, s, '#d9cfb4', 'rgba(150,138,110,0.5)', '#2a2420'); });
      } },
    armory: { s: '#4a505a', e: '#363b43', top: '#565c66', lip: '#3e434b',
      tex(g, rnd, v) {   // dressed stone with iron straps and rivets; an arrow slit
        courses(g, rnd, 0.425, 0.5, ['#4a505a', '#454b55', '#4f5560', '#484e58'], 'rgba(10,12,16,0.5)', true);
        [0.36, 1.2].forEach(y => { g.fillStyle = '#25282e'; g.fillRect(0, y, 1, 0.075); g.fillStyle = 'rgba(200,210,225,0.18)'; g.fillRect(0, y, 1, 0.012);
          for (let u = 0.1; u < 1; u += 0.2) { g.fillStyle = '#8a919c'; g.beginPath(); g.arc(u, y + 0.038, 0.016, 0, 7); g.fill(); g.fillStyle = '#c9d0da'; g.beginPath(); g.arc(u - 0.005, y + 0.032, 0.006, 0, 7); g.fill(); } });
        if (v === 1) { g.fillStyle = '#0c0d10'; g.fillRect(0.47, 0.55, 0.06, 0.55); g.fillRect(0.4, 0.74, 0.2, 0.05); g.fillStyle = 'rgba(200,210,225,0.15)'; g.fillRect(0.53, 0.55, 0.012, 0.55); }
      },
      topTex(g) { g.fillStyle = '#565c66'; g.fillRect(0, 0, 1, 1); g.strokeStyle = 'rgba(10,12,16,0.45)'; g.lineWidth = 0.025; g.strokeRect(0.04, 0.04, 0.44, 0.92); g.strokeRect(0.52, 0.04, 0.44, 0.44); g.strokeRect(0.52, 0.52, 0.44, 0.44); },
      crown(x, y, h, T) {   // merlons: one stone tooth on each block, the gaps between them make the battlement
        isoBox(x + 0.5, y + 0.5, 0.52, 0.52, 0.28, '#5e6470', '#4a505a', '#363b43', h);
        const a = W2S(x + 0.24, y + 0.76, h + 0.28), b = W2S(x + 0.76, y + 0.76, h + 0.28), c = W2S(x + 0.76, y + 0.24, h + 0.28);
        ctx.strokeStyle = 'rgba(220,228,240,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      } },
    forge: { s: '#5a2e22', e: '#43221a', top: '#2a2220', lip: '#33261f',
      tex(g, rnd, v) {   // brick, blackened with soot from the top, hot near the floor
        courses(g, rnd, 0.142, 0.25, ['#6a3424', '#5e2c1e', '#73402a', '#64301f', '#552818'], 'rgba(30,16,10,0.7)', false);
        const s = g.createLinearGradient(0, 0, 0, 1.0); s.addColorStop(0, 'rgba(8,6,4,0.85)'); s.addColorStop(1, 'rgba(8,6,4,0)'); g.fillStyle = s; g.fillRect(0, 0, 1, 1.0);
        per(g, () => { for (let k = 0; k < 3; k++) { const x = rnd(), w = 0.08 + rnd() * 0.12; g.fillStyle = 'rgba(8,6,4,0.35)'; g.beginPath(); g.moveTo(x - w, 0); g.quadraticCurveTo(x, 0.9, x + w * 0.3, 1.0 + rnd() * 0.3); g.quadraticCurveTo(x + w * 0.5, 0.6, x + w, 0); g.fill(); } });
        const hot = g.createLinearGradient(0, 1.3, 0, WALL_H); hot.addColorStop(0, 'rgba(255,110,40,0)'); hot.addColorStop(1, 'rgba(255,110,40,0.28)'); g.fillStyle = hot; g.fillRect(0, 1.3, 1, 0.4);
        if (v === 1) { g.fillStyle = '#2a2c30'; [0.3, 0.7].forEach(u => { g.fillRect(u - 0.01, 0.55, 0.02, 0.05); g.beginPath(); g.arc(u, 0.62, 0.025, 0, Math.PI); g.lineWidth = 0.012; g.strokeStyle = '#2a2c30'; g.stroke(); }); }
      },
      live(face, h, T, t, x, y) {   // the heat breathes: glowing cracks along the bottom bricks
        const f = 0.55 + 0.45 * Math.sin(t * 4 + x * 1.3 + y) * Math.sin(t * 2.3 + y * 0.7), z = h;
        ctx.strokeStyle = 'rgba(255,' + (120 + 60 * f | 0) + ',40,' + (0.35 + 0.4 * f).toFixed(2) + ')'; ctx.lineWidth = 0.014; ctx.beginPath();
        const r = tileHash(x * 7 + (face === 'S' ? 1 : 2), y * 3 + 5); let u = 0.1 + (r % 5) * 0.12, v = z - 0.05; ctx.moveTo(u, v);
        for (let k = 0; k < 5; k++) { u += ((r >> k) & 1 ? 1 : -1) * 0.06; v -= 0.07; ctx.lineTo(u, v); } ctx.stroke();
      },
      crown(x, y, h, T, t) {   // a chimney on some blocks, glowing inside and breathing smoke
        const r = tileHash(x * 9 + 7, y * 7 + 3); if (r % 4) return;
        isoBox(x + 0.5, y + 0.5, 0.46, 0.46, 0.55, '#2a2220', '#5e2c1e', '#43221a', h);
        const p = W2S(x + 0.5, y + 0.5, h + 0.55), f = 0.7 + 0.3 * Math.sin(t * 7 + x);
        ctx.fillStyle = '#0c0806'; ctx.beginPath(); ctx.ellipse(p[0], p[1], T * 0.12, T * 0.06, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,140,50,' + (0.45 * f).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(p[0], p[1], T * 0.08, T * 0.04, 0, 0, 7); ctx.fill();
        if (!reduceMotion) for (let k = 0; k < 3; k++) { const q = ((t * 0.3 + k / 3 + r * 0.01) % 1); ctx.fillStyle = 'rgba(70,64,60,' + (0.3 * (1 - q)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p[0] + Math.sin(q * 5 + k) * T * 0.08, p[1] - q * T * 0.9, T * (0.06 + 0.12 * q), 0, 7); ctx.fill(); }
      } },
    prison: { s: '#3a3c34', e: '#2a2c25', top: '#44463e', lip: '#33352e',
      tex(g, rnd, v) {   // big rough blocks, damp running down them, moss and slime in the joints; an iron ring, or days scratched
        courses(g, rnd, 0.57, 0.66, ['#3a3c34', '#36382f', '#3f4138', '#34362e'], 'rgba(6,8,4,0.6)', true);
        per(g, () => { for (let k = 0; k < 4; k++) { const x = rnd(), w = 0.04 + rnd() * 0.06, L = 0.4 + rnd() * 1.0; const gr = g.createLinearGradient(0, 0, 0, L); gr.addColorStop(0, 'rgba(8,12,8,0.45)'); gr.addColorStop(1, 'rgba(8,12,8,0)'); g.fillStyle = gr; g.fillRect(x, 0, w, L); } });
        per(g, () => { for (let k = 0; k < 9; k++) { const x = rnd(), y = [0.57, 1.14][k % 2] + (rnd() - 0.5) * 0.04; g.fillStyle = 'rgba(78,108,44,' + (0.35 + rnd() * 0.3).toFixed(2) + ')'; g.beginPath(); g.ellipse(x, y, 0.05 + rnd() * 0.06, 0.02 + rnd() * 0.02, 0, 0, 7); g.fill();
          if (rnd() < 0.5) { g.strokeStyle = 'rgba(110,140,60,0.5)'; g.lineWidth = 0.01; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.005, y + 0.08 + rnd() * 0.12); g.stroke(); } } });
        if (v === 1) { g.fillStyle = '#2c2e33'; g.fillRect(0.45, 0.62, 0.1, 0.08); g.strokeStyle = '#5a5d63'; g.lineWidth = 0.025; g.beginPath(); g.arc(0.5, 0.78, 0.08, 0, 7); g.stroke(); g.strokeStyle = 'rgba(200,205,215,0.2)'; g.lineWidth = 0.01; g.beginPath(); g.arc(0.5, 0.78, 0.08, Math.PI * 1.1, Math.PI * 1.6); g.stroke(); }
        else { g.strokeStyle = 'rgba(220,214,196,0.35)'; g.lineWidth = 0.01; g.beginPath(); for (let n = 0; n < 3; n++) { const x0 = 0.25 + n * 0.16; for (let k = 0; k < 4; k++) { g.moveTo(x0 + k * 0.025, 1.3); g.lineTo(x0 + k * 0.025, 1.42); } g.moveTo(x0 - 0.01, 1.4); g.lineTo(x0 + 0.09, 1.32); } g.stroke(); }
      },
      crown(x, y, h, T) {   // iron spikes along the top
        ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) { const u = 0.2 + k * 0.3, a = W2S(x + u, y + 1 - u, h), b = W2S(x + u, y + 1 - u, h + 0.26);
          ctx.strokeStyle = '#1e2024'; ctx.lineWidth = Math.max(1.5, T * 0.05); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          ctx.fillStyle = '#8a8e96'; ctx.beginPath(); ctx.moveTo(b[0], b[1] - T * 0.09); ctx.lineTo(b[0] - T * 0.035, b[1] + T * 0.01); ctx.lineTo(b[0] + T * 0.035, b[1] + T * 0.01); ctx.fill(); }
        ctx.lineCap = 'butt';
        const a = W2S(x + 0.05, y + 0.95, h + 0.04), b = W2S(x + 0.95, y + 0.05, h + 0.04); ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      } },
    junk: { s: '#5c4630', e: '#463422', top: '#5a4632', lip: '#463826',
      tex(g, rnd, v) {   // a wall of nailed boards, patched; a board across, or a tin sheet over a hole
        const C = ['#6a5034', '#5a432a', '#715638', '#614a30', '#55402a'];
        for (let k = 0; k < 5; k++) { const x = k * 0.2; g.fillStyle = C[Math.floor(rnd() * C.length)]; g.fillRect(x, 0, 0.2, WALL_H);
          g.strokeStyle = 'rgba(40,26,12,0.3)'; g.lineWidth = 0.006; g.beginPath(); for (let l = 0; l < 3; l++) { const gx = x + 0.04 + l * 0.06 + rnd() * 0.02; g.moveTo(gx, 0); g.bezierCurveTo(gx + 0.02, 0.5, gx - 0.02, 1.1, gx + 0.01, WALL_H); } g.stroke();
          g.fillStyle = 'rgba(16,10,4,0.75)'; g.fillRect(x, 0, 0.012, WALL_H);
          g.fillStyle = '#9a9aa0'; [0.16, 1.5].forEach(y => { g.beginPath(); g.arc(x + 0.1, y, 0.012, 0, 7); g.fill(); });
          if (rnd() < 0.35) { g.fillStyle = 'rgba(16,10,4,0.8)'; g.beginPath(); g.ellipse(x + 0.1, 0.4 + rnd(), 0.025, 0.035, 0, 0, 7); g.fill(); } }
        if (v === 0) { g.save(); g.translate(0.5, 0.9); g.rotate(-0.35); g.fillStyle = '#7a5c3a'; g.fillRect(-0.6, -0.06, 1.2, 0.12); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-0.6, 0.05, 1.2, 0.02); g.fillStyle = '#a0a0a6'; [-0.35, 0, 0.35].forEach(u => { g.beginPath(); g.arc(u, 0, 0.014, 0, 7); g.fill(); }); g.restore(); }
        else { g.fillStyle = '#7e8288'; g.fillRect(0.3, 0.7, 0.32, 0.28); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0.3, 0.7, 0.32, 0.03); g.fillStyle = '#3a3c40'; [[0.32, 0.72], [0.6, 0.72], [0.32, 0.96], [0.6, 0.96]].forEach(([u, w]) => { g.beginPath(); g.arc(u, w, 0.01, 0, 7); g.fill(); }); }
      },
      topTex(g, rnd) { const C = ['#6a5034', '#5a432a', '#715638']; for (let k = 0; k < 4; k++) { g.fillStyle = C[k % 3]; g.fillRect(0, k * 0.25, 1, 0.25); g.fillStyle = 'rgba(16,10,4,0.6)'; g.fillRect(0, k * 0.25, 1, 0.015); } },
      crown(x, y, h, T) {   // junk piled on top: a crate, a barrel, a plank stuck up
        const r = tileHash(x * 11 + 3, y * 13 + 7) % 6;
        if (r === 0 || r === 3) { isoBox(x + 0.45, y + 0.5, 0.42, 0.42, 0.38, '#8a6a42', '#6e5232', '#55402a', h); const a = W2S(x + 0.24, y + 0.71, h + 0.19), b = W2S(x + 0.66, y + 0.71, h + 0.19); ctx.strokeStyle = 'rgba(30,18,8,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        else if (r === 1) { const p = W2S(x + 0.5, y + 0.5, h), s = T * 0.2; ctx.fillStyle = '#5e4024'; ctx.fillRect(p[0] - s, p[1] - s * 2, s * 2, s * 2); ctx.fillStyle = '#7a5634'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - s * 2, s, s * 0.45, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3a3c40'; ctx.fillRect(p[0] - s, p[1] - s * 1.55, s * 2, s * 0.14); ctx.fillRect(p[0] - s, p[1] - s * 0.6, s * 2, s * 0.14); }
        else if (r === 4) { const a = W2S(x + 0.4, y + 0.6, h), b = W2S(x + 0.55, y + 0.5, h + 0.6); ctx.strokeStyle = '#6e5232'; ctx.lineWidth = Math.max(2, T * 0.09); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      } },
    gallery: { s: '#6a1e28', e: '#4e1620', top: '#4a3a2e', lip: '#3e2a24',
      tex(g, rnd, v) {   // damask on the upper wall, a gold rail, dark wood panelling below, a skirting board
        g.fillStyle = '#6a1e28'; g.fillRect(0, 0, 1, 1.0);
        g.fillStyle = 'rgba(255,190,150,0.13)';
        per(g, () => { for (let r = 0; r < 4; r++) for (let n = 0; n < 4; n++) { const x = (n + (r % 2) * 0.5 + 0.5) / 4, y = 0.2 + r * 0.24; g.beginPath(); g.moveTo(x, y - 0.09); g.quadraticCurveTo(x + 0.07, y, x, y + 0.09); g.quadraticCurveTo(x - 0.07, y, x, y - 0.09); g.fill(); g.beginPath(); g.arc(x - 0.045, y - 0.05, 0.016, 0, 7); g.arc(x + 0.045, y - 0.05, 0.016, 0, 7); g.fill(); } });
        g.fillStyle = '#c9a24e'; g.fillRect(0, 0.1, 1, 0.022);
        g.fillStyle = '#3e2418'; g.fillRect(0, 1.0, 1, WALL_H - 1.0);
        g.fillStyle = '#c9a24e'; g.fillRect(0, 0.98, 1, 0.05); g.fillStyle = 'rgba(255,240,200,0.35)'; g.fillRect(0, 0.98, 1, 0.012); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 1.03, 1, 0.025);
        [0.05, 0.55].forEach(x => { g.fillStyle = '#4a2c1e'; g.fillRect(x, 1.12, 0.4, 0.44); g.strokeStyle = 'rgba(255,220,180,0.14)'; g.lineWidth = 0.012; g.strokeRect(x + 0.03, 1.15, 0.34, 0.38); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.moveTo(x, 1.56); g.lineTo(x + 0.4, 1.56); g.lineTo(x + 0.4, 1.12); g.stroke(); });
        g.fillStyle = '#24140e'; g.fillRect(0, WALL_H - 0.08, 1, 0.08);
        if (v === 1) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0.2, 0.26, 0.6, 0.56); g.fillStyle = 'rgba(255,190,150,0.06)'; g.fillRect(0.2, 0.26, 0.6, 0.56); }   // where a picture hung once
      },
      topTex(g) { g.fillStyle = '#4a3a2e'; g.fillRect(0, 0, 1, 1); g.strokeStyle = '#8a6e3a'; g.lineWidth = 0.05; g.strokeRect(0.06, 0.06, 0.88, 0.88); g.strokeStyle = 'rgba(255,230,190,0.08)'; g.lineWidth = 0.01; g.beginPath(); g.moveTo(0.1, 0.3); g.bezierCurveTo(0.4, 0.2, 0.5, 0.6, 0.9, 0.5); g.stroke(); },
      crown(x, y, h, T) {   // a cornice: a moulded slab over the edge of the wall, and now and then an urn on it
        isoBox(x + 0.5, y + 0.5, 1.08, 1.08, 0.08, '#5e4a36', '#a8843e', '#76602e', h);
        const a = W2S(x - 0.04, y + 1.04, h + 0.035), b = W2S(x + 1.04, y + 1.04, h + 0.035), c = W2S(x + 1.04, y - 0.04, h + 0.035);
        ctx.strokeStyle = 'rgba(255,226,160,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
        if (tileHash(x * 3 + 9, y * 5 + 1) % 5 === 0) { const p = W2S(x + 0.5, y + 0.5, h + 0.08), s = T * 0.13; ctx.fillStyle = '#c9a24e'; ctx.beginPath(); ctx.moveTo(p[0] - s * 0.6, p[1]); ctx.lineTo(p[0] + s * 0.6, p[1]); ctx.lineTo(p[0] + s * 0.4, p[1] - s * 0.5); ctx.quadraticCurveTo(p[0] + s * 1.2, p[1] - s * 1.6, p[0] + s * 0.5, p[1] - s * 2.4); ctx.lineTo(p[0] - s * 0.5, p[1] - s * 2.4); ctx.quadraticCurveTo(p[0] - s * 1.2, p[1] - s * 1.6, p[0] - s * 0.4, p[1] - s * 0.5); ctx.fill();
          ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.fillRect(p[0] - s * 0.35, p[1] - s * 2, s * 0.15, s * 1.2); }
      } },
    nursery: { s: '#9a8090', e: '#76626e', top: '#685a64', lip: '#584c54',
      tex(g, rnd, v) {   // faded striped paper, a frieze of little stars, polka dots below, a white skirting; torn, or scribbled on
        for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#a48898' : '#8e9e94'; g.fillRect(k / 6, 0, 1 / 6, 0.95); }
        g.fillStyle = 'rgba(255,250,240,0.08)'; for (let k = 0; k < 6; k++) g.fillRect(k / 6 + 0.02, 0, 0.012, 0.95);
        g.fillStyle = '#cfc2aa'; g.fillRect(0, 0.95, 1, 0.13); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 1.08, 1, 0.015);
        const SC = ['#e8c86a', '#e58aa8', '#7fc6a4', '#8ea6e8'];
        for (let k = 0; k < 4; k++) { const x = (k + 0.5) / 4, y = 1.015, s = 0.035; g.fillStyle = SC[k]; g.beginPath(); for (let p = 0; p < 10; p++) { const a = -Math.PI / 2 + p * Math.PI / 5, rr = p % 2 ? s * 0.45 : s; p ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
        g.fillStyle = '#9c8090'; g.fillRect(0, 1.095, 1, WALL_H - 1.095);
        g.fillStyle = 'rgba(255,240,245,0.22)'; for (let r = 0; r < 4; r++) for (let n = 0; n < 5; n++) { g.beginPath(); g.arc((n + (r % 2) * 0.5 + 0.25) / 5, 1.17 + r * 0.11, 0.016, 0, 7); g.fill(); }
        g.fillStyle = '#d8d0c4'; g.fillRect(0, WALL_H - 0.1, 1, 0.1); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, WALL_H - 0.1, 1, 0.012);
        if (v === 1) { g.fillStyle = '#3a3436'; g.beginPath(); g.moveTo(0.55, 0.2); g.lineTo(0.85, 0.25); g.lineTo(0.7, 0.62); g.closePath(); g.fill(); g.fillStyle = '#c2a8b6'; g.beginPath(); g.moveTo(0.55, 0.2); g.quadraticCurveTo(0.62, 0.5, 0.7, 0.62); g.quadraticCurveTo(0.6, 0.48, 0.5, 0.45); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(0.55, 0.2); g.quadraticCurveTo(0.62, 0.5, 0.7, 0.62); g.lineTo(0.66, 0.6); g.closePath(); g.fill(); }
        else { g.lineWidth = 0.014; ['#e85a5a', '#5a7ae8', '#e8c040'].forEach((c, k) => { g.strokeStyle = c; g.globalAlpha = 0.7; g.beginPath(); let x = 0.2 + k * 0.08, y = 1.3 + k * 0.05; g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += 0.05; y += (s % 2 ? -1 : 1) * 0.07; g.lineTo(x, y); } g.stroke(); }); g.globalAlpha = 1; }
      },
      crown(x, y, h, T) {   // a toy left up on the wall: two blocks stacked, or a little ball
        const r = tileHash(x * 7 + 1, y * 9 + 5) % 5;
        if (r === 0) { isoBox(x + 0.45, y + 0.55, 0.26, 0.26, 0.26, '#f0c96a', '#e58aa8', '#b86a86', h); isoBox(x + 0.47, y + 0.53, 0.22, 0.22, 0.22, '#9ad6b8', '#7fc6a4', '#5e9a7e', h + 0.26); }
        else if (r === 2) { const p = W2S(x + 0.5, y + 0.5, h + 0.13), s = T * 0.13; ctx.fillStyle = '#8ea6e8'; ctx.beginPath(); ctx.arc(p[0], p[1], s, 0, 7); ctx.fill(); ctx.fillStyle = '#e58aa8'; ctx.beginPath(); ctx.arc(p[0], p[1], s, -0.4, 1.2); ctx.lineTo(p[0], p[1]); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(p[0] - s * 0.35, p[1] - s * 0.35, s * 0.22, 0, 7); ctx.fill(); }
      } }
  };
  function rockCrown(x, y, h, T, cols, n, hmax) {   // jagged rock on top of a cave wall: a few stone teeth
    const r = tileHash(x * 17 + 5, y * 19 + 3);
    for (let k = 0; k < n; k++) {
      const q = (r >> (k * 4)) & 15, cx = x + 0.2 + 0.6 * (q % 4) / 3, cy = y + 0.2 + 0.6 * (q >> 2) / 3, hh = hmax * (0.4 + 0.6 * (((r >> (k * 3 + 2)) & 7) / 7)), w = 0.16 + 0.1 * ((q * 7) % 3) / 2;
      const ap = W2S(cx + 0.03, cy - 0.02, h + hh), s0 = W2S(cx - w, cy + w, h), s1 = W2S(cx + w, cy + w, h), e1 = W2S(cx + w, cy - w, h);
      ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.lineTo(ap[0], ap[1]); ctx.fill();
      ctx.fillStyle = cols[2]; ctx.beginPath(); ctx.moveTo(s1[0], s1[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(ap[0], ap[1]); ctx.fill();
      ctx.strokeStyle = cols[0]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(ap[0], ap[1]); ctx.stroke();
    }
  }
  const KTEX = new Map();
  function kindTex(kind, v) {   // the face texture of a komnata (variant 0 or 1), painted once
    const id = kind + v; let c = KTEX.get(id); if (c) return c;
    c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H;
    const g = c.getContext('2d'); g.scale(TEX_W, TEX_W);
    WALL_STYLE[kind].tex(g, texRand(KIDS.indexOf(kind) * 10 + v + 1), v);
    const ao = g.createLinearGradient(0, WALL_H - 0.4, 0, WALL_H); ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,0.32)'); g.fillStyle = ao; g.fillRect(0, WALL_H - 0.4, 1, 0.4);   // dark where it meets the floor
    g.fillStyle = 'rgba(255,245,230,0.08)'; g.fillRect(0, 0, 1, 0.025);   // the lit top edge
    KTEX.set(id, c); return c;
  }
  function kindTopTex(kind) {
    const id = kind + 'top'; let c = KTEX.get(id); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.scale(64, 64); WALL_STYLE[kind].topTex(g, texRand(KIDS.indexOf(kind) * 10 + 7)); KTEX.set(id, c); return c;
  }
  // one face of a block of a komnata: the texture laid on it (cut at the block's height: a sinking wall shows its top part)
  function kindFace(face, x, y, h, k, T) {
    const kind = KIDS[k - 1], st = WALL_STYLE[kind], tex = kindTex(kind, tileHash(x * 3 + (face === 'S' ? 1 : 5), y * 7 + 2) % 2);
    ctx.save();
    if (face === 'S') faceMap(x, y + 1, x + 1, y + 1, 0, h); else faceMap(x + 1, y, x + 1, y + 1, 0, h);
    const full = TEX_H * h / WALL_H, sh = Math.min(TEX_H, full);
    ctx.drawImage(tex, 0, 0, TEX_W, sh, 0, 0, 1, sh / full);
    if (face === 'E') { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, 1, 1); }
    if (st.live && T >= 10 && !reduceMotion) { ctx.scale(1, 1 / h); st.live(face, h, T, realNow, x, y); }
    ctx.restore();
  }
  // a standing block that belongs to a komnata (by any face or its top): faces, top, edges, crown
  function drawKindBlock(i, T) {
    const K = kindWalls(), H = WA.cur, x = i % WW, y = (i - x) / WW, h = H[i];
    const sO = wallH(x, y + 1) < h - 0.001, eO = wallH(x + 1, y) < h - 0.001, ss = kwStyle(K.s[i]), es = kwStyle(K.e[i]), ts = kwStyle(K.top[i]);
    const P = (u, v, z) => W2S(x + u, y + v, z);
    if (sO) { poly([P(0, 1, 0), P(1, 1, 0), P(1, 1, h), P(0, 1, h)], ss ? ss.s : WALL_S); if (ss) kindFace('S', x, y, h, K.s[i], T); }
    if (eO) { poly([P(1, 0, 0), P(1, 1, 0), P(1, 1, h), P(1, 0, h)], es ? es.e : WALL_E); if (es) kindFace('E', x, y, h, K.e[i], T); }
    if (T >= 12 && ((sO && !ss) || (eO && !es))) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); mortar(i, h, sO && !ss, eO && !es, 1); ctx.stroke(); }
    poly([P(0, 0, h), P(1, 0, h), P(1, 1, h), P(0, 1, h)], ts ? ts.top : WALL_TOP);
    if (ts && ts.topTex && T >= 10) { ctx.save(); tileMap(x, y, h, null); ctx.drawImage(kindTopTex(KIDS[K.top[i] - 1]), 0, 0, 1, 1); ctx.restore(); }
    ctx.strokeStyle = 'rgba(205,210,225,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
    if (sO) { const p = P(0, 1, h), q = P(1, 1, h); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
    if (eO) { const p = P(1, 0, h), q = P(1, 1, h); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
    ctx.stroke();
    if (ts && ts.crown && T >= 10 && h > WALL_H * 0.6) ts.crown(x, y, h, T, reduceMotion ? 0 : realNow, i);
  }
  // the lips of a komnata's walls (walls laid flat): their top in its colour, with its top texture
  function drawKindLips(lips, T) {
    const K = kindWalls(), L = WALL_LIP;
    lips.forEach(i => {
      const k = K.top[i]; if (!k) return;
      const st = kwStyle(k), x = i % WW, y = (i - x) / WW;
      poly([W2S(x, y, L), W2S(x + 1, y, L), W2S(x + 1, y + 1, L), W2S(x, y + 1, L)], st.lip);
      if (st.topTex && T >= 10) { ctx.save(); tileMap(x, y, L, null); ctx.globalAlpha = 0.22; ctx.drawImage(kindTopTex(KIDS[k - 1]), 0, 0, 1, 1); ctx.restore(); }
    });
  }
  // 1.15 (author: a room's kind and its effect stack, in the picture too): the effect of a room shows on the faces of the walls
  // that look into it, over whatever stuff the walls are made of (a komnata's or plain stone). u along the face, v down from the
  // top 0..h (tile units).
  const RT_WALL = {
    fog(h, t, s) {   // mist banked against the foot of the wall, a slow puff drifting along
      const g = ctx.createLinearGradient(0, h, 0, h - 1.0); g.addColorStop(0, 'rgba(206,214,230,0.42)'); g.addColorStop(1, 'rgba(206,214,230,0)'); ctx.fillStyle = g; ctx.fillRect(0, h - 1.0, 1, 1.0);
      const u = ((t * 0.05 + s * 0.37) % 1.6) - 0.3, r = ctx.createRadialGradient(u, h - 0.35, 0, u, h - 0.35, 0.45); r.addColorStop(0, 'rgba(220,228,240,0.3)'); r.addColorStop(1, 'rgba(220,228,240,0)'); ctx.fillStyle = r; ctx.fillRect(0, h - 0.8, 1, 0.8);
    },
    swamp(h, t, s) {   // wet to the waterline, moss and slime at it
      const w = 0.32 + 0.02 * Math.sin(t * 0.8 + s);
      ctx.fillStyle = 'rgba(28,40,14,0.5)'; ctx.beginPath(); ctx.moveTo(0, h); for (let u = 0; u <= 1.001; u += 0.1) ctx.lineTo(u, h - w - 0.03 * Math.sin(u * 9 + s)); ctx.lineTo(1, h); ctx.fill();
      ctx.strokeStyle = 'rgba(150,190,90,0.45)'; ctx.lineWidth = 0.015; ctx.beginPath(); for (let u = 0; u <= 1.001; u += 0.1) { const v = h - w - 0.03 * Math.sin(u * 9 + s); u ? ctx.lineTo(u, v) : ctx.moveTo(u, v); } ctx.stroke();
      ctx.fillStyle = 'rgba(96,130,50,0.55)'; for (let k = 0; k < 3; k++) { const u = (s * 0.29 + k * 0.33) % 1; ctx.beginPath(); ctx.ellipse(u, h - w - 0.02, 0.06, 0.025, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(u - 0.006, h - w, 0.012, 0.08 + 0.05 * k); }
    },
    grotto(h, t, s) {   // light thrown up from water: rippling bands
      ctx.strokeStyle = 'rgba(160,190,255,0.2)'; ctx.lineWidth = 0.02;
      for (let k = 0; k < 3; k++) { const v0 = h - 0.25 - k * 0.3; ctx.beginPath(); for (let u = 0; u <= 1.001; u += 0.05) { const v = v0 + 0.035 * Math.sin(u * 12 + t * 1.6 + k * 2 + s); u ? ctx.lineTo(u, v) : ctx.moveTo(u, v); } ctx.stroke(); }
    },
    crypt(h, t, s) {   // a grave chill: the wall goes violet and dark, a cross scratched in now and then
      ctx.fillStyle = 'rgba(44,20,64,0.32)'; ctx.fillRect(0, 0, 1, h);
      if (s % 3 === 0) { ctx.strokeStyle = 'rgba(200,180,230,0.35)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(0.5, h * 0.35); ctx.lineTo(0.5, h * 0.62); ctx.moveTo(0.42, h * 0.43); ctx.lineTo(0.58, h * 0.43); ctx.stroke(); }
    },
    vault(h, t, s) {   // a warm gold sheen and glints that come and go
      ctx.fillStyle = 'rgba(210,170,60,0.09)'; ctx.fillRect(0, 0, 1, h);
      for (let k = 0; k < 2; k++) { const p = 0.5 + 0.5 * Math.sin(t * 2.2 + k * 2.4 + s); if (p < 0.75) continue; const u = 0.2 + 0.6 * ((s * 0.37 + k * 0.45) % 1), v = h * (0.3 + 0.4 * ((s * 0.61 + k * 0.3) % 1)), r = 0.07 * (p - 0.75) / 0.25;
        ctx.strokeStyle = 'rgba(255,236,160,0.9)'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.moveTo(u - r, v); ctx.lineTo(u + r, v); ctx.moveTo(u, v - r); ctx.lineTo(u, v + r); ctx.stroke(); }
    },
    haven(h, t, s) {   // a calm warm light rising from the floor
      const g = ctx.createLinearGradient(0, h, 0, h - 1.2); g.addColorStop(0, 'rgba(255,232,170,' + (0.2 + 0.04 * Math.sin(t * 1.3)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,232,170,0)'); ctx.fillStyle = g; ctx.fillRect(0, h - 1.2, 1, 1.2);
    },
    gears(h, t, s) {   // a bronze cog turning in the wall near the floor
      if (s % 2) return;
      const cx = 0.3 + 0.4 * ((s * 0.37) % 1), cy = h - 0.12, r = 0.2, a0 = t * 0.6 * (s % 4 ? 1 : -1);
      ctx.fillStyle = 'rgba(150,110,60,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(214,168,106,0.6)'; ctx.lineWidth = 0.05; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = a0 + k * Math.PI / 4; ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25); } ctx.stroke();
      ctx.fillStyle = 'rgba(40,28,14,0.8)'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
    },
    hush(h, t, s) {   // the wall swallows the light
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(8,10,16,0.15)'); g.addColorStop(1, 'rgba(8,10,16,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1, h);
    },
    ice(h, t, s) {   // frost over the wall, thicker at the top, and icicles hanging from its edge
      ctx.fillStyle = 'rgba(190,226,248,0.13)'; ctx.fillRect(0, 0, 1, h);
      ctx.fillStyle = 'rgba(232,247,255,0.6)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, 0);
      for (let k = 8; k >= 0; k--) { const u = k / 8, L = (k + s) % 3 === 0 ? 0.22 + 0.1 * (((k * 7 + s) % 5) / 4) : 0.06; ctx.lineTo(u + 0.03, 0.04); ctx.lineTo(u, 0.04 + L); ctx.lineTo(u - 0.03, 0.04); }
      ctx.fill();
      const d = ((t * 0.5 + s * 0.13) % 1); if (d < 0.5) { ctx.fillStyle = 'rgba(220,240,255,0.7)'; ctx.beginPath(); ctx.arc(0.5 - 0.5 / 8 + ((s % 3) / 8), 0.3 + d * h * 1.4, 0.015, 0, Math.PI * 2); ctx.fill(); }   // a drop now and then
    }
  };
  function rtWallWash(i, T) {
    if (T < 8) return;
    const x = i % WW, y = (i - x) / WW, h = WA.cur[i]; if (h < 0.3) return;
    const t = reduceMotion ? 0 : realNow;
    [[0, 1, 'S'], [1, 0, 'E']].forEach(([dx, dy, face]) => {
      if (wallH(x + dx, y + dy) >= h - 0.001) return;
      let r = tileAt(x + dx, y + dy) === FLOOR ? roomOf(x + dx, y + dy) : tileAt(x + 2 * dx, y + 2 * dy) === FLOOR && tileAt(x + dx, y + dy) === WALL ? roomOf(x + 2 * dx, y + 2 * dy) : -1;
      const rt = rtOf(r), fn = rt && RT_WALL[rt]; if (!fn) return;
      ctx.save();
      if (face === 'S') faceMap(x, y + 1, x + 1, y + 1, 0, h); else faceMap(x + 1, y, x + 1, y + 1, 0, h);
      ctx.beginPath(); ctx.rect(0, 0, 1, 1); ctx.clip(); ctx.scale(1, 1 / h);
      try { fn(h, t, tileHash(x * 13 + (face === 'S' ? 3 : 8), y * 11 + 1) % 97); } finally { ctx.restore(); }
    });
  }
  // 1.15 (author: as much as possible in 3D, even the flat things stand out a little; only the figures stay 2D): what is drawn
  // flat on a floor or a face is lifted a little off it and casts a short soft shadow down and to the right (the light comes
  // from the upper left). The canvas shadow is in device pixels, so it does not follow the plane's skew: a raised look for free.
  function relief(T, k) { const q = (k || 1) * T * DPR; ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = Math.max(1, q * 0.035); ctx.shadowOffsetX = q * 0.025; ctx.shadowOffsetY = q * 0.045; }
  function noRelief() { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  // things standing out of the faces of a komnata's walls (u along the face 0..1, d out of it, z up; S: the face along x at
  // y + 1, E: the face along y at x + 1), drawn right after their block, so what stands in front still hides them
  function wallFrame(x, y, face) {
    const S = face === 'S';
    return {
      P: (u, d, z) => S ? W2S(x + u, y + 1 + d, z) : W2S(x + 1 + d, y + u, z),
      W: (u, d) => S ? [x + u, y + 1 + d] : [x + 1 + d, y + u],
      box: (u, d, w, dd, hh, z0, top, south, east) => S ? isoBox(x + u, y + 1 + d, w, dd, hh, top, south, east, z0) : isoBox(x + 1 + d, y + u, dd, w, hh, top, south, east, z0),
      plane: (d, z0, z1) => S ? faceMap(x, y + 1 + d, x + 1, y + 1 + d, z0, z1) : faceMap(x + 1 + d, y, x + 1 + d, y + 1, z0, z1),
      E: !S
    };
  }
  const REPLACE_FLAT = { armory: 1, prison: 1, junk: 1, gallery: 1 };   // their flat ornament is replaced by the raised one
  const KIND_WALL3D = {
    goblin(F, h, T, t, s) {
      if (s % 2) { F.box(0.1, 0.07, 0.13, 0.13, h, 0, '#5e4024', '#6e4c2a', '#4a3420'); pLine(F.P(0.03, 0.14, h * 0.55), F.P(0.17, 0.14, h * 0.55), 'rgba(30,18,8,0.5)', 1); return; }   // a timber prop
      ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(1.5, T * 0.028); ctx.lineCap = 'round';   // roots hanging out of the earth
      [0.25, 0.5, 0.78].forEach((u, k) => { const a = F.P(u, 0, h - 0.05), b = F.P(u + 0.04, 0.16, h - 0.35 - 0.1 * k), c = F.P(u + 0.08 * (k - 1), 0.1, h - 0.7 - 0.1 * k); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]); ctx.stroke(); });
      ctx.lineCap = 'butt';
    },
    spider(F, h, T, t, s) {   // a sheet of silk sagging off the top of the wall, stirring; a cocoon hanging on a thread
      const sw = Math.sin(t * 0.9 + s) * 0.03, a = F.P(0.05, 0, h), b = F.P(0.95, 0, h), c = F.P(0.82, 0.2 + sw, h - 0.45), d = F.P(0.5, 0.28 + sw, h - 0.7), e = F.P(0.18, 0.2 + sw, h - 0.45);
      ctx.fillStyle = 'rgba(232,228,244,0.26)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.quadraticCurveTo(c[0], c[1], d[0], d[1]); ctx.quadraticCurveTo(e[0], e[1], a[0], a[1]); ctx.fill();
      ctx.strokeStyle = 'rgba(240,236,250,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 4; k++) { const q = F.P(0.15 + k * 0.23, 0, h); ctx.moveTo(q[0], q[1]); ctx.lineTo(d[0] + (k - 1.5) * T * 0.05, d[1]); } ctx.stroke();
      if (s % 2 === 0) { const top = F.P(0.7, 0.06, h - 0.05), cc = F.P(0.7 + sw, 0.2, h - 0.75); pLine(top, cc, 'rgba(240,236,250,0.6)', 1); ctx.fillStyle = '#ddd6c6'; ctx.beginPath(); ctx.ellipse(cc[0], cc[1] + T * 0.1, T * 0.06, T * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(cc[0] + T * 0.02, cc[1] + T * 0.12, T * 0.035, T * 0.11, 0, 0, Math.PI * 2); ctx.fill(); }
    },
    ogre(F, h, T, t, s) {
      if (s % 2) { [[0.3, 0.55, 0.11], [0.62, 1.05, 0.09], [0.78, 0.35, 0.07]].forEach(([u, z, r]) => { const [wx, wy] = F.W(u, 0.03); pBall(wx, wy, z - r, r, '#5a4838'); }); return; }   // lumps of rock
      const a = F.P(0.6, 0, 1.0), b = F.P(0.6, 0.32, 1.05); pLine(a, b, '#2a2420', Math.max(1.5, T * 0.035)); skullT(ctx, b[0], b[1] + T * 0.02, T * 0.22, '#e2d8bc', 'rgba(140,128,100,0.5)', '#1c1612');   // a skull on a spike
    },
    haunt(F, h, T, t, s) {   // a sconce with a candle burning blue
      const z = Math.min(1.0, h - 0.4); pLine(F.P(0.5, 0, z - 0.06), F.P(0.5, 0.15, z), '#3a3e48', Math.max(1.5, T * 0.035));
      F.box(0.5, 0.15, 0.1, 0.1, 0.03, z, '#4a4e5a', '#3a3e48', '#2c2f36');
      const [wx, wy] = F.W(0.5, 0.15); pCyl(wx, wy, 0.03, 0.14, '#cfd8e0', '#fffaf0', z + 0.03); const q = W2S(wx, wy, z + 0.17);
      pFlame(q[0], q[1], T * 0.13, t, s, 'rgba(200,240,255,0.95)', 'rgba(100,190,255,0.85)', ['kcandB', [[0, 'rgba(140,210,255,0.35)'], [1, 'rgba(140,210,255,0)']]]);
    },
    bats(F, h, T, t, s) {   // stone teeth hanging off the top edge; a bat hanging among them
      [0.2, 0.48, 0.8].forEach((u, k) => { const [wx, wy] = F.W(u, 0.05); pCone(wx, wy, 0.045 + 0.01 * (k % 2), -(0.22 + 0.1 * ((k + s) % 3)), '#4a4054', '#2c2434', h); });
      if (s % 3 === 0) { const q = F.P(0.65, 0.1, h - 0.12), open = Math.max(0, Math.sin(t * 0.8 + s) - 0.85) * 6; ctx.fillStyle = '#140c1c'; ctx.beginPath(); ctx.moveTo(q[0], q[1] - T * 0.04); ctx.quadraticCurveTo(q[0] + T * (0.08 + 0.06 * open), q[1] + T * 0.06, q[0] + T * 0.02, q[1] + T * 0.16); ctx.lineTo(q[0] - T * 0.02, q[1] + T * 0.16); ctx.quadraticCurveTo(q[0] - T * (0.08 + 0.06 * open), q[1] + T * 0.06, q[0], q[1] - T * 0.04); ctx.fill(); ctx.fillStyle = '#ff5a6a'; ctx.fillRect(q[0] - T * 0.025, q[1] + T * 0.11, Math.max(1, T * 0.015), Math.max(1, T * 0.015)); ctx.fillRect(q[0] + T * 0.01, q[1] + T * 0.11, Math.max(1, T * 0.015), Math.max(1, T * 0.015)); }
    },
    ossuary(F, h, T, t, s) {   // long bones sticking out of the wall, a skull set out of it
      [[0.2, 0.5], [0.75, 0.9], [0.4, 1.25]].forEach(([u, z], k) => { const a = F.P(u, 0, z), b = F.P(u + 0.04, 0.2, z - 0.04); pLine(a, b, '#e2d8bc', Math.max(2, T * 0.045)); ctx.fillStyle = '#ece2c8'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(2, T * 0.035), 0, Math.PI * 2); ctx.fill(); });
      const q = F.P(0.55, 0.1, 0.7); skullT(ctx, q[0], q[1], T * 0.22, '#e2d8bc', 'rgba(140,128,100,0.5)', '#1c1612');
    },
    armory(F, h, T, t, s) {   // spears crossed behind a round shield, both standing off the wall
      ctx.save(); relief(T, 0.8);
      F.plane(0.02, 0.35, 1.45); ctx.strokeStyle = '#6e5232'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.12, 0.95); ctx.lineTo(0.88, 0.1); ctx.moveTo(0.88, 0.95); ctx.lineTo(0.12, 0.1); ctx.stroke();
      ctx.fillStyle = '#c6ced8'; [[0.88, 0.1, 1], [0.12, 0.1, -1]].forEach(([u, v, sd]) => { ctx.beginPath(); ctx.moveTo(u + sd * 0.05, v - 0.06); ctx.lineTo(u - sd * 0.02, v + 0.03); ctx.lineTo(u + sd * 0.07, v + 0.02); ctx.fill(); });
      F.plane(0.08, 0.35, 1.45); ctx.fillStyle = s % 2 ? '#6a2a24' : '#2a466e'; ctx.beginPath(); ctx.arc(0.5, 0.5, 0.26, 0, Math.PI * 2); ctx.fill();
      noRelief(); ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 0.03; ctx.stroke(); ctx.fillStyle = '#c9cfd8'; ctx.beginPath(); ctx.arc(0.5, 0.5, 0.07, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(0.47, 0.47, 0.025, 0.025);
      ctx.restore();
    },
    forge(F, h, T, t, s) {
      if (s % 3 === 0) {   // a hood over a hearth: a brick box standing out of the wall, glowing underneath, sparks going up into it
        const f = 0.75 + 0.25 * Math.sin(t * 6 + s); F.box(0.5, 0.2, 0.74, 0.4, 0.42, 0.95, '#2a2220', '#5e2c1e', '#43221a');
        const q = F.P(0.5, 0.2, 0.8); ctx.drawImage(glowSprite('khood', [[0, 'rgba(255,140,50,0.55)'], [0.5, 'rgba(255,90,30,0.15)'], [1, 'rgba(255,60,20,0)']]), q[0] - T * 0.6 * f, q[1] - T * 0.35 * f, T * 1.2 * f, T * 0.7 * f);
        if (!reduceMotion) for (let k = 0; k < 3; k++) { const u = (t * 0.8 + k / 3 + s * 0.1) % 1, p = F.P(0.35 + 0.15 * k, 0.2 + Math.sin(u * 8 + k) * 0.05, 0.3 + u * 0.6); ctx.fillStyle = 'rgba(255,200,90,' + (0.9 * (1 - u)).toFixed(2) + ')'; ctx.fillRect(p[0], p[1], Math.max(1, T * 0.025), Math.max(1, T * 0.025)); }
        return;
      }
      ctx.save(); relief(T, 0.8); F.plane(0.04, 0.3, 1.4);   // tongs and a hammer hung on pegs
      ctx.fillStyle = '#5a5e66'; [0.32, 0.68].forEach(u => { ctx.beginPath(); ctx.arc(u, 0.12, 0.025, 0, Math.PI * 2); ctx.fill(); });
      ctx.strokeStyle = '#2e3036'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0.32, 0.14); ctx.lineTo(0.27, 0.7); ctx.moveTo(0.32, 0.14); ctx.lineTo(0.37, 0.7); ctx.stroke();
      ctx.strokeStyle = '#6e5232'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.68, 0.14); ctx.lineTo(0.68, 0.72); ctx.stroke(); ctx.fillStyle = '#3a3d44'; ctx.fillRect(0.59, 0.12, 0.18, 0.1);
      ctx.restore();
    },
    prison(F, h, T, t, s) {   // two iron rings, chains hanging from them, shackles at the end; water dripping off them
      ctx.strokeStyle = '#7d8088'; ctx.lineWidth = Math.max(1, T * 0.02);
      [0.28, 0.72].forEach((u, k) => {
        const top = F.P(u, 0.02, 1.25); ctx.beginPath(); ctx.ellipse(top[0], top[1], T * 0.04, T * 0.05, 0, 0, Math.PI * 2); ctx.stroke();
        const sway = Math.sin(t * 0.9 + s + k) * 0.02;
        for (let j = 1; j <= 6; j++) { const f = j / 6, q = F.P(u + sway * f, 0.03 + 0.06 * f, 1.25 - 0.55 * f); ctx.beginPath(); ctx.ellipse(q[0], q[1], T * (j % 2 ? 0.018 : 0.03), T * (j % 2 ? 0.03 : 0.018), 0, 0, Math.PI * 2); ctx.stroke(); }
        const e = F.P(u + sway, 0.1, 0.62); ctx.lineWidth = Math.max(1.5, T * 0.035); ctx.beginPath(); ctx.arc(e[0], e[1], T * 0.06, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = Math.max(1, T * 0.02);
        const dr = (t * 0.5 + k * 0.5 + s * 0.07) % 1; if (!reduceMotion && dr < 0.6) { const q = F.P(u + sway, 0.1, 0.55 - dr); ctx.fillStyle = 'rgba(170,200,230,0.8)'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1, T * 0.018), 0, Math.PI * 2); ctx.fill(); }
      });
    },
    junk(F, h, T, t, s) {   // a shelf standing out of the wall, jars and a box on it
      F.box(0.5, 0.11, 0.86, 0.22, 0.04, 0.9, '#7a5a3a', '#5e4630', '#4a3624');
      [[0.2, '#4a6a5a'], [0.42, '#7a5a3a'], [0.62, '#5a4a6a']].forEach(([u, c], k) => { const [wx, wy] = F.W(u, 0.11); if (k === 1) isoBox(wx, wy, 0.14, 0.12, 0.1, '#8a6a42', '#6e5232', '#55402a', 0.94); else { pCyl(wx, wy, 0.05, 0.13, c, '#c9b48a', 0.94); } });
      if (s % 2) { const [wx, wy] = F.W(0.82, 0.11); pCyl(wx, wy, 0.025, 0.14, '#3e6e4e', '#3e6e4e', 0.94); pCyl(wx, wy, 0.01, 0.06, '#3e6e4e', '#c9a87a', 1.08); }
    },
    gallery(F, h, T, t, s) {   // a gilded frame standing off the wall (its edge shows), sometimes a sconce beside it
      ctx.save(); F.plane(0.02, 0.32, 1.42); ctx.fillStyle = '#7a5a22'; ctx.fillRect(0.2, 0.1, 0.62, 0.72);
      relief(T, 0.9); F.plane(0.06, 0.32, 1.42); ctx.fillStyle = '#c9a24e'; ctx.fillRect(0.18, 0.06, 0.62, 0.72); noRelief();
      ctx.fillStyle = '#1a1416'; ctx.fillRect(0.25, 0.13, 0.48, 0.58); ctx.fillStyle = 'rgba(70,56,52,0.85)'; ctx.beginPath(); ctx.ellipse(0.49, 0.36, 0.1, 0.13, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(0.35, 0.48, 0.28, 0.23);
      const glint = Math.sin(t * 0.8 + s) > 0.85; ctx.fillStyle = glint ? '#ffe9a8' : 'rgba(30,24,22,0.9)'; ctx.fillRect(0.445, 0.33, 0.025, 0.018); ctx.fillRect(0.51, 0.33, 0.025, 0.018);
      ctx.strokeStyle = 'rgba(255,240,200,0.4)'; ctx.lineWidth = 0.012; ctx.strokeRect(0.18, 0.06, 0.62, 0.72);
      ctx.restore();
      if (s % 2 === 0) { const z = 0.95; pLine(F.P(0.92, 0, z), F.P(0.92, 0.12, z + 0.04), '#c9a24e', Math.max(1.5, T * 0.03)); const [wx, wy] = F.W(0.92, 0.12); pCyl(wx, wy, 0.025, 0.12, '#efe6cc', '#fffaf0', z + 0.04); const q = W2S(wx, wy, z + 0.16); pFlame(q[0], q[1], T * 0.12, t, s, 'rgba(255,236,170,0.95)', 'rgba(255,150,50,0.85)', ['kcandW', [[0, 'rgba(255,200,120,0.35)'], [1, 'rgba(255,200,120,0)']]]); }
    },
    nursery(F, h, T, t, s) {   // a little shelf with toys on it
      F.box(0.5, 0.1, 0.7, 0.2, 0.035, 0.85, '#d8d0c4', '#bab2a6', '#9a9286');
      const [a0, a1] = F.W(0.3, 0.1), [b0, b1] = F.W(0.52, 0.1), [c0, c1] = F.W(0.72, 0.1);
      isoBox(a0, a1, 0.11, 0.11, 0.11, '#f0c96a', '#d8a83e', '#b88a2a', 0.885); isoBox(a0 + 0.01, a1 - 0.01, 0.09, 0.09, 0.09, '#9ad6b8', '#7fc6a4', '#5e9a7e', 0.995);
      pBall(b0, b1, 0.885, 0.06, '#8ea6e8'); if (s % 2) { pBall(c0, c1, 0.885, 0.07, '#9a6a44'); pBall(c0, c1, 0.98, 0.05, '#9a6a44'); } else isoBox(c0, c1, 0.1, 0.1, 0.1, '#e58aa8', '#c86a8a', '#a8506e', 0.885);
    }
  };
  function kindWall3D(i, T) {
    if (T < 12 || !fl.rooms.some(R => R.rk)) return;
    const x = i % WW, y = (i - x) / WW, h = WA.cur[i];
    if (h < WALL_H * 0.6 || fl.items.has(key(x, y)) || WA.torches.some(q => q.x === x && q.y === y)) return;
    const t = reduceMotion ? 0 : realNow, sel = tileHash(x * 5 + 1, y * 3 + 2) % 3;
    [[0, 1, 'S'], [1, 0, 'E']].forEach(([dx, dy, face]) => {
      if (tileAt(x + dx, y + dy) !== FLOOR || wallH(x + dx, y + dy) >= h - 0.001) return;
      const r = roomOf(x + dx, y + dy), R = r >= 0 ? fl.rooms[r] : null, fn = R && R.rk && KIND_WALL3D[R.rk];
      if (!fn || !(sel === 0 || (sel === 1 && REPLACE_FLAT[R.rk]))) return;
      ctx.save();
      try { fn(wallFrame(x, y, face), h, T, t, tileHash(x * 13 + (face === 'S' ? 3 : 8), y * 11 + 1) % 97); } finally { ctx.restore(); }
    });
  }
  // what is on a standing block: its torch, the wall traps on its face
  function wallDressing(i, T) {
    const x = i % WW, y = (i - x) / WW, h = WA.cur[i];
    kindWallDeco(i, T);
    kindWall3D(i, T);   // 1.15: what stands out of a komnata's wall
    rtWallWash(i, T);   // 1.15: the room's effect over the wall's stuff
    if (T >= 10 && h > WALL_H * 0.6) WA.torches.forEach(t => { if (t.x === x && t.y === y && !fl.items.has(key(x, y))) drawTorch(t, T); });
    (WA.items || []).forEach(it => { if (it.x === x && it.y === y) drawWallItem(it, T, true); });
  }
  function torchFlicker(x, y) { return 0.86 + 0.14 * Math.sin(realNow * 8.3 + x * 1.7) * Math.sin(realNow * 5.1 + y * 2.3); }
  function drawTorch(t, T) {   // a sconce on the wall's face, a flame (a flame faces you), a warm light on the face around it
    const f = torchFlicker(t.fx, t.fy);
    ctx.save();
    const z1 = Math.min(wallH(t.x, t.y), 1.25), z0 = Math.max(0, z1 - 1);   // 1.09: a sconce at a hand's height on the high wall
    if (t.face === 'S') faceMap(t.x, t.y + 1, t.x + 1, t.y + 1, z0, z1); else faceMap(t.x + 1, t.y, t.x + 1, t.y + 1, z0, z1);
    ctx.globalAlpha = 0.9; ctx.drawImage(glowSprite('torchw', [[0, 'rgba(255,170,90,0.3)'], [0.6, 'rgba(255,120,50,0.06)'], [1, 'rgba(255,120,40,0)']]), 0.5 - 0.95 * f, 0.38 - 0.95 * f, 1.9 * f, 1.9 * f);
    ctx.globalAlpha = 1; relief(T, 0.6);   // 1.15: the sconce stands out of the wall
    if (t.face === 'S') faceMap(t.x, t.y + 1.04, t.x + 1, t.y + 1.04, z0, z1); else faceMap(t.x + 1.04, t.y, t.x + 1.04, t.y + 1, z0, z1);
    ctx.fillStyle = '#121316'; ctx.fillRect(0.46, 0.38, 0.08, 0.22);
    ctx.fillStyle = '#4a4e57'; ctx.fillRect(0.41, 0.36, 0.18, 0.05);
    ctx.restore();
    const p = W2S(t.fx, t.fy, z0 + 0.66);
    ctx.fillStyle = 'rgba(255,110,30,0.92)'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - T * 0.08, T * 0.07, T * 0.12 * f, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,225,140,0.95)'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - T * 0.05, T * 0.035, T * 0.065 * f, 0, 0, Math.PI * 2); ctx.fill();
  }
  // the light of the torches on the floor in front of them (flat, under the walls)
  function drawTorchLight(x0, y0, x1, y1, T) {   // the light of the torches on the floor in front of them (screen space: an upright ellipse is fast)
    if (T < 10) return;
    wallSetup();
    const spr = glowSprite('torch', [[0, 'rgba(255,150,70,0.2)'], [0.5, 'rgba(255,120,50,0.06)'], [1, 'rgba(255,120,40,0)']]);
    ctx.save(); screenT();
    WA.torches.forEach(t => {
      if (fl.items.has(key(t.x, t.y)) || wallH(t.x, t.y) < WALL_H * 0.6) return;   // 1.09: a wall laid flat has no torch
      const f = torchFlicker(t.gx, t.gy), gr = T * 2.4 * f, p = W2S(t.gx, t.gy, 0);
      if (!onScreen(p, gr * 2)) return;
      ctx.drawImage(spr, p[0] - gr * 1.41, p[1] - gr * 1.41 * SP, gr * 2.82, gr * 2.82 * SP);
    });
    ctx.restore();
  }
  // what lies on the floor is painted on it; what hangs on a wall goes on the wall; the rest stands up
  const WALL_ITEM = { portrait: 1, eyes: 1, mirror: 1, arrows: 1, fire: 1 };
  const ON_OBJECT = { powder: 1, mimic: 1, musicbox: 1 };
  const flatItem = it => it.type === 'web' || it.type === 'trapdoor' || (it.type === 'cage' && !cageShut(it)) || (it.broken && BUILDINGS[it.type]);
  const cageShut = it => it.anim > 0 || fl.heroes.some(h => h.cageIt === it && h.state === 'caged');
  // in a wave, what the heroes have not seen is dimmed (the fog), standing things too
  const fogged = (x, y) => (fl.phase === 'raid' || fl.phase === 'summary' || fl.phase === 'over') && fl.tiles[y * WW + x] !== WALL && !fl.known[y * WW + x];
  function drawWorld(T) {
    let sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake * 18; sy = (Math.random() - 0.5) * shake * 18; }
    cam.ox -= sx; cam.oy -= sy;
    const B = viewBox(), x0 = B.x0, y0 = B.y0, x1 = B.x1, y1 = B.y1;
    const seen = (x, y) => x >= x0 - 2 && x <= x1 + 2 && y >= y0 - 2 && y <= y1 + 2;
    ctx.save();
    // 1. the floor and what is painted on it
    floorT();
    drawTileLayer(x0, y0, x1, y1, T);
    drawTorchLight(x0, y0, x1, y1, T);
    drawRoomKinds(T);   // 1.15: the komnata's floor first, the room's effect over it (mist over the straw), the family's glows on top
    drawRoomTypes(T);
    drawKindAuras(T);
    drawZones(T);
    if (fl.phase === 'raid') drawDanger(x0, y0, x1, y1, T);
    if (fl.phase === 'build') { drawAreas(T, x0, y0, x1, y1); drawRumorTiles(x0, y0, x1, y1, T); }
    drawHeartGlow(T);
    const wallItems = [], stand = [], drift = [];
    fl.items.forEach(it => {
      if (DRIFT[it.type]) { if (seen(Math.floor(it.gx !== undefined ? it.gx : it.x), Math.floor(it.gy !== undefined ? it.gy : it.y))) drift.push(it); return; }
      if (!seen(it.x, it.y)) return;
      if (WALL_ITEM[it.type]) { wallItems.push(it); return; }
      if (flatItem(it)) { const k = popK(it); ctx.save(); floorT(0.035); relief(T, 0.6);   // 1.15: lifted a little off the floor, with a soft shadow
        if (k !== 1) { ctx.translate((it.x + 0.5) * T, (it.y + 0.5) * T); ctx.scale(k, k); ctx.translate(-(it.x + 0.5) * T, -(it.y + 0.5) * T); } drawItemTop(it, T); ctx.restore(); }
      else stand.push(it);
      drawItemStatus(it, T);
    });
    drift.forEach(it => { if (it.gx === undefined) return; ctx.save(); tileMap(it.gx - 0.5, it.gy - 0.5, 0, null); statusUnit(it, T); ctx.restore(); });   // what floats: its signs on the floor under it
    if (fl.phase === 'raid' || fl.phase === 'summary' || fl.phase === 'over') drawFog(x0, y0, x1, y1, T);
    drawSlots(x0, y0, x1, y1, T);
    drawHold(T);
    if (fl.breach && fl.phase === 'build') drawBreachMark(T);
    fl.items.forEach(it => { if (it.jamUntil > fl.time && fl.phase === 'raid' && !WALL_ITEM[it.type]) { ctx.fillStyle = 'rgba(150,100,255,0.38)'; ctx.fillRect(it.x * T, it.y * T, T, T); } });
    if (run.tut >= 0) drawTutTarget(T);
    drawFx(T);
    drawParticles(T, true);
    screenT(); drawKindLife(T);   // 1.15: the life of the komnaty, under the walls in front
    // 2. the walls: the lips now; the standing blocks among what stands (1.09: a high wall can hide what is behind it)
    screenT();
    const WL = drawWalls(x0, y0, x1, y1, T, wallItems);
    // 3. what stands, nearest last: [depth, kind, thing, x, y, height]
    const SO = [];
    fl.objects.forEach(o => { if (seen(o.x, o.y)) SO.push([o.x + o.y + 1, 0, o, o.x + 0.5, o.y + 0.5, 0.95]); });
    stand.forEach(it => SO.push([it.x + it.y + 1 + (ON_OBJECT[it.type] ? 0.02 : 0), 1, it, it.x + 0.5, it.y + 0.5, MONSTERS[it.type] ? 1.3 : 1.0]));
    kindPropsSO(SO, T);   // 1.15: the small things standing in the komnaty
    SO.push([fl.heart.x + fl.heart.y + 1, 2, null, fl.heart.x + 0.5, fl.heart.y + 0.5, 1.7]);
    fl.heroes.forEach(h => { if ((!h.dead && !h.fled && !h.gone) || heroOut(h)) { const p = heroPos(h); SO.push([p.x + p.y, 3, h, p.x, p.y, 1.35]); } });
    fl.fx.forEach(f => { if (f.kind === 'corpse') SO.push([f.x + f.y, 4, f, f.x, f.y, 1.2]); });   // 1.09: a monster falling
    SO.sort((a, b) => a[0] - b[0]);
    const drawSO = e => { if (e[1] === 0) drawObjectIso(e[2], T); else if (e[1] === 1) drawItemUp(e[2], T); else if (e[1] === 2) drawHeartIso(T); else if (e[1] === 4) drawCorpse(e[2], T); else if (e[1] === 5) drawProp(e[2], T); else drawHero(e[2], T); };
    // what a standing wall in front of it covers goes between the walls, in depth order; the rest after all of them
    let wi = 0; const later = [];
    const wallsTo = d => { const s0 = wi; while (wi < WL.length && WL[wi].d <= d) wi++; if (wi > s0) drawWallRun(WL, s0, wi, T); };
    SO.forEach(e => { if (WL.length && wallCovers(e[3], e[4], e[5])) { wallsTo(e[0]); drawSO(e); } else later.push(e); });
    wallsTo(Infinity);
    drawWallMarks(T);
    later.forEach(drawSO);
    drift.forEach(it => drawItemUp(it, T));   // ghosts, shades and bats float above everything
    // 4. signs over the world (upright, readable)
    fl.items.forEach(it => { if (it.jamUntil > fl.time && fl.phase === 'raid') { const p = itemAnchor(it); ctx.fillStyle = '#e6dcff'; ctx.font = numFont(Math.max(10, T * 0.4)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', p[0], p[1]); } });
    drawRoomTypeNames(T);
    drawRoomLabels(T);
    drawHeartLabel(T);
    if (fl.phase === 'build') drawRumorEyes(T);
    if (fl.phase === 'build' && selected && TOOLS[selected]) drawToolMarkers(T);
    if (fl.breach && fl.phase === 'build') drawBreachLabel(T);
    drawHoldLabel(T);
    drawCostLabels(T);
    if (fl.phase === 'raid') { drawMemBadges(T, seen); drawDetected(T); }
    else if (fl.phase === 'build') drawMemBadges(T, seen, true);   // 1.09: the answers stay between waves, so you see them while building
    drawParticles(T, false); drawFloats(T);
    ctx.restore();
    cam.ox += sx; cam.oy += sy;
  }
  // where to put signs for an item: over a standing thing, on a wall trap's picture, at the middle of a floor trap
  function itemAnchor(it) {
    if (DRIFT[it.type] && it.gx !== undefined) return W2S(it.gx, it.gy, 0.75);
    if (WALL_ITEM[it.type]) { const w = wallSpot(it); return W2S(w.x, w.y, w.z); }
    return W2S(it.x + 0.5, it.y + 0.5, flatItem(it) ? 0.05 : 0.55);
  }
  // a wall trap's spot: the middle of its face towards the room (a full wall), or just in front of a cut wall
  function wallSpot(it) {
    const h = wallH(it.x, it.y), ds = wallDirs(it.x, it.y), d = ds.find(q => q[0] === 1 || q[1] === 1) || ds[0] || [0, 1];
    if (h > 0.2 && (d[0] === 1 || d[1] === 1)) return { x: it.x + 0.5 + d[0] * 0.5, y: it.y + 0.5 + d[1] * 0.5, z: Math.max(0.1, Math.min(h, 1.2) - 0.45), face: d };
    return { x: it.x + 0.5 + d[0] * 0.3, y: it.y + 0.5 + d[1] * 0.3, z: 0.32, face: null, d };
  }
  function drawTiles(x0, y0, x1, y1, T, g) {   // 1.03: g = the context to draw on (a cached chunk)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * WW + x, t = fl.tiles[i], px = x * T, py = y * T;
      if (t === ROCK || t === WALL) continue;   // 1.07: rock is the dark around the dungeon; walls stand up (drawWalls)
      if (false) {
        const hw = tileHash(x, y);
        g.fillStyle = '#1e2024'; g.fillRect(px, py, T + 0.5, T + 0.5);
        if (hw % 3 === 0) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(px, py + (hw % 2 ? 0 : T / 2), T + 0.5, T / 2); }   // bricks of uneven colour
        g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; g.beginPath();
        g.moveTo(px, py + T / 2); g.lineTo(px + T, py + T / 2);
        g.moveTo(px + T / 2, py); g.lineTo(px + T / 2, py + T / 2);
        g.moveTo(px + T / 4, py + T / 2); g.lineTo(px + T / 4, py + T);
        g.moveTo(px + T * 3 / 4, py + T / 2); g.lineTo(px + T * 3 / 4, py + T);
        g.stroke();
        if (tileAt(x, y + 1) === FLOOR) { g.fillStyle = '#464a51'; g.fillRect(px, py + T * 0.8, T + 0.5, T * 0.2); g.fillStyle = 'rgba(220,230,245,0.12)'; g.fillRect(px, py + T * 0.8, T + 0.5, Math.max(1, T * 0.03)); }
        continue;
      }
      if (t === FLOOR) {
        const hf = tileHash(x, y), v = hf % 7;
        g.fillStyle = fl.rooms[fl.roomAt[i]].color; g.fillRect(px, py, T + 0.5, T + 0.5);
        g.fillStyle = 'rgba(5,5,9,0.24)'; g.fillRect(px, py, T + 0.5, T + 0.5);   // 1.07: a darker floor, closer to the dark of the walls
        if (v < 3) { g.fillStyle = 'rgba(0,0,0,' + (0.05 + v * 0.04).toFixed(2) + ')'; g.fillRect(px, py, T + 0.5, T + 0.5); }   // flagstones of uneven colour
        else if (v === 6) { g.fillStyle = 'rgba(215,225,240,0.04)'; g.fillRect(px, py, T + 0.5, T + 0.5); }
        g.fillStyle = 'rgba(220,230,245,0.04)';
        g.fillRect(px + T * 0.1, py + T * 0.12, T * 0.34, T * 0.24);
        g.fillRect(px + T * 0.52, py + T * 0.56, T * 0.34, T * 0.24);
        g.strokeStyle = 'rgba(0,0,0,0.38)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
        if (T >= 16 && (hf >>> 4) % 9 === 0) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.moveTo(px + T * 0.2, py + T * 0.3); g.lineTo(px + T * 0.45, py + T * 0.5); g.lineTo(px + T * 0.4, py + T * 0.8); g.stroke(); }   // a crack
        continue;
      }
      const d = fl.doors.get(key(x, y));
      g.fillStyle = '#131418'; g.fillRect(px, py, T + 0.5, T + 0.5);
      if (d.breach) {   // a freshly dug tunnel: broken stone and a red glow
        g.fillStyle = '#2a0f14'; g.fillRect(px + T * 0.06, py + T * 0.06, T * 0.88, T * 0.88);
        g.strokeStyle = '#ff6b6b'; g.lineWidth = Math.max(1, T * 0.05); g.beginPath();
        g.moveTo(px + T * 0.15, py + T * 0.2); g.lineTo(px + T * 0.45, py + T * 0.45); g.lineTo(px + T * 0.3, py + T * 0.8);
        g.moveTo(px + T * 0.85, py + T * 0.15); g.lineTo(px + T * 0.55, py + T * 0.5); g.lineTo(px + T * 0.8, py + T * 0.85); g.stroke();
        continue;
      }
      g.fillStyle = d.entrance ? '#5c544c' : '#3b2f28';
      g.fillRect(px + T * 0.08, py + T * 0.08, T * 0.84, T * 0.84);
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = Math.max(1, T * 0.03); g.beginPath();
      for (let k = 1; k < 4; k++) {
        if (d.horiz) { g.moveTo(px + T * 0.08, py + T * (0.08 + 0.21 * k)); g.lineTo(px + T * 0.92, py + T * (0.08 + 0.21 * k)); }
        else { g.moveTo(px + T * (0.08 + 0.21 * k), py + T * 0.08); g.lineTo(px + T * (0.08 + 0.21 * k), py + T * 0.92); }
      }
      g.stroke();
      if (d.entrance) {
        const gr = g.createLinearGradient(0, py, 0, py + T * 1.6);
        gr.addColorStop(0, 'rgba(255,220,160,0.35)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
        g.fillStyle = gr; g.fillRect(px - T * 0.5, py, T * 2, T * 1.6);
        g.fillStyle = 'rgba(255,236,200,0.95)'; g.beginPath();
        g.moveTo(px + T * 0.28, py + T * 0.3); g.lineTo(px + T * 0.72, py + T * 0.3); g.lineTo(px + T * 0.5, py + T * 0.72); g.closePath(); g.fill();
      }
    }
  }
  // 1.03: floors, walls and doors do not change during a wave, yet they were drawn tile by tile 60 times a second (about 2 000
  // rectangles a frame in the author's 73x41 dungeon). Now they are drawn once into chunks of 8x8 tiles at the nearest zoom
  // step and only pasted. A chunk also holds the first row and column of the next one, so no seam shows between them.
  const TC = { CH: 8, tiles: null, dpr: 0, map: new Map(), px: 0, tick: 0, MAXPX: 7e6 };
  const TC_B = [6, 8, 12, 16, 24, 32, 48, 64];
  const tileBucket = T => { const d = T * DPR * 0.95; for (const b of TC_B) if (b >= d) return b; return TC_B[TC_B.length - 1]; };
  function tileChunk(cx, cy, b) {
    const k = cx + ',' + cy + ',' + b, e = TC.map.get(k);
    if (e) { e.t = TC.tick; return e.c; }
    TC.made = (TC.made || 0) + 1;   // (counted for the tests)
    const CH = TC.CH, n = CH + 1, c = document.createElement('canvas');
    c.width = c.height = n * b;
    const g = c.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, -cx * CH * b, -cy * CH * b);   // world in css px at T = b / DPR, like the main canvas
    drawTiles(cx * CH, cy * CH, Math.min(WW - 1, cx * CH + CH), Math.min(WH - 1, cy * CH + CH), b / DPR, g);
    TC.map.set(k, { c, t: TC.tick, px: c.width * c.height }); TC.px += c.width * c.height;
    if (TC.px > TC.MAXPX) {   // the least recently used chunks go first
      [...TC.map.entries()].sort((p, q) => p[1].t - q[1].t).forEach(([kk, ee]) => { if (TC.px > TC.MAXPX * 0.75 && ee.t !== TC.tick) { TC.map.delete(kk); TC.px -= ee.px; } });
    }
    return c;
  }
  // 1.04: zoomed in, with few tiles on screen (wave 1: two rookies walk together and the camera comes closest), the tiles are drawn
  // directly again, as in 1.02: there the chunks save little, and they are the one thing 1.03 draws differently at that zoom (a lag
  // was reported in wave 1 only; not reproduced here). Going direct frees the chunks; a gap between the two limits keeps it from
  // flipping back and forth at the edge.
  const TC_DIRECT = [600, 760];
  function drawTileLayer(x0, y0, x1, y1, T) {
    if (TC.tiles !== fl.tiles || TC.dpr !== DPR) { TC.map.clear(); TC.px = 0; TC.tiles = fl.tiles; TC.dpr = DPR; }
    const nT = Math.min((x1 - x0 + 1) * (y1 - y0 + 1), cw * ch / (T * T * SP));   // 1.07: the tiles really on the screen (the box around the turned screen holds about twice as many)
    if (TC.direct ? nT > TC_DIRECT[1] : nT < TC_DIRECT[0]) { TC.direct = !TC.direct; if (TC.direct) { TC.map.clear(); TC.px = 0; } }
    if (TC.direct) { drawTiles(x0, y0, x1, y1, T, ctx); return; }
    TC.tick++;
    const b = tileBucket(T), CH = TC.CH, n = CH + 1;
    for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++) for (let cx = Math.floor(x0 / CH); cx <= Math.floor(x1 / CH); cx++)
      ctx.drawImage(tileChunk(cx, cy, b), cx * CH * T, cy * CH * T, n * T, n * T);
  }
  // 1.03: soft lights are drawn once as a picture and pasted (a torch flickers by its size, a treasure pulses by its strength)
  const GLOW = {};
  function glowSprite(name, stops) {
    if (GLOW[name]) return GLOW[name];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(st => gr.addColorStop(st[0], st[1])); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (GLOW[name] = c);
  }
  // Prototype 1.0: the same stone always looks the same (a cheap hash of the tile)
  function tileHash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; }
  // Torches on some walls that face a floor (not where a trap or a picture hangs); their light flickers on the floor below.
  function drawZones(T) {
    fl.zones.forEach(z => z.tiles.forEach(t => { ctx.fillStyle = 'rgba(160,190,255,0.18)'; ctx.fillRect(t[0] * T, t[1] * T, T, T); }));
  }
  function drawDanger(x0, y0, x1, y1, T) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = fl.danger[y * WW + x];
      if (d < 0.4) continue;
      ctx.fillStyle = 'rgba(255,80,80,' + Math.min(0.22, d * 0.05).toFixed(3) + ')';
      ctx.fillRect(x * T, y * T, T, T);
    }
  }
  function drawAreas(T, x0, y0, x1, y1) {
    fl.items.forEach(it => {
      if (!ACTIVE[it.type]) return;
      const a = it.preview > 0 ? 0.26 : 0.08;
      ctx.fillStyle = 'rgba(225,220,205,' + a + ')';   // Prototype 1.0: what a trap reaches, pale bone (red is Esencja's)
      areaOf(it).forEach(t => { if (t[0] >= x0 && t[0] <= x1 && t[1] >= y0 && t[1] <= y1) ctx.fillRect(t[0] * T + 1, t[1] * T + 1, T - 2, T - 2); });
    });
  }
  // 1.05: a trap's answer for this wave, in the check's own language: a full pale disc = crit, a ring = graze; a skull = let go
  function drawMemBadges(T, seen, build) {   // 1.05: a trap's answer (1.07: over its top right, upright; 1.09: kept between waves)
    if (T < 9) return;
    const r = Math.max(3, T * 0.13);
    fl.items.forEach(it => {
      const m = memOf(it), off = !build && it.skullOff;
      if (!m && !off) return;
      if (!seen(it.x, it.y)) return;
      const a = itemAnchor(it), x = a[0] + T * 0.34, y = a[1] - T * 0.3;
      ctx.save();
      ctx.fillStyle = 'rgba(8,8,10,0.75)'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fill();
      if (off) {
        ctx.fillStyle = CK.zone; ctx.font = numFont(Math.max(8, r * 1.8), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☠', x, y + 0.5);
      } else if (m === 'crit') {
        ctx.shadowColor = 'rgba(255,244,225,0.85)'; ctx.shadowBlur = 6; ctx.fillStyle = CK.zone; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = CK.zone; ctx.lineWidth = Math.max(1.4, r * 0.45); ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });
  }
  function drawItemTop(it, T) {   // 1.07: the picture of a thing seen from above (flat traps on the floor; until redrawn, standing ones too)
    const gh = DRIFT[it.type] && it.gx !== undefined;
    const px = (gh ? it.gx - 0.5 : it.x) * T, py = (gh ? it.gy - 0.5 : it.y) * T, cx = px + T / 2, cy = py + T / 2, s = T;
    if (it.broken) {   // 1.05: smashed by a barbarian: rubble for the rest of the wave
      ctx.fillStyle = '#3a3640';
      [[-0.2, 0.18, 0.12], [0.05, 0.24, 0.1], [0.22, 0.12, 0.08], [-0.05, 0.02, 0.07], [0.16, 0.3, 0.06]].forEach(q => { ctx.beginPath(); ctx.arc(cx + q[0] * s, cy + q[1] * s, q[2] * s, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = 'rgba(160,150,170,0.35)'; ctx.fillRect(cx - s * 0.3, cy + s * 0.3, s * 0.6, s * 0.04);
      return;
    }
    if (BUILDINGS[it.type]) { ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.ellipse(cx, py + s * 0.86, s * 0.38, s * 0.11, 0, 0, Math.PI * 2); ctx.fill(); }   // it stands: a shadow like the furniture
    switch (it.type) {
      case 'trapdoor': {
        const open = it.anim > 0;
        ctx.fillStyle = open ? '#050308' : '#3a2c22'; ctx.fillRect(px + s * 0.12, py + s * 0.12, s * 0.76, s * 0.76);
        ctx.strokeStyle = '#1e1610'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.strokeRect(px + s * 0.12, py + s * 0.12, s * 0.76, s * 0.76);
        if (!open) { ctx.beginPath(); ctx.moveTo(px + s * 0.5, py + s * 0.12); ctx.lineTo(px + s * 0.5, py + s * 0.88); ctx.stroke();
          ctx.fillStyle = '#8a8496'; ctx.fillRect(px + s * 0.2, py + s * 0.45, s * 0.08, s * 0.1); ctx.fillRect(px + s * 0.72, py + s * 0.45, s * 0.08, s * 0.1); }
        break;
      }
      case 'cage': {
        const shut = it.anim > 0 || fl.heroes.some(h => h.cageIt === it && h.state === 'caged');
        ctx.strokeStyle = '#b9bccb'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.beginPath();
        if (shut) { for (let k = 0; k < 5; k++) { const x = px + s * (0.14 + k * 0.18); ctx.moveTo(x, py + s * 0.06); ctx.lineTo(x, py + s * 0.94); } ctx.moveTo(px + s * 0.1, py + s * 0.08); ctx.lineTo(px + s * 0.9, py + s * 0.08); }
        else { ctx.moveTo(px + s * 0.18, py + s * 0.2); ctx.lineTo(px + s * 0.82, py + s * 0.2); for (let k = 0; k < 4; k++) { const x = px + s * (0.22 + k * 0.19); ctx.moveTo(x, py + s * 0.2); ctx.lineTo(x, py + s * 0.34); } }
        ctx.stroke();
        break;
      }
      case 'portrait':
        wallDirs(it.x, it.y).slice(0, 1).forEach(d => {
          const fx = cx + d[0] * s * 0.18, fy = cy + d[1] * s * 0.18;
          ctx.fillStyle = '#6a4a22'; ctx.fillRect(fx - s * 0.3, fy - s * 0.3, s * 0.6, s * 0.6);
          ctx.fillStyle = '#1e1a28'; ctx.fillRect(fx - s * 0.22, fy - s * 0.22, s * 0.44, s * 0.44);
          const glow = it.anim > 0 ? '#ff6b6b' : 'rgba(255,230,120,' + (0.55 + 0.35 * Math.sin(realNow * 2 + it.x)).toFixed(2) + ')';
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(fx - s * 0.08, fy - s * 0.04, s * 0.04, 0, Math.PI * 2); ctx.arc(fx + s * 0.08, fy - s * 0.04, s * 0.04, 0, Math.PI * 2); ctx.fill();
        });
        break;
      case 'spider': {
        ctx.strokeStyle = '#2a2230'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.beginPath();
        for (let k = -1; k <= 2; k++) { const a = k * 0.45 - 0.2; ctx.moveTo(cx, cy); ctx.lineTo(cx - s * 0.38 * Math.cos(a), cy - s * 0.3 * Math.sin(a) + s * 0.05); ctx.moveTo(cx, cy); ctx.lineTo(cx + s * 0.38 * Math.cos(a), cy - s * 0.3 * Math.sin(a) + s * 0.05); }
        ctx.stroke();
        ctx.fillStyle = '#3b2f45'; ctx.beginPath(); ctx.arc(cx, cy + s * 0.04, s * (it.anim > 0 ? 0.24 : 0.2), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.02, s * 0.03, 0, Math.PI * 2); ctx.arc(cx + s * 0.06, cy - s * 0.02, s * 0.03, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'ghost': {
        const bob = Math.sin(realNow * 3 + it.x) * s * 0.05, a = it.anim > 0 ? 0.95 : 0.7;
        ctx.fillStyle = 'rgba(225,232,255,' + a + ')';
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.08 + bob, s * 0.24, Math.PI, 0);
        ctx.lineTo(cx + s * 0.24, cy + s * 0.22 + bob);
        for (let k = 0; k < 4; k++) { const x = cx + s * 0.24 - (k + 0.5) * s * 0.12; ctx.lineTo(x, cy + s * (k % 2 ? 0.22 : 0.14) + bob); }
        ctx.lineTo(cx - s * 0.24, cy + s * 0.22 + bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.arc(cx - s * 0.08, cy - s * 0.08 + bob, s * 0.04, 0, Math.PI * 2); ctx.arc(cx + s * 0.08, cy - s * 0.08 + bob, s * 0.04, 0, Math.PI * 2); ctx.fill();
        break;
      }
      // v15.1: the new scary things
      case 'eyes':
        wallDirs(it.x, it.y).slice(0, 1).forEach(d => {
          const fx = cx + d[0] * s * 0.3, fy = cy + d[1] * s * 0.3, vert = d[0] !== 0;
          const open = it.anim > 0 ? 1 : (Math.sin(realNow * 1.3 + it.x * 1.7 + it.y) > -0.93 ? 1 : 0.15);   // they blink now and then
          ctx.fillStyle = '#120e18';
          if (vert) ctx.fillRect(fx - s * 0.09, fy - s * 0.3, s * 0.18, s * 0.6); else ctx.fillRect(fx - s * 0.3, fy - s * 0.09, s * 0.6, s * 0.18);
          ctx.fillStyle = it.anim > 0 ? '#ff6b6b' : '#ffe066';
          [-1, 1].forEach(k => { const ex = vert ? fx : fx + k * s * 0.14, ey = vert ? fy + k * s * 0.14 : fy; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.065, Math.max(0.5, s * 0.065 * open), 0, 0, Math.PI * 2); ctx.fill(); });
        });
        break;
      case 'mirror':
        wallDirs(it.x, it.y).slice(0, 1).forEach(d => {
          const fx = cx + d[0] * s * 0.18, fy = cy + d[1] * s * 0.18;
          ctx.fillStyle = '#8a7a5a'; ctx.beginPath(); ctx.ellipse(fx, fy, s * 0.25, s * 0.33, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = it.anim > 0 ? '#e8d0ff' : '#9fb4c8'; ctx.beginPath(); ctx.ellipse(fx, fy, s * 0.18, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); ctx.moveTo(fx - s * 0.09, fy - s * 0.12); ctx.lineTo(fx - s * 0.02, fy - s * 0.2); ctx.stroke();
          if (it.anim > 0) { ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.arc(fx - s * 0.06, fy - s * 0.02, s * 0.03, 0, Math.PI * 2); ctx.arc(fx + s * 0.06, fy - s * 0.02, s * 0.03, 0, Math.PI * 2); ctx.fill(); }
        });
        break;
      case 'bones': {
        const j = it.anim > 0 ? Math.sin(realNow * 40) * s * 0.03 : 0;
        ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = Math.max(1.5, s * 0.07); ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(cx - s * 0.26 + j, cy + s * 0.3); ctx.lineTo(cx + s * 0.26 + j, cy + s * 0.08); ctx.moveTo(cx - s * 0.26 - j, cy + s * 0.08); ctx.lineTo(cx + s * 0.26 - j, cy + s * 0.3); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.arc(cx + j, cy - s * 0.1, s * 0.17, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.arc(cx - s * 0.065 + j, cy - s * 0.12, s * 0.045, 0, Math.PI * 2); ctx.arc(cx + s * 0.065 + j, cy - s * 0.12, s * 0.045, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'creak': {
        const d = fl.doors.get(key(it.x, it.y)), hz = !!(d && d.horiz), sw = it.anim > 0 ? Math.sin(realNow * 30) * 0.06 : 0;
        ctx.fillStyle = '#6a4a2a';
        if (hz) ctx.fillRect(px + s * 0.08, py + s * (0.38 + sw), s * 0.84, s * 0.24); else ctx.fillRect(px + s * (0.38 + sw), py + s * 0.08, s * 0.24, s * 0.84);
        ctx.fillStyle = '#b9bccb';
        if (hz) { ctx.fillRect(px + s * 0.13, py + s * 0.41, s * 0.08, s * 0.18); ctx.fillRect(px + s * 0.79, py + s * 0.41, s * 0.08, s * 0.18); }
        else { ctx.fillRect(px + s * 0.41, py + s * 0.13, s * 0.18, s * 0.08); ctx.fillRect(px + s * 0.41, py + s * 0.79, s * 0.18, s * 0.08); }
        break;
      }
      case 'coffin': {
        const lid = it.anim > 0 ? s * 0.12 : 0;
        const shape = (ox, k) => { ctx.beginPath(); ctx.moveTo(cx + ox - s * 0.12 * k, cy - s * 0.4 * k); ctx.lineTo(cx + ox + s * 0.12 * k, cy - s * 0.4 * k); ctx.lineTo(cx + ox + s * 0.22 * k, cy - s * 0.16 * k); ctx.lineTo(cx + ox + s * 0.14 * k, cy + s * 0.4 * k); ctx.lineTo(cx + ox - s * 0.14 * k, cy + s * 0.4 * k); ctx.lineTo(cx + ox - s * 0.22 * k, cy - s * 0.16 * k); ctx.closePath(); };
        ctx.fillStyle = '#1a120c'; shape(0, 1); ctx.fill();
        if (lid) { ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(cx - s * 0.05, cy - s * 0.18, s * 0.03, 0, Math.PI * 2); ctx.arc(cx + s * 0.05, cy - s * 0.18, s * 0.03, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#5a3f2a'; shape(lid, 0.92); ctx.fill();
        ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = Math.max(1, s * 0.035); ctx.beginPath(); ctx.moveTo(cx + lid, cy - s * 0.24); ctx.lineTo(cx + lid, cy + s * 0.14); ctx.moveTo(cx + lid - s * 0.1, cy - s * 0.12); ctx.lineTo(cx + lid + s * 0.1, cy - s * 0.12); ctx.stroke();
        break;
      }
      case 'musicbox': {
        const bx = px + s * 0.6, by = py + s * 0.18;
        ctx.fillStyle = '#7a3f5a'; ctx.fillRect(bx, by, s * 0.27, s * 0.19);
        ctx.fillStyle = '#d9b46a'; ctx.fillRect(bx, by - s * 0.04, s * 0.27, s * 0.05);
        ctx.strokeStyle = '#d9b46a'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); ctx.moveTo(bx + s * 0.27, by + s * 0.1); ctx.lineTo(bx + s * 0.35, by + s * 0.1); ctx.lineTo(bx + s * 0.35, by + s * 0.03); ctx.stroke();
        if (it.playUntil > fl.time && fl.phase === 'raid') {   // notes drift up while it plays
          ctx.fillStyle = '#e6d2ff'; ctx.font = numFont(Math.max(9, s * 0.3), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (let k = 0; k < 2; k++) { const t = (realNow * 0.7 + k * 0.5) % 1; ctx.globalAlpha = 1 - t; ctx.fillText('♪', bx + s * (0.05 + 0.2 * k), by - s * (0.05 + 0.45 * t)); }
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'shade': {
        const bob = Math.sin(realNow * 2 + it.x) * s * 0.04, a = it.anim > 0 ? 0.95 : 0.75;
        const g = ctx.createRadialGradient(cx, cy + bob, s * 0.05, cx, cy + bob, s * 0.38);
        g.addColorStop(0, 'rgba(18,12,28,' + a + ')'); g.addColorStop(1, 'rgba(18,12,28,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + bob, s * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(8,5,14,' + a + ')'; ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.3 + bob); ctx.quadraticCurveTo(cx + s * 0.24, cy - s * 0.2 + bob, cx + s * 0.2, cy + s * 0.28 + bob); ctx.lineTo(cx - s * 0.2, cy + s * 0.28 + bob); ctx.quadraticCurveTo(cx - s * 0.24, cy - s * 0.2 + bob, cx, cy - s * 0.3 + bob); ctx.fill();
        ctx.fillStyle = '#b9a4ff'; ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.1 + bob, s * 0.028, 0, Math.PI * 2); ctx.arc(cx + s * 0.06, cy - s * 0.1 + bob, s * 0.028, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'bats': {
        for (let k = 0; k < 3; k++) {
          const an = realNow * 4 + k * 2.1 + it.x, bx = cx + Math.cos(an) * s * 0.2, by = cy + Math.sin(an * 1.3) * s * 0.16, fp = Math.sin(realNow * 22 + k) * 0.5 + 0.5, w = s * 0.17;
          ctx.fillStyle = it.anim > 0 ? '#7a6a8c' : '#3a2f4a'; ctx.strokeStyle = 'rgba(200,185,230,0.55)'; ctx.lineWidth = Math.max(1, s * 0.02);
          ctx.beginPath(); ctx.moveTo(bx, by - w * 0.1); ctx.lineTo(bx - w, by - w * (0.2 + 0.6 * fp)); ctx.lineTo(bx - w * 0.55, by + w * 0.15); ctx.lineTo(bx, by + w * 0.3); ctx.lineTo(bx + w * 0.55, by + w * 0.15); ctx.lineTo(bx + w, by - w * (0.2 + 0.6 * fp)); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ff6b6b'; ctx.fillRect(bx - s * 0.03, by, s * 0.02, s * 0.02); ctx.fillRect(bx + s * 0.01, by, s * 0.02, s * 0.02);
        }
        break;
      }
      case 'rune': {   // a standing stone with a glowing rune
        ctx.fillStyle = '#5b5868'; ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy + s * 0.32); ctx.lineTo(cx - s * 0.16, cy - s * 0.3); ctx.lineTo(cx + s * 0.12, cy - s * 0.36); ctx.lineTo(cx + s * 0.2, cy + s * 0.32); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(140,200,255,' + (0.6 + 0.3 * Math.sin(realNow * 3 + it.x)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.2, s * 0.05); ctx.beginPath();
        ctx.moveTo(cx - s * 0.02, cy - s * 0.2); ctx.lineTo(cx - s * 0.02, cy + s * 0.18); ctx.moveTo(cx - s * 0.02, cy - s * 0.08); ctx.lineTo(cx + s * 0.1, cy - s * 0.18); ctx.moveTo(cx - s * 0.02, cy + s * 0.02); ctx.lineTo(cx + s * 0.1, cy - s * 0.06); ctx.stroke();
        break;
      }
      case 'altar': {   // a dark altar with two candles
        ctx.fillStyle = '#4a1f2a'; ctx.fillRect(cx - s * 0.32, cy - s * 0.04, s * 0.64, s * 0.3);
        ctx.fillStyle = '#7a2f3f'; ctx.fillRect(cx - s * 0.36, cy - s * 0.1, s * 0.72, s * 0.08);
        ctx.fillStyle = '#e8dcc0'; ctx.fillRect(cx - s * 0.24, cy - s * 0.3, s * 0.07, s * 0.2); ctx.fillRect(cx + s * 0.17, cy - s * 0.3, s * 0.07, s * 0.2);
        ctx.fillStyle = 'rgba(255,170,60,' + (0.7 + 0.3 * Math.sin(realNow * 9 + it.y)).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(cx - s * 0.205, cy - s * 0.34, s * 0.045, 0, Math.PI * 2); ctx.arc(cx + s * 0.205, cy - s * 0.34, s * 0.045, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'acid': {   // a vat of green, bubbling acid
        ctx.fillStyle = '#3a3f46'; ctx.fillRect(cx - s * 0.3, cy - s * 0.12, s * 0.6, s * 0.4);
        ctx.fillStyle = '#7fe05a'; ctx.fillRect(cx - s * 0.26, cy - s * 0.12, s * 0.52, s * 0.1);
        ctx.fillStyle = 'rgba(170,255,120,0.8)';
        for (let k = 0; k < 3; k++) { const t = (realNow * 0.8 + k * 0.33 + it.x * 0.1) % 1; ctx.beginPath(); ctx.arc(cx - s * 0.15 + k * s * 0.15, cy - s * 0.14 - t * s * 0.25, s * (0.05 - t * 0.03), 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'veil': {   // a heavy purple curtain
        ctx.fillStyle = '#3b2a55'; ctx.fillRect(cx - s * 0.34, cy - s * 0.34, s * 0.68, s * 0.06);
        ctx.fillStyle = '#5b3f8a';
        for (let k = 0; k < 4; k++) { const x = cx - s * 0.32 + k * s * 0.16; ctx.beginPath(); ctx.moveTo(x, cy - s * 0.28); ctx.quadraticCurveTo(x + s * 0.08 + Math.sin(realNow * 1.5 + k) * s * 0.02, cy, x + s * 0.02, cy + s * 0.32); ctx.lineTo(x + s * 0.14, cy + s * 0.32); ctx.lineTo(x + s * 0.16, cy - s * 0.28); ctx.closePath(); ctx.fill(); }
        break;
      }
      case 'howl': {   // 1.05: a weathered stone with holes; the wind howls in them (waves pulse out)
        ctx.fillStyle = '#6e6a78'; ctx.beginPath(); ctx.moveTo(cx - s * 0.22, cy + s * 0.32); ctx.quadraticCurveTo(cx - s * 0.28, cy - s * 0.2, cx - s * 0.04, cy - s * 0.36); ctx.quadraticCurveTo(cx + s * 0.26, cy - s * 0.3, cx + s * 0.22, cy + s * 0.32); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#16131b'; ctx.beginPath(); ctx.ellipse(cx - s * 0.04, cy - s * 0.1, s * 0.07, s * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + s * 0.08, cy + s * 0.12, s * 0.05, 0, Math.PI * 2); ctx.fill();
        const ph = (realNow * 0.9 + it.x * 0.3) % 1; ctx.strokeStyle = 'rgba(115,214,198,' + (0.55 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, s * 0.035);
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.04, s * (0.3 + 0.12 * ph), -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy - s * 0.04, s * (0.3 + 0.12 * ph), Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
        break;
      }
      case 'shackles': {   // 1.05: an iron post with chains and open cuffs
        ctx.fillStyle = '#3a3440'; ctx.fillRect(cx - s * 0.06, cy - s * 0.34, s * 0.12, s * 0.66);
        ctx.fillStyle = '#5a5262'; ctx.fillRect(cx - s * 0.1, cy - s * 0.36, s * 0.2, s * 0.06);
        ctx.strokeStyle = '#9a96a6'; ctx.lineWidth = Math.max(1, s * 0.035);
        [-1, 1].forEach(sd => { for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(cx + sd * s * (0.1 + k * 0.08), cy - s * 0.12 + k * s * 0.09, s * 0.045, s * 0.03, sd * 0.6, 0, Math.PI * 2); ctx.stroke(); } ctx.beginPath(); ctx.arc(cx + sd * s * 0.3, cy + s * 0.2, s * 0.07, 0, Math.PI * 2); ctx.stroke(); });
        break;
      }
      case 'fortify': {   // reinforced brickwork
        ctx.fillStyle = '#6b6178'; ctx.fillRect(cx - s * 0.32, cy - s * 0.26, s * 0.64, s * 0.52);
        ctx.strokeStyle = '#2a2433'; ctx.lineWidth = Math.max(1, s * 0.035); ctx.beginPath();
        [-0.09, 0.09].forEach(dy => { ctx.moveTo(cx - s * 0.32, cy + s * dy); ctx.lineTo(cx + s * 0.32, cy + s * dy); });
        ctx.moveTo(cx, cy - s * 0.26); ctx.lineTo(cx, cy - s * 0.09); ctx.moveTo(cx - s * 0.16, cy - s * 0.09); ctx.lineTo(cx - s * 0.16, cy + s * 0.09); ctx.moveTo(cx + s * 0.16, cy - s * 0.09); ctx.lineTo(cx + s * 0.16, cy + s * 0.09); ctx.moveTo(cx, cy + s * 0.09); ctx.lineTo(cx, cy + s * 0.26);
        ctx.stroke();
        break;
      }
      case 'decoy':   // looks like spikes to the heroes (a faint marking only you can see)
      case 'spikes': {
        ctx.fillStyle = '#2a2433'; ctx.fillRect(cx - s * 0.34, cy + s * 0.12, s * 0.68, s * 0.12);
        if (it.type === 'decoy') { ctx.strokeStyle = 'rgba(255,160,90,0.55)'; ctx.setLineDash([s * 0.08, s * 0.06]); ctx.lineWidth = Math.max(1, s * 0.03); ctx.strokeRect(px + s * 0.1, py + s * 0.1, s * 0.8, s * 0.8); ctx.setLineDash([]); }
        const hgt = it.anim > 0 ? s * 0.38 : s * 0.14;
        ctx.fillStyle = it.anim > 0 ? '#ffffff' : '#c9d1e3';
        for (let n = -1; n <= 1; n++) { ctx.beginPath(); ctx.moveTo(cx + n * s * 0.22 - s * 0.09, cy + s * 0.13); ctx.lineTo(cx + n * s * 0.22, cy + s * 0.13 - hgt); ctx.lineTo(cx + n * s * 0.22 + s * 0.09, cy + s * 0.13); ctx.closePath(); ctx.fill(); }
        break;
      }
      case 'web': {
        ctx.strokeStyle = 'rgba(220,230,255,0.75)'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.beginPath();
        for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * s * 0.36, cy + Math.sin(an) * s * 0.36); }
        [0.14, 0.27].forEach(r0 => { for (let b = 0; b <= 6; b++) { const an = b * Math.PI / 3, x = cx + Math.cos(an) * s * r0, y = cy + Math.sin(an) * s * r0; if (b === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } });
        ctx.stroke();
        break;
      }
      case 'arrows':
        wallDirs(it.x, it.y).forEach(d => {
          const fx = cx + d[0] * s * 0.36, fy = cy + d[1] * s * 0.36;
          ctx.fillStyle = '#0d0a12';
          for (let k = -1; k <= 1; k++) {
            if (d[0] !== 0) ctx.fillRect(fx - s * 0.05, fy + k * s * 0.22 - s * 0.05, s * 0.1, s * 0.1);
            else ctx.fillRect(fx + k * s * 0.22 - s * 0.05, fy - s * 0.05, s * 0.1, s * 0.1);
          }
          ctx.fillStyle = '#d9dbe6'; ctx.beginPath();
          const tx = cx + d[0] * s * 0.48, ty = cy + d[1] * s * 0.48, bx = cx + d[0] * s * 0.22, by = cy + d[1] * s * 0.22;
          ctx.moveTo(tx, ty); ctx.lineTo(bx + d[1] * s * 0.1, by + d[0] * s * 0.1); ctx.lineTo(bx - d[1] * s * 0.1, by - d[0] * s * 0.1); ctx.closePath(); ctx.fill();
        });
        break;
      case 'fire':
        wallDirs(it.x, it.y).forEach(d => {
          const fx = cx + d[0] * s * 0.3, fy = cy + d[1] * s * 0.3, fl2 = 0.75 + 0.25 * Math.sin(realNow * 9 + it.x);
          ctx.fillStyle = '#3a2a2a'; ctx.beginPath(); ctx.arc(fx, fy, s * 0.17, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(fx + d[0] * s * 0.05, fy + d[1] * s * 0.05, s * 0.09 * fl2, 0, Math.PI * 2); ctx.fill();
        });
        break;
      case 'gate': {
        const d = fl.doors.get(key(it.x, it.y)), closed = doorClosed(d);
        ctx.strokeStyle = '#a9adbd'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath();
        const len = closed ? 0.84 : 0.22;
        for (let k = 0; k < 4; k++) {
          const o = 0.2 + k * 0.2;
          if (d.horiz) { ctx.moveTo(px + s * 0.08, py + s * o); ctx.lineTo(px + s * (0.08 + len), py + s * o); }
          else { ctx.moveTo(px + s * o, py + s * 0.08); ctx.lineTo(px + s * o, py + s * (0.08 + len)); }
        }
        ctx.stroke();
        if (closed) { ctx.fillStyle = 'rgba(169,173,189,0.18)'; ctx.fillRect(px, py, s, s); }
        const left = Math.max(0, mods.gateUses - (it.uses || 0));
        if (s >= 14) for (let k = 0; k < left; k++) { ctx.fillStyle = '#f2b94b'; ctx.beginPath(); ctx.arc(px + s * (0.2 + k * 0.15), py + s * 0.9, Math.max(1.5, s * 0.05), 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'powder':
        ctx.fillStyle = '#1e1e26'; ctx.beginPath(); ctx.arc(px + s * 0.72, py + s * 0.3, s * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b08a5a'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(px + s * 0.8, py + s * 0.2); ctx.lineTo(px + s * 0.88, py + s * 0.1); ctx.stroke();
        ctx.fillStyle = Math.sin(realNow * 14) > 0 ? '#ffd27a' : '#ff7a3c'; ctx.beginPath(); ctx.arc(px + s * 0.89, py + s * 0.09, s * 0.05, 0, Math.PI * 2); ctx.fill();
        break;
      case 'mimic': {
        const open = it.anim > 0 ? s * 0.06 : 0;
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(cx - s * 0.12, cy - s * 0.12, s * 0.05, 0, Math.PI * 2); ctx.arc(cx + s * 0.12, cy - s * 0.12, s * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1e7d3'; ctx.beginPath();
        for (let k = 0; k < 5; k++) { const x = cx - s * 0.25 + k * s * 0.1; ctx.moveTo(x, cy + s * 0.05 - open); ctx.lineTo(x + s * 0.05, cy + s * 0.15); ctx.lineTo(x + s * 0.1, cy + s * 0.05 - open); }
        ctx.fill();
        break;
      }
      case 'goblin':
        ctx.fillStyle = '#5fa84a';
        ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.12); ctx.lineTo(cx - s * 0.16, cy - s * 0.06); ctx.lineTo(cx - s * 0.2, cy + s * 0.02); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + s * 0.3, cy - s * 0.12); ctx.lineTo(cx + s * 0.16, cy - s * 0.06); ctx.lineTo(cx + s * 0.2, cy + s * 0.02); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(cx - s * 0.08, cy - s * 0.03, s * 0.04, 0, Math.PI * 2); ctx.arc(cx + s * 0.08, cy - s * 0.03, s * 0.04, 0, Math.PI * 2); ctx.fill();
        if (it.anim > 0) { ctx.strokeStyle = '#d9dbe6'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.beginPath(); ctx.moveTo(cx + s * 0.2, cy + s * 0.05); ctx.lineTo(cx + s * 0.45, cy - s * 0.05); ctx.stroke(); }
        break;
      case 'archer':
        ctx.fillStyle = '#e8e4d8'; ctx.beginPath(); ctx.arc(cx - s * 0.04, cy - s * 0.1, s * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1424'; ctx.fillRect(cx - s * 0.12, cy - s * 0.13, s * 0.06, s * 0.06); ctx.fillRect(cx + s * 0.0, cy - s * 0.13, s * 0.06, s * 0.06);
        ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.beginPath();
        ctx.moveTo(cx - s * 0.04, cy + s * 0.05); ctx.lineTo(cx - s * 0.04, cy + s * 0.28); ctx.moveTo(cx - s * 0.16, cy + s * 0.13); ctx.lineTo(cx + s * 0.08, cy + s * 0.13); ctx.stroke();
        ctx.strokeStyle = '#a0703a'; ctx.lineWidth = Math.max(1, s * 0.045); ctx.beginPath(); ctx.arc(cx + s * 0.08, cy + s * 0.06, s * 0.22, -Math.PI / 2.4, Math.PI / 2.4); ctx.stroke();
        break;
      case 'ogre':
        ctx.fillStyle = '#7d8a5a'; ctx.beginPath(); ctx.arc(cx, cy + s * 0.02, s * (it.anim > 0 ? 0.37 : 0.33), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(cx - s * 0.11, cy - s * 0.06, s * 0.045, 0, Math.PI * 2); ctx.arc(cx + s * 0.11, cy - s * 0.06, s * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1e7d3'; ctx.beginPath();
        ctx.moveTo(cx - s * 0.13, cy + s * 0.1); ctx.lineTo(cx - s * 0.09, cy + s * 0.22); ctx.lineTo(cx - s * 0.05, cy + s * 0.1);
        ctx.moveTo(cx + s * 0.13, cy + s * 0.1); ctx.lineTo(cx + s * 0.09, cy + s * 0.22); ctx.lineTo(cx + s * 0.05, cy + s * 0.1); ctx.fill();
        break;
      case 'shaman':
        ctx.fillStyle = '#d94a4a'; ctx.fillRect(cx - s * 0.12, cy - s * 0.36, s * 0.05, s * 0.14);
        ctx.fillStyle = '#4a8ad9'; ctx.fillRect(cx - s * 0.03, cy - s * 0.4, s * 0.05, s * 0.18);
        ctx.fillStyle = '#e8c04a'; ctx.fillRect(cx + s * 0.06, cy - s * 0.36, s * 0.05, s * 0.14);
        ctx.fillStyle = '#5fa84a'; ctx.beginPath(); ctx.arc(cx - s * 0.03, cy + s * 0.02, s * 0.19, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.01, s * 0.035, 0, Math.PI * 2); ctx.arc(cx + s * 0.04, cy - s * 0.01, s * 0.035, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(cx + s * 0.25, cy - s * 0.2); ctx.lineTo(cx + s * 0.25, cy + s * 0.3); ctx.stroke();
        ctx.fillStyle = 'rgba(139,227,143,' + (0.7 + 0.3 * Math.sin(realNow * 5)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(cx + s * 0.25, cy - s * 0.24, s * 0.07, 0, Math.PI * 2); ctx.fill();
        break;
      case 'loot': case 'lpotion': case 'loot2': case 'loot3': case 'lcursed': drawLoot(it, cx, cy, s); break;
    }
  }
  // flat signs of a trap or monster on its tile: level pips, a glow at level 3, ready / cooling down / switched off
  function drawItemStatus(it, T) {
    const px = it.x * T, py = it.y * T, s = T, cx = px + s / 2, cy = py + s / 2;
    if (it.lvl >= 2) {   // upgrade level: gold pips, level 3 gets a glow
      if (it.lvl >= 3) { ctx.strokeStyle = 'rgba(255,170,70,' + (0.35 + 0.2 * Math.sin(realNow * 4 + it.x)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.strokeRect(px + s * 0.03, py + s * 0.03, s * 0.94, s * 0.94); }
      ctx.fillStyle = it.lvl >= 3 ? '#ff9a3c' : '#f2b94b';
      for (let k = 0; k < it.lvl - 1; k++) { const qx = px + s * (0.84 - k * 0.16), qy = py + s * 0.86; ctx.beginPath(); ctx.moveTo(qx, qy - s * 0.07); ctx.lineTo(qx + s * 0.06, qy); ctx.lineTo(qx, qy + s * 0.07); ctx.lineTo(qx - s * 0.06, qy); ctx.closePath(); ctx.fill(); }
    }
    if (it.type === 'decoy' && it.disabled && fl.phase === 'raid') { ctx.fillStyle = 'rgba(16,17,20,0.6)'; ctx.fillRect(px, py, s, s); }
    if (ACTIVE[it.type] && fl.phase === 'raid') {
      if (it.disabled) {
        ctx.fillStyle = 'rgba(16,17,20,0.6)'; ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = '#857a99'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.beginPath();
        ctx.moveTo(cx - s * 0.18, cy - s * 0.18); ctx.lineTo(cx + s * 0.18, cy + s * 0.18); ctx.moveTo(cx + s * 0.18, cy - s * 0.18); ctx.lineTo(cx - s * 0.18, cy + s * 0.18); ctx.stroke();
      } else if (it.cd > 0) {
        const max = cdOf(it.type);
        ctx.strokeStyle = 'rgba(166,155,187,0.85)'; ctx.lineWidth = Math.max(1.5, s * 0.05);
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - it.cd / max)); ctx.stroke();
      } else {
        const pulse = 0.5 + 0.35 * Math.sin(realNow * 6);
        ctx.strokeStyle = 'rgba(242,185,75,' + pulse.toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, s * 0.05);
        ctx.strokeRect(px + s * 0.06, py + s * 0.06, s * 0.88, s * 0.88);
      }
    }
  }
  // the same signs for what hangs on a wall or floats: a ring around it on the screen
  // the signs of a trap (level pips, ready / cooling down / off) in the unit square of its own plane
  function statusUnit(it, T) {
    const lw = Math.max(1.5 / T, 0.05);
    if (it.lvl >= 2) {
      ctx.fillStyle = it.lvl >= 3 ? '#ff9a3c' : '#f2b94b';
      for (let k = 0; k < it.lvl - 1; k++) { const qx = 0.84 - k * 0.16, qy = 0.86; ctx.beginPath(); ctx.moveTo(qx, qy - 0.07); ctx.lineTo(qx + 0.06, qy); ctx.lineTo(qx, qy + 0.07); ctx.lineTo(qx - 0.06, qy); ctx.closePath(); ctx.fill(); }
    }
    if (!ACTIVE[it.type] || fl.phase !== 'raid') return;
    ctx.lineWidth = lw;
    if (it.disabled) { ctx.fillStyle = 'rgba(16,17,20,0.55)'; ctx.fillRect(0, 0, 1, 1); ctx.strokeStyle = '#857a99'; ctx.beginPath(); ctx.moveTo(0.32, 0.32); ctx.lineTo(0.68, 0.68); ctx.moveTo(0.68, 0.32); ctx.lineTo(0.32, 0.68); ctx.stroke(); }
    else if (it.cd > 0) { ctx.strokeStyle = 'rgba(166,155,187,0.85)'; ctx.beginPath(); ctx.arc(0.5, 0.5, 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - it.cd / cdOf(it.type))); ctx.stroke(); }
    else { ctx.strokeStyle = 'rgba(242,185,75,' + (0.5 + 0.35 * Math.sin(realNow * 6)).toFixed(2) + ')'; ctx.strokeRect(0.06, 0.06, 0.88, 0.88); }
  }
  // A wall trap: on a full wall it is painted on the face towards the room; on a cut wall it stands on the lip, facing you.
  function drawWallItem(it, T) {   // on its plane: the face of a full wall, the top of a cut one; its signs on the same plane
    const w = wallSpot(it), d = w.face || w.d, a = fogged(it.x + d[0], it.y + d[1]) ? 0.55 : 1;
    ctx.save(); ctx.globalAlpha = a;
    wallPlane(it, 0.04); relief(T, 0.8);   // 1.15: it stands out of the wall a little
    wallArt(it, w.face && w.face[0] === 1 ? 0.82 : 1);
    noRelief(); statusUnit(it, T);
    ctx.restore();
  }
  // wall traps in a unit square (x along the wall, y down), lit by k (the east face is a little darker)
  function wallArt(it, k) {
    const t = it.type, hot = it.anim > 0;
    const lw = 0.045;
    if (t === 'portrait') {
      ctx.fillStyle = k < 1 ? '#5a3e1c' : '#6a4a22'; ctx.fillRect(0.2, 0.12, 0.6, 0.62);
      ctx.fillStyle = '#1e1a28'; ctx.fillRect(0.28, 0.2, 0.44, 0.46);
      ctx.fillStyle = 'rgba(80,70,100,0.5)'; ctx.beginPath(); ctx.ellipse(0.5, 0.42, 0.13, 0.17, 0, 0, Math.PI * 2); ctx.fill();   // a face in the dark
      ctx.fillStyle = hot ? '#ff6b6b' : 'rgba(255,230,120,' + (0.55 + 0.35 * Math.sin(realNow * 2 + it.x)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(0.44, 0.39, 0.035, 0, Math.PI * 2); ctx.arc(0.56, 0.39, 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,150,0.25)'; ctx.lineWidth = lw * 0.6; ctx.strokeRect(0.2, 0.12, 0.6, 0.62);
    } else if (t === 'eyes') {
      const open = hot ? 1 : (Math.sin(realNow * 1.3 + it.x * 1.7 + it.y) > -0.93 ? 1 : 0.15);
      ctx.fillStyle = '#0c0910'; ctx.beginPath(); ctx.ellipse(0.5, 0.42, 0.36, 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hot ? '#ff6b6b' : '#ffe066';
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(0.5 + s * 0.15, 0.42, 0.07, Math.max(0.01, 0.06 * open), 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#0c0910'; [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(0.5 + s * 0.15, 0.42, 0.02, Math.max(0.005, 0.05 * open), 0, 0, Math.PI * 2); ctx.fill(); });
    } else if (t === 'mirror') {
      ctx.fillStyle = k < 1 ? '#6e6248' : '#8a7a5a'; ctx.beginPath(); ctx.ellipse(0.5, 0.42, 0.24, 0.34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hot ? '#e8d0ff' : '#8fa4ba'; ctx.beginPath(); ctx.ellipse(0.5, 0.42, 0.17, 0.27, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.moveTo(0.42, 0.3); ctx.lineTo(0.5, 0.2); ctx.stroke();
      if (hot) { ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.arc(0.45, 0.42, 0.03, 0, Math.PI * 2); ctx.arc(0.55, 0.42, 0.03, 0, Math.PI * 2); ctx.fill(); }
    } else if (t === 'arrows') {
      ctx.fillStyle = '#4a4d55'; ctx.fillRect(0.14, 0.3, 0.72, 0.26);
      ctx.fillStyle = '#0d0a12'; for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.arc(0.28 + n * 0.22, 0.43, 0.055, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = hot ? '#ffffff' : '#c9cdd8'; for (let n = 0; n < 3; n++) { const x = 0.28 + n * 0.22; ctx.beginPath(); ctx.moveTo(x, 0.47); ctx.lineTo(x - 0.035, 0.6); ctx.lineTo(x + 0.035, 0.6); ctx.closePath(); ctx.fill(); }
    } else if (t === 'fire') {
      const f = 0.75 + 0.25 * Math.sin(realNow * 9 + it.x);
      ctx.fillStyle = '#3a2a2a'; ctx.beginPath(); ctx.arc(0.5, 0.45, 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(0.5, 0.45, 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hot ? '#ffd27a' : '#ff9a3c'; ctx.beginPath(); ctx.ellipse(0.5, 0.45 - 0.02, 0.06 * f, 0.08 * f, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Furniture: barrel, crate, statue, bookcase (boxes and shapes standing on their tile)
  function drawObjectIso(o, T) {
    const cx = o.x + 0.5, cy = o.y + 0.5, fa = fogged(o.x, o.y) ? 0.55 : 1;
    ctx.save(); ctx.globalAlpha = fa;
    groundShadow(cx + 0.05, cy + 0.05, 0.42, 0.34, 0.4);
    if (o.kind === 'barrel') {
      const b = W2S(cx, cy, 0), t = W2S(cx, cy, 0.62), rx = T * 0.27, ry = rx * SP;
      ctx.fillStyle = '#6e4724'; ctx.fillRect(b[0] - rx, t[1], rx * 2, b[1] - t[1]);
      ctx.beginPath(); ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); ctx.fill();
      const g = ctx.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0); g.addColorStop(0, 'rgba(255,220,170,0.16)'); g.addColorStop(0.45, 'rgba(255,220,170,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g; ctx.fillRect(b[0] - rx, t[1], rx * 2, b[1] - t[1]);
      ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(1, T * 0.05);
      [0.18, 0.46].forEach(z => { const q = W2S(cx, cy, z); ctx.beginPath(); ctx.ellipse(q[0], q[1], rx, ry, 0, 0, Math.PI); ctx.stroke(); });
      ctx.fillStyle = '#86592e'; ctx.beginPath(); ctx.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.stroke();
    } else if (o.kind === 'crate') {
      isoBox(cx, cy, 0.7, 0.7, 0.6, '#7d5c36', '#6a4c2c', '#523a22');
      ctx.strokeStyle = 'rgba(30,18,8,0.7)'; ctx.lineWidth = Math.max(1, T * 0.035); ctx.beginPath();
      const L = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
      L(W2S(cx - 0.35, cy + 0.35, 0), W2S(cx + 0.35, cy + 0.35, 0.6)); L(W2S(cx + 0.35, cy - 0.35, 0), W2S(cx + 0.35, cy + 0.35, 0.6));   // braces
      L(W2S(cx - 0.35, cy - 0.35, 0.6), W2S(cx + 0.35, cy + 0.35, 0.6));
      ctx.stroke();
    } else if (o.kind === 'statue') {
      isoBox(cx, cy, 0.62, 0.62, 0.22, '#5e5968', '#4b4755', '#3c3944');
      const b = W2S(cx, cy, 0.22);   // a stone warrior: a figure like the heroes, in grey
      drawPixelFigure('statue', b[0], b[1], Math.max(FIG_MIN, T * 1.1) * 1.1, (o.x + o.y) % 2 ? 1 : -1, {});
    } else {   // a bookcase against the light: a tall box with shelves of coloured spines on its south face
      isoBox(cx, cy, 0.8, 0.42, 1.0, '#4a3020', '#3a2516', '#2a1a10');
      const cols = ['#7a3434', '#34507a', '#5e7a34', '#9a7a34'];
      faceMap(cx - 0.36, cy + 0.21, cx + 0.36, cy + 0.21, 0.04, 0.96);
      ctx.fillStyle = '#1a100a'; ctx.fillRect(0.04, 0.04, 0.92, 0.92);
      for (let row = 0; row < 3; row++) for (let b = 0; b < 5; b++) { ctx.fillStyle = cols[(b + row + o.x) % 4]; ctx.fillRect(0.08 + b * 0.18, 0.1 + row * 0.31, 0.13, 0.24); }
      screenT();
    }
    ctx.restore();
  }
  // the heart: a dark pedestal, the heart beating over it, the crystals floating around it
  function drawHeartGlow(T) {   // on the floor (floor transform)
    const x = (fl.heart.x + 0.5) * T, y = (fl.heart.y + 0.5) * T;
    const g = ctx.createRadialGradient(x, y, 0, x, y, T * 1.6);
    g.addColorStop(0, 'rgba(216,67,79,0.42)'); g.addColorStop(1, 'rgba(216,67,79,0)');
    ctx.fillStyle = g; ctx.fillRect(x - T * 1.6, y - T * 1.6, T * 3.2, T * 3.2);
    if (fl.party && fl.party.steal > 0 && fl.phase === 'raid') {
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = Math.max(2, T * 0.07);
      ctx.beginPath(); ctx.arc(x, y, T * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(fl.party.steal / stealNeed(), 0, 1)); ctx.stroke();
    }
  }
  function drawHeartIso(T) {
    const hx = fl.heart.x + 0.5, hy = fl.heart.y + 0.5;
    groundShadow(hx, hy, 0.4, 0.4, 0.45);
    isoBox(hx, hy, 0.56, 0.56, 0.18, '#3a2228', '#2c1a1f', '#201316');
    const beat = 1 + 0.07 * Math.max(0, Math.sin(realNow * 6)) + (fl.heartHit > 0 ? 0.08 : 0), bob = Math.sin(realNow * 1.6) * 0.03;
    const p = W2S(hx, hy, 0.62 + bob);
    ctx.drawImage(glowSprite('heart', [[0, 'rgba(255,80,95,0.5)'], [1, 'rgba(255,80,95,0)']]), p[0] - T * 0.8, p[1] - T * 0.8, T * 1.6, T * 1.6);
    heartPath(p[0], p[1], T * 0.36 * beat);
    ctx.fillStyle = run.crystals > 0 ? '#b8323f' : '#4a2a30'; ctx.fill();
    ctx.fillStyle = 'rgba(255,200,205,0.35)'; ctx.beginPath(); ctx.arc(p[0] - T * 0.1, p[1] - T * 0.08, T * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff8a8a'; ctx.lineWidth = Math.max(1, T * 0.025); heartPath(p[0], p[1], T * 0.36 * beat); ctx.stroke();
    const home = run.crystals - (fl.party && fl.party.carrierId >= 0 ? 1 : 0), total = run.maxCrystals;   // one in a thief's hands is missing here
    for (let k = 0; k < total; k++) {
      const a = realNow * 0.6 + k * Math.PI * 2 / total, q = W2S(hx + Math.cos(a) * 0.48, hy + Math.sin(a) * 0.48, 0.42 + 0.05 * Math.sin(realNow * 2 + k));
      crystalShape(q[0], q[1], T * 0.085, k < home ? '#ff9ab0' : k < run.crystals ? 'rgba(255,154,176,0.25)' : 'rgba(80,60,70,0.6)');
    }
  }
  function drawHeartLabel(T) {
    if (T < 14) return;
    const p = W2S(fl.heart.x + 0.5, fl.heart.y + 0.5, 0);
    ctx.font = numFont(Math.max(9, T * 0.22), true); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.85)'; ctx.strokeText('SERCE', p[0], p[1] + T * 0.18);
    ctx.fillStyle = 'rgba(255,214,170,0.9)'; ctx.fillText('SERCE', p[0], p[1] + T * 0.18);
  }
  // Standing traps, buildings, loot and monsters. Until each has its own drawing, the old picture stands up on its tile.
  function drawCorpse(f, T) {   // 1.09: a monster's last moment: it tips over and fades
    const k = 1 - clamp(f.life / f.max, 0, 1), t = clamp(k / 0.5, 0, 1), p = W2S(f.x, f.y, 0), H = Math.max(FIG_MIN, T * f.h * 1.15);
    drawPixelFigure(f.type, p[0], p[1], H, f.face || 1, { rot: (f.face || 1) * Math.PI / 2 * t * t, alpha: k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45, flash: k < 0.15 });
  }
  // 1.09: something just placed, moved or upgraded pops (a little too big, then its size)
  const popK = it => { const t = (realNow - (it.popR || -9)) / 0.34; return t >= 1 || t < 0 || reduceMotion ? 1 : 0.55 + 0.45 * easeOutBack(t); };
  function drawItemUp(it, T) {
    const gh = DRIFT[it.type] && it.gx !== undefined, bx = gh ? it.gx : it.x + 0.5, by = gh ? it.gy : it.y + 0.5;
    const a = fogged(clamp(Math.floor(bx), 0, WW - 1), clamp(Math.floor(by), 0, WH - 1)) ? 0.55 : 1;
    ctx.save(); ctx.globalAlpha = a;
    { const k = popK(it); if (k !== 1) { const f = W2S(bx, by, 0); ctx.translate(f[0], f[1]); ctx.scale(k, k); ctx.translate(-f[0], -f[1]); } }
    const art = ISO_ART[it.type] || (LOOT_KIND[it.type] ? ISO_ART.loot : null);
    if (art) art(it, bx, by, T);
    else {
      if (!gh) groundShadow(bx, by, 0.3, 0.3, 0.35);
      const p = W2S(bx, by, gh ? 0.55 : 0), px = (gh ? it.gx - 0.5 : it.x) * T, py = (gh ? it.gy - 0.5 : it.y) * T;
      ctx.translate(p[0] - T / 2 - px, p[1] - T * 0.92 - py);
      drawItemTop(it, T);
    }
    ctx.restore();
    if (MONSTERS[it.type]) { const p = W2S(bx, by, 0), H = monH(it, T); if (it.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - H * 0.5, H * 0.3, H * 0.5, 0, 0, Math.PI * 2); ctx.fill(); } hpBar(p[0], p[1] - H - (gh ? T * 0.55 * CP : 0) - 6, T * 0.6, it.hp / it.max, '#9be37a', T); }
  }
  const monH = (it, T) => T * ({ ogre: 1.25, goblin: 0.8, archer: 0.95, shaman: 0.9, spider: 0.6, ghost: 0.9, shade: 0.95, bats: 0.6 }[it.type] || 0.9);
  const ISO_ART = {};
  // upright signs: a text with a dark rim at a point of the screen
  function signText(t, x, y, font, color, align, base) {
    ctx.font = font; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.88)'; ctx.strokeText(t, x, y);
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  }
  function drawRoomTypeNames(T) {
    if (T < 14) return;
    fl.rooms.forEach(R => {
      if (R.kind !== 'room' || (!R.rt && !R.rk)) return;
      const p = W2S(R.x0 + 0.15, R.y1 + 0.85, 0), fs = Math.max(9, T * 0.22), font = numFont(fs, true);
      let dy = 0;
      if (R.rt) { const I = RT_INFO[R.rt]; signText(I.glyph + ' ' + I.name, p[0], p[1], font, I.color, 'left', 'bottom'); dy = fs * 1.15; }
      if (R.rk) { const K = KIND_INFO[R.rk]; signText(K.glyph + ' ' + K.name, p[0], p[1] - dy, font, K.color, 'left', 'bottom'); }   // 1.15: the komnata above the effect
    });
  }
  function drawBreachLabel(T) {
    if (T < 12) return;
    const b = fl.breach, p = W2S(b.x + 0.5, b.y + 0.5, 0);
    signText('WYŁOM', p[0], p[1] - T * 0.75, numFont(Math.max(10, T * 0.26), true), '#ff8a8a', 'center', 'bottom');
    signText('stuknij: załataj (' + BREACH_PATCH + ')', p[0], p[1] + T * 0.6, numFont(Math.max(9, T * 0.2), true), fl.essence >= BREACH_PATCH ? '#f2b94b' : '#9a90aa', 'center', 'top');
  }
  function drawHoldLabel(T) {
    if (!holdInfo || fl.phase !== 'build') return;
    const k = clamp((realNow - holdInfo.t0) / holdInfo.dur, 0, 1); if (k < 0.15) return;
    const p = W2S(holdInfo.x + 0.5, holdInfo.y + 0.5, 0);
    signText('zdejmij', p[0], p[1] - T * 0.75, numFont(Math.max(10, T * 0.3), true), '#ffd0d0', 'center', 'bottom');
  }
  // what an upgrade costs, over each thing that can be upgraded (with Ulepsz picked, or over the thing in hand)
  function costTag(it, T) {
    const c = upgCost(it), ok = fl.essence >= c, p = itemAnchor(it), y = p[1] - T * 0.55;
    ctx.font = numFont(Math.max(10, T * 0.3), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = ok ? 'rgba(255,85,98,0.95)' : 'rgba(80,84,92,0.92)'; rr(p[0] - T * 0.38, y - T * 0.17, T * 0.76, T * 0.34, 3); ctx.fill();
    ctx.fillStyle = ok ? '#2a0509' : '#c8ccd2'; ctx.fillText('↑' + c, p[0], y + 1);
  }
  function drawCostLabels(T) {
    if (fl.phase !== 'build' && fl.phase !== 'raid') return;
    if (selected === 'upgrade') { fl.items.forEach(it => { if (ACTIVE[it.type] && (it.lvl || 1) < 3) costTag(it, T); }); return; }
    const it = fl.phase === 'build' && movingKey && fl.items.get(movingKey);
    if (it && ACTIVE[it.type] && (it.lvl || 1) < 3) costTag(it, T);
  }
  function drawDetected(T) {
    fl.items.forEach(it => {
      if (!ACTIVE[it.type] || !it.detected || it.disabled) return;
      const p = itemAnchor(it);
      signText('!', p[0] - T * 0.3, p[1] - T * 0.3, numFont(Math.max(11, T * 0.32), true), '#ffe066');
    });
  }
  // Loot by kind: a coin pile, a potion flask, a gear chest (blue glow), a relic (orange glow). The cursed treasure looks like
  // a gear chest to the heroes; you see a faint violet mark on it (and a big X once a priest has sensed it).
  function drawLoot(it, cx, cy, s) {
    const kind = LOOT_KIND[it.type], lr = ITEMS[it.type].rarity;
    if (lr >= 2) {
      const pulse = 0.5 + 0.5 * Math.sin(realNow * (lr === 3 ? 5 : 3) + it.x);
      const R = s * (lr === 3 ? 0.9 : 0.6);
      ctx.globalAlpha = lr === 3 ? 0.45 + 0.3 * pulse : 0.35 + 0.25 * pulse;
      ctx.drawImage(lr === 3 ? glowSprite('relic', [[0, 'rgba(255,140,60,1)'], [1, 'rgba(0,0,0,0)']]) : glowSprite('gear', [[0, 'rgba(110,180,255,1)'], [1, 'rgba(0,0,0,0)']]), cx - R, cy - R, R * 2, R * 2);
      ctx.globalAlpha = 1;
    }
    if (kind === 'gold') {
      const big = (it.gold || 1) > 1;
      ctx.fillStyle = '#b07a24'; ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.18, s * (big ? 0.36 : 0.3), s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2b94b';
      (big ? [[-0.16, 0.08], [0.16, 0.06], [0, -0.06], [-0.06, 0.12], [0.08, -0.16]] : [[-0.12, 0.08], [0.12, 0.06], [0, -0.06]]).forEach(p => { ctx.beginPath(); ctx.arc(cx + p[0] * s, cy + p[1] * s, s * 0.12, 0, Math.PI * 2); ctx.fill(); });
      if (big && s >= 16) { ctx.fillStyle = '#1a1424'; ctx.font = numFont(Math.max(8, s * 0.24), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(it.gold), cx, cy + s * 0.02); }
    } else if (kind === 'potion') {
      ctx.fillStyle = '#d9dbe6'; ctx.fillRect(cx - s * 0.06, cy - s * 0.32, s * 0.12, s * 0.14);
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(cx - s * 0.08, cy - s * 0.38, s * 0.16, s * 0.07);
      ctx.fillStyle = 'rgba(220,230,255,0.85)'; ctx.beginPath(); ctx.arc(cx, cy + s * 0.06, s * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5fd36a'; ctx.beginPath(); ctx.arc(cx, cy + s * 0.08, s * 0.18, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(cx - s * 0.1, cy - s * 0.04, s * 0.05, s * 0.05);
    } else if (kind === 'relic') {   // a golden chalice
      ctx.fillStyle = '#ffb35c'; ctx.beginPath(); ctx.moveTo(cx - s * 0.22, cy - s * 0.26); ctx.lineTo(cx + s * 0.22, cy - s * 0.26); ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 0.04, cx, cy + s * 0.06); ctx.quadraticCurveTo(cx - s * 0.2, cy + s * 0.04, cx - s * 0.22, cy - s * 0.26); ctx.fill();
      ctx.fillRect(cx - s * 0.04, cy + s * 0.04, s * 0.08, s * 0.16); ctx.fillRect(cx - s * 0.16, cy + s * 0.2, s * 0.32, s * 0.07);
      ctx.fillStyle = '#ff5a6a'; ctx.beginPath(); ctx.arc(cx, cy - s * 0.12, s * 0.05, 0, Math.PI * 2); ctx.fill();
    } else {   // gear (and the cursed one, which looks the same to them): a small chest
      ctx.fillStyle = '#6a4a26'; ctx.fillRect(cx - s * 0.26, cy - s * 0.08, s * 0.52, s * 0.3);
      ctx.fillStyle = '#7f5a2e'; ctx.beginPath(); ctx.moveTo(cx - s * 0.26, cy - s * 0.08); ctx.quadraticCurveTo(cx, cy - s * 0.32, cx + s * 0.26, cy - s * 0.08); ctx.fill();
      ctx.fillStyle = '#9fd0ff'; ctx.fillRect(cx - s * 0.05, cy - s * 0.06, s * 0.1, s * 0.12);
      ctx.strokeStyle = '#3a2814'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.strokeRect(cx - s * 0.26, cy - s * 0.08, s * 0.52, s * 0.3);
      if (kind === 'cursed') {
        ctx.strokeStyle = 'rgba(180,140,255,0.75)'; ctx.setLineDash([s * 0.06, s * 0.05]); ctx.strokeRect(cx - s * 0.36, cy - s * 0.38, s * 0.72, s * 0.72); ctx.setLineDash([]);
        if (it.cursedKnown && fl.phase === 'raid') { ctx.strokeStyle = '#b48cff'; ctx.lineWidth = Math.max(2, s * 0.06); ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy - s * 0.3); ctx.lineTo(cx + s * 0.3, cy + s * 0.3); ctx.moveTo(cx + s * 0.3, cy - s * 0.3); ctx.lineTo(cx - s * 0.3, cy + s * 0.3); ctx.stroke(); }
      }
    }
    if (it.item && s >= 14) {   // a known item lies here (dropped by a hero): its colour in the corner
      ctx.fillStyle = it.item.cursed ? '#b48cff' : ITEM_COLOR[it.item.type] || '#fff'; ctx.beginPath(); ctx.arc(cx + s * 0.3, cy - s * 0.3, s * 0.09, 0, Math.PI * 2); ctx.fill();   // 1.20: cursed: violet
      ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 1; ctx.stroke();
    }
    const gl = 0.5 + 0.5 * Math.sin(realNow * 4 + it.x);
    ctx.fillStyle = 'rgba(255,240,180,' + (0.6 * gl).toFixed(2) + ')';
    ctx.fillRect(cx + s * 0.16, cy - s * 0.3, s * 0.05, s * 0.05); ctx.fillRect(cx - s * 0.24, cy - s * 0.18, s * 0.04, s * 0.04);
  }
  /* ================= 1.15: komnaty (room kinds), their look ================= */
  // Every komnata dresses its room so you know it at a glance: the floor (a tint, things painted or lying flat that never
  // block), the faces of its standing walls (banners, webs, racks, frames...), a little life over the floor (smoke, embers,
  // wisps, bats, notes), and a soft glow of its colour under each trap or monster of its family (the bond you paid for).
  const kH = (x, y, s) => (tileHash(x * 31 + s * 7 + 3, y * 17 + s * 13 + 5) % 10007) / 10007;   // 0..1, fixed per tile and salt
  const hexA = (hex, a) => 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')';
  const kindRooms = () => fl.rooms.filter(R => R.kind === 'room' && R.rk);
  const edgeTile = (R, tx, ty) => tx === R.x0 || tx === R.x1 || ty === R.y0 || ty === R.y1;
  const roomMid = R => [(R.x0 + R.x1 + 1) / 2, (R.y0 + R.y1 + 1) / 2];
  function blob(c, cx, cy, r, n, seed, fill) {   // an uneven splash: a few circles around a point
    c.fillStyle = fill; c.beginPath();
    for (let k = 0; k < n; k++) { const a = kH(seed, k, 3) * Math.PI * 2, d = r * 0.6 * kH(seed, k, 4); c.moveTo(cx + Math.cos(a) * d + r * 0.5, cy + Math.sin(a) * d); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (0.35 + 0.4 * kH(seed, k, 5)), 0, Math.PI * 2); }
    c.fill();
  }
  function boneAt(c, cx, cy, len, ang, w, col) {   // a long bone with knobs at both ends
    const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2, nx = -Math.sin(ang) * w * 0.55, ny = Math.cos(ang) * w * 0.55;
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - dx, cy - dy); c.lineTo(cx + dx, cy + dy); c.stroke();
    c.fillStyle = col; [[-1, 1], [-1, -1], [1, 1], [1, -1]].forEach(([e, s]) => { c.beginPath(); c.arc(cx + e * dx + s * nx, cy + e * dy + s * ny, w * 0.62, 0, Math.PI * 2); c.fill(); });
    c.lineCap = 'butt';
  }
  function skullAt(c, cx, cy, s, col, eye) {   // a little skull lying on the floor (or set in a wall)
    c.fillStyle = col; c.beginPath(); c.arc(cx, cy - s * 0.12, s * 0.5, 0, Math.PI * 2); c.fill();
    c.fillRect(cx - s * 0.28, cy + s * 0.18, s * 0.56, s * 0.3);
    c.fillStyle = eye || 'rgba(20,16,14,0.85)';
    c.beginPath(); c.arc(cx - s * 0.19, cy - s * 0.08, s * 0.13, 0, Math.PI * 2); c.arc(cx + s * 0.19, cy - s * 0.08, s * 0.13, 0, Math.PI * 2); c.fill();
    c.fillRect(cx - s * 0.04, cy + s * 0.08, s * 0.08, s * 0.1);
  }
  // the floor: the still part of each komnata's floor (painted once per room and zoom into a cache, kindFloorCache), in tile pixels
  const KIND_FLOOR = {
    goblin(c, R, T) {   // trodden earth, straw, a fire ring in the middle, green hands smeared low on the walls
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(96,78,36,0.28)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => { const a = kH(tx, ty, 1); if (a < 0.45) return; c.fillStyle = 'rgba(64,50,22,' + (0.14 + 0.14 * a).toFixed(2) + ')'; c.beginPath(); c.ellipse((tx + kH(tx, ty, 2)) * T, (ty + kH(tx, ty, 3)) * T, T * 0.36, T * 0.22, a * 3, 0, Math.PI * 2); c.fill(); });
      c.strokeStyle = 'rgba(222,196,112,0.55)'; c.lineWidth = Math.max(1, T * 0.028); c.beginPath();
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 4) < 0.5) return; const cx = (tx + 0.2 + 0.6 * kH(tx, ty, 5)) * T, cy = (ty + 0.2 + 0.6 * kH(tx, ty, 6)) * T; for (let k = 0; k < 6; k++) { const a = kH(tx, ty, 7 + k) * Math.PI * 2, L = T * (0.1 + 0.14 * kH(tx, ty, 13 + k)); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); } });
      c.stroke();
      R.tiles.forEach(([tx, ty]) => {   // hand prints in goblin green, on the tiles along the walls
        if (!edgeTile(R, tx, ty) || kH(tx, ty, 20) < 0.72) return;
        const cx = (tx + 0.3 + 0.4 * kH(tx, ty, 21)) * T, cy = (ty + 0.3 + 0.4 * kH(tx, ty, 22)) * T, s = T * 0.13, a0 = kH(tx, ty, 23) * 6.28;
        c.fillStyle = 'rgba(150,215,80,0.42)'; c.beginPath(); c.ellipse(cx, cy, s, s * 0.85, a0, 0, Math.PI * 2); c.fill();
        for (let f = 0; f < 4; f++) { const a = a0 - 1.2 + f * 0.55; c.beginPath(); c.ellipse(cx + Math.cos(a) * s * 1.55, cy + Math.sin(a) * s * 1.55, s * 0.28, s * 0.5, a + Math.PI / 2, 0, Math.PI * 2); c.fill(); }
      });
      const [mx, my] = roomMid(R), cx = mx * T, cy = my * T;   // the fire ring
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, T * 0.55); g.addColorStop(0, 'rgba(30,22,16,0.75)'); g.addColorStop(1, 'rgba(30,22,16,0)'); c.fillStyle = g; c.fillRect(cx - T * 0.6, cy - T * 0.6, T * 1.2, T * 1.2);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; c.fillStyle = k % 2 ? '#5d5a55' : '#77736c'; c.beginPath(); c.ellipse(cx + Math.cos(a) * T * 0.36, cy + Math.sin(a) * T * 0.36, T * 0.08, T * 0.06, a, 0, Math.PI * 2); c.fill(); }
    },
    spider(c, R, T) {   // dusk, webs spun across every corner, egg sacs, threads, and small spiders going about
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(52,42,74,0.3)'; c.fillRect(x, y, w, h);
    },
    ogre(c, R, T) {   // a lair: dried blood, gnawed bones, huge footprints, cracked flags
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(82,44,26,0.28)'; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(18,10,6,0.4)'; c.lineWidth = Math.max(1, T * 0.025); c.beginPath();
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 1) < 0.6) return; let px = (tx + kH(tx, ty, 2)) * T, py = (ty + kH(tx, ty, 3)) * T; c.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (kH(tx, ty, 4 + s) - 0.5) * T * 0.5; py += (kH(tx, ty, 9 + s) - 0.3) * T * 0.4; c.lineTo(px, py); } });
      c.stroke();
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 14) < 0.8) return; blob(c, (tx + 0.5) * T, (ty + 0.5) * T, T * 0.32, 5, tx * 97 + ty, 'rgba(96,12,10,0.4)'); });
      for (let k = 0; k < 3; k++) {   // footprints across the room
        const u = (k + 0.5) / 3, fx = x + w * u, fy = y + h * (0.35 + 0.3 * (k % 2)), s = T * 0.24;
        c.fillStyle = 'rgba(36,22,12,0.34)'; c.beginPath(); c.ellipse(fx, fy, s * 0.55, s, -0.3, 0, Math.PI * 2); c.fill();
        for (let f = 0; f < 3; f++) { c.beginPath(); c.arc(fx - s * 0.45 + f * s * 0.45, fy - s * 1.25 - Math.abs(f - 1) * s * 0.1, s * 0.18, 0, Math.PI * 2); c.fill(); }
      }
    },
    haunt(c, R, T) {   // a cold hall: a chalk circle that will not stay still, pale puddles that glow, frost along the walls
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(66,126,170,0.17)'; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(235,250,255,0.3)'; c.lineWidth = Math.max(1, T * 0.02); c.beginPath();
      R.tiles.forEach(([tx, ty]) => { if (!edgeTile(R, tx, ty)) return; for (let k = 0; k < 3; k++) { const px = (tx + kH(tx, ty, 5 + k)) * T, py = (ty + kH(tx, ty, 9 + k)) * T, a1 = kH(tx, ty, 13 + k) * 6.28; c.moveTo(px, py); c.lineTo(px + Math.cos(a1) * T * 0.16, py + Math.sin(a1) * T * 0.16); c.moveTo(px, py); c.lineTo(px + Math.cos(a1 + 2.1) * T * 0.12, py + Math.sin(a1 + 2.1) * T * 0.12); } });
      c.stroke();
    },
    bats(c, R, T) {   // dark, the floor white with droppings under the walls, wing shadows sweeping over it
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(36,24,58,0.36)'; c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(214,208,192,0.55)'; c.beginPath();
      R.tiles.forEach(([tx, ty]) => { const n = edgeTile(R, tx, ty) ? 9 : 2; for (let k = 0; k < n; k++) { if (kH(tx, ty, k) < 0.35) continue; const px = (tx + kH(tx, ty, 10 + k)) * T, py = (ty + kH(tx, ty, 20 + k)) * T, r = T * (0.02 + 0.035 * kH(tx, ty, 30 + k)); c.moveTo(px + r, py); c.arc(px, py, r, 0, Math.PI * 2); } });
      c.fill();
    },
    ossuary(c, R, T) {   // a chapel of bones: skulls set along the walls, a carved slab, candles in the corners
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(150,140,112,0.15)'; c.fillRect(x, y, w, h);
      const [mx, my] = roomMid(R), cx = mx * T, cy = my * T;   // the slab
      c.fillStyle = 'rgba(205,196,166,0.16)'; c.fillRect(cx - T * 0.55, cy - T * 0.8, T * 1.1, T * 1.6);
      c.strokeStyle = 'rgba(232,222,190,0.38)'; c.lineWidth = Math.max(1, T * 0.03); c.strokeRect(cx - T * 0.55, cy - T * 0.8, T * 1.1, T * 1.6);
      c.beginPath(); c.moveTo(cx, cy - T * 0.55); c.lineTo(cx, cy + T * 0.5); c.moveTo(cx - T * 0.3, cy - T * 0.2); c.lineTo(cx + T * 0.3, cy - T * 0.2); c.stroke();
    },
    armory(c, R, T) {   // iron plates with rivets, a straw target, arrows and broken shafts lying about, glints
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(108,118,140,0.17)'; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(205,215,232,0.14)'; c.lineWidth = Math.max(1, T * 0.03); c.beginPath();
      R.tiles.forEach(([tx, ty]) => c.rect((tx + 0.07) * T, (ty + 0.07) * T, T * 0.86, T * 0.86)); c.stroke();
      c.fillStyle = 'rgba(214,224,240,0.32)'; c.beginPath();
      R.tiles.forEach(([tx, ty]) => [[0.16, 0.16], [0.84, 0.16], [0.16, 0.84], [0.84, 0.84]].forEach(([u, v]) => { c.moveTo((tx + u) * T + T * 0.03, (ty + v) * T); c.arc((tx + u) * T, (ty + v) * T, T * 0.03, 0, Math.PI * 2); })); c.fill();
      R.tiles.forEach(([tx, ty]) => {   // arrows and shafts
        if (kH(tx, ty, 3) < 0.66) return;
        const px = (tx + 0.5) * T, py = (ty + 0.5) * T, a = kH(tx, ty, 4) * 6.28, L = T * 0.38, ex = Math.cos(a) * L, ey = Math.sin(a) * L;
        c.strokeStyle = 'rgba(150,110,70,0.85)'; c.lineWidth = Math.max(1, T * 0.03); c.beginPath(); c.moveTo(px - ex, py - ey); c.lineTo(px + ex, py + ey); c.stroke();
        c.fillStyle = 'rgba(200,210,225,0.9)'; c.beginPath(); c.moveTo(px + ex * 1.25, py + ey * 1.25); c.lineTo(px + ex - ey * 0.18, py + ey + ex * 0.18); c.lineTo(px + ex + ey * 0.18, py + ey - ex * 0.18); c.fill();
        c.strokeStyle = 'rgba(230,230,220,0.7)'; c.beginPath(); c.moveTo(px - ex, py - ey); c.lineTo(px - ex * 0.75 - ey * 0.2, py - ey * 0.75 + ex * 0.2); c.moveTo(px - ex, py - ey); c.lineTo(px - ex * 0.75 + ey * 0.2, py - ey * 0.75 - ex * 0.2); c.stroke();
      });
    },
    forge(c, R, T) {   // soot, cracks glowing from the heat, a bed of coals, an anvil
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(104,52,18,0.24)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 1) < 0.62) return; blob(c, (tx + 0.5) * T, (ty + 0.5) * T, T * 0.4, 4, tx * 41 + ty * 3, 'rgba(18,12,8,0.32)'); });
    },
    prison(c, R, T) {   // damp straw, a drain in the floor, a chain from the wall, days scratched in tally marks
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(78,74,64,0.26)'; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(196,176,110,0.5)'; c.lineWidth = Math.max(1, T * 0.025); c.beginPath();
      [[R.x0, R.y1], [R.x1, R.y0]].forEach(([tx, ty], ci) => { for (let k = 0; k < 26; k++) { const px = (tx + 0.1 + 0.8 * kH(ci, k, 1)) * T, py = (ty + 0.1 + 0.8 * kH(ci, k, 2)) * T, a = kH(ci, k, 3) * 6.28, L = T * (0.12 + 0.12 * kH(ci, k, 4)); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); } });
      c.stroke();
      const [mx, my] = roomMid(R), cx = mx * T, cy = my * T;   // the drain
      c.fillStyle = 'rgba(16,16,18,0.85)'; c.fillRect(cx - T * 0.26, cy - T * 0.26, T * 0.52, T * 0.52);
      c.strokeStyle = 'rgba(120,118,112,0.9)'; c.lineWidth = Math.max(1, T * 0.035); c.strokeRect(cx - T * 0.26, cy - T * 0.26, T * 0.52, T * 0.52);
      c.beginPath(); for (let k = 1; k < 4; k++) { c.moveTo(cx - T * 0.26 + k * T * 0.13, cy - T * 0.26); c.lineTo(cx - T * 0.26 + k * T * 0.13, cy + T * 0.26); } c.stroke();
      const sx = R.x0 * T + T * 0.1, sy = (R.y0 + 0.5) * T;   // a chain lying from the west wall
      c.strokeStyle = 'rgba(150,150,158,0.75)'; c.lineWidth = Math.max(1, T * 0.03);
      for (let k = 0; k < 9; k++) { const px = sx + k * T * 0.15, py = sy + Math.sin(k * 0.7) * T * 0.12; c.beginPath(); c.ellipse(px, py, T * (k % 2 ? 0.08 : 0.04), T * (k % 2 ? 0.04 : 0.07), 0, 0, Math.PI * 2); c.stroke(); }
      c.strokeStyle = 'rgba(226,218,200,0.4)'; c.lineWidth = Math.max(1, T * 0.02); c.beginPath();
      R.tiles.forEach(([tx, ty]) => { if (!edgeTile(R, tx, ty) || kH(tx, ty, 5) < 0.8) return; const px = (tx + 0.25) * T, py = (ty + 0.3) * T; for (let k = 0; k < 4; k++) { c.moveTo(px + k * T * 0.08, py); c.lineTo(px + k * T * 0.08, py + T * 0.3); } c.moveTo(px - T * 0.04, py + T * 0.25); c.lineTo(px + T * 0.3, py + T * 0.05); });
      c.stroke();
    },
    junk(c, R, T) {   // dust, and junk everywhere: books, planks, bottles, coins, a chair on its side
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(122,96,60,0.2)'; c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(220,206,180,0.12)'; c.beginPath(); R.tiles.forEach(([tx, ty]) => { for (let k = 0; k < 5; k++) { const px = (tx + kH(tx, ty, k)) * T, py = (ty + kH(tx, ty, k + 5)) * T; c.moveTo(px + T * 0.03, py); c.arc(px, py, T * 0.03, 0, Math.PI * 2); } }); c.fill();
      const BOOK = ['rgba(120,40,40,0.85)', 'rgba(40,70,110,0.85)', 'rgba(60,90,50,0.85)', 'rgba(120,96,40,0.85)'];
      R.tiles.forEach(([tx, ty]) => {
        const a = kH(tx, ty, 11), px = (tx + 0.25 + 0.5 * kH(tx, ty, 12)) * T, py = (ty + 0.25 + 0.5 * kH(tx, ty, 13)) * T, ang = kH(tx, ty, 14) * 6.28;
        c.save(); c.translate(px, py); c.rotate(ang);
        if (a > 0.85) { /* books stand up now (props) */ }
        else if (a > 0.72) { c.fillStyle = 'rgba(130,96,58,0.85)'; c.fillRect(-T * 0.3, -T * 0.05, T * 0.5, T * 0.1); c.beginPath(); c.moveTo(T * 0.2, -T * 0.05); c.lineTo(T * 0.3, -T * 0.02); c.lineTo(T * 0.24, T * 0.01); c.lineTo(T * 0.31, T * 0.05); c.lineTo(T * 0.2, T * 0.05); c.fill(); }
        else if (a > 0.62) { /* bottles too */ }
        else if (a > 0.5) { c.fillStyle = 'rgba(242,196,80,0.85)'; [[0, 0], [T * 0.08, T * 0.05], [-T * 0.06, T * 0.07]].forEach(([u, v]) => { c.beginPath(); c.arc(u, v, T * 0.045, 0, Math.PI * 2); c.fill(); }); }
        c.restore();
      });
    },
    gallery(c, R, T) {   // polished marble in two shades, a red runner with a gold border down the long side of the room
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(96,24,34,0.18)'; c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(255,244,236,0.06)'; c.beginPath(); R.tiles.forEach(([tx, ty]) => { if ((tx + ty) % 2 === 0) c.rect(tx * T, ty * T, T, T); }); c.fill();
      const horiz = w >= h, rw = T * 1.1;
      c.save();
      if (horiz) { c.translate(x, y + h / 2); } else { c.translate(x + w / 2, y); c.rotate(Math.PI / 2); }
      const L = horiz ? w : h;
      c.fillStyle = 'rgba(128,16,28,0.7)'; c.fillRect(T * 0.3, -rw / 2, L - T * 0.6, rw);
      c.strokeStyle = 'rgba(232,192,92,0.75)'; c.lineWidth = Math.max(1, T * 0.04); c.strokeRect(T * 0.38, -rw / 2 + T * 0.08, L - T * 0.76, rw - T * 0.16);
      c.fillStyle = 'rgba(232,192,92,0.5)';
      for (let u = T * 0.8; u < L - T * 0.6; u += T * 0.55) { c.beginPath(); c.moveTo(u, -T * 0.12); c.lineTo(u + T * 0.12, 0); c.lineTo(u, T * 0.12); c.lineTo(u - T * 0.12, 0); c.fill(); }
      c.restore();
    },
    nursery(c, R, T) {   // a faded round rug, blocks with letters, marbles, crayon on the floor, a rocking horse
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(206,158,178,0.13)'; c.fillRect(x, y, w, h);
      const [mx, my] = roomMid(R), cx = mx * T, cy = my * T;
      ['rgba(240,180,200,0.32)', 'rgba(170,220,200,0.32)', 'rgba(245,232,190,0.36)', 'rgba(240,180,200,0.32)', 'rgba(190,200,240,0.34)'].forEach((col, k) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, T * (1.15 - k * 0.2), T * (0.95 - k * 0.17), 0, 0, Math.PI * 2); c.fill(); });
      const LET = 'ABCDEFGH', BC = ['#e58aa8', '#7fc6a4', '#f0c96a', '#8ea6e8'];
      c.lineWidth = Math.max(1, T * 0.03);   // crayon scribbles by the walls
      R.tiles.forEach(([tx, ty]) => { if (!edgeTile(R, tx, ty) || kH(tx, ty, 6) < 0.7) return; c.strokeStyle = hexA(BC[Math.floor(kH(tx, ty, 7) * 4)], 0.45); c.beginPath(); let px = (tx + 0.2) * T, py = (ty + 0.5) * T; c.moveTo(px, py); for (let k = 0; k < 6; k++) { px += T * 0.1; py += (k % 2 ? -1 : 1) * T * 0.15; c.lineTo(px, py); } c.stroke(); });
    }
  };
  // the floor: what moves on it, drawn every frame over the cached still part (clipped to the room)
  const KIND_LIVE = {
    goblin(c, R, T, t) {   // the fire
      const [mx, my] = roomMid(R), cx = mx * T, cy = my * T, fl0 = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 5.3);
      c.drawImage(glowSprite('kfire', [[0, 'rgba(255,170,70,0.9)'], [0.35, 'rgba(255,90,30,0.45)'], [1, 'rgba(255,60,20,0)']]), cx - T * 0.3 * fl0, cy - T * 0.3 * fl0, T * 0.6 * fl0, T * 0.6 * fl0);
    },
    haunt(c, R, T, t) {   // the circle turning, the puddles glowing
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      const [mx, my] = roomMid(R), cx = mx * T, cy = my * T, a = 0.24 + 0.1 * Math.sin(t * 1.6);
      c.save(); c.translate(cx, cy); c.rotate(t * 0.12);
      c.strokeStyle = 'rgba(176,236,255,' + a.toFixed(2) + ')'; c.lineWidth = Math.max(1, T * 0.035);
      c.beginPath(); c.arc(0, 0, T * 1.05, 0, Math.PI * 2); c.moveTo(T * 0.86, 0); c.arc(0, 0, T * 0.86, 0, Math.PI * 2); c.stroke();
      c.beginPath(); for (let k = 0; k <= 5; k++) { const q = -Math.PI / 2 + k * 4 * Math.PI / 5; k ? c.lineTo(Math.cos(q) * T * 0.86, Math.sin(q) * T * 0.86) : c.moveTo(Math.cos(q) * T * 0.86, Math.sin(q) * T * 0.86); } c.stroke();
      c.restore();
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 3) < 0.82) return; const px = (tx + 0.5) * T, py = (ty + 0.5) * T, p = 0.5 + 0.5 * Math.sin(t * 2 + tx);
        const g = c.createRadialGradient(px, py, 0, px, py, T * 0.45); g.addColorStop(0, 'rgba(190,250,255,' + (0.18 + 0.14 * p).toFixed(2) + ')'); g.addColorStop(1, 'rgba(190,250,255,0)'); c.fillStyle = g; c.fillRect(px - T * 0.5, py - T * 0.5, T, T); });
    },
    bats(c, R, T, t) {   // the shadows of the flock
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      for (let k = 0; k < 3; k++) {   // the shadows of the flock
        const u = ((t * 0.18 + k * 0.33) % 1), px = x - T + (w + 2 * T) * u, py = y + h * (0.25 + 0.25 * k) + Math.sin(t * 2 + k) * T * 0.3, s = T * 0.28, fl1 = Math.sin(t * 16 + k) * 0.4;
        c.fillStyle = 'rgba(8,4,14,0.32)'; c.beginPath(); c.moveTo(px, py);
        c.quadraticCurveTo(px - s * 0.6, py - s * (0.5 + fl1), px - s * 1.2, py); c.quadraticCurveTo(px - s * 0.6, py - s * 0.1, px, py + s * 0.15);
        c.quadraticCurveTo(px + s * 0.6, py - s * 0.1, px + s * 1.2, py); c.quadraticCurveTo(px + s * 0.6, py - s * (0.5 + fl1), px, py); c.fill();
      }
    },
    armory(c, R, T, t) {   // glints running over the plates
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      for (let k = 0; k < 3; k++) {   // glints running over the plates
        const p = (t * 0.7 + k * 0.37) % 1; if (p > 0.25) continue;
        const tt = R.tiles[Math.floor(kH(k, Math.floor(t * 0.7 + k * 0.37), 7) * R.tiles.length) % R.tiles.length], px = (tt[0] + 0.3) * T, py = (tt[1] + 0.3) * T, s = T * 0.16 * Math.sin(p / 0.25 * Math.PI);
        c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = Math.max(1, T * 0.02); c.beginPath(); c.moveTo(px - s, py); c.lineTo(px + s, py); c.moveTo(px, py - s); c.lineTo(px, py + s); c.stroke();
      }
    },
    forge(c, R, T, t) {   // the heat: cracks glowing, coals, the anvil over them
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T, f = 0.7 + 0.3 * Math.sin(t * 6) * Math.sin(t * 3.7);
      const [mx, my] = roomMid(R), cx = mx * T, cy = my * T;
      [[6, 'rgba(255,120,40,' + (0.12 * f).toFixed(2) + ')'], [2, 'rgba(255,170,80,' + (0.5 * f).toFixed(2) + ')']].forEach(([lw, col]) => {
        c.strokeStyle = col; c.lineWidth = Math.max(1, T * 0.02 * lw); c.beginPath();
        for (let k = 0; k < 6; k++) { let a = k * Math.PI / 3 + kH(R.x0, R.y0, k) * 0.6, px = cx, py = cy; c.moveTo(px, py); for (let s = 0; s < 4; s++) { a += (kH(k, s, R.x1) - 0.5) * 0.9; const L = T * 0.45; px += Math.cos(a) * L; py += Math.sin(a) * L; c.lineTo(px, py); } }
        c.stroke();
      });
    },
    gallery(c, R, T, t) {   // a sheen sliding over the polish
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      const g = c.createLinearGradient(x, y, x + w, y + h), p = 0.5 + 0.5 * Math.sin(t * 0.6);   // a sheen sliding over the polish
      g.addColorStop(Math.max(0, p - 0.12), 'rgba(255,255,255,0)'); g.addColorStop(p, 'rgba(255,250,240,0.06)'); g.addColorStop(Math.min(1, p + 0.12), 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(x, y, w, h);
    }
  };
  // a room with any part on screen (its floor, and a little above it)
  function roomSeen(R, T) {
    const P = [W2S(R.x0, R.y0, 0), W2S(R.x1 + 1, R.y0, 0), W2S(R.x0, R.y1 + 1, 0), W2S(R.x1 + 1, R.y1 + 1, 0)];
    return Math.max(...P.map(p => p[0])) > -T && Math.min(...P.map(p => p[0])) < cw + T && Math.max(...P.map(p => p[1])) > -T && Math.min(...P.map(p => p[1])) < ch + T * 2;
  }
  // the still part of a komnata's floor, painted once into a canvas per room (again when the room, its komnata or the zoom
  // changes by a step), at the screen's resolution: a phone draws one picture a frame instead of hundreds of strokes
  const KFC = new Map();
  function kindFloorCache(R, T) {
    const s = Math.max(4, Math.round(T * DPR / 3) * 3), W = R.x1 - R.x0 + 1, H = R.y1 - R.y0 + 1, key = R.rk + '|' + s + '|' + R.x0 + ',' + R.y0 + ',' + W + ',' + H;
    let e = KFC.get(R.key);
    if (e && e.key === key) return e.c;
    if (KFC.size > 80) KFC.clear();
    const c = (e && e.c) || document.createElement('canvas'); c.width = W * s; c.height = H * s;
    const g = c.getContext('2d'); g.translate(-R.x0 * s, -R.y0 * s);
    KIND_FLOOR[R.rk](g, R, s);
    KFC.set(R.key, { key, c }); return c;
  }
  function drawRoomKinds(T) {
    if (T < 6) return;
    const t = reduceMotion ? 0 : realNow;
    kindRooms().forEach(R => {
      if (!KIND_FLOOR[R.rk] || !roomSeen(R, T)) return;   // only what is on screen
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      ctx.drawImage(kindFloorCache(R, T), x, y, w, h);
      const lv = KIND_LIVE[R.rk]; if (!lv) return;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      lv(ctx, R, T, t);
      ctx.restore();
    });
  }
  /* ================= 1.15: what stands in a komnata (author: "small raised things that fit the theme, and particles") ================= */
  // Little things standing on the floor of a komnata (mushrooms, egg sacs, skull piles, a weapon rack, toy blocks...). Each room
  // gets its set once (fixed by the tiles, PROP_PLAN), and every frame the ones on screen join what stands, sorted by depth with
  // the heroes, monsters and furniture (drawSO kind 5), so a hero walking behind a cauldron is hidden by it. Nothing is put on a
  // tile with a trap, a monster, furniture or the heart; they never block anyone. Fog dims them like furniture.
  function pCyl(cx, cy, r, h, side, top, z0, ring) {   // an upright cylinder r wide (tiles), h high, lit from the left
    const T = cam.s, z = z0 || 0, b = W2S(cx, cy, z), t = W2S(cx, cy, z + h), rx = T * r, ry = rx * SP;
    ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(b[0] - rx, t[1]); ctx.lineTo(b[0] - rx, b[1]); ctx.ellipse(b[0], b[1], rx, ry, 0, Math.PI, 0, true); ctx.lineTo(b[0] + rx, t[1]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.moveTo(b[0] + rx * 0.2, t[1]); ctx.lineTo(b[0] + rx * 0.2, b[1] + ry * 0.98); ctx.ellipse(b[0], b[1], rx, ry, 0, Math.PI * 0.44, 0, true); ctx.lineTo(b[0] + rx, t[1]); ctx.fill();
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = Math.max(1, T * 0.025); [0.25, 0.7].forEach(f => { const q = W2S(cx, cy, z + h * f); ctx.beginPath(); ctx.ellipse(q[0], q[1], rx, ry, 0, 0, Math.PI); ctx.stroke(); }); }
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function pBall(cx, cy, z, r, col, sh) {   // a ball (r in tiles) whose bottom is z above the floor
    const T = cam.s, p = W2S(cx, cy, z + r * 0.9), rr = T * r;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sh || 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.arc(p[0], p[1], rr, -0.3, Math.PI * 0.85); ctx.arc(p[0] - rr * 0.25, p[1] - rr * 0.25, rr * 0.85, Math.PI * 0.85, -0.3, true); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.arc(p[0] - rr * 0.35, p[1] - rr * 0.38, rr * 0.28, 0, Math.PI * 2); ctx.fill();
    return p;
  }
  function pCone(cx, cy, r, h, col, dark, z0) {   // a cone standing (or hanging, h < 0) on its round base
    const T = cam.s, z = z0 || 0, b = W2S(cx, cy, z), a = W2S(cx, cy, z + h), rx = T * r, ry = rx * SP;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(b[0] - rx, b[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0] + rx, b[1]); ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(b[0] + rx * 0.15, b[1] + ry); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0] + rx, b[1]); ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI * 0.45); ctx.fill();
  }
  function pFlame(px, py, s, t, seed, inner, outer, glow) {   // a little flame standing at a screen point (s: its height, px)
    const f = 0.82 + 0.18 * Math.sin(t * 11 + seed) * Math.sin(t * 6.3 + seed * 2);
    if (glow) { const g = s * 3.2; ctx.drawImage(glowSprite(glow[0], glow[1]), px - g, py - g * 0.8, g * 2, g * 2); }
    ctx.fillStyle = outer; ctx.beginPath(); ctx.ellipse(px, py - s * 0.45 * f, s * 0.32, s * 0.55 * f, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = inner; ctx.beginPath(); ctx.ellipse(px, py - s * 0.32 * f, s * 0.15, s * 0.3 * f, 0, 0, Math.PI * 2); ctx.fill();
  }
  const pLine = (a, b, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  // where the props of each komnata go: [type, x, y, scale, variant, height] (x, y on the floor, in tiles)
  const PROP_PLAN = (() => {
    const at = (tx, ty, s) => [tx + 0.22 + 0.56 * kH(tx, ty, s), ty + 0.22 + 0.56 * kH(tx, ty, s + 1)];
    const scatter = (R, out, salt, pEdge, pIn, pick) => R.tiles.forEach(([tx, ty]) => {
      const e = edgeTile(R, tx, ty), r = kH(tx, ty, salt); if (r > (e ? pEdge : pIn)) return;
      const [x, y] = at(tx, ty, salt + 2), q = kH(tx, ty, salt + 5), t = pick(q, e); if (t) out.push([t[0], x, y, 0.85 + 0.3 * kH(tx, ty, salt + 7), Math.floor(kH(tx, ty, salt + 9) * 4), t[1]]);
    });
    const mid = (R, out, type, hh) => { const [mx, my] = roomMid(R); out.push([type, mx, my, 1, 0, hh]); };
    return {
      goblin(R, o) { mid(R, o, 'campfire', 0.5); scatter(R, o, 101, 0.6, 0.22, (q, e) => q < 0.45 ? ['shroom', 0.3] : q < 0.75 ? ['rocks', 0.2] : e && q > 0.9 ? ['totem', 0.9] : ['sticks', 0.1]); },
      spider(R, o) { scatter(R, o, 111, 0.65, 0.25, (q, e) => q < 0.4 ? ['eggs', 0.25] : q < 0.6 ? ['cocoon', 0.25] : q < 0.82 ? ['silk', 0.2] : ['spiderling', 0.1]); },
      ogre(R, o) { mid(R, o, 'cauldron', 0.6); scatter(R, o, 121, 0.6, 0.2, (q) => q < 0.45 ? ['bones', 0.25] : q < 0.75 ? ['boulder', 0.35] : ['meat', 0.2]); },
      haunt(R, o) { scatter(R, o, 131, 0.55, 0.15, (q, e) => q < 0.5 ? ['candlesB', 0.45] : q < 0.75 ? ['chair', 0.5] : ['urn', 0.4]); },
      bats(R, o) { scatter(R, o, 141, 0.7, 0.3, (q) => q < 0.6 ? ['stalag', 0.6] : ['guano', 0.15]); },
      ossuary(R, o) { scatter(R, o, 151, 0.7, 0.2, (q, e) => q < 0.45 ? ['skullpile', 0.4] : q < 0.75 ? ['candlesW', 0.45] : ['bonestack', 0.2]); },
      armory(R, o) { mid(R, o, 'target', 0.95); scatter(R, o, 161, 0.55, 0.2, (q, e) => e && q < 0.35 ? ['rack', 0.95] : q < 0.6 ? ['shield', 0.5] : ['arrowsUp', 0.45]); },
      forge(R, o) { mid(R, o, 'brazier', 0.5); const ax = R.x0 + Math.max(0.6, (R.x1 - R.x0 + 1) * 0.25), ay = R.y0 + (R.y1 - R.y0 + 1) * 0.72; o.push(['anvil', ax, ay, 1, 0, 0.45]); scatter(R, o, 171, 0.5, 0.15, (q) => q < 0.4 ? ['bucketW', 0.35] : q < 0.7 ? ['ingots', 0.15] : ['tongs', 0.1]); },
      prison(R, o) { o.push(['rat', R.x0 + 0.6, R.y1 + 0.4, 1, 0, 0.1]); scatter(R, o, 181, 0.6, 0.18, (q, e) => q < 0.4 ? ['straw', 0.2] : q < 0.6 ? ['bucket', 0.35] : q < 0.85 ? ['peg', 0.2] : ['bowl', 0.1]); },
      junk(R, o) { scatter(R, o, 191, 0.75, 0.35, (q) => q < 0.25 ? ['crateS', 0.35] : q < 0.42 ? ['barrelS', 0.4] : q < 0.62 ? ['bottles', 0.3] : q < 0.82 ? ['books', 0.2] : ['sack', 0.3]); },
      gallery(R, o) {   // posts with a rope along the runner, busts and vases on pedestals by the walls
        const w = R.x1 - R.x0 + 1, h = R.y1 - R.y0 + 1, horiz = w >= h, [mx, my] = roomMid(R), L = horiz ? w : h;
        for (let u = 0.6; u <= L - 0.5; u += 1.2) [-1, 1].forEach(sd => o.push(['post', horiz ? R.x0 + u : mx + sd * 0.75, horiz ? my + sd * 0.75 : R.y0 + u, 1, sd, 0.45]));
        scatter(R, o, 201, 0.45, 0, (q) => q < 0.5 ? ['bust', 0.8] : q < 0.8 ? ['vase', 0.75] : ['candelabra', 0.8]);
      },
      nursery(R, o) { scatter(R, o, 211, 0.6, 0.3, (q) => q < 0.35 ? ['blocks', 0.4] : q < 0.55 ? ['ball', 0.25] : q < 0.75 ? ['teddy', 0.4] : q < 0.88 ? ['drum', 0.25] : ['top', 0.2]); }
    };
  })();
  const KPROP = new Map();
  function kindProps(R) {
    const k = R.rk + '|' + R.x0 + ',' + R.y0 + ',' + R.x1 + ',' + R.y1; let e = KPROP.get(R.key);
    if (e && e.key === k) return e.list;
    const raw = []; if (PROP_PLAN[R.rk]) PROP_PLAN[R.rk](R, raw);
    const list = raw.map(([t, x, y, s, v, h]) => ({ t, x, y, s, v, h, seed: (x * 7.3 + y * 3.1) % 10 }));
    if (KPROP.size > 80) KPROP.clear(); KPROP.set(R.key, { key: k, list }); return list;
  }
  // the props on screen join what stands (drawWorld step 3)
  function kindPropsSO(SO, T) {
    if (T < 9) return;
    kindRooms().forEach(R => {
      if (!roomSeen(R, T)) return;
      kindProps(R).forEach(p => {
        const tx = Math.floor(p.x), ty = Math.floor(p.y), k = key(tx, ty);
        if (fl.items.has(k) || fl.objects.has(k) || isHeart(tx, ty) || tileAt(tx, ty) !== FLOOR) return;
        if (!onScreen(W2S(p.x, p.y, 0), T * 2)) return;
        SO.push([p.x + p.y, 5, p, p.x, p.y, p.h]);
      });
    });
  }
  const PROP_K = 1.3;
  function drawProp(p, T) {
    const f = PROP[p.t]; if (!f) return;
    ctx.save(); ctx.globalAlpha = fogged(Math.floor(p.x), Math.floor(p.y)) ? 0.55 : 1;
    { const a = W2S(p.x, p.y, 0); ctx.translate(a[0], a[1]); ctx.scale(PROP_K, PROP_K); ctx.translate(-a[0], -a[1]); }   // a little bigger than drawn, around its foot
    try { f(p, T, reduceMotion ? 0 : realNow); } finally { ctx.restore(); }
  }
  const PROP = {
    campfire(p, T, t) {   // logs crossed over the fire ring, the flame on them, sparks
      const x = p.x, y = p.y;
      pLine(W2S(x - 0.24, y - 0.1, 0.06), W2S(x + 0.24, y + 0.1, 0.06), '#4a2e16', Math.max(2, T * 0.09));
      pLine(W2S(x - 0.1, y + 0.24, 0.06), W2S(x + 0.1, y - 0.24, 0.06), '#5a3a1c', Math.max(2, T * 0.09));
      const q = W2S(x, y, 0.1); pFlame(q[0], q[1], T * 0.42, t, p.seed, 'rgba(255,214,110,0.95)', 'rgba(255,110,30,0.9)', ['kfire2', [[0, 'rgba(255,160,70,0.42)'], [0.5, 'rgba(255,110,40,0.12)'], [1, 'rgba(255,90,30,0)']]]);
      if (!reduceMotion) for (let k = 0; k < 3; k++) { const u = (t * 0.7 + k / 3 + p.seed * 0.1) % 1, s = W2S(x + Math.sin(u * 7 + k) * 0.12, y, 0.25 + u * 0.9); ctx.fillStyle = 'rgba(255,190,90,' + (0.9 * (1 - u)).toFixed(2) + ')'; ctx.fillRect(s[0], s[1], Math.max(1, T * 0.025), Math.max(1, T * 0.025)); }
    },
    shroom(p, T, t) {   // two or three glowing mushrooms
      const n = 2 + (p.v % 2), pul = 0.75 + 0.25 * Math.sin(t * 1.7 + p.seed);
      groundShadow(p.x, p.y, 0.18, 0.12, 0.3);
      for (let k = 0; k < n; k++) {
        const x = p.x + (k - 1) * 0.1 * p.s, y = p.y + ((k * 37) % 3 - 1) * 0.06, h = (0.14 + 0.08 * ((k + p.v) % 3)) * p.s, b = W2S(x, y, 0), c = W2S(x, y, h), r = T * (0.07 + 0.03 * ((k + p.v) % 2)) * p.s;
        pLine(b, c, '#d8d0b8', Math.max(1.5, T * 0.035));
        ctx.drawImage(glowSprite('kshroom', [[0, 'rgba(150,240,110,0.5)'], [1, 'rgba(150,240,110,0)']]), c[0] - r * 2.4 * pul, c[1] - r * 2.4 * pul, r * 4.8 * pul, r * 4.8 * pul);
        ctx.fillStyle = '#6cc24a'; ctx.beginPath(); ctx.ellipse(c[0], c[1], r, r * 0.62, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#2f6a22'; ctx.fillRect(c[0] - r, c[1] - 0.5, r * 2, Math.max(1, r * 0.18));
        ctx.fillStyle = 'rgba(230,255,200,0.85)'; ctx.beginPath(); ctx.arc(c[0] - r * 0.35, c[1] - r * 0.3, Math.max(0.8, r * 0.14), 0, 7); ctx.arc(c[0] + r * 0.3, c[1] - r * 0.4, Math.max(0.8, r * 0.11), 0, 7); ctx.fill();
      }
    },
    rocks(p, T) { groundShadow(p.x, p.y, 0.2, 0.14, 0.3); [[-0.08, 0.02, 0.09], [0.07, -0.04, 0.07], [0.02, 0.08, 0.05]].forEach(([u, v, r], k) => { if (k < 2 + (p.v % 2)) pBall(p.x + u, p.y + v, -r * 0.3, r * p.s, k ? '#6e6658' : '#7c7466'); }); },
    sticks(p, T) { [[-0.15, -0.05, 0.12, 0.08], [-0.1, 0.1, 0.14, -0.06], [0, -0.14, -0.02, 0.15]].forEach(([a, b, c, d]) => pLine(W2S(p.x + a, p.y + b, 0.02), W2S(p.x + c, p.y + d, 0.03), '#5a3e22', Math.max(1.5, T * 0.035))); },
    totem(p, T) {   // a stick with a skull on top, a green rag
      groundShadow(p.x, p.y, 0.1, 0.07, 0.35);
      const b = W2S(p.x, p.y, 0), a = W2S(p.x, p.y, 0.72); pLine(b, a, '#5a3e22', Math.max(2, T * 0.05));
      ctx.fillStyle = '#6cae3e'; ctx.beginPath(); ctx.moveTo(a[0], a[1] + T * 0.12); ctx.lineTo(a[0] + T * 0.16, a[1] + T * 0.18); ctx.lineTo(a[0] + T * 0.03, a[1] + T * 0.28); ctx.fill();
      skullT(ctx, a[0], a[1] - T * 0.04, T * 0.2, '#e2d8bc', 'rgba(140,128,100,0.5)', '#1c1612');
    },
    eggs(p, T) {   // a cluster of egg sacs stuck together with silk
      groundShadow(p.x, p.y, 0.2, 0.13, 0.3);
      [[0, 0, 0.09], [-0.1, 0.05, 0.07], [0.09, 0.04, 0.075], [0.02, -0.08, 0.065], [-0.04, 0.1, 0.06]].forEach(([u, v, r], k) => { if (k < 3 + (p.v % 3)) pBall(p.x + u, p.y + v, k === 0 ? 0.04 : 0, r * p.s, '#eee8da', 'rgba(150,140,160,0.35)'); });
      const c = W2S(p.x, p.y, 0.15); ctx.strokeStyle = 'rgba(240,236,250,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); [[-0.2, 0.1], [0.2, 0.12], [0.05, -0.2]].forEach(([u, v]) => { const q = W2S(p.x + u, p.y + v, 0); ctx.moveTo(c[0], c[1]); ctx.lineTo(q[0], q[1]); }); ctx.stroke();
    },
    cocoon(p, T) {   // something wrapped in silk, lying on the floor
      groundShadow(p.x, p.y, 0.22, 0.1, 0.3);
      const a = W2S(p.x - 0.18, p.y + 0.06, 0.1), b = W2S(p.x + 0.18, p.y - 0.06, 0.1), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.fillStyle = '#ddd6c6'; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.62, T * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, T * 0.03, L * 0.58, T * 0.06, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(140,130,120,0.75)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -3; k <= 3; k++) { ctx.moveTo(k * L * 0.15 - T * 0.03, -T * 0.09); ctx.lineTo(k * L * 0.15 + T * 0.03, T * 0.09); } ctx.stroke();
      ctx.restore();
    },
    silk(p, T) { groundShadow(p.x, p.y, 0.16, 0.1, 0.2); [[0, 0, 0.08], [-0.08, 0.03, 0.06], [0.07, 0.04, 0.055]].forEach(([u, v, r]) => pBall(p.x + u, p.y + v, -r * 0.4, r * p.s, 'rgba(232,228,244,0.72)', 'rgba(160,150,180,0.25)')); },
    spiderling(p, T, t) {   // a small spider going to and fro
      const u = Math.sin(t * 0.6 + p.seed * 3) * 0.25, x = p.x + u, y = p.y + Math.cos(t * 0.45 + p.seed) * 0.15, c = W2S(x, y, 0.06), s = T * 0.07;
      groundShadow(x, y, 0.08, 0.05, 0.35);
      ctx.strokeStyle = '#140c18'; ctx.lineWidth = Math.max(1, T * 0.018); ctx.beginPath();
      for (let l = 0; l < 4; l++) [-1, 1].forEach(sd => { const a = (l - 1.5) * 0.45 + Math.sin(t * 14 + l + sd) * 0.15; ctx.moveTo(c[0], c[1]); ctx.quadraticCurveTo(c[0] + sd * s * 1.4, c[1] - s * 0.8 + a * s, c[0] + sd * s * 2.2, c[1] + s * 0.4 + a * s * 1.4); });
      ctx.stroke(); ctx.fillStyle = '#1b1320'; ctx.beginPath(); ctx.ellipse(c[0], c[1], s * 0.8, s * 0.65, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(c[0], c[1] - s * 0.7, s * 0.45, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff5a6a'; ctx.fillRect(c[0] - s * 0.25, c[1] - s * 0.8, Math.max(1, s * 0.15), Math.max(1, s * 0.15)); ctx.fillRect(c[0] + s * 0.1, c[1] - s * 0.8, Math.max(1, s * 0.15), Math.max(1, s * 0.15));
    },
    cauldron(p, T, t) {   // a black pot over embers, something green bubbling in it, steam
      const x = p.x, y = p.y; groundShadow(x, y, 0.36, 0.26, 0.45);
      ctx.drawImage(glowSprite('kember', [[0, 'rgba(255,120,40,0.35)'], [1, 'rgba(255,90,30,0)']]), W2S(x, y, 0)[0] - T * 0.5, W2S(x, y, 0)[1] - T * 0.3, T, T * 0.6);
      [[-0.2, 0.12], [0.2, 0.12], [0, -0.22]].forEach(([u, v]) => pLine(W2S(x + u, y + v, 0), W2S(x + u * 0.7, y + v * 0.7, 0.18), '#1a1a1e', Math.max(1.5, T * 0.04)));
      const b = W2S(x, y, 0.12), r = T * 0.3, top = W2S(x, y, 0.42);
      ctx.fillStyle = '#22232a'; ctx.beginPath(); ctx.moveTo(b[0] - r, top[1]); ctx.bezierCurveTo(b[0] - r * 1.15, b[1], b[0] - r * 0.5, b[1] + r * 0.35, b[0], b[1] + r * 0.3); ctx.bezierCurveTo(b[0] + r * 0.5, b[1] + r * 0.35, b[0] + r * 1.15, b[1], b[0] + r, top[1]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.ellipse(b[0] - r * 0.5, b[1] - r * 0.2, r * 0.18, r * 0.35, 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a3c44'; ctx.beginPath(); ctx.ellipse(top[0], top[1], r, r * SP, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5a8a2e'; ctx.beginPath(); ctx.ellipse(top[0], top[1] + 1, r * 0.82, r * SP * 0.8, 0, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) { const u = (t * 0.9 + k * 0.37 + p.seed) % 1, bx = top[0] + Math.cos(k * 2.1) * r * 0.45, by = top[1] + Math.sin(k * 2.1) * r * SP * 0.4; ctx.fillStyle = 'rgba(150,210,90,' + (0.9 * (1 - u)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(bx, by - u * T * 0.05, T * 0.03 * (0.5 + u), 0, 7); ctx.fill(); }
      if (!reduceMotion) for (let k = 0; k < 4; k++) { const u = (t * 0.25 + k / 4 + p.seed * 0.1) % 1; ctx.fillStyle = 'rgba(200,220,190,' + (0.22 * (1 - u)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(top[0] + Math.sin(u * 6 + k) * T * 0.12, top[1] - u * T * 1.1, T * (0.06 + 0.14 * u), 0, 7); ctx.fill(); }
    },
    bones(p, T) {   // a heap of bones with a skull on it
      groundShadow(p.x, p.y, 0.24, 0.15, 0.35);
      [[-0.15, 0.05, 0.14, -0.06], [-0.12, -0.08, 0.13, 0.09], [-0.02, 0.13, 0.05, -0.15]].forEach(([a, b, c, d], k) => { const P0 = W2S(p.x + a, p.y + b, 0.04 + k * 0.03), P1 = W2S(p.x + c, p.y + d, 0.04 + k * 0.03); pLine(P0, P1, k % 2 ? '#d2c6a8' : '#e2d8bc', Math.max(2, T * 0.05)); [P0, P1].forEach(q => { ctx.fillStyle = '#e8dec4'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, T * 0.035), 0, 7); ctx.fill(); }); });
      if (p.v % 2 === 0) { const q = W2S(p.x + 0.02, p.y, 0.14); skullT(ctx, q[0], q[1], T * 0.18, '#e2d8bc', 'rgba(140,128,100,0.5)', '#1c1612'); }
    },
    boulder(p, T) { groundShadow(p.x, p.y, 0.26, 0.17, 0.4); pBall(p.x, p.y, -0.06, 0.17 * p.s, '#6a5a4c'); if (p.v % 2) pBall(p.x + 0.14, p.y + 0.08, -0.03, 0.08 * p.s, '#5c4e42'); },
    meat(p, T) {   // a gnawed leg bone with meat still on it
      groundShadow(p.x, p.y, 0.2, 0.1, 0.35);
      const a = W2S(p.x - 0.16, p.y + 0.04, 0.06), b = W2S(p.x + 0.16, p.y - 0.04, 0.06);
      pLine(a, b, '#e8dec4', Math.max(2, T * 0.05)); ctx.fillStyle = '#e8dec4'; [a, b].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(2, T * 0.045), 0, 7); ctx.fill(); });
      ctx.fillStyle = '#8a2a20'; ctx.beginPath(); ctx.ellipse((a[0] + b[0]) / 2 - T * 0.03, (a[1] + b[1]) / 2, T * 0.11, T * 0.075, -0.2, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,190,170,0.3)'; ctx.beginPath(); ctx.ellipse((a[0] + b[0]) / 2 - T * 0.06, (a[1] + b[1]) / 2 - T * 0.03, T * 0.04, T * 0.025, -0.2, 0, 7); ctx.fill();
    },
    candlesB(p, T, t) { candles(p, T, t, '#cfd8e0', ['rgba(200,240,255,0.95)', 'rgba(100,190,255,0.85)'], ['kcandB', [[0, 'rgba(140,210,255,0.35)'], [1, 'rgba(140,210,255,0)']]]); },
    candlesW(p, T, t) { candles(p, T, t, '#efe6cc', ['rgba(255,236,170,0.95)', 'rgba(255,150,50,0.85)'], ['kcandW', [[0, 'rgba(255,200,120,0.35)'], [1, 'rgba(255,200,120,0)']]]); },
    chair(p, T) {   // a chair knocked over
      groundShadow(p.x, p.y, 0.24, 0.14, 0.35);
      const c = '#4a3626', s0 = W2S(p.x - 0.15, p.y - 0.1, 0.2), s1 = W2S(p.x + 0.15, p.y - 0.1, 0.2), s2 = W2S(p.x + 0.15, p.y + 0.15, 0.2), s3 = W2S(p.x - 0.15, p.y + 0.15, 0.2);
      [[-0.15, -0.1], [0.15, -0.1], [0.15, 0.15], [-0.15, 0.15]].forEach(([u, v]) => pLine(W2S(p.x + u, p.y + v, 0), W2S(p.x + u, p.y + v, 0.2), '#3a2a1e', Math.max(1.5, T * 0.03)));
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]); ctx.lineTo(s3[0], s3[1]); ctx.fill();
      const b0 = W2S(p.x - 0.15, p.y - 0.1, 0.2), b1 = W2S(p.x + 0.15, p.y - 0.1, 0.2), b2 = W2S(p.x + 0.15, p.y - 0.25, 0.48), b3 = W2S(p.x - 0.15, p.y - 0.25, 0.48);
      ctx.fillStyle = '#3e2c20'; ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b3[0], b3[1]); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    },
    urn(p, T) { groundShadow(p.x, p.y, 0.14, 0.09, 0.35); pCyl(p.x, p.y, 0.09, 0.08, '#5a6070', '#6e7484'); const q = pBall(p.x, p.y, 0.06, 0.12, '#6e7484'); ctx.fillStyle = '#4a4e5a'; ctx.fillRect(q[0] - T * 0.05, q[1] - T * 0.17, T * 0.1, T * 0.05); },
    stalag(p, T) { const n = 1 + (p.v % 3); groundShadow(p.x, p.y, 0.2, 0.13, 0.35); for (let k = 0; k < n; k++) pCone(p.x + (k - (n - 1) / 2) * 0.12, p.y + (k % 2) * 0.06, 0.07 + 0.02 * ((k + p.v) % 2), (0.28 + 0.16 * ((k * 2 + p.v) % 3)) * p.s, '#4a4054', '#2c2434'); },
    guano(p, T) { [[0, 0, 0.09], [0.09, 0.05, 0.06]].forEach(([u, v, r]) => { const q = W2S(p.x + u, p.y + v, 0), rr = T * r; ctx.fillStyle = '#d8d2c0'; ctx.beginPath(); ctx.ellipse(q[0], q[1], rr, rr * 0.55, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(q[0] + rr * 0.3, q[1], rr * 0.6, rr * 0.4, 0, Math.PI, 0); ctx.fill(); }); },
    skullpile(p, T) {   // skulls piled into a little pyramid
      groundShadow(p.x, p.y, 0.24, 0.15, 0.35);
      const s = T * 0.17 * p.s; [[-0.09, 0.05, 0], [0.09, -0.03, 0], [0.02, 0.1, 0], [0, 0.01, 0.13]].forEach(([u, v, z], k) => { if (k === 3 && p.v === 3) return; const q = W2S(p.x + u, p.y + v, z + 0.08); skullT(ctx, q[0], q[1], s, k === 3 ? '#e8dec4' : '#d6ccb0', 'rgba(130,118,94,0.5)', '#1c1612'); });
    },
    bonestack(p, T) { groundShadow(p.x, p.y, 0.24, 0.13, 0.3); for (let k = 0; k < 4; k++) { const z = 0.03 + Math.floor(k / 2) * 0.05, o = (k % 2) * 0.06 - 0.03; const a = W2S(p.x - 0.18, p.y + o, z), b = W2S(p.x + 0.18, p.y + o, z); pLine(a, b, k % 2 ? '#cfc4a8' : '#e2d8bc', Math.max(2, T * 0.045)); ctx.fillStyle = '#e8dec4'; [a, b].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, T * 0.032), 0, 7); ctx.fill(); }); } },
    target(p, T) {   // an archery target on its easel, arrows in it
      groundShadow(p.x, p.y, 0.3, 0.16, 0.35);
      [[-0.18, 0.08], [0.18, 0.08], [0, -0.16]].forEach(([u, v]) => pLine(W2S(p.x + u, p.y + v, 0), W2S(p.x, p.y, 0.7), '#5a3e22', Math.max(2, T * 0.04)));
      const c = W2S(p.x, p.y + 0.05, 0.55), r = T * 0.3;
      ['#e8dcb8', '#b8342c', '#e8dcb8', '#b8342c', '#f2c94c'].forEach((col, k) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(c[0], c[1], r * (1 - k * 0.19), r * (1 - k * 0.19) * 0.92, 0, 0, 7); ctx.fill(); });
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = Math.max(1.5, T * 0.035); ctx.beginPath(); ctx.ellipse(c[0], c[1], r, r * 0.92, 0, 0, 7); ctx.stroke();
      [[0.3, -0.2], [-0.25, 0.1], [0.05, 0.35]].forEach(([u, v]) => { const a = [c[0] + u * r, c[1] + v * r]; pLine(a, [a[0] - T * 0.12, a[1] + T * 0.08], '#6e5232', Math.max(1, T * 0.022)); ctx.fillStyle = '#e8e2d2'; ctx.fillRect(a[0] - T * 0.14, a[1] + T * 0.06, T * 0.05, T * 0.04); });
    },
    rack(p, T) {   // a weapon rack: two posts, a bar, spears and a sword standing in it
      groundShadow(p.x, p.y, 0.3, 0.14, 0.35);
      const L = [p.x - 0.22, p.y + 0.1], Rr = [p.x + 0.22, p.y - 0.1];
      [L, Rr].forEach(([u, v]) => pLine(W2S(u, v, 0), W2S(u, v, 0.55), '#5a3e22', Math.max(2, T * 0.05)));
      pLine(W2S(L[0], L[1], 0.45), W2S(Rr[0], Rr[1], 0.45), '#6e4c2a', Math.max(2, T * 0.04));
      for (let k = 0; k < 3; k++) { const f = 0.2 + k * 0.3, u = L[0] + (Rr[0] - L[0]) * f, v = L[1] + (Rr[1] - L[1]) * f, b = W2S(u, v, 0), a = W2S(u + 0.02, v - 0.02, 0.95);
        pLine(b, a, k === 1 ? '#c6ced8' : '#6e5232', Math.max(1.5, T * (k === 1 ? 0.04 : 0.025)));
        if (k !== 1) { ctx.fillStyle = '#c6ced8'; ctx.beginPath(); ctx.moveTo(a[0], a[1] - T * 0.12); ctx.lineTo(a[0] + T * 0.035, a[1] + T * 0.02); ctx.lineTo(a[0] - T * 0.035, a[1] + T * 0.02); ctx.fill(); }
        else { ctx.fillStyle = '#8a6a32'; ctx.fillRect(a[0] - T * 0.07, a[1] + T * 0.32, T * 0.14, T * 0.03); } }
    },
    shield(p, T) {   // a round shield leaning, its boss catching the light
      groundShadow(p.x + 0.05, p.y, 0.2, 0.08, 0.35);
      const c = W2S(p.x, p.y, 0.22), r = T * 0.2;
      ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.ellipse(c[0] + T * 0.03, c[1] + T * 0.02, r * 0.85, r, 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = p.v % 2 ? '#7a2a24' : '#2a4a7a'; ctx.beginPath(); ctx.ellipse(c[0], c[1], r * 0.85, r, 0.3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.stroke();
      ctx.fillStyle = '#c9cfd8'; ctx.beginPath(); ctx.arc(c[0], c[1], r * 0.22, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(c[0] - r * 0.12, c[1] - r * 0.12, Math.max(1, r * 0.08), Math.max(1, r * 0.08));
    },
    arrowsUp(p, T) { [[-0.06, 0.03, 0.3], [0.05, -0.04, -0.25], [0.1, 0.07, 0.1]].forEach(([u, v, lean], k) => { if (k > 1 + (p.v % 2)) return; const b = W2S(p.x + u, p.y + v, 0), a = [b[0] + lean * T * 0.3, b[1] - T * 0.4]; pLine(b, a, '#7a5a3a', Math.max(1, T * 0.025)); ctx.fillStyle = '#e6e0d0'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] - T * 0.04, a[1] + T * 0.1); ctx.lineTo(a[0] + T * 0.04, a[1] + T * 0.1); ctx.fill(); }); },
    brazier(p, T, t) {   // an iron brazier full of glowing coals
      const x = p.x, y = p.y; groundShadow(x, y, 0.3, 0.2, 0.45);
      [[-0.18, 0.1], [0.18, 0.1], [0, -0.2]].forEach(([u, v]) => pLine(W2S(x + u, y + v, 0), W2S(x + u * 0.8, y + v * 0.8, 0.28), '#1e1f24', Math.max(2, T * 0.045)));
      pCyl(x, y, 0.24, 0.12, '#2a2b30', '#141418', 0.26);
      const top = W2S(x, y, 0.38), r = T * 0.22;
      for (let k = 0; k < 7; k++) { const a = k * 0.9, d = (k % 3) * 0.3, g0 = 0.5 + 0.5 * Math.sin(t * (2 + k) + k); ctx.fillStyle = 'rgba(255,' + (90 + 80 * g0 | 0) + ',30,' + (0.6 + 0.4 * g0).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(top[0] + Math.cos(a) * r * d, top[1] + Math.sin(a) * r * d * SP, T * 0.06, T * 0.04, 0, 0, 7); ctx.fill(); }
      const f = 0.8 + 0.2 * Math.sin(t * 6); ctx.drawImage(glowSprite('kbraz', [[0, 'rgba(255,150,60,0.5)'], [0.5, 'rgba(255,100,40,0.14)'], [1, 'rgba(255,80,30,0)']]), top[0] - T * f, top[1] - T * 0.8 * f, T * 2 * f, T * 1.6 * f);
    },
    anvil(p, T) {   // a real anvil on its block
      const x = p.x, y = p.y; groundShadow(x, y, 0.3, 0.18, 0.45);
      isoBox(x, y, 0.3, 0.3, 0.2, '#5a4632', '#4a3826', '#38291c');
      isoBox(x, y, 0.16, 0.2, 0.12, '#3a3d44', '#2e3036', '#24262b', 0.2);
      isoBox(x, y, 0.5, 0.24, 0.1, '#52565e', '#3c3f46', '#2e3036', 0.32);
      const a = W2S(x + 0.25, y, 0.39), b = W2S(x + 0.42, y, 0.37), c = W2S(x + 0.25, y + 0.1, 0.33); ctx.fillStyle = '#3c3f46'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.fill();
      pLine(W2S(x - 0.25, y - 0.12, 0.42), W2S(x + 0.25, y - 0.12, 0.42), 'rgba(220,226,236,0.55)', 1);
    },
    bucketW(p, T) { groundShadow(p.x, p.y, 0.15, 0.1, 0.35); pCyl(p.x, p.y, 0.11, 0.18, '#5a4632', '#2a4a6a', 0, '#2a2c30'); const q = W2S(p.x, p.y, 0.18); ctx.fillStyle = 'rgba(160,200,255,0.35)'; ctx.beginPath(); ctx.ellipse(q[0] - T * 0.03, q[1], T * 0.04, T * 0.015, 0, 0, 7); ctx.fill(); },
    ingots(p, T) { groundShadow(p.x, p.y, 0.18, 0.1, 0.3); [[0, 0, 0], [0.1, 0.04, 0], [0.05, 0.02, 0.06]].forEach(([u, v, z], k) => isoBox(p.x + u - 0.05, p.y + v, 0.16, 0.08, 0.06, k === 2 ? '#e0b84a' : '#9aa0aa', k === 2 ? '#b8902e' : '#7a808a', k === 2 ? '#8a6a20' : '#5a6068', z)); },
    tongs(p, T) { pLine(W2S(p.x - 0.18, p.y, 0.02), W2S(p.x + 0.12, p.y - 0.06, 0.03), '#2a2c30', Math.max(1.5, T * 0.03)); pLine(W2S(p.x - 0.18, p.y + 0.04, 0.02), W2S(p.x + 0.12, p.y + 0.02, 0.03), '#2a2c30', Math.max(1.5, T * 0.03)); },
    straw(p, T) {   // a bundle of straw, raised
      groundShadow(p.x, p.y, 0.24, 0.13, 0.3);
      const c = W2S(p.x, p.y, 0); ctx.fillStyle = '#b89a52'; ctx.beginPath(); ctx.ellipse(c[0], c[1] - T * 0.04, T * 0.24, T * 0.12, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#d8c070'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 10; ctx.moveTo(c[0] + Math.cos(a) * T * 0.08, c[1] - T * 0.04 + Math.sin(a) * T * 0.04); ctx.lineTo(c[0] + Math.cos(a) * T * 0.27, c[1] - T * 0.04 + Math.sin(a) * T * 0.15); } ctx.stroke();
    },
    bucket(p, T) { groundShadow(p.x, p.y, 0.15, 0.1, 0.35); pCyl(p.x, p.y, 0.11, 0.2, '#5a4632', '#2a2016', 0, '#2a2c30'); const a = W2S(p.x - 0.11, p.y, 0.2), b = W2S(p.x + 0.11, p.y, 0.2); ctx.strokeStyle = '#3a3c40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - T * 0.2, b[0], b[1]); ctx.stroke(); },
    peg(p, T) {   // an iron peg in the floor, a chain from it, shackles at its end
      pCyl(p.x, p.y, 0.035, 0.1, '#3a3c42', '#5a5d64');
      ctx.strokeStyle = '#7d8088'; ctx.lineWidth = Math.max(1, T * 0.018);
      for (let k = 0; k < 5; k++) { const q = W2S(p.x + 0.04 + k * 0.05, p.y + 0.02 + k * 0.03, 0.02); ctx.beginPath(); ctx.ellipse(q[0], q[1], T * (k % 2 ? 0.03 : 0.018), T * (k % 2 ? 0.015 : 0.025), 0, 0, 7); ctx.stroke(); }
      const s = W2S(p.x + 0.3, p.y + 0.2, 0.03); ctx.lineWidth = Math.max(1.5, T * 0.03); ctx.beginPath(); ctx.ellipse(s[0], s[1], T * 0.07, T * 0.04, 0, 0, 7); ctx.stroke();
    },
    bowl(p, T) { const q = W2S(p.x, p.y, 0.04), r = T * 0.08; ctx.fillStyle = '#5a4632'; ctx.beginPath(); ctx.ellipse(q[0], q[1], r, r * 0.5, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#7a6040'; ctx.beginPath(); ctx.ellipse(q[0], q[1], r, r * 0.45, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#9a9070'; ctx.beginPath(); ctx.ellipse(q[0], q[1] + 1, r * 0.7, r * 0.3, 0, 0, 7); ctx.fill(); },
    rat(p, T, t) {   // a rat scurrying along the wall, stopping, sniffing
      const R = fl.rooms[roomOf(Math.floor(p.x), Math.floor(p.y))]; if (!R) return;
      const span = R.x1 - R.x0 + 0.2, ph = (t * 0.08 + p.seed * 0.1) % 2, u = ph < 1 ? ph : 2 - ph, x = R.x0 + 0.4 + span * Math.min(1, Math.max(0, (u - 0.1) / 0.8)) * 0.85, y = R.y1 + 0.75, dir = ph < 1 ? 1 : -1;
      const c = W2S(x, y, 0.05), s = T * 0.09; groundShadow(x, y, 0.1, 0.05, 0.3);
      ctx.strokeStyle = '#b89a8a'; ctx.lineWidth = Math.max(1, T * 0.015); ctx.beginPath(); ctx.moveTo(c[0] - dir * s, c[1]); ctx.quadraticCurveTo(c[0] - dir * s * 2, c[1] + s * 0.2 * Math.sin(t * 6), c[0] - dir * s * 2.6, c[1] - s * 0.3); ctx.stroke();
      ctx.fillStyle = '#5a5250'; ctx.beginPath(); ctx.ellipse(c[0], c[1] - s * 0.3, s, s * 0.55, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(c[0] + dir * s * 0.9, c[1] - s * 0.35, s * 0.5, s * 0.35, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#d8a8a0'; ctx.beginPath(); ctx.arc(c[0] + dir * s * 0.6, c[1] - s * 0.75, s * 0.18, 0, 7); ctx.fill(); ctx.fillStyle = '#100808'; ctx.fillRect(c[0] + dir * s * 1.05, c[1] - s * 0.5, Math.max(1, s * 0.15), Math.max(1, s * 0.15));
    },
    crateS(p, T) { groundShadow(p.x, p.y, 0.2, 0.14, 0.35); isoBox(p.x, p.y, 0.3 * p.s, 0.3 * p.s, 0.26 * p.s, '#8a6a42', '#6e5232', '#55402a'); const a = W2S(p.x - 0.15 * p.s, p.y + 0.15 * p.s, 0), b = W2S(p.x + 0.15 * p.s, p.y + 0.15 * p.s, 0.26 * p.s); pLine(a, b, 'rgba(30,18,8,0.6)', 1); if (p.v === 0) isoBox(p.x + 0.02, p.y - 0.02, 0.2, 0.2, 0.18, '#94744a', '#765a38', '#5e462c', 0.26 * p.s); },
    barrelS(p, T) { groundShadow(p.x, p.y, 0.18, 0.13, 0.35); pCyl(p.x, p.y, 0.14 * p.s, 0.32 * p.s, '#6e4724', '#86592e', 0, '#3a2614'); },
    bottles(p, T) { groundShadow(p.x, p.y, 0.16, 0.09, 0.3); [[-0.06, 0, '#3e6e4e'], [0.04, 0.04, '#6e4a2a'], [0.08, -0.05, '#4a4e7a']].forEach(([u, v, c], k) => { if (k > 1 + (p.v % 2)) return; pCyl(p.x + u, p.y + v, 0.035, 0.16, c, c); pCyl(p.x + u, p.y + v, 0.014, 0.07, c, '#c9a87a', 0.16); }); },
    books(p, T) { groundShadow(p.x, p.y, 0.18, 0.1, 0.3); ['#7a2828', '#284a7a', '#3e6a2e', '#8a6a28'].forEach((c, k) => { if (k > 1 + p.v % 3) return; isoBox(p.x + (k % 2) * 0.02, p.y - (k % 2) * 0.02, 0.26 - k * 0.02, 0.18, 0.05, c, '#e8dcc0', c, k * 0.05); }); },
    sack(p, T) { groundShadow(p.x, p.y, 0.2, 0.13, 0.35); const q = pBall(p.x, p.y, -0.04, 0.15 * p.s, '#a08860'); ctx.fillStyle = '#8a7250'; ctx.beginPath(); ctx.moveTo(q[0] - T * 0.04, q[1] - T * 0.13); ctx.lineTo(q[0] + T * 0.04, q[1] - T * 0.13); ctx.lineTo(q[0] + T * 0.02, q[1] - T * 0.22); ctx.lineTo(q[0] - T * 0.03, q[1] - T * 0.21); ctx.fill(); },
    post(p, T) {   // a brass post; a red rope hangs to the next post along the runner
      const b = W2S(p.x, p.y, 0), a = W2S(p.x, p.y, 0.42); groundShadow(p.x, p.y, 0.08, 0.05, 0.4);
      pLine(b, a, '#c9a24e', Math.max(2, T * 0.04)); ctx.fillStyle = '#e8c86a'; ctx.beginPath(); ctx.arc(a[0], a[1], Math.max(2, T * 0.045), 0, 7); ctx.fill(); ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.ellipse(b[0], b[1], T * 0.07, T * 0.035, 0, 0, 7); ctx.fill();
      const R = fl.rooms[roomOf(Math.floor(p.x), Math.floor(p.y))]; if (!R) return;
      const horiz = R.x1 - R.x0 >= R.y1 - R.y0, nx = horiz ? p.x + 1.2 : p.x, ny = horiz ? p.y : p.y + 1.2;
      if (nx > R.x1 + 0.6 || ny > R.y1 + 0.6) return;
      const c = W2S(nx, ny, 0.36), s = W2S(p.x, p.y, 0.36); ctx.strokeStyle = '#9a1a2a'; ctx.lineWidth = Math.max(1.5, T * 0.035); ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.quadraticCurveTo((s[0] + c[0]) / 2, (s[1] + c[1]) / 2 + T * 0.14, c[0], c[1]); ctx.stroke();
    },
    bust(p, T) { groundShadow(p.x, p.y, 0.2, 0.14, 0.4); isoBox(p.x, p.y, 0.26, 0.26, 0.5, '#d8d0c4', '#bab2a6', '#9a9286'); const q = W2S(p.x, p.y, 0.5); ctx.fillStyle = '#c8c0b4'; ctx.beginPath(); ctx.ellipse(q[0], q[1] - T * 0.06, T * 0.12, T * 0.07, 0, Math.PI, 0); ctx.fill(); pBall(p.x, p.y, 0.56, 0.09, '#d8d0c4', 'rgba(90,80,70,0.3)'); },
    vase(p, T) { groundShadow(p.x, p.y, 0.2, 0.14, 0.4); isoBox(p.x, p.y, 0.24, 0.24, 0.45, '#3a2a22', '#2e2018', '#22180f'); const q = pBall(p.x, p.y, 0.45, 0.1, '#2a5a8a'); ctx.fillStyle = '#e8c86a'; ctx.fillRect(q[0] - T * 0.1, q[1] - T * 0.01, T * 0.2, Math.max(1, T * 0.02)); pCyl(p.x, p.y, 0.035, 0.08, '#2a5a8a', '#1a3a5a', 0.63); },
    candelabra(p, T, t) {   // a gold candlestick with three flames
      groundShadow(p.x, p.y, 0.14, 0.09, 0.4);
      const b = W2S(p.x, p.y, 0), a = W2S(p.x, p.y, 0.6); pLine(b, a, '#c9a24e', Math.max(2, T * 0.035)); ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.ellipse(b[0], b[1], T * 0.08, T * 0.04, 0, 0, 7); ctx.fill();
      pLine([a[0] - T * 0.16, a[1]], [a[0] + T * 0.16, a[1]], '#c9a24e', Math.max(1.5, T * 0.03));
      [-0.16, 0, 0.16].forEach((u, k) => { const x = a[0] + u * T, y = a[1] - (k === 1 ? T * 0.04 : 0); ctx.fillStyle = '#efe6cc'; ctx.fillRect(x - T * 0.02, y - T * 0.12, T * 0.04, T * 0.12); pFlame(x, y - T * 0.12, T * 0.14, t, p.seed + k, 'rgba(255,236,170,0.95)', 'rgba(255,150,50,0.85)', k === 1 ? ['kcandW', [[0, 'rgba(255,200,120,0.35)'], [1, 'rgba(255,200,120,0)']]] : null); });
    },
    blocks(p, T) { groundShadow(p.x, p.y, 0.2, 0.13, 0.3); const C = [['#f0c96a', '#d8a83e', '#b88a2a'], ['#e58aa8', '#c86a8a', '#a8506e'], ['#7fc6a4', '#5ea888', '#468a6c'], ['#8ea6e8', '#6e86c8', '#5468a8']]; const n = 1 + (p.v % 3); for (let k = 0; k < n; k++) { const c = C[(k + p.v) % 4]; isoBox(p.x + (k === 1 ? 0.12 : 0), p.y + (k === 1 ? -0.04 : 0) + (k === 2 ? 0.01 : 0), 0.15, 0.15, 0.15, c[0], c[1], c[2], k === 2 ? 0.15 : 0); } },
    ball(p, T) { groundShadow(p.x, p.y, 0.12, 0.08, 0.35); const q = pBall(p.x, p.y, 0, 0.11, '#e85a5a'); ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.arc(q[0], q[1], T * 0.11, -0.4, 0.4); ctx.arc(q[0], q[1], T * 0.05, 0.4, -0.4, true); ctx.fill(); },
    teddy(p, T) {   // a worn teddy bear sitting, one button eye
      groundShadow(p.x, p.y, 0.16, 0.1, 0.35);
      const b = pBall(p.x, p.y, 0, 0.12, '#9a6a44'); const h = W2S(p.x, p.y, 0.3), r = T * 0.09;
      ctx.fillStyle = '#9a6a44'; [[-0.7, -0.75], [0.7, -0.75]].forEach(([u, v]) => { ctx.beginPath(); ctx.arc(h[0] + u * r, h[1] + v * r, r * 0.42, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.arc(h[0], h[1], r, 0, 7); ctx.fill(); ctx.fillStyle = '#c89a70'; ctx.beginPath(); ctx.ellipse(h[0], h[1] + r * 0.35, r * 0.45, r * 0.32, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(b[0], b[1] + T * 0.02, T * 0.07, T * 0.06, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1210'; ctx.beginPath(); ctx.arc(h[0] - r * 0.35, h[1] - r * 0.15, Math.max(1, r * 0.13), 0, 7); ctx.fill(); ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(h[0] + r * 0.25, h[1] - r * 0.3); ctx.lineTo(h[0] + r * 0.5, h[1]); ctx.moveTo(h[0] + r * 0.5, h[1] - r * 0.3); ctx.lineTo(h[0] + r * 0.25, h[1]); ctx.stroke();
    },
    drum(p, T) { groundShadow(p.x, p.y, 0.15, 0.1, 0.35); pCyl(p.x, p.y, 0.12, 0.14, '#c84a4a', '#efe6d4', 0, '#f0c96a'); pLine(W2S(p.x - 0.18, p.y + 0.1, 0.02), W2S(p.x - 0.02, p.y + 0.2, 0.05), '#d8c098', Math.max(1, T * 0.025)); },
    top(p, T, t) {   // a spinning top, still spinning
      const w = Math.sin(t * 3 + p.seed) * 0.08, b = W2S(p.x, p.y, 0), a = W2S(p.x + w * 0.3, p.y, 0.2);
      groundShadow(p.x, p.y, 0.1, 0.06, 0.3);
      ctx.fillStyle = (Math.floor(t * 12) % 2) ? '#8ea6e8' : '#e58aa8'; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0] - T * 0.11, a[1] + T * 0.06); ctx.lineTo(a[0] + T * 0.11, a[1] + T * 0.06); ctx.fill();
      ctx.fillStyle = '#f0c96a'; ctx.beginPath(); ctx.ellipse(a[0], a[1] + T * 0.06, T * 0.11, T * 0.04, 0, 0, 7); ctx.fill(); pLine([a[0], a[1] + T * 0.05], [a[0] + w * T, a[1] - T * 0.06], '#6e4c2a', Math.max(1, T * 0.025));
    }
  };
  function candles(p, T, t, wax, flame, glow) {   // a few candles of different heights, wax pooled at their feet
    groundShadow(p.x, p.y, 0.16, 0.1, 0.3);
    const q0 = W2S(p.x, p.y, 0); ctx.fillStyle = wax; ctx.globalAlpha *= 0.8; ctx.beginPath(); ctx.ellipse(q0[0], q0[1], T * 0.16, T * 0.07, 0, 0, 7); ctx.fill(); ctx.globalAlpha /= 0.8;
    [[-0.07, 0.03, 0.26], [0.06, -0.03, 0.4], [0.03, 0.08, 0.18]].forEach(([u, v, h], k) => {
      if (k > 1 + (p.v % 2)) return;
      pCyl(p.x + u, p.y + v, 0.035, h * p.s, wax, '#fffaf0');
      const a = W2S(p.x + u, p.y + v, h * p.s); pFlame(a[0], a[1], T * 0.12, t, p.seed + k, flame[0], flame[1], k === 1 ? glow : null);
    });
  }
  // under each trap or monster of a komnata's family that stands (hangs, floats) in it: a soft glow of its colour
  function drawKindAuras(T) {
    if (T < 6 || !kindRooms().length) return;
    const t = reduceMotion ? 0 : realNow;
    fl.items.forEach(it => {
      const k = KIND_OF[it.type]; if (!k || !inKind(it) || (MONSTERS[it.type] && it.hp <= 0) || it.disabled) return;
      let gx = it.x + 0.5, gy = it.y + 0.5;
      if (WALL_ITEM[it.type]) { const d = wallDirs(it.x, it.y)[0]; if (d) { gx += d[0] * 0.8; gy += d[1] * 0.8; } }
      else if (DRIFT[it.type] && it.gx !== undefined) { gx = it.gx; gy = it.gy; }
      if (!onScreen(W2S(gx, gy, 0), T)) return;
      const p = 0.85 + 0.15 * Math.sin(t * 2.4 + it.x * 1.3 + it.y), r = T * 0.75 * p, col = KIND_INFO[k].color;
      ctx.drawImage(glowSprite('kaura_' + k, [[0, hexA(col, 0.42)], [0.55, hexA(col, 0.14)], [1, hexA(col, 0)]]), gx * T - r, gy * T - r, r * 2, r * 2);
    });
  }
  // the faces of the standing walls of a komnata (on the unit square of the face: u along it, v from the top down)
  const KIND_WALL = {
    goblin(u0, t, alt) {
      if (alt) {   // two spears leaning
        ctx.strokeStyle = '#6e5232'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.28, 0.98); ctx.lineTo(0.5, 0.08); ctx.moveTo(0.72, 0.98); ctx.lineTo(0.52, 0.1); ctx.stroke();
        ctx.fillStyle = '#a9b0b8'; [[0.5, 0.08, -0.24], [0.52, 0.1, 0.22]].forEach(([x, y, a]) => { ctx.beginPath(); ctx.moveTo(x - Math.sin(a) * 0.01, y - 0.1); ctx.lineTo(x + 0.04, y + 0.03); ctx.lineTo(x - 0.04, y + 0.03); ctx.fill(); });
        return;
      }
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(0.22, 0.12); ctx.lineTo(0.78, 0.12); ctx.stroke();   // a hide banner
      ctx.fillStyle = '#6d4c2c'; ctx.beginPath(); ctx.moveTo(0.28, 0.12); ctx.lineTo(0.72, 0.12); ctx.lineTo(0.7 + 0.015 * Math.sin(t * 2), 0.62); ctx.lineTo(0.5, 0.74); ctx.lineTo(0.3 + 0.015 * Math.sin(t * 2), 0.62); ctx.fill();
      ctx.fillStyle = '#9edc5a'; ctx.beginPath(); ctx.ellipse(0.5, 0.42, 0.07, 0.06, 0, 0, Math.PI * 2); ctx.fill();
      for (let f = 0; f < 4; f++) { const a = -2.6 + f * 0.45; ctx.beginPath(); ctx.ellipse(0.5 + Math.cos(a) * 0.1, 0.42 + Math.sin(a) * 0.1, 0.02, 0.04, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill(); }
    },
    spider(u0, t) {   // a web draped from the top corner, a spider coming down on its thread
      ctx.strokeStyle = 'rgba(236,232,248,0.6)'; ctx.lineWidth = 0.012; ctx.beginPath();
      for (let s = 0; s <= 5; s++) { const a = s * Math.PI / 10; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.75, Math.sin(a) * 0.75); }
      for (let r = 1; r <= 4; r++) { const q = r * 0.17; for (let s = 0; s <= 5; s++) { const a = s * Math.PI / 10; s ? ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q) : ctx.moveTo(Math.cos(a) * q, Math.sin(a) * q); } }
      ctx.stroke();
      const d = 0.35 + 0.2 * Math.sin(t * 0.9 + u0 * 5);
      ctx.beginPath(); ctx.moveTo(0.72, 0); ctx.lineTo(0.72, d); ctx.stroke();
      ctx.fillStyle = '#1b1320'; ctx.beginPath(); ctx.arc(0.72, d + 0.03, 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1b1320'; ctx.lineWidth = 0.01; ctx.beginPath(); for (let l = 0; l < 4; l++) [-1, 1].forEach(sd => { ctx.moveTo(0.72, d + 0.03); ctx.lineTo(0.72 + sd * 0.06, d - 0.01 + l * 0.025); }); ctx.stroke();
    },
    ogre(u0, t, alt) {   // claw gouges; a skull on a rope
      ctx.strokeStyle = 'rgba(12,8,6,0.65)'; ctx.lineWidth = 0.03; ctx.beginPath();
      for (let k = 0; k < 4; k++) { ctx.moveTo(0.2 + k * 0.1, 0.3); ctx.lineTo(0.35 + k * 0.1, 0.8); } ctx.stroke();
      ctx.strokeStyle = 'rgba(150,140,130,0.35)'; ctx.lineWidth = 0.01; ctx.beginPath();
      for (let k = 0; k < 4; k++) { ctx.moveTo(0.215 + k * 0.1, 0.3); ctx.lineTo(0.365 + k * 0.1, 0.8); } ctx.stroke();
      if (alt) { ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.moveTo(0.75, 0); ctx.lineTo(0.75, 0.3); ctx.stroke(); skullAt(ctx, 0.75, 0.38, 0.14, '#e6dcc2'); }
    },
    haunt(u0, t, alt) {   // a torn curtain stirring in no wind; a candle with a blue flame
      if (alt) {
        ctx.fillStyle = '#121316'; ctx.fillRect(0.46, 0.42, 0.08, 0.2); ctx.fillStyle = '#4a4e57'; ctx.fillRect(0.41, 0.4, 0.18, 0.04);
        const f = 0.8 + 0.2 * Math.sin(t * 9 + u0 * 3);
        ctx.drawImage(glowSprite('kblue', [[0, 'rgba(160,230,255,0.55)'], [0.5, 'rgba(120,200,255,0.12)'], [1, 'rgba(120,200,255,0)']]), 0.5 - 0.4 * f, 0.3 - 0.4 * f, 0.8 * f, 0.8 * f);
        ctx.fillStyle = 'rgba(170,235,255,0.95)'; ctx.beginPath(); ctx.ellipse(0.5, 0.33, 0.03, 0.07 * f, 0, 0, Math.PI * 2); ctx.fill();
        return;
      }
      ctx.fillStyle = 'rgba(196,214,228,0.4)'; ctx.beginPath(); ctx.moveTo(0.15, 0.05); ctx.lineTo(0.85, 0.05);
      for (let k = 6; k >= 0; k--) { const u = 0.15 + k * 0.7 / 6, v = 0.78 + 0.08 * Math.sin(t * 1.3 + k * 1.7 + u0) + (k % 2) * 0.06; ctx.lineTo(u, v); }
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,140,160,0.4)'; ctx.lineWidth = 0.012; ctx.beginPath(); for (let k = 1; k < 5; k++) { ctx.moveTo(0.15 + k * 0.14, 0.06); ctx.lineTo(0.16 + k * 0.14 + 0.02 * Math.sin(t + k), 0.72); } ctx.stroke();
    },
    bats(u0, t) {   // bats hanging under the top of the wall, one stretching now and then
      for (let k = 0; k < 4; k++) {
        const u = 0.14 + k * 0.24, open = Math.max(0, Math.sin(t * 0.7 + k * 2.3 + u0 * 4) - 0.9) * 10;
        ctx.strokeStyle = '#2a2232'; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.moveTo(u, 0.02); ctx.lineTo(u, 0.06); ctx.stroke();
        ctx.fillStyle = '#1c1424'; ctx.beginPath(); ctx.moveTo(u, 0.06); ctx.quadraticCurveTo(u + 0.05 + 0.06 * open, 0.12, u + 0.02, 0.2); ctx.lineTo(u, 0.22); ctx.lineTo(u - 0.02, 0.2); ctx.quadraticCurveTo(u - 0.05 - 0.06 * open, 0.12, u, 0.06); ctx.fill();
        ctx.fillStyle = '#ff5a6a'; ctx.fillRect(u - 0.012, 0.165, 0.008, 0.008); ctx.fillRect(u + 0.004, 0.165, 0.008, 0.008);
      }
    },
    ossuary(u0, t, alt) {   // niches with skulls, crossed bones below
      for (let k = 0; k < 3; k++) {
        const u = 0.2 + k * 0.3;
        ctx.fillStyle = 'rgba(14,12,12,0.85)'; ctx.beginPath(); ctx.moveTo(u - 0.1, 0.55); ctx.lineTo(u - 0.1, 0.32); ctx.arc(u, 0.32, 0.1, Math.PI, 0); ctx.lineTo(u + 0.1, 0.55); ctx.fill();
        skullAt(ctx, u, 0.42, 0.12, '#ebe2c8');
      }
      if (alt) { boneAt(ctx, 0.5, 0.75, 0.4, 0.5, 0.035, '#ddd2b4'); boneAt(ctx, 0.5, 0.75, 0.4, -0.5, 0.035, '#ddd2b4'); }
    },
    armory(u0, t, alt) {   // a round shield over crossed swords; or a rack of spears
      if (alt) {
        ctx.strokeStyle = '#5a4630'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0.15, 0.7); ctx.lineTo(0.85, 0.7); ctx.stroke();
        for (let k = 0; k < 4; k++) { const u = 0.24 + k * 0.17; ctx.strokeStyle = '#6e5232'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(u, 0.92); ctx.lineTo(u, 0.12); ctx.stroke(); ctx.fillStyle = '#c6ced8'; ctx.beginPath(); ctx.moveTo(u, 0.02); ctx.lineTo(u + 0.03, 0.14); ctx.lineTo(u - 0.03, 0.14); ctx.fill(); }
        return;
      }
      [[0.22, 0.2, 0.78, 0.8], [0.78, 0.2, 0.22, 0.8]].forEach(([a, b, c, d]) => {
        ctx.strokeStyle = '#d4dbe4'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
        ctx.strokeStyle = '#7a5a2e'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(c + (a - c) * 0.12, d + (b - d) * 0.12); ctx.lineTo(c, d); ctx.stroke();
      });
      ctx.fillStyle = '#6a2a24'; ctx.beginPath(); ctx.arc(0.5, 0.48, 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.fillStyle = '#c9a24e'; ctx.beginPath(); ctx.arc(0.5, 0.48, 0.045, 0, Math.PI * 2); ctx.fill();
    },
    forge(u0, t, alt) {   // a furnace mouth glowing; or tongs and a hammer on hooks
      if (alt) {
        const f = 0.75 + 0.25 * Math.sin(t * 7 + u0 * 9) * Math.sin(t * 3.1);
        ctx.fillStyle = '#16100c'; ctx.beginPath(); ctx.moveTo(0.25, 1); ctx.lineTo(0.25, 0.62); ctx.arc(0.5, 0.62, 0.25, Math.PI, 0); ctx.lineTo(0.75, 1); ctx.fill();
        const g = ctx.createRadialGradient(0.5, 0.86, 0.02, 0.5, 0.86, 0.3); g.addColorStop(0, 'rgba(255,220,120,' + (0.95 * f).toFixed(2) + ')'); g.addColorStop(0.5, 'rgba(255,110,30,' + (0.7 * f).toFixed(2) + ')'); g.addColorStop(1, 'rgba(120,30,10,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0.29, 1); ctx.lineTo(0.29, 0.64); ctx.arc(0.5, 0.64, 0.21, Math.PI, 0); ctx.lineTo(0.71, 1); ctx.fill();
        ctx.drawImage(glowSprite('kforge', [[0, 'rgba(255,150,60,0.35)'], [1, 'rgba(255,100,40,0)']]), 0.5 - 0.6 * f, 0.8 - 0.6 * f, 1.2 * f, 1.2 * f);
        return;
      }
      ctx.fillStyle = '#5a5e66'; [0.3, 0.7].forEach(u => { ctx.beginPath(); ctx.arc(u, 0.14, 0.02, 0, Math.PI * 2); ctx.fill(); });
      ctx.strokeStyle = '#2e3036'; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(0.3, 0.16); ctx.lineTo(0.26, 0.62); ctx.moveTo(0.3, 0.16); ctx.lineTo(0.34, 0.62); ctx.stroke();
      ctx.strokeStyle = '#6e5232'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0.7, 0.16); ctx.lineTo(0.7, 0.62); ctx.stroke();
      ctx.fillStyle = '#3a3d44'; ctx.fillRect(0.62, 0.14, 0.16, 0.09);
    },
    prison(u0, t, alt) {   // shackles on chains; a barred window high up, a little cold light through it
      if (alt) {
        ctx.fillStyle = '#0d0f12'; ctx.fillRect(0.32, 0.08, 0.36, 0.24);
        ctx.fillStyle = 'rgba(170,190,220,0.22)'; ctx.fillRect(0.34, 0.1, 0.32, 0.2);
        ctx.strokeStyle = '#3e4148'; ctx.lineWidth = 0.025; ctx.beginPath(); for (let k = 1; k < 4; k++) { ctx.moveTo(0.32 + k * 0.09, 0.08); ctx.lineTo(0.32 + k * 0.09, 0.32); } ctx.stroke();
        return;
      }
      ctx.fillStyle = '#5a5e66'; ctx.beginPath(); ctx.arc(0.5, 0.16, 0.035, 0, Math.PI * 2); ctx.fill();
      [-1, 1].forEach(sd => {
        const sway = 0.02 * Math.sin(t * 1.1 + sd + u0 * 3);
        ctx.strokeStyle = '#7d8088'; ctx.lineWidth = 0.012;
        for (let k = 0; k < 6; k++) { const x0 = 0.5 + sd * (0.03 + k * 0.035) + sway * k / 6, y0 = 0.2 + k * 0.07; ctx.beginPath(); ctx.ellipse(x0, y0, k % 2 ? 0.012 : 0.02, k % 2 ? 0.03 : 0.018, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.strokeStyle = '#8b8e96'; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.arc(0.5 + sd * 0.24 + sway, 0.68, 0.05, 0, Math.PI * 2); ctx.stroke();
      });
    },
    junk(u0, t) {   // a sagging shelf of jars, boxes and bottles
      ctx.fillStyle = '#5a4128'; ctx.fillRect(0.12, 0.42, 0.76, 0.04); ctx.fillRect(0.12, 0.72, 0.76, 0.04);
      const C = ['#7a5a3a', '#4a6a5a', '#8a6a3a', '#5a4a6a', '#6a3a32'];
      [[0.42, 0], [0.72, 1]].forEach(([v, s]) => { let u = 0.15; for (let k = 0; k < 5 && u < 0.84; k++) { const ww = 0.06 + 0.05 * kH(k, s, Math.floor(u0 * 100)), hh = 0.08 + 0.1 * kH(s, k, Math.floor(u0 * 100) + 1); ctx.fillStyle = C[(k + s) % 5]; if (k % 2) { ctx.beginPath(); ctx.ellipse(u + ww / 2, v - hh / 2, ww / 2, hh / 2, 0, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(u, v - hh, ww, hh); u += ww + 0.03; } });
    },
    gallery(u0, t, alt) {   // a gilded frame; the face in it is too dark to make out, but the eyes catch the light
      ctx.fillStyle = '#c9a24e'; ctx.fillRect(0.2, 0.08, 0.6, 0.66);
      ctx.fillStyle = '#7a5a22'; ctx.fillRect(0.24, 0.12, 0.52, 0.58);
      ctx.fillStyle = '#1a1416'; ctx.fillRect(0.27, 0.15, 0.46, 0.52);
      ctx.fillStyle = 'rgba(70,56,52,0.8)'; ctx.beginPath(); ctx.ellipse(0.5, 0.36, 0.1, 0.13, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(0.36, 0.48, 0.28, 0.2);
      const glint = Math.sin(t * 0.8 + u0 * 7) > 0.85;
      ctx.fillStyle = glint ? '#ffe9a8' : 'rgba(30,24,22,0.9)'; ctx.fillRect(0.455, 0.33, 0.025, 0.018); ctx.fillRect(0.52, 0.33, 0.025, 0.018);
      if (alt) { ctx.strokeStyle = 'rgba(255,240,200,0.25)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(0.28, 0.66); ctx.lineTo(0.72, 0.16); ctx.stroke(); }
    },
    nursery(u0, t, alt) {   // faded striped wallpaper, a child's drawing pinned to it
      if (!alt) return;   // (the wallpaper is the wall's own texture since 1.15)
      ctx.fillStyle = '#f2ead8'; ctx.fillRect(0.3, 0.2, 0.4, 0.32);
      ctx.strokeStyle = '#e58a5a'; ctx.lineWidth = 0.015; ctx.beginPath(); ctx.arc(0.4, 0.3, 0.04, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#7a8ae0'; ctx.beginPath(); ctx.moveTo(0.48, 0.48); ctx.lineTo(0.48, 0.38); ctx.lineTo(0.56, 0.32); ctx.lineTo(0.64, 0.38); ctx.lineTo(0.64, 0.48); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0.5, 0.21, 0.012, 0, Math.PI * 2); ctx.fill();
    }
  };
  // a standing wall of a komnata: dress the face (or faces) that look into it; every other wall tile, none with a torch or a trap
  function kindWallDeco(i, T) {
    if (T < 12 || !fl.rooms.some(R => R.rk)) return;
    const x = i % WW, y = (i - x) / WW, h = WA.cur[i];
    if (h < WALL_H * 0.6 || fl.items.has(key(x, y)) || WA.torches.some(q => q.x === x && q.y === y)) return;
    const t = reduceMotion ? 0 : realNow;
    [[0, 1, 'S'], [1, 0, 'E']].forEach(([dx, dy, face]) => {
      if (tileAt(x + dx, y + dy) !== FLOOR || wallH(x + dx, y + dy) >= h - 0.001) return;
      const r = roomOf(x + dx, y + dy), R = r >= 0 ? fl.rooms[r] : null, fn = R && R.rk && KIND_WALL[R.rk];
      const sel = tileHash(x * 5 + 1, y * 3 + 2) % 3; if (!fn || sel === 0 || (sel === 1 && REPLACE_FLAT[R.rk])) return;   // (the raised pieces take the other faces: kindWall3D)
      const z1 = Math.min(h, 1.45), z0 = Math.max(0, z1 - 1.2);
      ctx.save(); relief(T, 0.7);   // lifted a little off the face, with a soft shadow
      if (face === 'S') faceMap(x, y + 1.03, x + 1, y + 1.03, z0, z1); else faceMap(x + 1.03, y, x + 1.03, y + 1, z0, z1);
      try { fn(kH(x, y, 1), t, tileHash(x + 7, y + 11) % 2 === 0); } finally { ctx.restore(); }
    });
  }
  // a little life over the floor of each komnata on screen (screen space): smoke, a spider on a thread, flies, wisps, bats,
  // candle flames, glints, embers, drips, dust, a shaft of light, notes of a lullaby
  function drawKindLife(T) {
    if (T < 9 || reduceMotion) return;
    const t = realNow;
    kindRooms().forEach(R => {
      const [mx, my] = roomMid(R), c = W2S(mx, my, 0);
      if (!onScreen(c, T * 6) || fogged(Math.floor(mx), Math.floor(my))) return;
      const w = R.x1 - R.x0 + 1, h = R.y1 - R.y0 + 1, seed = R.x0 * 13 + R.y0 * 7, col = KIND_INFO[R.rk].color;
      const P = (k, sp) => ((t * sp + k * 0.6180339 + seed * 0.071) % 1 + 1) % 1;
      const dot = (x, y, z, r, fill) => { const q = W2S(x, y, z); ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill(); };
      const glow = (name, stops, x, y, z, r) => { const q = W2S(x, y, z); ctx.drawImage(glowSprite(name, stops), q[0] - r, q[1] - r, r * 2, r * 2); };
      switch (R.rk) {
        case 'goblin':   // the campfire's smoke (its flame is the campfire prop), spores rising from the mushrooms
          kindProps(R).forEach(pp => { if (pp.t !== 'shroom') return; for (let k = 0; k < 2; k++) { const p = P(k + pp.seed, 0.12); dot(pp.x + Math.sin(p * 4 + k) * 0.12, pp.y, 0.25 + p * 0.9, Math.max(1, T * 0.022), 'rgba(170,255,130,' + (0.75 * Math.sin(p * Math.PI)).toFixed(2) + ')'); } });
          for (let k = 0; k < 4; k++) { const p = P(k, 0.22); dot(mx + Math.sin(p * 5 + k) * 0.25, my, 0.2 + p * 1.6, T * (0.08 + 0.18 * p), 'rgba(110,108,100,' + (0.32 * (1 - p)).toFixed(2) + ')'); } break;
        case 'spider': for (let k = 0; k < 2; k++) { const sx = R.x0 + 0.5 + (w - 1) * kH(seed, k, 1), sy = R.y0 + 0.5 + (h - 1) * kH(seed, k, 2), z = 1.15 + 0.35 * Math.sin(t * 0.8 + k * 2), a = W2S(sx, sy, 1.7), b = W2S(sx, sy, z);
          ctx.strokeStyle = 'rgba(232,228,246,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); dot(sx, sy, z, T * 0.06, '#1b1320');
          ctx.strokeStyle = '#1b1320'; ctx.beginPath(); for (let l = 0; l < 4; l++) [-1, 1].forEach(sd => { ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + sd * T * 0.1, b[1] - T * 0.04 + l * T * 0.03); }); ctx.stroke(); } break;
        case 'ogre': for (let k = 0; k < 6; k++) { const a = t * (5 + k) + k, cx0 = R.x0 + 0.5 + (w - 1) * kH(seed, k % 2, 3), cy0 = R.y0 + 0.5 + (h - 1) * kH(seed, k % 2, 4); dot(cx0 + Math.cos(a) * 0.25, cy0 + Math.sin(a * 1.3) * 0.2, 0.35 + 0.12 * Math.sin(a * 0.7), Math.max(1, T * 0.025), 'rgba(20,16,12,0.9)'); } break;
        case 'haunt': for (let k = 0; k < 5; k++) { const p = P(k, 0.08), sx = R.x0 + 0.3 + (w - 0.6) * kH(seed, k, 5) + Math.sin(t * 0.7 + k) * 0.3, sy = R.y0 + 0.3 + (h - 0.6) * kH(seed, k, 6), a = Math.sin(p * Math.PI);
          ctx.globalAlpha = a; glow('kwisp', [[0, 'rgba(220,250,255,0.9)'], [0.4, 'rgba(160,230,255,0.35)'], [1, 'rgba(160,230,255,0)']], sx, sy, 0.3 + p * 1.3, T * 0.22); ctx.globalAlpha = 1; } break;
        case 'bats': for (let k = 0; k < 4; k++) { const p = P(k, 0.11), a = p * Math.PI * 2, bx = mx + Math.sin(a) * w * 0.38, by = my + Math.sin(a * 2) * h * 0.3, q = W2S(bx, by, 1.15 + 0.2 * Math.sin(t * 3 + k)), s = T * 0.16, f = Math.sin(t * 18 + k * 2);
          ctx.fillStyle = '#140c1c'; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.quadraticCurveTo(q[0] - s * 0.7, q[1] - s * (0.2 + 0.6 * f), q[0] - s * 1.3, q[1] + s * 0.1 * f); ctx.quadraticCurveTo(q[0] - s * 0.6, q[1] + s * 0.1, q[0], q[1] + s * 0.25);
          ctx.quadraticCurveTo(q[0] + s * 0.6, q[1] + s * 0.1, q[0] + s * 1.3, q[1] + s * 0.1 * f); ctx.quadraticCurveTo(q[0] + s * 0.7, q[1] - s * (0.2 + 0.6 * f), q[0], q[1]); ctx.fill(); } break;
        case 'ossuary': for (let k = 0; k < 6; k++) { const p = P(k, 0.05), sx = R.x0 + 0.3 + (w - 0.6) * kH(seed, k, 21), sy = R.y0 + 0.3 + (h - 0.6) * kH(seed, k, 22); dot(sx + Math.sin(t * 0.4 + k) * 0.15, sy, 0.2 + 1.2 * Math.sin(p * Math.PI), Math.max(1, T * 0.016), 'rgba(236,226,200,0.45)'); } break;   // dust in the candlelight (the candles are props)
        case 'forge': for (let k = 0; k < 10; k++) { const p = P(k, 0.35), sx = mx - 0.35 + 0.7 * kH(seed, k, 7) + Math.sin(p * 9 + k) * 0.12, sy = my - 0.2 + 0.4 * kH(seed, k, 8);
          dot(sx, sy, 0.1 + p * 1.6, Math.max(1, T * 0.03 * (1 - p * 0.5)), 'rgba(255,' + (140 + 80 * (1 - p) | 0) + ',60,' + (0.95 * (1 - p)).toFixed(2) + ')'); } break;
        case 'prison': for (let k = 0; k < 2; k++) { const p = P(k, 0.45), dx = R.x0 + 0.5 + (w - 1) * kH(seed, k, 9), dy = R.y0 + 0.5 + (h - 1) * kH(seed, k, 10);
          if (p < 0.7) dot(dx, dy, 1.7 * (1 - p / 0.7), Math.max(1, T * 0.03), 'rgba(170,200,230,0.8)');
          else { const q = W2S(dx, dy, 0), rr = T * 0.4 * (p - 0.7) / 0.3; ctx.strokeStyle = 'rgba(170,200,230,' + (0.6 * (1 - (p - 0.7) / 0.3)).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(q[0], q[1], rr, rr * SP, 0, 0, Math.PI * 2); ctx.stroke(); } } break;
        case 'junk': for (let k = 0; k < 8; k++) { const p = P(k, 0.04), sx = R.x0 + 0.3 + (w - 0.6) * kH(seed, k, 11) + Math.sin(t * 0.5 + k) * 0.2, sy = R.y0 + 0.3 + (h - 0.6) * kH(seed, k, 12); dot(sx, sy, 0.3 + 1.1 * Math.abs(Math.sin(p * Math.PI)), Math.max(1, T * 0.018), 'rgba(240,226,190,0.5)'); } break;
        case 'gallery': {   // a shaft of light falling from high on the wall to the runner, dust turning in it
          const a = W2S(R.x0 + 0.6, R.y0 + 0.2, 1.65), b = W2S(R.x0 + 1.1, R.y0 + 0.2, 1.65), cc = W2S(mx + 0.6, my + 0.3, 0), dd = W2S(mx - 0.2, my + 0.3, 0);
          const g = ctx.createLinearGradient(a[0], a[1], cc[0], cc[1]); g.addColorStop(0, 'rgba(255,240,200,0.16)'); g.addColorStop(1, 'rgba(255,240,200,0.02)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(cc[0], cc[1]); ctx.lineTo(dd[0], dd[1]); ctx.fill();
          for (let k = 0; k < 6; k++) { const p = P(k, 0.05), u = kH(seed, k, 13); dot(R.x0 + 0.8 + (mx - R.x0) * p, R.y0 + 0.2 + (my - R.y0) * p, 1.6 * (1 - p), Math.max(1, T * 0.015), 'rgba(255,245,215,' + (0.4 + 0.3 * u).toFixed(2) + ')'); }
          break;
        }
        case 'nursery': for (let k = 0; k < 3; k++) { const p = P(k, 0.12), q = W2S(mx + Math.sin(p * 6 + k) * 0.4 + (k - 1) * 0.3, my, 0.3 + p * 1.3);
          ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85; ctx.fillStyle = ['#f2bcd4', '#bfe8d2', '#f6e2a6'][k]; ctx.font = Math.round(T * 0.38) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(k % 2 ? '♫' : '♪', q[0], q[1]); ctx.globalAlpha = 1; } break;
        case 'armory': break;   // its life is the glints on its plates (the floor)
      }
      void col;
    });
  }
  // Room types: a tint and a little texture over the whole room, so you see at a glance what each room does.
  function drawRoomTypes(T) {
    fl.rooms.forEach(R => {
      if (R.kind !== 'room' || !R.rt || !roomSeen(R, T)) return;   // 1.15: only what is on screen
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T, t = realNow;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      if (R.rt === 'fog') {
        ctx.fillStyle = 'rgba(190,200,220,0.16)'; ctx.fillRect(x, y, w, h);
        for (let k = 0; k < 4; k++) {
          const fx = x + ((k * 0.37 + t * 0.03 * (k % 2 ? 1 : -1)) % 1 + 1) % 1 * w, fy = y + (0.2 + 0.2 * k) * h;
          const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, T * 1.6); g.addColorStop(0, 'rgba(210,220,235,0.22)'); g.addColorStop(1, 'rgba(210,220,235,0)');
          ctx.fillStyle = g; ctx.fillRect(fx - T * 1.6, fy - T * 1.6, T * 3.2, T * 3.2);
        }
        if (fl.phase === 'raid') fl.heroes.forEach(o => {   // 1.20: a lit lantern clears a warm patch of the fog, 1,5 tiles round its bearer
          if (o.dead || o.fled || o.gone || roomOf(o.tx, o.ty) !== R.id || !litLantern(o)) return;
          const p = heroPos(o), lx = p.x * T, ly = p.y * T, lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, T * 1.5);
          lg.addColorStop(0, 'rgba(255,232,170,0.22)'); lg.addColorStop(1, 'rgba(255,232,170,0)'); ctx.fillStyle = lg; ctx.fillRect(lx - T * 1.5, ly - T * 1.5, T * 3, T * 3);
        });
      } else if (R.rt === 'swamp') {
        ctx.fillStyle = 'rgba(70,100,40,0.32)'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(150,190,90,0.45)';
        for (let k = 0; k < 5; k++) { const u = (t * 0.4 + k * 0.29) % 1; ctx.beginPath(); ctx.arc(x + ((k * 0.43) % 1) * w + T * 0.3, y + ((k * 0.61 + 0.2) % 1) * h, T * 0.08 * (1 - u) + 1, 0, Math.PI * 2); ctx.fill(); }
      } else if (R.rt === 'grotto') {
        ctx.fillStyle = 'rgba(80,100,170,0.2)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(160,180,255,0.25)'; ctx.lineWidth = Math.max(1, T * 0.04);
        const u = (t * 0.35) % 1; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, ((u + k * 0.5) % 1) * Math.max(w, h) * 0.6, 0, Math.PI * 2); ctx.stroke(); }
      } else if (R.rt === 'crypt') {
        ctx.fillStyle = 'rgba(40,20,60,0.35)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(200,180,230,0.35)'; ctx.lineWidth = Math.max(1, T * 0.05);
        R.tiles.forEach((tt, k) => { if (k % 4 !== 1) return; const px = (tt[0] + 0.5) * T, py = (tt[1] + 0.5) * T; ctx.beginPath(); ctx.moveTo(px, py - T * 0.18); ctx.lineTo(px, py + T * 0.18); ctx.moveTo(px - T * 0.1, py - T * 0.06); ctx.lineTo(px + T * 0.1, py - T * 0.06); ctx.stroke(); });
      } else if (R.rt === 'vault') {
        ctx.fillStyle = 'rgba(200,160,50,0.16)'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,230,150,0.7)';
        for (let k = 0; k < 4; k++) { const u = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7); if (u < 0.7) continue; ctx.fillRect(x + ((k * 0.31 + 0.1) % 1) * w, y + ((k * 0.53 + 0.15) % 1) * h, T * 0.08, T * 0.08); }
      } else if (R.rt === 'haven') {   // 1.10: a warm, calm light (too calm)
        ctx.fillStyle = 'rgba(255,236,180,0.11)'; ctx.fillRect(x, y, w, h);
        const cx = x + w / 2, cy = y + h / 2, rr0 = Math.max(w, h) * (0.42 + 0.04 * Math.sin(t * 1.3));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr0); g.addColorStop(0, 'rgba(255,230,160,0.2)'); g.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(243,226,176,0.32)'; ctx.lineWidth = Math.max(1, T * 0.06);
        ctx.beginPath(); ctx.moveTo(cx, cy - T * 0.45); ctx.lineTo(cx, cy + T * 0.45); ctx.moveTo(cx - T * 0.3, cy - T * 0.1); ctx.lineTo(cx + T * 0.3, cy - T * 0.1); ctx.stroke();
      } else if (R.rt === 'gears') {   // 1.10: cogs turning under the floor
        ctx.fillStyle = 'rgba(150,110,60,0.16)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(214,168,106,0.32)';
        [[0.3, 0.35, 0.9, 1], [0.68, 0.62, 0.65, -1.35]].forEach(([u, v, s, sp]) => {
          const cx = x + u * w, cy = y + v * h, r0 = T * s, a0 = t * sp;
          ctx.lineWidth = Math.max(1, T * 0.05); ctx.beginPath(); ctx.arc(cx, cy, r0, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = Math.max(1.5, T * 0.12); ctx.beginPath();
          for (let k = 0; k < 8; k++) { const a = a0 + k * Math.PI / 4; ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r0 * 1.22, cy + Math.sin(a) * r0 * 1.22); }
          ctx.stroke();
        });
      } else if (R.rt === 'hush') {   // 1.10: rings drawn in, swallowed (sound dies here)
        ctx.fillStyle = 'rgba(14,16,22,0.34)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(154,166,187,0.2)'; ctx.lineWidth = Math.max(1, T * 0.04);
        const u = (t * 0.3) % 1; for (let k = 0; k < 2; k++) { const q = 1 - (u + k * 0.5) % 1; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, q * Math.max(w, h) * 0.55, 0, Math.PI * 2); ctx.stroke(); }
      } else if (R.rt === 'ice') {   // 1.10: pale ice with glints sliding across it
        ctx.fillStyle = 'rgba(170,215,240,0.2)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(232,247,255,0.35)'; ctx.lineWidth = Math.max(1, T * 0.04);
        for (let k = 0; k < 4; k++) { const u = ((t * 0.12 + k * 0.27) % 1), px = x + u * (w + h) - h, py = y + ((k * 0.37 + 0.2) % 1) * h; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + T * 0.7, py - T * 0.25); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(190,230,255,0.18)'; R.tiles.forEach((tt, k) => { if (k % 5 !== 2) return; const px = tt[0] * T, py = tt[1] * T; ctx.beginPath(); ctx.moveTo(px + T * 0.2, py + T * 0.3); ctx.lineTo(px + T * 0.55, py + T * 0.55); ctx.lineTo(px + T * 0.8, py + T * 0.45); ctx.stroke(); });
      }
      ctx.restore();
    });
  }
  function hpBar(cx, y, w, frac, color, T) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(cx - w / 2, y, w, Math.max(2, T * 0.07));
    ctx.fillStyle = color; ctx.fillRect(cx - w / 2, y, w * clamp(frac, 0, 1), Math.max(2, T * 0.07));
  }
  function heartPath(x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.4);
    ctx.bezierCurveTo(x - s * 0.95, y - s * 0.2, x - s * 0.45, y - s * 0.9, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 0.9, x + s * 0.95, y - s * 0.2, x, y + s * 0.4);
    ctx.closePath();
  }
  function crystalShape(x, y, r, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r * 1.4); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.4); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }
  function drawRoomLabels(T) {   // 1.07: the depth multiplier (and in building, the room's load) by the room's front corner, upright
    if (T < 14) return;
    const loads = fl.phase === 'build' ? roomLoads() : null, font = numFont(Math.max(10, T * 0.24), true);
    fl.rooms.forEach(r => {
      if (r.kind !== 'room') return;
      const m = depthMult(r.id), p = W2S(r.x1 + 0.85, r.y1 + 0.85, 0);
      let t = '×' + m.toFixed(1).replace('.', ','), col = isEdgeRoom(r.id) ? 'rgba(255,170,140,0.95)' : 'rgba(255,214,170,0.85)';
      if (loads) { const full = loads[r.id] >= roomCap(r); t += '  ' + loads[r.id] + '/' + roomCap(r); if (full) col = '#ff9a9a'; }
      signText(t, p[0], p[1], font, col, 'right', 'bottom');
    });
  }
  // What the heroes have not seen yet is dimmed: you see everything, they do not.
  function drawFog(x0, y0, x1, y1, T) {   // 1.03: one rectangle per run of unknown tiles in a row, not one per tile
    ctx.fillStyle = 'rgba(5,6,8,0.52)';
    for (let y = y0; y <= y1; y++) {
      let run0 = -1;
      for (let x = x0; x <= x1 + 1; x++) {
        const i = y * WW + x, t = x <= x1 ? fl.tiles[i] : -1, fog = (t === FLOOR || t === DOOR) && !fl.known[i];
        if (fog && run0 < 0) run0 = x;
        else if (!fog && run0 >= 0) { ctx.fillRect(run0 * T, y * T, (x - run0) * T + 0.5, T + 0.5); run0 = -1; }
      }
    }
  }
  // Every room holds only so many traps and monsters (corridors 1, rooms 2-3 by size, +1 per expansion): to build more, dig or expand.
  function slotRoom(type, x, y) {
    const s = ITEMS[type].slot;
    if (s === 'wall') { const d = wallDirs(x, y)[0]; return d ? roomOf(x + d[0], y + d[1]) : -1; }
    if (s === 'door') { const dd = fl.doors.get(key(x, y)); return dd ? (dd.b >= 0 ? dd.b : dd.a) : -1; }
    return roomOf(x, y);
  }
  const roomCap = R => (R.kind === 'hall' ? 1 : 2 + (R.tiles.length >= 20 ? 1 : 0)) + (R.lvl || 0);
  // A crate: only on a room floor, never next to a door or the heart, and the room must stay one connected space.
  function crateOk(x, y) {
    if (fl.phase !== 'build' || slotOf(x, y) !== 'floor' || fl.items.has(key(x, y))) return false;
    const r = roomOf(x, y), R = fl.rooms[r];
    if (!R || R.kind !== 'room' || !run.layout.cells.get(R.key)) return false;
    if (R.doors.some(d => Math.abs(d.x - x) + Math.abs(d.y - y) <= 1) || Math.abs(fl.heart.x - x) + Math.abs(fl.heart.y - y) <= 1) return false;
    const free = R.tiles.filter(t => !(t[0] === x && t[1] === y) && walkable(t[0], t[1])).map(t => key(t[0], t[1]));
    if (!free.length) return false;
    const set = new Set(free), seen = new Set([free[0]]), q = [free[0]];
    while (q.length) { const [cx, cy] = q.pop().split(',').map(Number); for (const d of DIRS) { const kk = key(cx + d[0], cy + d[1]); if (set.has(kk) && !seen.has(kk)) { seen.add(kk); q.push(kk); } } }
    return seen.size === free.length;
  }
  // Prototype 1.0: where a building may stand (it blocks like a crate): free floor of a room, not by a door or the heart,
  // and the rest of the room stays in one piece. The tile itself is left out of the check (so it works for one already standing).
  function blockerOk(x, y) {
    if (slotOf(x, y) !== 'floor') return false;
    const r = roomOf(x, y), R = fl.rooms[r];
    if (!R || R.kind !== 'room') return false;
    if (R.doors.some(d => Math.abs(d.x - x) + Math.abs(d.y - y) <= 1) || Math.abs(fl.heart.x - x) + Math.abs(fl.heart.y - y) <= 1) return false;
    const free = R.tiles.filter(t => !(t[0] === x && t[1] === y) && walkable(t[0], t[1])).map(t => key(t[0], t[1]));
    if (!free.length) return false;
    const set = new Set(free), seen = new Set([free[0]]), q = [free[0]];
    while (q.length) { const [cx, cy] = q.pop().split(',').map(Number); for (const d of DIRS) { const kk = key(cx + d[0], cy + d[1]); if (set.has(kk) && !seen.has(kk)) { seen.add(kk); q.push(kk); } } }
    return seen.size === free.length;
  }
  function roomLoads() {
    const loads = new Array(fl.rooms.length).fill(0);
    fl.items.forEach(it => { if (!SLOTTED(it.type) || it.temp) return; const r = slotRoom(it.type, it.x, it.y); if (r >= 0) loads[r]++; });   // 1.18: a risen ghost takes no slot
    return loads;
  }
  function roomFull(type, x, y, loads) {
    if (!SLOTTED(type)) return false;
    const r = slotRoom(type, x, y);
    if (r < 0) return false;
    return (loads || roomLoads())[r] >= roomCap(fl.rooms[r]);
  }
  function canPlace(type, x, y, loads) {
    const T = ITEMS[type];
    if (!T || T.tool || !run.unlocked.has(type)) return false;
    if (type === 'crate') return crateOk(x, y);
    if (fl.items.has(key(x, y))) return false;
    if (BUILDINGS[type]) {   // counter-buildings: between waves, in a room (not a corridor), one of each kind per room
      if (fl.phase !== 'build') return false;
      const r = roomOf(x, y);
      if (r < 0 || fl.rooms[r].kind !== 'room') return false;
      for (const o of fl.items.values()) if (o.type === type && roomOf(o.x, o.y) === r) return false;
      if (!blockerOk(x, y)) return false;
    }
    if (slotOf(x, y) !== T.slot) return false;
    if (MONSTERS[type] && fl.phase === 'raid' && alive().some(h => h.tx === x && h.ty === y)) return false;
    if (roomFull(type, x, y, loads)) return false;
    return true;
  }
  // v15.1: the thing in hand pulses; the spots it can go to are dashed (worked out once per pick-up)
  // 1.07: a frame on a tile. On a floor it lies on the floor; on a full wall it would hide under the wall, so it is kept for
  // after the walls and drawn upright on the wall's face (UPM). ins: how far in from the tile's edge.
  let UPM = [];
  function markTile(x, y, T, ins, stroke, lw, dash) {
    if (fl.tiles[y * WW + x] === WALL && wallH(x, y) > 0.2) { UPM.push({ x, y, ins, stroke, lw, dash, ring: false }); return; }
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.setLineDash(dash ? [T * 0.12, T * 0.1] : []);
    ctx.strokeRect(x * T + T * ins, y * T + T * ins, T * (1 - 2 * ins), T * (1 - 2 * ins)); ctx.setLineDash([]);
  }
  function markRing(x, y, T, r, stroke, lw) {
    if (fl.tiles[y * WW + x] === WALL && wallH(x, y) > 0.2) { UPM.push({ x, y, r, stroke, lw, ring: true }); return; }
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc((x + 0.5) * T, (y + 0.5) * T, T * r, 0, Math.PI * 2); ctx.stroke();
  }
  function drawWallMarks(T) {   // frames on full walls, on the wall's face
    UPM.forEach(m => {
      ctx.save(); wallPlane(m);
      ctx.strokeStyle = m.stroke; ctx.lineWidth = m.lw / T;
      if (m.ring) { ctx.beginPath(); ctx.arc(0.5, 0.5, m.r * 0.75, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.setLineDash(m.dash ? [0.12, 0.1] : []); ctx.strokeRect(m.ins, m.ins, 1 - 2 * m.ins, 1 - 2 * m.ins); }
      ctx.restore();
    });
    UPM = [];
  }
  function drawCarry(T) {
    const it = movingKey && fl.items.get(movingKey), o = !it && movingObj && fl.objects.get(movingObj);
    if (!it && !o) { movingKey = null; movingObj = null; return false; }
    const src = it || o, ck = (it ? 'i' : 'o') + key(src.x, src.y) + '|' + fl.items.size + '|' + fl.objects.size;
    if (!carryCache || carryCache.k !== ck) {
      const list = [];
      if (it) { fl.items.delete(movingKey); const loads = roomLoads(); for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (!(x === it.x && y === it.y) && canPlace(it.type, x, y, loads)) list.push([x, y]); fl.items.set(movingKey, it); }
      else fl.rooms.forEach(R => { if (R.kind === 'room') R.tiles.forEach(t => { if (objTargetOk(o, t[0], t[1])) list.push(t); }); });
      carryCache = { k: ck, list };
    }
    const pulse = 0.6 + 0.4 * Math.sin(realNow * 6);
    markTile(src.x, src.y, T, 0.04, 'rgba(195,178,255,' + pulse.toFixed(2) + ')', Math.max(2, T * 0.08), false);
    carryCache.list.forEach(t => markTile(t[0], t[1], T, 0.12, 'rgba(195,178,255,0.8)', Math.max(1, T * 0.04), true));
    return true;   // (what a double tap would cost stands over the thing in hand: drawCostLabels)
  }
  function drawHold(T) {   // a ring fills while the finger stays on a thing; full = taken down (on the floor; the word over it: drawHoldLabel)
    if (!holdInfo || fl.phase !== 'build') return;
    const k = clamp((realNow - holdInfo.t0) / holdInfo.dur, 0, 1); if (k < 0.15) return;
    const cx = (holdInfo.x + 0.5) * T, cy = (holdInfo.y + 0.5) * T, r = T * 0.62;
    ctx.lineWidth = Math.max(3, T * 0.12); ctx.strokeStyle = 'rgba(16,17,20,0.7)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
  }
  function drawSlots(x0, y0, x1, y1, T) {
    if (fl.phase === 'build' && (movingKey || movingObj) && drawCarry(T)) return;
    if (!selected || TOOLS[selected] || (fl.phase !== 'build' && fl.phase !== 'raid')) return;
    if (selected === 'upgrade') return;   // 1.07: the costs stand over the things (drawCostLabels)
    if (selected === 'move') {
      const it = movingKey && fl.items.get(movingKey);
      if (!it) {   // nothing picked yet: everything you could pick up glows a little
        fl.items.forEach(o => markTile(o.x, o.y, T, 0.08, 'rgba(195,178,255,0.55)', Math.max(1, T * 0.04), false));
        return;
      }
      const pulse = 0.6 + 0.4 * Math.sin(realNow * 6);
      markTile(it.x, it.y, T, 0.04, 'rgba(195,178,255,' + pulse.toFixed(2) + ')', Math.max(2, T * 0.08), false);
      fl.items.delete(movingKey);
      const loads = roomLoads();
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!(x === it.x && y === it.y) && canPlace(it.type, x, y, loads)) markTile(x, y, T, 0.12, 'rgba(195,178,255,0.8)', Math.max(1, T * 0.04), true);
      fl.items.set(movingKey, it);
      return;
    }
    if (MODES[selected]) return;
    const loads = roomLoads();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (canPlace(selected, x, y, loads)) markTile(x, y, T, 0.12, 'rgba(242,185,75,0.75)', Math.max(1, T * 0.04), true);
    }
  }
  function drawFx(T) {
    fl.fx.forEach(f => {
      const a = clamp(f.life / f.max, 0, 1);
      if (f.kind === 'tiles') {
        ctx.fillStyle = 'rgba(' + f.rgb + ',' + (0.55 * a * (0.8 + 0.2 * Math.sin(realNow * 40))).toFixed(3) + ')';
        f.tiles.forEach(t => ctx.fillRect(t[0] * T, t[1] * T, T, T));
      } else if (f.kind === 'line') {
        ctx.strokeStyle = 'rgba(' + f.rgb + ',' + a.toFixed(2) + ')'; ctx.lineWidth = Math.max(2, T * 0.09);
        ctx.beginPath(); ctx.moveTo(f.x0 * T, f.y0 * T); ctx.lineTo(f.x1 * T, f.y1 * T); ctx.stroke();
      }
    });
  }
  // 1.05 (testers could not tell the heroes apart): a class icon on every hero disc instead of a letter
  const CI_PATH = {};
  function drawClassIcon(type, cx, cy, size, color) {
    const ic = CLASS_ICON[type]; if (!ic) return;
    const p = CI_PATH[type] || (CI_PATH[type] = new Path2D(ic.d));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(size / 24, size / 24); if (ic.rot) ctx.rotate(ic.rot * Math.PI / 180); ctx.translate(-12, -12);
    ctx.fillStyle = color; ctx.fill(p, 'evenodd'); ctx.restore();
  }
  // 1.06 (author: the class icons on the discs were invisible, heroes still looked alike from afar): heroes are standing figurines
  // with a class silhouette: helmet, shield and sword (warrior), hood and dagger (thief), halo, robe and cross (priest), pointed
  // hat and staff (mage), feathered cap and lute (bard), horned helmet and axe (barbarian). A figure is never smaller than
  // FIG_MIN px on screen, whatever the zoom; it looks the way it walks; a dark outline keeps it apart from the floor.
  const FIG_MIN = 27, FIG_MAX = 50;
  const figH = (T, boss) => clamp(T * 1.1, FIG_MIN, FIG_MAX) * (boss === 'final' ? 1.3 : boss ? 1.18 : 1);
  const figFeet = T => T * 0.34;   // the feet stand a bit below the tile's centre (the figure rises from there)
  const SKIN = '#e8c39d', OUT = '#0c0a10';
  /* ================= 1.07: pixel figures ================= */
  // (author: the 1.06 figurines were too saturated, too flat, too much line art for dark fantasy; the GDD plans 2D pixel-art
  // figures over 3D rooms.) Every figure is painted pixel by pixel into a small sprite (20 x 28, feet on the bottom row,
  // facing right), in muted colours with a lit and a shaded tone per material, then scaled up by whole device pixels without
  // smoothing. Four walking frames (4 per second, as planned for the game); facing left is the sprite mirrored.
  const PXW = 20, PXH = 28;
  const PAL = {
    skin: ['#c9a184', '#9d7660'], skin2: ['#b58d6e', '#8a6650'], steel: ['#9aa3b2', '#646c7a'], steelHi: '#c5ccd8', dark: '#211c22',
    boots: '#2a2226', belt: '#4a3524', wood: ['#7a5634', '#53391f'], gold: ['#c9a44e', '#8c6f2c'],
    warrior: ['#46628c', '#2f4565'], thief: ['#46613f', '#2f442b'], thiefHood: ['#3b5235', '#27391f'], priest: ['#d9d0b9', '#a69d86'], mage: ['#5d4286', '#3e2b5e'],
    bard: ['#2e7069', '#1f4f4a'], barb: ['#8c5a33', '#5e3c21'], fur: ['#6b5a48', '#4a3d30'], bone: ['#ddd2bb', '#a99f8a'],
    goblin: ['#6f8a4a', '#4c6232'], ogre: ['#7b7f5a', '#555940'], spider: ['#4a3d55', '#2e2636'], ghost: ['#d9e0ef', '#9ea8bf'], shade: ['#241b30', '#140f1c']
  };
  const SPR = new Map();
  // draws one figure into a PXW x PXH canvas; r() paints a rectangle of whole pixels
  function paintFigure(type, frame, flash, o) {
    const c = document.createElement('canvas'); c.width = PXW; c.height = PXH;
    const g = c.getContext('2d');
    const r = (x, y, w, h, col) => { g.fillStyle = flash ? '#ffffff' : col; g.fillRect(x, y, w, h); };
    const P = PAL, step = frame === 1 ? 1 : frame === 3 ? -1 : 0, bob = step ? -1 : 0;   // walking: legs apart, the body up a pixel
    const legs = (col, colB) => {   // back leg then front leg, boots at the bottom
      if (step === 0) { r(8, 21, 2, 5, colB); r(10, 21, 2, 5, col); r(8, 26, 2, 2, P.boots); r(10, 26, 3, 2, P.boots); }
      else { r(7 + (step < 0 ? 2 : 0), 21, 2, 5, colB); r(10 + (step > 0 ? 1 : -1), 21, 2, 5, col); r(7 + (step < 0 ? 2 : 0), 26, 2, 2, P.boots); r(10 + (step > 0 ? 1 : -1), 26, 3, 2, P.boots); }
    };
    const head = (y0, skin) => { skin = skin || P.skin; r(8, y0, 5, 5, skin[0]); r(8, y0 + 3, 1, 2, skin[1]); r(11, y0 + 2, 1, 1, P.dark); };   // y0 = top of the face; the eye looks right
    const arm = (x, y, col, len) => { r(x, y, 2, len || 5, col); };
    const robe = (col, y0) => { for (let y = y0; y <= 27; y++) { const k = Math.floor((y - y0) / 4); r(7 - k, y, 6 + 2 * k, 1, col[0]); r(7 - k, y, 1 + (k > 0 ? 1 : 0), 1, col[1]); } };
    const t = type, b = bob;
    if (t === 'warrior') {
      r(3, 14 + b, 5, 5, P.steel[1]); r(4, 19 + b, 3, 1, P.steel[1]); r(5, 20 + b, 1, 1, P.steel[1]); r(4, 15 + b, 3, 4, P.warrior[0]); r(5, 19 + b, 1, 1, P.warrior[1]); r(4, 15 + b, 1, 4, P.warrior[1]); r(5, 16 + b, 1, 2, P.gold[0]);   // a heater shield behind
      legs(P.steel[1], P.dark);
      r(7, 13 + b, 6, 8, P.steel[0]); r(7, 13 + b, 1, 8, P.steel[1]); r(9, 14 + b, 2, 7, P.warrior[0]); r(9, 19 + b, 2, 2, P.warrior[1]); r(7, 20 + b, 6, 1, P.belt);   // mail and a blue tabard
      head(8 + b);
      r(7, 6 + b, 6, 4, P.steel[0]); r(7, 6 + b, 1, 4, P.steel[1]); r(8, 6 + b, 4, 1, P.steelHi); r(12, 9 + b, 1, 2, P.steel[1]); r(9, 4 + b, 2, 2, '#8a3a3a');   // helmet and a red crest
      arm(12, 14 + b, P.steel[1], 5); r(12, 19 + b, 2, 1, P.skin[0]);
      r(14, 7 + b, 1, 12, P.steelHi); r(15, 8 + b, 1, 11, P.steel[1]); r(13, 18 + b, 4, 1, P.gold[1]); r(14, 19 + b, 1, 2, P.wood[1]);   // the sword
    } else if (t === 'thief') {
      r(6, 13 + b, 3, 12, P.thiefHood[1]);   // cloak behind
      legs(P.thief[1], P.dark);
      r(7, 13 + b, 6, 8, P.thief[0]); r(7, 13 + b, 1, 8, P.thief[1]); r(7, 18 + b, 6, 1, P.belt); r(11, 18 + b, 1, 1, P.gold[0]);
      head(9 + b, P.skin2);
      r(7, 6 + b, 6, 4, P.thiefHood[0]); r(7, 9 + b, 1, 5, P.thiefHood[0]); r(7, 6 + b, 1, 7, P.thiefHood[1]); r(12, 7 + b, 1, 2, P.thiefHood[1]); r(8, 10 + b, 3, 1, P.thiefHood[1]);   // the hood, a shadow over the eyes
      arm(12, 14 + b, P.thief[1], 4); r(12, 18 + b, 2, 1, P.skin2[0]);
      r(14, 15 + b, 1, 3, P.steelHi); r(13, 18 + b, 2, 1, P.wood[1]);   // a dagger
    } else if (t === 'priest') {
      robe(P.priest, 13 + b);
      r(9, 14 + b, 2, 13, P.gold[1]); r(9, 15 + b, 2, 1, P.gold[0]); r(8, 16 + b, 4, 1, P.gold[0]); r(9, 17 + b, 2, 2, P.gold[0]);   // a gold stripe and a cross
      head(8 + b); r(8, 7 + b, 5, 2, '#5a4636');
      r(8, 4 + b, 5, 1, '#e8d48a'); r(7, 5 + b, 1, 1, '#e8d48a'); r(13, 5 + b, 1, 1, '#e8d48a'); r(8, 6 + b, 5, 1, 'rgba(232,212,138,0.55)');   // the halo
      arm(12, 14 + b, P.priest[1], 5); r(12, 19 + b, 2, 1, P.skin[0]);
    } else if (t === 'mage') {
      r(15, 6 + b, 1, 22, P.wood[0]); r(16, 7 + b, 1, 20, P.wood[1]); r(14, 3 + b, 3, 3, '#cbb8ff'); r(15, 2 + b, 1, 1, '#efe6ff'); r(14, 4 + b, 1, 1, '#9b86d6');   // staff and orb
      robe(P.mage, 13 + b);
      r(9, 15 + b, 2, 12, P.mage[1]); r(7, 19 + b, 6, 1, P.gold[1]);
      head(9 + b); r(9, 13 + b, 3, 2, '#bdb3a6');   // a grey beard
      r(6, 8 + b, 9, 1, P.mage[1]); r(8, 6 + b, 5, 2, P.mage[0]); r(9, 4 + b, 3, 2, P.mage[0]); r(10, 2 + b, 2, 2, P.mage[0]); r(12, 1 + b, 2, 1, P.mage[0]); r(8, 7 + b, 1, 1, P.mage[1]); r(9, 7 + b, 4, 1, P.gold[1]);   // pointed hat
      arm(12, 14 + b, P.mage[1], 5); r(13, 18 + b, 2, 1, P.skin[0]);
    } else if (t === 'bard') {
      legs(P.bard[1], P.dark);
      r(7, 13 + b, 6, 8, P.bard[0]); r(7, 13 + b, 1, 8, P.bard[1]); r(7, 20 + b, 6, 1, P.belt); r(8, 15 + b, 4, 1, P.gold[1]);
      head(9 + b);
      r(7, 7 + b, 7, 2, P.bard[1]); r(8, 6 + b, 4, 1, P.bard[0]); r(12, 4 + b, 1, 2, '#b8573f'); r(13, 3 + b, 1, 2, '#b8573f'); r(14, 2 + b, 1, 1, '#d97a5a');   // cap and a feather
      r(10, 16 + b, 2, 1, P.gold[0]); r(9, 17 + b, 4, 3, P.gold[0]); r(10, 20 + b, 2, 1, P.gold[1]); r(9, 17 + b, 1, 3, P.gold[1]); r(10, 18 + b, 1, 1, P.dark);   // the lute
      r(12, 16 + b, 1, 1, P.wood[1]); r(13, 15 + b, 1, 1, P.wood[1]); r(13, 14 + b, 1, 1, P.wood[1]); r(14, 13 + b, 1, 1, P.wood[1]); r(14, 12 + b, 2, 1, P.wood[0]);
      arm(12, 15 + b, P.bard[1], 4); r(12, 19 + b, 2, 1, P.skin[0]);
    } else if (t === 'barbarian') {
      legs(P.fur[1], P.dark);
      r(4, 14 + b, 2, 5, P.skin2[1]); r(4, 19 + b, 2, 1, P.skin2[1]);   // the far arm
      r(7, 15 + b, 6, 4, P.skin2[0]); r(8, 19 + b, 4, 1, P.skin2[0]); r(7, 15 + b, 1, 4, P.skin2[1]); r(9, 16 + b, 1, 1, P.skin2[1]); r(11, 16 + b, 1, 1, P.skin2[1]); r(10, 17 + b, 1, 2, P.skin2[1]);   // a bare chest
      r(5, 13 + b, 10, 2, P.fur[0]); r(5, 14 + b, 2, 1, P.fur[1]); r(13, 14 + b, 2, 1, P.fur[1]); r(7, 20 + b, 6, 2, P.fur[1]); r(9, 20 + b, 2, 1, P.gold[1]);   // fur on the shoulders, a fur belt
      head(8 + b, P.skin2); r(8, 12 + b, 5, 1, '#6b4a2a');
      r(8, 6 + b, 5, 3, '#4a3a2c'); r(5, 4 + b, 2, 1, P.bone[0]); r(6, 5 + b, 2, 2, P.bone[0]); r(13, 5 + b, 2, 2, P.bone[0]); r(14, 4 + b, 2, 1, P.bone[0]);   // horned helmet
      arm(13, 15 + b, P.skin2[0], 4); r(13, 15 + b, 1, 4, P.skin2[1]);
      r(15, 6 + b, 1, 19, P.wood[1]); r(16, 6 + b, 3, 6, P.steel[0]); r(16, 6 + b, 1, 6, P.steelHi); r(18, 7 + b, 1, 4, P.steel[1]);   // the axe
    } else if (t === 'goblin') {
      legs(P.goblin[1], P.goblin[1]);
      r(8, 15 + b, 5, 6, '#5a4630'); r(8, 15 + b, 1, 6, '#3e2f20');   // a ragged tunic
      r(8, 10 + b, 5, 5, P.goblin[0]); r(8, 13 + b, 1, 2, P.goblin[1]); r(6, 10 + b, 2, 2, P.goblin[0]); r(13, 10 + b, 2, 2, P.goblin[0]); r(5, 9 + b, 1, 1, P.goblin[1]); r(15, 9 + b, 1, 1, P.goblin[1]);   // head and ears
      r(11, 12 + b, 1, 1, '#e8d24a');
      r(12, 16 + b, 2, 4, P.goblin[1]); r(14, 15 + b, 1, 4, P.steel[0]);
    } else if (t === 'archer') {   // a skeleton with a bow
      legs(P.bone[1], P.bone[1]);
      r(8, 14 + b, 4, 7, P.bone[0]); r(8, 15 + b, 4, 1, P.dark); r(8, 17 + b, 4, 1, P.dark); r(9, 14 + b, 1, 7, P.bone[1]);   // ribs
      r(8, 8 + b, 5, 5, P.bone[0]); r(9, 10 + b, 1, 1, P.dark); r(11, 10 + b, 1, 1, P.dark); r(9, 12 + b, 3, 1, P.bone[1]);
      r(12, 15 + b, 2, 4, P.bone[1]);
      r(15, 9 + b, 1, 2, P.wood[0]); r(16, 11 + b, 1, 6, P.wood[0]); r(15, 17 + b, 1, 2, P.wood[0]); r(14, 10 + b, 1, 8, 'rgba(220,210,190,0.6)');   // the bow
    } else if (t === 'ogre') {
      legs(P.ogre[1], P.ogre[1]);
      r(3, 13 + b, 2, 7, P.ogre[1]);   // the far arm
      r(6, 12 + b, 8, 1, P.ogre[0]); r(5, 13 + b, 10, 7, P.ogre[0]); r(6, 20 + b, 8, 1, P.ogre[0]); r(5, 13 + b, 2, 7, P.ogre[1]); r(9, 16 + b, 4, 3, '#8a8e66'); r(5, 19 + b, 10, 2, '#4a3a2a'); r(6, 21 + b, 8, 1, '#3a2c20');   // a round belly and a hide
      r(7, 6 + b, 7, 6, P.ogre[0]); r(7, 9 + b, 1, 3, P.ogre[1]); r(9, 8 + b, 1, 1, '#c84a3a'); r(12, 8 + b, 1, 1, '#c84a3a'); r(9, 11 + b, 1, 1, P.bone[0]); r(12, 11 + b, 1, 1, P.bone[0]);   // red eyes, tusks
      r(14, 13 + b, 3, 6, P.ogre[1]); r(16, 8 + b, 3, 12, P.wood[1]); r(16, 8 + b, 3, 3, P.wood[0]);   // a club
    } else if (t === 'shaman') {
      r(15, 6 + b, 1, 21, P.wood[1]); r(14, 4 + b, 3, 3, '#8be38f');
      robe(['#4c5a3a', '#34402a'], 15 + b);
      r(8, 10 + b, 5, 5, P.goblin[0]); r(6, 11 + b, 2, 1, P.goblin[0]); r(13, 11 + b, 2, 1, P.goblin[0]); r(11, 12 + b, 1, 1, '#e8d24a');
      r(8, 6 + b, 1, 4, '#b8473f'); r(10, 5 + b, 1, 5, '#4a7ab8'); r(12, 6 + b, 1, 4, '#c9a44e');   // feathers
      r(12, 16 + b, 2, 4, P.goblin[1]);
    } else if (t === 'spider') {   // low and wide: eight legs and a fat body
      const lg = frame % 2;
      r(6, 17, 7, 6, P.spider[0]); r(7, 16, 5, 1, P.spider[0]); r(7, 23, 5, 1, P.spider[0]); r(6, 17, 2, 6, P.spider[1]); r(8, 19, 3, 2, '#5a2a30');   // the abdomen with a red mark
      r(12, 18, 4, 4, P.spider[0]); r(14, 19, 1, 1, '#d84a3a'); r(15, 20, 1, 1, '#d84a3a'); r(15, 22, 1, 1, P.bone[1]);   // the head, eyes, a fang
    } else if (t === 'ghost') {   // a pale floating sheet with dark eyes
      r(7, 8, 7, 3, P.ghost[0]); r(6, 11, 9, 11, P.ghost[0]); r(6, 11, 2, 11, P.ghost[1]);
      for (let x = 6; x < 15; x++) r(x, 22 + ((x + frame) % 3 === 0 ? 1 : 0), 1, 1, P.ghost[(x + frame) % 2]);
      r(8, 12, 2, 2, '#1a1424'); r(12, 12, 2, 2, '#1a1424'); r(10, 16, 2, 2, '#4a4458');
    } else if (t === 'shade') {   // a hooded dark wraith with violet eyes
      r(7, 6, 7, 6, P.shade[0]); r(6, 12, 9, 13, P.shade[0]); r(6, 12, 2, 13, P.shade[1]); r(8, 8, 5, 3, '#0a070e');
      for (let x = 6; x < 15; x++) r(x, 25 - ((x + frame) % 2), 1, 1, P.shade[1]);
      r(9, 9, 1, 1, '#b9a4ff'); r(11, 9, 1, 1, '#b9a4ff');
    } else if (t === 'bat') {   // one bat: wings up or down
      const up = frame % 2 === 0;
      r(9, 12, 3, 3, '#3a2f4a'); r(9, 12, 1, 1, '#c84a3a'); r(11, 12, 1, 1, '#c84a3a');
      if (up) { r(6, 10, 3, 2, '#2c2438'); r(12, 10, 3, 2, '#2c2438'); r(5, 9, 1, 1, '#2c2438'); r(15, 9, 1, 1, '#2c2438'); }
      else { r(6, 14, 3, 2, '#2c2438'); r(12, 14, 3, 2, '#2c2438'); r(5, 15, 1, 1, '#2c2438'); r(15, 15, 1, 1, '#2c2438'); }
    }
    return c;
  }
  // a 1-pixel outline around the sprite (soft, in the dark of the dungeon, not black line art)
  function outlineSprite(c, col) {
    const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height, o = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3] > 0) o[y * W + x] = 1;
    g.fillStyle = col;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (o[y * W + x]) continue;
      if ((x > 0 && o[y * W + x - 1]) || (x < W - 1 && o[y * W + x + 1]) || (y > 0 && o[(y - 1) * W + x]) || (y < H - 1 && o[(y + 1) * W + x])) g.fillRect(x, y, 1, 1);
    }
    return c;
  }
  function sprite(type, frame, flash) {
    const k = type + '|' + frame + '|' + (flash ? 1 : 0);
    let c = SPR.get(k);
    if (!c) {
      c = paintFigure(type === 'statue' ? 'warrior' : type, frame, flash);
      if (type === 'statue') stoneSprite(c);
      c = outlineSprite(c, flash ? 'rgba(255,255,255,0.6)' : 'rgba(12,9,14,0.72)'); if (type === 'spider') spiderLegs(c, frame, flash); SPR.set(k, c);
    }
    return c;
  }
  function stoneSprite(c) {   // a figure turned to stone: its own light and shade, in grey-violet
    const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) / 255, v = 70 + l * 90; a[i] = v * 0.98; a[i + 1] = v * 0.95; a[i + 2] = v * 1.08; }
    g.putImageData(d, 0, 0);
  }
  // a spider's thin legs go on after the outline (with one they would merge into a blob): up to a knee, down to the floor
  function spiderLegs(c, frame, flash) {
    const g = c.getContext('2d'), lg = frame % 2, col = flash ? '#ffffff' : '#6e6079';
    const px = (x, y) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
    const lineP = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)); };
    for (let k = 0; k < 4; k++) {
      const up = (k % 2) === lg ? 1 : 0, ky = 12 + (k % 2) - up;
      lineP(7, 18, 5 - k, ky); lineP(5 - k, ky, Math.max(0, Math.round(5 - 1.6 * k) - 1), 23);
      lineP(13, 18, 15 + k, ky); lineP(15 + k, ky, Math.min(19, Math.round(15 + 1.6 * k) + 1), 23);
    }
  }
  // draws a figure standing at (x, feet) on the screen, H px tall, mirrored when it faces left; whole device pixels per sprite pixel
  function drawPixelFigure(type, x, feet, H, face, opt) {
    opt = opt || {};
    const k = Math.max(1, Math.round(H * DPR / PXH)), w = PXW * k / DPR, h = PXH * k / DPR;
    const frame = opt.frame !== undefined ? opt.frame : opt.walk ? Math.floor(realNow * 4 + (opt.seed || 0) * 0.37) % 4 : 0;
    const c = sprite(type, frame, opt.flash);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const sx = Math.round(x * DPR) / DPR, sy = Math.round(feet * DPR) / DPR;
    if (opt.alpha !== undefined) ctx.globalAlpha *= clamp(opt.alpha, 0, 1);
    if (opt.kx !== undefined || opt.ky !== undefined || opt.rot) {   // 1.09: squashed, popping or tipping over (around the feet)
      ctx.translate(sx, sy + (opt.dy || 0)); if (opt.rot) ctx.rotate(opt.rot); ctx.scale((face < 0 ? -1 : 1) * (opt.kx === undefined ? 1 : opt.kx), opt.ky === undefined ? 1 : opt.ky);
      ctx.drawImage(c, -w / 2, -h, w, h);
    }
    else if (face < 0) { ctx.translate(sx, 0); ctx.scale(-1, 1); ctx.drawImage(c, -w / 2, sy - h, w, h); }
    else ctx.drawImage(c, sx - w / 2, sy - h, w, h);
    ctx.restore();
    return h;
  }

  // 1.07: monsters are pixel figures like the heroes; they look towards the nearest hero and lunge a frame when they strike
  function monFace(it, bx, by) {
    let best = null, bd = 1e9;
    alive().forEach(h => { const p = heroPos(h), d = (p.x - bx) ** 2 + (p.y - by) ** 2; if (d < bd) { bd = d; best = p; } });
    if (!best || bd > 64) return it.face || 1;
    const sdx = (best.x - bx) - (best.y - by); if (Math.abs(sdx) > 0.05) it.face = sdx > 0 ? 1 : -1;
    return it.face || 1;
  }
  ['goblin', 'archer', 'shaman', 'ogre', 'spider'].forEach(t => {
    ISO_ART[t] = (it, bx, by, T) => {
      const p = W2S(bx, by, 0), H = monH(it, T) * 1.15;
      groundShadow(bx, by, t === 'ogre' ? 0.42 : t === 'spider' ? 0.4 : 0.3, 0.3, 0.42);
      const q = it.flash > 0 ? clamp(it.flash / 0.12, 0, 1) : 0;   // 1.09: a hit squashes it for a moment
      drawPixelFigure(t, p[0], p[1], Math.max(FIG_MIN * (t === 'spider' ? 0.75 : t === 'goblin' ? 0.85 : t === 'ogre' ? 1.2 : 1), H), monFace(it, bx, by), q ? { frame: it.anim > 0 ? 1 : 0, flash: true, kx: 1 + 0.14 * q, ky: 1 - 0.12 * q } : { frame: it.anim > 0 ? 1 : 0, flash: false });
    };
  });
  ISO_ART.ghost = (it, bx, by, T) => {
    const bob = Math.sin(realNow * 3 + it.x) * 0.06, p = W2S(bx, by, 0.35 + bob);
    groundShadow(bx, by, 0.25, 0.2, 0.2);
    ctx.globalAlpha *= it.anim > 0 ? 0.95 : 0.72;
    drawPixelFigure('ghost', p[0], p[1], Math.max(FIG_MIN, monH(it, T) * 1.15), Math.sin(realNow * 0.7 + it.x) > 0 ? 1 : -1, { frame: Math.floor(realNow * 4) % 4, flash: it.flash > 0 });
  };
  ISO_ART.shade = (it, bx, by, T) => {
    const bob = Math.sin(realNow * 2 + it.x) * 0.05, p = W2S(bx, by, 0.2 + bob);
    const g = ctx.createRadialGradient(p[0], p[1] - T * 0.4, 0, p[0], p[1] - T * 0.4, T * 0.8); g.addColorStop(0, 'rgba(18,12,28,0.55)'); g.addColorStop(1, 'rgba(18,12,28,0)');
    ctx.fillStyle = g; ctx.fillRect(p[0] - T, p[1] - T * 1.2, T * 2, T * 1.6);
    ctx.globalAlpha *= it.anim > 0 ? 0.95 : 0.8;
    drawPixelFigure('shade', p[0], p[1], Math.max(FIG_MIN, monH(it, T) * 1.15), 1, { frame: Math.floor(realNow * 3) % 4, flash: it.flash > 0 });
  };
  ISO_ART.bats = (it, bx, by, T) => {
    for (let k = 0; k < 3; k++) {
      const an = realNow * 4 + k * 2.1 + it.x, x = bx + Math.cos(an) * 0.28, y = by + Math.sin(an * 1.3) * 0.22, p = W2S(x, y, 0.75 + 0.1 * Math.sin(an * 2));
      drawPixelFigure('bat', p[0], p[1] + T * 0.3, Math.max(22, T * 1.1), Math.cos(an) > 0 ? -1 : 1, { frame: Math.floor(realNow * 10 + k) % 2, flash: it.flash > 0 || it.anim > 0 });
    }
  };
  /* 1.07: what stands, drawn for the isometric camera (in screen space, at its spot of the floor) */
  const OBJ_TOP = { barrel: 0.62, crate: 0.6, statue: 0.22, shelf: 1.0 };
  const objTopZ = o => o ? (OBJ_TOP[o.kind] !== undefined ? OBJ_TOP[o.kind] : 1.0) : 0.5;
  function line2(a, b, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  function flame(p, T, k, hot) {   // a small candle or torch flame at p
    const f = 0.8 + 0.2 * Math.sin(realNow * 9 + p[0] * 0.1);
    ctx.fillStyle = hot ? 'rgba(255,90,60,0.95)' : 'rgba(255,150,60,0.92)'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - T * 0.05 * k, T * 0.035 * k, T * 0.07 * k * f, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,160,0.95)'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - T * 0.04 * k, T * 0.016 * k, T * 0.035 * k * f, 0, 0, Math.PI * 2); ctx.fill();
  }
  // the wall a door tile sits in runs along x (true) or along y
  const doorAlongX = (x, y) => tileAt(x - 1, y) === WALL || tileAt(x + 1, y) === WALL;
  Object.assign(ISO_ART, {
    coffin(it, bx, by, T) {
      groundShadow(bx, by, 0.32, 0.45, 0.4);
      const lid = it.anim > 0 ? 0.12 : 0;
      isoBox(bx, by, 0.42, 0.82, 0.24, null, '#2e2016', '#22170f');
      if (lid) { const e = W2S(bx, by, 0.25); ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(e[0] - T * 0.05, e[1], T * 0.025, 0, Math.PI * 2); ctx.arc(e[0] + T * 0.05, e[1], T * 0.025, 0, Math.PI * 2); ctx.fill(); }
      isoBox(bx + lid, by - lid * 0.5, 0.44, 0.84, 0.06, '#5a3f2a', '#46301f', '#382617', 0.24);
      const a = W2S(bx + lid, by - 0.28 - lid * 0.5, 0.3), b = W2S(bx + lid, by + 0.22 - lid * 0.5, 0.3), c = W2S(bx + lid - 0.13, by - 0.12 - lid * 0.5, 0.3), d = W2S(bx + lid + 0.13, by - 0.12 - lid * 0.5, 0.3);
      line2(a, b, '#b49a6a', Math.max(1, T * 0.035)); line2(c, d, '#b49a6a', Math.max(1, T * 0.035));
    },
    rune(it, bx, by, T) {
      groundShadow(bx, by, 0.3, 0.25, 0.4);
      const b = W2S(bx, by, 0), H = T * 0.95;
      ctx.fillStyle = '#4f4c5a'; ctx.beginPath(); ctx.moveTo(b[0] - T * 0.2, b[1]); ctx.lineTo(b[0] - T * 0.15, b[1] - H * 0.9); ctx.lineTo(b[0] + T * 0.05, b[1] - H); ctx.lineTo(b[0] + T * 0.19, b[1] - H * 0.85); ctx.lineTo(b[0] + T * 0.2, b[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(b[0] + T * 0.03, b[1]); ctx.lineTo(b[0] + T * 0.05, b[1] - H); ctx.lineTo(b[0] + T * 0.19, b[1] - H * 0.85); ctx.lineTo(b[0] + T * 0.2, b[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(140,200,255,' + (0.6 + 0.3 * Math.sin(realNow * 3 + it.x)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.2, T * 0.045); ctx.beginPath();
      ctx.moveTo(b[0] - T * 0.04, b[1] - H * 0.75); ctx.lineTo(b[0] - T * 0.04, b[1] - H * 0.3); ctx.moveTo(b[0] - T * 0.04, b[1] - H * 0.62); ctx.lineTo(b[0] + T * 0.07, b[1] - H * 0.72); ctx.moveTo(b[0] - T * 0.04, b[1] - H * 0.48); ctx.lineTo(b[0] + T * 0.07, b[1] - H * 0.58); ctx.stroke();
    },
    altar(it, bx, by, T) {
      groundShadow(bx, by, 0.42, 0.34, 0.42);
      isoBox(bx, by, 0.72, 0.5, 0.38, '#5a2433', '#45202a', '#341820');
      isoBox(bx, by, 0.76, 0.54, 0.05, '#7a2f3f', '#62262f', '#4a1c25', 0.38);
      [-0.24, 0.24].forEach(dx => { const b = W2S(bx + dx, by, 0.43), t = W2S(bx + dx, by, 0.62); line2(b, t, '#e2d6bb', Math.max(2, T * 0.06)); flame(t, T, 1); });
    },
    acid(it, bx, by, T) {
      groundShadow(bx, by, 0.36, 0.36, 0.4);
      const b = W2S(bx, by, 0), t = W2S(bx, by, 0.42), rx = T * 0.3, ry = rx * SP;
      ctx.fillStyle = '#3a3f46'; ctx.fillRect(b[0] - rx, t[1], rx * 2, b[1] - t[1]); ctx.beginPath(); ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(b[0], t[1], rx, b[1] - t[1]);
      ctx.fillStyle = '#4b5059'; ctx.beginPath(); ctx.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6fbf4a'; ctx.beginPath(); ctx.ellipse(t[0], t[1] + 1, rx * 0.82, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(170,255,120,0.8)';
      for (let k = 0; k < 3; k++) { const u = (realNow * 0.8 + k * 0.33 + it.x * 0.1) % 1; ctx.beginPath(); ctx.arc(t[0] - rx * 0.4 + k * rx * 0.4, t[1] - u * T * 0.3, T * (0.045 - u * 0.025), 0, Math.PI * 2); ctx.fill(); }
    },
    veil(it, bx, by, T) {   // a heavy curtain on a frame, across the tile
      groundShadow(bx, by, 0.4, 0.2, 0.35);
      const H = 0.95, a = [bx - 0.4, by + 0.1], b = [bx + 0.4, by + 0.1];
      line2(W2S(a[0], a[1], 0), W2S(a[0], a[1], H), '#3a2a1a', Math.max(2, T * 0.06)); line2(W2S(b[0], b[1], 0), W2S(b[0], b[1], H), '#3a2a1a', Math.max(2, T * 0.06));
      line2(W2S(a[0], a[1], H), W2S(b[0], b[1], H), '#2a1e14', Math.max(2, T * 0.06));
      ctx.save(); faceMap(a[0] + 0.04, a[1], b[0] - 0.04, b[1], 0.04, H - 0.04);
      for (let k = 0; k < 5; k++) { const x = k * 0.2, sw = Math.sin(realNow * 1.5 + k) * 0.015; ctx.fillStyle = k % 2 ? '#4a3270' : '#5b3f8a'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 0.2, 0); ctx.quadraticCurveTo(x + 0.17 + sw, 0.5, x + 0.21, 1); ctx.lineTo(x + 0.01, 1); ctx.quadraticCurveTo(x - 0.03 + sw, 0.5, x, 0); ctx.fill(); }
      ctx.restore();
    },
    howl(it, bx, by, T) {
      groundShadow(bx, by, 0.32, 0.26, 0.4);
      const b = W2S(bx, by, 0), H = T * 0.85;
      ctx.fillStyle = '#5e5a68'; ctx.beginPath(); ctx.moveTo(b[0] - T * 0.22, b[1]); ctx.quadraticCurveTo(b[0] - T * 0.3, b[1] - H * 0.7, b[0] - T * 0.04, b[1] - H); ctx.quadraticCurveTo(b[0] + T * 0.28, b[1] - H * 0.85, b[0] + T * 0.22, b[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.moveTo(b[0] + T * 0.02, b[1]); ctx.quadraticCurveTo(b[0] + T * 0.04, b[1] - H * 0.7, b[0] - T * 0.02, b[1] - H * 0.99); ctx.quadraticCurveTo(b[0] + T * 0.28, b[1] - H * 0.85, b[0] + T * 0.22, b[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#16131b'; ctx.beginPath(); ctx.ellipse(b[0] - T * 0.05, b[1] - H * 0.62, T * 0.06, T * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(b[0] + T * 0.07, b[1] - H * 0.3, T * 0.045, 0, Math.PI * 2); ctx.fill();
      const ph = (realNow * 0.9 + it.x * 0.3) % 1; ctx.strokeStyle = 'rgba(115,214,198,' + (0.55 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, T * 0.035);
      ctx.beginPath(); ctx.arc(b[0], b[1] - H * 0.55, T * (0.32 + 0.14 * ph), -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(b[0], b[1] - H * 0.55, T * (0.32 + 0.14 * ph), Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    },
    shackles(it, bx, by, T) {
      groundShadow(bx, by, 0.3, 0.25, 0.4);
      isoBox(bx, by, 0.14, 0.14, 0.9, '#4a4452', '#3a3440', '#2a2630');
      const top = W2S(bx, by, 0.75);
      ctx.strokeStyle = '#8e8a9a'; ctx.lineWidth = Math.max(1, T * 0.03);
      [-1, 1].forEach(sd => {
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(top[0] + sd * T * (0.08 + k * 0.07), top[1] + k * T * 0.1, T * 0.035, T * 0.025, sd * 0.6, 0, Math.PI * 2); ctx.stroke(); }
        const c = W2S(bx + sd * 0.28, by + 0.18, 0.05); ctx.beginPath(); ctx.ellipse(c[0], c[1], T * 0.07, T * 0.04, 0, 0, Math.PI * 2); ctx.stroke();
      });
    },
    fortify(it, bx, by, T) {   // a bastion: a block of dressed stone
      groundShadow(bx, by, 0.48, 0.42, 0.45);
      isoBox(bx, by, 0.8, 0.8, 0.55, '#5c5668', '#4a4555', '#383442');
      ctx.strokeStyle = 'rgba(20,16,26,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
      [0.18, 0.36].forEach(z => { const a = W2S(bx - 0.4, by + 0.4, z), b = W2S(bx + 0.4, by + 0.4, z), c = W2S(bx + 0.4, by - 0.4, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); });
      [[-0.1, 0], [0.2, 0.18], [-0.25, 0.36]].forEach(q => { const a = W2S(bx + q[0], by + 0.4, q[1]), b = W2S(bx + q[0], by + 0.4, q[1] + 0.18); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); const c = W2S(bx + 0.4, by + q[0], q[1]), d = W2S(bx + 0.4, by + q[0], q[1] + 0.18); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); });
      ctx.stroke();
    },
    gate(it, bx, by, T) {   // a portcullis in the doorway: down when shut, up in the arch when open
      const d = fl.doors.get(key(it.x, it.y)), closed = d && doorClosed(d), ax = doorAlongX(it.x, it.y), H = DOOR_H, z0 = closed ? 0 : H * 0.72;
      const A = ax ? [bx - 0.5, by] : [bx, by - 0.5], B = ax ? [bx + 0.5, by] : [bx, by + 0.5];
      line2(W2S(A[0], A[1], H), W2S(B[0], B[1], H), '#2a2b31', Math.max(2, T * 0.08));
      ctx.strokeStyle = '#9a9eae'; ctx.lineWidth = Math.max(1.4, T * 0.045); ctx.beginPath();
      for (let k = 1; k < 6; k++) { const u = k / 6, x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u, p = W2S(x, y, z0), q = W2S(x, y, H); ctx.moveTo(p[0], p[1] + (closed ? T * 0.04 : 0)); ctx.lineTo(q[0], q[1]); }
      [0.35, 0.7].forEach(z => { if (z * H < z0) return; const p = W2S(A[0], A[1], z * H), q = W2S(B[0], B[1], z * H); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); });
      ctx.stroke();
      const left = Math.max(0, mods.gateUses - (it.uses || 0));
      if (T >= 14) for (let k = 0; k < left; k++) { const p = W2S(bx + (ax ? -0.3 + k * 0.15 : 0.35), by + (ax ? 0.35 : -0.3 + k * 0.15), 0); ctx.fillStyle = '#d9a640'; ctx.beginPath(); ctx.ellipse(p[0], p[1], Math.max(1.5, T * 0.05), Math.max(1, T * 0.05 * SP), 0, 0, Math.PI * 2); ctx.fill(); }   // uses left: studs in the floor
    },
    creak(it, bx, by, T) {   // a door leaf in the doorway, swinging when it creaks
      const ax = doorAlongX(it.x, it.y), sw = it.anim > 0 ? Math.sin(realNow * 30) * 0.08 : 0, H = DOOR_H * 0.92;
      const A = ax ? [bx - 0.42, by + sw] : [bx + sw, by - 0.42], B = ax ? [bx + 0.42, by - sw] : [bx - sw, by + 0.42];
      ctx.save(); faceMap(A[0], A[1], B[0], B[1], 0, H);
      ctx.fillStyle = '#5a3d22'; ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 1; k < 4; k++) ctx.fillRect(k * 0.25 - 0.01, 0, 0.02, 1);
      ctx.fillStyle = '#8e8a9a'; ctx.fillRect(0.02, 0.18, 0.14, 0.06); ctx.fillRect(0.02, 0.72, 0.14, 0.06); ctx.fillRect(0.82, 0.48, 0.06, 0.06);
      ctx.restore();
    },
    cage(it, bx, by, T) {   // shut: bars all round the tile
      const H = 0.95, x0 = bx - 0.42, x1 = bx + 0.42, y0 = by - 0.42, y1 = by + 0.42;
      ctx.strokeStyle = '#a9adbd'; ctx.lineWidth = Math.max(1.2, T * 0.04); ctx.beginPath();
      const v = (x, y) => { const p = W2S(x, y, 0), q = W2S(x, y, H); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
      for (let k = 0; k <= 4; k++) { const u = k / 4; v(x0 + (x1 - x0) * u, y1); v(x1, y0 + (y1 - y0) * u); v(x0, y0 + (y1 - y0) * u); v(x0 + (x1 - x0) * u, y0); }
      const top = [W2S(x0, y0, H), W2S(x1, y0, H), W2S(x1, y1, H), W2S(x0, y1, H)];
      ctx.moveTo(top[0][0], top[0][1]); top.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(top[0][0], top[0][1]);
      ctx.stroke();
    },
    powder(it, bx, by, T) {   // a keg on the furniture, a fuse that sparks
      const z = objTopZ(fl.objects.get(key(it.x, it.y))), p = W2S(bx + 0.18, by + 0.18, z);
      ctx.fillStyle = '#26262e'; ctx.fillRect(p[0] - T * 0.11, p[1] - T * 0.22, T * 0.22, T * 0.22); ctx.beginPath(); ctx.ellipse(p[0], p[1] - T * 0.22, T * 0.11, T * 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = '#3a3a44'; ctx.fill();
      line2([p[0] + T * 0.04, p[1] - T * 0.24], [p[0] + T * 0.1, p[1] - T * 0.34], '#b08a5a', Math.max(1, T * 0.03));
      ctx.fillStyle = Math.sin(realNow * 14) > 0 ? '#ffd27a' : '#ff7a3c'; ctx.beginPath(); ctx.arc(p[0] + T * 0.1, p[1] - T * 0.35, T * 0.04, 0, Math.PI * 2); ctx.fill();
    },
    mimic(it, bx, by, T) {   // the furniture has eyes and teeth
      const z = objTopZ(fl.objects.get(key(it.x, it.y))), open = it.anim > 0 ? T * 0.05 : 0, p = W2S(bx, by + 0.36, Math.min(0.35, z * 0.55));
      ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(p[0] - T * 0.1, p[1] - T * 0.16, T * 0.04, 0, Math.PI * 2); ctx.arc(p[0] + T * 0.1, p[1] - T * 0.16, T * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a0c10'; ctx.fillRect(p[0] - T * 0.22, p[1] - T * 0.04 - open, T * 0.44, T * 0.08 + open * 2);
      ctx.fillStyle = '#ece0c8'; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const x = p[0] - T * 0.22 + k * T * 0.088; ctx.moveTo(x, p[1] - T * 0.04 - open); ctx.lineTo(x + T * 0.044, p[1] + T * 0.03 - open); ctx.lineTo(x + T * 0.088, p[1] - T * 0.04 - open); ctx.moveTo(x, p[1] + T * 0.04 + open); ctx.lineTo(x + T * 0.044, p[1] - T * 0.02 + open); ctx.lineTo(x + T * 0.088, p[1] + T * 0.04 + open); }
      ctx.fill();
    },
    musicbox(it, bx, by, T) {   // a small box on the furniture; notes drift up while it plays
      const z = objTopZ(fl.objects.get(key(it.x, it.y)));
      isoBox(bx - 0.1, by - 0.1, 0.26, 0.2, 0.15, '#c9a44e', '#6a3550', '#52283e', z);
      const p = W2S(bx - 0.1, by - 0.1, z + 0.18);
      if (it.playUntil > fl.time && fl.phase === 'raid') {
        ctx.fillStyle = '#e6d2ff'; ctx.font = numFont(Math.max(9, T * 0.3), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let k = 0; k < 2; k++) { const u = (realNow * 0.7 + k * 0.5) % 1; ctx.globalAlpha = 1 - u; ctx.fillText('♪', p[0] + T * (0.05 + 0.2 * k), p[1] - T * (0.05 + 0.45 * u)); }
        ctx.globalAlpha = 1;
      }
    },
    bones(it, bx, by, T) {   // a heap of bones and a skull that rattles
      const j = it.anim > 0 ? Math.sin(realNow * 40) * T * 0.03 : 0;
      groundShadow(bx, by, 0.3, 0.25, 0.3);
      const a = W2S(bx - 0.25, by + 0.1, 0.03), b = W2S(bx + 0.2, by - 0.15, 0.03), c = W2S(bx - 0.2, by - 0.2, 0.03), d = W2S(bx + 0.22, by + 0.15, 0.03);
      ctx.lineCap = 'round'; line2([a[0] + j, a[1]], [b[0] + j, b[1]], '#d8cfbd', Math.max(2, T * 0.07)); line2([c[0] - j, c[1]], [d[0] - j, d[1]], '#bdb3a0', Math.max(2, T * 0.07)); ctx.lineCap = 'butt';
      const s = W2S(bx + 0.05, by + 0.05, 0.12);
      ctx.fillStyle = '#e2d9c6'; ctx.beginPath(); ctx.arc(s[0] + j, s[1] - T * 0.06, T * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(s[0] - T * 0.07 + j, s[1] - T * 0.02, T * 0.14, T * 0.07);
      ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.arc(s[0] - T * 0.05 + j, s[1] - T * 0.07, T * 0.035, 0, Math.PI * 2); ctx.arc(s[0] + T * 0.05 + j, s[1] - T * 0.07, T * 0.035, 0, Math.PI * 2); ctx.fill();
    },
    loot(it, bx, by, T) {
      const kind = LOOT_KIND[it.type], lr = ITEMS[it.type].rarity;
      groundShadow(bx, by, 0.3, 0.26, 0.35);
      if (lr >= 2) {   // a glow on the floor and in the air
        const pulse = 0.5 + 0.5 * Math.sin(realNow * (lr === 3 ? 5 : 3) + it.x), R = T * (lr === 3 ? 0.95 : 0.65), p = W2S(bx, by, 0.25);
        ctx.globalAlpha *= lr === 3 ? 0.45 + 0.3 * pulse : 0.35 + 0.25 * pulse;
        ctx.drawImage(lr === 3 ? glowSprite('relic', [[0, 'rgba(255,140,60,1)'], [1, 'rgba(0,0,0,0)']]) : glowSprite('gear', [[0, 'rgba(110,180,255,1)'], [1, 'rgba(0,0,0,0)']]), p[0] - R, p[1] - R, R * 2, R * 2);
        ctx.globalAlpha = 1;
      }
      if (kind === 'gold') {
        const big = (it.gold || 1) > 1, n = big ? 7 : 4;
        for (let k = 0; k < n; k++) { const a = k * 2.4, rr0 = k ? 0.12 + 0.05 * (k % 3) : 0, p = W2S(bx + Math.cos(a) * rr0, by + Math.sin(a) * rr0, k ? 0.02 : 0.08); ctx.fillStyle = k % 2 ? '#c99a3a' : '#e8c060'; ctx.beginPath(); ctx.ellipse(p[0], p[1], T * 0.1, T * 0.1 * SP, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(80,50,10,0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
        if (big && T >= 16) signText(String(it.gold), W2S(bx, by, 0.3)[0], W2S(bx, by, 0.3)[1], numFont(Math.max(8, T * 0.24), true), '#ffe9a8');
      } else if (kind === 'potion') {
        const p = W2S(bx, by, 0);
        ctx.fillStyle = 'rgba(200,215,240,0.75)'; ctx.beginPath(); ctx.arc(p[0], p[1] - T * 0.16, T * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4fb05a'; ctx.beginPath(); ctx.arc(p[0], p[1] - T * 0.14, T * 0.12, 0, Math.PI); ctx.fill();
        ctx.fillStyle = 'rgba(200,215,240,0.8)'; ctx.fillRect(p[0] - T * 0.045, p[1] - T * 0.42, T * 0.09, T * 0.14);
        ctx.fillStyle = '#7a5634'; ctx.fillRect(p[0] - T * 0.055, p[1] - T * 0.47, T * 0.11, T * 0.06);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(p[0] - T * 0.09, p[1] - T * 0.24, T * 0.04, T * 0.04);
      } else if (kind === 'relic') {   // a golden chalice
        const p = W2S(bx, by, 0);
        ctx.fillStyle = '#d99a3c'; ctx.beginPath(); ctx.moveTo(p[0] - T * 0.17, p[1] - T * 0.52); ctx.lineTo(p[0] + T * 0.17, p[1] - T * 0.52); ctx.quadraticCurveTo(p[0] + T * 0.15, p[1] - T * 0.28, p[0], p[1] - T * 0.26); ctx.quadraticCurveTo(p[0] - T * 0.15, p[1] - T * 0.28, p[0] - T * 0.17, p[1] - T * 0.52); ctx.fill();
        ctx.fillRect(p[0] - T * 0.03, p[1] - T * 0.27, T * 0.06, T * 0.2); ctx.fillRect(p[0] - T * 0.12, p[1] - T * 0.08, T * 0.24, T * 0.06);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(p[0], p[1] - T * 0.5, T * 0.15, T * 0.2);
        ctx.fillStyle = '#e04a5a'; ctx.beginPath(); ctx.arc(p[0], p[1] - T * 0.42, T * 0.04, 0, Math.PI * 2); ctx.fill();
      } else {   // gear and the cursed treasure (looks the same to them): a small chest
        isoBox(bx, by, 0.52, 0.38, 0.24, '#7a5530', '#5e4024', '#47301a');
        isoBox(bx, by, 0.54, 0.4, 0.08, '#8a6236', '#6e4c2a', '#553a20', 0.24);
        ctx.save(); faceMap(bx - 0.26, by + 0.195, bx + 0.26, by + 0.195, 0, 0.3); ctx.fillStyle = '#c9a44e'; ctx.fillRect(0.06, 0.06, 0.04, 0.9); ctx.fillRect(0.9, 0.06, 0.04, 0.9); ctx.fillStyle = '#8fc0e8'; ctx.fillRect(0.44, 0.22, 0.12, 0.26); ctx.restore();   // iron bands and a lock on its front
        if (kind === 'cursed') {
          ctx.save(); floorT(); ctx.strokeStyle = 'rgba(180,140,255,0.7)'; ctx.setLineDash([T * 0.06, T * 0.05]); ctx.lineWidth = Math.max(1, T * 0.03); ctx.strokeRect(it.x * T + T * 0.12, it.y * T + T * 0.12, T * 0.76, T * 0.76); ctx.restore();
          if (it.cursedKnown && fl.phase === 'raid') { ctx.save(); tileMap(it.x, it.y, 0.33, null); ctx.strokeStyle = '#b48cff'; ctx.lineWidth = Math.max(2 / T, 0.06); ctx.beginPath(); ctx.moveTo(0.15, 0.15); ctx.lineTo(0.85, 0.85); ctx.moveTo(0.85, 0.15); ctx.lineTo(0.15, 0.85); ctx.stroke(); ctx.restore(); }   // a big X over the chest, on a plane
        }
      }
      if (it.item && T >= 14) { const p = W2S(bx + 0.25, by - 0.25, 0.45); ctx.fillStyle = it.item.cursed ? '#b48cff' : ITEM_COLOR[it.item.type] || '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], T * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 1; ctx.stroke(); }
      const gl = 0.5 + 0.5 * Math.sin(realNow * 4 + it.x), sp = W2S(bx + 0.15, by - 0.1, 0.35);
      ctx.fillStyle = 'rgba(255,240,180,' + (0.6 * gl).toFixed(2) + ')'; ctx.fillRect(sp[0], sp[1], T * 0.05, T * 0.05);
    }
  });
  // a tapered block (a standing stone): base wb x db, top wt x dt, h high; and a point on its south face (u across, v up)
  function isoFrustum(cx, cy, wb, db, wt, dt, h, top, south, east, z0) {
    z0 = z0 || 0; const z1 = z0 + h;
    const B = (sx, sy) => W2S(cx + sx * wb / 2, cy + sy * db / 2, z0), U = (sx, sy) => W2S(cx + sx * wt / 2, cy + sy * dt / 2, z1);
    poly([B(-1, 1), B(1, 1), U(1, 1), U(-1, 1)], south);
    poly([B(1, -1), B(1, 1), U(1, 1), U(1, -1)], east);
    poly([U(-1, -1), U(1, -1), U(1, 1), U(-1, 1)], top);
  }
  const frontPt = (cx, cy, wb, db, wt, dt, h, u, v) => { const w = wb + (wt - wb) * v, d = db + (dt - db) * v; return W2S(cx - w / 2 + w * u, cy + d / 2, h * v); };
  const OBJ_FRONT = { barrel: 0.27, crate: 0.35, statue: 0.31, shelf: 0.21 };
  // spikes: a plate in the floor and steel cones that shoot up when it fires (cones look the same from any side)
  function spikeCones(it, bx, by, T, fake) {
    const hot = it.anim > 0, H = hot ? 0.4 : 0.13, r = T * 0.07;
    ctx.save(); tileMap(it.x, it.y, 0.01, null); ctx.fillStyle = '#26222e'; ctx.fillRect(0.14, 0.14, 0.72, 0.72); ctx.fillStyle = '#100e14';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(0.28 + i * 0.22, 0.28 + j * 0.22, 0.045, 0, Math.PI * 2); ctx.fill(); }
    if (fake) { ctx.strokeStyle = 'rgba(255,160,90,0.55)'; ctx.setLineDash([0.08, 0.06]); ctx.lineWidth = Math.max(1 / T, 0.03); ctx.strokeRect(0.08, 0.08, 0.84, 0.84); ctx.setLineDash([]); }
    ctx.restore();
    const pts = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pts.push([it.x + 0.28 + i * 0.22, it.y + 0.28 + j * 0.22]);
    pts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).forEach(q => {
      const b = W2S(q[0], q[1], 0.01), a = W2S(q[0], q[1], H);
      ctx.fillStyle = hot ? '#f4f6fa' : '#a9b0bf'; ctx.beginPath(); ctx.moveTo(b[0] - r, b[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0] + r, b[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = hot ? '#c9ced8' : '#6c7280'; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0] + r, b[1]); ctx.closePath(); ctx.fill();
    });
  }
  Object.assign(ISO_ART, {
    spikes(it, bx, by, T) { spikeCones(it, bx, by, T, false); },
    decoy(it, bx, by, T) { spikeCones(it, bx, by, T, true); if (it.disabled && fl.phase === 'raid') { ctx.save(); tileMap(it.x, it.y, 0.02, null); ctx.fillStyle = 'rgba(16,17,20,0.6)'; ctx.fillRect(0, 0, 1, 1); ctx.restore(); } },
    rune(it, bx, by, T) {   // a standing stone; the rune is cut into its south face and glows
      groundShadow(bx, by, 0.32, 0.27, 0.4);
      const F = [bx, by, 0.42, 0.34, 0.26, 0.2, 0.95];
      isoFrustum(F[0], F[1], F[2], F[3], F[4], F[5], F[6], '#6a6676', '#55525f', '#3f3c48');
      const P = (u, v) => frontPt(...F, u, v);
      ctx.strokeStyle = 'rgba(140,200,255,' + (0.6 + 0.3 * Math.sin(realNow * 3 + it.x)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.2, T * 0.045); ctx.lineCap = 'round'; ctx.beginPath();
      [[0.45, 0.22, 0.45, 0.8], [0.45, 0.66, 0.66, 0.76], [0.45, 0.5, 0.66, 0.6]].forEach(s => { const a = P(s[0], s[1]), b = P(s[2], s[3]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); });
      ctx.stroke(); ctx.lineCap = 'butt';
    },
    howl(it, bx, by, T) {   // a weathered stone with holes in its face; the wind howls in them (waves pulse out)
      groundShadow(bx, by, 0.34, 0.28, 0.4);
      const F = [bx, by, 0.5, 0.42, 0.3, 0.26, 0.82];
      isoFrustum(F[0], F[1], F[2], F[3], F[4], F[5], F[6], '#6c6876', '#5a5664', '#43404c');
      const P = (u, v) => frontPt(...F, u, v);
      ctx.fillStyle = '#16131b';
      [[0.38, 0.62, 0.07, 0.1], [0.64, 0.32, 0.055, 0.07]].forEach(h => { const p = P(h[0], h[1]); ctx.beginPath(); ctx.ellipse(p[0], p[1], T * h[2], T * h[3], 0, 0, Math.PI * 2); ctx.fill(); });
      const c = P(0.5, 0.55), ph = (realNow * 0.9 + it.x * 0.3) % 1; ctx.strokeStyle = 'rgba(115,214,198,' + (0.55 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, T * 0.035);
      ctx.beginPath(); ctx.arc(c[0], c[1], T * (0.34 + 0.14 * ph), -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(c[0], c[1], T * (0.34 + 0.14 * ph), Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    },
    mimic(it, bx, by, T) {   // the furniture's front gets eyes and a mouth full of teeth
      const o = fl.objects.get(key(it.x, it.y)), z = objTopZ(o), fr = (o && OBJ_FRONT[o.kind]) || 0.3, open = it.anim > 0 ? 0.06 : 0;
      ctx.save(); faceMap(bx - 0.3, by + fr + 0.01, bx + 0.3, by + fr + 0.01, 0.06, Math.min(0.58, z * 0.92));
      ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(0.3, 0.22, 0.07, 0, Math.PI * 2); ctx.arc(0.7, 0.22, 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a0c10'; ctx.fillRect(0.1, 0.45 - open, 0.8, 0.16 + open * 2);
      ctx.fillStyle = '#ece0c8'; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const x = 0.1 + k * 0.16; ctx.moveTo(x, 0.45 - open); ctx.lineTo(x + 0.08, 0.56 - open); ctx.lineTo(x + 0.16, 0.45 - open); ctx.moveTo(x, 0.61 + open); ctx.lineTo(x + 0.08, 0.5 + open); ctx.lineTo(x + 0.16, 0.61 + open); }
      ctx.fill(); ctx.restore();
    },
    powder(it, bx, by, T) {   // a keg on the furniture (a small barrel), a fuse that sparks
      const z = objTopZ(fl.objects.get(key(it.x, it.y))), cx = bx + 0.14, cy = by + 0.14, b = W2S(cx, cy, z), t = W2S(cx, cy, z + 0.24), rx = T * 0.12, ry = rx * SP;
      ctx.fillStyle = '#2a2a32'; ctx.fillRect(b[0] - rx, t[1], rx * 2, b[1] - t[1]); ctx.beginPath(); ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(b[0], t[1], rx, b[1] - t[1]);
      ctx.fillStyle = '#3c3c46'; ctx.beginPath(); ctx.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      const f = W2S(cx + 0.04, cy, z + 0.36);
      line2([t[0] + T * 0.02, t[1]], f, '#b08a5a', Math.max(1, T * 0.03));
      ctx.fillStyle = Math.sin(realNow * 14) > 0 ? '#ffd27a' : '#ff7a3c'; ctx.beginPath(); ctx.arc(f[0], f[1], T * 0.04, 0, Math.PI * 2); ctx.fill();
    }
  });
  // draws one figure in a 24-unit box (feet at 0, head top near -24; x to the right = the way it faces)
  function drawFigure(type, x, feetY, H, face, col, opt) {
    opt = opt || {};
    const u = H / 24;
    ctx.save(); ctx.translate(x, feetY); ctx.scale(u * face, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const lw = 1.6 / u;   // about 1,6 px of outline at any size
    const C = opt.flash ? '#ffffff' : col, D = opt.flash ? '#e8e8e8' : shade(col, -0.45);
    const shape = (fill, build) => { ctx.beginPath(); build(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke(); };
    const line = (color, w, pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.strokeStyle = OUT; ctx.lineWidth = w + lw * 1.6; ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); };
    const step = opt.walk ? Math.sin(opt.walk) * 1.4 : 0;
    const robe = type === 'priest' || type === 'mage';
    // behind the body: a cape (thief), the bag (treasure hunter)
    if (type === 'thief') shape(D, () => { ctx.moveTo(-4.6, -14.5); ctx.lineTo(-6.6, -1.5); ctx.lineTo(3.5, -1.5); ctx.lineTo(4.2, -14.5); ctx.closePath(); });
    if (opt.bag) { shape('#e0a83c', () => { ctx.ellipse(-6.2, -7.5, 2.8, 3.1, 0, 0, Math.PI * 2); }); line('#8a5a1c', 1, [-7.2, -10.6, -5.2, -10.6]); }
    // legs (a robe covers them)
    if (!robe) {
      shape('#2b2530', () => { ctx.rect(-3.4, -6.5 + Math.max(0, step) * 0.5, 2.6, 6.5 - Math.max(0, step) * 0.5); });
      shape('#2b2530', () => { ctx.rect(0.8, -6.5 + Math.max(0, -step) * 0.5, 2.6, 6.5 - Math.max(0, -step) * 0.5); });
    }
    // the body
    if (type === 'priest') shape('#f1e8cf', () => { ctx.moveTo(-4.6, -14.5); ctx.lineTo(4.6, -14.5); ctx.lineTo(6.6, 0); ctx.lineTo(-6.6, 0); ctx.closePath(); });
    else if (type === 'mage') shape(C, () => { ctx.moveTo(-4.4, -14.5); ctx.lineTo(4.4, -14.5); ctx.lineTo(6.4, 0); ctx.lineTo(-6.4, 0); ctx.closePath(); });
    else if (type === 'barbarian') shape(C, () => { ctx.moveTo(-5.6, -15); ctx.lineTo(5.6, -15); ctx.lineTo(4.6, -5.5); ctx.lineTo(-4.6, -5.5); ctx.closePath(); });
    else shape(C, () => { ctx.moveTo(-4.6, -14.8); ctx.lineTo(4.6, -14.8); ctx.lineTo(4.2, -5.6); ctx.lineTo(-4.2, -5.6); ctx.closePath(); });
    if (type === 'priest') { line(col, 1.6, [0, -14, 0, -0.6]); line('#fff7d6', 1.2, [0, -12.6, 0, -8.4]); line('#fff7d6', 1.2, [-1.8, -11.2, 1.8, -11.2]); ctx.strokeStyle = col; }   // a gold stripe and a cross
    if (type === 'barbarian') { line('#5b3a1f', 1.6, [-4.8, -7, 4.8, -7]); line('#f0e2c8', 0.9, [-3.6, -12.4, -1.2, -10.6]); }   // a fur belt, a scar
    if (type === 'warrior') line('#d6dce8', 1, [-4, -10, 4, -10]);
    if (type === 'bard') line('#ffd166', 1, [-4.2, -9.6, 4.2, -9.6]);
    // the head
    shape(SKIN, () => { ctx.arc(0, -18.2, 3.7, 0, Math.PI * 2); });
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(1.5, -18.6, 0.55, 0, Math.PI * 2); ctx.fill();   // an eye, the way it looks
    // headgear: the silhouette that tells the class apart
    if (type === 'warrior') { shape('#c9d2e3', () => { ctx.arc(0, -18.4, 4.1, Math.PI, 0); ctx.lineTo(4.1, -17.4); ctx.lineTo(-4.1, -17.4); ctx.closePath(); }); line('#c9d2e3', 1.2, [0, -22.6, 0, -24.4]); }
    else if (type === 'thief') shape(D, () => { ctx.moveTo(-4.4, -15.4); ctx.quadraticCurveTo(-5.4, -23.2, 0.6, -24); ctx.quadraticCurveTo(5.4, -22.6, 4.2, -18.6); ctx.lineTo(2.4, -18.2); ctx.quadraticCurveTo(1.8, -21, -1.6, -20.6); ctx.quadraticCurveTo(-3.2, -18.4, -2.4, -15.2); ctx.closePath(); });
    else if (type === 'priest') { ctx.strokeStyle = OUT; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, -23.6, 3.8, 1.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.stroke(); }
    else if (type === 'mage') { shape(D, () => { ctx.ellipse(0, -20.8, 5.6, 1.5, 0, 0, Math.PI * 2); }); shape(D, () => { ctx.moveTo(-3.6, -21); ctx.lineTo(3.6, -21); ctx.quadraticCurveTo(1.6, -26, 3.8, -31); ctx.quadraticCurveTo(-1.4, -27.6, -3.6, -21); ctx.closePath(); }); line(col, 1, [-3.2, -22.2, 3.2, -22.2]); }
    else if (type === 'bard') { shape(D, () => { ctx.ellipse(-0.6, -21.4, 4.8, 1.9, -0.18, 0, Math.PI * 2); }); line('#ffd166', 1.2, [2.6, -22.4, 4.8, -25, 8, -26.4]); }
    else if (type === 'barbarian') { shape('#5a4636', () => { ctx.arc(0, -19, 3.9, Math.PI, 0); ctx.closePath(); }); shape('#efe3ca', () => { ctx.moveTo(-3.6, -20); ctx.quadraticCurveTo(-7.4, -21, -6.8, -25.6); ctx.quadraticCurveTo(-5.4, -22.6, -2.6, -21.8); ctx.closePath(); }); shape('#efe3ca', () => { ctx.moveTo(3.6, -20); ctx.quadraticCurveTo(7.4, -21, 6.8, -25.6); ctx.quadraticCurveTo(5.4, -22.6, 2.6, -21.8); ctx.closePath(); }); }
    // in front: what each one carries
    if (type === 'warrior') { line('#e9edf3', 1.5, [5.8, -7.5, 5.8, -19]); line('#8a6a44', 1.6, [4, -7.6, 7.6, -7.6]); shape(D, () => { ctx.arc(-4.8, -10, 4, 0, Math.PI * 2); }); ctx.fillStyle = '#d6dce8'; ctx.beginPath(); ctx.arc(-4.8, -10, 1.1, 0, Math.PI * 2); ctx.fill(); }
    else if (type === 'thief') { line('#e9edf3', 1.3, [5, -8.4, 7.6, -12.6]); line('#8a6a44', 1.3, [4.2, -7.2, 5.2, -8.6]); }
    else if (type === 'mage') { line('#8a6a44', 1.3, [6.2, 0, 6.2, -21]); ctx.fillStyle = opt.flash ? '#fff' : '#efe4ff'; ctx.beginPath(); ctx.arc(6.2, -22.2, 1.9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); }
    else if (type === 'priest') { /* the cross is on the robe */ }
    else if (type === 'bard') { line('#8a5a2c', 1.2, [0.6, -10.4, 6.8, -15.6]); shape('#c48a46', () => { ctx.ellipse(-0.4, -9.2, 3.3, 2.5, -0.5, 0, Math.PI * 2); }); ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(-0.4, -9.2, 0.8, 0, Math.PI * 2); ctx.fill(); }
    else if (type === 'barbarian') { line('#8a6a44', 1.5, [6, -2, 6, -20]); shape('#d7dde8', () => { ctx.moveTo(6, -19.6); ctx.quadraticCurveTo(11.4, -19.4, 11, -13.6); ctx.quadraticCurveTo(8.6, -15.6, 6, -14.6); ctx.closePath(); }); }
    if (opt.boss) shape('#ffd34d', () => { const b = type === 'mage' ? -31.5 : type === 'priest' ? -25.6 : -24.2; ctx.moveTo(-3, b + 0.4); ctx.lineTo(-3.4, b - 3); ctx.lineTo(-1.4, b - 1.2); ctx.lineTo(0, b - 3.6); ctx.lineTo(1.4, b - 1.2); ctx.lineTo(3.4, b - 3); ctx.lineTo(3, b + 0.4); ctx.closePath(); });   // a crown for a boss
    ctx.restore();
  }
  // a colour a bit darker (k < 0) or lighter (k > 0)
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  // 1.09: a hero on his way out: the dead tip over and fade, the ones who get out fade at the door, the fallen sink into the floor
  const HERO_OUT = 0.7;
  function drawHeroOut(h, T) {
    const p = heroPos(h), g = W2S(p.x, p.y, 0), k = clamp((realNow - h.outR) / HERO_OUT, 0, 1), face = h.face || 1, H = figH(T, h.boss) * 1.15;
    const o = { alpha: 1 };
    if (h.outKind === 'dead') { const t = clamp(k / 0.5, 0, 1); o.rot = face * Math.PI / 2 * t * t; o.alpha = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45; o.dy = -H * 0.05 * Math.sin(Math.PI * t); }
    else if (h.outKind === 'fall') { o.ky = 1 - k; o.kx = 1 - k * 0.3; o.alpha = 1 - k * 0.6; }
    else o.alpha = 1 - k;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.45 * (1 - k)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(g[0], g[1], H * 0.3, H * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    drawPixelFigure(h.type, g[0], g[1], H, face, o);
  }
  const heroOut = h => (h.dead || h.fled || h.gone) && h.outR !== undefined && realNow - h.outR < HERO_OUT && !reduceMotion;
  function drawHero(h, T) {
    if (h.dead || h.fled || h.gone) { if (heroOut(h)) drawHeroOut(h, T); return; }
    const p = heroPos(h), g = W2S(p.x, p.y, 0), sm = h.state === 'smash' ? Math.sin(realNow * 40) * T * 0.04 : 0;   // 1.05: the axe swings
    if (h.nx !== null) { const sdx = (h.nx - h.x) - (h.ny - h.y); if (sdx) h.face = sdx > 0 ? 1 : -1; }   // 1.06: the figure looks the way it goes (1.07: on the screen)
    const face = h.face || 1, H = figH(T, h.boss), x = g[0] + sm, feet = g[1], top = feet - H, mid = feet - H * 0.48, W = H * 0.36;
    if (h.path.length && h.state !== 'boss') {
      ctx.fillStyle = h.T.color; ctx.globalAlpha = 0.45;
      h.path.slice(0, 6).forEach((t, k) => { const q = W2S(t[0] + 0.5, t[1] + 0.5, 0); ctx.beginPath(); ctx.ellipse(q[0], q[1], Math.max(1.5, T * (0.07 - k * 0.007)), Math.max(1, T * (0.07 - k * 0.007) * SP), 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    // on the ground: the shadow and the rings (slowed, alone, near death, disarming)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(x, feet, W * 0.95, W * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    const ring = (color, w, dash, a0, a1, k) => { ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.ellipse(x, feet, W * (k || 1.25), W * (k || 1.25) * 0.38, 0, a0 || 0, a1 === undefined ? Math.PI * 2 : a1); ctx.stroke(); if (dash) ctx.setLineDash([]); };
    if (fl.time < h.slowUntil) ring('#a9c6ff', 2);
    if (h.split && fl.phase === 'raid') ring(inG2(h) ? 'rgba(232,178,106,0.9)' : 'rgba(140,224,200,0.85)', 1.5, [2, 3], 0, Math.PI * 2, 1.5);   // 1.16: away on purpose (a scout)
    else if (h.alone && fl.phase === 'raid') ring('rgba(255,179,92,0.85)', 1.5, [4, 3], 0, Math.PI * 2, 1.5);
    if (h.escort && !h.crystal && !h.fleeing && fl.phase === 'raid' && carrierOf()) ring('rgba(255,214,120,0.4)', 1.5, null, 0, Math.PI * 2, 1.75);   // 1.22: the carrier's escort (a faint gold ring)
    if (h.hp / h.max < 0.3 && h.state !== 'rest') ring('rgba(255,90,90,' + (0.55 + 0.4 * Math.sin(realNow * 12)).toFixed(2) + ')', 2, null, 0, Math.PI * 2, 1.1);
    if (h.state === 'disarm') ring('#ffe066', 2.5, null, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - h.timer / h.dur), 1.4);
    else if (h.state === 'loot') ring('#c9c2b8', 2.5, null, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - h.timer / h.dur), 1.4);   // 1.20: searching a body
    if (litLantern(h)) {   // 1.20: a lit lantern: a warm circle on the floor, 1,5 tiles
      ctx.save(); ctx.translate(x, feet); ctx.scale(1, SP);
      const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, T * 1.5); lg.addColorStop(0, 'rgba(255,224,138,0.16)'); lg.addColorStop(1, 'rgba(255,224,138,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, 0, T * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (h.cursed) {   // a cursed treasure: a violet haze
      const g = ctx.createRadialGradient(x, mid, W * 0.4, x, mid, H * 0.75); g.addColorStop(0, 'rgba(180,140,255,0.45)'); g.addColorStop(1, 'rgba(180,140,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - H, mid - H, H * 2, H * 2);
    }
    if (fl.time < h.calmUntil) { ctx.fillStyle = 'rgba(195,178,255,0.22)'; ctx.beginPath(); ctx.ellipse(x, mid, W * 1.5, H * 0.62, 0, 0, Math.PI * 2); ctx.fill(); }   // amulet
    if (fl.time < h.sprintUntil) {   // boots: speed lines behind
      ctx.strokeStyle = 'rgba(232,194,122,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 0; k < 3; k++) { const yy = feet - H * (0.08 + 0.12 * k); ctx.moveTo(x - face * W * 1.3, yy); ctx.lineTo(x - face * W * 2.2, yy); }
      ctx.stroke();
    }
    // 1.07 (author: the 1.06 figurines did not fit dark fantasy): a pixel figure; a treasure hunter has a bag, a boss a crown
    const walking = h.nx !== null && fl.phase === 'raid' && !paused, PH = H * 1.15;
    if (h.hunter) { ctx.fillStyle = '#8a6a2c'; ctx.beginPath(); ctx.ellipse(x - face * W * 0.55, feet - H * 0.4, Math.max(2.5, H * 0.09), Math.max(3, H * 0.11), 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - face * W * 0.55 - 1, feet - H * 0.5, 2, H * 0.06); }
    const fo = { flash: h.flash > 0, walk: walking && !h.sliding, seed: h.id }, ki = (realNow - (h.inR || -9)) / 0.36, q = h.flash > 0 ? clamp(h.flash / 0.12, 0, 1) : 0;
    if (ki < 1 && !reduceMotion) { const s = 0.35 + 0.65 * easeOutBack(clamp(ki, 0, 1)); fo.kx = s; fo.ky = s; fo.alpha = clamp(ki * 2.5, 0, 1); }   // 1.09: pops in where it enters
    else if (q) { fo.kx = 1 + 0.12 * q; fo.ky = 1 - 0.1 * q; }   // 1.09: a hit squashes it for a moment
    if (h.sliding && !reduceMotion) {   // 1.10: on the ice: leaning back, arms out, a spray of ice behind
      fo.rot = -face * 0.2; ctx.fillStyle = 'rgba(225,245,255,0.7)';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x - face * W * (0.9 + 0.35 * k), feet - H * (0.02 + 0.05 * ((k + Math.floor(realNow * 12)) % 2)), Math.max(1, H * 0.035), 0, Math.PI * 2); ctx.fill(); }
    }
    const ph = drawPixelFigure(h.type, x, feet, PH, face, fo);
    if (h.boss) { const cy = feet - ph * (h.type === 'mage' ? 0.98 : 0.86), cs = Math.max(3, H * 0.12); ctx.fillStyle = '#d9b44a'; ctx.beginPath(); ctx.moveTo(x - cs, cy); ctx.lineTo(x - cs, cy - cs * 0.9); ctx.lineTo(x - cs * 0.4, cy - cs * 0.45); ctx.lineTo(x, cy - cs * 1.1); ctx.lineTo(x + cs * 0.4, cy - cs * 0.45); ctx.lineTo(x + cs, cy - cs * 0.9); ctx.lineTo(x + cs, cy); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(30,20,10,0.7)'; ctx.lineWidth = 1; ctx.stroke(); }
    if (fl.time < h.burnUntil) { ctx.fillStyle = h.burnBy === 'spikes' ? (Math.sin(realNow * 12) > 0 ? '#d8434f' : '#ff6b6b') : Math.sin(realNow * 20) > 0 ? '#ff9a3c' : '#ffd27a';   // 1.17.1: bleeding is red, not a flame
      ctx.beginPath(); ctx.arc(x + face * W * 0.5, mid - H * 0.12, Math.max(2.5, H * 0.07), 0, Math.PI * 2); ctx.fill(); }
    if (fl.time < h.wardUntil) {   // talisman ward around the body
      ctx.strokeStyle = 'rgba(127,184,255,' + (0.6 + 0.3 * Math.sin(realNow * 12)).toFixed(2) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, mid, W * 1.45, H * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (h.type === 'warrior' && fl.time < h.shieldUpUntil) {   // the raised shield: an arc in front
      ctx.strokeStyle = '#7fb8ff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x + face * W * 0.2, mid, W * 1.6, H * 0.55, 0, face > 0 ? -Math.PI * 0.4 : Math.PI * 0.6, face > 0 ? Math.PI * 0.4 : Math.PI * 1.4); ctx.stroke();
    }
    // above the head: health, fear, ward, faith
    const bw = Math.max(T * 0.56, H * 0.62), bh = Math.max(2, T * 0.07), b0 = top - 4 - bh * 2;
    hpBar(x, b0, bw, h.hp / h.max, h.hp / h.max > 0.35 ? '#6fd38a' : '#ff6b6b', T);
    hpBar(x, b0 + bh + 1, bw, h.fear / (h.courage * (fl.fearless ? 1.3 : 1)), '#b48cff', T);   // fear: full bar = runs away
    if (h.shield > 0) hpBar(x, b0 - bh - 1, bw, h.shield / h.max, '#7fb8ff', T);
    if (h.type === 'priest' && h.faithMax) hpBar(x, b0 + 2 * (bh + 1), bw, h.faith / h.faithMax, '#ffe9a8', T);   // faith
    // the level beside the head, in the colour of the rank
    ctx.font = numFont(Math.max(10, H * 0.34), true); ctx.textAlign = face > 0 ? 'right' : 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeText(String(h.lvl), x - face * W * 0.95, top + H * 0.22); ctx.fillStyle = h.R.color; ctx.fillText(String(h.lvl), x - face * W * 0.95, top + H * 0.22);
    if (h.crystal) crystalShape(x + face * W * 1.2, mid, Math.max(3, H * 0.1), '#ff9ab0');
    if (h.gold > 0) {   // a purse at the belt
      const gx = x - face * W * 0.95, gy = feet - H * 0.3;
      ctx.fillStyle = '#f2b94b'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(gx, gy, Math.max(2.5, H * 0.07), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (h.gold > 1) { ctx.fillStyle = '#ffe9a8'; ctx.font = numFont(Math.max(9, H * 0.26), true); ctx.textAlign = face > 0 ? 'right' : 'left'; ctx.fillText(String(h.gold), gx - face * 4, gy); }
    }
    if (h.fleeing) {
      ctx.fillStyle = '#c3b2ff'; ctx.font = numFont(Math.max(11, H * 0.4), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(face > 0 ? '»' : '«', x + face * W * 1.5, mid + Math.sin(realNow * 10) * 2);
    }
    if (h.inv.length && T >= 14) {   // the pack: one square per item under the feet, in its colour; a power on cooldown is dimmed
      const q = Math.max(3, T * 0.1), n = Math.min(6, h.inv.length), x0 = x - (n * (q + 2) - 2) / 2;
      h.inv.slice(0, 6).forEach((it, k) => {
        ctx.globalAlpha = (fl.time < (it.cdUntil || 0) || it.charges === 0 || (it.type === 'lantern' && fl.time < (it.outUntil || 0)) ? 0.35 : 1) * (it.cursed ? 0.8 + 0.2 * Math.sin(realNow * 6) : 1);
        ctx.fillStyle = it.cursed ? '#b48cff' : ITEM_COLOR[it.type] || rarColor(it.r); ctx.fillRect(x0 + k * (q + 2), feet + W * 0.4, q, q);
        if (HITEMS[it.type].tool) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(x0 + k * (q + 2) - 0.5, feet + W * 0.4 - 0.5, q + 1, q + 1); }   // 1.20: a tool
        else if (it.r >= 2) { ctx.strokeStyle = rarColor(it.r); ctx.lineWidth = 1; ctx.strokeRect(x0 + k * (q + 2) - 0.5, feet + W * 0.4 - 0.5, q + 1, q + 1); }
      });
      ctx.globalAlpha = 1;
      if (burden(h) < 1) { ctx.fillStyle = '#c9c2b8'; ctx.font = numFont(Math.max(8, q * 1.6), true); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('▼', x0 + n * (q + 2) + 1, feet + W * 0.4 + q / 2); }   // 1.20: too heavy, he slows down
    }
    // a sign above the bars: panic, lost, talking, resting
    const sign = (t, color, size, wob) => { ctx.fillStyle = color; ctx.font = numFont(Math.max(10, size), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, b0 - 8 - (h.shield > 0 ? bh + 1 : 0) + wob); };
    if (fl.time < h.panicUntil) sign('!!', '#ff6b6b', H * 0.4, Math.sin(realNow * 14) * 1.5);
    else if (h.lost) sign('?', '#ffe066', H * 0.42, Math.sin(realNow * 5) * 1.5);
    else if (h.state === 'talk') sign('...', '#e8dfc8', H * 0.32, 0);
    else if (h.state === 'rest') sign('z', '#c9c2d8', H * 0.32, Math.sin(realNow * 3) * 2);
  }
  function drawParticles(T, flat) {   // 1.07: rings lie on the floor (floor pass), sparks fly upright (second pass)
    particles.forEach(p => {
      if (!!p.ring !== !!flat) return;
      ctx.globalAlpha = clamp(p.life * 2.2, 0, 1);
      if (p.ring) { ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(2, T * 0.08); ctx.beginPath(); ctx.arc(p.x * T, p.y * T, p.r * T, 0, Math.PI * 2); ctx.stroke(); }
      else { const q = W2S(p.x, p.y, 0.35); ctx.fillStyle = p.color; ctx.fillRect(q[0] - T * 0.04, q[1] - T * 0.04, T * 0.08, T * 0.08); }
    });
    ctx.globalAlpha = 1;
  }
  function drawFloats(T) {   // 1.07: a number rises straight up from its spot of the floor
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    floats.forEach(f => {
      const q = W2S(f.x, f.gy, 0), x = q[0], y = q[1] - f.lift * T * 0.9;
      ctx.globalAlpha = clamp(f.life / 0.5, 0, 1);
      ctx.font = numFont(Math.max(11, f.size * T / 52), true);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.9)'; ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
    });
    ctx.globalAlpha = 1;
  }
  // Party panel in screen space: who is in the dungeon, how hurt, how scared, who carries the crystal.
  // Folded (default): one row of chips with HP and fear bars. Unfolded: the full list with gear. A tap switches.
  function heroGlyph(hh) { return hh.dead ? '†' : hh.fled ? (hh.fleeing ? '»' : '↑') : hh.crystal ? '◆' : hh.gone ? '↓' : hh.state === 'caged' ? '#' : hh.state === 'rest' ? 'z' : hh.lost ? '?' : hh.fleeing ? '»' : (hh.panicUntil > fl.time) ? '!' : hh.split ? '›' : hh.alone ? 's' : ''; }
  function drawChips(list, label) {
    const cwid = 25, pad = 5, n = list.length, w = Math.min(cw - 12, pad * 2 + n * cwid + 12), h = 30;
    ctx.fillStyle = 'rgba(10,11,13,0.8)'; rr(6, 6, w, h, 3); ctx.fill();
    list.forEach((hh, k) => {
      const x = 6 + pad + k * cwid + 9, y = 6 + 11;
      ctx.globalAlpha = hh.queued ? 0.5 : (hh.dead || hh.fled ? 0.4 : 1);
      ctx.fillStyle = hh.T.color; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hh.boss ? '#ff8a3c' : hh.R.color; ctx.lineWidth = hh.boss ? 2.4 : 1.6; ctx.stroke();
      drawClassIcon(hh.type || (hh.e && hh.e.type), x, y, 10.5, '#1a1424');
      ctx.fillStyle = hh.R.color; ctx.font = numFont(8, true); ctx.textAlign = 'left'; ctx.fillText(String(hh.lvl), x + 7, y - 4);
      if (hh.hp !== undefined && fl.phase === 'raid') {
        const frac = clamp(hh.hp / hh.max, 0, 1), bw = 18, bx = x - 9, by = y + 9;
        ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(bx, by, bw, 3);
        ctx.fillStyle = hh.dead ? '#6b5560' : frac > 0.35 ? '#6fd38a' : '#ff6b6b'; ctx.fillRect(bx, by, bw * frac, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx, by + 4, bw, 2);
        ctx.fillStyle = '#b48cff'; ctx.fillRect(bx, by + 4, bw * clamp(hh.fear / hh.courage, 0, 1), 2);
      }
      const g = fl.phase === 'raid' ? heroGlyph(hh) : '';
      if (g) { ctx.globalAlpha = 1; ctx.fillStyle = hh.crystal ? '#ff9ab0' : '#fff'; ctx.font = numFont(10, true); ctx.textAlign = 'center'; ctx.fillText(g, x, y - 10); }
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = '#8e939a'; ctx.font = numFont(10, true); ctx.textAlign = 'center'; ctx.fillText('▾', 6 + w - 9, 6 + h / 2);
    uiRects.list = { x: 6, y: 6, w, h };
    return h;
  }
  function drawParty() {
    const list = fl.heroes.filter(h => !h.dead && !h.fled).concat(fl.queue.map(e => ({ e, T: HEROES[e.type], R: levelStats(e.lvl), lvl: e.lvl, boss: e.boss, queued: true, hp: e.hp, max: e.max, inv: e.inv, fear: 0, courage: 1 })))
      .concat(fl.heroes.filter(h => h.dead || h.fled));
    if (!list.length) { uiRects.list = null; return; }
    if (!UI.listOpen) { drawChips(list); return; }
    const w = 108, rowH = 19, h = list.length * rowH + 8;
    uiRects.list = { x: 6, y: 6, w: w + 4, h };
    uiRects.rows = list.map((hh, k) => ({ y0: 10 + k * rowH - 2, y1: 10 + (k + 1) * rowH - 2, ref: hh.queued ? { entry: hh.e } : { id: hh.id } }));
    ctx.fillStyle = 'rgba(10,11,13,0.78)'; rr(6, 6, w, h, 3); ctx.fill();
    list.forEach((hh, k) => {
      const y = 10 + k * rowH;
      ctx.globalAlpha = hh.queued ? 0.45 : (hh.dead || hh.fled ? 0.5 : 1);
      ctx.fillStyle = hh.T.color; ctx.beginPath(); ctx.arc(16, y + 6, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hh.R.color; ctx.lineWidth = 1.6; ctx.stroke();
      drawClassIcon(hh.type || (hh.e && hh.e.type), 16, y + 6, 9.5, '#1a1424');
      const frac = clamp(hh.hp / hh.max, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(25, y + 2, 48, 5);
      ctx.fillStyle = hh.dead ? '#6b5560' : frac > 0.35 ? '#6fd38a' : '#ff6b6b'; ctx.fillRect(25, y + 2, 48 * frac, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(25, y + 8, 48, 3);
      ctx.fillStyle = '#b48cff'; ctx.fillRect(25, y + 8, 48 * clamp(hh.fear / hh.courage, 0, 1), 3);
      ctx.fillStyle = '#c9c2d8'; ctx.font = numFont(9); ctx.textAlign = 'left';
      const st = heroGlyph(hh);
      ctx.fillStyle = hh.crystal ? '#ff9ab0' : '#c9c2d8'; ctx.fillText(st, 78, y + 6);
      ctx.fillStyle = hh.R.color; ctx.font = numFont(9, true); ctx.textAlign = 'right'; ctx.fillText(String(hh.lvl), w + 2, y + 6); ctx.textAlign = 'left';
      (hh.inv || []).slice(0, 8).forEach((it, j) => { ctx.globalAlpha = (hh.queued ? 0.45 : 1) * (fl.time < (it.cdUntil || 0) || it.charges === 0 ? 0.35 : 1); ctx.fillStyle = ITEM_COLOR[it.type] || rarColor(it.r); ctx.fillRect(25 + j * 6, y + 13, 4, 3); });
      ctx.globalAlpha = hh.queued ? 0.45 : (hh.dead || hh.fled ? 0.5 : 1);
      if (hh.gold > 0) { ctx.fillStyle = '#f2b94b'; ctx.font = numFont(8, true); ctx.textAlign = 'left'; ctx.fillText('◉' + hh.gold, 78, y + 14); }
      if (hh.cursed) { ctx.fillStyle = '#b48cff'; ctx.font = numFont(8, true); ctx.textAlign = 'left'; ctx.fillText('✶', 92, y + 14); }
      if (hh.type === 'priest' && hh.faithMax && !hh.queued) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(75, y + 10, 20, 2); ctx.fillStyle = '#ffe9a8'; ctx.fillRect(75, y + 10, 20 * clamp(hh.faith / hh.faithMax, 0, 1), 2); }
      ctx.globalAlpha = 1;
    });
  }
  // Prototype 1.0: the souls fly out of the map and land in the big number at the top (on a canvas over the whole page)
  let fxc = null, fxDirty = false;
  // trail, glow, core; each in the colour of the box it flies to (1.10: gold Chciwość, ice-blue Combo)
  const ORB_INK = { score: ['rgba(255,90,100,0.38)', 'rgba(255,70,85,0.32)', '#ffe0e3'], heart: ['rgba(255,90,100,0.38)', 'rgba(255,70,85,0.32)', '#ffe0e3'],
    groza: ['rgba(170,150,245,0.55)', 'rgba(160,135,245,0.42)', '#ece6ff'], greed: ['rgba(236,200,120,0.6)', 'rgba(240,190,80,0.4)', '#fff4d6'], combo: ['rgba(169,212,218,0.6)', 'rgba(140,210,222,0.4)', '#effcff'] };
  function drawOrbs() {
    const c = $('#fx'); if (!c) return;
    const W = innerWidth, H = innerHeight;
    if (c.width !== Math.round(W * DPR) || c.height !== Math.round(H * DPR)) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); fxDirty = true; }
    if (!orbs.length && !fxDirty) return;
    if (!fxc) fxc = c.getContext('2d');
    fxc.setTransform(DPR, 0, 0, DPR, 0, 0); fxc.clearRect(0, 0, W, H); fxDirty = orbs.length > 0;
    if (!orbs.length) return;
    const cr = cv.getBoundingClientRect(), R = id => $(id).getBoundingClientRect(), sr = R('#h-score'), hr = R('#h-heart'), gr = R('#eq-g'), kr = R('#eq-c'), mr = R('#eq-k');
    const mid = r => [r.left + r.width / 2, r.top + r.height / 2];
    const TG = { score: mid(sr), heart: hr.width ? mid(hr) : mid(sr), groza: gr.width ? mid(gr) : mid(sr), greed: kr.width ? mid(kr) : mid(sr), combo: mr.width ? mid(mr) : mid(sr) };
    const at = (o, u) => {
      const [tx, ty] = TG[o.to] || TG.score;
      const ox = o.ax != null ? o.ax : o.x + cr.left, oy = o.ay != null ? o.ay : o.y + cr.top;
      const e = u * u * (3 - 2 * u), cx = ox + (tx - ox) * 0.2, cy = Math.min(oy, ty) - (o.ax != null ? 18 : 40);
      return [(1 - e) * (1 - e) * ox + 2 * (1 - e) * e * cx + e * e * tx, (1 - e) * (1 - e) * oy + 2 * (1 - e) * e * cy + e * e * ty];
    };
    orbs.forEach(o => {
      if (o.t < 0) return;   // a cashed-in chain lets its orbs go one after another
      const u = clamp(o.t / o.dur, 0, 1), [x, y] = at(o, u), [x2, y2] = at(o, Math.max(0, u - 0.08)), c = ORB_INK[o.to] || ORB_INK.score;
      fxc.strokeStyle = c[0]; fxc.lineWidth = 3; fxc.lineCap = 'round'; fxc.beginPath(); fxc.moveTo(x2, y2); fxc.lineTo(x, y); fxc.stroke();
      fxc.fillStyle = c[1]; fxc.beginPath(); fxc.arc(x, y, 7, 0, Math.PI * 2); fxc.fill();
      fxc.fillStyle = c[2]; fxc.beginPath(); fxc.arc(x, y, 2.6, 0, Math.PI * 2); fxc.fill();
    });
  }
  // Prototype 1.02: the skill check in the game's own look: a stone slab with an iron edge, cut corners and rivets, a gothic
  // title, a bone bead, a moss-green graze, a blood-red crit that glows, brass for the "Uwaga!" moment. Logic unchanged.
  const CK = { zone: '#ece6da', blood: '#d23a48', slab0: '#1d1f24', slab1: '#111216', iron: '#464b53', mortar: '#2b2e34', edge: 'rgba(210,220,235,0.07)', rivet: '#5d6168',
    track: '#0a0b0d', trackEdge: '#2b2e34', g0: '#86ad62', g1: '#4c6b34', r0: '#ef5a66', r1: '#8c1a24', glow: 'rgba(255,244,225,0.75)',
    bone: '#e6e1d6', ash: '#8e939a', brass: '#c4a052', brassHi: '#e6cf94', violet: '#d9ccff', ember: '#e0643c' };
  const ckGrad = (x0, y0, x1, y1, a, b) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  function ckCut(x, y, w, h, k) {   // a rectangle with the corners cut off, like the slabs in the interface
    ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + w - k, y); ctx.lineTo(x + w, y + k); ctx.lineTo(x + w, y + h - k); ctx.lineTo(x + w - k, y + h);
    ctx.lineTo(x + k, y + h); ctx.lineTo(x, y + h - k); ctx.lineTo(x, y + k); ctx.closePath();
  }
  function ckSlab(x, y, w, h) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    ctx.fillStyle = ckGrad(0, y, 0, y + h, CK.slab0, CK.slab1); ckCut(x, y, w, h, 5); ctx.fill(); ctx.restore();
    ctx.strokeStyle = CK.iron; ctx.lineWidth = 1; ckCut(x + 0.5, y + 0.5, w - 1, h - 1, 5); ctx.stroke();
    ctx.strokeStyle = CK.edge; ctx.beginPath(); ctx.moveTo(x + 6, y + 1.5); ctx.lineTo(x + w - 6, y + 1.5); ctx.stroke();
    ctx.fillStyle = CK.rivet; [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]].forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 1.4, 0, Math.PI * 2); ctx.fill(); });
  }
  // graze = moss, crit = blood with a glow
  function ckGlow(f) { ctx.save(); ctx.shadowColor = CK.glow; ctx.shadowBlur = 9; f(); ctx.restore(); }
  function drawCheck(T) {
    const c = fl && fl.check;
    if (!c || fl.phase !== 'raid') return;
    const it = c.it, all = [it].concat(c.extra || []);
    if (!c.result) { ctx.fillStyle = 'rgba(4,5,7,0.36)'; ctx.fillRect(0, 0, cw, ch); }
    withViews(splitViews(), T => all.forEach((o, k) => {   // the main trap gets a bone ring, the rest of the volley a dashed brass one
      const a = itemAnchor(o), ox = clamp(a[0], 10, cw - 10), oy = clamp(a[1], 10, ch - 10), R = Math.max(12, T * (k ? 0.6 : 0.75));
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = k ? 'rgba(196,160,82,0.9)' : 'rgba(230,225,214,0.95)'; ctx.lineWidth = 1.6; if (k) ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }));
    // 1.12.1 (author: on a phone the thumb covered the check): the check sits at the TOP of the map, under the party chips
    // (and under the tutorial coach when it is up there). The map is tapped anywhere, so the thumb taps lower down and the
    // bead stays in sight. (It sat at the bottom of the map from 1.02 to 1.12.1.)
    const legend = run.checkHints >= 0 && fl.stats.checks <= 3, coach = $('#coach');
    const coachB = coach && !coach.hidden && coach.classList.contains('top') ? coach.offsetTop + coach.offsetHeight : 0;
    const CHIPS_B = 36;   // the party chips: 6 px from the top, 30 px tall (drawChips)
    const label = { crit: 'Krytyk!', ok: 'Draśnięcie', miss: 'Pudło', skip: 'Odpuszczone' }[c.result];
    const labelCol = { crit: CK.zone, ok: '#b9b3a6', miss: CK.ash, skip: CK.ash }[c.result];
    const prep = !c.result && realNow < c.t0;
    const nm = ITEMS[it.type].name + (all.length > 1 ? ' + ' + (all.length - 1) : '');
    const head = prep ? 'Uwaga: ' + (all.length > 1 ? 'seria (' + all.length + ')' : ITEMS[it.type].name.toLowerCase()) + '!' : nm + (label ? ': ' : ': stuknij!');
    const LEG = 'obwódka: draśnięcie · pełne pole: krytyk (najmocniej) · ☠ zabije';
    const TF = '700 17px "Grenze Gotisch", Georgia, serif', SF = w8 => w8 + ' 11px "Alegreya Sans", system-ui, sans-serif';
    const title = (x, y, align, maxW) => {   // the gothic title; a result gets its own colour after the name
      ctx.font = TF; ctx.textBaseline = 'middle';
      const w1 = ctx.measureText(head).width, w2 = label ? ctx.measureText(label).width : 0, tot = w1 + w2;
      let x0 = align === 'center' ? x - Math.min(tot, maxW) / 2 : x;
      ctx.textAlign = 'left'; ctx.fillStyle = prep ? CK.brassHi : CK.bone; ctx.fillText(head, x0, y, label ? maxW * (w1 / tot) : maxW);
      if (label) { ctx.fillStyle = labelCol; if (c.result === 'crit') ckGlow(() => ctx.fillText(label, x0 + Math.min(w1, maxW * (w1 / tot)), y)); else ctx.fillText(label, x0 + Math.min(w1, maxW * (w1 / tot)), y); }
    };
    // 1.02 (author: "pretty, but not consistent: they should look the same and differ only in shape"): every shape uses the
    // same parts. One slab, the title on the left and the party on the right, the legend under it; one groove TW wide with an
    // iron edge; moss graze and blood crit drawn the same way; the skull sits on the zone it kills in; one bone bead rides
    // the groove. Only the groove's path differs: a line, a wavy fuse, a hanging arc, a circle, a spiral, a closing pulse.
    const TW = 14, w = Math.min(320, cw - 28), DR = clamp(Math.min(cw, ch) * 0.12, 40, 52), pulse = c.shape === 'pulse';
    const path = ckPath(c.shape, c.rot || 0, w, DR, TW);   // q in 0..1 -> [x, y] in local coordinates
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    if (pulse) { x0 = y0 = -DR - TW / 2; x1 = y1 = DR + TW / 2; }
    else for (let k = 0; k <= 96; k++) { const q = path(k / 96); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const pad = pulse ? 3 : TW / 2, headH = 26, stageH = (y1 - y0) + 2 * pad + 12, footH = legend ? 18 : 6, boxH = headH + stageH + footH;
    const top = Math.max(8, Math.min(Math.max(CHIPS_B + 6, coachB + 8), ch - 10 - boxH));   // never past the bottom on a short screen
    const bx = (cw - w) / 2, ox = cw / 2 - (x0 + x1) / 2, oy = top + headH + 6 + pad - y0;
    const P = q => { const a = path(q); return [a[0] + ox, a[1] + oy]; };
    c.box = { x: bx - 10, y: top, w: w + 20, h: boxH };
    ckSlab(bx - 10, top, w + 20, boxH);
    title(bx, top + 14, 'left', c.note ? w - 90 : w);
    if (c.note) { ctx.fillStyle = CK.violet; ctx.font = SF('600'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(c.note.replace(/^ · /, ''), bx + w, top + 14); ctx.textAlign = 'left'; }
    if (prep) {   // shrinking brass line = time left before the bead starts
      const left = clamp((c.t0 - realNow) / CHECK_PREP, 0, 1);
      ctx.fillStyle = CK.brass; ctx.fillRect(bx + w - 70 * left, top + 24, 70 * left, 2);
    }
    const p = clamp(c.result ? (c.p !== undefined ? c.p : 1) : checkPos(c, (realNow - c.t0) / c.dur), 0, 1);
    const Z = [{ g0: c.g0, g1: c.g1, r0: c.r0, r1: c.r1 }].concat(c.z2 ? [c.z2] : []);
    // 1.04 (author: like Dead by Daylight; a tester never once aimed at the red): a graze is a pale OUTLINE, a crit a pale
    // FILLED strip that glows. No colour has to be learnt, and it reads the same for colour-blind players.
    const ZC = CK.zone, critGlow = f => { ctx.save(); ctx.shadowColor = 'rgba(255,244,225,0.8)'; ctx.shadowBlur = 10; f(); ctx.restore(); };
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    if (pulse) {   // the groove is a disc; zones are rings; the bead sits on a ring that closes in
      const [cx, cy] = P(1), RM = DR + TW / 2 - 1, rad = q => RM * (1 - q);
      const band = (q0, q1, col) => { const ro = rad(q0), ri = rad(q1); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, ro), 0, Math.PI * 2); ctx.arc(cx, cy, Math.max(0, ri), 0, Math.PI * 2, true); ctx.fill(); };
      const rim = q => { ctx.strokeStyle = ZC; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, rad(q) + (q < 0.5 ? -1 : 1)), 0, Math.PI * 2); ctx.stroke(); };
      ctx.fillStyle = CK.track; ctx.beginPath(); ctx.arc(cx, cy, RM, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = CK.trackEdge; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, RM + 1, 0, Math.PI * 2); ctx.stroke();
      Z.forEach(z => { rim(z.g0); rim(z.g1); critGlow(() => band(z.r0, z.r1, ZC)); });
    } else {
      const N = c.shape === 'bar' ? 2 : 180;
      const run = (q0, q1, col, lw) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        const n = Math.max(2, Math.ceil((q1 - q0) * N));
        for (let k = 0; k <= n; k++) { const q = P(q0 + (q1 - q0) * k / n); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
        ctx.stroke();
      };
      const cap = q => {   // the end of an outlined strip: a short line across the groove
        const a = P(Math.max(0, q - 0.002)), b = P(Math.min(1, q + 0.002)), m = P(q), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const nx = -(b[1] - a[1]) / L * TW / 2, ny = (b[0] - a[0]) / L * TW / 2;
        ctx.strokeStyle = ZC; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m[0] + nx, m[1] + ny); ctx.lineTo(m[0] - nx, m[1] - ny); ctx.stroke();
      };
      run(0, 1, CK.trackEdge, TW + 2); run(0, 1, CK.track, TW);
      Z.forEach(z => {
        run(z.g0, z.g1, ZC, TW); run(z.g0, z.g1, CK.track, TW - 4); cap(z.g0 + 0.0005); cap(z.g1 - 0.0005);
        critGlow(() => run(z.r0, z.r1, ZC, TW));
      });
    }
    // the skull on the zone it kills in (on the groove, the same for every shape)
    ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const skull = q => { const a = P(q); ctx.lineWidth = 2.5; ctx.strokeStyle = CK.zone; ctx.strokeText('☠', a[0], a[1] + 0.5); ctx.fillStyle = '#0b0c0e'; ctx.fillText('☠', a[0], a[1] + 0.5); };   // dark with a pale rim: seen on the filled strip and on the groove
    Z.forEach(z => { if (c.lethalOk) skull((z.g0 + z.g1) / 2); if (c.lethalCrit) skull((z.r0 + z.r1) / 2); });
    // the blood-red bead (dim while "Uwaga!" counts down) stands out on the pale strips; the pulse also draws its ring
    const bead = P(p), col = prep ? 'rgba(210,58,72,0.45)' : CK.blood;
    ctx.save(); if (!prep) { ctx.shadowColor = 'rgba(255,60,75,0.7)'; ctx.shadowBlur = 9; }
    if (pulse) {
      const [cx, cy] = P(1), r = Math.max(1, cy - bead[1]);
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.beginPath(); ctx.arc(bead[0], bead[1], TW / 2 + 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bead[0], bead[1], TW / 2 + 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,225,228,0.9)'; ctx.beginPath(); ctx.arc(bead[0], bead[1], 1.6, 0, Math.PI * 2); ctx.fill();   // its centre: the exact spot
    ctx.lineJoin = 'miter';
    if (legend) {
      ctx.fillStyle = CK.ash; ctx.font = SF('500'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(LEG, bx, top + boxH - 11, w);
    }
  }
  // the groove of each check shape, q in 0..1 along it (local coordinates; drawCheck centres it)
  function ckPath(shape, rot, w, R, TW) {
    if (shape === 'bar') return q => [-w / 2 + TW / 2 + (w - TW) * q, 0];   // one pass, left to right
    if (shape === 'fuse') { const L = w - TW; return q => [-L / 2 + L * q, 7 * Math.sin(q * Math.PI * 4)]; }   // a wavy fuse; the bead speeds up
    if (shape === 'swing') { const RS = R * 1.45, A = 1.1; return q => { const a = Math.PI / 2 + A - 2 * A * q; return [Math.cos(a) * RS, Math.sin(a) * RS]; }; }   // a hanging arc, there and back
    if (shape === 'spiral') return q => { const a = rot + q * Math.PI * 4, r = R * 1.2 * (1 - 0.74 * q); return [Math.cos(a) * r, Math.sin(a) * r]; };   // inward, two turns
    if (shape === 'pulse') return q => [0, -(R + TW / 2 - 1) * (1 - q)];   // the top of the closing ring
    return q => { const a = rot - Math.PI / 2 + q * Math.PI * 2; return [Math.cos(a) * R, Math.sin(a) * R]; };   // ring and double: once around
  }

  function drawNextWave() {
    const list = run.next || [];
    if (!list.length) { uiRects.list = null; return; }
    if (!UI.listOpen) {
      const hh = drawChips(list.map(e => ({ type: e.type, T: HEROES[e.type], R: levelStats(e.lvl), lvl: e.lvl, boss: e.boss })));
      if (fl.breach) { const fresh = run.layout.breach && run.layout.breach.fresh, bw = fresh ? 62 : 76; ctx.fillStyle = 'rgba(120,20,30,0.85)'; rr(6, 6 + hh + 4, bw, 18, 6); ctx.fill(); ctx.fillStyle = '#ffd0d0'; ctx.font = numFont(10, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fresh ? 'WYŁOM!' : 'WYŁOM otwarty', 6 + bw / 2, 6 + hh + 13); }
      return;
    }
    const w = 200, rowH = 15, h = list.length * rowH + 22 + (fl.breach ? rowH : 0);
    uiRects.list = { x: 6, y: 6, w, h };
    uiRects.rows = list.map((e, k) => ({ y0: 26 + k * rowH - 7, y1: 26 + (k + 1) * rowH - 7, ref: { entry: e } }));
    ctx.fillStyle = 'rgba(10,11,13,0.78)'; rr(6, 6, w, h, 3); ctx.fill();
    ctx.fillStyle = '#8e939a'; ctx.font = '600 10px "Alegreya Sans", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(waveName() + (bossOf(run.wave) ? (bossOf(run.wave) === 'final' ? ' · FINAŁ' : ' · boss') : '') + ':', 12, 15);
    ctx.textAlign = 'right'; ctx.fillText('▴', 6 + w - 6, 15); ctx.textAlign = 'left';
    list.forEach((e, k) => {
      const y = 26 + k * rowH, T0 = HEROES[e.type], R0 = levelStats(e.lvl);
      ctx.fillStyle = T0.color; ctx.beginPath(); ctx.arc(16, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = R0.color; ctx.lineWidth = 1.6; ctx.stroke();
      drawClassIcon(e.type, 16, y, 9.5, '#1a1424');
      ctx.fillStyle = R0.color; ctx.font = '600 10px "Alegreya Sans", system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(e.nm[0] + ' · poz. ' + e.lvl + ' ' + (e.boss ? BOSS_NAME[e.boss][e.female ? 1 : 0] : R0.name[e.female ? 1 : 0]).toLowerCase() + (e.returning ? ' · wraca' : e.hunter ? ' · łowca' : e.recruit ? ' · rekrut' : '') + (e.bond && list[e.bond.with] ? ' · ' + bondLabel(e.bond, list[e.bond.with]).toLowerCase() : '') + (e.phobia && ((e.known || []).includes('phobia') || mods.revealAll) ? ' · boi się: ' + PHOBIAS[e.phobia].name : ''), 25, y, w - 24);   // 1.21: the bond
    });
    if (fl.breach) { ctx.fillStyle = '#ff8a8a'; ctx.font = '700 10px "Alegreya Sans", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(run.layout.breach && run.layout.breach.fresh ? 'Wejdą przez wyłom! (czerwony znacznik)' : 'Wyłom otwarty: wybiorą wejście', 12, 26 + list.length * rowH, w - 16); }
  }
  function drawOffscreen(T) {
    uiRects.list = null;
    if (fl && fl.phase === 'build') { drawNextWave(); return; }
    if (!fl || fl.phase !== 'raid') return;
    drawParty();
    alive().forEach(h => {
      const p = heroPos(h), g = W2S(p.x, p.y, 0.6), sx = g[0], sy = g[1];
      if (sx >= 0 && sx <= cw && sy >= 0 && sy <= ch) return;
      const cx = clamp(sx, 12, cw - 12), cy = clamp(sy, 12, ch - 12), a = Math.atan2(sy - cy, sx - cx);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = h.T.color; ctx.strokeStyle = '#0a0b0c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-7, -7); ctx.lineTo(-7, 7); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
    });
  }

  // Speech bubbles in screen space, so they stay readable at any zoom; overlapping ones stack upwards.
  function wrapText(t, maxW) {
    const words = t.split(' '), lines = [];
    let cur = '';
    words.forEach(w => { const nx = cur ? cur + ' ' + w : w; if (ctx.measureText(nx).width > maxW && cur) { lines.push(cur); cur = w; } else cur = nx; });
    if (cur) lines.push(cur);
    return lines.slice(0, 2);
  }
  function drawBubbles(T) {
    if (!fl || fl.phase === 'build') return;
    // 1.08 (author: the bubbles did not fit the rest): a dark slab with an iron edge like the coach and the messages, the
    // speaker's colour as the stripe on its left, bone text (brass, with a brass edge, for the lines that matter), a tail in
    // steps like the pixel figures, and a thin thread down to the head when the bubble had to move up out of the way.
    ctx.font = '500 12px "Alegreya Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle';
    const boxes = [], seen = new Set(), o = 0.5, R = 3, TAIL = 6, ckBox = fl.check && fl.check.box;
    if (ckBox) boxes.push(ckBox);
    if (uiRects.list) boxes.push(uiRects.list);
    let shown = 0;
    alive().filter(h => h.bubble && h.bubble.until > fl.time).sort((a, b) => b.bubble.prio - a.bubble.prio).forEach(h => {
      if (shown >= 3 || seen.has(h.bubble.text)) return;
      seen.add(h.bubble.text); shown++;
      const bb = h.bubble, p = heroPos(h), g = W2S(p.x, p.y, 0), sx = Math.round(g[0]);
      const head = g[1] - figH(T, h.boss) - Math.max(2, T * 0.07) * 2 - 4;   // over the figure's head and bars
      if (sx < -40 || sx > cw + 40 || head < -40 || head > ch + 60) return;
      const lines = wrapText(bb.text, 150), lw = Math.max(...lines.map(l => ctx.measureText(l).width));
      const w = Math.round(lw + 19), hh = lines.length * 15 + 9;
      const inK = clamp((fl.time - bb.at) / 0.16, 0, 1), fade = clamp((bb.until - fl.time) / 0.3, 0, 1) * inK;
      const want = Math.round(head - 2 - TAIL - hh + (1 - inK) * 4);   // it rises 4 px as it comes in
      const bx = Math.round(clamp(sx - w / 2, 4, cw - w - 4));
      let by = clamp(want, 4, ch - hh - TAIL - 4);
      for (let k = 0; k < 6; k++) {
        const hit = boxes.find(b => bx < b.x + b.w && bx + w > b.x && by < b.y + b.h && by + hh + TAIL > b.y);
        if (!hit) break;
        // 1.12.1: the check is at the top now, so a line under it goes below it (not up and off the screen)
        by = hit === ckBox && hit.y + hit.h + 3 + hh + TAIL <= ch - 4 ? hit.y + hit.h + 3 : hit.y - hh - TAIL - 3;
      }
      by = Math.round(by);
      boxes.push({ x: bx, y: by, w, h: hh + TAIL });
      const big = bb.prio >= 3, B = by + hh, tx = Math.round(clamp(sx, bx + 10, bx + w - 8));
      ctx.globalAlpha = fade;
      if (by < want - 6 && head > B + TAIL + 4) {   // pushed up: a thread to the speaker
        ctx.strokeStyle = 'rgba(120,126,136,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(tx + o, B + TAIL); ctx.lineTo(sx + o, head); ctx.stroke();
      }
      // the slab and its stepped tail, one outline
      const L = bx + o, Rr = bx + w - o, Tp = by + o, Bt = B - o;
      ctx.beginPath();
      ctx.moveTo(L + R, Tp); ctx.lineTo(Rr - R, Tp); ctx.arcTo(Rr, Tp, Rr, Tp + R, R);
      ctx.lineTo(Rr, Bt - R); ctx.arcTo(Rr, Bt, Rr - R, Bt, R);
      ctx.lineTo(tx + 4 + o, Bt); ctx.lineTo(tx + 4 + o, Bt + 2); ctx.lineTo(tx + 2 + o, Bt + 2); ctx.lineTo(tx + 2 + o, Bt + 4);
      ctx.lineTo(tx + 1 + o, Bt + 4); ctx.lineTo(tx + 1 + o, Bt + TAIL); ctx.lineTo(tx - 1 + o, Bt + TAIL); ctx.lineTo(tx - 1 + o, Bt + 4);
      ctx.lineTo(tx - 2 + o, Bt + 4); ctx.lineTo(tx - 2 + o, Bt + 2); ctx.lineTo(tx - 4 + o, Bt + 2); ctx.lineTo(tx - 4 + o, Bt);
      ctx.lineTo(L + R, Bt); ctx.arcTo(L, Bt, L, Bt - R, R); ctx.lineTo(L, Tp + R); ctx.arcTo(L, Tp, L + R, Tp, R); ctx.closePath();
      ctx.fillStyle = 'rgba(16,17,21,0.95)'; ctx.fill();
      ctx.strokeStyle = big ? '#8a7034' : '#464b53'; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); rr(bx, by, w, hh, R); ctx.clip();
      ctx.fillStyle = 'rgba(210,220,235,0.07)'; ctx.fillRect(bx, by + 1, w, 1);   // the light on the top edge of a slab
      ctx.fillStyle = h.T.color; ctx.fillRect(bx, by, 3, hh);   // who speaks
      ctx.restore();
      ctx.fillStyle = big ? '#e6cf94' : '#e6e1d6'; ctx.textAlign = 'left';
      lines.forEach((l, k) => ctx.fillText(l, bx + 10, by + 12 + k * 15));
      ctx.globalAlpha = 1;
    });
  }
  function drawPause() {   // 1.07: the open build tray is the pause: a small plate at the top says how to play on
    if (!paused || !fl || fl.phase !== 'raid') return;
    if (tutPopNow) return;   // 1.04: a tutorial card says it (and the check under it stays clear)
    const t = trayIsOpen() ? 'Pauza · ▼ Budowa: gramy dalej' : 'Pauza';
    ctx.font = '600 12px "Alegreya Sans", system-ui, sans-serif';
    const w = ctx.measureText(t).width + 22, x0 = (cw - w) / 2, y0 = 8;
    ctx.fillStyle = 'rgba(16,17,20,0.88)'; rr(x0, y0, w, 24, 3); ctx.fill();
    ctx.strokeStyle = '#5c4b28'; ctx.lineWidth = 1; rr(x0 + 0.5, y0 + 0.5, w - 1, 23, 3); ctx.stroke();
    ctx.fillStyle = '#e6cf94'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, cw / 2, y0 + 12.5);
  }

  // Build phase: what the next wave already knows from rumours (tinted floor, an eye on known traps, a hollow eye on false ones).
  function drawRumorTiles(x0, y0, x1, y1, T) {
    if (!run.rumor.tiles.size) return;
    ctx.fillStyle = 'rgba(180,140,255,0.10)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * WW + x;
      if (run.rumor.tiles.has(i) && (fl.tiles[i] === FLOOR || fl.tiles[i] === DOOR)) ctx.fillRect(x * T, y * T, T + 0.5, T + 0.5);
    }
  }
  function eyeIcon(cx, cy, r, filled) {
    ctx.strokeStyle = '#d6c8ff'; ctx.lineWidth = Math.max(1, r * 0.25);
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.quadraticCurveTo(cx, cy - r * 0.9, cx + r, cy); ctx.quadraticCurveTo(cx, cy + r * 0.9, cx - r, cy); ctx.closePath();
    ctx.fillStyle = filled ? 'rgba(40,24,70,0.85)' : 'rgba(40,24,70,0.35)'; ctx.fill(); ctx.stroke();
    if (filled) { ctx.fillStyle = '#d6c8ff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.fill(); }
  }
  function drawRumorEyes(T) {   // 1.07: over the trap, upright
    run.rumor.traps.forEach((v, k) => {
      const [x, y] = k.split(',').map(Number), it = fl.items.get(k);
      const p = it ? itemAnchor(it) : W2S(x + 0.5, y + 0.5, 0.4);
      eyeIcon(p[0] + T * 0.3, p[1] - T * 0.42, Math.max(4, T * 0.16), !!(it && it.type === v.type));
    });
  }
  function drawToolMarkers(T) {
    const ms = toolMarkers(selected);
    ms.forEach(m => {
      const cost = toolCost(selected, m), afford = fl.essence >= cost, rk = KINDS[m.tool], rt = ROOMTYPES[m.tool], RI = rt ? RT_INFO[rt] : rk ? KIND_INFO[rk] : null;   // 1.15: a komnata too
      const q = W2S(m.x, m.y, 0), x = q[0], y = q[1], r = Math.max(10, T * 0.42);   // 1.07: upright over its spot
      ctx.fillStyle = m.tool === 'demolish' || m.has ? 'rgba(201,55,69,0.85)' : !afford ? 'rgba(120,110,140,0.8)' : RI ? RI.color : 'rgba(242,185,75,0.9)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#1a1424'; ctx.font = numFont(r * 1.1, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(RI ? (m.has ? '×' : RI.glyph) : m.tool === 'dig' ? '+' : m.tool === 'tunnel' ? '↔' : m.tool === 'expand' ? '▲' : '×', x, y + 1);
      if (RI && m.other && T >= 12) {   // it already has another character: this replaces it
        const on = (rt ? RT_INFO : KIND_INFO)[m.other].name;
        ctx.font = numFont(Math.max(9, r * 0.55), true); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.9)';
        ctx.strokeText('zamiast: ' + on, x, y + r + Math.max(7, r * 0.55)); ctx.fillStyle = '#c9c2d8'; ctx.fillText('zamiast: ' + on, x, y + r + Math.max(7, r * 0.55));
      }
      if (m.tool === 'expand') {
        ctx.font = numFont(Math.max(10, r * 0.75), true); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.9)';
        ctx.strokeText(String(cost), x, y + r + Math.max(7, r * 0.55)); ctx.fillStyle = afford ? '#f2b94b' : '#9a90aa'; ctx.fillText(String(cost), x, y + r + Math.max(7, r * 0.55));
      }
    });
  }
  // Build phase: where the next wave will tunnel in.
  function drawBreachMark(T) {   // Build phase: where the next wave will tunnel in (rings on the floor; the words: drawBreachLabel)
    const b = fl.breach, x = (b.x + 0.5) * T, y = (b.y + 0.5) * T, pulse = 0.55 + 0.45 * Math.sin(realNow * 5);
    ctx.strokeStyle = 'rgba(255,90,90,' + pulse.toFixed(2) + ')'; ctx.lineWidth = Math.max(2, T * 0.09);
    ctx.beginPath(); ctx.arc(x, y, T * (0.75 + 0.1 * pulse), 0, Math.PI * 2); ctx.stroke();
    const pg = realNow - (fl.breachPing || -99);   // 1.01: shown from the breach sheet: rings run out from it for a few seconds
    if (pg >= 0 && pg < 4) for (let k = 0; k < 2; k++) { const u = ((pg + k * 0.6) % 1.2) / 1.2; ctx.strokeStyle = 'rgba(255,110,110,' + (0.7 * (1 - u)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, T * 0.06); ctx.beginPath(); ctx.arc(x, y, T * (0.8 + 2.2 * u), 0, Math.PI * 2); ctx.stroke(); }
  }
  function drawTutTarget(T) {
    const t = tutTarget();
    if (!t) return;
    const pulse = 0.6 + 0.4 * Math.sin(realNow * 6);
    markRing(t[0], t[1], T, 0.6 + 0.1 * pulse, 'rgba(242,185,75,' + pulse.toFixed(2) + ')', Math.max(2, T * 0.08));
  }
  function drawFF() {
    if (fl && fl.phase === 'raid' && !paused && !ff && !modalOpen && autoFFOn()) {   // auto fast-forward while nothing happens
      ctx.fillStyle = 'rgba(16,17,20,0.7)'; rr(cw / 2 - 46, 8, 92, 22, 3); ctx.fill();
      ctx.fillStyle = '#b9a4ff'; ctx.font = numFont(12, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('▶▶ ×' + String(S.autoFF).replace('.', ',') + ' spokój', cw / 2, 19);
      return;
    }
    if (!ff || !fl || fl.phase !== 'raid' || paused) return;
    ctx.fillStyle = 'rgba(16,17,20,0.85)'; rr(cw / 2 - 38, 8, 76, 24, 3); ctx.fill();
    ctx.fillStyle = '#f2b94b'; ctx.font = numFont(14, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▶▶ ×' + String(S.ffSpeed).replace('.', ','), cw / 2, 20);
  }
