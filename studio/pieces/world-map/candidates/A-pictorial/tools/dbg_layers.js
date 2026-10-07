// top-down grey dumps of the world grids, to see what the data holds
const path = require('path'), fs = require('fs');
const { encode } = require('C:/Users/farha/Verdant Reach/studio/.claude/skills/pixel-scenes/scripts/png.js');
const W = require('../../../src/world.js');
const N = W.N;
function dump(name, fn) {
  const out = new Uint32Array(N * N);
  for (let i = 0; i < N * N; i++) { const c = fn(i); out[i] = (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; }
  fs.writeFileSync(path.join(__dirname, '..', 'shots', 'dbg_' + name + '.png'), encode(out, N, N, 1));
}
const g = v => { const k = Math.max(0, Math.min(255, v * 255 | 0)); return [k, k, k]; };
dump('forest', i => W.waterDepth[i] > 0 ? [0, 0, 80] : (() => { const t = W.forestType[i], f = W.forest[i]; const k = f * 255 | 0; return t === 1 ? [0, k, 0] : t === 2 ? [k, 0, k] : t === 3 ? [0, k, k] : t === 4 ? [k, k, 255] : t === 5 ? [k, k, 0] : [40, 40, 40]; })());
dump('snow_mtn', i => W.waterDepth[i] > 0 ? [0, 0, 80] : [W.mountain[i] * 255 | 0, W.snow[i] * 255 | 0, 0]);
dump('wheat', i => W.waterDepth[i] > 0 ? [0, 0, 80] : (() => { const k = W.wheat[i] * 255 | 0, id = W.wheatField[i]; return id ? [k, (id * 37) % 200 + 40, (id * 91) % 200] : [30, 30, 30]; })());
dump('river', i => W.waterDepth[i] > 0 ? [0, 0, 80] : g(Math.sqrt(W.river[i])));
console.log('rivers', W.RIVERS.map(r => r.key + ':' + r.pts.length + (r.named ? '*' : '')).join(' '));
console.log('roads', W.ROADS.map(r => r.key + ':' + r.pts.length).join(' '));
console.log('labels', W.LABELS.map(l => l.key + '@' + l.u.toFixed(3) + ',' + l.v.toFixed(3)).join(' '));
console.log('peaks', W.PEAKS.map(p => p.key + '@' + p.u.toFixed(3) + ',' + p.v.toFixed(3) + ' h' + p.h).join(' '));
