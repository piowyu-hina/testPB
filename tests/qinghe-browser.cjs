const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack));
  try {
    await page.goto('http://127.0.0.1:1420');
    await page.locator('#home-portrait').waitFor();
    assert.match(await page.locator('#home-portrait').getAttribute('src'), /qinghe/);
    await page.screenshot({ path: 'test-results/qinghe-home.png' });
    await page.locator('#open-characters').click();
    assert.equal(await page.locator('.character-choice').count(), 2);
    await page.waitForFunction(() => [...document.querySelectorAll('.character-choice img')].every(image => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: 'test-results/qinghe-character-picker.png' });
    await page.locator('[data-character="rogue"]').click();
    assert.match(await page.locator('#home-portrait').getAttribute('src'), /luxue/);
    await page.locator('[data-character="qinghe"]').click();
    assert.match(await page.locator('#home-portrait').getAttribute('src'), /qinghe/);
    await page.locator('#close-characters').click();
    await page.locator('#open-dungeons').click();
    await page.locator('#start-game').click();
    await page.locator('.screen-curtain').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => [...document.images].filter(image => image.getAttribute('src')).every(image => image.complete && image.naturalWidth > 0));
    assert.deepEqual(await page.locator('.card').evaluateAll(cards => cards.map(card => card.dataset.card)), ['advance', 'thrust', 'sweep']);
    assert.match(await page.locator('#actions').getAttribute('aria-label'), /破曉一槍/);
    await page.screenshot({ path: 'test-results/qinghe-opening.png' });
    await page.locator('[data-test-action="charge"]').click();
    await page.locator('#actions').click();
    assert.equal(await page.locator('[data-card="dawnSpear"]').count(), 1);
    await page.waitForFunction(() => [...document.images].filter(image => image.getAttribute('src')).every(image => image.complete && image.naturalWidth > 0));
    await page.locator('[data-card="dawnSpear"]').click();
    await page.locator('.tile[data-x="2"][data-y="2"]').click();
    await page.waitForFunction(() => document.getElementById('game')?.getAttribute('aria-busy') === 'false');
    assert.equal(await page.locator('[data-actor="0"]').count(), 0);
    await page.screenshot({ path: 'test-results/qinghe-ultimate.png' });
    await page.locator('[data-test-action="opening"]').click();
    await page.locator('[data-card="advance"]').click();
    await page.locator('.tile[data-x="2"][data-y="1"]').click();
    await page.waitForFunction(() => document.getElementById('game')?.getAttribute('aria-busy') === 'false');
    await page.locator('[data-card="sweep"]').click();
    assert.equal(await page.locator('[data-card="sweep"]').count(), 1);
    assert.equal(await page.locator('.tile.legal[data-x="2"][data-y="1"]').count(), 1);
    assert.equal(await page.locator('.target-mark').count(), 1);
    await page.locator('.tile[data-x="2"][data-y="1"]').hover();
    assert.equal(await page.locator('[data-actor="0"].victim-preview').count(), 1);
    await page.screenshot({ path: 'test-results/qinghe-sweep-preview.png' });
    await page.locator('.tile[data-x="2"][data-y="1"]').click();
    await page.waitForFunction(() => document.getElementById('game')?.getAttribute('aria-busy') === 'false');
    assert.equal(await page.locator('[data-actor="0"]').count(), 0);
    await page.screenshot({ path: 'test-results/qinghe-sweep.png' });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
