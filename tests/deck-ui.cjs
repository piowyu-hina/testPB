const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = process.env.TESTPB_CDP ? await chromium.connectOverCDP(process.env.TESTPB_CDP) : await chromium.launch({channel:'chrome',headless:true});
  const page = process.env.TESTPB_CDP ? browser.contexts()[0].pages()[0] : await browser.newPage({viewport:{width:506,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const idle=()=>page.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#game')?.classList.contains('dealing-hand'));
  const fit=async(selector,child)=>{
    const result=await page.locator(selector).evaluate((parent,child)=>{
      const box=parent.getBoundingClientRect();
      return [...parent.querySelectorAll(child)].filter(el=>el.getBoundingClientRect().height&&getComputedStyle(el).visibility!=='hidden').filter(el=>{
        const rect=el.getBoundingClientRect();return rect.top<box.top-1||rect.bottom>box.bottom+1||rect.left<box.left-1||rect.right>box.right+1;
      }).map(el=>el.className||el.id);
    },child);assert.deepEqual(result,[]);
  };
  const noBars=async()=>assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().width&&getComputedStyle(el).scrollbarWidth!=='none').map(el=>el.tagName)),[]);
  try {
    await page.goto('http://127.0.0.1:1420');
    await page.locator('#open-shop').click();await page.locator('.screen-curtain').waitFor({state:'hidden'});
    for(const id of ['thrust','repel','sidestep']){await page.locator(`.shop-card-choice[data-card="${id}"]`).click();await fit('.shop','.shop-buy,.shop-footnote,.shop-offer p');}
    await page.getByRole('button',{name:/購買抽牌/}).click();
    await page.locator('#shop-home').click();await page.locator('#open-dungeons').click();await page.locator('#start-game').click();await page.locator('.screen-curtain').waitFor({state:'hidden'});await idle();
    await page.locator('[data-test-action="cycle"]').click();await idle();
    assert.equal(await page.locator('#hand [data-card="sidestep"] .engraving-draw').count(),1);
    await page.locator('#open-deck').click();
    assert.equal(await page.locator('.deck-entry').count(),5);
    assert.equal(await page.locator('.deck-pagination').isHidden(),true);
    for(const id of ['thrust','repel','sidestep']){
      await page.locator(`.deck-entry[data-card="${id}"]`).click();
      assert.equal(await page.locator('.deck-entry[aria-pressed="true"]').getAttribute('data-card'),id);
      await fit('.deck-viewer','.deck-card-face,.deck-card-name,.deck-detail,.deck-growth');
    }
    await page.screenshot({path:'test-results/qinghe-deck-redesign.png'});
    await noBars();await page.locator('.deck-close').click();
    await page.locator('#open-battle-help').click();await page.locator('.battle-rules summary').click();
    let pages=0;
    do {await fit('#battle-help','#battle-rule-list li,.rules-pagination');await noBars();pages++;if(await page.locator('#rules-next').isDisabled())break;await page.locator('#rules-next').click();}while(pages<10);
    assert.equal(pages,4);await page.screenshot({path:'test-results/qinghe-rules-paged.png'});await page.locator('#close-battle-help').click();
    // A future larger catalogue must page without shrinking cards or adding a scroll area.
    await page.evaluate(async()=>{
      const {mountDeckViewer}=await import('/src/ui/deckViewer.ts');const {Room}=await import('/src/battle/Room.ts');
      const room=new Room(1,undefined,5,'qinghe');room.hand=[];room.discard=[];room.deck=['thrust','advance','sweep','sidestep','repel','throw','shadow','lunge','recall'];room.build.engravings={thrust:'draw',advance:'refund',sweep:'discount'};
      const root=document.createElement('div');root.id='future-deck-test';root.className='screen-root battle-screen';Object.assign(root.style,{position:'absolute',inset:'0',zIndex:'999'});document.querySelector('#app').append(root);
      const game=document.createElement('main');root.append(game);mountDeckViewer(root,game,()=>room).open();
    });
    const future=page.locator('#future-deck-test');
    assert.equal(await future.locator('.deck-entry').count(),6);
    const width=await future.locator('.deck-card-face').first().evaluate(el=>el.getBoundingClientRect().width);
    await future.locator('.deck-next').click();assert.equal(await future.locator('.deck-entry').count(),3);
    assert.equal(await future.locator('.deck-card-face').first().evaluate(el=>el.getBoundingClientRect().width),width);
    await future.locator('.deck-prev').click();await future.locator('.deck-entry[data-card="advance"]').click();
    await fit('#future-deck-test','.deck-card-face,.deck-detail,.deck-pagination');await noBars();
    await page.screenshot({path:'test-results/qinghe-deck-future-page.png'});
    await future.evaluate(el=>el.remove());assert.deepEqual(errors,[]);
    console.log('Qinghe deck selection, future pagination, upgrade symbols, help pages and no-scrollbar checks passed');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
