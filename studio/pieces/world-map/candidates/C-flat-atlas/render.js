/* The Verdant Reach: world map. Candidate C: a flat top-down pixel atlas.
   A true map seen from straight above, painted by the pixel-scenes rules: one hue-shifting ramp
   (navy sea > teal shade > green land > straw > cream light), clean bands with dither only at band
   edges, a low sun mirrored in the Unknown Sea in the upper left, and hand-drawn sprites.
   Everything static is baked once per screen height; per frame only small things move.

   BRIEF  subject: the continent, one land in a dark sea.
          light:   a low sun's mirror image on the Unknown Sea, upper left, in frame: a solid disc, ring
                   bands, and a glitter path running down the light's diagonal toward the land. The relief
                   is lit from the same side, and the land is a little lighter near it, darker far away.
          canvas:  portrait 320 x 568 (a phone). The map is a 320 px square; the spare height goes to the
                   Unknown Sea, where the light lives. Other heights (480 to 640) re-bake the same picture.
          focal:   the gold wheat country in the middle of the land, the only warm area.
          moves:   cloud shadows, the swell at the edges of the sea bands, glints, surf, a gust over the
                   wheat, mill blades, windows and lamps, eyes in the dark forest, embers, lightning.

   Node:  const M = require('./render.js');  M.init(); M.setH(568); M.setOut(u32); M.update(dt); M.render(t);
          M.setLabels(0 | 1 | 2)  0 none (default), 1 the five region names, 2 every name.
   Data:  ../../src/world.js (never edited here). Sprites: ./sprites.js. Label fonts: ./font.js. */
