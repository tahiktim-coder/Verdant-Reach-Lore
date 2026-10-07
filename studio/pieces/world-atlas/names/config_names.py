"""Every tunable number for the names layer: fonts, inks, sizes, which places get names and marks, furniture.

All positions come from ../terrain/pois.json and labels.json (u, v in 0..1; the painter maps u, v -> pixels as
x = u * N, y = v * N on the 2048 x 2048 sheet, one terrain cell per pixel). Placements here are provisional.
"""

S = 4                     # supersampling for glyphs and marks (rendered at 4x, box-downsampled)

# ------------------------------------------------------------------ fonts --
# Downloaded from github.com/google/fonts (OFL, licences in fonts/OFL_*.txt).
CINZEL = dict(file='Cinzel[wght].ttf', var='Regular')
GARAMOND = dict(file='EBGaramond[wght].ttf', var='Medium')
GARAMOND_REG = dict(file='EBGaramond[wght].ttf', var='Regular')
GARAMOND_IT = dict(file='EBGaramond-Italic[wght].ttf', var='Italic')
GARAMOND_MIT = dict(file='EBGaramond-Italic[wght].ttf', var='Medium Italic')

# Pillow's basic layout ignores GPOS kerning, so the few pairs that show are kerned by hand (fraction of em).
KERN = {'Wa': -0.07, 'We': -0.06, 'To': -0.07, 'Ta': -0.07, 'Fo': -0.04, 'Fi': -0.01, 'Pe': -0.02, 'Ey': -0.03,
        'Vo': -0.05, 'ry': -0.01, 'ty': -0.01, 'Ca': -0.01, 'Gi': -0.01}

# ------------------------------------------------------------------- inks --
PALE = (242, 238, 226)          # halo target: the halo only lightens the local background toward this
INK = dict(
    minor=(44, 38, 33),         # minor names and every mark: one dark warm ink
    region=(58, 48, 40),        # region capitals: dark warm grey, low contrast
    sea=(21, 48, 72),           # sea names: deep sea blue
    hydro=(27, 62, 94),         # lake and river names
    furniture=(236, 230, 214),  # title, compass, scale bar, note: pale ivory on the deep sea
    rule=(58, 52, 46),          # the neatline frame on the paper margin
)

# Lettering styles. px = font size on the 2048 sheet. track = letter-spacing (em). word = extra word space (em).
# halo: k = how far toward PALE the background is lifted, r = dilation radius, blur, strength.
STYLE = dict(
    region=dict(font=CINZEL, px=54, track=0.20, word=0.30, ink='region', alpha=0.92,
                halo=dict(k=0.30, r=1, blur=1.0, strength=0.55)),
    sea_major=dict(font=GARAMOND_IT, px=58, track=0.30, word=0.35, ink='sea', alpha=0.80,
                   halo=dict(k=0.10, r=1, blur=1.0, strength=0.5)),
    sea=dict(font=GARAMOND_IT, px=50, track=0.20, word=0.25, ink='sea', alpha=0.80,
             halo=dict(k=0.10, r=1, blur=1.0, strength=0.5)),
    minor=dict(font=GARAMOND, px=34, track=0.02, word=0.0, ink='minor', alpha=0.95,
               halo=dict(k=0.42, r=1, blur=0.8, strength=0.85)),
    area=dict(font=GARAMOND, px=34, track=0.05, word=0.10, ink='minor', alpha=0.92,
              halo=dict(k=0.42, r=1, blur=0.8, strength=0.85)),
    small_it=dict(font=GARAMOND_IT, px=30, track=0.03, word=0.0, ink='minor', alpha=0.92,
                  halo=dict(k=0.42, r=1, blur=0.8, strength=0.85)),
    hydro=dict(font=GARAMOND_MIT, px=32, track=0.06, word=0.06, ink='hydro', alpha=0.95,
               halo=dict(k=0.25, r=1, blur=0.8, strength=0.6)),
)

# ------------------------------------------------------------------ marks --
MARK = dict(ink='minor', alpha=0.88, halo=dict(k=0.45, r=1, blur=0.9, strength=0.85))

# kind -> list of poi keys that get that mark (nothing else is marked)
MARKS = {
    'castle': ['castle_1', 'castle_2', 'castle_3', 'castle_4', 'castle_5', 'castle_6', 'castle_7', 'castle_8'],
    'castle_order': ['castle_order'],
    'city': ['eastern_city'],
    'spires': ['colossal_spires'],
    'hands': ['stone_hands'],
    'cavern': ['cavern_of_giants'],
    'swamp': ['toad_swamp'],
    'windmill': ['windmill_n', 'windmill_s'],
    'broken_tower': ['clockwork_tower_1', 'clockwork_tower_2', 'clockwork_tower_3'],
    'grove': ['crystal_grove_w', 'crystal_grove_e'],
    'spiral': ['storm_valley_w', 'storm_valley_e'],
    'flower': ['starbloom_fields'],
}

