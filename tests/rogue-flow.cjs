const assert = require('node:assert/strict');
module.exports = async function checkRogue(page, output) {
  const idle = () => page.waitForFunction(() => document.querySelector('#game').getAttribute('aria-busy') === 'false');
  await require('./village-flow.cjs').chooseCharacter(page, 'rogue');
  await page.locator('#open-dungeons').click();
  await page.locator('#start-game').click();
  assert.deepEqual(await page.locator('#hand .card').evaluateAll(nodes => nodes.map(n => n.dataset.card)), ['throw', 'shadow', 'lunge']);
  assert.equal(await page.locator('[data-card="shadow"] .card-requirement').count(), 0);
  await page.locator('#turn').hover();
  assert.equal(await page.locator('#hint').innerText(), '');
  await page.locator('[data-card="shadow"]').hover();
  assert.match(await page.locator('#hint').innerText(), /^追影\n瞬移至場上任意小刀格/);
  assert.match(await page.locator('#hint .hint-warning').innerText(), /需要場上小刀/);
  assert.match(await page.locator('[data-card="shadow"]').getAttribute('aria-label'), /需要場上小刀/);
  if (output) await page.screenshot({path: `${output}/rogue-shadow-warning.png`});
  await page.locator('#turn').hover();
  const layoutBefore = await page.evaluate(() => ({
    board: document.querySelector('.board-shell').getBoundingClientRect().top,
    hand: document.querySelector('#hand').getBoundingClientRect().top,
    hint: document.querySelector('#hint').getBoundingClientRect().top
  }));
  const origin = await page.locator('[data-actor="hero"]').getAttribute('style');
  await page.locator('[data-card="throw"]').click();
  await page.locator('.tile[data-x="2"][data-y="2"]').hover();
  assert.equal(await page.locator('#ghost').isVisible(), false);
  await page.locator('.tile[data-x="2"][data-y="2"]').click();
  await idle();
  assert.equal(await page.locator('[data-actor="hero"]').getAttribute('style'), origin);
  assert.equal(await page.locator('.ground-knife').count(), 1);
  await page.locator('#turn').hover();
  await page.locator('.tile[data-x="2"][data-y="2"]').hover();
  assert.match(await page.locator('#tile-info').innerText(), /地上小刀/);
  assert.equal(await page.locator('#hint .hint-warning').count(), 0);
  assert.equal(await page.locator('#hint').textContent(), '');
  assert.equal(await page.locator('[data-actor="0"]').count(), 0);
  if (output) await page.screenshot({path: `${output}/rogue-ground-knife.png`});
  await page.locator('[data-card="shadow"]').click();
  await page.locator('.tile[data-x="2"][data-y="2"]').click();
  await idle();
  assert.equal(await page.locator('#turn').textContent(), '第 1 回合');
  assert.match(await page.locator('#actions').textContent(), /1\/2/);
  assert.equal(await page.locator('.ground-knife').count(), 0);
  assert.equal(await page.locator('[data-card="knife"]').count(), 1);
  assert.notEqual(await page.locator('[data-actor="hero"]').getAttribute('style'), origin);
  if (output) await page.screenshot({path: `${output}/rogue-knife-pickup.png`});
  assert.equal(await page.locator('#hand .card').count(), 3);
  await page.locator('#end-turn').click();
  await idle();
  assert.equal(await page.locator('[data-card="knife"]').count(), 1);
  assert.equal(await page.locator('#hand .card').count(), 4);
  assert.deepEqual(await page.locator('#hand .card').evaluateAll(nodes => nodes.map(node => Number(node.dataset.index))), [0, 1, 2, 3]);
  const layoutAfter = await page.evaluate(() => ({
    board: document.querySelector('.board-shell').getBoundingClientRect().top,
    hand: document.querySelector('#hand').getBoundingClientRect().top,
    hint: document.querySelector('#hint').getBoundingClientRect().top
  }));
  for (const key of Object.keys(layoutBefore))
    assert.ok(Math.abs(layoutAfter[key] - layoutBefore[key]) < 1, `${key} shifted after adding a fourth card`);
  if (output) await page.screenshot({path: `${output}/rogue-knife-next-turn.png`});
  assert.equal(await page.locator('[data-card="lunge"]').count(), 1);
  const heroBeforeLunge = await page.locator('[data-actor="hero"]').getAttribute('style');
  await page.locator('[data-card="lunge"]').click();
  assert.ok((await page.locator('.tile[data-x="2"][data-y="3"]').getAttribute('class')).includes('legal'));
  if (output) await page.screenshot({path: `${output}/rogue-lunge-preview.png`});
  await page.locator('.tile[data-x="2"][data-y="3"]').click();
  await idle();
  assert.notEqual(await page.locator('[data-actor="hero"]').getAttribute('style'), heroBeforeLunge);
  await page.locator('[data-card="knife"]').click();
  await page.locator('.tile.legal').first().click();
  await idle();
  assert.equal(await page.locator('[data-card="knife"]').count(), 0);
  await page.reload();
};
