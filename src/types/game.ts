export type Point = [number, number];
export interface CardDefinition {
  name: string;
  hint?: string;
  offsets: Point[];
  canJump: boolean;
  copies: number;
  cost?: number;
  effect?: 'throw' | 'shadow' | 'knife' | 'whirl';
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
  skills: readonly EnemySkill[];
}
export interface Enemy {
  id: number;
  kind: EnemyKind;
  position: Point;
  elite?: boolean;
  health?: number;
  skillIndex?: number;
  facing?: Facing;
}
export interface MovePreview {
  blocked: boolean;
  hitId?: number;
  destination: Point;
  removedId: number;
  hits?: { id: number; blocked: boolean; removed: boolean }[];
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
