export type Point = [number, number];
export interface CardDefinition {
  name: string;
  hint?: string;
  offsets: Point[];
  canJump: boolean;
  copies: number;
}
export type EnemyKind = 'imp' | 'bat';
export interface EnemyDefinition {
  name: string;
  hint: string;
  attacks: Point[];
}
export interface Enemy {
  id: number;
  kind: EnemyKind;
  position: Point;
  elite?: boolean;
}
export interface MovePreview {
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
