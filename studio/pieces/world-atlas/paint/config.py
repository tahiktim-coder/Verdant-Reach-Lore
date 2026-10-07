"""DATA for the atlas painter: every tunable number in one place (edit here, rerun paint.py)."""

SEED = 9311

LIGHT = dict(azimuth=315.0, altitude=40.0)        # one light, north-west, 40 degrees up

RELIEF = dict(
    z_cells=118.0,          # 1.0 of height = this many cells of the 2048 grid (the land is drawn at 0.70 scale)
    slope_knee=1.4,         # slope tone-map: steep faces stop darkening past this slope
    # shading scales: (height smoothing px, weight, exaggeration, extra exaggeration on the lowland).
    scales=[(1.0, 0.35, 1.15, 2.6), (3.2, 0.33, 1.6, 3.0), (9.0, 0.24, 2.6, 3.4), (24.0, 0.08, 5.0, 2.0)],
    shade_soften=0.5,       # blur of the final shade (px)
    shadow_rgb=(0.30, 0.33, 0.50),   # what a fully shaded face multiplies the tint by (cool)
    shadow_strength=1.0,
    light_rgb=(255, 247, 224),       # warm light that lit faces lift toward
    highlight=0.50,
    contrast_low=0.70,      # shading contrast on the lowland ...
    contrast_high=1.0,      # ... and on the high ground (aerial perspective: peaks crisp, lowland soft)
    contrast_forest=0.28,   # extra shading contrast under canopy (woods take the light like the ground)
    slope_dark=0.10,        # aspect-free darkening of steep ground
    valley_dark=0.12,       # concave ground (valleys) darker
    ridge_light=0.16,       # convex crests lighter (high ground only)
    river_calm=0.75,        # how much the channel's own shading (dark edge) is calmed under a river
)

# lowland micro-relief added to the shading only: soft hills and low swells at 10-40 px
MICRO = dict(amp=0.0034, ridge_amp=0.0016, cells=(52, 3), ridge_cells=(96, 2), lowland=(0.30, 0.44),
             plains_off=0.30)

HAZE = dict(rgb=(196, 205, 210), lowland=0.030, north=0.12, north_from=0.40, north_to=0.10)

# hypsometric ramp: height -> colour. Lowland greens with olive, a mid ochre, high grey-violet; low saturation.
HYPSO = [
    (0.200, (130, 155, 104)),   # coastal lowland: deep sage green
    (0.235, (138, 160, 106)),
    (0.270, (148, 163, 107)),   # olive
    (0.310, (162, 166, 112)),
    (0.350, (182, 170, 122)),   # upland: straw to ochre
    (0.400, (192, 170, 128)),   # hills: ochre
    (0.470, (184, 162, 134)),
    (0.560, (166, 154, 152)),   # rock: warm grey
    (0.660, (152, 148, 170)),   # high rock: grey-violet
    (0.780, (176, 174, 196)),
    (0.920, (216, 218, 230)),
]

# region tint modifiers (region id from region.u8): colour, mix, applies to ground below 'top' height
REGION_TINT = {
    4: dict(rgb=(162, 172, 156), mix=0.42, top=0.40),   # northern lands: cold, grey-green
    8: dict(rgb=(140, 170, 112), mix=0.28, top=0.42),   # green valleys: alpine meadow floors
    9: dict(rgb=(128, 140, 100), mix=0.55, top=0.30),   # Toad Swamp: wet olive
    10: dict(rgb=(140, 170, 110), mix=0.22, top=0.40),  # eastern kingdom: fertile
    11: dict(rgb=(184, 176, 128), mix=0.30, top=0.42),  # mage kingdoms: drier, warmer
}

# valley floors in the mountains keep the lowland green (they read as pits when tinted like high rock)
FLOORS = dict(rel=(0.006, 0.032), slope=(0.20, 0.70), env_px=16, zone=(0.29, 0.36), top=0.70,
              rgb=(142, 164, 106), mix=0.80, region_boost={8: 1.0}, other=0.65, shade_calm=0.45)

