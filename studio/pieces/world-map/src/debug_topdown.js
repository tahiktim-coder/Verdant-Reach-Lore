// Diagnostic top-down views of the world data. NOT art: they only check that the data is right.
//   node debug_topdown.js      writes into ../debug (2 px per cell):
//     world_debug.png          everything: elevation bands, hillshade, sea depth, lakes (blue), rivers (cyan, thick =
//                              strong), forests (dark green; Forest of Eyes violet-black; crystal groves cyan), wheat
//                              strips (gold, hatched along wheatAngle), region tints, a numbered marker per POI
//     world_debug_relief.png   bare relief and rivers; magenta checker = a hollow that had to be filled (pitFill)
//     world_debug_vectors.png  the vector tables: RANGES red (low hills orange), PEAKS red crosses, RIVERS blue, ROADS
//                              brown (lamp road yellow, the mountain path dashed), LABELS boxes (major black, minor violet)
//     pois.txt                 each POI with u, v, height, region and note; lake levels; where each named river starts and
//                              ends; the roads; the lowest ways through the northern ranges
//   It also prints checks: rivers never step uphill, every land cell drains to the sea, every lake lies in its basin
//   (no shore cell below the water except the one outlet), no place stands in water, and the lowest routes from the
//   Northern Lands into the Reach and into the east (they must be the mountain path and the low gap: re-run this after
//   any edit to the ranges).
const fs = require('fs'), path = require('path');
const t0 = process.hrtime.bigint();
const W = require('./world.js');
const genMs = Number(process.hrtime.bigint() - t0) / 1e6;
const { encode } = require(path.resolve(__dirname, '../../../.claude/skills/pixel-scenes/scripts/png.js'));
const OUT = path.resolve(__dirname, '../debug');
fs.mkdirSync(OUT, { recursive: true });

const N = W.N, SC = 2, PW = N * SC;
const rgb = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// elevation bands: [upper height, colour]
const BANDS = [[0.235, '#5c8f4a'], [0.27, '#79a257'], [0.31, '#98b065'], [0.36, '#b9b672'], [0.43, '#bb9c63'], [0.52, '#a37c56'],
  [0.62, '#8c6a58'], [0.74, '#8f8684'], [0.86, '#b3adac'], [2, '#dcd9d8']].map(b => [b[0], hex(b[1])]);
const REGION_TINT = ['#3b3f8f', '#1f5f8f', '#1f7f7a', '#2f4f9f', '#9fb7d9', '#8a8a9a', '#3fa84a', '#e6c84a', '#2f8f6a', '#6f7f2f',
  '#d98a3f', '#c2503f', '#77777f', '#b04fb0'].map(hex);
const FOREST_COL = [null, '#1f5a2a', '#2a0f3a', '#17463a', '#4fc8ff', '#55602a'].map(c => c && hex(c));
const POI_COL = { castle: '#ffffff', lake: '#3fa7ff', city: '#ffd24a', windmill: '#ffb060', standing_stone: '#c0c0c0', crystal_grove: '#7fe0ff',
  storm_valley: '#b080ff', pass: '#ff7f50', volcano: '#ff3b1f', lone_mountain: '#d0a080', battlefield: '#909090', clockwork_tower: '#d0d0a0',
  wreckage: '#806050', isles: '#ff60ff', dark_forest: '#a040ff', spires: '#fff0a0', stone_hands: '#e0c0a0', flower_field: '#ff8fd0',
  cavern: '#603020', swamp: '#90a040', area: '#ffff80' };

