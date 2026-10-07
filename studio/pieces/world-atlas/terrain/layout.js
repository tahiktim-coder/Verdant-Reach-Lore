'use strict';
/* =============================================================================================
   WORLD ATLAS LAYOUT: the one editable data block for the relief atlas terrain.
   ALL PLACEMENTS ARE PROVISIONAL LORE. Edit a line here and rerun build_terrain.js.
   Everything below is drawn in DESIGN coordinates: u = 0 west .. 1 east, v = 0 north .. 1 south (the land
   roughly fills that square; a few gestures run past it). FRAME (at the bottom) then shrinks the whole design
   onto the map about its centre, so the land sits in open sea. Every output file (pois, labels, rivers, coast)
   is in MAP coordinates. Heights are 0..1, the sea surface is SEA. Widths and radii are in design u units.
   ============================================================================================= */

const SEA = 0.20;

const DESIGN = {
  seed: 4127,
  sea: SEA,

  // ---- COAST ------------------------------------------------------------------------------
  // Mainland outline, clockwise from the north-west cape. A slow noise warp and a fine ragged edge are
  // added afterwards (strength set by coastRough). Fjords, inlets and the estuary are cut separately
  // (cuts) so the warp cannot close them; islands are added afterwards too.
  outline: [
    // NW: the western arc runs out into the Western Sea as a mountain cape; the shore runs north-east from it
    [0.018, 0.236], [0.030, 0.212], [0.048, 0.186], [0.070, 0.160], [0.095, 0.140], [0.124, 0.128], [0.156, 0.122],
    // the north coast on the Unknown Sea: a broad blunt headland where the mountain path comes down ...
    [0.186, 0.116], [0.206, 0.119], [0.222, 0.127], [0.234, 0.118], [0.242, 0.104], [0.254, 0.092], [0.270, 0.084],
    [0.290, 0.082], [0.308, 0.088], [0.320, 0.100], [0.326, 0.118], [0.336, 0.136], [0.348, 0.152],
    // ... a deep bay biting south under the fore-arc ...
    [0.364, 0.164], [0.382, 0.170], [0.400, 0.167], [0.416, 0.158], [0.430, 0.146], [0.446, 0.132], [0.462, 0.121],
    [0.480, 0.112], [0.498, 0.102],
    // ... the northern headland, a short thumb (the island chain trails north-east off it) ...
    [0.516, 0.084], [0.532, 0.064], [0.550, 0.048], [0.570, 0.036], [0.592, 0.030], [0.612, 0.034], [0.626, 0.048],
    [0.634, 0.066], [0.646, 0.084], [0.664, 0.098],
    // ... a small bay east of the thumb, a pointed headland past the storm valley, and a concave sweep to the cape
    [0.680, 0.112], [0.698, 0.124], [0.716, 0.133], [0.736, 0.137], [0.754, 0.132], [0.770, 0.120], [0.784, 0.108],
    [0.798, 0.096], [0.812, 0.087], [0.826, 0.086], [0.836, 0.096], [0.843, 0.112], [0.852, 0.126], [0.864, 0.140],
    [0.878, 0.156], [0.898, 0.176], [0.918, 0.191], [0.938, 0.201], [0.960, 0.207], [0.980, 0.215], [0.996, 0.226],
    [0.990, 0.248],
    // east coast: a cove under the cape, the battlefield cliffs bulging east, the coast falling back to the
    // estuary (cut at v 0.50), a deep eastern bay, and a blunt cape before the south-east bay
    [0.964, 0.262], [0.944, 0.276], [0.934, 0.296], [0.942, 0.318], [0.962, 0.338], [0.982, 0.358], [0.990, 0.380],
    [0.982, 0.402], [0.960, 0.414], [0.936, 0.424], [0.914, 0.438], [0.898, 0.456], [0.886, 0.476], [0.880, 0.496],
    [0.881, 0.516], [0.887, 0.540], [0.891, 0.566], [0.894, 0.592], [0.900, 0.616], [0.910, 0.636], [0.920, 0.644],
    [0.930, 0.658], [0.942, 0.684], [0.952, 0.704], [0.954, 0.722],
    // the south-east bay, biting west under the Mount of the Buried Machine: an irregular embayment with a point inside
    [0.946, 0.736], [0.930, 0.744], [0.916, 0.741], [0.902, 0.750], [0.897, 0.764], [0.884, 0.768], [0.870, 0.780],
    [0.865, 0.794], [0.874, 0.804], [0.870, 0.816],
    // the long south-east peninsula, hooking south: north shore out to its tip ...
    [0.884, 0.828], [0.910, 0.840], [0.936, 0.856], [0.952, 0.870], [0.964, 0.882], [0.978, 0.886], [0.994, 0.898],
    [1.010, 0.918], [1.024, 0.938],
    [1.036, 0.960], [1.040, 0.980], [1.030, 0.994],
    // ... and the south shore back west
    [1.008, 0.990], [0.984, 0.976], [0.958, 0.958], [0.934, 0.946], [0.916, 0.934], [0.902, 0.926], [0.884, 0.926],
    [0.866, 0.920], [0.852, 0.912],
    [0.824, 0.902], [0.798, 0.890], [0.774, 0.876], [0.752, 0.864],
    // the southern bay between the peninsula and the gulf
    [0.730, 0.856], [0.708, 0.856], [0.686, 0.864], [0.664, 0.876], [0.646, 0.892], [0.632, 0.910], [0.622, 0.930],
    [0.614, 0.950], [0.600, 0.964],
    // the southern gulf: east shore north to its head (the delta), west shore back south
    [0.586, 0.960], [0.578, 0.936], [0.572, 0.910], [0.564, 0.888], [0.552, 0.870], [0.540, 0.862], [0.526, 0.866],
    [0.514, 0.878], [0.504, 0.896], [0.494, 0.916], [0.480, 0.932], [0.468, 0.948],
    // the low swamp coast west of the gulf
    [0.452, 0.940], [0.430, 0.930], [0.405, 0.928], [0.380, 0.934], [0.355, 0.946], [0.332, 0.958], [0.310, 0.968],
    // the alpine coast (the valleys reach the sea in inlets), rounding the south-west corner ...
    [0.286, 0.976], [0.258, 0.984], [0.228, 0.990], [0.198, 0.994], [0.168, 0.998], [0.140, 1.000], [0.112, 0.996],
    [0.086, 0.988], [0.064, 0.974], [0.046, 0.954], [0.034, 0.930], [0.026, 0.904], [0.016, 0.878], [0.002, 0.856],
    [-0.012, 0.836], [-0.026, 0.824],
    // ... the south-west headland: a high promontory where the alpine divide runs out west into the sea ...
    [-0.038, 0.812], [-0.044, 0.798], [-0.038, 0.784], [-0.022, 0.774], [0.000, 0.768], [0.022, 0.762], [0.046, 0.750],
    [0.068, 0.734], [0.088, 0.716],
    // ... whose north shore is the south side of the deep western bay; in to its head (the Reach river mouth), out along the north shore
    [0.106, 0.698], [0.124, 0.684], [0.144, 0.672], [0.166, 0.662], [0.188, 0.652], [0.204, 0.640], [0.216, 0.624],
    [0.214, 0.606], [0.198, 0.594], [0.178, 0.584], [0.156, 0.574], [0.134, 0.562], [0.112, 0.548], [0.092, 0.532],
    [0.076, 0.514], [0.066, 0.494],
    // the north-west fjord coast, bulging west (the fjords are cuts)
    [0.060, 0.470], [0.056, 0.444], [0.048, 0.416], [0.040, 0.388], [0.034, 0.358], [0.034, 0.328], [0.036, 0.300],
    [0.032, 0.276], [0.022, 0.256]
  ],
  // extra land added to the outline before the warp: [u, v, ru, rv]
  landBlobs: [
    [0.542, 0.872, 0.017, 0.012]                           // the border river's delta at the head of the gulf
  ],
  // coast character: [u, v, radius, value]; blended over a base. rough = how ragged and wandering the
  // shore is; cliff = how fast the land rises from the water (1 = sea cliffs).
  coastRough: { base: 0.55, spots: [
    [0.540, 0.060, 0.16, 0.85], [0.330, 0.150, 0.10, 0.70],
    [0.060, 0.350, 0.12, 1.00], [-0.025, 0.800, 0.09, 1.00], [0.030, 0.930, 0.10, 0.85], [0.960, 0.940, 0.10, 0.85],
    [0.970, 0.350, 0.06, 0.30], [0.930, 0.500, 0.05, 0.6], [0.540, 0.900, 0.05, 0.7], [0.150, 0.630, 0.08, 0.75],
    [0.905, 0.610, 0.06, 0.70], [0.885, 0.780, 0.05, 0.95], [0.875, 0.575, 0.06, 0.75], [0.285, 0.085, 0.06, 0.80],
    [0.818, 0.072, 0.05, 0.90], [0.720, 0.130, 0.04, 0.70]
  ] },
  coastCliff: { base: 0.15, spots: [
    [0.050, 0.330, 0.10, 0.50], [0.035, 0.225, 0.05, 1.0], [-0.028, 0.798, 0.07, 1.0], [0.035, 0.950, 0.08, 0.8], [0.985, 0.232, 0.05, 1.0],
    [0.975, 0.355, 0.06, 1.0], [1.020, 0.960, 0.06, 0.6], [0.880, 0.770, 0.05, 0.5], [0.380, 0.158, 0.05, 0.7],
    [0.590, 0.020, 0.05, 0.6], [0.818, 0.068, 0.04, 0.8], [0.880, 0.785, 0.04, 0.7]
  ] },
  coastWarp: 0.020,        // how far the slow warp pushes the outline about (at rough = 1)
  coastFray: 0.0050,       // amplitude of the fine ragged edge (at rough = 1)

  // narrow water cut into the land after the warp: points from the mouth (at sea) to the head;
  // w = [half width at the mouth, at the head]
  cuts: [
    // the north-west fjords: they fan out (north one bends north-east, the long one splits, the small one is a
    // short sea loch); w = one half width per point (or [mouth, head])
    { key: 'fjord_north', w: [0.0044, 0.0036, 0.0024, 0.0030, 0.0022, 0.0017, 0.0010],
      pts: [[0.004, 0.284], [0.030, 0.287], [0.048, 0.280], [0.060, 0.268], [0.071, 0.263], [0.083, 0.258], [0.091, 0.246]] },
    { key: 'fjord_long', w: [0.0056, 0.0046, 0.0032, 0.0040, 0.0028, 0.0025, 0.0018, 0.0010],
      pts: [[0.000, 0.340], [0.028, 0.345], [0.046, 0.353], [0.060, 0.351], [0.072, 0.341], [0.085, 0.337], [0.095, 0.322], [0.101, 0.305]] },
    { key: 'fjord_long_arm', w: [0.0024, 0.0020, 0.0015, 0.0009], pts: [[0.060, 0.351], [0.068, 0.363], [0.079, 0.369], [0.088, 0.381]] },
    { key: 'fjord_small', w: [0.0060, 0.0046, 0.0028, 0.0012], pts: [[0.008, 0.400], [0.032, 0.398], [0.048, 0.392], [0.060, 0.396]] },
    { key: 'fjord_still_water', w: [0.0048, 0.0038, 0.0025, 0.0033, 0.0024, 0.0019, 0.0012],
      pts: [[0.016, 0.450], [0.040, 0.444], [0.058, 0.433], [0.071, 0.429], [0.085, 0.425], [0.099, 0.420], [0.114, 0.418]] },
    { key: 'fjord_still_water_arm', w: [0.0022, 0.0018, 0.0013, 0.0008], pts: [[0.058, 0.433], [0.066, 0.447], [0.078, 0.452], [0.087, 0.461]] },
    { key: 'inlet_path', w: [0.0045, 0.0015], pts: [[0.222, 0.100], [0.230, 0.130], [0.242, 0.152]] },
    { key: 'inlet_north_mid', w: [0.0042, 0.0015], pts: [[0.392, 0.140], [0.399, 0.164], [0.410, 0.178]] },
    { key: 'inlet_north_isles', w: [0.0040, 0.0015], pts: [[0.668, 0.080], [0.656, 0.096], [0.644, 0.112]] },
    { key: 'inlet_north_east', w: [0.004, 0.0015], pts: [[0.880, 0.150], [0.870, 0.172], [0.860, 0.186]] },
    { key: 'inlet_storm_w', w: [0.0055, 0.0018], pts: [[0.486, 0.090], [0.484, 0.112], [0.486, 0.128]] },
    { key: 'inlet_storm_e', w: [0.0050, 0.0016], pts: [[0.766, 0.110], [0.773, 0.124], [0.775, 0.138]] },
    { key: 'estuary', w: [0.026, 0.013, 0.0068, 0.0040, 0.0024], pts: [[0.915, 0.503], [0.893, 0.500], [0.877, 0.496], [0.863, 0.492], [0.851, 0.489]] },
    { key: 'inlet_alpine_river', w: [0.014, 0.008, 0.0042, 0.0020], pts: [[0.270, 1.016], [0.267, 0.996], [0.266, 0.984], [0.265, 0.974]] },
    { key: 'inlet_west_valley', w: [0.012, 0.007, 0.0038, 0.0018], pts: [[0.168, 1.026], [0.165, 1.008], [0.164, 0.996], [0.163, 0.986]] },
    { key: 'cove_headland_n', w: [0.0050, 0.0040, 0.0016], pts: [[0.030, 0.748], [0.040, 0.770], [0.044, 0.786]] },
    { key: 'cove_headland_s', w: [0.0055, 0.0042, 0.0016], pts: [[0.000, 0.868], [0.022, 0.862], [0.040, 0.866]] }
  ],
  // islands after the warp: [u, v, radius, stretch, axis in degrees, top height]
  islands: [
    // skerries off the north-west fjords
    [0.012, 0.318, 0.005, 1.3, 10, 0.25], [0.008, 0.372, 0.004, 1, 0, 0.24], [0.016, 0.420, 0.006, 1.5, 20, 0.27],
    [0.026, 0.470, 0.004, 1.2, 70, 0.23], [0.006, 0.262, 0.004, 1, 0, 0.25],
    // an island in the western bay
    [0.128, 0.622, 0.008, 1.8, 150, 0.27],
    // skerries off the south-west headland and the corner below it
    [-0.062, 0.796, 0.006, 1.4, 60, 0.28], [-0.054, 0.822, 0.004, 1.2, 20, 0.26],
    [0.010, 0.968, 0.005, 1.3, 30, 0.25],
    // the island chain in the Unknown Sea, trailing north-east off the northern headland
    // (one main island with a lobe, a second, a slim one and a rock)
    [0.640, 0.014, 0.007, 1.7, 30, 0.30], [0.690, 0.004, 0.016, 1.9, 18, 0.42], [0.710, 0.016, 0.008, 1.3, 70, 0.33],
    [0.746, -0.006, 0.010, 1.6, 150, 0.34], [0.768, 0.012, 0.005, 1.4, 40, 0.27],
    // the Artifact Isles, trailing off the peninsula
    [1.064, 1.014, 0.015, 1.8, 40, 0.42], [1.050, 0.998, 0.007, 1.4, 100, 0.33], [1.098, 1.044, 0.010, 1.5, 25, 0.35],
    [1.112, 1.010, 0.005, 1.3, 60, 0.28], [1.086, 1.072, 0.006, 1.6, 140, 0.29],
    // sea stacks off the battlefield cliffs
    [1.004, 0.352, 0.004, 1.3, 20, 0.25]
  ],
  // the Artifact Isles region: land inside this circle (u, v, r)
  isles: [1.082, 1.034, 0.060],
  shelf: { width: 0.07, depth: 0.12 },      // the sea floor falls this far below SEA over this distance

  // ---- MOUNTAINS --------------------------------------------------------------------------
  // Crest lines. h = tallest summit, w = half width, peaks = summits along the crest, sag = how far the
  // saddles between them dip (share of h above the ground), col = no saddle lower than this (keeps the
  // belt a barrier), taper = [start, end] share of the length over which the ends fade (0 = runs on at
  // full height: into the sea or into another range), steep = the steeper side (N S E W). Crest lines get a
  // small zigzag (crestWiggle) so no range is a smooth arc.
  crestWiggle: { amp: 0.006, wave: 0.07 },
  ranges: [
    { key: 'arc_west', name: 'western arc', kind: 'belt', h: 0.78, w: 0.040, peaks: 5, sag: 0.32, col: 0.52, taper: [0.0, 0.22], steep: 'S',
      pts: [[0.018, 0.240], [0.060, 0.222], [0.100, 0.210], [0.145, 0.204], [0.195, 0.212], [0.240, 0.228], [0.276, 0.252]] },
    { key: 'arc_high', name: 'high arc', kind: 'belt', h: 0.97, w: 0.050, peaks: 6, sag: 0.30, col: 0.58, taper: [0.22, 0.18], steep: 'N',
      pts: [[0.302, 0.210], [0.345, 0.218], [0.392, 0.236], [0.438, 0.256], [0.480, 0.274], [0.522, 0.286]] },
    { key: 'arc_fore', name: 'northern fore-arc', kind: 'belt', h: 0.62, w: 0.028, peaks: 3, sag: 0.40, col: 0, taper: [0.35, 0.35], steep: 'N',
      pts: [[0.366, 0.188], [0.402, 0.183], [0.440, 0.193]] },
    { key: 'arc_mid', name: 'middle arc', kind: 'belt', h: 0.84, w: 0.040, peaks: 5, sag: 0.32, col: 0.52, taper: [0.25, 0.16], steep: 'N',
      pts: [[0.486, 0.238], [0.526, 0.223], [0.566, 0.214], [0.604, 0.222], [0.640, 0.240]] },
    { key: 'arc_east', name: 'eastern arc', kind: 'belt', h: 0.75, w: 0.040, peaks: 6, sag: 0.32, col: 0.48, taper: [0.18, 0.0], steep: 'N',
      pts: [[0.682, 0.212], [0.724, 0.230], [0.770, 0.250], [0.818, 0.246], [0.866, 0.232], [0.912, 0.226], [0.950, 0.231], [0.990, 0.240]] },
    { key: 'buttress_high', name: 'high arc buttress', kind: 'spur', h: 0.66, w: 0.018, peaks: 3, sag: 0.35, col: 0, taper: [0.0, 0.45], steep: 'E',
      pts: [[0.410, 0.244], [0.418, 0.276], [0.414, 0.306], [0.426, 0.334]] },
    { key: 'buttress_mid', name: 'middle arc buttress', kind: 'spur', h: 0.58, w: 0.016, peaks: 2, sag: 0.35, col: 0, taper: [0.0, 0.5], steep: 'W',
      pts: [[0.548, 0.226], [0.540, 0.256], [0.546, 0.284]] },
    { key: 'buttress_east', name: 'eastern arc buttress', kind: 'spur', h: 0.60, w: 0.020, peaks: 3, sag: 0.35, col: 0, taper: [0.0, 0.45], steep: 'E',
      pts: [[0.770, 0.252], [0.760, 0.282], [0.746, 0.308], [0.738, 0.334]] },
    { key: 'buttress_east_b', name: 'eastern arc buttress', kind: 'spur', h: 0.55, w: 0.014, peaks: 2, sag: 0.35, col: 0, taper: [0.0, 0.5], steep: 'W',
      pts: [[0.858, 0.238], [0.852, 0.254], [0.846, 0.268]] },
    { key: 'buttress_east_c', name: 'eastern arc buttress', kind: 'spur', h: 0.56, w: 0.016, peaks: 2, sag: 0.35, col: 0, taper: [0.0, 0.5], steep: 'E',
      pts: [[0.700, 0.222], [0.708, 0.244], [0.714, 0.264]] },
    { key: 'spur_still_water', name: 'Still Water ridge', kind: 'spur', h: 0.62, w: 0.020, peaks: 6, sag: 0.35, col: 0, taper: [0.0, 0.32], steep: 'E',
      pts: [[0.124, 0.212], [0.120, 0.262], [0.114, 0.312], [0.110, 0.360], [0.106, 0.400], [0.104, 0.432]] },
    { key: 'fjord_highland', name: 'fjord highland', kind: 'spur', h: 0.50, w: 0.026, peaks: 6, sag: 0.40, col: 0, taper: [0.10, 0.25], steep: 'W',
      pts: [[0.084, 0.232], [0.080, 0.280], [0.083, 0.330], [0.078, 0.380], [0.082, 0.430], [0.078, 0.462]] },
    { key: 'fjord_ridge_a', name: 'fjord headland', kind: 'spur', h: 0.52, w: 0.014, peaks: 3, sag: 0.30, col: 0, taper: [0.0, 0.25], steep: 'S',
      pts: [[0.092, 0.304], [0.068, 0.306], [0.044, 0.312], [0.020, 0.316]] },
    { key: 'fjord_ridge_b', name: 'fjord headland', kind: 'spur', h: 0.44, w: 0.010, peaks: 2, sag: 0.30, col: 0, taper: [0.0, 0.30], steep: 'N',
      pts: [[0.074, 0.386], [0.050, 0.376], [0.022, 0.372]] },
    { key: 'fjord_ridge_c', name: 'fjord headland', kind: 'spur', h: 0.47, w: 0.011, peaks: 2, sag: 0.30, col: 0, taper: [0.0, 0.30], steep: 'S',
      pts: [[0.092, 0.408], [0.066, 0.414], [0.040, 0.420], [0.022, 0.426]] },
    { key: 'fjord_ridge_d', name: 'fjord headland', kind: 'spur', h: 0.38, w: 0.012, peaks: 2, sag: 0.35, col: 0, taper: [0.0, 0.40], steep: 'N',
      pts: [[0.096, 0.466], [0.074, 0.470], [0.056, 0.476]] },
    { key: 'spur_still_water_e', name: 'hills east of Still Water', kind: 'spur', h: 0.46, w: 0.020, peaks: 4, sag: 0.40, col: 0, taper: [0.0, 0.40], steep: 'W',
      pts: [[0.172, 0.214], [0.180, 0.262], [0.184, 0.310], [0.176, 0.360]] },
    { key: 'alp_divide', name: 'alpine divide', kind: 'alpine', h: 0.90, w: 0.040, peaks: 7, sag: 0.33, col: 0, taper: [0.18, 0.22], steep: 'N',
      pts: [[0.075, 0.800], [0.115, 0.772], [0.165, 0.756], [0.215, 0.768], [0.262, 0.752], [0.310, 0.758], [0.355, 0.782], [0.378, 0.810]] },
    { key: 'alp_west', name: 'western alps', kind: 'alpine', h: 0.80, w: 0.030, peaks: 4, sag: 0.35, col: 0, taper: [0.0, 0.14], steep: 'W',
      pts: [[0.120, 0.776], [0.104, 0.808], [0.094, 0.846], [0.076, 0.880], [0.062, 0.915], [0.050, 0.946], [0.046, 0.970]] },
    { key: 'alp_cape', name: 'headland ridge', kind: 'alpine', h: 0.76, w: 0.026, peaks: 4, sag: 0.34, col: 0, taper: [0.0, 0.0], steep: 'N',
      pts: [[0.112, 0.776], [0.080, 0.786], [0.046, 0.786], [0.012, 0.794], [-0.018, 0.796], [-0.046, 0.799]] },
    { key: 'alp_west_spur', name: 'headland spur', kind: 'alpine', h: 0.62, w: 0.020, peaks: 2, sag: 0.4, col: 0, taper: [0.0, 0.45], steep: 'S',
      pts: [[0.094, 0.846], [0.068, 0.858], [0.046, 0.866]] },
    { key: 'alp_mid', name: 'middle alps', kind: 'alpine', h: 0.86, w: 0.032, peaks: 5, sag: 0.35, col: 0, taper: [0.0, 0.28], steep: 'E',
      pts: [[0.215, 0.768], [0.205, 0.800], [0.214, 0.832], [0.200, 0.862], [0.185, 0.895], [0.194, 0.930], [0.182, 0.962], [0.190, 0.990]] },
    { key: 'alp_mid_spur', name: 'middle spur', kind: 'alpine', h: 0.66, w: 0.020, peaks: 2, sag: 0.4, col: 0, taper: [0.0, 0.5], steep: 'S',
      pts: [[0.214, 0.832], [0.236, 0.846], [0.248, 0.866]] },
    { key: 'alp_east', name: 'eastern alps', kind: 'alpine', h: 0.80, w: 0.030, peaks: 5, sag: 0.35, col: 0, taper: [0.0, 0.32], steep: 'E',
      pts: [[0.310, 0.758], [0.330, 0.792], [0.326, 0.830], [0.342, 0.866], [0.336, 0.905], [0.348, 0.938], [0.338, 0.966]] },
    { key: 'alp_east_spur', name: 'eastern spur', kind: 'alpine', h: 0.60, w: 0.022, peaks: 3, sag: 0.4, col: 0, taper: [0.0, 0.5], steep: 'S',
      pts: [[0.336, 0.842], [0.366, 0.852], [0.392, 0.872]] },
    { key: 'alp_north_spur', name: 'northern spur', kind: 'alpine', h: 0.58, w: 0.022, peaks: 2, sag: 0.4, col: 0, taper: [0.0, 0.5], steep: 'W',
      pts: [[0.262, 0.752], [0.250, 0.722], [0.262, 0.696]] }
  ],
  // low hill lines in the lowland (downs, wolds): h = crest height, w = half width. They give the plains structure.
  hills: [
    // the spur at u 0.56: broad hills between the Reach and the eastern kingdom; the border river rises at its foot
    { key: 'border_hills', h: 0.43, w: 0.032, pts: [[0.588, 0.232], [0.602, 0.272], [0.596, 0.314]] },
    { key: 'border_hills_s', h: 0.38, w: 0.030, pts: [[0.608, 0.352], [0.598, 0.392], [0.618, 0.438]] },
    { key: 'foothills_high', h: 0.385, w: 0.020, pts: [[0.336, 0.296], [0.360, 0.318], [0.386, 0.312]] },
    { key: 'foothills_high_e', h: 0.37, w: 0.018, pts: [[0.448, 0.318], [0.474, 0.330], [0.500, 0.322]] },
    { key: 'foothills_east_w', h: 0.35, w: 0.014, pts: [[0.718, 0.300], [0.738, 0.290], [0.756, 0.296]] },
    { key: 'downs_reach_n', h: 0.36, w: 0.024, pts: [[0.372, 0.420], [0.394, 0.456], [0.384, 0.500]] },
    { key: 'downs_reach_s', h: 0.35, w: 0.024, pts: [[0.286, 0.560], [0.268, 0.600], [0.290, 0.642]] },
    { key: 'downs_reach_w', h: 0.34, w: 0.022, pts: [[0.196, 0.420], [0.214, 0.470], [0.236, 0.520]] },
    { key: 'downs_east_n', h: 0.35, w: 0.026, pts: [[0.640, 0.398], [0.668, 0.436], [0.660, 0.486]] },
    { key: 'downs_east_s', h: 0.34, w: 0.026, pts: [[0.648, 0.548], [0.672, 0.592], [0.666, 0.640]] },
    { key: 'wolds_east', h: 0.34, w: 0.026, pts: [[0.818, 0.428], [0.848, 0.452], [0.838, 0.498]] },
    { key: 'wolds_east_s', h: 0.33, w: 0.024, pts: [[0.768, 0.560], [0.794, 0.590], [0.812, 0.626]] },
    // low hills and knolls in the eastern lowlands (the woods keep to their tops)
    { key: 'hills_east_mid', h: 0.335, w: 0.018, pts: [[0.716, 0.352], [0.742, 0.372], [0.770, 0.364]] },
    { key: 'hills_east_coast', h: 0.325, w: 0.016, pts: [[0.828, 0.532], [0.840, 0.562], [0.834, 0.594]] },
    { key: 'knoll_city_n', h: 0.315, w: 0.013, pts: [[0.772, 0.438], [0.792, 0.452]] },
    { key: 'knolls_east_s', h: 0.325, w: 0.015, pts: [[0.700, 0.598], [0.724, 0.614], [0.742, 0.640]] },
    { key: 'knoll_battlefield_w', h: 0.33, w: 0.014, pts: [[0.800, 0.300], [0.812, 0.330]] },
    // the spine of the south-east peninsula: low downs running out to its tip
    { key: 'peninsula_spine', h: 0.35, w: 0.030, pts: [[0.884, 0.858], [0.920, 0.878], [0.956, 0.900], [0.990, 0.928], [1.016, 0.962]] },
    { key: 'downs_south', h: 0.37, w: 0.028, pts: [[0.652, 0.738], [0.700, 0.702], [0.760, 0.682], [0.818, 0.692]] },
    { key: 'hills_north', h: 0.33, w: 0.022, pts: [[0.540, 0.090], [0.566, 0.120], [0.580, 0.158]] },
    { key: 'hills_north_e', h: 0.31, w: 0.022, pts: [[0.700, 0.150], [0.730, 0.164], [0.760, 0.156]] }
  ],
  // lone cones: [u, v], h = summit, r = foot radius, crater = crater radius (0 = none)
  cones: [
    { key: 'fire_dragon_1', name: 'Fire-Dragon Peaks', at: [0.712, 0.792], h: 0.70, r: 0.032, crater: 0.006 },
    { key: 'fire_dragon_2', name: 'Fire-Dragon Peaks', at: [0.682, 0.808], h: 0.55, r: 0.024, crater: 0 },
    { key: 'fire_dragon_3', name: 'Fire-Dragon Peaks', at: [0.740, 0.776], h: 0.60, r: 0.026, crater: 0.004 },
    { key: 'fire_dragon_4', name: 'Fire-Dragon Peaks', at: [0.758, 0.802], h: 0.52, r: 0.021, crater: 0 },
    { key: 'fire_dragon_5', name: 'Fire-Dragon Peaks', at: [0.700, 0.828], h: 0.47, r: 0.019, crater: 0 },
    { key: 'fire_dragon_6', name: 'Fire-Dragon Peaks', at: [0.731, 0.817], h: 0.50, r: 0.019, crater: 0.003 },
    { key: 'buried_machine', name: 'Mount of the Buried Machine', at: [0.860, 0.740], h: 0.80, r: 0.042, crater: 0 },
    // the two arc ends stand in the sea as mountain capes (no way round them along the shore)
    { key: 'cape_west', name: 'western cape', at: [0.047, 0.229], h: 0.70, r: 0.030, crater: 0 },
    { key: 'cape_east', name: 'eastern cape', at: [0.951, 0.231], h: 0.68, r: 0.028, crater: 0 }
  ],
  // the alpine massif: its footprint is lifted so the valleys between the ridges sit high
  massif: { lift: 0.10, poly: [[-0.070, 0.780], [0.040, 0.750], [0.150, 0.694], [0.260, 0.692], [0.380, 0.722], [0.392, 0.800],
    [0.372, 0.930], [0.300, 0.995], [0.150, 1.012], [0.050, 0.990], [-0.010, 0.880], [-0.070, 0.830]] },
  // the only two low ways through the northern ranges. Points run north to south; col = the height of the
  // highest point of the way (at point colAt); ends = heights of the ground at the two ends.
  passes: [
    { key: 'mountain_path', name: 'the mountain path', col: 0.40, colAt: 3, ends: [0.27, 0.31], w: 0.011,
      pts: [[0.262, 0.168], [0.270, 0.194], [0.287, 0.212], [0.299, 0.236], [0.294, 0.262], [0.311, 0.288], [0.305, 0.316], [0.300, 0.345]] },
    { key: 'east_gap', name: 'the low gap', col: 0.34, colAt: 2, ends: [0.26, 0.27], w: 0.015,
      pts: [[0.655, 0.176], [0.659, 0.208], [0.662, 0.236], [0.668, 0.266], [0.664, 0.300], [0.672, 0.336]] }
  ],
  // the watershed of the ranges: north of it lie the Northern Lands
  beltAxis: [[0.00, 0.236], [0.10, 0.210], [0.145, 0.204], [0.195, 0.212], [0.240, 0.228], [0.290, 0.236], [0.345, 0.218],
    [0.392, 0.236], [0.438, 0.256], [0.470, 0.262], [0.500, 0.232], [0.528, 0.222], [0.568, 0.214], [0.606, 0.222], [0.642, 0.240],
    [0.662, 0.238], [0.682, 0.212], [0.724, 0.230], [0.770, 0.250], [0.818, 0.246], [0.866, 0.232], [0.912, 0.226], [1.00, 0.236]],

  // ---- LOWLANDS ---------------------------------------------------------------------------
  // regional ground: inland = height above the sea far from the coast, hills = rolling-hill amplitude,
  // K = how easily rivers cut it (1 = mountains), kd = soil creep, uplift = relative rock uplift of the ground
  // (the mountains add their designed mass on top).
  regionGround: {
    northern_lands: { inland: 0.060, hills: 0.040, K: 0.300, kd: 1.0, uplift: 0.050 },
    northern_ranges: { inland: 0.090, hills: 0.030, K: 1.00, kd: 0.4, uplift: 0.080 },
    reach_interior: { inland: 0.085, hills: 0.060, K: 0.300, kd: 1.0, uplift: 0.070 },
    wheat_country: { inland: 0.040, hills: 0.004, K: 0.020, kd: 1.0, uplift: 0.0 },
    green_valleys: { inland: 0.090, hills: 0.040, K: 1.00, kd: 0.4, uplift: 0.090 },
    toad_swamp: { inland: 0.006, hills: 0.002, K: 0.010, kd: 1.0, uplift: 0.0 },
    eastern_kingdom: { inland: 0.070, hills: 0.068, K: 0.280, kd: 1.0, uplift: 0.060 },
    mage_kingdoms: { inland: 0.085, hills: 0.055, K: 0.320, kd: 0.8, uplift: 0.070 },
    silent_battlefield: { inland: 0.040, hills: 0.022, K: 0.060, kd: 1.0, uplift: 0.0 },
    artifact_isles: { inland: 0.060, hills: 0.030, K: 0.150, kd: 0.8, uplift: 0.05 }
  },
  // the wheat country: a flat plain falling gently from north (top) to south (bottom) and toward the border river
  wheat: { top: 0.262, bottom: 0.232, feather: 0.040,
    // poly = the wheat country (region and wheat cover, west of the border river), with a lobed west edge along the downs;
    // floor = the flattened plain floor: it runs on past the border river, so the river is the plain's low axis
    floor: [[0.430, 0.462], [0.462, 0.452], [0.490, 0.466], [0.520, 0.458], [0.560, 0.468], [0.598, 0.500], [0.606, 0.560],
      [0.600, 0.640], [0.604, 0.720], [0.590, 0.780], [0.560, 0.800], [0.524, 0.792], [0.488, 0.778], [0.462, 0.790], [0.436, 0.766],
      [0.422, 0.736], [0.430, 0.706], [0.404, 0.684], [0.392, 0.650], [0.418, 0.620], [0.414, 0.590], [0.392, 0.562], [0.400, 0.528],
      [0.424, 0.500], [0.408, 0.478]],
    poly: [[0.430, 0.462], [0.462, 0.452], [0.490, 0.466], [0.520, 0.458], [0.546, 0.470], [0.558, 0.520], [0.554, 0.600], [0.558, 0.680],
      [0.550, 0.760], [0.524, 0.792], [0.488, 0.778], [0.462, 0.790], [0.436, 0.766], [0.422, 0.736], [0.430, 0.706], [0.404, 0.684],
      [0.392, 0.650], [0.418, 0.620], [0.414, 0.590], [0.392, 0.562], [0.400, 0.528], [0.424, 0.500], [0.408, 0.478]] },
  battlefield: { level: 0.240, feather: 0.030,
    poly: [[0.850, 0.282], [0.872, 0.270], [0.896, 0.277], [0.916, 0.270], [0.930, 0.292], [0.928, 0.318], [0.942, 0.344], [0.934, 0.372],
      [0.914, 0.394], [0.888, 0.388], [0.866, 0.402], [0.846, 0.384], [0.850, 0.356], [0.836, 0.330], [0.846, 0.306]] },
  swamp: { u: 0.452, v: 0.868, ru: 0.050, rv: 0.026, axis: 18, level: 0.204 },
  // the line between the eastern kingdom (north) and the Mage Kingdoms (south)
  southLine: [[0.58, 0.700], [0.66, 0.705], [0.74, 0.690], [0.82, 0.684], [0.90, 0.700], [1.00, 0.700]],

  // ---- WATER ------------------------------------------------------------------------------
  // river guide lines, source first, the last point at the sea, a lake or another river. Each guide cuts a
  // valley whose bed falls all the way (the real river is whatever the eroded flow then does).
  // src = height of the bed at the spring, depth = how far the bed sinks below the ground, floor = half width of the
  // valley floor, wall = how fast the valley sides rise (height per u), meander = how far the line swings
  // (u), wave = length of one swing.
  rivers: [
    { key: 'still_water_outflow', name: "Still Water's outflow", named: true, src: 0.222, depth: 0.010, floor: 0.002, wall: 3.0, meander: 0.000, wave: 0.050,
      pts: [[0.131, 0.408], [0.125, 0.414], [0.118, 0.417], [0.110, 0.419]] },
    { key: 'still_water_inflow', name: 'stream into Still Water', named: false, src: 0.42, depth: 0.030, floor: 0.002, wall: 4.0, meander: 0.002, wave: 0.040,
      pts: [[0.150, 0.236], [0.152, 0.268], [0.152, 0.298]] },
    { key: 'reach_river', name: 'the Reach river', named: true, src: 0.34, depth: 0.016, floor: 0.004, wall: 1.6, meander: 0.013, wave: 0.075,
      pts: [[0.312, 0.335], [0.296, 0.372], [0.280, 0.410], [0.264, 0.450], [0.256, 0.492], [0.244, 0.532], [0.236, 0.566],
        [0.224, 0.596], [0.212, 0.616]] },
    { key: 'border_river', name: 'the border river', named: true, src: 0.44, depth: 0.032, floor: 0.004, wall: 2.0, meander: 0.016, wave: 0.080, meanderGrow: [0.45, 1.7],
      pts: [[0.560, 0.300], [0.574, 0.350], [0.566, 0.405], [0.580, 0.460], [0.572, 0.520], [0.582, 0.585], [0.570, 0.650],
        [0.578, 0.715], [0.566, 0.780], [0.554, 0.835], [0.544, 0.872]] },
    { key: 'east_river', name: "the eastern kingdom's river", named: true, src: 0.42, depth: 0.016, floor: 0.004, wall: 1.6, meander: 0.011, wave: 0.070,
      pts: [[0.702, 0.296], [0.708, 0.350], [0.722, 0.400], [0.734, 0.450], [0.742, 0.495], [0.770, 0.512], [0.810, 0.508],
        [0.828, 0.505], [0.842, 0.496], [0.852, 0.490]] },
    { key: 'alpine_river', name: 'the alpine valley river', named: true, src: 0.56, depth: 0.060, floor: 0.004, floorEnd: 0.014, wall: 3.6, meander: 0.006, wave: 0.050,
      pts: [[0.272, 0.772], [0.284, 0.800], [0.270, 0.830], [0.275, 0.862], [0.262, 0.895], [0.274, 0.928], [0.266, 0.958], [0.266, 0.982]] },
    { key: 'west_valley_river', name: 'west valley stream', named: false, src: 0.56, depth: 0.060, floor: 0.004, floorEnd: 0.012, wall: 3.6, meander: 0.006, wave: 0.050,
      pts: [[0.160, 0.778], [0.150, 0.805], [0.162, 0.835], [0.160, 0.865], [0.171, 0.900], [0.156, 0.935], [0.166, 0.970], [0.164, 0.996]] },
    { key: 'north_lake_outflow', name: 'alpine lake outflow', named: false, src: 0.36, depth: 0.030, floor: 0.002, wall: 3.0, meander: 0.004, wave: 0.050,
      pts: [[0.198, 0.728], [0.170, 0.712], [0.146, 0.706], [0.126, 0.696], [0.112, 0.684]] },
    { key: 'storm_stream_w', name: 'storm valley stream', named: false, src: 0.40, depth: 0.050, floor: 0.004, wall: 3.0, meander: 0.006, wave: 0.050,
      pts: [[0.468, 0.228], [0.476, 0.196], [0.480, 0.160], [0.484, 0.118]] },
    { key: 'storm_stream_e', name: 'storm valley stream', named: false, src: 0.40, depth: 0.050, floor: 0.004, wall: 3.0, meander: 0.006, wave: 0.050,
      pts: [[0.792, 0.222], [0.784, 0.186], [0.780, 0.150], [0.776, 0.128]] },
    { key: 'swamp_stream', name: 'stream to the swamp', named: false, src: 0.232, depth: 0.014, floor: 0.002, wall: 1.2, meander: 0.006, wave: 0.050,
      pts: [[0.430, 0.740], [0.438, 0.800], [0.450, 0.846], [0.474, 0.874], [0.500, 0.892], [0.516, 0.902]] },
    { key: 'gulf_stream', name: 'stream to the gulf', named: false, src: 0.33, depth: 0.014, floor: 0.002, wall: 1.6, meander: 0.007, wave: 0.060,
      pts: [[0.660, 0.740], [0.640, 0.800], [0.622, 0.850], [0.600, 0.890], [0.584, 0.905]] }
  ],
  // lakes: a centre line, half widths per point, and depth of the basin. level = the surface (null: the
  // lake fills to whatever its basin spills at).
  lakes: [
    { key: 'still_water', name: 'Still Water', rank: 'major', level: 0.222, depth: 0.040, shore: 0.32,
      pts: [[0.157, 0.290], [0.155, 0.305], [0.147, 0.318], [0.138, 0.330], [0.138, 0.346], [0.145, 0.360], [0.146, 0.376],
        [0.139, 0.390], [0.132, 0.406]],
      hw: [0.0044, 0.0084, 0.0064, 0.0100, 0.0122, 0.0088, 0.0134, 0.0094, 0.0045] },
    { key: 'alpine_lake_west', name: 'alpine lake', rank: 'minor', level: null, depth: 0.030, shore: 0.25,
      pts: [[0.159, 0.828], [0.162, 0.848], [0.160, 0.868]], hw: [0.004, 0.008, 0.004] },
    { key: 'alpine_lake_east', name: 'alpine lake', rank: 'minor', level: null, depth: 0.030, shore: 0.25,
      pts: [[0.274, 0.842], [0.272, 0.862], [0.270, 0.880]], hw: [0.004, 0.007, 0.004] },
    { key: 'alpine_lake_north', name: 'alpine lake', rank: 'minor', level: null, depth: 0.025, shore: 0.25,
      pts: [[0.194, 0.722], [0.172, 0.712], [0.150, 0.709]], hw: [0.004, 0.008, 0.004] }
  ],

  // ---- PLACES -----------------------------------------------------------------------------
  // castles stand each on its own hill (hill = height of the hill, r = its radius)
  castles: [
    { key: 'castle_order', name: 'Castle of the Order', u: 0.360, v: 0.620, variant: 0, hill: 0.060, r: 0.020, rank: 'major' },
    { key: 'castle_1', name: 'unnamed castle', u: 0.220, v: 0.430, variant: 1, hill: 0.050, r: 0.014, note: 'downs west of the Reach river' },
    { key: 'castle_2', name: 'unnamed castle', u: 0.084, v: 0.500, variant: 2, hill: 0.040, r: 0.011, note: 'sea cliff at the mouth of the western bay' },
    { key: 'castle_3', name: 'unnamed castle', u: 0.400, v: 0.386, variant: 3, hill: 0.045, r: 0.014, note: 'a knoll below the foothills of the high arc' },
    { key: 'castle_4', name: 'unnamed castle', u: 0.292, v: 0.836, variant: 4, hill: 0.035, r: 0.010, note: 'green valleys: a crag over the alpine river' },
    { key: 'castle_5', name: 'unnamed castle', u: 0.150, v: 0.692, variant: 5, hill: 0.040, r: 0.012, note: 'over the south shore of the western bay' },
    { key: 'castle_6', name: 'unnamed castle', u: 0.528, v: 0.600, variant: 6, hill: 0.018, r: 0.020, note: 'lone hill over the wheat, watching the border river' },
    { key: 'castle_7', name: 'unnamed castle', u: 0.180, v: 0.884, variant: 7, hill: 0.035, r: 0.010, note: 'green valleys: where the western valley opens' },
    { key: 'castle_8', name: 'unnamed castle', u: 0.395, v: 0.905, variant: 8, hill: 0.040, r: 0.012, note: 'south coast, between the alps and the swamp' }
  ],
  // every other place. bump = a small rise of the ground (rocks, knolls); r = footprint radius.
  places: [
    { key: 'still_water', name: 'Still Water', kind: 'lake', u: 0.142, v: 0.360, rank: 'major' },
    { key: 'starbloom_fields', name: 'Starbloom Fields', kind: 'flower_field', u: 0.300, v: 0.360, r: 0.030, rank: 'minor',
      note: 'name coined for the map, not in the lore (the bible has "Colossal Starblooms")' },
    { key: 'forest_of_eyes', name: 'Forest of Eyes', kind: 'dark_forest', u: 0.166, v: 0.506, r: 0.050, stretch: 1.7, axis: 36, rank: 'major' },
    { key: 'colossal_spires', name: 'Colossal Spires', kind: 'spires', u: 0.340, v: 0.520, r: 0.010, bump: 0.030, rank: 'major' },
    { key: 'stone_hands', name: 'Stone Hands', kind: 'stone_hands', u: 0.460, v: 0.420, r: 0.008, bump: 0.020, rank: 'major' },
    { key: 'windmill_n', name: 'windmill', kind: 'windmill', u: 0.470, v: 0.560, rank: 'minor' },
    { key: 'windmill_s', name: 'windmill', kind: 'windmill', u: 0.500, v: 0.680, rank: 'minor' },
    { key: 'standing_stone_1', name: 'standing stone', kind: 'standing_stone', u: 0.440, v: 0.505, rank: 'minor', note: 'from world-map v1' },
    { key: 'standing_stone_2', name: 'standing stone', kind: 'standing_stone', u: 0.523, v: 0.648, rank: 'minor', note: 'from world-map v1' },
    { key: 'standing_stone_3', name: 'standing stone', kind: 'standing_stone', u: 0.452, v: 0.725, rank: 'minor', note: 'from world-map v1' },
    { key: 'wheat_country', name: 'the wheat country', kind: 'area', u: 0.480, v: 0.620, r: 0.080, rank: 'major' },
    { key: 'green_valleys', name: 'the green valleys', kind: 'area', u: 0.215, v: 0.830, r: 0.140, rank: 'major' },
    { key: 'cavern_of_giants', name: 'Cavern of Giants', kind: 'cavern', u: 0.300, v: 0.800, rank: 'minor' },
    { key: 'toad_swamp', name: 'Toad Swamp', kind: 'swamp', u: 0.440, v: 0.860, r: 0.045, rank: 'minor', note: 'name not locked' },
    { key: 'border_delta', name: 'the border river delta', kind: 'delta', u: 0.543, v: 0.880, rank: 'minor' },
    { key: 'eastern_city', name: 'city of towers and domes', kind: 'city', u: 0.740, v: 0.500, r: 0.020, bump: 0.012, rank: 'major', note: 'every window lit; unnamed in the lore' },
    { key: 'east_estuary', name: 'the estuary', kind: 'estuary', u: 0.872, v: 0.495, rank: 'minor' },
    { key: 'fire_dragon_peaks', name: 'Fire-Dragon Peaks', kind: 'volcano', u: 0.720, v: 0.800, r: 0.060, rank: 'major', note: 'name coined for the map, not in the lore' },
    { key: 'buried_machine', name: 'Mount of the Buried Machine', kind: 'lone_mountain', u: 0.860, v: 0.740, r: 0.042, rank: 'major',
      note: 'name coined for the map, not in the lore (the bible has "the machine under the southern mountain")' },
    { key: 'mage_tower_1', name: 'mage tower', kind: 'mage_tower', u: 0.668, v: 0.852, rank: 'minor', variant: 0, note: 'studio proposal' },
    { key: 'mage_tower_2', name: 'mage tower', kind: 'mage_tower', u: 0.812, v: 0.864, rank: 'minor', variant: 1, note: 'studio proposal' },
    { key: 'silent_battlefield', name: 'Silent Battlefield', kind: 'battlefield', u: 0.895, v: 0.335, r: 0.060, rank: 'major' },
    { key: 'clockwork_tower_1', name: 'clockwork tower', kind: 'clockwork_tower', u: 0.872, v: 0.312, rank: 'minor', variant: 0 },
    { key: 'clockwork_tower_2', name: 'clockwork tower', kind: 'clockwork_tower', u: 0.920, v: 0.338, rank: 'minor', variant: 1 },
    { key: 'clockwork_tower_3', name: 'clockwork tower', kind: 'clockwork_tower', u: 0.893, v: 0.374, rank: 'minor', variant: 2 },
    { key: 'wreckage_1', name: 'old wreckage', kind: 'wreckage', u: 0.900, v: 0.322, rank: 'minor' },
    { key: 'wreckage_2', name: 'old wreckage', kind: 'wreckage', u: 0.930, v: 0.306, rank: 'minor' },
    { key: 'wreckage_3', name: 'old wreckage', kind: 'wreckage', u: 0.884, v: 0.352, rank: 'minor' },
    { key: 'crystal_grove_w', name: 'sacred-tree grove', kind: 'crystal_grove', u: 0.226, v: 0.160, r: 0.020, rank: 'minor' },
    { key: 'crystal_grove_e', name: 'sacred-tree grove', kind: 'crystal_grove', u: 0.606, v: 0.090, r: 0.022, rank: 'minor' },
    { key: 'storm_valley_w', name: 'storm valley', kind: 'storm_valley', u: 0.480, v: 0.170, r: 0.030, rank: 'minor' },
    { key: 'storm_valley_e', name: 'storm valley', kind: 'storm_valley', u: 0.780, v: 0.160, r: 0.030, rank: 'minor' },
    { key: 'north_isles', name: 'island chain', kind: 'isles', u: 0.706, v: 0.000, rank: 'minor', note: 'unnamed' },
    { key: 'artifact_isles', name: 'Artifact Isles', kind: 'isles', u: 1.080, v: 1.032, r: 0.035, rank: 'major',
      note: 'pirates; name coined for the map, not in the lore' }
  ],

  // ---- TEXT ------------------------------------------------------------------------------
  // region labels: centre of the text (u, v) and the box it may use (extentU x extentV)
  labels: [
    { key: 'verdant_reach', text: 'THE VERDANT REACH', rank: 'major', u: 0.270, v: 0.470, extentU: 0.300, extentV: 0.034 },
    { key: 'eastern_kingdom', text: 'THE EASTERN KINGDOM', rank: 'major', u: 0.770, v: 0.600, extentU: 0.260, extentV: 0.034 },
    { key: 'mage_kingdoms', text: 'THE MAGE KINGDOMS', rank: 'major', u: 0.700, v: 0.870, extentU: 0.220, extentV: 0.030 },
    { key: 'northern_lands', text: 'THE NORTHERN LANDS', rank: 'major', u: 0.600, v: 0.120, extentU: 0.240, extentV: 0.026 },
    { key: 'northern_ranges', text: 'THE GREAT NORTHERN RANGES', rank: 'major', u: 0.400, v: 0.255, extentU: 0.300, extentV: 0.022, curve: 'follows beltAxis' },
    { key: 'wheat_country', text: 'the wheat country', rank: 'minor', u: 0.478, v: 0.640, extentU: 0.100, extentV: 0.018 },
    { key: 'green_valleys', text: 'the green valleys', rank: 'minor', u: 0.215, v: 0.700, extentU: 0.120, extentV: 0.018 },
    { key: 'silent_battlefield', text: 'Silent Battlefield', rank: 'minor', u: 0.893, v: 0.415, extentU: 0.090, extentV: 0.016 },
    { key: 'artifact_isles', text: 'Artifact Isles', rank: 'minor', u: 1.040, v: 1.085, extentU: 0.080, extentV: 0.016 },
    { key: 'still_water', text: 'Still Water', rank: 'minor', u: 0.190, v: 0.385, extentU: 0.070, extentV: 0.016 },
    { key: 'forest_of_eyes', text: 'Forest of Eyes', rank: 'minor', u: 0.166, v: 0.506, extentU: 0.090, extentV: 0.016 }
  ],
  // sea labels, in MAP coordinates (the open sea round the land exists only on the map)
  seaLabels: [
    { key: 'unknown_sea', text: 'THE UNKNOWN SEA', rank: 'major', u: 0.360, v: 0.060, extentU: 0.260, extentV: 0.026 },
    { key: 'western_sea', text: 'THE WESTERN SEA', rank: 'major', u: 0.050, v: 0.560, extentU: 0.026, extentV: 0.240, vertical: true },
    { key: 'eastern_sea', text: 'THE EASTERN SEA', rank: 'major', u: 0.955, v: 0.600, extentU: 0.026, extentV: 0.200, vertical: true },
    { key: 'southern_sea', text: 'THE SOUTHERN SEA', rank: 'major', u: 0.400, v: 0.950, extentU: 0.200, extentV: 0.020 }
  ]
};

