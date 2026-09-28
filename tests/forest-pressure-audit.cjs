// Fresh paired validation batch: seed indices 3001–5000 were not used for tuning.
// Keep the exact same policy, cards, rewards and starting health in both versions.
const { forestRuins } = require('../src/data/dungeons/forest.ts');
const { eliteStumpRoots, eliteStumpSweep } = require('../src/data/enemies.ts');
const { audit } = require('./fun-audit.cjs');
const { pairedGuards } = require('./fixtures/guard-encounters.cjs');
const room = forestRuins.rooms[5], current = room.enemies, roots = eliteStumpRoots.pattern;
const damage = [eliteStumpSweep.damage, eliteStumpRoots.damage];
try {
  for (const version of ['before', 'paired-elites']) {
    room.enemies = pairedGuards(version !== 'before');
    eliteStumpRoots.pattern = version === 'before' ? 'diagonal' : roots;
    [eliteStumpSweep.damage, eliteStumpRoots.damage] = version === 'before' ? [undefined, undefined] : damage;
    console.log(JSON.stringify({ version, ...audit(2000, 3000) }, null, 2));
  }
} finally {
  room.enemies = current; eliteStumpRoots.pattern = roots;
  [eliteStumpSweep.damage, eliteStumpRoots.damage] = damage;
}
