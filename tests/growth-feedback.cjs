const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
  const browser=process.env.TESTPB_CDP?await chromium.connectOverCDP(process.env.TESTPB_CDP):await chromium.launch({channel:'chrome',headless:true});
  const page=process.env.TESTPB_CDP?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:506,height:900}});
  const idle=()=>page.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#game')?.classList.contains('dealing-hand'));
  try{
    await page.goto('http://127.0.0.1:1420');await page.evaluate(async()=>{
      const {GameSession}=await import('/src/app/GameSession.ts');const {mountBattle}=await import('/src/screens/BattleScreen.ts');
      document.querySelectorAll('#app > .screen-root').forEach(e=>{e.hidden=true;e.remove();});
      const session=new GameSession(),r=session.journey.room;r.hero=[2,1];r.actions=2;
      r.hand=['sidestep#0','advance#0','thrust#0'];r.deck=['sweep','advance','repel'];r.discard=[];
      r.build.engravings={'sidestep#0':'draw','advance#0':'refund','thrust#0':'discount'};
      r.enemies=[{id:0,kind:'sprout',position:[2,2],health:3,maxHealth:3}];
      const screen=mountBattle(document.querySelector('#app'),session,()=>{});screen.root.hidden=false;screen.enter();
      window.growthEvents=[];new MutationObserver(records=>{for(const record of records)for(const n of record.addedNodes){
        if(n instanceof Element&&n.matches('.growth-trigger'))window.growthEvents.push({kind:n.dataset.trigger,time:performance.now(),energy:document.querySelector('#energy-count').dataset.value});
        if(record.target.id==='hand'&&n instanceof Element&&n.matches('.card-entering'))window.growthEvents.push({kind:'deal',time:performance.now()});
      }}).observe(screen.root,{subtree:true,childList:true});
    });await idle();
    for(const [id,kind,x,y] of [['sidestep','draw',1,1],['advance','refund',2,1],['thrust','discount',2,2]]){
      await page.locator(`#hand [data-card="${id}"]`).first().click();await page.locator(`.tile[data-x="${x}"][data-y="${y}"]`).click();
      await page.locator(`.growth-trigger[data-trigger="${kind}"]`).waitFor({state:'visible'});
      await page.waitForTimeout(80);await page.screenshot({path:`test-results/growth-feedback-${kind}.png`});await idle();
      assert.equal(await page.locator('#energy-count').getAttribute('data-value'),'2');
      assert.equal(await page.locator('.growth-trigger').count(),0);
    }
    const events=await page.evaluate(()=>window.growthEvents);assert.deepEqual(events.filter(e=>e.kind!=='deal').map(e=>e.kind),['draw','refund','discount']);
    assert.equal(events.find(e=>e.kind==='refund').energy,'1');
    assert.ok(events.find(e=>e.kind==='draw').time<events.find(e=>e.kind==='deal').time);
    console.log('Growth draw/refund/discount: exactly one cue, draw follows cue, energy spent then restored passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
