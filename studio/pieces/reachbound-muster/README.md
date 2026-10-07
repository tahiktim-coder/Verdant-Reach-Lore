# Reachbound: Muster of the Reach

A creature roster screen for the Reachbound game world (the Verdant Reach, Still Water, Kolobok). Nine creatures, each
with a live pixel-art portrait, six stats, a lore line and a tap action. One self-contained HTML file, no libraries.

Live: https://claude.ai/artifact/XKmtZuNeVjrmTn7FtQZ2Ex

## How it is made
It is not an engine: it is a small software renderer written for this screen.
- **Canvas:** 216 px wide, 384–470 px tall by screen shape, scaled up with nearest-neighbour so pixels stay sharp.
- **Colours:** every pixel is a palette index. Each portrait owns a 16-slot block of a 256-colour palette: one 12-step
  hue-shifting ramp (dark to light, the hue moving along it) plus up to 4 accents (glowing eyes, flour, lantern).
- **Clean bands:** shading is a continuous value snapped to the ramp by `dith()`, which dithers (4x4 Bayer) only across
  band edges. Never raw noise dither over whole areas.
- **Light in frame:** every portrait has a sun, moon, lantern, rift or circle; clouds are lit on the side facing it.
- **Code draws landscapes, hand drawings make things read:** sky, clouds, ridges, water, wheat are procedural
  (`paintSky`, `paintClouds`, `genRidge`, `fillBelow`, `mirror`). Creatures are hand-drawn sprites typed as text rows
  (`sprite([...rows], map)`), usually silhouettes lit automatically on their edges (`rimLit`). Organic round things
  (the fish head, the loaf) are shaded procedurally like 3D forms. The Projection is drawn with a dither mask to look translucent.
- **Static and moving layers:** each portrait's background is built once (`build*`); each frame only draws what moves
  (`draw*`): ripples, blinking eyes, cloth, crows, flour, flicker. About 1 ms a frame.
- **Chrome:** green-lacquer and brass boxes, stat tiles and pixel icons, built once per screen height (`genChrome`).
- **Text is HTML** in Pixelify Sans over the canvas, placed in canvas-pixel units so it stays sharp.
- **Roster:** thumbnails are portraits sampled every second pixel around the creature; the strip shows six and follows the selection.

## The loop that makes it look good
Build, render headless, look at the PNG, fix, repeat 3–6 times. Then time it and smoke-test the page.
```
node scripts/shoot.js src/reachbound.js --at 1,3 --call select@0 --out shots --fps-test
python3 scripts/sheet.py sheet.png shots/*.png
python3 build.py
npm i jsdom && node scripts/dom_smoke.js reachbound-muster.html
```
`shoot.js` drives the module through its Node exports (`init, setH, update, render, select, act, setOut`).

## Add a creature (the recipe)
1. Palette: add a 12-colour ramp (+ up to 4 accents) to `PALDEF`, and its key to the palette-building list.
2. `buildX(b, o)`: paint the static portrait into buffer `b` with palette offset `o` (sky toward a light, clouds, ridges, ground).
3. `drawX(b, o, t, st)`: per frame, draw moving parts and the creature; `st.talk > 0` while it acts after a tap.
4. Add an entry to `CREATURES` (name, tier and home, available, six stats, lore line, tap lines, build, draw, sound)
   and a thumbnail centre in the `TC` map in `genThumbs`.
5. Render headless, look, fix. Check its thumbnail too.

## Rules that keep it good
- One ramp per scene, bands with dither only at edges, the light in frame, lots of empty space, one focal subject.
- Hand-draw anything that must read as a thing; code-drawn people and buildings look amateur.
- Glints on water are sparse short horizontal dashes; random dots look like a Christmas tree.
- Light pools stay small and dither out; big flat pools look like orange discs.
- Performance: fixed numbers as plain constants, per-frame numbers in typed arrays, no shared field names across hot objects.

## Known weak spots
- Stats, counts and most names are placeholders.
- The pebbles' shore is a little blotchy; the knight and the Hunter are small silhouettes.
- Tested in a simulated browser, not on a real phone.
