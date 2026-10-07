/* World map of the Verdant Reach, candidate B: TILTED RELIEF ATLAS (polish round 2).
   An oblique PARALLEL projection of the world data: screen x = (u - U0) * SX, screen y = YM + yv(v) - height * E.
   yv is linear except for a gentle lens that gives the cold northern strip extra rows (the tilt hid it behind the ranges).
   Every screen column is marched from the south (near) to the north (far) with a y-buffer, so nearer ground
   overlaps farther ground and mountains stand up as shaded forms with crests and cast shadows.
   ONE ramp (indigo > blue > teal > sage > gold > cream) carries sky, sea, land, rock and the light; five accents
   (ice in shade, ice, wheat gold, lamp, ember). The low sun sits just above the horizon of the Unknown Sea, over the
   mountain path. Portrait 320 x 568; the sky is a thin band and the land takes the height (polish 2). Pattern: pixel-scenes skill. Static layers are baked once (setH); per frame
   only small motion: drifting clouds, sea shimmer, glints, windows, embers, mill sails, eyes, wind in the wheat. */
(function () {
'use strict';
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
const WORLD = IS_BROWSER ? window.WORLD : require('../../src/world.js');
const ART = IS_BROWSER ? window.MAP_SPRITES : require('./sprites.js');
const TXT = IS_BROWSER ? window.MAP_FONT : require('./font.js');
const LAB = IS_BROWSER ? window.MAP_LABELS : require('./labels.js');

const W = 320;
let H = 568;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s, oct) { let f = 0, amp = 0.5, tot = 0; for (let i = 0; i < oct; i++) { f += amp * vnoise(x, y, s + i * 131); tot += amp; x *= 2.02; y *= 2.02; amp *= 0.5; } return f / tot; }
// value noise that repeats every px cells in x and py cells in y (for layers that scroll and wrap)
function pnoise(x, y, px, py, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py; const a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const BAYER = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16));
// continuous ramp value -> integer index: clean bands, ordered dither only across the band edges (kolobok 1_engine.js)
function dith(f, x, y) {
  const fl = Math.floor(f);
  let fr = f - fl;
  fr = fr < 0.28 ? 0 : fr > 0.72 ? 1 : (fr - 0.28) / 0.44;
  return fl + (fr > BAYER[((y & 3) << 2) | (x & 3)] ? 1 : 0);
}
// squeeze the in-between part of every step, so slow gradients (sea haze, sky, gentle hills) keep thin seams
function band(f, k) { const fl = Math.floor(f); return fl + clamp((f - fl - 0.5) * k + 0.5, 0, 1); }

// ---------------------------------------------------------------- palette
// ONE ramp for the whole picture, indigo shadow > blue > teal > sage > gold > cream (the light). Five accents, each with
// a job: two ice greys (snow in shade, the frost of the sacred groves, the ash of the battlefield), wheat gold, lamp, ember.
const RAMP = ['#0b0d22', '#111a3a', '#16294f', '#1b3b63', '#204f72', '#27657a', '#347b7c', '#4c9279', '#82ad7a', '#c3c285', '#ecd692', '#fdf3cc'];
const ACCENT_HEX = ['#8696a3', '#b9c6cc', '#c2a456', '#ffc45e', '#e8552d'];
const ICE2 = 12, ICE = 13, GOLD = 14, LAMP = 15, EMBER = 16;
const PALHEX = RAMP.concat(ACCENT_HEX), PAL = new Uint32Array(256);
PALHEX.forEach((h, i) => { PAL[i] = (0xff000000 | (parseInt(h.slice(5, 7), 16) << 16) | (parseInt(h.slice(3, 5), 16) << 8) | parseInt(h.slice(1, 3), 16)) >>> 0; });
// material ladders: short runs through the same colours, so each material keeps clean bands of its own
const MAT_RAMP = 0, MAT_WHITE = 1, MAT_ASH = 2, MAT_WHEAT = 3;
const MATS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  [4, ICE2, ICE, 10, 11],                      // snow: deep shade, shade, cool lit, warm lit, the rim toward the sun
  [3, 4, 5, ICE2, ICE],                        // ash flats
  [5, 6, 7, 8, GOLD, 9, 10],                   // wheat: furrow shadow .. fallow green, gold, straw, pale
];
const MLUT = new Uint8Array(4 * 12);
MATS.forEach((m, k) => { for (let j = 0; j < 12; j++) MLUT[k * 12 + j] = m[Math.min(j, m.length - 1)]; });

// ---------------------------------------------------------------- composition
const U0 = -0.005, SX = W / 1.01;              // the view shows u from -0.005 to 1.005
let KV = 338;                                  // screen rows per unit of v at sea level: set in setH so the land fills the frame (polish 2)
const LENS = 30, LV0 = 0.05, LV1 = 0.27;       // the northern strip gets 30 extra rows, spread over v 0.05 .. 0.27
let KVMAX = KV + LENS * 1.5 / (LV1 - LV0);
let E = 54;                                    // screen rows per unit of height: the relief (set in setH, in step with KV)
const SKY = 0.125, COAST_GAP = 22, SOUTH_GAP = 26;   // polish 2: the sky is 12.5% of the frame, the open sea above the land about 4%
const SEA = WORLD.SEA, N = WORLD.N, F = WORLD.FOREST;
let HY = 151, YM = 169;                        // horizon row; row of v = 0 at sea level
const SUNX = 82, SUNR = 7; let SUNY = 121;     // the low sun over the Unknown Sea, straight above the mountain path
const LX = -0.72, LY = -0.30, LZ = 0.62;       // direction TO the light for the relief: west-north-west, a third of the way up (polish 3: a little more from the north)
const SHADE_Z = 0.30;                          // slope exaggeration for shading
const SHADOW_TAN = 3.6;                        // height the light ray climbs per unit of distance (sets shadow length; polish 3: longer)
const SHX = -0.58, SHY = -0.81;                // polish 3: cast shadows fall to the south-east, straight away from the low sun in the north-west
const yv = v => KV * v + LENS * sstep(LV0, LV1, v);

// ---------------------------------------------------------------- buffers
const M = 1024;                                // fine height grid (world cells x 2, with crest detail)
let HG = null, VOLC = null;
let PU = null, PV = null, VAL = null, MATB = null, BASE = null, IDX = null, OUT32 = null, REL = null, LANDM = null, FORM = null, POOL = null;
let SKYV = null, GLOW = null, CLV = null, SEAT = null, SEAM = null, ROWSPD = null;
let WHI = null, WHP = null, WHC = null, WHG = null, WHN = 0;
const CW = 640;                                // the cloud layer is two screens wide and wraps
const G = { t: 0, labels: 0 };
let LBL = null;
let SPI = [], SPC = [];                        // baked sprite pixels: frame index, palette index
let PLACES = {}, OBST = [], RIPE = null, FTONE = null, FSTRIPE = null;
const DYN = { win: [], ember: [], mills: [], eyes: [], spark: [], storms: [], stars: [] };
let GLI = null, GLP = null, GLC = null, GLN = 0, LAKEG = [];

