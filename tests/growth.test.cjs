const test = require('node:test');
const assert = require('node:assert/strict');
const { Room, HAND_LIMIT } = require('../src/battle/Room.ts');
const { Journey } = require('../src/battle/Journey.ts');
const { freshBuild, cardKind } = require('../src/battle/Growth.ts');
const { loadouts, cards } = require('../src/data/cards.ts');
const target = (extra = {}) => ({ id: 0, kind: 'sprout', position: [2, 2], health: 3, maxHealth: 3, ...extra });
function setup(loadout = 'qinghe', build = freshBuild()) {
  return new Room(4, { name: 'test', hero: [2, 1], enemies: [target(), target({ id: 9, position: [4, 4] })] }, 5, loadout, build);
}
test('sidestep is zero cost and empty-ground-only, including diagonal movement', () => {
  const room = setup(); room.hand = ['sidestep']; room.actions = 0;
  assert.equal(room.canMove(0, [2, 2]), false);
  assert.equal(room.canMove(0, [0, 1]), false);
  assert.deepEqual(room.preview(0, [1, 2]).destination, [1, 2]);
  room.move(0, [1, 2]); assert.deepEqual(room.hero, [1, 2]); assert.equal(room.actions, 0);
});

test('card unavailability distinguishes cost, target and empty destinations without changing state', () => {
  const room=setup();room.hand=['thrust','sweep','repel','sidestep','advance'];room.actions=0;
  const before=JSON.stringify(room);
  assert.equal(room.cardUnavailableReason(0),'energy');
  assert.equal(room.cardUnavailableReason(3),'');
  assert.equal(JSON.stringify(room),before);
  room.actions=2;room.hero=[0,0];
  for(const index of [0,1,2]) assert.equal(room.cardUnavailableReason(index),'enemy');
  room.enemies=[target({position:[0,1]}),target({id:1,position:[1,0]}),target({id:2,position:[1,1]})];
  assert.equal(room.cardUnavailableReason(3),'empty-tile');
  assert.equal(room.cardUnavailableReason(1),'');
  room.hand=['thrust#0'];room.build.engravings['thrust#0']='discount';room.actions=0;
  assert.equal(room.cardUnavailableReason(0),'');
  const rogue=setup('rogue');rogue.hand=['shadow','recall'];
  assert.equal(rogue.cardUnavailableReason(0),'knife');
  rogue.knives=[[2,2]];assert.equal(rogue.cardUnavailableReason(0),'');
  assert.equal(rogue.cardUnavailableReason(1),'empty-knife');
});
test('repel attacks then pushes a survivor without moving hero or rotating intent; forecast follows new tile', () => {
  const room = setup(); room.hand = ['repel']; room.enemies[0].facing = 'east';
  const before = JSON.stringify(room);
  const preview = room.preview(0, [2, 2]);
  assert.equal(JSON.stringify(room), before);
  assert.deepEqual(preview.pushed.to, [2, 3]); assert.equal(preview.damage, 0);
  const action = room.move(0, [2, 2]);
  assert.deepEqual(action.pushed, preview.pushed); assert.deepEqual(room.hero, [2, 1]);
  assert.equal(room.enemies[0].facing, 'east'); assert.equal(room.enemies[0].health, 2);
  assert.equal(room.endTurn().damage, preview.damage);
});
test('repel respects front block, roots, elite, wall and occupied destination independently', () => {
  const cases = [
    { enemy: { kind:'stump', facing:'south' }, hp:3 },
    { enemy: { kind:'stump', skillIndex:1 }, hp:2 },
    { enemy: { elite:true }, hp:2 },
    { enemy: { position:[2,4] }, hero:[2,3], hp:2 },
    { occupied:true, hp:2 }
  ];
  for (const scenario of cases) {
    const room = setup(); Object.assign(room.enemies[0], scenario.enemy); if (scenario.hero) room.hero = scenario.hero;
    if (scenario.occupied) room.enemies[1].position = [2,3];
    room.hand = ['repel']; const point = [...room.enemies[0].position];
    const preview = room.preview(0, point); assert.equal(preview.pushBlocked, true); assert.equal(preview.pushed, undefined);
    room.move(0, point); assert.deepEqual(room.enemies[0].position, point); assert.equal(room.enemies[0].health, scenario.hp);
    assert.equal(room.endTurn().damage, preview.damage);
  }
});
test('recall retrieves only unoccupied knives remotely and grants capped hand rewards', () => {
  const room = setup('rogue'); room.hand = ['recall','throw','shadow','lunge','throw']; room.knives = [[0,4],[2,2]];
  assert.equal(room.canMove(0, [2,2]), false); assert.equal(room.canMove(0, [1,4]), false);
  const result = room.move(0, [0,4]);
  assert.deepEqual(room.hero, [2,1]); assert.deepEqual(room.knives, [[2,2]]);
  assert.equal(room.hand.length, HAND_LIMIT); assert.ok(room.hand.includes('knife')); assert.equal(room.actions,3);
  assert.equal(result.overflowedCards.length,1); assert.ok(room.discard.includes(result.overflowedCards[0]));
});
test('each engraved copy triggers independently; replaying the same copy waits until next turn', () => {
  for (const kind of ['draw','refund','discount']) {
    const build = freshBuild(); build.engravings = {'advance#0':kind,'advance#1':kind};
    const room = setup('qinghe', build); room.hand = ['advance#0','advance#1'];
    room.deck = ['thrust','thrust']; room.discard=[]; room.actions=5;
    assert.equal(room.cardCost(0), kind === 'discount' ? 0 : 1);
    const first = room.move(0,[1,1]);
    assert.equal(first.drawnCards?.length ?? 0, kind === 'draw' ? 1 : 0);
    assert.equal(room.actions, kind === 'draw' ? 4 : 5);
    assert.equal(room.cardCost(0), kind === 'discount' ? 0 : 1);
    const second = room.move(0,[0,1]); assert.equal(second.drawnCards?.length ?? 0,kind === 'draw' ? 1 : 0);
    assert.equal(room.actions, kind === 'draw' ? 3 : 5);
    room.hand=['advance#0']; room.discard=[];
    assert.equal(room.cardCost(0),1);
    assert.equal(room.move(0,[1,1]).drawnCards?.length ?? 0,0);
    assert.equal(room.actions, kind === 'draw' ? 2 : 4);
    room.deck=['thrust','thrust','thrust'];room.endTurn(); room.hand=['advance#0']; assert.equal(room.growthReady('advance#0'),true);
    assert.equal(room.cardCost(0), kind === 'discount' ? 0 : 1);
  }
});

