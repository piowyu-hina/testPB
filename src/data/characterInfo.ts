import type { Loadout } from './cards';

export const characterInfo: Record<Loadout, { name: string; introduction: string }> = {
  qinghe: { name: '青禾', introduction: '用側步調整站位，槍刺與橫掃迎擊敵人。普通攻擊造成傷害 4 次，可施放破曉一槍。' },
  rogue: { name: '露雪', introduction: '飛刀留下落點，追影穿梭撿刀。撿刀回魂並抽牌，擊殺累積絕影。' },
  basic: { name: '戀喵', introduction: '以移動卡接近敵人，攻擊落點上的目標；留意回合結束時的危險格。' }
};
