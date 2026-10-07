# The Reach Studio and the Games

What the Reach Studio is, how its pixel pieces are made, what has been built so far, and which parts of it count as lore. The studio lives in `studio/` in this folder. Its lore notes (`studio/lore/*.md`) are top-tier sources, equal to **[CANON]** in this bible. The games are made inside the world and their scripts are quoted here, but their numbers, tiers and counts are never lore. See [12-archive.md](12-archive.md) ("Verdant Reach as a real RPG/game") and [10-contradictions-and-fixes.md](10-contradictions-and-fixes.md).

Related files: the Still Water file ([15-still-water.md](15-still-water.md)) and the Kolobok file ([16-kolobok.md](16-kolobok.md)) for the lore inside the two games, [03-knights-and-orders.md](03-knights-and-orders.md) for the covenant and the Hunter, [14-visual-references.md](14-visual-references.md) for the TikTok images, [18-unplaced-ideas.md](18-unplaced-ideas.md) for your notebook.

## How tags are used in this file

- **[CANON]** here means your decision, your stated plan or your judgement, recorded in the studio brief (`studio/CLAUDE.md`), the art direction (`studio/art/art-direction.md`) or a lore note marked [his]. For the pieces themselves it means a fact of the shipped files.
- **[STUDIO PROPOSAL]** means a previous Claude in the studio drafted it and you have not confirmed it. A sub-kind of [PROVISIONAL].
- **[GAME TEXT]** means player-facing text in a game: tips, lore lines, tap lines, item descriptions, captions, endings. Usable as flavor and as the games' actual script. Not world canon unless the idea under it is marked [his] in a lore note.
- **[PROVISIONAL]** means your idea still being shaped ([working] in the lore notes), a fact whose source is not recorded, or this bible's own reading of the pieces.

## What the studio is

- **[CANON]** You (Farhad, NakoFrish, @nakofrish) build games for itch.io and Steam and make TikTok content from the same visuals. The studio is where your games' visuals, prototypes and, over time, a tiny engine get built. (studio brief)
- **[CANON]** One universe holds your current projects: the Verdant Reach, Still Water (the lake with a talking, wish-granting fish and the red sun) and Kolobok (an invisible giant loaf on the roads). (studio brief; studio lore: "The Verdant Reach and Still Water can be the same universe (so can Kolobok).")
- **[CANON]** Working rules you set for the studio: honest critique, not encouragement; say what is weak or untested every time; never quietly drop or change your ideas, and mark any extension as a proposal; "same technique" means the pixel-scenes method; you write short, mobile-typed messages, so answers should be short: main points, no long paragraphs; you read code but aren't a strong programmer, so code choices are explained in plain words and you are never made to debug. (studio brief)
- **[CANON]** Don't copy other games' art, characters, UI skins or icons. Take layout ideas only and draw everything fresh. (studio brief) This is rule 1 of [13-writing-guide.md](13-writing-guide.md) applied to pixels.
- **[CANON]** Every piece ships as one self-contained HTML file with synthesised sound and no libraries, and must work on a phone in portrait. (pixel-scenes skill)
- **[PROVISIONAL]** "Reachbound" is the name the nine-creature Muster gives the game world ("the Reachbound game world (the Verdant Reach, Still Water, Kolobok)"). Whether the name is yours or the studio's Claude's is not recorded. Keep it as the product name only. See [11-open-questions.md](11-open-questions.md).

## The tiny-engine plan

