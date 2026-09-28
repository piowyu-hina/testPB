import { enemies, eliteStumpSweep, eliteStumpRoots } from '../data/enemies.ts';
import type { Enemy, Facing, Point } from '../types/game.ts';

export const facingOffsets: Record<Facing, Point> = {
  north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0]
};
const adjacent: Point[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const diagonal: Point[] = [[1, 1], [1, -1], [-1, -1], [-1, 1]];

export function enemySkill(enemy: Enemy) {
  if (enemy.ward) return { id: 'recover' as const, name: '護根',
    hint: '周圍一格護罩，跟進同伴；推離／擊倒可破盾。',
    pattern: 'none' as const, guardsFront: false, holdAfter: true };
  const skill = enemies[enemy.kind].skills[enemy.skillIndex ?? 0];
  if (enemy.kind === 'stump' && enemy.elite && skill.id === 'sweep') {
    return eliteStumpSweep;
  }
  if (enemy.kind === 'stump' && enemy.elite && skill.id === 'roots') return eliteStumpRoots;
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
export function enemyName(enemy: Enemy): string { return enemy.ward ? '護根菇' : enemies[enemy.kind].name; }
export function wardSource(enemy: Enemy, allies: readonly Enemy[]): Enemy | undefined {
  if (enemy.ward) return undefined; // Sources never protect themselves or each other.
  return allies.find(source => source.ward && source.id !== enemy.id && (source.health ?? 1) > 0
    && Math.max(Math.abs(source.position[0] - enemy.position[0]), Math.abs(source.position[1] - enemy.position[1])) <= 1);
}
/** Follow a guard only after all attackers have moved; never jump through an occupant. */
export function wardStep(source: Enemy, allies: readonly Enemy[], hero: Point): Point {
  const distance = (a: Point, b: Point) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  const targets = allies.filter(e => !e.ward && e.id !== source.id).sort((a, b) =>
    Number(b.kind === 'stump') - Number(a.kind === 'stump') || distance(a.position, source.position) - distance(b.position, source.position) || a.id - b.id);
  const target = targets[0];
  if (!target || distance(source.position, target.position) <= 1) return [...source.position];
  const scoreAt = (p: Point) => distance(p, target.position) * 10 + Math.abs(p[0] - target.position[0]) + Math.abs(p[1] - target.position[1]);
  let best: Point = [...source.position], score = scoreAt(best);
  for (const [dx, dy] of adjacent) {
    const p: Point = [source.position[0] + dx, source.position[1] + dy];
    if (p.some(v => v < 0 || v >= 5) || p.toString() === hero.toString()
      || allies.some(e => e.id !== source.id && p.toString() === e.position.toString())) continue;
    const next = scoreAt(p);
    if (next < score) { best = p; score = next; }
  }
  return best;
}
export function blocksAttack(enemy: Enemy, from: Point, allies: readonly Enemy[] = []): boolean {
  if (wardSource(enemy, allies)) return true;
  if (!enemySkill(enemy).guardsFront) return false;
  const [fx, fy] = facingOffsets[enemy.facing ?? 'south'];
  const dx = from[0] - enemy.position[0], dy = from[1] - enemy.position[1];
  return dx * fx + dy * fy > 0 && dx * fy - dy * fx === 0;
}
export function faceToward(enemy: Enemy, target: Point): Facing {
  const dx = target[0] - enemy.position[0], dy = target[1] - enemy.position[1];
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'north' : 'south');
}
