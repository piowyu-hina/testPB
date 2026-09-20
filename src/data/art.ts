import adventurer from '../../assets/AdventurerHead.png';
import portrait from '../../assets/AdventurerPortrait.png';
import linaHead from '../../assets/LinaHead.png';
import linaPortrait from '../../assets/LinaPortrait.png';
import imp from '../../assets/Imp.png';
import bat from '../../assets/Bat.png';
import type { EnemyKind } from '../types/game.ts';

// Import every image once. Vite verifies paths and embeds these files in the app.
export const characters = {
  adventurer: { name: '冒險者', image: adventurer, portrait },
  lina: { name: '莉娜', image: linaHead, portrait: linaPortrait }
};
export type CharacterId = keyof typeof characters;
let selected: CharacterId = 'lina';
try {
  const saved = localStorage.getItem('testpb.character');
  if (saved === 'adventurer' || saved === 'lina') selected = saved;
} catch {
  /* Selection still works without persistent storage. */
}
export let heroArt = characters[selected];
export function selectCharacter(id: CharacterId) {
  selected = id;
  heroArt = characters[id];
  try {
    localStorage.setItem('testpb.character', id);
  } catch {
    /* Keep session selection. */
  }
}
export const selectedCharacter = () => selected;
export const enemyArt: Record<EnemyKind, string> = { imp, bat };
