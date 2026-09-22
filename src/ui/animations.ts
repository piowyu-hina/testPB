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
export async function travel(
  node: HTMLElement,
  from: Point,
  to: Point,
  jump: number
): Promise<void> {
  place(node, to);
  await animate(
    node,
    [
      { ...position(from), transform: 'translate(-50%, -50%)' },
      {
        ...position([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]),
        transform: `translate(-50%, calc(-50% - ${jump}px))`,
        offset: 0.5
      },
      { ...position(to), transform: 'translate(-50%, -50%)' }
    ],
    jump > 20 ? 180 : 130,
    'cubic-bezier(0.1, 0.65, 0.45, 1)'
  );
}
export async function teleport(node: HTMLElement, to: Point): Promise<void> {
  await animate(node, [{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.82 }], 75);
  place(node, to);
  await animate(node, [{ opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1 }], 90);
}
