import type { CardDefinition } from '../types/game.ts';

// All cards share a five-by-five scale; long rays continue beyond its edge.
export function diagram(card: CardDefinition): string {
  const ranged = card.effect === 'throw' || card.effect === 'shadow';
  const attackOnly = card.effect === 'throw';
  const moveOnly = card.effect === 'shadow';
  let marks = '';
  if (ranged) {
    const directions = card.offsets.filter(([x, y]) => Math.max(Math.abs(x), Math.abs(y)) === 1);
    for (const [x, y] of directions)
      marks += `<path d="M${64 + x * 12} ${68 - y * 12}L${64 + x * 59} ${68 - y * 59}" fill="none" stroke="#8caa98" stroke-width="2" stroke-dasharray="3 4"/>`;
  }
  for (let y = 2; y >= -2; y--)
    for (let x = -2; x <= 2; x++) {
      const px = 64 + x * 23, py = 68 - y * 23;
      if (!x && !y) marks += `<circle class="origin" cx="${px}" cy="${py}" r="6.5"/>`;
      else if (card.offsets.some(([dx, dy]) => dx === x && dy === y)) {
        marks += `<rect x="${px - 7.5}" y="${py - 7.5}" width="15" height="15" rx="3" fill="${attackOnly || moveOnly ? '#f5f0dd' : '#428b7d'}" stroke="#428b7d" stroke-width="2"/>`;
        if (!moveOnly) marks += `<path d="m${px - 3} ${py + 3} 6-6" stroke="${attackOnly ? '#35584f' : '#faf6df'}" stroke-width="2" stroke-linecap="round"/>`;
      } else marks += `<circle class="dot" cx="${px}" cy="${py}" r="1.8"/>`;
    }
  return `<svg viewBox="0 0 128 136" aria-hidden="true">${marks}</svg>`;
}
