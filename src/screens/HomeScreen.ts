import { heroArt } from '../data/art';
import { element as $, onClick } from '../ui/dom';

export function mountHome(onStart: () => void) {
  $<HTMLImageElement>('home-portrait').src = heroArt.portrait;
  $<HTMLImageElement>('hero-token').src = heroArt.image;
  onClick($('start-game'), onStart);
  return {
    show(resume: boolean) {
      $('home').hidden = false;
      $('start-label').textContent = resume ? '繼續旅途' : '出發';
    },
    hide() {
      $('home').hidden = true;
    }
  };
}
