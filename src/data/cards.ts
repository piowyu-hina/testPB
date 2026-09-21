import type { CardDefinition, Point } from '../types/game.ts';

const cross: Point[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const around: Point[] = [...cross, [1, 1], [1, -1], [-1, -1], [-1, 1]];
const rays = (directions: Point[]): Point[] => directions.flatMap(([x, y]) => [1, 2, 3, 4].map(n => [x * n, y * n] as Point));

// Relative landing tiles; positive y points up. Shared by rules and card diagrams.
export const cards = {
  throw: { name: '飛刀', hint: '原地攻擊十字方向第一隻怪物，刀留在命中格', offsets: rays(cross), canJump: false, copies: 4, cost: 1, effect: 'throw' },
  shadow: { name: '追影', hint: '直線或斜線任意距離移動；只有刀格的怪物可攻擊', offsets: rays(around), canJump: false, copies: 4, cost: 1, effect: 'shadow' },
  whirl: { name: '迴旋斬', hint: '原地攻擊周圍八格所有怪物', offsets: [[0, 0]], canJump: false, copies: 4, cost: 1, effect: 'whirl' },
  knife: { name: '小刀', hint: '原地刺擊十字相鄰一格；用後或回合結束消失', offsets: cross, canJump: false, copies: 0, cost: 0, effect: 'knife' },
  forward: { name: '前進', hint: '清場後走向周圍一格，可重複使用且不消耗行動', offsets: around, canJump: false, copies: 0 },
  short: {
    name: '短步',
    hint: '上下左右移動 1 格',
    offsets: [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0]
    ],
    canJump: false,
    copies: 3
  },
  diagonal: {
    name: '斜步',
    hint: '斜向移動 1 格',
    offsets: [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1]
    ],
    canJump: false,
    copies: 3
  },
  rush: {
    name: '突進',
    hint: '上下左右移動 2 格，不可穿越敵人',
    offsets: [
      [0, 2],
      [2, 0],
      [0, -2],
      [-2, 0]
    ],
    canJump: false,
    copies: 3
  },
  leap: {
    name: '躍步',
    hint: '斜向移動 2 格，可越過敵人',
    offsets: [
      [2, 2],
      [2, -2],
      [-2, -2],
      [-2, 2]
    ],
    canJump: true,
    copies: 3
  }
} satisfies Record<string, CardDefinition>;
export type CardId = keyof typeof cards;
export type Loadout = 'basic' | 'rogue';
export const loadouts: Record<Loadout, CardId[]> = {
  basic: ['short', 'diagonal', 'rush', 'leap'],
  rogue: ['throw', 'shadow', 'whirl']
};
