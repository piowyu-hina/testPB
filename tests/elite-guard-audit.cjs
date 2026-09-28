// A/B on a separate set of seeds, with the previous encounter layout unchanged.
const { eliteStumpSweep, eliteStumpRoots } = require('../src/data/enemies.ts');
const { forestRuins } = require('../src/data/dungeons/forest.ts');
const room = forestRuins.rooms[5], currentEnemies = room.enemies, currentRoots = eliteStumpRoots.pattern;
const { audit } = require('./fun-audit.cjs');
const { pairedGuards } = require('./fixtures/guard-encounters.cjs');
const current = eliteStumpSweep.pattern;
const damage = [eliteStumpSweep.damage, eliteStumpRoots.damage];
try {
  // Keep this historical five-cell-sweep comparison independent of later changes.
  room.enemies = pairedGuards(false);
  eliteStumpRoots.pattern = 'diagonal';
  eliteStumpSweep.damage = eliteStumpRoots.damage = undefined;
  for (const pattern of ['front', 'front-fan']) {
    eliteStumpSweep.pattern = pattern;
    const result = audit(1000, 1000);
    console.log({ pattern, ...result });
  }
} finally {
  eliteStumpSweep.pattern = current; eliteStumpRoots.pattern = currentRoots; room.enemies = currentEnemies;
  [eliteStumpSweep.damage, eliteStumpRoots.damage] = damage;
}
