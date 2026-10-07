'use strict';
// The DESIGNED height field: coast from the hand-placed outline (warped by fbm), mountains raised from crest
// lines with ridged noise, flat plains, carved pass corridors, river valleys and lake basins.
const G = require('./geom');

const { clamp, smoothstep, lerp } = G;

// the layout's frame: S = design -> map scale; du / dv map coordinates back to design coordinates
function frameOf(L) {
  const F = L.frame || { scale: 1, design: [0.5, 0.5], map: [0.5, 0.5] };
  const S = F.scale;
  return { S, du: (u) => F.design[0] + (u - F.map[0]) / S, dv: (v) => F.design[1] + (v - F.map[1]) / S };
}

// polynomial smooth max / min
function smax(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(a, b, h) + k * h * (1 - h); }
function smin(a, b, k) { return -smax(-a, -b, k); }

function spotField(spec, u, v) {
  let acc = spec.base;
  for (const [su, sv, r, val] of spec.spots) {
    const g = Math.exp(-2 * ((u - su) ** 2 + (v - sv) ** 2) / (r * r));
    acc = lerp(acc, val, g);
  }
  return acc;
}

// For every cell in a polyline's bounding box (+ margin) call fn(c, u, v, d, t, nu, nv).
function forPolyline(n, pl, margin, fn) {
  const out = [0, 0, 0];
  const [a0, b0, a1, b1] = pl.bbox;
  const i0 = Math.max(0, Math.floor((a0 - margin) * n)), i1 = Math.min(n - 1, Math.ceil((a1 + margin) * n));
  const j0 = Math.max(0, Math.floor((b0 - margin) * n)), j1 = Math.min(n - 1, Math.ceil((b1 + margin) * n));
  for (let j = j0; j <= j1; j++) {
    const v = (j + 0.5) / n;
    for (let i = i0; i <= i1; i++) {
      const u = (i + 0.5) / n;
      G.polyQuery(pl, u, v, out);
      if (out[0] <= margin) fn(j * n + i, u, v, out[0], out[1], out[2]);
    }
  }
}

function maskFromPolygon(n, poly, featherU) {
  const m = new Uint8Array(n * n);
  G.fillPolygon(m, n, poly, 1);
  const f = Float32Array.from(m);
  const r = Math.max(1, Math.round(featherU * n / 2));
  return G.blur(f, n, r, 2);
}

function ellipseMask(n, e, featherU) {
  const f = new Float32Array(n * n);
  const ca = Math.cos(e.axis * Math.PI / 180), sa = Math.sin(e.axis * Math.PI / 180);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const du = (i + 0.5) / n - e.u, dv = (j + 0.5) / n - e.v;
    const x = (du * ca + dv * sa) / e.ru, y = (-du * sa + dv * ca) / e.rv;
    f[j * n + i] = x * x + y * y < 1 ? 1 : 0;
  }
  return G.blur(f, n, Math.max(1, Math.round(featherU * n / 2)), 2);
}

