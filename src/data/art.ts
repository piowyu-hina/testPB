import head from '../../assets/characters/rogue/Token.png';
import portrait from '../../assets/characters/rogue/Portrait.png';
import catHead from '../../assets/characters/heroine/HeroineHead.png';
import catPortrait from '../../assets/characters/heroine/HeroinePortrait.png';
import pinkHead from '../../assets/characters/pink-cat/Token.png';
import pinkPortrait from '../../assets/characters/pink-cat/Portrait.png';
import sprout from '../../assets/monsters/forest/ThornSprout.png';
import stump from '../../assets/monsters/forest/StumpGuard.png';
import type { EnemyKind } from '../types/game.ts';

export const characters = {
  rogue: { name: '莉娜', image: head, portrait },
  heroine: { name: '白色貓娘', image: catHead, portrait: catPortrait },
  pinkCat: { name: '粉色貓娘', image: pinkHead, portrait: pinkPortrait }
};
export type CharacterId = keyof typeof characters;
export const enemyArt: Record<EnemyKind, string> = { sprout, stump };
