"""Lettering: fonts, glyph-by-glyph text along a path (Pillow has no text-on-path), halo and ink compositing.

Every label is rendered at S x into a local canvas, one glyph at a time: each glyph is drawn upright, rotated to
the path's tangent at its centre and pasted, then the canvas is box-downsampled to 1x. A label is returned as an
Item: a float alpha window (1x) with its top-left pixel, ink, alpha and halo.
"""
import math
import os

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

from config_names import S, KERN, INK, PALE, STYLE

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, 'fonts')
_fonts, _glyphs = {}, {}


def font(spec, px):
    key = (spec['file'], spec.get('var'), px)
    if key not in _fonts:
        f = ImageFont.truetype(os.path.join(FONT_DIR, spec['file']), int(round(px * S)))
        if spec.get('var'):
            f.set_variation_by_name(spec['var'])
        _fonts[key] = f
    return _fonts[key]


class Item:
    """A rendered label or mark: alpha window a (h x w, 0..1) at (x0, y0), plus how to ink it."""

    def __init__(self, key, a, x0, y0, ink, alpha, halo, kind):
        self.key, self.a, self.x0, self.y0 = key, a, x0, y0
        self.ink, self.alpha, self.halo, self.kind = ink, alpha, halo, kind

    @property
    def box(self):
        return self.x0, self.y0, self.x0 + self.a.shape[1], self.y0 + self.a.shape[0]

    def moved(self, dx, dy):
        return Item(self.key, self.a, self.x0 + dx, self.y0 + dy, self.ink, self.alpha, self.halo, self.kind)


# ------------------------------------------------------------------ layout --
def metrics(f):
    cap = -f.getbbox('H', anchor='ls')[1]
    xh = -f.getbbox('x', anchor='ls')[1]
    return cap, xh


def layout(text, f, track, word):
    """Glyph advances along the line in S-scaled px: [(char, x_left, advance)], total length."""
    em = f.size
    out, x = [], 0.0
    for i, ch in enumerate(text):
        adv = f.getlength(ch) + (word * em if ch == ' ' else 0.0)
        out.append((ch, x, adv))
        if i + 1 < len(text):
            x += adv + KERN.get(text[i:i + 2], 0.0) * em + track * em
        else:
            x += adv
    return out, x


def text_length(text, style):
    st = STYLE[style]
    f = font(st['font'], st['px'])
    return layout(text, f, st['track'], st['word'])[1] / S


def mid_offset(text, f):
    """Distance from the baseline up to the line the path runs through (S px)."""
    cap, xh = metrics(f)
    letters = [c for c in text if c.isalpha()]
    if letters and all(c.isupper() for c in letters):
        return 0.5 * cap
    return 0.25 * (cap + xh)


def glyph(f, ch, mid):
    """Upright glyph on a square canvas; the point (advance centre, baseline - mid) is the canvas centre."""
    key = (id(f), ch, round(mid))
    if key not in _glyphs:
        d = int(f.size * 2.2) // 2 * 2
        img = Image.new('L', (d, d), 0)
        adv = f.getlength(ch)
        ImageDraw.Draw(img).text((d / 2 - adv / 2, d / 2 + mid), ch, font=f, fill=255, anchor='ls')
        _glyphs[key] = img
    return _glyphs[key]


# ------------------------------------------------------------------- paths --
def arclen(pts):
    seg = np.hypot(*np.diff(pts, axis=0).T)
    return np.concatenate([[0.0], np.cumsum(seg)])


def at(pts, s_arr, s):
    """Point and tangent angle at arc length s (linear extrapolation past the ends)."""
    i = int(np.clip(np.searchsorted(s_arr, s) - 1, 0, len(pts) - 2))
    p0, p1 = pts[i], pts[i + 1]
    seg = max(s_arr[i + 1] - s_arr[i], 1e-9)
    t = (s - s_arr[i]) / seg
    p = p0 + (p1 - p0) * t
    # tangent from a window of +-6 px for smooth rotation
    j0 = int(np.clip(np.searchsorted(s_arr, s - 6) - 1, 0, len(pts) - 1))
    j1 = int(np.clip(np.searchsorted(s_arr, s + 6), 0, len(pts) - 1))
    if j1 == j0:
        j0, j1 = i, i + 1
    d = pts[j1] - pts[j0]
    return p, math.atan2(d[1], d[0])


