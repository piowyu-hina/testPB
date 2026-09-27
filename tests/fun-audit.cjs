// Diagnostic, not a human enjoyment score. Same immediate-preview policy each run.
const {Journey}=require('../src/battle/Journey.ts');
const {choose}=require('./forest-planner.cjs');
function audit(count=200){
 const runs=[];
 for(let i=1;i<=count;i++){
  const j=new Journey(Math.imul(i,145678901)>>>0,'qinghe');
  const m={won:false,damage:0,turns:0,cards:0,ultimate:0,emptyTurns:0,reward:'',rewardSeen:0,rewardPlayed:0,rewardTriggered:0};
  for(let stage=0;stage<6;stage++){
   const r=j.room,seen=new Set();let acted=0;m.turns++;
   for(let n=0;n<180&&!r.finished;n++){
    if(r.hand.some(ref=>r.build.rewards[ref])&&!seen.has(r.turn)){m.rewardSeen++;seen.add(r.turn);}
    const next=choose(r,j);
    if(next.end){if(!acted)m.emptyTurns++;m.damage+=r.endTurn().damage;m.turns++;acted=0;}
    else if(next.ultimate){j.spendDawnCharge();r.strikeUltimate(next.ultimate);m.ultimate++;acted++;}
    else{
     const reward=r.build.rewards[r.hand[next.card]],p=r.preview(next.card,next.point);
     const a=r.move(next.card,next.point);j.gainDawnCharge(a);m.cards++;acted++;
     if(reward){m.rewardPlayed++;if((p.attackDamage??1)>1||(reward==='pursuit'&&a.drawnCards?.length)||(reward==='whirlwind'&&a.growth?.includes('refund')))m.rewardTriggered++;}
    }
   }
   if(!r.won)break;
   while(r.hero[0]!==2||r.hero[1]!==4)r.explore(0,[r.hero[0]+Math.sign(2-r.hero[0]),r.hero[1]+Math.sign(4-r.hero[1])]);
   if(j.pendingBattleReward){m.reward=j.battleRewardOptions[0];j.chooseBattleReward(m.reward);}
   j.advance();
  }
  m.won=j.won;runs.push(m);
 }
 const mean=k=>+(runs.reduce((s,r)=>s+r[k],0)/count).toFixed(3);
 return {method:'200 spaced seeds, first offered single-card upgrade, no shop, unchanged greedy policy; not human fun',runs:count,wins:runs.filter(r=>r.won).length,noDamage:runs.filter(r=>!r.damage).length,neverTriggered:runs.filter(r=>!r.rewardTriggered).length,avg:Object.fromEntries(['damage','turns','cards','ultimate','emptyTurns','rewardSeen','rewardPlayed','rewardTriggered'].map(k=>[k,mean(k)])),byReward:Object.fromEntries(['reach','pursuit','collision','whirlwind'].map(k=>{const a=runs.filter(r=>r.reward===k);return[k,{runs:a.length,neverTriggered:a.filter(r=>!r.rewardTriggered).length,triggers:a.reduce((s,r)=>s+r.rewardTriggered,0)}]}))};
}
module.exports={audit};
if(require.main===module)console.log(JSON.stringify(audit(),null,2));
