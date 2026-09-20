import { cards } from '../data/cards.ts';
import type { CardId } from '../data/cards.ts';
import { enemies } from '../data/enemies.ts';
import type { Point, Enemy, MovePreview, EnemyMotion, TurnOutcome } from '../types/game.ts';
export const data = { cards, enemies };
export interface MoveAction {
  from: Point;
  to: Point;
  kind: CardId;
  removedId: number;
}

const cardinal: Point[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0]
];
export const equal = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
export const inside = (p: Point) =>
  Array.isArray(p) && p.length === 2 && p.every((v) => Number.isInteger(v) && v >= 0 && v < 5);
const distanceSquared = (a: Point, b: Point) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
function rng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), value | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Room {
  hero: Point;
  health: number;
  actions: number;
  turn: number;
  enemies: Enemy[];
  hand: CardId[];
  deck: CardId[];
  discard: CardId[];
  private random: () => number;
  constructor(seed = 1) {
    this.hero = [2, 0];
    this.health = 5;
    this.actions = 2;
    this.turn = 1;
    this.enemies = [
      { id: 0, kind: 'imp', position: [2, 2] },
      { id: 1, kind: 'bat', position: [0, 3] },
      { id: 2, kind: 'imp', position: [4, 3] },
      { id: 3, kind: 'bat', position: [3, 4] }
    ];
    this.hand = ['short', 'diagonal', 'rush'];
    this.deck = [];
    this.discard = [];
    this.random = rng(seed);
    for (const [id, card] of Object.entries(data.cards)) {
      const remaining = card.copies - this.hand.filter((x) => x === id).length;
      for (let i = 0; i < remaining; i++) this.deck.push(id as CardId);
    }
    this.shuffle(this.deck);
  }
  get won() {
    return this.enemies.length === 0;
  }
  get lost() {
    return this.health <= 0;
  }
  get finished() {
    return this.won || this.lost;
  }
  at(tile: Point) {
    return this.enemies.find((e) => equal(e.position, tile));
  }
  shuffle(cards: CardId[]) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }
  canMove(index: number, destination: Point) {
    if (this.finished || this.actions <= 0 || !Number.isInteger(index) || !inside(destination))
      return false;
    const card = data.cards[this.hand[index]];
    if (!card) return false;
    const delta: Point = [destination[0] - this.hero[0], destination[1] - this.hero[1]];
    if (!card.offsets.some((o) => equal(o, delta))) return false;
    if (!card.canJump) {
      const steps = gcd(Math.abs(delta[0]), Math.abs(delta[1]));
      for (let i = 1; i < steps; i++) {
        if (this.at([this.hero[0] + (delta[0] / steps) * i, this.hero[1] + (delta[1] / steps) * i]))
          return false;
      }
    }
    return true;
  }
  static threatens(enemy: Enemy, tile: Point) {
    return data.enemies[enemy.kind].attacks.some(
      (o) => enemy.position[0] + o[0] === tile[0] && enemy.position[1] + o[1] === tile[1]
    );
  }
  damageAt(tile: Point, removedId = -1) {
    return this.enemies.reduce(
      (damage, enemy) => damage + (enemy.id !== removedId && Room.threatens(enemy, tile) ? 1 : 0),
      0
    );
  }
  preview(index: number, destination: Point): MovePreview | null {
    if (!this.canMove(index, destination)) return null;
    const victim = this.at(destination);
    return {
      destination: destination.slice() as Point,
      removedId: victim ? victim.id : -1,
      damage: this.damageAt(destination, victim ? victim.id : -1)
    };
  }
  move(index: number, destination: Point): MoveAction | null {
    const preview = this.preview(index, destination);
    if (!preview) return null;
    const action: MoveAction = {
      from: this.hero.slice() as Point,
      to: destination.slice() as Point,
      kind: this.hand[index],
      removedId: preview.removedId
    };
    this.enemies = this.enemies.filter((e) => e.id !== preview.removedId);
    this.hero = destination.slice() as Point;
    this.discard.push(this.hand.splice(index, 1)[0]);
    this.actions--;
    return action;
  }
  endTurn(): TurnOutcome | null {
    if (this.finished) return null;
    const attacks = this.enemies
      .filter((e) => Room.threatens(e, this.hero))
      .map((e) => ({ id: e.id, from: e.position.slice() as Point }));
    const damage = attacks.length;
    this.health = Math.max(0, this.health - damage);
    const motions: EnemyMotion[] = [];
    if (!this.lost) {
      const ordered = this.enemies
        .slice()
        .sort((a, b) => b.position[1] - a.position[1] || a.position[0] - b.position[0]);
      const score = (enemy: Enemy, position: Point) =>
        Room.threatens({ ...enemy, position }, this.hero)
          ? -100
          : distanceSquared(position, this.hero);
      for (const enemy of ordered) {
        if (Room.threatens(enemy, this.hero)) continue;
        const from = enemy.position.slice() as Point;
        let best = from,
          bestScore = score(enemy, from);
        for (const direction of cardinal) {
          const candidate: Point = [from[0] + direction[0], from[1] + direction[1]];
          if (!inside(candidate) || equal(candidate, this.hero) || this.at(candidate)) continue;
          const nextScore = score(enemy, candidate);
          if (nextScore < bestScore) {
            best = candidate;
            bestScore = nextScore;
          }
        }
        enemy.position = best.slice() as Point;
        if (!equal(from, best)) motions.push({ id: enemy.id, from, to: best.slice() as Point });
      }
      this.discard.push(...this.hand);
      this.hand = [];
      for (let i = 0; i < 3; i++) {
        if (!this.deck.length) {
          this.deck.push(...this.discard);
          this.discard = [];
          this.shuffle(this.deck);
        }
        const drawn = this.deck.pop();
        if (!drawn) throw new Error('Cannot draw from an empty deck; check card copy counts.');
        this.hand.push(drawn);
      }
      this.actions = 2;
      this.turn++;
    }
    return { attacks, damage, motions };
  }
}
