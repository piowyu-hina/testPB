import { cards } from '../data/cards.ts';
import type { CardId, Loadout } from '../data/cards.ts';
import { enemies } from '../data/enemies.ts';
import { forestRuins } from '../data/dungeons/forest.ts';
import type { Point, Enemy, MovePreview, EnemyMotion, TurnOutcome, CardDefinition, RoomDefinition } from '../types/game.ts';
import { attackOffsets, blocksAttack, enemySkill, enemyDamage, faceToward, chargeLanding } from './EnemyRules.ts';
import { stagSteps, rockWarnings } from './StagRules.ts';
import { freshBuild, cardKind, deckForBuild, type Build, type CardRef, type Engraving } from './Growth.ts';
export const data = { cards, enemies };
export const HAND_LIMIT = 5;
export interface MoveAction {
  growth?: Engraving[];
  hitId?: number;
  hits?: { id: number; position: Point; blocked: boolean; removed: boolean; elite: boolean }[];
  pickedKnife?: boolean;
  drawn?: CardRef;
  overflowed?: CardRef;
  drawnCards?: CardRef[];
  overflowedCards?: CardRef[];
  pushed?: { id: number; from: Point; to: Point };
  from: Point;
  to: Point;
  kind: CardId;
  removedId: number;
}
export interface UltimateAction {
  from: Point;
  to: Point;
  hitId: number;
  removedId: number;
  pickedKnife?: boolean;
  drawn?: CardRef;
  overflowed?: CardRef;
  drawnCards?: CardRef[];
  overflowedCards?: CardRef[];
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
  hand: CardRef[];
  deck: CardRef[];
  discard: CardRef[];
  knives: Point[] = [];
  loadout: Loadout;
  build: Build;
  private usedGrowth = new Set<string>();
  private random: () => number;
  constructor(seed = 1, definition: RoomDefinition = forestRuins.rooms[0], health = 5, loadout: Loadout = 'basic', build = freshBuild()) {
    this.loadout = loadout;
    this.build = build;
    this.hero = [...definition.hero];
    this.health = Math.max(0, Math.min(5, health));
    this.actions = 2;
    this.turn = 1;
    this.enemies = definition.enemies.map((enemy) => ({ ...enemy, health: enemy.health ?? (enemy.elite ? 2 : 1), maxHealth: enemy.maxHealth ?? enemy.health ?? (enemy.elite ? 2 : 1), position: [...enemy.position] }));
    this.hand = [];
    this.deck = [];
    this.discard = [];
    this.random = rng(seed);
    this.deck = deckForBuild(loadout, build);
    this.shuffle(this.deck);
    for (let i = 0; i < (build.opening ? 4 : 3); i++) this.draw();
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
    return this.availableCardRefs.map(cardKind);
  }
  get availableCardRefs(): readonly CardRef[] {
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
  private draw(): CardRef {
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
  drawOverflow(): CardRef | undefined {
    if (this.hand.length < HAND_LIMIT || (!this.deck.length && !this.discard.length)) return undefined;
    const drawn = this.draw();
    this.hand.pop();
    this.discard.push(drawn);
    return drawn;
  }
  shuffle(cards: CardRef[]) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }
  cardCost(index: number) {
    const id = this.availableCards[index];
    const base = (data.cards[id] as CardDefinition | undefined)?.cost ?? 1;
    const ref = this.availableCardRefs[index];
    return Math.max(0, base - Number(this.build.engravings[ref] === 'discount' && this.growthReady(ref)));
  }
  growthReady(ref: CardRef) { return !this.usedGrowth.has(`card:${ref}`); }
  drawCards(count: number): { drawn: CardRef[]; overflowed: CardRef[] } {
    const result: { drawn: CardRef[]; overflowed: CardRef[] } = { drawn: [], overflowed: [] };
    for (let i = 0; i < count && this.deck.length + this.discard.length > 0; i++) {
      if (this.hand.length < HAND_LIMIT) result.drawn.push(this.draw());
      else { const card = this.drawOverflow(); if (card) result.overflowed.push(card); }
    }
    return result;
  }
  private rewardDraw(action: MoveAction | UltimateAction, count: number) {
    const result = this.drawCards(count);
    (action.drawnCards ??= []).push(...result.drawn);
    (action.overflowedCards ??= []).push(...result.overflowed);
    action.drawn ??= result.drawn[0]; action.overflowed ??= result.overflowed[0];
  }
  private pickup(action: MoveAction | UltimateAction, point: Point) {
    this.knives = this.knives.filter(p => !equal(p, point));
    action.pickedKnife = true;
    if (this.hand.length < HAND_LIMIT) this.hand.push('knife');
    else { (action.overflowedCards ??= []).push('knife'); action.overflowed ??= 'knife'; }
    this.actions = Math.min(9, this.actions + 1);
    this.rewardDraw(action, 1);
    if (this.build.relic && this.loadout === 'rogue' && !this.usedGrowth.has('relic')) {
      this.usedGrowth.add('relic'); this.rewardDraw(action, 1);
    }
  }
  private applyGrowth(action: MoveAction, paid: number, ref: CardRef) {
    const key = `card:${ref}`, effect = this.build.engravings[ref];
    if (effect && !this.usedGrowth.has(key) && (effect !== 'refund' || paid > 0)) {
      this.usedGrowth.add(key);
      (action.growth ??= []).push(effect);
      if (effect === 'draw') this.rewardDraw(action, 1);
      if (effect === 'refund') this.actions = Math.min(9, this.actions + 1);
    }
    if (this.build.relic && this.loadout === 'qinghe' && !equal(action.from, this.hero) && !this.usedGrowth.has('relic')) {
      this.usedGrowth.add('relic'); this.rewardDraw(action, 1);
    }
  }
  hasKnife(point: Point) { return this.knives.some(p => equal(p, point)); }
  canUseCard(index: number) {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (this.canMove(index, [x, y])) return true;
    return false;
  }
  cardUnavailableReason(index: number) {
    const id = this.availableCards[index];
    if (!id || this.lost) return 'finished';
    if (this.won) return '';
    if (this.actions < this.cardCost(index)) return 'energy';
    if (this.canUseCard(index)) return '';
    if (id === 'shadow' || id === 'recall') {
      if (!this.knives.length) return 'knife';
      return id === 'recall' ? 'empty-knife' : 'destination';
    }
    if (id === 'sidestep') return 'empty-tile';
    if (['thrust', 'sweep', 'repel', 'throw', 'knife'].includes(id)) return 'enemy';
    return 'destination';
  }
  hasPlayableCard() { return this.hand.some((id, i) => id === 'absoluteShadow' || id === 'dawnSpear' || this.canUseCard(i)); }
  setLoadout(next: Loadout) {
    if (next === this.loadout) return;
    const count = Math.min(HAND_LIMIT, this.hand.filter(id => id !== 'knife').length);
    this.deck = deckForBuild(next, this.build);
    this.shuffle(this.deck);
    this.hand = []; this.discard = [];
    for (let index = 0; index < count; index++) this.draw();
    this.knives = []; this.loadout = next;
    this.usedGrowth.clear();
  }
  canMove(index: number, destination: Point) {
    if (this.finished || this.actions < this.cardCost(index) || !inside(destination)) return false;
    const card = data.cards[cardKind(this.hand[index])] as CardDefinition | undefined;
    if (!card) return false;
    if (card.effect === 'sweep')
      return (equal(destination, this.hero) || card.offsets.some(offset => equal(destination, [this.hero[0] + offset[0], this.hero[1] + offset[1]]))) && this.enemies.some(enemy =>
        card.offsets.some(offset => equal(enemy.position, [this.hero[0] + offset[0], this.hero[1] + offset[1]]))
      );
    if (!this.matchesCard(index, destination)) return false;
    if (card.effect === 'throw') return Boolean(this.at(destination));
    if (card.effect === 'thrust') return Boolean(this.at(destination)) || Math.abs(destination[0] - this.hero[0]) + Math.abs(destination[1] - this.hero[1]) === 1;
    if (card.effect === 'shadow' && !this.hasKnife(destination)) return false;
    if (card.effect === 'knife') return Boolean(this.at(destination));
    if (card.effect === 'repel') return true;
    if (card.effect === 'sidestep') return !this.at(destination);
    if (card.effect === 'recall') return this.hasKnife(destination) && !this.at(destination);
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
  damageAt(tile: Point, removedId: number | number[] = -1, addedKnife?: Point, pushed?: MovePreview['pushed']) {
    const removed = Array.isArray(removedId) ? removedId : [removedId];
    return this.enemies.reduce(
      (damage, enemy) =>
        damage +
        (!removed.includes(enemy.id) && Room.threatens(pushed?.id === enemy.id ? { ...enemy, position: pushed.to } : enemy, tile) ? enemyDamage(enemy) + Number(this.hasKnife(pushed?.id === enemy.id ? pushed.to : enemy.position) || Boolean(addedKnife && equal(enemy.position, addedKnife))) : 0),
      0
    );
  }
  preview(index: number, destination: Point): MovePreview | null {
    if (!this.canMove(index, destination)) return null;
    if (cardKind(this.hand[index]) === 'sweep') {
      const victims = this.enemies.filter(enemy => data.cards.sweep.offsets.some(offset => equal(enemy.position, [this.hero[0] + offset[0], this.hero[1] + offset[1]])));
      const removedIds = victims.filter(enemy => !blocksAttack(enemy, this.hero) && (enemy.health ?? 1) <= 1).map(enemy => enemy.id);
      return {
        blocked: false,
        destination: this.hero.slice() as Point,
        removedId: -1,
        removedIds,
        damage: this.damageAt(this.hero, removedIds)
      };
    }
    const victim = this.at(destination);
    const blocked = victim ? blocksAttack(victim, this.hero) : false;
    const survives = victim && (blocked || (victim.health ?? 1) > 1);
    const stationary = ['throw', 'knife', 'recall'].includes(cardKind(this.hand[index])) || ['thrust', 'repel'].includes(cardKind(this.hand[index])) && Boolean(victim);
    const landing = survives || stationary ? this.hero : destination;
    let pushed: MovePreview['pushed'];
    let pushBlocked = false;
    if (cardKind(this.hand[index]) === 'repel' && victim && survives) {
      const to: Point = [destination[0] + Math.sign(destination[0] - this.hero[0]), destination[1] + Math.sign(destination[1] - this.hero[1])];
      pushBlocked = blocked || Boolean(victim.elite) || Boolean(enemies[victim.kind].boss) || Boolean(enemies[victim.kind].rooted) || enemySkill(victim).id === 'roots' || !inside(to) || Boolean(this.at(to));
      if (!pushBlocked) pushed = { id: victim.id, from: [...destination], to };
    }
    return {
      blocked,
      destination: landing.slice() as Point,
      hitId: victim?.id,
      removedId: victim && !survives ? victim.id : -1,
      pushed, pushBlocked,
      damage: this.damageAt(landing, victim && !survives ? victim.id : -1, cardKind(this.hand[index]) === 'throw' ? destination : undefined, pushed)
    };
  }
  move(index: number, destination: Point): MoveAction | null {
    const preview = this.preview(index, destination);
    if (!preview) return null;
    const ref = this.hand[index];
    if (cardKind(ref) === 'sweep') {
      const cost = this.cardCost(index);
      const hits = this.enemies
        .filter(enemy => data.cards.sweep.offsets.some(offset => equal(enemy.position, [this.hero[0] + offset[0], this.hero[1] + offset[1]])))
        .map(enemy => ({
          id: enemy.id,
          position: enemy.position.slice() as Point,
          blocked: blocksAttack(enemy, this.hero),
          removed: preview.removedIds!.includes(enemy.id),
          elite: Boolean(enemy.elite)
        }));
      for (const hit of hits) {
        if (!hit.blocked) {
          const victim = this.enemies.find(enemy => enemy.id === hit.id)!;
          victim.health = (victim.health ?? 1) - 1;
        }
      }
      this.enemies = this.enemies.filter(enemy => !preview.removedIds!.includes(enemy.id));
      this.discard.push(this.hand.splice(index, 1)[0]);
      this.actions -= cost;
      if (this.won) this.knives = [];
      const action: MoveAction = { from: this.hero.slice() as Point, to: this.hero.slice() as Point, kind: 'sweep', removedId: -1, hits };
      this.applyGrowth(action, cost, ref);
      return action;
    }
    const cost = this.cardCost(index);
    const action: MoveAction = {
      from: this.hero.slice() as Point,
      to: destination.slice() as Point,
      kind: cardKind(ref),
      removedId: preview.removedId,
      hitId: preview.hitId
    };
    const victim = this.at(destination);
    if (victim && !preview.blocked) victim.health = (victim.health ?? 1) - 1;
    this.enemies = this.enemies.filter((e) => e.id !== preview.removedId);
    if (preview.pushed && victim) { victim.position = [...preview.pushed.to]; action.pushed = preview.pushed; }
    this.hero = preview.destination.slice() as Point;
    const used = this.hand.splice(index, 1)[0];
    if (used !== 'knife') this.discard.push(used);
    this.actions -= cost;
    if (cardKind(used) === 'throw') {
      if (!this.hasKnife(destination)) this.knives.push([...destination]);
    } else if ((cardKind(used) === 'recall' || equal(this.hero, destination)) && this.hasKnife(destination)) this.pickup(action, destination);
    if (cardKind(used) === 'repel' && !victim) this.rewardDraw(action, 1);
    this.applyGrowth(action, cost, ref);
    if (this.won) this.knives = [];
    return action;
  }
  assassinate(enemyId: number): UltimateAction | null {
    if (this.finished) return null;
    const victim = this.enemies.find(enemy => enemy.id === enemyId);
    if (!victim) return null;
    const action: UltimateAction = {
      from: this.hero.slice() as Point,
      to: victim.position.slice() as Point,
      hitId: victim.id,
      removedId: -1
    };
    victim.health = (victim.health ?? 1) - 2;
    if (victim.health <= 0) {
      action.removedId = victim.id;
      this.enemies = this.enemies.filter(enemy => enemy.id !== victim.id);
      this.hero = action.to.slice() as Point;
      if (this.hasKnife(action.to)) this.pickup(action, action.to);
    }
    if (this.won) this.knives = [];
    return action;
  }
  dawnDirectionTo(point: Point): Point | null {
    if (!inside(point)) return null;
    const dx = point[0] - this.hero[0], dy = point[1] - this.hero[1];
    if ((dx === 0) === (dy === 0)) return null;
    return [Math.sign(dx), Math.sign(dy)];
  }
  dawnRay(direction: Point): Enemy[] {
    if (this.loadout !== 'qinghe' || !cardinal.some(point => equal(point, direction))) return [];
    const victims: Enemy[] = [];
    for (let step = 1; step < 5; step++) {
      const point: Point = [this.hero[0] + direction[0] * step, this.hero[1] + direction[1] * step];
      if (!inside(point)) break;
      const victim = this.at(point);
      if (victim) victims.push(victim);
    }
    return victims;
  }
  strikeUltimate(direction: Point): MoveAction | null {
    if (this.finished || this.loadout !== 'qinghe') return null;
    const victims = this.dawnRay(direction);
    if (!victims.length) return null;
    const hits = victims.map(victim => ({
      id: victim.id,
      position: victim.position.slice() as Point,
      blocked: false,
      removed: (victim.health ?? 1) <= 2,
      elite: Boolean(victim.elite)
    }));
    for (const victim of victims) victim.health = (victim.health ?? 1) - 2;
    this.enemies = this.enemies.filter(enemy => (enemy.health ?? 1) > 0);
    if (this.won) this.knives = [];
    return { from: this.hero.slice() as Point, to: [this.hero[0] + direction[0], this.hero[1] + direction[1]], kind: 'dawnSpear', removedId: -1, hits };
  }
  endTurn(): TurnOutcome | null {
    if (this.finished) return null;
    const attacks = this.enemies
      .filter((e) => Room.threatens(e, this.hero))
      .map((e) => ({ id: e.id, from: e.position.slice() as Point }));
    const damage = this.damageAt(this.hero);
    this.health = Math.max(0, this.health - damage);
    const motions: EnemyMotion[] = [];
    const pendingRocks: Enemy[] = [];
    if (!this.lost) {
      const ordered = this.enemies
        .slice()
        .sort((a, b) => b.position[1] - a.position[1] || a.position[0] - b.position[0]);
      const score = (enemy: Enemy, position: Point) =>
        Room.threatens({ ...enemy, position }, this.hero)
          ? -100
          : distanceSquared(position, this.hero);
      for (const enemy of ordered) {
        if (enemy.kind === 'mossstag') {
          const occupied = () => this.enemies.filter(e => e.id !== enemy.id).map(e => e.position);
          if (enemySkill(enemy).id === 'charge') {
            const from = enemy.position.slice() as Point;
            enemy.position = chargeLanding(enemy, [this.hero, ...occupied()]);
            if (!equal(from, enemy.position)) motions.push({ id: enemy.id, from, to: [...enemy.position] });
            enemy.skillIndex = 1;
            enemy.enraged ||= (enemy.health ?? 8) <= (enemy.maxHealth ?? 8) / 2;
            pendingRocks.push(enemy);
          } else if (enemySkill(enemy).id === 'rocks') {
            enemy.skillIndex = 2;
            enemy.warningTiles = [];
          } else {
            for (const to of stagSteps(enemy.position, this.hero, occupied())) {
              const from = enemy.position.slice() as Point;
              enemy.position = [...to];
              motions.push({ id: enemy.id, from, to: [...to] });
            }
            enemy.skillIndex = 0;
            enemy.warningTiles = [];
          }
          // Lock the next intent now; never retarget during the player's actions.
          enemy.facing = faceToward(enemy, this.hero);
          continue;
        }
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
      for (const enemy of pendingRocks) {
        enemy.warningTiles = rockWarnings(enemy.position, this.hero, this.enemies.filter(e => e.id !== enemy.id).map(e => e.position), Boolean(enemy.enraged));
      }
      this.discard.push(...this.hand.filter(id => id !== 'knife' && id !== 'absoluteShadow' && id !== 'dawnSpear'));
      this.hand = this.hand.filter(id => id === 'absoluteShadow' || id === 'dawnSpear');
      for (let i = 0; i < 3 && this.hand.length < HAND_LIMIT; i++) this.draw();
      this.actions = 2;
      this.usedGrowth.clear();
      this.turn++;
    }
    return { attacks, damage, motions };
  }
}
