#!/usr/bin/env python3
"""Paint the relief atlas of the Verdant Reach: land and sea only (no names, symbols or frame).

    python paint.py              -> master_relief.png (2048 x 2048, 8-bit RGB), preview_1024.png, crops/*.png
    python paint.py --nocrops    -> master and preview only

Reads the baked terrain in ../terrain (height, flow accumulation, lakes, cover masks, regions, pois, meta).
Every world position (the battlefield, the volcanoes, the meadow, the crop windows) is read from the terrain's
pois.json / meta.json, so the painter follows the layout's frame. Pillow + numpy only. Deterministic.

Modules: config.py (every tunable number), fields.py (raster helpers), rivers.py, sea.py (shore, sea, lakes),
cover.py (wheat, fields, heath, volcanoes, forests). This file: relief, tints and the composite.
"""
import json
import math
import os
import sys
import time

import numpy as np
from PIL import Image

import cover
import rivers as rivmod
import sea as seamod
from config import (SEED, RELIEF, MICRO, HAZE, HYPSO, REGION_TINT, FLOORS, LOWCOL, PLAINS, FOREST, SNOW, RIVER,
                    VOLCANO, LONE_PEAKS, VIGNETTE, CROPS, CROP_PX)
from fields import (blur, fbm, ridged, smoothstep, lerp_rgb, ramp, warp, min_filter, contour_sdf, light_vec,
                    lambert)

HERE = os.path.dirname(os.path.abspath(__file__))
TERRAIN = os.path.normpath(os.path.join(HERE, '..', 'terrain'))
CROP_DIR = os.path.join(HERE, 'crops')
MASTER = os.path.join(HERE, 'master_relief.png')
PREVIEW = os.path.join(HERE, 'preview_1024.png')


def log(msg, t0=[time.time()]):
    print('%6.1fs  %s' % (time.time() - t0[0], msg), flush=True)


def load(name, dtype, n):
    return np.fromfile(os.path.join(TERRAIN, name), dtype=dtype).reshape(n, n)


# ------------------------------------------------------------------- relief --
def tone_slope(gx, gy, knee):
    g = np.hypot(gx, gy)
    s = knee * np.tanh(g / knee) / np.maximum(g, 1e-6)
    return gx * s, gy * s, np.tanh(g / knee)


def generalise_plains(h, region):
    P = PLAINS
    plain = np.isin(region, P['regions']).astype(np.float32)
    e = blur(plain, P['edge_px'])
    zone = smoothstep(0.0, 0.25, e) * (1 - smoothstep(0.75, 1.0, e))
    zone = blur(zone, 4)
    return h + (blur(h, P['smooth_px']) - h) * zone


def micro_relief(t):
    """Soft hills and low swells on the lowland at 10-40 px, for the shading only (no colour noise)."""
    M = MICRO
    n, hb = t['n'], t['hb']
    low = 1 - smoothstep(M['lowland'][0], M['lowland'][1], hb)
    plains = blur(np.isin(t['region'], (7, 9)).astype(np.float32), 12)
    m = M['amp'] * fbm(n, *M['cells'], SEED + 90) + M['ridge_amp'] * ridged(n, *M['ridge_cells'], SEED + 91)
    return m * low * (1 - M['plains_off'] * plains) * t['land']


def relief_terms(h, hb):
    """Return shadow (0..1), highlight (0..1), steepness (0..1), valley (0..1), ridge (0..1), illum."""
    R = RELIEF
    low = 1 - smoothstep(0.28, 0.46, hb)
    flat = light_vec()[2]
    illum = 0
    steep = 0
    for sigma, mix, zmul, lowmul in R['scales']:
        hs = blur(h, sigma)
        gy, gx = np.gradient(hs * R['z_cells'] * zmul)
        boost = 1 + (lowmul - 1) * low
        gx, gy, st = tone_slope(gx * boost, gy * boost, R['slope_knee'])
        illum = illum + mix * lambert(gx, gy)
        steep = steep + mix * st
    illum = blur(illum, R['shade_soften'])
    shadow = np.clip((flat - illum) / flat, 0, 1)
    high = np.clip((illum - flat) / (1 - flat), 0, 1)
    h1 = blur(h, 1.1)
    valley = np.clip((blur(h, 11) - h1) / 0.02, 0, 1)
    ridge = np.clip((h1 - blur(h, 3.0)) / 0.005, 0, 1) ** 1.5 * smoothstep(0.38, 0.55, hb)
    return shadow, high, steep, valley, ridge, illum


