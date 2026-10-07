"""Land cover for the atlas painter: wheat, field parcels, the battlefield heath, volcanoes, meadows, forests."""
import math

import numpy as np

from config import SEED, WHEAT, HEDGE, HEATH, VOLCANO, MEADOWS, FOREST
from fields import (blur, fbm, smoothstep, warp, bbox_of, hash01, voronoi_cells, contour_angle, lerp_rgb,
                    norm_blur, distance_px, lambert, light_vec)


def sub(a, box):
    x0, y0, x1, y1 = box
    return a[y0:y1, x0:x1]


def block_angle(ang_field, slope, cx, cy, box, default, flat_slope):
    """Angle per block: the field's angle at the block centre, the default where the ground is flat."""
    n = ang_field.shape[0]
    xi = np.clip(cx.astype(np.int32), 0, n - 1)
    yi = np.clip(cy.astype(np.int32), 0, n - 1)
    a, s = ang_field[yi, xi], slope[yi, xi]
    w = smoothstep(flat_slope * 0.5, flat_slope * 1.5, s)
    # blend angles through their doubled-angle vectors (a field direction has no sign)
    vx = w * np.cos(2 * a) + (1 - w) * math.cos(2 * default)
    vy = w * np.sin(2 * a) + (1 - w) * math.sin(2 * default)
    return 0.5 * np.arctan2(vy, vx)


def paint_wheat(col, t, river_a):
    """Furlongs of long thin strips running down the plain's gentle fall, very low contrast, organic edges.
    The wheat stops where the ground climbs out of the plain and leaves meadow strips along the rivers."""
    W = WHEAT
    n, h = t['n'], t['h']
    raw = t['wheat'].astype(np.float32) / 255
    w = blur(raw, 5)
    w = warp(w, fbm(n, 12, 3, SEED + 5) * 60, fbm(n, 12, 3, SEED + 6) * 60)
    lvl = norm_blur(h, (raw > 0.5).astype(np.float32), 30)
    w = w * (1 - smoothstep(W['contour'][0], W['contour'][1], h - lvl + 0.004 * fbm(n, 40, 3, SEED + 8)))
    w = w * (1 - W['river_gap'] * np.clip(blur(river_a, 4) * 2.5, 0, 1))
    box = bbox_of(w > 0.02, n)
    if box is None:
        return col, np.zeros_like(w)
    x0, y0, x1, y1 = box
    off = (sub(fbm(n, 40, 2, SEED + 9), box) * W['warp_px'], sub(fbm(n, 40, 2, SEED + 10), box) * W['warp_px'])
    ci, cj, edge, xx, yy, cx, cy = voronoi_cells(box, W['furlong_px'], W['stretch'], W['angle'], salt=100, offset=off)
    ang_f, slope = contour_angle(h, 28)
    base = block_angle(ang_f, slope, cx, cy, box, math.radians(W['angle'] + 90), 0.00012)
    turn = (hash01(ci, cj, 53) < W['turn']).astype(np.float32) * (math.pi / 2)
    ang = base + turn + (hash01(ci, cj, 59) - 0.5) * 2 * math.radians(W['jitter'])
    spx = W['strip_px'] * (1 + W['strip_var'] * (hash01(ci, cj, 61) - 0.3))
    s = ((xx + off[0]) * np.cos(ang) + (yy + off[1]) * np.sin(ang)) / spx + hash01(ci, cj, 67) * 50
    k = np.floor(s).astype(np.int32)
    cols = np.array(W['strip_colours'], np.float32)
    pick = (hash01(ci * 31 + k, cj * 17 - k, 71) * len(cols)).astype(np.int32) % len(cols)
    tint = np.array(W['tint'], np.float32)
    strip = tint + (cols[pick] - tint) * W['strip_mix']
    strip = strip * (1 + W['furrow'] * np.sin(2 * math.pi * s))[..., None]
    balk = np.clip(1 - edge / 0.9, 0, 1) * W['balk']
    strip = lerp_rgb(strip, np.array(W['balk_rgb'], np.float32), balk)
    wl = w[y0:y1, x0:x1]
    soft = smoothstep(W['edge'][0], W['edge'][1], wl)
    p = hash01(ci, cj, 37)
    whole = smoothstep(p * 0.7, p * 0.7 + 0.3, wl)
    a = soft * (1 - W['whole'] + W['whole'] * whole)
    sb = col[y0:y1, x0:x1]
    ground = sb + (tint - sb) * W['tint_mix']
    out = col.copy()
    out[y0:y1, x0:x1] = sb + (ground + (strip - ground) * 0.85 - sb) * a[..., None]
    full = np.zeros_like(w)
    full[y0:y1, x0:x1] = a
    return out, full


