'use strict';
// Vector outputs and checks: coast contour polylines, traced rivers, lowest routes through the ranges.
const { minimaxRoute } = require('./hydro');

// Marching squares contour of (a - level) on an n x n grid; returns polylines in (u, v), simplified.
function contour(a, n, level, tol) {
  const segs = [];
  const key = (x, y) => Math.round(x * 4) + ',' + Math.round(y * 4);
  const lerpP = (i0, j0, i1, j1) => {
    const v0 = a[j0 * n + i0] - level, v1 = a[j1 * n + i1] - level;
    const t = v0 / (v0 - v1);
    return [i0 + (i1 - i0) * t + 0.5, j0 + (j1 - j0) * t + 0.5];
  };
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const b0 = a[j * n + i] > level ? 1 : 0, b1 = a[j * n + i + 1] > level ? 1 : 0;
      const b2 = a[(j + 1) * n + i + 1] > level ? 1 : 0, b3 = a[(j + 1) * n + i] > level ? 1 : 0;
      const code = b0 | (b1 << 1) | (b2 << 2) | (b3 << 3);
      if (code === 0 || code === 15) continue;
      const T = () => lerpP(i, j, i + 1, j), R = () => lerpP(i + 1, j, i + 1, j + 1);
      const B = () => lerpP(i, j + 1, i + 1, j + 1), Lf = () => lerpP(i, j, i, j + 1);
      switch (code) {
        case 1: case 14: segs.push([Lf(), T()]); break;
        case 2: case 13: segs.push([T(), R()]); break;
        case 3: case 12: segs.push([Lf(), R()]); break;
        case 4: case 11: segs.push([R(), B()]); break;
        case 6: case 9: segs.push([T(), B()]); break;
        case 7: case 8: segs.push([Lf(), B()]); break;
        case 5: segs.push([Lf(), T()], [R(), B()]); break;
        case 10: segs.push([T(), R()], [B(), Lf()]); break;
        default: break;
      }
    }
  }
  // link segments into polylines
  const ends = new Map();
  const used = new Uint8Array(segs.length);
  segs.forEach((s, k) => {
    for (const p of s) { const kk = key(p[0], p[1]); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push(k); }
  });
  const lines = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const line = [segs[k][0], segs[k][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const tip = dir ? line[line.length - 1] : line[0];
        const cand = (ends.get(key(tip[0], tip[1])) || []).find((q) => !used[q]);
        if (cand === undefined) break;
        used[cand] = 1;
        const s = segs[cand];
        const same = key(s[0][0], s[0][1]) === key(tip[0], tip[1]);
        const next = same ? s[1] : s[0];
        if (dir) line.push(next); else line.unshift(next);
      }
    }
    if (line.length >= 4) lines.push(rdp(line, tol).map((p) => [+(p[0] / n).toFixed(5), +(p[1] / n).toFixed(5)]));
  }
  lines.sort((p, q) => q.length - p.length);
  return lines;
}

// Ramer-Douglas-Peucker simplification
function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const f = pts[0], l = pts[pts.length - 1];
  if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-6) { // closed loop: split at the point farthest from the start
    let far = 1, fd = -1;
    for (let k = 1; k < pts.length - 1; k++) { const d = Math.hypot(pts[k][0] - f[0], pts[k][1] - f[1]); if (d > fd) { fd = d; far = k; } }
    const a = rdp(pts.slice(0, far + 1), tol), b = rdp(pts.slice(far), tol);
    return a.concat(b.slice(1));
  }
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bd = tol;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1e-9;
    for (let k = a + 1; k < b; k++) {
      const d = Math.abs((pts[k][0] - ax) * dy - (pts[k][1] - ay) * dx) / l;
      if (d > bd) { bd = d; best = k; }
    }
    if (best >= 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, k) => keep[k]);
}