def apply_relief(col, hb, terms, calm):
    """calm: dict of 0..1 fields that soften the shading (forest mass gets more contrast, valley floors and
    river channels less, lone summits a little lighter)."""
    R = RELIEF
    shadow, high, steep, valley, ridge, _ = terms
    lo, hi = R['contrast_low'], R['contrast_high']
    contrast = lo + (hi - lo) * smoothstep(0.24, 0.62, hb) + R['contrast_forest'] * calm['forest']
    shadow = shadow * (1 - FLOORS['shade_calm'] * calm['floors']) * (1 - R['river_calm'] * calm['river']) \
        * (1 - LONE_PEAKS['summit_lift'] * calm['summit'])
    valley = valley * (1 - calm['floors']) * (1 - R['river_calm'] * calm['river'])
    s = np.clip(shadow * contrast * R['shadow_strength'], 0, 1)
    col = col * (1 - s[..., None] * (1 - np.array(R['shadow_rgb'], np.float32)))
    col = col * (1 - R['slope_dark'] * steep - R['valley_dark'] * valley)[..., None]
    lift = np.clip(high * contrast * R['highlight'] + ridge * R['ridge_light'], 0, 1)
    lift = lift * (1 - FOREST['highlight_damp'] * np.clip(calm['forest'], 0, 1))
    return lerp_rgb(col, np.array(R['light_rgb'], np.float32), lift)


# -------------------------------------------------------------------- tints --
def valley_floors(t):
    """Height above the local valley base (rel) and a 0..1 mask of valley floors up in the mountains."""
    Fl = FLOORS
    h, hb = t['h'], t['hb']
    env = blur(min_filter(blur(h, 2), Fl['env_px']), Fl['env_px'] * 0.6)
    rel = np.maximum(h - env, 0)
    gy, gx = np.gradient(blur(h, 3) * RELIEF['z_cells'])
    slope = np.hypot(gx, gy)
    floor = (1 - smoothstep(Fl['rel'][0], Fl['rel'][1], rel)) * (1 - smoothstep(Fl['slope'][0], Fl['slope'][1], slope))
    zone = smoothstep(Fl['zone'][0], Fl['zone'][1], hb) * (1 - smoothstep(Fl['top'] - 0.05, Fl['top'], hb))
    boost = np.full(h.shape, Fl['other'], np.float32)
    for rid, b in Fl['region_boost'].items():
        boost = np.where(blur((t['region'] == rid).astype(np.float32), 12) > 0.5, b, boost)
    return rel, blur(floor * zone * boost, 1.5) * t['land']


def base_tint(t, floors):
    n, h, hb, region = t['n'], t['h'], t['hb'], t['region']
    col = ramp(hb * 0.35 + h * 0.65, HYPSO)
    dx = fbm(n, 24, 3, SEED + 1) * 40
    dy = fbm(n, 24, 3, SEED + 2) * 40
    reg = warp(region, dx, dy)
    for rid, spec in REGION_TINT.items():
        w = blur((reg == rid).astype(np.float32), spec.get('soft', 10)) * spec['mix']
        w = w * (1 - smoothstep(spec['top'] - 0.06, spec['top'] + 0.06, hb))
        col = lerp_rgb(col, np.array(spec['rgb'], np.float32), w)
    # valley floors in the mountains: lowland green, so they read as valleys, not pits
    col = lerp_rgb(col, np.array(FLOORS['rgb'], np.float32), floors * FLOORS['mix'])
    # lowland variation at 20-60 px: meadow, scrub, damp hollows
    L = LOWCOL
    low = 1 - smoothstep(0.27, 0.37, hb)
    p1, p2 = fbm(n, L['cells'], 3, SEED + 95), fbm(n, L['cells'], 3, SEED + 96)
    col = lerp_rgb(col, np.array(L['meadow'], np.float32), low * L['meadow_mix'] * smoothstep(0.05, 0.45, p1))
    col = lerp_rgb(col, np.array(L['scrub'], np.float32), low * L['scrub_mix'] * smoothstep(0.10, 0.50, p2))
    hol = np.clip((blur(h, 16) - blur(h, 2)) / 0.03, -1, 1)
    col = col * (1 - L['hollow'] * hol)[..., None] + np.array([-6, 2, -6], np.float32) * np.clip(hol, 0, 1)[..., None]
    return col * (1 + 0.035 * fbm(n, 16, 4, SEED + 3))[..., None]


