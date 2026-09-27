const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const native = process.env.TESTPB_CDP;
  const browser = native ? await chromium.connectOverCDP(native) : await chromium.launch({ channel: 'chrome', headless: true });
  const page = native ? browser.contexts()[0].pages()[0] : await browser.newPage({ viewport: { width: 506, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const idle = () => page.waitForFunction(() => document.querySelector('#game')?.getAttribute('aria-busy') === 'false' && !document.querySelector('#game')?.classList.contains('dealing-hand'));
  const snapshot = () => page.locator('#hand .card').evaluateAll(cards => cards.map(card => ({
    x: card.getBoundingClientRect().x, y: card.getBoundingClientRect().y,
    width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height,
    z: Number(getComputedStyle(card).zIndex), hovered: card.matches(':hover')
  })));
  try {
    if (!native) {
      await page.goto('http://127.0.0.1:1420');
      await page.locator('#open-dungeons').click(); await page.locator('#start-game').click();
      await page.locator('.screen-curtain').waitFor({ state: 'hidden' });
    }
    if (await page.locator('.deck-close').isVisible()) await page.locator('.deck-close').click();
    await idle(); await page.locator('[data-test-action="cycle"]').click(); await idle();
    await page.mouse.move(10, 100); await page.waitForTimeout(180);
    const baseline = await snapshot(); assert.equal(baseline.length, 5);
    for (const index of [0, 1, 2, 3, 4, 3, 2, 1, 0]) {
      const base = baseline[index];
      // Use the exposed strip of each card rather than a possibly covered centre.
      await page.mouse.move(base.x + base.width * .45, base.y + 70); await page.waitForTimeout(180);
      const lifted = await snapshot();
      assert.equal(lifted[index].hovered, true);
      assert.ok(lifted[index].y < base.y - 15);
      assert.ok(lifted[index].width > base.width && lifted[index].width < base.width * 1.04);
      for (let n = 0; n < 5; n++) if (n !== index) {
        assert.ok(Math.abs(lifted[n].y - baseline[n].y) < 1, 'Neighbour must not move');
        assert.ok(lifted[index].z > lifted[n].z);
      }
      // Rest at the old bottom edge: lifting must not repeatedly lose hover.
      await page.mouse.move(base.x + base.width * .45, base.y + base.height - 3);
      for (let sample = 0; sample < 4; sample++) {
        await page.waitForTimeout(70);
        const stable = await snapshot(); assert.equal(stable[index].hovered, true);
        assert.ok(Math.abs(stable[index].y - lifted[index].y) < 1);
      }
    }
    // Selected cards cannot cover a different hovered card. Clicking the raised
    // portion must still select that card, and leaving restores its selected pose.
    await page.locator('#hand .card').first().click();
    const middle = baseline[2]; await page.mouse.move(middle.x + 18, middle.y + 60); await page.waitForTimeout(180);
    const raised = (await snapshot())[2];
    assert.ok(raised.z > (await snapshot())[0].z);
    await page.mouse.click(raised.x + raised.width / 2, raised.y + 6);
    assert.equal(await page.locator('#hand .card').nth(2).getAttribute('aria-pressed'), 'true');
    await page.mouse.move(10, 100); await page.waitForTimeout(180);
    const selected = (await snapshot())[2]; assert.ok(selected.y < raised.y - 8);
    for (const [index, neighbour] of (await snapshot()).entries()) if (index !== 2) assert.ok(selected.z > neighbour.z);
    const persistentY = selected.y;
    await page.mouse.move(250, 300); await page.waitForTimeout(180);
    assert.ok(Math.abs((await snapshot())[2].y - persistentY) < 1, 'Selection stays raised over the board');
    await page.locator('#hand .card').nth(2).click(); // Deselect and leave a hover preview.
    await page.waitForTimeout(180);
    await page.screenshot({ path: `test-results/hand-hover-${native ? 'native' : 'browser'}.png` });
    assert.deepEqual(errors, []);
    console.log('Five-card hover: lift, fixed neighbours, layer priority, stable old-edge hit area and raised click passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
