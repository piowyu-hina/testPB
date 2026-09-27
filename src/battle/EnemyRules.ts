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
  if (pattern === 'none') return [];
  if (pattern === 'charge-ray') {
    const [x, y] = facingOffsets[enemy.facing ?? 'south'];
    return Array.from({ length: 4 }, (_, i): Point => [x * (i + 1), y * (i + 1)]);
  }
  if (pattern === 'front-fan') {
    const [x, y] = facingOffsets[enemy.facing ?? 'south'];
    return [...adjacent, ...diagonal].filter(([dx, dy]) => dx * x + dy * y >= 0);
  }
  if (pattern === 'ring') return [...adjacent, ...diagonal];
  if (pattern === 'cross-ray' || pattern === 'diagonal-ray') {
    const directions = pattern === 'cross-ray' ? adjacent : diagonal;
    const length = enemy.kind === 'moth' ? 2 : 4;
    return directions.flatMap(([x, y]) => Array.from({ length }, (_, i): Point => [x * (i + 1), y * (i + 1)]));
  }
  return pattern === 'front' ? [facingOffsets[enemy.facing ?? 'south']] : pattern === 'diagonal' ? diagonal : adjacent;
}
export function enemyDamage(enemy: Enemy) { return enemySkill(enemy).damage ?? (enemy.elite ? 2 : 1); }
/** Charge crosses its announced lane, landing on its farthest unoccupied tile. */
export function chargeLanding(enemy: Enemy, occupied: Point[]): Point {
  return attackOffsets(enemy).map(([x, y]): Point => [enemy.position[0] + x, enemy.position[1] + y])
    .filter(p => p.every(v => v >= 0 && v < 5) && !occupied.some(q => q[0] === p[0] && q[1] === p[1]))
    .at(-1) ?? [...enemy.position];
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
