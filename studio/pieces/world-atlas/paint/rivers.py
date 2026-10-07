"""Rivers for the atlas painter.

Trace the drainage tree from the baked flow accumulation as main stems (each cell continues the line of its
largest donor), prune stubs, merge rivers that fan out of one bay head into one trunk with tributaries, bend
every junction so the tributary meets its river at an acute angle pointing downstream, and draw tapered
lines (thin at the source, widest at the mouth) with a faint sky highlight on the big rivers. No outline."""
import math

import numpy as np
from PIL import Image, ImageDraw

from config import RIVER
from fields import smoothstep

OFFS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def threshold_field(hb, region):
    R = RIVER
    thr = R['threshold'] * (1 + (R['mountain_mult'] - 1) * smoothstep(0.40, 0.58, hb))
    for rid, mult in R['region_mult'].items():
        thr = np.where(region == rid, thr * mult, thr)
    return thr


def receivers(acc, water, base):
    """Receiver (flat index) of every base cell: the land neighbour with the most flow if it has more flow,
    else a water neighbour (outlet), else -1 (pit). Returns a full-size array (-1 elsewhere) and an is-outlet flag."""
    n = acc.shape[0]
    js, iz = np.nonzero(base)
    land_acc = np.where(water, -1.0, acc)
    pad = np.pad(land_acc, 1, constant_values=-1.0)
    wpad = np.pad(water, 1, constant_values=False)
    nb = np.stack([pad[js + 1 + dj, iz + 1 + di] for dj, di in OFFS])
    wnb = np.stack([wpad[js + 1 + dj, iz + 1 + di] for dj, di in OFFS])
    k = nb.argmax(0)
    odj = np.array([o[0] for o in OFFS])
    odi = np.array([o[1] for o in OFFS])
    up = nb.max(0) > acc[js, iz]
    kw = wnb.argmax(0)
    has_w = wnb.any(0)
    rj = np.where(up, js + odj[k], js + odj[kw])
    ri = np.where(up, iz + odi[k], iz + odi[kw])
    recv = np.full(n * n, -1, np.int64)
    outlet = np.zeros(n * n, bool)
    flat = js * n + iz
    ok = up | has_w
    recv[flat[ok]] = (rj * n + ri)[ok]
    outlet[flat] = ~up & has_w
    return recv, outlet


def trace(acc, hb, water, region):
    """Main-stem lines: list of dicts (cells, end, parent cell)."""
    R = RIVER
    n = acc.shape[0]
    thr = threshold_field(hb, region)
    land = ~water
    base = land & (acc >= R['threshold'] * 0.25)
    recv, outlet = receivers(acc, water, base)
    cand = (land & (acc >= thr)).ravel()
    cidx = np.nonzero(cand)[0]
    has_donor = np.zeros(n * n, bool)
    r = recv[cidx]
    has_donor[r[(r >= 0)]] = True
    sources = cidx[~has_donor[cidx]]
    accf = acc.ravel()
    # pass 1: every cell on the way down from a source is a river cell
    river = np.zeros(n * n, bool)
    for s in sources:
        c = s
        while c >= 0 and not river[c] and not water.flat[c]:
            river[c] = True
            if outlet[c]:
                break
            c = recv[c]
    rc = np.nonzero(river)[0]
    # the main donor of each river cell is its river donor with the most flow (the last assignment wins)
    main = np.full(n * n, -1, np.int64)
    rr = recv[rc]
    keep = (rr >= 0) & ~outlet[rc]
    order = np.argsort(accf[rc[keep]])
    main[rr[keep][order]] = rc[keep][order]
    # pass 2: lines follow the main stem; a line ends at water, at a pit or where it joins a bigger stem
    lines = []
    for s in sources[np.argsort(-accf[sources])]:
        cells, c, end, join = [s], s, 'pit', -1
        while True:
            if outlet[c]:
                end, join = 'water', recv[c]
                break
            nx = recv[c]
            if nx < 0:
                break
            if main[nx] != c:
                end, join = 'junction', nx
                break
            cells.append(nx)
            c = nx
        lines.append(dict(cells=np.array(cells), end=end, join=join))
    return lines


