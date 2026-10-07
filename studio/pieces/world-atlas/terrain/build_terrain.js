'use strict';
/* =============================================================================================
   BUILD THE TERRAIN of the Verdant Reach relief atlas.            node build_terrain.js [--fast]
   Deterministic (seeded). Reads layout.js (the editable data block) and writes, next to this file:
     height.f32 (2048^2) + height_512.f32, river.f32, lake.u8, forest.u8, forest_type.u8, wheat.u8, snow.u8,
     region.u8, pois.json, labels.json, coast.json, rivers.json, meta.json
   Pipeline: designed height (coast outline + crest lines + plains + passes + valleys + lakes) at 1024 ->
   stream-power erosion with uplift toward the design (1024) -> bicubic up to 2048 + fine detail ->
   particle-droplet erosion (2048) -> short stream-power pass (2048) -> lakes, pit filling, flow
   accumulation -> cover masks -> checks (lowest routes through the ranges) -> files.
   --fast: fewer iterations and droplets, for layout edits (same files, rougher erosion).
   ============================================================================================= */
const fs = require('fs');
const path = require('path');
const { LAYOUT: L, REGIONS, PARAMS: P0, frameFns } = require('./layout');
const { makeNoise } = require('./lib/noise');
const G = require('./lib/geom');
const { buildCoast, designHeight, classify, carveLake } = require('./lib/design');
const { streamPower, droplets } = require('./lib/erode');
const { makeFloodState, priorityFlood, accumulate, breachDepressions } = require('./lib/hydro');
const { FOREST, slopeMap, forestMasks, wheatMask, snowMask } = require('./lib/masks');
const { contour, traceRiver, rangeCrossings } = require('./lib/trace');

const FAST = process.argv.includes('--fast');
const DEBUG = process.argv.includes('--debug');
const P = JSON.parse(JSON.stringify(P0));
if (FAST) { P.spl.iters = 40; P.droplets.count = 150000; P.splFine.iters = 4; }
const OUT = __dirname;
const DBG = path.join(__dirname, 'debug');
const SEA = L.sea;
const N = P.N, NE = P.NE, F = N / NE;
const T0 = Date.now();
const timing = {};
const lap = (name, t) => { timing[name] = +((Date.now() - t) / 1000).toFixed(2); console.log(`  ${name}: ${timing[name]} s`); };
const writeF32 = (name, a) => fs.writeFileSync(path.join(OUT, name), Buffer.from(a.buffer, a.byteOffset, a.byteLength));
const writeU8 = (name, a) => fs.writeFileSync(path.join(OUT, name), Buffer.from(a.buffer, a.byteOffset, a.byteLength));
const dbgF32 = (name, a) => { if (DEBUG) fs.writeFileSync(path.join(DBG, name), Buffer.from(a.buffer, a.byteOffset, a.byteLength)); };

// the frame: the design is shrunk onto the map (layout.js FRAME). Noise is evaluated in design scale so the
// shapes keep their character; u-unit lengths below are multiplied by S.
const FR = frameFns(L), S = FR.S;
const nz0 = makeNoise(L.seed);
const nz = {
  fbm: (x, y, o, l, g) => nz0.fbm(x / S, y / S, o, l, g),
  ridged: (x, y, o, l, g) => nz0.ridged(x / S, y / S, o, l, g),
  line: nz0.line
};

// ---- 1. coast -----------------------------------------------------------------------------
let t = Date.now();
const coast = buildCoast(L, N, nz);
const C = coast.C;
const CE = G.downsample(C, N, F), cliffE = G.downsample(coast.cliff, N, F);
lap('coast', t);

// ---- 2. designed height at 1024 -----------------------------------------------------------
t = Date.now();
const des = designHeight(L, REGIONS, NE, CE, cliffE, nz);
dbgF32('design_1024.f32', des.D);
lap('design', t);

