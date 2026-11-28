import airplane from '@/assets/emoji3d/airplane.webp?no-inline';
import arrowBack from '@/assets/emoji3d/arrow-back.webp?no-inline';
import automobile from '@/assets/emoji3d/automobile.webp?no-inline';
import baby from '@/assets/emoji3d/baby.webp?no-inline';
import bank from '@/assets/emoji3d/bank.webp?no-inline';
import beerMug from '@/assets/emoji3d/beer-mug.webp?no-inline';
import books from '@/assets/emoji3d/books.webp?no-inline';
import briefcase from '@/assets/emoji3d/briefcase.webp?no-inline';
import broom from '@/assets/emoji3d/broom.webp?no-inline';
import chartIncreasing from '@/assets/emoji3d/chart-increasing.webp?no-inline';
import clapperBoard from '@/assets/emoji3d/clapper-board.webp?no-inline';
import creditCard from '@/assets/emoji3d/credit-card.webp?no-inline';
import directHit from '@/assets/emoji3d/direct-hit.webp?no-inline';
import euroBanknote from '@/assets/emoji3d/euro-banknote.webp?no-inline';
import graduationCap from '@/assets/emoji3d/graduation-cap.webp?no-inline';
import haircut from '@/assets/emoji3d/haircut.webp?no-inline';
import hamburger from '@/assets/emoji3d/hamburger.webp?no-inline';
import hotBeverage from '@/assets/emoji3d/hot-beverage.webp?no-inline';
import house from '@/assets/emoji3d/house.webp?no-inline';
import label from '@/assets/emoji3d/label.webp?no-inline';
import laptop from '@/assets/emoji3d/laptop.webp?no-inline';
import liftingWeights from '@/assets/emoji3d/lifting-weights.webp?no-inline';
import lightBulb from '@/assets/emoji3d/light-bulb.webp?no-inline';
import mobilePhone from '@/assets/emoji3d/mobile-phone.webp?no-inline';
import moneyBag from '@/assets/emoji3d/money-bag.webp?no-inline';
import musicalNote from '@/assets/emoji3d/musical-note.webp?no-inline';
import pawPrints from '@/assets/emoji3d/paw-prints.webp?no-inline';
import pill from '@/assets/emoji3d/pill.webp?no-inline';
import pizza from '@/assets/emoji3d/pizza.webp?no-inline';
import purse from '@/assets/emoji3d/purse.webp?no-inline';
import redHeart from '@/assets/emoji3d/red-heart.webp?no-inline';
import shoppingCart from '@/assets/emoji3d/shopping-cart.webp?no-inline';
import tShirt from '@/assets/emoji3d/t-shirt.webp?no-inline';
import videoGame from '@/assets/emoji3d/video-game.webp?no-inline';
import wrappedGift from '@/assets/emoji3d/wrapped-gift.webp?no-inline';
import { cn } from '@/constants/utils';

type CategoryIconProps = {
  icon: string | null | undefined;
  className?: string;
};

// Categories are stored as the user's emoji, and each one is drawn as the
// matching 3D object from Microsoft's Fluent emoji set (MIT, see
// assets/emoji3d/LICENSE), so the mark looks the same on every platform
// instead of taking the phone's own emoji font. An emoji outside the set falls
// back to a label.
export const CategoryIcon = ({ icon, className }: CategoryIconProps) => {
  return (
    <img
      src={resolveIconSource(icon)}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={cn('h-4 w-4 shrink-0 select-none', className)}
    />
  );
};

const SOURCES_BY_EMOJI: Record<string, string> = {
  '🍔': hamburger,
  '🛒': shoppingCart,
  '🏠': house,
  '🚗': automobile,
  '🎬': clapperBoard,
  '💊': pill,
  '👕': tShirt,
  '💡': lightBulb,
  '🎮': videoGame,
  '✈️': airplane,
  '📱': mobilePhone,
  '🎓': graduationCap,
  '💇': haircut,
  '🐾': pawPrints,
  '🎁': wrappedGift,
  '☕': hotBeverage,
  '🍕': pizza,
  '🍺': beerMug,
  '🏋️': liftingWeights,
  '💼': briefcase,
  '🎵': musicalNote,
  '📚': books,
  '🧹': broom,
  '👶': baby,
  '💻': laptop,
  '↩️': arrowBack,
  '📈': chartIncreasing,
  '🎯': directHit,
  '💳': creditCard,
  '💰': moneyBag,
  '❤️': redHeart,
  '👛': purse,
  '💶': euroBanknote,
  '🏦': bank,
};

const resolveIconSource = (icon: string | null | undefined): string => {
  if (undefined !== icon && null !== icon && icon in SOURCES_BY_EMOJI) {
    return SOURCES_BY_EMOJI[icon];
  } else {
    return label;
  }
};
