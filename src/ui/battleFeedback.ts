import { animate, place } from './animations';
import type { Point } from '../types/game';
import './battleFeedback.css';

// Temporary effects belong to the board, never to the monster's nameplate.
export async function impact(board: HTMLElement, point: Point, kind: 'hit' | 'block' | 'hurt'): Promise<void> {
  const effect = document.createElement('div');
  effect.className = `battle-impact impact-${kind}`;
  effect.setAttribute('aria-hidden', 'true');
  effect.innerHTML = kind === 'block'
    ? '<svg viewBox="0 0 64 64"><path d="M32 5 53 14v17c0 14-21 26-21 26S11 45 11 31V14Z"/><path class="shield-mark" d="m22 31 7 7 14-17"/></svg>'
    : '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="23"/><path d="m17 47 30-30M24 9l3 10m28 20-10-3M9 27l10 3m19 25-3-10"/></svg>';
  place(effect, point);
  board.append(effect);
  try {
    await animate(effect, [
      { opacity: 0, scale: 0.65 },
      { opacity: 1, scale: 1, offset: 0.2 },
      { opacity: 1, scale: 1.08, offset: 0.65 },
      { opacity: 0, scale: 1.2 }
    ], kind === 'block' ? 360 : 240);
  } finally { effect.remove(); }
}

export function hitFlash(actor: HTMLElement): Promise<void> {
  return animate(actor.querySelector('img')!, [
    { filter: 'brightness(1)' }, { filter: 'brightness(2.6)', offset: 0.3 },
    { filter: 'brightness(1)' }
  ], 180);
}
