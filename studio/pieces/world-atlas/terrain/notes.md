# Atlas terrain: build notes

Terrain data for the relief atlas. No painting yet. Everything is provisional lore.

## Rerun

    node sketch_layout.js [out.png] [size]             # 1.5 s layout sketch: coast, regions, ranges, rivers, places
    node --max-old-space-size=8192 build_terrain.js     # about 2 min, writes every data file
    python preview_terrain.py                          # preview.png + debug/full_2048.png + debug/crop_*.png

`--fast` gives rough erosion in about 1 min (for layout edits). `--debug` also writes the stage heights to debug/
(view one with `python preview_terrain.py --height debug/ss_1024.f32 --n 1024 --out x.png`).
All positions live in `layout.js` (one data block). The build is seeded: two runs give byte-identical files.

## The frame (design vs map coordinates)

`layout.js` is drawn in **design coordinates**: the land roughly fills the unit square, and a few gestures run
past it. `FRAME` (scale 0.70, design centre (0.530, 0.522) -> map centre (0.5, 0.5)) shrinks the whole design
onto the map, so the land sits in open sea. It spans u 0.08-0.91 (the SE tail and the Artifact Isles
included), and the main body spans about 0.13-0.80. Lengths scale by 0.70, river-wall slopes by 1 / 0.70, and
flow thresholds in cells by 0.70 squared. The build evaluates its noise in design scale (a wrapper in
build_terrain.js), so shapes keep their character. Every output file (pois, labels, rivers, coast, meta.layout)
is in **map** coordinates. Sea labels (`seaLabels`) are written directly in map coordinates. In the code,
`frameOf(L)` (lib/design.js) and `frameFns(L)` (layout.js) convert map u/v back to design u/v for the few
design-space formulas (wheat slope, snow and tree lines, route-check bands).

## Pipeline

1. **Coast**: a hand-placed outline, clockwise, with each feature named in the comments. It is warped by fbm
   (strength set by `coastRough`). Fjords, inlets and the estuary are cut afterwards so the warp cannot close
   them. Islands are added last.
2. **Design** at 1024: lowland ground (region levels, rolling fbm, low hill lines). Crest lines with summits,
   saddles, a small zigzag and steep sides. A continuous belt watershed so only the passes stay low. Cones,
   flat plains (wheat, battlefield, swamp), pass corridors, meandering river valleys and lake basins.
3. **Stream-power erosion** at 1024, 160 iterations. Implicit Braun-Willett solver (n = 1, m = 0.4) on a
   priority-flood-filled surface, with Rho8 stochastic single-flow routing. Mountains are driven by uplift
   toward steady state; lowlands relax toward the design. Hillslope diffusion is on. The steady-state relief is
   then remapped onto the designed peak envelope, measured above the local valley base.
4. Bicubic upsample to 2048, carrying land heights a few cells out to sea first. Fine ridged detail on the high
   ground, micro-relief on the lowland.
5. **Particle-droplet erosion** at 2048: 700,000 droplets. Settings: brush radius 2, capacity 6, erode 0.35,
   deposit 0.25, evaporation 0.025, life 80. Spawning is weighted toward the mountains.
6. **Stream power at 2048**: 14 iterations, light, relaxing toward the droplet result, so channels sit on the
   fine grid.
7. Sea cliffs: on designated cliff coasts, low shore land is cut back into the sea. Then specks are removed
   and hollows deeper than 0.0015 are breached (a one-cell channel cut along the spill path). The designed lakes
   are kept, the remaining shallow hollows are filled, and flow is accumulated.
8. Masks, regions (the Reach / eastern kingdom line follows the traced border river), POIs, labels, coast
   polylines, traced rivers, and route checks.

## Look-fix rounds

0. **First render.** The coast was a square with nibbles: my bays and gulf were far too timid. D8
   lowest-neighbour routing carved parallel 45-degree streaks over every slope.
   *Fix:* a bolder outline (mid-west bay head at u 0.126, a gulf 0.09 deep, a south-east bay and a long
   peninsula), steepest-descent receivers and multiple-flow accumulation.
1. **Mountains were smooth domes** with a comb of identical parallel gullies. Carved lakes and valleys left
   smooth troughs with seams at their margins.
   *Fix:* Rho8 routing, more diffusion, relief texture added after the carving, cliff coasts made harder to
   erode. The result had realistic gullies but no valley hierarchy: the relax-to-design scheme pins every
   ridge to the noise.
