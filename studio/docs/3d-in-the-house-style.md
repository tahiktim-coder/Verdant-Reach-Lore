# 3D in the house style: options paper

Written 2026-10-02 for Farhad and for future Claude Code sessions.
It replaces the first draft of the same day.

Question: how can 3D elements, three.js included, be used in the games while keeping ONE look?

**Sources.** The pixel-scenes skill (`.claude/skills/pixel-scenes/SKILL.md`, "SKILL" below), `art/art-direction.md`,
`docs/cookbook-claude-ai.md` ("cookbook"), `art/quality-rubric.md` ("rubric"), the code of Hero of the Reach,
Kolobok and The Summit Road, and the nine frame studies behind `art/frames/`. "The study says" means the
written study of that piece. Three small tests were run for this paper. They are marked "test", and their
files are temporary. Where something was not rendered or not measured, it says so.

## Short answer

1. **One look means one compositor.** Every pixel is a ramp value plus a depth. It is dithered once and mapped
   through the scene palette. 3D is welcome only as a source of value and depth for that compositor.
   So in a pixel game a "3js element" becomes a baked, relit sprite or a software 3D form. The three.js
   library itself does not ship in pixel games.
2. **Make B the house way.** Bake the 3D shape once at load into small buffers (material, normal, depth).
   Light it every frame in the scene's own ramp. In the test this cost 0.05 ms a frame and added no colours.
