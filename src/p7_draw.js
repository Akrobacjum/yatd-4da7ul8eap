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
  function drawWorld(T) {
    ctx.save();
    let sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake * 18; sy = (Math.random() - 0.5) * shake * 18; }
    ctx.translate(-cam.ox + sx, -cam.oy + sy);
    const x0 = clamp(Math.floor(cam.ox / T) - 1, 0, WW - 1), x1 = clamp(Math.ceil((cam.ox + cw) / T) + 1, 0, WW - 1);
    const y0 = clamp(Math.floor(cam.oy / T) - 1, 0, WH - 1), y1 = clamp(Math.ceil((cam.oy + ch) / T) + 1, 0, WH - 1);
    drawTileLayer(x0, y0, x1, y1, T);
    drawTorches(x0, y0, x1, y1, T);
    drawRoomTypes(T);
    drawZones(T);
    if (fl.phase === 'raid') drawDanger(x0, y0, x1, y1, T);
    if (fl.phase === 'build') { drawAreas(T, x0, y0, x1, y1); drawRumorTiles(x0, y0, x1, y1, T); }
    const seen = (x, y) => x >= x0 - 2 && x <= x1 + 2 && y >= y0 - 2 && y <= y1 + 2;   // 1.03: what is off the screen is not drawn
    fl.objects.forEach(o => { if (seen(o.x, o.y)) drawObject(o, T); });
    fl.items.forEach(it => { if (!DRIFT[it.type] && seen(it.x, it.y)) drawItem(it, T); });
    drawHeart(T);
    drawRoomLabels(T);
    if (fl.phase === 'raid' || fl.phase === 'summary' || fl.phase === 'over') drawFog(x0, y0, x1, y1, T);
    if (fl.phase === 'build') drawRumorEyes(T);
    drawSlots(x0, y0, x1, y1, T);
    drawHold(T);
    if (fl.phase === 'build' && selected && TOOLS[selected]) drawToolMarkers(T);
    if (fl.breach && fl.phase === 'build') drawBreachMark(T);
    fl.items.forEach(it => { if (it.jamUntil > fl.time && fl.phase === 'raid') { ctx.fillStyle = 'rgba(150,100,255,0.38)'; ctx.fillRect(it.x * T, it.y * T, T, T); ctx.fillStyle = '#e6dcff'; ctx.font = numFont(Math.max(10, T * 0.4), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('≈', (it.x + 0.5) * T, (it.y + 0.5) * T); } });
    if (run.tut >= 0) drawTutTarget(T);
    drawFx(T);
    fl.heroes.forEach(h => { if (!h.dead && !h.fled && !h.gone) drawHero(h, T); });
    fl.items.forEach(it => { if (DRIFT[it.type] && seen(Math.floor(it.gx !== undefined ? it.gx : it.x), Math.floor(it.gy !== undefined ? it.gy : it.y))) drawItem(it, T); });   // ghosts, shades and bats float above everything
    if (fl.phase === 'raid') drawMemBadges(T, seen);
    drawParticles(T); drawFloats(T);
    ctx.restore();
  }
  function drawTiles(x0, y0, x1, y1, T, g) {   // 1.03: g = the context to draw on (a cached chunk)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * WW + x, t = fl.tiles[i], px = x * T, py = y * T;
      if (t === ROCK) {
        g.fillStyle = ((x * 7 + y * 13) % 5 === 0) ? '#0f1013' : '#0b0c0e'; g.fillRect(px, py, T + 0.5, T + 0.5);
        continue;
      }
      if (t === WALL) {
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
    const nT = (x1 - x0 + 1) * (y1 - y0 + 1);
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
  function drawTorches(x0, y0, x1, y1, T) {
    if (T < 10) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (fl.tiles[y * WW + x] !== WALL || tileAt(x, y + 1) !== FLOOR || fl.items.has(key(x, y))) continue;
      const h = tileHash(x + 101, y + 37); if (h % 5 !== 0) continue;
      const cx = (x + 0.5) * T, cy = (y + 0.42) * T, f = 0.86 + 0.14 * Math.sin(realNow * 8.3 + x * 1.7) * Math.sin(realNow * 5.1 + y * 2.3);
      const gr = T * 2.3 * f;
      ctx.drawImage(glowSprite('torch', [[0, 'rgba(255,150,70,0.17)'], [0.5, 'rgba(255,120,50,0.05)'], [1, 'rgba(255,120,40,0)']]), cx - gr, cy + T * 0.5 - gr, gr * 2, gr * 2);
      ctx.fillStyle = '#0c0d0f'; ctx.fillRect(cx - T * 0.05, cy + T * 0.02, T * 0.1, T * 0.3);
      ctx.fillStyle = '#3c4048'; ctx.fillRect(cx - T * 0.11, cy - T * 0.02, T * 0.22, T * 0.08);
      ctx.fillStyle = 'rgba(255,110,30,0.92)'; ctx.beginPath(); ctx.ellipse(cx, cy - T * 0.13, T * 0.09, T * 0.15 * f, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,225,140,0.95)'; ctx.beginPath(); ctx.ellipse(cx, cy - T * 0.09, T * 0.045, T * 0.08 * f, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
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
  function drawObject(o, T) {
    const px = o.x * T, py = o.y * T;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(px + T / 2, py + T * 0.84, T * 0.34, T * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    if (o.kind === 'barrel') {
      ctx.fillStyle = '#8a5a2b'; rr(px + T * 0.25, py + T * 0.16, T * 0.5, T * 0.68, T * 0.12); ctx.fill();
      ctx.fillStyle = '#4a2f18'; ctx.fillRect(px + T * 0.25, py + T * 0.32, T * 0.5, T * 0.07); ctx.fillRect(px + T * 0.25, py + T * 0.62, T * 0.5, T * 0.07);
    } else if (o.kind === 'crate') {
      ctx.fillStyle = '#7a5a34'; ctx.fillRect(px + T * 0.16, py + T * 0.18, T * 0.68, T * 0.64);
      ctx.strokeStyle = '#4a3420'; ctx.lineWidth = Math.max(1, T * 0.05);
      ctx.strokeRect(px + T * 0.16, py + T * 0.18, T * 0.68, T * 0.64);
      ctx.beginPath(); ctx.moveTo(px + T * 0.16, py + T * 0.18); ctx.lineTo(px + T * 0.84, py + T * 0.82); ctx.moveTo(px + T * 0.84, py + T * 0.18); ctx.lineTo(px + T * 0.16, py + T * 0.82); ctx.stroke();
    } else if (o.kind === 'statue') {
      ctx.fillStyle = '#55505e'; ctx.fillRect(px + T * 0.22, py + T * 0.66, T * 0.56, T * 0.18);
      ctx.fillStyle = '#8a8496'; ctx.fillRect(px + T * 0.36, py + T * 0.36, T * 0.28, T * 0.32);
      ctx.beginPath(); ctx.arc(px + T * 0.5, py + T * 0.27, T * 0.12, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#4a3020'; ctx.fillRect(px + T * 0.12, py + T * 0.14, T * 0.76, T * 0.72);
      const cols = ['#8a3a3a', '#3a5a8a', '#6a8a3a', '#b08a3a'];
      for (let row = 0; row < 3; row++) for (let b = 0; b < 4; b++) {
        ctx.fillStyle = cols[(b + row + o.x) % 4];
        ctx.fillRect(px + T * (0.17 + b * 0.17), py + T * (0.19 + row * 0.22), T * 0.12, T * 0.16);
      }
    }
  }
  // 1.05: a trap's answer for this wave, in the check's own language: a full pale disc = crit, a ring = graze; a skull = let go
  function drawMemBadges(T, seen) {
    if (T < 9) return;
    const r = Math.max(3, T * 0.13);
    fl.items.forEach(it => {
      const m = memOf(it), off = it.skullOff;
      if (!m && !off) return;
      const gh = DRIFT[it.type] && it.gx !== undefined, x = (gh ? it.gx + 0.3 : it.x + 0.84) * T, y = (gh ? it.gy - 0.3 : it.y + 0.16) * T;
      if (!seen(Math.floor(x / T), Math.floor(y / T))) return;
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
  function drawItem(it, T) {
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
    if (it.lvl >= 2) {   // upgrade level: gold pips, level 3 gets a glow
      if (it.lvl >= 3) { ctx.strokeStyle = 'rgba(255,170,70,' + (0.35 + 0.2 * Math.sin(realNow * 4 + it.x)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.strokeRect(px + s * 0.03, py + s * 0.03, s * 0.94, s * 0.94); }
      ctx.fillStyle = it.lvl >= 3 ? '#ff9a3c' : '#f2b94b';
      for (let k = 0; k < it.lvl - 1; k++) { const qx = px + s * (0.84 - k * 0.16), qy = py + s * 0.86; ctx.beginPath(); ctx.moveTo(qx, qy - s * 0.07); ctx.lineTo(qx + s * 0.06, qy); ctx.lineTo(qx, qy + s * 0.07); ctx.lineTo(qx - s * 0.06, qy); ctx.closePath(); ctx.fill(); }
    }
    if (it.type === 'decoy' && it.disabled && fl.phase === 'raid') { ctx.fillStyle = 'rgba(16,17,20,0.6)'; ctx.fillRect(px, py, s, s); }
    if (MONSTERS[it.type]) {
      if (it.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.fill(); }
      hpBar(cx, cy - s * 0.42, s * 0.6, it.hp / it.max, '#9be37a', T);
    }
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
      if (it.detected && !it.disabled) {
        ctx.fillStyle = '#ffe066'; ctx.font = numFont(Math.max(10, s * 0.3), true); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('!', px + s * 0.08, py + s * 0.02);
      }
      if (false) {   // v14: no sleeping traps
        ctx.fillStyle = 'rgba(16,17,20,0.45)'; ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#b9a4ff'; ctx.font = numFont(Math.max(9, s * 0.26), true); ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText('zZ', px + s * 0.96, py + s * 0.02);
      }
    }
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
      ctx.fillStyle = ITEM_COLOR[it.item.type] || '#fff'; ctx.beginPath(); ctx.arc(cx + s * 0.3, cy - s * 0.3, s * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 1; ctx.stroke();
    }
    const gl = 0.5 + 0.5 * Math.sin(realNow * 4 + it.x);
    ctx.fillStyle = 'rgba(255,240,180,' + (0.6 * gl).toFixed(2) + ')';
    ctx.fillRect(cx + s * 0.16, cy - s * 0.3, s * 0.05, s * 0.05); ctx.fillRect(cx - s * 0.24, cy - s * 0.18, s * 0.04, s * 0.04);
  }
  // Room types: a tint and a little texture over the whole room, so you see at a glance what each room does.
  function drawRoomTypes(T) {
    fl.rooms.forEach(R => {
      if (R.kind !== 'room' || !R.rt) return;
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T, t = realNow;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      if (R.rt === 'fog') {
        ctx.fillStyle = 'rgba(190,200,220,0.16)'; ctx.fillRect(x, y, w, h);
        for (let k = 0; k < 4; k++) {
          const fx = x + ((k * 0.37 + t * 0.03 * (k % 2 ? 1 : -1)) % 1 + 1) % 1 * w, fy = y + (0.2 + 0.2 * k) * h;
          const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, T * 1.6); g.addColorStop(0, 'rgba(210,220,235,0.22)'); g.addColorStop(1, 'rgba(210,220,235,0)');
          ctx.fillStyle = g; ctx.fillRect(fx - T * 1.6, fy - T * 1.6, T * 3.2, T * 3.2);
        }
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
      }
      ctx.restore();
      if (T >= 14) {   // the type's name in the bottom left corner
        const I = RT_INFO[R.rt];
        ctx.font = numFont(Math.max(9, T * 0.22), true); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.85)'; ctx.strokeText(I.glyph + ' ' + I.name, x + T * 0.08, y + h - T * 0.04);
        ctx.fillStyle = I.color; ctx.fillText(I.glyph + ' ' + I.name, x + T * 0.08, y + h - T * 0.04);
      }
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
  function drawHeart(T) {
    const x = (fl.heart.x + 0.5) * T, y = (fl.heart.y + 0.5) * T;
    const beat = 1 + 0.07 * Math.max(0, Math.sin(realNow * 6)) + (fl.heartHit > 0 ? 0.08 : 0);
    const g = ctx.createRadialGradient(x, y, 0, x, y, T * 1.4);
    g.addColorStop(0, 'rgba(216,67,79,0.45)'); g.addColorStop(1, 'rgba(216,67,79,0)');
    ctx.fillStyle = g; ctx.fillRect(x - T * 1.4, y - T * 1.4, T * 2.8, T * 2.8);
    heartPath(x, y + T * 0.04, T * 0.42 * beat);
    ctx.fillStyle = run.crystals > 0 ? '#c93745' : '#4a2a30'; ctx.fill();
    ctx.strokeStyle = '#ff8a8a'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.stroke();
    // crystals around the heart; one in a thief's hands is missing here
    const home = run.crystals - (fl.party && fl.party.carrierId >= 0 ? 1 : 0), total = run.maxCrystals;
    for (let k = 0; k < total; k++) {
      const a = -Math.PI / 2 + (k - (total - 1) / 2) * 0.55, cx = x + Math.cos(a) * T * 0.62, cy = y + Math.sin(a) * T * 0.62 + T * 0.1;
      crystalShape(cx, cy, T * 0.13, k < home ? '#ff9ab0' : k < run.crystals ? 'rgba(255,154,176,0.25)' : 'rgba(80,60,70,0.6)');
    }
    if (fl.party && fl.party.steal > 0 && fl.phase === 'raid') {
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = Math.max(2, T * 0.07);
      ctx.beginPath(); ctx.arc(x, y, T * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(fl.party.steal / stealNeed(), 0, 1)); ctx.stroke();
    }
    if (T >= 14) {
      ctx.fillStyle = 'rgba(255,214,170,0.9)'; ctx.font = numFont(Math.max(9, T * 0.22), true); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('SERCE', x, y + T * 0.42);
    }
  }
  function crystalShape(x, y, r, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r * 1.4); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.4); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }
  function drawRoomLabels(T) {
    if (T < 14) return;
    ctx.font = numFont(Math.max(10, T * 0.24), true); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const loads = fl.phase === 'build' ? roomLoads() : null;
    fl.rooms.forEach(r => {
      if (r.kind !== 'room') return;
      const m = depthMult(r.id);
      ctx.fillStyle = isEdgeRoom(r.id) ? 'rgba(255,170,140,0.9)' : 'rgba(255,214,170,0.75)';
      let t = '×' + m.toFixed(1).replace('.', ',');
      if (loads) { const full = loads[r.id] >= roomCap(r); t += '  ' + loads[r.id] + '/' + roomCap(r); if (full) ctx.fillStyle = '#ff9a9a'; }
      ctx.fillText(t, r.x0 * T + T * 0.08, r.y0 * T + T * 0.06);
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
    fl.items.forEach(it => { if (!SLOTTED(it.type)) return; const r = slotRoom(it.type, it.x, it.y); if (r >= 0) loads[r]++; });
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
    ctx.strokeStyle = 'rgba(195,178,255,' + pulse.toFixed(2) + ')'; ctx.lineWidth = Math.max(2, T * 0.08);
    ctx.strokeRect(src.x * T + T * 0.04, src.y * T + T * 0.04, T * 0.92, T * 0.92);
    ctx.setLineDash([T * 0.12, T * 0.1]); ctx.lineWidth = Math.max(1, T * 0.04); ctx.strokeStyle = 'rgba(195,178,255,0.8)';
    carryCache.list.forEach(t => ctx.strokeRect(t[0] * T + T * 0.12, t[1] * T + T * 0.12, T * 0.76, T * 0.76));
    ctx.setLineDash([]);
    if (it && ACTIVE[it.type] && (it.lvl || 1) < 3) {   // Prototype 1.0: what a double tap would cost, over the thing in hand
      const c = upgCost(it), ok = fl.essence >= c, x = (it.x + 0.5) * T, y = it.y * T + T * 0.05;
      ctx.font = numFont(Math.max(10, T * 0.3), true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = ok ? 'rgba(255,85,98,0.95)' : 'rgba(80,84,92,0.92)'; rr(x - T * 0.4, y - T * 0.34, T * 0.8, T * 0.32, 3); ctx.fill();
      ctx.fillStyle = ok ? '#2a0509' : '#c8ccd2'; ctx.fillText('↑' + c, x, y - T * 0.04);
    }
    return true;
  }
  function drawHold(T) {   // a ring fills while the finger stays on a thing; full = taken down
    if (!holdInfo || fl.phase !== 'build') return;
    const k = clamp((realNow - holdInfo.t0) / holdInfo.dur, 0, 1); if (k < 0.15) return;
    const cx = (holdInfo.x + 0.5) * T, cy = (holdInfo.y + 0.5) * T, r = T * 0.62;
    ctx.lineWidth = Math.max(3, T * 0.12); ctx.strokeStyle = 'rgba(16,17,20,0.7)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd0d0'; ctx.font = numFont(Math.max(10, T * 0.3), true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('zdejmij', cx, cy - r - 3);
  }
  function drawSlots(x0, y0, x1, y1, T) {
    if (fl.phase === 'build' && (movingKey || movingObj) && drawCarry(T)) return;
    if (!selected || TOOLS[selected] || (fl.phase !== 'build' && fl.phase !== 'raid')) return;
    if (selected === 'upgrade') {
      ctx.font = numFont(Math.max(10, T * 0.3), true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      fl.items.forEach(it => {
        if (!ACTIVE[it.type] || (it.lvl || 1) >= 3) return;
        const c = upgCost(it), ok = fl.essence >= c, x = (it.x + 0.5) * T, y = it.y * T + T * 0.05;
        ctx.fillStyle = ok ? 'rgba(255,85,98,0.95)' : 'rgba(80,84,92,0.92)'; rr(x - T * 0.36, y - T * 0.34, T * 0.72, T * 0.32, 3); ctx.fill();
        ctx.fillStyle = ok ? '#2a0509' : '#c8ccd2'; ctx.fillText('↑' + c, x, y - T * 0.04);
      });
      return;
    }
    if (selected === 'move') {
      const it = movingKey && fl.items.get(movingKey);
      if (!it) {   // nothing picked yet: everything you could pick up glows a little
        ctx.strokeStyle = 'rgba(195,178,255,0.55)'; ctx.lineWidth = Math.max(1, T * 0.04);
        fl.items.forEach(o => ctx.strokeRect(o.x * T + T * 0.08, o.y * T + T * 0.08, T * 0.84, T * 0.84));
        return;
      }
      const pulse = 0.6 + 0.4 * Math.sin(realNow * 6);
      ctx.strokeStyle = 'rgba(195,178,255,' + pulse.toFixed(2) + ')'; ctx.lineWidth = Math.max(2, T * 0.08);
      ctx.strokeRect(it.x * T + T * 0.04, it.y * T + T * 0.04, T * 0.92, T * 0.92);
      fl.items.delete(movingKey);
      const loads = roomLoads();
      ctx.setLineDash([T * 0.12, T * 0.1]); ctx.lineWidth = Math.max(1, T * 0.04); ctx.strokeStyle = 'rgba(195,178,255,0.8)';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!(x === it.x && y === it.y) && canPlace(it.type, x, y, loads)) ctx.strokeRect(x * T + T * 0.12, y * T + T * 0.12, T * 0.76, T * 0.76);
      ctx.setLineDash([]);
      fl.items.set(movingKey, it);
      return;
    }
    if (MODES[selected]) return;
    ctx.setLineDash([T * 0.12, T * 0.1]); ctx.lineWidth = Math.max(1, T * 0.04);
    ctx.strokeStyle = 'rgba(242,185,75,0.7)';
    const loads = roomLoads();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (canPlace(selected, x, y, loads)) ctx.strokeRect(x * T + T * 0.12, y * T + T * 0.12, T * 0.76, T * 0.76);
    }
    ctx.setLineDash([]);
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
  function drawHero(h, T) {
    const p = heroPos(h), sm = h.state === 'smash' ? Math.sin(realNow * 40) * T * 0.04 : 0, x = p.x * T + sm, y = p.y * T, rad = T * 0.24;   // 1.05: the axe swings
    if (h.path.length && h.state !== 'boss') {
      ctx.fillStyle = h.T.color; ctx.globalAlpha = 0.45;
      h.path.slice(0, 6).forEach((t, k) => { ctx.beginPath(); ctx.arc((t[0] + 0.5) * T, (t[1] + 0.5) * T, Math.max(1.5, T * (0.07 - k * 0.007)), 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x, y + rad * 0.9, rad, rad * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    if (h.cursed) {   // a cursed treasure: a violet haze
      const g = ctx.createRadialGradient(x, y, rad * 0.5, x, y, rad * 2); g.addColorStop(0, 'rgba(180,140,255,0.45)'); g.addColorStop(1, 'rgba(180,140,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad * 2, y - rad * 2, rad * 4, rad * 4);
    }
    if (fl.time < h.calmUntil) { ctx.fillStyle = 'rgba(195,178,255,0.22)'; ctx.beginPath(); ctx.arc(x, y, rad * 1.7, 0, Math.PI * 2); ctx.fill(); }   // amulet
    if (fl.time < h.sprintUntil) {   // boots: speed lines
      ctx.strokeStyle = 'rgba(232,194,122,0.7)'; ctx.lineWidth = Math.max(1, T * 0.035); ctx.beginPath();
      for (let k = -1; k <= 1; k++) { ctx.moveTo(x - rad * 1.2, y + k * rad * 0.45); ctx.lineTo(x - rad * 1.9, y + k * rad * 0.45); }
      ctx.stroke();
    }
    ctx.fillStyle = h.flash > 0 ? '#ffffff' : h.T.color;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.5, T * (h.rank >= 2 ? 0.07 : 0.05) * (h.boss ? 1.6 : 1)); ctx.strokeStyle = h.R.color; ctx.stroke();   // ring colour = level tier
    if (T >= 18) { ctx.fillStyle = h.R.color; ctx.font = numFont(Math.max(9, T * 0.2), true); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(String(h.lvl), x + rad * 0.95, y + rad * 0.75); }
    if (fl.time < h.slowUntil) { ctx.strokeStyle = '#a9c6ff'; ctx.lineWidth = Math.max(1.5, T * 0.04); ctx.beginPath(); ctx.arc(x, y, rad + T * 0.05, 0, Math.PI * 2); ctx.stroke(); }
    if (fl.time < h.burnUntil) { ctx.fillStyle = Math.sin(realNow * 20) > 0 ? '#ff9a3c' : '#ffd27a'; ctx.beginPath(); ctx.arc(x + rad * 0.7, y - rad * 0.7, T * 0.07, 0, Math.PI * 2); ctx.fill(); }
    drawClassIcon(h.type, x, y, rad * 1.7, '#1a1424');
    if (h.hunter && T >= 14) drawClassIcon('bag', x - rad * 1.05, y - rad * 0.85, Math.max(7, T * 0.26), '#f2b94b');   // a treasure hunter
    hpBar(x, y - rad - T * 0.14, T * 0.56, h.hp / h.max, h.hp / h.max > 0.35 ? '#6fd38a' : '#ff6b6b', T);
    hpBar(x, y - rad - T * 0.14 + Math.max(2.5, T * 0.09), T * 0.56, h.fear / (h.courage * (fl.fearless ? 1.3 : 1)), '#b48cff', T);   // fear: full bar = runs away
    if (h.shield > 0) hpBar(x, y - rad - T * 0.14 - Math.max(3, T * 0.1), T * 0.56, h.shield / h.max, '#7fb8ff', T);
    if (h.type === 'priest' && h.faithMax && T >= 14) hpBar(x, y - rad - T * 0.14 + 2 * Math.max(2.5, T * 0.09), T * 0.56, h.faith / h.faithMax, '#ffe9a8', T);   // faith
    if (fl.time < h.wardUntil) {   // talisman ward
      ctx.strokeStyle = 'rgba(127,184,255,' + (0.6 + 0.3 * Math.sin(realNow * 12)).toFixed(2) + ')'; ctx.lineWidth = Math.max(2, T * 0.06);
      ctx.beginPath(); ctx.arc(x, y, rad + T * 0.1, 0, Math.PI * 2); ctx.stroke();
    }
    if (h.crystal) crystalShape(x + rad * 1.05, y - rad * 0.2, T * 0.12, '#ff9ab0');
    if (h.gold > 0 && T >= 14) {   // a purse
      ctx.fillStyle = '#f2b94b'; ctx.beginPath(); ctx.arc(x - rad * 1.05, y + rad * 0.55, T * 0.09, 0, Math.PI * 2); ctx.fill();
      if (h.gold > 1) { ctx.fillStyle = '#ffe9a8'; ctx.font = numFont(Math.max(8, T * 0.18), true); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(h.gold), x - rad * 1.2, y + rad * 0.55); }
    }
    if (h.fleeing) {
      ctx.fillStyle = '#c3b2ff'; ctx.font = numFont(Math.max(10, T * 0.3), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('»', x - rad * 1.15, y - rad * 0.3 + Math.sin(realNow * 10) * T * 0.03);
    }
    if (h.inv.length && T >= 16) {   // the pack: one square per item, in its colour; a power on cooldown is dimmed
      const q = Math.max(3, T * 0.1);
      h.inv.slice(0, 6).forEach((it, k) => {
        ctx.globalAlpha = fl.time < (it.cdUntil || 0) || it.charges === 0 ? 0.35 : 1;
        ctx.fillStyle = ITEM_COLOR[it.type] || rarColor(it.r); ctx.fillRect(x - rad + k * (q + 2), y + rad + T * 0.1, q, q);
        if (it.r >= 2) { ctx.strokeStyle = rarColor(it.r); ctx.lineWidth = 1; ctx.strokeRect(x - rad + k * (q + 2) - 0.5, y + rad + T * 0.1 - 0.5, q + 1, q + 1); }
      });
      ctx.globalAlpha = 1;
    }
    if (h.type === 'warrior' && fl.time < h.shieldUpUntil) {
      ctx.strokeStyle = '#7fb8ff'; ctx.lineWidth = Math.max(2, T * 0.07);
      ctx.beginPath(); ctx.arc(x, y, rad + T * 0.12, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke();
    }
    if (h.alone && fl.phase === 'raid') {
      ctx.strokeStyle = 'rgba(255,179,92,0.8)'; ctx.setLineDash([T * 0.08, T * 0.06]); ctx.lineWidth = Math.max(1, T * 0.03);
      ctx.beginPath(); ctx.arc(x, y, rad + T * 0.22, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (fl.time < h.panicUntil) {
      ctx.fillStyle = '#ff6b6b'; ctx.font = numFont(Math.max(10, T * 0.32), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!!', x, y - rad - T * 0.42 + Math.sin(realNow * 14) * T * 0.04);
    }
    if (h.hp / h.max < 0.3 && h.state !== 'rest') {
      ctx.strokeStyle = 'rgba(255,90,90,' + (0.55 + 0.4 * Math.sin(realNow * 12)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, T * 0.05);
      ctx.beginPath(); ctx.arc(x, y, rad + T * 0.16, 0, Math.PI * 2); ctx.stroke();
    }
    if (h.lost) {
      ctx.fillStyle = '#ffe066'; ctx.font = numFont(Math.max(10, T * 0.34), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y - rad - T * 0.42 + Math.sin(realNow * 5) * T * 0.04);
    }
    if (h.state === 'talk') {
      ctx.fillStyle = '#e8dfc8'; ctx.font = numFont(Math.max(9, T * 0.24), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('...', x + rad * 1.1, y - rad - T * 0.2);
    }
    if (h.state === 'rest') {
      ctx.fillStyle = '#c9c2d8'; ctx.font = numFont(Math.max(9, T * 0.24), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('z', x + rad * 0.9, y - rad - T * 0.3 + Math.sin(realNow * 3) * T * 0.05);
    }
    if (h.state === 'disarm') {
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = Math.max(2, T * 0.06);
      ctx.beginPath(); ctx.arc(x, y, rad + T * 0.1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - h.timer / h.dur)); ctx.stroke();
    }
  }
  function drawParticles(T) {
    particles.forEach(p => {
      ctx.globalAlpha = clamp(p.life * 2.2, 0, 1);
      if (p.ring) { ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(2, T * 0.08); ctx.beginPath(); ctx.arc(p.x * T, p.y * T, p.r * T, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = p.color; ctx.fillRect(p.x * T - T * 0.04, p.y * T - T * 0.04, T * 0.08, T * 0.08); }
    });
    ctx.globalAlpha = 1;
  }
  function drawFloats(T) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    floats.forEach(f => {
      ctx.globalAlpha = clamp(f.life / 0.5, 0, 1);
      ctx.font = numFont(Math.max(11, f.size * T / 52), true);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.9)'; ctx.strokeText(f.text, f.x * T, f.y * T);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x * T, f.y * T);
    });
    ctx.globalAlpha = 1;
  }
  // Party panel in screen space: who is in the dungeon, how hurt, how scared, who carries the crystal.
  // Folded (default): one row of chips with HP and fear bars. Unfolded: the full list with gear. A tap switches.
  function heroGlyph(hh) { return hh.dead ? '†' : hh.fled ? (hh.fleeing ? '»' : '↑') : hh.crystal ? '◆' : hh.gone ? '↓' : hh.state === 'caged' ? '#' : hh.state === 'rest' ? 'z' : hh.lost ? '?' : hh.fleeing ? '»' : (hh.panicUntil > fl.time) ? '!' : hh.alone ? 's' : ''; }
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
  function drawOrbs() {
    const c = $('#fx'); if (!c) return;
    const W = innerWidth, H = innerHeight;
    if (c.width !== Math.round(W * DPR) || c.height !== Math.round(H * DPR)) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); fxDirty = true; }
    if (!orbs.length && !fxDirty) return;
    if (!fxc) fxc = c.getContext('2d');
    fxc.setTransform(DPR, 0, 0, DPR, 0, 0); fxc.clearRect(0, 0, W, H); fxDirty = orbs.length > 0;
    if (!orbs.length) return;
    const cr = cv.getBoundingClientRect(), sr = $('#h-score').getBoundingClientRect(), hr = $('#h-heart').getBoundingClientRect(), gr = $('#eq-g').getBoundingClientRect();
    const TG = { score: [sr.left + sr.width / 2, sr.top + sr.height / 2], heart: [hr.left + hr.width / 2, hr.top + hr.height / 2], groza: [gr.left + gr.width / 2, gr.top + gr.height / 2] };
    const at = (o, u) => {
      const [tx, ty] = TG[o.to === 'heart' && hr.width ? 'heart' : o.to === 'groza' && gr.width ? 'groza' : 'score'];
      const ox = o.ax != null ? o.ax : o.x + cr.left, oy = o.ay != null ? o.ay : o.y + cr.top;
      const e = u * u * (3 - 2 * u), cx = ox + (tx - ox) * 0.2, cy = Math.min(oy, ty) - (o.ax != null ? 18 : 40);
      return [(1 - e) * (1 - e) * ox + 2 * (1 - e) * e * cx + e * e * tx, (1 - e) * (1 - e) * oy + 2 * (1 - e) * e * cy + e * e * ty];
    };
    orbs.forEach(o => {
      if (o.t < 0) return;   // a cashed-in chain lets its orbs go one after another
      const u = clamp(o.t / o.dur, 0, 1), [x, y] = at(o, u), [x2, y2] = at(o, Math.max(0, u - 0.08)), vi = o.to === 'groza';
      fxc.strokeStyle = vi ? 'rgba(170,150,245,0.55)' : 'rgba(255,90,100,0.38)'; fxc.lineWidth = 3; fxc.lineCap = 'round'; fxc.beginPath(); fxc.moveTo(x2, y2); fxc.lineTo(x, y); fxc.stroke();
      fxc.fillStyle = vi ? 'rgba(160,135,245,0.42)' : 'rgba(255,70,85,0.32)'; fxc.beginPath(); fxc.arc(x, y, 7, 0, Math.PI * 2); fxc.fill();
      fxc.fillStyle = vi ? '#ece6ff' : '#ffe0e3'; fxc.beginPath(); fxc.arc(x, y, 2.6, 0, Math.PI * 2); fxc.fill();
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
      const ox = clamp((o.x + 0.5) * T - cam.ox, 10, cw - 10), oy = clamp((o.y + 0.5) * T - cam.oy, 10, ch - 10), R = Math.max(12, T * (k ? 0.6 : 0.75));
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = k ? 'rgba(196,160,82,0.9)' : 'rgba(230,225,214,0.95)'; ctx.lineWidth = 1.6; if (k) ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }));
    // the check sits at the bottom of the map (above the tutorial panel if it is open), so it never covers the party or their lines
    const legend = run.checkHints >= 0 && fl.stats.checks <= 3, coach = $('#coach');
    const bottom = coach && !coach.hidden && !coach.classList.contains('top') ? ch - coach.offsetHeight - 14 : ch - 10;
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
    const bx = (cw - w) / 2, top = bottom - boxH, ox = cw / 2 - (x0 + x1) / 2, oy = top + headH + 6 + pad - y0;
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
      ctx.fillText(e.nm[0] + ' · poz. ' + e.lvl + ' ' + (e.boss ? BOSS_NAME[e.boss][e.female ? 1 : 0] : R0.name[e.female ? 1 : 0]).toLowerCase() + (e.returning ? ' · wraca' : e.hunter ? ' · łowca' : e.recruit ? ' · rekrut' : '') + (e.phobia && ((e.known || []).includes('phobia') || mods.revealAll) ? ' · boi się: ' + PHOBIAS[e.phobia].name : ''), 25, y, w - 24);
    });
    if (fl.breach) { ctx.fillStyle = '#ff8a8a'; ctx.font = '700 10px "Alegreya Sans", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(run.layout.breach && run.layout.breach.fresh ? 'Wejdą przez wyłom! (czerwony znacznik)' : 'Wyłom otwarty: wybiorą wejście', 12, 26 + list.length * rowH, w - 16); }
  }
  function drawOffscreen(T) {
    uiRects.list = null;
    if (fl && fl.phase === 'build') { drawNextWave(); return; }
    if (!fl || fl.phase !== 'raid') return;
    drawParty();
    alive().forEach(h => {
      const p = heroPos(h), sx = p.x * T - cam.ox, sy = p.y * T - cam.oy;
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
    ctx.font = '600 11.5px "Alegreya Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle';
    const boxes = [], seen = new Set();
    if (fl.check && fl.check.box) boxes.push(fl.check.box);
    if (uiRects.list) boxes.push(uiRects.list);
    let shown = 0;
    alive().filter(h => h.bubble && h.bubble.until > fl.time).sort((a, b) => b.bubble.prio - a.bubble.prio).forEach(h => {
      if (shown >= 3 || seen.has(h.bubble.text)) return;
      seen.add(h.bubble.text); shown++;
      const p = heroPos(h), sx = p.x * T - cam.ox, sy = p.y * T - cam.oy - T * 0.55 - 10;
      if (sx < -40 || sx > cw + 40 || sy < -40 || sy > ch + 40) return;
      const lines = wrapText(h.bubble.text, 140), lw = Math.max(...lines.map(l => ctx.measureText(l).width));
      const w = lw + 14, hh = lines.length * 14 + 10;
      let bx = clamp(sx - w / 2, 4, cw - w - 4), by = clamp(sy - hh, 4, ch - hh - 4);
      for (let k = 0; k < 6; k++) {
        const hit = boxes.find(b => bx < b.x + b.w && bx + w > b.x && by < b.y + b.h && by + hh > b.y);
        if (!hit) break;
        by = hit.y - hh - 3;
      }
      boxes.push({ x: bx, y: by, w, h: hh });
      const fade = clamp((h.bubble.until - fl.time) / 0.3, 0, 1);
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = h.bubble.prio >= 3 ? '#fff4dd' : '#efe7d6';
      rr(bx, by, w, hh, 6); ctx.fill();
      ctx.strokeStyle = h.T.color; ctx.lineWidth = 1.5; rr(bx, by, w, hh, 6); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle = h.bubble.prio >= 3 ? '#fff4dd' : '#efe7d6';
      const tx = clamp(sx, bx + 8, bx + w - 8);
      ctx.beginPath(); ctx.moveTo(tx - 4, by + hh - 0.5); ctx.lineTo(tx + 4, by + hh - 0.5); ctx.lineTo(clamp(sx, tx - 6, tx + 6), Math.min(by + hh + 6, sy + 8)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1424'; ctx.textAlign = 'left';
      lines.forEach((l, k) => ctx.fillText(l, bx + 7, by + 11.5 + k * 14));
      ctx.globalAlpha = 1;
    });
  }
  function drawPause() {
    if (!paused || !fl || fl.phase !== 'raid') return;
    if (tutPopNow) return;   // 1.04: a tutorial card says it (and the check under it stays clear)
    ctx.fillStyle = 'rgba(5,6,8,0.35)'; ctx.fillRect(0, 0, cw, ch);
    const co = $('#coach');
    if (run.tut >= 0 && !co.hidden && !co.classList.contains('top')) return;   // the tutorial coach sits where the plate would be
    // a plate at the bottom, clear of the party panel (top left) and of most bubbles
    const w = Math.min(cw - 16, 300), x0 = (cw - w) / 2, y0 = fl.check && fl.check.box ? Math.max(8, fl.check.box.y - 62) : ch - 62;
    ctx.fillStyle = 'rgba(16,17,20,0.88)'; ctx.strokeStyle = '#3a3f46'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, w, 52, 10) : ctx.rect(x0, y0, w, 52); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f1e7d3'; ctx.font = '700 20px "Grenze Gotisch", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Pauza', cw / 2, y0 + 17);
    ctx.font = '500 12px "Alegreya Sans", system-ui, sans-serif'; ctx.fillStyle = '#c9c2d8';
    ctx.fillText('Przesuwaj mapę, buduj, stuknij bohatera.', cw / 2, y0 + 37);
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
  function drawRumorEyes(T) {
    run.rumor.traps.forEach((v, k) => {
      const [x, y] = k.split(',').map(Number), it = fl.items.get(k);
      eyeIcon((x + 0.82) * T, (y + 0.18) * T, Math.max(4, T * 0.16), !!(it && it.type === v.type));
    });
  }
  function drawToolMarkers(T) {
    const ms = toolMarkers(selected);
    ms.forEach(m => {
      const cost = toolCost(selected, m), afford = fl.essence >= cost, rt = ROOMTYPES[m.tool];
      const x = m.x * T, y = m.y * T, r = Math.max(10, T * 0.42);
      ctx.fillStyle = m.tool === 'demolish' || m.has ? 'rgba(201,55,69,0.85)' : !afford ? 'rgba(120,110,140,0.8)' : rt ? RT_INFO[rt].color : 'rgba(242,185,75,0.9)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#1a1424'; ctx.font = numFont(r * 1.1, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(rt ? (m.has ? '×' : RT_INFO[rt].glyph) : m.tool === 'dig' ? '+' : m.tool === 'tunnel' ? '↔' : m.tool === 'expand' ? '▲' : '×', x, y + 1);
      if (rt && m.other && T >= 12) {   // it already has another character: this replaces it
        ctx.font = numFont(Math.max(9, r * 0.55), true); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.9)';
        ctx.strokeText('zamiast: ' + RT_INFO[m.other].name, x, y + r + Math.max(7, r * 0.55)); ctx.fillStyle = '#c9c2d8'; ctx.fillText('zamiast: ' + RT_INFO[m.other].name, x, y + r + Math.max(7, r * 0.55));
      }
      if (m.tool === 'expand') {
        ctx.font = numFont(Math.max(10, r * 0.75), true); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.9)';
        ctx.strokeText(String(cost), x, y + r + Math.max(7, r * 0.55)); ctx.fillStyle = afford ? '#f2b94b' : '#9a90aa'; ctx.fillText(String(cost), x, y + r + Math.max(7, r * 0.55));
      }
    });
  }
  // Build phase: where the next wave will tunnel in.
  function drawBreachMark(T) {
    const b = fl.breach, x = (b.x + 0.5) * T, y = (b.y + 0.5) * T, pulse = 0.55 + 0.45 * Math.sin(realNow * 5);
    ctx.strokeStyle = 'rgba(255,90,90,' + pulse.toFixed(2) + ')'; ctx.lineWidth = Math.max(2, T * 0.09);
    ctx.beginPath(); ctx.arc(x, y, T * (0.75 + 0.1 * pulse), 0, Math.PI * 2); ctx.stroke();
    const pg = realNow - (fl.breachPing || -99);   // 1.01: shown from the breach sheet: rings run out from it for a few seconds
    if (pg >= 0 && pg < 4) for (let k = 0; k < 2; k++) { const u = ((pg + k * 0.6) % 1.2) / 1.2; ctx.strokeStyle = 'rgba(255,110,110,' + (0.7 * (1 - u)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, T * 0.06); ctx.beginPath(); ctx.arc(x, y, T * (0.8 + 2.2 * u), 0, Math.PI * 2); ctx.stroke(); }
    if (T >= 12) {
      ctx.font = numFont(Math.max(10, T * 0.26), true); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,11,13,0.9)'; ctx.strokeText('WYŁOM', x, y - T * 0.85); ctx.fillStyle = '#ff8a8a'; ctx.fillText('WYŁOM', x, y - T * 0.85);
      ctx.font = numFont(Math.max(9, T * 0.2), true); ctx.textBaseline = 'top';
      const t2 = 'stuknij: załataj (' + BREACH_PATCH + ')';
      ctx.strokeText(t2, x, y + T * 0.85); ctx.fillStyle = fl.essence >= BREACH_PATCH ? '#f2b94b' : '#9a90aa'; ctx.fillText(t2, x, y + T * 0.85);
    }
  }
  function drawTutTarget(T) {
    const t = tutTarget();
    if (!t) return;
    const x = (t[0] + 0.5) * T, y = (t[1] + 0.5) * T, pulse = 0.6 + 0.4 * Math.sin(realNow * 6);
    ctx.strokeStyle = 'rgba(242,185,75,' + pulse.toFixed(2) + ')'; ctx.lineWidth = Math.max(2, T * 0.08);
    ctx.beginPath(); ctx.arc(x, y, T * (0.6 + 0.1 * pulse), 0, Math.PI * 2); ctx.stroke();
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
