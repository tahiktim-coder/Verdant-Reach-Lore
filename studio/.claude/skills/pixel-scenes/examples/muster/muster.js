/* Muster of the Reach: a creature roster in the Still Water pixel technique.
   Every portrait is its own palette-indexed scene with one hue-shifting ramp, light in frame,
   clean bands with Bayer dither only across band edges, and hand-drawn silhouettes with automatic rim light. */
(function () {
'use strict';
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
const W = 216, H_MIN = 384, H_MAX = 470;
let H = H_MIN;
const PW = 198, PH = 124, PX0 = 9, PY0 = 24;          // portrait window

// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct) { let f = 0, amp = 0.5, tot = 0; for (let i = 0; i < oct; i++) { f += amp * vnoise(x, y, s + i * 131); tot += amp; x *= 2.02; y *= 2.02; amp *= 0.5; } return f / tot; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
function dith(f, x, y) { const fl = Math.floor(f); let fr = f - fl; fr = fr < 0.28 ? 0 : fr > 0.72 ? 1 : (fr - 0.28) / 0.44; return fl + (fr > BAYER[((y & 3) << 2) | (x & 3)] ? 1 : 0); }
const r12 = v => (v < 0 ? 0 : v > 11 ? 11 : v);

// ---------------------------------------------------------------- palettes: one ramp per scene, 16 slots each
const hexc = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const PALDEF = {
  ui: ['#0a110e', '#111c17', '#182720', '#22352b', '#2e4637', '#3f5a44', '#4b3518', '#7a5a26', '#b08a3e', '#dcbf73', '#fbeec2', '#86e0b4'],
  pebble: ['#070b14', '#0d1524', '#132036', '#1b2c45', '#233b56', '#2d4c66', '#3a6076', '#4a7686', '#5f8e96', '#7ba8a8', '#a3c7c0', '#d9ecdf', '#9ff5c5', '#f4f8f0'],
  stone: ['#0f0a1c', '#1b1230', '#2a1943', '#3d2150', '#552a5a', '#70345e', '#8f425e', '#ad5558', '#c96e4f', '#df8f4b', '#efb85a', '#fbe29a', '#bff0cf'],
  knight: ['#08110d', '#0e1c16', '#14281d', '#1b3625', '#23452d', '#2e5635', '#3c6a3c', '#518143', '#6d974c', '#93af5c', '#c1c877', '#f0e7a7', '#fff6d0'],
  fish: ['#0d0507', '#1a080c', '#2a0d12', '#3d1116', '#52161a', '#6b1c1d', '#862520', '#a33426', '#c04a30', '#d9683e', '#ee9055', '#fcc27a', '#f3e6c8', '#8fb3b0'],
  hunter: ['#07060c', '#0e0c17', '#161324', '#1f1a31', '#2a2240', '#362b4f', '#45355e', '#58436e', '#6f567f', '#8b6f92', '#ae92aa', '#dcc6cc', '#9ff0ff', '#e8ffff'],
  loaf: ['#0f0a1c', '#1b1230', '#2a1943', '#3d2150', '#552a5a', '#70345e', '#8f425e', '#ad5558', '#c96e4f', '#df8f4b', '#efb85a', '#fbe29a', '#6f6384', '#9a8fae', '#c9c0d2', '#f1ebea'],
};
const OFF = {}, PAL = new Uint32Array(256);
(function () {
  let o = 0;
  for (const k of ['ui', 'pebble', 'stone', 'knight', 'fish', 'hunter', 'loaf']) {
    OFF[k] = o;
    PALDEF[k].forEach((h, i) => { const c = hexc(h); PAL[o + i] = (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; });
    o += 16;
  }
})();
let PALCUR = new Uint32Array(256);
function buildPal(dim) {
  const k = 1 - clamp(dim, 0, 1);
  for (let i = 0; i < 256; i++) {
    const p = PAL[i];
    PALCUR[i] = (0xff000000 | ((((p >>> 16) & 255) * k) << 16) | ((((p >>> 8) & 255) * k) << 8) | ((p & 255) * k)) >>> 0;
  }
}

// ---------------------------------------------------------------- sprites
function sprite(rows, map) {
  const h = rows.length, w = rows[0].length, data = new Uint8Array(w * h).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = rows[y][x], v = map[ch]; data[y * w + x] = v === undefined ? 255 : v; }
  return { w, h, data };
}
// silhouettes get their rim light from the light's direction, so they only need drawing as shapes
function rimLit(s, lx, ly, body, rim, rim2) {
  const out = new Uint8Array(s.data);
  const op = (x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h && s.data[y * s.w + x] !== 255;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const i = y * s.w + x;
    if (s.data[i] === 255) continue;
    if (s.data[i] !== body) continue;                     // hand-placed detail stays
    if (!op(x + lx, y + ly) || !op(x + Math.sign(lx), y) || !op(x, y + Math.sign(ly))) out[i] = rim;
    else if (rim2 !== undefined && (!op(x + 2 * lx, y + 2 * ly))) out[i] = rim2;
  }
  return { w: s.w, h: s.h, data: out };
}
function stamp(b, s, x0, y0, o, flip) {
  for (let j = 0; j < s.h; j++) {
    const y = y0 + j;
    if (y < 0 || y >= PH) continue;
    for (let i = 0; i < s.w; i++) {
      const v = s.data[j * s.w + (flip ? s.w - 1 - i : i)];
      if (v === 255) continue;
      const x = x0 + i;
      if (x >= 0 && x < PW) b[y * PW + x] = o + v;
    }
  }
}
const put = (b, x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < PW && y >= 0 && y < PH) b[y * PW + x] = v; };
function line(b, x0, y0, x1, y1, v) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) put(b, lerp(x0, x1, k / n), lerp(y0, y1, k / n), v);
}

