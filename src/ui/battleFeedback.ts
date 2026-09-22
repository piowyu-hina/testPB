import { animate, place, travel, pause } from './animations';
import type { Point } from '../types/game';
import './battleFeedback.css';

export function contactPoint(from: Point, to: Point): Point {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const distance = Math.hypot(dx, dy);
  return [to[0] - dx / distance * 0.85, to[1] - dy / distance * 0.85];
}

export async function impact(board: HTMLElement, point: Point, finisher = false): Promise<void> {
  const effect = document.createElement('div');
  effect.className = `battle-impact${finisher ? ' finisher' : ''}`;
  effect.setAttribute('aria-hidden', 'true');
  effect.innerHTML = '<i></i><i></i><i></i><i></i>';
  place(effect, point);
  board.append(effect);
  try {
    await animate(effect, [
      { opacity: 0, scale: 0.55 },
      { opacity: 1, scale: 1, offset: 0.2 },
      { opacity: 1, scale: 1.12, offset: 0.55 },
      { opacity: 0, scale: 1.25 }
    ], finisher ? 270 : 220, 'ease-out');
  } finally { effect.remove(); }
}

export async function damageNumber(target: HTMLElement): Promise<void> {
  const number = document.createElement('span');
  number.className = 'battle-damage-number';
  number.textContent = '−1';
  number.setAttribute('aria-hidden', 'true');
  target.append(number);
  try {
    await animate(number, [
      { opacity: 0, transform: 'translate(-50%, 2px) scale(.7)' },
      { opacity: 1, transform: 'translate(-50%, -12px) scale(1.15)', offset: .22 },
      { opacity: 1, transform: 'translate(-50%, -20px) scale(1)', offset: .68 },
      { opacity: 0, transform: 'translate(-50%, -30px) scale(.9)' }
    ], 560, 'ease-out');
  } finally { number.remove(); }
}

export async function shield(board: HTMLElement, point: Point): Promise<void> {
  const effect = document.createElement('div');
  effect.className = 'battle-shield';
  effect.setAttribute('aria-hidden', 'true');
  effect.innerHTML = '<svg viewBox="0 0 64 64"><path d="M32 5 53 14v17c0 14-21 26-21 26S11 45 11 31V14Z"/><path class="shield-mark" d="m22 31 7 7 14-17"/></svg>';
  place(effect, point);
  board.append(effect);
  try {
    await animate(effect, [
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, offset: 0.15 },
      { opacity: 1, scale: 1, offset: 0.85 },
      { opacity: 0, scale: 1 }
    ], 520);
  } finally { effect.remove(); }
}

export async function recoil(node: HTMLElement, from: Point, to: Point, hurt = false): Promise<void> {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const shift = (node.parentElement?.clientWidth ?? 300) / 5 * 0.18;
  const displaced = `translate(calc(-50% + ${dx / length * shift}px), calc(-50% - ${dy / length * shift}px))`;
  await animate(node, [
    { transform: 'translate(-50%, -50%)', filter: 'none' },
    { transform: displaced, filter: hurt ? 'sepia(1) saturate(6) hue-rotate(315deg)' : 'brightness(1.25)', offset: 0.18 },
    { transform: displaced, filter: hurt ? 'sepia(1) saturate(6) hue-rotate(315deg)' : 'brightness(1.1)', offset: 0.65 },
    { transform: 'translate(-50%, -50%)', filter: 'none' }
  ], hurt ? 380 : 240);
}

export async function approach(node: HTMLElement, from: Point, to: Point, leap: boolean): Promise<Point> {
  const contact = contactPoint(from, to);
  await travel(node, from, contact, leap ? 30 : 5);
  await pause(70);
  return contact;
}
