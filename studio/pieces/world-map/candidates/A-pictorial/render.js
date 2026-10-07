/* World map of the Verdant Reach, candidate A: a pictorial bird's-eye view.
   The continent seen from very high above the southern coast, looking north, at a cool dawn.
   Terrain: the world height grid drawn per screen column (voxel-space fill to a y-buffer), on a
   progressive projection: the near land is seen obliquely, the far land bends up into a horizon.
   Everything is a continuous ramp value first (VAL), hazed in ramp space, dithered once.
   Static layers are baked once in setH; per frame only clouds, cloud shadows, glints, lamps, ember, eyes, birds.
   Places are hand-drawn sprites (sprites.js); labels are a separate overlay (font.js), off by default:
   setLabels(1) = region names, setLabels(2) = every name. Shoot: node scripts/shoot.js render.js --h 568 --at 2 --scale 3 */
(function () {
'use strict';
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
const WORLD = IS_BROWSER ? window.WORLD : require('../../src/world.js');
const SPR = IS_BROWSER ? window.WM_SPRITES : require('./sprites.js');
const FONT = IS_BROWSER ? window.WM_FONT : require('./font.js');

const W = 320, H_DESIGN = 568;
let H = H_DESIGN;
const CX = 160;
const SUNX = 146, SUNR = 7;                    // the light: a low pale sun over the Unknown Sea, a little east of the mountain path
let HZ = 180, SUNY = 146;

// ---------------------------------------------------------------- utils (copied from kolobok 1_engine.js / tips.js)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s, oct) { let f = 0, amp = 0.5, tot = 0; for (let i = 0; i < oct; i++) { f += amp * vnoise(x, y, s + i * 131); tot += amp; x *= 2.02; y *= 2.02; amp *= 0.5; } return f / tot; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
// continuous ramp value -> index: flat bands, ordered dither only across the band edges (kolobok dith; lo/hi = the seam window)
function dithW(f, x, y, lo, hi) { const fl = Math.floor(f); let fr = f - fl; fr = fr < lo ? 0 : fr > hi ? 1 : (fr - lo) / (hi - lo); return fl + (fr > bay(x, y) ? 1 : 0); }
const ci = v => (v < 0 ? 0 : v > 11 ? 11 : v);

// ---------------------------------------------------------------- palette: one cool-dawn ramp, indigo > blue > teal > sage > pale gold > cream
const hexc = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const RAMP = ['#0b0d22', '#111a3a', '#16294f', '#1b3b63', '#204f72', '#27657a', '#347b7c', '#4c9279', '#82ad7a', '#c3c285', '#ecd692', '#fdf3cc'].map(hexc);
// accents: 12 ice (white things in shade: snow, cloud, crystal trees), 13 deep ice, 14 wheat gold, 15 lamplight, 16 ember
const ACCENT = ['#b9c6cc', '#8696a3', '#d0b25e', '#ffc45e', '#e8552d'].map(hexc);
const A_ICE = 12, A_ICE2 = 13, A_GOLD = 14, A_LAMP = 15, A_EMBER = 16, NPAL = 17;
const PAL = new Uint32Array(NPAL);
function buildPal() {
  for (let i = 0; i < NPAL; i++) { const c = i < 12 ? RAMP[i] : ACCENT[i - 12]; PAL[i] = (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; }
}
const WHITE = [A_ICE2, A_ICE, 10, 11];          // the ramp of white things: cool in shade, warm cream in the light
const whiteIdx = (wv, x, y) => WHITE[clamp(dithW(wv, x, y, 0.34, 0.66), 0, 3)];

// ---------------------------------------------------------------- projection: an oblique view that bends into a horizon far away
// v (0 north .. 1 south) -> ground row; u -> column through a width scale that shrinks with distance (the land tapers north).
const V_N = 0.09, V_S = 0.96;                  // the north and south coasts
const S_FAR = 205, S_NEAR = 322;               // px per u unit at the two coasts
const G_FAR = 170, G_NEAR = 430;               // px per v unit (how steeply the ground is seen) at the two coasts
const SEA_FAR_PX = 40;                         // rows of the Unknown Sea between the north coast and the horizon
const YT_N = 4096, YT_V0 = -0.6, YT_V1 = 1.5;  // lookup table for the ground row of v
const YT = new Float32Array(YT_N + 1);
let KY = 1;                                    // vertical scale for other canvas heights
const nearK = v => (v - V_N) / (V_S - V_N);    // 0 at the north coast .. 1 at the south coast
const Sx = v => (v >= V_N ? S_FAR + (S_NEAR - S_FAR) * nearK(v) : S_FAR * Math.exp((v - V_N) * 0.9));
const gOf = v => G_FAR + (G_NEAR - G_FAR) * clamp(nearK(v), 0, 1.7);
function buildProjection() {
  const tau = SEA_FAR_PX / G_FAR, dv = (YT_V1 - YT_V0) / YT_N;
  let y = SEA_FAR_PX;
  for (let i = 0; i <= YT_N; i++) {
    const v = YT_V0 + i * dv;
    if (v <= V_N) { YT[i] = SEA_FAR_PX * Math.exp((v - V_N) / tau); y = SEA_FAR_PX; }
    else { y += gOf(v) * dv; YT[i] = y; }
  }
}
function Yg(v) {                                // ground row (sea level) of v, in canvas px
  const f = (clamp(v, YT_V0, YT_V1) - YT_V0) / (YT_V1 - YT_V0) * YT_N, i = Math.min(YT_N - 1, f | 0);
  return HZ + KY * (YT[i] + (YT[i + 1] - YT[i]) * (f - i));
}
const HSc = v => KY * lerp(46, 64, clamp(nearK(v), 0, 1.2));   // px per height unit: mountains stand up from the plan
const elev = h => (h <= WORLD.SEA ? 0 : h - WORLD.SEA + (h > 0.30 ? 0.5 * (1 - Math.exp(-(h - 0.30) / 0.25)) : 0));   // high ground is drawn taller than it is
const projX = (u, v) => CX + (u - 0.5) * Sx(v);
const projY = (v, h) => Yg(v) - elev(h) * HSc(v);

// ---------------------------------------------------------------- world grids prepared for shading
const N = WORLD.N, SEA = WORLD.SEA;
let HD = null, HFAR = null, SHADOW = null, FORB = null, CONE = null;
function boxBlur(src, r, passes) {
  let a = new Float32Array(src), b = new Float32Array(N * N);
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < N; j++) { let s = 0; for (let i = -r; i <= r; i++) s += a[j * N + clamp(i, 0, N - 1)]; for (let i = 0; i < N; i++) { b[j * N + i] = s / (2 * r + 1); s += a[j * N + clamp(i + r + 1, 0, N - 1)] - a[j * N + clamp(i - r, 0, N - 1)]; } }
    for (let i = 0; i < N; i++) { let s = 0; for (let j = -r; j <= r; j++) s += b[clamp(j, 0, N - 1) * N + i]; for (let j = 0; j < N; j++) { a[j * N + i] = s / (2 * r + 1); s += b[clamp(j + r + 1, 0, N - 1) * N + i] - b[clamp(j - r, 0, N - 1) * N + i]; } }
  }
  return a;
}
function samp(A, u, v) {                        // bilinear, clamped
  const x = clamp(u * N - 0.5, 0, N - 1.001), y = clamp(v * N - 0.5, 0, N - 1.001), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, i = yi * N + xi;
  return (A[i] * (1 - fx) + A[i + 1] * fx) * (1 - fy) + (A[i + N] * (1 - fx) + A[i + N + 1] * fx) * fy;
}
// the drawn height: crisp near the camera, smoothed far away so distant peaks merge into ranges instead of needles
const hAt = (u, v) => { const k = smooth(0.3, 0.58, v); return k >= 1 ? samp(HD, u, v) : lerp(samp(HFAR, u, v), samp(HD, u, v), k); };
const cellOf = (u, v) => clamp((v * N) | 0, 0, N - 1) * N + clamp((u * N) | 0, 0, N - 1);
// The sun stands over the Unknown Sea. Every lit thing takes its direction from this one point.
const SUN_U = 0.5 + (SUNX - CX) / S_FAR, SUN_V = -0.75, TAN_L = 1.5, TAN_SH = 2.3;
const LD = new Float64Array(2);
function sunDir(u, v, lat) { const lu = (SUN_U - u) * lat, lv = SUN_V - v, ll = Math.hypot(lu, lv); LD[0] = lu / ll; LD[1] = lv / ll; }
function prepWorld() {
  const land = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) land[i] = Math.max(SEA, WORLD.height[i]);
  // mountains are broadened (a wide blur) so peaks are masses, not needles; the lowland keeps its small hills
  const fine = boxBlur(land, 2, 2), wide = boxBlur(land, 5, 2), mb = boxBlur(WORLD.mountain, 4, 1);
  HD = new Float32Array(N * N); HFAR = new Float32Array(N * N); CONE = new Float32Array(N * N);
  // lone cones (the volcanoes, the machine mount) are narrow in the data: they keep their own shape (no wide blur) and are drawn lower, so they stay cones
  for (const pk of WORLD.PEAKS) {
    const r = pk.r * 1.7, i0 = Math.max(0, Math.floor((pk.u - r) * N)), i1 = Math.min(N - 1, Math.ceil((pk.u + r) * N)), j0 = Math.max(0, Math.floor((pk.v - r) * N)), j1 = Math.min(N - 1, Math.ceil((pk.v + r) * N));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot((i + 0.5) / N - pk.u, (j + 0.5) / N - pk.v), w = smooth(r, pk.r * 1.1, d); if (w > CONE[j * N + i]) CONE[j * N + i] = w; }
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, cw = CONE[k], m = smooth(0.04, 0.3, mb[k]) * (1 - cw);
    let h = lerp(fine[k], wide[k] * 1.06 - 0.012, m), crag = 0;
    if (m > 0.2) {                                                          // crags: ridged detail so skylines are not smooth
      const u = i / N, v = j / N, r = 1 - Math.abs(2 * fbm(u * 24, v * 24, 77, 3) - 1);
      crag = (r - 0.6) * 0.07 * smooth(0.2, 0.8, m);
    }
    const hc = fine[k] > 0.27 ? 0.27 + (fine[k] - 0.27) * 0.52 : fine[k];
    HD[k] = lerp(h + crag, hc, cw); HFAR[k] = lerp(lerp(fine[k], wide[k], m), hc, cw);
  }
  FORB = boxBlur(WORLD.forest, 1, 1);
  // cast shadows: march from each cell toward the sun over the grid
  const sh0 = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N, v = (j + 0.5) / N;
    sunDir(u, v, 1.5); const lu = LD[0], lv = LD[1];
    const h0 = HD[j * N + i]; let sh = 0;
    for (let k = 2; k < 150; k++) {
      const d = k * 1.2 / N, uu = u + lu * d, vv = v + lv * d;
      if (uu < 0 || uu > 1 || vv < 0) break;
      const ray = h0 + d * TAN_SH; if (ray > 0.97) break;
      const hh = HD[cellOf(uu, vv)] - ray;
      if (hh > 0) { sh = Math.max(sh, Math.min(1, hh * 40)); if (sh >= 1) break; }
    }
    sh0[j * N + i] = sh;
  }
  SHADOW = boxBlur(sh0, 1, 1);
}