2. **Switched the mountains to an uplift model.** Running to steady state then remapping gave real trunk
   valleys, tributaries and spurs. But the lowland became as dissected as the mountains, because a
   steady-state lowland cannot be both raised and gentle.
   *Fix:* uplift in the mountains, relax-to-design in the lowlands, with the remap weighted to the mountains.
3. **Problems found by the route check and by looking.** The route check found a walk around both arc capes at
   0.25-0.27, along a sea-level fringe left by the upsample. The border river was captured across the wheat
   plain into the swamp. Designed peaks fell short of spec (high arc 0.88, not 0.97). The NW fjords cut flat
   lowland.
   *Fix:* land-extended upsample, cape cones, a deeper border-river valley, summits normalised so they reach
   their height, a fjord highland, sinuous alpine ridges.
4. **The capes were still walkable**, because the slopes meet the water at sea level. I raised the cliffs, and
   that trapped deep closed basins behind the rims (one filled 0.28 deep).
   *Fix:* cut low cliff-coast land back into the sea instead (no rims; low valley mouths become coves), and
   breach deep hollows instead of filling them. Filled cells went from 120k to 19k. The route check passed.
5. **Four problems at 1:1.** Specks along the cut coasts, a row of bubbly knobs on Still Water's west shore,
   the border spur reading as a straight wall, and soft, blurry lowland.
   *Fix:* speck cleanup, the border spur rebuilt as hill lines, lowland micro-relief with more droplets on the
   lowland, narrower lake shores.
6. **The Reach river was ruler-straight**, and the knobs persisted. Their cause: the remap scaled mountain
   cells about sea level but not the lowland, so spur ends were cut off along the blend line.
   *Fix:* meandering river guides, a remap relative to the local valley base, and pass markers moved to the
   col inside each corridor. Route margins grew to +0.12 (Reach) and +0.09 (east).
7. **The alpine massif was a "fishbone":** three straight parallel ridges, with perpendicular spur noise
   seeding even gullies.
   *Fix:* branching, curving alpine ridges and spurs; the spur noise cut to a mild 0.88-1.04 multiplier
   (it was 0.72-1.12).
8. **The silhouette still filled the frame**, with straight north and east coasts.
   *Fix:* a north headland that the island chain trails from, a deeper north-west bay, an eastern bay south of
   the estuary, and the fjord coast bulging west so the fjords are longer. Lower snow line, so the green valleys
   get snow peaks.
9. **Three local defects.** The delta had detached as an islet, the gulf's east cape was a thin spit, and the
   eastern arc's short south face had a comb of gullies.
   *Fix:* a bigger, attached delta, a wider cape, crest zigzag, and the middle and eastern arcs made steep to
   the north.

