import type { Loadout } from '../data/cards.ts';
import { Room, equal } from './Room.ts';
import type { Point } from '../types/game.ts';
import { rooms } from '../data/rooms.ts';

export class Journey {
  readonly exit: Point = [2, 4];
  stage = 0;
  room: Room;
  private seed: number;
  loadout: Loadout;
  constructor(seed = 1, loadout: Loadout = 'basic') {
    this.loadout = loadout;
    this.seed = seed;
    this.room = new Room(seed, rooms[0], 5, loadout);
  }
  setLoadout(next: Loadout) { this.loadout = next; this.room.setLoadout(next); }
  get definition() {
    return rooms[this.stage];
  }
  get total() {
    return rooms.length;
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
  advance() {
    if (!this.room.won || this.finished || !equal(this.room.hero, this.exit)) return false;
    const health = this.room.health + this.recovery;
    this.stage++;
    this.room = new Room(this.seed + this.stage * 1009, rooms[this.stage], health, this.loadout);
    return true;
  }
}
