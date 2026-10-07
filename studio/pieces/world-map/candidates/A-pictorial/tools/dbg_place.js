const M = require('../render.js');
M.init(); M.setH(568);
const out = new Uint32Array(M.W * M.H); M.setOut(out); M.update(2); M.render(2);
const key = process.argv[2] || 'castle_order', p = M.PLACE[key];
console.log(key, p);
const pal = {};
let n = 0;
for (let y = p.top - 2; y <= p.y + 2; y++) {
  let row = '';
  for (let x = p.x - 12; x <= p.x + 12; x++) { const c = out[y * M.W + x]; if (!(c in pal)) pal[c] = String.fromCharCode(97 + n++); row += pal[c]; }
  console.log(row);
}
console.log(Object.entries(pal).map(([c, k]) => k + '=#' + ((c & 0xff) << 16 | (c >> 8 & 0xff) << 8 | (c >> 16 & 0xff)).toString(16).padStart(6, '0')).join(' '));
console.log(Object.keys(M.PLACE).map(k => k + ':' + M.PLACE[k].x + ',' + M.PLACE[k].y).join('  '));
