# Roadmap: a tiny engine grown from the pieces

Goal: a small engine that makes the next piece faster to build than the last one, without losing the look.
Grow it out of working pieces; never design it in the abstract.

## Constraints
- Plain JavaScript modules, no required build step, no framework. A game ships as one HTML file.
- Target size for the core: under ~2,500 lines.
- Everything renders headless in Node for testing (`scripts/shoot.js` pattern) and in the browser.
- Keep the performance rules in the pixel-scenes skill (typed arrays for per-frame state, no shared object shapes in hot loops).
- The engine must reproduce the examples pixel for pixel before anything new goes in.

## Phase 0: get oriented (first session)
1. Read `CLAUDE.md`, the lore files, `art/art-direction.md` and the skill.
2. Render every example headless (`node .claude/skills/pixel-scenes/scripts/shoot.js ...`), look at the frames,
   and write a one-paragraph summary of each example's structure in `COOKBOOK.md`.
3. Report back in a few lines: what's shared across the examples, what's different, what you'd extract first.

## Phase 1: extract the core
Pull the shared code out of the examples into `engine/`:
- `core.js` screen size (216 wide, adaptive height), index buffer, palette blocks (16 slots per scene ramp), `dith`, noise, hashing, RNG
- `paint.js` sky toward a light, clouds, ridges, fill-below, discs, mirror water
- `sprite.js` text-row sprites, mirroring, automatic rim light, stamping with depth
- `ground.js` perspective ground (pixel to world X/Z), world grids for tracks and dust
- `fx.js` particles, powder clouds, dissolve and blink
- `ui.js` HTML overlay placed in canvas-pixel units, captions, buttons
- `audio.js` the small WebAudio synth (tones, filtered noise)
- `app.js` boot, resize, frame loop with the slow-device fallback, input (tap, swipe, keys)
- `testing/` headless runner, contact sheets, jsdom smoke test

## Phase 2: prove it
Port Muster, then Kolobok, onto the engine. Pass when:
- headless frames at fixed times match the originals (or differences are explained and approved),
- median frame time is no worse,
- each port's own code is noticeably shorter.

## Phase 3: scenes as data
A scene description (a JS object): ramp, light, horizon, clouds, ridges, water, ground, sprites and their
animations. A viewer page that loads any scene. Sprite import from a PNG drawn in any editor, snapped to the ramp.

## Phase 4: first small game on it
Pick with Farhad. Candidates: Still Water rebuilt on the engine, or a Verdant Reach vignette (a Verdant Knight
and the Covenant's Hunter). Add only what that game needs: game states, saving, a camera pan, text and dialogue.

## Always
- After every piece or engine step, update `COOKBOOK.md` (what, how, what went wrong).
- Show him frames or a playable link, say what's weak, and ask one question at most.
