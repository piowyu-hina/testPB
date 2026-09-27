const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {planJourney}=require('./forest-planner.cjs');
(async()=>{
  const native=process.env.TESTPB_CDP;
  const browser=native?await chromium.connectOverCDP(native):await chromium.launch({channel:'chrome',headless:true});
  const page=native?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:506,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const idle=()=>page.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#game')?.classList.contains('dealing-hand'));
  const tile=(x,y)=>page.locator(`.tile[data-x="${x}"][data-y="${y}"]`);
  const hoverActor=async actor=>{const r=await actor.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);};
  const screenshot=async name=>{await page.screenshot({path:`test-results/forest-${native?'native':'browser'}-${name}.png`});};
  try{
    await page.addInitScript(()=>{Math.random=()=>1/4294967296;});
    await page.goto('http://127.0.0.1:1420');
    await page.locator('#open-dungeons').click();await page.locator('.screen-curtain').waitFor({state:'hidden'});
    assert.match(await page.locator('#dungeon-state').textContent(),/6 個房間/);
    await page.locator('#start-game').click();await page.locator('.screen-curtain').waitFor({state:'hidden'});await idle();
    const plan=planJourney(1);assert.equal(plan.won,true);
    for(let stage=0;stage<plan.rooms.length;stage++){
      assert.equal(await page.locator('#journey-progress-label').textContent(),`${stage+1} / 6`);
      await screenshot(`room-${stage+1}`);
      const kinds=await page.locator('.actor[data-kind]').evaluateAll(es=>es.map(e=>e.dataset.kind));
      for(const kind of new Set(kinds)) {
        const actor=page.locator(`.actor[data-kind="${kind}"]`).first();await hoverActor(actor);
        assert.equal(await actor.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
        await screenshot(`room-${stage+1}-${kind}`);
      }
      const seenPhases=new Set();
      for(const step of plan.rooms[stage].steps){
        await idle();
        if(stage===5){const boss=page.locator('.actor[data-kind="mossstag"]');if(await boss.count()){
          const phase=await boss.getAttribute('data-skill');if(!seenPhases.has(phase)){seenPhases.add(phase);await hoverActor(boss);await screenshot(`boss-${phase}`);}
        }}
        if(step.ultimate){
          await page.locator('#actions').click();await idle();
          const hero=await page.locator('[data-actor="hero"]').evaluate(el=>[Number(el.style.left.match(/([\d.]+)%/)[1])/20-.5,4-(Number(el.style.top.match(/([\d.]+)%/)[1])/20-.5)]);
          await tile(hero[0]+step.ultimate[0],hero[1]+step.ultimate[1]).click();
        }else if(step.end)await page.locator('#end-turn').click();
        else {await page.locator('#hand .card').nth(step.card).click();await tile(...step.point).click();}
        await idle();
      }
      console.log(`Pointer clear: ${stage+1} ${plan.rooms[stage].name}`);
      if(stage===5){assert.equal(seenPhases.size,3);break;}
      for(let move=0;move<8;move++){
        if(await page.locator('#journey-progress-label').textContent()!==`${stage+1} / 6`)break;
        assert.equal(await page.locator('#hand [data-card="forward"]').count(),1);
        const hero=await page.locator('[data-actor="hero"]').evaluate(el=>[Number(el.style.left.match(/([\d.]+)%/)[1])/20-.5,4-(Number(el.style.top.match(/([\d.]+)%/)[1])/20-.5)]);
        await page.locator('#hand .card').click();await tile(hero[0]+Math.sign(2-hero[0]),hero[1]+Math.sign(4-hero[1])).click();await idle();
      }
    }
    await page.locator('#result').waitFor({state:'visible'});assert.match(await page.locator('#result-title').textContent(),/踏破/);await screenshot('victory');
    // Fresh run after victory, then deterministic boss defeat and restart.
    await page.locator('#replay').click();await idle();assert.equal(await page.locator('#journey-progress-label').textContent(),'1 / 6');
    await page.locator('[data-test-action="boss"]').click();await idle();
    await page.locator('[data-test-action="health"]').click();
    for(let n=0;n<8&&!await page.locator('#result').isVisible();n++){await page.locator('#end-turn').click();await idle();}
    assert.match(await page.locator('#result-title').textContent(),/再試一次/);await screenshot('defeat');
    await page.locator('#replay').click();await idle();assert.equal(await page.locator('#journey-progress-label').textContent(),'1 / 6');
    assert.deepEqual(errors,[]);console.log('Forest six-room pointer playthrough, all boss phases, victory/death/restart passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
