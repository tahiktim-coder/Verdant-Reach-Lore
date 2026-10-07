# Technique library: Reach Studio house style

Version 1, 2026-10-02. For Farhad and for future Claude Code sessions.
Written by a Claude Code session. "I" below means that session.

When you build a new asset, look here first. Pick the technique the scene needs, copy the named
implementation, start from the listed numbers. Then every asset comes out in the same style at the same quality.

**What this rests on.** Nine code-and-frame studies of the existing pieces (frames in `art/frames/<piece>/`),
the pixel-scenes skill, `art/art-direction.md` and `docs/cookbook-claude-ai.md`. Function names and line
numbers come from the studies. I checked them with grep against the source files on 2026-10-02; they match
to within a few lines. I opened 57 of the frames myself while writing (list at the end). Where an evidence
line names a frame that is not on that list, it repeats what the study of that piece recorded.

**Related files.** `art/quality-rubric.md` scores a finished frame. `docs/3d-in-the-house-style.md` is the
options paper for 3D. This file is the lookup table for building.

## How to use this

1. Write the brief first (SKILL workflow step 1): subject, light source and where it sits, the ramp, the
   horizon height, the focal point, what moves.
2. Go to "The standard kit" below. It names one implementation per need. Start there.
3. For anything not in the kit, open the section for that category. Each entry says what it is, when to use
   it, where to copy it from, the numbers that make it look right, what went wrong before, and a grade.
4. Copy the function from the named file. Do not rewrite it from memory. The pieces drifted apart exactly
   because helpers were retyped (see "Same name, different code" in section 13).
5. If the scene needs something listed under "Gaps", say so to Farhad before building. It has no proven
   implementation yet. Budget extra render-and-look rounds.
6. Render, look, fix (section 13). Score the result with `art/quality-rubric.md` in a fresh session.

**Grades.**

| Grade | Meaning |
| --- | --- |
| PROVEN | Looks at or above the Still Water bar in rendered frames. Copy as is. |
| GOOD | Works. Has a known minor issue, listed in the entry. Copy and apply the fix. |
| WEAK | Do not copy as is. The entry says why, and what to use instead. |
| NOT GRADED | Could not be judged from frames (all audio, some browser-only things). |

Every grade has one line of evidence: a frame file, a measurement or a study finding.

**Short names used below.**

| Short name | File |
| --- | --- |
| still-water | `.claude/skills/pixel-scenes/examples/still-water/still-water.html` |
| kolobok | `.claude/skills/pixel-scenes/examples/kolobok/` (`1_engine.js`, `2_sim_render.js`, `3_story_ui.js`) |
| muster | `.claude/skills/pixel-scenes/examples/muster/muster.js` |
| summit | `.claude/skills/pixel-scenes/examples/summit-road/summit.js` |
| souls | `.claude/skills/pixel-scenes/examples/souls/souls-scenes.html` |
| vignettes | `.claude/skills/pixel-scenes/examples/vignettes/index.html` |
| reachbound | `pieces/reachbound-muster/src/reachbound.js` |
| hero | `pieces/hero-of-the-reach/hero-of-the-reach.html` |
| tips | `pieces/reach-field-tips/tips.js` |
| SKILL | `.claude/skills/pixel-scenes/SKILL.md` |
| cookbook | `docs/cookbook-claude-ai.md` |

"L285-305" means lines 285 to 305 of that file. Frames are named as `piece/file.png` under `art/frames/`.
kolobok line numbers are per part. `1_engine.js` holds palette, sprites, sky, paths, ground, foreground and
the flour texture (`dith`, `genStone`, `skyValue`, `genClouds`, `genGround`, `genForeground`, `genTex`).
`2_sim_render.js` holds the simulation and every `draw...` and `render...` function. `3_story_ui.js` holds
story, audio and page code.

**Contents and entry numbers.** Every technique has a number so entries can point at each other.

| Section | Entries |
| --- | --- |
| 1. Palette and colour | P1-P12 |
| 2. Light | LT1-LT14 |
| 3. Sky and clouds | S1-S5 |
| 4. Landscape: ridges, ground, fields, forest | G1-G14 |
| 5. Water | W1-W8 |
| 6. Motion: wind, cloth, creatures, particles, weather | M1-M16 |
| 7. Depth and layers | D1-D8 |
| 8. Drawn sprites, and how they combine with procedural layers | SP1-SP10 |
| 9. 3D geometry inside the pixel style | T1-T8 |
| 10. Text and UI | U1-U10 |
| 11. Audio | one table, not graded |
| 12. Performance | PF1-PF8 |
| 13. Pipeline: render, look, fix | PL1-PL14 |
| 14. Gaps: techniques the house style does not have yet | gaps 1-18 |
| 15. From the cookbook: techniques outside the pixel pipeline | one table |
| 16. What is weak or untested in this library | |

Most sections end with a "Do not copy" list. Read it before copying anything from the piece it names.

## The standard kit

One pick per need. These are the decisions of this library. The reasons are in the sections.

| The scene needs | Use | Copy from | Grade |
| --- | --- | --- | --- |
| A palette | One 12-step ramp plus 2 to 5 accents, in a 16-slot block | muster `PALDEF` L30-47 | PROVEN |
| A mood change, day to night, fade to black | Crossfade whole ramps with one number; fade by sliding the ramp | still-water `buildPalette(mood, dim)` L285-305 | PROVEN |
| A ramp index from a value | Band-edge dither | kolobok `1_engine.js` `dith` L72-77 | PROVEN |
| A sky with the light in frame | Gradient + two glow sizes + horizon band | muster `paintSky` L107-114 (static); still-water `renderTop` L796-823 (moving sun) | PROVEN |
| Background clouds | Puff-cluster density field, lit toward the light | still-water `genClouds` L320-375; reusable form souls `swClouds` L302-346 | PROVEN look, no motion |
| A big cumulus as the subject | Sphere-shaded puffs | tips `genCumulus` + `renderClouds` L55-98 | GOOD, four fixes needed |
| Mountains and ridges | Midpoint displacement + slope shading + haze | still-water `genRidge` L377-397, `shadeM` L404-422, `MCFG` L398-403 | PROVEN |
| A lake | Mirror with ripple, darkening, streaks, glitter cone | still-water `computeWater` L871-904 | PROVEN |
| A field on a plane, with wind | Perspective table + travelling sine | kolobok `genGround` L453-490, `renderGround` L328-331 | PROVEN |
| A person, creature or prop | Hand-typed text-row sprite + automatic rim | muster `sprite` L58-62, `rimLit` L64-75 | GOOD |
| A standing stone, a monolith | Polygon silhouette + mottling + rim + carved font | muster `genElder` L226-246 | PROVEN |
| A round 3D form | Ray against a sphere + texture in its own frame | kolobok `drawBall` L385-446 | PROVEN |
| A small warm light in a cold scene | Dithered tint after the palette | still-water `glowTint` L1157-1190 | PROVEN |
| Sprites reflected in water | Sprite layer where each pixel plots its mirror | still-water `plotR`, `stampR` L944-962 | GOOD |
| Sprites that sort against 3D | Depth buffer stamps | kolobok `stampZ`, `plotZ` L447-480 | PROVEN |
| Scripted change over time | One state object, tweens, timelines | still-water `WS` L666-674, `playCine` L1362-1374 | PROVEN |
| Text | HTML over the canvas in canvas-pixel units, Pixelify Sans | muster `shell.html` L34-53, `makeUI.layout` L761-773 | PROVEN in headless Edge |
| A menu frame | Bevelled boxes, hand-typed icons | muster `genChrome` L599-630, `ICONS` L590-597 | GOOD |
| Sound | Two primitives, tone and noise | kolobok `3_story_ui.js` `SFX` L192-272 | NOT GRADED |
| Speed | Static bake + overlay, typed arrays, leaf functions | kolobok (all three parts) | PROVEN, 1.8-2.0 ms |

Rules that came out of the studies and apply to everything below:

- **One light position per scene.** Every lit thing takes its direction from it. A fixed global light vector
  lit clouds from the wrong side on six cards (tips `LX, LY, LZ` L51).
- **Flat fills snap to a whole ramp step.** A constant value whose fraction lands between 0.28 and 0.72
  dithers the whole area (muster far ridge at 4.6, vignettes ridge at 7.4, hero icons at 0.5625).
- **Dither once.** Change the value, then call `dith`. Never mix two finished images through a Bayer mask
  (hero flicker, souls fog on the wolf).
- **One pixel size.** Never draw a sprite at 2x or 3x (tips Hunter, reachbound Projection, vignettes castle).
- **Paint every pixel.** Sky, then ground, with no gap between them (muster and reachbound horizon lines).
- **Simulation goes in `update`, never in `render`** (muster `drawLoaf` runs twice as fast at 120 Hz).
- **Seed the random numbers** (`mulberry32`). Pieces that call `Math.random` cannot be re-rendered the same.

### Starting recipes by scene type

Each line lists entry numbers from the sections below. They are starting points taken from the piece that
did that scene best.

| Scene | Start from | Entries |
| --- | --- | --- |
| Lake or sea with a low light and a small subject | still-water | P1, P2, P5, LT1, LT2, S1, G1, G2, D2, D7, W1, W2, W5, SP2, M2 |
| Open field or valley seen from a hill | kolobok | P1, P5, LT1, LT2, LT8, S1, G5, G7, G8, G11, T1, M1, D3, SP4 |
| Character or creature portrait in a menu | muster | P1, P4, LT1, LT2, D1, D6, SP1, SP2 with `rimLit`, M7, M8, U1, U3 |
| Night scene with one warm light | still-water night, vignettes camp | P2, LT5, LT6 or LT7, G12, M10, M11 |
| A round creature or object that turns | kolobok | T2, LT9, LT11, M12 |
| A storm with lightning | summit | P7, P8, S4, LT10, M14, D4 |

## 1. Palette and colour

### Compared: one ramp, warm and cool ramps, material ramps

| Approach | Piece | Colours on screen | What the frames show |
| --- | --- | --- | --- |
| One 12-step ramp + accents | still-water, kolobok, muster, summit | 12 in the gold frame; kolobok's whole palette is 17 | Every pixel sits in one light. All frames at the bar use this. |
| One ramp per mood, crossfaded | still-water | 12 at any moment | Day, night and blood all look intended. So do the half-way palettes. |
| Cool ramp + warm ramp, handover by dither | vignettes (upgraded mode) | 12 cool + 8 warm + 2 | Helps the night camp. Hurts both sunset skies: orange dots on blue-grey. |
| One ramp per material | hero (64 colours, 9 ramps), tips (40-55 per card), souls (20-29) | many | Rich up close. Does not feel bathed in one light. Only tips card 3, which is nearly one ramp (28 colours), reaches the bar. |

**Standard: one ramp per scene, 12 steps, plus 2 to 5 accents.** Reason: it is SKILL rule 1, and every frame
that reached the bar uses it. Warm and cool ramps are allowed only for a local warm light at night, and the
way to do that is LT6 (PROVEN) or LT7 (GOOD), not a second sky ramp. Material ramps are outside the rule. Whether to
allow them is Farhad's call (the rubric says the same).

Note on hue shift: the gold frame's day ramp is one blue, navy to ice white (still-water `RAMP.day` L266).
So hue shift along the ramp is an option. Clean, even value steps are the part that cannot be skipped.

#### P1. One 12-step ramp in a 16-slot palette block [PROVEN]
- What: slots 0-11 are the ramp, dark to light. Slots 12-15 are accents. Each scene owns one block of a
  256-entry `Uint32Array`. Draw code writes `offset + index`.
- Use when: always. Several scenes on one screen (menu, thumbnails) each get a block.
- Copy: muster `PALDEF` L30-38 and the `OFF`/`PAL` builder L39-47. The ramps in use are listed in
  `art/art-direction.md` (dusk, night lake, green dawn, red sun, storm violet).
- Numbers: 12 ramp steps and up to 4 accents per 16-slot block (kolobok keeps 5 accents in its own
  17-entry palette). Accents only on things that must pop: mint eyes `#bff0cf`, four flour greys, a cyan rift.
- Goes wrong: an unpainted pixel is index 0 of block 0, the menu's dark green. It shows as a black or
  green-black line (muster rows 76, 68, 88-91; five of nine portraits in reachbound). An accent used as a
  flat fill looks pasted on (muster fish sheen `#8fb3b0`, reachbound lantern pool).
- Evidence: six ramps sit side by side with no clash in `muster/20_page_edge_648x1152_pebble_with_text.png`.

#### P2. Mood ramps crossfaded by one number [PROVEN]
- What: three 12-colour ramps (day, night, blood) and three matching accent sets. `mood` 0..1 blends day to
  night, 1..2 blends night to blood, per slot, in plain RGB. The scene's indices never change.
- Use when: day to night, a story turn, any slow change of light. This is the house day-night transition.
- Copy: still-water `RAMP` L265-269, `ACC` L271-275, `buildPalette` L285-305. It also keeps a float RGB
  copy (`PALRGB`) for glows and UI colours.
- Numbers: the night ramp tops out at a mid grey-blue (`#8e9cc4`), so night is dark with no extra code.
  Run it every frame: it costs under 0.01 ms.
- Goes wrong: baked layers do not re-light. Mountains keep their day shading at night. Under the blood ramp
  the lantern accent is nearly the sky colour and its glow vanishes (frame 13a).
- Evidence: `still-water/sheet.png` rows 2 and 3. The 21% and 61% in-between palettes (frames 09a, 09b)
  look like palettes of their own.

#### P3. Fade to black by sliding the ramp [PROVEN]
- What: `dim` shifts every ramp slot down the ramp. Slot i takes the colour at i - dim. Accents are not dimmed.
- Use when: an ending, a blackout, a scene going dark while its lights stay on.
- Copy: still-water `buildPalette` L293-303, used by `CINE_DARK` L1420-1435.
- Numbers: dim runs 0 to 11 over 4.5 s. Below zero, colour 0 fades to black over 2.5 steps.
- Goes wrong: flat dark silhouettes vanish completely. That suits an ending and nothing else.
- Evidence: frames 12c and 12d: lantern, cabin window and fish glow alone on black.

#### P4. Whole-palette dim for a scene swap [GOOD]
- What: multiply every palette colour toward black, swap the scene, bring it back.
- Use when: switching portrait, card or scene.
- Copy: muster `buildPal(dim)` L49-55 and the fade in `update` L667-672.
- Numbers: 0.16 s out, 0.2 s in.
- Goes wrong: it dims the chrome and thumbnails too, so the whole menu blinks. HTML text does not dim.
  Fix: dim only the portrait's block.
- Evidence: `muster/19_transition_pebble_to_fish_b_dark_t0.16.png` (study).

#### P5. Band-edge dither, `dith` [PROVEN]
- What: take the fraction of a continuous ramp value. Below 0.28 round down. Above 0.72 round up. Only the
  middle 44% is compared with a 4x4 Bayer matrix. Result: flat bands with a thin woven seam.
- Use when: every value that becomes a ramp index.
- Copy: kolobok `1_engine.js` `BAYER` L70, `dith` L72-77, `ci` L78. The same code is in still-water
  L252-260, muster L24-26, summit L17-18, vignettes L55, hero L78-80, tips L12-14.
- Numbers: 0.28 and 0.72. Do not use the wider 0.22-0.78 window that sits unused in souls `dith` L108-113.
- Goes wrong, three ways:
  1. A flat fill with a mid-step value becomes a checker over the whole area. Snap flat fills to a fraction
     below 0.28.
  2. A very slow gradient makes the seam 8 to 12 px tall, so it reads as knit bands (kolobok upper sky,
     summit sky and road). Steepen the gradient or accept fewer bands.
  3. A per-row constant added before `dith` makes whole rows checker (still-water reflected clouds).
- Evidence: halo rings in `still-water/crop_day_sun_glow_dither_x6.png` are clean bands with thin seams.

#### P6. Accent slots that change with the mood [GOOD]
- What: each accent (bobber, gold, lantern, eye, star, bone) has a day, night and blood value.
- Use when: P2 is in use and accents must still belong to the scene.
- Copy: still-water `ACC` L270-275, character map `CH` L458.
- Numbers: 12 accents in still-water: bobber, a 4-step gold ramp, lantern, eye, black, star, red eyes, 2
  bone.
- Goes wrong: an accent can land on the sky colour in one mood (lantern under the red sun). Check every mood.
- Evidence: gold on blue is the only warm thing in the day frames and pops hard (`still-water/sheet.png`).

#### P7. Lighting in ramp space: float value buffer, one dither at the end [GOOD]
- What: every layer writes a continuous ramp value (0-11) per pixel into a float buffer. Fog, glow, rays
  and flash are additions or blends on that number. One `dith` pass at the end.
- Use when: several light effects stack on the same pixels. This is the right core for the engine.
- Copy: summit buffers L68-73, the single dither loop in `render` L325.
- Numbers: fog blends toward 5.9, which matches the sky value at the horizon (5.6).
- Goes wrong: shallow gradients put large areas inside the dither zone (problem 2 under P5). Values got
  crushed: 86% of pixels in three neighbouring steps, top two steps never used.
- Evidence: rays on and off in `summit-road/07_godrays_on_t60_clouds_near_crown.png` and
  `08_diag_godrays_off_t60.png`: light stacks without leaving the ramp. The calm frame is murky, so the idea
  is proven and the tuning is not.

#### P8. Palette flash [GOOD]
- What: lift every ramp colour toward a light colour for a moment.
- Use when: lightning, an impact.
- Copy: summit `buildPal(flash, dim)` L25-33.
- Numbers: lift 16% toward (170, 255, 200), accents 10%. Decay exp(-5t): half gone in 0.14 s. The cookbook
  rule is the same: keep the lift near 15%.
- Goes wrong: it lightens everything evenly, so contrast drops during the strike. It needs a directional
  rim on the subject as well (not built, see Gaps).
- Evidence: the strike frames 02 to 05 in `art/frames/summit-road/` (study): no mint wash, gone by 0.6 s.

