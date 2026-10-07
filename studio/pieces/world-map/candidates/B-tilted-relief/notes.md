# Candidate B: tilted relief atlas (working notes)

## Brief
- Subject: the whole continent as one relief, standing out of a calm sea. Focal region: the gold wheat country with the Castle of the Order beside it.
- Projection: oblique parallel (plan oblique). screen x = u * 307.7, screen y = YM + v * 300 - (height - sea) * 54. Columns are marched south to north with a y-buffer, so near ground hides far ground.
- Canvas: portrait 320 x 568. Why: phone and TikTok are portrait, and the continent is about as tall as it is wide, so the spare height goes to a sky strip with the light in it and to the Unknown Sea. Landscape would squash north-south or shrink the land.
- Light: one low pale sun over the Unknown Sea at (84, 142), upper left. Terrain is lit from west by north, shadows fall east-south-east.
- Mood and colour: a cool green dawn. Two sibling 12-step ramps with the same value steps and the same ends: AIR (sky, sea, lakes, rock, snow: navy > teal > mint > cream) and LAND (navy > deep green > moss > straw > cream). Small material ramps: wheat gold (5 steps used), ash grey (4 steps used). Accents: sun core, lamp x2, ember x2.
- Horizon at 30% of the height. Land from row 261 to 527 at H = 568.
- Moves: clouds drift (1.1 px/s), cloud shadows cross land and sea, short streaks shimmer on the water (each row at its own pace), glints on the sun's road, wind bands over the wheat, city windows and road lamps flicker, embers pulse, mill sails turn, eyes blink in the Forest of Eyes, crystal trees sparkle, a bolt now and then under each storm.
- Labels: bitmap fonts in font.js (5x7 capitals letter-spaced for regions, small proportional for places), 1 px dark outline, hand-placed table LABEL_AT in render.js, laid out and checked by labels.js. setLabels(0 | 1 | 2).

## Rounds (what I saw in the PNG, what I changed)
0. Resumed. Opened shots/r1d: sound projection and height code, but flat: grey rock blobs, camouflage lowland, hexagon wheat cells that read as a diagram, speckled forest, cone glow, no places, no labels, no motion. Kept the projection, rewrote shading, sky, places, labels and motion.
1. r2a: mountains were dark navy teeth, clouds were pebbles, wheat cells still a cracked-mud diagram, flowers the brightest thing on the map, battlefield a grey sticker. Folded rock and snow into the AIR ramp, turned the light to the west so visible faces catch it, added ribs to the height field, more snow.
2. r2b: forms read now. Wheat redone as strip fields per field with no baulk lines; battlefield given a ragged edge; glitter narrowed; clouds enlarged; horizon moved to 30%.
3. r2c: a dark abyss band under the horizon looked like stains, volcano cones were ruler cones, storm clouds read as airships, crystal trees as white combs. Removed the abyss band, added a second rib octave, a snow rule from the snow line, crisp lit cloud undersides, new storm cloud, new clockwork towers. First label pass: automatic layout failed in the crowded north-west Reach.
4. r3a: 75 dead rows of sea at the bottom. Moved the land down so the Unknown Sea carries the sun's road; frosted glade under the crystal groves; cavern moved off the castle beside it. Labels placed by hand in a table, zero overlaps checked in code.
5. r3b/r3c: look.py said 0.2% of pixels changed in 0.5 s (a still). Added the water streaks, wheat wind, faster clouds: 1.8 to 2.0%. Sea streak density cut after it looked like scan lines.
6. r4a/r4b (side by side): the first land ramp was a game green. Chose the cooler ramp, closer to the sea. r4c: craters on the Fire-Dragon Peaks, snow on the alps, the mountain path as a pale dashed thread, a lit pool round the city, calmer lowland (bigger dead zone).
7. r4d/r4e: small sky clouds were chips. Streak clouds with a stretch factor, one real bank top left. Side by side with the Still Water frame: mine was darker and flatter in the sky. r5a: lifted sky and cloud values, bright waterline under the sun, denser glints near the horizon.
8. r5b/r5c sprite sheet at 6x (prop quiz): twin-tower castle read as "H H", crag castle and ruin unclear, cog and ship unreadable, dark sprites vanished on dark forest. Redrew five sprites, gave every castle, the spires and the hands a lit hilltop as backdrop.
9. r5e/r5f: cloud shadows faded near the horizon by a fraction, which made dithered ovals on the sea. They now shrink by a per-row threshold. Fixed the W glyphs ("Still Hater").
10. r6a: crystal trees were drawn over peaks that stand in front of them (wrong layer order). Sprites are now hidden by nearer ground. Toad Swamp got murky ground and pools. Tried a more north-westerly light (r6nw, deleted): more consistent with the sun but the ranges went dark, kept the west light.

