import type { Loadout } from '../data/cards.ts';
import { Room, equal, HAND_LIMIT } from './Room.ts';
import type { Point, RoomDefinition } from '../types/game.ts';
import { dungeons } from '../data/dungeons/index.ts';
import type { DungeonId } from '../data/dungeons/index.ts';

export class Journey {
  readonly exit: Point = [2, 4];
  readonly dungeonId: DungeonId;
  stage = 0;
  assassination = 0;
  room: Room;
  private seed: number;
  private activeRooms: RoomDefinition[];
  loadout: Loadout;
  constructor(seed = 1, loadout: Loadout = 'basic', dungeonId: DungeonId = 'forest') {
    this.loadout = loadout;
    this.seed = seed;
    this.dungeonId = dungeonId;
    const dungeon = dungeons[dungeonId];
    this.activeRooms = dungeon.rooms.slice(dungeon.startIndex ?? 0);
    this.room = new Room(seed, this.activeRooms[0], 5, loadout);
  }
  setLoadout(next: Loadout) {
    if (next !== this.loadout) this.assassination = 0;
    this.loadout = next;
    this.room.setLoadout(next);
  }
  gainAssassination(elite = false) {
    if (this.loadout !== 'rogue' && this.loadout !== 'qinghe') return this.assassination;
    this.assassination = Math.min(3, this.assassination + (elite ? 2 : 1));
    return this.assassination;
  }
  spendAssassination() {
    if ((this.loadout !== 'rogue' && this.loadout !== 'qinghe') || this.assassination < 3) return false;
    this.assassination = 0;
    this.room.removeUltimateCard();
    return true;
  }
  claimUltimate(replaceIndex?: number) {
    if ((this.loadout !== 'rogue' && this.loadout !== 'qinghe') || this.assassination < 3 || this.finished) return false;
    const ultimate = this.loadout === 'rogue' ? 'absoluteShadow' : 'dawnSpear';
    if (this.room.hand.includes(ultimate)) return false;
    if (this.room.hand.length >= HAND_LIMIT && (replaceIndex === undefined || this.room.discardForUltimate(replaceIndex) === null)) return false;
    this.room.hand.push(ultimate);
    return true;
  }
  get definition() {
    return this.activeRooms[this.stage];
  }
  get total() {
    return this.activeRooms.length;
  }
  get won() {
    return this.stage === this.total - 1 && this.room.won;
  }
  get finished() {
    return this.room.lost || this.won;
  }
  get recovery() {
    return this.room.won && !this.won ? Math.min(1, 5 - this.room.health) : 0;
  }
  clearOccupiedExit(): Point | null {
    if (!this.room.won || this.won || !equal(this.room.hero, this.exit)) return null;
    const next: Point = [this.exit[0], this.exit[1] - 1];
    this.room.hero = next;
    return next;
  }
  advance() {
    if (!this.room.won || this.finished || !equal(this.room.hero, this.exit)) return false;
    const health = this.room.health + this.recovery;
    const carriesUltimate = this.room.hand.includes(this.loadout === 'rogue' ? 'absoluteShadow' : 'dawnSpear');
    this.stage++;
    this.room = new Room(this.seed + this.stage * 1009, this.activeRooms[this.stage], health, this.loadout);
    if (carriesUltimate) this.room.hand.push(this.loadout === 'rogue' ? 'absoluteShadow' : 'dawnSpear');
    return true;
  }
}
