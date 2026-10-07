'use strict';
// Cover masks on the final grid: forest density + type, wheat, snow. Plus slope.
const G = require('./geom');

const { frameOf } = require('./design');

const { clamp, smoothstep, lerp } = G;
const FOREST = { NONE: 0, WOOD: 1, EYES: 2, PINE: 3, CRYSTAL: 4, SWAMP: 5 };

// slope magnitude in height per u
function slopeMap(H, n) {
  const s = new Float32Array(n * n);
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    const c = j * n + i;
    const gx = (H[c + 1] - H[c - 1]) * 0.5 * n, gy = (H[c + n] - H[c - n]) * 0.5 * n;
    s[c] = Math.sqrt(gx * gx + gy * gy);
  }
  return s;
}

function inRotEllipse(u, v, cu, cv, r, stretch, axisDeg) {
  const a = axisDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const du = u - cu, dv = v - cv;
  const x = (du * ca + dv * sa) / (r * stretch), y = (-du * sa + dv * ca) / (r / Math.sqrt(stretch));
  return Math.sqrt(x * x + y * y);
}

const FOREST_BASE = { 4: [0.40, 0.10], 5: [0.45, 0.05], 6: [0.62, -0.05], 7: [0, 1], 8: [0.55, 0.0], 9: [0.45, 0.1],
  10: [0.35, 0.18], 11: [0.45, 0.08], 12: [0, 1], 13: [0.4, 0.1] };   // region id: [density, patch threshold]

function forestMasks(L, P, n, H, C, region, slope, lake, river, nz) {
  const N = n * n;
  const { S, dv } = frameOf(L);
  // low hilltops (ground standing above its surroundings) in the open lowlands carry woods
  const Hb = G.blur(H, n, Math.round(0.022 * S * n), 2);
  const HILL_WOOD_REGIONS = { 10: 0.75, 11: 0.55 };   // only the clearer hills, so the woods stay few
  const RIVER_CELLS = 4000 * S * S;     // flow (cells) above which a wood thins out by the river
  const dens = new Uint8Array(N), type = new Uint8Array(N);
  const place = (k) => L.places.find((p) => p.key === k);
  const eyes = place('forest_of_eyes'), star = place('starbloom_fields');
  const groves = L.places.filter((p) => p.kind === 'crystal_grove');
  const clears = L.castles.map((k) => [k.u, k.v, k.r * 0.9]).concat(
    L.places.filter((p) => ['city', 'spires', 'stone_hands', 'windmill'].includes(p.kind)).map((p) => [p.u, p.v, (p.r || 0.006) * 1.2]));
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n;
    const treeLine = lerp(P.treeLine - 0.06, P.treeLine + 0.02, clamp((dv(v) - 0.15) / 0.75, 0, 1));
    for (let i = 0; i < n; i++) {
      const c = j * n + i;
      if (C[c] <= 0 || lake[c]) continue;
      const u = (i + 0.5) / n;
      const r = region[c];
      const base = FOREST_BASE[r] || [0, 1];
      const h = H[c];
      const patch = nz.fbm(u * 13, v * 13, 5, 2, 0.5) + 0.35 * nz.fbm(u * 42 + 7, v * 42, 3, 2, 0.5);
      let d = base[0] * smoothstep(base[1] - 0.06, base[1] + 0.10, patch);
      d *= 1 - smoothstep(treeLine - 0.07, treeLine, h);
      d *= 1 - smoothstep(5 / S, 11 / S, slope[c]);
      d *= smoothstep(0.0, 0.004 * S, C[c]);
      if (river[c] > RIVER_CELLS) d *= 0.4;
      let t = h > 0.36 || r === 4 || r === 5 ? FOREST.PINE : FOREST.WOOD;
      if (r === 9) { t = FOREST.SWAMP; d = 0.35 * smoothstep(-0.1, 0.3, patch); }
      // the Forest of Eyes: dark, old, dense; keeps to the low ground
      const e = inRotEllipse(u, v, eyes.u, eyes.v, eyes.r, eyes.stretch, eyes.axis) + 0.18 * nz.fbm(u * 30, v * 30, 3, 2, 0.5);
      if (e < 1 && h < 0.40) { const de = 0.97 * (1 - smoothstep(0.82, 1.0, e)); if (de > 0.15) { d = Math.max(d, de); t = FOREST.EYES; } }
      for (const g of groves) {
        const dg = Math.hypot(u - g.u, v - g.v) / g.r + 0.2 * nz.fbm(u * 50, v * 50, 2, 2, 0.5);
        if (dg < 1) { d = Math.max(d, 0.8 * (1 - smoothstep(0.7, 1, dg))); t = FOREST.CRYSTAL; }
      }
      if (HILL_WOOD_REGIONS[r] && h < 0.40) {
        const rise = (H[c] - Hb[c]) / 0.010 + 0.35 * nz.fbm(u * 26 + 9, v * 26, 3, 2, 0.5);
        const dh = HILL_WOOD_REGIONS[r] * smoothstep(1.05, 1.5, rise);
        if (dh > d) { d = dh; t = FOREST.WOOD; }
      }
      const ds = Math.hypot(u - star.u, v - star.v) / star.r;
      if (ds < 1.2) d *= smoothstep(0.8, 1.2, ds);
      for (const [cu, cv, cr] of clears) { const dc = Math.hypot(u - cu, v - cv) / cr; if (dc < 1.2) d *= smoothstep(0.6, 1.2, dc); }
      if (d > 0.02) { dens[c] = Math.round(clamp(d, 0, 1) * 255); type[c] = t; }
    }
  }
  return { dens, type };
}

function wheatMask(L, n, C, lake, river, nz) {
  const { S } = frameOf(L);
  const m = new Uint8Array(n * n);
  G.fillPolygon(m, n, L.wheat.poly, 1);
  const f = G.blur(Float32Array.from(m), n, Math.round(0.006 * S * n), 2);
  const out = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n;
    for (let i = 0; i < n; i++) {
      const c = j * n + i;
      if (f[c] <= 0.01 || C[c] <= 0 || lake[c]) continue;
      const u = (i + 0.5) / n;
      let w = smoothstep(0.3, 0.8, f[c]) * (0.78 + 0.22 * nz.fbm(u * 60, v * 60, 3, 2, 0.5));
      if (river[c] > 1500 * S * S) w = 0;
      out[c] = Math.round(clamp(w, 0, 1) * 255);
    }
  }
  return out;
}

function snowMask(L, P, n, H, C, slope, nz) {
  const { S, dv } = frameOf(L);
  const out = new Uint8Array(n * n);
  for (let j = 1; j < n - 1; j++) {
    const v = (j + 0.5) / n;
    const line = lerp(P.snowLine.north, P.snowLine.south, clamp((dv(v) - 0.2) / 0.7, 0, 1));
    for (let i = 1; i < n - 1; i++) {
      const c = j * n + i;
      if (C[c] <= 0 || H[c] < line - 0.08) continue;
      const u = (i + 0.5) / n;
      const northFacing = clamp((H[c + n] - H[c - n]) * 0.5 * n * S / 6, -1, 1); // ground rising to the south faces north
      const eff = H[c] + 0.03 * northFacing + 0.025 * nz.fbm(u * 50, v * 50, 3, 2, 0.5);
      let s = smoothstep(line - 0.02, line + 0.07, eff);
      s *= 1 - 0.75 * smoothstep(16 / S, 34 / S, slope[c]);
      if (s > 0.02) out[c] = Math.round(clamp(s, 0, 1) * 255);
    }
  }
  return out;
}

module.exports = { FOREST, slopeMap, forestMasks, wheatMask, snowMask };
