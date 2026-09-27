import type { CardDefinition, Point } from '../types/game.ts';

const cross: Point[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const around: Point[] = [...cross, [1, 1], [1, -1], [-1, -1], [-1, 1]];
const rays = (directions: Point[], distance = 4): Point[] => directions.flatMap(([x, y]) => Array.from({ length: distance }, (_, i) => [x * (i + 1), y * (i + 1)] as Point));
const anywhere: Point[] = Array.from({ length: 81 }, (_, i) => [i % 9 - 4, Math.floor(i / 9) - 4] as Point).filter(([x, y]) => x !== 0 || y !== 0);

// Relative landing tiles; positive y points up. Shared by rules and card diagrams.
export const cards = {
  thrust: { name: '槍刺', hint: '刺擊十字兩格內第一隻怪物；或移到相鄰十字空格。二選一。', offsets: rays(cross, 2), canJump: false, copies: 5, cost: 1, effect: 'thrust' },
  advance: { name: '突進', hint: '移動到周圍 1 格；若落點有怪物則攻擊', offsets: around, canJump: false, copies: 3, cost: 1 },
  sweep: { name: '橫掃', hint: '點亮起的範圍，原地攻擊周圍八格的所有怪物', offsets: around, canJump: false, copies: 4, cost: 1, effect: 'sweep' },
  sidestep: { name: '側步', hint: '不消耗魂火，移到周圍一格空地；不攻擊。', offsets: around, canJump: false, copies: 4, cost: 0, effect: 'sidestep' },
  repel: { name: '槍柄推擊', hint: '攻擊相鄰十字一格並推後一格；菁英、扎根或後方受阻時只造成傷害。', offsets: cross, canJump: false, copies: 2, cost: 1, effect: 'repel' },
  recall: { name: '收刃', hint: '不消耗魂火，回收任意空地上的一把飛刀；原地獲得小刀、補一點魂火並抽一張牌。', offsets: anywhere, canJump: true, copies: 3, cost: 0, effect: 'recall' },
  dawnSpear: { name: '破曉一槍', hint: '點選亮起的直線，貫穿整條線上的怪物，各造成 2 點無視格擋傷害；不移動', offsets: cross, canJump: true, copies: 0, cost: 0, effect: 'ultimate' },
  throw: { name: '飛刀', hint: '原地攻擊十字方向第一隻怪物，刀留在命中格', offsets: rays(cross), canJump: false, copies: 5, cost: 1, effect: 'throw' },
  shadow: { name: '追影', hint: '瞬移至場上任意小刀格；若有怪物先攻擊，成功落地才撿刀', offsets: anywhere, canJump: true, copies: 4, cost: 1, effect: 'shadow' },
  lunge: { name: '突進', hint: '向周圍八方向移動 1 格，攻擊落點怪物', offsets: around, canJump: false, copies: 4, cost: 1 },
  knife: { name: '小刀', hint: '原地攻擊上下左右相鄰 1 格的怪物；使用後消失', offsets: cross, canJump: false, copies: 0, cost: 0, effect: 'knife' },
  absoluteShadow: { name: '絕影', hint: '選擇場上任意怪物，造成 2 點無視格擋傷害；擊殺才移至目標格', offsets: [], canJump: true, copies: 0, cost: 0, effect: 'ultimate' },
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
export type Loadout = 'basic' | 'rogue' | 'qinghe';
export const loadouts: Record<Loadout, CardId[]> = {
  basic: ['short', 'diagonal', 'rush', 'leap'],
  rogue: ['throw', 'shadow', 'lunge', 'recall'],
  qinghe: ['advance', 'thrust', 'sweep', 'sidestep', 'repel']
};
