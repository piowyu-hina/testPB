import head from '../../assets/characters/luxue/Token.png';
import portrait from '../../assets/characters/luxue/Portrait.png';
import pinkHead from '../../assets/characters/lianmiao/Token.png';
import pinkPortrait from '../../assets/characters/lianmiao/Portrait.png';
import sprout from '../../assets/monsters/forest/ThornSprout.png';
import stump from '../../assets/monsters/forest/StumpGuard.png';
import forestScene from '../../assets/scenes/forest/ForestRuins.png';
import type { EnemyKind } from '../types/game.ts';
import type { DungeonId } from './dungeons/index.ts';

interface CharacterArt {
  name: string;
  image: string;
  portrait: string;
}
export const characters: Record<'rogue' | 'pinkCat', CharacterArt> = {
  rogue: {
    name: '露雪',
    image: head,
    portrait
  },
  pinkCat: { name: '戀喵', image: pinkHead, portrait: pinkPortrait }
};
export type CharacterId = keyof typeof characters;
export const enemyArt: Record<EnemyKind, string> = { sprout, stump };
export const dungeonArt: Record<DungeonId, string> = { forest: forestScene };
