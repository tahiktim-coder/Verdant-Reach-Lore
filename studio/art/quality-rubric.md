# Quality rubric: Reach Studio house style

Use this to score a rendered frame and decide: ship, fix, or rebuild.
Score what is on the screen. Do not score what the builder meant.

- **Who scores:** a fresh Claude Code session, or Farhad. Never the session that built the piece.
- **What is scored:** PNG frames from the headless renderer, plus one capture of the real page if the piece has text.
- **Reference frame:** `art/frames/still-water/gold_boat_day.png`.
- **Status:** written 2026-10-02. Revised twice. After blind round 1: dimension 2 was rewritten, 3.5 was
  tightened and 3.7 was added. After blind round 2: the six dimensions got weights, a piece is compared
  with the bar on its signature frame and not on its worst frame, and the evaluator scores the gold frame
  first as a yardstick (see "How to score"). The ship line and every number threshold are still first
  settings. See "Weak or untested".

Where the rules come from: the pixel-scenes skill (`SKILL.md`), `art/art-direction.md`, the cookbook
(`docs/cookbook-claude-ai.md`) and nine code-and-frame studies of the existing pieces.
The body of this rubric names only the reference piece. The code behind each check is listed in the
"Evidence index" at the end. That index says where a check was studied. It does not say which piece
passes or fails. **If you are scoring an existing piece for the blind calibration, stop reading before the index.**

## The bar

This is what is on screen in `gold_boat_day.png` (216 x 384, saved at 3x, title state, t = 2.0 s):

1. The frame uses exactly 12 colours, one blue ramp from navy `#0a1a33` to ice white `#eaf7ff`, and each
   of the 12 covers at least 2% of the frame.
2. The sun is a solid disc of the lightest colour inside the frame, just left of centre and 64 px above the
   waterline, with ring-shaped glow bands around it and a bright wedge on the horizon under it.
3. Two dark mountains form a V, and the sun, its glow and its mirror image fill the gap, so the light part
   of the picture is one connected shape down the middle.
4. There is one subject: a 76 px longboat with a hooded fisher in the darkest colour, the fisher on the
   right-third line (66% across) and the hull on the waterline (61% down).
5. The fisher reads because the haze behind it is 4 to 7 ramp steps lighter than its body, the bow, rod and
   lantern post cut into the brightest glow, and the curled prow and stern give the outline a shape you remember.
6. Bands are flat, clouds carry a 1 px white rim on the top and sun side, and the checker dither around the
   sun sits in thin rings between bands, never on the boat or the fisher.
7. Depth is made with value only: pale far ridges at the waterline, darker near mountains that get paler
   toward their foot, then the black boat, and the lower 39% mirrors all of it under a 1 px bright
   waterline with a narrow path of glints below the sun.
8. Shrunk to 72 px wide you can still name it: a boat on a lake under a low sun.

The colour shares, the fisher's position and the 4 to 7 steps were measured on the PNG for this rubric.
Code: still-water `RAMP.day` 266, constants 208-215, `renderTop` 796-823, `sunPix` 824-837, `genClouds`
320-375, `MCFG` 398-403, `makeBoat` 530-560, `FISHER` 468-487, `dith` 254-259, `computeWater` 871-904.

### What the gold frame does not show

The bar is not perfect. These limits are scored like anything else:

- **Nothing above the waterline moves.** In 0.5 s, 8.8% of the frame changes and all of it is water. The top
  third changes 0.0% (measured; after 10 s the only change up there is two passing birds). The clouds are
  relit but never moved (`renderTop` 817-818).
- **No rim light on the boat or the fisher.** They are flat darkest colour. The backdrop does the separating.
  In the three-tone view the stern half of the boat merges with the mountain.
- **Thin reflections break up.** The rod and lantern post mirror as a squiggle (`plotR` 944-950).
- **Not all dither is in thin seams.** The upper sky has a full-width seam about 12 px tall. The bottom of
  the water has a checker field about 30 px tall, because the water dithers by whole rows (`computeWater` 871-893).
- **The day ramp barely shifts hue** (about 217 to 203 degrees). So this rubric treats hue shift as optional.
  Clean value steps are not optional.
- **The fisher is 11 x 18 px.** That is the lower limit of what reads on a phone.

## Scored dimensions

Six dimensions, each 0 to 10, whole numbers. Anchors are written for 2, 5, 8 and 10.
Find the anchor the frame matches. If it sits between two anchors, give a number between them.
If you cannot decide between two numbers, take the lower. 0 and 1 mean worse than the 2 anchor.
Each check has an ID (1.3 is dimension 1, check 3). Quote the ID that decided the score.

**The six do not count equally in the total.** Palette and composition count three times, light and
silhouettes twice, depth and motion once (see "How to score"). Score each dimension on its own checks, as
if all counted the same. Never bend a number because of its weight.

**Charge each defect once.** A defect costs points only in the dimension whose check names it. A crushed or
dim ramp and a dither field are dimension 1 (1.3, 1.4). They do not also lower the light score. A blocky
figure is dimension 4. It does not also lower composition. If your reason for a score quotes a check ID from
another dimension, take that reason out and score again.

`look.py` is the small script in "Evaluator procedure". It writes `thumb72.png`, `squint36.png`, `tone3.png`,
`lone.png` and `changed.png`.

### 1. Palette and bands

Checks:

- **1.1 Count the colours.** Run `look.py`. The house budget is 12 ramp colours plus 2 to 5 accents, so 17 at
  most. Use the "covering 0.2% or more" number. For each colour under 0.2%, say what it is: an accent, a
  glow tint or a stray. A glow blended in after the palette adds many tiny colours and is allowed (the night
  lantern frame of the reference piece has 54 colours, 12 of them above 0.2%). For a menu, crop to the
  portrait first (`crop=`).
- **1.2 Name every hue family outside the ramp.** Each one must sit on a small thing that has to pop (eyes,
  flour, gold, a bolt, a lamp). An accent used as a large flat fill reads as a sticker.
- **1.3 Is the ramp used end to end?** Darkest and lightest colour are both on screen. The lightest sits on
  the light source and covers about 1% or more (gold frame: 2.1%). `look.py` prints the largest share held
  by three neighbouring colours (gold frame: 43%). Above about 70% the frame is crushed into one murky value.
