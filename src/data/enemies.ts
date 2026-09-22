import type { EnemyDefinition, EnemyKind } from '../types/game.ts';

export const enemies: Record<EnemyKind, EnemyDefinition> = {
  sprout: {
    name: '刺芽團子',
    behavior: '攻擊上下左右相鄰格；距離較遠時會靠近玩家。',
    skills: [{ id: 'thorns', name: '刺擊', hint: '攻擊上下左右相鄰格。', pattern: 'adjacent', guardsFront: false, holdAfter: false }]
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
