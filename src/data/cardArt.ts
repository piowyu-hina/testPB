import throwImage from '../../assets/cards/rogue/Throw.png';
import shadowImage from '../../assets/cards/rogue/Shadow.png';
import whirlImage from '../../assets/cards/rogue/Whirl.png';
import knifeImage from '../../assets/cards/rogue/Knife.png';
import type { CardId } from './cards';

export const cardArt: Partial<Record<CardId, string>> = {
  throw: throwImage,
  shadow: shadowImage,
  whirl: whirlImage,
  knife: knifeImage
};
