const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});
 const p=await b.newPage({viewport:{width:506,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const idle=()=>p.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#game')?.classList.contains('dealing-hand'));
 try{
  for(const reward of ['pursuit','whirlwind','reach','collision']){
   await p.goto('http://127.0.0.1:1420');
   await p.evaluate(async reward=>{
    const {GameSession}=await import('/src/app/GameSession.ts'),{mountBattle}=await import('/src/screens/BattleScreen.ts');
    document.querySelectorAll('#app > .screen-root').forEach(e=>e.remove());
    const s=new GameSession(),r=s.journey.room,id=reward==='whirlwind'?'sweep':reward==='collision'?'repel':'thrust';
    r.hero=[2,1];r.hand=[id+'#0','sidestep','thrust'];r.deck=['advance','advance'];r.discard=[];r.actions=2;
    r.build.rewards={[id+'#0']:reward};r.enemies=[{id:0,kind:'sprout',position:[2,2],health:3,maxHealth:3},{id:1,kind:'sprout',position:[4,4],health:1}];
    window.rewardTestSession=s;
    const screen=mountBattle(document.querySelector('#app'),s,()=>{});screen.root.hidden=false;screen.enter();
   },reward);
   await idle();await p.locator('#hand [data-reward-face]').click();
   const tile=reward==='pursuit'?[1,1]:reward==='whirlwind'?[2,1]:[2,2];
   await p.locator(`.tile[data-x="${tile[0]}"][data-y="${tile[1]}"]`).click();await idle();
   const state=await p.evaluate(()=>{const s=window.rewardTestSession,r=s.journey.room;return{hand:r.hand.length,energy:r.actions,charge:s.journey.dawnCharge,hp:r.enemies[0].health};});
   if(reward==='pursuit'){assert.equal(state.hand,3);assert.equal(state.charge,0);}
   else if(reward==='whirlwind'){assert.equal(state.energy,2);assert.equal(state.charge,1);assert.equal(state.hp,2);}
   else {assert.equal(state.hp,1);assert.equal(state.charge,1);}
   await p.screenshot({path:`test-results/reward-gameplay-${reward}.png`});
   console.log(reward,state);
  }
  assert.deepEqual(errors,[]);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
