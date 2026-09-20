'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { Journey } = require('../src/battle/Journey.ts');

module.exports = async function playJourney(page, output, prefix = '') {
  const run = new Journey(1);
  const idle = () =>
    page.waitForFunction(
      () => document.getElementById('game').getAttribute('aria-busy') === 'false'
    );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let stage = 0; stage < 3; stage++) {
    const model = run.room;
    assert.equal(await page.locator('.room-step.current').textContent(), String(stage + 1));
    assert.equal(await page.locator('#health .empty').count(), 5 - model.health);
    if (stage === 2) {
      assert.equal(await page.locator('.elite-crown').count(), 1);
      await page.screenshot({ path: path.join(output, `${prefix}elite-room.png`) });
    }
    for (let steps = 0; steps < 100 && !model.finished; steps++) {
      let best = null;
      model.hand.forEach((_, card) => {
        for (let y = 0; y < 5; y++)
          for (let x = 0; x < 5; x++) {
            const point = [x, y],
              preview = model.preview(card, point);
            if (!preview) continue;
            const score =
              (preview.removedId >= 0 ? 15 : 0) -
              preview.damage * 10 -
              ((x - 2) ** 2 + (y - 2) ** 2) * 0.1;
            if (!best || score > best.score) best = { card, point, score };
          }
      });
      if (!best) {
        await page.locator('#end-turn').click();
        model.endTurn();
      } else {
        await page.locator(`.card[data-index="${best.card}"]`).click();
        await page.locator(`.tile[data-x="${best.point[0]}"][data-y="${best.point[1]}"]`).click();
        model.move(best.card, best.point);
        if (!model.finished && model.actions === 0) model.endTurn();
      }
      await idle();
      assert.equal(await page.locator('#health .empty').count(), 5 - model.health);
      assert.equal(await page.locator('#turn').textContent(), `第 ${model.turn} 回合`);
    }
    assert.ok(model.won, `Room ${stage + 1} did not clear`);
    assert.equal(
      await page.locator('#result-title').textContent(),
      stage === 2 ? '旅途完成！' : '房間通過'
    );
    assert.equal(await page.locator('#game').evaluate((el) => el.inert), true);
    if (stage < 2) {
      assert.equal(
        await page.locator('#result-recovery .empty').count(),
        5 - model.health - run.recovery
      );
      await page.screenshot({ path: path.join(output, `${prefix}room-${stage + 1}-clear.png`) });
      // Visiting home on the boundary must preserve the result, without healing twice.
      await page.locator('#result-home').click();
      assert.equal(await page.locator('#start-label').textContent(), '繼續旅途');
      await page.locator('#start-game').click();
      assert.equal(await page.locator('#result').isVisible(), true);
      await page.locator('#replay').click();
      run.advance();
      assert.equal(await page.locator('#result').isVisible(), false);
      assert.equal(await page.locator('#game').evaluate((el) => el.inert), false);
    }
  }
  await page.screenshot({ path: path.join(output, `${prefix}victory.png`) });
  assert.ok(run.won);
};
