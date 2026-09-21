import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import { forestRuins } from '../data/dungeons';
import { heroArt } from '../data/art';
import { element, mountScreenRoot, onClick } from '../ui/dom';
import template from './dungeon.html?raw';
import '../hub.css';

export function mountDungeon(host: HTMLElement, session: GameSession, onBack: () => void, onStart: () => void): Screen {
  const root = mountScreenRoot(host, template);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => element<T>(id, root);
  $<HTMLImageElement>('dungeon-art').src = forestRuins.image;
  $('dungeon-title').textContent = forestRuins.name;
  $('dungeon-subtitle').textContent = forestRuins.subtitle;
  $('dungeon-description').textContent = forestRuins.description;
  $<HTMLImageElement>('party-icon').src = heroArt.image;
  $('party-name').textContent = heroArt.name;
  onClick($('dungeon-back'), onBack);
  onClick($('start-game'), onStart);
  return {
    root,
    enter() {
      const { journey, canResume } = session;
      $('start-label').textContent = canResume ? '繼續旅途' : '出發';
      $('dungeon-state').textContent = canResume
        ? `第 ${journey.stage + 1} / ${journey.total} 間 · ${journey.room.won ? '已清場，前往出口' : journey.definition.name}`
        : `${journey.total} 個房間 · 最深處的守衛`;
      $('journey-note').textContent = canResume
        ? `生命 ${journey.room.health} / 5 · 返回村莊不會重置本次旅程。`
        : '清場後走向出口，進入下一間房並恢復 1 點生命。';
    }
  };
}
