import { cards, loadouts } from '../data/cards.ts';
import type { CardId, Loadout } from '../data/cards.ts';
import { enemies } from '../data/enemies.ts';
import { rooms } from '../data/rooms.ts';
import type { RoomDefinition } from '../data/rooms.ts';
import type { Point, Enemy, MovePreview, EnemyMotion, TurnOutcome, CardDefinition } from '../types/game.ts';
import { attackOffsets, blocksAttack, enemySkill, faceToward } from './EnemyRules.ts';
export const data = { cards, enemies };
export interface MoveAction {
  hitId?: number;
  pickedKnife?: boolean;
  drawn?: CardId;
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
  knives: Point[] = [];
  loadout: Loadout;
  private random: () => number;
  constructor(seed = 1, definition: RoomDefinition = rooms[0], health = 5, loadout: Loadout = 'basic') {
    this.loadout = loadout;
    this.hero = [...definition.hero];
    this.health = Math.max(0, Math.min(5, health));
    this.actions = 2;
    this.turn = 1;
    this.enemies = definition.enemies.map((enemy) => ({ ...enemy, health: enemy.health ?? (enemy.elite ? 2 : 1), maxHealth: enemy.maxHealth ?? enemy.health ?? (enemy.elite ? 2 : 1), position: [...enemy.position] }));
    this.hand = loadouts[loadout].slice(0, 3);
    this.deck = [];
    this.discard = [];
    this.random = rng(seed);
    for (const id of loadouts[loadout]) {
      const card = data.cards[id];
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
  get availableCards(): readonly CardId[] {
    return this.won && !this.lost ? ['forward'] : this.hand;
  }
  canExplore(index: number, destination: Point) {
    return this.won && !this.lost && this.matchesCard(index, destination);
  }
  explore(index: number, destination: Point): MoveAction | null {
    if (!this.canExplore(index, destination)) return null;
    const action: MoveAction = {
      from: [...this.hero],
      to: [...destination],
      kind: this.availableCards[index],
      removedId: -1
    };
    this.hero = [...destination];
    return action;
  }
  private draw(): CardId {
    if (!this.deck.length) {
      this.deck.push(...this.discard);
      this.discard = [];
      this.shuffle(this.deck);
    }
    const drawn = this.deck.pop();
    if (!drawn) throw new Error('Cannot draw from an empty deck; check card copy counts.');
    this.hand.push(drawn);
    return drawn;
  }
  shuffle(cards: CardId[]) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }
  cardCost(index: number) { return (data.cards[this.availableCards[index]] as CardDefinition | undefined)?.cost ?? 1; }
  hasKnife(point: Point) { return this.knives.some(p => equal(p, point)); }
  canUseCard(index: number) {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (this.canMove(index, [x, y])) return true;
    return false;
  }
  hasPlayableCard() { return this.hand.some((_, i) => this.canUseCard(i)); }
  setLoadout(next: Loadout) {
    if (next === this.loadout) return;
    const previous = loadouts[this.loadout], target = loadouts[next];
    const convert = (pile: CardId[]) => pile.filter(id => id !== 'knife').map(id => target[Math.max(0, previous.indexOf(id)) % target.length]);
    this.hand = convert(this.hand); this.deck = convert(this.deck); this.discard = convert(this.discard);
    this.knives = []; this.loadout = next;
  }
  canMove(index: number, destination: Point) {
    if (this.finished || this.actions < this.cardCost(index) || !inside(destination)) return false;
    const card = data.cards[this.hand[index]] as CardDefinition | undefined;
    if (!card) return false;
    if (!this.matchesCard(index, destination)) return false;
    if (card.effect === 'throw') return Boolean(this.at(destination));
    if (card.effect === 'shadow' && !this.hasKnife(destination)) return false;
    return true;
  }
  private matchesCard(index: number, destination: Point) {
    if (!Number.isInteger(index) || !inside(destination)) return false;
    const card = data.cards[this.availableCards[index]];
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
    return attackOffsets(enemy).some(
      (o) => enemy.position[0] + o[0] === tile[0] && enemy.position[1] + o[1] === tile[1]
    );
  }
  damageAt(tile: Point, removedId = -1, addedKnife?: Point) {
    return this.enemies.reduce(
      (damage, enemy) =>
        damage +
        (enemy.id !== removedId && Room.threatens(enemy, tile) ? (enemy.elite ? 2 : 1) + Number(this.hasKnife(enemy.position) || Boolean(addedKnife && equal(enemy.position, addedKnife))) : 0),
      0
    );
  }
  preview(index: number, destination: Point): MovePreview | null {
    if (!this.canMove(index, destination)) return null;
    const victim = this.at(destination);
    const blocked = victim ? blocksAttack(victim, this.hero) : false;
    const survives = victim && (blocked || (victim.health ?? 1) > 1);
    const landing = survives || this.hand[index] === 'throw' ? this.hero : destination;
    return {
      blocked,
      destination: landing.slice() as Point,
      hitId: victim?.id,
      removedId: victim && !survives ? victim.id : -1,
      damage: this.damageAt(landing, victim && !survives ? victim.id : -1, this.hand[index] === 'throw' ? destination : undefined)
    };
  }
  move(index: number, destination: Point): MoveAction | null {
    const preview = this.preview(index, destination);
    if (!preview) return null;
    const cost = this.cardCost(index);
    const action: MoveAction = {
      from: this.hero.slice() as Point,
      to: destination.slice() as Point,
      kind: this.hand[index],
      removedId: preview.removedId,
      hitId: preview.hitId
    };
    const victim = this.at(destination);
    if (victim && !preview.blocked) victim.health = (victim.health ?? 1) - 1;
    this.enemies = this.enemies.filter((e) => e.id !== preview.removedId);
    this.hero = preview.destination.slice() as Point;
    const used = this.hand.splice(index, 1)[0];
    if (used !== 'knife') this.discard.push(used);
    this.actions -= cost;
    if (used === 'throw') {
      if (!this.hasKnife(destination)) this.knives.push([...destination]);
    } else if (equal(this.hero, destination) && this.hasKnife(destination)) {
      this.knives = this.knives.filter(point => !equal(point, destination));
      action.pickedKnife = true;
      this.hand.push('knife');
      this.actions = Math.min(2, this.actions + 1);
      if (this.deck.length || this.discard.length) action.drawn = this.draw();
    }
    if (this.won) this.knives = [];
    return action;
  }
  endTurn(): TurnOutcome | null {
    if (this.finished) return null;
    const attacks = this.enemies
      .filter((e) => Room.threatens(e, this.hero))
      .map((e) => ({ id: e.id, from: e.position.slice() as Point }));
    const damage = this.damageAt(this.hero);
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
        const hold = enemySkill(enemy).holdAfter;
        enemy.skillIndex = ((enemy.skillIndex ?? 0) + 1) % data.enemies[enemy.kind].skills.length;
        if (hold) continue;
        if (enemy.kind === 'stump') enemy.facing = faceToward(enemy, this.hero);
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
        if (enemy.kind === 'stump') enemy.facing = faceToward(enemy, this.hero);
        if (!equal(from, best)) motions.push({ id: enemy.id, from, to: best.slice() as Point });
      }
      const heldKnives = this.hand.filter(id => id === 'knife');
      this.discard.push(...this.hand.filter(id => id !== 'knife'));
      this.hand = heldKnives;
      for (let i = 0; i < 3; i++) this.draw();
      this.actions = 2;
      this.turn++;
    }
    return { attacks, damage, motions };
  }
}
