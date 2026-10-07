# World atlas of the Verdant Reach

A shaded-relief map of the whole continent, 2048 x 2048, made in three stages. Exports live in `maps/` at the repo root
(`verdant-reach-atlas.png` with names, `verdant-reach-atlas-clean.png` with frame only, `verdant-reach-relief.png` bare relief).

## How it is made
1. `terrain/build_terrain.js` designs the continent (coast control shapes, mountain crests, lakes, the wheat lowland, the alpine
   massif) from `terrain/layout.js`, then runs hydraulic erosion so ranges grow real valleys and spurs, then computes rivers by
   flow accumulation. It writes height.f32 and the masks (forest, wheat, snow, lakes, regions) plus `pois.json` and `labels.json`.
2. `paint/paint.py` renders the relief: hillshade from one north-west light, quiet elevation tints, aerial haze toward the north,
   sea with bathymetric bands, tapered rivers, textured forests and strip fields, snow. Output `paint/master_relief.png`.
3. `names/names.py` adds marks (one ink, one weight), names (Cinzel for regions, EB Garamond for the rest; OFL fonts in
   `names/fonts/`), the frame, title, compass and scale. Region names are searched along gentle arcs and placed first; small
   names avoid rivers, peaks and each other. Output `names/master_named.png` and `names/master_clean.png`.

## Rebuild
```
node terrain/build_terrain.js
python paint/paint.py
python names/names.py
```
Each step takes a few minutes. Every number is in `terrain/layout.js`, `paint/paint.py` (top) and `names/config_names.py`.

## Moving a place
Edit its `u, v` in `terrain/layout.js` (castles, groves, towers, the city, lakes are listed there), rebuild the three steps.
Names and sizes are in `names/config_names.py` (STYLE for sizes, MINOR and REGIONS for which names appear).

## Status and weak spots
- Every placement is provisional: it follows proposed fixes S1, S3, S7 and S8 in `10-contradictions-and-fixes.md`, not approved lore.
- Still Water is straighter than a real fjord lake; the north-west fjords are still a little regular.
- The eastern lowlands and the south-east peninsula are quiet to the point of plain.
- "The low gap" is a working name, not lore. One league is taken as 3 miles (a proposal).
- Earlier attempts (a vector draft in `maps/_old-draft/`, pixel candidates in `pieces/world-map/`) are kept for the record.
