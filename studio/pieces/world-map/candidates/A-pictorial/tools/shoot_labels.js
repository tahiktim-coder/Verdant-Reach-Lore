// render one frame with labels at a level:  node tools/shoot_labels.js <level> <out.png> [t]
// also prints overlaps between label boxes, and between label boxes and the place sprites they must not hide
const fs = require('fs'), path = require('path');
const { encode } = require('C:/Users/farha/Verdant Reach/studio/.claude/skills/pixel-scenes/scripts/png.js');
const M = require('../render.js');
const level = +process.argv[2], outFile = process.argv[3], t = +(process.argv[4] || 2);
M.init(); M.setH(568); M.setLabels(level);
const out = new Uint32Array(M.W * M.H); M.setOut(out);
for (let k = 0; k < t * 30; k++) M.update(1 / 30);
M.render(M.G.t);
fs.writeFileSync(outFile, encode(out, M.W, M.H, 3));
const B = M.LBOX, hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
let bad = 0;
for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) if (hit(B[i], B[j])) { console.log('LABEL OVERLAP:', B[i][4], '|', B[j][4]); bad++; }
const SKIP = /^(crystal|starbloom_fields\d|wheat_country|green_valleys|toad_swamp|forest_of_eyes|silent_battlefield|mountain_path|east_gap|still_water|alpine|fire_dragon|buried|artifact_isles$|storm)/;
for (const k in M.PLACE) { if (SKIP.test(k)) continue; const p = M.PLACE[k], s = [p.x - (p.w >> 1), p.top, p.x + (p.w >> 1) + 1, p.y + 1]; for (const b of B) if (hit(b, s)) { console.log('LABEL OVER PLACE:', b[4], '|', k, s.join(',')); bad++; } }
for (const b of B) if (b[0] < 1 || b[2] > M.W - 1) { console.log('LABEL AT EDGE:', b[4]); bad++; }
console.log('wrote', outFile, 'labels', B.length, 'problems', bad);
console.log(B.map(b => b[4] + ' [' + b.slice(0, 4).join(',') + ']').join('\n'));
