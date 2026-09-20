'use strict';
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const playJourney = require('./journey-flow.cjs');
const checkCharacters = require('./character-flow.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const executable = path.join(root, 'src-tauri/target/release/testpb.exe');
  assert.ok(fs.existsSync(executable), 'Run npm run desktop:build first.');
  const child = spawn(executable, [], {
    cwd: os.tmpdir(),
    windowsHide: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
      WEBVIEW2_USER_DATA_FOLDER: path.join(output, `webview-${process.pid}`)
    }
  });
  let browser;
  try {
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error(`Desktop exited early: ${child.exitCode}`);
      try {
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1000 });
        break;
      } catch {
        await sleep(500);
      }
    }
    assert.ok(browser, 'WebView2 did not expose its test endpoint.');
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.waitForEvent('page'));
    const errors = [],
      blocked = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('requestfailed', (request) => blocked.push(request.url()));
    const idle = () =>
      page.waitForFunction(
        () => document.getElementById('game').getAttribute('aria-busy') === 'false'
      );
    await page.waitForFunction(() => document.querySelectorAll('.tile').length === 25);
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0)
    );
    assert.ok(await page.evaluate(() => '__TAURI_INTERNALS__' in window));
    assert.ok(page.url().includes('tauri.localhost'), `Unexpected app URL: ${page.url()}`);
    await checkCharacters(page);
    await page.screenshot({ path: path.join(output, 'tauri-home.png') });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#home .theme-toggle').click();
    await page.reload();
    await page.locator('#start-game').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.screenshot({ path: path.join(output, 'tauri-home-light.png') });
    await page.locator('#home .theme-toggle').click();
    await page.locator('#start-game').click();
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
      'The default desktop window should fit without scrolling.'
    );
    await page.screenshot({ path: path.join(output, 'tauri-window.png') });
    await page.locator('[data-card="rush"]').click();
    await page.locator('.tile[data-x="2"][data-y="2"]').hover();
    assert.equal(await page.locator('#ghost').isVisible(), true);
    assert.equal(await page.locator('[data-actor="0"]').isVisible(), false);
    await page.screenshot({ path: path.join(output, 'tauri-preview.png') });
    await page.locator('.tile[data-x="2"][data-y="2"]').click();
    await idle();
    assert.equal(await page.locator('#actors .actor').count(), 4);
    assert.equal(await page.locator('.card').count(), 2);
    await page.locator('#game .theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await page.locator('.card').count(), 2);
    await page.locator('#game .theme-toggle').click();
    await page.locator('#back-home').click();
    assert.equal(await page.locator('#start-label').textContent(), '繼續旅途');
    await page.locator('#start-game').click();
    assert.equal(await page.locator('.card').count(), 2);
    await page.locator('[data-card="short"]').click();
    await page.locator('.tile[data-x="2"][data-y="1"]').click();
    await idle();
    assert.equal(await page.locator('#turn').textContent(), '第 2 回合');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (let step = 0; step < 15 && !(await page.locator('#result').isVisible()); step++) {
      await page.locator('#end-turn').click();
      await idle();
    }
    assert.equal(await page.locator('#result-title').textContent(), '再試一次');
    await page.locator('#replay').click();
    assert.equal(await page.locator('#actors .actor').count(), 5);
    assert.equal(await page.locator('.card').count(), 3);
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0)
    );
    await page.reload();
    await page.locator('#start-game').click();
    await playJourney(page, output, 'tauri-');
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, []);
    console.log(
      'Native Tauri/WebView2 checks passed: embedded PNGs, preview, animated capture, automatic turn, defeat and replay. No renderer/CSP errors.'
    );
  } finally {
    if (browser) await browser.close();
    if (child.exitCode === null) child.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
