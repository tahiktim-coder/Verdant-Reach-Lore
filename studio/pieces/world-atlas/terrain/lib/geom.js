'use strict';
// Geometry and grid helpers: polylines, polygon fill, Euclidean distance transform, resampling.
// Grids are row-major Float32Array / Uint8Array of n * n; cell (i, j) has its centre at ((i + .5) / n, (j + .5) / n).

function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

// Chaikin corner cutting; keeps the end points of an open line.
function chaikin(pts, iters, closed) {
  let p = pts.map((q) => q.slice());
  for (let k = 0; k < iters; k++) {
    const out = [];
    const m = p.length;
    if (!closed) out.push(p[0]);
    const last = closed ? m : m - 1;
    for (let i = 0; i < last; i++) {
      const a = p[i], b = p[(i + 1) % m];
      const qa = a.map((x, d) => 0.75 * x + 0.25 * b[d]);
      const qb = a.map((x, d) => 0.25 * x + 0.75 * b[d]);
      out.push(qa, qb);
    }
    if (!closed) out.push(p[m - 1]);
    p = out;
  }
  return p;
}

// Prepared polyline: segments with cumulative arclength, for fast distance + parameter queries.
function preparePolyline(pts) {
  const m = pts.length;
  const ax = new Float64Array(m - 1), ay = new Float64Array(m - 1);
  const dx = new Float64Array(m - 1), dy = new Float64Array(m - 1);
  const l2 = new Float64Array(m - 1), s0 = new Float64Array(m - 1);
  let s = 0;
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  for (let i = 0; i < m - 1; i++) {
    ax[i] = pts[i][0]; ay[i] = pts[i][1];
    dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1];
    l2[i] = dx[i] * dx[i] + dy[i] * dy[i] || 1e-12;
    s0[i] = s; s += Math.sqrt(l2[i]);
  }
  for (const q of pts) {
    minU = Math.min(minU, q[0]); maxU = Math.max(maxU, q[0]);
    minV = Math.min(minV, q[1]); maxV = Math.max(maxV, q[1]);
  }
  return { pts, ax, ay, dx, dy, l2, s0, length: s, bbox: [minU, minV, maxU, maxV] };
}

// Nearest point on a prepared polyline: returns [distance, t (0..1 along the arclength), signed side]
function polyQuery(pl, x, y, out) {
  let best = Infinity, bs = 0, side = 0;
  const n = pl.ax.length;
  for (let i = 0; i < n; i++) {
    const px = x - pl.ax[i], py = y - pl.ay[i];
    let t = (px * pl.dx[i] + py * pl.dy[i]) / pl.l2[i];
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = px - t * pl.dx[i], qy = py - t * pl.dy[i];
    const d2 = qx * qx + qy * qy;
    if (d2 < best) {
      best = d2;
      bs = pl.s0[i] + t * Math.sqrt(pl.l2[i]);
      side = pl.dx[i] * py - pl.dy[i] * px; // >0: right of travel direction in (u east, v south) space
    }
  }
  out[0] = Math.sqrt(best); out[1] = bs / pl.length; out[2] = side >= 0 ? 1 : -1;
  return out;
}

// Even-odd scanline fill of a polygon (u, v coordinates) into a Uint8Array mask, value 1.
function fillPolygon(mask, n, poly, value) {
  const val = value === undefined ? 1 : value;
  const m = poly.length;
  const xs = [];
  for (let j = 0; j < n; j++) {
    const y = (j + 0.5) / n;
    xs.length = 0;
    for (let k = 0; k < m; k++) {
      const a = poly[k], b = poly[(k + 1) % m];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(xs[k] * n - 0.5));
      const i1 = Math.min(n - 1, Math.floor(xs[k + 1] * n - 0.5));
      for (let i = i0; i <= i1; i++) mask[j * n + i] = val;
    }
  }
}

function pointInPolygon(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// 1D squared distance transform (Felzenszwalb & Huttenlocher)
function dt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

// Euclidean distance (in cells) from every cell to the nearest cell where mask is set.
function edt(mask, n) {
  const INF = 1e20;
  const g = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) g[i] = mask[i] ? 0 : INF;
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  for (let i = 0; i < n; i++) { // columns
    for (let j = 0; j < n; j++) f[j] = g[j * n + i];
    dt1d(f, n, d, v, z);
    for (let j = 0; j < n; j++) g[j * n + i] = d[j];
  }
  const out = new Float32Array(n * n);
  for (let j = 0; j < n; j++) { // rows
    for (let i = 0; i < n; i++) f[i] = g[j * n + i];
    dt1d(f, n, d, v, z);
    for (let i = 0; i < n; i++) out[j * n + i] = Math.sqrt(d[i]);
  }
  return out;
}