// ---------------------------------------------------------------- buffers
let VAL = null, MATK = null, PU = null, PV = null, KIND = null, FOR = null, BASE = null, BASESH = null, IDX = null, LAB = null, OUT32 = null;
const K_SKY = 0, K_SEA = 1, K_LAKE = 2, K_LAND = 3;
const M_RAMP = 0, M_WHITE = 1;                  // MATK: 0 = VAL is a ramp value, 1 = VAL is a value on the white ramp, >= 12 = that accent index

// ---------------------------------------------------------------- sky: gradient toward the light, a round halo in two sizes, a pale band along the horizon
function skyValue(x, y) {
  const t = clamp(y / HZ, 0, 1), dx = x - SUNX, dy = y - SUNY, d2 = dx * dx + dy * dy, dh = HZ - y;
  const halo = 3.1 * Math.exp(-d2 / 560) + 1.6 * Math.exp(-d2 / 5200);
  const band = 2.2 * Math.exp(-(dh * dh) / 420) * (0.7 + 0.3 * Math.exp(-(dx * dx) / 9000));
  return Math.min(10.3, 1.3 + 5.35 * Math.pow(t, 1.5) + Math.max(halo, band) + 0.12 * Math.min(halo, band));
}
// thin dawn clouds far away near the horizon: darker than the bright sky behind them, lit from below by the low sun
const STREAKS = [[50, -27, 48, 4.2], [98, -18, 28, 2.6], [20, -45, 28, 3.0], [238, -24, 42, 3.8], [294, -35, 34, 3.2], [212, -48, 22, 2.4], [272, -12, 28, 2.2], [14, -12, 22, 2.2]];
function streakAt(x, y) {
  let d = 0;
  for (const s of STREAKS) { const ex = (x - s[0]) / s[2], ey = (y - (HZ + s[1] * KY)) / s[3], q = ex * ex + ey * ey; if (q < 1) d = Math.max(d, 1 - q); }
  return d > 0 ? d + (fbm(x * 0.06, y * 0.5, 91, 2) - 0.5) * 0.9 : 0;
}
function paintSky() {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, dx = x - SUNX, dy = y - SUNY, d2 = dx * dx + dy * dy;
    let f = skyValue(x, Math.min(y, HZ));
    if (d2 < (SUNR + 0.4) * (SUNR + 0.4)) f = 11;                           // the disc: a solid core of the lightest colour
    else if (y < HZ && streakAt(x, y) > 0.3) {
      const under = streakAt(x, y + 1) <= 0.3, col = Math.exp(-(dx * dx) / 16000);
      f = under ? Math.min(10, Math.round(f + 0.8 + 1.2 * col)) : Math.round(f - 1.5);
    }
    VAL[i] = f; KIND[i] = K_SKY;
  }
}
const horizonGlow = x => skyValue(x, HZ - 1);