function terrain(vectorsOnly, relief) {
  const px = new Uint32Array(PW * PW);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = j * N + i, h = W.height[c];
    let col;
    if (W.coast[c] <= 0) col = mix(mix(hex('#2f6ea5'), hex('#0b2140'), clamp(W.waterDepth[c] / 0.12, 0, 1)), REGION_TINT[W.region[c]], 0.3);
    else if (W.lake[c]) col = hex('#3fa7ff');
    else {
      let b = 0; while (h > BANDS[b][0]) b++;
      col = BANDS[b][1];
      // hillshade, light from the north-west
      const sh = clamp(0.5 + (relief ? 14 : 9) * ((W.height[c - 1] - W.height[c + 1]) + (W.height[c - N] - W.height[c + N])), 0, 1);
      col = mix(col, sh > 0.5 ? [255, 255, 240] : [10, 10, 40], Math.abs(sh - 0.5) * (relief ? 1.3 : 0.9));
      if (W.snow[c] > 0.5 && !relief) col = mix(col, [250, 250, 255], 0.38);
      if (relief) { if (W.pitFill[c] > 0.003 && ((i + j) & 1)) col = [255, 0, 255]; }   // magenta = a filled hollow
      else if (!vectorsOnly) {
        col = mix(col, REGION_TINT[W.region[c]], 0.22);
        if (W.forest[c] > 0) col = mix(col, FOREST_COL[W.forestType[c]], 0.75 * W.forest[c]);
      } else col = mix(col, [235, 235, 225], 0.55);
    }
    for (let y = 0; y < SC; y++) for (let x = 0; x < SC; x++) {
      let o = col;
      if (!vectorsOnly && !relief && W.wheat[c] > 0.05) {
        const a = W.wheatAngle[c], s = (i * SC + x) * -Math.sin(a) + (j * SC + y) * Math.cos(a);
        o = mix(col, (Math.floor(s / 2) & 1) ? hex('#f2d552') : hex('#c9a436'), 0.85 * W.wheat[c]);
      }
      px[(j * SC + y) * PW + i * SC + x] = rgb(o[0] | 0, o[1] | 0, o[2] | 0);
    }
  }
  return px;
}
function dot(px, x, y, col) { if (x >= 0 && y >= 0 && x < PW && y < PW) px[y * PW + x] = col; }
function line(px, pts, col, dash) {
  for (let k = 1, q = 0; k < pts.length; k++) {
    const x0 = pts[k - 1][0] * PW, y0 = pts[k - 1][1] * PW, x1 = pts[k][0] * PW, y1 = pts[k][1] * PW, n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
    for (let s = 0; s <= n; s++, q++) if (!dash || (q % dash) < dash / 2) dot(px, Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n), col);
  }
}
const FONT = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111',
  6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111' };
function number(px, x, y, n) {
  const s = String(n);
  for (let yy = -1; yy < 6; yy++) for (let xx = -1; xx < s.length * 4; xx++) dot(px, x + xx, y + yy, rgb(0, 0, 0));
  for (let k = 0; k < s.length; k++) for (let q = 0; q < 15; q++) if (FONT[s[k]][q] === '1') dot(px, x + k * 4 + (q % 3), y + ((q / 3) | 0), rgb(255, 255, 255));
}
function rivers(px) {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const r = W.river[j * N + i];
    if (r <= 0) continue;
    const big = r > 0.62 ? 1 : 0, col = rgb(0, 240, 255);
    for (let y = -big; y < SC + big; y++) for (let x = -big; x < SC + big; x++) dot(px, i * SC + x, j * SC + y, col);
  }
}
function markers(px, numbers) {
  W.POIS.forEach((p, k) => {
    const x = Math.round(p.u * PW), y = Math.round(p.v * PW), c = hex(POI_COL[p.type] || '#ff00ff'), r = p.rank === 'major' ? 4 : 3;
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) dot(px, x + xx, y + yy, Math.max(Math.abs(xx), Math.abs(yy)) === r ? rgb(0, 0, 0) : rgb(c[0], c[1], c[2]));
    if (numbers) number(px, x + r + 2, y - 2, k);
  });
}

// image 1: the data check (elevation bands, sea, lakes, rivers, forests, wheat, region tints, POI markers)
const a = terrain(false);
rivers(a);
markers(a, true);
fs.writeFileSync(path.join(OUT, 'world_debug.png'), encode(a, PW, PW, 1));

// image 2: the vector shapes over pale terrain (RANGES red, RIVERS blue, ROADS brown / yellow, label boxes)
const b = terrain(true);
for (const R of W.RIVERS) line(b, R.pts, R.named ? rgb(0, 60, 255) : rgb(90, 150, 255));
for (const R of W.RANGES) line(b, R.pts, R.kind === 'hill' ? rgb(230, 130, 0) : rgb(200, 0, 0));
for (const R of W.ROADS) line(b, R.pts, R.kind === 'lamp' ? rgb(255, 200, 0) : rgb(110, 50, 10), R.kind === 'path' ? 6 : 0);
for (const P of W.PEAKS) { const x = Math.round(P.u * PW), y = Math.round(P.v * PW); for (let k = -5; k <= 5; k++) { dot(b, x + k, y, rgb(200, 0, 0)); dot(b, x, y + k, rgb(200, 0, 0)); } }
for (const L of W.LABELS) {
  const col = L.rank === 'major' ? rgb(0, 0, 0) : rgb(120, 0, 160), u0 = L.u - L.extentU / 2, u1 = L.u + L.extentU / 2, v0 = L.v - L.extentV / 2, v1 = L.v + L.extentV / 2;
  line(b, [[u0, v0], [u1, v0], [u1, v1], [u0, v1], [u0, v0]], col, 4);
}
markers(b, false);
fs.writeFileSync(path.join(OUT, 'world_debug_vectors.png'), encode(b, PW, PW, 1));