def paint_hedgerows(col, t, wheat_a, steep):
    """Enclosed fields on the open lowland, laid along the contours block by block, faint hedges, organic edges."""
    Hd = HEDGE
    n, region, hb, h = t['n'], t['region'], t['hb'], t['h']
    m = np.isin(region, Hd['regions']).astype(np.float32) * (1 - smoothstep(Hd['top'] - 0.04, Hd['top'] + 0.02, hb))
    m = m * (1 - np.clip(wheat_a * 2, 0, 1)) * t['land'] * ~t['lake']
    m = m * (1 - smoothstep(Hd['steep_off'][0], Hd['steep_off'][1], blur(steep, 3)))
    m = blur(m, 3) * (1 - Hd['patchy'] + Hd['patchy'] * smoothstep(-0.35, 0.35, fbm(n, 9, 3, SEED + 80)))
    box = bbox_of(m > 0.02, n)
    if box is None:
        return col
    x0, y0, x1, y1 = box
    off = (sub(fbm(n, 60, 2, SEED + 81), box) * Hd['warp_px'], sub(fbm(n, 60, 2, SEED + 82), box) * Hd['warp_px'])
    bi, bj, bedge, xx, yy, cx, cy = voronoi_cells(box, Hd['block_px'], Hd['stretch'], Hd['angle'], salt=200, offset=off)
    ang_f, slope = contour_angle(h, Hd['contour_px'])
    base = block_angle(ang_f, slope, cx, cy, box, math.radians(Hd['angle']), 0.00025)
    turn = (hash01(bi, bj, 91) < Hd['turn']).astype(np.float32) * (math.pi / 2)
    ang = base + turn + (hash01(bi, bj, 93) - 0.5) * 2 * math.radians(Hd['jitter'])
    fw = Hd['field_w'][0] + (Hd['field_w'][1] - Hd['field_w'][0]) * hash01(bi, bj, 95)
    fl = Hd['field_l'][0] + (Hd['field_l'][1] - Hd['field_l'][0]) * hash01(bi, bj, 97)
    px, py = xx + off[0] - cx, yy + off[1] - cy
    a = px * np.cos(ang) + py * np.sin(ang)
    b = -px * np.sin(ang) + py * np.cos(ang)
    s = a / fw + hash01(bi, bj, 99) * 10
    k = np.floor(s).astype(np.int32)
    tq = b / fl + hash01(bi * 7 + k, bj * 13 - k, 101) * 3
    m2 = np.floor(tq).astype(np.int32)
    fs, ft = s - k, tq - m2
    edge = np.minimum(np.minimum(np.minimum(fs, 1 - fs) * fw, np.minimum(ft, 1 - ft) * fl), bedge)
    fid_i, fid_j = bi * 131 + k * 7 + m2, bj * 71 - k + m2 * 3
    ml = m[y0:y1, x0:x1]
    tones = np.array(Hd['tones'], np.float32)
    pick = (hash01(fid_i, fid_j, 83) * len(tones)).astype(np.int32) % len(tones)
    sb = col[y0:y1, x0:x1]
    f = sb + (tones[pick] - sb) * Hd['tone_mix']
    f = f * (1 + Hd['tone'] * (hash01(fid_i, fid_j, 89) - 0.5) * 2)[..., None]
    line = np.clip(1 - edge / 0.7, 0, 1) * Hd['line']
    f = lerp_rgb(f, np.array(Hd['line_rgb'], np.float32), line)
    out = col.copy()
    out[y0:y1, x0:x1] = sb + (f - sb) * ml[..., None]
    return out