## Measured (final, H = 568)
- --fps-test: median 1.48 ms, p95 3.1 ms without labels; 1.59 ms with all labels.
- --trace-deopt: 649 bailout lines, nearly all "exit from OSR'd inner loop" in one-time build code (bake, blur, world.js, the PNG encoder). In the frame functions: drawTerrain 2 real, drawSky 4.
- Build (init + setH): about 1.5 s including world.js.
- look.py: 34 colours (21 above 0.2%), largest 3-neighbour share 37%, lone pixels 4.4%, changed in 0.5 s: 1.8% (top third 0.4%, middle 1.8%, bottom 3.2%).
- Labels: 20 placed, 0 overlaps with each other (2 px pad) or with place sprites.

## Weak or untested
- 34 colours, not the house 12 + accents. It is one mood, but it is two ramps plus two material ramps.
- The light on the terrain comes from the west; the sun disc sits north-north-west. Shadows point east, not straight away from the disc.
- The glow under the sun still has a slight cone shape.
- Castles are 7 to 13 px: fine at 3x, specks at 1x. Clockwork towers and storm clouds are the weakest drawn things.
- The wheat country is a large flat gold shape; it is the focal point but in the thumbnail it reads a little like a sticker.
- THE NORTHERN LANDS sits on the water just off the north coast: the strip itself has no room for a 120 px label between the groves and the storms.
- Level 2 is crowded in the north-west Reach.
- Label positions are a hand table tied to this layout; if places move in world.js the table needs another look (labels.js reports clashes).
- Not tested: a browser build, a real phone, heights other than 568 beyond a smoke run at 640 (labels follow, composition not looked at).
- Scored only by me, the builder. The rubric says the builder must not score.

## Files
- render.js (main), sprites.js (hand-drawn rows), font.js (two bitmap fonts), labels.js (layout + raster), crop.py and sprsheet.py (look tools).
- final.png, final_labels1.png, final_labels2.png, sheet.png (nine frames left to right, top to bottom: rounds 0, 1, 3, 4, 5, 6, 7, 9 and the final), shots/ (every round).
- Render: node "<skill>/scripts/shoot.js" render.js --h 568 --at 2 --scale 3 --out shots/x [--call labels1@0 | labels2@0] [--fps-test]

## Polish round 1 (fix list from the three-way review)
Backups of the pre-polish files: `backup_pre_polish1/` (render.js, sprites.js, finals, world.js.orig). Shots: `shots/p0` (baseline) to `shots/p2e`, finals in `shots/final*`. `polish1_before_after.png` = old final | new final.

World data (`src/world.js`, API unchanged, `debug_topdown.js` re-run after each edit: all checks pass, the mountain path and the low gap are still the lowest ways through):
- North coast pushed north: the north bay was 0.196 deep (the high arc stood in the sea); now 0.150. The north-east coast between u 0.54 and 0.81 sits at v 0.086-0.104 instead of up to 0.128. The cold strip is now about v 0.09-0.21 everywhere.
- Summits per northern arc cut from 8/9/6/9 to 4/5/4/5: fewer, broader peaks, so the belt stops drawing a picket of spikes.