- **1.4 Where is the dither?** Open `lone.png`. Thin lines and rings are seams between bands. Solid white
  blocks are checker fields. A seam must be narrower than the flat bands on both sides of it. Then zoom to
  6x on the three largest surfaces and confirm.
- **1.5 Speckle.** Single stray pixels inside a flat band that belong to nothing: noise used as texture,
  particles left over after an effect, a regular dot grid.
- **1.6 If two ramps meet (warm and cool):** look at the border. A clean band edge passes. A wide field of
  dots of one ramp over the other fails this check.

Anchors:

- **2:** More than about 40 colours, or four or more unrelated hue families. Checker or speckle covers whole
  surfaces. It looks like a tile set, not one light.
- **5:** One main ramp is recognisable, but there are 18 to 30 main colours, or a second ramp fights the
  first. Or the values are crushed (1.3). Or two or more checker fields, each bigger than the subject.
  Or an accent that clashes or is used as a big flat fill.
- **8:** One ramp plus up to 5 accents. Both ends of the ramp are on screen. Bands are flat. At most two
  checker fields, none on or touching the subject. Accents are small and each has a job. A warm and cool
  pair can also reach 8 if every pixel clearly belongs to one light and the border passes 1.6.
- **10:** The colour count equals ramp plus accents exactly (glow tint aside). Every ramp step is visible.
  All dither is in seams narrower than their bands, with no checker field anywhere. If the piece changes
  mood, the in-between palettes also look intended.

### 2. Light

This dimension scores what the light does in the picture: where it is, how it falls off, and how the scene
answers it. It does not score the ramp. How many colours there are, how bright the lightest one is, how
much of the frame it covers and where the dither sits are all dimension 1.

Checks:

- **2.1 Is the light source inside the frame and uncovered?** A disc, flame, rift or lantern. Or a glow with
  one clear centre that you can put a finger on. The centre must be inside the frame and in front of every
  hill, cloud and building. A glow whose centre is hidden or outside the frame does not count.
- **2.2 Does the light fall off in bands from that centre?** Count the bands from the centre out to the
  plain sky. Three or more is a pass. The centre must be the lightest area of sky in the frame. The best
  case is a solid core in the lightest colour (the gold frame's disc). A centre that is a dither mix with no
  solid core is one miss. It is not a failed light. A darker rim inside a blown-out glow turns the disc
  into a hollow ring and fails this check.
- **2.3 Do lit edges agree with the source?** Pick three: a cloud edge, a ridge crest, the subject's rim.
  Each must be bright on the side facing the source.
- **2.4 Is the subject separated by light?** Either a rim at least 2 ramp steps brighter than the pixels
  directly behind it, or a backdrop at least 4 steps away from the subject's body (the gold frame uses the
  backdrop). A rim in the same colour as the background erases the outline.
- **2.5 Local lights and shadows.** A lantern, fire or candle lights its holder and the ground next to it,
  in steps. The flame or lamp stays brighter than its pool. A cast shadow points straight away from the
  source and is 1 to 2 steps darker than the ground under it. A shadow that points the wrong way fails. A
  shadow that points the right way but has a clean ruler edge and no fade along its length is one miss. A
  thin glowing accent (a blade, eyes, a bolt) is not a local light. It only has to keep its accent colour.
- **2.6 Glints and flashes.** Light on water is sparse short dashes in a narrow path under the source, not
  dots filling a triangle. For a flash or strike, compare the frame before it with the frame at its peak.
  It passes when all three hold: the brightest new pixels are at the event (the bolt, the edges facing
  it); the subject keeps at least as many ramp steps from its backdrop as before; `look.py`'s
  three-neighbour share does not rise by more than about 5 points. A flash that lifts the whole palette
  passes if all three hold. It fails when the frame washes toward one value: the subject loses steps, or
  the share jumps.
- **2.7 Does the scene answer the light?** Cover the source with a finger. Can you still tell where it is?
  Count the answers you can see: shafts or rays fanning out from the source; sky, haze or cloud getting
  lighter toward it; a bright wedge or band on the horizon under it; a glint path or a lit road running
  toward it; long shadows pointing away from it; 1 px lit edges on rails, ridges, roofs or cloud tops on
  the side facing it. Two or more is a pass (gold frame: four, the ring bands, the horizon wedge, the
  glint path and the cloud rims).
- **2.8 One light.** Count the lights. There is one main light. A second light passes if it is small, local
  and in its own colour (a lantern, a blade, eyes, a campfire). Scattered light fails: rows of lit windows,
  several beams, a big bright cloud lit from outside the frame and a sunset glow, all in one frame, each
  pulling the eye its own way. Stars and water glints are not lights. Then look at where the main light
  sits: at, beside or behind the subject, or at the end of the leading lines. A main light far from both
  is a smaller miss (see the scoring aid).

Scoring aid. Write pass, miss or "not in this frame" for 2.1 to 2.8 before you pick the number:

- 2.1 is a miss: 5 at most.
- The light is scattered (2.8): 5 at most.
- 2.1, 2.2 (three bands, centre is the lightest sky) and 2.7 pass, and the light is not scattered: start
  at 9. Take 1 off for each miss among these six: no solid core (2.2); 2.3; 2.4; 2.5; 2.6; main light far
  from the subject and from the leading lines (2.8). Do not go below 7. A check that is not in the frame
  (no local light, no water, no flash) is not a miss.
- One exception to that floor: a large element lit from the side away from the source. Use the 5 anchor.
- Anything else: use the anchors.

Anchors:

- **2:** No source and no glow. Or lit sides contradict the source. Flat even fill everywhere. A local light
  is a flat coloured disc.
- **5:** There is a glow, but its centre is hidden, outside the frame or cannot be pointed at. Or the light
  is scattered (2.8). Or the source is in frame but nothing answers it: no falloff bands, no lit edges, and
  the backdrop is within 2 steps of the subject. Or one large element is lit from the wrong side.
- **8:** One light, in frame, with a centre you can point at and three or more bands of falloff. The scene
  answers it in two or more ways (2.7). Clouds, ridges and subject are lit on the facing side. The subject
  is separated by a rim or a light backdrop. One miss allowed (a glow centre with no solid core, no rim on
  the sprite, a lantern that does not light its holder, a clean-edged cast shadow, a core that clips into
  a flat white blob).