// ---------------------------------------------------------------- scene helpers (portrait space)
function genRidge(pts, rough, seed) {
  const rng = mulberry32(seed), x0 = pts[0][0], x1 = pts[pts.length - 1][0], ys = new Float32Array(x1 - x0 + 1);
  function sub(a, l, r) { if (r - l < 2) return; const m = (l + r) >> 1; a[m] = lerp(a[l], a[r], (m - l) / (r - l)) + (rng() - 0.5) * (r - l) * rough; sub(a, l, m); sub(a, m, r); }
  for (let k = 0; k < pts.length - 1; k++) {
    const ax = pts[k][0], bx = pts[k + 1][0], n = bx - ax;
    if (n <= 0) continue;
    const seg = new Float32Array(n + 1); seg[0] = pts[k][1]; seg[n] = pts[k + 1][1]; sub(seg, 0, n);
    for (let i = 0; i <= n; i++) ys[ax - x0 + i] = seg[i];
  }
  return x => ys[clamp(Math.round(x) - x0, 0, ys.length - 1)];
}
// sky: gradient toward a glowing light, optional horizon band
function paintSky(b, o, hz, L, top, bot, glow, band) {
  for (let y = 0; y < hz; y++) for (let x = 0; x < PW; x++) {
    const ty = y / hz, dx = x - L.x, dy = y - L.y, d2 = dx * dx + dy * dy;
    let f = top + (bot - top) * Math.pow(ty, 1.6) + glow * (Math.exp(-d2 / (L.g1 || 260)) * 0.6 + Math.exp(-d2 / (L.g2 || 2400)) * 0.4);
    f += band * Math.exp(-((hz - y) * (hz - y)) / 160) * (0.4 + 0.6 * Math.exp(-(dx * dx) / 7000));
    b[y * PW + x] = o + r12(dith(f, x, y));
  }
}
function paintDisc(b, o, L, core, rim) {
  for (let y = Math.floor(L.y - L.r - 1); y <= L.y + L.r + 1; y++) for (let x = Math.floor(L.x - L.r - 1); x <= L.x + L.r + 1; x++) {
    const d = Math.hypot(x - L.x, y - L.y);
    if (d <= L.r + 0.3) put(b, x, y, o + (d > L.r - 1.1 ? rim : core));
  }
}
// clouds: puff clusters, edges facing the light glow
function paintClouds(b, o, clusters, L, seed, base, lit, keep) {
  const rng = mulberry32(seed), puffs = [];
  for (const [cx, cy, cw, ch, n, r0, r1] of clusters) for (let k = 0; k < n; k++) {
    const u = rng() * 2 - 1, v = rng() * 2 - 1, r = lerp(r0, r1, rng()) * (1 - 0.35 * Math.abs(u));
    puffs.push([cx + u * cw * 0.5, cy + v * ch * 0.5, r, cy + ch * 0.5]);
  }
  const dens = new Float32Array(PW * PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    let d = 0;
    for (const p of puffs) { const dx = x - p[0], dy = (y - p[1]) * 2.1, q = (dx * dx + dy * dy) / (p[2] * p[2]); if (q < 1) { let kk = (1 - q) * (1 - q); if (y > p[3]) kk *= Math.exp(-(y - p[3]) / 1.5); d += kk; } }
    if (d > 0.02) d += (fbm(x * 0.07, y * 0.2, seed, 3) - 0.5) * 0.34;
    d *= clamp((Math.hypot(x - L.x, y - L.y) - (keep || 14)) / 10, 0, 1);
    dens[y * PW + x] = d;
  }
  const S = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= PW || y >= PH ? 0 : dens[y * PW + x]; };
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const d = dens[y * PW + x];
    if (d <= 0.3) continue;
    let lx = L.x - x, ly = L.y - y; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
    const sh = d - S(x + lx * 3, y + ly * 3);
    let f = base + 2.6 * Math.exp(-(ll * ll) / 4000);
    if (sh > 0.03) f += lit * (0.6 + clamp(sh * 4, 0, 0.8)); else if (sh < -0.05) f -= 0.5;
    if (S(x, y - 1) <= 0.3) f -= 0.5;
    if (d < 0.36) f -= 0.4;
    b[y * PW + x] = o + r12(dith(f, x, y));
  }
}
function fillBelow(b, o, top, fv) {
  for (let x = 0; x < PW; x++) { const t0 = Math.max(0, Math.ceil(top(x))); for (let y = t0; y < PH; y++) b[y * PW + x] = o + r12(dith(fv(x, y, y - t0), x, y)); }
}
// mirror water: reflect what is above the waterline, darker, with a per-row ripple
function mirror(b, o, wy, y1, t, dark, amp) {
  for (let y = wy; y < y1; y++) {
    const sy = 2 * wy - 1 - y;
    if (sy < 0) continue;
    const rip = Math.round(Math.sin(y * 1.9 + t * 1.6) * amp * (0.3 + (y - wy) / (y1 - wy)));
    for (let x = 0; x < PW; x++) {
      const v = b[sy * PW + clamp(x + rip, 0, PW - 1)] - o;
      b[y * PW + x] = o + (v >= 12 ? v : Math.max(0, v - dark));
    }
  }
}

// ---------------------------------------------------------------- 1. Pebble folk: Still Water shore under the moon
const PEB = [];
let SHORE = null, HILLF = null, PLAINF = null;
function genPebble(w, h) {
  const data = new Uint8Array(w * h).fill(255), cx = (w - 1) / 2, cy = (h - 1) / 2 + 0.2;
  const In = (x, y) => x >= 0 && y >= 0 && x < w && y < h && ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1.02;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!In(x, y)) continue;
    let v = 2 + (y < h * 0.4 ? 1 : 0) + (hash2(x, y, w) > 0.8 ? 1 : 0);
    if (!In(x, y - 1) || !In(x + 1, y - 1)) v = 10; else if (!In(x + 1, y) || !In(x, y - 2) || !In(x + 1, y - 2)) v = 7; else if (!In(x - 1, y) || !In(x, y + 1)) v = 0;
    data[y * w + x] = v;
  }
  const ey = Math.max(2, Math.floor(h * 0.38)), gap = w > 14 ? 5 : 4;
  const e1 = Math.round(cx - gap / 2 - 0.5), e2 = e1 + gap;
  return { w, h, data, eyes: [[e1, ey], [e1 + 1, ey], [e2, ey], [e2 + 1, ey]], big: w > 10 };
}
function buildPebble(b, o) {
  const L = { x: 150, y: 24, r: 7, g1: 220, g2: 2600 };
  paintSky(b, o, 62, L, 0.8, 5.2, 4.2, 1.2);
  paintClouds(b, o, [[60, 18, 110, 6, 18, 5, 10], [160, 44, 80, 4, 10, 4, 7]], L, 7, 2.2, 3.2, 14);
  paintDisc(b, o, L, 13, 11);
  const far = genRidge([[0, 57], [30, 54], [60, 58], [90, 55], [110, 60], [198, 60]], 0.25, 3);
  fillBelow(b, o, far, (x, y, d) => 2.6 + 0.8 * Math.exp(-((x - L.x) ** 2) / 2000) - d * 0.3);
  for (let y = 62; y < PH; y++) for (let x = 0; x < PW; x++) b[y * PW + x] = o + 2;
  // the shore
  const shore = genRidge([[0, 98], [50, 95], [100, 99], [150, 96], [198, 100]], 0.12, 5);
  fillBelow(b, o, shore, (x, y, d) => 2.4 + (hash2(x >> 1, y >> 1, 9) > 0.8 ? 1.2 : 0) - (y - 96) * 0.03 + (d < 1 ? 2 : 0));
  PEB.length = 0;
  const defs = [[14, 18, 12], [38, 13, 9], [58, 20, 13], [84, 12, 8], [102, 16, 11], [124, 13, 9], [146, 19, 12], [172, 12, 8]];
  const rng = mulberry32(12);
  for (const [px, w, h] of defs) {
    const s = genPebble(w, h);
    PEB.push({ s, x: px, y: Math.round(shore(px + w / 2)) + 4 + Math.round(rng() * 10), ph: rng(), hop: 0 });
  }
  SHORE = shore;
}
function drawPebble(b, o, t, st) {
  mirror(b, o, 62, Math.round(Math.min(SHORE(0), SHORE(197))) + 2, t, 1, 1.1);
  const L = { x: 150 };
  for (let y = 62; y < 96; y++) {                       // moon path on the water
    const w = 1.5 + (y - 62) * 0.22;
    for (let x = Math.round(L.x - w); x <= L.x + w; x++) if (hash2(x, y, (t * 5) | 0) > 0.8 && b[y * PW + x] - o < 12) put(b, x, y, o + 9);
  }
  for (let x = 0; x < PW; x++) {                         // foam lapping the shore
    const sy = Math.round(SHORE(x)) - 1 + Math.round(Math.sin(t * 1.3 + x * 0.05));
    if (Math.sin(x * 0.4 + t * 2) > 0.2) put(b, x, sy, o + 8);
  }
  for (let k = 0; k < PEB.length; k++) {
    const p = PEB[k];
    const talk = st.talk > 0 ? (((st.talk * 10 + k * 1.3) | 0) & 1) : 0;
    const idleHop = ((t * 0.5 + p.ph * 7) % 9) < 0.18 ? 1 : 0;
    const dy = -(talk || idleHop);
    stamp(b, p.s, p.x, p.y + dy, o);
    const open = ((t * 0.27 + p.ph) % 1) > 0.04;
    for (const e of p.s.eyes) put(b, p.x + e[0], p.y + dy + e[1], open ? o + 12 : o + 2);
  }
}