// ---------------------------------------------------------------- terrain: per screen column, step north, fill down to a y-buffer
function marchTerrain() {
  for (let x = 0; x < W; x++) {
    let yb = H, v = 1.45;
    while (v > -0.02 && yb > 0) {
      const s = Sx(v), u = 0.5 + (x + 0.5 - CX) / s;
      let h = SEA, kind = K_SEA;
      if (u > 0 && u < 1 && v > 0 && v < 1) {
        const c = cellOf(u, v);
        if (WORLD.waterDepth[c] > 0) { if (WORLD.lake[c]) { kind = K_LAKE; h = WORLD.height[c]; } }
        else { h = Math.max(SEA, hAt(u, v)); kind = K_LAND; }
      }
      const sy = Math.max(0, Math.round(Yg(v) - elev(h) * HSc(v)));
      if (sy < yb) { for (let y = sy; y < yb; y++) { const i = y * W + x; PU[i] = u; PV[i] = v; KIND[i] = kind; } yb = sy; }
      v -= 0.4 / (gOf(Math.max(v, V_N)) * KY);
    }
    // the far sea, row by row up to the horizon
    for (let y = HZ; y < yb; y++) {
      let lo = YT_V0, hi = 0.2;
      for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (Yg(m) > y + 0.5) hi = m; else lo = m; }
      const i = y * W + x; PV[i] = lo; PU[i] = 0.5 + (x + 0.5 - CX) / Sx(lo); KIND[i] = K_SEA;
    }
  }
}

