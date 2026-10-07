/* World map of the Verdant Reach, candidate B: TILTED RELIEF ATLAS.
   An oblique PARALLEL projection of the world data (no perspective): screen x = u * SX, screen y = YM + v * KV - height * E.
   Every screen column is marched from the south (near) to the north (far) with a y-buffer, so nearer ground
   overlaps farther ground and mountains stand up as shaded forms with crests and cast shadows. One light from
   the upper left: the low dawn sun sits in the strip of sky above the northern horizon. Portrait 320 x 568.
   Pattern: pixel-scenes skill. Static layers are baked once (setH); per frame only small motion:
   drifting clouds and their shadows, glints on the water, the city's windows, the ember glow, mill sails, eyes. */
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
// squeeze the in-between part of every step, so slow gradients (sea depth, sky, gentle hills) keep thin seams
function band(f, k) { const fl = Math.floor(f); return fl + clamp((f - fl - 0.5) * k + 0.5, 0, 1); }

// ---------------------------------------------------------------- palette
// MOOD: a cool green dawn. ONE family: two sibling 12-step ramps with the same value steps, the same three
// darkest colours (navy shadow) and the same lightest (cream light). AIR carries sky, sea, lakes, rock and snow
// (navy > teal > mint > cream); LAND carries the ground (navy > deep green > moss > straw > cream).
// Two small material ramps sit between the same ends (ash for the battlefield, gold for the wheat), plus five accents.
const RAMPS = {
  air:   ['#060b16', '#0b1526', '#102238', '#16304a', '#1d405b', '#27526b', '#34667a', '#47808a', '#629a99', '#86b5a8', '#b5d0b6', '#efe9b8'],
  land:  ['#060b16', '#0b1526', '#102238', '#14323c', '#1a4540', '#235847', '#2f6c4c', '#448252', '#63985c', '#8fb06c', '#c2cb8c', '#efe9b8'],
  ash:   ['#060b16', '#0b1526', '#102238', '#1d2a3c', '#2c3a48', '#3f4c56', '#566366', '#70807c', '#909f93', '#b5d0b6', '#b5d0b6', '#efe9b8'],
  wheat: ['#060b16', '#0b1526', '#102238', '#14323c', '#1a4540', '#4d6234', '#75793a', '#9c8f40', '#c0a84c', '#dcc468', '#efdc90', '#efe9b8'],
};
const ACCENTS = { sun: '#fffbe6', lamp: '#ffc15a', lampDeep: '#f08a35', ember: '#ff6a32', emberDeep: '#b8321e' };
const PAL = new Uint32Array(256), PALHEX = [];
const LUT = {}, ACC = {};
(function buildPalette() {
  const slot = h => { let i = PALHEX.indexOf(h); if (i < 0) { i = PALHEX.length; PALHEX.push(h); PAL[i] = (0xff000000 | (parseInt(h.slice(5, 7), 16) << 16) | (parseInt(h.slice(3, 5), 16) << 8) | parseInt(h.slice(1, 3), 16)) >>> 0; } return i; };
  for (const k in RAMPS) LUT[k] = Uint8Array.from(RAMPS[k].map(slot));
  for (const k in ACCENTS) ACC[k] = slot(ACCENTS[k]);
})();
const MAT_AIR = 0, MAT_LAND = 1, MAT_ASH = 2, MAT_WHEAT = 3;
const MLUT = new Uint8Array(4 * 12);
[LUT.air, LUT.land, LUT.ash, LUT.wheat].forEach((l, k) => MLUT.set(l, k * 12));
const AIR = LUT.air, LAND = LUT.land;

// ---------------------------------------------------------------- composition
const U0 = -0.02, SX = W / 1.04;               // the view shows u from -0.02 to 1.02
const KV = 300;                                // screen rows per unit of v (plan oblique: the map keeps its shape, heights lift straight up)
const E = 54;                                  // screen rows per unit of height: the relief
const SEA = WORLD.SEA, N = WORLD.N, F = WORLD.FOREST;
let HY = 170, YM = 236;                        // horizon row; row of v = 0 at sea level
const SUNX = 84, SUNR = 8; let SUNY = 142;     // the low sun over the Unknown Sea, upper left
const LX = -0.78, LY = -0.16, LZ = 0.61;       // direction TO the light: west by north, a third of the way up
const SHADE_Z = 0.30;                          // slope exaggeration for shading
const SHADOW_TAN = 4.6;                        // height the light ray climbs per unit of distance (sets shadow length)

// ---------------------------------------------------------------- buffers
const M = 1024;                                // fine height grid (world cells x 2, with crest detail)
let HG = null;
let PU = null, PV = null, VAL = null, MATB = null, BASE = null, IDX = null, OUT32 = null, REL = null, LANDM = null, FORM = null;
let SKYV = null, GLOW = null, CLV = null, CS = null, SEAT = null, SEAM = null, ROWSPD = null;
let WHI = null, WHP = null, WHC = null, WHN = 0;
const CW = 640;                                // the cloud layer is two screens wide and wraps
const G = { t: 0, labels: 0 };
let LBL = null;
let SPI = [], SPC = [];                        // baked sprite pixels: frame index, palette index
let PLACES = {}, OBST = [], RIPE = null, SHK = null;
const DYN = { win: [], ember: [], mills: [], eyes: [], spark: [], storms: [], stars: [] };
let GLI = null, GLP = null, GLC = null, GLN = 0;

