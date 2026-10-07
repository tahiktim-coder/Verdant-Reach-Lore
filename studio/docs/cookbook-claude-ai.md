# Game visuals cookbook

Sep 25, 2026 · @Farhad

## How to use this

Every piece below is a single published HTML page, and its complete source code lives inside that page. Nothing depends on a build step or an outside server.

- **To reuse something:** paste the piece's link and say what you want, for example "the Abyss fog and headlight beams for my game's title screen". I read the page back, lift the technique and adapt it.
- **To get a recipe in another engine:** ask for "the warp-jump recipe from the cookbook, in Godot". The sections below say what ports cleanly.
- **To keep this current:** ask me to add each new piece here when it's built.

## Shared toolkit

Five building blocks sit under almost every piece. They are small enough to copy into any web game.

| Block | What it does | Why it matters |
| --- | --- | --- |
| Lazy scene start | An IntersectionObserver starts each scene only when it scrolls into view and pauses it when it leaves | Pages with 10+ live scenes stay smooth on phones |
| Fixed logical canvas | Draw in a fixed coordinate space (for example 900×560) and scale by device pixel ratio, capped at 1.25–2 | Art looks identical on every screen and stays fast |
| Value noise and fbm | A hash, smooth value noise and 4–5 octave fractal noise, in both JavaScript and GLSL | Terrain, clouds, rock, water, nebulae and wobble all come from this |
| Ordered dithering | A 4×4 or 8×8 Bayer matrix picks between two colours per pixel | Pixel art, 1-bit looks, riso halftones and smooth gradients in limited palettes |
| Bundled three.js | three.js r128 and its bloom passes are pasted into the page, not loaded from a CDN | This is what fixed Arrival on your phone: the Claude app can block outside scripts |

One rule from experience: always test inside the Claude app on a phone, because desktop Chrome hides both performance and loading problems.

## Arrival: space spectacle in three.js

Arrival looks expensive because of four tricks, not because of detailed models. Everything is built from primitives in code.

1. **Bloom does the glamour.** An EffectComposer runs a RenderPass, an UnrealBloomPass (strength 0.9, radius 0.55, threshold 0.8) and one custom pass for vignette, grain and chromatic aberration. Windows, engines and the sun are unlit materials with colours pushed above 1.0, so only they glow.
2. **The warp jump is 2,600 line segments.** They're attached to the camera, and a vertex shader moves them toward you and stretches each one by the warp amount squared. The same moment widens the field of view from 55 to 85 degrees, shakes the camera, lifts bloom and ends on a white flash.
3. **Instancing makes scale.** One InstancedMesh draws 7,200 station windows, 360 hull ribs, 460 asteroids and 240 ships in a handful of draw calls. Ships follow Bezier lanes into the docking hub, updated every frame.
4. **Reflections from a fake room.** PMREMGenerator turns a tiny scene of coloured light panels into an environment map, so the metal hull reflects a sun and a nebula without any image files.

The planet and its rings are single shaders: latitude bands warped by noise, a storm spot, a lit side and a blue rim. The camera rides a CatmullRomCurve3 through the asteroids and past the ring, then hands over to drag-to-orbit.

## Abyss: underwater horror in three.js

Abyss sells depth with fog and light, not detail. Most of it transfers straight to any horror or underwater game.

- **Fog is the art direction.** Exponential fog at density 0.011 in the same teal as the background makes walls fade into the dark by distance, which also hides how simple they are.
- **Headlight beams are fake volume.** Each beam is an open cone with an additive shader that brightens where the surface faces the camera and fades along its length. A real SpotLight sits inside the cone to light whatever the beam touches.
- **Marine snow is one particle system that never runs out.** 8,000 points wrap around the camera in the vertex shader using modulo, so they surround you forever at no extra cost.
- **Canyon walls are displaced planes.** Two large planes are pushed out by fbm noise, with vertex colours from the same noise for light and dark rock.
- **The leviathan is 72 spheres on a path.** Each segment samples the same curve slightly earlier in time, so the body follows the head exactly at any frame rate. Two rows of unlit, fog-free spheres give it glowing flank lights.
- **Tension is scripted.** At 16 seconds the headlights flicker, the creature crosses the beams and the captions change. The sonar ping is an expanding wireframe sphere plus a brief boost to ambient light.