3. **Keep A for two proven cases:** a round thing that rolls (Kolobok's loaf) and the ground plane.
   Do not use per-frame software 3D for whole landscapes again without a speed plan.
4. **Do not build C** (three.js under the canvas, read back every frame). In the test the read-back alone took
   2 to 3 ms of the 4 ms budget on a desktop, before any game content.
5. **D works as a shader, but it is a second engine.** A last-pass shader can match the ramp and the dither.
   The test shows that part is easy. D drops the canvas toolkit and the Node test loop. Park it until a game
   needs a free camera.
6. **E stays true for what exists.** Arrival, Abyss, Hollow and Majestic keep their own look. No bloom in a
   pixel piece, ever.
7. **Honest status: not proven at the Still Water bar.** My pilot prop sits in the palette and the light, but
   it reads worse than the hand-drawn stone elder next to it. In a backlit scene the baked normals hardly
   show. B earns its place when light comes from the front or moves. The experiment at the end tests that.

## What "one look" means

These come from the SKILL and the rubric. Every option is judged against them.

- **One ramp per scene**, 12 colours plus 2 to 5 accents (SKILL rule 1). The rubric budget is 17 colours.
  The gold frame is 12 colours of one blue (rubric, "The bar"), so hue shift is optional. One ramp is not.
- **Clean bands, dither only at band edges** (SKILL rule 2, `dith` in kolobok `1_engine.js`).
- **Light source in the frame, rim on the side facing it** (SKILL rule 3).
- **Code draws landscapes, hands draw things** (SKILL rule 5). One exception is written into the rule:
  "organic round things (a fish head, a loaf) can be procedural if they are shaded like 3D forms."
- **One pixel size.** A sprite at 2x next to 1 px art is automatic fail F2 in the rubric.
- **Under 4 ms median per frame in Node on a laptop.** Phones are 3 to 5 times slower (SKILL workflow step 5).
- **Render headless and look.** The SKILL says the quality comes from this loop. An option that weakens the
  loop weakens the quality.

One fact to keep in mind. The quality-bar piece has no 3D in it. Its boat, fisher and companion are flat
index-0 silhouettes with no rim light (Still Water study, `FISHER`, `makeBoat`). Any shaded 3D object is
already more detailed than the subject of the frame he loves. More detail is a risk, not a free win.

## What exists today

Numbers are medians from the studies (Node 24 on his machine). Frames are in `art/frames/<piece>/`.

| Piece | 3D technique | Function | Cost | Best result | Worst result |
| --- | --- | --- | --- | --- | --- |
| Kolobok | Ray against a sphere per pixel, flour texture in the loaf's own frame, rotation matrix, depth buffer, shadow rays | `drawBall`, `shadowAt`, `stampZ`, `plotZ` (`2_sim_render.js`), `genGround` (`1_engine.js`) | 1.8 to 2.0 ms idle, 3.3 to 3.5 ms with a floured loaf, 4.65 ms at H=470 | Frames 09 (crescent of flour) and 11 (coated loaf with crows) | Fully coated it reads as a moon or pearl. The shadow is a flat hard wedge. |
| The Summit Road | Voxel-space terrain per column into a float value buffer, one dither at the end | `renderTerrain`, `VAL`, `drawRelics` (`summit.js`) | 7.8 to 8.2 ms. Terrain alone 5.06 ms. | Light, fog, rays and flash all stay in ramp space | Reads "as a tiled plaza in retro 3D". Code-drawn swords. 86% of pixels in three ramp steps. |
| Hero of the Reach | Distance shapes raymarched once at load. Material, normal and position kept per pixel. One ramp per material. | `scene`, `buildBust`, `shadeBust` (`hero-of-the-reach.html`) | 0.26 to 0.39 ms a frame at 320 px wide. Load 230 ms. | The helm at 8x (frame 07) looks like deliberate pixel art | Slab torso, bun pauldrons, board cape. 64 colours in 9 ramps. The flicker puts a checker over 27% of the portrait 94% of the time (frame 06). |
| Muster, Reachbound | Fake sphere and fish head from 2D normals, no ray test | `drawLoaf`, `drawFish` (`muster.js`) | Loaf 0.11 ms unfloured, 0.41 ms floured. Fish 0.25 ms. | Floured sphere with a warm rim | Roll and decay run inside `render`, so speed depends on frame rate |
| Reach Field Tips | Sphere with noise holes, recomputed every frame | `animBell` (`tips.js`) | Card 5 runs 4.19 ms, the slowest card. 137 deopts. | None | "Reads as a torn moon" |

I opened Kolobok 09 and 11, Hero 03, 06 and 07, and Summit 01 myself. They match the table.

Four lessons already paid for:

- **Lighting in ramp space works.** Summit writes a continuous ramp value per pixel into `VAL` and dithers
  once in `render`. Glow, fog, rays and flash never leave the 12 colours.
- **A depth buffer lets drawn and 3D things mix.** Kolobok's crows, pole and particles hide behind the
  floured loaf through `stampZ` and `plotZ`. Hero has no depth test, and its dust pixels cross the knight as
  stray dots (Hero study, `render()` 367-370).
- **Baking is cheap, per-frame 3D is not.** Hero: 0.3 ms a frame. Summit's terrain: 5 ms.
- **The helm works, the body does not.** A hard round object with one clear outline survives the method.
  A figure built from primitives still reads as "a chess piece" up close (Hero study).

## Tests made for this paper

All three ran on 2026-10-02 in Node 24 and headless Edge on his PC. The machine was busy with other jobs, so
treat times as plus or minus a third. I opened every frame I describe. "How to redo the tests" is at the end.

### Test 1: a baked prop inside the real Kolobok scene (option B)

What it is. A temp copy of Kolobok with one hook in `render`, just before `drawForeground`. The prop is the
helm and gorget lines from Hero's `scene()`, a shortened version of its plume, and a stake of my own.
It is baked once at the size it is shown: a 56x54 window, 18 px per model unit, orthographic, as in
`buildBust`.
Per pixel it keeps a material id, a normal, an occlusion value (5 samples along the normal, the cookbook's
Mandelbulb recipe), and a tag from two surface rules (brow band, visor slit), as `shadeBust` does.
Each frame a small loop lights it from Kolobok's own sun (`SUNX`, `SUNY`) with the terms `drawBall` uses:
sky fill from above, a rim toward the sun, direct light where the surface faces it. Materials are rows of a
small table in ramp units (base, sky gain, rim gain). One `dith`. One ramp. It sits near the stone elder.

Measured:

- Bake: 22 to 27 ms, once. 657 pixels hit.
- Relight of those 657 pixels: 0.04 to 0.05 ms median.
- Kolobok idle frame with and without the prop: 1.3 to 2.0 ms both ways. The prop's cost is below the noise.
- Colours in the frame: 16 with the prop, 16 without (12 ramp colours plus flour and mint, counted with the
  rubric's `look.py`). The prop adds none. Its `lone.png` shows thin seams on the prop and no checker block.
- Moving the prop 1 px: 0 of 657 prop pixels change when the dither is tied to the sprite's own pixel grid.
  78 of 657 (12%) change when the dither is tied to the screen.

What I saw, over three rounds:

- Round 1 (helm 16 px wide, no plume): a mushroom or an urn. Not a helm.
- Round 2 (plume too long): a pot with a tail of loose balls.
- Round 3 (helm 18 px wide, short plume, visor slit forced dark by a rule): at 9x it reads as a helm with a
  visor slit. At 1x it is a small dark lump with a slit beside the elder.
- In Kolobok's real light the sun is behind the scene. The prop is a dark shape with a gold glint on top.
  The baked normals hardly show. The hand-drawn elder beside it has an authored outline, a rim line, eyes
  and carved words. It reads far better.
- With a test light in front (low left, then right) the same bake shows clean bands down the helm, thin
  dither seams, the brow band and the slit. It reads as lit metal. This is what the bake is for.

Verdict. The method holds the palette, the light and the budget. It did not reach the elder's quality in
three rounds. Under backlight a bake gives about what `rimLit` gives a hand-drawn silhouette. This is my
builder's view, not a rubric score. The rubric says the builder never scores.

### Test 2: Hero's bust baked small and relit in one ramp (option B, re-run)

An earlier session wrote this test. I re-ran its script and opened two of its frames. Hero's own `buildBust`
at 96x120 px, relit every frame in the Kolobok dusk ramp in a plain dusk sky.

- Bake at 96x120: 36 to 49 ms, once. 4,441 pixels hit.
- Relight of 4,441 pixels: 0.09 to 0.11 ms median.
- Hero's own `shadeBust` (string-keyed materials, 186x218 panel): 1.4 to 2.5 ms per call.
- Hero `init`: 170 to 350 ms across three sessions (the study measured 230 ms).
- Sun behind: a dark plum shape with a thin gold rim on helm and pauldron tops. It sits in the scene.
- Light at front right: a big highlight on the chest, and the lower torso turns into a field of dither.
  A flat surface landed mid-band. The body is still a blob with a flat cut-off base. It floats.

### Test 3: real triangle meshes through a quantise shader (options C and D)

A 216x384 WebGL2 page with no three.js. I found no copy of three.js in the project and did not download one.
Pass 1 draws a flat-faced cube, a smooth capsule and a sky into a small 8-bit target as one number per
pixel: the ramp value. Pass 2 is a full-screen shader with the house `dith` thresholds (0.28, 0.72) and the
house Bayer matrix. Screenshots from headless Edge. three.js sits on the same WebGL calls, so the picture
side carries over. Its own overhead does not, and was not measured.

- Output is clean: only ramp colours, 0 off-ramp pixels, a true 216 px grid.
- Without the last pass the same frame has 185 colours and smooth muddy gradients.
- When sky and quantise are in one shader, the result matches the Node canvas exactly: 0 of 52,704 pixels
  differ. Through the 8-bit target, 781 differ (1.5%), each by one ramp step. Same look, not pixel-identical.
- **Flat faces flip.** At 20 and 32 degrees the cube's faces are flat single colours. At 44 degrees the
  right face is a full checker. A flat face is one value, and 44% of values sit in the dither zone.
- The smooth capsule shows narrow bands with dither between them. On a small object that is busy.
- **4x anti-aliasing:** 169 pixels differ, and in-between colours appear along the cube's edges (10x crop).
- **Half a pixel of movement:** 246 pixels differ. Quarter-pixel steps change 85 to 215 pixels per step
  (225 to 292 with anti-aliasing). These are counts from stills. I did not watch it move.
- **Time.** Drawing: about 0.2 ms (the page timer steps in 0.1 ms). Draw plus `readPixels` of the frame:
  2.0 ms median, 2.9 ms p95 with the software renderer; 3.1 ms median, 5.7 ms p95 with the real GPU
  (AMD Radeon). The earlier session's one-triangle page read back in 0.7 ms. Turning the read-back
  buffer into ramp indices on the CPU and mapping the palette: 0.8 to 1.2 ms in Node.

## The options

### A. Software 3D in the canvas renderer, every frame (as now)

**How it works.** Code solves the geometry per pixel each frame and writes a ramp value and a depth.
Three forms exist: a ray against a sphere (`drawBall`), a ground plane mapped once per screen height to
world X/Z (`genGround`), and voxel-space terrain per column (`renderTerrain`).

**Cost per frame at 216 px.** A floured loaf with its shadow test adds about 1.5 ms (Kolobok 1.8 to 2.0 ms
idle, 3.3 to 3.5 ms floured). The ground plane is a baked table, so it is inside the idle figure. Voxel
terrain is 5.06 ms alone. Muster's 2D-normal sphere is about 0.3 ms.

**Good for.** Round things that turn every frame: flour that rolls with the loaf. The ground plane: tracks,
wind, shadow and dust all sit on one plane with true foreshortening. An invisible thing shown by a coverage
texture.

**What breaks the look.**
- Perfect clean forms. The coated loaf "reads as a moon or pearl, not bread" (Kolobok study).
- Hard-edged shadows. `shadowAt` gives a flat wedge that covers a quarter of the frame at full coat.
  The rubric's check 2.5 fails a flat hard-edged wedge.
- Objects drawn by code. Summit's swords are stair-stepped bars (`drawRelics`, crop 22).
- Slow gradients over big surfaces. Summit's road and sky are large checker fields, because the value sits
  inside the dither zone over whole areas (frame 01).
- Noise recomputed per pixel per frame (`animBell`).

**Consistency with the Still Water bar.** Proven for one case: Kolobok, which he loved. Not proven for
terrain: the Summit study found murky values and a floor that takes 60 to 68% of the frame.

**Phones.** At 3 to 5 times slower the floured loaf is 10 to 17 ms and Summit is 24 to 40 ms. Summit will
sit on the half-rate fallback. Not measured on a phone.

**Headless testing.** Full. `shoot.js` renders frames, `--fps-test` measures, `--trace-deopt` counts.

**Risk.** Low for spheres and the ground plane. High for landscapes: cost, and the "retro 3D" read.

### B. Bake 3D at load, light per frame in ramp space (Hero's approach, generalised)

**How it works.** At load, raymarch a small distance-shape model once (`scene`, `buildBust`). Keep per
pixel: material id, normal, depth, occlusion. Nothing 3D runs after that. Each frame a small loop turns
normal and light direction into a ramp value and dithers it. The result is a sprite that can be relit.

What must change from Hero's version to fit the house rules:

- **One scene ramp.** Materials become value ranges in ramp units, not separate ramps. Hero's nine ramps
  give 64 colours, and "the room, steel, sky and UI do not feel bathed in one light" (Hero study). A second
  material that must pop gets an accent mini-ramp whose top step is the scene's lightest colour, as
  Kolobok's flour does (`FR`, `fr`). Still Water draws its golden fish in a 4-step gold accent ramp (`GPAL`).
- **Light from the scene's light position.** Hero's `LK` is a fixed vector. Field Tips' fixed `LX, LY, LZ`
  lit clouds from the wrong side on six cards (Field Tips study).
- **Write depth,** so drawn sprites and particles sort against it (the `stampZ` pattern).
- **Relight, do not mix two bakes.** Hero's flicker picks between two images with a Bayer cell (`render()`
  354-358). That breaks SKILL rule 2. Relighting costs 0.05 to 0.1 ms, so the trick is not needed.
- **Occlusion in the bake.** Hero has no contact shadows and "the parts look pasted together" (Hero study).
  Test 1 bakes five occlusion samples along the normal for this. It costs nothing per frame. At 18 px wide I
  could not judge how much it helps.
- **Bake at the shown size. Tie the dither to the sprite's own grid.** Then the object moves as one piece,
  like a hand-drawn sprite (test 1: 0 changed pixels against 78).
- **Material base values just above a whole ramp step,** so flat parts do not turn into checker.
- **Outline from the mask** (the last loop of `shadeBust`). The Hero study says the outline is the main
  reason the bust reads at 1x. Test 1 draws it only on the side away from the light, so the rim stays clean.

**Generalised.**
- *Props:* yes, when round and hard: helms, bells, urns, stones, statues.
- *Creatures:* busts and beasts seen from one side. Movement needs one bake per pose. A four-frame walk
  would be four bakes, about 0.1 to 0.2 s at load on a laptop. Not tested. Modelling is the hard part: the
  cookbook records the first bust as "a boxy fridge", and the body is still the weak part of Hero.
- *Buildings:* no. A building from distance shapes is still architecture drawn by code (SKILL rule 5, rubric
  F6). The Souls tower ("organ pipes") and Summit's swords show how that looks. See the proposal under
  "Recommendation" for a hand-drawn way to get relit buildings.

**Cost per frame at 216 px.** 0.04 to 0.05 ms for a 657-pixel prop. 0.09 to 0.11 ms for a 4,441-pixel bust.
That is roughly 15,000 to 45,000 pixels per millisecond, so B is for objects. Relighting a whole 216x384
frame (83,000 pixels) this way would cost 2 to 6 ms (estimated from these numbers, not measured).
Load cost: 22 to 27 ms for the prop, 36 to 49 ms for the 96x120 bust.

**Good for.** Things a light will move across: a candle (Hero), a lantern, lightning, a mood change like
Still Water's day, night and blood palettes. Today Still Water's lantern only tints the post and the rod
and does not light the fisher (`glowTint`). Summit's flash "lifts everything evenly", with no light from the
bolt on the walker or the swords (Summit study). The rubric asks for both: a lamp that lights its holder
(check 2.5) and a flash that raises contrast near the event (check 2.6). A relit bake is the missing piece.

**What breaks the look.**
- A primitive model. This is the main risk. See test 1, rounds 1 and 2.
- Backlight. With the sun behind, the bake is a dark shape with a rim. A hand-drawn silhouette with `rimLit`
  (Muster) gives the same for less work and with a better outline.
- A flat surface whose value lands mid-band (test 2, front-right light).
- Several ramps on one object.
- Scaling the bake. Field Tips' Hunter at 3x and Reachbound's Projection at 2x are the proof that mixed
  pixel sizes look wrong (`animBlink`, `drawProj`).
- No shadow on the ground. Hero's figure "floats in front of the room". The pilot prop hides its base
  behind the grass. That is a dodge, not a fix.

**Consistency with the Still Water bar.** Unproven. The Hero helm suggests it can get there for hard round
objects under front light. Hero as a whole is "below the Still Water bar for unity of light" (Hero study).
The pilot fixes the palette and the light. It does not fix the model.

**Phones.** Per-frame cost is far inside the budget, even at 5 times slower. Load cost grows to about 0.1 s
per small prop and 0.5 to 1.7 s for a Hero-size bust, by the 3 to 5 times rule. Bake behind the title
screen, not on first view: Field Tips' 35 to 110 ms first-view hitch is the warning. Not measured on a phone.

**Headless testing.** Full. It is the same canvas renderer. Test 1 ran through the normal Node loop.

**Risk.** Low for speed and palette. Medium for look: it depends on model quality, which is an art problem.

### C. three.js rendered small, read back, quantised to the ramp in the canvas

**How it works.** three.js draws the 3D parts into a 216-wide offscreen target with anti-aliasing off.
`readPixels` copies the target to the CPU every frame. A loop turns it into ramp indices with `dith` and
merges it with the canvas layers by depth.

What it needs:

- **A way to know the ramp value.** Brightness-to-ramp works for one ramp only, and only if tone mapping
  and colour-space conversion are off. Otherwise the bands shift. Accents need a material id in a second
  channel. That means custom shader materials that write "value, id" and not colour. At that point three.js
  lighting is not used. (three.js settings are named from memory of r128. They were not run here.)
- **Depth read back too,** or drawn sprites cannot go behind 3D things.
- **three.js r128 pasted into the page.** The cookbook: "this is what fixed Arrival on your phone: the Claude
  app can block outside scripts". That is about 600 KB of script (size from memory, not checked). The whole
  Hero page is 29 KB (Hero study).
- **Two renderers kept in step:** same camera, same light position, same pixel grid.

**Cost per frame at 216 px.** Read-back measured in test 3: 2.0 to 3.1 ms median, up to 5.7 ms p95, for two
tiny meshes on a desktop. Plus 0.8 to 1.2 ms to quantise on the CPU. That is 3 to 4 ms gone before any game
content. `readPixels` makes the page wait for the GPU. Phone cost is unknown.

**Good for.** Real meshes with many polygons that must turn freely and still sit behind and in front of
drawn sprites. He has no such asset today.

**What breaks the look.** All of these were seen in test 3.
- Flat faces that flip between a flat colour and a full checker as the object turns.
- Anti-aliased or filtered edges: in-between colours along every edge.
- Movement by fractions of a pixel: edges and seams change every frame. The canvas pieces round sprite
  positions to whole pixels (`plotZ`, `setPix`).
- Ruler-straight polygon edges. This is the code-primitive look of rubric F6.

**Consistency with the Still Water bar.** Unproven, and harder than B for the same object. The light and the
pixel grid live in a second renderer.

**Phones.** Unknown and risky. The cookbook's rule is "always test inside the Claude app on a phone".

**Headless testing.** Split in two. The canvas half runs in Node. The three.js half needs a real browser.
Headless Edge did run WebGL2 here, with the software renderer and with the GPU. But there is no stepping to
a chosen moment, no `--fps-test`, no deopt count. Every state needed a URL parameter. The studies also hit
CSS fades that freeze under virtual time (Still Water, Kolobok) and a window that will not go narrower than
about 500 px.

**Risk.** High. Most moving parts, least evidence, and the read-back eats the budget.

### D. The whole game in three.js, with ramp quantise and band-edge dither as the last pass

**How it works.** The scene is ordinary three.js at 216 px wide. A last full-screen shader turns each
pixel's value into the scene ramp with the band-edge dither. No read-back. The cookbook already lists a
relative: the "1-bit ghost render" (raymarch, then an 8x8 Bayer threshold, 384 px wide). The cookbook says
looks like that "work on real 3D models in an engine". I have not seen that piece.

**Cost per frame at 216 px.** No CPU cost for the look. Drawing took about 0.2 ms in test 3, for two small
meshes. A 216x384 target is small. Summit's 5 ms terrain should be cheap on a GPU (my estimate, not
tested). Phones are untested.

