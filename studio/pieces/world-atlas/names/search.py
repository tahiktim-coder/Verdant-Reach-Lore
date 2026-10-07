"""Searches for the curved names: region and sea names on gentle arcs, the border river along its painted line,
Still Water along the lake's axis.

Arcs: every (centre, angle, bow) on a grid is first scored cheaply on a ribbon of sample points (stay inside the
region or sea, keep off marks, labels, summits and dark ground, keep near the anchor, and for seas run parallel to
the coast). The best few are then rendered for real and scored on their ink.
"""
import json
import math
import os

import numpy as np

import lettering as L
from config_names import STYLE
from place import INVALID, TERRAIN, dilate, ink_box

ARC = dict(step=16, along=36, across=5, shortlist=60, occ_gap=10)


def arc_pts(cx, cy, ang, bow, length, k):
    """Points of a gentle arc: centre (cx, cy), chord angle ang (rad), sagitta bow (px, + = arched up)."""
    t = np.linspace(-length / 2, length / 2, k)
    yl = -bow * (1 - (2 * t / length) ** 2)
    ca, sa = math.cos(ang), math.sin(ang)
    return np.stack([cx + t * ca - yl * sa, cy + t * sa + yl * ca], 1)


def text_height(text, style):
    st = STYLE[style]
    f = L.font(st['font'], st['px'])
    cap, xh = L.metrics(f)
    letters = [c for c in text if c.isalpha()]
    return (cap if all(c.isupper() for c in letters) else 0.5 * (cap + xh) + 0.3 * cap) / L.S


