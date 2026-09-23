'use strict';
const { openDungeon } = require('./village-flow.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { Journey } = require('../src/battle/Journey.ts');
const { nextStep } = require('./explore-helper.cjs');
const { enemySkill } = require('../src/battle/EnemyRules.ts');

module.exports = async function playJourney(page, output, prefix = '', loadout = 'basic') {
  const run = new Journey(1, loadout);
  let checkedBlock = false;
  const idle = () =>
    page.waitForFunction(
      () => document.getElementById('game').getAttribute('aria-busy') === 'false'
    );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let stage = 0; stage < run.total; stage++) {
    const model = run.room;
    assert.equal(await page.locator('#health .empty').count(), 5 - model.health);
    if (stage === 1) {
      assert.equal(await page.locator('#actors .actor.guarding .guard-shield').count(), 1);
      assert.equal(await page.locator('#actors .actor.guarding .guard-shield').first().isVisible(), true);
      await page.locator('.tile[data-x="1"][data-y="3"]').click();
      assert.match(await page.locator('#hint').textContent(), /古木守衛 · 生命 2\/2/);
      assert.equal(await page.locator('.focus-threat').count(), 1);
      await page.screenshot({ path: path.join(output, `${prefix}guard-sweep.png`) });
      await page.locator('.tile[data-x="1"][data-y="3"]').click();
      await page.locator('.tile[data-x="3"][data-y="3"]').click();
      assert.match(await page.locator('#hint').textContent(), /古木守衛 · 生命 2\/2/);
      assert.equal(await page.locator('.focus-threat').count(), 4);
      await page.screenshot({ path: path.join(output, `${prefix}guard-roots.png`) });
      await page.locator('.tile[data-x="3"][data-y="3"]').click();
    }
    if (stage === 2) {
      assert.equal(await page.locator('.elite-crown').count(), 1);
      await page.screenshot({ path: path.join(output, `${prefix}elite-room.png`) });
    }
    for (let steps = 0; steps < 100 && !model.finished; steps++) {
      let best = null, blockedMove = null;
      model.hand.forEach((_, card) => {
        for (let y = 0; y < 5; y++)
          for (let x = 0; x < 5; x++) {
            const point = [x, y],
              preview = model.preview(card, point);
            if (!preview) continue;
            if (preview.blocked) blockedMove = { card, point };
            const score =
              (preview.removedId >= 0 ? 15 : preview.hitId !== undefined && !preview.blocked ? 12 : 0) -
              preview.damage * 10 -
              ((x - 2) ** 2 + (y - 2) ** 2) * 0.1;
            if (!best || score > best.score) best = { card, point, score };
          }
      });
      if (blockedMove && !checkedBlock) {
        const card = page.locator(`.card[data-index="${blockedMove.card}"]`);
        const tile = page.locator(`.tile[data-x="${blockedMove.point[0]}"][data-y="${blockedMove.point[1]}"]`);
        await card.click();
        await tile.hover();
        assert.ok((await tile.getAttribute('class')).includes('blocked'));
        assert.ok((await page.locator('#tile-info').textContent()).includes('格擋'));
        await page.screenshot({ path: path.join(output, `${prefix}guard-block-preview.png`) });
        await card.click();
        checkedBlock = true;
      }
      if (!best) {
        await page.locator('#end-turn').click();
        model.endTurn();
      } else {
        await page.locator(`.card[data-index="${best.card}"]`).click();
        await page.locator(`.tile[data-x="${best.point[0]}"][data-y="${best.point[1]}"]`).click();
        model.move(best.card, best.point);
        if (!model.finished && !model.hasPlayableCard()) {
          await idle();
          assert.equal(await page.locator('#turn').textContent(), `第 ${model.turn} 回合`);
          await page.locator('#end-turn').click();
          model.endTurn();
        }
      }
      await idle();
      for (const enemy of model.enemies) {
        assert.equal(await page.locator(`[data-actor="${enemy.id}"]`).getAttribute('data-skill'), enemySkill(enemy).id);
        assert.equal(await page.locator(`[data-actor="${enemy.id}"]`).getAttribute('data-facing'), enemy.facing ?? 'south');
      }
      assert.equal(await page.locator('.enemy-health').count(), 0);
      assert.equal(await page.locator('#health .empty').count(), 5 - model.health);
      assert.equal(
        await page.locator('#turn').textContent(),
        model.won && stage < run.total - 1 ? '' : `第 ${model.turn} 回合`
      );
    }
    assert.ok(model.won, `Room ${stage + 1} did not clear`);
    if (stage < run.total - 1) {
      assert.equal(await page.locator('#result').isVisible(), false);
      assert.equal(await page.locator('#room-exit').isVisible(), true);
      assert.equal(await page.locator('#hand').isVisible(), true);
      assert.deepEqual(await page.locator('.card').evaluateAll(nodes => nodes.map(n => n.dataset.card)), ['forward']);
      await page.screenshot({ path: path.join(output, `${prefix}room-${stage + 1}-clear.png`) });
      // Clicking the floor without selecting a card must not move the hero.
      const heroStyle = await page.locator('[data-actor="hero"]').getAttribute('style');
      await page.locator('.tile[data-x="0"][data-y="0"]').click();
      await idle();
      assert.equal(await page.locator('[data-actor="hero"]').getAttribute('style'), heroStyle);
      assert.equal(await page.locator('#health .empty').count(), 5 - model.health);
      await page.locator('#back-home').click();
      await openDungeon(page);
      assert.equal(await page.locator('#start-label').textContent(), '繼續旅途');
      await page.locator('#start-game').click();
      assert.equal(await page.locator('#result').isVisible(), false);
      assert.equal(await page.locator('#room-exit').isVisible(), true);
      // Exercise the walking animation and rapid-click lock, not just reduced motion.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      // If combat ended on the exit tile, step away before entering the opened door.
      if (model.hero.join() === run.exit.join()) {
        const card = model.availableCards.indexOf('forward'),
          point = [2, 3];
        await page.locator(`.card[data-index="${card}"]`).click();
        await page.locator('.tile[data-x="2"][data-y="3"]').click();
        model.explore(card, point);
        await idle();
      }
      for (let steps = 0; model.hero.join() !== run.exit.join() && steps < 10; steps++) {
        const { card, point } = nextStep(model, run.exit);
        await page.locator(`.card[data-index="${card}"]`).click();
        const target = page.locator(`.tile[data-x="${point[0]}"][data-y="${point[1]}"]`);
        assert.ok((await target.getAttribute('class')).includes('legal'));
        await target.click();
        await target.dispatchEvent('click', { detail: 1 });
        model.explore(card, point);
        await idle();
        assert.equal(await page.locator('.card').count(), model.hero.join() === run.exit.join() ? 3 : 1);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.deepEqual(model.hero, run.exit);
      run.advance();
      assert.equal(await page.locator('#result').isVisible(), false);
      assert.equal(await page.locator('#game').evaluate((el) => el.inert), false);
      assert.equal(await page.locator('#room-exit').isVisible(), false);
    } else {
      assert.equal(await page.locator('#result-title').textContent(), '旅途完成！');
      assert.equal(await page.locator('#game').evaluate((el) => el.inert), true);
    }
  }
  await page.screenshot({ path: path.join(output, `${prefix}victory.png`) });
  assert.ok(run.won);
  assert.ok(checkedBlock, 'Journey must exercise the frontal block warning.');
};
