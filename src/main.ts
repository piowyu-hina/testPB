import './style.css';
import './theme.css';
import { mountTheme } from './ui/theme';
import { mountBattle } from './screens/BattleScreen';
import { mountHome } from './screens/HomeScreen';
import { mountDungeon } from './screens/DungeonScreen';
import { element } from './ui/dom';
import { GameSession } from './app/GameSession';
import { ScreenManager } from './app/ScreenManager';

document.addEventListener('contextmenu', (event) => event.preventDefault());
const session = new GameSession();
const host = element('app');
const stage = element('stage');
const portraitTouch = matchMedia('(orientation: portrait) and (hover: none) and (pointer: coarse)');
function fitPortraitStage() {
  host.style.transform = portraitTouch.matches ? `scale(${stage.clientWidth / 720})` : '';
}
new ResizeObserver(fitPortraitStage).observe(stage);
portraitTouch.addEventListener('change', fitPortraitStage);
window.addEventListener('resize', fitPortraitStage);
fitPortraitStage();
const screens = {
  home: mountHome(host, session, () => navigation.go('dungeon')),
  dungeon: mountDungeon(host, session, () => navigation.go('home'), () => navigation.go('battle')),
  battle: mountBattle(host, session, () => navigation.go('home'))
};
const navigation = new ScreenManager(screens);
mountTheme();
navigation.go('home');