def paint_heath(col, t):
    """The Silent Battlefield as a blighted heath: dull olive-brown ground, heather stipple, scorched patches and a
    faint net of dry cracks. Its edge breaks up with noise and stops where the ground climbs (follows contours)."""
    H = HEATH
    n, hb, region = t['n'], t['hb'], t['region']
    m = blur((region == 12).astype(np.float32), 8)
    m = m + H['noise'] * (0.7 * fbm(n, 40, 3, SEED + 60) + 0.3 * fbm(n, 130, 2, SEED + 67)) * np.clip(m * (1 - m) * 4, 0, 1)
    w = smoothstep(H['edge'][0], H['edge'][1], m) * (1 - smoothstep(H['contour'][0], H['contour'][1], hb))
    box = bbox_of(w > 0.02, n)
    if box is None:
        return col, w
    x0, y0, x1, y1 = box
    wl = w[y0:y1, x0:x1]
    sb = col[y0:y1, x0:x1]
    g = sb + (np.array(H['rgb'], np.float32) - sb) * H['mix']
    patch = sub(fbm(n, 30, 4, SEED + 61), box)
    g = lerp_rgb(g, np.array(H['scorch'], np.float32), smoothstep(0.05, 0.40, patch) * H['scorch_mix'])
    g = lerp_rgb(g, np.array(H['pale'], np.float32), smoothstep(0.10, 0.45, -patch) * 0.25)
    tuft = sub(fbm(n, *H['tuft_cells'], SEED + 62), box)
    g = lerp_rgb(g, np.array(H['dark'], np.float32), smoothstep(0.05, 0.45, tuft) * H['dark_mix'])
    g = g * (1 + H['stipple'] * sub(fbm(n, 900, 1, SEED + 63), box))[..., None]
    off = (sub(fbm(n, 70, 2, SEED + 64), box) * 6, sub(fbm(n, 70, 2, SEED + 65), box) * 6)
    _, _, edge, _, _, _, _ = voronoi_cells(box, H['crack_px'], 0.9, 30.0, salt=400, offset=off)
    crack = np.clip(1 - edge / 0.75, 0, 1) * H['crack'] * smoothstep(-0.2, 0.3, sub(fbm(n, 50, 2, SEED + 66), box))
    g = lerp_rgb(g, np.array(H['crack_rgb'], np.float32), crack)
    out = col.copy()
    out[y0:y1, x0:x1] = sb + (g - sb) * wl[..., None]
    return out, w


def paint_meadows(col, n, P):
    jj, ii = np.mgrid[0:n, 0:n].astype(np.float32)
    nz = fbm(n, 20, 3, SEED + 7)
    for key, rgb, alpha in MEADOWS:
        p = P.get(key)
        if not p:
            continue
        d = np.hypot(ii / n - p['u'], jj / n - p['v']) / p.get('r', 0.02) + 0.35 * nz
        col = lerp_rgb(col, np.array(rgb, np.float32), alpha * (1 - smoothstep(0.6, 1.1, d)))
    return col


