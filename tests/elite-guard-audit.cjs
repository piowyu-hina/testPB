// A/B on a separate set of seeds, with the previous encounter layout unchanged.
const { eliteStumpSweep } = require('../src/data/enemies.ts');
const { audit } = require('./fun-audit.cjs');
const current = eliteStumpSweep.pattern;
try {
  for (const pattern of ['front', 'front-fan']) {
    eliteStumpSweep.pattern = pattern;
    const result = audit(1000, 1000);
    console.log({ pattern, ...result });
  }
} finally { eliteStumpSweep.pattern = current; }