// ---------------------------------------------------------------------------------------------
// COAST: signed distance to the shore in u units (+ land), at resolution n.
function buildCoast(L, n, nz) {
  const mask = new Uint8Array(n * n);
  G.fillPolygon(mask, n, G.chaikin(L.outline, 1, true), 1);
  for (const [bu, bv, ru, rv] of L.landBlobs) {
    for (let j = Math.floor((bv - rv) * n); j <= Math.ceil((bv + rv) * n); j++) {
      for (let i = Math.floor((bu - ru) * n); i <= Math.ceil((bu + ru) * n); i++) {
        const du = ((i + 0.5) / n - bu) / ru, dv = ((j + 0.5) / n - bv) / rv;
        if (du * du + dv * dv < 1) mask[j * n + i] = 1;
      }
    }
  }
  const S0 = G.signedDistance(mask, n);
  const C = new Float32Array(n * n);
  const rough = new Float32Array(n * n);
  const cliff = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const r = spotField(L.coastRough, u, v);
      const c = j * n + i;
      rough[c] = r; cliff[c] = spotField(L.coastCliff, u, v);
      const wx = L.coastWarp * r * (nz.fbm(u * 6, v * 6, 4, 2, 0.5) + 0.6 * nz.fbm(u * 15 + 9, v * 15, 3, 2, 0.5));
      const wy = L.coastWarp * r * (nz.fbm(u * 6 + 31, v * 6 + 7, 4, 2, 0.5) + 0.6 * nz.fbm(u * 15, v * 15 + 9, 3, 2, 0.5));
      const fray = L.coastFray * r * (nz.fbm(u * 55, v * 55, 4, 2.1, 0.55) + 0.5 * nz.ridged(u * 30, v * 30, 3, 2, 0.5) - 0.25);
      C[c] = G.sample(S0, n, u + wx, v + wy) + fray;
    }
  }
  // cuts: fjords, inlets, the estuary
  const { S } = frameOf(L);
  for (const cut of L.cuts) {
    const pl = G.preparePolyline(G.chaikin(cut.pts, 2, false));
    const margin = Math.max(...cut.w) + 0.12;
    const perPoint = cut.w.length === cut.pts.length && cut.w.length > 2;
    const raw = perPoint ? G.preparePolyline(cut.pts) : null;
    const wAt = (t) => {
      if (!perPoint) return lerp(cut.w[0], cut.w[1], Math.pow(t, 0.7));
      const s = t * raw.length;
      let k = 0;
      while (k < raw.s0.length - 1 && raw.s0[k + 1] <= s) k++;
      const f = clamp((s - raw.s0[k]) / Math.sqrt(raw.l2[k]), 0, 1);
      return lerp(cut.w[k], cut.w[k + 1], f * f * (3 - 2 * f));
    };
    forPolyline(n, pl, margin, (c, u, v, d, t) => {
      // banks: the width swells and pinches along the fjord, the edge wanders at two scales
      const w = wAt(t) * (1 + 0.30 * nz.fbm(u * 38 + 2, v * 38, 3, 2, 0.5) + 0.12 * nz.fbm(u * 110, v * 110, 2, 2, 0.5));
      const dd = d + S * (0.0016 * nz.fbm(u * 60 + 5, v * 60, 3, 2, 0.5) + 0.0008 * nz.fbm(u * 150 + 5, v * 150, 3, 2, 0.5));
      C[c] = Math.min(C[c], dd - w);
    });
  }
  // islands
  for (const [iu, iv, r, st, ax] of L.islands) {
    const ca = Math.cos(ax * Math.PI / 180), sa = Math.sin(ax * Math.PI / 180);
    const R = r * Math.max(1, st) * 1.6 + 0.075;
    for (let j = Math.max(0, Math.floor((iv - R) * n)); j <= Math.min(n - 1, Math.ceil((iv + R) * n)); j++) {
      for (let i = Math.max(0, Math.floor((iu - R) * n)); i <= Math.min(n - 1, Math.ceil((iu + R) * n)); i++) {
        const u = (i + 0.5) / n, v = (j + 0.5) / n;
        const du = u - iu, dv = v - iv;
        const x = (du * ca + dv * sa) / (r * st), y = (-du * sa + dv * ca) / r;
        const e = (Math.sqrt(x * x + y * y) - 1) * r;
        const s = -e + 0.35 * r * nz.fbm(u * 160, v * 160, 3, 2, 0.5);
        const c = j * n + i;
        if (s > C[c]) C[c] = s;
      }
    }
  }
  return { C, rough, cliff };
}

// ---------------------------------------------------------------------------------------------
// REGIONS (design version: the border follows the border river guide)
function lineAtU(line, u) { // v of a west-east polyline at u
  for (let k = 0; k < line.length - 1; k++) {
    const a = line[k], b = line[k + 1];
    if (u >= a[0] && u <= b[0]) return lerp(a[1], b[1], (u - a[0]) / (b[0] - a[0] || 1));
  }
  return u < line[0][0] ? line[0][1] : line[line.length - 1][1];
}
function lineAtV(line, v) { // u of a north-south polyline at v
  for (let k = 0; k < line.length - 1; k++) {
    const a = line[k], b = line[k + 1];
    const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
    if (v >= lo && v <= hi) return lerp(a[0], b[0], (v - a[1]) / (b[1] - a[1] || 1));
  }
  return v < line[0][1] ? line[0][0] : line[line.length - 1][0];
}

