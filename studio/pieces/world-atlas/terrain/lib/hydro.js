'use strict';
// Hydrology on a square grid: priority-flood with epsilon (Barnes et al. 2014) that also yields the
// drainage tree (receiver of every land cell = its lowest neighbour on the filled surface) and a
// topological order (receivers before donors). Plus flow accumulation and a minimax route search.

const DI = [-1, 0, 1, -1, 1, -1, 0, 1];
const DJ = [-1, -1, -1, 0, 0, 1, 1, 1];
const DIST = [Math.SQRT2, 1, Math.SQRT2, 1, 1, Math.SQRT2, 1, Math.SQRT2];

class MinHeap {
  constructor(cap) { this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  clear() { this.n = 0; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = this.n++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() { // returns the value with the smallest key; key left in this.lastKey
    const k = this.k, v = this.v;
    const top = v[0]; this.lastKey = k[0];
    const n = --this.n;
    if (n > 0) {
      const key = k[n], val = v[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= key) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = key; v[i] = val;
    }
    return top;
  }
}

function makeFloodState(n) {
  const N = n * n;
  return {
    n, order: new Int32Array(N), rec: new Int32Array(N), filled: new Float32Array(N),
    done: new Uint8Array(N), queue: new Int32Array(N), heap: new MinHeap(N), count: 0
  };
}

// h: heights; isSea: 1 for sea cells (fixed base level). Grid border cells are always outlets.
// Fills st.order (land cells, outlet side first), st.rec (receiver index, -1 for sea), st.filled.
function priorityFlood(h, isSea, st, eps) {
  const n = st.n, N = n * n;
  const { order, rec, filled, done, queue, heap } = st;
  done.fill(0); heap.clear();
  let qh = 0, qt = 0, count = 0;
  for (let c = 0; c < N; c++) {
    if (isSea[c]) { done[c] = 1; rec[c] = -1; filled[c] = h[c]; }
  }
  // seed: land cells touching the sea or the grid edge
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const c = j * n + i;
      if (done[c]) continue;
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1) {
        done[c] = 1; rec[c] = -1; filled[c] = h[c]; heap.push(h[c], c); continue;
      }
      let best = -1;
      for (let d = 0; d < 8; d++) {
        const nb = c + DJ[d] * n + DI[d];
        if (isSea[nb]) { best = nb; if (DIST[d] === 1) break; }
      }
      if (best >= 0) { done[c] = 1; rec[c] = best; filled[c] = h[c]; heap.push(h[c], c); }
    }
  }
  while (qh < qt || heap.n > 0) {
    const c = qh < qt ? queue[qh++] : heap.pop();
    order[count++] = c;
    const i = c % n, j = (c - i) / n;
    const fc = filled[c];
    const edge = i === 0 || j === 0 || i === n - 1 || j === n - 1;
    for (let d = 0; d < 8; d++) {
      if (edge) {
        const ii = i + DI[d], jj = j + DJ[d];
        if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      }
      const nb = c + DJ[d] * n + DI[d];
      if (done[nb]) continue;
      done[nb] = 1; rec[nb] = c;
      const hn = h[nb];
      if (hn <= fc + eps) { filled[nb] = fc + eps; queue[qt++] = nb; }
      else { filled[nb] = hn; heap.push(hn, nb); }
    }
  }
  st.count = count;
  return st;
}

// Flow accumulation along the drainage tree. weight: per-cell runoff (or null for 1 per cell).
function accumulate(st, weight, acc) {
  const { order, rec, count } = st;
  if (weight) for (let k = 0; k < count; k++) { const c = order[k]; acc[c] = weight[c]; }
  else for (let k = 0; k < count; k++) acc[order[k]] = 1;
  for (let k = count - 1; k >= 0; k--) {
    const c = order[k], r = rec[c];
    if (r >= 0) acc[r] += acc[c];
  }
  return acc;
}

