'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Journey } = require('../src/battle/Journey.ts');
const { Room } = require('../src/battle/Room.ts');
const { rooms } = require('../src/data/rooms.ts');

const { toExit } = require('./explore-helper.cjs');

test('exit movement uses reusable walking cards and never spends turns or actions', () => {
  const run = new Journey(),
    room = run.room;
  assert.equal(room.explore(0, [2, 1]), null);
  room.enemies = [];
  room.actions = 0;
  const health = room.health,
    turn = room.turn;
  assert.equal(room.explore(-1, [2, 1]), null);
  assert.equal(room.explore(0, [2, 4]), null);
  assert.equal(room.explore(0, [5, 0]), null);
  assert.deepEqual(room.hero, [2, 0]);
  assert.ok(room.explore(0, [2, 1]));
  assert.equal(room.actions, 0);
  assert.equal(room.turn, turn);
  assert.equal(room.health, health);
  assert.deepEqual(room.availableCards, ['forward']);
  toExit(room, run.exit);
  assert.equal(room.hand.length + room.deck.length + room.discard.length, 12);
  assert.equal(run.advance(), true);
  assert.equal(run.advance(), false);
});

test('cleared-room movement preserves combat cards and offers all adjacent steps', () => {
  const room = new Room();
  room.enemies = [];
  room.hand = ['leap'];
  const before = JSON.stringify([room.hand, room.deck, room.discard]);
  assert.ok(room.canExplore(0, [3, 1]));
  assert.equal(room.canExplore(1, [3, 1]), false);
  assert.equal(room.canExplore(0, [2, 2]), false);
  for (let i = 0; i < 100; i++) {
    const point = [2, i % 2 ? 0 : 1];
    assert.ok(room.explore(0, point));
    assert.equal(JSON.stringify([room.hand, room.deck, room.discard]), before);
    assert.deepEqual(room.availableCards, ['forward']);
    assert.equal(room.turn, 1);
    assert.equal(room.actions, 2);
  }
});

test('only clearing advances; healing is capped and cannot be repeated', () => {
  const run = new Journey();
  assert.equal(run.advance(), false);
  run.room.health = 2;
  run.room.enemies = [];
  assert.equal(run.finished, false);
  assert.equal(run.recovery, 1);
  assert.equal(run.advance(), false);
  toExit(run.room, run.exit);
  assert.equal(run.advance(), true);
  assert.equal(run.stage, 1);
  assert.equal(run.room.health, 3);
  assert.equal(run.room.turn, 1);
  assert.equal(run.room.actions, 2);
  assert.deepEqual(run.room.hand, ['short', 'diagonal', 'rush']);
  assert.equal(run.advance(), false);
  assert.equal(run.room.health, 3);
  run.room.health = 5;
  run.room.enemies = [];
  assert.equal(run.recovery, 0);
  toExit(run.room, run.exit);
  run.advance();
  assert.equal(run.room.health, 5);
  run.room.enemies = [];
  assert.equal(run.won, true);
  assert.equal(run.finished, true);
  assert.equal(run.advance(), false);
});

test('death ends the whole journey and a new journey restores the opening', () => {
  const run = new Journey();
  run.room.enemies = [];
  toExit(run.room, run.exit);
  run.advance();
  run.room.health = 0;
  assert.equal(run.finished, true);
  assert.equal(run.advance(), false);
  const fresh = new Journey(2);
  assert.equal(fresh.stage, 0);
  assert.equal(fresh.room.health, 5);
  assert.equal(fresh.finished, false);
});

