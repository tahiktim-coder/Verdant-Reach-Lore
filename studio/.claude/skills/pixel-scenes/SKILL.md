---
name: pixel-scenes
description: Build live pixel-art game visuals as code-rendered HTML canvas pieces in the Still Water / Kolobok / Muster style — scenes, playable vignettes, character or creature menus, title screens, portraits, props. Use this skill whenever the user asks for pixel art, a game scene, a menu or UI screen for a game, a creature or character screen, a visual prototype, a mood piece, or anything "like Still Water", "like Kolobok" or "like the Muster", even if they never say "pixel art" or "canvas".
---

# Pixel scenes

This is a method, not an engine library. Every piece is a small software renderer written for that piece:
code decides the colour index of every pixel in a small canvas (216 px wide), and the browser scales it up
with nearest-neighbour. The quality comes from strict art rules plus rendering frames headless and looking
at them before shipping. Finished pieces are in `examples/`; copy from them freely:
`still-water/` (the original: the boat scene that set the quality bar), `kolobok/` (a playable scene with a
perspective valley and an invisible object), `muster/` (a character menu with six portraits), `summit-road/` (voxel terrain, god rays, lightning), `souls/`
(three static-camera showpieces: tower in clouds, cathedral city, wolf in mist).

## The look (non-negotiable rules)

1. **One hue-shifting ramp per scene.** 12 colours, dark to light, and the hue moves along the ramp
   (indigo shadow > plum > rose > rust > gold > cream; or navy > teal > mint). Everything in the scene uses
   it. Add at most 2–5 accent colours for things that must pop (glowing eyes, flour, a red sun).
2. **Clean bands, dither only at band edges.** Compute a continuous value per pixel, then turn it into a
   ramp index with `dith(f, x, y)` (`examples/kolobok/1_engine.js`): flat bands, 4×4 Bayer dither only in
   the middle 44% of each step. Never raw noise dither across whole areas: it speckles.
3. **The light source is in the frame.** A sun, moon, red sun, rift or lantern, with a glow falloff in the sky.
   Things between you and the light get a rim light on the side facing it.
4. **Lots of empty space, one focal point.** Big calm sky, one subject. Details go where the eye lands.
5. **Code draws landscapes; hands draw things.** Sky, clouds, ridges, water, fields, fog: procedural.
   Characters, buildings, props: hand-drawn sprites as text rows (`sprite([...rows], map)`), usually
   silhouettes that get their rim light automatically (`rimLit`). Code-drawn people and architecture look bad.
   Organic round things (a fish head, a loaf) can be procedural if they are shaded like 3D forms.
6. **Motion is small and constant.** Wind waves, ripples, blinking eyes, cloth, drifting clouds, birds.
7. **Text is HTML over the canvas** in Pixelify Sans, positioned in canvas-pixel units, so it stays sharp.

## Workflow

1. **Brief first (in your working notes):** subject, light source and its position, the ramp's 12 colours,
   horizon height, where the focal point sits, what moves, what the user can do.
2. **Build static layers once** (sky, clouds, hills, ground base, foreground) into index buffers.
   Per frame, only redraw what moves.
3. **Render headless and look.** `node scripts/shoot.js game.js --at 0,2,6 --out shots` writes PNGs;
   open them with your image viewer tool and judge them like an art director. For sequences, render several
   moments and make a sheet: `python3 scripts/sheet.py sheet.png shots/*.png`.
4. **Fix what you see, then look again.** Expect 3–6 rounds. Crop and upscale areas you are unsure about.
5. **Measure speed:** `--fps-test`. Aim for under 4 ms median on a laptop (phones are 3–5× slower).
6. **Smoke-test the real page:** build the single HTML file, then `node scripts/dom_smoke.js page.html`
   (needs `npm i jsdom`). Extend it to click your buttons and check text. Zero errors before you ship.
7. **Ship one self-contained HTML file.** Script and CSS inline; only Google Fonts and nothing else external.

## File pattern (copy from the examples)

- Wrap everything in an IIFE. `const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined'`.
- At the end: in a browser, `boot()`; otherwise `module.exports = { init, setH, update, render, setOut, G, W, get H() {...} }`
  so `scripts/shoot.js` can drive it. Any action you want to test (`act`, `tap`, `begin`) goes in the exports too.
- `init()` builds everything that doesn't depend on screen height. `setH(h)` allocates buffers and builds
  height-dependent layers. Height adapts to the screen: 384–470 px for a 216 px wide canvas.
- Keep the source in parts (engine, simulation/render, story/UI) and a `shell.html` with `/*__GAME__*/`
  where the script goes; a tiny `build.py` joins them.
- Palette: a `Uint32Array` of colours; the frame is an index buffer (`Uint8Array`) mapped through the palette
  at the end of `render`. Several scenes in one page get one 16-slot block each (`examples/muster/muster.js`).
- Sound is synthesised with WebAudio (no files), started on the first tap, with a mute button.

## Techniques and where to find them