// ---------------------------------------------------------------- 2. Stone elder: a field at dusk
let ELDER = null;
const FONT = { N: ['1..1', '11.1', '1.11', '1..1', '1..1'], O: ['.11.', '1..1', '1..1', '1..1', '.11.'], T: ['111', '.1.', '.1.', '.1.', '.1.'], U: ['1..1', '1..1', '1..1', '1..1', '.11.'], R: ['111.', '1..1', '111.', '1.1.', '1..1'], S: ['.111', '1...', '.11.', '...1', '111.'] };
function genElder() {
  const w = 44, h = 72;
  const poly = [[16, 0], [23, 0], [29, 3], [33, 9], [36, 18], [37, 28], [39, 40], [40, 52], [42, 64], [43, 72], [0, 72], [1, 62], [3, 50], [4, 38], [5, 26], [8, 14], [11, 5]];
  const inside = (px, py) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const In = (x, y) => x >= 0 && y >= 0 && x < w && y < h && inside(x + 0.5, y + 0.5);
  const data = new Uint8Array(w * h).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!In(x, y)) continue;
    const n = fbm(x * 0.16, y * 0.12, 31, 3);
    let v = n > 0.63 ? 2 : n < 0.34 ? 0 : 1;
    if (!In(x - 1, y) || !In(x, y - 1) || !In(x - 1, y - 1)) v = y < 7 || !In(x - 1, y) ? 8 : 7;   // sun on the left
    else if (!In(x - 2, y) || !In(x, y - 2)) v = 4;
    if (!In(x + 1, y)) v = 0;
    data[y * w + x] = v;
  }
  const eye = (ex, ey) => { for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 5; dx++) if (!((dy === 0 || dy === 2) && (dx === 0 || dx === 4))) data[(ey + dy) * w + ex + dx] = 0; };
  eye(12, 15); eye(24, 15);
  const carve = (txt, x0, y0) => { let cx = x0; for (const ch of txt) { const g = FONT[ch]; for (let r = 0; r < 5; r++) for (let c = 0; c < g[r].length; c++) if (g[r][c] === '1' && In(cx + c, y0 + r)) data[(y0 + r) * w + cx + c] = 5; cx += g[0].length + 1; } };
  carve('NOT', 15, 28); carve('OURS', 12, 36);
  return { w, h, data, eyes: [[14, 16], [15, 16], [26, 16], [27, 16]] };
}
function buildStone(b, o) {
  const L = { x: 44, y: 56, r: 7, g1: 300, g2: 3000 };
  paintSky(b, o, 76, L, 1.6, 8.0, 3.6, 1.8);
  paintClouds(b, o, [[140, 18, 150, 7, 26, 6, 12], [40, 34, 70, 5, 12, 4, 8], [150, 52, 70, 4, 10, 4, 6]], L, 11, 3.4, 2.8, 18);
  paintDisc(b, o, L, 11, 10);
  const far = genRidge([[0, 74], [40, 72], [80, 74], [130, 70], [170, 72], [198, 69]], 0.3, 4);
  fillBelow(b, o, far, (x, y, d) => 6.4 + 1.2 * Math.exp(-((x - L.x) ** 2) / 1800) - Math.min(d, 2) * 0.35 + (d < 1 ? 0.6 : 0));
  for (let y = 77; y < PH; y++) for (let x = 0; x < PW; x++) {
    const dy = y - 76;
    let f = 3.0 + 5.0 * Math.exp(-dy / 14) + 1.8 * Math.exp(-((x - L.x) ** 2) / 2600) * Math.exp(-dy / 16);
    f += (vnoise(x * 0.9, y * 0.25, 41) - 0.5) * clamp((dy - 14) / 20, 0, 1) * 1.1;
    b[y * PW + x] = o + r12(dith(f, x, y));
  }
  if (!ELDER) ELDER = genElder();
}
function drawStone(b, o, t, st) {
  for (let y = 78; y < PH; y++) for (let x = 0; x < PW; x++) {        // wind over the wheat
    const w = Math.sin(x * 0.05 + (y - 76) * 0.22 - t * 1.4 + vnoise(x * 0.02, y * 0.05, 3) * 3);
    if (w > 0.55) { const i = y * PW + x, v = b[i] - o; if (v < 11) b[i] = o + v + 1; }
  }
  const shake = st.talk > 0 && ((t * 22) | 0) & 1 ? 1 : 0;
  stamp(b, ELDER, 118 + shake, PH - ELDER.h + 12, o);
  const open = st.talk > 0 || ((t * 0.21) % 1) > 0.04;
  for (const e of ELDER.eyes) put(b, 118 + shake + e[0], PH - ELDER.h + 12 + e[1], open ? o + 12 : o);
  for (let k = 0; k < 3; k++) {                                          // small ones at its foot
    const px = 98 + k * 8, py = PH - 8 + (k & 1);
    const s = PEBSMALL[k];
    const dy = st.talk > 0 && (((st.talk * 9 + k) | 0) & 1) ? -1 : 0;
    stamp(b, s, px, py + dy, o);
    put(b, px + 1, py + dy + 1, o + 12); put(b, px + s.w - 2, py + dy + 1, o + 12);
  }
}
const PEBSMALL = [
  sprite(['.1111.', '111111', '011111', '.0000.'], { '0': 0, '1': 1 }),
  sprite(['.111.', '11111', '.000.'], { '0': 0, '1': 1 }),
  sprite(['.1111.', '111111', '.0000.'], { '0': 0, '1': 1 }),
];

