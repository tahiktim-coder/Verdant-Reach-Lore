/* Kolobok: a tale from the Verdant Reach.
   Built on the Still Water engine rules: one hue-shifting ramp, clean bands with ordered dither only
   at band edges, the light source in frame, hand-drawn silhouettes for anything that has to read as a thing. */
(function () {
'use strict';
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

// ---------------------------------------------------------------- constants
const W = 216, HY = 170, H_MIN = 384, H_MAX = 470;
let H = H_MIN;
const CX = 108, FOC = 180, CAMH = 24;             // we stand on a hill, 24 m above the valley floor
const SUNX = 62, SUNY = 146, SUNR = 7;
const SUNDIR = (() => {
  const x = (SUNX + 0.5 - CX) / FOC, y = (HY - SUNY - 0.5) / FOC, l = Math.hypot(x, y, 1);
  return [x / l, y / l, 1 / l];
})();
const FLOUR_MAX = 9;
const R0 = 15;                                     // the loaf's radius in metres, before anyone feeds it
const POLE = { x: 13, z: 92, h: 4.6, intact: true };
const XG0 = -210, ZG0 = 30, CELL = 1.5, NXG = 280, NZG = 394;   // track and dust grid over the valley
const TW = 128, TH = 64;                           // flour texture wrapped on the loaf

// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function hash3(x, y, z, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683) ^ Math.imul((s | 0) + 1, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function vnoise3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const a = lerp(hash3(xi, yi, zi, s), hash3(xi + 1, yi, zi, s), u);
  const b = lerp(hash3(xi, yi + 1, zi, s), hash3(xi + 1, yi + 1, zi, s), u);
  const c = lerp(hash3(xi, yi, zi + 1, s), hash3(xi + 1, yi, zi + 1, s), u);
  const d = lerp(hash3(xi, yi + 1, zi + 1, s), hash3(xi + 1, yi + 1, zi + 1, s), u);
  return lerp(lerp(a, b, v), lerp(c, d, v), w);
}
function fbm(x, y, s, oct) {
  let f = 0, amp = 0.5, tot = 0;
  for (let i = 0; i < oct; i++) { f += amp * vnoise(x, y, s + i * 131); tot += amp; x *= 2.02; y *= 2.02; amp *= 0.5; }
  return f / tot;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
// continuous ramp value -> integer index: clean bands, ordered dither only across the band edges
function dith(f, x, y) {
  const fl = Math.floor(f);
  let fr = f - fl;
  fr = fr < 0.28 ? 0 : fr > 0.72 ? 1 : (fr - 0.28) / 0.44;
  return fl + (fr > BAYER[((y & 3) << 2) | (x & 3)] ? 1 : 0);
}
const ci = v => (v < 0 ? 0 : v > 11 ? 11 : v);

// ---------------------------------------------------------------- palette
const hexc = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
// one dusk ramp: indigo shadow > plum > rose > rust > gold > cream
const RAMP = ['#0f0a1c', '#1b1230', '#2a1943', '#3d2150', '#552a5a', '#70345e', '#8f425e', '#ad5558', '#c96e4f', '#df8f4b', '#efb85a', '#fbe29a'].map(hexc);
// accents 12-15: flour, lilac shade to powder white. 16: the mint of stone-folk eyes
const ACC = ['#6f6384', '#9a8fae', '#c9c0d2', '#f1ebea', '#bff0cf'].map(hexc);
const PAL = new Uint32Array(17), PALRGB = new Float32Array(17 * 3);
function setPal(i, c, k) {
  const r = clamp((c[0] * k) | 0, 0, 255), g = clamp((c[1] * k) | 0, 0, 255), b = clamp((c[2] * k) | 0, 0, 255);
  PAL[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  PALRGB[i * 3] = r; PALRGB[i * 3 + 1] = g; PALRGB[i * 3 + 2] = b;
}
function buildPalette(dim) {
  const k = 1 - clamp(dim, 0, 1) * 0.6;
  for (let i = 0; i < 12; i++) setPal(i, RAMP[i], k);
  for (let j = 0; j < ACC.length; j++) setPal(12 + j, ACC[j], k);
}
const FR = [12, 13, 14, 15, 11];                   // flour ramp: lilac shade > powder white > sunlit cream
function fr(v, x, y) { const k = dith(v, x, y); return FR[k < 0 ? 0 : k > 4 ? 4 : k]; }

// ---------------------------------------------------------------- sprites (hand-drawn)
const CH = { '.': 255, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, a: 10, b: 11, L: 12, M: 13, P: 14, F: 15, e: 16 };
function sprite(rows) {
  const h = rows.length, w = rows[0].length;
  const data = new Uint8Array(w * h).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = CH[rows[y][x]];
    data[y * w + x] = v === undefined ? 255 : v;
  }
  return { w, h, data };
}
function mirror(s) {
  const d = new Uint8Array(s.w * s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) d[y * s.w + x] = s.data[y * s.w + s.w - 1 - x];
  return { w: s.w, h: s.h, data: d };
}
const MILL = sprite([
  '...3...',
  '..333..',
  '.33333.',
  '..333..',
  '..333..',
  '.43333.',
  '.43333.',
  '.43333.',
  '4333333',
  '4333333',
  '4333333',
  '4333333',
]);
// crows face left; they walk against the roll to stay on top
const CROW_A = sprite(['.00...', '0000..', '.00000', '..0.0.']);
const CROW_B = sprite(['......', '00....', '000000', '.0..0.']);
const CROW_S = sprite(['.0..', '0000', '.0.0']);
const CROW_T = sprite(['00.', '.00']);
const CROW_AR = mirror(CROW_A), CROW_BR = mirror(CROW_B), CROW_SR = mirror(CROW_S), CROW_TR = mirror(CROW_T);
const CROW_F = [sprite(['0...0', '.0.0.', '..0..']), sprite(['.....', '00.00', '..0..'])];
const SACK_B = [sprite([
  '..LM...',
  '.MPPM..',
  'MPPFPM.',
  'MPFFPPM',
  'MPPFPPM',
  '.MPPPM.',
  '..MMM..',
]), sprite([
  '...ML..',
  '..MPPM.',
  '.MPFPPM',
  'MPPFFPM',
  'MPPFPPM',
  '.MPPPM.',
  '..MMM..',
])];
const SACK_N = sprite(['.M.', 'PPP', 'PFP', 'MPM']);
const SACK_S = sprite(['PF', 'MP']);
// the flour bell: a sack hung over the road on a pole
const POLE_A = sprite([
  '1111111',
  '.2....1',
  '.2....1',
  'PPF...1',
  'PFP...1',
  'MPP...1',
  '.M....1',
  '......1',
  '......1',
  '......1',
]);
const POLE_B = sprite([
  '.......',
  '.......',
  '.......',
  '.......',
  '.......',
  '.......',
  '......1',
  '......1',
  '..1...1',
  '1111111',
]);
const FONT = {
  N: ['1..1', '11.1', '1.11', '1..1', '1..1'],
  O: ['.11.', '1..1', '1..1', '1..1', '.11.'],
  T: ['111', '.1.', '.1.', '.1.', '.1.'],
  U: ['1..1', '1..1', '1..1', '1..1', '.11.'],
  R: ['111.', '1..1', '111.', '1.1.', '1..1'],
  S: ['.111', '1...', '.11.', '...1', '111.'],
};
let STONE = null;
let STONEX = 12, STONEY = 0;
// a stone elder: a leaning standing stone with a face, and the only human words it knows cut into it
function genStone() {
  const w = 31, h = 47;
  const poly = [[11, 0], [16, 0], [20, 2], [23, 6], [25, 12], [26, 19], [27, 27], [28, 35], [29, 42], [30, 47], [0, 47], [1, 40], [2, 32], [3, 24], [4, 16], [6, 8], [8, 3]];
  const inside = (px, py) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = inside(x + 0.5, y + 0.5) ? 1 : 0;
  const In = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  const data = new Uint8Array(w * h).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!In(x, y)) continue;
    let v = 1;
    const n = fbm(x * 0.22, y * 0.18, 31, 3);
    if (n > 0.64) v = 2; else if (n < 0.32) v = 0;
    if (!In(x + 1, y) || !In(x, y - 1) || !In(x + 1, y - 1)) v = y < 5 || !In(x + 1, y) ? 7 : 6;   // sun rim, upper right
    else if (!In(x + 2, y) || !In(x, y - 2)) v = 3;
    if (!In(x - 1, y)) v = 0;
    data[y * w + x] = v;
  }
  const eye = (ex, ey) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) data[(ey + dy) * w + ex + dx] = 0; };
  eye(9, 9); eye(17, 9);
  const carve = (txt, x0, y0) => {
    let cx = x0;
    for (const ch of txt) {
      const g = FONT[ch];
      for (let r = 0; r < 5; r++) for (let c = 0; c < g[r].length; c++) if (g[r][c] === '1' && In(cx + c, y0 + r)) data[(y0 + r) * w + cx + c] = 5;
      cx += g[0].length + 1;
    }
  };
  carve('NOT', 9, 16);
  carve('OURS', 6, 23);
  return { w, h, data, eyes: [[11, 9], [19, 9]] };
}
function genPebble(w, h) {
  const data = new Uint8Array(w * h).fill(255);
  const cx = (w - 1) / 2, cy = (h - 1) / 2 + 0.15;
  const In = (x, y) => x >= 0 && y >= 0 && x < w && y < h && ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1.02;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!In(x, y)) continue;
    let v = 1;
    if (!In(x, y - 1) || !In(x + 1, y - 1)) v = 6;
    else if (!In(x - 1, y)) v = 0;
    data[y * w + x] = v;
  }
  const ey = Math.max(1, Math.floor(h * 0.38));
  const e1 = Math.floor(cx) - 1, e2 = Math.ceil(cx) + (w % 2 ? 1 : 0);
  return { w, h, data, eyes: [[e1, ey], [Math.min(w - 1, e2), ey]] };
}

