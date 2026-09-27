export const battleRewards = {
  pursuit: { name: '追擊', card: 'thrust', description: '槍刺擊殺後，抽一張牌。' },
  collision: { name: '撞擊', card: 'repel', description: '推得動的怪物撞牆或撞怪時，額外受到一點傷害。' },
  whirlwind: { name: '迴旋', card: 'sweep', description: '橫掃實際命中兩隻以上，每回合首次返還一點魂火。' },
  reach: { name: '長鋒', card: 'thrust', description: '槍刺在相隔兩格時，額外造成一點傷害。' }
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