- **10:** All of 8 with no miss, and the core is solid. The lightest colour appears only on the source, its
  path and its rims. A second light has its own colour and visibly lights its neighbours. Light changes
  (sunset, flash, flicker) keep or raise the subject's separation.

### 3. Composition and focal point

Checks:

- **3.1 Thumbnail test.** Open `thumb72.png` before anything else and before reading the label. Write down
  the subject. If you cannot, or you name something else, that is automatic fail F4.
- **3.2 Squint test.** Open `squint36.png` and `tone3.png`. Is the subject one of the clearest dark or light
  shapes? Is the light area one connected mass, or scattered pieces?
- **3.3 Where does the eye land first?** The brightest, highest-contrast area must be at or beside the
  subject. It must not be at a frame edge. It must not be a cloud or prop that is bigger and brighter than
  the subject.
- **3.4 Position.** The subject sits on a third (gold frame: fisher 66% across, waterline 61% down), or on
  the centre axis with lines that lead to it (road edges, ridges, a reflection).
- **3.5 Count competing focal points:** things as bright, as saturated or as detailed as the subject. The
  target is zero. Then check calm space: about half the frame or more holds no object edges. Ruled
  lines count as object edges: a surface cut into a tile grid, or crossed edge to edge by evenly spaced
  straight lines, is busy, not calm, even when nothing stands on it. Organic texture (wind streaks,
  ripples, rock facets) is not a ruler pattern.
- **3.6 Dead bands and tangents.** A flat single-colour band taller than about a tenth of the frame with
  nothing in it is dead, not calm. Check the 470-tall frame too. A tangent is the subject touching or
  overlapping another silhouette so the two merge.
- **3.7 Is the subject big enough to be the subject?** Measure it in native pixels together with what it
  rides, holds or stands on, as one outline (gold frame: boat with fisher, 76 of 216 px, 35% of the width).
  It should span about a sixth of the frame's width or height, or more. A lone figure under about a tenth
  of both the width and the height is a marker on a landscape. The landscape is then the real subject: score
  that shape in 3.1 to 3.6 and in dimension 4. A group that reads as one thing is measured as a group.

Anchors:

- **2:** You cannot say what the subject is. Detail runs edge to edge. Or the largest, brightest thing is not
  the subject.
- **5:** The subject is findable at full size but weak in the thumbnail. Or a second element pulls the eye
  first. Or there is a large dead band. Or the subject merges with another shape. Or the figure is only a
  marker (3.7). Or the space that should be calm is covered by a ruler pattern (3.5). Leading lines do not
  lift a frame above 6 while either of the last two holds.
- **8:** Subject named from the thumbnail and big enough (3.7). One clear light region. Half the frame or
  more is calm and clean. Subject on a third, or on an axis with leading lines. One small issue allowed (a
  minor tangent, a heavy bottom at 470, one element that competes a little).
- **10:** The thumbnail reads at once. Lines in the scene point at the subject. Nothing competes. It holds at
  both 384 and 470 tall.

### 4. Silhouettes and readability of drawn things

Checks:

- **4.1 Outline test.** Picture the subject filled flat black. Can you still name it? Is there one authored
  detail in the outline (a curled stern, a hood, a carved word)?
- **4.2 Size at 1x.** Measure the subject in native pixels (gold frame: boat 76 px long, fisher 11 x 18).
  Look at the frame at 1x. Are the head, the tool or weapon and the eyes still separate things? Features 1 px
  wide vanish on a phone.
- **4.3 Hand or ruler?** People, creatures and buildings must not show code primitives: perfect triangles
  and cones, uniform grids, identical repeated units, flat cut-off bases. Round organic forms may be
  procedural if they are shaded as 3D forms with three or more bands and a lit rim.
- **4.4 One pixel size.** No sprite scaled 2x or 3x next to 1 px art (automatic fail F2).
- **4.5 Prop quiz.** Point at each prop and icon and say what it is without the label. Write down every
  wrong answer.
- **4.6 Repeats, thin lines and tells.** The same sprite stamped twice in the same pose reads as lazy.
  1 px lines (rods, fishing lines, blades) must contrast with what is behind them. An invisible thing needs
  tells you can see: tracks, birds standing on nothing, a shadow only when revealed.

Anchors:

- **2:** The subject is a blob or a code primitive. You cannot name it from the outline. Props cannot be named.
- **5:** The outline can be named but is generic (a cone, a standing figure with a stick). Or it is so small
  that its features vanish at 1x. Some props are misread. Inner detail is noise.
- **8:** Named from the outline. One memorable authored detail. Features readable at 1x. Props read. One weak
  point allowed (no rim, a thin reflection that breaks up, one repeated sprite, one misread prop).
- **10:** Every drawn thing is named from its outline at 1x. The subject has a designed profile. All of them
  are separated by rim or backdrop. No unvaried repeats. Small effect sprites read too.

### 5. Depth and atmosphere

Checks:

- **5.1 Count the depth planes you can point at.** The gold frame has three: pale far ridges at the
  waterline, the two dark mountains, the boat in front.
- **5.2 Do far layers step toward the sky colour?** Each farther silhouette should be about 2 ramp steps
  closer to the sky value than the one in front of it. Layers within 1 step of each other read as one smear.
- **5.3 Haze and horizon.** Far forms get paler toward their base. Where ground or water meets sky there is
  no dark seam and no hard line.
- **5.4 Texture by distance.** Texture is strongest near the viewer and gone far away. Speckle on a far
  surface fails this check.
- **5.5 Order and reflections.** Nothing far is drawn over something near. Everything above a waterline is
  mirrored. A reflection is darker than the thing itself. A full-strength reflection reads as a second object.
- **5.6 Does the atmosphere read as what it is?** Clouds are lit masses in varied sizes with a clear light
  side, not flat chips, equal scales or cotton balls. Mist is a soft shape, not dotted rows. Foreground
  framing is either clearly visible (3 or more steps from what is behind it) or absent.

Anchors:

- **2:** Flat. Everything sits on one plane or one value. Or layers are in the wrong order. Hard seams at the
  horizon. Far surfaces speckle.
- **5:** Two planes. Far and near silhouettes are within a step of each other. Haze is missing or lumpy.
  Clouds are flat chips. One seam or flat strip.
- **8:** Three or more planes, clearly stepped toward the sky. A hazy horizon with no seam. Near texture is
  stronger than far texture. Clouds read as lit volumes. One miss allowed (a reflection that breaks 5.5, one
  far layer filled with checker, clouds a little busy).
