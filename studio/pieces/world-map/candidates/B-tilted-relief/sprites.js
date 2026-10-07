/* Hand-drawn sprites for the tilted relief atlas, typed as text rows (pixel-scenes rule 5: hands draw things).
   One character per pixel. '.' is empty. '#' is the body: render.js lights it from the scene's light (left edge = rim,
   top edge = soft rim, the rest dark) and casts its shadow to the south-east.
   Other characters are hand-placed detail, mapped to palette colours in render.js (STYLE.CH):
     w lit window   f banner   k black (gate, cave)   l pale stone   p petal / sail   o flower heart
     c crystal light   C crystal deep
   Storm clouds, eyes, embers, mill sails and lamps are drawn by render.js. */
(function () {
'use strict';
const A = {};

// the nine castles of the Reach, each a different silhouette. Index = POIS variant (0 = Castle of the Order).
A.castles = [
  [ // 0 the Castle of the Order: a tall spired keep between two towers, a banner
    '......#......',
    '......#ff....',
    '......#f.....',
    '.....###.....',
    '.....###.....',
    '.#.#.###.#.#.',
    '.###.###.###.',
    '.###.#w#.###.',
    '.###.###.###.',
    '#############',
    '##w#######w##',
    '######k######',
    '######k######',
  ],
  [ // 1 on the downs: a broad low keep with crenellated corner turrets
    '#.#.....#.#',
    '###.#.#.###',
    '###.###.###',
    '###########',
    '####w#w####',
    '###########',
    '#####k#####',
  ],
  [ // 2 the sea cliff: one round tower under a cone roof, a small hall at its foot
    '..#.....',
    '.###....',
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
  [ // 3 the knoll: twin towers joined by a bridge over an open arch
    '#.#.....#.#',
    '###.....###',
    '###.....###',
    '#w#######w#',
    '###########',
    '###.....###',
    '###.....###',
  ],
  [ // 4 the crag: stepped and lopsided, a thin watchtower on the high side
    '.......#.',
    '.......#.',
    '......###',
    '#.#...###',
    '###...#w#',
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
    '..###..',
    '.#####.',
    '#######',
    '##w####',
    '#######',
  ],
  [ // 6 the lone hill over the wheat: a squat round keep under a dome
    '....#....',
    '..#####..',
    '.#######.',
    '.#######.',
    '#########',
    '##w###w##',
    '####k####',
  ],
  [ // 7 where the valleys meet: three spires, the middle one tallest
    '....#....',
    '....#....',
    '#..###..#',
    '#..###..#',
    '##.###.##',
    '##.#w#.##',
    '#########',
    '###w#w###',
    '#########',
  ],
  [ // 8 the south coast: a ruin, the great tower broken off at a slant, a gapped wall
    '#........',
    '##.......',
    '###......',
    '###...#.#',
    '#w#.#.###',
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

// the eastern city: towers and domes, every window lit
A.city = [
  '...........#...............',
  '...........#.......#.......',
  '..........###......#.......',
  '.....#...#####....###......',
  '.....#...##w##....#w#...#..',
  '....###.#######.#.###...#..',
  '..#.#w#.###w###.#.###..###.',
  '..#.###.#######.#####..#w#.',
  '.######.##w#w##.##w##.#####',
  '.#w#w##.#######.#####.##w##',
  '####################w######',
  '#w##w##w###w##w##w#####w#w#',
  '###########################',
];

// windmill: the body is baked, the sails are drawn each frame from the hub (top pixel)
A.mill = [
  '..#..',
  '.###.',
  '.###.',
  '.###.',
  '.#k#.',
  '#####',
];

A.stone = [
  '#.',
  '##',
  '##',
  '##',
];

// the three clockwork towers of the Silent Battlefield. Index = POIS variant.
A.clockwork = [
  [ // a tower crowned by a great stopped gear
    '.#.#.#.',
    '#######',
    '.##k##.',
    '#######',
    '.#.#.#.',
    '..###..',
    '..###..',
    '..#k#..',
    '..###..',
    '.#####.',
  ],
  [ // leaning and broken, one arm still raised
    '....###',
    '...###.',
    '..###.#',
    '..##..#',
    '.###...',
    '.##....',
    '###....',
    '###....',
  ],
  [ // a gantry with a hanging weight
    '#######',
    '.#...#.',
    '.#.#.#.',
    '.#.#.#.',
    '.#.k.#.',
    '.#...#.',
    '##...##',
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

// a half-buried cog at the foot of the Mount of the Buried Machine
A.cog = [
  '...#.#...',
  '.#.###.#.',
  '..#####..',
  '.###k###.',
  '#########',
];

A.crystalTree = [
  ['.c.', 'cCc', 'cCc', '.C.', '.#.'],
  ['.c.', '.c.', 'cCc', '.C.', '.#.'],
  ['.c.', 'cC.', '.#.'],
];

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
