# Engine extraction map

Phase 0, step 3 of `ROADMAP.md`. Written 2 October 2026.
It answers three questions: what is shared across the pieces, what differs, and what to pull into `engine/` first.

## How this was made

- Read the source of the ten files in the brief, plus `kolobok/3_story_ui.js` (it holds Kolobok's audio, UI and boot).
- A script found every definition of each helper by name and grouped the copies that are the same once spaces are removed. Line numbers below come from that script and point into the file named.
- "Same output" is a stronger claim. Each piece's own copy of a helper was run in Node against Kolobok's copy on 20,000 inputs and gave the same numbers bit for bit.
- Every piece was run headless to t = 2 s and t = 6 s, twice plain and twice with `Math.random` seeded, and the frames were hashed. One contact sheet of the 11 baseline frames was opened to check the harness draws the right scenes.
- Verdicts on looks come from the nine studies (`COOKBOOK.md`, `art/frames/`). This map does not judge frames again.
- No piece was changed. The temp scripts were in the session scratchpad and are gone; the recipe is in section 5.
- A second pass the same day checked every line reference against the files and ran the helper comparisons and the hash table again. Its corrections are in the text. What it could not check is listed in section 7.

Short names used below. `examples/` means `.claude/skills/pixel-scenes/examples/`.

| Short | File | Canvas | Lines |
| --- | --- | --- | --- |
| SW | `examples/still-water/still-water.html` | 216 x 384-470 | 2039 |
| K1, K2, K3 | `examples/kolobok/1_engine.js`, `2_sim_render.js`, `3_story_ui.js` | 216 x 384-470 | 567, 599, 403 |
| MU | `examples/muster/muster.js` | 216 x 384-470, scenes in a 198 x 124 window | 820 |
| RB | `pieces/reachbound-muster/src/reachbound.js` | same as MU | 952 |
| SR | `examples/summit-road/summit.js` | 216 x 384-470 | 408 |
| VG | `examples/vignettes/index.html` | 216 x 384-470 | 338 |
| SO | `examples/souls/souls-scenes.html` | 216 x 216, three scenes | 983 |
| HE | `pieces/hero-of-the-reach/hero-of-the-reach.html` | 320 x 568-700 | 416 |
| FT | `pieces/reach-field-tips/tips.js` | 320 x 400, fixed 4:5 | 572 |

## The short answer

- **Truly identical:** the small maths. `clamp`, `lerp`, `smooth`, `mulberry32`, `hash2`, `vnoise`, `fbm`, `BAYER`, `dith` give the same output in every piece that has them. One exception: Souls' `fbm`. `genRidge` gives the same heights in all five pieces that have it. That is about 40 lines copied into nine files.
- **Shared as an idea, different as code:** palette build, sprite and stamp, sky, clouds, water, light on water, rim light, particles, audio, boot. Each has three or more variants with different arguments and constants.
- **RB is MU plus 132 lines.** The diff has 16 hunks: three palette rows, the build and draw code of three new portraits (RB 574-693, 120 of the 145 added lines), the creature list, thumbnails and the roster strip. Every shared helper is the same text.
- **Extract first:** `testing/` (frame hashes), then the identical maths into `core.js`, then the Muster's palette, sprite and paint helpers moved without changing a pixel. Improve looks only after the Muster port matches its hashes.
- **Two study claims were wrong and are corrected here:** Souls does not dither with a wider window in live code (that copy is dead), and Kolobok and the Muster have no tween list (`TW` there is a texture width).

## 1. Shared helpers: who has what

### 1a. Maths, noise, dither

| Helper | Where (line) | Copies identical? | Exact differences |
| --- | --- | --- | --- |
| `clamp` | SW 218, K1 24, MU 12, RB 12, SR 14, VG 47, SO 65, HE 74, FT 8 | Yes, same text in all 9 | None |
| `lerp` | SW 219, K1 25, MU 13, RB 13, VG 48, SO 66 | Yes | Missing in SR, HE, FT |
| `smooth` | K1 26, MU 14, RB 14, SR 15, VG 49, HE 75, SO 67 | Same output | SO names the argument `v`. Missing in SW and FT |
| easing | SW `E` 220-225 (lin, io, out, in). K1 `easeOut` 27 | `easeOut` is `E.out` | Only these two pieces have easing |
| `mulberry32` | SW 226-233, K1 28-35, MU 15, RB 15, VG 50, SO 68-75, FT 9 | Yes | Missing in SR and HE. SR calls `Math.random` instead: 15 calls on 9 lines (255-315) |
| `hash2` | SW 234-239, K1 36-41, MU 16, RB 16, SR 16, VG 51, SO 76-81, HE 76, FT 10 | Yes, all 9 | None |
| `hash3`, `vnoise3` | K1 42-47, 55-64 | Only Kolobok | 3D noise for the flour texture |
| `vnoise` | SW 240-246, K1 48-54, MU 17-22, RB 17-22, VG 52, SO 82-87, HE 77, FT 11 | Same output, three text layouts | Missing in SR |
| `fbm` | SW 247-251, K1 65-69, MU 23, RB 23, VG 53, SO 88-92 | Same output except SO | SO multiplies frequency by 2.03 per octave, the rest by 2.02. VG's copy is never called. Missing in SR, HE, FT |
| noise that tiles | SO `pnoise`, `pfbm` 94-105. SR `genNoise`, `nt` 37-56 | No. Two answers to one need | SO: value noise that wraps in x, computed when asked. SR: a 256 x 256 texture built once, read with a bilinear lookup |
| `BAYER` | SW 252, K1 70, MU 24, RB 24, SR 17, VG 54, SO 106, HE 78, FT 12 | Yes, all 9 | None |
| `bay(x, y)` | HE 79, FT 13 | Yes | The raw threshold. RB has the same one-liner under the name `bay4` (656). Other pieces write the table lookup inline |
| `dith` | SW 254-259, K1 72-77, MU 25, RB 25, SR 18, VG 55, HE 80, FT 14, SO `sd` 294-299 | Same output in all 9 | Flat below 0.28, flat above 0.72, Bayer in the middle 44%. SO also has a second `dith` (108-113) with 0.22 and 0.78. It is dead code: only `pick` (114) calls it, only `drawPuffs` (188) calls `pick`, nothing calls `drawPuffs` |
| clamp to the ramp | SW `ci` 260, K1 `ci` 78, MU `r12` 26, RB `r12` 26 | Same function, two names | SO defines `ci` per scene with a top of 14 or 15 (364, 565, 761). SR does it inline (325). VG inside `C` and `Wm` (84-85). HE and FT inside `m` |
| `hexc` | SW 264, K1 81, MU 29, RB 29, SR 21, VG 64 | Yes | SO `hexRGB` 121 gives the same result. HE 97 and FT 46 parse inline |

### 1b. Palette layout and builders

| Piece | Layout | Builder | What it can do per frame |
| --- | --- | --- | --- |
| SW | 32 slots, 24 used: 0-11 ramp, 12-23 accents (276) | `setPal(i, r, g, b)` 278-282. `buildPalette(mood, dim)` 285-305 | `mood` crossfades the day, night and blood ramps and their accents. `dim` slides the ramp toward dark and leaves accents lit. `PALRGB` keeps a float copy for glows and UI colours |
| Kolobok | 17 slots: 12 ramp, 4 flour, 1 mint (K1 83-86) | `setPal(i, c, k)` 87-91. `buildPalette(dim)` 92-96 | Multiplies by 1 - 0.6 x dim. `G.dim` is never changed (K2 4, 584), so this is dead |
| MU, RB | 256 slots, one 16-slot block per scene: 12 ramp plus up to 4 accents. `OFF[name]` is the block start | Inline builder MU 39-47, RB 42-50. `buildPal(dim)` MU 49-55, RB 52-58 writes `PALCUR` | Scales all 256 colours to black |
| SR | 16 slots: 12 ramp, 4 accents (22-24) | `buildPal(flash, dim)` 25-33 | `flash` lifts the ramp 16% and the accents 10% toward (170, 255, 200). Also dims |
| VG | 128 slots, 40 per scene: cool 0-11, warm 12-19, accents 20-21, old combined ramp 22-33 (65-71) | `buildPal(dim)` 72-81, parses the hex strings again every frame | Dims. `C` and `Wm` (84-85) send a value to the cool or the warm ramp |
| SO | One palette object per scene: 25, 29 and 21 colours (358-364, 559-566, 757-761) | `makePalette` 122-130 | Nothing |
| HE | 256 slots, 9 material ramps of 3 to 11 colours packed end to end (83-98) | Inline. `m(k, v, x, y)` 100 takes a value from 0 to 1 | Nothing |
| FT | 256 slots, 26 material ramps of 2 to 10 colours (17-46) | Inline. `m` 47. `DARK` table 154-155: one step darker inside the same ramp | Nothing |

The "12 ramp slots, then accents" layout is wired into the water code: MU `mirror` 160 passes any index of 12 or more untouched, and SW `computeWater` 888 and `refl` 943 do the same. FT cannot use that test, so it uses the `DARK` table.

### 1c. Sprites and drawing

| Helper | Where (line) | Copies identical? | Exact differences |
| --- | --- | --- | --- |
| `sprite` | SW 459-467 and K1 102-110: `sprite(rows)` with one global character map `CH` (SW 458, K1 101; the two maps differ after `b`). MU 58-62, RB 61-65: `sprite(rows, map)`, returns `.data`. VG 104, FT 141: `sprite(rows, map)`, returns `.d`. SO `spriteFrom` 349-353 returns `.d`. SR parses inline (221-223) | Same pixels | Tested: `sprite(rows)` and `sprite(rows, CH)` give the same bytes. Only the second argument and the field name differ |
| flip a sprite | K1 `mirror(s)` 111-115 | Only Kolobok | SW, MU, RB, FT flip inside `stamp` with a flag |
| rim light | MU `rimLit` 64-75, RB 67-78 (same text). VG `rims` 106-117. SR inline 224-227. K1 by hand inside `genStone` 212-214 and `genPebble` 238-239. SO wolf 840-849 | No | `rimLit(s, lx, ly, body, rim, rim2)`: one light, returns a recoloured sprite, two rim depths, leaves hand-placed pixels alone. `rims(s, warmDir, coolDir)`: two lights, returns a mask (0 body, 1 warm, 2 cool), colour chosen when drawn. SR: fixed index 6 on top edges and on the sides of the top 12 rows. SW has no rim light on sprites |
| `stamp` family | SW `stamp` 963-970, `stampR` 951-962, `stampTop` 838-851, `stampIdx` 1136-1143. K2 `stampZ` 447-461, `stampAt` 462-473. MU 76-87, RB 79-90. FT 149. VG and SR loop inline | No. 8 variants in 9 copies (RB's is MU's text) | Target: SW writes a sprite layer through `plot`, or the sky buffer, or the frame. K2 writes the frame. MU writes any buffer `b` with a palette offset `o`, clipped to the 198 x 124 window. FT writes the frame and its sprites hold absolute palette indices. Extras: flip (SW `stamp` and `stampR`, MU, FT), dissolve by hash (SW `stamp`, `stampR`, `stampTop`), depth test (K2 `stampZ`), own reflection (SW `stampR`) |
| one pixel | SW `plot` 938-942, `plotR` 944-950. K2 `setPix` 474, `plotZ` 475-480. MU `put` 88, RB 91. VG `put` 86. SO `put` 419, 585, 764 | Same idea | All round and bounds-check. They differ in the target buffer and the extra (reflection, depth, depth tag) |
| line | MU `line` 89-92, RB 92-95. FT `line2` 341. SW inline inside `makeBoat` (543-553) | Same algorithm | Argument lists differ |
| polygon stone and `FONT` | K1 `genStone` 192-230 (31 x 47). MU `genElder` 226-246, RB 229-249 (44 x 72). FT `genStone` 182-199 (52 x 86). `FONT`: K1 181-188, MU 225, RB 228, FT 180 | Same method, same glyphs | Size, lit side (K1 right, MU left), eye shape, moss (FT) |
| `genPebble(w, h)` | K1 231-245, MU 168-180, RB 171-183 | Same arguments | MU adds speckle, a two-step rim and 2 px eyes |

### 1d. Landscape painters

| Helper | Where (line) | Copies identical? | Exact differences |
| --- | --- | --- | --- |
| `genRidge` | SW 377-397 and K1 312-332 return `{ x0, ys }`. MU 95-105, RB 98-108, VG 56-61 return a lookup function | Same heights (tested with one point list and seed) | Only the return type. FT `ridge` 340 is a different thing: a sine plus one noise, filled flat. HE uses two sines inside `paintRoom` (198) |
| sky toward a light | SW `renderTop` 796-823. K1 `skyValue` 255-263. MU `paintSky` 107-114, RB 110-117. SR `buildSky` 87. VG inline 135-139, 217-221, 254-258. SO 367-376, 567-576, 768-781. FT `paintSky` 156-161 and a second inline copy at 102-106 | No. One formula family, eleven sets of constants (VG and SO have three each) | The sky table shows six of them |
| light disc | SW `sunPix` 824-837. K1 inside `genSky` 369-377. MU `paintDisc` 115-120, RB 118-123. FT `disc` 339. VG inline 141, 259. SO moon 775-779 | No | All draw a filled circle. All but VG give it a darker ring (VG's two discs are one flat colour). SW adds red bands, a pupil and a lid. FT's ring is 1.5 px |
| clouds | SW `genClouds` 320-375. K1 `genClouds` 264-311. MU `paintClouds` 122-148, RB 125-151. SO `swClouds` 302-346 and `paintLobes` 261-285. FT `genCumulus` 55-68 with `renderClouds` 70-98. SR noise banks in `buildSky` 89-100 | No. Three families | See the cloud table. VG and HE have no clouds |
| fill under a ridge | MU `fillBelow` 149-151, RB 152-154 | Same text | K1 `genHills` 333-359, SW `paintMountain` 423-435 and VG `layer` 222 write the same loop inline |
| mirror water | SW `computeWater` 871-893. K2 `lakePix` 363-370. MU `mirror` 153-163, RB 156-166. VG inline 144-147 and 261-268. FT `animLake` 241-245 and `animPebbleShore` 356. SO city 730-743 | No | See the water table |
| light on water | SW 894-904. K2 368. MU 204-207 and 384-388. VG `glints` 87-96. FT 246-249 and 357 | No. Two kinds | See the water table |
| stars | SW `genStars` 447-455 with `topExtras` 854-859. VG 130, 140. FT `stars` 338. HE inside `paintRoom` | No | SW: 70 seeded points, fade in by rank, twinkle. VG: 70 points, twinkle only in upgraded mode. FT and HE: any pixel whose hash passes 0.993 or 0.992, static |
| vignette | VG 97-103 | Only VG | The study calls it neutral: it adds corner stipple |
| glow after the palette | SW `glowTint` 1157-1176, `applyGlows` 1177-1190 | Only SW | The one place where colours leave the palette |

Sky. `t` is y divided by the horizon row. `d2` is the squared distance to the light. `e(x)` means exp(x).

| Piece | Base | Glow around the light | Horizon band | Units and when |
| --- | --- | --- | --- | --- |
| SW `renderTop` | 4.1 + 4.5 t^1.5 | sunGlow x (2.1 e(-d2/24^2) + 1.2 e(-d2/62^2)). 30 and 80 for the red sun | horizGlow x 1.7 e(-dy^2/700) e(-dx^2/4500) | Ramp steps, every frame |
| K1 `skyValue` | 1.5 + 6.7 t^1.7 | 2.2 e(-d2/380) + 1.5 e(-d2/3200) | 1.6 e(-dy^2/300) x (0.35 + 0.65 e(-dx^2/9000)) | Ramp steps, baked |
| MU `paintSky` | top + (bot - top) t^1.6 | glow x (0.6 e(-d2/g1) + 0.4 e(-d2/g2)), defaults 260 and 2400 | band x e(-dy^2/160) x (0.4 + 0.6 e(-dx^2/7000)) | Ramp steps, baked. top, bot, glow, band are arguments; g1 and g2 are fields of the light object `L` |
| SR `buildSky` | 0.8 + 4.8 t^1.5 | 3.2 e(-d2/260) + 1.7 e(-d2/4200), with dy^2 counted 1.4 times | None | Float buffer, every third frame |
| VG camp | 0.6 + 3.2 t | 2.6 e(-d2/500) + 1.2 e(-d2/6000) | None | Ramp steps, every frame |
| FT `paintSky` | top + span t^1.5 | One term: glow x e(-d2/2600), with dy multiplied by 1.4 | Fixed 0.1 e(-dy^2/300) | 0 to 1, baked |

Clouds.

| Piece | Kind | Puff shape | Noise on density | Kept clear | Shading | Last step | Moves |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SW `genClouds` 320-375 | Density field, 6 clusters, radius 6-24 | y x 1.25, base falloff 2, lifted 0.25 r | fbm 0.3 and 0.1 | The sun's path: a column from the sun's start height (y = 172) down to the horizon, with a round cap above it, 21-31 px | 8.3 + clamp(5 x shade, -2.4, 2.2), light sampled 4 px toward the sun, white rim line, contour at 0.72, lit tops, dark undersides | `Math.round` at bake (373), then `dith` every frame with 0.55 x glow added (818) | No |
| K1 `genClouds` 264-311 | Density field, 4 clusters, radius 4-13 | y x 2.1, falloff 1.5, lifted 0.15 r | fbm 0.34 and 0.12 | A circle round the sun, 20-32 px | 3.4 + 3.2 e(-dist^2/4500) + 1.6 y/HY, lit side +1.1 to +2.7, 3 px sample, sunlit undersides | `dith` at bake (309) | No |
| MU `paintClouds` 122-148 | Density field, clusters passed in | y x 2.1, falloff 1.5, no lift | One fbm 0.34 | A circle, from `keep` (default 14) to `keep` + 10 | base + 2.6 e(-dist^2/4000), lit side x 0.6 to 1.4, 3 px sample, no underside rule | `dith` at bake (146) | No |
| SO `swClouds` 302-346 | SW's, with options: a light function, contour list, top and underside rules, wrap | y x 1.25, falloff 2, lifted 0.25 r | fbm, or periodic `pfbm` when wrapping | Nothing | base + clamp(shade x gain), rim, contours, 4 px sample | `Math.round` (343) | The wrapped layer scrolls |
| FT `genCumulus`, `renderClouds` 55-98 | Sphere-shaded puff discs drawn back to front, each normal blended 38/62 with the whole cloud's | Flat cut 2 px under the base | Noise on each puff's radius | Nothing (clouds cover the sign, study) | 0.18 + 0.82 x lambert + sky fill - base shadow. The light is one fixed vector (51) | `m` with `dith`, Bayer on the rim (83) | The whole layer scrolls 0.6 px/s and jumps back every 133 s (517, a bug found by the study) |
| SR `buildSky` 89-100 | Scrolling tileable noise above a threshold, mirrored about the summit | None | None | A hole at the crown | 1.9 + falloff, lit side from a 3 px noise difference | Float buffer | Yes, and the shapes change |

Water. `k` is 0 at the waterline and 1 at the bottom.

| Piece | Sideways ripple per row | Darkening | Extras |
| --- | --- | --- | --- |
| SW `computeWater` 871-893 | round(sin(0.55 y + 1.6 t + 2.2 sin(0.11 y + 0.7 t)) x amp), amp = 0.35 + 1.5 k + troubled x (0.5 + 2.4 k). Also a 1 px vertical wobble that only appears once `troubled` passes 0.22 (878) | value - (0.75 + 1.1 k + 0.4 troubled) + 1.1 (1 - k)^8, then `dith`. Accents pass | Horizon row lifted 2 steps. `RIPX` kept so sprites can ripple their reflections. `troubled` is read once (873), but the light pass reads `WS.sunR` per row (897) and `WS.sunX` per pixel (902) |
| MU `mirror` 153-163 | round(sin(1.9 y + 1.6 t) x amp x (0.3 + k)) | Whole steps: v - dark. Accents (12 and up) pass | Rows whose source is above the buffer are skipped (the flat strip under the fish, study) |
| K2 `lakePix` 363-370 | round(sin(1.7 y + 1.3 t) x 0.8) | 1 step | Called per pixel, 4 rows only |
| VG 144-147, 261-268 | sin(1.7 y + 1.5 t) x 1.2. Lake: sin(1.3 y + 1.1 t) x (0.6 + 0.01 x depth) | 1 step, plus 1 per 60 rows in the upgraded lake | Upgraded lake: warm pixels stay warm, one step darker; accents turn cool. Upgraded camp river: every warm or accent pixel becomes cool step 8 |
| FT 241-245, 356 | Lake: two sines, the first growing 0.05 px per row. Pebble shore: one sine, 0.04 px per row | `DARK` table (lake: twice below 24 rows), then a Bayer fade to flat water | No reflection of anything above y = 100 |

| Light on water | How |
| --- | --- |
| SW 901-902 | Streaks: vnoise(0.09 x + 0.35 t, 0.7 y - 0.2 t) > 0.78 adds 1 step. Glitter: inside a cone, hash2(x, y, floor(7 t)) > 0.955 adds 2 |
| K2 368 | Cone of 2 + 1.5 px per row, hash2(x, y, floor(6 t)) > 0.5 sets cream |
| MU 204-207, 384-388 | Cone, hash2 > 0.8 at 5 changes a second (pebble), > 0.84 at 4 (fish) |
| VG `glints` 87-96 | Up to 4 short dashes per row, row seed floor(3 t + 0.37 y), colour from a callback |
| FT 246-249, 357 | The same dash recipe typed inline, with the same row seed. 246-249 uses the same three hash seeds (row, row + 7, row + 3). 357 uses the first two and a fixed 3 px dash |

### 1e. Effects, motion, audio, page shell

| Helper | Where (line) | Copies identical? | Exact differences |
| --- | --- | --- | --- |
| particles | SW `PARTS` 716-730, `ASH` 740-752. K2 `PARTS` in `makeBurst` 173-190 and `updateBursts` 191. SR `MOTES` 290-298. SO embers 543-550, motes 886 and 907-913. No stored state (position from time and index): VG 170-173, HE inside `render` 352, FT 325-328, RB `drawCollector` 642 | No | SW: objects with `x, y, vx, vy, life, max, v, floor, g`. K2: 3D, unique field names (`fx, fy, fz`), depth tested, as the skill's performance rule asks. SR moves its motes inside `render`. SO pushes new objects inside `frame` (129 deopts in 300 frames, study) |
| powder bursts | K2 `makeBurst` 173-190, `drawBursts` 486-533 | Only Kolobok | None |
| dissolve | SW: `hash2(i, j, seed) > alpha` in sprite space (`stampTop` 847, `stampR` 958, `stamp` 967). MU `drawHunter` 498 and RB: Bayer at the screen pixel against a visibility number. FT 378 and 485-487: Bayer shifted by floor(10 t) or floor(6 t). RB `drawProj` 681: the same, by floor(12 t). HE 357: Bayer between two baked lightings | No. Two looks | Fixed speckle (SW) against checker (MU, FT, HE) |
| blink | MU 218 and 269. K2 `eyeOpen` 568. HE inside `render` | Same trick | Eyes shut while (rate x t + phase) mod 1 is under a few percent. Rates 0.21 to 0.3, shut 3% to 4%. No stored state |
| bolts | SR `bolt` 253-258, `strike` 259-271, `drawBolts` 272-287. FT `bolt` 342, `drawBolt` 343 | Same recursion | SR uses `Math.random` and vertical jitter 0.5. FT takes an rng and uses 0.4. SR has flicker and a palette flash. FT has neither |
| rings on water | SW `ring`, `updRings` 731-739, `drawRings` 906-921. MU 390-393. VG 287. FT 254 | No | SW stores rings, draws them dotted with hash dropout, height 0.32 of width. The others compute ellipses from time, height 0.16 to 0.22 |
| tween and timelines | SW `tween` 700-703, `updTweens` 704-713, `playCine`, `cineUpdate` 1362-1374 | Only SW | K3 has a timed queue instead (`later`, 23). `TW` is the tween list in SW (699) but a texture width in K1 (21) and MU (512) and a layer width in SO (357) |
| wind over a field | K1 `fsin` table 440-442 and baked phase `GPH` 482, used at K2 329. MU `drawStone` 263-266, RB 266-269. FT `render` 522-527 | Same idea | Kolobok bakes the phase per pixel and reads a sine table. MU and FT call `Math.sin` and `vnoise` per pixel per frame; it is the slowest thing in both (studies: 0.69 ms and about 2.3 ms) |
| perspective ground, world grids | K1 `genGround` 453-490. K2 `stampTrail` 49-65, `fadeArray` 68-70, `dustSplat` 79-95 | Only Kolobok | None |
| audio synth | SW `SFX` 1213-1305. K3 192-272. MU 698-736, RB 829-867. SR 339-365 | No | See below. VG, SO, HE, FT have no sound |
| UI stub for Node | SW 685-696, K3 276-280, MU 740, RB 871 | Same pattern | Each lists its own calls |
| DOM UI | SW `makeUI` 1858-1934, K3 281-312, MU 741-789, RB 872-921. `at` MU 762, RB 894, HE 384 | No | SW and K3: caption, prompt, title, ending, fade, sized in `--u`. MU, RB, HE: `at(el, x, y, w, h)` places elements in canvas pixels through `--px` |
| boot, resize, frame loop | SW 1935-2017, K3 313-388, MU 790-814, RB 922-946, SR 369-403, VG 310-331, HE 379-409, FT 549-569. SO page script 926-981 | No. 7 `boot` variants (MU and RB share one) plus SO's page script | See below |
| `module.exports` | SW 2024-2034, K3 395-401, MU 818, RB 950, SR 406, VG 333, HE 411, FT 571, SO 919-922 | Same core in 7 | See below |
| saved endings | SW 1621-1629, K3 99-109 | Same pattern | `localStorage` |

Audio.

- All four build an AudioContext, a master gain and one white-noise buffer. Master gain 0.6 (SW, K3, MU, RB) or 0.7 (SR). Buffer 2 s (SW 1225, K3 202, SR 347) or 1 s (MU 706).
- `tone(f, dur, type, vol, f2, delay)`: SW 1233, attack min(0.02, 0.3 x dur). K3 226, attack min(0.03, 0.3 x dur), and a seventh argument `bus`. MU 711, attack as K3, no default wave.
- `noise`: SW 1246 and K3 239 take `(dur, vol, type, f, f2, q, delay)`, q defaults to 0.8, playback starts at a random point of the buffer. MU 718 takes `(dur, vol, f, f2, q, delay)`: band-pass only, q defaults to 1, attack fixed at 0.02 s, starts at 0.
- SR has no `tone` or `noise`. It has `init` (341) and `thunder` (358) only.
- `resume` and `setMuted` exist in SW (1231-1232) and K3 (224-225). MU and SR set the gain inside the mute button's handler.

Boot, resize, frame. `aw` and `ah` are the width and height of the space the page gives the stage.

| Piece | Height | Scale | Text unit | Frame loop | Input |
| --- | --- | --- | --- | --- | --- |
| SW 1935-2017 | clamp(round(216 x ah / aw), 384, 470). Sets `H` and calls `alloc` inline (1943-1959) | min(aw / W, ah / H), any fraction | `--u` = stage width / 100 | Every frame (2005-2015) | Tap and hold, Space, Enter, digits 1-3 |
| K3 313-388 | Same clamp, through `setH` | Same | `--u` | Draws every other frame when the smoothed cost passes 12 ms (371-386) | Tap with canvas coordinates, Space, Enter |
| MU 790-814, RB 922-946 | Same, through `setH` | Same | `--px` = one canvas pixel, `UI.layout(sc)` | Every frame | Tap the portrait, arrows, thumbnails, swipe over 40 px, keys (MU 775-786) |
| SR 369-403 | Same | Same | `--u` | Fallback as K3 (395-401) | Tap, Space, Enter |
| VG 310-331 | Same | Same | `--u` | Every frame | Buttons, arrow keys, Space |
| HE 379-409 | Clamp to 568-700 | Same | `--px` | Every frame | Buttons |
| FT 549-569 | Fixed 320 x 400, no `setH` | Same | `--px` | Every frame | Tap, swipe, arrows, two buttons |
| SO 926-981 | Fixed 216 x 216 | Snapped to a whole number of device pixels (`fit` 934) | None | 30 a second at most, built when scrolled near, paused off screen, one still frame for reduced motion | None |

Exports. `scripts/shoot.js` needs `init, setH, setOut, update, render, W, H, G` (its lines 3-4).

- All eight present: SW, K3, MU, RB, SR, VG, HE.
- FT (571): no `setH`, and `H` is a plain number.
- SO (919-922): exports `{ S, SCENES }`. Each scene is a factory that returns `{ W, H, frame(t, out) }`.
- Test hooks differ: `press`, `release` (SW). `tap`, `begin`, `aimAtLoaf`, `coatAll` (K3). `select`, `act` (MU, RB). `tap`, `strike` (SR). `select`, `setNew` (VG). `useCard` (FT).
- `shoot.js --call` passes no arguments (its line 23), so `select(i)`, `tap(x, y)` and `useCard(i)` need a wrapper. Every study hit this.

## 2. The version to keep, and what each piece changes

"Keep" is the text that goes into the engine. "Why" is either best looking (from the studies) or most general.

### Core

| Helper | Keep | Why | What changes in the pieces |
| --- | --- | --- | --- |
| `clamp`, `lerp`, `smooth`, `mulberry32`, `hash2`, `vnoise`, `fbm`, `BAYER`, `dith`, `hexc` | Kolobok's text, K1 24-81 | Output is the same everywhere, so only readability counts. Kolobok's is multi-line and commented | Every piece deletes its copy. SO: its `fbm` uses 2.03, so either keep a local copy in Souls or accept new Souls frames |
| easing | SW `E` 220-225 | It contains `easeOut` | K1, K2: `easeOut(t)` becomes `E.out(t)` |
| `hash3`, `vnoise3` | K1 42-64 | Only copy | None |
| noise that tiles | Both. SR `genNoise`, `nt` (37-56) for anything read per pixel per frame. SO `pnoise`, `pfbm` (94-105) for layers baked once that must wrap | Different jobs. `nt` is one table read, which is why SR's clouds can change shape every frame | None today |
| `bay(x, y)` | HE 79 | A name for the raw threshold makes its uses easy to find | Optional for the rest |
| ramp clamp | One name, `ci` | Two names for one function | MU, RB: `r12` becomes `ci` |
| flat fills | New one-liner `flat(v)` that rounds to a whole step. Not in any piece | The studies found whole areas of dither where a constant fill lands between two steps: MU knight ridge at 4.6, VG far ridge at 7.4, HE icon interiors at 0.5625 | No change at extraction. Using it changes pixels, so it is a look change for later |

### Palette

Keep the Muster's 16-slot blocks (MU 39-55) as the layout. The ROADMAP names it, and it is the only layout that has shown several scenes on one screen. Give a block the effects the other pieces have:

- Blend two ramps into a block: SW 285-292. The study calls the mood crossfade "the best idea in the piece".
- Slide a block's ramp toward dark while accents stay lit: SW 293-303. "Much better than a black overlay" (study).
- Flash a block toward a colour: SR 25-33.
- A float copy of the colours for glows and UI: SW `PALRGB` 277.
- A "one step darker" table built from the block starts: FT `DARK` 154-155. With it, mirror water no longer needs the `v >= 12` test.

A block is a named run of colours with a start and a length. Scene ramps pad to 16 so Muster code runs unchanged. Material ramps must keep their real length: FT's 26 ramps would need 416 slots at 16 each, and a byte index holds 256.

| Piece | What changes |
| --- | --- |
| MU, RB | Nothing. Their builder is the one being moved |
| Kolobok | 17 slots become one block. `buildPalette(dim)` and the dead `G.dim` go |
| SR | One block plus the flash |
| SW | 24 used slots do not fit one block. Two blocks (ramp, accents). The mood blend and the slide move into the engine as they are |
| VG | 34 slots per scene: three blocks (cool, warm with accents, old ramp), or the piece keeps its own palette |
| SO | Ramps of 15 and 16 steps plus groups: several blocks per scene |
| HE, FT | Each material ramp becomes a block with its real length. `m(k, v, x, y)` stays as a thin wrapper over `dith` |

### Sprites

| Helper | Keep | Why | What changes in the pieces |
| --- | --- | --- | --- |
| `sprite` | MU 58-62: `sprite(rows, map)` returning `{ w, h, data }` | A map per sprite is needed once palettes have blocks. `.data` is used by SW, Kolobok, MU, RB and SR | SW, K1: pass `CH` as the second argument (same bytes, tested). VG, FT, SO: `.d` becomes `.data`. SR: drop the inline parser |
| flip | MU's flag inside `stamp`, plus K1's `mirror(s)` renamed `flipSprite` | Ends the name clash with water `mirror` | K1: four calls on line 135 |
| rim light | MU `rimLit` 64-75 first, unchanged. Later a mask version shaped like VG `rims` 106-117, with `rimLit`'s second depth and its "leave hand-placed pixels" rule | The mask lets the colour be chosen against the background when drawing. SR's baked rim (224-227) used index 6 on a road of index 5-6 and vanished (study). VG's version handles two lights | MU, RB: nothing at first. SR, VG: use the mask version. Kolobok's stone and SW's sprites keep their hand-placed pixels. The merged function does not exist yet |
| `stamp` | MU 76-87, with the buffer's width and height as arguments in place of `PW`, `PH` | It already takes a target buffer, a palette offset and a flip | K2 `stampAt` 462-473, FT `stamp` 149 and SW `stampIdx` 1136-1143 become calls with offset 0 |
| stamp with depth | K2 `stampZ`, `plotZ` 447-480, kept as separate functions | The skill's rule: no rarely used branch inside a hot loop | Kolobok only |
| stamp with reflection | SW `stampR`, `plotR`, `refl` 943-962 | Only copy. The hull reflection is "the best detail in the frame" (study) | SW only, with Phase 4 |
| dissolve | A visibility number tested against `bay(x, y)` at the screen pixel, as MU 498 | The MU study calls it "a clean, very pixel-art way to fade". SW's hash speckle leaves "moth-eaten" holes near 90-95%. FT's sliding Bayer reads as a screen door (studies) | SW keeps its hash version as an option for its own port |
| `put`, `line` | MU 88-92 | Buffer first, same as `stamp` | FT `line2`, VG `put`: add the buffer argument |
| polygon silhouette, `FONT`, `genPebble` | K1 181-230 as the base, MU's `genPebble` 168-180 | The stone elder is "the pattern to reuse" (Kolobok study) | Low priority. The three stones differ in size and shading rules |

### Landscape

| Helper | Keep | Why | What changes in the pieces |
| --- | --- | --- | --- |
| `genRidge` | K1 312-332, returning `{ x0, ys }`, plus a small `ridgeAt(r, x)` | A typed array with no closure. VG calls the closure for every column every frame | MU, RB, VG: `far(x)` becomes `ridgeAt(far, x)`. Heights are the same (tested) |
| sky | MU `paintSky` 107-114, moved unchanged first. Later widened: the exponent (1.5, 1.6, 1.7), two glow strengths in place of the fixed 0.6 and 0.4, the band's height, width and floor, a vertical stretch for the glow. Split into `skyValue` (returns a number) and `paintSky` (loops and dithers) | Best looking: "the strongest reusable piece" (MU study), "top grade in every frame" (RB study). Most general: it already takes its numbers as arguments. The split is needed because K1 uses the value for its hazy ridge (340), SR needs floats and SW needs it every frame | K1: its constants become one argument list. SW: a per-frame call, numbers passed in a typed array because the sun moves. SR, VG, FT: replace the inline formula |
| light disc | MU `paintDisc` 115-120 | Smallest general one | SW keeps `sunPix`: the pupil and lid belong to its story |
| clouds, density kind | Start from SO `swClouds` 302-346. Share the density step (puffs, squash, base falloff, noise, keep-clear, wrap). Pass the shading in as a function at bake time: one each for SW (361-373), Kolobok (296-310) and MU (137-147) | `swClouds` is already SW's generator with a light function and options, and its cloud sea is "close to Still Water quality" (SO study). The three shadings are different formulas, not different numbers, so one merged formula would not reproduce any of them | MU, RB: `paintClouds` moves unchanged first. Its look is "the weakest landscape element" (MU study), so replacing it comes later as an approved change. K1 and SW keep their shading as a callback |
| clouds, cumulus kind | FT `genCumulus`, `renderClouds` 55-98, with the light vector as an argument | Best looking: "the star of the piece", "better than the density-field clouds in the older pieces" (FT study) | FT: `LX, LY, LZ` (51) become values per card. That fixes the clouds lit from the wrong side on six cards (study) |
| cloud movement | Nothing to keep | Every density cloud is baked and frozen (SW, Kolobok, MU studies). FT scrolls one rigid sheet. Only SR changes shape, and its banks are a mirrored inkblot (study) | New work, not extraction. SR's `nt` is the cheap noise to build it on |
| fill under a ridge | MU `fillBelow` 149-151 | Only named copy | K1, SW, VG can call it. The unpainted horizon rows (MU, RB studies) come from how it is called, not from the function |
| mirror water | MU `mirror` 153-163 moved unchanged first, renamed `mirrorWater`. Target look: SW `computeWater` 871-893 | SW's water is "the best in the studio" (study): ripple that grows toward the viewer, darkening through `dith`, horizon haze, one `troubled` dial. MU's is the same idea with one sine | SW: `WS.sunR` (897) and `WS.sunX` (902), read inside the light loops, become plain numbers (`troubled` is already read once, 873). K2 `lakePix`, VG and FT inline loops become calls. FT's Bayer fade and MU's skipped rows are faults in the studies and should not be carried over |
| light on water | VG `glints` 87-96 for new scenes. SW's streaks and glitter (894-904) for the SW port | The cookbook says dashes: random dots "read as a Christmas tree". The skill's failure list says the same. SW's version is "restrained" (study) and is part of the reference frame | FT: its two inline copies become calls. MU and K2 dot glitter stays until the ports pass, then goes with approval |
| stars | SW `genStars` 447-455 and the ranked twinkle 854-859 | "Looks right" (study). Stars avoid clouds and mountains and show in the water for free | VG, FT, HE: replace hash stars |
| vignette | Do not extract | Neutral in the study | None |

### Effects, audio, shell

| Helper | Keep | Why | What changes in the pieces |
| --- | --- | --- | --- |
| particles | A typed-array pool, written new, following K2's rule of unique field names. Plus the stateless pattern (FT, VG, RB) for garnish | No piece has a pool that follows the skill's rules. SW's particle objects start with `x, y`, like its `tip`, `hand` and `lanternPos` objects (677-678). SO's tower deopts on object literals (study) | SW, SR, SO move to the pool. This is untested new code |
| powder bursts | K2 `makeBurst`, `drawBursts` | Only copy | Kolobok only. Its first 0.2 s reads as a hard blob (study), so it is not finished art |
| blink | K2 `eyeOpen(t, ph)` 568, with rate and shut time as arguments | Named, no state | MU 218, 269 and HE call it |
| bolts | FT `bolt` 342 (takes an rng) with SR `strike`, `drawBolts` 259-287 and the palette flash | FT's is repeatable. SR's flash and flicker are "well judged" (study). FT's bolt alone has no flash and no impact (study) | SR: `Math.random` becomes an rng. FT: gains the flash |
| rings | SW 731-739, 906-921 | Dotted, fading, the right squash for a low camera (study) | MU, VG, FT can call it |
| glow after the palette | SW `glowTint` 1157-1176 | Only copy. The lantern halo is the second-best image in SW (study) | None |
| tween | SW `tween`, `updTweens` 699-713 with `E`, but writing into a typed-array slot | Only copy. The skill says numbers that change every frame live in typed arrays. SW tweens fields of a plain object that pixel loops read | SW: `WS` becomes a typed array with named indices. Kolobok keeps `later` |
| wind | Kolobok's: phase baked per pixel (K1 482), table sine (K1 440-442), threshold on the crest (K2 329) | It runs inside a 1.8-2.0 ms frame and is "the best motion in the piece" (study) | MU `drawStone`, FT `render`: bake the phase once |
| audio | K3 `SFX` core: `init`, `resume`, `setMuted`, `tone` with `bus`, `noise` with a filter type (194-253, without the piece's own wind, rumble and song) | Superset of the others | SW: tone attack 0.02 s becomes 0.03 s unless attack is made an argument. MU, RB: `noise` calls gain a `'bandpass'` argument, start at a random offset, buffer 2 s. SR: `thunder` needs an attack argument (0.08 s) to become a `noise` call. Nobody has heard any of this |
| page shell | K3 `boot` 313-388: `setH`, tap in canvas coordinates, audio unlock, suspend when hidden, mute, the 12 ms fallback. Add MU's swipe and arrow keys (779-786). Add SO's whole-pixel scale (934), reduced motion (929) and pause off screen (960) | Most complete. The Kolobok study saw uneven pixels from the fractional scale | SW, MU, RB, VG, HE, FT gain the fallback. FT needs `setH` |
| text unit | `--px` (one canvas pixel), with `--u` defined from it as W / 100 pixels | `--px` lets `at(el, x, y, w, h)` place text on canvas art (MU, HE). `--u` keeps the SW, K3, SR and VG stylesheets working | None if both exist |
| exports | The `shoot.js` contract plus two rules: test hooks take plain numbers, and `render(t)` must not change state | SR gives a different picture when `render` runs twice for one moment (measured). MU `drawLoaf` advances its roll and flour inside `render` (534-543) | MU, RB, SR, SO move that state to `update`. FT adds `setH`. SO gets an adapter |

## 3. Differences that matter for a consistent look

1. **Dither thresholds are the same everywhere.** 0.28 and 0.72 in every live call, proven by running each copy. The habits around `dith` are what differ:
   - Clouds are rounded with `Math.round` at bake in SW (373) and SO (343), and dithered in Kolobok (309) and MU (146).
   - Raw Bayer used across whole areas, outside `dith`: SW 1 place (the glow, 1167), K2 2 (425, 521), MU 2 (498, 557), RB 4 (501, 560, 649, 681), VG 5 (101, 155, 219, 256, 274), HE 1 (357), FT 8. The studies trace the speckle complaints to these: VG's warm and cool handover, FT's lake fade, HE's flicker (27% of the portrait in a checker 94% of the time).
   - Flat fills that land between two steps (see `flat` in section 2).
2. **Two value scales.** Ramp steps 0 to 11 (SW, Kolobok, MU, RB, SR, VG; 0 to 14 or 15 in SO) against 0 to 1 through `m` (HE, FT). Same `dith` underneath. Keep ramp steps inside the engine.
3. **Four palette layouts.** 12 plus accents in one ramp (SW, Kolobok, SR, each MU portrait). A cool ramp plus a warm ramp (VG). A long ramp plus groups (SO: 25, 29, 21 colours). Material ramps (HE: 64 colours, 58 on screen; FT: 40 to 55 a card). The studies tie unity of light to the first kind: FT's one card at the Still Water bar is the 28-colour red lake.
4. **Canvas width.** 216 in seven pieces, 320 in HE and FT. There is no 288 canvas: `const S = 288` (SO 62) is dead, and `docs/cookbook-claude-ai.md` is out of date on it. A pixel at 320 is about two thirds the size of one at 216 on the same phone, so small sprites get smaller (FT's traveller is 14 x 23).
5. **Mixed pixel sizes.** FT draws one sprite at 3x (378), VG draws the castle at 2x (226-232) and RB draws the Projection's knight at 2x (676-683). All three studies flag it.
6. **Canvas height.** 384-470 adaptive in six pieces. 216 square in SO. 568-700 in HE. 400 fixed in FT. At the tall size every piece only adds empty rows (all studies).
7. **4:5 cards exist only in FT**, at 320 x 400, with the sign and the horizon as constants. A 4:5 card at 216 wide would be 216 x 270.
8. **Muster helpers assume a 198 x 124 window.** `stamp`, `put`, `paintSky`, `paintClouds`, `fillBelow` and `mirror` read `PW` and `PH` directly (MU 76-163).
9. **The horizon row is a constant per piece:** SW 236, Kolobok 170, SR 150, FT 262.
10. **Light direction.** Toward the real light per pixel in SW (361), Kolobok (299), MU (140) and SO (a function). One constant vector for all cards in FT (51).
11. **Bake or repaint.** SR and VG repaint everything each frame and are the two that miss the 4 ms target (about 8 ms; 4.9 and 6.4 ms). The rest bake static layers.
12. **Dither once or per layer.** SR keeps float values and dithers once at the end (68-73, 325). The others dither each layer, and a mirrored or shifted dither turns into comb marks (RB and VG studies).
13. **Scale on screen.** Only SO snaps to whole device pixels. The others use a fractional scale, so pixels have uneven widths on most phones.
14. **Text.** `--u` in four shells, `--px` in four. Pixelify Sans everywhere except FT, which uses Cormorant Garamond against rule 7 of the skill.
15. **Reflections of accents.** SW passes accents through undarkened, so the golden fish reads as two fish (study). MU does the same at 160.
16. **Rim light.** MU, RB and VG compute it. SW has none on sprites. SR's is invisible. Rule 3 of the skill is met a different way in every piece.

## 4. Proposed engine layout

Files match Phase 1 of the ROADMAP. Line counts are estimates from the lines these functions occupy today, in Kolobok's multi-line style.

| File | What lands in it | Taken from | Est. lines |
| --- | --- | --- | --- |
| `core.js` | Screen: width as an argument (default 216), height range, `alloc`, the final index-to-colour loop. Maths: `clamp`, `lerp`, `smooth`, `E`. Random: `mulberry32`, `hash2`, `hash3`. Noise: `vnoise`, `vnoise3`, `fbm`, `pnoise`, `pfbm`, `genNoise`, `nt`. Dither: `BAYER`, `bay`, `dith`, `ci`, `flat`. Palette: `hexc`, blocks and `OFF`, `buildPal`, blend, slide, flash, `PALRGB`, the darker table. Tables: `fsin`, `fadeArray` | K1 24-81, 440-442. K2 68-70. SW 220-225, 277, 285-305. MU 39-55. SR 25-33, 37-56. SO 94-105. HE 79. FT 154-155 | 230 |
| `paint.js` | `skyValue`, `paintSky`, `paintDisc`, `genRidge`, `ridgeAt`, `fillBelow`, cloud density with a shading callback, `cumulus`, `mirrorWater`, `glints`, glitter, stars | MU 95-163. K1 255-332. SO 302-346. FT 55-99. SW 447-455, 854-859, 871-904. VG 87-96 | 330 |
| `sprite.js` | `sprite`, `flipSprite`, `rimLit`, rim mask, `stamp`, `stampZ`, `plotZ`, `stampR`, `plotR`, `put`, `line`, polygon silhouette with `FONT`, `genPebble` | MU 58-92, 168-180. K1 111-115, 181-230. K2 447-480. SW 943-962. VG 106-117 | 170 |
| `ground.js` | Camera numbers and the world-to-screen projection. The general part of `genGround` (world X and Z per pixel, wind phase, grid cell and fractions). World grid: `stampTrail`, `dustSplat`, sampling. Paths: `crom`, `buildPath`, `pathAt`, `nearestS` | K1 11, 381-416, 453-490. K2 49-95, 329-349 | 170 |
| `fx.js` | Particle pool (new). Powder bursts. Dissolve by visibility, `eyeOpen`. `bolt`, `strike`, `drawBolts`. Rings. `glowTint`. `tween`, `updTweens` | K2 173-213, 486-539, 568. MU 494-500. FT 342. SR 259-287. SW 699-713, 731-739, 906-921, 1157-1176 | 260 |
| `ui.js` | `at` and the `--px`, `--u` variables. Caption, prompt, title, ending, fade. The Node stub. Bevelled box for canvas chrome. UI colours from the live palette | K3 276-312. MU 762-763. HE 304-310. SW 1923-1932 | 130 |
| `audio.js` | `init`, `resume`, `setMuted`, `tone`, `noise`, a looped-bed helper for wind and drones | K3 194-253. SR 350-354. SW 1261 | 70 |
| `app.js` | `boot`, `resize`, the frame loop with the 12 ms fallback, tap, swipe, keys, whole-pixel scale, reduced motion, Node exports | K3 313-388. MU 779-786. SO 929-943 | 110 |
| `testing/` | `shoot.js`, `png.js`, `sheet.py`, `dom_smoke.js` moved as they are (91 lines; all four copies in `pieces/reachbound-muster/scripts` are byte-identical). New: a baseline runner that hashes frames and compares them with a stored list, and a scan for unpainted pixels | `scripts/` in the skill | 170 |

Total: about 1,470 lines of engine and 170 of testing, against the ROADMAP target of under 2,500.

Left in the pieces, because only one piece uses them: Muster chrome, icons and thumbnails (MU 588-646), `drawFish`, `drawLoaf`, Kolobok's `drawBall` and `shadowAt` (K2 289-446), SR's terrain and rays, HE's raymarched bust and icons, SW's cinematics and dialogue (1308-1464). SR's float value buffer is a way of working, not a function; it becomes an option when a scene needs fog and rays. The ROADMAP puts dialogue and game states in Phase 4.

What the ports lose, counted from line ranges: MU about 205 of 820 lines (11-163, 698-724, 740, 790-814). RB the same 205 of 952. Kolobok roughly 400 of 1,569. These are estimates.

## 5. Order of extraction, and how to prove nothing changed

### The proof, tested

The protocol that was run for this map: load the piece in Node, replace `Math.random` with `mulberry32(7)` before loading, `init()`, `setH(h)`, `setOut(buffer)`, `update(1/30)` until t = 2 and t = 6, `render` once at each, then SHA-1 of the raw Uint32 buffer.

The details that change the numbers:

- Time is summed in steps of 1/30 with the `shoot.js` loop: 60 steps, one `render(G.t)`, 120 more steps, one `render(G.t)`.
- FT has no `setH`. HE is run at height 568.
- SO has no `init` or `update`. One scene object is made, and `frame(t, out)` is called once at each sample with the summed time (2.0000000000000027 and 5.9999999999999885). Called with exactly 6, the tower and the city give other hashes (7bf889a475 and 04296470ac), because their animation reads `floor` of a multiple of `t`.

| Piece | Size | Two plain runs | Two seeded runs | Seeded hashes (t = 2, t = 6) |
| --- | --- | --- | --- | --- |
| SW, title | 216 x 384 | t = 2 same, t = 6 differs | Same | 9bb9bf42a9, 2027a15933 |
| Kolobok, title | 216 x 384 | Same | Same | c48f863776, 598d28b051 |
| MU, pebble | 216 x 384 | Same | Same | 082826c327, 5a579cf311 |
| RB, pebble | 216 x 384 | Same | Same | 937cbf9a2a, 659f6d91a6 |
| SR | 216 x 384 | Differs | Same | ee26e92c4d, 1cf3aaeb22 |
| VG, camp upgraded | 216 x 384 | Same | Same | 478bb0ebb9, b82fc73226 |
| HE | 320 x 568 | Same | Same | 43065147d0, 18f63cc15c |
| FT, card 1 | 320 x 400 | Same | Same | da37225415, 30b84ed0af |
| SO tower | 216 x 216 | Same | Same | d8e2c316da, 5a82dcb1ff |
| SO city | 216 x 216 | Same | Same | f1b308de38, f14972767a |
| SO wolf | 216 x 216 | Same | Same | 69667a5a0a, 66eba89765 |

So a seeded `Math.random` and a fixed call pattern give repeatable frames for all eleven scenes. Without the seed, SW and SR are not repeatable. The hashes are the first ten hex digits and depend on this exact protocol.

The second pass got the same value for 21 of the 22 hashes. SR at t = 6 was first written down as e5110e5db2. That value only comes out when `render` is called twice at t = 2, which breaks the "render once" rule above. It is the second trap in the list below, and this table fell into it. The value now in the table is the one the stated protocol gives, twice in a row.

Traps the harness must handle:

- **`Math.random` in the simulation:** SW (50 calls on 27 lines, 3 of them in the audio), K2 (13 calls on 8 lines: bursts, crow scatter), K3 88 and 171 (the song and caw timers), MU 677 and RB 807 (the hunter's blink timer), SR (15 calls on 9 lines, plus 3 in the audio), SO 909. Kolobok and the Muster matched unseeded only because the tested state does not reach those calls (counted: Kolobok, MU and RB make no call at all up to t = 6).
- **State changed inside `render`:** SR (`skyTick` 79, `rayTick` 193, `drawMotes` 292-298) gave different pixels on a second render of the same moment. MU `drawLoaf` 534-543 advances roll and flour per render, so its speed depends on the frame rate (study). The harness must call `render` the same number of times in every run.
- **Float order:** a rewritten formula can flip a pixel that sits on a dither threshold. One test rewrote the Muster's glow term in an equal form: 0 of 58,212 sky pixels changed in four skies. That is one test. The hashes are the proof, not this.
- **Unpainted pixels:** the horizon gaps in MU and RB show the UI's darkest colour. Fixing them changes hashes, so fix them as a named change after the port passes.

### The order

0. **`testing/` first.** Nothing else moves until baselines exist. Fix `shoot.js` in the same step: arguments for `--call`, a `--seed`, an option to render every step, a default height per piece. Record every scene and portrait (MU 6, RB 9, VG 3 in two modes, FT 13, SO 3), idle and one action, at two heights and two times: roughly 150 hashes, a few seconds to run. Keep a PNG beside each hash so a mismatch can be looked at.
1. **`core.js`, the identical maths.** `clamp`, `lerp`, `smooth`, `mulberry32`, `hash2`, `vnoise`, `fbm`, `BAYER`, `dith`, `ci`, `hexc`. No risk: the outputs are proven equal. Delete each piece's copy and run the hashes. Souls keeps its own `fbm`.
2. **`core.js`, the palette.** The Muster's block builder and `buildPal`, unchanged. Check MU and RB.
3. **`sprite.js`.** `sprite`, `rimLit`, `stamp`, `put`, `line` from MU, unchanged except that width and height become arguments. Check MU and RB.
4. **`paint.js`.** `genRidge`, `paintSky`, `paintDisc`, `paintClouds`, `fillBelow`, `mirror` from MU, same rule. Check MU and RB.
5. **`ui.js`, `audio.js`, `app.js`** from K3 and MU. Frame hashes cannot see these. The proof is `dom_smoke.js` with zero errors and every button clicked, then a real browser and a real phone. Sound has to be listened to.
6. **Port the Muster** (ROADMAP Phase 2). Pass: all MU hashes match, median frame time no worse than today's 0.11-0.69 ms, and the piece is shorter. Then run RB on the same engine as a free second check.
7. **`ground.js` and `fx.js` from Kolobok**, plus `stampZ`, Kolobok's cloud shading and `skyValue`. Port Kolobok. Pass: title, bell burst (17.6 s) and coated loaf (`coatAll`) match with the seed. Frame time no worse than 1.8-2.0 ms idle and 3.3-3.5 ms floured.
8. **Only now widen the helpers:** sky arguments, the cloud density split, SW's water, the rim mask, palette blend and slide. After each one the MU and Kolobok hashes must still match. Each look change (new Muster clouds, dash glints, snapped flat fills, the horizon fix) is a separate named difference with before and after frames for Farhad.
9. **Still Water's parts** (`computeWater`, the mood palette, `stampR`, `glowTint`, `tween`) when the first game needs them (Phase 4).

Why unchanged first: the ROADMAP says the engine must reproduce the examples pixel for pixel before anything new goes in. If code is moved and improved in one step, a hash mismatch cannot be explained.

## 6. Risks and open decisions for Farhad

1. Is 320 wide (Hero, Field Tips, 4:5 cards) an engine size, or does the engine stay 216 and those two stay outside it?
2. Does the engine support material ramps (Hero 64 colours, Field Tips 40-55 a card), or enforce one 12-step ramp plus accents per scene as in Still Water?
3. The ROADMAP wants no build step and one HTML file: join engine files with the existing `build.py`, or use module imports while developing?
4. After the Muster port matches, may its clouds, dot glitter and horizon gaps be replaced with the better versions (new frames for approval)?
5. `ui.js`, `audio.js` and `app.js` cannot be proven by frame hashes, and no study tested sound, touch or a real phone: he has to try them on his phone.

## 7. What is weak or untested in this map

- The merged helpers proposed here do not exist: the widened `paintSky`, cloud density with shading callbacks, `mirrorWater` with dials, the rim mask, the particle pool, blend and slide on palette blocks. Nothing yet proves that one function can reproduce Muster, Kolobok and Still Water pixels. Step 8 finds out.
- "Same output" was tested for the ten small helpers, for `genRidge` (one point list) and for `sprite` (one sprite). Sky, clouds and water were compared by reading the code, not by running it.
- Speed of the general helpers is not measured. Passing width and height in place of constants may slow hot loops; the skill's rules prefer constants.
- The baseline hashes cover one state per piece at one height. Play states, other portraits and cards, and the tall height were not hashed.
- Line estimates for the engine files, and for what the ports lose, are estimates.
- Sound was not heard and no page was opened in a browser for this map. Only Node was used.
- Judgments of looks are the studies' judgments. One sheet of baseline frames was opened to check the harness, nothing more.
- The phrases quoted from the studies were not checked. The study reports are not saved in the repo, and `COOKBOOK.md` and `art/technique-library.md` give their verdicts in other words. The numbers taken from the studies (frame times, deopt counts, colour counts) were spot-checked against those two files, not measured again.
- The float-order test (0 of 58,212 pixels) was not run again in the second pass.
- Names to fix on the way in: `mirror` (sprite flip in K1, water in MU), `TW` (tween list in SW, texture width in K1 and MU), `buildPal` and `buildPalette` (three argument lists in six copies), `stamp` (three argument lists under that name, seven across the stamp family), `genStone` and `genElder`, `ci` and `r12`, `.data` and `.d`.
