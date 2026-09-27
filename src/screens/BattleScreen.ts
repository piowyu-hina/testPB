import { Room, data, equal, HAND_LIMIT, type MoveAction, type UltimateAction } from '../battle/Room';
import type { Journey } from '../battle/Journey';
import { characters, enemyArt } from '../data/art';
import type { Point, CardDefinition, MovePreview } from '../types/game';
import qingheChargeArt from '../../assets/characters/qinghe/UltimateCharge.png';
import rogueChargeArt from '../../assets/ui/ultimate-charge.png';
import { element, mountScreenRoot, onClick } from '../ui/dom';
import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import template from './battle.html?raw';
import { place, animate, pause, travel, teleport } from '../ui/animations';
import { diagram } from '../ui/cardDiagram';
import { cardArt, qingheForwardArt } from '../data/cardArt';
import { daggerIcon, groundDaggerIcon } from '../ui/dagger';
import { approach, contactPoint, shield, impact, recoil, heartBurst } from '../ui/battleFeedback';
import { enemySkill, blocksAttack } from '../battle/EnemyRules';
import { enemySummary } from '../ui/enemyInfo';
import { playSound, setSoundEnabled, soundEnabled } from '../ui/sound';
import { mountDeckViewer } from '../ui/deckViewer';
import { engravingBadge, engravingLabel, engravingShort } from '../ui/engravingBadge';
import { loadouts } from '../data/cards';
import { characterInfo } from '../data/characterInfo';
import { cardKind, deckForBuild, type CardRef, type Engraving } from '../battle/Growth';
import '../enemy.css';
import '../battleBoard.css';
import '../battleHud.css';
import '../battleCards.css';
import '../battleDialogs.css';

