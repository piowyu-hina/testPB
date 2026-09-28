const { chromium } = require('playwright'), assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('test-results', { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 506, height: 900 }, locale: 'en-US' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.setDefaultTimeout(12000);
  const shot = name => page.screenshot({ path: `test-results/i18n-${name}.png` });
  const idle = () => page.waitForFunction(() => document.querySelector('#game')?.getAttribute('aria-busy') === 'false' && !document.querySelector('#game')?.classList.contains('dealing-hand'));
  const bindI18n = () => page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/src/i18n/index.ts').name;
    window.i18nTest = await import(url);
  });
  async function audit(label) {
    const issues = await page.evaluate(() => {
      const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]');
      const text = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode, e = n.parentElement;
        if (e && visible(e) && !e.closest('script,style,[data-i18n-skip]') && /\p{Script=Han}/u.test(n.textContent)) text.push(n.textContent);
      }
      const scrollbars = [...document.querySelectorAll('*')].filter(e => visible(e) && ['auto','scroll'].some(v => [getComputedStyle(e).overflowX,getComputedStyle(e).overflowY].includes(v)) && (e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2)).map(e => e.id || e.className);
      return { text, scrollbars, pageOverflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight };
    });
    assert.deepEqual(issues, { text: [], scrollbars: [], pageOverflow: false }, label);
  }
  try {
    await page.goto('http://127.0.0.1:1420');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await audit('home'); await shot('home-en');
    await page.locator('#open-settings').click(); await shot('settings-en');
    await page.locator('#village-settings [data-language="zh-Hant"]').click();
    assert.equal(await page.locator('#settings-title').textContent(), '設定');
    await page.reload(); assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant');
    await bindI18n();
    await page.locator('#open-settings').click();
    await page.locator('#village-settings [data-language="en"]').click();
    await audit('settings'); await page.locator('#close-settings').click();
    await page.locator('#open-shop').click(); await page.waitForTimeout(650);
    await audit('shop'); await shot('shop-en');
    for (const button of await page.locator('.shop-card-choice').all()) { await button.click(); await audit('shop card'); }
    await page.locator('[data-shop-tab="gear"]').click(); await audit('gear'); await shot('gear-en');
    await page.locator('#shop-home').click(); await page.waitForTimeout(650);
    await page.locator('#open-dungeons').click(); await page.waitForTimeout(650); await audit('dungeon'); await shot('dungeon-en');
    await page.locator('#start-game').click(); await idle(); await page.waitForTimeout(650);
    await page.locator('[data-test-action="cycle"]').click(); await idle();
    await page.locator('#hand .card').first().click();
    const state = () => page.evaluate(() => ({ hand: [...document.querySelectorAll('#hand .card')].map(e => [e.dataset.card,e.classList.contains('selected')]), health: document.querySelector('#health').innerHTML, actors: document.querySelector('#actors').innerHTML, targets: document.querySelector('#target-marks').innerHTML }));
    const before = await state();
    await page.locator('#open-battle-help').click();
    await page.locator('#battle-help [data-language="zh-Hant"]').click();
    await page.locator('#battle-help [data-language="en"]').click();
    await shot('battle-settings-en'); await audit('battle settings');
    await page.locator('.battle-rules summary').click();
    for (let i = 0; i < 4; i++) {
      await audit(`rules ${i}`); await shot(`rules-${i}-en`);
      if (!(await page.locator('#rules-next').isDisabled())) await page.locator('#rules-next').click();
    }
    await page.locator('#close-battle-help').click(); assert.deepEqual(await state(), before, 'locale change preserves selected card and battle DOM');
    for (const card of await page.locator('#hand .card').all()) { await card.hover(); await audit('card hover'); }
    await shot('battle-en');
    await page.locator('#open-deck').click(); await audit('deck'); await shot('deck-en');
    for (const entry of await page.locator('.deck-entry').all()) { await entry.click(); await audit('deck details'); }
    await page.locator('.deck-close').click();
    for (const room of ['elite', 'boss']) {
      await page.locator(`[data-test-action="${room}"]`).click(); await idle();
      for (const actor of await page.locator('#actors .actor:not(.hero)').all()) { const r = await actor.boundingBox(); await page.mouse.move(r.x+r.width/2,r.y+r.height/2); await audit(`${room} enemy`); }
      await shot(`${room}-en`);
    }
    await page.locator('[data-test-action="charge"]').click();
    await page.locator('#actions').hover(); await audit('ultimate hint');
    await page.locator('#actions').click(); await idle(); await audit('ultimate targeting');
    await page.locator('#actions').click(); await idle();
    await page.locator('[data-test-action="reward"]').click(); await audit('reward'); await shot('reward-en');
    await page.locator('.battle-reward-choice').first().click();
    await page.locator('.battle-reward-confirm').click(); await page.waitForTimeout(1600);
    await page.locator('#open-deck').click(); await audit('upgraded deck'); await shot('upgraded-deck-en');
    for (const entry of await page.locator('.deck-entry').all()) { await entry.click(); await audit('upgraded card detail'); }
    await page.locator('.deck-close').click();
    await page.locator('#open-battle-help').click();
    if (await page.locator('.battle-rules').getAttribute('open') !== null) await page.locator('.battle-rules summary').click();
    await page.locator('#back-home').click(); await page.waitForTimeout(650);
    await page.locator('#open-characters').click(); await audit('character picker'); await shot('characters-en');
    await page.locator('[data-character="rogue"]').click(); await page.locator('#close-characters').click();
    await page.locator('#open-dungeons').click(); await page.waitForTimeout(650);
    await page.locator('#start-game').click(); await idle(); await page.waitForTimeout(650);
    await page.locator('[data-test-action="cycle"]').click(); await idle();
    for (const card of await page.locator('#hand .card').all()) { await card.hover(); await audit('Luxue card'); }
    await page.locator('[data-test-action="charge"]').click();
    await page.locator('#actions').hover(); await audit('Luxue ultimate'); await shot('luxue-ultimate-en');
    await page.locator('#actions').click(); await idle(); await audit('Luxue targeting');
    await page.locator('#actions').click(); await idle();
    await page.locator('#open-battle-help').click(); await page.locator('.battle-rules summary').click();
    for (let i=0; i<4; i++) {
      await audit(`Luxue rules ${i}`);
      if (!(await page.locator('#rules-next').isDisabled())) await page.locator('#rules-next').click();
    }
    // Binding round-trips and clone support, including external dynamic writes.
    await page.evaluate(async () => {
      const { cloneLocalized, setLocale } = window.i18nTest;
      const original = document.createElement('span'); original.id = 'i18n-probe'; original.textContent = '槍刺'; document.body.append(original);
      await new Promise(r => setTimeout(r, 0));
      if (original.textContent !== 'Spear Thrust') throw Error('dynamic text not translated');
      const clone = cloneLocalized(original); clone.id = 'i18n-clone'; document.body.append(clone);
      await new Promise(r => setTimeout(r, 0)); setLocale('zh-Hant');
      if (original.textContent !== '槍刺' || clone.textContent !== '槍刺') throw Error('clone lost source');
      original.textContent = '橫掃'; setLocale('en');
      if (original.textContent !== 'Sweep') throw Error('new source lost');
      original.remove(); clone.remove();
    });
    const missing = await page.evaluate(() => window.i18nTest.missingTranslations());
    assert.deepEqual(missing, [], 'missing dynamic translations');
    assert.deepEqual(errors, []);
    const privatePage = await browser.newPage({ viewport: { width: 506, height: 900 }, locale: 'zh-TW' });
    await privatePage.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
      Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    });
    await privatePage.goto('http://127.0.0.1:1420');
    assert.equal(await privatePage.locator('html').getAttribute('lang'), 'zh-Hant');
    await privatePage.locator('#open-settings').click();
    await privatePage.locator('#village-settings [data-language="en"]').click();
    assert.equal(await privatePage.locator('#settings-title').textContent(), 'Settings');
    await privatePage.close();
    console.log('Bilingual settings, persistence, state, dynamic text, clone roundtrip, UI flows: passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
