// prints place boxes and label boxes (native px) and any label that overlaps a place sprite or another label
const M = require('./render.js'); M.init(); M.setH(+(process.argv[2] || 568));
const { LBL, PLACES, HY, YM } = M.debug;
console.log('HY', HY, 'YM', YM);
for (const k in PLACES) { const r = PLACES[k]; console.log('place', k.padEnd(20), r.x0, r.y0, r.x1, r.y1); }
const hit = (a, b) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
for (const p of LBL.placed) {
  const b = p.box, clash = [];
  for (const k in PLACES) if (hit(b, PLACES[k])) clash.push(k);
  for (const q of LBL.placed) if (q !== p && hit(b, q.box)) clash.push('LABEL:' + q.key);
  console.log('label', p.key.padEnd(20), b.x0, b.y0, b.x1, b.y1, clash.length ? 'CLASH ' + clash.join(',') : '');
}