function seaRegion(u, v) {
  const dn = v, dw = u, ds = 1 - v, de = 1 - u;
  const m = Math.min(dn * 0.9, dw, ds, de);
  if (m === dn * 0.9) return 0;
  if (m === dw) return 1;
  if (m === ds) return 2;
  return 3;
}

function inEllipse(e, u, v) {
  const ca = Math.cos(e.axis * Math.PI / 180), sa = Math.sin(e.axis * Math.PI / 180);
  const du = u - e.u, dv = v - e.v;
  const x = (du * ca + dv * sa) / e.ru, y = (-du * sa + dv * ca) / e.rv;
  return x * x + y * y < 1;
}

// borderLine: [[u, v], ...] north to south. mountainAt(c): 0..1 belt-mountain share (or null).
function classify(L, n, C, borderLine, beltMtn) {
  const reg = new Uint8Array(n * n);
  const { S, du, dv } = frameOf(L);
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, c = j * n + i;
      if (C[c] <= 0) { reg[c] = seaRegion(u, v); continue; }
      if (L.isles && Math.hypot(u - L.isles[0], v - L.isles[1]) < L.isles[2]) { reg[c] = 13; continue; }
      if (G.pointInPolygon(L.battlefield.poly, u, v)) { reg[c] = 12; continue; }
      if (inEllipse(L.swamp, u, v)) { reg[c] = 9; continue; }
      if (G.pointInPolygon(L.wheat.poly, u, v)) { reg[c] = 7; continue; }
      if (G.pointInPolygon(L.massif.poly, u, v)) { reg[c] = 8; continue; }
      const vb = lineAtU(L.beltAxis, u);
      if (beltMtn && beltMtn[c] > 0.5 && v > vb - 0.07 * S && v < vb + 0.10 * S) { reg[c] = 5; continue; }
      if (v < vb) { reg[c] = 4; continue; }
      if (u < lineAtV(borderLine, v)) { reg[c] = 6; continue; }
      reg[c] = v > lineAtU(L.southLine, u) ? 11 : 10;
    }
  }
  return reg;
}