// REGIONS keep the ids and keys of world-map v1 so the two data sets line up.
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

// Erosion and build settings (tuning, not lore).
const PARAMS = {
  N: 2048,                 // final grid
  NE: 1024,                // grid of the big stream-power erosion
  spl: { iters: 160, mode: 'uplift', K: 0.20, m: 0.40, U: 0.014, R: 0.05, kd: 0.18, routing: 'rho8', p: 3, remapRadius: 0.035 },
  splFine: { iters: 14, K: 0.012, m: 0.5, R: 0.30, kd: 0.0, routing: 'rho8', p: 3 },
  droplets: { count: 700000, radius: 2, inertia: 0.08, capacity: 6, minCapacity: 0.0005, erodeRate: 0.35,
    depositRate: 0.25, evaporate: 0.025, gravity: 6, maxLife: 80, initSpeed: 1, zScale: 3.0 },
  snowLine: { north: 0.525, south: 0.61 },  // snow line at design v = 0.2 and v = 0.9 (lowered: the 0.70 frame erodes peaks a little lower)
  treeLine: 0.52
};

// ---- FRAME -----------------------------------------------------------------------------------
// map = map centre + (design - design centre) * scale. Lengths scale by 'scale', slopes (river walls) by 1 / scale.
// The build evaluates its noise in design scale too (see build_terrain.js), so the shapes keep their character.
// Sea labels are placed in map coordinates (seaLabels), because the open sea only exists on the map.
const FRAME = { scale: 0.70, design: [0.530, 0.522], map: [0.50, 0.50] };