// ---------------------------------------------------------------- shading
// the sea: dark and near at the bottom, rising to the colour of the sky at the horizon, with long light streaks
function seaValue(x, y) {
  const ty = (y - HZ) / (H - HZ), dx = x - SUNX;
  let f = 2.1 - 0.9 * smooth(0.72, 1, ty) + (horizonGlow(x) - 1.4 - 2.1) * Math.exp(-ty / 0.4) + 2.0 * Math.exp(-(dx * dx) / 700) * Math.exp(-ty / 0.1);
  const yy = Math.log(y - HZ + 5) * 22;                                     // rows crowd together toward the horizon
  const n = vnoise(x * 0.022 + yy * 0.25, yy * 1.9, 61);
  if (n > 0.72) f += 0.7 * smooth(0.02, 0.2, ty) * (1 - 0.5 * smooth(0.6, 1, ty)); else if (n < 0.2 && ty < 0.2) f -= 0.6;
  return Math.min(10.3, f);
}
const FOG_MAX = 0.8;
const fogOf = v => FOG_MAX * Math.pow(smooth(0.86, 0.02, v), 1.25);
const fogVal = x => horizonGlow(x) - 0.7;
const REGION_BASE = [0, 0, 0, 0, 6.2, 6.0, 6.3, 6.3, 6.3, 5.2, 6.3, 6.2, 5.2, 6.2];
const CITY_P = WORLD.poi('eastern_city'), CITY_U = CITY_P.u, CITY_V = CITY_P.v + 0.008;
function shadeLand(i, x, y, u, v) {
  const c = cellOf(u, v), region = WORLD.region[c];
  const mtn = samp(WORLD.mountain, u, v), m = smooth(0.15, 0.45, mtn);
  const e1 = 1.6 / N;
  const gx = (hAt(u + e1, v) - hAt(u - e1, v)) / (2 * e1), gy = (hAt(u, v + e1) - hAt(u, v - e1)) / (2 * e1);
  sunDir(u, v, 1.5); const lu = LD[0], lv = LD[1];
  const sh = samp(SHADOW, u, v);
  const slope = Math.hypot(gx, gy), rel = smooth(0.5, 1.8, slope);
  const sRaw = 1 - (gx * lu + gy * lv) / TAN_L;
  const fa = fogOf(v), h0 = hAt(u, v), up = smooth(0.25, 0.33, h0);
  // lowland: calm. One flat tone; a hill is a dark face toward us and a lit far side; long shadows fall toward the camera
  const base = REGION_BASE[region] || 6.2;
  const dark = Math.max(smooth(0.7, 0.3, sRaw) * rel * up, sh);
  const swell = (fbm(u * 9 + v * 4, v * 34, 23, 2) - 0.5) * 0.9;                // long east-west swells of tone: a plain seen from the side
  const fl = base + swell * (1 - m) * (1 - 0.6 * sh) + 1.0 * smooth(1.4, 1.8, sRaw) * rel * (1 - sh) - 1.3 * dark - 0.9 * sh;
  // mountains: facets turned toward the sun's side are lit, those turned away are dark; the face toward us is in shade.
  // Low slopes are alpine green, high ones bare rock.
  const side = Math.tanh((SUN_U - u) / 0.07);                               // +1 west of the sun's column, -1 east of it
  const face = clamp(-gx * side / (slope + 0.4), -1, 1);
  const rock = smooth(0.38, 0.7, h0);                                         // dark toward the crest, paler toward the foot
  let fr = lerp(5.6, 2.9, rock) + 2.0 * smooth(0.05, 0.3, face) - 0.6 * smooth(-0.2, -0.5, face) - 0.4 * sh - 1.6 * samp(CONE, u, v) * (region === 11 ? 1 : 0.3);
  if (m > 0.3 && fa < 0.5 * FOG_MAX && slope > 1.2) {                       // gully streaks down the fall line, two flat steps, near the camera only
    const n1 = fbm((u * gy - v * gx) / slope * 210, h0 * 9, 41, 2);
    fr += (n1 > 0.62 ? 0.9 : n1 < 0.34 ? -0.6 : 0) * (1 - fa / (0.5 * FOG_MAX));
  }
  let f = lerp(fl, fr, m);
  // forest: darker masses with a lit edge where the canopy ends toward the sun
  const forest = samp(FORB, u, v), ft = WORLD.forestType[c];
  if (forest > 0.3 && ft !== WORLD.FOREST.CRYSTAL && !(ft === WORLD.FOREST.PINE && m > 0.12)) {   // no forest patches on the mountain faces: they stay big calm shapes
    const k = forest > 0.42 ? 1 : 0;
    const fb = ft === WORLD.FOREST.EYES ? 2.1 : ft === WORLD.FOREST.PINE ? 4.4 : ft === WORLD.FOREST.SWAMP ? 4.2 : 4.2;
    const ff = fb - 0.9 * dark * (ft === WORLD.FOREST.EYES ? 0.3 : 1);
    f = lerp(f, Math.min(f, ff), k * (1 - 0.8 * m));
    if (k > 0.5 && m < 0.5) FOR[i] = ft;
  }
  if (region === 12 && m < 0.3) {                                           // the battlefield: flat ash, a cold grey among the greens
    if (swell > -0.12 || rel > 0.5) { MATK[i] = A_ICE2; return 0; }
    f = 5.0;
  }
  // wheat: a pale gold plain, some fields riper
  const fid = WORLD.wheatField[c];
  if (fid && m < 0.2) {
    const wb = samp(WORLD.wheat, u, v), hsh = hash2(fid, 7, 3);
    if (wb > 0.45 && dark < 0.5 && hsh >= 0.74 && hsh < 0.94) { MATK[i] = A_GOLD; return 0; }
    return (wb > 0.45 ? (hsh >= 0.94 ? 9.0 : 10.0) : (fa < 0.3 ? 9.0 : 10.0)) - 1.0 * smooth(0.4, 0.6, dark);   // baulks between the strips show near the camera
  }
  // snow: on the white ramp, cream where the sun reaches it, ice-blue in shade
  if (samp(WORLD.snow, u, v) > 0.3) { MATK[i] = M_WHITE; return 1.0 + 1.6 * smooth(0.05, 0.3, face) - 0.9 * smooth(-0.2, -0.5, face); }
  let fv = f + (fogVal(x) - f) * fa;
  { const cu = (u - CITY_U) / 0.075, cv = (v - CITY_V) / 0.04, d2 = cu * cu + cv * cv; if (d2 < 1 && !FOR[i]) fv += 1.15 * (1 - d2); }   // the pool of lamplight the eastern city stands in
  return FOR[i] ? Math.round(fv) : fv;                                      // forest masses are flat: no seam can wander through them
}
function shadeTerrain() {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, u = PU[i], v = PV[i], kind = KIND[i];
    if (kind === K_SKY) continue;
    let f;
    if (kind === K_SEA) {
      f = seaValue(x, y);
      const cd = (u > 0 && u < 1 && v > 0 && v < 1) ? samp(WORLD.coast, u, v) : -1;
      const ty = (y - HZ) / (H - HZ);
      if (cd > -0.002 - 0.011 * vnoise(u * 30, v * 30, 9)) f += 0.8 * smooth(0.05, 0.35, ty);   // shallows along the coast, wider in the bays
      // surf: a broken pale line where the sea meets the shore that faces the camera
      if (y > 0 && KIND[i - W] === K_LAND && ty > 0.14 && vnoise(x * 0.23, y * 0.5, 13) > 0.5) f = 8;
    } else if (kind === K_LAKE) { const dx = x - SUNX; f = 8.6 + 1.4 * Math.exp(-(dx * dx) / 9000) - 1.6 * (y - HZ) / (H - HZ); }
    else f = shadeLand(i, x, y, u, v);
    VAL[i] = f;
  }
}
// crests: where the pixel above (or beside) is much farther away, this is a ridge line against what lies behind it. It faces the sun.
function lightCrests() {
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (KIND[i] !== K_LAND) continue;
    const v = PV[i];
    const g = gOf(Math.max(v, V_N)) * KY, s = i + (x < SUNX ? 1 : -1);        // s: the neighbour on the sun's side
    const up = KIND[i - W] === K_SKY ? 40 : (v - PV[i - W]) * g;               // px of ground hidden behind this edge
    const o = i + (x < SUNX ? -1 : 1);                                         // and the one on the far side (a dimmer edge)
    const sd = (x > 0 && x < W - 1) ? Math.max(KIND[s] === K_SKY ? 40 : (v - PV[s]) * g, 0.7 * (KIND[o] === K_SKY ? 40 : (v - PV[o]) * g)) : 0;
    const ul = x > 0 ? (KIND[i - W - 1] === K_SKY ? 40 : (v - PV[i - W - 1]) * g) : 0, ur = x < W - 1 ? (KIND[i - W + 1] === K_SKY ? 40 : (v - PV[i - W + 1]) * g) : 0;
    const jump = Math.max(up, sd, Math.min(ul, ur) > 0 ? Math.max(ul, ur) : 0);
    if (jump < 3) continue;
    const dx = x - SUNX, col = Math.exp(-(dx * dx) / 14000), k = smooth(3, 8, jump);
    const m = smooth(0.05, 0.4, samp(WORLD.mountain, PU[i], v));
    if (MATK[i] === M_WHITE) { VAL[i] = lerp(VAL[i], 3, k); continue; }
    if (MATK[i] !== M_RAMP) continue;
    const high = smooth(0.25, 0.4, hAt(PU[i], v));                             // low shores and banks get only a faint edge
    const rim = Math.round(lerp(VAL[i] + 1.1 * high, 8.9 + 1.5 * col, k * (0.3 + 0.7 * m) * high));
    if (rim > VAL[i]) VAL[i] = rim;
  }
}
// forests stand up from the ground: a lit, scalloped far edge where the canopy faces the sun, a dark near edge and its
// shadow, and a loose brickwork of crown tops inside (short dashes, never single dots; none far away)
function raiseForests() {
  for (let y = 2; y < H - 1; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, ft = FOR[i]; if (!ft) continue;
    const eyes = ft === WORLD.FOREST.EYES, fa = fogOf(PV[i]) / FOG_MAX, lift = (eyes ? 1.6 : 2.1) - 1.2 * fa;
    if (!FOR[i - W]) {
      VAL[i] = Math.round(VAL[i] + lift);
      if (hash2(x >> 1, 3, 31) > 0.45 && KIND[i - W] === K_LAND && MATK[i - W] === M_RAMP) VAL[i - W] = VAL[i];   // a crown standing above the edge
    } else if (!FOR[i + W]) { VAL[i] -= 0.8; if (KIND[i + W] === K_LAND && MATK[i + W] === M_RAMP) VAL[i + W] -= 1.0; }
  }
  for (let gy = 2; gy < H - 2; gy += 3) for (let gx = ((gy / 3) & 1) * 3; gx < W - 3; gx += 6) {
    const x = gx + ((hash2(gx, gy, 37) * 3) | 0) - 1, y = gy + (hash2(gx, gy, 38) > 0.5 ? 1 : 0), i = y * W + x;
    if (x < 1 || !FOR[i] || !FOR[i + 1] || !FOR[i - W] || !FOR[i + W] || hash2(gx, gy, 39) < 0.25) continue;
    const eyes = FOR[i] === WORLD.FOREST.EYES, fa = fogOf(PV[i]) / FOG_MAX;
    if (fa > 0.62) continue;
    const top = Math.round(VAL[i] + (eyes ? 1.0 : 1.5) - 0.8 * fa);
    VAL[i] = VAL[i + 1] = top; VAL[i + W] -= 0.7; VAL[i + W + 1] -= 0.7;
  }
}

