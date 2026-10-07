"""The cartographic mark set: small vector shapes in one ink, drawn at S x and box-downsampled.

Units are 1x pixels on the 2048 sheet, y down, (0, 0) = the place. Every mark is a plain silhouette or a
1.6-1.9 px line, about 16-36 px across, so they share one visual weight. Nothing clip-art-detailed.
"""
import math

import numpy as np
from PIL import Image, ImageDraw

from config_names import S, INK, MARK
from lettering import Item, trim

BOX = 72          # canvas side at 1x


class Pen:
    """Draw in mark units onto an S x canvas centred on the place (with a sub-pixel offset)."""

    def __init__(self, fx, fy, scale=1.0, mirror=False):
        self.img = Image.new('L', (BOX * S, BOX * S), 0)
        self.d = ImageDraw.Draw(self.img)
        self.cx, self.cy = (BOX / 2 + fx) * S, (BOX / 2 + fy) * S
        self.k, self.m = scale * S, (-1 if mirror else 1)

    def p(self, x, y):
        return self.cx + self.m * x * self.k, self.cy + y * self.k

    def poly(self, pts, fill=255):
        self.d.polygon([self.p(x, y) for x, y in pts], fill=fill)

    def rect(self, x0, y0, x1, y1, fill=255):
        self.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill)

    def line(self, pts, w, fill=255):
        q = [self.p(x, y) for x, y in pts]
        self.d.line(q, fill=fill, width=max(1, int(round(w * self.k))), joint='curve')
        r = w * self.k / 2
        for x, y in (q[0], q[-1]):
            self.d.ellipse([x - r, y - r, x + r, y + r], fill=fill)

    def disc(self, x, y, r, fill=255):
        cx, cy = self.p(x, y)
        rr = r * self.k
        self.d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=fill)

    def ellipse(self, x, y, rx, ry, ang, fill=255, n=28):
        ca, sa = math.cos(ang), math.sin(ang)
        pts = [(x + rx * math.cos(t) * ca - ry * math.sin(t) * sa, y + rx * math.cos(t) * sa + ry * math.sin(t) * ca)
               for t in np.linspace(0, 2 * math.pi, n, endpoint=False)]
        self.poly(pts, fill)

    def alpha(self):
        a = np.asarray(self.img, np.float32) / 255
        return a.reshape(BOX, S, BOX, S).mean(axis=(1, 3))


def merlons(pen, x0, x1, y, n, h):
    w = (x1 - x0) / (2 * n - 1)
    for i in range(n):
        pen.rect(x0 + 2 * i * w, y - h, x0 + (2 * i + 1) * w, y + 0.5)


# ------------------------------------------------------------------ shapes --
CASTLE_VARIANTS = [   # (keep width, keep height, tower height, tower on the right?, spire?)
    (12, 13, 23, True, False), (12, 12, 22, False, True), (13, 13, 21, True, True), (11, 13, 24, False, False),
    (12, 12, 22, True, False), (13, 12, 23, False, True), (12, 13, 22, True, True), (11, 12, 21, False, False),
    (12, 13, 22, True, True),
]


def castle(pen, variant, pennant=False):
    kw, kh, th, right, spire = CASTLE_VARIANTS[variant % len(CASTLE_VARIANTS)]
    base = 8.0
    pen.m = 1 if right else -1
    kx0 = -kw / 2 - 2.5
    kx1 = kx0 + kw
    pen.rect(kx0, base - kh, kx1, base)                       # keep
    merlons(pen, kx0, kx1, base - kh, 3, 3.0)
    tx0, tx1 = kx1 - 0.5, kx1 + 5.6                            # tower
    top = base - th
    pen.rect(tx0, top, tx1, base)
    if spire or pennant:
        pen.poly([(tx0 - 0.9, top + 0.3), (tx1 + 0.9, top + 0.3), ((tx0 + tx1) / 2, top - 7.5)])
        if pennant:
            tip = top - 7.5
            pen.line([((tx0 + tx1) / 2, tip + 1), ((tx0 + tx1) / 2, tip - 6.0)], 1.2)
            pen.poly([((tx0 + tx1) / 2 + 0.3, tip - 6.4), ((tx0 + tx1) / 2 + 6.5, tip - 4.6), ((tx0 + tx1) / 2 + 0.3, tip - 2.8)])
    else:
        merlons(pen, tx0, tx1, top, 2, 2.8)
    pen.rect(kx0 - 1.5, base - 0.2, tx1 + 1.5, base + 1.8)      # plinth


def city(pen):
    base = 9.0
    pen.rect(-15, base - 6, 15, base)                         # wall
    merlons(pen, -15, 15, base - 6, 7, 2.2)
    for x0, x1, top, sp in ((-13, -8.6, -9, 6.5), (-5.6, -1.4, -15, 8.0), (9.0, 13.2, -7, 0)):
        pen.rect(x0, top, x1, base)
        if sp:
            pen.poly([(x0 - 0.7, top + 0.3), (x1 + 0.7, top + 0.3), ((x0 + x1) / 2, top - sp)])
        else:
            merlons(pen, x0, x1, top, 2, 2.4)
    pen.rect(0.4, -4, 7.8, base)                              # drum
    pen.ellipse(4.1, -4.2, 5.0, 5.6, 0)                       # dome
    pen.rect(-0.9, -4.2, 9.1, -2.6)
    pen.line([(4.1, -9.5), (4.1, -13.5)], 1.2)


