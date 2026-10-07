"""Sea, shoreline and lakes for the atlas painter.

- The shoreline gets a small fractal edge (coves and points, a few rocks off rocky headlands): stronger on the
  high rock coasts, gentle on the low shores. No outline stroke.
- The sea colour is a continuous ramp of a depth proxy z: distance from a generalised coast divided by the
  local shelf width (wide off low shores and in sheltered bays, narrow under cliffs), plus a cliff term so the
  water is already deep at the foot of the cliffs and in the fjords. Island chains share a shallow shelf.
- Faint broken surf on exposed shores only, mudflats at the estuary and the delta, slow water variation."""
import math

import numpy as np

from config import SEA, COAST, LAKE, SEED
from fields import (blur, fbm, ridged, smoothstep, chamfer_distance, distance_px, contour_sdf, lerp_rgb,
                    norm_blur, lambert, light_vec)


def unit(a):
    return (a - a.mean()) / max(float(a.std()), 1e-6)


def signed_distance(h, sea, cap=24):
    """Signed distance to the shore in px (+ land), subpixel near the shore."""
    land = h > sea
    d_out = chamfer_distance(land, cap)
    d_in = chamfer_distance(~land, cap)
    sd = np.where(land, d_in - 0.5, 0.5 - d_out)
    c = contour_sdf(h, sea)
    return np.where((np.abs(c) < 1.5) & (np.abs(sd) < 2.0), c, sd).astype(np.float32)


def coast_rock(land, h):
    """0 = low shore, 1 = high rocky coast (the mean height of the land within about 80 px), defined everywhere."""
    lf = land.astype(np.float32)
    coast_h = blur(np.where(land, h, 0), 40) / np.maximum(blur(lf, 40), 1e-3)
    return smoothstep(COAST['rock_from'][0], COAST['rock_from'][1], coast_h)


def fractal_coast(sd, rock, land, n, calm):
    """Perturb the signed distance near the shore; add a few rocks off rocky headlands. Returns (sd, rocks).
    calm (0..1) holds the edge still (river mouths); narrow water and thin land are perturbed less, so fjords
    stay open and slim headlands stay attached."""
    C = COAST
    nz = unit(0.65 * fbm(n, *C['cells'], SEED + 300) + 0.35 * fbm(n, *C['fine_cells'], SEED + 301))
    rd = unit(ridged(n, *C['ridge_cells'], SEED + 302))
    rough = (1 - rock) * nz + rock * (0.45 * nz + 0.55 * rd)
    amp = C['amp_low'] + (C['amp_rock'] - C['amp_low']) * rock
    lf = blur(land.astype(np.float32), 5)
    own = np.where(sd >= 0, lf, 1 - lf)
    guard = 0.30 + 0.70 * smoothstep(0.40, 0.66, own)
    near = 1 - smoothstep(C['near_px'] * 0.5, C['near_px'], np.abs(sd))
    out = sd + amp * rough * near * guard * (1 - calm)
    # rocks: off narrow, high headlands only (convex coast), a few px out to sea, no single-pixel specks
    convex = 1 - blur(land.astype(np.float32), 14)
    head = smoothstep(0.58, 0.74, convex) * smoothstep(0.5, 0.9, rock)
    rk = unit(fbm(n, 150, 2, SEED + 303))
    zone = (sd < -C['rock_px'][0]) & (sd > -C['rock_px'][1]) & (head > 0.3)
    level = np.quantile(rk[zone], 1 - C['rocks']) if zone.any() else 9.0
    blob = (rk > level) & zone
    blob = blur(blob.astype(np.float32), 1.4) > 0.5
    rock_sd = np.where(blob, (rk - level) * 6.0 + 0.6, -9.0)
    out = np.maximum(out, rock_sd)
    new = (out > 0) & ~land
    bits = new & (blur(new.astype(np.float32), 2.0) < 0.45) & ~blob
    gone = land & (out <= 0) & (blur(((out <= 0) & land).astype(np.float32), 2.0) < 0.45)
    out = np.where(bits, -0.6, np.where(gone, 0.6, out))
    # keep the edge anti-aliased: a signed distance must not change faster than 1 per px
    gy, gx = np.gradient(blur(out, 0.6))
    out = out / np.maximum(np.hypot(gx, gy), 1.0)
    # last sweep: faint isolated land pixels off the shore (partial coverage the steps above leave behind)
    iso = (out > -0.5) & ~blob & (blur((out > 0).astype(np.float32), 2.5) < 0.22)
    return np.where(iso, -0.6, out), blob


def land_colour_outward(col, land_a0, land_a, rocks):
    """Colour for land that the fractal edge added (taken from the nearby shore) with a little relief of its own."""
    close, far = norm_blur(col, land_a0, 2.5), norm_blur(col, land_a0, 9.0)
    ext = lerp_rgb(far, close, smoothstep(0.03, 0.25, blur(land_a0, 2.5)))
    out = lerp_rgb(ext, col, land_a0)
    # rocks: a lit warm-grey stone with a shaded south-east side (the rest of the new edge keeps the shore colour)
    rk = blur(rocks.astype(np.float32), 0.8)
    out = lerp_rgb(out, np.array(COAST['rock_rgb'], np.float32), rk * 0.6)
    gy, gx = np.gradient(blur(land_a, 1.1) * 2.2)
    shade = lambert(gx, gy) / light_vec()[2] - 1
    return out * (1 + 0.45 * rk * shade)[..., None]


def carry(val, near, sigma):
    """Carry a value set along the shore out over the whole sea: near the shore at sigma, far out at a broad
    scale, blended so the field is smooth and defined everywhere."""
    nf = near.astype(np.float32)
    wt = blur(nf, sigma)
    close = norm_blur(val, nf, sigma)
    far = norm_blur(val, nf, sigma * 4)
    a = smoothstep(0.002, 0.03, wt)
    return far + (close - far) * a


