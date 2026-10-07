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
