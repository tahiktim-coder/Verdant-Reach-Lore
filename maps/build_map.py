"""Generates the draft Verdant Reach world map (verdant-reach-map-draft.svg).

Run: python build_map.py
Edit the coordinates below to move regions/places; output is deterministic (seeded).
"""
import math
import random

random.seed(7)

W, H = 1700, 1160
OX = 100  # land group x-offset

INK = "#3b2f22"
LAND = "#efe3c6"
SEA = "#b8cac4"
PAPER = "#e6d7b5"

# ---------- geometry helpers ----------

def jitter_poly(points, depth=4, rough=0.16):
    pts = points[:]
    for _ in range(depth):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            out.append(a)
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dy)
            nx, ny = -dy / (length or 1), dx / (length or 1)
            off = random.uniform(-1, 1) * length * rough
            out.append((mx + nx * off, my + ny * off))
        pts = out
    return pts


def inside(pt, poly):
    x, y = pt
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi:
            c = not c
        j = i
    return c


def path_d(pts, close=True):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return d + (" Z" if close else "")


def along(line, step):
    """Yield points spaced ~step along a polyline."""
    for (x1, y1), (x2, y2) in zip(line, line[1:]):
        n = max(1, int(math.hypot(x2 - x1, y2 - y1) / step))
        for k in range(n):
            t = k / n
            yield x1 + (x2 - x1) * t, y1 + (y2 - y1) * t


def scatter(poly, count, coast):
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    got, tries = [], 0
    while len(got) < count and tries < count * 60:
        tries += 1
        p = (random.uniform(min(xs), max(xs)), random.uniform(min(ys), max(ys)))
        if inside(p, poly) and inside(p, coast):
            got.append(p)
    return got

# ---------- icons ----------

def mountain(x, y, s, fill=LAND, shade="#b9a37a"):
    return (
        f'<path d="M{x-s*0.55:.1f},{y:.1f} L{x:.1f},{y-s:.1f} L{x+s*0.55:.1f},{y:.1f}" fill="{fill}" stroke="{INK}" stroke-width="1.3" stroke-linejoin="round"/>'
        f'<path d="M{x:.1f},{y-s:.1f} L{x+s*0.55:.1f},{y:.1f} L{x+s*0.08:.1f},{y:.1f} Z" fill="{shade}" opacity="0.75"/>'
        f'<path d="M{x-s*0.18:.1f},{y-s*0.68:.1f} L{x:.1f},{y-s:.1f} L{x+s*0.2:.1f},{y-s*0.64:.1f}" fill="none" stroke="{INK}" stroke-width="0.9"/>'
    )


def tree(x, y, s=9, fill="#8fa66e"):
    return (
        f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x:.1f}" y2="{y-s*0.5:.1f}" stroke="{INK}" stroke-width="1"/>'
        f'<ellipse cx="{x:.1f}" cy="{y-s*0.9:.1f}" rx="{s*0.55:.1f}" ry="{s*0.7:.1f}" fill="{fill}" stroke="{INK}" stroke-width="0.9"/>'
    )


def crystal_tree(x, y, s=14):
    return (
        f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y-s}" stroke="{INK}" stroke-width="1.4"/>'
        f'<path d="M{x},{y-s*1.9} L{x+s*0.45},{y-s*1.2} L{x},{y-s*0.7} L{x-s*0.45},{y-s*1.2} Z" fill="#7fb3d6" stroke="{INK}" stroke-width="1"/>'
        f'<path d="M{x-s*0.5},{y-s*0.9} l-{s*0.25},-{s*0.35} l{s*0.25},-{s*0.3} l{s*0.2},{s*0.32} Z" fill="#a9d0e8" stroke="{INK}" stroke-width="0.8"/>'
        f'<path d="M{x+s*0.5},{y-s*0.9} l{s*0.25},-{s*0.35} l-{s*0.25},-{s*0.3} l-{s*0.2},{s*0.32} Z" fill="#a9d0e8" stroke="{INK}" stroke-width="0.8"/>'
    )


