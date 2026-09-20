import { heroArt, characters, selectedCharacter, selectCharacter } from '../data/art';
import type { CharacterId } from '../data/art';
import { element as $, onClick } from '../ui/dom';

export function mountHome(onStart: () => void) {
  const picker = $('character-picker');
  function renderCharacter() {
    const portrait = $<HTMLImageElement>('home-portrait');
    portrait.src = heroArt.portrait;
    portrait.alt = `${heroArt.name}立繪`;
    $('hero-name').textContent = heroArt.name;
    picker
      .querySelectorAll<HTMLButtonElement>('button')
      .forEach((button) =>
        button.setAttribute(
          'aria-pressed',
          String(button.dataset.character === selectedCharacter())
        )
      );
  }
  for (const id of Object.keys(characters) as CharacterId[]) {
    const character = characters[id];
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;
    button.className = 'character-choice';
    button.dataset.character = id;
    button.setAttribute('aria-label', character.name);
    button.title = character.name;
    const image = document.createElement('img');
    image.src = character.image;
    image.alt = character.name;
    image.draggable = false;
    button.append(image);
    onClick(button, () => {
      selectCharacter(id);
      renderCharacter();
    });
    picker.append(button);
  }
  renderCharacter();
  onClick($('start-game'), onStart);
  return {
    show(resume: boolean) {
      renderCharacter();
      $('home').hidden = false;
      $('start-label').textContent = resume ? '繼續旅途' : '出發';
    },
    hide() {
      $('home').hidden = true;
    }
  };
}
