import throwImage from '../../assets/cards/luxue/Throw.png';
import shadowImage from '../../assets/cards/luxue/Shadow.png';
import knifeImage from '../../assets/cards/luxue/Knife.png';
import forwardImage from '../../assets/cards/luxue/Forward.png';
import lungeImage from '../../assets/cards/luxue/Lunge.png';
import absoluteShadowImage from '../../assets/cards/luxue/AbsoluteShadow.png';
import sweepImage from '../../assets/cards/qinghe/Sweep-v3.png';
import thrustImage from '../../assets/cards/qinghe/Thrust-v2.png';
import advanceImage from '../../assets/cards/qinghe/Advance-v2.png';
import dawnSpearImage from '../../assets/cards/qinghe/DawnSpear-v2.png';
import qingheForwardImage from '../../assets/cards/qinghe/Forward-v2.png';
import sidestepImage from '../../assets/cards/qinghe/Sidestep.png';
import repelImage from '../../assets/cards/qinghe/Repel.png';
import recallImage from '../../assets/cards/luxue/Recall.png';
import type { CardId } from './cards';

export const cardArt: Partial<Record<CardId, string>> = {
  sidestep: sidestepImage,
  repel: repelImage,
  recall: recallImage,
  throw: throwImage,
  shadow: shadowImage,
  knife: knifeImage,
  forward: forwardImage,
  lunge: lungeImage,
  absoluteShadow: absoluteShadowImage,
  sweep: sweepImage,
  thrust: thrustImage,
  advance: advanceImage,
  dawnSpear: dawnSpearImage
};

export const qingheForwardArt = qingheForwardImage;
