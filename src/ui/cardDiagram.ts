import type { CardDefinition } from '../types/game.ts';

export function diagram(card: CardDefinition): string {
  const extent = Math.max(2, ...card.offsets.flat().map(Math.abs));
  const pitch = 92 / (extent * 2),
    center = 64;
  let marks = '';
  for (let y = extent; y >= -extent; y--)
    for (let x = -extent; x <= extent; x++) {
      const px = center + x * pitch,
        py = center - y * pitch + 4;
      if (!x && !y) marks += `<circle class="origin" cx="${px}" cy="${py}" r="6.5"/>`;
      else if (card.offsets.some((p) => p[0] === x && p[1] === y))
        marks += `<rect class="destination" x="${px - 7.5}" y="${py - 7.5}" width="15" height="15" rx="3.5"/>`;
      else marks += `<circle class="dot" cx="${px}" cy="${py}" r="1.8"/>`;
    }
  return `<svg viewBox="0 0 128 136" aria-hidden="true">${marks}</svg>`;
}
