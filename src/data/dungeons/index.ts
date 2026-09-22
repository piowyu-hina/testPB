import { forestRuins } from './forest.ts';

// Add a new themed dungeon by creating its data/dungeons/<name>.ts and registering it here.
export const dungeons = { forest: forestRuins };
export type DungeonId = keyof typeof dungeons;
