
// ---------------------------------------------------------------- state
const G = {
  phase: 'title', t: 0, pt: 0, dim: 0, flour: FLOUR_MAX, hits: 0, thrown: 0, lastThrow: 0, hold: 0,
  stoneTalk: 0, pebTalk: 0, stoneLine: 0, pebLine: 0, capUntil: 0, cawT: 6,
};
const B = { s: 0, x: 0, z: 0, hx: 1, hz: 0, R: R0, grow: 0, M: new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), path: null, speed: 8.5, target: 8.5, frames: 0, jump: true };
// all 3x3 matrices are Float64Array(9): one stable shape keeps the renderer optimised
const ROT = new Float64Array(9);
function rotAxis(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a), C = 1 - c, o = ROT;
  o[0] = c + x * x * C; o[1] = x * y * C - z * s; o[2] = x * z * C + y * s;
  o[3] = y * x * C + z * s; o[4] = c + y * y * C; o[5] = y * z * C - x * s;
  o[6] = z * x * C - y * s; o[7] = z * y * C + x * s; o[8] = c + z * z * C;
  return o;
}
function mul3(a, b, o) {
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}
function ortho(M) {
  let ax = M[0], ay = M[3], az = M[6];
  let l = Math.hypot(ax, ay, az); ax /= l; ay /= l; az /= l;
  let bx = M[1], by = M[4], bz = M[7];
  const d = ax * bx + ay * by + az * bz;
  bx -= d * ax; by -= d * ay; bz -= d * az;
  l = Math.hypot(bx, by, bz); bx /= l; by /= l; bz /= l;
  M[0] = ax; M[3] = ay; M[6] = az; M[1] = bx; M[4] = by; M[7] = bz;
  M[2] = ay * bz - az * by; M[5] = az * bx - ax * bz; M[8] = ax * by - ay * bx;
}
let SCRATCH = new Float64Array(9);
function updateBall(dt) {
  B.speed += (B.target - B.speed) * Math.min(1, dt * 0.5);
  B.s += B.speed * (1 + 0.12 * Math.sin(G.t * 0.21)) * dt;
  const p = pathAt(B.path, B.s);
  const vx = p[0] - B.x, vz = p[1] - B.z, dist = Math.hypot(vx, vz);
  if (!B.jump && dist > 1e-6 && dist < 20) {
    const M2 = mul3(rotAxis(vz / dist, 0, -vx / dist, dist / B.R), B.M, SCRATCH);   // rolls without slipping
    SCRATCH = B.M; B.M = M2;
    if (++B.frames % 90 === 0) ortho(B.M);
  }
  B.jump = false;
  B.x = p[0]; B.z = p[1];
  const tl = Math.hypot(p[2], p[3]) || 1;
  B.hx = p[2] / tl; B.hz = p[3] / tl;
  if (B.grow > 0) { const g = Math.min(B.grow, dt * 0.16); B.R += g; B.grow -= g; }
  stampTrail(B.x, B.z, B.hx, B.R);
}
function stampTrail(x, z, hx, R) {
  const rc = Math.sqrt(2 * R * 1.25);               // where the loaf presses into waist-high wheat
  const hl = Math.hypot(hx, B.hz) || 1, hca = hx / hl, hsa = B.hz / hl;
  const i0 = Math.max(0, Math.floor((x - rc - XG0) / CELL)), i1 = Math.min(NXG - 1, Math.ceil((x + rc - XG0) / CELL));
  const j0 = Math.max(0, Math.floor((z - rc - ZG0) / CELL)), j1 = Math.min(NZG - 1, Math.ceil((z + rc - ZG0) / CELL));
  for (let j = j0; j <= j1; j++) {
    const cz = ZG0 + (j + 0.5) * CELL;
    for (let i = i0; i <= i1; i++) {
      const cx = XG0 + (i + 0.5) * CELL;
      const d = Math.hypot(cx - x, cz - z);
      if (d >= rc + 1) continue;
      const val = smooth(rc, rc * 0.62, d + (hash2(i, j, 71) - 0.5) * 1.2);
      const k = j * NXG + i;
      if (val > TRAIL[k]) { TRAIL[k] = val; TCA[k] = hca; TSA[k] = hsa; }
    }
  }
}
// heavy loops live in small leaf functions that only take numbers and typed arrays,
// so the optimiser always has warm feedback for them
function fadeArray(A, by) {
  for (let k = 0, n = A.length; k < n; k++) { const v = A[k]; if (v > 0) A[k] = v > by ? v - by : 0; }
}
function decayMaps(dt) {
  FX[2] += dt;
  if (FX[2] < 0.15) return;
  const a = FX[2];
  FX[2] = 0;
  fadeArray(TRAIL, a / 120);
  if (FX[0] > 0) { fadeArray(DUST, a / 26); FX[0] = Math.max(0, FX[0] - a / 26); }
}
function dustSplat(x, z, rad, amt) {
  const i0 = Math.max(0, Math.floor((x - rad - XG0) / CELL)), i1 = Math.min(NXG - 1, Math.ceil((x + rad - XG0) / CELL));
  const j0 = Math.max(0, Math.floor((z - rad - ZG0) / CELL)), j1 = Math.min(NZG - 1, Math.ceil((z + rad - ZG0) / CELL));
  let any = false;
  for (let j = j0; j <= j1; j++) {
    const cz = ZG0 + (j + 0.5) * CELL;
    for (let i = i0; i <= i1; i++) {
      const cx = XG0 + (i + 0.5) * CELL;
      const d = Math.hypot(cx - x, cz - z) + (vnoise(i * 0.35, j * 0.35, 29) - 0.5) * rad * 0.8;
      if (d >= rad) continue;
      const val = amt * smooth(rad, rad * 0.35, d);
      const k = j * NXG + i;
      if (val > DUST[k]) { DUST[k] = val; any = true; }
    }
  }
  if (any) FX[0] = Math.max(FX[0], amt);
}
// flour lands on the loaf: every texel of its skin within reach of the burst takes a coat
function deposit(px, py, pz, rs, amt) {
  const R = B.R, cx = B.x, cy = R, cz = B.z;
  if (Math.hypot(px - cx, py - cy, pz - cz) > R + rs) return false;
  const any = coatLoop(B.M, R, cx, cy, cz, px, py, pz, rs, amt);
  if (any) FX[1] = Math.max(FX[1], amt);
  return any;
}
function coatLoop(M, R, cx, cy, cz, px, py, pz, rs, amt) {
  let any = false;
  for (let k = 0; k < TW * TH; k++) {
    const bx = TBX[k], by = TBY[k], bz = TBZ[k];
    const sx = cx + R * (M[0] * bx + M[1] * by + M[2] * bz) - px;
    const sy = cy + R * (M[3] * bx + M[4] * by + M[5] * bz) - py;
    const sz = cz + R * (M[6] * bx + M[7] * by + M[8] * bz) - pz;
    const d = Math.sqrt(sx * sx + sy * sy + sz * sz) + (NTEX[k] - 0.5) * rs * 0.7;
    if (d >= rs) continue;
    const val = amt * smooth(rs, rs * 0.5, d);
    if (val > COV[k]) { COV[k] = val; any = true; }
  }
  return any;
}
// and the dough drinks it
function decayCov(dt) {
  if (FX[1] <= 0) return;
  if (G.hold > 0) { G.hold -= dt; return; }
  const r = dt * 0.085;
  fadeArray(COV, r);
  FX[1] = Math.max(0, FX[1] - r);
}
function ballDist() { return Math.hypot(B.x, CAMH - B.R, B.z); }
function ballScreen() {
  const z = Math.max(1, B.z);
  return [CX + (B.x * FOC) / z - 0.5, HY + ((CAMH - B.R) * FOC) / z - 0.5, (B.R * FOC) / z];
}