test('an ordinary copy has no engraving, and an engraved card cannot retrigger after a real reshuffle', () => {
  const build=freshBuild();build.engravings['sidestep#0']='draw';
  const room=setup('qinghe',build);room.hand=['sidestep','sidestep#0'];room.deck=[];room.discard=[];
  assert.equal(room.move(0,[1,1]).drawnCards,undefined);
  // Remove the normal discard so the engraved copy is the only card available to reshuffle.
  room.discard=[];
  assert.deepEqual(room.move(0,[0,1]).drawnCards,['sidestep#0']);
  assert.equal(room.move(0,[1,1]).drawnCards,undefined);
  assert.deepEqual(room.discard,['sidestep#0']);
});

test('engraved identities survive overflow, shuffling and drawing', () => {
  const build=freshBuild();build.engravings['sidestep#0']='draw';
  const room=setup('qinghe',build);room.hand=Array(5).fill('advance');room.deck=['sidestep#0'];room.discard=[];
  assert.deepEqual(room.drawCards(1),{drawn:[],overflowed:['sidestep#0']});
  room.hand=[];assert.deepEqual(room.drawCards(1),{drawn:['sidestep#0'],overflowed:[]});
  assert.equal(room.build.engravings[room.hand[0]],'draw');
});
test('relics reward their own cycle once per turn; moving attempts without landing do not trigger', () => {
  const build = freshBuild(); build.relic = true;
  const q = setup('qinghe',build); q.hand=['advance','sidestep','sidestep'];
  assert.equal(q.move(0,[2,2]).drawnCards,undefined);
  assert.equal(q.move(0,[1,1]).drawnCards.length,1);
  assert.equal(q.move(0,[0,1]).drawnCards,undefined);
  const r = setup('rogue',build); r.hand=['recall','recall']; r.knives=[[0,4],[1,4]];
  assert.equal(r.move(0,[0,4]).drawnCards.length,2);
  const second = r.move(0,[1,4]); assert.equal((second.drawnCards?.length??0)+(second.overflowedCards?.length??0),1);
});
test('multi-draw overflow reports every card in order without exceeding five', () => {
  const room=setup(); room.hand=Array(5).fill('advance'); room.deck=['repel','sweep','thrust']; room.discard=[];
  assert.deepEqual(room.drawCards(3), {drawn:[],overflowed:['thrust','sweep','repel']});
  assert.equal(room.hand.length,5); assert.deepEqual(room.discard,['thrust','sweep','repel']);
});
test('shop purchases are atomic, limited to character cards, and never insert generic cards', () => {
  const j=new Journey(1,'qinghe'); const before=[...j.room.hand,...j.room.deck];
  assert.equal(j.buyEngraving('sidestep','refund'),false); assert.equal(j.buyEngraving('throw','draw'),false);
  assert.equal(j.buyEngraving('thrust','discount'),true); assert.equal(j.coins,0);
  assert.equal(j.buyEngraving('thrust','draw'),false); assert.equal(j.buyRelic(),false);
  assert.deepEqual([...j.room.hand,...j.room.deck].map(cardKind),before);
  assert.equal([...j.room.hand,...j.room.deck].filter(ref=>ref==='thrust#0').length,1);
});

