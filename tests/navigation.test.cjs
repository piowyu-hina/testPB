const test = require('node:test');
const assert = require('node:assert/strict');
const { ScreenManager } = require('../src/app/ScreenManager.ts');
const { GameSession } = require('../src/app/GameSession.ts');

test('navigation supports a third screen, prevents leaving during animation, and avoids duplicate entry', () => {
  const calls = [];
  let busy = false;
  const screen = (name) => ({
    root: { hidden: false },
    enter: () => calls.push(`enter:${name}`),
    leave: () => calls.push(`leave:${name}`)
  });
  const screens = { village: screen('village'), guild: screen('guild'), battle: screen('battle') };
  screens.battle.canLeave = () => !busy;
  const navigation = new ScreenManager(screens);
  const visible = () => Object.keys(screens).filter(id => !screens[id].root.hidden);
  assert.deepEqual(visible(), []);
  navigation.go('village');
  navigation.go('guild');
  navigation.go('battle');
  const count = calls.length;
  navigation.go('battle');
  assert.equal(calls.length, count);
  busy = true;
  assert.equal(navigation.go('village'), false);
  assert.deepEqual(visible(), ['battle']);
  assert.equal(calls.length, count);
  busy = false;
  navigation.go('village');
  assert.deepEqual(visible(), ['village']);
  assert.deepEqual(calls, ['enter:village', 'leave:village', 'enter:guild', 'leave:guild', 'enter:battle', 'leave:battle', 'enter:village']);
  assert.throws(() => navigation.go('missing'), /Unknown screen/);
  assert.deepEqual(visible(), ['village']);
});

test('session preserves battle and cleared-room progress across entries; defeat and final victory start fresh', () => {
  const session = new GameSession();
  assert.equal(session.canResume, false);
  const journey = session.enterJourney();
  journey.room.move(2, [2, 2]);
  const hand = [...journey.room.hand];
  assert.equal(session.canResume, true);
  assert.equal(session.enterJourney(), journey);
  assert.deepEqual(session.journey.room.hand, hand);
  journey.room.enemies = [];
  assert.equal(session.enterJourney(), journey);
  assert.equal(session.canResume, true);
  journey.room.health = 0;
  assert.equal(session.canResume, false);
  const fresh = session.enterJourney();
  assert.notEqual(fresh, journey);
  assert.equal(fresh.room.health, 5);
  fresh.stage = fresh.total - 1;
  fresh.room.enemies = [];
  assert.equal(session.canResume, false);
  assert.notEqual(session.enterJourney(), fresh);
  assert.equal(session.journey.stage, 0);
});