def summit_mask(n, peaks):
    jj, ii = np.mgrid[0:n, 0:n].astype(np.float32)
    m = np.zeros((n, n), np.float32)
    for c in peaks:
        u, v = c['at']
        m = np.maximum(m, np.exp(-(np.hypot(ii / n - u, jj / n - v) / (c['r'] * 0.55)) ** 2))
    return m


# --------------------------------------------------------------- composite --
def paint_land(t):
    """Everything on land before the water goes on: tints, covers, snow, relief, rivers."""
    n, h, hb = t['n'], t['h'], t['hb']
    terms = relief_terms(generalise_plains(h, t['region']) + micro_relief(t), hb)
    rel, floors = valley_floors(t)
    t['rel'] = rel
    log('relief terms, valley floors')
    ra, rhl, nlines = rivmod.rivers(t['acc'], hb, h, ~t['land'] | t['lake'], t['region'], RELIEF['z_cells'])
    log('rivers: %d lines' % nlines)
    col = base_tint(t, floors)
    col = cover.paint_meadows(col, n, t['P'])
    col, wheat_a = cover.paint_wheat(col, t, ra)
    col = cover.paint_hedgerows(col, t, wheat_a, terms[2])
    col, _ = cover.paint_heath(col, t)
    col, snow_off = cover.paint_volcano(col, h, n, t['cones'])
    log('tints, wheat, fields, heath, volcano')
    layers = cover.forest_layers(t, wheat_a, terms, ra)
    col = cover.paint_forest(col, layers, t['ftype'], t['region'])
    log('forest')
    # snow: soft lower edge following the relief; none on the warm volcanic ground; soft on the lone peak
    shadow, _, _, valley, ridge, _ = terms
    s = t['snow'] + 0.25 * valley + 0.12 * shadow - 0.10 * ridge
    s = smoothstep(SNOW['lo'], SNOW['hi'], blur(s, 0.8)) * (t['snow'] > 0.01) * (1 - snow_off)
    lone = summit_mask(n, t['lone'])
    s = s + (blur(s, LONE_PEAKS['snow_blur']) * LONE_PEAKS['snow_mul'] - s) * np.clip(lone * 2.5, 0, 1)
    col = lerp_rgb(col, np.array(SNOW['rgb'], np.float32), blur(s, 0.7))
    calm = dict(forest=np.clip(layers[0], 0, 1), floors=floors, river=np.clip(blur(ra, 1.5) * 2.5, 0, 1), summit=lone)
    col = apply_relief(col, hb, terms, calm)
    col = lerp_rgb(col, np.array(RIVER['rgb'], np.float32), ra)
    col = lerp_rgb(col, np.array(RIVER['sky_rgb'], np.float32), rhl * RIVER['sky'])
    log('relief and rivers applied')
    return col, ra


