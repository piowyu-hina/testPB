import type { CardDefinition } from '../types/game.ts';

// Relative landing tiles; positive y points up. Shared by rules and card diagrams.
export const cards = {
  short: {
    name: '短步',
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
    hint: '不可穿越',
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
    hint: '可越過敵人',
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