(function () {
'use strict';
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
const WORLD = IS_BROWSER ? window.WORLD : require('../../src/world.js');
const SPR = IS_BROWSER ? window.ATLAS_SPRITES : require('./sprites.js');
const FONT = IS_BROWSER ? window.ATLAS_FONT : require('./font.js');

// ---------------------------------------------------------------- constants
const W = 320, MAPS = 320, H_MIN = 480, H_MAX = 640, H_DEF = 568;
let H = H_DEF, MAPY = 184, GLY = 58;                         // MAPY = the screen row of the map's north edge (v = 0)
const G = { t: 0, labels: 0 };
const SEA = 0, LAND = 1, LAKE = 2;                 // pixel kinds
const M_MAIN = 0, M_WHEAT = 1, M_SNOW = 2;         // material ramps
const GOLD0 = 12, GOLD1 = 13, GOLD2 = 14, SNOW0 = 15, SNOW1 = 16, EMBER = 17, SNOW2 = 18;
const LIGHT_A = 0.5, LIGHT_B = 0.7071;             // light from the upper left, 45 degrees up
const SHADOW_RISE = 0.036;                         // height a light ray gains per diagonal pixel (sets shadow length)
const GLINT_X = 50, GLINT_UP = 126, GLINT_MINY = 40;   // the sun glint: x, rows above the map's north edge, and its highest row
const GLINT_ANGLE = 0.78, GLINT_STRETCH = 3.0, GLINT_R = 9.5;     // the way the light spills: down and to the right, and how far
const MAP_DROP = 0.78;                             // share of the spare height that goes above the map (to the Unknown Sea)
const SNOW_DROP = 0.07;                            // how far below the data's snow line the painted snow reaches
const TREE_TOP = 0.455;                            // no trees above this height
const CELL = 4;                                    // tree clump grid, px
const NS = 512;                                    // cloud shadow texture size
const CLOUD_VX = 2.0, CLOUD_VY = 0.7;              // cloud shadow drift, px per second
const CLOUD_CUT = 172;                            // a cloud shadow lies where the drifting noise is above this (0..255)
const CLOUD_OX = 432, CLOUD_OY = 504;              // where the drift starts, measured from the map, so every height opens the same
const FT = WORLD.FOREST;

// ---------------------------------------------------------------- utils (from the pixel-scenes examples)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
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
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
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
// squeeze a value toward whole ramp steps, so slow gradients still give flat bands and a thin seam
function sharpen(f, k) {
  const fl = Math.floor(f), fr = f - fl;
  return fl + smooth(0.5 - k, 0.5 + k, fr);
}

// ---------------------------------------------------------------- palette
const hexc = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
// one cool-dawn ramp: navy deep sea > blue shade > teal > green land > straw > cream light
const RAMP = ['#060b17', '#0a1426', '#0f1f38', '#142c49', '#193b59', '#1e4c63', '#275e68', '#36726a', '#4f8a6c', '#79a877', '#afc790', '#ecefd2'];
// 12-14 wheat gold, 15-16 snow shade (also the crystal groves), 17 ember, 18 snow white (same colour as ramp 11)
const ACC = ['#8a7d40', '#c2a652', '#e8d584', '#5f86a0', '#aac6d2', '#d2552c', '#ecefd2'];
const NPAL = 19;
const PAL = new Uint32Array(NPAL);
function buildPalette() {
  const all = RAMP.concat(ACC).map(hexc);
  for (let i = 0; i < NPAL; i++) PAL[i] = (0xff000000 | (all[i][2] << 16) | (all[i][1] << 8) | all[i][0]) >>> 0;
}
const LUT_WHEAT = [GOLD0, GOLD1, GOLD2], LUT_SNOW = [4, SNOW0, SNOW1, SNOW2];
// one step darker inside each ramp: what a cloud shadow does to a finished pixel
const DARK = new Uint8Array(NPAL);
function buildDark() {
  for (let i = 0; i < 12; i++) DARK[i] = i > 0 ? i - 1 : 0;
  DARK[GOLD0] = GOLD0; DARK[GOLD1] = GOLD0; DARK[GOLD2] = GOLD1;
  DARK[SNOW0] = SNOW0; DARK[SNOW1] = SNOW0; DARK[SNOW2] = SNOW1; DARK[EMBER] = EMBER;
}
function toIndex(mat, v, x, y) {
  const k = dith(sharpen(v, 0.14), x, y);
  if (mat === M_WHEAT) return LUT_WHEAT[k < 0 ? 0 : k > 2 ? 2 : k];
  if (mat === M_SNOW) return LUT_SNOW[k < 0 ? 0 : k > 3 ? 3 : k];
  return k < 0 ? 0 : k > 11 ? 11 : k;
}

// ---------------------------------------------------------------- sprites (hand-drawn rows live in sprites.js)
// '#' body in shadow, 'l' lit wall, 'h' brightest edge, 'm' mid tone, 'w' window, 'o' hole, 'p' petal, 'c' bloom heart
const CH = { '.': 255, '#': 2, l: 10, h: 11, m: 7, w: GOLD2, o: 0, c: 11, p: SNOW1 };
function sprite(rows, map) {
  const h = rows.length, w = rows[0].length, data = new Uint8Array(w * h).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = map[rows[y][x]]; data[y * w + x] = v === undefined ? 255 : v; }
  return { w, h, data };
}
const lit = rows => sprite(rows, CH);              // the light is drawn into the rows by hand (see sprites.js)
let S_CASTLE, S_CITY, S_SPIRES, S_HAND_L, S_HAND_R, S_MILL, S_STONE, S_CLOCK, S_WRECK, S_CAVE, S_SHIP, S_BLOOM;
function buildSprites() {
  S_CASTLE = SPR.CASTLES.map(lit); S_CITY = lit(SPR.CITY); S_SPIRES = lit(SPR.SPIRES);
  S_HAND_L = lit(SPR.HANDS[0]); S_HAND_R = lit(SPR.HANDS[1]);
  S_MILL = SPR.MILL.map(lit); S_STONE = SPR.STONES.map(lit); S_CLOCK = SPR.CLOCKWORK.map(lit);
  S_WRECK = SPR.WRECKS.map(lit); S_CAVE = lit(SPR.CAVE); S_SHIP = lit(SPR.SHIP); S_BLOOM = lit(SPR.BLOOM);
}

// ---------------------------------------------------------------- buffers (allocated per screen height)
let NPX = 0, OUT = null;
let HT, CD, FO, SN, MT, WH, WA, SHD, CAST, VAL;     // Float32: height, coast distance, forest, snow, mountain, wheat, wheat angle, shade, cast shadow, ramp value
let KIND, FTY, RG, MAT, CAN, CSH, IDX0, FRAME, GROUNDSH, SHADE;   // Uint8 / Int8
let WF;                                              // Uint16 wheat field id
const NT = new Uint8Array(NS * NS);                  // cloud shadow noise, tileable
// small moving things, filled by the bake
let GLINT_I, GLINT_L, GLINT_P, GLINT_C, NGLINT = 0;  // sea glints: pixel, length, phase, colour
let WIN_I = [], LAMP_I = [], EYE_I = [], BLOOM_I = [], EMBER_L = [], MILL_AT = [], SPARK_I = [], BOLT_L = [];
let LBL_I = new Int32Array(0), LBL_C = new Uint8Array(0);
let SW_I = new Int32Array(0), SW_V = new Float32Array(0), SW_A = new Float32Array(0), NSW = 0;   // sea pixels on a band edge: index, value, swing
let SURF_I = new Int32Array(0), GUST_I = new Int32Array(0);   // surf pixels along the lit shores; wheat pixels a gust can brighten

const px = u => Math.round(u * W - 0.5), py = v => MAPY + Math.round(v * MAPS - 0.5);

// ---------------------------------------------------------------- bake 1: sample the world into screen pixels
function sampleWorld() {
  for (let y = 0; y < H; y++) {
    const v = (y - MAPY + 0.5) / MAPS, vc = clamp(v, 0.002, 0.998), beyond = Math.abs(v - vc);
    for (let x = 0; x < W; x++) {
      const i = y * W + x, u = (x + 0.5) / W, c = WORLD.cell(u, vc);
      CD[i] = WORLD.sample(WORLD.coast, u, vc) - beyond;
      const sea = beyond > 0 || CD[i] <= 0;
      KIND[i] = sea ? SEA : WORLD.lake[c] ? LAKE : LAND;
      HT[i] = sea ? WORLD.SEA : Math.max(WORLD.SEA, WORLD.sample(WORLD.height, u, vc));
      FO[i] = sea ? 0 : WORLD.sample(WORLD.forest, u, vc);
      SN[i] = sea ? 0 : smooth(-0.02, 0.02, HT[i] - (WORLD.snowLineAt(vc) - SNOW_DROP));   // the data's snow line, drawn a little lower
      MT[i] = sea ? 0 : WORLD.sample(WORLD.mountain, u, vc);
      WH[i] = sea ? 0 : WORLD.sample(WORLD.wheat, u, vc);
      FTY[i] = WORLD.forestType[c]; RG[i] = WORLD.region[c]; WA[i] = WORLD.wheatAngle[c];
      WF[i] = sea || KIND[i] === LAKE || WH[i] < 0.02 ? 0 : WORLD.wheatField[c];
    }
  }
  healWheat(); seaDistance();
}
// How far each sea pixel is from land, measured on the screen itself (two chamfer sweeps), so the depth bands
// stay round outside the map's own square, where the data's coast field stops.
function seaDistance() {
  const D = new Float32Array(NPX), A = 1, B = 1.4142;
  for (let i = 0; i < NPX; i++) D[i] = KIND[i] === SEA ? 1e6 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let d = D[i];
    if (x > 0) d = Math.min(d, D[i - 1] + A);
    if (y > 0) { d = Math.min(d, D[i - W] + A); if (x > 0) d = Math.min(d, D[i - W - 1] + B); if (x < W - 1) d = Math.min(d, D[i - W + 1] + B); }
    D[i] = d;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; let d = D[i];
    if (x < W - 1) d = Math.min(d, D[i + 1] + A);
    if (y < H - 1) { d = Math.min(d, D[i + W] + A); if (x < W - 1) d = Math.min(d, D[i + W + 1] + B); if (x > 0) d = Math.min(d, D[i + W - 1] + B); }
    D[i] = d;
  }
  for (let i = 0; i < NPX; i++) if (KIND[i] === SEA) CD[i] = -D[i] / MAPS;
}
// The data leaves a square hole in the wheat around the castle hill that stands in it. Fields grow back into the
// corners of that square, so only the round hill itself stays green.
function healWheat() {
  const c = WORLD.poi('castle_6');
  if (!c) return;
  const cx = px(c.u), cy = py(c.v), R = 11, KEEP = 5.2;
  for (let pass = 0; pass < R; pass++) {
    const add = [];
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
      const i = y * W + x;
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || WF[i] || KIND[i] !== LAND || RG[i] !== 7) continue;
      if (Math.hypot(x - cx, y - cy + 2) < KEEP) continue;
      const n = WF[i - 1] ? i - 1 : WF[i + 1] ? i + 1 : WF[i - W] ? i - W : WF[i + W] ? i + W : -1;
      if (n >= 0) add.push(i, n);
    }
    for (let k = 0; k < add.length; k += 2) { WF[add[k]] = WF[add[k + 1]]; WA[add[k]] = WA[add[k + 1]]; WH[add[k]] = 1; }
  }
}
function boxBlur(src, r, passes) {
  let a = new Float32Array(src), b = new Float32Array(NPX);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0; for (let k = -r; k <= r; k++) s += a[y * W + clamp(x + k, 0, W - 1)];
      b[y * W + x] = s / (2 * r + 1);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0; for (let k = -r; k <= r; k++) s += b[clamp(y + k, 0, H - 1) * W + x];
      a[y * W + x] = s / (2 * r + 1);
    }
  }
  return a;
}
function regionMask(id, r) {                       // 0..1, soft at the edges, so no region shows a cut line
  const m = new Float32Array(NPX);
  for (let i = 0; i < NPX; i++) m[i] = RG[i] === id && KIND[i] !== SEA ? 1 : 0;
  return boxBlur(m, r, 2);
}
// Lambert light from the upper left on a height field; out = how much lighter (+) or darker (-) than flat ground
function hillshade(Hs, zLow, zHigh, out) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, xm = x > 0 ? i - 1 : i, xp = x < W - 1 ? i + 1 : i, ym = y > 0 ? i - W : i, yp = y < H - 1 ? i + W : i;
    const z = lerp(zLow, zHigh, smooth(0.30, 0.52, Hs[i]));
    const sx = (Hs[xp] - Hs[xm]) * 0.5 * z, sy = (Hs[yp] - Hs[ym]) * 0.5 * z;
    out[i] = (LIGHT_A * (sx + sy) + LIGHT_B) / Math.sqrt(1 + sx * sx + sy * sy) - LIGHT_B;
  }
}
// long shadows thrown to the lower right by high ground: walk toward the light and see what stands in the way
function castShadows() {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let worst = 0;
    if (KIND[i] !== SEA || CD[i] > -0.03) {
      const h0 = HT[i];
      for (let k = 1; k <= 18 && x - k >= 0 && y - k >= 0; k++) {
        const e = HT[i - k * (W + 1)] - (h0 + k * SHADOW_RISE);
        if (e > worst) worst = e;
      }
    }
    CAST[i] = smooth(0.0, 0.03, worst);
  }
}
function shadeRelief() {
  const fine = new Float32Array(NPX), coarse = new Float32Array(NPX);
  hillshade(HT, 48, 30, fine);
  hillshade(boxBlur(HT, 3, 2), 96, 52, coarse);
  for (let i = 0; i < NPX; i++) {
    const m = smooth(0.1, 0.7, MT[i]);                 // mountains keep their sharp faces, lowlands their broad ones
    const rel = lerp(0.5, 0.8, m) * fine[i] + lerp(0.5, 0.2, m) * coarse[i];
    SHD[i] = rel > 0 ? rel / 0.293 : rel / 0.707;      // about -1 .. +1
  }
  castShadows();
}