// ---- 3. stream-power erosion at 1024 -------------------------------------------------------
t = Date.now();
const isSeaE = new Uint8Array(NE * NE);
for (let c = 0; c < NE * NE; c++) isSeaE[c] = CE[c] <= 0 ? 1 : 0;
const hE = Float32Array.from(des.D);
const upliftMode = P.spl.mode === 'uplift';
const Uabs = upliftMode ? des.U.map((x) => x * P.spl.U) : null;
streamPower(hE, NE, isSeaE, {
  iters: P.spl.iters, K: P.spl.K, m: P.spl.m, R: P.spl.R, kd: P.spl.kd, U: Uabs,
  D: des.D, Kmap: des.Kmap, Rmap: des.Rmap, rain: des.rain, kdMap: des.kdMap, base: SEA + 0.0008, seed: L.seed + 7, routing: P.spl.routing, p: P.spl.p
});
dbgF32('ss_1024.f32', hE);
if (upliftMode) {
  // remap the steady-state relief onto the designed height envelope: relief above the local valley base
  // (smoothed min envelope) is scaled so the local maxima match the design; the foot of every slope stays put
  const r = Math.round(P.spl.remapRadius * S * NE);
  const envD = G.blur(G.maxFilter(des.D, NE, r), NE, Math.round(r / 2), 2);
  const envS = G.blur(G.maxFilter(hE, NE, r), NE, Math.round(r / 2), 2);
  const negS = new Float32Array(NE * NE);
  for (let c = 0; c < NE * NE; c++) negS[c] = isSeaE[c] ? -1 : -hE[c];
  const base = G.blur(G.maxFilter(negS, NE, r), NE, Math.round(r / 2), 2).map((x) => -x);
  const scales = [];
  for (let c = 0; c < NE * NE; c++) {
    if (isSeaE[c]) continue;
    const b0 = Math.max(SEA, Math.min(base[c], hE[c]));
    const sc = G.clamp((envD[c] - b0) / Math.max(0.004, envS[c] - b0), 0.3, 2.5);
    if (des.mw[c] > 0.9) scales.push(sc);
    hE[c] = b0 + (hE[c] - b0) * sc;
  }
  scales.sort((x, y) => x - y);
  const pc = (q) => scales[Math.floor(q * (scales.length - 1))].toFixed(2);
  console.log(`  remap scale on mountains: p5 ${pc(0.05)}  p50 ${pc(0.5)}  p95 ${pc(0.95)}`);
}
dbgF32('spl_1024.f32', hE);
lap('stream power 1024', t);
if (process.argv.includes('--until-spl')) { fs.writeFileSync(path.join(DBG, 'spl_1024.f32'), Buffer.from(hE.buffer)); process.exit(0); }

// ---- 4. up to 2048, fine detail ------------------------------------------------------------
t = Date.now();
// land heights are carried a few cells out to sea before the upsample, so the 2048 shore cells get land
// heights (cliffs stay cliffs) instead of a low fringe blended with the sea floor
const hExt = Float32Array.from(hE);
{
  const done = new Uint8Array(NE * NE);
  for (let c = 0; c < NE * NE; c++) done[c] = isSeaE[c] ? 0 : 1;
  for (let ring = 0; ring < 6; ring++) {
    const next = [];
    for (let j = 1; j < NE - 1; j++) for (let i = 1; i < NE - 1; i++) {
      const c = j * NE + i;
      if (done[c]) continue;
      let s = 0, k = 0;
      for (const nb of [c - 1, c + 1, c - NE, c + NE, c - NE - 1, c - NE + 1, c + NE - 1, c + NE + 1]) if (done[nb]) { s += hExt[nb]; k++; }
      if (k > 0) next.push([c, s / k]);
    }
    for (const [c, val] of next) { hExt[c] = val; done[c] = 1; }
  }
}
const H = G.upsampleBicubic(hExt, NE, F);
const Hsea = G.upsampleBicubic(hE, NE, F);
const mtnN = G.upsampleBicubic(des.mtn, NE, F);
const beltN = G.upsampleBicubic(des.beltMtn, NE, F);
const isSea = new Uint8Array(N * N);
for (let j = 0; j < N; j++) {
  const v = (j + 0.5) / N;
  for (let i = 0; i < N; i++) {
    const c = j * N + i, u = (i + 0.5) / N;
    if (C[c] <= 0) {
      isSea[c] = 1;
      const s = G.smoothstep(0, L.shelf.width, -C[c]);
      H[c] = Math.min(Hsea[c], SEA - 0.003 - 0.02 * G.smoothstep(0, 0.004 * S, -C[c]));
      if (s > 0.2) H[c] = Math.min(H[c], SEA - 0.004 - L.shelf.depth * Math.pow(s, 0.8));
    } else {
      const m = G.clamp(mtnN[c], 0, 1);
      H[c] += m * 0.010 * (nz.ridged(u * 70, v * 70, 3, 2, 0.5) - 0.45);
      H[c] += (1 - m) * 0.0022 * nz.fbm(u * 95 + 13, v * 95, 3, 2, 0.5) * G.smoothstep(0, 0.006 * S, C[c]);
      H[c] = Math.max(H[c], SEA + 0.0015 + 0.004 * G.smoothstep(0, 0.003 * S, C[c]));
    }
  }
}
lap('upsample', t);