// ---------------------------------------------------------------- rivers and roads: drawn as lines so they never break
function plotLine(x0, y0, x1, y1, fn) {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
  for (;;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } }
}
const onLand = (i, v) => KIND[i] === K_LAND && Math.abs(PV[i] - v) <= 0.03 && MATK[i] !== M_WHITE;   // not hidden behind nearer ground
function drawRivers() {                           // threads of reflected sky
  for (const r of WORLD.RIVERS) {
    const major = r.named;
    let px = 0, py = 0, have = false;
    for (let k = 0; k < r.pts.length; k++) {
      const u = r.pts[k][0], v = r.pts[k][1], w = r.w[k];
      const x = Math.round(projX(u, v)), y = Math.round(projY(v, hAt(u, v)));
      if (w <= 0.02 || (!major && w < 0.45)) { have = false; continue; }
      const wide = major && w > 0.6 && v > 0.42;
      const put = (xx, yy) => {
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) return;
        const i = yy * W + xx;
        if (!onLand(i, v)) return;
        const dx = xx - SUNX;
        const fv = Math.round(Math.min(10, (MATK[i] === A_GOLD ? 9 : VAL[i]) + (major ? 2.0 : 1.2) + 0.8 * Math.exp(-(dx * dx) / 12000)));
        VAL[i] = fv; MATK[i] = M_RAMP;
        if (wide && xx + 1 < W && onLand(i + 1, v)) { VAL[i + 1] = fv; MATK[i + 1] = M_RAMP; }
      };
      if (have) plotLine(px, py, x, y, put);
      px = x; py = y; have = true;
    }
  }
}
let LAMPS = [];
function drawRoads() {                            // pale dirt tracks; the lamp road carries a line of lamps
  LAMPS = [];
  for (const r of WORLD.ROADS) {
    let px = 0, py = 0, have = false, n = 0;
    for (let k = 0; k < r.pts.length; k++) {
      const u = r.pts[k][0], v = r.pts[k][1];
      const x = Math.round(projX(u, v)), y = Math.round(projY(v, hAt(u, v)));
      const put = (xx, yy) => {
        if (xx < 0 || yy < 1 || xx >= W || yy >= H) return;
        const i = yy * W + xx;
        if (!onLand(i, v)) return;
        const wheat = MATK[i] === A_GOLD || VAL[i] > 8.6;
        VAL[i] = wheat ? 9 : Math.round(VAL[i] + 1.3); MATK[i] = M_RAMP;
        if (r.kind === 'lamp' && (n++ % 6) === 2) LAMPS.push(i - W);
      };
      if (have) plotLine(px, py, x, y, put);
      px = x; py = y; have = true;
    }
  }
}

// ---------------------------------------------------------------- places: hand-drawn sprites, silhouetted, rim-lit on the edges that face the sun
const C_BODY = 1, C_LAMP = 3, C_EMBER = 4, C_ICE = 5, C_CREAM = 6, C_FLAT = 7, C_RIM = 8;
const CODE = { '#': C_BODY, '+': C_LAMP, e: C_EMBER, i: C_ICE, w: C_CREAM, s: C_FLAT, r: C_RIM };
function sprite(rows) { const h = rows.length, w = rows[0].length, d = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = CODE[rows[y][x]] || 0; return { w, h, d }; }
const SP = {};
function buildSprites() {
  SP.castles = SPR.castles.map(sprite); SP.spires = sprite(SPR.spires); SP.handL = sprite(SPR.handL); SP.handR = sprite(SPR.handR);
  SP.mill = sprite(SPR.mill); SP.sails = SPR.sails.map(sprite); SP.stones = SPR.stones.map(sprite); SP.city = sprite(SPR.city);
  SP.clockwork = SPR.clockwork.map(sprite); SP.wreck = SPR.wreck.map(sprite); SP.cavern = sprite(SPR.cavern);
  SP.crystal = SPR.crystal.map(sprite); SP.bloom = SPR.bloom.map(sprite); SP.ship = sprite(SPR.ship); SP.bird = SPR.bird.map(sprite);
  SP.storm = sprite(SPR.storm);
}
const inkOf = (x, v) => 0.3 + (fogVal(x) - 0.3) * fogOf(v) * 0.75;           // a silhouette's value: the darkest colour near, hazed far away
// stamp into the baked layers. (x0, y0) = top-left; v = the sprite's depth: pixels behind nearer ground stay hidden
function stamp(sp, x0, y0, v, buf, bufSh) {
  const sun = SUNX >= x0 + sp.w / 2 ? 1 : -1, w = sp.w;
  for (let j = 0; j < sp.h; j++) for (let k = 0; k < w; k++) {
    const c = sp.d[j * w + k]; if (!c) continue;
    const x = x0 + k, y = y0 + j; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x;
    if (KIND[i] !== K_SKY && PV[i] > v + 0.02) continue;
    let idx, idxSh;
    if (c === C_LAMP) idx = idxSh = A_LAMP; else if (c === C_EMBER) idx = idxSh = A_EMBER;
    else if (c === C_ICE) { idx = A_ICE; idxSh = A_ICE2; } else if (c === C_CREAM) { idx = 11; idxSh = A_ICE; }
    else if (c === C_RIM) { idx = 9; idxSh = 8; }
    else {
      const ink = inkOf(x, v); let rim = 0;
      if (c === C_BODY && v > 0.4) {                                         // far, tiny things stay plain silhouettes
        let top = true, side = true;
        for (let jj = 0; jj < j; jj++) if (sp.d[jj * w + k]) { top = false; break; }
        for (let kk = k + sun; kk >= 0 && kk < w; kk += sun) if (sp.d[j * w + kk]) { side = false; break; }
        rim = top ? 2 : side ? 1 : 0;
      }
      // a bright rim only where what lies behind is dark enough for it to read; elsewhere a quiet lift, so the outline is never eaten
      const bi = rim === 2 ? i - W : i + sun, behind = rim && bi >= 0 && bi < W * H ? BASE[bi] : 0, darkBack = behind < 6 || (behind >= 12 && behind !== A_GOLD);
      const dxs = x - SUNX, col = Math.exp(-(dxs * dxs) / 14000);
      idx = ci(Math.round(!rim ? ink : darkBack && buf === BASE ? (rim === 2 ? 9.1 + 1.2 * col : 8.2 + 1.0 * col) : ink + (rim === 2 ? 2.2 : 1.2))); idxSh = rim ? ci(idx - 1) : idx;
    }
    buf[i] = idx; if (bufSh) { bufSh[i] = idxSh; if (KIND[i] === K_SEA) KIND[i] = K_LAND; }   // a sprite standing in water is not water: the sea's sway must not shear it
  }
}
const PLACE = {};                                 // key -> { x, y (ground point), top, w } in canvas px, for the labels
let MILLS = [], CITY = [], EMBERS = [], EYES = [], BOLTS = [], STARS = [];
function ground(u, v) { return [Math.round(projX(u, v)), Math.round(projY(v, hAt(u, v)))]; }
function putPlace(key, sp, u, v, dx, dy) {
  const g = ground(u, v), x0 = g[0] - (sp.w >> 1) + (dx || 0), y0 = g[1] - sp.h + 1 + (dy || 0);
  stamp(sp, x0, y0, v, BASE, BASESH);
  PLACE[key] = { x: g[0] + (dx || 0), y: g[1], top: y0, w: sp.w };
  return [x0, y0];
}
function placeAll() {
  MILLS = []; CITY = []; EMBERS = []; EYES = []; BOLTS = [];
  const rng = mulberry32(99);
  const pois = WORLD.POIS.slice().sort((a, b) => a.v - b.v);                // far ones first, so nearer ones overlap them
  let nStone = 0, nWreck = 0;
  for (const p of pois) {
    const u = p.u, v = p.v, g = ground(u, v);
    PLACE[p.key] = { x: g[0], y: g[1], top: g[1], w: 1 };
    switch (p.type) {
      case 'castle': putPlace(p.key, SP.castles[p.variant], u, v); break;
      case 'spires': putPlace(p.key, SP.spires, u, v); break;
      case 'stone_hands': putPlace(p.key + '_r', SP.handR, u, v, 7, 0); putPlace(p.key, SP.handL, u, v, -5, 1); PLACE[p.key].w = 24; PLACE[p.key].x += 6; break;
      case 'windmill': { const o = putPlace(p.key, SP.mill, u, v); MILLS.push({ x: o[0] - 1, y: o[1] - 4, v, ph: MILLS.length }); break; }
      case 'standing_stone': putPlace(p.key, SP.stones[nStone++ % 3], u, v); break;
      case 'city': {
        const o = putPlace(p.key, SP.city, u, v), sp = SP.city;
        for (let j = 0; j < sp.h; j++) for (let k = 0; k < sp.w; k++) if (sp.d[j * sp.w + k] === C_LAMP) { const i = (o[1] + j) * W + o[0] + k; if (BASE[i] === A_LAMP) CITY.push(i); }
        break;
      }
      case 'clockwork_tower': putPlace(p.key, SP.clockwork[p.variant], u, v); break;
      case 'wreckage': putPlace(p.key, SP.wreck[nWreck++ % 3], u, v); break;
      case 'cavern': putPlace(p.key, SP.cavern, u, v, -4, -7); break;
      case 'crystal_grove': for (let k = 0; k < 6; k++) { const a = k * 2.4, r = 0.006 + 0.018 * rng(); putPlace(p.key + (k ? k : ''), SP.crystal[k % 3], u + Math.cos(a) * r, v + Math.sin(a) * r * 0.8); } break;
      case 'flower_field': for (let k = 0; k < 7; k++) { const a = k * 2.4 + 1, r = 0.004 + 0.024 * rng(); putPlace(p.key + (k ? k : ''), SP.bloom[k % 3], u + Math.cos(a) * r, v + Math.sin(a) * r * 0.7); } break;
      case 'isles': putPlace(p.key + '_ship', SP.ship, u - 0.012, v + 0.004); break;
      case 'storm_valley': { const o = putPlace(p.key, SP.storm, u, v, 0, -7); BOLTS.push({ x: o[0] + 5, y: o[1] + 4, v, ph: BOLTS.length * 2.3 }); break; }
      case 'dark_forest':
        for (let k = 0; k < 40 && EYES.length < 7; k++) {
          const uu = u + (rng() - 0.5) * 0.11, vv = v + (rng() - 0.5) * 0.12, c = cellOf(uu, vv);
          if (WORLD.forestType[c] !== WORLD.FOREST.EYES || WORLD.forest[c] < 0.6) continue;
          const e = ground(uu, vv), i = e[1] * W + e[0];
          if (EYES.every(o => Math.abs(o.i % W - e[0]) + Math.abs(((o.i / W) | 0) - e[1]) > 7)) EYES.push({ i, ph: rng() * 9 });
        }
        break;
    }
  }
  for (const pk of WORLD.PEAKS) if (pk.key.indexOf('fire_dragon') === 0) {      // embers in the craters of the three biggest cones
    const crater = pk.key === 'fire_dragon_1' || pk.key === 'fire_dragon_4' || pk.key === 'fire_dragon_7';
    if (!crater) continue;
    const g = ground(pk.u, pk.v);
    EMBERS.push({ i: g[1] * W + g[0], big: pk.key === 'fire_dragon_1', v: pk.v });
  }
  for (const i of LAMPS) if (KIND[i] === K_LAND) BASE[i] = BASESH[i] = A_LAMP;
  STARS = [];                                                                // a few last stars high in the dark of the sky
  const sr = mulberry32(7);
  for (let k = 0; k < 60 && STARS.length < 26; k++) { const x = (sr() * W) | 0, y = (sr() * HZ * 0.5) | 0, i = y * W + x; if (BASE[i] <= 3) STARS.push({ i, rank: sr(), ph: sr() * 6.28 }); }
}