- **10:** Four or more planes. Every far form fades into the sky colour at its base. Shapes soften with
  distance without any checker field. Reflections obey depth. It holds in every mood of the piece.

### 6. Motion and life

Score this once per state, from at least three frames (t, t + 0.5 s, t + 10 s) plus the frames of each
triggered action. Never score it from one still. A known animation counts only if a frame shows it.

Checks:

- **6.1 How much changes, and where?** Run `look.py` on the pair. It prints the share of changed pixels by
  thirds. Reference: the gold state changes 8.8% of the frame in 0.5 s (top third 0.0%, bottom third 25.2%).
  Under about 1% is a still image. Write down which third shows 0%.
- **6.2 Does the subject itself move** (breath, cloth, blink, bob, walk) by an amount you can see at 1x?
  A 1 px hop or a 0.1 s blink does not show.
- **6.3 Do sky and plants move?** Clouds drift and change shape. They do not slide as one rigid sheet.
  Grass, reeds or trees sway. Layers move at different speeds.
- **6.4 No breaks.** Nothing jumps (automatic fail F10). Nothing pops off in one frame. Dither does not boil
  in place. Particles are gone after their effect ends.
- **6.5 Triggered actions read in a still.** The tap frame is clearly different from the idle frame at 1x.
  The first 0.2 s of every effect looks intended.
- **6.6 Mood changes are directed.** Things move at staggered times (sun, then palette, then stars, then
  lamp), not in one crossfade.

Anchors:

- **2:** A still image: under 1% changes, particles only. Or the motion is broken (jumps, boiling, pops).
- **5:** One region is alive (water or field). The sky and the subject are frozen. Tap reactions are 1 to
  2 px. Clouds are static or slide as one rigid sheet.
- **8:** Two of three regions are alive (sky; ground or water; subject), and one of the two is the subject or
  the sky. Motion is small and constant. No breaks. Triggered actions show at 1x.
- **10:** Sky, ground or water, and subject all move, at different speeds. Clouds drift and change. The
  subject shows idle life at 1x. Events change the light. Every sampled frame holds up, including the
  first 0.2 s of effects.

The 10 anchor is a target. The studies did not find all of it in any one piece, and the gold frame's sky
does not move at all.

## Automatic fails

Any one of these fails the frame, whatever it scores. Still score the frame, so the builder gets the full list.

| # | You see |
| --- | --- |
| F1 | **Unpainted, stale or off-palette pixels.** A black or odd-coloured line or patch that belongs to no ramp of the scene. In `look.py` it shows as a small colour that is neither ramp nor accent. Look along the horizon row first. |
| F2 | **Mixed pixel sizes.** A sprite drawn at 2x or 3x next to 1 px art. In a page capture: pixels of uneven width. |
| F3 | **No light source in frame** in a state that holds longer than 2 s. A glow whose centre is hidden or outside the frame counts as none. A source that is fully covered counts as none. A glow with a centre you can point at inside the frame is a source (2.1). |
| F4 | **Subject not named from the 72 px thumbnail,** or the evaluator names a different thing as the subject. |
| F5 | **Dither or noise as area texture.** A checker or screen-door pattern over more than half of the subject. Or raw single-pixel speckle over more than about a tenth of the frame. |
| F6 | **The subject is a person, creature or building made of flat code primitives:** ruler-straight cones, boxes or triangles, uniform grids, identical repeated units, flat floating bases. |
| F7 | **Wrong layer order.** Something far drawn over something near. An effect or cloud drawn over a sign or panel. Loose particles drawn across the subject they should pass behind. |
| F8 | **A ruler seam, strip or cut that is not part of an object:** a straight line down the screen, a flat strip at the bottom of water, a box-shaped highlight, a track that ends in a vertical cut, a dark seam where a ridge meets the ground, a hard horizontal seam where two halves of the picture slide over each other. |
| F9 | **An effect drawn as a hard flat blob.** Powder, smoke, mist or a light pool as a clean-edged shape with no inner steps (a cartoon pill, a flat coloured disc). |
| F10 | **A jump.** Between two frames 0.3 s apart, a whole layer moves several pixels with no scripted event. |
| F11 | **Page captures only: a text line you cannot read at phone size,** or text laid across the subject. |

F3 does not apply to a transition shorter than 2 s. Everything else applies to every frame, including the
first 0.2 s of an effect, because a player can screenshot that frame.

F5, F6, F8 and F9 come from the SKILL rules and its failure list. F3 is SKILL rule 3. F11 is the SKILL
delivery checklist. F1, F2, F4, F7 and F10 come from weaknesses found in the studies.

## How to score

- **Dimensions 1 to 5:** score each required frame on its own.
- **Dimension 6:** score once per state and use that number for every frame of the state.
- **Frame total:** the six numbers weighted, out of 60. Keep the half point.
  `total = (3 x palette + 2 x light + 3 x composition + 2 x silhouettes + depth + motion) / 2`
- For each dimension write one line: the score, the check ID that decided it, the crop that shows it.
- For dimension 2 also write the tally: pass, miss or "not in this frame" for 2.1 to 2.8.
- The deciding check ID must belong to the dimension being scored (see "Charge each defect once").
- List every automatic fail by its F number.
- A frame from a transition shorter than 2 s is checked for automatic fails only. It gets no score.

Why the weights. The bar is four things: clean, calm, one light, one subject (`art/art-direction.md`).

| Dimension | Weight | What it carries |
| --- | --- | --- |
| 1 Palette and bands | 3 | Clean: one ramp, flat bands, dither only in seams |
| 2 Light | 2 | One light, in frame, answered by the scene |
| 3 Composition and focal point | 3 | Calm and one subject: empty space, one place for the eye |
| 4 Silhouettes | 2 | The one subject reads as a drawn thing |
| 5 Depth and atmosphere | 1 | Supports the look. The bar does not name it |
| 6 Motion and life | 1 | Supports the look. The gold frame's own sky does not move |

Depth and motion still have to reach 6 for a frame to ship. But a frame cannot pass a cleaner, calmer
frame on depth or movement alone, and a busy frame with many colours is not carried by its layers.