What went wrong first: the creature was invisible for three rounds, because it was dark-on-dark, its lights sat inside its body and my test hook reset its timer. Always check scale and contrast from the actual camera.

## Specimen lab: models from primitives and infinite zoom

The lab shows two reusable ideas: a believable object built only from code, and a zoom that never runs out.

**Modelling from primitives.** The microscope is extruded rounded rectangles (base, stage, head), an extruded Bezier outline for the curved arm, cylinders and tori for the objectives and their colour rings, and 48 tiny boxes around each focus knob for knurling. Studio light comes from a PMREM room plus a key light with soft shadows. Floating labels are HTML elements placed by projecting 3D points to the screen every frame.

**The nested zoom.** Each world is a chain of layers, and each layer lives exactly 10× smaller inside a point of the one before it. The zoom value Z counts powers of ten.

- A layer is drawn at scale 10 to the power of (Z minus its index), offset so the camera always aims at the deepest point in the chain.
- Layer i fades in between Z = i − 0.55 and i − 0.05, and fades out after i + 0.6.
- A brief blur at every hand-off hides the seam, like pulling focus.
- Heavy layers (terrain, terraces) are painted once to an offscreen canvas and reused.

This is the same technique behind "powers of ten" videos. It would make a strong itch.io game mechanic on its own: a zoom-to-find puzzle.

## Shader recipes

These run as one full-screen fragment shader each, with no meshes at all. They port almost line for line to Godot shaders, Unity ShaderLab and Shadertoy.

| Piece | Core technique | Key numbers |
| --- | --- | --- |
| Black hole | Each ray is bent step by step around the hole, then tested against a thin accretion disk | About 240 steps per pixel, Doppler brightening on the approaching side, ACES tone mapping |
| Photoreal terrain | Raymarch a height field made of fbm, then add snow on flat high ground, lakes below a water line and distance fog | Soft shadows from a second short march, render at 0.6× resolution |
| Mandelbulb relic | Distance estimator for a power-8 fractal, coloured by orbit traps | Ambient occlusion from 5 samples along the normal |
| Toon ocean | Raymarch the island and lighthouse, but intersect the sea as a flat plane | Diffuse light in 3 flat bands, dark outline where the surface turns away, white rings around the island from its distance field |
| 1-bit ghost render | Raymarch the scene, then keep only two colours using an 8×8 Bayer threshold | Outlines by marching 2 extra rays per pixel and comparing object ids and depth, 384 px wide then scaled up |

For a real game, the toon ocean and the 1-bit look are the most practical. They are styles, so they work on real 3D models in an engine, not only on raymarched scenes.

## 2D canvas recipes worth reusing

These are the 2D techniques that held up best. They need nothing but a canvas, so they suit HTML5 games like Slime Mind directly.

- **Pixel art that stays crisp.** Draw at native resolution (for example 256×192), fill shapes with your own scanline rasteriser instead of canvas paths, then scale up with `image-rendering: pixelated`. Light the finished image per pixel with Bayer dithering. Used in the cozy pixel room.
- **Risograph print.** Draw each ink as a black mask, punch random grain out of it, tint it and stack the inks with multiply blending, each nudged 1–2 px off register. Halftone gradients are dots on a 45° grid sized by density.
- **Cel-shaded clouds.** Draw the same cluster of circles three times: dark shadow offset down-right, mid tone, then white offset up-left and slightly smaller. From the anime background.
- **Autotiles.** A 16-tile set keyed by which of the four neighbours match, plus four inner-corner tiles, each generated from a signed distance to the missing edges.
- **Pixel VFX and planets.** Evaluate a brightness field per pixel, then map it to a 6-colour ramp with Bayer dithering. Planets sample 3D noise on a rotating sphere, so the sprite sheet loops seamlessly.
- **Reaction-diffusion.** The Gray-Scott equations on a 280×175 grid, 10 steps per frame, lit by its own height gradient. It could drive how slime spreads in Slime Mind.

Avoid: the hand-drawn ink-sketch look from Volume 5, which you rated the weakest.

## Souls pixel-art: palette-indexed live scenes

