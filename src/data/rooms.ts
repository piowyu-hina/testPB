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
      { id: 0, kind: 'sprout', position: [2, 2] },
      { id: 1, kind: 'sprout', position: [0, 3] },
      { id: 2, kind: 'sprout', position: [4, 3] },
      { id: 3, kind: 'sprout', position: [3, 4] }
    ]
  },
  {
    name: '古木伏擊',
    hero: [2, 0],
    enemies: [
      { id: 0, kind: 'sprout', position: [2, 2] },
      { id: 1, kind: 'stump', position: [1, 3], facing: 'south', health: 2 },
      { id: 2, kind: 'stump', position: [3, 3], facing: 'south', skillIndex: 1, health: 2 },
      { id: 3, kind: 'sprout', position: [2, 4] }
    ]
  },
  {
    name: '遺跡守衛',
    hero: [2, 0],
    enemies: [
      { id: 0, kind: 'stump', position: [2, 3], elite: true, facing: 'south', health: 3 },
      { id: 1, kind: 'sprout', position: [1, 2], health: 2 },
      { id: 2, kind: 'sprout', position: [3, 2], health: 2 },
      { id: 3, kind: 'sprout', position: [4, 4] }
    ]
  }
];