function frameLayout(D, F) {
  const s = F.scale;
  const pu = (u) => F.map[0] + (u - F.design[0]) * s;
  const pv = (v) => F.map[1] + (v - F.design[1]) * s;
  const P = (p) => [pu(p[0]), pv(p[1])];
  const pts = (a) => a.map(P);
  const L = JSON.parse(JSON.stringify(D));
  L.outline = pts(L.outline);
  L.landBlobs = L.landBlobs.map(([u, v, ru, rv]) => [pu(u), pv(v), ru * s, rv * s]);
  for (const k of ['coastRough', 'coastCliff']) L[k].spots = L[k].spots.map(([u, v, r, val]) => [pu(u), pv(v), r * s, val]);
  L.coastWarp *= s; L.coastFray *= s;
  L.cuts.forEach((c) => { c.pts = pts(c.pts); c.w = c.w.map((x) => x * s); });
  L.islands = L.islands.map(([u, v, r, st, ax, top]) => [pu(u), pv(v), r * s, st, ax, top]);
  L.isles = [pu(L.isles[0]), pv(L.isles[1]), L.isles[2] * s];
  L.shelf.width *= s;
  L.crestWiggle.amp *= s;          // wave lengths stay: the meander noise runs on (arc / wave) in design scale
  L.ranges.forEach((r) => { r.pts = pts(r.pts); r.w *= s; });
  L.hills.forEach((h) => { h.pts = pts(h.pts); h.w *= s; });
  L.cones.forEach((c) => { c.at = P(c.at); c.r *= s; c.crater *= s; });
  L.massif.poly = pts(L.massif.poly);
  L.passes.forEach((p) => { p.pts = pts(p.pts); p.w *= s; });
  L.beltAxis = pts(L.beltAxis);
  L.wheat.poly = pts(L.wheat.poly); if (L.wheat.floor) L.wheat.floor = pts(L.wheat.floor); L.wheat.feather *= s;
  L.battlefield.poly = pts(L.battlefield.poly); L.battlefield.feather *= s;
  L.swamp.u = pu(L.swamp.u); L.swamp.v = pv(L.swamp.v); L.swamp.ru *= s; L.swamp.rv *= s;
  L.southLine = pts(L.southLine);
  L.rivers.forEach((r) => { r.pts = pts(r.pts); r.floor *= s; if (r.floorEnd) r.floorEnd *= s; r.wall /= s; r.meander *= s; });
  L.lakes.forEach((k) => { k.pts = pts(k.pts); k.hw = k.hw.map((x) => x * s); });
  L.castles.forEach((k) => { [k.u, k.v] = P([k.u, k.v]); k.r *= s; });
  L.places.forEach((p) => { [p.u, p.v] = P([p.u, p.v]); if (p.r) p.r *= s; });
  L.labels.forEach((l) => { [l.u, l.v] = P([l.u, l.v]); l.extentU *= s; l.extentV *= s; });
  L.labels = L.labels.concat(L.seaLabels || []);
  delete L.seaLabels;
  L.frame = { scale: s, design: F.design.slice(), map: F.map.slice() };
  return L;
}

// helpers for the build: design <-> map
function frameFns(L) {
  const F = L.frame, s = F.scale;
  return {
    S: s,
    fu: (u) => F.map[0] + (u - F.design[0]) * s, fv: (v) => F.map[1] + (v - F.design[1]) * s,
    du: (u) => F.design[0] + (u - F.map[0]) / s, dv: (v) => F.design[1] + (v - F.map[1]) / s
  };
}

const LAYOUT = frameLayout(DESIGN, FRAME);

module.exports = { LAYOUT, DESIGN, FRAME, REGIONS, PARAMS, SEA, frameFns };
