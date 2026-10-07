# Candidate C: flat top-down pixel atlas

Files: `render.js` (the renderer), `sprites.js` (hand-drawn places), `font.js` (two bitmap fonts for the labels).
Outputs: `final.png` (no labels), `final_labels1.png` (five region names), `final_labels2.png` (every name),
`sheet.png` (one frame per round), `shots/` (every round's frame and crops).

Render: `node ../../../../.claude/skills/pixel-scenes/scripts/shoot.js render.js --h 568 --at 2 --scale 3 --out shots/x`
Labels: add `--call labels1@0` or `--call labels2@0`. In code: `setLabels(0 | 1 | 2)`.

## Brief

- Subject: the continent, one land in a dark sea, seen from straight above.
- Light: a low sun mirrored in the Unknown Sea, upper left, in frame. Solid disc, ring bands, a glitter path
  down the light's diagonal toward the land. Relief is lit from the same side. The land is a step lighter
  near the light and a step darker far from it.
- Ramp (12): #060b17 #0a1426 #0f1f38 #142c49 #193b59 #1e4c63 #275e68 #36726a #4f8a6c #79a877 #afc790 #ecefd2.
  Accents (6): wheat gold x3, snow shade x2 (also crystal groves and storm clouds), ember.
- Canvas: portrait 320 x 568. Why: the continent is square, so one side always has spare room. In portrait the
  spare 248 rows go to the Unknown Sea, which is where the light can sit without covering land. It also
  fits a phone and a TikTok frame. Landscape 480 x 320 would put 80 px of empty sea on each side and no room
  for the light. Heights 480 to 640 re-bake the same picture (checked at 480 and 640).
- Focal region: the gold wheat country, the only warm area.
- Moves: cloud shadows over land, swell at the edges of the sea bands and glow rings, glints, surf, a gust
  band over the wheat, mill blades, city windows and lamps, eyes in the Forest of Eyes, embers, lightning.

## Rounds (what I saw, what I changed)

0. Inherited `render.js` from the interrupted session, never rendered. Saw: wheat as a flat orange sticker
   with cross-hatching, mountains as pale blue blobs, fish-scale forests, the light as a small comet, blotchy
   cloud shadows on the sea. Kept the structure (bake once, index frame, palette), repainted the bake.
1. Saw: sea too dark, cloud shadows read as camouflage on the sea, lowlands like plasticine. Changed: forests
   lit only on the edge facing the light, wheat as a quilt of fields with baulks, the square hole the data
   leaves around the castle in the wheat grown shut, soft region masks instead of hard region tests.
2. Saw: calmer, but the glow still a comet, wheat still carried a cloud shadow at t = 2. Changed: glow turned
   onto the light's own diagonal, sea lifted one step, cloud shadows only on land and shallows, lowland
   relief gain cut, lit rock kept below cream so cream is left for snow and the light.
3. Saw: alps a dark jumble, volcanoes as dark holes, a speckled pale slope. A printed class map showed the
   dark was forest in shade plus cast shadows 13 px long. Changed: sun as a solid disc with rings and a
   glitter path, tighter band seams, a tree line, shorter cast shadows, softer shade inside forests.
4. Saw: lightest colour only 0.6% of the frame, storm clouds read as dark bushes, labels overlapped. Changed:
   bigger disc and halo, deeper corners, cloud shadow start picked by a search so wheat and ranges are clear
   for the first 12 s, storm clouds in blue-grey, every label placed by an offset and checked by script.
5. Saw at 12x: the automatic rim light turned thin sprites into wire (spires, hands, mills, towers). Changed:
   every sprite redrawn by hand with its light drawn in, a bigger city, a gold banner on the Order's castle,
   level ash flats so the clockwork towers read, the cave drawn 9 px aside from the castle beside it.
6. Tried drifting clouds: they read as white pebbles and as snow, so I took them out. Motion was 0.8% of
   pixels in 0.5 s (a still image by the rubric). Added swell on the sea band edges, surf, the wheat gust.
   Now 2.3% (top third 3.3%, middle 1.5%, bottom 2.3%).
7. Side by side with the Still Water frame: my land was one even green, the ranges too thin to be "great".
   Changed: brighter top three ramp steps, stronger near/far light on the land, snow painted 0.07 below
   the data's snow line, pale high rock by height, dark volcano cones without snow.
8. Saw a ruler-straight band edge under the Artifact Isles, where the data's coast field ends at the map
   edge. Changed: sea distance is now measured on the screen itself, so depth bands stay round off the map.
   Moved "the mountain path" label off the snow.
9. Saw castles lost in dark alpine forest, bottom sea band over a tenth of the frame. Changed: a small
   clearing under each castle, the map 9 px lower, cloud shadow start tied to the map so every height
   opens the same. This is `final.png`.

## Measured

- `--fps-test`: median 1.6 ms, p95 2.9 ms (budget 4 ms). With labels on: the same.
- Load: world.js builds in about 0.7 s, the bake (`setH`) takes about 0.4 s. Both happen once.
- Deopt trace: the bailouts are in the one-time bake (blur, shadows, sampling). The per-frame functions show 4.
- `look.py` on `final.png`: 18 colours (12 ramp + 6 accents), lightest colour 1.3% of the frame, largest
  share of three neighbouring colours 55%, lone pixels 2.7% (thin seams, no checker field larger than a sprite).
- Labels: no label box overlaps another label or a sprite at H = 480, 568, 640 (script check).

## What is weak (honest)

- It is a night/blue-hour picture. 60% of the frame is dark sea in three neighbouring blues. Still Water is
  brighter and bolder. If "cool dawn" should mean a pale sea, the ramp needs a second look.
- The image is busier than Still Water: many small shapes, no single big subject. The subject is the land.
- 18 colours. The rubric allows 17 (12 + 5 accents).
- The wheat is still the most sticker-like area: a hard outline (it follows the data) and ruled strips.
- The eastern half is quiet to the point of empty: the data holds one city, one road and no forests there.
- Lowland hills read as soft blobs, not as drawn hills. A few small checker seams sit in slow gradients.
- Places are 5 to 15 px. On a phone at 1x the castles are marks, not pictures. Castles in the alps sit on
  dark ground and read by their lit edge only.
- Small labels are a 6 px font. Readable at 2x and 3x, hard at 1x on a phone. "the mountain path" sits beside
  the north end of the path, on the coast, not on the pass. "Cavern of Giants" lies over a snow ridge.
- The lightning is a 4 px bolt with no flash on the cloud. The surf change is nearly invisible.
- Cloud shadows have no clouds. They stop at the shallows by design, so a shadow fades out at sea.
- Snow is drawn lower than the data's snow line (my choice, one constant: `SNOW_DROP`).
- No HTML page was built or smoke-tested: this is a look candidate, rendered headless only. Not seen on a phone.
- Scored by its builder only. The rubric says a fresh session must score it.
