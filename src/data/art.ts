import adventurer from '../../assets/Adventurer.png';
import imp from '../../assets/Imp.png';
import bat from '../../assets/Bat.png';
import type { EnemyKind } from '../types/game.ts';

// Import every image once. Vite verifies paths and embeds these files in the app.
export const heroArt = { name: '冒險者', image: adventurer };
export const enemyArt: Record<EnemyKind, string> = { imp, bat };