Three 288×288 scenes rebuilt from the Souls games pixel-art post: the tower, the city and the wolf. Every pixel is a palette index; static layers bake once at load and only moving parts redraw, so a frame costs 1–3 ms. [Open](https://claude.ai/artifact/8bdZgzv7Njme7ghr6JiUps)

- **Palette ramps.** 27–57 colours per scene, grouped dark to light per material (sky, cloud, stone, roof, foliage). A 4×4 Bayer dither only near band edges keeps bands flat.
- **Sphere-lit puff clouds.** Each puff is a disc shaded as a sphere, drawn back to front, with noisy edges. Blend each lobe's normal with its parent cloud's (40–65%) so lobes merge into one mass.
- **Lookup tables for fog, haze and glow.** For every colour, precompute the nearest palette colour at 4–6 mix levels toward the fog or light colour. Apply a dithered level per pixel.
- **Depth tags.** The wolf scene tags each pixel as sky, far, mid, near, wolf, ledge or foreground. Mist strength follows the tag, so the layers separate on their own.
- **Tileable noise.** Noise that repeats in x lets cloud banks, the cloud sea and two mist layers drift and wrap forever.
- **Tower.** Near-vertical body with 4 px ribs, lancet windows, galleries, a spire crown and turrets at staggered heights. The base has a glowing pointed-arch gate built from two circles.
- **City.** Rows generated far to near, with size and haze growing by depth. The cathedral is drawn between the rows behind it and the rows in front.
- **Wolf.** A smooth union of ellipses and capsules. Fur tufts appear only at the silhouette, from noise stretched along a flow direction per body region; moon rim light comes from the shape's gradient.
- **Water.** Mirror each bridge about its underside with a per-row ripple offset, darken near the banks, add warm glints on the cathedral's axis.

What went wrong:

- A hard max union of the wolf's shapes showed creases like armour plates. A smooth union (log-sum-exp) fixed it.
- An unrestricted fog table pulled cloak purples into the wolf's legs. Limit each table to the scene's own ramps.
- Fog on the legs glowed brighter than the ground until it was capped at the ground's fog level.
- Sky showed through gaps between houses until a ground layer went under everything.
- Equal-size cloud puffs read as cotton balls. Vary sizes, flatten far rows and light each row as one bank.

## Kolobok: the invisible loaf

A playable one-scene piece on the Still Water engine: a giant invisible bun rolls through a sunset wheat valley, and only flour shows it. [Open](https://claude.ai/artifact/3z5ULtEzLPM45CfebB5ky9)

- **Still Water rules.** 216 px wide, 384–470 px tall by screen shape. One 12-step dusk ramp (indigo to cream), four flour accents, one mint for eyes. Bayer dither only across band edges; sun low and in frame.
- **Hilltop camera.** Pinhole camera 24 m above the valley, focal 180 px. Each ground pixel maps to world X/Z once per screen height; the per-frame pass only adds wind, tracks and dust.
- **Field.** Haze and backlit sheen are baked per pixel. Field strips 34 m wide converge on a vanishing point. Wind is a travelling sine over world X/Z, read from a lookup table.
- **Invisible, then floured.** The loaf is a per-pixel ray–sphere test. Flour lives in a 128×64 texture in the loaf's own frame: rotate the hit normal back, sample, add noise, dither the edge. No flour means transparent.
- **Rolling.** Each frame rotates the loaf about up × velocity by distance ÷ radius, so flour patches, slashes and lumps turn with it.
- **Tells without drawing it.** A track stamped into a 1.5 m world grid (dark inside, lit rim of standing wheat, stalks streaked along the roll). Crows perched on its top point. A long shadow only where flour sits: a ray from each ground pixel toward the sun, with a cheap ellipse reject first.
- **Reading as bread.** Skylight from above, a backlit rim glow on the sun side, three baker's slashes, and dark lumps with mint eyes for the stuck pebble folk.
- **Hand-drawn parts.** Stone elder (polygon silhouette, sun rim, NOT OURS carved in a 4×5 font), pebble folk, crows, windmill, the flour-bell pole.

What went wrong, and the fix:

- A field-strip boundary passing through the camera draws a vertical line down the screen. Offset the strips by half a strip.
- Flour clouds drawn as clean blobs read as cartoon pills. Noise on the density plus a wide dither band makes them powder.
- Frame time jumped from 2 ms to 18–35 ms after the first throws. V8 kept deoptimising the renderer: small objects shared hidden shapes, and per-frame numbers changed type.
- The fix: plain constants for fixed numbers, typed arrays for per-frame state and the rotation matrix, unique field names on particles, heavy loops in small leaf functions. Back to about 2 ms a frame.

## Muster of the Reach: a creature roster

A character menu in the same pixel technique: six creatures from the Reach and Still Water, one live portrait each, stats beside it. [Open](https://claude.ai/artifact/XKmtZuNeVjrmTn7FtQZ2Ex)

- **One canvas, many palettes.** 216 px wide; the frame uses a green-lacquer and brass ramp, and each portrait has its own 12-step ramp in a 16-slot block of a 256-colour palette.
- **Portrait kit.** Sky toward a light in frame, clouds lit on the side facing it, midpoint-displaced ridges, and mirror water that reflects rows above the waterline with a per-row ripple.
- **Automatic rim light.** Silhouettes are drawn as plain shapes; a pass lights every edge pixel that faces the light. The knight and the hunter are drawn this way.
- **Procedural where organic.** The fish head is a shaded superellipse with scale rows, a gill line, lips and drifting barbels; the hunter's tree grows a branch level each time it blinks.
- **Static and moving layers.** Each portrait's sky and land are built once; each frame redraws only water, wind, eyes, cloth, crows and flour. About 1 ms a frame.
- **Text as HTML.** Names, stats and lore sit over the canvas in Pixelify Sans, placed in canvas-pixel units, so they stay sharp at any scale.
- **Roster thumbnails.** Each portrait is drawn once and sampled every second pixel around the creature into a 28 px tile.

## The Summit Road: the cursed warrior's walk

The Old Age legend: the warrior still walking the endless mountain toward the green-lightning summit. Built to try new techniques on top of the Still Water rules. [Open](https://claude.ai/artifact/9EhJvwBE3e9GQ9RrEdZUPF)

- **Voxel-space terrain.** For each screen column, step forward in depth, sample the heightfield, and fill down to the last drawn row. The ridge is analytic: a slope toward the summit, a symmetric falloff to both sides, 5 m terraces; the road stays smooth.
- **Cloud sea in the same pass.** Where the ground is below the cloud top, the cloud top is drawn instead, shaded from scrolling tileable noise.
- **Depth fog in ramp space.** Work in continuous ramp values, blend toward the horizon value by distance, dither once at the end.
- **God rays.** A clear-sky mask is blurred toward the crown at half resolution and added as light; refreshed every other frame.
- **Lightning.** Midpoint-displaced bolts with branches, flickering; a palette flash lifts the whole ramp toward green for a moment.
- **Palette cycling.** The blade's three green accents rotate along its length.
- **Walk cycle and relics.** A four-frame hand-drawn walk seen from behind, with a swaying cape; colossal swords as scaled billboards in mirrored pairs along the road.

What went wrong, and the fix:

- The first flash washed the frame mint green. Keep the palette lift near 15%.
- A wide ridge made a flat disc where it met the clouds. A steeper falloff lets the cloud sea show on both sides.
- Coarse depth steps near the camera flatten detail into bands. Use small steps near, bigger far.
- About 9 ms a frame on a laptop, the heaviest piece so far; phones may drop to the half-rate fallback.

## Reach vignettes: old rules vs upgraded

Three flat 2D scenes with a toggle, to show what each upgrade adds to the simple style: a knight's camp by the river, the Order's castle at dusk, Still Water at dawn. [Open](https://claude.ai/artifact/Ehc9dDRkHuy6QPjuF1d7YZ)

- **Warm/cool split.** Each scene has a cool ramp and a warm ramp; a pixel uses the ramp of the light that dominates it. The old rule was one ramp for everything.
- **Light pools.** Fire light falls off in steps, broken up by the ground's texture and a flicker, with a dithered edge instead of a ring.
- **Two-light rims.** Silhouettes get a warm edge on the fire or sun side and a cool edge on top from the sky.
- **Flat depth.** Silhouette layers, each a step closer to the sky colour, drifting with a slow pan.
- **Glints as dashes.** Light on water is sparse short horizontal dashes that shimmer in order. Random dots read as a Christmas tree.
- **Handover by dither.** Where warm sky meets cool sky, a wide dithered band avoids a hard elliptical edge; shape warm light as a band along the horizon.
- **Framing and vignette.** Reeds and branches at the frame edges; corners darkened one step through a dither.

Honest note: the old one-ramp version of the lake scene has a bolder orange band that some may prefer. Bold colour bands can beat realism.

## Hero of the Reach: a knight's character sheet

A hero screen at 320 px wide, 1.5 times the Muster's detail: a knight bust by candlelight, six gear slots, stats, covenant status, skills. [Open](https://claude.ai/artifact/TMnEAedcMtM2bpEuv17R1r)

- **Bust from 3D distance shapes.** Helm, plume, gorget, rounded breastplate, fauld, layered pauldrons, cape; raymarched once at load, each pixel keeping its material and normal.
- **One ramp per material.** Steel, gold, green cloth, stone, sky, flame, parchment: warm key light from the candle, cool rim from the window, specular on metal.
- **Detail by rules on the surface.** Gold bands by height, plate lines, a keel, breathing holes, rivets, a leaf on the tabard, a dark outline around the whole shape.
- **Real flicker, cheaply.** The room and bust are shaded twice (full and dim candle); each frame dithers between the two by the flicker level.
- **Icons as 2D distance shapes** with a bevel lit from the top left and a dark outline; crisp at any size.

What went wrong: the first bust was a boxy fridge filling the frame. Fixed by shrinking it, raising and rounding the shoulders, a rounded chest over a narrower waist, and surface detail.

## Exporting

The production kits (Volumes 6 and 7) turn live visuals into files. Published pages save files through the page's downloads capability, because plain download links don't work there.

| Output | How it's made | Notes |
| --- | --- | --- |
| Video (MP4 or WebM) | `canvas.captureStream(30)` into a MediaRecorder at 9 Mbps, picking the first supported format | MP4 where the browser supports it, WebM elsewhere. Record on green (#00B140) or pure black for Screen blending |
| PNG frame | `canvas.toBlob` | Transparent where the background mode is transparent |
| Sprite sheet | Frames drawn side by side on one canvas | Import with filtering off and scale by whole numbers |
| Zip of files | A small zip writer with no compression (CRC-32 plus local and central headers), about 20 lines | Used for parallax layers, UI kits, icons and sound packs |
| WAV sound | 16-bit mono PCM at 44.1 kHz with a 44-byte header, from an sfxr-style synth | Delivered inside a zip, since WAV isn't an allowed download type |

## Taking it into an itch.io or Steam game

The fastest route to itch.io is to keep these as web games. A single HTML file zips and uploads as an HTML5 game that plays in the browser.

| Route | Best for | What carries over |
| --- | --- | --- |
| HTML5 on itch.io | Short, atmospheric games like Abyss or the campfire game | Everything, as is. Zip the HTML file, upload, tick "played in the browser" |
| Desktop wrapper (Electron or Tauri) | A web game you also want on Steam | Everything, plus Steam achievements through a plugin |
| Godot 4 | A bigger game with levels, physics and saves | Shaders port almost line for line, instancing becomes MultiMesh, bloom is the built-in glow setting |
| Unity | Teams already using C# | The same ideas, but everything gets rewritten; shaders via Shader Graph or HLSL |

For the campfire game or Abyss, I'd start as an HTML5 prototype on itch.io, then move to Godot only if it grows past one scene. That matches using Claude Code as your main tool, since it can run and test the web version directly.

## Index

The [style library](https://claude.ai/artifact/4mLVaJnF79ZjSqwZSz9zK8) is the live index of everything, with thumbnails. Newest first:

| Piece | Type | Link |
| --- | --- | --- |
| Hero of the Reach | 2D canvas at 320 px: raymarched knight bust in material ramps, candle flicker by dithering two lightings, bevelled distance-shape icons | [Open](https://claude.ai/artifact/TMnEAedcMtM2bpEuv17R1r) |
| Reach vignettes | 2D canvas, three flat scenes with an old/upgraded toggle: warm/cool split, light pools, two-light rims, layered depth, glints, framing | [Open](https://claude.ai/artifact/Ehc9dDRkHuy6QPjuF1d7YZ) |
| The Summit Road | 2D canvas, voxel-space terrain: endless terraced ridge over a cloud sea, god rays, lightning with palette flash, cycling blade glow, walk cycle, relic swords | [Open](https://claude.ai/artifact/9EhJvwBE3e9GQ9RrEdZUPF) |
| Muster of the Reach | 2D canvas creature roster: six live pixel portraits (pebble folk, stone elder, knight, fish, hunter, Kolobok), stat icons, thumbnails, tap to make each act | [Open](https://claude.ai/artifact/XKmtZuNeVjrmTn7FtQZ2Ex) |
| Kolobok | 2D canvas on the Still Water engine, playable: invisible giant loaf in a sunset wheat valley, revealed by flour. Ray–sphere per pixel with a flour texture in the loaf's frame, long shadow, three endings | [Open](https://claude.ai/artifact/3z5ULtEzLPM45CfebB5ky9) |
| Souls games pixel-art | 2D canvas, palette-indexed pixel art: gothic tower in clouds, cathedral city at sunset, giant wolf in moonlit mist. Only moving parts redraw | [Open](https://claude.ai/artifact/8bdZgzv7Njme7ghr6JiUps) |
| One island, ten styles | One shared SDF scene, ten shading functions: hologram, claymation, low-poly, stained glass (3D Voronoi), X-ray (density accumulation), chrome (two-bounce reflection), paper, comic (edges from two extra rays), topographic, knitted (triplanar stitch pattern). Best way to compare looks for a game | [Open](https://claude.ai/artifact/U9pvnms8XhxKHMgG4WUicb) |
| Ten more concepts | Shaders: ridged-noise mountains, terraced canyon strata, layered aurora with ice reflection, lighthouse beam as ray-to-line distance, Mandelbox fractal, volumetric steam, forest god rays, ringed planet sky, emission nebula, glowing jellyfish. Keep exposure below 1.0 before tone mapping | [Open](https://claude.ai/artifact/EEfEqRQhbvav7n4B7jWazC) |
| Ten concepts | Shaders. New styles: Shadowlands (shade only the ground, march shadow rays through invisible objects), Chronoscan (time = T + screen position), Lenticular (two shadings of one raymarch, interleaved in strips) | [Open](https://claude.ai/artifact/XuX9MGYv9ptrsdByoRjJFn) |
| Three worlds, rebuilt | Raymarched shaders, no meshes: world tree (volumetric canopy), strategy kingdom (terrain plus repeated houses and trees), Ward 7 (torch with volumetric dust). Beats primitive three.js models on quality | [Open](https://claude.ai/artifact/JYbXFTf867TJoUmKzJMVGj) |
| Majestic | three.js, three worlds: sky citadel, world tree, cathedral. Procedural tree via recursive tapered tubes; stained glass is a Voronoi shader | [Open](https://claude.ai/artifact/HdKWzzto1bAxdpSKJ9Bdg5) |
| Hollow | three.js, playable slice of the campfire game | [Open](https://claude.ai/artifact/QpjHYufzsUqL9k2YrTWkoX) |
| Abyss | three.js, deep-sea dive | [Open](https://claude.ai/artifact/1GknXR6UE6TmMfLM1FrsnK) |
| Arrival | three.js, space cinematic | [Open](https://claude.ai/artifact/8Tfc6CJ355Q2TQM4cux2WV) |
| Specimen lab | three.js and canvas, microscope zoom | [Open](https://claude.ai/artifact/Die9btrXMu7XSSsnWVdxVT) |
| Volume 8: seven crafted worlds | Styles: anime, toon ocean, 1-bit, pixel room, riso, Swiss, flat space | [Open](https://claude.ai/artifact/Tw9RMsmc4cdesVGuRncggj) |
| Volume 7: production kit, part two | Tools: text story, lower thirds, overlays, loops, titles, SFX, tiles, planets, icons, UI kit | [Open](https://claude.ai/artifact/UUVUHq8JnFTyu4oi7EkqT5) |
| Volume 6: production kit | Tools: caption studio, pixel VFX, parallax | [Open](https://claude.ai/artifact/RXk31JvLSsxRwbJAp2Ytgv) |
| Volume 5: ten more worlds | Styles | [Open](https://claude.ai/artifact/JgmtyNcSVsTK9sG4hVBjui) |
| Volume 4: five showpieces | Shaders: black hole, aurora, Mandelbulb, paper-cut, deep sea | [Open](https://claude.ai/artifact/EPSBW2rKN5EAXEC8gVe7sW) |
| Volume 3: five more worlds | Styles | [Open](https://claude.ai/artifact/GxBVL3jjpEZQRaTe2P2LJ9) |
| Volume 2: twelve worlds | Styles, including photoreal terrain | [Open](https://claude.ai/artifact/QWjcz12Nbuw891T497m4cz) |
| Volume 1: ten ways your worlds could look | Styles | [Open](https://claude.ai/artifact/6nKZ6RyRLuHUUMszua5msd) |
