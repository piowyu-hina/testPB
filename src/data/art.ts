import head from '../../assets/characters/luxue/Token.png';
import portrait from '../../assets/characters/luxue/Portrait.png';
import pinkHead from '../../assets/characters/lianmiao/Token.png';
import pinkPortrait from '../../assets/characters/lianmiao/Portrait.png';
import sprout from '../../assets/monsters/forest/ThornSprout.png';
import stump from '../../assets/monsters/forest/StumpGuard.png';
import forestScene from '../../assets/scenes/forest/ForestRuins.png';
import idle0 from '../../assets/characters/luxue/idle/frame-000.png';
import idle1 from '../../assets/characters/luxue/idle/frame-001.png';
import idle2 from '../../assets/characters/luxue/idle/frame-002.png';
import idle3 from '../../assets/characters/luxue/idle/frame-003.png';
import idle4 from '../../assets/characters/luxue/idle/frame-004.png';
import idle5 from '../../assets/characters/luxue/idle/frame-005.png';
import idle6 from '../../assets/characters/luxue/idle/frame-006.png';
import idle7 from '../../assets/characters/luxue/idle/frame-007.png';
import idle8 from '../../assets/characters/luxue/idle/frame-008.png';
import idle9 from '../../assets/characters/luxue/idle/frame-009.png';
import idle10 from '../../assets/characters/luxue/idle/frame-010.png';
import idle11 from '../../assets/characters/luxue/idle/frame-011.png';
import idle12 from '../../assets/characters/luxue/idle/frame-012.png';
import idle13 from '../../assets/characters/luxue/idle/frame-013.png';
import type { EnemyKind } from '../types/game.ts';
import type { DungeonId } from './dungeons/index.ts';

interface CharacterArt {
  name: string;
  image: string;
  portrait: string;
  // Exported idle-sway frame sequence (see docs/PortraitRig.md for how these
  // were captured); HomeScreen plays it forward then backward on a loop.
  // Unset falls back to the static `portrait` image.
  idleFrames?: string[];
}
export const characters: Record<'rogue' | 'pinkCat', CharacterArt> = {
  rogue: {
    name: '露雪',
    image: head,
    portrait,
    idleFrames: [idle0, idle1, idle2, idle3, idle4, idle5, idle6, idle7, idle8, idle9, idle10, idle11, idle12, idle13]
  },
  pinkCat: { name: '戀喵', image: pinkHead, portrait: pinkPortrait }
};
export type CharacterId = keyof typeof characters;
export const enemyArt: Record<EnemyKind, string> = { sprout, stump };
export const dungeonArt: Record<DungeonId, string> = { forest: forestScene };
