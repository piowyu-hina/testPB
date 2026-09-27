// Paired whole-journey diagnostic. No policy tuning between the two encounters.
const { forestRuins } = require('../src/data/dungeons/forest.ts');
const { audit } = require('./fun-audit.cjs');
const room = forestRuins.rooms[5], current = room.enemies;
const previous = [
  { id: 0, kind: 'stump', position: [2, 3], elite: true, facing: 'south', health: 3 },
  { id: 1, kind: 'sprout', position: [1, 2] },
  { id: 2, kind: 'moth', position: [3, 3] },
  { id: 3, kind: 'sporecap', position: [4, 4], health: 2, skillIndex: 1 }
];
try {
  for (const [version, enemies] of [['previous', previous], ['staggered', current]]) {
    room.enemies = enemies;
    const { runs, wins, noDamage, avg } = audit(1000);
    console.log({ version, runs, wins, noDamage, avg });
  }
} finally { room.enemies = current; }
