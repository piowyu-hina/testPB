import type { Room } from '../battle/Room';
import { cards, type CardId } from '../data/cards';
import type { CardDefinition } from '../types/game';
import { cardArt } from '../data/cardArt';
import { engravingInfo, relicInfo } from '../battle/Growth';

/** Full-screen collection view. Counts are grouped; hidden draw order stays hidden. */
export function mountDeckViewer(root: HTMLElement, game: HTMLElement, getRoom: () => Room) {
  const panel = document.createElement('section');
  panel.className = 'deck-viewer'; panel.id = 'deck-viewer'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '牌組');
  panel.innerHTML = '<header><h2>牌組</h2><button class="deck-close" type="button">回到戰鬥</button></header><nav aria-label="牌堆"><button data-pile="all">全部</button><button data-pile="hand">手牌</button><button data-pile="deck">抽牌堆</button><button data-pile="discard">棄牌堆</button></nav><div class="deck-growth"></div><div class="deck-list"></div>';
  root.append(panel);
  let pile: 'all' | 'hand' | 'deck' | 'discard' = 'all';
  let opener: HTMLElement | null = null;
  const close = () => { panel.hidden = true; game.inert = false; opener?.focus({ preventScroll: true }); };
  panel.querySelector<HTMLButtonElement>('.deck-close')!.onclick = close;
  for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-pile]')) {
    button.onclick = () => { pile = button.dataset.pile as typeof pile; render(); };
  }
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
    growth.textContent = owned.length ? owned.join(' · ') : '同名牌合併顯示，不代表抽牌順序。';
    const counts = new Map<CardId, number>();
    for (const id of pile === 'all' ? all : room[pile]) counts.set(id, (counts.get(id) ?? 0) + 1);
    const list = panel.querySelector<HTMLElement>('.deck-list')!;
    list.replaceChildren(...[...counts].sort(([a], [b]) => Object.keys(cards).indexOf(a) - Object.keys(cards).indexOf(b)).map(([id, count]) => {
      const entry = document.createElement('article'); entry.className = 'deck-entry'; entry.dataset.card = id;
      const picture = document.createElement('img'); picture.src = cardArt[id] ?? ''; picture.alt = ''; picture.draggable = false;
      const name = document.createElement('h3'); name.textContent = `${cards[id].name} ×${count}`;
      const cost = document.createElement('div'); cost.className = 'deck-cost'; cost.textContent = `${(cards[id] as CardDefinition).cost ?? 1} 魂火${id === 'knife' ? ' · 本回合限定' : ''}`;
      const detail = document.createElement('p'); detail.textContent = cards[id].hint;
      entry.append(picture, name, cost, detail);
      const engraving = room.build.engravings[id];
      if (engraving) { const badge = document.createElement('p'); badge.className = 'deck-engraving'; badge.textContent = `${engravingInfo[engraving].name}：${engravingInfo[engraving].description}`; entry.append(badge); }
      return entry;
    }));
    if (!counts.size) { const empty = document.createElement('p'); empty.className = 'deck-empty'; empty.textContent = '這裡暫時沒有牌'; list.append(empty); }
    list.scrollTop = 0;
  }
  return { open() { opener = document.activeElement as HTMLElement; pile = 'all'; render(); panel.hidden = false; game.inert = true; panel.querySelector<HTMLButtonElement>('.deck-close')!.focus(); }, close };
}
