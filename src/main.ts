import './style.css';
import './theme.css';
import { mountTheme } from './ui/theme';
import { mountBattle } from './screens/BattleScreen';
import { mountHome } from './screens/HomeScreen';
import { mountDungeon } from './screens/DungeonScreen';
import { element } from './ui/dom';
import { GameSession } from './app/GameSession';
import { ScreenManager } from './app/ScreenManager';
import { animate } from './ui/animations';

document.addEventListener('contextmenu', (event) => event.preventDefault());
const session = new GameSession();
const host = element('app');
const stage = element('stage');
const curtain = document.createElement('div');
curtain.className = 'screen-curtain';
curtain.hidden = true;
stage.append(curtain);
async function transitionScreen(swap: () => void): Promise<void> {
  curtain.hidden = false;
  try {
    await animate(curtain, [{ opacity: 0 }, { opacity: 1 }], 160, 'ease-in');
    curtain.style.opacity = '1';
    swap();
    await animate(curtain, [{ opacity: 1 }, { opacity: 0 }], 190, 'ease-out');
  } finally {
    curtain.hidden = true;
    curtain.style.opacity = '0';
  }
}
function fitStage() {
  const scale = stage.getBoundingClientRect().width / 720;
  if (CSS.supports('zoom', '1')) {
    host.style.zoom = String(scale);
    host.style.transform = '';
  } else {
    host.style.transform = `scale(${scale})`;
  }
}
new ResizeObserver(fitStage).observe(stage);
window.addEventListener('resize', fitStage);
fitStage();
const screens = {
  home: mountHome(host, session, () => navigation.go('dungeon')),
  dungeon: mountDungeon(host, session, () => navigation.go('home'), () => navigation.go('battle')),
  battle: mountBattle(host, session, () => navigation.go('home'))
};
const navigation = new ScreenManager(screens, transitionScreen);
mountTheme();
navigation.go('home');
