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
    for (const phase of [0, 1]) for (const elite of [false, true]) {
      await page.goto('http://127.0.0.1:1420');
      await page.evaluate(async ({ elite, phase }) => {
        const { GameSession } = await import('/src/app/GameSession.ts');
        const { mountBattle } = await import('/src/screens/BattleScreen.ts');
        document.querySelectorAll('#app > .screen-root').forEach(e => e.remove());
        const session = new GameSession(), room = session.journey.room;
        room.hero = phase === 0 ? [1, 2] : [2, 1]; room.health = 5; room.hand = ['sidestep', 'thrust'];
        room.enemies = [{ id: 0, kind: 'stump', position: [2, 2], facing: 'south', elite,
          health: elite ? 3 : 2, maxHealth: elite ? 3 : 2, skillIndex: phase }];
        window.guardTest = session;
        const screen = mountBattle(document.querySelector('#app'), session, () => {});
        screen.root.hidden = false; screen.enter();
      }, { elite, phase });
      await idle();
      await tile(2, 2).hover();
      assert.equal(await page.locator('.focus-threat').count(), phase === 0 ? (elite ? 5 : 1) : (elite ? 8 : 4));
      assert.equal(await tile(1, 2).getAttribute('data-danger'), elite ? '1' : '0');
      assert.equal(await tile(2, 0).getAttribute('data-danger'), '0');
      const name = `test-results/guard-${phase === 0 ? 'fan' : 'roots'}-${elite ? 'elite' : 'normal'}`;
      await page.screenshot({ path: `${name}-hover.png` });
      // A real pointer sequence: leave the threatened flank, attack from the rear, then resolve.
      await page.locator('#hand [data-card="sidestep"]').click();
      const escape = phase === 0 ? [2, 3] : [2, 0];
      await tile(...escape).hover();
      await page.screenshot({ path: `${name}-escape.png` });
      await tile(...escape).click(); await idle();
      await page.locator('#hand [data-card="thrust"]').click();
      await tile(2, 2).hover();
      assert.equal(await tile(2, 2).evaluate(e => e.classList.contains('blocked')), false);
      await page.screenshot({ path: `${name}-counter.png` });
      await tile(2, 2).click(); await idle();
      await page.locator('#end-turn').click(); await idle();
      assert.deepEqual(await page.evaluate(() => {
        const room = window.guardTest.journey.room;
        return { health: room.health, hero: room.hero, enemyHealth: room.enemies[0].health, phase: room.enemies[0].skillIndex };
      }), { health: 5, hero: escape, enemyHealth: elite ? 2 : 1, phase: 1 - phase });
      assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight
        || document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    console.log('Both normal/elite phases: warnings, sidestep escape, close/ranged counterattack and damage resolution passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
