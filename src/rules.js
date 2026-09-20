(function (root) {
  'use strict';
  const data = typeof module !== 'undefined' && module.exports ? require('../data/cards.js') : root.TestPBData;
  const cardinal = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const equal = (a, b) => a[0] === b[0] && a[1] === b[1];
  const inside = p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isInteger(v) && v >= 0 && v < 5);
  const distanceSquared = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  function rng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = Math.imul(value ^ value >>> 15, value | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  class Room {
    constructor(seed = 1) {
      this.hero = [2, 0]; this.health = 5; this.actions = 2; this.turn = 1;
      this.enemies = [
        { id: 0, kind: 'imp', position: [2, 2] },
        { id: 1, kind: 'bat', position: [0, 3] },
        { id: 2, kind: 'imp', position: [4, 3] },
        { id: 3, kind: 'bat', position: [3, 4] }
      ];
      this.hand = ['short', 'diagonal', 'rush'];
      this.deck = []; this.discard = []; this.random = rng(seed);
      for (const [id, card] of Object.entries(data.cards)) {
        const remaining = card.copies - this.hand.filter(x => x === id).length;
        for (let i = 0; i < remaining; i++) this.deck.push(id);
      }
      this.shuffle(this.deck);
    }
    get won() { return this.enemies.length === 0; }
    get lost() { return this.health <= 0; }
    get finished() { return this.won || this.lost; }
    at(tile) { return this.enemies.find(e => equal(e.position, tile)); }
    shuffle(cards) {
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
    }
    canMove(index, destination) {
      if (this.finished || this.actions <= 0 || !Number.isInteger(index) || !inside(destination)) return false;
      const card = data.cards[this.hand[index]];
      if (!card) return false;
      const delta = [destination[0] - this.hero[0], destination[1] - this.hero[1]];
      if (!card.offsets.some(o => equal(o, delta))) return false;
      if (!card.canJump) {
        const steps = gcd(Math.abs(delta[0]), Math.abs(delta[1]));
        for (let i = 1; i < steps; i++) {
          if (this.at([this.hero[0] + delta[0] / steps * i, this.hero[1] + delta[1] / steps * i])) return false;
        }
      }
      return true;
    }
    static threatens(enemy, tile) {
      return data.enemies[enemy.kind].attacks.some(o => enemy.position[0] + o[0] === tile[0] && enemy.position[1] + o[1] === tile[1]);
    }
    damageAt(tile, removedId = -1) {
      return this.enemies.reduce((damage, enemy) => damage + (enemy.id !== removedId && Room.threatens(enemy, tile) ? 1 : 0), 0);
    }
    preview(index, destination) {
      if (!this.canMove(index, destination)) return null;
      const victim = this.at(destination);
      return { destination: destination.slice(), removedId: victim ? victim.id : -1, damage: this.damageAt(destination, victim ? victim.id : -1) };
    }
    move(index, destination) {
      const preview = this.preview(index, destination);
      if (!preview) return null;
      const action = { from: this.hero.slice(), to: destination.slice(), kind: this.hand[index], removedId: preview.removedId };
      this.enemies = this.enemies.filter(e => e.id !== preview.removedId);
      this.hero = destination.slice(); this.discard.push(this.hand.splice(index, 1)[0]); this.actions--;
      return action;
    }
    endTurn() {
      if (this.finished) return null;
      const attacks = this.enemies.filter(e => Room.threatens(e, this.hero)).map(e => ({ id: e.id, from: e.position.slice() }));
      const damage = attacks.length;
      this.health = Math.max(0, this.health - damage);
      const motions = [];
      if (!this.lost) {
        const ordered = this.enemies.slice().sort((a, b) => b.position[1] - a.position[1] || a.position[0] - b.position[0]);
        const score = (enemy, position) => Room.threatens({ ...enemy, position }, this.hero) ? -100 : distanceSquared(position, this.hero);
        for (const enemy of ordered) {
          if (Room.threatens(enemy, this.hero)) continue;
          const from = enemy.position.slice();
          let best = from, bestScore = score(enemy, from);
          for (const direction of cardinal) {
            const candidate = [from[0] + direction[0], from[1] + direction[1]];
            if (!inside(candidate) || equal(candidate, this.hero) || this.at(candidate)) continue;
            const nextScore = score(enemy, candidate);
            if (nextScore < bestScore) { best = candidate; bestScore = nextScore; }
          }
          enemy.position = best.slice();
          if (!equal(from, best)) motions.push({ id: enemy.id, from, to: best.slice() });
        }
        this.discard.push(...this.hand); this.hand = [];
        for (let i = 0; i < 3; i++) {
          if (!this.deck.length) { this.deck.push(...this.discard); this.discard = []; this.shuffle(this.deck); }
          this.hand.push(this.deck.pop());
        }
        this.actions = 2; this.turn++;
      }
      return { attacks, damage, motions };
    }
  }
  const api = { Room, inside, equal, data };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TestPBRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
