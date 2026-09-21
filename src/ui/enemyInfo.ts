import { enemies } from '../data/enemies';
import { enemySkill } from '../battle/EnemyRules';
import type { Enemy } from '../types/game';

const facingNames = { north: '上方', east: '右方', south: '下方', west: '左方' };
export function enemySummary(enemy: Enemy): string {
  const skill = enemySkill(enemy);
  return `${enemy.elite ? '精英・' : ''}${enemies[enemy.kind].name} · ${skill.name} · ${enemy.elite ? 2 : 1} 傷害`;
}
export function renderEnemyInfo(panel: HTMLElement, enemy: Enemy | undefined): void {
  panel.hidden = !enemy;
  if (!enemy) return;
  const definition = enemies[enemy.kind], skill = enemySkill(enemy);
  panel.querySelector('[data-enemy-title]')!.textContent = enemySummary(enemy);
  panel.querySelector('[data-enemy-current]')!.textContent = `下次敵方回合：${skill.pattern === 'front' ? `朝向${facingNames[enemy.facing ?? 'south']}。` : ''}${skill.hint}`;
  panel.querySelector('[data-enemy-cycle]')!.textContent = definition.skills.length > 1
    ? '固定循環：揮枝 → 扎根 → 揮枝。扎根結算後才會靠近並重新朝向你。'
    : '刺擊結算後，未能攻擊的團子會靠近你。';
}