10. **The silhouette was a box filling the frame** (art director's note). I added the frame (above) so
    every side has a sea margin, and redrew the coast with sketch_layout.js. The first sketch read as an
    animal hide with four legs, with the western and eastern bays at one latitude (a pinched waist). Now: a
    deep western bay (head at design u 0.216), a SW headland running west where a new ridge (alp_cape) takes
    the alpine divide out to sea, a short northern thumb with the island chain trailing north-east, one long
    NE arc to the eastern cape, a cove, a battlefield bulge, the estuary and a gentle bay on the east coast,
    and a long SE tail hooking into the Artifact Isles (which now have their own region circle, `isles`).
11. **The fjords were parallel planks and Still Water a bar.** Cuts take one half width per point. Their
    banks swell, pinch and wander at two scales. The four fjords fan out (north one bends NE, the long one
    has an arm, a short sea loch, the Still Water fjord bends). On the first build they were too wide,
    because the sea-cliff cut-back ate the low finger sides. The cut-back is now off on the fjord coast, the
    water is narrower, and a ridge runs along each headland (fjord_ridge_a-d, of different sizes). Still
    Water is a three-reach dog-leg with narrows and broads, and lakes take `shore` (irregular bays and points).
12. **The eastern lowlands were flat.** More rolling amplitude (hills 0.050 -> 0.068), five low hill lines
    and knolls, and a masks.js rule that puts woods on clear hilltops in the east and south. My first version
    scattered blobs everywhere, so I tightened it.
13. **Islands were flat** (the layout's 'top' value was never used). Each island now rises in a crown to its
    top. The snow line dropped 0.035, because peaks erode lower at the 0.70 scale (max 0.84, was 0.91).
14. **The SE tail was a featureless tongue.** It got a spine of low downs (peninsula_spine) and two gentle
    bays in the outline. I tried cove cuts first, but they made square bites.

15. **Fix round 1 (atlas reviews).** North coast: a broad blunt headland where the mountain path comes
    down, a deeper bay under the fore-arc, a small bay east of the thumb and a low pointed headland past the
    storm valley. East coast: a broad concave bight from the battlefield cliffs to the SE cape, its head at the
    estuary (my first try put the deepest point level with the western bay head and pinched a waist again). The
    SE bay is irregular. The estuary is a trumpet funnel (per-point widths); the alpine inlets flare. Islets:
    varied and lobed, nothing under r 0.004. Battlefield: a lobed outline, flattened only 62%, rolling ground.
    Northern range: five buttresses (buttress_high, _mid, _east, _east_b, _east_c) and foothill lines
    (foothills_high, _high_e, _east_w). Rivers: `floorEnd` (U floors that widen downstream) on the two alpine
    valleys, `meanderGrow` on the border river. The plain: a new `wheat.floor` polygon is the flattened floor; it
    runs past the border river and falls toward the river's guide line from both sides, so the river is its low
    axis (with a plain tilt alone, the strip between the wheat polygon and the river acted as a rim and the plain
    kept its own trunk). `wheat.poly` (region and wheat cover) keeps the land west of the river, with a lobed west
    edge. Castle hill on the plain lower and broader; peninsula spine broader and lower.

## Checks (last build)

All positions are map u/v (design u = 0.530 + (map u - 0.5) / 0.70).

- Lowest way North -> Reach: **0.379 at (0.336, 0.305)**, the mountain path (design u 0.30). Next: 0.496 at
  (0.304, 0.300), then 0.499.
- Lowest way North -> East: **0.333 at (0.595, 0.305)**, the low gap (design u 0.67). Next: 0.455 at
  (0.804, 0.296), then 0.458.
- Band profile: outside map u 0.32-0.36 (the path) and 0.57-0.61 (the gap), no band crosses below 0.43.
- Every named river reaches the sea. The border river mouth is at the delta (0.512, 0.750). The alpine valley
  river reaches the south coast (0.319, 0.823).
- Lakes (the cell counts are smaller because of the frame):

  | Lake | Level | Cells |
  |---|---|---|
  | Still Water | 0.221 (designed 0.222) | 4931 |
  | alpine north | 0.278 | 1065 |
  | alpine west | 0.388 | 974 |
  | alpine east | 0.303 | 822 |

- About 14k land cells were pit-filled; the deepest is 0.0026.

## Still weak (honest)

- **The frame costs resolution.** The land has 0.70 of its old pixels, and the erosion grid is still 1024, so
  the ranges are coarser for their size and the peaks erode lower. Raising NE to 1448 would fix it, at about
  2x the build time.
- **The lowland is soft at 1:1.** It is a bicubic 1024 -> 2048 upsample plus light micro-relief: gentle, but
  low on character between the river valleys and downs.
- **The alpine massif is still a little schematic.** Two near-straight north-south valleys run to the coast,
  some flanks have parallel gullies, and the snow is sparse.
- **Some long straight range flanks still show parallel gullies** (east part of the eastern arc).
- **Rivers on flats follow straight fill and breach paths** (diagonal runs on the battlefield and wheat plain).
  Breach channels are one cell wide (notch gorges).
- **The mountain path reads as a broad saddle**, not a winding gorge. The low gap is a wide low zone
  (u 0.62-0.70).
- **Smaller shape defects.** The border hills still read as a north-south strip, the volcano cones are too
  perfectly radial, and the delta has no distributaries.
- **Region and cover edges are crude.** The green valleys and wheat regions are straight-edged polygons, the
  snow and forest masks are simple rules, and the preview tints are diagnostic only.
- **The preview's river overlay draws every channel over about 1000 cells.** For painting, use rivers.json
  (traced named rivers) or a higher threshold on river.f32.
