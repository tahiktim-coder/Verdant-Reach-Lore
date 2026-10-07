/* =============================================================================================
   WORLD DATA: the Verdant Reach, layout spec v1.            ALL PLACEMENTS ARE PROVISIONAL.
   The single source of truth for every map renderer. No art in here, only data.
   Plain JS, no dependencies, deterministic (seeded noise, no Math.random, no Date).
   Node:    const WORLD = require('./world.js');        Browser:  window.WORLD

   COORDINATES   u = 0 west .. 1 east,  v = 0 north .. 1 south.
   GRID          N x N cells (N = 512). Cell (i, j) has its centre at u = (i + 0.5) / N, v = (j + 0.5) / N.
                 Every grid array is row-major: index = j * N + i.

   GRID ARRAYS (all length N * N)
     height      Float32Array  0..1. Land is above SEA (0.20). Under the sea it is the sea FLOOR (below SEA).
                               On a lake it is the flat lake SURFACE. Pits are filled, so land always drains.
     waterDepth  Float32Array  0 on land; depth below the surface for sea and lakes, in height units.
     coast       Float32Array  rough signed distance to the sea coast in u units (+ inland, - out at sea).
     region      Uint8Array    id into REGIONS.
     river       Float32Array  0 = no river .. 1 = the biggest. From real downhill flow accumulation.
     flowTo      Int32Array    index of the downstream neighbour cell (-1 for sea cells).
     lake        Uint8Array    0 = none, else index into LAKES + 1.
     forest      Float32Array  tree density 0..1.
     forestType  Uint8Array    FOREST.NONE 0, WOOD 1 (old Reach forest), EYES 2 (the Forest of Eyes: dark,
                               old, draw it differently), PINE 3, CRYSTAL 4 (the sacred-tree groves; the blue
                               crystal look is only the provisional one), SWAMP 5.
     wheat       Float32Array  0..1 wheat cover (ripe strips near 1, fallow fields and baulks low).
     wheatAngle  Float32Array  radians, direction the strips of that field run (constant per field).
     wheatField  Uint16Array   field id (0 = not a field); cells of one field share id and angle.
     snow        Float32Array  0..1 snow cover (height against snowLineAt).
     mountain    Float32Array  0..1 how much the cell belongs to a mountain (0 lowland .. 1 crest). Low hills
                               (RANGES kind 'hill', castle hills, knolls) do not count: they stay 0.
     pitFill     Float32Array  how far a hollow was filled so it drains (0 almost everywhere). A data check:
                               big patches mean an edit left a basin with no way out. Renderers can ignore it.

   CONSTANTS     N, SEED, SEA (0.20), TREE_LINE (0.50), SNOW_LINE (0.66: the snow line in the far south;
                 it drops going north, see snowLineAt).
                 Rough height guide: lowland 0.20-0.30, hills 0.28-0.42, mountains 0.45-0.95. The great
                 northern ranges are the highest ground on the map; the alpine massif comes close.

   FUNCTIONS
     heightAt(u, v)        bilinear height.
     sample(array, u, v)   bilinear sample of any Float32 grid array.
     cell(u, v)            index of the cell containing (u, v), clamped to the grid.
     regionAt(u, v)        the REGIONS entry at (u, v).
     isWater(u, v)         true on sea or lake.
     snowLineAt(v)         height above which snow lies at latitude v.
     poi(key)              the POIS entry with that key (or undefined).

   TABLES
     REGIONS  [{ id, key, name, kind, realm }]  kind: 'sea' | 'land' | 'mountains' | 'plain' | 'alpine' |
              'swamp' | 'waste' | 'isles'.  realm: 'sea' | 'north' | 'reach' | 'east' | 'south' | 'waste' | 'isles'.
              The Reach is ONE land: draw no borders inside it (realm 'reach' covers ids 6..9).
              The border river is the line between the Reach and the eastern kingdom all the way to the gulf;
              the Mage Kingdoms (id 11) lie beyond the eastern kingdom and do not touch the Reach.
     LAKES    [{ key, name, rank, level, u, v, cells, note? }]
     POIS     [{ key, name, u, v, type, rank: 'major' | 'minor', provisional: true, height, region,
                 variant?, r?, note? }]   castles carry variant 0..8 (0 = Castle of the Order);
              r is a suggested footprint radius in u units. Use POIS for sprites and markers.
              provisional: true means the PLACEMENT is provisional. note says more where it matters:
              'name coined for the map, not in the lore', 'unnamed in the lore', 'name not locked' and so on.
              types: castle, city, lake, pass, crystal_grove, storm_valley, flower_field, dark_forest,
              spires, stone_hands, windmill, standing_stone, area, cavern, swamp, volcano, lone_mountain,
              battlefield, clockwork_tower (variant 0..2), wreckage, isles. 'area' and 'isles' mark a
              region's anchor, not a single object (the isles anchor is in the water between them; its
              region is still 13). A 'pass' always reports region 5.
     LABELS   [{ key, text, rank, u, v, extentU, extentV, poi? }]  ALL map text comes from here.
              rank 'major' = always shown, 'minor' = only in the labelled variant. (u, v) is the suggested
              centre of the text, extentU / extentV the suggested box. poi = key of the place it names.
     RANGES   [{ key, name, kind: 'belt' | 'spur' | 'alpine' | 'hill', h, w, pts: [[u, v], ...] }]
              smoothed crest lines; h = height of the tallest summit, w = half width in u units.
              'hill' = a line of low hills in the lowland (0.32-0.42), not a mountain range.
     PEAKS    [{ key, name, u, v, h, r }]  lone cones (the seven Fire-Dragon Peaks, the Buried Machine
              mount). The summit (or crater rim) is at (u, v) and reaches h.
     RIVERS   [{ key, name, named, pts: [[u, v], ...], w: [strength per point] }]  traced from the real
              flow on the grid, source first. w is 0 where the line crosses a lake. named = true for
              still_water_outflow, reach_river, border_river, east_river, alpine_river; the rest
              (tributaries, storm valley streams, lake outflows, 'stream_N') are small: draw them fainter
              or skip them.
     ROADS    [{ key, name, kind: 'path' | 'lamp' | 'dirt', pts: [[u, v], ...], note? }]
              note 'studio proposal, not in the lore' marks roads the author has not asked for.
     DATA     the raw tunable block below (what the author edits).
     STATS    { landCells, filledCells, maxFill, lakeShoreBelow, breached } numbers for sanity checks: hollows that had
              to be filled (cells, deepest), lake shore cells below their lake (must be 0), hollows opened by a gully.

   SPEED         built once when the file loads: about 0.7 to 0.8 s on the studio PC. N must be a multiple of 4.

   NOT ON THE MAP (unplaced in the lore): Hourglass Isle, the Endless Sword Fields, the Luminous Archive,
   the guild capitals, the pass of the last stand, the Summit.
   ============================================================================================= */
