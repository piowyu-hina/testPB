const test=require('node:test'),assert=require('node:assert/strict');
const {Room}=require('../src/battle/Room.ts');
const {enemySkill}=require('../src/battle/EnemyRules.ts');
const {enemies}=require('../src/data/enemies.ts');
const {planJourney}=require('./forest-planner.cjs');
const setup=(kind,index=0,hero=[2,0])=>new Room(1,{name:'forest',hero,enemies:[{id:0,kind,position:[2,2],health:8,skillIndex:index}]},5,'qinghe');
test('forest monsters resolve their announced patterns before changing phase',()=>{
  for(const kind of ['sporecap','moth','rootwarden','mossstag'])for(let phase=0;phase<enemies[kind].skills.length;phase++)for(let x=0;x<5;x++)for(let y=0;y<5;y++){
    if(x===2&&y===2)continue;
    const room=setup(kind,phase,[x,y]);const before=room.damageAt(room.hero),enemy=room.enemies[0];
    assert.equal(room.endTurn().damage,before);
    if(!room.lost&&kind!=='mossstag')assert.equal(enemy.skillIndex,(phase+1)%enemies[kind].skills.length);
    if(kind!=='moth'&&kind!=='mossstag')assert.deepEqual(enemy.position,[2,2]);
  }
});
test('boss alternates cross, diagonal, and a genuine safe opening; cannot be pushed',()=>{
  const room=setup('rootwarden',2,[2,1]);
  assert.equal(room.damageAt(room.hero),0);room.endTurn();assert.equal(enemySkill(room.enemies[0]).id,'root-cross');
  assert.equal(room.damageAt(room.hero),2);room.hero=[1,1];assert.equal(room.damageAt(room.hero),0);
  room.endTurn();assert.equal(room.damageAt(room.hero),2);room.hero=[2,1];assert.equal(room.damageAt(room.hero),0);
  room.endTurn();assert.equal(enemySkill(room.enemies[0]).id,'recover');
  room.hand=['repel'];const p=room.preview(0,[2,2]);assert.equal(p.pushBlocked,true);room.move(0,[2,2]);assert.deepEqual(room.enemies[0].position,[2,2]);
});
test('Qinghe forecasts stay equal to resolution for each new enemy and phase',()=>{
  for(const kind of ['sporecap','moth','rootwarden','mossstag'])for(let phase=0;phase<enemies[kind].skills.length;phase++)for(const id of ['advance','thrust','sweep','sidestep','repel'])for(let x=0;x<5;x++)for(let y=0;y<5;y++){
    const room=setup(kind,phase,[2,1]);room.hand=[id];const p=room.preview(0,[x,y]);if(!p)continue;
    room.move(0,[x,y]);assert.deepEqual(room.hero,p.destination);assert.equal(room.damageAt(room.hero),p.damage);
  }
});
test('stag locks charge, travels on a miss, rests, then sweeps with a rear opening',()=>{
  const room=setup('mossstag',0,[1,0]),e=room.enemies[0];e.facing='south';
  room.hand=['sidestep'];room.move(0,[0,0]);assert.equal(e.facing,'south');
  const out=room.endTurn();assert.equal(out.damage,0);assert.deepEqual(e.position,[2,0]);
  assert.deepEqual(out.motions,[{id:0,from:[2,2],to:[2,0]}]);assert.equal(enemySkill(e).id,'recover');
  assert.equal(room.damageAt([1,0]),0);room.hero=[1,0];room.endTurn();assert.equal(enemySkill(e).id,'antler');
  assert.equal(e.facing,'west');assert.equal(room.damageAt([1,0]),1);assert.equal(room.damageAt([3,0]),0);
  const facing=e.facing;room.hero=[3,0];assert.equal(e.facing,facing);
  room.endTurn();assert.equal(enemySkill(e).id,'antler');assert.equal(e.facing,'east');
});
test('stag charge crosses its locked lane without overlapping player or monsters; boss resists push',()=>{
  const room=setup('mossstag',0,[2,0]),e=room.enemies[0];e.facing='south';
  assert.equal(room.endTurn().damage,2);assert.deepEqual(e.position,[2,1]);
  room.hand=['repel'];assert.equal(room.preview(0,[2,1]).pushBlocked,true);
  room.move(0,[2,1]);assert.deepEqual(e.position,[2,1]);
  const blocked=setup('mossstag',0,[0,0]);blocked.enemies.push({id:1,kind:'sporecap',position:[2,0],health:2,skillIndex:1});
  blocked.endTurn();assert.deepEqual(blocked.enemies[0].position,[2,1]);
});
test('stag forecasts match damage in every facing, phase and tile',()=>{
  for(const facing of ['north','east','south','west'])for(let phase=0;phase<3;phase++)for(let x=0;x<5;x++)for(let y=0;y<5;y++){
    if(x===2&&y===2)continue;
    const r=setup('mossstag',phase,[x,y]);r.enemies[0].facing=facing;
    const expected=r.damageAt(r.hero);assert.equal(r.endTurn().damage,expected);
    assert.notDeepEqual(r.hero,r.enemies[0].position);
    assert.ok(r.enemies[0].position.every(n=>n>=0&&n<5));
  }
});
test('six-room Qinghe route is winnable across shuffled starts without shop or debug rewards',()=>{
  let wins=0;for(let seed=1;seed<=50;seed++){const run=planJourney(seed);if(run.won)wins++;}
  console.log(`Qinghe full route: ${wins}/50`);assert.ok(wins>=35);
});
test('no stationary safe tile survives stag targeting in any position, facing or initial phase',()=>{
  let cases=0;
  for(let bx=0;bx<5;bx++)for(let by=0;by<5;by++)for(let x=0;x<5;x++)for(let y=0;y<5;y++){
    if(x===bx&&y===by)continue;
    for(const facing of ['north','east','south','west'])for(let phase=0;phase<3;phase++){
      const r=setup('mossstag',phase,[x,y]);r.enemies[0].position=[bx,by];r.enemies[0].facing=facing;
      let hit=false;
      for(let turn=0;turn<6;turn++){if(r.endTurn().damage){hit=true;break;}}
      assert.ok(hit,JSON.stringify({boss:[bx,by],hero:[x,y],facing,phase}));cases++;
    }
  }
  console.log(`Stationary exploit checks: ${cases} positions/phases/facings`);
});
test('camping the same adjacent side cannot farm recurring free rests',()=>{
  for(const offset of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]){
    const r=setup('mossstag',1,[2+offset[0],2+offset[1]]),e=r.enemies[0];
    r.endTurn();assert.equal(enemySkill(e).id,'antler');
    for(let n=0;n<3;n++){
      r.health=5;assert.equal(r.endTurn().damage,1);assert.equal(enemySkill(e).id,'antler');
      assert.deepEqual(e.position,[2,2]);
    }
  }
});
test('distant diagonal player causes alignment before the next locked charge, without surprise damage',()=>{
  const r=setup('mossstag',1,[4,4]),e=r.enemies[0];e.position=[0,0];
  const out=r.endTurn();assert.equal(out.damage,0);assert.equal(enemySkill(e).id,'charge');
  assert.equal(r.damageAt(r.hero),2);assert.equal(out.motions.length,1);
  const face=e.facing;r.hero=[3,3];assert.equal(e.facing,face);assert.equal(r.damageAt(r.hero),0);
});
