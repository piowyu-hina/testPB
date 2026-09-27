export const battleRewards = {
  pursuit: { name: '追擊', card: 'thrust', description: '每回合首次使用這張槍刺，抽 1 張牌。' },
  collision: { name: '重擊', card: 'repel', description: '推擊傷害 +1。不改變格擋與不可推規則。' },
  whirlwind: { name: '迴旋', card: 'sweep', description: '橫掃造成傷害，回 1 點魂火。每回合一次。' },
  reach: { name: '長鋒', card: 'thrust', description: '槍刺傷害 +1，相鄰或兩格命中皆有效。' }
} as const;
export type BattleReward = keyof typeof battleRewards;
export function rewardOptions(seed: number, available?: readonly string[]): BattleReward[] {
  const options = Object.keys(battleRewards) as BattleReward[];
  let n = seed >>> 0;
  for (let i = options.length - 1; i > 0; i--) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(n / 4294967296 * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options.filter(id => !available || available.includes(battleRewards[id].card)).slice(0, 3);
}
