import { enemies } from '../data/enemies.ts';
import type { Enemy, Facing, Point } from '../types/game.ts';

export const facingOffsets: Record<Facing, Point> = {
  north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0]
};
const adjacent: Point[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const diagonal: Point[] = [[1, 1], [1, -1], [-1, -1], [-1, 1]];

export function enemySkill(enemy: Enemy) {
  return enemies[enemy.kind].skills[enemy.skillIndex ?? 0];
}
export function attackOffsets(enemy: Enemy): Point[] {
  const pattern = enemySkill(enemy).pattern;
  return pattern === 'front' ? [facingOffsets[enemy.facing ?? 'south']] : pattern === 'diagonal' ? diagonal : adjacent;
}
export function blocksAttack(enemy: Enemy, from: Point): boolean {
  if (!enemySkill(enemy).guardsFront) return false;
  const [fx, fy] = facingOffsets[enemy.facing ?? 'south'];
  const dx = from[0] - enemy.position[0], dy = from[1] - enemy.position[1];
  return dx * fx + dy * fy > 0 && dx * fy - dy * fx === 0;
}
export function faceToward(enemy: Enemy, target: Point): Facing {
  const dx = target[0] - enemy.position[0], dy = target[1] - enemy.position[1];
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'north' : 'south');
}