// ---- 5. particle-droplet erosion at 2048 ---------------------------------------------------
t = Date.now();
const spawn = new Float32Array(N * N), erod = new Float32Array(N * N);
const KN = G.upsampleBicubic(des.Kmap, NE, F);
for (let c = 0; c < N * N; c++) {
  if (isSea[c]) continue;
  const m = G.clamp(mtnN[c], 0, 1);
  spawn[c] = 0.22 + m;
  erod[c] = G.clamp(KN[c], 0.03, 1);
}
const dropStats = droplets(H, N, Object.assign({ seed: L.seed + 1, sea: SEA, spawn, erodibility: erod }, P.droplets));
for (let c = 0; c < N * N; c++) if (!isSea[c] && H[c] < SEA + 0.0015) H[c] = SEA + 0.0015;
dbgF32('drop_2048.f32', H);
lap('droplets', t);

// ---- 6. short stream-power pass at 2048 so channels sit on the fine grid ------------------
t = Date.now();
{
  const target = Float32Array.from(H);
  const ones = new Float32Array(N * N).fill(1);
  const rainN = new Float32Array(N * N);
  for (let c = 0; c < N * N; c++) rainN[c] = 1 + G.clamp(mtnN[c], 0, 1);
  streamPower(H, N, isSea, {
    iters: P.splFine.iters, K: P.splFine.K, m: P.splFine.m, R: P.splFine.R, kd: 0,
    D: target, Kmap: KN, Rmap: ones, rain: rainN, kdMap: null, base: SEA + 0.0008, seed: L.seed + 9, routing: P.splFine.routing, p: P.splFine.p
  });
}
lap('stream power 2048', t);

