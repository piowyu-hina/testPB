import throwImage from '../../assets/cards/luxue/Throw.png';
import shadowImage from '../../assets/cards/luxue/Shadow.png';
import knifeImage from '../../assets/cards/luxue/Knife.png';
import forwardImage from '../../assets/cards/luxue/Forward.png';
import lungeImage from '../../assets/cards/luxue/Lunge.png';
import absoluteShadowImage from '../../assets/cards/luxue/AbsoluteShadow.png';
import stepImage from '../../assets/cards/qinghe/Step.png';
import thrustImage from '../../assets/cards/qinghe/Thrust.png';
import advanceImage from '../../assets/cards/qinghe/Advance.png';
import dawnSpearImage from '../../assets/cards/qinghe/DawnSpear.png';
import type { CardId } from './cards';

export const cardArt: Partial<Record<CardId, string>> = {
  throw: throwImage,
  shadow: shadowImage,
  knife: knifeImage,
  forward: forwardImage,
  lunge: lungeImage,
  absoluteShadow: absoluteShadowImage,
  step: stepImage,
  thrust: thrustImage,
  advance: advanceImage,
  dawnSpear: dawnSpearImage
};
