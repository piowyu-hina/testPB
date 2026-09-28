import { enemyName } from '../battle/EnemyRules';
import type { Enemy } from '../types/game';

export function enemySummary(enemy: Enemy): string {
  const health = enemy.health ?? 1, maximum = enemy.maxHealth ?? (enemy.elite ? 2 : 1);
  return `${enemy.elite ? '精英・' : ''}${enemyName(enemy)} · 生命 ${health}/${maximum}`;
}