# lowland colour variation at 20-60 px: meadow vs scrub vs damp hollows
LOWCOL = dict(meadow=(160, 172, 112), meadow_mix=0.13, scrub=(126, 132, 98), scrub_mix=0.15, cells=40,
              hollow=0.055)

# the Silent Battlefield: a blighted heath (olive-brown, heather stipple, a faint net of dry cracks)
HEATH = dict(rgb=(142, 134, 104), mix=0.62, dark=(110, 100, 90), dark_mix=0.30, pale=(166, 156, 126),
             stipple=0.025, tuft_cells=(170, 2), crack_px=36.0, crack=0.17, crack_rgb=(98, 90, 80),
             scorch=(118, 108, 92), scorch_mix=0.32, edge=(0.34, 0.80), contour=(0.296, 0.330), noise=0.55)

# flattened plains (region ids): their designed edges are softened in the shading only (generalisation)
PLAINS = dict(regions=(7, 9), edge_px=16.0, smooth_px=16.0)

# the wheat country: furlongs (blocks) of long thin strips, each block lying along the ground's fall
WHEAT = dict(
    tint=(172, 170, 120), tint_mix=0.46,                # gold-green ground, about 25% less saturated than before
    furlong_px=46.0, stretch=0.62, angle=22.0, jitter=13.0, turn=0.30,
    strip_px=2.6, strip_var=0.55,
    strip_colours=[(186, 178, 124), (174, 174, 118), (182, 172, 126), (170, 172, 118), (190, 182, 132)],
    strip_mix=0.40,
    furrow=0.012,
    balk=0.035, balk_rgb=(132, 144, 100),
    edge=(0.06, 0.85), whole=0.35,
    warp_px=7.0,                                        # field edges wander
    contour=(0.010, 0.026),                             # the wheat stops where the ground climbs out of the plain
    river_gap=0.85,                                     # and along the rivers (meadow strips)
)

# hedgerow-scale texture on the open lowland: fields laid along the contours, low contrast, organic edges
HEDGE = dict(regions=(4, 6, 10, 11), top=0.36, block_px=48.0, stretch=0.72, angle=-14.0, jitter=10.0, turn=0.15,
             field_w=(8.0, 14.0), field_l=(12.0, 26.0),
             line=0.075, line_rgb=(96, 116, 78), tone=0.040,
             tones=[(146, 166, 108), (158, 168, 112), (138, 160, 102), (166, 166, 116), (146, 170, 116)],
             tone_mix=0.10, patchy=0.50, warp_px=5.0, contour_px=26.0, steep_off=(0.10, 0.25))

FOREST = dict(
    colours={1: (104, 130, 92), 2: (68, 88, 82), 3: (94, 118, 100), 4: (100, 126, 114), 5: (108, 120, 88)},
    region_colour={8: (86, 110, 88)},     # the green valleys: darker, denser mountain forest
    region_dens={8: 0.10},
    mix=0.76, min_px=12.5, grove_noise=1.0, tree_px=3.2, crown_px=1.9, crown_relief=0.9, gap_dark=0.76,
    canopy_light=0.30, treeline=0.60,
    unify=8.0, warp_px=40.0, level=0.47, edge_mid=0.36, edge_fine=0.12, fringe=0.15, fringe_px=9.0,
    riparian=0.10, riparian_px=30.0, riparian_scale=(0.90, 0.35),   # woods follow the rivers and lower slopes ...
    lower_slope=0.10, open_tops=0.03,     # ... and leave open plateaus
    parkland=0.10, cast_shadow=0.16,
    highlight_damp=0.55,
)

SNOW = dict(rgb=(242, 244, 248), lo=0.18, hi=0.62)