(function () {
'use strict';

// #############################################################################################
// TUNABLE DATA BLOCK. To move a place, edit one line here. Everything else is derived from this.
// u = 0 west .. 1 east, v = 0 north .. 1 south. Heights are 0..1 with the sea at 0.20.
// #############################################################################################
const N = 512;            // grid size
const SEED = 1207;        // change for a different coast wobble, hills and forests
const SEA = 0.20;         // sea level
const TREE_LINE = 0.50;   // forests thin out above this height
const SNOW_LINE = 0.66;   // snow line in the far south (see snowLineAt for the north)

const DATA = {
  // Mainland outline, clockwise from the north-west. Noise warps it afterwards. The big shapes are placed
  // by hand so the land is not a rounded square: a north bay, a cut north-east corner, the battlefield
  // bulge, the estuary bight of the eastern river, a south-east bay and cape, the hooked gulf, two fjords
  // under the alps, the ria of the Reach river and a western bulge.
  coast: [
    [0.062, 0.190], [0.088, 0.160], [0.116, 0.140], [0.138, 0.116], [0.168, 0.108], [0.200, 0.086],
    [0.238, 0.090], [0.262, 0.112], [0.300, 0.100], [0.332, 0.112],
    [0.350, 0.130], [0.372, 0.146], [0.402, 0.150], [0.430, 0.140], [0.448, 0.122], [0.458, 0.102],   // the north bay: shallow, so the cold strip runs on past it (was 0.196 deep: the high arc stood in the sea)
    [0.472, 0.088], [0.505, 0.082], [0.540, 0.094], [0.572, 0.104], [0.605, 0.098], [0.632, 0.078],
    [0.672, 0.086], [0.705, 0.098], [0.738, 0.088], [0.770, 0.096], [0.790, 0.104], [0.812, 0.094],
    [0.838, 0.096], [0.858, 0.110], [0.878, 0.138], [0.894, 0.170], [0.906, 0.204], [0.918, 0.232],   // north coast, cut north-east corner
    [0.944, 0.254], [0.960, 0.284], [0.968, 0.318], [0.964, 0.362], [0.952, 0.402], [0.942, 0.436],   // the battlefield bulge
    [0.916, 0.460], [0.888, 0.482], [0.864, 0.506], [0.844, 0.528], [0.826, 0.548], [0.836, 0.568], [0.862, 0.592], [0.892, 0.616],
    [0.924, 0.640], [0.954, 0.668],                                                                   // the estuary bight (polish 2: cut deeper)
    [0.962, 0.708], [0.952, 0.748], [0.934, 0.780], [0.904, 0.800], [0.882, 0.826], [0.886, 0.856],
    [0.912, 0.872], [0.938, 0.880], [0.952, 0.898], [0.940, 0.914], [0.915, 0.920],                   // south-east bay and cape
    [0.885, 0.910], [0.862, 0.926], [0.842, 0.952], [0.815, 0.968], [0.790, 0.958], [0.772, 0.934],
    [0.740, 0.926], [0.708, 0.932], [0.680, 0.950], [0.650, 0.968], [0.620, 0.958],                   // south coast: a cape, a shallow bay
    [0.614, 0.930], [0.606, 0.904], [0.594, 0.884], [0.566, 0.866], [0.530, 0.856], [0.500, 0.850],
    [0.476, 0.856], [0.472, 0.874], [0.488, 0.888], [0.500, 0.902], [0.506, 0.922], [0.496, 0.942], [0.478, 0.962],   // the gulf: hooked, its head bent toward the swamp (polish 2: wider channel)
    [0.444, 0.950], [0.404, 0.934], [0.370, 0.956], [0.328, 0.948], [0.300, 0.966], [0.286, 0.940],
    [0.268, 0.964], [0.232, 0.954], [0.220, 0.936], [0.206, 0.928], [0.192, 0.938], [0.176, 0.962],   // the south fjord at u 0.206
    [0.130, 0.954], [0.092, 0.966], [0.056, 0.958], [0.040, 0.925],                                   // south-west cape
    [0.056, 0.888], [0.076, 0.850], [0.066, 0.828], [0.086, 0.818], [0.098, 0.807], [0.084, 0.796],
    [0.064, 0.786],                                                                                   // the west fjord at v 0.807
    [0.072, 0.762], [0.052, 0.730], [0.058, 0.690], [0.072, 0.666], [0.104, 0.654], [0.134, 0.642],
    [0.122, 0.626], [0.092, 0.618], [0.064, 0.612],                                                   // the ria of the Reach river
    [0.058, 0.582], [0.056, 0.540], [0.064, 0.505], [0.066, 0.492], [0.068, 0.476], [0.066, 0.462],
    [0.056, 0.446], [0.046, 0.430], [0.038, 0.400], [0.036, 0.365], [0.048, 0.335], [0.050, 0.292],   // polish 2: the bay pulled back west, so Still Water's outflow runs a short way to the sea
    [0.060, 0.250], [0.054, 0.220]                                                                    // west coast: the bay of Still Water's outflow, a cape
  ],
  coastWarp: 0.06,                              // how far a slow second warp pushes the whole outline about
  islets: [                                     // [u, v, radius, stretch, axis in degrees]: offshore rocks and a few real islands
    // polish 2: the three big islands are built from overlapping pieces, so they are ragged, not ovals
    [0.948, 0.138, 0.013, 1.5, 30], [0.963, 0.161, 0.010, 1.2, 120], [0.941, 0.163, 0.006], [0.972, 0.142, 0.005],
    [0.924, 0.547, 0.010, 1.6, 125], [0.937, 0.565, 0.009, 1.2, 60], [0.918, 0.568, 0.005],
    [0.022, 0.638, 0.010, 1.5, 70], [0.015, 0.659, 0.008, 1.3, 140], [0.031, 0.657, 0.005],
    [0.400, 0.116, 0.011, 1.3, 20],
    [0.560, 0.066, 0.007], [0.586, 0.058, 0.004], [0.982, 0.468, 0.006], [0.026, 0.890, 0.007], [0.402, 0.980, 0.006],
    [0.215, 0.062, 0.005], [0.572, 0.972, 0.008], [0.972, 0.800, 0.005]
  ],
  artifactIsles: [                              // [du, dv, radius, stretch, axis] offsets from the place 'artifact_isles'
    // polish 3: five different isles: one big one with a cove (see inlets), a long one, a round one, two rocks (they were five ovals)
    [-0.022, 0.006, 0.015, 1.7, 15], [0.012, -0.017, 0.008, 2.6, 150], [0.036, -0.036, 0.0045], [0.028, 0.022, 0.0075, 1.3, 70], [0.052, 0.002, 0.0035]
  ],
  // polish 3: narrow inlets cut into the coast and sharp rocky capes (the outline read as round drippy lobes). Points run from
  // the mouth (out at sea) to the head of an inlet, or from the root (on land) to the tip of a cape; w = half width at the
  // mouth or root, narrowing to nothing. at = the points are offsets from that place.
  inlets: [
    { w: 0.0075, pts: [[0.698, 0.990], [0.700, 0.944], [0.692, 0.904], [0.683, 0.884]] },
    { w: 0.0070, pts: [[0.995, 0.750], [0.948, 0.758], [0.922, 0.768], [0.902, 0.772]] },
    { w: 0.0065, pts: [[0.352, 0.995], [0.350, 0.954], [0.340, 0.928], [0.333, 0.914]] },
    { w: 0.0055, at: 'artifact_isles', pts: [[-0.018, 0.034], [-0.020, 0.018], [-0.023, 0.007]] }   // the pirates' cove
  ],
  capes: [
    // (capes that point south read as drips in the tilted view: only east and west pointing ones)
    { w: 0.011, pts: [[0.924, 0.893], [0.950, 0.903], [0.974, 0.914]] },
    { w: 0.009, pts: [[0.952, 0.322], [0.968, 0.318], [0.986, 0.311]] },
    { w: 0.008, pts: [[0.060, 0.700], [0.042, 0.704], [0.026, 0.712]] }
  ],

  // Mountain crest lines. h = height of the tallest summit, w = half width, sag = how far saddles dip (0..1),
  // peaks = number of summits along the crest, t0 / t1 = how gently the two ends fade (share of length;
  // 0.03 = the crest keeps its height to the end: it runs into the sea or butts onto another range).
  // col = no saddle of this range dips below about this height (keeps the belt a barrier: the only ways
  // through are the passes below; debug_topdown.js checks it). steep = the steeper side: 'N' 'S' 'E' 'W', or 'L' / 'R' of the direction the
  // points run (for a bent line). kind 'hill' = a line of low hills.
  ranges: [
    // the Great Northern Ranges: five separate arcs of different length, height and strike, never one wall.
    // peaks: few, broad summits per arc (polish round 1 cut 8/9/6/9 to 4/5/4/5: the many summits drew a picket of spikes)
    { key: 'range_west', name: 'western arc', kind: 'belt', h: 0.76, w: 0.044, sag: 0.50, peaks: 4, t0: 0.03, t1: 0.20, col: 0.47, steep: 'S',
      pts: [[0.040, 0.240], [0.085, 0.224], [0.140, 0.210], [0.200, 0.226], [0.255, 0.262], [0.305, 0.305]] },
    { key: 'range_high', name: 'high arc', kind: 'belt', h: 0.95, w: 0.052, sag: 0.42, peaks: 5, t0: 0.18, t1: 0.08, col: 0.50, steep: 'N',
      pts: [[0.268, 0.198], [0.315, 0.212], [0.365, 0.245], [0.415, 0.285], [0.455, 0.305], [0.500, 0.300]] },
    { key: 'range_mid', name: 'middle arc', kind: 'belt', h: 0.80, w: 0.038, sag: 0.50, peaks: 4, t0: 0.03, t1: 0.12, col: 0.47, steep: 'S',
      pts: [[0.470, 0.292], [0.515, 0.262], [0.560, 0.232], [0.602, 0.222], [0.636, 0.244]] },
    { key: 'range_east', name: 'eastern arc', kind: 'belt', h: 0.70, w: 0.040, sag: 0.50, peaks: 5, t0: 0.07, t1: 0.03, col: 0.45, steep: 'S',
      pts: [[0.688, 0.226], [0.735, 0.255], [0.785, 0.282], [0.835, 0.270], [0.880, 0.244], [0.925, 0.236], [0.975, 0.250]] },
    { key: 'range_fareast', name: 'far eastern knot', kind: 'belt', h: 0.62, w: 0.026, sag: 0.45, peaks: 3, t0: 0.03, t1: 0.30, col: 0.42,
      pts: [[0.828, 0.262], [0.848, 0.226], [0.878, 0.204]] },
    // the spur at u 0.12: one horseshoe that cradles Still Water, open to the south-west; its top lies on the western arc
    // polish 3: its eastern arm ends sooner (it ran on to v 0.446 and took the band of the Starbloom Fields)
    { key: 'spur_stillwater', name: 'the Still Water cirque', kind: 'spur', h: 0.62, w: 0.028, sag: 0.40, peaks: 9, t0: 0.15, t1: 0.18, steep: 'R',
      pts: [[0.100, 0.400], [0.108, 0.350], [0.114, 0.290], [0.132, 0.230], [0.170, 0.226], [0.186, 0.268], [0.178, 0.318], [0.170, 0.360], [0.162, 0.396], [0.155, 0.422]] },
    // the spur at u 0.56: one bent ridge on the eastern side; the Reach side has detached knolls (see knolls)
    { key: 'spur_border', name: 'border hills', kind: 'spur', h: 0.46, w: 0.030, sag: 0.50, peaks: 6, t0: 0.03, t1: 0.40, steep: 'W',
      pts: [[0.598, 0.226], [0.612, 0.290], [0.598, 0.345], [0.618, 0.410]] },
    // the alpine massif of the green valleys
    { key: 'alp_divide', name: 'alpine divide', kind: 'alpine', h: 0.90, w: 0.048, sag: 0.40, peaks: 9, t0: 0.16, t1: 0.16,
      pts: [[0.090, 0.790], [0.140, 0.752], [0.195, 0.742], [0.245, 0.770], [0.290, 0.752], [0.340, 0.790]] },
    { key: 'alp_north', name: 'north spur of the alps', kind: 'alpine', h: 0.70, w: 0.030, sag: 0.40, peaks: 3, t0: 0.03, t1: 0.35,
      pts: [[0.196, 0.744], [0.190, 0.722], [0.178, 0.700]] },
    // polish 2: the western alps run from under the divide south-west toward the cape, so the valleys open to the coast (it read as a crater ring)
    { key: 'alp_west', name: 'western alps', kind: 'alpine', h: 0.78, w: 0.032, sag: 0.40, peaks: 4, t0: 0.20, t1: 0.30,
      pts: [[0.124, 0.856], [0.104, 0.884], [0.082, 0.914]] },
    { key: 'alp_mid', name: 'middle alps', kind: 'alpine', h: 0.86, w: 0.036, sag: 0.40, peaks: 3, t0: 0.03, t1: 0.25,
      pts: [[0.243, 0.778], [0.236, 0.812], [0.222, 0.840]] },
    { key: 'alp_east', name: 'eastern alps', kind: 'alpine', h: 0.78, w: 0.034, sag: 0.42, peaks: 5, t0: 0.03, t1: 0.40,
      pts: [[0.336, 0.800], [0.354, 0.838], [0.362, 0.878]] },
    // low hills that give the lowland its structure: watersheds, downs, foothill knots
    { key: 'hills_reach_n', name: 'northern downs', kind: 'hill', h: 0.38, w: 0.026, sag: 0.45, peaks: 4, t0: 0.25, t1: 0.25,
      pts: [[0.372, 0.420], [0.394, 0.456], [0.384, 0.500]] },
    { key: 'hills_reach_s', name: 'southern downs', kind: 'hill', h: 0.36, w: 0.026, sag: 0.45, peaks: 4, t0: 0.25, t1: 0.25,
      pts: [[0.286, 0.560], [0.268, 0.600], [0.290, 0.642]] },
    { key: 'hills_foot_w', name: 'foothills of the western arc', kind: 'hill', h: 0.42, w: 0.024, sag: 0.50, peaks: 3, t0: 0.20, t1: 0.30,
      pts: [[0.212, 0.298], [0.236, 0.328], [0.232, 0.362]] },
    { key: 'hills_foot_h', name: 'foothills of the high arc', kind: 'hill', h: 0.42, w: 0.026, sag: 0.50, peaks: 3, t0: 0.20, t1: 0.30,
      pts: [[0.418, 0.352], [0.446, 0.368], [0.478, 0.360]] },
    { key: 'hills_watershed_n', name: 'east downs', kind: 'hill', h: 0.37, w: 0.026, sag: 0.45, peaks: 4, t0: 0.25, t1: 0.25,
      pts: [[0.640, 0.398], [0.668, 0.436], [0.660, 0.486]] },
    { key: 'hills_watershed_s', name: 'east downs', kind: 'hill', h: 0.36, w: 0.028, sag: 0.45, peaks: 4, t0: 0.25, t1: 0.25,
      pts: [[0.648, 0.548], [0.672, 0.592], [0.666, 0.640]] },
    { key: 'hills_foot_e', name: 'foothills of the eastern arc', kind: 'hill', h: 0.40, w: 0.024, sag: 0.50, peaks: 3, t0: 0.20, t1: 0.30,
      pts: [[0.772, 0.336], [0.800, 0.352], [0.812, 0.384]] },
    { key: 'hills_wolds', name: 'eastern wolds', kind: 'hill', h: 0.35, w: 0.026, sag: 0.45, peaks: 4, t0: 0.25, t1: 0.25,
      pts: [[0.818, 0.428], [0.848, 0.452], [0.838, 0.498]] },
    { key: 'hills_south', name: 'south downs', kind: 'hill', h: 0.38, w: 0.028, sag: 0.45, peaks: 6, t0: 0.20, t1: 0.20,
      pts: [[0.652, 0.738], [0.700, 0.702], [0.760, 0.682], [0.818, 0.692]] },
    { key: 'hills_mage_coast', name: 'coast hills', kind: 'hill', h: 0.34, w: 0.024, sag: 0.45, peaks: 3, t0: 0.25, t1: 0.25,
      pts: [[0.640, 0.878], [0.672, 0.902], [0.712, 0.896]] },
    { key: 'hills_mage_east', name: 'coast hills', kind: 'hill', h: 0.36, w: 0.024, sag: 0.45, peaks: 3, t0: 0.25, t1: 0.25,
      pts: [[0.790, 0.850], [0.826, 0.874], [0.858, 0.872]] },
    { key: 'hills_north', name: 'northern hills', kind: 'hill', h: 0.33, w: 0.022, sag: 0.45, peaks: 3, t0: 0.25, t1: 0.25,
      pts: [[0.528, 0.150], [0.556, 0.166], [0.584, 0.158]] }
  ],
  // Detached knolls: [u, v, height above the ground around it, radius]. The first four are the Reach side of
  // the border spur: the border river rises in the hollow between them and the border hills.
  knolls: [
    [0.540, 0.300, 0.085, 0.024], [0.522, 0.346, 0.070, 0.021], [0.548, 0.386, 0.080, 0.025], [0.528, 0.424, 0.055, 0.019],
    [0.700, 0.580, 0.050, 0.020], [0.905, 0.720, 0.050, 0.020], [0.250, 0.500, 0.050, 0.020]
  ],
  cones: [                                      // lone mountains: offset [du, dv] from the place "at"; h = summit, r = foot radius
    // the Fire-Dragon Peaks: a short arc of seven cones, one big caldera
    { key: 'fire_dragon_1', name: 'Fire-Dragon Peaks', at: 'fire_dragon_peaks', du: -0.004, dv: -0.012, h: 0.66, r: 0.029, crater: 0.008 },
    { key: 'fire_dragon_2', name: 'Fire-Dragon Peaks', at: 'fire_dragon_peaks', du: -0.036, dv: 0.000, h: 0.50, r: 0.021, crater: 0 },
    { key: 'fire_dragon_3', name: 'Fire-Dragon Peaks', at: 'fire_dragon_peaks', du: -0.058, dv: 0.021, h: 0.42, r: 0.017, crater: 0 },
    { key: 'fire_dragon_4', name: 'Fire-Dragon Peaks', at: 'fire_dragon_peaks', du: 0.029, dv: -0.006, h: 0.56, r: 0.023, crater: 0.005 },
    { key: 'fire_dragon_5', name: 'Fire-Dragon Peaks', at: 'fire_dragon_peaks', du: 0.052, dv: 0.013, h: 0.47, r: 0.019, crater: 0 },
    { key: 'fire_dragon_6', name: 'Fire-Dragon Peaks', at: 'fire_dragon_peaks', du: 0.062, dv: 0.038, h: 0.40, r: 0.016, crater: 0 },
    { key: 'fire_dragon_7', name: 'Fire-Dragon Peaks', at: 'fire_dragon_peaks', du: 0.006, dv: 0.027, h: 0.43, r: 0.017, crater: 0.004 },
    { key: 'buried_machine', name: 'Mount of the Buried Machine', at: 'buried_machine', du: 0, dv: 0, h: 0.75, r: 0.034, crater: 0 }
  ],
  // Passes through the northern ranges: the ONLY two ways through (debug_topdown.js checks that they are
  // the lowest ways). The bed is "floor" at the marker point (the col) and falls by "fall" toward both
  // ends. The first is also a road.
  // mark = which point of the line carries the place marker.
  passes: [
    { key: 'mountain_path', name: 'the mountain path', floor: 0.335, fall: 0.06, w: 0.024, mark: 3,
      pts: [[0.250, 0.178], [0.250, 0.208], [0.274, 0.236], [0.305, 0.254], [0.336, 0.272], [0.346, 0.300], [0.328, 0.330], [0.302, 0.360]] },
    { key: 'east_gap', name: 'the low gap', floor: 0.30, fall: 0.03, w: 0.024, mark: 1, note: 'unnamed in the lore',
      pts: [[0.655, 0.195], [0.660, 0.250], [0.668, 0.300]] }
  ],
  beltAxis: [                                   // the watershed of the ranges: north of it = Northern Lands
    [0.00, 0.240], [0.085, 0.224], [0.14, 0.210], [0.20, 0.226], [0.255, 0.262], [0.305, 0.254], [0.365, 0.245], [0.415, 0.285],
    [0.455, 0.305], [0.470, 0.292], [0.515, 0.262], [0.560, 0.232], [0.602, 0.222], [0.632, 0.242], [0.66, 0.250], [0.692, 0.225],
    [0.735, 0.255], [0.785, 0.282], [0.835, 0.270], [0.880, 0.244], [0.925, 0.236], [1.00, 0.250]
  ],

  // Lakes: a centre line and a half width (one number, or one per point). level = surface height; without
  // it the lake sits on the valley floor. steep = how fast the shore rises.
  lakes: [
    { key: 'still_water', name: 'Still Water', rank: 'major', hw: [0.012, 0.017, 0.015, 0.016, 0.010], steep: 0.6, level: 0.262,
      pts: [[0.153, 0.298], [0.141, 0.328], [0.144, 0.362], [0.132, 0.392], [0.127, 0.415]],
      note: 'location open in the bible; inside the Reach here is the layout spec\'s choice; the Kolobok proposal wants it within walking distance of the wheat country' },
    { key: 'alpine_lake_west', name: 'alpine lake', hw: [0.007, 0.011, 0.011, 0.007], steep: 0.5, pts: [[0.148, 0.803], [0.161, 0.799], [0.176, 0.801], [0.187, 0.806]] },   // polish 2: straighter and fuller (the crescent read as an arch)
    { key: 'alpine_lake_valley', name: 'alpine lake', hw: [0.005, 0.009, 0.008, 0.005], steep: 0.5, pts: [[0.296, 0.826], [0.286, 0.838], [0.284, 0.852], [0.290, 0.864]] },
    { key: 'alpine_tarn', name: 'alpine tarn', hw: [0.007, 0.008], steep: 0.8, pts: [[0.214, 0.786], [0.224, 0.792]] }
  ],

  // River guide lines, source first; the last point is out at sea, or ON the river named by "into".
  // A river that drains a lake starts at the far end of that lake and runs through it (so the lake lies in
  // the river's valley); its channel is only cut from where it leaves the lake.
  // The real river is whatever the flow does on the grid, but each guide makes a valley that the flow
  // follows. src = height of the spring. A point may carry a third number: the height of the bed there
  // (the bed falls evenly between such points; before the first of them it falls steeply at the spring:
  // grade, 1 = evenly, default 1.25). w = half width of the carved channel, meander = how far the line
  // swings (it grows downstream), wave = length of one swing, calm = a place the river passes without
  // swinging. minor = a small stream (not one of the five named rivers).
  // A river cannot be steeper than its valley sides (valleySlope, five times that near a mountain crest):
  // where the guide asks for more, the head of the valley is simply lower than src.
  // The streams at both ends of each pass matter: they are the valleys the pass leads into. Keep their
  // src just below the bed at that end of the pass (floor - fall).
  rivers: [
    { key: 'still_water_outflow', name: "Still Water's outflow", src: 0.264, w: 0.012, meander: 0.004, wave: 0.05,
      pts: [[0.153, 0.300], [0.141, 0.328], [0.144, 0.362], [0.132, 0.392], [0.127, 0.413, 0.262], [0.116, 0.432], [0.100, 0.446], [0.070, 0.460], [0.012, 0.468]] },
    { key: 'reach_river', name: 'the Reach river', src: 0.318, w: 0.020, meander: 0.011,
      pts: [[0.348, 0.296], [0.331, 0.326], [0.302, 0.366, 0.270], [0.290, 0.408], [0.258, 0.440], [0.236, 0.482], [0.206, 0.512], [0.196, 0.566],
        [0.160, 0.612], [0.118, 0.636], [0.060, 0.640], [0.012, 0.644]] },
    { key: 'border_river', name: 'the border river', src: 0.42, w: 0.020, meander: 0.021, wave: 0.085,   // polish 3: more meander (it read as a ruled border)
      pts: [[0.585, 0.255], [0.566, 0.300], [0.578, 0.350], [0.556, 0.405], [0.572, 0.455, 0.243], [0.598, 0.505], [0.590, 0.560], [0.558, 0.615],
        [0.572, 0.665], [0.606, 0.720], [0.592, 0.775, 0.226], [0.562, 0.822], [0.548, 0.868], [0.550, 0.915]] },
    { key: 'east_river', name: "the eastern kingdom's river", src: 0.42, w: 0.018, meander: 0.010, calm: 'eastern_city',
      pts: [[0.745, 0.268], [0.728, 0.312], [0.708, 0.362, 0.275], [0.730, 0.420], [0.720, 0.468], [0.728, 0.506], [0.760, 0.530], [0.800, 0.536],
        [0.838, 0.552], [0.872, 0.554], [0.930, 0.585], [0.990, 0.590]] },
    { key: 'alpine_river', name: 'the alpine valley river', src: 0.50, w: 0.012, meander: 0.005, wave: 0.06,
      pts: [[0.286, 0.784], [0.300, 0.812], [0.287, 0.842], [0.272, 0.880], [0.292, 0.910], [0.280, 0.936], [0.288, 0.962], [0.284, 0.995]] },
    { key: 'storm_stream_w', name: 'storm valley stream', src: 0.46, w: 0.018, meander: 0.005, wave: 0.06, minor: true,
      pts: [[0.466, 0.280], [0.482, 0.250], [0.476, 0.216], [0.490, 0.182], [0.474, 0.150], [0.482, 0.110], [0.474, 0.050]] },
    { key: 'storm_stream_e', name: 'storm valley stream', src: 0.44, w: 0.018, meander: 0.005, wave: 0.06, minor: true,
      pts: [[0.833, 0.249], [0.808, 0.240], [0.784, 0.216], [0.790, 0.176], [0.776, 0.146], [0.790, 0.118], [0.788, 0.050]] },
    { key: 'lake_west_outflow', name: 'alpine lake outflow', src: 0.315, w: 0.010, meander: 0.002, wave: 0.04, minor: true,
      pts: [[0.187, 0.806], [0.176, 0.801], [0.161, 0.799], [0.148, 0.803, 0.310], [0.132, 0.812], [0.114, 0.806], [0.092, 0.808], [0.020, 0.806]] },
    { key: 'tarn_stream', name: 'tarn stream', src: 0.44, w: 0.010, meander: 0.004, wave: 0.05, minor: true,
      pts: [[0.214, 0.786], [0.223, 0.793, 0.435], [0.214, 0.822], [0.216, 0.852], [0.200, 0.884], [0.208, 0.915], [0.206, 0.940], [0.204, 0.995]] },
    { key: 'reach_stream_n', name: 'stream from the high arc', src: 0.40, w: 0.012, meander: 0.006, wave: 0.07, minor: true, into: 'reach_river',
      pts: [[0.428, 0.318], [0.404, 0.352], [0.366, 0.388], [0.340, 0.436], [0.296, 0.462], [0.248, 0.468]] },
    { key: 'reach_stream_s', name: 'stream from the alps', src: 0.42, w: 0.012, meander: 0.006, wave: 0.07, minor: true, into: 'reach_river',
      pts: [[0.240, 0.736], [0.218, 0.726], [0.214, 0.700], [0.236, 0.672], [0.246, 0.648], [0.224, 0.624], [0.186, 0.590]] },
    { key: 'swamp_stream', name: 'stream to the swamp', src: 0.33, w: 0.012, meander: 0.006, wave: 0.07, minor: true,
      pts: [[0.362, 0.672], [0.384, 0.722], [0.386, 0.772], [0.414, 0.812], [0.446, 0.850], [0.474, 0.866], [0.520, 0.882]] },
    { key: 'east_stream_w', name: 'stream from the low gap', src: 0.268, w: 0.012, meander: 0.006, wave: 0.07, minor: true, into: 'east_river',
      pts: [[0.668, 0.292], [0.674, 0.335], [0.666, 0.372], [0.690, 0.410], [0.706, 0.446], [0.722, 0.466]] },
    { key: 'gap_stream_n', name: 'stream from the low gap', src: 0.268, w: 0.012, meander: 0.005, wave: 0.07, minor: true,
      pts: [[0.656, 0.206], [0.648, 0.172], [0.660, 0.136], [0.652, 0.100], [0.655, 0.040]] },
    { key: 'path_stream_n', name: 'stream from the mountain path', src: 0.272, w: 0.012, meander: 0.005, wave: 0.07, minor: true,
      pts: [[0.250, 0.192], [0.244, 0.168], [0.258, 0.142], [0.250, 0.112], [0.254, 0.050]] },
    { key: 'east_stream_s', name: 'stream from the south downs', src: 0.34, w: 0.012, meander: 0.007, wave: 0.07, minor: true, into: 'east_river',
      pts: [[0.716, 0.668], [0.722, 0.630], [0.756, 0.602], [0.776, 0.566], [0.802, 0.538]] },
    { key: 'gulf_stream', name: 'stream to the gulf', src: 0.34, w: 0.012, meander: 0.006, wave: 0.07, minor: true,
      pts: [[0.676, 0.752], [0.650, 0.800], [0.632, 0.846], [0.606, 0.884], [0.570, 0.910]] },
    { key: 'dragon_stream', name: 'stream from the Fire-Dragon Peaks', src: 0.36, w: 0.012, meander: 0.006, wave: 0.07, minor: true,
      pts: [[0.742, 0.826], [0.760, 0.858], [0.746, 0.898], [0.762, 0.930], [0.756, 0.990]] },
    { key: 'machine_stream', name: 'stream from the lone mountain', src: 0.36, w: 0.010, meander: 0.004, wave: 0.06, minor: true,
      pts: [[0.872, 0.772], [0.884, 0.798], [0.900, 0.822], [0.930, 0.838]] },
    { key: 'border_stream_w', name: 'stream from the hollow', src: 0.36, w: 0.010, meander: 0.003, wave: 0.05, minor: true, into: 'border_river',
      pts: [[0.508, 0.310], [0.528, 0.326], [0.550, 0.322], [0.568, 0.332]] },
    { key: 'knot_stream', name: 'stream from the far eastern knot', src: 0.36, w: 0.010, meander: 0.003, wave: 0.05, minor: true,
      pts: [[0.866, 0.228], [0.890, 0.216], [0.912, 0.202], [0.950, 0.192]] }
  ],

  // Flat or special ground. Edges are feathered and warped by noise.
  // The wheat country: an outline (clockwise). It is always cut off at the west bank of "river"; its level
  // follows that river's bed, "above" higher, so the plain is flat and still drains into the river.
  // bank = how far the plain keeps off the river (it starts at the first number, full at the second; polish 3: a green strip, so
  // the river no longer reads as the outline of the wheat)
  wheat: { river: 'border_river', above: 0.008, fieldSize: 0.028, bank: [0.014, 0.032],
    poly: [[0.424, 0.470], [0.468, 0.452], [0.520, 0.460], [0.566, 0.474], [0.612, 0.520], [0.612, 0.730], [0.596, 0.782], [0.540, 0.796],
      [0.492, 0.780], [0.440, 0.790], [0.412, 0.762], [0.420, 0.716], [0.400, 0.672], [0.412, 0.626], [0.394, 0.580], [0.408, 0.530]] },
  // The Silent Battlefield flats: an outline as offsets [du, dv] from the place 'silent_battlefield'.
  battlefield: { level: 0.226,
    poly: [[-0.055, -0.048], [-0.020, -0.062], [0.020, -0.056], [0.057, -0.042], [0.085, -0.010], [0.080, 0.034], [0.050, 0.062], [0.006, 0.066],
      [-0.030, 0.058], [-0.058, 0.036], [-0.050, 0.004], [-0.062, -0.022]] },
  swampSize: 1.1,                               // the swamp flats, as a multiple of the r of the place 'toad_swamp'
  // The eastern kingdom holds the whole east bank of the border river down to the gulf; south of southLine
  // (a west-to-east line) lie the Mage Kingdoms. OPEN CHOICE (bible S3): the spec's box for the Mage Kingdoms
  // starts at u 0.60, v 0.70, which would make them touch the Reach across the river; to get that back,
  // set southLine to [[0.54, 0.69], [1.00, 0.69]].
  eastKingdom: { box: [0.60, 1.00, 0.33, 0.69], southLine: [[0.54, 0.900], [0.62, 0.860], [0.66, 0.745], [0.72, 0.700], [0.80, 0.682], [0.90, 0.700], [1.00, 0.690]] },
  massif: { lift: 0.11 },                       // how far the alpine ridges lift the valleys between them
  beltLift: 0.035,                              // the same for the foothills of the northern ranges
  // The lowland is shaped by its rivers: every place is "the bed of the nearest river + valleySlope x the
  // distance to it", up to a ceiling: inland (+- upland, a slow noise) plus apron near the mountains.
  lowland: { shore: 0.022, inland: 0.070, upland: 0.050, apron: 0.030, apronReach: 0.20 },
  valleySlope: 0.42,                            // how fast the lowland rises away from a river (height per u)
  valleyDepth: 0.020,                           // how far a river bed lies below the ceiling at least
  valleyFloor: [1.5, 4.5],                      // half width of the level floor of a valley, in cells: in the lowland, in the alpine massif
  hills: { amp: 0.17, base: 0.050, small: 0.016 },   // rolling hills: height in hill country, on the plains, and of the small ridges

  // Castles: each on its own hill. variant picks the silhouette (0 = Castle of the Order).
  castles: [
    { key: 'castle_order', name: 'Castle of the Order', u: 0.360, v: 0.620, variant: 0, hill: 0.075, r: 0.024, rank: 'major' },
    { key: 'castle_1', name: 'unnamed castle', u: 0.222, v: 0.432, variant: 1, hill: 0.065, r: 0.016, note: 'downs north of the Reach river' },
    { key: 'castle_2', name: 'unnamed castle', u: 0.086, v: 0.505, variant: 2, hill: 0.055, r: 0.014, note: 'sea cliff on the Western Sea' },
    { key: 'castle_3', name: 'unnamed castle', u: 0.400, v: 0.386, variant: 3, hill: 0.050, r: 0.016, note: 'a knoll below the foothills of the high arc' },
    { key: 'castle_4', name: 'unnamed castle', u: 0.310, v: 0.822, variant: 4, hill: 0.050, r: 0.014, note: 'green valleys: on a crag over the alpine river, below the Cavern of Giants' },
    { key: 'castle_5', name: 'unnamed castle', u: 0.094, v: 0.674, variant: 5, hill: 0.050, r: 0.015, note: 'headland south of the Reach river mouth' },
    { key: 'castle_6', name: 'unnamed castle', u: 0.528, v: 0.600, variant: 6, hill: 0.050, r: 0.014, note: 'lone hill over the wheat, watching the border river' },
    { key: 'castle_7', name: 'unnamed castle', u: 0.186, v: 0.872, variant: 7, hill: 0.050, r: 0.014, note: 'green valleys: where the alpine valleys meet' },
    { key: 'castle_8', name: 'unnamed castle', u: 0.400, v: 0.904, variant: 8, hill: 0.050, r: 0.015, note: 'south coast, between the alps and the swamp' }
  ],

  // Every other place (lakes and passes add their own markers). r = footprint radius: it sizes the Forest
  // of Eyes, the sacred groves and the swamp. clear = keep forest off it. Cones, isles, the battlefield
  // flats, roads and minor labels all follow the place they name, so moving a place is one line here.
  // The Forest of Eyes is not a disc: stretch = how long it is against its width, axis = which way the long
  // side runs (degrees: 0 = west-east, 90 = north-south, 135 = north-east to south-west). It keeps to the
  // low ground and stops at the Reach river.
  pois: [
    { key: 'crystal_grove_w', name: 'sacred-tree grove', u: 0.300, v: 0.150, type: 'crystal_grove', rank: 'minor', r: 0.030 },
    { key: 'crystal_grove_e', name: 'sacred-tree grove', u: 0.620, v: 0.140, type: 'crystal_grove', rank: 'minor', r: 0.030 },
    { key: 'storm_valley_w', name: 'storm valley', u: 0.480, v: 0.170, type: 'storm_valley', rank: 'minor', r: 0.030 },
    { key: 'storm_valley_e', name: 'storm valley', u: 0.780, v: 0.160, type: 'storm_valley', rank: 'minor', r: 0.030 },
    { key: 'starbloom_fields', name: 'Starbloom Fields', u: 0.300, v: 0.360, type: 'flower_field', rank: 'minor', r: 0.034, clear: 0.034,
      note: 'name coined for the map, not in the lore (the bible has "Colossal Starblooms")' },
    { key: 'forest_of_eyes', name: 'Forest of Eyes', u: 0.140, v: 0.560, type: 'dark_forest', rank: 'major', r: 0.066, stretch: 1.8, axis: 130 },
    { key: 'colossal_spires', name: 'Colossal Spires', u: 0.340, v: 0.520, type: 'spires', rank: 'major', r: 0.014, clear: 0.018 },
    { key: 'stone_hands', name: 'Stone Hands', u: 0.460, v: 0.420, type: 'stone_hands', rank: 'major', r: 0.014, clear: 0.018 },
    { key: 'windmill_n', name: 'windmill', u: 0.470, v: 0.560, type: 'windmill', rank: 'minor' },
    { key: 'windmill_s', name: 'windmill', u: 0.500, v: 0.680, type: 'windmill', rank: 'minor' },
    { key: 'standing_stone_1', name: 'standing stone', u: 0.440, v: 0.505, type: 'standing_stone', rank: 'minor' },
    { key: 'standing_stone_2', name: 'standing stone', u: 0.523, v: 0.648, type: 'standing_stone', rank: 'minor' },
    { key: 'standing_stone_3', name: 'standing stone', u: 0.452, v: 0.725, type: 'standing_stone', rank: 'minor' },
    { key: 'wheat_country', name: 'the wheat country', u: 0.480, v: 0.620, type: 'area', rank: 'major', r: 0.080 },
    { key: 'green_valleys', name: 'the green valleys', u: 0.215, v: 0.820, type: 'area', rank: 'major', r: 0.140 },
    { key: 'cavern_of_giants', name: 'Cavern of Giants', u: 0.300, v: 0.800, type: 'cavern', rank: 'minor' },
    { key: 'toad_swamp', name: 'Toad Swamp', u: 0.440, v: 0.860, type: 'swamp', rank: 'minor', r: 0.045, note: 'name not locked (06-places, 12-archive); spec v1 calls it Toad Swamp' },
    { key: 'eastern_city', name: 'city of towers and domes', u: 0.740, v: 0.500, type: 'city', rank: 'major', r: 0.022, clear: 0.024, note: 'every window lit; unnamed in the lore' },
    { key: 'fire_dragon_peaks', name: 'Fire-Dragon Peaks', u: 0.720, v: 0.800, type: 'volcano', rank: 'major', r: 0.060,
      note: 'faint ember glow; name coined for the map, not in the lore' },
    { key: 'buried_machine', name: 'Mount of the Buried Machine', u: 0.860, v: 0.740, type: 'lone_mountain', rank: 'major', r: 0.034,
      note: 'name coined for the map, not in the lore (the bible has "the machine under the southern mountain")' },
    { key: 'silent_battlefield', name: 'Silent Battlefield', u: 0.905, v: 0.338, type: 'battlefield', rank: 'major', r: 0.060 },
    { key: 'clockwork_tower_1', name: 'clockwork tower', u: 0.872, v: 0.312, type: 'clockwork_tower', rank: 'minor', variant: 0 },
    { key: 'clockwork_tower_2', name: 'clockwork tower', u: 0.920, v: 0.338, type: 'clockwork_tower', rank: 'minor', variant: 1 },
    { key: 'clockwork_tower_3', name: 'clockwork tower', u: 0.893, v: 0.374, type: 'clockwork_tower', rank: 'minor', variant: 2 },
    { key: 'wreckage_1', name: 'old wreckage', u: 0.900, v: 0.322, type: 'wreckage', rank: 'minor' },
    { key: 'wreckage_2', name: 'old wreckage', u: 0.938, v: 0.306, type: 'wreckage', rank: 'minor' },
    { key: 'wreckage_3', name: 'old wreckage', u: 0.884, v: 0.352, type: 'wreckage', rank: 'minor' },
    { key: 'artifact_isles', name: 'Artifact Isles', u: 0.930, v: 0.960, type: 'isles', rank: 'major', r: 0.045,
      note: 'pirates; name coined for the map, not in the lore (the kingdom has no official name yet)' },
    // polish 3: two small towers so the Mage Kingdoms read as lived in (studio proposal, not placed in the lore)
    { key: 'mage_tower_1', name: 'mage tower', u: 0.668, v: 0.842, type: 'mage_tower', rank: 'minor', variant: 0, note: 'studio proposal' },
    { key: 'mage_tower_2', name: 'mage tower', u: 0.806, v: 0.878, type: 'mage_tower', rank: 'minor', variant: 1, note: 'studio proposal' }
  ],

  // Roads. A point is [u, v] or the key of a place (the road then follows that place if it moves).
  // The spec has only the mountain path, the lamp road and dirt roads in the wheat country; a road with a
  // note is a studio proposal.
  roads: [
    { key: 'mountain_path', name: 'the mountain path', kind: 'path', fromPass: 'mountain_path' },
    { key: 'lamp_road', name: 'the lamp road', kind: 'lamp', pts: ['eastern_city', [0.700, 0.508], [0.655, 0.518], [0.622, 0.522], [0.596, 0.518]] },
    { key: 'wheat_road', name: 'wheat country road', kind: 'dirt', pts: [[0.465, 0.472], 'windmill_n', [0.488, 0.620], 'windmill_s', [0.485, 0.770]] },
    { key: 'reach_road', name: 'road to the Order', kind: 'dirt', note: 'studio proposal, not in the lore',
      pts: [[0.596, 0.518], [0.550, 0.540], [0.505, 0.556], 'windmill_n', [0.420, 0.586], 'castle_order'] },
    { key: 'north_road', name: 'road to the mountain path', kind: 'dirt', note: 'studio proposal, not in the lore',
      pts: ['castle_order', [0.346, 0.565], 'colossal_spires', [0.322, 0.440], 'starbloom_fields'] }
  ],

  // Map text. Major = always shown, centre of the text at (u, v). Minor = only in the labelled variant,
  // placed at an offset (du, dv) from the place it names.
  labels: [
    { key: 'verdant_reach', text: 'THE VERDANT REACH', rank: 'major', u: 0.305, v: 0.672, extentU: 0.300, extentV: 0.036 },
    { key: 'eastern_kingdom', text: 'THE EASTERN KINGDOM', rank: 'major', u: 0.765, v: 0.632, extentU: 0.260, extentV: 0.036 },
    { key: 'mage_kingdoms', text: 'THE MAGE KINGDOMS', rank: 'major', u: 0.752, v: 0.888, extentU: 0.260, extentV: 0.036 },
    { key: 'northern_lands', text: 'THE NORTHERN LANDS', rank: 'major', u: 0.556, v: 0.128, extentU: 0.110, extentV: 0.028 },
    { key: 'unknown_sea', text: 'THE UNKNOWN SEA', rank: 'major', u: 0.500, v: 0.040, extentU: 0.360, extentV: 0.034 },
    { key: 'still_water', text: 'Still Water', rank: 'minor', du: 0.090, dv: 0.016, extentU: 0.070, extentV: 0.018, poi: 'still_water' },
    { key: 'starbloom_fields', text: 'Starbloom Fields', rank: 'minor', du: 0.045, dv: 0.032, extentU: 0.090, extentV: 0.018, poi: 'starbloom_fields' },
    { key: 'forest_of_eyes', text: 'Forest of Eyes', rank: 'minor', du: 0, dv: 0, extentU: 0.090, extentV: 0.018, poi: 'forest_of_eyes' },
    { key: 'colossal_spires', text: 'Colossal Spires', rank: 'minor', du: 0, dv: 0.028, extentU: 0.090, extentV: 0.018, poi: 'colossal_spires' },
    { key: 'stone_hands', text: 'Stone Hands', rank: 'minor', du: 0, dv: 0.026, extentU: 0.075, extentV: 0.018, poi: 'stone_hands' },
    { key: 'castle_order', text: 'Castle of the Order', rank: 'minor', du: 0, dv: -0.024, extentU: 0.110, extentV: 0.018, poi: 'castle_order' },
    { key: 'wheat_country', text: 'the wheat country', rank: 'minor', du: 0, dv: 0, extentU: 0.110, extentV: 0.018, poi: 'wheat_country' },
    { key: 'green_valleys', text: 'the green valleys', rank: 'minor', du: -0.015, dv: 0.110, extentU: 0.120, extentV: 0.018, poi: 'green_valleys' },
    { key: 'cavern_of_giants', text: 'Cavern of Giants', rank: 'minor', du: 0.018, dv: -0.020, extentU: 0.090, extentV: 0.018, poi: 'cavern_of_giants' },
    { key: 'toad_swamp', text: 'Toad Swamp', rank: 'minor', du: -0.010, dv: 0.025, extentU: 0.090, extentV: 0.018, poi: 'toad_swamp' },
    { key: 'mountain_path', text: 'the mountain path', rank: 'minor', du: -0.055, dv: 0.046, extentU: 0.100, extentV: 0.018, poi: 'mountain_path' },
    { key: 'fire_dragon_peaks', text: 'Fire-Dragon Peaks', rank: 'minor', du: 0, dv: 0.062, extentU: 0.100, extentV: 0.018, poi: 'fire_dragon_peaks' },
    { key: 'buried_machine', text: 'Mount of the Buried Machine', rank: 'minor', du: -0.040, dv: 0.050, extentU: 0.150, extentV: 0.018, poi: 'buried_machine' },
    { key: 'silent_battlefield', text: 'Silent Battlefield', rank: 'minor', du: 0, dv: 0.078, extentU: 0.100, extentV: 0.018, poi: 'silent_battlefield' },
    { key: 'artifact_isles', text: 'Artifact Isles', rank: 'minor', du: -0.060, dv: 0.026, extentU: 0.080, extentV: 0.016, poi: 'artifact_isles' }
  ]
};

const REGIONS = [
  { id: 0, key: 'unknown_sea', name: 'The Unknown Sea', kind: 'sea', realm: 'sea' },
  { id: 1, key: 'western_sea', name: 'The Western Sea', kind: 'sea', realm: 'sea' },
  { id: 2, key: 'southern_sea', name: 'the southern sea', kind: 'sea', realm: 'sea' },
  { id: 3, key: 'eastern_sea', name: 'The Eastern Sea', kind: 'sea', realm: 'sea' },
  { id: 4, key: 'northern_lands', name: 'The Northern Lands', kind: 'land', realm: 'north' },
  { id: 5, key: 'northern_ranges', name: 'the great northern ranges', kind: 'mountains', realm: 'north' },
  { id: 6, key: 'reach_interior', name: 'The Verdant Reach', kind: 'land', realm: 'reach' },
  { id: 7, key: 'wheat_country', name: 'the wheat country', kind: 'plain', realm: 'reach' },
  { id: 8, key: 'green_valleys', name: 'the green valleys', kind: 'alpine', realm: 'reach' },
  { id: 9, key: 'toad_swamp', name: 'Toad Swamp', kind: 'swamp', realm: 'reach' },
  { id: 10, key: 'eastern_kingdom', name: 'The Eastern Kingdom', kind: 'land', realm: 'east' },
  { id: 11, key: 'mage_kingdoms', name: 'The Mage Kingdoms of the South', kind: 'land', realm: 'south' },
  { id: 12, key: 'silent_battlefield', name: 'The Silent Battlefield', kind: 'waste', realm: 'waste' },
  { id: 13, key: 'artifact_isles', name: 'The Artifact Isles', kind: 'isles', realm: 'isles' }
];
const FOREST = { NONE: 0, WOOD: 1, EYES: 2, PINE: 3, CRYSTAL: 4, SWAMP: 5 };
// River strength: a channel shows once this much water drains through it; full strength at RIVER_FULL.
// (One lowland cell gives 1; high ground gives up to RAIN_HIGH. The bar is higher on the flats, lower in the mountains.)
const RIVER_MIN = 4200, RIVER_FULL = 80000, RAIN_HIGH = 8;
// #############################################################################################
// END OF THE TUNABLE DATA BLOCK
// #############################################################################################

// ---------------------------------------------------------------- utils (from the pixel-scenes examples)
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {                    // value noise; the four corner hashes are written out (one call, no garbage)
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = xf * xf * (3 - 2 * xf), b = yf * yf * (3 - 2 * yf);
  const x0 = Math.imul(xi | 0, 374761393), x1 = Math.imul((xi + 1) | 0, 374761393);
  const y0 = Math.imul(yi | 0, 668265263) ^ Math.imul((s | 0) + 1, 982451653), y1 = Math.imul((yi + 1) | 0, 668265263) ^ Math.imul((s | 0) + 1, 982451653);
  let h = x0 ^ y0; h = Math.imul(h ^ (h >>> 13), 1274126177); const p = (h ^ (h >>> 16)) >>> 0;
  h = x1 ^ y0; h = Math.imul(h ^ (h >>> 13), 1274126177); const q = (h ^ (h >>> 16)) >>> 0;
  h = x0 ^ y1; h = Math.imul(h ^ (h >>> 13), 1274126177); const r = (h ^ (h >>> 16)) >>> 0;
  h = x1 ^ y1; h = Math.imul(h ^ (h >>> 13), 1274126177); const t = (h ^ (h >>> 16)) >>> 0;
  return (p + (q - p) * a + (r - p) * b + (p - q - r + t) * a * b) / 4294967296;
}
function fbm(x, y, s, oct) {
  let f = 0, amp = 0.5, tot = 0;
  for (let i = 0; i < oct; i++) { f += amp * vnoise(x, y, s + i * 131); tot += amp; x *= 2.02; y *= 2.02; amp *= 0.5; }
  return f / tot;
}
// ridged noise: sharp crests, 0..1 (1 on a ridge line)
function ridged(x, y, s) {
  let f = 0, amp = 0.5, tot = 0;
  for (let i = 0; i < 3; i++) { const n = 1 - Math.abs(2 * vnoise(x, y, s + i * 71) - 1); f += amp * n * n; tot += amp; x *= 2.1; y *= 2.1; amp *= 0.5; }
  return f / tot;
}
// 1 inside the box, feathered edges
function sbox(u, v, b, f) {
  if (u < b[0] - f || u > b[1] + f || v < b[2] - f || v > b[3] + f) return 0;
  return smooth(b[0] - f, b[0] + f, u) * (1 - smooth(b[1] - f, b[1] + f, u)) * smooth(b[2] - f, b[2] + f, v) * (1 - smooth(b[3] - f, b[3] + f, v));
}

// ---------------------------------------------------------------- polylines
function spline(pts, per) {                    // Catmull-Rom through the points
  const out = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i > 0 ? i - 1 : 0], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2 < n ? i + 2 : n - 1];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t, q = [0, 0];
      for (let a = 0; a < 2; a++) q[a] = 0.5 * (2 * p1[a] + (p2[a] - p0[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (3 * p1[a] - p0[a] - 3 * p2[a] + p3[a]) * t3);
      out.push(q);
    }
  }
  out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}