function bake() {
  MATK.fill(M_RAMP); FOR.fill(0);
  paintSky(); marchTerrain(); shadeTerrain(); lightCrests(); raiseForests(); drawRivers(); drawRoads();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, mk = MATK[i];
    if (mk >= 12) { BASE[i] = mk; BASESH[i] = mk === A_GOLD ? 9 : mk === A_ICE ? A_ICE2 : mk; continue; }
    if (mk === M_WHITE) { BASE[i] = whiteIdx(VAL[i], x, y); BASESH[i] = whiteIdx(VAL[i] - 1.1, x, y); continue; }
    if (KIND[i] === K_SKY) { BASE[i] = BASESH[i] = ci(dithW(VAL[i], x, y, 0.42, 0.58)); continue; }
    BASE[i] = ci(dithW(VAL[i], x, y, 0.47, 0.53)); BASESH[i] = ci(dithW(VAL[i] - 1.25, x, y, 0.47, 0.53));
  }
  placeAll();
  buildWater();
}

// ---------------------------------------------------------------- small constant motion: glitter, shimmer, sails, windows, ember, eyes
let GLIT = [], SHIM = [];
function buildWater() {
  GLIT = []; SHIM = [];
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (KIND[i] === K_SEA && PV[i] < V_N + 0.03 && Math.abs(x - SUNX) < 3 + (y - HZ) * 0.5 && BASE[i] < 11) GLIT.push(i);
    else if ((KIND[i] === K_SEA || KIND[i] === K_LAKE) && BASE[i] < 11 && hash2(x >> 1, y, 7) > 0.93) SHIM.push(i);
  }
}
// the near sea breathes: each row of water slides a pixel left or right, slowly, out of step with its neighbours
// (the far sea keeps still: it is too small to move, and the glitter path lives there)
function seaSway(t) {
  const y0 = HZ + Math.round((H - HZ) * 0.16);
  for (let y = y0; y < H; y++) {
    const amp = Math.min(1.4, 0.7 + (y - y0) / 120), off = Math.round(Math.sin(y * 0.37 + t * 0.8) * amp);
    if (!off) continue;
    const row = y * W, x0 = off > 0 ? 0 : -off, x1 = off > 0 ? W - off : W;
    for (let x = x0; x < x1; x++) { const i = row + x; if (KIND[i] === K_SEA && KIND[i + off] === K_SEA) IDX[i] = BASE[i + off]; }
  }
}
function drawLife(t) {
  const tick = (t * 5) | 0;
  for (let k = 0; k < GLIT.length; k++) { const i = GLIT[k], x = i % W, y = (i / W) | 0; if (hash2(x >> 1, y, tick) > 0.86) IDX[i] = 11; }
  for (let k = 0; k < SHIM.length; k++) { const i = SHIM[k]; if (Math.sin(t * 1.3 + ((i >> 1) % 97) * 0.7) > 0.3 && IDX[i] < 11) IDX[i] = IDX[i] + 1; }
  for (const m of MILLS) stamp(SP.sails[((t * 1.4 + m.ph * 0.5) | 0) & 1], m.x, m.y, m.v, IDX, null);
  for (let k = 0; k < CITY.length; k++) if (hash2(k, (t * 1.3 + k * 0.37) | 0, 5) < 0.1) IDX[CITY[k]] = IDX[CITY[k] + W] === A_LAMP ? IDX[CITY[k] - W] : IDX[CITY[k] + W];
  for (const e of EMBERS) {
    const p = 0.5 + 0.5 * Math.sin(t * 0.9 + e.v * 40);
    IDX[e.i] = A_EMBER; if (e.big) { IDX[e.i - 1] = A_EMBER; if (p > 0.35) IDX[e.i + 1] = A_EMBER; if (p > 0.7) IDX[e.i - W] = A_LAMP; }
  }
  for (const e of EYES) { const s = (t * 0.5 + e.ph) % 4.5; if (s > 0.25) { IDX[e.i] = 10; IDX[e.i + 2] = 10; } }
  for (const s of STARS) if (Math.sin(t * (0.7 + s.rank) + s.ph) > -0.55) IDX[s.i] = s.rank > 0.75 ? 10 : s.rank > 0.4 ? 8 : 6;
  // three birds far below the camera, crossing the land in a loose line
  for (let k = 0; k < 3; k++) {
    const bx = Math.round(((188 + t * 4.2 - k * 9) % (W + 40) + W + 40) % (W + 40) - 20), by = Math.round((372 + 22 * Math.sin(t * 0.06 + 1) + (k === 1 ? -5 : k * 3)) * KY);
    const sp = SP.bird[((t * 2.6 + k * 0.4) | 0) & 1];
    for (let j = 0; j < sp.h; j++) for (let q = 0; q < sp.w; q++) if (sp.d[j * sp.w + q]) { const x = bx + q, y = by + j; if (x >= 0 && x < W && y >= 0 && y < H) IDX[y * W + x] = 0; }
  }
  for (const b of BOLTS) {                                                   // the storm valleys: a short double flicker of lightning now and then
    const s = (t + b.ph) % 5.3;
    if (s < 0.1 || (s > 0.18 && s < 0.26)) for (let k = 0; k < 5; k++) { const i = (b.y + k) * W + b.x + ((k * 3 + 1) >> 1) % 2 - (k > 2 ? 1 : 0); if (KIND[i] !== K_SKY && PV[i] <= b.v + 0.02) IDX[i] = 11; }
  }
}

