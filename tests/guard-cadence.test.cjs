const test = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('../src/battle/Room.ts');
const { forestRuins } = require('../src/data/dungeons/forest.ts');
const { enemySkill } = require('../src/battle/EnemyRules.ts');
const definition = forestRuins.rooms[5];

test('every ordinary Qinghe card can answer the fifth-room opening without damage', () => {
  for (const card of ['advance', 'thrust', 'sweep', 'sidestep', 'repel']) {
    const room = new Room(1, definition, 5, 'qinghe');
    room.hand = [card];
    assert.equal(room.damageAt(room.hero), 0, 'entry itself remains safe');
    let answer;
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
      const preview = room.preview(0, [x, y]);
      if (preview && preview.damage === 0) answer = [x, y];
    }
    assert.ok(answer, card);
    room.move(0, answer);
    assert.equal(room.endTurn().damage, 0, card);
  }
});

test('guard and mobile ward lock previews and resolve before sequential movement', () => {
  const room = new Room(1, definition, 5, 'qinghe');
  room.health = 100;
  for (let turn = 0; turn < 6; turn++) {
    const guards = room.enemies.filter(e => e.kind === 'stump');
    assert.equal(guards.length, 1);
    assert.equal(enemySkill(guards[0]).guardsFront, turn % 2 === 0);
    const before = JSON.stringify(room.enemies);
    room.hand = ['sidestep', 'thrust', 'sweep'];
    for (let card = 0; card < 3; card++) for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) room.preview(card, [x, y]);
    assert.equal(JSON.stringify(room.enemies), before);
    const expected = room.damageAt(room.hero);
    const occupied = new Map(room.enemies.map(e => [e.id, [...e.position]]));
    const outcome = room.endTurn();
    assert.equal(outcome.damage, expected);
    for (const motion of outcome.motions) {
      assert.deepEqual(occupied.get(motion.id), motion.from);
      assert.equal(Math.abs(motion.from[0] - motion.to[0]) + Math.abs(motion.from[1] - motion.to[1]), 1);
      assert.ok(![...occupied].some(([id, p]) => id !== motion.id && p.toString() === motion.to.toString()));
      occupied.set(motion.id, motion.to);
    }
  }
});