function resample(pts, step) {                 // points at equal spacing along the line
  const out = [pts[0].slice()];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let ax = pts[i - 1][0], ay = pts[i - 1][1];
    const bx = pts[i][0], by = pts[i][1];
    let seg = Math.hypot(bx - ax, by - ay);
    while (acc + seg >= step) {
      const t = (step - acc) / seg;
      ax += (bx - ax) * t; ay += (by - ay) * t;
      out.push([ax, ay]);
      seg = Math.hypot(bx - ax, by - ay); acc = 0;
    }
    acc += seg;
  }
  const L = out[out.length - 1], E = pts[pts.length - 1];
  if (Math.hypot(L[0] - E[0], L[1] - E[1]) > step * 0.3) out.push(E.slice());
  return out;
}
function flatLine(pts) {
  const n = pts.length, x = new Float64Array(n), y = new Float64Array(n), s = new Float64Array(n);
  for (let i = 0; i < n; i++) { x[i] = pts[i][0]; y[i] = pts[i][1]; if (i) s[i] = s[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]); }
  return { x, y, s, n, len: s[n - 1] };
}
const NEAR = new Float64Array(4);              // result of nearLine: [distance, position along 0..1, segment, side: + right of the way the line runs, - left]
function nearLine(x, y, s, len, px, py, ka, kb) {   // nearest point on segments ka..kb-1 of a line
  let best = 1e18, bt = 0, bk = ka;
  for (let k = ka; k < kb; k++) {
    const ax = x[k], ay = y[k], ex = x[k + 1] - ax, ey = y[k + 1] - ay;
    let t = ((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey + 1e-18);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - ax - ex * t, dy = py - ay - ey * t, d = dx * dx + dy * dy;
    if (d < best) { best = d; bt = s[k] + (s[k + 1] - s[k]) * t; bk = k; }
  }
  NEAR[0] = Math.sqrt(best); NEAR[1] = bt / len; NEAR[2] = bk;
  NEAR[3] = (x[bk + 1] - x[bk]) * (py - y[bk]) - (y[bk + 1] - y[bk]) * (px - x[bk]);
}
function nearestIndex(line, n, pu, pv) {       // index of the point of a line nearest to (pu, pv)
  let best = 1e18, bk = 0;
  for (let k = 0; k < n; k++) { const du = line[k][0] - pu, dv = line[k][1] - pv, d = du * du + dv * dv; if (d < best) { best = d; bk = k; } }
  return bk;
}
function lineAt(pts, u) {                      // v of a left-to-right polyline at u
  for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (u - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  return pts[pts.length - 1][1];
}
function bbox(pts, pad) {
  let u0 = 1, u1 = 0, v0 = 1, v1 = 0;
  for (const p of pts) { if (p[0] < u0) u0 = p[0]; if (p[0] > u1) u1 = p[0]; if (p[1] < v0) v0 = p[1]; if (p[1] > v1) v1 = p[1]; }
  return [clamp(Math.floor((u0 - pad) * N), 1, N - 2), clamp(Math.ceil((u1 + pad) * N), 1, N - 2), clamp(Math.floor((v0 - pad) * N), 1, N - 2), clamp(Math.ceil((v1 + pad) * N), 1, N - 2)];
}
function polyFlat(pts) {                       // [[u, v], ...] as one flat array for polySD
  const P = new Float64Array(pts.length * 2);
  for (let i = 0; i < pts.length; i++) { P[i * 2] = pts[i][0]; P[i * 2 + 1] = pts[i][1]; }
  return P;
}
const OFF = [1, N + 1, N, N - 1, -1, -N - 1, -N, -N + 1], DIST = [1, 1.4142, 1, 1.4142, 1, 1.4142, 1, 1.4142];   // the 8 neighbours of a cell
const cellOf = (u, v) => clamp(Math.floor(v * N), 0, N - 1) * N + clamp(Math.floor(u * N), 0, N - 1);

// ================================================================= the build
// Speed notes (they cost a 4x slowdown to learn). Every long loop below lives in its OWN small function
// and is ONE flat loop; anything with a short loop inside (8 neighbours, the pieces of a line) is a
// little function too: a loop inside a long-running loop keeps dropping out of V8's fast code each time
// the inner one ends. And whole-map loops visit the rows in a shuffled order (cellAt): V8 tunes a loop
// to what its first steps see, and forty rows of open sea made it tune for sea, then throw the tuned
// code away at the first land, the first mountain, the first wheat field...
const NN = N * N, S = SEED;
const cellAt = q => ((((q / N) | 0) * 211 + 150) % N) * N + q % N;   // q-th cell in shuffled-row order
const height = new Float32Array(NN), waterDepth = new Float32Array(NN), coast = new Float32Array(NN);
const region = new Uint8Array(NN), river = new Float32Array(NN), flowTo = new Int32Array(NN).fill(-1);
const lake = new Uint8Array(NN), forest = new Float32Array(NN), forestType = new Uint8Array(NN);
const wheat = new Float32Array(NN), wheatAngle = new Float32Array(NN), wheatField = new Uint16Array(NN);
const snow = new Float32Array(NN), mountain = new Float32Array(NN), pitFill = new Float32Array(NN);
// working fields
const WX = new Float32Array(NN), WY = new Float32Array(NN);      // slow warp (coast, region edges)
const MX = new Float32Array(NN), MY = new Float32Array(NN);      // finer warp (crests, lake shores)
const base = new Float32Array(NN), belt = new Float32Array(NN);
const foot = new Float32Array(NN), alp = new Float32Array(NN);   // nearness to the northern arcs / the alpine ridges
const mWheat = new Float32Array(NN), mMassif = new Float32Array(NN), mSwamp = new Float32Array(NN), mBattle = new Float32Array(NN);
const RN = new Float32Array(NN).fill(-1);                        // cached ridged noise
const ramp = new Float32Array(NN), vale = new Float32Array(NN);  // the ceiling of the lowland; the lowland itself (ceiling cut by the river valleys)
const calm = new Float32Array(NN), KS = new Float32Array(NN);    // 1 in a carved river channel; steepness of valley sides
const DM = new Float32Array(NN).fill(1e6);                       // distance to the nearest mountain crest, in cells
const RD = new Float32Array(NN).fill(1e6);                       // distance to the nearest planned river, in cells
const LSH = new Float32Array(NN);                                // on the ground round a lake: that lake's level (else 0)
const LAKES = [], RIVERS = [], RANGES = [], PEAKS = [], ROADS = [], STATS = {}, MEAS = [], RLINES = [];
const PLACE = {};                                                // every place of the data block, by key
for (const p of DATA.castles.concat(DATA.pois)) PLACE[p.key] = p;
const ISLES = DATA.artifactIsles.map(I => [PLACE.artifact_isles.u + I[0], PLACE.artifact_isles.v + I[1], I[2], I[3], I[4]]);
const BATTLE_POLY = DATA.battlefield.poly.map(p => [PLACE.silent_battlefield.u + p[0], PLACE.silent_battlefield.v + p[1]]);

// Smooth noise is sampled on every second cell and read back with bilinear filtering (four times cheaper).
const HN = N / 2 + 1;
function fbmField(freq, ox, oy, seed, oct, scale) {
  const F = new Float32Array(HN * HN);
  for (let q = 0; q < HN * HN; q++) F[q] = fbm((q % HN) * 2 / N * freq + ox, ((q / HN) | 0) * 2 / N * freq + oy, seed, oct) * scale;
  return F;
}
function half(F, i, j) {
  const x = (i + 0.5) / 2, y = (j + 0.5) / 2, a = x | 0, b = y | 0, tx = x - a, ty = y - b, g = b * HN + a;
  return lerp(lerp(F[g], F[g + 1], tx), lerp(F[g + HN], F[g + HN + 1], tx), ty);
}
function polySD(P, n, x, y) {                  // signed distance to a polygon, + inside
  let inside = false, best = 1e18;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = P[j * 2], ay = P[j * 2 + 1], bx = P[i * 2], by = P[i * 2 + 1];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    const ex = bx - ax, ey = by - ay;
    let t = ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - ex * t, dy = y - ay - ey * t, d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return inside ? Math.sqrt(best) : -Math.sqrt(best);
}
// The cells of a box, as one flat run: BOX = [i0, j0, width, count].
const BOX = new Int32Array(4);
function setBox(i0, i1, j0, j1) {
  i0 = clamp(i0, 1, N - 2); i1 = clamp(i1, 1, N - 2); j0 = clamp(j0, 1, N - 2); j1 = clamp(j1, 1, N - 2);
  BOX[0] = i0; BOX[1] = j0; BOX[2] = i1 - i0 + 1; BOX[3] = (i1 - i0 + 1) * (j1 - j0 + 1);
}
function boxAround(u, v, r) { setBox(Math.floor((u - r) * N), Math.ceil((u + r) * N), Math.floor((v - r) * N), Math.ceil((v + r) * N)); }
// Two sweeps turn a field of seeds (0) into "distance to the nearest seed", in cells.
function chamferDown(A) {
  for (let c = N + 1; c < NN - N - 1; c++) {
    const a = Math.min(A[c - 1], A[c - N]) + 1, b = Math.min(A[c - N - 1], A[c - N + 1]) + 1.4142, m = a < b ? a : b;
    if (m < A[c]) A[c] = m;
  }
}
function chamferUp(A) {
  for (let c = NN - N - 2; c > N; c--) {
    const a = Math.min(A[c + 1], A[c + N]) + 1, b = Math.min(A[c + N + 1], A[c + N - 1]) + 1.4142, m = a < b ? a : b;
    if (m < A[c]) A[c] = m;
  }
}

// 1. The coast: signed distance to the hand-placed outline, warped twice (a slow push that moves whole
//    stretches, a finer one that makes bays and capes), then roughened: ragged in some stretches, smooth
//    in others. Plus islets.
const CG = 151, CG0 = -0.1, CGS = 1.2 / (CG - 1), CQ = N / 4 + 1;
function coastGrid(grid) {
  const n = DATA.coast.length, P = polyFlat(DATA.coast);
  for (let g = 0; g < CG * CG; g++) grid[g] = polySD(P, n, CG0 + (g % CG) * CGS, CG0 + ((g / CG) | 0) * CGS);
}
function slowWarp(qx, qy, bx, by) {            // on a coarse grid: it only has broad features
  const big = DATA.coastWarp;
  for (let g = 0; g < CQ * CQ; g++) {
    const u = (g % CQ) * 4 / N, v = ((g / CQ) | 0) * 4 / N;
    qx[g] = (fbm(u * 5 + 11.3, v * 5 + 7.1, S + 1, 3) - 0.5) * 0.064;
    qy[g] = (fbm(u * 5 + 3.7, v * 5 + 19.4, S + 2, 3) - 0.5) * 0.064;
    bx[g] = (fbm(u * 2.1 + 4.9, v * 2.1 + 1.3, S + 7, 2) - 0.5) * big;
    by[g] = (fbm(u * 2.1 + 8.2, v * 2.1 + 6.4, S + 8, 2) - 0.5) * big;
  }
}
function coastCells(grid, qx, qy, bx, by, hx, hy) {
  for (let q = 0; q < NN; q++) {
    const c = cellAt(q), i = c % N, j = (c / N) | 0, u = (i + 0.5) / N, v = (j + 0.5) / N;
    const qu = (i + 0.5) / 4, a0 = qu | 0, ta = qu - a0, qv = (j + 0.5) / 4, b0 = qv | 0, tb = qv - b0, g4 = b0 * CQ + a0;
    const wx = lerp(lerp(qx[g4], qx[g4 + 1], ta), lerp(qx[g4 + CQ], qx[g4 + CQ + 1], ta), tb);
    const wy = lerp(lerp(qy[g4], qy[g4 + 1], ta), lerp(qy[g4 + CQ], qy[g4 + CQ + 1], ta), tb);
    const sx = lerp(lerp(bx[g4], bx[g4 + 1], ta), lerp(bx[g4 + CQ], bx[g4 + CQ + 1], ta), tb);
    const sy = lerp(lerp(by[g4], by[g4 + 1], ta), lerp(by[g4 + CQ], by[g4 + CQ + 1], ta), tb);
    WX[c] = wx; WY[c] = wy;
    MX[c] = half(hx, i, j) - 0.018 + wx * 0.3;
    MY[c] = half(hy, i, j) - 0.018 + wy * 0.3;
    const fx = clamp((u + wx + sx - CG0) / CGS, 0, CG - 1.001), fy = clamp((v + wy + sy - CG0) / CGS, 0, CG - 1.001);
    const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, g = y0 * CG + x0;
    let sd = lerp(lerp(grid[g], grid[g + 1], tx), lerp(grid[g + CG], grid[g + CG + 1], tx), ty);
    const near = 1 - smooth(0.03, 0.06, Math.abs(sd));
    if (near > 0) {
      const rag = 0.3 + 1.5 * smooth(0.36, 0.64, vnoise(u * 3.7 + 1.1, v * 3.7 + 5.2, S + 9));   // 0.3 = a smooth shore .. 1.8 = a ragged one
      sd += (fbm(u * 14 + 2.2, v * 14 + 8.8, S + 3, 3) - 0.5) * 0.050 * rag * near;
      sd += (0.36 - ridged(u * 44 + 3.1, v * 44 + 7.7, S + 13)) * 0.011 * near;   // polish 3: sharp little notches and points: a rocky shore, not lobes
    }
    coast[c] = sd;
  }
}
function addIslet(iu, iv, ir, stretch, axis) {
  boxAround(iu, iv, ir * 2.2 + 0.085);
  const i0 = BOX[0], j0 = BOX[1], bw = BOX[2], tot = BOX[3];
  const sa = Math.sqrt(stretch || 1), an = (axis || 0) * Math.PI / 180, ca = Math.cos(an), sn = Math.sin(an), f = 0.42 / ir;
  for (let q = 0; q < tot; q++) {
    const i = i0 + q % bw, j = j0 + ((q / bw) | 0), c = j * N + i, u = (i + 0.5) / N, v = (j + 0.5) / N;
    const du = u - iu, dv = v - iv, x = (du * ca + dv * sn) / sa, y = (dv * ca - du * sn) * sa;
    // polish 2: ragged, not oval: the main body plus two lobes set off to the sides, all with a rough edge
    const rough = ir * (0.55 + 0.9 * fbm(u * f * 1.7, v * f * 1.7, S + 4, 3));
    const a1 = hash2(iu * 1000 | 0, iv * 1000 | 0, S + 31) * 6.283, a2 = a1 + 2.2 + hash2(iu * 1000 | 0, iv * 1000 | 0, S + 32) * 1.6;
    const l1 = Math.hypot(x - Math.cos(a1) * ir * 0.75, y - Math.sin(a1) * ir * 0.75), l2 = Math.hypot(x - Math.cos(a2) * ir * 0.6, y - Math.sin(a2) * ir * 0.6);
    const d = Math.max(rough - Math.sqrt(x * x + y * y), rough * 0.62 - l1, rough * 0.5 - l2);
    if (d > coast[c]) coast[c] = d;
  }
}
// polish 3: an inlet (sign -1) or a cape (sign +1) along a polyline; its half width narrows from w at the first point to 0 at
// the last, with a little rock noise on the sides so it is not a ruled wedge
function cutLine(L, sign) {
  const P = L.at ? L.pts.map(p => [PLACE[L.at].u + p[0], PLACE[L.at].v + p[1]]) : L.pts, n = P.length;
  const lens = [0];
  for (let k = 1; k < n; k++) lens.push(lens[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  const tot = lens[n - 1], b = bbox(P, L.w + 0.01);
  setBox(b[0], b[1], b[2], b[3]);
  const i0 = BOX[0], j0 = BOX[1], bw = BOX[2], cnt = BOX[3];
  for (let q = 0; q < cnt; q++) {
    const i = i0 + q % bw, j = j0 + ((q / bw) | 0), c = j * N + i, u = (i + 0.5) / N, v = (j + 0.5) / N;
    let best = 9, at = 0;
    for (let k = 0; k < n - 1; k++) {
      const ax = P[k][0], ay = P[k][1], ex = P[k + 1][0] - ax, ey = P[k + 1][1] - ay, el = ex * ex + ey * ey;
      const t = clamp(((u - ax) * ex + (v - ay) * ey) / el, 0, 1), d = Math.hypot(u - ax - ex * t, v - ay - ey * t);
      if (d < best) { best = d; at = (lens[k] + t * Math.sqrt(el)) / tot; }
    }
    const wt = L.w * Math.pow(1 - at, sign < 0 ? 0.8 : 0.45) * (0.75 + 0.5 * vnoise(u * 260, v * 260, S + 91));   // a cape stays broad and ends blunt
    if (sign < 0) { const e = best - wt; if (e < coast[c]) coast[c] = e; }
    else { const e = wt - best; if (e > coast[c]) coast[c] = e; }
  }
}
function openSea() {                           // water the open sea cannot reach becomes low land (no stray inland seas)
  const seen = new Uint8Array(NN), q = new Int32Array(NN);
  let qh = 0, qt = 0;
  q[qt++] = 0; seen[0] = 1;
  while (qh < qt) {
    const c = q[qh++], i = c % N, j = (c / N) | 0;
    if (i > 0 && !seen[c - 1] && coast[c - 1] <= 0) { seen[c - 1] = 1; q[qt++] = c - 1; }
    if (i < N - 1 && !seen[c + 1] && coast[c + 1] <= 0) { seen[c + 1] = 1; q[qt++] = c + 1; }
    if (j > 0 && !seen[c - N] && coast[c - N] <= 0) { seen[c - N] = 1; q[qt++] = c - N; }
    if (j < N - 1 && !seen[c + N] && coast[c + N] <= 0) { seen[c + N] = 1; q[qt++] = c + N; }
  }
  for (let c = 0; c < NN; c++) if (coast[c] <= 0 && !seen[c]) coast[c] = 0.001;
}
function buildCoast() {
  const grid = new Float32Array(CG * CG), qx = new Float32Array(CQ * CQ), qy = new Float32Array(CQ * CQ), bx = new Float32Array(CQ * CQ), by = new Float32Array(CQ * CQ);
  coastGrid(grid);
  slowWarp(qx, qy, bx, by);
  coastCells(grid, qx, qy, bx, by, fbmField(22, 5.5, 1.5, S + 5, 1, 0.036), fbmField(22, 9.5, 4.5, S + 6, 1, 0.036));
  for (const L of DATA.capes) cutLine(L, 1);
  for (const I of DATA.islets.concat(ISLES)) addIslet(I[0], I[1], I[2], I[3], I[4]);
  for (const L of DATA.inlets) cutLine(L, -1);
  for (let k = 0; k < 2 * N; k++) {                                       // the map edge is always sea
    const e = k < N ? 0 : 1, t = k % N;
    coast[e * N + t] = Math.min(coast[e * N + t], -0.004); coast[(N - 1 - e) * N + t] = Math.min(coast[(N - 1 - e) * N + t], -0.004);
    coast[t * N + e] = Math.min(coast[t * N + e], -0.004); coast[t * N + N - 1 - e] = Math.min(coast[t * N + N - 1 - e], -0.004);
  }
  openSea();
}

// 2. Measure every crest line once (distance, position along it, which side). Also gives the "near the
//    mountains" fields that lift the foothills and the alpine valleys, and the seeds of DM.
const KIND = { spur: 0, alpine: 1, belt: 2, hill: 3 };
function measureCoarse(lx, ly, ls, len, ns, i0, j0, cw, cn, CK, CD) {    // every fourth cell: which piece of the line is nearest
  for (let g0 = 0; g0 < cn; g0++) {
    const g = (g0 + (cn >> 1)) % cn, i = Math.min(N - 1, i0 + 4 * (g % cw)), j = Math.min(N - 1, j0 + 4 * ((g / cw) | 0)), c = j * N + i;
    nearLine(lx, ly, ls, len, (i + 0.5) / N + MX[c], (j + 0.5) / N + MY[c], 0, ns);
    CK[g] = NEAR[2]; CD[g] = NEAR[0];
  }
}
function measureFine(lx, ly, ls, len, ns, i0, j0, bw, tot, cw, CK, CD, D, T, SG, reach, hillReach, seedW, kind) {
  for (let q0 = 0; q0 < tot; q0++) {                                      // then the exact distance, only to the pieces around it
    const q = (q0 + (tot >> 1)) % tot, x = q % bw, y = (q / bw) | 0, c = (j0 + y) * N + i0 + x, g = ((y + 2) >> 2) * cw + ((x + 2) >> 2);
    if (coast[c] <= 0 || CD[g] > reach + 0.012) { D[q] = 9; continue; }
    const k0 = CK[g];
    nearLine(lx, ly, ls, len, (i0 + x + 0.5) / N + MX[c], (j0 + y + 0.5) / N + MY[c], k0 > 2 ? k0 - 2 : 0, k0 + 3 < ns ? k0 + 3 : ns);
    const d = D[q] = NEAR[0];
    T[q] = NEAR[1]; SG[q] = NEAR[3] >= 0 ? 1 : -1;
    if (kind === 1) { const f = 1 - d / (hillReach + 0.05); if (f > alp[c]) alp[c] = f; }
    else if (kind === 2) { const f = 1 - d / hillReach; if (f > foot[c]) foot[c] = f; }
    if (kind !== 3 && d < seedW) DM[c] = 0;
  }
}
function measureRange(R) {
  const dense = spline(R.pts, 8), L = flatLine(resample(dense, 5 / N)), reach = R.w * 4.2, ns = L.n - 1;
  const bb = bbox(R.pts, reach + 0.02), i0 = bb[0], j0 = bb[2], bw = bb[1] - i0 + 1, bh = bb[3] - j0 + 1;
  const cw = (bw >> 2) + 2, cn = cw * ((bh >> 2) + 2), CK = new Int16Array(cn), CD = new Float32Array(cn);
  const D = new Float32Array(bw * bh), T = new Float32Array(bw * bh), SG = new Int8Array(bw * bh);
  measureCoarse(L.x, L.y, L.s, L.len, ns, i0, j0, cw, cn, CK, CD);
  measureFine(L.x, L.y, L.s, L.len, ns, i0, j0, bw, bw * bh, cw, CK, CD, D, T, SG, reach, R.w * 1.9, R.w * 0.6, KIND[R.kind]);
  MEAS.push({ i0, j0, bw, bh, D, T, SG, dense, len: L.len });
}

// 3. Rivers, step one: the line of every river and the height of its bed. The guide is bent into swings
//    that grow downstream (two sine waves with a wandering phase, plus a ripple of about a cell); the bed
//    falls from the spring through any heights given on the guide to the mouth.
function traceRiver(Rv, idx) {
  let guide = Rv.pts, hEnd = SEA + 0.0015;
  const trunk = Rv.into ? RLINES.find(r => r.key === Rv.into) : null;
  if (trunk) {                                                            // a tributary ends ON the real line of its river
    const e = guide[guide.length - 1], bk = nearestIndex(trunk.line, trunk.end, e[0], e[1]);
    guide = guide.slice(0, -1).concat([[trunk.line[bk][0], trunk.line[bk][1]]]);
    hEnd = trunk.grade[bk];
  }
  const rough = resample(spline(guide, 10), 2 / N), n0 = rough.length, bent = [];
  const A = Rv.meander, L1 = Rv.wave || 0.11, L2 = L1 * 0.37, quiet = Rv.calm ? PLACE[Rv.calm] : null;
  const p1 = 6.2832 * hash2(idx, 1, S + 50), p2 = 6.2832 * hash2(idx, 2, S + 50), p3 = 6.2832 * hash2(idx, 3, S + 50);
  for (let k = 0; k < n0; k++) {
    const a = rough[Math.max(0, k - 1)], b = rough[Math.min(n0 - 1, k + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    const x = k / (n0 - 1), s = k * 2 / N, c = cellOf(rough[k][0], rough[k][1]);
    let amp = A * (0.3 + 1.7 * x) * smooth(0, 0.06, x) * smooth(0, 0.05, 1 - x) * (1 - 0.75 * Math.max(foot[c], alp[c]));   // quiet in the mountains
    if (quiet) amp *= smooth(0.018, 0.06, Math.hypot(rough[k][0] - quiet.u, rough[k][1] - quiet.v));
    const off = amp * (0.8 * Math.sin(6.2832 * s / L1 + p1 + 4.4 * (vnoise(s * 14, idx * 9.7, S + 51) - 0.5))
      + 0.45 * Math.sin(6.2832 * s / L2 + p2 + 4.0 * (vnoise(s * 30, idx * 4.3, S + 52) - 0.5)))
      + 0.0026 * smooth(0, 0.04, x) * smooth(0, 0.04, 1 - x) * Math.sin(6.2832 * s / 0.021 + p3 + 5.0 * (vnoise(s * 60, idx * 2.9, S + 53) - 0.5));   // a ripple of a cell or so: no long ruled runs on the grid
    bent.push([rough[k][0] - ty / tl * off, rough[k][1] + tx / tl * off]);
  }
  const line = resample(bent, 0.5 / N), n = line.length;
  let end = n;
  if (!trunk) for (let k = 5; k < n; k++) if (coast[cellOf(line[k][0], line[k][1])] <= 0) { end = k + 1; break; }   // the mouth
  // the bed: spring, any guide point with a height, mouth
  const knots = [[0, Rv.src]];
  for (let i = 1; i < guide.length - 1; i++) if (guide[i].length > 2) { const k = nearestIndex(line, end, guide[i][0], guide[i][1]); if (k > knots[knots.length - 1][0] && k < end - 1) knots.push([k, Math.min(guide[i][2], knots[knots.length - 1][1])]); }
  knots.push([end - 1, hEnd]);
  const grade = new Float32Array(end), pw = Rv.grade || 1.25;
  for (let g = 0; g < knots.length - 1; g++) {
    const ka = knots[g][0], kb = knots[g + 1][0], ha = knots[g][1], hb = knots[g + 1][1];
    for (let k = ka; k <= kb; k++) grade[k] = hb + (ha - hb) * Math.pow(1 - (k - ka) / (kb - ka), g === 0 ? pw : 1);   // steep at the spring, even after
  }
  RLINES.push({ key: Rv.key, line, end, grade, hEnd, plan: null });
}
function riverRows(R, rowU, rowBed) {          // per map row: the westmost u of a river and its bed there
  rowU.fill(9); rowBed.fill(9);
  let first = N, last = -1;
  for (let k = 0; k < R.end; k++) {
    const j = clamp(Math.floor(R.line[k][1] * N), 0, N - 1);
    if (R.line[k][0] < rowU[j]) rowU[j] = R.line[k][0];
    if (R.grade[k] < rowBed[j]) rowBed[j] = R.grade[k];
    if (j < first) first = j; if (j > last) last = j;
  }
  for (let j = first + 1; j <= last; j++) if (rowU[j] > 8) { rowU[j] = rowU[j - 1]; rowBed[j] = rowBed[j - 1]; }
  for (let j = first - 1; j >= 0; j--) { rowU[j] = rowU[first]; rowBed[j] = rowBed[first]; }
  for (let j = last + 1; j < N; j++) { rowU[j] = rowU[last]; rowBed[j] = rowBed[last]; }
}

// 4. The ceiling of the lowland ("ramp"): low at the shore, higher inland, higher still on the apron of
//    the mountains, with the flat places pressed into it. Then every river sinks its bed into it and
//    "vale" spreads the bed sideways: bed + slope x distance. The lowland is the lower of the two, so the
//    land is shaped by its rivers (valleys, watersheds), not by the distance to the coast.
function lowland(rowU, rowBed) {
  const Wd = DATA.wheat, SW = PLACE.toad_swamp, L = DATA.lowland;
  const lift = DATA.massif.lift, beltLift = DATA.beltLift, slope = DATA.valleySlope / N;
  const bLevel = DATA.battlefield.level, su = SW.u, sv = SW.v, sr = SW.r * DATA.swampSize;
  const WP = polyFlat(Wd.poly), wn = Wd.poly.length, wb = bbox(Wd.poly, 0.06), BP = polyFlat(BATTLE_POLY), bn = BATTLE_POLY.length, bb = bbox(BATTLE_POLY, 0.06);
  const UPL = fbmField(2.6, 3.3, 8.8, S + 12, 2, 1), apR = L.apronReach * N;
  for (let q = 0; q < NN; q++) {
    const c = cellAt(q), sd = coast[c];
    if (sd <= 0) { vale[c] = 9; continue; }
    const i = c % N, j = (c / N) | 0, u = (i + 0.5) / N, v = (j + 0.5) / N;
    const u2 = u + WX[c] * 1.3 + MX[c] * 0.5, v2 = v + WY[c] * 1.3 + MY[c] * 0.5;
    let ww = 0, wbt = 0;
    if (i >= wb[0] && i <= wb[1] && j >= wb[2] && j <= wb[3]) {
      ww = smooth(-0.016, 0.016, polySD(WP, wn, u2, v2));
      if (ww > 0) ww *= smooth(Wd.bank[0], Wd.bank[1], rowU[j] - u);      // the plain stops short of the west bank of its river
    }
    if (i >= bb[0] && i <= bb[1] && j >= bb[2] && j <= bb[3]) wbt = smooth(-0.014, 0.014, polySD(BP, bn, u2, v2));
    const ws = 1 - smooth(sr * 0.55, sr, Math.sqrt((u2 - su) * (u2 - su) + (v2 - sv) * (v2 - sv)));
    const wm = smooth(0.05, 0.60, alp[c]), ft = smooth(0, 0.8, foot[c]);
    mWheat[c] = ww; mBattle[c] = wbt; mSwamp[c] = ws; mMassif[c] = wm; foot[c] = ft;
    const up = smooth(0.30, 0.70, half(UPL, i, j)) - 0.5, apron = 1 - smooth(0, apR, DM[c]);
    let r = SEA + 0.008 + L.shore * smooth(0, 0.05, sd) + (L.inland + L.upland * up + L.apron * apron) * smooth(0.005, 0.07, sd)
      + lift * wm * smooth(0, 0.075, sd) + beltLift * ft * smooth(0, 0.05, sd);
    if (ww > 0) r = lerp(r, rowBed[j] + Wd.above + 0.004 * clamp((rowU[j] - u) / 0.17, 0, 1), ww);
    if (wbt > 0) r = lerp(r, bLevel, wbt);
    if (ws > 0) r = lerp(r, SEA + 0.006, ws);
    ramp[c] = vale[c] = r;
    KS[c] = slope * (1 + 4 * (1 - smooth(0.02 * N, 0.11 * N, DM[c])));   // valley sides: gentle in the lowland, steep near any mountain crest
  }
}
function seedRiver(Rv, idx) {                  // rivers, step two: the bed as far as the lowland lets it lie, sunk into the ceiling
  const R = RLINES[idx], line = R.line, end = R.end, grade = R.grade, plan = R.plan = new Float32Array(end), depth = Rv.minor ? DATA.valleyDepth * 0.6 : DATA.valleyDepth;
  const f0 = DATA.valleyFloor[0], f1 = DATA.valleyFloor[1];
  let prev = 9;
  for (let k = 0; k < end; k++) {
    const c = cellOf(line[k][0], line[k][1]), least = R.hEnd + 0.00002 * (end - 1 - k);                // the gentlest bed that still reaches the mouth
    prev = plan[k] = Math.max(least, Math.min(prev - 0.000012, grade[k], ramp[c] - depth));
    if (coast[c] > 0) { RD[c] = 0; if (k % 2 === 0) floorDisc(c % N, (c / N) | 0, f0 + (f1 - f0) * mMassif[c], plan[k]); }
  }
}
function floorDisc(ci, cj, r, b) {             // a valley has a level floor beside its river before the sides rise
  const r2 = r * r;
  for (let dj = -Math.ceil(r); dj <= r; dj++) for (let di = -Math.ceil(r); di <= r; di++) {
    if (di * di + dj * dj > r2) continue;
    const c = clamp(cj + dj, 1, N - 2) * N + clamp(ci + di, 1, N - 2);
    if (coast[c] > 0 && b < vale[c]) vale[c] = b;
  }
}
function valeDown() {                          // two sweeps spread "height of the bed + slope x distance"
  for (let c = N + 1; c < NN - N - 1; c++) {
    const k1 = KS[c], k2 = k1 * 1.4142;
    if (k1 > 0) vale[c] = Math.min(Math.min(vale[c], Math.min(vale[c - 1], vale[c - N]) + k1), Math.min(vale[c - N - 1], vale[c - N + 1]) + k2);
  }
}
function valeUp() {
  for (let c = NN - N - 2; c > N; c--) {
    const k1 = KS[c], k2 = k1 * 1.4142;
    if (k1 > 0) vale[c] = Math.min(Math.min(vale[c], Math.min(vale[c + 1], vale[c + N]) + k1), Math.min(vale[c + N + 1], vale[c + N - 1]) + k2);
  }
}

function ridgeAt(c) {
  let r = RN[c];
  if (r < 0) r = RN[c] = ridged(((c % N) + 0.5) / N * 24 + 3.3, (((c / N) | 0) + 0.5) / N * 24 + 6.6, S + 20);
  return r;
}

// 5. Sea floor, lowlands, rolling hills. Hill country and plains alternate (a slow mask); valley floors
//    stay smooth; a small ridged octave gives the hills their little spurs.
function buildBase() {
  const hills = fbmField(8.5, 1.7, 4.2, S + 10, 3, 1), country = fbmField(3.1, 7.7, 2.3, S + 11, 2, 1), eBox = DATA.eastKingdom.box, HD = DATA.hills, apR = DATA.lowland.apronReach * N;
  for (let q = 0; q < NN; q++) {
    const c = cellAt(q), sd = coast[c];
    if (sd <= 0) { const d = clamp(0.010 + 1.5 * -sd, 0.006, 0.12); height[c] = SEA - d; waterDepth[c] = d; continue; }
    const i = c % N, j = (c / N) | 0, n = half(hills, i, j), flat = Math.max(mWheat[c], mBattle[c], mSwamp[c]);
    const we = sbox((i + 0.5) / N + WX[c] * 1.3, (j + 0.5) / N + WY[c] * 1.3, eBox, 0.05);
    const hc = smooth(0.36, 0.60, half(country, i, j)), floor = smooth(1.5, 9, RD[c]), shore = smooth(0, 0.035, sd);
    const amp = (HD.base + HD.amp * hc) * (1 - 0.25 * we) * (1 + 0.5 * (1 - smooth(0, apR, DM[c]))) * shore * (0.3 + 0.7 * floor);   // hillier toward the mountains
    const small = HD.small * (ridgeAt(c) - 0.42) * (0.35 + 0.65 * hc) * floor * shore;
    const hn = n - 0.40, h = vale[c] + lerp(amp * (hn < 0 ? hn * 0.35 : hn) + small, 0.008 * (n - 0.5), flat);
    height[c] = base[c] = Math.max(h, SEA + 0.003);
  }
}

// 6. Mountains: each crest line lifts the land near it. Along the crest runs a train of summits, each
//    with its own height, and between them saddles, each with its own depth (one deep col per belt arc).
//    The ridge is wider in some stretches than in others and steeper on one side. Ridged noise makes
//    spurs and gullies on the flanks.
const PT = 257;
function crestTables(R, idx) {                 // along the line: how the ends fade, the summits and saddles (0..1), the width factor
  const tap = new Float32Array(PT), sum = new Float32Array(PT), wid = new Float32Array(PT), n = R.peaks;
  let mean = 0;
  const pos = i => i + 0.5 + 0.5 * (hash2(i + 64, idx, S + 32) - 0.5);                 // where summit i stands, in summit spacings
  const tall = Math.min(n - 1, Math.floor((0.25 + 0.5 * hash2(idx, 12, S + 31)) * n)), deep = Math.max(0, Math.min(n - 2, Math.floor(hash2(idx, 13, S + 31) * (n - 1))));
  const hgt = i => (i === tall ? 1 : 0.62 + 0.36 * hash2(i + 64, idx, S + 34));
  const sagK = i => (i === deep && R.kind === 'belt' ? 1.7 : 0.5 + 0.9 * hash2(i + 64, idx, S + 35));
  const colRel = R.col ? (R.col - 0.28) / (R.h - 0.28) : 0;
  for (let k = 0; k < PT; k++) {
    const t = k / (PT - 1), s = t * n;
    let i = Math.floor(s - 0.5) - 1;
    while (pos(i + 1) <= s) i++;
    const a = pos(i), x = (s - a) / (pos(i + 1) - a), bump = 0.5 - 0.5 * Math.cos(6.2832 * x);
    let cr = lerp(hgt(i), hgt(i + 1), x * x * (3 - 2 * x)) * (1 - Math.min(0.9, R.sag * sagK(i)) * bump);
    if (cr < colRel) cr = colRel;
    tap[k] = smooth(0, R.t0, t) * smooth(0, R.t1, 1 - t); sum[k] = cr; mean += cr / PT;
    wid[k] = 0.65 + 0.7 * vnoise(t * 3 + idx * 5.3, idx * 1.7, S + 33);
  }
  return { tap, sum, wid, mean };
}
function steepSide(R, idx) {                   // +1 = the right of the way the points run is the steep side, -1 = the left
  const s = R.steep, a = R.pts[0], b = R.pts[R.pts.length - 1], cx = b[0] - a[0], cy = b[1] - a[1];
  if (s === 'R') return 1;
  if (s === 'L') return -1;
  if (s === 'N') return -cx >= 0 ? 1 : -1;
  if (s === 'S') return cx >= 0 ? 1 : -1;
  if (s === 'E') return -cy >= 0 ? 1 : -1;
  if (s === 'W') return cy >= 0 ? 1 : -1;
  return hash2(idx, 14, S + 31) < 0.5 ? 1 : -1;
}
// A summit is a peak, not a rib: its height fades into the average of the crest over "fade" (about half
// the distance to the next summit) down the flank, so the flanks are not ruled at right angles to the crest.
function raiseRange(D, T, SG, i0, j0, bw, tot, w, tap, sum, wid, mean, fade, lean, top, cfade, kind) {
  for (let q0 = 0; q0 < tot; q0++) {
    const q = (q0 + (tot >> 1)) % tot, d = D[q];                          // start in the middle of the box, on the crest
    if (d > w * 4.2) continue;
    const tb = T[q] * (PT - 1), kb = tb | 0, k2 = kb < PT - 1 ? kb + 1 : kb, kf = tb - kb;
    const tp = tap[kb] + (tap[k2] - tap[kb]) * kf;
    if (tp <= 0) continue;
    const cs = sum[kb] + (sum[k2] - sum[kb]) * kf;
    const c = (j0 + ((q / bw) | 0)) * N + i0 + q % bw, rn = ridgeAt(c);
    const wv = (wid[kb] + (wid[k2] - wid[kb]) * kf) * (SG[q] * lean > 0 ? 0.72 : 1.25), dc = d > 0.0012 ? d - 0.0012 : 0;   // flat for half a cell, so summits reach their height
    let p, e;
    if (kind === 3) {                                                     // a low hill: a smooth swell, no spurs
      e = 1 - dc / (w * 1.8 * wv);
      if (e <= 0) continue;
      p = e * e * (3 - 2 * e) * (0.55 + 0.45 * smooth(0.25, 0.75, vnoise((c % N) * 0.058, ((c / N) | 0) * 0.058, S + 36))) / mean;   // lumps, not ribs
    } else {
      const wl = w * (0.55 + 0.45 * tp) * (0.62 + 0.95 * rn) * wv;
      const e2 = 1 - dc / (wl * 1.9);                                     // spurs reach out where the ridged noise is high
      if (e2 <= 0) continue;
      e = Math.max(0, 1 - dc / wl);
      p = Math.max(e * Math.sqrt(e) * lerp(0.55 + 0.45 * rn, 1, e * e), 0.20 * e2 * e2 * (0.35 + rn));
    }
    const rel = tp * (kind === 3 ? mean : lerp(cs, mean, smooth(0, fade, dc))) * p;
    const h = base[c] + (top - base[c]) * rel * smooth(0, cfade, coast[c] + 0.006);
    if (h > height[c]) height[c] = h;
    if (kind === 3) continue;                                             // low hills are not mountains
    if (rel > mountain[c]) mountain[c] = rel;
    if (kind === 2 && rel > belt[c]) belt[c] = rel;
  }
}
function addRange(R, idx, hills) {             // hills = true: only the low hills; false: only the mountains
  const M = MEAS[idx], C = crestTables(R, idx), kind = KIND[R.kind];
  if ((kind === 3) !== hills) return;
  // the height fades toward the sea: over a short strand for mountains (sea cliffs), a longer one for hills
  raiseRange(M.D, M.T, M.SG, M.i0, M.j0, M.bw, M.bw * M.bh, R.w, C.tap, C.sum, C.wid, C.mean, 0.6 * M.len / R.peaks, steepSide(R, idx), R.h, kind === 2 ? 0.010 : kind === 3 ? 0.030 : 0.012, kind);
}
function addCone(C) {
  const cu = PLACE[C.at].u + C.du, cv = PLACE[C.at].v + C.dv, cr = C.r, crater = C.crater, top = C.h;
  const cc = cellOf(cu, cv), mx0 = MX[cc] * 0.5, my0 = MY[cc] * 0.5;      // the warp is taken off at the centre, so the summit stands on (cu, cv)
  const breach = 6.2832 * hash2(cc, 5, S + 91);
  boxAround(cu, cv, cr * 1.6 + crater + 0.01);
  const i0 = BOX[0], j0 = BOX[1], bw = BOX[2], tot = BOX[3];
  for (let q = 0; q < tot; q++) {
    const i = i0 + q % bw, j = j0 + ((q / bw) | 0), c = j * N + i;
    if (coast[c] <= 0) continue;
    const du = (i + 0.5) / N + MX[c] * 0.5 - mx0 - cu, dv = (j + 0.5) / N + MY[c] * 0.5 - my0 - cv;
    const rn = ridgeAt(c), d = Math.sqrt(du * du + dv * dv), e = 1 - Math.max(0, d - crater - 0.0012) / (cr * (0.70 + 0.75 * rn));
    if (e <= 0) continue;
    let p = e * Math.sqrt(e) * lerp(0.55 + 0.45 * rn, 1, e * e);
    if (crater) {
      if (d < crater) p = 0.80 + 0.20 * (d / crater) * (d / crater);     // the crater floor; the rim reaches the full height
      const off = Math.atan2(dv, du) - breach, turn = Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
      if (turn < 0.45 && d < crater * 2.2) p = Math.min(p, 0.80 - 0.06 * d / crater);   // one side is breached, so the crater drains and stays a bowl
    }
    const h = base[c] + (top - base[c]) * p;
    if (h > height[c]) height[c] = h;
    if (p > mountain[c]) mountain[c] = p;
  }
  PEAKS.push({ key: C.key, name: C.name, u: +cu.toFixed(4), v: +cv.toFixed(4), h: C.h, r: C.r });
}
// A hill of its own shape (one under every castle, and the knolls): an ellipse with its own axis, one
// steeper face, broken by small ridges, flat on top. A castle hill ("own") is raised until it stands above
// everything around it; a knoll just adds its height.
function ringMax(u0, v0, r) {
  let m = 0;
  for (let a = 0; a < 20; a++) { const c = cellOf(u0 + Math.cos(a * 0.31416) * r, v0 + Math.sin(a * 0.31416) * r); if (coast[c] > 0 && height[c] > m) m = height[c]; }
  return m;
}
function addHill(u0, v0, hh, r, seed, own) {
  const asp = 1 + 1.4 * hash2(seed, 2, S + 90), ang = Math.PI * hash2(seed, 3, S + 90), steep = 6.2832 * hash2(seed, 4, S + 90);
  const ra = r * Math.sqrt(asp), rb = r / Math.sqrt(asp), ca = Math.cos(ang), sa = Math.sin(ang), g0 = height[cellOf(u0, v0)];
  let top = g0 + hh;
  if (own) top = Math.max(top, Math.min(Math.max(ringMax(u0, v0, ra * 1.3), ringMax(u0, v0, 0.022)), g0 + hh + 0.09) + 0.4 * hh);
  boxAround(u0, v0, ra * 1.5);
  const i0 = BOX[0], j0 = BOX[1], bw = BOX[2], tot = BOX[3];
  for (let q = 0; q < tot; q++) {
    const i = i0 + q % bw, j = j0 + ((q / bw) | 0), c = j * N + i;
    if (coast[c] <= 0 || height[c] >= top) continue;
    const du = (i + 0.5) / N - u0, dv = (j + 0.5) / N - v0, x = (du * ca + dv * sa) / ra, y = (dv * ca - du * sa) / rb;
    let qd = Math.sqrt(x * x + y * y) * (1 + 0.32 * Math.cos(Math.atan2(dv, du) - steep));
    qd += 0.22 * (ridgeAt(c) - 0.45) * smooth(0.15, 0.6, qd);
    if (qd >= 1.25) continue;
    height[c] += (top - height[c]) * (1 - smooth(0.12, 1.25, qd)) * smooth(0, 0.012, coast[c]);
  }
}

// Stamp a corridor along a dense line: the land near the line is lowered toward bed[k].
const SD = new Float32Array(NN).fill(Infinity), SB = new Float32Array(NN), TOUCH = new Int32Array(NN + 1);
function stampOne(cu, cv, R, b) {              // one point of the line; TOUCH[NN] counts the cells reached so far
  boxAround((cu + 0.5) / N, (cv + 0.5) / N, R / N);
  const i0 = BOX[0], j0 = BOX[1], bw = BOX[2], tot = BOX[3];
  let tn = TOUCH[NN];
  for (let q = 0; q < tot; q++) {
    const i = i0 + q % bw, j = j0 + ((q / bw) | 0), c = j * N + i, d2 = (i - cu) * (i - cu) + (j - cv) * (j - cv);
    if (d2 < SD[c]) { if (SD[c] === Infinity) TOUCH[tn++] = c; SD[c] = d2; SB[c] = b; }
  }
  TOUCH[NN] = tn;
}
function stampApply(tn, w, quiet) {
  for (let q = 0; q < tn; q++) {
    const c = TOUCH[q], d = Math.sqrt(SD[c]) / N, b = SB[c];
    SD[c] = Infinity;
    if (quiet) calm[c] = Math.max(calm[c], 1 - smooth(1.1 / N, w * 0.8, d));
    if (coast[c] <= 0 || lake[c] || height[c] <= b) continue;
    let h = lerp(b, height[c], smooth(1.1 / N, w, d));
    const keep = LSH[c] + 0.003;                                          // the ground round a lake stays above the lake, except right at the outlet
    if (LSH[c] > 0 && d > 2.2 / N && h < keep) h = Math.min(height[c], keep);
    height[c] = h;
  }
}
function stampLine(line, bed, count, w, quiet) {
  const R = Math.ceil(w * N) + 1;
  TOUCH[NN] = 0;
  for (let k = 0; k < count; k += (k + 2 < count ? 2 : 1)) stampOne(line[k][0] * N - 0.5, line[k][1] * N - 0.5, R, bed[k]);
  stampApply(TOUCH[NN], w, quiet);
}
function carvePass(P) {                        // the bed arches: highest at the marker point (the col), lower toward both ends
  const line = resample(spline(P.pts, 8), 0.5 / N), n = line.length, bed = new Float32Array(n);
  const km = nearestIndex(line, n, P.pts[P.mark][0], P.pts[P.mark][1]), fall = P.fall || 0;
  for (let k = 0; k < n; k++) { const x = k < km ? (km - k) / km : (k - km) / (n - 1 - km); bed[k] = P.floor - fall * Math.pow(x, 1.5); }
  stampLine(line, bed, n, P.w, false);
}

// 7. Lakes: carve the basin down to the lake level, then lift the shore just around it.
function carveLake(Lk, id) {
  const dense = spline(Lk.pts, 6), DL = flatLine(dense), L = flatLine(resample(dense, 3 / N)), np = Lk.pts.length;
  const hwT = new Float64Array(np), hwV = new Float64Array(np);           // half width at each guide point, and where that point lies along the line
  let hwMax = 0;
  for (let i = 0; i < np; i++) { hwT[i] = DL.s[i * 6] / DL.len; hwV[i] = typeof Lk.hw === 'number' ? Lk.hw : Lk.hw[i]; if (hwV[i] > hwMax) hwMax = hwV[i]; }
  const bb = bbox(Lk.pts, hwMax + 0.035), i0 = bb[0], j0 = bb[2], bw = bb[1] - i0 + 1, tot = bw * (bb[3] - j0 + 1), D = new Float32Array(tot);
  const lx = L.x, ly = L.y, ls = L.s, len = L.len, ns = L.n - 1, steep = Lk.steep;
  let level = 1, cells = 0;
  for (let q = 0; q < tot; q++) {
    const i = i0 + q % bw, j = j0 + ((q / bw) | 0), c = j * N + i, u = (i + 0.5) / N, v = (j + 0.5) / N;
    nearLine(lx, ly, ls, len, u + MX[c] * 0.2, v + MY[c] * 0.2, 0, ns);
    const t = NEAR[1];
    let g = 0;
    while (g < np - 2 && t > hwT[g + 1]) g++;
    const hw = lerp(hwV[g], hwV[g + 1], clamp((t - hwT[g]) / (hwT[g + 1] - hwT[g]), 0, 1));
    const rr = hw * (0.75 + 0.5 * vnoise(u * 45, v * 45, S + 40)) * (0.6 + 0.4 * Math.sin(Math.PI * clamp(t, 0.06, 0.94)));
    D[q] = NEAR[0] - rr;
    if (D[q] < 0 && coast[c] > 0) { cells++; if (height[c] < level) level = height[c]; }
  }
  level = Lk.level || Math.max(level, SEA + 0.012);
  for (let q = 0; q < tot; q++) {
    const c = (j0 + ((q / bw) | 0)) * N + i0 + q % bw, d = D[q];
    if (coast[c] <= 0) continue;
    if (d < 0) { lake[c] = id + 1; height[c] = level; waterDepth[c] = 0.008 + 0.06 * clamp(-d / hwMax, 0, 1); continue; }
    if (d < 0.022) LSH[c] = level;
    const k = 1 - smooth(0.012, 0.030, d), target = level + 0.004 + steep * d;
    if (k > 0 && target > height[c]) height[c] += (target - height[c]) * k;
  }
  LAKES.push(Object.assign({ key: Lk.key, name: Lk.name, rank: Lk.rank || 'minor', level, u: +lx[ns >> 1].toFixed(4), v: +ly[ns >> 1].toFixed(4), cells }, Lk.note ? { note: Lk.note } : null));
}

// 8. River channels: cut the bed through whatever now stands in its way (mountains, hills, lake shores).
//    In the mountains the bed keeps climbing to the spring; in the lowland it lies on the valley floor.
function lowestNear(c) {                       // the lowest land among a cell and its 8 neighbours
  let low = height[c];
  for (let q = 0; q < 8; q++) { const m = c + OFF[q]; if (coast[m] > 0 && height[m] < low) low = height[m]; }
  return low;
}
function carveRiver(Rv, idx) {
  const line = RLINES[idx].line, end = RLINES[idx].end, grade = RLINES[idx].grade, bed = new Float32Array(end);
  let start = 0, prev = 9, lakeIn = -1, lakeLevel = 0;
  while (start < end - 1 && lake[cellOf(line[start][0], line[start][1])]) start++;        // skip the source lake
  const out = start > 0 ? height[cellOf(line[0][0], line[0][1])] : 0;                     // a river that leaves a lake starts at the lake's level
  for (let k = 0; k < end; k++) {
    const c = cellOf(line[k][0], line[k][1]), low = lake[c] ? height[c] : lowestNear(c) - 0.0008;   // undercut the ground beside the bed
    const g = !out ? grade[k] : k < start ? out : out - (out - RLINES[idx].hEnd) * (k - start) / (end - 1 - start);   // ...and falls evenly from there
    bed[k] = prev = Math.max(Math.min(prev - 0.000012, low, g), SEA + 0.0015);
    if (k >= start && lake[c] && lakeIn < 0) { lakeIn = k; lakeLevel = height[c]; }
  }
  for (let k = lakeIn - 1; k >= start; k--) bed[k] = Math.max(bed[k], lakeLevel + 0.00003 * (lakeIn - k));  // never below a lake downstream
  stampLine(line, bed, end, Rv.w, true);
  return cellOf(line[start][0], line[start][1]);
}
// A lake must lie IN its basin: every shore cell stands above the water except ONE, the outlet (the lowest
// shore cell). Anything else that a carve left lower is lifted back, so the lake has a single way out.
function shoreOf(c) {                          // the lake a land cell touches, as index + 1 (0 = none)
  for (let k = 0; k < 8; k++) if (lake[c + OFF[k]]) return lake[c + OFF[k]];
  return 0;
}
function ensureShores(count) {                 // count = only count the shore cells below the lake, change nothing
  const lists = LAKES.map(() => []);
  let below = 0;
  for (let c = N + 1; c < NN - N - 1; c++) if (LSH[c] > 0 && !lake[c] && coast[c] > 0) { const id = shoreOf(c); if (id) lists[id - 1].push(c); }
  for (let id = 0; id < LAKES.length; id++) {
    const list = lists[id], level = LAKES[id].level;
    let out = -1, low = 9;
    for (const c of list) if (height[c] < low) { low = height[c]; out = c; }
    for (const c of list) {
      if (c === out || height[c] >= level + (count ? -1e-5 : 0.0005)) continue;
      below++;
      if (!count) height[c] = level + 0.0005;
    }
  }
  return below;
}

// 9. Real flow. Fill pits with a priority flood so every land cell drains to the sea, take the steepest
//    way down from each cell, add up the water. Rivers are the cells enough water runs through.
const BQ = 65536, BK = (BQ - 1) / (1.1 - SEA), BHEAD = new Int32Array(BQ), BNEXT = new Int32Array(NN), CLOSED = new Uint8Array(NN), PAR = new Int32Array(NN);
function bySea(c) { for (let k = 0; k < 8; k++) if (coast[c + OFF[k]] <= 0) return true; return false; }
function relax(F, m, lim, cur, from) {         // the flood reaches cell m from the cell "from", of height lim
  if (CLOSED[m]) return;
  CLOSED[m] = 1; PAR[m] = from;
  if (F[m] < lim) F[m] = lim;
  let b = ((F[m] - SEA) * BK) | 0;
  b = b < cur ? cur : b > BQ - 1 ? BQ - 1 : b;
  BNEXT[m] = BHEAD[b]; BHEAD[b] = m;
}
function floodSeeds(F) {                       // the flood starts from every land cell that touches the sea
  BHEAD.fill(-1);
  for (let c = 0; c < NN; c++) CLOSED[c] = coast[c] <= 0 ? 1 : 0;
  for (let c = N + 1; c < NN - N - 1; c++) if (!CLOSED[c] && bySea(c)) {
    const b = clamp(((F[c] - SEA) * BK) | 0, 0, BQ - 1);
    CLOSED[c] = 1; BNEXT[c] = BHEAD[b]; BHEAD[b] = c; PAR[c] = -1;
  }
}
function fillPits(F, eps) {                    // priority flood; the queue is 65536 height buckets. eps = the slope a filled hollow keeps
  floodSeeds(F);
  let cur = 0;
  while (cur < BQ) {
    const c = BHEAD[cur];
    if (c < 0) { cur++; continue; }
    BHEAD[cur] = BNEXT[c];
    const lim = F[c] + eps;
    relax(F, c + 1, lim, cur, c); relax(F, c - 1, lim, cur, c); relax(F, c + N, lim, cur, c); relax(F, c - N, lim, cur, c);
    relax(F, c + N + 1, lim, cur, c); relax(F, c + N - 1, lim, cur, c); relax(F, c - N + 1, lim, cur, c); relax(F, c - N - 1, lim, cur, c);
  }
}
// Hollows in the mountains are opened, not filled: a gully is cut from the bottom of each hollow along the
// way its water would spill, down to the first lower ground. (Lakes are the hollows that are meant: they
// are left alone, and so is the ground round them.)
function isBottom(c) {
  const h = height[c];
  for (let k = 0; k < 8; k++) { const m = c + OFF[k]; if (coast[m] > 0 && height[m] < h) return false; }
  return true;
}
function breachFrom(c, path) {
  const hb = height[c];
  let n = 0, x = PAR[c];
  while (x >= 0 && height[x] >= hb && n < 36) {
    if (lake[x] || (LSH[x] > 0 && hb < LSH[x] + 0.004)) return 0;
    path[n++] = x; x = PAR[x];
  }
  if (n >= 36 || (x >= 0 && lake[x])) return 0;                           // a long way out would be a ruled ditch: leave that hollow filled
  const ht = x >= 0 ? height[x] : SEA + 0.001;
  for (let i = 0; i < n; i++) { const b = hb - (hb - ht) * (i + 1) / (n + 1); if (height[path[i]] > b) height[path[i]] = b; }
  return 1;
}
function breachHollows(minDepth) {
  const F = new Float32Array(height), path = new Int32Array(40);
  let cut = 0;
  fillPits(F, 2e-6);
  for (let c = N + 1; c < NN - N - 1; c++) if (coast[c] > 0 && !lake[c] && F[c] - height[c] >= minDepth && isBottom(c)) cut += breachFrom(c, path);
  return cut;
}
function steepest(P, c) {                      // the neighbour with the steepest drop from c (or -1)
  let best = 0, to = -1;
  for (let k = 0; k < 8; k++) { const m = c + OFF[k], drop = (P[c] - P[m]) / DIST[k]; if (drop > best) { best = drop; to = m; } }
  return to;
}
function growLake(F, list, at, id, level) {    // a lake takes drowned ground beside it
  for (let k = 0; k < 8; k++) {
    const m = list[at] + OFF[k];
    if (coast[m] > 0 && !lake[m] && F[m] - height[m] > 0.0005 && F[m] < level + 0.002) { lake[m] = id + 1; waterDepth[m] = 0.008; list.push(m); }
  }
}
function settleLake(F, id) {                   // a lake rests at its spill level
  let level = 1; const list = [];
  for (let c = 0; c < NN; c++) if (lake[c] === id + 1) { list.push(c); if (F[c] < level) level = F[c]; }
  const cap = list.length * 1.5;
  for (let at = 0; at < list.length && list.length < cap; at++) growLake(F, list, at, id, level);
  for (let q = 0; q < list.length; q++) F[list[q]] = level;
  LAKES[id].level = +level.toFixed(4); LAKES[id].cells = list.length;
}
function fillStats(F) {
  let land = 0, filled = 0, maxFill = 0;
  for (let c = 0; c < NN; c++) if (coast[c] > 0) { land++; const fill = pitFill[c] = F[c] - height[c]; if (fill > 0.003) { filled++; if (fill > maxFill) maxFill = fill; } }
  STATS.landCells = land; STATS.filledCells = filled; STATS.maxFill = +maxFill.toFixed(4);
}
// Route on the filled land plus a little noise, so water wanders across flats instead of ruling
// straight lines. No noise in the carved channels: the named rivers keep to their beds.
function routeSurface(P) {
  for (let q = 0; q < NN; q++) {
    const c = cellAt(q), i = c % N, j = (c / N) | 0;
    if (coast[c] > 0 && !lake[c] && calm[c] < 1) P[c] += (1 - calm[c]) * (0.0200 * vnoise(i * 0.055, j * 0.055, S + 82) + 0.0050 * vnoise(i * 0.19, j * 0.19, S + 80) + 0.0012 * hash2(i, j, S + 81));
  }
}
function routeDown(P, F, acc, deg) {
  for (let q = 0; q < NN; q++) {
    const c = cellAt(q);
    if (coast[c] <= 0) continue;
    const to = flowTo[c] = steepest(P, c);
    if (to >= 0) deg[to]++;
    acc[c] = 1 + (RAIN_HIGH - 1) * clamp((height[c] - 0.36) / 0.3, 0, 1);  // more rain on high ground
    height[c] = F[c];
  }
}
function routeGather(acc, deg, order) {        // add the water up, upstream cells first
  let qn = 0;
  for (let c = 0; c < NN; c++) if (coast[c] > 0 && deg[c] === 0) order[qn++] = c;
  for (let q = 0; q < qn; q++) {
    const c = order[q], to = flowTo[c];
    if (to < 0 || coast[to] <= 0) continue;
    acc[to] += acc[c];
    if (--deg[to] === 0) order[qn++] = to;
  }
  return qn;
}
function routeRivers(acc, order, qn, fed) {
  const span = Math.log(RIVER_FULL / RIVER_MIN);
  for (let q = 0; q < qn; q++) {
    const c = order[q], a = acc[c], to = flowTo[c];
    // a channel needs more water to show on the flats and less in the mountains; once it shows it runs on to the sea
    const bar = RIVER_MIN * (1 + 3 * Math.max(mWheat[c], mBattle[c], mSwamp[c])) / (1 + 14 * mountain[c]);
    river[c] = lake[c] || (a < bar && !fed[c]) ? 0 : clamp(0.22 + 0.78 * Math.log(a / RIVER_MIN) / span, 0.12, 1);
    if (river[c] > 0 && to >= 0) fed[to] = 1;
    // cut the bed so a river never steps up on its way down (the noise may have led it over a low rise)
    if ((river[c] > 0 || lake[c]) && to >= 0 && coast[to] > 0 && !lake[to] && height[to] > height[c]) height[to] = height[c];
  }
}
function routeFlow(springs) {
  for (let c = 0; c < NN; c++) if (coast[c] > 0 && height[c] < SEA + 0.001) height[c] = SEA + 0.001;
  const F = new Float32Array(height), acc = SB.fill(0), order = TOUCH, deg = new Uint8Array(NN);
  fillPits(F, 2e-6);
  fillStats(F);
  for (let id = 0; id < LAKES.length; id++) settleLake(F, id);
  const P = new Float32Array(F);
  routeSurface(P);
  fillPits(P, 2e-6);
  routeDown(P, F, acc, deg);
  for (let k = 0; k < springs.length; k++) acc[springs[k]] += RIVER_MIN * 1.3;
  routeRivers(acc, order, routeGather(acc, deg, order), CLOSED.fill(0));
}

// 10. Vector rivers traced from the flow, named ones first, then every other channel head.
function riverHeads(used) {
  const fed = new Uint8Array(NN), heads = [];
  for (let c = 0; c < NN; c++) if (river[c] > 0 && flowTo[c] >= 0) fed[flowTo[c]] = 1;
  for (let c = 0; c < NN; c++) if (river[c] > 0 && !fed[c] && !used[c]) heads.push(c);
  return heads.sort((a, b) => height[b] - height[a] || a - b);
}
function traceRivers(springs) {
  const used = new Uint8Array(NN), paths = {};
  function trace(c0) {
    const cells = [];
    let c = c0;
    while (c >= 0 && coast[c] > 0) { cells.push(c); if (used[c]) break; used[c] = 1; c = flowTo[c]; }
    if (c >= 0 && coast[c] <= 0) cells.push(c);
    return cells;
  }
  function emit(key, name, named, cells) {
    const pts = [], w = [];
    for (let q = 0; q < cells.length; q++) {
      if (q % 2 && q !== cells.length - 1) continue;
      const c = cells[q];
      pts.push([+(((c % N) + 0.5) / N).toFixed(4), +((((c / N) | 0) + 0.5) / N).toFixed(4)]);
      w.push(+river[c].toFixed(3));
    }
    RIVERS.push({ key, name, named, pts, w });
  }
  DATA.rivers.forEach((Rv, i) => { const cells = trace(springs[i]); paths[Rv.key] = cells; if (cells.length >= 2) emit(Rv.key, Rv.name, !Rv.minor, cells); });
  let k = 0;
  for (const hd of riverHeads(used)) { const cells = trace(hd); if (cells.length >= 8) emit('stream_' + (k++), null, false, cells); }
  return paths;
}

// 11. Regions. The border between the Reach and the east is the border river itself, down to the gulf.
function regionCells(uB, axisV, southLine) {
  for (let q = 0; q < NN; q++) {
    const c = cellAt(q), i = c % N, j = (c / N) | 0, u = (i + 0.5) / N, v = (j + 0.5) / N;
    if (coast[c] <= 0) { region[c] = v < 0.135 ? 0 : Math.abs(v - 0.5) >= Math.abs(u - 0.5) ? (v < 0.5 ? 0 : 2) : u < 0.5 ? 1 : 3; continue; }
    let id;
    if (belt[c] > 0.07) id = 5;
    else if (v + WY[c] * 0.6 < axisV[i]) id = 4;
    else if (mBattle[c] > 0.5) id = 12;
    else if (u < uB[j]) id = mWheat[c] > 0.5 ? 7 : mSwamp[c] > 0.5 ? 9 : mMassif[c] > 0.7 ? 8 : 6;
    else id = v + WY[c] * 0.8 < lineAt(southLine, u) ? 10 : 11;
    region[c] = id;
  }
}
function paintRegions(borderCells) {
  const uB = new Float32Array(N), cnt = new Float32Array(N), axisV = new Float32Array(N);
  for (const c of borderCells) { const j = (c / N) | 0; uB[j] += ((c % N) + 0.5) / N; cnt[j]++; }
  let first = -1, last = -1;
  for (let j = 0; j < N; j++) if (cnt[j]) { uB[j] /= cnt[j]; if (first < 0) first = j; last = j; }
  for (let j = 0; j < N; j++) { if (j < first) uB[j] = uB[first]; else if (j > last) uB[j] = uB[last]; else if (!cnt[j]) uB[j] = uB[j - 1]; }
  for (let i = 0; i < N; i++) axisV[i] = lineAt(DATA.beltAxis, (i + 0.5) / N);
  regionCells(uB, axisV, DATA.eastKingdom.southLine);
  for (const I of ISLES) {
    boxAround(I[0], I[1], I[2] * 2);
    for (let q = 0; q < BOX[3]; q++) { const c = (BOX[1] + ((q / BOX[2]) | 0)) * N + BOX[0] + q % BOX[2]; if (coast[c] > 0) region[c] = 13; }
  }
}

const snowLineAt = v => SNOW_LINE - 0.20 * (1 - smooth(0.08, 0.60, v));

// 12. Forests and snow. Noise patches per region first, then the special woods and the clearings.
function setForest(c, dens, type) { forest[c] = dens < 0.04 ? 0 : dens; forestType[c] = dens < 0.04 ? 0 : type; }
function forestCells(patch) {
  for (let q = 0; q < NN; q++) {
    const c = cellAt(q);
    if (coast[c] <= 0 || lake[c]) continue;
    const i = c % N, j = (c / N) | 0, v = (j + 0.5) / N, h = height[c], sl = snowLineAt(v);
    if (h > sl - 0.07) snow[c] = smooth(sl - 0.03, sl + 0.06, h + 0.05 * (ridgeAt(c) - 0.5));
    const n = half(patch, i, j), id = region[c];
    let dens = 0, type = 1;                                              // 1 = FOREST.WOOD
    if (id === 6) { dens = smooth(0.50, 0.62, n); if (h > 0.38) type = 3; }
    else if (id === 7) dens = smooth(0.70, 0.78, n) * 0.7;
    else if (id === 8) { dens = smooth(0.30, 0.42, n) * smooth(0.30, 0.36, h); type = 3; }             // 3 = PINE
    else if (id === 9) { dens = 0.25 + 0.5 * smooth(0.40, 0.60, n); type = 5; }                        // 5 = SWAMP
    else if (id === 10) dens = smooth(0.55, 0.66, n) * 0.8;
    else if (id === 11) dens = smooth(0.58, 0.70, n) * 0.65;
    else if (id === 4 || id === 5) { dens = smooth(0.52, 0.66, n) * 0.75; type = 3; }
    const tl = TREE_LINE - 0.10 * (1 - smooth(0.10, 0.60, v));            // lower tree line in the north
    dens *= 1 - smooth(tl - 0.07, tl, h);
    if (mountain[c] > 0.45) dens *= 0.6;
    if (river[c] > 0) dens *= 0.25;
    setForest(c, dens, type);
  }
}
function forestBlob(u0, v0, r, fn) {           // run fn(c, u, v, distance, du, dv) over the land cells within r
  boxAround(u0, v0, r);
  const i0 = BOX[0], j0 = BOX[1], bw = BOX[2], tot = BOX[3];
  for (let q = 0; q < tot; q++) {
    const i = i0 + q % bw, j = j0 + ((q / bw) | 0), c = j * N + i, u = (i + 0.5) / N, v = (j + 0.5) / N;
    const du = u + MX[c] - u0, dv = v + MY[c] - v0;
    if (coast[c] > 0 && !lake[c]) fn(c, u, v, Math.sqrt(du * du + dv * dv), du, dv);
  }
}
function sameBank(u0, v0, r, wall) {           // the land cells within r of a place that can be reached without crossing the wall cells
  const mark = new Uint8Array(NN), block = new Uint8Array(NN), q = [cellOf(u0, v0)];
  for (const c of wall) block[c] = 1;
  mark[q[0]] = 1;
  for (let at = 0; at < q.length; at++) {
    const c = q[at];
    for (let k = 0; k < 8; k += 2) {
      const m = c + OFF[k];
      if (mark[m] || block[m] || coast[m] <= 0 || lake[m]) continue;
      if (Math.hypot(((m % N) + 0.5) / N - u0, (((m / N) | 0) + 0.5) / N - v0) > r) continue;
      mark[m] = 1; q.push(m);
    }
  }
  return mark;
}
function growForests(reachRiver) {
  forestCells(fbmField(7, 8.1, 2.9, S + 60, 3, 1));
  // The Forest of Eyes: a long shape on the low ground, never across the Reach river.
  const FE = PLACE.forest_of_eyes, st = Math.sqrt(FE.stretch || 1), an = (FE.axis || 0) * Math.PI / 180, ca = Math.cos(an), sa = Math.sin(an);
  const bank = sameBank(FE.u, FE.v, FE.r * st * 1.5, reachRiver), g0 = height[cellOf(FE.u, FE.v)];
  forestBlob(FE.u, FE.v, FE.r * st * 1.5, (c, u, v, d, du, dv) => {
    const x = (du * ca + dv * sa) / (FE.r * st), y = (dv * ca - du * sa) / (FE.r / st);
    const de = Math.sqrt(x * x + y * y) / (0.72 + 0.56 * fbm(u * 11 + 4.4, v * 11 + 9.9, S + 61, 3)) + 0.7 * smooth(g0 + 0.05, g0 + 0.11, height[c]);   // it keeps off ground that stands well above its heart
    if (de < 1 && bank[c] && (region[c] === 6 || region[c] === 8)) setForest(c, river[c] > 0 ? 0.5 : Math.max(forest[c], de < 0.85 ? 1 : 1 - (de - 0.85) / 0.15 * 0.6), FOREST.EYES);
  });
  for (const G of DATA.pois.filter(p => p.type === 'crystal_grove')) forestBlob(G.u, G.v, G.r * 1.4, (c, u, v, d) => {
    const dg = d / (G.r * (0.6 + 0.8 * vnoise(u * 30, v * 30, S + 62)));
    if (dg < 1) setForest(c, Math.max(forest[c], 0.9 * smooth(1, 0.6, dg)), FOREST.CRYSTAL);
  });
  const clear = DATA.pois.filter(p => p.clear).map(p => [p.u, p.v, p.clear]).concat(DATA.castles.map(p => [p.u, p.v, p.r * 0.9]));
  for (const q of clear) forestBlob(q[0], q[1], q[2], (c, u, v) => {
    const d = Math.hypot(u - q[0], v - q[1]);
    if (d < q[2]) setForest(c, forest[c] * smooth(q[2] * 0.6, q[2], d), forestType[c]);
  });
}

// 13. The wheat country: a patchwork of strip fields, each with its own strip direction.
const FIELD = new Float64Array(3);             // result of fieldAt: [edge closeness, field x, field y]
function fieldAt(SX, SY, gx, gy) {             // which field seed is nearest (a cellular pattern)
  const ix = Math.floor(gx), iy = Math.floor(gy);
  let f1 = 9, f2 = 9, best = 0;
  for (let k = 0; k < 9; k++) {
    const q = ((iy + ((k / 3) | 0) - 1) & 63) * 64 + ((ix + k % 3 - 1) & 63), dx = gx - SX[q], dy = gy - SY[q], d = Math.sqrt(dx * dx + dy * dy);
    if (d < f1) { f2 = f1; f1 = d; best = q; } else if (d < f2) f2 = d;
  }
  FIELD[0] = f2 - f1; FIELD[1] = best & 63; FIELD[2] = best >> 6;
}
function sowWheat() {
  const FS = DATA.wheat.fieldSize, wb = bbox(DATA.wheat.poly, 0.06), SX = new Float32Array(4096), SY = new Float32Array(4096);
  for (let q = 0; q < 4096; q++) { SX[q] = (q & 63) + 0.15 + 0.7 * hash2(q & 63, q >> 6, S + 70); SY[q] = (q >> 6) + 0.15 + 0.7 * hash2(q & 63, q >> 6, S + 71); }
  setBox(wb[0], wb[1], wb[2], wb[3]);
  const i0 = BOX[0], j0 = BOX[1], bw = BOX[2], tot = BOX[3];
  for (let q = 0; q < tot; q++) {
    const i = i0 + q % bw, j = j0 + ((q / bw) | 0), c = j * N + i, u = (i + 0.5) / N, v = (j + 0.5) / N;
    if (coast[c] <= 0 || lake[c] || region[c] !== 7) continue;
    fieldAt(SX, SY, (u + MX[c] * 0.4) / FS, (v + MY[c] * 0.4) / FS);
    const bx = FIELD[1], by = FIELD[2];
    let w = smooth(0.5, 0.8, mWheat[c] + 0.25 * (vnoise(u * 30, v * 30, S + 72) - 0.5));
    if (hash2(bx, by, S + 73) < 0.14) w *= 0.25;                        // a fallow field
    if (FIELD[0] < 0.07) w *= 0.35;                                     // the grass baulk between fields
    if (river[c] > 0 || forest[c] > 0.3) w = 0;
    wheat[c] = w;
    wheatField[c] = by * 64 + bx + 1;
    wheatAngle[c] = hash2(bx, by, S + 74) * Math.PI;
  }
  for (const p of DATA.castles) forestBlob(p.u, p.v, p.r * 1.3, c => { wheat[c] = 0; });   // no fields on a castle hill
}

// The lowland with its hills, before the mountains are raised: every hollow the hills left is filled to a
// gentle slope toward its way out, so the lowland has shallow dales, not dead-flat terraces.
function smoothHollows() {
  fillPits(height, 1.5e-4);
  for (let c = 0; c < NN; c++) if (coast[c] > 0) base[c] = height[c];
}

function build() {
  buildCoast();
  DATA.ranges.forEach(measureRange);
  chamferDown(DM); chamferUp(DM);
  DATA.rivers.forEach(traceRiver);
  const rowU = new Float32Array(N), rowBed = new Float32Array(N);
  riverRows(RLINES[DATA.rivers.findIndex(r => r.key === DATA.wheat.river)], rowU, rowBed);
  lowland(rowU, rowBed);
  DATA.rivers.forEach(seedRiver);
  valeDown();
  valeUp();
  chamferDown(RD); chamferUp(RD);
  buildBase();
  DATA.ranges.forEach((R, idx) => addRange(R, idx, true));
  DATA.knolls.forEach((k, i) => addHill(k[0], k[1], k[2], k[3], 100 + i, false));
  smoothHollows();
  DATA.ranges.forEach((R, idx) => addRange(R, idx, false));
  DATA.ranges.forEach((R, idx) => RANGES.push({ key: R.key, name: R.name, kind: R.kind, h: R.h, w: R.w, pts: resample(MEAS[idx].dense, 3 / N).map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]) }));
  DATA.cones.forEach(addCone);
  DATA.passes.forEach(carvePass);
  DATA.castles.forEach((p, i) => addHill(p.u, p.v, p.hill, p.r, i, true));
  DATA.lakes.forEach(carveLake);
  const springs = DATA.rivers.map(carveRiver);
  STATS.breached = breachHollows(0.004);
  ensureShores(false);
  routeFlow(springs.filter((s, i) => !DATA.rivers[i].minor || lake[cellOf(DATA.rivers[i].pts[0][0], DATA.rivers[i].pts[0][1])]));   // named rivers and lake outflows show from their spring
  STATS.lakeShoreBelow = ensureShores(true);
  const paths = traceRivers(springs);
  paintRegions(paths.border_river);
  growForests(paths.reach_river);
  sowWheat();
  for (const R of DATA.roads) {
    const src = (R.fromPass ? DATA.passes.find(p => p.key === R.fromPass).pts : R.pts).map(p => (typeof p === 'string' ? [PLACE[p].u, PLACE[p].v] : p));
    ROADS.push(Object.assign({ key: R.key, name: R.name, kind: R.kind, pts: resample(spline(src, 8), 2 / N).map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]) }, R.note ? { note: R.note } : null));
  }
}
build();

// ---------------------------------------------------------------- accessors
function sample(arr, u, v) {
  const x = clamp(u * N - 0.5, 0, N - 1.001), y = clamp(v * N - 0.5, 0, N - 1.001), x0 = x | 0, y0 = y | 0, tx = x - x0, ty = y - y0, c = y0 * N + x0;
  return lerp(lerp(arr[c], arr[c + 1], tx), lerp(arr[c + N], arr[c + N + 1], tx), ty);
}
const heightAt = (u, v) => sample(height, u, v);
const regionAt = (u, v) => REGIONS[region[cellOf(u, v)]];
const isWater = (u, v) => { const c = cellOf(u, v); return coast[c] <= 0 || lake[c] > 0; };
// The region of a place is looked up on the grid, except where the anchor stands outside what it names:
// the isles anchor is in the water between the isles (13), a pass lies in the northern ranges (5).
const placeRegion = (p, type) => (type === 'isles' ? 13 : type === 'pass' ? 5 : region[cellOf(p.u, p.v)]);
const place = (p, type) => Object.assign({ key: p.key, name: p.name, u: p.u, v: p.v, type: type || p.type, rank: p.rank || 'minor', provisional: true,
  height: +heightAt(p.u, p.v).toFixed(3), region: placeRegion(p, type || p.type) },
  p.variant !== undefined ? { variant: p.variant } : null, p.r ? { r: p.r } : null, p.note ? { note: p.note } : null);
const POIS = DATA.castles.map(p => place(p, 'castle')).concat(DATA.pois.map(p => place(p)));
POIS.push(...LAKES.map(L => place({ key: L.key, name: L.name, u: L.u, v: L.v, type: 'lake', rank: L.rank, note: L.note })));
POIS.push(...DATA.passes.map(P => place({ key: P.key, name: P.name, u: P.pts[P.mark][0], v: P.pts[P.mark][1], type: 'pass', rank: 'minor', note: P.note })));
const poi = key => POIS.find(p => p.key === key);
const LABELS = DATA.labels.map(l => (l.poi
  ? { key: l.key, text: l.text, rank: l.rank, u: +(poi(l.poi).u + l.du).toFixed(4), v: +(poi(l.poi).v + l.dv).toFixed(4), extentU: l.extentU, extentV: l.extentV, poi: l.poi }
  : Object.assign({}, l)));

const WORLD = {
  N, SEED, SEA, TREE_LINE, SNOW_LINE, FOREST,
  height, waterDepth, coast, region, river, flowTo, lake, forest, forestType, wheat, wheatAngle, wheatField, snow, mountain, pitFill,
  heightAt, sample, cell: cellOf, regionAt, isWater, snowLineAt, poi,
  REGIONS, LAKES, POIS, LABELS, RANGES, PEAKS, RIVERS, ROADS, DATA, STATS
};
if (typeof module !== 'undefined' && module.exports) module.exports = WORLD;
if (typeof window !== 'undefined') window.WORLD = WORLD;
})();