// ---- 7. sea cliffs, lakes, pit filling, flow -----------------------------------------------
t = Date.now();
// sea cliffs: on the designated cliff coasts, low shore land is cut back into the sea, so the shore sits on
// high ground and drops straight into the water (no rims, no trapped hollows; low valley mouths become coves)
{
  let cut = 0;
  for (let c = 0; c < N * N; c++) {
    if (isSea[c]) continue;
    const w = G.smoothstep(0.55, 0.9, coast.cliff[c]);
    if (w <= 0 || C[c] > 0.006 * S * w) continue;
    if (H[c] < SEA + 0.20 * w) { isSea[c] = 1; H[c] = Math.min(H[c], SEA - 0.008); cut++; }
  }
  console.log(`  sea cliffs: ${cut} low shore cells cut back`);
}
// no specks: land bits under 60 cells go back to the sea, enclosed water under 60 cells becomes land
{
  const lab = new Int32Array(N * N).fill(-1);
  const stack = new Int32Array(N * N);
  let specks = 0, holes = 0;
  for (let c0 = 0; c0 < N * N; c0++) {
    if (lab[c0] >= 0) continue;
    const type = isSea[c0];
    let sp = 0; stack[sp++] = c0; lab[c0] = c0;
    const cells = [];
    let touchesEdge = false;
    while (sp > 0) {
      const c = stack[--sp]; cells.push(c);
      const i = c % N, j = (c - i) / N;
      if (i === 0 || j === 0 || i === N - 1 || j === N - 1) touchesEdge = true;
      for (const nb of [i > 0 ? c - 1 : -1, i < N - 1 ? c + 1 : -1, j > 0 ? c - N : -1, j < N - 1 ? c + N : -1]) {
        if (nb >= 0 && lab[nb] < 0 && isSea[nb] === type) { lab[nb] = c0; stack[sp++] = nb; }
      }
    }
    if (cells.length >= 60 || touchesEdge) continue;
    if (!type) { for (const c of cells) { isSea[c] = 1; H[c] = SEA - 0.006; } specks++; }
    else {
      let s = 0, k = 0;
      for (const c of cells) { for (const nb of [c - 1, c + 1, c - N, c + N]) if (nb >= 0 && nb < N * N && !isSea[nb]) { s += H[nb]; k++; } }
      for (const c of cells) { isSea[c] = 0; H[c] = k ? s / k : SEA + 0.002; }
      holes++;
    }
  }
  console.log(`  specks removed: ${specks} land bits, ${holes} water holes`);
  // smooth the sea floor near the shore (the cut left a speckled shallow fringe)
  const wsea = new Float32Array(N * N), hsea = new Float32Array(N * N);
  for (let c = 0; c < N * N; c++) if (isSea[c]) { wsea[c] = 1; hsea[c] = H[c]; }
  const bw = G.blur(wsea, N, 3, 2), bh = G.blur(hsea, N, 3, 2);
  for (let c = 0; c < N * N; c++) if (isSea[c] && bw[c] > 0.05) H[c] = Math.min(bh[c] / bw[c], SEA - 0.003);
}
const lakeLevels = {};
for (const lk of L.lakes) {
  const info = carveLake(lk, N, H, lk.level, true, nz);
  lakeLevels[lk.key] = info.level;
}
const st = makeFloodState(N);
// breach hollows deeper than 0.0015 (not the designed lakes), then fill what is left
{
  const keep = new Uint8Array(N * N);
  for (const lk of L.lakes) for (const [u, v] of G.chaikin(lk.pts, 2, false)) keep[Math.floor(v * N) * N + Math.floor(u * N)] = 1;
  priorityFlood(H, isSea, st, 2e-7);
  const br = breachDepressions(H, isSea, st, N, 0.0015, keep);
  console.log(`  hollows: ${br.breached} breached, ${br.shallow} shallow ones filled, ${br.kept} lakes kept`);
}
priorityFlood(H, isSea, st, 2e-7);
const filled = st.filled;
if (DEBUG) { const pf = new Float32Array(N * N); for (let c = 0; c < N * N; c++) pf[c] = isSea[c] ? 0 : filled[c] - H[c]; dbgF32('pitfill_2048.f32', pf); }
// depressions: connected cells where the fill rose above the ground
const lake = new Uint8Array(N * N);
const comp = new Int32Array(N * N).fill(-1);
const lakeStats = [];
let spuriousCells = 0, maxSpurious = 0;
{
  const isDep = (c) => !isSea[c] && filled[c] - H[c] > 2e-5;
  const stack = new Int32Array(N * N);
  let nComp = 0;
  const compCells = [];
  for (let c0 = 0; c0 < N * N; c0++) {
    if (comp[c0] >= 0 || !isDep(c0)) continue;
    let sp = 0; stack[sp++] = c0; comp[c0] = nComp;
    const cells = [];
    while (sp > 0) {
      const c = stack[--sp]; cells.push(c);
      const i = c % N, j = (c - i) / N;
      if (i > 0 && comp[c - 1] < 0 && isDep(c - 1)) { comp[c - 1] = nComp; stack[sp++] = c - 1; }
      if (i < N - 1 && comp[c + 1] < 0 && isDep(c + 1)) { comp[c + 1] = nComp; stack[sp++] = c + 1; }
      if (j > 0 && comp[c - N] < 0 && isDep(c - N)) { comp[c - N] = nComp; stack[sp++] = c - N; }
      if (j < N - 1 && comp[c + N] < 0 && isDep(c + N)) { comp[c + N] = nComp; stack[sp++] = c + N; }
    }
    compCells.push(cells); nComp++;
  }
  const lakeOfComp = new Int32Array(nComp).fill(0);
  L.lakes.forEach((lk, k) => {
    for (const [u, v] of lk.pts) {
      const c = Math.floor(v * N) * N + Math.floor(u * N);
      if (comp[c] >= 0) lakeOfComp[comp[c]] = k + 1;
    }
  });
  for (let q = 0; q < nComp; q++) {
    const cells = compCells[q];
    if (lakeOfComp[q] > 0) {
      let lvl = 0;
      for (const c of cells) lvl = Math.max(lvl, filled[c]);
      for (const c of cells) { lake[c] = lakeOfComp[q]; }
      const lk = L.lakes[lakeOfComp[q] - 1];
      const prev = lakeStats.find((s) => s.key === lk.key);
      if (prev) { prev.cells += cells.length; prev.level = Math.max(prev.level, lvl); }
      else lakeStats.push({ key: lk.key, name: lk.name, id: lakeOfComp[q], level: lvl, cells: cells.length });
    } else {
      spuriousCells += cells.length;
      for (const c of cells) maxSpurious = Math.max(maxSpurious, filled[c] - H[c]);
    }
  }
}
// the surface written out: filled ground (every cell drains), flat lake surfaces
const OUTH = new Float32Array(N * N);
for (let c = 0; c < N * N; c++) OUTH[c] = isSea[c] ? H[c] : filled[c];
for (const s of lakeStats) {
  for (let c = 0; c < N * N; c++) if (lake[c] === s.id) OUTH[c] = s.level;
  s.level = +s.level.toFixed(5);
}
const acc = new Float32Array(N * N);
accumulate(st, null, acc);
lap('lakes + flow', t);