def catmull(ctrl, per=24):
    """Dense Catmull-Rom curve through control points (x, y)."""
    c = np.asarray(ctrl, np.float64)
    if len(c) == 2:
        t = np.linspace(0, 1, per * 2)[:, None]
        return c[0] + (c[1] - c[0]) * t
    c = np.vstack([2 * c[0] - c[1], c, 2 * c[-1] - c[-2]])
    out = []
    for i in range(1, len(c) - 2):
        p0, p1, p2, p3 = c[i - 1], c[i], c[i + 1], c[i + 2]
        for t in np.linspace(0, 1, per, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(c[-2])
    return np.array(out)


def render_path(key, text, style, pts, shift=0.0, kind='label'):
    """Render text centred along the polyline pts (1x px, the line through the middle of the letters)."""
    st = STYLE[style]
    f = font(st['font'], st['px'])
    glyphs, total = layout(text, f, st['track'], st['word'])
    mid = mid_offset(text, f)
    pts = np.asarray(pts, np.float64)
    s_arr = arclen(pts)
    start = (s_arr[-1] - total / S) / 2 + shift
    pad = st['px'] * 1.3
    x0 = int(math.floor(pts[:, 0].min() - pad))
    y0 = int(math.floor(pts[:, 1].min() - pad))
    x1 = int(math.ceil(pts[:, 0].max() + pad))
    y1 = int(math.ceil(pts[:, 1].max() + pad))
    canvas = Image.new('L', ((x1 - x0) * S, (y1 - y0) * S), 0)
    for ch, gx, adv in glyphs:
        if ch == ' ':
            continue
        p, ang = at(pts, s_arr, start + (gx + adv / 2) / S)
        g = glyph(f, ch, mid)
        if abs(ang) > 1e-4:
            g = g.rotate(-math.degrees(ang), resample=Image.BICUBIC)
        ox = int(round((p[0] - x0) * S - g.width / 2))
        oy = int(round((p[1] - y0) * S - g.height / 2))
        under = canvas.crop((ox, oy, ox + g.width, oy + g.height))
        canvas.paste(ImageChops.lighter(under, g), (ox, oy))
    a = np.asarray(canvas, np.float32) / 255
    h, w = a.shape[0] // S, a.shape[1] // S
    a = a[:h * S, :w * S].reshape(h, S, w, S).mean(axis=(1, 3))
    return trim(Item(key, a, x0, y0, INK[st['ink']], st['alpha'], st['halo'], kind))


def render_line(key, text, style, cx, cy, kind='label'):
    """Straight horizontal label centred at (cx, cy)."""
    L = text_length(text, style) + 40
    pts = np.array([[cx - L / 2, cy], [cx + L / 2, cy]])
    return render_path(key, text, style, pts, kind=kind)


def render_lines(key, lines, style, cx, cy, lead=1.05, kind='label'):
    """Several centred lines (lead = line spacing in font sizes), block centred at (cx, cy)."""
    px = STYLE[style]['px']
    n = len(lines)
    items = [render_line(key, t, style, cx, cy + (i - (n - 1) / 2) * px * lead, kind) for i, t in enumerate(lines)]
    return merge(key, items)


def merge(key, items):
    x0 = min(it.x0 for it in items)
    y0 = min(it.y0 for it in items)
    x1 = max(it.box[2] for it in items)
    y1 = max(it.box[3] for it in items)
    a = np.zeros((y1 - y0, x1 - x0), np.float32)
    for it in items:
        sl = a[it.y0 - y0:it.box[3] - y0, it.x0 - x0:it.box[2] - x0]
        np.maximum(sl, it.a, out=sl)
    i0 = items[0]
    return Item(key, a, x0, y0, i0.ink, i0.alpha, i0.halo, i0.kind)


def trim(it, pad=3):
    ys, xs = np.nonzero(it.a > 0.004)
    if len(xs) == 0:
        return it
    a0, a1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, it.a.shape[0])
    b0, b1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, it.a.shape[1])
    return Item(it.key, it.a[a0:a1, b0:b1], it.x0 + b0, it.y0 + a0, it.ink, it.alpha, it.halo, it.kind)


# --------------------------------------------------------------- compose --
def max_filter(a, r):
    if r < 1:
        return a
    p = np.pad(a, r)
    h, w = a.shape
    out = a.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r + r:
                np.maximum(out, p[r + dy:r + dy + h, r + dx:r + dx + w], out=out)
    return out


def box_blur(a, sigma):
    """Small separable Gaussian (for halos)."""
    if sigma <= 0.2:
        return a
    r = int(math.ceil(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    p = np.pad(a, r, mode='edge') if a.ndim == 2 else np.pad(a, ((r, r), (r, r), (0, 0)), mode='edge')
    out = sum(k[i] * p[i:i + a.shape[0]] for i in range(2 * r + 1))
    out = sum(k[i] * out[:, i:i + a.shape[1]] for i in range(2 * r + 1))
    return out.astype(np.float32)


def halo_alpha(a, halo):
    return np.clip(box_blur(max_filter(a, halo['r']), halo['blur']) * 1.15, 0, 1) * halo['strength']


def compose(img, it, halo=True):
    """Ink one item onto img (float32 H x W x 3, in place): adaptive halo first, then the ink."""
    pad = 6
    H, Wd = img.shape[:2]
    a = np.pad(it.a, pad)
    x0, y0 = it.x0 - pad, it.y0 - pad
    xa, ya = max(x0, 0), max(y0, 0)
    xb, yb = min(x0 + a.shape[1], Wd), min(y0 + a.shape[0], H)
    if xb <= xa or yb <= ya:
        return
    a = a[ya - y0:yb - y0, xa - x0:xb - x0]
    bg = img[ya:yb, xa:xb]
    col = bg
    if halo and it.halo:
        ha = halo_alpha(a, it.halo)
        soft = box_blur(bg, 2.0)
        lift = soft + (np.array(PALE, np.float32) - soft) * it.halo['k']
        col = col + (lift - col) * ha[..., None]
    col = col + (np.array(it.ink, np.float32) - col) * (a * it.alpha)[..., None]
    img[ya:yb, xa:xb] = col
