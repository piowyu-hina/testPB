const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.connectOverCDP(process.env.TESTPB_CDP);
  try {
    const page = browser.contexts()[0].pages()[0];
    await page.goto('http://127.0.0.1:1420');
    await page.locator('#open-dungeons').click();
    await page.locator('.screen-curtain').waitFor({state:'hidden'});
    assert.match(await page.locator('#dungeon-state').textContent(), /6 個房間/);
    await page.locator('#start-game').click();
    await page.locator('.screen-curtain').waitFor({state:'hidden'});
    await page.waitForFunction(() => document.querySelector('#game')?.getAttribute('aria-busy') === 'false' && !document.querySelector('#game')?.classList.contains('dealing-hand'));
    assert.equal(await page.locator('#journey-progress-label').textContent(), '1 / 6');
    assert.equal(await page.locator('[data-test-action="boss"]').count(), 1);
    await page.mouse.move(10, 180);
    await page.screenshot({path:'test-results/forest-handoff.png'});
    console.log('Fresh six-room forest preview ready');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
