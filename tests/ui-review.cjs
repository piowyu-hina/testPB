const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const browser = process.env.TESTPB_CDP ? await chromium.connectOverCDP(process.env.TESTPB_CDP) : await chromium.launch({ channel: 'chrome', headless: true });
  const page = process.env.TESTPB_CDP ? browser.contexts()[0].pages()[0] : await browser.newPage({ viewport: { width: 576, height: 1024 } });
  fs.mkdirSync('test-results/ui-review', { recursive: true });
  const shot = async name => {
    await page.screenshot({ path: `test-results/ui-review/${name}.png` });
  };
  const idle = () => page.waitForFunction(() => document.querySelector('#game')?.getAttribute('aria-busy') === 'false' && !document.querySelector('#game')?.classList.contains('dealing-hand'));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.addInitScript(() => { Math.random = () => 1 / 4294967296; });
    await page.goto('http://127.0.0.1:1420');
    await page.waitForFunction(() => [...document.images].filter(image => image.getAttribute('src')).every(image => image.complete));
    await shot('home');
    await page.locator('#open-settings').click();
    await shot('home-settings');
    await page.locator('#village-settings .theme-toggle').click();
    await shot('home-settings-light');
    await page.locator('#village-settings .theme-toggle').click();
    await page.locator('#close-settings').click();
    await page.locator('#open-characters').click();
    await shot('characters');
    await page.locator('[data-character="rogue"]').click();
    await page.locator('#close-characters').click();
    await shot('home-rogue');
    await page.locator('#open-characters').click();
    await page.locator('[data-character="qinghe"]').click();
    await page.locator('#close-characters').click();
    await page.locator('#open-dungeons').click();
    await page.locator('.screen-curtain').waitFor({ state: 'hidden' });
    await shot('dungeon');
    await page.locator('#start-game').click();
    await page.locator('.screen-curtain').waitFor({ state: 'hidden' });
    await idle();
    await shot('battle');
    await page.locator('#open-battle-help').click();
    await shot('battle-settings');
    await page.locator('.battle-rules summary').click();
    await shot('battle-rules');
    await page.locator('#close-battle-help').click();
    await page.locator('[data-test-action="hand"]').click();
    await page.locator('.card').last().hover();
    await shot('five-cards-hover');
    await page.locator('[data-test-action="card"]').click();
    await page.waitForTimeout(160);
    await shot('overflow');
    await page.waitForTimeout(800);
    await page.locator('[data-test-action="charge"]').click();
    await page.locator('#actions').click();
    await idle();
    await shot('ultimate-targeting');
    await page.locator('#actions').click();
    await page.locator('[data-test-action="health"]').click();
    for (let turn = 0; turn < 12 && !await page.locator('#result').isVisible(); turn++) {
      await page.locator('#end-turn').click();
      await idle();
    }
    await shot('result');
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('UI review screenshots captured');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