// ---------------------------------------------------------------- bake 2: forests as soft masses, lit along the edge that faces the light
const CLUMP_R = [0, 0.74, 0.92, 0.6, 0.66, 0.7], CLUMP_RV = [0, 0.3, 0.3, 0.2, 0.25, 0.3];   // by forest type
function growCanopy() {
  const cw = Math.ceil(W / CELL) + 2, chh = Math.ceil(H / CELL) + 2;
  const CX = new Float32Array(cw * chh), CY = new Float32Array(cw * chh), CR = new Float32Array(cw * chh), CT = new Uint8Array(cw * chh), CL = new Uint8Array(cw * chh);
  const high = j => HT[j] > TREE_TOP + (hash2(j % W, (j / W) | 0, 26) - 0.5) * 0.04 || SN[j] > 0.3;       // above the trees: rock and snow
  const glade = new Uint8Array(NPX);                 // every castle stands in a small clearing, so its shape reads
  for (const p of WORLD.POIS) if (p.type === 'castle') {
    const cx = px(p.u), cy = py(p.v) - 3;
    for (let y = cy - 6; y <= cy + 5; y++) for (let x = cx - 7; x <= cx + 7; x++) if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot((x - cx) * 0.8, y - cy) < 5.6) glade[y * W + x] = 1;
  }
  const treeAt = (x, y) => { const j = clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1); return KIND[j] === LAND && FO[j] > 0.3 && !high(j) && WF[j] === 0; };
  for (let gy = 0; gy < chh; gy++) for (let gx = 0; gx < cw; gx++) {
    const k = gy * cw + gx, cx = (gx - 1 + 0.2 + 0.6 * hash2(gx, gy, 21)) * CELL, cy = (gy - 1 + 0.2 + 0.6 * hash2(gx, gy, 22)) * CELL;
    const xi = clamp(Math.round(cx), 0, W - 1), yi = clamp(Math.round(cy), 0, H - 1), i = yi * W + xi;
    const on = KIND[i] === LAND && WF[i] === 0 && !high(i) && !glade[i] && FO[i] > 0.2 + 0.5 * hash2(gx, gy, 23);
    const t = FTY[i];
    CX[k] = cx; CY[k] = cy; CT[k] = on && t ? t : 0;
    CR[k] = CELL * (CLUMP_R[t] + CLUMP_RV[t] * hash2(gx, gy, 24));
    // a crown catches the light when nothing stands between it and the light, and now and then deep in the wood
    const open = !treeAt(xi - 5, yi - 5) || !treeAt(xi - 3, yi - 6) || !treeAt(xi - 6, yi - 3);
    CL[k] = open ? 2 : hash2(gx, gy, 25) < (t === FT.EYES ? 0.04 : 0.13) ? 1 : 0;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; CAN[i] = 0; CSH[i] = 0;
    if (KIND[i] !== LAND) continue;
    const gx = Math.floor(x / CELL) + 1, gy = Math.floor(y / CELL) + 1;
    let best = 0, bk = -1;
    for (let j = -1; j <= 1; j++) for (let q = -1; q <= 1; q++) {
      const k = (gy + j) * cw + gx + q;
      if (!CT[k]) continue;
      const dx = x - CX[k], dy = y - CY[k], b = 1 - (dx * dx + dy * dy) / (CR[k] * CR[k]);
      if (b > best) { best = b; bk = k; }
    }
    if (bk >= 0) {
      const cl = (-(x - CX[bk]) - (y - CY[bk])) / CR[bk];
      CAN[i] = CT[bk];
      CSH[i] = CL[bk] && cl > (CL[bk] === 2 ? 0.1 : 0.45) ? 1 : cl < -0.62 ? -1 : 0;
    } else if (FO[i] > 0.62 && FTY[i] && WF[i] === 0 && !high(i) && !glade[i]) { CAN[i] = FTY[i]; CSH[i] = -1; }   // the dark gaps between crowns
  }
}
const FOREST_BASE = [0, 6, 4, 5, 0, 5];
function forestValue(i) {
  const t = CAN[i], rel = clamp(SHD[i], -1, 1);
  if (t === FT.CRYSTAL) { MAT[i] = M_SNOW; return 1 + CSH[i]; }          // blue-grey crowns, pale where they catch the light
  MAT[i] = M_MAIN;
  return Math.max(FOREST_BASE[t] - 1, Math.round(FOREST_BASE[t] + CSH[i] + (rel > 0 ? rel * 0.9 : rel * 0.8) - CAST[i] * 0.7));
}