// Lowest route between two sets of cells: minimises the highest point that must be crossed.
// passable: Uint8 (0 = blocked); seeds: array of cell indices; target: Uint8 mask.
// Returns { height, col: cell index of the highest point on the route, path: [cells] } or null.
function minimaxRoute(h, n, passable, seeds, target) {
  const N = n * n;
  const cost = new Float32Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = new MinHeap(N * 2);
  for (const s of seeds) { if (!passable[s]) continue; cost[s] = h[s]; heap.push(h[s], s); }
  while (heap.n > 0) {
    const c = heap.pop();
    if (closed[c]) continue;
    closed[c] = 1;
    if (target[c]) {
      const path = [];
      let col = c, colH = -Infinity;
      for (let p = c; p >= 0; p = prev[p]) { path.push(p); if (h[p] > colH) { colH = h[p]; col = p; } }
      return { height: cost[c], col, path: path.reverse() };
    }
    const i = c % n, j = (c - i) / n;
    for (let d = 0; d < 8; d++) {
      const ii = i + DI[d], jj = j + DJ[d];
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const nb = jj * n + ii;
      if (closed[nb] || !passable[nb]) continue;
      const nc = Math.max(cost[c], h[nb]);
      if (nc < cost[nb]) { cost[nb] = nc; prev[nb] = c; heap.push(nc, nb); }
    }
  }
  return null;
}


// Land cells sorted by ascending filled height (LSD radix sort on the float bits; heights are positive).
function sortByHeight(filled, isSea, out, tmp, counts) {
  const N = filled.length;
  const bits = new Uint32Array(filled.buffer, filled.byteOffset, N);
  let m = 0;
  for (let c = 0; c < N; c++) if (!isSea[c]) out[m++] = c;
  let src = out, dst = tmp;
  for (let pass = 0; pass < 3; pass++) {
    const shift = pass * 11;
    counts.fill(0);
    for (let k = 0; k < m; k++) counts[(bits[src[k]] >>> shift) & 2047]++;
    let sum = 0;
    for (let b = 0; b < 2048; b++) { const t = counts[b]; counts[b] = sum; sum += t; }
    for (let k = 0; k < m; k++) { const c = src[k]; dst[counts[(bits[c] >>> shift) & 2047]++] = c; }
    const t = src; src = dst; dst = t;
  }
  if (src !== out) out.set(src.subarray(0, m));
  return m;
}

// Steepest-descent receiver of every land cell on the filled surface (slope = drop / distance).
function sdReceivers(f, n, isSea, order, m, rec, rdist) {
  for (let k = 0; k < m; k++) {
    const c = order[k];
    const i = c % n, j = (c - i) / n;
    let best = -1, bs = 0, bd = 1;
    for (let d = 0; d < 8; d++) {
      const ii = i + DI[d], jj = j + DJ[d];
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const nb = jj * n + ii;
      const s = (f[c] - f[nb]) / DIST[d];
      if (s > bs) { bs = s; best = nb; bd = DIST[d]; }
    }
    rec[c] = best; rdist[c] = bd;
  }
}

// Multiple-flow-direction accumulation (flow split to all lower neighbours by slope^p), in descending order.
function mfdAccumulate(f, n, isSea, order, m, rain, p, acc) {
  for (let k = 0; k < m; k++) { const c = order[k]; acc[c] = rain ? rain[c] : 1; }
  const w = new Float64Array(8);
  for (let k = m - 1; k >= 0; k--) {
    const c = order[k];
    const i = c % n, j = (c - i) / n;
    let sum = 0;
    for (let d = 0; d < 8; d++) {
      w[d] = 0;
      const ii = i + DI[d], jj = j + DJ[d];
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const s = (f[c] - f[jj * n + ii]) / DIST[d];
      if (s > 0) { const q = Math.pow(s, p); w[d] = q; sum += q; }
    }
    if (sum <= 0) continue;
    const a = acc[c] / sum;
    for (let d = 0; d < 8; d++) {
      if (w[d] === 0) continue;
      const nb = (j + DJ[d]) * n + i + DI[d];
      if (!isSea[nb]) acc[nb] += a * w[d];
    }
  }
}

