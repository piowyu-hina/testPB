const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
  const native=process.env.TESTPB_CDP;
  const browser=native?await chromium.connectOverCDP(native):await chromium.launch({channel:'chrome',headless:true});
  const page=native?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:506,height:900}});
  try {
    if(!native) await page.goto('http://127.0.0.1:1420');
    if(await page.locator('#open-dungeons').isVisible()) {
      await page.locator('#open-dungeons').click(); await page.locator('.screen-curtain').waitFor({state:'hidden'});
      await page.locator('#start-game').click(); await page.locator('.screen-curtain').waitFor({state:'hidden'});
    }
    if(!native) await page.locator('[data-test-action="cycle"]').click();
    await page.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#game')?.classList.contains('dealing-hand'));
    const selected=page.locator('#hand .selected');if(await selected.count())await selected.click();
    const hoverHero=async()=>{const r=await page.locator('[data-actor="hero"]').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);};
    await hoverHero();
    assert.equal(await page.locator('#tile-info').isVisible(),true);
    assert.match(await page.locator('#tile-info').textContent(),/青禾|露雪|戀喵/);
    await page.screenshot({path:`test-results/hero-info-${native?'native':'browser'}.png`});
    await page.mouse.move(10,180);assert.equal(await page.locator('#tile-info').isVisible(),false);
    const card=page.locator('#hand .card:not(.card-unavailable)').first();
    if(await card.count()) {
      await card.click();const hint=await page.locator('#hint').textContent();await hoverHero();
      assert.equal(await page.locator('#tile-info').isVisible(),false);
      assert.equal(await page.locator('#hint').textContent(),hint);
      await card.click();
    }
    await page.mouse.move(10,180);
    console.log('Hero introduction, pointer leave and selected-skill priority passed');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