def ribbon_scores(world, spec, cands, length, hgt, sea):
    """Vectorised cheap score of arc candidates (M x 4: cx, cy, ang, bow)."""
    n = world.n
    allow = np.isin(world.region, spec['allow'])
    if sea:
        ok = allow & world.sea & (world.dist_land > 34)
    else:
        ok = allow & world.land_core
    occ = dilate(world.occ[::2, ::2], ARC['occ_gap'] // 2)
    lo, hi = world.safe
    K, J = ARC['along'], ARC['across']
    t = np.linspace(-0.5, 0.5, K)[None, :, None]
    u = np.linspace(-0.5, 0.5, J)[None, None, :] * hgt
    out = np.full(len(cands), np.inf)
    ax, ay = spec['anchor'][0] * n, spec['anchor'][1] * n
    for c0 in range(0, len(cands), 20000):
        C = cands[c0:c0 + 20000]
        cx, cy, ang, bow = (C[:, i][:, None, None] for i in range(4))
        pref = C[:, 4]
        tl = t * length
        yl = -bow * (1 - (2 * t) ** 2)
        # local tangent of the arc for the across offsets
        dyl = bow * 8 * t / length
        ta = ang + np.arctan(dyl)
        x = cx + tl * np.cos(ang) - yl * np.sin(ang) - u * np.sin(ta)
        y = cy + tl * np.sin(ang) + yl * np.cos(ang) + u * np.cos(ta)
        inside = (x >= lo) & (x < hi) & (y >= lo) & (y < hi)
        xi = np.clip(x.astype(np.int32), 0, n - 1)
        yi = np.clip(y.astype(np.int32), 0, n - 1)
        bad = 1 - ok[yi, xi].mean(axis=(1, 2))
        hit = occ[yi // 2, xi // 2].any(axis=(1, 2)) | ~inside.all(axis=(1, 2))
        peak = world.peaks[yi, xi].mean(axis=(1, 2))
        river = world.river[yi, xi].mean(axis=(1, 2))
        dark = np.maximum(0, 120 - world.Y[yi, xi]).mean(axis=(1, 2))
        mount = world.mountain[yi, xi].mean(axis=(1, 2))
        d = np.hypot(C[:, 0] - ax, C[:, 1] - ay)
        s = 60 * bad + 25 * peak + spec.get('river_w', 2.0) * river + 0.03 * dark + 1.5 * mount
        s += (d / spec.get('reach', 260.0)) ** 2
        s += 0.6 * ((C[:, 2] - pref) / math.radians(10)) ** 2 + 0.06 * (C[:, 3] == 0)
        if sea:
            dl = world.dist_land[yi[:, :, J // 2], xi[:, :, J // 2]]
            s += np.std(dl, axis=1) / 30.0
            m = dl.mean(axis=1)
            s += (np.maximum(0, 60 - m) / 25) ** 2 + (np.maximum(0, m - 170) / 60) ** 2
        s[hit] = np.inf
        out[c0:c0 + 20000] = s
    return out


def shape_score(world, spec, it, pts, sea):
    """Shared by arcs and medial paths: chord angle near the preferred one, little turning, near the anchor,
    and for seas a steady distance from the coast."""
    n = world.n
    s = L.arclen(pts)
    x0, y0, x1, y1 = ink_box(it)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    ax, ay = spec['anchor'][0] * n, spec['anchor'][1] * n
    d = math.hypot(cx - ax, cy - ay)
    chord = pts[-1] - pts[0]
    ang = math.degrees(math.atan2(chord[1], chord[0]))
    dev = min(abs(ang - p) if a0 - 4 <= ang <= a1 + 4 else 999 for a0, a1, p in spec.get('angles', [(-10, 10, 0)]))
    if dev > 900:
        return INVALID
    t = np.diff(pts, axis=0)
    th = np.unwrap(np.arctan2(t[:, 1], t[:, 0]))
    turn = float(np.abs(np.diff(th)).sum())
    out = 0.6 * (dev / 10) ** 2 + 0.8 * max(turn - 0.35, 0) + (d / spec.get('reach', 260.0)) ** 2
    if sea:
        xi = np.clip(pts[:, 0].astype(int), 0, n - 1)
        yi = np.clip(pts[:, 1].astype(int), 0, n - 1)
        dl = world.dist_land[yi, xi]
        out += float(np.std(dl)) / 30.0 + (max(0, 60 - dl.mean()) / 25) ** 2 + (max(0, dl.mean() - 170) / 60) ** 2
    return out


def exact_score(world, spec, it, sea):
    cost, det = world.evaluate(it, 'sea' if sea else 'land', gap=12, river_w=spec.get('river_w', 2.0),
                               contrast_w=0.0 if sea else 0.06, ythr=125, near_r=24, margin=10)
    if cost >= INVALID or det['wrong'] > 0.002:          # region and sea names keep 10 px off the shore
        return INVALID, det
    cost += 3.0 * det['steep']
    ink = it.a > 0.06
    reg = world.region[it.y0:it.box[3], it.x0:it.box[2]]
    outside = float((ink & ~np.isin(reg, spec['allow'])).sum() / max(ink.sum(), 1))
    return cost + 60 * outside, dict(det, outside=outside)


def text_window(pts, length):
    """The part of a path the text covers when centred on it."""
    s = L.arclen(pts)
    m = s[-1] / 2
    keep = (s >= m - length / 2) & (s <= m + length / 2)
    return pts[keep] if keep.sum() >= 2 else pts


def arc_candidates(world, spec, style, length, hgt, sea):
    allow = np.isin(world.region, spec['allow'])
    ys, xs = np.nonzero(allow[::4, ::4])
    x0, x1, y0, y1 = xs.min() * 4, xs.max() * 4, ys.min() * 4, ys.max() * 4
    step = ARC['step']
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1, step), np.arange(y0, y1 + 1, step))
    gx, gy = gx.ravel(), gy.ravel()
    keep = allow[gy.clip(0, world.n - 1), gx.clip(0, world.n - 1)]
    gx, gy = gx[keep], gy[keep]
    angs, prefs = [], []
    for a0, a1, pref in spec.get('angles', [(-10, 10, 0)]):
        for a in np.arange(a0, a1 + 0.1, 2.0):
            angs.append(math.radians(a))
            prefs.append(math.radians(pref))
    bows = np.array(spec.get('bows', [-0.07, -0.035, 0.0, 0.035, 0.07])) * length
    C = np.array([(x, y, a, b, p) for x, y in zip(gx, gy) for a, p in zip(angs, prefs) for b in bows], np.float64)
    sc = ribbon_scores(world, spec, C, length, hgt, sea)
    # refine round the best coarse arcs: 4 px, 1 degree, finer bows
    fine = []
    for i in np.argsort(sc)[:12]:
        if not np.isfinite(sc[i]):
            break
        cx, cy, ang, bow, pref = C[i]
        for dx in (-8, -4, 0, 4, 8):
            for dy in (-8, -4, 0, 4, 8):
                for da in (-2, -1, 0, 1, 2):
                    a2 = ang + math.radians(da)
                    if not any(math.radians(a0) <= a2 <= math.radians(a1) for a0, a1, _ in spec['angles']):
                        continue
                    for db in (-0.02, 0.0, 0.02):
                        fine.append((cx + dx, cy + dy, a2, bow + db * length, pref))
    if fine:
        F = np.array(fine, np.float64)
        C = np.vstack([C, F])
        sc = np.concatenate([sc, ribbon_scores(world, spec, F, length, hgt, sea)])
    out = []
    for i in np.argsort(sc)[:ARC['shortlist']]:
        if not np.isfinite(sc[i]):
            break
        cx, cy, ang, bow, _ = C[i]
        out.append((arc_pts(cx, cy, ang, bow, length + 60, 120), 'arc'))
    return out


def region_label(world, spec):
    """Region or sea name: gentle arcs at up to three letter-spacings; the best on its real ink."""
    base, text, sea = spec['style'], spec['text'], spec.get('sea', False)
    tracks = spec.get('tracks', [STYLE[base]['track']])
    best = None
    stats = {}
    for k, tr in enumerate(tracks):
        style = '%s@%d' % (base, k)
        STYLE[style] = dict(STYLE[base], track=tr, px=spec.get('px', STYLE[base]['px']))
        length = L.text_length(text, style)
        hgt = text_height(text, style) + 6
        for pts, how in arc_candidates(world, spec, style, length, hgt, sea):
            it = L.render_path(spec['key'], text, style, pts, kind='sea' if sea else 'region')
            st = stats.setdefault(how, [0, 0, 1e9, 1e9])
            st[0] += 1
            cost, det = exact_score(world, spec, it, sea)
            if cost >= INVALID:
                continue
            shp = shape_score(world, spec, it, text_window(pts, length), sea)
            if shp >= INVALID:
                continue
            tot = cost + shp + 0.3 * k
            st[1] += 1
            if tot < st[2]:
                st[2], st[3] = tot, shp
            if best is None or tot < best[1]:
                chord = pts[-1] - pts[0]
                det = dict(det, how=how, track=tr, shape=round(shp, 3),
                           angle=round(math.degrees(math.atan2(chord[1], chord[0])), 1))
                best = (it, tot, det)
    print('      %s: ' % spec['key'] + ', '.join('%s %d tried %d valid best %.2f (shape %.2f)' % (h, *v)
                                                  for h, v in stats.items()), flush=True)
    if best is None:
        return None, None
    return best[0], dict(best[2], total=round(best[1], 3))


# ------------------------------------------------------------------ river --
def border_line(world):
    trace = json.load(open(os.path.join(TERRAIN, 'rivers.json'), encoding='utf-8'))['rivers']['border_river']['pts']
    tr = np.array([[u * world.n, v * world.n] for u, v, _ in trace])
    best, best_hits = None, -1
    for sm, w in world.river_lines:
        if len(sm) < 10:
            continue
        d = np.hypot(sm[:, None, 0] - tr[None, :, 0], sm[:, None, 1] - tr[None, :, 1]).min(axis=1)
        hits = int((d < 8).sum())
        if hits > best_hits:
            best, best_hits = (sm, w), hits
    return best


def resample(pts, step=3.0):
    s = L.arclen(pts)
    q = np.arange(0, s[-1], step)
    return np.stack([np.interp(q, s, pts[:, 0]), np.interp(q, s, pts[:, 1])], 1)


def smooth(pts, win):
    if win < 2:
        return pts
    k = np.ones(win) / win
    p = np.pad(pts, ((win // 2, win - 1 - win // 2), (0, 0)), mode='edge')
    return np.stack([np.convolve(p[:, 0], k, 'valid'), np.convolve(p[:, 1], k, 'valid')], 1)


def readable(pts):
    """Orient a path so the text reads left to right, or bottom to top when it runs nearly north-south."""
    d = pts[-1] - pts[0]
    if abs(d[0]) > abs(d[1]) * 0.45:
        return pts if d[0] > 0 else pts[::-1]
    return pts if d[1] < 0 else pts[::-1]


def river_label(world, spec):
    sm, w = border_line(world)
    pts = resample(sm, 3.0)
    s = L.arclen(pts)
    length = L.text_length(spec['text'], spec['style'])
    hgt = text_height(spec['text'], spec['style'])
    best = None
    for s0 in np.arange(60, s[-1] - length - 80, 12):
        seg = pts[(s >= s0) & (s <= s0 + length + 30)]
        if len(seg) < 8:
            continue
        sm2 = smooth(seg, 17)
        tang = np.gradient(sm2, axis=0)
        tang /= np.maximum(np.hypot(tang[:, 0], tang[:, 1]), 1e-9)[:, None]
        nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
        turn = np.abs(np.diff(np.unwrap(np.arctan2(tang[:, 1], tang[:, 0])))).sum()
        for side in (-1, 1):
            off = 2.0 + spec['gap'] + hgt * 0.55
            path = readable(sm2 + nrm * off * side)
            it = L.render_path(spec['key'], spec['text'], spec['style'], path, kind='hydro')
            cost, det = world.evaluate(it, 'land', gap=5, river_w=40.0)
            if cost >= INVALID:
                continue
            mid = abs((s0 + length / 2) / s[-1] - 0.6)
            tot = cost + 1.2 * turn + 2.0 * mid
            if best is None or tot < best[1]:
                best = (it, tot, dict(det, s0=int(s0), side=side, turn=round(float(turn), 2)))
    return (best[0], best[2]) if best else (None, None)


# ------------------------------------------------------------------- lake --
def lake_label(world, spec):
    m = world.lake_id == spec['lake_id']
    ys, xs = np.nonzero(m)
    rows = np.unique(ys)
    cx = np.array([xs[ys == r].mean() for r in rows])
    width = np.array([(ys == r).sum() for r in rows])
    use = width >= 8
    poly = np.polyfit(rows[use], cx[use], 2, w=width[use])
    length = L.text_length(spec['text'], spec['style'])
    yc = float(np.average(rows, weights=width))
    best = None
    for dy in range(-36, 37, 6):
        for dx in (-6, -3, 0, 3, 6):
            yy = np.linspace(yc + dy + length / 2 + 30, yc + dy - length / 2 - 30, 60)
            path = np.stack([np.polyval(poly, yy) + dx, yy], 1)
            it = L.render_path(spec['key'], spec['text'], spec['style'], readable(path), kind='hydro')
            cost, det = world.evaluate(it, spec['lake_id'], gap=4, river_w=0.0, contrast_w=0.0)
            if cost >= INVALID:
                continue
            tot = cost + 0.02 * abs(dy) + 0.05 * abs(dx)
            if best is None or tot < best[1]:
                best = (it, tot, dict(det, dy=dy, dx=dx))
    return (best[0], best[2]) if best else (None, None)