// ---------------------------------------------------------------- crows ride it
const CROWS = [];
function initCrows() {
  CROWS.length = 0;
  const rng = mulberry32(5);
  const TH_ = [0.1, 0.34, 0.46, 0.24, 0.4], PH_ = [0.4, 3.0, 0.15, 3.5, 2.5];
  for (let k = 0; k < 5; k++) CROWS.push({ th: TH_[k], ph: PH_[k], st: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, away: 3, fr: rng() * 3, peck: rng() * 4 });
  updateCrows(0);
}
function crowPerch(c) {
  const R = B.R;
  return [B.x + R * Math.sin(c.th) * Math.cos(c.ph), R + R * Math.cos(c.th), B.z + R * Math.sin(c.th) * Math.sin(c.ph)];
}
function updateCrows(dt) {
  for (const c of CROWS) {
    c.fr += dt;
    if (c.st === 0) { const p = crowPerch(c); c.x = p[0]; c.y = p[1]; c.z = p[2]; }
    else if (c.st === 1) {
      c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.vy -= 1.2 * dt;
      if (c.t > c.away) c.st = 2;
    } else {
      const p = crowPerch(c), k = 1 - Math.exp(-dt * 1.5);
      c.x += (p[0] - c.x) * k; c.y += (p[1] - c.y) * k; c.z += (p[2] - c.z) * k;
      if (Math.hypot(p[0] - c.x, p[1] - c.y, p[2] - c.z) < 0.6) c.st = 0;
    }
  }
}
function scatterCrows() {
  let n = 0;
  for (const c of CROWS) {
    if (c.st !== 0) continue;
    const a = Math.random() * 6.283;
    c.st = 1; c.t = 0; c.away = 3 + Math.random() * 2.5; n++;
    c.vx = Math.cos(a) * 7; c.vz = Math.sin(a) * 5; c.vy = 7 + Math.random() * 4;
  }
  if (n) SFX.caw(0.05);
}

