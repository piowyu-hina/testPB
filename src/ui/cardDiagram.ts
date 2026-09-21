import type { CardDefinition } from '../types/game.ts';

export function diagram(card: CardDefinition): string {
  const ranged = card.effect === 'throw' || card.effect === 'shadow';
  let marks = '';
  if (ranged) {
    // Unbroken bands represent unlimited travel, not a count of landing squares.
    for (const [x, y] of card.offsets.filter(([x, y]) => Math.max(Math.abs(x), Math.abs(y)) === 1)) {
      const reach = y ? 30 : 40;
      marks += `<path d="M${50 + x * 12} ${40 - y * 12}L${50 + x * reach} ${40 - y * reach}" stroke="#428b7d" stroke-width="12" stroke-linecap="butt"/>`;
    }
  } else {
    const extent = Math.max(1, ...card.offsets.flat().map(Math.abs));
    const pitch = 60 / (extent * 2 + 0.7);
    const size = pitch * 0.76;
    for (let y = extent; y >= -extent; y--)
      for (let x = -extent; x <= extent; x++) {
        if (!x && !y) continue;
        const px = 50 + x * pitch, py = 40 - y * pitch;
        if (card.offsets.some(([dx, dy]) => dx === x && dy === y))
          marks += `<rect class="destination" x="${px - size / 2}" y="${py - size / 2}" width="${size}" height="${size}" rx="2"/>`;
        else marks += `<circle class="dot" cx="${px}" cy="${py}" r="1.5"/>`;
      }
  }
  marks += '<circle class="origin" cx="50" cy="40" r="6"/>';
  return `<svg viewBox="0 0 100 80" aria-hidden="true">${marks}</svg>`;
}