**Good for.** A game that truly needs a free camera or a walkable 3D space.

**What breaks the look.**
- Everything listed under C except the read-back.
- **It leaves the toolkit behind.** Still Water's mirror water (`computeWater`), sprites that plot their own
  reflection (`plotR`), puff clouds (`genClouds`), mood palette (`buildPalette`), dithered glow (`glowTint`),
  Muster's `rimLit`, Kolobok's wind and tracks: all of it is JavaScript over an index buffer. In D each one
  is rewritten as a shader or dropped. These are the things that make the pieces good.
- **SKILL rule 5 at scale.** Every object becomes a mesh. Hand-drawn sprites become billboards that must
  sit at one texel per pixel and snap to the grid, or pixel sizes mix (rubric F2).
- **Screen-fixed dither over moving surfaces.** The pattern stays still while the surface slides under it.
  The Souls mist shows how dither that flips in place looks: it "boils" (Souls study). Counted in test 3,
  not watched.
- **Flat faces need a rule in the shader** so they land on whole ramp steps. Not written, not tested.

**Consistency with the Still Water bar.** The quantise step can match exactly when everything is one shader
(0 of 52,704 pixels differ). Through a normal 8-bit target it is the same look but not pixel-identical. The
content cannot be judged: no three.js piece has been made in this look.

