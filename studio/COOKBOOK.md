# Cookbook

How each piece in this repo was built: what it is, the techniques in plain words, what went wrong and the fix.
Earlier pieces (Still Water, Kolobok, Muster, Souls scenes) are in `.claude/skills/pixel-scenes/examples/`.

## Phase 0: how these entries were made

Nine existing pieces were rendered headless and looked at on 2 October 2026 (`ROADMAP.md`, Phase 0, step 2).
Each has named frames and a contact sheet in `art/frames/<piece>/` (`sheet.png`).

- Frame times: Node 24 on Farhad's laptop, `shoot.js --fps-test` (300 frames of update + render). The house target is under 4 ms median (`SKILL.md`, workflow step 5).
- Not tested for any piece: a real phone, touch input, sound (Node has no audio).
- Line numbers come from the studies and point into the file named in each section.
- Every bash block and wrapper below was run again, exactly as written, in a fresh temp folder as a check: 85 frames written, no errors. All were opened on contact sheets. The Still Water frame at t=2.0 came out byte-identical to `art/frames/still-water/gold_boat_day.png`.
- "Check" numbers are frame times from that pass, two or three runs each, one piece at a time. Most came out higher than the studies' numbers, by up to about 40%. The laptop was running other jobs, so read them as the slow end. The verdicts against 4 ms hold, but two cases now sit on the line: Still Water at H=384 and Kolobok with a floured loaf.
- The Edge command was run again once, on `muster.html`. It worked as written and the text is sharp.

Setup for every command below (Git Bash). Temp files go in a temp folder, never in the studio.

```bash
ST="C:/Users/farha/Verdant Reach/studio"
export SK="$ST/.claude/skills/pixel-scenes"
SHOOT="$SK/scripts/shoot.js"
T="$(mktemp -d)"; cd "$T"
```

Three limits of `scripts/shoot.js` the studies hit:

- `--call name@time` passes no arguments. `select(2)` or `tap(150,250)` need a wrapper or the driver below.
- It renders only at the shot times. Pieces that advance state inside `render` (the Muster's `drawLoaf`) need a render every step.
- The default height is 384. Hero of the Reach needs `--h 568`.

A step driver for those cases. Save it as `drive.js` in the temp folder.

```js
// drive.js: step a piece at a fixed rate, render EVERY step, run calls that need arguments, save PNGs at 3x.
// node drive.js <game.js> <outdir> <height> <fps> "<time>:<js using M>;..." <shot times>
const fs = require('fs'), path = require('path');
const { encode } = require(process.env.SK + '/scripts/png.js');
const [file, outDir, h, fps, doStr, atStr] = process.argv.slice(2);
const M = require(path.resolve(file));
const calls = doStr.split(';').filter(Boolean).map(s => {
  const i = s.indexOf(':'); return { t: +s.slice(0, i), fn: new Function('M', s.slice(i + 1)), done: false };
});
fs.mkdirSync(outDir, { recursive: true });
M.init(); if (M.setH) M.setH(+h);
const out = new Uint32Array(M.W * M.H); M.setOut(out);
const dt = 1 / +fps; let t = 0;
for (const at of atStr.split(',').map(Number).sort((a, b) => a - b)) {
  while (t < at - 1e-6) {
    for (const c of calls) if (!c.done && t >= c.t) { c.done = true; c.fn(M); }
    M.update(dt); t += dt; M.render(M.G.t);
  }
  if (t === 0) M.render(M.G.t);
  const name = path.join(outDir, 'frame_' + at.toFixed(2) + 's.png');
  fs.writeFileSync(name, encode(out, M.W, M.H, 3)); console.log('wrote', name);
}
```

The real page with its HTML text (PowerShell, headless Edge). This is the command the studies used.

```powershell
$p = Start-Process -FilePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--headless=new","--disable-gpu","--hide-scrollbars","--user-data-dir=<a fresh temp dir>","--window-size=648,1152","--virtual-time-budget=4000","--screenshot=<out.png>","file:///<page path, spaces written as %20>" -PassThru -WindowStyle Hidden; $p | Wait-Process -Timeout 45
```

- A 432 px wide window comes out cropped on the right. Headless Edge will not lay out that narrow. Use 648x1152.
- Pages that fade in with CSS come out dark (Still Water, Kolobok). See those sections.
- Contact sheet: `python "$SK/scripts/sheet.py" sheet.png a.png b.png ...`. Crops: Pillow `crop`, then `resize` with `Image.NEAREST`.

## Still Water

**What it is.** The fishing tale on the lake: a boat, a fisher, a wish-granting gold fish, a red sun, three endings. This is the quality bar. File: `.claude/skills/pixel-scenes/examples/still-water/still-water.html` (2039 lines, script on lines 202 to 2036).

**How it is built.** One IIFE draws a 216 px wide canvas (384 to 470 tall) as palette indices. The horizon is fixed at y=236. `init()` bakes three things once: the clouds (`genClouds`), the mountains (`genMountains`) and the star positions, plus the sprites. Each frame `render()` rebuilds a 24-colour palette from two numbers (`buildPalette(mood, dim)`). Then it recomputes the whole sky above the horizon (`renderTop`: gradient, sun glow, horizon band, sun disc, clouds re-lit by the glow, baked mountains copied in). It stamps stars, birds, the cabin and the sun's stalk (`topExtras`). It mirrors all of that into the water with ripple, darkening, streaks and glitter (`computeWater`). Boat, bobber, fish and line go into a separate sprite layer where every pixel also plots its own reflection (`plotR`, `stampR`). Last, indices become colours and the warm lantern glow is blended in RGB (`glowTint`). Every look setting is a number on one object `WS` (about 25 fields: mood, dim, sunY, sunKind, pupil, stalk, troubled, starA, lantern, jaw and more). Tweens and five scripted cinematics (`playCine` with `CINE_SUNSET`, `CINE_RED`, `CINE_JAWS`, `CINE_DARK`, `CINE_CUT`) only move those numbers. Palette slots 0 to 11 are the mood ramp, 12 to 23 are accents. Text, dialogue and endings are HTML in Pixelify Sans, recoloured from the live palette. Sound is synthesised WebAudio. There is no camera move, no parallax and no 3D geometry. Clouds and mountains never move.

**Render.**

```bash
sed -n '202,2036p' "$SK/examples/still-water/still-water.html" > still-water.js
node "$SHOOT" still-water.js --h 384 --at 2,6 --scale 3 --out sw_shots --fps-test   # frame_2.00s.png is the reference frame
```

Any other look without playing the story: set `WS` fields and render one frame. Save as `sw_poke.js`.

```js
const { encode } = require(process.env.SK + '/scripts/png.js');
const M = require('./still-water.js');
M.init(); M.setH(384);
const out = new Uint32Array(M.W * M.H); M.setOut(out);
for (let i = 0; i < 60; i++) M.update(1 / 30);
Object.assign(M.WS, JSON.parse(process.argv[2] || '{}'));
M.render(M.G.t);
require('fs').writeFileSync(process.argv[3] || 'poke.png', encode(out, M.W, M.H, 3));
```

```bash
node sw_poke.js '{"mood":1,"starA":1,"lantern":1,"sunGlow":0.12,"sunY":250}' night_lantern.png
node sw_poke.js '{"mood":2,"sunKind":1,"sunR":16,"pupil":1,"stalk":1,"troubled":0.55}' red_sun_pupil.png   # sunR 16 is the red sun in CINE_RED; the default 8 gives a small disc
```

The study reached the real story states with a temp auto-player (not kept). It seeded `Math.random`, called `press()` on 'ready', 'bite' and 'card', held and released while 'reeling', and called the stored choice callbacks (`UI.choices[i].cb()`) in dialogs. Three runs reached all three endings. `playCine` is not exported, so a cinematic can only be reached by playing to it or by setting `WS` by hand.
Real page: Edge at 648x1152 froze mid-fade. The saved screenshot is from a temp copy with one added CSS line: `#fade{display:none !important} #title{opacity:1 !important; transition:none !important}`.

**Frame time.** H=384, day: median 3.1 to 3.55 ms, p95 4.2 to 5.0 (check: median 3.83, 4.40 and 5.87, p95 5.15 to 9.46). H=470: median 4.5, p95 6.3, just over the target (check: median 4.95 and 5.58). By mood at 384: night with lantern 2.96, red sun with ash 4.12, jaws at 50% 5.54. In day, `renderTop` costs about 1.6 ms and `computeWater` about 1.2 ms. One-time bake: `genClouds` 30 ms, `genMountains` 4 ms.

**Three strongest techniques.**

1. `buildPalette(mood, dim)` with `RAMP` and `ACC`. Three 12-colour ramps (day, night, blood) are crossfaded by one number. The scene's indices never change, only the palette. The half-way palettes (mauve at 21%, rose-wine at 61%) are as good as the end points. `dim` slides the ramp toward black while the accents stay lit, so the lantern and the fish are the last things glowing.
2. `computeWater` with `plotR` and `stampR`. A mirror of the sky with ripple that grows toward the viewer, a bright 1 px waterline, sliding streaks and a narrow glitter cone. One dial, `WS.troubled`, makes the whole lake uneasy. Anything drawn above the horizon is mirrored for free.
3. `WS` with `tween` and `playCine`. The look is about 25 numbers, and a cinematic is a short timeline over them. This is the seed for the engine's scene description.

Also worth keeping: `glowTint` (the night lantern halo) and the 1 px stalk in `topExtras` that turns the sun into bait.

**What is weak.**

- Clouds never move. Only their brightness changes (`renderTop`, `CLOUD[i] + g*0.55`). No forest, no weather.
- Sprites have no rim light. `FISHER` and the hull from `makeBoat` are flat index 0. `rimLit` came later, in the Muster.
- The day ramp is one blue with almost no hue shift. The reference frame breaks rule 1 as written. Clean value steps and composition carry it.
- `drawFang` draws the fangs as code cones with flat bases, and the jaw fold in `composite` shows hard seams. The "Home" ending is below the rest of the piece.
- Thin reflections (rod, lantern post) break into a squiggle. Accent sprites reflect at full strength, so the gold fish reads as two fish.
- Water dither is per row, not per band edge. Reflected clouds get whole rows of checker.
- At sunset the sun's rim inside saturated glow reads as a hollow ring, and the horizon glow clips to flat white.
- Ash specks stay on screen after the "Cut" ending (`updAsh`). Fish shadows and the bite "!" are too faint to notice.
- Speed habits predate the house rules: sky recomputed every frame, `WS` read inside pixel loops, the palette loop inside `render` (70 deopt lines), no frame skip, unseeded `Math.random`.
- Untested: sound, the dialog, card and ending overlays in a browser, any height other than 384.

## Kolobok

**What it is.** A playable dusk scene: an invisible giant loaf rolls through a wheat valley and only thrown flour shows it. Files: `.claude/skills/pixel-scenes/examples/kolobok/` (`1_engine.js`, `2_sim_render.js`, `3_story_ui.js`, joined by `build.py` into `kolobok.html`).

**How it is built.** One IIFE in three parts. A 216 x 384 to 470 index buffer is mapped through a 17-colour palette (12-step dusk ramp, 4 flour accents, 1 mint) at the end of `render`. Built once in `init()`: the whole sky above the horizon row 170 (`skyValue` gradient, sun disc, `genClouds`, two ridges from `genRidge`, the mill body), baked into one buffer. Built once per screen height in `setH()`: a perspective ground table (`genGround`) that gives every ground pixel its world X/Z, base value, surface type, wind phase and track-grid cell, plus the foreground hilltop (`genForeground`, `genStone`, `genPebble`). Each frame, in order: copy the sky, draw the mill blades, run `renderGround` over every ground pixel (wind, tracks, dust, lake rows, the loaf's shadow), clear a float depth buffer, ray-trace the flour on the invisible sphere (`drawBall`), then draw the pole, burst clouds, particles, crows and sack with a depth test, then the foreground with blinking eyes. The simulation is real 3D on a flat plane: the loaf follows a closed spline (`buildPath`), rolls with a 3x3 rotation matrix, stamps a fading track into a 280x394 world grid (`stampTrail`) and carries a 128x64 flour texture in its own frame (`deposit`). Input is one tap. Text is HTML in Pixelify Sans. Sound is synthesised and follows the loaf's distance.

**Render.**

```bash
python -c "import re,pathlib,sys; h=pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'); pathlib.Path(sys.argv[2]).write_text(re.search(r'<script>\n(.*)</script>',h,re.S).group(1),encoding='utf-8',newline='\n')" "$SK/examples/kolobok/kolobok.html" kolobok_game.js
# empty valley, bell burst, revealed loaf, sack hit, flour being drunk (begin() starts play; the loaf hits the flour bell at 17.47 s)
node "$SHOOT" kolobok_game.js --h 384 --scale 3 --out run1 --at 0,10,17.6,18.6,19.9,20.5,21.5,23,26 --call begin@1,aimAtLoaf@19.5
# fully coated loaf
node "$SHOOT" kolobok_game.js --h 384 --scale 3 --out run2 --at 13,15.5 --call begin@1,coatAll@12.6
# tall phone
node "$SHOOT" kolobok_game.js --h 470 --scale 3 --out run3 --at 0,21.5 --call begin@1,aimAtLoaf@19.5
# a miss: tap(x,y) needs the driver
node drive.js kolobok_game.js miss 384 30 "1:M.begin();5:M.tap(150,250)" 5.35,5.9,7.2
# speed, idle and with a floured loaf
node "$SHOOT" kolobok_game.js --h 384 --scale 1 --out fps --at 0 --fps-test
node "$SHOOT" kolobok_game.js --h 384 --scale 1 --out fps --at 17.5 --call begin@1,coatAll@17 --fps-test
```

Bursts, particles and crow scatter use `Math.random`, so floured frames differ a little between runs. Check: the frames at 0 and 10 s repeated byte for byte, the floured frame at 21.5 s did not.
Real page: Edge needs `--window-size=540,960`. `--virtual-time-budget` does not advance the CSS fade, so the capture is dim. The layout is visible but text contrast could not be judged.

**Frame time.** H=384 idle: median 1.8 to 2.0 ms, p95 2.8 to 3.5 (check: 1.59 to 1.64, p95 2.36 to 2.57). With a floured loaf near the camera: 3.3 to 3.5, p95 4.6 to 5.3 (check: 3.17 to 4.07, p95 4.73 to 6.19). H=470 floured: 4.65, p95 6.95, over the target. Hot functions deopt only during warm-up. The raw count (132 to 137) is almost all one-time loops in `genClouds` and `genGround`.

**Three strongest techniques.**

1. `drawBall` with `deposit`, `coatLoop` and `decayCov`. Each screen pixel is ray-tested against the sphere, and flour is looked up in a texture that turns with the roll. The flour thins in streaks and ends as a crescent with crows on top (frame `09_flour_being_drunk_t26.png`, the best frame in the piece).
2. `genGround` with the wind in `renderGround` (`GPH`, `fsin`). Every ground pixel is mapped once to world X/Z, so road, strips, tracks, dust and shadow all sit on one plane. Wind is a travelling sine from a lookup table and is the only landscape motion: 8% of pixels change per half second, all on the ground.
3. `stampTrail` and `fadeArray`. Tracks are stamped into a world grid and fade over 120 s. `init()` pre-rolls 80 s so the empty valley already has tracks. With the crows and `shadowAt`, these are the tells that sell an invisible thing.

Also worth keeping: `genStone` and `genPebble`. The stone elder and pebble folk are the best hand-made part.

**What is weak.**

- The sky is frozen. Clouds are baked and never drift (zero changed cloud pixels in the motion diff). Foreground grass is static too.
- The first 0.2 s of the bell burst (`drawBursts`) is a flat lilac blob with a hard white pill. It reads as a teapot (frame `03_flour_bell_bursts_t17.6.png`).
- A fully coated loaf reads as a moon or a pearl, not bread. The slashes are 1 px and rarely face the camera.
- A sack hit on an already floured loaf is white on white. The thrown sack is a 1 to 2 px dot. The player's own action has the weakest visual.
- `shadowAt` gives a flat hard-edged wedge with no soft edge. At full coat it covers about a quarter of the frame.
- The loaf's loop passes the mill, so the mill sits on the loaf like a hat in several frames.
- The near field (lower third, more at H=470) is flat dark purple with smeared noise. The lake is 4 rows and does not read as water.
- The upper sky has 8 to 12 px tall dither zones that read as knit bands. `genClouds` leaves orphan scraps.
- Growth from feeding is invisible (R 15 to about 17) and the leaving ending shows nothing.
- The canvas scale is not snapped to whole numbers, so pixels are uneven on most screens. `G.dim` is dead code that still runs each frame.
- Untested: sound, captions and endings as displayed, text contrast, the restart flow.

## Muster of the Reach (6 portraits)

**What it is.** A creature menu: six live portraits (pebble folk, stone elder, knight, fish, hunter, Kolobok) with stats and thumbnails. File: `.claude/skills/pixel-scenes/examples/muster/muster.js` (820 lines; `muster.html` is `shell.html` plus this file).

**How it is built.** One IIFE, no dependencies. The canvas is 216 wide and 384 to 470 tall. The portrait is a 198x124 window. Everything is an index buffer mapped through one 256-entry palette in which each scene owns a 16-slot block (`PALDEF`, `OFF`): 12 ramp colours plus up to 4 accents. `init()` runs each creature's build function once into its own static base buffer: `paintSky` toward a light, `paintClouds`, `paintDisc`, ridges from `genRidge` filled by `fillBelow`, ground, road. Each frame `render()` rebuilds the palette with a dim factor (`buildPal`), copies the prebuilt chrome (`genChrome`), copies the current base, and calls that creature's draw function for the moving parts only: `mirror` water, glitter, foam, wind bands, cloth, eyes, the rift, the dissolve, the flour sphere, crows. Then it blits six 28 px thumbnails (`genThumbs`) and maps indices to colours. All text is HTML placed in canvas-pixel units. State is one object `G`. Input: tap the portrait to act; arrows, thumbnails, swipe or keys change creature. Sound is WebAudio synthesis, one recipe per creature.

**Render.** `select` needs an index, so use this wrapper. Save as `muster_wrap.js`.

```js
const M = require('C:/Users/farha/Verdant Reach/studio/.claude/skills/pixel-scenes/examples/muster/muster.js');
const ex = { init: M.init, setH: M.setH, setOut: M.setOut, update: M.update, render: M.render, W: M.W, G: M.G, act: M.act };
Object.defineProperty(ex, 'H', { get() { return M.H; }, enumerable: true });
for (let i = 0; i < 6; i++) ex['sel' + i] = () => M.select(i);
module.exports = ex;
```

```bash
# idle portrait N: 0 pebble, 1 stone, 2 knight, 3 fish, 4 hunter, 5 loaf
node "$SHOOT" muster_wrap.js --call sel2@0 --at 3 --scale 3 --out idle_knight
# mid-action: act@3, then shoot at 3.3 (pebble), 3.25 (stone), 3.5 (knight, loaf), 3.2,3.33 (fish), 3.3,3.6,4.5 (hunter)
node "$SHOOT" muster_wrap.js --call sel5@0,act@3 --at 3.5 --scale 3 --out act_loaf
# speed for one portrait
node "$SHOOT" muster_wrap.js --call sel1@0 --at 1 --scale 1 --out fps --fps-test
# flour wearing off: drawLoaf advances inside render, so render every step at 60 fps
node drive.js "$SK/examples/muster/muster.js" flour 384 60 "0:M.select(5);3:M.act()" 3.1,4.7,5.5
```

Portrait-only crops: Pillow crop (27,72)-(621,444) of each 3x frame.
Real page with text: the Edge command above at 648x1152 on `muster.html` worked and the text is sharp (frame `20_page_edge_648x1152_pebble_with_text.png`).

**Frame time.** Per portrait, median / p95 in ms: pebble 0.24 / 0.54, stone 0.69 / 1.00 (check: 0.67 to 0.74 / 1.23 to 1.53), knight 0.18 / 0.38, fish 0.25 / 0.65, hunter 0.18 / 0.47, loaf unfloured 0.11 / 0.20, loaf floured 0.41 / 0.88 (check: 0.43 / 1.02 to 1.11). Far under the target. The stone elder is slowest because the wheat wind calls `vnoise` for 9,108 pixels every frame.

**Three strongest techniques.**

1. `paintSky(b, o, hz, L, top, bot, glow, band)`. A vertical gradient, two glow sizes around a light that is in frame, and a horizon band, all through `dith`. Stone, knight, fish and loaf skies are at the quality bar. Each scene just passes its own numbers.
2. `PALDEF` and `OFF` palette blocks. Seven ramps live in one palette, 16 slots each, and every draw function writes `o + index`. Six moods sit side by side in the thumbnail strip with no clash. A new portrait is a new ramp plus a short build recipe.
3. `genElder` and `drawLoaf`. The stone elder (polygon, `fbm` mottling, rim on the sun side, mint eyes, carved text) is the best character. The floured loaf (sphere shading through a coverage map, `COV` and `NT`) is the best subject and breaks up well as the flour wears off.

Also worth keeping: `rimLit` (automatic rim light on silhouettes), `drawHunter` and `drawTree` (Bayer dissolve, pose flip and a tree that grows a level per blink).

**What is weak.**

- Bug, measured: unpainted horizon pixels in three of six portraits. Stone 50 px on row 76, loaf 34 px on row 68, hunter 397 px on rows 88 to 91. `paintSky` stops at the horizon row and `fillBelow` starts at the ridge top, which sometimes lies lower. The holes show the UI ramp's darkest colour as black lines.
- `paintClouds` is the weakest element: small flat chips in every scene, and they never move. It dropped the fine noise, lit undersides and bright tops that Kolobok's `genClouds` has.
- Fish: the mouth is drawn one row below the waterline, so talking does not read. The bottom 8 water rows are a flat band because `mirror` runs out of sky.
- Subjects are small for a character screen: knight 21x29 px, hunter 22x37 px. `rimLit` also lights inner edges, so the knight gets wire legs.
- Dither as area fill where a flat value lands mid-step (knight far ridge at 4.6, the loaf road).
- Loaf: roll and flour decay advance inside `render`, so their speed depends on frame rate. The shadow is a hard trapezoid that pops off in one frame. The track is a hard-edged slab.
- Tap feedback for pebble folk and elder is 1 px and invisible in stills. The fade between creatures dims the chrome too, but not the HTML text.
- Tall screens only stretch the lore box. No parallax, weather or particles anywhere.
- Untested: sound, touch and swipe, `dom_smoke.js`, any browser other than headless Edge. The hunter's auto-blink uses `Math.random`.

## Reachbound Muster (9 portraits)

**What it is.** The Muster grown to nine creatures: it adds the Loaf Crows, the Collector and the Projection. File: `pieces/reachbound-muster/src/reachbound.js` (952 lines), built by `build.py` into `reachbound-muster.html`.

**How it is built.** One IIFE plus `shell.html`. The same renderer as the 6-portrait Muster: a 216 x 384 to 470 index buffer mapped through a 256-entry palette, now ten 16-slot blocks (ui plus nine scenes). Each creature has a static 198x124 portrait buffer built once in `init()` by its `build*(b, o)` function (`paintSky`, `paintClouds`, `paintDisc`, `genRidge` with `fillBelow`, a ground formula, sometimes a stamped sprite). Its `draw*(b, o, t, st)` function runs every frame on a copy of that buffer and adds only what moves. There is one flat layer stack per portrait: no parallax, no camera, no cloud motion. Chrome is generated once per screen height (`genChrome`). Thumbnails are 28x28 copies made once (`genThumbs`); the strip shows six of nine and scrolls with the selection (`rosterStart`). Text is HTML in Pixelify Sans placed by `UI.layout`. A tap calls `act()` (a 1.6 s talk timer that each draw function reads). Compared with `muster.js` the change is small: three palette blocks, three build and draw pairs (about 120 lines), three roster entries, a thumbnail-centre table and the scrolling strip. Every shared helper is byte-identical to `muster.js`.

**Render.** The README command runs but only ever shows Pebble Folk, because `--call select@0` passes no argument and `select(undefined)` does nothing:

```bash
(cd "$ST/pieces/reachbound-muster" && node scripts/shoot.js src/reachbound.js --at 1,3 --call select@0 --scale 3 --out "$T/readme_shots" --fps-test)
```

To reach all nine, save this as `reachbound_wrap.js`. It also pins the Hunter's random auto-blink.

```js
const M = require('C:/Users/farha/Verdant Reach/studio/pieces/reachbound-muster/src/reachbound.js');
const ex = { init: M.init, setH: M.setH, setOut: M.setOut, update(dt) { M.G.blinkT = 99; M.update(dt); }, render: M.render, W: M.W, G: M.G, act: M.act };
Object.defineProperty(ex, 'H', { get() { return M.H; }, enumerable: true });
M.CREATURES.forEach((c, i) => { ex['sel_' + c.key] = () => M.select(i); });
module.exports = ex;
```

```bash
# keys: pebble crows stone knight collector fish proj hunter loaf
node "$SHOOT" reachbound_wrap.js --call sel_proj@0 --at 3 --scale 3 --out proj --fps-test
node "$SHOOT" reachbound_wrap.js --call sel_collector@0,act@3 --at 3.3 --scale 3 --out collector_act
# hunter blink and loaf flour need a render every step (hunter is index 7, the loaf is index 8)
node drive.js "$ST/pieces/reachbound-muster/src/reachbound.js" hunter 384 60 "0:M.select(7);3:M.act()" 3.3,3.6,4.5
```

Portrait-only crops: Pillow crop (27,72)-(621,444) of each 3x frame. Real page with text: Edge at 648x1152 with `--force-device-scale-factor=1` added, on `reachbound-muster.html`. Only Pebble Folk was captured that way.

**Frame time.** Per portrait, median in ms: pebble 0.13, crows 0.12, stone 0.54 to 0.64 (check: 0.53 to 0.66), knight 0.10 to 0.14, collector 0.28 to 0.30, fish 0.21 to 0.29, projection 0.13 to 0.14 (check: 0.18 to 0.26), hunter 0.10 to 0.11, loaf floured 0.39 to 0.40. All nine pooled: median 0.18, p95 0.68. About ten times under the target. One-time cost: `init()` 145 ms, because `paintClouds` tests every puff for every pixel of nine portraits.

**Three strongest techniques.**

1. The add-a-creature recipe: a ramp in `PALDEF`, a `build*` and a `draw*` function, a `CREATURES` entry. Three creatures were added in about 120 lines without touching any shared helper. This is the engine's scene format in embryo.
2. `paintSky`. Still the best-looking element in every frame. The crows' dusk sky and the stone elder's sky are top grade.
3. `drawLoaf` flour dissolve (`COV`, `NT`) and `drawHunter` with `drawTree`. The flour breaks into continents with dithered edges. The hunter dissolves through the rift and the tree grows a stage per blink. Small state changes tell the story.

Also worth keeping: the hand-drawn `CROW_BIG` sprite (15x11, blue wing patch, cream eye). It reads as a crow at phone size.

**What is weak.**

- Bug, counted in the buffers: unpainted horizon rows in 5 of 9 portraits (crows 45 px, stone 50, loaf 34, collector 196, hunter 397). Same cause as in the Muster; the two new sky scenes copied it. In the crows and stone scenes the black line runs through the sun glow.
- The Projection (`buildProj`, `drawProj`) is below the bar. The cave has no light falloff and uses only the bottom half of its ramp. The knight sprite is reused at 2x, so pixel sizes are mixed. Solid rim pixels defeat the see-through effect. The necromancer is an invisible code-drawn trapezoid.
- The Collector (`buildCollector`, `drawCollector`) breaks the piece's own rules. The lantern pool is a flat orange disc with a wide checker halo, the arch is drawn by code, stars land on the masonry, and the figure is not lit by its own lantern.
- Loaf Crows: nothing hints at the loaf's shape, the pressed ellipse reads as a pond, and the crows have no rim light and share one pose.
- `paintClouds` is still flat chips and static. The glitter path is random dots in a cone, which the README itself calls the Christmas-tree look.
- `genThumbs` drops every second pixel, so the pebble, projection and collector thumbnails turn to mush.
- Flour decay and ball roll are per frame, not per second (twice as fast at 120 Hz). The three new creatures reuse unrelated sounds.
- The documented loop cannot photograph any portrait but the first. The three new portraits show signs of not having been looked at closely.
- Untested: sound, a phone, the palette fade between creatures, the real page for any creature but Pebble Folk.

## The Summit Road

**What it is.** The cursed warrior walking an endless terraced road toward a peak crowned with green lightning. File: `.claude/skills/pixel-scenes/examples/summit-road/summit.js` (408 lines).

**How it is built.** One IIFE, canvas 216 x 384 to 470. Nothing is a static layer. Every frame rebuilds a float buffer `VAL` (a continuous ramp value per pixel) and a mask `OCC` (1 where the sky is open). Order in `render()`: build the palette with the current flash (`buildPal`); write sky, storm banks and the 2D-painted summit spire into `VAL` (`buildSky`, cached and redone every third frame); draw voxel-space terrain and the cloud sea front to back per column, with depth fog blended in ramp space (`renderTerrain`); draw the relic swords as scaled billboards (`drawRelics`); add god rays from a half-resolution radial blur of `OCC` (`renderRays`, redone every other frame); then one dither pass turns `VAL` into ramp indices 0 to 11. After that come overlays in index space that skip the lighting: motes, the walker sprite with its palette-cycled blade (`drawWalker`), and lightning bolts in accent colours (`drawBolts`). Last, indices map through a 16-entry palette: one cold 12-step ramp plus 4 green accents. The camera slides forward 1.1 units a second. The walker is pinned to one screen spot. One input: tap fires a big strike and shows the next caption. Text is HTML. Sound is filtered noise for wind and thunder plus a three-sine drone.

**Render.** Straight from the piece. Strikes are random because the piece uses unseeded `Math.random`:

```bash
node "$SHOOT" "$SK/examples/summit-road/summit.js" --h 384 --at 2,3.08 --scale 3 --out direct --call tap@0,tap@2.99 --fps-test
```

For frames that repeat, save this as `sr_wrap.js` (two runs gave byte-identical PNGs). `QUIET=1` stops the automatic strikes.

```js
let s = 7, quiet = false;
Math.random = () => { if (quiet) return 0.999; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const M = require('C:/Users/farha/Verdant Reach/studio/.claude/skills/pixel-scenes/examples/summit-road/summit.js');
const ex = Object.create(M);
ex.update = dt => { quiet = process.env.QUIET === '1'; M.update(dt); quiet = false; };
ex.big = () => M.strike(true);
module.exports = ex;
```

```bash
QUIET=1 node "$SHOOT" sr_wrap.js --h 384 --at 4,30,60 --scale 3 --out calm                      # calm, clouds moved
QUIET=1 node "$SHOOT" sr_wrap.js --h 384 --at 3.05,3.15,3.6 --scale 3 --out strike --call big@2.99   # bolt, fade, afterglow
QUIET=1 node "$SHOOT" sr_wrap.js --h 470 --at 4 --scale 3 --out tall
```

The study's diagnostic frames (rays off, rays only, fog off, the clear-sky mask) came from temp copies of `summit.js` with one line changed each, for example the line `renderRays(flash);` in `render` removed. Those copies were not kept.
Real page: Edge at 648x1152 with `--virtual-time-budget=9000` on `summit-road.html`. The title came out faint, possibly mid fade-in.

**Frame time.** H=384: median 7.8 to 8.2 ms, p95 11.8 to 13.9 (check: median 9.73 to 11.57, p95 14.44 to 18.43). H=470: median 9.0, p95 15.0. About twice the target. Average per stage at 384: `renderTerrain` 5.06 ms, god rays 2.29, sky 1.24, dither pass 0.63. The sky and ray rebuilds coincide every sixth frame, which is the p95. On a phone this will sit on the half-rate fallback.

**Three strongest techniques.**

1. The `VAL` buffer: lighting in ramp space, one `dith` at the end of `render`. Fog, glow, rays and flash are plain additions on a number, so stacked light can never leave the 12 colours. This is the part Farhad liked and the part to lift into the engine.
2. `renderRays` and `applyRays`. Each half-resolution cell takes 10 samples toward the crown and averages how much open sky it sees. With it off the sky is black and the spire is a flat triangle (frames `07_godrays_on_t60_clouds_near_crown.png` and `08_diag_godrays_off_t60.png`). It works as a glow that respects what blocks it, not as visible beams.
3. `strike`, `bolt`, `drawBolts` with `buildPal(flash)`. Midpoint-displaced bolts with branches, hidden one tick in three, and a palette lift of about 16% that is half gone in 0.14 s. The frame never washes out.

Also worth keeping: fog blended toward the sky's own horizon value (5.9) in `renderTerrain`, which gives a horizon with no seam; storm banks from scrolling tileable noise (`genNoise`, `nt`), the only clouds in the studio that change shape.

**What is weak.**

- The value range is crushed. In a calm frame 86% of pixels sit in ramp steps 4 to 6 and the top two colours are never used. The crown has no solid bright core, so the light looks dim.
- The flash lifts every layer evenly, so contrast falls during a strike. No rim from the bolt on walker, swords or road.
- God rays never form shafts and add nothing below the horizon. Nothing casts a shadow on the road.
- The walker (`WALK`) is 24 px tall with two real poses. His baked rim light is index 6, the same as the road, so it erases his head outline.
- `drawRelics`: the swords are code-drawn bars. The far ones knot together at the vanishing point right above the walker.
- Storm banks are an exact left-right mirror and read as an inkblot.
- The ground reads as a tiled 3D floor with two heavy kerb bars, and takes 60 to 68% of the frame. Rule 4 (big calm sky) is inverted.
- Large checker fields in sky and spire: shallow gradients keep whole areas inside the dither zone.
- Speed is twice the budget. The camera crawl makes it close to a still image between strikes.
- Dead code: flash terms inside `buildSky`, a term multiplied by 0 in `drawRelics`.
- Untested: sound, captions on screen, touch.

## Reach vignettes (old rules vs upgraded)

**What it is.** Three flat side-view scenes (knight's camp, castle at dusk, lake at dawn) with a toggle between the one-ramp rules and a warm/cool upgrade. File: `.claude/skills/pixel-scenes/examples/vignettes/index.html` (338 lines, script inline).

**How it is built.** Three draw functions (`drawCamp`, `drawCastle`, `drawLake`) share one index buffer (216 x 384 to 470) and one 128-slot palette. Each scene owns a 40-slot block: a 12-step cool ramp, an 8-step warm ramp, 2 accents, and the "old" single ramp made of cool steps 0 to 6 plus warm steps 3 to 7. Two router functions decide the look: `C(value)` writes a cool index and `Wm(value)` a warm one. In old mode both are remapped onto the single ramp, so the same scene code makes both versions, and upgrade-only extras sit behind `if (NEW)`. Nothing is cached. Every scene repaints sky, ridges, water and sprites from scratch each frame in back-to-front order, then `vignette()` runs over the whole buffer, then indices map through the palette. `buildPal` also runs every frame so a scene switch can fade the palette to black and back. Input: prev and next buttons, arrow keys, a toggle. Text is three HTML elements in Pixelify Sans. No sound, no clouds, no 3D.

**Render.**

```bash
python -c "import re,sys,pathlib; s=pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'); pathlib.Path(sys.argv[2]).write_text(re.search(r'<script>(.*?)</script>',s,re.S).group(1),encoding='utf-8',newline='\n')" "$SK/examples/vignettes/index.html" vig_game.js
```

Save as `vig_wrap.js`. Scene and mode come from env vars. `G.cur` is set directly to skip the 0.36 s fade.

```js
const M = require('./vig_game.js');
const scene = +(process.env.VIG_SCENE || 0), isNew = process.env.VIG_NEW !== '0';
module.exports = { init() { M.init(); M.setNew(isNew); M.G.cur = scene; }, setH: h => M.setH(h), setOut: b => M.setOut(b), update: dt => M.update(dt), render: t => M.render(t), G: M.G, W: M.W, get H() { return M.H; } };
```

```bash
# VIG_SCENE: 0 camp, 1 castle, 2 lake. VIG_NEW: 0 old rules, 1 upgraded.
VIG_SCENE=2 VIG_NEW=1 node "$SHOOT" vig_wrap.js --h 384 --at 0,2,5.5 --scale 3 --out lake_new --fps-test
VIG_SCENE=2 VIG_NEW=0 node "$SHOOT" vig_wrap.js --h 384 --at 2 --scale 3 --out lake_old
VIG_SCENE=1 VIG_NEW=1 node "$SHOOT" vig_wrap.js --h 470 --at 2 --scale 3 --out castle_tall
```

Real page: the Edge command at 432x768 on `index.html`. The text is readable but the right arrow is clipped, most likely the headless window quirk.

**Frame time.** Median / p95 in ms at H=384. Camp: old 4.94 / 7.15, upgraded 4.93 / 6.67 (check: 5.75 to 5.83 / 7.71 to 8.03). Castle: old 5.68 / 8.02, upgraded 6.39 / 8.28 (check: 6.71 to 7.66 / 8.60 to 10.49). Lake: old 2.33 / 3.30, upgraded 2.87 / 4.15 (check: 3.44 to 3.93 / 5.07 to 5.56). Camp and castle miss the target; only the lake passes. Deopt lines: camp 30, castle 126, lake 143. Not measured at H=470.

**Three strongest techniques.**

1. `C` / `Wm` routers with `buildPal`. One scene description renders under two colour policies and switches live. It is a ready-made A/B tool for tuning the look.
2. `layer()` in `drawCastle`. Each silhouette layer steps about two ramp indices toward the sky colour (7.4, 5.2, 3, 1.2), with a 1 px lighter crest. The old castle frame is an unreadable dark smear; the upgraded one reads at once. This is the biggest single gain in the piece.
3. `glints()`. Light on water as sparse horizontal dashes that widen with distance and reshuffle in a rolling order. The old single-colour version on the lake is the cleanest sun path in the studio.

Also worth keeping: the light pool in `drawCamp` (a 2:1 ground ellipse, noise on the distance, flicker on the radius, stepped levels, dithered rim) and `rims()` (warm and cool rim from two lights in one pass).

**What is weak.**

- His cookbook note is confirmed: the OLD lake is the stronger image. Clean full-width orange bands beat the upgraded version's small ellipse ringed with orange dots on blue-grey.
- The warm/cool handover (`warm > 0.08 + Bayer*0.5`) is whole-area dither between two colours that do not blend. It breaks rule 2 on the lake and castle skies.
- The upgraded camp loses its flames: the light pool's core uses the same top warm steps as the fire.
- The light source is hidden in two of three scenes. The lake's sun disc is behind a hill and the castle's glow centre is below the far ridge.
- Bug: lake water rows whose mirror source is above the frame fall back to flat `C(2)`. This is a lighter strip of 24 rows at H=384 and a 110-row slab at H=470.
- Bug: `drawCamp` never writes 277 pixels along the river bank, so they keep whatever the previous scene left (frame `camp_upgraded_after_castle_stale_bank.png`).
- Bug: the lake shore highlight is a box test on x and leaves two vertical seams in the right hill.
- Full-area dither from fractional fill constants (castle far ridge 7.4, lake hills 3.6).
- Nothing is cached, which is why two simple scenes miss 4 ms. Not a pattern to copy.
- The tent is a code triangle and reads as an orange wedge. The castle is drawn at 2x pixel size beside 1 px scenery. Reeds, branch, vignette, mist and parallax (a 52 s swing of 1 to 3 px) are close to invisible.
- The old versions are partly strawmen (near-identical layer values, no motion), so the comparison overstates what the colour split buys.
- No clouds, no wind in trees, no sound. Nothing here tests cloud or forest movement.
- Untested: the palette fade on scene change, a real phone layout, H=470 frame times.

## Souls scenes (tower, city, wolf)

**What it is.** Three static-camera remakes of his Souls pixel-art posts. Farhad judged them below the Still Water bar. File: `.claude/skills/pixel-scenes/examples/souls/souls-scenes.html` (script 1 on lines 59 to 924). The scenes are 216x216. The entry in `docs/cookbook-claude-ai.md` (288x288, sphere-lit puffs, lookup-table fog) describes an older build.

**How it is built.** One HTML file, two inline scripts, no build step. Script 1 is an IIFE of shared helpers plus three scene factories (`sceneTower`, `sceneCity`, `sceneWolf`). Each factory bakes everything static into 216x216 index layers when called (sky, clouds, foreground silhouettes; the wolf uses one `BASE` buffer plus a `DEP` depth-tag buffer) and returns `{ W, H, frame(t, out) }`. `frame()` composites the layers front to back per pixel, adds the few moving things, and maps indices through a per-scene palette. Moving things: tower has a scrolling tileable cloud sea, window flicker, 14 embers, 3 birds and a cloak flap; city has a mirror river, two light beams, window flicker and 3 birds; wolf has two scrolling mist layers applied as fog by depth tag, 26 motes and a 1 px eye blink. Palettes are a 15 or 16-step main ramp plus separate accent groups (tower 25 colours, city 29, wolf 21). Script 2 is the page: it builds a scene only when it scrolls near view, snaps the scale to whole numbers and caps at 30 fps. No input, no sound, no text over the canvas. About 130 lines are dead code from the older version. It does not follow the house file pattern (no `init`/`setH`/`update`/`render` exports, fixed square).

**Render.**

```bash
sed -n '59,924p' "$SK/examples/souls/souls-scenes.html" > souls-core.js
```

Save as `souls_wrap.js`. `update()` also calls `frame()` so embers and motes advance between shots.

```js
const A = require('./souls-core.js');
const name = process.env.SOULS_SCENE || 'wolf', SIM = process.env.SOULS_SIM !== '0';
let scene, out, scratch; const G = { t: 0 };
module.exports = { init() { scene = A.SCENES[name](); scratch = new Uint32Array(216 * 216); }, setH() {}, setOut(o) { out = o; },
  update(dt) { G.t += dt; if (SIM) scene.frame(G.t, scratch); }, render(t) { scene.frame(t, out); }, G, W: 216, get H() { return 216; } };
```

```bash
for s in tower city wolf; do SOULS_SCENE=$s node "$SHOOT" souls_wrap.js --h 216 --at 0,4,12,30 --scale 3 --out "shots_$s"; done
for s in tower city wolf; do SOULS_SCENE=$s SOULS_SIM=0 node "$SHOOT" souls_wrap.js --h 216 --at 0 --scale 1 --out fps --fps-test; done
```

The study's layer shots and motion maps came from a patched temp copy that also returned each scene's baked buffers. It was not kept. The wolf respawns motes with `Math.random`, so its frames are not bit-identical between runs.

**Frame time.** Median / p95 in ms: tower 0.34 / 0.62, city 0.32 to 0.41 / 0.63 to 0.78, wolf 0.56 / 0.93 to 1.04 (check medians: tower 0.37 to 0.58, city 0.45 to 0.59, wolf 0.64 to 0.85). One-time build 60 to 110 ms per scene. Deopt lines: tower 174, city 23, wolf 16. The tower's count is a real loop (ember respawn pushes object literals inside `frame()`); it does not show in the timing only because the scene is tiny.

**Three strongest techniques.**

1. `swClouds` with the wrap option. A reusable, tileable version of Still Water's `genClouds`. The tower's cloud sea is the best-looking element in the piece and scrolls for free.
2. The wolf's rim light in `sceneWolf` (lines 840 to 849) with `furRuns`. Neighbour tests on a mask toward the moon give a clean lit line along the back. Small triangles along chosen outline runs give a fur edge without noise. Both work on any silhouette.
3. Depth tags (`DEP`) with per-tag fog tables. Every pixel knows its layer (sky, far, mid, near, wolf, ledge, foreground) and fog strength follows the tag. Keep the idea; the execution dithers whole areas.

**What is weak (why it missed the bar).**

- Too many colours: 25 (tower), 29 (city), 20 (wolf) on screen against 12 in the Still Water frame. The city has six hue families.
- The tower fails the squint test. It uses ramp levels 0 to 7 on a sky of 2 to 7 and vanishes, while the cloud column on the left edge is the brightest, busiest area.
- The light source is out of frame in two scenes: the tower's sun is at x=-30, the city's sun is fully covered by buildings.
- Architecture is drawn by code. The tower reads as organ pipes, the cathedral as an office block with random yellow dots. This is the failure rule 5 names.
- Dither over whole shapes: glow fractions added to integer cloud levels, and low-alpha fog on the wolf, put a Bayer screen over the cloud lobes, the wolf's body and the ground. The no-mist render is cleaner than the shipped one.
- No empty space in tower and city. The city has at least four competing focal points.
- Main subjects never move. In 10 s only 12 to 16% of pixels change, all in secondary elements. The wolf mist flickers instead of drifting.
- `paintLobes` (the tower's cloud column) reads as fish scales. Three unrelated cloud styles share one frame.
- The tower figure is a 10x16 red cone. The wolf's eye is 1 px and its anatomy is weak.
- Untested: the real page in a browser, a phone.

The wolf is the exception and the one that works: light in frame, a near-single ramp, a clean dark silhouette.

## Hero of the Reach

**What it is.** A knight's character sheet at 320 px wide: a raymarched bust by candlelight, six gear slots, stats, skills, lore. File: `pieces/hero-of-the-reach/hero-of-the-reach.html` (416 lines, script on lines 65 to 413).

**How it is built.** One self-contained HTML file with no source parts or `build.py`. A 320 x 568 to 700 index canvas with HTML text and buttons over it. The palette is nine named material ramps (stone, sky, steel, gold, green, flame, parchment, ui, mint; 64 colours) packed end to end with an offset per ramp. `m(ramp, value, x, y)` returns a dithered index. At load, `init()` raymarches a distance-shape knight bust once (`scene`, `buildBust`: 186x218 panel, straight-on rays, turned 0.42 rad) and stores a material id, a normal and a model position per pixel. The room (`paintRoom`: brick wall, arched window with night sky, candle) and the bust (`shadeBust`) are then shaded twice into two index buffers, with candle strength 1.0 and 0.78. `setH()` builds the static chrome: noise background, bevelled boxes (`box`), six 38 px gear icons and the small stat and skill icons, all drawn from 2D distance functions with a bevel (`drawIcon`). Each frame `render()` copies the chrome, picks the bright or dim buffer per portrait pixel by comparing a flicker value with a 4x4 Bayer cell, then draws the flame, 8 dust pixels, two eye pixels with a blink and the selection border. Input is HTML buttons. There is no sound.

**Render.**

```bash
sed -n '65,413p' "$ST/pieces/hero-of-the-reach/hero-of-the-reach.html" > hero.js
node "$SHOOT" hero.js --h 568 --at 0,0.5,2,3.4 --scale 3 --out hero_shots --fps-test   # --h must be 568 to 700
```

Useful times for `render(t)`: 8.296 (pure bright lighting, the cleanest frame), 1.193 (dim), 15.255 (50% flicker mix), 3.35 (blink). The portrait panel crop is x 11, y 39, 186x218 at 1x. Tall layout: `--h 700`.
Real page with text: the Edge command at `--window-size=640,1136` (432x768 crops the right edge).

**Frame time.** H=568: median 0.26 to 0.39 ms, p95 0.64 to 0.96 (check: median 0.37 to 0.46, p95 0.79 to 1.24). H=700: median 0.31. Load cost: `init()` 230 ms, `setH()` 55 ms.

**Three strongest techniques.**

1. `buildBust` and `shadeBust`. Raymarch once, keep material, normal and position per pixel, then shade into ramps. 230 ms at load and relighting is free afterwards. The helm (steel bands, hard highlight, gold brow band, visor with two mint eyes) looks like deliberate pixel art at 8x. This is the way to get 3D form into the house style without three.js.
2. The dark outline from the material mask (end of `shadeBust`, lines 185 to 190). One pass makes the 3D render read as a sprite at native size.
3. `m(k, v, x, y)` with `MAT` and `OFF`. One call gives any material its own hue-shifting ramp with band-edge dither. Steel, gold and cloth separate cleanly.

Also worth keeping: `drawIcon` (icons from 2D distance functions, crisp at 38, 24, 20 and 18 px). The stored normals are unused potential: the light direction never changes.

**What is weak.**

- The flicker dithers whole areas. 27% of portrait pixels differ between the two lightings and the mix is partial 94% of the time, so most frames show a screen-door checker over steel and wall. The clean bands of frame `03_portrait_candle_bright.png` are rarely on screen.
- Below the helm the body is primitive: a slab torso with no arms, bun pauldrons, a flat board cape. It reads as a chess piece up close.
- No contact shadows between parts and no cast shadow on the wall. The figure floats.
- Warm key and cool rim are not visible. One ramp per material means both lights give the same hue.
- The candle does not feel like the light source: a tiny flame, no halo, a very soft pool. The window has no moon.
- It breaks rule 1 (64 colours, 9 ramps) and rule 5 (a code-drawn character) on purpose. Unity of light is below Still Water.
- Flat fills land in the dither zone: icon interiors use 0.5625, so the sword blade is a 50% checker.
- Icons misread: sack as flask, seal as flower, quill as stick. Surface rules glitch (uneven rivets, notched tabard border).
- The knight never moves. The lore box is about 60% empty, worse at H=700.
- The portrait button says "Tap to hear him" but there is no sound code.
- Untested: `dom_smoke.js`, touch, the page without the web font.

## Reach Field Tips

**What it is.** Thirteen illustrated lore-tip cards at 320x400 (4:5), each a small live scene under a wooden sign with the tip text. File: `pieces/reach-field-tips/tips.js` (572 lines), built by `build.py` into `reach-field-tips.html`.

**How it is built.** One IIFE, fixed 320x400 canvas (no `setH`), horizon at y=262 on every card. The palette is 26 named material ramps (163 colours in one 256-slot table) and `m(ramp, value, x, y)` turns a 0 to 1 value into a dithered index in that ramp. Each card is a record `{ tip, build, field, night, anim }`. `build()` paints a static buffer `BASE` once (sky by `paintSky`, low hills, ground, road, props, corner grass, the sign by `paintSign`) and calls `renderClouds`, which bakes cumulus from `genCumulus` into a separate 400x262 layer. Both are cached per card on first view (`useCard`, `CACHE`). Each frame `render(t)` copies `BASE`, blits the cloud layer with a whole-pixel scroll (0.6 px a second), runs a per-pixel wind pass that lifts ground pixels one ramp step in travelling bands, dots in nine far birds on day cards, calls the card's `anim(t)` (sprites, lake mirror, particles, bolts, dissolves) and maps indices to colours. Draw order is fixed with no depth buffer and no parallax. A tap sets `G.hop = 1.2` s, which each `anim` reads. Text is one HTML paragraph in Cormorant Garamond over the sign. No sound, no frame-rate guard.

**Render.** The piece's own script renders one card at t=2.5 into the current folder (so run it from the temp folder):

```bash
for n in 1 2 3 4 5 6 7 8 9 10 11 12 13; do node "$ST/pieces/reach-field-tips/scripts/shoot.js" $n; done    # writes card1.png ... card13.png at 3x
```

Other times and taps: the driver. `useCard` takes a 0-based index. A tap is `M.G.hop = 1.2`.

```bash
node drive.js "$ST/pieces/reach-field-tips/tips.js" card7 400 30 "0:M.useCard(6);0:M.G.t=0" 2.5,5.0           # 5.0 is the green bolt
node drive.js "$ST/pieces/reach-field-tips/tips.js" card5_tap 400 30 "0:M.useCard(4);0:M.G.t=0;2.7:M.G.hop=1.2" 3.0
```

Check: the driver's card 7 frame at 2.5 s is byte-identical to `card7.png` from the piece's own script.

Speed test through the house `shoot.js`: `tips.js` has no `setH`, so save this as `tips_wrap.js`.

```js
const M = require('C:/Users/farha/Verdant Reach/studio/pieces/reach-field-tips/tips.js');
const card = +(process.env.CARD || 1) - 1;
module.exports = { init() { M.init(); M.useCard(card); }, setH() {}, setOut: M.setOut, update: M.update, render: M.render, G: M.G, W: M.W, H: M.H };
```

```bash
CARD=5 node "$SHOOT" tips_wrap.js --h 400 --at 0 --scale 1 --out fps --fps-test
```

Real page with text: the Edge command at `--window-size=640,800`. Widths under about 500 px come out cropped, so there is no valid phone-width capture.

**Frame time.** Median / p95 in ms. Cards with a wind field: card 1 2.55 / 3.79 (check: 3.33 to 3.40 / 4.47 to 5.13), card 2 2.76 / 3.98, card 4 3.54 / 4.39, card 5 4.19 / 4.87 (slowest; check: 4.10 to 4.75 / 5.68 to 6.33), cards 7 to 12 2.9 to 3.6. Cards without a field: card 3 0.70 / 1.30 (check: 0.86 to 1.06 / 1.79 to 2.04), card 6 0.67, card 13 0.35. So the wind pass costs about 2.3 ms. First view of a card costs a one-off 35 to 110 ms cloud build. Deopt lines: 21 on card 1, 137 on card 5.

**Three strongest techniques.**

1. `genCumulus` and `renderClouds`. Each puff is a disc shaded as a sphere, but its normal is blended 38% own and 62% the whole cloud's, so the mass reads as one lit form with clean bands and a soft dithered rim. These are the best clouds in the studio and they re-skin by swapping one ramp (cream, red, moonlit, violet).
2. `m(ramp, value, x, y)` with the `DARK` table. Any material in one call, and `DARK` gives "one step darker in the same ramp" for any pixel without knowing its material. Good for reflections and shadows.
3. The card record `{ tip, build, field, night, anim }` with `CACHE`. A new card is one build function and one anim function over a cached static base. With the wind-band pass in `render`, this is close to the engine's scene format.

Also worth keeping: the glitter path in `animLake` (sparse dashes, re-rolled 3 times a second with a per-row phase) and the pressed round track in the wheat on card 1.

**What is weak.**

- Bug: clouds are drawn over the sign (cards 1 and 4 clearly, touching on 2, 7, 8, 12) and bolts cross it on card 10. The sign is baked into `BASE` under the cloud layer.
- Bug: the cloud scroll wraps at 80 px, not at the buffer width. Every 133 s all clouds jump back 80 px in one frame (frames at t=133.2 and t=133.5).
- All clouds slide as one rigid sheet at one speed. Shapes never change. No parallax.
- The light direction is one constant (`LX`, `LY`, `LZ`). On cards 3, 6, 7, 9, 10 and 13 the clouds are lit from the side away from the sun, moon or glow.
- The seven day cards have no sun disc, only a halo that is usually behind a cloud. Rule 3 is truly met only on cards 3, 6 and 13.
- 40 to 55 colours per card. Only card 3 (red sun lake, 28 colours) feels like Still Water.
- Weakest cards, worst first: 13 (checkerboard wall), 8 (two 28 px castles; the twist is 2 mint pixels), 10 (flat triangle mountain, no flash), 9 (fireworks are stray pixels), 7 (Hunter sprite scaled x3, so pixel sizes are mixed). Of the first five, card 5 (the flour sphere reads as a torn moon) and card 4 are below the bar.
- People are tiny and stiff: one 14x23 traveller on 10 cards. `rimLit` was not carried over. Arch, wall and mountain are drawn by code.
- Whole-area dither in the lake reflection fade, the flour sphere, the lantern pool and the dissolves.
- The wind pass recomputes `sin` and `vnoise` per ground pixel per frame. The band edges are hard and no blade bends.
- The text font is Cormorant Garamond, not the house Pixelify Sans. The canvas scale is not snapped to whole numbers. Nav buttons are small for thumbs.
- No `setH`, so the house `shoot.js` needs a wrapper. No sound. No recorded smoke test. Never run on a phone.

## Phase 0 report

- **Shared:** every piece is an index buffer mapped through a palette at the end of `render`, and the same small helpers are copied from piece to piece almost unchanged (not every piece has all of them): `clamp`, `hash2`, `vnoise`, `fbm`, `mulberry32`, `BAYER` with `dith` (flat below 0.28, above 0.72), `genRidge`, text-row `sprite`, the two-size sky glow, puff clouds, row-ripple mirror water, HTML text in canvas units, `tone`/`noise` sound, the Node exports for `shoot.js`.
- **Different:** the palette layout (mood crossfade in Still Water, 16-slot blocks in the Musters, material ramps in Hero and Field Tips, cool and warm pairs in the vignettes); bake-once versus repaint-everything (Summit Road and the vignettes repaint; Summit Road and two of the three vignettes miss 4 ms); index space versus the float `VAL` buffer; real 3D per pixel (Kolobok, Hero, Summit Road) versus flat layers.
- **Signatures drifted:** `mirror` means water in the Muster and a sprite flip in Kolobok; `sprite` returns `.data` or `.d`; `stamp`, `buildPal` and `paintSky` take different arguments in each piece.
- **The same faults repeat:** frozen or rigid clouds, whole-area dither from flat values that land mid-step, unpainted horizon rows, code-drawn people and buildings, a hidden light source, `Math.random` in the simulation, state advanced inside `render`.
- **Missing everywhere:** forest or tree movement, parallax that reads, clouds that both drift and change shape under a moving light. None of the nine uses three.js; all 3D here is done per pixel in the index buffer.
- **Extract first:** the core (palette blocks, `dith`, noise, seeded RNG), then `paintSky`, then `sprite` with `rimLit`, then mirror water. Take the best version of each: Still Water's `buildPalette` and `computeWater`, the Muster's `paintSky`, Field Tips' `genCumulus`, Summit Road's `VAL` buffer. The full order and sources belong in `engine/EXTRACTION-MAP.md`.
- **Every technique with its verdict** belongs in `art/technique-library.md`. **The repeated faults, turned into checks,** are in `art/quality-rubric.md`.
- **Tooling gaps to fix with the engine:** `shoot.js` cannot pass arguments or render every step, and the default height (384) is wrong for Hero. The `drive.js` above is the stopgap.
- **Untested for all nine:** a real phone, touch, sound.