def castle(x, y, s=1.0, flag="#9b2d2a"):
    k = s
    return (
        f'<g transform="translate({x},{y}) scale({k})">'
        f'<path d="M-9,0 V-9 H-7 V-11 H-5 V-9 H-3 V-11 H-1 V-9 H1 V-11 H3 V-9 H5 V-11 H7 V-9 H9 V0 Z" fill="{LAND}" stroke="{INK}" stroke-width="1.1"/>'
        f'<path d="M-3,-11 V-19 H3 V-11" fill="{LAND}" stroke="{INK}" stroke-width="1.1"/>'
        f'<path d="M0,-19 V-25 L6,-23 L0,-21" fill="{flag}" stroke="{INK}" stroke-width="0.8"/>'
        f'<path d="M-2,0 V-4 A2,2 0 0 1 2,-4 V0" fill="{INK}"/>'
        f'</g>'
    )


def swirl(x, y, r=16, color="#6b5596"):
    pts = []
    for i in range(60):
        t = i / 59 * 4 * math.pi
        rr = r * (i / 59)
        pts.append((x + rr * math.cos(t), y + rr * math.sin(t)))
    return f'<path d="{path_d(pts, close=False)}" fill="none" stroke="{color}" stroke-width="1.6" stroke-linecap="round"/>'


def ruin(x, y):
    return (
        f'<g stroke="{INK}" stroke-width="1.2" fill="{LAND}">'
        f'<rect x="{x-9}" y="{y-12}" width="4" height="12"/>'
        f'<rect x="{x-2}" y="{y-17}" width="4" height="17"/>'
        f'<path d="M{x+5},{y} V{y-8} L{x+9},{y-10} V{y} Z"/>'
        f'<line x1="{x-12}" y1="{y}" x2="{x+12}" y2="{y}"/></g>'
    )


def spire(x, y, s=34):
    return (
        f'<path d="M{x-4},{y} L{x},{y-s} L{x+4},{y} Z" fill="#d8c9a6" stroke="{INK}" stroke-width="1.1"/>'
        f'<line x1="{x}" y1="{y-s}" x2="{x}" y2="{y}" stroke="{INK}" stroke-width="0.5" opacity="0.6"/>'
    )


def flower(x, y, s=7, color="#d98fb0"):
    petals = "".join(
        f'<circle cx="{x + s*0.8*math.cos(a):.1f}" cy="{y + s*0.8*math.sin(a):.1f}" r="{s*0.55:.1f}" fill="{color}" stroke="{INK}" stroke-width="0.6"/>'
        for a in [i * math.pi * 2 / 5 for i in range(5)]
    )
    return petals + f'<circle cx="{x}" cy="{y}" r="{s*0.45:.1f}" fill="#7fb3d6" stroke="{INK}" stroke-width="0.6"/>'


def sword(x, y, s=12):
    return (
        f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y-s}" stroke="{INK}" stroke-width="1.1"/>'
        f'<line x1="{x-3}" y1="{y-s*0.7}" x2="{x+3}" y2="{y-s*0.7}" stroke="{INK}" stroke-width="1.1"/>'
    )


def clock_tower(x, y):
    return (
        f'<rect x="{x-5}" y="{y-28}" width="10" height="28" fill="{LAND}" stroke="{INK}" stroke-width="1.1"/>'
        f'<path d="M{x-6},{y-28} L{x},{y-36} L{x+6},{y-28} Z" fill="#b9a37a" stroke="{INK}" stroke-width="1"/>'
        f'<circle cx="{x}" cy="{y-20}" r="3.2" fill="none" stroke="{INK}" stroke-width="1"/>'
        f'<line x1="{x}" y1="{y-20}" x2="{x+2}" y2="{y-21.5}" stroke="{INK}" stroke-width="0.8"/>'
    )


def mage_city(x, y, r=6):
    star = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        star.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    return (
        f'<circle cx="{x}" cy="{y}" r="{r+3}" fill="{LAND}" stroke="{INK}" stroke-width="1.1"/>'
        f'<path d="{path_d(star)}" fill="#8a5fa6"/>'
    )


