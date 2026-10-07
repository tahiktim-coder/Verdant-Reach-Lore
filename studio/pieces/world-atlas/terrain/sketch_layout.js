'use strict';
/* Quick layout sketch (seconds, no erosion):   node sketch_layout.js [out.png] [size]
   Draws the warped coast, regions (flat tints), crest lines, hills, cones, passes, river guides, lakes,
   plains and every place, in MAP coordinates, with a 0.1 grid. For iterating layout.js before a build. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { LAYOUT: L, frameFns } = require('./layout');
const { makeNoise } = require('./lib/noise');
const G = require('./lib/geom');
const { buildCoast, classify } = require('./lib/design');

const OUT = process.argv[2] || path.join(__dirname, 'debug', 'sketch.png');
const n = +(process.argv[3] || 768);
const S = frameFns(L).S;
const nz0 = makeNoise(L.seed);
const nz = { fbm: (x, y, o, l, g) => nz0.fbm(x / S, y / S, o, l, g), ridged: (x, y, o, l, g) => nz0.ridged(x / S, y / S, o, l, g), line: nz0.line };

const { C } = buildCoast(L, n, nz);
const border = L.rivers.find((r) => r.key === 'border_river').pts;
const reg = classify(L, n, C, border, null);
const TINT = { 0: [70, 100, 125], 1: [70, 100, 125], 2: [70, 100, 125], 3: [70, 100, 125], 4: [170, 180, 170], 5: [150, 140, 130],
  6: [160, 185, 130], 7: [215, 200, 130], 8: [140, 170, 120], 9: [130, 140, 100], 10: [175, 195, 140], 11: [200, 190, 150],
  12: [165, 160, 150], 13: [180, 170, 140] };
const img = new Uint8Array(n * n * 3);
for (let c = 0; c < n * n; c++) {
  const t = TINT[reg[c]] || [255, 0, 255];
  const shore = C[c] > 0 && C[c] < 1.5 / n;
  img.set(shore ? [40, 50, 50] : t, c * 3);
}
const put = (x, y, col) => { const i = Math.round(x), j = Math.round(y); if (i >= 0 && j >= 0 && i < n && j < n) img.set(col, (j * n + i) * 3); };
const dot = (u, v, r, col) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) put(u * n + dx, v * n + dy, col); };
const line = (pts, col, r) => {
  for (let k = 0; k < pts.length - 1; k++) {
    const [a, b] = [pts[k], pts[k + 1]];
    const m = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * n * 2) + 1;
    for (let q = 0; q <= m; q++) { const t = q / m; dot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, col); }
  }
};
for (let g = 1; g < 10; g++) for (let k = 0; k < n; k += 3) { put(g / 10 * n, k, [255, 255, 255]); put(k, g / 10 * n, [255, 255, 255]); }
line(L.wheat.poly.concat([L.wheat.poly[0]]), [150, 120, 40], 0);
line(L.battlefield.poly.concat([L.battlefield.poly[0]]), [90, 90, 90], 0);
line(L.massif.poly.concat([L.massif.poly[0]]), [60, 110, 60], 0);
line(L.beltAxis, [120, 100, 90], 0);
for (const h of L.hills) line(G.chaikin(h.pts, 2, false), [150, 130, 90], 1);
for (const r of L.ranges) line(G.chaikin(r.pts, 2, false), r.kind === 'alpine' ? [90, 60, 120] : [100, 60, 40], 2);
for (const c of L.cones) dot(c.at[0], c.at[1], Math.max(2, Math.round(c.r * n * 0.5)), [110, 50, 40]);
for (const p of L.passes) line(p.pts, [220, 40, 40], 1);
for (const r of L.rivers) line(G.chaikin(r.pts, 2, false), [40, 90, 200], r.named ? 1 : 0);
for (const k of L.lakes) line(G.chaikin(k.pts, 2, false), [30, 60, 160], Math.max(1, Math.round(Math.max(...k.hw) * n)));
for (const k of L.castles) dot(k.u, k.v, 2, [0, 0, 0]);
for (const p of L.places) dot(p.u, p.v, 1, [255, 255, 255]);
// land extent
let u0 = 1, u1 = 0, v0 = 1, v1 = 0, land = 0;
for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (C[j * n + i] > 0) { land++; u0 = Math.min(u0, i / n); u1 = Math.max(u1, i / n); v0 = Math.min(v0, j / n); v1 = Math.max(v1, j / n); }
console.log(`land bbox u ${u0.toFixed(3)}..${u1.toFixed(3)} (${((u1 - u0) * 100).toFixed(0)}%), v ${v0.toFixed(3)}..${v1.toFixed(3)} (${((v1 - v0) * 100).toFixed(0)}%), land ${(100 * land / n / n).toFixed(1)}% of the map`);

// minimal PNG writer
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
fs.writeFileSync(OUT, png(n, n, img));
console.log('wrote', OUT);