// ---------------------------------------------------------------------------------------------
// DESIGNED HEIGHT at resolution n. C: coast field at n.
function designHeight(L, REGIONS, n, C, cliff, nz) {
  const N = n * n, SEA = L.sea;
  const { S, du, dv } = frameOf(L);
  const borderGuide = L.rivers.find((r) => r.key === 'border_river').pts;
  const reg0 = classify(L, n, C, borderGuide, null);
  // regional ground parameters, blurred so regions blend
  const inland = new Float32Array(N), hills = new Float32Array(N), Kr = new Float32Array(N), kdr = new Float32Array(N);
  for (let c = 0; c < N; c++) {
    const key = REGIONS[reg0[c]].key;
    const g = L.regionGround[key] || L.regionGround.reach_interior;
    const sea = reg0[c] <= 3;
    inland[c] = sea ? 0.02 : g.inland; hills[c] = sea ? 0 : g.hills; Kr[c] = sea ? 0.5 : g.K; kdr[c] = sea ? 1 : g.kd;
  }
  const rb = Math.round(0.022 * S * n);
  const inlandB = G.blur(inland, n, rb, 2), hillsB = G.blur(hills, n, rb, 2);
  const KrB = G.blur(Kr, n, Math.round(0.012 * S * n), 2), kdB = G.blur(kdr, n, rb, 2);

  // 1. lowland ground
  const ground = new Float32Array(N);
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, c = j * n + i;
      const cc = C[c];
      const ramp = smoothstep(-0.004 * S, 0.11 * S, cc);
      const roll = 0.55 * (0.5 + 0.5 * nz.fbm(u * 8, v * 8, 5, 2, 0.5)) + 0.45 * (0.5 + 0.5 * nz.fbm(u * 21 + 3, v * 21, 4, 2, 0.5));
      const upland = 0.022 * nz.fbm(u * 3 + 11, v * 3, 3, 2, 0.5);
      ground[c] = SEA + 0.002 + (inlandB[c] + upland) * ramp + cliff[c] * 0.035 * smoothstep(0, 0.007 * S, cc)
        + hillsB[c] * roll * smoothstep(0, 0.03 * S, cc) + 0.004 * nz.fbm(u * 45, v * 45, 3, 2, 0.5) * smoothstep(0, 0.01 * S, cc)
        + hillsB[c] * 0.22 * nz.fbm(u * 30 + 17, v * 30, 4, 2, 0.55) * smoothstep(0, 0.02 * S, cc);
    }
  }
  // low hill lines (rounded, part of the ground)
  for (const hl of L.hills || []) {
    const pl = G.preparePolyline(G.chaikin(hl.pts, 2, false));
    forPolyline(n, pl, hl.w * 2.5, (c, u, v, d, t) => {
      const x = d / hl.w;
      const along = 0.75 + 0.25 * nz.line(t * 5 + hl.h * 40, 3);
      const a = (hl.h - ground[c]) * Math.exp(-1.4 * x * x) * (1 - smoothstep(1.8, 2.5, x)) * smoothstep(0, 0.2, Math.min(t, 1 - t) * 2 + 0.1) * along;
      if (a > 0) ground[c] += a;
    });
  }
  // massif lift
  const massif = maskFromPolygon(n, L.massif.poly, 0.06 * S);
  for (let c = 0; c < N; c++) ground[c] += L.massif.lift * massif[c];

  // 2. mountains: crest lines with summits and saddles, a pedestal of foothills, ridged detail
  const above = new Float32Array(N);    // mountain height above the ground (ranges)
  const aboveCone = new Float32Array(N); // lone cones
  const pedestal = new Float32Array(N);
  const beltMtn = new Float32Array(N);
  L.ranges.forEach((rg, ri) => {
    const wig = rg.kind === 'belt' || rg.kind === 'alpine' ? L.crestWiggle : { amp: 0, wave: 1 };
    const pl = G.preparePolyline(meanderLine(G.chaikin(rg.pts, 2, false), wig.amp, wig.wave, 40 + ri, nz));
    const wmax = rg.w * 1.3;
    forPolyline(n, pl, wmax * 2.6, (c, u, v, d, t) => {
      // which side of the crest are we on? (sample the crest point by marching back along the gradient)
      const out = [0, 0, 0];
      G.polyQuery(pl, u + 0.0005, v, out); const dEast = out[0] - d;
      G.polyQuery(pl, u, v + 0.0005, out); const dSouth = out[0] - d;
      let steep = false;
      if (rg.steep === 'N') steep = dSouth < 0; else if (rg.steep === 'S') steep = dSouth > 0;
      else if (rg.steep === 'E') steep = dEast > 0; else if (rg.steep === 'W') steep = dEast < 0;
      const w = rg.w * (steep ? 0.72 : 1.28);
      const x = d / w;
      const f0 = rg.taper[0] > 0 ? smoothstep(0, rg.taper[0], t) : 1;
      const f1 = rg.taper[1] > 0 ? smoothstep(1, 1 - rg.taper[1], t) : 1;
      const s = smoothstep(0.2, 0.75, 0.5 + 0.5 * nz.line(t * rg.peaks * 1.25 + ri * 7.3, ri));
      const g = ground[c];
      let crest = g + (rg.h - g) * (1 - rg.sag * (1 - s)) * (0.25 + 0.75 * f0 * f1);
      if (rg.col > 0) crest = Math.max(crest, lerp(g, rg.col, f0 * f1));
      const prof = Math.exp(-1.7 * x * x) * (1 - smoothstep(1.5, 2.1, x));
      const sp = nz.ridged(t * pl.length * 26 + ri * 5.3, d * 6 + ri * 2.1, 3, 2, 0.5);
      const a = (crest - g) * prof * (0.88 + 0.16 * sp);
      above[c] = smax(above[c], a, 0.03);
      pedestal[c] = Math.max(pedestal[c], (crest - g) * 0.22 * Math.exp(-((x / 2.3) ** 2)) * (1 - smoothstep(wmax * 1.6, wmax * 2.6, d)));
      if (rg.kind === 'belt') beltMtn[c] = Math.max(beltMtn[c], prof);
    });
  });
  // the belt watershed: a continuous barrier so the passes stay the only low ways through
  {
    const pl = G.preparePolyline(G.chaikin(L.beltAxis, 2, false));
    forPolyline(n, pl, 0.06 * S, (c, u, v, d) => {
      const col = du(u) > 0.86 ? 0.55 : 0.60;
      const a = (col - ground[c]) * Math.exp(-((d / (0.024 * S)) ** 2));
      if (a > above[c]) above[c] = smax(above[c], a, 0.02);
    });
  }
  // cones
  for (const cn of L.cones) {
    const [cu, cv] = cn.at;
    const R = cn.r * 1.6;
    for (let j = Math.max(0, Math.floor((cv - R) * n)); j <= Math.min(n - 1, Math.ceil((cv + R) * n)); j++) {
      for (let i = Math.max(0, Math.floor((cu - R) * n)); i <= Math.min(n - 1, Math.ceil((cu + R) * n)); i++) {
        const u = (i + 0.5) / n, v = (j + 0.5) / n, c = j * n + i;
        const d = Math.hypot(u - cu, v - cv) * (1 + 0.12 * nz.fbm(u * 60, v * 60, 3, 2, 0.5));
        const x = d / cn.r;
        if (x >= 1.6) continue;
        const g = ground[c];
        let a = x < 1 ? (cn.h - g) * Math.pow(1 - x, 1.7) : 0;
        a += (cn.h - g) * 0.08 * Math.exp(-((x / 1.2) ** 2));
        if (cn.crater > 0 && d < cn.crater * 1.2) {
          const rim = (cn.h - g) * Math.pow(1 - cn.crater / cn.r, 1.7);
          a = Math.min(a, rim - 0.035 * (1 - (d / (cn.crater * 1.2)) ** 2));
        }
        aboveCone[c] = smax(aboveCone[c], a, 0.02);
      }
    }
  }
  // islands: each rises to its own top (layout islands[5]) in a rounded crown, so it takes the light
  for (const [iu, iv, r, st, ax, top] of L.islands) {
    if (!top) continue;
    const ca = Math.cos(ax * Math.PI / 180), sa = Math.sin(ax * Math.PI / 180);
    const R = r * Math.max(1, st) * 1.3;
    for (let j = Math.max(0, Math.floor((iv - R) * n)); j <= Math.min(n - 1, Math.ceil((iv + R) * n)); j++) {
      for (let i = Math.max(0, Math.floor((iu - R) * n)); i <= Math.min(n - 1, Math.ceil((iu + R) * n)); i++) {
        const u = (i + 0.5) / n, v = (j + 0.5) / n, c = j * n + i;
        const du0 = u - iu, dv0 = v - iv;
        const x = (du0 * ca + dv0 * sa) / (r * st), y = (-du0 * sa + dv0 * ca) / r;
        const e = Math.sqrt(x * x + y * y) * (1 + 0.15 * nz.fbm(u * 90, v * 90, 3, 2, 0.5));
        if (e >= 1.1) continue;
        const a = Math.max(0, top - ground[c]) * Math.pow(Math.max(0, 1 - e * e / 1.21), 1.4);
        aboveCone[c] = smax(aboveCone[c], a, 0.01);
      }
    }
  }
  // ridged detail, strongest on the high ground
  const D = new Float32Array(N);
  const mtn = new Float32Array(N);
  const fine = new Float32Array(N);
  const aboveFinal = new Float32Array(N);
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, c = j * n + i;
      const m = clamp(Math.max(above[c], aboveCone[c]) / 0.30, 0, 1);
      mtn[c] = m;
      const wx = 0.012 * S * nz.fbm(u * 9 + 40, v * 9, 3, 2, 0.5), wy = 0.012 * S * nz.fbm(u * 9, v * 9 + 40, 3, 2, 0.5);
      const rBig = nz.ridged((u + wx) * 9, (v + wy) * 9, 4, 2.0, 0.5);
      const rFine = nz.ridged((u + wx) * 26, (v + wy) * 26, 4, 2.0, 0.5);
      const a = smax(above[c] * (0.82 + 0.26 * rBig), aboveCone[c], 0.02);
      D[c] = ground[c] + pedestal[c] + a;
      aboveFinal[c] = pedestal[c] + a;
      fine[c] = m * 0.07 * (rFine - 0.45) + m * 0.025 * nz.fbm(u * 34 + 3, v * 34, 3, 2, 0.5);
    }
  }
  // 3. flat country
  const wheat = maskFromPolygon(n, L.wheat.floor || L.wheat.poly, L.wheat.feather);
  const field = maskFromPolygon(n, L.battlefield.poly, L.battlefield.feather);
  const swamp = ellipseMask(n, L.swamp, 0.016 * S);
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, c = j * n + i;
      if (C[c] <= 0) continue;
      const ud = du(u), vd = dv(v);
      const edgeN = 0.35 * nz.fbm(u * 24 + 70, v * 24, 3, 2, 0.5);
      const wq = clamp(wheat[c] * 1.4 - 0.2 + edgeN * wheat[c] * (1 - wheat[c]) * 4, 0, 1);
      if (wq > 0) {
        // the floor falls toward the border river's line from both sides (a shallow V), so the river is its low axis
        const dRiv = Math.abs(u - lineAtV(borderGuide, v)) / S;
        const lvl = lerp(L.wheat.top, L.wheat.bottom, clamp((vd - 0.455) / 0.335, 0, 1)) - 0.030 * (1 - clamp(dRiv / 0.16, 0, 1))
          + 0.0020 * nz.fbm(u * 14, v * 14, 3, 2, 0.5);
        D[c] = lerp(D[c], lvl, wq);
      }
      const fq = clamp(field[c] * 1.4 - 0.2 + edgeN * field[c] * (1 - field[c]) * 4, 0, 1);
      if (fq > 0) D[c] = lerp(D[c], L.battlefield.level - 0.010 * clamp((ud - 0.84) / 0.10, 0, 1) + 0.0015 * nz.fbm(u * 12, v * 12, 3, 2, 0.5), 0.62 * fq * smoothstep(0.002 * S, 0.006 * S, C[c]));
      if (swamp[c] > 0) D[c] = lerp(D[c], L.swamp.level + 0.006 * clamp((0.50 - ud) / 0.10, 0, 1) + 0.0015 * nz.fbm(u * 25, v * 25, 3, 2, 0.5), swamp[c]);
    }
  }
  // 4. castle hills and small rises at places
  const bumps = L.castles.map((k) => [k.u, k.v, k.hill, k.r]).concat(L.places.filter((p) => p.bump).map((p) => [p.u, p.v, p.bump, p.r]));
  for (const [bu, bv, bh, br] of bumps) {
    for (let j = Math.floor((bv - 2 * br) * n); j <= Math.ceil((bv + 2 * br) * n); j++) {
      for (let i = Math.floor((bu - 2 * br) * n); i <= Math.ceil((bu + 2 * br) * n); i++) {
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const d = Math.hypot((i + 0.5) / n - bu, (j + 0.5) / n - bv) / br;
        D[j * n + i] += bh * Math.exp(-2.2 * d * d);
      }
    }
  }
  // 5. passes: winding corridors carved through the belt
  for (const ps of L.passes) carvePass(ps, n, D);
  // 6. river valleys with beds that fall all the way
  const guides = L.rivers.map((rv, k) => carveRiver(rv, n, D, C, SEA, nz, k));
  // 7. fine relief texture on the high ground (after the carving, so valley sides keep it)
  for (let c = 0; c < N; c++) D[c] += fine[c] * smoothstep(0.0, 0.04, D[c] - SEA);
  // 8. lake basins
  const lakeInfo = L.lakes.map((lk) => carveLake(lk, n, D, null, false, nz));
  // 9. sea floor and the shore
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, c = j * n + i;
      if (C[c] <= 0) {
        const s = smoothstep(0, L.shelf.width, -C[c]);
        D[c] = SEA - 0.004 - L.shelf.depth * Math.pow(s, 0.8) + 0.01 * nz.fbm(u * 12, v * 12, 4, 2, 0.5) * s;
      } else if (D[c] < SEA + 0.0015) D[c] = SEA + 0.0015;
    }
  }
  // uplift map for the steady-state erosion: the designed mountain mass, gentle uplift for hill country,
  // none on the plains; the pass corridors get little, so they stay the low ways through.
  const upl = new Float32Array(N);
  for (let c = 0; c < N; c++) {
    if (C[c] <= 0) continue;
    const key = REGIONS[reg0[c]].key;
    const g = L.regionGround[key] || L.regionGround.reach_interior;
    upl[c] = ((g.uplift !== undefined ? g.uplift : 0.05) + Math.max(0, aboveFinal[c]) / 0.5) * smoothstep(0.03, 0.5, mtn[c]);
  }
  for (const ps of L.passes) {
    const pl = G.preparePolyline(G.chaikin(ps.pts, 2, false));
    forPolyline(n, pl, ps.w * 4, (c, u, v, d) => { upl[c] *= 1 - 0.85 * Math.exp(-((d / (ps.w * 1.6)) ** 2)); });
  }
  const U = G.blur(upl, n, 5, 2);
  const Kmap = new Float32Array(N), kdMap = new Float32Array(N), rain = new Float32Array(N), Rmap = new Float32Array(N);
  const mw = new Float32Array(N);
  for (let c = 0; c < N; c++) {
    Kmap[c] = lerp(KrB[c], 1.0, mtn[c]) * (1 - 0.9 * smoothstep(0.5, 0.9, cliff[c]) * (1 - smoothstep(0.004 * S, 0.03 * S, C[c])));
    kdMap[c] = lerp(kdB[c], 0.8, mtn[c]);
    rain[c] = 1 + 1.0 * mtn[c];
    Rmap[c] = 1 - smoothstep(0.03, 0.5, mtn[c]);
    mw[c] = 1 - Rmap[c];
  }
  return { D, U, mw, mtn, beltMtn, Kmap, kdMap, rain, Rmap, reg0, wheat, field, swamp, massif, guides, lakeInfo };
}

