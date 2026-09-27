import type { Engraving } from '../battle/Growth';
import soulImage from '../../assets/ui/action-soulflame-v2.png';
import './engravingBadge.css';

export const engravingLabel: Record<Engraving, string> = { draw: '抽牌', refund: '回魂', discount: '減費' };
export const engravingShort: Record<Engraving, string> = { draw: '本回合首次使用抽一張', refund: '本回合首次花魂火使用返還一點', discount: '本回合首次使用少花一點魂火' };
export function engravingBadge(kind: Engraving, spent = false) {
  const badge = document.createElement('span');
  badge.className = `engraving-badge engraving-${kind}${spent ? ' spent' : ''}`;
  badge.dataset.engraving = kind;
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = kind === 'draw'
    ? '<svg viewBox="0 0 48 48"><path class="engraving-paper" d="m7 12 21-4 6 31-21 4Z"/><rect class="engraving-paper" x="19" y="5" width="23" height="31" rx="3"/><path class="engraving-arrow" d="M30 29V14m-6 6 6-6 6 6"/></svg>'
    : `<img src="${soulImage}" alt="" draggable="false" /><svg viewBox="0 0 48 48">${kind === 'refund' ? '<path class="engraving-arrow" d="M38 19a17 17 0 1 1-26-9M12 3v9H3"/>' : '<path class="engraving-minus" d="M6 37h25"/>'}</svg>`;
  return badge;
}