**Phones.** Likely fine for speed at this size. Loading and WebGL quirks need the real phone (cookbook rule).

**Headless testing.** Browser only. Screenshots work, and numbers can be read out of the page with
`--dump-dom`. The Node loop is lost: step to a moment, measure, count deopts, play the game by script as
Still Water's `press` and `release` allow. Game logic can stay in plain JS and be tested in Node, but
nobody can look at a frame there.

**Risk.** High. It is a second engine. A fair bet only when a game needs it, and then as its own project.

### E. Two separate looks, never mixed

**How it works.** Pixel canvas games stay pure canvas. The three.js games (Arrival, Abyss, Hollow, Majestic)
keep their look: bloom, fog, additive beams. I know those four only from the cookbook. Their source is not
in this repo.

**Cost per frame.** Nothing new.

**Good for.** Shipping what exists. The cookbook already suggests Abyss or the campfire game as HTML5 games
on itch.io.

**What breaks the look.** Nothing inside each game. The break is between games: two visual brands, and
assets do not move between them. He asked for one engine and one style to sell from.

**Consistency with the Still Water bar.** The pixel side is untouched. The three.js side is a different bar.
Arrival's glamour is an `UnrealBloomPass` (cookbook: strength 0.9, radius 0.55, threshold 0.8). That is
smooth light by design, the opposite of SKILL rule 2.