function blur(A, n, r) {                        // separable box blur, three passes: close to a gaussian
  const B = new Float32Array(n * n), k = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let a = 0; for (let d = -r; d <= r; d++) a += A[j * n + clamp(i + d, 0, n - 1)]; B[j * n + i] = a * k; }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let a = 0; for (let d = -r; d <= r; d++) a += B[clamp(j + d, 0, n - 1) * n + i]; A[j * n + i] = a * k; }
  }
  return A;
}
function buildHeight() {
  HG = new Float32Array(M * M);
  const S = new Float32Array(M * M);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    let h = WORLD.heightAt((i + 0.5) / M, (j + 0.5) / M);
    if (h > 0.40) h = 0.40 + 0.55 * Math.pow((h - 0.40) / 0.55, 0.72);    // broad shoulders: massifs, not needles
    HG[j * M + i] = S[j * M + i] = h;
  }
  blur(S, M, 2);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    const u = (i + 0.5) / M, v = (j + 0.5) / M, k = j * M + i;
    let h = lerp(HG[k], S[k], sstep(0.33, 0.46, HG[k]));          // only the high ground is smoothed: coasts keep their shape
    if (h > SEA && !WORLD.lake[WORLD.cell(u, v)]) {
      const mt = WORLD.sample(WORLD.mountain, u, v);
      if (mt > 0.02) h += mt * ((0.42 - Math.abs(fbm(u * 30, v * 30, 7, 2) * 2 - 1)) * 0.085 + (0.4 - Math.abs(vnoise(u * 74, v * 74, 19) * 2 - 1)) * 0.03);   // ribs and gullies: facets for the light
    }
    HG[k] = h;
  }
  for (const pk of WORLD.PEAKS) if (pk.key.indexOf('fire_dragon') === 0) {      // the Fire-Dragon Peaks are open at the top
    const rc = pk.r * 0.24, i0 = Math.floor((pk.u - rc) * M), i1 = Math.ceil((pk.u + rc) * M), j0 = Math.floor((pk.v - rc) * M), j1 = Math.ceil((pk.v + rc) * M);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot((i + 0.5) / M - pk.u, (j + 0.5) / M - pk.v) / rc;
      if (d < 1) HG[j * M + i] -= 0.09 * (1 - d * d);
    }
  }
}
function hg(u, v) {                              // bilinear fine height; open sea outside the world
  if (u <= 0 || u >= 1 || v <= 0 || v >= 1) return 0;
  const x = clamp(u * M - 0.5, 0, M - 1.001), y = clamp(v * M - 0.5, 0, M - 1.001), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, k = yi * M + xi;
  return (HG[k] * (1 - fx) + HG[k + 1] * fx) * (1 - fy) + (HG[k + M] * (1 - fx) + HG[k + M + 1] * fx) * fy;
}
const surf = (u, v) => { const h = hg(u, v); return h < SEA ? SEA : h; };
const sx = u => (u - U0) * SX;
const sy = (v, h) => YM + v * KV - (h - SEA) * E;
const px = u => Math.floor(sx(u));
const py = (u, v) => Math.floor(sy(v, surf(u, v)));

// ---------------------------------------------------------------- the terrain pass: which point of the world each pixel shows
function buildVisibility() {
  PU.fill(0); PV.fill(-9);
  const dv = 0.25 / KV, vBot = (H - YM) / KV + 0.01, vTop = (HY - YM) / KV - 0.01;
  for (let x = 0; x < W; x++) {
    const u = U0 + (x + 0.5) / SX;
    let ybuf = H;
    for (let v = vBot; v > vTop && ybuf > HY; v -= dv) {
      const yi = Math.ceil(sy(v, surf(u, v)));
      if (yi < ybuf) {
        for (let y = ybuf - 1; y >= yi && y >= HY; y--) { PU[y * W + x] = u; PV[y * W + x] = v; }
        ybuf = yi;
      }
    }
  }
}

