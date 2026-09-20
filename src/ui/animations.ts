import type { Point } from '../types/game.ts';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const position = (p: Point) => ({
  left: `${p[0] * 20 + 10}%`,
  top: `${(4 - p[1]) * 20 + 10}%`
});
export function place(node: HTMLElement, point: Point): void {
  Object.assign(node.style, position(point));
}
export async function animate(
  node: HTMLElement,
  keyframes: Keyframe[],
  duration: number
): Promise<void> {
  if (reducedMotion.matches) return;
  const animation = node.animate(keyframes, { duration, easing: 'ease-in-out' });
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
        left: `${(from[0] + to[0]) * 10 + 10}%`,
        top: `${(8 - from[1] - to[1]) * 10 + 10}%`,
        transform: `translate(-50%, calc(-50% - ${jump}px))`,
        offset: 0.5
      },
      { ...position(to), transform: 'translate(-50%, -50%)' }
    ],
    jump > 20 ? 270 : 210
  );
}