def swamp(x, y):
    return (
        f'<g stroke="#4f6b4a" stroke-width="1.1" fill="none">'
        f'<line x1="{x-10}" y1="{y}" x2="{x+10}" y2="{y}"/>'
        f'<line x1="{x-6}" y1="{y+4}" x2="{x+6}" y2="{y+4}"/>'
        f'<path d="M{x-3},{y} V{y-6} M{x},{y} V{y-8} M{x+3},{y} V{y-5}"/></g>'
    )


def cave(x, y):
    return (
        f'<path d="M{x-12},{y} Q{x-12},{y-16} {x},{y-16} Q{x+12},{y-16} {x+12},{y} Z" fill="#b9a37a" stroke="{INK}" stroke-width="1.2"/>'
        f'<path d="M{x-6},{y} Q{x-6},{y-9} {x},{y-9} Q{x+6},{y-9} {x+6},{y} Z" fill="{INK}"/>'
    )


def stone_hand(x, y):
    fingers = "".join(
        f'<rect x="{x-9+i*4.6:.1f}" y="{y-24+abs(i-1.5)*3:.1f}" width="3.6" height="{14-abs(i-1.5)*3:.1f}" rx="1.8" fill="#cbbd9c" stroke="{INK}" stroke-width="0.9"/>'
        for i in range(4)
    )
    return fingers + f'<path d="M{x-10},{y} V{y-12} H{x+9} V{y} Z" fill="#cbbd9c" stroke="{INK}" stroke-width="1"/>' \
        f'<rect x="{x+9}" y="{y-14}" width="3.6" height="9" rx="1.8" transform="rotate(30 {x+10} {y-10})" fill="#cbbd9c" stroke="{INK}" stroke-width="0.9"/>'


def egg_stone(x, y):
    return (
        f'<ellipse cx="{x}" cy="{y-12}" rx="9" ry="12" fill="#cbbd9c" stroke="{INK}" stroke-width="1.2"/>'
        f'<path d="M{x-4},{y-18} l3,4 l-2,3 l3,4" fill="none" stroke="{INK}" stroke-width="0.8"/>'
    )


def eye_tree(x, y):
    return (
        f'<path d="M{x},{y} V{y-12}" stroke="{INK}" stroke-width="2"/>'
        f'<path d="M{x},{y-10} q-8,-4 -11,-12 M{x},{y-12} q7,-5 10,-13" stroke="{INK}" stroke-width="1.3" fill="none"/>'
        f'<ellipse cx="{x}" cy="{y-22}" rx="13" ry="10" fill="#5d6b45" stroke="{INK}" stroke-width="1"/>'
        f'<ellipse cx="{x}" cy="{y-22}" rx="6" ry="3.5" fill="#f2e6c9" stroke="{INK}" stroke-width="0.8"/>'
        f'<circle cx="{x}" cy="{y-22}" r="2.2" fill="#9b2d2a"/>'
    )


def dragon_mark(x, y):
    return f'<path d="M{x-10},{y} q6,-10 10,-4 q4,-12 12,-6 q-6,2 -6,8 q-4,-3 -8,2 Z" fill="#b5412f" stroke="{INK}" stroke-width="0.9"/>'


def cloud(x, y, s=1.0, fill="#f4ecd9"):
    return (
        f'<g transform="translate({x},{y}) scale({s})" fill="{fill}" stroke="{INK}" stroke-width="1.1">'
        f'<path d="M-40,10 Q-46,-6 -30,-8 Q-28,-24 -10,-20 Q0,-34 16,-22 Q34,-26 34,-8 Q48,-4 40,10 Z"/></g>'
    )


def label(x, y, text, size=14, cls="place", rotate=0, anchor="middle"):
    rot = f' transform="rotate({rotate} {x} {y})"' if rotate else ""
    return f'<text x="{x}" y="{y}" class="{cls}" font-size="{size}" text-anchor="{anchor}"{rot}>{text}</text>'

# ---------- land ----------

