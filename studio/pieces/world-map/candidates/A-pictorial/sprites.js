/* Hand-drawn sprites for the pictorial world map: text rows, tiny, silhouetted.
   '.' empty, '#' body (a dark silhouette; the renderer rim-lights the edges that face the sun),
   '+' a lit window or lamp, 'e' ember, 'i' ice / crystal, 'w' cream (the lightest colour), 's' a body pixel that never takes a rim, 'r' a pixel that is always a lit rim.
   Every castle is a different silhouette (variant 0 = the Castle of the Order). */
(function () {
'use strict';
const S = {};
const pad = rows => { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r + '.'.repeat(w - r.length)); };

S.castles = [
  // 0: the Castle of the Order: a great keep with a banner between two towers, behind one long wall
  pad([
    '........#........',
    '........##.......',
    '........#........',
    '.#.....###.....#.',
    '###...#####...###',
    '###...#####...###',
    '###..#######..###',
    '###..#######..###',
    '#################',
    '###+####+####+###',
    '#################',
    '#################',
  ]),
  // 1: one tall tower with a small hall (the downs north of the Reach river)
  pad([
    '..#......',
    '.###.....',
    '.###.....',
    '.###.....',
    '.###..#..',
    '.###.###.',
    '.#######.',
    '#########',
    '#########',
  ]),
  // 2: a low wide fort with a beacon tower (sea cliff on the Western Sea)
  pad([
    '.#.........',
    '.#.........',
    '###......#.',
    '###.#.#.###',
    '###########',
    '###########',
    '###########',
  ]),
  // 3: twin towers joined by a bridge (a knoll below the high arc)
  pad([
    '.#.....#.',
    '###...###',
    '###...###',
    '#########',
    '###...###',
    '###...###',
    '###...###',
  ]),
  // 4: a tall stepped crag castle (over the alpine river)
  pad([
    '....#....',
    '....#....',
    '...###...',
    '...###...',
    '...###.#.',
    '.#.#####.',
    '.#######.',
    '.#######.',
    '.#######.',
    '#########',
    '#########',
  ]),
  // 5: a round keep inside a ring wall (headland south of the Reach river mouth)
  pad([
    '.....###.....',
    '....#####....',
    '....#####....',
    '#.#.#####.#.#',
    '#############',
    '#############',
    '#############',
  ]),
  // 6: a single massive watchtower with a pointed roof (lone hill over the wheat)
  pad([
    '...#...',
    '..###..',
    '.#####.',
    '.#####.',
    '..###..',
    '..###..',
    '..###..',
    '..###.#',
    '.######',
    '#######',
    '#######',
  ]),
  // 7: three towers rising like steps (where the alpine valleys meet)
  pad([
    '..........#..',
    '.........###.',
    '.....#...###.',
    '....###..###.',
    '#...###..###.',
    '##..###..###.',
    '###.###.####.',
    '#############',
    '#############',
    '#############',
  ]),
  // 8: a long wall, a twin-turret gatehouse and a dome (south coast)
  pad([
    '.....#.#.......',
    '.....###...##..',
    '#....###..####.',
    '#.#.#####.####.',
    '###############',
    '###############',
    '###############',
  ]),
];

// the Colossal Spires: three needle-thin ancient spires, far taller than any castle
S.spires = pad([
  '...#.........',
  '...#.........',
  '...#.........',
  '...#.........',
  '...#.........',
  '...#.........',
  '...#....#....',
  '...#....#....',
  '...#....#....',
  '..##....#....',
  '..##....#....',
  '..##....#....',
  '..##....#....',
  '..##...##..#.',
  '..##...##..#.',
  '..##...##..#.',
  '..##...##..#.',
  '..##...##..#.',
  '..###..##..#.',
  '..###..##.##.',
  '..###..##.##.',
  '..###..###.##',
  '.####..###.##',
  '.####.####.##',
  '.####.####.##',
]);

// the Stone Hands: two giant hands of stone rising from the ground, palms toward each other
S.handL = pad([
  '....#......',
  '..#.#.#....',
  '..#.#.#.#..',
  '#.#.#.#.#..',
  '#.#######..',
  '#########..',
  '.########..',
  '..#######..',
  '...#####...',
  '...#####...',
  '...#####...',
]);
S.handR = pad([
  '.....#....',
  '...#.#.#..',
  '.#.#.#.#..',
  '.#.#.#.#.#',
  '.#######.#',
  '.#########',
  '.########.',
  '..######..',
  '..#####...',
  '..#####...',
]);

// windmill: a tower with a cap; the sails are a separate two-frame sprite centred on the hub
S.mill = pad([
  '.###.',
  '.###.',
  '.###.',
  '#####',
  '#####',
]);
S.sails = [
  pad(['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#']),
  pad(['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...']),
];

S.stones = [pad(['#.', '##', '##', '##']), pad(['.#', '##', '##']), pad(['#', '#', '#', '#'])];

// the eastern city of towers and domes, every window lit
S.city = pad([
  '....................#....................',
  '....................#....................',
  '.......#...........###...........#.......',
  '.......#..........#####..........#.......',
  '......###.........#####.........###......',
  '......###...#.....#####.....#...###......',
  '..#...#+#...#....#######....#...#+#...#..',
  '..#...###..###...###+###...###..###...#..',
  '.###..###..#+#...#######...#+#..###..###.',
  '.#+#..#+#..###..####+####..###..#+#..#+#.',
  '.###.####.####.###########.####.####.###.',
  '#########################################',
  '##+##+##+##+##+##+##+##+##+##+##+##+##+##',
  '#########################################',
]);

// the Silent Battlefield: three clockwork towers, each broken a different way, and old wreckage
S.clockwork = [
  pad(['.#.', '###', '###', '.#.', '.#.', '.#.', '###']),
  pad(['##.', '###', '.#.', '.#.', '##.']),
  pad(['.##', '###', '.#.', '.#.', '.#.', '.##', '.##']),
];
S.wreck = [pad(['.#..', '####']), pad(['#...', '###.']), pad(['..#.', '.###'])];

// the Cavern of Giants: a dark mouth in the mountainside
S.cavern = pad(['.rrrr.', 'rssssr', 'ssssss', 'ssssss']);

// sacred crystal trees and the colossal starblooms
S.crystal = [pad(['.i.', '.i.', 'iwi', '.i.', '.i.']), pad(['.i.', 'iwi', '.i.']), pad(['i', 'w', 'i', 'i'])];
S.bloom = [pad(['.w.', 'wiw', '.w.', '.#.', '.#.']), pad(['w.w', '.i.', 'w.w', '.#.']), pad(['.w.', 'www', '.#.'])];

// a pirate sail among the Artifact Isles
S.ship = pad(['..w...', '.ww...', '.www..', '..s...', 'sssss.', '.sss..']);

// a small dark storm cloud that hangs over each storm valley
S.storm = pad(['..sssss....', '.sssssssss.', 'sssssssssss', '.sssssssss.']);

S.bird = [pad(['#...#', '.#.#.', '..#..']), pad(['.....', '##.##', '..#..'])];

if (typeof module !== 'undefined' && module.exports) module.exports = S; else window.WM_SPRITES = S;
})();
