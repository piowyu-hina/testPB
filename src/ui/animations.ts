import type { Point } from '../types/game.ts';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const position = (p: Point) => ({
  left: `calc(${p[0] * 20 + 10}% + ${(p[0] - 2) / 5} * var(--tile-gap))`,
  top: `calc(${(4 - p[1]) * 20 + 10}% + ${(2 - p[1]) / 5} * var(--tile-gap))`
});
export function place(node: HTMLElement, point: Point): void {
  Object.assign(node.style, position(point));
}
export async function animate(
  node: Element,
  keyframes: Keyframe[],
  duration: number,
  easing = 'ease-in-out'
): Promise<void> {
  if (reducedMotion.matches) return;
  const animation = node.animate(keyframes, { duration, easing });
  try {
    await animation.finished;
  } catch {
    /* Final state is applied by the caller. */
  }
}
export const pause = (ms: number): Promise<void> =>
  reducedMotion.matches ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
// Instant tile changes while comparing movement feel; impact feedback stays separate.
export async function travel(
  node: HTMLElement,
  _from: Point,
  to: Point,
  _jump: number
): Promise<void> {
  place(node, to);
}
