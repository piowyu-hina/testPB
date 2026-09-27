const test = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('../src/battle/Room.ts');
const { Journey } = require('../src/battle/Journey.ts');

const enemy = (id, position, extra = {}) => ({ id, position, kind: 'sprout', health: 1, ...extra });
function room() {
  const result = new Room(1, undefined, 5, 'qinghe');
  result.hero = [2, 1];
  result.enemies = [enemy(0, [4, 4])];
  result.hand = ['advance', 'thrust', 'sweep'];
  return result;
}

test('Qinghe starts with three cards drawn from a shuffled full deck and no rogue state', () => {
  const result = new Room(1, undefined, 5, 'qinghe');
  assert.equal(result.hand.length, 3);
  assert.equal(result.deck.length, 15);
  for (const [id, copies] of Object.entries({ advance: 3, thrust: 5, sweep: 4, sidestep: 4, repel: 2 }))
    assert.equal([...result.hand, ...result.deck].filter(card => card === id).length, copies);
  assert.notDeepEqual(result.hand, ['advance', 'thrust', 'sweep']);
  assert.deepEqual(new Room(1, undefined, 5, 'qinghe').hand, result.hand);
  assert.notDeepEqual(new Room(2, undefined, 5, 'qinghe').hand, result.hand);
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

test('sweep damages all eight adjacent tiles but not distant monsters, with matching preview', () => {
  const result = room();
  result.hero = [2, 2];
  result.hand = ['sweep'];
  result.enemies = [enemy(0, [2, 3]), enemy(1, [3, 2]), enemy(2, [1, 1]), enemy(3, [0, 0])];
  assert.equal(result.canMove(0, [2, 2]), true);
  assert.equal(result.canMove(0, [1, 1]), true);
  assert.equal(result.canMove(0, [0, 0]), false);
  const preview = result.preview(0, [2, 2]);
  assert.deepEqual(preview.removedIds.sort(), [0, 1, 2]);
  assert.deepEqual(preview.destination, [2, 2]);
  for (const point of [[1, 1], [1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2], [3, 3]])
    assert.deepEqual(result.preview(0, point), preview);
  const action = result.move(0, [3, 3]);
  assert.deepEqual(action.to, [2, 2]);
  assert.deepEqual(action.hits.filter(hit => hit.removed).map(hit => hit.id).sort(), [0, 1, 2]);
  assert.deepEqual(result.enemies.map(monster => monster.id), [3]);
  assert.deepEqual(result.hero, [2, 2]);
});

test('thrust can spend one soul on one empty cardinal step, never diagonal or two empty tiles', () => {
  const result = room(); result.hand = ['thrust'];
  assert.equal(result.canMove(0, [3, 2]), false);
  assert.equal(result.canMove(0, [2, 3]), false);
  for (const point of [[2, 2], [1, 1], [3, 1], [2, 0]]) assert.equal(result.canMove(0, point), true);
  const preview = result.preview(0, [2, 2]);
  assert.deepEqual(preview.destination, [2, 2]);
  const action = result.move(0, [2, 2]);
  assert.equal(action.hitId, undefined);
  assert.deepEqual(result.hero, preview.destination);
  assert.equal(result.actions, 1);
  assert.equal(result.hand.length, 0);
  assert.equal(result.enemies.length, 1);
});

test('sweep checks front guards for each neighboring monster independently', () => {
  const result = room();
  result.hero = [2, 2];
  result.hand = ['sweep'];
  result.enemies = [
    enemy(0, [2, 3], { kind: 'stump', facing: 'south' }),
    enemy(1, [3, 2])
  ];
  const preview = result.preview(0, [2, 2]);
  assert.equal(preview.blocked, false);
  assert.deepEqual(preview.removedIds, [1]);
  const action = result.move(0, [2, 2]);
  assert.deepEqual(action.hits.map(hit => [hit.id, hit.blocked, hit.removed]), [[0, true, false], [1, false, true]]);
  assert.deepEqual(result.enemies.map(monster => monster.id), [0]);
});

test('sweep needs an adjacent monster and cannot consume a card on an empty ring', () => {
  const result = room();
  result.hand = ['sweep'];
  assert.equal(result.canUseCard(0), false);
  assert.equal(result.preview(0, result.hero), null);
  assert.equal(result.move(0, result.hero), null);
  assert.deepEqual(result.hand, ['sweep']);
  assert.equal(result.actions, 2);
});

test('thrust reaches two cardinal tiles but not through a monster', () => {
  const result = room();
  result.enemies = [enemy(0, [2, 2]), enemy(1, [2, 3])];
  assert.equal(result.canMove(1, [2, 3]), false);
  assert.equal(result.canMove(1, [2, 2]), true);
  assert.equal(result.canMove(1, [3, 2]), false);
});

test('Qinghe ultimate pierces a straight ray without moving or respecting front guard', () => {
  const journey = new Journey(1, 'qinghe');
  journey.room.hero = [2, 1];
  journey.room.enemies = [enemy(0, [2, 2], { health: 2, maxHealth: 2, kind: 'stump', facing: 'south' }), enemy(1, [2, 4]), enemy(2, [3, 3])];
  assert.equal(journey.gainAssassination(true), 0);
  journey.dawnCharge = 4;
  assert.equal(journey.dawnCharge, 4);
  assert.equal(journey.room.hand.includes('dawnSpear'), false);
  assert.equal(journey.room.strikeUltimate([1, 1]), null);
  const action = journey.room.strikeUltimate([0, 1]);
  assert.deepEqual(action.hits.map(hit => [hit.id, hit.blocked, hit.removed]), [[0, false, true], [1, false, true]]);
  assert.equal(journey.spendDawnCharge(), true);
  assert.equal(journey.dawnCharge, 0);
  assert.deepEqual(journey.room.enemies.map(monster => monster.id), [2]);
  assert.deepEqual(journey.room.hero, [2, 1]);
  assert.deepEqual(journey.room.knives, []);
});

test('Qinghe charge persists across turns without taking a hand slot', () => {
  const journey = new Journey(1, 'qinghe');
  journey.dawnCharge = 4;
  journey.room.endTurn();
  assert.equal(journey.dawnCharge, 4);
  assert.equal(journey.room.hand.includes('dawnSpear'), false);
});

test('dawn charges actual normal attacks, not movement loops, blocks or ultimate damage',()=>{
 const j=new Journey(1,'qinghe'),r=j.room;r.hero=[2,1];r.actions=9;
 r.enemies=[enemy(0,[2,2],{health:20,maxHealth:20,kind:'stump',facing:'south'}),enemy(1,[4,4])];
 r.hand=['sidestep','sidestep'];j.gainDawnCharge(r.move(0,[1,1]));j.gainDawnCharge(r.move(0,[2,1]));assert.equal(j.dawnCharge,0);
 r.hand=['thrust'];j.gainDawnCharge(r.move(0,[2,2]));assert.equal(j.dawnCharge,0);
 r.enemies[0].facing='north';r.hand=['thrust'];j.gainDawnCharge(r.move(0,[2,2]));assert.equal(j.dawnCharge,1);
 r.enemies.push(enemy(2,[1,1],{health:10,maxHealth:10}));r.hand=['sweep'];j.gainDawnCharge(r.move(0,r.hero));assert.equal(j.dawnCharge,2);
 j.gainDawnCharge(r.strikeUltimate([0,1]));assert.equal(j.dawnCharge,2);
 r.hand=['thrust','thrust','thrust'];for(let n=0;n<3;n++)j.gainDawnCharge(r.move(0,[2,2]));assert.equal(j.dawnCharge,4);
 r.enemies=[];r.hero=[2,4];j.advance();assert.equal(j.dawnCharge,4);
 j.setLoadout('rogue');assert.equal(j.dawnCharge,0);
});

test('dawn targeting accepts every in-board tile on a cardinal ray, not diagonals or self', () => {
  const result = room();
  result.hero = [2, 2];
  assert.deepEqual(result.dawnDirectionTo([2, 4]), [0, 1]);
  assert.deepEqual(result.dawnDirectionTo([4, 2]), [1, 0]);
  assert.deepEqual(result.dawnDirectionTo([2, 0]), [0, -1]);
  assert.deepEqual(result.dawnDirectionTo([0, 2]), [-1, 0]);
  assert.equal(result.dawnDirectionTo([2, 2]), null);
  assert.equal(result.dawnDirectionTo([3, 3]), null);
  assert.equal(result.dawnDirectionTo([2, 5]), null);
});

test('Qinghe ultimate works at full hand without replacing or spending cards', () => {
  const journey = new Journey(1, 'qinghe');
  journey.room.hand = ['advance', 'thrust', 'sweep', 'advance', 'thrust'];
  const hand = [...journey.room.hand];
  journey.dawnCharge = 4;
  assert.ok(journey.room.strikeUltimate([0, 1]));
  assert.equal(journey.spendDawnCharge(), true);
  assert.deepEqual(journey.room.hand, hand);
  assert.equal(journey.spendDawnCharge(), false);
  journey.setLoadout('rogue');
  assert.equal(journey.dawnCharge, 0);
});
