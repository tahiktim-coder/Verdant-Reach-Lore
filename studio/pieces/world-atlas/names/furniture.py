"""Map furniture: the double-line frame on a plain paper margin, the title cartouche (title, subtitle, scale bar
in leagues, the one-line note) over the open sea in the south-west corner, and a small restrained compass.

Everything is drawn as Items (alpha windows) in one pale ivory ink, so the clean and the named sheets share it.
"""
import math

import numpy as np
from PIL import Image, ImageDraw

import lettering as L
from config_names import S, INK, FRAME, TITLE, SCALE, COMPASS, STYLE, CINZEL, GARAMOND_IT, GARAMOND_REG

FURN_HALO = None


def vector_item(key, x0, y0, w, h, draw_fn, alpha=0.9):
    """Run draw_fn(ImageDraw, to_s) on an S x canvas covering (x0, y0, w, h); to_s maps sheet px -> canvas px."""
    img = Image.new('L', (w * S, h * S), 0)
    d = ImageDraw.Draw(img)

    def to_s(x, y):
        return (x - x0) * S, (y - y0) * S

    draw_fn(d, to_s)
    a = np.asarray(img, np.float32).reshape(h, S, w, S).mean(axis=(1, 3)) / 255
    return L.Item(key, a, x0, y0, INK['furniture'], alpha, FURN_HALO, 'furniture')


def rect_cover(n, x0, y0, x1, y1):
    """Exact pixel coverage of an axis-aligned rectangle (anti-aliased)."""
    i = np.arange(n, dtype=np.float32)
    cx = np.clip(np.minimum(i + 1, x1) - np.maximum(i, x0), 0, 1)
    cy = np.clip(np.minimum(i + 1, y1) - np.maximum(i, y0), 0, 1)
    return cy[:, None] * cx[None, :]


def frame(img):
    """Paper margin outside the map, a thin inner rule on the map edge, a gap, a slightly heavier outer rule."""
    n = img.shape[0]
    F = FRAME
    m = F['map_inset']
    inside = rect_cover(n, m, m, n - m, n - m)
    paper = np.array(F['paper'], np.float32)
    out = img * inside[..., None] + paper * (1 - inside[..., None])
    a = m - F['inner_w']
    ring_in = rect_cover(n, a, a, n - a, n - a) - inside
    b = a - F['gap']
    c = b - F['outer_w']
    ring_out = rect_cover(n, c, c, n - c, n - c) - rect_cover(n, b, b, n - b, n - b)
    rule = np.array(INK['rule'], np.float32)
    for ring, k in ((ring_in, 0.85), (ring_out, 0.9)):
        out = out + (rule - out) * (ring * k)[..., None]
    return out


# ------------------------------------------------------------- the title --
def title_block(n):
    """Returns (items, reserved box). Title, subtitle, scale bar, note; centred at TITLE['at']."""
    cx, cy = TITLE['at'][0] * n, TITLE['at'][1] * n
    STYLE['title'] = dict(font=CINZEL, px=TITLE['title_px'], track=TITLE['title_track'], word=0.25,
                          ink='furniture', alpha=0.9, halo=None)
    STYLE['subtitle'] = dict(font=GARAMOND_IT, px=TITLE['sub_px'], track=0.03, word=0.05, ink='furniture',
                             alpha=0.85, halo=None)
    STYLE['note'] = dict(font=GARAMOND_IT, px=TITLE['note_px'], track=0.02, word=0.0, ink='furniture',
                         alpha=0.72, halo=None)
    STYLE['scale_num'] = dict(font=GARAMOND_REG, px=17, track=0.0, word=0.0, ink='furniture', alpha=0.78, halo=None)
    items = []
    y = cy - 70
    items.append(L.render_line('title', TITLE['text'], 'title', cx, y, kind='furniture'))
    y += 50
    items.append(L.render_line('subtitle', TITLE['sub'], 'subtitle', cx, y, kind='furniture'))
    y += 36
    items += scale_bar(cx, y)
    y += 58
    items.append(L.render_line('note', TITLE['note'], 'note', cx, y, kind='furniture'))
    tw = max(it.box[2] for it in items) - min(it.box[0] for it in items)
    bx0, bx1 = int(cx - tw / 2 - 34), int(cx + tw / 2 + 34)
    by0, by1 = int(cy - 70 - 52), int(y + 30)
    items.insert(0, cartouche(bx0, by0, bx1, by1))
    return items, (bx0 - 6, by0 - 6, bx1 + 6, by1 + 6)


