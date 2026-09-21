const test = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('../src/battle/Room.ts');
const { enemySkill, blocksAttack, facingOffsets } = require('../src/battle/EnemyRules.ts');

function guardRoom(hero = [2, 1], extra = {}) {
  return new Room(1, { name: 'Guard test', hero, enemies: [
    { id: 0, kind: 'stump', position: [2, 2], facing: 'south', ...extra }
  ] });
}

test('all four facings block straight frontal attacks but not flanks or rear', () => {
  for (const [facing, [x, y]] of Object.entries(facingOffsets)) {
    const room = guardRoom([2 + x, 2 + y], { facing });
    const enemy = room.enemies[0];
    assert.equal(Room.threatens(enemy, room.hero), true);
    assert.equal(Room.threatens(enemy, [2 - x, 2 - y]), false);
    assert.equal(blocksAttack(enemy, room.hero), true);
    assert.equal(blocksAttack(enemy, [2 + x * 2, 2 + y * 2]), true);
    assert.equal(blocksAttack(enemy, [2 - x, 2 - y]), false);
    assert.equal(blocksAttack(enemy, [2 - y, 2 + x]), false);
    const before = JSON.stringify(room);
    const preview = room.preview(0, [2, 2]);
    assert.equal(preview.blocked, true);
    assert.equal(preview.removedId, -1);
    assert.deepEqual(preview.destination, room.hero);
    assert.equal(preview.damage, 1);
    assert.equal(JSON.stringify(room), before);
    room.move(0, [2, 2]);
    assert.equal(room.enemies[0].health, 1);
    assert.equal(room.actions, 1);
    assert.equal(room.hand.length, 2);
    assert.equal(room.endTurn().damage, preview.damage);
  }
});

test('sweep then roots are announced a whole player turn ahead; facing is stable during player moves', () => {
  const room = guardRoom([0, 0]);
  const enemy = room.enemies[0];
  room.move(2, [2, 0]);
  assert.equal(enemy.facing, 'south');
  assert.equal(enemySkill(enemy).id, 'sweep');
  const position = [...enemy.position];
  assert.equal(room.endTurn().damage, 0);
  assert.equal(enemySkill(enemy).id, 'roots');
  assert.deepEqual(enemy.position, position);
  assert.equal(enemy.facing, 'south');
  assert.equal(Room.threatens(enemy, [1, 1]), true);
  assert.equal(Room.threatens(enemy, [2, 1]), false);
  assert.equal(blocksAttack(enemy, [2, 0]), false);
  const next = room.endTurn();
  assert.equal(next.damage, 0);
  assert.equal(enemySkill(enemy).id, 'sweep');
  assert.deepEqual(enemy.position, [2, 1]);
  assert.equal(Room.threatens(enemy, room.hero), true);
});

test('roots can be interrupted by a frontal capture, removing all its forecast damage', () => {
  const room = guardRoom([2, 1], { skillIndex: 1 });
  assert.equal(room.damageAt([1, 1]), 1);
  const preview = room.preview(0, [2, 2]);
  assert.equal(preview.blocked, false);
  assert.equal(preview.removedId, 0);
  room.move(0, [2, 2]);
  assert.equal(room.won, true);
  assert.equal(room.damageAt([1, 1]), 0);
  assert.equal(room.endTurn(), null);
});

test('roots damages only diagonals before moving, including elite damage', () => {
  const room = guardRoom([1, 1], { skillIndex: 1, elite: true });
  assert.equal(room.damageAt(room.hero), 2);
  const outcome = room.endTurn();
  assert.equal(outcome.damage, 2);
  assert.equal(room.health, 3);
  assert.equal(enemySkill(room.enemies[0]).id, 'sweep');
  assert.notDeepEqual(room.enemies[0].position, room.hero);
});

test('side attacks damage an armored elite, retreat on first hit, and kill on the second', () => {
  const room = guardRoom([1, 2], { elite: true });
  assert.equal(room.preview(0, [2, 2]).blocked, false);
  room.move(0, [2, 2]);
  assert.equal(room.enemies[0].health, 1);
  assert.deepEqual(room.hero, [1, 2]);
  room.hand = ['short'];
  assert.equal(room.preview(0, [2, 2]).removedId, 0);
  room.move(0, [2, 2]);
  assert.equal(room.won, true);
});

test('every legal preview matches its immediate result and next attack across phases and board positions', () => {
  for (const skillIndex of [0, 1]) for (const facing of Object.keys(facingOffsets)) {
    for (let hx = 0; hx < 5; hx++) for (let hy = 0; hy < 5; hy++) {
      if (hx === 2 && hy === 2) continue;
      for (let card = 0; card < 4; card++) for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
        const room = guardRoom([hx, hy], { skillIndex, facing, elite: true });
        room.hand = ['short', 'diagonal', 'rush', 'leap'];
        const preview = room.preview(card, [x, y]);
        if (!preview) continue;
        room.move(card, [x, y]);
        assert.deepEqual(room.hero, preview.destination);
        assert.equal(room.damageAt(room.hero), preview.damage);
        assert.equal(room.endTurn().damage, preview.damage);
      }
    }
  }
});