function blur2(A, w, h, r) {                    // separable box blur, three passes: close to a gaussian
  const B = new Float32Array(w * h), k = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let a = 0; for (let d = -r; d <= r; d++) a += A[j * w + clamp(i + d, 0, w - 1)]; B[j * w + i] = a * k; }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let a = 0; for (let d = -r; d <= r; d++) a += B[clamp(j + d, 0, h - 1) * w + i]; A[j * w + i] = a * k; }
  }
  return A;
}
function windowOf(u0, u1, v0, v1) { const i0 = Math.max(0, Math.floor(u0 * M)), i1 = Math.min(M - 1, Math.ceil(u1 * M)), j0 = Math.max(0, Math.floor(v0 * M)), j1 = Math.min(M - 1, Math.ceil(v1 * M)); return [i0, j0, i1 - i0 + 1, j1 - j0 + 1]; }
function buildHeight() {
  HG = new Float32Array(M * M); VOLC = new Uint8Array(M * M);
  const S = new Float32Array(M * M);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    let h = WORLD.heightAt((i + 0.5) / M, (j + 0.5) / M);
    if (h > 0.40) h = 0.40 + 0.55 * Math.pow((h - 0.40) / 0.55, 0.72);    // broad shoulders: massifs, not needles
    HG[j * M + i] = S[j * M + i] = h;
  }
  blur2(S, M, M, 3);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    const u = (i + 0.5) / M, v = (j + 0.5) / M, k = j * M + i;
    let h = lerp(HG[k], S[k], sstep(0.33, 0.50, HG[k]));          // only the high ground is smoothed: coasts keep their shape
    if (h > SEA && !WORLD.lake[WORLD.cell(u, v)]) {
      const mt = WORLD.sample(WORLD.mountain, u, v);
      if (mt > 0.02) h += mt * ((0.42 - Math.abs(fbm(u * 24, v * 24, 7, 2) * 2 - 1)) * 0.07 + (0.4 - Math.abs(vnoise(u * 74, v * 74, 19) * 2 - 1)) * 0.022);   // ribs and gullies: facets for the light
    }
    HG[k] = h;
  }
  shapeVolcanoes(); shapeMachine(); carvePasses();
}
// the Fire-Dragon Peaks: seven cones in a compact cluster, four of them tall and sharp; two craters glow
const VOLC_TALL = ['fire_dragon_1', 'fire_dragon_4', 'fire_dragon_2', 'fire_dragon_5'], VOLC_CRATER = ['fire_dragon_1', 'fire_dragon_5'];
function shapeVolcanoes() {
  const fd = WORLD.PEAKS.filter(p => p.key.indexOf('fire_dragon') === 0);
  const [i0, j0, w, h] = windowOf(Math.min(...fd.map(p => p.u - p.r)) - 0.04, Math.max(...fd.map(p => p.u + p.r)) + 0.04, Math.min(...fd.map(p => p.v - p.r)) - 0.04, Math.max(...fd.map(p => p.v + p.r)) + 0.04);
  // polish 2: separate sharp cones, not one summed massif (it read as a dark face). Four tall cones, three small ones.
  for (let j = j0; j < j0 + h; j++) for (let i = i0; i < i0 + w; i++) {
    const k = j * M + i, u = (i + 0.5) / M, v = (j + 0.5) / M;
    let best = 0;
    for (const pk of fd) {
      const big = VOLC_TALL.indexOf(pk.key) >= 0, d = Math.hypot(u - pk.u, (v - pk.v) * 1.1) / (pk.r * (big ? 2.0 : 1.3));
      if (d < 1) { const c = (pk.h - 0.24) * Math.pow(1 - d, 1.25) * (big ? 1.05 : 0.4); if (c > best) best = c; }   // a broad foot, a steep top; the small cones stay foothills
    }
    if (best < 0.012) continue;
    const rug = (0.5 - Math.abs(fbm(u * 60, v * 60, 71, 2) * 2 - 1)) * 0.015 * sstep(0.03, 0.12, best);   // gullies down the flanks
    HG[k] = Math.max(HG[k], 0.235 + best + rug);
    if (best > 0.025) VOLC[k] = 1;
  }
  for (const pk of fd) if (VOLC_CRATER.indexOf(pk.key) >= 0) {
    const rc = pk.r * 0.26, [ci0, cj0, cw, chh] = windowOf(pk.u - rc, pk.u + rc, pk.v - rc, pk.v + rc);
    for (let j = cj0; j < cj0 + chh; j++) for (let i = ci0; i < ci0 + cw; i++) {
      const d = Math.hypot((i + 0.5) / M - pk.u, (j + 0.5) / M - pk.v) / rc;
      if (d < 1) HG[j * M + i] -= 0.08 * (1 - d * d);
    }
  }
}
// the mountain path and the low gap: the drawn relief dips a little deeper along them, so the notches show from afar
function carvePasses() {
  const path = WORLD.ROADS.find(r => r.kind === 'path'), gap = WORLD.poi('east_gap');
  const lines = [[path.pts, 0.085, 0.026], [gap ? [[gap.u - 0.004, gap.v - 0.05], [gap.u, gap.v], [gap.u + 0.006, gap.v + 0.05]] : [], 0.05, 0.022]];
  for (const [pts, depth, wd] of lines) {
    if (pts.length < 2) continue;
    const [i0, j0, w, h] = windowOf(Math.min(...pts.map(q => q[0])) - wd, Math.max(...pts.map(q => q[0])) + wd, Math.min(...pts.map(q => q[1])) - wd, Math.max(...pts.map(q => q[1])) + wd);
    for (let j = j0; j < j0 + h; j++) for (let i = i0; i < i0 + w; i++) {
      const u = (i + 0.5) / M, v = (j + 0.5) / M, k = j * M + i;
      if (v < 0.19 || v > 0.33 || HG[k] < 0.34) continue;
      let d = 9;
      for (let q = 0; q < pts.length - 1; q++) {
        const ax = pts[q][0], ay = pts[q][1], bx = pts[q + 1][0], by = pts[q + 1][1], dx = bx - ax, dy = by - ay;
        const t = clamp(((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy), 0, 1), e = Math.hypot(u - ax - dx * t, v - ay - dy * t);
        if (e < d) d = e;
      }
      if (d < wd) { const q = 1 - (d / wd) * (d / wd); HG[k] = Math.max(0.34, HG[k] - depth * q * q * sstep(0.34, 0.5, HG[k])); }
    }
  }
}
// the Mount of the Buried Machine: the summit is cut off flat, and a giant wheel stands in it (sprite)
function shapeMachine() {
  const pk = WORLD.PEAKS.find(p => p.key === 'buried_machine');
  if (!pk) return;
  const [i0, j0, w, h] = windowOf(pk.u - pk.r * 1.3, pk.u + pk.r * 1.3, pk.v - pk.r * 1.3, pk.v + pk.r * 1.3);
  for (let j = j0; j < j0 + h; j++) for (let i = i0; i < i0 + w; i++) {
    const k = j * M + i, cap = 0.575 + 0.015 * (vnoise(i * 0.3, j * 0.3, 5) - 0.5);
    if (HG[k] > cap) HG[k] = cap + (HG[k] - cap) * 0.1;
  }
}
function hg(u, v) {                              // bilinear fine height; open sea outside the world
  if (u <= 0 || u >= 1 || v <= 0 || v >= 1) return 0;
  const x = clamp(u * M - 0.5, 0, M - 1.001), y = clamp(v * M - 0.5, 0, M - 1.001), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, k = yi * M + xi;
  return (HG[k] * (1 - fx) + HG[k + 1] * fx) * (1 - fy) + (HG[k + M] * (1 - fx) + HG[k + M + 1] * fx) * fy;
}
const volcAt = (u, v) => (u <= 0 || u >= 1 || v <= 0 || v >= 1) ? 0 : VOLC[clamp((v * M) | 0, 0, M - 1) * M + clamp((u * M) | 0, 0, M - 1)];
const surf = (u, v) => { const h = hg(u, v); return h < SEA ? SEA : h; };
const sx = u => (u - U0) * SX;
const sy = (v, h) => YM + yv(v) - (h - SEA) * E;
const px = u => Math.floor(sx(u));
const py = (u, v) => Math.floor(sy(v, surf(u, v)));

// ---------------------------------------------------------------- the terrain pass: which point of the world each pixel shows
function buildVisibility() {
  PU.fill(0); PV.fill(-9);
  const dv = 0.25 / KVMAX;
  for (let x = 0; x < W; x++) {
    const u = U0 + (x + 0.5) / SX;
    let ybuf = H;
    for (let v = 1.15; v > -0.6 && ybuf > HY; v -= dv) {
      const yi = Math.ceil(sy(v, surf(u, v)));
      if (yi < ybuf) {
        for (let y = ybuf - 1; y >= yi && y >= HY; y--) { PU[y * W + x] = u; PV[y * W + x] = v; }
        ybuf = yi;
      }
    }
  }
}

// ---------------------------------------------------------------- shading
function castShadow(u, v, h) {                   // 0 = open to the light, 1 = deep in shadow (soft: the penumbra widens with distance)
  const len = Math.hypot(SHX, SHY), du = SHX / len, dv = SHY / len;
  let worst = 0;
  for (let s = 0.0022; s < 0.19; s += 0.0018) {
    const d = hg(u + du * s, v + dv * s) - (h + s * SHADOW_TAN);
    if (d > 0) { const k = d / (0.006 + s * 0.9); if (k > worst) { worst = k; if (worst >= 1) return 1; } }
    if (h + s * SHADOW_TAN > 0.97) break;
  }
  return worst;
}
function slopeLight(u, v, d) {                   // light on the slope at (u, v), measured over a span d: 0 on flat ground
  const gx = (hg(u + d, v) - hg(u - d, v)) / (2 * d), gy = (hg(u, v + d) - hg(u, v - d)) / (2 * d);
  const nx = -gx * SHADE_Z, ny = -gy * SHADE_Z;
  return (nx * LX + ny * LY + LZ) / Math.sqrt(nx * nx + ny * ny + 1) - LZ;
}
const dead = (r, z) => (r > z ? r - z : r < -z ? r + z : 0);
const lit = r => (r > 0 ? r / 0.34 : r / 0.85);  // -1 turned away .. 0 flat .. +1 facing the light
// forest canopy: one crown per cell, lit on its upper left. Returns -9 where no crown stands.
function crown(x, y, dens, size, seed) {
  let best = 9, bx = 0, by = 0;
  const cx = Math.floor(x / size), cy = Math.floor(y / size);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j;
    if (hash2(gx, gy, seed) > dens) continue;
    const qx = (gx + 0.2 + 0.6 * hash2(gx, gy, seed + 1)) * size, qy = (gy + 0.2 + 0.6 * hash2(gx, gy, seed + 2)) * size;
    const d = (x - qx) * (x - qx) + (y - qy) * (y - qy) * 1.2;
    if (d < best) { best = d; bx = x - qx; by = y - qy; }
  }
  const r = size * 0.78;
  if (best > r * r) return -9;
  return (-bx * 0.7 - by * 0.75) / r;                              // +1 on the lit rim, -1 on the far side
}
function mood(x, y) {                            // the dawn lies on the north-west; the south-east corners fall away
  const d = Math.hypot(x - SUNX, (y - HY) * 0.8);
  return 0.8 * Math.exp(-d / 150) - 0.9 * sstep(250, 470, d);
}
// polish 3: the low sun lights the land from the north-west. Away from it the land falls one step, then a second in the far
// south-east. The seams are warped by slow noise, so they are soft shores of light, never a ruled diagonal.
function sunGrad(u, v, h) {                       // h: higher ground keeps the light longer (hilltops stand lit out of the shade)
  const g = u * 0.62 + v * 0.78 + (fbm(u * 2.3, v * 2.3, 88, 3) - 0.5) * 0.36 - (h - 0.25) * 1.3;
  return -sstep(0.95, 1.03, g) - sstep(1.18, 1.26, g);
}
// ground tone by region (polish 2: whole steps, so the lowland is ONE flat tone): the cold north a step under the rest
const LAND_BASE = new Float32Array(16).fill(7.1);   // x.1 = flat: band() keeps a value flat near the whole step and dithers only round x.5
LAND_BASE[4] = 6.1; LAND_BASE[5] = 6.1; LAND_BASE[9] = 5.1; LAND_BASE[12] = 6.1;
const FOCUS_U = 0.44, FOCUS_V = 0.62;           // the wheat country and the Castle of the Order: the corners far from it fall a step
let PATHL = null;                               // the mountain path as a flat [u0, v0, u1, v1, ...] list (its highlights are kept)
function pathDist(u, v) {
  let d = 9;
  for (let q = 0; q + 3 < PATHL.length; q += 2) {
    const ax = PATHL[q], ay = PATHL[q + 1], dx = PATHL[q + 2] - ax, dy = PATHL[q + 3] - ay;
    const t = clamp(((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy), 0, 1), e = Math.hypot(u - ax - dx * t, v - ay - dy * t);
    if (e < d) d = e;
  }
  return d;
}
const battleAt = (u, v, k) => WORLD.region[WORLD.cell(u + (fbm(u * 40, v * 40, 61, 2) - 0.5) * k, v + (fbm(u * 40, v * 40, 62, 2) - 0.5) * k)] === 12;
function shadeForest(x, y, u, v, fo, ft, L, steep, sh, md, reg) {   // returns [value, forest kind] or null where no crown stands
  if (ft === F.EYES) {                                             // the Forest of Eyes: a dense, near-black canopy, crowns touching, a ragged edge
    const wu = u + (fbm(u * 55, v * 55, 13, 2) - 0.5) * 0.03, wv = v + (fbm(u * 55, v * 55, 14, 2) - 0.5) * 0.03;
    if (WORLD.forestType[WORLD.cell(wu, wv)] !== F.EYES || WORLD.sample(WORLD.forest, wu, wv) < 0.3) return null;
    const cr = crown(x, y, 0.98, 3.2, 31);
    return [2.2 + (cr > 0.3 ? 1 : cr < -0.5 ? -1 : 0) - sh * 0.4 + md * 0.3, 2];
  }
  // polish 2: every wood is one calm dark mass two steps under the grass; only a few crowns catch the light, no slope noise
  const pine = ft === F.PINE;
  const sd = sh > 0.5 ? 1 : 0;
  if (reg === 8) return [6.1 - sd, 1];                               // the alpine woods: a step under the meadows, so the green valleys stay green
  if (v < 0.34) return [5.1 - sd, 1];
  const cr = fo > 0.5 ? 0 : crown(x, y, 0.95, pine ? 2.6 : 3, 31);
  if (cr <= -9) return null;
  const top = crown(x, y, 0.30, pine ? 3 : 4, 57);
  return [5.1 + (top > 0.35 && L > -0.2 ? 1 : 0) - sd, 1];
}
// polish 2: fertile fields round the eastern city: a slanted, wobbly grid of patches, every third or so a step lighter,
// thinning out away from the city (so it is farmland, not a chequerboard)
function eastField(u, v) {
  const cu = 0.74, cv = 0.50, d = Math.hypot(u - cu, (v - cv) * 0.9);
  if (d > 0.14 || d < 0.028) return 0;
  const a = 0.22, ca = Math.cos(a), sa = Math.sin(a);
  const gx = (u * ca + v * sa) * 46 + (vnoise(u * 30, v * 30, 5) - 0.5) * 0.3, gy = (v * ca - u * sa) * 66 + (vnoise(u * 30, v * 30, 6) - 0.5) * 0.3;
  const q = hash2(Math.floor(gx), Math.floor(gy), 909), keep = 1 - sstep(0.06, 0.13, d);
  return q < 0.34 * keep ? 1 : q > 1 - 0.10 * keep ? -1 : 0;        // light fields, a few dark (ploughed or wooded) ones, the rest grass
}
function pond(x, y) {                            // small separate ponds on a jittered grid: > 0 inside, the rim between 0 and 0.25
  let best = 0;
  const gx = Math.floor(x / 6), gy = Math.floor(y / 4);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j;
    if (hash2(cx, cy, 81) > 0.42) continue;
    const qx = (cx + 1.2 * hash2(cx, cy, 82)) * 6, qy = (cy + 1.2 * hash2(cx, cy, 83)) * 4, rx = 1.2 + 2.8 * hash2(cx, cy, 84), ry = 0.9 + 0.9 * hash2(cx, cy, 85);
    const e = 1 - ((x - qx) * (x - qx)) / (rx * rx) - ((y - qy) * (y - qy)) / (ry * ry);
    if (e > best) best = e;
  }
  return best;
}
function shadeLand(i, x, y, u, v) {
  const h = hg(u, v), c = WORLD.cell(u, v);
  const mt = WORLD.sample(WORLD.mountain, u, v), sn = WORLD.sample(WORLD.snow, u, v);
  const fo = WORLD.sample(WORLD.forest, u, v), ft = WORLD.forestType[c], reg = WORLD.region[c];
  const volc = volcAt(u, v);
  const steep = sstep(0.05, 0.4, volc ? 0.5 : mt);
  const rel = lerp(dead(slopeLight(u, v, 3 / N), reg === 10 || reg === 11 ? 0.03 : 0.05), slopeLight(u, v, 0.8 / N), steep);
  const L = clamp(lit(rel), -1, 1);
  const sh = castShadow(u, v, h);
  const md = mood(x, y), sg = sunGrad(u, v, h), shs = sstep(0.3, 0.7, sh);
  let mat = MAT_RAMP, val, forest = 0;
  if (volc) {                                                        // dark volcanic rock in three flat bands: the west faces lit, the south faces, the lee
    const gx = (hg(u + 1 / M, v) - hg(u - 1 / M, v)) * M * 0.5;
    val = gx > 0.6 ? 4.6 : gx < -0.6 ? 2.1 : 3.1;                   // dark rock against the green: the west face lit, the lee one step down
  }
  // polish 3: snow one step down (flat snow is the shade grey, only faces turned to the sun reach the ice); cream only on the
  // rims of the highest ridges (lightCrests). The wheat country is the focus now, not the north-west massif.
  else if (sn > 0.38 || (mt > 0.3 && h > WORLD.snowLineAt(v) - 0.07)) { mat = MAT_WHITE; val = clamp(1.25 + (L > 0 ? L * 1.4 : L * 2.3) - sh * 1.6 + sg * 0.5, 0.2, 2.15); }
  else if (mt + (fbm(u * 50, v * 50, 9, 2) - 0.5) * 0.1 > 0.22) { val = clamp(4.4 + (h - 0.45) * 2.0 + (L > 0 ? L * 2.6 : L * 2.3) - sh * 1.4 + sg * 0.7, 1.3, 7.2); }
  else if (battleAt(u, v, 0.02)) { mat = MAT_ASH; val = 3.1 - (sh > 0.5 ? 1 : 0); }   // the Silent Battlefield: one flat ash tone (polish 2: the blotches read as a stain)
  else if (RIPE[WORLD.wheatField[c]]) {
    // polish 2: long parallel strips that run along the road (one direction for the whole plain, it curves with the road),
    // two golds and now and then a fallow strip; each field shifts the strips, so they break at field edges
    const f = WORLD.wheatField[c], across = (u - wheatRoadU(v)) * SX + hash2(f, 5, 17) * 3;
    const strip = Math.floor((across + 300) / 2), q = hash2(strip, f, 23), main = FTONE[f];
    const t = main === 3 ? (q < 0.7 ? 3 : 4) : q < 0.62 ? main : q < 0.92 ? 9 - main : 3;
    val = t + 0.1 - (sh > 0.5 ? 1 : 0);
    mat = MAT_WHEAT;
  } else {
    // polish 2: broad value bands. The lowland is one flat tone; a lit or a shaded step only on real hills (3 bands there),
    // a step down in the cast shadow of the ranges, and the corners far from the focus fall one step (a soft vignette)
    // polish 3: the cast shadow is soft (a dithered seam where it ends), and the sun gradient replaces the focus vignette
    const Lg = clamp(lit(slopeLight(u, v, 7 / N)), -1, 1), hl = sstep(0.285, 0.36, h);
    let step = (Lg > lerp(1.6, 0.5, hl) ? 1 : 0) - (Lg < lerp(-1.6, -0.5, hl) ? 1 : 0);
    if (step === 0 && shs < 0.5 && reg === 10) step = eastField(u, v);   // the eastern kingdom: a patchwork of fields round its city
    val = LAND_BASE[reg] + step - shs + sg;
    if (WORLD.wheat[c] > 0.02 && WORLD.wheatField[c]) val = LAND_BASE[reg] - shs + sg;   // pasture among the fields: plain, calm
    if (battleAt(u, v, 0.05)) val -= 1;                            // scorched ground round the ash flats: one step down, so the ash has no sticker edge
    if (ft === F.CRYSTAL && fo > 0.3) { if (fo + (fbm(u * 120, v * 120, 15, 2) - 0.5) * 0.5 > 0.55) val -= 1; }   // the sacred groves: a darker glade under the crystal trees (polish 2: the frost patch read as a grey slab)
    else if (ft === F.SWAMP || reg === 9) {                          // the Toad Swamp: murky ground, pools that hold the sky, dark mud rims
      val = 5.1;                                                     // polish 2: one flat murky tone (it dithered)
      const pd = pond(x, y);
      if (pd > 0.3) { val = 8.1; POOL[i] = 1; } else if (pd > 0) val = 3.1;
    }
    else if (fo > 0.22 && ft !== F.NONE) {
      const fr = shadeForest(x, y, u, v, fo, ft, L, steep, sh, md, reg);
      if (fr) { val = fr[0] + (fr[1] === 2 ? 0 : sg); forest = fr[1]; }
    }
  }
  MATB[i] = mat; VAL[i] = mat === MAT_WHEAT ? val : band(val, 4); REL[i] = rel; FORM[i] = forest;
}
// continuous sky value. Polish 3: the glow is the LARGEST of three shapes, never their sum (the sum made a flat-sided pale
// pillar under the disc, a keyhole): round rings round the disc, a low wedge on the horizon that tapers upward, and the
// plain gradient with a thin horizon band.
function skyAt(x, y) {
  const t = clamp(y / HY, 0, 1), dx = x - SUNX, dy = y - SUNY, d = Math.sqrt(dx * dx + dy * dy), dh = HY - y;
  const base = 1.6 + 4.2 * Math.pow(t, 1.5) + 1.4 * Math.exp(-(dh * dh) / 60);
  const ring = 3.0 + 8.4 * Math.exp(-(d - 5) / 19);
  const wedge = 9.2 - Math.abs(dx) * 0.085 - dh * 0.34;
  return Math.min(10.4, Math.max(base, ring, wedge));
}
function shadeSea(i, x, y, u, v) {
  const uc = clamp(u, 0.002, 0.998), vc = clamp(v, 0.002, 0.998);
  const out = Math.max(0, -u, u - 1, -v, v - 1);
  const dc = -WORLD.sample(WORLD.coast, uc, vc) + out + (fbm(u * 14, v * 14, 41, 2) - 0.5) * 0.012;   // how far out at sea
  let val = dc < 0.0065 ? 4.1 : 2.1;                                                                // polish 2: ONE shallow band along every shore, then the deep (no rings round the islets)
  const dy = y - HY, dx = x - SUNX;
  val = lerp(val, skyAt(x, HY - 1) - 1.5, Math.exp(-dy / 9));                                        // haze: the far sea melts toward the sky
  // the wedge on the horizon, and (polish 3) a narrow sun's road that runs on down to the north coast, toward the Reach
  val += 2.2 * Math.exp(-dy / 6) * Math.exp(-(dx * dx) / 2000) + 1.5 * Math.exp(-dy / 55) * Math.exp(-(dx * dx) / (14 + dy * 1.2));
  val += sunGrad(uc, vc, SEA) * 0.5;                                 // polish 3: the far south-east water lies a step deeper in the shade
  MATB[i] = MAT_RAMP; VAL[i] = band(Math.max(val, 1.1), 7);
}
let WRU = null;                                  // the wheat road's u at each v (polish 2: the strips follow it)
function wheatRoadU(v) {
  if (!WRU) {
    const r = WORLD.ROADS.find(q => q.key === 'wheat_road') || { pts: [[0.48, 0], [0.48, 1]] };
    const pts = r.pts.slice().sort((a, b) => a[1] - b[1]);
    WRU = new Float32Array(256);
    for (let k = 0; k < 256; k++) {
      const vv = k / 255; let u = pts[0][0];
      for (let q = 0; q < pts.length - 1; q++) if (vv >= pts[q][1] && vv <= pts[q + 1][1]) u = lerp(pts[q][0], pts[q + 1][0], (vv - pts[q][1]) / (pts[q + 1][1] - pts[q][1]));
      if (vv > pts[pts.length - 1][1]) u = pts[pts.length - 1][0];
      WRU[k] = u;
    }
  }
  return WRU[clamp(Math.round(v * 255), 0, 255)];
}
function surveyFields() {                        // a field is ripe when most of it is; each ripe field gets a tone and maybe strips
  const n = new Float32Array(65536), w = new Float32Array(65536);
  for (let c = 0; c < N * N; c++) { const f = WORLD.wheatField[c]; if (f) { n[f]++; w[f] += WORLD.wheat[c]; } }
  RIPE = new Uint8Array(65536); FTONE = new Float32Array(65536); FSTRIPE = new Uint8Array(65536);
  for (let f = 1; f < 65536; f++) {
    if (!n[f] || w[f] / n[f] <= 0.5) continue;
    RIPE[f] = 1;
    const q = hash2(f, 3, 17), edge = w[f] / n[f] < 0.68;
    FTONE[f] = edge && q < 0.5 ? 3 : q < 0.68 ? 4 : 5;   // fallow green at the ragged edge, then gold and straw (no pale fields: the sun stays the brightest thing)
    FSTRIPE[f] = hash2(f, 4, 17) < 0.6 ? 1 : 0;
  }
}
function buildTerrain() {
  if (!RIPE) surveyFields();
  if (!PATHL) { const p = WORLD.ROADS.find(r => r.kind === 'path').pts; PATHL = new Float64Array(p.length * 2); p.forEach((q, k) => { PATHL[2 * k] = q[0]; PATHL[2 * k + 1] = q[1]; }); }
  POOL.fill(0);
  for (let y = HY; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, u = PU[i], v = PV[i];
    const inside = u > 0 && u < 1 && v > 0 && v < 1;
    LANDM[i] = 0; FORM[i] = 0; REL[i] = 0;
    if (inside && (hg(u, v) >= SEA) && !WORLD.lake[WORLD.cell(u, v)]) { shadeLand(i, x, y, u, v); LANDM[i] = 1; }
    else if (inside && WORLD.lake[WORLD.cell(u, v)]) { MATB[i] = MAT_RAMP; VAL[i] = 4.1; LANDM[i] = 3; }    // polish 2: a lake is deep blue water between its walls (it read as pale rock)
    else shadeSea(i, x, y, u, v);
  }
  // surf: a broken pale line where the sea meets a shore that faces us
  for (let y = HY + 12; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!LANDM[i] && LANDM[i - W] === 1 && vnoise(x * 0.3, y * 0.5, 13) > 0.42) VAL[i] = Math.max(VAL[i], 6.1);
  }
  for (let y = HY + 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (LANDM[i] === 1 && MATB[i] === MAT_RAMP && !FORM[i] && (!LANDM[i - W] || !LANDM[i - 1])) VAL[i] += 0.9;
  }
  // polish 3: the wheat plain is the focus: its edges toward the sun catch the warmest light (north lip pale, west lip straw)
  for (let y = HY + 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (MATB[i] !== MAT_WHEAT || LANDM[i] !== 1) continue;
    if (MATB[i - W] !== MAT_WHEAT && LANDM[i - W] === 1) VAL[i] = 6.1;
    else if (MATB[i - 1] !== MAT_WHEAT && LANDM[i - 1] === 1) VAL[i] = 5.1;
  }
  // lakes: deep blue; the far (north) and shaded (west) banks mirror dark, a 1 px bright rim on the near and sunlit side
  const LK = new Uint8Array(W * H);
  for (let y = HY + 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (LANDM[i] !== 3) continue;
    if (LANDM[i + W] !== 3) LK[i] = 3; else if (LANDM[i + 1] !== 3 || LANDM[i - 1] !== 3) LK[i] = 2; else if (LANDM[i - W] !== 3) LK[i] = 1;
  }
  for (let i = 0; i < W * H; i++) {
    if (LK[i] === 3) VAL[i] = 10.1;                                  // the near lip catches the light
    else if (LK[i]) { MATB[i] = MAT_WHITE; VAL[i] = 2.1; }           // the far and side banks: a thin ice rim against the rock
    else if (LANDM[i] === 3) VAL[i] = 2.1;                           // deep water: darker than the shaded rock round it
  }
  LAKEG = [];                                                        // one short glint per lake, in the middle of its widest row
  for (let k = 1; k <= WORLD.LAKES.length; k++) {
    let best = -1, bw = 0;
    for (let y = HY + 2; y < H - 1; y++) { let run = 0; for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (LANDM[i] === 3 && !LK[i] && WORLD.lake[WORLD.cell(PU[i], PV[i])] === k) { run++; if (run > bw) { bw = run; best = i - (run >> 1); } } else run = 0; } }
    if (best >= 0) LAKEG.push(best);
  }
  lightCrests();
  // woods stand a little proud of the ground: a lit edge to the north-west, a shadow at their south-east foot
  for (let y = HY + 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!FORM[i]) continue;
    if (!FORM[i - 1] && !FORM[i - W] && LANDM[i - 1] === 1) VAL[i] += 1;
    if (!FORM[i + 1] && LANDM[i + 1] === 1 && MATB[i + 1] === MAT_RAMP) VAL[i + 1] = Math.min(VAL[i + 1], Math.max(VAL[i + 1] - 1, 4.1));
    if (!FORM[i + W] && LANDM[i + W] === 1 && MATB[i + W] === MAT_RAMP) VAL[i + W] = Math.min(VAL[i + W], Math.max(VAL[i + W] - 1, 4.1));
  }
  buildRoads();
  buildRivers();
}
// crests: where the ground behind is much farther north, the edge is a ridge line. Mountain crests take a warm 1 px rim
// toward the sun (the relief answers the light, as the Still Water clouds do); lowland crests a step of light.
// polish 3: a rim is a silhouette edge seen from above (the ground behind is far) OR from the sun side (the ground to the
// west is far), so steep west edges get a continuous line instead of a dotted string. A rim pixel with no rim neighbour
// is speckle (rubric 1.5) and is dropped. Snow rims are ice; only the highest ridges (TOP_RIDGE) carry the pure cream.
const TOP_RIDGE = 0.86;
function lightCrests() {
  const CR = new Uint8Array(W * H), far = 4 / KV;
  for (let y = HY + 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (LANDM[i] !== 1 || FORM[i]) continue;
    const top = PV[i - W] < PV[i] - far, west = PV[i - 1] < PV[i] - far;
    if (!top && !west) continue;
    const u = PU[i], v = PV[i], vo = volcAt(u, v), mtn = Math.max(WORLD.sample(WORLD.mountain, u, v), vo ? 0.6 : 0);
    if (mtn <= 0.18 || REL[i] <= -0.12) continue;                  // polish 2: lowland crests get no light line (they made the camouflage)
    CR[i] = top ? 1 : 2;
  }
  for (let y = HY + 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!CR[i]) continue;
    if (!(CR[i - W - 1] || CR[i - W] || CR[i - W + 1] || CR[i - 1] || CR[i + 1] || CR[i + W - 1] || CR[i + W] || CR[i + W + 1])) continue;
    const u = PU[i], v = PV[i], vo = volcAt(u, v), dx = x - SUNX, col = Math.exp(-(dx * dx) / 16000);
    if (MATB[i] === MAT_WHITE) VAL[i] = hg(u, v) > TOP_RIDGE ? 4.1 : 2.1;
    else if (MATB[i] === MAT_RAMP) VAL[i] = Math.max(VAL[i], (vo ? 7.1 : 8.1) + col);
    if (CR[i] === 1 && !CR[i - W] && LANDM[i - W] === 1 && MATB[i - W] === MAT_RAMP && !vo) VAL[i - W] -= 1;
  }
}
function trace(pts, each) {                      // walk a world polyline one screen pixel at a time
  let lx = -1, ly = -1;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const steps = Math.ceil(Math.hypot((b[0] - a[0]) * SX, (b[1] - a[1]) * KVMAX) * 2) + 1;
    for (let q = 0; q <= steps; q++) {
      const u = lerp(a[0], b[0], q / steps), v = lerp(a[1], b[1], q / steps);
      const x = px(u), y = py(u, v);
      if ((x === lx && y === ly) || x < 0 || x >= W || y <= HY || y >= H) continue;
      lx = x; ly = y;
      const i = y * W + x;
      if (Math.abs(PV[i] - v) > 3 / KV) continue;                  // hidden behind nearer ground
      each(i, x, y, k + q / steps, u, v);
    }
  }
}
// polish 2: rivers are water, not roads: a light ice step (the dawn sky in them) with a darker bank on the shaded side.
// The five named rivers are drawn whole, from the spring to the sea; small streams only where they carry real water.
function buildRivers() {
  // polish 3: rivers one step darker (shade-ice), 1 px at the spring, 2 px in the lower course, 3 px at the mouth; the
  // extra pixels go across the way the river runs, so an east-west stretch widens too
  const RV = new Uint8Array(W * H);
  const wet = (i, f) => { MATB[i] = MAT_WHITE; VAL[i] = f; LANDM[i] = 2; FORM[i] = 0; RV[i] = 1; };
  const wetIf = (j) => { if (j >= 0 && j < W * H && (LANDM[j] === 1 || LANDM[j] === 2)) wet(j, 1.1); };
  for (const R of WORLD.RIVERS) {
    let lx = -1, ly = -1, flat = false;
    const n = R.pts.length - 1;
    trace(R.pts, (i, x, y, s) => {
      const k = Math.min(n, Math.round(s)), wk = R.w[k], f = s / n;
      if (lx >= 0) flat = Math.abs(x - lx) > Math.abs(y - ly);
      lx = x; ly = y;
      if (LANDM[i] !== 1 && LANDM[i] !== 2) return;
      if (wk <= 0 || (!R.named && wk < 0.55)) return;
      wet(i, 1.1);
      if (!R.named || f < 0.3 || wk <= 0.62) return;
      const side = flat ? W : 1;
      if (x + 1 < W) wetIf(i + side);
      if (f > 0.86 && x > 0) wetIf(i - side);
    });
  }
  for (let y = HY + 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!RV[i]) continue;
    for (const j of [i + 1, i + W]) if (LANDM[j] === 1 && MATB[j] === MAT_RAMP && !RV[j]) VAL[j] = Math.max(1.1, Math.floor(VAL[j]) - 0.9);
  }
}
function buildRoads() {                          // the mountain path, and dirt tracks through the wheat country (the studio's proposed roads are left off)
  for (const R of WORLD.ROADS) {
    if (R.kind === 'lamp' || R.note) continue;                     // the lamp road is drawn by its lamps
    let n = 0;
    trace(R.pts, (i) => {
      if (LANDM[i] !== 1) return;
      if (R.kind === 'path') { if ((n++ % 3) < 2) { MATB[i] = MAT_RAMP; VAL[i] = 10.1; FORM[i] = 0; } return; }   // the mountain path: a pale dotted thread through the pass
      if (FORM[i]) return;
      if (MATB[i] === MAT_WHEAT) VAL[i] = 6.1; else if (MATB[i] === MAT_RAMP) VAL[i] = Math.min(9.1, Math.floor(VAL[i]) + 1.1);   // polish 3: a pale tan track (the dark one read as a crack)
    });
  }
}