def paint_volcano(col, h, n, cones):
    """Dark basalt cones with ash on their flanks and one lava field running down from the main crater.
    Returns the colour and a mask where snow is suppressed (warm ground)."""
    V = VOLCANO
    jj, ii = np.mgrid[0:n, 0:n].astype(np.float32)
    basalt = np.zeros((n, n), np.float32)
    ash = np.zeros((n, n), np.float32)
    lava = np.zeros((n, n), np.float32)
    rough = fbm(n, 120, 3, SEED + 70)
    main = max(cones, key=lambda c: c['crater']) if cones else None
    for c in cones:
        u, v = c['at']
        r = c['r']
        du, dv = ii / n - u, jj / n - v
        d = np.hypot(du, dv)
        basalt = np.maximum(basalt, 1 - smoothstep(r * 0.30, r * 1.05, d))
        streak = 0.5 + 0.5 * np.sin(np.arctan2(dv, du) * 9 + 3 * fbm(n, 30, 2, SEED + 71))
        ash = np.maximum(ash, (1 - smoothstep(r * 0.7, r * 1.7, d)) * smoothstep(0.35, 0.8, d / r) * streak)
        if c is main and c['crater'] > 0:
            a = math.radians(V['lava_dir'])
            along = (du * math.cos(a) + dv * math.sin(a)) / r
            across = (-du * math.sin(a) + dv * math.cos(a)) / r
            half = 0.30 * (1 - 0.4 * np.clip(along / V['lava_len'], 0, 1)) + 0.12 * rough
            lava = np.maximum(lava, smoothstep(0.15, 0.35, along) * (1 - smoothstep(V['lava_len'] * 0.8, V['lava_len'], along))
                              * (1 - smoothstep(half * 0.7, half, np.abs(across + 0.10 * np.sin(along * 3.0)))))
    hot = smoothstep(0.26, 0.36, h)
    col = lerp_rgb(col, np.array(V['ash'], np.float32), ash * V['ash_mix'] * hot)
    col = lerp_rgb(col, np.array(V['basalt'], np.float32), basalt * V['basalt_mix'] * hot)
    lava_t = np.array(V['lava'], np.float32) * (1 + 0.10 * fbm(n, 300, 2, SEED + 72))[..., None]
    col = lerp_rgb(col, lava_t, blur(lava, 1.0) * V['lava_mix'])
    return col, np.clip(basalt * V['snow_off'], 0, 1)


# ---------------------------------------------------------------- forests --
def forest_layers(t, wheat_a, terms, river_a):
    """Forest masses that follow the rivers and lower valley sides, feathered into single trees at the edge."""
    F = FOREST
    n, hb, region, ftype = t['n'], t['hb'], t['region'], t['ftype']
    rng = np.random.default_rng(SEED + 11)
    dens = t['forest'].astype(np.float32) / 255
    grove = blur((ftype == 4).astype(np.float32), 5)
    dens = dens * (1 - 0.3 * grove) + grove * F['grove_noise'] * fbm(n, 96, 3, SEED + 17)
    dens = warp(dens, fbm(n, 32, 3, SEED + 15) * F['warp_px'], fbm(n, 32, 3, SEED + 16) * F['warp_px'])
    dens = blur(dens, F['unify'])
    for rid, add in F['region_dens'].items():
        dens = dens + add * blur((region == rid).astype(np.float32), 10) * smoothstep(0.10, 0.30, dens)
    dens = dens * (1 - smoothstep(F['treeline'] - 0.05, F['treeline'] + 0.03, hb))
    dens = dens * (1 - np.clip(wheat_a * 1.5, 0, 1)) * (1 - np.clip(blur(t['snow'], 3) * 3, 0, 1))
    _, _, steep, _, _, _ = terms
    rip = np.exp(-distance_px(river_a > 0.3, n, work=512, iters=40) / F['riparian_px'])
    st = blur(steep, 4)
    lower = smoothstep(0.06, 0.25, st) * (1 - smoothstep(0.02, 0.06, t['rel']))
    tops = (1 - smoothstep(0.04, 0.12, st)) * smoothstep(0.02, 0.05, t['rel'])
    m = dens * (F['riparian_scale'][0] + F['riparian_scale'][1] * rip) + F['riparian'] * rip         + F['lower_slope'] * lower - F['open_tops'] * tops
    m = m * (dens > 0.04)
    m = m + F['edge_mid'] * fbm(n, 24, 4, SEED + 12) + F['edge_fine'] * fbm(n, 256, 2, SEED + 13)
    core = smoothstep(F['level'] - 0.04, F['level'] + 0.04, m)
    core = core * smoothstep(0.32, 0.52, blur(core, F['min_px']))
    wide = smoothstep(F['level'] - F['fringe'], F['level'], m)
    wide = wide * np.clip(blur(core, F['fringe_px']) * 3, 0, 1)
    park = smoothstep(0.12, 0.38, dens) * (1 - wide)
    crown = crown_field(n, wide, core, rng)
    top = np.clip(crown / (F['crown_px'] * 0.8), 0, 1)
    mass = np.maximum(blur(core, 0.6), np.clip(crown / 0.7, 0, 1) * wide)
    gy, gx = np.gradient(crown * F['crown_relief'])
    canopy = (lambert(gx, gy) - light_vec()[2]) * mass
    clusters = fbm(n, 128, 3, SEED + 14)
    return mass, canopy, clusters, park, top


