// Headless renderer for pixel scenes. Lets you LOOK at frames without a browser.
// Usage: node scripts/shoot.js <game.js> [--h 384] [--at 0,2,5.5] [--scale 3] [--out shots] [--fps-test]
// The game script must export (when not in a browser): init(), setH(h), setOut(uint32Buffer), update(dt), render(t),
// plus W, H (getter) and G (state with .t). Optional: any functions you want to call between shots (see --call).
const fs = require('fs');
const path = require('path');
const { encode } = require('./png.js');
const args = process.argv.slice(2);
const file = args[0];
if (!file) { console.error('usage: node shoot.js <game.js> [--h 384] [--at 0,2,5] [--scale 3] [--out shots] [--call name@time,...] [--fps-test]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const H = +opt('h', 384), scale = +opt('scale', 3), outDir = opt('out', 'shots');
const times = opt('at', '0,2,5').split(',').map(Number).sort((a, b) => a - b);
const calls = (opt('call', '') || '').split(',').filter(Boolean).map(s => { const [n, t] = s.split('@'); return { n, t: +t, done: false }; });
const M = require(path.resolve(file));
fs.mkdirSync(outDir, { recursive: true });
M.init(); M.setH(H);
const out = new Uint32Array(M.W * M.H); M.setOut(out);
const dt = 1 / 30;
let t = 0;
for (const at of times) {
  while (t < at - 1e-6) {
    for (const c of calls) if (!c.done && t >= c.t) { c.done = true; M[c.n](); }
    M.update(dt); t += dt;
  }
  M.render(M.G ? M.G.t : t);
  const name = path.join(outDir, `frame_${at.toFixed(2)}s.png`);
  fs.writeFileSync(name, encode(out, M.W, M.H, scale));
  console.log('wrote', name);
}
if (args.includes('--fps-test')) {
  const n = 300, ms = [];
  for (let i = 0; i < n; i++) { const a = performance.now(); M.update(1 / 60); M.render(M.G ? M.G.t : 0); ms.push(performance.now() - a); }
  ms.sort((a, b) => a - b);
  console.log(`frame ms: median ${ms[n >> 1].toFixed(2)}  p95 ${ms[Math.floor(n * 0.95)].toFixed(2)}  max ${ms[n - 1].toFixed(2)}  (budget 16.7 at 60 fps; phones run 3-5x slower)`);
}
