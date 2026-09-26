import { cards, loadouts, type CardId, type Loadout } from '../data/cards.ts';
import type { CardDefinition } from '../types/game.ts';

export type Engraving = 'draw' | 'refund' | 'discount';
export interface Build {
  engravings: Partial<Record<CardId, Engraving>>;
  relic: boolean;
  opening: boolean;
}
export const freshBuild = (): Build => ({ engravings: {}, relic: false, opening: false });
export const engravingInfo: Record<Engraving, { name: string; description: string; price: number }> = {
  draw: { name: '流轉', description: '每回合首次使用這種牌，抽一張牌。', price: 3 },
  refund: { name: '回響', description: '每回合首次花費魂火使用這種牌，返還一點魂火。', price: 3 },
  discount: { name: '輕盈', description: '每回合首次使用這種牌，費用減一。', price: 4 }
};
export function relicInfo(loadout: Loadout) {
  return loadout === 'qinghe'
    ? { name: '逐風結', description: '每回合首次移動到不同格子後，抽一張牌。', price: 5 }
    : { name: '回刃扣', description: '每回合首次回收地面飛刀時，多抽一張牌。', price: 5 };
}
export function canEngrave(loadout: Loadout, id: CardId, kind: Engraving) {
  return loadouts[loadout].includes(id) && (kind === 'draw' || ((cards[id] as CardDefinition).cost ?? 1) > 0);
}
