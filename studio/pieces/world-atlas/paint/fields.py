"""Generic raster helpers for the atlas painter: blurs, noise, ramps, distances, Voronoi cells, light.
Pillow + numpy only. Every function is deterministic for a given seed."""
import math

import numpy as np
from PIL import Image

from config import LIGHT


def box1d(a, r, axis):
    if r < 1:
        return a
    pad = [(0, 0), (0, 0)]
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='reflect'), axis=axis, dtype=np.float64)
    w = 2 * r + 1
    out = c[w:] - c[:-w] if axis == 0 else c[:, w:] - c[:, :-w]
    return (out / w).astype(np.float32)


def blur(a, sigma):
    """Gaussian approximated by three box passes (separable, reflected edges)."""
    if sigma <= 0.2:
        return a.astype(np.float32)
    n = 3
    wl = int(math.floor(math.sqrt(12 * sigma * sigma / n + 1)))
    wl -= (wl % 2 == 0)
    m = round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4))
    out = a.astype(np.float32)
    for k in range(n):
        r = ((wl if k < m else wl + 2) - 1) // 2
        out = box1d(box1d(out, r, 0), r, 1)
    return out


def norm_blur(val, weight, sigma):
    """Weighted blur: carries values into places where weight is 0 (e.g. land colour out over the shore)."""
    w = blur(weight.astype(np.float32), sigma)
    if val.ndim == 3:
        return np.stack([blur(val[..., k] * weight, sigma) for k in range(val.shape[2])], -1) / np.maximum(w, 1e-4)[..., None]
    return blur(val * weight, sigma) / np.maximum(w, 1e-4)


