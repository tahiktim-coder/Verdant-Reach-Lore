/* Label layout for the tilted relief atlas: a separate overlay pass, off by default.
   layout(items, obstacles, W, H, FONT, colours) places every label so that it overlaps no other label and no place
   sprite, then rasterises it with a 1 px dark outline into a layer.
     items      [{ key, text, rank: 1 | 2, cx, cy, rect? }]   (cx, cy) = preferred centre in canvas pixels;
                rect = { x0, y0, x1, y1 } of the place it names (the label is tried around it and never laid on it).
     obstacles  [{ x0, y0, x1, y1, key }]  place sprites.
   Returns { rank: Uint8Array (0 none, 1 major, 2 minor), col: Uint8Array (palette index), placed: [...] }. */
(function () {
'use strict';
function wrapText(FONT, font, text, gap, maxW) {            // break at the space nearest the middle when too wide
  if (FONT.measure(font, text, gap) <= maxW || text.indexOf(' ') < 0) return [text];
  let best = -1, bd = 1e9;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ') {
    const d = Math.abs(FONT.measure(font, text.slice(0, i), gap) - FONT.measure(font, text.slice(i + 1), gap));
    if (d < bd) { bd = d; best = i; }
  }
  return [text.slice(0, best), text.slice(best + 1)];
}
const hit = (a, b, pad) => a.x0 - pad <= b.x1 && a.x1 + pad >= b.x0 && a.y0 - pad <= b.y1 && a.y1 + pad >= b.y0;
function overlap(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1, h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + 1;
  return w > 0 && h > 0 ? w * h : 0;
}
function layout(items, obstacles, W, H, FONT, COL) {
  const placed = [];
  const order = items.slice().sort((a, b) => a.rank - b.rank);
  for (const it of order) {
    const font = it.rank === 1 ? 'big' : 'small', gap = it.rank === 1 ? (it.gap || 2) : 1;
    const lines = it.lines || wrapText(FONT, font, it.text, gap, it.rank === 1 ? (it.maxW || 150) : 62);
    const lh = it.rank === 1 ? 9 : 8;
    const ws = lines.map(l => FONT.measure(font, l, gap));
    const bw = Math.max(...ws), bh = lines.length * lh - (it.rank === 1 ? 2 : 1);
    const cands = [];
    const hw = bw >> 1, hh = bh >> 1;
    if (it.fixed) cands.push([it.cx, it.cy]);
    else if (it.rect) {
      const r = it.rect, mx = (r.x0 + r.x1) >> 1, my = (r.y0 + r.y1) >> 1;
      cands.push([mx, r.y1 + 4 + hh], [mx, r.y0 - 4 - hh], [r.x1 + 5 + hw, my], [r.x0 - 5 - hw, my],
        [r.x1 + 4 + hw, r.y1 + 3 + hh], [r.x0 - 4 - hw, r.y1 + 3 + hh], [r.x1 + 4 + hw, r.y0 - 3 - hh], [r.x0 - 4 - hw, r.y0 - 3 - hh],
        [mx, r.y1 + 9 + hh], [mx, r.y0 - 9 - hh], [it.cx, it.cy]);
    } else {
      for (const [dx, dy] of [[0, 0], [0, 7], [0, -7], [10, 0], [-10, 0], [0, 14], [0, -14], [14, 8], [-14, 8], [14, -8], [-14, -8], [0, 21], [0, -21]]) cands.push([it.cx + dx, it.cy + dy]);
    }
    let best = null, bestCost = 1e12;
    for (let k = 0; k < cands.length; k++) {
      let cx = cands[k][0], cy = cands[k][1];
      cx = Math.max(hw + 3, Math.min(W - 3 - (bw - hw), cx)); cy = Math.max((it.yMin || 0) + hh + 3, Math.min(H - 4 - (bh - hh), cy));
      const box = { x0: cx - hw - 1, y0: cy - hh - 1, x1: cx - hw + bw, y1: cy - hh + bh };
      let cost = k * 2;
      for (const p of placed) if (hit(box, p.box, 2)) cost += 1000 + overlap(box, p.box) * 10;
      for (const o of obstacles) if (hit(box, o, 0)) cost += (o.key === it.poi ? 5000 : 600) + overlap(box, o) * 10;
      if (cost < bestCost) { bestCost = cost; best = { cx, cy, box }; }
      if (cost < 1000) break;
    }
    placed.push({ key: it.key, rank: it.rank, font, gap, lines, ws, lh, bw, bh, box: best.box, x: best.box.x0 + 1, y: best.box.y0 + 1, clash: bestCost >= 600 });
  }
  const rank = new Uint8Array(W * H), col = new Uint8Array(W * H);
  const dot = (x, y, r, c) => {                              // a minor label never eats into a major one
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = y * W + x;
    if (rank[i] === 1 && r === 2) return;
    rank[i] = r; col[i] = c;
  };
  for (let pass = 0; pass < 2; pass++) for (const p of placed) {
    const c = pass === 0 ? COL.outline : (p.rank === 1 ? COL.major : COL.minor);
    p.lines.forEach((line, k) => {
      const x = p.x + ((p.bw - p.ws[k]) >> 1), y = p.y + k * p.lh;
      FONT.draw(p.font, line, p.gap, (px, py) => {
        if (pass === 0) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) dot(px + i, py + j, p.rank, c); }
        else dot(px, py, p.rank, c);
      }, x, y);
    });
  }
  return { rank, col, placed };
}
const API = { layout, wrapText };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else window.MAP_LABELS = API;
})();