// ---------------------------------------------------------------- 3. Verdant Knight: dawn on a hill
const KNIGHT = rimLit(sprite([
  '........###..........',
  '.......#####.........',
  '.......######........',
  '.......######........',
  '.......#####.........',
  '........###..........',
  '......########.......',
  '.....##########......',
  '.....###########.....',
  '.....############....',
  '.....#######..###....',
  '.....#######.........',
  '.....#######.........',
  '.....########........',
  '.....########........',
  '....##########.......',
  '....##########.......',
  '....###########......',
  '....###########......',
  '....####...####......',
  '.....###...####......',
  '.....###....###......',
  '.....###....###......',
  '.....###....###......',
  '.....###....###......',
  '.....###....###......',
  '.....###....###......',
  '....####....####.....',
  '....#####...#####....',
], { '#': 0 }), 1, -1, 0, 9, 3);
const CASTLE = sprite([
  '..............#...............',
  '..............#...............',
  '.............###..............',
  '.............###..............',
  '....#.#......###......#.#.....',
  '....###......###......###.....',
  '....###.....#####.....###.....',
  '....###.....#####.....###.....',
  '...#####.#..#####..#.#####....',
  '...#####.#.#######.#.#####....',
  '...###############.#######....',
  '..###########################.',
  '..###########################.',
  '.#############################',
], { '#': 0 });
function buildKnight(b, o) {
  const L = { x: 156, y: 70, r: 8, g1: 260, g2: 3200 };
  paintSky(b, o, 86, L, 2.0, 8.4, 3.6, 2.0);
  paintClouds(b, o, [[70, 22, 150, 6, 26, 6, 12], [160, 44, 70, 4, 10, 4, 7], [40, 56, 60, 3, 8, 3, 6]], L, 21, 3.6, 3.4, 16);
  paintDisc(b, o, L, 12, 11);
  const far = genRidge([[0, 80], [30, 74], [60, 78], [100, 82], [140, 84], [198, 80]], 0.28, 8);
  fillBelow(b, o, far, (x, y, d) => 5.2 + 1.8 * Math.exp(-((x - L.x) ** 2) / 2600) - Math.min(d, 2) * 0.3 + (d < 1 ? 0.8 : 0));
  // a far castle on its own hill, hazy
  for (let j = 0; j < CASTLE.h; j++) for (let i = 0; i < CASTLE.w; i++) if (CASTLE.data[j * CASTLE.w + i] !== 255) put(b, 22 + i, 62 + j, o + (j === 0 || CASTLE.data[j * CASTLE.w + i - 1] === 255 ? 5 : 4));
  const valley = genRidge([[0, 88], [198, 90]], 0.06, 9);
  fillBelow(b, o, valley, (x, y, d) => 4.2 + 1.6 * Math.exp(-((x - L.x) ** 2) / 3000) * Math.exp(-d / 8) - d * 0.06);
  const hill = genRidge([[0, 110], [40, 104], [80, 99], [104, 97], [130, 99], [170, 106], [198, 112]], 0.08, 10);
  fillBelow(b, o, hill, (x, y, d) => (d < 1 ? 8.4 - Math.abs(x - 110) * 0.03 : d < 2 ? 3 : 1.2) + (hash2(x, y, 2) > 0.85 ? 0.8 : 0));
  HILLF = hill;
}
function drawKnight(b, o, t, st) {
  const fx = 96, fy = Math.round(HILLF(104)) - KNIGHT.h + 1;
  // cape: a cloth sheet from the shoulders, blown left
  for (let j = 0; j < 22; j++) {
    const yy = fy + 6 + j, len = 3 + j * 0.55 + Math.sin(t * 3 + j * 0.45) * (1 + j * 0.12);
    for (let i = 0; i < len; i++) {
      const edge = i > len - 1.2;
      put(b, fx + 5 - i, yy + Math.sin(t * 2.4 + i * 0.3) * 0.6, o + (edge && j < 14 ? 7 : j > 19 ? 2 : 1));
    }
  }
  const raised = st.talk > 0;
  // banner pole and pennant
  const px = fx + 16, top = fy - 16;
  line(b, px, top - (raised ? 4 : 0), px, fy + KNIGHT.h - 1, o + 0);
  put(b, px + 1, top - (raised ? 4 : 0), o + 9);
  for (let i = 0; i < 20; i++) {
    const wav = Math.sin(t * 4 - i * 0.45) * (0.6 + i * 0.08), yy = top + 1 - (raised ? 4 : 0) + wav;
    const hgt = Math.round(6 - i * 0.22 + (i > 16 ? -2 : 0));
    for (let j = 0; j < hgt; j++) put(b, px + 1 + i, yy + j, o + (j === 0 ? 10 : i > 17 ? 6 : 4));
  }
  stamp(b, KNIGHT, fx, fy, o);
  put(b, fx + 11, fy + 3, o + (raised ? 12 : 10));      // light through the visor
}

// ---------------------------------------------------------------- 4. The Fish: Still Water under the red sun
function buildFish(b, o) {
  const L = { x: 132, y: 44, r: 12, g1: 500, g2: 5000 };
  paintSky(b, o, 58, L, 1.0, 8.2, 3.8, 1.6);
  paintClouds(b, o, [[60, 16, 110, 6, 22, 5, 10], [170, 26, 60, 4, 9, 4, 7]], L, 31, 2.8, 3.0, 20);
  paintDisc(b, o, L, 11, 10);
  const far = genRidge([[0, 55], [30, 52], [64, 56], [100, 54], [150, 57], [198, 53]], 0.3, 12);
  fillBelow(b, o, far, (x, y, d) => 1.4 + (d < 1 ? 1.2 : 0));
  for (let y = 58; y < PH; y++) for (let x = 0; x < PW; x++) b[y * PW + x] = o + 3;
}
function drawFish(b, o, t, st) {
  mirror(b, o, 58, PH, t, 2, 1.3);
  for (let y = 58; y < PH; y++) {                       // the red sun's path
    const w = 2 + (y - 58) * 0.2;
    if (y > 98) break;
    for (let x = Math.round(132 - w); x <= 132 + w; x++) if (hash2(x, y, (t * 4) | 0) > 0.84) put(b, x, y, o + (y < 70 ? 11 : 9));
  }
  const cx = 76, cy = 106, rx = 27, ry = 17, wl = 107;   // head breaking the surface
  for (let k = 0; k < 3; k++) {                           // rings
    const age = (t * 0.5 + k / 3) % 1, rr = 30 + age * 50;
    for (let a = 0; a < 6.283; a += 0.015) { const x = cx + Math.cos(a) * rr, y = wl + 1 + Math.sin(a) * rr * 0.16; if (age < 0.85 && Math.sin(a) > -0.3) put(b, x, y, o + (age < 0.5 ? 7 : 6)); }
  }
  // dorsal fin behind the head, spines catching the red light
  for (let i = 0; i < 20; i++) {
    const fxp = cx + 4 + i, top = cy - ry + 1 - Math.round(Math.sin((i / 20) * Math.PI) * 9 + Math.sin(t * 3 + i * 0.6) * 0.6);
    for (let y = top; y < cy - ry + 5; y++) put(b, fxp, y, o + (y === top ? 10 : (i % 4 === 0 ? 6 : 3)));
  }
  const talking = st.talk > 0, mouth = talking && ((t * 8) | 0) & 1;
  for (let y = cy - ry; y < wl; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const nx = (x - cx) / rx, ny = (y - cy) / ry, q = Math.pow(Math.abs(nx) * (nx < 0 ? 1.08 : 0.95), 2.2) + ny * ny;
    if (q > 1) continue;
    const nz = Math.sqrt(Math.max(0, 1 - q));
    let f = 3.2 + nz * 1.5 - ny * 1.6;
    f += Math.pow(1 - nz, 2) * Math.max(0, nx * 0.7 - ny * 0.7) * 7;       // the red sun rims it from behind
    const row = Math.floor((y - cy + 40) / 3), col = Math.floor((x + (row & 1) * 2) / 4);
    if (nx > -0.35 && (y - cy + 40) % 3 === 0 && hash2(col, row, 5) > 0.2) f -= 0.9;   // scale rows
    if (Math.abs(nx + 0.22 + ny * 0.25) < 0.035 && ny > -0.75) f -= 1.8;                  // gill cover
    let v = o + r12(dith(f, x, y));
    if (ny < -0.78 && nx > -0.4 && nx < 0.6 && q > 0.72) v = o + 13;                      // cool sheen on the back
    put(b, x, y, v);
  }
  const ex = cx - 13, ey = cy - 7;                         // eye, big and pale, pupil on us
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = x * x + y * y; if (d <= 17) put(b, ex + x, ey + y, d > 12 ? o + 1 : o + 12); }
  for (let y = -1; y <= 1; y++) for (let x = -2; x <= 0; x++) put(b, ex + x, ey + y, o + 0);
  put(b, ex + 2, ey - 2, o + 13);
  const mx = cx - rx + 1, my = cy + 2;                     // lips and barbels
  if (mouth) { for (let y = -3; y <= 3; y++) for (let x = 0; x <= 6 - Math.abs(y) * 1.4; x++) put(b, mx + x, my + y, o + (Math.abs(y) === 3 ? 8 : 0)); }
  else { line(b, mx, my, mx + 8, my + 1, o + 0); line(b, mx, my - 1, mx + 7, my, o + 8); }
  for (let i = 0; i < 16; i++) { put(b, mx + 2 - i * 0.7, my + 3 + i * 0.8 + Math.sin(t * 2 + i * 0.5) * 0.7, o + 7); put(b, mx + 5 - i * 0.35, my + 4 + i * 0.9 + Math.sin(t * 2.2 + i * 0.4) * 0.6, o + 6); }
  for (let x = cx - rx - 2; x <= cx + rx + 2; x++) if (hash2(x, 3, (t * 3) | 0) > 0.4) put(b, x, wl, o + 8);   // waterline shine
}