// ---------------------------------------------------------------- bake 3: the wheat country as fine gold strips
const mod = (a, m) => ((a % m) + m) % m;
function stripe(x, y, angle) {                     // 1 on a strip line, 0 between; four directions, each a clean pixel line
  let a = angle % Math.PI; if (a < 0) a += Math.PI;
  const d = Math.round(a / (Math.PI / 4)) & 3;
  return d === 0 ? (mod(y, 3) === 0 ? 1 : 0) : d === 2 ? (mod(x, 3) === 0 ? 1 : 0) : mod(d === 1 ? x + y : x - y, 4) < 2 ? 1 : 0;
}
const T_FALLOW = 0, T_GOLD = 1, T_RIPE = 2, T_GRASS = 3;
let FIELD_TONE = null;
function surveyFields() {                          // one tone per field: most are gold, some pale and ripe, a few fallow; the outer ones are often pasture
  const sum = new Float32Array(65536), cnt = new Uint32Array(65536), edge = new Uint32Array(65536);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, f = WF[i];
    if (!f) continue;
    sum[f] += WH[i]; cnt[f]++;
    if (!WF[i - 1] || !WF[i + 1] || !WF[i - W] || !WF[i + W]) edge[f]++;
  }
  FIELD_TONE = new Uint8Array(65536);
  for (let f = 1; f < 65536; f++) if (cnt[f]) {
    const mean = sum[f] / cnt[f], rim = edge[f] / cnt[f], r = hash2(f, 3, 31);
    FIELD_TONE[f] = rim > 0.1 && hash2(f, 7, 33) < 0.6 ? T_GRASS : mean < 0.35 ? T_FALLOW : r < 0.36 ? T_RIPE : T_GOLD;
  }
}
function wheatValue(i, x, y) {
  const f = WF[i], tone = FIELD_TONE[f], s = stripe(x, y, WA[i]);
  const fr = WF[i + 1], fd = WF[i + W], baulk = (fr && fr !== f) || (fd && fd !== f);
  if (tone === T_GRASS) { MAT[i] = M_MAIN; return (baulk ? 7 : 8 + s) - CAST[i] * 1.4; }
  MAT[i] = M_WHEAT;
  const v = baulk ? 0 : tone === T_RIPE ? 2 - s : tone === T_GOLD ? 1 + s * (hash2(f, 5, 32) < 0.7 ? 1 : 0) : s * 0.999;
  return v - CAST[i];
}

// ---------------------------------------------------------------- bake 4: land, sea and lakes as ramp values
let M_NORTH = null, M_ASH = null, M_SWAMP = null, M_VOLC = null;
function glowAt(x, y) {                            // the low light on the sea: 0 far away .. about 10 at its heart
  const ca = Math.cos(GLINT_ANGLE), sa = Math.sin(GLINT_ANGLE);
  const a = (x - GLINT_X) * ca + (y - GLY) * sa, b = -(x - GLINT_X) * sa + (y - GLY) * ca;
  const r = Math.hypot(a, b), rs = Math.hypot(a > 0 ? a / GLINT_STRETCH : a, b);
  return 4.0 * smooth(GLINT_R + 1, GLINT_R - 0.5, r) + 4.0 * Math.exp(-r / 34) + 3.3 * Math.exp(-rs / 56);   // a solid disc, round rings, a long spill
}
function pathAt(x, y) {                            // 1 on the glitter path that runs from the light toward the land, 0 off it
  const ca = Math.cos(GLINT_ANGLE), sa = Math.sin(GLINT_ANGLE);
  const a = (x - GLINT_X) * ca + (y - GLY) * sa, b = -(x - GLINT_X) * sa + (y - GLY) * ca;
  return a < GLINT_R ? 0 : Math.exp(-(b * b) / (40 + a * 0.9)) * smooth(250, 30, a);
}
function sweepAt(x, y) {                           // the same light, felt across the land: a little lighter near it, darker far away
  return 0.7 - 1.5 * smooth(110, 520, Math.hypot(x - GLINT_X, y - GLY));
}
function landValue(i, x, y) {
  if (CAN[i]) return forestValue(i);
  if (WF[i]) return wheatValue(i, x, y);
  const h = HT[i], sh = SHD[i], cast = CAST[i];
  if (SN[i] > 0.5 + (vnoise(x / 3.1, y / 3.1, 41) - 0.5) * 0.5 && M_VOLC[i] < 0.2) {
    MAT[i] = M_SNOW;
    return 2.25 + (sh > 0 ? sh * 1.4 : sh * 2.9) - cast * 1.5;
  }
  MAT[i] = M_MAIN;
  let base = 7.6 + 0.4 * smooth(0.22, 0.34, h) + sweepAt(x, y) + 0.35 * M_NORTH[i];
  const ash = smooth(0.35, 0.65, M_ASH[i]);
  base = lerp(base, 7.0 - (vnoise(x / 13, y / 3.5, 44) > 0.62 ? 1 : 0), ash);          // ash flats, with pale drifts
  base = lerp(base, vnoise(x / 3.2, y / 2.1, 45) > 0.7 ? 4.2 : 6.6, smooth(0.4, 0.6, M_SWAMP[i]));              // the swamp: dark pools
  const volc = M_VOLC[i] * smooth(0.25, 0.33, h);
  const rock = Math.max(smooth(0.43, 0.55, h), volc);
  base = lerp(base, lerp(8.8, 5.3, volc), rock);                           // high bare rock is pale; the volcanoes are dark cones
  const flat = 1 - 0.75 * ash * (1 - rock);                                // the ash flats are level: little relief
  let v = Math.min(10.2, base + flat * (sh > 0 ? sh * lerp(1.7, 3.0 + 3.0 * volc, rock) : sh * lerp(2.3, 2.9, rock))) - cast * lerp(1.6, 1.1, rock);
  if (x > 1 && y > 1 && (CAN[i - W - 1] || CAN[i - 2 * W - 2])) v -= 1;      // trees throw a shadow on the ground beside them
  return v;
}
function seaValue(i, x, y) {
  const d = Math.max(0, -CD[i] + (fbm(x / 42, y / 42, 51, 3) - 0.5) * 0.03);
  return 4.9 - 1.9 * (1 - Math.exp(-d / 0.05)) + glowAt(x, y);
}
function vignetteAt(x, y) {
  const r = Math.hypot((x - W * 0.5) / (W * 0.68), (y - H * 0.52) / (H * 0.62));
  return 2.1 * smooth(0.62, 1.2, r) * (1 - clamp(glowAt(x, y) / 2.5, 0, 1));
}
function paintValues() {
  surveyFields();
  M_NORTH = regionMask(4, 4); M_ASH = regionMask(12, 3); M_SWAMP = regionMask(9, 2);
  M_VOLC = new Float32Array(NPX);
  for (const P of WORLD.PEAKS) if (P.key.indexOf('fire_dragon') === 0) {
    const cx = P.u * W, cy = MAPY + P.v * MAPS, r = P.r * MAPS * 1.5;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (x >= 0 && y >= 0 && x < W && y < H) M_VOLC[y * W + x] = Math.max(M_VOLC[y * W + x], smooth(r, r * 0.6, Math.hypot(x - cx, y - cy)));
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, kd = KIND[i];
    MAT[i] = M_MAIN;
    let v;
    if (kd === SEA) v = seaValue(i, x, y) - CAST[i] * 0.9;
    else if (kd === LAKE) v = 9.9;
    else v = landValue(i, x, y);
    if (MAT[i] === M_MAIN) v -= vignetteAt(x, y) * (kd === SEA ? 1 : 0.6);
    VAL[i] = v;
  }
}
// shores: a lit edge where the land faces the light, surf where the sea meets it, a shaded bank on the far side
function paintShores() {
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, kd = KIND[i];
    const up = KIND[i - W], lf = KIND[i - 1], dn = KIND[i + W], rt = KIND[i + 1];
    if (kd === SEA) {
      if (dn === LAND || rt === LAND) { if (hash2(x, y, 61) < 0.8) VAL[i] = Math.max(VAL[i], 8.9); else VAL[i] += 1.2; }
      else if (up === LAND || lf === LAND) VAL[i] = Math.max(VAL[i] - 0.4, 3.6);
    } else if (kd === LAKE) {
      if (up === LAND || lf === LAND) VAL[i] = 6.9;
      else if (dn === LAND || rt === LAND) VAL[i] = 10.9;
    } else if (MAT[i] === M_MAIN && !CAN[i]) {
      if (up === SEA || lf === SEA) VAL[i] += 0.9;
      else if (dn === SEA || rt === SEA) VAL[i] -= 0.5;
    }
  }
}

