// node scripts/shoot.js 12   -> renders card 12 (1-based) to card12.png at 3x (960x1200)
const fs = require('fs'), M = require('../tips.js'), { encode } = require('./png.js');
const n = +(process.argv[2] || 1) - 1;
M.init(); const out = new Uint32Array(M.W * M.H); M.setOut(out);
M.useCard(n); for (let k = 0; k < 75; k++) M.update(1 / 30); M.render(M.G.t);
fs.writeFileSync('card' + (n + 1) + '.png', encode(out, M.W, M.H, 3)); console.log('wrote card' + (n + 1) + '.png');