#### P9. Palette cycling along a line [GOOD]
- What: each pixel of a blade takes accent `12 + ((k + floor(9t)) % 3)`, so three greens run along it.
- Use when: a glowing blade, a rune, a rift edge.
- Copy: summit `drawWalker` L240-247.
- Numbers: 3 accents, 9 steps a second. One spark pixel at the tip when sin(5.3t) > 0.6.
- Goes wrong: nothing seen. It covers under 0.1% of the frame, so it only works next to the focal point.
- Evidence: in `summit-road/20_crop_walker_cycle_8_moments_x9.png` the blade is the thing the eye finds.

#### P10. Darken one step inside any ramp, the `DARK` table [GOOD]
- What: a 256-entry lookup: for each palette index, the index one lower, unless it is the first of its ramp.
- Use when: reflections or shadows in a multi-block palette, where the code does not know the material.
- Copy: tips `DARK` L154-155.
- Numbers: 256 entries, built once.
- Goes wrong: tips switched from one step to two at 24 rows below the waterline, which left a hard
  horizontal seam.
- Evidence: used for both tips lakes. Only tested on water.

#### P11. Portal: another ramp inside a mask [GOOD]
- What: pixels inside a shape are painted with a different ramp block (day sky inside a night arch).
- Use when: a door, a window, a vision.
- Copy: tips `buildArch` L273, L282-283.
- Numbers: the tips arch is a circle plus a rectangle (`inArch` L261); a few white motes drift out of it
  (L294).
- Goes wrong: the arch around it was code-drawn and flat. The idea reads; the frame around it did not.
- Evidence: tips card 4 reads at small size as a warm day inside a cold night (`field-tips/sheet.png`, row 2).

#### P12. Old/new palette router for A/B tests [GOOD]
- What: draw code calls `C(v)` for cool and `Wm(v)` for warm. A switch remaps both onto one ramp.
- Use when: tuning a look. One scene description, two colour policies, switchable live.
- Copy: vignettes `C`, `Wm` L84-85, `buildPal` L72-81.
- Numbers: block stride 40 per scene: 12 cool, 8 warm, 2 accents, 12 for the combined old ramp.
- Goes wrong: the combined ramp jumps from mid cool to mid orange at step 7, so old-mode stars and moon
  paths turn orange. The old castle uses near-equal layer values, so that comparison overstates what the
  upgrade buys.
- Evidence: `vignettes/sheet.png` shows both policies from the same code.

#### Do not copy
- **Warm/cool handover by a wide Bayer threshold** (vignettes `drawLake` L254-258, `drawCastle` L217-221,
  threshold 0.08 + Bayer x 0.5) [WEAK]. It is whole-area dither between two colours that cannot blend.
  `vignettes/lake_upgraded_t2.00s.png` shows orange dots over blue-grey; `lake_old_t2.00s.png` has the
  cleaner, bolder band. The cookbook says the same: bold colour bands can beat realism.
- **Dithered corner vignette** (vignettes `vignette` L97-103) [WEAK]. One step is too little to frame and
  enough to add stipple to clean sky bands.
- **Long ramps with accent groups** (souls `makePalette` L122-130: 15-16 steps plus groups) [WEAK]. 25 to 29
  colours on screen in tower and city; the city shows six hue families and reads as a tile set.
- **`buildPalette(dim)` in kolobok** (L92-96). Dead feature: `G.dim` never changes. Use P2/P3.

## 2. Light

### Compared: rim light

| Variant | Piece, function | How | Result |
| --- | --- | --- | --- |
| No rim, light backdrop | still-water `MCFG` haze L398-403 | Haze lifts the mountain foot behind the boat by up to 5.6 steps | The bar frame. Flat black sprites read because of the backdrop. |
| Automatic rim on a sprite | muster `rimLit` L64-75 | Body pixel with an empty neighbour toward the light becomes rim; two steps away becomes a softer rim | Free backlight on knight and hunter. Also lights inner gaps: both legs get bright stripes. |
| Two-light rim | vignettes `rims` L106-117 | Warm rim toward the fire, cool rim from above, warm wins | Correct. 2-4 pixels on 16x21 figures, easy to miss. |
| Hand-coded rim in a generator | kolobok `genStone` L192-230; muster `genElder` L226-246 | Edge pixels facing the sun get 2 rim values, a softer value one pixel in, far edge darkest | Best rim in the studio. |
| Offset tests on a polygon mask | souls `sceneWolf` L840-849 | Graded: edge 11, then 8, 5, 2 moving inward | Clean lit line along the wolf's back. |
| Directional rim on a round form | kolobok `drawBall` L426-432 | (1 - n.v)^1.6 x (0.3 + 3.8 x facing the sun) | Cream crescent on the loaf. |
| Rim baked at a fixed index | summit `WALK` map L224-228 | Top and side edges become ramp 6 | Fails: the road behind is 5-6, so the rim erases the head. |

**Standard: `rimLit` for sprites, the `genElder` edge rules for generated stones, the `drawBall` rim term
for round forms.** Reason: `rimLit` is the only general helper and it is shown working on two figures. Apply
three fixes when copying it: (1) pass the direction from the scene's light, (2) pick a rim value at least 2
ramp steps brighter than what is behind the sprite (the rubric asks for the same), (3) skip edges that face an
inner gap, so legs do not turn into wire. If the sprite is tiny, do what the gold frame does: no rim, and a
backdrop at least 4 steps lighter than the body.

#### LT1. Sky gradient toward a light in frame [PROVEN]
- What: a vertical gradient, plus two gaussian glows around the light (one tight, one wide), plus a bright
  band along the horizon that is strongest under the light.
- Use when: every outdoor scene.
- Copy: muster `paintSky(b, o, hz, L, top, bot, glow, band)` L107-114 for a static bake. still-water
  `renderTop` L796-823 when the sun moves or changes. kolobok `skyValue` L255-263 is the same formula with
  fixed numbers.
- Numbers (muster): the value is the sum of three terms. Gradient: top + (bot - top) x (y/hz)^1.6.
  Glow: glow x (0.6 x exp(-d2/g1) + 0.4 x exp(-d2/g2)). Horizon band:
  band x exp(-(hz - y)^2 / 160) x (0.4 + 0.6 x exp(-dx^2 / 7000)). Tight halo g1 180-500, wide g2
  2600-5000 (2400 is only the unused default), glow 3.6-5.6 ramp steps, band 0.8-2.0. Still Water: base 4.1 + 4.5 x (y/HY)^1.5, glow
  2.1 x exp(-d2/24^2) + 1.2 x exp(-d2/62^2), band 1.7 x exp(-dy^2/700) x exp(-dx^2/4500).
- Goes wrong: with the light near the horizon, glow and band add into a cone or volcano shape (kolobok,
  muster stone). With the sun low the sum clips to a flat white blob (still-water frame 05). A glow with
  g1 = 180 and no disc gives a murky sky (muster hunter). The sky stops at row `hz`; if the ridge starts
  lower, the rows between are never painted.
- Evidence: `still-water/crop_day_sun_glow_dither_x6.png`; stone, knight, fish and loaf skies in `muster/sheet.png`.

#### LT2. Light disc [PROVEN]
- What: a filled circle in the lightest colour with a 1 px ring one step darker.
- Use when: the light is a sun or a moon.
- Copy: muster `paintDisc` L115-120; still-water `sunPix` L824-837.
- Numbers: radius 8 for the day sun in a 216 px frame, 12 for a big red sun. Radius 6 is small for a hero light.
- Goes wrong: at sunset the darker ring sits inside glow that has saturated to the top step. The sun turns
  into a hollow ring, and with its mirror image into a figure 8 (still-water frame 07b). Drop the ring when
  the glow around it is at the top step.
- Evidence: the red sun low over the far shore, with its mirror, in `muster/crop_04_fish_idle_t3.png`.

#### LT3. Banded sun, slit pupil, closing lid [PROVEN]
- What: a radius-16 disc in three flat rings. The pupil is an ellipse slit that can slide. The lid clips the disc.
- Use when: a sun that must turn into something else: an eye, a lure, a closing lid.
- Copy: still-water `sunPix` L824-837, lid clip in `renderTop` L803 and L819, `CINE_RED` L1391-1411.
- Numbers: slit half-width = pupil x 2.3 x sqrt(1 - (dy / 0.84r)^2); core index 1, 1.1 px edge index 6;
  it slides up to 4 px toward the subject.
- Goes wrong: nothing seen in the disc itself. In the same frame the golden fish hovers over the rod and
  lantern and clutters the focal point.
- Evidence: `still-water/10_red_sun_pupil.png`. The strongest image after the gold frame.

#### LT4. Moon disc with craters and streaks [GOOD]
- What: a large clean disc with flat darker patches and thin cloud streaks crossing it.
- Use when: a night scene where the moon is a main shape.
- Copy: souls `sceneWolf` L775-779.
- Numbers: radius 27 at 216 px wide, body 14, outer 1.3 px ring 13, patches (13) where fbm(0.1) > 0.6, cloud
  streaks crossing the disc at 12, one step under the ring.
- Goes wrong: it uses a 16-step ramp. Re-map to 12 steps before copying.
- Evidence: `souls/wolf-crop-head-moon-8x.png`: clean at 8x and at 1x.

#### LT5. Stars with ranked fade-in and twinkle [PROVEN]
- What: seeded star points that come on a few at a time as dusk falls, and flicker.
- Use when: any night sky. With P2 they fade in by rank.
- Copy: still-water `genStars` L446-455, `topExtras` L854-859.
- Numbers: 70 seeded points in the top 160 rows, only where there is no cloud or mountain. A star shows
  when rank x 0.7 + (1 - twinkle) x 0.3 < starA, and only where the sky is darker than index 8.
- Goes wrong: all stars on at once in a warm ramp read as sparks (vignettes old camp). A plain hash
  threshold gives uniform stars with no twinkle (tips `stars` L338).
- Evidence: `still-water/08_night_lantern.png`. They also appear in the water for free.

#### LT6. Warm glow as a dithered tint after the palette [PROVEN]
- What: after indices become RGB, pixels near a lamp are pulled toward the lamp colour in 5 dithered levels.
- Use when: a lantern, a lit window, any small warm light in a cold scene.
- Copy: still-water `glowTint` L1157-1176, `applyGlows` L1177-1190.
- Numbers: radius 18 (12 for the reflection, 7 and 5 for a window). k = (1 - d^2/r^2)^2 x strength, 5 Bayer
  levels, 55% mix plus 30% add. Flicker 0.88 + 0.12 x sin(13t) x sin(7.3t). y squashed 1.25.
- Goes wrong: it adds colours outside the palette, so it must be the last pass. The halo is small: it tints
  the post and rod but not the fisher or the water.
- Evidence: `still-water/crop_night_lantern_boat_x9.png`.

#### LT7. Stepped light pool on the ground [GOOD]
- What: distance to the fire as a 2:1 ellipse lying on the ground, with noise on the distance, divided by a
  flicker factor. Light falls off in visible steps. The edge is dithered.
- Use when: a campfire, a torch on the ground.
- Copy: vignettes `drawCamp` L134, L150-157.
- Numbers: ellipse (dx x 1.1, dy x 2.2), noise +-7 px, level = 6.6 - d/10, flicker
  1 + sin(11t) x 0.05 + sin(7.3t) x 0.04.
- Goes wrong: the pool core used the same top steps as the flames, so the fire vanished. Keep the flame in
  an accent brighter than the pool, or put a darker ring behind it. The 2x2 hash ground texture makes the
  pool blocky. The lantern-pool versions in reachbound `drawCollector` L645-650 and tips `animArch` L286-292
  overwrite the ground with flat orange discs and a wide checker halo: do not copy those.
- Evidence: `vignettes/camp_upgraded_t2.00s.png`: good pool, flames reduced to a few ticks.
  `reachbound/zoom_knight_collector_necromancer_12x.png`: the flat orange disc.

#### LT8. Ground light falloff with a light column [PROVEN]
- What: ground is brightest at the horizon and darkens toward the viewer, with a brighter wedge under the sun.
- Use when: any ground seen toward a low light.
- Copy: kolobok `genGround` L465-472; the one-line form in muster `buildStone` L254-259.
- Numbers: v = 3.0 + 5.2 x exp(-dy/24) + 2.2 x exp(-(x - SUNX)^2 / 3200) x exp(-dy/26).
- Goes wrong: the near third goes flat and dark if nothing else is added there (G5).
- Evidence: the far half of the kolobok field, gold at the horizon cooling to plum (`kolobok/sheet.png`).

#### LT9. Light on a round form: sky fill, sun term, backlit rim [PROVEN]
- What: three terms on a sphere normal: light from the sky above, direct sun, and a rim that is strongest
  at the silhouette on the side facing the sun.
- Use when: any procedural round form (T2, T3, T7).
- Copy: kolobok `drawBall` L426-432.
- Numbers: f = 0.75 + 1.35 x ny + noise x 0.9, plus the rim (see the table above), plus 4.0 x n.sun where
  directly lit, minus 0.8 where the coat is thin. Mapped through a 5-step accent ramp whose top step is the
  scene's cream.
- Goes wrong: with only 4 ramp steps over a wide gradient, the dither seams cover large areas (tips flour
  sphere). The kolobok body shows noisy checker patches at 3x; fine at 1x.
- Evidence: `kolobok/crop_h_flour_drunk_crescent.png`, `muster/zoom_loaf_floured.png`.

#### LT10. God rays as haze [GOOD]
- What: on a half-resolution grid, each cell averages how much open sky lies between it and the light, and
  that is added to the value buffer.
- Use when: a sky that needs atmosphere around a light. Not when you need visible beams.
- Copy: summit `renderRays` L190-205, `applyRays` L206-212. Needs P7 and a clear-sky mask.
- Numbers: 108 x 192 grid, 10 samples over 81% of the way, weights x 0.93 per step, x exp(-distance/170),
  gain 2.6, x 0.55 below the horizon. Rebuilt every other frame. About 2.3 ms average.
- Goes wrong: no shafts form, only soft fans. Nothing reaches the ground. It is costly.
- Evidence: `summit-road/07_godrays_on_t60_clouds_near_crown.png` against `08_diag_godrays_off_t60.png`:
  without it the sky is near black and the spire is a hard flat triangle.

#### LT11. Shadow cast only where an object is visible [GOOD]
- What: for ground pixels inside the shadow's ground ellipse, a ray toward the sun is tested against the
  sphere and the coverage at the hit is looked up.
- Use when: a large object on a ground plane (T1) under a low sun.
- Copy: kolobok `shadowAt` L289-308, set up in `renderGround` L311-320.
- Numbers: sun elevation about 7.2 degrees; shadowed ground = min(v, base) - 1.1.
- Goes wrong: a flat, hard-edged wedge with no soft edge and no fade with length. At full coat it covers a
  quarter of the frame. The muster version (`drawLoaf` L545-548) is a trapezoid that pops off in one frame: WEAK.
- Evidence: `kolobok/sheet.png` bottom right; `muster/strip_loaf_flour_decay.png`.

#### LT12. A rift as the light source [GOOD]
- What: a vertical strip of accent colour that wobbles, tapers to both ends and can flare.
- Use when: a tear in the sky, a portal edge, a pillar of light used as the scene light.
- Copy: muster `drawHunter` L486-491.
- Numbers: half-width (1.2 + 0.5 x sin(0.35y + 3t)) tapering to both ends, centre wandering
  sin(0.18y + t) x 1.5, core accent 13, body accent 12, edge ramp 9. Flare x (1 + 2 x sin(progress x pi)).
- Goes wrong: it lights nothing around it, and it runs straight into the figure's head.
- Evidence: `muster/crop_11_hunter_act_dissolve_t3.3.png`.

#### LT13. Baked clouds re-lit by the moving sky glow [GOOD]
- What: baked cloud values get 55% of the per-frame glow added before dithering.
- Use when: the sun moves or dims while the clouds stay baked (sunset, sunrise).
- Copy: still-water `renderTop` L817-818.
- Numbers: cloud value + glow x 0.55, then `dith`.
- Goes wrong: only clouds re-light. Mountains are baked for one light (`shadeM`).
- Evidence: clouds change brightness through the sunset frames 07a-07d (study).

#### LT14. Key, rim and specular on a baked 3D form [GOOD]
- What: value = ambient + key + rim^2, plus a specular term on metal, mapped into a ramp. See T4.
- Use when: a baked model (T4).
- Copy: hero `shadeBust` L154-182 with `LK`, `LR`, `HK` L151-153.
- Numbers: 0.14 + 0.72 x key + 0.42 x rim^2, metal + 0.55 x (n.h)^30.
- Goes wrong: fixed light vectors; rim barely shows; one ramp per material hides the warm/cool idea.
- Evidence: `hero/07_helm_plume_closeup_8x.png`: the specular on the helm is the best part of that piece.