**Phones, testing, risk.** As today. No new technical risk.

## Side by side

| | A: software 3D per frame | B: bake, light in ramp | C: three.js + read-back | D: three.js + pixel shader | E: two looks |
| --- | --- | --- | --- | --- | --- |
| Per-frame cost, 216 px | 0.3 ms (fake sphere), 1.5 ms (loaf), 5 ms (terrain) | 0.05 to 0.1 ms per object | 3 to 4 ms before content (desktop) | about 0.2 ms draw in the test; real scenes not measured | none new |
| Load cost | small | 20 to 50 ms per object, 230 ms for Hero | about 600 KB of three.js | same | none |
| Palette stays on the ramp | yes | yes (test 1: 0 new colours) | yes, with custom materials | yes, with custom materials | pixel side yes |
| Uses the canvas toolkit | yes | yes | yes | no | yes |
| Light agrees with the scene | yes | yes, if the light comes from the scene | two renderers to keep in step | yes | does not apply |
| Seen at the bar? | Kolobok yes, terrain no | helm only, under front light | no | no | pixel side yes |
| Phones | tight to over budget | easy per frame, slower load | unknown | unknown | as today |
| Headless in Node | full | full | half | none (browser screenshots) | as today |
| Risk | low to high by subject | low tech, medium art | high | high | none, but two brands |

