'use strict';
const assert = require('node:assert/strict');
exports.nextStep = (room, target) => {
  const point = [...room.hero];
  const axis = point[0] !== target[0] ? 0 : 1;
  point[axis] += Math.sign(target[axis] - point[axis]);
  return { card: room.hand.indexOf('short'), point };
};
exports.toExit = (room, exit) => {
  room.prepareExploration();
  for (let steps = 0; room.hero.join() !== exit.join() && steps < 10; steps++) {
    const { card, point } = exports.nextStep(room, exit);
    assert.ok(room.explore(card, point));
  }
  assert.deepEqual(room.hero, exit);
};
