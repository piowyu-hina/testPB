'use strict';
const assert = require('node:assert/strict');
module.exports = async function checkCharacters(page) {
  const loaded = () =>
    page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0)
    );
  await page.locator('#home').waitFor();
  assert.equal(await page.locator('.character-choice').count(), 2);
  for (const [id, name] of [
    ['adventurer', '冒險者'],
    ['lina', '莉娜']
  ]) {
    await page.locator(`[data-character="${id}"]`).click();
    await loaded();
    assert.equal(await page.locator('#hero-name').textContent(), name);
    assert.equal(
      await page.locator(`[data-character="${id}"]`).getAttribute('aria-pressed'),
      'true'
    );
    await page.reload();
    await loaded();
    assert.equal(await page.locator('#hero-name').textContent(), name);
    await page.locator('#start-game').click();
    assert.equal(await page.locator('[data-actor="hero"] img').getAttribute('alt'), name);
    assert.equal(
      await page.locator('#ghost img').getAttribute('src'),
      await page.locator('[data-actor="hero"] img').getAttribute('src')
    );
    await page.locator('#back-home').click();
  }
  await loaded();
  await page.reload();
  await loaded();
};
