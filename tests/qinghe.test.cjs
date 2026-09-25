const test = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('../src/battle/Room.ts');
const { Journey } = require('../src/battle/Journey.ts');

const enemy = (id, position, extra = {}) => ({ id, position, kind: 'sprout', health: 1, ...extra });
function room() {
  const result = new Room(1, undefined, 5, 'qinghe');
  result.hero = [2, 1];
  result.enemies = [enemy(0, [4, 4])];
  return result;
}

test('Qinghe starts with one of each simple action and no rogue state', () => {
  const result = room();
  assert.deepEqual(result.hand, ['advance', 'thrust', 'sweep']);
  assert.equal(result.deck.length, 15);
  assert.deepEqual(result.knives, []);
});

test('thrust attacks without moving; advance moves through empty space or attacks on landing', () => {
  const result = room();
  result.enemies = [enemy(0, [2, 2]), enemy(1, [4, 4])];
  assert.equal(result.canMove(0, [1, 1]), true);
  assert.equal(result.canMove(1, [2, 2]), true);
  assert.deepEqual(result.preview(1, [2, 2]).destination, [2, 1]);
  result.move(1, [2, 2]);
  assert.deepEqual(result.hero, [2, 1]);
  assert.deepEqual(result.knives, []);
  result.hand = ['advance'];
  assert.deepEqual(result.move(0, [2, 2]).to, [2, 2]);
  assert.deepEqual(result.hero, [2, 2]);
});

test('sweep damages all adjacent monsters but not diagonal ones, with matching preview', () => {
  const result = room();
  result.hero = [2, 2];
  result.hand = ['sweep'];
  result.enemies = [enemy(0, [2, 3]), enemy(1, [3, 2]), enemy(2, [1, 1])];
  assert.equal(result.canMove(0, [1, 1]), false);
  const preview = result.preview(0, [2, 3]);
  assert.deepEqual(preview.removedIds.sort(), [0, 1]);
  assert.deepEqual(preview.destination, [2, 2]);
  const action = result.move(0, [2, 3]);
  assert.deepEqual(action.hits.filter(hit => hit.removed).map(hit => hit.id).sort(), [0, 1]);
  assert.deepEqual(result.enemies.map(monster => monster.id), [2]);
  assert.deepEqual(result.hero, [2, 2]);
});

test('sweep checks front guards for each neighboring monster independently', () => {
  const result = room();
  result.hero = [2, 2];
  result.hand = ['sweep'];
  result.enemies = [
    enemy(0, [2, 3], { kind: 'stump', facing: 'south' }),
    enemy(1, [3, 2])
  ];
  const preview = result.preview(0, [2, 3]);
  assert.equal(preview.blocked, true);
  assert.deepEqual(preview.removedIds, [1]);
  const action = result.move(0, [2, 3]);
  assert.deepEqual(action.hits.map(hit => [hit.id, hit.blocked, hit.removed]), [[0, true, false], [1, false, true]]);
  assert.deepEqual(result.enemies.map(monster => monster.id), [0]);
});

test('thrust reaches two cardinal tiles but not through a monster', () => {
  const result = room();
  result.enemies = [enemy(0, [2, 2]), enemy(1, [2, 3])];
  assert.equal(result.canMove(1, [2, 3]), false);
  assert.equal(result.canMove(1, [2, 2]), true);
  assert.equal(result.canMove(1, [3, 2]), false);
});

test('Qinghe ultimate deals two damage without moving and persists between rooms', () => {
  const journey = new Journey(1, 'qinghe');
  journey.room.hero = [2, 1];
  journey.room.enemies = [enemy(0, [3, 3], { health: 2, maxHealth: 2 })];
  journey.gainAssassination(true);
  journey.gainAssassination();
  assert.equal(journey.claimUltimate(), true);
  assert.equal(journey.room.hand.includes('dawnSpear'), true);
  assert.equal(journey.spendAssassination(), true);
  const action = journey.room.strikeUltimate(0);
  assert.equal(action.removedId, 0);
  assert.deepEqual(journey.room.hero, [2, 1]);
  assert.deepEqual(journey.room.knives, []);
});

test('Qinghe ultimate stays in hand when ending a turn', () => {
  const result = room();
  result.hand = ['dawnSpear', 'advance'];
  result.endTurn();
  assert.equal(result.hand.includes('dawnSpear'), true);
  assert.equal(result.discard.includes('dawnSpear'), false);
});

test('Qinghe full hand requires one replacement before receiving the ultimate', () => {
  const journey = new Journey(1, 'qinghe');
  journey.room.hand = ['advance', 'thrust', 'sweep', 'advance', 'thrust'];
  journey.gainAssassination(true);
  journey.gainAssassination();
  assert.equal(journey.claimUltimate(), false);
  assert.equal(journey.claimUltimate(1), true);
  assert.equal(journey.room.hand.length, 5);
  assert.equal(journey.room.hand.includes('dawnSpear'), true);
  journey.setLoadout('rogue');
  assert.equal(journey.room.hand.includes('dawnSpear'), false);
  assert.deepEqual(journey.room.knives, []);
});