def add_water(col, t, ra):
    n, h, lake = t['n'], t['h'], t['lake']
    lake_sdf = contour_sdf(lake.astype(np.float32), 0.5, 0.9)
    col = lerp_rgb(col, seamod.lake_colour(lake, n), np.clip(0.5 + lake_sdf, 0, 1))
    land0 = t['land']
    sd = seamod.signed_distance(h, t['sea'])
    rock = seamod.coast_rock(land0, h)
    sd2, rocks = seamod.fractal_coast(sd, rock, land0, n, np.clip(blur(ra, 4) * 3, 0, 1))
    a0, a = np.clip(0.5 + sd, 0, 1), np.clip(0.5 + sd2, 0, 1)
    col = seamod.land_colour_outward(col, a0, a, rocks)
    log('shore')
    col = lerp_rgb(seamod.sea_colour(a, rock, n, t['P']), col, a)
    log('sea and lakes')
    return col, a


def atmosphere(col, t, land_a):
    n, hb = t['n'], t['hb']
    jj, ii = np.mgrid[0:n, 0:n].astype(np.float32)
    v, u = jj / n, ii / n
    hz = HAZE['north'] * (1 - smoothstep(HAZE['north_to'], HAZE['north_from'], v)) * land_a
    hz = hz + HAZE['lowland'] * (1 - smoothstep(0.22, 0.6, hb)) * land_a
    col = lerp_rgb(col, np.array(HAZE['rgb'], np.float32), hz)
    r = np.hypot(u - 0.5, v - 0.5) / 0.7071
    return col * (1 - VIGNETTE['strength'] * smoothstep(VIGNETTE['start'], 1.0, r))[..., None]


def crop_centres(P):
    out = {}
    for name, (keys, (du, dv)) in CROPS.items():
        ps = [P[k] for k in keys if k in P]
        if ps:
            out[name] = (sum(p['u'] for p in ps) / len(ps) + du, sum(p['v'] for p in ps) / len(ps) + dv)
    return out


def save(col, n, crops, P):
    rng = np.random.default_rng(SEED + 99)
    col = col + rng.random(col.shape, np.float32) - 0.5          # dither against banding
    img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB')
    img.save(MASTER)
    img.resize((1024, 1024), Image.LANCZOS).save(PREVIEW)
    log('wrote %s' % MASTER)
    if not crops:
        return
    os.makedirs(CROP_DIR, exist_ok=True)
    half = CROP_PX // 2
    centres = crop_centres(P)
    for name, (cu, cv) in centres.items():
        x = min(max(int(cu * n), half), n - half)
        y = min(max(int(cv * n), half), n - half)
        img.crop((x - half, y - half, x + half, y + half)).save(os.path.join(CROP_DIR, name + '.png'))
    for f in os.listdir(CROP_DIR):
        if f.endswith('.png') and f[:-4] not in centres:
            os.remove(os.path.join(CROP_DIR, f))
    log('wrote %d crops' % len(centres))


def main():
    meta = json.load(open(os.path.join(TERRAIN, 'meta.json'), encoding='utf-8'))
    pois = json.load(open(os.path.join(TERRAIN, 'pois.json'), encoding='utf-8'))['pois']
    n, sea = meta['grid'], meta['sea_level']
    h = load('height.f32', np.float32, n)
    P = {p['key']: p for p in pois}
    cones = meta['layout']['cones']
    t = dict(n=n, sea=sea, h=h, hb=blur(h, 5), land=h > sea, P=P,
             cones=[c for c in cones if c['key'].startswith(VOLCANO['prefix'])],
             lone=[c for c in cones if c['key'] in LONE_PEAKS['keys']],
             acc=load('river.f32', np.float32, n), lake=load('lake.u8', np.uint8, n) > 0,
             forest=load('forest.u8', np.uint8, n), ftype=load('forest_type.u8', np.uint8, n),
             wheat=load('wheat.u8', np.uint8, n), region=load('region.u8', np.uint8, n),
             snow=load('snow.u8', np.uint8, n).astype(np.float32) / 255)
    log('loaded terrain %dx%d' % (n, n))
    col, ra = paint_land(t)
    col, land_a = add_water(col, t, ra)
    col = atmosphere(col, t, land_a)
    save(col, n, '--nocrops' not in sys.argv, P)


if __name__ == '__main__':
    main()
