'use strict';
const { openDungeon, checkVillage } = require('./village-flow.cjs');
const assert = require('node:assert/strict');
module.exports = async function checkCharacters(page) {
  const loaded = () =>
    page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0)
    );
  await page.locator('#home').waitFor();
  await checkVillage(page);
  assert.equal(await page.evaluate(() => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    document.querySelector('#home').dispatchEvent(event);
    return event.defaultPrevented;
  }), true);
  assert.equal(await page.locator('.character-choice').count(), 0);
  await loaded();
  await page.evaluate(() => localStorage.setItem('testpb.character', 'adventurer'));
  await page.reload();
  await loaded();
  {
    const name = '莉娜';
    await page.reload();
    await loaded();
    assert.equal(await page.locator('#hero-name').textContent(), name);
    await openDungeon(page);
    await page.locator('#start-game').click();
    await page.locator('.card').first().click();
    await page.locator('#game').dispatchEvent('pointerdown', { button: 2 });
    assert.equal(await page.locator('.card.selected').count(), 1);
    assert.equal(await page.evaluate(() => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
      document.querySelector('#game').dispatchEvent(event);
      return event.defaultPrevented;
    }), true);
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
