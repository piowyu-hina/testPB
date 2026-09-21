import head from '../../assets/characters/heroine/HeroineHead.png';
import portrait from '../../assets/characters/heroine/HeroinePortrait.png';
import sprout from '../../assets/monsters/forest/ThornSprout.png';
import stump from '../../assets/monsters/forest/StumpGuard.png';
import type { EnemyKind } from '../types/game.ts';

export const heroArt = { name: '莉娜', image: head, portrait };
export const enemyArt: Record<EnemyKind, string> = { sprout, stump };
