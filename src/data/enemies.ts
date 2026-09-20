import type { EnemyDefinition, EnemyKind } from '../types/game.ts';

export const enemies: Record<EnemyKind, EnemyDefinition> = {
  imp: {
    name: '赤角',
    hint: '直向攻擊',
    attacks: [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0]
    ]
  },
  bat: {
    name: '暮翼',
    hint: '斜向攻擊',
    attacks: [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1]
    ]
  }
};
