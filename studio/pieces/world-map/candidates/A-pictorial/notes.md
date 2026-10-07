# Candidate A: pictorial bird's-eye view. Round notes

One line per look-fix round: what I saw in the rendered PNG, what I changed.
Frames are in `shots/<round>/`. Every frame named here was opened and looked at.

**Brief.** Subject: the whole continent seen from very high above the southern sea, looking north.
Light: a low pale sun over the Unknown Sea, in frame, with a halo and a glitter path. Mood: cool dawn.
Ramp (12): `#0b0d22 #111a3a #16294f #1b3b63 #204f72 #27657a #347b7c #4c9279 #82ad7a #c3c285 #ecd692 #fdf3cc`
(indigo > blue > teal > sage > gold > cream). Accents (5): two cool greys `#b9c6cc #8696a3` (snow and cloud in
shade, the ash flats), wheat gold `#d0b25e`, lamplight `#ffc45e`, ember `#e8552d`. Horizon at 32% of the height. Focal line: sun, glitter
path, the snow ranges and the pass, then the gold wheat country. What moves: clouds and their shadows, glitter,
water shimmer, mill sails, the city's windows, the ember, eyes in the dark forest.

- **Round 0 (inherited, `shots/r0`).** Saw: a tall "rug" of land on a flat navy sea, blobby camouflage shading on
  the lowland, the northern ranges as a comb of ice-blue needles, wheat as a flat yellow sticker. It read as a
  tilted map, not a scene. Changed: kept the idea (heightfield per column, progressive projection, ramp-space
  haze) and rewrote the shading.
- **Round 1 (`shots/r1`, many sub-renders).** Saw, in order: (a) with a steep near view (590 px per v) the land
  read as a rock tower standing in the sea and the mountains as stalagmites; (b) the sun glow added up to a
  diamond; (c) needle peaks from the height exaggeration; (d) sprites with a pale rim lost their outline
  against mid-value land. Changed: (a) a properly foreshortened projection (land wider than tall: 170 to 430 px
  per v, taper 205 to 322 px per u), a brighter hazier far half, sea streaks that crowd toward the horizon,
  clouds with ground shadows; (b) halo and horizon band combined with max, sun raised to 34 px above the
  horizon; (c) mountains drawn from a wide-blurred height so peaks are masses, crisper height only for facet
  shading; lit facets by which side of the sun's column the slope faces; (d) rim bright only where the backdrop
  is dark, otherwise a quiet lift. Also: land seam window narrowed to 0.47-0.53 (big checker fields were
  appearing where the haze gradient is slow). look.py: 16 colours, 3-neighbour share 46%, lone pixels 2.8%.
  Still weak: darkest ramp colour unused, a big bright cloud at the bottom edge competes with the sun, the
  Fire-Dragon Peaks merged into one spike, the pirate sail is unreadable, no labels yet.
- **Round 2 (`shots/r2`).** Saw: side by side with the Still Water frame mine had no real darks and no big dark
  shapes; the alps were a murky patchwork (pine patches, rock tones and shadows all fighting); the Forest of Eyes
  read as a dark pond; forests elsewhere could not be told from grass; mountain rims were dotted lines; no
  visible horizon; the bottom of the frame was an empty band. Changed: sky top down to the second-darkest
  colour with a few twinkling stars; thin dawn streak clouds near the horizon, lit from below; sea 1.4 steps
  under the sky at the horizon so the horizon is a line, and darker toward the bottom edge; cones (Fire-Dragon
  Peaks, the machine mount) keep their own shape and are drawn lower, so the peaks are a cluster of cones again;
  rock is dark at the crest and paler toward the foot, no forest patches on mountain faces; forests are flat dark
  masses (value rounded, so no checker field can form) with a scalloped lit far edge, a dark near edge and
  short crown dashes; rims follow diagonals and both sides of a ridge; a broken surf line on the shores that
  face the camera; storm clouds over the two storm valleys with a rare double flicker; the label layer (two
  bitmap fonts in font.js, level 1 and 2) with a layout checker (`tools/shoot_labels.js`: no label overlaps
  another label or a place sprite). look.py: 17 colours, 43%, lone 3.1%. Motion pair: 0.5% of pixels change in
  0.5 s, 2.1% in 10 s (small on purpose, but low). fps-test median 0.36 ms.
- **Round 3 (`shots/r3`).** Saw: the ranges threw no shadow (sun elevation too high for a dawn); mountain faces
  near the camera were smooth lumps; cloud undersides were checker fields; castles sat in the second-darkest
  colour, never the darkest; the Silent Battlefield could not be found and its towers and wrecks merged into
  one tree-like blot; only 0.5% of pixels moved in half a second. Changed: lower sun for the cast shadows
  (the north Reach now lies a step darker under the ranges, with lighter corridors at the pass and the gap);
  gully streaks down the fall line on near faces only, two flat steps; volcano rock darker; cloud seam window
  narrowed; sprite ink starts at the darkest colour; the battlefield is a flat of the grey-blue accent with
  smaller tower and wreck sprites, far sprites take no rim; more water shimmer (0.8% in 0.5 s). fps-test
  median 0.62 ms. Still weak: the grey flat can read as a frozen lake; level 2 labels crowd the Reach.