// ---------------------------------------------------------------- flour: sacks, bursts, powder
const BURSTS = [], PARTS = [];
let SACK = null;
function makeBurst(P, o) {
  const big = !!o.big, n = big ? 13 : 10, size = big ? 8 : 5.5;
  const puffs = [];
  for (let k = 0; k < n; k++) {
    const dx = Math.random() * 2 - 1, dy = Math.random() * 1.1 - 0.2, dz = Math.random() * 2 - 1.4;
    const l = Math.hypot(dx, dy, dz) || 1, reach = size * (0.25 + 0.75 * Math.random());
    puffs.push({ ox: (dx / l) * reach, oy: (dy / l) * reach * 0.75, oz: (dz / l) * reach, r: size * (0.32 + 0.3 * Math.random()) });
  }
  const b = { P: P.slice(), cur: P.slice(), attach: o.attach || null, t: 0, life: big ? 3.2 : 2.6, puffs, rs: o.rs || 0, amt: o.amt || 0, hit: false };
  BURSTS.push(b);
  for (let k = 0; k < (big ? 110 : 70); k++) {
    const a = Math.random() * Math.PI * 2, u = Math.random() * 1.6 - 0.5, sp = 3 + Math.random() * (big ? 12 : 9);
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    PARTS.push({ fx: P[0], fy: P[1], fz: P[2], fvx: Math.cos(a) * s * sp, fvy: u * sp + 2, fvz: Math.sin(a) * s * sp - 1.5, fage: 0.01, fmax: 1.2 + Math.random() * 1.8, fc: Math.random() < 0.5 ? 15 : 14 });
  }
  if (P[1] < 7) dustSplat(P[0], P[2], big ? 6 : 5, 0.9);
  return b;
}
function updateBursts(dt) {
  for (let k = BURSTS.length - 1; k >= 0; k--) {
    const b = BURSTS[k];
    b.t += dt;
    if (b.attach) { b.cur[0] = B.x + b.attach[0]; b.cur[1] = B.R + b.attach[1]; b.cur[2] = B.z + b.attach[2]; }
    if (b.amt > 0 && b.t < 0.6) {
      const g = easeOut(Math.min(1, b.t / 0.5));
      if (deposit(b.cur[0], b.cur[1], b.cur[2], b.rs * (0.3 + 0.7 * g), b.amt)) b.hit = true;
    }
    if (b.t > b.life) BURSTS.splice(k, 1);
  }
  const R2 = B.R * B.R;
  for (let k = PARTS.length - 1; k >= 0; k--) {
    const p = PARTS[k];
    p.fage += dt;
    const drag = Math.exp(-dt * 2.2);
    p.fvx *= drag; p.fvz *= drag; p.fvy = p.fvy * drag - 3.2 * dt;
    p.fx += (p.fvx + 1.2) * dt; p.fy += p.fvy * dt; p.fz += p.fvz * dt;
    const dx = p.fx - B.x, dy = p.fy - B.R, dz = p.fz - B.z;
    if (dx * dx + dy * dy + dz * dz < R2) { PARTS.splice(k, 1); continue; }   // stuck to the crust
    if (p.fy <= 0.3) { dustSplat(p.fx, p.fz, 1.6, 0.8); PARTS.splice(k, 1); continue; }
    if (p.fage > p.fmax) PARTS.splice(k, 1);
  }
}
const HAND = [0.35, CAMH - 1.0, 1.0];
function throwAt(px, py) {
  if (G.flour <= 0 || SACK) return false;
  const dx = (px + 0.5 - CX) / FOC, dy = (HY - (py + 0.5)) / FOC;
  let kind, T, off = null;
  const Rt = B.R * 1.12, ocx = -B.x, ocy = CAMH - B.R, ocz = -B.z;
  const a = dx * dx + dy * dy + 1, b = ocx * dx + ocy * dy + ocz, c = ocx * ocx + ocy * ocy + ocz * ocz - Rt * Rt;
  const disc = b * b - a * c;
  if (disc >= 0 && B.z > 12) {
    const tt = (-b - Math.sqrt(disc)) / a;
    const ox = dx * tt - B.x, oy = CAMH + dy * tt - B.R, oz = tt - B.z, ol = Math.hypot(ox, oy, oz) || 1;
    off = [(ox / ol) * B.R, (oy / ol) * B.R, (oz / ol) * B.R];
    kind = 'loaf';
    T = [B.x + off[0], B.R + off[1], B.z + off[2]];
  } else if (dy < -0.002 && CAMH / -dy < 450) {
    const tt = CAMH / -dy;
    kind = 'ground'; T = [dx * tt, 0.8, tt];
  } else {
    const tt = dy < -0.002 ? Math.min(450, CAMH / -dy) : 160;
    kind = 'air'; T = [dx * tt, Math.max(1, CAMH + dy * tt), tt];
  }
  const dist = Math.hypot(T[0] - HAND[0], T[1] - HAND[1], T[2] - HAND[2]);
  SACK = { kind, off, T, t: 0, dur: 0.45 + dist / 300, lift: 4 + dist * 0.06, pos: HAND.slice(), spin: 0 };
  G.flour--; G.thrown++; G.lastThrow = G.pt;
  UI.count(G.flour);
  UI.prompt('');
  SFX.sling();
  return true;
}
function sackTarget() {
  if (SACK.kind === 'loaf') return [B.x + SACK.off[0], B.R + SACK.off[1], B.z + SACK.off[2]];
  return SACK.T;
}
function updateSack(dt) {
  if (!SACK) return;
  SACK.t += dt; SACK.spin += dt;
  const T = sackTarget(), u = Math.min(1, SACK.t / SACK.dur);
  const mx = (HAND[0] + T[0]) / 2, my = (HAND[1] + T[1]) / 2 + SACK.lift, mz = (HAND[2] + T[2]) / 2;
  const q = 1 - u;
  SACK.pos = [q * q * HAND[0] + 2 * q * u * mx + u * u * T[0], q * q * HAND[1] + 2 * q * u * my + u * u * T[1], q * q * HAND[2] + 2 * q * u * mz + u * u * T[2]];
  if (u >= 1) { const s = SACK; SACK = null; landSack(s, T); }
}
function landSack(s, T) {
  SFX.burst();
  const top = [B.x, 2 * B.R, B.z];
  if (s.kind === 'loaf') {
    makeBurst(T, { attach: s.off.slice(), rs: B.R * 1.35, amt: 1 });
    scatterCrows();
    registerHit();
    return;
  }
  const dc = Math.hypot(T[0] - B.x, T[1] - B.R, T[2] - B.z) - B.R;
  if (dc < 7) { makeBurst(T, { rs: 8.5, amt: 0.95 }); scatterCrows(); registerHit(); return; }
  makeBurst(T, {});
  if (Math.hypot(T[0] - top[0], T[1] - top[1], T[2] - top[2]) < 30) scatterCrows();
  missNote();
}
function checkPole() {
  const d = Math.hypot(B.x - POLE.x, B.z - POLE.z);
  const reach = Math.sqrt(Math.max(0, B.R * B.R - (B.R - POLE.h) * (B.R - POLE.h)));
  if (d < reach + 0.5) {
    POLE.intact = false;
    makeBurst([POLE.x - 1.2, POLE.h, POLE.z], { big: true, rs: B.R * 2.4, amt: 1 });
    G.hold = 1.6;
    scatterCrows();
    SFX.poleBurst();
    storyPole();
  }
}

