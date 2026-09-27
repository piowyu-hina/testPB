import { enemies } from '../data/enemies.ts';
import type { Enemy, Facing, Point } from '../types/game.ts';

export const facingOffsets: Record<Facing, Point> = {
  north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0]
};
const adjacent: Point[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const diagonal: Point[] = [[1, 1], [1, -1], [-1, -1], [-1, 1]];

export function enemySkill(enemy: Enemy) {
  const skill = enemies[enemy.kind].skills[enemy.skillIndex ?? 0];
  return enemy.kind === 'mossstag' && enemy.enraged && skill.id === 'rocks'
    ? { ...skill, name: '暴走落石', hint: '紅格將落石，造成 1 傷害；暴走增加落石格，鹿靈原地不動。' }
    : skill;
}
export function attackOffsets(enemy: Enemy): Point[] {
  const pattern = enemySkill(enemy).pattern;
  if (pattern === 'none') return [];
  if (pattern === 'marked') return (enemy.warningTiles ?? []).map(([x, y]) => [x - enemy.position[0], y - enemy.position[1]]);
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
/** Never pass through an occupied tile, even if a farther tile is empty. */
export function chargeLanding(enemy: Enemy, occupied: Point[]): Point {
  let landing: Point = [...enemy.position];
  for (const [x, y] of attackOffsets(enemy)) {
    const p: Point = [enemy.position[0] + x, enemy.position[1] + y];
    if (p.some(v => v < 0 || v >= 5) || occupied.some(q => q[0] === p[0] && q[1] === p[1])) break;
    landing = p;
  }
  return landing;
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
