/* Hand-drawn sprites for the tilted relief atlas, typed as text rows (pixel-scenes rule 5: hands draw things).
   One character per pixel. '.' is empty. '#' is the body: render.js lights it from the scene's light (left edge = rim,
   top edge = soft rim, the rest dark) and casts its shadow to the south-east.
   Other characters are hand-placed detail, mapped to palette colours in render.js (STYLE.CH):
     w lit window   f banner   k black (gate, cave)   l pale stone   p petal / sail   o flower heart
     c crystal core (pale)   C crystal ice   b crystal body (blue)
   Storm clouds, eyes, embers, mill sails and lamps are drawn by render.js. */
(function () {
'use strict';
const A = {};

// the nine castles of the Reach, each a different silhouette. Index = POIS variant (0 = Castle of the Order).
A.castles = [
  [ // 0 the Castle of the Order: a tall keep under a cone roof and spire, a banner, a lower round tower each side, a gated wall
    // (polish 2: larger, lopsided, no crenellated band, so it reads as a castle, not a crown)
    '.......#.......',
    '.......#ff.....',
    '.......#f......',
    '......###......',
    '.....#####.....',
    '......#w#......',
    '......###......',
    '......###......',
    '..#...#w#......',
    '.###..###...#..',
    '#####.###..###.',
    '.#w#..###.#####',
    '.###.#####.#w#.',
    '.#############.',
    '.##w#######w##.',
    '######kkk######',
    '######kkk######',
  ],
  [ // 1 on the downs: a square keep with one tall corner tower
    '........#..',
    '.......###.',
    '.......#w#.',
    '#.#.#..###.',
    '#####..###.',
    '##w##.####.',
    '###########',
    '#w####w####',
    '#####k#####',
  ],
  [ // 2 the sea cliff: one round tower under a cone roof, a small hall at its foot
    '..#.....',
    '..#.....',
    '.###....',
    '#####...',
    '.###....',
    '.#w#....',
    '.###....',
    '.###.#.#',
    '.#######',
    '.###w###',
    '.#######',
  ],
  [ // 3 the knoll: a donjon under a steep pointed roof beside a low hall (polish 2: the twin towers read as '|=|')
    '....#....',
    '...###...',
    '..#####..',
    '...###...',
    '...#w#...',
    '...###...',
    '.#.###...',
    '####w####',
    '#########',
    '###k#####',
  ],
  [ // 4 the crag: stepped and lopsided, a thin watchtower on the high side
    '.......#.',
    '.......#.',
    '......###',
    '......#w#',
    '#.#...###',
    '###...###',
    '###.#.###',
    '#########',
    '#w#######',
    '#########',
  ],
  [ // 5 the headland: a slim beacon tower with a lit lantern room
    '...w...',
    '..###..',
    '...#...',
    '..###..',
    '..###..',
    '..#w#..',
    '..###..',
    '.#####.',
    '#######',
    '##w####',
    '#######',
  ],
  [ // 6 the lone hill over the wheat: a round tower under a dome, on a wide base (polish 2: taller, it read as a bunker)
    '...#...',
    '..###..',
    '.#####.',
    '.#w#w#.',
    '.#####.',
    '..###..',
    '.#####.',
    '#######',
    '##w#w##',
    '###k###',
  ],
  [ // 7 where the valleys meet: three spires, the middle one tallest
    '....#....',
    '....#....',
    '...###...',
    '.#.###...',
    '.#.#w#.#.',
    '###.#.###',
    '###.#.###',
    '#w#####w#',
    '#########',
    '####k####',
  ],
  [ // 8 the south coast: a ruin, the great tower broken off at a slant, a gapped wall
    '#........',
    '##.......',
    '###......',
    '#w#......',
    '###...#.#',
    '###.#.###',
    '#########',
  ],
];

// the Colossal Spires: three needle-thin ancient spires
A.spires = [
  '....#......',
  '....#......',
  '....#......',
  '....##.....',
  '....##.....',
  '....##...#.',
  '....##...#.',
  '.#..##...#.',
  '.#..##...##',
  '.#..##...##',
  '.##.##...##',
  '.##.##...##',
  '.##.###..##',
  '.##.###..##',
  '.##.###.###',
  '###.###.###',
  '###.###.###',
];

// the Stone Hands: one giant hand, fingers up (the second is its mirror)
A.hand = [
  '.#.#.#.',
  '.#.#.#.',
  '.#.#.##',
  '.######',
  '#.#####',
  '#######',
  '.######',
  '..####.',
  '..####.',
];

// the eastern city: a wide skyline of towers and domes, every window lit (polish round 1: taller and wider, reads at 1x)
A.city = [   // polish 2: the mages' city in pale stone: a great dome with a lantern spire, two small domes, slim towers, houses
             // stepping down its hill, windows lit at random. L lit stone, m stone, d shade, c cream tip, w window (no auto rim)
  '..................c..................',
  '.....c............L............c.....',
  '.....L............L............L.....',
  '.....L............L............L.....',
  '.....L............L............L.....',
  '.....L............L............L.....',
  '.....L............L............L.....',
  '....Lmd...........L............L.....',
  '....Lmd...........L............L.....',
  '....Lmd........LLLLLmw........Lmd....',
  '....Lwd.......LLLLLwmmw.......Lmd....',
  '....Lmd......LLLLLmmmmmw......Lmd....',
  '....Lmd...L.LLLLLLmmmmmdd..L..Lwd....',
  '....Lmd.LLmmLLLLLmmmmmdddLLmmdLmd.L..',
  '....Lmd.LLmmLLLLwmmmmddddLLmmdLmdLwd.',
  '....Lmd.LmmdLLLLmwmmmmdwddLLmmdLwdLmd',
  '....Lmd.LmmdLLwLmmmmwmmdddLLwmdLmdLmd',
  '....Lmd.LwmdLLLLmmmmmmwddLLmmwLwdLmd.',
  '.LLLLwdmLmmdLLLLmmmmmmdddLLmmdLmdLmd.',
  '.LLLLLmwmmmmmmmmmmmmmmmmmmmmmwmddLmd.',
  '..LLLLmmmmmmmmmmmmmmmwmmmmmmmmmdddd..',
  '....LLLLmmmmmmmmmmmmmmmmmmmmmdddd....',
  '.......LLLmmmmmmmmmmmmmmwmmwdd.......',
  '...........LLmmmmmmmmmmmdd...........',
  '...............Lmmmmmd...............',
]

// windmill: a tower with a cap; the sails are a two-frame sprite centred on the hub (the top-centre pixel of the body)
A.mill = [
  '.###.',
  '.###.',
  '.###.',
  '#####',
  '#####',
];
A.sails = [   // polish 2: two diagonal frames (the upright + frame read as a grave cross)
  ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  ['....#..', '....#..', '##.#...', '..###..', '...#.##', '..#....', '..#....'],
]

A.stone = ['.#', '##', '##', '##']

// the three clockwork towers of the Silent Battlefield. Index = POIS variant. Taller, each a different silhouette.
A.clockwork = [
  [ // a tall tower crowned by a great stopped gear
    '..#.#.#..',
    '.#######.',
    '##.#k#.##',
    '.###k###.',
    '##.###.##',
    '.#######.',
    '..#.#.#..',
    '...###...',
    '...###...',
    '...#k#...',
    '...###...',
    '...###...',
    '...###...',
    '..#####..',
    '.#######.',
  ],
  [ // broken off and leaning, its gear fallen at its foot
    '...##....',
    '...###...',
    '....##...',
    '...###...',
    '...###...',
    '..####...',
    '..#k##...',
    '..####.#.',
    '..#######',
    '.####.###',
    '#####.###',
  ],
  [ // a clock tower under a spike roof, the face pale and stopped
    '...#...',
    '..###..',
    '.#####.',
    '.#lll#.',
    '.#lkl#.',
    '.#lll#.',
    '.#####.',
    '..###..',
    '..###..',
    '..#k#..',
    '..###..',
    '.#####.',
    '#######',
  ],
];
A.wreckage = [
  ['..#...', '.##.#.', '######'],
  ['#....#', '##.###'],
  ['.#..', '.##.', '####'],
];

// the Cavern of Giants: a mouth in the rock, big enough for them
A.cavern = [
  '..lllll..',
  '.lkkkkkl.',
  'lkkkkkkkl',
  'lkkkkkkkl',
  'lkkkkkkkl',
];

// the Mount of the Buried Machine: a giant wheel half-buried in the mountain's face: a pale toothed rim, a dark disc, a pale hub
A.cog = [
  '......l.l......',
  '...l.lllll.l...',
  '....lkkkkkl....',
  '..lllkkkkklll..',
  '...lkkklkkkl...',
  '..llkkkkkkkll..',
];

A.crystalTree = [   // polish 2: spiky blue crystal trees with pale cores (b blue body, c pale core, C ice)
  ['..b..', '..c..', '.bcb.', 'b.C.b', '.bCb.', 'bbCbb', '..#..'],
  ['..b..', '.bcb.', '..C..', '.bCb.', 'b.C.b', '..#..'],
  ['.b.', 'bcb', '.C.', 'bCb', '.#.'],
]

// reeds of the toad's swamp
A.reeds = [['#.#', '#.#'], ['.#.', '##.', '.#.'], ['#..', '#.#']];

// the Starblooms: colossal flowers. Head and stem are stamped separately so stems can differ in length.
A.bloom = [
  '..p..',
  '.ppp.',
  'ppopp',
  '.ppp.',
  '..p..',
];
A.bloomSmall = [
  '.p.',
  'pop',
  '.p.',
];

A.ship = [
  '...#...',
  '..p#...',
  '.pp#...',
  'ppp#...',
  '...#..#',
  '#######',
  '.#####.',
];

if (typeof module !== 'undefined' && module.exports) module.exports = A; else window.MAP_SPRITES = A;
})();
