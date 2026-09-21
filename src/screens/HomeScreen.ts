import { heroArt } from '../data/art';
import { element, mountScreenRoot, onClick } from '../ui/dom';
import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import template from './home.html?raw';
import '../home.css';

export function mountHome(host: HTMLElement, session: GameSession, onStart: () => void): Screen {
  const root = mountScreenRoot(host, template);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => element<T>(id, root);
  const portrait = $<HTMLImageElement>('home-portrait');
  portrait.src = heroArt.portrait;
  portrait.alt = `${heroArt.name}立繪`;
  $('hero-name').textContent = heroArt.name;
  onClick($('start-game'), onStart);
  return {
    root,
    enter() {
      $('start-label').textContent = session.canResume ? '繼續旅途' : '出發';
    }
  };
}