// ---- 8. rivers traced, regions, masks ----------------------------------------------------
t = Date.now();
const rivers = {};
for (const rv of L.rivers) {
  const [u, v] = rv.pts[0];
  rivers[rv.key] = Object.assign({ name: rv.name, named: !!rv.named }, traceRiver(N, st.rec, acc, isSea, lake, u, v, 0.012 * S));
}
const borderLine = rivers.border_river.pts.map((p) => [p[0], p[1]]);
borderLine.unshift([borderLine[0][0], 0.0]);
borderLine.push([borderLine[borderLine.length - 1][0], 1.0]);
const region = classify(L, N, C, borderLine, beltN);
const slope = slopeMap(OUTH, N);
const forest = forestMasks(L, P, N, OUTH, C, region, slope, lake, acc, nz);
const wheat = wheatMask(L, N, C, lake, acc, nz);
const snow = snowMask(L, P, N, OUTH, C, slope, nz);
lap('masks', t);

// ---- 9. checks: lowest ways through the northern ranges -----------------------------------
t = Date.now();
const NC = 1024;
const Hc = new Float32Array(NC * NC), seaC = new Uint8Array(NC * NC);
for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
  let m = -1, s = 1;
  for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
    const c = (j * 2 + dj) * N + i * 2 + di;
    m = Math.max(m, OUTH[c]); if (!isSea[c]) s = 0;
  }
  Hc[j * NC + i] = m; seaC[j * NC + i] = s;
}
const crossings = rangeCrossings(Hc, NC, seaC, {
  northV: [FR.fv(0.115), FR.fv(0.175)], southV: FR.fv(0.36), block: 0.04 * S,
  bandFrom: FR.fu(0.04), bandTo: FR.fu(0.94), bandStep: 0.03 * S, bandWidth: 0.045 * S,
  sides: [{ name: 'North -> Reach', u: [0.0, FR.fu(0.555)] }, { name: 'North -> East', u: [FR.fu(0.585), 1.0] }]
});
lap('route checks', t);

