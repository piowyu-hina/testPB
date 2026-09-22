const assert = require('node:assert/strict');
exports.chooseCharacter = async (page, id) => {
  await page.locator('#home').waitFor();
  await page.locator('#open-characters').click();
  await page.locator(`[data-character="${id}"]`).click();
};

exports.openDungeon = async (page, touch = false) => {
  await page.locator('.screen-curtain').waitFor({ state: 'hidden' });
  if (await page.locator('#home').isVisible()) {
    await page.locator('#open-dungeons')[touch ? 'tap' : 'click']();
  }
  await page.locator('#dungeon').waitFor();
  await page.locator('.screen-curtain').waitFor({ state: 'hidden' });
};

exports.toggleVillageTheme = async (page) => {
  await page.locator('#open-settings').click();
  assert.equal(await page.locator('#village-settings').isVisible(), true);
  await page.locator('#home .theme-toggle').click();
  await page.locator('#close-settings').click();
  assert.equal(await page.locator('#village-settings').isVisible(), false);
};

exports.checkVillage = async (page) => {
  assert.equal(await page.locator('#guild-entry').isDisabled(), true);
  const theme = await page.locator('html').getAttribute('data-theme');
  await exports.toggleVillageTheme(page);
  assert.notEqual(await page.locator('html').getAttribute('data-theme'), theme);
  await exports.toggleVillageTheme(page);
  assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
  await page.locator('#open-settings').click();
  const sound = await page.locator('#sound-toggle').getAttribute('aria-pressed');
  await page.locator('#sound-toggle').click();
  assert.notEqual(await page.locator('#sound-toggle').getAttribute('aria-pressed'), sound);
  await page.locator('#sound-toggle').click();
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'), sound);
  await page.locator('#close-settings').click();
  for (let i = 0; i < 3; i++) {
    await exports.openDungeon(page);
    assert.equal(await page.locator('#home').isVisible(), false);
    assert.equal(await page.locator('#game').isVisible(), false);
    assert.equal(await page.locator('#dungeon-title').textContent(), '森林遺跡');
    assert.equal(await page.locator('#start-label').textContent(), '出發');
    await page.locator('#dungeon-back').click();
    await page.locator('#home').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#home').isVisible(), true);
  }
};
