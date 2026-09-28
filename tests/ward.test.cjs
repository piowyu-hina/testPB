const test = require('node:test'), assert = require('node:assert/strict');
const { Room } = require('../src/battle/Room.ts');
const { wardSource, wardStep, enemySkill } = require('../src/battle/EnemyRules.ts');
const { forestRuins } = require('../src/data/dungeons/forest.ts');
const setup = () => {
  const room = new Room(1, { name: 'ward choice', hero: [2, 1], enemies: [
    { id: 0, kind: 'stump', position: [1, 1], health: 3, elite: true, skillIndex: 1, facing: 'south' },
    { id: 1, kind: 'sporecap', position: [2, 2], health: 2, ward: true }
  ] }, 5, 'qinghe');
  room.hand = ['repel', 'thrust', 'sidestep'];
  return room;
};

test('ward protects adjacent allies from all angles, but never itself or other sources', () => {
  const r = setup(), guard = r.enemies[0], source = r.enemies[1];
  assert.equal(r.blocksAttack(guard), true);
  assert.equal(r.blocksAttack(source), false);
  assert.equal(wardSource({ ...guard, ward: true }, r.enemies), undefined);
  assert.equal(enemySkill(source).pattern, 'none');
  guard.position = [0, 0]; assert.equal(wardSource(guard, r.enemies), undefined);
  guard.position = [1, 1];
  r.hand = ['thrust']; const preview = r.preview(0, [1, 1]);
  assert.equal(preview.attackDamage, 0); assert.equal(preview.removedId, -1);
  assert.equal(r.move(0, [1, 1]).dealtDamage, false);
  assert.equal(guard.health, 3); assert.equal(r.actions, 1);
});

test('live fifth-room source sits behind the guard; thrust cannot skip the blocking body', () => {
  const r = new Room(1, forestRuins.rooms[5], 5, 'qinghe');
  assert.equal(r.damageAt(r.hero), 0);
  r.hero = [2, 1]; r.hand = ['thrust'];
  assert.equal(r.preview(0, [2, 3]), null);
  assert.equal(r.preview(0, [2, 2]).blocked, true);
});

test('push-source then attack-guard differs from kill-source: both have a safe retreat', () => {
  const pushed = setup();
  assert.equal(pushed.preview(0, [2, 2]).pushBlocked, false);
  assert.deepEqual(pushed.preview(0, [2, 2]).pushed.to, [2, 3]);
  pushed.move(0, [2, 2]);
  assert.equal(wardSource(pushed.enemies[0], pushed.enemies), undefined);
  assert.equal(pushed.preview(0, [1, 1]).blocked, false);
  pushed.move(0, [1, 1]); pushed.move(0, [3, 0]);
  assert.equal(pushed.enemies[0].health, 2);
  assert.equal(pushed.enemies[1].health, 1);
  assert.equal(pushed.endTurn().damage, 0);
  assert.ok(wardSource(pushed.enemies[0], pushed.enemies), 'source follows only after the enemy turn');

  const killed = setup(); killed.hand = ['thrust', 'thrust', 'sidestep'];
  killed.move(0, [2, 2]); killed.move(0, [2, 2]); killed.move(0, [3, 0]);
  assert.equal(killed.enemies.length, 1);
  assert.equal(killed.enemies[0].health, 3, 'permanent shield removal instead of guard damage');
  assert.equal(killed.endTurn().damage, 0);
  assert.equal(wardSource(killed.enemies[0], killed.enemies), undefined);
});

test('sweep resolves protection simultaneously, then the next card can exploit source death', () => {
  const r = setup(); r.enemies[1].health = 1; r.hand = ['sweep', 'thrust'];
  const p = r.preview(0, r.hero);
  assert.deepEqual(p.removedIds, [1]);
  const a = r.move(0, r.hero);
  assert.equal(a.hits.find(h => h.id === 0).blocked, true);
  assert.equal(r.enemies[0].health, 3);
  assert.equal(r.preview(0, [1, 1]).blocked, false);
});

test('ultimate bypasses a ward, and ward movement never attacks or overlaps occupants', () => {
  const r = setup();
  assert.equal(r.strikeUltimate([-1, 0]).hits[0].blocked, false);
  assert.equal(r.enemies[0].health, 1);
  const source = { id: 1, kind: 'sporecap', ward: true, position: [3, 3] };
  const guard = { id: 0, kind: 'stump', position: [1, 1] };
  const to = wardStep(source, [source, guard], [2, 3]);
  assert.deepEqual(to, [3, 2], 'make progress diagonally with one legal cardinal step');
  assert.deepEqual(wardStep(source, [source, guard, { id: 2, kind: 'sprout', position: [3, 2] }], [2, 3]), [3, 3]);
});
