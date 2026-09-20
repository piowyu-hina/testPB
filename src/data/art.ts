import head from '../../assets/HeroineHead.png';
import portrait from '../../assets/HeroinePortrait.png';
import imp from '../../assets/Imp.png';
import bat from '../../assets/Bat.png';
import type { EnemyKind } from '../types/game.ts';

export const heroArt = { name: '莉娜', image: head, portrait };
export const enemyArt: Record<EnemyKind, string> = { imp, bat };