// ---------------------------------------------------------------- 5. The Covenant's Hunter: between two moments
const HUNTER = rimLit(sprite([
  '..........##..........',
  '.........####.........',
  '........######........',
  '........######........',
  '.......########.......',
  '.......##....##.......',
  '.......##....##.......',
  '.......########.......',
  '......##########......',
  '.....############.....',
  '....##############....',
  '....###.######.###....',
  '...###..######..###...',
  '...##...######...##...',
  '..##....######....##..',
  '..##....######....##..',
  '..#.....######.....#..',
  '........######........',
  '.......########.......',
  '.......########.......',
  '.......########.......',
  '......##########......',
  '......##########......',
  '......##########......',
  '.....############.....',
  '.....############.....',
  '.....############.....',
  '....##############....',
  '....##############....',
  '....##############....',
  '...################...',
  '...################...',
  '...################...',
  '..##################..',
  '..##################..',
  '..#.##.###.##.##.#.#..',
  '..#..#..#...#..#...#..',
], { '#': 0 }), 1, -1, 0, 7, 3);
function buildHunter(b, o) {
  const L = { x: 124, y: 40, r: 0, g1: 180, g2: 2600 };
  paintSky(b, o, 88, L, 1.0, 4.2, 5.6, 0.8);
  paintClouds(b, o, [[50, 20, 120, 10, 30, 7, 14], [170, 30, 70, 8, 16, 6, 11], [60, 60, 90, 5, 14, 4, 8]], L, 41, 2.2, 3.6, 10);
  const plain = genRidge([[0, 90], [60, 88], [120, 90], [198, 87]], 0.12, 13);
  fillBelow(b, o, plain, (x, y, d) => 2.4 + 1.6 * Math.exp(-((x - L.x) ** 2) / 1500) * Math.exp(-d / 6) - d * 0.03 + (d < 1 ? 1.4 : 0));
  PLAINF = plain;
}
function drawTree(b, o, x0, y0, stage, t) {
  const rng = mulberry32(7);
  const br = (x, y, a, len, dep) => {
    if (dep > stage + 1 || len < 1.2) return;
    const x1 = x + Math.cos(a) * len, y1 = y - Math.sin(a) * len;
    line(b, x, y, x1, y1, o + 0);
    if (dep <= 1 && len > 6) line(b, x + 1, y, x1 + 1, y1, o + 0);
    br(x1, y1, a + 0.45 + rng() * 0.2, len * 0.72, dep + 1);
    br(x1, y1, a - 0.4 - rng() * 0.2, len * 0.7, dep + 1);
  };
  br(x0, y0, Math.PI / 2 + Math.sin(t * 0.7) * 0.02, 5 + stage * 4, 0);
}
function drawHunter(b, o, t, st) {
  // the rift it steps through
  const flare = st.blink > 0 ? 1 + Math.sin((1 - st.blink / 1.2) * Math.PI) * 2 : 1;
  for (let y = 4; y < 88; y++) {
    const w = (1.2 + Math.sin(y * 0.35 + t * 3) * 0.5) * flare * (1 - Math.abs(y - 46) / 46);
    const cx = 124 + Math.sin(y * 0.18 + t) * 1.5;
    for (let x = Math.floor(cx - w - 1); x <= cx + w + 1; x++) put(b, x, y, o + (Math.abs(x - cx) <= w * 0.5 ? 13 : Math.abs(x - cx) <= w ? 12 : 9));
  }
  drawTree(b, o, 36, Math.round(PLAINF(36)), st.years, t);
  const fx = 113, fy = Math.round(PLAINF(124)) - HUNTER.h + 1;
  const vis = st.blink > 0 ? Math.abs(st.blink - 0.6) / 0.6 : 1;     // dissolves out and back
  const pose = st.pose;
  for (let j = 0; j < HUNTER.h; j++) for (let i = 0; i < HUNTER.w; i++) {
    const v = HUNTER.data[j * HUNTER.w + i];
    if (v === 255 || vis < BAYER[(((fy + j) & 3) << 2) | ((fx + i) & 3)]) continue;
    put(b, fx + i, fy + j, o + v);
  }
  if (vis > 0.3) {
    put(b, fx + 9, fy + 6, o + 12); put(b, fx + 12, fy + 6, o + 12);            // two pale points in the hood
    const hx = fx + (pose ? 19 : 2), hy = fy + (pose ? 12 : 16);
    const a = pose ? -2.2 : -0.6, len = 34;                                     // the death weapon
    const tx = hx + Math.cos(a) * len, ty = hy + Math.sin(a) * len;
    line(b, hx - Math.cos(a) * 6, hy - Math.sin(a) * 6, tx, ty, o + 1);
    for (let k = 0; k < 9; k++) { const u = k / 8; put(b, tx + Math.cos(a + 1.9) * k * 0.9, ty + Math.sin(a + 1.9) * k * 0.9 - u, o + (k < 7 ? 12 : 13)); }
  }
}

