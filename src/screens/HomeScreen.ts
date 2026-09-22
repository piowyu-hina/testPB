import { characters, type CharacterId } from '../data/art';
import { element, mountScreenRoot, onClick } from '../ui/dom';
import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import template from './home.html?raw';
import '../hub.css';
import villageImage from '../../assets/scenes/village/Village.png';
import { setSoundEnabled, soundEnabled } from '../ui/sound';

export function mountHome(host: HTMLElement, session: GameSession, onStart: () => void): Screen {
  const root = mountScreenRoot(host, template);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => element<T>(id, root);
  const portrait = $<HTMLImageElement>('home-portrait');
  const picker = $<HTMLDialogElement>('character-picker');
  const soundToggle = $<HTMLButtonElement>('sound-toggle');
  function renderSound() {
    const enabled = soundEnabled();
    soundToggle.textContent = enabled ? '開' : '關';
    soundToggle.setAttribute('aria-pressed', String(enabled));
    soundToggle.setAttribute('aria-label', enabled ? '關閉音效' : '開啟音效');
  }
  onClick(soundToggle, () => { setSoundEnabled(!soundEnabled()); renderSound(); });
  renderSound();
  function renderCharacter() {
    const selected = characters[session.characterId];
    portrait.src = selected.portrait;
    portrait.alt = `${selected.name}立繪`;
    $('hero-name').textContent = selected.name;
    root.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.character === session.characterId));
    });
  }
  for (const id of Object.keys(characters) as CharacterId[]) {
    const character = characters[id];
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;
    button.className = 'character-choice';
    button.dataset.character = id;
    const image = document.createElement('img');
    image.src = character.image;
    image.alt = '';
    image.draggable = false;
    const label = document.createElement('strong');
    label.textContent = character.name;
    button.append(image, label);
    onClick(button, () => {
      session.characterId = id;
      renderCharacter();
      picker.close();
    });
    $('character-options').append(button);
  }
  onClick($('open-characters'), () => { renderCharacter(); picker.showModal(); });
  onClick($('close-characters'), () => picker.close());
  portrait.src = characters[session.characterId].portrait;
  portrait.alt = `${characters[session.characterId].name}立繪`;
  $('hero-name').textContent = characters[session.characterId].name;
  $<HTMLImageElement>('village-art').src = villageImage;
  onClick($('open-dungeons'), onStart);
  const settings = $<HTMLDialogElement>('village-settings');
  onClick($('open-settings'), () => settings.showModal());
  onClick($('close-settings'), () => settings.close());
  return {
    root,
    enter() {
      renderCharacter();
      renderSound();
      $('village-status').textContent = session.canResume
        ? `森林遺跡 · 第 ${session.journey.stage + 1} / ${session.journey.total} 間`
        : '準備好了，就向森林出發吧。';
      $('dungeon-entry-note').textContent = session.canResume ? '旅途中 · 可繼續' : '探索森林遺跡';
    },
    leave() { settings.close(); picker.close(); }
  };
}
