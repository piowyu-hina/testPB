import './style.css';
import './theme.css';
import { mountTheme } from './ui/theme';
import { mountBattle } from './screens/BattleScreen';
import { mountHome } from './screens/HomeScreen';
import { element } from './ui/dom';
import { GameSession } from './app/GameSession';
import { ScreenManager } from './app/ScreenManager';

document.addEventListener('contextmenu', (event) => event.preventDefault());
const session = new GameSession();
const host = element('app');
const screens = {
  home: mountHome(host, session, () => navigation.go('battle')),
  battle: mountBattle(host, session, () => navigation.go('home'))
};
const navigation = new ScreenManager(screens);
mountTheme();
navigation.go('home');