def cartouche(x0, y0, x1, y1):
    """A thin double rule round the title block."""
    def draw(d, to_s):
        for inset, w in ((0, 1.6), (5, 0.9)):
            a, b = to_s(x0 + inset, y0 + inset)
            c, e = to_s(x1 - inset, y1 - inset)
            d.rectangle([a, b, c, e], outline=255, width=max(1, int(round(w * S))))
    it = vector_item('cartouche', x0 - 2, y0 - 2, x1 - x0 + 5, y1 - y0 + 5, draw, alpha=0.55)
    return it


def scale_bar(cx, y):
    """50 leagues, alternate 10-league blocks, numbers below; 1 league = 3 miles (a proposal)."""
    ppl, lg, step, bh = SCALE['px_per_league'], SCALE['leagues'], SCALE['step'], SCALE['bar_h']
    length = ppl * lg
    x0 = cx - length / 2

    def draw(d, to_s):
        a, b = to_s(x0, y)
        c, e = to_s(x0 + length, y + bh)
        d.rectangle([a, b, c, e], outline=255, width=int(1.0 * S))
        for k in range(0, lg, step):
            if (k // step) % 2 == 0:
                p, q = to_s(x0 + k * ppl, y)
                r, s = to_s(x0 + (k + step) * ppl, y + bh)
                d.rectangle([p, q, r, s], fill=255)
        for k in range(0, lg + 1, step):
            p, q = to_s(x0 + k * ppl, y - 3)
            r, s = to_s(x0 + k * ppl, y + bh + 3)
            d.line([p, q, r, s], fill=255, width=int(1.0 * S))
    items = [vector_item('scale_bar', int(x0) - 3, int(y) - 6, int(length) + 8, bh + 12, draw, alpha=0.8)]
    for k in range(0, lg + 1, step):
        items.append(L.render_line('scale_%d' % k, str(k), 'scale_num', x0 + k * ppl, y + bh + 17, kind='furniture'))
    lx = x0 + length + 14 + L.text_length(SCALE['label'], 'scale_num') / 2
    items.append(L.render_line('scale_unit', SCALE['label'], 'scale_num', lx, y + bh / 2 + 1, kind='furniture'))
    return items


# ------------------------------------------------------------- compass --
def compass(n):
    cx, cy, r = COMPASS['at'][0] * n, COMPASS['at'][1] * n, COMPASS['r']
    STYLE['compass_n'] = dict(font=CINZEL, px=24, track=0.0, word=0.0, ink='furniture', alpha=0.88, halo=None)

    def draw(d, to_s):
        a, b = to_s(cx - r, cy - r)
        c, e = to_s(cx + r, cy + r)
        d.ellipse([a, b, c, e], outline=255, width=int(1.1 * S))
        for ang in (0, 90, 180, 270):
            t = math.radians(ang)
            p = to_s(cx + math.sin(t) * (r - 5), cy - math.cos(t) * (r - 5))
            q = to_s(cx + math.sin(t) * (r + 5), cy - math.cos(t) * (r + 5))
            d.line([p, q], fill=255, width=int(1.1 * S))
        tip, tail, w = r + 14, r - 2, 5.5
        d.polygon([to_s(cx, cy - tip), to_s(cx + w, cy), to_s(cx - w, cy)], fill=255)          # north: solid
        d.polygon([to_s(cx, cy + tail), to_s(cx + w, cy), to_s(cx - w, cy)], outline=255,
                  width=int(1.0 * S))                                                           # south: open
    pad = r + 20
    items = [vector_item('compass', int(cx - pad), int(cy - pad), int(2 * pad), int(2 * pad), draw, alpha=0.75)]
    items.append(L.render_line('compass_n', 'N', 'compass_n', cx, cy - r - 30, kind='furniture'))
    box = (int(cx - pad - 6), int(cy - r - 50), int(cx + pad + 6), int(cy + pad + 6))
    return items, box


def build(n):
    t_items, t_box = title_block(n)
    c_items, c_box = compass(n)
    return t_items + c_items, [t_box, c_box]