// ---------------------------------------------------------------- sky, clouds, cloud shadows
function buildSky() {
  SKYV = new Float32Array(W * HY); GLOW = new Float32Array(W * HY);
  for (let y = 0; y < HY; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, dx = x - SUNX, dy = y - SUNY, d2 = dx * dx + dy * dy;
    SKYV[i] = band(skyAt(x, y), 4);
    GLOW[i] = 3.3 * Math.exp(-d2 / 640) + 1.9 * Math.exp(-d2 / 6200);
  }
  DYN.stars.length = 0;
  const rng = mulberry32(77);
  for (let k = 0; k < 40; k++) { const x = 3 + Math.floor(rng() * (W - 6)), y = 3 + Math.floor(rng() * rng() * HY * 0.55); DYN.stars.push({ x, y, ph: rng() * 6.28, big: rng() < 0.2 }); }
}
// clouds: clusters of puffs become a density field; the shade is how the density changes toward the sun (still-water genClouds).
// Two large masses high up, lit from below by the low sun, and three thin dawn streaks near the horizon away from the disc.
function buildClouds() {
  CLV = new Float32Array(CW * HY);
  const rng = mulberry32(2207);
  const top = Math.round(HY * 0.6);
  const clusters = [ // cx, cy, width, height, puffs, rmin, rmax, stretch (1 = cumulus, more = a flat streak). Polish 2: sized for the thin sky
    [238, 0.36 * HY, 180, 0.26 * HY, 32, 6, 13, 1.8],
    [520, 0.28 * HY, 150, 0.22 * HY, 24, 5, 11, 1.8],
    [180, HY - 11, 60, 2, 6, 2, 3, 5],
    [330, HY - 17, 90, 2, 8, 2, 3.2, 5],
    [446, HY - 8, 70, 2, 6, 2, 3, 5],
  ];
  const puffs = [];
  for (const [cx, cy, cw, chh, n, r0, r1, st] of clusters) for (let k = 0; k < n; k++) {
    const u = rng() * 2 - 1, v = rng() * 2 - 1, r = lerp(r0, r1, rng()) * (1 - 0.3 * Math.abs(u));
    puffs.push([cx + u * cw * 0.5, cy + v * chh * 0.5 - r * 0.2, r, cy + chh * 0.5, 1 / st]);
  }
  const dens = new Float32Array(CW * HY);
  for (let y = 0; y < HY; y++) for (let x = 0; x < CW; x++) {
    let d = 0;
    for (let k = 0; k < puffs.length; k++) {
      const p = puffs[k];
      let dx = x - p[0]; if (dx > CW / 2) dx -= CW; else if (dx < -CW / 2) dx += CW;
      dx *= p[4];
      const dy = (y - p[1]) * 1.5, q = (dx * dx + dy * dy) / (p[2] * p[2]);
      if (q < 1) { let kk = 1 - q; kk *= kk; if (y > p[3]) kk *= Math.exp(-(y - p[3]) / 2); d += kk; }
    }
    if (d > 0.02) d += (pnoise(x * 0.06, y * 0.09, 38, 4096, 11) - 0.5) * 0.26 + (pnoise(x * 0.2, y * 0.2, 128, 4096, 23) - 0.5) * 0.08;
    dens[y * CW + x] = d;
  }
  shadeClouds(dens, top);
}
function shadeClouds(dens, top) {
  const T = 0.3;
  const sample = (x, y) => { x = ((Math.round(x) % CW) + CW) % CW; y = Math.round(y); return y < 0 || y >= HY ? 0 : dens[y * CW + x]; };
  for (let y = 0; y < HY; y++) for (let x = 0; x < CW; x++) {
    const d = dens[y * CW + x];
    if (d <= T) continue;
    let lx = SUNX - x, ly = SUNY + 6 - y;
    const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
    const shade = d - sample(x + lx * 4, y + ly * 4), e = d - T;
    const low = y > HY - 22;                                         // a dawn streak near the horizon: darker than the bright sky behind it
    let f = (low ? 5.2 : 4.4) + clamp(shade * 4, -1.8, 1.6);
    if (e < 0.07 && shade > 0) f = 9.6;                              // the thin edge that faces the sun
    else if (e < 0.05) f -= 0.8;
    let rim = e < 0.09 && shade > 0;
    if (sample(x, y + 1) <= T) { f = Math.max(f, low ? 9.1 : 8.6); rim = true; }   // undersides catch the low sun: a crisp lit line
    else if (sample(x, y - 2) <= T) f = Math.min(f, 4.0);           // tops are in their own shade
    if (!rim) f -= clamp((top - y) / top, 0, 1) * 1.0;              // higher is darker
    CLV[y * CW + x] = Math.max(1.2, Math.floor(f) + 0.1);           // flat steps: the sky glow moves them, not the bake
  }
}
function buildSeaStreaks() {                      // a 256 x 256 wrapping field of short flat streaks: the calm shimmer of open water
  SEAT = new Uint8Array(256 * 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) SEAT[(y << 8) | x] = pnoise(x * 24 / 256, y * 150 / 256, 24, 150, 205) > 0.79 ? 1 : 0;   // polish 2: a little more shimmer (the cloud shadows are gone)
}