function carvePass(ps, n, D) {
  const raw = G.preparePolyline(ps.pts);
  const colS = raw.s0[Math.min(ps.colAt, raw.s0.length - 1)] / raw.length;
  const pl = G.preparePolyline(G.chaikin(ps.pts, 2, false));
  forPolyline(n, pl, ps.w * 5, (c, u, v, d, t) => {
    const floor = t < colS
      ? lerp(ps.ends[0], ps.col, Math.pow(t / colS, 0.8))
      : lerp(ps.col, ps.ends[1], Math.pow((t - colS) / (1 - colS), 0.8));
    const surf = floor + 0.06 * Math.pow(d / ps.w, 1.3);
    D[c] = smin(D[c], surf, 0.015);
  });
}

// Carve a river valley; returns the smoothed guide with its bed profile.
function meanderLine(pts0, amp, wave, seedK, nz, grow) {
  if (!amp) return pts0;
  const pl = G.preparePolyline(pts0);
  const step = 0.0015, m = Math.max(2, Math.ceil(pl.length / step));
  const out = [];
  for (let k = 0; k <= m; k++) {
    const sArc = (k / m) * pl.length;
    let seg = 0;
    while (seg < pl.s0.length - 1 && pl.s0[seg + 1] <= sArc) seg++;
    const len = Math.sqrt(pl.l2[seg]);
    const f = clamp((sArc - pl.s0[seg]) / len, 0, 1);
    const x = pl.ax[seg] + f * pl.dx[seg], y = pl.ay[seg] + f * pl.dy[seg];
    const nx = -pl.dy[seg] / len, ny = pl.dx[seg] / len;
    const t = k / m;
    const env = smoothstep(0, 0.12, t) * smoothstep(1, 0.88, t);
    const g = grow ? lerp(grow[0], grow[1], t) : 1;
    const o = amp * env * g * nz.fbm(sArc / (wave * (grow ? 0.7 + 0.5 * t : 1)) + seedK * 13.7, seedK * 3.1, 3, 2.1, 0.45) * 1.6;
    out.push([x + nx * o, y + ny * o]);
  }
  return G.chaikin(out, 1, false);
}