COAST_BASE = [
    (170, 200), (250, 140), (360, 120), (430, 72), (500, 110), (620, 95), (700, 62),
    (770, 95), (900, 72), (980, 42), (1060, 85), (1200, 80), (1300, 112), (1370, 92),
    (1440, 160), (1430, 245), (1462, 330), (1490, 430), (1565, 465), (1545, 525),
    (1460, 545), (1430, 620), (1400, 665), (1415, 760), (1452, 820), (1380, 862),
    (1300, 872), (1255, 960), (1205, 935), (1100, 950), (1020, 940), (945, 990),
    (880, 960), (790, 950), (730, 890), (690, 870), (650, 930), (600, 985), (520, 975),
    (440, 958), (380, 992), (300, 965), (230, 955), (200, 965), (150, 900), (160, 830),
    (115, 785), (52, 745), (42, 690), (110, 678), (125, 620), (100, 500), (62, 452),
    (82, 402), (115, 390), (130, 280),
]
COAST = jitter_poly(COAST_BASE, depth=5, rough=0.13)

WALL = [(170, 300), (300, 318), (420, 335), (560, 300), (720, 322), (880, 290),
        (1050, 312), (1220, 282), (1380, 300), (1440, 290)]
REACH_BORDER = [(720, 322), (760, 450), (700, 560), (742, 680), (700, 800), (705, 872)]
WAR_BORDER = [(1180, 288), (1150, 420), (1200, 540), (1170, 650), (1262, 722), (1420, 705)]

NORTH_POLY = [(0, 0), (1700, 0), (1700, 300)] + WALL[::-1] + [(0, 300)]
REACH_POLY = [(0, 300)] + WALL[:5] + REACH_BORDER[1:] + [(705, 1160), (0, 1160)]
WAR_POLY = WAR_BORDER + [(1700, 705), (1700, 288)]
MAGE_POLY = [(720, 322), (880, 290), (1050, 312), (1180, 288)] + WAR_BORDER[1:] + \
    [(1700, 705), (1700, 1160), (705, 1160)] + REACH_BORDER[::-1][:-1]


