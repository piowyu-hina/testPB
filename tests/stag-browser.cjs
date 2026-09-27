const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:506,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:1420');
  await page.evaluate(async()=>{
   const {GameSession}=await import('/src/app/GameSession.ts');const {mountBattle}=await import('/src/screens/BattleScreen.ts');
   document.querySelectorAll('#app > .screen-root').forEach(e=>e.remove());
   const session=new GameSession();const r=session.journey.room;window.testRoom=r;
   r.hero=[2,0];r.enemies=[{id:0,kind:'mossstag',position:[1,4],health:8,maxHealth:8,facing:'south'}];
   r.hand=['sidestep','thrust','repel'];
   const s=mountBattle(document.querySelector('#app'),session,()=>{});s.root.hidden=false;s.enter();
  });
  const idle=()=>page.waitForFunction(()=>document.querySelector('#game').getAttribute('aria-busy')==='false'&&!document.querySelector('#game').classList.contains('dealing-hand'));
  const hoverBoss=async()=>{const r=await page.locator('[data-kind="mossstag"]').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);};
  await idle();await hoverBoss();
  assert.match(await page.locator('#tile-info').textContent(),/衝撞/);
  await page.screenshot({path:'test-results/stag-charge.png'});
  await page.locator('#end-turn').click();await idle();
  assert.deepEqual(await page.evaluate(()=>window.testRoom.enemies[0].position),[1,0]);
  assert.equal(await page.locator('[data-kind="mossstag"]').getAttribute('data-skill'),'recover');
  await hoverBoss();await page.screenshot({path:'test-results/stag-rest.png'});
  await page.locator('#end-turn').click();await idle();await hoverBoss();
  assert.equal(await page.locator('[data-kind="mossstag"]').getAttribute('data-skill'),'antler');
  await page.screenshot({path:'test-results/stag-antler.png'});
  await page.locator('#end-turn').click();await idle();
  assert.equal(await page.locator('[data-kind="mossstag"]').getAttribute('data-skill'),'antler');
  assert.equal(await page.evaluate(()=>window.testRoom.health),4);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('Stag pointer inspection, charge travel, rest, antler and viewport passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
