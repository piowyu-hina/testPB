import type { Enemy, Point } from '../types/game.ts';

export interface RoomDefinition {
  name: string;
  hero: Point;
  enemies: Enemy[];
}

export const rooms: RoomDefinition[] = [
  {
    name: '林間小徑',
    hero: [2, 0],
    enemies: [
      { id: 0, kind: 'imp', position: [2, 2] },
      { id: 1, kind: 'bat', position: [0, 3] },
      { id: 2, kind: 'imp', position: [4, 3] },
      { id: 3, kind: 'bat', position: [3, 4] }
    ]
  },
  {
    name: '交錯伏擊',
    hero: [2, 0],
    enemies: [
      { id: 0, kind: 'imp', position: [2, 2] },
      { id: 1, kind: 'bat', position: [1, 3] },
      { id: 2, kind: 'bat', position: [3, 3] },
      { id: 3, kind: 'imp', position: [2, 4] }
    ]
  },
  {
    name: '赤角守衛',
    hero: [2, 0],
    enemies: [
      { id: 0, kind: 'imp', position: [2, 3], elite: true },
      { id: 1, kind: 'bat', position: [1, 2] },
      { id: 2, kind: 'bat', position: [3, 2] },
      { id: 3, kind: 'imp', position: [4, 4] }
    ]
  }
];