// Signed distance in u units: + inside the mask, - outside.
function signedDistance(mask, n) {
  const inv = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) inv[i] = mask[i] ? 0 : 1;
  const dIn = edt(inv, n);   // inside cells: distance to the nearest outside cell
  const dOut = edt(mask, n); // outside cells: distance to the nearest inside cell
  const s = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) s[i] = mask[i] ? (dIn[i] - 0.5) / n : -(dOut[i] - 0.5) / n;
  return s;
}

// Bilinear sample of a grid at (u, v), clamped.
function sample(a, n, u, v) {
  let x = u * n - 0.5, y = v * n - 0.5;
  x = x < 0 ? 0 : x > n - 1.001 ? n - 1.001 : x;
  y = y < 0 ? 0 : y > n - 1.001 ? n - 1.001 : y;
  const i = x | 0, j = y | 0, fx = x - i, fy = y - j;
  const k = j * n + i;
  return (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fy) + (a[k + n] * (1 - fx) + a[k + n + 1] * fx) * fy;
}

// Catmull-Rom bicubic upsample by an integer factor (smooth, keeps valleys sharp-ish).
function upsampleBicubic(a, n, f) {
  const m = n * f;
  const out = new Float32Array(m * m);
  const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const at = (i, j) => a[clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)];
  for (let J = 0; J < m; J++) {
    const y = (J + 0.5) / f - 0.5; const j = Math.floor(y); const ty = y - j;
    for (let I = 0; I < m; I++) {
      const x = (I + 0.5) / f - 0.5; const i = Math.floor(x); const tx = x - i;
      const r0 = cr(at(i - 1, j - 1), at(i, j - 1), at(i + 1, j - 1), at(i + 2, j - 1), tx);
      const r1 = cr(at(i - 1, j), at(i, j), at(i + 1, j), at(i + 2, j), tx);
      const r2 = cr(at(i - 1, j + 1), at(i, j + 1), at(i + 1, j + 1), at(i + 2, j + 1), tx);
      const r3 = cr(at(i - 1, j + 2), at(i, j + 2), at(i + 1, j + 2), at(i + 2, j + 2), tx);
      out[J * m + I] = cr(r0, r1, r2, r3, ty);
    }
  }
  return out;
}

// Box downsample by an integer factor.
function downsample(a, n, f) {
  const m = n / f;
  const out = new Float32Array(m * m);
  const inv = 1 / (f * f);
  for (let J = 0; J < m; J++) {
    for (let I = 0; I < m; I++) {
      let s = 0;
      for (let dj = 0; dj < f; dj++) {
        const row = (J * f + dj) * n + I * f;
        for (let di = 0; di < f; di++) s += a[row + di];
      }
      out[J * m + I] = s * inv;
    }
  }
  return out;
}

// Separable box blur (radius r cells), repeated `passes` times (3 passes ~ gaussian).
function blur(a, n, r, passes) {
  let src = Float32Array.from(a);
  let tmp = new Float32Array(n * n);
  const w = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < n; j++) {
      const row = j * n;
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[row + clamp(k, 0, n - 1)];
      for (let i = 0; i < n; i++) {
        tmp[row + i] = s / w;
        s += src[row + clamp(i + r + 1, 0, n - 1)] - src[row + clamp(i - r, 0, n - 1)];
      }
    }
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[clamp(k, 0, n - 1) * n + i];
      for (let j = 0; j < n; j++) {
        src[j * n + i] = s / w;
        s += tmp[clamp(j + r + 1, 0, n - 1) * n + i] - tmp[clamp(j - r, 0, n - 1) * n + i];
      }
    }
  }
  return src;
}


// Separable running max over a (2r+1)^2 square window (monotonic deque).
function maxFilter(a, n, r) {
  const tmp = new Float32Array(n * n), out = new Float32Array(n * n);
  const q = new Int32Array(n + 2 * r + 2);
  const pass = (src, dst, stride, step) => {
    for (let line = 0; line < n; line++) {
      const base = line * stride;
      let head = 0, tail = 0;
      for (let k = 0; k < n + r; k++) {
        if (k < n) {
          const val = src[base + k * step];
          while (tail > head && src[base + q[tail - 1] * step] <= val) tail--;
          q[tail++] = k;
        }
        const centre = k - r;
        if (centre >= 0) {
          while (q[head] < centre - r) head++;
          dst[base + centre * step] = src[base + q[head] * step];
        }
      }
    }
  };
  pass(a, tmp, n, 1);      // rows
  pass(tmp, out, 1, n);    // columns
  return out;
}

module.exports = {
  maxFilter, clamp, smoothstep, lerp, chaikin, preparePolyline, polyQuery, fillPolygon, pointInPolygon,
  edt, signedDistance, sample, upsampleBicubic, downsample, blur
};
