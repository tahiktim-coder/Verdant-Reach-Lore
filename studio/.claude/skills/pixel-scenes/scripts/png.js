const zlib = require('zlib');
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
// out32: Uint32Array ABGR (little-endian RGBA bytes); scale: integer upscale
function encode(out32, w, h, scale) {
  scale = scale || 1;
  const W2 = w * scale, H2 = h * scale;
  const raw = Buffer.alloc((W2 * 3 + 1) * H2);
  for (let y = 0; y < H2; y++) {
    raw[y * (W2 * 3 + 1)] = 0;
    const sy = (y / scale) | 0;
    for (let x = 0; x < W2; x++) {
      const p = out32[sy * w + ((x / scale) | 0)];
      const o = y * (W2 * 3 + 1) + 1 + x * 3;
      raw[o] = p & 255; raw[o + 1] = (p >>> 8) & 255; raw[o + 2] = (p >>> 16) & 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W2, 0); ihdr.writeUInt32BE(H2, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
module.exports = { encode };