**The piece score.** When one number is asked for the piece (a ranking, a comparison with the bar), give
the total of its **signature frame**. Never give the worst frame's total as the piece's number. The bar
itself is one frame: a main hold state at rest, with its subject on screen. A piece is compared with it
like for like.

- The signature frame is the main hold state as the piece opens by default: t = 2 s, H = 384, default
  settings, before any tap.
- If the subject only comes on screen after an action or a story step (an empty stage before a reveal, a
  thing that stays hidden until it is uncovered), the signature frame is the first hold frame that shows
  the subject. "One subject" cannot be judged on a stage the subject has not entered yet.
- A piece that is a set of equal scenes (menu portraits, cards, a set of showpieces) has one signature
  frame per scene. Score them all. The piece score is the middle one. With an even count, take the lower
  of the two middle ones. Write the lowest and the highest next to it.
- Later moods, story beats, endings and action frames are scored in the same way and listed. They do not
  move the piece score. They do decide the verdict.

**The verdict.** Each scored frame gets a verdict from the table below. The piece gets the verdict of its
worst required frame, because a player can reach every one of them. So a piece can have a high piece
score and still be "Fix and re-render". The report then names the frames to fix.

| Verdict | Rule |
| --- | --- |
| **Ship** | 48 or more, no dimension below 6, no automatic fail. |
| **Fix and re-render** | 36 or more and under 48. Or 48 or more with any dimension below 6. Or any automatic fail on a frame that scores 36 or more. |
| **Rebuild from the brief** | Below 36, or any of dimensions 1 to 5 at 3 or lower. Go back to subject, light, ramp and focal point. Do not patch. |

Why 48: it is what a frame gets with 8 in every dimension, the anchor that means "at the bar, with one
allowed miss". The weights do not move that line.

Rules for the evaluator:

- **The evaluator is never the session that built the piece.** A session that fixed the piece counts as a
  builder too. The builder knows what each shape is meant to be and reads it into the frame. The cookbook
  records one such case: a creature stayed invisible through three rounds of the builder's own checks
  (Abyss).
- The evaluator gets the frames and a one-line label per frame (state, time, native size). It does not get
  the builder's notes or brief. The thumbnail test is done before the label is read.
- The evaluator does not fix. The builder does not score. After a fix, every required frame is rendered
  again and scored again from zero, because a fix in one place moves other things.
- Never describe a frame you did not open.
- **Score the gold frame first, every round.** Before any other frame, take `gold_boat_day.png` through
  steps 2 and 3 of the procedure and write down its six numbers (its motion numbers are in 6.1). They are
  your yardstick. In a dimension, a frame gets a higher number than your gold number only if you can name
  the check where it visibly does better than the gold frame. If you cannot name one, your gold number is
  the most it gets. If the gold frame does not clear the ship line on your numbers, say so in the report:
  that is a fault in the rubric, not in the frame.
- The fix list is ordered: automatic fails first, then the fixes that gain the most points.

## Evaluator procedure

**1. Ask for these frames.** The builder renders them with the skill's `scripts/shoot.js` at scale 3
(a 216 px canvas becomes 648 px wide). The evaluator may render them again.

| Frame | Why |
| --- | --- |
| Main hold state at t = 2 s, H = 384 | Same conditions as the gold frame. This is the signature frame, unless the subject is not on screen yet (see "How to score") |
| Same state at t = 2.5 s and t = 12 s | Motion pair and slow drift |
| Same state at H = 470 | Tall phones. Dead bands and broken strips show up here |
| One hold frame for each mood, scene, portrait or card | Each is scored on its own. In a set of equal scenes each one is a signature frame |
| Each triggered action, 0.1 to 0.2 s after it starts and at its peak | First frames of effects. Whether the action reads in a still |
| The moment a player will screenshot | SKILL delivery checklist |
| If anything scrolls or loops: two frames 0.3 s apart across the loop point | F10. The builder states the loop period |
| The real page in headless Edge at 648 x 1152, if there is text | F11. A 432 px window gets clipped |

A piece in another format (a 320 px card, a square scene) is judged at its native size. Say so in the report.
If the page capture comes out dark, the CSS fade did not advance. Capture a temp copy with the fade
overlay hidden. Never edit the piece itself.

**2. Make the test images.** Save the script below as `look.py` in the system temp folder, not in the studio.

```
python look.py OUT_DIR 3 frame_2.00s.png frame_2.50s.png
python look.py OUT_DIR 3 frame_2.00s.png crop=9,24,207,148
```

The 3 is the scale the frames were saved at. The second line looks inside a menu portrait only (box in
native pixels: x0,y0,x1,y1).

```python
# look.py: test images and numbers for the quality rubric
# python look.py OUT_DIR SCALE frame.png [later_frame.png] [crop=x0,y0,x1,y1]
import sys
from collections import Counter
from PIL import Image, ImageChops
out, scale = sys.argv[1], int(sys.argv[2])
files = [a for a in sys.argv[3:] if not a.startswith('crop=')]
box = [tuple(int(v) for v in a[5:].split(',')) for a in sys.argv[3:] if a.startswith('crop=')]
def native(path):
    im = Image.open(path).convert('RGB')
    im = im.resize((im.width // scale, im.height // scale), Image.NEAREST)
    return im.crop(box[0]) if box else im
def lum(c): return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def big(im): return im.resize((im.width * 3, im.height * 3), Image.NEAREST)
a = native(files[0]); W, H = a.size; n = W * H
px = list(zip(*[iter(a.tobytes())] * 3)); cnt = Counter(px); cols = sorted(cnt, key=lum)
main = [c for c in cols if cnt[c] >= n * 0.002]
print('size %dx%d  colours: %d  (covering 0.2%% or more: %d)' % (W, H, len(cols), len(main)))
for c in cols: print('  #%02x%02x%02x %6.2f%%' % (c + (100.0 * cnt[c] / n,)))
sh = [100.0 * cnt[c] / n for c in cols]
print('largest share of 3 neighbouring colours: %.0f%%' % max(sum(sh[i:i + 3]) for i in range(max(1, len(sh) - 2))))
# lone pixels: differ from all four neighbours (checker dither, speckle, sparkle)
lone = Image.new('L', (W, H), 0); lp = lone.load(); k = 0
for y in range(1, H - 1):
    for x in range(1, W - 1):
        p = px[y * W + x]
        if p != px[y * W + x - 1] and p != px[y * W + x + 1] and p != px[(y - 1) * W + x] and p != px[(y + 1) * W + x]:
            lp[x, y] = 255; k += 1
print('lone pixels: %.1f%%' % (100.0 * k / n))
lo, hi = lum(cols[0]), lum(cols[-1])
def tone(c):
    f = (lum(c) - lo) / max(1.0, hi - lo)
    return (20, 20, 20) if f < 1 / 3 else (128, 128, 128) if f < 2 / 3 else (245, 245, 245)
t3 = Image.new('RGB', (W, H)); t3.putdata([tone(c) for c in px])
big(a.resize((72, max(1, H * 72 // W)), Image.BOX)).save(out + '/thumb72.png')
big(a.resize((36, max(1, H * 36 // W)), Image.BOX)).save(out + '/squint36.png')
big(t3).save(out + '/tone3.png'); big(lone).save(out + '/lone.png')
if len(files) > 1:
    d = ImageChops.difference(a, native(files[1])).convert('L').point(lambda v: 255 if v else 0)
    m = d.tobytes()
    for name, y0, y1 in (('top third', 0, H // 3), ('middle third', H // 3, 2 * H // 3), ('bottom third', 2 * H // 3, H), ('whole frame', 0, H)):
        print('changed, %s: %.1f%%' % (name, 100.0 * sum(1 for v in m[y0 * W:y1 * W] if v) / ((y1 - y0) * W)))
    big(d).save(out + '/changed.png')
```