// ---------------------------------------------------------------- bake 5: rivers and roads
function line(x0, y0, x1, y1, plot) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx - dy;
  for (;;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 > -dy) { e -= dy; x0 += sx; }
    if (e2 < dx) { e += dx; y0 += sy; }
  }
}
function polyline(pts, plot) {                     // plot(x, y, pointIndex, stepCount)
  let n = 0, lx = -999, ly = -999;
  for (let k = 0; k + 1 < pts.length; k++) {
    line(px(pts[k][0]), py(pts[k][1]), px(pts[k + 1][0]), py(pts[k + 1][1]), (x, y) => {
      if (x === lx && y === ly) return;
      lx = x; ly = y;
      if (x >= 0 && y >= 0 && x < W && y < H) plot(x, y, k, n++);
    });
  }
}
function paintRivers() {
  for (const R of WORLD.RIVERS) {
    polyline(R.pts, (x, y, k) => {
      const i = y * W + x, w = R.w[k];
      if (KIND[i] !== LAND || w < (R.named ? 0.05 : 0.3)) return;
      MAT[i] = M_MAIN; CAN[i] = 0;
      VAL[i] = R.named ? (w > 0.4 ? 10 : 9) : Math.min(9, Math.max(8, Math.round(VAL[i]) + 2));
    });
  }
}
function paintRoads() {
  LAMP_I = [];
  for (const R of WORLD.ROADS) {
    if (R.note) continue;                          // studio-proposal roads are left off the painted map
    polyline(R.pts, (x, y, k, n) => {
      const i = y * W + x;
      if (KIND[i] !== LAND || CAN[i]) return;
      if (R.kind === 'lamp') { if (n % 5 === 2) LAMP_I.push(i); else if (MAT[i] === M_MAIN) VAL[i] = Math.round(VAL[i]) - 1; }
      else if (R.kind === 'path') { if (n % 2 === 0 && MAT[i] !== M_WHEAT) VAL[i] = Math.round(VAL[i]) + (MAT[i] === M_SNOW ? -1 : 1.2); }
      else if (MAT[i] === M_WHEAT) VAL[i] = 0;
      else VAL[i] = Math.round(VAL[i]) - 1;
    });
  }
}

// ---------------------------------------------------------------- bake 6: places (sprites, their shadows, small lights)
const STAMPS = [];                                 // { s, x0, y0 } placed after the ground is dithered
function place(s, cx, baseY, shadow) {
  const x0 = cx - (s.w >> 1), y0 = baseY - s.h + 1;
  STAMPS.push({ s, x0, y0 });
  if (!shadow) return;
  for (let j = 0; j < s.h; j++) for (let q = 0; q < s.w; q++) {
    if (s.data[j * s.w + q] === 255) continue;
    const up = s.h - 1 - j, x = x0 + q + 1 + Math.round(up * 0.85), y = baseY + Math.round(up * 0.42);
    if (x >= 0 && y >= 0 && x < W && y < H) GROUNDSH[y * W + x] = 1;
  }
}
function placeAll() {
  STAMPS.length = 0; GROUNDSH.fill(0);
  WIN_I = []; BLOOM_I = []; MILL_AT = []; EMBER_L = []; BOLT_L = [];
  let stone = 0, wreck = 0;
  for (const p of WORLD.POIS) {
    const x = px(p.u), y = py(p.v);
    switch (p.type) {
      case 'castle': place(S_CASTLE[p.variant % S_CASTLE.length], x, y, true); break;
      case 'city': place(S_CITY, x, y, true); break;
      case 'spires': place(S_SPIRES, x, y + 2, true); break;
      case 'stone_hands': place(S_HAND_L, x - 4, y + 2, true); place(S_HAND_R, x + 5, y + 3, true); break;
      case 'windmill': place(S_MILL[0], x, y, true); STAMPS.pop(); MILL_AT.push([x - 2, y - S_MILL[0].h + 1]); break;
      case 'standing_stone': place(S_STONE[stone++ % S_STONE.length], x, y, true); break;
      case 'clockwork_tower': place(S_CLOCK[p.variant % S_CLOCK.length], x, y, true); break;
      case 'wreckage': place(S_WRECK[wreck++ % S_WRECK.length], x, y, false); break;
      case 'cavern': place(S_CAVE, x - 9, y - 3, false); break;          // drawn a little aside: the data puts a castle 7 px away
      case 'flower_field': plantBlooms(x, y, Math.round((p.r || 0.03) * MAPS)); break;
      case 'isles': place(S_SHIP, x - 14, y - 9, false); break;
      default: break;
    }
  }
  place(S_SHIP, GLINT_X + 96, GLY + 58, false);              // one ship crossing the light
  for (const P of WORLD.PEAKS) if (P.key.indexOf('fire_dragon') === 0 && P.h > 0.5) EMBER_L.push([px(P.u), py(P.v), P.h > 0.6 ? 2 : 1]);
}
function plantBlooms(cx, cy, r) {
  const rnd = mulberry32(77);
  for (let k = 0; k < 7; k++) {
    const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.8);
    if (KIND[y * W + x] !== LAND || CAN[y * W + x]) continue;
    place(S_BLOOM, x, y + 1, false); BLOOM_I.push(y * W + x);
  }
}
function stampSprites() {
  for (const st of STAMPS) {
    const s = st.s;
    for (let j = 0; j < s.h; j++) for (let q = 0; q < s.w; q++) {
      const c = s.data[j * s.w + q], x = st.x0 + q, y = st.y0 + j;
      if (c === 255 || x < 0 || y < 0 || x >= W || y >= H) continue;
      IDX0[y * W + x] = c;
      if (c === GOLD2 && s === S_CITY) WIN_I.push(y * W + x);
    }
  }
}

