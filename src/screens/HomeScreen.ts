import { heroArt } from '../data/art';
import { element as $, onClick } from '../ui/dom';

export function mountHome(onStart: () => void) {
  $<HTMLImageElement>('home-portrait').src = heroArt.portrait;
  $<HTMLImageElement>('large-portrait').src = heroArt.portrait;
  $<HTMLImageElement>('hero-token').src = heroArt.image;
  const viewer = $('portrait-viewer');
  onClick($('view-portrait'), () => {
    viewer.hidden = false;
    $('home').inert = true;
  });
  const close = () => {
    viewer.hidden = true;
    $('home').inert = false;
  };
  onClick($('close-portrait'), close);
  onClick(viewer, (event) => {
    if (event.target === viewer) close();
  });
  onClick($('start-game'), onStart);
  return {
    show(resume: boolean) {
      $('home').hidden = false;
      $('start-label').textContent = resume ? '繼續旅途' : '出發';
    },
    hide() {
      close();
      $('home').hidden = true;
    }
  };
}