Render (`render.js`, `sprites.js`):
- Palette: ONE ramp (candidate A's indigo > blue > teal > sage > gold > cream) + 5 accents (ice shade, ice, wheat gold #c2a456, lamp, ember). Measured 17 colours, 14 above 0.2% (was 34 / 21). Snow, ash and wheat are short ladders through the same colours. Land is now teal-green in the sky's light.
- Projection: a lens gives v 0.05-0.27 40 extra rows, so the northern strip shows between the coast and the ranges. View u -0.005..1.005, 338 rows per v. The land is anchored ~40 rows above the bottom edge and the sky takes the rest (checked at H 520, 568, 640). Land now fills rows ~190-528 of 568 (was 261-527).
- Sky and sun (from A): solid disc 30 px above the horizon, round halo in two sizes, wide horizon band, bright wedge on the sea under the sun, glint path. Sky seams squeezed (band k 4): the top-edge checker is now a thin seam.
- Clouds: one large mass in frame (a second drifts in) lit on its underside, plus three thin dawn streaks by the horizon. Fewer, bigger, calmer.
- Sea (from C): three flat shelf steps (shallows, shelf, deep) round every coast and islet, a broken surf line on shores that face us, a lit land edge on shores facing the light. The diagonal checker band in the north-east sea and the west-coast checker patch are gone (no slow gradient left on the open sea).
- Northern ranges: warm 1 px rims (straw/pale gold) on crests that face the light, cream rims on snow; lit snow faces are warm, shaded ones ice grey. The mountain path and the low gap are carved a little deeper in the drawn relief so both notches show in the thumbnail.
- Northern strip: cooler, calmer ground; far woods are flat masses (no crown speckle); crystal groves are small ragged ice-grey glades with cream crystal trees; storm valleys are dark knots lit on their sun side with thin vertical rain, hung lower so the strip has room for its label.
- Forest of Eyes: near-black dense canopy (crowns 3 px), ragged warped outline, paired eyes that blink.
- Wheat: strip fields in gold / straw / fallow sage, 60% with strips, a ragged fallow edge, no pale fields; the dirt road through both mills; thin wind gusts. Darker than the sun now.
- Windmills: A's mill body + two-frame dark X / + sails, readable at 1x.
- City: A's 41 px skyline of towers and domes, every window lit, a warm pool of ground, lamps along the road west.
- Fire-Dragon Peaks: one compact massif (summed cone masses fill the saddles, rugged noise), dark rock with lit western faces and crest rims, three crater glows (lamp core, ember ring, the rock round it a step lighter, breathing).
- Mount of the Buried Machine: summit cut off below the snow line (a dark mesa) with a pale toothed wheel half-buried in its face.
- Toad Swamp: murky ground with separate small ponds that hold the sky, dark mud rims, reed tufts.
- Lakes: ice blue (they hold the dawn sky) with a dark far/shaded bank and a lit near lip. Still Water and two alpine lakes now read.
- Silent Battlefield: ash flats with a scorched fringe that fades into the grass; three taller clockwork towers, each a different silhouette (gear crown, broken and leaning, clock face).
- Alpine woods lighter and calmer, so the green valleys read green.
- Sprite shadows are flat steps (they no longer dither).
- Labels: cream fill (#fdf3cc majors, #ecd692 minors), dark outline. All placed by hand: THE UNKNOWN SEA over water; THE NORTHERN LANDS on the strip; THE VERDANT REACH (2 lines) in the Reach interior clear of the castle; THE EASTERN KINGDOM (2 lines) under the city, east of the border river; THE MAGE KINGDOMS (2 lines) clear of the gulf; Still Water stacked beside its lake; the wheat country and the toad's swamp far apart. `dbg_labels.js [H]` prints every place box and label box and flags clashes: none, except a box-only touch between THE VERDANT REACH and the Colossal Spires (the text pixels are clear).
- Studio-proposed roads (reach road, north road) are no longer drawn: they read as lines across the Reach.

Measured (final, H 568): 17 colours (14 above 0.2%); 3-neighbour share 46%; lone pixels 2.9%; 1.4% of pixels change in 0.5 s (top 0.6%, middle 1.0%, bottom 2.6%), 9.3% by t = 12 s; --fps-test median 1.33 ms, p95 2.7 ms (1.53 ms with all labels); trace-deopt bailouts are in one-time build code (buildHeight, bake, blur2, shapeVolcanoes), none counted in the frame functions.

Still weak:
- The Fire-Dragon range reads as a dark massif with glowing slots; up close it is still more blob than rugged crags. The two small crater glows are thin lines.
- The Buried Machine wheel is ~15 x 6 px: a toothed arch at 3x, a speck at 1x.
- THE NORTHERN LANDS sits right on the north coast line; a few columns of its top row touch the shelf water. The strip is wider than before but still thin next to the ranges.
- Storm knots and crystal glades are small (20-30 px); they read as places at 3x, much less in the 72 px thumbnail.
- The lowland is busy with mid-tone hill blotches; the land does not have one big calm shape the way the Still Water frame does.
- Lightest colour covers 0.4% (the rubric's bar is about 1%); the darkest only 0.1%.
- The lens and the 7% N-S stretch are a deliberate distortion of the map.
- Still scored only by me (the builder). Not tested in a browser or on a phone.

## Polish round 2 (eleven-item fix list from the independent reviewers)
Backups: `backup_pre_polish2/` (render.js, sprites.js, labels.js, font.js, the three finals, notes.md, world.js.orig). Shots `shots/q0` (baseline) to `shots/q16`, finals in `shots/final2*`, height smoke tests in `shots/smoke520`, `shots/smoke640`, `shots/smoke_sheet.png`. `polish2_before_after.png` = old final | new final.

World data (`src/world.js`, API unchanged; `debug_topdown.js` re-run after every edit: all checks pass, the mountain path and the low gap are still the lowest ways through, no lake shore below its lake, no place in water):
- Still Water: wider (hw up to 0.017). The bay at its foot was pulled back west, so the outflow now runs ~0.07 u (about 20 px) as a visible river to the Western Sea instead of touching the sea at once.
- Estuary bight on the east coast cut deeper (to u ~0.825). The gulf channel widened a little (it was already open; the render hid it).
- The three big islands are built from 3-4 overlapping pieces each, and every islet gets two offset lobes and a rougher edge (they read as ovals with rings).
- Green valleys: the western alps now run from under the divide south-west toward the cape, the eastern alps end sooner, so the valleys open to the coast; the west alpine lake is straighter and fuller (the crescent read as an arch).
- 'the toad's swamp' renamed 'Toad Swamp' (label, place and region name). Tried a north-east inlet: the coast noise filled it, removed.

Render (`render.js`, `sprites.js`), by fix item:
1. Lakes are deep blue (ramp 2) with an ice rim on the far and side banks, a cream lip on the near shore and one blinking glint each. Still Water now reads as water between its rock walls; its outflow is drawn; its label sits beside it.
2. Relief rebuilt as broad bands: lowland is ONE flat tone (x.1 values; band() only dithers round x.5), a lit or shaded step only on real hills (slope over 7 cells, a high bar on plains), one step down in the cast shadow of the ranges, and a one-step vignette far from the focus. Lowland crest lines removed. Woods are flat dark masses with a few lit crowns. Cloud shadows removed entirely (they made the dark "holes").
3. The gulf reads as an open inlet now (one shallow band instead of three rings); the border river ends in it, the Toad Swamp is on its west shore.
4. Sea: ONE shallow band along every shore, then flat deep water; no rings round islets.
5. Composition: the sky is 12.5% of the frame, the open sea above the land ~4%, so ~16% in all (was ~33%). KV (rows per unit of v) is now set in setH so the land fills the height: ~470 rows per v at H 568, i.e. the map is drawn about 1.45x taller than wide (a deliberate stretch; relief E = 0.14 KV). Sun smaller (r 7), halo tighter, clouds resized. Mountain highlights one step down (rock cap 7.4, snow cap ICE, crest rims a step lower) except within ~0.06 of the mountain path.
6. Eastern city redrawn as pale stone (unlike the dark castles): a great dome with a lantern spire, two small domes, two slim towers with needle spires, houses stepping down its own hill, windows lit at random and flickering. A warm pool round it, a sparse slanted patchwork of fields within ~0.13 u, the lamp road reaches the border river.
7. (a) Mill sails: two diagonal frames (X and a rotated X), no upright cross. (b) Fire-Dragon Peaks: separate cones (four tall, three small kept as foothills) in three flat dark bands, west faces lit; the glow only in two craters as a tiny core and ember lip, set apart in height so they are not a pair of eyes. (c) Crystal groves: no grey frost slab; 10 spiky pale crystal trees with ice cores on a darker glade. (d) The '|=|' castle is now a donjon with a steep roof. (e) Every castle stands on a drawn hill (lit flank and rim, lee in shade); the Castle of the Order is larger (15 x 17), lopsided (tall keep, cone roof, banner, two lower towers, no crenellated band) on a bigger hill.
8. Rivers are pale ice water with a darker bank on the east and south side; named rivers drawn from spring to sea (Reach river reaches the ria, alpine river the south coast, eastern river the bight). Small streams only where they carry water, in a darker ice.
9. Alpine lakes dark with rims (see 1); the massif opened (see world data); alpine woods a step lighter so the valleys stay green.
10. Wheat: long parallel 2 px strips that follow the wheat road (one direction for the plain, curving with the road), two golds plus an odd fallow strip, phase shifted per field so strips break at field edges; ragged fallow edge into the pasture. Road through it darker. Wind is now a moving band of short glints (the long gust lines read as roads). Standing stones are dark 2 x 4 uprights.
11. Labels: LABEL_AT is now in world (u, v) at sea level, so labels follow the map at any height (`node lab_uv.js labwant.json` converts the hand-picked canvas positions at H 568 in `labwant.json` to u, v rows for LABEL_AT). Toad Swamp renamed; the mountain path label beside the dotted path; THE NORTHERN LANDS on two lines on the strip's land, east of the crystal grove; Still Water beside its lake. `dbg_labels.js`: 0 clashes with places or other labels at H 568.
- Also: Silent Battlefield ash is one flat tone with a one-step scorched fringe; Toad Swamp ground one flat tone, fewer reeds; sea shimmer a little denser; dead cloud-shadow code removed.

Measured (final, H 568): 17 colours, 14 above 0.2%; largest colour 25% (lowland green); lone pixels 1.9%; 0.5% of pixels change in 0.5 s (top 0.3, middle 0.4, bottom 0.6), 4.7% by t = 12 s; --fps-test median 0.91 ms, p95 2.2 ms; trace-deopt bailouts in one-time build code (blur2, buildHeight, shapeVolcanoes, buildVisibility, bake), none in the frame functions. Smoke renders at H 520 and 640: layout and labels follow.

Still weak (honest):
- The map is stretched ~1.45x north-south to fill the portrait frame; round things (lakes, islands) are drawn tall.
- Motion is very low now (0.5% in 0.5 s) since the cloud shadows went: clouds, sea shimmer, glints, windows, embers, sails, eyes.
- Fire-Dragon Peaks read as a dark jagged cluster; the lee faces make thin vertical dark stripes. Better than the face, not yet beautiful.
- The eastern kingdom is calm but plain away from the city; the city is ~37 x 25 px and reads well at 3x, much less at 1x. A denser field patchwork was tried and reverted (it brought the camouflage back).
- Castles other than the Order are 7-11 px and still a bit crown-like at 1x; their hills read as small lit ledges.
- The Silent Battlefield is a flat grey shape that can read as a sticker; the Toad Swamp is a busy little patch.
- Lowland bands still show some lit hill blobs north of the wheat and in the east.
- Scored only by me, the builder. Not tested in a browser or on a phone.