// ---------------------------------------------------------------- places: hand-drawn sprites on the relief
let PUTV = 9;                                    // the v of the thing being drawn: nearer ground hides it (9 = never hidden)
function put(x, y, c) {
  if (x < 0 || x >= W || y <= HY || y >= H) return;
  const i = y * W + x;
  if (PV[i] > PUTV + 0.012) return;              // a ridge to the south stands in front of it
  SPI.push(i); SPC.push(c);
}
const STYLE = {
  built: { body: 1, rim: 10, rim2: 8 },          // castles, mills, the city: dark walls, lit on the sun side
  mill: { body: 1, rim: 11, rim2: 10 },          // polish 3: the windmills in the focus carry the brightest lit edge
  stone: { body: 2, rim: 9, rim2: 6 },           // spires, hands, standing stones, the machine
  wreck: { body: 1, rim: 8, rim2: 5 },           // clockwork and wreckage: duller, dark against the pale ash
  dark: { body: 2, rim: 2, rim2: 2 },
  city: { body: ICE2, rim: 11, rim2: ICE },     // polish 2: the mages' city is pale stone catching the dawn, unlike the dark castles
};
const CH = { w: LAMP, f: GOLD, k: 0, l: 8, p: 11, o: LAMP, s: 4, c: 11, C: ICE, b: ICE2, L: ICE, m: ICE2, d: 4 };
let SHM = null;
function stamp(rows, cx, by, st, key, flip, noShadow) {
  const h = rows.length, w = rows[0].length, x0 = cx - (w >> 1), y0 = by - h + 1;
  const at = (i, j) => (j < 0 || j >= h || i < 0 || i >= w) ? '.' : rows[j][flip ? w - 1 - i : i];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = at(i, j);
    if (ch === '.') continue;
    const c = ch === '#' ? (at(i - 1, j) === '.' ? st.rim : at(i, j - 1) === '.' ? st.rim2 : st.body) : CH[ch];
    put(x0 + i, y0 + j, c);
    if (ch === 'w') DYN.win.push({ i: (y0 + j) * W + x0 + i, ph: hash2(x0 + i, y0 + j, 3), city: key === 'eastern_city' });
    if (!noShadow) {                                               // the shadow falls to the south-east, longer for taller parts
      const up = h - 1 - j, gx = x0 + i + 1 + Math.round(up * 0.95), gy = by + Math.round(up * 0.2);
      if (gx >= 0 && gx < W && gy < H) SHM[gy * W + gx] = 1;
    }
  }
  const r = { x0: x0 - 1, y0: y0 - 1, x1: x0 + w, y1: by + 1, key };
  if (key) { OBST.push(r); if (!PLACES[key]) PLACES[key] = r; else { const p = PLACES[key]; p.x0 = Math.min(p.x0, r.x0); p.y0 = Math.min(p.y0, r.y0); p.x1 = Math.max(p.x1, r.x1); p.y1 = Math.max(p.y1, r.y1); } }
  return { x0, y0, w, h };
}
// polish 2: every castle stands on its own hill: a low dome, lit on the sun side with a bright rim, shaded on the far side.
// The dome's foot is at row y; its top (where the sprite stands) is ry rows higher. Returns the row of the top.
function mound(x, y, rx, ry) {
  ry = ry || 3;
  for (let gy = -ry - 1; gy <= 1; gy++) for (let gx = -rx - 1; gx <= rx + 1; gx++) {
    const yy = gy + 1, q = (gx * gx) / (rx * rx) + (yy < 0 ? (yy * yy) / (ry * ry) : 0), i = (y + gy) * W + x + gx;
    if (q >= 1 || x + gx < 0 || x + gx >= W || y + gy <= HY || y + gy >= H || LANDM[i] !== 1 || MATB[i] !== MAT_RAMP) continue;
    let val = gx < -rx * 0.35 ? 9.1 : gx < rx * 0.4 ? 8.1 : 6.1;   // a hilltop a step above the plain: lit, sunny, lee
    if (q > 0.62 && yy < 0) val = gx < 0 ? 10.1 : 5.1;            // the outline: lit rim toward the sun, dark on the lee
    else if (yy >= 1 && q > 0.35) val = 6.1;                       // the foot of the hill in its own shade
    VAL[i] = val; FORM[i] = 0;
  }
  return y - ry + 1;
}
function stormCloud(cx, cy, seed, key) {          // a storm that never leaves its valley: a dark knot of cloud, lit on its sun side, rain under it
  const rng = mulberry32(seed), puffs = [];
  for (let k = 0; k < 14; k++) { const q = rng() * 2 - 1; puffs.push([cx + q * 9, cy - 2 - (1 - q * q) * (4 + 8 * rng()) - rng() * 2, 3.4 + rng() * 3.0]); }
  const den = (x, y) => { let d = 0; for (const p of puffs) { const dx = x - p[0], dy = (y - p[1]) * 1.0, q = (dx * dx + dy * dy) / (p[2] * p[2]); if (q < 1) d += (1 - q) * (1 - q); } return y > cy + 1 ? d * Math.exp(-(y - cy - 1) * 1.2) : d; };
  const T = 0.28;
  for (let y = cy - 19; y <= cy + 5; y++) for (let x = cx - 20; x <= cx + 20; x++) {
    const d = den(x, y);
    if (d <= T) continue;
    const edge = den(x - 1, y - 1) <= T && (den(x - 1, y) <= T || den(x, y - 1) <= T), lee = d - den(x - 2, y - 2);
    put(x, y, edge ? 9 : den(x, y + 1) <= T ? 0 : lee > 0.15 ? 6 : lee > 0.02 ? 4 : 2);
    if (den(x, y + 1) <= T && (x & 1) === 0) { const len = 2 + ((hash2(x, 1, seed) * 5) | 0); for (let r = 1; r <= len; r++) put(x, y + r, 3); }   // rain: thin vertical streaks
    const gy = y + 11, gx = x + 6;
    if (gx >= 0 && gx < W && gy < H) SHM[gy * W + gx] = 1;
  }
  const r = { x0: cx - 16, y0: cy - 15, x1: cx + 16, y1: cy + 12, key };
  OBST.push(r); PLACES[key] = r;
  DYN.storms.push({ x: cx, y: cy + 3, ph: rng() });
}
function placeOne(p, rng) {
  const x = px(p.u), y = py(p.u, p.v);
  PUTV = p.v;
  switch (p.type) {
    case 'castle': { const big = p.variant === 0, top = mound(x, y + (big ? 4 : 2), (ART.castles[p.variant][0].length >> 1) + (big ? 9 : 3), big ? 7 : 3); stamp(ART.castles[p.variant], x, top, STYLE.built, p.key); break; }
    case 'city': placeCity(p, x, y); break;
    case 'spires': mound(x, y, 8); stamp(ART.spires, x, y, STYLE.stone, p.key); break;
    case 'stone_hands': mound(x, y, 12); stamp(ART.hand, x - 5, y, STYLE.stone, p.key); stamp(ART.hand, x + 5, y + 1, STYLE.stone, p.key, true); break;
    case 'windmill': { const s = stamp(ART.mill, x, y, STYLE.mill, p.key); DYN.mills.push({ x: s.x0 + 2, y: s.y0 - 1, ph: p.u * 40 }); const r = PLACES[p.key]; r.y0 -= 4; r.x0 -= 2; r.x1 += 2; break; }
    case 'standing_stone': stamp(ART.stone, x, y, STYLE.dark, p.key); break;   // polish 2: dark uprights, readable on the gold
    case 'clockwork_tower': stamp(ART.clockwork[p.variant], x, y, STYLE.wreck, p.key); break;
    case 'wreckage': stamp(ART.wreckage[Math.floor(rng() * 3)], x, y, STYLE.wreck, null); break;
    case 'cavern': stamp(ART.cavern, x - 7, y - 5, STYLE.stone, p.key, false, true); break;
    case 'lone_mountain': { PUTV = p.v + 0.03; stamp(ART.cog, x + 1, py(p.u, p.v + 0.022) + 1, STYLE.stone, p.key, false, true); break; }
    case 'isles': stamp(ART.ship, px(p.u - 0.035), py(p.u - 0.035, p.v - 0.03) + 1, STYLE.built, p.key, false, true); break;
    case 'crystal_grove': placeGrove(p, rng); break;
    case 'storm_valley': stormCloud(x, y - 5, 400 + Math.round(p.u * 100), p.key); break;
    case 'flower_field': placeFlowers(p, rng); break;
    case 'volcano': placeEmbers(p); break;
    case 'dark_forest': placeEyes(p, rng); break;
    case 'swamp': placeReeds(p); break;
    default: break;
  }
}
function placeCity(p, x, y) {                     // the lit city warms the ground round it; lamps line the road west to the border river
  for (let gy = -12; gy <= 12; gy++) for (let gx = -32; gx <= 32; gx++) { const q = (gx * gx) / (32 * 32) + (gy * gy) / (12 * 12), i = (y + gy) * W + x + gx; if (q < 1 && LANDM[i] === 1 && MATB[i] === MAT_RAMP && !FORM[i]) VAL[i] = Math.max(VAL[i], Math.floor(VAL[i]) + (q < 0.35 ? 1 : 0) + 0.1); }
  const top = mound(x, y + 3, 19, 5);                              // polish 2: the city stands on its own broad hill
  stamp(ART.city, x, top + 1, STYLE.city, p.key);
  const road = WORLD.ROADS.find(r => r.kind === 'lamp');
  if (!road) return;
  let last = -99;
  trace(road.pts, (i, lx, ly) => { if (lx > x - 20 || Math.abs(lx - last) < 4) return; last = lx; put(lx, ly - 1, LAMP); put(lx, ly, 1); DYN.win.push({ i: (ly - 1) * W + lx, ph: hash2(lx, ly, 8), city: true }); });
}
function placeGrove(p, rng) {                     // crystal trees on their frosted glade
  const trees = [];
  for (let k = 0; k < 160 && trees.length < 10; k++) {
    const a = rng() * 6.28, r = Math.sqrt(rng()) * 0.03, u = p.u + Math.cos(a) * r, v = p.v + Math.sin(a) * r * 0.8, tx = px(u), ty = py(u, v);
    if (hg(u, v) > SEA + 0.004 && !trees.some(q => Math.abs(q[0] - tx) < 4 && Math.abs(q[1] - ty) < 5)) trees.push([tx, ty, Math.floor(rng() * 3), v]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [tx, ty, k, tv] of trees) { PUTV = tv; const s = stamp(ART.crystalTree[k], tx, ty, STYLE.dark, p.key); DYN.spark.push({ i: s.y0 * W + s.x0 + (s.w >> 1), ph: rng() * 6.28 }); }
}
function placeFlowers(p, rng) {                   // the colossal Starblooms: tall stems, cream heads
  const fl = [];
  for (let k = 0; k < 8; k++) { const a = rng() * 6.28, r = (0.25 + 0.75 * Math.sqrt(rng())) * 0.034, u = p.u + Math.cos(a) * r * 1.2, v = p.v + Math.sin(a) * r * 0.7; fl.push([u, v, rng()]); }
  fl.sort((a, b) => a[1] - b[1]);
  for (const [u, v, q] of fl) {
    PUTV = v;
    const fx = px(u), fy = py(u, v), stem = 2 + Math.floor(q * 4), head = q > 0.35 ? ART.bloom : ART.bloomSmall;
    for (let k = 0; k < stem; k++) put(fx, fy - k, 3);
    stamp(head, fx, fy - stem, STYLE.stone, p.key);
  }
}
function placeEmbers(p) {                         // polish 2: the glow sits in the crater only: a hot core and a thin ember lip, breathing
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const pk of WORLD.PEAKS) if (pk.key.indexOf('fire_dragon') === 0) {
    x0 = Math.min(x0, px(pk.u - pk.r)); x1 = Math.max(x1, px(pk.u + pk.r)); y0 = Math.min(y0, py(pk.u, pk.v) - 2); y1 = Math.max(y1, py(pk.u, pk.v + pk.r));
    if (VOLC_CRATER.indexOf(pk.key) < 0) continue;
    const ex = px(pk.u), ey = py(pk.u, pk.v) + 1, k = pk.key === 'fire_dragon_1' ? 1 : 0.7;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx * 0.75, dy * 1.8) / k;
      if (d < 1.9) DYN.ember.push({ i: (ey + dy) * W + ex + dx, d, ph: pk.u * 90 });
    }
  }
  PLACES[p.key] = { x0, y0, x1, y1, key: p.key };
}
function placeEyes(p, rng) {                      // paired eyes, deep inside the dark canopy
  let n = 0;
  for (let k = 0; k < 500 && n < 9; k++) {
    const u = p.u + (rng() * 2 - 1) * 0.07, v = p.v + (rng() * 2 - 1) * 0.08, ex = px(u), ey = py(u, v), i = ey * W + ex;
    if (WORLD.forestType[WORLD.cell(u, v)] !== F.EYES || FORM[i] !== 2 || FORM[i + 2] !== 2 || FORM[i - 2] !== 2 || FORM[i + W] !== 2 || FORM[i - W] !== 2) continue;
    if (DYN.eyes.some(e => Math.abs(e.x - ex) < 9 && Math.abs(e.y - ey) < 7)) continue;
    DYN.eyes.push({ x: ex, y: ey, i, ph: rng() * 20, per: 6 + rng() * 6 }); n++;
  }
}
function placeReeds(p) {                          // reed tufts on the north rims of the swamp pools
  const x0 = px(p.u - 0.07), x1 = px(p.u + 0.07), y0 = py(p.u, p.v - 0.06), y1 = py(p.u, p.v + 0.06);
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x;
    if (x < 1 || x >= W - 2 || y <= HY + 4 || y >= H - 1 || POOL[i] || POOL[i - W] || !POOL[i + W] || hash2(x, y, 77) > 0.3) continue;
    const r = ART.reeds[n++ % 3];
    for (let j = 0; j < r.length; j++) for (let q = 0; q < r[j].length; q++) if (r[j][q] === '#') put(x - 1 + q, y - r.length + 1 + j, 2);
  }
}
function placeAll() {
  SPI = []; SPC = []; PLACES = {}; OBST = [];
  for (const k in DYN) if (k !== 'stars') DYN[k].length = 0;
  SHM = new Uint8Array(W * H);
  const pois = WORLD.POIS.slice().sort((a, b) => a.v - b.v);
  const rng = mulberry32(905);
  for (const p of pois) placeOne(p, rng);
  PUTV = 9;
  // sprite shadows go into the ground value, so they dither and band like everything else
  const cover = new Uint8Array(W * H);
  for (let k = 0; k < SPI.length; k++) cover[SPI[k]] = 1;
  for (let i = 0; i < W * H; i++) if (SHM[i] && !cover[i] && LANDM[i] === 1) VAL[i] = MATB[i] === MAT_RAMP ? Math.max(Math.round(VAL[i]) - 1.9, 3.1) : Math.max(Math.round(VAL[i]) - 0.9, 0.1);   // flat steps: a shadow never dithers
}
function buildGlints() {                          // a calm glitter: short dashes that come and go, thick only on the sun's road
  const gi = [], gp = [], gc = [];
  for (let y = HY + 2; y < H - 1; y++) for (let x = 1; x < W - 3; x++) {
    const i = y * W + x;
    if (LANDM[i] || LANDM[i + 1] || LANDM[i - 1] || MATB[i] !== MAT_RAMP) continue;
    const dy = y - HY, wdt = 1.6 + dy * 0.10;                       // polish 3: a narrow glint path from the horizon down to the coast
    const path = dy < 64 ? Math.exp(-((x - SUNX) * (x - SUNX)) / (wdt * wdt)) * (1 - dy / 72) : 0;
    if (hash2(x, y, 91) > 0.002 + path * 0.26) continue;
    gi.push(i); gp.push(hash2(x, y, 92) * 6.28);
    gc.push(path > 0.25 ? 11 : clamp(Math.floor(VAL[i]) + 2, 0, 9));
  }
  GLN = gi.length; GLI = Int32Array.from(gi); GLP = Float32Array.from(gp); GLC = Uint8Array.from(gc);
  SEAM = new Uint8Array(W * H); ROWSPD = new Float32Array(H);
  const wi = [], wp = [], wc = [], wg = [];
  for (let y = HY + 1; y < H; y++) {
    ROWSPD[y] = 1.2 + 2.6 * hash2(y, 7, 44);                        // every row of water drifts at its own pace
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!LANDM[i] && MATB[i] === MAT_RAMP && y > HY + 8) SEAM[i] = 1;
      if (MATB[i] === MAT_WHEAT && LANDM[i] === 1) { wi.push(i); wp.push(x * 0.11 + y * 0.07 + 0.6 * Math.sin(y * 0.09)); wc.push(MLUT[MAT_WHEAT * 12 + clamp(Math.floor(VAL[i]) + 1, 0, 6)]); wg.push(hash2(x, y >> 2, 71) < 0.16 ? 1 : 0); }
    }
  }
  WHN = wi.length; WHI = Int32Array.from(wi); WHP = Float32Array.from(wp); WHC = Uint8Array.from(wc); WHG = Uint8Array.from(wg);
}
// Where each label sits: [u, v (at sea level), lines]. Placed by hand, by eye, so no label covers the place it names or
// another label (polish 2: world coordinates, so the labels follow the map when the frame height changes).
// Where each label sits: [u, v (at sea level), lines]. Placed by hand, by eye, so no label covers the place it names or
// another label (polish 2: world coordinates, so the labels follow the map when the frame height changes).
const LABEL_AT = {
  unknown_sea: [0.6704, 0.0621],
  northern_lands: [0.7841, 0.1035, ["THE NORTHERN","LANDS"]],
  verdant_reach: [0.2317, 0.4347, ["THE VERDANT","REACH"]],
  eastern_kingdom: [0.7683, 0.5351, ["THE EASTERN","KINGDOM"]],
  mage_kingdoms: [0.7083, 0.8904, ["THE MAGE","KINGDOMS"]],
  still_water: [0.0581, 0.3344, ["Still","Water"]],
  mountain_path: [0.2223, 0.2483, ["the mountain","path"]],
  starbloom_fields: [0.4432, 0.3010],
  stone_hands: [0.4590, 0.4243],
  colossal_spires: [0.2475, 0.4891, ["Colossal","Spires"]],
  castle_order: [0.2601, 0.5685, ["Castle of","the Order"]],
  wheat_country: [0.5252, 0.4640, ["the wheat","country"]],
  forest_of_eyes: [0.1339, 0.6019, ["Forest","of Eyes"]],
  cavern_of_giants: [0.1844, 0.7524, ["Cavern of","Giants"]],
  green_valleys: [0.1591, 0.9092, ["the green","valleys"]],
  toad_swamp: [0.4369, 0.9196],
  fire_dragon_peaks: [0.7146, 0.7064],
  buried_machine: [0.9040, 0.7796, ["Mount of the","Buried Machine"]],
  silent_battlefield: [0.9040, 0.3971, ["Silent","Battlefield"]],
  artifact_isles: [0.9103, 0.8737],
};
function buildLabels() {
  const items = [];
  for (const l of WORLD.LABELS) {
    const major = l.rank === 'major', at = LABEL_AT[l.key];
    const it = { key: l.key, text: l.text, rank: major ? 1 : 2, cx: Math.round(sx(l.u)), cy: Math.round(sy(l.v, surf(l.u, l.v))), rect: l.poi ? PLACES[l.poi] : null, poi: l.poi, yMin: HY };
    if (at) { it.fixed = true; it.cx = Math.round(sx(at[0])); it.cy = Math.round(YM + yv(at[1])); it.lines = at[2] || [l.text]; }
    items.push(it);
  }
  LBL = LAB.layout(items, OBST, W, H, TXT, { outline: 0, major: 11, minor: 10 });
}