// Follow the drainage tree from the biggest-flow cell near (u, v) down to the sea or a lake.
function traceRiver(n, rec, acc, isSea, lake, u, v, snap) {
  let best = -1, ba = -1;
  const r = Math.round(snap * n), ci = Math.floor(u * n), cj = Math.floor(v * n);
  for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
    if (i < 0 || j < 0 || i >= n || j >= n) continue;
    const c = j * n + i;
    if (!isSea[c] && acc[c] > ba && (i - ci) ** 2 + (j - cj) ** 2 <= r * r) { ba = acc[c]; best = c; }
  }
  const cells = [];
  let c = best, guard = 0;
  while (c >= 0 && !isSea[c] && guard++ < n * 8) { cells.push(c); c = rec[c]; }
  if (c >= 0) cells.push(c);
  const pts = cells.map((q) => [+(((q % n) + 0.5) / n).toFixed(5), +((Math.floor(q / n) + 0.5) / n).toFixed(5)]);
  const flow = cells.map((q) => Math.round(acc[q]));
  return { pts: rdpKeepFlow(pts, flow, 0.6 / n), end: c >= 0 && isSea[c] ? 'sea' : 'lake/inland' };
}
function rdpKeepFlow(pts, flow, tol) {
  const idx = pts.map((p, k) => [p[0], p[1], k]);
  const kept = rdp(idx, tol);
  return kept.map((p) => [p[0], p[1], flow[p[2]]]);
}

// Lowest crossings of the northern ranges. Returns a report object (and logs it).
function rangeCrossings(H, n, isSea, opts) {
  const N = n * n;
  const cellsWhere = (pred) => { const out = []; for (let c = 0; c < N; c++) { const u = ((c % n) + 0.5) / n, v = (Math.floor(c / n) + 0.5) / n; if (pred(u, v, c)) out.push(c); } return out; };
  const run = (name, uMin, uMax, blocks) => {
    const passable = new Uint8Array(N);
    const target = new Uint8Array(N);
    for (let c = 0; c < N; c++) {
      if (isSea[c]) continue;
      const u = ((c % n) + 0.5) / n, v = (Math.floor(c / n) + 0.5) / n;
      if (u < uMin || u > uMax) continue;
      let blocked = false;
      for (const [bu, bv, br] of blocks) if ((u - bu) ** 2 + (v - bv) ** 2 < br * br) blocked = true;
      if (blocked) continue;
      passable[c] = 1;
      if (v > opts.southV) target[c] = 1;
    }
    const seeds = cellsWhere((u, v, c) => passable[c] && v > opts.northV[0] && v < opts.northV[1]);
    const r = minimaxRoute(H, n, passable, seeds, target);
    if (!r) return { name, height: null };
    const cu = ((r.col % n) + 0.5) / n, cv = (Math.floor(r.col / n) + 0.5) / n;
    const path = r.path.map((c) => [((c % n) + 0.5) / n, (Math.floor(c / n) + 0.5) / n, H[c]]);
    return { name, height: +r.height.toFixed(4), col: [+cu.toFixed(4), +cv.toFixed(4)], path };
  };
  const report = [];
  for (const side of opts.sides) {
    const first = run(side.name, side.u[0], side.u[1], []);
    const br = opts.block || 0.04;
    const blocks = first.col ? [[first.col[0], first.col[1], br]] : [];
    const second = run(side.name + ' (first way closed)', side.u[0], side.u[1], blocks);
    const blocks2 = second.col ? blocks.concat([[second.col[0], second.col[1], br]]) : blocks;
    const third = run(side.name + ' (two ways closed)', side.u[0], side.u[1], blocks2);
    report.push({ side: side.name, lowest: first, next: second, third });
    delete second.path; delete third.path;
  }
  // a profile: the lowest crossing inside narrow west-east bands
  const bands = [];
  const bw = opts.bandWidth || 0.045, bstep = opts.bandStep || 0.03;
  for (let u0 = opts.bandFrom || 0.04; u0 < (opts.bandTo || 0.94); u0 += bstep) {
    const r = run('band', u0, u0 + bw, []);
    bands.push({ u: +(u0 + bw / 2).toFixed(3), height: r.height, col: r.col });
  }
  return { sides: report, bands };
}

module.exports = { contour, rdp, traceRiver, rangeCrossings };