#### Do not copy
- **Flicker by dithering between two baked lightings** (hero `render` L354-358) [WEAK]. 27% of portrait
  pixels sit in a checker 94% of the time. `hero/06_portrait_mid_flicker_dithered.png` shows the screen
  door on the steel. Re-light the stored normals each frame instead (0.05 to 0.11 ms in the 3D paper's tests).
- **Fixed light vector for every scene** (tips `LX, LY, LZ` L51; hero `LK` L151) [WEAK].
- **Cold light pillars** (souls `sceneCity` L718-727) [WEAK]. They read as a glitch or lasers.
- **Lightning with no flash** (tips `drawBolt` L343) [WEAK]. Thin lines, no light on anything.
- **A light source hidden or off frame** (souls tower sun at x = -30; souls city sun behind buildings;
  vignettes lake sun behind the hill; tips day cards: a halo with no disc). This is rubric fail F3.

## 3. Sky and clouds

The sky gradient, discs, moon and stars are in section 2 (LT1 to LT5). This section is clouds.

### Compared: seven cloud generators

| Generator | Piece, function | How it works | What the frames show | Grade |
| --- | --- | --- | --- | --- |
| Puff-cluster density field, re-lit by glow | still-water `genClouds` L320-375 | 6 hand-placed clusters, 108 puffs (radius 6-24, shrunk up to 30% toward the cluster ends). Density = sum of (1-q)^2 kernels + fbm. Cloud where density > 0.3. Shade = density here minus density 4 px toward the sun. White rim line, contour line at 0.72, sun corridor kept clear | Soft lit masses with a crisp 1 px white rim. Calm. Stay inside the ramp. Outlines are smooth blobs with no cauliflower edge. Never move | PROVEN look |
| Same family, dusk stratus | kolobok `genClouds` L264-311 | 4 clusters, 74 flatter puffs (y squash 2.1), 3 px light step, forced sunlit undersides, dithered at bake | Thin streaks lit from below, right for dusk. Orphan scraps and one hollow arc. Never move | GOOD |
| Same family, cut down | muster `paintClouds` L122-148 (also reachbound L125-151) | Small radii (3-14), one noise term, no undersides, no bright tops | Flat torn chips in every portrait | WEAK |
| Same family, made reusable and tileable | souls `swClouds` L302-346 | Port of still-water with options: light as a function, extra contours, lit or dark undersides, tilt, wrap for scrolling | As a cloud sea (wrap, 10-level cool ramp, contours 0.72 and 1.2): the best element in souls. As small background clouds: grey pebbles. As underlit storm clouds: dotted gold scribbles | GOOD |
| Overlapping discs with crescent rims | souls `paintLobes` L261-285 | A mask filled with 3-17 px discs, each with a lit and a shadow crescent | Fish scales with ring outlines, plus a Bayer screen over each lobe | WEAK |
| Sphere-shaded cumulus | tips `genCumulus` L55-68, `renderClouds` L70-98 | 6 tiers of puffs, each a disc shaded as a sphere, normal blended 38% own / 62% whole-cloud. Flat shadowed base, creases, dithered soft rim | Heavy, lit, three-dimensional cumulus with clean bands. The best-looking single cloud in the studio. But lit from one fixed direction, drawn over the sign, big enough to become the subject | GOOD |
| Thresholded scrolling noise | summit `buildSky` L89-100 | Two noise octaves from a baked tileable texture, threshold 0.46, lit by comparing with the noise 3 px toward the light | Chunky three-tone storm banks. The only clouds that change shape over time. Exact left-right mirror reads as an inkblot | GOOD |

About the "sphere-lit puffs" the cookbook describes for the Souls piece: in the current build that painter
(`drawPuffs` L188-219) is dead code. The live Souls clouds are `paintLobes` and `swClouds`. The idea lives on
in tips `genCumulus`, which is the version to judge.

**Standard for background clouds: the still-water density field, in its reusable form `swClouds`, with
the still-water numbers.** Reasons:

1. It is the cloud of the bar frame (`still-water/gold_boat_day.png`, `crop_day_clouds_topleft_x6.png`).
2. It stays inside the scene ramp. tips clouds use their own cloud ramp, which is part of why those cards
   show 40 to 55 colours.
3. It is lit toward the real light position, and re-lit when the glow changes (LT13).
4. It keeps a clear corridor around the sun, so the light stays in frame. On tips day cards the sun is
   usually behind a cloud.
5. It is quiet. On tips cards 8, 9, 10 and 12 the cumulus is the brightest, largest thing and the real
   subject is lost (`field-tips/sheet.png`).
6. `swClouds` already has the wrap option for drift.

**Second standard, for a sky where the cloud is the subject: tips `genCumulus` + `renderClouds`.** It may
be used only with these four fixes: take the light direction from the scene's light (not `LX, LY, LZ`); map
values into the scene ramp, not a separate cloud ramp; draw clouds before signs and foreground props; wrap
the scroll at the buffer width. tips card 3 (red sun lake) is the proof that it holds up in a near-one-ramp
scene (`field-tips/card03-still-water-red-sun-lake_t2.5.png`).

Do not use `paintClouds` (muster) or `paintLobes` (souls) for new work.

#### S1. Background clouds: puff-cluster density field [PROVEN look, no motion]
- What: soft lit cloud masses. Clusters of overlapping puffs become a density field, and the shade comes
  from how the density changes toward the light.
- Use when: any scene with a calm sky and a small subject.
- Copy: still-water `genClouds` L320-375 for the numbers; souls `swClouds` L302-346 for a parameterised
  function. Cluster format: [cx, cy, width, height, puff count, rmin, rmax].
- Numbers: y squash 1.25. Flat base by exp(-(y - base)/2). fbm wobble 0.3 and 0.1. Threshold 0.3.
  value = 8.3 + clamp(shade x 5, -2.4, 2.2). Thin sun-facing edge = 11. Top pixel at least 10.6.
  Underside at most 7.0. Inner contour at density 0.72. Grain +-0.25. Corridor of 21-31 px around the
  sun's column kept clear.
- Goes wrong: small radii give chips (muster). Equal-size puffs read as cotton balls (cookbook). Two big
  clouds near the subject compete with it. `swClouds` lacks the sun corridor and the height darkening:
  add them back when copying.
- Evidence: `still-water/crop_day_clouds_topleft_x6.png`.

#### S2. Hero cumulus: sphere-shaded puffs [GOOD]
- What: tall cumulus built from tiers of discs, each shaded as a sphere and blended toward the whole cloud
  form.
- Use when: a big daytime sky, a storm front, the cloud itself is the picture.
- Copy: tips `genCumulus` L55-68, `renderClouds` L70-98.
- Numbers: 6 tiers, tier width shrinking 62% toward the top, one puff per about 9 px, 45% big (r 12-21),
  rest small (r 5-11). Puff radius wobbled +-17%. value = 0.18 + 0.82 x lambert + 0.12 x up-facing,
  minus 0.42 over the bottom 16 px. Crease -0.1 where a big lobe overlaps another on its shadow side.
  Silhouette pixels beyond q = 0.86 (93% of the radius) are Bayer-dithered away.
- Goes wrong: ruler-straight bases that stick out as a dark shelf; stray detached puffs; clouds painted
  over the sign (cards 1, 4); lit from the wrong side on cards 3, 6, 7, 9, 10, 13; bake costs 35-110 ms
  per card on first view.
- Evidence: `field-tips/zoom_card01-cumulus-puffs-x6.png`.

#### S3. Cloud sea seen from above [GOOD]
- What: a tileable cloud layer along the bottom of the sky that scrolls sideways.
- Use when: a scene above the clouds.
- Copy: souls `swClouds` with wrap, used in `sceneTower` L412-415 and L521-529.
- Numbers: baked twice the screen width with x-periodic noise (`pnoise`, `pfbm` L94-105); read with an
  integer offset floor(t x 1.8).
- Goes wrong: the whole layer ticks one pixel every 0.56 s at once, with no difference between near and
  far rows. Split it into two or three rows at different speeds.
- Evidence: `souls/tower-layer-sky+cloud-sea.png`. The summit cloud sea (`renderTerrain` L123, L127-131)
  reads as rough water: WEAK.

#### S4. Storm banks from scrolling noise [GOOD]
- What: clouds cut from two octaves of scrolling noise, lit on the side facing the light.
- Use when: clouds must boil and change shape, and a chunky look is fine.
- Copy: summit `genNoise` L36-49, `nt` L50-56, `buildSky` L89-100.
- Numbers: two octaves, scale 260 and 95 px across, 170 and 70 down; threshold 0.46; lit pixels
  +0.8 + 2.4 x falloff; thin edge -0.5; rebuilt every third frame.
- Goes wrong: sampling with |dx| mirrors the banks exactly. Movement is very slow (about 1.5 px a second).
- Evidence: `summit-road/23_crop_stormbank_rays_on_vs_off_x9.png`.

#### S5. Cloud drift by scrolling a baked layer [GOOD idea, WEAK as built]
- What: bake the cloud layer wider than the screen and read it with a slowly growing x offset.
- Use when: any sky that should not be frozen, once the wrap is fixed and there is more than one layer (gap
  11).
- Copy: the idea from tips `render` L517-521. Do not copy the code.
- Numbers: 0.6 px per second in tips.
- Goes wrong: all clouds move as one rigid sheet. Shapes never change. Bug: the offset wraps at 80 px,
  not at the buffer width, so every 133 s all clouds jump back 80 px in one frame.
- Evidence: `field-tips/card08-castles_t133.2-before-cloud-wrap.png` and
  `field-tips/card08-castles_t133.5-after-cloud-wrap-snap.png`, 0.3 s apart.
- See "Gaps" for the cloud motion the house style still lacks.

## 4. Landscape: ridges, ground, fields, forest

#### G1. Ridge outline by midpoint displacement [PROVEN]
- What: control points placed by hand, joined by recursive midpoint displacement with a fixed seed.
- Use when: every mountain, hill, shore and treeline base. The composition comes from the hand-placed
  points. The jitter comes from the code.
- Copy: still-water `genRidge` L377-397 (returns {x0, ys}); muster L95-105 and vignettes L56-61 return a
  lookup function instead. Pick one form for the engine.
- Numbers: roughness 0.3-0.45 for mountains, 0.06-0.3 for hills; rougher when farther.
- Goes wrong: nothing seen in the outline itself. A sine profile used instead looks soft and samey (tips,
  hero).
- Evidence: the V of two ridges that frames the sun in the gold frame.

#### G2. Mountain shading: slope light, rotated gully streaks, snow, rim, haze [PROVEN]
- What: per-pixel shading of a mountain face: lit by slope, streaked along the fall line, with snow patches,
  a lit ridge edge and haze at the foot.
- Use when: large mountains near enough to show rock.
- Copy: still-water `MCFG` L398-403, `shadeM` L404-422, `paintMountain` L423-435.
- Numbers: base value per layer (far 5.0, near 0.1-0.8). Lit = slope over a +-3 px window x the side
  facing the sun. fbm in a rotated frame (angle 1.05-2.0 rad, frequency 0.07-0.1 across, 0.3-0.35
  along), thresholded at 0.55 and 0.6 into two flat streak steps. Snow where a second fbm > 0.64. Rim +1.2
  to +3.4 on the top 2 px of sun-facing slopes. Haze = (depth into the last 64-76 px above the horizon)^2
  x up to 5.6 on the two big mountains (16-18 px and 1.2-2.2 on the small ridges).
- Goes wrong: patchy noise up close. Baked for one light.
- Evidence: `still-water/crop_day_right_mountain_x6.png`.

#### G3. Ridge fill with a lit crest [GOOD]
- What: walk each column down from the ridge top and call a value function of (x, y, depth).
- Use when: hills and shores too small or too far for G2.
- Copy: muster `fillBelow` L149-151 with the fills at L187, L253, L339-345.
- Numbers: crest pixel +0.6 to +2; brighter toward the light's x (gaussian width^2 1500-3000); darker with depth.
- Goes wrong: the unpainted rows between sky and ridge (see P1). Flat mid-step values dither the whole
  ridge (5.2 - 0.6 = 4.6 under the knight's castle). Fix both when copying.
- Evidence: the knight hill and pebble shore in `muster/sheet.png`.

#### G4. Perspective ground table [PROVEN]
- Pointer only. The entry, its numbers and its evidence are under T1.

#### G5. Field shading: backlit falloff, strip parcels, near texture only [PROVEN far, WEAK near]
- What: a perspective field: bright at the horizon and under the sun, cut into strips, with texture only
  near the camera.
- Use when: with T1.
- Copy: kolobok `genGround` L465-472.
- Numbers: strips 34 m wide, each +-0.45 by hash, faded with distance, dark 0.6 boundary lines for z < 420,
  offset +17 so no boundary passes through the camera. Near texture vnoise(X x 1.7, z x 0.3) x 1.2 only
  for z < 85.
- Goes wrong: the near third is low-information dark purple with radial streaks, worse at H = 470.
- Evidence: `kolobok/12_tall_h470_empty_valley_t0.png`.

#### G6. Flat-view field: bright horizon, strokes that grow with nearness [GOOD]
- What: a field seen from the side: a vertical gradient with vertical stroke noise that fades out toward the
  horizon.
- Use when: a side view with no perspective table.
- Copy: tips wheat L109-116, meadow L202-206.
- Numbers: value = 0.55 + 0.35 x exp(-dy/22) + sun-side glow - dy x 0.0035, plus vertical stroke noise
  vnoise(x x 0.9, y x 0.18) ramping from 0 at the horizon to 0.35 at 60 px down.
- Goes wrong: it is a flat gradient with no furrows or converging rows. The formula is pasted eight times
  (seven inline, once as `nightGround`).
- Evidence: `field-tips/zoom_card01-wheat-wind-track-grass-x6.png`: no speckle at distance.

#### G7. Road from a spline, with ruts [PROVEN]
- What: a road whose centre line is a spline through world points. Ruts and edges come from the distance to
  that line.
- Use when: with T1. A road is the cheapest leading line.
- Copy: kolobok `crom`, `buildPath`, `pathAt` L381-408, `ROAD_PTS` L417, `roadAtZ` L420-430, shading L474-479.
- Numbers: Catmull-Rom through 7 world points, 40 samples per segment. Within 3.2 m: +1.35. Ruts at
  1.3 +- 0.32 m: -0.8 for z < 170. Edges -0.4.
- Goes wrong: straight wedge roads look ruled (tips cards 5 and 9).
- Evidence: the S-curve leading to the sun in `kolobok/sheet.png`.

#### G8. Tracks stamped into a world grid, decaying [PROVEN]
- What: a moving object stamps strength and heading into a grid of world cells. The ground pass reads the
  grid.
- Use when: tracks, trampled grass, anything that leaves a mark that fades.
- Copy: kolobok `stampTrail` L49-65, `fadeArray` L68-70, `decayMaps` L71-78, sampling in `renderGround` L332-349.
- Numbers: 280 x 394 grid of 1.5 m cells. Strength > 0.5 darkens by 1.55; 0.3-0.5 brightens +1.25 (the
  lit lip). Fades over 120 s. `init` pre-rolls 80 s so the first frame already has tracks.
- Goes wrong: far tracks alias into dashes. A baked track drawn as a hard-edged slab reads as a road or an
  error (muster `buildLoaf` L526-529, tips card 11).
- Evidence: the dark arc with a lit lip in `kolobok/crop_h_flour_drunk_crescent.png`.

#### G9. Pressed ellipse in a field [GOOD]
- What: a dark flattened patch with a lit ring where standing stalks catch the light. The mark of
  something heavy that sat or rolled there.
- Use when: a flat-view field with no world grid. With a grid, use G8.
- Copy: tips L113-114.
- Numbers: inside a 70 x 12 ellipse the value drops 0.3; a ring just outside rises 0.14.
- Goes wrong: placed away from the thing that made it, it reads as a pond or a hole (reachbound crows scene).
- Evidence: `field-tips/zoom_card01-wheat-wind-track-grass-x6.png`.

#### G10. Layer stack for depth [GOOD]
- Pointer only. See D1 (flat layers) and D2 (haze). The evidence is there.

#### G11. Foreground hilltop with grass [GOOD]
- What: a dark hill edge along the bottom with grass blades whose tips catch the light.
- Use when: the viewer stands on a height. Characters can stand on it.
- Copy: kolobok `genForeground` L495-531.
- Numbers: edge = H - 33 - 15 x smooth(...) + sine + fbm. 170 blades 3-16 px with a quadratic lean, tips in
  ramp 6 or 7 to catch the sun.
- Goes wrong: fully static. The bottom 35-40 px are solid black.
- Evidence: `kolobok/crop_c_stone_elder_pebbles_grass.png`.

#### G12. Pine treeline silhouette [GOOD]
- What: a forest edge as one dark shape: a ridge plus triangles, or single tiered cones in depth layers.
- Use when: a far or middle-distance forest.
- Copy: vignettes `buildCamp` L127-130, `drawCamp` L142-143; for depth layers of single pines, souls
  `pine` L784-796 with layers L797-799.
- Numbers: camp: a ridge plus a triangle every 5-11 px, height 6-22, half-width min(4-8, j x 0.45).
  souls: tiered cone, one flat level per layer (9 far, 6 mid, 3 near, 0-1 foreground), moon side one
  level brighter.
- Goes wrong: regular spacing reads as a saw edge (vignettes castle fringe, every 4 px). Random edge
  dropout makes speckle (souls near pines). Nothing sways. This is a still forest. See Gaps.
- Evidence: `vignettes/camp_upgraded_t2.00s.png`; `souls/wolf-layer-no-mist.png`.

#### G13. Recursive bare tree that grows [GOOD]
- What: a bare tree drawn by recursive branching, with the depth of recursion as its age.
- Use when: a lone tree; showing time passing.
- Copy: muster `drawTree` L472-483.
- Numbers: two-way branching, angles +-0.4 to 0.65 rad, length x 0.7-0.72 per level, depth = stage + 1,
  trunk 5 + 4 x stage, 0.02 rad sway.
- Goes wrong: 1 px branches, no foliage. Redrawn recursively every frame.
- Evidence: the last panels of `muster/sheet.png`.

#### G14. Distant city skyline with lit windows [GOOD]
- What: a far city as a row of column heights with spires, and random lamp pixels inside the silhouette.
- Use when: a city on the horizon at night.
- Copy: tips `buildFeast` L408-412.
- Numbers: column height = 14 + noise x 18, +14 for 3 columns every 23 px, 260 lamp pixels.
- Goes wrong: regular spire spacing. As a subject up close, code-built towns fail (souls city).
- Evidence: tips card 9 in `field-tips/sheet.png`.

#### Do not copy
- **Voxel-space terrain** (summit `renderTerrain` L113-155) [WEAK]. 5 ms a frame on its own, and it reads
  as a tiled plaza in retro 3D. See section 9, "Do not copy".
- **Hash speckle as ground texture** (reachbound `buildPebble` L194, tips card 6 gravel) [WEAK]. TV static.
- **Cave from two noises** (reachbound `buildProj` L659-667) [WEAK]. No light, bottom half of the ramp only.
- **Code-drawn mountain cone, parabola hills, checker wall** (tips cards 10, 8, 13) [WEAK].
- **Sine hills** (tips `ridge` L340, hero window hill) [WEAK]. Soft and samey. Use G1.

## 5. Water

### Compared: six mirror variants

| Variant | Piece, function | What it does | What the frames show | Grade |
| --- | --- | --- | --- | --- |
| Full mirror | still-water `computeWater` L871-904 | Flipped sky, double-sine ripple that grows toward the viewer, 0-1 px vertical wobble, darkening with depth, haze lift at the horizon, bright waterline, streaks, glitter cone, one `troubled` dial | Glassy near the horizon, wavier toward the viewer. The best water in the studio. Reflected clouds dither along whole rows | PROVEN |
| Simple mirror | muster `mirror(b, o, wy, y1, t, dark, amp)` L153-163 (same in reachbound L156-166) | Copy the row the same distance above the waterline, one sine ripple, constant darkening of 1-2 steps, accents kept | Mirrored ridge and red sun read well. Water taller than the sky leaves a flat strip at the bottom. Mirrored dither turns into comb marks | GOOD |
| Lake strip | kolobok `lakePix` L363-370 | 4 rows under the horizon, +-1 px ripple, one step darker, dense glitter | A twinkling line under the sun. Does not read as water | WEAK as water |
| Inline mirror with warm/cool rules | vignettes `drawCamp` L144-147, `drawLake` L261-268 | One sine ripple, one index darker, darker again per 60 rows of depth | The mirror itself is the best thing in the lake scene. Comb stripes from shifted dither, hard banding from the 60-row steps, a lighter flat strip at the bottom (110 rows at H = 470) | GOOD with three bugs |
| Mirror with fade to flat water | tips `animLake` L241-245 | Two-sine ripple, `DARK` table darkening, reflection replaced by flat water through a Bayer threshold between 30 and 100 rows down | Near-horizon reflection is good. The fade is a large checker patch, there is a hard seam at 24 rows, the bottom fifth is flat dark | WEAK fade |
| River between bridges | souls `sceneCity` L730-743 | Mirror about the bridge underside, two-sine ripple, 60% source + 40% level 9, noise streaks, warm glints on one axis | Liveliest motion in that scene, but it mostly reflects dark bridge and noise: a streaked floor | WEAK |

**Standard: still-water `computeWater`.** Reasons: it is the water of the bar frame; the ripple grows with
nearness, which the single-sine versions lack; it keeps a crisp bright waterline; accents pass through; one
dial changes its whole mood. Two fixes to make when it goes into the engine (my proposals, not yet built):

1. Snap the per-row darkening to whole ramp steps, or mirror the continuous value and dither after. That
   removes the whole-row checker in reflected clouds (`still-water/crop_day_water_glitter_x6.png`).
2. Decide what a water row shows when its mirror source is above the top of the frame. Every other piece
   got this wrong and left a flat strip. Use the last valid row's value with the same depth darkening.

#### W1. Mirror water [PROVEN]
- What: the lower part of the frame shows the flipped sky, shifted per row by a ripple, darker with depth.
- Use when: still or slow water that fills the foreground.
- Copy: still-water `computeWater` L871-893, `RIPX` L316.
- Numbers: row y reads sky row 2 x HY - 1 - y, plus a 0-1 px vertical wobble sin(0.9y + 2.1t). Side shift
  RIPX[y] = round(sin(0.55y + 1.6t + 2.2 x sin(0.11y + 0.7t)) x amp), amp = 0.35 + 1.5k + troubled x
  (0.5 + 2.4k), where k runs 0 at the horizon to 1 at the bottom. Value lowered by 0.75 + 1.1k, raised by
  1.1 x (1 - k)^8 near the horizon. Horizon row lifted 2 steps. Horizon at 61% of the frame height.
- Goes wrong: see the two fixes above. Costs about 1.2 ms a frame with W2.
- Evidence: `still-water/gold_boat_day.png`, lower 39%.

#### W2. Streak highlights and a glitter cone under the light [PROVEN]
- What: thin sliding highlight lines over the whole water, plus sparse flickering pixels in a narrow cone
  under the light.
- Use when: with W1, when the light is above the horizon.
- Copy: still-water `computeWater` L894-904.
- Numbers: streaks: vnoise(0.09x + 0.35t, 0.7y - 0.2t) > 0.78 adds 1 step (the 8:1 stretch makes thin
  sliding lines). Glitter: inside |x - sunX| < sunR + 3 + 26k, hash2(x, y, floor(7t)) > 0.955 adds 2 steps,
  so 4.5% of pixels re-roll 7 times a second. Off when the sun glow is below 0.2.
- Goes wrong: a lower threshold or a wider cone gives the Christmas tree (SKILL failure list). The streak
  pass calls vnoise for every water pixel every frame; precompute or use a baked noise texture (PF5).
- Evidence: `still-water/crop_day_water_glitter_x6.png`.

#### W3. Glints as short dashes, for a low sun and a long path [GOOD]
- What: light on water as sparse short horizontal dashes in a path that widens toward the viewer.
- Use when: the light sits on the horizon and its path runs to the bottom of the frame.
- Copy: vignettes `glints` L87-96 in one colour, or tips `animLake` L246-249.
- Numbers: per water row up to 3-4 dashes, each present 35-55% of the time, 1 to 5 px long (vignettes lets
  them grow with depth, up to about 15 px at the bottom of its lake), inside a width that grows with
  distance (tips 6 + 0.22 x rows; vignettes 1-2 + 0.12-0.16 x rows). Re-rolled about 3 times a second with
  a per-row phase (t x 3 + y x 0.37) so rows do not flash together.
- Goes wrong: three cycling colours per dash looks busier, not better (vignettes upgraded). Random single
  dots in a triangle read as confetti (muster `drawFish` L384-388, reachbound `drawPebble` L207-210): WEAK.
- Evidence: `vignettes/lake_old_t2.00s.png`; `field-tips/zoom_card03-sun-shore-reflection-boat-x5.png`.

#### W4. One dial for the water's mood [PROVEN]
- What: `WS.troubled` scales ripple amplitude, wobble, darkening, streak density and the boat's bob.
- Use when: the story changes the mood of the water.
- Copy: still-water, used at L873-881, L901, L983.
- Numbers: 0 calm, 0.22 uneasy, 0.35 night, 0.55 under the red sun.
- Goes wrong: nothing seen.
- Evidence: zigzag mountain reflections in `still-water/10_red_sun_pupil.png`. One named dial per mood
  quality is the pattern to repeat in the engine.

#### W5. Sprites that plot their own reflection [GOOD]
- What: sprites go into a separate index layer. Each plotted pixel also writes its mirror below the
  sprite's own waterline, shifted by that row's ripple.
- Use when: boats, floats, creatures on or over the water.
- Copy: still-water `plot` L938-942, `refl` L943, `plotR` L944-950, `stampR` L951-962, composite L1072-1077.
- Numbers: dark indices raised one step in the mirror, others lowered one. Each sprite can carry its own
  waterline (boat at HY + 6).
- Goes wrong: 1 px shapes (rod, lantern post) mirror as a squiggle. Accent colours are not darkened, so a
  gold fish reads as two fish. Fix: darken accent reflections, skip 1 px shapes or thicken their mirror.
- Evidence: `still-water/crop_day_boat_fisher_x9.png`: hull reflection is solid, rod reflection breaks up.

#### W6. Rings and splash droplets [GOOD]
- What: expanding dotted ellipses where something touches the water, and 1 px droplets.
- Use when: a bite, a jump, a cast, a drop.
- Copy: still-water `ring` L731, `updRings` L732-739, `drawRings` L906-921, `splash` L718-720.
- Numbers: ellipse ry = 0.32 x rx (matches the low camera), growing 12 or 26 px/s and slowing, dotted,
  +2 then +1 brightness with hash dropout as it fades. Droplets: 1 px, gravity 140.
- Goes wrong: outline-only hoops that do not disturb the reflection look drawn on top of the water
  (muster `drawFish` L390-393, 16% squash). Rings that pop off at a fixed age (reachbound).
- Evidence: frame 02b (study); the wire hoops in `muster/crop_04_fish_idle_t3.png`.

#### W7. Foam dashes along a shore [GOOD]
- What: a broken 1 px light line where water meets land. It bobs, and the dashes travel along it.
- Use when: a shore in the foreground.
- Copy: muster `drawPebble` L208-211.
- Numbers: a 1 px row following the shore ridge, bobbing round(sin(1.3t + 0.05x)), drawn only where
  sin(0.4x + 2t) > 0.2.
- Goes wrong: dashes drawn through the middle of a far black shore look like a seam (tips card 3).
- Evidence: `muster/crop_01_pebble_idle_t3.png`.

#### W8. Shapes under the surface [WEAK]
- What: fish shadows: small shapes that subtract ramp steps from the water and wander.
- Use when: not as built. The steering is worth keeping.
- Copy (steering only): still-water `spawnShadows` L753-756, `updShadows` L757-769, `drawShadows` L922-937.
- Numbers: 16 shapes about 10x3 px, 2 ramp steps darker. Headings wander by hashed noise. When mood
  passes 1.3 they steer toward a point under the boat.
- Goes wrong: too faint. They read as a few dark dashes and a viewer may not notice them.
- Use instead: the same code with 3 steps of darkening and larger shapes. Not tested.
- Evidence: frame 04c of still-water (study).

#### Do not copy
- A reflection fade through a Bayer threshold (tips L241-245). Darken by depth in whole steps instead.
- A second glint column for a fire (vignettes L149). It competes with the fire.
- The lips, mouth or any feature drawn on the waterline row (muster and reachbound fish): it cannot be seen.

## 6. Motion: wind, cloth, creatures, particles, weather

SKILL rule 6: motion is small and constant. The studies add one warning. In the best pieces only one
region moves. In the still-water day frame it is the water (clouds and mountains never move). In kolobok it
is the field (`kolobok/diff_motion_t0_vs_t0.5.png`: clouds and foreground show zero changed pixels). Where
sky, subject and ground all move (summit, tips), each motion is too slow or too small to carry: summit
changes about 0.4% of pixels per frame, tips has a rigid cloud sheet and 1-2 px hops.

### Compared: wind over a field

| Variant | Piece, function | How | Cost | Grade |
| --- | --- | --- | --- | --- |
| Travelling sine from a lookup table, phase baked per pixel | kolobok `renderGround` L328-331, `fsin` L440-442, phase `GPH` L482 | Phase = X x 0.055 + z x 0.075 + vnoise(X x 0.012, z x 0.012) x 3.4, in world units. w = fsin(phase - 1.25t). Only crests above 0.45 brighten, up to 1.27 steps | Inside the 1.8-2.0 ms frame | PROVEN |
| Sine + noise per pixel per frame | muster `drawStone` L263-266 | sin(0.05x + 0.22dy - 1.4t + vnoise x 3) > 0.55 goes one index lighter | 0.69 ms for 9,108 px, the slowest thing in muster | GOOD |
| Same, on a flat-view field | tips `render` L522-527 | sin(0.05x + 0.16dy - 1.6t + noise x 3) > 0.62 shows the next lighter colour | About 2.3 ms, most of each card's frame | GOOD |

**Standard: the kolobok version.** Reason: it looks best (broad soft crests bent by low-frequency noise),
it is in world space so it foreshortens correctly, and the phase is precomputed so it is nearly free. For a
flat-view field with no perspective table, bake the phase per pixel once and still use the table.
Shared weakness: only brightness changes. Blades do not bend, and nothing above the horizon answers the wind.

#### M1. Wind over a field [PROVEN]
- What: light crests that travel across a field.
- Use when: any field, meadow or reed bed.
- Copy: kolobok as in the table. 1024-entry sine table.
- Numbers: wavelength about 68 m across the crests (84 m measured along z, 114 m along X), speed about
  13 m/s.
- Goes wrong: hard one-step band edges with no dither (tips). Recomputing noise every frame (muster, tips).
- Evidence: `kolobok/diff_motion_t0_vs_t0.5.png`: 8% of pixels change in half a second, all wind crests,
  lake glitter, mill blades and crows.

#### M2. One state object, tweens and scripted timelines [PROVEN]
- What: every look parameter is a number on one object (`WS`: mood, dim, sun position and size, glow,
  lid, pupil, troubled, star amount, lantern, and so on, about 25 numbers). A cinematic is a duration plus
  an update(t) that sets those numbers with clamp((t - a) / b) ramps and fires one-shot events.
- Use when: any transition or story beat. This is the seed of the engine's scene description.
- Copy: still-water `WS`, `resetWS` L666-674, `tween`, `updTweens` L699-713, `playCine`, `cineUpdate`
  L1362-1374, `CINE_SUNSET` L1375-1390, `CINE_RED` L1391-1411.
- Numbers (sunset): sun eases 14 px below the horizon over 7.5 s; mood 0 to 1 from 1 s to 8 s; glow drops
  to 0.12; stars from 5 s; lantern at 7.8 s. The staggered times are why it feels directed.
- Goes wrong: about 2 s with no light source in frame between sundown and the lantern. `WS` is a plain
  object read inside pixel loops (against the SKILL performance rules); copy the values into locals or a
  typed array per frame. `playCine` is not exported, so a headless run must play to the moment.
- Evidence: `still-water/sheet.png`, frames 07a-07d and 09a-09c (study).

#### M3. Rod and line as curves, line colour picked against the background [PROVEN]
- What: a rod and a fishing line drawn each frame as curves.
- Use when: any 1 px line that crosses changing backgrounds (ropes, reins, strings, a scythe shaft).
- Copy: still-water `drawRod` L971-981, `linePix` L1016-1023, `drawLine` L1024-1046.
- Numbers: rod = quadratic Bezier, length 28, bend from line tension; cast eases through back-swing,
  forward and aim in 0.22 + 0.14 + 0.45 s. Line sag 12 idle, 4 in flight, 0.5 taut. Each line pixel takes
  the background index +3 if dark, -4 if light.
- Goes wrong: their reflections break up (W5).
- Evidence: the line stays readable at night (frame 08c, study).

#### M4. A 1 px line that carries meaning [PROVEN]
- What: the "stalk": a dark 1 px line from the top of the frame to the sun, swaying more toward the bottom.
- Use when: one small thing must change what the picture means.
- Copy: still-water `topExtras` L862-869.
- Numbers: sway sin(0.04y + 0.9t) x 0.8 px. Drawn above the waterline, so the water mirrors it.
- Goes wrong: nothing seen.
- Evidence: `still-water/10_red_sun_pupil.png`. Best cost-to-effect ratio in that piece.

#### M5. Birds in small flocks [GOOD]
- What: tiny V sprites crossing the sky.
- Use when: a calm sky needs a sign of life.
- Copy: still-water `BIRD` L514, `updBirds` L770-783, stamped in `topExtras` L860; vignettes flock L239-242.
- Numbers: 2-4 birds every 10-24 s, 14-18 px/s, 5 px wide V, wing frame flips 5-6 times a second, slow sine
  bob. Stamp them before the water pass and they are mirrored for free.
- Goes wrong: white single pixels as "far birds" in a day sky read as stars (tips L528-531).
- Evidence: frame 02 of still-water (study); the upper left of the castle-upgraded panel (bottom middle)
  in `vignettes/sheet.png`.

#### M6. Crows that perch, scatter and return [GOOD]
- What: birds with states: perched, startled, flying, returning.
- Use when: something invisible or large needs a tell; a visible reaction to a hit.
- Copy: kolobok `initCrows` to `scatterCrows` L133-168, `drawCrows` L540-556, sprites L131-136.
- Numbers: three sprite sizes by distance (6x4 with a peck frame under 125 m, 4x3 under 240 m, 3x2
  beyond). On a hit they fly ballistically (up 7-11, gravity 1.2) for 3-5.5 s with a 2-frame flap at 7 fps,
  then ease back at 1.5/s.
- Goes wrong: specks at phone size. The larger hand-drawn crow (reachbound `CROW_BIG` 15x11, L575-587)
  reads better; all five share one pose.
- Evidence: `kolobok/crop_a_sun_horizon_lake_mill_crows.png`.

#### M7. Idle life from time modulo: blink, hop, peck [GOOD]
- What: no stored animation state. Eyes closed while ((0.27t + phase) mod 1) < 0.04. Hop 1 px for a
  short slice of a long cycle. Each actor has its own phase.
- Use when: every creature with eyes.
- Copy: muster `drawPebble` L214-219, `drawStone` L267-277.
- Numbers: blink closed 4% of a 3.7 s cycle; hop 1 px for 0.18 of every 9 phase units.
- Goes wrong: a 1 px hop or a 0.15 s blink does not show in a still and barely shows on a phone.
  Make idle moves at least 2-3 px or change the outline.
- Evidence: the muster act frames for pebble and stone cannot be told from idle (study).

#### M8. Tap reaction through one shared timer [GOOD]
- What: a tap sets one timer (1.2-1.6 s). Every draw function reads it and reacts in its own way.
- Use when: menus, cards, any tap-to-poke screen.
- Copy: reachbound `act` L786-794; tips `G.hop` L512-514.
- Numbers: timer 1.2 s (tips) or 1.6 s (muster, reachbound).
- Goes wrong: most reactions were 1-4 px and invisible. The ones that work change the picture: the hunter
  dissolves (M12), the loaf gets floured, the rift flares.
- Evidence: `muster/crop_11_hunter_act_dissolve_t3.3.png` reads at once; the pebble hop does not.

#### M9. Cloth: a pennant [GOOD]
- What: a flag built from columns, each moved up and down by a travelling sine that grows toward the free
  end.
- Use when: banners, pennants, ribbons.
- Copy: muster `drawKnight` banner L360-367.
- Numbers: a 20-column loop of which 17 show (the last 3 round to 0 px tall), height tapering 6 to 2,
  each column offset by sin(4t - 0.45i) x (0.6 + 0.08i), top row light.
- Goes wrong: the cape from the same function (L351-357) reads as a dark lump beside the figure: WEAK.
  Banners with no pole read as flames (vignettes L234).
- Evidence: `muster/zoom_knight_raised.png`.

#### M10. Flame [GOOD]
- What: tapering tongues that change height and sway, coloured by height and by distance from the centre.
- Use when: a campfire, a candle, a torch.
- Copy: vignettes `drawCamp` L165-169 (campfire); hero `render` L359-366 (candle).
- Numbers: campfire: five tongues 3 px apart, height 10 +- 3 from sin(9t + 1.9k), sway sin(12t + 0.5j + k)
  growing toward the tip. Candle: 12 rows, half-width (1 - j/12) x 2.6 pulsing 12% at 17 rad/s, sway
  sin(5t + 0.4j) up to 1.5 px at the tip.
- Goes wrong: no halo, and a pool as bright as the flame hides it (LT7).
- Evidence: flames are clear in the old camp and lost in the upgraded camp (`vignettes/sheet.png`).

#### M11. Small particles [GOOD]
- What: single pixels that rise, fall or drift. Two kinds: stateless (position is a pure function of
  time, nothing is stored) and stateful (a small list updated every frame).
- Use when: sparks, embers, ash, motes, splashes. Keep counts small: 14 to 70.
- Copy and numbers:
  - Stateless: age = (t x speed + k x offset) mod 1. reachbound embers L654, tips powder L325-328. Costs
    nothing, cannot leak, wraps forever.
  - Embers: vignettes `drawCamp` L170-173. 14 pixels, 0.45 cycles a second, rising 90 px, drifting
    sin(7.1k + 1.3t) x 10 x age, near-white for the first 30% of life then down the warm ramp, gone at 80%.
  - Falling ash: still-water `updAsh` L740-752. Up to 70 flakes, 5-13 px/s, 4 px/s sine drift, each with
    its own end row on the water so they land at different distances.
  - Rising motes: summit `drawMotes` L290-298. 36 pixels, 3-9 px/s, visible about 56% of the time.
- Goes wrong: leftover flakes stay on screen after the effect ends (still-water frames 13d, 13e). Particle
  objects pushed inside the frame function cause a deopt loop (souls tower: 129 bailouts in 300 frames).
  White motes over a dark subject look like dead pixels (souls wolf). Particles with no depth test cross
  the subject as stray dots (hero dust). Single pixels with no fade pop at the end of life.
- Evidence: embers in `vignettes/camp_upgraded_t2.00s.png`; motes on the wolf in `souls/wolf-full-t04s.png`.

#### M12. Dissolves [GOOD]
- What: a sprite or a coat appears and vanishes through a pixel pattern, with no extra colours.
- Use when: anything that must fade in a palette-indexed frame.
- Copy and numbers, three kinds:
  - Hash dissolve: skip a sprite pixel when hash2(i, j, seed) > alpha. still-water `stampTop` L847,
    `stampR` L958, `stamp` L967.
  - Bayer dissolve: skip when visibility is below the Bayer value at that screen pixel. muster
    `drawHunter` L494-500, over 1.2 s, pose and year flip at the midpoint.
  - Coverage decay with a noisy dithered edge: kolobok `decayCov` L119-125 with the threshold in
    `drawBall`. Visible where coverage + noise x 0.55 > 0.42, Bayer band up to 0.54, decay 0.085 a second
    after a 1.3-1.6 s hold. This kind is PROVEN: the flour breaks into continents.
- Goes wrong: at 90-95% the last holes of a hash dissolve look moth-eaten for a moment. In muster the
  scythe stayed solid while the body dissolved: dissolve every part together. A scrolling Bayer mask used
  to make a figure look translucent is a screen door (reachbound `drawProj` L676-683, tips `animBlink`
  L374-378): WEAK, and both were drawn on a sprite scaled 2x or 3x.
- Evidence: `muster/crop_11_hunter_act_dissolve_t3.3.png` (Bayer); `muster/strip_loaf_flour_decay.png` and
  `kolobok/crop_h_flour_drunk_crescent.png` (coverage).

#### M13. Powder burst clouds [GOOD after 0.4 s, WEAK in the first 0.2 s]
- What: a cloud of powder made of projected puffs, with noise on the density and a dithered edge.
- Use when: flour, dust, smoke puffs.
- Copy: kolobok `makeBurst` L173-190, `updateBursts` L191-213, `drawBursts` L486-533.
- Numbers: 10-13 world-space puffs expanding with ease-out over 0.45 s, drifting 0.9 m/s; density = sum of
  (1 - q)^2 x fade; scrolling vnoise (0.5) added; threshold 0.32 with a Bayer band to 0.52; lit by density
  difference 2.5 px toward the sun; z-tested. Plus 70-110 one-pixel particles with drag exp(-2.2dt).
- Goes wrong: the first frames are a hard white blob (`kolobok/crop_f_bell_burst.png` reads as a teapot).
  White powder on a white object does not register. Start the noise and the wide dither band at frame one.
- Evidence: `kolobok/sheet.png`, top middle (weak) and bottom left (acceptable).

#### M14. Lightning bolt [GOOD]
- What: a jagged line from recursive midpoint displacement, with branches, that flickers for under half a
  second.
- Use when: a storm, a magic strike.
- Copy: summit `bolt` L253-258, `strike` L259-271, `drawBolts` L272-287, with the flash P8.
- Numbers: midpoint displacement depth 6, roughness 34 shrinking x 0.55 per level, half as much
  vertically; two branches (depth 4, roughness 12); life 0.45 s for a tapped strike and 0.3 s for the
  automatic ones; hidden one tick in three; core in the lightest accent with a darker fringe. The tips copy (`bolt` L342) is seeded: keep that part.
- Goes wrong: no light from the bolt's position on clouds, ground or figures. Bolts drawn over signs
  (tips card 10). Unseeded `Math.random` in summit.
- Evidence: `summit-road/03_strike_big_bolt_visible_plus0.07s.png`.

#### M15. Scrolling tileable layers [GOOD]
- What: bake a layer wider than the screen with noise that repeats in x, then read it with an offset.
- Use when: cloud seas, mist, anything that must drift forever.
- Copy: souls `pnoise`, `pfbm` L94-105; summit `genNoise` L36-49, `nt` L50-56 (a baked 256 x 256 texture
  with bilinear lookup).
- Numbers: souls layers are baked 432 px wide for a 216 px screen.
- Goes wrong: a whole layer ticking 1 px at once; the wrong wrap width (S5).
- Evidence: S3 and S4.

#### M16. Rotating blades on a drawn body [GOOD]
- What: a hand-drawn body baked into the background, with code-drawn lines turning on top.
- Use when: a windmill, a wheel.
- Copy: kolobok `MILL` L116-129 (body), `drawMill` L371-384 (blades).
- Numbers: 4 lines of radius 8 plus an offset parallel line from r = 3, at 0.35 rad/s.
- Goes wrong: blades alias as they turn (a cross at some angles, an X with gaps at others). Keep a moving
  subject's path away from it: the mill sat on the loaf like a hat.
- Evidence: `kolobok/crop_a_sun_horizon_lake_mill_crows.png`: reads as a windmill at 2x.

#### Do not copy
- **Walk cycle** (summit `WALK` L215-229, `drawWalker` L230-239) [WEAK]. Four frames, two real poses, seen
  from behind, 24 px tall. `summit-road/20_crop_walker_cycle_8_moments_x9.png`: a man shifting his feet.
- **Camera crawl** (summit `update` L312, 1.1 units a second) [WEAK]. About 0.4% of pixels change per frame.
- **Parallax pan** (vignettes `drawCastle` L216: sin(0.12t) x 6 px) [WEAK]. 52 s per swing, 1-3 px seen.
- **Mist** (souls depth-tag fog L880-904; vignettes mist bands L270-276) [WEAK]. The first boils as
  single-pixel flips and puts a dot grid on the wolf (`souls/wolf-full-t04s.png`; the frame without it,
  `wolf-layer-no-mist.png`, is cleaner). The second shows as a few dotted rows.
- **Fireworks** (tips `animFeast` L419-423) [WEAK]. Stray dots, drawn over the clouds.
- **Jaws fold** (still-water `composite` L1078-1097, `drawFang` L1101-1121) [WEAK as pictures]. Hard seams
  and code-drawn cones (`still-water/crop_jaws_fangs_x6.png`). The idea is good; redraw the teeth by hand.
- **Roll or decay advanced inside `render`** (muster `drawLoaf` L533-564: roll 0.012 a frame, decay 0.0035
  a frame). Speed then depends on frame rate.

## 7. Depth and layers

Depth in the house style is made with value, haze and paint order. No piece has parallax that can be seen:
vignettes moves four layers at factors 0.2 to 1, but by 6 px at most (see Gaps).

#### D1. Value-stepped silhouette layers [GOOD]
- What: flat ridge layers, back to front. Each nearer layer is darker. Each farther layer sits closer to
  the sky value. A 1 px lighter crest line on top of each layer.
- Use when: hills, forest lines, any far-to-near stack.
- Copy: vignettes `layer()` L222-237 for the bare recipe; muster `buildKnight` L333-347 for a full scene
  (sky, clouds, disc, far ridge, hazy castle, valley, near hill, sprite).
- Numbers: about 2 ramp steps between layers (7.4, 5.2, 3, 1.2 in vignettes). Crest +1.2. Rougher ridge
  when farther (0.35 far, 0.15 near).
- Goes wrong: layers within one step of each other read as one smear (vignettes old castle: 3.2, 2.6, 2,
  1.4, where the castle cannot be found). Fractional fills dither the whole layer: use 7, 5, 3, 1.
- Evidence: `vignettes/sheet.png`, castle column, old against upgraded. The clearest single win in that piece.

#### D2. Haze toward the waterline, and haze as the subject's backdrop [PROVEN]
- What: every ridge gets lighter toward its foot. The haze behind the subject is what makes a flat dark
  sprite readable.
- Use when: always, where ridges meet water or a plain.
- Copy: still-water `MCFG` L398-403 (base and haze per layer), `shadeM` L404-422.
- Numbers: far ridges start 4-5 steps lighter than near ones. Haze = (depth into the last 64-76 px above
  the horizon)^2 x up to 5.6 steps.
- Goes wrong: a dark seam where a far ridge meets the ground if the fade is not clamped (SKILL failure
  list).
- Evidence: `still-water/crop_day_boat_fisher_x9.png`: the mountain foot behind the boat is pale, the hull is black.

#### D3. Paint order with a depth buffer [PROVEN]
- What: back layers are painted in order. Anything that can pass in front of or behind a 3D object is
  stamped through a float depth buffer.
- Use when: the scene mixes sprites with a 3D form (T2).
- Copy: kolobok `render` L583-599, `stampZ`, `stampAt`, `plotZ` L447-480.
- Numbers: order = sky, mill blades, ground, clear depth, loaf (writes depth), pole, bursts, particles,
  crows, far sack, foreground, near sack.
- Goes wrong: without it, effects cross the subject (hero dust over the bust) or far things cover near ones
  (tips).
- Evidence: crows and pole hide behind the floured part of the loaf and show through the unfloured part
  (kolobok study). Crows sit in front of the coated loaf in `kolobok/sheet.png`, bottom right.

#### D4. Depth fog in ramp space, matched to the horizon [GOOD]
- What: ground and props lose contrast with distance by blending toward one fog value.
- Use when: a deep view along the ground.
- Copy: summit `renderTerrain` L146-147.
- Numbers: fa = 1 - exp(-z / 650); value moves toward 5.9 by fa. The sky at the horizon row is 5.6, so
  far ground melts into sky with no seam. This is the cookbook's "fog is the art direction" in ramp units.
- Goes wrong: if ground values already sit near the fog value, fog changes nothing (summit).
- Evidence: fog on and off frames 01 and 13 in `art/frames/summit-road/` (study).

#### D5. Per-pixel depth tags [GOOD idea, WEAK as built]
- What: every pixel carries a tag (sky, far, mid, near, subject, ledge, foreground). An effect reads a
  table per tag.
- Use when: an effect must treat depth layers differently.
- Copy: souls `sceneWolf` `DEP`, `put` L763-764. Fog table baseFog 0.55 / 0.4 / 0.2 / 0.08 / 0.06 / 0.
- Goes wrong: the fog was applied as value + (11 - value) x small alpha, which lands mid-step and dithers
  the whole wolf and ground. Apply fog per tag in whole steps, or through D4 with one final dither.
- Evidence: `souls/wolf-full-t04s.png` against `souls/wolf-layer-no-mist.png`.

#### D6. Hazy distant sprite [GOOD]
- What: a hand-drawn building stamped in mid-ramp values, not dark, so it sits in the haze.
- Use when: a far landmark that gives scale without taking the focus.
- Copy: muster `CASTLE` L317-332, stamped at L341.
- Numbers: 30x14, values 4 and 5, left edges and tips one step lighter.
- Goes wrong: its base sat on a dithered patch of the far ridge, which muddies it.
- Evidence: the far castle in the knight portrait, `muster/sheet.png` top right.

#### D7. Composition constants [PROVEN]
- What: fixed numbers that put one light and one subject in a calm frame.
- Use when: at the brief, before any code.
- Copy: still-water constants L208-215 and the cloud corridor L348-349.
- Numbers: 216 x 384. Horizon at y = 236 (61%). Sun 64 px above it, slightly left of centre. Subject on
  the right third, 76 px long. Clouds kept out of the sun's column. Kolobok variant: horizon at 170 (44%),
  sun at (62, 146), an S-curve road leading to it, a dark foreground base.
- Goes wrong: floor taking 60-68% of the frame (summit). Subject and another silhouette touching (the
  mill on the loaf, the rift into the hunter's head, the gold fish over rod and lantern).
- Evidence: `still-water/gold_boat_day.png`; `souls/squint-test-native-blur-3tone_tower-city-wolf-stillwater.png`
  (the boat scene keeps one connected light shape; tower and city do not).

#### D8. Foreground framing [GOOD]
- What: a dark strip or hilltop along the bottom edge. It frames the scene and gives text a dark base.
- Use when: a view from a height; a scene that needs a near plane.
- Copy: kolobok `genForeground` L495-531 (a dark hilltop with lit grass tips and characters on it).
- Numbers: see G11.
- Goes wrong: 1 px reeds in the darkest colour on near-dark ground are invisible (vignettes L177-180).
  Corner grass in a different hue goes off key (tips `framingGrass` L174-177, teal on wheat). Framing needs
  a backdrop at least 3 steps lighter. The only foreground that moves is the vignettes reeds (1-2.5 px of
  sway at the tip, L178, L243, L288), and those are the invisible ones.
- Evidence: `kolobok/crop_c_stone_elder_pebbles_grass.png`.

#### Known weak spot: tall screens
At H = 470 every piece just adds rows: more dead near field (kolobok), an empty lore box (muster,
reachbound, hero), 45% dead foreground (vignettes castle), a 110-row flat slab (vignettes lake), a 25 px
slab joint (summit). No piece re-anchors its composition. Render H = 470 for every new piece and fix what
the extra rows show.

#### Do not copy
- A sign or panel baked into the base layer under the clouds (tips `render` L515-534). Clouds and bolts
  then cover it. Draw panels last.
- Anything far drawn over something near (tips card 4: a horizon cloud in front of the arch).

## 8. Drawn sprites, and how they combine with procedural layers

SKILL rule 5 held in every study: code draws landscapes, hands draw things.

| Drawn by hand, reads | Drawn by code, fails |
| --- | --- |
| Fisher 11x18 and companion (still-water) | Fangs as cones with flat bases (still-water `drawFang`) |
| Longboat with curled stern (still-water, authored curves) | Tent as a triangle (vignettes) |
| Stone elder with carved words (kolobok, muster) | Arch, wall and merlons (tips cards 4, 13) |
| Hunter 22x37, knight 21x29 (muster) | Relic swords as tapered bars (summit `drawRelics`) |
| Crows 6x4 to 15x11 (kolobok, reachbound) | Tower of random shafts, cathedral grid, stamped houses (souls) |
| Hazy castle 30x14 (muster) | Necromancer trapezoid, lantern-bearer blob (reachbound) |
| Windmill body 7x12 (kolobok) | Flour bell as a 5x7 box (tips) |

The exception the skill allows also held: round organic forms shaded as 3D (the loaf, the fish head, the
helm) can be procedural. See section 9.

#### SP1. Text-row sprite with a character map [PROVEN]
- What: an array of strings, one character per pixel, mapped to ramp indices. 255 is transparent.
- Use when: every hand-drawn thing.
- Copy: muster `sprite(rows, map)` L58-62, `stamp(b, s, x0, y0, o, flip)` L76-87 (clips, flips, adds the
  palette offset).
- Goes wrong: the pieces disagree on the form. kolobok and still-water use `sprite(rows)` with one global
  table; vignettes and tips store pixels as `.d`, muster as `.data`. Use the muster form.
- Evidence: every hand-drawn thing in the table above.

#### SP2. Silhouette figure [PROVEN at small size]
- What: a one-colour body in the darkest index with one authored detail in the outline and 1-2 accent
  pixels (eyes, a lamp).
- Use when: people, small creatures, any character at a distance.
- Copy: still-water `FISHER` L468-487; muster `HUNTER` L425-463.
- Numbers: the fisher is 11x18 and reads because of the rod, the hood and the pale backdrop. For a
  portrait where the figure is the subject, go larger than muster's 21x29 knight (it does not clearly read
  as an armoured knight).
- Goes wrong: a generic outline at small size is a blob (reachbound `COLL` 16x23; souls tower figure, a
  10x16 red cone). One sprite reused on nine cards and animated on one, a cape-hem flicker (tips `TRAV`). The same sprite
  stamped twice side by side (tips card 12).
- Evidence: `still-water/crop_day_boat_fisher_x9.png`; `reachbound/zoom_knight_collector_necromancer_12x.png`.

#### SP3. Boat from two power curves plus hand-plotted curls [PROVEN]
- What: a long hull whose top edge and keel are two power curves, with curls at prow and stern typed by
  hand. The one place code-drawn "architecture" works, because it is a pure silhouette with authored curves.
- Use when: boats; any long symmetrical silhouette.
- Copy: still-water `makeBoat` L530-560, `drawBoatGroup` L982-1004.
- Numbers: 76 px hull. Top edge = wl - 6 - 7 x e^4.5, keel = wl + 1 - 7 x e^2.4, with e the distance from
  midship (0..1). A 1 px plank line. Bob sin(1.3t) x troubled x 1.2.
- Goes wrong: nothing seen on the hull. The 1 px rod and lantern post on it mirror badly (W5).
- Evidence: the curled stern is the outline detail people remember (`still-water/gold_boat_day.png`).

#### SP4. Polygon monolith: mottled stone, rim, carved text, eyes [PROVEN]
- What: a 17-point polygon filled as a sprite, with noise mottling, a rim on the sun side, eye sockets
  and words carved in a tiny font.
- Use when: a standing stone, a statue, a grave marker, any large prop with a simple outline.
- Copy: muster `genElder` L226-246 with `FONT` L225 (44x72); kolobok `genStone` L192-230 (31x47).
- Numbers: interior = fbm thresholded into three darks (0.34, 0.63). Sun-side edge pixels 8 and 7, a
  softer 4 one pixel in, far edge darkest. Eye sockets 5x3 with accent pupils. Text in a 5-row font in
  value 5. Blink: closed 3.5% of a 4.3 s cycle in kolobok, 4% of 4.8 s in muster. Shake 1 px at 22 Hz
  while speaking.
- Goes wrong: small stair-step spikes on one edge (muster). The same stone stamped twice side by side
  reads as lazy (tips card 12).
- Evidence: `muster/zoom_elder.png`; `kolobok/crop_c_stone_elder_pebbles_grass.png`. The best character in
  the studio.

#### SP5. Generated small creatures: pebble folk [GOOD]
- What: small stones with eyes, generated as ellipses with a rim on the light side.
- Use when: a crowd of small simple creatures.
- Copy: muster `genPebble` L168-180, placement L193-198.
- Numbers: ellipse 12-20 wide, 8-13 tall. Body 2-4 (2, +1 on the upper 40%, +1 hash speckle). Light-side edge 10 then 7. Far edge
  0. Two 2 px accent eyes at 38% of the height, each with its own blink phase.
- Goes wrong: all eight are one shape at different sizes, so the row looks stamped.
- Evidence: `muster/crop_01_pebble_idle_t3.png`.

#### SP6. Hand-drawn building with lit windows [GOOD]
- What: a building typed as a sprite, with window cells that flicker.
- Use when: a castle, a house, a mill.
- Copy: muster `CASTLE` L317-332 (far, hazy); vignettes `CASTLE` L185-205 for the window flicker only.
- Numbers: each window flickers off by the test (7i + 3j + floor(t x (0.7 + (i % 3) x 0.3))) % 9, so
  windows change one at a time at slightly different rates.
- Goes wrong: the vignettes castle is drawn at 2x pixel size and sits on a flat slab that overhangs the
  hill. Draw at 1x and shape the base to the ground.
- Evidence: `vignettes/sheet.png`, castle upgraded: the warm windows on violet are the best colour moment there.

#### SP7. Polygon creature with a graded rim and fur tufts [GOOD]
- What: a large animal as a hand-placed outline filled as a mask and lit by neighbour tests.
- Use when: a creature too big for text rows.
- Copy: souls `sceneWolf`: outline `WP` L804-814 (95 hand-placed points), `inPoly` L816-817, rim L840-849,
  fur `triFill` and `furRuns` L818-839.
- Numbers: rim levels 11 at the edge, then 8, 5, 2 moving in. Fur: a small triangle (base 2.6 px) every
  2.6-4 px along chosen outline runs, 1-9 px long, pointing along a flow direction per body region.
- Goes wrong: weak anatomy (spike ears, short muzzle, fused hind legs). Random dashes inside the body add
  noise. Only the eye blinks; nothing else moves.
- Evidence: `souls/wolf-layer-no-mist.png`; `souls/wolf-crop-head-moon-8x.png`.

#### SP8. Parametric fish [GOOD]
- What: a generator that builds fish sprites from a few numbers: length, height, tail fork, fins, bands,
  stripes or spots.
- Use when: many small variants of one kind of creature.
- Copy: still-water `makeFish` L563-629, `SPECIES` L642-649.
- Numbers: body half-height = (ht/2) x sin(pi x t^0.72)^0.8; three flat bands by height; a 1 px outline
  pass; six species are parameter rows; the golden fish swaps in the gold accents.
- Goes wrong: lumpy up close; spots look like noise holes. Below the hand-drawn sprites.
- Evidence: reads as a fish at 23x15 px in frame 02d (study) and in the second panel of `still-water/sheet.png`.

#### SP9. Icons [GOOD]
- What: small symbols for stats, gear and skills.
- Use when: any menu.
- Copy: hand-typed 10x10 sprites, muster `ICONS` L590-597. This is the standard.
- Alternative: icons as 2D distance shapes with a bevel, hero `drawIcon` L228-245, `ICONS` L247-289. One
  definition draws at 38, 24, 20 and 18 px.
- Numbers (hero): edge lit from the top left within about 1.5 px of the border, 1 px dark outline.
- Goes wrong: the distance-shape icons have flat interiors and several were misread (sack as flask, seal
  as flower, quill as stick). Their fill value 0.5625 turns the sword blade into a checker. In muster the
  damage and speed icons are the least clear.
- Evidence: `hero/sheet.png` bottom right; `muster/20_page_edge_648x1152_pebble_with_text.png`.

#### SP10. Thumbnails sampled from the live scene [GOOD]
- What: a small tile made by sampling a finished portrait.
- Use when: roster strips, save slots.
- Copy: muster `genThumbs` L632-646.
- Numbers: draw the portrait once at t = 3, sample every second pixel of a 56x56 window into 28x28.
- Goes wrong: point sampling drops 1 px features. Three of nine reachbound thumbnails turned to mush.
  Use an area average, or draw small versions by hand.
- Evidence: the six tiles at the bottom of `muster/20_page_edge_648x1152_pebble_with_text.png` are each
  recognisable; `reachbound/thumbnails_roster_strip_6x.png` shows the failures (study).

### How sprites combine with procedural layers

These are the working rules, each taken from a piece where it is seen to work.

1. **Sprites use the scene's ramp.** Body in the darkest index, details one or two steps up, accents only
   for eyes and lamps. A mood change then recolours them for free (still-water `ACC`, P2).
2. **Separate the sprite from the landscape by light.** Either a rim from the scene's light (`rimLit`), or
   a hazy backdrop at least 4 steps lighter (D2). The gold frame uses the backdrop.
3. **Static props go into the baked layer.** The mill body is baked into the sky buffer (kolobok `genSky`
   L363-368), the far castle into the knight's base (muster L341). Only moving parts are stamped per frame.
4. **Moving sprites go on a copy of the base, each frame** (muster `render` L682-695), or into a separate
   sprite layer composited last (still-water `composite` L1072-1077). The separate layer is what makes
   automatic reflections possible (W5).
5. **Stamp before the water pass to get a mirror for free.** Birds, cabin, stars and the stalk are stamped
   into the sky buffer first (still-water `topExtras` L853-869).
6. **Use the depth buffer when anything 3D is in the scene** (D3).
7. **Thin lines pick their colour against what is behind them** (M3, `linePix`).
8. **A local light must touch its holder.** A pool that recolours only the ground leaves the figure black
   (reachbound collector, tips card 4). Add a warm rim on the side facing the lamp (`rims` in vignettes).
9. **Appear and vanish through a dissolve** (M12), never by popping.
10. **One pixel size.** Draw the sprite at the size it will be shown.
11. **Nothing in the studio has a contact shadow under a sprite.** Figures stand on a dark crest line or on
    water, which hides it. On a lit field they float (tips cards). This is a gap.

#### Do not copy
- Any figure, weapon or building made of lines, cones, boxes and triangles (list in the table above).
- A sprite reused at 2x or 3x for another character (reachbound `drawProj` L676-679, tips `animBlink` L377-379).
- A rim baked at a fixed index without checking the backdrop (summit `WALK`).

## 9. 3D geometry inside the pixel style

The full options paper is `docs/3d-in-the-house-style.md`. Its recommendation, in one line: bake 3D once
into small buffers and light it per frame in the scene ramp (T4 below); keep per-frame 3D for rolling
spheres and the ground plane (T1, T2); do not use it for whole landscapes. The paper also says this route
is not yet proven at the Still Water bar. Every 3D result goes through the same ramp, the same `dith` and
the same light as the rest of the scene.

#### T1. Perspective ground table [PROVEN]
- What: every ground pixel is mapped once to world X and Z and stored in typed arrays, with its base
  shade, surface type, wind phase, noise and track-grid cell. Per frame the ground pass only adds what moves.
- Use when: a field, a road, tracks, shadows or dust that must sit on one plane with true foreshortening.
- Copy: kolobok `genGround` L453-490 (constants at line 11 of `1_engine.js`).
- Numbers: z = FOC x CAMH / dy, X = (x - CX) x z / FOC, with CX = 108, FOC = 180, CAMH = 24. Horizon row
  170. Rebuilt only when the screen height changes.
- Goes wrong: a dead-flat plane with a ruler-straight horizon. A grid line passing through the camera
  draws a straight line down the screen: offset it (SKILL failure list).
- Evidence: road, strips, tracks, shadow and dust all sit on one plane in `kolobok/sheet.png`. 1.8-2.0 ms idle.

#### T2. Sphere by ray test, with a texture in its own rolling frame [PROVEN]
- What: each pixel in the bounding box is ray-tested against a sphere. The hit normal is rotated into the
  object's frame and a coverage texture is sampled there, so the surface turns as it rolls.
- Use when: a round thing that rolls or turns every frame; an invisible thing revealed by powder.
- Copy: kolobok `drawBall` L385-446, `genTex` L536-547, `rotAxis`, `mul3`, `ortho` L10-30, `updateBall`
  L32-48, `deposit`, `coatLoop` L97-117. Lighting is LT9. Shadow is LT11.
- Numbers: radius 15 m. 128 x 64 lat/long texture. Roll = rotate about the axis perpendicular to travel
  by distance / radius. Re-orthonormalise the matrix every 90 frames. Matrix in a `Float64Array(9)`.
  Adds about 1.5 ms a frame near the camera (3.3-3.5 ms total at H = 384; 4.65 ms at H = 470, over budget).
- Goes wrong: a perfectly coated sphere reads as a moon or a pearl. Break the surface: slashes, lumps,
  holes. Holes can form accidental faces.
- Evidence: `kolobok/crop_h_flour_drunk_crescent.png` and the bottom-right frame of `kolobok/sheet.png`.

#### T3. Cheap sphere from 2D normals [GOOD]
- What: no ray test. For each pixel in a disc, build a normal, turn longitude by a roll angle, index a
  small coverage map.
- Use when: a portrait or icon-sized sphere that does not travel.
- Copy: muster `drawLoaf` L533-564, textures `COV`, `NT` L512-514.
- Numbers: radius 30, 64 x 32 map, same lighting as LT9. 0.41 ms.
- Goes wrong: roll and decay are advanced inside `render` (move them to `update`). At mid-decay the far
  side shows through and it reads as an eggshell.
- Evidence: `muster/zoom_loaf_floured.png`.

#### T4. Distance-shape model, raymarched once and baked [GOOD for the helm, WEAK for the body]
- What: a model made of about 20 lines of signed-distance shapes is raymarched once at load. Each pixel
  keeps a material id, a normal and a position. After that, shading is a small loop.
- Use when: a hard round prop, a helm, a statue, a bust. Not for buildings or people's bodies (rule 5).
- Copy: hero `sdBox`, `sdCyl`, `smin` L104-107, `scene` L109-134, `buildBust` L136-150, `shadeBust`
  L154-182, outline pass L185-190.
- Numbers: orthographic, 36 px per unit, yaw 0.42 rad, up to 70 steps, hit below 0.003, normal from six
  samples at +-0.008. 230 ms once; 0.26-0.39 ms per frame for the whole page.
- Changes to make when copying (from the 3D paper): one scene ramp instead of a ramp per material; light
  direction from the scene's light; write depth; re-light every frame instead of mixing two bakes.
- Goes wrong: slab torso, bun pauldrons, board cape, bush plume. No contact shadow, so parts look pasted
  and the figure floats. Fixed light vectors. 64 colours.
- Evidence: `hero/07_helm_plume_closeup_8x.png` looks like deliberate pixel art. `hero/sheet.png` shows
  the body as a chess piece.

#### T5. Dark outline from the mask [GOOD]
- What: any empty pixel next to a filled one becomes the darkest colour.
- Use when: a baked 3D form placed over a painted background.
- Copy: hero `shadeBust` L185-190.
- Numbers: 4-neighbour test; colour = the darkest step (`#0c0e13` in hero).
- Goes wrong: outer outline only. Joins between parts stay soft.
- Evidence: `hero/07_helm_plume_closeup_8x.png`. The study rates it the main reason the bust reads at 1x.

#### T6. Surface detail by rules in model space [GOOD]
- What: after the hit, tests on the stored model position repaint bands, plate lines and trims.
- Use when: trims and seams on a baked model.
- Copy: hero `shadeBust` L164-180.
- Numbers: gold brow band where |Y - 2.02| < 0.04; plate lines every 1/4.2 units below Y = -0.2, darkened
  0.28; a keel line where |X| < 0.035, +0.25.
- Goes wrong: where two rules cut each other (rivets as uneven ticks, notches in a border). Negative X
  with `%` is not symmetric, so left and right differ.
- Evidence: the brow band and plate lines in `hero/07_helm_plume_closeup_8x.png` and `hero/sheet.png`.

#### T7. Procedural creature head from a superellipse with fake normals [GOOD]
- What: a domed head shaded from a made-up normal, with scale rows, an eye and fins drawn by rules.
- Use when: a large round creature part breaking a surface.
- Copy: muster `drawFish` L389-421.
- Numbers: superellipse exponent 2.2, rx 27, ry 17, cut at the waterline. nz = sqrt(1 - q).
  f = 3.2 + 1.5 x nz - 1.6 x ny + (1 - nz)^2 x max(0, 0.7nx - 0.7ny) x 7. Scale rows every 3 px with offset
  columns. A 9x9 eye with pupil and glint.
- Goes wrong: it reads as a fish because of the eye. The fin reads as a cage, the back stripe looks
  pasted on, the mouth sits on the waterline and cannot be seen.
- Evidence: `muster/crop_04_fish_idle_t3.png`.

#### T8. Flat ellipses to suggest a ground plane [GOOD]
- What: circles squashed to a fraction of their width, so they lie on the ground or the water.
- Use when: ripple rings, a ritual circle, a light pool.
- Copy: still-water `drawRings` L906-921; reachbound `drawProj` circle L670-674.
- Numbers: height 0.16 to 0.32 of the width. 0.32 matches still-water's low camera.
- Goes wrong: a ring that casts no light and does not disturb what is under it looks drawn on top.
- Evidence: the rings around the fish in `muster/crop_04_fish_idle_t3.png`; the green circle in
  `reachbound/sheet.png`.

#### Do not copy
- **Voxel-space terrain** (summit `renderTerrain` L113-155) [WEAK]. Up to 291 samples per column, 5.06 ms
  a frame, twice the whole budget with the rest of the scene (7.8-8.2 ms median). Reads as retro 3D tiles
  (`summit-road/sheet.png`).
- **Scaled billboards drawn by code** (summit `drawRelics` L158-187) [WEAK]. Stair-stepped bars, no depth test.
- **Sphere with noise holes recomputed per frame** (tips `animBell` L311-319) [WEAK]. 4.19 ms, 137 deopts,
  reads as a torn moon. T2 does the same job properly.

## 10. Text and UI

#### U1. HTML text over the canvas, in canvas-pixel units [PROVEN in headless Edge]
- What: all text is DOM, absolutely positioned over the canvas. A CSS variable holds the scale, so sizes
  and positions are written in canvas pixels and stay sharp at any zoom. SKILL rule 7.
- Use when: all text.
- Copy: muster `shell.html` L34-53 with `makeUI.layout` L761-773 (`--px` = screen pixels per canvas
  pixel). still-water uses `--u` = stage width / 100 (CSS L12-161, `resize` L1943-1959).
- Numbers: Pixelify Sans. Font sizes 6-9.6 canvas px in muster. Title 13.5u, body 4.4u in still-water.
  Captions carry a dark text shadow and fade over 0.6 s.
- Goes wrong: dim text over bright cloud or water is hard to read (still-water subtitle). Text across
  the subject (summit subtitle over the far swords). Text does not follow a palette fade. Headless Node
  frames have no text at all, so the page needs its own screenshot. tips used Cormorant Garamond, a smooth
  serif: off the house standard.
- Evidence: `muster/20_page_edge_648x1152_pebble_with_text.png`: every line sharp and readable at 3x.
  Not checked on a real phone by anyone.

#### U2. UI colours that follow the live palette [GOOD, lightly tested]
- What: CSS variables for panel, border, ink and accent are rewritten from the live palette.
- Use when: HTML panels are on screen while the mood changes (P2).
- Copy: still-water `colors()` L1923-1932, triggered in the frame loop L2013.
- Numbers: panel and page background = ramp 0, border = ramp 6, ink = ramp 11 mixed 25-40% toward white,
  accent = the gold slot. Rewritten when mood changes by more than 0.004.
- Goes wrong: nothing seen, but it was seen on one screen only.
- Evidence: the day title screen (`still-water/00_real_page_title_edge.png`, study).

#### U3. Menu chrome: bevelled brass boxes on lacquer [GOOD]
- What: the frame of a menu: a dark textured background and boxes with a 2 px bevel.
- Use when: menus and character screens.
- Copy: muster `genChrome` L599-630.
- Numbers: 2 px bevel: light brass top-left, dark brass bottom-right, mid brass inner line. Background =
  fbm(0.05x, 0.012y) cut into two dark greens plus 1.5% speckle. Built once per screen height.
- Goes wrong: every box has the same bevel, so emphasis is uniform. At H = 470 the extra height goes into
  an empty lore box. A single low-frequency noise threshold as background reads as camouflage (hero).
- Evidence: `muster/20_page_edge_648x1152_pebble_with_text.png` looks like a real game menu.

#### U4. In-canvas pixel UI: a meter [GOOD]
- What: a meter drawn inside the canvas in ramp colours.
- Use when: a gauge that must sit inside the scene.
- Copy: still-water `drawUIPix` L1144-1156, `rectI` L1129-1135.
- Numbers: a 116 px bar 26 px above the bottom in ramp colours (7, then 9 above 55%, flashing above 78%),
  a white tick at 80%, a 6x3 icon as the marker.
- Goes wrong: a 3 px wide "!" in ramp colours is nearly invisible. Tiny marks need an accent colour.
- Evidence: `still-water/crop_reel_bar_x6.png` (study).

#### U5. Typewriter dialogue with choices [logic GOOD, look not tested]
- What: lines reveal letter by letter; a line can carry choices, an action or a pause.
- Use when: any talking character.
- Copy: still-water `DLG` and its functions L1308-1358.
- Numbers: 42 characters a second. A tap completes the line, a second tap advances. Choices are buttons
  and keys 1-3.
- Goes wrong: unknown in the browser.
- Evidence: ran end to end headless through three endings. Never seen in a browser by a study.

#### U6. Timed caption queue [GOOD, contrast not tested]
- What: a queue of timed lines shown one at a time with a fade; some lines are triggered by distance.
- Use when: narration with no input.
- Copy: kolobok `3_story_ui.js` story L19-94, `makeUI` L281-312.
- Numbers: captions carry a dark text shadow; a character's line can have its own colour and letter spacing.
- Goes wrong: the title crossed the top cloud band and the how-to line sat on the grass and pebbles.
- Evidence: `kolobok/24_real_page_title_edge_540x960_realtime.png` (study): layout sensible, capture was
  mid-fade, so final contrast is unknown. Captions during play were never rendered.

#### U7. A drawn panel for text: the wooden sign [GOOD]
- What: a wooden board painted in the canvas as the backing for HTML text.
- Use when: tip cards, signs, titles that should belong to the world.
- Copy: tips `paintSign` L162-173.
- Numbers: 232 x 76 board, four 19 px planks, grain from a sine warped by a second sine plus stretched
  noise, bevelled border, four 10x10 iron corner plates.
- Goes wrong: it was baked into the base layer, so clouds and bolts were drawn over it (section 7,
  "Do not copy"). Draw it last.
- Evidence: `field-tips/card03-still-water-red-sun-lake_t2.5.png`.

#### U8. Stage scaling by whole numbers [GOOD]
- What: the canvas is shown at a whole-number multiple of its size, so every pixel has the same width.
- Use when: every page.
- Copy: souls page script L926-981 (integer fit by device pixel ratio, lazy build when a scene scrolls
  into view, 30 fps cap, one still frame for reduced motion).
- Goes wrong: kolobok `resize` L320-333 scales by min(aw/W, ah/H) without snapping, so pixels are uneven on
  most screens (540 px wide gives 2.5x). tips does the same.
- Evidence: by code reading in the souls study. The uneven case was seen: wobbly dither patterns in the
  kolobok Edge capture (study).

#### U9. Roster strip and selection [GOOD]
- What: a row of thumbnails that scrolls with the selection.
- Use when: more entries than fit on screen.
- Copy: reachbound `rosterStart` L761 with the strip in `render` L819-824.
- Numbers: shows six of nine, starting at clamp(current - 2, 0, count - 6); the selected tile gets a 1 px
  mint outline.
- Goes wrong: a 1 px outline is the only selection feedback (muster, hero).
- Evidence: `reachbound/sheet_full_screens.png` (study).

#### U10. Real buttons over the canvas [GOOD]
- What: tappable areas are real `button` elements laid over the canvas, with aria-labels and a focus outline.
- Use when: anything the player can tap.
- Copy: hero markup L45-61 and CSS L12-38.
- Goes wrong: tiny nav buttons (tips, about 9 canvas px text). A label that promises sound the page does
  not have (hero "Tap to hear him").
- Evidence: the page drew with all labels in headless Edge (`hero/sheet.png`, top left panel). The
  buttons were not pressed in a browser by the study.

## 11. Audio

**NOT GRADED. No study heard any sound.** Node has no audio and nobody played a page with speakers on.
Everything here is from reading code. Treat every recipe as a starting point and listen before shipping.

House rules (SKILL): synthesised with WebAudio, no files, started on the first tap, a mute button.

| Sound | Recipe | Where |
| --- | --- | --- |
| The two primitives | `tone(freq, dur, wave, vol, glide-to, delay)`: an oscillator with attack, decay and optional pitch glide. `noise(dur, vol, filter, f, f2, q)`: a slice of a white-noise buffer through a swept filter | still-water `SFX` L1213-1305; kolobok `3_story_ui.js` L192-272; muster L698-736 |
| Lapping water | Looped noise through a 420 Hz low-pass, gain wobbling at 0.07 Hz | still-water `SFX.ambient` L1261-1271 |
| Wind | Looped noise through a 520 Hz low-pass with a 0.09 Hz gain wobble | kolobok `SFX` |
| Drone | Saws at 55 and 55.7 Hz plus a 41.2 Hz sine through a 240 Hz low-pass (the beat between 55 and 55.7 makes it uneasy) | still-water `SFX`; summit uses sines at 55, 55.4 and 82.4 Hz (L339-365) |
| Heartbeat | Two sine thumps, 52 to 40 Hz then 48 to 36 Hz, every 1.7 s | still-water `SFX.heartbeat` L1289, timed by `ambientUpdate` L1836-1841 |
| Chime | Four sines staggered 0.11 s | still-water `SFX` |
| Rumble by distance | Noise through a 95 Hz low-pass, gain = proximity^2 x 0.32 | kolobok `update` L167-171 |
| Muffled song | 16-note melody, a note every 0.46 s, triangle at f/2 plus sine at f/4 through a 460 Hz low-pass, volume by distance | kolobok `MELODY` L191 |
| Thunder | Noise through a low-pass sweeping 380 (or 240) Hz down to 50 Hz over 2.6 s, delayed 0.3-1.1 s after the flash | summit `SFX` L339-365 |
| Creature voices | Pebbles: nine 22 ms square clicks at 1.9-2.8 kHz. Stone: two band-passed thuds plus a 72 Hz sine. Sword: 1320 + 1980 Hz ring. Fish: five 140-200 Hz bloops. Blink: noise sweep 3 kHz to 200 Hz plus a 55 Hz saw | muster `SFX` L698-736 |

To copy first: the kolobok `SFX` object. By code reading it is the most complete: `tone` takes a bus,
sound follows distance to the subject, it suspends when the page is hidden, it has a mute button.

Known holes: hero, tips, souls and vignettes have no sound. reachbound's three new creatures reuse
unrelated sounds (crows play pebble clicks). No piece has a score: the only tune is kolobok's muffled
16-note song.

## 12. Performance

Target (SKILL): under 4 ms median per frame in Node on a laptop. Phones are 3 to 5 times slower.
All numbers below were measured by the studies with `shoot.js --fps-test` on one laptop, Node 24. Nothing
was measured on a phone.

| Piece | Canvas | Median ms per frame | Meets 4 ms? |
| --- | --- | --- | --- |
| muster | 216 x 384 | 0.11-0.69 by portrait | yes |
| reachbound | 216 x 384 | 0.10-0.64 | yes |
| hero | 320 x 568 | 0.26-0.39 | yes |
| souls | 216 x 216 | 0.30-0.65 | yes |
| kolobok | 216 x 384 | 1.8-2.0 idle, 3.3-3.5 with the floured loaf | yes; 4.65 at H = 470: no |
| still-water | 216 x 384 | 3.1-3.55 day; 5.54 during the jaws | yes; 4.50 at H = 470: no |
| tips | 320 x 400 | 0.35-0.8 without a field, 2.5-4.2 with wind | borderline |
| vignettes | 216 x 384 | lake 2.3-2.9, camp 4.9, castle 5.7-6.4 | two of three: no |
| summit | 216 x 384 | 7.8-8.2 (p95 12-14) | no |

#### PF1. Static bake plus per-frame overlay [PROVEN]
- What: sky, clouds, ridges, ground base and chrome are painted once into index buffers. Each frame copies
  the base and draws only what moves.
- Use when: always.
- Copy: muster `init` L651-653, `render` L682-695; kolobok `genSky`, `genGround`, `genForeground`.
- Goes wrong: whatever is in the base never moves. That is why every sky in the studio is frozen. Bake
  clouds into their own layer so it can scroll (S5), and keep the light glow separate so clouds can be
  re-lit (LT13).
- Evidence: 0.11-0.69 ms a frame in muster; 1.8-2.0 ms in kolobok. vignettes caches nothing and costs
  4.9-6.4 ms for simpler scenes.

#### PF2. Index buffer and one palette pass at the end [PROVEN]
- What: the frame is a `Uint8Array` of indices. One loop maps it through a `Uint32Array` palette.
- Use when: always.
- Copy: any piece. Put that loop in its own small function.
- Goes wrong: still-water has the loop inside `render`, which showed 70 deopt lines.
- Evidence: the palette map costs 0.12 ms in summit (measured per stage).

#### PF3. Data layout that keeps V8 optimised [PROVEN]
- What: the rules in SKILL "Performance rules".
- Use when: always.
- Copy: kolobok. Fixed numbers as plain consts (`1_engine.js` L9-21), per-frame scalars in
  `FX = new Float64Array(3)` (L444), matrices as `Float64Array(9)`, heavy loops in leaf functions that take
  only numbers and typed arrays (`fadeArray` L68-70, `coatLoop` L104-117), unique field names on particles.
- Goes wrong: the cookbook records the cost of not doing it: 2 ms rose to 18-35 ms after the first throws.
- Evidence: back to 1.8-2.0 ms, with only 1-3 warm-up deopts in the per-frame functions (kolobok study).

#### PF4. Precompute everything static per pixel [PROVEN]
- What: anything that does not change between frames is stored per pixel once per screen height.
- Use when: world coordinates, base shading, noise, wind phase, sine values.
- Copy: kolobok `genGround` L453-490, `fsin` L440-442 (1024-entry sine table).
- Goes wrong: not doing it. See the cost table below (wind in tips, wind in muster, water streaks).
- Evidence: kolobok's whole ground pass with wind, tracks and dust fits inside 1.8-2.0 ms.

#### PF5. Baked tileable noise texture [GOOD]
- What: one 256 x 256 float texture of periodic noise built at load. Animation is an offset into it.
- Use when: anything that would call `vnoise` or `fbm` per pixel per frame (water streaks, wind, mist).
- Copy: summit `genNoise` L36-49, `nt` L50-56.
- Numbers: 5 octaves, wrapped bilinear lookup.
- Goes wrong: nothing seen. Only summit uses it.
- Evidence: summit's clouds animate with no per-frame noise maths (study).

#### PF6. Rebuild slow layers every second or third frame [GOOD]
- What: cache a costly buffer and recompute it only on some frames.
- Use when: slow-moving sky, rays, fog.
- Copy: summit `renderSky` L79 (every third frame), `renderRays` L193 (every other frame).
- Goes wrong: the two are not offset, so they land on the same frame every sixth frame.
- Evidence: summit p95 of 12-14 ms against a median of 8 ms. Stagger the rebuilds.

#### PF7. Half-rate fallback on slow devices [GOOD, never exercised]
- What: if the smoothed render cost passes 12 ms, draw every other frame while the simulation still
  updates every frame.
- Use when: every shipped page.
- Copy: kolobok `3_story_ui.js` `frame` L370-386. dt is clamped to 0.1 s.
- Goes wrong: present in kolobok and summit only. The studies found it missing in still-water,
  reachbound, tips and vignettes. By code reading it is also missing in muster and hero; souls caps at
  30 fps instead.
- Evidence: none from frames. Laptop medians never reached 12 ms, so the fallback never ran in a study.

#### PF8. Screen-shaped canvas height [GOOD]
- What: width stays 216; height follows the screen shape.
- Use when: every portrait page.
- Copy: still-water `resize` L1943-1959: height = clamp(216 x screenH / screenW, 384, 470).
- Goes wrong: see "tall screens" in section 7.
- Evidence: works in every piece that has it; the extra rows are the problem, not the mechanism.

#### What cost time, with the measurement

| Cost | Where | Measured |
| --- | --- | --- |
| Voxel terrain every frame | summit `renderTerrain` | 5.06 ms |
| Sphere with two noises recomputed every frame | tips `animBell` | 4.19 ms, 137 deopts |
| Nothing cached, full repaint | vignettes | 4.9-6.4 ms, 126-143 deopt lines |
| sin + noise per ground pixel per frame | tips `render` wind | about 2.3 ms |
| Sky recomputed every frame even when nothing changes | still-water `renderTop` | about 1.6 ms |
| Noise per water pixel per frame | still-water `computeWater` | most of 1.2 ms |
| Particle objects created inside the frame function | souls tower `frame` L543 | 129 bailouts in 300 frames |
| Bake on first view | tips clouds 35-110 ms per card; souls 60-110 ms per scene; hero `init` 230 ms | a visible hitch on a phone |
| Hex strings parsed every frame | vignettes `buildPal` | small, wasteful |

Reading the deopt count: `node --trace-deopt ... 2>&1 | grep -c bailout` counts every line. Lines that say
"exit from OSR'd inner loop" inside one-time build functions are harmless (kolobok: about 126 of 132-137;
hero: 430 of 455, of which 308 are in the PNG encoder). What matters is bailouts in per-frame functions.

## 13. Pipeline: render, look, fix

The skill says the quality comes from rendering frames headless and looking at them. The studies show how
to do that for every kind of piece, and where the loop was skipped.

#### PL1. The module contract [PROVEN]
- One IIFE. `IS_BROWSER` check. In Node: `module.exports = { init, setH, setOut, update, render, W, get H, G }`
  plus every action a test needs (`begin`, `tap`, `act`, `select`, `press`, `release`).
- Source in parts with a `shell.html` and a `build.py` that pastes the script in.
- Copy: kolobok (three parts), muster, summit, reachbound.
- Off the contract, and what each needed: still-water (one HTML; extract lines 202-2036 to a temp file),
  hero (one HTML; lines 65-413; pass `--h 568` to 700), vignettes (inline script; a wrapper that sets scene
  and mode), souls (exports only `{ S, SCENES }`, each scene a `frame(t, out)` closure; an adapter per scene), tips (no `setH`; its own cut-down `shoot.js`).
  Every one of these cost a study extra work. New pieces follow the contract.
- Evidence: kolobok worked with `shoot.js` first time; the extracted inline script matched its three parts exactly.

#### PL2. Render headless [PROVEN]
- `node "<skill>/scripts/shoot.js" <game.js> --h 384 --at 0,2,5.5 --scale 3 --out <dir> --call begin@1 --fps-test`
- Always render: the hold frame, a later frame, H = 470, each action 0.1-0.2 s after it starts and at its
  peak, and the moment a player would screenshot. `art/quality-rubric.md` has the full list.
- Evidence: every study rendered its frames this way.

#### PL3. When `shoot.js` is not enough [PROVEN]
- **An action needs an argument.** `--call` passes none. `select(undefined)` silently does nothing, which
  is why the documented reachbound command only ever rendered the first portrait. Write a small wrapper
  module that re-exports the piece and adds `sel0`, `sel1` and so on, or a 30-line driver that requires the
  piece and `scripts/png.js` and calls `encode(buf, W, H, 3)`.
- **Simulation runs inside `render`.** Then a driver must call `update` and `render` every step
  (muster loaf, reachbound).
- **A story state is far away.** Either play the game by script (still-water exports `press`, `release`
  and a stub UI that keeps the choice callbacks; three full playthroughs ran in seconds), or set fields on
  the exported state object and call `render`.
- Evidence: muster, reachbound, kolobok and still-water studies each needed one of these three.

#### PL4. Make frames repeatable [GOOD]
- Seed `Math.random` in the wrapper with `mulberry32`. A quiet mode that stops random events lets you
  shoot a calm frame (the summit study's wrapper did both).
- Pieces that call `Math.random` today: still-water particles, kolobok bursts and crows, muster and
  reachbound hunter blink, summit strikes and motes, souls wolf motes. New code uses a seeded generator from the start.
- Evidence: with the seeded wrapper the summit frames re-rendered byte-identical.

#### PL5. Look, in this order [PROVEN]
1. The frame at 3x.
2. The same frame at native 1x: this is the phone.
3. Crops at 6x to 9x of the subject, the light, the largest flat surface, the horizon row and the bottom
   40 rows. One way: Pillow `crop` then `resize(..., Image.NEAREST)`.
4. A contact sheet of the key moments: `python "<skill>/scripts/sheet.py" sheet.png a.png b.png ...`
5. Never write about a frame you did not open.
- Evidence: the crops found what the full frames hid (comb marks, checker fills, a clipped moon reflection).

#### PL6. Diagnostic variants [GOOD]
- Make a temp copy of the script with one line changed and render the same moment: a pass removed, a pass
  alone, a mask shown. The summit study did this for rays off, rays only, the clear-sky mask and fog off.
  It is the fastest way to learn what a pass really adds.
- Evidence: frames 08 to 13 in `art/frames/summit-road/`; `summit-road/08_diag_godrays_off_t60.png`.

#### PL7. Motion map [GOOD]
- Difference two frames (0.5 s apart, or 300 frames) and paint the changed pixels. It shows at once which
  regions are dead (`kolobok/diff_motion_t0_vs_t0.5.png`).
- Evidence: it showed zero changed pixels in the kolobok sky and foreground.

#### PL8. Squint test [GOOD]
- Blur to 36 px wide and reduce to three tones. The subject must still be one of the clearest shapes.
  `souls/squint-test-native-blur-3tone_tower-city-wolf-stillwater.png` shows a pass (wolf, boat) and two
  fails (tower, city). `art/quality-rubric.md` has a small script for it under "Evaluator procedure".
- Evidence: in that sheet the tower disappears in its three-tone view, and the boat scene keeps one
  connected light shape.

#### PL9. Scan for unpainted pixels [GOOD]
- After building a base buffer, count indices outside the scene's own palette block. One line. It would
  have caught the horizon lines in muster and reachbound.
- Evidence: the reachbound study counted 45, 50, 34, 196 and 397 unpainted pixels this way.

#### PL10. Screenshot the real page [GOOD]
- Headless Edge at `--window-size=648,1152`. A 432 px window is clipped: headless Edge will not lay out
  narrower than about 500 px.
- `--virtual-time-budget` does not advance CSS fades. still-water and kolobok came out black or mid-fade.
  Use `--timeout=7000` for a real wait, or screenshot a temp copy with the fade overlay switched off.
- Use a fresh `--user-data-dir` each time.
- This proves the page draws and the text is readable. It says nothing about phones.
- Evidence: `muster/20_page_edge_648x1152_pebble_with_text.png` is a clean capture; the first kolobok
  capture came out almost black (study).

#### PL11. Measure [PROVEN]
- `--fps-test` for median and p95; the deopt count as in section 12.
- Evidence: every number in section 12.

#### PL12. Smoke test [NOT GRADED]
- `node scripts/dom_smoke.js page.html` is in the skill's workflow. No study ran it. Treat it as untested
  until someone does.

#### PL13. Score with fresh eyes
- `art/quality-rubric.md`. The session that built the piece does not score it.

#### PL14. Scratch hygiene
- Temp files go in the system temp folder, never in the studio. Each agent uses its own subfolder: a
  shared wrapper was overwritten mid-run during the summit study. Never edit a piece's source to test it.

### Same name, different code

The pieces were written one after another and helpers drifted. Copy from the file named in "Engine pick".

| Helper | The variants | Engine pick |
| --- | --- | --- |
| `clamp`, `lerp`, `smooth`, `mulberry32`, `hash2`, `vnoise`, `BAYER` | Identical everywhere they exist | kolobok `1_engine.js` |
| `dith` | 0.28 / 0.72 everywhere. souls has a dead `dith` at 0.22 / 0.78 and a live `sd` with the house numbers | kolobok |
| `fbm` | Lacunarity 2.02 (souls 2.03). Missing in hero and tips, which is why their noise edges look blocky | kolobok |
| `sprite` | `sprite(rows)` with a global table (still-water, kolobok); `sprite(rows, map)` storing `.data` (muster) or `.d` (vignettes, tips) | muster |
| `mirror` | NAME CLASH. In kolobok it flips a sprite. In muster it is the water reflection. SKILL's table lists both under one name | Rename: `flipSprite`, `mirrorWater` |
| `genRidge` | Returns {x0, ys} (still-water, kolobok) or a lookup function (muster, vignettes) | pick one, muster's |
| `buildPalette` / `buildPal` | (mood, dim) in still-water; (dim) in kolobok, muster, vignettes; (flash, dim) in summit | still-water, plus summit's flash |
| Sky | `skyValue` (kolobok, fixed numbers), `paintSky` (muster, parameters), `paintSky` (tips, one gaussian, no disc), inline per frame (still-water) | muster for bakes, still-water for a moving sun |
| Clouds | Seven generators, see section 3 | `swClouds` with still-water numbers |
| `stamp` | Four signatures | muster; add kolobok's `stampZ` |
| Stone | `genStone` (kolobok, tips) = `genElder` (muster) | muster |
| Ramp clamp | `ci` (kolobok, still-water) = `r12` (muster) | one name |

## 14. Gaps: techniques the house style does not have yet

Each item was checked against all nine studies before it went on this list. "Closest today" is the nearest
thing that exists. Every "Idea" is a proposal within the rules. None of the ideas has been built or rendered.

### Checked, and not a gap

| Asked about | Status |
| --- | --- |
| Day-night transition | Exists and is PROVEN: still-water mood crossfade and `CINE_SUNSET` (P2, M2). Limits: baked mountains do not re-light, and there are about 2 s with no light in frame. |
| Lightning | Exists: summit (M14, P8). GOOD. Missing only the directional light (gap 13). |
| A large thing that moves | The kolobok loaf rolls and turns its surface (T2). PROVEN. But nothing with limbs (gap 10). |
| A tree that changes | muster `drawTree` grows by stage and sways 0.02 rad (G13). GOOD. Bare branches only (gap 2). |

### The gaps

| # | Missing | Closest today | Idea, in one line |
| --- | --- | --- | --- |
| 1 | Forest that moves in wind | Static pine layers: souls `pine` L784-799, vignettes treeline L127-143. Zero motion in both | Keep the tiered pine silhouettes, but draw each tree per frame with a whole-pixel sideways shift per row that grows with height, driven by the same travelling wind phase as the field (M1), so one gust crosses forest and wheat together; far layers sway less. |
| 2 | Leafy animated trees | muster `drawTree`: bare 1 px branches. souls city `tree` L616-626: leafy blob canopies, static and code-drawn | Hand-draw the trunk; build the canopy from 3 to 5 small puff clusters (S1) baked in three versions with puffs moved 1 px, and switch versions by the wind phase; add a rim on the light side. |
| 3 | Rain | None. Closest: stateless particles (M11) | Stateless slanted dashes 3-4 px long, position = (t x speed + k x offset) mod height, one ramp step lighter than what is behind them, in two layers with different speed and length; rings (W6) where they hit water; push `mood` a little toward the dark ramp. |
| 4 | Snow | still-water ash fall, `updAsh` L740-752 | Reuse the ash recipe with seeded flakes: 5-13 px/s, sine drift, two sizes by depth, each with its own landing row; remove all flakes when the effect ends (the ash bug); raise crest lines one step as snow settles. |
| 5 | Fog banks that drift and read as banks | summit distance fog (D4) does not move. souls mist already scrolls two tileable layers (2.4 and 1.3 px/s) with strength per depth tag, but as a low-alpha blend it boils in single-pixel flips. vignettes mist drifts as a few dotted rows | A scrolling tileable density layer (PF5, M15) that lifts the value buffer (P7) by whole ramp steps, strength from depth tags (D5), two layers at different speeds, one final `dith`. No low-alpha blends. |
| 6 | Multi-plane parallax scrolling | vignettes pan: four layers at factors 0.2, 0.45, 0.75 and 1, but only +-6 px over a 52 s swing, not noticed | Bake each depth layer (D1) into its own strip wider than the screen, with ridges whose ends match so they wrap; read each with offset floor(camX x factor), factors about 0.1, 0.25, 0.5, 1; mirror water reads the composite. |
| 7 | Camera pans | Only the vignettes castle sway (`pan`, +-6 px, L216), too small to see. summit crawls forward at 1.1 units/s | Follows from gap 6: one `camX` number on the state object (M2), moved by a tween, snapped to whole pixels. The roadmap lists a camera pan for Phase 4. |
| 8 | Tile maps | None in the pixel pipeline. The cookbook has a 16-tile autotile recipe in its 2D section. `pieces/world-map/src/world.js` (in progress, not one of the nine studies) holds a 512 x 512 data grid of the Reach and a debug top-down view, with no art renderer | Tiles as hand-typed sprites in the scene ramp, picked by which of four neighbours match (the cookbook recipe), stamped once into a baked base; light and fog added afterwards through the value buffer. Needs a decision first: the pieces so far are scenes, not maps. |
| 9 | Side-view walk cycle | summit `WALK`: from behind, four frames, two real poses | Hand-draw six to eight frames of a 16x24 or larger silhouette (contact, down, passing, up, for each leg); advance the frame by distance travelled, not by time; 1 px bob; cloth from the pennant formula (M9); `rimLit` per frame at load. |
| 10 | Large creature with moving parts | souls wolf: static. muster fish: barbels sway. | Hand-draw the parts as separate sprites (body, head, legs, tail) pinned at joints and moved by whole pixels: breathing as a 1-2 px row shift, head turn by swapping two or three head sprites, tail by a per-row sway like the stalk (M4). For a serpent, use the cookbook's "segments on a path" with discs shaded as LT9. |
| 11 | Clouds that drift at different speeds and change shape | tips: one rigid sheet with a wrap bug. summit: changes shape but mirrored and slow. souls sea: one layer ticking | Two or three `swClouds` layers with wrap, scrolled at different speeds; keep each density field as floats and add slow scrolling noise before the threshold, rebuilt every few frames on a stagger (PF6); re-light with LT13. |
| 12 | Visible light shafts | summit rays give haze, no shafts. souls pillars read as lasers | A wedge from the light through a cloud gap, added to the value buffer as +1 to +2 steps, fading with length, cut by anything in front (the clear-sky mask from LT10), with slow noise for dust. |
| 13 | Light from an event on the subject | Flash lifts the whole ramp evenly (P8). Lanterns do not light their holder | For 0.2 s after a strike, run the rim pass toward the bolt and raise the rim 2 steps; for a lantern, a warm rim on the holder's lamp side (`rims` in vignettes); for baked 3D, re-light the stored normals (T4). |
| 14 | Soft cast shadow and contact shadow | kolobok `shadowAt`: a hard wedge. No sprite has a contact shadow | Under each standing sprite, a 2:1 ellipse one whole step darker; for long shadows, lose one step of darkness per length band and dither only the outer edge. |
| 15 | Mountains that re-light with the mood | still-water `shadeM` is baked for one light | Store the slope sign per pixel at bake and add the lit term per frame from the current light side; or bake two versions and switch at the palette midpoint. |
| 16 | Composition that adapts to tall screens | Every piece just adds rows (section 7) | Anchor the horizon and subject as fractions of the height, and give the extra rows to sky or water in a planned ratio; render H = 470 in every loop. |
| 17 | Tap feedback that reads at 1x | Most reactions are 1-4 px (M8) | Every reaction changes the outline or the light for at least half a second: a dissolve, a flare, a pose swap. |
| 18 | Music | No score. Only drones, effects and kolobok's muffled 16-note song that follows distance (section 11) | Out of scope for this library until someone listens to what exists. |

Process gaps, not techniques: no piece was run on a real phone, no sound was heard, and `dom_smoke.js`
was not run in any study.

## 15. From the cookbook: techniques outside the pixel pipeline

These are the three.js and shader techniques in `docs/cookbook-claude-ai.md`. I did not open those pieces;
their source is not in this repo. The right-hand columns say whether each can feed the pixel style and
through which entry above. The rule from the 3D paper applies to all of them: nothing smooth reaches the
screen. Everything becomes a ramp value, is dithered once, and goes through the scene palette.

| Technique | Where in the cookbook | Feeds the pixel style? | How |
| --- | --- | --- | --- |
| Bloom | Arrival: `UnrealBloomPass` strength 0.9, radius 0.55, threshold 0.8; lit things pushed above 1.0 | Not as a pass. The idea, yes | Bloom is smooth light and makes off-palette colours, the opposite of rule 2. The same job is done in ramp space: two gaussian glows around the light (LT1), or the dithered tint (LT6). Keep bloom for the three.js pieces. |
| Fog as art direction | Abyss: exponential fog, density 0.011, in the same colour as the background | Yes, directly | D4: fog amount 1 - exp(-z / 650), blended toward the sky's horizon value. D2: haze toward the waterline. The lesson carried over: the fog value must equal the background value, then far things melt away and simple shapes are hidden. |
| Fake volume beams | Abyss: an open cone with an additive shader, a real spot light inside | Not yet | LT10 gives occlusion-aware haze, not beams. Gap 12 is the pixel version: a wedge added in ramp space, masked by what is in front. |
| Wrap-around particles | Abyss marine snow: 8,000 points wrapped around the camera with modulo | Yes | The stateless particles in M11 are the same idea: position = (t x speed + offset) mod range. It is the base for rain and snow (gaps 3 and 4). Counts stay small: 14 to 70 pixels, not thousands. |
| Instancing | Arrival: one `InstancedMesh` for 7,200 windows, 460 asteroids, 240 ships | Not needed | The software renderer pays per pixel, not per draw call. The lesson that carries over is scale through repetition: 260 lamp pixels make a city (G14), five crows mark an invisible loaf. Warning from the studies: identical repeats read as stamped (tips card 12, souls houses). Vary size, pose or phase. |
| Raymarched SDF scenes | Shader recipes; "Three worlds, rebuilt"; Hero of the Reach | Yes, as a one-time bake | T4: raymarch a small model once at load, keep material, normal and depth, light it per frame in the scene ramp. Not as a per-frame full-screen march: nothing like that was measured in this pipeline, and even summit's per-column terrain costs 5 ms. |
| Toon bands | Toon ocean: diffuse light in 3 flat bands, dark outline where the surface turns away, white rings around the island from its distance field | Yes, it is already the house look | Flat bands are what `dith` on a ramp gives (P5). The outline is T5. Rings are W6. Not built: rings taken from a distance field around a shore, which would give foam that follows any coastline. |
| 1-bit Bayer | 1-bit ghost render: two colours by an 8x8 Bayer threshold, outlines by comparing object ids and depth, 384 px wide | Only in two narrow ways | As a whole-frame look inside a scene: no. Whole-area dither is what rule 2 forbids and where pieces failed (hero flicker, souls fog, reachbound Projection). Allowed uses: a dissolve (M12), or a separate, deliberate style for a short sequence such as a memory or a ghost view, on the same 216 px grid. Outlines from ids are T5. |
| Segments on a path | Abyss leviathan: 72 spheres, each sampling the same curve a little earlier in time | Yes, untested | The idea for a long creature (gap 10): body discs follow the head exactly at any frame rate. Shade each disc as LT9. |
| Camera or object on a spline | Arrival: camera on a `CatmullRomCurve3` | Yes | Already in kolobok: the loaf follows a closed Catmull-Rom loop (`crom`, `buildPath`, `pathAt` L381-408). The same code can carry a camera pan (gap 7). |
| Scripted tension | Abyss: at 16 s the lights flicker, the creature crosses, captions change | Yes | M2: timelines over one state object. still-water's sunset and red sun are this. |
| Pixel planets | 2D recipes: 3D noise sampled on a rotating sphere, mapped to a 6-colour ramp with Bayer | Yes | It is T2 with a different texture. |
| Cel-shaded clouds | 2D recipes: the same circle cluster drawn three times (shadow offset down-right, mid, white offset up-left) | Possibly | Cheaper than S1 and not tested in this pipeline. S1 already lights by density difference toward the light, which follows the real light position. |
| Environment reflections, warp lines, nested zoom | Arrival, Specimen lab | No | Nothing in the pixel pipeline uses them. Mirror water (W1) is the house reflection. |

## 16. What is weak or untested in this library

- **No frame was rendered for this file.** I opened 57 existing frames from the studies and re-checked the
  main claims against them. Entries that cite other frames repeat the studies.
- **Grades were given by reading studies and looking at frames, not by scoring with the rubric.** The
  rubric itself is not calibrated yet.
- **Nothing was seen on a phone.** "Reads at phone size" always means the native 1x frame on a laptop.
- **No sound was heard.** Section 11 is from code only.
- **The fixes attached to the standards are proposals.** The three `rimLit` fixes, the two water fixes, the
  four cumulus fixes, layers snapped to whole steps: none has been built and rendered. The first piece that
  uses one should show before and after frames.
- **Every idea in the gaps section is unbuilt.**
- **Line numbers** were checked by grep for the function start lines only, on 2026-10-02. They drift when
  files are edited. Search by function name.
- **The cookbook's Souls entry is out of date.** It says 288 x 288, sphere-lit puffs and lookup-table fog.
  The file in the repo is 216 x 216, with `paintLobes`, `swClouds` and depth-tag fog.
- **The warm and cool question is open.** This file says one ramp plus a local warm light. The vignettes
  study supports that for skies. It is thinner for night scenes: one camp frame.
- **Material ramps are Farhad's call.** hero and tips use them and look rich. They are graded here against
  the one-ramp rule as written.
- **Checked a second time.** A separate session re-read every cited function on 2026-10-02 and corrected
  the numbers and names that were wrong. It compared the grades with the frames in `art/frames/` and left
  them as they were. Speed figures were spot-checked with `--fps-test` (same range on kolobok, muster,
  summit, still-water, vignettes and hero), not re-measured one by one. tips, souls and reachbound timings
  were not re-run.
- **The cloud standard is a judgement.** tips cumulus is the better-looking cloud by itself. The still-water
  family was chosen because it keeps the subject as the focal point and stays in the ramp. If the next game
  is about big skies, revisit this.

## Frames opened while writing

still-water: `gold_boat_day`, `sheet`, `08_night_lantern`, `10_red_sun_pupil`, `crop_day_clouds_topleft_x6`,
`crop_day_water_glitter_x6`, `crop_day_boat_fisher_x9`, `crop_day_right_mountain_x6`,
`crop_day_sun_glow_dither_x6`, `crop_night_lantern_boat_x9`, `crop_jaws_fangs_x6`.

kolobok: `sheet`, `12_tall_h470_empty_valley_t0`, `crop_a_sun_horizon_lake_mill_crows`, `crop_b_clouds`,
`crop_c_stone_elder_pebbles_grass`, `crop_f_bell_burst`, `crop_h_flour_drunk_crescent`,
`diff_motion_t0_vs_t0.5`.

muster: `sheet`, `20_page_edge_648x1152_pebble_with_text`, `crop_01_pebble_idle_t3`, `crop_04_fish_idle_t3`,
`crop_11_hunter_act_dissolve_t3.3`, `strip_loaf_flour_decay`, `zoom_elder`, `zoom_knight_raised`,
`zoom_loaf_floured`.

reachbound: `sheet`, `zoom_knight_collector_necromancer_12x`.

summit-road: `sheet`, `03_strike_big_bolt_visible_plus0.07s`, `07_godrays_on_t60_clouds_near_crown`,
`08_diag_godrays_off_t60`, `20_crop_walker_cycle_8_moments_x9`, `23_crop_stormbank_rays_on_vs_off_x9`.

vignettes: `sheet`, `camp_upgraded_t2.00s`, `lake_old_t2.00s`, `lake_upgraded_t2.00s`.

souls: `sheet`, `squint-test-native-blur-3tone_tower-city-wolf-stillwater`, `tower-crop-cloud-column-8x`,
`tower-layer-sky+cloud-sea`, `wolf-crop-head-moon-8x`, `wolf-full-t04s`, `wolf-layer-no-mist`.

field-tips: `sheet`, `card03-still-water-red-sun-lake_t2.5`, `card08-castles_t133.2-before-cloud-wrap`,
`card08-castles_t133.5-after-cloud-wrap-snap`, `zoom_card01-cumulus-puffs-x6`,
`zoom_card01-wheat-wind-track-grass-x6`, `zoom_card03-sun-shore-reflection-boat-x5`.

hero: `sheet`, `06_portrait_mid_flicker_dithered`, `07_helm_plume_closeup_8x`.
