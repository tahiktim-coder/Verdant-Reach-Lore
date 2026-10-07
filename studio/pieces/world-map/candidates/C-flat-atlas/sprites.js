/* Hand-drawn sprites for the flat atlas, typed as text rows. The light comes from the upper left, so every
   sprite is drawn that way by hand: lit left walls and tops, dark bodies.
   '#' = body in shadow        'l' = a lit wall or edge       'h' = the brightest edge
   'm' = a mid tone            'w' = a lit window or banner (flickers on the city)
   'o' = a hole (the darkest colour)   'c' = the bright heart of a bloom   'p' = a petal
   Each sprite stands on its bottom row; the renderer places the middle of that row on the place. */
(function () {
'use strict';

// Nine castles, nine silhouettes. Index = variant (0 = the Castle of the Order).
const CASTLES = [
  [ // 0: the Castle of the Order: a tall keep with a gold banner between two towers, a gate in the wall
    '.......l.......',
    '.......lww.....',
    '.......l.......',
    '.....l.l.#.....',
    '.....l####.....',
    'l.#..l####..l.#',
    'l##..l####..l##',
    'l##..l####..l##',
    'l##lll####lll##',
    'l##l########l##',
    'l##l###oo###l##',
    'l##l###oo###l##'
  ],
  [ // 1: a round tower under a cone roof, a low hall beside it
    '...l......',
    '..l##.....',
    '.l####....',
    '..l##.....',
    '..l##..l..',
    '..l##.l##.',
    '..l##l####',
    '..l##l####',
    '.ll##l####'
  ],
  [ // 2: a thin watch-keep on a sea cliff
    '.l...',
    '.l...',
    'l##..',
    'l##..',
    '.l#..',
    '.l#..',
    '.l#.l',
    '.l#l#',
    'll###',
    'l####'
  ],
  [ // 3: twin towers over a gate
    '.l......l..',
    'l##....l##.',
    'l##....l##.',
    'l##.l..l##.',
    'l##l###l###',
    'l####oo####',
    'l####oo####'
  ],
  [ // 4: a castle that climbs a crag
    '......l..',
    '......l..',
    '.....l##.',
    '.....l##.',
    '..l..l##.',
    '.l#.ll##.',
    '.l#l####.',
    'll#######',
    'l########'
  ],
  [ // 5: a long low fort with three turrets
    '.l....l....l.',
    'l##..l##..l##',
    'l##lll##lll##',
    'l############',
    'l############'
  ],
  [ // 6: a broken tower
    'l..#..',
    'l.l#..',
    'l###..',
    'l###..',
    'l###..',
    'l###.l',
    'l###l#',
    'l#####'
  ],
  [ // 7: a gabled hall with a slender tower
    '.......l.',
    '.......l.',
    '......l##',
    '..l...l##',
    '.l##..l##',
    'l####.l##',
    'l####ll##',
    'l########'
  ],
  [ // 8: a shell keep around one spire
    '....l....',
    '....l....',
    '...l##...',
    '.l.l##.l.',
    'l#ll##l##',
    'l########',
    '.l######.'
  ]
];

// The city of towers and domes, every window lit.
const CITY = [
  '.............l.............',
  '.............l.............',
  '......l.....l##.....l......',
  '......l....l####....l......',
  '.....l##...l####...l##.....',
  '....l####..l#w##..l####....',
  '....l#w##..l####..l##w#....',
  '.l..l####.ll#w#w#.l####..l.',
  '.l..l#w##.l######.l#w##..l.',
  'l##.l####ll#w##w##l####.l##',
  'l#wll#w#w#l##w####l#w#wll#w',
  'l###w###w###w##w#w###w##w##',
  'l##########################'
];

// The Colossal Spires: three needles of different heights.
const SPIRES = [
  '.....l.......',
  '.....l.......',
  '.....l.......',
  '.....l#...l..',
  '.....l#...l..',
  '.l...l#...l..',
  '.l...l#...l#.',
  '.l...l#...l#.',
  '.l#..l#...l#.',
  '.l#..l#...l#.',
  '.l#..l##..l#.',
  '.l#..l##..l#.',
  '.l#.ll##..l#.',
  '.l#.l###.ll#.',
  'll#.l###.l##.',
  'l##.l###.l###'
];

// The Stone Hands: two giant hands rising out of the ground, drawn separately (a mirrored hand would be lit from the wrong side).
const HANDS = [
  [
    '..l.l..',
    '..l#l#.',
    'l.l#l#.',
    'l#l#l#l',
    'l#l#l##',
    'l######',
    'l#####.',
    '.l####.',
    '.l###..',
    '.l###..'
  ],
  [
    '.l.l...',
    '.l#l#l.',
    '.l#l#l#',
    'll#l#l#',
    'l######',
    'l######',
    '.l####.',
    '..l###.',
    '..l###.'
  ]
];

// Windmill, two blade positions. It stands in the gold, so it is a dark shape with one bright edge.
const MILL = [
  [
    '#...#',
    '.#.#.',
    '..#..',
    '.#.#.',
    '#.#.#',
    '.h##.',
    '.h##.'
  ],
  [
    '..#..',
    '..#..',
    '#####',
    '..#..',
    '..#..',
    '.h##.',
    '.h##.'
  ]
];

const STONES = [
  ['h.', 'h#', 'h#', 'h#'],
  ['.h.', 'h#.', 'h##'],
  ['.h', 'h#', 'h#']
];

// The three clockwork towers of the Silent Battlefield: a toothed wheel on a stalk. Index = variant.
const CLOCKWORK = [
  [
    '..l#l#..',
    '.l#####.',
    'l##oo###',
    'l##oo###',
    '.l#####.',
    '..l#.#..',
    '...l#...',
    '...l#...',
    '...l#...',
    '..l###..',
    '.l#####.'
  ],
  [
    '.l#l#..',
    'l#####.',
    'l#oo##.',
    '.l####.',
    '..l#...',
    '..l#...',
    '..l##..',
    '..l#...',
    '.l###..',
    'l#####.'
  ],
  [
    'l.#.....',
    'l####...',
    'lo####..',
    'l#o###..',
    '.l####..',
    '...l#...',
    '...l##..',
    '..l####.',
    '.l######'
  ]
];

const WRECKS = [
  ['l..#.', '.l##.', 'l#.##'],
  ['.l...', 'l##.#', '.l###'],
  ['l.#', '.l#']
];

const CAVE = [
  '.lll.',
  'l#oo#',
  'l#oo#'
];

const SHIP = [
  '..h..',
  '..hl.',
  '..hll',
  'mmmmm',
  '.mmm.'
];

const BLOOM = [
  '.p.',
  'pcp',
  '.p.'
];

const SPRITES = { CASTLES, CITY, SPIRES, HANDS, MILL, STONES, CLOCKWORK, WRECKS, CAVE, SHIP, BLOOM };
// every row of a sprite must be the same width; fail loudly at load if one was mistyped
for (const k of Object.keys(SPRITES)) {
  const list = typeof SPRITES[k][0] === 'string' ? [SPRITES[k]] : SPRITES[k];
  list.forEach((rows, n) => rows.forEach(r => { if (r.length !== rows[0].length) throw new Error('sprite ' + k + '[' + n + ']: uneven row "' + r + '"'); }));
}
if (typeof module !== 'undefined' && module.exports) module.exports = SPRITES;
if (typeof window !== 'undefined') window.ATLAS_SPRITES = SPRITES;
})();