| Technique | Where |
| --- | --- |
| Ramp index with band-edge dither: `dith` | kolobok `1_engine.js` |
| Sky gradient toward a light, horizon band: `skyValue` / `paintSky` | kolobok `1_engine.js`, muster `muster.js` |
| Clouds from puff clusters, lit on the side facing the light: `genClouds` / `paintClouds` | both |
| Ridges by midpoint displacement: `genRidge` | both |
| Mirror water with per-row ripple and a glitter path: `mirror`, `lakePix` | muster, kolobok |
| Hand-drawn sprites from text rows, mirrored, rim-lit: `sprite`, `mirror`, `rimLit` | both |
| Polygon silhouette sprites with carved text (the stone elder): `genStone` / `genElder` | both |
| Perspective ground: every ground pixel mapped once to world X/Z: `genGround` | kolobok `1_engine.js` |
| Wind over a field: travelling sine over world X/Z from a lookup table | kolobok `2_sim_render.js` |
| Tracks and dust stamped into a world grid, decaying: `stampTrail`, `dustSplat`, `fadeArray` | kolobok `2_sim_render.js` |
| Invisible object revealed by powder: ray–sphere per pixel + a coverage texture in the object's own frame, rolled by a rotation matrix: `drawBall`, `deposit` | kolobok `2_sim_render.js` |
| Shadow only where powder sits, with an ellipse early-out: `shadowAt` | kolobok `2_sim_render.js` |
| Puff clouds of powder with noisy dithered edges: `drawBursts` | kolobok `2_sim_render.js` |
| Procedural creature head (superellipse, scale rows, gill line, lips, barbels): `drawFish` | muster |
| Dither-dissolve blink, recursive tree that grows: `drawHunter`, `drawTree` | muster |
| Frame chrome, bevelled boxes, pixel icons, thumbnails: `genChrome`, `ICONS`, `genThumbs` | muster |
| Captions, prompts, endings, stored endings, adaptive frame rate, audio: story/UI part | kolobok `3_story_ui.js` |
| Voxel-space terrain: per column, step in depth, fill down to a y-buffer; cloud sea in the same pass: `renderTerrain` | summit-road |
| Work in continuous ramp values, blend to fog by depth, dither once at the end: `VAL` buffer | summit-road |
| God rays: half-resolution radial blur of a clear-sky mask toward the light: `renderRays` | summit-road |
| Lightning: midpoint-displaced bolts, flicker, whole-palette flash: `strike`, `buildPal` | summit-road |
| Palette cycling along a glowing blade; four-frame walk cycle; scaled billboards: `drawWalker`, `drawRelics` | summit-road |
| Tileable noise texture sampled with scrolling offsets (cheap animated clouds): `genNoise`, `nt` | summit-road |

## Performance rules (these cost a day once)

The renderer touches every pixel every frame, so V8's optimiser must stay happy:

- **Fixed numbers are plain constants** (`const SUNX = 62`), never fields read from small objects in hot loops.
- **Numbers that change every frame live in typed arrays** (`const FX = new Float64Array(3)`), and so do
  matrices (`Float64Array(9)`). Swapping between a plain array and a typed array, or between arrays of
  different kinds, causes endless deoptimisation.
- **Never let two kinds of object share field names in the same order.** A particle `{x, y, z}` and the sun
  `{x, y, r}` share a hidden shape and kept throwing the renderer out of optimised code. Use unique names
  (`fx, fy, fz`) or arrays.
- **Heavy loops go in small leaf functions** that take only numbers and typed arrays (`fadeArray(A, by)`), so
  they are optimised with warm feedback instead of bailing out on a rarely used branch.
- **Precompute anything static per pixel** (world coordinates, base shading, noise) once per screen height.
- **Pass state into draw functions** instead of reading a big state object inside pixel loops.
- Check: `node --trace-deopt shoot.js ... 2>&1 | grep -c bailout` should be a small number, not hundreds.
- In `frame()`, if the render average climbs above ~12 ms, draw every other frame rather than stutter.

## Failure list (seen, fixed, don't repeat)

- Characters or buildings drawn with code primitives look amateur: hand-draw them as silhouettes.
- Noise used as texture at a distance speckles: fade texture amplitude with distance.
- A field-strip or grid line passing through the camera draws a straight line down the screen: offset it.
- Powder or smoke drawn as clean blobs reads as cartoon pills: add moving noise to the density and a wide
  dither band at the edge.
- A dark seam where a far ridge meets the ground: clamp the depth fade in the ridge fill.
- Dense glitter columns under the sun look like a Christmas tree: raise the threshold, narrow the path.
- Scene helpers stored as properties on a typed array (`b.shore = ...`) vanish on copies: keep them in variables.
- Something transparent needs tells: tracks, birds standing on nothing, a shadow only when revealed.

## Delivery checklist

- One HTML file, works offline apart from the font, no console errors, plays on a phone in portrait.
- Every text line is readable at phone size; captions have a dark text shadow.
- Headless frames looked at, including the moment the user will screenshot.
- `--fps-test` median under 4 ms; deopt count small.
- Tell the user honestly what is weak or untested.
