import head from '../../assets/characters/luxue/Token.png';
import portrait from '../../assets/characters/luxue/Portrait.png';
import pinkHead from '../../assets/characters/lianmiao/Token.png';
import pinkPortrait from '../../assets/characters/lianmiao/Portrait.png';
import sprout from '../../assets/monsters/forest/ThornSprout.png';
import stump from '../../assets/monsters/forest/StumpGuard.png';
import type { EnemyKind } from '../types/game.ts';

export const characters = {
  rogue: { name: '露雪', image: head, portrait },
  pinkCat: { name: '戀喵', image: pinkHead, portrait: pinkPortrait }
};
export type CharacterId = keyof typeof characters;
export const enemyArt: Record<EnemyKind, string> = { sprout, stump };
