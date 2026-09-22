import { Journey } from '../battle/Journey.ts';
import type { CharacterId } from '../data/art.ts';
import type { DungeonId } from '../data/dungeons/index.ts';

// In-memory state survives navigation, not application restarts.
export class GameSession {
  private selectedCharacter: CharacterId = 'rogue';
  get characterId() { return this.selectedCharacter; }
  set characterId(id: CharacterId) {
    this.selectedCharacter = id;
    const loadout = id === 'rogue' ? 'rogue' : 'basic';
    if (!this.started) this.current = new Journey(this.seed - 1, loadout, this.selectedDungeon);
    else this.current.setLoadout(loadout);
  }
  // Only one dungeon exists today; this is where a future dungeon-select screen would set it.
  private selectedDungeon: DungeonId = 'forest';
  get dungeonId() { return this.selectedDungeon; }
  private seed = 1;
  private started = false;
  private current = new Journey(this.seed++, this.characterId === 'rogue' ? 'rogue' : 'basic', this.selectedDungeon);
  get journey() { return this.current; }
  get canResume() { return this.started && !this.current.finished; }
  enterJourney(): Journey {
    if (this.current.finished) return this.startNewJourney();
    this.started = true;
    return this.current;
  }
  startNewJourney(dungeonId: DungeonId = this.selectedDungeon): Journey {
    this.selectedDungeon = dungeonId;
    this.current = new Journey(this.seed++, this.characterId === 'rogue' ? 'rogue' : 'basic', dungeonId);
    this.started = true;
    return this.current;
  }
}