def min_filter(a, r):
    """Separable square minimum filter of radius r (px)."""
    out = a
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (r, r)
        p = np.pad(out, pad, mode='edge')
        n = out.shape[axis]
        acc = None
        for k in range(2 * r + 1):
            sl = p[k:k + n] if axis == 0 else p[:, k:k + n]
            acc = sl if acc is None else np.minimum(acc, sl)
        out = acc
    return out


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def fbm(n, base_cells, octaves, seed, persistence=0.5):
    """Smooth value-noise fbm in about -1..1 (bicubic-upsampled random lattices)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((n, n), np.float32)
    amp, total, cells = 1.0, 0.0, base_cells
    for _ in range(octaves):
        g = rng.random((cells + 1, cells + 1)).astype(np.float32)
        layer = np.asarray(Image.fromarray(g, 'F').resize((n, n), Image.BICUBIC))
        out += amp * (layer - 0.5) * 2
        total += amp
        amp *= persistence
        cells *= 2
    return out / total


def ridged(n, base_cells, octaves, seed):
    """Ridged noise in 0..1: sharp crests where a smooth fbm crosses zero (points and coves on a rock coast)."""
    return 1 - np.abs(fbm(n, base_cells, octaves, seed)) * 2.2


def lerp_rgb(a, b, t):
    return a + (b - a) * t[..., None]


def ramp(x, stops):
    xs = np.array([s[0] for s in stops], np.float32)
    out = np.empty(x.shape + (3,), np.float32)
    for k in range(3):
        out[..., k] = np.interp(x, xs, [s[1][k] for s in stops])
    return out


def chamfer_distance(mask, iters):
    """Distance (cells) to the nearest True cell, by iterated 8-neighbour relaxation (capped at iters)."""
    d = np.where(mask, 0.0, 1e6).astype(np.float32)
    steps = [(0, 1, 1.0), (0, -1, 1.0), (1, 0, 1.0), (-1, 0, 1.0),
             (1, 1, 1.4142), (1, -1, 1.4142), (-1, 1, 1.4142), (-1, -1, 1.4142)]
    n = d.shape[0]
    for _ in range(iters):
        p = np.pad(d, 1, mode='edge')
        new = d
        for dj, di, w in steps:
            new = np.minimum(new, p[1 + dj:1 + dj + n, 1 + di:1 + di + n] + w)
        if np.array_equal(new, d):
            break
        d = new
    return np.minimum(d, iters * 1.5)


def resize_f(a, n):
    return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((n, n), Image.BILINEAR))


def distance_px(mask, n, work=512, iters=200):
    """Approximate Euclidean distance in px of an n grid, computed on a coarser work grid."""
    small = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((work, work), Image.BOX)) > 127
    d = chamfer_distance(small, iters) * (n / work)
    return resize_f(d, n)


def warp(img, dx, dy):
    n = img.shape[0]
    jj, ii = np.mgrid[0:n, 0:n]
    j2 = np.clip((jj + dy).round().astype(np.int32), 0, n - 1)
    i2 = np.clip((ii + dx).round().astype(np.int32), 0, n - 1)
    return img[j2, i2]


def bbox_of(mask, n, pad=8):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return None
    return (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, n), min(ys.max() + pad, n))


def hash01(ci, cj, salt):
    x = (ci.astype(np.uint32) * np.uint32(73856093)) ^ (cj.astype(np.uint32) * np.uint32(19349663)) ^ np.uint32(salt)
    x = x ^ (x >> np.uint32(13))
    x = x * np.uint32(0x5BD1E995)
    x = x ^ (x >> np.uint32(15))
    return (x & np.uint32(0xFFFFFF)).astype(np.float32) / float(0xFFFFFF)


def voronoi_cells(box, cell_px, stretch, angle_deg, salt=0, offset=None):
    """Anisotropic jittered Voronoi inside box. Returns cell ids, the distance to the cell edge (px), the pixel
    coordinates and each pixel's cell centre in pixels. offset = (dx, dy) arrays that warp the lookup, so the
    cell edges wander instead of running straight."""
    x0, y0, x1, y1 = box
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    wx, wy = (xx, yy) if offset is None else (xx + offset[0], yy + offset[1])
    a = math.radians(angle_deg)
    ca, sa = math.cos(a), math.sin(a)
    xr = (wx * ca + wy * sa) / cell_px
    yr = (-wx * sa + wy * ca) / (cell_px * stretch)
    gi, gj = np.floor(xr).astype(np.int32), np.floor(yr).astype(np.int32)
    d1 = np.full(xr.shape, 9.0, np.float32)
    d2 = np.full(xr.shape, 9.0, np.float32)
    cid_i = np.zeros(xr.shape, np.int32)
    cid_j = np.zeros(xr.shape, np.int32)
    sx = np.zeros(xr.shape, np.float32)
    sy = np.zeros(xr.shape, np.float32)
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            ci, cj = gi + di, gj + dj
            px = ci + 0.1 + 0.8 * hash01(ci, cj, 11 + salt)
            py = cj + 0.1 + 0.8 * hash01(ci, cj, 23 + salt)
            d = np.sqrt((xr - px) ** 2 + (yr - py) ** 2)
            closer = d < d1
            d2 = np.where(closer, d1, np.minimum(d2, d))
            d1 = np.where(closer, d, d1)
            cid_i = np.where(closer, ci, cid_i)
            cid_j = np.where(closer, cj, cid_j)
            sx = np.where(closer, px, sx)
            sy = np.where(closer, py, sy)
    edge_px = (d2 - d1) * cell_px * stretch * 0.5
    # seed back to pixels (inverse rotation)
    ux, uy = sx * cell_px, sy * cell_px * stretch
    cx, cy = ux * ca - uy * sa, ux * sa + uy * ca
    return cid_i, cid_j, edge_px, xx, yy, cx, cy


def contour_angle(h, sigma):
    """Direction along the contours of a smoothed field (radians) and the slope strength."""
    hs = blur(h, sigma)
    gy, gx = np.gradient(hs)
    return np.arctan2(gy, gx) + math.pi / 2, np.hypot(gx, gy)


def light_vec():
    az, alt = math.radians(LIGHT['azimuth']), math.radians(LIGHT['altitude'])
    return math.sin(az) * math.cos(alt), -math.cos(az) * math.cos(alt), math.sin(alt)


def lambert(gx, gy):
    lx, ly, lz = light_vec()
    norm = np.sqrt(gx * gx + gy * gy + 1.0)
    return (-gx * lx - gy * ly + lz) / norm


def contour_sdf(field, level, sigma=0.7):
    """Signed distance in px to the level contour of a smooth field (positive above the level); valid near it."""
    f = blur(field, sigma)
    gy, gx = np.gradient(f)
    g = np.maximum(np.hypot(gx, gy), 1e-4)
    return (f - level) / g
