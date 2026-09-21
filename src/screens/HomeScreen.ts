import { heroArt } from '../data/art';
import { element, mountScreenRoot, onClick } from '../ui/dom';
import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import template from './home.html?raw';
import '../hub.css';
import villageImage from '../../assets/Village.png';

export function mountHome(host: HTMLElement, session: GameSession, onStart: () => void): Screen {
  const root = mountScreenRoot(host, template);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => element<T>(id, root);
  const portrait = $<HTMLImageElement>('home-portrait');
  portrait.src = heroArt.portrait;
  portrait.alt = `${heroArt.name}立繪`;
  $('hero-name').textContent = heroArt.name;
  $<HTMLImageElement>('village-art').src = villageImage;
  onClick($('open-dungeons'), onStart);
  const settings = $<HTMLDialogElement>('village-settings');
  onClick($('open-settings'), () => settings.showModal());
  onClick($('close-settings'), () => settings.close());
  return {
    root,
    enter() {
      $('village-status').textContent = session.canResume
        ? `森林遺跡 · 第 ${session.journey.stage + 1} / ${session.journey.total} 間`
        : '準備好了，就向森林出發吧。';
      $('dungeon-entry-note').textContent = session.canResume ? '旅途中 · 可繼續' : '探索森林遺跡';
    },
    leave() { settings.close(); }
  };
}
