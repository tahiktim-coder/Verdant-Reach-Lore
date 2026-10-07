"""Diagnostic preview of the atlas terrain (not the painting).

    python preview_terrain.py                 -> preview.png (1024 wide) + debug/full_2048.png + debug/crop_*.png
    python preview_terrain.py --height F --n N --out O   -> plain relief of any height file (debug stages)

Hillshade (light from the north-west, 35 degrees up), a simple elevation tint, sea in blue by depth,
rivers in bright blue scaled by flow, lakes, forest / wheat / snow tinted, POI markers with names.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DBG = os.path.join(HERE, 'debug')
Z_CELLS = 150.0          # vertical exaggeration: 1.0 of height = this many cells of a 2048 grid
AZIMUTH, ALTITUDE = 315.0, 35.0


def load(name, dtype, n):
    return np.fromfile(os.path.join(HERE, name), dtype=dtype).reshape(n, n)


def hillshade(h, n):
    z = h * Z_CELLS * (n / 2048.0)
    gy, gx = np.gradient(z)              # gy: d/d(row) = south, gx: d/d(col) = east
    nx, ny, nz = -gx, -gy, np.ones_like(z)
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    az, alt = math.radians(AZIMUTH), math.radians(ALTITUDE)
    lx, ly, lz = math.sin(az) * math.cos(alt), -math.cos(az) * math.cos(alt), math.sin(alt)
    return np.clip((nx * lx + ny * ly + nz * lz) / norm, 0, 1)


def tint(h, sea):
    """Quiet hypsometric tint: lowland sage, upland straw, rock grey-brown, high grey."""
    stops = [(sea, (154, 172, 128)), (0.26, (168, 180, 132)), (0.32, (186, 186, 140)), (0.40, (196, 184, 146)),
             (0.50, (176, 160, 134)), (0.62, (160, 150, 140)), (0.80, (178, 176, 174)), (1.0, (214, 214, 216))]
    xs = np.array([s[0] for s in stops])
    out = np.zeros(h.shape + (3,), np.float32)
    for k in range(3):
        out[..., k] = np.interp(h, xs, [s[1][k] for s in stops])
    return out


def dilate(mask, r):
    out = mask.copy()
    for dj in range(-r, r + 1):
        for di in range(-r, r + 1):
            if di * di + dj * dj <= r * r and (di or dj):
                out |= np.roll(np.roll(mask, dj, 0), di, 1)
    return out


def relief_rgb(h, sea, n):
    land = h > sea
    shade = hillshade(h, n)
    col = tint(h, sea)
    lit = 0.38 + 0.80 * shade                       # ambient + diffuse; flat ground ~ 0.84
    rgb = col * lit[..., None]
    depth = np.clip((sea - h) / 0.12, 0, 1)
    seacol = np.stack([118 - 50 * depth, 150 - 52 * depth, 172 - 34 * depth], -1)
    rgb[~land] = seacol[~land]
    return rgb, land, shade


def plain(height_path, n, out):
    h = np.fromfile(height_path, dtype=np.float32).reshape(n, n)
    meta_sea = 0.20
    rgb, _, _ = relief_rgb(h, meta_sea, n)
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(out)
    print('wrote', out)


def full():
    meta = json.load(open(os.path.join(HERE, 'meta.json'), encoding='utf-8'))
    n, sea = meta['grid'], meta['sea_level']
    h = load('height.f32', np.float32, n)
    acc = load('river.f32', np.float32, n)
    lake = load('lake.u8', np.uint8, n)
    forest = load('forest.u8', np.uint8, n).astype(np.float32) / 255
    ftype = load('forest_type.u8', np.uint8, n)
    wheat = load('wheat.u8', np.uint8, n).astype(np.float32) / 255
    snow = load('snow.u8', np.uint8, n).astype(np.float32) / 255

    land = h > sea
    shade = hillshade(h, n)
    col = tint(h, sea)
    # cover tints (applied to the albedo, so the relief still shades them)
    fcol = np.zeros_like(col)
    fcol[:] = (92, 118, 78)
    fcol[ftype == 3] = (78, 100, 84)       # pine
    fcol[ftype == 2] = (52, 64, 52)        # Forest of Eyes
    fcol[ftype == 4] = (110, 150, 160)     # crystal groves
    fcol[ftype == 5] = (96, 110, 80)       # swamp wood
    a = (forest * 0.62)[..., None]
    col = col * (1 - a) + fcol * a
    a = (wheat * 0.55)[..., None]
    col = col * (1 - a) + np.array([214, 186, 112], np.float32) * a
    a = (snow * 0.9)[..., None]
    col = col * (1 - a) + np.array([244, 246, 250], np.float32) * a
    lit = 0.38 + 0.80 * shade
    rgb = col * lit[..., None]
    depth = np.clip((sea - h) / 0.12, 0, 1)
    seacol = np.stack([118 - 50 * depth, 150 - 52 * depth, 172 - 34 * depth], -1)
    rgb[~land] = seacol[~land]
    rgb[lake > 0] = (96, 150, 186)
    # rivers, wider with flow
    riv = (acc > 1000) & land & (lake == 0)
    big = dilate((acc > 12000) & land & (lake == 0), 1)
    huge = dilate((acc > 90000) & land & (lake == 0), 2)
    strength = np.clip(np.log10(np.maximum(acc, 1) / 1000) / 1.6, 0, 1)
    rc = np.array([40, 120, 230], np.float32)
    al = (0.35 + 0.65 * strength)[..., None] * riv[..., None]
    rgb = rgb * (1 - al) + rc * al
    rgb[big & land & (lake == 0)] = rgb[big & land & (lake == 0)] * 0.25 + rc * 0.75
    rgb[huge & land & (lake == 0)] = rc
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    os.makedirs(DBG, exist_ok=True)
    img.save(os.path.join(DBG, 'full_2048.png'))
    crops = {
        'nw_fjords': (0.00, 0.17, 0.26, 0.48), 'alpine_massif': (0.01, 0.66, 0.41, 1.00),
        'eastern_lowlands': (0.56, 0.30, 0.98, 0.72), 'pass_and_high_arc': (0.18, 0.12, 0.58, 0.42),
        'gulf_and_south_east': (0.42, 0.68, 1.00, 1.00), 'east_gap_and_battlefield': (0.58, 0.08, 1.00, 0.44),
        'reach_interior': (0.10, 0.30, 0.50, 0.70),
    }
    # the boxes are in design coordinates (layout.js); the frame maps them onto the map
    fr = meta.get('layout', {}).get('frame', {'scale': 1.0, 'design': [0.5, 0.5], 'map': [0.5, 0.5]})
    fu = lambda u: fr['map'][0] + (u - fr['design'][0]) * fr['scale']
    fv = lambda v: fr['map'][1] + (v - fr['design'][1]) * fr['scale']
    for name, (u0, v0, u1, v1) in crops.items():
        box = [min(max(int(x * n), 0), n) for x in (fu(u0), fv(v0), fu(u1), fv(v1))]
        img.crop(tuple(box)).save(os.path.join(DBG, 'crop_%s.png' % name))
    # the 1024 preview with markers
    W = 1024
    prev = img.resize((W, W), Image.LANCZOS)
    draw = ImageDraw.Draw(prev)
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/georgia.ttf', 11)
        fontb = ImageFont.truetype('C:/Windows/Fonts/georgiab.ttf', 12)
    except OSError:
        font = fontb = ImageFont.load_default()
    pois = json.load(open(os.path.join(HERE, 'pois.json'), encoding='utf-8'))['pois']
    skip = {'standing_stone', 'wreckage', 'clockwork_tower'}
    for p in pois:
        if p['kind'] in skip:
            continue
        x, y = p['u'] * W, p['v'] * W
        major = p.get('rank') == 'major'
        r = 3.5 if major else 2.5
        fill = (180, 30, 30) if p['kind'] == 'castle' else (30, 30, 30)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=(255, 255, 255))
        name = p['name'] if p['kind'] != 'castle' or major else 'castle %d' % p.get('variant', 0)
        f = fontb if major else font
        tx, ty = x + 5, y - 7
        draw.text((tx, ty), name, font=f, fill=(20, 20, 20), stroke_width=2, stroke_fill=(250, 248, 240))
    out = os.path.join(HERE, 'preview.png')
    prev.save(out)
    print('wrote', out)


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--height' in args:
        hp = args[args.index('--height') + 1]
        nn = int(args[args.index('--n') + 1])
        op = args[args.index('--out') + 1]
        plain(hp, nn, op)
    else:
        full()