// image 3: bare relief (elevation bands and hillshade only) with the rivers, for judging the shape of the land
const r3 = terrain(false, true);
rivers(r3);
fs.writeFileSync(path.join(OUT, 'world_debug_relief.png'), encode(r3, PW, PW, 1));

// the sanity table
const pad = (s, n) => String(s).padEnd(n);
const rows = W.POIS.map((p, k) => pad(k, 4) + pad(p.key, 22) + pad(p.type, 17) + pad(p.rank, 7) + pad(p.u.toFixed(3), 7) + pad(p.v.toFixed(3), 7) +
  pad(p.height.toFixed(3), 8) + pad(p.region + ' ' + W.REGIONS[p.region].key, 22) + (W.isWater(p.u, p.v) ? 'WATER ' : '') + (p.variant !== undefined ? 'variant ' + p.variant + '  ' : '') + (p.note ? '(' + p.note + ')' : ''));
const head = 'WORLD DATA sanity table. All placements provisional. Sea level ' + W.SEA + '. The number is the marker number in world_debug.png.\n' +
  pad('#', 4) + pad('key', 22) + pad('type', 17) + pad('rank', 7) + pad('u', 7) + pad('v', 7) + pad('height', 8) + pad('region', 22) + '(note)\n';
const lakes = '\nLAKES\n' + W.LAKES.map(L => pad(L.key, 22) + 'level ' + L.level.toFixed(3) + '  cells ' + L.cells).join('\n');
const rv = '\n\nRIVERS (named)\n' + W.RIVERS.filter(r => r.named).map(r => {
  const s = r.pts[0], e = r.pts[r.pts.length - 1];
  return pad(r.key, 22) + 'from ' + s.join(',') + ' h ' + W.heightAt(s[0], s[1]).toFixed(3) + '  to ' + e.join(',') + ' h ' + W.heightAt(e[0], e[1]).toFixed(3) + '  (' + (W.isWater(e[0], e[1]) ? 'water' : 'LAND!') + ')';
}).join('\n');
// every lake must lie in its basin: no shore cell below the water except the one outlet (the lowest shore cell)
const OFF8 = [1, N + 1, N, N - 1, -1, -N - 1, -N, -N + 1];
let shoreBelow = 0;
W.LAKES.forEach((L, id) => {
  const shore = [];
  for (let c = N + 1; c < N * N - N - 1; c++) if (!W.lake[c] && W.coast[c] > 0 && OFF8.some(o => W.lake[c + o] === id + 1)) shore.push(c);
  const out = shore.reduce((a, c) => (W.height[c] < W.height[a] ? c : a), shore[0]);
  shoreBelow += shore.filter(c => c !== out && W.height[c] < L.level - 1e-5).length;
});

