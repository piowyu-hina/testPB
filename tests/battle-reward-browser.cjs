const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const p=await browser.newPage({viewport:{width:506,height:900}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const idle=()=>p.waitForFunction(()=>document.querySelector('#game').getAttribute('aria-busy')==='false'&&!document.querySelector('#game').classList.contains('dealing-hand'));
 const enter=async()=>{await p.locator('#open-dungeons').click();await p.locator('.screen-curtain').waitFor({state:'hidden'});await p.locator('#start-game').click();await p.locator('.screen-curtain').waitFor({state:'hidden'});};
 try{
  await p.goto('http://127.0.0.1:1420');await enter();await idle();
  await p.locator('[data-test-action=reward]').click();await idle();
  await p.locator('.battle-reward-page').waitFor({state:'visible'});
  const before=await p.locator('.battle-reward-choice').evaluateAll(es=>es.map(e=>e.dataset.reward));
  assert.equal(before.length,3);
  assert.equal(await p.locator('.battle-reward-page').evaluate(e=>e.scrollHeight>e.clientHeight||e.scrollWidth>e.clientWidth),false);
  await p.screenshot({path:'test-results/battle-reward-choice.png'});
  await p.locator('.battle-reward-page > .quiet-button').click();await p.locator('.screen-curtain').waitFor({state:'hidden'});
  await enter();await idle();
  assert.deepEqual(await p.locator('.battle-reward-choice').evaluateAll(es=>es.map(e=>e.dataset.reward)),before);
  await p.locator('.battle-reward-choice').first().click();assert.equal(await p.locator('.battle-reward-page').isVisible(),false);
  for(let i=0;i<4;i++){await idle();if(!await p.locator('#hand .selected').count())await p.locator('#hand .card').click();await p.locator('.tile[data-x="2"][data-y="'+(i+1)+'"]').click();}
  await idle();assert.equal(await p.locator('#journey-progress-label').textContent(),'3 / 6');
  await p.locator('#open-deck').click();assert.ok((await p.locator('.deck-growth').textContent()).length>0);
  assert.deepEqual(errors,[]);console.log('Reward choice, no scroll, home/resume stable offers and third-room carry passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
