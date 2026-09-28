const { chromium } = require('playwright'), assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 506, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const idle = () => page.waitForFunction(() => document.querySelector('#game')?.getAttribute('aria-busy') === 'false'
    && !document.querySelector('#game')?.classList.contains('dealing-hand'));
  const tile = (x, y) => page.locator(`.tile[data-x="${x}"][data-y="${y}"]`);
  try {
    for (const choice of ['push', 'kill']) {
      await page.goto('http://127.0.0.1:1420');
      await page.evaluate(async choice => {
        const { GameSession } = await import('/src/app/GameSession.ts');
        const { mountBattle } = await import('/src/screens/BattleScreen.ts');
        document.querySelectorAll('#app > .screen-root').forEach(e => e.remove());
        const s = new GameSession(), r = s.journey.room;
        r.hero = [2, 1]; r.health = 5; r.actions = 2;
        r.hand = choice === 'push' ? ['repel', 'thrust', 'sidestep'] : ['thrust', 'thrust', 'sidestep'];
        r.enemies = [
          { id: 0, kind: 'stump', position: [1, 1], health: 3, maxHealth: 3, elite: true, skillIndex: 1, facing: 'south' },
          { id: 1, kind: 'sporecap', position: [2, 2], health: 2, maxHealth: 2, ward: true }
        ];
        window.wardTest = s;
        const screen = mountBattle(document.querySelector('#app'), s, () => {}); screen.root.hidden = false; screen.enter();
      }, choice);
      await idle();
      assert.equal(await page.locator('#ward-links line').count(), 1);
      assert.equal(await page.locator('.actor.warded .guard-shield').evaluate(e => getComputedStyle(e).display), 'block');
      await tile(2, 2).hover();
      await page.screenshot({ path: `test-results/ward-${choice}-source.png` });
      // Verify an ordinary hit on the protected guard visibly predicts a block.
      await page.locator('#hand [data-card="thrust"]').first().click();
      await tile(1, 1).hover();
      assert.equal(await tile(1, 1).evaluate(e => e.classList.contains('blocked')), true);
      await page.screenshot({ path: `test-results/ward-${choice}-blocked.png` });
      await page.locator('#hand .card').first().click();
      // For kill, the first thrust was already selected: click again to select after cancellation.
      if (choice === 'kill') await page.locator('#hand .card').first().click();
      await tile(2, 2).hover();
      assert.equal(await page.locator('#ward-links line').count(), choice === 'push' ? 0 : 1);
      await page.screenshot({ path: `test-results/ward-${choice}-opening.png` });
      await tile(2, 2).click(); await idle();
      await page.locator('#hand [data-card="thrust"]').click();
      const target = choice === 'push' ? [1, 1] : [2, 2];
      await tile(...target).hover();
      assert.equal(await tile(...target).evaluate(e => e.classList.contains('blocked')), false);
      await tile(...target).click(); await idle();
      await page.locator('#hand [data-card="sidestep"]').click(); await tile(3, 0).click(); await idle();
      await page.locator('#end-turn').click(); await idle();
      assert.deepEqual(await page.evaluate(() => {
        const r = window.wardTest.journey.room;
        return { hp: r.health, guard: r.enemies[0].health, source: r.enemies.find(e => e.ward)?.health ?? 0 };
      }), { hp: 5, guard: choice === 'push' ? 2 : 3, source: choice === 'push' ? 1 : 0 });
      assert.equal(await page.locator('#ward-links line').count(), choice === 'push' ? 1 : 0);
      await page.screenshot({ path: `test-results/ward-${choice}-result.png` });
    }
    assert.deepEqual(errors, []);
    console.log('Pointer choices: push -> punish -> retreat, or permanent source kill -> retreat; live/previews match');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
