const assert = require('node:assert/strict');

module.exports = async function checkBattleUx(page) {
  assert.match(await page.locator('#hint').textContent(), /先選一張牌/);
  assert.match(await page.locator('#actions').textContent(), /2\/2/);
  await page.locator('[data-card="rush"]').click();
  await page.locator('#turn').hover();
  assert.match(await page.locator('#hint').textContent(), /不可穿越敵人/);
  await page.locator('#open-battle-help').click();
  assert.equal(await page.locator('#battle-help').isVisible(), true);
  await page.locator('#battle-help li').first().click();
  await page.locator('#close-battle-help').click();
  assert.equal(await page.locator('[data-card="rush"]').getAttribute('aria-pressed'), 'true');
  await page.locator('.tile[data-x="2"][data-y="2"]').hover();
  assert.match(await page.locator('#hint').textContent(), /落點受擊預告/);
  await page.locator('[data-card="rush"]').click();
  await page.locator('#turn').hover();
  assert.equal(await page.locator('.card.selected').count(), 0);
  assert.match(await page.locator('#hint').textContent(), /先選一張牌/);
  assert.match(await page.locator('#end-forecast').textContent(), /留在原地受 0 傷害/);
};