def travel(mask, W, n, work=512, iters=300):
    """Shelf depth as travel time from the coast: distance accumulated at 1 / local shelf width. It always grows
    away from the coast (a plain distance divided by a blurred width can rise and fall again, drawing rings)."""
    from PIL import Image
    small = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((work, work), Image.BOX)) > 127
    cost = 1.0 / np.maximum(np.asarray(Image.fromarray(W.astype(np.float32), 'F').resize((work, work), Image.BILINEAR)), 1.0)
    cost = cost * (n / work)
    d = np.where(small, 0.0, 1e6).astype(np.float32)
    steps = [(0, 1, 1.0), (0, -1, 1.0), (1, 0, 1.0), (-1, 0, 1.0),
             (1, 1, 1.4142), (1, -1, 1.4142), (-1, 1, 1.4142), (-1, -1, 1.4142)]
    cp = np.pad(cost, 1, mode='edge')
    for _ in range(iters):
        p = np.pad(d, 1, mode='edge')
        new = d
        for dj, di, w in steps:
            c2 = cp[1 + dj:1 + dj + work, 1 + di:1 + di + work]
            new = np.minimum(new, p[1 + dj:1 + dj + work, 1 + di:1 + di + work] + w * 0.5 * (cost + c2))
        if np.allclose(new, d):
            break
        d = new
    return np.asarray(Image.fromarray(np.minimum(d, 50.0).astype(np.float32), 'F').resize((n, n), Image.BILINEAR))


def sea_colour(land_a, rock, n, P):
    S = SEA
    land = land_a > 0.5
    lf = land.astype(np.float32)
    general = blur(lf, S['general_sigma']) > S['general_level']
    d_gen = distance_px(general, n)
    d_true = distance_px(land, n, work=1024, iters=60)
    near = (blur(lf, 4) > 0.02) & (blur(general.astype(np.float32), 8) > 0.02)   # mainland shores only
    # shelf width and cliffiness, set along the shore and carried out over the sea
    expo = smoothstep(0.45, 0.80, 1 - blur(lf, 60))           # 0 in bays, 1 off exposed points
    w0 = (S['shelf_low'] + (S['shelf_cliff'] - S['shelf_low']) * rock) * (1 + S['shelf_noise'] * fbm(n, 4, 3, SEED + 23))         * (S['bay_wide'] - (S['bay_wide'] - S['point_narrow']) * expo)
    W = np.maximum(carry(w0, near, 34), S['shelf_cliff'])
    rc = carry(rock, near, 26)
    z = np.maximum(travel(general, W, n), 0.35 * d_true / W) + S['cliff_depth'] * rc
    # islands keep a small shelf; chains of islands share one
    isl = land & (blur(general.astype(np.float32), 6) < 0.05)
    d_isl = distance_px(isl, n, work=1024, iters=60) if isl.any() else np.full((n, n), 1e3, np.float32)
    z_isl = d_isl / S['isle_shelf'] + 0.35
    chain = smoothstep(0.0, S['chain_full'], blur(isl.astype(np.float32), S['chain_px']))
    z_chain = 9.0 + (S['chain_z'] - 9.0) * chain
    z = np.minimum(np.minimum(z, z_isl), z_chain)
    z = z + S['wobble'] * fbm(n, 20, 3, SEED + 22) * smoothstep(0.4, 1.2, z)
    out = np.empty((n, n, 3), np.float32)
    for k in range(3):
        out[..., k] = np.interp(z, S['z'], [c[k] for c in S['colours']])
    (f0, f1), frgb = S['far']
    out = lerp_rgb(out, np.array(frgb, np.float32), smoothstep(f0, f1, d_gen) * 0.8)
    out = out * (1 + S['variation'] * fbm(n, 4, 4, SEED + 24) + S['texture'] * fbm(n, 40, 3, SEED + 21))[..., None]
    # faint, broken surf on the exposed shores (not in bays)
    exposed = smoothstep(0.55, 0.80, 1 - blur(lf, 50))
    brk = smoothstep(-0.25, 0.45, fbm(n, 90, 2, SEED + 25))
    surf = S['surf'] * np.exp(-d_true / S['surf_px']) * exposed * brk * (~land)
    out = lerp_rgb(out, np.array(S['surf_rgb'], np.float32), surf)
    # mudflats where the big rivers meet the sea
    jj, ii = np.mgrid[0:n, 0:n].astype(np.float32)
    mud_n = smoothstep(-0.3, 0.5, fbm(n, 70, 3, SEED + 26))
    for key in S['mud_keys']:
        p = P.get(key)
        if not p:
            continue
        r = np.hypot(ii / n - p['u'], jj / n - p['v']) / S['mud_r']
        m = S['mud'] * (1 - smoothstep(0.5, 1.0, r)) * np.exp(-d_true / S['mud_px']) * (0.45 + 0.55 * mud_n) * (~land)
        out = lerp_rgb(out, np.array(S['mud_rgb'], np.float32), m)
    return out


def lake_colour(lake, n):
    L = LAKE
    lake_in = chamfer_distance(~lake, 24)
    idx = np.interp(lake_in, L['bands_px'], np.arange(len(L['bands_px']), dtype=np.float32))
    base = np.floor(idx)
    q = base + smoothstep(0.5, 1.0, idx - base)
    out = np.empty((n, n, 3), np.float32)
    for k in range(3):
        out[..., k] = np.interp(q, np.arange(len(L['colours'])), [c[k] for c in L['colours']])
    return lerp_rgb(out, np.array(L['rim_rgb'], np.float32), L['rim'] * np.exp(-lake_in / 1.3))
