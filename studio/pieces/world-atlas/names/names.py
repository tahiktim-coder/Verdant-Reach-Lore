#!/usr/bin/env python3
"""Names, marks and map furniture for the Verdant Reach relief atlas, as a layer over the finished relief.

    python names.py      -> master_named.png, master_clean.png, preview_1024.png, crops/*.png, placements.json

Reads ../paint/master_relief.png (never repainted) and ../terrain (pois, labels, meta, height, rivers, lakes,
regions). The relief maps one terrain cell to one pixel (x = u * N, y = v * N), so every place is put exactly
where the painter put its ground. Pillow + numpy only. Deterministic.

Order: furniture zones are reserved, then the marks, then the minor names (each scored on its real ink: off
rivers, summits, other labels and dark ground, right of or below its mark), then the region and sea names
(searched along gentle arcs), then an audit of every pair of items for overlaps.

Modules: config_names.py (every number), lettering.py (text on a path, halo), marks.py (the mark set),
place.py (the world's cost fields, candidate scoring), search.py (arcs, river, lake), furniture.py.
"""
import json
import math
import os
import sys
import time

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import furniture                                                     # noqa: E402
import lettering as L                                                # noqa: E402
import marks                                                         # noqa: E402
import search                                                        # noqa: E402
from config_names import MARKS, MINOR, LAKE, RIVER_NAME, REGIONS     # noqa: E402
from place import World, INVALID, ink_box                            # noqa: E402

RELIEF = os.path.normpath(os.path.join(HERE, '..', 'paint', 'master_relief.png'))
OUT_NAMED = os.path.join(HERE, 'master_named.png')
OUT_CLEAN = os.path.join(HERE, 'master_clean.png')
PREVIEW = os.path.join(HERE, 'preview_1024.png')
CROPS = os.path.join(HERE, 'crops')
REPORT = os.path.join(HERE, 'placements.json')


def log(msg, t0=[time.time()]):
    print('%6.1fs  %s' % (time.time() - t0[0], msg), flush=True)


# ------------------------------------------------------------------ marks --
def place_marks(world):
    out = {}
    for kind, keys in MARKS.items():
        for i, key in enumerate(keys):
            p = world.P[key]
            it = marks.mark(kind, key, p['u'] * world.n, p['v'] * world.n, p.get('variant', i))
            world.commit(it, grow=1)
            out[key] = it
    return out


# ------------------------------------------------------------ minor names --
def saddle(world, key):
    route = np.array(world.P[key]['route']) * world.n
    pts = search.resample(route, 2.0)
    hs = world.hb[pts[:, 1].astype(int), pts[:, 0].astype(int)]
    return pts[int(np.argmax(hs))]


def feature_centre(world, key):
    if key == 'fire_dragon_peaks':
        cones = [c for c in world.meta['layout']['cones'] if c['key'].startswith('fire_dragon')]
        return (np.mean([c['at'][0] for c in cones]) * world.n, np.mean([c['at'][1] for c in cones]) * world.n)
    p = world.P[key]
    return p['u'] * world.n, p['v'] * world.n


def reserve_core(world, cx, cy, r):
    n = world.n
    y0, y1, x0, x1 = int(max(cy - r, 0)), int(min(cy + r + 1, n)), int(max(cx - r, 0)), int(min(cx + r + 1, n))
    jj, ii = np.mgrid[y0:y1, x0:x1]
    world.occ[y0:y1, x0:x1] |= (ii - cx) ** 2 + (jj - cy) ** 2 <= r * r


def minor_candidates(world, spec, mark_items):
    key, kind, style = spec['key'], spec['kind'], spec['style']
    if kind == 'point':
        p = world.P[key]
        base = L.render_line(key, spec['text'], style, p['u'] * world.n, p['v'] * world.n)
        return world.point_candidates(base, mark_items[key])
    if kind == 'pass':
        cx, cy = saddle(world, key)
    else:
        cx, cy = feature_centre(world, key)
    core = 0.0
    if kind == 'feature' and spec.get('medium', 'land') == 'land':
        core = spec['r'] * 0.5
        reserve_core(world, cx, cy, core)
    forms = [L.render_line(key, spec['text'], style, cx, cy)]
    if spec.get('lines'):
        forms.append(L.render_lines(key, spec['lines'], style, cx, cy))
    cands = []
    for k, base in enumerate(forms):
        form_pen = (0.25 if k == 0 else 0.0) if spec.get('lines') else 0.0
        cands += [(it, pen + form_pen, tag + ('/2 lines' if k else '')) for it, pen, tag in
                  world.around_candidates(base, cx, cy, spec['r'], prefer=kind != 'area', core=core)]
    return cands


def place_minor(world, spec, mark_items, report):
    cands = minor_candidates(world, spec, mark_items)
    medium = spec.get('medium', 'land')
    best = world.best_of(cands, medium, within=spec.get('within'), margin=7 if medium == 'sea' else 2)
    if best is None:
        log('  !! no valid place for %s' % spec['key'])
        return None
    it, tot, det, tag = best
    world.commit(it, grow=1)
    report[spec['key']] = dict(text=spec['text'], where=tag, cost=round(tot, 3), **rounded(det))
    return it


def rounded(d):
    return {k: (round(float(v), 4) if isinstance(v, (float, np.floating)) else v) for k, v in d.items()}


