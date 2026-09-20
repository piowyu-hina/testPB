import { heroArt } from '../data/art';
import { element as $, onClick } from '../ui/dom';

export function mountHome(onStart: () => void) {
  const portrait = $<HTMLImageElement>('home-portrait');
  portrait.src = heroArt.portrait;
  portrait.alt = `${heroArt.name}立繪`;
  $('hero-name').textContent = heroArt.name;
  onClick($('start-game'), onStart);
  return {
    show(resume: boolean) {
      $('home').hidden = false;
      $('start-label').textContent = resume ? '繼續旅途' : '出發';
    },
    hide() { $('home').hidden = true; }
  };
}
