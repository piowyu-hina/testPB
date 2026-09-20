import { Room, data, equal } from '../battle/Room';
import { Journey } from '../battle/Journey';
import { heroArt, enemyArt } from '../data/art';
import type { Point, CardDefinition } from '../types/game';
import { element as $, onClick } from '../ui/dom';
import { place, animate, pause, travel } from '../ui/animations';
import { diagram } from '../ui/cardDiagram';

export function mountBattle(onHome: () => void) {
  const elements = {
    game: $('game'),
    board: $('board'),
    tiles: $('tiles'),
    actors: $('actors'),
    hand: $('hand'),
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
    seed = 1,
    selected = -1,
    hoveredTile: Point | null = null,
    hoveredEnemy = -1,
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
            '<svg id="room-exit" class="exit-door" viewBox="0 0 64 64" aria-hidden="true" hidden><path class="door-frame" d="M12 55V25a20 20 0 0 1 40 0v30H12Z"/><path class="door-interior" d="M21 53V25a11 11 0 0 1 22 0v28Z"/><path class="door-step" d="M9 55h46v6H9Z"/><path class="door-arrow" d="M32 44V25m-7 7 7-7 7 7"/></svg>'
          );
        }
        tile.addEventListener('pointerenter', () => {
          if (busy || (room.finished && !exploring())) return;
          hoveredTile = [x, y];
          hoveredEnemy = room.at(hoveredTile)?.id ?? -1;
          const enemy = room.at(hoveredTile);
          elements.hint.textContent =
            enemy && selected < 0
              ? `${enemy.elite ? '精英・' : ''}${data.enemies[enemy.kind].name} · ${data.enemies[enemy.kind].hint}${enemy.elite ? ' · 2 傷害' : ''}`
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
        onClick(tile, () => (exploring() ? walk([x, y]) : move([x, y])));
        elements.tiles.append(tile);
        tiles.push({ tile, threats, point: [x, y] });
      }
  }
  function syncHand() {
    const signature = room.availableCards.join(',');
    if (signature !== handSignature) {
      handSignature = signature;
      elements.hand.replaceChildren();
      room.availableCards.forEach((id, index) => {
        const definition: CardDefinition = data.cards[id],
          card = document.createElement('button');
        card.type = 'button';
        card.tabIndex = -1;
        card.className = 'card';
        card.dataset.card = id;
        card.dataset.index = String(index);
        card.setAttribute('aria-label', definition.name);
        card.innerHTML = diagram(definition);
        const label = document.createElement('span');
        label.className = 'card-name';
        label.textContent = definition.name;
        card.append(label);
        card.addEventListener('pointerenter', () => {
          if (!busy)
            elements.hint.textContent =
              definition.name + (definition.hint ? ` · ${definition.hint}` : '');
        });
        card.addEventListener('pointerleave', () => {
          elements.hint.textContent = '';
        });
        onClick(card, () => {
          if (busy || (!exploring() && (room.finished || room.actions <= 0))) return;
          selected = selected === index ? -1 : index;
          hoveredTile = null;
          hoveredEnemy = -1;
          render();
        });
        elements.hand.append(card);
      });
    }
    [...elements.hand.querySelectorAll<HTMLButtonElement>('.card')].forEach((card, index) => {
      card.classList.toggle('selected', index === selected);
      card.setAttribute('aria-pressed', String(index === selected));
      card.disabled = busy || (!exploring() && (room.finished || room.actions <= 0));
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
            ? { destination: hoveredTile, removedId: -1, damage: 0 }
            : null
          : room.preview(selected, hoveredTile)
        : null;
    const removedId = preview?.removedId ?? -1;
    const focus = !preview ? room.enemies.find((e) => e.id === hoveredEnemy) : null;
    const cleared = exploring();
    $('room-exit').toggleAttribute('hidden', !cleared);
    elements.game.classList.toggle('exploring', cleared);
    for (const { tile, threats, point } of tiles) {
      const damage = room.damageAt(point, removedId),
        legal =
          !busy && (cleared ? room.canExplore(selected, point) : room.canMove(selected, point));
      tile.classList.toggle('odd', (point[0] + point[1]) % 2 === 1);
      tile.classList.toggle('danger', damage > 0);
      tile.classList.toggle('legal', legal);
      tile.classList.toggle('capture', legal && Boolean(room.at(point)));
      tile.classList.toggle('landing', Boolean(preview && equal(point, preview.destination)));
      tile.classList.toggle('focus-threat', Boolean(focus && Room.threatens(focus, point)));
      tile.classList.toggle('exit-tile', cleared && equal(point, journey.exit));
      tile.disabled = busy || (room.finished && !cleared);
      const enemy = room.at(point);
      tile.setAttribute(
        'aria-label',
        `${point[0] + 1},${point[1] + 1}${enemy ? ` ${data.enemies[enemy.kind].name}` : ''}${damage ? `，${damage} 傷害` : ''}${legal ? '，可移動' : ''}`
      );
      if (cleared)
        tile.setAttribute(
          'aria-label',
          equal(point, journey.exit) ? '走向出口' : `走到 ${point[0] + 1},${point[1] + 1}`
        );
      if (threats.childElementCount !== damage)
        threats.innerHTML = '<i class="threat"></i>'.repeat(damage);
    }
    for (const enemy of room.enemies) {
      const sprite = actor(enemy.id);
      place(sprite, enemy.position);
      sprite.classList.toggle('victim-preview', enemy.id === removedId);
      sprite.classList.toggle('hovered', enemy.id === hoveredEnemy && !busy);
      const health = sprite.querySelector('.boss-health');
      if (health) {
        health.innerHTML = Array.from({ length: 2 }, (_, i) => `<i class="${i < (enemy.health ?? 2) ? '' : 'empty'}"></i>`).join('');
        health.setAttribute('aria-label', `${enemy.health} / 2`);
      }
    }
    place(actor('hero'), room.hero);
    actor('hero').classList.toggle('origin-preview', Boolean(preview));
    elements.ghost.hidden = !preview;
    if (preview) place(elements.ghost, preview.destination);
    renderHealth(room.finished || busy ? 0 : preview ? preview.damage : room.damageAt(room.hero));
    elements.actions.innerHTML = Array.from(
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
    elements.game.classList.toggle('choosing', selected >= 0 && !busy);
    elements.game.setAttribute('aria-busy', String(busy));
    syncHand();
  }
  function lock() {
    busy = true;
    selected = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    elements.hint.textContent = '';
    elements.ghost.hidden = true;
    for (const actor of actors.values())
      actor.classList.remove('origin-preview', 'victim-preview', 'hovered');
    elements.end.disabled = true;
    $<HTMLButtonElement>('back-home').disabled = true;
    elements.game.classList.remove('choosing');
    for (const { tile } of tiles) {
      tile.disabled = true;
      tile.classList.remove('legal', 'landing', 'focus-threat', 'capture');
    }
    for (const card of elements.hand.querySelectorAll<HTMLButtonElement>('.card')) {
      card.disabled = true;
      card.classList.remove('selected');
    }
    elements.game.setAttribute('aria-busy', 'true');
  }
  async function move(destination: Point) {
    if (busy || !room.canMove(selected, destination)) return;
    const action = room.move(selected, destination);
    if (!action) return;
    lock();
    // Keep the visible board stable until the movement and impact complete.
    await travel(actor('hero'), action.from, action.to, action.kind === 'leap' ? 30 : 9);
    if (action.hitId !== undefined && action.removedId < 0) {
      await animate(actor(action.hitId), [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], 120);
      await travel(actor('hero'), action.to, action.from, 9);
    }
    if (action.removedId >= 0) {
      const victim = actor(action.removedId);
      await animate(
        victim,
        [
          { opacity: 1, scale: 1 },
          { opacity: 0, scale: 1.17 }
        ],
        130
      );
      victim.remove();
      actors.delete(action.removedId);
    }
    if (room.finished) {
      busy = false;
      render();
      showResult();
      return;
    }
    if (room.actions === 0) {
      await pause(180);
      await enemyTurn(true);
    } else {
      busy = false;
      render();
    }
  }
  async function walk(destination: Point) {
    if (busy || !exploring()) return;
    const action = room.explore(selected, destination);
    if (!action) return;
    lock();
    await travel(actor('hero'), action.from, action.to, action.kind === 'leap' ? 30 : 9);
    if (equal(destination, journey.exit)) {
      await animate(
        elements.board,
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(12px)' }
        ],
        220
      );
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
      renderHealth();
      await animate(
        actor('hero'),
        [
          { transform: 'translate(-50%, -50%)', filter: 'none' },
          { transform: 'translate(calc(-50% - 4px), -50%)', filter: 'sepia(1) saturate(3)' },
          { transform: 'translate(calc(-50% + 4px), -50%)' },
          { transform: 'translate(-50%, -50%)', filter: 'none' }
        ],
        200
      );
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
  }
  function showResult() {
    if (exploring()) return;
    elements.resultTitle.textContent = room.lost
      ? '再試一次'
      : journey.won
        ? '旅途完成！'
        : '房間通過';
    $('replay').textContent = '再來一局';
    elements.result.hidden = false;
    elements.game.inert = true;
  }
  function reset() {
    journey = new Journey(seed++);
    loadRoom();
  }
  function loadRoom() {
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
    makeActor('hero', heroArt.image, heroArt.name, true);
    elements.ghost.querySelector<HTMLImageElement>('img')!.src = heroArt.image;
    render();
  }
  elements.ghost.querySelector<HTMLImageElement>('img')!.src = heroArt.image;
  makeTiles();
  onClick(elements.end, () => enemyTurn());
  onClick($('replay'), () => {
    if (!room.finished || elements.result.hidden) return;
    reset();
  });
  function leave() {
    if (busy) return;
    selected = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    elements.hint.textContent = '';
    elements.result.hidden = true;
    elements.game.inert = false;
    render();
    onHome();
  }
  onClick($('back-home'), leave);
  onClick($('result-home'), leave);
  document.addEventListener('pointerdown', (event) => {
    if (
      event.button !== 0 ||
      busy ||
      elements.game.hidden ||
      (event.target instanceof Element && event.target.closest('button, .board-shell, .modal'))
    )
      return;
    selected = -1;
    hoveredTile = null;
    hoveredEnemy = -1;
    elements.hint.textContent = '';
    render();
  });
  reset();
  return {
    enter() {
      if (journey.finished) reset();
      const heroImage = actor('hero').querySelector('img')!;
      heroImage.src = heroArt.image;
      heroImage.alt = heroArt.name;
      elements.ghost.querySelector<HTMLImageElement>('img')!.src = heroArt.image;
      render();
      if (room.won) showResult();
    },
    canResume: () => !journey.finished
  };
}