function carveRiver(rv, n, D, C, SEA, nz, k) {
  const pts = meanderLine(G.chaikin(rv.pts, 2, false), rv.meander || 0, rv.wave || 0.06, k + 1, nz, rv.meanderGrow);
  const pl = G.preparePolyline(pts);
  const K = 400;
  const bed = new Float64Array(K + 1);
  let prev = rv.src;
  for (let k = 0; k <= K; k++) {
    const t = k / K;
    const s = t * pl.length;
    let seg = 0;
    while (seg < pl.s0.length - 1 && pl.s0[seg + 1] <= s) seg++;
    const f = clamp((s - pl.s0[seg]) / Math.sqrt(pl.l2[seg]), 0, 1);
    const u = pl.ax[seg] + f * pl.dx[seg], v = pl.ay[seg] + f * pl.dy[seg];
    const coast = G.sample(C, n, u, v);
    let b = coast <= 0 ? SEA - 0.006 : Math.min(rv.src, G.sample(D, n, u, v) - rv.depth);
    b = Math.max(b, coast <= 0 ? SEA - 0.006 : SEA + 0.0008);
    if (k > 0) b = Math.min(b, prev - 0.00002);
    bed[k] = b; prev = b;
  }
  const fEnd = rv.floorEnd || rv.floor;
  const margin = Math.min(0.12, Math.max(rv.floor, fEnd) + 0.4 / rv.wall);
  const r0 = rv.floorEnd ? 0.007 : 0;     // U profile: the walls curve up out of the floor (map u)
  forPolyline(n, pl, margin, (c, u, v, d, t) => {
    const b = bed[Math.round(t * K)];
    const fl = lerp(rv.floor, fEnd, Math.pow(t, 1.3));
    const x = Math.max(0, d - fl);
    const rise = r0 > 0 ? (x < r0 ? x * x / (2 * r0) : x - r0 / 2) : x;
    const surf = b + rv.wall * rise * (1 + 0.25 * smoothstep(0, margin, d));
    D[c] = smin(D[c], surf, 0.006);
  });
  return { key: rv.key, pts, bed };
}