// ---------------------------------------------------------------- sky
const SKY = new Uint8Array(W * HY);
const HILL = new Uint8Array(W * HY).fill(255);
const CLOUD = new Uint8Array(W * HY).fill(255);
const NEAR_TOP = new Float32Array(W).fill(HY);
const MILL_X = 157;
let MILL_Y = 0;
let HUBX = 0, HUBY = 0;
function skyValue(x, y) {
  const ty = y / HY;
  const base = 1.5 + 6.7 * Math.pow(ty, 1.7);
  const dx = x - SUNX, dy = y - SUNY, d2 = dx * dx + dy * dy;
  const g = 2.2 * Math.exp(-d2 / 380) + 1.5 * Math.exp(-d2 / 3200);
  const dyh = HY - y;
  const hb = 1.6 * Math.exp(-(dyh * dyh) / 300) * (0.35 + 0.65 * Math.exp(-(dx * dx) / 9000));
  return base + g + hb;
}
function genClouds() {
  const rng = mulberry32(2024);
  const clusters = [ // cx, cy, width, height, puffs, rmin, rmax
    [150, 40, 150, 8, 30, 6, 13],
    [26, 66, 76, 7, 16, 5, 10],
    [172, 94, 88, 6, 18, 5, 9],
    [114, 121, 54, 4, 10, 4, 7],
  ];
  const puffs = [];
  for (const [cx, cy, cw, chh, n, r0, r1] of clusters) {
    for (let k = 0; k < n; k++) {
      const u = rng() * 2 - 1, v = rng() * 2 - 1;
      const r = lerp(r0, r1, rng()) * (1 - 0.35 * Math.abs(u));
      puffs.push({ qx: cx + u * cw * 0.5, qy: cy + v * chh * 0.5 - r * 0.15, qr: r, qb: cy + chh * 0.5 });
    }
  }
  const dens = new Float32Array(W * HY);
  for (let y = 0; y < HY; y++) for (let x = 0; x < W; x++) {
    let d = 0;
    for (let k = 0; k < puffs.length; k++) {
      const p = puffs[k];
      const dx = x - p.qx, dy = (y - p.qy) * 2.1;
      const q = (dx * dx + dy * dy) / (p.qr * p.qr);
      if (q < 1) { let kk = 1 - q; kk *= kk; if (y > p.qb) kk *= Math.exp(-(y - p.qb) / 1.5); d += kk; }
    }
    if (d > 0.02) d += (fbm(x * 0.06, y * 0.18, 11, 3) - 0.5) * 0.34 + (fbm(x * 0.2, y * 0.45, 23, 2) - 0.5) * 0.12;
    const sd = Math.hypot(x - SUNX, y - SUNY);
    d *= clamp((sd - 20) / 12, 0, 1);               // keep the sun clear
    dens[y * W + x] = d;
  }
  const T = 0.3;
  const S = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || x >= W || y < 0 || y >= HY ? 0 : dens[y * W + x]; };
  for (let y = 0; y < HY; y++) for (let x = 0; x < W; x++) {
    const d = dens[y * W + x];
    if (d <= T) continue;
    let lx = SUNX - x, ly = SUNY - y;
    const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
    const shade = d - S(x + lx * 3, y + ly * 3);
    let f = 3.4 + 3.2 * Math.exp(-(ll * ll) / 4500) + 1.6 * (y / HY);
    if (shade > 0.03) f += 1.1 + clamp(shade * 5, 0, 1.6);
    else if (shade < -0.05) f -= 0.5;
    if (S(x, y + 2) <= T) f = Math.max(f + 1.0, 6.8 + 3.0 * Math.exp(-(ll * ll) / 6000));   // sunlit undersides
    if (S(x, y - 1) <= T) f -= 0.7;
    if (d - T < 0.05) f -= 0.4;
    f += (vnoise(x * 0.4, y * 0.4, 77) - 0.5) * 0.4;
    CLOUD[y * W + x] = ci(dith(f, x, y));
  }
}
function genRidge(pts, rough, seed) {
  const rng = mulberry32(seed);
  const x0 = pts[0][0], x1 = pts[pts.length - 1][0];
  const ys = new Float32Array(x1 - x0 + 1);
  function sub(a, l, r) {
    if (r - l < 2) return;
    const m = (l + r) >> 1;
    a[m] = lerp(a[l], a[r], (m - l) / (r - l)) + (rng() - 0.5) * (r - l) * rough;
    sub(a, l, m); sub(a, m, r);
  }
  for (let k = 0; k < pts.length - 1; k++) {
    const ax = pts[k][0], ay = pts[k][1], bx = pts[k + 1][0], by = pts[k + 1][1];
    const n = bx - ax;
    if (n <= 0) continue;
    const seg = new Float32Array(n + 1);
    seg[0] = ay; seg[n] = by;
    sub(seg, 0, n);
    for (let i = 0; i <= n; i++) ys[ax - x0 + i] = seg[i];
  }
  return { x0, ys };
}
function genHills() {
  const far = genRidge([[-2, HY - 3], [26, HY - 5], [52, HY - 3], [80, HY - 5], [104, HY - 4], [128, HY - 7], [150, HY - 9], [176, HY - 8], [198, HY - 11], [218, HY - 9]], 0.3, 3);
  for (let i = 0; i < far.ys.length; i++) {
    const x = far.x0 + i;
    if (x < 0 || x >= W) continue;
    const top = Math.max(0, Math.ceil(far.ys[i]));
    for (let y = top; y < HY; y++) {
      let f = skyValue(x, y) - 1.7 - 0.25 * (y - top);   // hazy: just darker than the sky behind it
      if (y === top) f += 0.6;
      HILL[y * W + x] = ci(dith(f, x, y));
    }
  }
  const near = genRidge([[106, HY], [122, HY - 3], [138, HY - 8], [150, HY - 12], [162, HY - 13], [178, HY - 11], [196, HY - 7], [218, HY - 5]], 0.22, 4);
  for (let i = 0; i < near.ys.length; i++) {
    const x = near.x0 + i;
    if (x < 0 || x >= W) continue;
    const top = Math.max(0, Math.ceil(near.ys[i]));
    NEAR_TOP[x] = top;
    const i0 = Math.max(0, i - 2), i1 = Math.min(near.ys.length - 1, i + 2);
    const slope = (near.ys[i1] - near.ys[i0]) / Math.max(1, i1 - i0);
    for (let y = top; y < HY; y++) {
      let f = 4.9 + (fbm(x * 0.2, y * 0.3, 9, 2) - 0.5) * 0.6 - 0.12 * (y - top);
      if (y - top < 1 && slope < 0.1) f += 1.6;           // rim on the slope that faces the sun
      HILL[y * W + x] = ci(dith(f, x, y));
    }
  }
}
function genSky() {
  genClouds();
  genHills();
  MILL_Y = Math.round(NEAR_TOP[MILL_X + 3]) - MILL.h + 2;
  for (let j = 0; j < MILL.h; j++) for (let i = 0; i < MILL.w; i++) {
    const v = MILL.data[j * MILL.w + i];
    if (v !== 255) HILL[(MILL_Y + j) * W + MILL_X + i] = v;
  }
  HUBX = MILL_X + 3; HUBY = MILL_Y + 2;
  const sr2 = (SUNR + 0.4) * (SUNR + 0.4), sr1 = (SUNR - 1) * (SUNR - 1);
  for (let y = 0; y < HY; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (HILL[i] !== 255) { SKY[i] = HILL[i]; continue; }
    if (CLOUD[i] !== 255) { SKY[i] = CLOUD[i]; continue; }
    const dx = x - SUNX, dy = y - SUNY, d2 = dx * dx + dy * dy;
    if (d2 <= sr2) { SKY[i] = d2 > sr1 ? 10 : 11; continue; }
    SKY[i] = ci(dith(skyValue(x, y), x, y));
  }
}