# --------------------------------------------------------------- the names --
# Point names: placed to the right of / below their mark (or the feature), never over a river, peak or label.
# kind: 'point' (has a mark), 'feature' (no mark, beside a painted feature), 'area' (over the area), lines for 2-line.
MINOR = [
    dict(key='castle_order', text='Castle of the Order', style='minor', kind='point'),
    dict(key='colossal_spires', text='Colossal Spires', style='minor', kind='point'),
    dict(key='stone_hands', text='Stone Hands', style='minor', kind='point'),
    dict(key='cavern_of_giants', text='Cavern of Giants', style='minor', kind='point'),
    dict(key='eastern_city', text='the eastern city', style='small_it', kind='point'),
    dict(key='starbloom_fields', text='Starbloom Fields', style='minor', kind='point'),
    dict(key='toad_swamp', text='Toad Swamp', style='minor', kind='point'),
    dict(key='silent_battlefield', text='Silent Battlefield', style='minor', kind='area', r=80, within=(12,),
         marks=['clockwork_tower_1', 'clockwork_tower_2', 'clockwork_tower_3']),
    dict(key='fire_dragon_peaks', text='Fire-Dragon Peaks', style='minor', kind='feature', r=95),
    dict(key='buried_machine', text='Mount of the Buried Machine', style='minor', kind='feature', r=70,
         lines=['Mount of the', 'Buried Machine']),
    dict(key='artifact_isles', text='Artifact Isles', style='minor', kind='feature', r=80, medium='sea'),
    dict(key='forest_of_eyes', text='Forest of Eyes', style='minor', kind='area', r=90),
    dict(key='wheat_country', text='the wheat country', style='area', kind='area', r=170, within=(7,)),
    dict(key='green_valleys', text='the green valleys', style='area', kind='area', r=150, within=(8,)),
    dict(key='mountain_path', text='the mountain path', style='minor', kind='pass', r=70),
    dict(key='east_gap', text='the low gap', style='minor', kind='pass', r=70),
]

LAKE = dict(key='still_water', lake_id=1, text='Still Water', style='hydro')
RIVER_NAME = dict(key='border_river', text='the border river', style='hydro', gap=5)

# Region and sea names: searched along gentle arcs. allow = region ids the letters may sit on (meta regions).
REGIONS = [   # angles: [(from, to, preferred)] in degrees, + = clockwise (down to the right)
    dict(key='verdant_reach', px=50, tracks=[0.14, 0.08, 0.04], text='THE VERDANT REACH', style='region', allow=(6, 7, 8, 9), anchor=(0.30, 0.50), reach=240.0,
         angles=[(-8, 8, 0)]),
    dict(key='eastern_kingdom', px=46, tracks=[0.12, 0.07, 0.03], text='THE EASTERN KINGDOM', style='region', allow=(10,), anchor=(0.68, 0.56), reach=240.0,
         angles=[(-10, 10, 0)]),
    dict(key='mage_kingdoms', px=36, tracks=[0.06, 0.03, 0.0], bows=[0.0, 0.04, 0.08], text='THE MAGE KINGDOMS', style='region', allow=(11,), anchor=(0.70, 0.745), reach=200.0,
         angles=[(-8, 30, 8)]),
    dict(key='northern_lands', px=44, tracks=[0.14, 0.08, 0.04], text='THE NORTHERN LANDS', style='region', allow=(4,), anchor=(0.53, 0.22),
         angles=[(-8, 8, 0)], bows=[0.0, 0.03, 0.06]),
    dict(key='unknown_sea', text='THE UNKNOWN SEA', style='sea_major', allow=(0,), anchor=(0.45, 0.10), sea=True,
         angles=[(-3, 3, 0)], bows=[0.0, 0.03, 0.06]),
    dict(key='western_sea', text='the Western Sea', style='sea', allow=(1,), anchor=(0.08, 0.50), sea=True,
         angles=[(-90, -76, -84), (-12, 12, 0)]),
    dict(key='eastern_sea', text='the Eastern Sea', style='sea', allow=(3,), anchor=(0.90, 0.55), sea=True,
         angles=[(-90, -76, -84), (-12, 12, 0)]),
]

# Search weights (lower total wins). Fractions are of the label's dilated ink area.
W = dict(river=60.0, peak=30.0, wrong_ground=40.0, contrast=0.020, dist=1.0, steep=1.2, near=1.0, within=4.0)

# -------------------------------------------------------------- furniture --
FRAME = dict(paper=(234, 230, 220), map_inset=40, inner_w=1.3, gap=6, outer_w=2.4, safe=26)
TITLE = dict(text='THE VERDANT REACH', sub='and the lands around it', note='A working atlas. Every placement is provisional.',
             title_px=50, title_track=0.16, sub_px=32, note_px=24, corner='bottom_left', at=(0.205, 0.905))
SCALE = dict(px_per_league=8.0, leagues=50, step=10, label='leagues', bar_h=6)   # 1 league = 3 miles (proposal)
COMPASS = dict(at=(0.915, 0.095), r=44)
