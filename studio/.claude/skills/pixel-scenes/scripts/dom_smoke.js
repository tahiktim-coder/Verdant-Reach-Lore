// Boots the finished single-file page in jsdom with a stub canvas, runs frames, reports JS errors.
// Usage: npm i jsdom && node scripts/dom_smoke.js page.html [seconds]
// Extend the bottom block to click your buttons and check the DOM text you expect.
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(process.argv[2], 'utf8').replace(/<link[^>]+fonts[^>]+>/g, '');
const secs = +(process.argv[3] || 5), errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(win) {
  win.HTMLCanvasElement.prototype.getContext = function () { return { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }; };
  Object.defineProperty(win.HTMLElement.prototype, 'clientWidth', { get() { return 432; } });
  Object.defineProperty(win.HTMLElement.prototype, 'clientHeight', { get() { return 820; } });
  win.addEventListener('error', e => errors.push(e.message));
  const q = []; win.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  win.__frames = n => { let t = win.__t || 16; for (let i = 0; i < n; i++) { const cbs = q.splice(0); t += 1000 / 60; cbs.forEach(cb => cb(t)); } win.__t = t; };
} });
const win = dom.window, doc = win.document;
(async () => {
  await new Promise(r => (doc.readyState === 'loading' ? doc.addEventListener('DOMContentLoaded', r) : r()));
  await new Promise(r => setTimeout(r, 30));
  win.__frames(60 * secs);
  // e.g. doc.getElementById('next').click(); win.__frames(30); console.log(doc.getElementById('name').textContent);
  console.log('ran', secs, 's of frames | errors:', errors.length ? errors : 'none');
})();
