import { characters } from '../data/art';
import { element, mountScreenRoot, onClick } from '../ui/dom';
import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import template from './home.html?raw';
import '../hub.css';
import villageImage from '../../assets/scenes/village/Village.png';
import { setSoundEnabled, soundEnabled } from '../ui/sound';

export function mountHome(host: HTMLElement, session: GameSession, onStart: () => void, onShop: () => void): Screen {
  const root = mountScreenRoot(host, template);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => element<T>(id, root);
  const portrait = $<HTMLImageElement>('home-portrait');
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
    portrait.alt = `${selected.name}立繪`;
    portrait.src = selected.portrait;
  }
  renderCharacter();
  $<HTMLImageElement>('village-art').src = villageImage;
  onClick($('open-dungeons'), onStart);
  onClick($('open-shop'), onShop);
  const picker = $<HTMLDialogElement>('character-picker');
  const choices = $('character-picker-options');
  const choiceButtons = (['qinghe', 'rogue'] as const).map((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-choice';
    button.dataset.character = id;
    button.setAttribute('aria-label', `選擇${characters[id].name}`);
    const image = document.createElement('img');
    image.src = characters[id].portrait;
    image.alt = '';
    image.draggable = false;
    const name = document.createElement('strong');
    name.textContent = characters[id].name;
    button.append(image, name);
    onClick(button, () => {
      session.characterId = id;
      renderCharacter();
      renderChoices();
    });
    choices.append(button);
    return button;
  });
  function renderChoices() {
    for (const button of choiceButtons) {
      const selected = button.dataset.character === session.characterId;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }
  onClick($('open-characters'), () => { renderChoices(); picker.showModal(); });
  onClick($('close-characters'), () => picker.close());
  const settings = $<HTMLDialogElement>('village-settings');
  onClick($('open-settings'), () => settings.showModal());
  onClick($('close-settings'), () => settings.close());
  return {
    root,
    enter() {
      renderCharacter();
      renderChoices();
      renderSound();
      $('village-status').textContent = session.canResume
        ? `森林遺跡 · 第 ${session.journey.stage + 1} / ${session.journey.total} 間`
        : '準備好了，就向森林出發吧。';
      $('dungeon-entry-note').textContent = session.canResume ? '旅途中 · 可繼續' : '探索森林遺跡';
    },
    leave() { settings.close(); picker.close(); }
  };
}
