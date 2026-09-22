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
function fitStage() {
  host.style.transform = `scale(${stage.getBoundingClientRect().width / 720})`;
}
new ResizeObserver(fitStage).observe(stage);
window.addEventListener('resize', fitStage);
fitStage();
const screens = {
  home: mountHome(host, session, () => navigation.go('dungeon')),
  dungeon: mountDungeon(host, session, () => navigation.go('home'), () => navigation.go('battle')),
  battle: mountBattle(host, session, () => navigation.go('home'))
};
const navigation = new ScreenManager(screens);
mountTheme();
navigation.go('home');
