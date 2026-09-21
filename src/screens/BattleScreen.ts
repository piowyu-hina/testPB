import { Room, data, equal } from '../battle/Room';
import type { Journey } from '../battle/Journey';
import { characters, enemyArt } from '../data/art';
import type { Point, CardDefinition } from '../types/game';
import { element, mountScreenRoot, onClick } from '../ui/dom';
import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import template from './battle.html?raw';
import { place, animate, pause, travel } from '../ui/animations';
import { diagram } from '../ui/cardDiagram';
import { cardArt } from '../data/cardArt';
import { daggerIcon, groundDaggerIcon } from '../ui/dagger';
import { approach, shield, recoil } from '../ui/battleFeedback';
import { enemySkill, blocksAttack } from '../battle/EnemyRules';
import { enemySummary, renderEnemyInfo } from '../ui/enemyInfo';
import '../enemy.css';

export function mountBattle(host: HTMLElement, session: GameSession, onHome: () => void): Screen {
  const root = mountScreenRoot(host, template);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => element<T>(id, root);
  const elements = {
    game: $('game'),
    board: $('board'),
    tiles: $('tiles'),
    actors: $('actors'),
    hand: $('hand'),
    bonusHand: $('bonus-hand'),
    health: $('health'),
    actions: $('actions'),
    hint: $('hint'),
    turn: $('turn'),
    end: $<HTMLButtonElement>('end-turn'),
    endLabel: $('end-label'),
    ghost: $('ghost'),
    result: $('result'),
    resultTitle: $('result-title')
  };
  const heart =
    '<svg class="heart" viewBox="0 0 32 30" aria-hidden="true"><path d="M16 27C12 23 2 16 2 9C2 1 12-1 16 6C20-1 30 1 30 9C30 16 20 23 16 27Z"/></svg>';
  let journey: Journey,
    room: Room,
    selected = -1,
    hoveredTile: Point | null = null,
    hoveredEnemy = -1,
    inspectedEnemy = -1,
    busy = false,
    handSignature = '';
  const tiles: { tile: HTMLButtonElement; threats: HTMLSpanElement; point: Point }[] = [];
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
        const threats = document.createElement('span');
        threats.className = 'threats';
        threats.setAttribute('aria-hidden', 'true');
        tile.append(threats);
        if (x === 2 && y === 4) {
          tile.insertAdjacentHTML(
            'beforeend',
            '<svg id="room-exit" class="exit-door" viewBox="0 0 64 64" aria-hidden="true" hidden><path class="door-frame" d="M12 55V25a20 20 0 0 1 40 0v30H12Z"/><path class="door-interior" d="M21 53V25a11 11 0 0 1 22 0v28Z"/><path class="door-step" d="M9 55h46v6H9Z"/></svg>'
          );
        }
        tile.addEventListener('pointerenter', () => {
          if (busy || (room.finished && !exploring())) return;
          hoveredTile = [x, y];
          hoveredEnemy = room.at(hoveredTile)?.id ?? -1;
          const enemy = room.at(hoveredTile);
          elements.hint.textContent =
            enemy && selected < 0
              ? enemySummary(enemy)
              : '';
          render();
        });
        tile.addEventListener('pointerleave', () => {
          if (hoveredTile && equal(hoveredTile, [x, y])) {
            hoveredTile = null;
            hoveredEnemy = -1;
            elements.hint.textContent = '';
            render();
          }
        });
        onClick(tile, () => {
          if (busy) return;
          const enemy = room.at([x, y]);
          if (enemy && selected < 0) {
            inspectedEnemy = enemy.id;
            render();
          } else if (exploring()) walk([x, y]);
          else move([x, y]);
        });
        elements.tiles.append(tile);
        tiles.push({ tile, threats, point: [x, y] });
      }
  }
  function syncHand() {
    const signature = room.availableCards.join(',');
    if (signature !== handSignature) {
      handSignature = signature;
      elements.hand.replaceChildren();
      elements.bonusHand.replaceChildren();
      room.availableCards.forEach((id, index) => {
        const definition: CardDefinition = data.cards[id],
          card = document.createElement('button');
        card.type = 'button';
        card.tabIndex = -1;
        card.className = 'card';
        card.dataset.card = id;
        card.dataset.index = String(index);
        card.setAttribute('aria-label', definition.name);
        const illustration = id === 'forward' && room.loadout !== 'rogue' ? undefined : cardArt[id];
        if (illustration) {
          const image = document.createElement('img');
          image.className = 'card-art';
          image.src = illustration;
          image.alt = '';
          image.draggable = false;
          card.append(image);
        } else card.innerHTML = diagram(definition);
        const label = document.createElement('span');
        label.className = 'card-name';
        label.textContent = definition.name;
        card.append(label);
        if (!exploring()) {
          const cost = document.createElement('small');
          cost.className = 'card-cost';
          cost.textContent = id === 'knife' ? '0 行動 · 本回合' : '1 行動';
          card.append(cost);
        }
        card.addEventListener('pointerenter', () => {
          if (!busy)
            elements.hint.textContent =
              definition.name + (definition.hint ? ` · ${definition.hint}` : '');
        });
        card.addEventListener('pointerleave', () => {
          render();
        });
        onClick(card, () => {
          if (busy || (!exploring() && !room.canUseCard(index))) return;
          selected = selected === index ? -1 : index;
          inspectedEnemy = -1;
          hoveredTile = null;
          hoveredEnemy = -1;
          render();
        });
        (id === 'knife' && !exploring() ? elements.bonusHand : elements.hand).append(card);
      });
      elements.hand.append(elements.bonusHand);
    }
    elements.bonusHand.hidden = exploring() || !room.hand.includes('knife');
    elements.hand.style.setProperty('--hand-slots', String(Math.max(3, room.availableCards.length)));
    [...root.querySelectorAll<HTMLButtonElement>('.card')].forEach((card) => {
      const index = Number(card.dataset.index);
      card.classList.toggle('selected', index === selected);
      card.setAttribute('aria-pressed', String(index === selected));
      card.disabled = busy || (!exploring() && !room.canUseCard(index));
    });
  }
  function renderHealth(incoming = 0) {
    elements.health.innerHTML = heart.repeat(5);
    [...elements.health.children].forEach((node, index) => {
      node.classList.toggle('empty', index >= room.health);
      node.classList.toggle('forecast', index < room.health && index >= room.health - incoming);
    });
    elements.health.setAttribute(
      'aria-label',
      `生命 ${room.health} / 5${incoming ? `，預計受到 ${incoming} 傷害` : ''}`
    );
  }
  function render() {
    if (!room) return;
    const preview =
      !busy && hoveredTile
        ? exploring()
          ? room.canExplore(selected, hoveredTile)
            ? { destination: hoveredTile, removedId: -1, damage: 0, blocked: false }
            : null
          : room.preview(selected, hoveredTile)
        : null;
    const removedId = preview?.removedId ?? -1;
    const focusedEnemy = room.enemies.find((e) => e.id === (hoveredEnemy >= 0 ? hoveredEnemy : inspectedEnemy));
    const focus = !preview ? focusedEnemy : null;
    renderEnemyInfo($('enemy-info'), !busy && !room.finished ? focusedEnemy : undefined);
    const cleared = exploring();
    const chosenId = room.availableCards[selected];
    const chosen = chosenId ? data.cards[chosenId] : undefined;
    if (!busy) {
      if (preview?.blocked) elements.hint.textContent = `正面格擋：無傷害，仍消耗卡片與 ${room.cardCost(selected)} 次行動。`;
      else if (cleared) elements.hint.textContent = chosen
        ? `${chosen.name}：點亮起的格子，走向上方出口 · 不消耗行動`
        : '清場完成！選「前進」走向上方出口 · 下一間恢復 1 點生命';
      else if (preview) elements.hint.textContent = `${chosenId === 'throw' ? '原地投擲 · ' : chosenId === 'whirl' ? `瞬移落刀 · 掃擊 ${preview.hits?.length ?? 0} 隻 · ` : ''}${preview.hits ? `${preview.hits.filter(hit => hit.removed).length} 隻擊敗 · ` : preview.removedId >= 0 ? '擊敗怪物 · ' : ''}落點受擊預告：${preview.damage} 傷害${preview.damage >= room.health ? ' · 致命' : ''}${chosenId !== 'throw' && room.hasKnife(preview.destination) ? ' · 回收小刀、行動 +1、抽 1 張' : ''}`;
      else if (chosen) {
        const hasMove = tiles.some(({ point }) => room.canMove(selected, point));
        elements.hint.textContent = `${chosen.name} · ${chosen.hint} · ${hasMove ? chosenId === 'whirl' ? '點地上的刀發動' : '點亮起的格子移動' : '目前無可用目標，請換牌'} · 再點此牌取消`;
      } else if (focusedEnemy) elements.hint.textContent = enemySummary(focusedEnemy);
      else elements.hint.textContent = room.finished ? '' : '先選一張牌，再點亮起的格子 · 點怪物可查看技能';
    }
    const endDamage = room.finished ? 0 : room.damageAt(room.hero);
    $('end-forecast').textContent = busy || room.finished ? '' : `留在原地受 ${endDamage} 傷害${endDamage >= room.health ? ' · 致命' : ''}`;
    $('room-exit').toggleAttribute('hidden', !cleared);
    elements.game.classList.toggle('exploring', cleared);
    for (const { tile, threats, point } of tiles) {
      const damage = room.damageAt(point, preview?.hits ? preview.hits.filter(hit => hit.removed).map(hit => hit.id) : removedId),
        legal =
          !busy && (cleared ? room.canExplore(selected, point) : room.canMove(selected, point));
      tile.classList.toggle('odd', (point[0] + point[1]) % 2 === 1);
      tile.classList.toggle('danger', damage > 0);
      tile.classList.toggle('legal', legal);
      tile.classList.toggle('inspectable', !busy && !room.finished && selected < 0 && Boolean(room.at(point)));
      tile.classList.toggle('capture', legal && Boolean(room.at(point)));
      tile.classList.toggle('whirl-range', chosenId === 'whirl' && Boolean(preview) && Math.max(Math.abs(point[0] - preview!.destination[0]), Math.abs(point[1] - preview!.destination[1])) === 1);
      tile.classList.toggle('blocked', legal && Boolean(room.at(point) && blocksAttack(room.at(point)!, room.hero)));
      tile.classList.toggle('landing', Boolean(preview && equal(point, chosenId === 'throw' ? hoveredTile! : preview.destination)));
      tile.classList.toggle('focus-threat', Boolean(focus && Room.threatens(focus, point)));
      tile.classList.toggle('exit-tile', cleared && equal(point, journey.exit));
      tile.disabled = busy || (room.finished && !cleared);
      const enemy = room.at(point);
      tile.setAttribute(
        'aria-label',
        `${point[0] + 1},${point[1] + 1}${enemy ? ` ${enemySummary(enemy)}` : ''}${damage ? `，${damage} 傷害` : ''}${legal ? chosenId === 'whirl' ? '，瞬移到此刀並發動迴旋斬' : '，可移動' : ''}`
      );
      if (cleared)
        tile.setAttribute(
          'aria-label',
          equal(point, journey.exit) ? '走向出口' : `走到 ${point[0] + 1},${point[1] + 1}`
        );
      if (threats.childElementCount !== damage)
        threats.innerHTML = '<i class="threat"></i>'.repeat(damage);
      tile.classList.toggle('has-knife', room.hasKnife(point));
    }
    $('ground-knives').replaceChildren();
    for (const point of room.knives) {
      const token = document.createElement('div');
      token.className = 'ground-knife';
      token.classList.toggle('occupied', room.enemies.some(enemy => equal(enemy.position, point)));
      token.dataset.point = point.join(',');
      token.innerHTML = groundDaggerIcon;
      token.title = '飛刀：走到此格回收一張本回合免費小刀';
      place(token, point);
      $('ground-knives').append(token);
    }
    for (const enemy of room.enemies) {
      const sprite = actor(enemy.id);
      place(sprite, enemy.position);
      sprite.classList.toggle('victim-preview', preview?.hits ? preview.hits.some(hit => hit.id === enemy.id && hit.removed) : enemy.id === removedId);
      sprite.classList.toggle('hovered', enemy.id === hoveredEnemy && !busy);
      const skill = enemySkill(enemy);
      sprite.dataset.skill = skill.id;
      sprite.dataset.facing = enemy.facing ?? 'south';
      const health = sprite.querySelector('.boss-health');
      if (health) {
        health.innerHTML = Array.from({ length: 2 }, (_, i) => `<i class="${i < (enemy.health ?? 2) ? '' : 'empty'}"></i>`).join('');
        health.setAttribute('aria-label', `${enemy.health} / 2`);
      }
    }
    place(actor('hero'), room.hero);
    actor('hero').classList.toggle('origin-preview', Boolean(preview && chosenId !== 'throw'));
    elements.ghost.hidden = !preview || chosenId === 'throw';
    if (preview) place(elements.ghost, preview.destination);
    renderHealth(room.finished || busy ? 0 : preview ? preview.damage : room.damageAt(room.hero));
    elements.actions.innerHTML = `<small>行動 ${room.actions}/2</small>` + Array.from(
      { length: 2 },
      (_, i) => `<span class="action-pip${i >= room.actions || busy ? ' empty' : ''}"></span>`
    ).join('');
    elements.actions.setAttribute('aria-label', `剩餘 ${room.actions} 次行動`);
    elements.turn.textContent = cleared ? '' : `第 ${room.turn} 回合`;
    const progress = $('journey-progress');
    progress.setAttribute(
      'aria-label',
      `第 ${journey.stage + 1} / ${journey.total} 間 · ${journey.definition.name}`
    );
    progress.title = `第 ${journey.stage + 1} / ${journey.total} 間 · ${journey.definition.name}`;
    progress.innerHTML = Array.from(
      { length: journey.total },
      (_, i) =>
        `<span class="room-step${i < journey.stage ? ' complete' : ''}${i === journey.stage ? ' current' : ''}" ${i === journey.stage ? 'aria-current="step"' : ''}>${i + 1}</span>`
    ).join('');
    elements.end.disabled = busy || room.finished;
    $<HTMLButtonElement>('back-home').disabled = busy;
    $<HTMLButtonElement>('open-battle-help').disabled = busy;
    elements.game.classList.toggle('choosing', selected >= 0 && !busy);
    elements.game.setAttribute('aria-busy', String(busy));
    syncHand();
  }
  function lock() {
    busy = true;
    selected = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    inspectedEnemy = -1;
    $('enemy-info').hidden = true;
    elements.hint.textContent = '';
    elements.ghost.hidden = true;
    for (const actor of actors.values())
      actor.classList.remove('origin-preview', 'victim-preview', 'hovered');
    elements.end.disabled = true;
    $<HTMLButtonElement>('back-home').disabled = true;
    $<HTMLButtonElement>('open-battle-help').disabled = true;
    $('end-forecast').textContent = '';
    elements.game.classList.remove('choosing');
    for (const { tile } of tiles) {
      tile.disabled = true;
      tile.classList.remove('legal', 'landing', 'focus-threat', 'capture', 'blocked', 'whirl-range');
    }
    for (const card of root.querySelectorAll<HTMLButtonElement>('.card')) {
      card.disabled = true;
      card.classList.remove('selected');
    }
    elements.game.setAttribute('aria-busy', 'true');
  }
  async function move(destination: Point) {
    if (busy || !room.canMove(selected, destination)) return;
    const blocked = room.preview(selected, destination)?.blocked ?? false;
    const action = room.move(selected, destination);
    if (!action) return;
    lock();
    if (action.pickedKnife)
      $('ground-knives').querySelector(`[data-point="${action.to.join(',')}"]`)?.remove();
    // Keep the visible board stable until the movement and impact complete.
    const thrown = action.kind === 'throw';
    const stationary = action.kind === 'whirl';
    const resisted = !thrown && !stationary && action.hitId !== undefined && action.removedId < 0;
    const contact = resisted
      ? await approach(actor('hero'), action.from, action.to, action.kind === 'leap')
      : action.to;
    if (action.kind === 'whirl') {
      await animate(actor('hero'), [
        { opacity: 1, scale: 1 },
        { opacity: 0, scale: 0.8 }
      ], 110, 'ease-in');
      place(actor('hero'), action.to);
      await animate(actor('hero'), [
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1 }
      ], 110, 'ease-out');
      const effect = document.createElement('div');
      effect.className = 'whirl-effect';
      effect.setAttribute('aria-hidden', 'true');
      effect.innerHTML = '<svg viewBox="0 0 120 120"><path d="M12 54C27 18 79 17 108 47C78 31 43 34 12 54Z"/><path d="M108 66C92 103 41 103 12 76C41 91 78 85 108 66Z"/></svg>';
      actor('hero').append(effect);
      try {
        await animate(effect.firstElementChild!, [
          { opacity: 0, transform: 'rotate(-90deg) scale(.8)' },
          { opacity: 1, transform: 'rotate(80deg) scale(1)', offset: 0.2 },
          { opacity: 1, transform: 'rotate(250deg) scale(1)', offset: 0.72 },
          { opacity: 0, transform: 'rotate(310deg) scale(1.05)' }
        ], 420, 'ease-out');
      } finally { effect.remove(); }
      const hits = action.hits ?? [];
      elements.hint.textContent = `${hits.filter(hit => !hit.blocked).length} 隻命中${hits.some(hit => hit.blocked) ? ' · 有怪物格擋' : ''}`;
      await Promise.all(hits.map(async hit => {
        const target = actor(hit.id);
        const point = room.enemies.find(enemy => enemy.id === hit.id)?.position ?? action.from;
        if (hit.blocked) await shield(elements.board, point);
        else if (!hit.removed) await recoil(target, action.from, point);
        const health = target.querySelector('.boss-health');
        const enemy = room.enemies.find(enemy => enemy.id === hit.id);
        if (health && enemy) [...health.children].forEach((pip, i) => pip.classList.toggle('empty', i >= (enemy.health ?? 1)));
        if (hit.removed) { target.remove(); actors.delete(hit.id); }
      }));
    } else if (thrown) {
      const projectile = document.createElement('div');
      projectile.className = 'knife-projectile';
      projectile.innerHTML = daggerIcon;
      elements.board.append(projectile);
      try { await travel(projectile, action.from, action.to, 0); }
      finally { projectile.remove(); }
    } else if (!resisted && !stationary) await travel(actor('hero'), action.from, action.to, action.kind === 'leap' ? 30 : 9);
    if (action.kind !== 'whirl' && action.hitId !== undefined) {
      elements.hint.textContent = blocked ? '正面格擋 · 這次攻擊沒有造成傷害' : action.removedId >= 0 ? '擊敗怪物' : '命中 · 怪物生命 −1';
      if (blocked) await shield(elements.board, action.to);
      else if (action.removedId < 0) await recoil(actor(action.hitId), action.from, action.to);
    }
    if (action.hitId !== undefined && action.removedId < 0) {
      const enemy = room.enemies.find(enemy => enemy.id === action.hitId);
      const health = actor(action.hitId).querySelector('.boss-health');
      if (health && enemy) [...health.children].forEach((pip, i) => pip.classList.toggle('empty', i >= (enemy.health ?? 1)));
      if (!thrown && !stationary) await travel(actor('hero'), contact, action.from, 0);
    }
    if (action.kind !== 'whirl' && action.removedId >= 0) {
      const victim = actor(action.removedId);
      await pause(80);
      victim.remove();
      actors.delete(action.removedId);
    }
    if (room.finished) {
      busy = false;
      render();
      showResult();
      return;
    }
    if (!room.hasPlayableCard() && !room.hand.includes('knife')) {
      await pause(180);
      await enemyTurn(true);
    } else {
      busy = false;
      render();
      if (action.pickedKnife) {
        elements.hint.textContent = `撿回小刀 · 行動 +1 · ${action.drawn ? `抽到${data.cards[action.drawn].name}` : '牌堆已空'}`;
        await animate(elements.actions, [
          { transform: 'scale(1)' },
          { transform: 'scale(1.22)', offset: 0.4 },
          { transform: 'scale(1)' }
        ], 320);
      }
    }
  }
  async function walk(destination: Point) {
    if (busy || !exploring()) return;
    const action = room.explore(selected, destination);
    if (!action) return;
    lock();
    await travel(actor('hero'), action.from, action.to, 9);
    if (equal(destination, journey.exit)) {
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
    busy = false;
    render();
  }
  async function enemyTurn(alreadyLocked = false) {
    if ((!alreadyLocked && busy) || room.finished) return;
    lock();
    elements.endLabel.textContent = '敵方回合';
    const outcome = room.endTurn();
    if (!outcome) {
      busy = false;
      render();
      return;
    }
    const cellPixels = elements.board.clientWidth / 5;
    await Promise.all(
      outcome.attacks.map((attack) => {
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
        outcome.motions.map((motion) => travel(actor(motion.id), motion.from, motion.to, 12))
      );
    }
    busy = false;
    elements.endLabel.textContent = '結束回合';
    render();
    if (room.finished) showResult();
    else if (!room.hasPlayableCard()) {
      await pause(180);
      await enemyTurn();
    }
  }
  function showResult() {
    if (exploring()) return;
    elements.resultTitle.textContent = room.lost ? '再試一次' : '旅途完成！';
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
    room = journey.room;
    selected = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    busy = false;
    handSignature = '';
    elements.result.hidden = true;
    elements.game.inert = false;
    elements.hint.textContent = '';
    elements.endLabel.textContent = '結束回合';
    elements.actors.replaceChildren();
    actors.clear();
    for (const enemy of room.enemies) {
      const sprite = makeActor(
        enemy.id,
        enemyArt[enemy.kind],
        `${enemy.elite ? '精英・' : ''}${data.enemies[enemy.kind].name}`
      );
      sprite.dataset.kind = enemy.kind;
      if (enemy.elite) {
        sprite.classList.add('elite');
        sprite.insertAdjacentHTML('beforeend', '<span class="boss-health"></span>');
        sprite.insertAdjacentHTML(
          'beforeend',
          '<svg class="elite-crown" viewBox="0 0 24 16" aria-hidden="true"><path d="M3 12 1 3l6 4L12 1l5 6 6-4-2 9ZM3 15h18"/></svg>'
        );
      }
    }
    makeActor('hero', characters[session.characterId].image, characters[session.characterId].name, true);
    elements.ghost.querySelector<HTMLImageElement>('img')!.src = characters[session.characterId].image;
    render();
  }
  makeTiles();
  const help = $<HTMLDialogElement>('battle-help');
  onClick($('open-battle-help'), () => help.showModal());
  onClick($('close-battle-help'), () => help.close());
  onClick($('enemy-info-close'), () => {
    inspectedEnemy = -1;
    hoveredEnemy = -1;
    render();
  });
  onClick(elements.end, () => enemyTurn());
  onClick($('replay'), () => {
    if (!room.finished || elements.result.hidden) return;
    reset();
  });
  function leave() {
    help.close();
    inspectedEnemy = -1;
    selected = -1;
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
    if (
      event.button !== 0 ||
      busy ||
      root.hidden ||
      (event.target instanceof Element && event.target.closest('button, dialog, .board-shell, .modal, .enemy-info'))
    )
      return;
    selected = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    elements.hint.textContent = '';
    render();
  });
  journey = session.journey;
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
      else if (!room.finished && !room.hasPlayableCard()) void enemyTurn();
    }
  };
}