SEA = dict(
    # depth is a continuous ramp of z = distance from a generalised coast / local shelf width (+ a cliff term)
    general_sigma=22.0, general_level=0.33,
    shelf_low=76.0, shelf_cliff=18.0,     # shelf width (px) off low shores and under high cliffs
    shelf_noise=0.55, cliff_depth=1.15, bay_wide=1.70, point_narrow=0.55,   # slow swell of the shelf; cliffs start this deep at the shore
    isle_shelf=18.0, chain_px=46.0, chain_full=0.07, chain_z=1.05,
    z=[0.0, 0.30, 0.75, 1.35, 2.2, 3.6],
    colours=[(96, 139, 148), (89, 132, 144), (80, 122, 138), (69, 110, 128), (58, 97, 119), (50, 87, 111)],
    far=((260, 520), (44, 76, 100)),      # the open ocean darkens further out
    wobble=0.16, variation=0.028,          # shelf-edge wobble; low-frequency water variation
    surf_rgb=(196, 212, 210), surf=0.20, surf_px=1.1,  # faint broken surf on exposed shores only
    mud_rgb=(148, 150, 122), mud=0.42, mud_px=14.0, mud_keys=('east_estuary', 'border_delta'), mud_r=0.035,
    texture=0.010,
)

COAST = dict(amp_low=1.6, amp_rock=3.6, near_px=12.0, cells=(56, 3), fine_cells=(110, 1), ridge_cells=(90, 2),
             rock_from=(0.27, 0.38), rocks=0.006, rock_px=(3.0, 9.0), rock_rgb=(156, 148, 134))

LAKE = dict(colours=[(126, 162, 172), (98, 138, 156), (84, 124, 144)], bands_px=[0, 3, 9], rim=0.18,
            rim_rgb=(170, 190, 186))

RIVER = dict(threshold=2000.0, mountain_mult=2.4, region_mult={12: 4.0, 7: 5.5},
             wmin=0.80, wmax=3.6, fref=60000.0, power=0.85, src_taper_px=45.0,
             rgb=(56, 101, 134), sky_rgb=(132, 168, 186), sky=0.16, sky_from=2.6,
             smooth=3, supersample=4, min_len=25.0, prune_len=45.0, prune_rounds=2,
             mouth_merge_px=40.0, mouth_keep=0.30, join_shift=7.0, mouth_arc_px=45.0, against_cos=-0.25,
             meander_px=1.5, meander_len=44.0, meander_grow_px=6.5, meander_grow_len=2.2)

VOLCANO = dict(prefix='fire_dragon', basalt=(122, 112, 106), basalt_mix=0.38, ash=(156, 146, 132), ash_mix=0.22,
               lava=(84, 76, 76), lava_mix=0.70, lava_len=2.8, lava_dir=135.0, snow_off=0.85)

LONE_PEAKS = dict(keys=('buried_machine',), snow_blur=2.2, snow_mul=0.65, summit_lift=0.20)

MEADOWS = [  # soft land-cover accents: (poi key, colour, alpha)
    ('starbloom_fields', (200, 198, 170), 0.22),   # Starbloom fields: pale silvery meadow
]

VIGNETTE = dict(strength=0.10, start=0.66)

# 1:1 detail windows: centre = a poi (or the mean of several) plus an offset (u, v)
CROPS = {
    'nw_fjords_still_water': (['still_water'], (-0.040, 0.000)),
    'mountain_path': (['mountain_path'], (0.000, 0.010)),
    'alpine_massif': (['green_valleys'], (-0.025, 0.020)),
    'wheat_border_river': (['wheat_country'], (0.030, 0.010)),
    'eastern_lowlands_city': (['eastern_city'], (0.040, 0.020)),
    'se_peninsula_isles': (['artifact_isles'], (-0.075, -0.055)),
    'east_gap_battlefield': (['east_gap', 'silent_battlefield'], (0.000, 0.000)),
    'north_headland_isles': (['crystal_grove_e', 'north_isles'], (0.010, 0.000)),
}
CROP_PX = 640
