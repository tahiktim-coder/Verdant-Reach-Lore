"""Placement: the world's cost fields and the searches that put names where they belong.

World holds what a label must respect: land and water, the painted rivers (rebuilt with the painter's own
rivers.py, so they match the relief exactly), summits and cones, how dark the ground is, distance from the coast
and the occupancy of everything already placed. Every candidate is scored on its real rendered ink mask.
"""
import json
import math
import os
import sys

import numpy as np

from config_names import W, FRAME
import lettering as L

HERE = os.path.dirname(os.path.abspath(__file__))
PAINT = os.path.normpath(os.path.join(HERE, '..', 'paint'))
TERRAIN = os.path.normpath(os.path.join(HERE, '..', 'terrain'))
sys.path.insert(0, PAINT)
import rivers as rivmod                      # noqa: E402  (the painter's own river tracer)
from fields import blur, smoothstep, min_filter  # noqa: E402
from config import RELIEF                    # noqa: E402

INVALID = 1e9


def load(name, dtype, n):
    return np.fromfile(os.path.join(TERRAIN, name), dtype=dtype).reshape(n, n)


def dilate(mask, r):
    return L.max_filter(mask.astype(np.float32), r) > 0.5


def painted_rivers(h, acc, lake, region):
    """Same call as paint.py: river alpha and the shaped polylines (pixel coords)."""
    n = h.shape[0]
    water = ~(h > 0.2) | lake
    hb = blur(h, 5)
    lines = rivmod.trace(acc, hb, water, region)
    lines = rivmod.prune(lines, acc, n)
    lines = rivmod.merge_mouths(lines, acc, n)
    lines = rivmod.join_at_contact(lines, acc, n)
    lines = rivmod.drop_against_flow(lines, n)
    lines = rivmod.prune(lines, acc, n)
    gy, gx = np.gradient(blur(h, 4) * RELIEF['z_cells'])
    flat = 1 - smoothstep(0.04, 0.15, np.hypot(gx, gy))
    shaped = rivmod.shape_all(lines, acc, flat)
    a, _ = rivmod.draw(shaped, n)
    return a, shaped


