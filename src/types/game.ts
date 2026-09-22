export type Point = [number, number];
export interface RoomDefinition {
  name: string;
  hero: Point;
  enemies: Enemy[];
}
export interface DungeonDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  rooms: RoomDefinition[];
  /** Index of the first currently-active room; earlier rooms stay in data for later restoration. Defaults to 0. */
  startIndex?: number;
}
export interface CardDefinition {
  name: string;
  hint?: string;
  offsets: Point[];
  canJump: boolean;
  copies: number;
  cost?: number;
  effect?: 'throw' | 'shadow' | 'knife';
}
export type EnemyKind = 'sprout' | 'stump';
export type Facing = 'north' | 'east' | 'south' | 'west';
export interface EnemySkill {
  id: 'thorns' | 'sweep' | 'roots';
  name: string;
  hint: string;
  pattern: 'adjacent' | 'front' | 'diagonal';
  guardsFront: boolean;
  holdAfter: boolean;
}
export interface EnemyDefinition {
  name: string;
  behavior: string;
  skills: readonly EnemySkill[];
}
export interface Enemy {
  id: number;
  kind: EnemyKind;
  position: Point;
  elite?: boolean;
  health?: number;
  maxHealth?: number;
  skillIndex?: number;
  facing?: Facing;
}
export interface MovePreview {
  blocked: boolean;
  hitId?: number;
  destination: Point;
  removedId: number;
  damage: number;
}
export interface EnemyMotion {
  id: number;
  from: Point;
  to: Point;
}
export interface TurnOutcome {
  attacks: { id: number; from: Point }[];
  damage: number;
  motions: EnemyMotion[];
}
