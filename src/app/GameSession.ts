import { Journey } from '../battle/Journey.ts';
import type { CharacterId } from '../data/art.ts';

// In-memory state survives navigation, not application restarts.
export class GameSession {
  characterId: CharacterId = 'rogue';
  private seed = 1;
  private started = false;
  private current = new Journey(this.seed++);
  get journey() { return this.current; }
  get canResume() { return this.started && !this.current.finished; }
  enterJourney(): Journey {
    if (this.current.finished) return this.startNewJourney();
    this.started = true;
    return this.current;
  }
  startNewJourney(): Journey {
    this.current = new Journey(this.seed++);
    this.started = true;
    return this.current;
  }
}