// the lowest ways through the northern ranges: flood from the Northern Lands, always taking the lowest step next,
// and note the highest point that had to be crossed to reach the target realm; then close that way and look again
function lowestRoutes(targets, avoid, rounds) {
  const NN = N * N, shut = new Uint8Array(NN), out = [];
  for (let c = 0; c < NN; c++) if (avoid.includes(W.region[c])) shut[c] = 1;
  for (let r = 0; r < rounds; r++) {
    const best = new Float32Array(NN).fill(9), par = new Int32Array(NN).fill(-1), heap = [];
    const push = (k, c) => { heap.push([k, c]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; const t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; const q = heap[m]; heap[m] = heap[i]; heap[i] = q; i = m; } } return t; };
    for (let c = 0; c < NN; c++) if (W.coast[c] > 0 && W.region[c] === 4 && !shut[c]) { best[c] = W.height[c]; push(W.height[c], c); }
    while (heap.length) {
      const [k, c] = pop();
      if (k > best[c]) continue;
      for (const o of OFF8) { const m = c + o; if (m < 0 || m >= NN || W.coast[m] <= 0 || shut[m]) continue; const nk = Math.max(k, W.height[m]); if (nk < best[m]) { best[m] = nk; par[m] = c; push(nk, m); } }
    }
    let t = -1, bt = 9;
    for (let c = 0; c < NN; c++) if (W.coast[c] > 0 && targets.includes(W.region[c]) && best[c] < bt) { bt = best[c]; t = c; }
    if (t < 0) break;
    let top = t;
    for (let c = t; c >= 0; c = par[c]) if (W.height[c] > W.height[top]) top = c;
    const tu = ((top % N) + 0.5) / N, tv = (((top / N) | 0) + 0.5) / N;
    out.push(W.height[top].toFixed(3) + ' at (' + tu.toFixed(3) + ', ' + tv.toFixed(3) + ')');
    for (let c = 0; c < NN; c++) if (Math.hypot(((c % N) + 0.5) / N - tu, (((c / N) | 0) + 0.5) / N - tv) < 0.035) shut[c] = 1;
  }
  return out;
}
const toReach = lowestRoutes([6, 7, 8, 9], [10, 11, 12], 2), toEast = lowestRoutes([10, 11, 12], [6, 7, 8, 9], 2);
const mp = W.poi('mountain_path'), eg = W.poi('east_gap');
const routes = '\n\nLOWEST WAYS THROUGH THE NORTHERN RANGES (the highest point that must be crossed; then the next way with that one closed)\n' +
  pad('North -> Reach', 18) + toReach.join('   next: ') + '    (the mountain path marker is at ' + mp.u.toFixed(3) + ', ' + mp.v.toFixed(3) + ', height ' + mp.height.toFixed(3) + ')\n' +
  pad('North -> East', 18) + toEast.join('   next: ') + '    (the low gap marker is at ' + eg.u.toFixed(3) + ', ' + eg.v.toFixed(3) + ', height ' + eg.height.toFixed(3) + ')';
const roads = '\n\nROADS\n' + W.ROADS.map(R => pad(R.key, 22) + pad(R.kind, 6) + (R.note ? '(' + R.note + ')' : '')).join('\n');
const lakeNotes = W.LAKES.filter(L => L.note).map(L => '\n  ' + L.key + ': ' + L.note).join('');
fs.writeFileSync(path.join(OUT, 'pois.txt'), head + rows.join('\n') + '\n' + lakes + lakeNotes + rv + roads + routes + '\n');

// console checks: every river cell must step down (or stay level) to its downstream cell
let uphill = 0, riverCells = 0;
for (let c = 0; c < N * N; c++) if (W.river[c] > 0) { riverCells++; const t = W.flowTo[c]; if (t >= 0 && W.height[t] > W.height[c] + 1e-6) uphill++; }
console.log('generated in ' + genMs.toFixed(0) + ' ms | river cells ' + riverCells + ', uphill steps ' + uphill + ' | ' + JSON.stringify(W.STATS));
console.log('rivers: ' + W.RIVERS.filter(r => r.named).length + ' named, ' + (W.RIVERS.length - W.RIVERS.filter(r => r.named).length) + ' other channels');
// and every land cell must drain to the sea by following flowTo
const done = new Uint8Array(N * N);   // 1 = reaches the sea
let stuck = 0;
for (let c0 = 0; c0 < N * N; c0++) {
  if (W.coast[c0] <= 0 || done[c0]) continue;
  const trail = [];
  let c = c0;
  while (c >= 0 && W.coast[c] > 0 && !done[c] && trail.length < N * N) { trail.push(c); c = W.flowTo[c]; }
  const ok = c >= 0 && (W.coast[c] <= 0 || done[c] === 1);
  if (!ok) stuck += trail.length;
  for (const q of trail) done[q] = ok ? 1 : 2;
}
console.log('land cells that never reach the sea: ' + stuck);
console.log('lake shore cells below their lake, outside the one outlet: ' + shoreBelow + ' (must be 0)');
console.log('lowest way North -> Reach: ' + toReach.join(' | next ') + '   (must be the mountain path)');
console.log('lowest way North -> East:  ' + toEast.join(' | next ') + '   (must be the low gap)');
const wet = W.POIS.filter(p => W.isWater(p.u, p.v) && p.type !== 'lake' && p.type !== 'isles').map(p => p.key);
console.log('places standing in water: ' + (wet.join(', ') || 'none'));