test('elite damage preview matches resolution, capture removes its entire threat', () => {
  const definition = { name: 'Elite damage fixture', hero: [2, 0], enemies: [
    { id: 0, kind: 'sprout', position: [2, 3], elite: true }
  ] };
  const room = new Room(1, definition);
  room.hero = [2, 2];
  assert.equal(room.damageAt(room.hero), 2);
  const hp = room.health;
  assert.equal(room.endTurn().damage, 2);
  assert.equal(room.health, hp - 2);
  const capture = new Room(1, definition);
  capture.hero = [2, 2];
  const preview = capture.preview(0, [2, 3]);
  assert.equal(preview.removedId, -1);
  assert.deepEqual(preview.destination, [2, 2]);
  assert.equal(capture.enemies[0].health, 2); // Preview must not damage the boss.
  assert.equal(preview.damage, 2);
  capture.move(0, [2, 3]);
  assert.equal(capture.enemies[0].health, 1);
  assert.deepEqual(capture.hero, [2, 2]);
  assert.equal(capture.damageAt(capture.hero), preview.damage);
  capture.hand = ['short'];
  const finishing = capture.preview(0, [2, 3]);
  assert.equal(finishing.removedId, 0);
  capture.move(0, [2, 3]);
  assert.equal(
    capture.enemies.some((enemy) => enemy.elite),
    false
  );
  assert.deepEqual(capture.hero, [2, 3]);
  assert.equal(capture.damageAt(capture.hero), finishing.damage);
});

test('last boss survives first hit without overlap or opening the exit', () => {
  const room = new Room(1, { name: 'Boss', hero: [2, 2], enemies: [
    { id: 0, kind: 'sprout', position: [2, 3], elite: true }
  ] });
  const cardsBefore = room.hand.length;
  room.move(0, [2, 3]);
  assert.equal(room.won, false);
  assert.equal(room.actions, 1);
  assert.equal(room.hand.length, cardsBefore - 1);
  assert.equal(room.enemies[0].health, 1);
  assert.deepEqual(room.hero, [2, 2]);
  assert.equal(room.at(room.hero), undefined);
  const health = room.health;
  room.endTurn();
  assert.equal(room.health, health - 2);
  room.hand = ['short'];
  room.move(0, [2, 3]);
  assert.equal(room.won, true);
});

test('room definitions are independent, legal, and start outside all attacks', () => {
  const source = JSON.stringify(rooms);
  for (const definition of rooms) {
    const room = new Room(1, definition);
    assert.equal(room.damageAt(room.hero), 0);
    const positions = [room.hero, ...room.enemies.map((enemy) => enemy.position)].map((p) =>
      p.join(',')
    );
    assert.equal(new Set(positions).size, positions.length);
    room.enemies[0].position[0] = 99;
    room.hero[0] = 99;
  }
  assert.equal(JSON.stringify(rooms), source);
});

test('100 seeded journeys can be cleared using previews, with bounded damage and consistent decks', () => {
  const clears = [0, 0];
  for (let seed = 1; seed <= 100; seed++) {
    const run = new Journey(seed);
    for (let stage = 0; stage < run.total; stage++) {
      const room = run.room;
      for (let step = 0; step < 100 && !room.finished; step++) {
        let best = null;
        room.hand.forEach((_, card) => {
          for (let y = 0; y < 5; y++)
            for (let x = 0; x < 5; x++) {
              const point = [x, y],
                preview = room.preview(card, point);
              if (!preview) continue;
              const score =
                (preview.removedId >= 0 ? 15 : preview.hitId !== undefined && !preview.blocked ? 12 : 0) -
                preview.damage * 10 -
                ((x - 2) ** 2 + (y - 2) ** 2) * 0.1;
              if (!best || score > best.score)
                best = { card, point, score, damage: preview.damage };
            }
        });
        if (best) {
          room.move(best.card, best.point);
          assert.equal(room.damageAt(room.hero), best.damage);
        }
        if ((!best || room.actions === 0) && !room.finished) {
          const hp = room.health,
            damage = room.damageAt(room.hero);
          room.endTurn();
          assert.equal(room.health, Math.max(0, hp - damage));
        }
        assert.equal(room.hand.length + room.deck.length + room.discard.length, 12);
      }
      if (!room.won) break;
      clears[stage]++;
      toExit(room, run.exit);
      run.advance();
    }
  }
  console.log('Journey clears by room (100 seeds):', clears);
  assert.ok(clears.at(-1) >= 70, `Only ${clears.at(-1)}/100 full journeys cleared`);
});