// Single-flow accumulation along receivers, in descending order.
function sdAccumulate(order, m, rec, isSea, rain, acc) {
  for (let k = 0; k < m; k++) { const c = order[k]; acc[c] = rain ? rain[c] : 1; }
  for (let k = m - 1; k >= 0; k--) {
    const c = order[k], r = rec[c];
    if (r >= 0 && !isSea[r]) acc[r] += acc[c];
  }
}

// Stochastic single-flow receivers (Rho8 style): a random lower neighbour, chosen with probability
// proportional to slope^p. Channels stay single-thread but lose the 8-direction grid bias over iterations.
function rhoReceivers(f, n, isSea, order, m, rec, rdist, rnd, p) {
  const w = new Float64Array(8);
  for (let k = 0; k < m; k++) {
    const c = order[k];
    const i = c % n, j = (c - i) / n;
    let sum = 0;
    for (let d = 0; d < 8; d++) {
      w[d] = 0;
      const ii = i + DI[d], jj = j + DJ[d];
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const s = (f[c] - f[jj * n + ii]) / DIST[d];
      if (s > 0) { w[d] = Math.pow(s, p); sum += w[d]; }
    }
    if (sum <= 0) { rec[c] = -1; rdist[c] = 1; continue; }
    let r = rnd() * sum, pick = 0;
    for (let d = 0; d < 8; d++) { if (w[d] === 0) continue; pick = d; r -= w[d]; if (r <= 0) break; }
    rec[c] = (j + DJ[pick]) * n + i + DI[pick]; rdist[c] = DIST[pick];
  }
}

// Breach hollows deeper than minDepth (except those holding a keep cell, e.g. designed lakes): a one-cell
// channel is cut from the lowest cell of the hollow along its spill path (the flood tree) until the ground
// falls below the channel. Needs st from priorityFlood on H. Returns { breached, kept, shallow }.
function breachDepressions(H, isSea, st, n, minDepth, keep) {
  const N = n * n, filled = st.filled, rec = st.rec;
  const comp = new Int32Array(N).fill(-1);
  const stack = new Int32Array(N);
  const isDep = (c) => !isSea[c] && filled[c] - H[c] > 2e-5;
  let breached = 0, kept = 0, shallow = 0, nComp = 0;
  for (let c0 = 0; c0 < N; c0++) {
    if (comp[c0] >= 0 || !isDep(c0)) continue;
    let sp = 0; stack[sp++] = c0; comp[c0] = nComp;
    let bottom = c0, depth = 0, hasKeep = false;
    while (sp > 0) {
      const c = stack[--sp];
      if (H[c] < H[bottom]) bottom = c;
      const d = filled[c] - H[c]; if (d > depth) depth = d;
      if (keep && keep[c]) hasKeep = true;
      const i = c % n, j = (c - i) / n;
      if (i > 0 && comp[c - 1] < 0 && isDep(c - 1)) { comp[c - 1] = nComp; stack[sp++] = c - 1; }
      if (i < n - 1 && comp[c + 1] < 0 && isDep(c + 1)) { comp[c + 1] = nComp; stack[sp++] = c + 1; }
      if (j > 0 && comp[c - n] < 0 && isDep(c - n)) { comp[c - n] = nComp; stack[sp++] = c - n; }
      if (j < n - 1 && comp[c + n] < 0 && isDep(c + n)) { comp[c + n] = nComp; stack[sp++] = c + n; }
    }
    nComp++;
    if (hasKeep) { kept++; continue; }
    if (depth < minDepth) { shallow++; continue; }
    let level = H[bottom], p = rec[bottom], guard = 0;
    while (p >= 0 && !isSea[p] && guard++ < N) {
      level -= 2e-6;
      if (H[p] <= level) break;
      H[p] = level;
      p = rec[p];
    }
    breached++;
  }
  return { breached, kept, shallow };
}

module.exports = { DI, DJ, DIST, MinHeap, makeFloodState, priorityFlood, accumulate, minimaxRoute, sortByHeight, sdReceivers, mfdAccumulate, sdAccumulate, rhoReceivers, breachDepressions };
