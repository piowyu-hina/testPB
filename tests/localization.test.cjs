const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs');
const { translate, chooseLocale } = require('../src/i18n/translate.ts');
const { english } = require('../src/i18n/catalog.ts');
test('locale follows first system language unless a valid preference is saved', () => {
  for (const lang of ['zh-TW', 'zh-CN', 'zh-HK', 'zh']) assert.equal(chooseLocale(null, [lang]), 'zh-Hant');
  assert.equal(chooseLocale(null, ['fr', 'zh-TW']), 'en');
  assert.equal(chooseLocale('zh-Hant', ['en-US']), 'zh-Hant');
  assert.equal(chooseLocale('en', ['zh-TW']), 'en');
  assert.equal(chooseLocale('invalid', []), 'en');
});
test('catalog preserves Chinese and provides complete English phrases', () => {
  for (const [source, target] of Object.entries(english)) {
    assert.equal(translate(source, 'zh-Hant'), source);
    assert.equal(translate(source, 'en'), target);
    if (source !== '繁體中文') assert.doesNotMatch(target, /\p{Script=Han}/u);
  }
});
test('dynamic labels preserve numbers and naturally compose names and descriptions', () => {
  const examples = {
    '青禾的旅途': "Qinghe's Journey",
    '森林遺跡 · 第 2 / 6 間': 'Forest Ruins · Room 2 / 6',
    '生命 3 / 5，預計受到 2 傷害': 'Health 3 / 5, 2 incoming damage',
    '槍刺 · 抽牌（已用）': 'Spear Thrust · Draw (used)',
    '追擊槍刺': 'Follow-up Spear Thrust',
    '破曉一槍充能 4 / 4，點擊施放': 'Dawnbreak charge 4 / 4, Click to cast',
    '精英・古木守衛 · 生命 3/3': 'Elite Stump Guard · Health 3 / 3',
    '購買流轉，2金幣': 'Buy Flow for 2 coins',
    '強化一張槍刺為追擊槍刺': 'Upgrade one Spear Thrust to Follow-up Spear Thrust',
    '3,2，施放破曉一槍，直線命中 2 隻怪物': '3,2, Cast Dawnbreak along this line; targets: 2',
  };
  for (const [source, target] of Object.entries(examples)) assert.equal(translate(source, 'en'), target, source);
});
test('all authored card, enemy, upgrade and tutorial prose has an exact translation', () => {
  const files = ['src/data/cards.ts', 'src/data/enemies.ts', 'src/data/characterInfo.ts', 'src/data/dungeons/forest.ts', 'src/battle/Growth.ts', 'src/battle/BattleRewards.ts', 'src/battle/EnemyRules.ts', 'src/ui/engravingBadge.ts', 'src/screens/BattleScreen.ts'];
  const missing = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    // Single-quoted source literals, excluding templates and comments.
    for (const match of source.matchAll(/'([^'\r\n]*)'/g)) {
      const value = match[1];
      if (['上', '右', '下', '左', '精英・', '（已用）', ' · 使用後消失'].includes(value)) continue;
      if (/\p{Script=Han}/u.test(translate(value, 'en'))) missing.push(`${file}: ${value}`);
    }
  }
  assert.deepEqual(missing, []);
});