- **[CANON]** You want a tiny engine grown out of the finished pieces, not a big framework: small, plain JavaScript, no build step required, testable headless. Grow it out of working pieces, never design it in the abstract. (studio brief, roadmap)
- **[STUDIO PROPOSAL]** The roadmap drafted for you (`studio/ROADMAP.md`):
  - Constraints: plain JavaScript modules, no framework, a game ships as one HTML file; the core under about 2,500 lines; everything renders headless in Node and in the browser; the engine must reproduce the examples pixel for pixel before anything new goes in.
  - Phase 0, get oriented: read the brief, the lore, the art direction and the skill; render every example headless and look at the frames; write a one-paragraph summary of each example in `COOKBOOK.md`.
  - Phase 1, extract the core into `engine/`: `core.js` (216-wide screen with adaptive height, index buffer, 16-slot palette blocks, dither, noise, hashing, RNG), `paint.js` (sky toward a light, clouds, ridges, fill-below, discs, mirror water), `sprite.js` (text-row sprites, mirroring, automatic rim light, stamping with depth), `ground.js` (perspective ground, world grids for tracks and dust), `fx.js` (particles, powder clouds, dissolve and blink), `ui.js` (HTML overlay in canvas-pixel units, captions, buttons), `audio.js` (the small WebAudio synth), `app.js` (boot, resize, frame loop with slow-device fallback, tap, swipe and keys), `testing/` (headless runner, contact sheets, jsdom smoke test).
  - Phase 2, prove it: port the Muster, then Kolobok. Pass when headless frames at fixed times match the originals, median frame time is no worse, and each port's own code is noticeably shorter.
  - Phase 3, scenes as data: a scene description object (ramp, light, horizon, clouds, ridges, water, ground, sprites and their animations), a viewer page that loads any scene, sprite import from a PNG snapped to the ramp.
  - Phase 4, the first small game on it, picked with you. Candidates: Still Water rebuilt on the engine, or a Verdant Reach vignette (a Verdant Knight and the Covenant's Hunter). Add only what that game needs: game states, saving, a camera pan, text and dialogue.
- **[CANON]** After every piece or engine step the studio updates `COOKBOOK.md` (what it is, how it was built, what went wrong and the fix), shows you frames or a playable link, says what is weak, and asks at most one question. (studio brief, roadmap) As of this bible `studio/COOKBOOK.md` holds only its header and no entries; the earlier pieces are documented only by their own READMEs and the skill file. The studio README also asks for your claude.ai "Game visuals cookbook" doc to be exported into `studio/docs/`; that has not been done.

## The pixel-scenes method

**[CANON]** (the studio's working method, `studio/.claude/skills/pixel-scenes/SKILL.md`.) Every piece is a small software renderer written for that piece: code decides the colour index of every pixel of a 216-pixel-wide canvas (384 to 470 tall by screen shape, or 320 wide for the higher-resolution character sheet and the cards), and the browser scales it up with nearest-neighbour so the pixels stay sharp. The rules are fixed: one hue-shifting 12-colour ramp per scene, dark to light with the hue moving along it (indigo shadow to plum to rose to rust to gold to cream, or navy to teal to mint), plus at most two to five accent colours for things that must pop; clean bands, with 4x4 Bayer dither only across band edges and never raw noise over whole areas; the light source in the frame (a sun, moon, red sun, rift, circle or lantern) with a glow falloff in the sky and rim light on whatever faces it; lots of empty space and one focal point; code draws landscapes (sky, clouds, ridges, water, fields, fog) and hands draw things (characters, buildings and props as text-row sprites, usually silhouettes that get their rim light automatically; round organic things like a fish head or the loaf may be procedural if shaded like 3D forms); motion is small and constant (wind, ripples, blinking eyes, cloth, drifting clouds, birds); text is HTML in Pixelify Sans over the canvas, placed in canvas-pixel units. The workflow is a loop: write a brief (subject, light and its position, the 12 colours, horizon, focal point, what moves, what the player can do), build the static layers once, render frames headless in Node, look at the PNGs like an art director, fix, repeat three to six times, measure speed (under 4 ms a frame on a laptop, with a small deopt count), smoke-test the real page with jsdom, and ship one HTML file while telling you honestly what is weak or untested. Craft rules from the Reachbound README (`studio/pieces/reachbound-muster/README.md`):

- Hand-draw anything that must read as a thing; code-drawn people and buildings look amateur.
- Glints on water are sparse short horizontal dashes; random dots look like a Christmas tree.
- Light pools stay small and dither out; big flat pools look like orange discs.
- Performance: fixed numbers as plain constants, per-frame numbers in typed arrays, no shared field names across hot objects.

## The quality bar, and what you liked and hated

- **[CANON]** The quality bar for every visual in the studio is the Still Water boat scene: clean, calm, one light, one subject. Don't ship below it. (art direction, studio brief)
- **[CANON]** Your remakes of your "Souls games pixel-art" posts (tower, city, wolf) fell short of that bar in your eyes. You chose rebuilding visuals in code over animating your original images. (art direction)
- **[CANON]** Pixel work should feel majestic and medieval-fantasy; this world leans horror-tinged and folkloric. (art direction)
- **[CANON]** Kept from the style experiments: Kabbalistic minimalism (good for concepts), VHS broadcast ("super great"), declassified dossier. (art direction)
- **[CANON]** Hated: the hand-drawn ink sketch look. Never use it. (art direction)
- **[CANON]** Loved: Kolobok (the floured loaf in the sunset valley) and the Muster creature menu. (art direction)
- **[CANON]** The Summit Road: you liked its lighting, not the rest. (your note to this bible)
- **[CANON]** Everything should be usable in real games (itch.io, Steam) and in your TikTok videos, with text overlays for editing. (art direction)
- **[CANON]** The art style of Still Water was taken from your @nakofrish image "AM: The Verdant Reach". (studio lore, [his]) The letters AM remain rejected as a continent name; see [12-archive.md](12-archive.md).
- **[PROVISIONAL]** This bible's reading of the look the pieces share: majestic scale, one calm light, a small figure against something large, horror arriving quietly (a sun that is an eye, crows standing on nothing, a stone that stares). It matches the monumental-and-ordinary contrast in [13-writing-guide.md](13-writing-guide.md). Not a statement from you.

## Palettes by name

**[CANON]** The ramps named in the art direction, 12 steps dark to light, as written there (`studio/art/art-direction.md`):

- **Dusk** (Kolobok, the Stone Elder, and the Loaf portrait, which reuses it): `#0f0a1c #1b1230 #2a1943 #3d2150 #552a5a #70345e #8f425e #ad5558 #c96e4f #df8f4b #efb85a #fbe29a`
- **Night lake** (Pebble Folk): `#070b14 #0d1524 #132036 #1b2c45 #233b56 #2d4c66 #3a6076 #4a7686 #5f8e96 #7ba8a8 #a3c7c0 #d9ecdf`
- **Green dawn** (Verdant Knight): `#08110d #0e1c16 #14281d #1b3625 #23452d #2e5635 #3c6a3c #518143 #6d974c #93af5c #c1c877 #f0e7a7`
- **Red sun** (the Fish portrait; the art direction also lists Still Water, but Still Water's own blood ramp differs, see below): `#0d0507 #1a080c #2a0d12 #3d1116 #52161a #6b1c1d #862520 #a33426 #c04a30 #d9683e #ee9055 #fcc27a`
- **Storm violet** (the Covenant's Hunter; its first ten steps are also the sky of Field Tips card 7 and card 10): `#07060c #0e0c17 #161324 #1f1a31 #2a2240 #362b4f #45355e #58436e #6f567f #8b6f92 #ae92aa #dcc6cc`
- **Accents:** flour `#6f6384 #9a8fae #c9c0d2 #f1ebea`; stone-folk eyes `#bff0cf`; menu brass `#7a5a26 #b08a3e #dcbf73`.

**[CANON]** Ramps that exist in the shipped pieces but have no name in the art direction. The hex values are from the source files; the names below are descriptive only (**[STUDIO PROPOSAL]** as names):

- **Still Water day:** `#0a1a33 #0e2444 #13305a #1a3f72 #214f89 #2a609e #3673b1 #4687c2 #5e9ed3 #7fb6e1 #a9d2ee #eaf7ff`
- **Still Water night:** `#02030a #060a1a #0b1128 #111938 #172248 #1e2b58 #263568 #314177 #3e4f86 #506096 #6878a8 #8e9cc4`
- **Still Water blood** (the red sun; the whole world recolours through day, night and blood): `#060103 #130207 #24040c #380710 #520b14 #6e0f17 #8c1519 #aa1d1b #c62b1f #de4426 #f06838 #ff9e5e`
- **Loaf-crow dusk** (Reachbound, Loaf Crows): `#0d0b17 #17132a #221b3b #2e244a #3c2e57 #4d3a62 #62476b #7a5570 #956671 #b27a70 #cf9676 #ecbf8a`, accents `#5f7fb0` (wing sheen) `#f2e6c8` (crow eye)
- **Collector night** (Reachbound, The Collector): `#05070c #0a0f18 #101825 #172233 #1f2d42 #283a52 #334863 #405874 #516a85 #667f96 #8197a9 #a9b8c3`, lantern accents `#7a3d12 #d98a2b #ffd27a #fff4d4`
- **Projection maroon** (Reachbound, The Projection): `#060407 #0d080d #150d14 #1e131b #281a23 #34222c #422b36 #523643 #644352 #7a5263 #946676 #b3838f`, circle accents `#1d6b3f #3fbf6e #9cffb8 #e8fff0`
- **Old-magic cold** (The Summit Road, "one cold ramp of Old magic, green fire accents"): `#07070f #0c0f1c #12192b #192438 #213244 #2a4150 #35525b #436666 #557c70 #6e957d #94b290 #cddab6`, accents `#2e8f5f #6fe39c #c8ffd9 #f2fff4`
- **Menu chrome** (Muster, Reachbound and Hero of the Reach UI: green lacquer and brass): `#0a110e #111c17 #182720 #22352b #2e4637 #3f5a44 #4b3518 #7a5a26 #b08a3e #dcbf73 #fbeec2`, mint `#86e0b4`
- **Reach vignettes** (per scene a cool 12-step ramp, a warm 8-step ramp and two accents):
  - Knight's camp, cool: `#05060d #0a0e1c #0f1729 #152137 #1c2c46 #263a56 #324a66 #415c76 #566f86 #708796 #8fa2aa #b9c4c0`
  - Knight's camp, warm: `#2a0e0b #4a160d #6e2410 #963714 #bd5418 #dc7a24 #f0a53a #fbd878`
  - Knight's camp, accents: `#f2f0dc #fff3c4`
  - Castle of the Order, cool: `#0b0816 #140f24 #1d1732 #282040 #342a4e #43365c #56446a #6b5579 #836a88 #9d8198 #b99aa8 #d6b9b8`
  - Castle of the Order, warm: `#3a1410 #5c1f14 #83301a #a8461f #cb6526 #e58a33 #f6b24c #ffe08a`
  - Castle of the Order, accents: `#fff6d6 #ffd27a`
  - Still Water at dawn, cool: `#070c14 #0d1624 #142236 #1c3048 #263f5a #32506b #41627b #55768b #6d8c9c #89a5ae #aac0c0 #d0dcd4`
  - Still Water at dawn, warm: `#3a1a1a #5e2a22 #86402c #ad5a35 #cf7b40 #e9a052 #f8c86c #fff0b0`
  - Still Water at dawn, accents: `#fffbe8 #ffe2a0`
- **Field Tips material ramps** (one 256-colour palette of short ramps):
  - sky: `#16294a #1d3560 #254377 #2f548c #3c66a0 #4f7bb0 #6a92bf #8aa9c9 #b2c3cf #e2d6bc`
  - cloud: `#46526c #5c6882 #788197 #989ca7 #bab3a6 #d8c7a4 #ecd9b2 #f7eacf #fff8e8`
  - hills: `#2f4862 #3f5a75 #567189 #7590a3`
  - wheat: `#2a2512 #433b18 #5c5120 #776827 #927f2f #ad9638 #c6ac47 #dcc262 #efd98a`
  - grass: `#0c150f #142318 #1f3320 #2c4628`
  - road: `#33281d #4b3c2b #64523a #7e6a4c #9a8462 #b9a47e`
  - wood: `#1a100a #2a1a0f #3b2515 #4f321c #644024 #7a4f2d`
  - iron: `#16181c #33373f #5c626c #9aa1aa`
  - crow: `#0a0a10 #1b1f2e #3a4b6c`
  - cape: `#330d0d #561813 #7a241b #a03724 #c75536`
  - steel: `#23262d #434852 #6f7682 #a9b1bd`
  - flour: `#c9c0b4 #f1ebe0`
  - meadow: `#14200f #1f3014 #2c4219 #3b5520 #4d6927 #627d2f #7b923b #98a84c #b8bf66`
  - stone: `#1b1a1f #2a282e #3b383d #4e4a4d #64605f #7c7773 #97918a #b4ada2`
  - mint eyes: `#2f7a58 #9ff5c5`
  - red-sun sky: `#1a0a12 #2b0f18 #40141c #5a1a20 #771f22 #962a24 #b23d2a #cc5a33 #e2803f #f2ac58`
  - red-sun cloud: `#2a1018 #45161c #661e21 #8a2a25 #ad3f2b #cc5d34 #e5843f #f5ac56 #ffd583`
  - ink: `#0a0506 #1c0b0d`
  - night sky: `#060a16 #0a1022 #0f1830 #15213f #1c2b4f #25385f #31476f #41597f #566e90 #7086a2`
  - night cloud: `#141c2e #1e283d #2b364d #3b4760 #506078 #6b7a92 #8c9aae #b3bfcd #dfe6ee`
  - night meadow: `#05080a #0a1012 #0f181a #162224 #1f2d2e #2a3a38 #38493f`
  - lamp: `#7a3d12 #d98a2b #ffd27a #fff4d4`
  - flour (red card): `#6f6384 #9a8fae #c9c0d2 #f1ebea`
  - violet sky: `#07060c #0e0c17 #161324 #1f1a31 #2a2240 #362b4f #45355e #58436e #6f567f #8b6f92`
  - violet cloud: `#120f1d #1d182c #2a223c #3a2f4e #4d3e62 #634f77 #7e658e #9f82a6 #c6a9c3`
  - bolt: `#2e8f5f #6fe39c #c8ffd9 #f2fff4`
- **Hero of the Reach material ramps:** stone `#0d0a0c #171114 #21181b #2d2024 #3b2a2c #4d3736 #634641 #7d5a4e #9a735f`; sky `#0a0f22 #111836 #1a234c #26315f #384474 #525d8a #7a7fa0`; steel `#0c0e13 #161a22 #222936 #323b4c #465266 #606d82 #8190a4 #abb8c6 #dde5ec`; gold `#241508 #452a0e #6e4518 #9b6a28 #c9993f #eecb74 #fff0bc`; green `#07120c #0d2015 #14311f #1c4429 #275a35 #357243 #4a8c52`; flame `#5c1d0c #a8441a #e07d2a #f8b848 #fde68e #fffbe0`; parchment `#3c2c1c #6b5238 #9c7f58 #c9ae80 #eadbb4`; mint `#2f7a58 #86e0b4 #d8fff0`.
- **Souls studies:**
  - tower: `#0b1026 #121a38 #19244a #212f5c #2a3b6c #34497a #3f5886 #4d6890 #5e7a98 #738c9e #8e9f9f #b4ae98 #d9bf93 #f3dcb0 #fff4e0`
  - tower reds and ambers: `#3a0a08 #7a140e #b8221a #e0442a #ff8a3a #ffd27a`
  - tower cool whites: `#9fb0c6 #c3cedb #e2e8ef #f8fafc`
  - city: `#0c0f18 #141a26 #1c2533 #263140 #313d4c #3e4a58 #4c5864 #5c6770 #707a7e #8a8a82 #a8977e #c79e72 #e0a862 #efbd6a #f7d68c #fdefc4`
  - city greens: `#0f1d17 #17291f #21382a #2f4c36 #446a45`
  - city roof rust: `#5e2a1f #8a3d26 #b8552f #dc7a45`
  - city window yellows: `#ffd27a #fff0b8`
  - city light pillars: `#cfe0f0 #eef6ff`
  - wolf: `#06071a #0b0e26 #111633 #171e41 #1f2850 #28335f #333f6f #404d80 #505d90 #626fa0 #7682b0 #8d98c0 #a8b1d2 #c6cde3 #e4e8f3 #f7f8fc`
  - wolf figure purples: `#1c1430 #2c1f46 #402d5e #5a4078`
  - the wolf's eye: `#eef3ff`
- **Page colours and type:** Summit Road page `#07070f`, ink `#eef6e4`, dim `#a9c9b2`, glow `#8ff0b4`; Hero of the Reach page `#0a110e`, ink `#fbeec2`, brass `#dcbf73`, dim `#b7c7b1`, mint `#86e0b4`; Reach vignettes page `#05060d`, ink `#f2ecd9`, dim `#b8c0c8`, warm `#f0a53a`. Games use Pixelify Sans; the Field Tips sign text uses Cormorant Garamond.
- **[PROVISIONAL]** The mint of watching eyes drifts between pieces: `#bff0cf` (Kolobok, Muster and Reachbound stone ramps), `#9ff5c5` (Muster and Reachbound pebbles, Field Tips), `#86e0b4` (Hero, menu chrome). One value should be chosen when the engine is built.

## The pieces

One line each, with the live link, where the files live under `studio/`, and your verdict where you gave one. Links were checked against your artifact list.

- **[CANON]** **Still Water** (the quality bar). https://claude.ai/artifact/FPAPfmQk1pJAg8wAp7Q4gW. A short playable fishing-horror vignette, 216 wide (384 to 470 tall by screen), one HTML file: a lone fisherman rows onto a glass-still mountain lake at dawn, catches fish whose names and descriptions turn wrong act by act, and is offered three wishes by a talking golden fish; after the second wish the sun sets and the lantern is lit; at the third a huge red "sun" rises on a line from above the sky and opens a pupil. Three endings: Home, Dark, Still water. Files: `studio/.claude/skills/pixel-scenes/examples/still-water/still-water.html`. Lore: `studio/lore/still-water.md`. Your concept [his]; the boat scene is the bar for everything. A separate "Still Water (test build)" artifact also exists in your list (https://claude.ai/artifact/MbzDTpHAJMRaY1Hwvt4m7f); what it differs in is not recorded.
- **[STUDIO PROPOSAL]** **Still Water Story Map.** https://claude.ai/artifact/Btj4J9sKkAKqgRqeUmB4zv. Design draft 7 of an expanded Still Water: eight state flags, a "Nothing" option, an ocean cutscene, a gold-sink cutscene, a companion who asks "Will you stay?", six endings (Home, Dark, Still water, Stay, Deep, Swallowed) plus a Silent variant, cross-run callback lines, a 4.5 to 6.5 minute run; rule "callbacks, not forks". Saved as `studio/lore/still-water-story-map.md`. The lines in it are proposed copy, not yours.
- **[CANON]** **Kolobok** (playable). https://claude.ai/artifact/3z5ULtEzLPM45CfebB5ky9. "Kolobok. A tale from the Verdant Reach." You stand on a hilltop 24 m above a wheat valley at dusk beside a leaning stone elder with NOT OURS cut into its face and four pebble folk; an invisible hill-sized loaf (radius 15 m before anyone feeds it) rolls a loop through the wheat with five crows riding its crust; you sling nine sacks of flour to see it; a flour bell on a pole bursts when the loaf hits it; the dough drinks the flour and grows. Endings: Not ours, Seen, Fed. Files: `examples/kolobok/` (`1_engine.js`, `2_sim_render.js`, `3_story_ui.js`, `shell.html`, `build.py`, `kolobok.html`). Lore: `studio/lore/kolobok.md`. You loved it.
- **[CANON]** **Muster of the Reach** (six creatures, the earlier version). No separate link recorded. A creature menu in the Still Water technique: Pebble Folk, Stone Elder, Verdant Knight, The Fish, The Covenant's Hunter, Kolobok; portraits, six stats, a lore line, tap lines, sounds, a six-thumbnail roster strip. Files: `examples/muster/` (`muster.js`, `muster.html`, `shell.html`, `build.py`). Lore: `studio/lore/muster-roster.md`. You loved the menu.
- **[CANON]** **Reachbound: Muster of the Reach** (nine creatures). https://claude.ai/artifact/XKmtZuNeVjrmTn7FtQZ2Ex. The roster grown to nine with Loaf Crows, The Collector and The Projection; one self-contained HTML file, no libraries; about 1 ms a frame. The roster strip shows six thumbnails and follows the selection; creatures switch by prev/next, swipe, arrow keys or tapping a thumbnail; Space/Enter taps the portrait; switching dips to dark and back. Files: `studio/pieces/reachbound-muster/` (`src/reachbound.js`, `src/shell.html`, `build.py`, `reachbound-muster.html`, `lore/roster.md`, `README.md`, `CLAUDE.md`, `scripts/`). Roster below.
- **[CANON]** **Reach Field Tips** (13 cards). https://claude.ai/artifact/Kry5ZuNr7mC5zvnZXmZPTG. Illustrated lore-tip cards drawn entirely by code, 4:5 at 320x400 (x3 = 960x1200): a wooden plank sign with iron corners, a one-line tip in Cormorant Garamond, on nine of the cards a small red-caped traveller facing one hazard of the Reach, sphere-shaded cumulus drifting a pixel at a time, a low sun at upper left on day cards, lake cards mirroring everything above the waterline. Tap a card and the scene reacts. Files: `studio/pieces/reach-field-tips/` (`tips.js`, `shell.html`, `build.py`, `reach-field-tips.html`, `README.md`, `scripts/`). Tips below.
- **[CANON]** **Hero of the Reach.** https://claude.ai/artifact/TMnEAedcMtM2bpEuv17R1r. A character sheet at higher resolution (320 wide, 568 to 700 tall): Sir Aldren, "Verdant Knight, Third Oath", a small 3D signed-distance bust in plate with a green tabard and a gold leaf, in a candlelit stone room with an arched window on the Reach at dusk; six tappable gear slots, a covenant box, four stats, three skills, a lore panel; the candle flickers, dust drifts in the window light, mint eyes blink in the visor slit. Files: `studio/pieces/hero-of-the-reach/hero-of-the-reach.html` (no README, no lore note, no attribution of what is yours, no cookbook entry). Names and text below are **[STUDIO PROPOSAL]** / **[GAME TEXT]** until you say otherwise.
- **[CANON]** **The Summit Road.** https://claude.ai/artifact/9EhJvwBE3e9GQ9RrEdZUPF. A looping vignette (216 wide): a dark walking figure, "the cursed warrior", walks forever up a paved slab road along the crest of a symmetric ridge of ancient terraces toward a colossal hazy summit crowned with green-white lightning; colossal blades, "relics: colossal blades left from the war of gods", stand leaning in the ground along both sides of the road; a cloud sea fills the flanks; god rays; green motes of Old magic rise; a green-glowing sword, carried in his right hand with the blade trailing, drags behind him and sparks where its tip touches the road; high wind, a low drone and thunder. Six captions loop; a tap triggers a big lightning strike and advances to the next caption; the summit never gets closer; there is no ending. New techniques: voxel-space terrain, depth fog in ramp space, god rays, an animated cloud sea, lightning with a palette flash, palette cycling on the blade, a walk cycle. Files: `examples/summit-road/` (`summit.js`, `summit-road.html`, `shell.html`, `build.py`). You liked its lighting, not the rest.
- **[CANON]** **Reach vignettes: old rules vs upgraded.** https://claude.ai/artifact/Ehc9dDRkHuy6QPjuF1d7YZ. Three flat 2D scenes with a toggle between "Old rules" and "Upgraded": Knight's camp by the river (fire against the cool night, a knight on a log, a tent, a river mirroring the moon), The castle of the Order at dusk (layered ridges with parallax, candle-lit windows, banners, a flock crossing), Still Water at dawn (a half-risen sun, mist bands, a pier, a fisher with a line). The upgrades named in its code: a warm and cool split by light source, light pools with flicker, two-light rims, layered atmospheric depth with parallax, purposeful particles, palette-cycled shimmer, foreground framing, a vignette. No local file under `studio/` as of this bible; the artifact is the only copy.
- **[CANON]** **Souls games pixel-art remakes** (tower, city, wolf). https://claude.ai/artifact/8bdZgzv7Njme7ghr6JiUps (from your artifact list; the studio folder records no link). One page titled "Souls games pixel-art", credited "after @nakofrish": three animated 216x216 scenes, The tower ("a dark gothic tower rising from a sea of clouds, a red-cloaked figure on the ledge below", with embers and circling birds), The city ("a cathedral city at sunset under storm clouds, with two bridges over a river" that mirrors the scene, and pillars of light), The wolf ("a giant wolf in a misty moonlit pine forest facing a small cloaked figure with a sword"). Not Reach content: nothing in the page names the Reach, the knights, the fish or Kolobok; the only ties are the shared technique ("Still Water engine") and your handle. You judged them below the bar. Files: `examples/souls/souls-scenes.html`.

## The Reachbound roster

- **[CANON]** Attribution from the studio (`lore/roster.md`): "His lore: pebble and stone folk, Kolobok, the fish, the knights and covenant, the Hunter, the Collectors, the necromancer's projection and the cursed warrior. Claude's proposals: the stats, the tap lines, the Kolobok backstory details."
- **[CANON]** Stats, available counts and growth rates are placeholders a previous Claude made up; you will set real numbers. They are never lore. Most creature names are placeholders too. (studio lore, README)
- **[GAME TEXT]** The six stats shown are Attack, Defense, Damage, Health, Speed, Growth. The screen reads "Tier N, Home", "Available N", "Tap to make it act." and "Sound on" / "Sound off".

| Game tier | Creature | Home | Available | Attack, Defense, Damage, Health, Speed, Growth (placeholders) | Lore line as shipped [GAME TEXT] | Whose idea |
|---|---|---|---|---|---|---|
| 1 | Pebble Folk | Still Water shore | 42 | 1, 4, 1–2, 3, 3, +16 / week | Roll to travel. Blamed for the Loaf's tracks, so they learned two human words. | Yours (pebble folk); the shore home is a studio proposal |
| 2 | Loaf Crows | Wherever it rolls | 30 | 3, 2, 1–3, 5, 9, +12 / week | They ride what no one can see, pecking crumbs off its crust. | Studio proposal (crows on nothing was a proposed sign of the loaf) |
| 3 | Stone Elder | Field stones | 5 | 6, 16, 4–7, 60, 2, +2 / week | Mills grain between two of its kind. Cut the only phrase it knows into its own face. | Yours (stone folk); the milling and the carved face are studio proposals |
| 4 | Verdant Knight | Castle of the Order | 9 | 11, 12, 6–10, 35, 6, +3 / week | Escaped a death that cannot be escaped. The covenant keeps it waiting, one knight at a time. | Yours |
| 5 | The Collector | The ruins | 3 | 5, 5, 2–5, 20, 7, +2 / week | A Librarian reborn. Follows visions toward a Library that no longer exists, and finds everything else. | Yours (the Collectors) |
| 6 | The Fish | Still Water | 1 | 0, 3, one wish, 8, 7, none | Grants wishes word for word. Then the sun goes red. | Yours |
| 7 | The Projection | A necromancer's circle | 1 | 24, 8, 20–30, 90, 8, one per ritual | Not a spirit: a thousandth of the cursed warrior, pulled through a circle. Only the sword is solid. | Yours (the necromancer's projection, "about 1/1000 of the warrior's power" [working]) |
| 8 | The Covenant's Hunter | Between moments | ? | 30, 25, one blow, ?, whenever, one per knight | One continuous fight on its side. Twenty years between blows on yours. | Yours |
| 9 | Kolobok | The roads | 1? | 25, 40, 50–80, 1200, 11, +1 size a sack | No one can take it. No one can see it. Flour shows it, and flour feeds it. | Yours (premise); the flour-feeding rule is a studio proposal |

- **[GAME TEXT]** Tap lines, in the order they cycle: Pebble Folk "not ours not ours not ours" / "not ours!"; Loaf Crows "Kraa." / "They're walking on nothing again."; Stone Elder "NOT OURS." / "SOFT ONE. NOT OURS."; Verdant Knight "The covenant holds." / "Not today."; The Collector "Do it all in one life." / "Not this door either."; The Fish "One wish. Choose the words." / "I grant it word for word." / "When I ask for your last wish, cut the line."; The Projection "It does not know it is a copy." / "The sword still wants everyone."; The Covenant's Hunter "Twenty years pass." / "It lands the last blow. Nothing else may."; Kolobok (sung) "I rolled from the bin and I rolled from the sill..." / "I rolled from your flour, and I'm hungry still."
- **[GAME TEXT]** Things the portraits show that the lines do not say: the Hunter steps through a rift, blinks every 7 to 10 seconds, switches pose, and a bare tree beside it grows a stage (up to three) with the caption "Twenty years pass."; Kolobok is a sphere visible only where flour clings, re-dusted every 11 seconds, with four crows standing on top ("crows standing on nothing") and a long shadow only where the flour is; the Stone Elder has NOT / OURS carved below its eyes (the pixel font holds only the letters it needs) and three small pebble folk at its foot; the Collector is a hunched hooded figure with a staff and lantern beside a ruined arch, "an arch that opens onto nothing", with "stars that shouldn't be there" inside it; the Projection is a translucent dithered copy of the Verdant Knight's silhouette at double size, the cursed sword "the only solid thing", a small hunched necromancer with raised arms at the left; the Fish is a huge head breaking the surface, one big pale eye with its pupil on the viewer, lips and barbels; the Verdant Knight stands at dawn with a banner pole and pennant and light showing through the visor, a far hazy castle on its own hill behind.
- **[GAME TEXT]** Sound keys: pebbles (Pebble Folk, Loaf Crows: clicking tones), stone (Stone Elder), sword (Knight, Collector), fish (Fish), blink (Projection, Hunter: a noise sweep and a low sawtooth drone), burst (Kolobok).
- **[CANON]** The earlier six-creature Muster numbered them Pebble Folk 1, Stone Elder 2, Verdant Knight 3, The Fish 4, The Covenant's Hunter 5, Kolobok 6, with the same placeholder stats and lore lines. `studio/lore/muster-roster.md` omits the pebbles' "not ours!", points to still-water.md for the Fish's lines (which lists two of the three) and writes "Kolobok sings" instead of the verses.
- **[CANON]** Five lore lines differ in wording between `src/reachbound.js` (shipped) and `lore/roster.md`: Stone Elder "Cut its one phrase into its own face."; Verdant Knight without "one knight at a time"; The Collector "A Librarian reborn, following visions toward a Library that no longer exists."; The Projection "A thousandth of the cursed warrior. Only the sword is solid."; Kolobok "No one can take it or see it." The shipped lines are quoted in the table.

## What the games say: the scripts

### Reach Field Tips: the 13 tips

**[GAME TEXT]** All 13, verbatim, with what the card shows. The recurring figure is a traveller in a steel helm and greaves with a red cape; the code calls him a knight on cards 7 and 13. Watching things have mint-green eyes. Crows are the signal of the unseen.

1. "If the road smells of warm bread and nothing's on it, get uphill. It's slow uphill." Crows standing on nothing over a wheat-field road, a round track pressed into the wheat, a flour bell (a pole, a crossbar, a hanging sack) by the road, the traveller.
2. "If a standing stone stares at you, apologise. It knows two words, and it's tired of saying them." "The stone that knows two words": a tall standing stone whose eyes open mint-green and which shakes when tapped; pebbles at its foot with blinking eyes that hop; the traveller. Tap: the stone shakes, its eyes open and the pebbles hop.
3. "If the fish offers a wish, say it word for word. When it asks for your last one, cut the line." Still Water under the red sun: "a boat, a fisher, a line, and rings where the line meets the water".
4. "If you find a door standing alone in a field, look through it. Don't walk through it. The Library isn't there anymore." A worn stone arch in a night meadow, moonlit on the left; "through it, a golden afternoon from somewhere else"; motes drifting inside the arch; a hunched hooded figure with a lantern beside it (sprite named COLL in the code, the Collector's silhouette).
5. "If a flour bell bursts and nobody's near it, don't stay to see what's there." "The flour clings to something huge: a white hill on the road, patchy where it has already drunk the flour"; crows on its top; "the bell: a snapped pole and an empty, torn sack"; the traveller. Tap: the flour coat thins.
6. "If the pebbles on a lakeshore blink at you, don't skip them across the water. They remember." Pebbles on a stony shore at night under a moon, each with blinking mint eyes, occasionally hopping; the lake mirrors the sky.
7. "If a knight goes grey in the middle of a sentence, step away. Something just blinked in." A violet night; a green bolt; a tall figure with two green eyes fades in behind the knight, holds, flickers out; while it is there "his hair, going grey". Tap: the tall thing fully appears.
8. "Every castle in the Reach is built different. If two look the same, one of them isn't a castle." Two identical hilltop castles with lit windows; "the right one is not a castle: its gate breathes, a window looks back" as a mint-green eye.
9. "If a kingdom throws you a feast the night you arrive, count the exits before the second course." "The eastern kingdom's welcome feast": "a city of towers and domes along the horizon, every window lit", a lamp-lined road toward it, "fireworks over the city, a welcome too warm", one of them mint-green.
10. "If you see green lightning over a mountain no map shows, don't read any scroll near it." A single tall peak at night with a green glow at its summit and green bolts forking from it. Tap: the bolts double.
11. "If the crows on a fence all go quiet at once, watch the road, not the sky." Six crows on a post-and-rail fence in wheat; they hop, then all go still and face one way; a track through the wheat. Tap: the crows go quiet and all face the road.
12. "Stone folk will mill your grain for free. Never ask what they do with the flour." Two standing stones with mint eyes rocking toward and away from each other, flour rising between them, "the little heap they've made".
13. "Knights of the Order don't celebrate birthdays. Ask one why, and he'll tell you how many years he has left." "A knight on the wall, counting": the traveller on a stone battlement at night under a moon; "far off on the ridge, something tall stands and waits" with two green eyes, fading in and out.

### Kolobok: song, stone and pebble lines, captions, endings

- **[GAME TEXT]** The loaf's song, heard only when it is near: "I rolled from the bin and I rolled from the sill, / I rolled from the miller, I rolled from the mill, / I rolled from the knights and the stones on the hill, / and I'll roll from you. I am rolling still." After it is fed: "I rolled from your flour, and I'm hungry still."
- **[GAME TEXT]** The stone elder (tap it): "NOT OURS." "NOT. OURS." "SOFT ONE. NOT OURS." "GO. NOT OURS." The pebbles: "not ours not ours not ours" "not ours!" "not ours, not ours". On the first flour hit the elder says "NOT OURS." unprompted.
- **[GAME TEXT]** Captions in order of play: "Warm bread on the air. Nothing on the road." "The crows are standing on nothing." "The flour bell burst." "There it is." "It drinks the flour." "It's bigger now." "Every sack makes it bigger." "Flour on the wheat. Nothing under it." "That was the last sack." "It takes the road." Tapping with no flour: "No flour left in the village." Prompts: "Tap it to sling flour", "Aim where the crows stand". HUD: "9 sacks of flour" down to "1 sack of flour" and "No flour left"; "Endings found: N of 3".
- **[GAME TEXT]** Endings. Not ours (no hits): "Nine sacks on the wheat and not one on the loaf. Tomorrow a mason gets paid for another stone." Seen (1 to 4 hits): "You saw it roll, and so did the road. Nobody blames the stones tonight. It's a little bigger for it." Fed (5 or more): "You saw it every time, and every time it drank the flour. It left singing a new verse. The verse is about you."
- **[GAME TEXT]** What the scene shows: field strips, cart ruts on the road, a lake at the horizon; wheat flattened along the roll where the loaf passed, the track fading over about two minutes; three baker's slashes across the loaf's top; seven lumps in its crust that are "pebble folk it rolled over, still stuck in the crust"; crows walk against the roll to stay on top and scatter when flour lands; only floured parts cast a shadow; each hit grows it and the coat is drunk after a short hold.

### Still Water: voices, the fish, endings (the built version)

- **[GAME TEXT]** Title: "Still Water. A short fishing tale." Controls: "Tap to cast. Tap when the float dips. Hold to reel." Opening: "The lake is so still it could be glass." Approach captions by act: "The water goes very still." "Something gold turns beneath the surface." "The lantern flame leans toward the water."
- **[GAME TEXT]** UI strings: "Tap to begin", "Tap to continue", the catch counter "1 fish" / "N fish", and the stage label "Still Water, a short fishing game".
- **[GAME TEXT]** The fish you catch change name and card line by act. Glass perch ("You can see its heart beating through it." / "Its heart isn't beating.") becomes Eyeless perch ("It's warm. Fish shouldn't be warm."). Mirror char ("Its scales show you the sky." / "Its scales show you a red sky.") becomes Hollow char ("Its scales show someone sitting behind you."). Blue smelt ("Small, cold, perfect.") becomes Grinning smelt ("It has teeth. Smelt don't have teeth." / "It is smiling at you."). Fjord trout ("It fought like it had somewhere to be." / "It keeps looking at the sun.") becomes Drowned trout ("It was already dead. It fought anyway."). Needle eel ("Longer than it has any right to be.") becomes Knot eel ("It tied itself in a knot so you'd let go.") then Endless eel ("It is still coming out of the water."). Pale grayling ("It smells of snow." / "It smells of smoke.") becomes Ash grayling ("It smells like you.").
- **[GAME TEXT]** The three voices on the water (heard once you have wished to understand the fish): "When it asks for your last wish, cut the line." "That sun is bait." "Don't look at the horizon."
- **[GAME TEXT]** The golden fish: "Wait. Don't gut me, fisherman." "Put me back, and I'll grant you a wish. Three, if you're patient." Let it go: "Kind. Kindness is rare out here." Keep it: "You tighten your grip. It slides through your fingers like water." "Cold hands can't hold me. Now. A wish." Then "Tell me what you want." First wish options: Someone to sit with me ("Done. Someone will keep you company." "Don't ask them who they are."; a companion fades into the boat), More fish ("Done. This lake will never be empty again."), A home on the shore ("Done. Look, a light on the shore." "It was always yours. You just never noticed."). "When you want the next wish, just cast." "The sun sits a little lower now." Second: "Back so soon? The lake remembers every wish." Options: Make this day last forever ("Forever is a long time for a sun." "Let this one rest. I know a sun that never sets."), Let me understand the fish ("Listen, then." "They talk about me constantly."), Gold. A boat full of it ("Gold is heavy. Mind the waterline."). Sunset: "The sun slips into the lake like a coin into a well." "You light the lantern." Red sequence: "The line goes taut. Something is pulling it toward the horizon." "One wish left." "But first, the sun I promised you." "Something rises where the sun went down." "It is not a sun." Third: "Every sun is bait, fisherman. Look up. Do you see the line?" "You thought you were fishing. You were swimming toward the light." "And those were never mountains." By wish: "The light on the shore was mine too. It always is." "All those fish I gave you. Did you think they were food?" "And all that gold. You'll sink so nicely." "You wanted a sun that never sets. Here it is." The companion turns (the palette has a slot for red eyes): "Don't answer it. Cut the line." The lake, if you understood the fish: "cut the line cut the line cut the line". Options: Let me go home ("Home. Yes." "Come inside."), Take the red sun away ("As you wish." "Without light, you won't see the teeth. That is my kindness."), Cut the line ("You draw your knife across the line." The fish, cut off: "No. Nobody cuts the").
- **[GAME TEXT]** Endings. Home: "The lake is quiet again. The fish are hungry. Somewhere, a new sun is rising for the next fisherman." (the sky and water close like a jaw.) Dark: "You sit with the lantern until it gutters out. Sometimes something takes the bait. You never reel it in." (an eyelid closes over the red sun; the lantern dies.) Still water: "You row until the water is only water. You never fish here again. Some evenings, the sunset looks back." (the stalk is cut, the red sun sinks with a hiss, a real dawn, you row away.) "Endings found: N of 3". Restart button: "Cast again".
- **[GAME TEXT]** The red sun rises where the sun set, opens a slit pupil that shifts to look at the boat, hangs on a line (a "stalk" in the code) from the top of the sky, and ash drifts down while it is up; a heartbeat sounds every 1.7 seconds. The story map (above) and its proposed lines are in `studio/lore/still-water-story-map.md`.

### Hero of the Reach: Sir Aldren's sheet

- **[STUDIO PROPOSAL]** The name Sir Aldren, the rank "Verdant Knight, Third Oath", the name "the Verdant Order", the leaf as the Order's device and the oath hand all appear only in this piece, with no lore note and no [his] mark.
- **[GAME TEXT]** Default panel: "Knight of the Verdant Order, bound by the covenant. Tap his gear to inspect it." Hint: "Tap an item or the portrait." Covenant box: "Covenant: bound. The Hunter last came 20 years ago." Tap the portrait: "The Hunter came twenty years ago. It will come again. Until then, the road."
- **[GAME TEXT]** Gear: Verdant Blade, "Plain steel, kept sharp. The Order forbids cursed blades, and everyone knows why." Leaf Kite, "Every castle paints its own. This is the Order's leaf." Rally Scroll (copy), "A copy of the scroll from the legend. No one has ever read it aloud." Signet of the Order, "Worn on the oath hand. The stone is cold even in summer." (the stone is drawn in the mint ramp.) Flour Sack, "For the roads at harvest. Throw it hard, and don't stay to watch." Covenant Seal, "The wax of the covenant. It has never cooled." (wax in the flame ramp, stamped with a leaf.)
- **[GAME TEXT]** Stats (placeholders): Might 9, Guard 11, Will 7, Lore 4. Skills (names only): Oathcraft, Stand Fast, Rider.
- **[GAME TEXT]** The look, from the code's own labels: a great helm ("cylinder and dome, a visor slit, breaths, a centre ridge") with a plume; a gorget; a breastplate with "the keel" and "fauld plates"; pauldrons and lames; "the Order's green tabard" with "a gold leaf on it"; a cape; eyes in the visor slit that blink. The room: "stone wall, arched window, candle", masonry "lit by the candle in steps", a "cool spill off the window reveal" and a sill, "the Reach at dusk through the window" with "a far castle". The bust is "a small 3D signed-distance model shaded once into material ramps (steel, gold, green, stone), at two candle strengths; each frame dithers between them for a real flicker."

### The Summit Road: the six captions

- **[GAME TEXT]** Subtitle: "A legend from before the Old Age" (see the contradiction on eras). Captions, one every 11 seconds, looping forever: "He read the scroll so the sword could hurt no one." "It was never an escape. It was a rally spell from the war of gods." "It sends you to your allies. His allies fell an age before he was born." "The sword will not let him die." "So he walks. Green lightning marks the summit." "He has been walking for a thousand years." Screen-reader label: "a warrior walks an endless mountain road toward a summit crowned with green lightning. Tap for lightning." Code header: "the cursed warrior still walking the endless mountain of Old magic."
- **[CANON]** The files never say "knight", "parallel dimension", "cursed sword" or "near-infinite". The walker is "a warrior" / "the cursed warrior"; the mountain is "endless". Your lore for this legend is in the studio note (`studio/lore/verdant-reach.md`, "The cursed sword and the last stand") and belongs to [03-knights-and-orders.md](03-knights-and-orders.md) and [05-ancient-history.md](05-ancient-history.md).

## Which parts of the games are lore

- **[CANON]** From studio lore marked [his]: the fish grants wishes and then the sun goes red; Kolobok's premise (huge, invisible, shown only by a lot of flour, terrorises roads and fields); the stone and pebble folk hate it because humans attacked them for its damage and learned a few human words to say "he is not ours"; the Verdant Knights' covenant and the Hunter (one continuous fight on its side, twenty years or more on ours, it must land the finishing blow); the cursed warrior, the sword that will not let him die and the rally scroll; the Librarians, the vanished Library and the Collectors ("do everything in one" life); the necromancer's projection of about 1/1000 of the warrior's power ([working]); the eastern kingdom of mages; "each castle is unique".
- **[STUDIO PROPOSAL]** From the studio's writing, not yet yours: the names "the Loaf" and "Soft"; the famine-winter origin and the old woman's wish "Let no one ever take this bread from us" at Still Water; "a wish isn't a spell"; whatever it rolls over sticks; it is running away, not hunting; the song as a boast; foxes trailing it ("Every loaf meets its fox"); flour showing then feeding it; road wardens and flour bells; pebble folk on the Still Water shore and stone folk as field and boundary stones; masons paid per stone; NOT OURS as the one carved phrase; stone folk as natural millers who taught the flour trick; pebble folk stuck in the crust; stopping it as a talking job; Loaf Crows as a creature; the Library door (card 4) and the Collector's arch; the false castle (card 8); knights not celebrating birthdays (card 13); Sir Aldren and all of Hero of the Reach's names; the story map's expanded Still Water; every tap line.
- **[GAME TEXT]** Every quoted line above is the games' script and usable flavor.
- **[NOT CANON]** As lore: stats, tiers, available counts, growth rates, hit thresholds, skill names, timings. Game UI only.

## Known weak spots, in the studio's own words

- **[CANON]** Reach Field Tips: "Cards 6-13 had one review round; people are tiny figures; the wall on card 13 is a plain checker; not tested on a real phone."
- **[CANON]** Reachbound: "Stats, counts and most names are placeholders. The pebbles' shore is a little blotchy; the knight and the Hunter are small silhouettes. Tested in a simulated browser, not on a real phone."
- **[CANON]** Hero of the Reach: no README, no cookbook entry, no lore attribution.
- **[CANON]** The Summit Road: no ending by design; you liked only the lighting.
- **[CANON]** `COOKBOOK.md` has no entries; the engine has not been started.

## Where the files live

Build notes, not lore.

- `studio/CLAUDE.md` the brief; `studio/README.md` the starter notes; `studio/ROADMAP.md` the engine plan; `studio/COOKBOOK.md` (header only).
- `studio/art/art-direction.md` the bar, likes and hates, the named palettes.
- `studio/lore/` `verdant-reach.md`, `still-water.md`, `kolobok.md`, `muster-roster.md`, `other-ideas.md` (top-tier sources) and `still-water-story-map.md` (a saved studio proposal).
- `studio/.claude/skills/pixel-scenes/` `SKILL.md` (the method), `scripts/` (`shoot.js`, `png.js`, `sheet.py`, `dom_smoke.js`), `examples/` (`still-water/`, `kolobok/`, `muster/`, `summit-road/`, `souls/`).
- `studio/pieces/` `README.md`; `reachbound-muster/` (`src/`, `lore/roster.md`, `README.md`, `CLAUDE.md`, `build.py`, `scripts/`, the built page); `reach-field-tips/` (`tips.js`, `shell.html`, `build.py`, `README.md`, `scripts/`, the built page); `hero-of-the-reach/` (`hero-of-the-reach.html` only).
- Not in the folder: the Reach vignettes artifact and the Souls page's live link; the live links above are the only copies of what each artifact shows today.
