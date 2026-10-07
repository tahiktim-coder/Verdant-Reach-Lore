// prints LABEL_AT rows: canvas px at H 568 (from labwant.json) -> world (u, v) at sea level, via the render module's own projection
const fs = require('fs'), path = require('path');
const want = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const M = require('./render.js'); M.init(); M.setH(568);
const P = M.debug;
const out = [];
for (const k in want) { const [x, y, lines] = want[k]; const u = P.uAtX(x), v = P.vAtRow(y); out.push(`  ${k}: [${u.toFixed(4)}, ${v.toFixed(4)}${lines ? ', ' + JSON.stringify(lines) : ''}],`); }
console.log(out.join('\n'));