// ---------------------------------------------------------------- 6. Kolobok: the road at dusk
const TW = 64, TH = 32, COV = new Float32Array(TW * TH), NT = new Float32Array(TW * TH);
let covMax = 0, rollA = 0;
(function () { for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) NT[j * TW + i] = fbm(i * 0.18, j * 0.3, 77, 3); })();
const CROW_A = sprite(['.00...', '0000..', '.00000', '..0.0.'], { '0': 0 }), CROW_B = sprite(['......', '00....', '000000', '.0..0.'], { '0': 0 });
function buildLoaf(b, o) {
  const L = { x: 38, y: 50, r: 6, g1: 300, g2: 3000 };
  paintSky(b, o, 68, L, 1.5, 8.2, 3.8, 1.8);
  paintClouds(b, o, [[140, 14, 150, 7, 26, 6, 12], [40, 30, 60, 4, 10, 4, 7]], L, 51, 3.4, 2.8, 16);
  paintDisc(b, o, L, 11, 10);
  const far = genRidge([[0, 66], [60, 64], [110, 67], [160, 62], [198, 65]], 0.3, 14);
  fillBelow(b, o, far, (x, y, d) => 6.6 + 1.2 * Math.exp(-((x - L.x) ** 2) / 1800) - Math.min(d, 2) * 0.3);
  for (let y = 69; y < PH; y++) for (let x = 0; x < PW; x++) {
    const dy = y - 68;
    let f = 3.0 + 5.2 * Math.exp(-dy / 13) + 1.8 * Math.exp(-((x - L.x) ** 2) / 2400) * Math.exp(-dy / 14);
    const rc = 150 - dy * 1.35 + Math.sin(dy * 0.08) * 10, rw = 1 + dy * 0.28;                        // the road
    if (Math.abs(x - rc) < rw) f += 1.3 - (Math.abs(Math.abs(x - rc) - rw * 0.4) < 0.6 && dy > 20 ? 0.8 : 0);
    const tc = 100 + (x - 100) * 0, tr = Math.abs(y - (86 + (x - 118) * 0.08));                         // its track through the wheat
    if (x < 118 && tr < 3 + (118 - x) * 0.02) f -= 1.4; else if (x < 118 && tr < 4.2 + (118 - x) * 0.02) f += 1.0;
    b[y * PW + x] = o + r12(dith(f, x, y));
  }
}
function drawLoaf(b, o, t, st) {
  rollA += 0.012;
  if (st.flour > 0) {
    st.flour = 0;
    for (let k = 0; k < COV.length; k++) COV[k] = 1;
    covMax = 1;
  }
  const cx = 116, cy = 62, R = 30;
  if (covMax > 0.05) {
    for (let k = 0; k < COV.length; k++) COV[k] = Math.max(0, COV[k] - 0.0035);
    covMax = Math.max(0, covMax - 0.0035);
    // long shadow toward us, only where flour is
    for (let y = 92; y < PH; y++) for (let x = 0; x < PW; x++) {
      const u = (x - cx - (y - 92) * 0.35) / (R * (1 + (y - 92) * 0.02));
      if (Math.abs(u) < 0.9 && covMax > 0.45) { const i = y * PW + x, v = b[i] - o; b[i] = o + Math.max(0, v - 1); }
    }
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
      const nx = (x - cx) / R, ny = (cy - y) / R, q = nx * nx + ny * ny;
      if (q > 1) continue;
      const nz = Math.sqrt(1 - q);
      const lon = Math.atan2(nx, nz) + rollA, lat = Math.asin(ny);
      const u = ((((lon / 6.283) % 1) + 1) % 1) * TW, v = clamp((lat / Math.PI + 0.5) * TH, 0, TH - 1);
      const k = (v | 0) * TW + ((u | 0) % TW);
      const cov = COV[k] + (NT[k] - 0.5) * 0.9;
      if (cov < 0.42 || (cov < 0.54 && (cov - 0.42) / 0.12 < BAYER[((y & 3) << 2) | (x & 3)])) continue;
      let f = 0.75 + 1.35 * ny + (NT[k] - 0.5) * 0.8;
      const rim = Math.pow(1 - nz, 1.6);
      f += rim * (0.3 + 3.8 * Math.max(0, -nx * 0.8 + ny * 0.4));
      const idx = dith(f, x, y);
      put(b, x, y, idx >= 4 ? o + 11 : o + 12 + Math.max(0, idx));
    }
  }
  for (let k = 0; k < 4; k++) {                         // crows standing on nothing
    const s = ((t * 1.3 + k * 1.7) % 5) < 0.4 ? CROW_B : CROW_A;
    stamp(b, s, cx - 12 + k * 7, cy - R - 4 + (k === 1 || k === 2 ? -1 : 0), o, true);
  }
}

// ---------------------------------------------------------------- the roster
const STAT_NAMES = ['Attack', 'Defense', 'Damage', 'Health', 'Speed', 'Growth'];
const CREATURES = [
  { key: 'pebble', name: 'Pebble Folk', where: 'Tier 1  Still Water shore', avail: 42, stats: ['1', '4', '1\u20132', '3', '3', '+16 / week'],
    lore: 'Roll to travel. Blamed for the Loaf\u2019s tracks, so they learned two human words.', lines: ['not ours not ours not ours', 'not ours!'], build: buildPebble, draw: drawPebble, sound: 'pebbles' },
  { key: 'stone', name: 'Stone Elder', where: 'Tier 2  Field stones', avail: 5, stats: ['6', '16', '4\u20137', '60', '2', '+2 / week'],
    lore: 'Mills grain between two of its kind. Cut the only phrase it knows into its own face.', lines: ['NOT OURS.', 'SOFT ONE. NOT OURS.'], build: buildStone, draw: drawStone, sound: 'stone' },
  { key: 'knight', name: 'Verdant Knight', where: 'Tier 3  Castle of the Order', avail: 9, stats: ['11', '12', '6\u201310', '35', '6', '+3 / week'],
    lore: 'Escaped a death that cannot be escaped. The covenant keeps it waiting, one knight at a time.', lines: ['The covenant holds.', 'Not today.'], build: buildKnight, draw: drawKnight, sound: 'sword' },
  { key: 'fish', name: 'The Fish', where: 'Tier 4  Still Water', avail: 1, stats: ['0', '3', 'one wish', '8', '7', 'none'],
    lore: 'Grants wishes word for word. Then the sun goes red.', lines: ['One wish. Choose the words.', 'I grant it word for word.', 'When I ask for your last wish, cut the line.'], build: buildFish, draw: drawFish, sound: 'fish' },
  { key: 'hunter', name: 'The Covenant\u2019s Hunter', where: 'Tier 5  Between moments', avail: '?', stats: ['30', '25', 'one blow', '?', 'whenever', 'one per knight'],
    lore: 'One continuous fight on its side. Twenty years between blows on yours.', lines: ['Twenty years pass.', 'It lands the last blow. Nothing else may.'], build: buildHunter, draw: drawHunter, sound: 'blink' },
  { key: 'loaf', name: 'Kolobok', where: 'Tier 6  The roads', avail: '1?', stats: ['25', '40', '50\u201380', '1200', '11', '+1 size a sack'],
    lore: 'No one can take it. No one can see it. Flour shows it, and flour feeds it.', lines: ['\u201CI rolled from the bin and I rolled from the sill\u2026\u201D', '\u201CI rolled from your flour, and I\u2019m hungry still.\u201D'], build: buildLoaf, draw: drawLoaf, sound: 'burst' },
];