# ---------------------------------------------------------------- audit --
def audit(world, labels, mark_items):
    """Every pair of items: do their inks (grown 1 px) touch? Every name: river, summit, wrong ground."""
    items = list(mark_items.values()) + labels
    n = world.n
    owner = np.full((n, n), -1, np.int32)
    clashes = []
    for idx, it in enumerate(items):
        x0, y0, x1, y1 = it.box
        ink = L.max_filter((it.a > 0.08).astype(np.float32), 1) > 0.5
        sub = owner[y0:y1, x0:x1]
        hit = np.unique(sub[ink & (sub >= 0)])
        for j in hit:
            clashes.append((items[j].key, it.key))
        sub[ink] = idx
    per = {}
    for it in labels:
        x0, y0, x1, y1 = it.box
        ink = it.a > 0.08
        nk = max(ink.sum(), 1)
        per[it.key] = dict(
            river_px=int((ink & (world.river_a[y0:y1, x0:x1] > 0.15)).sum()),
            summit_px=int((ink & world.peaks[y0:y1, x0:x1]).sum()),
            on_water=round(float((ink & ~world.land[y0:y1, x0:x1]).sum() / nk), 3),
            box=[int(v) for v in it.box])
    return clashes, per


# ---------------------------------------------------------------- output --
def save_crops(named, labels, world):
    os.makedirs(CROPS, exist_ok=True)
    for f in os.listdir(CROPS):
        if f.endswith('.png'):
            os.remove(os.path.join(CROPS, f))
    img = Image.fromarray(named)
    n = world.n
    groups = dict(
        still_water_mountain_path=(560, 700), reach_heart=(820, 930), wheat_border_river=(1010, 1190),
        green_valleys_swamp=(680, 1470), eastern_city=(1330, 1040), battlefield_low_gap=(1420, 700),
        mage_south=(1390, 1440), artifact_isles=(1720, 1720), north_lands=(1000, 470),
        compass=(1840, 220))
    for name, (cx, cy) in groups.items():
        x = int(min(max(cx, 320), n - 320))
        y = int(min(max(cy, 320), n - 320))
        img.crop((x - 320, y - 320, x + 320, y + 320)).save(os.path.join(CROPS, name + '.png'))
    img.crop((0, 1640, 860, n)).save(os.path.join(CROPS, 'title_block.png'))
    for it in labels:
        if it.kind in ('region', 'sea'):
            x0, y0, x1, y1 = it.box
            img.crop((x0 - 40, y0 - 40, x1 + 40, y1 + 40)).save(os.path.join(CROPS, 'label_' + it.key + '.png'))


def to8(col):
    return np.clip(col + 0.5, 0, 255).astype(np.uint8)


def main():
    relief = np.asarray(Image.open(RELIEF).convert('RGB'), np.float32)
    world = World(relief)
    log('world fields (rivers %d lines, %d summits)' % (len(world.river_lines), len(world.peak_pts)))
    furn, boxes = furniture.build(world.n)
    for b in boxes:
        world.reserve(*b)
    mark_items = place_marks(world)
    log('marks: %d' % len(mark_items))
    report, labels = {}, []
    fixed = [s for s in MINOR if s['kind'] != 'area']          # tied to a mark or a feature: placed first
    flexible = [s for s in MINOR if s['kind'] == 'area']       # area names: placed after the regions
    for spec in REGIONS:
        it, det = search.region_label(world, spec)
        if it is None:
            log('  !! no valid place for %s' % spec['key'])
            continue
        world.commit(it, grow=2)
        labels.append(it)
        report[spec['key']] = dict(text=spec['text'], **rounded(det))
        log('  %-16s %-6s track %.2f angle %5.1f  total %.2f' % (spec['key'], det['how'], det['track'],
                                                              det['angle'], det['total']))
    for spec in fixed:
        it = place_minor(world, spec, mark_items, report)
        if it is not None:
            labels.append(it)
    log('names tied to marks and features: %d' % len(labels))
    it, det = search.lake_label(world, LAKE)
    if it is not None:
        world.commit(it, grow=1)
        labels.append(it)
        report[LAKE['key']] = dict(text=LAKE['text'], **rounded(det))
    it, det = search.river_label(world, RIVER_NAME)
    if it is not None:
        world.commit(it, grow=1)
        labels.append(it)
        report[RIVER_NAME['key']] = dict(text=RIVER_NAME['text'], **rounded(det))
    for spec in flexible:
        it = place_minor(world, spec, mark_items, report)
        if it is not None:
            labels.append(it)
    log('all names: %d' % len(labels))

    clean = relief.copy()
    for f in furn:
        L.compose(clean, f)
    named = clean.copy()
    for m in mark_items.values():
        L.compose(named, m)
    for lb in labels:
        L.compose(named, lb)
    clean, named = furniture.frame(clean), furniture.frame(named)
    clean8, named8 = to8(clean), to8(named)
    Image.fromarray(clean8).save(OUT_CLEAN)
    Image.fromarray(named8).save(OUT_NAMED)
    Image.fromarray(named8).resize((1024, 1024), Image.LANCZOS).save(PREVIEW)
    save_crops(named8, labels, world)
    clashes, per = audit(world, labels, mark_items)
    for k, v in per.items():
        report.setdefault(k, {})['audit'] = v
    json.dump(dict(clashes=clashes, labels=report), open(REPORT, 'w', encoding='utf-8'), indent=1)
    log('wrote master_named, master_clean, preview, crops; clashes: %d' % len(clashes))
    for a, b in clashes:
        print('   clash: %s / %s' % (a, b))
    for k, v in per.items():
        if v['river_px'] or v['summit_px']:
            print('   %-20s river px %d, summit px %d' % (k, v['river_px'], v['summit_px']))


if __name__ == '__main__':
    main()
