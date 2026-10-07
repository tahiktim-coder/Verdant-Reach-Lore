'use strict';
// Seeded 2D gradient noise (Perlin style, quintic fade), fbm and ridged multifractal.
// Deterministic: no Math.random, every generator is built from an integer seed.

function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint16Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint16Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float64Array(256);
  const gy = new Float64Array(256);
  for (let i = 0; i < 256; i++) {
    const a = rnd() * Math.PI * 2;
    gx[i] = Math.cos(a); gy[i] = Math.sin(a);
  }
  // per-octave offsets and rotations so octaves do not line up on the lattice
  const OCT = 12;
  const ox = new Float64Array(OCT), oy = new Float64Array(OCT);
  const rc = new Float64Array(OCT), rs = new Float64Array(OCT);
  for (let o = 0; o < OCT; o++) {
    ox[o] = rnd() * 256; oy[o] = rnd() * 256;
    const a = rnd() * Math.PI * 2;
    rc[o] = Math.cos(a); rs[o] = Math.sin(a);
  }

  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    const g00 = perm[a], g01 = perm[a + 1], g10 = perm[b], g11 = perm[b + 1];
    const n00 = gx[g00] * xf + gy[g00] * yf;
    const n10 = gx[g10] * (xf - 1) + gy[g10] * yf;
    const n01 = gx[g01] * xf + gy[g01] * (yf - 1);
    const n11 = gx[g11] * (xf - 1) + gy[g11] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    return (nx0 + v * (nx1 - nx0)) * 1.42;
  }

  // fractal sum, roughly -1..1
  function fbm(x, y, oct, lac, gain) {
    let f = 1, amp = 1, sum = 0, norm = 0;
    for (let o = 0; o < oct; o++) {
      const X = x * f, Y = y * f;
      sum += amp * noise(X * rc[o] - Y * rs[o] + ox[o], X * rs[o] + Y * rc[o] + oy[o]);
      norm += amp; f *= lac; amp *= gain;
    }
    return sum / norm;
  }

  // ridged multifractal, 0..1 (1 on sharp ridges)
  function ridged(x, y, oct, lac, gain) {
    let f = 1, amp = 1, sum = 0, norm = 0, w = 1;
    for (let o = 0; o < oct; o++) {
      const X = x * f, Y = y * f;
      let n = 1 - Math.abs(noise(X * rc[o] - Y * rs[o] + ox[o], X * rs[o] + Y * rc[o] + oy[o]));
      n *= n;
      n *= w;
      w = Math.min(1, Math.max(0, n * 1.6));
      sum += n * amp; norm += amp; f *= lac; amp *= gain;
    }
    return sum / norm;
  }

  // smooth 1D noise along a line (for summits and saddles along a crest)
  function line(t, k) { return noise(t, 17.31 + k * 3.7); }

  return { noise, fbm, ridged, line };
}

module.exports = { makeNoise, mulberry32 };