// ---------------------------------------------------------------- bake 7: small lists for things that move
function seedGlints() {
  const rnd = mulberry32(909), I = [], L = [], P = [], C = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 6; x++) {
    const i = y * W + x;
    if (KIND[i] !== SEA) continue;
    const g = glowAt(x, y), near = smooth(-0.05, -0.008, CD[i]);
    const p = 0.0007 + 0.011 * smooth(1.2, 6.5, g) + 0.05 * pathAt(x, y) + 0.004 * near;
    if (rnd() > p) continue;
    const len = 1 + ((rnd() * (g > 2 ? 4 : 3)) | 0);
    let ok = true; for (let k = 0; k < len; k++) if (KIND[i + k] !== SEA) ok = false;
    if (!ok) continue;
    const base = IDX0[i], c = Math.min(11, base + (g > 1.5 ? 3 : 1) + (rnd() < 0.3 ? 1 : 0));
    I.push(i); L.push(len); P.push(rnd()); C.push(c);
  }
  NGLINT = I.length; GLINT_I = Int32Array.from(I); GLINT_L = Uint8Array.from(L); GLINT_P = Float32Array.from(P); GLINT_C = Uint8Array.from(C);
}
// The sea breathes: pixels that sit on the edge between two depth bands (or two rings of the glow) get a slow swell
// added to their value, sized so the edge never moves more than about a pixel.
function seedSwell() {
  const I = [], V = [], A = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (KIND[i] !== SEA || SHADE[i] || MAT[i] !== M_MAIN || KIND[i - 1] !== SEA || KIND[i + 1] !== SEA || KIND[i - W] !== SEA || KIND[i + W] !== SEA) continue;
    const v = VAL[i], grad = Math.hypot(VAL[i + 1] - VAL[i - 1], VAL[i + W] - VAL[i - W]) * 0.5;
    const amp = Math.min(0.26, grad * 2.2), fr = v - Math.floor(v);
    if (amp < 0.004 || v > 10.3 || Math.abs(fr - 0.5) > amp + 0.04) continue;
    I.push(i); V.push(v); A.push(amp);
  }
  NSW = I.length; SW_I = Int32Array.from(I); SW_V = Float32Array.from(V); SW_A = Float32Array.from(A);
  const surf = [], gust = [];
  for (let i = W; i < NPX - W; i++) {
    if (KIND[i] === SEA && IDX0[i] >= 8 && (KIND[i + W] === LAND || KIND[i + 1] === LAND)) surf.push(i);
    else if (IDX0[i] === GOLD1 && MAT[i] === M_WHEAT) gust.push(i);
  }
  SURF_I = Int32Array.from(surf); GUST_I = Int32Array.from(gust);
}
function seedEyes() {
  const rnd = mulberry32(404); EYE_I = []; SPARK_I = [];
  for (let tries = 0; tries < 40000 && EYE_I.length < 11; tries++) {
    const x = 2 + ((rnd() * (W - 6)) | 0), y = 2 + ((rnd() * (H - 4)) | 0), i = y * W + x;
    if (CAN[i] !== FT.EYES || CAN[i + 2] !== FT.EYES || IDX0[i] > 4 || IDX0[i + 2] > 4) continue;
    if (EYE_I.every(e => Math.abs((e % W) - x) + Math.abs(((e / W) | 0) - y) > 9)) EYE_I.push(i);
  }
  for (let tries = 0; tries < 40000 && SPARK_I.length < 10; tries++) {
    const i = (rnd() * NPX) | 0;
    if (CAN[i] === FT.CRYSTAL && IDX0[i] === SNOW1) SPARK_I.push(i);
  }
}
function seedBolts() {
  for (const p of WORLD.POIS) if (p.type === 'storm_valley') BOLT_L.push([px(p.u), py(p.v)]);
}
// a small thunderhead over each storm valley: blue-grey puffs, pale on the side facing the light, dark underneath
function paintStorms() {
  const rnd = mulberry32(606), R = 18, D = 2 * R + 1, tone = new Int8Array(D * D);
  for (const b of BOLT_L) {
    const puffs = [];
    for (let k = 0; k < 8; k++) puffs.push([b[0] - 9 + rnd() * 18, b[1] - 10 + rnd() * 6, k < 2 ? 5 + rnd() * 1.5 : 2.4 + rnd() * 2.4]);
    tone.fill(-1);
    for (let j = 0; j < D; j++) for (let q = 0; q < D; q++) {
      const x = b[0] - R + q, y = b[1] - 7 - R + j;
      let best = 0, lite = 0;
      for (const p of puffs) {
        const dx = x - p[0], dy = (y - p[1]) * 1.25, e = 1 - (dx * dx + dy * dy) / (p[2] * p[2]);
        if (e > best) { best = e; lite = 0.6 * (-dx - dy) / p[2] + 0.4 * (-(x - b[0]) - (y - b[1] + 7)) / 8; }
      }
      if (best > 0) tone[j * D + q] = lite > 0.42 ? 2 : lite < -0.38 ? 0 : 1;
    }
    for (let j = 1; j < D - 1; j++) for (let q = 1; q < D - 1; q++) {
      const t = tone[j * D + q], x = b[0] - R + q, y = b[1] - 7 - R + j, i = y * W + x;
      if (t < 0 || x < 0 || y < 0 || x >= W - 6 || y >= H - 7) continue;
      const rim = tone[(j - 1) * D + q] < 0 || tone[j * D + q - 1] < 0;      // the edge that faces the light
      MAT[i] = M_SNOW; VAL[i] = rim ? 3 : t; CAN[i] = 0; GROUNDSH[i] = 0; SHADE[i] = 0; KIND[i] = LAND;
      if (j + 6 >= D || q + 5 >= D || tone[(j + 6) * D + q + 5] < 0) GROUNDSH[i + 6 * W + 5] = 1;   // its shadow falls down and right
    }
  }
}
function buildNoise() {                            // tileable soft blobs for the cloud shadows
  const P = 4;
  const lat = (x, y, s) => hash2(mod(x, P * s), mod(y, P * s), 700 + s);
  for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
    let f = 0, amp = 0.5, tot = 0;
    for (let o = 1; o <= 4; o *= 2) {
      const fx = x / NS * P * o, fy = y / NS * P * o * 1.5, xi = Math.floor(fx), yi = Math.floor(fy), tx = fx - xi, ty = fy - yi;
      const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
      const a = lat(xi, yi, o), b = lat(xi + 1, yi, o), c = lat(xi, yi + 1, o), d = lat(xi + 1, yi + 1, o);
      f += amp * (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v); tot += amp; amp *= 0.5;
    }
    NT[y * NS + x] = clamp((f / tot) * 255, 0, 255) | 0;
  }
}