def summits(h, cones, n):
    """Peak points: local maxima of the smoothed height above 0.45, plus the layout's cones."""
    hs = blur(h, 3)
    r = 18
    small = hs[::2, ::2]
    mx = L.max_filter(small, r // 2)
    jj, ii = np.nonzero((small >= mx - 1e-7) & (small > 0.45))
    pts = [(i * 2 + 1, j * 2 + 1, 9) for i, j in zip(ii, jj)]
    pts += [(c['at'][0] * n, c['at'][1] * n, max(10, c['r'] * n * 0.45)) for c in cones]
    return pts


def distance_from(mask, step=4, max_steps=110):
    """Approximate distance (px) from a mask: octagonal dilation at 1/step resolution, upsampled."""
    n = mask.shape[0]
    q = mask.reshape(n // step, step, n // step, step).any(axis=(1, 3))
    dist = np.where(q, 0.0, np.inf).astype(np.float32)
    cur = q.copy()
    for k in range(1, max_steps):
        p = np.pad(cur, 1)
        nb = p[1:-1, :-2] | p[1:-1, 2:] | p[:-2, 1:-1] | p[2:, 1:-1]
        if k % 2 == 0:
            nb = nb | p[:-2, :-2] | p[:-2, 2:] | p[2:, :-2] | p[2:, 2:]
        new = (nb | cur) & ~cur
        dist[new] = k * step
        cur = cur | new
        if cur.all():
            break
    dist[np.isinf(dist)] = max_steps * step
    return np.repeat(np.repeat(dist, step, 0), step, 1)


class World:
    def __init__(self, relief):
        meta = json.load(open(os.path.join(TERRAIN, 'meta.json'), encoding='utf-8'))
        pois = json.load(open(os.path.join(TERRAIN, 'pois.json'), encoding='utf-8'))['pois']
        self.meta, self.P = meta, {p['key']: p for p in pois}
        n = self.n = meta['grid']
        self.h = load('height.f32', np.float32, n)
        self.hb = blur(self.h, 5)
        lake_id = load('lake.u8', np.uint8, n)
        self.lake_id = lake_id
        self.lake = lake_id > 0
        self.region = load('region.u8', np.uint8, n)
        self.land = (self.h > meta['sea_level']) & ~self.lake
        self.sea = ~(self.h > meta['sea_level'])
        self.land_core = min_filter(self.land.astype(np.float32), 10) > 0.5     # land at least 10 px from water
        acc = load('river.f32', np.float32, n)
        self.river_a, self.river_lines = painted_rivers(self.h, acc, self.lake, self.region)
        self.river = dilate(self.river_a > 0.15, 2)
        self.peak_pts = summits(self.h, meta['layout']['cones'], n)
        self.peaks = np.zeros((n, n), bool)
        jj, ii = np.mgrid[0:n, 0:n]
        for x, y, r in self.peak_pts:
            x0, x1, y0, y1 = int(max(x - r, 0)), int(min(x + r + 1, n)), int(max(y - r, 0)), int(min(y + r + 1, n))
            self.peaks[y0:y1, x0:x1] |= (ii[y0:y1, x0:x1] - x) ** 2 + (jj[y0:y1, x0:x1] - y) ** 2 <= r * r
        self.mountain = smoothstep(0.40, 0.52, self.hb)
        self.Y = (relief[..., 0] * 0.299 + relief[..., 1] * 0.587 + relief[..., 2] * 0.114).astype(np.float32)
        self.dist_land = distance_from(~self.sea)
        self.occ = np.zeros((n, n), bool)
        self.occ_text = np.zeros((n, n), bool)
        s0 = FRAME['map_inset'] + FRAME['safe']
        self.safe = (s0, n - s0)
        self.items = []

    # ------------------------------------------------------------- scoring --
    def window(self, it, pad):
        x0, y0, x1, y1 = it.box
        return slice(y0 - pad, y1 + pad), slice(x0 - pad, x1 + pad)

    def evaluate(self, it, medium='land', gap=6, river_w=None, contrast_w=None, ythr=128.0, near_r=20, within=None,
                 margin=2):
        """Score one rendered candidate (lower is better); INVALID if it collides or leaves the safe area."""
        x0, y0, x1, y1 = it.box
        lo, hi = self.safe
        pad = max(gap, near_r)
        if x0 - gap < lo or y0 - gap < lo or x1 + gap > hi or y1 + gap > hi:
            return INVALID, {}
        if x0 - pad < 0 or y0 - pad < 0 or x1 + pad > self.n or y1 + pad > self.n:
            return INVALID, {}
        big = np.pad(it.a > 0.06, pad)
        bys, bxs = self.window(it, pad)
        if (dilate(big, gap) & self.occ[bys, bxs]).any():
            return INVALID, {}
        near = float((box_dilate(big, near_r) & self.occ_text[bys, bxs]).any()) if near_r else 0.0
        ink = big[pad - gap:big.shape[0] - pad + gap, pad - gap:big.shape[1] - pad + gap]
        ys, xs = self.window(it, gap)
        body = dilate(ink, 2)
        nb = max(body.sum(), 1)
        edge = body if margin <= 2 else dilate(ink, min(margin, gap))
        river = (body & self.river[ys, xs]).sum() / nb
        peak = (body & self.peaks[ys, xs]).sum() / nb
        if medium == 'land':
            wrong = (edge & ~self.land[ys, xs]).sum() / nb
        elif medium == 'sea':
            wrong = (edge & ~self.sea[ys, xs]).sum() / nb
        else:
            wrong = (body & ~(self.lake_id[ys, xs] == medium)).sum() / nb
        Y = self.Y[ys, xs][ink]
        contrast = float(np.maximum(0, ythr - Y).mean()) if len(Y) else 0.0
        steep = float(self.mountain[ys, xs][ink].mean()) if len(Y) else 0.0
        rw = W['river'] if river_w is None else river_w
        cw = W['contrast'] if contrast_w is None else contrast_w
        out = 0.0
        if within is not None:
            out = float((ink & ~np.isin(self.region[ys, xs], within)).sum() / max(ink.sum(), 1))
        cost = rw * river + (3.0 if rw >= W['river'] and river > 0 else 0.0) + W['peak'] * peak + W['wrong_ground'] * wrong + cw * contrast + W['steep'] * steep \
            + W['near'] * near + W['within'] * out
        return cost, dict(river=river, peak=peak, wrong=wrong, contrast=contrast, steep=steep, near=near, outside=out)

    def commit(self, it, grow=1):
        ys, xs = self.window(it, grow)
        self.occ[ys, xs] |= dilate(np.pad(it.a > 0.06, grow), grow)
        if it.kind != 'mark':
            self.occ_text[ys, xs] |= np.pad(it.a > 0.06, grow)
        self.items.append(it)

    def reserve(self, x0, y0, x1, y1):
        self.occ[max(y0, 0):y1, max(x0, 0):x1] = True

    # ------------------------------------------------------------ searches --
    def best_of(self, cands, medium='land', **kw):
        """cands: [(item, penalty, tag)]. Returns (item, total, detail, tag) of the cheapest valid one."""
        best = None
        kw.setdefault('near_r', 34)
        for it, pen, tag in cands:
            c, det = self.evaluate(it, medium, **kw)
            if c >= INVALID:
                continue
            tot = c + pen
            if best is None or tot < best[1]:
                best = (it, tot, det, tag)
        return best

    def point_candidates(self, base, mark, gap=7):
        """Text positions around a mark: right first, then below, then the rest."""
        mx0, my0, mx1, my1 = ink_box(mark)
        tx0, ty0, tx1, ty1 = ink_box(base)
        tw, th = tx1 - tx0, ty1 - ty0
        mcy = (my0 + my1) / 2 + 2
        mcx = (mx0 + mx1) / 2
        out = []

        def put(left, top, pen, tag):
            out.append((base.moved(int(round(left - tx0)), int(round(top - ty0))), pen, tag))

        for g in (gap, gap + 7, gap + 15):
            far = (g - gap) * 0.03
            for dy in range(-18, 19, 3):
                put(mx1 + g, mcy - th / 2 + dy, far + abs(dy) * 0.012, 'right')
                put(mx0 - g - tw, mcy - th / 2 + dy, 0.9 + far + abs(dy) * 0.012, 'left')
            for dx in range(-int(tw * 0.45), int(tw * 0.45) + 1, 6):
                put(mcx - tw / 2 + dx, my1 + g - 2, 0.25 + far + abs(dx) * 0.004, 'below')
                put(mcx - tw / 2 + dx, my0 - g - th + 1, 0.6 + far + abs(dx) * 0.004, 'above')
            for sx, sy, pen, tag in ((1, 1, 0.35, 'below-right'), (1, -1, 0.45, 'above-right'),
                                     (-1, 1, 0.8, 'below-left'), (-1, -1, 0.9, 'above-left')):
                left = mx1 + g - 4 if sx > 0 else mx0 - g - tw + 4
                top = my1 + g - 6 if sy > 0 else my0 - g - th + 6
                put(left, top, pen + far, tag)
        return out

    def around_candidates(self, base, cx, cy, r, prefer=True, step=8, core=0.0):
        """Text centres on a grid round (cx, cy). Area names: penalty by centre distance. Feature names (prefer):
        penalty by the gap between the text's box and the feature centre beyond its core, so long names hug it."""
        tx0, ty0, tx1, ty1 = ink_box(base)
        bcx, bcy = (tx0 + tx1) / 2, (ty0 + ty1) / 2
        hw, hh = (tx1 - tx0) / 2, (ty1 - ty0) / 2
        reach = r + (hw if prefer else 0)
        out = []
        for dy in range(-int(reach), int(reach) + 1, step):
            for dx in range(-int(reach), int(reach) + 1, step):
                if prefer:
                    gx, gy = max(abs(dx) - hw, 0), max(abs(dy) - hh, 0)
                    d = math.hypot(gx, gy)
                    if d > r:
                        continue
                    pen = W['dist'] * (max(d - core, 0) / r) ** 2 + 0.12 * (dy < -hh) + 0.2 * (dx < -hw)
                else:
                    d = math.hypot(dx, dy)
                    if d > r:
                        continue
                    pen = W['dist'] * (d / r) ** 2
                out.append((base.moved(int(round(cx + dx - bcx)), int(round(cy + dy - bcy))), pen, '%+d,%+d' % (dx, dy)))
        return out


def box_dilate(mask, r):
    """Square dilation, separable (fast for big radii)."""
    out = mask
    for axis in (0, 1):
        p = np.pad(out, [(r, r) if k == axis else (0, 0) for k in (0, 1)])
        n = out.shape[axis]
        acc = np.zeros_like(out)
        for k in range(2 * r + 1):
            acc |= p[k:k + n] if axis == 0 else p[:, k:k + n]
        out = acc
    return out


def ink_box(it, thr=0.06):
    ys, xs = np.nonzero(it.a > thr)
    return it.x0 + xs.min(), it.y0 + ys.min(), it.x0 + xs.max() + 1, it.y0 + ys.max() + 1
