const { openDungeon } = require('./village-flow.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    await page.goto('http://127.0.0.1:4173');
    await openDungeon(page);
    await page.locator('#start-game').click();
    const enemies = page.locator('#actors .actor:not(.hero)');
    for (let i = 0; i < await enemies.count(); i++) {
      const box = await enemies.nth(i).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      assert.equal(await enemies.nth(i).evaluate(n => n.classList.contains('hovered')), true);
      const colors = await page.locator('.focus-threat').evaluateAll(nodes =>
        nodes.map(n => getComputedStyle(n).backgroundColor));
      assert.ok(colors.length > 0, `Enemy ${i} has no visible range`);
      assert.ok(colors.every(c => c === 'rgb(219, 159, 143)'), `Enemy ${i}: ${colors}`);
    }
    await page.mouse.move(10, 10);
    assert.equal(await page.locator('.focus-threat').count(), 0);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    console.log(await page.locator('#actors .actor.hero img').evaluate(i => ({
      source: [i.naturalWidth, i.naturalHeight],
      displayed: [i.getBoundingClientRect().width, i.getBoundingClientRect().height],
      scale: getComputedStyle(i).scale
    })));
    await page.screenshot({ path: 'test-results/hover-and-fullbody.png' });
    console.log('All four enemies show their full hover range; leaving clears it.');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
