const {Room}=require('../src/battle/Room.ts');
const {Journey}=require('../src/battle/Journey.ts');
const {choose}=require('./forest-planner.cjs');
const {forestRuins}=require('../src/data/dungeons/forest.ts'); const bossRoom=forestRuins.rooms.at(-1), newBoss=bossRoom.enemies;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const metric=()=>({rooms:0,turns:0,ended:0,cards:0,ultimates:0,hard:0,empty:0,forcedEmpty:0,voluntary:0,leftSoul:0,damage:0,moves:0,lowImpact:0});
const add=(a,b)=>Object.keys(a).forEach(k=>a[k]+=b[k]);
const hp=r=>r.enemies.reduce((n,e)=>n+(e.health??1),0);
const dist=r=>r.enemies.length?Math.min(...r.enemies.map(e=>Math.abs(e.position[0]-r.hero[0])+Math.abs(e.position[1]-r.hero[1]))):0;
function run(seed){
 const j=new Journey(seed,'qinghe'),total=metric(),stages=[],examples=[];
 let timeout=false;
 for(let stage=0;stage<j.total;stage++){
  const r=j.room,m=metric();m.rooms=1;m.turns=1;let played=0,ults=0;
  for(let n=0;n<400&&!r.finished;n++){
   if(r.hand.length>5)throw new Error('Hand overflow seed '+seed); const next=choose(r,j);
   if(next.end){
    const legal=r.hand.some((_,i)=>r.canUseCard(i));
    const ult=j.dawnCharge>=4&&dirs.some(d=>r.dawnRay(d).length);
    const hard=r.actions>0&&!legal&&!ult;
    m.ended++;m.leftSoul+=r.actions;
    if(hard){m.hard++;if(examples.length<2)examples.push({seed,room:stage+1,turn:r.turn,hero:r.hero,hand:r.availableCards.slice(),soul:r.actions});}
    if(!played&&!ults){m.empty++;if(!legal&&!ult)m.forcedEmpty++;}
    if(legal||ult)m.voluntary++;
    const out=r.endTurn();m.damage+=out.damage;
    if(!r.finished)m.turns++;
    played=0;ults=0;
   }else if(next.ultimate){j.spendDawnCharge();r.strikeUltimate(next.ultimate);m.ultimates++;ults++;}
   else{
    const before={hp:hp(r),danger:r.damageAt(r.hero),distance:dist(r),hero:r.hero.slice()};
    const action=r.move(next.card,next.point);if(!action)throw new Error('Illegal planner action');
    j.gainDawnCharge();m.cards++;played++;
    if(before.hero[0]!==r.hero[0]||before.hero[1]!==r.hero[1]){
     m.moves++;
     if(hp(r)>=before.hp&&r.damageAt(r.hero)>=before.danger&&dist(r)>=before.distance)m.lowImpact++;
    }
   }
   if(n===399&&!r.finished)timeout=true;
  }
  stages.push(m);add(total,m);
  if(!r.won)break;
  while(r.hero[0]!==2||r.hero[1]!==4)r.explore(0,[r.hero[0]+Math.sign(2-r.hero[0]),r.hero[1]+Math.sign(4-r.hero[1])]);
  j.advance();
 }
 return{seed,won:j.won,dead:j.room.lost,timeout,total,stages,examples};
}
function batch(old){
 bossRoom.enemies=old?[{id:0,kind:'rootwarden',position:[2,3],health:8,skillIndex:2},{id:1,kind:'sprout',position:[0,3]}]:newBoss;
 const runs=[];for(let seed=1;seed<=1000;seed++)runs.push(run(seed));return runs;
}
try{
 const old=batch(true),current=batch(false);
 function summarize(runs){
  const total=metric(),stages=Array.from({length:6},metric);
  for(const r of runs){add(total,r.total);r.stages.forEach((m,i)=>add(stages[i],m));}
  return{runs:runs.length,wins:runs.filter(r=>r.won).length,deaths:runs.filter(r=>r.dead).length,timeouts:runs.filter(r=>r.timeout).length,runsWithHard:runs.filter(r=>r.total.hard).length,runsWithForcedEmpty:runs.filter(r=>r.total.forcedEmpty).length,total,stages};
 }
 const paired=old.filter((r,i)=>r.won&&current[i].won).map(r=>r.seed-1);
 const result = {method:'same seeds 1..1000, six-room normal route, no shop, 3-card draw/2-soul, unchanged greedy planner; old root boss vs new stag boss; current Qinghe deck in both',old:summarize(old),current:summarize(current),pairedWins:{count:paired.length,old:summarize(paired.map(i=>old[i])),current:summarize(paired.map(i=>current[i]))},examples:current.flatMap(r=>r.examples).slice(0,5)}; console.log(JSON.stringify({method:result.method, old:{wins:result.old.wins,timeouts:result.old.timeouts,boss:result.old.stages[5]},current:{wins:result.current.wins,timeouts:result.current.timeouts,boss:result.current.stages[5]}},null,2));
}finally{bossRoom.enemies=newBoss;}