Check that it works: on `gold_boat_day.png` it must print 12 colours, 43% and "lone pixels: 15.0%".

How to read the outputs:

- `thumb72.png`: the frame at 72 px wide, shown at 3x. This is the thumbnail test.
- `squint36.png` and `tone3.png`: the frame at 36 px wide, and the frame in three tones. This is the squint test.
- `lone.png`: white where a pixel differs from all four neighbours. That is checker dither, speckle and
  glints. Lines and rings are seams. Solid blocks are fields. The number alone means little (the gold frame
  has 15.0%). Where the white sits is what counts.
- `changed.png`: white where the two frames differ.

**3. Look, in this order.** Open every image with the image viewer. Do not skip steps.

1. `thumb72.png` first, label unread. Write down: subject, light source, time of day. Then read the label (F4, F3).
2. `squint36.png` and `tone3.png`: where is the light mass, where is the subject, what competes. Cover the
   light source with a finger and count what still tells you where it is (2.7). Count the lights (2.8).
3. The full frame at 3x. Sweep F1 to F9. Look along the horizon row, the frame edges and the bottom 40 rows.
4. Crops at 6x to 9x of: the subject, the light source, the largest sky or ground surface, the horizon or
   waterline, the bottom 40 rows, and anything that looked wrong. One way (box in pixels of the 3x frame):
   `python -c "from PIL import Image; im=Image.open('frame.png').crop((360,560,620,760)); im.resize((im.width*3, im.height*3), Image.NEAREST).save('crop.png')"`
5. `lone.png` and the colour table: seams or fields, strays, crushed values.
6. `changed.png` and the thirds for the motion pair. Then the 12 s frame and the action frames (F10).
   For a flash or strike, run `look.py` on the frame before it and on the peak frame, and compare the
   three-neighbour share and the steps between subject and backdrop (2.6).
