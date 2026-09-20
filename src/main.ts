import './style.css';
import './home.css';
import './theme.css';
import { mountTheme } from './ui/theme';
import { mountBattle } from './screens/BattleScreen';
import { mountHome } from './screens/HomeScreen';
import { element } from './ui/dom';

document.addEventListener('contextmenu', (event) => event.preventDefault());
mountTheme();
let started = false;
const battle = mountBattle(() => {
  element('game').hidden = true;
  home.show(started && battle.canResume());
});
const home = mountHome(() => {
  home.hide();
  element('game').hidden = false;
  battle.enter();
  started = true;
});
home.show(false);
