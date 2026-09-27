import type { DungeonDefinition } from '../../types/game.ts';

// Pure gameplay data: no asset imports here. Room.ts/Journey.ts import this directly,
// and it must stay loadable outside Vite (plain Node test runner). Presentational art
// (e.g. the summary card image) lives in data/art.ts, keyed by this dungeon's id.
export const forestRuins: DungeonDefinition = {
  id: 'forest',
  name: '森林遺跡',
  subtitle: '第一章 · 林蔭深處',
  description: '穿越孢霧、繞過古木、避開荊翅。六段林間石徑的盡頭，苔角鹿靈守著古老聖所。',
  // Archived original introductory room stays at index 0; the six-room route starts at 1.
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
      name: '孢霧石徑',
      hero: [2, 0],
      enemies: [
        { id: 0, kind: 'sporecap', position: [2, 3], health: 2, skillIndex: 1 },
        { id: 1, kind: 'sprout', position: [0, 3] }
      ]
    },
    {
      name: '古木伏擊',
      hero: [2, 0],
      enemies: [
        { id: 0, kind: 'sprout', position: [2, 2] },
        { id: 1, kind: 'stump', position: [1, 3], facing: 'south', health: 2 },
        { id: 2, kind: 'stump', position: [3, 3], facing: 'south', skillIndex: 1, health: 2 }
      ]
    },
    {
      name: '荊翅迴廊',
      hero: [2, 0],
      enemies: [
        { id: 0, kind: 'moth', position: [2, 3] },
        { id: 1, kind: 'moth', position: [4, 3] },
        { id: 2, kind: 'sporecap', position: [0, 3], health: 2, skillIndex: 1 }
      ]
    },
    {
      name: '遺跡守衛',
      hero: [2, 0],
      enemies: [
        // Opposite guard phases: one protects its front while the other opens.
        // Keep four enemies / seven total HP; pressure comes from timing, not bulk.
        { id: 0, kind: 'stump', position: [1, 2], elite: true, facing: 'south', health: 3 },
        { id: 1, kind: 'sprout', position: [1, 1] },
        { id: 2, kind: 'moth', position: [2, 4] },
        { id: 3, kind: 'stump', position: [3, 2], facing: 'south', health: 2, skillIndex: 1 }
      ]
    },
    {
      name: '苔角聖所',
      hero: [2, 0],
      enemies: [
        { id: 0, kind: 'mossstag', position: [1, 4], health: 6, facing: 'south', skillIndex: 2 },
        { id: 1, kind: 'sprout', position: [0, 2] },
        { id: 2, kind: 'sprout', position: [4, 3] }
      ]
    }
  ]
};