// Carve a lake basin. level: forced level (or lk.level, or the ground at the lake's outlet end).
function carveLake(lk, n, H, level, insideOnly, nz) {
  const pts = G.chaikin(lk.pts, 2, false);
  const pl = G.preparePolyline(pts);
  const hwAt = (t) => {
    const x = t * (lk.hw.length - 1); const k = Math.min(lk.hw.length - 2, Math.floor(x));
    return lerp(lk.hw[k], lk.hw[k + 1], x - k);
  };
  const end = lk.pts[lk.pts.length - 1];
  const lvl = level != null ? level : lk.level != null ? lk.level : G.sample(H, n, end[0], end[1]);
  const maxW = Math.max(...lk.hw);
  const shore = nz && lk.shore ? lk.shore : 0;
  forPolyline(n, pl, maxW * (1.7 + shore), (c, u, v, d, t) => {
    const w = hwAt(t);
    // an irregular shore: bays and points at two scales, scaled to the lake's width
    const x = shore ? (d + w * shore * (nz.fbm(u * 90 + 3, v * 90, 3, 2, 0.5) + 0.45 * nz.fbm(u * 220, v * 220 + 7, 2, 2, 0.5))) / w : d / w;
    let surf;
    if (x < 1) surf = lvl - lk.depth * (1 - x * x);
    else if (insideOnly) return;
    else surf = lerp(lvl, H[c], smoothstep(1, 1.5, x));
    if (surf < H[c]) H[c] = surf;
  });
  return { key: lk.key, level: lvl };
}

module.exports = { buildCoast, designHeight, classify, carveLake, lineAtU, lineAtV, smax, smin, forPolyline, frameOf };