- **Round 4 (`shots/r4`).** Saw: the horizon glow was greenish, not dawn gold; clouds had a wedge-shaped grey
  keel underneath; the wheat was one flat sheet; the city did not light its ground; pale rim lines ran all the
  way along low shores like an outline; in the labelled frame "Fire-Dragon Peaks" sat on top of its own small
  cones and next to "the wheat country". Changed: ramp steps 8 to 10 warmed (sage, olive gold, gold); cloud
  base puffs raised so undersides are rounded; baulks between wheat strips shown near the camera; a pool of
  lighter ground under the eastern city; rims fade out on low ground; three birds cross the land far below the
  camera (they are over the wheat at t = 2); labels moved. fps-test median 0.40 ms. node --trace-deopt prints
  588 bailout / deopt lines for one run, nearly all during the one-time bake (the frame loop holds 0.4 ms).
- **Round 5 (`shots/r5`).** Saw: the right-hand spire was a dotted line (the rim test read the sprite's own
  pixel above as the backdrop); the cavern and the crag castle merged into one hooded blot; the far ranges
  were lower than they could be (they are the thing the eye goes to after the sun); "THE VERDANT REACH" sat on
  the cavern, "THE NORTHERN LANDS" touched a peak. Changed: rim backdrop is taken outside the sprite (above
  for top edges, beside for side edges), which also gave the Stone Hands lit fingertips against the dark
  forest; the cavern is a dark mouth under a lit lintel, moved clear of the castle; far height scale 36 to
  46 px per unit; labels moved; dead code removed (output checked identical by md5 before the scale change).
  Tried and dropped after looking: a field patchwork round the eastern city (barely read, added noise) and
  cast shadows under spires, hands and castles (read as drips and plinths). look.py on final.png: 17 colours,
  3-neighbour share 46%, lone pixels 3.0%; 0.8% of pixels change in 0.5 s, 1.5% in 10 s. fps-test median
  0.39 ms, p95 0.72 ms. Layout check: 0 problems at level 1 and level 2.
- **Round 6 (`shots/r6`).** Saw: by the rubric's own measure (under 1% changed in 0.5 s) the frame was still a
  still image; the battlefield flat was blue enough to pass for a frozen lake; "Cavern of Giants" sat beside
  the castle, not the cavern. Changed: the near sea sways (each row of water slides one pixel left or right,
  out of step with its neighbours; sprites standing in water are excluded, after the first try sheared the
  pirate sail); both ice accents made greyer, so the flat reads as ash; the cavern label moved beside its
  cave mouth. Tried and dropped after looking: a darker near land (moodier, but the alps stopped separating
  from the lowland and it no longer read as verdant) and soft cloud masses high in the sky (came out as torn
  dark chips; the clean sky with stars and thin streaks is calmer). Final numbers on `final.png`: 17 colours
  (12 ramp + 5 accents), 3-neighbour share 46%, lone pixels 2.9%; 1.1% of pixels change in 0.5 s, 2.4% in 10 s
  (top third 0.1%: only stars; the sky's streak clouds do not move). fps-test median 0.59 ms, p95 1.19 ms.

## Files
- `render.js` the piece (CommonJS, needs `../../src/world.js`, `sprites.js`, `font.js`). Exports init, setH,
  setOut, update, render, setLabels, G, W, H, plus PLACE and LBOX for the layout check.
- `sprites.js` the hand-drawn places as text rows. `font.js` the two bitmap fonts.
- `final.png`, `final_labels1.png`, `final_labels2.png` at t = 2 s, scale 3. `sheet.png` rounds 0 to 6, then
  the two labelled frames.
- `tools/shoot.sh <round>` renders a frame; `tools/shoot_labels.js <level> <out.png>` renders a labelled frame
  and checks the layout; `tools/crop.py` crops and zooms; `tools/dbg_*.js` debug dumps.

## Weak or untested (honest)
- **It is still a tall land seen from an impossible camera.** A square continent, the whole of it, in a
  portrait frame with a horizon cannot be true perspective. The ground is stretched north-south (about 1.3x
  near the camera) and the far third is squeezed. It reads as a land under a low sun, but the south coast
  hangs in rounded lobes and some people will read the shape as an island.
- **Busier than the Still Water frame.** One ramp, flat bands and one light, but the subject is a whole map:
  many small marks, five clouds. The places are 5 to 40 px: markers on a landscape, not subjects.
- **The alps are the weakest area.** Dark faces, forest dashes, rim lines and snow sit close together; at
  3x the forest dashes can read as scales.
- **The sun's glow is a bulb sitting on the horizon band,** not clean rings. I left it: it reads as a rising
  sun, and the two cleaner formulas I tried made either a diamond or a dark ring.
- **Three kinds of pale thin line** (rivers, ridge rims, roads) share one colour family. Rivers are jagged
  1 px threads.
- **The east half is plain** (the data has no forests or fields there). Calm, but emptier than the west.
- **Clockwork towers, wrecks and the pirate sail are too small to name without the label.** The storm valleys
  and crystal groves lie behind the ranges from this camera; only the two storm clouds show over the crest.
- **Motion is small.** Clouds drift 0.2 to 0.4 px a second as rigid shapes and never change form.
- **Level 2 labels crowd the Reach.** No overlaps (checked by script), but twenty names on 320 px is dense.
- **Not tested:** a real phone, a browser page (there is no HTML shell or boot code here, only the module),
  canvas heights other than 568 beyond "it renders" (480 and 640 were run, not looked at).
- **Deopts:** `node --trace-deopt` prints several hundred bailout lines per run, nearly all in the one-time
  bake; the frame loop itself measures 0.4 to 0.6 ms.
