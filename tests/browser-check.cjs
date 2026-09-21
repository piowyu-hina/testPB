'use strict';
const { openDungeon } = require('./village-flow.cjs');
// Development-only: use an existing Playwright installation. Not needed to play.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const playJourney = require('./journey-flow.cjs');
const checkCharacters = require('./character-flow.cjs');
const output = path.resolve(__dirname, '../test-results');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [],
    external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request.url().startsWith(process.env.TESTPB_URL || 'http://127.0.0.1:4173')
    )
      external.push(request.url());
  });
  const tile = (x, y) => page.locator(`.tile[data-x="${x}"][data-y="${y}"]`);
  const idle = () =>
    page.waitForFunction(
      () => document.getElementById('game').getAttribute('aria-busy') === 'false'
    );
  try {
    await page.goto(process.env.TESTPB_URL || 'http://127.0.0.1:4173');
    await page.locator('#home').waitFor();
    await checkCharacters(page);
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0)
    );
    await page.screenshot({ path: path.join(output, 'home.png'), fullPage: true });
    await openDungeon(page);
    await page.screenshot({ path: path.join(output, 'dungeon.png'), fullPage: true });
    await page.locator('#dungeon-back').click();
    await openDungeon(page);
    await page.locator('#start-game').click();
    await page.locator('.card').first().waitFor();
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0)
    );
    assert.equal(await page.locator('.tile').count(), 25);
    assert.equal(await page.locator('.card').count(), 3);
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.locator('[data-card="rush"]').click();
    assert.equal(await page.locator('.tile.legal').count(), 3);
    await tile(2, 2).hover();
    assert.equal(await page.locator('#ghost').isVisible(), true);
    assert.equal(await page.locator('[data-actor="0"]').isVisible(), false);
    assert.equal(await tile(2, 1).locator('.threat').count(), 0);
    await page.screenshot({ path: path.join(output, 'preview.png'), fullPage: true });
    await tile(2, 2).click();
    // During animation, pointer commands may not spend an additional action.
    await page.locator('#end-turn').dispatchEvent('click', { detail: 1 });
    await idle();
    assert.equal(await page.locator('[data-actor="0"]').count(), 0);
    assert.equal(await page.locator('.card').count(), 2);
    assert.equal(await page.locator('#turn').textContent(), '第 1 回合');
    await page.locator('#back-home').click();
    assert.equal(await page.locator('#game').isVisible(), false);
    await openDungeon(page);
    assert.equal(await page.locator('#start-label').textContent(), '繼續旅途');
    await page.locator('#start-game').click();
    assert.equal(await page.locator('.card').count(), 2);
    assert.equal(await page.locator('#actors .actor').count(), 4);
    assert.equal(await page.locator('.card.selected').count(), 0);
    await page.locator('[data-card="short"]').click();
    await tile(2, 1).click();
    await idle();
    assert.equal(await page.locator('#turn').textContent(), '第 2 回合');
    assert.equal(await page.locator('.card').count(), 3);
    assert.equal(await page.locator('.action-pip:not(.empty)').count(), 2);

    // Start fresh, finish a whole room through real pointer clicks.
    await page.reload();
    await openDungeon(page);
    await page.locator('#start-game').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.card').first().waitFor();
    await playJourney(page, output);
    await page.locator('#replay').click();
    assert.equal(await page.locator('.card').count(), 3);
    assert.equal(await page.locator('#actors .actor').count(), 5);
    assert.equal(await page.locator('#health .empty').count(), 0);
    // Repeated early passes reach defeat, with only one phase per click.
    for (let i = 0; i < 15 && !(await page.locator('#result').isVisible()); i++) {
      await page.locator('#end-turn').click();
      await idle();
    }
    assert.equal(await page.locator('#result-title').textContent(), '再試一次');
    await page.locator('#result-home').click();
    assert.equal(await page.locator('#result').isVisible(), false);
    await openDungeon(page);
    assert.equal(await page.locator('#start-label').textContent(), '出發');
    await page.locator('#start-game').click();
    assert.equal(await page.locator('#health .empty').count(), 0);
    assert.equal(await page.locator('#actors .actor').count(), 5);
    await page.locator('.card').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.card.selected').count(), 0);
    await page.locator('.card').first().click();
    await page.mouse.click(15, 15);
    assert.equal(await page.locator('.card.selected').count(), 0);

    await page.setViewportSize({ width: 960, height: 540 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
      true,
      'Short desktop must fit without vertical scrolling'
    );
    await page.screenshot({ path: path.join(output, 'small-desktop.png'), fullPage: true });
    await page.locator('#back-home').click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
    await page.screenshot({ path: path.join(output, 'home-small.png'), fullPage: true });
    await openDungeon(page);
    await page.locator('#start-game').click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true
    );
    const box = await page.locator('#end-turn').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844);
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce'
    });
    phone.on('pageerror', (error) => errors.push(error.message));
    await phone.goto(process.env.TESTPB_URL || 'http://127.0.0.1:4173');
    await phone.screenshot({ path: path.join(output, 'home-mobile.png'), fullPage: true });
    await openDungeon(phone, true);
    await phone.screenshot({ path: path.join(output, 'dungeon-mobile.png'), fullPage: true });
    const startBox = await phone.locator('#start-game').boundingBox();
    assert.ok(startBox.x >= 0 && startBox.x + startBox.width <= 390 && startBox.y + startBox.height <= 844);
    await phone.locator('#start-game').tap();
    await phone.locator('[data-card="rush"]').tap();
    assert.equal(await phone.locator('.tile.legal').count(), 3);
    await phone.locator('.tile[data-x="2"][data-y="2"]').tap();
    await phone.waitForFunction(
      () => document.getElementById('game').getAttribute('aria-busy') === 'false'
    );
    assert.equal(await phone.locator('#actors .actor').count(), 4);
    await phone.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      'Browser checks passed: Vite production loading, PNG assets, preview, input lock, automatic turn, victory, defeat, replay, keyboard exclusion, desktop/mobile layout. No network requests or JS errors.'
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