// ---------------------------------------------------------------- cumulus over the land: stacks of sphere-shaded puffs (tips.js genCumulus / renderClouds),
// lit from the scene's own sun, on the white ramp. Each is baked once into a small sprite and drifts east; its shadow falls on the ground below it.
const CLOUD_DEFS = [   // x, y (base line), width, height, seed, speed px/s, altitude px (how far below the cloud its shadow lies)
  [200, 248, 22, 8, 25, 0.18, 12],
  [34, 318, 30, 12, 21, 0.22, 16],
  [286, 372, 44, 16, 22, 0.26, 22],
  [12, 404, 56, 22, 23, 0.34, 28],
  [206, 520, 64, 22, 24, 0.42, 36],
];
let CLOUDS = [];
function genCumulus(cx, baseY, width, height, seed) {
  const rng = mulberry32(seed), puffs = [], tiers = 4;
  for (let k = 0; k < tiers; k++) {
    const u = k / (tiers - 1), tw = width * (1 - u * 0.6) * (0.85 + rng() * 0.2), ty = baseY - u * height * 0.8;
    const n = Math.max(2, Math.round(tw / (width * 0.16)));
    for (let i = 0; i < n; i++) {
      const px = cx - tw / 2 + (i + 0.5) * (tw / n) + (rng() - 0.5) * width * 0.08 + u * (rng() - 0.3) * width * 0.08;
      const big = rng() < 0.45, r = (big ? 0.14 + rng() * 0.08 : 0.07 + rng() * 0.05) * width * (1 - u * 0.2);
      const edge = Math.abs((i + 0.5) / n - 0.5) * 2;                        // the ends of a tier sit higher: a rounded underside, no flat base
      puffs.push({ x: px, y: ty - r * (k === 0 ? 0.8 : 0.3) + (rng() - 0.5) * height * 0.2 - (k === 0 ? edge * edge * height * 0.3 : 0), r, z: k * 10 + (big ? 0 : 5) + rng() * 4, cx, cy: baseY - height * 0.45, cw: width * 0.55, ch: height * 0.7 });
    }
  }
  return puffs.sort((a, b) => a.z - b.z);
}
function bakeCloud(def) {
  const [x0, y0, cw, chh, seed, speed, alt] = def, pad = Math.ceil(cw * 0.28), bw = cw + pad * 2, bh = Math.ceil(chh * 1.5) + pad * 2;
  const pix = new Uint8Array(bw * bh).fill(255), cx = bw / 2, baseY = bh - pad;
  let lx = SUNX - x0, ly = (SUNY - y0) * 1.4; const ll = Math.hypot(lx, ly); lx = lx / ll * 0.84; ly = ly / ll * 0.84; const lz = 0.42;
  const far = clamp((y0 - HZ) / (H - HZ), 0, 1);
  for (const p of genCumulus(cx, baseY, cw, chh, seed)) {
    const R = p.r * 1.15;
    for (let y = Math.max(0, Math.floor(p.y - R)); y <= Math.min(bh - 1, Math.ceil(p.y + R)); y++) for (let x = Math.max(0, Math.floor(p.x - R)); x <= Math.min(bw - 1, Math.ceil(p.x + R)); x++) {
      const dx = (x - p.x) / p.r, dy = (y - p.y) / (p.r * (y > p.y ? 0.8 : 1)), ang = Math.atan2(dy, dx);   // a little flatter below: we look down on it
      const edge = 1 + (vnoise(Math.cos(ang) * 3 + p.x * 0.1, Math.sin(ang) * 3 + p.y * 0.1, 5) - 0.5) * 0.34;
      const q = (dx * dx + dy * dy) / (edge * edge);
      if (q > 1) continue;
      let nx = dx, ny = dy, nz = Math.sqrt(Math.max(0, 1 - q));
      const gx = (x - p.cx) / p.cw, gy = (y - p.cy) / p.ch, gz = Math.sqrt(Math.max(0.05, 1 - gx * gx - gy * gy)), gl = Math.hypot(gx, gy, gz);
      nx = nx * 0.4 + (gx / gl) * 0.6; ny = ny * 0.4 + (gy / gl) * 0.6; nz = nz * 0.4 + (gz / gl) * 0.6;
      const nl = Math.hypot(nx, ny, nz), lam = Math.max(0, (nx * lx + ny * ly + nz * lz) / nl);
      let v = 0.22 + 0.85 * lam - 0.12 * clamp((y - (baseY - chh * 0.3)) / (chh * 0.3), 0, 1);
      v = lerp(v, 0.62, 0.45 * (1 - far));                                  // far clouds lose contrast in the haze
      pix[y * bw + x] = WHITE[clamp(dithW(clamp(v, 0, 1) * 3.3 - 0.15, x, y, 0.42, 0.58), 0, 3)];
    }
  }
  // the shadow: the cloud's own outline, flattened onto the ground
  const sw = bw, shh = Math.max(3, Math.round(bh * 0.42)), shd = new Uint8Array(sw * shh);
  for (let y = 0; y < shh; y++) for (let x = 0; x < sw; x++) {
    const sy = Math.min(bh - 1, Math.round((y + 0.5) / shh * bh));
    let n = 0; for (let k = -1; k <= 1; k++) { const xx = clamp(x + k, 0, bw - 1); if (pix[sy * bw + xx] !== 255) n++; }
    shd[y * sw + x] = n === 3 ? 1 : n > 0 && bay(x, y) > 0.5 ? 1 : 0;
  }
  return { fx: x0 - bw / 2, y: y0 - baseY, bw, bh, pix, speed, alt, sw, shh, shd, pad };
}
function buildClouds() { CLOUDS = CLOUD_DEFS.map(bakeCloud); }
function cloudX(c, t) { const span = W + c.bw + 40; return Math.round(((c.fx + c.speed * t + c.bw + 20) % span + span) % span - c.bw - 20); }
function drawCloudShadows(t) {
  for (const c of CLOUDS) {
    const x0 = cloudX(c, t) + Math.round((c.fx + c.bw / 2 - SUNX) * 0.06), y0 = c.y + c.bh - c.pad + c.alt - c.shh;
    for (let j = 0; j < c.shh; j++) { const y = y0 + j; if (y < 0 || y >= H) continue; for (let k = 0; k < c.sw; k++) { const x = x0 + k; if (x < 0 || x >= W || !c.shd[j * c.sw + k]) continue; const i = y * W + x; if (KIND[i] !== K_SKY) IDX[i] = BASESH[i]; } }
  }
}
function drawClouds(t) {
  for (const c of CLOUDS) {
    const x0 = cloudX(c, t);
    for (let j = 0; j < c.bh; j++) { const y = c.y + j; if (y < 0 || y >= H) continue; for (let k = 0; k < c.bw; k++) { const x = x0 + k; if (x < 0 || x >= W) continue; const p = c.pix[j * c.bw + k]; if (p !== 255) IDX[y * W + x] = p; } }
  }
}