export function mountBattle(host: HTMLElement, session: GameSession, onHome: () => void): Screen {
  const root = mountScreenRoot(host, template);
  root.classList.add('battle-screen');
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => element<T>(id, root);
  const elements = {
    game: $('game'),
    board: $('board'),
    tiles: $('tiles'),
    actors: $('actors'),
    threatMarks: $('threat-marks'),
    targetMarks: $('target-marks'),
    tileInfo: $('tile-info'),
    touchInfo: $('touch-info'),
    cardDetails: $('card-details'),
    hand: $('hand'),
    overflowFeedback: $('overflow-feedback'),
    ultimateReveal: $('ultimate-reveal'),
    ultimatePortrait: $<HTMLImageElement>('ultimate-reveal-portrait'),
    health: $('health'),
    energyCount: $('energy-count'),
    actions: $('actions'),
    hint: $('hint'),
    end: $<HTMLButtonElement>('end-turn'),
    endLabel: $('end-label'),
    ghost: $('ghost'),
    result: $('result'),
    resultTitle: $('result-title')
  };
  const healthSegment = '<span class="health-segment" aria-hidden="true"></span>';
  let journey: Journey,
    room: Room,
    selected = -1,
    hoveredTile: Point | null = null,
    hoveredEnemy = -1,
    inspectedEnemy = -1,
    busy = false,
    handSignature = '',
    renderedHand: string[] = [],
    dealWholeHand = true,
    dealingHand = false,
    dealSequence = 0,
    inspectedTile: Point | null = null,
    cardHoldTimer = 0,
    heldCard: HTMLButtonElement | null = null,
    ultimateTargeting = false,
    ultimateHoldTimer = 0,
    ultimateHeld = false,
    dismissDetailsClick = false,
    overflowTimer = 0;
  const touchLayout = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
  const deckViewer = mountDeckViewer(root, elements.game, () => room);
  onClick($('open-deck'), () => { if (!busy && !dealingHand) deckViewer.open(); });
  const soundToggle = $<HTMLButtonElement>('battle-sound-toggle');
  function renderSoundToggle() {
    const enabled = soundEnabled();
    soundToggle.textContent = enabled ? '開' : '關';
    soundToggle.setAttribute('aria-pressed', String(enabled));
    soundToggle.setAttribute('aria-label', enabled ? '關閉音效' : '開啟音效');
  }
  function renderJourneyProgress() {
    $('journey-progress-label').textContent = `${journey.stage + 1} / ${journey.total}`;
    const progress = $('journey-progress');
    progress.replaceChildren(...Array.from({ length: journey.total }, (_, index) => {
      const node = document.createElement('span');
      node.className = 'journey-node';
      if (index < journey.stage) node.classList.add('complete');
      if (index === journey.stage) node.classList.add('current');
      if (index === journey.total - 1) node.classList.add('final');
      node.setAttribute('aria-label', index === journey.stage ? `目前位於第 ${index + 1} 區域` : `第 ${index + 1} 區域`);
      return node;
    }));
  }
  function lockWhileCardsEnter(count: number) {
    const sequence = ++dealSequence;
    dealingHand = true;
    elements.game.classList.add('dealing-hand');
    elements.end.disabled = true;
    void pause(360 + Math.max(0, count - 1) * 70).then(() => {
      if (sequence !== dealSequence) return;
      dealingHand = false;
      elements.game.classList.remove('dealing-hand');
      render();
    });
  }
  function showCardHint(card: CardDefinition, reason = '', ref?: CardRef) {
    const name = document.createElement('strong');
    name.textContent = card.name;
    const description = document.createElement('span');
    description.textContent = card.hint ?? '';
    const engraving = ref && room?.build.engravings[ref];
    if (engraving) {
      name.textContent += ` · ${engravingLabel[engraving]}${room.growthReady(ref!) ? '' : '（已用）'}`;
      const extra = document.createElement('span'); extra.className = 'hint-engraving';
      extra.textContent = room.growthReady(ref!) ? engravingShort[engraving] : '強化下回合恢復';
      if (!reason && (!hoveredTile || !room.preview(selected, hoveredTile))) description.append(extra);
    }
    if (reason) {
      const warning = document.createElement('em');
      warning.className = 'hint-warning';
      warning.textContent = reason;
      description.append(warning);
    }
    elements.hint.replaceChildren(name, description);
  }
  function rejectCard(card: HTMLButtonElement) {
    // Independent translate leaves the hover lift/scale intact. Ignore rapid
    // repeat clicks until this one short response has finished; never stack it.
    if (card.getAnimations().some(animation => animation.id === 'card-rejected' && animation.playState === 'running')) return;
    const distance = matchMedia('(prefers-reduced-motion: reduce)').matches ? 2 : 6;
    const animation = card.animate(
      [0, -distance, distance * .8, -distance * .5, 0].map(x => ({ translate: `${x}px 0` })),
      { duration: 240, easing: 'ease-out' }
    );
    animation.id = 'card-rejected';
  }
  function closeCardDetails() { elements.cardDetails.hidden = true; }
  function confirmCard(card: HTMLButtonElement) {
    // Move a visual copy of the whole face; the actual button stays hittable.
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const face = document.createElement('span');
    face.className = 'card-confirm-face';
    face.setAttribute('aria-hidden', 'true');
    const style = getComputedStyle(card);
    const shadow = style.boxShadow;
    for (const property of ['background', 'border', 'border-radius', 'padding', 'box-shadow']) face.style.setProperty(property, style.getPropertyValue(property));
    face.append(...Array.from(card.childNodes).map(node => node.cloneNode(true)));
    card.append(face);
    card.classList.add('confirming');
    const press = face.animate([
      { transform: 'translateY(0)', boxShadow: shadow },
      { transform: 'translateY(7px)', boxShadow: 'inset 0 0 0 3px #e7ac43, inset 0 0 0 5px #fff3d4, 0 1px 0 #825019, 0 3px 6px #171c1644', offset: .3 },
      { transform: 'translateY(0)', boxShadow: shadow }
    ], { duration: 220, easing: 'ease-out' });
    press.id = 'card-confirmed';
    void press.finished.catch(() => {}).finally(() => { face.remove(); card.classList.remove('confirming'); });
  }
  function showUltimateHint() {
    const charge = journey.ultimateCharge;
    const nameText = journey.loadout === 'qinghe' ? '破曉一槍' : '絕影';
    const name = document.createElement('strong');
    name.textContent = `${nameText} · ${charge}/${journey.ultimateThreshold}`;
    const description = document.createElement('span');
    description.textContent = journey.loadout === 'qinghe'
      ? '每打出 1 張普通牌累積 1 點。集滿後點圖案播放演出，再選方向，貫穿該直線所有怪物。'
      : '普通擊殺 +1，菁英擊殺 +2。集滿後點圖案播放演出，再選任意怪物造成 2 點無視格擋的傷害。';
    elements.hint.replaceChildren(name, description);
  }
  function openCardDetails(id: keyof typeof data.cards, ref?: CardRef) {
    const definition = data.cards[id];
    elements.cardDetails.replaceChildren();
    const name = document.createElement('strong');
    name.textContent = definition.name;
    const effect = document.createElement('p');
    effect.textContent = definition.hint ?? '';
    const cost = document.createElement('small');
    cost.textContent = id === 'forward' ? '清場後使用 · 不消耗行動' : `${(definition as CardDefinition).cost ?? 1} 行動${id === 'knife' ? ' · 使用後消失' : ''}`;
    elements.cardDetails.append(name, effect, cost);
    const engraving = ref && room.build.engravings[ref];
    if (engraving) {
      const extra = document.createElement('p');
      extra.textContent = `${engravingLabel[engraving]} · ${room.growthReady(ref!) ? engravingShort[engraving] : '強化下回合恢復'}`;
      elements.cardDetails.append(extra);
    }
    elements.cardDetails.hidden = false;
  }
  const tiles: { tile: HTMLButtonElement; point: Point }[] = [];
  const actors = new Map<number | 'hero', HTMLDivElement>();
  const exploring = () => room.won && !journey.finished;
  function actor(id: number | 'hero'): HTMLDivElement {
    const node = actors.get(id);
    if (!node) throw new Error(`Missing actor: ${id}`);
    return node;
  }
  function makeActor(id: number | 'hero', src: string, name: string, isHero = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `actor${isHero ? ' hero' : ''}`;
    wrapper.dataset.actor = String(id);
    const image = document.createElement('img');
    image.src = src;
    image.alt = name;
    image.draggable = false;
    wrapper.append(image);
    elements.actors.append(wrapper);
    actors.set(id, wrapper);
    return wrapper;
  }
  function makeTiles() {
    for (let y = 4; y >= 0; y--)
      for (let x = 0; x < 5; x++) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.tabIndex = -1;
        tile.className = 'tile';
        tile.dataset.x = String(x);
        tile.dataset.y = String(y);
        tile.addEventListener('pointerenter', () => {
          if (touchLayout()) return;
          if (busy || (room.finished && !exploring())) return;
          hoveredTile = [x, y];
          hoveredEnemy = room.at(hoveredTile)?.id ?? -1;
          render();
        });
        tile.addEventListener('pointerleave', () => {
          if (touchLayout()) return;
          if (hoveredTile && equal(hoveredTile, [x, y])) {
            hoveredTile = null;
            hoveredEnemy = -1;
            elements.hint.textContent = '';
            render();
          }
        });
        tile.addEventListener('pointerdown', (event) => {
          if (!touchLayout() || event.pointerType !== 'touch' || busy || selected >= 0) return;
          inspectedTile = [x, y];
          inspectedEnemy = room.at(inspectedTile)?.id ?? -1;
          render();
        });
        onClick(tile, () => {
          if (busy) return;
          const point: Point = [x, y];
          if (ultimateTargeting) {
            const direction = room.dawnDirectionTo(point);
            const target = room.at(point);
            if (journey.loadout === 'qinghe' && direction && room.dawnRay(direction).length) void useDawnUltimate(direction);
            else if (journey.loadout === 'rogue' && target) void useUltimate(target.id);
            else {
              ultimateTargeting = false;
              elements.hint.textContent = '';
              render();
            }
            return;
          }
          if (selected >= 0 && !(exploring() ? room.canExplore(selected, point) : room.canMove(selected, point))) {
            if (!exploring()) selected = -1;
            inspectedEnemy = room.at(point)?.id ?? -1;
            inspectedTile = touchLayout() ? point : null;
            render();
            return;
          }
          if (touchLayout() && selected < 0) {
            inspectedTile = [x, y];
            inspectedEnemy = room.at(inspectedTile)?.id ?? -1;
            render();
            return;
          }
          const enemy = room.at([x, y]);
          if (enemy && selected < 0) {
            inspectedEnemy = inspectedEnemy === enemy.id ? -1 : enemy.id;
            render();
          } else if (!enemy && selected < 0 && !exploring()) {
            inspectedEnemy = -1;
            render();
          } else if (exploring()) walk(point);
          else move(point);
        });
        elements.tiles.append(tile);
        tiles.push({ tile, point: [x, y] });
      }
  }
  function syncHand() {
    const nextHand = [...room.availableCardRefs];
    const signature = nextHand.join(',');
    if (signature !== handSignature) {
      const remaining = new Map<string, number>();
      for (const id of renderedHand) remaining.set(id, (remaining.get(id) ?? 0) + 1);
      const entering = nextHand.map((id) => {
        if (dealWholeHand) return true;
        const count = remaining.get(id) ?? 0;
        if (!count) return true;
        remaining.set(id, count - 1);
        return false;
      });
      handSignature = signature;
      elements.hand.replaceChildren();
      nextHand.forEach((ref, index) => {
        const id = cardKind(ref);
        const definition: CardDefinition = data.cards[id],
          card = document.createElement('button');
        card.type = 'button';
        card.tabIndex = -1;
        card.className = 'card';
        card.classList.toggle('ultimate-card', id === 'absoluteShadow' || id === 'dawnSpear');
        card.dataset.card = id;
        card.dataset.index = String(index);
        if (entering[index]) {
          card.classList.add('card-entering');
          card.style.setProperty('--entry-order', String(entering.slice(0, index).filter(Boolean).length));
        }
        if (index) card.style.marginLeft = 'calc(-1 * var(--card-overlap))';
        card.style.zIndex = String(index + 1);
        card.setAttribute('aria-label', definition.name);
        const cost = document.createElement('span');
        cost.className = 'card-cost';
        const costValue = id === 'forward' ? 0 : definition.cost ?? 1;
        cost.dataset.cost = String(costValue);
        cost.setAttribute('aria-hidden', 'true');
        for (let pip = 0; pip < costValue; pip++) {
          const flame = document.createElement('span');
          flame.className = 'cost-flame';
          flame.style.zIndex = String(costValue - pip);
          cost.append(flame);
        }
        card.append(cost);
        const illustration = id === 'forward'
          ? room.loadout === 'qinghe' ? qingheForwardArt : room.loadout === 'rogue' ? cardArt.forward : undefined
          : cardArt[id];
        if (illustration) {
          const image = document.createElement('img');
          image.className = 'card-art';
          image.classList.toggle('card-art-qinghe-forward', id === 'forward' && room.loadout === 'qinghe');
          image.src = illustration;
          image.alt = '';
          image.draggable = false;
          card.append(image);
        } else card.insertAdjacentHTML('beforeend', diagram(definition));
        card.addEventListener('pointerenter', () => {
          if (touchLayout()) return;
          if (!busy) {
            elements.tileInfo.hidden = true;
            elements.hint.hidden = false;
            $('target-outcome').hidden = true;
            showCardHint(definition, cardRequirement(index), ref);
          }
        });
        card.addEventListener('pointerleave', () => {
          if (touchLayout()) return;
          render();
        });
        card.addEventListener('pointerdown', (event) => {
          if (!touchLayout() || event.pointerType !== 'touch' || busy) return;
          heldCard = null;
          clearTimeout(cardHoldTimer);
          const startX = event.clientX, startY = event.clientY;
          const onMove = (move: PointerEvent) => {
            if (Math.hypot(move.clientX - startX, move.clientY - startY) > 12) clearTimeout(cardHoldTimer);
          };
          const stop = () => {
            clearTimeout(cardHoldTimer);
            card.removeEventListener('pointermove', onMove);
            card.removeEventListener('pointerup', stop);
            card.removeEventListener('pointercancel', stop);
          };
          card.addEventListener('pointermove', onMove);
          card.addEventListener('pointerup', stop);
          card.addEventListener('pointercancel', stop);
          cardHoldTimer = window.setTimeout(() => {
            heldCard = card;
            openCardDetails(id, ref);
          }, 420);
        });
        card.addEventListener('click', (event) => {
          if (heldCard !== card) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          heldCard = null;
        }, true);
        onClick(card, () => {
          if (busy) return;
          if (id === 'absoluteShadow' || id === 'dawnSpear') {
            closeCardDetails();
            selected = -1;
            ultimateTargeting = !ultimateTargeting;
            inspectedTile = null;
            render();
            return;
          }
          ultimateTargeting = false;
          if (!exploring() && !room.canUseCard(index)) {
            selected = -1;
            inspectedTile = null;
            hoveredTile = null;
            hoveredEnemy = -1;
            render();
            elements.tileInfo.hidden = true;
            elements.hint.hidden = false;
            showCardHint(definition, cardRequirement(index), ref);
            rejectCard(card);
            if (touchLayout()) elements.touchInfo.replaceChildren(...Array.from(elements.hint.childNodes).map(node => node.cloneNode(true)));
            return;
          }
          closeCardDetails();
          inspectedTile = null;
          selected = selected === index ? -1 : index;
          inspectedEnemy = -1;
          hoveredTile = null;
          hoveredEnemy = -1;
          render();
          if (selected === index) confirmCard(card);
        });
        elements.hand.append(card);
      });
      renderedHand = nextHand;
      dealWholeHand = false;
    }
    const handCount = room.availableCards.length;
    const cardWidth = 160;
    const naturalWidth = handCount * cardWidth + Math.max(0, handCount - 1) * 8;
    const handWidth = 680;
    elements.hand.style.width = `${handWidth}px`;
    elements.hand.style.setProperty('--hand-card-width', `${cardWidth}px`);
    elements.hand.style.setProperty('--card-overlap', `${Math.max(0, Math.ceil((naturalWidth - handWidth) / Math.max(1, handCount - 1)))}px`);
    [...root.querySelectorAll<HTMLButtonElement>('.card')].forEach((card) => {
      const index = Number(card.dataset.index);
      const isUltimate = card.dataset.card === 'absoluteShadow' || card.dataset.card === 'dawnSpear';
      const reason = isUltimate ? '' : cardRequirement(index);
      const cost = card.dataset.card === 'forward' ? 0 : room.cardCost(index);
      const costNode = card.querySelector<HTMLElement>('.card-cost')!;
      if (costNode.dataset.cost !== String(cost)) {
        costNode.dataset.cost = String(cost);
        costNode.innerHTML = Array.from({ length: cost }, (_, i) => `<span class="cost-flame" style="z-index:${cost - i}"></span>`).join('');
      }
      card.classList.toggle('engraved', Boolean(room.build.engravings[room.availableCardRefs[index]]));
      card.querySelector('.engraving-badge')?.remove();
      const engraving = room.build.engravings[room.availableCardRefs[index]];
      if (engraving) card.append(engravingBadge(engraving, !room.growthReady(room.availableCardRefs[index])));
      card.classList.toggle('card-unavailable', Boolean(reason));
      card.classList.toggle('energy-unavailable', !isUltimate && !exploring() && room.actions < cost);
      card.setAttribute('aria-label', `${data.cards[room.availableCards[index]].name}，${reason || `消耗 ${cost} 魂火`}`);
      const chosen = isUltimate ? ultimateTargeting : index === selected;
      card.classList.toggle('selected', chosen);
      if (!chosen) card.getAnimations({ subtree: true }).filter(animation => animation.id === 'card-confirmed').forEach(animation => animation.cancel());
      card.setAttribute('aria-pressed', String(chosen));
      // Gameplay-unavailable cards remain inspectable. Only animation locks use
      // native disabled; the click handler still refuses invalid plays.
      card.disabled = busy;
      card.setAttribute('aria-disabled', String(busy || Boolean(reason)));
    });
  }
  function renderHealth(incoming = 0) {
    elements.health.innerHTML = healthSegment.repeat(5);
    [...elements.health.children].forEach((node, index) => {
      node.classList.toggle('empty', index >= room.health);
      node.classList.toggle('forecast', index < room.health && index >= room.health - incoming);
    });
    elements.health.setAttribute(
      'aria-label',
      `生命 ${room.health} / 5${incoming ? `，預計受到 ${incoming} 傷害` : ''}`
    );
  }
  function renderEnergy(value = room.actions) {
    const energy = Math.max(0, Math.min(9, value));
    const capacity = Math.max(2, room.actions, elements.energyCount.children.length);
    while (elements.energyCount.children.length < capacity) {
      const pip = document.createElement('span');
      pip.className = 'action-pip';
      elements.energyCount.append(pip);
    }
    const charge = journey.loadout === 'basic' ? 0 : journey.ultimateCharge;
    const previousActions = Number(elements.energyCount.dataset.value);
    elements.energyCount.dataset.value = String(energy);
    elements.energyCount.setAttribute('aria-label', `剩餘行動 ${energy} / ${capacity}`);
    [...elements.energyCount.children].forEach((pip, index) => {
      pip.classList.toggle('empty', index >= energy);
      (pip as HTMLElement).style.zIndex = String(capacity - index);
    });
    elements.actions.style.setProperty('--ultimate-progress', `${charge / journey.ultimateThreshold * 100}%`);
    elements.actions.hidden = journey.loadout === 'basic';
    elements.actions.style.setProperty('--ultimate-art', `url("${journey.loadout === 'qinghe' ? qingheChargeArt : rogueChargeArt}")`);
    const ultimateName = journey.loadout === 'qinghe' ? '破曉一槍' : '絕影';
    const chargeTestButton = root.querySelector<HTMLButtonElement>('[data-test-action="charge"]');
    if (chargeTestButton) {
      chargeTestButton.setAttribute('aria-label', `蓄滿${ultimateName}`);
      chargeTestButton.title = `蓄滿${ultimateName}`;
    }
    elements.actions.setAttribute('aria-label', ultimateTargeting ? `${ultimateName}，選擇目標；再點圖案取消` : `${ultimateName}充能 ${charge} / ${journey.ultimateThreshold}${charge >= journey.ultimateThreshold ? '，點擊施放' : ''}`);
    elements.actions.setAttribute('aria-pressed', String(ultimateTargeting));
    elements.actions.setAttribute('aria-disabled', String(busy));
    elements.actions.classList.toggle('ultimate-ready', journey.loadout !== 'basic' && charge >= journey.ultimateThreshold);
    if (Number.isFinite(previousActions) && previousActions !== energy) {
      elements.energyCount.classList.remove('energy-gain', 'energy-spend');
      void elements.energyCount.offsetWidth;
      elements.energyCount.classList.add(energy > previousActions ? 'energy-gain' : 'energy-spend');
    }
  }
  function cardRequirement(index: number): string {
    const reason = room.cardUnavailableReason(index);
    return reason ? {
      finished: '戰鬥已結束', energy: '魂火不足', enemy: '範圍內沒有怪物',
      'empty-tile': '周圍沒有可移動的空格', knife: '需要場上小刀',
      'empty-knife': '沒有位於空地的飛刀', destination: '沒有可到達的位置'
    }[reason] : '';
  }
  function renderTileInfo(preview: ReturnType<Room['preview']>) {
    const panel = elements.tileInfo;
    if (ultimateTargeting || selected >= 0) {
      panel.hidden = true;
      elements.hint.hidden = false;
      return;
    }
    const point = touchLayout() ? inspectedTile : hoveredTile;
    const isHero = Boolean(point && equal(point, room.hero));
    const enemy = point ? room.at(point) : undefined;
    const hasKnife = point ? room.hasKnife(point) : false;
    const isExit = Boolean(point && exploring() && equal(point, journey.exit));
    const danger = point && !exploring() ? room.damageAt(point, preview?.removedIds ?? preview?.removedId ?? -1) : 0;
    panel.hidden = !point || busy || (room.finished && !exploring()) || (!isHero && !enemy && !hasKnife && !isExit && !danger);
    elements.hint.hidden = !panel.hidden;
    if (panel.hidden || !point) {
      if (touchLayout() && inspectedTile) elements.touchInfo.replaceChildren();
      return;
    }
    const title = isHero ? characterInfo[room.loadout].name : enemy ? `${enemy.elite ? '精英・' : ''}${data.enemies[enemy.kind].name}` : isExit ? '出口' : hasKnife ? '地上小刀' : '危險地格';
    const lines: string[] = [];
    if (isHero) lines.push(characterInfo[room.loadout].introduction);
    if (enemy) {
      const skill = enemySkill(enemy);
      lines.push(`${skill.name}：${skill.hint}`);
      if (enemy.facing && enemySkill(enemy).guardsFront) lines.push(`面向：${{ north: '上', east: '右', south: '下', west: '左' }[enemy.facing]}`);
    }
    if (hasKnife) lines.push('撿刀：補 1 行動，可抽 1 張牌');
    if (danger) lines.push(`回合結束時，站在此格受${danger}點傷害`);
    const chosenId = room.availableCards[selected];
    if (preview?.blocked) lines.push('正面格擋：攻擊無效，仍消耗行動');
    else if (preview && enemy && (preview.removedIds ?? [preview.removedId]).includes(enemy.id)) lines.push('預計擊殺 · 點擊後才會出手');
    else if (preview && enemy && preview.removedId < 0 && chosenId !== 'throw') lines.push('目標未倒下，角色留在原地');
    panel.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = title;
    if (enemy) {
      const life = document.createElement('span');
      life.className = 'enemy-life';
      life.setAttribute('role', 'img');
      life.setAttribute('aria-label', `生命 ${enemy.health ?? 1} / ${enemy.maxHealth ?? (enemy.elite ? 2 : 1)}`);
      const maximum = enemy.maxHealth ?? (enemy.elite ? 2 : 1);
      life.innerHTML = healthSegment.repeat(maximum);
      [...life.children].forEach((node, index) => node.classList.toggle('empty', index >= (enemy.health ?? 1)));
      heading.append(life);
    }
    panel.append(heading);
    for (const line of lines) {
      const detail = document.createElement('span');
      detail.textContent = line;
      panel.append(detail);
    }
    if (touchLayout()) {
      elements.touchInfo.replaceChildren(...Array.from(panel.childNodes).map(node => node.cloneNode(true)));
      panel.hidden = true;
    }
  }
  function render() {
    if (!room) return;
    const preview: MovePreview | null =
      !busy && hoveredTile
        ? exploring()
          ? room.canExplore(selected, hoveredTile)
            ? { destination: hoveredTile, removedId: -1, damage: 0, blocked: false }
            : null
          : room.preview(selected, hoveredTile)
        : null;
    const removedId = preview?.removedId ?? -1;
    const dawnDirection = hoveredTile ? room.dawnDirectionTo(hoveredTile) : null;
    const dawnPreview = !busy && ultimateTargeting && journey.loadout === 'qinghe' && dawnDirection ? room.dawnRay(dawnDirection) : [];
    const shadowTarget = !busy && ultimateTargeting && journey.loadout === 'rogue' && hoveredTile ? room.at(hoveredTile) : undefined;
    const removedIds = dawnPreview.length ? dawnPreview.filter(enemy => (enemy.health ?? 1) <= 2).map(enemy => enemy.id)
      : shadowTarget ? (shadowTarget.health ?? 1) <= 2 ? [shadowTarget.id] : []
      : preview?.removedIds ?? [removedId];
    const focusedEnemy = room.enemies.find((e) => e.id === (hoveredEnemy >= 0 ? hoveredEnemy : inspectedEnemy));
    // Every forecast layer follows the same predicted deaths, including ultimates.
    const focus = !busy && focusedEnemy && !removedIds.includes(focusedEnemy.id)
      ? preview?.pushed?.id === focusedEnemy.id ? { ...focusedEnemy, position: preview.pushed.to } : focusedEnemy : null;
    const cleared = exploring();
    const chosenId = room.availableCards[selected];
    const chosen = chosenId ? data.cards[chosenId] : undefined;
    const hits = dawnPreview.length ? dawnPreview : shadowTarget ? [shadowTarget]
      : preview && chosenId === 'sweep' ? room.enemies.filter(enemy => data.cards.sweep.offsets.some(([x, y]) => equal(enemy.position, [room.hero[0] + x, room.hero[1] + y])))
      : preview?.hitId !== undefined ? room.enemies.filter(enemy => enemy.id === preview.hitId) : [];
    const outcome = $('target-outcome');
    outcome.hidden = !hits.length;
    outcome.replaceChildren(...hits.map(enemy => {
      const row = document.createElement('span'); row.className = 'target-health';
      const image = document.createElement('img'); image.src = enemyArt[enemy.kind]; image.alt = data.enemies[enemy.kind].name;
      const life = document.createElement('span'); life.className = 'enemy-life';
      const blocked = !ultimateTargeting && blocksAttack(enemy, room.hero);
      const remaining = Math.max(0, (enemy.health ?? 1) - (blocked ? 0 : ultimateTargeting ? 2 : 1));
      const current = enemy.health ?? 1, maximum = enemy.maxHealth ?? current;
      life.innerHTML = healthSegment.repeat(maximum);
      [...life.children].forEach((node, index) => { node.classList.toggle('empty', index >= current); node.classList.toggle('forecast', index >= remaining && index < current); });
      row.setAttribute('aria-label', `${data.enemies[enemy.kind].name}，生命 ${current} → ${remaining}${blocked ? '，格擋' : preview?.pushBlocked ? '，無法推動' : ''}`);
      row.append(image, life);
      if (blocked) { const shieldMark = document.createElement('span'); shieldMark.className = 'forecast-shield'; shieldMark.innerHTML = '<svg viewBox="0 0 64 64"><path d="M32 5 53 14v17c0 14-21 26-21 26S11 45 11 31V14Z"/></svg>'; row.append(shieldMark); }
      return row;
    }));
    renderTileInfo(preview);
    if (!busy) {
      if (ultimateTargeting) showCardHint(data.cards[journey.loadout === 'qinghe' ? 'dawnSpear' : 'absoluteShadow']);
      else if (cleared) {
        if (chosen) showCardHint(chosen, '', room.availableCardRefs[selected]);
        else elements.hint.textContent = '';
      }
      else if (chosen) showCardHint(chosen, '', room.availableCardRefs[selected]);
      else elements.hint.textContent = '';
    }
    $('room-exit').toggleAttribute('hidden', !cleared);
    elements.game.classList.toggle('exploring', cleared);
    const threatMarks = document.createDocumentFragment();
    const targetMarks = document.createDocumentFragment();
    const areaMark = (points: Point[], active: boolean) => {
      if (!points.length) return;
      const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
      const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
      const mark = document.createElement('div');
      mark.className = 'area-target-mark';
      mark.classList.toggle('hovered', active);
      Object.assign(mark.style, { left: `${minX * 20}%`, top: `${(4 - maxY) * 20}%`, width: `${(maxX - minX + 1) * 20}%`, height: `${(maxY - minY + 1) * 20}%` });
      mark.style.setProperty('--arm-x', `${30 / (maxX - minX + 1)}%`);
      mark.style.setProperty('--arm-y', `${30 / (maxY - minY + 1)}%`);
      targetMarks.append(mark);
    };
    if (chosenId === 'sweep' && !busy) {
      areaMark(tiles.filter(({ point }) => !equal(point, room.hero) && room.canMove(selected, point)).map(({ point }) => point), Boolean(preview));
    }
    if (ultimateTargeting && journey.loadout === 'qinghe' && !busy) {
      for (const direction of [[0, 1], [1, 0], [0, -1], [-1, 0]] as Point[]) {
        if (!room.dawnRay(direction).length) continue;
        areaMark(tiles.filter(({ point }) => {
          const ray = room.dawnDirectionTo(point);
          return ray && equal(ray, direction);
        }).map(({ point }) => point), Boolean(dawnDirection && equal(direction, dawnDirection)));
      }
    }
    for (const { tile, point } of tiles) {
      const damage = room.damageAt(point, removedIds, chosenId === 'throw' && preview ? hoveredTile! : undefined, preview?.pushed),
        legal =
          !busy && (cleared ? room.canExplore(selected, point) : room.canMove(selected, point)),
        threatened = Boolean(focus && Room.threatens(focus, point));
      tile.classList.toggle('danger', damage > 0);
      tile.dataset.danger = String(Math.min(damage, 3));
      const sweepTargeting = chosenId === 'sweep';
      tile.classList.toggle('legal', legal && !sweepTargeting);
      tile.classList.toggle('sweep-range', legal && sweepTargeting);
      tile.classList.toggle('sweep-active', legal && sweepTargeting && Boolean(preview));
      tile.classList.toggle('inspectable', !busy && !room.finished && selected < 0 && Boolean(room.at(point)));
      tile.classList.toggle('capture', legal && !sweepTargeting && Boolean(room.at(point)));
      const direction = room.dawnDirectionTo(point);
      const dawnTarget = Boolean(ultimateTargeting && journey.loadout === 'qinghe' && direction && room.dawnRay(direction).length);
      tile.classList.toggle('ultimate-target', ultimateTargeting && journey.loadout === 'rogue' && Boolean(room.at(point)));
      tile.classList.toggle('dawn-range', dawnTarget);
      tile.classList.toggle('dawn-active', dawnTarget && Boolean(direction && dawnDirection && equal(direction, dawnDirection)));
      tile.classList.toggle('blocked', legal && !sweepTargeting && Boolean(room.at(point) && blocksAttack(room.at(point)!, room.hero)));
      tile.classList.toggle('landing', !sweepTargeting && Boolean(preview && equal(point, ['throw', 'knife', 'thrust', 'repel', 'recall'].includes(chosenId) ? hoveredTile! : preview.destination)));
      tile.classList.toggle('focus-threat', threatened);
      if (threatened) {
        const mark = document.createElement('div');
        mark.className = 'threat-mark';
        place(mark, point);
        threatMarks.append(mark);
      }
      if (!sweepTargeting && !dawnTarget && room.at(point) && (legal || ultimateTargeting && journey.loadout === 'rogue')) {
        const mark = document.createElement('div');
        mark.className = 'target-mark';
        mark.classList.toggle('hovered', Boolean(hoveredTile && equal(hoveredTile, point)));
        mark.classList.toggle('blocked', !ultimateTargeting && Boolean(room.at(point) && blocksAttack(room.at(point)!, room.hero)));
        place(mark, point);
        targetMarks.append(mark);
      }
      tile.classList.toggle('exit-tile', cleared && equal(point, journey.exit));
      tile.disabled = busy || (room.finished && !cleared);
      const enemy = room.at(point);
      tile.setAttribute(
        'aria-label',
        `${point[0] + 1},${point[1] + 1}${enemy ? ` ${enemySummary(enemy)}` : ''}${damage ? `，${damage} 傷害` : ''}${legal ? chosenId === 'sweep' ? '，施放周圍一圈橫掃' : chosenId === 'recall' ? '，回收飛刀' : enemy && ['throw', 'knife', 'thrust', 'repel'].includes(chosenId) ? '，可攻擊' : '，可移動' : ''}`
      );
      if (dawnTarget && direction)
        tile.setAttribute('aria-label', `${point[0] + 1},${point[1] + 1}，施放破曉一槍，直線命中 ${room.dawnRay(direction).length} 隻怪物`);
      if (cleared)
        tile.setAttribute(
          'aria-label',
          equal(point, journey.exit) ? '走向出口' : `走到 ${point[0] + 1},${point[1] + 1}`
        );
      tile.classList.toggle('has-knife', room.hasKnife(point));
    }
    elements.threatMarks.replaceChildren(threatMarks);
    elements.targetMarks.replaceChildren(targetMarks);
    $('ground-knives').replaceChildren();
    for (const point of room.knives) {
      const token = document.createElement('div');
      token.className = 'ground-knife';
      token.classList.toggle('occupied', room.enemies.some(enemy => equal(enemy.position, point)));
      token.dataset.point = point.join(',');
      token.innerHTML = groundDaggerIcon;
      token.title = '飛刀：走到此格獲得一張免費小刀';
      place(token, point);
      $('ground-knives').append(token);
    }
    for (const enemy of room.enemies) {
      const sprite = actor(enemy.id);
      place(sprite, enemy.position);
      sprite.classList.toggle('victim-preview', chosenId !== 'sweep' && removedIds.includes(enemy.id));
      sprite.classList.toggle('sweep-victim-preview', chosenId === 'sweep' && Boolean(preview) && removedIds.includes(enemy.id));
      sprite.classList.toggle('hovered', enemy.id === hoveredEnemy && !busy);
      const skill = enemySkill(enemy);
      sprite.dataset.skill = skill.id;
      sprite.dataset.facing = enemy.facing ?? 'south';
      sprite.classList.toggle('guarding', Boolean(skill.guardsFront));
      sprite.classList.toggle('block-preview', hits.some(hit => hit.id === enemy.id) && !ultimateTargeting && blocksAttack(enemy, room.hero));
      sprite.classList.toggle('push-origin', preview?.pushed?.id === enemy.id);
      sprite.classList.toggle('push-resistant', preview?.hitId === enemy.id && Boolean(preview.pushBlocked) && !preview.blocked);
    }
    place(actor('hero'), room.hero);
    const landing = shadowTarget && removedIds.includes(shadowTarget.id) ? shadowTarget.position : preview?.destination;
    const changesPosition = Boolean(landing && !equal(landing, room.hero));
    actor('hero').classList.toggle('origin-preview', changesPosition);
    elements.ghost.hidden = !changesPosition;
    if (landing) place(elements.ghost, landing);
    const pushed = preview?.pushed;
    $('push-ghost').hidden = !pushed;
    if (pushed) { $('push-ghost').querySelector<HTMLImageElement>('img')!.src = enemyArt[room.enemies.find(e => e.id === pushed.id)!.kind]; place($('push-ghost'), pushed.to); }
    renderHealth(room.finished || busy ? 0 : ultimateTargeting ? room.damageAt(landing ?? room.hero, removedIds) : preview ? preview.damage : room.damageAt(room.hero));
    renderEnergy();
    renderJourneyProgress();
    elements.game.dataset.turn = String(room.turn);
    elements.end.disabled = busy || (room.finished && !cleared);
    $<HTMLButtonElement>('back-home').disabled = busy;
    $<HTMLButtonElement>('open-battle-help').disabled = busy;
    $<HTMLButtonElement>('open-deck').disabled = busy || dealingHand;
    elements.game.classList.toggle('choosing', selected >= 0 && !busy);
    elements.game.setAttribute('aria-busy', String(busy));
    syncHand();
    const showingSkill = selected >= 0 || ultimateTargeting;
    elements.touchInfo.dataset.mode = inspectedTile && !showingSkill ? 'tile' : 'hint';
    if (touchLayout() && (!inspectedTile || showingSkill))
      elements.touchInfo.replaceChildren(...Array.from(elements.hint.childNodes).map(node => node.cloneNode(true)));
  }
  function lock(preserveSelection = false) {
    busy = true;
    ultimateTargeting = false;
    if (!preserveSelection) selected = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    inspectedEnemy = -1;
    elements.hint.textContent = '';
    elements.ghost.hidden = true;
    $('push-ghost').hidden = true;
    $('target-outcome').hidden = true;
    elements.threatMarks.replaceChildren();
    elements.targetMarks.replaceChildren();
    elements.tileInfo.hidden = true;
    inspectedTile = null;
    closeCardDetails();
    for (const actor of actors.values())
      actor.classList.remove('origin-preview', 'victim-preview', 'sweep-victim-preview', 'hovered', 'block-preview', 'push-origin', 'push-resistant');
    elements.end.disabled = true;
    $<HTMLButtonElement>('back-home').disabled = true;
    $<HTMLButtonElement>('open-battle-help').disabled = true;
    $<HTMLButtonElement>('open-deck').disabled = true;
    elements.game.classList.remove('choosing');
    for (const { tile } of tiles) {
      tile.disabled = true;
      tile.classList.remove('legal', 'landing', 'focus-threat', 'capture', 'blocked', 'ultimate-target', 'dawn-range', 'dawn-active', 'sweep-range', 'sweep-active');
    }
    for (const card of root.querySelectorAll<HTMLButtonElement>('.card')) {
      card.disabled = true;
      if (!preserveSelection) card.classList.remove('selected');
    }
    elements.game.setAttribute('aria-busy', 'true');
  }
  async function discardVisibleHand(allowExploration = false) {
    // Once the cleared-room walking card is on screen, stale turn-end input
    // must never send it through the combat-hand discard flow.
    if (!allowExploration && exploring() && renderedHand.length === 1 && renderedHand[0] === 'forward') return;
    const cards = [...elements.hand.querySelectorAll<HTMLElement>('.card')];
    for (const card of cards) {
      card.classList.remove('card-entering');
      card.getAnimations().forEach((animation) => animation.cancel());
    }
    await Promise.all(cards.map(async (card, index) => {
      await pause(index * 45);
      // Keep the underlying style at the final state so Web Animations cannot
      // reveal the card for one frame when its effect is removed on finish.
      card.style.opacity = '0';
      card.style.transform = 'translateX(-56px)';
      await animate(
        card,
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(-56px)' }
        ],
        240,
        'cubic-bezier(.4,0,.7,1)'
      );
    }));
    elements.hand.replaceChildren();
    handSignature = '';
    renderedHand = [];
  }
  async function revealClearedRoom() {
    journey.claimClearReward();
    const exitPosition = room.hero.slice() as Point;
    const pushedTo = journey.clearOccupiedExit();
    if (pushedTo) await travel(actor('hero'), exitPosition, pushedTo, 0);
    await discardVisibleHand();
    elements.game.classList.add('clearing-reveal');
    render();
    await pause(360);
    busy = false;
    render();
    void pause(320).then(() => elements.game.classList.remove('clearing-reveal'));
  }
  async function move(destination: Point) {
    if (busy || !room.canMove(selected, destination)) return;
    const paidEnergy = room.actions - room.cardCost(selected);
    const targetWasElite = Boolean(room.at(destination)?.elite);
    const blocked = room.preview(selected, destination)?.blocked ?? false;
    const action = room.move(selected, destination);
    if (!action) return;
    // Remove the played copy so drawing the same kind still gets a deal animation.
    const played = elements.hand.children[selected] as HTMLElement | undefined;
    const playedBounds = played?.getBoundingClientRect();
    played?.remove();
    renderedHand.splice(selected, 1);
    handSignature = '';
    if (journey.loadout === 'qinghe' && ['advance', 'thrust', 'sweep', 'sidestep', 'repel'].includes(action.kind)) journey.gainDawnCharge();
    lock();
    renderEnergy(paidEnergy);
    if (action.growth?.includes('discount')) await growthFeedback('discount', playedBounds);
    if (action.hits) {
      elements.hint.textContent = '';
      playSound(action.hits.some(hit => hit.removed) ? 'kill' : 'hit');
      await Promise.all(action.hits.map(async hit => {
        if (hit.blocked) {
          playSound('block');
          await shield(actor(hit.id));
          return;
        }
        await Promise.all([
          impact(elements.board, hit.position, hit.removed),
          recoil(actor(hit.id), action.from, hit.position),
          ...(hit.removed ? [] : [heartBurst(elements.board, hit.position)])
        ]);
      }));
      for (const hit of action.hits.filter(hit => hit.removed)) {
        const victim = actor(hit.id);
        await animate(victim, [{ opacity: 1 }, { opacity: 0 }], 180, 'ease-out');
        victim.remove();
        actors.delete(hit.id);
        journey.gainAssassination(hit.elite);
      }
      if (action.growth?.some(kind => kind !== 'discount')) await growthFeedback(action.growth.find(kind => kind !== 'discount')!, playedBounds);
      renderEnergy();
      await rewardFeedback(action);
      if (room.won && !journey.finished) {
        await revealClearedRoom();
        return;
      }
      busy = false;
      render();
      if (room.finished) showResult();
      return;
    }
    if (action.pickedKnife)
      $('ground-knives').querySelector(`[data-point="${action.to.join(',')}"]`)?.remove();
    // Keep the visible board stable until the movement and impact complete.
    const thrown = action.kind === 'throw';
    const stationary = ['throw', 'knife', 'recall'].includes(action.kind) || ['thrust', 'repel'].includes(action.kind) && action.hitId !== undefined;
    if (!stationary)
      playSound(action.kind === 'shadow' ? 'blink' : ['rush', 'leap', 'lunge'].includes(action.kind) ? 'dash' : 'step');
    const resisted = !stationary && action.hitId !== undefined && action.removedId < 0;
    const contact = resisted
      ? action.kind === 'shadow'
        ? contactPoint(action.from, action.to)
        : await approach(actor('hero'), action.from, action.to, action.kind === 'leap')
      : action.to;
    if (resisted && action.kind === 'shadow') await teleport(actor('hero'), contact);
    if (thrown || action.kind === 'recall') {
      playSound('throw');
      const projectile = document.createElement('div');
      projectile.className = 'knife-projectile';
      projectile.innerHTML = daggerIcon;
      elements.board.append(projectile);
      try { await travel(projectile, action.kind === 'recall' ? action.to : action.from, action.kind === 'recall' ? action.from : action.to, 0); }
      finally { projectile.remove(); }
    } else if (!resisted && !stationary) {
      if (action.kind === 'shadow') await teleport(actor('hero'), action.to);
      else await travel(actor('hero'), action.from, action.to, action.kind === 'leap' ? 30 : 9);
    }
    if (action.hitId !== undefined) {
      elements.hint.textContent = '';
      if (blocked) { playSound('block'); await shield(actor(action.hitId!)); }
      else {
        playSound(action.removedId >= 0 ? 'kill' : 'hit');
        await Promise.all([
          impact(elements.board, action.to, action.removedId >= 0),
          recoil(actor(action.hitId), action.from, action.to),
          ...(action.removedId < 0 ? [heartBurst(elements.board, action.to)] : [])
        ]);
      }
    }
    if (action.pushed) await travel(actor(action.pushed.id), action.pushed.from, action.pushed.to, 0);
    if (action.hitId !== undefined && action.removedId < 0) {
      if (!stationary) {
        if (action.kind === 'shadow') await teleport(actor('hero'), action.from);
        else await travel(actor('hero'), contact, action.from, 0);
      }
    }
    if (action.removedId >= 0) {
      const victim = actor(action.removedId);
      await animate(
        victim,
        [
          { opacity: 1 },
          { opacity: 1, offset: .25 },
          { opacity: 0 }
        ],
        300,
        'cubic-bezier(.3,.05,.65,1)'
      );
      victim.remove();
      actors.delete(action.removedId);
      journey.gainAssassination(targetWasElite);
      if (!action.growth?.includes('refund')) renderEnergy();
    }
    if (action.growth?.some(kind => kind !== 'discount')) await growthFeedback(action.growth.find(kind => kind !== 'discount')!, playedBounds);
    renderEnergy();
    await rewardFeedback(action);
    if (room.won && !journey.finished) {
      await revealClearedRoom();
      return;
    }
    if (room.finished) {
      busy = false;
      render();
      showResult();
      return;
    }
    busy = false;
    render();
  }
  async function useUltimate(enemyId: number) {
    if (busy || exploring() || !ultimateTargeting || journey.loadout !== 'rogue' || journey.assassination < 3) return;
    const target = room.enemies.find(enemy => enemy.id === enemyId);
    if (!target) return;
    if (!journey.spendAssassination()) return;
    const action = room.assassinate(enemyId);
    if (!action) return;
    ultimateTargeting = false;
    lock();
    renderEnergy();
    const hero = actor('hero');
    playSound('blink');
    await animate(hero, [
      { opacity: 1, scale: 1 },
      { opacity: 0, scale: .78 }
    ], 130, 'ease-in');
    hero.style.opacity = '0';
    playSound(action.removedId >= 0 ? 'kill' : 'hit');
    await Promise.all([
      impact(elements.board, action.to, action.removedId >= 0),
      recoil(actor(action.hitId), action.from, action.to),
      ...(action.removedId < 0 ? [heartBurst(elements.board, action.to)] : [])
    ]);
    if (action.removedId >= 0) {
      const victim = actor(action.removedId);
      await animate(victim, [{ opacity: 1 }, { opacity: 0 }], 260, 'ease-out');
      victim.remove();
      actors.delete(action.removedId);
    }
    place(hero, room.hero);
    await animate(hero, [
      { opacity: 0, scale: .78 },
      { opacity: 1, scale: 1 }
    ], 150, 'ease-out');
    hero.style.opacity = '';
    await rewardFeedback(action);
    if (room.won && !journey.finished) {
      await revealClearedRoom();
      return;
    }
    if (room.finished) {
      busy = false;
      render();
      showResult();
      return;
    }
    busy = false;
    render();
  }
  async function walk(destination: Point) {
    if (busy || !exploring()) return;
    const action = room.explore(selected, destination);
    if (!action) return;
    lock(true);
    playSound('step');
    await travel(actor('hero'), action.from, action.to, 9);
    if (equal(destination, journey.exit)) {
      const hero = actor('hero');
      await animate(
        hero,
        [
          { opacity: 1, transform: 'translate(-50%, -50%)' },
          { opacity: 0, transform: 'translate(-42%, -180%)' }
        ],
        240,
        'cubic-bezier(.35,.1,.7,1)'
      );
      hero.style.opacity = '0';
      await advanceRoom();
    }
    busy = false;
    render();
  }
  async function advanceRoom() {
      await animate(
        elements.board,
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(12px)' }
        ],
        220
      );
      const previousHealth = room.health;
      if (journey.advance()) {
        loadRoom();
        lock();
        await animate(
          elements.board,
          [
            { opacity: 0, transform: 'translateY(-12px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          240
        );
        const recovered = room.health - previousHealth;
        const arrival = $('room-arrival');
        $('arrival-stage').textContent = `森林遺跡 · 第 ${journey.stage + 1} / ${journey.total} 間`;
        $('arrival-name').textContent = journey.definition.name;
        $('arrival-recovery').textContent = recovered > 0 ? `生命恢復 +${recovered}` : '生命已滿';
        arrival.hidden = false;
        try {
          await Promise.all([
            animate(arrival, [
              { opacity: 0, transform: 'translate(-50%, -40%)' },
              { opacity: 1, transform: 'translate(-50%, -50%)', offset: 0.15 },
              { opacity: 1, transform: 'translate(-50%, -50%)', offset: 0.8 },
              { opacity: 0, transform: 'translate(-50%, -55%)' }
            ], 950),
            ...[...elements.health.children].slice(previousHealth, room.health).map(heart => animate(heart, [
              { filter: 'none', scale: 1 },
              { filter: 'brightness(1.7) drop-shadow(0 0 6px #e5c67d)', scale: 1.3, offset: 0.3 },
              { filter: 'brightness(1.3) drop-shadow(0 0 4px #e5c67d)', scale: 1.1, offset: 0.7 },
              { filter: 'none', scale: 1 }
            ], 850))
          ]);
        } finally { arrival.hidden = true; }
      }
  }
  async function enemyTurn() {
    if (busy || dealingHand || room.finished) return;
    lock();
    elements.endLabel.textContent = '敵方回合';
    await discardVisibleHand();
    // Resolve the already-announced footprint even when the hero dodged it.
    // Reuse the threat artwork instead of inventing a second warning language.
    const cast = document.createElement('div'); cast.className = 'enemy-cast';
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      if (!room.enemies.some(enemy => Room.threatens(enemy, [x, y]))) continue;
      const mark = document.createElement('div'); mark.className = 'threat-mark'; place(mark, [x, y]); cast.append(mark);
    }
    elements.board.append(cast);
    try { if (cast.childElementCount) await animate(cast, [{ opacity: 0 }, { opacity: .9, offset: .35 }, { opacity: 0 }], 260); }
    finally { cast.remove(); }
    const charging = new Set(room.enemies.filter(e => enemySkill(e).id === 'charge').map(e => e.id));
    const outcome = room.endTurn();
    if (!outcome) {
      busy = false;
      render();
      return;
    }
    await Promise.all(outcome.motions.filter(m => charging.has(m.id)).map(m => travel(actor(m.id), m.from, m.to, 0)));
    const cellPixels = elements.board.clientWidth / 5;
    await Promise.all(
      outcome.attacks.filter(attack => !charging.has(attack.id)).map((attack) => {
        const dx = room.hero[0] - attack.from[0],
          dy = room.hero[1] - attack.from[1];
        const magnitude = Math.hypot(dx, dy),
          shift = cellPixels * 0.13;
        return animate(
          actor(attack.id),
          [
            { transform: 'translate(-50%, -50%)' },
            {
              transform: `translate(calc(-50% + ${(dx / magnitude) * shift}px), calc(-50% - ${(dy / magnitude) * shift}px))`
            },
            { transform: 'translate(-50%, -50%)' }
          ],
          240
        );
      })
    );
    if (outcome.damage) {
      elements.hint.textContent = `受到 ${outcome.damage} 傷害`;
      renderHealth();
      const source = outcome.attacks[0]?.from ?? [room.hero[0], room.hero[1] + 1] as Point;
      await Promise.all([recoil(actor('hero'), source, room.hero, true), animate(elements.health, [
        { opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }
      ], 380)]);
    }
    if (!room.lost) {
      await Promise.all(
        outcome.motions.filter(motion => !charging.has(motion.id)).map((motion) => travel(actor(motion.id), motion.from, motion.to, 12))
      );
      dealWholeHand = true;
    }
    busy = false;
    elements.endLabel.textContent = '結束回合';
    render();
    if (!room.finished) lockWhileCardsEnter(room.availableCards.length);
    if (room.finished) showResult();
  }
  async function redrawExplorationCard() {
    if (busy || dealingHand || !exploring()) return;
    lock();
    await discardVisibleHand(true);
    dealWholeHand = true;
    busy = false;
    render();
    lockWhileCardsEnter(1);
  }
  function showResult() {
    journey.claimClearReward();
    if (exploring()) return;
    elements.resultTitle.textContent = room.lost ? '再試一次' : '森林遺跡・踏破';
    $('replay').textContent = '再來一局';
    elements.result.hidden = false;
    elements.game.inert = true;
  }
  function reset() {
    journey = session.startNewJourney();
    loadRoom();
  }
  function loadRoom() {
    inspectedEnemy = -1;
    inspectedTile = null;
    closeCardDetails();
    room = journey.room;
    selected = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    ultimateTargeting = false;
    clearTimeout(overflowTimer);
    elements.overflowFeedback.hidden = true;
    elements.overflowFeedback.classList.remove('active');
    busy = false;
    handSignature = '';
    renderedHand = [];
    dealWholeHand = true;
    dealingHand = false;
    dealSequence++;
    elements.game.classList.remove('dealing-hand');
    elements.ultimateReveal.hidden = true;
    elements.result.hidden = true;
    elements.game.inert = false;
    elements.hint.textContent = '';
    elements.endLabel.textContent = '結束回合';
    elements.energyCount.replaceChildren(...Array.from({ length: 2 }, () => {
      const pip = document.createElement('span');
      pip.className = 'action-pip';
      return pip;
    }));
    delete elements.energyCount.dataset.value;
    elements.actors.replaceChildren();
    actors.clear();
    for (const enemy of room.enemies) {
      const sprite = makeActor(
        enemy.id,
        enemyArt[enemy.kind],
        `${enemy.elite ? '精英・' : ''}${data.enemies[enemy.kind].name}`
      );
      sprite.dataset.kind = enemy.kind;
      sprite.classList.toggle('boss', Boolean(data.enemies[enemy.kind].boss));
      if (enemy.kind === 'sporecap' || data.enemies[enemy.kind].boss) {
        const intent = document.createElement('span'); intent.className = 'enemy-intent'; intent.setAttribute('aria-hidden', 'true'); sprite.append(intent);
      }
      sprite.insertAdjacentHTML('beforeend', '<svg class="guard-shield" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 5 53 14v17c0 14-21 26-21 26S11 45 11 31V14Z"/></svg>');
      if (enemy.elite) {
        sprite.classList.add('elite');
        sprite.insertAdjacentHTML(
          'beforeend',
          '<svg class="elite-crown" viewBox="0 0 24 16" aria-hidden="true"><path d="M3 12 1 3l6 4L12 1l5 6 6-4-2 9ZM3 15h18"/></svg>'
        );
      }
    }
    makeActor('hero', characters[session.characterId].image, characters[session.characterId].name, true);
    elements.ghost.querySelector<HTMLImageElement>('img')!.src = characters[session.characterId].image;
    render();
    lockWhileCardsEnter(room.availableCards.length);
  }
  makeTiles();
  const help = $<HTMLDialogElement>('battle-help');
  let rulesPage = 0;
  onClick($('rules-prev'), () => { rulesPage--; renderBattleRules(); });
  onClick($('rules-next'), () => { rulesPage++; renderBattleRules(); });
  function renderBattleRules() {
    const characterRules = journey.loadout === 'qinghe' ? [
      '突進：走向周圍一格。槍刺：原地刺向上下左右一至二格的第一隻怪物。橫掃：點亮起的範圍，原地攻擊周圍八格。側步：免費換到鄰近空地。槍柄推擊：近身攻擊並推開存活怪物，菁英、扎根與後方受阻不能推動。',
      '每打出一張普通牌，大招累積一點；集滿四點後點圖案播放演出，再選方向施放；再點圖案可取消且保留充能。破曉一槍點金色直線施放，整條線上的怪物各受兩點無視格擋傷害。'
    ] : journey.loadout === 'rogue' ? [
      '飛刀：原地投擲，刀留在地上。追影：瞬移到小刀格。突進：走向周圍一格。收刃：免費原地回收任意空地飛刀，不能拿走怪物腳下的刀。怪物站在刀上時攻擊傷害增加一點。',
      '撿刀會補一點行動、抽一張普通牌，並獲得本回合限定的免費小刀卡。普通擊殺充能一點，菁英兩點；集滿三點後點圖案播放演出，再選怪物施放；再點圖案可取消且保留充能。'
    ] : ['選牌後查看亮起的落點；躍步能越過怪物，其餘移動會受到路上怪物阻擋。'];
    const lines = [
      '選牌，再點亮起的格子；再點同一張牌可取消。滑過卡牌查看說明，觸控時長按卡牌。',
      ...characterRules,
      '每回合有兩點行動。結束回合後，怪物先攻擊再移動；滑過怪物可查看它的攻擊範圍。',
      '起手先洗牌再抽三張。手牌上限五張，滿手抽到的牌會爆掉並進棄牌堆。大招直接施放，不佔手牌；若技能產生卡牌，超過五張的部分同樣爆掉。',
      '清場後用前進卡走到上方出口，不耗行動。進下一間恢復一點生命。',
      '村莊工坊強化同名卡與角色遺物，不增加普通牌種類；清場獲得旅途金幣。上方牌組圖示可查看各牌堆與已裝刻印。'
    ];
    const pages = Math.ceil(lines.length / 2);
    rulesPage = Math.max(0, Math.min(rulesPage, pages - 1));
    $('rules-page').textContent = `${rulesPage + 1} / ${pages}`;
    $<HTMLButtonElement>('rules-prev').disabled = rulesPage === 0;
    $<HTMLButtonElement>('rules-next').disabled = rulesPage === pages - 1;
    $('battle-rule-list').setAttribute('start', String(rulesPage * 2 + 1));
    $('battle-rule-list').replaceChildren(...lines.slice(rulesPage * 2, rulesPage * 2 + 2).map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
  }
  async function beginUltimate() {
    if (busy || exploring() || journey.ultimateCharge < journey.ultimateThreshold) return;
    lock();
    closeCardDetails();
    render();
    elements.ultimatePortrait.src = characters[journey.loadout === 'qinghe' ? 'qinghe' : 'rogue'].portrait;
    try {
      await elements.ultimatePortrait.decode().catch(() => {});
      elements.ultimateReveal.hidden = false;
      await pause(850);
    } finally {
      elements.ultimateReveal.hidden = true;
      busy = false;
    }
    ultimateTargeting = true;
    render();
  }
  async function useDawnUltimate(direction: Point) {
    if (busy || exploring() || !ultimateTargeting || journey.loadout !== 'qinghe' || journey.dawnCharge < 4) return;
    if (!room.dawnRay(direction).length) return;
    const action = room.strikeUltimate(direction);
    if (!action || !journey.spendDawnCharge()) return;
    lock();
    renderEnergy();
    const hits = action.hits ?? [];
    playSound(hits.some(hit => hit.removed) ? 'kill' : 'hit');
    await Promise.all(hits.map(hit => Promise.all([
      impact(elements.board, hit.position, hit.removed),
      recoil(actor(hit.id), action.from, hit.position),
      ...(hit.removed ? [] : [heartBurst(elements.board, hit.position)])
    ])));
    await Promise.all(hits.filter(hit => hit.removed).map(async hit => {
      const victim = actor(hit.id);
      await animate(victim, [{ opacity: 1 }, { opacity: 0 }], 180, 'ease-out');
      victim.remove();
      actors.delete(hit.id);
    }));
    if (room.won && !journey.finished) {
      await revealClearedRoom();
      return;
    }
    busy = false;
    render();
    if (room.finished) showResult();
  }
  function showOverflowFeedback(ref: CardRef) {
    const card = cardKind(ref);
    const face = elements.overflowFeedback.querySelector('.overflow-card')!;
    face.querySelector('.engraving-badge')?.remove();
    const engraving = room.build.engravings[ref];
    if (engraving) face.append(engravingBadge(engraving));
    clearTimeout(overflowTimer);
    const art = cardArt[card];
    const image = $<HTMLImageElement>('overflow-card-art');
    image.hidden = !art;
    if (art) image.src = art;
    $('overflow-card-name').textContent = data.cards[card].name;
    elements.overflowFeedback.hidden = false;
    elements.overflowFeedback.classList.remove('active');
    void elements.overflowFeedback.offsetWidth;
    elements.overflowFeedback.classList.add('active');
    overflowTimer = window.setTimeout(() => {
      elements.overflowFeedback.hidden = true;
      elements.overflowFeedback.classList.remove('active');
    }, 900);
  }
  async function rewardFeedback(action: MoveAction | UltimateAction) {
    const count = (action.drawnCards?.length ?? Number(Boolean(action.drawn))) + Number(Boolean(action.pickedKnife));
    if (count && !room.finished) { render(); await pause(360 + Math.max(0, count - 1) * 70); }
    for (const card of action.overflowedCards ?? (action.overflowed ? [action.overflowed] : [])) {
      showOverflowFeedback(card); await pause(900);
    }
  }
  async function growthFeedback(kind: Engraving, source?: DOMRect) {
    if (!source) return;
    const bounds = root.getBoundingClientRect(), scale = bounds.width / root.clientWidth;
    const effect = engravingBadge(kind);
    effect.classList.add('growth-trigger'); effect.dataset.trigger = kind;
    effect.style.left = `${(source.x + source.width / 2 - bounds.x) / scale}px`;
    effect.style.top = `${(source.y - bounds.y) / scale}px`;
    root.append(effect);
    const target = elements.energyCount.getBoundingClientRect();
    const dx = kind === 'draw' ? 0 : (target.x + target.width / 2 - source.x - source.width / 2) / scale;
    const dy = kind === 'draw' ? -24 : (target.y + target.height / 2 - source.y) / scale;
    try {
      await animate(effect, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.8)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.22)', offset: .25 },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.1)', offset: .55 },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.9)` }
      ], 300, 'ease-out');
    } finally { effect.remove(); }
  }
  if (import.meta.env.DEV) {
    const tools = $('battle-test-tools');
    tools.hidden = false;
    for (const button of tools.querySelectorAll<HTMLButtonElement>('button[data-test-action]')) {
      onClick(button, () => {
        if (busy) return;
        const action = button.dataset.testAction;
        if (action === 'cycle') {
          room = new Room(1, journey.definition, 5, journey.loadout, journey.build);
          journey.room = room;
          room.hero = [2, 1]; room.health = 5; room.actions = 5;
          room.enemies = [
            { id: 0, kind: 'sprout', position: [2, 2], health: 3, maxHealth: 3 },
            { id: 1, kind: 'stump', position: [3, 2], health: 2, maxHealth: 2, facing: 'south' },
            { id: 2, kind: 'stump', position: [1, 2], health: 2, maxHealth: 2, facing: 'south', skillIndex: 1 },
            { id: 3, kind: 'stump', position: [4, 4], health: 3, maxHealth: 3, facing: 'south', elite: true }
          ];
          const pool = deckForBuild(room.loadout, room.build);
          room.hand = loadouts[room.loadout].map(id => {
            let index = pool.findIndex(ref => cardKind(ref) === id && Boolean(room.build.engravings[ref]));
            if (index < 0) index = pool.indexOf(id);
            return pool.splice(index, 1)[0];
          });
          if (room.loadout === 'rogue') room.hand.push('knife');
          room.deck = pool;
          room.shuffle(room.deck); room.discard = [];
          room.knives = room.loadout === 'rogue' ? [[0, 1], [2, 2]] : [];
          loadRoom();
        } else if (action === 'opening' || action === 'guard' || action === 'elite' || action === 'boss') {
          journey = session.startNewJourney();
          const stage = action === 'opening' ? 0 : action === 'guard' ? 2 : action === 'elite' ? 4 : journey.total - 1;
          for (let index = 0; index < stage; index++) {
            journey.room.enemies = [];
            journey.room.hero = [...journey.exit];
            journey.advance();
          }
          loadRoom();
        } else if (action === 'charge' && journey.loadout !== 'basic') {
          if (journey.loadout === 'qinghe') for (let index = 0; index < 4; index++) journey.gainDawnCharge();
          else {
            journey.gainAssassination(true);
            journey.gainAssassination(true);
          }
          render();
        } else if (action === 'hand' && !room.finished) {
          const result = room.drawCards(Math.max(0, HAND_LIMIT - room.hand.length));
          render();
          if (result.drawn.length) lockWhileCardsEnter(result.drawn.length);
        } else if (action === 'card' && !room.finished) {
          const result = room.drawCards(1);
          render();
          if (result.overflowed[0]) showOverflowFeedback(result.overflowed[0]);
          if (result.drawn.length) lockWhileCardsEnter(1);
        } else if (action === 'energy' && !room.finished) {
          room.actions = Math.min(5, room.actions + 1);
          render();
        } else if (action === 'health' && !room.finished) {
          room.health = 1;
          render();
        }
      });
    }
  }
  onClick($('open-battle-help'), () => { renderSoundToggle(); renderJourneyProgress(); renderBattleRules(); help.showModal(); });
  onClick($('close-battle-help'), () => help.close());
  onClick(soundToggle, () => { setSoundEnabled(!soundEnabled()); renderSoundToggle(); });
  onClick(elements.end, () => exploring() ? redrawExplorationCard() : enemyTurn());
  elements.actions.addEventListener('pointerenter', () => {
    if (!touchLayout() && journey.loadout !== 'basic') showUltimateHint();
  });
  elements.actions.addEventListener('pointerleave', () => {
    if (!touchLayout()) render();
  });
  elements.actions.addEventListener('pointerdown', (event) => {
    if (!touchLayout() || event.pointerType !== 'touch' || journey.loadout === 'basic') return;
    ultimateHeld = false;
    clearTimeout(ultimateHoldTimer);
    ultimateHoldTimer = window.setTimeout(() => {
      ultimateHeld = true;
      showUltimateHint();
    }, 420);
  });
  for (const eventName of ['pointerup', 'pointercancel'] as const)
    elements.actions.addEventListener(eventName, () => clearTimeout(ultimateHoldTimer));
  onClick(elements.actions, () => {
    if (ultimateHeld) {
      ultimateHeld = false;
      return;
    }
    if (busy || journey.loadout === 'basic') return;
    if (exploring()) {
      showUltimateHint();
      return;
    }
    if (journey.ultimateCharge < journey.ultimateThreshold) {
      showUltimateHint();
      return;
    }
    if (ultimateTargeting) {
      ultimateTargeting = false;
      hoveredTile = null;
      hoveredEnemy = -1;
      render();
    } else void beginUltimate();
  });
  onClick($('replay'), () => {
    if (!room.finished || elements.result.hidden) return;
    reset();
  });
  function leave() {
    deckViewer.close();
    help.close();
    inspectedEnemy = -1;
    inspectedTile = null;
    closeCardDetails();
    selected = -1;
    ultimateTargeting = false;
    hoveredTile = null;
    hoveredEnemy = -1;
    elements.hint.textContent = '';
    elements.result.hidden = true;
    elements.game.inert = false;
    render();
  }
  onClick($('back-home'), onHome);
  onClick($('result-home'), onHome);
  document.addEventListener('pointerdown', (event) => {
    if (elements.cardDetails.hidden || root.hidden || !(event.target instanceof Element) || event.target.closest('#card-details')) return;
    closeCardDetails();
    dismissDetailsClick = true;
    event.stopPropagation();
  }, true);
  document.addEventListener('click', (event) => {
    if (!dismissDetailsClick) return;
    dismissDetailsClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  document.addEventListener('pointerdown', (event) => {
    if (
      event.button !== 0 ||
      busy ||
      root.hidden ||
      (event.target instanceof Element && event.target.closest('button, dialog, .board-shell, .modal'))
    )
      return;
    selected = -1;
    inspectedEnemy = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    elements.hint.textContent = '';
    render();
  });
  journey = session.journey;
  renderSoundToggle();
  loadRoom();
  return {
    root,
    canLeave: () => !busy,
    leave,
    enter() {
      const next = session.enterJourney();
      if (journey !== next) {
        journey = next;
        loadRoom();
      }
      const heroImage = actor('hero').querySelector('img')!;
      heroImage.src = characters[session.characterId].image;
      heroImage.alt = characters[session.characterId].name;
      elements.ghost.querySelector<HTMLImageElement>('img')!.src = characters[session.characterId].image;
      render();
      if (room.won) showResult();
    }
  };
}