// ---- 10. files ---------------------------------------------------------------------------
t = Date.now();
const h512 = G.downsample(OUTH, N, 4);
writeF32('height.f32', OUTH);
writeF32('height_512.f32', h512);
writeF32('river.f32', acc);
writeU8('lake.u8', lake);
writeU8('forest.u8', forest.dens);
writeU8('forest_type.u8', forest.type);
writeU8('wheat.u8', wheat);
writeU8('snow.u8', snow);
writeU8('region.u8', region);

const at = (u, v) => { const c = Math.min(N - 1, Math.floor(v * N)) * N + Math.min(N - 1, Math.floor(u * N)); return c; };
const poiOut = [];
const addPoi = (p, extra) => {
  const c = at(p.u, p.v);
  poiOut.push(Object.assign({ key: p.key, name: p.name, kind: p.kind, u: p.u, v: p.v, rank: p.rank || 'minor', provisional: true },
    p.variant !== undefined ? { variant: p.variant } : {}, p.r ? { r: p.r } : {}, p.note ? { note: p.note } : {}, extra || {},
    { height: +OUTH[c].toFixed(4), region: REGIONS[region[c]].key, onWater: !!(isSea[c] || lake[c]) }));
};
L.castles.forEach((k) => addPoi(Object.assign({ kind: 'castle' }, k)));
L.places.forEach((p) => addPoi(p));
for (const ps of L.passes) {
  const side = crossings.sides.find((s) => (ps.key === 'mountain_path' ? s.side === 'North -> Reach' : s.side === 'North -> East'));
  let col = ps.pts[ps.colAt];
  if (side && side.lowest.path) {
    const pl = G.preparePolyline(ps.pts.slice(0, ps.colAt + 2)), q = [0, 0, 0];
    let best = -1;
    for (const [u, v, hh] of side.lowest.path) { G.polyQuery(pl, u, v, q); if (q[0] < 0.02 && hh > best) { best = hh; col = [u, v]; } }
  }
  addPoi({ key: ps.key, name: ps.name, kind: 'pass', u: col[0], v: col[1], rank: 'minor', note: ps.key === 'east_gap' ? 'unnamed in the lore' : undefined },
    { route: ps.pts });
}
L.lakes.forEach((lk) => {
  const s = lakeStats.find((q) => q.key === lk.key);
  const mid = lk.pts[Math.floor(lk.pts.length / 2)];
  if (lk.key !== 'still_water') addPoi({ key: lk.key, name: lk.name, kind: 'lake', u: mid[0], v: mid[1], rank: lk.rank }, { level: s ? s.level : null });
});
fs.writeFileSync(path.join(OUT, 'pois.json'), JSON.stringify({ note: 'All placements provisional. u 0 west..1 east, v 0 north..1 south.', pois: poiOut }, null, 1));
fs.writeFileSync(path.join(OUT, 'labels.json'), JSON.stringify({ note: 'Region label anchors: (u, v) = centre of the text, extentU x extentV = the box it may use.', labels: L.labels }, null, 1));
const coastLines = contour(OUTH, N, SEA, 0.45);
fs.writeFileSync(path.join(OUT, 'coast.json'), JSON.stringify({ note: 'Shore polylines at the sea level, u/v, longest first (the mainland is the first).', level: SEA, lines: coastLines }));
fs.writeFileSync(path.join(OUT, 'rivers.json'), JSON.stringify({ note: 'Rivers traced down the real drainage of the eroded height, source first; each point is [u, v, flow in cells].', rivers }, null, 0));