// ---------------------------------------------------------------- labels: a separate overlay, off by default. Level 1 = region names, level 2 = every name
// [level, lines, anchor, dx, dy]: anchor = a place key (its ground point) or [x, y] in design px; (dx, dy) moves the
// top-centre of the text block from there. Region names use the BIG font, letter-spaced; place names the SMALL one.
const LABEL_DEFS = [
  [1, ['THE UNKNOWN SEA'], [64, 190], 0, 0],
  [1, ['THE NORTHERN LANDS'], [234, 202], 0, 0],
  [1, ['THE VERDANT', 'REACH'], [100, 363], 0, 0],
  [1, ['THE EASTERN', 'KINGDOM'], [240, 322], 0, 0],
  [1, ['THE MAGE', 'KINGDOMS'], [243, 430], 0, 0],
  [2, ['Still Water'], 'still_water', -30, -6],
  [2, ['Starbloom Fields'], 'starbloom_fields', 38, -9],
  [2, ['Forest', 'of Eyes'], 'forest_of_eyes', -28, -4],
  [2, ['Colossal', 'Spires'], 'colossal_spires', -24, -18],
  [2, ['Stone Hands'], 'stone_hands', 0, 4],
  [2, ['Castle of', 'the Order'], 'castle_order', -30, -6],
  [2, ['the wheat country'], 'wheat_country', 6, -3],
  [2, ['the green valleys'], 'green_valleys', -12, 34],
  [2, ['Cavern of', 'Giants'], 'cavern_of_giants', 31, -10],
  [2, ["the toad's swamp"], 'toad_swamp', 9, -11],
  [2, ['the mountain path'], 'mountain_path', -46, 12],
  [2, ['Fire-Dragon Peaks'], 'fire_dragon_peaks', 2, 18],
  [2, ['Mount of the', 'Buried Machine'], 'buried_machine', 10, 6],
  [2, ['Silent', 'Battlefield'], 'silent_battlefield', 22, 12],
  [2, ['Artifact Isles'], 'artifact_isles', -30, 12],
];
const LBOX = [];                                  // the drawn label boxes [x0, y0, x1, y1, text], for the layout check
function buildLabels() {
  LAB.fill(255); LBOX.length = 0;
  if (!G.labels) return;
  const ink = new Uint8Array(W * H);
  for (const [lvl, lines, anchor, dx, dy] of LABEL_DEFS) {
    if (lvl > G.labels) continue;
    const big = lvl === 1, font = big ? FONT.BIG : FONT.SMALL, track = big ? 2 : 1, lh = font.h + (big ? 3 : 2);
    const p = typeof anchor === 'string' ? PLACE[anchor] : null;
    const cx = (p ? p.x : anchor[0]) + dx, top = Math.round((p ? p.y : anchor[1] * KY) + dy * (p ? 1 : KY));
    let bx0 = W, bx1 = 0;
    lines.forEach((text, n) => {
      const w = FONT.width(font, text, track), x0 = Math.round(clamp(cx - w / 2, 2, W - 2 - w));
      bx0 = Math.min(bx0, x0); bx1 = Math.max(bx1, x0 + w);
      FONT.plot(font, text, x0, top + n * lh, track, (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) ink[y * W + x] = big ? 2 : 1; });
    });
    LBOX.push([bx0 - 1, top - 1, bx1 + 1, top + lines.length * lh - (big ? 3 : 2) + 1, lines.join(' ')]);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (ink[i]) { LAB[i] = 11; continue; }
    let near = 0;                                                            // a 1 px dark outline all round, so the text reads on any ground
    for (let j = -1; j <= 1 && !near; j++) for (let k = -1; k <= 1; k++) { const xx = x + k, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy < H && ink[yy * W + xx]) { near = 1; break; } }
    if (near) LAB[i] = 0;
  }
}

// ---------------------------------------------------------------- module contract
const G = { t: 0, labels: 0 };
function init() { buildPal(); buildProjection(); prepWorld(); buildSprites(); }
function setH(h) {
  H = h; KY = (H / H_DESIGN); HZ = Math.round(180 * KY); SUNY = HZ - 34;
  const n = W * H;
  VAL = new Float32Array(n); MATK = new Uint8Array(n); PU = new Float32Array(n); PV = new Float32Array(n); KIND = new Uint8Array(n);
  FOR = new Uint8Array(n); BASE = new Uint8Array(n); BASESH = new Uint8Array(n); IDX = new Uint8Array(n); LAB = new Uint8Array(n);
  bake(); buildClouds(); buildLabels();
}
function setOut(buf) { OUT32 = buf; }
function setLabels(on) { G.labels = on === true ? 2 : (on | 0); if (LAB) buildLabels(); }
function update(dt) { G.t += dt; }
function render(t) {
  IDX.set(BASE);
  seaSway(t);
  drawCloudShadows(t);
  drawLife(t);
  drawClouds(t);
  if (G.labels) for (let i = 0, n = W * H; i < n; i++) { const l = LAB[i]; if (l !== 255) IDX[i] = l; }
  for (let i = 0, n = W * H; i < n; i++) OUT32[i] = PAL[IDX[i]];
}
const API = { init, setH, setOut, update, render, setLabels, G, W, PLACE, LBOX, get H() { return H; } };
if (!IS_BROWSER) module.exports = API; else window.WM_A = API;
})();
