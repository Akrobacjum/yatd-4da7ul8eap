  /* ================= drawing ================= */
  const numFont = (px, bold) => (bold ? '700 ' : '500 ') + Math.round(px) + 'px "Pixelify Sans", ui-monospace, monospace';
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#060709'; ctx.fillRect(0, 0, cw, ch);
    if (!fl) return;
    const T = cam.s;
    ctx.save();
    let sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake * 18; sy = (Math.random() - 0.5) * shake * 18; }
    ctx.translate(-cam.ox + sx, -cam.oy + sy);
    const x0 = clamp(Math.floor(cam.ox / T) - 1, 0, WW - 1), x1 = clamp(Math.ceil((cam.ox + cw) / T) + 1, 0, WW - 1);
    const y0 = clamp(Math.floor(cam.oy / T) - 1, 0, WH - 1), y1 = clamp(Math.ceil((cam.oy + ch) / T) + 1, 0, WH - 1);
    drawTiles(x0, y0, x1, y1, T);
    drawTorches(x0, y0, x1, y1, T);
    drawRoomTypes(T);
    drawZones(T);
    if (fl.phase === 'raid') drawDanger(x0, y0, x1, y1, T);
    if (fl.phase === 'build') { drawAreas(T); drawRumorTiles(x0, y0, x1, y1, T); }
    fl.objects.forEach(o => drawObject(o, T));
    fl.items.forEach(it => { if (!DRIFT[it.type]) drawItem(it, T); });
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
    fl.items.forEach(it => { if (DRIFT[it.type]) drawItem(it, T); });   // ghosts, shades and bats float above everything
    drawParticles(T); drawFloats(T);
    ctx.restore();
    drawOffscreen(T);
    drawBubbles(T);
    drawOrbs();
    drawCheck(T);
    drawPause();
    drawFF();
  }
  function drawTiles(x0, y0, x1, y1, T) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * WW + x, t = fl.tiles[i], px = x * T, py = y * T;
      if (t === ROCK) {
        ctx.fillStyle = ((x * 7 + y * 13) % 5 === 0) ? '#0f1013' : '#0b0c0e'; ctx.fillRect(px, py, T + 0.5, T + 0.5);
        continue;
      }
      if (t === WALL) {
        const hw = tileHash(x, y);
        ctx.fillStyle = '#1e2024'; ctx.fillRect(px, py, T + 0.5, T + 0.5);
        if (hw % 3 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px, py + (hw % 2 ? 0 : T / 2), T + 0.5, T / 2); }   // bricks of uneven colour
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(px, py + T / 2); ctx.lineTo(px + T, py + T / 2);
        ctx.moveTo(px + T / 2, py); ctx.lineTo(px + T / 2, py + T / 2);
        ctx.moveTo(px + T / 4, py + T / 2); ctx.lineTo(px + T / 4, py + T);
        ctx.moveTo(px + T * 3 / 4, py + T / 2); ctx.lineTo(px + T * 3 / 4, py + T);
        ctx.stroke();
        if (tileAt(x, y + 1) === FLOOR) { ctx.fillStyle = '#464a51'; ctx.fillRect(px, py + T * 0.8, T + 0.5, T * 0.2); ctx.fillStyle = 'rgba(220,230,245,0.12)'; ctx.fillRect(px, py + T * 0.8, T + 0.5, Math.max(1, T * 0.03)); }
        continue;
      }
      if (t === FLOOR) {
        const hf = tileHash(x, y), v = hf % 7;
        ctx.fillStyle = fl.rooms[fl.roomAt[i]].color; ctx.fillRect(px, py, T + 0.5, T + 0.5);
        if (v < 3) { ctx.fillStyle = 'rgba(0,0,0,' + (0.05 + v * 0.04).toFixed(2) + ')'; ctx.fillRect(px, py, T + 0.5, T + 0.5); }   // flagstones of uneven colour
        else if (v === 6) { ctx.fillStyle = 'rgba(215,225,240,0.04)'; ctx.fillRect(px, py, T + 0.5, T + 0.5); }
        ctx.fillStyle = 'rgba(220,230,245,0.04)';
        ctx.fillRect(px + T * 0.1, py + T * 0.12, T * 0.34, T * 0.24);
        ctx.fillRect(px + T * 0.52, py + T * 0.56, T * 0.34, T * 0.24);
        ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
        if (T >= 16 && (hf >>> 4) % 9 === 0) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.moveTo(px + T * 0.2, py + T * 0.3); ctx.lineTo(px + T * 0.45, py + T * 0.5); ctx.lineTo(px + T * 0.4, py + T * 0.8); ctx.stroke(); }   // a crack
        continue;
      }
      const d = fl.doors.get(key(x, y));
      ctx.fillStyle = '#131418'; ctx.fillRect(px, py, T + 0.5, T + 0.5);
      if (d.breach) {   // a freshly dug tunnel: broken stone and a red glow
        ctx.fillStyle = '#2a0f14'; ctx.fillRect(px + T * 0.06, py + T * 0.06, T * 0.88, T * 0.88);
        ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = Math.max(1, T * 0.05); ctx.beginPath();
        ctx.moveTo(px + T * 0.15, py + T * 0.2); ctx.lineTo(px + T * 0.45, py + T * 0.45); ctx.lineTo(px + T * 0.3, py + T * 0.8);
        ctx.moveTo(px + T * 0.85, py + T * 0.15); ctx.lineTo(px + T * 0.55, py + T * 0.5); ctx.lineTo(px + T * 0.8, py + T * 0.85); ctx.stroke();
        continue;
      }
      ctx.fillStyle = d.entrance ? '#5c544c' : '#3b2f28';
      ctx.fillRect(px + T * 0.08, py + T * 0.08, T * 0.84, T * 0.84);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.beginPath();
      for (let k = 1; k < 4; k++) {
        if (d.horiz) { ctx.moveTo(px + T * 0.08, py + T * (0.08 + 0.21 * k)); ctx.lineTo(px + T * 0.92, py + T * (0.08 + 0.21 * k)); }
        else { ctx.moveTo(px + T * (0.08 + 0.21 * k), py + T * 0.08); ctx.lineTo(px + T * (0.08 + 0.21 * k), py + T * 0.92); }
      }
      ctx.stroke();
      if (d.entrance) {
        const g = ctx.createLinearGradient(0, py, 0, py + T * 1.6);
        g.addColorStop(0, 'rgba(255,220,160,0.35)'); g.addColorStop(1, 'rgba(255,220,160,0)');
        ctx.fillStyle = g; ctx.fillRect(px - T * 0.5, py, T * 2, T * 1.6);
        ctx.fillStyle = 'rgba(255,236,200,0.95)'; ctx.beginPath();
        ctx.moveTo(px + T * 0.28, py + T * 0.3); ctx.lineTo(px + T * 0.72, py + T * 0.3); ctx.lineTo(px + T * 0.5, py + T * 0.72); ctx.closePath(); ctx.fill();
      }
    }
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
      const g = ctx.createRadialGradient(cx, cy + T * 0.5, 0, cx, cy + T * 0.5, T * 2.3 * f);
      g.addColorStop(0, 'rgba(255,150,70,0.17)'); g.addColorStop(0.5, 'rgba(255,120,50,0.05)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - T * 2.4, cy - T * 1.9, T * 4.8, T * 4.8);
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
  function drawAreas(T) {
    fl.items.forEach(it => {
      if (!ACTIVE[it.type]) return;
      const a = it.preview > 0 ? 0.26 : 0.08;
      ctx.fillStyle = 'rgba(225,220,205,' + a + ')';   // Prototype 1.0: what a trap reaches, pale bone (red is Esencja's)
      areaOf(it).forEach(t => ctx.fillRect(t[0] * T + 1, t[1] * T + 1, T - 2, T - 2));
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
  function drawItem(it, T) {
    const gh = DRIFT[it.type] && it.gx !== undefined;
    const px = (gh ? it.gx - 0.5 : it.x) * T, py = (gh ? it.gy - 0.5 : it.y) * T, cx = px + T / 2, cy = py + T / 2, s = T;
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
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * (lr === 3 ? 0.9 : 0.6));
      g.addColorStop(0, lr === 3 ? 'rgba(255,140,60,' + (0.45 + 0.3 * pulse).toFixed(2) + ')' : 'rgba(110,180,255,' + (0.35 + 0.25 * pulse).toFixed(2) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
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
  function drawFog(x0, y0, x1, y1, T) {
    ctx.fillStyle = 'rgba(5,6,8,0.52)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * WW + x, t = fl.tiles[i];
      if ((t === FLOOR || t === DOOR) && !fl.known[i]) ctx.fillRect(x * T, y * T, T + 0.5, T + 0.5);
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
  function drawHero(h, T) {
    const p = heroPos(h), x = p.x * T, y = p.y * T, rad = T * 0.24;
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
    ctx.fillStyle = '#1a1424'; ctx.font = numFont(Math.max(9, T * 0.26), true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(h.T.letter, x, y + T * 0.01);
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
      ctx.fillStyle = '#1a1424'; ctx.font = numFont(8, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hh.T.letter, x, y + 0.5);
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
      ctx.fillStyle = '#1a1424'; ctx.font = numFont(8, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hh.T.letter, 16, y + 6.5);
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
    const cr = cv.getBoundingClientRect(), sr = $('#h-score').getBoundingClientRect(), hr = $('#h-heart').getBoundingClientRect();
    const TG = { score: [sr.left + sr.width / 2, sr.top + sr.height / 2], heart: [hr.left + hr.width / 2, hr.top + hr.height / 2] };
    const at = (o, u) => {
      const [tx, ty] = TG[o.to === 'heart' && hr.width ? 'heart' : 'score'];
      const e = u * u * (3 - 2 * u), ox = o.x + cr.left, oy = o.y + cr.top, cx = ox + (tx - ox) * 0.2, cy = Math.min(oy, ty) - 40;
      return [(1 - e) * (1 - e) * ox + 2 * (1 - e) * e * cx + e * e * tx, (1 - e) * (1 - e) * oy + 2 * (1 - e) * e * cy + e * e * ty];
    };
    orbs.forEach(o => {
      if (o.t < 0) return;   // a cashed-in chain lets its orbs go one after another
      const u = clamp(o.t / o.dur, 0, 1), [x, y] = at(o, u), [x2, y2] = at(o, Math.max(0, u - 0.08));
      fxc.strokeStyle = 'rgba(255,90,100,0.38)'; fxc.lineWidth = 3; fxc.lineCap = 'round'; fxc.beginPath(); fxc.moveTo(x2, y2); fxc.lineTo(x, y); fxc.stroke();
      fxc.fillStyle = 'rgba(255,70,85,0.32)'; fxc.beginPath(); fxc.arc(x, y, 7, 0, Math.PI * 2); fxc.fill();
      fxc.fillStyle = '#ffe0e3'; fxc.beginPath(); fxc.arc(x, y, 2.6, 0, Math.PI * 2); fxc.fill();
    });
  }
  function drawCheck(T) {
    const c = fl && fl.check;
    if (!c || fl.phase !== 'raid') return;
    const it = c.it, all = [it].concat(c.extra || []);
    if (!c.result) { ctx.fillStyle = 'rgba(5,6,8,0.32)'; ctx.fillRect(0, 0, cw, ch); }
    all.forEach((o, k) => {   // the main trap gets the bright ring, the rest of the volley a dashed one
      const ox = clamp((o.x + 0.5) * T - cam.ox, 10, cw - 10), oy = clamp((o.y + 0.5) * T - cam.oy, 10, ch - 10);
      ctx.strokeStyle = k ? 'rgba(255,224,102,0.85)' : 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2; if (k) ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(ox, oy, Math.max(12, T * (k ? 0.6 : 0.75)), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    });
    // the check sits at the bottom of the map (above the tutorial panel if it is open), so it never covers the party or their lines
    // v15.1: round shapes get a big dial on a round backdrop with the title in a pill above (they were tiny inside the long box)
    const round = c.shape === 'ring' || c.shape === 'pulse' || c.shape === 'double' || c.shape === 'spiral', tall = c.shape === 'swing';
    const legend = run.checkHints >= 0 && fl.stats.checks <= 3, coach = $('#coach');
    const bottom = coach && !coach.hidden ? ch - coach.offsetHeight - 14 : ch - 10;
    const label = { crit: 'KRYTYK!', ok: 'Draśnięcie', miss: 'Pudło', skip: 'Odpuszczone' }[c.result];
    const prep = !c.result && realNow < c.t0;
    const nm = ITEMS[it.type].name + (all.length > 1 ? ' + ' + (all.length - 1) : '');
    const title = prep ? 'Uwaga: ' + (all.length > 1 ? 'seria (' + all.length + ')' : ITEMS[it.type].name.toLowerCase()) + '!' : nm + (label ? ': ' + label : ': stuknij!');
    const LEG = 'stuknij w mapę · zielone: draśnięcie · czerwone: krytyk · ☠ zabije';
    let w = Math.min(320, cw - 28), h = tall ? 74 : c.shape === 'fuse' ? 26 : 22, bx = 0, by = 0, K = 1, rcx = 0, rcy = 0;
    if (round) {
      K = clamp(Math.min(cw, ch) * 0.14, 38, 64) / 25;   // dial radius 25 in the old box, now 38-64 px
      const Rb = 37 * K, note = c.note ? c.note.replace(/^ · /, '') : '';
      rcx = cw / 2; rcy = bottom - Rb;
      ctx.font = '700 14px "Alegreya Sans", system-ui, sans-serif';
      const tW = ctx.measureText(title).width;
      ctx.font = '500 11px "Alegreya Sans", system-ui, sans-serif';
      const sub = [note, legend ? LEG : ''].filter(Boolean), sW = sub.reduce((m, t) => Math.max(m, ctx.measureText(t).width), 0);
      const pw = Math.min(cw - 16, Math.max(tW, sW) + 26), ph = 26 + sub.length * 14, px = rcx - pw / 2, py = rcy - Rb - 6 - ph;
      c.box = { x: Math.min(px, rcx - Rb), y: py, w: Math.max(pw, 2 * Rb), h: bottom - py };
      ctx.fillStyle = 'rgba(10,11,13,0.92)'; ctx.beginPath(); ctx.arc(rcx, rcy, Rb, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(10,11,13,0.94)'; rr(px, py, pw, ph, 4); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; rr(px, py, pw, ph, 4); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = prep ? '#ffe066' : '#f1e7d3'; ctx.font = '700 14px "Alegreya Sans", system-ui, sans-serif'; ctx.fillText(title, rcx, py + 13, pw - 12);
      sub.forEach((t, k) => { ctx.fillStyle = t === note ? '#c3b2ff' : '#8e939a'; ctx.font = (t === note ? '600 ' : '500 ') + '11px "Alegreya Sans", system-ui, sans-serif'; ctx.fillText(t, rcx, py + 27 + k * 14, pw - 12); });
      if (prep) { const left = clamp((c.t0 - realNow) / CHECK_PREP, 0, 1); ctx.fillStyle = '#ffe066'; ctx.fillRect(rcx - 35 * left, py + ph - 4, 70 * left, 3); }
    } else {
      const boxH = h + 30 + (legend ? 14 : 0);
      bx = (cw - w) / 2; by = bottom - boxH + 22;
      c.box = { x: bx - 8, y: by - 22, w: w + 16, h: boxH };
      ctx.fillStyle = 'rgba(10,11,13,0.94)'; rr(bx - 8, by - 22, w + 16, boxH, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; rr(bx - 8, by - 22, w + 16, boxH, 4); ctx.stroke();
      ctx.fillStyle = prep ? '#ffe066' : '#f1e7d3'; ctx.font = '700 13px "Alegreya Sans", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(title, bx, by - 11);
      if (c.note) { ctx.fillStyle = '#c3b2ff'; ctx.font = '600 11px "Alegreya Sans", system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(c.note.replace(/^ · /, ''), bx + w, by - 11); ctx.textAlign = 'left'; }
      if (prep) {   // shrinking line = time left before the needle starts
        const left = clamp((c.t0 - realNow) / CHECK_PREP, 0, 1);
        ctx.fillStyle = '#ffe066'; ctx.fillRect(bx + w - 70 * left, by - 13, 70 * left, 3);
      }
    }
    const p = clamp(c.result ? (c.p !== undefined ? c.p : 1) : checkPos(c, (realNow - c.t0) / c.dur), 0, 1);
    const needle = prep ? 'rgba(255,255,255,0.35)' : '#ffffff';
    ctx.font = '700 ' + Math.round(14 * Math.sqrt(K)) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
    const Z = [{ g0: c.g0, g1: c.g1, r0: c.r0, r1: c.r1 }].concat(c.z2 ? [c.z2] : []);
    const skulls = (posOf) => { ctx.fillStyle = '#ffffff'; Z.forEach(z => { if (c.lethalOk) { const q = posOf((z.g0 + z.g1) / 2); ctx.fillText('☠', q[0], q[1]); } if (c.lethalCrit) { const q = posOf((z.r0 + z.r1) / 2); ctx.fillText('☠', q[0], q[1]); } }); };
    if (c.shape === 'bar') {   // one pass, left to right
      ctx.fillStyle = '#1e2126'; ctx.fillRect(bx, by, w, h);
      Z.forEach(z => { ctx.fillStyle = '#3f9d5a'; ctx.fillRect(bx + w * z.g0, by, w * (z.g1 - z.g0), h); ctx.fillStyle = '#d23b4a'; ctx.fillRect(bx + w * z.r0, by, w * (z.r1 - z.r0), h); });
      skulls(q => [bx + w * q, by + h / 2 + 1]);
      ctx.fillStyle = needle; ctx.fillRect(bx + w * p - 2, by - 5, 4, h + 10);
    } else if (c.shape === 'fuse') {   // powder: a fuse burning towards the barrel, the spark speeds up
      const ry = by + h / 2, x0 = bx + 4, x1 = bx + w - 30;
      ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#4a3b2a'; ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x1, ry); ctx.stroke();
      Z.forEach(z => { ctx.strokeStyle = '#3f9d5a'; ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * z.g0, ry); ctx.lineTo(x0 + (x1 - x0) * z.g1, ry); ctx.stroke(); ctx.strokeStyle = '#d23b4a'; ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * z.r0, ry); ctx.lineTo(x0 + (x1 - x0) * z.r1, ry); ctx.stroke(); });
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#5a3a24'; ctx.beginPath(); ctx.arc(bx + w - 14, ry, 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2; ctx.stroke();
      skulls(q => [x0 + (x1 - x0) * q, ry - 10]);
      const sx = x0 + (x1 - x0) * p;
      ctx.fillStyle = prep ? 'rgba(255,224,102,0.4)' : '#ffe066'; ctx.beginPath(); ctx.arc(sx, ry, 6 + (prep ? 0 : 2 * Math.random()), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, ry, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (c.shape === 'swing') {   // monsters: a real pendulum hanging from the top, swinging there and back
      const cx = bx + w / 2, cy = by - 6, R = h + 2, A = Math.PI / 3, ang = q => Math.PI / 2 + A - q * 2 * A;
      ctx.lineCap = 'butt'; ctx.lineWidth = 12;
      ctx.strokeStyle = '#1e2126'; ctx.beginPath(); ctx.arc(cx, cy, R, ang(1), ang(0)); ctx.stroke();
      Z.forEach(z => { ctx.strokeStyle = '#3f9d5a'; ctx.beginPath(); ctx.arc(cx, cy, R, ang(z.g1), ang(z.g0)); ctx.stroke(); ctx.strokeStyle = '#d23b4a'; ctx.beginPath(); ctx.arc(cx, cy, R, ang(z.r1), ang(z.r0)); ctx.stroke(); });
      skulls(q => { const a = ang(q); return [cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14)]; });
      const a = ang(p);
      ctx.strokeStyle = needle; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6)); ctx.stroke();
      ctx.fillStyle = needle; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a7fa0'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (c.shape === 'ring' || c.shape === 'double') {   // a dial: the needle sweeps once around (double: two windows)
      const cx = rcx, cy = rcy, R = 25 * K, ang = q => c.rot - Math.PI / 2 + q * Math.PI * 2;
      ctx.lineCap = 'butt';
      ctx.lineWidth = 10 * K; ctx.strokeStyle = '#1e2126'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      Z.forEach(z => { ctx.strokeStyle = '#3f9d5a'; ctx.beginPath(); ctx.arc(cx, cy, R, ang(z.g0), ang(z.g1)); ctx.stroke(); ctx.strokeStyle = '#d23b4a'; ctx.beginPath(); ctx.arc(cx, cy, R, ang(z.r0), ang(z.r1)); ctx.stroke(); });
      if (c.shape === 'double') { ctx.strokeStyle = 'rgba(195,178,255,0.5)'; ctx.lineWidth = 1.5 * K; ctx.beginPath(); ctx.arc(cx, cy, R + 8 * K, 0, Math.PI * 2); ctx.stroke(); }
      skulls(q => { const a = ang(q); return [cx + Math.cos(a) * (R + 9 * K), cy + Math.sin(a) * (R + 9 * K)]; });
      const a = ang(p);
      ctx.strokeStyle = needle; ctx.lineWidth = 3.5 * Math.sqrt(K); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R + 7 * K), cy + Math.sin(a) * (R + 7 * K)); ctx.stroke();
      ctx.fillStyle = needle; ctx.beginPath(); ctx.arc(cx, cy, 3.5 * Math.sqrt(K), 0, Math.PI * 2); ctx.fill();
    } else if (c.shape === 'spiral') {   // webs and spiders: the needle runs inward along a spiral (two turns)
      const cx = rcx, cy = rcy, pt = q => { const a = c.rot + q * Math.PI * 4, r = (31 - 23 * q) * K; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
      const seg = (q0, q1, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); const n = Math.max(2, Math.ceil((q1 - q0) * 120)); for (let k = 0; k <= n; k++) { const q = pt(q0 + (q1 - q0) * k / n); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.stroke(); };
      ctx.lineCap = 'round';
      seg(0, 1, '#1e2126', 7 * K);
      Z.forEach(z => { seg(z.g0, z.g1, '#3f9d5a', 7 * K); seg(z.r0, z.r1, '#d23b4a', 7 * K); });
      ctx.lineCap = 'butt';
      skulls(q => { const a = pt(q); return [a[0], a[1] - 10 * K]; });
      const q = pt(p); ctx.fillStyle = needle; ctx.beginPath(); ctx.arc(q[0], q[1], 5 * K, 0, Math.PI * 2); ctx.fill();
    } else {   // a pulse: the white ring closes in; tap when it lies on the green (or the red, further in)
      const cx = rcx, cy = rcy, RM = 31 * K, rad = q => RM * (1 - q);
      const band = (q0, q1, col) => { const ro = rad(q0), ri = Math.max(0, Math.min(rad(q1), ro - 3.5 * K)); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, ro, 0, Math.PI * 2); ctx.arc(cx, cy, ri, 0, Math.PI * 2, true); ctx.fill(); };
      band(0, 1, '#1e2126'); band(c.g0, c.g1, '#3f9d5a'); band(c.r0, c.r1, '#d23b4a');
      ctx.fillStyle = '#ffffff';
      if (c.lethalOk) ctx.fillText('☠', cx + RM * 0.72, cy - RM * 0.72);
      if (c.lethalCrit) ctx.fillText('☠', cx + RM * 0.72, cy + RM * 0.72);
      ctx.strokeStyle = needle; ctx.lineWidth = 3 * Math.sqrt(K); ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, rad(p)), 0, Math.PI * 2); ctx.stroke();
    }
    if (legend && !round) {
      ctx.fillStyle = '#8e939a'; ctx.font = '500 11px "Alegreya Sans", system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(LEG, bx, by + h + 12, w);
    }
  }
  function drawNextWave() {
    const list = run.next || [];
    if (!list.length) { uiRects.list = null; return; }
    if (!UI.listOpen) {
      const hh = drawChips(list.map(e => ({ T: HEROES[e.type], R: levelStats(e.lvl), lvl: e.lvl, boss: e.boss })));
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
      ctx.fillStyle = '#1a1424'; ctx.font = numFont(8, true); ctx.textAlign = 'center'; ctx.fillText(T0.letter, 16, y + 0.5);
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
    ctx.fillStyle = 'rgba(5,6,8,0.35)'; ctx.fillRect(0, 0, cw, ch);
    if (run.tut >= 0) return;   // the tutorial coach sits where the plate would be
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