## Recommendation

**Make B the house way to bring 3D into pixel scenes. Keep A for rolling spheres and the ground plane.
Leave the three.js pieces as their own look (E). Do not build C. Hold D until a game needs a free camera.**

Reasons:

1. **It keeps one compositor.** A and B both hand over a ramp value and a depth. Drawn sprites, procedural
   layers and 3D-derived objects then share one ramp, one light and one dither. Summit's `VAL` buffer and
   Kolobok's depth buffer already show both halves working. That is what he asked the engine to do.
2. **It is the cheapest.** 0.05 ms to relight a prop leaves almost the whole 4 ms for the landscape.
   Kolobok's floured loaf already overshoots at H=470 (4.65 ms).
3. **It keeps the loop.** Everything renders in Node, so every frame can be looked at and measured.
4. **It keeps the toolkit.** Water, clouds, reflections and moods stay as they are.
5. **The evidence points the same way.** The best 3D-derived images so far (Kolobok frames 09 and 11, the
   Hero helm) are software-rendered into ramps. The weakest (Summit's floor, Field Tips' sphere) are
   per-frame 3D used where a bake or a drawing would do.
6. **C fails on evidence, not on taste.** It spends the frame budget on read-back. D matches the palette
   but trades away the toolkit and the test loop.

When to bake and when to draw. This comes from test 1:

- **Backlit and never lit from the front:** draw it by hand and let `rimLit` light it. A bake adds nothing.
- **A local light touches it** (candle, lantern, fire, lightning) **or it is round and turns:** bake it.
- **It is a building or a person:** draw it. SKILL rule 5 still stands.

Two proposals. Both are mine and untested:

- **Hand-drawn sprites with face letters.** In the text rows, letters also say which way a face points
  (left wall, right wall, roof, front). The relight loop then gives each letter one flat value per frame.
  That would give relit buildings with authored outlines and flat faces that stay on whole ramp steps.
  Vignettes' `rims` already returns a per-pixel code for two lights. This is the same idea with more codes.
- **three.js as a baking tool, not a runtime.** If he ever has a real mesh, render it once in a browser
  into the same buffers and save them as data in the page. The game then runs B, with no three.js at
  run time. It fits the ROADMAP Phase 3 item "Sprite import from a PNG".

Where B would live in the ROADMAP engine: `sprite.js` ("stamping with depth") gains a lit sprite made of
material, normal, depth and occlusion. This paper does not change the ROADMAP.

## Smallest experiment that would prove it

Test 1 was a first pass by the builder. It showed the mechanism and the weak spot. The real experiment adds
the case B is for, a control, and a judge who did not build it.

**One prop, one local light, one control, in a scene he already loves.**

Build, in a temp copy of the Kolobok example with no source changes:

- **The prop:** the great helm from Hero's `scene()` on a stake, about 20 px wide and 45 px tall, on the
  foreground hilltop near the stone elder (`genStone`, `drawForeground`). It is a test prop, not lore.
- **The local light:** a small lantern hung beside the helm. It flickers and sways 2 px. The lantern is a
  light position plus a few hand-placed pixels in the top ramp colours. No new colours.
- **Version 1, baked (B):** material, normal, depth and occlusion baked once. Lit each frame by the sun
  (rim) and by the lantern (direct light with falloff), in the dusk ramp. Depth written, so grass blades
  and pebble folk overlap it.
- **Version 2, the control:** the same helm drawn by hand as a text-row sprite with `rimLit` toward the
  sun. The lantern only tints it, the way Still Water's `glowTint` does.
- **Version 3:** no prop. This is the baseline frame.

Render for each version, as the rubric's procedure asks:

1. The hold frame at t = 2 s, H = 384, at 3x and at native 1x.
2. t = 2.5 s and t = 12 s for the motion pair.
3. H = 470.
4. Six frames 0.1 s apart during a lantern flicker, plus `changed.png` from `look.py`.
5. A 9x crop of prop and elder together.
6. `--fps-test` and the deopt count for each version.

