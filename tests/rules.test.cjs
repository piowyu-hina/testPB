'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Room, inside, data } = require('../src/battle/Room.ts');
const enemy = (id, kind, position) => ({ id, kind, position });

test('opening state and data-driven twelve-card deck', () => {
  const room = new Room();
  assert.equal(room.enemies.length, 4);
  assert.equal(room.health, 5);
  assert.deepEqual(room.hand, ['short', 'diagonal', 'rush']);
  for (const id of ['short', 'diagonal', 'rush', 'leap'])
    assert.equal([...room.hand, ...room.deck].filter((x) => x === id).length, 3);
});

test('rush is blocked by an intermediate enemy; invalid moves are atomic', () => {
  const room = new Room();
  room.hero = [2, 2];
  room.hand = ['rush'];
  room.enemies = [enemy(0, 'sprout', [2, 3]), enemy(1, 'sprout', [2, 4])];
  const snapshot = JSON.stringify(room);
  assert.equal(room.canMove(0, [2, 4]), false);
  assert.equal(room.move(0, [2, 4]), null);
  assert.equal(JSON.stringify(room), snapshot);
  for (const destination of [
    [2, 3],
    [-1, 2],
    [2, 5],
    [2.5, 2],
    [2, 2]
  ])
    assert.equal(room.canMove(0, destination), false);
  assert.equal(room.canMove(-1, [0, 2]), false);
  assert.equal(room.canMove(100, [0, 2]), false);
});

test('leap crosses an enemy, attacks only the landing tile and consumes one action', () => {
  const room = new Room();
  room.hero = [2, 2];
  room.hand = ['leap'];
  room.enemies = [enemy(0, 'sprout', [3, 3]), enemy(1, 'sprout', [4, 4])];
  assert.equal(room.move(0, [4, 4]).removedId, 1);
  assert.equal(room.at([3, 3]).id, 0);
  assert.equal(room.at([4, 4]), undefined);
  assert.equal(room.actions, 1);
  assert.deepEqual(room.discard, ['leap']);
});

test('preview excludes defeated threats, sums surviving attacks and never mutates', () => {
  const room = new Room();
  room.hero = [2, 2];
  room.hand = ['short'];
  room.enemies = [enemy(0, 'sprout', [2, 3]), enemy(1, 'sprout', [1, 3]), enemy(2, 'sprout', [3, 3])];
  const before = JSON.stringify(room);
  const preview = room.preview(0, [2, 3]);
  assert.equal(preview.damage, 2);
  assert.equal(preview.removedId, 0);
  assert.equal(room.damageAt([2, 2], preview.removedId), 0);
  assert.equal(JSON.stringify(room), before);
  room.move(0, [2, 3]);
  assert.equal(room.damageAt(room.hero), preview.damage);
  assert.equal(room.endTurn().damage, 2);
  assert.equal(room.health, 3);
});

test('last capture wins immediately; lethal attack does not draw another hand', () => {
  const room = new Room();
  room.enemies = [enemy(0, 'sprout', [2, 2])];
  room.move(2, [2, 2]);
  assert.equal(room.won, true);
  assert.equal(room.endTurn(), null);
  assert.equal(room.health, 5);
  assert.equal(room.move(0, [2, 1]), null);
  const doomed = new Room();
  doomed.health = 1;
  doomed.enemies = [enemy(0, 'sprout', [2, 1])];
  doomed.endTurn();
  assert.equal(doomed.health, 0);
  assert.equal(doomed.lost, true);
  assert.equal(doomed.turn, 1);
  assert.equal(doomed.endTurn(), null);
});

test('enemies attack before approaching, and may not overlap', () => {
  const room = new Room();
  const outcome = room.endTurn();
  assert.equal(outcome.damage, 0);
  assert.equal(room.health, 5);
  assert.ok(room.damageAt(room.hero) > 0);
  const occupied = room.enemies.map((e) => e.position.join(','));
  assert.equal(new Set(occupied).size, occupied.length);
  assert.ok(!occupied.includes(room.hero.join(',')));
  assert.equal(room.endTurn().damage, 1);
});

test('zero actions prevents a third move; next turn discards unused cards', () => {
  const room = new Room();
  room.move(2, [2, 2]);
  room.move(0, [2, 1]);
  assert.equal(room.actions, 0);
  assert.equal(room.move(0, [3, 2]), null);
  room.endTurn();
  assert.equal(room.actions, 2);
  assert.equal(room.hand.length, 3);
  assert.equal(room.deck.length + room.hand.length + room.discard.length, 12);
});

test('100 seeded runs preserve preview parity, boundaries and deck size, and can clear the room', () => {
  let wins = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const room = new Room(seed);
    for (let turn = 0; turn < 30 && !room.finished; turn++) {
      for (let action = 0; action < 2 && !room.finished; action++) {
        let best = null;
        room.hand.forEach((_, card) => {
          for (let y = 0; y < 5; y++)
            for (let x = 0; x < 5; x++) {
              const point = [x, y],
                preview = room.preview(card, point);
              if (!preview) continue;
              const score =
                (preview.removedId >= 0 ? 15 : 0) -
                preview.damage * 10 -
                ((x - 2) ** 2 + (y - 2) ** 2) * 0.1;
              if (!best || score > best.score)
                best = { card, point, score, damage: preview.damage };
            }
        });
        if (!best) break;
        assert.ok(room.move(best.card, best.point));
        assert.equal(room.damageAt(room.hero), best.damage);
      }
      if (room.finished) break;
      const damage = room.damageAt(room.hero),
        hp = room.health;
      room.endTurn();
      assert.equal(room.health, Math.max(0, hp - damage));
      assert.ok(room.enemies.every((e) => inside(e.position)));
      const spots = room.enemies.map((e) => e.position.join(','));
      assert.equal(new Set(spots).size, spots.length);
      assert.ok(!spots.includes(room.hero.join(',')));
      assert.equal(room.deck.length + room.discard.length + room.hand.length, 12);
      if (!room.finished) {
        assert.equal(room.actions, 2);
        assert.equal(room.hand.length, 3);
      }
    }
    if (room.won) wins++;
  }
  assert.ok(wins >= 90, `Basic strategy cleared only ${wins}/100 rooms`);
});