7. Side by side with the gold frame at the same scale (use full paths; `sheet.py` is in the skill's `scripts/` folder):
   `python sheet.py side.png gold_boat_day.png frame.png`
   For each of dimensions 1 to 5 ask: is this as clean, as lit, as readable, as deep as the gold frame?
   Hold each number against your own gold number for that dimension. Higher than gold needs a named check
   where this frame visibly does better (see "Rules for the evaluator").
8. The 470-tall frame and the page capture (dead bands, F11).

**4. Report.** Start with the piece: the piece score, which frame is the signature frame and why, and
the piece verdict with the frame that decided it. Give your six gold numbers on the next line. Then for
each frame: six scores with the deciding check ID and crop, the F numbers, the weighted total, the
verdict. Then one fix list for the piece. Say which frames you could not get and what you did not test.

## Not covered by this rubric

Frames cannot show these. The SKILL delivery checklist still applies to all of them: speed (`--fps-test`
under 4 ms median, small deopt count), console errors (`dom_smoke.js`), sound, touch input, a real phone,
and motion whose speed depends on the frame rate.

Menu layout, chrome and text have no scored dimension. Only F11 covers text. Score a menu screen on its
portrait or scene area.

Mood and lore are not scored either. Whether a piece feels majestic, medieval and horror-tinged
(`art/art-direction.md`) is Farhad's call.

## Weak or untested

- **Calibrated twice, and only partly.** Blind rounds 1 and 2 scored the same pieces. The gold frame
  cleared the ship line with no margin in round 1 and by one point in round 2 (49, with or without the
  weights), so the line (48, nothing below 6) is still a first setting, and so are the thresholds (17
  colours, 70%, 1%, half the frame calm, a tenth of the frame, and a sixth and a tenth of the frame for
  the subject's size). The gold frame must keep clearing the ship line. If it does not, change the
  rubric, not the frame.
- **The piece score is new after round 2 and untested.** Round 2 gave every piece the total of its worst
  hold frame. For a long piece with many moods and story beats that is its hardest frame. For a short
  piece it is its only scene. So the reference piece was ranked on a late story beat that puts three
  things on screen on purpose, not on the boat scene that is the bar. That beat scored three points
  under the gold frame. The piece score now compares signature frame with signature frame. Two risks:
  the evaluator has to pick the signature frame, and two evaluators may pick differently when a piece
  opens on an empty stage. And the middle score of a set hides its worst member. Only the verdict
  catches that.
- **The gold yardstick is new after round 2 and untested.** It ties each evaluator's numbers to the one
  frame Farhad has called the bar. It may pull strong frames down to the gold numbers when the evaluator
  is slow to name the check that beats them.
- **Dimension 2 was rewritten after round 1 and has not been through a blind round since.** The first
  version made a solid core the gate for a good light score, failed every whole-palette flash, failed
  every clean-edged cast shadow, and let ramp faults (1.3, 1.4) be charged to light a second time. Farhad's
  taste did not match that: he rates a light by whether it is one light, in frame, with falloff, that the
  scene answers. The new checks 2.7 and 2.8, the scoring aid and its floor of 7 are untested. The floor may
  be too generous for a frame whose light is correct but dull.
- **3.7 and the ruler-pattern rule in 3.5 are new and untested.** The sixth and the tenth are guesses from one
  measured frame.
- **The weights are new after round 2 and untested.** Until then all six counted the same. In round 2
  motion, the one thing the gold frame is weak at, was enough to put another frame level with it or
  ahead, and frames with many colours and detail from edge to edge were held up by their depth scores.
  The bar is described as clean, calm, one light, one subject, so palette and composition now count
  three times, light and silhouettes twice, depth and motion once. 3, 2, 3, 2, 1, 1 is a first setting.
  Silhouettes at 2 and light at 2 are a guess: light alone should not carry a frame whose palette and
  subject are weak.
- **Dimension 6 asks for more than the bar shows.** The 8 and 10 anchors come from SKILL rule 6 and from
  Farhad's wish for cloud and forest movement. No studied piece shows moving clouds, swaying plants and a
  living subject together. The floor of 6 for motion may be too high or too low.
- **One ramp or two is an open question.** The skill says one ramp. The rubric lets a warm and cool pair
  reach 8 under conditions. This may be too strict or too loose.
- **One ramp per material is outside the rule as written.** A frame built that way loses points in
  dimension 1 by design. Whether the house style should allow it is Farhad's call, not the rubric's.
- **Several checks are still judgement:** "names the subject", "reads as a boat", "calm", "dead band". Two
  evaluators should land within about 1 point per dimension. This has not been tried.
- **Phone size is simulated.** The 72 px thumbnail and the 1x view stand in for a phone. No frame in the
  studies was checked on a real phone.
- **`look.py` is a rough tool.** It was run only on 216 x 384 frames of the reference piece at scale 3 and on
  one cropped menu portrait. The colour count is fooled by blends, which is why every small colour must be
  named by eye. The three-neighbour number sorts by brightness, so with several ramps it is only a hint.
  `lone.png` cannot tell dither from glints or stars.
- **The 2 and 5 anchors are thinner than the 8 anchor.** They were written from defects seen in the
  studies, not from whole frames known to sit at those levels.

## Evidence index

Read this after scoring, not before. Each line names the code that was studied for a check. A pointer does
not say pass or fail. Most studied pieces supplied both a technique worth keeping and a defect.
Line numbers are from the study notes of 2026-10-02.

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

**Dimension 1.** SKILL rules 1 and 2. `art/art-direction.md`, "Palettes in use".

- 1.1 to 1.3: still-water `RAMP` 265-269, `buildPalette` 285-305, `glowTint` 1157-1176; kolobok `RAMP`/`ACC`
  81-96, `FR` 97-98; muster `PALDEF` 30-38; reachbound `PALDEF` L28-50, `drawCollector` L645-650; summit
  `RAMP` L22, `ACC` L23; souls `makePalette` 122-130; vignettes `SCN` L65-69, `C`/`Wm` L84-85; hero `MAT`
  83-93; tips `MAT` L17-44.
- 1.4: `dith` in still-water 254-259, kolobok 72-77, muster 24-25, tips L14, souls `sd` 294-299. Flat fills:
  muster `fillBelow` 149-151, vignettes `layer()` L222-237, hero `drawIcon` 228-245. Slow gradients: kolobok
  `skyValue` 255-263, summit `VAL` buffer L68-73 and L325. Whole rows: still-water `computeWater` 871-893.
  Mixes: hero `render()` 354-358, souls `sceneWolf` 891-904.
- 1.5: reachbound `buildPebble` L194; kolobok `dustSplat` 79-95; still-water `updAsh` 740-752; souls skyline 590-595.
- 1.6: vignettes `drawCastle` L217-221, `drawLake` L254-258. Cookbook: "Bold colour bands can beat realism."

**Dimension 2.** SKILL rule 3.

- 2.1 and 2.2: still-water `renderTop` 796-823, `sunPix` 824-837; kolobok `skyValue` 255-263; muster
  `paintSky` 107-114, `paintDisc` 115-120; reachbound `paintSky` L110-117; summit `buildSky` L86-87; souls
  `sceneTower` 367-369, `sceneCity` 567-569, `sceneWolf` 770-779; vignettes `drawCamp` L135-141, `drawCastle`
  L217-221, `drawLake` L254-259; tips `paintSky` L156-161, `disc` L339; hero `paintRoom` 212-220, flame 359-366.
- 2.3: kolobok `genClouds` 264-311; muster `paintClouds` 122-148; tips `LX, LY, LZ` L51 with `renderClouds` L70-98.
- 2.4: still-water `MCFG` 398-403; muster `rimLit` 64-75; vignettes `rims` L106-117; kolobok `drawBall`
  426-432, `genStone` 192-230; souls `sceneWolf` 840-849; summit `WALK` map L224-228; hero `shadeBust` 154-182.
- 2.5: still-water `glowTint` and `applyGlows` 1157-1190; vignettes `drawCamp` L150-169; reachbound
  `drawCollector` L645-650; tips `animArch` L286-292; kolobok `shadowAt` 289-308; muster `drawLoaf` 545-548.
- 2.6: SKILL failure list (glitter); still-water `computeWater` 894-904; vignettes `glints` L87-96; muster
  `drawPebble` 204-207, `drawFish` 384-388; tips `animLake` L246-249, `drawBolt` L343; summit `buildPal`
  L25-33, `strike` L259-271. Cookbook: "Random dots read as a Christmas tree", "Keep the palette lift near 15%".
  SKILL technique table (whole-palette flash).
- 2.7: SKILL rule 3 (glow falloff in the sky, rim light on the side facing the light); SKILL technique table
  (sky gradient toward a light, glitter path, god rays, shadow only where powder sits).
- 2.8: SKILL rule 3 ("the light source", one) and rule 4 (one focal point). `art/art-direction.md`, "The bar".

**Dimension 3.** SKILL rule 4.

- still-water constants 208-215, cloud corridor in `genClouds` 348-349, `drawGoldFish` 1055; kolobok
  `ROAD_PTS` 417, loop path and `MILL` 116-129, `genForeground` 495-531; summit constants L9-10, `drawRelics`
  L158-187; souls `paintLobes` 261-285, `sceneTower` 418-479, city beams 718-727; tips `renderClouds` L70-98,
  `paintSign` L162-173; muster `buildKnight` 333-347, `drawHunter` 486-491.
- Tall frames: muster and reachbound `genChrome` at H = 470; vignettes at H = 470; hero `genChrome` 311-338.
- Cookbook (Abyss): "Always check scale and contrast from the actual camera."
- 3.5 (ruler pattern) and 3.7: SKILL rule 4 ("Lots of empty space, one focal point") and rule 2 (clean
  bands); the 35% is measured on the gold frame.

**Dimension 4.** SKILL rule 5 and failure list.

- still-water `makeBoat` 530-560, `FISHER` 468-487, `linePix` 1016-1023, `plotR` 944-950, `makeFish` 563-629,
  `drawFang` 1101-1121.
- kolobok `genStone` 192-230, `genPebble` 231-245, `CROW` 131-136, `SACK` 137-155, `POLE_A` 157-180,
  `drawBall` 385-446; tells in `stampTrail` 49-65, `crowPerch`, `shadowAt` 289-308.
- muster `genElder` 226-246, `KNIGHT` 286-316, `HUNTER` 425-463, `drawFish` 389-421.
- reachbound `CROW_BIG` L575-587, `COLL` L617-622, `drawProj` L676-683, arch L630-640, necromancer L688-690.
- summit `WALK` L215-229, `drawRelics` L158-187.
- souls `sceneWolf` `WP` 804-814 and fur 818-857, `sceneTower` 418-479, `sceneCity` 596-681, `FIG` 504-510 and 867-875.
- vignettes `SIT` L120-124, `CASTLE` L185-205, tent L159-163.
- hero `scene()` 109-134, `ICONS` 247-289.
- tips `TRAV` L144-148, `genStone` L182-199 and L468, wall L478-479, arch L270-276, `animBlink` L377-379,
  `animBell` L311-319.

**Dimension 5.**

- 5.1 to 5.3: still-water `MCFG` 398-403, `shadeM` 404-422, paint order 1191-1210; vignettes `layer()`
  L222-237 (values 7.4, 5.2, 3, 1.2); muster `buildKnight` 333-347, `CASTLE` 317-332; kolobok `genHills`
  333-359; summit `renderTerrain` fog L146-147; souls depth tags 763-764, fog 880-904, `pine` 784-799.
  SKILL failure list (dark seam).
- 5.4: SKILL failure list (texture at a distance); kolobok `genGround` 465-472; tips wheat L109-116; souls
  skyline 590-595.
- 5.5: still-water `plotR` 944-950; muster `mirror` 153-163; tips `animLake` L241-245, `render` L515-534;
  vignettes `drawLake` L261-268.
- 5.6: still-water `genClouds` 320-375; kolobok `genClouds` 264-311; muster `paintClouds` 122-148; tips
  `genCumulus` L55-68; souls `paintLobes` 261-285, `swClouds` 302-346; summit `buildSky` L89-100; vignettes
  mist L270-276, reeds L177-180; tips `framingGrass` L174-177. Cookbook: "Equal-size cloud puffs read as
  cotton balls."

**Dimension 6.** SKILL rule 6.

- 6.1: still-water `computeWater` 871-904 and the `WS.troubled` dial; kolobok `renderGround` 328-331 (8% of
  pixels change in 0.5 s in the study's diff); muster `drawStone` 263-266; tips `render` L522-527.
- 6.2: still-water `drawRod` 971-981, `drawLine` 1024-1046; muster `drawKnight` 351-367, `drawPebble`
  214-219; summit `drawWalker` L230-247; hero `render()` 359-372; reachbound `act` L786-794.
- 6.3: still-water `renderTop` 817-818; tips `render` L517-521; summit `buildSky` L89-100; souls sea scroll
  521-529; vignettes `drawCastle` L216; kolobok `drawMill` 371-384, `genForeground` 495-531.
- 6.4: tips `render` L517-521; muster `drawLoaf` 533-564; souls mist 890-897; still-water `updAsh` 740-752.
- 6.5: kolobok `drawBursts` 486-533, `drawSack` 557-567; muster `drawHunter` 494-500 with `drawTree` 472-483.
- 6.6: still-water `CINE_SUNSET` 1375-1390, `CINE_RED` 1391-1411.

**Automatic fails.**

- F1: muster and reachbound `paintSky` with `fillBelow`; vignettes `drawCamp` L144-147.
- F2: reachbound `drawProj` L676-679; tips `animBlink` L377-379; vignettes `drawCastle` L226-233; kolobok
  `resize` 320-333.
- F3: SKILL rule 3; souls `sceneTower` 367-369, `sceneCity` 567-569; vignettes `drawLake` L259, `drawCastle`
  L217-221; tips `paintSky` L156-161; still-water `CINE_SUNSET` 1375-1390.
- F4: SKILL rule 4; the squint sheet in `art/frames/souls/`; tips `renderClouds` L70-98; reachbound
  necromancer L688-690; vignettes `layer()` L222-237.
- F5: SKILL rule 2 and failure list; hero `render()` 354-358; souls `sceneWolf` 891-904; reachbound
  `drawProj` L676-683, `buildPebble` L194; tips `animBell` L311-319.
- F6: SKILL rule 5 and failure list; still-water `drawFang` 1101-1121; souls `sceneTower` 418-479,
  `sceneCity` 596-681; tips wall L478-479, arch L270-276; vignettes tent L159-163; reachbound arch L630-640.
- F7: tips `render` L515-534; hero `render()` 367-370.
- F8: SKILL failure list (field strip, dark seam); vignettes `drawLake` L260 and L261-268; muster and
  reachbound `mirror`; tips `animLake` L241-245; reachbound `buildLoaf` L529-532; still-water `composite` 1078-1097.
- F9: SKILL failure list (powder); kolobok `drawBursts` 486-533; reachbound `drawCollector` L645-650; tips
  `animArch` L286-292.
- F10: tips `render` L517-521.
- F11: SKILL delivery checklist; still-water CSS 12-161; summit `LINES` L302-309; kolobok `shell.html` CSS 12-118.

**Evaluator rule.** Studio `CLAUDE.md` ("Don't claim you looked at a frame you didn't render"); cookbook
(Abyss); reachbound `README.md` shoot command with the exports L948-951.

Calibration: revised after blind round 1.
Calibration: revised after blind round 2.
