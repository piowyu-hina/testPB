import './style.css';
import './theme.css';
import { mountTheme } from './ui/theme';
import { mountBattle } from './screens/BattleScreen';
import { mountHome } from './screens/HomeScreen';
import { mountDungeon } from './screens/DungeonScreen';
import { element } from './ui/dom';
import { GameSession } from './app/GameSession';
import { ScreenManager } from './app/ScreenManager';
import { animate, pause } from './ui/animations';
import { initSound } from './ui/sound';

document.addEventListener('contextmenu', (event) => event.preventDefault());
initSound();
const session = new GameSession();
const host = element('app');
const stage = element('stage');
const curtain = document.createElement('div');
curtain.className = 'screen-curtain';
curtain.hidden = true;
const leftPanel = document.createElement('div');
const rightPanel = document.createElement('div');
leftPanel.className = 'screen-curtain-panel left';
rightPanel.className = 'screen-curtain-panel right';
curtain.append(leftPanel, rightPanel);
stage.append(curtain);
async function transitionScreen(swap: () => void): Promise<void> {
  leftPanel.style.transform = 'translateX(-100%)';
  rightPanel.style.transform = 'translateX(100%)';
  curtain.hidden = false;
  try {
    await Promise.all([
      animate(leftPanel, [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }], 210, 'cubic-bezier(.25,.8,.3,1)'),
      animate(rightPanel, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], 210, 'cubic-bezier(.25,.8,.3,1)')
    ]);
    leftPanel.style.transform = 'translateX(0)';
    rightPanel.style.transform = 'translateX(0)';
    swap();
    await pause(55);
    await Promise.all([
      animate(leftPanel, [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }], 240, 'cubic-bezier(.4,0,.3,1)'),
      animate(rightPanel, [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], 240, 'cubic-bezier(.4,0,.3,1)')
    ]);
  } finally {
    curtain.hidden = true;
    leftPanel.style.transform = 'translateX(-100%)';
    rightPanel.style.transform = 'translateX(100%)';
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