def line_xy(cells, n):
    return np.stack([cells % n + 0.5, cells // n + 0.5], 1).astype(np.float64)


def arc_length(xy):
    return float(np.hypot(*np.diff(xy, axis=0).T).sum()) if len(xy) > 1 else 0.0


def link(lines, n):
    """Parent line and index for every junction, children counts."""
    owner = {}
    for k, ln in enumerate(lines):
        for i, c in enumerate(ln['cells']):
            owner[int(c)] = (k, i)
    for ln in lines:
        ln['parent'] = owner.get(int(ln['join']), (-1, -1)) if ln['end'] == 'junction' else (-1, -1)
        ln['xy'] = line_xy(ln['cells'], n)
        ln['len'] = arc_length(ln['xy'])
    kids = np.zeros(len(lines), np.int32)
    for ln in lines:
        if ln['parent'][0] >= 0:
            kids[ln['parent'][0]] += 1
    return kids


def prune(lines, acc, n):
    """Drop stubs: short childless tributaries and short lines that end anywhere (they read as orphans)."""
    R = RIVER
    accf = acc.ravel()
    for _ in range(R['prune_rounds']):
        kids = link(lines, n)
        out = []
        for k, ln in enumerate(lines):
            first_order = kids[k] == 0
            short = ln['len'] < R['min_len']
            stub = first_order and ln['end'] == 'junction' and ln['len'] < R['prune_len']
            weak_end = first_order and ln['end'] != 'junction' and ln['len'] < R['prune_len'] \
                and accf[ln['cells'][-1]] < R['threshold'] * 4
            if short and first_order or stub or weak_end:
                continue
            out.append(ln)
        lines = out
    link(lines, n)
    return lines


def merge_mouths(lines, acc, n):
    """Rivers that reach one bay head (or one lake shore) side by side become tributaries of the biggest, or go."""
    R = RIVER
    accf = acc.ravel()
    kids = link(lines, n)
    mouths = [k for k, ln in enumerate(lines) if ln['end'] == 'water']
    mouths.sort(key=lambda k: -accf[lines[k]['cells'][-1]])
    drop = set()
    kept = []
    for k in mouths:
        ln = lines[k]
        end = ln['xy'][-1]
        big = None
        for b in kept:
            if np.hypot(*(lines[b]['xy'][-1] - end)) < R['mouth_merge_px']:
                big = b
                break
        if big is None:
            kept.append(k)
            continue
        fb, fs = accf[lines[big]['cells'][-1]], accf[ln['cells'][-1]]
        if kids[k] == 0 and fs < R['mouth_keep'] * fb:
            drop.add(k)
            continue
        # reroute: cut the line where it first comes near the big river and join it there
        bxy = lines[big]['xy']
        d = np.hypot(ln['xy'][:, None, 0] - bxy[None, :, 0], ln['xy'][:, None, 1] - bxy[None, :, 1])
        near = np.nonzero(d.min(1) < 10.0)[0]
        cut = int(near[0]) if len(near) else len(ln['xy']) - 1
        if cut < 4:
            drop.add(k)
            continue
        j = int(d[cut].argmin())
        ln['cells'] = ln['cells'][:cut + 1]
        ln['end'], ln['join'] = 'junction', lines[big]['cells'][j]
    lines = [ln for k, ln in enumerate(lines) if k not in drop]
    # smaller tributaries that meet a river right at its end (its mouth, or its own confluence) cluster several
    # confluences in one spot and read as spokes: they go (in rounds, so a chain of them goes too)
    for _ in range(3):
        kids = link(lines, n)
        out = []
        for k, ln in enumerate(lines):
            pk, pi = ln['parent']
            if pk >= 0 and kids[k] == 0:
                p = lines[pk]
                if arc_length(p['xy'][pi:]) < R['mouth_arc_px'] and accf[ln['cells'][-1]] < 0.5 * accf[p['cells'][-1]]:
                    continue
            out.append(ln)
        lines = out
    link(lines, n)
    return lines


def join_at_contact(lines, acc, n, near_px=3):
    """A line that runs alongside a bigger line (common on flats: siblings and tributaries side by side) joins
    it where the two first touch, so no pair can braid once each line gets its own meander. Bigger lines are
    settled first; any line left pointing at a removed stretch is re-attached to the nearest line."""
    accf = acc.ravel()
    owner = np.full(n * n, -1, np.int32)
    order = sorted(range(len(lines)), key=lambda k: -accf[lines[k]['cells'][-1]])
    for k in order:
        owner[lines[k]['cells']] = k
    offs = [(dj, di) for dj in range(-near_px, near_px + 1) for di in range(-near_px, near_px + 1)
            if dj * dj + di * di <= near_px * near_px]
    for k in order[::-1]:                         # smallest first: they join the bigger ones
        ln = lines[k]
        cells = ln['cells']
        for i in range(4, len(cells) - 2):
            c = int(cells[i])
            y, x = divmod(c, n)
            hit = -1
            for dj, di in offs:
                yy, xx = y + dj, x + di
                if 0 <= yy < n and 0 <= xx < n:
                    o = owner[yy * n + xx]
                    if o >= 0 and o != k and accf[yy * n + xx] >= accf[c]:
                        hit = yy * n + xx
                        break
            if hit >= 0:
                owner[cells[i + 1:]] = -1
                ln['cells'] = cells[:i + 1]
                ln['end'], ln['join'] = 'junction', hit
                break
    link(lines, n)
    for k, ln in enumerate(lines):               # orphans: re-attach to the nearest remaining line
        if ln['end'] == 'junction' and ln['parent'][0] < 0:
            y, x = divmod(int(ln['join']), n)
            best, bd = -1, 1e9
            for j, o in enumerate(lines):
                if j == k:
                    continue
                d = np.hypot(o['xy'][:, 0] - x - 0.5, o['xy'][:, 1] - y - 0.5)
                m = int(d.argmin())
                if d[m] < bd:
                    best, bd = o['cells'][m], d[m]
            if bd < 10:
                ln['join'] = best
    link(lines, n)
    return lines


def drop_against_flow(lines, n):
    """Childless tributaries that run into their river against its flow (an obtuse junction) go."""
    kids = link(lines, n)
    out = []
    for k, ln in enumerate(lines):
        pk, pi = ln['parent']
        if pk >= 0 and kids[k] == 0 and len(ln['xy']) > 4:
            p = lines[pk]['xy']
            t = ln['xy'][-1] - ln['xy'][max(0, len(ln['xy']) - 14)]
            d = p[min(pi + 12, len(p) - 1)] - p[max(pi - 2, 0)]
            cos = float(np.dot(t, d) / max(np.hypot(*t) * np.hypot(*d), 1e-6))
            if cos < RIVER['against_cos']:
                continue
        out.append(ln)
    link(out, n)
    return out


def moving_avg(xy, win):
    if win < 1 or len(xy) < 3:
        return xy.copy()
    k = 2 * win + 1
    padded = np.concatenate([np.repeat(xy[:1], win, 0), xy, np.repeat(xy[-1:], win, 0)])
    c = np.cumsum(np.vstack([np.zeros((1, 2)), padded]), 0)
    sm = (c[k:] - c[:-k]) / k
    sm[0], sm[-1] = xy[0], xy[-1]
    return sm


def shape_line(xy, win, flat, salt, size):
    """Smooth harder on flats (straight fill paths there) with a gentle meander that grows with the river
    (size 0..1: bigger rivers swing wider and longer downstream); steep courses stay put."""
    R = RIVER
    n = flat.shape[0]
    fl = flat[xy[:, 1].astype(int).clip(0, n - 1), xy[:, 0].astype(int).clip(0, n - 1)]
    fl = moving_avg(np.stack([fl, fl], 1), 6)[:, 0]
    small, big = moving_avg(xy, win), moving_avg(xy, win * 3)
    sm = small + (big - small) * fl[:, None]
    if len(sm) > 12:
        t = np.gradient(sm, axis=0)
        t /= np.maximum(np.hypot(t[:, 0], t[:, 1]), 1e-6)[:, None]
        arc = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(sm, axis=0).T))])
        phase = (salt * 2.399) % (2 * math.pi)
        lam = R['meander_len'] * (1 + R['meander_grow_len'] * size)
        cyc = np.concatenate([[0], np.cumsum(np.diff(arc) / lam[1:])])      # the wavelength grows along the river
        wave = np.sin(2 * math.pi * cyc + phase) + 0.45 * np.sin(2 * math.pi * cyc / 0.43 + 1.7 * phase)
        amp = R['meander_px'] + R['meander_grow_px'] * size ** 1.5
        taper = np.clip(np.minimum(arc, arc[-1] - arc) / (25.0 + 2 * amp), 0, 1)
        sm = sm + np.stack([-t[:, 1], t[:, 0]], 1) * (amp * fl * taper * wave)[:, None]
    return sm