// ---------------------------------------------------------------- labels: a separate overlay, off by default
const LABEL_FIX = {                                // px offsets from the data's suggested centre, and line breaks
  unknown_sea: { dx: 45, dy: -93 }, northern_lands: { dx: -15, dy: -26 }, verdant_reach: { dx: -27, dy: 10 },
  eastern_kingdom: { dy: -15, lines: ['THE EASTERN', 'KINGDOM'] }, mage_kingdoms: { dy: 6 },
  still_water: { dx: -1, dy: -16 }, mountain_path: { dx: -35, dy: -42 }, starbloom_fields: { dx: 29, dy: -15 },
  stone_hands: { dx: 35, dy: -11 }, colossal_spires: { dx: -2, dy: -30 }, castle_order: { dx: -20, dy: 14 },
  forest_of_eyes: { dy: 2 }, wheat_country: { dx: -1, dy: -31 }, cavern_of_giants: { dy: -7 }, toad_swamp: { dx: 1, dy: -18 },
  buried_machine: { dx: 8, dy: -40, lines: ['Mount of the', 'Buried Machine'] }, artifact_isles: { dx: 6, dy: 9 }
};
function textWidth(font, str, track) {
  let w = 0;
  for (const ch of str) w += (ch === ' ' ? font.space : font.glyphs[ch] ? font.glyphs[ch][0].length : font.space) + track;
  return w - track;
}
function drawText(font, str, x0, y0, track, fill, edge, cells) {
  let x = x0;
  for (const ch of str) {
    const g = font.glyphs[ch];
    if (!g) { x += font.space + track; continue; }
    for (let j = 0; j < g.length; j++) for (let q = 0; q < g[j].length; q++) {
      if (g[j][q] !== '#') continue;
      const X = x + q, Y = y0 + j;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = X + dx, yy = Y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const key = yy * W + xx;
        if (dx === 0 && dy === 0) cells.set(key, fill); else if (cells.get(key) !== fill) cells.set(key, edge);
      }
    }
    x += g[0].length + track;
  }
}
function labelBoxes(level) {                       // where each label goes: [{ key, lines: [{ str, x, y }], x0, y0, x1, y1, font, track, major }]
  const out = [];
  for (const L of WORLD.LABELS) {
    const major = L.rank === 'major';
    if (!major && level < 2) continue;
    const fix = LABEL_FIX[L.key] || {}, font = major ? FONT.BIG : FONT.SMALL, track = major ? 2 : 1;
    const lines = fix.lines || [L.text], lh = major ? 9 : 8;
    const cx = Math.round(L.u * W) + (fix.dx || 0), cy = MAPY + Math.round(L.v * MAPS) + (fix.dy || 0);
    const box = { key: L.key, lines: [], font, track, major, x0: 1e9, y0: cy - ((lines.length * lh) >> 1), x1: -1e9, y1: 0 };
    lines.forEach((str, k) => {
      const w = textWidth(font, str, track), x = clamp(cx - (w >> 1), 3, W - 3 - w), y = box.y0 + k * lh;
      box.lines.push({ str, x, y }); box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x + w);
    });
    box.y1 = box.y0 + lines.length * lh - (major ? 2 : 0);
    out.push(box);
  }
  return out;
}
function buildLabels() {
  const cells = new Map();
  if (G.labels > 0 && NPX) {
    for (const b of labelBoxes(G.labels)) for (const ln of b.lines) drawText(b.font, ln.str, ln.x, ln.y, b.track, b.major ? 11 : 10, b.major ? 0 : 1, cells);
  }
  LBL_I = new Int32Array(cells.size); LBL_C = new Uint8Array(cells.size);
  let k = 0; for (const [i, c] of cells) { LBL_I[k] = i; LBL_C[k++] = c; }
}
function setLabels(on) { G.labels = on === true ? 1 : (on | 0); buildLabels(); }

// ---------------------------------------------------------------- lifecycle
function init() { buildPalette(); buildDark(); buildSprites(); buildNoise(); }
function setH(h) {
  H = clamp(h | 0, H_MIN, H_MAX); MAPY = Math.round((H - MAPS) * MAP_DROP); GLY = Math.max(GLINT_MINY, MAPY - GLINT_UP); NPX = W * H;
  HT = new Float32Array(NPX); CD = new Float32Array(NPX); FO = new Float32Array(NPX); SN = new Float32Array(NPX); MT = new Float32Array(NPX);
  WH = new Float32Array(NPX); WA = new Float32Array(NPX); SHD = new Float32Array(NPX); CAST = new Float32Array(NPX); VAL = new Float32Array(NPX);
  KIND = new Uint8Array(NPX); FTY = new Uint8Array(NPX); RG = new Uint8Array(NPX); MAT = new Uint8Array(NPX); CAN = new Uint8Array(NPX);
  CSH = new Int8Array(NPX); IDX0 = new Uint8Array(NPX); FRAME = new Uint8Array(NPX); GROUNDSH = new Uint8Array(NPX); SHADE = new Uint8Array(NPX); WF = new Uint16Array(NPX);
  sampleWorld(); shadeRelief(); growCanopy(); paintValues(); paintShores(); paintRivers(); paintRoads();
  for (let i = 0; i < NPX; i++) SHADE[i] = CD[i] > -0.022 ? 1 : 0;      // cloud shadows show on land and in the shallows only
  placeAll(); seedBolts(); paintStorms();
  for (let i = 0; i < NPX; i++) if (GROUNDSH[i] && KIND[i] !== SEA) VAL[i] -= MAT[i] === M_MAIN ? 1.3 : 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; IDX0[i] = toIndex(MAT[i], VAL[i], x, y); }
  stampSprites(); seedGlints(); seedSwell(); seedEyes(); buildLabels();
}
function setOut(buf) { OUT = buf; }
function update(dt) { G.t += dt; }

