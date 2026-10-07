# Atlas paint: notes

Painted shaded relief of the Verdant Reach (land and sea only, no names). Everything is provisional lore.

## Rerun

    cd ../terrain && node --max-old-space-size=8192 build_terrain.js   # about 100 s (terrain, if the layout changed)
    cd ../paint && python paint.py                                     # about 110 s: master, preview, crops

Outputs: `master_relief.png` (2048 x 2048), `preview_1024.png`, `crops/*.png` (640 px windows at 1:1) and
`before_after.png` (the previous pass on the left, this one on the right, with three 1:1 detail rows).

Code: `paint.py` (relief, tints, composite), `config.py` (every tunable number), `fields.py` (raster helpers),
`rivers.py`, `sea.py` (shore, sea, lakes), `cover.py` (wheat, fields, heath, volcanoes, forests). Pillow + numpy,
deterministic.

**Why still square, not portrait 2048 x 2560:** the coast is about as tall as it is wide (land spans
u 0.08-0.91, v 0.12-0.89, the SE tail and isles included). A portrait sheet would only add empty sea.

## How it is painted (short)

- **One light from the north-west** (azimuth 315, 40 degrees up). Shading is mixed from 4 smoothing scales,
  with stronger exaggeration on the lowland. Peaks are crisp, the lowland soft (aerial perspective). Shadows
  are cool, lit faces warm. The lowland gets soft micro-relief at 10-40 px, for the shading only.
- **Hypsometric tints:** sage green, olive, straw, ochre, warm grey rock, grey-violet high rock, snow, with quiet
  region tints. **Valley floors** up in the mountains (low above the local valley base, gentle slope) keep the
  lowland green, so valleys read as valleys and violet stays on the shaded walls. Meadow, scrub and damp
  hollows vary the lowland colour at 20-60 px.
- **Wheat country:** furlongs of thin strips running down the plain's fall, very low contrast, organic edges. The
  wheat stops where the ground climbs out of the plain and leaves meadow strips along the rivers.
- **Fields** on the open lowland: blocks with wandering edges, each laid along the local contours, faint hedges.
- **The Silent Battlefield** is a blighted heath: olive-brown, heather clumps, scorched patches and a faint net of
  dry cracks. Its edge breaks up and stops where the ground climbs.
- **Forests:** masses of single lit crowns, pulled toward rivers and lower slopes, with a fringe of single trees
  and more shading contrast under the canopy (lee slopes darker). The green valleys' woods are darker and denser.