// ---------------------------------------------------------------- frame
function bake() {
  for (let y = HY; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    BASE[i] = MLUT[MATB[i] * 12 + clamp(dith(VAL[i], x, y), 0, 11)];
  }
}
function drawSky(t) {
  const off = Math.floor(t * 1.1) % CW;
  for (let y = 0; y < HY; y++) {
    const row = y * W, crow = y * CW;
    for (let x = 0; x < W; x++) {
      let cx = x - off; if (cx < 0) cx += CW;
      const i = row + x, c = CLV[crow + cx];
      IDX[i] = clamp(dith(c > 0 ? c + GLOW[i] * 0.5 : SKYV[i], x, y), 0, 11);
    }
  }
  for (const s of DYN.stars) {                                     // the last stars of the night, high up and away from the sun
    let cx = s.x - off; if (cx < 0) cx += CW;
    const i = s.y * W + s.x;
    if (CLV[s.y * CW + cx] > 0 || SKYV[i] > 3.6) continue;
    const tw = Math.sin(t * 1.3 + s.ph);
    if (tw > -0.5) IDX[i] = s.big && tw > 0.3 ? 9 : 6;
  }
  for (let dx = -40; dx <= 40; dx++) { const i = (HY - 1) * W + SUNX + dx, a = Math.abs(dx); IDX[i] = Math.max(IDX[i], a < 7 ? 11 : a < 22 ? 10 : 9); }   // the bright line where the sea meets the sky under the sun, tapering out
  const r2 = (SUNR + 0.4) * (SUNR + 0.4);
  for (let dy = -SUNR; dy <= SUNR; dy++) for (let dx = -SUNR; dx <= SUNR; dx++) if (dx * dx + dy * dy <= r2) IDX[(SUNY + dy) * W + SUNX + dx] = 11;   // the disc: a solid core of the lightest colour
}
function drawTerrain(t) {
  // polish 2: no cloud shadows (they read as holes in the land); only the shimmer streaks on open water move
  for (let y = HY; y < H; y++) {
    const row = y * W, trow = (y & 255) << 8, tx = Math.floor(t * ROWSPD[y]);
    for (let x = 0; x < W; x++) {
      const i = row + x, st = SEAM[i] & SEAT[trow | ((x - tx) & 255)];
      IDX[i] = st === 0 ? BASE[i] : MLUT[MATB[i] * 12 + clamp(dith(VAL[i] + 0.9, x, y), 0, 11)];
    }
  }
  for (let k = 0; k < WHN; k++) if (WHG[k] && Math.sin(WHP[k] - t * 1.3) > 0.93) IDX[WHI[k]] = WHC[k];   // wind crossing the wheat: a moving band of short glints along the strips (polish 2: the long gust lines read as roads)
}
function drawLife(t) {
  for (let k = 0; k < GLN; k++) if (Math.sin(t * 1.7 + GLP[k]) > 0.45) { const i = GLI[k]; IDX[i] = GLC[k]; IDX[i + 1] = GLC[k]; }
  for (let k = 0; k < LAKEG.length; k++) { const i = LAKEG[k], q = Math.sin(t * 0.8 + k * 2.1); IDX[i] = q > -0.3 ? 11 : 9; if (q > 0.2) IDX[i + 1] = 10; }   // one short glint on each lake
  for (let k = 0; k < SPI.length; k++) IDX[SPI[k]] = SPC[k];
  for (const w of DYN.win) IDX[w.i] = w.city && hash2((w.ph * 977) | 0, Math.floor(t * 3 + w.ph * 9), 5) < 0.12 ? GOLD : LAMP;
  for (const e of DYN.ember) {                                     // the crater glow breathes: the rings grow and shrink a little
    const s = 0.5 + 0.5 * Math.sin(t * 0.9 + e.ph), d = e.d - s * 0.45;
    if (d < 0.5) IDX[e.i] = LAMP; else if (d < 1.5) IDX[e.i] = EMBER;
  }
  for (const m of DYN.mills) {                                     // the sails turn in two frames
    const sp = ART.sails[((t * 1.4 + m.ph) | 0) & 1];
    for (let j = 0; j < 7; j++) for (let q = 0; q < 7; q++) if (sp[j][q] === '#') { const x = m.x - 3 + q, y = m.y - 3 + j; if (x >= 0 && x < W && y > HY && y < H) IDX[y * W + x] = 1; }
  }
  for (const e of DYN.eyes) { const q = (t + e.ph) % e.per; if (q > 1.4 && !(q > 3.4 && q < 3.6)) { IDX[e.i] = 10; IDX[e.i + 2] = 10; } }
  for (const s of DYN.spark) if (Math.sin(t * 2.1 + s.ph) > 0.82) IDX[s.i] = 11;
  for (const s of DYN.storms) {
    const q = (t * 0.31 + s.ph) % 1;
    if (q < 0.03 || (q > 0.05 && q < 0.065)) { let x = s.x + ((s.ph * 7) | 0) - 3; for (let k = 0; k < 6; k++) { x += hash2(k, Math.floor(t * 0.31 + s.ph), 9) < 0.5 ? -1 : 1; IDX[(s.y + k) * W + x] = 11; } }
  }
}
function drawLabels() {
  const R = LBL.rank, C = LBL.col, lv = G.labels;
  for (let i = HY * W, n = W * H; i < n; i++) if (R[i] && R[i] <= lv) IDX[i] = C[i];
}
function init() { buildHeight(); buildSeaStreaks(); }
function setH(h) {
  H = clamp(h | 0, 520, 700);
  // polish 2: the sky is a thin band (12.5%); the north coast (v 0.085) sits COAST_GAP rows under the horizon and the
  // south coast (v 0.965) SOUTH_GAP rows above the bottom edge. KV follows, so the land takes the height of the frame.
  HY = Math.round(H * SKY); SUNY = HY - 21;
  const top = HY + COAST_GAP, bot = H - SOUTH_GAP;
  KV = (bot - top - LENS * (sstep(LV0, LV1, 0.965) - sstep(LV0, LV1, 0.085))) / (0.965 - 0.085);
  KVMAX = KV + LENS * 1.5 / (LV1 - LV0); E = KV * 0.14;
  YM = Math.round(top - yv(0.085));
  const n = W * H;
  PU = new Float32Array(n); PV = new Float32Array(n); VAL = new Float32Array(n); MATB = new Uint8Array(n);
  REL = new Float32Array(n); LANDM = new Uint8Array(n); FORM = new Uint8Array(n); POOL = new Uint8Array(n);
  BASE = new Uint8Array(n); IDX = new Uint8Array(n);
  buildVisibility(); buildSky(); buildClouds(); buildTerrain(); placeAll(); bake(); buildGlints(); buildLabels();
}
function setOut(buf) { OUT32 = buf; }
function setLabels(on) { G.labels = on === true ? 2 : (on | 0); }
function update(dt) { G.t += dt; }
function render() {
  const t = G.t;
  drawSky(t); drawTerrain(t); drawLife(t);
  if (G.labels) drawLabels();
  if (OUT32) for (let i = 0, n = W * H; i < n; i++) OUT32[i] = PAL[IDX[i]];
}
const API = { init, setH, setOut, update, render, setLabels, labels0: () => setLabels(0), labels1: () => setLabels(1), labels2: () => setLabels(2), G, W, PALHEX, get H() { return H; }, get debug() { return { LBL, PLACES, OBST, HY, YM, uAtX: x => U0 + x / SX, vAtRow: y => { let a = -0.2, b = 1.2; for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if (YM + yv(m) < y) a = m; else b = m; } return (a + b) / 2; } }; } };
if (!IS_BROWSER) module.exports = API; else window.MAP_B = API;
})();