Judge it with `art/quality-rubric.md` (check numbers are from the rubric as it stood on 2026-10-02).
A fresh session or Farhad scores. The builder does not, and a session that fixed the prop counts as a builder.

- **No automatic fail.** Watch F2 (pixel size), F5 (checker over more than half the subject), F7 (layer
  order: grass in front, particles behind), F9 (the lantern pool as a flat blob).
- **Dimension 1, palette and bands.** Check 1.1: `look.py` prints the same colour count with and without
  the prop (16 in test 1). Check 1.4: `lone.png` shows thin seams on the helm, no solid block.
- **Dimension 2, light.** Check 2.3: the helm's rim faces the sun, like the elder's. Check 2.5: the lantern
  lights the helm in steps and stays brighter than its pool.
- **Dimension 4, silhouettes.** Check 4.5, the prop quiz: the evaluator names the prop at 1x without the
  label. Check 4.3: a procedural form needs three or more bands and a lit rim.
- **Dimension 6, motion.** Check 6.4: in the flicker frames the changed pixels sit on the helm's band seams
  and in the lantern pool. Nothing boils.
- **The whole frame must not get worse.** Version 1 scores no lower than version 3 on any dimension.
  Dimension 4 must be 6 or more, the rubric's ship floor.
- **Speed.** Under 0.2 ms added, median. Deopt count not higher.

Read the result like this:

- **B passes** if all of the above hold, the evaluator names the baked helm at 1x, and version 1 beats
  version 2 on dimension 2. Then make it the house method for anything a local light touches. Next step:
  one creature with two baked poses. Not before.
- **B fails** if after four rounds the evaluator cannot name the baked helm at 1x, or prefers the
  hand-drawn control in the lantern frames too. Then keep 3D to SKILL rule 5's exception (round organic
  things) and to the ground plane, and draw props by hand.

## What NOT to do

- **No smooth gradients on screen.** Every value goes through `dith`. The raw frame in test 3 is what a
  normal 3D render gives: 185 colours and soft mud.
- **No bloom or blurred glow in pixel pieces.** Glow is two gaussians in ramp space (Still Water
  `renderTop`, Muster `paintSky`) or Still Water's `glowTint`: a five-level dithered tint as the last pass.
- **No anti-aliased edges.** No `antialias: true`, no multisampling, no texture filtering, no canvas
  smoothing. Test 3: in-between colours along the edges.
- **No uneven scaling.** Whole-number scale only. The Kolobok study found uneven pixels because the stage
  scale is not snapped (`resize`).
- **No movement by fractions of a pixel for hard-edged things.** Round positions before drawing. Test 3
  counted 85 to 215 changed pixels per quarter-pixel step. Kolobok's loaf does move by fractions (`drawBall`
  solves the ray per pixel), and he loved that piece. The loaf is large and round with a powdery dithered edge.
- **No mixed pixel sizes.** Never show a sprite or a bake at another pixel size than the scene (Field Tips
  Hunter 3x, Reachbound Projection 2x, vignettes castle 2x). Bake at the size shown.
- **No extra ramp per material in a scene.** Hero: 64 colours. Field Tips: 40 to 55 per card. Souls: 20 to
  29. All three were judged less unified than Still Water's 12. Whether a menu screen like Hero may keep
  material ramps is his call. The rubric leaves that to him.
- **No dither-mixing of two images.** Hero's flicker and the Souls fog on the wolf put a screen-door over
  whole shapes. Change the value, then dither once.
- **No flat fill that lands mid-band.** Snap flat surfaces to a whole ramp step. Seen in the test 3 cube at
  44 degrees, Hero's icons at 0.5625, Muster's far ridge at 4.6, vignettes' ridge at 7.4.
- **No screen-tied dither on a baked sprite that moves.** Tie it to the sprite's own grid (test 1).
- **No hard-edged shadow wedges.** Kolobok's `shadowAt` and Muster's `drawLoaf` shadow are the known cases.
- **No perfect clean forms.** A flawless sphere is a moon. Break the surface: slashes, lumps, coverage.
- **No buildings or people from code primitives, distance shapes or low-poly meshes.** Summit's swords,
  the Souls tower, Field Tips' arch and wall, the cube in test 3.
- **No 3D light that ignores the scene's light.** Field Tips' fixed light vector, Hero's fixed `LK`.
- **No 3D object without depth.** Hero's dust over the bust and Field Tips' clouds over the sign are
  layer-order bugs. A depth buffer prevents them (rubric F7).
- **No per-frame 3D where a bake will do.** Summit's terrain, Field Tips' `animBell`.
- **No simulation inside `render`.** Muster's `drawLoaf` rolls and decays per rendered frame, so it runs
  twice as fast at 120 Hz.
- **No `readPixels` every frame.** 2 to 3 ms on a desktop in test 3. Unknown on phones.
- **No three.js from a CDN.** Cookbook: paste r128 into the page.
- **No bake on first view.** Bake behind the title screen.
- **No speed claims from headless Edge.** It proves a page draws. It says nothing about phones.

## Not tested, honestly

- No three.js code ran for this paper. I found no local copy and did not download one. C and D are
  judged from the cookbook, from raw WebGL tests of the same pipeline, and from the canvas studies.
