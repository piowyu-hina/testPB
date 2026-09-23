import { characters } from '../data/art';
import { element, mountScreenRoot, onClick } from '../ui/dom';
import type { Screen } from '../app/ScreenManager';
import type { GameSession } from '../app/GameSession';
import template from './home.html?raw';
import '../hub.css';
import villageImage from '../../assets/scenes/village/Village.png';
import { setSoundEnabled, soundEnabled } from '../ui/sound';

// Milliseconds each idle-sway frame is shown. Frames play forward then
// backward (ping-pong) so any sequence loops seamlessly with no jump cut.
const IDLE_FRAME_MS = 220;

export function mountHome(host: HTMLElement, session: GameSession, onStart: () => void): Screen {
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
  let idleTimer = 0;
  function stopIdleAnimation() {
    if (!idleTimer) return;
    clearInterval(idleTimer);
    idleTimer = 0;
  }
  function startIdleAnimation(frames: string[]) {
    stopIdleAnimation();
    let index = 0;
    let direction = 1;
    portrait.src = frames[0];
    idleTimer = window.setInterval(() => {
      index += direction;
      if (index >= frames.length - 1) { index = frames.length - 1; direction = -1; }
      else if (index <= 0) { index = 0; direction = 1; }
      portrait.src = frames[index];
    }, IDLE_FRAME_MS);
  }
  function renderCharacter() {
    const selected = characters[session.characterId];
    portrait.alt = `${selected.name}立繪`;
    if (selected.idleFrames?.length) startIdleAnimation(selected.idleFrames);
    else { stopIdleAnimation(); portrait.src = selected.portrait; }
  }
  renderCharacter();
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
    leave() { settings.close(); stopIdleAnimation(); }
  };
}
