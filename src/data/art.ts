import head from '../../assets/HeroineHead.png';
import portrait from '../../assets/HeroinePortrait.png';
import sprout from '../../assets/ThornSprout.png';
import stump from '../../assets/StumpGuard.png';
import type { EnemyKind } from '../types/game.ts';

export const heroArt = { name: '莉娜', image: head, portrait };
export const enemyArt: Record<EnemyKind, string> = { sprout, stump };
