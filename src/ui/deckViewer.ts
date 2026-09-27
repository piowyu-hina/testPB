import type { Room } from '../battle/Room';
import { cards, type CardId } from '../data/cards';
import type { CardDefinition } from '../types/game';
import { cardArt } from '../data/cardArt';
import { engravingInfo, relicInfo } from '../battle/Growth';
import { engravingBadge } from './engravingBadge';

/** Full-screen collection view. Counts are grouped; hidden draw order stays hidden. */
export function mountDeckViewer(root: HTMLElement, game: HTMLElement, getRoom: () => Room) {
  const panel = document.createElement('section');
  panel.className = 'deck-viewer'; panel.id = 'deck-viewer'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '牌組');
  panel.innerHTML = '<header><h2>牌組</h2><button class="deck-close" type="button">回到戰鬥</button></header><nav aria-label="牌堆"><button data-pile="all">全部</button><button data-pile="hand">手牌</button><button data-pile="deck">抽牌堆</button><button data-pile="discard">棄牌堆</button></nav><div class="deck-list" aria-label="選擇卡牌"></div><div class="deck-pagination" hidden><button type="button" class="deck-prev" aria-label="上一頁">‹</button><span class="deck-page" aria-live="polite"></span><button type="button" class="deck-next" aria-label="下一頁">›</button></div><section class="deck-detail" aria-live="polite"></section><div class="deck-growth"></div>';
  root.append(panel);
  let pile: 'all' | 'hand' | 'deck' | 'discard' = 'all';
  let page = 0;
  let selected: CardId | undefined;
  const pageSize = 6;
  let opener: HTMLElement | null = null;
  const close = () => { panel.hidden = true; game.inert = false; opener?.focus({ preventScroll: true }); };
  panel.querySelector<HTMLButtonElement>('.deck-close')!.onclick = close;
  for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-pile]')) {
    button.onclick = () => { pile = button.dataset.pile as typeof pile; page = 0; selected = undefined; render(); };
  }
  panel.querySelector<HTMLButtonElement>('.deck-prev')!.onclick = () => { page--; selected = undefined; render(); };
  panel.querySelector<HTMLButtonElement>('.deck-next')!.onclick = () => { page++; selected = undefined; render(); };
  function render() {
    const room = getRoom();
    const all = [...room.hand, ...room.deck, ...room.discard];
    for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-pile]')) {
      const key = button.dataset.pile as typeof pile;
      button.setAttribute('aria-pressed', String(key === pile));
      button.textContent = `${{all:'全部',hand:'手牌',deck:'抽牌堆',discard:'棄牌堆'}[key]} ${key === 'all' ? all.length : room[key].length}`;
    }
    const owned = [room.build.relic ? relicInfo(room.loadout).name : '', room.build.opening ? '行前整備' : ''].filter(Boolean);
    const growth = panel.querySelector<HTMLElement>('.deck-growth')!;
    growth.textContent = owned.join(' · ');
    growth.hidden = !owned.length;
    const counts = new Map<CardId, number>();
    for (const id of pile === 'all' ? all : room[pile]) counts.set(id, (counts.get(id) ?? 0) + 1);
    const list = panel.querySelector<HTMLElement>('.deck-list')!;
    const entries = [...counts].sort(([a], [b]) => Object.keys(cards).indexOf(a) - Object.keys(cards).indexOf(b));
    const pages = Math.max(1, Math.ceil(entries.length / pageSize));
    page = Math.max(0, Math.min(page, pages - 1));
    const visible = entries.slice(page * pageSize, (page + 1) * pageSize);
    if (!visible.some(([id]) => id === selected)) selected = visible[0]?.[0];
    panel.querySelector<HTMLElement>('.deck-pagination')!.hidden = pages === 1;
    panel.querySelector('.deck-page')!.textContent = `${page + 1} / ${pages}`;
    panel.querySelector<HTMLButtonElement>('.deck-prev')!.disabled = page === 0;
    panel.querySelector<HTMLButtonElement>('.deck-next')!.disabled = page === pages - 1;
    list.replaceChildren(...visible.map(([id, count]) => {
      const entry = document.createElement('button'); entry.type = 'button'; entry.className = 'deck-entry'; entry.dataset.card = id;
      entry.setAttribute('aria-pressed', String(selected === id));
      entry.setAttribute('aria-label', `${cards[id].name}，${count}張，查看說明`);
      const face = document.createElement('span'); face.className = 'deck-card-face';
      const picture = document.createElement('img'); picture.src = cardArt[id] ?? ''; picture.alt = ''; picture.draggable = false;
      const quantity = document.createElement('span'); quantity.className = 'deck-quantity'; quantity.textContent = `×${count}`;
      const name = document.createElement('span'); name.className = 'deck-card-name'; name.textContent = cards[id].name;
      face.append(picture, quantity); entry.append(face, name);
      const engraving = room.build.engravings[id];
      if (engraving) face.append(engravingBadge(engraving));
      entry.onclick = () => { selected = id; render(); };
      return entry;
    }));
    if (!counts.size) { const empty = document.createElement('p'); empty.className = 'deck-empty'; empty.textContent = '這裡暫時沒有牌'; list.append(empty); }
    const detail = panel.querySelector<HTMLElement>('.deck-detail')!;
    detail.replaceChildren(); detail.hidden = !selected;
    if (selected) {
      const definition = cards[selected] as CardDefinition;
      const heading = document.createElement('div'); heading.className = 'deck-detail-heading';
      const name = document.createElement('h3'); name.textContent = definition.name;
      const cost = document.createElement('span'); cost.className = 'deck-cost'; cost.textContent = `${definition.cost ?? 1} 魂火${selected === 'knife' ? ' · 本回合限定' : ''}`;
      heading.append(name, cost);
      const description = document.createElement('p'); description.textContent = definition.hint ?? '';
      detail.append(heading, description);
      const engraving = room.build.engravings[selected];
      if (engraving) {
        const effect = document.createElement('p'); effect.className = 'deck-engraving';
        const text = document.createElement('span'); text.textContent = engravingInfo[engraving].description;
        effect.append(engravingBadge(engraving), text); detail.append(effect);
      }
    }
  }
  return { open() { opener = document.activeElement as HTMLElement; pile = 'all'; page = 0; selected = undefined; render(); panel.hidden = false; game.inert = true; panel.querySelector<HTMLButtonElement>('.deck-close')!.focus(); }, close };
}