- I did not open Arrival, Abyss, Hollow or Majestic.
- Nothing ran on a phone. Phone numbers are the SKILL's 3 to 5 times rule applied to laptop numbers.
- The three.js r128 size (about 600 KB) and its setting names are from memory.
- B at the Still Water bar is unproven. The pilot prop was judged only by the session that built it. That
  is not a rubric score. No lantern was built.
- Baked poses for moving creatures, sprites with face letters, baking from a mesh, and a flat-face rule
  for a D shader are proposals. None was built.
- Pixel crawl and dither flipping under movement were counted from stills, never watched in motion.
- Of the study frames I opened only these: Still Water `gold_boat_day`, Hero 02, 03, 06, 07, Kolobok 09,
  11 and `crop_c`, Summit 01 and 22. Everything else about the nine pieces is the studies' word.
- Times were taken on a busy machine. Read them as rough.
- The rubric's ship line is not calibrated yet (rubric, "Weak or untested"). The experiment inherits that.

## How to redo the tests

Temp folder (may be gone):
`C:/Users/farha/AppData/Local/Temp/claude/C--Users-farha-Verdant-Reach/e8b266ac-a378-4cb7-b9d1-4581878ae909/scratchpad/3dv2/`
with `pilot4.js`, `kolobok_hook.js`, `spike.js`, `hero_x.js`, `gl_mesh.html`, `look.py`, and the frames in
`pilot3_out/` and `gl_out/`. Nothing was written into the studio except this file.

Test 1 (Node):

1. Join kolobok `1_engine.js`, `2_sim_render.js` and `3_story_ui.js` into one temp `.js` file.
2. In the temp copy only: add `let HOOK = null;` before `function render(t)`. Add
   `if (HOOK) HOOK(IDX, ZB, t);` before the `drawForeground(...)` call in `render`. Add
   `setHook(f) { HOOK = f; }, get EDGE() { return EDGE; }` to `module.exports`.
3. Copy `len3`, `sdBox`, `sdCyl`, `smin` and the helm, plume and gorget lines of `scene()` from the Hero
   page. Yaw -0.5, tilt 0.12, plume cut to 6 spheres. Add a stake: `sdCyl` of radius 0.085.
4. Bake as `buildBust` does (orthographic, up to 70 steps, hit below 0.003, normal from six samples), at
   18 px per unit in a 56x54 window. Also keep occlusion: the mean over five steps h = 0.05 to 0.25 along
   the normal of `clamp(scene(p + n*h) / h, 0, 1)`, weighted 1/step.
5. Per frame, for each baked pixel:
   `f = base[mat] + sky[mat]*ny - ao[mat]*(1 - occ) + (1 - nz)^1.6 * (0.3 + rim[mat]*max(0, nx*ux - ny*uy))`,
   plus `4*max(0, n.L)`. Here `(ux, uy)` is the screen direction to the light. Table used: helm
   base 2.1, sky 1.1, rim 9, ao 2.2. The brow band adds 1.6. Pixels in the visor slit are set to index 0.
   Then `dith(f, i, j)` with `i, j` the sprite's own pixel, clamp to 0..11, write index and depth.
6. `init()`, `setH(384)`, `render`, then write PNGs with the skill's `scripts/png.js`. Time 300 frames of
   `update` plus `render` with and without the hook.

Test 2 (Node): copy lines 65-413 of `pieces/hero-of-the-reach/hero-of-the-reach.html` to a temp `.js` file.
In the temp copy add `buildBust`, `shadeBust` and a getter for `BUST` to `module.exports`. Call `init()`,
then `buildBust(96, 120, 20, 48, 82)`, and relight with a loop like step 5.

Test 3 (browser):

1. One HTML page with a 216x384 WebGL2 canvas (`antialias: false`), CSS size 648x1152, `image-rendering: pixelated`.
2. Pass 1 into an RGBA8 texture with nearest filtering and a depth buffer: a full-screen sky, then meshes
   whose fragment shader writes `value / 11` into the red channel. For the anti-aliasing case, draw into 4x
   multisample renderbuffers and blit to the texture.
3. Pass 2, full screen: `f = value*11; fr = fract(f); fr = fr < 0.28 ? 0 : fr > 0.72 ? 1 : (fr - 0.28)/0.44;`
   `index = floor(f) + (fr > (BAYER[(y&3)*4 + (x&3)] + 0.5)/16 ? 1 : 0)`, colour from a 12-entry palette.
   BAYER is the house matrix: 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5.
4. Rotation, sub-pixel shift and anti-aliasing come from URL parameters, because headless Edge cannot step a
   page to a chosen moment.
5. Screenshot from PowerShell: `msedge --headless=new --disable-gpu --hide-scrollbars --user-data-dir=<fresh>
   --window-size=648,1152 --virtual-time-budget=4000 --screenshot=<out.png> file:///<page>?ang=44`.
   Use `--enable-gpu` for the real GPU. Use `--dump-dom` in place of `--screenshot` to read timing text the
   page writes into a hidden element.
6. Compare with Pillow: sample the centre of every 3x3 block and count differences.
