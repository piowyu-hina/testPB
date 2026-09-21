import type { CardDefinition } from '../types/game.ts';

export function diagram(card: CardDefinition, id?: string): string {
  const blade = '<path d="M60 77V41L67 22L74 41V77Z" fill="#faf6df" stroke="#35584f" stroke-width="3" stroke-linejoin="round"/><path d="M67 33V73" stroke="#95ada0" stroke-width="3"/><path d="M53 79H81" stroke="#aa8650" stroke-width="6" stroke-linecap="round"/><path d="M67 84V102" stroke="#35584f" stroke-width="9" stroke-linecap="round"/><path d="M64 89H70M64 96H70" stroke="#b9bc98" stroke-width="2"/>';
  const art: Record<string, string> = {
    throw: '<path d="M26 72V41M37 87V57M92 79V50" stroke="#9aae96" stroke-width="3" stroke-linecap="round"/>' + blade,
    knife: '<g transform="rotate(32 64 68)">' + blade + '</g>',
    shadow: '<path d="M24 85Q44 103 70 77T105 43" fill="none" stroke="#b6baa3" stroke-width="3" stroke-dasharray="4 6"/><path d="M25 69 37 49 47 53 49 76 39 88 22 86Z" fill="#9ba98e"/><path d="M71 40 88 29 98 35 91 57 78 63 64 53Z" fill="#35584f"/><path d="m77 43 12-5M30 70l11 3" stroke="#faf6df" stroke-width="3" stroke-linecap="round"/>',
    whirl: '<path d="M101 54C93 19 41 15 24 53C12 86 45 111 75 101C47 101 29 83 35 59C44 32 79 30 101 54Z" fill="#4f7968"/><path d="M102 66C108 92 89 114 61 117C99 119 119 91 102 66Z" fill="#b09a65"/><g transform="translate(22 19) scale(.68) rotate(40 64 68)">' + blade + '</g>'
  };
  if (id && art[id]) return `<svg viewBox="0 0 128 136" aria-hidden="true"><circle cx="64" cy="68" r="48" fill="#e5e5cf"/>${art[id]}</svg>`;

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