test('four sidesteps are purchased individually; no stacking or fifth purchase, including discarded copies', () => {
  const j=new Journey(1,'qinghe');j.coins=30;
  j.room.discard.push(...j.room.hand);j.room.hand=[];
  for(let n=0;n<4;n++) {
    assert.equal(j.buyEngraving('sidestep','draw'),true);
    const pool=[...j.room.hand,...j.room.deck,...j.room.discard];
    assert.equal(pool.filter(ref=>ref==='sidestep').length,3-n);
    assert.equal(pool.filter(ref=>cardKind(ref)==='sidestep'&&ref!=='sidestep').length,n+1);
    assert.equal(new Set(pool.filter(ref=>ref.startsWith('sidestep#'))).size,n+1);
  }
  assert.equal(j.coins,18);assert.equal(j.buyEngraving('sidestep','draw'),false);assert.equal(j.coins,18);
  const k=new Journey(2,'qinghe');k.coins=30;
  assert.equal(k.buyEngraving('advance','draw'),true);assert.equal(k.buyEngraving('advance','discount'),true);
  assert.deepEqual(k.build.engravings,{'advance#0':'draw','advance#1':'discount'});
});
test('clear rewards are one-time, builds follow their character and new rooms receive opening buff', () => {
  const j=new Journey(1,'qinghe'); j.coins=20; j.buyOpening(); j.buyRelic(); j.buyEngraving('thrust','draw');
  assert.equal(j.coins,9); j.room.enemies=[]; assert.equal(j.claimClearReward(),3); assert.equal(j.claimClearReward(),0);
  j.room.hero=[...j.exit]; j.advance(); assert.equal(j.coins,12); assert.equal(j.room.hand.length,4);
  assert.equal([...j.room.hand,...j.room.deck].filter(ref=>ref==='thrust#0').length,1);
  j.setLoadout('rogue'); assert.equal(j.room.build.relic,false); assert.equal(j.room.build.opening,false);
  for (const id of loadouts.rogue) assert.equal([...j.room.hand,...j.room.deck,...j.room.discard].filter(c=>c===id).length,cards[id].copies);
  j.setLoadout('qinghe'); assert.equal(j.room.build.relic,true); assert.equal(j.room.build.engravings['thrust#0'],'draw');
  assert.equal([...j.room.hand,...j.room.deck].filter(ref=>ref==='thrust#0').length,1);
  assert.equal(new Journey(1,'qinghe').build.relic,false);
});
