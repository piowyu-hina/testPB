(() => {
  'use strict';
  const { Room, data, equal } = window.TestPBRules;
  const $ = id => document.getElementById(id);
  const elements = { game: $('game'), board: $('board'), tiles: $('tiles'), actors: $('actors'), hand: $('hand'), health: $('health'), actions: $('actions'), hint: $('hint'), turn: $('turn'), end: $('end-turn'), endLabel: $('end-label'), ghost: $('ghost'), result: $('result'), resultTitle: $('result-title') };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const heart = '<svg class="heart" viewBox="0 0 32 30" aria-hidden="true"><path d="M16 27C12 23 2 16 2 9C2 1 12-1 16 6C20-1 30 1 30 9C30 16 20 23 16 27Z"/></svg>';
  let room, seed = 1, selected = -1, hoveredTile = null, hoveredEnemy = -1, busy = false, handSignature = '';
  const tiles = [], actors = new Map();
  const position = p => ({ left: `${p[0] * 20 + 10}%`, top: `${(4 - p[1]) * 20 + 10}%` });
  const place = (node, p) => Object.assign(node.style, position(p));
  // Game actions are pointer-only. Native keyboard activation does not spend a turn.
  const onClick = (node, action) => node.addEventListener('click', event => { if (event.detail > 0) action(event); });

  function makeActor(id, src, name, isHero = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `actor${isHero ? ' hero' : ''}`; wrapper.dataset.actor = id;
    const image = document.createElement('img'); image.src = src; image.alt = name; image.draggable = false;
    wrapper.append(image); elements.actors.append(wrapper); actors.set(id, wrapper); return wrapper;
  }
  function makeTiles() {
    for (let y = 4; y >= 0; y--) for (let x = 0; x < 5; x++) {
      const tile = document.createElement('button'); tile.type = 'button'; tile.tabIndex = -1;
      tile.className = 'tile'; tile.dataset.x = x; tile.dataset.y = y;
      const threats = document.createElement('span'); threats.className = 'threats'; threats.setAttribute('aria-hidden', 'true'); tile.append(threats);
      tile.addEventListener('pointerenter', () => {
        if (busy || room.finished) return;
        hoveredTile = [x, y]; hoveredEnemy = room.at(hoveredTile)?.id ?? -1;
        const enemy = room.at(hoveredTile);
        elements.hint.textContent = enemy && selected < 0 ? `${data.enemies[enemy.kind].name} · ${data.enemies[enemy.kind].hint}` : '';
        render();
      });
      tile.addEventListener('pointerleave', () => {
        if (hoveredTile && equal(hoveredTile, [x, y])) { hoveredTile = null; hoveredEnemy = -1; elements.hint.textContent = ''; render(); }
      });
      onClick(tile, () => move([x, y]));
      elements.tiles.append(tile); tiles.push({ tile, threats, point: [x, y] });
    }
  }
  function diagram(card) {
    // Grid extent follows data; arbitrary new offsets do not need a new illustration.
    const extent = Math.max(2, ...card.offsets.flat().map(Math.abs));
    const pitch = 92 / (extent * 2), center = 64;
    let marks = '';
    for (let y = extent; y >= -extent; y--) for (let x = -extent; x <= extent; x++) {
      const px = center + x * pitch, py = center - y * pitch + 4;
      if (!x && !y) marks += `<circle class="origin" cx="${px}" cy="${py}" r="6.5"/>`;
      else if (card.offsets.some(p => equal(p, [x, y]))) marks += `<rect class="destination" x="${px - 7.5}" y="${py - 7.5}" width="15" height="15" rx="3.5"/>`;
      else marks += `<circle class="dot" cx="${px}" cy="${py}" r="1.8"/>`;
    }
    return `<svg viewBox="0 0 128 136" aria-hidden="true">${marks}</svg>`;
  }
  function syncHand() {
    const signature = room.hand.join(',');
    if (signature !== handSignature) {
      handSignature = signature; elements.hand.replaceChildren();
      room.hand.forEach((id, index) => {
        const definition = data.cards[id], card = document.createElement('button');
        card.type = 'button'; card.tabIndex = -1; card.className = 'card'; card.dataset.card = id; card.dataset.index = index;
        card.setAttribute('aria-label', definition.name); card.innerHTML = diagram(definition);
        card.addEventListener('pointerenter', () => { if (!busy) elements.hint.textContent = definition.name + (definition.hint ? ` · ${definition.hint}` : ''); });
        card.addEventListener('pointerleave', () => { elements.hint.textContent = ''; });
        onClick(card, () => {
          if (busy || room.finished || room.actions <= 0) return;
          selected = selected === index ? -1 : index; hoveredTile = null; hoveredEnemy = -1; render();
        });
        elements.hand.append(card);
      });
    }
    [...elements.hand.children].forEach((card, index) => {
      card.classList.toggle('selected', index === selected); card.setAttribute('aria-pressed', String(index === selected));
      card.disabled = busy || room.finished || room.actions <= 0;
    });
  }
  function renderHealth(incoming = 0) {
    elements.health.innerHTML = heart.repeat(5);
    [...elements.health.children].forEach((node, index) => {
      node.classList.toggle('empty', index >= room.health);
      node.classList.toggle('forecast', index < room.health && index >= room.health - incoming);
    });
    elements.health.setAttribute('aria-label', `生命 ${room.health} / 5${incoming ? `，預計受到 ${incoming} 傷害` : ''}`);
  }
  function render() {
    if (!room) return;
    const preview = !busy && hoveredTile ? room.preview(selected, hoveredTile) : null;
    const removedId = preview?.removedId ?? -1;
    const focus = !preview ? room.enemies.find(e => e.id === hoveredEnemy) : null;
    for (const { tile, threats, point } of tiles) {
      const damage = room.damageAt(point, removedId), legal = !busy && room.canMove(selected, point);
      tile.classList.toggle('odd', (point[0] + point[1]) % 2 === 1);
      tile.classList.toggle('danger', damage > 0);
      tile.classList.toggle('legal', legal);
      tile.classList.toggle('landing', Boolean(preview && equal(point, preview.destination)));
      tile.classList.toggle('focus-threat', Boolean(focus && Room.threatens(focus, point)));
      tile.disabled = busy || room.finished;
      const enemy = room.at(point);
      tile.setAttribute('aria-label', `${point[0] + 1},${point[1] + 1}${enemy ? ` ${data.enemies[enemy.kind].name}` : ''}${damage ? `，${damage} 傷害` : ''}${legal ? '，可移動' : ''}`);
      if (threats.childElementCount !== damage) threats.innerHTML = '<i class="threat"></i>'.repeat(damage);
    }
    for (const enemy of room.enemies) {
      const actor = actors.get(enemy.id); place(actor, enemy.position);
      actor.classList.toggle('victim-preview', enemy.id === removedId);
      actor.classList.toggle('hovered', enemy.id === hoveredEnemy && !busy);
    }
    place(actors.get('hero'), room.hero);
    actors.get('hero').classList.toggle('origin-preview', Boolean(preview));
    elements.ghost.hidden = !preview; if (preview) place(elements.ghost, preview.destination);
    renderHealth(room.finished || busy ? 0 : preview ? preview.damage : room.damageAt(room.hero));
    elements.actions.innerHTML = Array.from({ length: 2 }, (_, i) => `<span class="action-pip${i >= room.actions || busy ? ' empty' : ''}"></span>`).join('');
    elements.actions.setAttribute('aria-label', `剩餘 ${room.actions} 次行動`);
    elements.turn.textContent = `第 ${room.turn} 回合`;
    elements.end.disabled = busy || room.finished;
    elements.game.setAttribute('aria-busy', String(busy));
    syncHand();
  }
  async function animate(node, keyframes, duration) {
    if (reducedMotion.matches) return;
    const animation = node.animate(keyframes, { duration, easing: 'ease-in-out' });
    try { await animation.finished; } catch (_) { /* Canceled animation is safe to finalize. */ }
  }
  const pause = ms => reducedMotion.matches ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, ms));
  async function travel(node, from, to, jump) {
    const start = position(from), end = position(to);
    place(node, to);
    await animate(node, [
      { ...start, transform: 'translate(-50%, -50%)' },
      { left: `${(from[0] + to[0]) * 10 + 10}%`, top: `${(8 - from[1] - to[1]) * 10 + 10}%`, transform: `translate(-50%, calc(-50% - ${jump}px))`, offset: .5 },
      { ...end, transform: 'translate(-50%, -50%)' }
    ], jump > 20 ? 270 : 210);
  }
  function lock() {
    busy = true; selected = -1; hoveredTile = null; hoveredEnemy = -1;
    elements.hint.textContent = ''; elements.ghost.hidden = true;
    for (const actor of actors.values()) actor.classList.remove('origin-preview', 'victim-preview', 'hovered');
    elements.end.disabled = true;
    for (const { tile } of tiles) { tile.disabled = true; tile.classList.remove('legal', 'landing', 'focus-threat'); }
    for (const card of elements.hand.children) { card.disabled = true; card.classList.remove('selected'); }
    elements.game.setAttribute('aria-busy', 'true');
  }
  async function move(destination) {
    if (busy || !room.canMove(selected, destination)) return;
    const action = room.move(selected, destination); lock();
    // Keep the visible board stable until the movement and impact complete.
    await travel(actors.get('hero'), action.from, action.to, action.kind === 'leap' ? 30 : 9);
    if (action.removedId >= 0) {
      const victim = actors.get(action.removedId);
      await animate(victim, [{ opacity: 1, scale: 1 }, { opacity: 0, scale: 1.17 }], 130);
      victim.remove(); actors.delete(action.removedId);
    }
    if (room.finished) { busy = false; render(); showResult(); return; }
    if (room.actions === 0) { await pause(180); await enemyTurn(true); }
    else { busy = false; render(); }
  }
  async function enemyTurn(alreadyLocked = false) {
    if ((!alreadyLocked && busy) || room.finished) return;
    lock(); elements.endLabel.textContent = '敵方回合';
    const outcome = room.endTurn();
    const cellPixels = elements.board.clientWidth / 5;
    await Promise.all(outcome.attacks.map(attack => {
      const dx = room.hero[0] - attack.from[0], dy = room.hero[1] - attack.from[1];
      const magnitude = Math.hypot(dx, dy), shift = cellPixels * .13;
      return animate(actors.get(attack.id), [
        { transform: 'translate(-50%, -50%)' },
        { transform: `translate(calc(-50% + ${dx / magnitude * shift}px), calc(-50% - ${dy / magnitude * shift}px))` },
        { transform: 'translate(-50%, -50%)' }
      ], 240);
    }));
    if (outcome.damage) {
      renderHealth();
      await animate(actors.get('hero'), [
        { transform: 'translate(-50%, -50%)', filter: 'none' },
        { transform: 'translate(calc(-50% - 4px), -50%)', filter: 'sepia(1) saturate(3)' },
        { transform: 'translate(calc(-50% + 4px), -50%)' },
        { transform: 'translate(-50%, -50%)', filter: 'none' }
      ], 200);
    }
    if (!room.lost) {
      await Promise.all(outcome.motions.map(motion => travel(actors.get(motion.id), motion.from, motion.to, 12)));
    }
    busy = false; elements.endLabel.textContent = '結束回合'; render();
    if (room.finished) showResult();
  }
  function showResult() {
    elements.resultTitle.textContent = room.won ? '漂亮，過關！' : '再試一次';
    elements.result.hidden = false;
  }
  function reset() {
    room = new Room(seed++); selected = -1; hoveredTile = null; hoveredEnemy = -1; busy = false; handSignature = '';
    elements.result.hidden = true; elements.hint.textContent = ''; elements.endLabel.textContent = '結束回合';
    elements.actors.replaceChildren(); actors.clear();
    for (const enemy of room.enemies) makeActor(enemy.id, data.enemies[enemy.kind].art, data.enemies[enemy.kind].name);
    makeActor('hero', 'assets/Adventurer.png', '冒險者', true); render();
  }
  makeTiles();
  onClick(elements.end, () => enemyTurn());
  onClick($('replay'), reset);
  document.addEventListener('pointerdown', event => {
    if (busy || event.target.closest('button, .board-shell, .modal')) return;
    selected = -1; hoveredTile = null; hoveredEnemy = -1; elements.hint.textContent = ''; render();
  });
  reset();
})();
