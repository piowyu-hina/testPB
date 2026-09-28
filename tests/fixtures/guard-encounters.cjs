// Snapshots for historical balance audits. Never derive the old encounter from live dungeon data.
exports.pairedGuards = (eliteRight = true) => [
  { id: 0, kind: 'stump', position: [1, 2], elite: true, facing: 'south', health: 3 },
  { id: 1, kind: 'sprout', position: [1, 1] },
  { id: 2, kind: 'moth', position: [2, 4] },
  { id: 3, kind: 'stump', position: [3, 2], elite: eliteRight, facing: 'south', health: 2, skillIndex: 1 }
];