def chaikin(sm, w, iters=2):
    for _ in range(iters):
        q = 0.75 * sm[:-1] + 0.25 * sm[1:]
        r = 0.25 * sm[:-1] + 0.75 * sm[1:]
        mid = np.empty((2 * len(q), 2))
        mid[0::2], mid[1::2] = q, r
        sm = np.vstack([sm[:1], mid, sm[-1:]])
        wq = 0.75 * w[:-1] + 0.25 * w[1:]
        wr = 0.25 * w[:-1] + 0.75 * w[1:]
        wm = np.empty(2 * len(wq))
        wm[0::2], wm[1::2] = wq, wr
        w = np.concatenate([w[:1], wm, w[-1:]])
    return sm, w


def widths(ln, acc):
    R = RIVER
    f = acc.ravel()[ln['cells']].astype(np.float64)
    t = np.clip(np.log(np.maximum(f, R['threshold']) / R['threshold']) / math.log(R['fref'] / R['threshold']), 0, 1)
    w = R['wmin'] + (R['wmax'] - R['wmin']) * t ** R['power']
    arc = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(ln['xy'], axis=0).T))])
    return w * (0.55 + 0.45 * smoothstep(0, R['src_taper_px'], arc))


def shape_all(lines, acc, flat):
    """Shaped polylines with widths. Tributaries end on their river a little downstream of where they met it,
    so every junction is acute and points downstream."""
    R = RIVER
    shaped = []
    for k, ln in enumerate(lines):
        big = acc.ravel()[ln['cells'][-1]] > 20 * R['threshold']
        w = widths(ln, acc)
        size = np.clip((w - R['wmin']) / (R['wmax'] - R['wmin']), 0, 1)
        sm = shape_line(ln['xy'], R['smooth'] * (2 if big else 1), flat, k + 1, size)
        shaped.append([sm, w])
    for k, ln in enumerate(lines):
        pk, pi = ln['parent']
        if pk < 0:
            continue
        psm, pw = shaped[pk]
        shift = R['join_shift'] + 1.5 * pw[min(pi, len(pw) - 1)]
        arc = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(psm, axis=0).T))])
        tgt = int(np.searchsorted(arc, arc[min(pi, len(arc) - 1)] + shift))
        tgt = min(tgt, len(psm) - 1)
        jpt = psm[tgt]
        sm, w = shaped[k]
        d = np.hypot(sm[:, 0] - psm[min(pi, len(psm) - 1), 0], sm[:, 1] - psm[min(pi, len(psm) - 1), 1])
        keep = max(2, int(np.nonzero(d >= shift * 0.8)[0][-1]) + 1 if (d >= shift * 0.8).any() else 2)
        shaped[k] = [np.vstack([sm[:keep], jpt[None]]), np.concatenate([w[:keep], [w[keep - 1]]])]
    return [chaikin(sm, w) for sm, w in shaped]