def build():
    out = []
    a = out.append
    a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">')
    a("""<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&amp;family=IM+Fell+English:ital@0;1&amp;display=swap');
text { fill: #3b2f22; paint-order: stroke; stroke: #efe3c6; stroke-width: 4px; stroke-linejoin: round; }
.region { font-family: Cinzel, 'Trajan Pro', Georgia, serif; font-weight: 700; letter-spacing: 6px; }
.sub { font-family: 'IM Fell English', Georgia, serif; font-style: italic; }
.place { font-family: 'IM Fell English', Georgia, serif; }
.prov { font-family: 'IM Fell English', Georgia, serif; font-style: italic; fill: #7a6a52; }
.sea { font-family: 'IM Fell English', Georgia, serif; font-style: italic; fill: #44595a; stroke: #b8cac4; letter-spacing: 3px; }
.title { font-family: Cinzel, Georgia, serif; font-weight: 700; letter-spacing: 10px; stroke: #e6d7b5; }
.legend text { stroke: #efe3c6; }
</style>""")
    a(f'<defs><clipPath id="land"><path d="{path_d([(x+OX, y) for x, y in COAST])}"/></clipPath>'
      f'<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>'
      f'<feColorMatrix values="0 0 0 0 0.23  0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0.06 0"/>'
      f'<feComposite in2="SourceGraphic" operator="in"/></filter></defs>')

    # sea + frame
    a(f'<rect width="{W}" height="{H}" fill="{PAPER}"/>')
    a(f'<rect x="14" y="14" width="{W-28}" height="{H-28}" fill="{SEA}" stroke="{INK}" stroke-width="2.5"/>')
    a(f'<rect x="22" y="22" width="{W-44}" height="{H-44}" fill="none" stroke="{INK}" stroke-width="0.8"/>')

    # waves
    shifted = [(x + OX, y) for x, y in COAST]
    for _ in range(170):
        x, y = random.uniform(40, W - 40), random.uniform(40, H - 40)
        if not inside((x, y), shifted) and all(math.hypot(x - px, y - py) > 28 for px, py in shifted[::6]):
            a(f'<path d="M{x-7:.0f},{y:.0f} q3.5,-4 7,0 t7,0" fill="none" stroke="#6f8984" stroke-width="1" opacity="0.7"/>')

    # coastline ripple rings
    for i, (w, op) in enumerate([(14, 0.18), (8, 0.3)]):
        a(f'<path d="{path_d(shifted)}" fill="none" stroke="#6f8984" stroke-width="{w}" opacity="{op}" stroke-linejoin="round"/>')

    # land
    a(f'<g transform="translate({OX},0)">')
    a(f'<path d="{path_d(COAST)}" fill="{LAND}" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>')
    a('</g>')

    # region washes (clipped to land, absolute coords)
    a('<g clip-path="url(#land)">')
    for poly, color, op in [(NORTH_POLY, "#9fbfd9", 0.38), (REACH_POLY, "#93b878", 0.36),
                            (WAR_POLY, "#9b8f7e", 0.42), (MAGE_POLY, "#c6a6cf", 0.32)]:
        a(f'<path d="{path_d([(x+OX, y) for x, y in poly])}" fill="{color}" opacity="{op}"/>')
    a(f'<rect width="{W}" height="{H}" filter="url(#rough)"/>')
    a('</g>')

    a(f'<g transform="translate({OX},0)">')

    # borders
    for line, color, dash, w in [(REACH_BORDER, "#3f6b34", "10 6", 2.2), (WAR_BORDER, "#5b4a3a", "10 6", 2.2)]:
        a(f'<path d="{path_d(line, close=False)}" fill="none" stroke="{color}" stroke-width="{w}" stroke-dasharray="{dash}"/>')
    for line in [[(560, 105), (575, 296)], [(880, 80), (885, 290)], [(1160, 90), (1150, 285)],
                 [(742, 680), (900, 640), (1170, 650)], [(900, 640), (930, 800), (1000, 948)],
                 [(760, 450), (900, 520), (1150, 470)]]:
        a(f'<path d="{path_d(line, close=False)}" fill="none" stroke="{INK}" stroke-width="1" stroke-dasharray="2 4" opacity="0.6"/>')

    # rivers
    for river in [
        [(330, 770), (290, 700), (240, 640), (190, 600), (125, 590)],
        [(420, 340), (450, 430), (520, 520), (560, 640), (610, 760), (680, 868)],
        [(470, 800), (520, 860), (540, 940), (560, 978)],
        [(850, 300), (830, 420), (870, 560), (810, 700), (760, 900)],
        [(1100, 320), (1060, 480), (1110, 620), (1100, 780), (1090, 935)],
        [(640, 320), (610, 230), (650, 150), (640, 98)],
        [(1020, 300), (1060, 200), (1010, 120), (1030, 78)],
    ]:
        pts = jitter_poly(river, depth=3, rough=0.08)[: len(river) * 8 - 7]
        a(f'<path d="{path_d(pts, close=False)}" fill="none" stroke="#5d8a9c" stroke-width="1.8" stroke-linecap="round"/>')

    icons = []  # (y, svg) — drawn sorted by y for overlap

    # northern mountain wall (two staggered rows)
    for x, y in along(WALL, 17):
        icons.append((y + 6, mountain(x + random.uniform(-4, 4), y + 6 + random.uniform(-3, 3), random.uniform(26, 40), fill="#f3ebd8")))
    for x, y in along(WALL[1:-1], 26):
        icons.append((y - 12, mountain(x + 9, y - 12 + random.uniform(-3, 3), random.uniform(22, 32), fill="#f3ebd8")))

    # alpine heartland
    for line in [[(215, 785), (300, 762), (380, 772), (450, 805)], [(250, 860), (330, 845), (410, 862)]]:
        for x, y in along(line, 19):
            icons.append((y, mountain(x + random.uniform(-4, 4), y + random.uniform(-4, 4), random.uniform(22, 32), fill="#f6f0e0")))

    # fire-dragon peaks
    for x, y in along([(900, 470), (960, 440), (1030, 435), (1080, 480)], 20):
        icons.append((y, mountain(x, y + random.uniform(-3, 3), random.uniform(26, 36), fill="#e9c9a8", shade="#b5412f")))
    icons.append((420, dragon_mark(990, 400)))

    # buried machine mountain
    icons.append((800, mountain(1250, 800, 52, fill="#e7dcc4")))
    icons.append((791, f'<circle cx="1250" cy="782" r="6" fill="none" stroke="{INK}" stroke-width="1.3"/>'
                  f'<path d="M1250,774 V790 M1242,782 H1258" stroke="{INK}" stroke-width="1"/>'))

    # eastern warland hills

    # forests
    forests = [
        ([(150, 590), (330, 580), (330, 700), (150, 700)], 45, "#7f9a5e"),   # Eye-Tree wood
        ([(470, 640), (650, 600), (680, 760), (500, 760)], 45, "#8fa66e"),
        ([(560, 380), (700, 360), (720, 480), (600, 500)], 30, "#8fa66e"),
        ([(780, 385), (860, 385), (870, 460), (790, 465)], 18, "#8fa66e"),
        ([(760, 770), (870, 760), (860, 830), (770, 840)], 18, "#8fa66e"),
        ([(330, 130), (560, 120), (560, 260), (330, 270)], 25, "#6f8a6a"),   # northern pines
        ([(1200, 110), (1330, 150), (1330, 260), (1190, 250)], 22, "#6f8a6a"),
    ]
    for poly, n, col in forests:
        for x, y in scatter(poly, n, COAST):
            icons.append((y, tree(x, y, random.uniform(8, 11), col)))

    # north: crystal groves & storm valleys
    for x, y in [(400, 210), (450, 240), (820, 170), (790, 200), (1260, 205)]:
        icons.append((y, crystal_tree(x, y)))
    for x, y, r in [(660, 250, 18), (1100, 185, 22), (1150, 135, 14), (250, 240, 14)]:
        icons.append((y + 30, swirl(x, y, r)))

    # reach: castles
    for x, y in [(260, 400), (450, 430), (560, 560), (380, 560), (660, 420), (170, 735),
                 (420, 740), (380, 905), (480, 905), (600, 700), (200, 880), (640, 820), (520, 395)]:
        icons.append((y, castle(x, y)))

    # reach: special places
    for x, y in [(520, 630), (545, 618), (560, 650)]:
        icons.append((y, spire(x, y)))
    for x, y in [(390, 385), (420, 375), (440, 400), (470, 382), (360, 400)]:
        icons.append((y, flower(x, y)))
    icons.append((862, cave(505, 862)))
    icons.append((500, stone_hand(640, 505)))
    icons.append((680, eye_tree(235, 680)))
    for x, y in [(590, 905), (615, 925), (575, 935), (630, 900)]:
        icons.append((y, swamp(x, y)))
    icons.append((560, egg_stone(250, 560)))

    # mage kingdoms
    cities = [(820, 600), (980, 560), (1100, 700), (880, 860), (1000, 880), (1180, 860)]
    for x, y in cities:
        icons.append((y, mage_city(x, y)))

    # warland
    for x, y in [(1240, 440), (1300, 465), (1370, 445)]:
        icons.append((y, clock_tower(x, y)))
    for i in range(60):
        x, y = 1250 + (i % 12) * 12 + random.uniform(-2, 2), 590 + (i // 12) * 14 + random.uniform(-2, 2)
        icons.append((y, sword(x, y)))
    for x, y in [(1215, 545), (1400, 545), (1228, 692)]:
        icons.append((y, ruin(x, y)))
    for x, y in [(1305, 552)]:
        icons.append((y, f'<g transform="translate({x},{y}) rotate(-25)">' +
                      f'<path d="M-16,0 L-4,-26 L8,-26 L16,0 Z" fill="#cdbfa3" stroke="{INK}" stroke-width="1.2"/>'
                      f'<circle cx="2" cy="-30" r="6" fill="#cdbfa3" stroke="{INK}" stroke-width="1.2"/></g>'))

    for _, svg in sorted(icons, key=lambda t: t[0]):
        a(svg)

    # vampire network (hidden)
    net = cities + [(1345, 990)]
    for (x1, y1), (x2, y2) in [(net[0], net[1]), (net[1], net[2]), (net[2], net[5]), (net[3], net[4]),
                               (net[4], net[5]), (net[0], net[3]), (net[5], net[6])]:
        a(f'<path d="M{x1},{y1} Q{(x1+x2)/2+20},{(y1+y2)/2-30} {x2},{y2}" fill="none" stroke="#8b1e2b" stroke-width="1.3" stroke-dasharray="1 4" stroke-linecap="round" opacity="0.85"/>')

    # ---- labels ----
    a(label(780, 205, "THE NORTHERN LANDS", 30, "region"))
    a(label(780, 232, "too much magic — wild currents, crystal casters", 15, "sub"))
    a(label(560, 262, "The Four Kingdoms (provisional)", 13, "prov"))
    a(label(1110, 228, "Storm Valleys", 14, "place"))
    a(label(420, 268, "Sacred Crystal Groves", 13, "place"))
    a(label(800, 360, "THE GREAT MOUNTAIN WALL", 13, "sub"))

    a(label(440, 488, "THE VERDANT REACH", 34, "region", rotate=-4))
    a(label(445, 514, "castles, not countries · little ambient magic, much magical life", 14, "sub", rotate=-4))
    a(label(420, 362, "Field of the Mana Flowers", 14, "place"))
    a(label(545, 676, "The Colossal Spires", 14, "place"))
    a(label(505, 880, "Cavern of Giants", 13, "place"))
    a(label(640, 525, "The Stone Hands", 13, "place"))
    a(label(235, 700, "The Eye-Tree", 13, "place"))
    a(label(250, 578, "Ruins of the Stone Egg", 12, "place"))
    a(label(250, 593, "(First Quest)", 11, "prov"))
    a(label(330, 822, "GREEN VALLEY HEARTLAND", 15, "region"))
    a(label(330, 940, "alpine castlelands · cradle of the knights", 13, "sub"))
    a(label(608, 958, "Toad Swamp", 13, "place"))

    a(label(965, 740, "THE MAGE KINGDOMS", 30, "region"))
    a(label(965, 766, "the South — rich, stable magic", 15, "sub"))
    a(label(990, 503, "Fire-Dragon Peaks", 14, "place"))
    a(label(1250, 820, "Mount of the", 13, "place"))
    a(label(1250, 836, "Buried Machine", 13, "place"))

    a(label(1320, 352, "THE SILENT", 20, "region"))
    a(label(1320, 376, "BATTLEFIELD", 20, "region"))
    a(label(1305, 490, "Clockwork Towers", 13, "place"))
    a(label(1315, 675, "Endless Sword Fields", 13, "place"))
    a(label(1310, 578, "avoided · a war no one remembers", 12, "sub"))

    a(label(720, 905, "The Gulf", 13, "sub"))

    a('</g>')

    # ---- sea features (absolute) ----
    for isle, cx, cy, r in [("hg", 120, 610, 22)]:
        pts = jitter_poly([(cx + r * math.cos(t), cy + r * 0.8 * math.sin(t)) for t in [i * math.pi / 4 for i in range(8)]], 3, 0.18)
        a(f'<path d="{path_d(pts)}" fill="{LAND}" stroke="{INK}" stroke-width="1.6"/>')
    a(f'<path d="M113,600 h14 l-14,18 h14 Z" fill="#cbbd9c" stroke="{INK}" stroke-width="1"/>')
    a(label(120, 650, "Hourglass Isle", 14, "place"))

    pirate_isles = [(1450, 1000, 34), (1540, 960, 24), (1600, 1030, 20), (1390, 1065, 16), (1500, 1070, 14)]
    for cx, cy, r in pirate_isles:
        pts = jitter_poly([(cx + r * math.cos(t), cy + r * 0.7 * math.sin(t)) for t in [i * math.pi / 4 for i in range(8)]], 3, 0.2)
        a(f'<path d="{path_d(pts)}" fill="{LAND}" stroke="{INK}" stroke-width="1.6"/>')
    a(f'<path d="M1450,995 V975 M1450,977 l10,4 l-10,4" fill="#2b2b2b" stroke="{INK}" stroke-width="1.2"/>')
    a(label(1500, 925, "THE ARTIFACT ISLES", 16, "region"))
    a(label(1500, 945, "a kingdom built by pirates", 13, "sub"))

    a(cloud(1600, 120, 1.2, "#d9d4e6"))
    for i in range(3):
        a(f'<path d="M{1585+i*14},{128} l-6,14 h7 l-6,14" fill="none" stroke="#6b5596" stroke-width="1.6"/>')
    a(label(1600, 190, "Storm-Wyrm Nests", 14, "sea"))

    a(cloud(120, 105, 1.1))
    a(cloud(175, 85, 0.7))
    a(label(130, 150, "Cloud Kingdoms", 14, "sea"))
    a(label(130, 168, "somewhere above", 12, "sea"))

    a(label(70, 860, "THE WESTERN SEA", 15, "sea", rotate=-90))
    a(label(1640, 840, "THE EASTERN SEA", 15, "sea", rotate=90))

    # compass rose
    cx, cy = 120, 330
    a(f'<circle cx="{cx}" cy="{cy}" r="38" fill="none" stroke="{INK}" stroke-width="1"/>'
      f'<circle cx="{cx}" cy="{cy}" r="31" fill="none" stroke="{INK}" stroke-width="0.6"/>')
    for ang, ln, fill in [(0, 46, INK), (90, 34, LAND), (180, 34, LAND), (270, 34, LAND),
                          (45, 22, LAND), (135, 22, LAND), (225, 22, LAND), (315, 22, LAND)]:
        a(f'<path d="M{cx},{cy-ln} L{cx+6},{cy} L{cx},{cy+6} L{cx-6},{cy} Z" fill="{fill}" stroke="{INK}" stroke-width="1" transform="rotate({ang} {cx} {cy})"/>')
    a(label(cx, cy - 52, "N", 16, "region"))

    # ---- bottom band: legend, title, unplaced ----
    a(f'<g class="legend"><rect x="36" y="1012" width="470" height="118" fill="{LAND}" stroke="{INK}" stroke-width="1.4" rx="3"/>')
    a(label(271, 1034, "LEGEND", 14, "region"))
    rows = [
        (castle(60, 1062, 0.8), "Verdant castle"), (mountain(60, 1088, 22), "Mountains"),
        (tree(60, 1118, 10), "Forest"), (crystal_tree(212, 1068, 10), "Crystal grove (North)"),
        (swirl(212, 1080, 9), "Magic storm"), (ruin(212, 1120), "Ruin / ancient relic"),
        (mage_city(370, 1056, 5), "Mage city"),
        (f'<path d="M354,1082 h32" stroke="#8b1e2b" stroke-width="1.6" stroke-dasharray="1 4" stroke-linecap="round"/>', "Vampire network"),
        (f'<path d="M354,1108 h32" stroke="#3f6b34" stroke-width="2" stroke-dasharray="8 5"/>', "Region border"),
    ]
    for i, (icon, txt) in enumerate(rows):
        col, row = i // 3, i % 3
        a(icon)
        tx = [80, 232, 394][col]
        ty = [1062, 1088, 1114][row]
        a(f'<text x="{tx}" y="{ty}" class="place" font-size="12.5">{txt}</text>')
    a('</g>')

    a(label(770, 1068, "VERDANT REACH", 36, "title"))
    a(label(770, 1098, "a first sketch of the known world — every placement provisional", 15, "sub"))

    a(f'<g class="legend"><rect x="1050" y="1012" width="310" height="118" fill="{LAND}" stroke="{INK}" stroke-width="1.4" rx="3"/>')
    a(label(1205, 1034, "NOT YET ON THE MAP", 13, "region"))
    for i, t in enumerate(["The Luminous Archive · Valley of Forgotten Gods",
                           "Abyssal Depths · legendary warden sites",
                           "Lands of the parallel-dimension order",
                           "Homelands of elves, dwarves, Stonefolk…"]):
        a(f'<text x="1205" y="{1058 + i*20}" class="place" font-size="12.5" text-anchor="middle">{t}</text>')
    a('</g>')

    a('</svg>')
    return "\n".join(out)


if __name__ == "__main__":
    with open("verdant-reach-map-draft.svg", "w", encoding="utf-8") as f:
        f.write(build())
    print("wrote verdant-reach-map-draft.svg")
