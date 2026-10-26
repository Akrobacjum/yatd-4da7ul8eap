
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
      if (o.tint && kind !== 'none') {   // 1.27.1 (author: the tiles all looked grey): the family's colour soaks the stone and glows behind the thing
        const hx = (h, a) => 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';
        P.rect(0, 0, W, H, hx(o.tint[0], 0.62)); P.glow(36, kind === 'wall' ? 15 : 24, 30, o.tint[1], 0.42);
      }
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
    EL.secret = (P, x, y) => {   // 1.26.1 Ukryte przejście: a stretch of wall with one block a little out of line and a violet seam
      P.rect(x - 16, y - 24, 32, 24, C.st2);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) P.rect(x - 16 + k * 8 + (r % 2) * 4, y - 24 + r * 6, 7, 5, (r + k) % 3 ? C.st3 : C.st1);
      P.rect(x - 5, y - 18, 10, 12, C.st4).rect(x - 5, y - 18, 10, 1, C.st1);
      P.after(() => { P.g.save(); P.g.setLineDash([2, 2]); P.g.strokeStyle = 'rgba(190,160,255,0.95)'; P.g.lineWidth = 1; P.g.strokeRect(x - 5.5, y - 18.5, 11, 13); P.g.restore(); P.txt('?', x + 10, y - 20, '#d9c4ff', 11); });
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
    // 1.27.1: a backdrop colour per family (dark base, glow), and for the objects; dungeon tools and rooms keep their stone
    const FAM_TINT = { mech: ['#33475a', '#a9d4da'], fire: ['#4d3220', '#ffb35c'], alch: ['#2e4420', '#9cc27e'], haunt: ['#2c2048', '#a08ce8'], undead: ['#16171c', '#9cc27e'],
      beast: ['#2a1b12', '#b08850'], green: ['#2e4420', '#5c8c3a'], demons: ['#460a10', '#cc3640'], treasure: ['#4d3220', '#f0d890'] };
    const OBJ_TINT = ['#2a1b12', '#c4a052'];
    const tintOf = t => FAM_TINT[FAMILY_OF[t]] || (BUILDINGS[t] || t === 'crate' ? OBJ_TINT : null);
    ART.tintOf = tintOf;
    function paintTile(type) {
      if (ROOMS[type]) return scene('tile:' + type, STAGE_OF[type] || 'floor', P => ROOMS[type](P), { warm: type === 'r_ice' || type === 'r_hush' ? 0.05 : undefined });
      const f = EL[type]; if (!f) return null;
      const I = ITEMS[type], st = STAGE_OF[type] || (I && SLOT_STAGE[I.slot]) || 'floor';
      const wallish = st === 'wall', doorish = st === 'door', k = TILE_K[type] || 1, ax = 36, ay = wallish ? 15 : doorish ? 29 : FLOOR_Y;
      return scene('tile:' + type, st, P => { if (k !== 1) { P.g.save(); P.g.translate(ax, ay); P.g.scale(k, k); P.g.translate(-ax, -ay); } f(P, ax, ay); if (k !== 1) P.g.restore(); }, { tint: tintOf(type) });
    }
    ART.tile = type => ART.url('tile:' + type, () => paintTile(type));
    ART.tileCanvas = type => ART.keep('tile:' + type, () => paintTile(type));
  })();
  ART.ITEM_ORDER = ITEM_ORDER;
  ART.has = t => !!(ART.EL[t] || ART.ROOMS[t]);
  // an <img> of a card's picture (big: the card's own window, twice the size); null when there is none
  ART.cardImg = (id, big, tall) => {
    const u = tall && ART.cardTall ? ART.cardTall(id) : ART.card ? ART.card(id) : ''; if (!u) return null;
    const im = document.createElement('img'); im.className = 'cardart' + (big ? ' cardbig' : '') + (tall ? ' tall' : '') + (ART.isHeart && ART.isHeart(id) ? ' heart' : ''); im.alt = ''; im.draggable = false; im.src = u; return im;
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
  // 1.27.5: Wnyki and Przynęta are solid now: still drawn in the floor pass (low, under what stands), but in screen space with
  // the boxes and cylinders of the rest, the pop of a new trap kept
  function trapOnFloor(it, draw) {
    ctx.save(); screenT(); noRelief();
    const k = popK(it); if (k !== 1) { const f = W2S(it.x + 0.5, it.y + 0.5, 0); ctx.translate(f[0], f[1]); ctx.scale(k, k); ctx.translate(-f[0], -f[1]); }
    draw(); ctx.restore();
  }
  // one iron jaw: a half ring R round (cx, cy) hinged on the line along x through the centre (s = 1 the near half, -1 the far
  // one), phi lifts it (0 flat and open, about pi/2 upright and shut); a band with its teeth along the upper edge.
  // cols: [band, lit edge, tooth, tooth's shaded side]
  function jaw3D(cx, cy, R, phi, s, cols, T, n) {
    const cp = Math.cos(phi), sn = Math.sin(phi), bh = 0.045, th = 0.075, N = 10;
    const at = (a, l) => { const yl = R * Math.sin(a); return W2S(cx + R * Math.cos(a), cy + s * (yl * cp - l * sn), 0.015 + yl * sn + l * cp); };   // l up the jaw from its rim
    ctx.beginPath();
    for (let k = 0; k <= N; k++) { const p = at(Math.PI * k / N, 0); if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
    for (let k = N; k >= 0; k--) { const p = at(Math.PI * k / N, bh); ctx.lineTo(p[0], p[1]); }
    ctx.closePath(); ctx.fillStyle = cols[0]; ctx.fill();
    ctx.strokeStyle = cols[1]; ctx.lineWidth = Math.max(1, T * 0.018); ctx.beginPath();
    for (let k = 0; k <= N; k++) { const p = at(Math.PI * k / N, bh); if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
    ctx.stroke();
    for (let k = 0; k < n; k++) { const a = Math.PI * (k + 0.5) / n, d = Math.PI / n * 0.36, m = at(a, bh), tip = at(a, bh + th); poly([at(a - d, bh), tip, m], cols[2]); poly([m, tip, at(a + d, bh)], cols[3]); }
  }
  function grateRim(it, o, w) {   // four low iron bars round a square grate (o: its offset in the tile, w: its size), the far ones first
    const x0 = it.x + o, y0 = it.y + o, e = 0.035, h = 0.03, c = ['#6a6e78', '#50555e', '#3a3e46'];
    isoBox(x0 + w / 2, y0 + e / 2, w, e, h, c[0], c[1], c[2]); isoBox(x0 + e / 2, y0 + w / 2, e, w, h, c[0], c[1], c[2]);
    isoBox(x0 + w - e / 2, y0 + w / 2, e, w, h, c[0], c[1], c[2]); isoBox(x0 + w / 2, y0 + w - e / 2, w, e, h, c[0], c[1], c[2]);
  }
  // 1.27.5: small solid parts for the rest of the map (screen space, tiles; a = [x, y, z])
  function rod3D(a, b, w, col, lit) {   // a round bar from a to b, w thick: its body and a lit stripe along its upper left
    const p = W2S(a[0], a[1], a[2]), q = W2S(b[0], b[1], b[2]), lw = Math.max(1.2, cam.s * w);
    ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    if (lit && lw >= 2.2) {
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L; if (nx + ny > 0) { nx = -nx; ny = -ny; }
      const o = lw * 0.24; ctx.strokeStyle = lit; ctx.lineWidth = lw * 0.34; ctx.beginPath(); ctx.moveTo(p[0] + nx * o, p[1] + ny * o); ctx.lineTo(q[0] + nx * o, q[1] + ny * o); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  function bone3D(x0, y0, x1, y1, z, w, col, lit) {   // a long bone lying on the floor: a round shaft, two knobs at each end
    rod3D([x0, y0, z + w / 2], [x1, y1, z + w / 2], w, col, lit);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w * 0.55, ny = dx / L * w * 0.55;
    [[x0, y0], [x1, y1]].forEach(e => { pBall(e[0] - nx, e[1] - ny, z, w * 0.62, col, 'rgba(60,50,40,0.3)'); pBall(e[0] + nx, e[1] + ny, z, w * 0.62, col, 'rgba(60,50,40,0.3)'); });
  }
  function skull3D(cx, cy, z, r, col) {   // a skull lying on the floor, looking at you: a round cranium, a jaw under it, dark sockets
    const T = cam.s;
    isoBox(cx, cy + r * 0.45, r * 1.05, r * 0.7, r * 0.55, col, '#b8ae9a', '#9a907e', z);   // the jaw
    const p = pBall(cx, cy, z + r * 0.25, r, col, 'rgba(70,60,48,0.32)'), rr = T * r;
    ctx.fillStyle = '#1a1424'; ctx.beginPath(); ctx.ellipse(p[0] - rr * 0.36, p[1] + rr * 0.18, rr * 0.24, rr * 0.27, 0, 0, Math.PI * 2); ctx.ellipse(p[0] + rr * 0.36, p[1] + rr * 0.18, rr * 0.24, rr * 0.27, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(p[0] - rr * 0.06, p[1] + rr * 0.48, rr * 0.12, rr * 0.16);
  }
  // a round vessel turned on a lathe: prof = [[z, r], ...] from its foot up to its mouth (open, inner colour), lit from the left;
  // lean shifts each ring along (lx, ly) by lean x its height (a cauldron tipping)
  function lathe3D(cx, cy, prof, side, inner, rim, lean, lx, ly) {
    const T = cam.s, n = prof.length, P = prof.map(q => { const k = (lean || 0) * (q[0] - prof[0][0]), c = W2S(cx + (lx || 0) * k, cy + (ly || 0) * k, q[0]); return [c[0], c[1], q[1] * T]; });
    const path = () => { ctx.beginPath(); for (let i = n - 1; i >= 0; i--) ctx.lineTo(P[i][0] - P[i][2], P[i][1]); ctx.ellipse(P[0][0], P[0][1], P[0][2], P[0][2] * SP, 0, Math.PI, 0, true); for (let i = 1; i < n; i++) ctx.lineTo(P[i][0] + P[i][2], P[i][1]); ctx.closePath(); };
    let xl = Infinity, xr = -Infinity; P.forEach(q => { xl = Math.min(xl, q[0] - q[2]); xr = Math.max(xr, q[0] + q[2]); });
    path(); ctx.fillStyle = side; ctx.fill();
    const g = ctx.createLinearGradient(xl, 0, xr, 0); g.addColorStop(0, 'rgba(255,235,200,0.2)'); g.addColorStop(0.35, 'rgba(255,235,200,0.03)'); g.addColorStop(0.62, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fill();
    const m = P[n - 1];
    if (inner) { ctx.fillStyle = inner; ctx.beginPath(); ctx.ellipse(m[0], m[1], m[2], m[2] * SP, 0, 0, Math.PI * 2); ctx.fill(); }
    if (rim) { ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, T * 0.025); ctx.beginPath(); ctx.ellipse(m[0], m[1], m[2], m[2] * SP, 0, 0, Math.PI * 2); ctx.stroke(); }
    return m;
  }
  function ring3D(cx, cy, z, r, h, col, lit) {   // a thick iron ring lying on the floor (a cuff, a link): its dark underside, its lit top
    const T = cam.s, b = W2S(cx, cy, z), t = W2S(cx, cy, z + h), lw = Math.max(1.2, T * h * 1.1);
    ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(b[0], b[1], T * r, T * r * SP, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = lw * 0.7; ctx.strokeStyle = lit; ctx.beginPath(); ctx.ellipse(t[0], t[1], T * r, T * r * SP, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
  }
  // a slab standing on the floor from A to B ([x, y]), t thick, z0 to z1: its end and top as faces, its front (the side towards
  // you) through art(), drawn in the front's unit square (u along A to B, v down) - a door leaf, a painted false wall
  function slab3D(A, B, t, z0, z1, top, front, end, art) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L * t / 2, ny = dx / L * t / 2; if (nx + ny < 0) { nx = -nx; ny = -ny; }
    const a0 = [A[0] - nx, A[1] - ny], a1 = [A[0] + nx, A[1] + ny], b0 = [B[0] - nx, B[1] - ny], b1 = [B[0] + nx, B[1] + ny];
    const E = (B[0] + B[1] >= A[0] + A[1]) ? [b0, b1] : [a0, a1];   // the end that faces you
    poly([W2S(E[0][0], E[0][1], z0), W2S(E[1][0], E[1][1], z0), W2S(E[1][0], E[1][1], z1), W2S(E[0][0], E[0][1], z1)], end);
    ctx.save(); faceMap(a1[0], a1[1], b1[0], b1[1], z0, z1); ctx.fillStyle = front; ctx.fillRect(0, 0, 1, 1); if (art) art(); ctx.restore();
    poly([W2S(a0[0], a0[1], z1), W2S(b0[0], b0[1], z1), W2S(b1[0], b1[1], z1), W2S(a1[0], a1[1], z1)], top);
  }
  function crystal3D(x, y, r, col, dark) {   // a crystal standing on its point: an octahedron, its left facets lit, its right ones dark
    poly([[x, y - r * 1.4], [x - r, y], [x, y + r * 0.25]], col); poly([[x, y - r * 1.4], [x + r, y], [x, y + r * 0.25]], dark);
    poly([[x - r, y], [x, y + r * 1.4], [x, y + r * 0.25]], dark); poly([[x + r, y], [x, y + r * 1.4], [x, y + r * 0.25]], 'rgba(0,0,0,0.35)');
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y - r * 1.4); ctx.stroke();
  }
  const BAIT_COINS = [[-0.08, -0.05, 0, 0], [0, -0.01, 0, 0], [0, -0.01, 0.022, 1], [0, -0.01, 0.044, 0], [0.07, -0.07, 0, 1], [0.07, -0.07, 0.022, 0], [-0.03, 0.07, 0, 1], [0.08, 0.05, 0, 0]];   // [dx, dy, dz, bright], far ones first
  const OIL_BLOBS = [[0, 0, 0.36], [-0.18, 0.12, 0.2], [0.2, -0.1, 0.22], [0.12, 0.2, 0.16], [-0.16, -0.16, 0.16]];
  const TOP_ART = {
    snare(it, T) {   // 1.27.5: raised iron jaws on a spring bar, their teeth standing up; sprung, they snap up shut (a solid body, drawn in screen space)
      const cx = it.x + 0.5, cy = it.y + 0.5, shut = it.anim > 0, R = 0.3, sp = sparkSet(it, shut);
      trapOnFloor(it, () => {
        const dk = ['#77727f', '#55505e', '#45404e'], cols = ['#5e5a68', '#a9acba', '#c9ccd8', '#8a8496'];
        groundShadow(cx + 0.03, cy + 0.03, 0.4, 0.36, 0.3);
        const s0 = W2S(cx + 0.4, cy + 0.03, 0.02), s1 = W2S(it.x + 0.9, it.y + 0.86, 0.02);
        ctx.strokeStyle = '#55505e'; ctx.lineWidth = Math.max(1, T * 0.03); ctx.setLineDash([T * 0.04, T * 0.03]); ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke(); ctx.setLineDash([]);   // the chain to its stake
        isoBox(it.x + 0.9, it.y + 0.86, 0.06, 0.06, 0.1, '#77727f', '#55505e', '#45404e');
        isoBox(cx, cy, 0.86, 0.07, 0.035, dk[0], dk[1], dk[2]);   // the spring bar on the hinge
        isoBox(cx - 0.41, cy, 0.09, 0.13, 0.06, dk[0], dk[1], dk[2]);
        const pan = () => { isoBox(cx, cy, 0.15, 0.15, 0.03, '#a29cae', '#8a8496', '#6a6476', 0.02); isoBox(cx, cy, 0.05, 0.05, 0.015, '#e0c070', '#c4a052', '#9a7a3a', 0.05); };
        if (shut) pan();
        jaw3D(cx, cy, R, shut ? 1.48 : 0.05, -1, cols, T, 6);
        if (!shut) pan();
        jaw3D(cx, cy, R, shut ? 1.48 : 0.05, 1, cols, T, 6);
        isoBox(cx + 0.41, cy, 0.09, 0.13, 0.06, dk[0], dk[1], dk[2]);
        if (sp.edge) for (let k = 0; k < 7; k++) { const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 0.8; sparkAdd(sp, cx + Math.cos(a) * 0.1, cy, 0.3, Math.cos(a) * v, Math.sin(a) * v * 0.5, 0.5 + Math.random(), 0.3 + Math.random() * 0.2, k % 2 ? '#ffe9a8' : '#ffffff', 0.03, 3); }   // sparks off the teeth
        sparkRun(sp, T);
      });
    },
    oilslick(it, T, px, py, s) {   // a black pool with a sheen that moves
      const cx = px + s / 2, cy = py + s / 2, B = OIL_BLOBS;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; B.forEach(q => { ctx.beginPath(); ctx.arc(cx + (q[0] + 0.025) * s, cy + (q[1] + 0.025) * s, q[2] * s, 0, Math.PI * 2); ctx.fill(); });   // 1.27.5: the pool's thick edge (it stands a little off the floor)
      ctx.fillStyle = '#140d08'; B.forEach(q => { ctx.beginPath(); ctx.arc(cx + q[0] * s, cy + q[1] * s, q[2] * s, 0, Math.PI * 2); ctx.fill(); });
      const t = realNow * 0.6 + it.x;
      [['rgba(160,140,232,0.45)', 0], ['rgba(156,194,126,0.35)', 2.1], ['rgba(240,216,144,0.4)', 4.2]].forEach(([c, o]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx + Math.cos(t + o) * s * 0.14, cy + Math.sin(t + o) * s * 0.1, s * 0.12, s * 0.04, t + o, 0, Math.PI * 2); ctx.fill(); });
      if (it.anim > 0) { ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.fill(); }
    },
    flood(it, T, px, py, s) {   // a grate full of water; it spreads in rings when it floods the room
      const cx = px + s / 2, cy = py + s / 2;
      ctx.fillStyle = '#1d2633'; ctx.fillRect(px + s * 0.22, py + s * 0.22, s * 0.56, s * 0.56);
      ctx.fillStyle = 'rgba(111,154,168,0.8)'; ctx.fillRect(px + s * 0.26, py + s * 0.26, s * 0.48, s * 0.48);
      ctx.fillStyle = '#50555e'; for (let k = 0; k < 4; k++) ctx.fillRect(px + s * (0.28 + k * 0.13), py + s * 0.24, s * 0.04, s * 0.52);
      trapOnFloor(it, () => grateRim(it, 0.22, 0.56));   // 1.27.5: a raised iron rim round the grate
      const n = it.anim > 0 ? 3 : 1;
      for (let k = 0; k < n; k++) { const u = (realNow * (it.anim > 0 ? 1.2 : 0.4) + k / n + it.x * 0.1) % 1; ctx.strokeStyle = 'rgba(169,212,218,' + (0.6 * (1 - u)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); ctx.arc(cx, cy, s * (0.2 + u * (it.anim > 0 ? 1.2 : 0.3)), 0, Math.PI * 2); ctx.stroke(); }
    },
    miasma(it, T, px, py, s) {   // a grate breathing a green cloud (a big one over 3x3 while it works)
      const cx = px + s / 2, cy = py + s / 2;
      ctx.fillStyle = '#16171c'; ctx.fillRect(px + s * 0.24, py + s * 0.24, s * 0.52, s * 0.52);
      ctx.fillStyle = '#50555e'; for (let k = 0; k < 4; k++) ctx.fillRect(px + s * 0.24, py + s * (0.27 + k * 0.13), s * 0.52, s * 0.035);
      trapOnFloor(it, () => grateRim(it, 0.24, 0.52));   // 1.27.5: a raised iron rim round the grate
      const big = it.anim > 0, R = big ? s * 1.3 : s * 0.42, t = realNow * 0.8 + it.x;
      for (let k = 0; k < (big ? 7 : 3); k++) { const a = t + k * 2.4, rr0 = R * (0.25 + 0.5 * ((k * 0.37) % 1)); ctx.fillStyle = k % 2 ? 'rgba(124,190,90,0.22)' : 'rgba(156,194,126,0.26)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr0 * 0.6, cy + Math.sin(a) * rr0 * 0.6, R * (0.35 + 0.1 * Math.sin(t + k)), 0, Math.PI * 2); ctx.fill(); }
    },
    bait(it, T) {   // 1.27.5: a plate with real thickness and a little heap of coins on it, dull iron jaws lying round it (the heroes see only the loot); they spring up shut when someone grabs it
      const cx = it.x + 0.5, cy = it.y + 0.5, shut = it.anim > 0, R = 0.36, sp = sparkSet(it, shut), phi = shut ? 1.4 : 0.03;
      trapOnFloor(it, () => {
        const cols = shut ? ['#5e5a68', '#a9acba', '#c9cdd8', '#8a8496'] : ['#3c3a44', '#5a5864', '#7a7a88', '#5a5a68'];
        groundShadow(cx + 0.03, cy + 0.03, 0.42, 0.38, 0.3);
        jaw3D(cx, cy, R, phi, -1, cols, T, 5);
        pCyl(cx, cy, 0.25, 0.05, '#2e2c36', '#4a4856');
        BAIT_COINS.forEach(q => pCyl(cx + q[0], cy + q[1], 0.065, 0.022, '#c99a3a', q[3] ? '#f0cc6c' : '#e8c060', 0.05 + q[2]));
        jaw3D(cx, cy, R, phi, 1, cols, T, 5);
        if (!shut && detT(T) >= 14 && (realNow * 0.7 + it.x) % 3 < 0.25) { const p = W2S(cx + 0.03, cy - 0.06, 0.13); ctx.fillStyle = '#fff6d0'; ctx.fillRect(p[0] - 1, p[1] - T * 0.04, 2, T * 0.08); ctx.fillRect(p[0] - T * 0.04, p[1] - 1, T * 0.08, 2); }   // a glint on the coins
        if (sp.edge) for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 0.7; sparkAdd(sp, cx + Math.cos(a) * 0.2, cy, 0.25, Math.cos(a) * v, Math.sin(a) * v * 0.5, 0.5 + Math.random(), 0.3 + Math.random() * 0.2, k % 2 ? '#ffe9a8' : '#f2b94b', 0.03, 3); }
        sparkRun(sp, T);
      });
    },
    web(it, T) {   // 1.27.5: a web strung low between four iron pins, sagging in the middle, its shadow on the floor under it; it shakes when it catches
      const cx = it.x + 0.5, cy = it.y + 0.5, hot = it.anim > 0, sh = hot && !reduceMotion ? Math.sin(realNow * 30) * 0.012 : 0;
      trapOnFloor(it, () => {
        const pin = [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]], H = 0.15;
        const at = (a, r) => { const f = r / 0.5, z = 0.03 + (H - 0.03) * f * f; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, z + sh * (1 - f)]; };
        // radials and two rings; zk = 0 lays it on the floor (its shadow); part: 1 the anchor threads to the pins, 2 the rest, 3 both; ox, oy: a shift in px
        const web = (zk, col, lw, part, ox, oy) => {
          part = part || 3; ox = ox || 0; oy = oy || 0; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
          const pt = (a, r) => { const q = at(a, r), w = W2S(q[0] + (1 - zk) * q[2] * 0.5, q[1] + (1 - zk) * q[2] * 0.7, q[2] * zk); w[0] += ox; w[1] += oy; return w; };
          for (let k = 0; k < 8; k++) { if (!(part & (k % 2 ? 2 : 1))) continue; const a = k * Math.PI / 4 + Math.PI / 4, p = pt(a, 0), q = pt(a, k % 2 ? 0.38 : 0.5); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
          if (part & 2) [0.13, 0.26].forEach(r => { for (let k = 0; k <= 8; k++) { const q = pt(k * Math.PI / 4 + Math.PI / 4, k % 2 ? r * 0.95 : r * 1.25); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } });
          ctx.stroke();
        };
        // 1.27.5: round threads: a dark underside, the silk, a bright upper edge; the anchor threads to the pins thicker
        const lw = Math.max(1, T * 0.02), silk = (part, w) => { ctx.lineCap = 'round'; web(1, 'rgba(70,72,92,0.9)', w * 1.7, part, w * 0.25, w * 0.35); web(1, hot ? '#ffffff' : '#c9cfe2', w, part); if (w > 1.3) web(1, 'rgba(255,255,255,0.95)', w * 0.38, part, -w * 0.18, -w * 0.25); ctx.lineCap = 'butt'; };
        web(0, 'rgba(0,0,0,0.3)', lw * 1.3);
        pin.slice(0, 2).forEach(q => pCyl(cx + q[0], cy + q[1], 0.028, H + 0.04, '#4a4652', '#77727f'));
        silk(2, lw); silk(1, lw * 1.4);
        const c = W2S(cx, cy, 0.03 + sh); ctx.fillStyle = 'rgba(240,244,255,0.9)'; ctx.beginPath(); ctx.ellipse(c[0], c[1], T * 0.035, T * 0.025, 0, 0, Math.PI * 2); ctx.fill();   // the knot of silk in the middle
        pin.slice(2).forEach(q => pCyl(cx + q[0], cy + q[1], 0.028, H + 0.04, '#4a4652', '#77727f'));
      });
    },
    trapdoor(it, T) {   // 1.27.5: two oak leaves in a raised frame; open, they hang down into a pit with walls you can see
      const x0 = it.x + 0.12, y0 = it.y + 0.12, w = 0.76, open = it.anim > 0;
      trapOnFloor(it, () => {
        const P = (u, v, z) => W2S(x0 + u * w, y0 + v * w, z);
        if (open) {
          ctx.save(); poly([P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)], '#050308'); ctx.clip();
          const D = -0.7;
          poly([P(0, 0, 0), P(1, 0, 0), P(1, 0, D), P(0, 0, D)], '#2a2026');   // the far walls of the pit, the north one lit
          poly([P(0, 0, 0), P(0, 1, 0), P(0, 1, D), P(0, 0, D)], '#1a1418');
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = Math.max(1, T * 0.02); ctx.beginPath(); [-0.18, -0.36].forEach(z => { const a = P(0, 1, z), b = P(0, 0, z), c = P(1, 0, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); }); ctx.stroke();   // courses of stone
          poly([P(0, 0, 0), P(0, 1, 0), P(0.06, 1, -0.48), P(0.06, 0, -0.48)], '#4a3626');   // the leaves hang from their hinges
          poly([P(1, 0, 0), P(1, 1, 0), P(0.94, 1, -0.48), P(0.94, 0, -0.48)], '#2e2016');
          ctx.restore();
        } else {
          isoBox(x0 + w / 4, y0 + w / 2, w / 2 - 0.01, w, 0.025, '#4a3828', '#3a2c20', '#2e2218');
          isoBox(x0 + w * 3 / 4, y0 + w / 2, w / 2 - 0.01, w, 0.025, '#4a3828', '#3a2c20', '#2e2218');
          ctx.strokeStyle = 'rgba(20,14,8,0.6)'; ctx.lineWidth = Math.max(1, T * 0.015); ctx.beginPath(); [0.25, 0.75].forEach(u => { const a = P(u, 0.02, 0.025), b = P(u, 0.98, 0.025); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }); ctx.stroke();   // the planks
          if (detT(T) >= 24) [[0.04, 0.2], [0.04, 0.8], [0.96, 0.2], [0.96, 0.8]].forEach(q => isoBox(x0 + q[0] * w, y0 + q[1] * w, 0.07, 0.05, 0.015, '#9a96a6', '#77727f', '#55505e', 0.025));   // the hinges
          if (detT(T) >= 24) [0.47, 0.53].forEach(u => isoBox(x0 + u * w, y0 + w / 2, 0.025, 0.08, 0.02, '#9a96a6', '#77727f', '#55505e', 0.025));   // the iron pulls
        }
        const e = 0.05, h = 0.04, c = ['#5a4a3a', '#46382a', '#33281e'];   // the frame, far bars first
        isoBox(x0 + w / 2, y0 - e / 2, w + e * 2, e, h, c[0], c[1], c[2]); isoBox(x0 - e / 2, y0 + w / 2, e, w, h, c[0], c[1], c[2]);
        isoBox(x0 + w + e / 2, y0 + w / 2, e, w, h, c[0], c[1], c[2]); isoBox(x0 + w / 2, y0 + w + e / 2, w + e * 2, e, h, c[0], c[1], c[2]);
      });
    },
    cage(it, T) {   // 1.27.5: set and waiting: the cage's iron foot ring sunk in the floor, the stubs of its bars just showing
      const x0 = it.x + 0.12, y0 = it.y + 0.12, w = 0.76;
      trapOnFloor(it, () => {
        const e = 0.045, h = 0.035, c = ['#8e8a9a', '#6c6878', '#4e4a58'];
        const stubs = (far) => { for (let k = 0; k <= 4; k++) { const u = k / 4; (far ? [[x0 + w * u, y0], [x0, y0 + w * u]] : [[x0 + w * u, y0 + w], [x0 + w, y0 + w * u]]).forEach(q => pCyl(q[0], q[1], 0.018, 0.08, '#77727f', '#b9bccb', h)); } };
        isoBox(x0 + w / 2, y0, w + e, e, h, c[0], c[1], c[2]); isoBox(x0, y0 + w / 2, e, w + e, h, c[0], c[1], c[2]);
        if (detT(T) >= 24) stubs(true);   // (the stubs only close up)
        isoBox(x0 + w, y0 + w / 2, e, w + e, h, c[0], c[1], c[2]); isoBox(x0 + w / 2, y0 + w, w + e, e, h, c[0], c[1], c[2]);
        if (detT(T) >= 24) stubs(false);
      });
    }
  };
  // 1.27.5: a building smashed by a barbarian: a heap of broken stone blocks (rubble for the rest of the wave)
  const RUBBLE = [[-0.22, -0.12, 0.13, 0.11, 0], [0.12, -0.2, 0.11, 0.09, 0], [0.02, 0.0, 0.16, 0.1, 0], [-0.18, 0.16, 0.1, 0.08, 0], [0.2, 0.08, 0.12, 0.09, 0], [-0.04, -0.06, 0.1, 0.07, 0.1], [0.08, 0.22, 0.08, 0.06, 0]];
  function rubble3D(it, T) {
    const cx = it.x + 0.5, cy = it.y + 0.5;
    trapOnFloor(it, () => { groundShadow(cx + 0.03, cy + 0.04, 0.4, 0.34, 0.35); RUBBLE.forEach(q => isoBox(cx + q[0], cy + q[1], q[2], q[2] * 0.85, q[3], '#5a5664', '#46424f', '#34303c', q[4])); });
  }
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
  // 1.27.5: the same two as solid bodies (WALL_3D, p7_draw.js), on a standing face or lying on a cut wall's lip (lipKit)
  Object.assign(WALL_3D, {
    pendulum(K, it, hot, T) {   // an iron bracket and a timber beam standing out of the top of the face; the rod and a thick blade hang from its end out in the room and swing along the wall
      const a = hot ? Math.sin(realNow * 9) * 0.9 : Math.sin(realNow * 1.4 + it.x) * 0.12, L = 0.7, pv = -0.1, D = 0.42, bx = 0.5 + Math.sin(a) * L, by = pv + Math.cos(a) * L;
      const sp = sparkSet(it, hot), wood = ['#7a5530', '#5e4024', '#46301a'], iron = K.k < 1 ? ['#5a5a66', '#3a3a44', '#2e2e36'] : ['#64646f', '#4a4a56', '#34343e'];
      const blade = () => { ctx.save(); ctx.translate(bx, by); ctx.rotate(-a); ctx.moveTo(-0.32, -0.04); ctx.quadraticCurveTo(0, 0.3, 0.32, -0.04); ctx.lineTo(0.22, -0.07); ctx.quadraticCurveTo(0, 0.1, -0.22, -0.07); ctx.closePath(); ctx.restore(); };
      K.shadow(blade, 0.2, 2.6);   // far out in the room: a faint shadow well off on the face
      K.box(0.38, 0.62, -0.2, 0.06, 0, 0.03, iron);   // the bracket
      K.box(0.44, 0.56, -0.17, -0.06, 0.03, D + 0.05, wood);   // the beam
      K.box(0.43, 0.57, -0.18, -0.04, D - 0.04, D + 0.06, iron);   // the iron head with the pivot
      K.plane(D - 0.025); ctx.fillStyle = '#5c616c'; ctx.beginPath(); blade(); ctx.fill();   // the blade's back (its thickness)
      K.plane(D); ctx.strokeStyle = '#767b84'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(0.5, pv); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,235,245,0.35)'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.moveTo(0.49, pv); ctx.lineTo(bx - 0.01, by); ctx.stroke();
      if (hot) { ctx.strokeStyle = 'rgba(230,225,214,0.35)'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(0.5, pv, L + 0.12, Math.PI / 2 - 0.9, Math.PI / 2 + 0.9); ctx.stroke(); }
      K.plane(D + 0.025);
      ctx.fillStyle = K.k < 1 ? '#9aa0ae' : '#c5ccd8'; ctx.beginPath(); blade(); ctx.fill();
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-a);
      ctx.fillStyle = '#e6e1d6'; ctx.beginPath(); ctx.moveTo(-0.3, -0.01); ctx.quadraticCurveTo(0, 0.29, 0.3, -0.01); ctx.quadraticCurveTo(0, 0.22, -0.3, -0.01); ctx.fill();   // the edge
      ctx.fillStyle = '#4a4a56'; ctx.fillRect(-0.045, -0.1, 0.09, 0.07);   // the hub
      ctx.restore();
      screenT();
      if (sp.edge || (hot && Math.random() < 0.3)) { const tu = bx + Math.sin(a) * 0.25, tv = by + Math.cos(a) * 0.25; sparkBurst(sp, K, tu, tv, D + 0.03, sp.edge ? 4 : 1, Math.random() < 0.5 ? '#ffe9a8' : '#ffffff', 1.1, 0.35, 0.03, 3); }   // sparks off the edge
      sparkRun(sp, T);
    },
    bolt(K, it, hot, T) {   // a stone stele standing out of the face under a capstone, the storm rune glowing in its sunk panel; lightning leaps from it into the room when it fires
      const st = K.k < 1 ? ['#4a4c56', '#2f3036', '#2a2b31'] : ['#575964', '#3e4048', '#2c2d33'], cap = K.k < 1 ? ['#5c5e68', '#3c3e46', '#30323a'] : ['#686a76', '#4a4c55', '#34363d'];
      const sp = sparkSet(it, hot), pulse = hot ? 1 : 0.55 + 0.35 * Math.sin(realNow * 3 + it.x);
      K.shadow(() => ctx.rect(0.26, 0.1, 0.48, 0.68));
      K.box(0.28, 0.72, 0.17, 0.78, 0, 0.1, st);
      K.box(0.25, 0.75, 0.1, 0.18, 0, 0.13, cap);
      K.recess(0.1, 0.035, () => ctx.rect(0.33, 0.24, 0.34, 0.48), '#202126', () => {
        ctx.fillStyle = K.k < 1 ? '#3e4048' : '#4c4e58'; ctx.fillRect(0.33, 0.24, 0.34, 0.48);
        ctx.globalAlpha *= pulse; ctx.drawImage(glowSprite('rune3d', [[0, 'rgba(140,200,255,0.6)'], [1, 'rgba(140,200,255,0)']]), 0.25, 0.2, 0.5, 0.5); ctx.globalAlpha /= pulse;
        ctx.strokeStyle = 'rgba(140,200,255,' + pulse.toFixed(2) + ')'; ctx.lineWidth = 0.055; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(0.55, 0.28); ctx.lineTo(0.44, 0.47); ctx.lineTo(0.56, 0.47); ctx.lineTo(0.45, 0.68); ctx.stroke();
        ctx.strokeStyle = 'rgba(230,244,255,' + (pulse * 0.7).toFixed(2) + ')'; ctx.lineWidth = 0.018; ctx.stroke(); ctx.lineJoin = 'miter';
      });
      screenT();
      if (hot) {   // two jagged bolts from the rune down to the floor in front of it
        const vf = K.z1 / Math.max(0.01, K.z1 - K.z0);
        for (let b = 0; b < 2; b++) {
          const eu = 0.5 + (Math.random() - 0.5) * 0.9, ed = 0.55 + Math.random() * 0.35;
          ctx.beginPath(); for (let j = 0; j <= 5; j++) { const t = j / 5, p = K.P(0.5 + (eu - 0.5) * t + (j && j < 5 ? (Math.random() - 0.5) * 0.18 : 0), 0.46 + (vf - 0.46) * t * t, 0.11 + (ed - 0.11) * t); if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
          ctx.strokeStyle = 'rgba(140,200,255,0.45)'; ctx.lineWidth = Math.max(2, T * 0.07); ctx.stroke(); ctx.strokeStyle = '#e6f4ff'; ctx.lineWidth = Math.max(1, T * 0.025); ctx.stroke();
        }
      }
      if (sp.edge) sparkBurst(sp, K, 0.5, 0.46, 0.12, 6, '#bfe3ff', 0.9, 0.4, 0.03, 0.5);
      else if (Math.random() < (hot ? 0.45 : 0.012)) sparkBurst(sp, K, 0.33 + Math.random() * 0.34, 0.24 + Math.random() * 0.48, 0.11, 1, '#bfe3ff', 0.35, 0.3, 0.025, 0);   // crackle round the rune
      sparkRun(sp, T);
    }
  });
  // doors and furniture
  Object.assign(ISO_ART, {
    falsedoor(it, bx, by, T) {   // the doorway looks walled up: painted stone with a pale shimmer; it flickers when it fools someone (1.27.5: a thin false wall with a top and an edge)
      const ax = doorAlongX(it.x, it.y), H = DOOR_H * 0.95, A = ax ? [bx - 0.45, by] : [bx, by - 0.45], B = ax ? [bx + 0.45, by] : [bx, by + 0.45], sh = 0.18 + 0.12 * Math.sin(realNow * 2 + it.x);
      ctx.save(); ctx.globalAlpha *= it.anim > 0 ? 0.35 + 0.3 * Math.sin(realNow * 30) : 0.78;
      slab3D(A, B, 0.16, 0, H, '#5a5664', ax ? '#4b4755' : '#3c3946', ax ? '#36333f' : '#4b4755', () => {
        ctx.fillStyle = 'rgba(20,16,26,0.5)'; for (let r = 0; r < 4; r++) { ctx.fillRect(0, r * 0.25, 1, 0.02); for (let c = 0; c < 3; c++) ctx.fillRect(((c + (r % 2) * 0.5) / 3) % 1, r * 0.25, 0.02, 0.25); }
        ctx.fillStyle = 'rgba(255,240,255,0.07)'; for (let r = 0; r < 4; r++) ctx.fillRect(0, r * 0.25 + 0.02, 1, 0.025);   // the lit top of each course
        ctx.fillStyle = 'rgba(160,140,232,' + sh.toFixed(2) + ')'; ctx.fillRect(0, 0, 1, 1);
      });
      ctx.restore();
    },
    tar(it, bx, by, T) {   // a cauldron of tar hanging over the doorway, tipping when it pours (1.27.5: a beam, two chains, a round iron cauldron)
      const ax = doorAlongX(it.x, it.y), H = DOOR_H, pour = it.anim > 0, tip = pour ? 0.9 : 0, z0 = H - 0.36;
      if (ax) isoBox(bx, by, 1.04, 0.09, 0.09, '#4a3220', '#3a2716', '#2a1b12', H + 0.02); else isoBox(bx, by, 0.09, 1.04, 0.09, '#4a3220', '#3a2716', '#2a1b12', H + 0.02);
      const fw = W2S(bx, by + 0.06, z0 - 0.04); flame([fw[0], fw[1]], T, 1.4, false);   // the fire under it
      const lx = ax ? 0 : 1, ly = ax ? 1 : 0, m = lathe3D(bx, by, [[z0, 0.07], [z0 + 0.06, 0.15], [z0 + 0.16, 0.19], [z0 + 0.27, 0.17]], '#4a4a56', '#16100a', '#9a9aa8', tip, lx, ly);
      ctx.fillStyle = 'rgba(255,220,170,0.22)'; ctx.beginPath(); ctx.ellipse(m[0] - m[2] * 0.3, m[1] - m[2] * SP * 0.2, m[2] * 0.35, m[2] * SP * 0.25, 0, 0, Math.PI * 2); ctx.fill();   // a gleam on the tar
      [-1, 1].forEach(sd => rod3D([bx + (ax ? sd * 0.17 : tip * 0.25), by + (ax ? tip * 0.25 : sd * 0.17), z0 + 0.27], [bx + (ax ? sd * 0.08 : 0), by + (ax ? 0 : sd * 0.08), H + 0.02], 0.022, '#3a3a44', '#8a8a96'));
      if (pour) { const sx = bx + lx * 0.3, sy = by + ly * 0.3; rod3D([sx, sy, z0 + 0.2], [sx, sy, 0.01], 0.07, '#0e0b08', 'rgba(120,100,80,0.5)'); const f = W2S(sx, sy, 0); ctx.fillStyle = '#0e0b08'; ctx.beginPath(); ctx.ellipse(f[0], f[1], T * 0.22, T * 0.22 * SP, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(160,140,232,0.25)'; ctx.beginPath(); ctx.ellipse(f[0] - T * 0.05, f[1] - T * 0.02, T * 0.08, T * 0.03, 0, 0, Math.PI * 2); ctx.fill(); }
    },
    bell(it, bx, by, T) {   // a funeral bell: on the furniture if it stands on one, else in its own black frame (1.27.5: square posts and beam, a round bronze bell)
      const o = fl.objects.get(key(it.x, it.y)), z = o ? objTopZ(o) : 0, sw = it.anim > 0 ? Math.sin(realNow * 14) * 0.35 : Math.sin(realNow * 0.8 + it.x) * 0.04, wd = ['#4a3220', '#3a2716', '#2a1b12'];
      if (!o) { groundShadow(bx, by, 0.32, 0.22, 0.35); isoBox(bx - 0.3, by, 0.07, 0.07, 0.95, wd[0], wd[1], wd[2]); }
      const top = W2S(bx, by, o ? z + 0.45 : 0.9), s = T * (o ? 0.2 : 0.26);
      if (o) { isoBox(bx, by, 0.05, 0.05, 0.47, wd[0], wd[1], wd[2], z); isoBox(bx, by, 0.2, 0.05, 0.04, wd[0], wd[1], wd[2], z + 0.45); }
      ctx.save(); ctx.translate(top[0], top[1]); ctx.rotate(sw);
      ctx.fillStyle = '#3a2716'; ctx.fillRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.16);   // the crown it hangs by
      ctx.beginPath(); ctx.moveTo(-s * 0.35, s * 0.02); ctx.bezierCurveTo(-s * 0.35, -s * 0.12, s * 0.35, -s * 0.12, s * 0.35, s * 0.02); ctx.quadraticCurveTo(s * 0.5, s * 0.7, s * 0.75, s * 1.0); ctx.lineTo(-s * 0.75, s * 1.0); ctx.quadraticCurveTo(-s * 0.5, s * 0.7, -s * 0.35, s * 0.02); ctx.closePath();
      const g = ctx.createLinearGradient(-s * 0.75, 0, s * 0.75, 0); g.addColorStop(0, '#c08a44'); g.addColorStop(0.3, '#e0b060'); g.addColorStop(0.55, '#9a6a2e'); g.addColorStop(1, '#4e3214');
      ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = '#1a1008'; ctx.beginPath(); ctx.ellipse(0, s * 1.0, s * 0.75, s * 0.2, 0, 0, Math.PI); ctx.fill();   // the dark inside of its mouth
      ctx.fillStyle = '#c4a052'; ctx.beginPath(); ctx.ellipse(0, s * 1.0, s * 0.75, s * 0.2, 0, Math.PI, Math.PI * 2); ctx.ellipse(0, s * 1.0, s * 0.62, s * 0.13, 0, Math.PI * 2, Math.PI, true); ctx.fill();   // its thick lip
      ctx.strokeStyle = 'rgba(80,50,20,0.6)'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.beginPath(); ctx.ellipse(0, s * 0.72, s * 0.58, s * 0.13, 0, 0, Math.PI); ctx.stroke();   // a band
      ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.arc(s * 0.1, s * 1.12, s * 0.11, 0, Math.PI * 2); ctx.fill();   // the clapper
      ctx.restore();
      if (!o) { isoBox(bx + 0.3, by, 0.07, 0.07, 0.95, wd[0], wd[1], wd[2]); isoBox(bx, by, 0.8, 0.09, 0.08, wd[0], wd[1], wd[2], 0.95); }
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
    // 1.27.4 (author: the shop cards are upright, the picture has to be too): an upright version, 50 x 70, painted by the same
    // code with the wall line DY lower and everything centred on CW / 2 (ART.cardTall)
    let CW = 72, CH = 48, DY = 0;
    // backgrounds
    const BG = {
      power(P) { bricks(P, 0, 0, CW, 22 + DY); flagsH(P, 22 + DY); },
      named(P) { bricks(P, 0, 0, CW, 22 + DY); flagsH(P, 22 + DY); },
      fear(P) { P.vgrad(0, 0, CW, CH, '#2c2048', '#0c0912'); P.oval(12, 9, 6, 6, 'rgba(230,225,214,0.55)').oval(14, 8, 5, 5, '#1a1428'); for (let k = 0; k < 5; k++) P.oval(10 + k * 14, 38 + DY + (k % 2) * 4, 16, 2.6, 'rgba(160,140,232,0.18)'); flagsH(P, 34 + DY, [C.vi0, C.st0, C.vi0, C.void]); },
      hero(P) { bricks(P, 0, 0, CW, 24 + DY, { cols: [C.cold0, C.cold1, C.cold0, C.st0] }); flagsH(P, 24 + DY, [C.cold0, C.st0, C.cold0, C.ink]); },
      ess(P) { P.vgrad(0, 0, CW, CH, '#2a0810', '#09090b'); for (let k = 0; k < 6; k++) P.path([k * 13, 0, k * 13 + 5, CH * 0.25, k * 13 - 2, CH * 0.54, k * 13 + 4, CH], 'rgba(140,26,36,0.55)', 1.2); P.glow(CW / 2, 26 + DY, 26, '#cc3640', 0.35); },
      greed(P) { P.vgrad(0, 0, CW, CH, '#2a2010', '#0b0a08'); P.glow(CW / 2, 30 + DY, 28, '#f0d890', 0.25); for (let k = 0; k < 7; k++) coin(P, 6 + k * 11, 43 + DY + (k % 2) * 2, C.wd2); },
      shop(P) { P.rect(0, 0, CW, CH, C.wd0); for (let y = 0; y < 30 + DY; y += 6) P.rect(0, y, CW, 1, C.void); for (let r = 0; r <= (DY ? 1 : 0); r++) for (let k = 0; k < 6; k++) P.rect(4 + k * 12, 6 + r * 14, 6, 7, [C.bl1, C.cold1, C.gr0, C.vi1, C.wd2, C.gold][(k + r * 3) % 6]).rect(4 + k * 12, 5 + r * 14, 6, 1, C.st3); P.rect(0, 30 + DY, CW, CH - 30 - DY, C.wd1).rect(0, 30 + DY, CW, 2, C.wd2); P.glow(CW - 12, 4, 16, '#ffb060', 0.35); },
      heart(P) { P.vgrad(0, 0, CW, CH, '#460a10', '#140508'); for (let k = 0; k < 5; k++) P.path([k * 17 + 4, 0, k * 17 + 9, CH * 0.3, k * 17 + 2, CH * 0.62, k * 17 + 8, CH], 'rgba(196,160,82,0.45)', 1); P.glow(CW / 2, 24 + DY, 26, '#ff4f5e', 0.35); },
      unlock(P) { const x0 = CW / 2 - 20; P.rect(0, 0, CW, CH, C.ink); P.rect(x0, 4 + DY, 40, 40, C.st1).oval(x0 + 20, 4 + DY, 20, 12, C.st1); P.rect(x0 + 3, 7 + DY, 34, 37, C.vi0).oval(x0 + 20, 7 + DY, 17, 10, C.vi0); P.glow(x0 + 20, 26 + DY, 22, '#a08ce8', 0.45); for (let k = 0; k < 10; k++) P.px(x0 + 4 + ((k * 13) % 32), 8 + DY + ((k * 7) % 30), C.vi2); flagsH(P, 42 + DY); },
      instant(P) { P.vgrad(0, 0, CW, CH, '#1d2633', '#09090b'); for (let k = 0; k < 14 + (DY ? 6 : 0); k++) P.px((k * 29) % CW, (k * 17) % (40 + DY), k % 2 ? C.goldHi : C.ice); }
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
      goldendream: 'loot|moon|greed', croesus: '@crown|coin|greed',
      heartguide: '@pulse|up|heart', heartdread: '@skull|up|heart', heartgreed: '@crown|coin|heart', heartpatience: '@hourglass|time|heart', heartgrowth: '@heartAltar|plus|heart', heartcore: '@heartEcho|x2|heart', secondheart: '@crystal|loop|heart', resonance: '@book|chain|heart'
    };
    const HEART_IDS = new Set(['regrow', 'heartcry', 'heavycrystal', 'heartroom', 'warden', 'darkforge', 'darklore', 'heartmem', 'tithe', 'stoneheart', 'bloodcredit', 'bloodflow', 'kingsfeast', 'lastbreath', 'heartpulse', 'heartguide', 'heartdread', 'heartgreed', 'heartpatience', 'heartgrowth', 'secondheart']);   // 1.27.5 (brief C): Serce lochu, Rezonans, Głodomór left the group (ordinary legends now)
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
    function paintCard(id, tall) {
      const s = spec(id); if (!s) return null;
      const keep = [CW, CH, DY]; if (tall) { CW = 50; CH = 70; DY = 20; }
      try {
        const P = pic(CW, CH, hash('card' + id + (tall ? 'T' : ''))), posts = [], cx = CW / 2 - 2;
        P.after = fn => { const m = P.g.getTransform(); posts.push(() => { P.g.save(); P.g.setTransform(m); fn(); P.g.restore(); }); return P; };
        (BG[s.g] || BG.power)(P);
        const draw = (m, x, y, k) => {
          const em = m[0] === '@', f = em ? E[m.slice(1)] : EL[m], st = !em && STAGE[m];
          if (!f) return;
          const ay = st === 'wall' ? y - 18 : st === 'door' ? y - 2 : y;
          if (tall && !em && ART.ROOMS[m]) { P.g.save(); P.g.translate(CW / 2 - 36, DY); ART.ROOMS[m](P); P.g.restore(); return; }   // a room scene is drawn for 72 x 48: centred
          if (k !== 1) { P.g.save(); P.g.translate(x, ay); P.g.scale(k, k); P.g.translate(-x, -ay); }
          if (!em && ART.ROOMS[m]) ART.ROOMS[m](P); else f(P, x, ay);
          if (k !== 1) P.g.restore();
        };
        // upright: the motif stands higher and bigger (the name band covers the card's foot)
        if (s.m.length > 1) { if (tall) { draw(s.m[0], 15, 44, 0.85); draw(s.m[1], 35, 47, 0.85); } else { draw(s.m[0], 24, 42, 0.95); draw(s.m[1], 50, 43, 0.95); } }
        else draw(s.m[0], cx, tall ? 47 : 43, ((ART.CARD_K && ART.CARD_K[s.m[0]]) || 1.15) * (tall ? 1.2 : 1));
        P.light(20, 8, 70, s.g === 'fear' || s.g === 'hero' ? 0.05 : 0.12);
        posts.forEach(f => f());
        quantize(P.c);
        if (s.b) badge(P, s.b, CW - 9, 8);
        return P.c;
      } finally { [CW, CH, DY] = keep; }
    }
    ART.CARD_K = { spikes: 1.5, trapdoor: 1.35, coffin: 1.3, bones: 1.4, loot: 1.6, lpotion: 1.4, loot2: 1.45, loot3: 1.35, lcursed: 1.45, web: 1.35, snare: 1.4, bait: 1.5, oilslick: 1.3, '@coins': 1.5, '@chest': 1.4, mimic: 1.25, powder: 1.2, cage: 1.3, eyes: 1.4 };
    ART.card = id => ART.url('card:' + id, () => paintCard(id));
    ART.cardTall = id => ART.url('cardT:' + id, () => paintCard(id, true));   // 1.27.4: the upright card of the shop
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
    archer(px, b) { px(11, 14 + b, '#e8e0c8'); px(10, 8 + b, '#7a6040'); px(14, 10 + b, '#ffffff'); },   // 1.27.6: a goblin archer (a tooth, the hood's seam, a glint on the bow)
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
    if (detT(T) < 16) return;   // 1.28.0: detT
    ctx.strokeStyle = 'rgba(40,24,10,0.45)'; ctx.lineWidth = Math.max(1, T * 0.015); ctx.beginPath();
    [-0.6, -0.2, 0.2, 0.6].forEach(u => { ctx.moveTo(b[0] + rx * u, t[1] + ry * Math.sqrt(1 - u * u)); ctx.lineTo(b[0] + rx * u, b[1] + ry * Math.sqrt(1 - u * u)); });
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,170,0.22)'; ctx.lineWidth = Math.max(1, T * 0.02); ctx.beginPath(); ctx.ellipse(b[0], b[1] - (b[1] - t[1]) * 0.29, rx, ry, 0, Math.PI * 0.55, Math.PI * 0.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,24,10,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t[0] - rx * 0.9, t[1] - ry * 0.25); ctx.lineTo(t[0] + rx * 0.9, t[1] - ry * 0.25); ctx.moveTo(t[0] - rx * 0.9, t[1] + ry * 0.3); ctx.lineTo(t[0] + rx * 0.9, t[1] + ry * 0.3); ctx.stroke();
  }
  function artCrateDetail(cx, cy, T) {
    if (detT(T) < 16) return;   // 1.28.0: detT
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
  const BRK = { m: null, n: -1, t: null, l: [] };   // 1.27.5: the breach's doors, found once per map
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
    // 1.27.5: the caltrops, the sapper's bomb and the breach's broken stone are solid, drawn in screen space (still under what stands)
    if (BRK.m !== fl.doors || BRK.n !== fl.doors.size || BRK.t !== fl.tiles) { BRK.m = fl.doors; BRK.n = fl.doors.size; BRK.t = fl.tiles; BRK.l = [...fl.doors.values()].filter(d => d.breach); }   // (made with the map)
    const brk = BRK.l.length ? BRK.l : null;
    if ((fl.caltrops && fl.caltrops.length) || brk) {
      ctx.save(); screenT(); noRelief();
      if (brk) brk.forEach(d => { const cx = d.x + 0.5, cy = d.y + 0.5; RUBBLE.forEach((q, k) => { if (k % 2) isoBox(cx + q[0] * 1.2, cy + q[1] * 1.2, q[2] * 0.8, q[2] * 0.7, q[3] * 0.8, '#6a5a5e', '#4e3e42', '#3a2c30', q[4] * 0.6); }); });
      if (fl.caltrops) fl.caltrops.forEach(c => {
        if (c.bomb) {   // a round iron bomb, a cap, a fuse that sparks
          const cx = c.x + 0.5, cy = c.y + 0.5; groundShadow(cx + 0.03, cy + 0.03, 0.2, 0.18, 0.4);
          pBall(cx, cy, 0, 0.16, '#2a2a32', 'rgba(0,0,0,0.4)');
          pCyl(cx + 0.05, cy - 0.05, 0.045, 0.05, '#3a3a44', '#55555f', 0.26);
          const a = W2S(cx + 0.05, cy - 0.05, 0.31), b = W2S(cx + 0.12, cy - 0.1, 0.42); line2(a, b, '#b08a5a', Math.max(1, T * 0.03));
          ctx.fillStyle = Math.sin(t * 16) > 0 ? '#ffd27a' : '#ff7a3c'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(1.2, T * 0.04), 0, Math.PI * 2); ctx.fill();
          return;
        }
        for (let k = 0; k < 3; k++) {   // three caltrops: three iron legs on the floor and one pointing up
          const cx = c.x + 0.25 + 0.5 * kH(c.x * 3 + k, c.y, 21), cy = c.y + 0.25 + 0.5 * kH(c.x, c.y * 3 + k, 22), r = 0.09, a0 = kH(c.x + k, c.y, 23) * 6.28, m = [cx, cy, 0.035];
          groundShadow(cx + 0.02, cy + 0.02, 0.09, 0.08, 0.35);
          for (let j = 0; j < 3; j++) { const a = a0 + j * 2.094; rod3D(m, [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.005], 0.026, '#6c6878', '#c9c6d4'); }
          rod3D(m, [cx, cy, 0.12], 0.026, '#7a7686', '#d8d5e2');
        }
      });
      ctx.restore();
    }
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
      },   // (1.27.5: variant 1's shelf of flasks is solid: solid)
      solidV: 1, solid(K, v, h, T) { if (v !== 1) return; K.box(0.2, 0.8, 0.55, 0.59, 0, 0.12, ['#4a3828', '#2a201a', '#1e1712']); [[0.3, '#7fe05a'], [0.45, '#8cc8ff'], [0.62, '#c78be3']].forEach(([x, c]) => { const [wx, wy] = K.W(x, 0.06); pFlask(wx, wy, K.Z(0.55), 0.05, c); }); },   // 1.27.5: a shelf with round flasks
      topTex(g) { g.fillStyle = '#46524e'; g.fillRect(0, 0, 1, 1); g.fillStyle = 'rgba(120,200,110,0.15)'; g.beginPath(); g.ellipse(0.4, 0.6, 0.2, 0.12, 0, 0, 7); g.fill(); } },
    graveyard: { s: '#4a4e44', e: '#363a32', top: '#52584a', lip: '#3e4238',
      tex(g, rnd, v) {
        g.fillStyle = '#464a40'; g.fillRect(0, 0, 1, WALL_H);
        courses(g, rnd, 0.34, 0.4, ['#4a4e44', '#50544a', '#42463c', '#4e5246'], 'rgba(18,20,14,0.6)', true);
        g.fillStyle = 'rgba(92,140,58,0.45)'; per(g, () => { for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(rnd(), WALL_H - rnd() * 0.5, 0.06 + rnd() * 0.06, 0.03 + rnd() * 0.03, 0, 0, 7); g.fill(); } });   // moss low on the wall
        g.strokeStyle = 'rgba(20,22,16,0.6)'; g.lineWidth = 0.014; g.beginPath(); g.moveTo(0.3, 0.1); g.lineTo(0.36, 0.5); g.lineTo(0.3, 0.8); g.stroke();
      },   // (1.27.5: variant 1's memorial plaque is solid: solid)
      solidV: 1, solid(K, v, h, T) { if (v !== 1) return; K.shadow(() => { ctx.rect(0.3, 0.45, 0.4, 0.32); ctx.fill(); }, 0.3, 0.6); K.box(0.3, 0.7, 0.45, 0.77, 0, 0.045, ['#7a7e6c', '#5e6252', '#44483a']); K.plane(0.045); ctx.fillStyle = 'rgba(20,22,16,0.6)'; ctx.fillRect(0.47, 0.5, 0.06, 0.2); ctx.fillRect(0.4, 0.56, 0.2, 0.05); ctx.fillStyle = 'rgba(220,226,200,0.25)'; ctx.fillRect(0.53, 0.5, 0.012, 0.2); ctx.fillRect(0.4, 0.61, 0.2, 0.012); } },   // 1.27.5: a stone plaque standing out, a cross cut in it
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
      const [mx, my] = roomMid(R); floorDrain(c, mx * T, my * T, T * 0.16, T, 3);   // 1.27.5: a hole with its inner sides, bars over it
    },
    graveyard(c, R, T) {   // earth and grass, a grave mound in the middle
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(74,60,36,0.3)'; c.fillRect(x, y, w, h);
      // (1.27.5: the grass stands up out of it as solid tufts now: CLUTTER_PLAN.graveyard)
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
    graveyard(R, o) { const [mx, my] = roomMid(R); o.push(['gmound', mx, my, 1, 0, 0.18]); PROP_SCATTER(R, o, 231, 0.85, 0.35, (q, e) => q < 0.45 ? ['headstone', 0.55] : q < 0.7 ? ['gcross', 0.6] : q < 0.85 ? ['deadgrass', 0.2] : ['skullpile', 0.4]); },
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
  // 1.27.5: the headstones' profiles (u across, v up; counter-clockwise): a round top, square shoulders, a broken slant
  const HS_PROF = [(() => { const o = [[0, 0], [1, 0], [1, 0.62]]; for (let k = 1; k < 8; k++) { const a = k * Math.PI / 8; o.push([0.5 + 0.5 * Math.cos(a), 0.62 + 0.38 * Math.sin(a)]); } o.push([0, 0.62]); return o; })(),
    [[0, 0], [1, 0], [1, 0.84], [0.84, 1], [0.16, 1], [0, 0.84]], [[0, 0], [1, 0], [1, 0.62], [0, 0.95]]];
  const pFlask = (x, y, z, r, col) => { pCyl(x, y, r * 0.32, r * 2.6, 'rgba(200,215,240,0.55)', 'rgba(230,240,255,0.7)', z + r * 1.2); pBall(x, y, z, r, col); };   // 1.27.5: a round glass bulb, a glass neck
  Object.assign(PROP, {
    labtable(p, T) {   // a table with flasks and a burner
      groundShadow(p.x, p.y, 0.42, 0.22, 0.38);
      isoBox(p.x, p.y, 0.7, 0.38, 0.32, '#5a3f2a', '#46301f', '#382617');
      [[-0.22, '#7fe05a'], [0.02, '#8cc8ff'], [0.22, '#c78be3']].forEach(([u, col], k) => pFlask(p.x + u, p.y - u * 0.15, 0.32, 0.06 + 0.02 * (k % 2), col));
      const g = W2S(p.x - 0.22, p.y, 0.48); ctx.drawImage(glowSprite('kflask', [[0, 'rgba(127,224,90,0.45)'], [1, 'rgba(127,224,90,0)']]), g[0] - T * 0.3, g[1] - T * 0.3, T * 0.6, T * 0.6);
    },
    gcauldron(p, T, t) {   // a cauldron of green brew bubbling over coals
      groundShadow(p.x, p.y, 0.32, 0.2, 0.38);
      pCyl(p.x, p.y, 0.24, 0.3, '#26262e', '#1a1a20', 0.04);
      const q = W2S(p.x, p.y, 0.34), rx = T * 0.21; ctx.fillStyle = '#5c8c3a'; ctx.beginPath(); ctx.ellipse(q[0], q[1], rx, rx * SP, 0, 0, Math.PI * 2); ctx.fill();
      if (!reduceMotion) for (let k = 0; k < 3; k++) { const u = (t * 0.8 + k / 3 + p.seed * 0.1) % 1, b = W2S(p.x + (k - 1) * 0.08, p.y, 0.36 + u * 0.4); ctx.fillStyle = 'rgba(156,230,120,' + (0.8 * (1 - u)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(1, T * 0.03 * (1 - u * 0.5)), 0, Math.PI * 2); ctx.fill(); }
      const f = W2S(p.x, p.y, 0.02); ctx.drawImage(glowSprite('kcoal', [[0, 'rgba(255,120,50,0.5)'], [1, 'rgba(255,120,50,0)']]), f[0] - T * 0.3, f[1] - T * 0.15, T * 0.6, T * 0.3);
    },
    flasks(p, T) { groundShadow(p.x, p.y, 0.16, 0.1, 0.3); [[-0.06, 0, '#7fe05a'], [0.07, 0.04, '#e0643c'], [0, 0.08, '#8cc8ff']].slice(0, 2 + (p.v % 2)).forEach(([u, v, col]) => pFlask(p.x + u, p.y + v, 0, 0.055 * p.s, col)); },
    headstone(p, T) {   // 1.27.5: a crooked headstone with its thickness (round, square or broken top), a carved cross, moss at its foot
      const E = p.v % 2 === 1, w = 0.36 * p.s, h = 0.44 * p.s, d = 0.085 * p.s, lu = (p.v - 1.5) * 0.04, lb = 0.02 + 0.015 * (p.v % 3);
      groundShadow(p.x + 0.04, p.y + 0.02, 0.22, 0.12, 0.38);
      const q = pSlab(p.x, p.y, w, d, h, HS_PROF[p.v % 3], E ? ['#5c6052', '#8a8e7c', '#6e7262'] : ['#767a68', '#8e9280', '#4e5246'], E, lu, lb);
      ctx.save(); onFace(q);
      ctx.fillStyle = 'rgba(30,32,24,0.75)'; ctx.fillRect(0.45, 0.2, 0.1, 0.42); ctx.fillRect(0.3, 0.3, 0.4, 0.09);   // the cross cut into it
      ctx.fillStyle = 'rgba(220,226,200,0.3)'; ctx.fillRect(0.55, 0.2, 0.025, 0.42); ctx.fillRect(0.3, 0.39, 0.4, 0.025);   // its lit lower edges
      ctx.fillStyle = 'rgba(30,32,24,0.4)'; ctx.fillRect(0.28, 0.72, 0.44, 0.03); ctx.fillRect(0.34, 0.8, 0.32, 0.03);   // worn letters
      ctx.fillStyle = 'rgba(92,140,58,0.75)'; ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, 0.86); ctx.quadraticCurveTo(0.3, 0.8, 0.5, 0.9); ctx.quadraticCurveTo(0.7, 0.84, 0.85, 0.92); ctx.lineTo(0.85, 1); ctx.fill();
      ctx.restore();
    },
    gcross(p, T) {   // 1.27.5: a wooden cross of two square beams, leaning
      groundShadow(p.x + 0.03, p.y + 0.02, 0.15, 0.09, 0.32);
      const E = p.v % 2 === 1, s = p.s, H = 0.5 * s, zb = 0.3 * s, hb = 0.065 * s, lx = (p.v - 1.5) * 0.05, ly = (p.v % 3 - 1) * 0.04, W = ['#7a6044', '#4e3c2a', '#3a2c1e'], f0 = zb / H, f1 = (zb + hb) / H;
      pBox(p.x, p.y, 0.065, 0.065, zb, W, 0, lx * f0, ly * f0);
      pBox(p.x + lx * f0, p.y + ly * f0, E ? 0.055 : 0.3 * s, E ? 0.3 * s : 0.055, hb, W, zb, lx * (f1 - f0), ly * (f1 - f0));
      pBox(p.x + lx * f1, p.y + ly * f1, 0.065, 0.065, H - zb - hb, W, zb + hb, lx * (1 - f1), ly * (1 - f1));
    },
    deadgrass(p, T) { pTuft(p.x - 0.05, p.y - 0.03, 0.16, 5, '#8a8a52', p.v); pTuft(p.x + 0.06, p.y + 0.04, 0.13, 4, '#7a8248', p.v + 1); },   // 1.27.5: two tufts of standing blades
    rbrazier(p, T, t) {   // an iron brazier of red fire on round legs
      groundShadow(p.x, p.y, 0.2, 0.12, 0.35);
      pCap(p.x - 0.12, p.y, 0, p.x, p.y, 0.4, 0.022, '#3a3236'); pCap(p.x + 0.12, p.y, 0, p.x, p.y, 0.4, 0.022, '#3a3236');
      pBowl(p.x, p.y, 0.4, 0.16, 0.08, '#3a2a2a', '#5a4446', t, Math.round(p.seed), true);   // 1.27.5 (round 3): a bowl with its rim and hollow, red coals heaped in it
      const q = W2S(p.x, p.y, 0.5); pFlame(q[0], q[1], T * 0.34, t, p.seed, 'rgba(255,200,120,0.95)', 'rgba(230,50,30,0.9)', ['kfireR', [[0, 'rgba(255,70,40,0.42)'], [0.5, 'rgba(255,50,30,0.12)'], [1, 'rgba(255,40,20,0)']]]);
    },
    brimstone(p, T) { groundShadow(p.x, p.y, 0.16, 0.1, 0.3); [[-0.06, 0.02, 0.08], [0.06, -0.02, 0.06], [0.01, 0.06, 0.05]].forEach(([u, v, r]) => pBall(p.x + u, p.y + v, 0, r * p.s, '#c4a052', 'rgba(60,30,10,0.45)')); },
    horns(p, T) {   // 1.27.5: a horned skull: round horns curling up behind it, the skull in front
      groundShadow(p.x, p.y, 0.16, 0.08, 0.3); const s = W2S(p.x, p.y, 0.02), r = T * 0.1 * p.s, w = Math.max(1.6, T * 0.045 * p.s);
      [-1, 1].forEach(sd => pCurve([s[0] + sd * r * 0.45, s[1] - r * 1.6], [s[0] + sd * r * 1.5, s[1] - r * 2.0], [s[0] + sd * r * 1.1, s[1] - r * 2.9], w, '#d9cfb4'));
      pSkull(s[0], s[1], r * 0.7, '#c9bfa8', '#2a1414', 0);
    },
    chainpile(p, T) { groundShadow(p.x, p.y, 0.16, 0.09, 0.3); const b = W2S(p.x, p.y, 0.02); [3, 0, 5, 2, 4, 1, 6].forEach(k => pRing(b[0] + Math.cos(k * 1.7) * T * 0.1 * (k < 6), b[1] + Math.sin(k * 1.7) * T * 0.05 * (k < 6) - (k % 2 || k === 6) * T * 0.035, T * 0.05, T * 0.03, Math.max(1.4, T * 0.03), '#8a8692', k * 0.7)); },   // 1.27.5: round links heaped up
    gmound(p, T) {   // 1.27.5: the grave in the middle of a Cmentarz: a mound of earth raised over its painted outline
      const x = p.x - 0.03, y = p.y - 0.04, k = 1 / PROP_K;   // (drawProp scales it up: the mound keeps to the painted outline)
      [[0, 0.4, 0.66, '#33261a'], [0.06, 0.36, 0.6, '#45351f'], [0.12, 0.3, 0.52, '#58452c'], [0.17, 0.23, 0.42, '#6a5536'], [0.21, 0.14, 0.28, '#7a6442']].forEach(([z, rx, ry, c]) => pFloorEll(x, y, z, rx * k, ry * k, c));
      const q = W2S(x - 0.04, y - 0.08, 0.21); ctx.fillStyle = 'rgba(255,230,180,0.12)'; ctx.beginPath(); ctx.ellipse(q[0], q[1], T * 0.12, T * 0.05, -0.4, 0, 7); ctx.fill();
    }
  });
  Object.assign(KIND_WALL, {   // 1.27.5: in the face's frame K (kwKit), as the old ones
    lab(K, t, u0, alt, T) {   // two shelves standing out of the wall with bottles on them; or a chart of the elements pinned up
      if (alt) {
        kwSheet(K, 0.25, 0.15, 0.75, 0.7, 0.012, 0.06, '#c9bfa8', () => {   // 1.27.5: its lower half curling off the stone
          ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 0.02; ctx.strokeRect(0.27, 0.17, 0.46, 0.51); ctx.strokeStyle = '#3a6a3a'; ctx.beginPath(); ctx.arc(0.5, 0.38, 0.12, 0, 7); ctx.moveTo(0.38, 0.38); ctx.lineTo(0.62, 0.38); ctx.moveTo(0.5, 0.26); ctx.lineTo(0.5, 0.5); ctx.stroke(); for (let k = 0; k < 3; k++) { ctx.fillStyle = '#4a3a28'; ctx.fillRect(0.3, 0.55 + k * 0.04, 0.4 - k * 0.08, 0.015); } });
        [0.28, 0.72].forEach(u => { const q = K.P(u, 0.17, 0.025); pKnob(q[0], q[1], Math.max(1.2, T * 0.018), '#9a9da5'); });
        return;
      }
      [0.42, 0.72].forEach((v, j) => {
        K.box(0.12, 0.88, v, v + 0.05, 0, 0.15, ['#6a4a30', '#4a3020', '#3a2618']);
        const z = K.Z(v);
        [['#7fe05a', 0.2], ['#8cc8ff', 0.36], ['#c78be3', 0.54], ['#e0643c', 0.72]].forEach(([c, x], k) => { if ((k + j) % 3 === 2) return; const [wx, wy] = K.W(x + 0.018, 0.08); pCyl(wx, wy, 0.045, 0.13, c, kSh(c, 1.3), z); pCyl(wx, wy, 0.016, 0.07, 'rgba(200,215,240,0.6)', 'rgba(230,240,255,0.8)', z + 0.13); });
      });
      const g = K.P(0.45, 0.5, 0.1), a = 0.6 + 0.4 * Math.sin(t * 2 + u0 * 9); ctx.globalAlpha *= a; ctx.drawImage(glowSprite('kflask', [[0, 'rgba(127,224,90,0.45)'], [1, 'rgba(127,224,90,0)']]), g[0] - T * 0.45, g[1] - T * 0.45, T * 0.9, T * 0.9); ctx.globalAlpha /= a;
    },
    graveyard(K, t, u0, alt, T) {   // ivy hanging down off the top (round vines, leaves); or an iron lantern on a bracket with a pale flame
      if (alt) {
        K.box(0.46, 0.54, 0.02, 0.08, 0, 0.02, KW_IRON); pRod(K.P(0.5, 0.05, 0.01), K.P(0.5, 0.05, 0.14), Math.max(1.4, T * 0.022), '#3a3a40');
        const top = K.P(0.5, 0.05, 0.14), bot = K.P(0.5, 0.2, 0.14); ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke();
        K.box(0.42, 0.58, 0.2, 0.25, 0.08, 0.2, KW_IRON);   // its roof
        K.box(0.43, 0.57, 0.25, 0.5, 0.09, 0.19, ['#3a3a40', '#2a2a2e', '#222226']);
        const lg = 0.55 + 0.25 * Math.sin(t * 5 + u0 * 7); K.plane(0.19);
        ctx.fillStyle = 'rgba(200,230,220,' + lg.toFixed(2) + ')'; ctx.fillRect(0.455, 0.28, 0.09, 0.19); ctx.fillStyle = 'rgba(255,255,240,0.5)'; ctx.fillRect(0.485, 0.33, 0.03, 0.09);
        screenT(); const q = K.P(0.5, 0.38, 0.14); ctx.globalAlpha *= lg; ctx.drawImage(glowSprite('kgwisp', [[0, 'rgba(220,255,230,0.9)'], [0.4, 'rgba(170,230,200,0.3)'], [1, 'rgba(170,230,200,0)']]), q[0] - T * 0.3, q[1] - T * 0.3, T * 0.6, T * 0.6); ctx.globalAlpha /= lg;
        return;
      }
      for (let k = 0; k < 4; k++) {
        const x = 0.15 + k * 0.22 + u0 * 0.05, e = 0.45 + 0.15 * (k % 2), a = K.P(x, 0, 0.02), c = K.P(x + 0.06, 0.3, 0.05), b = K.P(x - 0.02, e, 0.04);
        pCurve(a, c, b, Math.max(1.4, T * 0.024), '#4e6e36');
        for (let j = 1; j < 5; j++) { const q = K.P(x + 0.03 * Math.sin(j * 2), j * 0.1, 0.055); pOval(q[0], q[1], T * 0.035, T * 0.024, k % 2 ? '#5c8c3a' : '#4a7a30', j); }
      }
    },
    abyssgate(K, t, u0, alt, T) {   // a sigil burning in the stone; or a chain of round links with a hook, off the wall
      if (alt) {
        K.box(0.37, 0.45, 0.02, 0.07, 0, 0.02, KW_IRON);
        for (let k = 0; k < 6; k++) { const q = K.P(0.4 + (k % 2) * 0.02, 0.08 + k * 0.08, 0.03 + k * 0.006); pRing(q[0], q[1], T * (k % 2 ? 0.016 : 0.026), T * (k % 2 ? 0.04 : 0.03), Math.max(1, T * 0.016), '#8a8694'); }
        const h0 = K.P(0.43, 0.56, 0.07), h1 = K.P(0.43, 0.7, 0.08), h2 = K.P(0.5, 0.62, 0.08); pCurve(h0, [h1[0] - T * 0.06, h1[1]], h1, Math.max(1.6, T * 0.03), '#8a8694'); pCurve(h1, [h1[0] + T * 0.06, h1[1]], h2, Math.max(1.6, T * 0.03), '#8a8694');
        return;
      }
      const a = 0.5 + 0.3 * Math.sin(t * 2 + u0 * 8); K.plane(0);
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
      if (s % 2) { const a = F.P(0.15, 0.07, h - 0.2), b = F.P(0.15, 0.07, 0.3), c = F.P(0.85, 0.07, 0.3), w = Math.max(2, T * 0.045); pRod(a, b, w, '#b8743e'); pRod(b, c, w, '#b8743e'); [[0.15, h - 0.5], [0.5, 0.3], [0.8, 0.3]].forEach(([u, z]) => F.box(u, 0.035, 0.05, 0.07, 0.04, z - 0.02, '#5e626c', '#464a52', '#34373e')); pKnob(b[0], b[1], w * 0.75, '#c8844a'); return; }   // 1.27.5: a round copper pipe on brackets
      const z = Math.min(1.0, h - 0.35); F.box(0.5, 0.1, 0.8, 0.16, 0.04, z, '#5a4430', '#4a3828', '#3a2c20');
      [[0.25, '#7fd08a'], [0.45, '#d8c06a'], [0.68, '#9fb8e0']].forEach(([u, col], k) => { const [wx, wy] = F.W(u, 0.1); pCyl(wx, wy, 0.05, 0.12 + 0.03 * k, col, '#e8f0e8', z + 0.04); });
      const q = F.P(0.25, 0.1, z + 0.22 + Math.sin(t * 3 + s) * 0.03); ctx.fillStyle = 'rgba(160,240,170,0.7)'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, T * 0.025), 0, Math.PI * 2); ctx.fill();
    },
    graveyard(F, h, T, t, s) {   // ivy hanging off the top; a small iron lantern on every third piece
      [0.2, 0.55, 0.8].forEach((u, k) => { const a = F.P(u, 0.02, h - 0.02), b = F.P(u + 0.05, 0.08, h - 0.4 - 0.15 * k); pCurve(a, [b[0] + T * 0.06, (a[1] + b[1]) / 2], b, Math.max(1.6, T * 0.032), '#4e6e3c');   // 1.27.5: round vines, leaves
        for (let j = 1; j <= 3; j++) { const f = j / 4, q = [a[0] + (b[0] - a[0]) * f + T * 0.04 * Math.sin(f * 3), a[1] + (b[1] - a[1]) * f]; pOval(q[0] + (j % 2 ? -1 : 1) * T * 0.03, q[1], T * 0.035, T * 0.024, j % 2 ? '#5c8c3a' : '#4a7a30', j); }
        pOval(b[0], b[1], T * 0.04, T * 0.03, '#5a8240'); });
      if (s % 3 === 0) { const z = Math.min(0.95, h - 0.4); pLine(F.P(0.5, 0, z + 0.1), F.P(0.5, 0.14, z + 0.1), '#2a2a2e', Math.max(1.5, T * 0.03)); F.box(0.5, 0.16, 0.1, 0.1, 0.14, z - 0.06, '#3a3a40', '#2c2c32', '#222226'); const q = F.P(0.5, 0.16, z + 0.02); ctx.fillStyle = 'rgba(240,220,150,' + (0.6 + 0.2 * Math.sin(t * 4 + s)) + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, T * 0.03), 0, Math.PI * 2); ctx.fill(); }
    },
    abyssgate(F, h, T, t, s) {   // a glowing crack running down the stone; chains with a hook on the other pieces
      if (s % 2) { [0.3, 0.7].forEach((u, k) => { const n = 6 + k * 2; for (let j = 0; j <= n; j++) { const f = j / n, q = F.P(u, 0.03 + 0.03 * f, h - 0.05 - (0.55 + 0.15 * k) * f); pRing(q[0], q[1], T * (j % 2 ? 0.014 : 0.024), T * (j % 2 ? 0.03 : 0.022), Math.max(1, T * 0.016), '#6a6270'); } }); return; }   // 1.27.5: chains of round links
      const g = 0.55 + 0.35 * Math.sin(t * 2 + s), pts = [[0.4, h - 0.1], [0.48, h - 0.45], [0.42, h - 0.75], [0.52, 0.35]].map(([u, z]) => F.P(u, 0.01, Math.max(0.1, z)));
      ctx.strokeStyle = 'rgba(255,90,50,' + g.toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, T * 0.035); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
  });
  /* ================= 1.27.5: the room effects dress their rooms like the komnaty do ================= */
  // 1.27.5 (author: the komnaty look good, the room effects mediocre): every effect now has what a komnata has. Its floor is
  // painted once per room and zoom into a cache (RFX_FLOOR, rfxFloorCache, clipped to the room's tiles); what moves on that floor
  // is drawn every frame over it (RFX_LIVE); a few small things stand in the room and never block (RFX_PLAN, drawn by drawProp
  // among the komnaty's props: the same rules, kind 5 of drawSO); a light layer of particles hangs in the air over it (RFX_AIR:
  // no state, every particle is a phase of the clock, a fixed cap per room, only rooms on screen, none with reduceMotion); and
  // raised pieces stand out of the faces of its walls (RFX_WALL3D, from rtWallWash). With a komnata in the same room the effect
  // steps back: a lighter floor, fewer and smaller props only on the edge tiles the komnata left free, thin wall pieces only.
  const RFX_TILES = new Map(), RFC = new Map(), RFP = new Map();
  const rfxBox = R => R.x0 + ',' + R.y0 + ',' + R.x1 + ',' + R.y1 + ',' + R.tiles.length;
  function rfxTilePath(R) {   // the room's tiles as one path, in tile units (a plain rectangle when the room is one)
    const k = rfxBox(R); let e = RFX_TILES.get(R.key);
    if (e && e.k === k) return e.p;
    const p = new Path2D(); if (R.tiles.length === (R.x1 - R.x0 + 1) * (R.y1 - R.y0 + 1)) p.rect(R.x0, R.y0, R.x1 - R.x0 + 1, R.y1 - R.y0 + 1); else R.tiles.forEach(([x, y]) => p.rect(x, y, 1, 1));
    if (RFX_TILES.size > 80) RFX_TILES.clear(); RFX_TILES.set(R.key, { k, p }); return p;
  }
  function rfxFloorCache(R, T) {   // as kindFloorCache: one picture per room and zoom step, at the screen's resolution
    const s = Math.max(4, Math.round(T * DPR / 3) * 3), W = R.x1 - R.x0 + 1, H = R.y1 - R.y0 + 1, key = R.rt + '|' + (R.rk ? 1 : 0) + '|' + s + '|' + rfxBox(R);
    let e = RFC.get(R.key);
    if (e && e.key === key) return e.c;
    if (RFC.size > 80) RFC.clear();
    const c = (e && e.c) || document.createElement('canvas'); c.width = W * s; c.height = H * s;
    const g = c.getContext('2d'); g.translate(-R.x0 * s, -R.y0 * s);
    g.save(); g.scale(s, s); g.clip(rfxTilePath(R)); g.scale(1 / s, 1 / s);
    try { RFX_FLOOR[R.rt](g, R, s, !!R.rk, rfxPlan(R)); } finally { g.restore(); }
    RFC.set(R.key, { key, c }); return c;
  }
  // where the effect's things go, fixed by the tiles: pools (tile units), spots (runes, pits...), props [type, x, y, scale, variant, height]
  function rfxPlan(R) {
    const k = R.rt + '|' + (R.rk || '') + '|' + rfxBox(R); let e = RFP.get(R.key);
    if (e && e.k === k) return e.p;
    const lite = !!R.rk, taken = new Set(), set = new Set(R.tiles.map(q => q[0] + ',' + q[1]));
    if (lite) kindProps(R).forEach(q => taken.add(Math.floor(q.x) + ',' + Math.floor(q.y)));
    const p = { pools: [], spots: [], props: [], set, lite };
    const out = [];
    if (RFX_PLAN[R.rt]) RFX_PLAN[R.rt](R, p, out, lite, taken);
    p.props = out.map(([t, x, y, s, v, h]) => ({ t, x, y, s, v, h, seed: (x * 7.3 + y * 3.1) % 10 }));
    p.bits = []; if (RFX_BITS[R.rt]) { RFX_BITS[R.rt](R, p, p.bits, lite); p.bits.sort((a, b) => (a[0] === 'rug' ? -1e9 : a[1] + a[2]) - (b[0] === 'rug' ? -1e9 : b[1] + b[2])); }   // 1.27.5: the small solid things on its floor
    if (RFP.size > 80) RFP.clear(); RFP.set(R.key, { k, p }); return p;
  }
  // the komnaty's scatter rule, quieter with a komnata (edge tiles only, fewer, smaller, never on a tile with one of its props)
  function rxScatter(R, out, salt, pEdge, pIn, pick, lite, taken) {
    R.tiles.forEach(([tx, ty]) => {
      const e = edgeTile(R, tx, ty), r = kH(tx, ty, salt);
      if (lite && (!e || taken.has(tx + ',' + ty))) return;
      if (r > (e ? pEdge * (lite ? 0.45 : 1) : pIn)) return;
      const x = tx + 0.22 + 0.56 * kH(tx, ty, salt + 2), y = ty + 0.22 + 0.56 * kH(tx, ty, salt + 3), q = kH(tx, ty, salt + 5), t = pick(q, e);
      if (t) out.push([t[0], x, y, (0.85 + 0.3 * kH(tx, ty, salt + 7)) * (lite ? 0.8 : 1), Math.floor(kH(tx, ty, salt + 9) * 4), t[1]]);
    });
  }
  const rfxFree = (R, tx, ty, taken) => !taken.has(tx + ',' + ty) && !isHeart(tx, ty);
  // a prop is drawn only on a free floor tile (as the komnaty's: kindPropsSO); its particles follow the same rule
  const rfxPropOk = p => { const tx = Math.floor(p.x), ty = Math.floor(p.y), k = key(tx, ty); return !fl.items.has(k) && !fl.objects.has(k) && !isHeart(tx, ty) && tileAt(tx, ty) === FLOOR; };
  function rfxPropsSO(SO, T) {
    const dT = detT(T); if (dT < 9) return;
    const small = dT < 14;   // 1.28.0: as kindPropsSO: far out only the bigger things
    fl.rooms.forEach(R => {
      if (R.kind !== 'room' || !R.rt || !RFX_PLAN[R.rt] || !roomSeen(R, T)) return;
      rfxPlan(R).props.forEach(p => {
        if ((small && p.h < 0.4) || !rfxPropOk(p) || !onScreen(W2S(p.x, p.y, 0), T * 2)) return;
        SO.push([p.x + p.y, 5, p, p.x, p.y, p.h]);
      });
    });
  }
  // the floor's moving part, in floorT (tile pixels); the others keep inside their room by themselves
  const RFX_CLIP = { fog: 1, crypt: 1 };
  function rfxLive(R, T, t) {
    const fn = RFX_LIVE[R.rt]; if (!fn || (detT(T) < 14 && R.rt !== 'fog')) return;   // 1.28.0: detT. Far out the still floor says it (the fog's drift stays: it is the fog)
    ctx.save(); if (RFX_CLIP[R.rt]) { ctx.scale(T, T); ctx.clip(rfxTilePath(R)); ctx.scale(1 / T, 1 / T); }   // a clip is dear on a phone: only what drifts over the room's edge asks for one
    try { fn(ctx, R, T, t, !!R.rk, rfxPlan(R)); } finally { ctx.restore(); }
  }
  // the particles in the air over each effect room on screen (screen space, under the walls in front, like drawKindLife)
  function rfxAir(T) {
    if (detT(T) < 14 || reduceMotion) return;   // 1.28.0: detT
    const t = realNow, few = detT(T) < 24;   // further out, half the particles (as with a komnata)
    fl.rooms.forEach(R => {
      if (R.kind !== 'room' || !R.rt || !RFX_AIR[R.rt] || !roomSeen(R, T)) return;
      const [mx, my] = roomMid(R); if (fogged(Math.floor(mx), Math.floor(my))) return;
      const seed = R.x0 * 13 + R.y0 * 7, ph = (k, sp) => ((t * sp + k * 0.6180339 + seed * 0.071) % 1 + 1) % 1;
      ctx.save();
      try { RFX_AIR[R.rt](R, T, t, rfxPlan(R), !!R.rk || few, ph, seed, R.x1 - R.x0 + 1, R.y1 - R.y0 + 1); } finally { ctx.restore(); ctx.globalAlpha = 1; }
    });
  }
  // the raised pieces on a wall face that looks into an effect room (rtWallWash calls it for a standing block)
  // 1.28.0: which pieces move (lite: a komnata in the room too); the rest are still, the wall cache paints them once
  const RFXW_LIVE = { fog: () => true, grotto: () => true, crypt: (s, l) => !(l || s % 3), vault: (s, l) => !(l || s % 3), haven: (s, l) => (s % 2 === 0 && !l) || s % 3 === 0, gears: (s, l) => l ? s % 4 === 0 : s % 2 === 0, ice: () => true };
  const RFXW_MIX = { grotto: 1, crypt: 1, vault: 1, haven: 1, gears: 1, ice: 1 };   // (their still and moving pieces apart: wSt, wLv)
  function rfxWall3D(x, y, face, h, T, t, s, R) {
    const fn = R && RFX_WALL3D[R.rt]; if (!fn || wdT(T) < 20) return;   // small things: close up only (1.28.0: wdT, GFX.lvl)
    const lv = RFXW_LIVE[R.rt];
    wP(!reduceMotion && !!lv && lv(s, !!R.rk), RFXW_MIX[R.rt], () => { ctx.save(); try { fn(wallFrame(x, y, face), h, T, t, s, !!R.rk); } finally { ctx.restore(); } });
  }
  // ---------- 1.27.5: little painters ----------
  function rxBlob(c, cx, cy, rx, ry, seed) {   // an uneven rounded patch (a smooth closed curve through 12 wobbly points)
    const n = 12, P = [];
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, f = 0.74 + 0.36 * kH(seed, k, 71); P.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]); }
    c.beginPath(); c.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
    for (let k = 0; k < n; k++) { const a = P[k], b = P[(k + 1) % n]; c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    c.closePath();
  }
  function rxEdgeGlow(c, R, T, col, depth, set) {   // a soft band of colour along the room's walls, inward
    R.tiles.forEach(([tx, ty]) => {
      [[0, -1], [-1, 0], [0, 1], [1, 0]].forEach(([dx, dy]) => {
        if (set.has((tx + dx) + ',' + (ty + dy))) return;
        const ax = (dx === 1 ? tx + 1 : tx) * T, ay = (dy === 1 ? ty + 1 : ty) * T, bx = ax - dx * depth * T, by = ay - dy * depth * T;
        const g = c.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g;
        c.fillRect(Math.min(ax, bx, tx * T), Math.min(ay, by, ty * T), dx ? depth * T : T, dy ? depth * T : T);
      });
    });
  }
  function rxCrack(c, x, y, T, n, seed, len) {   // a jagged crack (a path; the caller strokes it)
    let px = x, py = y, a = kH(seed, 1, 81) * 6.28; c.moveTo(px, py);
    for (let k = 0; k < n; k++) { a += (kH(seed, k, 82) - 0.5) * 1.4; const L = T * len * (0.5 + kH(seed, k, 83)); px += Math.cos(a) * L; py += Math.sin(a) * L; c.lineTo(px, py);
      if (kH(seed, k, 84) > 0.6) { const b = a + (kH(seed, k, 85) > 0.5 ? 0.9 : -0.9); c.moveTo(px, py); c.lineTo(px + Math.cos(b) * L * 0.6, py + Math.sin(b) * L * 0.6); c.moveTo(px, py); } }
  }
  function rxGear(cx, cy, r, n, a0, body, edge, hole, cc) {
    const c = cc || ctx;   // a cog in the current plane (unit square coordinates), centre cx, cy
    c.beginPath();
    for (let k = 0; k < n; k++) {
      const a = a0 + k * Math.PI * 2 / n, d = Math.PI / n;
      [[a - d * 0.95, 0.78], [a - d * 0.5, 1], [a + d * 0.5, 1], [a + d * 0.95, 0.78]].forEach(([b, q], j) => { const px = cx + Math.cos(b) * r * q, py = cy + Math.sin(b) * r * q; (k || j) ? c.lineTo(px, py) : c.moveTo(px, py); });
    }
    c.closePath(); c.fillStyle = body; c.fill();
    if (edge) { c.strokeStyle = edge; c.lineWidth = r * 0.07; c.beginPath(); c.arc(cx, cy, r * 0.62, 0, Math.PI * 2); c.stroke(); }
    if (hole) { c.fillStyle = hole; c.beginPath(); c.arc(cx, cy, r * 0.18, 0, Math.PI * 2); for (let k = 0; k < 4; k++) { const a = a0 * 1 + k * Math.PI / 2 + Math.PI / 4, hx = cx + Math.cos(a) * r * 0.42, hy = cy + Math.sin(a) * r * 0.42; c.moveTo(hx + r * 0.11, hy); c.arc(hx, hy, r * 0.11, 0, Math.PI * 2); } c.fill(); }
  }
  const rxMist = () => glowSprite('rxmist', [[0, 'rgba(226,232,244,0.6)'], [0.45, 'rgba(216,224,238,0.28)'], [1, 'rgba(210,220,235,0)']]);
  const rxFog = () => glowSprite('rxfog', [[0, 'rgba(200,210,228,0.55)'], [0.5, 'rgba(190,200,220,0.22)'], [1, 'rgba(185,196,216,0)']]);
  const rxDot = (x, y, z, r, fill) => { const q = W2S(x, y, z); ctx.fillStyle = fill; if (r < 2.2) ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2); else { ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill(); } return q; };   // a tiny one is a square (far cheaper)
  const rxStar = (q, r, col) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, r * 0.22); ctx.beginPath(); ctx.moveTo(q[0] - r, q[1]); ctx.lineTo(q[0] + r, q[1]); ctx.moveTo(q[0], q[1] - r); ctx.lineTo(q[0], q[1] + r); ctx.stroke(); };
  const rxRing = (x, y, r, col, lw) => { const q = W2S(x, y, 0); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(q[0], q[1], r, r * SP, 0, 0, Math.PI * 2); ctx.stroke(); };
  // ---------- 1.27.5: where things go ----------
  const RFX_PLAN = {
    fog(R, P, o, lite, taken) {
      if (!lite) R.tiles.forEach(([tx, ty]) => { if (!edgeTile(R, tx, ty) && kH(tx, ty, 401) < 0.22 && P.spots.length < 2 && rfxFree(R, tx, ty, taken)) o.push(['rx_vent', tx + 0.5, ty + 0.5, 1, Math.floor(kH(tx, ty, 402) * 4), 0.12]); });
      rxScatter(R, o, 405, 0.4, 0.08, q => q < 0.7 ? ['rx_snag', 0.5] : ['rx_vent', 0.12], lite, taken);
    },
    swamp(R, P, o, lite, taken) {
      R.tiles.forEach(([tx, ty]) => {   // pools of black water, a few per room; smaller and by the walls with a komnata
        const e = edgeTile(R, tx, ty); if (kH(tx, ty, 411) > (lite ? (e ? 0.42 : 0.12) : 0.42)) return;
        const r = (lite ? 0.32 : 0.36 + 0.14 * kH(tx, ty, 412)); P.pools.push([tx + 0.5 + (kH(tx, ty, 413) - 0.5) * 0.3, ty + 0.5 + (kH(tx, ty, 414) - 0.5) * 0.3, r, r * (0.7 + 0.25 * kH(tx, ty, 415)), tx * 31 + ty * 17]);
      });
      P.pools.forEach((q, k) => { if (k % 2 === 0 && !lite) o.push(['rx_reeds', q[0] + q[2] * 0.75, q[1] - q[3] * 0.4, 1, k % 4, 0.55]); });
      rxScatter(R, o, 417, 0.5, 0.06, q => q < 0.55 ? ['rx_reeds', 0.55] : q < 0.8 ? ['rx_stump', 0.3] : ['rx_toad', 0.2], lite, taken);
    },
    grotto(R, P, o, lite, taken) {
      const W = R.x1 - R.x0 + 1, H = R.y1 - R.y0 + 1;
      if (!lite) { const r = Math.min(W, H) * 0.24 + 0.25; P.pools.push([R.x0 + W * 0.62, R.y0 + H * 0.38, r * 1.15, r * 0.85, R.x0 * 7 + R.y0]); }
      else P.pools.push([R.x0 + 0.75, R.y1 + 0.25, 0.5, 0.36, R.x0 * 7 + R.y0]);
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 421) < 0.22) P.pools.push([tx + 0.3 + 0.4 * kH(tx, ty, 422), ty + 0.3 + 0.4 * kH(tx, ty, 423), 0.16, 0.11, tx * 13 + ty]); });   // puddles
      rxScatter(R, o, 425, 0.6, lite ? 0 : 0.12, q => q < 0.65 ? ['rx_stalag', 0.6] : ['rx_gcrystal', 0.35], lite, taken);
    },
    crypt(R, P, o, lite, taken) {
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 431) < (lite ? 0.12 : 0.2) && P.spots.length < 5) P.spots.push([tx + 0.5, ty + 0.5, 0.3 + 0.08 * kH(tx, ty, 432), tx * 5 + ty * 3]); });   // runes
      if (!P.spots.length) P.spots.push([R.x0 + 0.5, R.y0 + 0.5, 0.32, R.x0 + R.y0]);
      rxScatter(R, o, 435, 0.55, 0.06, q => q < 0.4 ? ['rx_tomb', 0.6] : q < 0.8 ? ['rx_candlesV', 0.4] : ['rx_urn', 0.4], lite, taken);   // 1.27.5: an urn of its own (turned, solid)
    },
    vault(R, P, o, lite, taken) {
      rxScatter(R, o, 441, 0.6, 0.14, q => q < 0.5 ? ['rx_coins', 0.35] : q < 0.75 ? ['rx_chest', 0.35] : ['rx_bars', 0.2], lite, taken);
    },
    haven(R, P, o, lite, taken) {
      rxScatter(R, o, 451, 0.55, 0.05, (q, e) => q < 0.45 ? ['rx_candlesH', 0.45] : q < 0.75 ? ['rx_bedroll', 0.2] : ['rx_jug', 0.3], lite, taken);
    },
    gears(R, P, o, lite, taken) {
      R.tiles.forEach(([tx, ty]) => { if (edgeTile(R, tx, ty) && (R.x1 - R.x0 > 1 && R.y1 - R.y0 > 1)) return; if (kH(tx, ty, 461) < (lite ? 0.12 : 0.3) && P.spots.length < (lite ? 1 : 3)) P.spots.push([tx + 0.5, ty + 0.5, 0.36, (tx + ty) % 2 ? 1 : -1]); });   // pits with a cog turning in them
      if (!P.spots.length && !lite) { const [mx, my] = roomMid(R); P.spots.push([Math.floor(mx) + 0.5, Math.floor(my) + 0.5, 0.36, 1]); }
      rxScatter(R, o, 465, 0.45, 0.04, q => q < 0.45 ? ['rx_cog', 0.75] : q < 0.8 ? ['rx_pipe', 0.8] : ['rx_lever', 0.4], lite, taken);
    },
    hush(R, P, o, lite, taken) {
      rxScatter(R, o, 471, 0.5, 0.06, q => q < 0.45 ? ['rx_bale', 0.35] : q < 0.75 ? ['rx_snuffed', 0.2] : ['rx_bell', 0.4], lite, taken);
    },
    ice(R, P, o, lite, taken) {
      const dr = new Set(); if (!lite) [[R.x0, R.y0], [R.x1, R.y0], [R.x0, R.y1]].forEach(([tx, ty], k) => { if (!P.set.has(tx + ',' + ty) || !rfxFree(R, tx, ty, taken)) return; dr.add(tx + ',' + ty); o.push(['rx_drift', tx + (tx === R.x0 ? 0.3 : 0.7), ty + (ty === R.y0 ? 0.3 : 0.7), 1, k, 0.16]); });   // 1.27.5: snow drifts heaped in the corners (solid)
      const n = o.length; rxScatter(R, o, 481, 0.6, 0.12, q => q < 0.65 ? ['rx_shard', 0.6] : ['rx_iceblock', 0.4], lite, taken);
      for (let k = o.length - 1; k >= n; k--) if (dr.has(Math.floor(o[k][1]) + ',' + Math.floor(o[k][2]))) o.splice(k, 1);
    }
  };
  // ---------- 1.27.5: the still floors (tile pixels; c is the cache, T its tile size; clipped to the room's tiles) ----------
  const RFX_FLOOR = {
    fog(c, R, T, lite, P) {   // damp grey stone, mist banked thick against the walls (1.27.5: the dew is solid beads: RFX_BITS)
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(120,134,160,0.16)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => {
        if (kH(tx, ty, 301) > 0.5) { c.fillStyle = 'rgba(14,20,32,0.2)'; rxBlob(c, (tx + 0.5) * T, (ty + 0.5) * T, T * 0.44, T * 0.32, tx * 31 + ty * 7); c.fill(); }
      });
      rxEdgeGlow(c, R, T, 'rgba(200,212,232,' + (lite ? 0.2 : 0.3) + ')', 0.9, P.set);
    },
    swamp(c, R, T, lite, P) {   // mud, black water standing in pools with a rim of wet mud, light on the water (1.27.5: duckweed and lily pads solid: RFX_BITS)
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = lite ? 'rgba(58,74,30,0.32)' : 'rgba(58,72,28,0.42)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 341) < 0.5) return; c.fillStyle = 'rgba(44,34,16,0.3)'; rxBlob(c, (tx + kH(tx, ty, 342)) * T, (ty + kH(tx, ty, 343)) * T, T * 0.4, T * 0.28, tx * 7 + ty * 29); c.fill(); });
      P.pools.forEach(([px, py, rx, ry, sd]) => {
        c.fillStyle = 'rgba(36,30,14,0.6)'; rxBlob(c, px * T, py * T, rx * T * 1.25, ry * T * 1.25, sd); c.fill();   // the wet rim
        const g = c.createLinearGradient((px - rx) * T, (py - ry) * T, (px + rx) * T, (py + ry) * T); g.addColorStop(0, 'rgba(58,84,62,0.95)'); g.addColorStop(1, 'rgba(14,24,18,0.95)');
        c.fillStyle = g; rxBlob(c, px * T, py * T, rx * T, ry * T, sd); c.fill();
        c.strokeStyle = 'rgba(150,190,110,0.35)'; c.lineWidth = Math.max(1, T * 0.018); c.stroke();
        c.strokeStyle = 'rgba(220,240,220,0.22)'; c.lineWidth = Math.max(1, T * 0.03); c.beginPath(); c.ellipse(px * T - rx * T * 0.25, py * T - ry * T * 0.3, rx * T * 0.45, ry * T * 0.22, -0.5, Math.PI * 1.1, Math.PI * 1.7); c.stroke();   // the light on the water
      });
      c.fillStyle = 'rgba(110,140,60,0.4)';   // 1.27.5: green slime lying flat on the mud (what stands up is a prop: rx_reeds)
      R.tiles.forEach(([tx, ty]) => { for (let k = 0; k < 3; k++) { if (kH(tx, ty, 350 + k) < 0.55) continue; rxBlob(c, (tx + 0.1 + 0.8 * kH(tx, ty, 353 + k)) * T, (ty + 0.1 + 0.8 * kH(tx, ty, 356 + k)) * T, T * 0.07, T * 0.05, tx * 5 + ty * 11 + k); c.fill(); } });
    },
    grotto(c, R, T, lite, P) {   // wet blue stone that shines, a shallow clear pool, puddles (1.27.5: the pebbles are solid: RFX_BITS)
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(42,62,118,0.3)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => {   // the wet sheen on each stone, darker joints
        const g = c.createLinearGradient(tx * T, ty * T, (tx + 1) * T, (ty + 1) * T); g.addColorStop(0, 'rgba(170,200,255,0.12)'); g.addColorStop(0.5, 'rgba(170,200,255,0)'); g.addColorStop(1, 'rgba(10,16,40,0.18)');
        c.fillStyle = g; c.fillRect(tx * T, ty * T, T, T);
      });
      P.pools.forEach(([px, py, rx, ry, sd], k) => {
        const big = k === 0, X = px * T, Y = py * T;
        c.fillStyle = 'rgba(20,30,60,0.5)'; rxBlob(c, X, Y, rx * T * 1.12, ry * T * 1.12, sd); c.fill();
        const g = c.createRadialGradient(X - rx * T * 0.2, Y - ry * T * 0.2, 0, X, Y, rx * T); g.addColorStop(0, big ? 'rgba(110,170,240,0.8)' : 'rgba(120,160,230,0.55)'); g.addColorStop(1, 'rgba(36,70,140,0.75)');
        c.fillStyle = g; rxBlob(c, X, Y, rx * T, ry * T, sd); c.fill();
        c.strokeStyle = 'rgba(200,225,255,0.45)'; c.lineWidth = Math.max(1, T * 0.02); c.stroke();
        if (big) {   // the caustic net (1.27.5: the pebbles under the water are solid: RFX_BITS)
          c.save(); rxBlob(c, X, Y, rx * T, ry * T, sd); c.clip();
          c.strokeStyle = 'rgba(200,230,255,0.22)'; c.lineWidth = Math.max(1, T * 0.015); c.beginPath();
          for (let j = 0; j < 14; j++) { const qx = X + (kH(sd, j, 378) - 0.5) * rx * T * 2, qy = Y + (kH(sd, j, 379) - 0.5) * ry * T * 2, r = T * (0.06 + 0.06 * kH(sd, j, 380)); c.moveTo(qx + r, qy); c.ellipse(qx, qy, r, r * 0.7, kH(sd, j, 381), 0, Math.PI * 2); }
          c.stroke(); c.restore();
        }
      });
    },
    crypt(c, R, T, lite, P) {   // big dark slabs, cracked; faint violet runes cut in the stone (1.27.5: the wax drips are solid: RFX_BITS)
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(28,14,44,0.42)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => {   // a slab per tile, alternately split, a lit top edge, a dark joint
        const X = tx * T, Y = ty * T, v = (tx + ty) % 2;
        c.fillStyle = 'rgba(70,56,92,' + (0.12 + 0.12 * kH(tx, ty, 391)).toFixed(2) + ')'; c.fillRect(X + T * 0.04, Y + T * 0.04, T * 0.92, T * 0.92);
        c.strokeStyle = 'rgba(8,4,14,0.6)'; c.lineWidth = Math.max(1, T * 0.035); c.beginPath(); c.rect(X + T * 0.02, Y + T * 0.02, T * 0.96, T * 0.96); if (v) { c.moveTo(X + T * 0.5, Y); c.lineTo(X + T * 0.5, Y + T); } c.stroke();
        c.strokeStyle = 'rgba(210,190,240,0.1)'; c.lineWidth = Math.max(1, T * 0.02); c.beginPath(); c.moveTo(X + T * 0.05, Y + T * 0.95); c.lineTo(X + T * 0.05, Y + T * 0.05); c.lineTo(X + T * 0.95, Y + T * 0.05); c.stroke();
        if (kH(tx, ty, 392) > 0.55) { c.strokeStyle = 'rgba(6,2,10,0.7)'; c.lineWidth = Math.max(1, T * 0.022); c.beginPath(); rxCrack(c, (tx + 0.2 + 0.6 * kH(tx, ty, 393)) * T, (ty + 0.2 + 0.6 * kH(tx, ty, 394)) * T, T, 4, tx * 11 + ty * 19, 0.12); c.stroke(); }
      });
      P.spots.forEach(([px, py, r, sd]) => {   // a rune: two rings and marks between them, cut in, a faint violet
        const X = px * T, Y = py * T, rr = r * T;
        c.strokeStyle = 'rgba(8,4,14,0.55)'; c.lineWidth = Math.max(1.5, T * 0.04); c.beginPath(); c.arc(X + 1, Y + 1, rr, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = 'rgba(190,150,255,0.32)'; c.lineWidth = Math.max(1, T * 0.022); c.beginPath(); c.arc(X, Y, rr, 0, Math.PI * 2); c.moveTo(X + rr * 0.72, Y); c.arc(X, Y, rr * 0.72, 0, Math.PI * 2);
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + kH(sd, 1, 398), b = a + 0.4; c.moveTo(X + Math.cos(a) * rr * 0.76, Y + Math.sin(a) * rr * 0.76); c.lineTo(X + Math.cos(b) * rr * 0.96, Y + Math.sin(b) * rr * 0.96); }
        c.moveTo(X, Y - rr * 0.45); c.lineTo(X, Y + rr * 0.45); c.moveTo(X - rr * 0.25, Y - rr * 0.15); c.lineTo(X + rr * 0.25, Y - rr * 0.15); c.stroke();
      });
    },
    vault(c, R, T, lite, P) {   // polished tiles inlaid with gold, gold dust in the joints (1.27.5: the coins and gems are solid: RFX_BITS)
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(120,88,28,0.24)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => {
        const X = tx * T, Y = ty * T;
        c.fillStyle = (tx + ty) % 2 ? 'rgba(40,28,10,0.28)' : 'rgba(150,110,40,0.14)'; c.fillRect(X, Y, T, T);
        c.strokeStyle = 'rgba(255,214,122,0.4)'; c.lineWidth = Math.max(1, T * 0.022); c.beginPath(); c.rect(X + T * 0.04, Y + T * 0.04, T * 0.92, T * 0.92);
        c.moveTo(X + T * 0.62, Y + T * 0.5); c.arc(X + T * 0.5, Y + T * 0.5, T * 0.12, 0, Math.PI * 2); c.stroke();
        if ((tx + ty) % 2 === 0) { c.fillStyle = 'rgba(255,214,122,0.45)'; c.beginPath(); c.arc(X + T * 0.5, Y + T * 0.5, T * 0.05, 0, Math.PI * 2); c.fill(); }   // a gold medallion set in every other tile
        c.fillStyle = 'rgba(255,220,130,0.6)'; c.beginPath(); for (let k = 0; k < 6; k++) { const px = (tx + kH(tx, ty, 501 + k)) * T, py = (ty + kH(tx, ty, 511 + k)) * T, r = Math.max(0.6, T * 0.01); c.moveTo(px + r, py); c.arc(px, py, r, 0, Math.PI * 2); } c.fill();
      });
    },
    haven(c, R, T, lite, P) {   // warm boards; a rug laid out in the middle (with a komnata: none); 1.27.5: the straw, the rug's edges and fringe are solid: RFX_BITS
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = 'rgba(180,130,70,0.16)'; c.fillRect(x, y, w, h);
      const W = R.x1 - R.x0 + 1, H = R.y1 - R.y0 + 1;
      if (!lite && W >= 3 && H >= 3) {   // the rug: deep red, an ochre border, a pattern of diamonds, a fringe at the ends
        const ix = W >= 4 ? 1 : 0.6, iy = H >= 4 ? 1.1 : 0.7, rx0 = (R.x0 + ix) * T, ry0 = (R.y0 + iy) * T, rw = (W - 2 * ix) * T, rh = (H - 2 * iy) * T;
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(rx0 + T * 0.06, ry0 + T * 0.07, rw, rh);
        c.fillStyle = '#7a2a22'; c.fillRect(rx0, ry0, rw, rh);
        c.strokeStyle = '#c99a48'; c.lineWidth = Math.max(1.5, T * 0.06); c.strokeRect(rx0 + T * 0.1, ry0 + T * 0.1, rw - T * 0.2, rh - T * 0.2);
        c.strokeStyle = '#3a1410'; c.lineWidth = Math.max(1, T * 0.02); c.strokeRect(rx0 + T * 0.19, ry0 + T * 0.19, rw - T * 0.38, rh - T * 0.38);
        c.fillStyle = '#d8b060'; const nx = Math.max(1, Math.round((rw / T - 0.5) / 0.7)), ny = Math.max(1, Math.round((rh / T - 0.5) / 0.7));
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const cx = rx0 + T * 0.25 + (rw - T * 0.5) * (i + 0.5) / nx, cy = ry0 + T * 0.25 + (rh - T * 0.5) * (j + 0.5) / ny, r = T * 0.12; c.beginPath(); c.moveTo(cx, cy - r); c.lineTo(cx + r, cy); c.lineTo(cx, cy + r); c.lineTo(cx - r, cy); c.closePath(); c.fill(); c.fillStyle = '#7a2a22'; c.fillRect(cx - r * 0.25, cy - r * 0.25, r * 0.5, r * 0.5); c.fillStyle = '#d8b060'; }
        c.fillStyle = 'rgba(255,240,200,0.06)'; c.fillRect(rx0, ry0, rw, rh * 0.4);
      } else if (!lite) { const [mx, my] = roomMid(R); c.fillStyle = '#7a2a22'; c.fillRect((mx - 0.5) * T, (my - 0.35) * T, T, T * 0.7); c.strokeStyle = '#c99a48'; c.lineWidth = Math.max(1, T * 0.05); c.strokeRect((mx - 0.42) * T, (my - 0.27) * T, T * 0.84, T * 0.54); }
    },
    gears(c, R, T, lite, P) {   // riveted iron plates, seams and slots; round pits where cogs turn below (RFX_LIVE turns them)
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = lite ? 'rgba(110,84,50,0.16)' : 'rgba(96,80,62,0.34)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => {
        const X = tx * T, Y = ty * T;
        if (!lite) { const g = c.createLinearGradient(X, Y, X + T, Y + T); g.addColorStop(0, 'rgba(190,160,120,0.16)'); g.addColorStop(1, 'rgba(20,14,8,0.2)'); c.fillStyle = g; c.fillRect(X + T * 0.03, Y + T * 0.03, T * 0.94, T * 0.94); }
        c.strokeStyle = 'rgba(16,10,6,0.65)'; c.lineWidth = Math.max(1, T * 0.03); c.strokeRect(X + T * 0.03, Y + T * 0.03, T * 0.94, T * 0.94);
        c.fillStyle = 'rgba(30,20,12,0.7)'; [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].forEach(([u, v]) => { c.beginPath(); c.arc(X + T * u + T * 0.01, Y + T * v + T * 0.01, T * 0.035, 0, Math.PI * 2); c.fill(); });
        c.fillStyle = 'rgba(230,190,130,0.55)'; [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].forEach(([u, v]) => { c.beginPath(); c.arc(X + T * u - T * 0.006, Y + T * v - T * 0.006, T * 0.018, 0, Math.PI * 2); c.fill(); });
        if (!lite && kH(tx, ty, 601) > 0.7) { const v = kH(tx, ty, 602) > 0.5; c.fillStyle = 'rgba(6,4,2,0.8)'; if (v) c.fillRect(X + T * 0.44, Y + T * 0.2, T * 0.12, T * 0.6); else c.fillRect(X + T * 0.2, Y + T * 0.44, T * 0.6, T * 0.12); c.fillStyle = 'rgba(255,170,80,0.25)'; if (v) c.fillRect(X + T * 0.47, Y + T * 0.26, T * 0.06, T * 0.48); else c.fillRect(X + T * 0.26, Y + T * 0.47, T * 0.48, T * 0.06); }   // a slot, a glow deep down
      });
      P.spots.forEach(([px, py, r]) => {   // the pit: a dark round hole with a bronze collar
        const X = px * T, Y = py * T, rr = r * T;
        c.fillStyle = '#6e5232'; c.beginPath(); c.arc(X, Y, rr * 1.12, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(230,190,120,0.6)'; c.lineWidth = Math.max(1, T * 0.02); c.beginPath(); c.arc(X, Y, rr * 1.12, Math.PI * 0.9, Math.PI * 1.8); c.stroke();
        const g = c.createRadialGradient(X, Y, rr * 0.2, X, Y, rr); g.addColorStop(0, '#1a120a'); g.addColorStop(1, '#050302'); c.fillStyle = g; c.beginPath(); c.arc(X, Y, rr, 0, Math.PI * 2); c.fill();
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.fillStyle = '#3a2a18'; c.beginPath(); c.arc(X + Math.cos(a) * rr * 1.06, Y + Math.sin(a) * rr * 1.06, T * 0.02, 0, Math.PI * 2); c.fill(); }
      });
    },
    hush(c, R, T, lite, P) {   // dark felt over the floor: a fine soft grain, seams sewn, nothing shines
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      c.fillStyle = lite ? 'rgba(14,16,24,0.32)' : 'rgba(18,20,30,0.55)'; c.fillRect(x, y, w, h);
      R.tiles.forEach(([tx, ty]) => {
        c.fillStyle = 'rgba(140,150,175,0.09)'; c.beginPath(); for (let k = 0; k < 16; k++) { const px = (tx + kH(tx, ty, 611 + k)) * T, py = (ty + kH(tx, ty, 631 + k)) * T, r = Math.max(0.6, T * 0.012); c.moveTo(px + r, py); c.arc(px, py, r, 0, Math.PI * 2); } c.fill();
        if (kH(tx, ty, 651) > 0.6) { c.fillStyle = 'rgba(0,0,0,0.22)'; rxBlob(c, (tx + 0.5) * T, (ty + 0.5) * T, T * 0.4, T * 0.3, tx * 3 + ty * 37); c.fill(); }
      });
      if (!lite) { c.strokeStyle = 'rgba(120,130,155,0.22)'; c.lineWidth = Math.max(1, T * 0.015); c.setLineDash([Math.max(2, T * 0.05), Math.max(2, T * 0.04)]); c.beginPath();
        for (let ty = R.y0; ty <= R.y1 + 1; ty += 2) { c.moveTo(x, ty * T - T * 0.5); c.lineTo(x + w, ty * T - T * 0.5); } c.stroke(); c.setLineDash([]); }   // the stitched seams of the felt
      rxEdgeGlow(c, R, T, 'rgba(0,0,0,0.38)', 0.8, P.set);
    },
    ice(c, R, T, lite, P) {   // sheet ice: glossy, cracked, frozen bubbles in it, frost feathering in from the walls (1.27.5: the snow drifts are props: rx_drift)
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T;
      const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(200,236,255,0.34)'); g.addColorStop(0.5, 'rgba(150,200,236,0.24)'); g.addColorStop(1, 'rgba(110,160,210,0.3)');
      c.fillStyle = g; c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(235,250,255,0.08)'; R.tiles.forEach(([tx, ty]) => { if ((tx + ty) % 2) c.fillRect(tx * T, ty * T, T, T); });
      c.fillStyle = 'rgba(240,250,255,0.4)'; c.beginPath(); R.tiles.forEach(([tx, ty]) => { for (let k = 0; k < 3; k++) { if (kH(tx, ty, 661 + k) < 0.55) continue; const px = (tx + kH(tx, ty, 664 + k)) * T, py = (ty + kH(tx, ty, 667 + k)) * T, r = T * (0.012 + 0.02 * kH(tx, ty, 670 + k)); c.moveTo(px + r, py); c.arc(px, py, r, 0, Math.PI * 2); } }); c.fill();   // frozen bubbles
      [['rgba(40,70,110,0.35)', 1.012], ['rgba(245,252,255,0.75)', 1]].forEach(([col, off]) => {   // cracks, each with its dark twin
        c.strokeStyle = col; c.lineWidth = Math.max(1, T * 0.018); c.beginPath();
        R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 673) < (lite ? 0.75 : 0.5)) return; rxCrack(c, (tx + kH(tx, ty, 674)) * T * off, (ty + kH(tx, ty, 675)) * T * off, T, 5, tx * 23 + ty * 41, 0.13); });
        c.stroke();
      });
      rxEdgeGlow(c, R, T, 'rgba(240,250,255,0.55)', 0.45, P.set);
      c.strokeStyle = 'rgba(245,252,255,0.6)'; c.lineWidth = Math.max(1, T * 0.014); c.beginPath();   // frost feathers along the walls
      R.tiles.forEach(([tx, ty]) => { [[0, -1], [-1, 0], [0, 1], [1, 0]].forEach(([dx, dy]) => { if (P.set.has((tx + dx) + ',' + (ty + dy))) return;
        for (let k = 0; k < 4; k++) { const u = (k + 0.3 + 0.4 * kH(tx, ty, 680 + k + dx * 3 + dy * 5)) / 4, bx = (dx ? (dx > 0 ? tx + 1 : tx) : tx + u) * T, by = (dy ? (dy > 0 ? ty + 1 : ty) : ty + u) * T, L = T * (0.12 + 0.14 * kH(tx, ty, 690 + k)), ix = -dx * L, iy = -dy * L;
          c.moveTo(bx, by); c.lineTo(bx + ix, by + iy); [0.35, 0.65].forEach(f => { const mx = bx + ix * f, my = by + iy * f, s = L * 0.3; c.moveTo(mx, my); c.lineTo(mx + ix * 0.25 + iy * 0.4 * (s / L), my + iy * 0.25 + ix * 0.4 * (s / L)); c.moveTo(mx, my); c.lineTo(mx + ix * 0.25 - iy * 0.4 * (s / L), my + iy * 0.25 - ix * 0.4 * (s / L)); }); } }); });
      c.stroke();
    }
  };
  // ---------- 1.27.5: the moving floors (every frame, over the cache; c = ctx in floorT, tile pixels) ----------
  const RFX_LIVE = {
    fog(c, R, T, t, lite) {   // thick mist drifting slowly over the floor in layers that cross each other
      const W = R.x1 - R.x0 + 1, H = R.y1 - R.y0 + 1, spr = rxFog(), n = Math.min(8, 3 + Math.round(W * H / 5));
      for (let k = 0; k < n; k++) {
        const sp = (0.012 + 0.008 * (k % 3)) * (k % 2 ? 1 : -1), u = ((t * sp + kH(R.x0, R.y0, 330 + k)) % 1 + 1) % 1, cx = (R.x0 - 1 + (W + 2) * u) * T, cy = (R.y0 + H * (0.08 + 0.84 * kH(R.y0, R.x0, 340 + k)) + Math.sin(t * 0.25 + k) * 0.25) * T, rw = T * (1.2 + 0.8 * kH(k, R.x0, 350)), rh = rw * 0.7;
        c.globalAlpha = lite ? 0.3 : 0.42; c.drawImage(spr, cx - rw, cy - rh, rw * 2, rh * 2);
      }
      c.globalAlpha = 1;
    },
    swamp(c, R, T, t, lite, P) {   // rings spreading on the pools, a bubble coming up now and then
      P.pools.forEach(([px, py, rx, ry, sd], k) => {
        for (let j = 0; j < 2; j++) { const p = ((t * 0.35 + j * 0.5 + kH(sd, j, 701)) % 1), qx = (px + (kH(sd, j + 2, 702) - 0.5) * rx) * T, qy = (py + (kH(sd, j + 2, 703) - 0.5) * ry) * T, r = T * rx * 0.7 * p;
          c.strokeStyle = 'rgba(190,220,170,' + (0.45 * (1 - p)).toFixed(2) + ')'; c.lineWidth = Math.max(1, T * 0.02); c.beginPath(); c.ellipse(qx, qy, r, r * 0.8, 0, 0, Math.PI * 2); c.stroke(); }
        const b = (t * 0.5 + kH(sd, 5, 704)) % 1; if (b < 0.25) { const qx = (px - rx * 0.2) * T, qy = (py + ry * 0.1) * T, r = T * 0.05 * (0.4 + b * 3); c.fillStyle = 'rgba(120,150,90,0.8)'; c.beginPath(); c.arc(qx, qy, r, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(230,250,220,0.8)'; c.beginPath(); c.arc(qx - r * 0.35, qy - r * 0.35, r * 0.3, 0, Math.PI * 2); c.fill(); }
      });
    },
    grotto(c, R, T, t, lite, P) {   // drops landing in the pool and the puddles (rings), the light on the water moving
      P.pools.forEach(([px, py, rx, ry, sd], k) => {
        const n = k === 0 ? 3 : 1;
        for (let j = 0; j < n; j++) { const p = (t * (0.4 + 0.1 * j) + kH(sd, j, 711)) % 1, qx = (px + (kH(sd, j + Math.floor(t * 0.4 + kH(sd, j, 711)), 712) - 0.5) * rx) * T, qy = (py + (kH(sd, j + 7, 713) - 0.5) * ry) * T, r = T * (k ? 0.14 : 0.3) * p;
          c.strokeStyle = 'rgba(210,230,255,' + (0.7 * (1 - p)).toFixed(2) + ')'; c.lineWidth = Math.max(1, T * 0.02); c.beginPath(); c.ellipse(qx, qy, r, r * 0.85, 0, 0, Math.PI * 2); if (r > T * 0.05) c.ellipse(qx, qy, r * 0.55, r * 0.47, 0, 0, Math.PI * 2); c.stroke(); }
        if (k === 0) { const s = 0.5 + 0.5 * Math.sin(t * 0.9); c.globalAlpha = 0.25 + 0.2 * s; c.drawImage(glowSprite('rxgrot', [[0, 'rgba(180,215,255,0.7)'], [1, 'rgba(180,215,255,0)']]), (px - rx * 0.6 + Math.sin(t * 0.5) * rx * 0.3) * T, (py - ry * 0.7) * T, rx * T * 1.2, ry * T * 1.0); c.globalAlpha = 1; }
      });
    },
    crypt(c, R, T, t, lite, P) {   // the runes breathe violet; a low cold mist creeps over the slabs
      P.spots.forEach(([px, py, r, sd], k) => { const a = 0.35 + 0.35 * Math.sin(t * 1.4 + k * 1.9), rr = r * T * 2.1; c.globalAlpha = a; c.drawImage(glowSprite('rxrune', [[0, 'rgba(180,130,255,0.55)'], [0.5, 'rgba(150,100,240,0.18)'], [1, 'rgba(150,100,240,0)']]), px * T - rr, py * T - rr, rr * 2, rr * 2);
        c.strokeStyle = 'rgba(214,190,255,' + (0.5 * a).toFixed(2) + ')'; c.lineWidth = Math.max(1, T * 0.025); c.beginPath(); c.arc(px * T, py * T, r * T, t * 0.4 + k, t * 0.4 + k + 2.2); c.stroke(); });
      c.globalAlpha = 1;
      const W = R.x1 - R.x0 + 1, H = R.y1 - R.y0 + 1, spr = glowSprite('rxcmist', [[0, 'rgba(150,120,200,0.45)'], [1, 'rgba(120,90,180,0)']]);
      for (let k = 0; k < 4; k++) { const u = ((t * 0.015 * (k % 2 ? 1 : -1) + kH(R.x0, k, 715)) % 1 + 1) % 1, cx = (R.x0 - 1 + (W + 2) * u) * T, cy = (R.y0 + H * kH(R.y0, k, 716)) * T, rw = T * 1.4; c.globalAlpha = 0.5; c.drawImage(spr, cx - rw, cy - rw * 0.6, rw * 2, rw * 1.2); }
      c.globalAlpha = 1;
    },
    vault(c, R, T, t, lite) {   // a sheen sweeping over the gold, and coins winking
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T, p = (t * 0.15) % 1.6 - 0.3;
      if (p > -0.2 && p < 1.2) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(Math.max(0, Math.min(1, p - 0.1)), 'rgba(255,230,150,0)'); g.addColorStop(Math.max(0, Math.min(1, p)), 'rgba(255,236,170,0.16)'); g.addColorStop(Math.max(0, Math.min(1, p + 0.1)), 'rgba(255,230,150,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); }
      R.tiles.forEach(([tx, ty], k) => { const q = (t * 0.6 + kH(tx, ty, 721)) % 1; if (q > 0.18 || kH(tx, ty, 521) < 0.45) return; const px = (tx + 0.15 + 0.7 * kH(tx, ty, 524)) * T - T * 0.02, py = (ty + 0.15 + 0.7 * kH(tx, ty, 527)) * T - T * 0.02, s = T * 0.12 * Math.sin(q / 0.18 * Math.PI);
        c.strokeStyle = 'rgba(255,250,220,0.95)'; c.lineWidth = Math.max(1, T * 0.018); c.beginPath(); c.moveTo(px - s, py); c.lineTo(px + s, py); c.moveTo(px, py - s); c.lineTo(px, py + s); c.stroke(); });
    },
    haven(c, R, T, t, lite, P) {   // warm candlelight breathing on the floor round each candle, and over the middle of the rug
      const spr = glowSprite('rxwarm', [[0, 'rgba(255,214,140,0.4)'], [0.5, 'rgba(255,190,110,0.12)'], [1, 'rgba(255,180,100,0)']]);
      P.props.forEach(pp => { if (pp.t !== 'rx_candlesH' || !rfxPropOk(pp)) return; const f = 0.85 + 0.15 * Math.sin(t * 7 + pp.seed) * Math.sin(t * 4.3 + pp.seed * 2), r = T * 1.1 * f; c.drawImage(spr, pp.x * T - r, pp.y * T - r, r * 2, r * 2); });
      { const [mx, my] = roomMid(R), r = T * Math.max(R.x1 - R.x0 + 1, R.y1 - R.y0 + 1) * (0.5 + 0.03 * Math.sin(t * 1.2)); c.globalAlpha = lite ? 0.35 : 0.55; c.drawImage(spr, mx * T - r, my * T - r, r * 2, r * 2); c.globalAlpha = 1; }
    },
    // 1.27.5: the gears' cogs turn in real pits now, in screen space (rxPit, from rfxSolid)
    hush(c, R, T, t, lite) {   // a ring of sound starts, but the felt swallows it: it grows a little, breaks up and is gone
      R.tiles.forEach(([tx, ty], k) => {
        if (kH(tx, ty, 731) > (lite ? 0.25 : 0.4)) return;
        const p = (t * 0.32 + kH(tx, ty, 732)) % 1, px = (tx + 0.5) * T, py = (ty + 0.5) * T, r = T * (0.12 + 0.5 * Math.sqrt(p)), a = 0.5 * (1 - p) * (1 - p);
        c.strokeStyle = 'rgba(170,184,210,' + a.toFixed(2) + ')'; c.lineWidth = Math.max(1, T * 0.03 * (1 - p)); c.setLineDash([Math.max(1, T * 0.1 * (1 - p)), Math.max(1, T * 0.06 + T * 0.2 * p)]);
        c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.stroke();
      });
      c.setLineDash([]);
    },
    ice(c, R, T, t, lite) {   // light gliding over the ice in long streaks, a glint winking on a crack
      const x = R.x0 * T, y = R.y0 * T, w = (R.x1 - R.x0 + 1) * T, h = (R.y1 - R.y0 + 1) * T, p = (t * 0.12) % 1.5 - 0.25;
      if (p > -0.2 && p < 1.2) { const g = c.createLinearGradient(x, y + h, x + w, y); g.addColorStop(Math.max(0, Math.min(1, p - 0.08)), 'rgba(255,255,255,0)'); g.addColorStop(Math.max(0, Math.min(1, p)), 'rgba(240,250,255,0.2)'); g.addColorStop(Math.max(0, Math.min(1, p + 0.08)), 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); }
      R.tiles.forEach(([tx, ty]) => { const q = (t * 0.4 + kH(tx, ty, 741)) % 1; if (q > 0.12) return; const px = (tx + kH(tx, ty, 674)) * T, py = (ty + kH(tx, ty, 675)) * T, s = T * 0.14 * Math.sin(q / 0.12 * Math.PI);
        c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = Math.max(1, T * 0.018); c.beginPath(); c.moveTo(px - s, py); c.lineTo(px + s, py); c.moveTo(px, py - s * 0.7); c.lineTo(px, py + s * 0.7); c.stroke(); });
    }
  };
  const rxGearAt = (c, cx, cy, r, n, a0, body, edge, hole) => rxGear(cx, cy, r, n, a0, body, edge, hole, c);   // rxGear on any context
  // ---------- 1.27.5: the particles in the air (screen space; ph(k, speed) = a phase 0..1 of the clock for particle k) ----------
  const RFX_AIR = {
    fog(R, T, t, P, lite, ph, seed, W, H) {   // a low bank rolling just over the floor; puffs boiling up out of the vents
      const spr = rxFog(), n = lite ? 5 : Math.min(12, 5 + Math.round(W * H / 4));
      for (let k = 0; k < n; k++) { const p = ph(k, 0.02 + 0.006 * (k % 3)), sx = R.x0 - 0.3 + (W + 0.6) * p, sy = R.y0 + 0.3 + (H - 0.6) * kH(seed, k, 361), q = W2S(sx, sy, 0.12 + 0.3 * kH(seed, k, 365) + 0.06 * Math.sin(t * 0.5 + k)), rw = T * (0.9 + 0.6 * kH(seed, k, 362)), a = Math.sin(p * Math.PI);
        ctx.globalAlpha = (lite ? 0.45 : 0.7) * a; ctx.drawImage(spr, q[0] - rw, q[1] - rw * 0.45, rw * 2, rw * 0.9); }
      P.props.forEach(pp => { if (pp.t !== 'rx_vent' || !rfxPropOk(pp)) return;
        const ms = rxMist(); for (let k = 0; k < 5; k++) { const p = ph(k + pp.seed * 3, 0.2), q = W2S(pp.x + Math.sin(p * 4 + k) * 0.12 * p, pp.y, 0.05 + p * 1.2), r = T * (0.1 + 0.36 * p); ctx.globalAlpha = (1 - p) * Math.min(1, p * 6); ctx.drawImage(ms, q[0] - r, q[1] - r, r * 2, r * 2); } });
      for (let k = 0; k < 3; k++) { const p = ph(k + 20, 0.07), sx = R.x0 + 0.4 + (W - 0.8) * kH(seed, k, 363), sy = R.y0 + 0.4 + (H - 0.8) * kH(seed, k, 364), q = W2S(sx + Math.sin(t * 0.4 + k) * 0.2, sy, 0.3 + p * 0.9), r = T * (0.25 + 0.3 * p); ctx.globalAlpha = 0.4 * Math.sin(p * Math.PI); ctx.drawImage(spr, q[0] - r, q[1] - r * 0.7, r * 2, r * 1.4); }
    },
    swamp(R, T, t, P, lite, ph, seed, W, H) {   // bubbles rising off the pools and bursting, midges over the reeds, a green gas
      P.pools.forEach(([px, py, rx, ry, sd], k) => { if (k > 5) return; const p = ph(k * 3 + 1, 0.4), bx = px + (kH(sd, 1, 751) - 0.5) * rx, by = py + (kH(sd, 2, 752) - 0.5) * ry;
        if (p < 0.75) { const q = rxDot(bx, by, 0.02 + p * 0.22, Math.max(1.2, T * 0.035), 'rgba(170,200,130,0.7)'); ctx.fillStyle = 'rgba(240,255,230,0.8)'; ctx.fillRect(q[0] - T * 0.012, q[1] - T * 0.012, Math.max(1, T * 0.012), Math.max(1, T * 0.012)); }
        else { const q = W2S(bx, by, 0.2), s = T * 0.09 * (p - 0.75) / 0.25; ctx.strokeStyle = 'rgba(220,240,200,' + (0.8 * (1 - (p - 0.75) / 0.25)).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); for (let j = 0; j < 5; j++) { const a = j * 1.256; ctx.moveTo(q[0] + Math.cos(a) * s * 0.5, q[1] + Math.sin(a) * s * 0.5); ctx.lineTo(q[0] + Math.cos(a) * s, q[1] + Math.sin(a) * s); } ctx.stroke(); } });
      let m = 0; P.props.forEach(pp => { if (pp.t !== 'rx_reeds' || m++ > 2 || !rfxPropOk(pp)) return; for (let k = 0; k < 5; k++) { const a = t * (3 + k * 0.7) + k * 2 + pp.seed; rxDot(pp.x + Math.cos(a) * 0.18, pp.y + Math.sin(a * 1.3) * 0.12, 0.6 + 0.15 * Math.sin(a * 0.8), Math.max(1, T * 0.018), 'rgba(16,20,10,0.85)'); } });
      const spr = glowSprite('rxgas', [[0, 'rgba(160,210,100,0.5)'], [1, 'rgba(160,210,100,0)']]);
      for (let k = 0; k < (lite ? 1 : 3); k++) { const pl = P.pools[k % Math.max(1, P.pools.length)]; if (!pl) break; const p = ph(k + 9, 0.08), q = W2S(pl[0] + Math.sin(p * 3 + k) * 0.25, pl[1], 0.1 + p * 1.0), r = T * (0.2 + 0.25 * p); ctx.globalAlpha = 0.5 * Math.sin(p * Math.PI); ctx.drawImage(spr, q[0] - r, q[1] - r, r * 2, r * 2); }
    },
    grotto(R, T, t, P, lite, ph, seed, W, H) {   // drops falling from the roof into the pool (their ring is RFX_LIVE), glints on the crystals, a cold breath
      P.pools.forEach(([px, py, rx, ry, sd], k) => { if (k > 4) return; const n = k === 0 ? 3 : 1;
        for (let j = 0; j < n; j++) { const f = ((t * (0.4 + 0.1 * j) + kH(sd, j, 711) + 0.35) % 1); if (f > 0.35) continue;   // the 0.35 before the ring: falling
          const z = 1.9 * (1 - f / 0.35), qx = px + (kH(sd, j + Math.floor(t * (0.4 + 0.1 * j) + kH(sd, j, 711) + 0.35), 712) - 0.5) * rx, qy = py + (kH(sd, j + 7, 713) - 0.5) * ry, q = W2S(qx, qy, z);
          ctx.fillStyle = 'rgba(200,225,255,0.9)'; ctx.beginPath(); ctx.ellipse(q[0], q[1], Math.max(1, T * 0.02), Math.max(1.5, T * 0.045), 0, 0, Math.PI * 2); ctx.fill(); } });
      P.props.forEach(pp => { if (pp.t !== 'rx_gcrystal' || !rfxPropOk(pp)) return; const p = ph(pp.seed * 5, 0.5); if (p < 0.2) rxStar(W2S(pp.x - 0.04, pp.y, 0.3 * pp.s), T * 0.1 * Math.sin(p / 0.2 * Math.PI), 'rgba(230,240,255,0.95)'); });
      const spr = rxMist(); for (let k = 0; k < 2; k++) { const pl = P.pools[0]; if (!pl) break; const p = ph(k + 30, 0.06), q = W2S(pl[0] + (k - 0.5) * pl[2], pl[1], 0.1 + p * 0.6), r = T * (0.3 + 0.3 * p); ctx.globalAlpha = 0.3 * Math.sin(p * Math.PI); ctx.drawImage(spr, q[0] - r, q[1] - r * 0.6, r * 2, r * 1.2); }
    },
    crypt(R, T, t, P, lite, ph, seed, W, H) {   // violet wisps lifting off the runes, dust drifting in the dark
      const spr = glowSprite('rxwisp', [[0, 'rgba(230,210,255,0.95)'], [0.35, 'rgba(180,140,255,0.4)'], [1, 'rgba(160,120,255,0)']]);
      P.spots.forEach(([px, py], k) => { for (let j = 0; j < 2; j++) { const p = ph(k * 2 + j, 0.09), q = W2S(px + Math.sin(t * 0.8 + k + j * 3) * 0.2, py, 0.1 + p * 1.4), r = T * (0.16 - 0.06 * p); ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85; ctx.drawImage(spr, q[0] - r, q[1] - r, r * 2, r * 2); } });
      ctx.globalAlpha = 1;
      for (let k = 0; k < 6; k++) { const p = ph(k + 40, 0.04), sx = R.x0 + 0.3 + (W - 0.6) * kH(seed, k, 771), sy = R.y0 + 0.3 + (H - 0.6) * kH(seed, k, 772); rxDot(sx + Math.sin(t * 0.3 + k) * 0.15, sy, 0.2 + 1.2 * Math.sin(p * Math.PI), Math.max(1, T * 0.014), 'rgba(220,200,250,0.45)'); }
    },
    vault(R, T, t, P, lite, ph, seed, W, H) {   // gold dust rising and turning in the air, stars winking over the heaps
      for (let k = 0; k < (lite ? 5 : 10); k++) { const p = ph(k, 0.06), sx = R.x0 + 0.3 + (W - 0.6) * kH(seed, k, 781) + Math.sin(t * 0.7 + k) * 0.12, sy = R.y0 + 0.3 + (H - 0.6) * kH(seed, k, 782), tw = 0.5 + 0.5 * Math.sin(t * 5 + k * 2);
        rxDot(sx, sy, 0.1 + p * 1.5, Math.max(1, T * (0.012 + 0.012 * tw)), 'rgba(255,' + (210 + 30 * tw | 0) + ',120,' + (0.8 * Math.sin(p * Math.PI)).toFixed(2) + ')'); }
      P.props.forEach(pp => { if ((pp.t !== 'rx_coins' && pp.t !== 'rx_chest') || !rfxPropOk(pp)) return; const p = ph(pp.seed * 7, 0.45); if (p < 0.22) { const q = W2S(pp.x + (pp.v - 1.5) * 0.04, pp.y, 0.3 * pp.s), s = T * 0.13 * Math.sin(p / 0.22 * Math.PI); ctx.drawImage(glowSprite('rxglint', [[0, 'rgba(255,240,180,0.8)'], [1, 'rgba(255,220,120,0)']]), q[0] - s * 1.5, q[1] - s * 1.5, s * 3, s * 3); rxStar(q, s, 'rgba(255,252,230,0.95)'); } });
    },
    haven(R, T, t, P, lite, ph, seed, W, H) {   // sparks lifting off the candles, warm dust floating slowly in the light
      P.props.forEach(pp => { if (pp.t !== 'rx_candlesH' || !rfxPropOk(pp)) return; for (let k = 0; k < 3; k++) { const p = ph(k + pp.seed * 3, 0.35), q = W2S(pp.x + 0.05 + Math.sin(p * 6 + k) * 0.06, pp.y, 0.5 * pp.s + p * 0.9); ctx.fillStyle = 'rgba(255,' + (200 + 40 * (1 - p) | 0) + ',120,' + (0.9 * (1 - p)).toFixed(2) + ')'; ctx.fillRect(q[0], q[1], Math.max(1, T * 0.022), Math.max(1, T * 0.022)); } });
      for (let k = 0; k < (lite ? 4 : 8); k++) { const p = ph(k + 50, 0.03), sx = R.x0 + 0.3 + (W - 0.6) * kH(seed, k, 791) + Math.sin(t * 0.25 + k) * 0.25, sy = R.y0 + 0.3 + (H - 0.6) * kH(seed, k, 792); rxDot(sx, sy, 0.3 + 1.1 * Math.sin(p * Math.PI), Math.max(1, T * 0.016), 'rgba(255,236,190,' + (0.55 * Math.sin(p * Math.PI)).toFixed(2) + ')'); }
    },
    gears(R, T, t, P, lite, ph, seed, W, H) {   // steam hissing out of the pipes in puffs, sparks off the cogs now and then
      const spr = glowSprite('rxsteam', [[0, 'rgba(236,236,236,0.7)'], [0.5, 'rgba(220,220,220,0.25)'], [1, 'rgba(220,220,220,0)']]);
      P.props.forEach(pp => { if (pp.t !== 'rx_pipe' || !rfxPropOk(pp)) return; const burst = ph(pp.seed * 3, 0.18);
        if (burst < 0.4) for (let k = 0; k < 4; k++) { const p = ((burst / 0.4) + k * 0.25) % 1, q = W2S(pp.x + 0.12 + p * 0.35, pp.y, 0.62 * pp.s + p * 0.45), r = T * (0.07 + 0.25 * p); ctx.globalAlpha = 0.8 * (1 - p); ctx.drawImage(spr, q[0] - r, q[1] - r, r * 2, r * 2); } });
      ctx.globalAlpha = 1;
      P.spots.forEach(([px, py], k) => { const p = ph(k * 5 + 3, 0.5); if (p > 0.3) return; for (let j = 0; j < 4; j++) { const a = j * 1.3 + k, d = p / 0.3, q = W2S(px + Math.cos(a) * 0.2 * d, py + Math.sin(a) * 0.12 * d, 0.05 + 0.4 * Math.sin(d * Math.PI) * (0.6 + 0.4 * (j % 2))); ctx.fillStyle = 'rgba(255,' + (210 - 80 * d | 0) + ',90,' + (1 - d).toFixed(2) + ')'; ctx.fillRect(q[0], q[1], Math.max(1, T * 0.022), Math.max(1, T * 0.022)); } });
      for (let k = 0; k < (lite ? 1 : 2); k++) { const s = P.spots[k]; if (!s) break; const p = ph(k + 60, 0.15), q = W2S(s[0] + Math.sin(p * 4) * 0.1, s[1], 0.05 + p * 0.9), r = T * (0.12 + 0.3 * p); ctx.globalAlpha = 0.45 * Math.sin(p * Math.PI); ctx.drawImage(spr, q[0] - r, q[1] - r, r * 2, r * 2); }   // warm air off the pit
    },
    hush(R, T, t, P, lite, ph, seed, W, H) {   // dust sinking slowly through the still air, threads of smoke from snuffed candles
      for (let k = 0; k < (lite ? 4 : 9); k++) { const p = ph(k, 0.025), sx = R.x0 + 0.3 + (W - 0.6) * kH(seed, k, 801), sy = R.y0 + 0.3 + (H - 0.6) * kH(seed, k, 802); rxDot(sx + Math.sin(p * 3 + k) * 0.05, sy, 1.6 * (1 - p), Math.max(1, T * 0.014), 'rgba(170,182,205,' + (0.5 * Math.sin(p * Math.PI)).toFixed(2) + ')'); }
      P.props.forEach(pp => { if (pp.t !== 'rx_snuffed' || !rfxPropOk(pp)) return; ctx.strokeStyle = 'rgba(170,176,190,0.35)'; ctx.lineWidth = Math.max(1, T * 0.02); ctx.beginPath();
        for (let j = 0; j <= 8; j++) { const z = 0.2 * pp.s + j * 0.11, q = W2S(pp.x + Math.sin(j * 0.9 - t * 1.2 + pp.seed) * 0.04 * j / 4, pp.y, z); j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke(); });
    },
    ice(R, T, t, P, lite, ph, seed, W, H) {   // snow drifting down, a cold vapour lying low, the crystals glinting
      for (let k = 0; k < (lite ? 6 : 12); k++) { const p = ph(k, 0.05), sx = R.x0 + 0.2 + (W - 0.4) * kH(seed, k, 811) + Math.sin(t * 0.9 + k * 1.7) * 0.15, sy = R.y0 + 0.2 + (H - 0.4) * kH(seed, k, 812); rxDot(sx, sy, 1.8 * (1 - p), Math.max(1, T * (0.016 + 0.01 * (k % 2))), 'rgba(245,250,255,' + (0.85 * Math.min(1, (1 - p) * 4) * Math.min(1, p * 8)).toFixed(2) + ')'); }
      const spr = glowSprite('rxcold', [[0, 'rgba(210,236,255,0.5)'], [1, 'rgba(200,230,255,0)']]);
      for (let k = 0; k < (lite ? 2 : 4); k++) { const p = ph(k + 70, 0.03), sx = R.x0 - 0.3 + (W + 0.6) * p, sy = R.y0 + 0.3 + (H - 0.6) * kH(seed, k, 813), q = W2S(sx, sy, 0.1), rw = T * 0.9; ctx.globalAlpha = 0.5 * Math.sin(p * Math.PI); ctx.drawImage(spr, q[0] - rw, q[1] - rw * 0.35, rw * 2, rw * 0.7); }
      ctx.globalAlpha = 1;
      P.props.forEach(pp => { if (pp.t !== 'rx_shard' || !rfxPropOk(pp)) return; const p = ph(pp.seed * 5, 0.4); if (p < 0.2) rxStar(W2S(pp.x - 0.03, pp.y, 0.45 * pp.s), T * 0.12 * Math.sin(p / 0.2 * Math.PI), 'rgba(255,255,255,0.95)'); });
    }
  };
  // ---------- 1.27.5: solid bodies for the effects' things (every face lit by its normal: top light, south mid, east dark) ----------
  // They draw on rc: the screen, or for a moment the picture of a prop's still part (rxKeep), so a solid prop costs one stamp a frame.
  let rc = ctx;
  function rxShadow(x, y, rx, ry, a) { const p = W2S(x, y, 0), T = cam.s; rc.fillStyle = 'rgba(0,0,0,' + (a || 0.45) + ')'; rc.beginPath(); rc.ellipse(p[0], p[1], rx * T, ry * T * SP, 0, 0, Math.PI * 2); rc.fill(); }
  const rxLine = (a, b, col, w) => { rc.strokeStyle = col; rc.lineWidth = w; rc.beginPath(); rc.moveTo(a[0], a[1]); rc.lineTo(b[0], b[1]); rc.stroke(); };
  function rxBall(cx, cy, z, r, col) {   // pBall on rc
    const T = cam.s, p = W2S(cx, cy, z + r * 0.9), rr = T * r;
    rc.fillStyle = col; rc.beginPath(); rc.arc(p[0], p[1], rr, 0, Math.PI * 2); rc.fill();
    rc.fillStyle = 'rgba(0,0,0,0.28)'; rc.beginPath(); rc.arc(p[0], p[1], rr, -0.3, Math.PI * 0.85); rc.arc(p[0] - rr * 0.25, p[1] - rr * 0.25, rr * 0.85, Math.PI * 0.85, -0.3, true); rc.fill();
    rc.fillStyle = 'rgba(255,255,255,0.32)'; rc.beginPath(); rc.arc(p[0] - rr * 0.35, p[1] - rr * 0.38, rr * 0.28, 0, Math.PI * 2); rc.fill();
    return p;
  }
  function rxIso(cx, cy, w, d, h, top, south, east, z0) {   // isoBox on rc
    z0 = z0 || 0; const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2, z1 = z0 + h, q = (P, c) => { rc.fillStyle = c; rc.beginPath(); P.forEach((a, k) => k ? rc.lineTo(a[0], a[1]) : rc.moveTo(a[0], a[1])); rc.closePath(); rc.fill(); };
    q([W2S(x0, y1, z0), W2S(x1, y1, z0), W2S(x1, y1, z1), W2S(x0, y1, z1)], south); q([W2S(x1, y0, z0), W2S(x1, y1, z0), W2S(x1, y1, z1), W2S(x1, y0, z1)], east); q([W2S(x0, y0, z1), W2S(x1, y0, z1), W2S(x1, y1, z1), W2S(x0, y1, z1)], top);
  }
  // the still part of a prop, painted once per type, variant, size, zoom step and tilt into a picture (as it looks under drawProp's
  // scale), then stamped at its foot every frame; what moves (flames, glows, sway, turning cogs) is drawn live by the prop itself
  const RXC = new Map(), RXH = { rx_pipe: 1.05, rx_stalag: 0.82, rx_shard: 0.72, rx_snag: 0.72, rx_tomb: 0.64, rx_lever: 0.6, rx_candlesV: 0.62, rx_candlesH: 0.62 };
  function rxKeep(p, T, draw) {
    const k = p.t + '|' + p.v + '|' + Math.round(p.s * 20) + '|' + Math.round(T * DPR / 3) + '|' + Math.round(SP * 200);
    let e = RXC.get(k);
    if (!e) {
      const D = DPR * PROP_K, up = (RXH[p.t] || 0.56) * T, hw = 0.46 * T, dn = 0.32 * T, c = document.createElement('canvas'); c.width = Math.ceil(2 * hw * D); c.height = Math.ceil((up + dn) * D);
      const g = c.getContext('2d'), f = W2S(p.x, p.y, 0); g.setTransform(D, 0, 0, D, D * (hw - f[0]), D * (up - f[1]));
      rc = g; try { draw(); } finally { rc = ctx; }
      if (RXC.size > 160) RXC.clear(); e = { c, T, hw, up, dn }; RXC.set(k, e);
    }
    const f = W2S(p.x, p.y, 0), sc = T / e.T; ctx.drawImage(e.c, f[0] - e.hw * sc, f[1] - e.up * sc, 2 * e.hw * sc, (e.up + e.dn) * sc);
  }
  const RXS = new Map();
  function rxShade(hex, f) {   // '#rrggbb' scaled by f, cached (f in steps of 0.05)
    const q = Math.round(f * 20), k = hex + q; let s = RXS.get(k); if (s) return s;
    const n = parseInt(hex.slice(1, 7), 16), c = v => Math.min(255, Math.round(v * q / 20));
    s = 'rgb(' + c(n >> 16) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')'; if (RXS.size > 800) RXS.clear(); RXS.set(k, s); return s;
  }
  let rxLift = 0;   // > 0: a clear body (ice, crystal), lit through, its shade faces less dark
  const rxLit = (nx, ny, nz) => rxLift + (1 - rxLift) * 0.42 + (1 - rxLift) * 0.68 * Math.max(0, (-0.43 * nx + 0.3 * ny + 0.85 * nz) / (Math.hypot(nx, ny, nz) || 1));   // the light from the upper left
  const rxVz = () => Math.SQRT2 * SP / CP;   // with (1, 1, rxVz) the way to the camera
  function rxSolid(P, F, col, alt, two) {   // a convex body: P world points [x, y, z], F faces (index lists); a face is drawn when it looks at the camera (two: always, turned to it)
    let cx = 0, cy = 0, cz = 0; for (let i = 0; i < P.length; i++) { cx += P[i][0]; cy += P[i][1]; cz += P[i][2]; } cx /= P.length; cy /= P.length; cz /= P.length;
    const vz = rxVz(), S = P.map(p => W2S(p[0], p[1], p[2]));
    for (let i = 0; i < F.length; i++) {
      const f = F[i]; let nx = 0, ny = 0, nz = 0, mx = 0, my = 0, mz = 0;
      for (let j = 0; j < f.length; j++) { const a = P[f[j]], b = P[f[(j + 1) % f.length]]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); mx += a[0]; my += a[1]; mz += a[2]; }
      if (!two && nx * (mx / f.length - cx) + ny * (my / f.length - cy) + nz * (mz / f.length - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      let v = nx + ny + nz * vz; if (two && v < 0) { nx = -nx; ny = -ny; nz = -nz; v = -v; }
      if (v <= 1e-9) continue;
      rc.fillStyle = rxShade((alt && alt[i]) || col, rxLit(nx, ny, nz)); rc.beginPath();
      for (let j = 0; j < f.length; j++) { const q = S[f[j]]; j ? rc.lineTo(q[0], q[1]) : rc.moveTo(q[0], q[1]); }
      rc.closePath(); rc.fill();
    }
    return S;
  }
  // a turned body (prof [[r, z], ...] going up, n sides from angle a0, leaning lx, ly per unit of height): its sides as they face the
  // camera, then a lid on top (cap: a colour, false for none). Drawn ring by ring from the bottom, so an overhang hides what is under it.
  function rxLathe(cx, cy, z0, prof, n, col, a0, cap, lx, ly) {
    const m = prof.length, R = []; let mr = 0; for (let i = 0; i < m; i++) mr = Math.max(mr, prof[i][0]);
    const px = mr * cam.s; if (px < 2.5) n = Math.min(n, 4); else if (px < 5) n = Math.min(n, 6);   // small on screen: fewer sides
    const vz = rxVz(), da = Math.PI * 2 / n;
    a0 = a0 || 0; lx = lx || 0; ly = ly || 0;
    for (let i = 0; i < m; i++) { const r = prof[i][0], z = prof[i][1], ox = cx + lx * z, oy = cy + ly * z, ring = []; for (let k = 0; k < n; k++) { const a = a0 + k * da; ring.push(W2S(ox + Math.cos(a) * r, oy + Math.sin(a) * r, z0 + z)); } R.push(ring); }
    for (let i = 0; i < m - 1; i++) {
      const dz = prof[i + 1][1] - prof[i][1], dr = prof[i + 1][0] - prof[i][0], A = R[i], B = R[i + 1];
      for (let k = 0; k < n; k++) {
        const am = a0 + (k + 0.5) * da, ca = Math.cos(am), sa = Math.sin(am);
        if ((ca + sa) * dz - dr * vz <= 0) continue;
        const k1 = (k + 1) % n; rc.fillStyle = rxShade(col, rxLit(ca * dz, sa * dz, -dr));
        rc.beginPath(); rc.moveTo(A[k][0], A[k][1]); rc.lineTo(A[k1][0], A[k1][1]); rc.lineTo(B[k1][0], B[k1][1]); rc.lineTo(B[k][0], B[k][1]); rc.closePath(); rc.fill();
      }
    }
    if (cap !== false && prof[m - 1][0] > 0) { const L = R[m - 1]; rc.fillStyle = cap || rxShade(col, 0.97); rc.beginPath(); L.forEach((q, k) => k ? rc.lineTo(q[0], q[1]) : rc.moveTo(q[0], q[1])); rc.closePath(); rc.fill(); }
    return R;
  }
  function rxRod(a, b, r0, r1, lit, dark, cap) {   // a round rod from a to b (world [x, y, z]), r0 to r1 thick: a lit half to the left, a shaded one, a round end at b
    const T = cam.s, A = W2S(a[0], a[1], a[2]), B = W2S(b[0], b[1], b[2]), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
    let px = -dy / L, py = dx / L; if (px > 0 || (px === 0 && py > 0)) { px = -px; py = -py; }
    const w0 = Math.max(0.6, r0 * T), w1 = Math.max(0.4, r1 * T);
    rc.fillStyle = dark; rc.beginPath(); rc.moveTo(A[0] + px * w0, A[1] + py * w0); rc.lineTo(B[0] + px * w1, B[1] + py * w1); rc.lineTo(B[0] - px * w1, B[1] - py * w1); rc.lineTo(A[0] - px * w0, A[1] - py * w0); rc.closePath(); rc.fill();
    rc.fillStyle = lit; rc.beginPath(); rc.moveTo(A[0] + px * w0, A[1] + py * w0); rc.lineTo(B[0] + px * w1, B[1] + py * w1); rc.lineTo(B[0] - px * w1 * 0.15, B[1] - py * w1 * 0.15); rc.lineTo(A[0] - px * w0 * 0.15, A[1] - py * w0 * 0.15); rc.closePath(); rc.fill();
    if (cap && w1 > 0.8) { rc.fillStyle = cap; rc.beginPath(); rc.ellipse(B[0], B[1], w1, w1 * 0.8, 0, 0, Math.PI * 2); rc.fill(); }
    return B;
  }
  function rxEgg(x, y, z, rx, ry, col, sh) {   // a rounded body (screen half sizes rx, ry in tiles) centred z over the floor: shaded under the right, a gleam up left
    const T = cam.s, p = W2S(x, y, z), a = rx * T, b = ry * T;
    rc.fillStyle = col; rc.beginPath(); rc.ellipse(p[0], p[1], a, b, 0, 0, Math.PI * 2); rc.fill();
    rc.fillStyle = sh || 'rgba(0,0,0,0.3)'; rc.beginPath(); rc.ellipse(p[0], p[1], a, b, 0, -0.3, Math.PI * 0.85); rc.ellipse(p[0] - a * 0.22, p[1] - b * 0.25, a * 0.86, b * 0.84, 0, Math.PI * 0.85, -0.3, true); rc.fill();
    rc.fillStyle = 'rgba(255,255,255,0.28)'; rc.beginPath(); rc.ellipse(p[0] - a * 0.35, p[1] - b * 0.4, a * 0.26, b * 0.22, 0, 0, Math.PI * 2); rc.fill();
    return p;
  }
  const rxRock = (x, y, r, h, col, seed, z0) => rxLathe(x, y, z0 || 0, [[r, 0], [r * 0.88, h * 0.5], [r * 0.42, h]], 5 + (seed & 1), col, seed * 1.7);   // a faceted lump of stone
  const RXBF = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  function rxBox(cx, cy, z0, w, d, h, tw, td, col, ang, alt) {   // a block (its top tw by td: narrower makes a tapered one), turned by ang
    const c = Math.cos(ang || 0), s = Math.sin(ang || 0), P = [];
    [[w, d, z0], [tw, td, z0 + h]].forEach(([a, b, z]) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => { const u = i * a / 2, v = j * b / 2; P.push([cx + u * c - v * s, cy + u * s + v * c, z]); }));
    return rxSolid(P, RXBF, col, alt);
  }
  function rxHCyl(a, b, r, n, col, cap) {   // a round body lying from a to b (world [x, y, z]), r thick, n sides; its end lids lit too (cap: their colour)
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], L = Math.hypot(ux, uy, uz) || 1;
    let e1 = [-uy / L, ux / L, 0]; const l1 = Math.hypot(e1[0], e1[1]); if (l1 < 1e-6) e1 = [1, 0, 0]; else e1 = [e1[0] / l1, e1[1] / l1, 0];
    let e2 = [(uy * e1[2] - uz * e1[1]) / L, (uz * e1[0] - ux * e1[2]) / L, (ux * e1[1] - uy * e1[0]) / L]; if (e2[2] < 0) e2 = [-e2[0], -e2[1], -e2[2]];
    const P = [], F = [], alt = [], c0 = [], c1 = [];
    for (let e = 0; e < 2; e++) { const o = e ? b : a; for (let k = 0; k < n; k++) { const t = k * Math.PI * 2 / n, cc = Math.cos(t) * r, ss = Math.sin(t) * r; P.push([o[0] + e1[0] * cc + e2[0] * ss, o[1] + e1[1] * cc + e2[1] * ss, o[2] + e1[2] * cc + e2[2] * ss]); } }
    for (let k = 0; k < n; k++) { const k1 = (k + 1) % n; F.push([k, k1, n + k1, n + k]); c0.push(k); c1.push(n + k); }
    F.push(c0, c1); if (cap) { alt[n] = cap; alt[n + 1] = cap; }
    return rxSolid(P, F, col, alt);
  }
  function rxPlane(ax, ay, bx, by, z0, z1) {   // faceMap on top of the transform in force (drawProp scales a prop round its foot)
    const A = W2S(ax, ay, z1), B = W2S(bx, by, z1), C = W2S(ax, ay, z0); rc.transform(B[0] - A[0], B[1] - A[1], C[0] - A[0], C[1] - A[1], A[0], A[1]);
  }
  const rxWP = (F, u, d, z) => { const w = F.W(u, d); return [w[0], w[1], z]; };   // a point on a wall's frame, in the world
  function rxXW(F, pts, d0, d1, col, alt) {   // a flat shape [[u, z], ...] (convex) standing out of a wall face from d0 to d1: a slab with its edges
    const n = pts.length, P = [], Fc = [[], []];
    pts.forEach(([u, z], k) => { P.push(rxWP(F, u, d0, z)); Fc[0].push(k); }); pts.forEach(([u, z], k) => { P.push(rxWP(F, u, d1, z)); Fc[1].push(n + k); });
    for (let k = 0; k < n; k++) { const k1 = (k + 1) % n; Fc.push([k, k1, n + k1, n + k]); }
    return rxSolid(P, Fc, col, alt);
  }
  const RXCA = [[-0.07, 0.03, 0.26], [0.06, -0.03, 0.4], [0.03, 0.08, 0.18]], RXCU = [[-0.07, 0.03, 0.18], [0.06, -0.03, 0.12]];
  function rxCandles(p, T, t, wax, dish, flame, glow, unlit) {   // candles on a little dish: each one a turned stick with a dripped top, its flame (or a black wick)
    const s = p.s, L = unlit ? RXCU : RXCA.slice(0, 2 + (p.v % 2));
    rxKeep(p, T, () => { rxShadow(p.x, p.y, 0.18, 0.11, 0.32);
    rxLathe(p.x, p.y, 0, [[0.15 * s, 0], [0.165 * s, 0.022], [0.15 * s, 0.032]], 10, dish, 0.2);
    rxLathe(p.x, p.y, 0.032, [[0.1 * s, 0], [0.085 * s, 0.01]], 9, wax, 0.5, rxShade(wax, 0.92));   // the wax run together on it
    L.forEach(([u, v, h], k) => {   // (back ones first)
      const x = p.x + u * s, y = p.y + v * s, H = h * s, r = 0.042 * s;
      rxLathe(x, y, 0.04, [[r, 0], [r, H], [r * 0.82, H + 0.014]], 7, wax, 0.3 + k);
      if (T >= 24) rxRod([x - r * 0.75, y + r * 0.4, 0.04 + H], [x - r * 0.8, y + r * 0.5, 0.04 + H * 0.55], 0.012, 0.009, rxShade(wax, 1.05), rxShade(wax, 0.8), rxShade(wax, 0.95));   // a drip down its lit side
      const a = W2S(x, y, 0.04 + H + 0.012);
      if (unlit) rxLine(a, [a[0] + T * 0.01, a[1] - T * 0.04], '#141414', Math.max(1, T * 0.014));
    }); });
    if (!unlit) L.forEach(([u, v, h], k) => { const a = W2S(p.x + u * s, p.y + v * s, 0.04 + h * s + 0.012); pFlame(a[0], a[1], T * 0.12, t, p.seed + k, flame[0], flame[1], h > 0.3 ? glow : null); });   // the flames, live
  }
  function rxCrystal(x, y, r, h, lx, ly, col, a0, alpha) {   // a six-sided crystal with a pointed tip, leaning; a bright edge up its front
    const A = rc.globalAlpha; if (alpha) rc.globalAlpha = A * alpha; rxLift = 0.4;
    const R = rxLathe(x, y, 0, [[r, 0], [r * 0.92, h * 0.72], [0, h]], 6, col, a0, false, lx, ly);
    rc.globalAlpha = A; rxLift = 0;
    let k = 0, best = -1e9; R[0].forEach((q, i) => { if (q[1] > best) { best = q[1]; k = i; } });   // the corner nearest the camera
    rc.strokeStyle = 'rgba(255,255,255,0.7)'; rc.lineWidth = Math.max(1, cam.s * 0.012); rc.beginPath(); rc.moveTo(R[0][k][0], R[0][k][1]); rc.lineTo(R[1][k][0], R[1][k][1]); rc.lineTo(R[2][0][0], R[2][0][1]); rc.stroke();
  }
  // ---------- 1.27.5: what stands in an effect room (drawProp: p.x, p.y on the floor, p.s scale, p.v variant 0..3) ----------
  Object.assign(PROP, {
    rx_vent(p, T) { rxKeep(p, T, () => {   // a raised ring of rough stones round a deep crack in the floor (the mist boils out of it: RFX_AIR)
      rxShadow(p.x, p.y, 0.24, 0.15, 0.32);
      const q = W2S(p.x, p.y, 0.005); rc.fillStyle = '#07080b'; rc.beginPath(); rc.ellipse(q[0], q[1], T * 0.13, T * 0.13 * SP, 0, 0, Math.PI * 2); rc.fill();
      rc.fillStyle = '#2a2e36'; rc.beginPath(); rc.ellipse(q[0], q[1], T * 0.13, T * 0.13 * SP, 0, Math.PI, Math.PI * 2); rc.ellipse(q[0], q[1] + T * 0.03, T * 0.11, T * 0.1 * SP, 0, Math.PI * 2, Math.PI, true); rc.fill();   // its far wall, going down
      rc.drawImage(rxMist(), q[0] - T * 0.14, q[1] - T * 0.1, T * 0.28, T * 0.2);
      const st = []; for (let k = 0; k < 7; k++) { const a = k * 0.9 + p.v; st.push([Math.cos(a), Math.sin(a), 0.05 + 0.02 * ((k + p.v) % 2), k]); }
      st.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).forEach(([cx, cy, r, k]) => rxRock(p.x + cx * 0.17, p.y + cy * 0.17, r, r * 1.3, k % 2 ? '#646a76' : '#7a808c', k + p.v));
    }); },
    rx_snag(p, T) { rxKeep(p, T, () => {   // dead branches out of the floor, round and tapering, a knot of root at their foot
      rxShadow(p.x, p.y, 0.15, 0.09, 0.32);
      [[-0.7, 0.42], [0.15, 0.55], [0.75, 0.34]].forEach(([dx, hh], k) => { if (k === 2 && p.v % 2) return;
        const H = hh * p.s, a = [p.x, p.y, 0], m = [p.x + dx * 0.04, p.y + dx * 0.02, H * 0.5], b = [p.x + dx * 0.14, p.y + dx * 0.04, H], r = 0.035 - 0.007 * k;
        rxRod(a, m, r, r * 0.7, '#6a6458', '#3a362f'); rxRod(m, b, r * 0.7, r * 0.25, '#6a6458', '#3a362f', '#7a7466');
        const tw = [(m[0] + b[0]) / 2, (m[1] + b[1]) / 2, (m[2] + b[2]) / 2]; rxRod(tw, [tw[0] + 0.1 * (dx < 0 ? -1 : 1), tw[1], tw[2] + 0.08], r * 0.4, r * 0.12, '#6a6458', '#3a362f');
      });
      rxRock(p.x, p.y, 0.07, 0.07, '#4e4a44', p.v);
    }); },
    rx_reeds(p, T, t) {   // a clump of reeds and bulrushes on a hump of mud, swaying: round stalks, folded leaves, brown heads
      rxShadow(p.x, p.y, 0.17, 0.1, 0.32);
      rxLathe(p.x, p.y, 0, [[0.14, 0], [0.1, 0.03], [0.04, 0.045]], 8, '#3a3018', 0.4);
      const n = 6 + (p.v % 3);
      for (let k = 0; k < n; k++) {
        const u = (k / (n - 1) - 0.5), hh = (0.38 + 0.2 * ((k * 7 + p.v) % 3) / 2) * p.s, sw = Math.sin(t * 1.4 + k * 0.7 + p.seed) * 0.04;
        const a = [p.x + u * 0.12, p.y + u * 0.03, 0.03], m = [p.x + u * 0.15 + sw * 0.3, p.y + u * 0.04, hh * 0.5], b = [p.x + u * 0.22 + sw, p.y + u * 0.05, hh];
        const lit = k % 2 ? '#7e9e4a' : '#94b45a', dk = k % 2 ? '#4a6a2a' : '#5a7a34';
        rxRod(a, m, 0.016, 0.012, lit, dk); rxRod(m, b, 0.012, 0.005, lit, dk);
        if (k % 3 === 1) { const h0 = [b[0] - (b[0] - m[0]) * 0.18, b[1], b[2] - (b[2] - m[2]) * 0.18], h1 = [h0[0] - (b[0] - m[0]) * 0.35, h0[1], h0[2] - (b[2] - m[2]) * 0.35]; rxRod(h1, h0, 0.03, 0.028, '#7a5230', '#3e2412', '#6a4424'); }   // a bulrush head
      }
      [[-1, 0.2], [1, 0.16]].forEach(([sd, hh], k) => { const a = [p.x + sd * 0.03, p.y, 0.03], m = [p.x + sd * 0.12, p.y + 0.02, hh * 0.7 * p.s], b = [p.x + sd * 0.22, p.y + 0.03, hh * 0.55 * p.s]; rxRod(a, m, 0.026, 0.02, '#6e8e3e', '#3e5a22'); rxRod(m, b, 0.02, 0.002, '#6e8e3e', '#3e5a22'); });   // two leaves bending out
    },
    rx_stump(p, T) { rxKeep(p, T, () => {   // a rotten stump with bark facets and roots, moss on its cut top, a pale mushroom at its foot
      rxShadow(p.x, p.y, 0.23, 0.14, 0.36);
      const s = p.s, H = 0.2 * s;
      [0.4, 2.3, 4.2].forEach((a, k) => { const c = Math.cos(a + p.v), d = Math.sin(a + p.v); rxRod([p.x + c * 0.09 * s, p.y + d * 0.09 * s, 0.06], [p.x + c * 0.22 * s, p.y + d * 0.2 * s, 0], 0.04, 0.012, '#6a4a2c', '#3a2614'); });
      rxLathe(p.x, p.y, 0, [[0.15 * s, 0], [0.13 * s, 0.05], [0.125 * s, H]], 9, '#5e4228', p.v * 0.7, '#8a6a42');
      const q = W2S(p.x, p.y, H), rx = T * 0.125 * s; rc.strokeStyle = '#5a4028'; rc.lineWidth = 1; rc.beginPath(); rc.ellipse(q[0], q[1], rx * 0.6, rx * 0.6 * SP, 0, 0, Math.PI * 2); rc.moveTo(q[0] + rx * 0.3, q[1]); rc.ellipse(q[0], q[1], rx * 0.3, rx * 0.3 * SP, 0, 0, Math.PI * 2); rc.stroke();
      rc.fillStyle = 'rgba(110,150,60,0.9)'; rc.beginPath(); rc.ellipse(q[0] - rx * 0.35, q[1] + rx * 0.1 * SP, rx * 0.5, rx * 0.3 * SP, 0, 0, Math.PI * 2); rc.fill();
      const mx = p.x + 0.17 * s, my = p.y + 0.08 * s; rxLathe(mx, my, 0, [[0.016, 0], [0.013, 0.07]], 6, '#d8ccb0', 0, false); rxLathe(mx, my, 0.06, [[0.055, 0], [0.045, 0.025], [0, 0.04]], 8, '#d8c8a6', 0.3);
    }); },
    rx_toad(p, T, t) {   // a fat toad on a stone: round body, legs folded at its sides, bulging eyes, its throat going
      const th = 1 + 0.25 * Math.max(0, Math.sin(t * 3 + p.seed)), z = 0.07;
      rxKeep(p, T, () => { rxShadow(p.x, p.y, 0.15, 0.09, 0.32); rxRock(p.x, p.y, 0.09, 0.07, '#5a5e58', p.v);
      rxEgg(p.x - 0.07, p.y + 0.02, z + 0.03, 0.045, 0.035, '#4e6a2c'); rxEgg(p.x + 0.07, p.y - 0.02, z + 0.03, 0.045, 0.035, '#46602a');   // the folded back legs
      rxEgg(p.x, p.y, z + 0.07, 0.1, 0.075, '#5e7a34');
      [[-0.045, -0.02], [0.04, -0.045]].forEach(([u, v]) => { const e = rxBall(p.x + u, p.y + v, z + 0.09, 0.028, '#7a9a44'); rc.fillStyle = '#e8d860'; rc.beginPath(); rc.arc(e[0], e[1] - T * 0.008, T * 0.018, 0, Math.PI * 2); rc.fill(); rc.fillStyle = '#101008'; rc.fillRect(e[0] - T * 0.014, e[1] - T * 0.012, T * 0.028, Math.max(1, T * 0.008)); }); });
      rxEgg(p.x + 0.02, p.y + 0.05, z + 0.03, 0.05 * th, 0.035 * th, '#c8c890', 'rgba(0,0,0,0.15)');   // the throat
    },
    rx_stalag(p, T) { rxKeep(p, T, () => {   // wet blue-grey stalagmites on a heap of rubble, faceted, a sheen down their lit side
      const n = 1 + (p.v % 3); rxShadow(p.x, p.y, 0.21, 0.14, 0.36);
      rxLathe(p.x, p.y, 0, [[0.17, 0], [0.12, 0.035], [0.05, 0.05]], 7, '#3e4a62', p.v);
      for (let k = 0; k < n; k++) { const x = p.x + (k - (n - 1) / 2) * 0.12, y = p.y + (k % 2) * 0.06, h = (0.3 + 0.18 * ((k * 2 + p.v) % 3)) * p.s, r = 0.075 + 0.02 * ((k + p.v) % 2);
        rxLathe(x, y, 0, [[r, 0], [r * 0.62, h * 0.45], [r * 0.3, h * 0.8], [0, h]], 7, '#5a6a8a', k * 0.9 + p.v, false);
        rxLine(W2S(x - r * 0.55, y + r * 0.2, h * 0.1), W2S(x - r * 0.12, y, h * 0.8), 'rgba(200,225,255,0.55)', Math.max(1, T * 0.014)); }
    }); },
    rx_gcrystal(p, T, t) {   // a cluster of pale blue crystals out of a rock, glowing softly
      rxShadow(p.x, p.y, 0.16, 0.1, 0.32);   // (live: under the glow)
      const g = W2S(p.x, p.y, 0.15), pul = 0.8 + 0.2 * Math.sin(t * 1.5 + p.seed); rc.drawImage(glowSprite('rxgcry', [[0, 'rgba(140,190,255,0.5)'], [1, 'rgba(140,190,255,0)']]), g[0] - T * 0.4 * pul, g[1] - T * 0.4 * pul, T * 0.8 * pul, T * 0.8 * pul);
      rxKeep(p, T, () => { rxRock(p.x, p.y, 0.1, 0.06, '#3e4a62', p.v); rxShards(p, '#9ec0f4', 0.3); });
    },
    rx_tomb(p, T) { rxKeep(p, T, () => {   // a grave slab with a rounded head on a plinth, a carved cross, cracked, moss at its foot
      rxShadow(p.x, p.y, 0.21, 0.11, 0.4);
      const w = 0.2 * p.s, d = 0.08, h = 0.42 * p.s, z0 = 0.05;
      rxBox(p.x, p.y, 0, w + 0.08, d + 0.08, z0, w + 0.06, d + 0.06, '#4e4860');
      const prof = [[-w / 2, z0], [w / 2, z0], [w / 2, h * 0.72]]; for (let k = 1; k < 6; k++) { const a = k / 6 * Math.PI; prof.push([Math.cos(a) * w / 2, h * 0.72 + Math.sin(a) * (h * 0.28)]); } prof.push([-w / 2, h * 0.72]);
      const P = [], F = [[], []], n = prof.length; prof.forEach(([u, z], k) => { P.push([p.x + u, p.y - d / 2, z]); F[0].push(k); }); prof.forEach(([u, z], k) => { P.push([p.x + u, p.y + d / 2, z]); F[1].push(n + k); });
      for (let k = 0; k < n; k++) { const k1 = (k + 1) % n; F.push([k, k1, n + k1, n + k]); }
      rxSolid(P, F, '#5e566e');
      const P1 = (u, z) => W2S(p.x - w / 2 + u * w, p.y + d / 2, z);
      const a = P1(0.5, h * 0.82), b = P1(0.5, h * 0.35), c1 = P1(0.28, h * 0.66), c2 = P1(0.72, h * 0.66); rxLine(a, b, 'rgba(14,8,20,0.75)', Math.max(1, T * 0.025)); rxLine(c1, c2, 'rgba(14,8,20,0.75)', Math.max(1, T * 0.025));
      rxLine(P1(0.53, h * 0.82), P1(0.53, h * 0.36), 'rgba(200,170,255,0.3)', 1);
      if (p.v % 2) rxLine(P1(0.1, h * 0.72), P1(0.35, h * 0.5), 'rgba(10,6,14,0.7)', 1);
      rxEgg(p.x - w * 0.25, p.y + d / 2 + 0.05, 0.05, 0.07, 0.03, '#56783e');
    }); },
    rx_candlesV(p, T, t) { rxCandles(p, T, t, '#ddd6e8', '#4a4458', ['rgba(245,235,255,0.95)', 'rgba(170,120,255,0.85)'], ['rxcandV', [[0, 'rgba(180,140,255,0.4)'], [1, 'rgba(180,140,255,0)']]]); },
    rx_urn(p, T) { rxKeep(p, T, () => {   // a stone urn: a turned foot, a round belly, a neck, its lid and knob
      rxShadow(p.x, p.y, 0.15, 0.09, 0.36);
      const s = p.s; rxLathe(p.x, p.y, 0, [[0.075 * s, 0], [0.07 * s, 0.03 * s], [0.05 * s, 0.045 * s], [0.1 * s, 0.11 * s], [0.112 * s, 0.17 * s], [0.085 * s, 0.25 * s], [0.045 * s, 0.29 * s], [0.06 * s, 0.3 * s], [0.06 * s, 0.32 * s]], 12, '#6e7484', p.v * 0.4);
      rc.strokeStyle = 'rgba(40,36,52,0.6)'; rc.lineWidth = Math.max(1, T * 0.012); const b = W2S(p.x, p.y, 0.17 * s); rc.beginPath(); rc.ellipse(b[0], b[1], T * 0.112 * s, T * 0.112 * s * SP, 0, 0.1, Math.PI - 0.1); rc.stroke();
      rxBall(p.x, p.y, 0.315 * s, 0.025, '#7a8090');
    }); },
    rx_coins(p, T) { rxKeep(p, T, () => {   // a heap of gold coins, coins lying on it with their edges, a few rolled off, a short stack by it
      rxShadow(p.x, p.y, 0.25, 0.15, 0.36);
      const r = 0.17 * p.s, h = 0.17 * p.s;   // 1.27.5: its coins are solid ones (rxCoin)
      if (p.v > 1) { rxLathe(p.x - 0.18, p.y + 0.12, 0, [[0.04, 0], [0.04, 0.07]], 8, '#d8a838', 0.3, '#ffe08a'); rc.strokeStyle = 'rgba(120,80,20,0.6)'; rc.lineWidth = 1; for (let k = 1; k < 4; k++) { const q = W2S(p.x - 0.18, p.y + 0.12, k * 0.0175); rc.beginPath(); rc.ellipse(q[0], q[1], T * 0.04, T * 0.04 * SP, 0, 0.1, Math.PI - 0.1); rc.stroke(); } }
      rxLathe(p.x, p.y, 0, [[r, 0], [r * 0.88, h * 0.3], [r * 0.6, h * 0.66], [r * 0.25, h * 0.92], [0, h]], 11, '#e0b040', p.v);
      for (let k = 0; k < 9; k++) { const a = k * 2.4 + p.v, d = 0.25 + 0.6 * ((k * 37 % 10) / 10), z = h * (1 - d) * 0.92; rxCoin(p.x + Math.cos(a) * r * d * 0.8, p.y + Math.sin(a) * r * d * 0.5, z - 0.006, 1, T, 0.03); }
      [[0.2, 0.06], [-0.16, 0.14], [0.1, 0.2]].forEach(([u, v], k) => { if (k > p.v % 3) return; rxCoin(p.x + u, p.y + v, 0, 1, T, 0.04); });
    }); },
    rx_chest(p, T) { rxKeep(p, T, () => {   // a small iron-bound chest, its lid thrown back, gold heaped over its rim, a soft glow
      rxShadow(p.x, p.y, 0.25, 0.14, 0.42);
      const w = 0.3 * p.s, d = 0.2 * p.s, h = 0.16 * p.s, y0 = p.y - d / 2, ld = d * 0.95, th = 0.03;
      const L = [0, -0.26 * ld, 0.96 * ld], N = [0, 0.96 * th, 0.26 * th], P = [];   // the lid, hinged at the back edge
      [p.x - w / 2, p.x + w / 2].forEach(x => { const a = [x, y0, h]; P.push(a, [a[0], a[1] + L[1], a[2] + L[2]], [a[0], a[1] + L[1] + N[1], a[2] + L[2] + N[2]], [a[0], a[1] + N[1], a[2] + N[2]]); });
      const S = rxSolid(P, [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], '#6e4626', [0, 0, 0, 0, '#8a5a30']);
      rxLine(S[2], S[6], '#c9a24e', Math.max(1, T * 0.018));   // its gilded edge
      rxBox(p.x, p.y, 0, w, d, h, w, d, '#6e4626', 0, [0, '#c99a30']);   // the box, its top full of gold
      const q = W2S(p.x, p.y, h); rc.drawImage(glowSprite('rxchest', [[0, 'rgba(255,220,120,0.6)'], [1, 'rgba(255,200,100,0)']]), q[0] - T * 0.3, q[1] - T * 0.25, T * 0.6, T * 0.5);
      rxLathe(p.x, p.y, h, [[Math.min(w, d) * 0.48, 0], [Math.min(w, d) * 0.32, 0.035], [0, 0.055]], 9, '#e8be52', 0.2);
      [[-0.06, 0.02, 0.03], [0.05, -0.02, 0.04], [0.01, 0.04, 0.02]].forEach(([u, v, z]) => rxCoin(p.x + u, p.y + v, h + z - 0.006, 1, T, 0.026));   // 1.27.5: solid coins on the heap
      [-0.32, 0.32].forEach(f => rxBox(p.x + w * f, p.y + d / 2 + 0.006, 0, 0.03, 0.014, h + 0.004, 0.03, 0.014, '#8a8e96'));   // iron bands
      rxBox(p.x, p.y + d / 2 + 0.008, h * 0.45, 0.045, 0.018, 0.05, 0.045, 0.018, '#e0c060');   // the lock
    }); },
    rx_bars(p, T) { rxKeep(p, T, () => {   // gold bars stacked: tapered ingots, lit tops
      rxShadow(p.x, p.y, 0.21, 0.12, 0.36);
      const L = [[-0.06, -0.03, 0], [0.07, 0.03, 0], [0.005, 0, 0.06]], s = p.s; L.slice(0, 2 + (p.v % 2)).forEach(([u, v, z]) => rxBox(p.x + u, p.y + v, z, 0.12 * s, 0.21 * s, 0.06, 0.09 * s, 0.17 * s, '#f0c656'));
      const q = W2S(p.x - 0.04, p.y - 0.06, 0.12); rc.fillStyle = 'rgba(255,255,240,0.8)'; rc.fillRect(q[0], q[1], Math.max(1, T * 0.04), Math.max(1, T * 0.015));
    }); },
    rx_candlesH(p, T, t) { rxCandles(p, T, t, '#efe2c4', '#9a7a3a', ['rgba(255,240,190,0.95)', 'rgba(255,160,60,0.9)'], ['rxcandH', [[0, 'rgba(255,200,120,0.45)'], [1, 'rgba(255,200,120,0)']]]); },
    rx_bedroll(p, T) { rxKeep(p, T, () => {   // a blanket rolled up and tied, lying on the floor: a round roll, its rolled end showing, two cords round it
      rxShadow(p.x, p.y, 0.27, 0.11, 0.36);
      const L = 0.22 * p.s, r = 0.07 * p.s, ax = p.v % 2, C = ['#4e6e92', '#86643a', '#5e7e4a', '#8e4a3c'][p.v];
      const A = ax ? [p.x, p.y - L, r] : [p.x - L, p.y, r], B = ax ? [p.x, p.y + L, r] : [p.x + L, p.y, r];
      rxHCyl(A, B, r, 10, C, rxShade(C, 1.15));
      [0.3, 0.7].forEach(f => { const c = [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, r], e = 0.012; rxHCyl(ax ? [c[0], c[1] - e, r] : [c[0] - e, c[1], r], ax ? [c[0], c[1] + e, r] : [c[0] + e, c[1], r], r * 1.07, 10, '#5a3a20'); });
      rc.save(); if (ax) rxPlane(B[0] - r, B[1], B[0] + r, B[1], 0, 2 * r); else rxPlane(B[0], B[1] + r, B[0], B[1] - r, 0, 2 * r);   // the rolled end
      rc.strokeStyle = rxShade(C, 0.6); rc.lineWidth = 0.06; rc.beginPath(); for (let a = 0; a < Math.PI * 5; a += 0.3) { const rr = 0.42 * a / (Math.PI * 5), x = 0.5 + Math.cos(a) * rr, y = 0.5 + Math.sin(a) * rr; a ? rc.lineTo(x, y) : rc.moveTo(x, y); } rc.stroke(); rc.restore();
    }); },
    rx_jug(p, T) { rxKeep(p, T, () => {   // a turned clay jug with a handle, a cup by it
      rxShadow(p.x, p.y, 0.16, 0.1, 0.36);
      const s = p.s; rxLathe(p.x + 0.13, p.y + 0.05, 0, [[0.03, 0], [0.04, 0.06]], 8, '#c9b08a', 0.2, '#3a2a18');
      rxRod([p.x + 0.07 * s, p.y, 0.18 * s], [p.x + 0.11 * s, p.y, 0.13 * s], 0.014, 0.014, '#b87244', '#6e3a1c'); rxRod([p.x + 0.11 * s, p.y, 0.13 * s], [p.x + 0.08 * s, p.y, 0.07 * s], 0.014, 0.014, '#b87244', '#6e3a1c');   // the handle
      rxLathe(p.x, p.y, 0, [[0.06 * s, 0], [0.08 * s, 0.035 * s], [0.088 * s, 0.09 * s], [0.072 * s, 0.15 * s], [0.035 * s, 0.2 * s], [0.03 * s, 0.24 * s], [0.045 * s, 0.26 * s]], 12, '#b06a3e', 0.1);
      const m = W2S(p.x, p.y, 0.26 * s); rc.fillStyle = '#2a1408'; rc.beginPath(); rc.ellipse(m[0], m[1], T * 0.03 * s, T * 0.03 * s * SP, 0, 0, Math.PI * 2); rc.fill();
    }); },
    rx_cog(p, T, t) {   // a thick cog standing on edge on an iron foot, turning on its axle, a small one meshing with it
      rxShadow(p.x, p.y, 0.27, 0.13, 0.4);
      const ax = p.v % 2, H = 0.55 * p.s, w = H, dir = p.v > 1 ? 1 : -1, a = t * 0.9 * dir, zc = 0.05 + H / 2;
      rxBox(p.x, p.y, 0, ax ? 0.16 : w * 0.9, ax ? w * 0.9 : 0.16, 0.05, ax ? 0.14 : w * 0.86, ax ? w * 0.86 : 0.14, '#4a4e57');
      const W = (d) => ax ? [p.x + d, p.y] : [p.x, p.y + d], pl = (d) => { rc.restore(); rc.save(); if (ax) rxPlane(p.x + d, p.y - w / 2, p.x + d, p.y + w / 2, 0.05, 0.05 + H); else rxPlane(p.x - w / 2, p.y + d, p.x + w / 2, p.y + d, 0.05, 0.05 + H); };
      { const b = W(-0.06); rxBox(b[0], b[1], 0.05, 0.05, 0.05, H / 2, 0.04, 0.04, '#3a3d44'); }   // the post behind it
      rc.save(); rc.save();
      [['#3a2814', -0.035], ['#4e361c', -0.018], ['#624424', 0], ['#76542c', 0.014]].forEach(([c, d]) => { pl(d); rxGear(0.5, 0.5, 0.46, 12, a, c, null, null); });   // its thickness, layer on layer
      pl(0.025); rxGear(0.5, 0.5, 0.46, 12, a, '#a87a40', '#e0b070', '#1c120a');
      rc.fillStyle = 'rgba(255,240,200,0.18)'; rc.beginPath(); rc.arc(0.5, 0.5, 0.42, Math.PI * 1.05, Math.PI * 1.6); rc.arc(0.5, 0.5, 0.3, Math.PI * 1.6, Math.PI * 1.05, true); rc.fill();
      [['#4a3418', 0.03], ['#5e4222', 0.045]].forEach(([c, d]) => { pl(d); rxGear(0.92, 0.82, 0.22, 8, -a * 12 / 8 + 0.2, c, null, null); });
      pl(0.055); rxGear(0.92, 0.82, 0.22, 8, -a * 12 / 8 + 0.2, '#8a6434', '#c99a5a', '#1c120a');
      rc.restore(); rc.restore();
      const c0 = W(0.025), c1 = W(0.06); rxHCyl([c0[0], c0[1], zc], [c1[0], c1[1], zc], 0.035, 8, '#4a4e57', '#2a2d33');   // the end of its axle
    },
    rx_pipe(p, T, t) {   // a copper pipe out of the floor with flanges, an elbow and an open end; a thick valve wheel and a gauge on it (it vents steam: RFX_AIR)
      const h = 0.62 * p.s, r = 0.05;
      rxKeep(p, T, () => { rxShadow(p.x, p.y, 0.17, 0.1, 0.36);
      rxLathe(p.x, p.y, 0, [[r * 1.6, 0], [r * 1.6, 0.03]], 10, '#8a5430', 0.2);
      rxLathe(p.x, p.y, 0.03, [[r, 0], [r, h - 0.03]], 10, '#b8743e', 0.2, false);
      rxLathe(p.x, p.y, h * 0.62, [[r * 1.35, 0], [r * 1.35, 0.025]], 10, '#8a5430', 0.2);
      rxHCyl([p.x, p.y, h], [p.x + 0.15, p.y, h], r, 10, '#b8743e', '#1e1008');
      rxBall(p.x, p.y, h - r * 0.95, r * 1.05, '#c07c44');
      rxHCyl([p.x + 0.12, p.y, h], [p.x + 0.15, p.y, h], r * 1.3, 10, '#8a5430', '#1e1008');
      { const q = W2S(p.x + 0.15, p.y, h); rc.fillStyle = '#100804'; rc.beginPath(); rc.ellipse(q[0] + 1, q[1], T * r * 0.6, T * r * 0.85, 0, 0, Math.PI * 2); rc.fill(); } });   // the dark mouth
      const vz = h * 0.42, vr = 0.075, va = t * 0.3, gz = h * 0.82, gr = 0.05;
      const fm = (ax0, ay0, bx0, by0, z0, z1) => { rc.restore(); rc.save(); rxPlane(ax0, ay0, bx0, by0, z0, z1); };   // a plane that keeps drawProp's scale
      rxHCyl([p.x, p.y + r * 0.7, vz], [p.x, p.y + 0.07, vz], 0.016, 8, '#5a5e66', '#3a3d44');   // 1.27.5: the valve's stem out of the pipe
      rc.save(); rc.save();
      [['#4a1410', 0.046], ['#521712', 0.052], ['#5a1a14', 0.058], ['#6a1d16', 0.064], ['#741f18', 0.07], ['#7e221a', 0.075]].forEach(([c, d]) => { fm(p.x - vr, p.y + d, p.x + vr, p.y + d, vz - vr, vz + vr); rc.strokeStyle = c; rc.lineWidth = 0.17; rc.beginPath(); rc.arc(0.5, 0.5, 0.42, 0, Math.PI * 2); rc.stroke(); });   // the rim's thickness, layer on layer
      fm(p.x - vr, p.y + 0.077, p.x + vr, p.y + 0.077, vz - vr, vz + vr); rc.lineCap = 'round';   // the spokes, round: a dark body, a lit upper edge
      for (let k = 0; k < 3; k++) { const q = va + k * 2.09, c = Math.cos(q), sn = Math.sin(q); rc.strokeStyle = '#5e1a14'; rc.lineWidth = 0.14; rc.beginPath(); rc.moveTo(0.5 + c * 0.1, 0.5 + sn * 0.1); rc.lineTo(0.5 + c * 0.4, 0.5 + sn * 0.4); rc.stroke();
        rc.strokeStyle = '#d0544a'; rc.lineWidth = 0.06; rc.beginPath(); rc.moveTo(0.49 + c * 0.1, 0.485 + sn * 0.1); rc.lineTo(0.49 + c * 0.4, 0.485 + sn * 0.4); rc.stroke(); }
      rc.lineCap = 'butt';
      fm(p.x - vr, p.y + 0.082, p.x + vr, p.y + 0.082, vz - vr, vz + vr); rc.strokeStyle = '#a8342a'; rc.lineWidth = 0.15; rc.beginPath(); rc.arc(0.5, 0.5, 0.42, 0, Math.PI * 2); rc.stroke();   // the rim's front, rounded by light and shade
      rc.strokeStyle = '#e8786a'; rc.lineWidth = 0.05; rc.beginPath(); rc.arc(0.5, 0.5, 0.44, Math.PI * 0.95, Math.PI * 1.65); rc.stroke();
      rc.strokeStyle = '#5a1610'; rc.lineWidth = 0.05; rc.beginPath(); rc.arc(0.5, 0.5, 0.4, Math.PI * 0.05, Math.PI * 0.7); rc.stroke();
      rc.fillStyle = '#7a2018'; rc.beginPath(); rc.arc(0.5, 0.5, 0.15, 0, Math.PI * 2); rc.fill();   // the hub, a round boss
      rc.fillStyle = '#d06050'; rc.beginPath(); rc.arc(0.485, 0.485, 0.11, 0, Math.PI * 2); rc.fill();
      rc.fillStyle = '#f4b0a4'; rc.beginPath(); rc.arc(0.465, 0.46, 0.035, 0, Math.PI * 2); rc.fill();
      [['#4a3018', 0.045], ['#6a4828', 0.06]].forEach(([c, d]) => { fm(p.x - 0.03 - gr, p.y + d, p.x - 0.03 + gr, p.y + d, gz - gr, gz + gr); rc.fillStyle = c; rc.beginPath(); rc.arc(0.5, 0.5, 0.5, 0, Math.PI * 2); rc.fill(); });
      fm(p.x - 0.03 - gr, p.y + 0.07, p.x - 0.03 + gr, p.y + 0.07, gz - gr, gz + gr); rc.fillStyle = '#e8e0cc'; rc.beginPath(); rc.arc(0.5, 0.5, 0.4, 0, Math.PI * 2); rc.fill();
      const na = -2.2 + 1.2 * Math.sin(t * 2 + p.seed); rc.strokeStyle = '#c02a20'; rc.lineWidth = 0.08; rc.beginPath(); rc.moveTo(0.5, 0.5); rc.lineTo(0.5 + Math.cos(na) * 0.32, 0.5 + Math.sin(na) * 0.32); rc.stroke();
      rc.restore(); rc.restore();
    },
    rx_lever(p, T, t) { rxKeep(p, T, () => {   // a round lever in a slot of an iron block, a red knob on it
      rxShadow(p.x, p.y, 0.13, 0.08, 0.32);
      rxBox(p.x, p.y, 0, 0.15, 0.11, 0.06, 0.13, 0.09, '#4a4e57');
      const s0 = W2S(p.x - 0.045, p.y, 0.06), s1 = W2S(p.x + 0.045, p.y, 0.06); rxLine(s0, s1, '#141518', Math.max(1.5, T * 0.025));
      const tilt = (p.v % 2 ? 0.12 : -0.12), top = [p.x + tilt, p.y, 0.4 * p.s];
      rxRod([p.x, p.y, 0.06], top, 0.018, 0.014, '#8a8e96', '#3a3d44');
      rxBall(top[0], top[1], top[2] - 0.03, 0.04, '#b02a20');
    }); },
    rx_bale(p, T) { rxKeep(p, T, () => {   // folded bales of grey felt stacked, soft bevelled edges, tied with cord
      rxShadow(p.x, p.y, 0.25, 0.14, 0.36);
      const w = (0.28 - 0.04 * (p.v % 2)) * p.s, d = 0.2 * p.s, h = 0.085 * p.s, n = p.v > 1 ? 3 : 2;
      for (let k = 0; k < n; k++) { const z = k * h, o = (k % 2 ? 0.015 : -0.01), ww = w * (1 - 0.06 * k);
        rxBox(p.x + o, p.y - o * 0.5, z, ww, d, h * 0.5, ww, d, '#5e6678');
        rxBox(p.x + o, p.y - o * 0.5, z + h * 0.5, ww, d, h * 0.5, ww * 0.94, d * 0.9, '#6a7286'); }
      const H = n * h + 0.003, yS = p.y + d / 2 + 0.004, yN = p.y - d * 0.45;
      [0.3, 0.7].forEach(f => { const x0 = p.x - w / 2 + w * f - 0.012, x1 = x0 + 0.024; rxSolid([[x0, yS, 0], [x1, yS, 0], [x1, yS, H], [x0, yS, H], [x0, yN, H], [x1, yN, H]], [[0, 1, 2, 3], [3, 2, 5, 4]], '#3a3e4a', null, true); });   // the cords over its front and top
    }); },
    rx_snuffed(p, T) { rxCandles(p, T, 0, '#a8a49a', '#3a3c44', null, null, true); },   // candles snuffed out, black wicks (their smoke: RFX_AIR)
    rx_bell(p, T) { rxKeep(p, T, () => {   // a bell wrapped in a dark cloth, a cord tied round it so it cannot ring, on a low stone
      rxShadow(p.x, p.y, 0.21, 0.12, 0.4);
      rxBox(p.x, p.y, 0, 0.27, 0.27, 0.04, 0.25, 0.25, '#3a3c44');
      const s = p.s, z = 0.04; rxLathe(p.x, p.y, z, [[0.15 * s, 0], [0.135 * s, 0.025 * s], [0.105 * s, 0.1 * s], [0.094 * s, 0.2 * s], [0.07 * s, 0.27 * s], [0.035 * s, 0.31 * s], [0, 0.32 * s]], 12, '#4a5064', 0.3);
      rxLathe(p.x, p.y, z + 0.15 * s, [[0.103 * s, 0], [0.101 * s, 0.025 * s]], 12, '#8a7050', 0.3, false);
      rxBall(p.x, p.y, z + 0.3 * s, 0.03, '#8a7050');
    }); },
    rx_shard(p, T) { rxKeep(p, T, () => {   // tall crystals of ice, clear, catching the light
      rxShadow(p.x, p.y, 0.19, 0.11, 0.32);
      rxShards(p, '#b8e2fc', 0.48);
    }); },
    rx_iceblock(p, T) { rxKeep(p, T, () => {   // a block of ice with an old crate frozen in it, clear faces, bright edges
      rxShadow(p.x, p.y, 0.24, 0.14, 0.3);
      const w = 0.3 * p.s, h = 0.3 * p.s;
      rxIso(p.x - 0.01, p.y + 0.01, w * 0.6, w * 0.6, h * 0.6, '#7a5a3a', '#5e4630', '#4a3624', h * 0.12);
      rc.globalAlpha *= 0.55; rxIso(p.x, p.y, w, w, h, '#e4f4ff', '#a8d4f0', '#7ab0d8'); rc.globalAlpha /= 0.55;
      const P = (u, v, z) => W2S(p.x + u * w / 2, p.y + v * w / 2, z);
      rc.strokeStyle = 'rgba(250,254,255,0.9)'; rc.lineWidth = Math.max(1, T * 0.015); rc.beginPath();
      [[P(-1, 1, h), P(1, 1, h)], [P(1, 1, h), P(1, -1, h)], [P(1, 1, 0), P(1, 1, h)], [P(-1, 1, 0), P(-1, 1, h)]].forEach(([a, b]) => { rc.moveTo(a[0], a[1]); rc.lineTo(b[0], b[1]); }); rc.stroke();
      const g = P(-0.6, 1, h * 0.8); rc.fillStyle = 'rgba(255,255,255,0.6)'; rc.fillRect(g[0], g[1], T * 0.05, Math.max(1, T * 0.015));
    }); }
  });
  // ---------- 1.27.5: the small things lying on an effect's floor, solid (coins, gems, pebbles, wax, lily pads, dew, straw, a rug's edge) ----------
  // Laid out once per room with its plan (RFX_BITS into P.bits, fixed by the tiles, back ones first), painted once per room, zoom step and
  // tilt into a picture in screen space (rfxBitsDraw) and stamped over the floor every frame (rfxSolid, from drawRoomTypes); while the view
  // tilts the old picture is stretched to fit, and very close up (a picture too big for a phone) only the ones on screen are drawn.
  const rxIn = v => 0.1 + 0.8 * v;   // a spot in a tile that keeps a small thing off the walls
  const inPool = (P, x, y, m) => P.pools.some(([px, py, rx, ry]) => ((x - px) / (rx * m)) ** 2 + ((y - py) / (ry * m)) ** 2 < 1);
  const RFX_BITS = {
    fog(R, P, B) { R.tiles.forEach(([tx, ty]) => { for (let k = 0; k < 5; k++) if (kH(tx, ty, 302 + k) >= 0.45) B.push(['dew', tx + rxIn(kH(tx, ty, 310 + k)), ty + rxIn(kH(tx, ty, 320 + k)), 0.011 + 0.008 * kH(tx, ty, 330 + k)]); }); },
    swamp(R, P, B) { P.pools.forEach(([px, py, rx, ry, sd]) => { for (let k = 0; k < 7; k++) { const a = kH(sd, k, 344) * 6.28, d = 0.6 + 0.35 * kH(sd, k, 345); B.push(['weed', px + Math.cos(a) * rx * d, py + Math.sin(a) * ry * d, 0.015 + 0.02 * kH(sd, k, 346)]); }   // duckweed floating
      if (kH(sd, 1, 347) > 0.35) B.push(['lily', px + rx * 0.3, py + ry * 0.15, 0.1, kH(sd, 2, 348) * 6.28, kH(sd, 3, 349) > 0.5]); }); },
    grotto(R, P, B) {
      R.tiles.forEach(([tx, ty]) => { for (let k = 0; k < 4; k++) { if (kH(tx, ty, 361 + k) < 0.5) continue; const x = tx + rxIn(kH(tx, ty, 365 + k)), y = ty + rxIn(kH(tx, ty, 369 + k)); if (!inPool(P, x, y, 1.2)) B.push(['peb', x, y, 0.022 + 0.026 * kH(tx, ty, 373 + k), Math.floor(kH(tx, ty, 377 + k) * 3)]); } });
      const pl = P.pools[0]; if (pl) { const [px, py, rx, ry, sd] = pl, L = []; for (let j = 0; j < 9; j++) L.push([px + (kH(sd, j, 375) - 0.5) * rx * 1.6, py + (kH(sd, j, 376) - 0.5) * ry * 1.6, 0.03 + 0.04 * kH(sd, j, 377), j % 3]); L.sort((a, b) => a[0] + a[1] - b[0] - b[1]); B.push(['wet', px - 9, py - 9, px, py, rx, ry, sd, L]); }   // (drawn first: under the water)
    },
    crypt(R, P, B) { R.tiles.forEach(([tx, ty]) => { if (kH(tx, ty, 395) > 0.72) B.push(['wax', tx + 0.2 + 0.6 * kH(tx, ty, 396), ty + 0.2 + 0.6 * kH(tx, ty, 397), 0.065, kH(tx, ty, 398) > 0.5]); }); },
    vault(R, P, B, lite) {
      R.tiles.forEach(([tx, ty]) => {
        for (let k = 0; k < (lite ? 1 : 3); k++) { if (kH(tx, ty, 521 + k) < 0.45) continue;   // a coin, a short stack, or a stack with one leaning on it
          const x = tx + 0.15 + 0.7 * kH(tx, ty, 524 + k), y = ty + 0.15 + 0.7 * kH(tx, ty, 527 + k), q = kH(tx, ty, 535 + k);
          B.push(q < 0.45 ? ['coin', x, y, 1, 0] : q < 0.75 ? ['coin', x, y, 2 + Math.floor(kH(tx, ty, 538 + k) * 3), 0] : ['coin', x, y, 3 + (k % 2), 1 + kH(tx, ty, 541 + k) * 5]); }
        if (kH(tx, ty, 531) > 0.86) B.push(['gem', tx + 0.5, ty + 0.5, 0.065, Math.floor(kH(tx, ty, 532) * 3), kH(tx, ty, 533)]);
      });
    },
    haven(R, P, B, lite) {
      const W = R.x1 - R.x0 + 1, H = R.y1 - R.y0 + 1; let rug = null;
      if (!lite && W >= 3 && H >= 3) { const ix = W >= 4 ? 1 : 0.6, iy = H >= 4 ? 1.1 : 0.7; rug = ['rug', R.x0 + ix, R.y0 + iy, W - 2 * ix, H - 2 * iy, 1]; }
      else if (!lite) { const [mx, my] = roomMid(R); rug = ['rug', mx - 0.5, my - 0.35, 1, 0.7, 0]; }
      if (rug) B.push(rug);
      R.tiles.forEach(([tx, ty]) => { const n = edgeTile(R, tx, ty) ? 7 : 3; for (let k = 0; k < n; k++) { if (kH(tx, ty, 541 + k) < 0.4) continue;   // straw (none lying on the rug)
        const x = tx + rxIn(kH(tx, ty, 550 + k)), y = ty + rxIn(kH(tx, ty, 560 + k)), L = 0.1 + 0.1 * kH(tx, ty, 580 + k); let a = kH(tx, ty, 570 + k) * 3.14;
        if (rug && x > rug[1] - 0.05 && x < rug[1] + rug[3] + 0.05 && y > rug[2] - 0.12 && y < rug[2] + rug[4] + 0.12) continue;
        if (!P.set.has(Math.floor(x + Math.cos(a) * L) + ',' + Math.floor(y + Math.sin(a) * L))) a += Math.PI;
        B.push(['straw', x, y, a, L, k % 2]); } });
    }
  };
  const RXPEB = ['#66728c', '#58637a', '#76829a'], RXWET = ['#4a6ca8', '#3e5e98', '#5878b2'], RXGEM = ['#d83848', '#3a8ee0', '#38b868'];
  function rxBit(b, T) {
    switch (b[0]) {
      case 'dew': {   // a bead of dew: round, a dark side, a bright point, its little shadow
        const r = b[3], p = W2S(b[1], b[2], r * 0.6), a = Math.max(0.7, r * T);
        rc.fillStyle = 'rgba(8,12,22,0.32)'; rc.beginPath(); rc.ellipse(p[0] + a * 0.45, p[1] + a * 0.65, a, a * 0.55, 0, 0, Math.PI * 2); rc.fill();
        rc.fillStyle = 'rgba(178,194,220,0.85)'; rc.beginPath(); rc.arc(p[0], p[1], a, 0, Math.PI * 2); rc.fill();
        if (a >= 1.4) { rc.fillStyle = 'rgba(64,78,104,0.55)'; rc.beginPath(); rc.arc(p[0], p[1], a, -0.2, Math.PI * 0.8); rc.arc(p[0] - a * 0.22, p[1] - a * 0.26, a * 0.84, Math.PI * 0.8, -0.2, true); rc.fill(); }
        const g = Math.max(0.7, a * 0.42); rc.fillStyle = 'rgba(250,253,255,0.95)'; rc.fillRect(p[0] - a * 0.5, p[1] - a * 0.55, g, g); break;
      }
      case 'peb': { const r = b[3], h = r * 0.5, w = 1.1 + 0.2 * (b[4] % 2); rxShadow(b[1] + r * 0.3, b[2] + r * 0.25, r * w, r, 0.4); rxEgg(b[1], b[2], h * 0.5, r * w, r * 0.85 * SP + h * CP * 0.5, RXPEB[b[4]], 'rgba(10,14,30,0.45)'); break; }   // a smooth flat pebble
      case 'wet': {   // pebbles seen through the pool: dimmer, bluer, still round, a film of water over them (clipped to the water)
        const [, , , px, py, rx, ry, sd, L] = b, m = rc.getTransform(), o = W2S(0, 0, 0), pool = () => { rc.transform(R2 * T, R2 * SP * T, -R2 * T, R2 * SP * T, o[0], o[1]); rxBlob(rc, px, py, rx, ry, sd); rc.setTransform(m); };
        rc.save(); pool(); rc.clip();
        L.forEach(([x, y, r, v]) => { const h = r * 0.5; rxEgg(x, y, h * 0.5, r * 1.15, r * 0.85 * SP + h * CP * 0.5, RXWET[v], 'rgba(8,16,50,0.45)'); });
        rc.fillStyle = 'rgba(70,120,200,0.3)'; pool(); rc.fill(); rc.restore(); break;
      }
      case 'wax': {   // wax dripped on the slab: a domed pool of it, a drop beside, a stub of candle stuck in it now and then
        const r = b[3], x = b[1], y = b[2]; rxShadow(x + 0.01, y + 0.01, r * 1.05, r * 0.8, 0.32);
        rxEgg(x, y, 0.011, r, r * 0.75 * SP + 0.011 * CP, '#d2c8b2', 'rgba(50,30,60,0.32)'); rxEgg(x + 0.085, y + 0.03, 0.008, 0.024, 0.024 * SP + 0.008 * CP, '#cdc3ac', 'rgba(50,30,60,0.32)');
        if (b[4]) rxLathe(x - 0.01, y, 0.015, [[0.022, 0], [0.022, 0.045], [0.017, 0.054]], 7, '#ddd6c4', 0.4, '#efe8d8'); break;
      }
      case 'weed': { const r = b[3], p = W2S(b[1], b[2], 0), q = W2S(b[1], b[2], 0.008), a = Math.max(0.8, r * T); rc.fillStyle = '#2c4418'; rc.beginPath(); rc.ellipse(p[0], p[1], a, a * SP, 0, 0, Math.PI * 2); rc.fill(); rc.fillStyle = '#8ab048'; rc.beginPath(); rc.ellipse(q[0], q[1], a, a * SP, 0, 0, Math.PI * 2); rc.fill(); if (a > 2) { rc.fillStyle = 'rgba(220,250,170,0.5)'; rc.beginPath(); rc.ellipse(q[0] - a * 0.3, q[1] - a * SP * 0.3, a * 0.35, a * SP * 0.3, 0, 0, Math.PI * 2); rc.fill(); } break; }   // a floating leaf of duckweed, its edge showing
      case 'coin': rxCoinPile(b[1], b[2], b[3], b[4], T); break;
      case 'gem': rxGem(b[1], b[2], b[3], RXGEM[b[4]], b[5] * 1.05); break;
      case 'lily': rxLily(b[1], b[2], b[3], b[4], b[5], T); break;
      case 'straw': {   // a straw lying on the boards: round, lit along its top, its shadow
        const [, x, y, a, L, v] = b, x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L, r = 0.011;
        rxLine(W2S(x + 0.012, y + 0.016, 0), W2S(x1 + 0.012, y1 + 0.016, 0), 'rgba(30,18,6,0.35)', Math.max(1, r * T * 1.8));
        rxRod([x, y, r], [x1, y1, r], r, r * 0.8, v ? '#ecd084' : '#dcbc6a', v ? '#a8803c' : '#93702e'); break;
      }
      case 'rug': {   // the rug's thickness: its two near edges going down to the boards, the fringe lying on them
        const [, x0, y0, w, h, fr] = b, x1 = x0 + w, y1 = y0 + h, d = 0.045, q = (P, c) => { rc.fillStyle = c; rc.beginPath(); P.forEach((p, k) => k ? rc.lineTo(p[0], p[1]) : rc.moveTo(p[0], p[1])); rc.closePath(); rc.fill(); };
        q([W2S(x0, y1, 0), W2S(x1, y1, 0), W2S(x1, y1, -d), W2S(x0, y1, -d)], '#4a1812'); q([W2S(x1, y0, 0), W2S(x1, y1, 0), W2S(x1, y1, -d), W2S(x1, y0, -d)], '#300e0a'); rxLine(W2S(x0, y1, 0), W2S(x1, y1, 0), 'rgba(255,220,170,0.25)', 1);
        if (fr) { rc.strokeStyle = '#e8d2a0'; rc.lineWidth = Math.max(1, T * 0.018); rc.beginPath(); for (let u = 0.04; u < 1; u += 0.06) { const fx = x0 + w * u; [[y0, -1, 0], [y1, 1, -d]].forEach(([yy, sg, z]) => { const a = W2S(fx, yy, z), e = W2S(fx, yy + sg * 0.08, -d); rc.moveTo(a[0], a[1]); rc.lineTo(e[0], e[1]); }); } rc.stroke(); }
        break;
      }
    }
  }
  const RXCOIN = 0.062, RXCTH = 0.011;
  function rxCoin(x, y, z0, n, T, rr) {   // a coin lying flat (n > 1: a stack of n): its rim round the front, its face, a raised ring, a gleam
    const r = rr || RXCOIN, b = W2S(x, y, z0), t = W2S(x, y, z0 + RXCTH * n), a = r * T, e = a * SP;
    if (a < 1.5) { rc.fillStyle = '#9a7020'; rc.fillRect(b[0] - a, t[1], 2 * a, b[1] - t[1] + e); rc.fillStyle = '#e8bc4c'; rc.fillRect(t[0] - a, t[1] - e, 2 * a, 2 * e); return; }
    rc.fillStyle = '#a87c26'; rc.beginPath(); rc.moveTo(b[0] - a, t[1]); rc.lineTo(b[0] - a, b[1]); rc.ellipse(b[0], b[1], a, e, 0, Math.PI, 0, true); rc.lineTo(b[0] + a, t[1]); rc.closePath(); rc.fill();
    rc.fillStyle = 'rgba(50,30,0,0.38)'; rc.beginPath(); rc.moveTo(b[0] + a * 0.2, t[1]); rc.lineTo(b[0] + a * 0.2, b[1] + e * 0.98); rc.ellipse(b[0], b[1], a, e, 0, Math.PI * 0.44, 0, true); rc.lineTo(b[0] + a, t[1]); rc.closePath(); rc.fill();   // its shaded right
    if (n > 1 && a > 2.5) { rc.strokeStyle = 'rgba(70,44,6,0.75)'; rc.lineWidth = Math.max(0.6, T * 0.006); rc.beginPath(); for (let k = 1; k < n; k++) { const q = W2S(x, y, z0 + RXCTH * k); rc.moveTo(q[0] + a, q[1]); rc.ellipse(q[0], q[1], a, e, 0, 0, Math.PI); } rc.stroke(); }   // where one coin lies on the next
    rc.fillStyle = '#e8bc4c'; rc.beginPath(); rc.ellipse(t[0], t[1], a, e, 0, 0, Math.PI * 2); rc.fill();
    if (a > 3) { rc.strokeStyle = '#b48a30'; rc.lineWidth = Math.max(0.7, a * 0.12); rc.beginPath(); rc.ellipse(t[0], t[1], a * 0.64, e * 0.64, 0, 0, Math.PI * 2); rc.stroke(); }
    rc.fillStyle = 'rgba(255,248,210,0.85)'; rc.beginPath(); rc.ellipse(t[0] - a * 0.38, t[1] - e * 0.36, a * 0.24, e * 0.24, 0, 0, Math.PI * 2); rc.fill();
  }
  function rxCoinPile(x, y, n, lean, T) {   // a coin or a short stack; lean: a coin leaning on the stack that way, one edge on the floor
    rxShadow(x + 0.012, y + 0.01, RXCOIN * 1.12, RXCOIN * 1.05, 0.38);
    if (!lean) { rxCoin(x, y, 0, n, T); return; }
    const c = Math.cos(lean), s = Math.sin(lean), r = RXCOIN, sn = Math.min(0.6, RXCTH * (n + 1) / (2 * r)), cs = Math.sqrt(1 - sn * sn), d = r * cs + r * 0.45;
    const lx = x + c * d, ly = y + s * d, zc = r * sn + RXCTH * 0.5 * cs, h = RXCTH / 2, nx = c * sn * h, ny = s * sn * h, nz = cs * h;
    const leaner = () => { rxShadow(lx + 0.012, ly + 0.01, r * 1.05, r, 0.3); rxHCyl([lx - nx, ly - ny, zc - nz], [lx + nx, ly + ny, zc + nz], r, 12, '#a87c26', '#c89a38');
      if (r * T < 3) return;
      const ring = f => { rc.beginPath(); for (let k = 0; k <= 12; k++) { const q = k * Math.PI / 6, u = Math.cos(q) * r * f, v = Math.sin(q) * r * f, P = W2S(lx + nx + (-s) * u + c * cs * v, ly + ny + c * u + s * cs * v, zc + nz - sn * v); k ? rc.lineTo(P[0], P[1]) : rc.moveTo(P[0], P[1]); } };   // a ring on its upper face
      rc.strokeStyle = '#b48a30'; rc.lineWidth = Math.max(0.7, r * T * 0.12); ring(0.64); rc.stroke();
      const g = W2S(lx + nx - r * 0.3, ly + ny - r * 0.3, zc + nz + r * 0.25 * sn); rc.fillStyle = 'rgba(255,248,210,0.85)'; rc.beginPath(); rc.arc(g[0], g[1], Math.max(0.7, r * T * 0.2), 0, Math.PI * 2); rc.fill(); };
    if (c + s < 0) { leaner(); rxCoin(x, y, 0, n, T); } else { rxCoin(x, y, 0, n, T); leaner(); }   // the nearer one last
  }
  function rxGem(x, y, r, col, a0) {   // a cut gem on the floor: a short pointed base, a crown of slanted facets, a flat table, a gleam
    rxShadow(x + 0.012, y + 0.01, r * 1.15, r * 1.05, 0.45);
    const h = r * 1.05, P = [[x, y, 0.002]], F = [];
    for (let k = 0; k < 6; k++) { const a = a0 + k * Math.PI / 3; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r, h * 0.36]); }
    for (let k = 0; k < 6; k++) { const a = a0 + k * Math.PI / 3; P.push([x + Math.cos(a) * r * 0.56, y + Math.sin(a) * r * 0.56, h]); }
    for (let k = 0; k < 6; k++) { const k1 = (k + 1) % 6; F.push([0, 1 + k, 1 + k1], [1 + k, 1 + k1, 7 + k1, 7 + k]); }
    F.push([7, 8, 9, 10, 11, 12]);
    rxLift = 0.25; rxSolid(P, F, col); rxLift = 0;
    const c = W2S(x - r * 0.18, y - r * 0.12, h), T = cam.s; rc.fillStyle = 'rgba(255,255,255,0.78)'; rc.beginPath(); rc.ellipse(c[0], c[1], Math.max(0.7, r * T * 0.22), Math.max(0.6, r * T * 0.12), -0.3, 0, Math.PI * 2); rc.fill();
  }
  function rxLily(x, y, r, a0, fl, T) {   // a lily pad floating: a thin leaf with its notch, its edge showing, veins; now and then a flower cupped on it
    const th = 0.014, pad = z => { const c = W2S(x, y, z); rc.beginPath(); rc.moveTo(c[0], c[1]); for (let k = 0; k <= 12; k++) { const a = a0 + 0.5 + k / 12 * 5.5, q = W2S(x + Math.cos(a) * r, y + Math.sin(a) * r, z); rc.lineTo(q[0], q[1]); } rc.closePath(); };
    rc.fillStyle = 'rgba(4,10,6,0.4)'; rc.save(); rc.translate(T * 0.012, T * 0.016); pad(0); rc.fill(); rc.restore();   // its shadow on the water
    rc.fillStyle = '#1e3416'; pad(0); rc.fill();
    if (th * CP * T > 2) { rc.fillStyle = '#2a4a1c'; pad(th * 0.5); rc.fill(); }
    rc.fillStyle = '#4e7a32'; pad(th); rc.fill();
    const c = W2S(x, y, th); rc.strokeStyle = 'rgba(150,200,100,0.55)'; rc.lineWidth = Math.max(0.7, T * 0.008); rc.beginPath(); for (let k = 1; k < 6; k++) { const a = a0 + 0.5 + k / 6 * 5.5, q = W2S(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, th); rc.moveTo(c[0], c[1]); rc.lineTo(q[0], q[1]); } rc.stroke();
    if (!fl) return;
    const fx = x - r * 0.2, fy = y - r * 0.15, z = th;
    for (let k = 0; k < 6; k++) { const a = k * 1.047 + 0.4, ca = Math.cos(a), sa = Math.sin(a); if (ca + sa < 0) rxRod([fx + ca * 0.012, fy + sa * 0.012, z + 0.006], [fx + ca * 0.045, fy + sa * 0.045, z + 0.03], 0.013, 0.005, '#f0c4da', '#b47496'); }   // back petals
    rxLathe(fx, fy, z, [[0.012, 0], [0.026, 0.014], [0.03, 0.028]], 8, '#d896b8', 0.3, '#f0d468');   // the cup, its golden heart
    for (let k = 0; k < 6; k++) { const a = k * 1.047 + 0.4, ca = Math.cos(a), sa = Math.sin(a); if (ca + sa >= 0) rxRod([fx + ca * 0.012, fy + sa * 0.012, z + 0.006], [fx + ca * 0.045, fy + sa * 0.045, z + 0.03], 0.013, 0.005, '#f0c4da', '#b47496'); }   // front petals
  }
  // the room's solid floor things (drawRoomTypes calls it in floorT, between the still floor and its moving part)
  function rfxSolid(R, T, t) {
    const P = rfxPlan(R), pits = R.rt === 'gears' && detT(T) >= 14 && P.spots.length;   // 1.28.0: detT
    if (!P.bits.length && !pits) return;
    ctx.save(); screenT();
    try {
      if (P.bits.length) rfxBitsDraw(R, P, T);
      if (pits) P.spots.forEach(([px, py, r, dir]) => { if (onScreen(W2S(px, py, 0), T)) rxPit(px, py, r, dir, t, T); });
    } finally { ctx.restore(); }
  }
  const RSC = new Map();
  function rfxBitsDraw(R, P, T) {
    const C = W2S(R.x0, R.y0, 0), A = W2S(R.x1 + 1, R.y0, 0), B = W2S(R.x0, R.y1 + 1, 0), E = W2S(R.x1 + 1, R.y1 + 1, 0), m = T * 0.2;   // its corners: C top, A right, B left, E bottom
    const x0 = B[0] - m, y0 = C[1] - T * 0.4, w = A[0] + m - x0, h = E[1] + m - y0;
    if (w * h * DPR * DPR > 3.2e6) { P.bits.forEach(b => { if (b[0] === 'rug' || b[0] === 'wet' || onScreen(W2S(b[1], b[2], 0), T * 0.3)) rxBit(b, T); }); return; }   // too big a picture for a phone: what is on screen, live
    const key = R.rt + '|' + (R.rk || '') + '|' + rfxBox(R), step = Math.round(T * DPR / 3), sp = Math.round(SP * 200);
    let e = RSC.get(R.key);
    if (!e || e.key !== key || e.step !== step || (e.sp !== sp && VIEW.t >= 1)) {   // (while the view tilts, the old picture stretched)
      if (RSC.size > 40) RSC.clear();
      const c = (e && e.c) || document.createElement('canvas'); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
      const g = c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, -x0 * DPR, -y0 * DPR);
      rc = g; try { P.bits.forEach(b => rxBit(b, T)); } finally { rc = ctx; }
      e = { key, step, sp, c, T, SP, dx: x0 - C[0], dy: y0 - C[1], w, h }; RSC.set(R.key, e);
    }
    const k = T / e.T, ky = k * SP / e.SP;
    ctx.drawImage(e.c, C[0] + e.dx * k, C[1] + e.dy * ky, e.w * k, e.h * ky);
  }
  // a round pit in the gears' plates: its far wall going down into the dark, a thick cog turning deep in it (the rim hides its near part),
  // a second one meshing under it, a raised bronze collar with bolts round the hole
  function rxPit(px, py, r, dir, t, T) {   // (its still parts are pictures: rxStamp; only the cogs are drawn every frame)
    const O = W2S(px, py, 0), a = r * T, e = a * SP, D = 0.26, an = t * 0.8 * dir, hc = 0.035, ao = a * 1.15, eo = ao * SP, dz = D * CP * T, k0 = 'pit' + r;
    rxStamp(k0 + 'b', px, py, T, a + 2, e + 2, e + dz + 2, () => {   // the hole: its far wall going down, plate seams on it, its floor
      const B = W2S(px, py, -D); rc.save(); rc.beginPath(); rc.ellipse(O[0], O[1], a, e, 0, 0, Math.PI * 2); rc.clip();
      rc.fillStyle = '#3a2a18'; rc.fillRect(O[0] - a, O[1] - e, 2 * a, 2 * e + B[1] - O[1]);
      rc.fillStyle = 'rgba(0,0,0,0.35)'; rc.beginPath(); rc.ellipse(O[0], (O[1] + B[1]) / 2, a, e, 0, 0, Math.PI * 2); rc.fill();
      rc.strokeStyle = 'rgba(12,8,4,0.6)'; rc.lineWidth = Math.max(1, T * 0.012); rc.beginPath(); for (let k = 0; k < 5; k++) { const q = Math.PI * (1.02 + k * 0.24), c = Math.cos(q + 0.785) * r, s = Math.sin(q + 0.785) * r, u = W2S(px + c, py + s, 0), v = W2S(px + c, py + s, -D); rc.moveTo(u[0], u[1]); rc.lineTo(v[0], v[1]); } rc.stroke();
      rc.fillStyle = '#0a0604'; rc.beginPath(); rc.ellipse(B[0], B[1], a, e, 0, 0, Math.PI * 2); rc.fill(); rc.restore();
    });
    ctx.save(); ctx.beginPath(); ctx.ellipse(O[0], O[1], a, e, 0, 0, Math.PI * 2); ctx.clip();   // the cogs, cut by the rim
    const gear = (cx, cy, z, rr, n, ang, cols, top) => cols.forEach((col, k) => { const E = W2S(px, py, z + k * 0.07 / (cols.length - 1 || 1)), last = k === cols.length - 1; ctx.save(); ctx.transform(R2 * T, R2 * SP * T, -R2 * T, R2 * SP * T, E[0], E[1]); rxGear(cx, cy, rr, n, ang, col, last ? top[0] : null, last ? top[1] : null); ctx.restore(); });   // layer on layer: its thickness
    gear(-r * 0.32, -r * 0.36, -D + 0.02, r * 0.5, 9, -an * 12 / 9 + 0.3, ['#2e2214', '#4a3620'], ['#7a5a32', '#0c0806']);
    gear(0, 0, -D + 0.08, r * 0.84, 12, an, T < 30 ? ['#3e2c16', '#664a28', '#a87a40'] : ['#2e200e', '#46321a', '#664a28', '#a87a40'], ['#e0b070', '#140c06']);
    ctx.restore();
    rxStamp(k0 + 'f', px, py, T, ao * 1.12 + 2, e + hc * CP * T + 3, eo * 1.2 + 3, () => {   // the rim's shadow down on the cogs, the raised collar with bolts
      const U = W2S(px, py, hc);
      rc.save(); rc.beginPath(); rc.ellipse(O[0], O[1], a, e, 0, 0, Math.PI * 2); rc.clip(); rc.fillStyle = 'rgba(0,0,0,0.42)'; rc.beginPath(); rc.ellipse(O[0], O[1], a, e, 0, 0, Math.PI * 2); rc.ellipse(O[0] + a * 0.24, O[1] + e * 0.34, a, e, 0, 0, Math.PI * 2); rc.fill('evenodd'); rc.restore();
      rc.fillStyle = 'rgba(0,0,0,0.3)'; rc.beginPath(); rc.ellipse(O[0] + a * 0.07, O[1] + e * 0.12, ao * 1.05, eo * 1.05, 0, 0, Math.PI * 2); rc.ellipse(O[0], O[1], a, e, 0, 0, Math.PI * 2); rc.fill('evenodd');   // its shadow on the plates
      rc.fillStyle = '#3e2c16'; rc.beginPath(); rc.moveTo(U[0] - a, U[1]); rc.ellipse(U[0], U[1], a, e, 0, Math.PI, Math.PI * 2); rc.lineTo(O[0] + a, O[1]); rc.ellipse(O[0], O[1], a, e, 0, 0, -Math.PI, true); rc.closePath(); rc.fill();   // its far inner side
      rc.fillStyle = '#5a4024'; rc.beginPath(); rc.moveTo(O[0] + ao, O[1]); rc.ellipse(O[0], O[1], ao, eo, 0, 0, Math.PI); rc.lineTo(U[0] - ao, U[1]); rc.ellipse(U[0], U[1], ao, eo, 0, Math.PI, 0, true); rc.closePath(); rc.fill();   // its outer side
      rc.fillStyle = 'rgba(30,18,6,0.35)'; rc.beginPath(); rc.moveTo(O[0] + ao, O[1]); rc.ellipse(O[0], O[1], ao, eo, 0, 0, Math.PI * 0.45); rc.lineTo(U[0] + ao * 0.16, U[1] + eo * 0.99); rc.ellipse(U[0], U[1], ao, eo, 0, Math.PI * 0.45, 0, true); rc.closePath(); rc.fill();
      rc.fillStyle = '#8e6a3e'; rc.beginPath(); rc.ellipse(U[0], U[1], ao, eo, 0, 0, Math.PI * 2); rc.ellipse(U[0], U[1], a, e, 0, 0, Math.PI * 2); rc.fill('evenodd');   // its top
      rc.strokeStyle = 'rgba(240,200,130,0.6)'; rc.lineWidth = Math.max(1, T * 0.014); rc.beginPath(); rc.ellipse(U[0], U[1], ao, eo, 0, Math.PI * 0.95, Math.PI * 1.75); rc.stroke();
      if (a > 9) for (let k = 0; k < 8; k++) { const q = k * Math.PI / 4 + 0.39, b = W2S(px + Math.cos(q) * r * 1.075, py + Math.sin(q) * r * 1.075, hc), s = Math.max(1, T * 0.017); rc.fillStyle = '#2e2010'; rc.beginPath(); rc.arc(b[0] + s * 0.3, b[1] + s * 0.3, s, 0, Math.PI * 2); rc.fill(); rc.fillStyle = '#b8925a'; rc.beginPath(); rc.arc(b[0] - s * 0.15, b[1] - s * 0.15, s * 0.7, 0, Math.PI * 2); rc.fill(); }   // its bolts
    });
  }
  const RXPC = new Map();
  function rxStamp(k, x, y, T, hw, up, dn, draw) {   // as rxKeep, for a still part round a floor point outside drawProp: painted once per zoom step and tilt, then stamped
    const key = k + '|' + Math.round(T * DPR / 3) + '|' + Math.round(SP * 200); let e = RXPC.get(key);
    if (!e) {
      const c = document.createElement('canvas'); c.width = Math.ceil(2 * hw * DPR); c.height = Math.ceil((up + dn) * DPR);
      const g = c.getContext('2d'), f = W2S(x, y, 0); g.setTransform(DPR, 0, 0, DPR, DPR * (hw - f[0]), DPR * (up - f[1]));
      rc = g; try { draw(); } finally { rc = ctx; }
      if (RXPC.size > 60) RXPC.clear(); e = { c, T, hw, up, dn }; RXPC.set(key, e);
    }
    const f = W2S(x, y, 0), s = T / e.T; ctx.drawImage(e.c, f[0] - e.hw * s, f[1] - e.up * s, 2 * e.hw * s, (e.up + e.dn) * s);
  }
  // a soft lumpy mound (snow): rings of wobbly points going up, each face lit by its slope, a lid on top
  function rxHeap(cx, cy, rx, ry, h, col, seed) {
    const pr = [[1, 0], [0.96, 0.2], [0.86, 0.45], [0.68, 0.7], [0.42, 0.9], [0.14, 1]], n = 18, vz = rxVz(), Q = [], p1 = kH(seed, 1, 93) * 6.28, p2 = kH(seed, 2, 93) * 6.28;
    const wob = (a, zf) => 0.86 + 0.12 * Math.sin(a * 2 + p1 + zf) + 0.07 * Math.sin(a * 3 + p2 - zf * 2);   // smooth lumps
    pr.forEach(([f, zf], i) => { const ring = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, w = f * wob(a, zf); ring.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w, h * zf * (i ? 0.9 + 0.2 * Math.sin(a + p2) : 0)]); } Q.push(ring); });
    const S = Q.map(rg => rg.map(p => W2S(p[0], p[1], p[2]))), face = (pts, f) => { rc.fillStyle = rc.strokeStyle = rxShade(col, f); rc.beginPath(); pts.forEach((q, j) => j ? rc.lineTo(q[0], q[1]) : rc.moveTo(q[0], q[1])); rc.closePath(); rc.fill(); rc.stroke(); };
    rc.lineWidth = 0.6;
    for (let i = 0; i < Q.length - 1; i++) for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n, A = Q[i][k], B = Q[i][k1], C = Q[i + 1][k1], D = Q[i + 1][k], ux = C[0] - A[0], uy = C[1] - A[1], uz = C[2] - A[2], wx = D[0] - B[0], wy = D[1] - B[1], wz = D[2] - B[2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      if (nx * ((A[0] + C[0]) / 2 - cx) + ny * ((A[1] + C[1]) / 2 - cy) + nz * 0.01 < 0) { nx = -nx; ny = -ny; nz = -nz; }   // outwards
      if (nx + ny + nz * vz <= 0) continue;
      face([S[i][k], S[i][k1], S[i + 1][k1], S[i + 1][k]], rxLit(nx, ny, nz));
    }
    face(S[S.length - 1], rxLit(0, 0, 1));
    return S;
  }
  Object.assign(PROP, {
    rx_drift(p, T) { rxKeep(p, T, () => {   // 1.27.5: a drift of snow heaped in a corner of the ice (it was a painted patch): a soft lumpy mound, sparkling
      rxShadow(p.x + 0.03, p.y + 0.03, 0.27, 0.23, 0.25);
      rxLift = 0.5; const S = rxHeap(p.x, p.y, 0.27, 0.24, 0.095, '#eaf3fb', p.v * 7 + 3); rxLift = 0;
      rc.fillStyle = 'rgba(255,255,255,0.95)'; for (let k = 0; k < 5; k++) { const q = S[2 + (k % 3)][(k * 7 + p.v) % 18], s = Math.max(1, T * 0.014); rc.fillRect(q[0] - s / 2, q[1] - s / 2, s, s); }
    }); }
  });
  function rxShards(p, col, hmax) {   // a cluster of six-sided crystals leaning out, back ones first
    const S = [[-0.06, 0.02, 0.75, -0.25], [0.05, -0.02, 1, 0.1], [0.1, 0.06, 0.55, 0.35], [-0.02, 0.07, 0.45, -0.05]].slice(0, 2 + (p.v % 3)).sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    S.forEach(([u, v, hf, lean], k) => rxCrystal(p.x + u, p.y + v, 0.055 * p.s, hmax * hf * p.s, lean * 0.3, -lean * 0.15, col, k * 0.7 + p.v, 0.92));
  }
  // ---------- 1.27.5: what stands out of the walls of an effect room (F: wallFrame; u along the face, d out of it, z up) ----------
  function rxHang(F, u, d, z, L, r, lit, dark, sw) {   // a strand hanging from the wall (weed, moss): round, tapering, bending out and swaying
    const a = rxWP(F, u, 0.01, z), m = rxWP(F, u + (sw || 0) * 0.5, d, z - L * 0.5), b = rxWP(F, u + (sw || 0), d * 0.7, z - L);
    rxRod(a, m, r, r * 0.75, lit, dark); rxRod(m, b, r * 0.75, r * 0.3, lit, dark);
  }
  function rxDrape(F, z0, z1, n, col, sw) {   // a cloth hanging in deep folds: strips zig-zagging out of the face, each lit by its slope
    const P = []; for (let k = 0; k <= n * 2; k++) { const u = 0.04 + 0.92 * k / (n * 2), d = k % 2 ? 0.085 : 0.035; P.push([u, d + (k % 2 ? sw : 0)]); }
    for (let k = 0; k < n * 2; k++) { const [u0, d0] = P[k], [u1, d1] = P[k + 1], b0 = z0, b1 = z0;
      rxSolid([rxWP(F, u0, d0, z1), rxWP(F, u1, d1, z1), rxWP(F, u1, d1, b1), rxWP(F, u0, d0, b0)], [[0, 1, 2, 3]], col, null, true); }
  }
  const RFX_WALL3D = {
    fog(F, h, T, t, s, lite) {   // mist pooled at the foot of the wall, rolling along it; a curtain of grey moss strands off the top now and then
      const spr = rxFog(); for (let k = s % 2; k < 1; k++) { const u = ((t * 0.04 + s * 0.13 + k * 0.5) % 1.4) - 0.2, [wx, wy] = F.W(u, 0.18), q = W2S(wx, wy, 0.22 + 0.1 * k), r = T * (0.55 + 0.15 * k); rc.globalAlpha = 0.6; rc.drawImage(spr, q[0] - r, q[1] - r * 0.55, r * 2, r * 1.1); }
      rc.globalAlpha = 1;
      if (s % 3) return;
      for (let k = 0; k < 6; k++) { const u = 0.12 + k * 0.15, L = (lite ? 0.25 : 0.4) + 0.25 * ((k * 7 + s) % 3) / 2; rxHang(F, u, 0.1, h - 0.02, L, 0.03, '#a8b0a2', '#5a6258', Math.sin(t * 0.8 + k + s) * 0.02); }
      for (let k = 0; k < 3; k++) { const [wx, wy] = F.W(0.2 + k * 0.3, 0.04); rxEgg(wx, wy, h - 0.05, 0.08, 0.04, '#7a8476'); }   // the clumps they hang from
    },
    swamp(F, h, T, t, s, lite) {   // a hanging fringe of weed strands off the top, thick shelves of fungus out of the wet stone
      for (let k = 0; k < 4; k++) { const u = 0.15 + k * 0.23 + 0.05 * (s % 3); rxHang(F, u, 0.1, h - 0.02, 0.3 + 0.15 * ((k + s) % 3), 0.034, '#7a9a44', '#34501c', 0.03); }
      if (!lite && s % 3 === 0) [[0.3, 0.55, 0.13], [0.48, 0.42, 0.09]].forEach(([u, z, r]) => {
        const n = 9, P = [], Fc = [[], []]; for (let k = 0; k < n; k++) { const a = k / (n - 1) * Math.PI; P.push(rxWP(F, u + Math.cos(a) * r, Math.sin(a) * r * 0.85, z)); Fc[0].push(k); }
        for (let k = 0; k < n; k++) { const a = k / (n - 1) * Math.PI; P.push(rxWP(F, u + Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.75, z - 0.035)); Fc[1].push(n + k); }
        for (let k = 0; k < n - 1; k++) Fc.push([k, k + 1, n + k + 1, n + k]);
        rxSolid(P, Fc, '#8a7a50', [0, '#4a3e28']);
      });
    },
    grotto(F, h, T, t, s, lite) {   // faceted stalactites of wet blue stone hanging off the top edge out of a boss of rock, a drop gathering at one
      const n = lite ? 2 : 3;
      for (let k = 0; k < n; k++) { const u = 0.18 + k * (0.64 / (n - 1 || 1)) + 0.04 * ((s + k) % 2), [wx, wy] = F.W(u, 0.09), L = 0.28 + 0.14 * ((k + s) % 3), r = 0.07 + 0.015 * (k % 2);
        if (wSt()) rxLathe(wx, wy, h - L, [[0, 0], [r * 0.45, L * 0.45], [r * 0.85, L * 0.82], [r, L]], 7, '#7a8cae', k + s, false);   // 1.28.0: wSt / wLv (the wall cache)
        if (k === 1 && !reduceMotion && wLv()) { const p = (t * 0.5 + s * 0.1) % 1; const q = W2S(wx, wy, h - L - 0.02 - (p > 0.6 ? (p - 0.6) * 3 : 0)); rc.fillStyle = 'rgba(200,225,255,' + (p > 0.9 ? 0 : 0.9) + ')'; rc.beginPath(); rc.arc(q[0], q[1], Math.max(1, T * 0.02 * Math.min(1, p * 2)), 0, Math.PI * 2); rc.fill(); } }
    },
    crypt(F, h, T, t, s, lite) {   // a stone niche standing out of the wall (pillars, an arch, a sill), a candle burning violet in it; a sheet of cobweb in the corner
      if (lite || s % 3) { const a = rxWP(F, 0, 0.01, h), b = rxWP(F, 0.32, 0.01, h), c = rxWP(F, 0, 0.01, h - 0.38), m = rxWP(F, 0.1, 0.12, h - 0.12), A = W2S(...a), B = W2S(...b), C = W2S(...c), M = W2S(...m);
        rc.fillStyle = 'rgba(225,215,245,0.2)'; rc.beginPath(); rc.moveTo(A[0], A[1]); rc.lineTo(B[0], B[1]); rc.quadraticCurveTo(M[0], M[1], C[0], C[1]); rc.closePath(); rc.fill();
        rc.strokeStyle = 'rgba(230,222,248,0.45)'; rc.lineWidth = 1; rc.beginPath(); [0.3, 0.6].forEach(f => { const q = [A[0] + (M[0] - A[0]) * f, A[1] + (M[1] - A[1]) * f]; rc.moveTo(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f); rc.quadraticCurveTo(q[0], q[1], A[0] + (C[0] - A[0]) * f, A[1] + (C[1] - A[1]) * f); }); rc.moveTo(A[0], A[1]); rc.lineTo(M[0], M[1]); rc.stroke(); return; }
      const z = Math.min(0.75, h - 0.75), zt = z + 0.42;
      if (wSt()) {   // 1.28.0: the niche still, the flame live
      rc.save(); F.plane(0.004, z, z + 0.6); rc.fillStyle = '#0c0812'; rc.beginPath(); rc.moveTo(0.3, 1); rc.lineTo(0.3, 0.3); rc.arc(0.5, 0.3, 0.2, Math.PI, 0); rc.lineTo(0.7, 1); rc.fill(); rc.restore();   // the dark hollow
      rxXW(F, [[0.24, z], [0.3, z], [0.3, zt], [0.24, zt]], 0, 0.09, '#5a526a');
      for (let k = 0; k < 5; k++) { const a0 = Math.PI - k * Math.PI / 5, a1 = Math.PI - (k + 1) * Math.PI / 5, c = (a, r) => [0.5 + Math.cos(a) * r, zt + Math.sin(a) * r * 0.9]; rxXW(F, [c(a0, 0.26), c(a1, 0.26), c(a1, 0.2), c(a0, 0.2)], 0, 0.09, '#5a526a'); }
      rxXW(F, [[0.7, z], [0.76, z], [0.76, zt], [0.7, zt]], 0, 0.09, '#5a526a');
      F.box(0.5, 0.06, 0.56, 0.12, 0.04, z - 0.04, '#5a526a', '#463e56', '#342e42');
      }
      const [wx, wy] = F.W(0.5, 0.05), q = W2S(wx, wy, z + 0.152); if (wSt()) rxLathe(wx, wy, z, [[0.032, 0], [0.032, 0.14], [0.026, 0.152]], 7, '#ddd6e8', 0.3);
      if (wLv()) pFlame(q[0], q[1], T * 0.13, t, s, 'rgba(245,235,255,0.95)', 'rgba(170,120,255,0.85)', ['rxcandV', [[0, 'rgba(180,140,255,0.4)'], [1, 'rgba(180,140,255,0)']]]);
    },
    vault(F, h, T, t, s, lite) {   // a thick gold plate on the wall with a jewel set in it; round gilded studs along the top edge
      if (wSt()) for (let k = 0; k < 5; k++) { const [wx, wy] = F.W(0.1 + k * 0.2, 0.0); rxBall(wx, wy, h - 0.12, 0.026, '#c9a24e'); }
      if (lite || s % 3) return;
      const pts = [[0.5, 1.2], [0.78, 1.0], [0.7, 0.6], [0.5, 0.47], [0.3, 0.6], [0.22, 1.0]];
      if (wSt()) { rxXW(F, pts, 0, 0.05, '#d8b04c'); const [jx, jy] = F.W(0.5, 0.05); rxEgg(jx, jy, 0.85, 0.045, 0.045, '#c03040'); }   // 1.28.0: wSt / wLv (the sheen live)
      rc.save(); F.plane(0.051, 0.35, 1.35); rc.strokeStyle = '#8a6420'; rc.lineWidth = 0.02; if (wSt()) { rc.beginPath(); rc.moveTo(0.5, 0.22); rc.lineTo(0.72, 0.38); rc.lineTo(0.66, 0.71); rc.lineTo(0.5, 0.81); rc.lineTo(0.34, 0.71); rc.lineTo(0.28, 0.38); rc.closePath(); rc.stroke(); }
      if (wLv()) { rc.fillStyle = 'rgba(255,246,200,' + (0.25 + 0.2 * Math.sin(t * 2 + s)).toFixed(2) + ')'; rc.beginPath(); rc.moveTo(0.5, 0.15); rc.lineTo(0.78, 0.35); rc.lineTo(0.62, 0.38); rc.closePath(); rc.fill(); } rc.restore();
    },
    haven(F, h, T, t, s, lite) {   // a thick cloth hanging off a rod with the sign of the sanctuary; a warm candle on an iron bracket
      if (s % 2 === 0 && !lite) {
        if (!wLv()) return;   // 1.28.0: the cloth sways: live
        const sw = Math.sin(t * 1.1 + s) * 0.01;
        rxXW(F, [[0.3, 1.39], [0.7, 1.39], [0.7 + sw, 0.55], [0.5 + sw, 0.42], [0.3 + sw, 0.55]], 0.025, 0.05, '#e8dcc0');
        rc.save(); F.plane(0.051, 0.25, 1.45); rc.fillStyle = '#b8862e'; rc.fillRect(0.47, 0.18, 0.06, 0.4); rc.fillRect(0.38, 0.28, 0.24, 0.06); rc.strokeStyle = '#a07a3a'; rc.lineWidth = 0.015; rc.beginPath(); rc.moveTo(0.33, 0.08); rc.lineTo(0.67, 0.08); rc.lineTo(0.67, 0.73); rc.lineTo(0.5, 0.82); rc.lineTo(0.33, 0.73); rc.closePath(); rc.stroke(); rc.restore();
        rxRod(rxWP(F, 0.24, 0.05, 1.41), rxWP(F, 0.76, 0.05, 1.41), 0.02, 0.02, '#7a5230', '#3a2412');
        [0.24, 0.76].forEach(u => { const [wx, wy] = F.W(u, 0.05); rxBall(wx, wy, 1.385, 0.026, '#6a4424'); });
        return;
      }
      if (s % 3) return;
      const z = Math.min(0.95, h - 0.4);
      const [wx, wy] = F.W(0.5, 0.13), q = W2S(wx, wy, z + 0.132);
      if (wSt()) { rxRod(rxWP(F, 0.5, 0, z - 0.08), rxWP(F, 0.5, 0.13, z), 0.016, 0.014, '#5a5e66', '#2a2c30'); rxLathe(wx, wy, z, [[0.05, 0], [0.055, 0.02]], 8, '#6a4a2a', 0.2); rxLathe(wx, wy, z + 0.02, [[0.028, 0], [0.028, 0.12], [0.022, 0.132]], 7, '#efe2c4', 0.3); }   // 1.28.0: the bracket still, the flame live
      if (wLv()) pFlame(q[0], q[1], T * 0.12, t, s, 'rgba(255,240,190,0.95)', 'rgba(255,160,60,0.9)', ['rxcandH', [[0, 'rgba(255,200,120,0.45)'], [1, 'rgba(255,200,120,0)']]]);
    },
    gears(F, h, T, t, s, lite) {   // a thick cog half out of the wall, turning; a copper pipe on brackets along the foot
      if (wSt()) {   // 1.28.0: the plate, the rivets and the pipe still; the cog and its axle live
        F.box(0.5, 0.012, 1, 0.024, 0.34, 0, '#a07a48', '#7a5630', '#5a3e22');   // 1.27.5: the riveted bronze plate along the foot stands out of the face (it was painted), round rivets on it
      for (let k = 0; k < 5; k++) { const [wx, wy] = F.W(0.1 + k * 0.2, 0.024); rxBall(wx, wy, 0.255, 0.017, '#c49a62'); }
        if (s % 2 === 0) { [0.2, 0.8].forEach(u => F.box(u, 0.03, 0.05, 0.06, 0.08, 0.12, '#4a4e57', '#33363d', '#2a2d33')); rxHCyl(rxWP(F, -0.02, 0.06, 0.16), rxWP(F, 1.02, 0.06, 0.16), 0.045, 8, '#a8683a'); }
      }
      if ((lite ? s % 4 : s % 2) || !wLv()) return;
      const dir = s % 4 ? 1 : -1, a = t * 0.7 * dir, z0 = Math.min(0.45, h - 1.0), r = lite ? 0.18 : 0.3;
      rc.save();
      [['#2e2010', 0.0], ['#3e2c16', 0.02], ['#52381c', 0.04], ['#664824', 0.055]].forEach(([c, d]) => { F.plane(d, z0, z0 + 1); rxGear(0.5, 0.5, r, 10, a, c, null, null); });
      F.plane(0.07, z0, z0 + 1); rxGear(0.5, 0.5, r, 10, a, '#a87a40', '#e0b070', '#1c120a');
      if (!lite) { [['#4a3418', 0.075], ['#5e4222', 0.085]].forEach(([c, d]) => { F.plane(d, z0, z0 + 1); rxGear(0.5 + r * 1.55, 0.5 - r * 0.7, r * 0.55, 8, -a * 10 / 8 + 0.2, c, null, null); }); F.plane(0.095, z0, z0 + 1); rxGear(0.5 + r * 1.55, 0.5 - r * 0.7, r * 0.55, 8, -a * 10 / 8 + 0.2, '#8a6434', '#c99a5a', '#1c120a'); }
      rc.restore();
      const zc = z0 + 0.5; rxHCyl(rxWP(F, 0.5, 0.06, zc), rxWP(F, 0.5, 0.11, zc), 0.035, 8, '#4a4e57', '#2a2d33');   // its axle
    },
    hush(F, h, T, t, s, lite) {   // a heavy drape hanging down the wall in deep folds under a pelmet (with a komnata: the pelmet and a short valance only)
      const z1 = h - 0.08, z0 = lite ? h - 0.3 : 0.05;
      if (!lite && s % 3 === 2) return;
      rxDrape(F, z0, z1, lite ? 4 : 5, '#5a6280', 0);
      F.box(0.5, 0.06, 0.98, 0.12, 0.08, h - 0.1, '#7a6a4a', '#5e5038', '#4a3e2c');
    },
    ice(F, h, T, t, s, lite) {   // a cornice of ice along the top edge, icicles of all lengths hanging off it, clear, faceted
      const n = lite ? 3 : 5;
      if (wSt()) {   // 1.28.0: the cornice and the icicles still, the drop live
      F.box(0.5, 0.04, 1, 0.08, 0.05, h - 0.05, '#e8f6ff', '#b4dcf2', '#86bede');
      const A = rc.globalAlpha; rc.globalAlpha = A * 0.95; rxLift = 0.4;
      for (let k = 0; k < n; k++) { const u = 0.1 + 0.8 * (k + 0.5) / n + 0.03 * ((s + k) % 3 - 1), [wx, wy] = F.W(u, 0.05), L = 0.12 + (lite ? 0.12 : 0.3) * (((k * 7 + s) % 5) / 4), r = 0.05 + 0.012 * (k % 2);
        rxLathe(wx, wy, h - 0.05 - L, [[0, 0], [r * 0.55, L * 0.5], [r, L]], 6, '#d8f0ff', k + s, false);
        rxLine(W2S(wx - r * 0.5, wy + r * 0.5, h - 0.06), W2S(wx, wy, h - 0.05 - L), 'rgba(255,255,255,0.75)', Math.max(1, T * 0.01)); }
      rc.globalAlpha = A; rxLift = 0;
      }
      const p = (t * 0.4 + s * 0.13) % 1; if (!reduceMotion && p < 0.5 && wLv()) { const [wx, wy] = F.W(0.1 + 0.8 * 1.5 / n, 0.05); const q = W2S(wx, wy, h - 0.35 - p * 1.2); rc.fillStyle = 'rgba(220,240,255,0.8)'; rc.beginPath(); rc.arc(q[0], q[1], Math.max(1, T * 0.018), 0, Math.PI * 2); rc.fill(); }
    }
  };
