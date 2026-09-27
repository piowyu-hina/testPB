import type { BattleReward } from '../battle/BattleRewards';
import './rewardFace.css';

/** The same full-face treatment in rewards, collection, hand and overflow. */
export function rewardFace(face: HTMLElement, reward?: BattleReward) {
  if (reward) {
    face.dataset.rewardFace = reward;
    if (!face.querySelector(':scope > .reward-face-trim')) {
      const trim = document.createElement('span'); trim.className = 'reward-face-trim';
      trim.setAttribute('aria-hidden', 'true'); face.append(trim);
    }
  } else {
    delete face.dataset.rewardFace;
    face.querySelector(':scope > .reward-face-trim')?.remove();
  }
}