// ---------------------------------------------------------------- chrome: frames, plaques, stat tiles, icons
let IDX = null, CHROME = null, OUT32 = null;
const ICONS = [
  sprite(['9........9', '.9......9.', '..9....9..', '...9..9...', '....99....', '....99....', '...9..9...', '.8#....#8.', '8#......#8', '#........#'], { '9': 10, '8': 8, '#': 7 }),
  sprite(['.99999999.', '9888888889', '98bbbbbb89', '98bb99bb89', '98b9bb9b89', '98bb99bb89', '.98bbbb89.', '..98bb89..', '...9889...', '....99....'], { '9': 9, '8': 8, 'b': 5 }),
  sprite(['........9.', '.......9..', '....9.9...', '...9.9...9', '..9.9...9.', '.9.9...9..', '9.9...9...', '.9...9....', '....9.....', '...9......'], { '9': 10 }),
  sprite(['.99...99..', '9aa9.9aa9.', '9aaa9aaa9.', '9aaaaaaa9.', '.9aaaaa9..', '..9aaa9...', '...9a9....', '....9.....', '..........', '..........'], { '9': 8, 'a': 11 }),
  sprite(['..........', '......9...', '.......9..', '99999999.9', '.......9..', '......9...', '..........', '.8.8.8....', '..........', '..........'], { '9': 10, '8': 7 }),
  sprite(['....9.....', '...99.....', '..9a9..99.', '..9aa99a9.', '...9aaa9..', '....9a9...', '.....9....', '.....9....', '....999...', '...99999..'], { '9': 11, 'a': 5 }),
];
const LAY = {};
function genChrome() {
  CHROME = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {       // dark lacquer with a slow grain
    const g = fbm(x * 0.05, y * 0.012, 5, 3);
    CHROME[y * W + x] = 1 + (g > 0.56 ? 1 : 0) + (hash2(x, y, 3) > 0.985 ? 1 : 0);
  }
  const box = (x0, y0, x1, y1, fill) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const e = x === x0 || y === y0 ? 9 : x === x1 || y === y1 ? 6 : x === x0 + 1 || y === y0 + 1 ? 7 : x === x1 - 1 || y === y1 - 1 ? 7 : fill;
      if (fill === 255 && e === 255) continue;
      CHROME[y * W + x] = e;
    }
  };
  LAY.title = [6, 3, 209, 18]; box(...LAY.title, 0);
  box(PX0 - 3, PY0 - 3, PX0 + PW + 2, PY0 + PH + 2, 255);
  LAY.name = [6, 152, 209, 168]; box(...LAY.name, 0);
  LAY.prev = [8, 154, 22, 166]; LAY.next = [193, 154, 207, 166];
  for (const [x0, y0] of [[LAY.prev[0], LAY.prev[1]], [LAY.next[0], LAY.next[1]]]) box(x0, y0, x0 + 14, y0 + 12, 3);
  for (let k = 0; k < 4; k++) { const hh = k; for (let j = -hh; j <= hh; j++) { CHROME[(160 + j) * W + 13 + k] = 10; CHROME[(160 + j) * W + 202 - k] = 10; } }
  LAY.statY = 186;
  for (let r = 0; r < 6; r++) {
    const y = LAY.statY + r * 17;
    box(8, y, 22, y + 14, 3);
    const ic = ICONS[r];
    for (let j = 0; j < ic.h; j++) for (let i = 0; i < ic.w; i++) { const v = ic.data[j * ic.w + i]; if (v !== 255) CHROME[(y + 3 + j) * W + 11 + i] = v; }
    box(25, y, 209, y + 14, 0);
  }
  const loreTop = LAY.statY + 6 * 17 + 3;
  LAY.roster = H - 44;
  LAY.lore = [6, loreTop, 209, LAY.roster - 6]; box(...LAY.lore, 0);
  for (let k = 0; k < 6; k++) box(8 + k * 34, LAY.roster, 8 + k * 34 + 31, LAY.roster + 31, 0);
}
let THUMBS = null;
function genThumbs() {
  THUMBS = CREATURES.map(c => {
    const src = c.base, th = new Uint8Array(28 * 28);
    const cx = c.key === 'pebble' ? 104 : c.key === 'stone' ? 140 : c.key === 'knight' ? 104 : c.key === 'fish' ? 70 : c.key === 'hunter' ? 124 : 116;
    const cy = c.key === 'pebble' ? 96 : c.key === 'stone' ? 96 : c.key === 'knight' ? 84 : c.key === 'fish' ? 92 : c.key === 'hunter' ? 74 : 60;
    const b = new Uint8Array(src);
    c.draw(b, OFF[c.ramp || c.key], 3.0, { talk: 0, blink: 0, pose: 0, years: 1, flour: c.key === 'loaf' ? 1 : 0 });
    for (let j = 0; j < 28; j++) for (let i = 0; i < 28; i++) {
      const sx = clamp(cx - 28 + i * 2, 0, PW - 1), sy = clamp(cy - 28 + j * 2, 0, PH - 1);
      th[j * 28 + i] = b[sy * PW + sx];
    }
    return th;
  });
  covMax = 0; COV.fill(0);
}

// ---------------------------------------------------------------- state and frame
const G = { cur: 0, t: 0, dim: 0, fade: 0, next: -1, talk: 0, blink: 0, blinkT: 5, pose: 0, years: 0, flour: 0, flourT: 6, line: 0, cap: '', capT: 0 };
let PB = new Uint8Array(PW * PH);
function init() {
  for (const c of CREATURES) { c.base = new Uint8Array(PW * PH); c.build(c.base, OFF[c.key]); }
}
function setH(h) { H = h; IDX = new Uint8Array(W * H); genChrome(); genThumbs(); }
function select(i) { if (i === G.cur && G.next < 0) return; G.next = ((i % 6) + 6) % 6; G.fade = 0.0001; }
function act() {
  const c = CREATURES[G.cur];
  const L = c.lines[G.line++ % c.lines.length];
  G.talk = 1.6;
  if (c.key === 'hunter') { G.blink = 1.2; }
  if (c.key === 'loaf') { G.flour = 1; }
  UI.caption(L, c.key === 'stone' ? 'stone' : c.key === 'pebble' ? 'pebble' : c.key === 'loaf' ? 'song' : '');
  SFX.play(c.sound);
}
function update(dt) {
  G.t += dt;
  if (G.fade > 0) {                                      // dip to dark, swap, come back
    G.fade += dt;
    if (G.next >= 0 && G.fade > 0.16) { G.cur = G.next; G.next = -1; G.talk = 0; G.line = 0; UI.show(CREATURES[G.cur], G.cur); }
    G.dim = G.fade < 0.16 ? G.fade / 0.16 : Math.max(0, 1 - (G.fade - 0.16) / 0.2);
    if (G.fade > 0.36) { G.fade = 0; G.dim = 0; }
  }
  if (G.talk > 0) G.talk -= dt;
  const c = CREATURES[G.cur];
  if (c.key === 'hunter') {
    G.blinkT -= dt;
    if (G.blinkT <= 0 && G.blink <= 0) { G.blink = 1.2; G.blinkT = 7 + Math.random() * 3; }
    if (G.blink > 0) { const was = G.blink; G.blink -= dt; if (was > 0.6 && G.blink <= 0.6) { G.pose ^= 1; G.years = Math.min(3, G.years + 1); UI.caption('Twenty years pass.', ''); } if (G.blink < 0) G.blink = 0; }
  }
  if (c.key === 'loaf') { G.flourT -= dt; if (G.flourT <= 0) { G.flour = 1; G.flourT = 11; } }
}
function render(t) {
  buildPal(G.dim);
  IDX.set(CHROME);
  const c = CREATURES[G.cur], o = OFF[c.key];
  PB.set(c.base);
  c.draw(PB, o, t, { talk: G.talk, blink: G.blink, pose: G.pose, years: G.years, get flour() { return G.flour; }, set flour(v) { G.flour = v; } });
  for (let y = 0; y < PH; y++) IDX.set(PB.subarray(y * PW, y * PW + PW), (PY0 + y) * W + PX0);
  for (let k = 0; k < 6; k++) {
    const th = THUMBS[k], x0 = 10 + k * 34, y0 = LAY.roster + 2;
    for (let j = 0; j < 28; j++) IDX.set(th.subarray(j * 28, j * 28 + 28), (y0 + j) * W + x0);
    if (k === G.cur) for (let i = -2; i < 30; i++) { IDX[(y0 - 2) * W + x0 + i] = 11; IDX[(y0 + 29) * W + x0 + i] = 11; IDX[(y0 + i) * W + x0 - 2] = 11; IDX[(y0 + i) * W + x0 + 29] = 11; }
  }
  for (let i = 0, n = W * H; i < n; i++) OUT32[i] = PALCUR[IDX[i]];
}

