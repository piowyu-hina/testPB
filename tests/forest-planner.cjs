const {Room}=require('../src/battle/Room.ts');
const {Journey}=require('../src/battle/Journey.ts');
function choose(room,journey) {
  if(journey?.dawnCharge>=4) {
    const options=[[1,0],[-1,0],[0,1],[0,-1]].map(direction=>({direction,hits:room.dawnRay(direction)}));
    options.sort((a,b)=>b.hits.reduce((n,e)=>n+Math.min(2,e.health),0)-a.hits.reduce((n,e)=>n+Math.min(2,e.health),0));
    if(options[0].hits.length)return {ultimate:options[0].direction};
  }
  let best;
  for(let card=0;card<room.hand.length;card++)for(let x=0;x<5;x++)for(let y=0;y<5;y++){
    const point=[x,y],p=room.preview(card,point);if(!p)continue;
    const kills=p.removedIds?.length??Number(p.removedId>=0);
    const hits=room.availableCards[card]==='sweep'?room.enemies.filter(e=>Math.max(Math.abs(e.position[0]-room.hero[0]),Math.abs(e.position[1]-room.hero[1]))===1).length:Number(p.hitId!==undefined&&!p.blocked);
    const remaining=room.enemies.filter(e=>!(p.removedIds??[p.removedId]).includes(e.id));
    const proximity=remaining.length?Math.min(...remaining.map(e=>Math.abs(e.position[0]-p.destination[0])+Math.abs(e.position[1]-p.destination[1]))):0;
    const score=kills*22+hits*12-p.damage*22-proximity*.7;
    if(!best||score>best.score)best={card,point,score};
  }
  if(best&&best.score>=-room.damageAt(room.hero)*22-6)return best;
  return {end:true};
}
function planJourney(seed=1) {
  const journey=new Journey(seed,'qinghe'), rooms=[];
  for(let stage=0;stage<journey.total;stage++) {
    const room=journey.room,steps=[];
    for(let n=0;n<180&&!room.finished;n++) {
      const next=choose(room,journey);steps.push(next);
      if(next.ultimate){journey.spendDawnCharge();room.strikeUltimate(next.ultimate);}
      else if(next.end)room.endTurn();
      else {room.move(next.card,next.point);journey.gainDawnCharge();}
    }
    rooms.push({name:journey.definition.name,won:room.won,health:room.health,turns:room.turn,steps});
    if(!room.won)break;
    while(room.hero[0]!==2||room.hero[1]!==4){room.explore(0,[room.hero[0]+Math.sign(2-room.hero[0]),room.hero[1]+Math.sign(4-room.hero[1])]);}
    journey.advance();
  }
  return {won:journey.won,rooms};
}
module.exports={choose,planJourney};
if(require.main===module){const wins=Array(6).fill(0),turns=Array(6).fill(0);for(let seed=1;seed<=100;seed++){const run=planJourney(seed);run.rooms.forEach((r,i)=>{wins[i]+=Number(r.won);turns[i]+=r.turns;});}console.log({wins,turns});}
