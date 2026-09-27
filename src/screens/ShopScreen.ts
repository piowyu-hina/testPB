import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import { cards, loadouts, type CardId } from '../data/cards';
import { cardArt } from '../data/cardArt';
import { characters } from '../data/art';
import { canEngrave, engravingInfo, relicInfo, type Engraving } from '../battle/Growth';
import { mountScreenRoot, element, onClick } from '../ui/dom';
import { engravingBadge, engravingLabel } from '../ui/engravingBadge';
import '../shop.css';

export function mountShop(host: HTMLElement, session: GameSession, onHome: () => void): Screen {
  const root = mountScreenRoot(host, `<main class="shop" aria-label="林畔工坊">
    <header class="shop-heading"><div><p>林畔工坊</p><h1 id="shop-character"></h1></div><button id="shop-home" class="shop-back">返回村莊</button></header>
    <div class="shop-wallet"><span>旅途金幣</span><strong id="shop-coins"></strong></div>
    <nav class="shop-tabs" aria-label="商品種類"><button data-shop-tab="cards">卡牌刻印</button><button data-shop-tab="gear">旅途裝備</button></nav>
    <section id="shop-cards"><p class="shop-note">每次強化一張普通牌，每張只能強化一次。</p><div id="shop-card-choices" class="shop-card-choices"></div><div id="shop-card-description" class="shop-card-description"></div><div id="shop-engravings" class="shop-offers"></div></section>
    <section id="shop-gear" class="shop-offers" hidden></section>
    <p id="shop-message" class="shop-message" role="status"></p>
    <footer class="shop-footnote">只在本次旅程有效。每間清場獲得金幣，重新出發時重置。</footer>
  </main>`);
  const $ = (id: string) => element(id, root);
  let selected: CardId = 'thrust';
  let tab = 'cards';
  onClick($('shop-home'), onHome);
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-shop-tab]')) {
    onClick(button, () => { tab = button.dataset.shopTab!; render(); });
  }
  function buy(action: () => boolean, label: string) {
    if (action()) { render(); $('shop-message').textContent = label; }
  }
  function offer(name: string, description: string, price: number, owned: boolean, disabled: boolean, action: () => boolean, engraving?: Engraving) {
    const row = document.createElement('div'); row.className = 'shop-offer';
    const detail = document.createElement('div');
    const title = document.createElement('strong'); title.className = 'shop-offer-title'; title.textContent = name;
    if (engraving) title.prepend(engravingBadge(engraving));
    const text = document.createElement('p'); text.textContent = description;
    detail.append(title, text);
    const button = document.createElement('button'); button.className = 'shop-buy';
    button.textContent = owned ? '已裝備' : `${price} 金幣`;
    button.disabled = owned || disabled || session.journey.coins < price || session.journey.finished;
    button.setAttribute('aria-label', owned ? `${name}已裝備` : `購買${name}，${price}金幣`);
    onClick(button, () => buy(action, engraving ? `已強化一張${cards[selected].name}：${name}` : `${name}已裝備`)); row.append(detail, button); return row;
  }
  function render() {
    const journey = session.journey, build = journey.build;
    journey.claimClearReward();
    $('shop-character').textContent = `${characters[session.characterId].name}的旅途`;
    $('shop-coins').textContent = String(journey.coins);
    $('shop-message').textContent = journey.finished ? '這段旅途已結束，重新出發後再來準備吧。' : '';
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-shop-tab]')) button.setAttribute('aria-pressed', String(button.dataset.shopTab === tab));
    $('shop-cards').hidden = tab !== 'cards'; $('shop-gear').hidden = tab !== 'gear';
    const ids = loadouts[journey.loadout];
    if (!ids.includes(selected)) selected = ids[0];
    $('shop-card-choices').replaceChildren(...ids.map(id => {
      const button = document.createElement('button'); button.className = 'shop-card-choice'; button.dataset.card = id;
      button.setAttribute('aria-pressed', String(selected === id));
      const image = document.createElement('img'); image.src = cardArt[id] ?? ''; image.alt = ''; image.draggable = false;
      const name = document.createElement('span'); name.textContent = cards[id].name;
      button.append(image, name); onClick(button, () => { selected = id; render(); }); return button;
    }));
    const ordinary = [...journey.room.hand, ...journey.room.deck, ...journey.room.discard].filter(ref => ref === selected).length;
    $('shop-card-description').textContent = `${cards[selected].name} · ${ordinary ? `可強化 ${ordinary} 張` : '已全部強化'}。${cards[selected].hint}`;
    $('shop-engravings').replaceChildren(...(['draw', 'refund', 'discount'] as Engraving[]).filter(kind => canEngrave(journey.loadout, selected, kind)).map(kind => {
      const info = engravingInfo[kind];
      return offer(engravingLabel[kind], info.description, info.price, false, ordinary === 0, () => journey.buyEngraving(selected, kind), kind);
    }));
    const relic = relicInfo(journey.loadout);
    $('shop-gear').replaceChildren(
      offer(relic.name, relic.description, relic.price, build.relic, false, () => journey.buyRelic()),
      offer('行前整備', '每個新房間的起手多一張牌。下個房間開始生效，不增加手牌上限。', 3, build.opening, false, () => journey.buyOpening())
    );
  }
  return { root, enter() { render(); } };
}
