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

export async function heartBurst(board: HTMLElement, point: Point): Promise<void> {
  const burst = document.createElement('span');
  burst.className = 'battle-heart-burst';
  burst.setAttribute('aria-hidden', 'true');
  burst.textContent = '♥';
  place(burst, point);
  board.append(burst);
  const drift = (Math.random() < .5 ? -1 : 1) * (16 + Math.random() * 14);
  const tilt = Math.round(drift * .65);
  try {
    await animate(burst, [
      { opacity: 0, transform: 'translate(-50%, -25%) rotate(0deg) scale(.5)' },
      { opacity: 1, transform: `translate(calc(-50% + ${drift * .2}px), -65%) rotate(${tilt * .3}deg) scale(1.15)`, offset: .18 },
      { opacity: 1, transform: `translate(calc(-50% + ${drift * .75}px), -105%) rotate(${tilt * .75}deg) scale(1)`, offset: .72 },
      { opacity: 0, transform: `translate(calc(-50% + ${drift}px), -145%) rotate(${tilt}deg) scale(.85)` }
    ], 750, 'ease-out');
  } finally { burst.remove(); }
}

export async function shield(target: HTMLElement): Promise<void> {
  const marker = target.querySelector<SVGElement>('.guard-shield');
  if (!marker) return;
  await animate(marker, [
    { transform: 'translate(-50%, -50%) scale(1)', filter: 'brightness(1)' },
    { transform: 'translate(-50%, -50%) scale(1.8)', filter: 'brightness(1.7)', offset: .22 },
    { transform: 'translate(-50%, -50%) scale(1.8)', filter: 'brightness(1.7)', offset: .7 },
    { transform: 'translate(-50%, -50%) scale(1)', filter: 'brightness(1)' }
  ], 420, 'ease-out');
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