// ---------------------------------------------------------------- paths: the road, and the loaf's round
function crom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function buildPath(pts, closed, per) {
  const n = pts.length, out = [];
  const segs = closed ? n : n - 1;
  for (let s = 0; s < segs; s++) {
    const p0 = pts[closed ? (s - 1 + n) % n : Math.max(0, s - 1)], p1 = pts[s], p2 = pts[(s + 1) % n];
    const p3 = pts[closed ? (s + 2) % n : Math.min(n - 1, s + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      out.push([crom(p0[0], p1[0], p2[0], p3[0], t), crom(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  out.push(closed ? out[0].slice() : pts[n - 1].slice());
  const L = [0];
  for (let i = 1; i < out.length; i++) L.push(L[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, L, total: L[L.length - 1], closed };
}
function pathAt(P, s) {
  if (P.closed) { s %= P.total; if (s < 0) s += P.total; } else s = clamp(s, 0, P.total);
  let lo = 0, hi = P.L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.L[m] <= s) lo = m; else hi = m; }
  const a = P.pts[lo], b = P.pts[hi], seg = P.L[hi] - P.L[lo] || 1e-6;
  const u = clamp((s - P.L[lo]) / seg, 0, 1);
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), (b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
}
function nearestS(P, x, z) {
  let best = 1e9, bs = 0;
  for (let i = 0; i < P.pts.length; i++) {
    const d = Math.hypot(P.pts[i][0] - x, P.pts[i][1] - z);
    if (d < best) { best = d; bs = P.L[i]; }
  }
  return bs;
}
const ROAD_PTS = [[504, 2160], [-72, 270], [28.8, 123.4], [-6.6, 66.5], [3.1, 33.2], [2.3, 18.8], [2, 4]];
const LOOP_PTS = [[-70, 230], [-38, 150], [14, 92], [40, 104], [62, 170], [36, 270], [-24, 320], [-86, 290]];
let ROAD = null, LOOP = null, S_POLE = 0;
function roadAtZ(z) {
  const P = ROAD.pts;
  if (z >= P[0][1]) return [P[0][0], 1];
  let lo = 0, hi = P.length - 1;
  if (z <= P[hi][1]) return [P[hi][0], 1];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][1] >= z) lo = m; else hi = m; }
  const a = P[lo], b = P[hi];
  const u = (a[1] - z) / (a[1] - b[1] || 1e-6);
  const slope = (b[0] - a[0]) / (b[1] - a[1] || 1e-6);
  return [lerp(a[0], b[0], u), 1 / Math.sqrt(1 + slope * slope)];
}

// ---------------------------------------------------------------- buffers
let IDX = null, ZB = null, OUT32 = null;
function alloc() {
  IDX = new Uint8Array(W * H);
  ZB = new Float32Array(W * H);
}
const TRAIL = new Float32Array(NXG * NZG), TCA = new Float32Array(NXG * NZG), TSA = new Float32Array(NXG * NZG), DUST = new Float32Array(NXG * NZG);
// sine table: the ground pass calls it for every pixel
const SINN = 1024, SINT = new Float32Array(SINN);
for (let i = 0; i < SINN; i++) SINT[i] = Math.sin((i / SINN) * Math.PI * 2);
const fsin = a => SINT[((a * (SINN / (Math.PI * 2))) | 0) & (SINN - 1)];
// numbers that change every frame live in a typed array, so no object shape ever changes under the renderer
const FX = new Float64Array(3);   // [0] dust on the ground, [1] most flour on the loaf, [2] decay clock

// ---------------------------------------------------------------- the valley floor (static per screen height)
let GX, GZ, GB, GT, GPH, GN2, GC, GFX, GFZ, GNEAR;
function isLake(x, y) {
  const r = y - HY;
  const x0 = 16 + 5 * vnoise(r * 0.9, 1, 61) - r * 2, x1 = 100 + 6 * vnoise(r * 0.9, 2, 62) + r * 3;
  return x >= x0 && x <= x1;
}
function genGround() {
  const n = W * (H - HY);
  GX = new Float32Array(n); GZ = new Float32Array(n); GB = new Float32Array(n); GT = new Uint8Array(n);
  GPH = new Float32Array(n); GN2 = new Float32Array(n); GC = new Int32Array(n); GFX = new Float32Array(n); GFZ = new Float32Array(n);
  GNEAR = new Float32Array(n);
  for (let y = HY; y < H; y++) {
    const dy = y + 0.5 - HY, z = (FOC * CAMH) / dy;
    const rd = roadAtZ(z);
    for (let x = 0; x < W; x++) {
      const k = (y - HY) * W + x;
      const X = ((x + 0.5 - CX) * z) / FOC;
      GX[k] = X; GZ[k] = z;
      let v = 3.0 + 5.2 * Math.exp(-dy / 24);
      v += 2.2 * Math.exp(-((x - SUNX) * (x - SUNX)) / 3200) * Math.exp(-dy / 26);   // wheat backlit toward the sun
      const near = clamp((400 - z) / 320, 0, 1);
      const pu = X * 0.94 + z * 0.34 + 17, pid = Math.floor(pu / 34), pf = pu / 34 - pid;   // field strips
      v += (hash2(pid, 7, 3) - 0.5) * 0.9 * (0.35 + 0.65 * near);
      if ((pf < 0.028 || pf > 0.972) && z < 420) v -= 0.6 * near;
      const tex = clamp((85 - z) / 55, 0, 1);
      if (tex > 0) v += (vnoise(X * 1.7, z * 0.3, 41) - 0.5) * 1.2 * tex;
      let ty = 1;
      const ld = Math.abs(X - rd[0]) * rd[1];
      if (ld < 3.2 && z < 1400) {
        ty = 2; v += 1.35;
        if (Math.abs(ld - 1.3) < 0.32 && z < 170) v -= 0.8;   // cart ruts
        if (ld > 2.75) v -= 0.4;
      }
      if (y < HY + 4 && isLake(x, y)) ty = 3;
      GB[k] = v; GT[k] = ty;
      GPH[k] = X * 0.055 + z * 0.075 + vnoise(X * 0.012, z * 0.012, 19) * 3.4 + 1000;
      GN2[k] = vnoise(X * 0.9, z * 0.9, 57);
      GNEAR[k] = clamp((260 - z) / 180, 0, 1);
      const gx = (X - XG0) / CELL - 0.5, gz = (z - ZG0) / CELL - 0.5;
      const ix = Math.floor(gx), iz = Math.floor(gz);
      if (ix >= 0 && ix < NXG - 1 && iz >= 0 && iz < NZG - 1) { GC[k] = iz * NXG + ix; GFX[k] = gx - ix; GFZ[k] = gz - iz; } else GC[k] = -1;
    }
  }
}

// ---------------------------------------------------------------- the hilltop we stand on
let FG = null, EDGE = null, FG_Y0 = 0;
const PEBS = [];
function genForeground() {
  FG = new Uint8Array(W * H).fill(255);
  EDGE = new Float32Array(W);
  let minE = H;
  for (let x = 0; x < W; x++) {
    EDGE[x] = H - 33 - 15 * smooth(150, 10, x) + 2.0 * Math.sin(x * 0.075 + 1) + (fbm(x * 0.09, 3.3, 88, 2) - 0.5) * 5;
    minE = Math.min(minE, EDGE[x]);
  }
  for (let x = 0; x < W; x++) {
    const top = Math.ceil(EDGE[x]);
    for (let y = Math.max(0, top); y < H; y++) {
      const d = y - top;
      FG[y * W + x] = d === 0 ? 4 : d === 1 ? 2 : d < 5 && hash2(x, y, 5) > 0.7 ? 1 : 0;
    }
  }
  const rng = mulberry32(77);
  for (let k = 0; k < 170; k++) {
    const x0 = Math.floor(rng() * W);
    const hgt = Math.round(3 + rng() * (5 + 8 * smooth(170, 0, x0)));
    const lean = (rng() - 0.5) * 0.8;
    const top = Math.ceil(EDGE[x0]);
    for (let j = 1; j <= hgt; j++) {
      const x = Math.round(x0 + (lean * j * j) / hgt), y = top - j;
      if (x < 0 || x >= W || y < 0) continue;
      FG[y * W + x] = j === hgt ? (rng() < 0.5 ? 7 : 6) : j >= hgt - 1 ? 3 : 1;   // tips catch the low sun
    }
  }
  STONEX = 12;
  STONEY = Math.round(EDGE[27]) - STONE.h + 6;
  PEBS.length = 0;
  const pdefs = [[46, 7, 5, 0.1], [55, 5, 4, 0.47], [62, 6, 4, 0.73], [70, 4, 3, 0.29]];
  for (const [px, pw, ph, phase] of pdefs) {
    const s = genPebble(pw, ph);
    PEBS.push({ spr: s, pbx: px, pby: Math.round(EDGE[px + (pw >> 1)]) - ph + 2, phase });
  }
  FG_Y0 = Math.max(0, Math.floor(minE) - 16);
}

// ---------------------------------------------------------------- flour on the loaf: a texture in the loaf's own frame
const COV = new Float32Array(TW * TH), NTEX = new Float32Array(TW * TH);
const TBX = new Float32Array(TW * TH), TBY = new Float32Array(TW * TH), TBZ = new Float32Array(TW * TH);
function genTex() {
  for (let j = 0; j < TH; j++) {
    const lat = ((j + 0.5) / TH) * Math.PI - Math.PI / 2;
    for (let i = 0; i < TW; i++) {
      const lon = ((i + 0.5) / TW) * Math.PI * 2 - Math.PI;
      const k = j * TW + i;
      const bx = Math.cos(lat) * Math.cos(lon), by = Math.sin(lat), bz = Math.cos(lat) * Math.sin(lon);
      TBX[k] = bx; TBY[k] = by; TBZ[k] = bz;
      NTEX[k] = 0.6 * vnoise3(bx * 2.2 + 5, by * 2.2 + 5, bz * 2.2 + 5, 3) + 0.4 * vnoise3(bx * 5.5 + 9, by * 5.5 + 9, bz * 5.5 + 9, 4);
    }
  }
}
// three baker's slashes across the loaf's top: flour sinks into them, and they show it turning
const SCORE = (() => {
  const c = [0.3, 0.9, 0.3], cl = Math.hypot(c[0], c[1], c[2]);
  const C = c.map(v => v / cl);
  let n = [C[1], -C[0], 0];
  const nl = Math.hypot(n[0], n[1], n[2]);
  n = n.map(v => v / nl);
  return { c: C, n, cap: 0.78, offs: [-0.2, 0, 0.2], w: 0.03 };
})();
// pebble folk it rolled over, still stuck in the crust
const LUMPS = [];
function genLumps() {
  const rng = mulberry32(404);
  LUMPS.length = 0;
  for (let k = 0; k < 7; k++) {
    const u = rng() * 2 - 1, a = rng() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const ang = 0.06 + rng() * 0.025;
    LUMPS.push([s * Math.cos(a), u, s * Math.sin(a), Math.cos(ang), Math.cos(ang * 0.4), rng()]);
  }
}
