const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 506, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const idle = () => page.waitForFunction(() => document.querySelector('#game')?.getAttribute('aria-busy') === 'false'
    && !document.querySelector('#game')?.classList.contains('dealing-hand'));
  const tile = (x, y) => page.locator(`.tile[data-x="${x}"][data-y="${y}"]`);
  try {
    for (const elite of [false, true]) {
      await page.goto('http://127.0.0.1:1420');
      await page.evaluate(async elite => {
        const { GameSession } = await import('/src/app/GameSession.ts');
        const { mountBattle } = await import('/src/screens/BattleScreen.ts');
        document.querySelectorAll('#app > .screen-root').forEach(e => e.remove());
        const session = new GameSession(), room = session.journey.room;
        room.hero = [1, 2]; room.health = 5; room.hand = ['sidestep', 'thrust'];
        room.enemies = [{ id: 0, kind: 'stump', position: [2, 2], facing: 'south', elite,
          health: elite ? 3 : 2, maxHealth: elite ? 3 : 2 }];
        window.guardTest = session;
        const screen = mountBattle(document.querySelector('#app'), session, () => {});
        screen.root.hidden = false; screen.enter();
      }, elite);
      await idle();
      await tile(2, 2).hover();
      assert.equal(await page.locator('.focus-threat').count(), elite ? 5 : 1);
      assert.equal(await tile(1, 2).getAttribute('data-danger'), elite ? '2' : '0');
      assert.equal(await tile(2, 3).getAttribute('data-danger'), '0');
      await page.screenshot({ path: `test-results/guard-fan-${elite ? 'elite' : 'normal'}-hover.png` });
      // A real pointer sequence: leave the threatened flank, attack from the rear, then resolve.
      await page.locator('#hand [data-card="sidestep"]').click();
      await tile(2, 3).hover();
      await page.screenshot({ path: `test-results/guard-fan-${elite ? 'elite' : 'normal'}-escape.png` });
      await tile(2, 3).click(); await idle();
      await page.locator('#hand [data-card="thrust"]').click();
      await tile(2, 2).hover();
      assert.equal(await tile(2, 2).evaluate(e => e.classList.contains('blocked')), false);
      await page.screenshot({ path: `test-results/guard-fan-${elite ? 'elite' : 'normal'}-counter.png` });
      await tile(2, 2).click(); await idle();
      await page.locator('#end-turn').click(); await idle();
      assert.deepEqual(await page.evaluate(() => {
        const room = window.guardTest.journey.room;
        return { health: room.health, hero: room.hero, enemyHealth: room.enemies[0].health, phase: room.enemies[0].skillIndex };
      }), { health: 5, hero: [2, 3], enemyHealth: elite ? 2 : 1, phase: 1 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight
        || document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    console.log('Normal/elite warning comparison, sidestep to rear, counterattack and damage resolution passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