let land = 0, landMax = 0;
for (let c = 0; c < N * N; c++) if (!isSea[c]) { land++; landMax = Math.max(landMax, OUTH[c]); }
let accMax = 0; for (let c = 0; c < N * N; c++) if (acc[c] > accMax) accMax = acc[c];
const files = {
  'height.f32': { dims: [N, N], dtype: 'float32 LE', desc: 'Height 0..1, row-major (index = j*N + i, j = north->south). Land > sea_level. Sea cells hold the sea floor. Lakes hold their flat surface. Pits are filled so every land cell drains to the sea or a lake.' },
  'height_512.f32': { dims: [512, 512], dtype: 'float32 LE', desc: 'Box downsample of height.f32 for quick previews.' },
  'river.f32': { dims: [N, N], dtype: 'float32 LE', desc: 'Flow accumulation on the eroded, filled height: number of upstream cells (each cell = 1). A river shows from about 600; the big named rivers reach 1e5+.', max: Math.round(accMax) },
  'lake.u8': { dims: [N, N], dtype: 'uint8', desc: '0 = no lake, else 1 + index into layout lakes (see lakes below).' },
  'forest.u8': { dims: [N, N], dtype: 'uint8', desc: 'Tree density 0..255.' },
  'forest_type.u8': { dims: [N, N], dtype: 'uint8', desc: 'Forest kind', values: FOREST },
  'wheat.u8': { dims: [N, N], dtype: 'uint8', desc: 'Wheat cover 0..255 (the wheat country).' },
  'snow.u8': { dims: [N, N], dtype: 'uint8', desc: 'Snow cover 0..255 (height against a snow line that drops northward, north faces hold more).' },
  'region.u8': { dims: [N, N], dtype: 'uint8', desc: 'Region id (see regions). The border between the Reach and the eastern kingdom follows the traced border river.' },
  'pois.json': { desc: 'Every place: u, v, kind, name, variant (castles), provisional, height and region at the spot.' },
  'labels.json': { desc: 'Region label anchors and extents.' },
  'coast.json': { desc: 'Shore polylines (marching squares at sea level, simplified).' },
  'rivers.json': { desc: 'Named rivers and streams traced on the drainage tree.' }
};
for (const sd of crossings.sides) delete sd.lowest.path;
const meta = {
  generator: 'build_terrain.js', seed: L.seed, fast: FAST, grid: N, sea_level: SEA,
  coords: 'u = (i + 0.5) / N west->east, v = (j + 0.5) / N north->south',
  height_scale: 'abstract 0..1; lowland 0.20-0.32, hills 0.30-0.45, mountains 0.45-0.97',
  files, regions: REGIONS, lakes: lakeStats,
  stats: { landCells: land, landMax: +landMax.toFixed(4), pitFilledCells: spuriousCells, pitMaxFill: +maxSpurious.toFixed(5),
    droplets: { count: P.droplets.count, eroded: +dropStats.eroded.toFixed(3), deposited: +dropStats.deposited.toFixed(3) } },
  crossings, erosion: { streamPower1024: P.spl, streamPower2048: P.splFine, droplets: P.droplets },
  timing, layout: L
};
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
lap('write', t);

// ---- report ------------------------------------------------------------------------------
console.log('\nLOWEST WAYS THROUGH THE NORTHERN RANGES (highest point that must be crossed)');
for (const s of crossings.sides) {
  const f = (r) => (r && r.height !== null ? `${r.height.toFixed(3)} at (${r.col[0].toFixed(3)}, ${r.col[1].toFixed(3)})` : 'none');
  console.log(`  ${s.side.padEnd(16)} lowest ${f(s.lowest)}   next ${f(s.next)}   third ${f(s.third)}`);
}
console.log('  band profile (u: lowest crossing inside a 0.045 wide band):');
console.log('  ' + crossings.bands.map((b) => `${b.u.toFixed(2)}:${b.height === null ? '-' : b.height.toFixed(2)}`).join('  '));
console.log('LAKES', lakeStats.map((s) => `${s.key} level ${s.level} cells ${s.cells}`).join(' | '));
console.log('RIVERS', Object.entries(rivers).filter(([, r]) => r.named).map(([k, r]) => `${k}: ${r.pts.length} pts, ends ${r.end}, mouth (${r.pts[r.pts.length - 1][0]}, ${r.pts[r.pts.length - 1][1]})`).join(' | '));
console.log(`pit-filled cells (not lakes): ${spuriousCells}, deepest fill ${maxSpurious.toFixed(5)}`);
console.log(`TOTAL ${((Date.now() - T0) / 1000).toFixed(1)} s`);