// ---------------------------------------------------------------- per frame: only what moves
function shadeClouds(frame, base, dark, nt, mask, ox, oy) {
  let i = 0;
  for (let y = 0; y < H; y++) {
    const row = ((y + oy) & (NS - 1)) * NS;
    for (let x = 0; x < W; x++, i++) {
      const c = base[i];
      frame[i] = mask[i] && nt[row + ((x + ox) & (NS - 1))] > CLOUD_CUT ? dark[c] : c;
    }
  }
}
function drawSwell(frame, I, V, A, n, t) {
  for (let k = 0; k < n; k++) {
    const i = I[k], x = i % W, y = (i / W) | 0;
    const v = sharpen(V[k] + A[k] * Math.sin(t * 1.5 + x * 0.045 + y * 0.07), 0.14), fl = Math.floor(v), fr = v - fl;
    const c = fl + ((fr < 0.28 ? 0 : fr > 0.72 ? 1 : (fr - 0.28) / 0.44) > BAYER[((y & 3) << 2) | (x & 3)] ? 1 : 0);
    frame[i] = c < 0 ? 0 : c > 11 ? 11 : c;
  }
}
// surf falls back along the lit shores now and then; a gust of wind runs across the wheat as a pale band
function drawSurfAndWind(frame, surf, gust, t) {
  for (let k = 0; k < surf.length; k++) {
    const i = surf[k];
    if (Math.sin(t * 1.1 + (i % W) * 0.21 + ((i / W) | 0) * 0.17) > 0.5) frame[i] = 6;
  }
  for (let k = 0; k < gust.length; k++) {
    const i = gust[k];
    if (frame[i] === GOLD1 && Math.sin((i % W) * 0.085 + ((i / W) | 0) * 0.05 - t * 1.2) > 0.9) frame[i] = GOLD2;
  }
}
function drawGlints(frame, t) {
  for (let k = 0; k < NGLINT; k++) {
    const ph = t * 0.55 + GLINT_P[k] * 7;
    if (hash2(k, Math.floor(ph), 5) > 0.55) continue;
    const i = GLINT_I[k], c = GLINT_C[k];
    for (let q = 0; q < GLINT_L[k]; q++) if (frame[i + q] < c) frame[i + q] = c;
  }
}
function drawMills(frame, t) {
  const s = S_MILL[Math.floor(t * 1.6) & 1];
  for (const m of MILL_AT) for (let j = 0; j < s.h; j++) for (let q = 0; q < s.w; q++) {
    const c = s.data[j * s.w + q];
    if (c !== 255) frame[(m[1] + j) * W + m[0] + q] = c;
  }
}
function drawLights(frame, t) {
  for (let k = 0; k < WIN_I.length; k++) frame[WIN_I[k]] = hash2(k, Math.floor(t * 1.3 + k * 0.37), 8) < 0.2 ? GOLD1 : GOLD2;
  for (let k = 0; k < LAMP_I.length; k++) frame[LAMP_I[k]] = hash2(k, Math.floor(t * 0.9 + k * 0.61), 9) < 0.12 ? GOLD1 : GOLD2;
  for (let k = 0; k < EYE_I.length; k++) {
    const ph = (t / (7 + (k % 5) * 1.7) + k * 0.31) % 1;
    if (ph < 0.3) { frame[EYE_I[k]] = 10; frame[EYE_I[k] + 2] = 10; }
  }
  for (let k = 0; k < BLOOM_I.length; k++) if (Math.sin(t * 1.1 + k * 2.1) > 0.5) frame[BLOOM_I[k]] = 10;
  for (let k = 0; k < SPARK_I.length; k++) if (((t * 0.5 + k * 0.173) % 1) < 0.12) frame[SPARK_I[k]] = SNOW2;
  for (let k = 0; k < EMBER_L.length; k++) {
    const e = EMBER_L[k], i = e[1] * W + e[0], pulse = Math.sin(t * 0.9 + k * 1.9);
    frame[i] = pulse > -0.2 ? GOLD2 : EMBER;
    if (e[2] > 1) { frame[i + 1] = EMBER; frame[i - W] = EMBER; if (pulse > 0.25) { frame[i - 1] = EMBER; frame[i + W] = EMBER; } }
    else if (pulse > 0.4) frame[i + 1] = EMBER;
  }
  for (let k = 0; k < BOLT_L.length; k++) {
    const ph = (t / (5.3 + k * 2.1) + k * 0.4) % 1;
    if (ph < 0.035) { const b = BOLT_L[k], i = (b[1] - 3) * W + b[0]; frame[i] = 11; frame[i + W - 1] = 11; frame[i + 2 * W] = 11; frame[i + 3 * W - 1] = 10; }
  }
}
function render(t) {
  if (!OUT || !NPX) return;
  shadeClouds(FRAME, IDX0, DARK, NT, SHADE, (CLOUD_OX - Math.floor(t * CLOUD_VX)) & (NS - 1), (CLOUD_OY - MAPY - Math.floor(t * CLOUD_VY)) & (NS - 1));
  drawSwell(FRAME, SW_I, SW_V, SW_A, NSW, t); drawSurfAndWind(FRAME, SURF_I, GUST_I, t); drawGlints(FRAME, t); drawMills(FRAME, t); drawLights(FRAME, t);
  for (let k = 0; k < LBL_I.length; k++) FRAME[LBL_I[k]] = LBL_C[k];
  for (let i = 0; i < NPX; i++) OUT[i] = PAL[FRAME[i]];
}

// ---------------------------------------------------------------- browser boot (a plain canvas, whole-number scale)
function boot() {
  const cv = document.getElementById('map') || document.body.appendChild(document.createElement('canvas'));
  init(); setH(H_DEF);
  cv.width = W; cv.height = H; cv.style.imageRendering = 'pixelated';
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H);
  setOut(new Uint32Array(img.data.buffer));
  let last = performance.now();
  (function frame(now) { update(Math.min(0.1, (now - last) / 1000)); last = now; render(G.t); ctx.putImageData(img, 0, 0); requestAnimationFrame(frame); })(last);
  window.ATLAS = { setLabels };
}

const API = { init, setH, setOut, update, render, setLabels, labels0: () => setLabels(0), labels1: () => setLabels(1), labels2: () => setLabels(2), labelBoxes, G, W, get H() { return H; }, get MAPY() { return MAPY; }, get stamps() { return STAMPS; } };
if (IS_BROWSER) boot(); else module.exports = API;
})();
