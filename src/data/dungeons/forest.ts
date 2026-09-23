import type { DungeonDefinition } from '../../types/game.ts';

// Pure gameplay data: no asset imports here. Room.ts/Journey.ts import this directly,
// and it must stay loadable outside Vite (plain Node test runner). Presentational art
// (e.g. the summary card image) lives in data/art.ts, keyed by this dungeon's id.
export const forestRuins: DungeonDefinition = {
  id: 'forest',
  name: '森林遺跡',
  subtitle: '第一章 · 林蔭深處',
  description: '沿著被苔蘚覆蓋的石徑，穿過林間伏擊。古老遺跡的守衛，正等在旅途盡頭。',
  // Keep the original introductory room in data for later restoration. The active route starts
  // with a one-enemy encounter so combat and room-clear feedback are quick to test.
  startIndex: 1,
  rooms: [
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
      name: '林緣遭遇',
      hero: [2, 0],
      enemies: [
        { id: 0, kind: 'sprout', position: [2, 2] }
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
  ]
};