def crown_field(n, wide, core, rng):
    """Height of round tree crowns on a jittered grid: packed in the core, thinning out through the fringe."""
    F = FOREST
    step = F['tree_px']
    g = int(math.ceil(n / step)) + 1
    cx = ((np.arange(g)[None, :] + 0.15 + 0.7 * rng.random((g, g))) * step).astype(np.float32)
    cy = ((np.arange(g)[:, None] + 0.15 + 0.7 * rng.random((g, g))) * step).astype(np.float32)
    rr = (F['crown_px'] * (0.75 + 0.5 * rng.random((g, g)))).astype(np.float32)
    ci, cj = cx.astype(np.int32).clip(0, n - 1), cy.astype(np.int32).clip(0, n - 1)
    present = rng.random((g, g)) < np.clip(wide[cj, ci] * 0.50 + core[cj, ci] * 0.47, 0, 0.97)
    rr = rr * present
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    gi, gj = (xx / step).astype(np.int32), (yy / step).astype(np.int32)
    height = np.zeros((n, n), np.float32)
    for dj in (-1, 0, 1):
        a = (gj + dj).clip(0, g - 1)
        for di in (-1, 0, 1):
            b = (gi + di).clip(0, g - 1)
            r = rr[a, b]
            d2 = (xx + 0.5 - cx[a, b]) ** 2 + (yy + 0.5 - cy[a, b]) ** 2
            height = np.maximum(height, np.sqrt(np.maximum(r * r - d2, 0)))
    return blur(height, 0.45)


def paint_forest(col, layers, ftype, region):
    F = FOREST
    mass, canopy, clusters, park, top = layers
    fcol = np.zeros(col.shape, np.float32)
    fcol[:] = F['colours'][1]
    for k, rgb in F['colours'].items():
        fcol[ftype == k] = rgb
    for rid, rgb in F['region_colour'].items():
        fcol[(region == rid) & np.isin(ftype, (0, 1, 3))] = rgb
    fcol = np.stack([blur(fcol[..., c], 5) for c in range(3)], -1)
    col = lerp_rgb(col, fcol, park * F['parkland'])
    fcol = fcol * (1 + 0.06 * clusters)[..., None] * (F['gap_dark'] + (1 - F['gap_dark']) * top)[..., None]
    shifted = np.roll(np.roll(mass, 2, 0), 2, 1)
    col = col * (1 - F['cast_shadow'] * np.clip(shifted - mass, 0, 1))[..., None]
    col = lerp_rgb(col, fcol, mass * F['mix'])
    rim = np.clip(mass - shifted, 0, 1)
    lit = np.clip(1 + F['canopy_light'] * canopy + 0.05 * rim, 0.7, 1.3)
    return col * lit[..., None]