def spires(pen):
    for x, w, h in ((-7.5, 4.6, 24), (0.0, 5.2, 33), (7.0, 4.2, 20)):
        pen.poly([(x - w / 2, 10), (x + w / 2, 10), (x + 0.35, 10 - h)])
    pen.rect(-11, 9.6, 10.5, 11.4)


def one_hand(pen, ox, tilt):
    """An open hand, palm out, fingers up; ox = wrist centre x, tilt in radians."""
    c, s = math.cos(tilt), math.sin(tilt)

    def T(x, y):
        return ox + x * c - y * s, x * s + y * c

    pen.poly([T(-4.6, 9.5), T(4.6, 9.5), T(5.0, 0.5), T(4.2, -2.0), T(-4.2, -2.0), T(-5.0, 0.5)])   # palm
    for fx, fl in ((-3.3, 7.0), (-1.0, 8.8), (1.4, 8.4), (3.6, 6.4)):
        pen.line([T(fx, -1.0), T(fx * 1.08, -1.0 - fl)], 1.75)
    pen.line([T(-4.4, 3.5), T(-8.2, -1.0)], 1.9)                                                       # thumb


def hands(pen):
    one_hand(pen, -7.6, -0.16)
    pen.m = -1
    one_hand(pen, -7.6, -0.16)


def cavern(pen):
    pen.rect(-10.5, -1.0, 10.5, 8.0)
    pen.ellipse(0, -1.0, 10.5, 10.0, 0)
    pen.rect(-6.6, -1.0, 6.6, 8.5, fill=0)
    pen.ellipse(0, -1.0, 6.6, 6.6, 0, fill=0)
    pen.rect(-14.0, 7.8, 14.0, 9.4)


def swamp(pen):
    """Three reed tufts over short water dashes: blades start apart at the base and arc outward."""
    for bx, by, sc in ((-11.0, 2.0, 0.92), (0.5, 4.5, 1.08), (11.5, 1.0, 0.85)):
        for dx0, lean, ln in ((-1.6, -0.55, 9.0), (-0.4, -0.12, 12.5), (0.8, 0.22, 11.0), (1.9, 0.62, 8.0)):
            pts = []
            for t in np.linspace(0, 1, 8):
                pts.append((bx + dx0 * sc + lean * ln * sc * t * t, by - ln * sc * t))
            pen.line(pts, 1.2)
        pen.line([(bx - 5.5 * sc, by + 2.6), (bx + 5.5 * sc, by + 2.6)], 1.3)


def windmill(pen):
    pen.poly([(-2.6, 10), (2.6, 10), (1.2, -3), (-1.2, -3)])       # post / body
    for a in (math.radians(40), math.radians(140)):
        dx, dy = math.cos(a) * 9.5, math.sin(a) * 9.5
        pen.line([(-dx, -4 - dy), (dx, -4 + dy)], 1.7)
    pen.disc(0, -4, 1.6)


def broken_tower(pen, variant):
    jag = [((-3.2, -7.5), (-1.2, -9.5), (0.4, -6.0), (3.2, -8.5)),
           ((-3.2, -9.0), (-0.6, -6.5), (1.2, -9.8), (3.2, -6.0)),
           ((-3.2, -6.0), (-1.0, -8.8), (1.0, -5.2), (3.2, -7.0))][variant % 3]
    pen.poly([(-3.4, 7), (3.4, 7)] + [(3.2, jag[3][1])] + list(reversed(jag[:3])) + [(-3.2, jag[0][1])])
    pen.rect(-5.0, 6.4, 5.0, 8.2)


def grove(pen):
    for x, r, base in ((-4.2, 4.3, 6.0), (4.0, 3.6, 7.0)):
        pen.line([(x, base), (x, base - 5)], 1.5)
        pen.disc(x, base - 5 - r * 0.85, r)


def spiral(pen):
    pts = []
    turns, r0, r1 = 2.1, 1.0, 8.6
    for t in np.linspace(0, 1, 120):
        th = t * turns * 2 * math.pi
        r = r0 + (r1 - r0) * t
        pts.append((r * math.cos(th), -r * math.sin(th) * 0.86))
    pen.line(pts, 1.6)


def flower(pen):
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        pen.ellipse(math.cos(a) * 3.9, math.sin(a) * 3.9, 3.3, 2.0, a)
    pen.disc(0, 0, 1.4, fill=0)


DRAW = dict(castle=lambda p, v: castle(p, v), castle_order=lambda p, v: castle(p, 8, pennant=True),
            city=lambda p, v: city(p), spires=lambda p, v: spires(p), hands=lambda p, v: hands(p),
            cavern=lambda p, v: cavern(p), swamp=lambda p, v: swamp(p), windmill=lambda p, v: windmill(p),
            broken_tower=lambda p, v: broken_tower(p, v), grove=lambda p, v: grove(p),
            spiral=lambda p, v: spiral(p), flower=lambda p, v: flower(p))
SCALE = dict(castle_order=1.22, city=1.08, broken_tower=0.95, grove=1.0)


def mark(kind, key, x, y, variant=0):
    """Render one mark centred on (x, y) in sheet pixels."""
    ix, iy = int(math.floor(x)), int(math.floor(y))
    pen = Pen(x - ix, y - iy, SCALE.get(kind, 1.0))
    DRAW[kind](pen, variant)
    it = Item(key, pen.alpha(), ix - BOX // 2, iy - BOX // 2, INK[MARK['ink']], MARK['alpha'], MARK['halo'], 'mark')
    return trim(it, pad=2)
