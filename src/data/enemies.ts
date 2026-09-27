import type { EnemyDefinition, EnemyKind } from '../types/game.ts';

export const enemies: Record<EnemyKind, EnemyDefinition> = {
  sprout: {
    name: '刺芽團子',
    behavior: '攻擊上下左右相鄰格；距離較遠時會靠近玩家。',
    skills: [{ id: 'thorns', name: '刺擊', hint: '攻擊上下左右相鄰格。', pattern: 'adjacent', guardsFront: false, holdAfter: false }]
  },
  sporecap: {
    name: '噴孢菇',
    behavior: '原地張傘噴孢，接著收傘休息；趁休息接近。',
    skills: [
      { id: 'spores', name: '孢子環', hint: '攻擊周圍八格；下一回合收傘休息。', pattern: 'ring', guardsFront: false, holdAfter: true },
      { id: 'recover', name: '收傘', hint: '本回合不攻擊、不移動；下一回合攻擊周圍八格。', pattern: 'none', guardsFront: false, holdAfter: true }
    ]
  },
  moth: {
    name: '荊翅蛾',
    behavior: '沿四條斜線攻擊兩格；上下左右是安全的接近方向。',
    skills: [{ id: 'flutter', name: '斜羽', hint: '攻擊四個斜向各兩格，越過其他怪物；距離遠時靠近玩家。', pattern: 'diagonal-ray', guardsFront: false, holdAfter: false }]
  },
  rootwarden: {
    name: '古根之心', boss: true, rooted: true,
    behavior: '十字根潮 → 斜向根潮 → 休眠，循環三回合；固定原地，無法推動。',
    skills: [
      { id: 'root-cross', name: '十字根潮', hint: '攻擊整條十字直線，造成兩點傷害；下一回合改攻斜線。', pattern: 'cross-ray', damage: 2, guardsFront: false, holdAfter: true },
      { id: 'root-diagonal', name: '斜向根潮', hint: '攻擊四條斜線，造成兩點傷害；下一回合休眠。', pattern: 'diagonal-ray', damage: 2, guardsFront: false, holdAfter: true },
      { id: 'recover', name: '休眠', hint: '本回合不攻擊，趁機接近出牌；下一回合攻擊整條十字直線。', pattern: 'none', guardsFront: false, holdAfter: true }
    ]
  },
  stump: {
    name: '古木守衛',
    behavior: '揮枝攻正前方、格擋正面；扎根攻斜角、不移動。',
    skills: [
      { id: 'sweep', name: '揮枝', hint: '攻擊正前方一格；擋住正面直線攻擊，請繞側面或背後。', pattern: 'front', guardsFront: true, holdAfter: true },
      { id: 'roots', name: '扎根', hint: '攻擊四個斜角相鄰格；停在原地蓄勢，正面防護解除。', pattern: 'diagonal', guardsFront: false, holdAfter: false }
    ]
  }
};