- **Rivers:** main stems traced from the flow (each cell continues its biggest donor's line), stubs pruned, no fan
  of mouths. Tributaries join at acute angles pointing downstream. Width runs from 0.8 px at the source to
  3.6 px at the mouth. Meanders grow with the river on flats. A faint sky highlight on the big ones, no outline.
- **Shore:** a small fractal edge (coves and points, rougher on mountain coasts), a few lit rocks off high
  headlands, no outline stroke.
- **Sea:** depth is a continuous ramp of a travel-time field from the generalised coast at the local shelf width:
  wide in bays and off low shores, narrow off exposed points, almost none under the cliffs and in the fjords.
  Island chains share a shelf. Faint broken surf on exposed shores only, mudflats at the estuary and the delta,
  slow water variation.
- **Volcanoes:** basalt cones with radial ash, a lava field down the main crater's lit flank, no snow.
- All positions (battlefield, volcanoes, meadow, crop windows, mudflats) come from `../terrain/pois.json` and
  `meta.json`, so the painter follows the layout's frame automatically.

## Look-fix rounds (first pass)

The art director's list, in order: (1) boxy silhouette and no sea margin, (2) plank fjords and a bar-shaped
Still Water, (3) a pale, flat wheat blob, (4) empty eastern lowlands, (5) a washed palette and a uniform sea.

1. **Terrain frame and new coast, new painter.** The silhouette needed sea all round, so the whole layout now
   sits in design coordinates and is shrunk onto the map by a FRAME (scale 0.70; see terrain/notes.md).
   I sketched the coast first with `terrain/sketch_layout.js` (1.5 s per try, 3 tries). My first try read
   like a stretched animal hide with four legs, and the western and eastern bays sat at the same latitude,
   making a pinched waist. The shape I kept has a deep western bay, a high SW headland running west off the
   alpine divide, a short northern thumb with the island chain trailing off it, a long hooked SE tail into
   the isles, and an east coast with a cove, a battlefield bulge, the estuary and a gentle bay. The fjords
   came out *too wide*: the sea-cliff cut-back ate their low sides. I gave them narrower water, per-point
   widths, bends, fanning directions and a ridge along each headland (of different sizes), and switched the
   cut-back off on the fjord coast. Still Water became a three-reach dog-leg with an irregular shore.
   New painter: strip-field wheat, a field texture, a new palette, wider sea bands.
   *Seen:* the coast works. But the sea bands were 6 concentric echo rings (worst round the isles), the new
   hilltop-wood rule scattered dark blobs everywhere, the northern snow thinned (peaks erode lower at the
   smaller scale, max 0.84 not 0.91), the Forest of Eyes was a dark smudge, and the field texture read as
   *crackle glaze* (equal Voronoi cells), not fields.
2. **Fix:** fewer, softer sea bands measured from a generalised mainland, island shelves compressed (x2.6),
   a slow wobble on the deep bands. Hilltop woods only on clear hills and only in the east and south. Snow
   line lowered by 0.035. The islands now get a crown of their own height (the layout's island 'top' had
   been ignored, so they were flat). The field texture was rebuilt as enclosures: blocks cut into rectangles.
   *Seen:* the sea is calm and the snow crest is back. But the shelf had the same width everywhere, so it read
   as a *glow halo*. The Forest of Eyes looked foggy at 2x, because the warm relief highlight lifted the dark
   canopy toward white. The lowland ran yellow.
3. **Fix:** the shelf width now varies (narrow under high coasts, broad off low ones, plus slow noise). The
   relief highlight is damped 60% on the canopy. The lowland ramp and the eastern tint are a touch greener.
   The battlefield edge is crisper.
   *Seen:* the shelf reads as bathymetry and the forest canopy reads cleanly. The battlefield was still a pale
   fog disc at 1:1, and the SE tail was a smooth, featureless tongue.
4. **Fix:** a spine of low downs along the peninsula and two cove cuts (terrain). The battlefield became a
   darker ash waste with scorch mottling, grain and a broken edge.
   *Seen:* the spine works and the battlefield reads as a burnt waste. But the north cove was a square bite,
   which looked artificial. The Reach interior's many mid-size woods looked busy at preview scale.
5. **Fix:** the cove cuts were replaced by two gentle bays in the outline itself. Woods are consolidated
   (min size 8 -> 11 px, unify 7 -> 9, level 0.45 -> 0.47). The shelf tint is softened.
   *Seen:* calmer land, fewer woods. In the eastern lowland the field texture was almost invisible at 1:1.
6. **Fix:** hedge lines 0.11 -> 0.15, field tones 0.040 -> 0.055.
   *Seen:* at 1:1 there is a faint field patchwork under the rolling shading in the east and the Reach,
   without clutter. At 2x it is plainly visible but still quiet. I checked the fjord crop again after this
   change.

## Fix round 1 (two reviews: 34/60 and 35/60, both "fix")

paint.py was past 800 lines, so it is now split into modules (see Code above). The terrain edits are logged in
`../terrain/notes.md` (round 15). The route checks still pass (path 0.379, gap 0.333).

What changed, in the reviewers' order:

1. **SW massif valleys read as pits.** A valley-floor mask (height above the local valley base below
   0.006-0.032, gentle slope) puts the lowland green back on the floors, and shadow and valley darkening are
   calmed there. Terrain: the alpine rivers carve U floors that widen toward the sea (`floorEnd`).
2. **Grey NE blotch** (the Silent Battlefield, a dead warland in the lore). Terrain: a lobed outline, and ground
   that keeps a gentle roll. Paint: the blighted heath above.
3-5, R2.7. **Rivers.** Rebuilt (`rivers.py`): 148 lines -> 62. The bay-head fan is gone: mouths within 40 px
   merge, and small tributaries that join within 45 px of a river's end go. Lines that run beside a bigger line
   join it at first contact (no braids on flats). Junctions bend downstream, stubs are pruned, widths taper. No
   outline: the channel's own shading is calmed under the line. Terrain: the plain floor (new `wheat.floor`)
   runs past the border river and falls toward its line from both sides, so the river is the plain's low axis
   and the plain's streams feed it. Its guide meanders more downstream (`meanderGrow`).
6. **Square silhouette.** Terrain: a broad blunt headland where the mountain path comes down, a deeper bay
   under the fore-arc, the thumb, a small bay, a low pointed headland past the storm valley and a concave sweep
   to the eastern cape. The east coast is a broad concave bight with the estuary at its head. The round SE bay is
   an irregular embayment with a point inside.
7, R2.2. **Smooth spline coast.** The fractal shore edge and the rocks. The dark outline is dropped.
8, R2.1. **Halo.** The depth-based sea.
9. **Ochre slab.** The tint is about 25% less saturated, the edge follows contours and rivers, the west edge is
   lobed (terrain), and the floor has a little micro-relief. The castle hill on the plain is lower and broader (it
   read as a blot).
10. **Combed spurs.** Terrain: five buttresses of different lengths off the crest (high arc, middle arc, three on
    the eastern arc), and foothill ridges and knolls between the spurs and the plain.
11, R2.8-9. **Specks and islets.** The orange glow specks are gone. The islets vary (a main island with a lobe, a
    second, a slim one, a rock), have relief and a shared shelf, and no outline. Every island under r 0.004 is
    dropped. Volcano: basalt and ash and a lava field; the snow star on the Mount of the Buried Machine is
    softened.
12, R2.5-6. **Forests and fields.** As described above; the smallest woods are dropped.
R2.4. **Wedge inlets.** Terrain: the estuary is a trumpet funnel (per-point widths) and the alpine inlets flare.
    The NW fjords are kept as they were: reviewer 1 rated them the best cartography on the sheet.
R2.10. **Lowland emptiness.** Micro-relief and colour patches.

*Seen on the way (what went wrong):*
- The first sea had a hard outer edge (the shelf width carried out from the shore fell to zero beyond the
  blur). Then a dark band hugged the mainland (the island shelf switched on 6 px out), then a dark ring circled
  the north isles (a distance divided by a blurred width rises and falls again). A travel-time field fixed both.
  The first shallows were also too bright and read as a glow at full view; they are toned down and narrowed
  off open coasts.
- The shelf width first barely varied, because the land within 30 px of the water is low almost everywhere. It
  now reads the backing relief within about 80 px.
- The first river pass kept only 39 lines; tuned to 62. Bigger meanders then made sibling streams on the plain
  braid, until the contact rule.
- The fractal edge first lost its anti-aliasing (a staircase), and its shading drew a dark, outline-like fringe.
  The first rocks came out black and purple (a colour blur divided by a vanishing weight).
- Scaling forest density down away from rivers emptied the SE tail and the Reach, so it is eased. The bare SE
  spine then showed a lit crest like a road (terrain: the spine is broader and lower).
- The plain kept its own trunk 45 px west of the border river until the flattened floor ran past the river.

## Crops (1:1, 640 px)

`nw_fjords_still_water`, `mountain_path`, `alpine_massif`, `wheat_border_river`, `eastern_lowlands_city`,
`se_peninsula_isles`, plus `east_gap_battlefield` and `north_headland_isles`.

## Still weak (honest)

- **The shallows still ring most of the coast** with a lighter zone. It now varies (wide in bays, almost none
  under cliffs) and has no steps, but at thumbnail size it can still read a little like a glow.
- **The eastern arc still has evenly spaced shadow teeth** on its south face. The buttresses broke up the high
  arc better than the eastern arc; the spacing comes from the erosion, not the layout.
- **Shore edge at 3x:** where the land is a flat fringe just above sea level, the edge steps in single pixels
  and a few shaded shore pixels stand out. Fine at 1:1.
- **The fractal coast is subtle at preview size.** The silhouette changes do most of the work there.
- **The Fire-Dragon Peaks** read as a soft dark cluster, and the lava field is faint. The Mount of the Buried
  Machine lost a little of the crisp star reviewer 1 liked.
- **The heath may be too quiet:** it reads as drier ground, and its crack net only shows at 2x.
- **The fields are now almost invisible** at 1:1 (the price of killing the grid look).
- **Forest placement is still noise-based**, only nudged toward rivers; many woods are still rounded patches.
- **The NW fjords are unchanged:** reviewer 2 asked for curving, narrowing fjords; I kept reviewer 1's favourite.
- **North coast:** three northward prongs (headland, thumb, headland) may read a little like a crown.
- **Render time** rose from about 70 s to about 110 s.
- **Not done:** erosion on a finer grid (the frame still costs resolution).