def draw(shaped, n):
    """River alpha and sky-highlight alpha (supersampled, round joints)."""
    R = RIVER
    S = R['supersample']
    img = Image.new('L', (n * S, n * S), 0)
    hi = Image.new('L', (n * S, n * S), 0)
    dr, dh = ImageDraw.Draw(img), ImageDraw.Draw(hi)
    for sm, w in shaped:
        for i in range(len(sm) - 1):
            (x0, y0), (x1, y1) = sm[i] * S, sm[i + 1] * S
            ww = 0.5 * (w[i] + w[i + 1]) * S
            dr.line([(x0, y0), (x1, y1)], fill=255, width=max(1, int(round(ww))))
            r = ww / 2
            dr.ellipse([x1 - r, y1 - r, x1 + r, y1 + r], fill=255)
            if ww > R['sky_from'] * S:
                hw = ww - 1.3 * S
                dh.line([(x0, y0), (x1, y1)], fill=255, width=max(1, int(round(hw))))
    a = np.asarray(img.resize((n, n), Image.BOX), np.float32) / 255
    h = np.asarray(hi.resize((n, n), Image.BOX), np.float32) / 255
    return a, h


def rivers(acc, hb, h, water, region, z_cells):
    """Everything: returns (alpha, highlight alpha, number of lines)."""
    from fields import blur
    n = acc.shape[0]
    lines = trace(acc, hb, water, region)
    lines = prune(lines, acc, n)
    lines = merge_mouths(lines, acc, n)
    lines = join_at_contact(lines, acc, n)
    lines = drop_against_flow(lines, n)
    lines = prune(lines, acc, n)
    gy, gx = np.gradient(blur(h, 4) * z_cells)
    flat = 1 - smoothstep(0.04, 0.15, np.hypot(gx, gy))
    shaped = shape_all(lines, acc, flat)
    a, hl = draw(shaped, n)
    return a, hl, len(lines)
