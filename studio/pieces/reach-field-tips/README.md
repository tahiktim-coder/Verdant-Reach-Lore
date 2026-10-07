# Reach Field Tips

Illustrated lore-tip cards for the Verdant Reach, drawn entirely by code. 13 cards, 4:5 at 320x400 (x3 = 960x1200).
Live: https://claude.ai/artifact/Kry5ZuNr7mC5zvnZXmZPTG

## How a card is made
- **Palette:** material ramps (sky, clouds, wheat, meadow, stone, wood...) in one 256-colour palette; `m(ramp, value, x, y)`
  snaps a 0..1 value to a ramp with Bayer dither only across band edges.
- **Sky:** `paintSky(ramp, light, top, span, glow)`: a gradient toward a light in frame.
- **Clouds:** `renderClouds([[cx, baseY, width, height, seed], ...], ramp)`: cumulus built from many sphere-shaded puffs of
  mixed sizes, each lobe's normal blended with its cloud's, flat shadowed bases, soft dithered rims. They drift.
- **Ground:** wheat, meadow or night ground with wind waves (`field` in the card entry); `ridge()` for far hills;
  `framingGrass()` for dark grass at the corners.
- **Sign:** `paintSign()` draws the wooden plank board with iron corners; the tip text is HTML (Cormorant Garamond).
- **The subject:** hand-typed sprites (`sprite([...rows], map)`, `stamp`) and small procedural drawings in the card's `anim(t)`.
- **Lake cards** mirror everything above the waterline each frame, darker with depth, fading into dark water.

## Add a card
1. Write `buildX()` (static: sky, ground, props, `paintSign()`, `renderClouds(...)`) and `animX(t)` (moving parts; `G.hop > 0` after a tap).
2. Add `{ tip, build, field, night, anim }` to `CARDS`.
3. `node scripts/shoot.js 14`, look at `card14.png`, fix, repeat. Then `python3 build.py`.

## Weak spots
Cards 6-13 had one review round; people are tiny figures; the wall on card 13 is a plain checker; not tested on a real phone.
