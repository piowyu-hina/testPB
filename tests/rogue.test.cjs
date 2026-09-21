const test = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('../src/battle/Room.ts');
const { Journey } = require('../src/battle/Journey.ts');
const enemy = (id, position, kind = 'sprout', extra = {}) => ({ id, position, kind, health: 1, ...extra });
function room() { const r = new Room(1, undefined, 5, 'rogue'); r.hero = [2, 0]; return r; }

test('throw is stationary, cardinal, first enemy only, keeps multiple knives after kills', () => {
  const r = room(); r.enemies = [enemy(0, [2, 2]), enemy(1, [2, 4]), enemy(2, [4, 0])];
  r.hand = ['throw', 'throw'];
  assert.equal(r.canMove(0, [2, 4]), false);
  assert.equal(r.canMove(0, [3, 1]), false);
  assert.equal(r.canMove(0, [1, 0]), false);
  assert.deepEqual(r.preview(0, [2, 2]).destination, [2, 0]);
  r.move(0, [2, 2]); r.move(0, [4, 0]);
  assert.deepEqual(r.hero, [2, 0]);
  assert.deepEqual(r.knives, [[2, 2], [4, 0]]);
  assert.equal(r.actions, 0);
});
test('front block leaves knife but neither kills nor duplicates a knife on same tile', () => {
  const r = room(); r.enemies = [enemy(0, [2, 2], 'stump', { facing: 'south' }), enemy(1, [4, 4])];
  r.hand = ['throw', 'throw']; r.move(0, [2, 2]); r.move(0, [2, 2]);
  assert.equal(r.enemies[0].health, 1);
  assert.deepEqual(r.knives, [[2, 2]]);
});
test('shadow obeys queen paths, can attack only knife tile, failed attacks do not recover', () => {
  const r = room(); r.enemies = [enemy(0, [2, 2], 'stump', { facing: 'south' }), enemy(1, [4, 4])];
  r.hand = ['shadow'];
  assert.equal(r.canMove(0, [2, 2]), false);
  r.knives = [[2, 2]];
  assert.equal(r.canMove(0, [2, 3]), false);
  assert.equal(r.canMove(0, [3, 2]), false);
  r.move(0, [2, 2]);
  assert.deepEqual(r.hero, [2, 0]);
  assert.deepEqual(r.knives, [[2, 2]]);
  assert.deepEqual(r.hand, []);
});
test('last paid action collects a free temporary knife; it remains usable at zero actions', () => {
  const r = room(); r.enemies = [enemy(0, [2, 2]), enemy(1, [2, 3])];
  r.move(0, [2, 2]);
  r.move(0, [2, 2]);
  assert.equal(r.actions, 0);
  assert.deepEqual(r.hand, ['whirl', 'knife']);
  assert.equal(r.canUseCard(0), false);
  assert.equal(r.hasPlayableCard(), true);
  assert.equal(r.canMove(1, [2, 3]), true);
  r.move(1, [2, 3]);
  assert.equal(r.actions, 0);
  assert.equal(r.hand.includes('knife'), false);
  assert.equal(r.discard.includes('knife'), false);
});
test('nonlethal shadow strike leaves knife; lethal strike lands and recovers it', () => {
  const r = room(); r.hero = [1, 2]; r.knives = [[2, 2]];
  r.enemies = [enemy(0, [2, 2], 'stump', { facing: 'south', health: 2 }), enemy(1, [4, 4])];
  r.hand = ['shadow', 'shadow'];
  r.move(0, [2, 2]); assert.deepEqual(r.hero, [1, 2]); assert.equal(r.knives.length, 1);
  r.move(0, [2, 2]); assert.deepEqual(r.hero, [2, 2]); assert.deepEqual(r.knives, []);
  assert.deepEqual(r.hand, ['knife']); assert.equal(r.actions, 0);
});
test('manual end expires knives but preserves ground tokens; next room starts without tokens', () => {
  const r = room(); r.hand = ['knife', 'whirl']; r.knives = [[4, 4]];
  r.endTurn();
  assert.equal([...r.hand, ...r.deck, ...r.discard].includes('knife'), false);
  assert.deepEqual(r.knives, [[4, 4]]);
  const j = new Journey(1, 'rogue'); j.room.knives = [[1, 1]]; j.room.enemies = []; j.room.hero = [2, 4];
  assert.equal(j.advance(), true); assert.deepEqual(j.room.knives, []);
  assert.deepEqual(j.room.hand, ['throw', 'shadow', 'whirl']);
});
test('all-unusable includes remaining actions but no targets; zero-cost knife can chain pickups', () => {
  const r = room(); r.hand = ['throw']; r.enemies = [enemy(0, [3, 2])];
  assert.equal(r.hasPlayableCard(), false);
  r.hand = ['knife']; r.actions = 0; r.knives = [[3, 0]];
  r.move(0, [3, 0]); assert.deepEqual(r.hand, ['knife']); assert.deepEqual(r.knives, []);
  r.move(0, [4, 0]); assert.deepEqual(r.hand, []); assert.equal(r.hasPlayableCard(), false);
});
test('rogue previews match actual landing, removal and damage without mutations', () => {
  for (const id of ['throw','shadow','whirl','knife']) for (let y=0;y<5;y++) for(let x=0;x<5;x++) {
    const r=room(); r.hand=[id]; r.knives=[[2,2],[3,1]];
    const before=JSON.stringify(r), preview=r.preview(0,[x,y]);
    assert.equal(JSON.stringify(r),before);
    if(!preview) continue;
    r.move(0,[x,y]); assert.deepEqual(r.hero,preview.destination);
    assert.equal(r.damageAt(r.hero),preview.damage);
    if(preview.removedId>=0) assert.ok(!r.enemies.some(e=>e.id===preview.removedId));
  }
});
