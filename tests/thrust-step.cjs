const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:506,height:900}});
 try{
  await page.goto('http://127.0.0.1:1420');
  await page.evaluate(async()=>{
   const {GameSession}=await import('/src/app/GameSession.ts');const {mountBattle}=await import('/src/screens/BattleScreen.ts');
   document.querySelectorAll('#app > .screen-root').forEach(e=>e.remove());
   const session=new GameSession(),r=session.journey.room;window.testRoom=r;
   r.hero=[2,0];r.hand=['thrust','thrust'];r.actions=2;
   r.enemies=[{id:0,kind:'sprout',position:[2,3],health:2,maxHealth:2}];
   const s=mountBattle(document.querySelector('#app'),session,()=>{});s.root.hidden=false;s.enter();
  });
  const idle=()=>page.waitForFunction(()=>document.querySelector('#game').getAttribute('aria-busy')==='false'&&!document.querySelector('#game').classList.contains('dealing-hand'));
  await idle();await page.locator('#hand .card').first().click();
  const step=page.locator('.tile[data-x="2"][data-y="1"]');
  assert.match(await step.getAttribute('class'),/legal/);assert.doesNotMatch(await step.getAttribute('class'),/capture/);
  assert.match(await step.getAttribute('aria-label'),/可移動/);
  await step.hover();await page.screenshot({path:'test-results/thrust-step-preview.png'});await step.click();await idle();
  assert.deepEqual(await page.evaluate(()=>window.testRoom.hero),[2,1]);
  assert.equal(await page.evaluate(()=>window.testRoom.actions),1);
  await page.locator('#hand .card').click();const enemy=page.locator('.tile[data-x="2"][data-y="3"]');
  assert.match(await enemy.getAttribute('class'),/capture/);
  await enemy.hover();await page.screenshot({path:'test-results/thrust-attack-preview.png'});await enemy.click();await idle();
  assert.deepEqual(await page.evaluate(()=>window.testRoom.hero),[2,1]);
  assert.equal(await page.evaluate(()=>window.testRoom.enemies[0].health),1);
  assert.equal(await page.evaluate(()=>window.testRoom.actions),0);
  console.log('Thrust pointer step then stationary attack passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