// ---------------------------------------------------------------- shading
function castShadow(u, v, h) {                   // 0 = open to the light, 1 = deep in shadow
  const len = Math.hypot(LX, LY), du = LX / len, dv = LY / len;
  let worst = 0;
  for (let s = 0.0022; s < 0.14; s += 0.0018) {
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
  return 0.9 * Math.exp(-d / 150) - 0.9 * sstep(250, 470, d);
}
function shadeLand(i, x, y, u, v) {
  const h = hg(u, v), c = WORLD.cell(u, v);
  const mt = WORLD.sample(WORLD.mountain, u, v), sn = WORLD.sample(WORLD.snow, u, v);
  const fo = WORLD.sample(WORLD.forest, u, v), wh = WORLD.wheat[c], ft = WORLD.forestType[c], reg = WORLD.region[c];
  const steep = sstep(0.05, 0.4, mt);
  const rel = lerp(dead(slopeLight(u, v, 3 / N), 0.06), slopeLight(u, v, 0.8 / N), steep);
  const L = clamp(lit(rel), -1, 1);
  const sh = castShadow(u, v, h);
  const md = mood(x, y);
  let mat = MAT_LAND, val, forest = 0;
  if (sn > 0.38 || (mt > 0.3 && h > WORLD.snowLineAt(v) - 0.07)) { mat = MAT_AIR; val = 9.5 + (L > 0 ? L * 1.6 : L * 4.0) - sh * 2.2; val = clamp(val, 5.2, 11.2); }
  else if (mt + (fbm(u * 50, v * 50, 9, 2) - 0.5) * 0.1 > 0.22) {
    mat = MAT_AIR; val = 5.0 + (h - 0.45) * 2.0 + (L > 0 ? L * 3.4 : L * 2.4) - sh * 1.4 + md * 0.5; val = clamp(val, 1.3, 9.2);
  } else if (WORLD.region[WORLD.cell(u + (fbm(u * 40, v * 40, 61, 2) - 0.5) * 0.03, v + (fbm(u * 40, v * 40, 62, 2) - 0.5) * 0.03)] === 12) {   // the Silent Battlefield: ash flats, a ragged edge
    mat = MAT_ASH; val = 5.1 - (fbm(u * 46, v * 46, 3, 2) > 0.56 ? 1 : 0) + L * 1.2 - sh + md;
  }
  else if (RIPE[WORLD.wheatField[c]]) {                              // the wheat country: strip fields, each field its own run
    const f = WORLD.wheatField[c], a = WORLD.wheatAngle[c];
    const strip = Math.floor((-(u * SX) * Math.sin(a) + (v * KV) * Math.cos(a)) / 3);
    val = (hash2(f, 1, 5) < 0.36 ? 9.1 : 8.1) - (hash2(f, 2, 5) < 0.6 && (strip & 1) ? 1 : 0) - sh * 1.6;
    mat = MAT_WHEAT;
  } else {
    val = 6.1 + (L > 0 ? L * 2.2 : L * 2.0) - sh * 1.6 + md;
    if (wh > 0.02) val = 6.1 - sh * 1.6 + md;                      // fallow fields and baulks: plain green
    if (ft === F.CRYSTAL && fo > 0.3) { mat = MAT_AIR; val = 6.1 + (fo > 0.62 ? 1 : 0) - sh; }                  // the sacred groves: a frosted glade
    else if (ft === F.SWAMP || reg === 9) {                          // the Toad Swamp: murky ground, dark pools
      const q = fbm(u * 70, v * 70, 3, 2);
      if (q > 0.6) { mat = MAT_AIR; val = 6.1; } else val = Math.min(val, 5.1) - (q < 0.42 ? 1 : 0);
    }
    else if (fo > 0.22 && ft !== F.CRYSTAL && ft !== F.NONE) {
      const pine = ft === F.PINE, eyes = ft === F.EYES;
      const cr = fo > 0.5 ? 0 : crown(x, y, 0.95, pine ? 2.6 : 3, 31);
      if (cr > -9) {
        const top = crown(x, y, eyes ? 0.16 : 0.42, pine ? 3 : 4, 57);          // a few crowns catch the light
        val = (eyes ? 3.1 : 4.1) + (top > 0.25 ? 1 : 0) + (L * 1.4 + (md - 0.2) * 0.6) * (0.3 + 0.7 * steep) - sh * 1.1;
        forest = 1;
      }
    }
  }
  MATB[i] = mat; VAL[i] = band(val, 3.5); REL[i] = rel; FORM[i] = forest;
}
function skyAt(x, y) {                           // continuous sky value: gradient + two glows + the horizon band
  const ty = y / HY, dx = x - SUNX, dy = y - SUNY, d2 = dx * dx + dy * dy, dyh = HY - y;
  const g = 2.3 * Math.exp(-d2 / (24 * 24)) + 1.6 * Math.exp(-(dx * dx * 0.36 + dy * dy) / (70 * 70)) + 1.7 * Math.exp(-(dyh * dyh) / 200) * (0.7 + 0.3 * Math.exp(-(dx * dx) / 20000));
  let v = 2.4 + 3.6 * Math.pow(ty, 1.5) + g;
  if (v > 9.6) v = 9.6 + (v - 9.6) * 0.35;
  return v;
}
function shadeSea(i, x, y, u, v) {
  const uc = clamp(u, 0.002, 0.998), vc = clamp(v, 0.002, 0.998);
  const out = Math.max(0, -u, u - 1, -v, v - 1);
  const dc = -WORLD.sample(WORLD.coast, uc, vc) + out + (fbm(u * 9, v * 9, 41, 2) - 0.5) * 0.018;   // how far out at sea
  let val = 5.1 - sstep(0.007, 0.013, dc) - sstep(0.034, 0.05, dc);                                // shallows, shelf, deep
  val += mood(x, y) * 0.8;
  const dy = y - HY;
  val = lerp(val, skyAt(x, HY - 1), Math.exp(-dy / 13));                                             // haze: the far sea melts into the sky
  val += 1.5 * Math.exp(-dy / 46) * Math.exp(-((x - SUNX) * (x - SUNX)) / (900 + dy * 60));          // the sun's road on the water
  MATB[i] = MAT_AIR; VAL[i] = band(Math.max(val, 1.1), 5);
}
function buildTerrain() {
  if (!RIPE) {                                                       // a field is ripe when most of it is: baulks vanish, fallow fields stay green
    const n = new Float32Array(65536), w = new Float32Array(65536);
    for (let c = 0; c < N * N; c++) { const f = WORLD.wheatField[c]; if (f) { n[f]++; w[f] += WORLD.wheat[c]; } }
    RIPE = new Uint8Array(65536);
    for (let f = 1; f < 65536; f++) if (n[f] && w[f] / n[f] > 0.5) RIPE[f] = 1;
  }
  for (let y = HY; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, u = PU[i], v = PV[i];
    const inside = u > 0 && u < 1 && v > 0 && v < 1;
    LANDM[i] = 0; FORM[i] = 0; REL[i] = 0;
    if (inside && (hg(u, v) >= SEA) && !WORLD.lake[WORLD.cell(u, v)]) { shadeLand(i, x, y, u, v); LANDM[i] = 1; }
    else if (inside && WORLD.lake[WORLD.cell(u, v)]) { MATB[i] = MAT_AIR; VAL[i] = 8.1; }
    else shadeSea(i, x, y, u, v);
  }
  // crests: where the ground behind is much farther north, the edge is a ridge line. Light it; shade what lies behind it.
  for (let y = HY + 1; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!LANDM[i] || PV[i - W] > PV[i] - 4 / KV) continue;
    VAL[i] += REL[i] > -0.02 ? 1 : 0;
    if (LANDM[i - W] && MATB[i - W] === MAT_LAND) VAL[i - W] -= 1;
  }
  // woods stand a little proud of the ground: a lit edge to the north-west, a shadow at their south-east foot
  for (let y = HY + 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!FORM[i]) continue;
    if (!FORM[i - 1] && !FORM[i - W] && LANDM[i - 1] === 1) VAL[i] += 1;
    if (!FORM[i + 1] && LANDM[i + 1] === 1 && MATB[i + 1] !== MAT_AIR) VAL[i + 1] = Math.min(VAL[i + 1], Math.max(VAL[i + 1] - 1, 4.1));
    if (!FORM[i + W] && LANDM[i + W] === 1 && MATB[i + W] !== MAT_AIR) VAL[i + W] = Math.min(VAL[i + W], Math.max(VAL[i + W] - 1, 4.1));
  }
  buildRoads();
  buildRivers();
}
function trace(pts, each) {                      // walk a world polyline one screen pixel at a time
  let lx = -1, ly = -1;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const steps = Math.ceil(Math.hypot((b[0] - a[0]) * SX, (b[1] - a[1]) * KV) * 2) + 1;
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
function buildRivers() {
  for (const R of WORLD.RIVERS) {
    trace(R.pts, (i, x, y, s) => {
      const k = Math.min(R.pts.length - 1, Math.round(s)), wk = R.w[k];
      if (LANDM[i] !== 1 || wk <= 0 || (!R.named && wk < 0.34)) return;
      MATB[i] = MAT_AIR; VAL[i] = R.named ? (wk > 0.5 ? 9.1 : 8.1) : 7.1; LANDM[i] = 2; FORM[i] = 0;
    });
  }
}
function buildRoads() {
  for (const R of WORLD.ROADS) {
    if (R.kind === 'lamp') continue;                               // the lamp road is drawn by its lamps
    let n = 0;
    trace(R.pts, (i) => {
      if (LANDM[i] !== 1) return;
      if (R.kind === 'path') { if ((n++ % 3) < 2) { MATB[i] = MAT_LAND; VAL[i] = 10.1; FORM[i] = 0; } return; }   // the mountain path: a pale dashed thread through the pass
      if (FORM[i]) return;
      if (MATB[i] === MAT_WHEAT) VAL[i] = 7.1; else if (MATB[i] === MAT_LAND) VAL[i] = Math.min(9.1, Math.floor(VAL[i]) + 1.1); else VAL[i] = Math.min(9.1, Math.floor(VAL[i]) + 2.1);
    });
  }
}

// ---------------------------------------------------------------- sky, clouds, cloud shadows
function buildSky() {
  SKYV = new Float32Array(W * HY); GLOW = new Float32Array(W * HY);
  for (let y = 0; y < HY; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, dx = x - SUNX, dy = y - SUNY, d2 = dx * dx + dy * dy;
    SKYV[i] = band(skyAt(x, y), 2.2);
    GLOW[i] = 2.3 * Math.exp(-d2 / (24 * 24)) + 1.6 * Math.exp(-d2 / (72 * 72));
  }
  DYN.stars.length = 0;
  const rng = mulberry32(77);
  for (let k = 0; k < 46; k++) { const x = 3 + Math.floor(rng() * (W - 6)), y = 3 + Math.floor(rng() * rng() * HY * 0.62); DYN.stars.push({ x, y, ph: rng() * 6.28, big: rng() < 0.2 }); }
}
// clouds: clusters of puffs become a density field; the shade is how the density changes toward the sun (still-water genClouds)
function buildClouds() {
  CLV = new Float32Array(CW * HY);
  const rng = mulberry32(2207);
  const top = SUNY - 22;                                            // every cloud floats above the sun: the light stays in the clear
  const clusters = [ // cx, cy, width, height, puffs, rmin, rmax, stretch (1 = cumulus, more = a flat streak)
    [226, 0.36 * top, 190, 0.44 * top, 40, 10, 24, 1],
    [30, 0.20 * top, 120, 0.20 * top, 28, 9, 17, 1],
    [470, 0.42 * top, 150, 0.36 * top, 28, 9, 20, 1],
    [352, 0.86 * top, 110, 0.04 * top, 9, 3, 5, 4],
    [150, 0.76 * top, 80, 0.04 * top, 7, 3, 4.5, 4],
    [590, 0.75 * top, 100, 0.05 * top, 9, 3, 5, 4],
    [560, 0.12 * top, 110, 0.12 * top, 12, 5, 10, 1],
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
    if (d > 0.02) d += (pnoise(x * 0.075, y * 0.11, 48, 4096, 11) - 0.5) * 0.3 + (pnoise(x * 0.25, y * 0.25, 160, 4096, 23) - 0.5) * 0.1;
    dens[y * CW + x] = d;
  }
  const T = 0.3;
  const sample = (x, y) => { x = ((Math.round(x) % CW) + CW) % CW; y = Math.round(y); return y < 0 || y >= HY ? 0 : dens[y * CW + x]; };
  for (let y = 0; y < HY; y++) for (let x = 0; x < CW; x++) {
    const d = dens[y * CW + x];
    if (d <= T) continue;
    let lx = SUNX - x, ly = SUNY + 6 - y;
    const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
    const shade = d - sample(x + lx * 4, y + ly * 4), e = d - T;
    let f = 7.5 + clamp(shade * 5, -2.4, 2.2);
    if (e < 0.07 && shade > 0) f = 10.8;                             // the thin edge that faces the sun
    else if (e < 0.05) f -= 0.8;
    else if (Math.abs(d - 0.72) < 0.025) f = shade > 0.02 ? Math.max(f, 9.6) : Math.min(f, 6.4);
    let rim = e < 0.09 && shade > 0;
    if (sample(x, y + 1) <= T) { f = Math.max(f, 10.1); rim = true; }   // undersides catch the low sun: a crisp lit line
    else if (sample(x, y - 2) <= T) f = Math.min(f, 6.4);           // tops are in their own shade
    if (!rim) f -= clamp((top - y) / top, 0, 1) * 1.0;              // higher is darker
    CLV[y * CW + x] = Math.max(1.2, Math.floor(f) + 0.1);           // flat steps: the sky glow moves them, not the bake
  }
}
function buildSeaStreaks() {                      // a 256 x 256 wrapping field of short flat streaks: the calm shimmer of open water
  SEAT = new Uint8Array(256 * 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) SEAT[(y << 8) | x] = pnoise(x * 24 / 256, y * 150 / 256, 24, 150, 205) > 0.80 ? 1 : 0;
}
function buildCloudShadows() {                   // a 512 x 512 wrapping noise field; a cloud's shadow lies wherever it rises over the row's threshold
  CS = new Float32Array(512 * 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    CS[(y << 9) | x] = 0.54 * pnoise(x * 4 / 512, y * 6 / 512, 4, 6, 301) + 0.30 * pnoise(x * 9 / 512, y * 13 / 512, 9, 13, 302) + 0.16 * pnoise(x * 19 / 512, y * 27 / 512, 19, 27, 303);
  }
}

// ---------------------------------------------------------------- places: hand-drawn sprites on the relief
let PUTV = 9;                                    // the v of the thing being drawn: nearer ground hides it (9 = never hidden)
function put(x, y, c) {
  if (x < 0 || x >= W || y <= HY || y >= H) return;
  const i = y * W + x;
  if (PV[i] > PUTV + 0.012) return;              // a ridge to the south stands in front of it
  SPI.push(i); SPC.push(c);
}
const STYLE = {};
function buildStyles() {
  STYLE.built = { body: AIR[1], rim: AIR[11], rim2: AIR[8] };     // castles, mills, the city: dark walls, lit on the sun side
  STYLE.stone = { body: AIR[2], rim: AIR[10], rim2: AIR[6] };
  STYLE.wreck = { body: AIR[1], rim: AIR[9], rim2: AIR[6] };       // clockwork and wreckage: duller, half lost in the ash     // spires, hands, standing stones, clockwork
  STYLE.CH = { w: ACC.lamp, f: ACC.lampDeep, k: AIR[0], l: AIR[8], p: AIR[10], o: ACC.lamp, s: LAND[4], c: AIR[11], C: AIR[9] };
  STYLE.dark = { body: AIR[2], rim: AIR[2], rim2: AIR[2] };
}
let SHM = null;
function stamp(rows, cx, by, st, key, flip, noShadow) {
  const h = rows.length, w = rows[0].length, x0 = cx - (w >> 1), y0 = by - h + 1;
  const at = (i, j) => (j < 0 || j >= h || i < 0 || i >= w) ? '.' : rows[j][flip ? w - 1 - i : i];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = at(i, j);
    if (ch === '.') continue;
    const c = ch === '#' ? (at(i - 1, j) === '.' ? st.rim : at(i, j - 1) === '.' ? st.rim2 : st.body) : STYLE.CH[ch];
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
function mound(x, y, rx) {                        // every castle stands on its own lit hilltop, clear of the trees: the backdrop that makes a dark sprite read
  for (let gy = -3; gy <= 3; gy++) for (let gx = -rx; gx <= rx; gx++) {
    const q = (gx * gx) / (rx * rx) + (gy * gy) / 10, i = (y + gy) * W + x + gx;
    if (q < 1 && x + gx >= 0 && x + gx < W && LANDM[i] === 1 && MATB[i] !== MAT_AIR && MATB[i] !== MAT_WHEAT) { MATB[i] = MAT_LAND; VAL[i] = Math.max(VAL[i], gx < rx * 0.3 ? 7.1 : 6.1); FORM[i] = 0; }
  }
}
function stormCloud(cx, cy, seed, key) {          // a storm that never leaves its valley: a small thunderhead, lit on its sun side, rain under it
  const rng = mulberry32(seed), puffs = [];
  for (let k = 0; k < 11; k++) { const q = rng() * 2 - 1; puffs.push([cx + q * 10, cy - 1 - (1 - q * q) * (2 + 8 * rng()), 3.4 + rng() * 2.8]); }
  const den = (x, y) => { let d = 0; for (const p of puffs) { const dx = x - p[0], dy = (y - p[1]) * 1.2, q = (dx * dx + dy * dy) / (p[2] * p[2]); if (q < 1) d += (1 - q) * (1 - q); } return y > cy + 1 ? d * Math.exp(-(y - cy - 1) * 1.2) : d; };
  const T = 0.28;
  for (let y = cy - 19; y <= cy + 5; y++) for (let x = cx - 19; x <= cx + 19; x++) {
    const d = den(x, y);
    if (d <= T) continue;
    const edge = den(x - 1, y - 1) <= T && (den(x - 1, y) <= T || den(x, y - 1) <= T), lee = d - den(x - 2, y - 2);
    put(x, y, edge ? AIR[9] : den(x, y + 1) <= T ? AIR[1] : lee > 0.3 ? AIR[6] : lee > 0.05 ? AIR[4] : y > cy - 1 ? AIR[1] : AIR[2]);
    if (den(x, y + 1) <= T) for (let r = 1; r <= 7; r++) if (((x + r * 2) & 3) === 0 && r > (hash2(x, 0, seed) * 3 | 0)) put(x + (r >> 1), y + r, AIR[4]);   // rain
    const gy = y + 11, gx = x + 6;
    if (gx >= 0 && gx < W && gy < H) SHM[gy * W + gx] = 1;
  }
  const r = { x0: cx - 15, y0: cy - 15, x1: cx + 15, y1: cy + 12, key };
  OBST.push(r); PLACES[key] = r;
  DYN.storms.push({ x: cx, y: cy + 3, ph: rng() });
}
function placeAll() {
  SPI = []; SPC = []; PLACES = {}; OBST = [];
  for (const k in DYN) if (k !== 'stars') DYN[k].length = 0;
  SHM = new Uint8Array(W * H);
  const pois = WORLD.POIS.slice().sort((a, b) => a.v - b.v);
  const rng = mulberry32(905);
  for (const p of pois) {
    const x = px(p.u), y = py(p.u, p.v);
    PUTV = p.v;
    switch (p.type) {
      case 'castle': mound(x, y, (ART.castles[p.variant][0].length >> 1) + 3); stamp(ART.castles[p.variant], x, y, STYLE.built, p.key); break;
      case 'city': {
        stamp(ART.city, x, y, STYLE.built, p.key);
        for (let gy = -9; gy <= 12; gy++) for (let gx = -26; gx <= 26; gx++) { const q = (gx * gx) / (26 * 26) + (gy * gy) / (10 * 10), i = (y + gy) * W + x + gx; if (q < 1 && LANDM[i] === 1 && MATB[i] === MAT_LAND) VAL[i] += 1.3 * (1 - q) * (1 - q); }   // the lit city warms the ground around it
        const road = WORLD.ROADS.find(r => r.kind === 'lamp');
        if (road) { let last = -99; trace(road.pts, (i, lx, ly, s) => { if (lx > x - 17 || Math.abs(lx - last) < 6) return; last = lx; put(lx, ly - 1, ACC.lamp); put(lx, ly, AIR[1]); DYN.win.push({ i: (ly - 1) * W + lx, ph: hash2(lx, ly, 8), city: true }); }); }
        break;
      }
      case 'spires': mound(x, y, 8); stamp(ART.spires, x, y, STYLE.stone, p.key); break;
      case 'stone_hands': mound(x, y, 12); stamp(ART.hand, x - 5, y, STYLE.stone, p.key); stamp(ART.hand, x + 5, y + 1, STYLE.stone, p.key, true); break;
      case 'windmill': { const s = stamp(ART.mill, x, y, STYLE.built, p.key); DYN.mills.push({ x: s.x0 + 2, y: s.y0 + 1, ph: p.u * 40 }); break; }
      case 'standing_stone': stamp(ART.stone, x, y, STYLE.stone, p.key); break;
      case 'clockwork_tower': stamp(ART.clockwork[p.variant], x, y, STYLE.wreck, p.key); break;
      case 'wreckage': stamp(ART.wreckage[Math.floor(rng() * 3)], x, y, STYLE.wreck, null); break;
      case 'cavern': stamp(ART.cavern, x - 7, y - 5, STYLE.stone, p.key, false, true); break;
      case 'lone_mountain': stamp(ART.cog, px(p.u - 0.012), py(p.u - 0.012, p.v + 0.034), STYLE.stone, p.key); break;
      case 'isles': stamp(ART.ship, px(p.u - 0.035), py(p.u - 0.035, p.v - 0.03) + 1, STYLE.built, p.key, false, true); break;
      case 'crystal_grove': {
        const trees = [];
        for (let k = 0; k < 60 && trees.length < 7; k++) {
          const a = rng() * 6.28, r = Math.sqrt(rng()) * 0.034, u = p.u + Math.cos(a) * r, v = p.v + Math.sin(a) * r * 0.8, tx = px(u), ty = py(u, v);
          if (hg(u, v) > SEA + 0.004 && !trees.some(q => Math.abs(q[0] - tx) < 4 && Math.abs(q[1] - ty) < 4)) trees.push([tx, ty, Math.floor(rng() * 3), v]);
        }
        trees.sort((a, b) => a[1] - b[1]);
        for (const [tx, ty, k, tv] of trees) { PUTV = tv; const s = stamp(ART.crystalTree[k], tx, ty, STYLE.dark, p.key); DYN.spark.push({ i: s.y0 * W + s.x0 + (s.w >> 1), ph: rng() * 6.28 }); }
        break;
      }
      case 'storm_valley': stormCloud(x, y - 12, 400 + Math.round(p.u * 100), p.key); break;
      case 'flower_field': {
        const fl = [];
        for (let k = 0; k < 8; k++) { const a = rng() * 6.28, r = (0.25 + 0.75 * Math.sqrt(rng())) * 0.034, u = p.u + Math.cos(a) * r * 1.2, v = p.v + Math.sin(a) * r * 0.7; fl.push([u, v, rng()]); }
        fl.sort((a, b) => a[1] - b[1]);
        for (const [u, v, q] of fl) {
          PUTV = v;
          const fx = px(u), fy = py(u, v), stem = 2 + Math.floor(q * 4), big = q > 0.35, head = big ? ART.bloom : ART.bloomSmall;
          for (let k = 0; k < stem; k++) put(fx, fy - k, LAND[3]);
          stamp(head, fx, fy - stem, STYLE.stone, p.key);
        }
        break;
      }
      case 'volcano': {
        for (const pk of WORLD.PEAKS) if (pk.key.indexOf('fire_dragon') === 0 && pk.h > 0.45) {
          const ex = px(pk.u), ey = py(pk.u, pk.v);
          for (let k = -1; k <= 1; k++) DYN.ember.push({ i: ey * W + ex + k, ph: pk.u * 90, core: k === 0 });
          DYN.ember.push({ i: (ey + 1) * W + ex, ph: pk.u * 90 + 1, core: false });
        }
        const r = { x0: px(0.66), y0: py(0.716, 0.788) - 2, x1: px(0.79), y1: py(0.726, 0.84), key: p.key };
        PLACES[p.key] = r;
        break;
      }
      case 'dark_forest': {
        let n = 0;
        for (let k = 0; k < 400 && n < 9; k++) {
          const u = p.u + (rng() * 2 - 1) * 0.07, v = p.v + (rng() * 2 - 1) * 0.08, ex = px(u), ey = py(u, v), i = ey * W + ex;
          if (WORLD.forestType[WORLD.cell(u, v)] !== F.EYES || !FORM[i] || !FORM[i + 2] || !FORM[i - 2] || !FORM[i + W]) continue;
          if (DYN.eyes.some(e => Math.abs(e.x - ex) < 9 && Math.abs(e.y - ey) < 7)) continue;
          DYN.eyes.push({ x: ex, y: ey, i, ph: rng() * 20, per: 6 + rng() * 6 }); n++;
        }
        break;
      }
      default: break;
    }
  }
  PUTV = 9;
  // sprite shadows go into the ground value, so they dither and band like everything else
  const cover = new Uint8Array(W * H);
  for (let k = 0; k < SPI.length; k++) cover[SPI[k]] = 1;
  for (let i = 0; i < W * H; i++) if (SHM[i] && !cover[i] && LANDM[i] === 1) VAL[i] = Math.max(VAL[i] - 1.6, 3.1);
}
function buildGlints() {                          // a calm glitter: short dashes that come and go, thick only on the sun's road
  const gi = [], gp = [], gc = [];
  for (let y = HY + 2; y < H - 1; y++) for (let x = 1; x < W - 3; x++) {
    const i = y * W + x;
    if (LANDM[i] || LANDM[i + 1] || LANDM[i - 1] || MATB[i] !== MAT_AIR) continue;
    const dy = y - HY, wdt = 3 + dy * 0.3;
    const path = dy < 86 ? Math.exp(-((x - SUNX) * (x - SUNX)) / (wdt * wdt)) * (1 - dy / 100) : 0;
    if (hash2(x, y, 91) > 0.003 + path * 0.12) continue;
    gi.push(i); gp.push(hash2(x, y, 92) * 6.28);
    gc.push(path > 0.25 ? AIR[11] : AIR[clamp(Math.floor(VAL[i]) + 2, 0, 11)]);
  }
  GLN = gi.length; GLI = Int32Array.from(gi); GLP = Float32Array.from(gp); GLC = Uint8Array.from(gc);
  SEAM = new Uint8Array(W * H); ROWSPD = new Float32Array(H);
  const wi = [], wp = [], wc = [];
  for (let y = HY + 1; y < H; y++) {
    ROWSPD[y] = 1.2 + 2.6 * hash2(y, 7, 44);                        // every row of water drifts at its own pace
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!LANDM[i] && MATB[i] === MAT_AIR) SEAM[i] = 1;
      if (MATB[i] === MAT_WHEAT && LANDM[i] === 1) { wi.push(i); wp.push(x * 0.11 + y * 0.07 + 0.6 * Math.sin(y * 0.09)); wc.push(MLUT[MAT_WHEAT * 12 + clamp(Math.floor(VAL[i]) + 1, 0, 10)]); }
    }
  }
  WHN = wi.length; WHI = Int32Array.from(wi); WHP = Float32Array.from(wp); WHC = Uint8Array.from(wc);
}
// Where each label sits: [centre x, centre y measured from the row of v = 0 (YM), lines]. Placed by hand, by eye, so no
// label covers the place it names or another label. A label that is not listed here falls back to the automatic layout.
const LABEL_AT = {
  unknown_sea: [190, -31], northern_lands: [215, 14], verdant_reach: [99, 194], eastern_kingdom: [242, 169], mage_kingdoms: [237, 264],
  still_water: [62, 127], mountain_path: [75, 74], starbloom_fields: [147, 85], stone_hands: [154, 128],
  colossal_spires: [83, 143, ['Colossal', 'Spires']], castle_order: [116, 182, ['Castle of the Order']], forest_of_eyes: [47, 159],
  wheat_country: [161, 226, ['the wheat', 'country']], cavern_of_giants: [103, 238, ['Cavern of Giants']], green_valleys: [60, 267, ['the green', 'valleys']],
  toad_swamp: [163, 246, ["the toad's", 'swamp']], fire_dragon_peaks: [225, 200, ['Fire-Dragon Peaks']], buried_machine: [283, 242, ['Mount of the', 'Buried Machine']],
  silent_battlefield: [285, 129, ['Silent', 'Battlefield']], artifact_isles: [285, 305],
};
function buildLabels() {
  const items = [];
  for (const l of WORLD.LABELS) {
    const major = l.rank === 'major', at = LABEL_AT[l.key];
    const it = { key: l.key, text: l.text, rank: major ? 1 : 2, cx: Math.round(sx(l.u)), cy: Math.round(sy(l.v, surf(l.u, l.v))), rect: l.poi ? PLACES[l.poi] : null, poi: l.poi, yMin: HY };
    if (at) { it.fixed = true; it.cx = at[0]; it.cy = YM + at[1]; it.lines = at[2] || [l.text]; }
    items.push(it);
  }
  LBL = LAB.layout(items, OBST, W, H, TXT, { outline: AIR[0], major: AIR[11], minor: AIR[10] });
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
      IDX[i] = AIR[clamp(dith(c > 0 ? c + GLOW[i] * 0.55 : SKYV[i], x, y), 0, 11)];
    }
  }
  for (const s of DYN.stars) {                                     // the last stars of the night, high up and away from the sun
    let cx = s.x - off; if (cx < 0) cx += CW;
    const i = s.y * W + s.x;
    if (CLV[s.y * CW + cx] > 0 || SKYV[i] > 4.6) continue;
    const tw = Math.sin(t * 1.3 + s.ph);
    if (tw > -0.5) IDX[i] = AIR[s.big && tw > 0.3 ? 10 : 8];
  }
  for (let dx = -46; dx <= 46; dx++) IDX[(HY - 1) * W + SUNX + dx] = AIR[Math.abs(dx) < 24 ? 11 : 10];   // the bright line where the sea meets the sky under the sun
  const r2 = (SUNR + 0.4) * (SUNR + 0.4), r1 = (SUNR - 1) * (SUNR - 1);
  for (let dy = -SUNR; dy <= SUNR; dy++) for (let dx = -SUNR; dx <= SUNR; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2) IDX[(SUNY + dy) * W + SUNX + dx] = d2 > r1 ? AIR[11] : ACC.sun;
  }
}
function drawTerrain(t) {
  const ox = Math.floor(t * 2.4), oy = Math.floor(t * 0.6);
  for (let y = HY; y < H; y++) {
    const row = y * W, srow = ((y - oy) & 511) << 9, k = SHK[y], trow = (y & 255) << 8, tx = Math.floor(t * ROWSPD[y]);
    for (let x = 0; x < W; x++) {
      const i = row + x, a = (CS[srow | ((x - ox) & 511)] - k) * 18, st = SEAM[i] & SEAT[trow | ((x - tx) & 255)];
      if (a <= 0 && st === 0) IDX[i] = BASE[i];
      else IDX[i] = MLUT[MATB[i] * 12 + clamp(dith(VAL[i] - (a <= 0 ? 0 : a >= 1 ? 1.1 : 1.1 * a * a * (3 - 2 * a)) + st * 0.9, x, y), 0, 11)];
    }
  }
  for (let k = 0; k < WHN; k++) if (Math.sin(WHP[k] - t * 1.3) > 0.9) IDX[WHI[k]] = WHC[k];   // wind crossing the wheat
}
function drawLife(t) {
  for (let k = 0; k < GLN; k++) if (Math.sin(t * 1.7 + GLP[k]) > 0.45) { const i = GLI[k]; IDX[i] = GLC[k]; IDX[i + 1] = GLC[k]; }
  for (let k = 0; k < SPI.length; k++) IDX[SPI[k]] = SPC[k];
  for (const w of DYN.win) IDX[w.i] = w.city && hash2((w.ph * 977) | 0, Math.floor(t * 3 + w.ph * 9), 5) < 0.14 ? ACC.lampDeep : ACC.lamp;
  for (const e of DYN.ember) { const s = Math.sin(t * 0.9 + e.ph); IDX[e.i] = e.core ? (s > -0.4 ? ACC.ember : ACC.emberDeep) : (s > 0.35 ? ACC.emberDeep : IDX[e.i]); }
  for (const m of DYN.mills) {
    const a = t * 1.1 + m.ph;
    for (let k = 0; k < 4; k++) { const c = Math.cos(a + k * 1.5708), s = Math.sin(a + k * 1.5708); for (let r = 1; r <= 3; r++) { const x = Math.round(m.x + c * r), y = Math.round(m.y + s * r); IDX[y * W + x] = AIR[r === 3 ? 9 : 10]; } }
    IDX[m.y * W + m.x] = AIR[1];
  }
  for (const e of DYN.eyes) { const q = (t + e.ph) % e.per; if (q > 1.4 && !(q > 3.4 && q < 3.6)) { IDX[e.i] = AIR[10]; IDX[e.i + 2] = AIR[10]; } }
  for (const s of DYN.spark) if (Math.sin(t * 2.1 + s.ph) > 0.82) IDX[s.i] = ACC.sun;
  for (const s of DYN.storms) {
    const q = (t * 0.31 + s.ph) % 1;
    if (q < 0.03 || (q > 0.05 && q < 0.065)) { let x = s.x + ((s.ph * 7) | 0) - 3; for (let k = 0; k < 6; k++) { x += hash2(k, Math.floor(t * 0.31 + s.ph), 9) < 0.5 ? -1 : 1; IDX[(s.y + k) * W + x] = ACC.sun; } }
  }
}
function drawLabels() {
  const R = LBL.rank, C = LBL.col, lv = G.labels;
  for (let i = HY * W, n = W * H; i < n; i++) if (R[i] && R[i] <= lv) IDX[i] = C[i];
}
function init() { buildHeight(); buildStyles(); buildCloudShadows(); buildSeaStreaks(); }
function setH(h) {
  H = clamp(h | 0, 520, 700);
  HY = Math.round(H * 0.30); YM = HY + 66; SUNY = HY - 28;
  const n = W * H;
  PU = new Float32Array(n); PV = new Float32Array(n); VAL = new Float32Array(n); MATB = new Uint8Array(n);
  REL = new Float32Array(n); LANDM = new Uint8Array(n); FORM = new Uint8Array(n);
  BASE = new Uint8Array(n); IDX = new Uint8Array(n);
  SHK = new Float32Array(H); for (let y = 0; y < H; y++) SHK[y] = 0.565 + 0.4 * (1 - sstep(HY + 20, HY + 90, y));   // the shadow threshold per row: cloud shadows shrink away in the far haze
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
const API = { init, setH, setOut, update, render, setLabels, labels0: () => setLabels(0), labels1: () => setLabels(1), labels2: () => setLabels(2), G, W, PALHEX, get H() { return H; }, get debug() { return { LBL, PLACES, OBST }; } };
if (!IS_BROWSER) module.exports = API; else window.MAP_B = API;
})();
