import { Journey } from '../battle/Journey.ts';
import type { CharacterId } from '../data/art.ts';

// In-memory state survives navigation, not application restarts.
export class GameSession {
  private selectedCharacter: CharacterId = 'rogue';
  get characterId() { return this.selectedCharacter; }
  set characterId(id: CharacterId) {
    this.selectedCharacter = id;
    const loadout = id === 'rogue' ? 'rogue' : 'basic';
    if (!this.started) this.current = new Journey(this.seed - 1, loadout);
    else this.current.setLoadout(loadout);
  }
  private seed = 1;
  private started = false;
  private current = new Journey(this.seed++, this.characterId === 'rogue' ? 'rogue' : 'basic');
  get journey() { return this.current; }
  get canResume() { return this.started && !this.current.finished; }
  enterJourney(): Journey {
    if (this.current.finished) return this.startNewJourney();
    this.started = true;
    return this.current;
  }
  startNewJourney(): Journey {
    this.current = new Journey(this.seed++, this.characterId === 'rogue' ? 'rogue' : 'basic');
    this.started = true;
    return this.current;
  }
}