// ---------------------------------------------------------------- sound
const SFX = {
  ctx: null, out: null, buf: null, muted: false,
  init() {
    if (this.ctx || !IS_BROWSER) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = new AC(); this.ctx = c;
      this.out = c.createGain(); this.out.gain.value = this.muted ? 0 : 0.6; this.out.connect(c.destination);
      const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.buf = b;
    } catch (e) { this.ctx = null; }
  },
  tone(f, dur, type, vol, f2, delay) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol, f, f2, q, delay) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0), s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.buf; fl.type = 'bandpass'; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.out); s.start(t); s.stop(t + dur + 0.05);
  },
  play(k) {
    if (!this.ctx) return;
    if (k === 'pebbles') for (let i = 0; i < 9; i++) this.tone(1900 + Math.random() * 900, 0.022, 'square', 0.03, null, i * 0.07);
    else if (k === 'stone') for (let i = 0; i < 2; i++) { this.noise(0.32, 0.3, 190, 150, 6, i * 0.4); this.tone(72, 0.3, 'sine', 0.14, 60, i * 0.4); }
    else if (k === 'sword') { this.tone(1320, 1.2, 'triangle', 0.05, 1300); this.tone(1980, 0.9, 'sine', 0.03, 1970); }
    else if (k === 'fish') { for (let i = 0; i < 5; i++) this.tone(140 + Math.random() * 60, 0.16, 'sine', 0.12, 90, i * 0.15); this.noise(0.4, 0.05, 700, 300, 2, 0.1); }
    else if (k === 'blink') { this.noise(0.7, 0.12, 3000, 200, 3); this.tone(55, 0.8, 'sawtooth', 0.04, 40); }
    else if (k === 'burst') { this.noise(0.9, 0.3, 1800, 160, 0.8); this.tone(85, 0.4, 'sine', 0.2, 42); }
    else this.tone(660, 0.05, 'square', 0.03);
  },
  click() { this.tone(520, 0.04, 'square', 0.025); },
};

// ---------------------------------------------------------------- DOM
let UI = null;
function stubUI() { const log = []; return { log, caption: (t, c) => log.push(['caption', t, c]), show: (c, i) => log.push(['show', c.name, i]) }; }
function makeUI() {
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  let capTimer = null;
  const stats = [...document.querySelectorAll('.stat')];
  const ui = {
    caption(t, cls) {
      const el = $('caption');
      el.textContent = t; el.className = 'shade on' + (cls ? ' ' + cls : '');
      clearTimeout(capTimer); capTimer = setTimeout(() => el.classList.remove('on'), 2600);
    },
    show(c, i) {
      $('name').textContent = c.name;
      $('where').textContent = c.where.replace('  ', ', ');
      $('avail').textContent = 'Available ' + c.avail;
      stats.forEach((el, k) => { el.querySelector('.v').textContent = c.stats[k]; });
      $('lore').textContent = c.lore;
      document.querySelectorAll('.thumb').forEach((el, k) => el.setAttribute('aria-pressed', k === i ? 'true' : 'false'));
      $('portrait').setAttribute('aria-label', c.name + '. Tap to make it act.');
    },
    layout(sc) {
      const at = (el, x, y, w, h) => { el.style.left = x * sc + 'px'; el.style.top = y * sc + 'px'; if (w) el.style.width = w * sc + 'px'; if (h) el.style.height = h * sc + 'px'; };
      document.documentElement.style.setProperty('--px', sc + 'px');
      at($('title'), 6, 3, 204, 16);
      at($('portrait'), PX0, PY0, PW, PH);
      at($('caption'), PX0 + 6, PY0 + 4, PW - 12);
      at($('name'), 24, 152, 168, 17);
      at($('prev'), 8, 154, 15, 13); at($('next'), 193, 154, 15, 13);
      at($('where'), 8, 171, 120, 12); at($('avail'), 110, 171, 98, 12);
      stats.forEach((el, k) => at(el, 27, LAY.statY + k * 17, 180, 15));
      at($('lore'), 10, LAY.lore[1] + 2, 196, LAY.lore[3] - LAY.lore[1] - 3);
      document.querySelectorAll('.thumb').forEach((el, k) => at(el, 8 + k * 34, LAY.roster, 32, 32));
    },
  };
  $('prev').addEventListener('click', e => { e.stopPropagation(); SFX.init(); SFX.click(); select(G.cur - 1); });
  $('next').addEventListener('click', e => { e.stopPropagation(); SFX.init(); SFX.click(); select(G.cur + 1); });
  document.querySelectorAll('.thumb').forEach((el, k) => el.addEventListener('click', e => { e.stopPropagation(); SFX.init(); SFX.click(); select(k); }));
  $('portrait').addEventListener('click', () => { SFX.init(); if (SFX.ctx && SFX.ctx.state !== 'running') SFX.ctx.resume(); act(); });
  let sx = null;
  stage.addEventListener('pointerdown', e => { sx = e.clientX; });
  stage.addEventListener('pointerup', e => { if (sx === null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 40) select(G.cur + (d < 0 ? 1 : -1)); });
  window.addEventListener('keydown', e => {
    if (e.code === 'ArrowRight') { select(G.cur + 1); e.preventDefault(); }
    else if (e.code === 'ArrowLeft') { select(G.cur - 1); e.preventDefault(); }
    else if ((e.code === 'Space' || e.code === 'Enter') && (!document.activeElement || document.activeElement.tagName !== 'BUTTON')) { SFX.init(); act(); e.preventDefault(); }
  });
  $('mute').addEventListener('click', e => { e.stopPropagation(); SFX.init(); SFX.muted = !SFX.muted; if (SFX.ctx) SFX.out.gain.value = SFX.muted ? 0 : 0.6; $('mute').textContent = SFX.muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', SFX.muted ? 'true' : 'false'); });
  return ui;
}
function boot() {
  UI = makeUI();
  init();
  const canvas = document.getElementById('c'), ctx = canvas.getContext('2d', { alpha: false });
  const stage = document.getElementById('stage'), wrap = document.getElementById('wrap');
  let IMG = null;
  function resize() {
    const aw = Math.max(1, wrap.clientWidth), ah = Math.max(1, wrap.clientHeight);
    const nh = clamp(Math.round((W * ah) / aw), H_MIN, H_MAX);
    if (nh !== H || !IMG) { setH(nh); canvas.width = W; canvas.height = H; IMG = ctx.createImageData(W, H); OUT32 = new Uint32Array(IMG.data.buffer); }
    const sc = Math.min(aw / W, ah / H), sw = Math.floor(W * sc), sh = Math.floor(H * sc);
    stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
    UI.layout(sw / W);
  }
  window.addEventListener('resize', resize);
  resize();
  UI.show(CREATURES[0], 0);
  let last = 0;
  function frame(ts) {
    const now = ts / 1000; let dt = last ? now - last : 1 / 60; last = now; dt = clamp(dt, 0, 0.1);
    update(dt); render(G.t); ctx.putImageData(IMG, 0, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
if (IS_BROWSER) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); }
else if (typeof module !== 'undefined') {
  UI = stubUI();
  module.exports = { init, setH, update, render, select, act, G, CREATURES, W, get H() { return H; }, setOut(b) { OUT32 = b; }, get UI() { return UI; } };
}
})();
