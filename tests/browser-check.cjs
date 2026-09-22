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
  const startGame = async (target, touch = false) => {
    await target.locator('#start-game')[touch ? 'tap' : 'click']();
    await target.locator('#game').waitFor({ state: 'visible' });
    await target.locator('.screen-curtain').waitFor({ state: 'hidden' });
  };
  try {
    await page.goto(process.env.TESTPB_URL || 'http://127.0.0.1:4173');
    await page.locator('#home').waitFor();
    const desktopStage = await page.locator('#stage').boundingBox();
    assert.ok(Math.abs(desktopStage.width / desktopStage.height - 9 / 16) < 0.001);
    assert.ok(desktopStage.x > 0, 'desktop stage should be centered');
    await require('./rogue-flow.cjs')(page, output);
    await checkCharacters(page);
    await require('./village-flow.cjs').chooseCharacter(page, 'pinkCat');
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0)
    );
    await page.screenshot({ path: path.join(output, 'home.png'), fullPage: true });
    await openDungeon(page);
    await page.screenshot({ path: path.join(output, 'dungeon.png'), fullPage: true });
    await page.locator('#dungeon-back').click();
    await openDungeon(page);
    await startGame(page);
    await page.locator('.card').first().waitFor();
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0)
    );
    assert.equal(await page.locator('.tile').count(), 25);
    await require('./battle-ux.cjs')(page);
    assert.equal(await page.locator('.card').count(), 3);
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.locator('[data-card="rush"]').click();
    assert.equal(await page.locator('.tile.legal').count(), 3);
    await tile(2, 2).hover();
    assert.equal(await page.locator('#ghost').isVisible(), true);
    const boardBox = await page.locator('.board-shell').boundingBox();
    const tooltipBox = await page.locator('#tile-info').boundingBox();
    assert.ok(tooltipBox.y + tooltipBox.height <= boardBox.y, 'tile information should stay above the board');
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
    await page.locator('#home').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#game').isVisible(), false);
    await openDungeon(page);
    assert.equal(await page.locator('#start-label').textContent(), '繼續旅途');
    await startGame(page);
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
    await require('./village-flow.cjs').chooseCharacter(page, 'pinkCat');
    await openDungeon(page);
    await startGame(page);
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
    await startGame(page);
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
    await startGame(page);
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
    await require('./village-flow.cjs').chooseCharacter(phone, 'pinkCat');
    await phone.screenshot({ path: path.join(output, 'home-mobile.png'), fullPage: true });
    await openDungeon(phone, true);
    await phone.screenshot({ path: path.join(output, 'dungeon-mobile.png'), fullPage: true });
    const startBox = await phone.locator('#start-game').boundingBox();
    assert.ok(startBox.x >= 0 && startBox.x + startBox.width <= 390 && startBox.y + startBox.height <= 844);
    await startGame(phone, true);
    await phone.locator('.tile[data-x="2"][data-y="2"]').tap();
    const phoneStage = await phone.locator('#stage').boundingBox();
    assert.ok(Math.abs(phoneStage.width / phoneStage.height - 9 / 16) < 0.001);
    assert.ok((await phone.locator('.board-shell').boundingBox()).width >= 330);
    assert.deepEqual(await phone.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]), [390, 844]);
    assert.ok(await phone.locator('#touch-info').evaluate(panel => panel.scrollHeight <= panel.clientHeight));
    const touchInfoBox = await phone.locator('#touch-info').boundingBox();
    const touchBoardBox = await phone.locator('.board-shell').boundingBox();
    assert.ok(touchInfoBox.y + touchInfoBox.height <= touchBoardBox.y);
    assert.match(await phone.locator('#touch-info').innerText(), /刺芽團子.*生命 1\/1/);
    assert.equal(await phone.locator('.card.selected').count(), 0);
    await phone.screenshot({ path: path.join(output, 'battle-portrait-touch.png') });
    const rushBox = await phone.locator('[data-card="rush"]').boundingBox();
    const touchSession = await phone.context().newCDPSession(phone);
    await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rushBox.x + rushBox.width / 2, y: rushBox.y + rushBox.height / 2 }] });
    await phone.waitForTimeout(500);
    assert.match(await phone.locator('#card-details').innerText(), /不可穿越敵人/);
    const cardDetailsBox = await phone.locator('#card-details').boundingBox();
    assert.ok(cardDetailsBox.y < touchBoardBox.y);
    await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await phone.locator('.card.selected').count(), 0);
    await phone.locator('.tile[data-x="2"][data-y="2"]').tap();
    assert.equal(await phone.locator('#card-details').isVisible(), false);
    await phone.locator('[data-card="rush"]').tap();
    assert.equal(await phone.locator('.tile.legal').count(), 3);
    await phone.locator('.tile[data-x="0"][data-y="1"]').tap();
    assert.match(await phone.locator('#touch-info').innerText(), /突進/);
    await phone.locator('.tile[data-x="2"][data-y="2"]').tap();
    await phone.waitForFunction(
      () => document.getElementById('game').getAttribute('aria-busy') === 'false'
    );
    assert.equal(await phone.locator('#actors .actor').count(), 4);
    await phone.reload();
    await require('./village-flow.cjs').chooseCharacter(phone, 'rogue');
    await openDungeon(phone, true);
    await startGame(phone, true);
    assert.equal(await phone.locator('#touch-info').innerText(), '');
    await phone.locator('[data-card="shadow"]').tap({ force: true });
    assert.match(await phone.locator('#touch-info').innerText(), /^追影\n瞬移至場上任意小刀格/);
    assert.match(await phone.locator('#touch-info .hint-warning').innerText(), /需要場上小刀/);
    assert.equal(await phone.locator('.card.selected').count(), 0);
    await phone.screenshot({ path: path.join(output, 'rogue-shadow-warning-mobile.png') });
    await phone.close();
    const portrait = await browser.newPage({ viewport: { width: 720, height: 1280 }, hasTouch: true, isMobile: true });
    await portrait.goto(process.env.TESTPB_URL || 'http://127.0.0.1:4173');
    assert.deepEqual(await portrait.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]), [720, 1280]);
    await openDungeon(portrait, true);
    assert.deepEqual(await portrait.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]), [720, 1280]);
    await startGame(portrait, true);
    assert.deepEqual(await portrait.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]), [720, 1280]);
    const portraitBoard = await portrait.locator('.board-shell').boundingBox();
    const portraitCard = await portrait.locator('#hand .card').last().boundingBox();
    const portraitEnd = await portrait.locator('#end-turn').boundingBox();
    assert.ok(portraitBoard.width >= 610, 'portrait board leaves excessive side margins');
    assert.ok(portraitCard.x + portraitCard.width + 8 <= portraitEnd.x, 'portrait end turn overlaps cards');
    assert.ok(Math.abs(portraitCard.y + portraitCard.height - (portraitEnd.y + portraitEnd.height)) <= 2, 'portrait controls should align along the bottom');
    await portrait.screenshot({ path: path.join(output, 'battle-720x1280.png') });
    await portrait.close();
    const landscape = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    await landscape.goto(process.env.TESTPB_URL || 'http://127.0.0.1:4173');
    await openDungeon(landscape, true);
    await startGame(landscape, true);
    await landscape.locator('.tile[data-x="2"][data-y="2"]').tap();
    assert.equal(await landscape.locator('#touch-info').isVisible(), true);
    assert.deepEqual(await landscape.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]), [844, 390]);
    const landscapeEnd = await landscape.locator('#end-turn').boundingBox();
    assert.ok(landscapeEnd.x >= 0 && landscapeEnd.x + landscapeEnd.width <= 844 && landscapeEnd.y + landscapeEnd.height <= 390);
    const landscapeCard = await landscape.locator('#hand .card').last().boundingBox();
    assert.ok(landscapeCard.x + landscapeCard.width + 2 <= landscapeEnd.x, 'landscape end turn overlaps cards');
    await landscape.screenshot({ path: path.join(output, 'battle-landscape.png') });
    await landscape.close();
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