// ---------------------------------------------------------------- rendering
// shadow parameters: [0] on, [1..3] loaf centre, [4] radius, [5..6] ellipse centre, [7..8] sun heading, [9..10] ellipse scales
const SHA = new Float64Array(11);
let BM = null;
function shadowAt(X, Z) {
  // ray from the ground toward the sun: does it pass through a floured part of the loaf?
  const ex = X - SHA[5], ez = Z - SHA[6], ea = (ex * SHA[7] + ez * SHA[8]) * SHA[9], eb = (ex * SHA[8] - ez * SHA[7]) * SHA[10];
  if (ea * ea + eb * eb > 1.05) return false;             // outside the shadow's ground ellipse
  const cx = SHA[1], cy = SHA[2], cz = SHA[3], R = SHA[4];
  const dx = cx - X, dy = cy, dz = cz - Z;
  const tca = dx * SUNDIR[0] + dy * SUNDIR[1] + dz * SUNDIR[2];
  if (tca <= 0) return false;
  const d2 = dx * dx + dy * dy + dz * dz - tca * tca, R2 = R * R;
  if (d2 >= R2) return false;
  const th = tca - Math.sqrt(R2 - d2);
  const nx = (X + SUNDIR[0] * th - cx) / R, ny = (SUNDIR[1] * th - cy) / R, nz = (Z + SUNDIR[2] * th - cz) / R;
  const M = BM;
  const bx = M[0] * nx + M[3] * ny + M[6] * nz, by = M[1] * nx + M[4] * ny + M[7] * nz, bz = M[2] * nx + M[5] * ny + M[8] * nz;
  const lon = Math.atan2(bz, bx), lat = Math.asin(by < -1 ? -1 : by > 1 ? 1 : by);
  const i = ((Math.floor(((lon + Math.PI) / (Math.PI * 2)) * TW) % TW) + TW) % TW;
  const j = clamp(Math.floor(((lat + Math.PI / 2) / Math.PI) * TH), 0, TH - 1);
  const k = j * TW + i;
  return COV[k] + (NTEX[k] - 0.5) * 0.55 > 0.45;
}
function renderGround(t) {
  const dustOn = FX[0] > 0.01, wphase = t * 1.25;
  const shOn = FX[1] > 0.3 && B.z > 8, shNear = B.z + B.R;
  BM = B.M;
  SHA[0] = shOn ? 1 : 0; SHA[1] = B.x; SHA[2] = B.R; SHA[3] = B.z; SHA[4] = B.R;
  if (shOn) {
    // the loaf's shadow on the ground is an ellipse around where its axis toward the sun meets the ground
    const s = SHA[2] / SUNDIR[1], lh = Math.hypot(SUNDIR[0], SUNDIR[2]);
    SHA[5] = SHA[1] - SUNDIR[0] * s; SHA[6] = SHA[3] - SUNDIR[2] * s;
    SHA[7] = SUNDIR[0] / lh; SHA[8] = SUNDIR[2] / lh;
    SHA[9] = SUNDIR[1] / SHA[4]; SHA[10] = 1 / SHA[4];
  }
  for (let y = HY; y < H; y++) {
    const rowk = (y - HY) * W, row = y * W;
    for (let x = 0; x < W; x++) {
      const k = rowk + x, i = row + x, ty = GT[k];
      if (ty === 3) { IDX[i] = lakePix(x, y, t); continue; }
      let v = GB[k];
      const X = GX[k], Z = GZ[k];
      if (ty === 1) {
        const w = fsin(GPH[k] - wphase);                        // wind walking over the wheat
        if (w > 0.45) v += (w - 0.45) * 2.3;
      }
      const c = GC[k];
      if (c >= 0) {
        const fx = GFX[k], fz = GFZ[k];
        const a = TRAIL[c], b = TRAIL[c + 1], cc = TRAIL[c + NXG], d = TRAIL[c + NXG + 1];
        if (a + b + cc + d > 0.05) {
          const tr = a + (b - a) * fx + (cc - a) * fz + (a - b - cc + d) * fx * fz;
          if (ty === 1) {
            if (tr > 0.5) {
              let st = 0;
              const nf = GNEAR[k];
              if (nf > 0) {
                const ca = TCA[c], sa = TSA[c];
                st = fsin((Z * ca - X * sa) * 3.3 + (X * ca + Z * sa) * 0.09 + 500) * 0.5 * nf;   // stalks laid along the roll
              }
              v -= 1.55 - st;                         // flattened wheat, laid down along the roll
            } else if (tr > 0.3) v += 1.25;          // the standing edge catches the light
          } else if (ty === 2 && tr > 0.5) v -= 0.3;
        }
        if (dustOn) {
          const da = DUST[c], db = DUST[c + 1], dc = DUST[c + NXG], dd = DUST[c + NXG + 1];
          if (da + db + dc + dd > 0.02) {
            const du = da + (db - da) * fx + (dc - da) * fz + (da - db - dc + dd) * fx * fz;
            if (du + (GN2[k] - 0.5) * 0.7 > 0.42) { IDX[i] = fr(0.3 + du * 1.3, x, y); continue; }
          }
        }
      }
      if (shOn && Z < shNear && shadowAt(X, Z)) v = Math.min(v, GB[k]) - 1.1;
      IDX[i] = ci(dith(v, x, y));
    }
  }
}
function lakePix(x, y, t) {
  const rip = Math.round(Math.sin(y * 1.7 + t * 1.3) * 0.8);
  const sy = 2 * HY - 1 - y, sx = clamp(x + rip, 0, W - 1);
  let v = SKY[sy * W + sx];
  if (v < 12) v = Math.max(0, v - 1);
  if (Math.abs(x - SUNX) <= 2 + (y - HY) * 1.5 && hash2(x, y, (t * 6) | 0) > 0.5) v = 11;
  return v;
}
function drawMill(t) {
  const a0 = t * 0.35;
  for (let k = 0; k < 4; k++) {
    const a = a0 + (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let r = 1; r <= 8; r++) {
      const x = Math.round(HUBX + ca * r), y = Math.round(HUBY + sa * r);
      if (x >= 0 && x < W && y >= 0 && y < HY) IDX[y * W + x] = 3;
      if (r >= 3) {
        const x2 = Math.round(HUBX + ca * r - sa * 1.2), y2 = Math.round(HUBY + sa * r + ca * 1.2);
        if (x2 >= 0 && x2 < W && y2 >= 0 && y2 < HY) IDX[y2 * W + x2] = 3;
      }
    }
  }
}
function drawBall(t) {
  if (FX[1] < 0.2) return;
  const R = B.R, cx = B.x, cy = R, cz = B.z, M = B.M;
  if (cz < 8) return;
  const scx = CX + (cx * FOC) / cz, scy = HY + ((CAMH - cy) * FOC) / cz, sr = (R * FOC) / cz;
  const x0 = Math.max(0, Math.floor(scx - sr * 1.15 - 2)), x1 = Math.min(W - 1, Math.ceil(scx + sr * 1.15 + 2));
  const y0 = Math.max(0, Math.floor(scy - sr * 1.15 - 2)), y1 = Math.min(H - 1, Math.ceil(scy + sr * 1.15 + 2));
  let ux = SUNX - scx, uy = SUNY - scy;
  const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  const ocx = -cx, ocy = CAMH - cy, ocz = -cz;
  const cc = ocx * ocx + ocy * ocy + ocz * ocz - R * R;
  const TWO_PI = Math.PI * 2, HALF_PI = Math.PI / 2;
  for (let y = y0; y <= y1; y++) {
    const dy = (HY - (y + 0.5)) / FOC;
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - CX) / FOC;
      const a = dx * dx + dy * dy + 1, b = ocx * dx + ocy * dy + ocz;
      const disc = b * b - a * cc;
      if (disc < 0) continue;
      const tt = (-b - Math.sqrt(disc)) / a;                  // equals depth: the ray steps 1 in z
      const nx = (dx * tt - cx) / R, ny = (CAMH + dy * tt - cy) / R, nz = (tt - cz) / R;
      const bx = M[0] * nx + M[3] * ny + M[6] * nz;
      const by = M[1] * nx + M[4] * ny + M[7] * nz;
      const bz = M[2] * nx + M[5] * ny + M[8] * nz;
      const lon = Math.atan2(bz, bx), lat = Math.asin(by < -1 ? -1 : by > 1 ? 1 : by);
      const u = ((lon + Math.PI) / TWO_PI) * TW - 0.5;
      let v = ((lat + HALF_PI) / Math.PI) * TH - 0.5;
      if (v < 0) v = 0; else if (v > TH - 1.001) v = TH - 1.001;
      let i0 = Math.floor(u);
      const fu = u - i0;
      i0 = (i0 + TW) % TW;
      const i1 = (i0 + 1) % TW, j0 = Math.floor(v), fv = v - j0;
      const r0 = j0 * TW, r1 = r0 + TW;
      const c00 = COV[r0 + i0], c10 = COV[r0 + i1], c01 = COV[r1 + i0], c11 = COV[r1 + i1];
      const cov0 = c00 + (c10 - c00) * fu + (c01 - c00) * fv + (c00 - c10 - c01 + c11) * fu * fv;
      if (cov0 < 0.1) continue;
      const n00 = NTEX[r0 + i0], n10 = NTEX[r0 + i1], n01 = NTEX[r1 + i0], n11 = NTEX[r1 + i1];
      const nz0 = n00 + (n10 - n00) * fu + (n01 - n00) * fv + (n00 - n10 - n01 + n11) * fu * fv - 0.5;
      const cov = cov0 + nz0 * 0.55;
      if (cov < 0.42) continue;
      if (cov < 0.54 && (cov - 0.42) / 0.12 < BAYER[((y & 3) << 2) | (x & 3)]) continue;   // powdery edge
      const nv = -(nx * dx + ny * dy + nz) / Math.sqrt(a);
      const ndl = nx * SUNDIR[0] + ny * SUNDIR[1] + nz * SUNDIR[2];
      let f = 0.75 + 1.35 * ny + nz0 * 0.9;                      // skylight from behind us; powder lies unevenly
      const rim = Math.pow(1 - clamp(nv, 0, 1), 1.6);
      f += rim * (0.3 + 3.8 * Math.max(0, nx * ux - ny * uy));  // backlit powder glows on the sun side
      if (ndl > 0) f += ndl * 4.0;
      if (cov < 0.6) f -= 0.8;                                   // thin, damp, being drunk
      if (bx * SCORE.c[0] + by * SCORE.c[1] + bz * SCORE.c[2] > SCORE.cap) {
        const o = bx * SCORE.n[0] + by * SCORE.n[1] + bz * SCORE.n[2];
        for (let q = 0; q < 3; q++) if (Math.abs(o - SCORE.offs[q]) < SCORE.w) { f -= 1.3; break; }
      }
      let idx = fr(f, x, y);
      for (let q = 0; q < LUMPS.length; q++) {
        const L = LUMPS[q], dd = bx * L[0] + by * L[1] + bz * L[2];
        if (dd > L[3]) { idx = dd > L[4] && ((t * 0.31 + L[5]) % 1) > 0.05 ? 16 : 1; break; }
      }
      const i = y * W + x;
      IDX[i] = idx; ZB[i] = tt;
    }
  }
}
function stampZ(s, x0, y0, z) {
  for (let j = 0; j < s.h; j++) {
    const y = y0 + j;
    if (y < 0 || y >= H) continue;
    for (let i = 0; i < s.w; i++) {
      const v = s.data[j * s.w + i];
      if (v === 255) continue;
      const x = x0 + i;
      if (x < 0 || x >= W) continue;
      const k = y * W + x;
      if (ZB[k] <= z) continue;
      IDX[k] = v;
    }
  }
}
function stampAt(s, x0, y0) {
  for (let j = 0; j < s.h; j++) {
    const y = y0 + j;
    if (y < 0 || y >= H) continue;
    for (let i = 0; i < s.w; i++) {
      const v = s.data[j * s.w + i];
      if (v === 255) continue;
      const x = x0 + i;
      if (x >= 0 && x < W) IDX[y * W + x] = v;
    }
  }
}
function setPix(x, y, v) { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) IDX[y * W + x] = v; }
function plotZ(x, y, v, z) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const k = y * W + x;
  if (ZB[k] > z) IDX[k] = v;
}
function drawPole() {
  const z = POLE.z, sx = Math.round(CX + (POLE.x * FOC) / z - 0.5), sy = Math.round(HY + (CAMH * FOC) / z - 0.5);
  const s = POLE.intact ? POLE_A : POLE_B;
  stampZ(s, sx - (s.w - 1), sy - s.h + 1, z);
}
function drawBursts() {
  for (const b of BURSTS) {
    const t = b.t;
    const alpha = t < 0.08 ? t / 0.08 : 1 - smooth(b.life * 0.2, b.life, t);
    if (alpha <= 0.02) continue;
    const g = easeOut(Math.min(1, t / 0.45));
    const P = b.cur, pp = [];
    let bx0 = W, bx1 = -1, by0 = H, by1 = -1, zn = 1e9;
    for (const p of b.puffs) {
      const wx = P[0] + p.ox * g * (1 + 0.25 * t) + 0.9 * t, wy = P[1] + p.oy * g - 0.3 * t * t, wz = P[2] + p.oz * g;
      if (wz < 3) continue;
      const r = p.r * (0.45 + 0.55 * g) * (1 + 0.18 * t);
      const sx = CX + (wx * FOC) / wz - 0.5, sy = HY + ((CAMH - wy) * FOC) / wz - 0.5, sr = (r * FOC) / wz;
      pp.push(sx, sy, sr);
      bx0 = Math.min(bx0, sx - sr); bx1 = Math.max(bx1, sx + sr); by0 = Math.min(by0, sy - sr); by1 = Math.max(by1, sy + sr);
      zn = Math.min(zn, wz - r);
    }
    if (!pp.length) continue;
    const X0 = Math.max(0, Math.floor(bx0) - 1), X1 = Math.min(W - 1, Math.ceil(bx1) + 1);
    const Y0 = Math.max(0, Math.floor(by0) - 1), Y1 = Math.min(H - 1, Math.ceil(by1) + 1);
    const dens = (x, y) => {
      let d = 0;
      for (let q = 0; q < pp.length; q += 3) {
        const ddx = x - pp[q], ddy = (y - pp[q + 1]) * 1.1, rr = pp[q + 2] * pp[q + 2];
        const qq = (ddx * ddx + ddy * ddy) / rr;
        if (qq < 1) { const kk = 1 - qq; d += kk * kk; }
      }
      return d * alpha;
    };
    const seed = (b.P[0] * 7 + b.P[2] * 13) | 0;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      let d = dens(x, y);
      if (d <= 0.12) continue;
      d += (vnoise(x * 0.32 - t * 3, y * 0.32 + t * 1.5, seed) - 0.5) * 0.5 * alpha;
      if (d <= 0.32) continue;
      if (d < 0.52 && (d - 0.32) / 0.2 < BAYER[((y & 3) << 2) | (x & 3)]) continue;   // powder thins out in a dither
      const i = y * W + x;
      if (ZB[i] < zn) continue;
      let lx = SUNX - x, ly = SUNY - y;
      const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
      const shade = d - dens(x + lx * 2.5, y + ly * 2.5);
      let f = 1.0 + 0.8 * Math.exp(-(ll * ll) / 5000);
      if (shade > 0.02) f += 1.2; else if (shade < -0.03) f -= 0.6;
      if (d > 1.0) f += 0.4; else if (d < 0.5) f -= 0.8;
      IDX[i] = fr(f, x, y);
    }
  }
}
function drawParts() {
  for (const p of PARTS) {
    if (p.fz < 4) continue;
    plotZ(CX + (p.fx * FOC) / p.fz - 0.5, HY + ((CAMH - p.fy) * FOC) / p.fz - 0.5, p.fc, p.fz);
  }
}
function drawCrows() {
  const faceR = B.hx < 0;
  for (const c of CROWS) {
    if (c.z < 6) continue;
    const sx = CX + (c.x * FOC) / c.z - 0.5, sy = HY + ((CAMH - c.y) * FOC) / c.z - 0.5;
    if (c.st === 0) {
      const pk = Math.sin(c.fr * 1.3 + c.peck) > 0.85;
      let s;
      if (c.z < 125) s = faceR ? (pk ? CROW_BR : CROW_AR) : (pk ? CROW_B : CROW_A);
      else if (c.z < 240) s = faceR ? CROW_SR : CROW_S;
      else s = faceR ? CROW_TR : CROW_T;
      stampAt(s, Math.round(sx - s.w / 2), Math.round(sy - s.h + 1));
    } else if (c.z < 160) {
      stampZ(CROW_F[((c.fr * 7) | 0) & 1], Math.round(sx - 2), Math.round(sy - 1), c.z);
    } else plotZ(sx, sy, 0, c.z);
  }
}
function drawSack(nearPass) {
  if (!SACK) return;
  const p = SACK.pos;
  if (!p || p[2] < 0.8) return;
  if ((p[2] < 14) !== nearPass) return;
  const sx = CX + (p[0] * FOC) / p[2] - 0.5, sy = HY + ((CAMH - p[1]) * FOC) / p[2] - 0.5;
  if (p[2] < 12) stampAt(SACK_B[((SACK.spin * 9) | 0) & 1], Math.round(sx - 3), Math.round(sy - 3));
  else if (p[2] < 45) stampZ(SACK_N, Math.round(sx - 1), Math.round(sy - 2), p[2]);
  else if (p[2] < 120) stampZ(SACK_S, Math.round(sx), Math.round(sy), p[2]);
  else plotZ(sx, sy, 15, p[2]);
}
function eyeOpen(t, ph) { return (t * 0.23 + ph) % 1 > 0.035; }
function drawForeground(t, stoneTalk, pebTalk) {
  for (let i = FG_Y0 * W, n = W * H; i < n; i++) { const v = FG[i]; if (v !== 255) IDX[i] = v; }
  const shake = stoneTalk > 0 && ((t * 22) | 0) & 1 ? 1 : 0;
  stampAt(STONE, STONEX + shake, STONEY);
  const open = stoneTalk > 0 || eyeOpen(t, 0.3);
  for (const e of STONE.eyes) setPix(STONEX + shake + e[0], STONEY + e[1], open ? 16 : 0);
  for (let k = 0; k < PEBS.length; k++) {
    const p = PEBS[k];
    const hop = pebTalk > 0 && ((t * 9 + k * 1.7) | 0) & 1 ? -1 : 0;
    stampAt(p.spr, p.pbx, p.pby + hop);
    const op = eyeOpen(t, p.phase);
    for (const e of p.spr.eyes) setPix(p.pbx + e[0], p.pby + hop + e[1], op ? 16 : 1);
  }
}
function render(t) {
  const dim = G.dim, stoneTalk = G.stoneTalk, pebTalk = G.pebTalk;
  buildPalette(dim);
  IDX.set(SKY, 0);
  drawMill(t);
  renderGround(t);
  ZB.fill(1e9);
  drawBall(t);
  drawPole();
  drawBursts();
  drawParts();
  drawCrows();
  drawSack(false);
  drawForeground(t, stoneTalk, pebTalk);
  drawSack(true);
  for (let i = 0, n = W * H; i < n; i++) OUT32[i] = PAL[IDX[i]];
}
