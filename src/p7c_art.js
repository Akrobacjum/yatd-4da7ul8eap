
  /* ================= 1.26: pictures painted in code (p7c_art.js) ================= */
  // (author, 25.10: painterly pixel-art illustrations for the cards and the new systems, and horizontal little scenes on the build
  // tiles instead of one icon, all drawn in code.) Every picture is painted with plain canvas shapes at its native size (a tile is
  // 72 x 36, a card 72 x 48), lit by a warm candle and cooled in the shadows, then snapped to one 32-colour palette (the interface
  // tokens and the dungeon's own stone, wood, flesh and fire) with a light ordered dither: the soft edges of the shapes turn into
  // hand-placed patches of colour. A picture is painted once, on first use, and kept: the canvas for the map, a data URL for
  // the page. Shown without smoothing (image-rendering: pixelated), one picture pixel = one CSS pixel on a tile.
  const ART = (() => {
    // the palette: 8 stone greys (from the void to bone), 4 cold blues for the shadows and steel, 4 woods, gold, fire, blood,
    // dread violet, goblin green and skin
    const HEX = ['#09090b', '#16171c', '#24262d', '#363a42', '#50555e', '#767b84', '#a4a8ae', '#e6e1d6',
      '#1d2633', '#33475a', '#6f9aa8', '#a9d4da',
      '#2a1b12', '#4d3220', '#7a5432', '#b08850',
      '#c4a052', '#f0d890', '#e0643c', '#ffb35c', '#fff1c8',
      '#460a10', '#8c1a24', '#cc3640', '#ff4f5e',
      '#2c2048', '#5a479a', '#a08ce8',
      '#2e4420', '#5c8c3a', '#9cc27e', '#d9a07a'];
    const RGB = HEX.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const C = {   // names for the palette, for the painters
      void: HEX[0], ink: HEX[1], st0: HEX[2], st1: HEX[3], st2: HEX[4], st3: HEX[5], st4: HEX[6], bone: HEX[7],
      cold0: HEX[8], cold1: HEX[9], steel: HEX[10], ice: HEX[11],
      wd0: HEX[12], wd1: HEX[13], wd2: HEX[14], tan: HEX[15],
      gold: HEX[16], goldHi: HEX[17], ember: HEX[18], flame: HEX[19], hot: HEX[20],
      bl0: HEX[21], bl1: HEX[22], bl2: HEX[23], ess: HEX[24],
      vi0: HEX[25], vi1: HEX[26], vi2: HEX[27],
      gr0: HEX[28], gr1: HEX[29], gr2: HEX[30], skin: HEX[31]
    };
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const NEAR = new Int8Array(32768).fill(-1);   // 15-bit colour -> palette index, filled on demand
    function nearest(r, g, b) {
      const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let i = NEAR[k];
      if (i >= 0) return i;
      let best = 0, bd = 1e12;
      for (let j = 0; j < 32; j++) { const p = RGB[j], dr = r - p[0], dg = g - p[1], db = b - p[2], d = 2 * dr * dr + 4 * dg * dg + 3 * db * db; if (d < bd) { bd = d; best = j; } }
      NEAR[k] = best; return best;
    }
    // snap a painted canvas to the palette (alpha to 0 or 1); dith: how much the ordered dither shakes the colours (0 = none)
    function quantize(c, dith) {
      const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width;
      const s = dith === undefined ? 5 : dith;
      for (let i = 0, n = 0; i < a.length; i += 4, n++) {
        if (a[i + 3] < 110) { a[i + 3] = 0; continue; }
        const x = n % W, y = (n / W) | 0, o = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * s;
        const p = RGB[nearest(clamp(a[i] + o, 0, 255), clamp(a[i + 1] + o, 0, 255), clamp(a[i + 2] + o, 0, 255))];
        a[i] = p[0]; a[i + 1] = p[1]; a[i + 2] = p[2]; a[i + 3] = 255;
      }
      g.putImageData(d, 0, 0);
      return c;
    }
    function rnd(seed) { let t = (seed * 2654435761) >>> 0 || 1; return () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), t | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
    const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) + 1; };
    // a painter: plain shapes on a small canvas, in picture pixels
    function pic(w, h, seed) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'), R = rnd(seed || 1);
      const P = {
        c, g, w, h, R,
        rect(x, y, ww, hh, col) { g.fillStyle = col; g.fillRect(x, y, ww, hh); return P; },
        px(x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); return P; },
        oval(cx, cy, rx, ry, col, a0, a1) { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, Math.max(0.2, rx), Math.max(0.2, ry), 0, a0 || 0, a1 === undefined ? Math.PI * 2 : a1); g.fill(); return P; },
        ring(cx, cy, rx, ry, col, lw) { g.strokeStyle = col; g.lineWidth = lw || 1; g.beginPath(); g.ellipse(cx, cy, Math.max(0.2, rx), Math.max(0.2, ry), 0, 0, Math.PI * 2); g.stroke(); return P; },
        arc(cx, cy, r, a0, a1, col, lw) { g.strokeStyle = col; g.lineWidth = lw || 1; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); return P; },
        poly(pts, col) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); return P; },
        line(x0, y0, x1, y1, col, lw) { g.strokeStyle = col; g.lineWidth = lw || 1; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.lineCap = 'butt'; return P; },
        path(pts, col, lw) { g.strokeStyle = col; g.lineWidth = lw || 1; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); g.lineCap = 'butt'; return P; },
        vgrad(x, y, ww, hh, c0, c1) { const q = g.createLinearGradient(0, y, 0, y + hh); q.addColorStop(0, c0); q.addColorStop(1, c1); g.fillStyle = q; g.fillRect(x, y, ww, hh); return P; },
        hgrad(x, y, ww, hh, c0, c1) { const q = g.createLinearGradient(x, 0, x + ww, 0); q.addColorStop(0, c0); q.addColorStop(1, c1); g.fillStyle = q; g.fillRect(x, y, ww, hh); return P; },
        // light that adds (a candle, a glow) and shade that cools and darkens
        glow(cx, cy, r, col, a) { const q = g.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, rgbaOf(col, a === undefined ? 0.5 : a)); q.addColorStop(1, rgbaOf(col, 0)); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = q; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.restore(); return P; },
        shade(cx, cy, r, a) { const q = g.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, 'rgba(12,16,26,' + (a === undefined ? 0.5 : a) + ')'); q.addColorStop(1, 'rgba(12,16,26,0)'); g.fillStyle = q; g.fillRect(cx - r, cy - r, r * 2, r * 2); return P; },
        shadow(cx, cy, rx, ry, a) { g.fillStyle = 'rgba(6,6,10,' + (a === undefined ? 0.55 : a) + ')'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); return P; },
        // cold dark at the edges, a warm pool of light at (lx, ly): the look of every scene
        light(lx, ly, r, warm) {
          g.save(); g.globalCompositeOperation = 'multiply';
          const q = g.createRadialGradient(lx, ly, r * 0.15, lx, ly, r * 1.25); q.addColorStop(0, '#ffffff'); q.addColorStop(0.55, '#aab0c2'); q.addColorStop(1, '#3a4458');
          g.fillStyle = q; g.fillRect(0, 0, w, h); g.restore();
          if (warm !== 0) P.glow(lx, ly, r * 0.7, '#ff9a4a', warm === undefined ? 0.12 : warm);
          return P;
        },
        // hand-placed patches: n dabs of 1-2 px in the colours given, inside a box
        dabs(x, y, ww, hh, cols, n) { for (let i = 0; i < n; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; g.fillRect(Math.round(x + R() * ww), Math.round(y + R() * hh), R() < 0.3 ? 2 : 1, 1); } return P; },
        // a figure of the game (the same pixel sprite the map uses), feet at (cx, feet), k whole pixels per sprite pixel
        fig(type, cx, feet, k, flip, frame) {
          const s = sprite(type, frame || 0, false); k = k || 1;
          g.save(); g.imageSmoothingEnabled = false;
          if (flip) { g.translate(Math.round(cx), 0); g.scale(-1, 1); g.drawImage(s, Math.round(-s.width * k / 2), Math.round(feet - s.height * k), s.width * k, s.height * k); }
          else g.drawImage(s, Math.round(cx - s.width * k / 2), Math.round(feet - s.height * k), s.width * k, s.height * k);
          g.restore(); return P;
        },
        // text in the number font (small signs on pictures: x2, +1)
        txt(s, x, y, col, size) { g.font = '400 ' + (size || 9) + 'px "Jersey 10", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(8,8,10,0.9)'; g.fillText(s, x + 1, y + 1); g.fillStyle = col; g.fillText(s, x, y); return P; }
      };
      return P;
    }
    function rgbaOf(hex, a) { if (hex[0] !== '#') return hex; return 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')'; }
    const CACHE = new Map(), URLS = new Map();
    function keep(key, make) { let c = CACHE.get(key); if (!c) { try { c = make(); } catch (e) { c = null; } CACHE.set(key, c); } return c; }
    function url(key, make) { let u = URLS.get(key); if (u === undefined) { const c = keep(key, make); u = c ? c.toDataURL() : ''; URLS.set(key, u); } return u; }
    const api = { C, HEX, pic, quantize, rnd, hash, keep, url, rgbaOf };
    return api;
  })();
  window.__ART = ART;
  // ---------- the stage: back walls, floors, a torch; every tile scene stands on one of these ----------
  (() => {
    const { C, pic, quantize, hash } = ART, W = 72, H = 36;
    const pick = (P, arr) => arr[(P.R() * arr.length) | 0];
    function bricks(P, x0, y0, x1, y1, o) {   // dressed stone, courses rh high
      o = o || {}; const rh = o.rh || 4, cols = o.cols || [C.st0, C.st1, C.st1, C.cold0, C.st0];
      P.rect(x0, y0, x1 - x0, y1 - y0, o.mortar || C.void);
      for (let y = y0, row = 0; y < y1; y += rh, row++) {
        let x = x0 - ((row * 5 + (o.off || 0)) % 11);
        while (x < x1) {
          const bw = 8 + ((P.R() * 4) | 0), col = pick(P, cols);
          P.rect(x + 1, y + 1, bw - 1, rh - 1, col);
          P.rect(x + 1, y + 1, bw - 1, 1, o.hi || C.st1);
          if (P.R() < 0.3) P.px(x + 2 + ((P.R() * (bw - 3)) | 0), y + 2, C.ink);
          x += bw;
        }
      }
      return P;
    }
    function rocks(P, x0, y0, x1, y1) {   // raw cave rock: jittered facets
      P.rect(x0, y0, x1 - x0, y1 - y0, C.st0);
      for (let i = 0; i < 26; i++) {
        const x = x0 + P.R() * (x1 - x0), y = y0 + P.R() * (y1 - y0), r = 3 + P.R() * 5;
        P.poly([x - r, y + r * 0.4, x - r * 0.3, y - r * 0.8, x + r * 0.7, y - r * 0.5, x + r, y + r * 0.5, x, y + r * 0.9], pick(P, [C.st1, C.st1, C.st2, C.cold1, C.st0]));
        P.line(x - r * 0.3, y - r * 0.8, x + r * 0.7, y - r * 0.5, C.st3, 1);
      }
      return P;
    }
    function flags(P, y0, o) {   // flagstones going away from you: rows grow taller towards the bottom
      o = o || {}; const cols = o.cols || [C.st0, C.st1, C.st0, C.cold0];
      P.rect(0, y0, W, H - y0, C.void);
      let y = y0, row = 0;
      while (y < H) {
        const rh = 3 + row, sw = 9 + row * 4;
        let x = -((row * 7) % sw);
        while (x < W) {
          const col = pick(P, cols);
          P.rect(x + 1, y + 1, sw - 1, rh - 1, col);
          P.rect(x + 1, y + 1, sw - 1, 1, row > 1 ? C.st1 : C.st0);
          if (P.R() < 0.35) P.dabs(x + 2, y + 2, sw - 4, rh - 3, [C.ink, C.st1, C.cold0], 1);
          x += sw;
        }
        y += rh; row++;
      }
      P.vgrad(0, y0, W, 3, 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)');   // the foot of the wall
      return P;
    }
    function torch(P, x, y) {   // a sconce on the wall; the flame is drawn after the light (it is the light)
      P.rect(x - 1, y, 3, 4, C.wd1).rect(x - 2, y + 3, 5, 1, C.st3).rect(x - 1, y - 1, 3, 1, C.st2);
      P.after(() => { P.glow(x + 0.5, y - 2, 6, '#ffb060', 0.3); P.oval(x + 0.5, y - 2.5, 1.8, 3, C.ember); P.oval(x + 0.5, y - 2, 1, 2, C.flame); P.px(x, y - 2, C.hot); });
      return P;
    }
    // the scene kinds: 'floor' (a back wall and a floor, the thing stands on the floor), 'wall' (mostly wall, the thing hangs on
    // it), 'door' (an arched doorway in the middle), 'cave' (raw rock instead of bricks)
    function stage(P, kind, o) {
      o = o || {};
      const tx = o.torch === undefined || o.torch === null ? (hash(o.key || 'x') % 3 ? 9 : 63) : o.torch;
      if (kind === 'wall') { bricks(P, 0, 0, W, 29, o); flags(P, 29, o); }
      else if (kind === 'door') {
        bricks(P, 0, 0, W, 29, o); flags(P, 29, o);
        P.rect(25, 9, 22, 20, C.st2).oval(36, 9, 11, 7, C.st2);   // the arch's stones
        P.rect(27, 10, 18, 19, C.void).oval(36, 10, 9, 6, C.void);   // the dark beyond
        P.vgrad(27, 18, 18, 11, 'rgba(60,70,90,0)', 'rgba(60,70,90,0.35)');
      } else if (kind === 'cave') { rocks(P, 0, 0, W, 13); flags(P, 13, { cols: [C.st1, C.st0, C.st1, C.cold1] }); }
      else if (kind === 'dark') { P.rect(0, 0, W, H, C.ink); flags(P, 14, { cols: [C.st0, C.st1, C.st0, C.cold0] }); }
      else { bricks(P, 0, 0, W, 13, o); flags(P, 13, o); }
      if (o.torch !== undefined && o.torch !== null && kind !== 'dark') torch(P, tx, kind === 'floor' || kind === 'cave' ? 5 : 9);
      return tx;
    }
    // paint a whole scene: stage, the thing, the light pass, what glows, the palette
    function scene(key, kind, draw, o) {
      o = o || {}; o.key = key;
      const P = pic(W, H, hash(key)), posts = [];
      P.after = fn => { const m = P.g.getTransform(); posts.push(() => { P.g.save(); P.g.setTransform(m); fn(); P.g.restore(); }); return P; };
      const tx = kind === 'none' ? 36 : stage(P, kind, o);
      if (kind !== 'none') { P.rect(0, 0, W, H, 'rgba(9,9,12,0.18)'); P.glow(36, kind === 'wall' ? 15 : 22, 24, '#8a9ab8', 0.1); }
      draw(P, o);
      const lx = o.lx !== undefined ? o.lx : (tx < 36 ? 16 : 56), ly = o.ly !== undefined ? o.ly : 10;
      P.light(lx, ly, o.lr || 58, o.warm);
      posts.forEach(f => f());
      return quantize(P.c, o.dith);
    }
    Object.assign(ART, { bricks, rocks, flags, torch, stage, scene, W, H });
  })();
  // ---------- the things: one painter per element, drawn at a point (floor things: where they touch the floor; wall things:
  // their middle on the wall). The same painters make the tile scenes and the card pictures. ----------
  (() => {
    const { C } = ART;
    const EL = {};
    const steelCone = (P, x, y, h, w) => { P.poly([x - w, y, x, y - h, x + w, y], C.st4); P.poly([x, y - h, x + w, y, x + w * 0.2, y], C.st3); P.px(Math.round(x - 1), Math.round(y - h + 1), C.bone); };
    const chest = (P, x, y, w, h, wood, band) => {   // a small chest seen a little from above
      P.shadow(x, y, w * 0.62, 2.4);
      P.rect(x - w / 2, y - h, w, h, wood[1]).rect(x - w / 2, y - h, w, 2, wood[0]);
      P.rect(x - w / 2, y - h - 3, w, 3, wood[0]).rect(x - w / 2, y - h - 4, w, 1, C.tan);
      P.rect(x - w / 2 + 1, y - h - 4, 1, h + 4, band).rect(x + w / 2 - 2, y - h - 4, 1, h + 4, band);
      P.rect(x - 1, y - h - 1, 2, 3, C.goldHi);
    };
    const flameAt = (P, x, y, s, hot) => { P.oval(x, y - s * 0.55, s * 0.45, s * 0.75, hot ? C.ess : C.ember); P.oval(x, y - s * 0.45, s * 0.28, s * 0.5, C.flame); P.oval(x, y - s * 0.35, s * 0.12, s * 0.25, C.hot); };
    const skull = (P, x, y, s, col, eye) => { P.oval(x, y, s, s * 0.9, col || C.bone).rect(x - s * 0.55, y + s * 0.5, s * 1.1, s * 0.55, col || C.bone); P.rect(Math.round(x - s * 0.55), Math.round(y - s * 0.1), Math.max(1, Math.round(s * 0.42)), Math.max(1, Math.round(s * 0.42)), eye || C.ink); P.rect(Math.round(x + s * 0.15), Math.round(y - s * 0.1), Math.max(1, Math.round(s * 0.42)), Math.max(1, Math.round(s * 0.42)), eye || C.ink); };
    const bone = (P, x0, y0, x1, y1, col) => { P.line(x0, y0, x1, y1, col || C.bone, 2); P.oval(x0, y0, 1.6, 1.3, col || C.bone).oval(x1, y1, 1.6, 1.3, col || C.bone); };
    const plate = (P, x, y, rx, ry) => { P.oval(x, y, rx + 1, ry + 1, C.ink).oval(x, y, rx, ry, C.st0).oval(x, y - 0.5, rx - 1, ry - 0.8, C.st1); };
    const coin = (P, x, y, c0) => { P.oval(x, y, 2.4, 1.3, C.wd2).oval(x, y - 0.5, 2.2, 1.1, c0 || C.gold).px(Math.round(x - 1), Math.round(y - 1), C.goldHi); };
    const bars = (P, x0, y0, x1, y1, n, col) => { for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n); P.rect(x, y0, 1, y1 - y0, col || C.st4); P.px(x, y0, C.bone); } };
    Object.assign(ART, { EL, steelCone, chest, flameAt, skull, bone, plate, coin, bars });

    // traps on the floor
    EL.spikes = (P, x, y) => {
      plate(P, x, y - 1, 12, 3.5);
      [[-7, 7], [-3.5, 10], [0, 12], [3.5, 10], [7, 7]].forEach(([dx, h], i) => steelCone(P, x + dx, y - 1 + (i % 2 ? 1 : 0), h, 1.8));
      P.after(() => { P.px(x - 1, y - 12, C.hot); P.rect(x + 3, y - 6, 1, 2, C.bl2); });
    };
    EL.web = (P, x, y) => {
      const cx = x, cy = y - 8;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; P.line(cx, cy, cx + Math.cos(a) * 17, cy + Math.sin(a) * 9, 'rgba(225,230,245,0.75)', 0.8); }
      [5, 10, 15].forEach((r, i) => { const pts = []; for (let k = 0; k <= 8; k++) { const a = k * Math.PI / 4 + 0.2; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55); } P.path(pts, i === 2 ? 'rgba(200,210,230,0.55)' : 'rgba(230,236,250,0.8)', 0.8); });
      P.oval(cx + 6, cy + 2, 1.5, 1.2, C.bone);
    };
    EL.trapdoor = (P, x, y, open) => {
      P.poly([x - 14, y, x + 12, y, x + 16, y - 9, x - 10, y - 9], C.ink);
      P.poly([x - 13, y - 1, x - 1, y - 1, x + 2, y - 8, x - 9, y - 8], C.wd1);
      P.poly([x + 1, y - 1, x + 11, y - 1, x + 14, y - 8, x + 4, y - 8], open ? C.void : C.wd1);
      for (let k = 0; k < 3; k++) P.line(x - 12 + k * 4, y - 1, x - 8 + k * 4, y - 8, C.wd0, 1);
      if (!open) for (let k = 0; k < 3; k++) P.line(x + 3 + k * 3.5, y - 1, x + 6 + k * 3.5, y - 8, C.wd0, 1);
      else { P.poly([x + 4, y - 8, x + 14, y - 8, x + 16, y - 20, x + 6, y - 20], C.wd2); P.line(x + 6, y - 20, x + 16, y - 20, C.tan, 1); }
      P.rect(x - 7, y - 5, 3, 2, C.st3).rect(x + 5, y - 5, 3, 2, C.st3);
    };
    EL.cage = (P, x, y) => {
      P.shadow(x, y, 11, 2.5);
      P.rect(x - 10, y - 21, 20, 2, C.st3).rect(x - 10, y - 1, 20, 2, C.st3);
      bars(P, x - 10, y - 20, x + 10, y - 1, 5, C.st4);
      P.oval(x, y - 22, 10, 2.5, C.st3).rect(x - 1, y - 27, 2, 5, C.st2);
      P.rect(x + 4, y - 14, 1, 7, C.st2);
      P.after(() => P.px(x - 6, y - 18, C.bone));
    };
    EL.bones = (P, x, y) => {
      P.shadow(x, y, 11, 2.5);
      bone(P, x - 10, y - 1, x + 6, y - 4, C.st4); bone(P, x - 7, y - 5, x + 10, y - 1);
      skull(P, x + 1, y - 7, 4.2); P.rect(x - 1, y - 4, 4, 1, C.st3);
    };
    EL.coffin = (P, x, y, open) => {
      P.shadow(x, y, 15, 3);
      P.poly([x - 15, y - 2, x - 11, y - 9, x + 11, y - 9, x + 15, y - 4, x + 12, y, x - 12, y], C.wd0);
      P.poly([x - 14, y - 3, x - 10, y - 10, x + 10, y - 10, x + 14, y - 5, x + 11, y - 1, x - 11, y - 1], C.wd1);
      P.line(x - 8, y - 6, x + 8, y - 6, C.tan, 1).line(x - 3, y - 9, x - 3, y - 2, C.tan, 1);
      if (open) { P.poly([x - 9, y - 11, x + 11, y - 12, x + 13, y - 16, x - 7, y - 15], C.wd2); P.after(() => { P.px(x - 2, y - 9, C.ess).px(x + 1, y - 9, C.ess); }); }
    };
    // traps on the walls
    EL.arrows = (P, x, y) => {
      P.rect(x - 13, y - 4, 26, 9, C.st0).rect(x - 12, y - 3, 24, 7, C.st2).rect(x - 12, y - 3, 24, 1, C.st3);
      [-7, 0, 7].forEach(dx => P.oval(x + dx, y + 0.5, 2, 2, C.void));
      P.after(() => [-3, 5].forEach((dy, i) => { const ax = x + 11 + i * 3; P.line(ax, y + dy - 2, ax + 9, y + dy - 2, C.tan, 1); P.poly([ax + 9, y + dy - 4, ax + 13, y + dy - 2, ax + 9, y + dy], C.st4); P.rect(ax, y + dy - 3, 2, 1, C.bl2).rect(ax, y + dy - 1, 2, 1, C.bl2); P.line(ax - 6, y + dy - 2, ax - 2, y + dy - 2, 'rgba(230,225,214,0.35)', 1); }));
    };
    EL.fire = (P, x, y) => {
      P.oval(x, y, 7, 7, C.st0).oval(x, y, 5.5, 5.5, C.st3).oval(x, y, 3.5, 3.5, C.void);
      P.after(() => { P.glow(x + 8, y, 16, '#ff8a3a', 0.55); P.poly([x + 2, y - 3, x + 18, y - 6, x + 26, y, x + 18, y + 6, x + 2, y + 3], C.ember); P.poly([x + 2, y - 2, x + 14, y - 3, x + 20, y, x + 14, y + 3, x + 2, y + 2], C.flame); P.poly([x + 2, y - 1, x + 9, y - 1, x + 12, y, x + 9, y + 1, x + 2, y + 1], C.hot); });
    };
    EL.portrait = (P, x, y, hot) => {
      P.rect(x - 9, y - 11, 18, 22, C.wd0).rect(x - 8, y - 10, 16, 20, C.gold).rect(x - 8, y - 10, 16, 1, C.goldHi).rect(x - 8, y - 10, 1, 20, C.goldHi);
      P.rect(x - 6, y - 8, 12, 16, C.vi0).vgrad(x - 6, y - 8, 12, 16, 'rgba(60,40,90,0.4)', 'rgba(10,8,14,0.6)');
      P.oval(x, y - 1, 3.5, 4.5, C.st3).rect(x - 5, y + 4, 10, 4, C.ink).oval(x, y + 6, 5, 2.5, C.st1);
      P.after(() => { P.px(x - 2, y - 2, hot ? C.ess : C.goldHi).px(x + 1, y - 2, hot ? C.ess : C.goldHi); P.glow(x, y - 2, 5, '#ffe080', 0.25); });
    };
    EL.eyes = (P, x, y) => {
      P.poly([x - 13, y, x - 6, y - 4, x + 6, y - 3, x + 13, y + 1, x + 5, y + 4, x - 7, y + 3], C.void);
      P.after(() => [-5, 5].forEach(dx => { P.oval(x + dx, y, 2.6, 1.6, C.goldHi); P.rect(x + dx, y - 1, 1, 2, C.ink); P.glow(x + dx, y, 6, '#ffe066', 0.4); }));
    };
    EL.mirror = (P, x, y) => {
      P.oval(x, y, 8, 11, C.wd1).oval(x, y, 7, 10, C.gold).oval(x, y, 5.5, 8.5, C.cold1);
      P.vgrad(x - 5, y - 8, 11, 17, 'rgba(169,212,218,0.45)', 'rgba(51,71,90,0.1)');
      P.oval(x + 1, y + 1, 2.5, 3.5, 'rgba(230,225,214,0.35)');
      P.after(() => { P.line(x - 3, y - 4, x - 1, y - 7, C.bone, 1); P.px(x - 3, y + 3, C.ice); });
    };
    // doors
    EL.gate = (P, x, y) => {   // a portcullis half down in the arch
      const top = y - 18, bot = y - 6;
      bars(P, x - 9, top, x + 9, bot, 6, C.st4);
      P.rect(x - 9, top + 4, 19, 1, C.st3).rect(x - 9, top + 9, 19, 1, C.st3);
      for (let k = 0; k <= 6; k++) { const bx = Math.round(x - 9 + k * 3); P.poly([bx - 1, bot, bx + 2, bot, bx + 0.5, bot + 3], C.st4); }
      P.rect(x - 11, top - 2, 23, 2, C.st1);
    };
    EL.creak = (P, x, y) => {   // a heavy door ajar, iron hinges, the creak drawn as two little arcs
      P.poly([x - 9, y - 1, x - 9, y - 19, x + 4, y - 22, x + 4, y + 1], C.wd1);
      for (let k = 1; k < 4; k++) P.line(x - 9 + k * 3.2, y - 19 - k * 0.7, x - 9 + k * 3.2, y - 1 + k * 0.5, C.wd0, 1);
      P.rect(x - 10, y - 17, 6, 2, C.st3).rect(x - 10, y - 6, 6, 2, C.st3).px(x + 2, y - 10, C.gold);
      P.after(() => { P.arc(x - 12, y - 16, 3, Math.PI * 0.8, Math.PI * 1.3, C.bone, 1); P.arc(x - 12, y - 16, 5.5, Math.PI * 0.8, Math.PI * 1.3, 'rgba(230,225,214,0.5)', 1); });
    };
    // on furniture
    EL.crateBox = (P, x, y, w, h) => {
      w = w || 16; h = h || 13;
      P.shadow(x, y, w * 0.65, 2.5);
      P.rect(x - w / 2, y - h, w, h, C.wd1).rect(x - w / 2, y - h, w, 2, C.wd2).rect(x - w / 2, y - h, 1, h, C.wd2);
      P.line(x - w / 2 + 1, y - 1, x + w / 2 - 1, y - h + 2, C.wd0, 1.4).line(x - w / 2 + 1, y - h + 2, x + w / 2 - 1, y - 1, C.wd0, 1.4);
      P.rect(x - w / 2, y - h - 3, w, 3, C.wd2).rect(x - w / 2, y - h - 3, w, 1, C.tan);
    };
    EL.powder = (P, x, y) => {
      EL.crateBox(P, x - 4, y, 18, 10);
      const kx = x - 4, ky = y - 13;
      P.rect(kx - 5, ky - 9, 10, 9, C.st0).oval(kx, ky - 9, 5, 1.6, C.st2).rect(kx - 5, ky - 7, 10, 1, C.st3).rect(kx - 5, ky - 3, 10, 1, C.st3);
      P.txt('☠', kx, ky - 4.5, C.bone, 6);
      P.path([kx + 2, ky - 10, kx + 6, ky - 13, kx + 9, ky - 12], C.tan, 1);
      P.after(() => { P.px(kx + 9, ky - 13, C.hot).px(kx + 10, ky - 14, C.flame).px(kx + 8, ky - 14, C.ember); P.glow(kx + 9, ky - 13, 6, '#ffc060', 0.6); });
    };
    EL.mimic = (P, x, y) => {
      P.shadow(x, y, 13, 3);
      P.rect(x - 12, y - 9, 24, 9, C.wd1).rect(x - 12, y - 9, 24, 1, C.wd2).rect(x - 11, y - 9, 1, 9, C.gold).rect(x + 10, y - 9, 1, 9, C.gold);
      P.poly([x - 12, y - 10, x + 12, y - 10, x + 11, y - 19, x - 11, y - 18], C.wd2);
      P.rect(x - 12, y - 11, 24, 2, C.bl0);
      for (let k = 0; k < 6; k++) { P.poly([x - 11 + k * 4, y - 11, x - 9 + k * 4, y - 8, x - 7 + k * 4, y - 11], C.bone); P.poly([x - 11 + k * 4, y - 10, x - 9 + k * 4, y - 13, x - 7 + k * 4, y - 10], C.bone); }
      P.poly([x - 2, y - 9, x + 5, y - 9, x + 9, y - 3, x + 4, y - 4], C.bl2);
      P.after(() => { P.oval(x - 5, y - 15, 1.8, 1.4, C.goldHi).oval(x + 5, y - 15, 1.8, 1.4, C.goldHi).px(x - 5, y - 15, C.ink).px(x + 5, y - 15, C.ink); });
    };
    EL.musicbox = (P, x, y) => {
      EL.crateBox(P, x, y, 22, 8);
      const by = y - 11;
      P.rect(x - 7, by - 6, 14, 6, C.bl1).rect(x - 7, by - 6, 14, 1, C.bl2).rect(x - 7, by - 7, 14, 1, C.gold);
      P.poly([x - 7, by - 7, x + 7, by - 7, x + 6, by - 15, x - 6, by - 14], C.bl1); P.rect(x - 5, by - 13, 10, 5, C.cold1);
      P.rect(x - 1, by - 12, 2, 5, C.bone).oval(x, by - 13, 1.5, 1.5, C.skin);
      P.after(() => { P.txt('♪', x + 11, by - 12, C.vi2, 8); P.txt('♫', x - 12, by - 15, C.vi2, 7); });
    };
    EL.loot = (P, x, y) => { P.shadow(x, y, 11, 2.5); [[-6, 0], [-2, 1], [3, 0], [7, -1], [-4, -2], [1, -2], [5, -3], [-1, -4], [3, -5]].forEach(([dx, dy], i) => coin(P, x + dx, y - 1 + dy, i % 3 ? C.gold : C.goldHi)); P.after(() => { P.px(x + 3, y - 8, C.hot); P.px(x - 6, y - 4, C.goldHi); }); };
    EL.lpotion = (P, x, y) => {
      P.shadow(x, y, 6, 1.8);
      P.oval(x, y - 6, 6, 6, 'rgba(200,215,240,0.55)').oval(x, y - 5, 5, 4, C.gr1).oval(x, y - 7, 5, 1.2, C.gr2);
      P.rect(x - 2, y - 15, 4, 5, 'rgba(200,215,240,0.6)').rect(x - 2, y - 17, 4, 2, C.wd2);
      P.after(() => { P.px(x - 3, y - 9, C.bone).px(x - 3, y - 8, C.ice); P.glow(x, y - 6, 8, '#8be38f', 0.25); });
    };
    EL.loot2 = (P, x, y) => { P.after(() => P.glow(x, y - 6, 15, '#6fb7ff', 0.4)); chest(P, x, y, 18, 8, [C.wd2, C.wd1], C.st4); P.after(() => P.px(x - 1, y - 11, C.ice)); };
    EL.loot3 = (P, x, y) => {
      P.after(() => P.glow(x, y - 9, 18, '#ff8a3c', 0.55));
      P.shadow(x, y, 7, 2);
      P.poly([x - 7, y - 19, x + 7, y - 19, x + 6, y - 13, x + 1, y - 10, x - 1, y - 10, x - 6, y - 13], C.gold);
      P.rect(x - 1, y - 10, 2, 7, C.gold).rect(x - 5, y - 3, 10, 2, C.gold).rect(x - 6, y - 19, 3, 6, C.goldHi);
      P.after(() => { P.oval(x, y - 16, 1.5, 1.5, C.ess); P.px(x - 5, y - 18, C.hot); });
    };
    EL.lcursed = (P, x, y) => { P.after(() => P.glow(x, y - 6, 15, '#b48cff', 0.4)); chest(P, x, y, 18, 8, [C.wd1, C.wd0], C.vi1); P.after(() => { P.txt('☠', x, y - 6, C.vi2, 7); }); };
    // buildings (they block the way like a crate)
    EL.crate = (P, x, y) => { EL.crateBox(P, x - 6, y, 15, 12); EL.crateBox(P, x + 7, y + 1, 13, 10); EL.crateBox(P, x + 1, y - 12, 12, 9); };
    EL.rune = (P, x, y) => {
      P.shadow(x, y, 8, 2.2);
      P.poly([x - 7, y, x - 6, y - 20, x + 1, y - 24, x + 7, y - 19, x + 7, y], C.st2); P.poly([x + 1, y - 24, x + 7, y - 19, x + 7, y, x + 1, y], C.st1);
      P.after(() => { P.path([x - 2, y - 18, x - 2, y - 5], C.ice, 1); P.path([x - 2, y - 14, x + 3, y - 17], C.ice, 1); P.path([x - 2, y - 10, x + 3, y - 13], C.ice, 1); P.glow(x, y - 12, 10, '#8cc8ff', 0.4); });
    };
    EL.altar = (P, x, y) => {
      P.shadow(x, y, 15, 3);
      P.rect(x - 13, y - 10, 26, 10, C.bl0).rect(x - 14, y - 12, 28, 3, C.bl1).rect(x - 14, y - 12, 28, 1, C.bl2);
      P.rect(x - 10, y - 8, 20, 1, C.bl1).txt('✝', x, y - 5, C.gold, 7);
      [-9, 9].forEach(dx => P.rect(x + dx - 1, y - 18, 2, 6, C.bone));
      P.after(() => [-9, 9].forEach(dx => { flameAt(P, x + dx, y - 18, 4); P.glow(x + dx, y - 20, 8, '#ffb060', 0.4); }));
    };
    EL.decoy = (P, x, y) => {   // a fake heart's crystal on a stand, a snare in the shadow under it
      P.shadow(x, y, 10, 2.5);
      P.rect(x - 4, y - 10, 8, 10, C.st2).rect(x - 6, y - 12, 12, 2, C.st3).rect(x - 6, y - 1, 12, 1, C.st1);
      P.poly([x, y - 22, x + 4, y - 16, x, y - 12, x - 4, y - 16], C.bl2); P.poly([x, y - 22, x + 4, y - 16, x, y - 16], C.ess);
      P.after(() => { P.px(x - 1, y - 19, C.hot); P.glow(x, y - 17, 9, '#ff6a7a', 0.35); P.path([x - 12, y - 1, x - 9, y - 3, x - 6, y - 1], C.st4, 1); P.path([x + 6, y - 1, x + 9, y - 3, x + 12, y - 1], C.st4, 1); });
    };
    EL.acid = (P, x, y) => {
      P.shadow(x, y, 12, 3);
      P.rect(x - 10, y - 9, 20, 9, C.st1).oval(x, y, 10, 2, C.st1).oval(x, y - 9, 10, 2.6, C.st2).oval(x, y - 9, 8.5, 2, C.gr1).oval(x - 1, y - 9.5, 5, 1, C.gr2);
      P.rect(x, y - 9, 10, 9, 'rgba(0,0,0,0.25)');
      P.after(() => { P.oval(x - 3, y - 13, 1.4, 1.4, C.gr2).oval(x + 2, y - 16, 1, 1, C.gr2).px(x + 5, y - 12, C.gr2); P.glow(x, y - 10, 10, '#7fe05a', 0.3); P.rect(x + 6, y - 7, 1, 3, C.gr2); });
    };
    EL.veil = (P, x, y) => {
      P.shadow(x, y, 14, 2.5);
      P.rect(x - 14, y - 24, 2, 24, C.wd1).rect(x + 12, y - 24, 2, 24, C.wd1).rect(x - 15, y - 25, 30, 2, C.wd0);
      for (let k = 0; k < 6; k++) P.poly([x - 12 + k * 4, y - 23, x - 8 + k * 4, y - 23, x - 7 + k * 4 + (k % 2), y - 1, x - 12 + k * 4 + (k % 2), y - 1], k % 2 ? C.vi0 : C.vi1);
      P.line(x - 12, y - 22, x + 12, y - 22, C.gold, 1);
    };
    EL.howl = (P, x, y) => {
      P.shadow(x, y, 9, 2.4);
      P.poly([x - 8, y, x - 9, y - 12, x - 2, y - 22, x + 5, y - 19, x + 8, y - 8, x + 8, y], C.st2); P.poly([x + 1, y - 21, x + 5, y - 19, x + 8, y - 8, x + 8, y, x + 2, y], C.st1);
      P.oval(x - 2, y - 14, 2, 3, C.void).oval(x + 3, y - 7, 1.5, 1.6, C.void);
      P.after(() => { [5, 8].forEach((r, i) => { P.arc(x + 1, y - 13, r + 6, -0.6, 0.6, i ? 'rgba(115,214,198,0.45)' : 'rgba(115,214,198,0.85)', 1); P.arc(x - 1, y - 13, r + 6, Math.PI - 0.6, Math.PI + 0.6, i ? 'rgba(115,214,198,0.45)' : 'rgba(115,214,198,0.85)', 1); }); });
    };
    EL.shackles = (P, x, y) => {
      P.shadow(x, y, 9, 2.4);
      P.rect(x - 2, y - 24, 4, 24, C.st1).rect(x - 2, y - 24, 1, 24, C.st3).rect(x - 3, y - 25, 6, 2, C.st2);
      [-1, 1].forEach(s => { for (let k = 0; k < 5; k++) P.ring(x + s * (3 + k * 2), y - 19 + k * 3.2, 1.2, 0.9, C.st4, 1); P.ring(x + s * 13, y - 2, 2.6, 1.4, C.st4, 1.2); });
    };
    EL.fortify = (P, x, y) => {
      P.shadow(x, y, 16, 3);
      P.rect(x - 15, y - 16, 30, 16, C.st2).rect(x - 15, y - 16, 30, 2, C.st3);
      ART.bricks(P, x - 14, y - 14, x + 15, y, { rh: 4, cols: [C.st2, C.st3, C.st2], hi: C.st4, mortar: C.st0 });
      for (let k = 0; k < 4; k++) P.rect(x - 15 + k * 8, y - 20, 5, 4, C.st3);
    };
    // monsters: the game's own figures, with a prop of their own
    const monster = (type, prop) => (P, x, y) => { P.shadow(x, y, type === 'ogre' ? 9 : 7, 2.2); if (prop) prop(P, x, y); P.fig(type, x, y + 1, 1, false, 0); };
    EL.goblin = monster('goblin', (P, x, y) => { bone(P, x - 16, y - 1, x - 9, y - 2, C.st4); P.rect(x + 9, y - 6, 4, 6, C.wd1).rect(x + 8, y - 7, 6, 1, C.wd2); });
    EL.archer = monster('archer', (P, x, y) => { P.after(() => { P.line(x + 10, y - 16, x + 24, y - 16, C.tan, 1); P.poly([x + 24, y - 18, x + 27, y - 16, x + 24, y - 14], C.st4); }); });
    EL.spider = monster('spider', (P, x, y) => { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; P.line(x - 18, y - 20, x - 18 + Math.cos(a) * 10, y - 20 + Math.sin(a) * 6, 'rgba(220,226,240,0.55)', 0.7); } P.line(x - 18, y - 20, x - 4, y - 8, 'rgba(220,226,240,0.6)', 0.7); });
    EL.ogre = (P, x, y) => { P.shadow(x, y, 10, 2.5); bone(P, x + 9, y - 1, x + 17, y - 3, C.st4); skull(P, x - 14, y - 3, 2.6); P.fig('ogre', x, y + 1, 1, false, 0); };
    EL.shaman = monster('shaman', (P, x, y) => { P.after(() => { P.glow(x + 5, y - 22, 9, '#8be38f', 0.45); P.px(x + 9, y - 25, C.gr2).px(x + 1, y - 27, C.gr2); }); });
    EL.ghost = (P, x, y) => { P.shadow(x, y, 6, 1.6, 0.35); P.g.globalAlpha = 0.85; P.fig('ghost', x, y - 3, 1, false, 1); P.g.globalAlpha = 1; P.after(() => P.glow(x, y - 16, 12, '#c8d8ff', 0.25)); };
    EL.shade = (P, x, y) => { P.shade(x, y - 12, 16, 0.6); P.fig('shade', x, y - 1, 1, false, 1); P.after(() => P.glow(x, y - 18, 5, '#b9a4ff', 0.4)); };
    EL.bats = (P, x, y) => { [[-10, -12, 0], [4, -20, 1], [12, -9, 0]].forEach(([dx, dy, f]) => P.fig('bat', x + dx, y + dy + 12, 1, dx > 0, f)); P.shadow(x, y, 9, 1.8, 0.3); };
    // tools and modes
    EL.dig = (P, x, y) => {
      P.poly([x - 6, y - 26, x + 9, y - 22, x + 11, y - 6, x - 3, y - 2], C.void);
      P.poly([x - 6, y - 26, x + 9, y - 22, x + 11, y - 6, x - 3, y - 2], 'rgba(0,0,0,0)');
      for (let k = 0; k < 6; k++) P.oval(x - 12 + k * 4.5, y + (k % 2) * 1.5, 1.8, 1.2, C.st2);
      P.line(x + 2, y - 2, x + 16, y - 20, C.wd2, 2); P.poly([x + 10, y - 25, x + 22, y - 19, x + 21, y - 17, x + 11, y - 22], C.st4);
      P.after(() => { P.txt('+', x + 2, y - 14, C.goldHi, 12); P.px(x + 18, y - 24, C.hot).px(x + 20, y - 22, C.flame); });
    };
    EL.tunnel = (P, x, y) => {
      P.rect(x - 12, y - 22, 24, 22, C.void).oval(x, y - 22, 12, 7, C.void);
      P.vgrad(x - 12, y - 22, 24, 22, 'rgba(255,170,90,0.0)', 'rgba(255,170,90,0.25)');
      P.rect(x - 14, y - 22, 2, 22, C.st3).rect(x + 12, y - 22, 2, 22, C.st3);
      P.after(() => { P.path([x - 8, y - 9, x + 6, y - 9], C.goldHi, 1.4); P.poly([x + 6, y - 12, x + 10, y - 9, x + 6, y - 6], C.goldHi); P.path([x + 8, y - 15, x - 6, y - 15], C.goldHi, 1.4); P.poly([x - 6, y - 18, x - 10, y - 15, x - 6, y - 12], C.goldHi); });
    };
    EL.expand = (P, x, y) => {
      P.after(() => { P.g.setLineDash([2, 2]); P.g.strokeStyle = C.gold; P.g.lineWidth = 1; P.g.strokeRect(x - 14.5, y - 21.5, 29, 20); P.g.setLineDash([]); P.path([x - 4, y - 11, x + 22, y - 11], C.goldHi, 1.6); P.poly([x + 21, y - 15, x + 27, y - 11, x + 21, y - 7], C.goldHi); P.txt('+1', x - 8, y - 12, C.goldHi, 9); });
    };
    EL.demolish = (P, x, y) => {
      P.shadow(x, y, 14, 3);
      [[-9, -2, 4], [-3, -1, 5], [4, -2, 4], [9, -1, 3], [-6, -6, 3], [1, -6, 4], [6, -5, 2.6], [-1, -10, 2.6]].forEach(([dx, dy, r], i) => P.poly([x + dx - r, y + dy + r * 0.4, x + dx - r * 0.2, y + dy - r * 0.8, x + dx + r, y + dy - r * 0.2, x + dx + r * 0.6, y + dy + r * 0.5], i % 2 ? C.st2 : C.st3));
      P.line(x + 6, y - 6, x + 16, y - 22, C.wd2, 2); P.rect(x + 11, y - 26, 10, 5, C.st3).rect(x + 11, y - 26, 10, 1, C.st4);
      P.after(() => { P.oval(x - 10, y - 14, 4, 2.5, 'rgba(164,168,174,0.35)'); P.oval(x - 4, y - 18, 3, 2, 'rgba(164,168,174,0.3)'); });
    };
    EL.upgrade = (P, x, y) => {
      EL.spikes(P, x, y);
      P.after(() => { P.glow(x, y - 12, 16, '#ffb35c', 0.45); P.poly([x, y - 31, x + 7, y - 23, x + 3, y - 23, x + 3, y - 15, x - 3, y - 15, x - 3, y - 23, x - 7, y - 23], C.flame); P.poly([x, y - 31, x + 7, y - 23, x + 3, y - 23, x + 3, y - 15, x, y - 15], C.ember); });
    };
    EL.move = (P, x, y) => {
      EL.bones(P, x - 10, y);
      P.after(() => { const cx = x + 10, cy = y - 14; P.path([cx - 9, cy, cx + 9, cy], C.vi2, 1.4); P.path([cx, cy - 9, cx, cy + 9], C.vi2, 1.4); [[cx - 11, cy, -1, 0], [cx + 11, cy, 1, 0], [cx, cy - 11, 0, -1], [cx, cy + 11, 0, 1]].forEach(([ax, ay, dx, dy]) => P.poly([ax, ay, ax - dx * 3 - dy * 3, ay - dy * 3 - dx * 3, ax - dx * 3 + dy * 3, ay - dy * 3 + dx * 3], C.vi2)); });
    };
  })();
  // ---------- the rooms: effects (Mgła, Bagno...) and komnaty, each a whole little room ----------
  (() => {
    const { C, EL, skull, bone, bars, flameAt, coin } = ART;
    const R = {};
    R.r_fog = (P) => { for (let k = 0; k < 7; k++) { const y = 14 + k * 3.2; P.oval(8 + ((k * 23) % 60), y, 18, 2.6, 'rgba(185,196,216,' + (0.28 + (k % 3) * 0.08) + ')'); } P.after(() => { P.oval(50, 20, 14, 2.2, 'rgba(200,210,230,0.3)'); P.oval(20, 28, 16, 2.4, 'rgba(200,210,230,0.32)'); }); };
    R.r_swamp = (P) => { P.rect(0, 20, 72, 16, C.gr0); P.vgrad(0, 20, 72, 16, 'rgba(46,68,32,0.4)', 'rgba(20,30,16,0.8)'); for (let k = 0; k < 6; k++) P.oval(6 + k * 12, 24 + (k % 3) * 3, 5, 0.8, 'rgba(156,194,126,0.45)'); [[8, 22], [62, 24], [44, 21]].forEach(([x, y]) => { P.line(x, y, x - 1, y - 9, C.gr1, 1); P.line(x + 2, y, x + 3, y - 7, C.gr1, 1); P.oval(x - 1, y - 10, 1, 2, C.wd2); }); P.after(() => { P.ring(30, 28, 2, 0.8, C.gr2, 1); P.px(52, 30, C.gr2); }); };
    R.r_grotto = (P) => { for (let k = 0; k < 7; k++) P.poly([4 + k * 10, 0, 8 + k * 10, 0, 6 + k * 10, 5 + (k % 3) * 3], C.st2); P.after(() => [6, 11, 16].forEach((r, i) => P.arc(36, 24, r, Math.PI * 1.1, Math.PI * 1.9, 'rgba(159,182,255,' + (0.8 - i * 0.22) + ')', 1))); };
    R.r_crypt = (P) => { [10, 26, 46, 62].forEach(x => { P.rect(x - 5, 2, 10, 9, C.void).oval(x, 2, 5, 3, C.void); skull(P, x, 7, 2.4); }); P.rect(24, 22, 24, 8, C.st2).rect(23, 20, 26, 3, C.st3).txt('✝', 36, 26, C.vi2, 7); P.after(() => P.glow(36, 18, 22, '#a08ce8', 0.25)); };
    R.r_vault = (P) => { P.shadow(36, 31, 22, 3); for (let k = 0; k < 22; k++) coin(P, 20 + (k * 7.3) % 32, 31 - ((k * 3) % 9), k % 3 ? C.gold : C.goldHi); ART.chest(P, 54, 31, 14, 7, [C.wd2, C.wd1], C.gold); P.after(() => { P.glow(32, 26, 18, '#ffd27a', 0.35); P.px(28, 22, C.hot); P.px(40, 25, C.hot); }); };
    R.r_haven = (P) => { P.rect(14, 26, 22, 5, C.bl1).rect(14, 25, 22, 2, C.bl2).oval(16, 25, 3, 2, C.bone); [48, 54, 60].forEach((x, i) => { P.rect(x - 1, 27 - i * 2, 2, 5 + i * 2, C.bone); }); P.after(() => { [48, 54, 60].forEach((x, i) => { flameAt(P, x, 27 - i * 2, 3); }); P.glow(54, 22, 22, '#ffe6a0', 0.35); }); };
    R.r_gears = (P) => { const gear = (x, y, r, n, col) => { P.oval(x, y, r, r, col); for (let k = 0; k < n; k++) { const a = k * Math.PI * 2 / n; P.oval(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6, 1.6, col); } P.oval(x, y, r * 0.4, r * 0.4, C.st0); }; gear(22, 8, 6, 8, C.tan); gear(33, 5, 4, 6, C.wd2); gear(50, 9, 5, 7, C.tan); P.line(10, 32, 62, 32, C.st3, 1); };
    R.r_hush = (P) => { P.after(() => { P.ring(36, 22, 9, 6, C.st4, 1.2); P.ring(36, 22, 4.5, 3, C.st4, 1); P.line(27, 29, 45, 15, C.bl2, 1.6); }); };
    R.r_ice = (P) => { P.rect(0, 14, 72, 22, 'rgba(169,212,218,0.25)'); for (let k = 0; k < 9; k++) P.poly([3 + k * 8, 0, 7 + k * 8, 0, 5 + k * 8, 4 + (k % 3) * 2], C.ice); P.after(() => { P.line(10, 26, 26, 24, C.bone, 1); P.line(44, 30, 60, 28, C.bone, 1); P.px(30, 20, C.bone); }); };
    // komnaty
    R.k_goblin = (P) => { P.rect(4, 26, 26, 6, C.tan); P.dabs(4, 25, 26, 7, [C.gold, C.wd2, C.tan], 30); P.rect(52, 6, 1, 20, C.wd1).poly([53, 6, 64, 9, 53, 13], C.gr1); P.fig('goblin', 40, 33, 1, true); P.rect(60, 27, 8, 5, C.st0).oval(64, 27, 4, 1.3, C.st2); P.after(() => P.glow(64, 26, 8, '#ff9a4a', 0.3)); };
    R.k_spider = (P) => { EL.web(P, 14, 30); EL.web(P, 58, 24); [[34, 28], [40, 30], [45, 27]].forEach(([x, y]) => P.oval(x, y, 3, 2.4, C.bone)); P.fig('spider', 36, 22, 1, false, 1); };
    R.k_ogre = (P) => { P.fig('ogre', 34, 34, 1); bone(P, 50, 32, 60, 30, C.st4); skull(P, 14, 30, 3); P.line(56, 33, 62, 18, C.wd1, 3); };
    R.k_haunt = (P) => { P.rect(30, 1, 12, 1, C.st3); P.rect(28, 2, 16, 2, C.gold); P.after(() => { [30, 36, 42].forEach(x => flameAt(P, x, 2, 2.4)); P.g.globalAlpha = 0.75; P.fig('ghost', 18, 30, 1, false, 2); P.fig('ghost', 54, 28, 1, true, 0); P.g.globalAlpha = 1; P.glow(36, 18, 26, '#a6e8ff', 0.18); }); };
    R.k_bats = (P) => { P.rect(0, 0, 72, 13, C.ink); for (let k = 0; k < 6; k++) { const x = 8 + k * 11; P.line(x, 0, x, 3, C.st1, 1); P.oval(x, 6, 2, 3, C.vi0); P.px(x - 1, 7, C.bl2).px(x + 1, 7, C.bl2); } P.fig('bat', 30, 34, 1, false, 0); P.fig('bat', 48, 30, 1, true, 1); };
    R.k_ossuary = (P) => { for (let y = 1; y < 13; y += 4) for (let x = 2 + (y % 8 ? 0 : 2); x < 72; x += 5) skull(P, x, y + 1, 1.7, C.bone); P.rect(26, 22, 20, 9, C.st2).rect(25, 20, 22, 3, C.st3); bone(P, 28, 26, 44, 26); };
    R.k_armory = (P) => { [[12, C.st4], [20, C.st4], [52, C.steel], [60, C.st4]].forEach(([x, c]) => { P.line(x, 30, x, 6, C.wd2, 1); P.poly([x - 2, 6, x, 1, x + 2, 6], c); }); P.rect(8, 30, 56, 2, C.wd1); P.oval(36, 18, 8, 9, C.cold1).oval(36, 18, 6, 7, C.st3).rect(35, 11, 2, 14, C.gold); P.line(28, 26, 44, 10, C.st4, 2); };
    R.k_forge = (P) => { P.rect(8, 6, 20, 26, C.st1).rect(11, 16, 14, 10, C.void); P.rect(42, 24, 18, 4, C.st3).rect(46, 28, 10, 4, C.st2).rect(40, 23, 6, 2, C.st4); P.line(58, 22, 64, 14, C.wd2, 2); P.rect(61, 11, 6, 4, C.st3); P.after(() => { flameAt(P, 18, 26, 9); flameAt(P, 15, 25, 6); P.glow(18, 22, 20, '#ff8a3a', 0.55); P.px(50, 21, C.flame).px(53, 19, C.hot); }); };
    R.k_prison = (P) => { bars(P, 6, 4, 30, 32, 6, C.st4); P.rect(5, 3, 26, 2, C.st3); P.rect(48, 4, 8, 6, C.void); bars(P, 48, 4, 56, 10, 2, C.st3); [42, 60].forEach(x => { for (let k = 0; k < 5; k++) P.ring(x, 14 + k * 3, 1, 1.3, C.st4, 1); }); P.after(() => P.glow(52, 6, 10, '#a9d4da', 0.25)); };
    R.k_junk = (P) => { EL.crateBox(P, 14, 33, 14, 11); EL.crateBox(P, 24, 33, 10, 8); P.rect(44, 18, 10, 15, C.wd1).rect(44, 18, 10, 2, C.wd2).rect(44, 24, 10, 1, C.wd0); P.oval(62, 30, 5, 2, C.wd1).rect(57, 20, 10, 10, C.wd2).oval(62, 20, 5, 2, C.tan); P.line(30, 20, 40, 10, C.wd2, 1); };
    R.k_gallery = (P) => { [[12, 6, 8, 9], [28, 5, 10, 8], [46, 6, 9, 10], [62, 5, 7, 7]].forEach(([x, y, w, h], i) => { P.rect(x - w / 2 - 1, y - 1, w + 2, h + 2, C.gold).rect(x - w / 2, y, w, h, [C.vi0, C.cold1, C.bl0, C.gr0][i]); P.oval(x, y + h / 2, w * 0.25, h * 0.3, C.st3); }); P.after(() => { P.px(27, 8, C.goldHi).px(29, 8, C.goldHi); }); };
    R.k_nursery = (P) => { P.rect(10, 22, 20, 9, C.wd2); bars(P, 10, 16, 30, 22, 6, C.wd2); P.rect(10, 15, 20, 1, C.tan); P.poly([46, 30, 60, 30, 58, 24, 48, 24], C.bl1); P.rect(48, 18, 6, 6, C.bl1).px(53, 20, C.ink); P.line(46, 31, 60, 31, C.wd2, 1); P.after(() => { P.txt('♪', 38, 12, C.vi2, 8); }); };
    R.k_lab = (P) => { P.rect(4, 22, 24, 2, C.wd1); [[8, C.gr2], [14, C.bl2], [20, C.vi2], [25, C.ice]].forEach(([x, c]) => { P.oval(x, 20, 2.4, 2.4, c).rect(x - 1, 15, 2, 4, 'rgba(200,215,240,0.6)'); }); P.oval(48, 30, 11, 3, C.st0).rect(38, 22, 20, 8, C.st0).oval(48, 22, 10, 2.6, C.gr1); P.after(() => { P.glow(48, 20, 14, '#7fe05a', 0.4); P.oval(45, 17, 1.6, 1.6, C.gr2).oval(51, 13, 1.2, 1.2, C.gr2); }); };
    R.k_graveyard = (P) => { [[14, 30, 8], [30, 32, 9], [56, 31, 7]].forEach(([x, y, h]) => { P.rect(x - 4, y - h, 8, h, C.st3).oval(x, y - h, 4, 3, C.st3).rect(x - 4, y - h, 1, h, C.st4); P.txt('✝', x, y - h + 3, C.st1, 5); }); P.line(44, 32, 44, 16, C.wd0, 2); P.line(44, 20, 50, 14, C.wd0, 1); P.line(44, 22, 38, 17, C.wd0, 1); P.after(() => { P.oval(30, 33, 22, 2.4, 'rgba(185,196,216,0.3)'); P.glow(36, 6, 10, '#d9e0ef', 0.25); }); };
    R.k_abyssgate = (P) => { P.after(() => { P.glow(36, 18, 22, '#e0643c', 0.4); }); P.ring(36, 18, 12, 14, C.bl1, 3); P.oval(36, 18, 10, 12, C.void); P.oval(36, 18, 7, 9, C.bl0); P.after(() => { P.ring(36, 18, 12, 14, C.ember, 1); [0, 1, 2, 3, 4, 5].forEach(k => { const a = k * Math.PI / 3; P.px(Math.round(36 + Math.cos(a) * 12), Math.round(18 + Math.sin(a) * 14), C.flame); }); P.oval(36, 18, 3, 4, C.ember); }); };
    Object.assign(ART, { ROOMS: R });
  })();
  // ---------- the tray tiles: which stage and which painter ----------
  (() => {
    const { EL, ROOMS, scene } = ART;
    const SLOT_STAGE = { floor: 'floor', wall: 'wall', door: 'door', object: 'floor' };
    const FLOOR_Y = 31;
    const TILE_K = { spikes: 1.4, snare: 1.25, oilslick: 1.15, bait: 1.4, trapdoor: 1.3, coffin: 1.25, bones: 1.35, loot: 1.45, lpotion: 1.25, loot2: 1.35, loot3: 1.2, lcursed: 1.35, web: 1.2, cage: 1.15, eyes: 1.3, arrows: 1.15, decoy: 1.15, acid: 1.2, mimic: 1.1, musicbox: 1.05, upgrade: 1.0 };
    const STAGE_OF = { spikes: 'floor', web: 'floor', trapdoor: 'floor', cage: 'floor', bones: 'floor', coffin: 'floor', arrows: 'wall', fire: 'wall', portrait: 'wall', eyes: 'wall', mirror: 'wall',
      gate: 'door', creak: 'door', ogre: 'cave', k_ogre: 'cave', k_bats: 'dark', dig: 'cave', r_hush: 'dark', r_grotto: 'cave', k_spider: 'dark', shade: 'dark', tunnel: 'floor',
      pendulum: 'wall', bolt: 'wall', falsedoor: 'door', tar: 'door', snare: 'floor', miasma: 'floor', oilslick: 'floor', flood: 'floor', bell: 'floor', bait: 'floor', demon: 'cave', hound: 'cave', lich: 'dark', siren: 'dark', imp: 'cave', rats: 'floor' };
    function paintTile(type) {
      if (ROOMS[type]) return scene('tile:' + type, STAGE_OF[type] || 'floor', P => ROOMS[type](P), { warm: type === 'r_ice' || type === 'r_hush' ? 0.05 : undefined });
      const f = EL[type]; if (!f) return null;
      const I = ITEMS[type], st = STAGE_OF[type] || (I && SLOT_STAGE[I.slot]) || 'floor';
      const wallish = st === 'wall', doorish = st === 'door', k = TILE_K[type] || 1, ax = 36, ay = wallish ? 15 : doorish ? 29 : FLOOR_Y;
      return scene('tile:' + type, st, P => { if (k !== 1) { P.g.save(); P.g.translate(ax, ay); P.g.scale(k, k); P.g.translate(-ax, -ay); } f(P, ax, ay); if (k !== 1) P.g.restore(); }, {});
    }
    ART.tile = type => ART.url('tile:' + type, () => paintTile(type));
    ART.tileCanvas = type => ART.keep('tile:' + type, () => paintTile(type));
  })();
  ART.ITEM_ORDER = ITEM_ORDER;
  ART.has = t => !!(ART.EL[t] || ART.ROOMS[t]);
  // an <img> of a card's picture (big: the card's own window, twice the size); null when there is none
  ART.cardImg = (id, big) => {
    const u = ART.card ? ART.card(id) : ''; if (!u) return null;
    const im = document.createElement('img'); im.className = 'cardart' + (big ? ' cardbig' : '') + (ART.isHeart && ART.isHeart(id) ? ' heart' : ''); im.alt = ''; im.draggable = false; im.src = u; return im;
  };
  // ---------- 1.26: the new monsters as pixel figures (20 x 28, feet on the bottom row, facing right), painted like the old
  // ones (paintFigure calls FIG_ART[type] for a type it does not know) ----------
  const FIG_ART = {
    skeleton({ r, P, b, legs }) {   // bones, a rusty sword and a round shield (the archer has a bow)
      r(3, 14 + b, 4, 6, '#5a4630'); r(3, 14 + b, 1, 6, '#3e2f20'); r(4, 16 + b, 2, 2, P.steel[1]); r(3, 13 + b, 4, 1, '#3e2f20'); r(3, 20 + b, 4, 1, '#3e2f20');
      legs(P.bone[1], P.bone[1]);
      r(8, 14 + b, 4, 7, P.bone[0]); r(8, 15 + b, 4, 1, P.dark); r(8, 17 + b, 4, 1, P.dark); r(9, 14 + b, 1, 7, P.bone[1]); r(8, 20 + b, 4, 1, P.bone[1]);
      r(8, 8 + b, 5, 5, P.bone[0]); r(8, 11 + b, 1, 2, P.bone[1]); r(9, 10 + b, 1, 1, '#d84a3a'); r(11, 10 + b, 1, 1, '#d84a3a'); r(9, 12 + b, 3, 1, P.dark); r(10, 12 + b, 1, 1, P.bone[0]);
      r(8, 7 + b, 5, 2, '#6a5a4a'); r(8, 7 + b, 5, 1, '#8a7a62');   // a dented helmet
      r(12, 14 + b, 1, 5, P.bone[1]); r(12, 19 + b, 2, 1, P.bone[0]);
      r(14, 8 + b, 1, 11, '#a8988a'); r(15, 9 + b, 1, 9, '#7a6a5e'); r(13, 18 + b, 3, 1, P.wood[1]); r(14, 19 + b, 1, 2, P.wood[1]); r(14, 11 + b, 1, 1, '#6a3a2a');
    },
    zombie({ r, P, b, legs }) {   // grey-green skin, rags, arms out in front
      legs('#3a3540', '#2a2630');
      r(11, 16 + b, 6, 1, '#5a6a48');   // the far arm
      r(7, 14 + b, 6, 7, '#4f4458'); r(7, 14 + b, 1, 7, '#3a3242'); r(8, 16 + b, 2, 2, '#7a8a62'); r(11, 19 + b, 1, 2, '#6a2a2a'); r(7, 20 + b, 6, 1, '#3a3242');
      r(9, 9 + b, 5, 5, '#7a8a62'); r(9, 12 + b, 1, 2, '#5a6a48'); r(12, 11 + b, 1, 1, '#e8d24a'); r(12, 13 + b, 2, 1, '#3a1a1a'); r(9, 8 + b, 3, 1, '#3a3030'); r(13, 9 + b, 1, 1, '#3a3030');
      r(12, 15 + b, 5, 2, '#7a8a62'); r(12, 16 + b, 5, 1, '#5a6a48'); r(17, 15 + b, 1, 1, '#5a6a48'); r(17, 17 + b, 1, 1, '#5a6a48');
    },
    lich({ r, P, b, robe }) {   // a crowned skeleton in a dark robe, cold blue eyes, a staff with an ice orb
      r(4, 5 + b, 1, 22, P.wood[1]); r(3, 3 + b, 3, 3, '#8cc8ff'); r(4, 2 + b, 1, 1, '#e6f4ff'); r(3, 5 + b, 1, 1, '#4a7ab8');
      robe(['#3a2a52', '#241a36'], 13 + b);
      r(9, 15 + b, 2, 12, '#5a3a7a'); r(7, 19 + b, 6, 1, P.gold[1]);
      r(7, 7 + b, 7, 2, '#241a36'); r(7, 7 + b, 1, 7, '#241a36'); r(13, 8 + b, 1, 5, '#241a36');
      r(8, 8 + b, 5, 5, P.bone[0]); r(8, 11 + b, 1, 2, P.bone[1]); r(9, 10 + b, 1, 1, '#8cf0ff'); r(11, 10 + b, 1, 1, '#8cf0ff'); r(9, 12 + b, 3, 1, P.dark);
      r(8, 6 + b, 5, 1, P.gold[0]); r(8, 5 + b, 1, 1, P.gold[0]); r(10, 5 + b, 1, 1, P.gold[0]); r(12, 5 + b, 1, 1, P.gold[0]); r(10, 6 + b, 1, 1, '#d84a5a');
      r(12, 14 + b, 2, 4, '#3a2a52'); r(13, 18 + b, 2, 1, P.bone[0]); r(14, 17 + b, 1, 1, P.bone[1]);
    },
    imp({ r, P, frame }) {   // a little red devil on bat wings (it flies: the feet hang free)
      const up = frame % 2 === 0, w = '#5a1a20', w2 = '#3a1016';
      if (up) { r(3, 8, 5, 2, w); r(2, 7, 2, 1, w2); r(12, 8, 5, 2, w); r(16, 7, 2, 1, w2); r(4, 10, 3, 1, w2); r(13, 10, 3, 1, w2); }
      else { r(3, 14, 5, 2, w); r(2, 16, 2, 1, w2); r(12, 14, 5, 2, w); r(16, 16, 2, 1, w2); r(4, 13, 3, 1, w2); r(13, 13, 3, 1, w2); }
      r(8, 13, 5, 6, '#b8382a'); r(9, 15, 3, 3, '#d85a3a'); r(8, 13, 1, 6, '#8a2a20');
      r(8, 8, 5, 5, '#b8382a'); r(8, 11, 1, 2, '#8a2a20'); r(8, 7, 1, 1, P.bone[1]); r(12, 7, 1, 1, P.bone[1]); r(7, 6, 1, 1, P.bone[1]); r(13, 6, 1, 1, P.bone[1]);
      r(11, 10, 1, 1, '#ffe066'); r(10, 12, 3, 1, '#2a0a0a'); r(12, 12, 1, 1, P.bone[0]);
      r(9, 19, 1, 3, '#8a2a20'); r(11, 19, 1, 3, '#8a2a20'); r(8, 22, 2, 1, '#3a1010'); r(11, 22, 2, 1, '#3a1010');
      r(7, 18, 1, 1, '#8a2a20'); r(6, 19, 1, 1, '#8a2a20'); r(5, 20, 1, 1, '#8a2a20'); r(3, 20, 2, 1, '#b8382a'); r(3, 19, 1, 1, '#b8382a');
    },
    hound({ r, P, frame }) {   // a hellhound: low, black and red, a mane of fire, burning eyes
      const lg = frame % 2;
      r(2, 16, 2, 1, '#3a2020'); r(1, 15, 1, 1, '#e0643c'); r(1, 14, 1, 1, '#ffb35c');
      r(4, 17, 11, 5, '#2a1a1e'); r(4, 17, 11, 1, '#5a2228'); r(5, 21, 9, 1, '#160c0e'); r(4, 18, 1, 3, '#160c0e'); r(8, 19, 3, 1, '#4a1a1e');
      for (let x = 5; x < 14; x++) r(x, 16 - ((x + frame) % 2), 1, 1, (x + frame) % 3 ? '#e0643c' : '#ffb35c');
      r(14, 15, 5, 4, '#2a1a1e'); r(14, 15, 5, 1, '#5a2228'); r(18, 17, 2, 2, '#2a1616'); r(16, 16, 1, 1, '#ffb35c'); r(17, 16, 1, 1, '#fff1c8'); r(14, 14, 1, 1, '#3a2020'); r(15, 13, 1, 1, '#3a2020');
      r(18, 19, 2, 1, P.bone[0]);
      r(5, 22, 1, 4 - lg, '#2a1616'); r(7, 22, 1, 3 + lg, '#3a2020'); r(12, 22, 1, 4 - lg, '#2a1616'); r(14, 22, 1, 3 + lg, '#3a2020');
      r(4, 26 - lg, 2, 1, '#1a0a0a'); r(7, 25 + lg, 2, 1, '#1a0a0a'); r(11, 26 - lg, 2, 1, '#1a0a0a'); r(14, 25 + lg, 2, 1, '#1a0a0a');
    },
    siren({ r, frame }) {   // the temptress: pale, bat wings, long dark hair, a red dress that floats
      const w = '#3a2048', w2 = '#26142f';
      r(2, 10, 6, 1, w); r(3, 11, 5, 1, w); r(3, 12, 4, 1, w2); r(4, 13, 3, 1, w2); r(1, 9, 2, 1, w2);
      r(13, 10, 5, 1, w); r(13, 11, 4, 1, w); r(14, 12, 3, 1, w2); r(17, 9, 2, 1, w2);
      r(7, 6, 6, 10, '#2a1424'); r(7, 15, 2, 3, '#2a1424');
      r(9, 8, 4, 4, '#d8b4d0'); r(9, 8, 1, 4, '#b08aa8'); r(11, 9, 1, 1, '#ff6aa0'); r(11, 11, 1, 1, '#cc3640');
      r(8, 13, 5, 4, '#8a2a4a'); r(9, 13, 2, 1, '#d8b4d0'); r(8, 13, 1, 4, '#5a1a32');
      for (let y = 17; y <= 25; y++) { const k = Math.floor((y - 17) / 3), sw = (y + frame) % 4 === 0 ? 1 : 0; r(8 - k + sw, y, 5 + k * 2, 1, '#8a2a4a'); r(8 - k + sw, y, 1 + (k > 0 ? 1 : 0), 1, '#5a1a32'); }
      r(12, 13, 1, 4, '#d8b4d0'); r(13, 12, 1, 1, '#d8b4d0'); r(14, 11, 1, 1, '#d8b4d0');
    },
    demon({ r, P, b, legs }) {   // the demon of the abyss: big, horned, burning, a flame in its hand
      r(1, 6 + b, 5, 2, '#3a1414'); r(0, 8 + b, 6, 2, '#3a1414'); r(1, 10 + b, 5, 2, '#2a0e0e'); r(2, 12 + b, 3, 2, '#2a0e0e'); r(0, 5 + b, 2, 1, '#2a0e0e');
      legs('#4a1a14', '#3a1410');
      r(5, 12 + b, 10, 9, '#7a2418'); r(6, 13 + b, 4, 3, '#9a3420'); r(5, 12 + b, 2, 9, '#5a1a10'); r(8, 17 + b, 1, 1, '#5a1a10'); r(11, 17 + b, 1, 1, '#5a1a10'); r(5, 20 + b, 10, 1, '#3a1410'); r(9, 20 + b, 2, 1, P.gold[1]);
      r(7, 5 + b, 7, 6, '#7a2418'); r(7, 8 + b, 1, 3, '#5a1a10'); r(6, 3 + b, 1, 3, P.bone[0]); r(5, 2 + b, 1, 1, P.bone[0]); r(14, 3 + b, 1, 3, P.bone[0]); r(15, 2 + b, 1, 1, P.bone[0]);
      r(9, 7 + b, 1, 1, '#ffd27a'); r(12, 7 + b, 1, 1, '#ffd27a'); r(9, 9 + b, 4, 1, '#2a0a0a'); r(9, 10 + b, 1, 1, P.bone[0]); r(12, 10 + b, 1, 1, P.bone[0]);
      r(15, 12 + b, 3, 6, '#7a2418'); r(15, 12 + b, 1, 6, '#5a1a10'); r(17, 18 + b, 2, 1, P.bone[1]);
      r(17, 9 + b, 2, 3, '#e0643c'); r(17, 8 + b, 1, 1, '#ffb35c'); r(18, 7 + b, 1, 1, '#ffb35c'); r(18, 10 + b, 1, 1, '#fff1c8');
    },
    sapper({ r, P, b, legs }) {   // a goblin with a miner's helmet, a satchel and a lit bomb
      legs(P.goblin[1], P.goblin[1]);
      r(6, 15 + b, 2, 5, '#5a4630'); r(6, 15 + b, 2, 1, '#7a5e40');   // the satchel
      r(8, 15 + b, 5, 6, '#4a4a3a'); r(8, 15 + b, 1, 6, '#34342a'); r(8, 18 + b, 5, 1, P.belt);
      r(8, 10 + b, 5, 5, P.goblin[0]); r(8, 13 + b, 1, 2, P.goblin[1]); r(6, 11 + b, 2, 2, P.goblin[0]); r(13, 11 + b, 2, 2, P.goblin[0]); r(5, 10 + b, 1, 1, P.goblin[1]); r(15, 10 + b, 1, 1, P.goblin[1]);
      r(11, 12 + b, 1, 1, '#e8d24a');
      r(8, 8 + b, 5, 2, '#6a6a72'); r(8, 8 + b, 5, 1, '#8a8a92'); r(7, 10 + b, 7, 1, '#4a4a52'); r(12, 8 + b, 1, 1, '#ffd27a');
      r(12, 16 + b, 2, 3, P.goblin[1]); r(13, 17 + b, 3, 3, '#26262e'); r(14, 17 + b, 1, 1, '#4a4a56'); r(15, 16 + b, 1, 1, '#b08a5a'); r(16, 15 + b, 1, 1, '#ffd27a');
    },
    warlord({ r, P, b, legs }) {   // the goblin chief: bigger, bronze armour, a red cloak, a horned helmet and a great axe
      r(5, 13 + b, 3, 12, '#7a1e24'); r(5, 13 + b, 1, 12, '#5a141a');
      legs(P.goblin[1], '#3e2f20');
      r(7, 13 + b, 7, 8, '#8a6a3a'); r(7, 13 + b, 1, 8, '#5e4626'); r(9, 15 + b, 3, 2, '#b08850'); r(7, 20 + b, 7, 1, P.belt); r(10, 20 + b, 1, 1, P.gold[0]);
      r(8, 8 + b, 6, 5, P.goblin[0]); r(8, 11 + b, 1, 2, P.goblin[1]); r(6, 9 + b, 2, 2, P.goblin[0]); r(14, 9 + b, 2, 2, P.goblin[0]); r(12, 10 + b, 1, 1, '#ff6b4a'); r(11, 12 + b, 2, 1, P.bone[0]);
      r(8, 6 + b, 6, 2, '#6a5a3a'); r(8, 6 + b, 6, 1, '#8a7a52'); r(7, 4 + b, 1, 2, P.bone[0]); r(6, 3 + b, 1, 1, P.bone[0]); r(14, 4 + b, 1, 2, P.bone[0]); r(15, 3 + b, 1, 1, P.bone[0]);
      r(13, 14 + b, 2, 5, P.goblin[1]);
      r(15, 5 + b, 1, 20, P.wood[1]); r(16, 5 + b, 3, 7, P.steel[0]); r(16, 5 + b, 1, 7, P.steelHi); r(18, 6 + b, 1, 5, P.steel[1]); r(14, 6 + b, 1, 4, P.steel[1]);
    },
    rat({ r, frame }) {   // one rat of the swarm, low on the floor
      const lg = frame % 2;
      r(3, 24, 4, 1, '#b8858a'); r(2, 23, 1, 1, '#b8858a');
      r(7, 22, 6, 3, '#5a4a44'); r(7, 22, 6, 1, '#7a6a62'); r(7, 24, 1, 1, '#3a302c');
      r(13, 22, 3, 2, '#5a4a44'); r(16, 23, 1, 1, '#c99a9a'); r(13, 21, 1, 1, '#c99a9a'); r(15, 22, 1, 1, '#ff6b6b');
      r(8, 25, 1, 1 + lg, '#3a302c'); r(12, 25, 1, 2 - lg, '#3a302c');
    }
  };
  // how tall they stand on the map (T x), and how they are drawn there (the same way as the old monsters)
  const MON_H2 = { skeleton: 0.9, zombie: 0.9, lich: 1.0, imp: 0.55, hound: 0.62, siren: 0.95, demon: 1.35, sapper: 0.8, warlord: 1.0, rats: 0.4 };
  ['skeleton', 'zombie', 'lich', 'sapper', 'warlord', 'demon', 'hound'].forEach(t => {
    ISO_ART[t] = (it, bx, by, T) => {
      const p = W2S(bx, by, 0), H = monH(it, T) * 1.15;
      groundShadow(bx, by, t === 'demon' ? 0.45 : t === 'hound' ? 0.38 : 0.3, 0.3, 0.42);
      if (t === 'demon') { const gp = W2S(bx, by, 0.6); ctx.drawImage(glowSprite('demon', [[0, 'rgba(224,100,60,0.45)'], [1, 'rgba(224,100,60,0)']]), gp[0] - T, gp[1] - T, T * 2, T * 2); }
      const q = it.flash > 0 ? clamp(it.flash / 0.12, 0, 1) : 0;
      const min = FIG_MIN * (t === 'demon' ? 1.25 : t === 'warlord' ? 1.05 : t === 'hound' ? 0.8 : t === 'sapper' ? 0.85 : 1);
      drawPixelFigure(t, p[0], p[1], Math.max(min, H), monFace(it, bx, by), q ? { frame: it.anim > 0 ? 1 : 0, flash: true, kx: 1 + 0.14 * q, ky: 1 - 0.12 * q } : { frame: t === 'hound' ? Math.floor(realNow * 6) % 2 : it.anim > 0 ? 1 : 0, flash: false });
    };
  });
  ISO_ART.imp = (it, bx, by, T) => {
    const bob = Math.sin(realNow * 5 + it.x) * 0.06, p = W2S(bx, by, 0.45 + bob);
    groundShadow(bx, by, 0.2, 0.16, 0.25);
    drawPixelFigure('imp', p[0], p[1], Math.max(FIG_MIN * 0.7, monH(it, T) * 1.4), Math.sin(realNow * 0.9 + it.x) > 0 ? 1 : -1, { frame: Math.floor(realNow * 8) % 2, flash: it.flash > 0 || it.anim > 0 });
  };
  ISO_ART.siren = (it, bx, by, T) => {
    const bob = Math.sin(realNow * 2.2 + it.x) * 0.06, p = W2S(bx, by, 0.3 + bob);
    groundShadow(bx, by, 0.24, 0.18, 0.25);
    const gp = W2S(bx, by, 0.8); ctx.drawImage(glowSprite('siren', [[0, 'rgba(226,141,162,0.35)'], [1, 'rgba(226,141,162,0)']]), gp[0] - T * 0.7, gp[1] - T * 0.7, T * 1.4, T * 1.4);
    drawPixelFigure('siren', p[0], p[1], Math.max(FIG_MIN, monH(it, T) * 1.15), monFace(it, bx, by), { frame: Math.floor(realNow * 3) % 4, flash: it.flash > 0 });
  };
  ISO_ART.rats = (it, bx, by, T) => {   // a swarm: more rats as it grows (it.grow, 0-3)
    const n = 3 + clamp(it.grow || 0, 0, 3);
    for (let k = 0; k < n; k++) {
      const an = realNow * 2.2 + k * 2.4 + it.x, x = bx + Math.cos(an) * 0.22 * (0.6 + (k % 3) * 0.25), y = by + Math.sin(an * 1.1) * 0.2, p = W2S(x, y, 0);
      drawPixelFigure('rat', p[0], p[1] + T * 0.04, Math.max(18, T * 0.95), Math.cos(an + 1.6) > 0 ? 1 : -1, { frame: Math.floor(realNow * 8 + k) % 2, flash: it.flash > 0 || it.anim > 0 });
    }
  };
  // ---------- 1.26: the new traps and monsters on the tiles and cards ----------
  (() => {
    const { C, EL, bone, coin, plate, flameAt, skull } = ART;
    const fig = (type, prop, flyY, k) => (P, x, y) => { P.shadow(x, y, type === 'demon' ? 10 : 7, 2.2, flyY ? 0.3 : 0.55); if (prop) prop(P, x, y); P.fig(type, x, y + 1 - (flyY || 0), k || 1, false, type === 'imp' ? 0 : 0); };
    EL.skeleton = fig('skeleton', (P, x, y) => { bone(P, x - 15, y - 1, x - 8, y - 3, C.st4); skull(P, x + 13, y - 2, 2.2); });
    EL.zombie = fig('zombie', (P, x, y) => { P.rect(x - 16, y - 8, 7, 8, C.st2).oval(x - 12.5, y - 8, 3.5, 2.5, C.st2).rect(x - 16, y - 8, 1, 8, C.st3); P.dabs(x - 14, y - 1, 10, 2, [C.wd1, C.st0], 6); });
    EL.lich = fig('lich', (P, x, y) => { P.after(() => { P.glow(x - 6, y - 24, 9, '#8cc8ff', 0.5); P.glow(x, y - 18, 14, '#5a479a', 0.25); }); });
    EL.imp = fig('imp', (P, x, y) => { P.after(() => P.glow(x, y - 18, 10, '#e0643c', 0.25)); }, 6);
    EL.hound = fig('hound', (P, x, y) => { P.after(() => { P.glow(x + 4, y - 9, 12, '#ff8a3a', 0.35); }); bone(P, x - 15, y - 1, x - 9, y - 2, C.st4); });
    EL.siren = fig('siren', (P, x, y) => { P.after(() => { P.glow(x, y - 16, 14, '#e28da2', 0.3); P.txt('♥', x + 12, y - 22, C.ess, 7); }); }, 4);
    EL.demon = fig('demon', (P, x, y) => { P.after(() => { P.glow(x, y - 14, 20, '#e0643c', 0.35); }); P.dabs(x - 14, y - 2, 28, 3, [C.ember, C.bl1], 8); });
    EL.sapper = fig('sapper', (P, x, y) => { [[-14, 0], [-10, 1], [12, 0]].forEach(([dx, dy]) => P.poly([x + dx - 2, y + dy, x + dx, y + dy - 3, x + dx + 2, y + dy], C.st4)); P.after(() => P.glow(x + 6, y - 13, 6, '#ffd27a', 0.5)); });
    EL.warlord = fig('warlord', (P, x, y) => { P.rect(x - 15, y - 26, 1, 26, C.wd1).poly([x - 14, y - 26, x - 6, y - 23, x - 14, y - 19], C.bl1); P.txt('♣', x - 11, y - 23, C.gr2, 5); });
    EL.rats = (P, x, y) => { P.shadow(x, y, 12, 2, 0.4); [[-10, 1, false, 0], [-1, -1, true, 1], [7, 1, false, 1], [2, 3, true, 0]].forEach(([dx, dy, fl, f]) => P.fig('rat', x + dx, y + 4 + dy, 1, fl, f)); };
    // new traps
    EL.pendulum = (P, x, y) => {   // a blade swinging on a rod from the top of the wall, a trail behind it
      const px = x - 2, py = -2, bx = x + 9, by = y + 9;
      P.after(() => { P.arc(px, py, 27, 0.75, 1.75, 'rgba(230,225,214,0.28)', 3); P.arc(px, py, 27, 1.25, 1.6, 'rgba(230,225,214,0.4)', 2); });
      P.line(px, py, bx, by, C.st3, 2); P.line(px, py, bx, by, C.st4, 1);
      P.oval(px, 1, 3, 2, C.st2);
      P.poly([bx - 9, by - 1, bx - 2, by + 5, bx + 7, by + 6, bx + 6, by + 2, bx + 2, by - 1, bx - 3, by - 3], C.st4);
      P.poly([bx - 9, by - 1, bx - 2, by + 5, bx + 7, by + 6], C.bone);
      P.after(() => { P.px(bx - 5, by + 2, C.hot); P.rect(bx + 3, by + 5, 2, 1, C.bl2); });
    };
    EL.snare = (P, x, y) => {   // open iron jaws, a chain to a stake
      P.shadow(x, y, 12, 3);
      P.oval(x, y - 2, 10, 3, C.st1); P.oval(x, y - 2, 6, 1.8, C.st0);
      for (let k = 0; k < 7; k++) { const a = Math.PI + k * Math.PI / 6; const tx = x + Math.cos(a) * 9.5, ty = y - 2 + Math.sin(a) * 3; P.poly([tx - 1.2, ty, tx, ty - 3, tx + 1.2, ty], C.st4); }
      for (let k = 0; k < 7; k++) { const a = k * Math.PI / 6; const tx = x + Math.cos(a) * 9.5, ty = y - 2 + Math.sin(a) * 3; P.poly([tx - 1.2, ty, tx, ty - 2.5, tx + 1.2, ty], C.st3); }
      P.rect(x - 2, y - 3, 4, 2, C.st3).px(x, y - 3, C.gold);
      for (let k = 0; k < 5; k++) P.ring(x + 12 + k * 2.2, y - 1 + (k % 2), 1.1, 0.8, C.st3, 1);
      P.rect(x + 23, y - 6, 2, 6, C.wd2);
    };
    EL.miasma = (P, x, y) => {   // a grate in the floor, a green cloud rising
      P.poly([x - 9, y, x + 9, y, x + 11, y - 5, x - 7, y - 5], C.st0);
      for (let k = 0; k < 5; k++) P.line(x - 7 + k * 4, y - 1, x - 5 + k * 4, y - 4, C.st3, 1);
      P.after(() => { [[0, -9, 8, 5], [-6, -14, 6, 4], [6, -16, 7, 4], [0, -22, 9, 5], [-4, -27, 5, 3]].forEach(([dx, dy, rx, ry], i) => P.oval(x + dx, y + dy, rx, ry, i % 2 ? 'rgba(124,190,90,0.55)' : 'rgba(156,194,126,0.6)')); P.glow(x, y - 14, 16, '#7fe05a', 0.25); P.px(x - 3, y - 20, C.gr2).px(x + 4, y - 12, C.gr2); });
    };
    EL.oilslick = (P, x, y) => {   // a black pool with a rainbow sheen
      P.oval(x, y - 3, 16, 4.5, C.wd0).oval(x - 3, y - 3.5, 11, 3, C.void).oval(x + 8, y - 2, 5, 1.6, C.void);
      P.after(() => { P.oval(x - 5, y - 4.5, 4, 0.9, 'rgba(160,140,232,0.6)'); P.oval(x + 2, y - 3, 3, 0.8, 'rgba(156,194,126,0.5)'); P.oval(x + 7, y - 2.5, 2.5, 0.6, 'rgba(240,216,144,0.6)'); P.px(x - 8, y - 5, C.bone); });
      [[-18, -1], [17, -2]].forEach(([dx, dy]) => P.oval(x + dx, y + dy, 2, 0.8, C.void));
    };
    EL.bolt = (P, x, y) => {   // a slab with a rune of storms, lightning leaping from it
      P.rect(x - 8, y - 10, 16, 20, C.st0).rect(x - 7, y - 9, 14, 18, C.st2).rect(x - 7, y - 9, 14, 1, C.st3);
      P.after(() => { P.glow(x, y, 13, '#8cc8ff', 0.55); P.path([x + 1, y - 7, x - 3, y, x + 2, y, x - 2, y + 7], C.ice, 1.4); P.path([x + 8, y - 2, x + 13, y - 5, x + 15, y - 1, x + 21, y - 4], C.bone, 1); P.path([x + 15, y - 1, x + 18, y + 4], C.ice, 1); P.px(x + 21, y - 4, C.hot); });
    };
    EL.flood = (P, x, y) => {   // water bursting from a grate in the wall, a pool on the floor
      P.rect(x - 6, 3, 12, 7, C.st0); for (let k = 0; k < 4; k++) P.rect(x - 5 + k * 3, 4, 1, 5, C.st3);
      P.oval(x, y - 2, 18, 4.5, C.cold1).oval(x, y - 2.5, 15, 3.2, C.steel);
      P.after(() => { P.rect(x - 4, 9, 8, y - 12, 'rgba(111,154,168,0.85)'); P.rect(x - 2, 9, 2, y - 12, 'rgba(169,212,218,0.9)'); P.ring(x, y - 2.5, 7, 1.8, C.ice, 1); P.ring(x, y - 2.5, 12, 2.6, 'rgba(169,212,218,0.6)', 1); P.px(x - 9, y - 9, C.ice).px(x + 8, y - 11, C.ice).px(x + 6, y - 7, C.bone); });
    };
    EL.bell = (P, x, y) => {   // a funeral bell in a black wooden frame
      P.shadow(x, y, 12, 2.5);
      P.rect(x - 11, y - 26, 2, 26, C.wd1).rect(x + 9, y - 26, 2, 26, C.wd1).rect(x - 12, y - 27, 24, 2, C.wd0).rect(x - 12, y - 27, 24, 1, C.wd2);
      P.line(x, y - 25, x, y - 22, C.st3, 1);
      P.poly([x - 3, y - 22, x + 3, y - 22, x + 5, y - 12, x + 7, y - 9, x - 7, y - 9, x - 5, y - 12], C.wd2);
      P.poly([x - 3, y - 22, x - 1, y - 22, x - 3, y - 12, x - 5, y - 9, x - 7, y - 9, x - 5, y - 12], C.tan);
      P.rect(x - 7, y - 10, 14, 1, C.gold).oval(x + 1, y - 7, 1.4, 1.4, C.st2);
      P.after(() => { P.arc(x, y - 15, 11, -0.5, 0.5, 'rgba(230,225,214,0.6)', 1); P.arc(x, y - 15, 11, Math.PI - 0.5, Math.PI + 0.5, 'rgba(230,225,214,0.6)', 1); P.txt('♪', x + 15, y - 22, C.st4, 7); });
    };
    EL.falsedoor = (P, x, y) => {   // a doorway that is not one: the arch is painted over, a pale shimmer, an arrow the wrong way
      P.rect(x - 9, y - 19, 18, 19, C.st1).oval(x, y - 19, 9, 6, C.st1);
      P.after(() => { P.vgrad(x - 9, y - 22, 18, 22, 'rgba(160,140,232,0.35)', 'rgba(160,140,232,0.05)'); P.path([x - 6, y - 10, x + 5, y - 10], C.vi2, 1.4); P.poly([x - 6, y - 13, x - 10, y - 10, x - 6, y - 7], C.vi2); P.px(x + 3, y - 16, C.bone).px(x - 4, y - 4, C.vi2); });
    };
    EL.tar = (P, x, y) => {   // a cauldron over the door, tipping black tar
      P.after(() => P.glow(x, y - 25, 10, '#e0643c', 0.4));
      P.rect(x - 12, y - 30, 24, 2, C.wd0);
      P.oval(x + 2, y - 24, 8, 5, C.st0).oval(x + 2, y - 27, 8, 2.5, C.st1).oval(x + 2, y - 27, 6, 1.6, C.void);
      P.poly([x - 5, y - 26, x - 1, y - 24, x - 3, y - 6, x - 7, y - 6], C.void).rect(x - 9, y - 6, 9, 3, C.ink);
      P.after(() => { P.px(x - 4, y - 18, C.wd2).px(x + 5, y - 28, C.flame); flameAt(P, x + 2, y - 19, 4); });
    };
    EL.bait = (P, x, y) => {   // coins on a plate, iron jaws hiding under it
      plate(P, x, y - 1, 12, 3.5);
      for (let k = 0; k < 6; k++) { const a = Math.PI + 0.3 + k * 0.5; P.poly([x + Math.cos(a) * 12 - 1, y - 1 + Math.sin(a) * 3.5, x + Math.cos(a) * 12, y - 4 + Math.sin(a) * 3.5, x + Math.cos(a) * 12 + 1, y - 1 + Math.sin(a) * 3.5], C.st3); }
      [[-3, -2], [1, -1], [4, -2], [-1, -4], [2, -4]].forEach(([dx, dy], i) => coin(P, x + dx, y + dy, i % 2 ? C.goldHi : C.gold));
      P.after(() => P.px(x + 2, y - 6, C.hot));
    };
    // new komnaty share the room painters (ROOMS.k_lab ...); their ITEMS ids are k_lab, k_graveyard, k_abyssgate
  })();
  // ---------- 1.26: the new traps on the map ----------
  // flat on the floor (drawn in the floor's plane like the web and the trapdoor): TOP_ART[type](it, T, px, py, s)
  const FLAT_ART = { snare: 1, oilslick: 1, flood: 1, miasma: 1, bait: 1 };
  const TOP_ART = {
    snare(it, T, px, py, s) {   // open iron jaws on the floor; shut when sprung
      const cx = px + s / 2, cy = py + s / 2, shut = it.anim > 0, R = s * 0.32;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6e6a78'; ctx.lineWidth = Math.max(1.2, s * 0.05); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#b9bccb';
      if (shut) { ctx.fillRect(cx - R, cy - s * 0.03, R * 2, s * 0.06); for (let k = 0; k < 6; k++) { const x = cx - R + (k + 0.5) * R / 3; ctx.beginPath(); ctx.moveTo(x - s * 0.03, cy); ctx.lineTo(x, cy - s * 0.07); ctx.lineTo(x + s * 0.03, cy); ctx.fill(); } }
      else for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, ox = Math.cos(a) * s * 0.07, oy = Math.sin(a) * s * 0.07, nx = -Math.sin(a) * s * 0.03, ny = Math.cos(a) * s * 0.03; ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.lineTo(x - ox, y - oy); ctx.lineTo(x - nx, y - ny); ctx.fill(); }
      ctx.fillStyle = '#8a8496'; ctx.fillRect(cx - s * 0.06, cy - s * 0.06, s * 0.12, s * 0.12); ctx.fillStyle = '#c4a052'; ctx.fillRect(cx - s * 0.025, cy - s * 0.025, s * 0.05, s * 0.05);
      ctx.strokeStyle = '#55505e'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.setLineDash([s * 0.04, s * 0.03]); ctx.beginPath(); ctx.moveTo(cx + R, cy); ctx.lineTo(px + s * 0.94, py + s * 0.82); ctx.stroke(); ctx.setLineDash([]);
    },
    oilslick(it, T, px, py, s) {   // a black pool with a sheen that moves
      const cx = px + s / 2, cy = py + s / 2;
      ctx.fillStyle = '#140d08'; [[0, 0, 0.36], [-0.18, 0.12, 0.2], [0.2, -0.1, 0.22], [0.12, 0.2, 0.16], [-0.16, -0.16, 0.16]].forEach(q => { ctx.beginPath(); ctx.arc(cx + q[0] * s, cy + q[1] * s, q[2] * s, 0, Math.PI * 2); ctx.fill(); });
      const t = realNow * 0.6 + it.x;
      [['rgba(160,140,232,0.45)', 0], ['rgba(156,194,126,0.35)', 2.1], ['rgba(240,216,144,0.4)', 4.2]].forEach(([c, o]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx + Math.cos(t + o) * s * 0.14, cy + Math.sin(t + o) * s * 0.1, s * 0.12, s * 0.04, t + o, 0, Math.PI * 2); ctx.fill(); });
      if (it.anim > 0) { ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.fill(); }
    },
    flood(it, T, px, py, s) {   // a grate full of water; it spreads in rings when it floods the room
      const cx = px + s / 2, cy = py + s / 2;
      ctx.fillStyle = '#1d2633'; ctx.fillRect(px + s * 0.22, py + s * 0.22, s * 0.56, s * 0.56);
      ctx.fillStyle = 'rgba(111,154,168,0.8)'; ctx.fillRect(px + s * 0.26, py + s * 0.26, s * 0.48, s * 0.48);
      ctx.fillStyle = '#50555e'; for (let k = 0; k < 4; k++) ctx.fillRect(px + s * (0.28 + k * 0.13), py + s * 0.24, s * 0.04, s * 0.52);
      const n = it.anim > 0 ? 3 : 1;
      for (let k = 0; k < n; k++) { const u = (realNow * (it.anim > 0 ? 1.2 : 0.4) + k / n + it.x * 0.1) % 1; ctx.strokeStyle = 'rgba(169,212,218,' + (0.6 * (1 - u)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); ctx.arc(cx, cy, s * (0.2 + u * (it.anim > 0 ? 1.2 : 0.3)), 0, Math.PI * 2); ctx.stroke(); }
    },
    miasma(it, T, px, py, s) {   // a grate breathing a green cloud (a big one over 3x3 while it works)
      const cx = px + s / 2, cy = py + s / 2;
      ctx.fillStyle = '#16171c'; ctx.fillRect(px + s * 0.24, py + s * 0.24, s * 0.52, s * 0.52);
      ctx.fillStyle = '#50555e'; for (let k = 0; k < 4; k++) ctx.fillRect(px + s * 0.24, py + s * (0.27 + k * 0.13), s * 0.52, s * 0.035);
      const big = it.anim > 0, R = big ? s * 1.3 : s * 0.42, t = realNow * 0.8 + it.x;
      for (let k = 0; k < (big ? 7 : 3); k++) { const a = t + k * 2.4, rr0 = R * (0.25 + 0.5 * ((k * 0.37) % 1)); ctx.fillStyle = k % 2 ? 'rgba(124,190,90,0.22)' : 'rgba(156,194,126,0.26)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr0 * 0.6, cy + Math.sin(a) * rr0 * 0.6, R * (0.35 + 0.1 * Math.sin(t + k)), 0, Math.PI * 2); ctx.fill(); }
    },
    bait(it, T, px, py, s) {   // under the loot: a dull plate with jaws round its rim (the heroes see only the loot)
      const cx = px + s / 2, cy = py + s / 2, R = s * 0.34, shut = it.anim > 0;
      ctx.fillStyle = 'rgba(30,28,36,0.7)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shut ? '#c9cdd8' : 'rgba(150,150,165,0.55)';
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + 0.3, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, ox = Math.cos(a) * s * 0.06, oy = Math.sin(a) * s * 0.06, nx = -Math.sin(a) * s * 0.025, ny = Math.cos(a) * s * 0.025; ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.lineTo(x - ox, y - oy); ctx.lineTo(x - nx, y - ny); ctx.fill(); }
    }
  };
  // on a wall (in the wall's unit square: x along the wall, y down; k: light)
  Object.assign(WALL_ITEM, { pendulum: 1, bolt: 1 });
  const WALL_ART = {
    pendulum(it, k, hot) {   // a blade on a rod from the top of the wall; it swings through the room when it fires
      const a = hot ? Math.sin(realNow * 9) * 0.9 : Math.sin(realNow * 1.4 + it.x) * 0.12, L = 0.66, bx = 0.5 + Math.sin(a) * L, by = 0.06 + Math.cos(a) * L;
      ctx.fillStyle = k < 1 ? '#3a3a44' : '#4a4a56'; ctx.fillRect(0.4, 0.0, 0.2, 0.08);
      ctx.strokeStyle = '#767b84'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.5, 0.05); ctx.lineTo(bx, by); ctx.stroke();
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-a);
      ctx.fillStyle = k < 1 ? '#9aa0ae' : '#c5ccd8'; ctx.beginPath(); ctx.moveTo(-0.32, -0.04); ctx.quadraticCurveTo(0, 0.3, 0.32, -0.04); ctx.lineTo(0.22, -0.07); ctx.quadraticCurveTo(0, 0.1, -0.22, -0.07); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e6e1d6'; ctx.beginPath(); ctx.moveTo(-0.3, -0.01); ctx.quadraticCurveTo(0, 0.29, 0.3, -0.01); ctx.quadraticCurveTo(0, 0.22, -0.3, -0.01); ctx.fill();
      ctx.fillStyle = '#4a4a56'; ctx.fillRect(-0.04, -0.09, 0.08, 0.06);
      ctx.restore();
      if (hot) { ctx.strokeStyle = 'rgba(230,225,214,0.35)'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(0.5, 0.06, L + 0.05, Math.PI / 2 - 0.9, Math.PI / 2 + 0.9); ctx.stroke(); }
    },
    bolt(it, k, hot) {   // a slab with a storm rune; lightning when it fires
      ctx.fillStyle = k < 1 ? '#2a2b31' : '#36383f'; ctx.fillRect(0.28, 0.14, 0.44, 0.62);
      ctx.fillStyle = k < 1 ? '#3e4048' : '#4c4e58'; ctx.fillRect(0.31, 0.17, 0.38, 0.56);
      const pulse = hot ? 1 : 0.55 + 0.35 * Math.sin(realNow * 3 + it.x);
      ctx.strokeStyle = 'rgba(140,200,255,' + pulse.toFixed(2) + ')'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0.54, 0.24); ctx.lineTo(0.44, 0.44); ctx.lineTo(0.56, 0.44); ctx.lineTo(0.46, 0.66); ctx.stroke();
      if (hot) { ctx.strokeStyle = '#e6f4ff'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0.5, 0.45); for (let j = 1; j <= 5; j++) ctx.lineTo(0.5 + (Math.random() - 0.5) * 0.4, 0.45 + j * 0.12); ctx.stroke(); }
    }
  };
  // doors and furniture
  Object.assign(ISO_ART, {
    falsedoor(it, bx, by, T) {   // the doorway looks walled up: painted stone with a pale shimmer; it flickers when it fools someone
      const ax = doorAlongX(it.x, it.y), H = DOOR_H * 0.95, A = ax ? [bx - 0.45, by] : [bx, by - 0.45], B = ax ? [bx + 0.45, by] : [bx, by + 0.45];
      ctx.save(); faceMap(A[0], A[1], B[0], B[1], 0, H);
      ctx.globalAlpha *= it.anim > 0 ? 0.35 + 0.3 * Math.sin(realNow * 30) : 0.72;
      ctx.fillStyle = '#4b4755'; ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = 'rgba(20,16,26,0.5)'; for (let r = 0; r < 4; r++) { ctx.fillRect(0, r * 0.25, 1, 0.02); for (let c = 0; c < 3; c++) ctx.fillRect(((c + (r % 2) * 0.5) / 3) % 1, r * 0.25, 0.02, 0.25); }
      ctx.fillStyle = 'rgba(160,140,232,' + (0.18 + 0.12 * Math.sin(realNow * 2 + it.x)).toFixed(2) + ')'; ctx.fillRect(0, 0, 1, 1);
      ctx.restore();
    },
    tar(it, bx, by, T) {   // a cauldron of tar hanging over the doorway, tipping when it pours
      const ax = doorAlongX(it.x, it.y), H = DOOR_H, pour = it.anim > 0, tip = pour ? 0.5 : 0;
      const A = ax ? [bx - 0.5, by] : [bx, by - 0.5], B = ax ? [bx + 0.5, by] : [bx, by + 0.5];
      line2(W2S(A[0], A[1], H + 0.05), W2S(B[0], B[1], H + 0.05), '#2a1b12', Math.max(2, T * 0.07));
      const p = W2S(bx, by, H - 0.05), r = T * 0.17;
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(tip);
      ctx.fillStyle = '#26262e'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.fill(); ctx.fillRect(-r, -r * 0.3, r * 2, r * 0.3);
      ctx.fillStyle = '#0e0b08'; ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (pour) { const f = W2S(bx, by, 0); ctx.fillStyle = '#0e0b08'; ctx.fillRect(p[0] + r * 0.6, p[1], T * 0.08, f[1] - p[1]); ctx.beginPath(); ctx.ellipse(f[0] + r * 0.6, f[1], T * 0.22, T * 0.22 * SP, 0, 0, Math.PI * 2); ctx.fill(); }
      flame([p[0] - r * 0.2, p[1] + r * 1.4], T, 1.4, false);
    },
    bell(it, bx, by, T) {   // a funeral bell: on the furniture if it stands on one, else in its own black frame
      const o = fl.objects.get(key(it.x, it.y)), z = o ? objTopZ(o) : 0, sw = it.anim > 0 ? Math.sin(realNow * 14) * 0.35 : Math.sin(realNow * 0.8 + it.x) * 0.04;
      if (!o) { groundShadow(bx, by, 0.32, 0.22, 0.35); const H = 0.95; [-0.3, 0.3].forEach(d => line2(W2S(bx + d, by, 0), W2S(bx + d, by, H), '#2a1b12', Math.max(2, T * 0.07))); line2(W2S(bx - 0.36, by, H), W2S(bx + 0.36, by, H), '#3a2716', Math.max(2, T * 0.08)); }
      const top = W2S(bx, by, o ? z + 0.45 : 0.9), s = T * (o ? 0.2 : 0.26);
      if (o) line2(W2S(bx, by, z), top, '#3a2716', Math.max(1.5, T * 0.05));
      ctx.save(); ctx.translate(top[0], top[1]); ctx.rotate(sw);
      ctx.fillStyle = '#9a6a2e'; ctx.beginPath(); ctx.moveTo(-s * 0.35, 0); ctx.lineTo(s * 0.35, 0); ctx.quadraticCurveTo(s * 0.5, s * 0.7, s * 0.75, s * 1.0); ctx.lineTo(-s * 0.75, s * 1.0); ctx.quadraticCurveTo(-s * 0.5, s * 0.7, -s * 0.35, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,150,0.35)'; ctx.fillRect(-s * 0.5, s * 0.15, s * 0.18, s * 0.7);
      ctx.fillStyle = '#c4a052'; ctx.fillRect(-s * 0.75, s * 0.92, s * 1.5, s * 0.1);
      ctx.restore();
      if (it.anim > 0) { const ph = (realNow * 1.5) % 1; ctx.strokeStyle = 'rgba(230,225,214,' + (0.6 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.beginPath(); ctx.arc(top[0], top[1] + s * 0.5, T * (0.3 + 0.4 * ph), 0, Math.PI * 2); ctx.stroke(); }
    }
  });
  Object.assign(ON_OBJECT, { bell: 1 });
  // ---------- 1.26: the statue as a solid object like the barrel and the crate (it was a flat stone sprite): a stepped plinth and a
  // stone knight on it, both hands on a sword held point down, built from the same boxes, frustums and balls as the rest, lit from
  // the left; moss at its feet and a crack in the plinth ----------
  function drawStatue3D(o, cx, cy, T) {
    const top = '#8a8696', sth = '#6c6878', est = '#4e4a58', dk = '#34303c';
    const stoneBall = (x, y, z, r, col) => { const p = W2S(x, y, z + r * 0.9), rr = T * r; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(20,16,26,0.35)'; ctx.beginPath(); ctx.arc(p[0] + rr * 0.3, p[1] + rr * 0.15, rr * 0.8, -0.9, Math.PI * 0.75); ctx.fill(); return p; };
    const bar = (a, b, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, T * w); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineCap = 'butt'; };
    // the plinth: two steps, a crack, moss
    isoBox(cx, cy, 0.72, 0.72, 0.09, '#5a5664', '#4a4654', '#3a3644');
    isoBox(cx, cy, 0.6, 0.6, 0.17, top, sth, est, 0.09);
    { const a = W2S(cx - 0.2, cy + 0.3, 0.24), b = W2S(cx - 0.12, cy + 0.3, 0.16), c = W2S(cx - 0.15, cy + 0.3, 0.11); ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, T * 0.02); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
    ctx.fillStyle = 'rgba(92,140,58,0.6)'; [[-0.32, 0.35, 0.02], [-0.24, 0.36, 0.0], [0.35, 0.12, 0.03], [0.36, 0.24, 0.0], [-0.1, 0.36, 0.0]].forEach(q => { const p = W2S(cx + q[0], cy + q[1], q[2]); ctx.beginPath(); ctx.ellipse(p[0], p[1], T * 0.05, T * 0.022, 0, 0, Math.PI * 2); ctx.fill(); });
    const z0 = 0.26;
    // the cloak behind, the legs, the tabard, the chest
    isoFrustum(cx, cy - 0.08, 0.34, 0.06, 0.3, 0.06, 0.74, '#5e5a6a', '#56525f', '#46424f', z0);
    isoBox(cx - 0.07, cy + 0.02, 0.1, 0.11, 0.3, top, sth, est, z0);
    isoBox(cx + 0.07, cy + 0.02, 0.1, 0.11, 0.3, top, sth, est, z0);
    isoFrustum(cx, cy + 0.01, 0.3, 0.2, 0.26, 0.18, 0.2, top, sth, est, z0 + 0.22);
    isoFrustum(cx, cy, 0.26, 0.18, 0.36, 0.22, 0.34, top, sth, est, z0 + 0.42);
    isoBox(cx - 0.19, cy, 0.12, 0.22, 0.07, top, sth, est, z0 + 0.72);   // pauldrons
    isoBox(cx + 0.19, cy, 0.12, 0.22, 0.07, top, sth, est, z0 + 0.72);
    // the great helm: a box with a peaked top and a slit for the eyes
    isoBox(cx, cy, 0.15, 0.15, 0.17, top, sth, est, z0 + 0.78);
    { const a = W2S(cx - 0.075, cy + 0.075, z0 + 0.95), b = W2S(cx + 0.075, cy + 0.075, z0 + 0.95), c = W2S(cx + 0.075, cy - 0.075, z0 + 0.95), d = W2S(cx - 0.075, cy - 0.075, z0 + 0.95), t = W2S(cx, cy, z0 + 1.04); poly([a, b, t], sth); poly([b, c, t], est); poly([d, a, t], top); }
    { const v0 = W2S(cx - 0.06, cy + 0.076, z0 + 0.88), v1 = W2S(cx + 0.06, cy + 0.076, z0 + 0.88); bar(v0, v1, '#1e1b24', 0.026); }
    // the sword held point down in front, the arms down to its hilt
    const s0 = W2S(cx, cy + 0.2, z0 - 0.02), s1 = W2S(cx, cy + 0.2, z0 + 0.5), g0 = W2S(cx - 0.11, cy + 0.2, z0 + 0.47), g1 = W2S(cx + 0.11, cy + 0.2, z0 + 0.47);
    bar(s0, s1, '#a29eae', 0.05); bar([s0[0] - T * 0.012, s0[1]], [s1[0] - T * 0.012, s1[1]], 'rgba(255,255,255,0.22)', 0.014);
    bar(g0, g1, '#7a7686', 0.04);
    bar(W2S(cx - 0.17, cy + 0.04, z0 + 0.72), W2S(cx - 0.04, cy + 0.2, z0 + 0.55), sth, 0.07);
    bar(W2S(cx + 0.17, cy + 0.04, z0 + 0.72), W2S(cx + 0.04, cy + 0.2, z0 + 0.55), est, 0.07);
    stoneBall(cx, cy + 0.2, z0 + 0.5, 0.055, sth);
    // dust in the hollows, a cool rim on the right edge
    const r0 = W2S(cx + 0.18, cy + 0.11, z0 + 0.42), r1 = W2S(cx + 0.18, cy + 0.11, z0 + 0.76); bar(r0, r1, 'rgba(169,212,218,0.12)', 0.02);
  }
  // ---------- 1.26: small pixel signs (7 x 7 bitmaps): the effect badge on a card, the status markers over heroes ----------
  (() => {
    const { C } = ART;
    const B = s => s.split('|');
    const GLYPH = {
      up: [B('...#...|..###..|.#####.|...#...|...#...|...#...|.......'), C.goldHi],
      plus: [B('.......|...#...|...#...|.#####.|...#...|...#...|.......'), C.goldHi],
      minus: [B('.......|.......|.......|.#####.|.......|.......|.......'), C.ice],
      x2: [B('.......|....##.|#.#...#|.#...#.|#.#.#..|....###|.......'), C.flame],
      time: [B('.#####.|.#####.|..###..|...#...|..#.#..|.#...#.|.#####.'), C.ice],
      loop: [B('..###..|.#...#.|#.....#|#....###|#.....#.|.#.....|..###..'), C.vi2],
      coin: [B('..###..|.#####.|##.####|##.####|##.####|.#####.|..###..'), C.gold],
      skull: [B('.#####.|#######|#..#..#|#######|.##.##.|.#.#.#.|.......'), C.bone],
      eye: [B('.......|..###..|.#...#.|#..#..#|.#...#.|..###..|.......'), C.goldHi],
      drop: [B('...#...|...#...|..###..|.#####.|.#####.|..###..|.......'), C.gr2],
      fire: [B('...#...|..##...|..###..|.####..|.#####.|.#####.|..###..'), C.flame],
      bolt: [B('....##.|...##..|..####.|...##..|..##...|.##....|.#.....'), C.ice],
      heart: [B('.......|.##.##.|#######|#######|.#####.|..###..|...#...'), C.ess],
      fear: [B('..###..|.#####.|.#.#.#.|.#####.|.#####.|.#.#.#.|.......'), C.vi2],
      ice: [B('#..#..#|.#.#.#.|..###..|#######|..###..|.#.#.#.|#..#..#'), C.ice],
      star: [B('...#...|..###..|#######|.#####.|.##.##.|.#...#.|.......'), C.goldHi],
      grow: [B('......#|......#|....#.#|....#.#|..#.#.#|#.#.#.#|#.#.#.#'), C.gr2],
      chain: [B('##.....|#.#....|.###...|..#.#..|...###.|....#.#|.....##'), C.st4],
      crystal: [B('...#...|..###..|.##.##.|.#####.|..###..|...#...|.......'), C.ess],
      moon: [B('..###..|.##....|##.....|##.....|##.....|.##....|..###..'), C.bone],
      shield: [B('#######|#######|#######|.#####.|..###..|...#...|.......'), C.st4],
      web: [B('#..#..#|.#.#.#.|..###..|###.###|..###..|.#.#.#.|#..#..#'), C.bone],
      scroll: [B('.#####.|#.....#|.#####.|.#...#.|.#####.|#.....#|.#####.'), C.tan],
      fog: [B('.......|####...|..#####|####...|..#####|####...|.......'), C.st4],
      slow: [B('.#####.|#.....#|#.###.#|#.#.#.#|#.#...#|#.#####|.......'), C.ice],
      ghost: [B('..###..|.#####.|.#.#.#.|.#####.|.#####.|.#.#.#.|.......'), C.bone]
    };
    function bits(P, name, x, y, col) {   // draw a glyph with its top-left at (x, y)
      const gl = GLYPH[name]; if (!gl) return;
      P.g.fillStyle = col || gl[1];
      gl[0].forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') P.g.fillRect(x + i, y + j, 1, 1); });
    }
    function badge(P, name, cx, cy) {   // a dark round badge with a glyph, for the top right corner of a card
      const gl = GLYPH[name]; if (!gl) return;
      P.oval(cx, cy, 6.5, 6.5, C.void).ring(cx, cy, 6, 6, gl[1], 1);
      bits(P, name, Math.round(cx - 3.5), Math.round(cy - 3.5));
    }
    // statuses over the heroes: a glyph with a dark rim, 9 x 9, transparent
    const STATUS = { slow: ['slow', C.ice], root: ['chain', C.st4], burn: ['fire', C.flame], bleed: ['drop', C.bl2], poison: ['drop', C.gr2], oiled: ['drop', C.wd1],
      wet: ['drop', C.steel], infected: ['skull', C.gr2], marked: ['eye', C.vi2], seduced: ['heart', C.ess], dazed: ['star', C.goldHi] };
    function status(id) {
      return ART.keep('st:' + id, () => {
        const s = STATUS[id]; if (!s) return null;
        const P = ART.pic(9, 9, 1);
        bits(P, s[0], 1, 1, '#09090b');
        const c2 = document.createElement('canvas'); c2.width = 9; c2.height = 9; const g2 = c2.getContext('2d');
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => g2.drawImage(P.c, dx, dy));
        const P2 = { g: g2 }; bits(P2, s[0], 1, 1, s[1]);
        if (id === 'oiled') { g2.fillStyle = C.vi2; g2.fillRect(4, 5, 1, 1); }
        return c2;
      });
    }
    Object.assign(ART, { GLYPH, bits, badge, status, statusUrl: id => ART.url('stu:' + id, () => status(id)), STATUSES: Object.keys(STATUS) });
  })();
  // ---------- 1.26: card pictures (72 x 48): a background by the card's group, a motif (an element or an emblem), a badge
  // with what the card does to it (up, x2, minus, loop...) ----------
  (() => {
    const { C, EL, pic, quantize, hash, bricks, flags, skull, bone, coin, flameAt, badge } = ART;
    const CW = 72, CH = 48;
    // backgrounds
    const BG = {
      power(P) { bricks(P, 0, 0, CW, 22); flagsH(P, 22); },
      named(P) { bricks(P, 0, 0, CW, 22); flagsH(P, 22); },
      fear(P) { P.vgrad(0, 0, CW, CH, '#2c2048', '#0c0912'); P.oval(12, 9, 6, 6, 'rgba(230,225,214,0.55)').oval(14, 8, 5, 5, '#1a1428'); for (let k = 0; k < 5; k++) P.oval(10 + k * 14, 38 + (k % 2) * 4, 16, 2.6, 'rgba(160,140,232,0.18)'); flagsH(P, 34, [C.vi0, C.st0, C.vi0, C.void]); },
      hero(P) { bricks(P, 0, 0, CW, 24, { cols: [C.cold0, C.cold1, C.cold0, C.st0] }); flagsH(P, 24, [C.cold0, C.st0, C.cold0, C.ink]); },
      ess(P) { P.vgrad(0, 0, CW, CH, '#2a0810', '#09090b'); for (let k = 0; k < 6; k++) P.path([k * 13, 0, k * 13 + 5, 12, k * 13 - 2, 26, k * 13 + 4, 48], 'rgba(140,26,36,0.55)', 1.2); P.glow(36, 26, 26, '#cc3640', 0.35); },
      greed(P) { P.vgrad(0, 0, CW, CH, '#2a2010', '#0b0a08'); P.glow(36, 30, 28, '#f0d890', 0.25); for (let k = 0; k < 7; k++) coin(P, 6 + k * 11, 43 + (k % 2) * 2, C.wd2); },
      shop(P) { P.rect(0, 0, CW, CH, C.wd0); for (let y = 0; y < 30; y += 6) P.rect(0, y, CW, 1, C.void); for (let k = 0; k < 6; k++) P.rect(4 + k * 12, 6, 6, 7, [C.bl1, C.cold1, C.gr0, C.vi1, C.wd2, C.gold][k]).rect(4 + k * 12, 5, 6, 1, C.st3); P.rect(0, 30, CW, 18, C.wd1).rect(0, 30, CW, 2, C.wd2); P.glow(60, 4, 16, '#ffb060', 0.35); },
      heart(P) { P.vgrad(0, 0, CW, CH, '#460a10', '#140508'); for (let k = 0; k < 5; k++) P.path([k * 17 + 4, 0, k * 17 + 9, 14, k * 17 + 2, 30, k * 17 + 8, 48], 'rgba(196,160,82,0.45)', 1); P.glow(36, 24, 26, '#ff4f5e', 0.35); },
      unlock(P) { P.rect(0, 0, CW, CH, C.ink); P.rect(16, 4, 40, 40, C.st1).oval(36, 4, 20, 12, C.st1); P.rect(19, 7, 34, 37, C.vi0).oval(36, 7, 17, 10, C.vi0); P.glow(36, 26, 22, '#a08ce8', 0.45); for (let k = 0; k < 10; k++) P.px(20 + ((k * 13) % 32), 8 + ((k * 7) % 30), C.vi2); flagsH(P, 42); },
      instant(P) { P.vgrad(0, 0, CW, CH, '#1d2633', '#09090b'); for (let k = 0; k < 14; k++) P.px((k * 29) % CW, (k * 17) % 40, k % 2 ? C.goldHi : C.ice); }
    };
    function flagsH(P, y0, cols) {   // flagstones for the card's height
      cols = cols || [C.st0, C.st1, C.st0, C.cold0];
      P.rect(0, y0, CW, CH - y0, C.void); let y = y0, row = 0;
      while (y < CH) { const rh = 3 + row, sw = 10 + row * 4; let x = -((row * 7) % sw); while (x < CW) { P.rect(x + 1, y + 1, sw - 1, rh - 1, cols[(P.R() * cols.length) | 0]); x += sw; } y += rh; row++; }
      P.vgrad(0, y0, CW, 3, 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)');
    }
    // emblems (drawn standing at (x, y): their foot)
    const E = {
      crystal(P, x, y) { P.after(() => P.glow(x, y - 12, 14, '#ff6a7a', 0.45)); P.poly([x, y - 26, x + 8, y - 14, x, y - 2, x - 8, y - 14], C.bl2); P.poly([x, y - 26, x + 8, y - 14, x, y - 14], C.ess); P.poly([x - 8, y - 14, x, y - 2, x, y - 14], C.bl1); P.after(() => P.px(x - 3, y - 18, C.hot)); },
      ess(P, x, y) { P.after(() => P.glow(x, y - 12, 16, '#ff4f5e', 0.55)); P.poly([x, y - 24, x + 9, y - 12, x, y, x - 9, y - 12], C.ess); P.poly([x, y - 24, x + 9, y - 12, x, y - 12], '#ffb0b6'); P.after(() => P.px(x - 2, y - 17, C.hot)); },
      bag(P, x, y) { P.shadow(x, y, 9, 2); P.oval(x, y - 8, 9, 8, C.wd2).rect(x - 3, y - 18, 6, 3, C.wd1).oval(x, y - 20, 5, 2, C.tan); P.rect(x - 4, y - 16, 8, 1, C.gold); P.txt('$', x, y - 7, C.goldHi, 9); },
      scroll(P, x, y) { P.rect(x - 10, y - 22, 20, 18, C.tan).rect(x - 11, y - 24, 22, 3, C.wd2).rect(x - 11, y - 5, 22, 3, C.wd2); for (let k = 0; k < 4; k++) P.rect(x - 7, y - 19 + k * 3, 12 - (k % 2) * 4, 1, C.wd1); P.oval(x + 5, y - 7, 2.6, 2.6, C.bl2); },
      hourglass(P, x, y) { P.rect(x - 8, y - 26, 16, 2, C.wd2).rect(x - 8, y - 2, 16, 2, C.wd2); P.poly([x - 6, y - 24, x + 6, y - 24, x + 1, y - 13, x + 6, y - 2, x - 6, y - 2, x - 1, y - 13], 'rgba(169,212,218,0.45)'); P.poly([x - 4, y - 22, x + 4, y - 22, x, y - 15], C.tan); P.poly([x - 5, y - 2, x + 5, y - 2, x, y - 8], C.tan); P.line(x, y - 15, x, y - 3, C.tan, 1); },
      lock(P, x, y) { P.rect(x - 8, y - 14, 16, 13, C.gold).rect(x - 8, y - 14, 16, 2, C.goldHi); P.arc(x, y - 15, 5, Math.PI, 0, C.st4, 2.4); P.rect(x - 1, y - 10, 2, 5, C.void); },
      vein(P, x, y) { P.poly([x - 16, y, x - 10, y - 20, x + 6, y - 24, x + 16, y - 10, x + 12, y], C.st1); P.after(() => { P.path([x - 10, y - 4, x - 4, y - 12, x + 2, y - 10, x + 8, y - 18], C.ess, 2); P.glow(x, y - 12, 12, '#ff4f5e', 0.4); }); },
      scales(P, x, y) { P.rect(x - 1, y - 24, 2, 22, C.gold).rect(x - 6, y - 2, 12, 2, C.gold); P.line(x - 13, y - 21, x + 13, y - 17, C.gold, 1.5); P.oval(x - 13, y - 14, 5, 1.6, C.gold); P.oval(x + 13, y - 10, 5, 1.6, C.gold); P.path([x - 13, y - 21, x - 17, y - 14], C.st3, 1); P.path([x - 13, y - 21, x - 9, y - 14], C.st3, 1); P.path([x + 13, y - 17, x + 9, y - 10], C.st3, 1); P.path([x + 13, y - 17, x + 17, y - 10], C.st3, 1); coin(P, x + 13, y - 12); },
      scythe(P, x, y) { P.line(x - 6, y, x + 4, y - 28, C.wd2, 2); P.poly([x + 4, y - 28, x + 18, y - 22, x + 20, y - 18, x + 8, y - 24], C.st4); P.poly([x + 4, y - 28, x + 18, y - 22, x + 12, y - 24], C.bone); },
      skull(P, x, y) { P.shadow(x, y, 9, 2); skull(P, x, y - 12, 8); P.rect(x - 5, y - 4, 10, 1, C.st3); P.after(() => { P.px(x - 4, y - 13, C.ess).px(x + 3, y - 13, C.ess); }); },
      stairs(P, x, y) { for (let k = 0; k < 5; k++) P.rect(x - 16 + k * 6, y - 4 - k * 5, 34 - k * 6, 4 + k * 5, k % 2 ? C.st2 : C.st1).rect(x - 16 + k * 6, y - 4 - k * 5, 34 - k * 6, 1, C.st3); P.after(() => P.glow(x - 14, y - 2, 12, '#cc3640', 0.4)); },
      book(P, x, y) { P.poly([x - 16, y - 18, x, y - 14, x, y, x - 16, y - 4], C.bone); P.poly([x + 16, y - 18, x, y - 14, x, y, x + 16, y - 4], '#c9bfa8'); P.line(x, y - 14, x, y, C.wd1, 1); for (let k = 0; k < 4; k++) { P.line(x - 13, y - 14 + k * 3, x - 3, y - 12 + k * 3, C.st3, 1); P.line(x + 3, y - 12 + k * 3, x + 13, y - 14 + k * 3, C.st3, 1); } },
      maze(P, x, y) { P.rect(x - 14, y - 26, 28, 26, C.st0); [[0, 0, 28, 2], [0, 0, 2, 26], [0, 24, 20, 2], [26, 0, 2, 26], [6, 6, 16, 2], [6, 6, 2, 13], [12, 12, 2, 12], [18, 12, 10, 2]].forEach(([a, b2, w, h]) => P.rect(x - 14 + a, y - 26 + b2, w, h, C.st3)); P.after(() => P.px(x + 3, y - 9, C.goldHi)); },
      mouth(P, x, y) { P.oval(x, y - 14, 12, 12, C.skin).oval(x, y - 10, 6, 7, C.void).rect(x - 5, y - 17, 10, 2, C.bone); P.oval(x - 5, y - 20, 2, 1.4, C.void).oval(x + 5, y - 20, 2, 1.4, C.void); P.after(() => { P.arc(x, y - 12, 15, -0.5, 0.5, C.vi2, 1); P.arc(x, y - 12, 19, -0.4, 0.4, 'rgba(160,140,232,0.6)', 1); }); },
      hero(P, x, y) { P.shadow(x, y, 7, 2); P.fig('warrior', x, y + 1, 1, false, 0); },
      heroes(P, x, y) { P.shadow(x, y, 16, 2.4); P.fig('thief', x - 11, y, 1, false, 0); P.fig('priest', x + 11, y, 1, true, 0); P.fig('warrior', x, y + 2, 1, false, 0); },
      ear(P, x, y) { P.oval(x, y - 14, 8, 12, C.skin).oval(x + 1, y - 14, 4, 8, '#b07a5a'); P.oval(x + 2, y - 12, 2, 4, C.wd1); P.after(() => { P.arc(x - 6, y - 14, 12, Math.PI * 0.8, Math.PI * 1.2, C.bone, 1); }); },
      steps(P, x, y) { P.after(() => [[-14, -2], [-6, -8], [2, -2], [10, -8], [18, -2]].forEach(([dx, dy], i) => { P.oval(x + dx, y + dy, 2.6, 1.6, i < 3 ? C.bone : 'rgba(160,140,232,0.8)'); P.oval(x + dx + 2, y + dy - 2.5, 1.2, 0.9, i < 3 ? C.bone : 'rgba(160,140,232,0.8)'); })); },
      shield(P, x, y) { P.poly([x - 11, y - 26, x + 11, y - 26, x + 11, y - 12, x, y - 1, x - 11, y - 12], C.cold1); P.poly([x - 9, y - 24, x + 9, y - 24, x + 9, y - 13, x, y - 4, x - 9, y - 13], C.steel); P.rect(x - 1, y - 24, 2, 20, C.gold).rect(x - 9, y - 17, 18, 2, C.gold); },
      blood(P, x, y) { P.oval(x, y - 3, 12, 3, C.bl1); P.poly([x, y - 26, x + 7, y - 12, x, y - 6, x - 7, y - 12], C.bl2); P.oval(x, y - 11, 7, 6, C.bl2); P.after(() => P.px(x - 3, y - 15, '#ffb0b6')); },
      dice(P, x, y) { P.rect(x - 14, y - 14, 12, 12, C.bone).rect(x + 2, y - 18, 12, 12, '#c9bfa8'); [[-11, -11], [-5, -5], [-8, -8]].forEach(([dx, dy]) => P.rect(x + dx, y + dy, 2, 2, C.bl1)); [[5, -15], [11, -9], [5, -9], [11, -15]].forEach(([dx, dy]) => P.rect(x + dx, y + dy, 2, 2, C.void)); },
      sack(P, x, y) { P.shadow(x, y, 10, 2); P.oval(x, y - 9, 10, 9, C.tan).rect(x - 4, y - 21, 8, 4, C.wd2); P.dabs(x - 8, y - 14, 16, 10, [C.wd2, C.gold], 8); P.after(() => P.px(x - 2, y - 20, C.goldHi)); },
      gear(P, x, y) { const cy = y - 13; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P.oval(x + Math.cos(a) * 11, cy + Math.sin(a) * 11, 2.6, 2.6, C.tan); } P.oval(x, cy, 11, 11, C.wd2).oval(x, cy, 9, 9, C.tan).oval(x, cy, 4, 4, C.void); },
      sword(P, x, y) { P.line(x - 14, y - 2, x + 12, y - 24, C.st4, 3); P.line(x - 13, y - 3, x + 11, y - 23, C.bone, 1); P.line(x - 14, y - 10, x - 6, y - 2, C.gold, 2.4); P.line(x - 16, y, x - 12, y - 4, C.wd1, 2.4); P.after(() => P.px(x + 6, y - 18, C.hot)); },
      hammer(P, x, y) { P.line(x - 10, y, x + 6, y - 20, C.wd2, 2.4); P.poly([x - 2, y - 26, x + 14, y - 18, x + 11, y - 12, x - 5, y - 20], C.st3); P.poly([x - 2, y - 26, x + 14, y - 18, x + 13, y - 16, x - 3, y - 24], C.st4); },
      flame(P, x, y) { P.after(() => { P.glow(x, y - 12, 18, '#ff8a3a', 0.55); flameAt(P, x, y, 24); }); P.oval(x, y - 1, 8, 2, C.st1); },
      drop(P, x, y) { P.after(() => P.glow(x, y - 12, 14, '#7fe05a', 0.4)); P.poly([x, y - 26, x + 8, y - 11, x - 8, y - 11], C.gr1); P.oval(x, y - 10, 8, 8, C.gr1); P.oval(x - 2, y - 12, 4, 5, C.gr2); P.after(() => P.px(x - 4, y - 14, C.bone)); },
      target(P, x, y) { [12, 8, 4].forEach((r, i) => P.oval(x, y - 13, r, r, i % 2 ? C.bone : C.bl2)); P.after(() => { P.line(x + 16, y - 25, x + 1, y - 14, C.wd2, 1.5); P.poly([x + 1, y - 14, x + 5, y - 15, x + 3, y - 18], C.st4); }); },
      arsenal(P, x, y) { P.line(x - 12, y, x + 6, y - 26, C.st4, 2); P.line(x + 12, y, x - 6, y - 26, C.st4, 2); P.poly([x - 3, y - 26, x + 8, y - 28, x + 7, y - 22], C.st3); E.shield(P, x, y + 2); },
      moon(P, x, y) { P.after(() => { P.glow(x, y - 14, 16, '#d9ccff', 0.35); P.oval(x, y - 14, 10, 10, C.bone); P.oval(x + 4, y - 16, 9, 9, '#1a1428'); P.px(x - 6, y - 12, C.st4); }); },
      mug(P, x, y) { P.rect(x - 7, y - 16, 12, 15, C.wd2).rect(x - 7, y - 16, 12, 2, C.tan); P.arc(x + 6, y - 9, 4, -Math.PI / 2, Math.PI / 2, C.wd2, 2); P.oval(x - 1, y - 17, 6, 2, C.bone); P.rect(x - 7, y - 10, 12, 1, C.gold); },
      scar(P, x, y) { E.hero(P, x, y); P.after(() => { P.path([x - 3, y - 22, x + 3, y - 14], C.bl2, 1.4); }); },
      cell(P, x, y) { P.shade(x, y - 12, 20, 0.6); E.hero(P, x, y); P.after(() => P.glow(x, y - 26, 8, '#a9d4da', 0.25)); },
      door(P, x, y) { P.rect(x - 11, y - 26, 22, 26, C.st1).oval(x, y - 26, 11, 6, C.st1); P.poly([x - 8, y, x - 8, y - 24, x + 6, y - 26, x + 6, y + 1], C.wd1); P.rect(x + 2, y - 13, 2, 2, C.gold); P.after(() => { P.rect(x + 6, y - 24, 2, 24, 'rgba(255,200,120,0.4)'); }); },
      fogE(P, x, y) { for (let k = 0; k < 6; k++) P.oval(x - 16 + (k * 7) % 32, y - 4 - k * 4, 14, 2.4, 'rgba(185,196,216,0.45)'); },
      heart(P, x, y) { P.after(() => P.glow(x, y - 13, 16, '#ff4f5e', 0.5)); const cy = y - 14; P.oval(x - 5, cy - 4, 6, 6, C.bl2).oval(x + 5, cy - 4, 6, 6, C.bl2).poly([x - 11, cy - 3, x + 11, cy - 3, x, cy + 11], C.bl2); P.oval(x - 6, cy - 6, 2.4, 2, '#ffb0b6'); P.path([x - 2, cy - 9, x - 4, cy - 14], C.bl1, 2); },
      wall(P, x, y) { bricks(P, x - 16, y - 24, x + 16, y, { cols: [C.st2, C.st1, C.st2], hi: C.st3 }); },
      wisp(P, x, y) { E.fogE(P, x, y); P.after(() => { [[-8, -16], [6, -20], [12, -10]].forEach(([dx, dy]) => { P.glow(x + dx, y + dy, 6, '#a9d4da', 0.6); P.px(x + dx, y + dy, C.hot); }); }); },
      cauldron(P, x, y) { P.oval(x, y - 6, 12, 7, C.st0).oval(x, y - 12, 12, 3, C.st1).oval(x, y - 12, 10, 2.2, C.bl1); P.after(() => { P.glow(x, y - 4, 12, '#ff8a3a', 0.4); flameAt(P, x - 5, y + 1, 5); flameAt(P, x + 5, y + 1, 5); coin(P, x - 3, y - 13); coin(P, x + 4, y - 14); }); },
      swamp(P, x, y) { P.oval(x, y - 4, 20, 5, C.gr0).oval(x, y - 5, 17, 3.5, C.gr1); [[-12, -4], [10, -5]].forEach(([dx, dy]) => { P.line(x + dx, y + dy, x + dx - 1, y + dy - 14, C.gr1, 1); P.oval(x + dx - 1, y + dy - 15, 1.2, 2.4, C.wd2); }); },
      iceE(P, x, y) { P.oval(x, y - 4, 20, 5, C.ice).oval(x - 4, y - 5, 10, 2, C.bone); for (let k = 0; k < 4; k++) P.poly([x - 14 + k * 9, y - 26, x - 10 + k * 9, y - 26, x - 12 + k * 9, y - 16 + (k % 2) * 3], C.ice); },
      crown(P, x, y) { P.after(() => P.glow(x, y - 12, 15, '#f0d890', 0.4)); P.poly([x - 13, y - 4, x - 13, y - 18, x - 7, y - 11, x, y - 22, x + 7, y - 11, x + 13, y - 18, x + 13, y - 4], C.gold); P.rect(x - 13, y - 6, 26, 3, C.goldHi); [[-7, -8, C.ess], [0, -9, C.ice], [7, -8, C.gr2]].forEach(([dx, dy, c]) => P.oval(x + dx, y + dy, 1.6, 1.6, c)); },
      stoneheart(P, x, y) { const cy = y - 14; P.oval(x - 5, cy - 4, 6, 6, C.st3).oval(x + 5, cy - 4, 6, 6, C.st3).poly([x - 11, cy - 3, x + 11, cy - 3, x, cy + 11], C.st3); P.path([x - 4, cy - 8, x, cy - 1, x - 2, cy + 4], C.st1, 1); P.after(() => P.glow(x, cy, 10, '#ff4f5e', 0.2)); },
      palette(P, x, y) { [[C.wd2, -14], [C.ember, -8], [C.vi1, -2], [C.st3, 4], [C.gr1, 10], [C.bone, 16]].forEach(([c, dx], i) => { P.oval(x + dx - 1, y - 8 - (i % 2) * 6, 4, 4, c); }); },
      star(P, x, y) { P.after(() => { P.glow(x, y - 13, 16, '#f0d890', 0.5); P.poly([x, y - 26, x + 3, y - 17, x + 12, y - 17, x + 5, y - 11, x + 8, y - 2, x, y - 7, x - 8, y - 2, x - 5, y - 11, x - 12, y - 17, x - 3, y - 17], C.goldHi); }); },
      mirror2(P, x, y) { EL.mirror(P, x - 9, y - 13); EL.mirror(P, x + 9, y - 13); },
      bolt(P, x, y) { P.after(() => { P.glow(x, y - 13, 16, '#8cc8ff', 0.5); P.poly([x + 4, y - 27, x - 7, y - 12, x, y - 12, x - 4, y + 1, x + 8, y - 16, x + 1, y - 16], C.ice); P.path([x + 4, y - 27, x - 7, y - 12], C.bone, 1); }); },
      coins(P, x, y) { EL.loot(P, x, y); },
      heartAltar(P, x, y) { P.rect(x - 9, y - 7, 18, 7, C.st1).rect(x - 10, y - 8, 20, 2, C.st2); P.g.save(); P.g.translate(x, y - 6); P.g.scale(0.75, 0.75); P.g.translate(-x, -(y - 6)); E.heart(P, x, y - 6); P.g.restore(); P.after(() => { [[-14, -16], [14, -18], [-11, -26], [12, -27]].forEach(([dx, dy]) => P.poly([x + dx, y + dy - 3, x + dx + 2, y + dy, x + dx, y + dy + 3, x + dx - 2, y + dy], C.ess)); }); },
      tithe(P, x, y) { E.heart(P, x, y + 2); P.after(() => { [[-16, -24], [14, -22], [-12, -10], [16, -8]].forEach(([dx, dy]) => coin(P, x + dx, y + dy)); P.path([x - 14, y - 22, x - 8, y - 18], C.goldHi, 1); P.path([x + 13, y - 20, x + 8, y - 17], C.goldHi, 1); }); },
      gluttonE(P, x, y) { E.heart(P, x, y); P.after(() => { [[-6, -4], [-1, -2], [5, -5]].forEach(([dx, dy]) => { P.rect(x + dx, y + dy, 1, 4, C.bl2); P.px(x + dx, y + dy + 4, C.bl1); }); P.oval(x, y + 1, 11, 2, C.bl1); }); },
      pulse(P, x, y) { E.heart(P, x, y); P.after(() => P.path([x - 30, y - 12, x - 14, y - 12, x - 10, y - 20, x - 6, y - 4, x - 2, y - 14, x + 30, y - 14], C.goldHi, 1.2)); },
      heartRunes(P, x, y) { E.heart(P, x, y); P.after(() => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P.px(Math.round(x + Math.cos(a) * 16), Math.round(y - 14 + Math.sin(a) * 13), C.ice); } P.ring(x, y - 14, 16, 13, 'rgba(169,212,218,0.35)', 1); }); },
      heartEcho(P, x, y) { P.g.globalAlpha = 0.45; E.heart(P, x - 8, y - 2); P.g.globalAlpha = 1; E.heart(P, x + 5, y); },
      chest(P, x, y) { EL.loot2(P, x, y); }
    };
    // the motif and the badge of every card: 'motif[+motif2]|badge|background' (motif: an element id or @emblem)
    const T_ = {
      crystal: '@crystal|plus|heart', infusion: '@ess|plus|ess', gift: '@bag|x2|shop', pact: '@scroll|minus|ess',
      spikes: 'spikes|up', cooldown: '@hourglass|minus', walls: 'arrows|time', powder: 'powder|plus', arrows: 'arrows|fire', gate: 'gate|up', web: 'web|x2', fire: 'fire|up',
      mimic: 'mimic|up', trapdoor: 'trapdoor|up', cage: 'cage|x2', portrait: 'portrait|up|fear', spider: 'spider|web', ghost: 'ghost|ice|fear', monster: 'goblin|up',
      loottrap: 'loot|drop', disarm: '@lock|x2|hero', suicide: 'spikes|skull|hero', essence: '@ess|up|ess', income: '@vein|plus|ess', usurer: '@scales|plus|ess', dig: 'dig|minus',
      mole: 'dig|star', harvest: '@scythe|plus|ess', soul: '@skull|x2|ess', greed: '@coins|eye|greed', fever: '@coins|fire|greed', depth: '@stairs|up', infamous: '@crystal|coin|greed',
      collector: '@book|coin|greed', miser: '@bag|minus|greed', lonely: '@hero|x2|fear', maze: '@maze|fear|fear', haunt: 'ghost|up|fear', echo: '@mouth|x2|fear', panic: '@heroes|fear|fear',
      hgallery: 'portrait+ghost|x2|fear', curse: '@crystal|skull|fear', deaf: '@ear|minus|hero', trails: '@steps|eye|hero', cursed: '@shield|minus|hero', sticky: 'spikes+web|x2', wildfire: 'fire|loop',
      blood: '@blood|up', calm: '@hourglass|x2', well: 'trapdoor|crystal', echofire: 'spikes|loop', glass: '@crystal|x2|greed', nopick: '@coins|x2|greed', gambler: '@dice|x2', choir: 'portrait|loop|fear',
      hunger: 'spikes|grow', chronicle: '@book|fear|fear', granary: '@sack|minus|ess', bank: '@chest|grow|ess', tempered: '@gear|grow', bloodpact: '@scroll|x2|ess', overload: '@gear|bolt', cheapwalls: 'expand|minus|ess',
      firepit: 'trapdoor|fire', cageghost: 'cage|fear|fear', monsterroar: 'ogre|fear|fear', sharp: '@sword|up', heavy: '@hammer|up', oil: '@flame|up', venom: '@drop|up', weakspot: '@target|x2|hero',
      anatomy: '@book|eye|hero', arsenal: '@arsenal|star', nightmares: '@moon|x2|fear', oddbodies: '@mug|plus|hero', scars: '@scar|skull|fear', memories: '@door|fear|fear', survivors: '@heroes|loop|hero',
      dread: '@fogE|time|fear', screams: '@mouth|fear|fear', isolation: '@cell|fear|fear', heavyair: '@fogE|up|fear', lastgasp: '@skull|fear|fear', broker: '@bag|minus|shop', luckydraw: '@dice|loop|shop',
      pawnshop: '@scales|x2|shop', deepstash: '@chest|plus|shop', patron: '@scroll|star|shop', hoard: '@chest|coin|shop', wager: '@heart|coin|ess', gluttony: '@gluttonE|up|ess', fasting: '@heart|minus|ess',
      heartbeat: '@pulse|bolt|ess', gilded: 'spikes|coin|greed', golddust: 'loot|up|greed', reliquary: 'loot3|up|greed', pack: 'goblin|up', quickarm: '@hammer|time', drawers: 'mimic|eye', lure: '@ear|plus|hero',
      onemore: '@hourglass|plus|hero', thickwalls: '@wall|minus|hero', risen: 'ghost|skull|fear', cell: 'trapdoor+cage|x2', vaultsnap: 'loot|bolt|greed', wisps: '@wisp|fog|fear', body: '@skull|eye|fear',
      falsecall: '@mouth|ghost|fear', frames: 'portrait|eye|fear', restock: 'powder|loop', lullsleep: 'musicbox|moon|fear', ambush: 'goblin|eye', cocoons: 'web|fear|fear', cauldron: '@cauldron|coin|ess',
      batscatter: 'bats|fear|fear', skullwall: '@skull|grow|fear', strip: 'arrows|minus', mire: '@swamp|time', farecho: '@mouth|loop|fear', deepsleep: '@moon|x2', gearlink: '@gear|loop', blackice: '@iceE|skull',
      badnews: '@scroll|fear|fear', coins: 'loot|plus|greed', tainted: 'lpotion|skull|hero', rhythm: '@hourglass|plus',
      // 1.26: the cards of the heart (dawne Dary) and the new cards
      regrow: '@crystal|plus|heart', heartcry: '@mouth|heart|heart', heavycrystal: '@crystal|time|heart', heartroom: '@heartAltar|plus|heart', warden: 'ogre|heart|heart', darkforge: '@hammer|minus|heart',
      darklore: '@book|plus|heart', heartmem: '@heartRunes|eye|heart', tithe: '@tithe|minus|heart', stoneheart: '@stoneheart|minus|heart', bloodcredit: '@scroll|heart|heart', glutton: '@gluttonE|x2|heart',
      bloodflow: '@blood|heart|heart', kingsfeast: '@crown|heart|heart', lastbreath: '@skull|up|heart', heartpulse: '@pulse|up|heart',
      fearcrown: '@crown|x2|fear', bloodbath: '@blood|x2', lonewolf: '@hero|x2', palette: '@palette|x2', minimalist: 'spikes|x2', cursedcrown: '@crown|skull',
      skulls: '@skull|grow', execdiary: '@book|skull', risinglegend: '@star|grow|greed', pantry: '@sack|grow|ess',
      copyist: '@mirror2|loop', soulmirror: 'mirror|loop', doubleedge: 'spikes|x2', sharedmech: '@gear|chain', chainreact: '@bolt|chain', heartecho: '@heartEcho|loop|heart',
      tarsulfur: 'tar|fire', conduct: 'bolt|chain', toxicfume: 'miasma|up', plague: 'zombie|drop', hellpack: 'hound|x2', bonesunbroken: 'skeleton|loop', undyingarmy: 'skeleton|skull', abysspact: 'demon|scroll',
      goldendream: 'loot|moon|greed', croesus: '@crown|coin|greed'
    };
    const HEART_IDS = new Set(['regrow', 'heartcry', 'heavycrystal', 'heartroom', 'warden', 'darkforge', 'darklore', 'heartmem', 'tithe', 'stoneheart', 'bloodcredit', 'glutton', 'bloodflow', 'kingsfeast', 'lastbreath', 'heartpulse']);
    ART.NEW_CARDS = Object.keys(T_).filter(id => !UPG[id]);
    ART.isHeart = id => HEART_IDS.has(id) || !!(UPG[id] && UPG[id].group === 'heart');
    const STAGE = { arrows: 'wall', fire: 'wall', portrait: 'wall', eyes: 'wall', mirror: 'wall', pendulum: 'wall', bolt: 'wall', gate: 'door', creak: 'door', falsedoor: 'door', tar: 'door' };
    function spec(id) {
      const u = UPG[id];
      if (T_[id]) { const [m, b, g] = T_[id].split('|'); return { m: m.split('+'), b, g: g || (ART.isHeart(id) ? 'heart' : u && u.kind === 'instant' ? 'instant' : (u && FUSE_GROUP[id]) || 'power') }; }
      if (u && u.kind === 'unlock') return { m: [u.unlock], b: 'plus', g: 'unlock' };
      if (u && u.req) return { m: [u.req], b: 'up', g: 'named' };
      if (u) return { m: ['@star'], b: u.kind === 'instant' ? 'plus' : 'up', g: ART.isHeart(id) ? 'heart' : u.kind === 'instant' ? 'instant' : FUSE_GROUP[id] || 'power' };
      return null;
    }
    function paintCard(id) {
      const s = spec(id); if (!s) return null;
      const P = pic(CW, CH, hash('card' + id)), posts = [];
      P.after = fn => { const m = P.g.getTransform(); posts.push(() => { P.g.save(); P.g.setTransform(m); fn(); P.g.restore(); }); return P; };
      (BG[s.g] || BG.power)(P);
      const draw = (m, x, y, k) => {
        const em = m[0] === '@', f = em ? E[m.slice(1)] : EL[m], st = !em && STAGE[m];
        if (!f) return;
        const ay = st === 'wall' ? y - 18 : st === 'door' ? y - 2 : y;
        if (k !== 1) { P.g.save(); P.g.translate(x, ay); P.g.scale(k, k); P.g.translate(-x, -ay); }
        if (!em && ART.ROOMS[m]) ART.ROOMS[m](P); else f(P, x, ay);
        if (k !== 1) P.g.restore();
      };
      if (s.m.length > 1) { draw(s.m[0], 24, 42, 0.95); draw(s.m[1], 50, 43, 0.95); }
      else draw(s.m[0], 34, 43, (ART.CARD_K && ART.CARD_K[s.m[0]]) || 1.15);
      P.light(20, 8, 70, s.g === 'fear' || s.g === 'hero' ? 0.05 : 0.12);
      posts.forEach(f => f());
      quantize(P.c);
      if (s.b) badge(P, s.b, 63, 8);
      return P.c;
    }
    ART.CARD_K = { spikes: 1.5, trapdoor: 1.35, coffin: 1.3, bones: 1.4, loot: 1.6, lpotion: 1.4, loot2: 1.45, loot3: 1.35, lcursed: 1.45, web: 1.35, snare: 1.4, bait: 1.5, oilslick: 1.3, '@coins': 1.5, '@chest': 1.4, mimic: 1.25, powder: 1.2, cage: 1.3, eyes: 1.4 };
    ART.card = id => ART.url('card:' + id, () => paintCard(id));
    ART.cardCanvas = id => ART.keep('card:' + id, () => paintCard(id));
    ART.EMB = E;
  })();
  // ---------- 1.26: the four new hero classes as figures (same hook as the monsters) ----------
  Object.assign(FIG_ART, {
    paladin({ r, P, b, legs, head, arm }) {   // white tabard with a gold sun, a great helm with a plume, a round shield and a mace
      r(3, 13 + b, 5, 7, P.steel[1]); r(4, 14 + b, 3, 5, '#d9d0b9'); r(5, 15 + b, 1, 3, P.gold[0]); r(4, 16 + b, 3, 1, P.gold[0]);   // the shield with a sun
      legs(P.steel[1], P.dark);
      r(7, 13 + b, 6, 8, P.steel[0]); r(7, 13 + b, 1, 8, P.steel[1]); r(8, 14 + b, 4, 7, '#e6dfcc'); r(8, 14 + b, 1, 7, '#b8af98'); r(9, 16 + b, 2, 2, P.gold[0]); r(7, 20 + b, 6, 1, P.belt);
      r(7, 6 + b, 6, 7, P.steel[0]); r(7, 6 + b, 1, 7, P.steel[1]); r(8, 6 + b, 4, 1, P.steelHi); r(9, 9 + b, 4, 1, P.dark); r(10, 11 + b, 1, 2, P.dark);   // great helm, slit, breaths
      r(9, 3 + b, 2, 3, '#e6e1d6'); r(10, 2 + b, 2, 1, '#e6e1d6');   // plume
      arm(12, 14 + b, P.steel[1], 5); r(12, 19 + b, 2, 1, P.steel[0]);
      r(14, 10 + b, 1, 10, P.wood[1]); r(13, 8 + b, 3, 3, P.steel[0]); r(13, 8 + b, 1, 3, P.steelHi); r(14, 7 + b, 1, 1, P.gold[0]);
    },
    ranger({ r, P, b, legs, head, arm }) {   // a green hood and cloak, a quiver, a longbow
      r(5, 12 + b, 2, 8, '#6a4a2a'); r(5, 10 + b, 1, 3, '#d9d0b9'); r(6, 10 + b, 1, 2, '#d9d0b9');   // quiver and fletchings
      r(6, 13 + b, 2, 12, '#2a4a2a');   // cloak behind
      legs('#4a3a26', P.dark);
      r(7, 13 + b, 6, 8, '#5a4630'); r(7, 13 + b, 1, 8, '#3e2f20'); r(7, 18 + b, 6, 1, P.belt); r(9, 14 + b, 1, 4, '#3e2f20');
      head(9 + b, P.skin);
      r(7, 6 + b, 6, 4, '#7a5a34'); r(7, 9 + b, 1, 5, '#7a5a34'); r(7, 6 + b, 1, 7, '#53391f'); r(12, 7 + b, 1, 2, '#53391f'); r(12, 5 + b, 1, 1, '#7a5a34'); r(8, 6 + b, 4, 1, '#9a7a4a');
      arm(12, 14 + b, '#3e2f20', 4); r(12, 18 + b, 2, 1, P.skin[0]);
      r(15, 7 + b, 1, 2, P.wood[0]); r(16, 9 + b, 1, 10, P.wood[0]); r(15, 19 + b, 1, 2, P.wood[0]); r(15, 9 + b, 1, 10, 'rgba(220,210,190,0.55)');
    },
    alchemist({ r, P, b, legs, head, arm }) {   // leather apron, brass goggles, a satchel of bottles, a green flask
      r(4, 14 + b, 3, 6, '#6a4a2a'); r(4, 13 + b, 1, 2, '#8be38f'); r(6, 13 + b, 1, 2, '#c78be3');   // bottles in the satchel
      legs('#3e3a44', P.dark);
      r(7, 13 + b, 6, 8, '#6a5a4a'); r(7, 13 + b, 1, 8, '#4a3e32'); r(8, 15 + b, 4, 6, '#8a6a42'); r(8, 15 + b, 4, 1, '#a88a5a'); r(7, 20 + b, 6, 1, P.belt);
      head(8 + b, P.skin);
      r(8, 7 + b, 5, 2, '#5a3f2a'); r(7, 7 + b, 1, 4, '#5a3f2a');   // hair
      r(9, 9 + b, 4, 2, P.gold[1]); r(10, 9 + b, 1, 1, '#a9d4da'); r(12, 9 + b, 1, 1, '#a9d4da');   // goggles
      arm(12, 14 + b, '#6a5a4a', 4); r(12, 18 + b, 2, 1, P.skin[0]);
      r(14, 15 + b, 2, 1, '#d9dbe6'); r(13, 16 + b, 4, 3, '#4fb05a'); r(14, 16 + b, 1, 1, '#9cf0a0');   // the flask
    },
    cultist({ r, P, b, robe, arm }) {   // a deep red hooded robe, a pale face in the shadow, a candle
      robe(['#5a1420', '#3a0c14'], 12 + b);
      r(9, 14 + b, 2, 13, '#3a0c14');
      r(7, 6 + b, 6, 7, '#5a1420'); r(7, 6 + b, 1, 7, '#3a0c14'); r(12, 7 + b, 1, 5, '#3a0c14'); r(9, 4 + b, 3, 2, '#5a1420');
      r(9, 8 + b, 3, 4, '#c9b8a8'); r(9, 8 + b, 3, 1, '#2a0810'); r(10, 10 + b, 1, 1, '#2a0810'); r(11, 9 + b, 1, 1, '#ff5a5a');   // a face in the shadow of the hood
      arm(12, 14 + b, '#3a0c14', 4); r(12, 18 + b, 2, 1, '#c9b8a8');
      r(14, 14 + b, 1, 4, '#e6e1d6'); r(14, 12 + b, 1, 2, '#ffb35c'); r(14, 11 + b, 1, 1, '#fff1c8');   // the candle
    }
  });
  // ---------- 1.26: Runy rodów (32 x 32), family crests (24 x 24), omens (96 x 48) ----------
  (() => {
    const { C, pic, quantize, hash, skull, coin, flameAt, bricks, EL, EMB } = ART;
    const FAM = {
      mech: { col: '#c9d5e2', dark: C.cold1, sign: (P, x, y, s) => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P.oval(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42, s * 0.12, s * 0.12, C.st4); } P.oval(x, y, s * 0.42, s * 0.42, C.st4).oval(x, y, s * 0.16, s * 0.16, C.void); } },
      fire: { col: C.ember, dark: C.bl0, sign: (P, x, y, s) => flameAt(P, x, y + s * 0.5, s) },
      alch: { col: C.gr2, dark: C.gr0, sign: (P, x, y, s) => { P.oval(x, y + s * 0.15, s * 0.36, s * 0.32, C.gr1).rect(x - s * 0.1, y - s * 0.45, s * 0.2, s * 0.32, C.st4).oval(x, y + s * 0.1, s * 0.25, s * 0.12, C.gr2); } },
      haunt: { col: '#a6e8ff', dark: C.cold1, sign: (P, x, y, s) => { P.oval(x, y - s * 0.1, s * 0.32, s * 0.32, C.bone).rect(x - s * 0.32, y - s * 0.1, s * 0.64, s * 0.5, C.bone); P.px(Math.round(x - s * 0.14), Math.round(y - s * 0.1), C.void).px(Math.round(x + s * 0.1), Math.round(y - s * 0.1), C.void); } },
      undead: { col: C.bone, dark: C.st1, sign: (P, x, y, s) => skull(P, x, y - s * 0.05, s * 0.36) },
      beast: { col: '#d4cbe8', dark: C.vi0, sign: (P, x, y, s) => { for (let k = 0; k < 4; k++) { P.line(x, y, x - s * 0.5, y - s * 0.4 + k * s * 0.27, C.st4, 1); P.line(x, y, x + s * 0.5, y - s * 0.4 + k * s * 0.27, C.st4, 1); } P.oval(x, y + s * 0.05, s * 0.22, s * 0.26, C.vi1).oval(x, y - s * 0.22, s * 0.14, s * 0.12, C.vi1).px(Math.round(x), Math.round(y - s * 0.24), C.ess); } },
      green: { col: '#a7d060', dark: C.gr0, sign: (P, x, y, s) => { P.oval(x, y, s * 0.3, s * 0.3, C.gr1).poly([x - s * 0.3, y - s * 0.05, x - s * 0.55, y - s * 0.2, x - s * 0.3, y + s * 0.1], C.gr1).poly([x + s * 0.3, y - s * 0.05, x + s * 0.55, y - s * 0.2, x + s * 0.3, y + s * 0.1], C.gr1); P.px(Math.round(x - s * 0.12), Math.round(y - s * 0.05), C.goldHi).px(Math.round(x + s * 0.1), Math.round(y - s * 0.05), C.goldHi); } },
      demons: { col: C.bl2, dark: C.bl0, sign: (P, x, y, s) => { P.oval(x, y + s * 0.05, s * 0.3, s * 0.28, C.bl2); P.poly([x - s * 0.24, y - s * 0.1, x - s * 0.45, y - s * 0.5, x - s * 0.12, y - s * 0.2], C.bone).poly([x + s * 0.24, y - s * 0.1, x + s * 0.45, y - s * 0.5, x + s * 0.12, y - s * 0.2], C.bone); P.px(Math.round(x - s * 0.12), Math.round(y), C.goldHi).px(Math.round(x + s * 0.1), Math.round(y), C.goldHi); } },
      treasure: { col: C.gold, dark: C.wd1, sign: (P, x, y, s) => { [[-0.2, 0.25], [0.15, 0.3], [0, 0.1], [-0.1, -0.08], [0.12, -0.12]].forEach(([dx, dy]) => coin(P, x + dx * s, y + dy * s)); } }
    };
    function rune(fam) {   // a standing stone with the family's sign cut and glowing in it
      const F = FAM[fam]; if (!F) return null;
      const P = pic(32, 32, hash('rune' + fam));
      P.poly([8, 31, 7, 8, 14, 2, 22, 4, 25, 10, 25, 31], C.st2); P.poly([16, 3, 22, 4, 25, 10, 25, 31, 17, 31], C.st1); P.dabs(8, 6, 16, 24, [C.st3, C.st1, C.cold1], 18);
      P.rect(6, 30, 21, 2, C.st0);
      P.g.globalCompositeOperation = 'lighter'; const q = P.g.createRadialGradient(16, 16, 0, 16, 16, 12); q.addColorStop(0, ART.rgbaOf(F.col, 0.6)); q.addColorStop(1, ART.rgbaOf(F.col, 0)); P.g.fillStyle = q; P.g.fillRect(4, 4, 24, 24); P.g.globalCompositeOperation = 'source-over';
      F.sign(P, 16, 16, 12);
      return quantize(P.c, 3);
    }
    function crest(fam) {   // a small heater shield in the family's colours
      const F = FAM[fam]; if (!F) return null;
      const P = pic(24, 24, hash('crest' + fam));
      P.poly([2, 2, 22, 2, 22, 12, 12, 23, 2, 12], C.void); P.poly([3, 3, 21, 3, 21, 12, 12, 21, 3, 12], F.dark); P.poly([3, 3, 12, 3, 12, 21, 3, 12], ART.rgbaOf(F.col, 0.18));
      F.sign(P, 12, 11, 11);
      return quantize(P.c, 0);
    }
    // omens: a wide little scene of what is coming
    const OM = {
      siege(P) { P.vgrad(0, 0, 96, 30, '#3a1a14', '#16171c'); bricks(P, 0, 18, 96, 30); P.rect(0, 30, 96, 18, C.st0); P.dabs(0, 31, 96, 16, [C.st1, C.ink], 30); P.rect(38, 20, 20, 10, C.void).oval(48, 20, 10, 6, C.void); for (let k = 0; k < 6; k++) P.fig(['warrior', 'thief', 'priest', 'mage', 'bard', 'barbarian'][k], 10 + k * 15, 46 - (k % 2) * 2, 1, k > 2); [[22, C.bl1], [74, C.cold1]].forEach(([x, c]) => { P.line(x, 46, x, 14, C.wd1, 1); P.poly([x + 1, 14, x + 9, 16, x + 1, 19], c); }); },
      elite(P) { P.vgrad(0, 0, 96, 48, '#2a2010', '#09090b'); P.after(() => P.glow(48, 26, 24, '#f0d890', 0.45)); P.fig('warrior', 48, 46, 1, false); P.after(() => { [[34, 12], [62, 10], [70, 26], [26, 28]].forEach(([x, y]) => ART.bits(P, 'star', x, y)); }); },
      inquisition(P) { P.vgrad(0, 0, 96, 48, '#2a2a20', '#0b0b0e'); P.after(() => { for (let k = 0; k < 5; k++) P.poly([48, 0, 30 + k * 9, 48, 34 + k * 9, 48], 'rgba(255,240,200,0.08)'); }); P.line(64, 46, 64, 8, C.wd1, 1); P.poly([65, 8, 78, 8, 78, 26, 71, 22, 65, 26], C.bone); P.txt('✝', 71, 15, C.gold, 9); P.fig('priest', 40, 46, 1); P.fig('paladin', 54, 46, 1, true); },
      sappers(P) { bricks(P, 0, 0, 96, 30); P.rect(0, 30, 96, 18, C.st0); P.fig('thief', 34, 46, 1); P.fig('ranger', 58, 46, 1, true); P.line(70, 44, 82, 30, C.wd2, 2); P.poly([78, 26, 88, 32, 86, 34, 77, 29], C.st4); P.after(() => { P.glow(20, 30, 10, '#ffb060', 0.5); P.rect(19, 30, 3, 4, C.gold); }); },
      haste(P) { P.vgrad(0, 0, 96, 48, '#1d2633', '#09090b'); for (let k = 0; k < 6; k++) P.line(6, 18 + k * 4, 34 + (k % 3) * 6, 18 + k * 4, 'rgba(230,225,214,0.35)', 1); P.fig('thief', 48, 46, 1); P.fig('warrior', 64, 46, 1); EMB.hourglass(P, 82, 40); },
      bloodmoon(P) { P.vgrad(0, 0, 96, 48, '#3a0810', '#09090b'); P.after(() => { P.glow(66, 16, 20, '#cc3640', 0.5); P.oval(66, 16, 10, 10, C.bl2); P.oval(63, 13, 3, 3, C.bl1); P.oval(70, 19, 2, 2, C.bl1); }); P.poly([0, 48, 0, 34, 12, 30, 20, 34, 30, 26, 44, 32, 54, 28, 66, 34, 80, 30, 96, 36, 96, 48], C.void); P.fig('barbarian', 26, 46, 1); P.fig('warrior', 40, 46, 1); },
      goldrush(P) { P.vgrad(0, 0, 96, 48, '#2a2010', '#0b0a08'); P.after(() => P.glow(48, 30, 30, '#f0d890', 0.3)); for (let k = 0; k < 18; k++) coin(P, 6 + (k * 23) % 86, 4 + (k * 13) % 30, k % 3 ? C.gold : C.goldHi); P.fig('thief', 36, 46, 1); P.fig('bard', 56, 46, 1, true); },
      warfog(P) { P.rect(0, 0, 96, 48, C.ink); P.g.globalAlpha = 0.55; P.fig('warrior', 30, 44, 1); P.fig('mage', 50, 45, 1); P.fig('priest', 68, 44, 1, true); P.g.globalAlpha = 1; P.after(() => { for (let k = 0; k < 9; k++) P.oval(8 + (k * 19) % 88, 14 + (k * 7) % 30, 18, 3, 'rgba(185,196,216,0.38)'); P.txt('?', 82, 12, C.st4, 14); }); },
      pilgrimage(P) { P.vgrad(0, 0, 96, 48, '#2a0810', '#09090b'); P.after(() => P.glow(88, 30, 18, '#ff4f5e', 0.45)); for (let k = 0; k < 4; k++) P.fig('cultist', 12 + k * 18, 46 - (k % 2), 1); },
      fearnight(P) { P.rect(0, 0, 96, 48, C.void); P.after(() => { P.oval(14, 10, 6, 6, C.bone); P.oval(16, 9, 5, 5, C.void); [[30, 14], [56, 10], [76, 18], [44, 24], [86, 8]].forEach(([x, y]) => { P.px(x, y, C.goldHi).px(x + 3, y, C.goldHi); }); }); P.fig('bard', 40, 46, 1); P.fig('mage', 56, 46, 1, true); P.after(() => { P.path([34, 18, 36, 16], C.vi2, 1); P.path([62, 18, 60, 16], C.vi2, 1); }); }
    };
    function omen(id) {
      const f = OM[id]; if (!f) return null;
      const P = pic(96, 48, hash('omen' + id)), posts = [];
      P.after = fn => { posts.push(fn); return P; };
      f(P); P.light(48, 10, 70, 0.08); posts.forEach(g => g());
      return quantize(P.c);
    }
    Object.assign(ART, { FAM, rune: f => ART.url('rune:' + f, () => rune(f)), runeCanvas: f => ART.keep('rune:' + f, () => rune(f)), family: f => ART.url('crest:' + f, () => crest(f)), familyCanvas: f => ART.keep('crest:' + f, () => crest(f)),
      omen: id => ART.url('omen:' + id, () => omen(id)), omenCanvas: id => ART.keep('omen:' + id, () => omen(id)), OMENS: Object.keys(OM), FAMILIES: Object.keys(FAM) });
  })();
  // ---------- 1.26: more detail in every pixel figure (heroes, monsters): a light from the left on each figure's edge, a cool
  // shade on its right edge, and a few hand-placed touches per figure (mail, folds, glints). Runs once per sprite (cached). ----------
  const FIG_DETAIL = {
    warrior(px, b) { for (let y = 14; y < 20; y += 2) for (let x = 8; x < 13; x += 2) px(x, y + b, '#7f8796'); px(10, 20 + b, '#e0c060'); px(14, 9 + b, '#ffffff'); },
    thief(px, b) { px(14, 15 + b, '#ffffff'); px(9, 15 + b, '#5a7a50'); px(10, 16 + b, '#5a7a50'); },
    priest(px, b) { for (let y = 20; y < 27; y++) { px(8, y + b, '#b8af98'); px(12, y + b, '#b8af98'); } px(10, 15 + b, '#fff1c8'); },
    mage(px, b) { px(8, 22 + b, '#e8d48a'); px(11, 25 + b, '#e8d48a'); px(7, 17 + b, '#e8d48a'); px(15, 2 + b, '#ffffff'); },
    bard(px, b) { px(10, 18 + b, '#e6d8a8'); px(11, 17 + b, '#e6d8a8'); px(8, 14 + b, '#4a9a92'); },
    barbarian(px, b) { px(10, 9 + b, '#7a2a2a'); px(11, 9 + b, '#7a2a2a'); px(16, 7 + b, '#ffffff'); px(9, 18 + b, '#7a5a3a'); },
    goblin(px, b) { px(12, 14 + b, '#e8e0c8'); px(9, 18 + b, '#7a6040'); px(14, 15 + b, '#ffffff'); },
    archer(px, b) { px(10, 16 + b, '#fff6e0'); px(12, 10 + b, '#d84a3a'); },
    ogre(px, b) { px(8, 7 + b, '#9a9e74'); px(11, 15 + b, '#9a9e74'); px(10, 18 + b, '#6a6e4e'); px(17, 9 + b, '#9a7a54'); },
    shaman(px, b) { px(15, 3 + b, '#d9ffd9'); px(9, 20 + b, '#6a7a52'); px(11, 23 + b, '#6a7a52'); },
    spider(px) { px(13, 18, '#ff9a8a'); px(9, 18, '#7a5a8a'); px(10, 17, '#6a5a7a'); },
    ghost(px, b, f) { px(9, 10, '#ffffff'); px(10, 9, '#ffffff'); },
    shade(px) { px(10, 14, '#3a2a4a'); px(9, 16, '#3a2a4a'); px(11, 18, '#3a2a4a'); }
  };
  function figShade(c, type, frame) {
    const g = c.getContext('2d'), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), a = d.data;
    const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 0;
    const src = new Uint8ClampedArray(a);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (!src[i + 3]) continue;
      let k = 0;
      if (!op(x - 1, y)) k += 0.2; else if (!op(x - 2, y)) k += 0.06;
      if (!op(x, y - 1)) k += 0.1;
      if (!op(x + 1, y)) k -= 0.16;
      if (k > 0) { a[i] = src[i] + (255 - src[i]) * k * 0.6 + 8 * k; a[i + 1] = src[i + 1] + (235 - src[i + 1]) * k * 0.55; a[i + 2] = src[i + 2] + (200 - src[i + 2]) * k * 0.45; }
      else if (k < 0) { a[i] = src[i] * (1 + k); a[i + 1] = src[i + 1] * (1 + k * 0.9); a[i + 2] = Math.min(255, src[i + 2] * (1 + k * 0.5) + 6); }
    }
    g.putImageData(d, 0, 0);
    const f = FIG_DETAIL[type];
    if (f) { const px = (x, y, col) => { if (op(x, y)) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }; f(px, frame === 1 || frame === 3 ? -1 : 0, frame); }
    return c;
  }
  ART.sprite = sprite;
  // 1.26: small touches on the furniture (drawObjectIso): a barrel's staves and the lid's boards, a crate's planks and nails
  function artBarrelDetail(b, t, rx, ry, T) {
    if (T < 16) return;
    ctx.strokeStyle = 'rgba(40,24,10,0.45)'; ctx.lineWidth = Math.max(1, T * 0.015); ctx.beginPath();
    [-0.6, -0.2, 0.2, 0.6].forEach(u => { ctx.moveTo(b[0] + rx * u, t[1] + ry * Math.sqrt(1 - u * u)); ctx.lineTo(b[0] + rx * u, b[1] + ry * Math.sqrt(1 - u * u)); });
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,170,0.22)'; ctx.lineWidth = Math.max(1, T * 0.02); ctx.beginPath(); ctx.ellipse(b[0], b[1] - (b[1] - t[1]) * 0.29, rx, ry, 0, Math.PI * 0.55, Math.PI * 0.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,24,10,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t[0] - rx * 0.9, t[1] - ry * 0.25); ctx.lineTo(t[0] + rx * 0.9, t[1] - ry * 0.25); ctx.moveTo(t[0] - rx * 0.9, t[1] + ry * 0.3); ctx.lineTo(t[0] + rx * 0.9, t[1] + ry * 0.3); ctx.stroke();
  }
  function artCrateDetail(cx, cy, T) {
    if (T < 16) return;
    ctx.strokeStyle = 'rgba(30,18,8,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
    [0.2, 0.4].forEach(z => { const a = W2S(cx - 0.35, cy + 0.35, z), b = W2S(cx + 0.35, cy + 0.35, z), c = W2S(cx + 0.35, cy - 0.35, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); });
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,190,170,0.55)'; [[-0.3, 0.35, 0.55], [0.3, 0.35, 0.55], [-0.3, 0.35, 0.05], [0.3, 0.35, 0.05]].forEach(q => { const p = W2S(cx + q[0], cy + q[1], q[2]); ctx.fillRect(p[0] - 0.5, p[1] - 0.5, Math.max(1, T * 0.025), Math.max(1, T * 0.025)); });
    const e = W2S(cx - 0.35, cy + 0.35, 0.6), f = W2S(cx + 0.35, cy + 0.35, 0.6); ctx.strokeStyle = 'rgba(255,225,180,0.18)'; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(f[0], f[1]); ctx.stroke();
  }
  // ---------- 1.26 round 2: statuses on the heroes ----------
  // A row of up to 4 status signs over the bars (ART.status, whole device pixels), by priority; poison and plague show their stacks.
  // On the figure: rooted = an iron shackle at the feet, wet = a puddle and drips, oiled = a black glossy puddle and a sheen,
  // seduced = a thin pink thread to the temptress. No objects are made per frame.
  const ST_PRIO = ['root', 'burn', 'poison', 'oiled', 'wet', 'marked', 'seduced', 'bleed', 'slow', 'infected', 'dazed'];
  const ST_SHOW = ['', '', '', ''];
  function heroStatusIcons(h, x, yBars, H) {
    if (!fl || fl.phase !== 'raid' || typeof statusOn !== 'function') return 0;
    let n = 0;
    for (let i = 0; i < ST_PRIO.length && n < 4; i++) if (statusOn(h, ST_PRIO[i])) ST_SHOW[n++] = ST_PRIO[i];
    if (!n) return 0;
    const kd = Math.max(1, Math.round(DPR * clamp(H * 0.42, 11, 15) / 9)), s = 9 * kd / DPR, gap = Math.max(1, s * 0.15), w = n * s + (n - 1) * gap;
    const y = Math.round((yBars - s - 3) * DPR) / DPR;
    let x0 = Math.round((x - w / 2) * DPR) / DPR;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) {
      const id = ST_SHOW[i], c = ART.status(id);
      if (c) ctx.drawImage(c, x0, y, s, s);
      const st = id === 'poison' ? h.poison : id === 'infected' ? h.plague : 0;
      if (st > 1) { ctx.font = numFont(Math.max(8, s * 0.7), true); ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.strokeText(String(st), x0 + s + 2, y + s + 2); ctx.fillStyle = '#f2f0e6'; ctx.fillText(String(st), x0 + s + 2, y + s + 2); }
      x0 += s + gap;
    }
    ctx.imageSmoothingEnabled = true;
    return s + 3;
  }
  function heroStatusUnder(h, x, feet, W, T) {
    if (!fl || fl.phase !== 'raid' || typeof statusOn !== 'function') return;
    const t = fl.time;
    if (t < (h.wetUntil || -1)) { ctx.fillStyle = 'rgba(111,154,168,0.45)'; ctx.beginPath(); ctx.ellipse(x, feet, W * 1.15, W * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(169,212,218,' + (0.35 + 0.25 * Math.sin(realNow * 4 + h.id)).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, feet, W * (1.2 + 0.25 * ((realNow * 0.8 + h.id * 0.3) % 1)), W * 0.42, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (t < (h.oilUntil || -1)) { ctx.fillStyle = 'rgba(14,10,8,0.7)'; ctx.beginPath(); ctx.ellipse(x + W * 0.1, feet, W * 1.05, W * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(160,140,232,0.35)'; ctx.beginPath(); ctx.ellipse(x - W * 0.3, feet - W * 0.05, W * 0.3, W * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
    if (t < (h.seduceUntil || -1) && h.seducer) {   // a thin pink thread from his chest to her
      const sd = h.seducer, sx = sd.gx !== undefined ? sd.gx : sd.x + 0.5, sy = sd.gy !== undefined ? sd.gy : sd.y + 0.5, q = W2S(sx, sy, 0.75), my = feet - W * 1.4;
      ctx.strokeStyle = 'rgba(255,138,200,' + (0.45 + 0.3 * Math.sin(realNow * 5 + h.id)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, T * 0.025);
      ctx.beginPath(); ctx.moveTo(x, my); ctx.quadraticCurveTo((x + q[0]) / 2, Math.min(my, q[1]) - T * 0.3 + Math.sin(realNow * 3) * T * 0.05, q[0], q[1]); ctx.stroke();
    }
  }
  function heroStatusOver(h, x, feet, H, W, face, T) {
    if (!fl || fl.phase !== 'raid' || typeof statusOn !== 'function') return;
    const t = fl.time;
    if (t < (h.rootUntil || -1) || t < (h.stunUntil || -1)) {   // an iron shackle round the ankles, a short chain into the floor
      ctx.strokeStyle = '#8e8a9a'; ctx.lineWidth = Math.max(1.2, H * 0.045); ctx.beginPath(); ctx.ellipse(x, feet - H * 0.04, W * 0.55, W * 0.2, 0, 0.15, Math.PI - 0.15); ctx.stroke();
      ctx.fillStyle = '#5a5664'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x + face * W * (0.6 + k * 0.28), feet + k * 0.6, Math.max(1, W * 0.1), Math.max(0.8, W * 0.07), 0, 0, Math.PI * 2); ctx.fill(); }
    }
    if (t < (h.wetUntil || -1)) {   // drips falling from the body
      ctx.fillStyle = 'rgba(169,212,218,0.85)';
      for (let k = 0; k < 3; k++) { const u = (realNow * 1.6 + k / 3 + h.id * 0.17) % 1, dx = (k - 1) * W * 0.45; ctx.fillRect(x + dx, feet - H * (0.55 - 0.5 * u), Math.max(1, H * 0.035), Math.max(1.5, H * 0.06)); }
    }
    if (t < (h.oilUntil || -1)) {   // a dark glossy streak with a glint
      ctx.fillStyle = 'rgba(20,14,10,0.45)'; ctx.fillRect(x - W * 0.35, feet - H * 0.62, W * 0.7, H * 0.3);
      ctx.fillStyle = 'rgba(255,250,230,' + (0.5 + 0.3 * Math.sin(realNow * 3 + h.id)).toFixed(2) + ')'; ctx.fillRect(x - face * W * 0.2, feet - H * 0.58, Math.max(1, H * 0.03), Math.max(1, H * 0.1));
    }
  }
  // ---------- 1.26 round 2: hazards on the floor (drawn in the floor's plane, from drawZones) ----------
  // Topiel (a zone of the flood trap): shallow water with moving ripples and glints; Wyziewy (fl.clouds): a green haze rolling over
  // its tiles, thinning in its last second; Kolczatki (fl.caltrops): three iron caltrops on the tile, a small keg with a lit fuse
  // for the bomb.
  function drawHazards(T) {
    const t = reduceMotion ? 0 : realNow;
    fl.zones.forEach(z => {
      if (!z.src || z.src.type !== 'flood') return;
      const a = clamp((z.until - fl.time) / 1.2, 0, 1);
      z.tiles.forEach(q => {
        const x = q[0] * T, y = q[1] * T;
        ctx.fillStyle = 'rgba(70,120,140,' + (0.32 * a).toFixed(2) + ')'; ctx.fillRect(x, y, T, T);
        ctx.strokeStyle = 'rgba(169,212,218,' + (0.35 * a).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, T * 0.025); ctx.beginPath();
        for (let k = 0; k < 2; k++) { const u = (t * 0.25 + k * 0.5 + kH(q[0], q[1], 3) ) % 1; ctx.moveTo(x + T * 0.12, y + T * (0.15 + 0.7 * u)); ctx.quadraticCurveTo(x + T * 0.5, y + T * (0.08 + 0.7 * u), x + T * 0.88, y + T * (0.15 + 0.7 * u)); }
        ctx.stroke();
        if (kH(q[0], q[1], 5) > 0.5) { ctx.fillStyle = 'rgba(230,245,255,' + (0.5 * a * (0.5 + 0.5 * Math.sin(t * 3 + q[0] * 2 + q[1]))).toFixed(2) + ')'; ctx.fillRect(x + T * (0.2 + 0.6 * kH(q[0], q[1], 6)), y + T * (0.2 + 0.6 * kH(q[0], q[1], 7)), Math.max(1, T * 0.05), Math.max(1, T * 0.03)); }
      });
    });
    if (fl.clouds && fl.clouds.length) fl.clouds.forEach(c => {
      const a = clamp((c.until - fl.time) / 1.0, 0, 1), spr = glowSprite('miasmaH', [[0, 'rgba(150,205,95,0.55)'], [0.5, 'rgba(124,190,90,0.22)'], [1, 'rgba(124,190,90,0)']]);
      ctx.globalAlpha = a;
      c.tiles.forEach(q => {
        for (let k = 0; k < 2; k++) { const ph = t * (0.35 + 0.1 * k) + kH(q[0], q[1], 11 + k) * 6.28, r = T * (0.75 + 0.15 * Math.sin(ph * 1.3)), cx = (q[0] + 0.5 + 0.22 * Math.cos(ph)) * T, cy = (q[1] + 0.5 + 0.22 * Math.sin(ph * 0.8)) * T; ctx.drawImage(spr, cx - r, cy - r, r * 2, r * 2); }
      });
      ctx.globalAlpha = 1;
    });
    if (fl.caltrops && fl.caltrops.length) fl.caltrops.forEach(c => {
      const x = c.x * T, y = c.y * T;
      if (c.bomb) {
        const cx = x + T * 0.5, cy = y + T * 0.5, r = T * 0.17;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(cx + T * 0.04, cy + T * 0.05, r * 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#26262e'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a4a56'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#b08a5a'; ctx.beginPath(); ctx.moveTo(cx + r * 0.6, cy - r * 0.6); ctx.lineTo(cx + r * 1.3, cy - r * 1.2); ctx.stroke();
        ctx.fillStyle = Math.sin(t * 16) > 0 ? '#ffd27a' : '#ff7a3c'; ctx.beginPath(); ctx.arc(cx + r * 1.35, cy - r * 1.25, Math.max(1.2, T * 0.04), 0, Math.PI * 2); ctx.fill();
        return;
      }
      for (let k = 0; k < 3; k++) {
        const cx = x + T * (0.25 + 0.5 * kH(c.x * 3 + k, c.y, 21)), cy = y + T * (0.25 + 0.5 * kH(c.x, c.y * 3 + k, 22)), r = T * 0.09, a0 = kH(c.x + k, c.y, 23) * 6.28;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(cx + T * 0.02, cy + T * 0.03, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#9a96a6'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.beginPath();
        for (let j = 0; j < 3; j++) { const a = a0 + j * 2.094; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        ctx.stroke(); ctx.fillStyle = '#d0ccd8'; ctx.fillRect(cx - 0.5, cy - 0.5, Math.max(1, T * 0.03), Math.max(1, T * 0.03));
      }
    });
  }
  // ---------- 1.26 round 2: a knocked-out monster: grey, on its side, stars over its head, "+1 ♥" (it costs 1 hunger) ----------
  function downSprite(type) {   // the figure in muted grey, made once a type
    return ART.keep('down:' + type, () => {
      const s = sprite(type, 0, false), c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
      const g = c.getContext('2d'); g.drawImage(s, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const l = a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11, v = l * 0.7 + 20; a[i] = v * 0.95; a[i + 1] = v * 0.95; a[i + 2] = v * 1.05; }
      g.putImageData(d, 0, 0); return c;
    });
  }
  function drawDownedArt(it, T) {
    const p = W2S(it.x + 0.5, it.y + 0.5, 0), H = Math.max(FIG_MIN, monH(it, T) * 1.15), fg = fogged(it.x, it.y), face = it.face || 1;
    const c = downSprite(it.type), k = Math.max(1, Math.round(H * DPR / PXH)), w = PXW * k / DPR, h = PXH * k / DPR;
    groundShadow(it.x + 0.5, it.y + 0.5, 0.36, 0.2, 0.35);
    ctx.save(); ctx.globalAlpha = fg ? 0.35 : 0.85; ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(p[0] * DPR) / DPR, Math.round(p[1] * DPR) / DPR); ctx.rotate(face * Math.PI / 2); ctx.scale(face, 1);
    ctx.drawImage(c, -w / 2, -h + h * 0.18, w, h);
    ctx.restore();
    if (fg) return;
    const hx = p[0] + face * h * 0.62, hy = p[1] - T * 0.12, t = reduceMotion ? 0 : realNow;
    for (let j = 0; j < 3; j++) {   // stars circling
      const a = t * 3 + j * 2.094, sx = hx + Math.cos(a) * T * 0.18, sy = hy + Math.sin(a) * T * 0.07 - T * 0.12, r = Math.max(1.5, T * 0.04);
      ctx.fillStyle = j === 1 ? '#f0d890' : '#e6e1d6'; ctx.beginPath(); for (let q = 0; q < 8; q++) { const b = q * Math.PI / 4, rr = q % 2 ? r * 0.4 : r; q ? ctx.lineTo(sx + Math.cos(b) * rr, sy + Math.sin(b) * rr) : ctx.moveTo(sx + rr, sy); } ctx.fill();
    }
    if (fl.phase === 'raid' || fl.phase === 'summary') signText('+1 ♥', p[0], p[1] - T * 0.55, '700 ' + Math.max(10, Math.round(T * 0.3)) + 'px system-ui, sans-serif', '#ff9aa4', 'center', 'middle');
  }
  // ---------- 1.26 round 2: a reaction also leaves a ring on the floor in its colour (the word and the sparks come from reaction()) ----------
  { const reaction0 = reaction; reaction = function (h, k) { reaction0(h, k); try { const R = REACTIONS[k], p = heroPos(h); particles.push({ ring: true, x: p.x, y: p.y, r: 0.25, maxR: 1.5, life: 0.45, color: R.color }); } catch (e) { void e; } }; }
  // ---------- 1.26 round 2: the three new komnaty in the same systems as the old ones ----------
  // Laboratorium: green-stained ashlar, tiles with a drain and spills, a table of glassware, flasks, a green cauldron; bubbles rising.
  // Cmentarz: mossy old stone, trodden earth and grass, a grave mound in the middle, crooked headstones and crosses; mist and wisps.
  // Wrota otchłani: black basalt with glowing cracks, a rune circle in the floor that pulses, red braziers, brimstone; embers rising.
  Object.assign(WALL_STYLE, {
    lab: { s: '#3e4a46', e: '#2c3633', top: '#46524e', lip: '#36403c',
      tex(g, rnd, v) {
        g.fillStyle = '#3a4642'; g.fillRect(0, 0, 1, WALL_H);
        courses(g, rnd, 0.28, 0.5, ['#3e4a46', '#44504b', '#38433f'], 'rgba(14,20,18,0.6)', true);
        g.fillStyle = 'rgba(120,200,110,0.22)'; per(g, () => { for (let k = 0; k < 3; k++) { const x = 0.15 + 0.32 * k + rnd() * 0.08, y0 = 0.2 + rnd() * 0.5; g.fillRect(x, y0, 0.03, 0.3 + rnd() * 0.5); g.beginPath(); g.ellipse(x + 0.015, y0, 0.05, 0.03, 0, 0, 7); g.fill(); } });
        if (v === 1) { g.fillStyle = '#2a201a'; g.fillRect(0.2, 0.55, 0.6, 0.04); [[0.3, '#7fe05a'], [0.45, '#8cc8ff'], [0.62, '#c78be3']].forEach(([x, c]) => { g.fillStyle = 'rgba(200,215,240,0.55)'; g.fillRect(x - 0.02, 0.4, 0.04, 0.08); g.fillStyle = c; g.beginPath(); g.ellipse(x, 0.5, 0.05, 0.05, 0, 0, 7); g.fill(); }); }
      },
      topTex(g) { g.fillStyle = '#46524e'; g.fillRect(0, 0, 1, 1); g.fillStyle = 'rgba(120,200,110,0.15)'; g.beginPath(); g.ellipse(0.4, 0.6, 0.2, 0.12, 0, 0, 7); g.fill(); } },
    graveyard: { s: '#4a4e44', e: '#363a32', top: '#52584a', lip: '#3e4238',
      tex(g, rnd, v) {
        g.fillStyle = '#464a40'; g.fillRect(0, 0, 1, WALL_H);
        courses(g, rnd, 0.34, 0.4, ['#4a4e44', '#50544a', '#42463c', '#4e5246'], 'rgba(18,20,14,0.6)', true);
        g.fillStyle = 'rgba(92,140,58,0.45)'; per(g, () => { for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(rnd(), WALL_H - rnd() * 0.5, 0.06 + rnd() * 0.06, 0.03 + rnd() * 0.03, 0, 0, 7); g.fill(); } });   // moss low on the wall
        g.strokeStyle = 'rgba(20,22,16,0.6)'; g.lineWidth = 0.014; g.beginPath(); g.moveTo(0.3, 0.1); g.lineTo(0.36, 0.5); g.lineTo(0.3, 0.8); g.stroke();
        if (v === 1) { g.fillStyle = '#5e6252'; g.fillRect(0.3, 0.45, 0.4, 0.32); g.strokeStyle = 'rgba(20,22,16,0.6)'; g.strokeRect(0.3, 0.45, 0.4, 0.32); g.fillStyle = 'rgba(20,22,16,0.55)'; g.fillRect(0.47, 0.5, 0.06, 0.2); g.fillRect(0.4, 0.56, 0.2, 0.05); }   // a memorial plaque
      } },
    abyssgate: { s: '#3a1e1a', e: '#2a1512', top: '#2e1c18', lip: '#26150f',
      tex(g, rnd, v) {
        g.fillStyle = '#2e1a16'; g.fillRect(0, 0, 1, WALL_H);
        facets(g, rnd, 3, 5, '#2e1a16', 'rgba(8,2,2,A)', 'rgba(255,160,120,A)', 'rgba(10,4,4,0.6)');
        g.strokeStyle = 'rgba(255,110,60,0.75)'; g.lineWidth = 0.02; per(g, () => { g.beginPath(); let x = 0.2 + rnd() * 0.5, y = 0.1; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 0.18; y += 0.18 + rnd() * 0.12; g.lineTo(x, y); } g.stroke(); });
        if (v === 1) { g.strokeStyle = 'rgba(255,90,60,0.6)'; g.lineWidth = 0.025; g.beginPath(); g.arc(0.5, 0.75, 0.2, 0, 7); g.moveTo(0.5, 0.55); g.lineTo(0.62, 0.92); g.lineTo(0.32, 0.68); g.lineTo(0.68, 0.68); g.lineTo(0.38, 0.92); g.closePath(); g.stroke(); }   // a sigil
      },
      crown(x, y, h, T) { rockCrown(x, y, h, T, ['#4a2a22', '#2e1a16', '#1e100c'], 2, 0.3); } }
  });
  Object.assign(KIND_FLOOR, {
    lab(c, R, T) {   // pale tiles, green spills, a drain in the middle
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(150,200,180,0.12)'; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(200,235,220,0.12)'; c.lineWidth = Math.max(1, T * 0.02); c.beginPath();
      R.tiles.forEach(([tx, ty]) => { c.rect((tx + 0.05) * T, (ty + 0.05) * T, T * 0.42, T * 0.42); c.rect((tx + 0.53) * T, (ty + 0.53) * T, T * 0.42, T * 0.42); }); c.stroke();
      R.tiles.forEach(([tx, ty]) => { const a = kH(tx, ty, 31); if (a < 0.6) return; c.fillStyle = 'rgba(110,200,90,' + (0.18 + 0.2 * a).toFixed(2) + ')'; c.beginPath(); c.ellipse((tx + 0.3 + 0.4 * kH(tx, ty, 32)) * T, (ty + 0.3 + 0.4 * kH(tx, ty, 33)) * T, T * 0.22, T * 0.13, a * 4, 0, Math.PI * 2); c.fill(); });
      const [mx, my] = roomMid(R); c.fillStyle = 'rgba(10,14,12,0.6)'; c.fillRect(mx * T - T * 0.16, my * T - T * 0.16, T * 0.32, T * 0.32); c.strokeStyle = 'rgba(160,180,170,0.4)'; c.beginPath(); for (let k = 0; k < 4; k++) { c.moveTo(mx * T - T * 0.12 + k * T * 0.08, my * T - T * 0.14); c.lineTo(mx * T - T * 0.12 + k * T * 0.08, my * T + T * 0.14); } c.stroke();
    },
    graveyard(c, R, T) {   // earth and grass, a grave mound in the middle
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(74,60,36,0.3)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => { for (let k = 0; k < 3; k++) { if (kH(tx, ty, 40 + k) < 0.45) continue; const gx = (tx + 0.15 + 0.7 * kH(tx, ty, 43 + k)) * T, gy = (ty + 0.15 + 0.7 * kH(tx, ty, 46 + k)) * T; c.strokeStyle = 'rgba(120,150,80,0.55)'; c.lineWidth = Math.max(1, T * 0.022); c.beginPath(); for (let j = -1; j <= 1; j++) { c.moveTo(gx, gy); c.lineTo(gx + j * T * 0.05, gy - T * 0.1); } c.stroke(); } });
      const [mx, my] = roomMid(R); c.fillStyle = 'rgba(40,30,18,0.9)'; c.beginPath(); c.ellipse(mx * T, my * T, T * 0.45, T * 0.74, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(140,120,80,0.5)'; c.lineWidth = Math.max(1, T * 0.03); c.stroke(); c.fillStyle = 'rgba(110,88,56,0.7)'; c.beginPath(); c.ellipse(mx * T - T * 0.08, my * T - T * 0.1, T * 0.28, T * 0.5, 0, 0, Math.PI * 2); c.fill();
    },
    abyssgate(c, R, T) {   // cracked black floor with ember cracks, the rune circle's lines (it glows in KIND_LIVE)
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(40,10,8,0.35)'; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(255,100,50,0.45)'; c.lineWidth = Math.max(1, T * 0.025); c.beginPath();
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 51) < 0.5) return; let px = (tx + kH(tx, ty, 52)) * T, py = (ty + kH(tx, ty, 53)) * T; c.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (kH(tx, ty, 54 + k) - 0.5) * T * 0.5; py += (kH(tx, ty, 57 + k) - 0.5) * T * 0.5; c.lineTo(px, py); } }); c.stroke();
      const [mx, my] = roomMid(R), r = Math.min(R.x1 - R.x0 + 1, R.y1 - R.y0 + 1) * T * 0.36;
      c.strokeStyle = 'rgba(120,30,20,0.7)'; c.lineWidth = Math.max(1.5, T * 0.04); c.beginPath(); c.arc(mx * T, my * T, r, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(mx * T, my * T, r * 0.78, 0, Math.PI * 2); c.stroke();
      c.beginPath(); for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5; k ? c.lineTo(mx * T + Math.cos(a) * r * 0.78, my * T + Math.sin(a) * r * 0.78) : c.moveTo(mx * T + Math.cos(a) * r * 0.78, my * T + Math.sin(a) * r * 0.78); } c.stroke();
    }
  });
  Object.assign(KIND_LIVE, {
    lab(c, R, T, t) { const [mx, my] = roomMid(R), p = 0.6 + 0.4 * Math.sin(t * 2.2); c.drawImage(glowSprite('klab', [[0, 'rgba(127,224,90,0.4)'], [1, 'rgba(127,224,90,0)']]), mx * T - T * p, my * T - T * p, T * 2 * p, T * 2 * p); },
    abyssgate(c, R, T, t) {   // the circle glows and turns slowly
      const [mx, my] = roomMid(R), r = Math.min(R.x1 - R.x0 + 1, R.y1 - R.y0 + 1) * T * 0.36, a = 0.45 + 0.25 * Math.sin(t * 1.8);
      c.save(); c.translate(mx * T, my * T); c.rotate(t * 0.15);
      c.strokeStyle = 'rgba(255,90,50,' + a.toFixed(2) + ')'; c.lineWidth = Math.max(1.5, T * 0.04); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(255,140,80,' + (a * 0.9).toFixed(2) + ')'; for (let k = 0; k < 8; k++) { const b = k * Math.PI / 4; c.fillRect(Math.cos(b) * r * 0.89 - T * 0.03, Math.sin(b) * r * 0.89 - T * 0.03, T * 0.06, T * 0.06); }
      c.restore();
      c.drawImage(glowSprite('kabyss', [[0, 'rgba(255,80,40,0.35)'], [1, 'rgba(255,80,40,0)']]), mx * T - r * 1.2, my * T - r * 1.2, r * 2.4, r * 2.4);
    }
  });
  Object.assign(PROP_PLAN, {
    lab(R, o) { const [mx, my] = roomMid(R); o.push(['labtable', R.x0 + Math.max(0.7, (R.x1 - R.x0 + 1) * 0.3), R.y0 + 0.7, 1, 0, 0.6]); o.push(['gcauldron', mx + 0.6, my + 0.4, 1, 0, 0.55]);
      PROP_SCATTER(R, o, 221, 0.55, 0.15, (q) => q < 0.45 ? ['flasks', 0.3] : q < 0.75 ? ['crateS', 0.35] : ['books', 0.2]); },
    graveyard(R, o) { PROP_SCATTER(R, o, 231, 0.85, 0.35, (q, e) => q < 0.45 ? ['headstone', 0.55] : q < 0.7 ? ['gcross', 0.6] : q < 0.85 ? ['deadgrass', 0.2] : ['skullpile', 0.4]); },
    abyssgate(R, o) { const [mx, my] = roomMid(R), w = R.x1 - R.x0 + 1; o.push(['rbrazier', R.x0 + 0.6, R.y0 + 0.6, 1, 0, 0.6]); if (w > 2) o.push(['rbrazier', R.x1 + 0.4, R.y0 + 0.6, 1, 1, 0.6]);
      PROP_SCATTER(R, o, 241, 0.55, 0.12, (q) => q < 0.5 ? ['brimstone', 0.25] : q < 0.8 ? ['horns', 0.25] : ['chainpile', 0.15]); void mx; void my; }
  });
  // the old scatter (inside PROP_PLAN's closure) is not reachable: the same rule, here
  function PROP_SCATTER(R, out, salt, pEdge, pIn, pick) {
    const at = (tx, ty, s) => [tx + 0.22 + 0.56 * kH(tx, ty, s), ty + 0.22 + 0.56 * kH(tx, ty, s + 1)];
    R.tiles.forEach(([tx, ty]) => {
      const e = edgeTile(R, tx, ty), r = kH(tx, ty, salt); if (r > (e ? pEdge : pIn)) return;
      const [x, y] = at(tx, ty, salt + 2), q = kH(tx, ty, salt + 5), t = pick(q, e); if (t) out.push([t[0], x, y, 0.85 + 0.3 * kH(tx, ty, salt + 7), Math.floor(kH(tx, ty, salt + 9) * 4), t[1]]);
    });
  }
  Object.assign(PROP, {
    labtable(p, T) {   // a table with an alembic, flasks and a burner
      groundShadow(p.x, p.y, 0.42, 0.22, 0.38);
      isoBox(p.x, p.y, 0.7, 0.38, 0.32, '#5a3f2a', '#46301f', '#382617');
      [[-0.22, '#7fe05a'], [0.02, '#8cc8ff'], [0.22, '#c78be3']].forEach(([u, col], k) => { const b = W2S(p.x + u, p.y, 0.32), r = T * (0.06 + 0.02 * (k % 2)); ctx.fillStyle = 'rgba(200,215,240,0.5)'; ctx.fillRect(b[0] - T * 0.015, b[1] - r * 2.8, T * 0.03, r * 1.2); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(b[0], b[1] - r, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(b[0] - r * 0.5, b[1] - r * 1.4, Math.max(1, T * 0.02), Math.max(1, T * 0.02)); });
      const g = W2S(p.x - 0.22, p.y, 0.48); ctx.drawImage(glowSprite('kflask', [[0, 'rgba(127,224,90,0.45)'], [1, 'rgba(127,224,90,0)']]), g[0] - T * 0.3, g[1] - T * 0.3, T * 0.6, T * 0.6);
    },
    gcauldron(p, T, t) {   // a cauldron of green brew bubbling over coals
      groundShadow(p.x, p.y, 0.32, 0.2, 0.38);
      pCyl(p.x, p.y, 0.24, 0.3, '#26262e', '#1a1a20', 0.04);
      const q = W2S(p.x, p.y, 0.34), rx = T * 0.21; ctx.fillStyle = '#5c8c3a'; ctx.beginPath(); ctx.ellipse(q[0], q[1], rx, rx * SP, 0, 0, Math.PI * 2); ctx.fill();
      if (!reduceMotion) for (let k = 0; k < 3; k++) { const u = (t * 0.8 + k / 3 + p.seed * 0.1) % 1, b = W2S(p.x + (k - 1) * 0.08, p.y, 0.36 + u * 0.4); ctx.fillStyle = 'rgba(156,230,120,' + (0.8 * (1 - u)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(1, T * 0.03 * (1 - u * 0.5)), 0, Math.PI * 2); ctx.fill(); }
      const f = W2S(p.x, p.y, 0.02); ctx.drawImage(glowSprite('kcoal', [[0, 'rgba(255,120,50,0.5)'], [1, 'rgba(255,120,50,0)']]), f[0] - T * 0.3, f[1] - T * 0.15, T * 0.6, T * 0.3);
    },
    flasks(p, T) { groundShadow(p.x, p.y, 0.16, 0.1, 0.3); [[-0.06, 0, '#7fe05a'], [0.07, 0.04, '#e0643c'], [0, 0.08, '#8cc8ff']].slice(0, 2 + (p.v % 2)).forEach(([u, v, col]) => { const b = W2S(p.x + u, p.y + v, 0), r = T * 0.055 * p.s; ctx.fillStyle = 'rgba(200,215,240,0.5)'; ctx.fillRect(b[0] - T * 0.012, b[1] - r * 3.2, T * 0.024, r * 1.4); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(b[0], b[1] - r, r, 0, Math.PI * 2); ctx.fill(); }); },
    headstone(p, T) {   // a crooked headstone, rounded top, a carved cross, moss
      groundShadow(p.x, p.y, 0.2, 0.1, 0.35);
      const b = W2S(p.x, p.y, 0), w = T * 0.2 * p.s, h = T * 0.42 * p.s, lean = (p.v - 1.5) * 0.08;
      ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(lean);
      ctx.fillStyle = '#6e7262'; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h + w); ctx.arc(0, -h + w, w, Math.PI, 0); ctx.lineTo(w, 0); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(w * 0.35, -h + w * 0.6, w * 0.65, h - w * 0.6);
      ctx.fillStyle = '#3e4236'; ctx.fillRect(-w * 0.08, -h * 0.75, w * 0.16, h * 0.4); ctx.fillRect(-w * 0.35, -h * 0.65, w * 0.7, w * 0.16);
      ctx.fillStyle = 'rgba(92,140,58,0.7)'; ctx.fillRect(-w, -h * 0.12, w * 1.2, h * 0.12);
      ctx.restore();
    },
    gcross(p, T) { groundShadow(p.x, p.y, 0.14, 0.08, 0.3); const b = W2S(p.x, p.y, 0), t2 = W2S(p.x, p.y, 0.5 * p.s), m = W2S(p.x, p.y, 0.36 * p.s), lw = Math.max(2, T * 0.06); ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate((p.v - 1.5) * 0.1); ctx.translate(-b[0], -b[1]); pLine(b, t2, '#4a3a28', lw); pLine([m[0] - T * 0.12, m[1]], [m[0] + T * 0.12, m[1]], '#4a3a28', lw); ctx.restore(); },
    deadgrass(p, T) { const b = W2S(p.x, p.y, 0); ctx.strokeStyle = '#8a8a5a'; ctx.lineWidth = Math.max(1, T * 0.02); ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(b[0] + k * T * 0.03, b[1]); ctx.lineTo(b[0] + k * T * 0.06, b[1] - T * (0.12 + 0.04 * (k % 2))); } ctx.stroke(); },
    rbrazier(p, T, t) {   // an iron brazier of red fire
      groundShadow(p.x, p.y, 0.2, 0.12, 0.35);
      pLine(W2S(p.x - 0.12, p.y, 0), W2S(p.x, p.y, 0.4), '#2a2226', Math.max(1.5, T * 0.04)); pLine(W2S(p.x + 0.12, p.y, 0), W2S(p.x, p.y, 0.4), '#2a2226', Math.max(1.5, T * 0.04));
      pCyl(p.x, p.y, 0.16, 0.08, '#3a2a2a', '#1a0a0a', 0.4);
      const q = W2S(p.x, p.y, 0.48); pFlame(q[0], q[1], T * 0.34, t, p.seed, 'rgba(255,200,120,0.95)', 'rgba(230,50,30,0.9)', ['kfireR', [[0, 'rgba(255,70,40,0.42)'], [0.5, 'rgba(255,50,30,0.12)'], [1, 'rgba(255,40,20,0)']]]);
    },
    brimstone(p, T) { groundShadow(p.x, p.y, 0.16, 0.1, 0.3); [[-0.06, 0.02, 0.08], [0.06, -0.02, 0.06], [0.01, 0.06, 0.05]].forEach(([u, v, r]) => pBall(p.x + u, p.y + v, 0, r * p.s, '#c4a052', 'rgba(60,30,10,0.45)')); },
    horns(p, T) { groundShadow(p.x, p.y, 0.16, 0.08, 0.3); const s = W2S(p.x, p.y, 0.06), r = T * 0.1 * p.s; skullT(ctx, s[0], s[1] - r * 0.4, r * 1.4, '#c9bfa8', 'rgba(110,100,80,0.5)', '#2a1414'); ctx.strokeStyle = '#d9cfb4'; ctx.lineWidth = Math.max(1.5, T * 0.035); ctx.beginPath(); ctx.moveTo(s[0] - r * 0.5, s[1] - r); ctx.quadraticCurveTo(s[0] - r * 1.4, s[1] - r * 1.4, s[0] - r * 1.1, s[1] - r * 2.2); ctx.moveTo(s[0] + r * 0.5, s[1] - r); ctx.quadraticCurveTo(s[0] + r * 1.4, s[1] - r * 1.4, s[0] + r * 1.1, s[1] - r * 2.2); ctx.stroke(); },
    chainpile(p, T) { const b = W2S(p.x, p.y, 0.02); ctx.strokeStyle = '#6a6672'; ctx.lineWidth = Math.max(1, T * 0.025); for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(b[0] + Math.cos(k * 1.7) * T * 0.1, b[1] + Math.sin(k * 1.7) * T * 0.05, T * 0.035, T * 0.022, k, 0, Math.PI * 2); ctx.stroke(); } }
  });
  Object.assign(KIND_WALL, {
    lab(u0, t, alt) {   // a shelf of bottles; or a chart of the elements
      if (alt) { ctx.fillStyle = '#c9bfa8'; ctx.fillRect(0.25, 0.15, 0.5, 0.55); ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 0.02; ctx.strokeRect(0.25, 0.15, 0.5, 0.55); ctx.strokeStyle = '#3a6a3a'; ctx.beginPath(); ctx.arc(0.5, 0.38, 0.12, 0, 7); ctx.moveTo(0.38, 0.38); ctx.lineTo(0.62, 0.38); ctx.moveTo(0.5, 0.26); ctx.lineTo(0.5, 0.5); ctx.stroke(); for (let k = 0; k < 3; k++) { ctx.fillStyle = '#4a3a28'; ctx.fillRect(0.3, 0.55 + k * 0.04, 0.4 - k * 0.08, 0.015); } return; }
      ctx.fillStyle = '#4a3020'; ctx.fillRect(0.12, 0.42, 0.76, 0.05); ctx.fillRect(0.12, 0.72, 0.76, 0.05);
      [['#7fe05a', 0.2], ['#8cc8ff', 0.36], ['#c78be3', 0.54], ['#e0643c', 0.72]].forEach(([c, x], k) => { [0.42, 0.72].forEach((y, j) => { if ((k + j) % 3 === 2) return; ctx.fillStyle = 'rgba(200,215,240,0.5)'; ctx.fillRect(x, y - 0.17, 0.035, 0.06); ctx.fillStyle = c; ctx.fillRect(x - 0.025, y - 0.11, 0.085, 0.11); }); });
      ctx.fillStyle = 'rgba(127,224,90,' + (0.15 + 0.1 * Math.sin(t * 2 + u0 * 9)).toFixed(2) + ')'; ctx.fillRect(0.12, 0.2, 0.76, 0.55);
    },
    graveyard(u0, t, alt) {   // ivy hanging down; or an iron lantern with a pale flame
      if (alt) { ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(0.5, 0.05); ctx.lineTo(0.5, 0.25); ctx.stroke(); ctx.fillStyle = '#2a2a2e'; ctx.fillRect(0.4, 0.25, 0.2, 0.26); ctx.fillStyle = 'rgba(200,230,220,' + (0.55 + 0.25 * Math.sin(t * 5 + u0 * 7)).toFixed(2) + ')'; ctx.fillRect(0.44, 0.29, 0.12, 0.18); return; }
      ctx.strokeStyle = '#3e5a2a'; ctx.lineWidth = 0.025; for (let k = 0; k < 4; k++) { const x = 0.15 + k * 0.22 + u0 * 0.05; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 0.06, 0.3, x - 0.02, 0.45 + 0.15 * (k % 2)); ctx.stroke(); ctx.fillStyle = k % 2 ? '#5c8c3a' : '#4a7a30'; for (let j = 1; j < 5; j++) { ctx.beginPath(); ctx.ellipse(x + 0.03 * Math.sin(j * 2), j * 0.1, 0.035, 0.022, j, 0, 7); ctx.fill(); } }
    },
    abyssgate(u0, t, alt) {   // a sigil burning in the stone; or chains with a hook
      if (alt) { ctx.strokeStyle = '#5a5664'; ctx.lineWidth = 0.02; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(0.4 + (k % 2) * 0.02, 0.08 + k * 0.08, 0.025, 0.04, 0, 0, 7); ctx.stroke(); } ctx.beginPath(); ctx.arc(0.43, 0.6, 0.06, 0, Math.PI); ctx.stroke(); return; }
      const a = 0.5 + 0.3 * Math.sin(t * 2 + u0 * 8);
      ctx.strokeStyle = 'rgba(255,90,50,' + a.toFixed(2) + ')'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.arc(0.5, 0.45, 0.22, 0, 7);
      for (let k = 0; k <= 5; k++) { const b = -Math.PI / 2 + k * 4 * Math.PI / 5; k ? ctx.lineTo(0.5 + Math.cos(b) * 0.22, 0.45 + Math.sin(b) * 0.22) : ctx.moveTo(0.5 + Math.cos(b) * 0.22, 0.45 + Math.sin(b) * 0.22); }
      ctx.stroke();
    }
  });
  const KIND_LIFE2 = {
    lab(R, T, t, P, dot, glow, mx, my, w, h, seed) { for (let k = 0; k < 6; k++) { const p = P(k, 0.18), sx = R.x0 + 0.4 + (w - 0.8) * kH(seed, k, 61), sy = R.y0 + 0.4 + (h - 0.8) * kH(seed, k, 62); dot(sx + Math.sin(p * 6 + k) * 0.08, sy, 0.1 + p * 1.2, Math.max(1, T * 0.03 * (1 - p * 0.5)), 'rgba(156,230,120,' + (0.7 * Math.sin(p * Math.PI)).toFixed(2) + ')'); } },
    graveyard(R, T, t, P, dot, glow, mx, my, w, h, seed) {
      for (let k = 0; k < 4; k++) { const p = P(k, 0.04), sx = R.x0 + (w) * ((p + kH(seed, k, 63)) % 1), sy = R.y0 + 0.3 + (h - 0.6) * kH(seed, k, 64), q = W2S(sx, sy, 0.12); ctx.fillStyle = 'rgba(185,196,216,0.14)'; ctx.beginPath(); ctx.ellipse(q[0], q[1], T * 0.9, T * 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
      for (let k = 0; k < 2; k++) { const p = P(k + 5, 0.07), sx = R.x0 + 0.4 + (w - 0.8) * kH(seed, k, 65) + Math.sin(t * 0.6 + k) * 0.3, sy = R.y0 + 0.4 + (h - 0.8) * kH(seed, k, 66); ctx.globalAlpha = Math.sin(p * Math.PI); glow('kgwisp', [[0, 'rgba(220,255,230,0.9)'], [0.4, 'rgba(170,230,200,0.3)'], [1, 'rgba(170,230,200,0)']], sx, sy, 0.4 + p, T * 0.18); ctx.globalAlpha = 1; }
    },
    abyssgate(R, T, t, P, dot, glow, mx, my, w, h, seed) { for (let k = 0; k < 9; k++) { const p = P(k, 0.3), sx = mx - 0.6 + 1.2 * kH(seed, k, 67) + Math.sin(p * 8 + k) * 0.1, sy = my - 0.5 + kH(seed, k, 68); dot(sx, sy, 0.05 + p * 1.5, Math.max(1, T * 0.028 * (1 - p * 0.5)), 'rgba(255,' + (90 + 90 * (1 - p) | 0) + ',50,' + (0.9 * (1 - p)).toFixed(2) + ')'); } }
  };
  // ---------- 1.26 round 2: the animations of the new traps and monsters when they fire (trapFx -> afx) ----------
  Object.assign(TRAP_FX, { pendulum: 'swing', bolt: 'zap', snare: 'snap', bait: 'snap', miasma: 'puff', oilslick: 'splash', flood: 'wave', bell: 'toll', falsedoor: 'shimmer', tar: 'pour',
    skeleton: 'slash', zombie: 'bite', lich: 'frost', imp: 'poof', hound: 'lunge', siren: 'kiss', demon: 'inferno', sapper: 'caltrop', warlord: 'warcry', rats: 'swarm' });
  Object.assign(AFX_DUR, { swing: 0.5, zap: 0.4, snap: 0.45, puff: 0.9, splash: 0.6, wave: 0.8, toll: 1.0, shimmer: 0.7, pour: 0.7, slash: 0.4, bite: 0.45, frost: 0.6, poof: 0.5, lunge: 0.45, kiss: 0.9, inferno: 0.7, caltrop: 0.5, warcry: 0.8, swarm: 0.7 });
  const afRing = (P, T, r, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw || Math.max(1.5, T * 0.05); ctx.beginPath(); ctx.ellipse(P[0], P[1], r, r * SP, 0, 0, Math.PI * 2); ctx.stroke(); };
  Object.assign(AFX_DRAW, {
    swing(f, k, P, T) {   // the blade sweeps from the wall across the room: a white arc and its trail
      const A = W2S(f.x, f.y, 0.9), B = W2S(f.x2, f.y2, 0.4), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2 + T * 0.4, e = Math.min(1, k * 1.6);
      ctx.globalAlpha = 1 - k * 0.6; ctx.strokeStyle = 'rgba(230,225,214,0.85)'; ctx.lineWidth = Math.max(2, T * 0.1 * (1 - k)); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); const n = 10; for (let i = 1; i <= Math.round(n * e); i++) { const u = i / n; ctx.lineTo((1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * mx + u * u * B[0], (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * my + u * u * B[1]); } ctx.stroke();
    },
    zap(f, k, P, T) {   // a jagged bolt from the rune to the far end, with a flash
      const A = W2S(f.x, f.y, f.z || 0.7), B = W2S(f.x2, f.y2, 0.5);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#e6f4ff'; ctx.lineWidth = Math.max(1.5, T * 0.05); ctx.beginPath(); ctx.moveTo(A[0], A[1]);
      for (let i = 1; i < 7; i++) { const u = i / 7; ctx.lineTo(A[0] + (B[0] - A[0]) * u + Math.sin(i * 7.3 + f.t0 * 13) * T * 0.18, A[1] + (B[1] - A[1]) * u + Math.cos(i * 5.1 + f.t0 * 11) * T * 0.12); }
      ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.strokeStyle = 'rgba(140,200,255,0.5)'; ctx.lineWidth = Math.max(3, T * 0.12); ctx.stroke();
      ctx.fillStyle = 'rgba(200,230,255,' + (0.5 * (1 - k)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(B[0], B[1], T * 0.4 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
    },
    snap(f, k, P, T) {   // iron jaws slam shut
      const g = T * 0.3 * (1 - Math.min(1, k * 3)), w = T * 0.36;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.5) / 0.5; ctx.fillStyle = '#c9cdd8';
      [-1, 1].forEach(s => { const y = P[1] - T * 0.15 + s * g; ctx.beginPath(); ctx.moveTo(P[0] - w, y); for (let i = 0; i <= 6; i++) ctx.lineTo(P[0] - w + i * w / 3, y - s * (i % 2 ? T * 0.1 : 0)); ctx.lineTo(P[0] + w, y); ctx.closePath(); ctx.fill(); });
      if (k > 0.3) afRing(P, T, T * (0.3 + 0.6 * (k - 0.3)), 'rgba(201,205,216,' + (1 - k).toFixed(2) + ')');
    },
    puff(f, k, P, T, H) { for (let i = 0; i < 5; i++) { const q = Math.max(0, k - i * 0.06), a = i * 1.26; ctx.globalAlpha = 0.5 * (1 - q); ctx.fillStyle = i % 2 ? '#7cbe5a' : '#9cc27e'; ctx.beginPath(); ctx.arc(P[0] + Math.cos(a) * T * 0.7 * q, P[1] - H * 0.5 * q + Math.sin(a) * T * 0.2, T * (0.2 + 0.45 * q), 0, Math.PI * 2); ctx.fill(); } },
    splash(f, k, P, T) { ctx.globalAlpha = 1 - k; ctx.fillStyle = '#1a120c'; for (let i = 0; i < 7; i++) { const a = i * 0.9, r = T * 0.9 * k; ctx.beginPath(); ctx.arc(P[0] + Math.cos(a) * r, P[1] + Math.sin(a) * r * SP - T * 0.3 * Math.sin(Math.PI * k), Math.max(1.2, T * 0.06), 0, Math.PI * 2); ctx.fill(); } },
    wave(f, k, P, T) { for (let i = 0; i < 3; i++) { const q = k - i * 0.12; if (q < 0) continue; ctx.globalAlpha = 0.8 * (1 - q); afRing(P, T, T * (0.3 + 1.6 * q), i ? '#6f9aa8' : '#a9d4da'); } },
    toll(f, k, P, T, H) { const Q = W2S(f.x, f.y, f.z || 0.6); for (let i = 0; i < 3; i++) { const q = k - i * 0.2; if (q < 0) continue; ctx.globalAlpha = 0.7 * (1 - q); ctx.strokeStyle = '#e6e1d6'; ctx.lineWidth = Math.max(1.2, T * 0.04); ctx.beginPath(); ctx.arc(Q[0], Q[1] - H * 0.3, T * (0.3 + 1.2 * q), 0, Math.PI * 2); ctx.stroke(); } },
    shimmer(f, k, P, T, H) { ctx.globalAlpha = 0.8 * Math.sin(Math.PI * k); ctx.fillStyle = 'rgba(160,140,232,0.35)'; ctx.fillRect(P[0] - T * 0.45, P[1] - H * 1.1, T * 0.9, H * 1.1); ctx.fillStyle = '#d9ccff'; for (let i = 0; i < 6; i++) ctx.fillRect(P[0] + Math.sin(i * 2.3 + k * 9) * T * 0.4, P[1] - H * (0.1 + 0.15 * i), Math.max(1, T * 0.04), Math.max(1, T * 0.04)); },
    pour(f, k, P, T, H) { const Q = W2S(f.x, f.y, 1.2); ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4; ctx.fillStyle = '#0e0b08'; for (let i = 0; i < 5; i++) { const q = (k * 2 + i * 0.2) % 1; ctx.beginPath(); ctx.arc(Q[0] + (i - 2) * T * 0.04, Q[1] + (P[1] - Q[1]) * q, Math.max(1.5, T * 0.05), 0, Math.PI * 2); ctx.fill(); } ctx.beginPath(); ctx.ellipse(P[0], P[1], T * 0.4 * Math.min(1, k * 2), T * 0.4 * SP * Math.min(1, k * 2), 0, 0, Math.PI * 2); ctx.fill(); },
    slash(f, k, P, T, H) { ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#efe6cc'; ctx.lineWidth = Math.max(2, T * 0.08 * (1 - k)); ctx.beginPath(); ctx.arc(P[0], P[1] - H * 0.5, T * 0.55, -0.9 + k * 1.2, 0.3 + k * 1.2); ctx.stroke(); },
    bite(f, k, P, T, H) { ctx.globalAlpha = 1 - k; ctx.fillStyle = '#9cc27e'; for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 3; ctx.beginPath(); ctx.arc(P[0] + Math.cos(a) * T * 0.5 * k, P[1] - H * 0.4 + Math.sin(a) * T * 0.3 * k, Math.max(1.2, T * 0.05), 0, Math.PI * 2); ctx.fill(); } },
    frost(f, k, P, T, H) { ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = Math.max(1.2, T * 0.04); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, l = T * (0.2 + 0.7 * k); ctx.beginPath(); ctx.moveTo(P[0], P[1] - H * 0.5); ctx.lineTo(P[0] + Math.cos(a) * l, P[1] - H * 0.5 + Math.sin(a) * l * 0.7); ctx.stroke(); } afRing(P, T, T * (0.3 + 0.8 * k), 'rgba(191,230,255,' + (0.7 * (1 - k)).toFixed(2) + ')'); },
    poof(f, k, P, T, H) { ctx.globalAlpha = 1 - k; for (let i = 0; i < 8; i++) { const a = i * 0.785; ctx.fillStyle = i % 2 ? '#ff9a3c' : '#e0643c'; ctx.fillRect(P[0] + Math.cos(a) * T * 0.6 * k, P[1] - H * 0.6 + Math.sin(a) * T * 0.6 * k, Math.max(1.5, T * 0.05), Math.max(1.5, T * 0.05)); } },
    lunge(f, k, P, T, H) { ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = Math.max(1.5, T * 0.05); for (let i = 0; i < 3; i++) { const y = P[1] - H * (0.2 + 0.12 * i); ctx.beginPath(); ctx.moveTo(P[0] - T * (0.2 + 0.6 * k), y); ctx.lineTo(P[0] + T * (0.3 + 0.6 * k), y); ctx.stroke(); } },
    kiss(f, k, P, T, H) { ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ff8ac8'; ctx.font = Math.round(T * 0.4) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let i = 0; i < 3; i++) ctx.fillText('♥', P[0] + (i - 1) * T * 0.3 + Math.sin(k * 6 + i) * T * 0.1, P[1] - H * (0.8 + 0.8 * k) + i * T * 0.1); },
    inferno(f, k, P, T) { const r = T * (0.5 + 1.8 * k), g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], r); g.addColorStop(0, 'rgba(255,220,140,0.6)'); g.addColorStop(0.5, 'rgba(255,100,40,0.35)'); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.globalAlpha = 1 - k; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(P[0], P[1], r, r * SP, 0, 0, Math.PI * 2); ctx.fill(); afRing(P, T, r, 'rgba(255,140,60,0.8)'); },
    caltrop(f, k, P, T) { ctx.globalAlpha = 1 - k; ctx.fillStyle = '#c9c2b8'; for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.fillRect(P[0] + Math.cos(a) * T * 0.8 * k, P[1] + Math.sin(a) * T * 0.4 * k - T * 0.4 * Math.sin(Math.PI * k), Math.max(1.5, T * 0.04), Math.max(1.5, T * 0.04)); } },
    warcry(f, k, P, T, H) { for (let i = 0; i < 3; i++) { const q = k - i * 0.15; if (q < 0) continue; ctx.globalAlpha = 0.8 * (1 - q); ctx.strokeStyle = '#cc3640'; ctx.lineWidth = Math.max(1.5, T * 0.05); ctx.beginPath(); ctx.arc(P[0], P[1] - H * 0.6, T * (0.3 + 1.0 * q), -2.4, -0.7); ctx.stroke(); } },
    swarm(f, k, P, T) { ctx.globalAlpha = 1 - Math.max(0, k - 0.5) / 0.5; ctx.fillStyle = '#5a4a44'; for (let i = 0; i < 10; i++) { const a = i * 0.63 + k * 2, r = T * (0.3 + 1.1 * k) * (0.5 + 0.5 * ((i * 7) % 3) / 2); ctx.beginPath(); ctx.ellipse(P[0] + Math.cos(a) * r, P[1] + Math.sin(a) * r * SP, Math.max(1.5, T * 0.06), Math.max(1, T * 0.03), a, 0, Math.PI * 2); ctx.fill(); } }
  });
  // a hero taking damage over time (each tick sets h.flash): his white flash only blinks (drawHero)
  const heroDot = h => !!fl && fl.phase === 'raid' && ((h.poison || 0) > 0 || (h.plague || 0) > 0 || fl.time < (h.bleedUntil || -1) || fl.time < h.burnUntil);
  // ---------- 1.26: raised wall pieces of the three new komnaty (KIND_WALL3D, like the old ones) ----------
  Object.assign(KIND_WALL3D, {
    lab(F, h, T, t, s) {   // a shelf with flasks, one bubbling green; a copper pipe on the other pieces
      if (s % 2) { const a = F.P(0.15, 0.06, h - 0.2), b = F.P(0.15, 0.06, 0.3), c = F.P(0.85, 0.06, 0.3); pLine(a, b, '#a8683a', Math.max(2, T * 0.04)); pLine(b, c, '#a8683a', Math.max(2, T * 0.04)); return; }
      const z = Math.min(1.0, h - 0.35); F.box(0.5, 0.1, 0.8, 0.16, 0.04, z, '#5a4430', '#4a3828', '#3a2c20');
      [[0.25, '#7fd08a'], [0.45, '#d8c06a'], [0.68, '#9fb8e0']].forEach(([u, col], k) => { const [wx, wy] = F.W(u, 0.1); pCyl(wx, wy, 0.05, 0.12 + 0.03 * k, col, '#e8f0e8', z + 0.04); });
      const q = F.P(0.25, 0.1, z + 0.22 + Math.sin(t * 3 + s) * 0.03); ctx.fillStyle = 'rgba(160,240,170,0.7)'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, T * 0.025), 0, Math.PI * 2); ctx.fill();
    },
    graveyard(F, h, T, t, s) {   // ivy hanging off the top; a small iron lantern on every third piece
      ctx.strokeStyle = '#3e5a34'; ctx.lineWidth = Math.max(1.5, T * 0.03); ctx.lineCap = 'round';
      [0.2, 0.55, 0.8].forEach((u, k) => { const a = F.P(u, 0.02, h - 0.02), b = F.P(u + 0.05, 0.08, h - 0.4 - 0.15 * k); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0] + T * 0.06, (a[1] + b[1]) / 2, b[0], b[1]); ctx.stroke(); ctx.fillStyle = '#4e7040'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(1.5, T * 0.035), 0, Math.PI * 2); ctx.fill(); });
      ctx.lineCap = 'butt';
      if (s % 3 === 0) { const z = Math.min(0.95, h - 0.4); pLine(F.P(0.5, 0, z + 0.1), F.P(0.5, 0.14, z + 0.1), '#2a2a2e', Math.max(1.5, T * 0.03)); F.box(0.5, 0.16, 0.1, 0.1, 0.14, z - 0.06, '#3a3a40', '#2c2c32', '#222226'); const q = F.P(0.5, 0.16, z + 0.02); ctx.fillStyle = 'rgba(240,220,150,' + (0.6 + 0.2 * Math.sin(t * 4 + s)) + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, T * 0.03), 0, Math.PI * 2); ctx.fill(); }
    },
    abyssgate(F, h, T, t, s) {   // a glowing crack running down the stone; chains with a hook on the other pieces
      if (s % 2) { [0.3, 0.7].forEach((u, k) => { const a = F.P(u, 0.03, h - 0.05), b = F.P(u, 0.06, h - 0.6 - 0.15 * k); pLine(a, b, '#3a3236', Math.max(1.5, T * 0.03)); }); return; }
      const g = 0.55 + 0.35 * Math.sin(t * 2 + s), pts = [[0.4, h - 0.1], [0.48, h - 0.45], [0.42, h - 0.75], [0.52, 0.35]].map(([u, z]) => F.P(u, 0.01, Math.max(0.1, z)));
      ctx.strokeStyle = 'rgba(255,90,50,' + g.toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, T * 0.035); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
  });
