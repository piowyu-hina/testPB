import throwImage from '../../assets/cards/luxue/Throw.png';
import shadowImage from '../../assets/cards/luxue/Shadow.png';
import knifeImage from '../../assets/cards/luxue/Knife.png';
import forwardImage from '../../assets/cards/luxue/Forward.png';
import lungeImage from '../../assets/cards/luxue/Lunge.png';
import type { CardId } from './cards';

export const cardArt: Partial<Record<CardId, string>> = {
  throw: throwImage,
  shadow: shadowImage,
  knife: knifeImage,
  forward: forwardImage,
  lunge: lungeImage
};
