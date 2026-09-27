const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const native=process.env.TESTPB_CDP;
  const browser=native?await chromium.connectOverCDP(native):await chromium.launch({channel:'chrome',headless:true});
  const page=native?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:506,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const idle=()=>page.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#game')?.classList.contains('dealing-hand'));
  try {
    await page.goto('http://127.0.0.1:1420');
    // Isolated UI fixture, using the real session, battle screen and rules.
    await page.evaluate(async()=>{
      const {GameSession}=await import('/src/app/GameSession.ts');
      const {mountBattle}=await import('/src/screens/BattleScreen.ts');
      document.querySelectorAll('#app > .screen-root').forEach(el=>{el.hidden=true;el.remove();});
      const session=new GameSession();const room=session.journey.room;
      room.hero=[0,0];room.actions=0;room.hand=['thrust','sidestep','repel#0'];room.build.engravings['repel#0']='draw';
      room.enemies=[{id:0,kind:'sprout',position:[4,4],health:3,maxHealth:3}];
      window.unavailableRoom=room;
      const screen=mountBattle(document.querySelector('#app'),session,()=>{});screen.root.hidden=false;screen.enter();
    });
    await idle();
    const hand=page.locator('.battle-screen:not([hidden]) #hand');
    const hint=page.locator('.battle-screen:not([hidden]) #hint');
    const card=hand.locator('[data-card="thrust"]');
    await card.hover();await page.waitForTimeout(180);
    assert.match(await hint.textContent(),/魂火不足/);
    assert.equal(await card.evaluate(el=>el.disabled),false);
    assert.equal(await card.getAttribute('aria-disabled'),'true');
    assert.equal(await card.locator('.card-art').evaluate(el=>getComputedStyle(el).opacity),'1');
    assert.ok(await card.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m42 < -20));
    const before=await page.evaluate(()=>JSON.stringify(window.unavailableRoom));
    const box=await card.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    assert.equal(await card.getAttribute('aria-pressed'),'false');
    assert.equal(await page.evaluate(()=>JSON.stringify(window.unavailableRoom)),before);
    await hand.locator('[data-card="repel"]').hover();await page.waitForTimeout(180);
    assert.match(await hint.textContent(),/魂火不足/);
    assert.ok(await hint.evaluate(el=>el.getBoundingClientRect().bottom<=el.closest('.battle-info').getBoundingClientRect().bottom+1));
    await hand.locator('[data-card="sidestep"]').hover();
    assert.doesNotMatch(await hint.textContent(),/魂火不足/);
    await hand.locator('[data-card="sidestep"]').click();
    assert.equal(await hand.locator('[data-card="sidestep"]').getAttribute('aria-pressed'),'true');
    // Refilling energy changes the same attack card's explanation to missing target.
    await page.locator('.battle-screen:not([hidden]) [data-test-action="energy"]').click();
    await card.hover();assert.match(await hint.textContent(),/範圍內沒有怪物/);
    await page.screenshot({path:`test-results/card-unavailable-${native?'native':'browser'}.png`});
    assert.deepEqual(errors,[]);
    console.log('Unavailable cards: readable hover, reasons, zero-cost selection and non-spending click passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
