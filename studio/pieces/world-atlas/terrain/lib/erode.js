'use strict';
// Erosion.
//  streamPower: implicit stream-power incision (Braun & Willett 2013, n = 1) on the priority-flood drainage
//    tree, with a relaxation toward the designed height that plays the role of tectonic uplift. Ridges (small
//    drainage area) stay near the design; valleys (large area) are cut down until incision balances uplift,
//    so the ranges grow dendritic valleys and spurs while low, flat ground barely changes.
//  droplets: particle hydraulic erosion (sediment capacity, erosion, deposition, evaporation) for fine gullies.
//  diffuse: hillslope diffusion (soil creep), rounds knife edges a little.
const { makeFloodState, priorityFlood, sortByHeight, sdReceivers, mfdAccumulate, sdAccumulate, rhoReceivers, DIST } = require('./hydro');
const { mulberry32 } = require('./noise');

function streamPower(h, n, isSea, o) {
  const N = n * n;
  const st = makeFloodState(n);
  const acc = new Float32Array(N), tmp = new Float32Array(N);
  const order = new Int32Array(N), tmpI = new Int32Array(N), counts = new Int32Array(2048);
  const rec = new Int32Array(N), rdist = new Float32Array(N);
  const rnd = mulberry32(o.seed || 1);
  for (let it = 0; it < o.iters; it++) {
    priorityFlood(h, isSea, st, 1e-7);
    const f = st.filled;
    const m = sortByHeight(f, isSea, order, tmpI, counts);
    if (o.routing === 'mfd') {
      sdReceivers(f, n, isSea, order, m, rec, rdist);
      mfdAccumulate(f, n, isSea, order, m, o.rain, o.p || 4, acc);
    } else {
      rhoReceivers(f, n, isSea, order, m, rec, rdist, rnd, o.p || 3);
      sdAccumulate(order, m, rec, isSea, o.rain, acc);
    }
    for (let k = 0; k < m; k++) {
      const c = order[k], r = rec[c];
      const hr = r < 0 || isSea[r] ? o.base : h[r];
      const F = o.K * o.Kmap[c] * Math.pow(acc[c], o.m) / rdist[c];
      const hc = h[c] + (o.U ? o.U[c] : 0) + (o.R > 0 ? o.R * o.Rmap[c] * (o.D[c] - h[c]) : 0);
      let hn = (hc + F * hr) / (1 + F);
      if (hn < o.base) hn = o.base;
      h[c] = hn;
    }
    if (o.kd > 0) diffuse(h, n, isSea, o.kd, o.kdMap, tmp);
    if (o.onIter) o.onIter(it);
  }
  return { acc };
}

function diffuse(h, n, isSea, kd, kdMap, tmp) {
  tmp.set(h);
  for (let j = 1; j < n - 1; j++) {
    for (let i = 1; i < n - 1; i++) {
      const c = j * n + i;
      if (isSea[c]) continue;
      const lap = tmp[c - 1] + tmp[c + 1] + tmp[c - n] + tmp[c + n] - 4 * tmp[c];
      h[c] = tmp[c] + kd * (kdMap ? kdMap[c] : 1) * lap;
    }
  }
}

// Particle-droplet erosion on height h (n x n). Heights are scaled by zScale internally so slopes fall in the
// range the parameters expect. spawn: Float32 0..1 relative chance a droplet starts in a cell; erodibility:
// Float32 multiplier on erosion. Droplets stop at the sea (h < sea).
function droplets(h, n, o) {
  const rnd = mulberry32(o.seed);
  const Z = o.zScale;
  const hs = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) hs[i] = h[i] * Z;
  const seaZ = o.sea * Z;
  // brush
  const R = o.radius;
  const bo = [], bw = [];
  let wsum = 0;
  for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
    const d = Math.sqrt(di * di + dj * dj);
    if (d <= R) { bo.push([di, dj]); const w = 1 - d / (R + 0.5); bw.push(w); wsum += w; }
  }
  for (let k = 0; k < bw.length; k++) bw[k] /= wsum;
  const BOI = Int32Array.from(bo.map((q) => q[0])), BOJ = Int32Array.from(bo.map((q) => q[1]));
  const BW = Float64Array.from(bw);
  // cumulative spawn table over cells (sampled with a binary search)
  const cdf = new Float64Array(n * n);
  let s = 0;
  for (let i = 0; i < n * n; i++) { s += o.spawn[i]; cdf[i] = s; }
  const total = s;
  const ero = o.erodibility;
  let eroded = 0, deposited = 0;
  const hgt = (x, y) => {
    const i = x | 0, j = y | 0, fx = x - i, fy = y - j, c = j * n + i;
    return (hs[c] * (1 - fx) + hs[c + 1] * fx) * (1 - fy) + (hs[c + n] * (1 - fx) + hs[c + n + 1] * fx) * fy;
  };
  for (let d = 0; d < o.count; d++) {
    const r = rnd() * total;
    let lo = 0, hi = n * n - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
    let x = (lo % n) + rnd(), y = ((lo / n) | 0) + rnd();
    let dx = 0, dy = 0, speed = o.initSpeed, water = 1, sed = 0;
    for (let life = 0; life < o.maxLife; life++) {
      if (x < 1 || y < 1 || x >= n - 2 || y >= n - 2) break;
      const i = x | 0, j = y | 0, fx = x - i, fy = y - j, c = j * n + i;
      const h00 = hs[c], h10 = hs[c + 1], h01 = hs[c + n], h11 = hs[c + n + 1];
      const gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy;
      const gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;
      const hOld = (h00 * (1 - fx) + h10 * fx) * (1 - fy) + (h01 * (1 - fx) + h11 * fx) * fy;
      if (hOld < seaZ) break;
      dx = dx * o.inertia - gx * (1 - o.inertia);
      dy = dy * o.inertia - gy * (1 - o.inertia);
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-12) break;
      dx /= len; dy /= len;
      const nx = x + dx, ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= n - 2 || ny >= n - 2) break;
      const hNew = hgt(nx, ny);
      const dH = hNew - hOld;
      const cap = Math.max(-dH * speed * water * o.capacity, o.minCapacity);
      if (sed > cap || dH > 0) {
        const amt = dH > 0 ? Math.min(dH, sed) : (sed - cap) * o.depositRate;
        sed -= amt; deposited += amt;
        hs[c] += amt * (1 - fx) * (1 - fy); hs[c + 1] += amt * fx * (1 - fy);
        hs[c + n] += amt * (1 - fx) * fy; hs[c + n + 1] += amt * fx * fy;
      } else {
        const amt = Math.min((cap - sed) * o.erodeRate * ero[c], -dH);
        for (let k = 0; k < BW.length; k++) {
          const ii = i + BOI[k], jj = j + BOJ[k];
          if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
          const cc = jj * n + ii;
          const want = amt * BW[k];
          const take = hs[cc] - want < seaZ ? Math.max(0, hs[cc] - seaZ) : want;
          hs[cc] -= take; sed += take; eroded += take;
        }
      }
      speed = Math.sqrt(Math.max(0, speed * speed - dH * o.gravity));
      water *= 1 - o.evaporate;
      x = nx; y = ny;
    }
  }
  for (let i = 0; i < n * n; i++) h[i] = hs[i] / Z;
  return { eroded: eroded / Z, deposited: deposited / Z };
}

module.exports = { streamPower, droplets, diffuse, DIST };
